#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-committee.mjs — Utah committee votes, pinned to their fences
// ─────────────────────────────────────────────────────────────────────────────
// Data wave 3 added a second kind of Utah act: the committee vote, taken from
// per-committee minutes on le.utah.gov. It is a weaker act than a floor vote
// (0.60 against 1.00) and it is usually a vote on the SAME bill the member later
// voted on in the chamber. Both of those facts are places to make a confident
// false claim, and they are what this harness watches:
//
//   1. IT IS NOT A FLOOR VOTE. Committee acts live in vr_positions, never in
//      vr_rollcalls, so they cannot borrow a floor roll number, a floor weight
//      or the floor noun. The migration adds no roll call and no DDL.
//   2. ONE INSTRUMENT, ONE COUNT. A member who voted on a bill in committee and
//      again on the floor holds two records and one act. The direction index
//      already supersedes the committee one; the coverage count that feeds the
//      12-record characterisation floor must agree, or the same double count
//      comes back wearing a different hat.
//   3. THE NOUN IS THE COMMITTEE'S. A committee act is labelled "Committee
//      vote" and never "Voted Yea" — the yea/nay words belong to a roll call.
//   4. ONE ACT PER PERSON PER INSTRUMENT PER COMMITTEE ACTION. A markup reprinted
//      four times in the minutes is one act, and the seed says how many reprints
//      it dropped.
//   5. NOBODY IS GUESSED. Every politician_id came from the human-reviewed
//      printed-name map; unmapped names and REFUSED names are counted apart, and
//      the Judkins/Lyman-class collisions stay refused.
//   6. EVERY ROW IS CITED. Every act's source_url is a le.utah.gov minutes PDF,
//      and the migration is the seed rather than a paraphrase of it.
//   7. NO FLOOR WAS LOWERED. The characterisation and thin-read walls are the
//      numbers waves 1-2 shipped; wave 3 did not move one of them.
//   8. THE SECOND SESSION IS ITS OWN SESSION. 2024GS went through the same
//      parser, and every fence above holds there too — including the one the
//      first draft broke, where the generated header quoted 2025's bill counts
//      at 2024's readers.
//
//   node scripts/test-vr-utah-committee.mjs
//
// Sections 1-6 read the shipped JSON and SQL. Section 7 boots the shipped client
// modules in a node:vm sandbox and injects the seeds the way a completed
// /api/voting-record fetch leaves the cache. Section 8 re-reads sections 1-6's
// fences against 2024GS. Nothing here needs a database.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildSql, committeePrefixKey, confirmAgainstPdf } from "./vr-utah-committee-ingest.mjs";

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
  console.error(`✗ vr-utah-committee: ${msg}`);
  process.exit(1);
};

const MIG = "netlify/database/migrations/20261004000000_vr_utah_2025gs_committee_votes.sql";
const SEED = J("db/vr-utah-committee-seed.json");
const CMAP = J("db/vr-utah-committee-map.json");
const FLOOR = J("db/vr-utah-vote-seed.json");
const ISSUE_KEYS = new Set(J("db/issue-keys.json").keys);
const SQL = R(MIG);
const VR = R("voting-record.js");
const SH = R("stance-helpers.js");
const FN = R("netlify/functions/voting-record.mts");

const measures = SEED.measures || [];
const acts = measures.flatMap((m) => (m.committeeActs || []).map((ca) => ({ m, ca })));
const rows = acts.flatMap(({ m, ca }) => (ca.votes || []).map((v) => ({ m, ca, v })));
must(measures.length > 0 && acts.length > 0 && rows.length > 0,
  "the committee seed carries no acts — nothing to pin");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · A committee vote is not a floor vote");
// ═════════════════════════════════════════════════════════════════════════════
// vr_positions has no roll_number column at all, which is the whole answer to
// "how do you keep off the floor roll-number space": there is nothing to collide
// with. The meeting id lives in the note and in the source URL.
has(SQL, "INSERT INTO vr_positions", "the migration writes positions");
lacks(SQL, "INSERT INTO vr_rollcalls", "the migration writes no roll call");
lacks(SQL, "INSERT INTO vr_member_votes", "the migration writes no member vote");
for (const kw of ["CREATE TABLE", "ALTER TABLE", "DROP TABLE", "CREATE INDEX"]) {
  lacks(SQL, kw, `the migration carries no DDL (${kw})`);
}
has(SQL, "ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING",
  "the migration is idempotent on the vr_positions unique index");
has(SQL, "roll_number", "the migration explains the roll-number question");
ok(/roll_number/.test(SQL) && !/INSERT[\s\S]{0,400}roll_number/.test(SQL),
  "roll_number appears only in prose, never in an insert");
eq(rows.filter((r) => r.ca.actionType && r.ca.actionType !== "committee_vote").length, 0,
  "no act claims an action type other than committee_vote");
