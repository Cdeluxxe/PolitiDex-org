#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wva-empty-formal-lane.mjs — no percentage over a formal lane that is empty
// ─────────────────────────────────────────────────────────────────────────────
// /p/cox printed two facts about one record, a screen apart.
//
//   · The 🏛 record brief, correctly: "No formal pattern on file yet."
//   · The letterhead and the ⚖️ block, at the same moment: "56% Word vs Action ·
//     9 of 25 tested", with a MIXED RECORD chip beside it.
//
// A governor casts no roll calls, and until Utah signed/vetoed ingest lands there
// are no ✒️ executive acts on file for one either. So the 56% was not a reading of
// a formal record at all: every one of those nine tested items came from the
// PLEDGE LEDGER, where testOf() resolves a tracked promise from its own kept /
// broken verdict — `basis: 'pledge-ledger'`, officialRecord never consulted. Five
// kept and four broken is 55.6%, which rounds to the number on the page. The
// arithmetic was right. The record it claimed to be over was not there.
//
// THE RULE THIS HARNESS HOLDS: WORD VS ACTION MAY NOT PUBLISH WITHOUT A FORMAL
// RECORD TO TEST AGAINST. No percentage, no ring, no verdict chip — and in their
// place one reviewed sentence naming the missing side as the OFFICE's, so the
// silence never reads as a mark against the person.
//
// A second rule, and the reason this is a three-valued predicate rather than a
// boolean: DEMOTING TAKES POSITIVE KNOWLEDGE, and each lane answers for itself.
// /p/trump carries 37 formal-pattern rows, not one of them `read`, over 34
// readable executive acts and a legitimate 71%. Gating on `read` alone would have
// deleted a president's number — floor-lowering in reverse, which is the same
// dishonesty pointing the other way. An index that cannot be asked is not an index
// saying "empty".
//
// A third rule, and the one that keeps the gate from becoming a new way to lie:
// AN EMPTY INDEX IS TWO DIFFERENT FACTS DEPENDING ON THE OFFICE. For a governor it
// is the standing state of the world — the office casts no floor votes. For a
// senator it is a fetch still in flight, because roll calls are fetched per member
// and any page rendering before that resolves reads zero rows. So requirement 2's
// scope — "any statewide exec" — is load-bearing, not decoration: the gate may
// only fire on an office that casts no floor votes, and §6 holds it there.
//
// Contracts:
//   1. the harness really does reproduce the bug — with a readable row in place,
//      the same ledger publishes the same 56%
//   2. an exec with no readable formal row publishes no number, no ring, no chip
//   3. the copy is exact, and the ring says which gap it is
//   4. the same rule for a second statewide exec (dhenderson)
//   5. the executive lane is untouched — trump still publishes
//   6. the predicate is transparent to any lane with content, fails open, and
//      cannot fire on an office that casts floor votes
//   7. no floor moved, in either direction
//   8. nothing was invented for a governor: no vote, no stance-as-formal-act
//   9. the compare slot says which gap it is, before it counts tested items
//  10. swept over the whole shipped roster, the gate reaches only offices that
//      cast no floor votes
//
//   node scripts/test-wva-empty-formal-lane.mjs
//
// No DB, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h == null ? "" : h).includes(n), `${m}\n    missing ${JSON.stringify(n)}`);
const hasNot = (h, n, m) => ok(!String(h == null ? "" : h).includes(n), `${m}\n    should not contain ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// A probe target that has been renamed away is a STALE HARNESS, not a pass: the
// contract stops being checked and the check stops saying so.
const must = (c, m) => {
  if (c) return;
  console.error(`✗ empty formal lane: STALE HARNESS — ${m}\n\n` +
    "  This is not a passing state. Restore the probe target, or update this\n" +
    "  harness AND re-check the honesty rule it describes.");
  process.exit(2);
};

// ── The shipped modules, in load order, in the shared sandbox ────────────────
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "formal-index.js",
  "consistency.js",
  "word-action.js",
];

const win = makeSandbox();
// THE ROLL-CALL LANE HAS ALREADY ANSWERED, AND ANSWERED WITH NOTHING. Without
// this, recordsWarm() is false for every pid, officialIssue() returns `pending`
// and the read stops at its warming branch — which is the correct runtime
// behaviour and completely useless here, because "still loading" is exactly the
// state this gate must never be confused with. A truthy memberRecords() puts the
// whole sandbox in the settled-and-empty state a governor's profile reaches a
// moment after paint. No rows are added: _pdxRecordIssueSummary is what supplies
// those, and it is not stubbed.
win.PDXVotingRecord = { memberRecords: () => ({}), fetchMember: () => {} };
const sandbox = vm.createContext(win);
for (const f of FILES) {
  try { vm.runInContext(R(f), sandbox, { filename: f }); }
  catch (e) { must(false, `${f} does not load in the shared sandbox: ${e.message}`); }
}

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
const ER = win.PDXExecRecord;
const FX = win.PDXFormalIndex;
const CMP = win.CMP_DATA || {};

must(CS && WA, "consistency.js / word-action.js no longer publish their namespaces");
must(typeof WA.read === "function" && typeof WA.figure === "function" &&
     typeof WA.heroRead === "function" && typeof WA.sectionHtml === "function" &&
     typeof WA.compactBadgeHtml === "function",
  "PDXWordAction no longer publishes read / figure / heroRead / sectionHtml / compactBadgeHtml");
must(typeof WA.formalLaneReadable === "function" && typeof WA.noFormalLane === "function",
  "PDXWordAction.formalLaneReadable / noFormalLane are gone — the gate this file exists for is not being asked");
must(typeof WA.NO_FORMAL_LANE_COPY === "string" && WA.NO_FORMAL_LANE_COPY.length > 20,
  "PDXWordAction.NO_FORMAL_LANE_COPY is gone — the reviewed sentence is not published");
must(CS.formalPatternIndex && typeof CS.formalPatternIndex.rows === "function",
  "PDXConsistency.formalPatternIndex.rows is gone — reader 1 cannot be asked");
must(CS.execRecordSummary && typeof CS.execRecordSummary.pick === "function",
  "PDXConsistency.execRecordSummary.pick is gone — reader 2 cannot be asked");

// ── The fixtures ────────────────────────────────────────────────────────────
// A ledger of nine RESOLVED tracked pledges — five kept, four broken. Built here
// rather than read off a profile because the promises that produced the reported
// 56% arrive from Firestore at runtime and are not in cmp-data.js: pinning the
// assertion to whatever is merged today would make this harness stop reproducing
// the bug the first time an editor resolves a tenth promise. Five over nine is
// 55.6% → 56%, and nine items at the pledge tier's weight of 3 is 27, so this
// ledger clears BOTH publication floors on its own. That is the whole defect.
function ledger(n, kept) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ title: `Tracked pledge ${i + 1}`, verdict: i < kept ? "kept" : "broken" });
  }
  return out;
}

must(CMP.cox, "cox is no longer in cmp-data.js — the reported profile cannot be read");
const COX = Object.assign({}, CMP.cox, { promises: ledger(9, 5) });

// dhenderson — the second statewide exec named in the report — has no cmp-data.js
// row at all (Firestore only), so the fixture is the office rather than the file:
// a Utah statewide executive with the same pledge ledger and nothing formal.
const HEND = {
  id: "dhenderson", name: "Deidre Henderson", office: "Lieutenant Governor",
  state: "UT", party: "Republican", promises: ledger(9, 5),
};

must(CMP.trump, "trump is no longer in cmp-data.js — the executive control cannot be read");
const TRUMP = CMP.trump;

// ─────────────────────────────────────────────────────────────────────────────
section("1. the harness reproduces the bug — the ledger really does publish 56%");
// Reader 1 is handed one readable row and NOTHING else changes: same pid, same
// ledger, same floors. If this does not print 56% then the fixture below is
// failing the floor rather than failing the gate, and every assertion in §2 is
// proving nothing.
function withReadableRow(pid, fn) {
  const real = CS.formalPatternIndex.rows;
  CS.formalPatternIndex.rows = (q) =>
    String(q) === pid ? [{ key: "fixture", read: true }] : real(q);
  try { return fn(); } finally { CS.formalPatternIndex.rows = real; }
}
const asIfReadable = withReadableRow("cox", () => WA.read("cox", COX));
eq(asIfReadable.pct, 56, "with one readable formal row the same ledger publishes the reported 56%");
eq(asIfReadable.publishable, true, "…and clears both publication floors unaided");
eq(asIfReadable.coverage.tested, 9, "…over the nine tested items the report counted");
eq(withReadableRow("cox", () => WA.noFormalLane("cox", asIfReadable)), false,
  "…and the gate stands down when a row is readable");

// And every one of those nine is a pledge, resolved without a formal act. This is
// the mechanism, asserted rather than described: if testOf() ever starts routing
// tracked pledges through officialRecord, the gate is not what is holding cox back.
const bases = {};
asIfReadable.tested.forEach((it) => {
  const b = (it.test && it.test.basis) || "?";
  bases[b] = (bases[b] || 0) + 1;
});
eq(Object.keys(bases).join(","), "pledge-ledger",
  "every tested item on cox is resolved from the pledge ledger, not from a formal act");

// ─────────────────────────────────────────────────────────────────────────────
section("2. an exec with no readable formal row publishes nothing");
const cox = WA.read("cox", COX);
eq(WA.noFormalLane("cox", cox), true, "cox: the owner says the formal lane is empty");
// THE READ'S PUBLISHED SHAPE DID NOT GROW A FIELD. The twin-boot drift harnesses
// compare read() against HEAD byte-for-byte across the whole roll-call corpus, and
// one added key would read there as 537 profiles whose arithmetic moved — burying
// the handful whose arithmetic genuinely did. The veto shows up where it belongs:
// in publishable, pct and token.
ok(!("noFormalLane" in cox), "cox: read() does not carry the answer as a field of its own");
eq(cox.pct, null, "cox: no percentage");
eq(cox.publishable, false, "cox: not publishable");
eq(cox.coverage.warming, false,
  "cox: and not warming either — this is a settled empty lane, not a loading one");
// The word the read falls to. `limited` is HEAD's fallback for every unpublished
// read in the product and it is deliberately not re-labelled here: "No record yet"
// is the more exact word, and moving that branch would move the verdict word on
// hundreds of profiles this pass never looked at. What matters for the reported
// bug is that the word reaches no verdict and claims no match — the sentence under
// it, asserted in §3, is what says which gap this is.
eq(cox.token, "limited", "cox: the read falls to the shared unpublished token");
hasNot(String((cox.verdict && cox.verdict.label) || ""), "Mixed",
  "cox: the read's own verdict word is not a Mixed record");

const coxFig = WA.figure("cox", COX);
eq(coxFig.shows, false, "cox: figure() does not show — nothing downstream may print a number");
eq(coxFig.ready, false, "cox: figure() is not ready");
eq(WA.compactBadgeHtml("cox", COX), "",
  "cox: no letterhead chip — this is the '56% · 9 of 25 tested · MIXED RECORD' pill");

// ─────────────────────────────────────────────────────────────────────────────
section("3. the copy is exact, and the ring says which gap it is");
eq(WA.NO_FORMAL_LANE_COPY,
  "Word vs Action needs a formal record to test against. This office’s formal acts are not on file yet.",
  "the reviewed sentence is published verbatim");

const coxSec = WA.sectionHtml("cox", COX) || "";
ok(coxSec.length > 0, "cox: the ⚖️ block still renders — the gap is stated, not hidden");
has(coxSec, "needs a formal record to test against",
  "cox: the ⚖️ block prints the reviewed sentence");
has(coxSec, "This office", "cox: …and names the missing side as the OFFICE's, not the person's");
hasNot(coxSec, "56%", "cox: the ⚖️ block prints no percentage");
hasNot(coxSec, "Mixed record", "cox: no MIXED RECORD chip");
hasNot(coxSec, "Backs it up", "cox: no BACKS IT UP chip");

const coxHero = WA.heroRead("cox", COX);
ok(coxHero, "cox: heroRead still returns a ring to paint");
eq(coxHero.pct, null, "cox: the ring carries no percentage");
eq(coxHero.text, "—", "cox: the ring paints a dash, not a number and not a waiting mark");
has(coxHero.sub, "No formal record on file",
  "cox: the ring's sub-line says the formal record is missing");
// The specific nonsense the old ladder produced: nine pledge items measured
// against a three-item floor, printed under a suppressed number.
hasNot(coxHero.sub, "of 3 tested needed",
  "cox: the ring does not claim 9 of 3 tested are needed");

// ─────────────────────────────────────────────────────────────────────────────
section("4. the same rule for the second statewide exec");
const hend = WA.read("dhenderson", HEND);
// The profile is handed in rather than looked up: dhenderson has no cmp-data.js
// row, so the office — the thing the gate's scope is read off — only exists on the
// object the caller is already holding. read(), figure(), heroRead() and
// sectionHtml() all take one, and noFormalLane() accepts one for the same reason.
eq(WA.noFormalLane("dhenderson", hend, HEND), true, "dhenderson: the formal lane is empty");
eq(hend.pct, null, "dhenderson: no percentage");
eq(hend.publishable, false, "dhenderson: not publishable");
eq(WA.figure("dhenderson", HEND).shows, false, "dhenderson: figure() does not show");
eq(WA.compactBadgeHtml("dhenderson", HEND), "", "dhenderson: no letterhead chip");
const hendSec = WA.sectionHtml("dhenderson", HEND) || "";
has(hendSec, "needs a formal record to test against", "dhenderson: the ⚖️ block prints the sentence");
hasNot(hendSec, "Mixed record", "dhenderson: no MIXED RECORD chip");
hasNot(hendSec, "Backs it up", "dhenderson: no BACKS IT UP chip");

// ─────────────────────────────────────────────────────────────────────────────
section("5. the executive lane is untouched — trump still publishes");
const pick = CS.execRecordSummary.pick("trump");
must(pick && pick.on && pick.readable > 0,
  "trump no longer has readable executive acts in this sandbox — the control proves nothing");
const rows = CS.formalPatternIndex.rows("trump") || [];
ok(rows.length > 0 && rows.every((r) => !r.read),
  "trump: the pattern index holds rows it declines to characterise — the exact shape " +
  "that would have been misread as an empty lane");
const trump = WA.read("trump", TRUMP);
eq(WA.noFormalLane("trump", trump), false, "trump: the exec lane answers for itself and the gate stands down");
eq(trump.publishable, true, "trump: still publishable");
ok(typeof trump.pct === "number" && trump.pct > 0, "trump: still publishes a percentage");
eq(WA.figure("trump", TRUMP).shows, true, "trump: figure() still shows");
ok(WA.compactBadgeHtml("trump", TRUMP).length > 0, "trump: the letterhead chip still renders");
hasNot(WA.sectionHtml("trump", TRUMP) || "", "needs a formal record to test against",
  "trump: and is never told the office has no formal acts on file");

// ─────────────────────────────────────────────────────────────────────────────
section("6. the predicate is transparent to content, fails open, and knows its scope");
// Reader 1 alone.
ok(withReadableRow("cox", () => WA.formalLaneReadable("cox")),
  "one formal-pattern row is enough on its own");
// Reader 2 alone — the pattern index emptied out from under a real exec lane.
function withNoRows(pid, fn) {
  const real = CS.formalPatternIndex.rows;
  CS.formalPatternIndex.rows = (q) => (String(q) === pid ? [] : real(q));
  try { return fn(); } finally { CS.formalPatternIndex.rows = real; }
}
ok(withNoRows("trump", () => WA.formalLaneReadable("trump")),
  "the executive lane's own index is enough on its own");
// Reader 3 alone — the generated Utah act counts, which answer before anything has
// warmed. defay_h15 carries 74 acts there and no pattern row in this sandbox: the
// static table is the only owner that can speak for him, and it does.
must(FX.has("defay_h15"), "defay_h15 no longer carries generated formal acts — reader 3 proves nothing");
eq((CS.formalPatternIndex.rows("defay_h15") || []).length, 0,
  "…and no pattern row has warmed for him here, so no other reader can answer");
ok(WA.formalLaneReadable("defay_h15", null, CMP.defay_h15),
  "the generated formal index is enough on its own");
eq(WA.read("defay_h15", CMP.defay_h15).pct, 83,
  "…so his published percentage is exactly what it was");
// Reader 4 alone — every index empty, one tested item scored against a formal act.
ok(WA.formalLaneReadable("cox", [{ test: { basis: "record" } }]),
  "a tested item scored against the record is enough on its own");
ok(!WA.formalLaneReadable("cox", [{ test: { basis: "pledge-ledger" } }]),
  "…and a tested item resolved from the pledge ledger is not");
// Every reader says empty, on positive knowledge, about an office that casts none.
ok(!WA.formalLaneReadable("cox"), "every reader answering empty is an empty lane");
// FAIL OPEN. A page or harness without the consistency lane is not evidence of
// absence, and a file that cannot be asked is never called empty.
function withoutReader(name, fn) {
  const real = CS[name];
  delete CS[name];
  try { return fn(); } finally { CS[name] = real; }
}
ok(withoutReader("formalPatternIndex", () => WA.formalLaneReadable("cox")),
  "no formal-pattern index → the gate does not apply");
ok(withoutReader("execRecordSummary", () => WA.formalLaneReadable("cox")),
  "no executive-record index → the gate does not apply");
ok(withoutReader("formalPatternIndex", () => WA.read("cox", COX).publishable === true),
  "…and read() publishes as it always did when the index cannot be asked");
const realHas = FX.has;
FX.has = undefined;
ok(WA.formalLaneReadable("cox"), "no generated formal index → the gate does not apply");
FX.has = realHas;

// ── AND IT MAY NOT FIRE ON AN OFFICE THAT CASTS FLOOR VOTES ─────────────────
// This is the half of the gate that is not about cox. Roll calls are fetched per
// member, so ANY page that renders a senator before that fetch resolves sees zero
// formal rows for them — the same reading the gate takes as "empty" on a governor.
// Firing there would print "this office's formal acts are not on file yet" onto a
// member of Congress whose votes were in the air: not a floor, not caution, just a
// false sentence. The office is what tells the two apart, and it is asked from the
// profile the caller already has.
must(typeof WA.castsNoFloorVotes === "function", "PDXWordAction.castsNoFloorVotes is gone");
ok(WA.castsNoFloorVotes("cox", CMP.cox), "Governor: casts no floor votes");
ok(WA.castsNoFloorVotes("dhenderson", HEND), "Lieutenant Governor: casts no floor votes");
ok(WA.castsNoFloorVotes("trump", CMP.trump), "President: casts no floor votes");
ok(!WA.castsNoFloorVotes("lee", CMP.lee), "U.S. Senator: casts them");
ok(!WA.castsNoFloorVotes("bennie_thompson", CMP.bennie_thompson), "U.S. Representative: casts them");
ok(!WA.castsNoFloorVotes("defay_h15", CMP.defay_h15), "Utah State Representative: casts them");
// The two greedy exclusions, which is why they are checked before the exec words:
// a legislative title that contains "President", and a local one that contains it
// inside a school-board seat.
ok(!WA.castsNoFloorVotes("x", { office: "State Senate President" }),
  "State Senate President: a legislative title is not read as an executive one");
ok(!WA.castsNoFloorVotes("x", { office: "Morgan School District Board (President)" }),
  "a school-board seat is not read as a statewide executive one");
// No title, and no title we recognise, are both out of scope. Nothing is read as
// executive by elimination.
ok(!WA.castsNoFloorVotes("x", {}), "a profile with no office is out of scope");
ok(!WA.castsNoFloorVotes("x", { office: "Secretary of Defense" }),
  "a cabinet secretary is out of scope — a different absence, with its own copy to write");
// THE GUARD, end to end: a senator whose roll-call payload has not landed keeps
// every number they had.
const LEE = Object.assign({}, CMP.lee, { promises: ledger(9, 5) });
const leeWarm = withNoRows("lee", () => WA.read("lee", LEE));
const leeRows = WA.read("lee", LEE);
ok(!WA.noFormalLane("lee", leeWarm, CMP.lee),
  "a senator with zero formal rows is a fetch in flight, never an empty lane");
eq(leeWarm.publishable, true, "…and still publishes, through the same floors as before");
ok(typeof leeWarm.pct === "number", "…with a real percentage on it");
eq(leeWarm.pct, leeRows.pct,
  "…and the emptied index changed nothing about the number: same read, row or no row");
hasNot(WA.sectionHtml("lee", LEE) || "", "formal acts are not on file yet",
  "…and is never told his office has no formal acts on file");

// ─────────────────────────────────────────────────────────────────────────────
section("7. no floor moved, in either direction");
eq(WA.MIN_TESTED_ITEMS, 3, "the item floor is still 3");
eq(WA.MIN_TESTED_WEIGHT, 4, "the weight floor is still 4");
eq(cox.floors.items, 3, "the read still publishes the item floor it was held to");
eq(cox.floors.weight, 4, "…and the weight floor");
// The gate SUBTRACTS a percentage, it never adds one: a readable lane with a
// ledger below the floor stays unpublishable.
const thinCox = Object.assign({}, CMP.cox, { promises: ledger(1, 1) });
const thinRead = withReadableRow("cox", () => WA.read("cox", thinCox));
eq(withReadableRow("cox", () => WA.noFormalLane("cox", thinRead)), false,
  "a readable lane under a one-item ledger passes the gate");
eq(thinRead.publishable, false, "…and still fails the item floor, which the gate did not touch");
eq(thinRead.pct, null, "…so there is still no number");

const SRC = R("word-action.js");
has(SRC, "var publishable = !laneEmpty && tested.length >= MIN_TESTED_ITEMS && wN >= MIN_TESTED_WEIGHT;",
  "the veto sits in front of the floors rather than replacing them");
has(SRC, "var MIN_TESTED_ITEMS = 3;", "the item floor constant is unchanged in source");
has(SRC, "var MIN_TESTED_WEIGHT = 4;", "the weight floor constant is unchanged in source");

// ─────────────────────────────────────────────────────────────────────────────
section("8. nothing was invented for a governor");
eq((CS.formalPatternIndex.rows("cox") || []).length, 0, "cox has no formal-pattern row at all");
eq(CS.execRecordSummary.pick("cox").on, false, "cox is not on the ✒️ executive lane");
must(ER && typeof ER.eligible === "function", "PDXExecRecord.eligible is gone");
eq(ER.eligible("cox"), false, "cox is not admitted to the executive lane");
eq(ER.eligible("dhenderson"), false, "dhenderson is not admitted to the executive lane");
must(FX && typeof FX.has === "function", "PDXFormalIndex.has is gone");
eq(FX.has("cox"), false, "the generated formal index counts no acts for cox");
// No vote language in THE FINDING — the number, the verdict word and the sentence
// under them, which is everything a reader sees before they open a drawer. The
// slice stops at .pdxwa-how on purpose: the drawers below carry lane-agnostic
// explainers ("The test — roll-call votes and formal acts", and a worked "Voted no
// on H.R. 8" example for the circularity rule) that describe the engine to every
// reader and make no claim about this pid.
const iHow = coxSec.indexOf('class="pdxwa-how"');
must(iHow !== -1, "the ⚖️ section no longer renders a .pdxwa-how drawer to slice at");
const coxFinding = coxSec.slice(0, iHow);
has(coxFinding, "Limited record", "cox: the finding falls to the shared unpublished verdict word");
has(coxFinding, "needs a formal record to test against", "cox: …over the reviewed sentence");
["Recorded vote", "roll call", "No votes yet", "Voted ", "vote", "Vote", "%"].forEach((s) => {
  hasNot(coxFinding, s, `cox: the finding never says ${JSON.stringify(s)}`);
});
eq(cox.tested.length, 9, "cox's nine pledge items are still counted as coverage, not deleted");
ok(cox.items.length >= 9, "…and the word ledger itself is untouched");

// ─────────────────────────────────────────────────────────────────────────────
section("9. the compare slot says which gap it is, before it counts tested items");
// Read out of the source rather than executed: _pdxLedgerSlot is defined inside
// compare-hub.js's page bootstrap, which wants a DOM this harness does not build.
// What matters is ORDER — a pid with nine resolved pledges has cov.tested === 9,
// so a noFormalLane branch placed after that one can never be reached.
const HUB = R("compare-hub.js");
const iSlot = HUB.indexOf("window._pdxLedgerSlot = function");
must(iSlot !== -1, "compare-hub.js no longer defines window._pdxLedgerSlot");
const iEmpty = HUB.indexOf("waL.noFormalLane(opts.pid, r, p)", iSlot);
const iTested = HUB.indexOf("cov.tested > 0", iSlot);
must(iTested !== -1, "the ledger slot no longer has a cov.tested branch to order against");
ok(iEmpty !== -1, "the ledger slot asks whether the formal lane is empty");
ok(iEmpty !== -1 && iEmpty < iTested,
  "…and asks it BEFORE counting tested items, or a pledge ledger reaches the branch first");
has(HUB.slice(iSlot, iTested), "No formal record on file",
  "the ledger slot names the missing formal record instead of saying 'Not enough record yet'");

// ─────────────────────────────────────────────────────────────────────────────
section("10. the gate's reach over the whole shipped roster");
// The scope, checked against the real roster rather than against six hand-picked
// pids. A gate that suppresses the one percentage on the profile has to be able to
// say exactly whose profile it can reach, and the answer must stay "offices that
// cast no floor votes" as the roster grows.
const roster = Object.keys(CMP);
must(roster.length > 500, `only ${roster.length} profiles in this sandbox — the sweep proves nothing`);
const gated = [];
const gatedWithFloorVotes = [];
for (const pid of roster) {
  const prof = CMP[pid];
  let r = null;
  try { r = WA.read(pid, prof); } catch (e) { r = null; }
  if (!r) continue;
  if (!WA.noFormalLane(pid, r, prof)) continue;
  gated.push(pid);
  if (!WA.castsNoFloorVotes(pid, prof)) gatedWithFloorVotes.push(pid + " (" + (prof.office || "no office") + ")");
}
ok(gated.length > 0, `the gate reaches somebody on the shipped roster (${gated.length} profiles)`);
eq(gatedWithFloorVotes.join(" | "), "",
  "no profile whose office casts floor votes is ever gated — a member waiting on a " +
  "roll-call fetch reads as loading, never as empty");
// And named, because these are the classes the report scoped the pass to.
const gatedOffices = [...new Set(gated.map((pid) => String((CMP[pid] || {}).office || "")))].sort();
ok(gatedOffices.length > 0 && gatedOffices.every((o) => /governor|attorney general|secretary of state|state treasurer|state auditor|superintendent|president/i.test(o)),
  `every gated office is a statewide or federal executive one: ${gatedOffices.join(", ")}`);
// The other half of the same fact: nobody who publishes today stops publishing. The
// gate was written to subtract a percentage that had no record under it, and on the
// shipped data there is no such percentage outside the executive offices above.
const lostANumber = [];
for (const pid of roster) {
  const prof = CMP[pid];
  let r = null;
  try { r = WA.read(pid, prof); } catch (e) { r = null; }
  if (!r || r.pct !== null) continue;
  if (!WA.noFormalLane(pid, r, prof)) continue;
  // Would this read have cleared both floors on its own, gate aside?
  if (r.tested.length >= WA.MIN_TESTED_ITEMS && r.testedWeight >= WA.MIN_TESTED_WEIGHT) {
    lostANumber.push(pid + " (" + (prof.office || "no office") + ")");
  }
}
ok(lostANumber.every((x) => /Governor|Attorney General|Secretary of State|Treasurer|Auditor|Superintendent|President/i.test(x)),
  `only executive offices lose a number to this gate: ${lostANumber.join(" | ") || "none on the shipped ledgers"}`);

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ empty formal lane: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f + "\n");
  process.exit(1);
}
console.log(`\n✓ empty formal lane: ${passed} assertions passed`);
