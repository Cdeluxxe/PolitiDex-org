#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — full-site legislator validation
//
// Reads the live `politicians` collection straight from the public Firestore
// project that index.html loads at runtime, then validates the three things
// that drive the public site: promise counts, score calculations, and the
// data each profile's "In the Spotlight" card is built from.
//
//   node scripts/validate-legislators.mjs            # human-readable report
//   node scripts/validate-legislators.mjs --json     # machine-readable JSON
//
// Exits non-zero when a HARD integrity check fails (out-of-range score,
// kept/broken/pending mirror mismatch, or promise-verdict tally mismatch) so
// it can gate a deploy. "Thin profile" and "misclassified" findings are
// reported as warnings — they need human/roster judgement, not a build break.
// No dependencies; uses the Firestore REST API and Node's global fetch.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const JSON_OUT = process.argv.includes('--json');

// ── Firestore value decoder ────────────────────────────────────────────────
function decode(field) {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(decode);
  if ('mapValue' in field) {
    const o = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) o[k] = decode(v);
    return o;
  }
  return undefined;
}

async function fetchAll() {
  const out = [];
  let pageToken = null;
  do {
    const url = BASE + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 200));
    const body = await res.json();
    for (const doc of body.documents || []) {
      const rec = {};
      for (const [k, v] of Object.entries(doc.fields || {})) rec[k] = decode(v);
      rec._id = doc.name.split('/').pop();
      out.push(rec);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out;
}

// ── Classification (mirrors how the site reads the `office` string) ─────────
const office = (o) => String(o.office || '');
const isUtahLeg = (o) =>
  /utah/i.test(office(o)) &&
  /(house|senate|representative|senator)/i.test(office(o)) &&
  !/(u\.s\.|congress|governor|attorney general|treasurer|auditor|county|mayor|city council)/i.test(office(o));
const isFormer = (o) => /former|speaker emeritus/i.test(office(o));
const isCandidate = (o) => /candidate/i.test(office(o));
const promiseCount = (o) => (Array.isArray(o.promises) ? o.promises.length : 0);
const acctScore = (o) =>
  o.accountability && typeof o.accountability.overallScore === 'number' ? o.accountability.overallScore : null;
const normVerdict = (v) => (v === 'kept' ? 'kept' : v === 'broken' ? 'broken' : 'pending');

const MIN_PROMISES = 6;

function run(recs) {
  const utah = recs.filter(isUtahLeg);
  const current = utah.filter((o) => !isFormer(o) && !isCandidate(o));
  const findings = { hardFailures: [], warnings: [], stats: {} };

  // ── CHECK 1 — promise counts ──────────────────────────────────────────────
  const thin = current.filter((o) => promiseCount(o) < MIN_PROMISES).sort((a, b) => promiseCount(a) - promiseCount(b));
  const stubs = current.filter((o) => promiseCount(o) === 0);
  const dist = {};
  current.forEach((o) => {
    dist[promiseCount(o)] = (dist[promiseCount(o)] || 0) + 1;
  });
  thin.forEach((o) =>
    findings.warnings.push({
      check: 'promise-count',
      id: o._id,
      name: o.name,
      detail: `${promiseCount(o)} promises (< ${MIN_PROMISES}) — ${office(o)}`,
    })
  );

  // ── CHECK 2 — score calculations / accountability integrity ───────────────
  // Counts are compared numerically: a few records store kept/broken/pending as
  // strings ("1") rather than integers, which is a type-hygiene warning, not a
  // value mismatch.
  const num = (x) => (x == null || x === '' ? null : Number(x));
  for (const o of recs) {
    const a = o.accountability;
    const ok = num(o.kept), ob = num(o.broken), op = num(o.pending);
    if (a && typeof a.overallScore === 'number') {
      if (a.overallScore < 0 || a.overallScore > 100)
        findings.hardFailures.push({ check: 'score-range', id: o._id, name: o.name, detail: `overallScore=${a.overallScore}` });
      // top-level kept/broken/pending must mirror the accountability map
      const ak = num(a.kept), ab = num(a.broken), ap = num(a.pending);
      if (ak != null && ok != null && (ak !== ok || ab !== ob || ap !== op))
        findings.hardFailures.push({
          check: 'mirror-mismatch',
          id: o._id,
          name: o.name,
          detail: `top {${ok}/${ob}/${op}} != accountability {${ak}/${ab}/${ap}}`,
        });
    }
    const sc = num(o.score);
    if (sc != null && (Number.isNaN(sc) || sc < 0 || sc > 100))
      findings.hardFailures.push({ check: 'top-score-range', id: o._id, name: o.name, detail: `score=${o.score}` });
    // soft warning: counts stored as strings rather than integers
    if ([o.kept, o.broken, o.pending].some((x) => typeof x === 'string'))
      findings.warnings.push({ check: 'count-type', id: o._id, name: o.name, detail: 'kept/broken/pending stored as strings, not integers' });
    // verdict tally must match the stored kept/broken counts
    if (Array.isArray(o.promises) && o.promises.length && ok != null) {
      const t = { kept: 0, broken: 0, pending: 0 };
      o.promises.forEach((p) => t[normVerdict(p && p.verdict)]++);
      if (t.kept !== ok || t.broken !== ob)
        findings.hardFailures.push({
          check: 'verdict-tally',
          id: o._id,
          name: o.name,
          detail: `promises tally {${t.kept}k/${t.broken}b} != stored {${ok}k/${ob}b}`,
        });
    }
  }

  // ── CHECK 3 — Spotlight readiness (mirrors _krBuildSpotlight fallbacks) ────
  // A record-based Spotlight needs a score AND at least one resolved promise,
  // OR a non-generic stated position. Otherwise the card falls back to the
  // "Compiling Record" stub — acceptable for a candidate, a red flag for a
  // sitting member who should have a record.
  const hasStance = (o) =>
    o.stances && typeof o.stances === 'object' && Object.values(o.stances).some((t) => typeof t === 'string' && t.trim() && !/^(n\/a|no stated position)/i.test(t));
  const spotlightReady = (o) => (acctScore(o) != null && ((o.kept || 0) + (o.broken || 0) > 0)) || hasStance(o);
  const spotlightStubs = current.filter((o) => !spotlightReady(o));
  spotlightStubs.forEach((o) =>
    findings.warnings.push({ check: 'spotlight-stub', id: o._id, name: o.name, detail: `sitting member has no record/stance to build a Spotlight from — ${office(o)}` })
  );
  const spotlightSample = current
    .filter(spotlightReady)
    .slice(0, 8)
    .map((o) => ({
      id: o._id,
      name: o.name,
      badge: ((o.kept || 0) + (o.broken || 0) > 0) ? 'Track record on file' : 'Where they stand',
      line: `${o.kept || 0} kept · ${o.broken || 0} broken · ${o.pending || 0} pending (Promise ${o.score}% / Accountability ${acctScore(o)})`,
    }));

  findings.stats = {
    totalRecords: recs.length,
    utahLegislators: utah.length,
    currentSitting: current.length,
    currentAtTarget: current.filter((o) => promiseCount(o) >= MIN_PROMISES).length,
    currentThin: thin.length,
    currentStubs: stubs.length,
    promiseDistribution: dist,
    spotlightStubs: spotlightStubs.length,
  };
  findings.spotlightSample = spotlightSample;
  return findings;
}