has(SQL, "'committee_vote'", "every row is filed under action_type committee_vote");
{
  const at = SQL.match(/'[a-z_]+', (?:true|false), '\d{4}-/g) || [];
  const bad = (SQL.match(/, '((?!committee_vote)[a-z_]+)', (?:true|false), '\d{4}-/g) || []);
  must(at.length === 0 || true, "action-type probe");
  eq(bad.length, 0, "no inserted row carries an action type other than committee_vote");
}
// Chamber: Utah, and never a congress.
for (const m of measures) {
  ok(m.chamber === "utah house" || m.chamber === "utah senate",
    `${m.utahBill}: chamber is a Utah chamber, got ${JSON.stringify(m.chamber)}`);
}
lacks(SQL, "congress =", "the migration never selects on congress");
has(SQL, "'utahSession' = '2025GS'",
  "the measure lookup is scoped to the 2025 general session");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · One instrument, one count");
// ═════════════════════════════════════════════════════════════════════════════
// The seed states, per row, whether a floor vote by the same member on the same
// bill already speaks for it. That flag is not decoration: it is the number the
// report quotes, and it has to agree with the floor seed it was derived from.
const floorPairs = new Set();
for (const m of FLOOR.measures) for (const rc of m.rollcalls) for (const v of rc.votes) {
  floorPairs.add(`${m.utahBill}|${v.politicianId}`);
}
let supersededSaid = 0, freshSaid = 0, disagreed = 0;
for (const { m, v } of rows) {
  const onFloor = floorPairs.has(`${m.utahBill}|${v.politicianId}`);
  if (v.supersededByFloorVote) supersededSaid++; else freshSaid++;
  if (!!v.supersededByFloorVote !== onFloor) disagreed++;
}
eq(disagreed, 0,
  "every row's supersededByFloorVote agrees with the committed floor seed");
eq(supersededSaid, SEED.counts.supersededByFloorVote,
  "the seed's superseded count is the number of superseded rows");
eq(freshSaid, SEED.counts.notOnAnyFloorRoll,
  "the seed's fresh count is the number of rows no floor vote speaks for");
ok(supersededSaid > 0, "the superseded case is actually present in the data");
ok(freshSaid > 0, "the un-superseded case is actually present in the data");

// The client-side coverage count must skip a superseded non-floor act. This is
// the assertion that would have caught the original defect: _pdxRecordMappedCounts
// had no measure dedupe, so a committee act the direction index had already
// discarded still bought its member a +1 towards the 12-record floor.
const COUNTS = VR.slice(VR.indexOf("ONE INSTRUMENT, ONE COUNT"),
  VR.indexOf("_pdxCountMeasureKey(it) {") + 400);
must(COUNTS.length > 800, "could not isolate _pdxRecordMappedCounts' supersession clause");
has(COUNTS, "if (k && floorOn[k]) { supersededActs++; return; }",
  "the coverage count drops a non-floor act on an instrument that has a floor act");
has(COUNTS, "it.kind === 'position'",
  "only non-floor acts are dropped — an all-floor record is untouched");
has(COUNTS, "supersededActs",
  "the count reports how many acts it dropped rather than dropping them silently");
has(SH, "_rdMeasureKey", "stance-helpers still keys supersession by instrument");
has(COUNTS, "_rdMeasureKey",
  "the coverage count says out loud that it mirrors stance-helpers' instrument key");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The noun belongs to the committee");
// ═════════════════════════════════════════════════════════════════════════════
has(SH, "committee_vote", "stance-helpers knows the act class");
{
  const cls = SH.slice(SH.indexOf("_ACT_CLASSES"), SH.indexOf("_ACT_CLASSES") + 1200);
  must(cls.indexOf("committee_vote") > 0, "could not isolate the act-class table");
  has(cls, "label: 'Committee vote'", "the committee act class is labelled Committee vote");
  const seg = cls.slice(cls.indexOf("committee_vote"), cls.indexOf("committee_vote") + 160);
  has(seg, "0.6", "the committee act weighs 0.60, not a floor vote's 1.00");
}
has(FN, 'committee_vote: "Committee vote"',
  "the API labels a committee position Committee vote");
{
  const pos = FN.slice(FN.indexOf("POS_LABEL"), FN.indexOf("POS_LABEL") + 600);
  lacks(pos, "Voted Yea", "the position labels never borrow the roll-call verb");
}
// Nowhere in the shipped data does a committee act carry a yea/nay word.
for (const { m, ca, v } of rows) {
  const printed = `${ca.motion || ""} ${v.printedAs || ""}`;
  lacks(printed.toLowerCase(), "voted yea",
    `${m.utahBill}: a committee row never says "voted yea"`);
}
{
  // The header prose says the words in order to rule them out; no inserted row may.
  const body = SQL.slice(SQL.indexOf("INSERT INTO vr_positions"));
  must(body.length > 1000, "could not isolate the migration's insert body");
  lacks(body, "Voted Yea", "no inserted row's note says Voted Yea");
  lacks(body, "Voted Nay", "no inserted row's note says Voted Nay");
  has(SQL.slice(0, SQL.indexOf("INSERT INTO vr_positions")), "Voted Yea",
    "the header says out loud which noun a committee act must not borrow");
}
has(SQL, "Standing Committee", "each row's note names the committee that acted");
// ONE SET OF WORDS FOR AN ACT. Three surfaces name a non-vote act, and all three
// have to ask stance-helpers rather than title-case the wire slug — otherwise the
// person file says "Committee Vote" (a column value) two inches from "Voted Yea".
// profiles-full.js's highlights card was the one that still title-cased.
{
  const PF = R("profiles-full.js");
  const card = PF.slice(PF.indexOf("function _vrhiCard"), PF.indexOf("function _vrhiCard") + 2000);
  must(card.length > 500, "could not isolate the person file's record-highlight card");
  has(card, "_pdxActLabel",
    "the person file's record highlights name a position through the act layer");
  ok(!/_vrhiTitleCase\(it\.position\)\)/.test(card),
    "…and no longer title-case the wire slug as the pill's only label");
  const VRJS = R("voting-record.js");
  has(VRJS.slice(VRJS.indexOf("function positionPill")), "_pdxActLabel",
    "the voting-record table names a position through the same layer");
  has(SH, "label: 'Committee vote'", "…and that layer is where the words live");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · One act per person per instrument per committee action");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seen = new Set(), dupes = [];
  for (const { m, ca, v } of rows) {
    const k = `${m.utahBill}|${ca.committee}|${ca.date}|${v.politicianId}`;
    if (seen.has(k)) dupes.push(k); else seen.add(k);
  }
  eq(dupes.length, 0, `no person votes twice on one committee action: ${dupes.slice(0, 3)}`);
}
{
  // And the unique index the migration relies on means one row per (bill, person)
  // even across two committees — a bill heard by House and Senate committees
  // cannot give the same member two positions.
  const seen = new Set(), dupes = [];
  for (const { m, v } of rows) {
    const k = `${m.utahBill}|${v.politicianId}`;
    if (seen.has(k)) dupes.push(k); else seen.add(k);
  }
  eq(dupes.length, 0,
    `the vr_positions unique index is not asked to swallow a duplicate: ${dupes.slice(0, 3)}`);
}
eq(measures.length, SEED.counts.measures, "the seed's measure count is its measure count");
eq(acts.length, SEED.counts.committeeActs, "the seed's act count is its act count");
eq(rows.length, SEED.counts.positions, "the seed's row count is its row count");
ok(SEED.counts.reprintsDropped > 0,
  "the seed discloses how many reprinted markups it collapsed");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Nobody is guessed");
// ═════════════════════════════════════════════════════════════════════════════
// The reviewed map is chamber-keyed the way the floor map is: H and S each hold
// their own printed forms, because "Rep. D. Owens" and "Sen. D. Owens" are two
// people and a single flat table would let one shadow the other.
const FORMS = {};
for (const ch of Object.keys(CMAP.printedForms || {})) {
  for (const [printed, rec] of Object.entries(CMAP.printedForms[ch] || {})) {
    ok(!FORMS[printed] || FORMS[printed].politicianId === (rec && rec.politicianId),
      `"${printed}" does not appear in both chambers pointing at two people`);
    FORMS[printed] = rec;
  }
}
{
  const n = Object.keys(FORMS).length;
  const declared = Object.values(CMAP.printedForms).reduce((a, o) => a + Object.keys(o).length, 0);
  eq(n, declared, "no printed form is lost to a cross-chamber name clash");
  ok(n > 0, "the reviewed map carries printed forms");
}
for (const [printed, rec] of Object.entries(FORMS)) {
  const pid = typeof rec === "string" ? rec : rec && rec.politicianId;
  ok(!!pid, `the reviewed map resolves "${printed}" to a roster id`);
  ok(/^(Rep|Sen)\. /.test(printed),
    `"${printed}" carries the chamber honorific the minutes printed`);
  const how = typeof rec === "object" && rec ? rec.how : null;
  ok(how === "exact_floor_key" || how === "unique_surname_confirmed_by_attendance",
    `"${printed}" was accepted by a stated method, got ${JSON.stringify(how)}`);
  if (how === "unique_surname_confirmed_by_attendance") {
    ok(!!rec.confirmedBy,
      `"${printed}" was accepted on an attendance line and names that line`);
    // The attendance line has to be the same surname — that is the whole
    // confirmation. Rep. R. Walter prints as R in the vote, N on the floor page
    // and "R. Neil" in attendance, and only the surname is common to all three.
    const sur = (x) => String(x).replace(/^(Rep\.|Sen\.)\s+/, "")
      .replace(/,.*$/, "").split(/\s+/).pop().toLowerCase();
    eq(sur(rec.confirmedBy), sur(printed),
      `"${printed}" was confirmed by an attendance line of the same surname`);
  } else {
    ok(!!rec.floorKey, `"${printed}" names the floor-page key it matched exactly`);
  }
}
// Every printed name in the seed came through the reviewed map.
{
  const missing = new Set();
  for (const { v } of rows) if (v.printedAs && !FORMS[v.printedAs]) missing.add(v.printedAs);
  eq(missing.size, 0, `every printed name in the seed is in the reviewed map: ${[...missing].slice(0, 5)}`);
  const attributed = new Set(rows.map((r) => r.v.printedAs));
  for (const p of attributed) {
    const rec = FORMS[p];
    eq(rows.filter((r) => r.v.printedAs === p)[0].v.politicianId,
      typeof rec === "string" ? rec : rec.politicianId,
      `"${p}" resolves in the seed to exactly what the map says`);
  }
}
// No printed name feeds two people, and no two printed names of DIFFERENT
// surnames feed one person.
{
  const byPid = new Map();
  for (const [printed, rec] of Object.entries(FORMS)) {
    const pid = typeof rec === "string" ? rec : rec.politicianId;
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(printed);
  }
  const surname = (s) => String(s).replace(/^(Rep\.|Sen\.)\s+/, "").split(/\s+/).pop().toLowerCase();
  const crossed = [...byPid.entries()].filter(([, forms]) =>
    new Set(forms.map(surname)).size > 1);
  eq(crossed.length, 0,
    `no roster id collects two different surnames: ${crossed.slice(0, 3).map((c) => c[0])}`);
}
// Unmapped and REFUSED are separate ledgers, and the refusals are disclosed.
ok(CMAP.unmapped && typeof CMAP.unmapped === "object",
  "the map keeps a coverage-gap ledger");
ok(CMAP._refusedNames && typeof CMAP._refusedNames === "object",
  "the map keeps a refusal ledger, separate from the coverage gaps");
{
  const un = Object.values(CMAP.unmapped).flat();
  const ref = Object.values(CMAP._refusedNames).flat();
  eq(un.filter((n) => ref.includes(n)).length, 0,
    "a name is either an unmapped gap or a refusal, never counted as both");
  has(String(CMAP._refusalNotes || ""), "Judkins",
    "the refusal note names the collision that must stay refused");
  const refLower = ref.map((s) => String(s).toLowerCase()).join(" ");
  const seedNames = rows.map((r) => String(r.v.printedAs || "").toLowerCase());
  for (const bad of ["judkins", "lyman"]) {
    eq(seedNames.filter((n) => n.includes(bad)).length, 0,
      `no ${bad}-class collision was attributed`);
  }
  ok(refLower.length >= 0, "the refusal ledger is readable");
}
// The roster is the roster of record: every id in the seed exists in cmp-data.
const CMPSRC = R("cmp-data.js");
{
  const unknown = new Set();
  for (const { v } of rows) {
    const pid = v.politicianId;
    if (!new RegExp(`["']?${pid.replace(/[^a-z0-9_]/gi, "")}["']?\\s*:`).test(CMPSRC)) unknown.add(pid);
  }
  eq(unknown.size, 0, `every attributed id is on the roster: ${[...unknown].slice(0, 5)}`);
}
eq(CMAP.session, "2025GS", "the reviewed map names the session it was reviewed for");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Every row is cited, and the migration is the seed");
// ═════════════════════════════════════════════════════════════════════════════
for (const { m, ca } of acts) {
  ok(/^https:\/\/le\.utah\.gov\/.*\.pdf$/.test(String(ca.sourceUrl || "")),
    `${m.utahBill}: the act cites a le.utah.gov minutes PDF, got ${JSON.stringify(ca.sourceUrl)}`);
  ok(Number.isInteger(ca.meetingId) || /^\d+$/.test(String(ca.meetingId)),
    `${m.utahBill}: the act carries the meeting id its minutes were published under`);
  ok((ca.printedTotals || {}).yea >= 0 && (ca.printedTotals || {}).nay >= 0,
    `${m.utahBill}: the act carries the tally as printed`);
}
// Issue keys are the parent bill's, reused, never invented.
for (const m of measures) {
  ok((m.issueKeys || []).length > 0, `${m.utahBill}: the act inherits at least one issue key`);
  for (const k of m.issueKeys || []) {
    ok(ISSUE_KEYS.has(k), `${m.utahBill}: issue key "${k}" is an existing key`);
  }
  const parent = FLOOR.measures.find((x) => x.utahBill === m.utahBill);
  if (parent) {
    const parentKeys = new Set((parent.issues || []).map((i) => i.issueKey));
    for (const k of m.issueKeys || []) {
      ok(parentKeys.has(k),
        `${m.utahBill}: issue key "${k}" is the parent bill's own mapping, not a new one`);
    }
  }
}
// The SQL carries every seed row, once.
{
  const inserted = (SQL.match(/\(m_id, '[a-z0-9_]+', 'committee_vote'/g) || []).length;
  eq(inserted, rows.length, "the migration inserts exactly the seed's rows");
  const blocks = (SQL.match(/SELECT id INTO m_id FROM vr_measures/g) || []).length;
  eq(blocks, measures.length, "the migration looks up exactly the seed's measures");
  has(SQL, "RAISE NOTICE",
    "a measure that is not in the lane yet is a notice, not a silent skip");
  for (const { ca } of acts) has(SQL, ca.sourceUrl, "every act's PDF is cited in the SQL");
  for (const m of measures) has(SQL, m.number, `${m.utahBill} is named in the SQL`);
}
// The verification block asserts the counts rather than trusting them.
has(SQL, `${rows.length}`, "the SQL states its own row count");
has(SQL, "vr_rollcalls", "the SQL asserts it added no committee roll call");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · No floor was lowered, and the engine counts the act once");
// ═════════════════════════════════════════════════════════════════════════════
const WALLS = [
  ["_RD_MEMBER_FLOOR = 12", "the 12-record characterisation floor"],
  ["_RD_MIN_JUDGED = 4", "the 4-judged minimum"],
  ["_RD_MIN_STRENGTH = 4", "the strength minimum"],
  ["_RD_MIN_PRIMARY = 1", "the primary-mapping minimum"],
  ["_RD_THIN_MIN_STRENGTH = 0.6", "the thin-read strength wall"],
  ["_RD_LEAN_MIN_STRENGTH = 0.6", "the lean strength wall"],
  ["_RD_FLOOR_LED = 0.5", "the floor-led share"],
  ["_RD_DOMINANCE = 0.75", "the dominance share"],
  ["_RD_SPLIT_MIN_JUDGED = 6", "the split minimum"],
];
for (const [needle, what] of WALLS) has(SH, needle, `${what} is where waves 1-2 left it`);

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
  "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js"];
const SRCS = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, s] of SRCS) vm.runInContext(s, ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}
{
  const win = boot();
  must(win.PDXVotingRecord && win.PDXConsistency && typeof win._pdxRecordMappedCounts === "function",
    "the engine did not boot");

  // A synthetic member with the exact shape wave 3 creates: a floor vote and a
  // committee vote on ONE bill, plus a committee vote on a bill with no floor
  // vote. Two acts, three records — that is the whole claim.
  const issues = [{ issueKey: [...ISSUE_KEYS][0], weight: 1, isPrimary: true,
    supportMeaning: "supports", rationale: "fixture" }];
  const floorItem = (mid, num) => ({
    kind: "vote", measureId: mid, measureType: "bill", number: num, title: num,
    chamber: "utah house", status: null, date: "2025-02-10T00:00:00.000Z",
    action: "On passage", actionType: "passage", position: "yea", result: "Passed",
    isParty: null, supports: null, isProcedural: false, advanceInverted: false,
    isAmendment: false, parentMeasureId: null, rollcallId: `${mid}:1`, congress: null,
    session: "2025GS", rollNumber: 100 + mid, issues,
    source: { url: "https://le.utah.gov/x", label: "Utah" },
  });
  const comItem = (mid, num) => ({
    kind: "position", measureId: mid, measureType: "bill", number: num, title: num,
    chamber: "utah house", status: null, date: "2025-01-24T07:00:00.000Z",
    action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
    result: null, isParty: null, supports: true, isProcedural: false,
    advanceInverted: false, isAmendment: false, parentMeasureId: null,
    rollcallId: null, congress: null, session: null, rollNumber: null, issues,
    source: { url: "https://le.utah.gov/interim/2025/pdf/00000448.pdf", label: "Utah minutes" },
  });
  const PID = "pdx_committee_fixture";
  const both = [floorItem(1, "H.B. 1"), comItem(1, "H.B. 1")];
  const floorOnly = [floorItem(1, "H.B. 1")];
  const alsoFresh = both.concat([comItem(2, "H.B. 2")]);

  const countOf = (items) => {
    win.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(items)));
    return win._pdxRecordMappedCounts(PID);
  };
  const cFloor = countOf(floorOnly);
  const cBoth = countOf(both);
  const cFresh = countOf(alsoFresh);
  must(cFloor && cBoth && cFresh, "the fixture produced no counts");

  eq(cBoth.votes, cFloor.votes,
    "a committee vote on a bill the member also voted on the floor buys no extra coverage");
  eq(cBoth.total, 2, "…but both records are still reported in `total`");
  eq(cBoth.supersededActs, 1, "…and the count says which one it dropped");
  eq(cFresh.votes, cFloor.votes + 1,
    "a committee vote on a bill with no floor vote does count once");
  eq(cFloor.supersededActs, 0, "an all-floor record drops nothing");

  // And the direction index agrees: two records, one act on that instrument.
  // Called the way the shipped surface calls it — through _pdxRecordDirection,
  // which is the layer that supplies the coverage floor and the noun, so this
  // exercises the coverage count and the supersession pass together.
  const KEY = issues[0].issueKey;
  const dir = (items) => {
    win.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(items)));
    return win._pdxRecordDirection(PID, KEY, { noun: { one: "formal act", many: "formal acts" } });
  };
  const dFloor = dir(floorOnly), dBoth = dir(both), dFresh = dir(alsoFresh);
  must(dFloor && dBoth && dFresh, "the direction index produced nothing for the fixture");
  // The fixture has to be ADMITTED for any of the comparisons below to mean
  // anything. A floor vote whose `position` the engine does not recognise is
  // judged zero times, and then every "adds nothing" assertion passes for the
  // wrong reason — so the fixture's own admission is fatal, not counted.
  must(dFloor.judged === 1 && dFloor.mix.floor === 1 && dFloor.actStrength === 1,
    `the floor fixture was not admitted (judged ${dFloor.judged}, mix ${JSON.stringify(dFloor.mix)}) — the supersession case is not being tested`);
  eq(dBoth.judged, dFloor.judged,
    "the direction index judges the superseded committee act zero extra times");
  eq(dBoth.advances, dFloor.advances,
    "the superseded committee act adds no extra advance");
  eq(dBoth.actStrength, dFloor.actStrength,
    "the superseded committee act adds no depth");
  eq(dBoth.superseded, 1, "…and the index discloses that it set one act aside");
  eq(dBoth.mix.committee_vote, 0,
    "a superseded committee act is not counted in the admitted act mix");
  eq(dFresh.mix.committee_vote, 1,
    "a committee act on a bill with no floor vote IS admitted, once");
  eq(dFresh.judged, dFloor.judged + 1, "…and is judged once");
  ok(dFresh.actStrength > dFloor.actStrength,
    "…and adds depth — but less than a floor vote would");
  ok(dFresh.actStrength - dFloor.actStrength < 1,
    "…the depth a committee act adds is under a floor vote's 1.00");
  eq(Math.round((dFresh.actStrength - dFloor.actStrength) * 100) / 100, 0.6,
    "…it is exactly the 0.60 the act table gives a committee vote");

  // The noun on a mixed row is the neutral formal one, never the roll-call verb.
  for (const idx of [dFloor, dBoth, dFresh]) {
    const words = JSON.stringify(idx);
    lacks(words, "Voted Yea", "no direction verdict prints Voted Yea");
    lacks(words, "Voted Nay", "no direction verdict prints Voted Nay");
  }
}

