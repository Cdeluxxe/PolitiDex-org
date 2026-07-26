#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Voting Record coverage report (internal)
// ---------------------------------------------------------------------------
// The issue ranking can only judge a person on an issue when THREE things line
// up at once:
//
//   1. a roll call we hold a member vote for,
//   2. a curated measure→issue mapping on the measure that roll call belongs to,
//   3. a stated position (ISSUE_STANCE_DATA) for that person under the SAME
//      issue key — the stance engine matches keys exactly, never by category.
//
// Ahead of all three sits identity: the roll-call feeds carry no measure title, so a
// measure first seen through a vote lands as "Roll call N" and cannot be mapped by
// anyone, because nobody can say what it is. Gap 0 counts those separately.
//
// Wherever one of the three is missing the vote is real but unusable: it can be
// shown as a receipt, but nobody can be ranked on it. This script measures that
// gap so a mapping/stance pass can be aimed at the inputs that unlock the most
// member-votes rather than at whatever happens to be nearby.
//
//   node scripts/vr-coverage-report.mjs                 # print to stdout
//   node scripts/vr-coverage-report.mjs --write         # also write the snapshot
//
// It is READ-ONLY against the database (plain SELECTs) and read-only against
// the stance files, so it is safe to run at any time. The committed snapshot at
// db/vr-coverage-report.md is the state as of the last --write; regenerate it
// after any mapping or stance pass to see what the next-best opportunity is.
//
// Requires NETLIFY_DB_URL. Nothing here invents a mapping or a position — it
// only counts what is missing and ranks the gaps by how many member-votes each
// one would make judgeable.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const OUT_PATH = path.join(ROOT, 'db', 'vr-coverage-report.md');

// ── Stated positions ────────────────────────────────────────────────────────
// The stance files are plain `window.ISSUE_STANCE_DATA` assignments, so they load
// in a bare VM context with a stub window. Every wave file is optional.
function loadStances() {
  const files = ['politician-stances.js', 'state-senate-stances.js'];
  for (let i = 2; i <= 16; i++) files.push(`state-senate-stances-w${i}.js`);
  const win = {};
  const sandbox = { window: win, document: { addEventListener() {}, readyState: 'complete' }, console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.error(`  ! ${f} failed to load: ${e.message}`); }
  }
  const data = win.ISSUE_STANCE_DATA || {};
  const byPid = new Map();
  for (const [pid, arr] of Object.entries(data)) {
    const keys = new Set();
    (arr || []).forEach(e => { if (e && e.issueKey && (e.issueStance || e.pos)) keys.add(e.issueKey); });
    byPid.set(pid, keys);
  }
  return byPid;
}

const num = n => n.toLocaleString('en-US');

// A measure whose title is still the placeholder the vote feed invented ("Roll call
// 310", or the bare citation) cannot responsibly be mapped: nobody can judge what a
// bill means for an issue without knowing which bill it is. Those rows are a DIFFERENT
// kind of gap from an ordinary unmapped measure — they need an identity backfill first
// — so they are flagged rather than listed alongside genuine mapping opportunities.
function isPlaceholderTitle(title, number) {
  const t = String(title || '').trim();
  if (!t) return true;
  if (/^roll ?call\b/i.test(t)) return true;
  return !!number && t === String(number).trim();
}