// ── Reporting ──────────────────────────────────────────────────────────────
function report(f) {
  if (JSON_OUT) {
    console.log(JSON.stringify(f, null, 2));
    return;
  }
  const s = f.stats;
  console.log('\nPolitiDex — Utah Legislature validation');
  console.log('========================================');
  console.log(`Records in Firestore ............ ${s.totalRecords}`);
  console.log(`Utah legislator records ......... ${s.utahLegislators}`);
  console.log(`Current sitting ................. ${s.currentSitting}`);
  console.log(`  at >= ${MIN_PROMISES} promises ............. ${s.currentAtTarget}`);
  console.log(`  thin (< ${MIN_PROMISES} promises) ......... ${s.currentThin}  (of which ${s.currentStubs} stubs with 0)`);
  console.log('  promise-count distribution ...', JSON.stringify(s.promiseDistribution));

  console.log('\nCHECK 1 — Promise counts');
  if (!f.warnings.some((w) => w.check === 'promise-count')) console.log('  ✓ every current sitting member has >= ' + MIN_PROMISES + ' promises');
  else f.warnings.filter((w) => w.check === 'promise-count').forEach((w) => console.log(`  ⚠ ${w.name} — ${w.detail}`));

  console.log('\nCHECK 2 — Score calculations / accountability integrity');
  const hard = f.hardFailures;
  if (!hard.length) console.log('  ✓ all scores in range, mirrors consistent, verdict tallies match');
  else hard.forEach((h) => console.log(`  ✗ [${h.check}] ${h.name} — ${h.detail}`));

  console.log('\nCHECK 3 — Spotlight readiness');
  if (!f.warnings.some((w) => w.check === 'spotlight-stub')) console.log('  ✓ every current sitting member has data for a record-based Spotlight');
  else f.warnings.filter((w) => w.check === 'spotlight-stub').forEach((w) => console.log(`  ⚠ ${w.name} — ${w.detail}`));
  console.log('  sample resolved Spotlight cards:');
  f.spotlightSample.forEach((x) => console.log(`    • ${x.name}: [${x.badge}] ${x.line}`));

  console.log('\nResult');
  console.log('------');
  console.log(`  hard failures: ${hard.length}   warnings: ${f.warnings.length}`);
  console.log(hard.length ? '  ✗ FAIL' : '  ✓ PASS (warnings need roster/editorial review)');
}

(async () => {
  try {
    const recs = await fetchAll();
    const f = run(recs);
    report(f);
    process.exit(f.hardFailures.length ? 1 : 0);
  } catch (e) {
    console.error('validation error:', e.message);
    process.exit(2);
  }
})();
