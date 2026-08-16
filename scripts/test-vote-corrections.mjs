#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — stored vote correction discipline
// ---------------------------------------------------------------------------
// db/vr-vote-corrections-seed.json and the migration generated from it change stored
// votes. Nothing else in this tree does. The two backfill migrations were built so they
// COULD not — every insert ON CONFLICT DO NOTHING, no UPDATE anywhere — precisely so that
// a densification pass could never become a rewrite of history. This pass gives that
// power up deliberately, for eighteen named cells, so the checks have to be the ones
// that make giving it up safe:
//
//   * The corrected set IS the discovered set. Every row here matches, field for field,
//     a disagreement the Slice 2 verification recorded against an official document —
//     same chamber, same roll, same member, same stored value, same official value, same
//     citation. Nothing may be corrected that was not first found and reported, and
//     nothing that was found may be dropped without appearing in the refused list.
//   * Every correction actually corrects. Stored and official must differ, both must be
//     in the stored vocabulary, and is_party must travel with the position: NULL exactly
//     when the corrected position is not a recorded yea or nay.
//   * The SQL touches only those cells. It is parsed independently of the generator and
//     each UPDATE's roll call, member, new position and is_party are matched against the
//     seed row; the count must be exact; the only table named is vr_member_votes; and
//     there is no INSERT, DELETE or set-based update anywhere in the file.
//   * Every UPDATE is guarded by the old value. `AND position = '<the value examined>'`
//     is what makes the migration re-runnable and what stops it landing on a cell that
//     has moved since the verification.
//   * Slice 1's thresholds are untouched. A correction changes what the record says, not
//     the bar at which the record is allowed to say it.
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

const SEED_REL = 'db/vr-vote-corrections-seed.json';
const MIG_REL = 'netlify/database/migrations/20260909000000_vr_vote_corrections.sql';
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_REL), 'utf8'));
const sql = fs.readFileSync(path.join(ROOT, MIG_REL), 'utf8');
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-member-map.json'), 'utf8'));
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-roster-admitted.json'), 'utf8'));
const houseSeed = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-house-evs-backfill-seed.json'), 'utf8'));
const senateSeed = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-senate-lis-backfill-seed.json'), 'utf8'));

const BIO_TO_SLUG = memberMap.map || {};
const ADMITTED = new Set(
  Object.entries(roster.waves || {}).filter(([, v]) => Array.isArray(v)).flatMap(([, v]) => v)
);
const POSITIONS = new Set(['yea', 'nay', 'present', 'not_voting']);
const PARTYREL = new Set(['with_party', 'against_party']);
const rows = seed.corrections || [];

// ── 1. the corrected set is the discovered set ──────────────────────────────
// The discoveries, keyed the way each seed recorded them. House disagreements are filed
// by year and roll (that is how the Clerk files a roll call); Senate by congress,
// session and vote number.
const discovered = new Map();
houseSeed.discrepancies.rows.forEach((d) => discovered.set(`house|${d.year}|${d.roll}|${d.slug}`, { ...d, official: d.evs }));
senateSeed.discrepancies.rows.forEach((d) => discovered.set(`senate|${d.congress}|${d.session}|${d.roll}|${d.slug}`, { ...d, official: d.lis }));

ok(rows.length + seed.refusedCount === seed.reported,
  `${seed.reported} reported ≠ ${rows.length} corrected + ${seed.refusedCount} refused — a discovered disagreement was dropped without saying so`);
ok(seed.reported === discovered.size,
  `the seed reports ${seed.reported} disagreements but the two backfill seeds record ${discovered.size}`);
ok(rows.length === seed.corrected, `seed.corrected ${seed.corrected} ≠ ${rows.length} corrections present`);
ok(Array.isArray(seed.refused?.rows) && seed.refused.rows.length === seed.refusedCount,
  'the refused count and the refused list disagree — an uncorrected disagreement must still be named');
ok(/clerk\.house\.gov|senate\.gov/.test(String(seed.source || '')), 'the seed does not cite the official documents as its source');

const unmatched = [], drifted = [];
const matchedKeys = new Set();
for (const c of rows) {
  const key = c.chamber === 'house'
    ? `house|${String(c.voteDate).slice(0, 4)}|${c.rollNumber}|${c.politicianId}`
    : `senate|${c.congress}|${c.session}|${c.rollNumber}|${c.politicianId}`;
  const d = discovered.get(key);
  if (!d) { unmatched.push(key); continue; }
  matchedKeys.add(key);
  // Field for field. A correction whose "stored" value is not the value that was found
  // to disagree is correcting something nobody examined.
  if (d.db !== c.storedPosition) drifted.push(`${key}: discovery examined '${d.db}', correction claims '${c.storedPosition}'`);
  if (d.official !== c.officialPosition) drifted.push(`${key}: document said '${d.official}', correction writes '${c.officialPosition}'`);
  if (d.sourceUrl !== c.sourceUrl) drifted.push(`${key}: cites ${c.sourceUrl}, discovery cited ${d.sourceUrl}`);
}
ok(!unmatched.length, `correction(s) with no matching discovered disagreement: ${unmatched.slice(0, 4).join('; ')}`);
ok(!drifted.length, `correction(s) that do not match what was discovered: ${drifted.slice(0, 4).join('; ')}`);
// And the other direction: every discovery is either corrected or refused by name.
const refusedKeys = new Set((seed.refused?.rows || []).map((r) =>
  r.chamber === 'house' ? `house|${r.year}|${r.roll}|${r.slug}` : `senate|${r.congress}|${r.session}|${r.roll}|${r.slug}`));