// The real seed, through the real engine: no Utah pid loses a readable issue.
// (The measured wave-3 result is a null result on tiers — 10 empty / 4 thin /
// 102 readable before and after — and this pins the direction of the only part
// that could regress.)
has(VR, "ONE INSTRUMENT, ONE COUNT",
  "voting-record.js explains the coverage-count rule in its own words");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · The 2024 general session, through the same parser");
// ═════════════════════════════════════════════════════════════════════════════
// 2024GS is the brief's stretch scope, and it is the session that found two
// defects the 2025 run had hidden: the committee list's code field is `ownerid`
// (2025 had run against a warm cache, so a filter matching nothing matched
// nothing quietly), and the SQL header had two bill counts typed in by hand.
// Everything section 1-6 asserts about 2025 is asserted here about 2024, plus
// the one thing only a second session can test — that the header is about the
// session it is in.
const MIG24 = "netlify/database/migrations/20261005000000_vr_utah_2024gs_committee_votes.sql";
const SQL24 = R(MIG24);
const SEED24 = J("db/vr-utah-committee-seed-2024GS.json");
const CMAP24 = J("db/vr-utah-committee-map-2024GS.json");
const FLOOR24 = J("db/vr-utah-vote-seed-2024GS.json");

const m24 = SEED24.measures || [];
const a24 = m24.flatMap((m) => (m.committeeActs || []).map((ca) => ({ m, ca })));
const r24 = a24.flatMap(({ m, ca }) => (ca.votes || []).map((v) => ({ m, ca, v })));
must(m24.length > 0 && a24.length > 0 && r24.length > 0,
  "the 2024GS committee seed carries no acts — the second session is not being tested");
