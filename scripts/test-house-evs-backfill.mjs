#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — House EVS attribution backfill discipline
// ---------------------------------------------------------------------------
// db/vr-house-evs-backfill-seed.json and the migration generated from it fill MISSING
// member × roll-call cells on roll calls the database already holds. A densification
// pass is the easiest place in this codebase to do quiet damage: it touches thousands
// of rows at once, every row is boring on its own, and the reader-facing effect —
// a member's record suddenly having a shape — is exactly what a fabricated cell would
// also produce. So the rules it has to obey are checked mechanically here rather than
// by reading 9,000 lines of generated SQL.
//
//   * It ADDS, and only adds. No measure, roll call, issue mapping, stated position or
//     profile is created; the only table written is vr_member_votes, every insert is
//     ON CONFLICT DO NOTHING, and there is no UPDATE, DELETE or DO UPDATE anywhere in
//     the file. That last one is what makes the 17 contradicted stored cells safe: the
//     migration physically cannot overwrite a stored vote, so a disagreement between
//     our record and the Clerk's stays visible instead of being laundered away.
//   * Attribution is fail-closed. Every cell names a Bioguide, that Bioguide resolves
//     through db/vr-member-map.json to the slug the seed cached, and that slug is
//     admitted in db/vr-roster-admitted.json. A guessed member scores the wrong person
//     forever, so nothing resolves by name, party or proximity.
//   * The seed and the SQL tell the same story. The generator is re-run here and its
//     output compared byte-for-byte with the committed migration, so the file cannot
//     drift from the seed it cites as its source.
//   * Every contradicted cell is absent from the insert set. A cell we already store is
//     never in the fillable set by construction; this asserts it, because "we only fill
//     gaps" is the whole basis for claiming the pass cannot rewrite history.
//   * Slice 1's thresholds are untouched. The point of the backfill is to earn the
//     record-direction index with more record, not to lower the bar until sparse
//     profiles clear it, so the five constants are pinned to their shipped values.
//
// Read-only. No database, no network.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

const SEED_REL = 'db/vr-house-evs-backfill-seed.json';
const MIG_REL = 'netlify/database/migrations/20260907000000_vr_house_evs_attribution_backfill.sql';
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_REL), 'utf8'));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-member-map.json'), 'utf8'));
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-roster-admitted.json'), 'utf8'));
const sql = fs.readFileSync(path.join(ROOT, MIG_REL), 'utf8');

const BIO_TO_SLUG = memberMap.map || {};
const ADMITTED = new Set(
  Object.entries(roster.waves || {})
    .filter(([, v]) => Array.isArray(v))
    .flatMap(([, v]) => v)
);

// ── 1. seed shape ────────────────────────────────────────────────────────────
// The header counts are what the migration prints and what the write-up quotes, so
// they are derived facts, not annotations someone remembered to update.
const allCells = seed.votes.flatMap(v => v.memberVotes.map(r => ({ v, r })));
const slugSet = new Set(allCells.map(c => c.r.politicianId));
ok(String(seed.chamber).toLowerCase() === 'house', 'seed is not marked as House');
ok(Array.isArray(seed.votes) && seed.votes.length > 0, 'seed carries no roll calls');
ok(seed.rollCalls === seed.votes.length, `seed.rollCalls ${seed.rollCalls} ≠ ${seed.votes.length} roll calls present`);
ok(seed.cells === allCells.length, `seed.cells ${seed.cells} ≠ ${allCells.length} member votes present`);
ok(seed.members === slugSet.size, `seed.members ${seed.members} ≠ ${slugSet.size} distinct slugs present`);
ok(/clerk\.house\.gov/.test(String(seed.source || '')), 'seed does not cite the Clerk as its source');