const orphaned = [...discovered.keys()].filter((k) => !matchedKeys.has(k) && !refusedKeys.has(k));
ok(!orphaned.length, `discovered disagreement(s) neither corrected nor refused: ${orphaned.slice(0, 4).join('; ')}`);
ok((seed.refused?.rows || []).every((r) => r.why), 'a refused row carries no reason');

// ── 2. every correction actually corrects, and corrects cleanly ─────────────
const bad = [];
const seenCells = new Set();
for (const c of rows) {
  const where = `${c.chamber} ${c.congress}/${c.session} roll ${c.rollNumber} ${c.politicianId}`;
  if (c.storedPosition === c.officialPosition) bad.push(`${where}: stored and official are the same value`);
  if (!POSITIONS.has(c.storedPosition)) bad.push(`${where}: stored '${c.storedPosition}' is outside the vocabulary`);
  if (!POSITIONS.has(c.officialPosition)) bad.push(`${where}: official '${c.officialPosition}' is outside the vocabulary`);
  // A member who did not cast a recorded vote has no side to be with or against, so a
  // stale is_party must not survive the correction.
  const recorded = c.officialPosition === 'yea' || c.officialPosition === 'nay';
  if (!recorded && c.officialIsParty != null) bad.push(`${where}: corrected to '${c.officialPosition}' yet keeps is_party '${c.officialIsParty}'`);
  if (recorded && !PARTYREL.has(c.officialIsParty)) bad.push(`${where}: corrected to a recorded vote with is_party '${c.officialIsParty}'`);
  if (!/^[A-Z]\d{6}$/.test(String(c.bioguideId || ''))) bad.push(`${where}: no usable bioguideId`);
  else if (BIO_TO_SLUG[c.bioguideId] !== c.politicianId) {
    bad.push(`${where}: map says ${c.bioguideId} is '${BIO_TO_SLUG[c.bioguideId] || '(unmapped)'}'`);
  }
  if (!ADMITTED.has(c.politicianId)) bad.push(`${where}: not admitted in db/vr-roster-admitted.json`);
  if (c.chamber === 'senate' && !/^S\d+$/.test(String(c.lisMemberId || ''))) bad.push(`${where}: Senate correction with no LIS member id`);
  const cell = `${c.chamber}|${c.congress}|${c.session}|${c.rollNumber}|${c.politicianId}`;
  if (seenCells.has(cell)) bad.push(`${where}: corrected twice`);
  seenCells.add(cell);
  const cite = c.chamber === 'house'
    ? /^https:\/\/clerk\.house\.gov\/evs\//.test(String(c.sourceUrl || ''))
    : /^https:\/\/www\.senate\.gov\/legislative\/LIS\/roll_call_votes\//.test(String(c.sourceUrl || ''));
  if (!cite) bad.push(`${where}: does not cite the chamber's own document`);
}
ok(!bad.length, `${bad.length} correction(s) fail their own rules: ${bad.slice(0, 4).join('; ')}`);

// ── 3. the SQL says exactly what the seed says ──────────────────────────────
const regenerated = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'vr-gen-vote-corrections-migration.mjs')], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
ok(regenerated === sql, 'the committed migration is not what the generator produces from the seed — regenerate it');

