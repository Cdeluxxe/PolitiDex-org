#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-record.mjs — the Utah state formal record, pinned to its fences
// ─────────────────────────────────────────────────────────────────────────────
// Data wave 1 put 42 Utah bills, 55 floor roll calls and 2,254 member votes into
// the formal lane, and threw 905 more recorded votes away: a quarter of the Utah
// House had no roster record to attribute them to. Data wave 2 added those 27
// people and re-ran the attribution, so the same 55 roll calls now carry 3,159
// votes across 104 members and drop nobody. Wave 2 then went backwards through
// the archive — 28 bills from the 2024 general session, 40 from 2023 — so a
// member who has served three years shows a pattern rather than one year's
// agenda. That is the first time this repo has held a legislature that
// is not Congress, and almost every way it could go wrong is a way of making a
// confident false claim about a real person. This harness is the list of those
// ways, each one an assertion:
//
//   1. IT IS NOT FEDERAL. Every Utah row's chamber is 'utah house' / 'utah senate'
//      and its congress is NULL. A Utah vote can never be filed as a U.S. one,
//      and no surface may label it with a federal chamber's card.
//   2. ONE INSTRUMENT, ONE ACT. A bill gets at most one floor roll call per
//      chamber, so a bill that was voted four times counts once.
//   3. NO LOPSIDED VOTES. A 70-2 vote differentiates nobody; admitting it would
//      inflate every member's depth without adding signal.
//   4. NOBODY IS GUESSED. Every politician_id in the seed came from the
//      human-accepted printed-name map, and no printed name feeds two people.
//   5. EVERY MAPPING IS DEFENSIBLE. Direction, weight, a rationale in prose and
//      a source URL — no mapping is inferred from a sponsor, a party or a vote.
//   6. THE MIGRATION IS THE SEED. Not a paraphrase of it: every roll call in the
//      JSON is in the SQL, at the same roll number, in the same chamber.
//   7. AN OLDER SESSION GETS NO SLACK. Rules 1-6 again, per archive session, on
//      that session's own committed files — plus the two things the archive
//      added: a printed name is confirmed against the legislature's roster for
//      that year, and a name the reviewer REFUSED is disclosed as a refusal
//      rather than folded in with the ordinary coverage gaps.
//
//   node scripts/test-vr-utah-record.mjs
//
// Data-only assertions read the shipped JSON; the client-honesty ones read the
// shipped source. Nothing here needs a database.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that stopped offering a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vr-utah-record: ${msg}`);
  process.exit(1);
};

const MIG = "netlify/database/migrations/20260929000000_vr_utah_2025gs_state_record.sql";
const SEED = J("db/vr-utah-vote-seed.json");
const MAP = J("db/vr-utah-member-map.json");
const BILLS = J("db/vr-utah-bills.json");
const ISSUE_KEYS = new Set(J("db/issue-keys.json").keys);
const SQL = R(MIG);
const VR = R("voting-record.js");
const LEARN = R("pdx-learn.js");
const BILLDETAIL = R("bill-detail.js");
const HUB = R("compare-hub.js");
const RECEIPTS = R("receipt-cards.js");

const measures = SEED.measures || [];
const rollcalls = measures.flatMap((m) => (m.rollcalls || []).map((rc) => ({ m, rc })));
const votes = rollcalls.flatMap(({ m, rc }) => (rc.votes || []).map((v) => ({ m, rc, v })));

must(measures.length > 0, "seed has no measures");
must(rollcalls.length > 0, "seed has no roll calls");
must(votes.length > 0, "seed has no member votes");
must(ISSUE_KEYS.size > 50, "issue-keys.json did not load");

console.log("── The Utah state formal record (2025 general session)");

// ── 1. Shape ─────────────────────────────────────────────────────────────────
// Exact counts, so a silent re-run of the ingest that quietly drops or doubles a
// chunk of the record shows up here rather than on someone's profile.
section("Shape");
eq(measures.length, 42, "measures in the seed");
eq(rollcalls.length, 55, "roll calls in the seed");
eq(votes.length, 3159, "member votes in the seed");
eq(new Set(votes.map((x) => x.v.politicianId)).size, 104, "distinct legislators covered");
eq(measures.length, BILLS.bills.length, "seed measures vs curated bill list");

// ── 2. It is not federal ─────────────────────────────────────────────────────
section("Not federal");
const CHAMBERS = new Set(["utah house", "utah senate"]);
ok(measures.every((m) => CHAMBERS.has(m.chamber)),
  "every measure chamber is a Utah chamber");
ok(rollcalls.every(({ rc }) => CHAMBERS.has(rc.chamber)),
  "every roll call chamber is a Utah chamber");
ok(rollcalls.every(({ rc }) => rc.session === 2025),
  "every roll call is stamped with the state session year");
ok(measures.every((m) => !("congress" in m) || m.congress === null),
  "no measure claims a Congress");
