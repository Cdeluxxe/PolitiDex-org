#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — what the backfill actually unlocks for readers
// ─────────────────────────────────────────────────────────────────────────────
// Volume filled is the easy number and the least interesting one. This script answers
// the reader-facing question instead: after db/vr-house-evs-backfill-seed.json and
// db/vr-senate-lis-backfill-seed.json land, which members clear the record-direction
// coverage floor, which (member, issue) rows stop saying "too thin to read" and start
// saying what the record did, and does any Direction Match verdict move.
//
//   node scripts/vr-audit-record-direction-coverage.mjs          # summary
//   node scripts/vr-audit-record-direction-coverage.mjs --member <slug>   # one profile
//
// Needs NETLIFY_DB_URL. The migrations are applied by the platform at deploy, not here, so
// this projects the post-migration state: it reads the live cells, unions both seeds'
// cells over them (never replacing one — the migrations are ON CONFLICT DO NOTHING, so a
// stored cell wins even where the official document contradicts it), and runs BOTH states
// through the SAME shipped derivation the browser runs.
//
// THE DERIVATION IS NOT REIMPLEMENTED HERE
// stance-helpers.js is loaded and _recordDirectionIndex / _polRecordMap are called
// directly, on item objects shaped exactly as netlify/lib/vr-pack.ts packs them. An
// audit that re-derives "advances / cuts against" in its own arithmetic would be
// measuring its own opinion of the record, and would keep reporting success after the
// shipped rule changed underneath it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { loadEngine } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ONE = (process.argv.find((a) => a.startsWith("--member=")) || "").slice(9) ||
  (process.argv.includes("--member") ? process.argv[process.argv.indexOf("--member") + 1] : "");
// Which change is being measured. By default: what the backfill unlocks, live → live+fills.
// With --corrections: what the eighteen stored-vote corrections change on top of it,
// backfilled → backfilled+corrected. The corrections land in a record that already has
// the fills, so measuring them against the bare live state would credit them with the
// backfill's movement.
const CORR = process.argv.includes("--corrections");

// ── the shipped engine, in the same sandbox the test suite boots ─────────────
// loadEngine() gives both the derivation AND the curated stance data, so the
// Direction Match half of this audit reads the very stances the profile renders
// rather than a table this script decided was close enough.
const win = loadEngine(ROOT);
const rdIndex = win._recordDirectionIndex;
const FLOOR = win._PDX_RD_MEMBER_FLOOR;
if (typeof rdIndex !== "function") throw new Error("_recordDirectionIndex unavailable after loadEngine()");
if (typeof win._polRecordMap !== "function") throw new Error("_polRecordMap unavailable after loadEngine()");

// vr-pack.ts's rules, quoted rather than re-invented (see its header for why).
const PROCEDURAL_TYPES = ["procedural", "motion"];
const yeaBlocksMeasure = (q) => {
  const s = String(q || "").toLowerCase();
  return s.indexOf("recommit") !== -1 || s.indexOf("to commit") !== -1 || s.indexOf("to table") !== -1;
};

const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const rolls = new Map((await client.query(`
  SELECT r.id, r.chamber, r.congress, r.session, r.roll_number, r.vote_date, r.question, r.action_type,
         m.id AS measure_id, m.number, m.title
    FROM vr_rollcalls r JOIN vr_measures m ON m.id = r.measure_id`)).rows.map((r) => [r.id, r]));
const issuesByMeasure = new Map();
for (const r of (await client.query(`SELECT measure_id, issue_key, weight, is_primary, support_meaning FROM vr_measure_issues`)).rows) {
  if (!issuesByMeasure.has(r.measure_id)) issuesByMeasure.set(r.measure_id, []);
  issuesByMeasure.get(r.measure_id).push({
    issueKey: r.issue_key, weight: Number(r.weight), isPrimary: !!r.is_primary, supportMeaning: r.support_meaning,
  });
}
const live = (await client.query(`SELECT rollcall_id, politician_id, position FROM vr_member_votes`)).rows;
await client.end();

// ── item objects, exactly as vr-pack.ts packs them ───────────────────────────
function item(rollcallId, position) {
  const rc = rolls.get(rollcallId);
  if (!rc) return null;
  return {
    kind: "vote", position,
    date: rc.vote_date ? rc.vote_date.toISOString().slice(0, 10) : null,
    measure: rc.number, title: rc.title, question: rc.question,
    isProcedural: PROCEDURAL_TYPES.includes(rc.action_type),
    advanceInverted: yeaBlocksMeasure(rc.question),
    issues: issuesByMeasure.get(rc.measure_id) || [],
  };
}

// ── the three states, as flat cell maps ──────────────────────────────────────
// Each is `rollcall|pid -> position`. Building them as maps rather than as item arrays
// is what lets a correction REPLACE a cell: the backfill only ever adds, but this pass
// changes a value in place, and a state built by appending could not express that.
const rcByKey = new Map([...rolls.values()].map((r) => [`${r.chamber}|${r.congress}|${r.session}|${r.roll_number}`, r.id]));
const liveCells = new Map();
for (const v of live) liveCells.set(v.rollcall_id + "|" + v.politician_id, v.position);