// Parsed independently of the generator, so a bug shared by both would still show up.
const lookups = [...sql.matchAll(/^  SELECT id INTO rc FROM vr_rollcalls\n   WHERE chamber = '(\w+)' AND congress = (\d+) AND session = (\d+)\n     AND roll_number = (\d+) LIMIT 1;$/gm)];
const updates = [...sql.matchAll(/^    UPDATE vr_member_votes\n       SET position = '([^']+)', is_party = (?:'([^']+)'|NULL)\n     WHERE rollcall_id = rc AND politician_id = '([^']+)' AND position = '([^']+)';$/gm)];
ok(lookups.length === rows.length, `SQL looks up ${lookups.length} roll calls, seed lists ${rows.length} corrections`);
ok(updates.length === rows.length, `SQL holds ${updates.length} UPDATEs, seed lists ${rows.length} corrections`);
const mismatched = [];
rows.forEach((c, i) => {
  const l = lookups[i], u = updates[i];
  if (!l || !u) return;
  const got = { chamber: l[1], congress: Number(l[2]), session: Number(l[3]), roll: Number(l[4]) };
  if (got.chamber !== c.chamber || got.congress !== c.congress || got.session !== c.session || got.roll !== c.rollNumber) {
    mismatched.push(`block ${i}: SQL targets ${JSON.stringify(got)}, seed says ${c.chamber} ${c.congress}/${c.session} roll ${c.rollNumber}`);
  }
  if (u[3] !== c.politicianId) mismatched.push(`block ${i}: SQL updates '${u[3]}', seed says '${c.politicianId}'`);
  if (u[1] !== c.officialPosition) mismatched.push(`block ${i}: SQL writes '${u[1]}', seed says '${c.officialPosition}'`);
  if ((u[2] || null) !== (c.officialIsParty || null)) mismatched.push(`block ${i}: SQL writes is_party ${u[2] || 'NULL'}, seed says ${c.officialIsParty || 'NULL'}`);
  // The guard: an UPDATE that does not name the old value could fire on a cell that has
  // since moved, and could not be re-run safely.
  if (u[4] !== c.storedPosition) mismatched.push(`block ${i}: SQL guards on '${u[4]}', seed examined '${c.storedPosition}'`);
});
ok(!mismatched.length, `SQL and seed disagree: ${mismatched.slice(0, 4).join('; ')}`);

// ── 4. nothing outside the enumerated cells ─────────────────────────────────
// The header is prose ABOUT these guarantees and names them, so read the statements alone.
const stmts = sql.replace(/^--.*$/gm, '');
const allUpdates = [...stmts.matchAll(/UPDATE\s+(\w+)/gi)].map((m) => m[1].toLowerCase());
ok(allUpdates.length === rows.length, `${allUpdates.length} UPDATE statement(s) for ${rows.length} enumerated corrections`);
ok(allUpdates.every((t) => t === 'vr_member_votes'), `an UPDATE targets a table other than vr_member_votes: ${[...new Set(allUpdates)].join(', ')}`);
// Every UPDATE must be pinned to one politician_id and one old position. A set-based
// correction is how eighteen cells quietly becomes eighteen thousand.
const guarded = (stmts.match(/WHERE rollcall_id = rc AND politician_id = '[^']+' AND position = '[^']+';/g) || []).length;
ok(guarded === rows.length, `${guarded} of ${rows.length} UPDATE(s) are pinned to one member and one prior value`);
// Bounded by the statement terminator: an UPDATE may not reach past its own WHERE.
ok(!/UPDATE\s+\w+[^;]*\bIN\s*\(/i.test(stmts), 'an UPDATE uses an IN list — corrections are named one at a time');
ok(!/UPDATE\s+\w+[^;]*\bFROM\b/i.test(stmts), 'an UPDATE joins another relation — corrections are named one at a time');
for (const verb of ['INSERT', 'DELETE', 'TRUNCATE', 'DROP', 'ALTER', 'CREATE']) {
  ok(!new RegExp(`(^|\\s)${verb}\\s`, 'i').test(stmts), `migration contains ${verb} — this pass corrects stored cells and does nothing else`);
}
for (const t of ['vr_positions', 'vr_measure_issues', 'vr_measures', 'vr_rollcalls', 'vr_measure_actions']) {
  ok(!new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${t}\\b`, 'i').test(stmts),
    `migration writes ${t} — no stance, mapping, measure or roll call is touched by a vote correction`);
}
// Fail-closed on both sides: a missing roll and a missing cell each stop the migration,
// and so does any third value.
ok((stmts.match(/RAISE EXCEPTION/g) || []).length === rows.length * 3,
  'each correction must fail closed on a missing roll call, a missing cell, and an unexpected stored value');
ok((stmts.match(/ELSIF cur = '[^']+' THEN\n    already := already \+ 1;/g) || []).length === rows.length,
  'each correction must treat a cell already holding the corrected value as done rather than rewriting it');

// ── 5. Slice 1 thresholds are untouched ─────────────────────────────────────
const helpers = fs.readFileSync(path.join(ROOT, 'stance-helpers.js'), 'utf8');
for (const [name, want] of [
  ['_RD_MIN_JUDGED', '4'],
  ['_RD_DOMINANCE', '0.75'],
  ['_RD_THIN_MIN', '2'],
  ['_RD_MIN_PRIMARY', '1'],
  ['_RD_MEMBER_FLOOR', '12'],
]) {
  const m = helpers.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
  ok(m && m[1] === want, `${name} is ${m ? m[1] : '(absent)'}, expected ${want} — a correction may not move Slice 1's bar`);
}

if (fails.length) {
  console.error(`✗ vote correction discipline: ${fails.length} failure(s)`);
  fails.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`✓ vote correction discipline: all ${pass} assertions passed — ${rows.length} cells corrected, each matched to the document that found it`);
