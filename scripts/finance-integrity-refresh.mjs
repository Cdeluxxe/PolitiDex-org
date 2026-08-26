#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — the money lane's refresh path (FEC + Utah disclosures)
//
// The finance lane publishes composition and counts only: itemized receipts, the
// five contribution buckets as filed with each one's share of the base, the
// largest reported source, and outside spending as a LEVEL. The 0–100
// "Constituents-First signal" was retired in Phase 2 and the arithmetic deleted;
// finance-lane.js (PDXFinanceLane.compose) is the whole read, and
// FINANCE_INTEGRITY.md documents the wall around it.
//
// A pure lane still rots. Filings age, cycles roll over, and a hand-edited
// dollar figure in a 2 MB index.html is exactly the kind of number nobody
// notices going stale. This script is the maintenance path for that, and it has
// two halves — deliberately, because only one of them needs a key:
//
//   AUDIT  (no key, no network, always available)
//     Reads the shipped FTM_FUNDING out of index.html and checks every record
//     against what the lane is allowed to say: buckets present and
//     non-negative, a base above zero, the base not exceeding reported
//     receipts, an outside LEVEL from the fixed vocabulary and never a dollar
//     figure, an https source URL per record and per outside note, a cycle, and
//     a review date. Then it reports staleness — which review stamps have aged
//     past the threshold, and which records are a whole CLOSED cycle behind the
//     public record (measured against the last completed cycle, not the one in
//     progress, so the report is signal rather than a permanent red wall).
//
//   FETCH  (needs FEC_API_KEY)
//     Pulls current FEC totals for the federal records and DIFFS them against
//     what is shipped, printing the FTM_FUNDING-shaped draft for a human to
//     verify and paste. It never writes to index.html, and a fetched figure is
//     never "the new truth" — it is a lead on a filing to go and read.
//
//   node scripts/finance-integrity-refresh.mjs                  # audit + plan
//   node scripts/finance-integrity-refresh.mjs --audit           # audit only
//   node scripts/finance-integrity-refresh.mjs --json            # machine-readable
//   node scripts/finance-integrity-refresh.mjs --today 2026-08   # pin "now"
//   FEC_API_KEY=… node scripts/finance-integrity-refresh.mjs --fetch
//
// ── HONESTY RULES (matching the rest of the site) ──────────────────────────
//   • NEVER edits index.html. It prints; a human verifies against the live
//     filing and hand-updates FTM_FUNDING. Nothing unverified ships.
//   • The roster is DERIVED from the shipped FTM_FUNDING, never kept as a
//     second hand-maintained list here. A second list is how a filing gets
//     added to the site and silently stops being refreshed. Records with no
//     known federal id are reported as blocked-on with the manual source to
//     read — never skipped quietly, and never fetched from the wrong id.
//   • Federal figures come from the FEC (the primary source). State/local
//     figures (Utah) are entered by hand: disclosures.utah.gov has no open
//     JSON API, so this script prints the search URL and nothing else. It does
//     not pretend to a live state refresh it cannot perform.
//   • Outside ("dark-money") spending stays a LEVEL — high / moderate / low /
//     none — never a fabricated dollar figure, because independent expenditure
//     is real but is not itemized to a candidate.
//   • Coverage stays labelled incomplete. This script can raise the count of
//     filings on file; it cannot make the lane complete, and it prints the
//     ratio so nobody mistakes a refresh for coverage.
//   • NO FINANCE → DIRECTION MATCH PATH. Nothing here reads or writes an issue
//     key, a stated position, a formal action, a tier or a publication floor.
//     Money is a side lane and stays one; this script's only output is money.
//   • No secret is ever printed. The key's presence is reported, never its
//     value, and it is never echoed into a URL that reaches stdout.
//
// The FEC endpoint used is the public, documented one:
//   https://api.open.fec.gov/v1/candidate/{FEC_ID}/totals/
// A free key comes from https://api.open.fec.gov/developers/ — set it as
// FEC_API_KEY. Without one, --fetch refuses rather than falling back to
// DEMO_KEY, whose rate limit turns a refresh into a handful of silent failures.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d = null) => {
  const i = argv.indexOf(`--${f}`);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : d;
};

const FETCH = has('fetch');
const AUDIT_ONLY = has('audit');
const AS_JSON = has('json');
// The key is read but never printed, never logged, and never included in any
// string that reaches stdout — only its presence is reported.
const KEY = process.env.FEC_API_KEY || process.env.FEC_KEY || '';

