#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-dark-pairs-aug2026.mjs — where is the held vote record already paid
// for, and dark only because nobody has filed the stated position?
// ─────────────────────────────────────────────────────────────────────────────
// The engine needs three things lined up on the same issue key before a member's
// row can be judged, published or shared:
//
//   1. a recorded yea/nay on a measure,
//   2. a curated issue mapping on that measure,
//   3. a STATED POSITION held by that member on the same key.
//
// Ingest has bought (1) and (2) in bulk. (3) is hand-curated, and it is where the
// record goes dark. Its sibling audit — vr-audit-circular-stances-aug2026.mjs —
// covers the pairs that HAVE a stance whose wording makes the card circular. This
// one covers the larger and quieter reservoir: pairs with real vote weight and no
// stance row on the key at all. Those pairs are not "blocked"; they are invisible.
// They never enter the rankable set, so they never appear in a block count.
//
// Read-only. Prints a leverage-ranked work list.
//
//   node scripts/vr-audit-dark-pairs-aug2026.mjs
//   node scripts/vr-audit-dark-pairs-aug2026.mjs --json
//   node scripts/vr-audit-dark-pairs-aug2026.mjs --top 40
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
const TOP = (() => {
  const i = process.argv.indexOf('--top');
  return i > -1 ? Number(process.argv[i + 1]) || 30 : 30;
})();

// ── The live guards, from the file that ships them ───────────────────────────
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
  return ctx.window.PDXReceiptCards;
}

// ── Stance rows, by (pid, issueKey) ──────────────────────────────────────────
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
  const byPair = new Map();
  const byPid = new Map();
  for (const [pid, arr] of Object.entries(data)) {
    byPid.set(pid, (arr || []).length);
    for (const e of (arr || [])) {
      if (!e || !e.issueKey || !(e.issueStance || e.pos)) continue;
      const id = pid + '|' + e.issueKey;
      if (!byPair.has(id)) byPair.set(id, { pid, ...e });
    }
  }
  return { byPair, byPid };
}

// ── Profiles, so a pair can be told apart from a pair that could never print ──
function loadProfiles() {
  const win = {};
  const sandbox = {
    window: win,
    document: { addEventListener() {}, readyState: 'complete' },
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'cmp-data.js'), 'utf8'), ctx,
    { filename: 'cmp-data.js' });
  return win.CMP_DATA || {};
}