// ── 2. every cell is fail-closed attribution ─────────────────────────────────
const badBio = [];
const staleP = [];
const unadmitted = new Set();
const POSITIONS = new Set(['yea', 'nay', 'present', 'not_voting']);
const PARTYREL = new Set(['with_party', 'against_party']);
const badPos = [];
const badParty = [];
for (const { v, r } of allCells) {
  const where = `${v.congress}/${v.session} roll ${v.rollNumber}`;
  if (!/^[A-Z]\d{6}$/.test(String(r.bioguideId || ''))) badBio.push(`${where} ${r.politicianId}`);
  else if (BIO_TO_SLUG[r.bioguideId] !== r.politicianId) {
    staleP.push(`${where} ${r.bioguideId} → map says '${BIO_TO_SLUG[r.bioguideId] || '(unmapped)'}', seed cached '${r.politicianId}'`);
  }
  if (!ADMITTED.has(r.politicianId)) unadmitted.add(r.politicianId);
  if (!POSITIONS.has(r.position)) badPos.push(`${where} ${r.politicianId} position '${r.position}'`);
  if (r.isParty != null && !PARTYREL.has(r.isParty)) badParty.push(`${where} ${r.politicianId} is_party '${r.isParty}'`);
  // A member who did not cast a recorded vote has no side to stand with or against.
  if ((r.position === 'present' || r.position === 'not_voting') && r.isParty != null) {
    badParty.push(`${where} ${r.politicianId} is '${r.position}' yet carries is_party '${r.isParty}'`);
  }
}
ok(!badBio.length, `cell(s) with no usable bioguideId: ${badBio.slice(0, 4).join('; ')}`);
ok(!staleP.length, `seed pid disagrees with db/vr-member-map.json: ${staleP.slice(0, 4).join('; ')}`);
ok(!unadmitted.size, `slug(s) not admitted in db/vr-roster-admitted.json: ${[...unadmitted].slice(0, 6).join(', ')}`);
ok(!badPos.length, `position outside the stored vocabulary: ${badPos.slice(0, 4).join('; ')}`);
ok(!badParty.length, `is_party outside the stored vocabulary: ${badParty.slice(0, 4).join('; ')}`);

// The roster file's own count must match what it lists, or the ceiling stops being
// readable as a ceiling.
const rosterListed = Object.entries(roster.waves || {})
  .filter(([, v]) => Array.isArray(v))
  .reduce((a, [, v]) => a + v.length, 0);
ok(roster.count === rosterListed, `db/vr-roster-admitted.json count ${roster.count} ≠ ${rosterListed} slugs listed`);
ok(new Set(Object.entries(roster.waves || {}).filter(([, v]) => Array.isArray(v)).flatMap(([, v]) => v)).size === rosterListed,
  'a slug is listed in two roster waves — the wave is how it got here, so it can only be in one');