// The migration is where a stray federal chamber string would actually do harm.
lacks(SQL, "chamber = 'house'", "migration never selects a federal House row");
lacks(SQL, "chamber = 'senate'", "migration never selects a federal Senate row");
lacks(SQL, "'bill', NULL, 'house'", "migration never inserts a bare House measure");
lacks(SQL, "'bill', NULL, 'senate'", "migration never inserts a bare Senate measure");
has(SQL, "congress IS NULL", "migration dedupes state roll calls on a NULL congress");
has(SQL, "vr_rollcalls_state_unique",
  "migration adds the state roll-call unique index");
has(SQL, "vr_measures_utah_unique", "migration adds the Utah measure unique index");
// Additive only. An applied migration's index is never dropped or replaced.
lacks(SQL, "DROP INDEX", "migration drops no index");
lacks(SQL, "DROP TABLE", "migration drops no table");
lacks(SQL, "ALTER TABLE", "migration alters no existing table");

// ── 3. One instrument, one act ───────────────────────────────────────────────
// A Utah bill can be voted on four times in one chamber (second reading, third
// reading, a re-vote after amendment, concurrence). Exactly one of those is the
// act; the rest are the same instrument.
section("One instrument, one act");
const perBillChamber = new Map();
for (const { m, rc } of rollcalls) {
  const k = `${m.utahBill}|${rc.chamber}`;
  perBillChamber.set(k, (perBillChamber.get(k) || 0) + 1);
}
const doubled = [...perBillChamber].filter(([, n]) => n > 1).map(([k]) => k);
eq(doubled.length, 0, `no bill is counted twice in one chamber (${doubled.join(", ")})`);
// And no member appears twice on one roll call.
const dupOnRoll = [];
for (const { rc } of rollcalls) {
  const seen = new Set();
  for (const v of rc.votes || []) {
    if (seen.has(v.politicianId)) dupOnRoll.push(`${rc.rollNumber}:${v.politicianId}`);
    seen.add(v.politicianId);
  }
}
eq(dupOnRoll.length, 0, `no member votes twice on one roll call (${dupOnRoll.join(", ")})`);
const POSITIONS = new Set(["yea", "nay", "not_voting", "absent", "present"]);
ok(votes.every((x) => POSITIONS.has(x.v.position)),
  "every recorded position is a known position value");

// ── 4. No lopsided votes ─────────────────────────────────────────────────────
// The runbook's rule, applied to state votes: below a tenth of the yea+nay pool
// on the losing side, a roll call adds attribution without adding signal.
section("No lopsided votes");
const lopsided = [];
for (const { m, rc } of rollcalls) {
  const yea = rc.totals.yea, nay = rc.totals.nay;
  const cast = yea + nay;
  const share = cast ? Math.min(yea, nay) / cast : 0;
  if (share < 0.1) lopsided.push(`${m.utahBill} ${yea}-${nay}`);
}
eq(lopsided.length, 0, `no near-unanimous roll call admitted (${lopsided.join(", ")})`);
has(SQL, "does not ingest", "migration says in prose that lopsided votes were refused");

// ── 5. Nobody is guessed ─────────────────────────────────────────────────────
section("Nobody is guessed");
const accepted = new Map(); // pid -> printed name
const printedToPid = new Map();
for (const ch of Object.keys(MAP.chambers)) {
  for (const [printed, pid] of Object.entries(MAP.chambers[ch])) {
    printedToPid.set(`${ch}|${printed}`, pid);
    if (accepted.has(pid) && accepted.get(pid) !== printed)
      failures.push(`pid ${pid} is mapped from two printed names: ${accepted.get(pid)} / ${printed}`);
    else passed++;
    accepted.set(pid, printed);
  }
}
const pidCounts = new Map();
for (const pid of printedToPid.values()) pidCounts.set(pid, (pidCounts.get(pid) || 0) + 1);
const shared = [...pidCounts].filter(([, n]) => n > 1).map(([p]) => p);
eq(shared.length, 0, `no pid is claimed by two printed names (${shared.join(", ")})`);
const stray = votes.filter((x) => !accepted.has(x.v.politicianId))
  .map((x) => x.v.politicianId);
eq(new Set(stray).size, 0,
  `every seeded pid comes from the accepted map (${[...new Set(stray)].join(", ")})`);
// The printed name travels with the vote so a wrong row can be traced back to the
// page that produced it, and it must agree with the map.
const mismatched = votes.filter((x) => x.v.printedAs && accepted.get(x.v.politicianId) !== x.v.printedAs)
  .map((x) => `${x.v.printedAs}→${x.v.politicianId}`);
eq(new Set(mismatched).size, 0,
  `each pid is only ever printed one way (${[...new Set(mismatched)].slice(0, 5).join(", ")})`);