if (has('help') || argv.includes('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}

// ── The shipped data, read out of the shipped file ─────────────────────────
// Brace-matched out of index.html and evaluated as the object literal it is, so
// the audit is against what actually ships rather than against a copy that can
// disagree with it.
function shipped() {
  const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const at = src.indexOf('var FTM_FUNDING = {');
  if (at === -1) return { error: 'FTM_FUNDING is not in index.html under that name' };
  const open = src.indexOf('{', at);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return { error: 'FTM_FUNDING is not brace-balanced' };
  let funding;
  try {
    funding = new Function(`return ${src.slice(open, end + 1)};`)();
  } catch (e) {
    return { error: `FTM_FUNDING did not evaluate: ${e.message}` };
  }
  const asOf = (/var FTM_AS_OF\s*=\s*'([^']*)'/.exec(src) || [])[1] || '';
  // The denominator for the coverage sentence, from the same place the lane
  // reads it at runtime.
  const cmp = readFileSync(join(ROOT, 'cmp-data.js'), 'utf8');
  const roster = (cmp.match(/^\s{0,2}"[a-z0-9_]+":\s*\{$/gm) || []).length;
  return { funding, asOf, roster };
}

// ── Federal candidate ids ─────────────────────────────────────────────────
// The ONLY hand-kept table here, and it holds identifiers rather than figures:
// an FEC candidate id is a stable key, not data that goes stale. A shipped
// record missing from this map is reported as blocked-on with its own source
// link, never skipped and never guessed at — fetching the wrong candidate's
// totals is worse than fetching none.
const FEC_IDS = {
  trump: 'P80001571',
  lee: 'S0UT00089',
  curtis: 'S4UT00189',
  massie: 'H2KY04101',
  owens: 'H0UT04124',
  maloy: 'H4UT02132',
  kennedy: 'H4UT03119',
  bmoore: 'H8UT01143',
  gleich: 'S4UT00195'
};
// Records the site carries that are state/local or otherwise not FEC-fetchable.
// Named explicitly so "no FEC id" and "not a federal filing" stay different
// facts in the report.
const MANUAL = {
  cox: 'https://disclosures.utah.gov/Search/PublicSearch',
  bking: 'https://disclosures.utah.gov/Search/PublicSearch'
};

// ── The audit ─────────────────────────────────────────────────────────────
const BUCKETS = ['smallDollar', 'largeIndividual', 'pac', 'selfFunded', 'party'];
const OUTSIDE_LEVELS = ['high', 'moderate', 'low', 'none'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];
// A review stamp older than this is reported stale. Filings are annual-ish and a
// cycle is two years, so a year-and-a-half-old review is a real signal without
// crying about every quarter.
const STALE_MONTHS = 18;

const monthIndex = (s) => MONTHS.indexOf(String(s || '').trim().toLowerCase());
function parseStamp(s) {
  // "July 2026" → {y, m}. Per-record `asOf` uses the same shape as FTM_AS_OF.
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const mi = monthIndex(m[1]);
  return mi === -1 ? null : { y: +m[2], m: mi + 1, text: `${m[1]} ${m[2]}` };
}
function today() {
  // Pinned with --today YYYY-MM so a staleness report is reproducible. Without
  // it, the real clock — this is a curator tool, not a shipped module, and the
  // suite always pins it.
  const pin = val('today');
  if (pin) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(pin);
    if (m) return { y: +m[1], m: +m[2] };
  }
  const d = new Date();
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}
const monthsBetween = (a, b) => (b.y - a.y) * 12 + (b.m - a.m);

function auditRecord(id, r, siteAsOf, now) {
  const problems = [];
  const notes = [];
  const bad = (m) => problems.push(m);

  if (!r || typeof r !== 'object') return { id, problems: ['record is not an object'], notes };

  // Buckets: present, numeric, non-negative. A negative bucket would render as a
  // share and a negative share is not a composition.
  let base = 0;
  for (const b of BUCKETS) {
    const v = r[b];
    if (v === undefined) { bad(`missing bucket ${b}`); continue; }
    if (typeof v !== 'number' || !Number.isFinite(v)) { bad(`${b} is not a finite number`); continue; }
    if (v < 0) bad(`${b} is negative`);
    base += v;
  }
  if (base <= 0) bad('the itemized base is zero — the lane would render nothing, so the record should not be here');

  // Receipts is the reported total. The buckets are a breakdown OF it, so a base
  // above receipts means one of the two numbers was mis-transcribed.
  if (typeof r.receipts !== 'number' || !Number.isFinite(r.receipts)) bad('receipts is not a finite number');
  else if (r.receipts < 0) bad('receipts is negative');
  else if (base > r.receipts * 1.01) bad(`the buckets sum to ${base} but receipts is ${r.receipts}`);
  else if (r.receipts > 0 && base < r.receipts * 0.5) {
    notes.push(`the buckets cover ${Math.round((base / r.receipts) * 100)}% of reported receipts — ` +
      'the rest is transfers/other and is not shown; confirm that is what the filing says');
  }

  if (!r.cycle || !/^\d{4}$/.test(String(r.cycle))) bad('cycle is missing or not a four-digit year');

  // Sources: https, per record and per outside note, because the UI links both
  // and an unverifiable figure is not publishable in this lane.
  const url = (u, what) => {
    if (!u) { bad(`${what} has no source URL`); return; }
    if (!/^https:\/\//.test(String(u))) bad(`${what} source is not an https URL`);
  };
  url(r.source, 'the record');

  // Outside spending is a LEVEL. A dollar figure here is the one thing the lane
  // has always refused, so it is checked as hard as the level itself.
  if (r.outside) {
    const o = r.outside;
    if (!OUTSIDE_LEVELS.includes(o.level)) bad(`outside.level ${JSON.stringify(o.level)} is not one of ${OUTSIDE_LEVELS.join('/')}`);
    if (typeof o.amount === 'number' || typeof o.dollars === 'number') bad('outside spending carries a dollar figure — it must stay a level');
    if (o.note && /\$\s?[\d,.]+/.test(String(o.note))) bad('outside.note states a dollar figure for independent expenditure');
    url(o.source, 'the outside-spending note');
  } else {
    notes.push('no outside-spending note — the card will omit it rather than report "none"');
  }

  // Freshness. A per-record asOf overrides the site stamp; either way it has to
  // parse, or the "Data last reviewed" line is decoration.
  const stampText = r.asOf || siteAsOf;
  const stamp = parseStamp(stampText);
  if (!stamp) bad(`review date ${JSON.stringify(stampText)} does not parse as "Month YYYY"`);
  const age = stamp ? monthsBetween(stamp, now) : null;
  const stale = age !== null && age > STALE_MONTHS;

  // Cycle currency, measured against the last CLOSED cycle rather than the one in
  // progress. Federal cycles end in even Novembers, so through most of an even
  // year the newest complete filing is still the previous cycle's — flagging every
  // record for that would make the staleness report noise, and a report that is
  // always red is a report nobody reads.
  const closedCycle = now.y % 2 === 0 && now.m < 12 ? now.y - 2 : (now.y % 2 === 0 ? now.y : now.y - 1);
  const cycleBehind = /^\d{4}$/.test(String(r.cycle)) ? closedCycle - +r.cycle : null;

  return {
    id,
    lane: FEC_IDS[id] ? 'federal' : (MANUAL[id] ? 'state' : 'unknown'),
    fecId: FEC_IDS[id] || null,
    manualSource: MANUAL[id] || null,
    cycle: String(r.cycle || ''),
    receipts: typeof r.receipts === 'number' ? r.receipts : null,
    base,
    outsideLevel: (r.outside && r.outside.level) || null,
    reviewed: stamp ? stamp.text : String(stampText || ''),
    ageMonths: age,
    stale,
    cycleBehind,
    problems,
    notes
  };
}

// ── FEC fetch (a lead, not a truth) ───────────────────────────────────────
function toBuckets(t) {
  if (!t) return null;
  return {
    receipts: Math.round(t.receipts || 0),
    smallDollar: Math.round(t.individual_unitemized_contributions || 0),
    largeIndividual: Math.round(t.individual_itemized_contributions || 0),
    pac: Math.round(t.other_political_committee_contributions || 0),
    selfFunded: Math.round((t.candidate_contribution || 0) + (t.loans_made_by_candidate || 0)),
    party: Math.round(t.political_party_committee_contributions || 0),
    cycle: String(t.cycle || '')
  };
}
async function fetchFEC(fecId) {
  const url = new URL(`https://api.open.fec.gov/v1/candidate/${encodeURIComponent(fecId)}/totals/`);
  url.searchParams.set('sort', '-cycle');
  url.searchParams.set('per_page', '1');
  url.searchParams.set('api_key', KEY);
  const res = await fetch(url);
  // The URL carries the key, so it is never included in an error message.
  if (!res.ok) throw new Error(`FEC ${fecId}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.results && json.results[0]) || null;
}
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
function drift(shippedRec, fetched) {
  // What changed, in the buckets the lane actually publishes. Reported as a
  // delta for a human to go and confirm against the filing — never applied.
  const rows = [];
  for (const b of ['receipts'].concat(BUCKETS)) {
    const was = +shippedRec[b] || 0;
    const now = +fetched[b] || 0;
    if (was === now) continue;
    rows.push({ bucket: b, was, now, deltaPct: was ? pct(now - was, was) : null });
  }
  return rows;
}

// ── Report ────────────────────────────────────────────────────────────────
const money = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);

async function main() {
  const site = shipped();
  if (site.error) {
    console.error(`cannot read the shipped filings: ${site.error}`);
    process.exit(2);
  }
  const now = today();
  const ids = Object.keys(site.funding).sort();
  const audited = ids.map((id) => auditRecord(id, site.funding[id], site.asOf, now));

  const broken = audited.filter((a) => a.problems.length);
  const stale = audited.filter((a) => a.stale);
  // A whole closed cycle behind, i.e. there is a completed filing on the public
  // record that PolitiDex has not read yet.
  const behind = audited.filter((a) => a.cycleBehind !== null && a.cycleBehind >= 2);
  const noId = audited.filter((a) => a.lane === 'unknown');
  const coverage = { onFile: ids.length, roster: site.roster };

  if (AS_JSON) {
    console.log(JSON.stringify({
      lane: 'composition and counts only — no score, no grade, no Direction Match path',
      asOf: site.asOf,
      today: `${now.y}-${String(now.m).padStart(2, '0')}`,
      staleAfterMonths: STALE_MONTHS,
      coverage,
      coverageComplete: false,
      keyPresent: !!KEY,
      records: audited,
      blockedOn: KEY ? [] : ['FEC_API_KEY'],
      manualOnly: Object.keys(MANUAL).sort()
    }, null, 2));
    return;
  }

  console.log('');
  console.log('  POLITIDEX — MONEY LANE REFRESH');
  console.log('  ' + '─'.repeat(72));
  console.log(`  Lane: composition and counts only. No score, no grade, no path to`);
  console.log('  Direction Match or a formal tier. This script only ever touches money.');
  console.log(`  Shipped review stamp: ${site.asOf || '(none)'} · "now" for this run: ${now.y}-${String(now.m).padStart(2, '0')}`);
  console.log(`  FEC key: ${KEY ? 'present in the environment' : 'NOT SET — audit runs, --fetch will refuse'}`);
  console.log('');

  // Coverage, stated as incomplete, in the same breath as the data — the lane's
  // own posture, applied to its maintenance tool.
  console.log(`  COVERAGE — itemized filings on file for ${coverage.onFile} of the ${coverage.roster} people`);
  console.log('  PolitiDex carries. That is incomplete and stays labelled incomplete: a');
  console.log('  missing filing is missing data, not a finding about anyone. Refreshing');
  console.log('  the filings we hold does not change that ratio.');
  console.log('');

  console.log(`  AUDIT — ${audited.length} shipped record(s), no network needed`);
  console.log('  ' + '─'.repeat(72));
  if (!broken.length) console.log('  ✓ every record is a well-formed composition: buckets non-negative, base');
  if (!broken.length) console.log('    within receipts, outside spending a level, https source, review date parses.');
  for (const a of broken) {
    console.log(`  ✗ ${a.id}`);
    a.problems.forEach((p) => console.log(`      · ${p}`));
  }
  const noted = audited.filter((a) => a.notes.length && !a.problems.length);
  if (noted.length) {
    console.log('');
    console.log('  Worth a look (not errors):');
    for (const a of noted) a.notes.forEach((n) => console.log(`      · ${a.id} — ${n}`));
  }
  console.log('');

  console.log(`  STALENESS — review stamps older than ${STALE_MONTHS} months, and closed cycles unread`);
  console.log('  ' + '─'.repeat(72));
  if (!stale.length) console.log(`  ✓ no review stamp is older than ${STALE_MONTHS} months.`);
  for (const a of stale) console.log(`  · ${a.id} — reviewed ${a.reviewed} (${a.ageMonths} months ago)`);
  if (behind.length) {
    for (const a of behind) {
      console.log(`  · ${a.id} — cycle ${a.cycle} is ${a.cycleBehind} year(s) behind the last closed cycle` +
        (a.fecId ? ` → https://www.fec.gov/data/candidate/${a.fecId}/` : ''));
    }
  } else {
    console.log('  ✓ no record is a whole closed cycle behind the public record.');
  }
  console.log('');

  if (noId.length) {
    console.log('  BLOCKED — shipped filings with no known refresh route');
    console.log('  ' + '─'.repeat(72));
    for (const a of noId) {
      console.log(`  · ${a.id} — no FEC candidate id and no manual source on record.`);
      console.log('      Add its FEC id to FEC_IDS, or its disclosure URL to MANUAL, before');
      console.log('      this figure can be refreshed at all. Reported rather than skipped.');
    }
    console.log('');
  }

  console.log('  STATE / LOCAL — entered by hand, no live refresh exists');
  console.log('  ' + '─'.repeat(72));
  for (const id of Object.keys(MANUAL).sort()) {
    if (!site.funding[id]) continue;
    console.log(`  · ${id} — read the committee summary at ${MANUAL[id]}`);
  }
  console.log('  Utah publishes no open JSON API. This script prints the search URL and');
  console.log('  stops there; a curator reads the filing and fills the buckets by hand.');
  console.log('');

  if (AUDIT_ONLY) return finish(broken);

  console.log('  FEDERAL — the FEC route');
  console.log('  ' + '─'.repeat(72));
  if (!FETCH) {
    for (const a of audited.filter((x) => x.fecId)) {
      console.log(`  · ${a.id} — cycle ${a.cycle}, ${a.receipts === null ? '?' : money(a.receipts)} on file` +
        ` · https://www.fec.gov/data/candidate/${a.fecId}/`);
    }
    console.log('');
    console.log('  Dry run. Pass --fetch with FEC_API_KEY set to pull current totals and');
    console.log('  diff them against what ships. Nothing is written either way.');
    console.log('');
    return finish(broken);
  }

  if (!KEY) {
    // Refuse rather than fall back to DEMO_KEY. A rate-limited half-refresh
    // looks like a completed one and is the "fake live refresh" the brief warns
    // about.
    console.log('  BLOCKED ON: FEC_API_KEY.');
    console.log('  --fetch will not fall back to DEMO_KEY: its rate limit turns a refresh');
    console.log('  into a handful of silent HTTP 429s, which reads exactly like a clean run.');
    console.log('  Get a free key at https://api.open.fec.gov/developers/ and set FEC_API_KEY.');
    console.log('');
    process.exitCode = 3;
    return finish(broken);
  }

  for (const a of audited.filter((x) => x.fecId)) {
    try {
      const fetched = toBuckets(await fetchFEC(a.fecId));
      if (!fetched) { console.log(`  · ${a.id} — no FEC totals returned\n`); continue; }
      const rows = drift(site.funding[a.id], fetched);
      if (!rows.length) { console.log(`  ✓ ${a.id} — matches the FEC totals for cycle ${fetched.cycle}\n`); continue; }
      console.log(`  · ${a.id} — FEC cycle ${fetched.cycle} differs from the shipped record:`);
      for (const r of rows) {
        console.log(`      ${r.bucket}: ${money(r.was)} → ${money(r.now)}` +
          (r.deltaPct === null ? '' : ` (${r.deltaPct > 0 ? '+' : ''}${r.deltaPct}%)`));
      }
      console.log('      Verify against the filing, then hand-update FTM_FUNDING:');
      console.log(`      ${a.id}: ${JSON.stringify(fetched)},`);
      console.log('');
    } catch (err) {
      console.log(`  · ${a.id} — fetch failed: ${err.message}\n`);
    }
  }
  return finish(broken);
}

function finish(broken) {
  console.log('  ' + '─'.repeat(72));
  console.log('  Nothing above was written. FTM_FUNDING lives in index.html and is edited');
  console.log('  by a human who has read the filing; a fetched figure is a lead on a');
  console.log('  document, not a replacement for reading it. After any edit, re-run this');
  console.log('  audit and scripts/test-finance-lane.mjs.');
  console.log('');
  if (broken.length) process.exitCode = 1;
}

main().catch((err) => { console.error(err && err.message ? err.message : err); process.exit(1); });