// Core national issues get ranked ahead of the long tail at equal weight. This is
// the priority rule's third clause, written down rather than eyeballed.
const CORE_ISSUES = new Set([
  'healthcare', 'lower_taxes', 'tax_middle_class', 'cut_spending', 'national_debt',
  'border_security', 'deportations', 'immigration_legal', 'gun_rights', 'gun_safety',
  'abortion_rights', 'abortion_limits', 'climate_action', 'energy_production',
  'social_security', 'medicare_protect', 'veterans', 'ukraine_aid', 'israel_support',
  'trade_tariffs', 'student_debt', 'edu_college_cost', 'minimum_wage', 'labor_unions',
  'voting_access', 'election_integrity', 'checks_balances', 'strong_defense',
  'family_support', 'housing_affordability', 'prescription_drug_costs',
]);

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const api = loadGuards();
  const G = api.guards;
  const { byPair: rows, byPid: stanceCount } = loadStanceRows();
  const profiles = loadProfiles();

  const client = new pg.Client({
    connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const votes = (await client.query(`
    SELECT v.politician_id AS pid, r.measure_id AS mid, m.number AS number
      FROM vr_member_votes v
      JOIN vr_rollcalls r ON r.id = v.rollcall_id
      JOIN vr_measures  m ON m.id = r.measure_id
     WHERE v.position IN ('yea','nay')`)).rows;
  const mapping = new Map();
  for (const r of (await client.query('SELECT measure_id, issue_key FROM vr_measure_issues')).rows) {
    if (!mapping.has(r.measure_id)) mapping.set(r.measure_id, new Set());
    mapping.get(r.measure_id).add(r.issue_key);
  }
  await client.end();

  // Every (member, issue) the record can already speak to, whether or not a
  // position has been filed against it.
  const all = new Map();
  for (const v of votes) {
    const keys = mapping.get(v.mid);
    if (!keys) continue;
    for (const k of keys) {
      const id = v.pid + '|' + k;
      let p = all.get(id);
      if (!p) all.set(id, (p = { pid: v.pid, issueKey: k, judged: 0, numbers: new Set() }));
      p.judged++;
      if (v.number) p.numbers.add(String(v.number));
    }
  }

  const rankable = [], dark = [];
  for (const p of all.values()) {
    (rows.has(p.pid + '|' + p.issueKey) ? rankable : dark).push(p);
  }

  // Classify the dark ones. A pair is only WORTH filing a position on if the
  // other guards would let the finished card through; anything the engine holds
  // for its own reasons is reported, not queued.
  const work = [];
  for (const p of dark) {
    const prof = profiles[p.pid];
    const numbers = [...p.numbers].sort();
    const holdKey = G.wave1Hold(p.issueKey);
    const heldPairs = numbers.filter(n => G.wave1HoldPairs[n + ' :: ' + p.issueKey]);
    const allHeld = numbers.length > 0 && heldPairs.length === numbers.length;
    const reasons = [];
    if (!prof) reasons.push('no profile — the card could not print a name or office');
    else {
      if (!prof.office && !(prof.currentOffice)) reasons.push('profile has no office');
      if (!prof.party) reasons.push('profile has no party');
    }
    if (holdKey) reasons.push('issue key is held: ' + holdKey.slice(0, 70));
    if (allHeld) reasons.push('every measure behind this pair is held against this key');
    work.push({
      pid: p.pid,
      name: (prof && (prof.name || prof.fullName)) || '',
      issueKey: p.issueKey,
      judged: p.judged,
      numbers,
      measures: numbers.length,
      core: CORE_ISSUES.has(p.issueKey),
      stanceRowsOnFile: stanceCount.get(p.pid) || 0,
      thin: p.judged < api.PUBLIC_MIN_JUDGED,
      heldPairs,
      blocked: reasons,
      // Leverage: vote weight already held, core issues first, and only where the
      // other guards would not refuse the finished card anyway.
      actionable: reasons.length === 0 && p.judged >= api.PUBLIC_MIN_JUDGED,
    });
  }
  work.sort((a, b) =>
    (b.actionable - a.actionable) ||
    (b.core - a.core) ||
    (b.judged - a.judged) ||
    a.pid.localeCompare(b.pid) || a.issueKey.localeCompare(b.issueKey));

  const actionable = work.filter(w => w.actionable);
  const out = {
    votes: votes.length,
    mappedMeasures: mapping.size,
    pairsWithVotes: all.size,
    rankable: rankable.length,
    dark: dark.length,
    darkActionable: actionable.length,
    darkThin: work.filter(w => !w.actionable && w.thin && !w.blocked.length).length,
    darkBlocked: work.filter(w => w.blocked.length).length,
    darkCoreActionable: actionable.filter(w => w.core).length,
    membersWithDarkWeight: new Set(actionable.map(w => w.pid)).size,
    work,
  };

  if (JSON_OUT) { console.log(JSON.stringify(out, null, 2)); return; }

  console.log('── Held votes with no stated position on the same key ────────────────');
  console.log(`member yea/nay votes ingested            : ${out.votes}`);
  console.log(`measures carrying an issue mapping       : ${out.mappedMeasures}`);
  console.log(`(member, issue) pairs the record touches : ${out.pairsWithVotes}`);
  console.log(`  rankable today (stance on file)        : ${out.rankable}`);
  console.log(`  DARK (no stance row on the key)        : ${out.dark}`);
  console.log(`    actionable (≥${api.PUBLIC_MIN_JUDGED} judged, no other guard) : ${out.darkActionable}`);
  console.log(`      of those, on a core national issue : ${out.darkCoreActionable}`);
  console.log(`    thin (1 judged vote only)            : ${out.darkThin}`);
  console.log(`    held by another guard                : ${out.darkBlocked}`);
  console.log(`  distinct members holding dark weight   : ${out.membersWithDarkWeight}`);
  console.log('');
  console.log(`── Top ${TOP} by leverage ─────────────────────────────────────────────`);
  for (const w of work.slice(0, TOP)) {
    console.log(`${w.judged.toString().padStart(3)} judged · ${w.pid} (${w.name}) · ${w.issueKey}` +
      `${w.core ? ' [core]' : ''}${w.actionable ? '' : '  ✗ ' + (w.blocked[0] || 'thin')}`);
    console.log(`      measures: ${w.numbers.join(', ')}   · ${w.stanceRowsOnFile} stance rows on file for this member`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
