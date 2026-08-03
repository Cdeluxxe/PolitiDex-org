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

// Curated mappings (db/vr-issue-seed.json) reach the database the same way identities
// do — by migration, then re-applied on every ingest — so between committing a mapping
// pass and its deploy the live tables under-report what is mappable, and the pass that
// just ran would read as having changed nothing. The seed is overlaid here for the same
// reason the identity seed is, and the measures it covers are marked `pending` so a
// mapping that has not deployed yet is never mistaken for one already live.
function loadIssueSeed() {
  const p = path.join(ROOT, 'db', 'vr-issue-seed.json');
  if (!fs.existsSync(p)) return new Map();
  const key = (congress, number) => `${congress}|${String(number || '').toLowerCase().replace(/[.\s]/g, '')}`;
  const out = new Map();
  try {
    for (const e of (JSON.parse(fs.readFileSync(p, 'utf8')).measures || [])) {
      if (!e || !e.number || !Array.isArray(e.issues)) continue;
      const k = key(e.congress, e.number);
      if (!out.has(k)) out.set(k, new Set());
      for (const i of e.issues) if (i && i.issueKey) out.get(k).add(i.issueKey);
    }
  } catch (e) { console.error(`  ! vr-issue-seed.json failed to load: ${e.message}`); }
  out.lookup = m => out.get(key(m.congress, m.number)) || null;
  return out;
}

// Curated roll calls (`db/*-vote-seed.json`) reach the database the same way mappings
// and identities do — by migration — so an ingest pass that has landed in the repo but
// not yet deployed would read as having unlocked nothing at all, and the mapping pass it
// was built to activate would still look inert. The seeds are overlaid here for the same
// reason the other two are, and every vote they contribute is marked `pending` so votes
// that are not yet in the database are never counted as though they were.
//
// De-duplication is per (roll call, member), keyed the way vr_member_votes' own unique
// index is — NOT per roll call. Skipping a whole roll the moment it exists live was wrong
// in a way that hid an entire pass: a roster expansion re-attributes the SAME roll calls
// against more members, so every one of its rolls is already live and the 298 votes it
// unlocked read as zero. Matching the table's actual grain means a seed can add members to
// a deployed roll, and re-running after the deploy still stops double-counting on its own.
function loadVoteSeeds() {
  const dir = path.join(ROOT, 'db');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter(n => /-vote-seed\.json$/.test(n)).sort()) {
    try {
      for (const v of (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).votes || [])) {
        if (v && v.measure && Array.isArray(v.memberVotes)) out.push({ ...v, seedFile: f });
      }
    } catch (e) { console.error(`  ! ${f} failed to load: ${e.message}`); }
  }
  return out;
}

