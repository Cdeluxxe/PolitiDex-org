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
//   8. A NEW KEY DOES NOT REWRITE HISTORY. Vocab wave V1 minted three issue keys
//      and five bills that earlier waves had refused for want of one finally had
//      a home. Their rows could not go into the 2025GS and 2024GS record
//      migrations — those are applied, and an applied migration is what the
//      database was told, not a draft — so they arrive in a delta file. Rule 6 is
//      therefore checked at the UNION: every roll call in a seed is in exactly one
//      of the two files entitled to own it, and neither file restates the other's
//      facts.
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
// The delta migration (see doctrine note 8). Which file owns a given bill is a
// fact about when its issue key was minted, not about the bill, so the two are
// partitioned by an explicit list rather than by pattern-matching the SQL.
const DELTA = "netlify/database/migrations/20261010000000_vr_vocab_wave_v1.sql";
const SQLD = R(DELTA);
const DELTA_BILLS = {
  "2025GS": ["HB0067", "SB0026", "SB0316", "SB0336"], // sound_money, dev_district_finance
  "2024GS": ["HB0348"],                               // sound_money
  "2023GS": [],
};
const isDelta = (session, bill) => (DELTA_BILLS[session] || []).indexOf(bill) >= 0;
const VR = R("voting-record.js");
const LEARN = R("pdx-learn.js");
const BILLDETAIL = R("bill-detail.js");
const HUB = R("compare-hub.js");
const RECEIPTS = R("receipt-cards.js");

const measures = SEED.measures || [];
const rollcalls = measures.flatMap((m) => (m.rollcalls || []).map((rc) => ({ m, rc })));
const votes = rollcalls.flatMap(({ m, rc }) => (rc.votes || []).map((v) => ({ m, rc, v })));

// Wave 1 + wave 2 own everything the delta does not. Both halves are asserted:
// the record migrations against their half, the delta against its own.
const w1Measures = measures.filter((m) => !isDelta("2025GS", m.utahBill));
const w1Rolls = rollcalls.filter(({ m }) => !isDelta("2025GS", m.utahBill));
const w1Votes = votes.filter(({ m }) => !isDelta("2025GS", m.utahBill));
const dMeasures = measures.filter((m) => isDelta("2025GS", m.utahBill));
const dRolls = rollcalls.filter(({ m }) => isDelta("2025GS", m.utahBill));
const w1Mappings = w1Measures.reduce((t, m) => t + (m.issues || []).length, 0);

must(measures.length > 0, "seed has no measures");
must(dMeasures.length === DELTA_BILLS["2025GS"].length,
  "the 2025GS seed does not carry the delta's bills, so the partition proves nothing");
must(w1Measures.length + dMeasures.length === measures.length,
  "the wave-1/delta partition of the 2025GS seed does not add up");
must(rollcalls.length > 0, "seed has no roll calls");
must(votes.length > 0, "seed has no member votes");
must(ISSUE_KEYS.size > 50, "issue-keys.json did not load");

console.log("── The Utah state formal record (2025 general session)");

// ── 1. Shape ─────────────────────────────────────────────────────────────────
// Exact counts, so a silent re-run of the ingest that quietly drops or doubles a
// chunk of the record shows up here rather than on someone's profile.
section("Shape");
eq(measures.length, 46, "measures in the seed");
eq(rollcalls.length, 61, "roll calls in the seed");
eq(votes.length, 3425, "member votes in the seed");
// …of which the applied record migrations own the wave-1 half exactly. If a delta
// bill ever leaks into this count the assertions in section 7 stop meaning
// anything, so the split is pinned too.
eq(w1Measures.length, 42, "measures owned by the 2025GS record migration");
eq(w1Rolls.length, 55, "roll calls owned by the 2025GS record migration");
eq(w1Votes.length, 3159, "member votes owned by the 2025GS record migration");
eq(dMeasures.length, 4, "measures owned by the vocab-wave delta");
eq(dRolls.length, 6, "roll calls owned by the vocab-wave delta");
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
eq(mappings, 58, "issue mappings in the seed");
eq(primaries, 46, "one primary mapping per measure");
eq(w1Mappings, 54, "issue mappings owned by the 2025GS record migration");
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
eq((SQL.match(/^DO \$\$/gm) || []).length, w1Measures.length,
  "one DO block per measure it owns");