// Refusals stay refused: a surname-only match is not a person.
must(Array.isArray(MAP._refusedNames), "the member map has no _refusedNames list at all");
for (const name of MAP._refusedNames) {
  ok(![...printedToPid.keys()].some((k) => k.endsWith(`|${name}`)),
    `refused name "${name}" is not mapped to anybody`);
}
// An EMPTY refusal list is the state wave 2 left the map in, and it is only honest
// if it was emptied the right way. Wave 1 refused three printed names because each
// shared a surname with a different person already on the roster; wave 2 mapped all
// three by ADDING THE REAL PEOPLE, after which the printed initial plus the district
// on the vote page resolves each uniquely. So when the list is empty the map owes a
// prose account of how it got that way — and every one of those three names must now
// resolve to somebody who is NOT the roster member it used to collide with. That is
// the invariant "keep the collisions refused until the human map is unique" reduces
// to once the map IS unique: a cleared refusal, never a loosened rule.
if (MAP._refusedNames.length === 0) {
  ok(typeof MAP._refusalsCleared === "string" && MAP._refusalsCleared.trim().length >= 200,
    "an empty refusal list is explained in prose by _refusalsCleared");
}
// [printed name, the roster member a surname-only match would have handed the vote to]
const CLEARED = [
  ["Moss, J.", "carol_spackman_moss"],
  ["Peterson, K.", "valpeterson_h56"],
  ["Peterson, T.", "valpeterson_h56"],
];
for (const [printed, collidesWith] of CLEARED) {
  const pid = printedToPid.get(`H|${printed}`);
  must(accepted.has(collidesWith),
    `the collision fixture is stale — '${collidesWith}' is no longer in the map, so "${printed}" proves nothing`);
  ok(pid !== collidesWith,
    `"${printed}" is not handed to ${collidesWith} on a shared surname (got ${pid})`);
  ok(pid == null || votes.some((x) => x.v.politicianId === pid),
    `"${printed}" maps to a pid that actually casts votes in the seed (${pid})`);
}
// Every roll call discloses how many recorded members it could not attribute.
ok(rollcalls.every(({ rc }) => Array.isArray(rc.droppedNotOnRoster)),
  "every roll call carries its unattributed-name list");
has(SQL, "not on the PolitiDex roster",
  "migration discloses the unattributed members in prose");

// ── 6. Every mapping is defensible ───────────────────────────────────────────
section("Every mapping is defensible");
const MEANINGS = new Set(["yea_supports", "yea_opposes"]);
let mappings = 0, primaries = 0;
for (const m of measures) {
  const issues = m.issues || [];
  ok(issues.length > 0, `${m.utahBill} has at least one issue mapping`);
  let localPrimary = 0;
  const seenKeys = new Set();
  for (const it of issues) {
    mappings++;
    ok(ISSUE_KEYS.has(it.issueKey),
      `${m.utahBill}: "${it.issueKey}" is a real issue key`);
    ok(MEANINGS.has(it.supportMeaning),
      `${m.utahBill}/${it.issueKey}: supportMeaning states a direction`);
    ok(Number.isInteger(it.weight) && it.weight > 0 && it.weight <= 100,
      `${m.utahBill}/${it.issueKey}: weight is 1–100 (got ${it.weight})`);
    ok(typeof it.rationale === "string" && it.rationale.trim().length >= 80,
      `${m.utahBill}/${it.issueKey}: rationale is prose, not a label`);
    ok(!seenKeys.has(it.issueKey),
      `${m.utahBill}: issue key ${it.issueKey} appears once`);
    seenKeys.add(it.issueKey);
    if (it.isPrimary) { localPrimary++; primaries++; }
  }
  eq(localPrimary, 1, `${m.utahBill} has exactly one primary issue`);
  ok(/^https:\/\/le\.utah\.gov\//.test(m.sourceUrl || ""),
    `${m.utahBill} cites a Utah Legislature URL`);
}
eq(mappings, 54, "issue mappings in the seed");
eq(primaries, 42, "one primary mapping per measure");
// A refusal is a recorded decision, not an absence.
must(Array.isArray(BILLS._refused) && BILLS._refused.length > 0,
  "the bill list records no refusals, so this probe proves nothing");
for (const r of BILLS._refused) {
  ok(typeof r.why === "string" && r.why.trim().length >= 40,
    `refusal of ${r.bill} says why in prose`);
  ok(!measures.some((m) => m.utahBill === r.bill),
    `refused bill ${r.bill} was not seeded anyway`);
}

// ── 7. The migration is the seed ─────────────────────────────────────────────
section("The migration is the seed");
eq((SQL.match(/^DO \$\$/gm) || []).length, measures.length,
  "one DO block per measure");
eq((SQL.match(/--> statement-breakpoint/g) || []).length, measures.length + 2,
  "a breakpoint after each block and after each index");
