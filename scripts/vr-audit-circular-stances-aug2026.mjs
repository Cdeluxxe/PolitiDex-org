#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-circular-stances-aug2026.mjs — which rankable pairs are blocked
// because the STATED POSITION is itself a vote
// ─────────────────────────────────────────────────────────────────────────────
// A share card lines a member's stated position up against their own floor vote.
// Guard 10 (`blockStance` in receipt-cards.js) refuses to build that card when
// the stated position is written as a vote ("voted for the Laken Riley Act") or
// cites a measure number ("backs H.R. 5"). Both make the card circular: the SAID
// half and the DID half become the same document, and the card claims to have
// tested a position against evidence when it only restated the evidence.
//
// The fix for those rows is editorial, not mechanical — the position has to be
// re-sourced to platform language, a speech, an interview or an official
// statement. This script finds the rows worth that effort: the ones where the
// ONLY thing standing between a member and a public card is the wording of their
// stance. It is read-only.
//
// A pair is RANKABLE when all three of the engine's inputs line up:
//   1. the member has a recorded yea/nay on a measure,
//   2. that measure carries a curated issue mapping,
//   3. the member holds a stance row on that SAME issue key.
//
// The guards are not re-implemented here. receipt-cards.js is loaded in a bare VM
// and `window.PDXReceiptCards.guards` is called directly, so this audit cannot
// drift from the logic that actually ships. What it CANNOT see is the per-card
// half of the gate (a citable roll-call URL, a printable date, verdict
// stability): those need a warm record set. So a pair reported here as
// "stance-only block" is a pair whose stance is the blocking defect — it is not a
// promise that the card builds once the stance is rewritten.
//
//   node scripts/vr-audit-circular-stances-aug2026.mjs
//   node scripts/vr-audit-circular-stances-aug2026.mjs --json
//
// Requires NETLIFY_DB_URL.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');

// ── The live guards ──────────────────────────────────────────────────────────
// Same sandbox shape scripts/test-receipt-cards.mjs uses: enough document for the
// boot guards to no-op, no timers that could hold the process open.
function loadGuards() {
  const noopEl = () => ({
    style: {}, textContent: '', hidden: false, className: '', innerHTML: '',
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    document: {
      readyState: 'complete',
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { hash: '', origin: 'https://www.politidex.fyi', pathname: '/' },
    navigator: {},
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'receipt-cards.js'), 'utf8'), ctx,
    { filename: 'receipt-cards.js' });
  const api = ctx.window.PDXReceiptCards;
  if (!api || !api.guards) throw new Error('receipt-cards.js did not expose its guards');
  return api;
}