eq((SQL.match(/--> statement-breakpoint/g) || []).length, w1Measures.length + 2,
  "a breakpoint after each block and after each index");
for (const { m, rc } of w1Rolls) {
  const houseLetter = rc.chamber === "utah house" ? "H" : "S";
  has(SQL, `AND roll_number = ${rc.rollNumber} LIMIT 1`,
    `${m.utahBill}: roll call ${rc.rollNumber} is deduped in the migration`);
  has(SQL, `voteid=${rc.rollNumber}&house=${houseLetter}`,
    `${m.utahBill}: roll call ${rc.rollNumber} cites its own vote page`);
}
for (const m of w1Measures) {
  has(SQL, `WHERE number = '${m.number}' AND chamber = '${m.chamber}'`,
    `${m.utahBill} is deduped on number + Utah chamber`);
  for (const it of m.issues || [])
    has(SQL, `AND issue_key = '${it.issueKey}'`,
      `${m.utahBill}/${it.issueKey} mapping is guarded against a re-run`);
}
eq((SQL.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length,
  w1Rolls.length, "every member-vote insert is re-runnable");
// Every write is sentinelled, so applying twice is a no-op rather than a double count.
eq((SQL.match(/IF NOT EXISTS \(SELECT 1 FROM vr_measure_issues/g) || []).length,
  w1Mappings, "every mapping insert is sentinelled");
const spotCheck = w1Votes.filter((x) => x.v.politicianId === "mschultz").length;
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
  w1Rolls.length, "one member-vote insert per roll call and no other write");
eq((SQL2.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length,
  w1Rolls.length, "every insert in the expansion migration is re-runnable");
eq((SQL2.match(/^ {4}\(rc, '/gm) || []).length, w1Votes.length,
  "every seeded member vote reached the expansion migration");
eq((SQL2.match(/SELECT id INTO rc FROM vr_rollcalls/g) || []).length, w1Rolls.length,
  "each roll call is looked up rather than assumed");
eq((SQL2.match(/RAISE EXCEPTION 'Utah 2025GS attribution: utah/g) || []).length, w1Rolls.length,
  "a missing roll call aborts the deploy rather than being created");
for (const { m, rc } of w1Rolls) {
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
has(verify, `IF n_rolls <> ${w1Rolls.length} THEN`,
  "the verification block counts the roll calls it expected to find");
has(verify, `IF n_votes < ${w1Votes.length} THEN`,
  "the verification block fails the deploy if the expansion did not land");
has(verify, "IF n_orphan > 0 THEN",
  "the verification block fails the deploy on a vote attributed off the map");
has(verify, "congress IS NULL", "the verification block counts state rows only");

// ── 7e. The vocab-wave delta lands the newly homed bills and nothing else ────
// Vocab wave V1 minted sound_money, dev_district_finance and tobacco_nicotine
// because two or more real Utah instruments had already been REFUSED for want of
// a key. Five of those bills had a contested floor roll, so they arrive with acts
// behind them rather than as empty chips. The risk in a delta is the mirror of the
// risk in an expansion migration: not that it writes too little, but that it
// re-asserts what an applied file already owns, or quietly widens its own scope to
// a whole session. What is pinned here is that it writes exactly five bills, that
// each one's key is one of the three the wave added, that each rationale cites the
// enrolled text it was read from, and that a chip with no roll behind it gets no
// rows at all.
section("The vocab-wave delta lands the newly homed bills and nothing else");
const NEW_KEYS = ["sound_money", "dev_district_finance", "tobacco_nicotine"];
for (const k of NEW_KEYS)
  ok(ISSUE_KEYS.has(k), `the wave's key '${k}' is in the generated allow-list`);
// Narrowness. No DDL, no deletes, and nothing that could reach a federal row.
for (const forbidden of ["CREATE ", "DROP ", "ALTER ", "TRUNCATE", "DELETE FROM",
  "UPDATE vr_", "chamber = 'house'", "chamber = 'senate'",
  "'bill', NULL, 'house'", "'bill', NULL, 'senate'"]) {
  lacks(SQLD, forbidden, `the delta contains no "${forbidden.trim()}"`);
}
has(SQLD, "congress IS NULL", "the delta dedupes state roll calls on a NULL congress");
lacks(SQLD, "congress = ", "the delta never matches a Congress number");
lacks(SQLD, "2023GS", "the delta writes nothing under 2023GS");

// The bills it owns, from both sessions' seeds, and the counts that follow.
const D2024 = J("db/vr-utah-vote-seed-2024GS.json").measures
  .filter((m) => isDelta("2024GS", m.utahBill));
const deltaMeasures = [...dMeasures.map((m) => ({ T: "2025GS", m })),
  ...D2024.map((m) => ({ T: "2024GS", m }))];
const deltaRolls = deltaMeasures.flatMap(({ T, m }) =>
  (m.rollcalls || []).map((rc) => ({ T, m, rc })));
const deltaVotes = deltaRolls.reduce((t, { rc }) => t + (rc.votes || []).length, 0);
// THE DELTA'S OWN ROWS ARE FROZEN; THE SEED'S ARE NOT. 20261010000000 is applied, so it
// owns exactly the 325 votes it wrote and no more. The wave-9 name admit then attributed
// 13 further printed names on the SAME rolls — H.B. 348 is one of the delta's bills and
// eleven of its recorded names had no roster identity when the delta ran. So the seed
// legitimately holds more than the delta does, and the delta's floor assertion
// (`IF n_votes < 325`) still holds because it is a floor. What is pinned is both numbers
// and the identity of the file that owns the difference — the one thing that would
// actually be wrong is the gap belonging to nobody.
const DELTA_OWNS = 325;
const deltaAdmitted = deltaVotes - DELTA_OWNS;
const deltaMappings = deltaMeasures.reduce((t, { m }) => t + (m.issues || []).length, 0);
must(deltaMeasures.length === 5, "the delta's five bills are not all in the seeds");
must(D2024.length === 1, "the 2024GS seed does not carry H.B. 348, so this proves nothing");
eq(deltaRolls.length, 7, "the delta's bills carry seven contested rolls between them");
eq(deltaVotes, 338, "the delta's rolls carry 338 attributed member votes in the seed");
eq(deltaAdmitted, 13,
  "13 of them were attributed after the delta ran, by the wave-9 name admit");
eq(deltaMappings, 5, "one mapping per newly homed bill");

eq((SQLD.match(/^DO \$\$/gm) || []).length, deltaMeasures.length + 1,
  "one DO block per newly homed bill, plus the verification block");
eq((SQLD.match(/--> statement-breakpoint/g) || []).length, deltaMeasures.length,
  "a breakpoint between every pair of statements and no empty ones");
eq((SQLD.match(/INSERT INTO vr_measures /g) || []).length, deltaMeasures.length,
  "one measure insert per newly homed bill");
eq((SQLD.match(/INSERT INTO vr_measure_issues /g) || []).length, deltaMappings,
  "one issue insert per mapping");
eq((SQLD.match(/IF NOT EXISTS \(SELECT 1 FROM vr_measure_issues/g) || []).length, deltaMappings,
  "every mapping insert is sentinelled");
eq((SQLD.match(/INSERT INTO vr_rollcalls /g) || []).length, deltaRolls.length,
  "one roll-call insert per roll call");
eq((SQLD.match(/^ {4}\(rc_id, '/gm) || []).length, DELTA_OWNS,
  "every member vote the delta could attribute reached the delta");
eq((SQLD.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length,
  deltaRolls.length, "every member-vote insert in the delta is re-runnable");

// Every key the delta writes is one of the three the wave added. A delta that can
// reach an old key is a delta that can restuff an old map, which is the one thing
// this wave promised not to do.
const writtenKeys = [...new Set((SQLD.match(/VALUES \(m_id, '([a-z_]+)'/g) || [])
  .map((r) => r.replace(/^.*'([a-z_]+)'$/, "$1")))];
must(writtenKeys.length > 0, "could not read the delta's issue keys");
for (const k of writtenKeys)
  ok(NEW_KEYS.indexOf(k) >= 0, `the delta writes '${k}', which is one of the wave's own keys`);
eq(new Set(writtenKeys).size, 2,
  `the delta writes the two keys that have floor acts behind them (${writtenKeys.join(", ")})`);
// tobacco_nicotine is the honest hole: both of its instruments are committee-only,
// their curator mappings exist, and the minutes roster does not. A chip with no
// attributable act must arrive with no rows rather than with guessed ones.
lacks(SQLD, "'tobacco_nicotine',",
  "tobacco_nicotine gets no rows while its votes are committee-only");
has(SQLD, "tobacco_nicotine gets NO rows here on purpose",
  "the delta says in prose why tobacco_nicotine is empty");

// Per bill: the measure is deduped on number + Utah chamber, the roll is looked up
// by the state tuple, and the mapping cites the ENROLLED text — which is also what
// external_ids records, so the explainer can link what the curator actually read.
for (const { T, m } of deltaMeasures) {
  has(SQLD, `'utahSession', '${T}', 'utahBill', '${m.utahBill}'`,
    `${T}/${m.utahBill}: the delta stamps its session and bill id`);
  has(SQLD, `WHERE number = '${m.number}' AND chamber = '${m.chamber}'`,
    `${T}/${m.utahBill}: is deduped on number + Utah chamber`);
  has(SQLD, "'mappingReadFrom', 'enrolled'",
    `${T}/${m.utahBill}: external_ids records that the mapping was read from the enrolled text`);
  for (const it of m.issues || []) {
    has(SQLD, `AND issue_key = '${it.issueKey}'`,
      `${T}/${m.utahBill}/${it.issueKey}: the mapping is guarded against a re-run`);
    ok(NEW_KEYS.indexOf(it.issueKey) >= 0,
      `${T}/${m.utahBill}: '${it.issueKey}' is one of the wave's keys, not an old one`);
  }
  for (const rc of m.rollcalls || []) {
    const houseLetter = rc.chamber === "utah house" ? "H" : "S";
    has(SQLD, `AND roll_number = ${rc.rollNumber} LIMIT 1`,
      `${T}/${m.utahBill}: roll call ${rc.rollNumber} is deduped in the delta`);
    has(SQLD, `voteid=${rc.rollNumber}&house=${houseLetter}`,
      `${T}/${m.utahBill}: roll call ${rc.rollNumber} cites its own vote page`);
  }
}
// The enrolled-text URL is a real citation, not the bill index page the ingest
// defaults to: every source_url in this file resolves to the enrolled XML.
const enrolled = (SQLD.match(/https:\/\/le\.utah\.gov\/[^' ]*[Ee]nrolled\/[A-Z0-9]+\.xml/g) || []);
ok(enrolled.length >= deltaMeasures.length * 2,
  `each newly homed bill cites the enrolled text more than once (${enrolled.length} citations)`);
lacks(SQLD, "'mappingReadFrom', 'summary'",
  "no mapping in the delta was read from a summary");

// Neither the 2025GS record migration nor the expansion migration claims a delta
// bill. Section 7d makes the same check for the archive sessions.
for (const { m } of dMeasures.map((m) => ({ m }))) {
  lacks(SQL, `'utahBill', '${m.utahBill}'`,
    `2025GS/${m.utahBill}: the applied record migration does not also claim it`);
  for (const rc of m.rollcalls || [])
    lacks(SQL2, `AND roll_number = ${rc.rollNumber};`,
      `2025GS/${m.utahBill}: the expansion migration does not also attribute roll ${rc.rollNumber}`);
}

// And a skipped sentinel must not read as success here either.
const dVerify = SQLD.slice(SQLD.indexOf("-- ── Verification"));
must(dVerify.length > 400, "could not isolate the delta's verification block");
has(dVerify, `IF n_measures <> ${deltaMeasures.length} THEN`,
  "the delta's verification counts the measures it added");
has(dVerify, `IF n_rolls <> ${deltaRolls.length} THEN`,
  "the delta's verification counts the roll calls it added");
has(dVerify, `IF n_votes < ${DELTA_OWNS} THEN`,
  "the delta's verification counts the member votes it added, as a floor a later wave may exceed");
has(dVerify, `IF n_issues <> ${deltaMappings} THEN`,
  "the delta's verification counts the mappings it added");
has(dVerify, "IF n_orphan > 0 THEN",
  "the delta's verification fails the deploy on a vote attributed off the map");
has(dVerify, "congress IS NULL", "the delta's verification counts state rows only");
// It counts its own five bills, not a whole session — an applied file owns the rest.
lacks(dVerify, "r.session = 2025", "the delta's verification does not claim a whole session");
const dStray = [...new Set((SQLD.match(/^ {4}\(rc_id, '([a-z0-9_]+)'/gm) || [])
  .map((r) => r.replace(/^.*'([a-z0-9_]+)'$/, "$1")))].filter((p) => !accepted.has(p));
// 2024GS pids are on that session's own map, so only the 2025GS ones are checked
// against `accepted` here; section 7d checks the archive's against its own map.
ok(dStray.every((p) => JSON.stringify(J("db/vr-utah-member-map-2024GS.json").chambers).includes(`"${p}"`)),
  `every pid the delta writes is on one of the reviewed maps (${dStray.join(", ")})`);

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
    measures: 29, rolls: 40, votes: 2308, issues: 34, dropped: 94,
    // H.B. 348 (sound_money) is the delta's; everything else is the record file's.
    migMeasures: 28, migRolls: 39, migVotes: 1885, migIssues: 33, migDropped: 442,
    admit: "netlify/database/migrations/20261020000000_vr_utah_2024gs_name_admit_floor_votes.sql",
    admitVotes: 364, admitPids: 14, admitRolls: 40,
    unmappedThen: { H: 16, S: 2 },
    unmapped: { H: 3, S: 1 }, refused: ["Judkins, M.", "Lyman, P."],
    crossChamber: ["Brammer, B.", "Musselman, C.R.", "Stratton, K."],
  },
  {
    session: "2023GS", year: 2023,
    mig: "netlify/database/migrations/20261003000000_vr_utah_2023gs_state_record.sql",
    measures: 40, rolls: 49, votes: 3004, issues: 49, dropped: 163,
    // No 2023GS bill got a home from vocab wave V1, so the delta owns nothing here.
    migMeasures: 40, migRolls: 49, migVotes: 2490, migIssues: 49, migDropped: 677,
    admit: "netlify/database/migrations/20261021000000_vr_utah_2023gs_name_admit_floor_votes.sql",
    admitVotes: 514, admitPids: 15, admitRolls: 49,
    unmappedThen: { H: 17, S: 3 },
    unmapped: { H: 4, S: 1 }, refused: ["Judkins, M.", "Lyman, P."],
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
  // Which file is entitled to own each of this session's rows.
  const owns = (bill) => (isDelta(T, bill) ? SQLD : aSql);
  const aw1Measures = aMeasures.filter((m) => !isDelta(T, m.utahBill));
  const aw1Rolls = aRolls.filter(({ m }) => !isDelta(T, m.utahBill));
  must(aw1Measures.length === A.migMeasures,
    `${T}: the seed's non-delta half is ${aw1Measures.length}, not the pinned ${A.migMeasures}`);

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
  eq((aSql.match(/INSERT INTO vr_measures /g) || []).length, A.migMeasures,
    `${T}: one measure insert per bill the record migration admitted`);
  eq((aSql.match(/INSERT INTO vr_rollcalls /g) || []).length, A.migRolls,
    `${T}: one roll-call insert per roll call it owns`);
  eq((aSql.match(/INSERT INTO vr_measure_issues /g) || []).length, A.migIssues,
    `${T}: one issue insert per mapping it owns`);
  eq((aSql.match(/^ {4}\(rc_id, '/gm) || []).length, A.migVotes,
    `${T}: every member vote it owns reached the migration`);
  eq((aSql.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, A.migRolls,
    `${T}: every member-vote insert is re-runnable`);
  for (const other of ["2025GS", "2024GS", "2023GS"].filter((x) => x !== T)) {
    lacks(aSql, other, `${T}: the migration writes nothing under ${other}`);
  }
  for (const { m, rc } of aRolls) {
    has(owns(m.utahBill), `'utahSession', '${T}', 'utahBill', '${m.utahBill}'`,
      `${T}/${m.utahBill}: the measure carries its session in external_ids`);
    has(owns(m.utahBill), `AND roll_number = ${rc.rollNumber}`,
      `${T}/${m.utahBill}: roll call ${rc.rollNumber} is looked up by its own number`);
    // And the file that does NOT own it never mentions it, so the two files cannot
    // both be writing the same act.
    if (isDelta(T, m.utahBill))
      lacks(aSql, `'utahBill', '${m.utahBill}'`,
        `${T}/${m.utahBill}: the applied record migration does not also claim it`);
  }
  const aStrayMig = [...new Set((aSql.match(/^ {4}\(rc_id, '([a-z0-9_]+)'/gm) || [])
    .map((r) => r.replace(/^.*'([a-z0-9_]+)'$/, "$1")))].filter((p) => !aAccepted.has(p));
  eq(aStrayMig.length, 0,
    `${T}: every pid the migration writes comes from the accepted map (${aStrayMig.join(", ")})`);
  // The dropped votes are disclosed by count and by name, and a REFUSED name is
  // disclosed as a refusal — the distinction is the whole point of keeping both lists.
  // These are the counts the RECORD migration disclosed WHEN IT RAN, not the map's
  // residue today. The wave-9 name admit attributed most of them, and an applied
  // migration is never edited to match a later truth — it is a statement about what
  // that file wrote, and it was correct. What has to stay true is that the file still
  // discloses its own gap by count and by name, and that the gap it left is accounted
  // for downstream: `unmappedThen` below equals the residue plus the admits.
  has(aSql, `NOT WRITTEN — ${A.unmappedThen.H} member(s) of the utah house`,
    `${T}: the record migration discloses the ${A.unmappedThen.H} House names IT could not attribute`);
  has(aSql, `NOT WRITTEN — ${A.unmappedThen.S} member(s) of the utah senate`,
    `${T}: the record migration discloses the ${A.unmappedThen.S} Senate names IT could not attribute`);
  has(aSql, `${A.refused.length} of those (${A.refused.join("; ")}) are REFUSALS rather than gaps`,
    `${T}: the migration calls a refusal a refusal`);
  has(aSql, `db/vr-utah-member-map-${T}.json`,
    `${T}: the migration's refusal note points at this session's own map`);
  has(aSql, String(A.migDropped), `${T}: the migration states how many vote rows are absent`);
  const aVerify = aSql.slice(aSql.indexOf("-- ── Verification"));
  must(aVerify.length > 400, `${T}: could not isolate the migration's verification block`);
  has(aVerify, `IF n_measures <> ${A.migMeasures} THEN`, `${T}: the verification counts measures`);
  has(aVerify, `IF n_rolls <> ${A.migRolls} THEN`, `${T}: the verification counts roll calls`);
  has(aVerify, `IF n_votes < ${A.migVotes} THEN`, `${T}: the verification counts member votes`);
  has(aVerify, `IF n_issues <> ${A.migIssues} THEN`, `${T}: the verification counts issue mappings`);
  has(aVerify, "IF n_orphan > 0 THEN",
    `${T}: the verification fails the deploy on a vote attributed off the map`);
  has(aVerify, "congress IS NULL", `${T}: the verification counts state rows only`);
  has(aVerify, `r.session = ${A.year}`, `${T}: the verification counts this session's rows`);
}

// ── 7e. The name admit attributes people, never invents them ────────────────
// WHAT WENT WRONG AND WHAT THIS PINS. Both archive sessions shipped with a residue:
// printed names left in `unmapped` because the people behind them were on no PolitiDex
// roster when the floor map was written. Later waves put them on the roster and nobody
// went back, so their roll-call votes stayed parsed and dropped while their files sat
// empty or thin. Wave 9 re-ran that one stale fence.
//
// A pass that ADDS attributions is the most dangerous kind in this lane, because the
// cheapest way to make a thin file look full is to relax who a printed name is allowed
// to be. So this section does not check that the admits happened — it checks that they
// could not have been guessed, and that everything the admit did NOT reach is still
// visibly refused rather than quietly absorbed.
section("The name admit attributes people, never invents them");
// The roster, read the way the ingest reads it: cmp-data.js is a browser file, so it is
// evaluated against a window stub rather than imported.
const winR = {};
new Function("window", R("cmp-data.js"))(winR);
const ROSTER = new Set(Object.keys(winR.CMP_DATA || {}));
must(ROSTER.size > 100, "cmp-data.js did not yield a roster, so the created-nobody check proves nothing");
for (const A of ARCHIVE) {
  const T = A.session;
  const aMap = J(`db/vr-utah-member-map-${T}.json`);
  const cMap = J(`db/vr-utah-committee-map-${T}.json`);
  const aSql = R(A.mig);
  const mSql = R(A.admit);
  const admitted = aMap._wave9Admitted || {};
  const admitPids = new Set(Object.values(admitted));

  // 1. THE ARITHMETIC CLOSES. Every name the record migration disclosed as unattributed
  //    is either attributed now or still listed as unattributed. A name that is in
  //    neither column has gone missing, which is how a disclosed gap becomes an
  //    undisclosed one.
  for (const house of ["H", "S"]) {
    const admittedHere = Object.keys(admitted).filter((k) => k.startsWith(house + " ")).length;
    eq(admittedHere + A.unmapped[house], A.unmappedThen[house],
      `${T}/${house}: ${A.unmappedThen[house]} disclosed unattributed = ${admittedHere} admitted + ${A.unmapped[house]} still unattributed`);
  }
  eq(admitPids.size, A.admitPids, `${T}: the map records ${A.admitPids} wave-9 admissions`);
  eq(Object.keys(admitted).length, admitPids.size,
    `${T}: no two printed forms were admitted onto one roster id`);

  // 2. THE ADMITTED SET IS THE MAPPED SET. A pid claimed in the note but absent from
  //    `chambers` would mean the prose and the mapping disagree; the reverse would mean
  //    a mapping arrived without the note that justifies it.
  const nowMapped = new Map();
  for (const house of ["H", "S"])
    for (const [printed, pid] of Object.entries(aMap.chambers[house] || {})) nowMapped.set(`${house} ${printed}`, pid);
  for (const [k, pid] of Object.entries(admitted)) {
    eq(nowMapped.get(k), pid, `${T}: the admitted form "${k}" is mapped to ${pid} in chambers`);
    // The vote page prints no district for a member who had left, so nothing here may
    // claim a district confirmed the identity.
    eq(aMap.confirmedByDistrict[k.slice(0, 1)][k.slice(2)], false,
      `${T}: "${k}" is not claimed as district-confirmed`);
  }

  // 3. NOTHING WAS ADDED TO THE ROSTER. An admit may only point at a record that already
  //    exists — creating a person to receive a vote is the failure this whole lane is
  //    built to prevent.
  for (const pid of admitPids)
    ok(ROSTER.has(pid), `${T}: ${pid} was already on the roster; the admit created nobody`);

  // 4. GATE TWO IS REAL. Every admitted pid must appear in the SAME session's reviewed
  //    committee map under a printed form with the same surname, in the same chamber.
  //    That is the human-accepted decision the admit reuses instead of making a new one.
  for (const [k, pid] of Object.entries(admitted)) {
    const house = k.slice(0, 1);
    const surname = k.slice(2).split(",")[0].trim();
    const forms = Object.entries((cMap.printedForms || {})[house] || {})
      .filter(([, v]) => v.politicianId === pid);
    eq(forms.length, 1, `${T}: ${pid} has exactly one accepted committee form in ${house}`);
    has(forms[0][0], surname, `${T}: the committee form "${forms[0][0]}" carries the surname "${surname}"`);
    ok(String(forms[0][1].confirmedBy || "").length > 0,
      `${T}: the committee map's decision on ${pid} names what confirmed it`);
  }

  // 5. GATE THREE IS NAMED IN THE MIGRATION, with the year whose roster was read.
  has(mSql, `roster.asp?year=${A.year}`,
    `${T}: the admit migration names the roster it was confirmed against`);
  has(mSql, `db/vr-utah-committee-map-${T}.json`,
    `${T}: the admit migration names the reviewed map it reused`);

  // 6. A REFUSAL SURVIVED THE PASS. The names the committee map refuses by name are the
  //    exact names the admit must not have reached, and they must still be disclosed as
  //    unattributed rather than dropped from the file.
  const stillUnmapped = new Set(aMap.unmapped.H.concat(aMap.unmapped.S).map((u) => u.printed));
  const cRefused = [...new Set([...(cMap._refusedNames.H || []), ...(cMap._refusedNames.S || [])]
    .map((n) => n.replace(/^(?:Rep|Sen)\.\s+[A-Z]\.?\s+/, "")))];
  must(cRefused.length >= 3, `${T}: the committee map refuses fewer than three names, so this proves nothing`);
  for (const sur of cRefused) {
    const reached = Object.keys(admitted).filter((k) => k.slice(2).startsWith(sur + ","));
    eq(reached.length, 0, `${T}: the committee map refuses "${sur}", and the admit did not reach it`);
    ok([...stillUnmapped].some((pnt) => pnt.startsWith(sur + ",")),
      `${T}: "${sur}" is still disclosed among the names that got no votes`);
  }
  for (const n of A.refused) ok(!admitPids.size || !Object.keys(admitted).some((k) => k.slice(2) === n),
    `${T}: the refused name "${n}" was not admitted`);

  // 7. THE MIGRATION IS THE SEED'S DELTA AND NOTHING MORE. Member votes only, no DDL,
  //    no other session, one re-runnable insert per roll, and every row belongs to a pid
  //    the map records as admitted. A stray pid here is a vote published under a stranger.
  for (const forbidden of ["CREATE ", "DROP ", "ALTER ", "TRUNCATE", "DELETE FROM",
    "UPDATE vr_", "INSERT INTO vr_measures", "INSERT INTO vr_rollcalls",
    "INSERT INTO vr_measure_issues", "INSERT INTO vr_positions"]) {
    lacks(mSql, forbidden, `${T}: the admit migration contains no "${forbidden.trim()}"`);
  }
  for (const other of ["2025GS", "2024GS", "2023GS"].filter((x) => x !== T))
    lacks(mSql, other, `${T}: the admit migration writes nothing under ${other}`);
  has(mSql, "congress IS NULL", `${T}: the admit migration dedupes state roll calls on a NULL congress`);
  const mRows = mSql.match(/^ {4}\(rc, '([a-z0-9_]+)', '([a-z_]+)'\)/gm) || [];
  eq(mRows.length, A.admitVotes, `${T}: ${A.admitVotes} member votes reached the admit migration`);
  eq((mSql.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, A.admitRolls,
    `${T}: every member-vote insert in the admit migration is re-runnable`);
  eq((mSql.match(/^  SELECT id INTO rc FROM vr_rollcalls$/gm) || []).length, A.admitRolls,
    `${T}: one roll-call lookup per roll it adds to`);
  eq((mSql.match(/RAISE EXCEPTION 'Utah \S+ name admit: utah (?:house|senate)/g) || []).length, A.admitRolls,
    `${T}: a missing roll call RAISEs rather than being invented`);
  const mStray = [...new Set(mRows.map((r) => r.replace(/^.*'([a-z0-9_]+)', '[a-z_]+'\)$/, "$1")))]
    .filter((pid) => !admitPids.has(pid));
  eq(mStray.length, 0,
    `${T}: every pid in the admit migration is one the map records as admitted (${mStray.join(", ")})`);

  // 8. AND IT IS THE ARITHMETIC OF THE THREE FILES. The seed's votes equal what the
  //    record migration owns, plus what the vocab delta owns on this session's rolls,
  //    plus what the admit owns. A number that does not close means one file is writing
  //    another's rows.
  const dOwnsHere = T === "2024GS" ? DELTA_OWNS - deltaMeasures.filter((x) => x.T === "2025GS")
    .reduce((t, { m }) => t + (m.rollcalls || []).reduce((n, rc) => n + (rc.votes || []).length, 0), 0) : 0;
  eq(A.migVotes + dOwnsHere + A.admitVotes, A.votes,
    `${T}: ${A.migVotes} (record) + ${dOwnsHere} (vocab delta) + ${A.admitVotes} (admit) = ${A.votes} seeded votes`);

  // 9. AND THE PROSE IS THERE. A pass that changes who a vote belongs to has to say so
  //    in the file a reviewer opens, not only in a migration nobody re-reads.
  for (const key of ["_wave9NameAdmit", "_unmappedIsCoverage"])
    ok(String(aMap[key] || "").length >= 400, `${T}: ${key} explains itself in prose`);
  has(aMap._wave9NameAdmit, `roster.asp?year=${A.year}`,
    `${T}: the map's own note names the roster the admit was confirmed against`);
  lacks(aMap._unmappedIsCoverage, "roster decision for a later wave",
    `${T}: the coverage note no longer defers a decision this wave made`);
  ok(!/still being built|record still/i.test(String(aMap._unmappedIsCoverage)),
    `${T}: the coverage note does not call a refusal on the merits unfinished work`);
  // The record migration is untouched: it is applied, and its disclosure was true.
  has(aSql, `NOT WRITTEN — ${A.unmappedThen.H} member(s) of the utah house`,
    `${T}: the applied record migration was not rewritten to match the new truth`);
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