for (const { m, rc } of rollcalls) {
  const houseLetter = rc.chamber === "utah house" ? "H" : "S";
  has(SQL, `AND roll_number = ${rc.rollNumber} LIMIT 1`,
    `${m.utahBill}: roll call ${rc.rollNumber} is deduped in the migration`);
  has(SQL, `voteid=${rc.rollNumber}&house=${houseLetter}`,
    `${m.utahBill}: roll call ${rc.rollNumber} cites its own vote page`);
}
for (const m of measures) {
  has(SQL, `WHERE number = '${m.number}' AND chamber = '${m.chamber}'`,
    `${m.utahBill} is deduped on number + Utah chamber`);
  for (const it of m.issues || [])
    has(SQL, `AND issue_key = '${it.issueKey}'`,
      `${m.utahBill}/${it.issueKey} mapping is guarded against a re-run`);
}
eq((SQL.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length,
  rollcalls.length, "every member-vote insert is re-runnable");
// Every write is sentinelled, so applying twice is a no-op rather than a double count.
eq((SQL.match(/IF NOT EXISTS \(SELECT 1 FROM vr_measure_issues/g) || []).length,
  mappings, "every mapping insert is sentinelled");
const spotCheck = votes.filter((x) => x.v.politicianId === "mschultz").length;
must(spotCheck > 0, "the canary pid casts no votes in the seed");
eq((SQL.match(/'mschultz'/g) || []).length, spotCheck,
  "the canary's votes all reached the migration");

// ── 7b. The DDL is in the drizzle chain ──────────────────────────────────────
// A hand-written .sql that creates an index the schema also declares is only half
// the change: drizzle-kit builds the next migration by diffing db/schema.ts against
// the newest snapshot.json in the tree, so an index that never enters that chain
// gets emitted a second time by the next `generate`.
section("The DDL is in the drizzle chain");
const SCHEMA = R("db/schema.ts");
has(SCHEMA, 'uniqueIndex("vr_rollcalls_state_unique")',
  "schema.ts declares the state roll-call index");
has(SCHEMA, 'uniqueIndex("vr_measures_utah_unique")',
  "schema.ts declares the Utah measure index");
has(SCHEMA, "congress IS NULL", "the state roll-call index is partial on a NULL congress");
const CARRIER = "netlify/database/migrations/20260930000000_vr_utah_state_dedupe_indexes";
const carrierSql = R(`${CARRIER}/migration.sql`);
ok(JSON.parse(R(`${CARRIER}/snapshot.json`)).ddl.some(
  (e) => e.entityType === "indexes" && e.name === "vr_rollcalls_state_unique"),
  "the carrier's snapshot contains the state roll-call index");
ok(JSON.parse(R(`${CARRIER}/snapshot.json`)).ddl.some(
  (e) => e.entityType === "indexes" && e.name === "vr_measures_utah_unique"),
  "the carrier's snapshot contains the Utah measure index");
// drizzle emits these unguarded, which would abort the deploy on the branch where
// the hand-written migration already created them.
eq((carrierSql.match(/CREATE UNIQUE INDEX IF NOT EXISTS/g) || []).length, 2,
  "both of the carrier's CREATEs are guarded");
lacks(carrierSql, "INSERT INTO", "the carrier writes no data — it carries a snapshot");
lacks(carrierSql, "DROP ", "the carrier drops nothing");

// ── 7c. The expansion migration carries votes and nothing else ───────────────
// The 905 votes wave 1 dropped could not be added by editing the migration that
// dropped them — that one is applied, and an applied migration is a historical
// record of what the database was told, not a draft. So they arrive in a second
// file, and the whole risk of a second file is that it starts restating the first
// one's facts: a re-emitted measure, a re-created roll call, an invented question.
// What is pinned here is the narrowness. It writes member votes, it finds its roll
// calls by the tuple the state index is on, and where wave 1 had a verified
// question, tally, date and source page to attach, this file RAISEs instead of
// inventing one.
section("The expansion migration carries votes and nothing else");
const MIG2 = "netlify/database/migrations/20261001000000_vr_utah_2025gs_roster_attribution_votes.sql";
const SQL2 = R(MIG2);
for (const forbidden of ["INSERT INTO vr_measures", "INSERT INTO vr_rollcalls",
  "INSERT INTO vr_measure_issues", "INSERT INTO vr_positions", "CREATE ", "DROP ", "ALTER "]) {
  lacks(SQL2, forbidden, `the expansion migration contains no "${forbidden.trim()}"`);
}
eq((SQL2.match(/INSERT INTO vr_member_votes \(rollcall_id, politician_id, position\) VALUES/g) || []).length,
  rollcalls.length, "one member-vote insert per roll call and no other write");
eq((SQL2.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length,
  rollcalls.length, "every insert in the expansion migration is re-runnable");
eq((SQL2.match(/^ {4}\(rc, '/gm) || []).length, votes.length,
  "every seeded member vote reached the expansion migration");
eq((SQL2.match(/SELECT id INTO rc FROM vr_rollcalls/g) || []).length, rollcalls.length,
  "each roll call is looked up rather than assumed");
eq((SQL2.match(/RAISE EXCEPTION 'Utah 2025GS attribution: utah/g) || []).length, rollcalls.length,
  "a missing roll call aborts the deploy rather than being created");
for (const { m, rc } of rollcalls) {
  has(SQL2, `WHERE chamber = '${rc.chamber}' AND congress IS NULL AND session = ${rc.session}`,
    `${m.utahBill}: the expansion migration looks up a STATE roll call`);
  has(SQL2, `AND roll_number = ${rc.rollNumber};`,
    `${m.utahBill}: roll call ${rc.rollNumber} is looked up by its own number`);
}
lacks(SQL2, "congress = ", "the expansion migration never matches a Congress number");
// Same canary as above, counted only in the VALUES rows — the verification block
// lists every attributed pid, so a bare match would count it twice.
eq((SQL2.match(/\(rc, 'mschultz',/g) || []).length, spotCheck,
  "the canary's votes all reached the expansion migration");
const strayInMig = [...new Set((SQL2.match(/^ {4}\(rc, '([a-z0-9_]+)'/gm) || [])
  .map((r) => r.replace(/^.*'([a-z0-9_]+)'$/, "$1")))].filter((p) => !accepted.has(p));
eq(strayInMig.length, 0,
  `every pid the expansion migration writes comes from the accepted map (${strayInMig.join(", ")})`);
// A skipped INSERT must not read as success.
const verify = SQL2.slice(SQL2.indexOf("-- ── Verification"));
must(verify.length > 400, "could not isolate the expansion migration's verification block");
has(verify, `IF n_rolls <> ${rollcalls.length} THEN`,
  "the verification block counts the roll calls it expected to find");
has(verify, `IF n_votes < ${votes.length} THEN`,
  "the verification block fails the deploy if the expansion did not land");
has(verify, "IF n_orphan > 0 THEN",
  "the verification block fails the deploy on a vote attributed off the map");
has(verify, "congress IS NULL", "the verification block counts state rows only");

// ── 7d. The archive sessions carry the same fences ───────────────────────────
// 2024 and 2023 were ingested after 2025, from a different shape of source page,
// and an older session is exactly where a bar gets quietly lowered: fewer of its
// members are still on the roster, so more of its votes are droppable, so the
// temptation is to widen the map or admit a lopsided roll call to make the file
// look full. Everything below is the same rule the 2025 section pins, applied to
// each archive session's own committed artefacts, plus the two rules those
// sessions added: a printed name is confirmed against the legislature's roster
// for that year, and a REFUSED name is disclosed as a refusal rather than as a
// gap.
section("The archive sessions carry the same fences");
const ARCHIVE = [
  {
    session: "2024GS", year: 2024,
    mig: "netlify/database/migrations/20261002000000_vr_utah_2024gs_state_record.sql",
    measures: 28, rolls: 39, votes: 1885, issues: 33, dropped: 442,
    unmapped: { H: 16, S: 2 }, refused: ["Judkins, M.", "Lyman, P."],
    crossChamber: ["Brammer, B.", "Musselman, C.R.", "Stratton, K."],
  },
  {
    session: "2023GS", year: 2023,
    mig: "netlify/database/migrations/20261003000000_vr_utah_2023gs_state_record.sql",
    measures: 40, rolls: 49, votes: 2490, issues: 49, dropped: 677,
    unmapped: { H: 17, S: 3 }, refused: ["Judkins, M.", "Lyman, P."],
    crossChamber: ["Brammer, B.", "Musselman, C.R.", "Stratton, K."],
  },
];
const seenTuple = new Set(rollcalls.map(({ rc }) => `${rc.chamber}|${rc.session}|${rc.rollNumber}`));
for (const A of ARCHIVE) {
  const T = A.session;
  const aBills = J(`db/vr-utah-bills-${T}.json`);
  const aMap = J(`db/vr-utah-member-map-${T}.json`);
  const aSeed = J(`db/vr-utah-vote-seed-${T}.json`);
  const aSql = R(A.mig);
  const aMeasures = aSeed.measures || [];
  const aRolls = aMeasures.flatMap((m) => (m.rollcalls || []).map((rc) => ({ m, rc })));
  const aVotes = aRolls.flatMap(({ m, rc }) => (rc.votes || []).map((v) => ({ m, rc, v })));

  // The counts are pinned so that a re-run that silently drops a bill, a roll call
  // or a member is a test failure rather than a smaller file.
  eq(aSeed.session, T, `${T}: the seed names its own session`);
  eq(aMeasures.length, A.measures, `${T}: ${A.measures} measures`);
  eq(aRolls.length, A.rolls, `${T}: ${A.rolls} roll calls`);
  eq(aVotes.length, A.votes, `${T}: ${A.votes} member votes`);
  eq(aBills.bills.length, A.measures,
    `${T}: every admitted bill produced a measure`);

  // 1. It is not federal, and it is not another session.
  for (const { m, rc } of aRolls) {
    ok(CHAMBERS.has(rc.chamber), `${T}/${m.utahBill}: chamber '${rc.chamber}' is a Utah chamber`);
    ok(rc.congress == null, `${T}/${m.utahBill}: roll call ${rc.rollNumber} carries no Congress`);
    eq(rc.session, A.year, `${T}/${m.utahBill}: roll call ${rc.rollNumber} is filed under ${A.year}`);
    eq(m.session, T, `${T}/${m.utahBill}: the measure names its own session`);
    const tuple = `${rc.chamber}|${rc.session}|${rc.rollNumber}`;
    ok(!seenTuple.has(tuple),
      `${T}/${m.utahBill}: (${rc.chamber}, ${rc.session}, ${rc.rollNumber}) is not already taken by another session`);
    seenTuple.add(tuple);
  }

  // 2. One instrument, one act.
  const perBC = new Map();
  for (const { m, rc } of aRolls) {
    const k = `${m.utahBill}|${rc.chamber}`;
    perBC.set(k, (perBC.get(k) || 0) + 1);
  }
  eq([...perBC].filter(([, n]) => n > 1).length, 0,
    `${T}: no bill carries two roll calls in one chamber (${[...perBC].filter(([, n]) => n > 1).map(([k]) => k).join(", ")})`);

  // 3. No lopsided votes — the 10% floor, recomputed from the seeded tallies.
  const lop = [];
  let aDropped = 0;
  for (const { m, rc } of aRolls) {
    const cast = (rc.votes || []).filter((v) => v.position === "yea" || v.position === "nay").length;
    const yea = (rc.votes || []).filter((v) => v.position === "yea").length;
    const tot = rc.totals || {};
    const printedCast = (tot.yea || 0) + (tot.nay || 0);
    const minority = Math.min(tot.yea || 0, tot.nay || 0);
    must(printedCast > 0, `${T}/${m.utahBill}: roll call ${rc.rollNumber} carries a printed tally`);
    if (minority / printedCast < 0.1) lop.push(`${m.utahBill} ${rc.chamber} ${tot.yea}-${tot.nay}`);
    ok(cast <= printedCast,
      `${T}/${m.utahBill}: attributed yea/nay (${cast}) never exceeds the printed tally (${printedCast})`);
    ok(yea <= (tot.yea || 0), `${T}/${m.utahBill}: attributed yeas never exceed the printed yeas`);
    // The votes a roll call could not attribute are named on the roll call itself,
    // so the gap is legible where the tally is, not only in the migration header.
    eq((rc.votes || []).length + (rc.droppedNotOnRoster || []).length,
      printedCast + (tot.notVoting || 0) + (tot.absent || 0),
      `${T}/${m.utahBill}: attributed + dropped accounts for every name on the page`);
    aDropped += (rc.droppedNotOnRoster || []).length;
  }
  eq(lop.length, 0, `${T}: no roll call is near-unanimous (${lop.join("; ")})`);
  eq(aDropped, A.dropped, `${T}: ${A.dropped} vote rows were dropped for want of a roster identity`);

  // 4. Nobody is guessed. Every printed name that became a vote is in the reviewed
  // map, the map sends no two printed names to one pid, and a name the map REFUSED
  // never reappears as an accepted one.
  const aAccepted = new Map();      // pid -> printed
  const aPidOf = new Map();         // printed -> pid
  const aPidCount = new Map();
  for (const house of ["H", "S"]) {
    for (const [printed, pid] of Object.entries(aMap.chambers[house] || {})) {
      aAccepted.set(pid, printed);
      aPidOf.set(printed, pid);
      aPidCount.set(pid, (aPidCount.get(pid) || 0) + 1);
    }
  }
  eq([...aPidCount].filter(([, n]) => n > 1).length, 0,
    `${T}: no roster id is claimed by two printed names (${[...aPidCount].filter(([, n]) => n > 1).map(([p]) => p).join(", ")})`);
  const aStray = [...new Set(aVotes.filter((x) => !aAccepted.has(x.v.politicianId))
    .map((x) => x.v.politicianId))];
  eq(aStray.length, 0, `${T}: every vote's pid is on the reviewed map (${aStray.join(", ")})`);
  const aMismatch = aVotes.filter((x) => x.v.printedAs && aAccepted.get(x.v.politicianId) !== x.v.printedAs)
    .map((x) => `${x.v.printedAs} → ${x.v.politicianId}`);
  eq(aMismatch.length, 0,
    `${T}: every vote's printed name is the one the map accepted (${[...new Set(aMismatch)].slice(0, 6).join("; ")})`);
  for (const n of A.refused) {
    ok(!aPidOf.has(n), `${T}: the refused name "${n}" was not quietly accepted`);
    ok((aMap.unmapped.H || []).concat(aMap.unmapped.S || []).some((u) => u.printed === n),
      `${T}: the refused name "${n}" is still listed among the names that got no votes`);
    has(aMap._refusalNotes, n, `${T}: the map says in prose why "${n}" was refused`);
  }
  eq(JSON.stringify(aMap._refusedNames), JSON.stringify(A.refused),
    `${T}: the map's refusal list is the reviewed one`);
  eq(aMap.unmapped.H.length, A.unmapped.H, `${T}: ${A.unmapped.H} House names went unattributed`);
  eq(aMap.unmapped.S.length, A.unmapped.S, `${T}: ${A.unmapped.S} Senate names went unattributed`);
  for (const u of aMap.unmapped.H.concat(aMap.unmapped.S)) {
    ok(!aPidOf.has(u.printed),
      `${T}: "${u.printed}" is unattributed, so it holds no roster id`);
  }
  // The cross-chamber additions are the one place a human overrode the tool, so the
  // file has to say so and must not claim a district confirmed them.
  for (const n of A.crossChamber) {
    ok(aPidOf.has(n), `${T}: the hand-added cross-chamber name "${n}" is on the map`);
    eq(aMap.confirmedByDistrict.H[n], false,
      `${T}: "${n}" is not claimed as district-confirmed — the district belongs to another chamber`);
    has(aMap._crossChamberNotes, n, `${T}: the map names "${n}" in its cross-chamber note`);
  }
  ok(String(aMap._howReviewed || "").includes(`roster.asp?year=${A.year}`),
    `${T}: the map names the roster it was confirmed against`);

  // 5. Every mapping is defensible, and no key was invented for an older session.
  const aSeen = new Set();
  for (const b of aBills.bills) {
    eq(b.session, T, `${T}/${b.bill}: the curator entry names its own session`);
    ok(!aSeen.has(b.bill), `${T}/${b.bill}: appears once in the curator file`);
    aSeen.add(b.bill);
    const prim = (b.issues || []).filter((i) => i.isPrimary);
    eq(prim.length, 1, `${T}/${b.bill}: exactly one primary issue`);
    for (const i of b.issues) {
      ok(ISSUE_KEYS.has(i.issueKey), `${T}/${b.bill}: '${i.issueKey}' is an existing issue key`);
      ok(MEANINGS.has(i.supportMeaning), `${T}/${b.bill}: '${i.issueKey}' says which way a yea points`);
      ok(typeof i.weight === "number" && i.weight > 0 && i.weight <= 100,
        `${T}/${b.bill}: '${i.issueKey}' carries a weight in range`);
      ok(String(i.rationale || "").length >= 120,
        `${T}/${b.bill}: '${i.issueKey}' carries a rationale in prose, not a label`);
    }
  }
  eq(aMeasures.reduce((n, m) => n + (m.issues || []).length, 0), A.issues,
    `${T}: ${A.issues} issue mappings reached the seed`);
  // A refusal is a curated act too: it names a bill that is NOT admitted and says why.
  ok((aBills._refused || []).length > 0, `${T}: the curator file records what it left out`);
  for (const r of aBills._refused) {
    ok(!aSeen.has(r.bill), `${T}/${r.bill}: a refused bill is not also admitted`);
    ok(String(r.why || "").length >= 200,
      `${T}/${r.bill}: the refusal is argued, not asserted`);
  }

  // 6. The migration is the seed — same rolls, same numbers, no DDL, and a
  // verification block that fails the deploy rather than reading as success.
  for (const forbidden of ["CREATE ", "DROP ", "ALTER ", "TRUNCATE", "DELETE FROM"]) {
    lacks(aSql, forbidden, `${T}: the migration contains no "${forbidden.trim()}"`);
  }
  eq((aSql.match(/INSERT INTO vr_measures /g) || []).length, A.measures,
    `${T}: one measure insert per admitted bill`);
  eq((aSql.match(/INSERT INTO vr_rollcalls /g) || []).length, A.rolls,
    `${T}: one roll-call insert per roll call`);
  eq((aSql.match(/INSERT INTO vr_measure_issues /g) || []).length, A.issues,
    `${T}: one issue insert per mapping`);
  eq((aSql.match(/^ {4}\(rc_id, '/gm) || []).length, A.votes,
    `${T}: every seeded member vote reached the migration`);
  eq((aSql.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, A.rolls,
    `${T}: every member-vote insert is re-runnable`);
  for (const other of ["2025GS", "2024GS", "2023GS"].filter((x) => x !== T)) {
    lacks(aSql, other, `${T}: the migration writes nothing under ${other}`);
  }
  for (const { m, rc } of aRolls) {
    has(aSql, `'utahSession', '${T}', 'utahBill', '${m.utahBill}'`,
      `${T}/${m.utahBill}: the measure carries its session in external_ids`);
    has(aSql, `AND roll_number = ${rc.rollNumber}`,
      `${T}/${m.utahBill}: roll call ${rc.rollNumber} is looked up by its own number`);
  }
  const aStrayMig = [...new Set((aSql.match(/^ {4}\(rc_id, '([a-z0-9_]+)'/gm) || [])
    .map((r) => r.replace(/^.*'([a-z0-9_]+)'$/, "$1")))].filter((p) => !aAccepted.has(p));
  eq(aStrayMig.length, 0,
    `${T}: every pid the migration writes comes from the accepted map (${aStrayMig.join(", ")})`);
  // The dropped votes are disclosed by count and by name, and a REFUSED name is
  // disclosed as a refusal — the distinction is the whole point of keeping both lists.
  has(aSql, `NOT WRITTEN — ${A.unmapped.H} member(s) of the utah house`,
    `${T}: the migration discloses the House names it could not attribute`);
  has(aSql, `NOT WRITTEN — ${A.unmapped.S} member(s) of the utah senate`,
    `${T}: the migration discloses the Senate names it could not attribute`);
  has(aSql, `${A.refused.length} of those (${A.refused.join("; ")}) are REFUSALS rather than gaps`,
    `${T}: the migration calls a refusal a refusal`);
  has(aSql, `db/vr-utah-member-map-${T}.json`,
    `${T}: the migration's refusal note points at this session's own map`);
  has(aSql, String(A.dropped), `${T}: the migration states how many vote rows are absent`);
  const aVerify = aSql.slice(aSql.indexOf("-- ── Verification"));
  must(aVerify.length > 400, `${T}: could not isolate the migration's verification block`);
  has(aVerify, `IF n_measures <> ${A.measures} THEN`, `${T}: the verification counts measures`);
  has(aVerify, `IF n_rolls <> ${A.rolls} THEN`, `${T}: the verification counts roll calls`);
  has(aVerify, `IF n_votes < ${A.votes} THEN`, `${T}: the verification counts member votes`);
  has(aVerify, `IF n_issues <> ${A.issues} THEN`, `${T}: the verification counts issue mappings`);
  has(aVerify, "IF n_orphan > 0 THEN",
    `${T}: the verification fails the deploy on a vote attributed off the map`);
  has(aVerify, "congress IS NULL", `${T}: the verification counts state rows only`);
  has(aVerify, `r.session = ${A.year}`, `${T}: the verification counts this session's rows`);
}

// ── 8. No surface labels a Utah vote as a federal one ────────────────────────
// The bug this closes: voting-record.js keyed the chamber glossary card off
// /house/i.test(chamber), which is true of 'utah house', so a Utah floor vote
// would have opened a card reading "435 members ... apportioned by state
// population" — a specific, confident, wrong sentence about a 75-member body.
section("Chamber labels stay honest");
lacks(VR, "/house/i.test(item.chamber)",
  "voting-record.js no longer substring-tests the chamber for a glossary key");
has(VR, "'utah house': 'Utah House'", "voting-record.js labels the Utah House");
has(VR, "'utah senate': 'Utah Senate'", "voting-record.js labels the Utah Senate");
has(VR, "'utah house': 'utah_house'",
  "voting-record.js points the Utah House chip at its own glossary entry");
has(VR, "'utah senate': 'utah_senate'",
  "voting-record.js points the Utah Senate chip at its own glossary entry");
has(BILLDETAIL, "'utah house': 'Utah House'",
  "bill-detail.js labels the Utah House rather than printing the raw value");
has(BILLDETAIL, "'utah senate': 'Utah Senate'",
  "bill-detail.js labels the Utah Senate rather than printing the raw value");
// The two glossary entries the chips now point at, and the two federal claims
// they must not repeat.
for (const key of ["utah_house", "utah_senate"]) {
  has(LEARN, `${key}: {`, `pdx-learn.js defines ${key}`);
}
const utahEntries = LEARN.slice(LEARN.indexOf("utah_house: {"),
  LEARN.indexOf("/* ── How votes happen"));
must(utahEntries.length > 200, "could not isolate the Utah glossary entries");
lacks(utahEntries, "435", "the Utah House card does not claim 435 members");
lacks(utahEntries, "two per state", "the Utah Senate card does not claim two per state");
has(utahEntries, "75 members", "the Utah House card states its own size");
has(utahEntries, "29 members", "the Utah Senate card states its own size");
has(utahEntries, "no relationship to the U.S. House",
  "the Utah House card separates itself from Congress");
has(utahEntries, "State chambers", "the Utah cards get their own category");

// A share card is the one surface that travels with no context, and nothing has
// read a le.utah.gov vote page — so a Utah vote gets no receipt card. The point
// pinned here is not the refusal (guard 12 would refuse it anyway, by falling
// through) but the REASON: a curator reading audit() must not be told the roll
// number is missing when the record carries it. Behaviour is exercised live in
// scripts/test-receipt-cards.mjs; this pins that the branch has not been removed.
has(RECEIPTS, "STATE_CHAMBERS = { 'utah house': 1, 'utah senate': 1 }",
  "receipt-cards.js knows which chambers are state chambers");
has(RECEIPTS, "this is a state-chamber vote",
  "receipt-cards.js gives a state vote its own refusal reason rather than the generic one");
const stateBlock = RECEIPTS.slice(RECEIPTS.indexOf("// ── State chambers ──"),
  RECEIPTS.indexOf("function canonicalCitation"));
must(stateBlock.length > 400, "could not isolate the receipt-cards state-chamber note");
has(stateBlock, "vr-check-citations.mjs",
  "the note names the script that would have to learn the page shape");
has(stateBlock, "WAF", "the note names the fetch obstacle, so the next person does not rediscover it");

// ── 9. The archive does not seat anyone it should not ────────────────────────
// Found while checking that the new data reads correctly: "Utah Senate President"
// contains 'senate' and not 'state', so the Utah Senate's presiding officer was
// classifying as a U.S. senator and appearing under "U.S. Senate · Utah".
section("No plausible strangers in the browse");
has(HUB, "!o.includes('senate president')",
  "compare-hub.js keeps a state presiding officer out of the federal Senate bucket");
const senClause = HUB.slice(HUB.indexOf("// Federal Senate —"),
  HUB.indexOf("return 'senator';") + 20);
must(senClause.length > 100, "could not isolate the federal Senate clause");
has(senClause, "!o.includes('state')", "the federal Senate clause still excludes 'state'");

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n   ${passed} checks passed`);
if (failures.length) {
  console.error(`\n✗ vr-utah-record: ${failures.length} failure(s)`);
  for (const f of failures.slice(0, 40)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log("✓ vr-utah-record: the Utah state record is Utah's, mapped by hand, counted once");