// ── 3. one cell per member per roll, one roll per natural key ────────────────
const dupCells = [];
const rollKeys = new Set();
const dupRolls = [];
for (const v of seed.votes) {
  const key = `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
  if (rollKeys.has(key)) dupRolls.push(key); else rollKeys.add(key);
  const seen = new Set();
  for (const r of v.memberVotes) {
    if (seen.has(r.politicianId)) dupCells.push(`${key} ${r.politicianId}`);
    seen.add(r.politicianId);
  }
  ok(Array.isArray(v.issueKeys) && v.issueKeys.length > 0,
    `${key} carries no issue keys — this pass only touches measures that are already mapped`);
  ok(/^https:\/\/clerk\.house\.gov\/evs\//.test(String(v.sourceUrl || '')), `${key} does not cite a Clerk EVS document`);
  ok(Number.isInteger(v.heldBefore) && v.heldBefore >= 0, `${key} does not record how many cells were already stored`);
}
ok(!dupRolls.length, `roll call appears twice in the seed: ${dupRolls.slice(0, 3).join('; ')}`);
ok(!dupCells.length, `member appears twice on one roll: ${dupCells.slice(0, 3).join('; ')}`);

// ── 4. the contradicted cells are not in the insert set ─────────────────────
// Each of these is a cell we ALREADY store whose stored position disagrees with the
// Clerk. It is not fillable — something is there — and this pass has no opinion about
// which one is right. Assert it is absent rather than trusting that.
const byRoll = new Map(seed.votes.map(v => [`${v.voteDate.slice(0, 4)}|${v.rollNumber}`, v]));
const leaked = [];
for (const d of seed.discrepancies?.rows || []) {
  const v = byRoll.get(`${d.year}|${d.roll}`);
  if (v && v.memberVotes.some(r => r.politicianId === d.slug)) leaked.push(`${d.year} roll ${d.roll} ${d.slug}`);
}
ok(!leaked.length, `contradicted stored cell(s) present in the insert set: ${leaked.join('; ')}`);
ok((seed.storedCellsConfirmed || 0) > allCells.length / 2,
  'the seed does not record a stored-cell cross-check — the fill is unverified against what we already hold');

// ── 5. the SQL says exactly what the seed says ───────────────────────────────
const regenerated = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'vr-gen-house-backfill-migration.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
ok(regenerated === sql, 'the committed migration is not what the generator produces from the seed — regenerate it');

// Parsed independently of the generator, so a bug shared by both would still show up.
const tuples = [...sql.matchAll(/^\s{4}\(rc, '([^']+)', '([^']+)', (?:'([^']+)'|NULL)\)[,;]?$/gm)];
ok(tuples.length === allCells.length, `SQL holds ${tuples.length} cells, seed holds ${allCells.length}`);
const sqlPositions = new Set(tuples.map(m => m[2]));
ok([...sqlPositions].every(p => POSITIONS.has(p)), `SQL position outside the vocabulary: ${[...sqlPositions].join(', ')}`);
const sqlSlugs = new Set(tuples.map(m => m[1]));
ok([...sqlSlugs].every(s => ADMITTED.has(s)), 'SQL writes a slug the roster does not admit');

// ── 6. additive, and additive only ──────────────────────────────────────────
// The header is prose ABOUT the guarantees below, and it names them, so read the
// statements alone — otherwise a comment that says "DO NOTHING" would count as one.
const stmts = sql.replace(/^--.*$/gm, '');
const inserts = [...stmts.matchAll(/INSERT\s+INTO\s+(\w+)/gi)].map(m => m[1].toLowerCase());
ok(inserts.length > 0, 'migration inserts nothing');
ok(inserts.every(t => t === 'vr_member_votes'), `migration writes a table other than vr_member_votes: ${[...new Set(inserts)].join(', ')}`);
const conflicts = [...stmts.matchAll(/ON\s+CONFLICT[^;]*?DO\s+NOTHING/gi)];
ok(conflicts.length === inserts.length,
  `${inserts.length} INSERT(s) but ${conflicts.length} ON CONFLICT DO NOTHING — every insert must be unable to overwrite a stored cell`);
ok(!/\bDO\s+UPDATE\b/i.test(stmts), 'migration contains ON CONFLICT DO UPDATE — it could overwrite a stored vote');
for (const verb of ['UPDATE', 'DELETE', 'TRUNCATE', 'DROP', 'ALTER', 'CREATE']) {
  ok(!new RegExp(`(^|\\s)${verb}\\s`, 'i').test(stmts),
    `migration contains ${verb} — this pass adds cells and does nothing else`);
}
// The tables a densification pass must not touch, named explicitly so a future edit
// that starts writing stances or mappings from vote data fails here first.
for (const t of ['vr_positions', 'vr_measure_issues', 'vr_measures', 'vr_rollcalls', 'vr_measure_actions']) {
  const writes = new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${t}\\b`, 'i');
  ok(!writes.test(stmts), `migration writes ${t} — no stance, mapping, measure or roll call is created by a backfill`);
}
ok(/SELECT id INTO rc FROM vr_rollcalls/.test(stmts), 'migration does not look its roll calls up by natural key');
ok((stmts.match(/RAISE EXCEPTION/g) || []).length === seed.votes.length,
  'not every roll call fails closed when it is missing from vr_rollcalls');

// ── 7. Slice 1 thresholds are untouched ─────────────────────────────────────
// More record is the only permitted way to clear the coverage floor.
const helpers = fs.readFileSync(path.join(ROOT, 'stance-helpers.js'), 'utf8');
for (const [name, want] of [
  ['_RD_MIN_JUDGED', '4'],
  ['_RD_DOMINANCE', '0.75'],
  ['_RD_THIN_MIN', '2'],
  ['_RD_MIN_PRIMARY', '1'],
  ['_RD_MEMBER_FLOOR', '12'],
]) {
  const m = helpers.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
  ok(m && m[1] === want, `${name} is ${m ? m[1] : '(absent)'}, expected ${want} — a backfill may not lower Slice 1's bar`);
}

if (fails.length) {
  console.error(`✗ House EVS backfill discipline: ${fails.length} failure(s)`);
  fails.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`✓ House EVS backfill discipline: all ${pass} assertions passed`);