// Both chambers' seeds, projected together: the House gap was a seeding one, the Senate
// gap an identity one, but a reader looking at a profile sees one record and the floor
// is applied to that whole record. Measuring them separately would understate what each
// unlocks for anyone whose votes span both chambers over a career.
const SEEDS = ["db/vr-house-evs-backfill-seed.json", "db/vr-senate-lis-backfill-seed.json"];
const filledCells = new Map(liveCells);
let added = 0, collided = 0;
for (const rel of SEEDS) {
  const seed = JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
  for (const v of seed.votes) {
    const id = rcByKey.get(`${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`);
    if (!id) throw new Error(`${rel}: roll ${v.rollNumber} (${v.congress}/${v.session}) is not in vr_rollcalls`);
    for (const r of v.memberVotes) {
      const key = id + "|" + r.politicianId;
      // ON CONFLICT DO NOTHING, honoured: a stored cell wins even where the official
      // document contradicts it. Correcting those is the corrections migration's job.
      if (filledCells.has(key)) { collided++; continue; }
      filledCells.set(key, r.position);
      added++;
    }
  }
}

const correctedCells = new Map(filledCells);
let corrected = 0, corrMissing = 0, corrAlready = 0;
const CORRECTIONS = JSON.parse(readFileSync(join(ROOT, "db", "vr-vote-corrections-seed.json"), "utf8")).corrections;
for (const c of CORRECTIONS) {
  const id = rcByKey.get(`${c.chamber}|${c.congress}|${c.session}|${c.rollNumber}`);
  const key = id + "|" + c.politicianId;
  if (id == null || !correctedCells.has(key)) { corrMissing++; continue; }
  if (correctedCells.get(key) === c.officialPosition) { corrAlready++; continue; }
  correctedCells.set(key, c.officialPosition);
  corrected++;
}

const stateOf = (cells) => {
  const out = new Map();
  for (const [key, position] of cells) {
    const [rid, pid] = [Number(key.slice(0, key.indexOf("|"))), key.slice(key.indexOf("|") + 1)];
    const it = item(rid, position);
    if (!it) continue;
    if (!out.has(pid)) out.set(pid, []);
    out.get(pid).push(it);
  }
  return out;
};
const before = stateOf(CORR ? filledCells : liveCells);
const after = stateOf(CORR ? correctedCells : filledCells);

// ── run both states through the shipped derivation ───────────────────────────
const mappedCount = (items) => items.filter((i) => i.issues.length).length;
const keysOf = (items) => [...new Set(items.flatMap((i) => i.issues.map((m) => m.issueKey)))];
function speak(items) {
  const n = mappedCount(items), out = new Map();
  for (const k of keysOf(items)) {
    const on = items.filter((i) => i.issues.some((m) => m.issueKey === k));
    out.set(k, rdIndex(k, on, { memberRecordCount: n }));
  }
  return out;
}

const pids = [...new Set([...before.keys(), ...after.keys()])].sort();
const unlocked = [], newRows = [], lostRows = [];
let clearedFloor = 0, stillBelow = 0, stillEmpty = 0;
for (const pid of pids) {
  const b = before.get(pid) || [], a = after.get(pid) || [];
  const bn = mappedCount(b), an = mappedCount(a);
  if (bn < FLOOR && an >= FLOOR) clearedFloor++;
  // The hole that is left: a profile still under the floor shows no record-direction on
  // any issue, however many rows it has. Reported alongside the unlock so the win is
  // never mistaken for completeness.
  if (an < FLOOR) { stillBelow++; if (!an) stillEmpty++; }
  const bs = speak(b), as = speak(a);
  const gained = [], lostK = [];
  for (const [k, r] of as) if (r.characterised && !(bs.get(k) || {}).characterised) gained.push({ k, r });
  for (const [k, r] of bs) if (r.characterised && !(as.get(k) || {}).characterised) lostK.push(k);
  if (gained.length) unlocked.push({ pid, before: bn, after: an, gained });
  gained.forEach((g) => newRows.push({ pid, ...g }));
  lostK.forEach((k) => lostRows.push({ pid, k, from: bs.get(k).token, to: (as.get(k) || {}).token }));
}