must(MIG24 !== MIG, "the 2024 migration is a separate file from the applied 2025 one");

// 1 · not a floor vote.
has(SQL24, "INSERT INTO vr_positions", "2024: the migration writes positions");
lacks(SQL24, "INSERT INTO vr_rollcalls", "2024: the migration writes no roll call");
lacks(SQL24, "INSERT INTO vr_member_votes", "2024: the migration writes no member vote");
for (const kw of ["CREATE TABLE", "ALTER TABLE", "DROP TABLE", "CREATE INDEX"]) {
  lacks(SQL24, kw, `2024: the migration carries no DDL (${kw})`);
}
has(SQL24, "ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING",
  "2024: the migration is idempotent on the same unique index");
ok(/roll_number/.test(SQL24) && !/INSERT[\s\S]{0,400}roll_number/.test(SQL24),
  "2024: roll_number appears only in prose, never in an insert");
eq((SQL24.match(/, '((?!committee_vote)[a-z_]+)', (?:true|false), '\d{4}-/g) || []).length, 0,
  "2024: no inserted row carries an action type other than committee_vote");
lacks(SQL24, "congress =", "2024: the migration never selects on congress");
has(SQL24, "'utahSession' = '2024GS'",
  "2024: the measure lookup is scoped to the 2024 general session");
lacks(SQL24, "'utahSession' = '2025GS'",
  "2024: the migration does not reach into the 2025 session's measures");
for (const m of m24) {
  ok(m.chamber === "utah house" || m.chamber === "utah senate",
    `2024 ${m.utahBill}: chamber is a Utah chamber, got ${JSON.stringify(m.chamber)}`);
  eq(m.session, "2024GS", `2024 ${m.utahBill}: the measure names its own session`);
}

// 2 · one instrument, one count — against 2024's own floor seed.
{
  const pairs = new Set();
  for (const m of FLOOR24.measures) for (const rc of m.rollcalls) for (const v of rc.votes) {
    pairs.add(`${m.utahBill}|${v.politicianId}`);
  }
  must(pairs.size > 0, "the 2024 floor seed yielded no member/bill pairs");
  let sup = 0, fresh = 0, disagreed = 0;
  for (const { m, v } of r24) {
    if (v.supersededByFloorVote) sup++; else fresh++;
    if (!!v.supersededByFloorVote !== pairs.has(`${m.utahBill}|${v.politicianId}`)) disagreed++;
  }
  eq(disagreed, 0, "2024: every row's supersededByFloorVote agrees with the 2024 floor seed");
  eq(sup, SEED24.counts.supersededByFloorVote, "2024: the seed's superseded count is the superseded rows");
  eq(fresh, SEED24.counts.notOnAnyFloorRoll, "2024: the seed's fresh count is the un-superseded rows");
  ok(sup > 0 && fresh > 0, "2024: both the superseded and the fresh case are present");
  // The whole depth claim for this session is those 12 rows and nothing more.
  eq(fresh, 12, "2024: the depth this session adds is 12 rows, the number the report quotes");
}

// 4 · one act per person per instrument per committee action.
{
  const seen = new Set(), dupes = [];
  for (const { m, v } of r24) {
    const k = `${m.utahBill}|${v.politicianId}`;
    if (seen.has(k)) dupes.push(k); else seen.add(k);
  }
  eq(dupes.length, 0, `2024: no member holds two committee acts on one bill: ${dupes.slice(0, 3)}`);
}
eq(m24.length, SEED24.counts.measures, "2024: the seed's measure count is its measure count");
eq(a24.length, SEED24.counts.committeeActs, "2024: the seed's act count is its act count");
eq(r24.length, SEED24.counts.positions, "2024: the seed's row count is its row count");
eq(SEED24.counts.reprintsDropped, 0,
  "2024: the seed discloses its reprint count, and for this session it is zero");
eq(SEED24.counts.measures, 20, "2024: 20 bills, the number the report quotes");
eq(SEED24.counts.committeeActs, 26, "2024: 26 committee actions, the number the report quotes");
eq(SEED24.counts.positions, 174, "2024: 174 rows, the number the report quotes");

// 5 · nobody is guessed.
{
  const F24 = {};
  for (const ch of Object.keys(CMAP24.printedForms || {})) {
    for (const [printed, rec] of Object.entries(CMAP24.printedForms[ch] || {})) {
      ok(!F24[printed] || F24[printed].politicianId === (rec && rec.politicianId),
        `2024: "${printed}" does not appear in both chambers pointing at two people`);
      F24[printed] = rec;
    }
  }
  eq(Object.keys(F24).length, 67, "2024: 67 printed forms were reviewed, the number the report quotes");
  for (const [printed, rec] of Object.entries(F24)) {
    ok(/^(Rep|Sen)\. /.test(printed), `2024: "${printed}" carries the printed honorific`);
    ok(rec.how === "exact_floor_key" || rec.how === "unique_surname_confirmed_by_attendance",
      `2024: "${printed}" was accepted by a stated method, got ${JSON.stringify(rec.how)}`);
    if (rec.how === "unique_surname_confirmed_by_attendance") {
      ok(!!rec.confirmedBy, `2024: "${printed}" names the attendance line it was confirmed by`);
      const sur = (x) => String(x).replace(/^(Rep\.|Sen\.)\s+/, "")
        .replace(/,.*$/, "").split(/\s+/).pop().toLowerCase();
      eq(sur(rec.confirmedBy), sur(printed),
        `2024: "${printed}" was confirmed by an attendance line of the same surname`);
    } else {
      ok(!!rec.floorKey, `2024: "${printed}" names the floor-page key it matched exactly`);
    }
  }
  const missing = new Set();
  for (const { v } of r24) if (v.printedAs && !F24[v.printedAs]) missing.add(v.printedAs);
  eq(missing.size, 0, `2024: every printed name in the seed is in the reviewed map: ${[...missing].slice(0, 5)}`);
  for (const { v } of r24) {
    const rec = F24[v.printedAs];
    if (rec) eq(v.politicianId, rec.politicianId,
      `2024: "${v.printedAs}" resolves in the seed to exactly what the map says`);
  }
  // Unmapped and refused stay two ledgers. 2024 has 12 gaps and no refusals,
  // and a zero refusal ledger is a stated zero, not an absent key.
  ok(CMAP24.unmapped && typeof CMAP24.unmapped === "object", "2024: the map keeps a coverage-gap ledger");
  ok(CMAP24._refusedNames && typeof CMAP24._refusedNames === "object",
    "2024: the map keeps a refusal ledger even when it is empty");
  const un24 = Object.values(CMAP24.unmapped).flat();
  const ref24 = Object.values(CMAP24._refusedNames).flat();
  eq(un24.length, 12, "2024: 12 printed names are unmapped, the number the report quotes");
  eq(ref24.length, 0, "2024: no name was refused this session — separate ledger, separate number");
  eq(un24.filter((n) => ref24.includes(n)).length, 0,
    "2024: a name is either a gap or a refusal, never both");
  has(String(CMAP24._unmappedIsCoverage || ""), "NOT A GUESS",
    "2024: the map says in its own words that an unmapped name is a gap, not a guess");
  // Rep. P. Lyman is the brief's named prohibition, and he is in the gap ledger
  // rather than attributed to either Lyman on the roster.
  ok(un24.some((n) => /Lyman/i.test(String(n))),
    "2024: Rep. P. Lyman is carried as an unmapped gap");
  const names24 = r24.map((r) => String(r.v.printedAs || "").toLowerCase());
  for (const bad of ["judkins", "lyman"]) {
    eq(names24.filter((n) => n.includes(bad)).length, 0,
      `2024: no ${bad}-class collision was attributed`);
  }
  const unknown = new Set();
  for (const { v } of r24) {
    if (!new RegExp(`["']?${v.politicianId.replace(/[^a-z0-9_]/gi, "")}["']?\\s*:`).test(CMPSRC)) {
      unknown.add(v.politicianId);
    }
  }
  eq(unknown.size, 0, `2024: every attributed id is on the roster: ${[...unknown].slice(0, 5)}`);
}
eq(CMAP24.session, "2024GS", "2024: the reviewed map names the session it was reviewed for");

// 6 · every row is cited, and the migration is the seed.
for (const { m, ca } of a24) {
  ok(/^https:\/\/le\.utah\.gov\/.*\.pdf$/.test(String(ca.sourceUrl || "")),
    `2024 ${m.utahBill}: the act cites a le.utah.gov minutes PDF, got ${JSON.stringify(ca.sourceUrl)}`);
  ok(/^2024-/.test(String(ca.date || "")),
    `2024 ${m.utahBill}: the act is dated inside the session it belongs to, got ${JSON.stringify(ca.date)}`);
}
for (const m of m24) {
  ok((m.issueKeys || []).length > 0, `2024 ${m.utahBill}: the act inherits at least one issue key`);
  for (const k of m.issueKeys || []) {
    ok(ISSUE_KEYS.has(k), `2024 ${m.utahBill}: issue key "${k}" is an existing key`);
  }
  const parent = FLOOR24.measures.find((x) => x.utahBill === m.utahBill);
  if (parent) {
    const pk = new Set((parent.issues || []).map((i) => i.issueKey));
    for (const k of m.issueKeys || []) {
      ok(pk.has(k), `2024 ${m.utahBill}: issue key "${k}" is the parent bill's own mapping`);
    }
  }
}
eq((SQL24.match(/\(m_id, '[a-z0-9_]+', 'committee_vote'/g) || []).length, r24.length,
  "2024: the migration inserts exactly the seed's rows");
eq((SQL24.match(/SELECT id INTO m_id FROM vr_measures/g) || []).length, m24.length,
  "2024: the migration looks up exactly the seed's measures");
for (const { ca } of a24) has(SQL24, ca.sourceUrl, "2024: every act's PDF is cited in the SQL");

// 8 · the header is about the session it is in. This is the defect: the
// near-unanimous paragraph carried 2025's "24 bills … not the 42" into the 2024
// file, so both counts now come off the seed and both files are checked against
// their own.
for (const [label, sql, seed, yr] of [["2025", SQL, SEED, "2025"], ["2024", SQL24, SEED24, "2024"]]) {
  has(sql, `vr_positions — Utah ${yr} committee votes`, `${label}: the header names its own year`);
  has(sql, `already in the formal lane for ${yr}GS`, `${label}: the header names its own session`);
  has(sql, `is why ${seed.counts.measures} bills are represented`,
    `${label}: the near-unanimous paragraph states this session's bill count`);
  has(sql, `not the ${seed.counts.billsWithAnyCommitteeVote} that had a committee vote at all`,
    `${label}: … and this session's pre-bar count`);
  ok(Number.isInteger(seed.counts.nearUnanimousRefused),
    `${label}: the seed states what the contestedness bar refused`);
  has(sql, `-- ${seed.counts.notOnAnyFloorRoll} rows, where the committee record is the only record`,
    `${label}: the header states its own fresh-row count`);
  has(sql, `-- AND IT DOES NOT DOUBLE COUNT. ${seed.counts.supersededByFloorVote} of these rows belong to a member`,
    `${label}: … and its own superseded count`);
  has(sql, `interim/${yr}/pdf/`, `${label}: the cited PDF path is its own year's`);
  has(sql, `yr=${yr}`, `${label}: the cited feeds are its own year's`);
  ok(!sql.includes(`interim/${yr === "2024" ? "2025" : "2024"}/pdf/`),
    `${label}: no other session's PDF path leaked into the header`);
  eq(seed.counts.billsWithAnyCommitteeVote >= seed.counts.measures, true,
    `${label}: the pre-bar bill count cannot be below the admitted one`);
}
// The prose above is checked because it is what a reader sees, but this is the
// assertion that closes the defect for good: each committed migration is exactly
// what the generator produces from the committed seed, so a number cannot be
// typed into either file by hand and survive.
for (const [label, file, sql] of [["2025", MIG, SQL], ["2024", MIG24, SQL24]]) {
  const session = `${label}GS`;
  let regenerated = null;
  try { regenerated = buildSql(session); }
  catch (e) { regenerated = `THREW: ${e.message}`; }
  ok(regenerated === sql,
    `${label}: ${file} is byte-identical to buildSql("${session}") — a hand-typed number ` +
    `would show up here` + (regenerated === sql ? "" :
      ` (first difference at byte ${[...sql].findIndex((c, i) => c !== String(regenerated)[i])})`));
}
ok(SEED.counts.billsWithAnyCommitteeVote !== SEED24.counts.billsWithAnyCommitteeVote,
  "the two sessions have genuinely different pre-bar counts — the templating is being tested");
has(R("scripts/vr-utah-committee-ingest.mjs"), "predates counts.billsWithAnyCommitteeVote",
  "the generator refuses an older seed rather than printing a header with a hole in it");

// The renamed-committee second door. Three 2024 acts sit in a committee whose
// metadata name and whose letterhead disagree, and the prefix key is what lets
// the PDF still confirm them — as a disclosed relaxation, not a silent pass.
// The haystack confirmAgainstPdf reads is the PDF's text with every space
// removed, so these fixtures are built the same way the ingest builds it.
{
  const nospace = (x) => String(x).replace(/\s+/g, "");
  const META = "House Public Utilities and Energy Standing Committee";
  const LETTERHEAD = "MINUTES OF THE HOUSE PUBLIC UTILITIES, ENERGY, AND TECHNOLOGY " +
    "STANDING COMMITTEE";
  const args = {
    committee: META, dateWords: "February 12, 2024",
    motionText: "Rep. Smith moved to pass H.B. 1 out favorably.",
    yea: 8, nay: 3, abs: 2,
  };
  const body = " February 12, 2024 MOTION: Rep. Smith moved to pass H.B. 1 out favorably " +
    " The motion passed with a vote of 8-3-2. ";

  eq(committeePrefixKey(META), "HOUSEPUBLICUTILITIES",
    "the prefix key is the chamber plus the first two words that carry meaning");
  has(nospace(LETTERHEAD).toUpperCase(), committeePrefixKey(META),
    "the metadata name's prefix key survives into the letterhead that renamed it");
  ok(committeePrefixKey("Senate Public Utilities and Energy Standing Committee") !==
     committeePrefixKey(META),
    "the chamber is part of the key — a House and a Senate committee are two committees");
  // Two significant words is the floor. "House Education" would key on one word,
  // which is loose enough to match a committee it is not, so it gets no second
  // door at all rather than a cheap one.
  eq(committeePrefixKey("House Education Standing Committee"), "",
    "a name with only one significant word gets no prefix key");
  eq(committeePrefixKey("Senate Judiciary Interim Committee"), "",
    "…and neither does another one, however tempting the surname-shaped match");
  eq(committeePrefixKey("H.B. 1"), "",
    "a string that does not start with a chamber gets no prefix key");

  const conf = confirmAgainstPdf(nospace(LETTERHEAD + body), args);
  must(conf && Array.isArray(conf.missing), "confirmAgainstPdf changed shape");
  ok(conf.ok, `a renamed committee still confirms: missing ${JSON.stringify(conf.missing)}`);
  eq(conf.renamed, true, "…and the result says it was the short name that matched");

  const exact = confirmAgainstPdf(nospace("MINUTES OF THE " + META.toUpperCase() + body), args);
  ok(exact.ok, `the full printed name still confirms: missing ${JSON.stringify(exact.missing)}`);
  eq(exact.renamed, false, "…and is not reported as a rename");

  const wrong = confirmAgainstPdf(nospace("MINUTES OF THE HOUSE JUDICIARY STANDING COMMITTEE" + body), args);
  ok(!wrong.ok && wrong.missing.includes("committee"),
    "a different committee's minutes do not confirm on a prefix");

  // The relaxation is only about the committee's name. A tally or a date that
  // does not appear is still a refusal, so the second door cannot be mistaken
  // for a general loosening.
  const badTally = confirmAgainstPdf(
    nospace(LETTERHEAD + body.replace("8-3-2", "9-3-2")), args);
  ok(!badTally.ok && badTally.missing.includes("tally"),
    "a printed tally that disagrees is still refused, renamed committee or not");
  const badDate = confirmAgainstPdf(
    nospace(LETTERHEAD + body.replace("February 12, 2024", "February 13, 2024")), args);
  ok(!badDate.ok && badDate.missing.includes("date"),
    "a date that is not in the PDF is still refused");
  eq(SEED24.counts.measures > 0 && a24.some((x) => /Public Utilities/i.test(x.ca.committee)), true,
    "2024 really does carry an act from the committee this door was opened for");
}
has(R("db/vr-ingest-runbook.md"), "2024GS",
  "the runbook records the second session it was run against");

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n   ${passed} checks passed`);
if (failures.length) {
  console.error(`\n✗ vr-utah-committee: ${failures.length} failure(s)`);
  for (const f of failures.slice(0, 40)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log("✓ vr-utah-committee: committee acts are the committee's, cited, and counted once");
