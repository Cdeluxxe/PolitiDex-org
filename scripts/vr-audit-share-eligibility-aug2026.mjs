#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-share-eligibility-aug2026.mjs — run the REAL card pipeline offline
// ─────────────────────────────────────────────────────────────────────────────
// The circular-stance audit (vr-audit-circular-stances-aug2026.mjs) reads one
// field and answers one question: does this stance text read as a vote? That is
// enough to find the 264 rankable pairs whose stance is written circularly, but
// not enough to say which of them a REWRITE would actually unlock — a pair can be
// dark for six other reasons at once, and rewriting its stance would change
// nothing a reader ever sees.
//
// This script answers the narrower, actionable question by running the shipped
// pipeline rather than approximating it:
//
//   1. load the app's own modules in a VM — alignment-tool.js (ISSUE_MAP),
//      stance-helpers.js (_polPositionMap / _issueRecordSummary, the verdict
//      engine), cmp-data.js + profiles-full.js (office and party), the stance
//      chunks, voting-record.js and receipt-cards.js;
//   2. assemble RecordItems from the database EXACTLY as netlify/functions/
//      voting-record.mts assembles them for the live API — same columns, same
//      procedural/inversion derivation, same "no source → never emitted" rule;
//   3. seed them through PDXVotingRecord.noteMember, then ask
//      PDXReceiptCards.candidates() and publicShareBlock() what they conclude.
//
// The payoff is the counterfactual: for every pair blocked by guard 10, the audit
// re-runs the SAME pair with the stance text swapped for a neutral placeholder
// and reports what the pipeline says next. A pair that goes eligible is a pair a
// rewrite lifts. A pair that hits another guard is named with the guard that
// would still stop it, so nobody spends an afternoon rewriting a stance whose
// card is blocked by a nomination proxy or an unstable verdict.
//
//   node scripts/vr-audit-share-eligibility-aug2026.mjs
//   node scripts/vr-audit-share-eligibility-aug2026.mjs --json
//   node scripts/vr-audit-share-eligibility-aug2026.mjs --counts   # totals only
//
// Read-only against the database and the repo. Requires NETLIFY_DB_URL.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const COUNTS_ONLY = process.argv.includes('--counts');
// --pairs pid|issue_key,pid|issue_key — report the real gate for just these pairs.
const PAIRS = (() => {
  const i = process.argv.indexOf('--pairs');
  return i === -1 || !process.argv[i + 1] ? [] : process.argv[i + 1].split(',').filter(Boolean);
})();

// The placeholder a blocked stance is re-tested with. It states a direction in
// plain words, cites nothing, and contains no vote verb — i.e. it is what a
// successful rewrite looks like to the guards, and nothing more. It is never
// written anywhere; it exists only to isolate guard 10.
const NEUTRAL_PROBE = 'Holds this position as a matter of stated policy priority.';
// The `evidence` counterpart. Guard 15 tests evidence for the same two defects, so
// the probe needs a clean value for it too.
const NEUTRAL_PROBE_EVIDENCE = 'Stated in a public speech.';

// ── The app, loaded the way the page loads it ────────────────────────────────
function loadApp() {
  const noopEl = () => ({
    style: {}, textContent: '', hidden: false, className: '', innerHTML: '', value: '',
    dataset: {}, children: [], firstChild: null, parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    appendChild() {}, removeChild() {}, insertBefore() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    document: {
      readyState: 'complete',
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, createDocumentFragment: noopEl,
      getElementById: () => null, getElementsByTagName: () => [],
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {},
      cookie: '',
    },
    location: { hash: '', search: '', href: 'https://www.politidex.fyi/', origin: 'https://www.politidex.fyi', pathname: '/' },
    navigator: { userAgent: 'node', onLine: true, language: 'en-US' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    requestIdleCallback: () => 0,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    // Nothing in this audit may reach the network: the record comes from the
    // database directly, and a live fetch would make the result depend on
    // whatever the deployed API happens to be serving.
    fetch: () => Promise.reject(new Error('offline audit: fetch is disabled')),
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    Event: class { constructor(t) { this.type = t; } },
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
    parseInt, parseFloat, isNaN, isFinite, String, Number, Boolean, Array, Object,
    RegExp, Error, Map, Set, WeakMap, WeakSet, Intl, URL, URLSearchParams,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.top = ctx;
  ctx.addEventListener = () => {};
  ctx.removeEventListener = () => {};
  ctx.dispatchEvent = () => true;
  vm.createContext(ctx);

  // Order matters — the same order index.html uses. Profiles and cmp-data supply
  // office/party (guard: a card without them reads as a draft), the stance chunks
  // supply the SAID side, stance-helpers the verdict engine, alignment-tool the
  // ISSUE_MAP, and receipt-cards the guards themselves.
  const files = [
    'cmp-data.js',
    'profiles-full.js',
    'politician-stances-core.js',
    'politician-stances-ext.js',
    'state-senate-stances.js',
  ];
  for (let i = 2; i <= 16; i++) files.push(`state-senate-stances-w${i}.js`);
  files.push('stance-helpers.js', 'alignment-tool.js', 'issue-colors.js',
             'voting-record.js', 'say-vs-do.js', 'receipt-cards.js');

  const loaded = [], failed = [];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { failed.push(`${f} (missing)`); continue; }
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); loaded.push(f); }
    catch (e) { failed.push(`${f}: ${e.message}`); }
  }
  return { ctx, loaded, failed };
}