// ── Direction Match: what moved, and did a stance ever appear? ───────────────
// Direction Match only judges a (member, issue) pair where a stated position exists on
// the same key, and this pass writes no stance — so the STANCE side must be identical
// before and after, pair for pair. That is the invariant worth checking, and it is
// checked rather than asserted: stanceAppeared counts any key where hasStance or the
// stance value itself differs between the two states. It must be 0. If a densification
// pass could make a position appear, the wall between "what they did" and "what they
// said" would be one bug wide.
//
// Everything else that moves is a count moving because the member's actual record got
// less incomplete. Pairs with a stance are Direction Match inputs and their verdicts can
// honestly change; pairs without one are unscored either way and are reported separately
// so the two are never added together.
const CMP = win.CMP_DATA || {};
const posMapOf = (pid) => (typeof win._polPositionMap === "function" ? win._polPositionMap(pid, CMP[pid]) : {}) || {};
let pairsBefore = 0, pairsAfter = 0, pairsMoved = 0, verdictFlips = 0;
let unscoredMoved = 0, stanceAppeared = 0;
const movers = [], flipKind = {};
for (const pid of pids) {
  const pm = posMapOf(pid);
  const mb = win._polRecordMap(before.get(pid) || [], pm);
  const ma = win._polRecordMap(after.get(pid) || [], pm);
  for (const k of new Set([...Object.keys(mb), ...Object.keys(ma)])) {
    const stated = !!(pm[k] && pm[k].stance);
    const x = mb[k], y = ma[k];
    const judgedB = x ? x.consistent + x.contradicts : 0;
    const judgedA = y ? y.consistent + y.contradicts : 0;
    if (stated && judgedB) pairsBefore++;
    if (stated && judgedA) pairsAfter++;
    // The wall: a backfill must never make a stated position exist.
    const sb = x ? [!!x.hasStance, x.stance] : [false, null];
    const sa = y ? [!!y.hasStance, y.stance] : [false, null];
    if (String(sb) !== String(sa)) stanceAppeared++;
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (!stated) { unscoredMoved++; continue; }
    pairsMoved++;
    if ((x && x.netVerdict) !== (y && y.netVerdict)) {
      verdictFlips++;
      const kind = `${x ? x.netVerdict : "—"} → ${y ? y.netVerdict : "—"}`;
      flipKind[kind] = (flipKind[kind] || 0) + 1;
      movers.push(`${pid} · ${k}: ${x ? x.netVerdict : "—"} (${x ? x.consistent : 0}/${judgedB}) → ${y ? y.netVerdict : "—"} (${y ? y.consistent : 0}/${judgedA})`);
    }
  }
}

if (ONE) {
  const b = before.get(ONE) || [], a = after.get(ONE) || [];
  const bs = speak(b), as = speak(a);
  console.log(`${ONE}: ${mappedCount(b)} mapped votes → ${mappedCount(a)} (floor ${FLOOR})`);
  for (const k of [...new Set([...bs.keys(), ...as.keys()])].sort()) {
    const x = bs.get(k), y = as.get(k);
    const say = (r) => (r ? `${r.token}${r.characterised ? ` · ${r.summary}` : ` (${r.suppressed || "thin"})`}` : "—");
    if (say(x) === say(y)) continue;
    console.log(`  ${k}\n     before: ${say(x)}\n     after:  ${say(y)}`);
  }
  process.exit(0);
}

console.log(CORR
  ? `measuring: the ${CORRECTIONS.length} stored-vote corrections, on top of the backfill`
  : "measuring: the House + Senate attribution backfill, on top of the live record");
console.log(CORR
  ? `corrections applied: ${corrected} · already correct: ${corrAlready} · cell absent: ${corrMissing}`
  : `seed cells: ${added} added · ${collided} already stored and left alone`);
console.log(`members with any record: ${pids.length}`);
console.log(`members newly clearing the ${FLOOR}-mapped-vote coverage floor: ${clearedFloor}`);
console.log(`members STILL below the floor afterwards: ${stillBelow} (${stillEmpty} with no mapped vote at all)`);
console.log(`(member, issue) rows that can newly speak: ${newRows.length} across ${unlocked.length} members`);
console.log(`(member, issue) rows that STOPPED speaking: ${lostRows.length}`);
const lostKind = {};
lostRows.forEach((l) => { const k = `${l.from} → ${l.to}`; lostKind[k] = (lostKind[k] || 0) + 1; });
Object.entries(lostKind).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`     ${String(n).padStart(4)}  ${k}`));
console.log(`Direction Match judged pairs (stance + record on the same key): ${pairsBefore} → ${pairsAfter}`);
console.log(`  pairs whose judged inputs moved: ${pairsMoved} · of those, verdict changed: ${verdictFlips}`);
Object.entries(flipKind).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`     ${String(n).padStart(4)}  ${k}`));
console.log(`  unscored (no stated position) pairs whose counts moved: ${unscoredMoved}`);
console.log(`  pairs where a stated position APPEARED or CHANGED (must be 0): ${stanceAppeared}`);
// Under --corrections the moving set is small enough to read in full, and a correction
// pass is exactly the case where the reader deserves to see each verdict that moved
// rather than a bucket count.
if (CORR) {
  if (movers.length) { console.log("\nDirection Match verdicts that moved:"); movers.forEach((m) => console.log(`  ${m}`)); }
  if (lostRows.length) {
    console.log("\nrecord-direction rows that stopped speaking:");
    lostRows.forEach((l) => console.log(`  ${l.pid.padEnd(20)} ${l.k.padEnd(22)} ${l.from} → ${l.to}`));
  }
}
console.log("\ntop profiles by rows unlocked:");
unlocked.sort((x, y) => y.gained.length - x.gained.length).slice(0, 20)
  .forEach((u) => console.log(`  ${u.pid.padEnd(24)} ${String(u.before).padStart(3)} → ${String(u.after).padStart(3)} mapped votes · +${u.gained.length} rows: ${u.gained.map((g) => g.k).join(", ")}`));