// ── Stated positions ─────────────────────────────────────────────────────────
// Every row, not just the key set — this audit is about the TEXT, so it needs the
// row itself. Rows are returned per (pid, issueKey) because that is the grain the
// engine keys on and the grain a card is built at.
function loadStanceRows() {
  const files = ['politician-stances.js', 'state-senate-stances.js'];
  for (let i = 2; i <= 16; i++) files.push(`state-senate-stances-w${i}.js`);
  const win = {};
  const sandbox = {
    window: win,
    document: { addEventListener() {}, readyState: 'complete' },
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.error(`  ! ${f} failed to load: ${e.message}`); }
  }
  const data = win.ISSUE_STANCE_DATA || {};
  const byPair = new Map();   // pid|issueKey → row (first row on that key wins,
                              // which is the row the position map surfaces)
  for (const [pid, arr] of Object.entries(data)) {
    for (const e of (arr || [])) {
      if (!e || !e.issueKey || !(e.issueStance || e.pos)) continue;
      const id = pid + '|' + e.issueKey;
      if (!byPair.has(id)) byPair.set(id, { pid, ...e });
    }
  }
  return byPair;
}

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const api = loadGuards();
  const G = api.guards;
  const rows = loadStanceRows();

  const client = new pg.Client({
    connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Only yea/nay is a direction. Present / not-voting are real record but carry
  // no position, so they can never produce a verdict.
  const votes = (await client.query(`
    SELECT v.politician_id AS pid, r.measure_id AS mid, m.number AS number
      FROM vr_member_votes v
      JOIN vr_rollcalls r ON r.id = v.rollcall_id
      JOIN vr_measures  m ON m.id = r.measure_id
     WHERE v.position IN ('yea','nay')`)).rows;

  const mapping = new Map();  // measureId → Set(issueKey)
  for (const r of (await client.query('SELECT measure_id, issue_key FROM vr_measure_issues')).rows) {
    if (!mapping.has(r.measure_id)) mapping.set(r.measure_id, new Set());
    mapping.get(r.measure_id).add(r.issue_key);
  }
  await client.end();

  // Rankable pairs, with the judged-vote depth and the measures behind each one.
  const pairs = new Map();   // pid|issueKey → { pid, issueKey, judged, numbers:Set }
  for (const v of votes) {
    const keys = mapping.get(v.mid);
    if (!keys) continue;
    for (const k of keys) {
      const id = v.pid + '|' + k;
      if (!rows.has(id)) continue;
      let p = pairs.get(id);
      if (!p) pairs.set(id, (p = { pid: v.pid, issueKey: k, judged: 0, numbers: new Set() }));
      p.judged++;
      if (v.number) p.numbers.add(String(v.number));
    }
  }

  // Guard 10 on every rankable pair, then the other stance-side guards so a row
  // whose rewrite would be pointless (held key, dependent source) is reported as
  // such rather than counted as an opportunity.
  const hits = [];
  for (const p of pairs.values()) {
    const row = rows.get(p.pid + '|' + p.issueKey);
    const circular = G.blockStance(row.text);
    if (!circular) continue;
    const holdKey = G.wave1Hold(p.issueKey);
    const dependent = G.blockDependentStance(
      { text: row.text, source: row.source, evidence: row.evidence }, null);
    const heldPairs = [...p.numbers].filter(n => G.wave1HoldPairs[n + ' :: ' + p.issueKey]);
    hits.push({
      pid: p.pid, issueKey: p.issueKey, topic: row.topic || '',
      stance: row.issueStance || row.pos || '', judged: p.judged,
      text: row.text || '',
      source: (row.source && row.source.label) || '', sourceUrl: (row.source && row.source.url) || '',
      circular, holdKey, dependent,
      heldPairs,
      // Every measure the pair could be scored on, so a rewrite can be checked
      // against the votes it will actually be lined up against.
      numbers: [...p.numbers].sort(),
      // `true` when guard 10 is the ONLY stance-side reason this pair is dark.
      stanceOnly: !holdKey && !dependent && heldPairs.length < p.numbers.size,
      thin: p.judged < api.PUBLIC_MIN_JUDGED,
    });
  }
  hits.sort((a, b) => b.judged - a.judged || a.pid.localeCompare(b.pid));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      rankablePairs: pairs.size, circular: hits.length,
      stanceOnly: hits.filter(h => h.stanceOnly).length, hits,
    }, null, 2));
    return;
  }

  console.log('── Circular / vote-derived stance text on RANKABLE pairs ─────────────');
  console.log(`rankable pairs (vote + mapping + stance on the same key): ${pairs.size}`);
  console.log(`blocked by guard 10 (stance reads as a vote):            ${hits.length}`);
  console.log(`  of those, guard 10 is the ONLY stance-side block:      ${hits.filter(h => h.stanceOnly).length}`);
  console.log('');
  for (const h of hits) {
    console.log(`${h.pid}  ·  ${h.issueKey}  ·  ${h.judged} judged${h.thin ? ' (thin)' : ''}`);
    console.log(`  topic   : ${h.topic}  [${h.stance}]`);
    console.log(`  text    : ${h.text}`);
    console.log(`  source  : ${h.source} — ${h.sourceUrl}`);
    console.log(`  guard10 : ${h.circular}`);
    if (h.holdKey) console.log(`  KEY HELD: ${h.holdKey.slice(0, 100)}…`);
    if (h.dependent) console.log(`  guard15 : ${h.dependent}`);
    if (h.heldPairs.length) console.log(`  held pairs: ${h.heldPairs.join(', ')}`);
    console.log(`  measures: ${h.numbers.join(', ')}`);
    console.log('');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