// ── The record, assembled exactly as the live API assembles it ───────────────
// Mirrors netlify/functions/voting-record.mts: PROCEDURAL_TYPES, yeaBlocksMeasure
// and the drop-if-no-source rule are reproduced rather than re-invented, because a
// card's guards read all three.
const PROCEDURAL_TYPES = ['procedural', 'motion'];
function yeaBlocksMeasure(question) {
  const q = String(question || '').toLowerCase();
  return q.indexOf('recommit') !== -1 || q.indexOf('to commit') !== -1 || q.indexOf('to table') !== -1;
}

async function loadRecords() {
  const client = new pg.Client({
    connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const issueRows = (await client.query(
    'SELECT measure_id, issue_key, weight, is_primary, support_meaning, rationale FROM vr_measure_issues')).rows;
  const issuesByMeasure = new Map();
  for (const r of issueRows) {
    const list = issuesByMeasure.get(r.measure_id) || [];
    list.push({
      issueKey: r.issue_key, weight: r.weight, isPrimary: r.is_primary,
      supportMeaning: r.support_meaning, rationale: r.rationale,
    });
    issuesByMeasure.set(r.measure_id, list);
  }
  for (const list of issuesByMeasure.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  }

  const voteRows = (await client.query(`
    SELECT v.politician_id AS pid, v.position, v.rollcall_id, v.is_party,
           r.question, r.action_type, r.result, r.vote_date, r.congress, r.session,
           r.roll_number, r.source_url AS rc_source_url, r.source_label AS rc_source_label,
           m.id AS measure_id, m.measure_type, m.number, m.title, m.chamber, m.status,
           m.parent_id
      FROM vr_member_votes v
      JOIN vr_rollcalls r ON r.id = v.rollcall_id
      JOIN vr_measures  m ON m.id = r.measure_id`)).rows;

  // The live API reads a position's label off the MEASURE (vr_positions carries
  // only a source_url), so the same join is used here.
  const posRows = (await client.query(`
    SELECT p.politician_id AS pid, p.action_type, p.supports, p.acted_at,
           p.source_url AS pos_source_url, m.source_label AS pos_source_label,
           m.id AS measure_id, m.measure_type, m.number, m.title, m.chamber, m.status,
           m.parent_id
      FROM vr_positions p
      JOIN vr_measures m ON m.id = p.measure_id`)).rows;

  await client.end();

  const byPid = new Map();
  const push = (pid, item) => {
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(item);
  };

  for (const v of voteRows) {
    if (!v.rc_source_url) continue;    // no source → never emitted
    push(v.pid, {
      kind: 'vote', measureId: v.measure_id, measureType: v.measure_type,
      number: v.number, title: v.title, chamber: v.chamber, status: v.status,
      date: v.vote_date ? new Date(v.vote_date).toISOString() : null,
      action: v.question, actionType: v.action_type, position: v.position,
      result: v.result, isParty: v.is_party, supports: null,
      isProcedural: PROCEDURAL_TYPES.includes(v.action_type),
      advanceInverted: yeaBlocksMeasure(v.question),
      isAmendment: v.measure_type === 'amendment',
      parentMeasureId: v.parent_id ?? null,
      rollcallId: v.rollcall_id,
      congress: v.congress ?? null, session: v.session ?? null,
      rollNumber: v.roll_number ?? null,
      issues: issuesByMeasure.get(v.measure_id) ?? [],
      source: { url: v.rc_source_url, label: v.rc_source_label },
    });
  }
  for (const p of posRows) {
    if (!p.pos_source_url) continue;
    push(p.pid, {
      kind: 'position', measureId: p.measure_id, measureType: p.measure_type,
      number: p.number, title: p.title, chamber: p.chamber, status: p.status,
      date: p.acted_at ? new Date(p.acted_at).toISOString() : null,
      action: p.action_type, actionType: p.action_type, position: p.action_type,
      result: null, isParty: null, supports: p.supports,
      isProcedural: false, advanceInverted: false,
      isAmendment: p.measure_type === 'amendment',
      parentMeasureId: p.parent_id ?? null,
      rollcallId: null, congress: null, session: null, rollNumber: null,
      issues: issuesByMeasure.get(p.measure_id) ?? [],
      source: { url: p.pos_source_url, label: p.pos_source_label ?? null },
    });
  }
  for (const items of byPid.values()) {
    items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return byPid;
}

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const { ctx, failed } = loadApp();
  const win = ctx.window;
  const RC = win.PDXReceiptCards;
  if (!RC) throw new Error('receipt-cards.js did not expose PDXReceiptCards' +
    (failed.length ? ` — load failures: ${failed.join('; ')}` : ''));
  if (typeof win._issueRecordSummary !== 'function') {
    throw new Error('stance-helpers.js did not expose _issueRecordSummary' +
      (failed.length ? ` — load failures: ${failed.join('; ')}` : ''));
  }
  if (failed.length) console.error(`  ! module load warnings: ${failed.join('; ')}`);

  const records = await loadRecords();
  for (const [pid, items] of records) win.PDXVotingRecord.noteMember(pid, items);

  const STANCES = win.ISSUE_STANCE_DATA || {};
  // The row the position map actually surfaces for a (pid, issueKey), so a probe
  // swap edits the same row a rewrite would.
  function rowFor(pid, issueKey) {
    for (const e of (STANCES[pid] || [])) {
      if (e && e.issueKey === issueKey && (e.issueStance || e.pos)) return e;
    }
    return null;
  }

  let rankable = 0, eligibleCards = 0;
  const circular = [];      // pairs guard 10 stops
  const byReason = new Map();

  for (const pid of Object.keys(STANCES)) {
    if (!records.has(pid)) continue;
    let cands;
    try { cands = RC.candidates(pid) || []; } catch (e) { continue; }
    if (!cands.length) continue;
    rankable += cands.length;

    for (const c of cands) {
      const reason = c.blocked || '';
      byReason.set(reason || 'eligible', (byReason.get(reason || 'eligible') || 0) + 1);
      if (!reason) eligibleCards++;
      if (!/itself vote-derived|written as a vote|cites a measure number/.test(reason)) continue;

      const row = rowFor(pid, c.issueKey);
      if (!row) continue;

      // ── The counterfactual ────────────────────────────────────────────────
      // Swap ONLY the text, re-run the real pipeline, then put it back. If the
      // pair goes public-eligible, guard 10 was the last thing in its way.
      const before = row.text;
      const beforeEv = row.evidence;
      row.text = NEUTRAL_PROBE;
      // `evidence` is the same editorial field as `text` — guard 15 applies the
      // SAME two circularity tests to it, so a rewrite that only fixed the
      // sentence a reader sees would leave the pair dark for a reason the audit
      // had not reported. Both halves of the row are probed together, because both
      // are what "rewrite this stance" means.
      if (beforeEv) row.evidence = NEUTRAL_PROBE_EVIDENCE;
      // The position map is memoized per derivation epoch (see THE DERIVATION
      // EPOCH in stance-helpers.js), so the epoch has to be bumped or the probe is
      // invisible to the engine. PDXDataChanged() is the app's own invalidation
      // hook — the same one noteMember calls after seeding a record.
      let probeBlocked = 'probe failed', probeTier = '', judged = 0;
      try {
        win.PDXDataChanged();
        const re = (RC.candidates(pid) || []).find(
          x => x.issueKey === c.issueKey && x.want === c.want);
        if (re) {
          probeBlocked = re.blocked || '';
          judged = (re.summary && re.summary.total) || 0;
          if (!probeBlocked) {
            const card = RC.find(pid, c.issueKey);
            probeBlocked = card ? (RC.publicShareBlock(card) || '') : 'card did not build';
            probeTier = card ? RC.publicTier(card) : '';
          }
        } else {
          probeBlocked = 'pair disappeared under probe';
        }
      } finally {
        row.text = before;
        row.evidence = beforeEv;
        win.PDXDataChanged();
      }

      circular.push({
        pid, issueKey: c.issueKey, want: c.want, topic: row.topic || '',
        stance: row.issueStance || row.pos || '',
        judged: judged || (c.summary && c.summary.total) || 0,
        measure: c.item && c.item.number || '', date: c.item && c.item.date || '',
        text: before,
        source: (row.source && row.source.label) || '',
        sourceUrl: (row.source && row.source.url) || '',
        evidence: row.evidence || '',
        blocked: reason,
        // '' means a rewrite alone lifts this pair to public-share eligible.
        afterRewrite: probeBlocked,
        tier: probeTier,
        liftable: probeBlocked === '',
      });
    }
  }

  circular.sort((a, b) => Number(b.liftable) - Number(a.liftable) ||
                          b.judged - a.judged || a.pid.localeCompare(b.pid));
  const liftable = circular.filter(h => h.liftable);

  // ── --pairs: the real gate, per named pair ─────────────────────────────────
  // No probe and no swap — this is what the shipped pipeline says about a pair as
  // the corpus currently stands. Used to confirm a stance rewrite actually landed
  // (and to name the non-stance guard still holding a pair back, if one is).
  if (PAIRS.length) {
    console.log('── Real gate, per pair ───────────────────────────────────────────────');
    for (const spec of PAIRS) {
      const [pid, issueKey] = spec.split('|');
      let cands = [];
      try { cands = (RC.candidates(pid) || []).filter(c => c.issueKey === issueKey); }
      catch (e) { /* member has no warm record */ }
      if (!cands.length) { console.log(`${spec}  → no candidate pair`); continue; }
      for (const c of cands) {
        let line = `${pid} · ${issueKey} · want=${c.want} · ${(c.summary && c.summary.total) || 0}j`;
        if (c.blocked) { console.log(`${line}\n    BLOCKED (card): ${c.blocked}`); continue; }
        const card = RC.find(pid, issueKey);
        if (!card) { console.log(`${line}\n    card did not build`); continue; }
        const pub = RC.publicShareBlock(card) || '';
        console.log(`${line}\n    ${pub ? 'BLOCKED (public): ' + pub : 'ELIGIBLE — tier ' + RC.publicTier(card)}`);
      }
    }
    console.log('');
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({
      rankable, eligibleCards, circular: circular.length, liftable: liftable.length,
      hits: circular,
    }, null, 2));
    return;
  }

  console.log('── Real-pipeline share eligibility ──────────────────────────────────');
  console.log(`rankable (issue, cited vote) candidate pairs : ${rankable}`);
  console.log(`  of which build a card today                : ${eligibleCards}`);
  console.log(`blocked by guard 10 (stance reads as a vote) : ${circular.length}`);
  console.log(`  a REWRITE alone would lift                 : ${liftable.length}`);
  console.log('');
  if (COUNTS_ONLY) {
    console.log('── top blocking reasons ───────────────────────────────────────────');
    [...byReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
      .forEach(([r, n]) => console.log(`${String(n).padStart(5)}  ${r.slice(0, 110)}`));
    return;
  }

  console.log(`── The ${liftable.length} pairs a rewrite lifts ──────────────────────────────`);
  liftable.forEach((h, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${h.pid} · ${h.issueKey} · ${h.want} · ${h.judged} judged · tier ${h.tier}`);
    console.log(`    topic : ${h.topic} [${h.stance}]`);
    console.log(`    cited : ${h.measure}  (${String(h.date).slice(0, 10)})`);
    console.log(`    text  : ${h.text}`);
    console.log(`    src   : ${h.source} — ${h.sourceUrl}`);
    if (h.evidence) console.log(`    evid  : ${h.evidence}`);
    console.log('');
  });

  const stuck = circular.filter(h => !h.liftable);
  console.log(`── ${stuck.length} pairs a rewrite would NOT lift (another guard still stops them) ──`);
  const grouped = new Map();
  for (const h of stuck) {
    const k = h.afterRewrite.slice(0, 100);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(`${h.pid}·${h.issueKey}`);
  }
  [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([r, list]) => {
    console.log(`  [${list.length}] ${r}`);
    console.log(`        ${list.slice(0, 8).join(', ')}${list.length > 8 ? ' …' : ''}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