// Curated identities (db/vr-measure-identity.json) are applied to the database by a
// migration and re-applied on every ingest, but a snapshot taken between committing
// that file and its deploy would still read the old placeholders and under-report what
// is mappable. So the seed is overlaid here, exactly as the ingest would apply it —
// only over a title that is still a placeholder — and the affected rows are marked
// `pending` so nobody mistakes a not-yet-deployed title for one already live.
function loadIdentitySeed() {
  const p = path.join(ROOT, 'db', 'vr-measure-identity.json');
  if (!fs.existsSync(p)) return new Map();
  const key = (congress, number) => `${congress}|${String(number || '').toLowerCase().replace(/[.\s]/g, '')}`;
  const out = new Map();
  try {
    for (const e of (JSON.parse(fs.readFileSync(p, 'utf8')).measures || [])) {
      if (e && e.number && e.title) out.set(key(e.congress, e.number), e.title);
    }
  } catch (e) { console.error(`  ! vr-measure-identity.json failed to load: ${e.message}`); }
  out.lookup = m => out.get(key(m.congress, m.number)) || null;
  return out;
}

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const stances = loadStances();
  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Only yea/nay counts as a position taken. Present and not-voting are real
  // records but carry no direction, so they can never produce a verdict.
  const votes = (await client.query(`
    SELECT v.politician_id AS pid, r.measure_id AS mid
      FROM vr_member_votes v
      JOIN vr_rollcalls r ON r.id = v.rollcall_id
     WHERE v.position IN ('yea','nay')`)).rows;

  const measures = (await client.query(`
    SELECT m.id, m.number, m.congress, m.chamber, m.title,
           (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id)::int AS rollcalls
      FROM vr_measures m`)).rows;
  const measureById = new Map(measures.map(m => [m.id, m]));

  // Overlay the committed identity seed over any still-placeholder title.
  const identitySeed = loadIdentitySeed();
  for (const m of measures) {
    if (!isPlaceholderTitle(m.title, m.number)) continue;
    const resolved = identitySeed.lookup(m);
    if (!resolved) continue;
    m.placeholderTitle = m.title;
    m.title = resolved;
    m.titlePending = true;
  }

  const mapping = new Map(); // measureId → Set(issueKey)
  for (const r of (await client.query('SELECT measure_id, issue_key FROM vr_measure_issues')).rows) {
    if (!mapping.has(r.measure_id)) mapping.set(r.measure_id, new Set());
    mapping.get(r.measure_id).add(r.issue_key);
  }
  await client.end();

  const mvByMeasure = new Map();
  for (const v of votes) mvByMeasure.set(v.mid, (mvByMeasure.get(v.mid) || 0) + 1);

  // ── Gap 1: measures carrying votes with no issue mapping at all ───────────
  const unmapped = [...mvByMeasure.entries()]
    .filter(([mid]) => !mapping.has(mid) || mapping.get(mid).size === 0)
    .map(([mid, mv]) => ({ mv, m: measureById.get(mid) || { id: mid, number: '(unknown)', title: '' } }))
    .sort((a, b) => b.mv - a.mv);

  // ── Gap 1b: mapped, but thinly — a single non-primary key is weak evidence ─
  const weak = [...mvByMeasure.entries()]
    .filter(([mid]) => mapping.has(mid) && mapping.get(mid).size === 1)
    .map(([mid, mv]) => ({ mv, m: measureById.get(mid), keys: [...mapping.get(mid)] }))
    .sort((a, b) => b.mv - a.mv);

  // ── Gap 2: (member, issue) pairs with votes but no stated position ────────
  // This is the pair the engine actually keys on. A member with 40 votes across
  // an issue and no stance on that exact key is one sourced sentence away from
  // being rankable.
  const pairVotes = new Map();   // pid|issueKey → member-votes
  const usablePairs = new Set();
  let usableVotes = 0;
  for (const v of votes) {
    const keys = mapping.get(v.mid);
    if (!keys) continue;
    const held = stances.get(v.pid);
    for (const k of keys) {
      const id = v.pid + '|' + k;
      pairVotes.set(id, (pairVotes.get(id) || 0) + 1);
      if (held && held.has(k)) { usableVotes++; usablePairs.add(id); }
    }
  }
  const missingStance = [...pairVotes.entries()]
    .filter(([id]) => !usablePairs.has(id))
    .map(([id, mv]) => { const [pid, key] = id.split('|'); return { pid, key, mv, known: stances.has(pid) }; })
    .sort((a, b) => b.mv - a.mv);

  // Rolled up by issue, this says which key is worth a stance pass at all.
  const byIssue = new Map();
  for (const r of missingStance) {
    const cur = byIssue.get(r.key) || { mv: 0, people: new Set() };
    cur.mv += r.mv; cur.people.add(r.pid);
    byIssue.set(r.key, cur);
  }
  const issueRank = [...byIssue.entries()]
    .map(([key, v]) => ({ key, mv: v.mv, people: v.people.size }))
    .sort((a, b) => b.mv - a.mv);

  const totalMv = votes.length;
  const mappedMv = votes.filter(v => mapping.has(v.mid)).length;

  // ── Identity: measures that cannot be mapped until they are named ─────────
  const placeholders = [...mvByMeasure.entries()]
    .map(([mid, mv]) => ({ mv, m: measureById.get(mid) || { id: mid, number: null, title: '' } }))
    .filter(r => isPlaceholderTitle(r.m.title, r.m.number))
    .sort((a, b) => b.mv - a.mv);
  const placeholderMv = placeholders.reduce((a, b) => a + b.mv, 0);
  const namedUnmapped = unmapped.filter(r => !isPlaceholderTitle(r.m.title, r.m.number));
  const pendingRows = [...mvByMeasure.entries()]
    .map(([mid, mv]) => ({ mv, m: measureById.get(mid) || {} }))
    .filter(r => r.m.titlePending);
  const pendingMv = pendingRows.reduce((a, b) => a + b.mv, 0);

  const L = [];
  const p = s => L.push(s);
  p('# Voting-record coverage report');
  p('');
  p('Generated by `scripts/vr-coverage-report.mjs`. Read-only; regenerate with `--write`.');
  p('');
  p('Mappings are read from the live database and stated positions from the stance');
  p('files in this checkout, so a snapshot taken before a pending migration deploys');
  p('will still show the measures that migration maps as gaps. Measure titles are the');
  p('exception: a title curated in `db/vr-measure-identity.json` is shown even when the');
  p('live row still holds a placeholder, marked `pending` until the migration deploys.');
  p('');
  p('## Where the ranking stands');
  p('');
  p('| | member-votes |');
  p('|---|---|');
  p(`| Recorded yea/nay votes | ${num(totalMv)} |`);
  p(`| …on a measure with at least one issue mapping | ${num(mappedMv)} |`);
  p(`| …**and** the member holds a stated position on that key (rankable) | ${num(usableVotes)} |`);
  p(`| Blocked earlier than that — the measure has no real title yet | ${num(placeholderMv)} |`);
  p(`| …title resolved in \`db/vr-measure-identity.json\`, awaiting deploy | ${num(pendingMv)} |`);
  p('');
  p(`Rankable (member, issue) pairs: **${num(usablePairs.size)}**. `
    + `People with at least one rankable record: **${num(new Set([...usablePairs].map(s => s.split('|')[0])).size)}**.`);
  p('');
  p('## Gap 0 — measures still carrying a placeholder title');
  p('');
  p('A measure the vote feed could only label "Roll call N" (or by its bare citation)');
  p('is not a mapping opportunity yet, it is an *identity* gap: which issues a bill');
  p('speaks to cannot be judged before anyone knows which bill it is. These are counted');
  p('separately from Gap 1 so an identity backfill is never mistaken for mapping work.');
  p('');
  if (pendingRows.length) {
    p(`${pendingRows.length} measure(s) carrying ${num(pendingMv)} member-votes have an identity in`);
    p('`db/vr-measure-identity.json` and appear below under their real titles, marked');
    p('`pending` where the live row has not been updated yet.');
    p('');
  }
  if (!placeholders.length) {
    p('No measure carrying a vote is left without a title.');
  } else {
    p(`${placeholders.length} measure(s), ${num(placeholderMv)} member-votes blocked on identity.`);
    p('');
    p('| member-votes | measure | placeholder title |');
    p('|---:|---|---|');
    for (const r of placeholders.slice(0, 40)) {
      p(`| ${r.mv} | ${r.m.number || '(no number)'} | ${(r.m.title || '(none)').replace(/\|/g, '\\|').slice(0, 60)} |`);
    }
    if (placeholders.length > 40) p(`| … | _${placeholders.length - 40} more_ | |`);
  }
  p('');
  p('## Gap 1 — measures with votes and no issue mapping');
  p('');
  p(`${unmapped.length} measure(s), ${num(unmapped.reduce((a, b) => a + b.mv, 0))} member-votes at stake.`);
  if (namedUnmapped.length !== unmapped.length) {
    p('');
    p(`Of those, ${namedUnmapped.length} measure(s) / ${num(namedUnmapped.reduce((a, b) => a + b.mv, 0))} member-votes `
      + 'are named and mappable today. Rows marked `identity?` are the Gap 0 measures');
    p('above — resolve the title before attempting a mapping.');
  }
  p('');
  p('| member-votes | measure | title | |');
  p('|---:|---|---|---|');
  for (const r of unmapped.slice(0, 60)) {
    const flag = isPlaceholderTitle(r.m.title, r.m.number) ? '`identity?`' : (r.m.titlePending ? '`pending`' : '');
    p(`| ${r.mv} | ${r.m.number || '(no number)'} | ${(r.m.title || '').replace(/\|/g, '\\|').slice(0, 90)} | ${flag} |`);
  }
  if (unmapped.length > 60) p(`| … | _${unmapped.length - 60} more_ | | |`);
  p('');
  p('## Gap 1b — measures mapped to exactly one issue');
  p('');
  p('Not necessarily wrong: a single-issue bill should have a single key. Listed so a');
  p('second, genuinely-supported key is not overlooked on a high-traffic measure.');
  p('');
  p('| member-votes | measure | key |');
  p('|---:|---|---|');
  for (const r of weak.slice(0, 25)) p(`| ${r.mv} | ${r.m.number || '(no number)'} | ${r.keys[0]} |`);
  if (weak.length > 25) p(`| … | _${weak.length - 25} more_ | |`);
  p('');
  p('## Gap 2 — members with votes on an issue but no stated position');
  p('');
  p(`${num(missingStance.length)} (member, issue) pairs, ${num(missingStance.reduce((a, b) => a + b.mv, 0))} member-votes.`);
  p('Each row is one sourced position away from being judgeable — but only where a');
  p('real, verifiable position exists. Do not fill these in by inference.');
  p('');
  p('| member-votes | member | issue key | profile exists |');
  p('|---:|---|---|---|');
  for (const r of missingStance.slice(0, 60)) p(`| ${r.mv} | ${r.pid} | ${r.key} | ${r.known ? 'yes' : 'no'} |`);
  if (missingStance.length > 60) p(`| … | _${num(missingStance.length - 60)} more_ | | |`);
  p('');
  p('## Gap 2 rolled up by issue');
  p('');
  p('| member-votes | issue key | members missing a position |');
  p('|---:|---|---:|');
  for (const r of issueRank.slice(0, 30)) p(`| ${num(r.mv)} | ${r.key} | ${r.people} |`);
  p('');

  const text = L.join('\n');
  console.log(text);
  if (WRITE) {
    fs.writeFileSync(OUT_PATH, text + '\n');
    console.error(`\nwrote ${path.relative(ROOT, OUT_PATH)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