const rollKey = v => `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber ?? v.roll_number}`;
const measureKey = m => `${m.congress}|${m.chamber}|${String(m.number || '').toLowerCase().replace(/[.\s]/g, '')}`;

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
  // Keyed exactly like the vr_member_votes unique index, so a seed attribution already
  // ingested is recognised as live rather than added a second time — while an attribution
  // the seed holds and the database does not still counts as pending, even on a roll call
  // that deployed long ago.
  const liveRolls = new Set((await client.query(
    'SELECT chamber, congress, session, roll_number FROM vr_rollcalls')).rows.map(rollKey));
  const liveMv = new Set((await client.query(`
    SELECT r.chamber, r.congress, r.session, r.roll_number, v.politician_id
      FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id`))
    .rows.map(r => rollKey(r) + '|' + r.politician_id));
  await client.end();

  // Overlay the committed issue seed for keys the live table does not carry yet.
  const issueSeed = loadIssueSeed();
  for (const m of measures) {
    const seeded = issueSeed.lookup(m);
    if (!seeded) continue;
    const live = mapping.get(m.id) || new Set();
    const fresh = [...seeded].filter(k => !live.has(k));
    if (!fresh.length) continue;
    for (const k of fresh) live.add(k);
    mapping.set(m.id, live);
    m.mappingPending = fresh;
  }

  // Overlay the attributions the committed vote seeds hold and the database does not.
  // A seed measure that does not exist live yet is synthesized under a negative id so
  // its votes are counted somewhere, and given the seed's own mapping — the migration
  // creates the real row, and until it runs there is nothing live to attach them to.
  const measureByKey = new Map(measures.map(m => [measureKey(m), m]));
  const pendingVoteMv = new Map();   // measureId → pending member-votes
  let pendingRollCount = 0;          // roll calls not in the database at all
  let reattributedRollCount = 0;     // deployed roll calls the seed adds members to
  let synthId = -1;
  for (const v of loadVoteSeeds()) {
    const rk = rollKey(v);
    const fresh = v.memberVotes.filter(mv => !liveMv.has(rk + '|' + mv.politicianId));
    if (!fresh.length) continue;
    let m = measureByKey.get(measureKey(v.measure));
    if (!m) {
      m = { id: synthId--, number: v.measure.number, congress: v.measure.congress,
            chamber: v.measure.chamber, title: v.measure.title || v.measure.number,
            rollcalls: 0, measurePending: true };
      const seeded = issueSeed.lookup(m);
      if (seeded && seeded.size) { mapping.set(m.id, new Set(seeded)); m.mappingPending = [...seeded]; }
      measures.push(m);
      measureById.set(m.id, m);
      measureByKey.set(measureKey(m), m);
    }
    if (liveRolls.has(rk)) reattributedRollCount++; else pendingRollCount++;
    for (const mv of fresh) {
      if (mv.position !== 'yea' && mv.position !== 'nay') continue;
      votes.push({ pid: mv.politicianId, mid: m.id, pending: true });
      pendingVoteMv.set(m.id, (pendingVoteMv.get(m.id) || 0) + 1);
    }
  }
  const pendingVoteTotal = [...pendingVoteMv.values()].reduce((a, b) => a + b, 0);

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
  const usablePairsLive = new Set();   // pairs a deployed vote already supports
  let usableVotes = 0;
  let usableVotesPending = 0;
  for (const v of votes) {
    const keys = mapping.get(v.mid);
    if (!keys) continue;
    const held = stances.get(v.pid);
    for (const k of keys) {
      const id = v.pid + '|' + k;
      pairVotes.set(id, (pairVotes.get(id) || 0) + 1);
      if (held && held.has(k)) {
        usableVotes++; usablePairs.add(id);
        if (v.pending) usableVotesPending++; else usablePairsLive.add(id);
      }
    }
  }
  const pendingPairs = [...usablePairs].filter(id => !usablePairsLive.has(id));
  const peopleAll = new Set([...usablePairs].map(s => s.split('|')[0]));
  const peopleLive = new Set([...usablePairsLive].map(s => s.split('|')[0]));
  const pendingPeople = [...peopleAll].filter(p => !peopleLive.has(p));
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

  // Measures whose mapping is committed but not yet deployed, and the member-votes
  // riding on them. Counted separately so a pass that has just landed in the repo
  // is visible without being reported as already live.
  const pendingMapRows = [...mvByMeasure.entries()]
    .map(([mid, mv]) => ({ mv, m: measureById.get(mid) || {} }))
    .filter(r => Array.isArray(r.m.mappingPending) && r.m.mappingPending.length)
    .sort((a, b) => b.mv - a.mv);
  const pendingMapMv = pendingMapRows.reduce((a, b) => a + b.mv, 0);

  const L = [];
  const p = s => L.push(s);
  p('# Voting-record coverage report');
  p('');
  p('Generated by `scripts/vr-coverage-report.mjs`. Read-only; regenerate with `--write`.');
  p('');
  p('Stated positions come from the stance files in this checkout. Mappings and measure');
  p('titles come from the live database, overlaid with the curated seeds committed here');
  p('(`db/vr-issue-seed.json`, `db/vr-measure-identity.json`, `db/*-vote-seed.json`)');
  p('wherever the live row has not caught up — so a pass that has landed in the repo but');
  p('not yet deployed is counted, and every row it accounts for is marked `pending`.');

  p('');
  p('## Where the ranking stands');
  p('');
  p('| | member-votes |');
  p('|---|---|');
  p(`| Recorded yea/nay votes | ${num(totalMv)} |`);
  p(`| …of which the votes themselves are seeded but not yet deployed | ${num(pendingVoteTotal)} |`);
  p(`| …on a measure with at least one issue mapping | ${num(mappedMv)} |`);
  p(`| …of which the mapping is curated but not yet deployed | ${num(pendingMapMv)} |`);

  p(`| …**and** the member holds a stated position on that key (rankable) | ${num(usableVotes)} |`);
  p(`| …of which awaiting deploy | ${num(usableVotesPending)} |`);
  p(`| Blocked earlier than that — the measure has no real title yet | ${num(placeholderMv)} |`);
  p(`| …title resolved in \`db/vr-measure-identity.json\`, awaiting deploy | ${num(pendingMv)} |`);
  p('');
  p(`Rankable (member, issue) pairs: **${num(usablePairs.size)}**`
    + (pendingPairs.length ? ` (${num(pendingPairs.length)} awaiting deploy)` : '') + '. '
    + `People with at least one rankable record: **${num(peopleAll.size)}**`
    + (pendingPeople.length ? ` (${num(pendingPeople.length)} awaiting deploy)` : '') + '.');
  if (pendingRollCount || reattributedRollCount) {
    p('');
    const parts = [];
    if (pendingRollCount) parts.push(`${pendingRollCount} seeded roll call(s) not yet in the database`);
    if (reattributedRollCount) parts.push(`${reattributedRollCount} deployed roll call(s) the seed attributes to more members than the database holds`);
    p(`${parts.join(', and ')} carry ${num(pendingVoteTotal)} yea/nay member-votes`);
    p('that are committed in a vote seed and not live. They are counted above and listed');
    p('here so the difference between "ingested" and "deployed" stays visible.');
    p('');
    p('| pending member-votes | measure | title | mapped |');
    p('|---:|---|---|---|');
    for (const [mid, mv] of [...pendingVoteMv.entries()].sort((a, b) => b[1] - a[1])) {
      const m = measureById.get(mid) || {};
      const keys = mapping.get(mid);
      p(`| ${mv} | ${m.number || '(no number)'} | ${(m.title || '').replace(/\|/g, '\\|').slice(0, 60)} `
        + `| ${keys ? keys.size + ' key(s)' : '`no`'}${m.measurePending ? ' `new measure`' : ''} |`);
    }
  }
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
  if (pendingMapRows.length) {
    p('');
    p(`${pendingMapRows.length} measure(s) carrying ${num(pendingMapMv)} member-votes are not on this`);
    p('list: they are mapped in `db/vr-issue-seed.json` and awaiting deploy, so they are');
    p('counted as mapped above rather than as a gap here. Rows marked `new measure` are');
    p('created by the same migration that carries their votes, so they were never a gap.');
    p('');
    p('| member-votes | measure | keys awaiting deploy | |');
    p('|---:|---|---|---|');
    for (const r of pendingMapRows) {
      p(`| ${r.mv} | ${r.m.number || '(no number)'} | ${r.m.mappingPending.map(k => '`' + k + '`').join(', ')} `
        + `| ${r.m.measurePending ? '`new measure`' : ''} |`);
    }
  }

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
