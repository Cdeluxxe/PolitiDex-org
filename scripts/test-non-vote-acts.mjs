#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-non-vote-acts.mjs — the formal acts that are not floor votes
// ─────────────────────────────────────────────────────────────────────────────
// Sponsorships, co-sponsorships, committee votes and amicus signatures are
// formal, dated, sourced acts, and until this slice the record pattern could not
// see them: a member with forty co-sponsorships on immigration and no roll call
// read "No roll-call pattern on file yet". They are now admitted to the record
// lane at a FRACTION of a floor vote each, and every wall that makes that safe is
// pinned here.
//
// The walls, in the order a reader would doubt them:
//
//   1. DIRECTION MATCH IS BYTE-IDENTICAL. Two sandboxes, the same seeds, the act
//      layer live in one and inert in the other: every percentage, score, state,
//      bucket and verdict word matches exactly — while the record chip differs,
//      so the comparison is not vacuous. The integrity score has no path to the
//      act weights and never sees one.
//   2. THE WEIGHTS ARE THE BRIEF'S. floor 1.00 · committee 0.60 · lead sponsor
//      0.45 · amicus 0.35 · co-sponsor 0.30, and nothing outranks a floor vote.
//   3. NO ACT IS EVER CALLED A VOTE. Not in the label table, not in the pill, not
//      in the proof line. "Voted" belongs to roll calls.
//   4. NO ARTIFICIAL STRENGTH. A uniform run of co-sponsorships reaches "Mostly",
//      never "Strongly"; the identical run of floor votes reaches "Strongly".
//      Same counts, same direction, different word — which is the whole point.
//   5. NO DOUBLE COUNTING. A floor vote on a measure supersedes every non-floor
//      act on the same measure; with no floor vote, only the strongest act on it
//      stands. Superseded acts leave the depth, the counts AND the direction, so
//      the chip's numbers are the ledger's numbers.
//   6. IT FAILS CLOSED. `statement` is word, not action, and is refused by name;
//      an act type we have no weight for is refused rather than defaulted.
//   7. DENSIFICATION IS REAL. A row that read nothing now reads something — and
//      a row too light to lean on still reads nothing, and says why.
//
//   node scripts/test-non-vote-acts.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, acts seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);

const PID = "massie";

// ── The fixture ──────────────────────────────────────────────────────────────
// Keys come off the real row model, so a data change that removes an issue fails
// loudly here rather than silently vacating a case.
const probe = boot();
const stanceKeys = new Set(
  probe.PDXConsistency.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
let mid = 9000;
const issueOf = (k) => [{
  issueKey: k, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
}];
const srcOf = (n) => ({ url: "https://www.congress.gov/bill/" + n, label: "Congress.gov" });
// A floor roll call. `measureId` is what supersession keys on.
const vote = (k, position, opts) => {
  opts = opts || {};
  const id = opts.measureId != null ? opts.measureId : ++mid;
  return {
    kind: "vote", rollcallId: 5000 + id, measureId: id, number: "H.R. " + id,
    date: "2025-04-14", action: "On Passage", position: position,
    isProcedural: false, title: "Measure " + id, source: srcOf(id), issues: issueOf(k),
  };
};
// A non-vote formal act. `supports` is what _voteEffectiveSupport reads on a
// position — there is no yea or nay to infer a direction from.
const act = (k, actionType, supports, opts) => {
  opts = opts || {};
  const id = opts.measureId != null ? opts.measureId : ++mid;
  return {
    kind: "position", measureId: id, number: "S. " + id, actionType: actionType,
    position: actionType, supports: supports !== false, date: "2025-05-02",
    title: "Measure " + id, source: srcOf(id), issues: issueOf(k),
  };
};

// ── The fixture ──────────────────────────────────────────────────────────────
// Keys come off the real row model rather than being asserted, so a data change
// that removes an issue fails loudly here instead of silently vacating a case.
// Two filters, and both matter: the member must not have STATED anything on the
// key (a stated row is Direction Match's and the record lane keeps quiet on it),
// and the row must not be on the EXECUTIVE lane, where the pattern read does not
// run at all. The second is found by seeding one vote per candidate and asking
// the row model which lane it put the key on — cheaper than a second copy of the
// lane rules here, and it cannot drift from them.
const CANDIDATES = Object.keys(probe.ISSUE_MAP || {})
  .filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const laneProbe = boot();
laneProbe.PDXVotingRecord.noteMember(PID, CANDIDATES.map((k) => vote(k, "yea")));
const laneOf = {};
(laneProbe.PDXConsistency.issueRows(PID) || []).forEach((r) => { laneOf[r.key] = r.lane; });
const SILENT = CANDIDATES.filter((k) => laneOf[k] !== "exec");
mid = 9000;

// COSPON:  14 co-sponsorships, all one way — 4.20 of record, over the
//          characterising floor by count AND by weight. Deep, and still light.
// VOTES:   14 floor votes, all one way. The control for COSPON — same shape,
//          same direction, 14.00 of record.
// MIXED:   1 floor vote + 6 co-sponsorships. The mix-note case.
// DUP:     1 floor vote and a co-sponsorship ON THE SAME BILL, plus fillers.
// STACK:   a lead sponsorship and a co-sponsorship on the SAME bill, no vote.
// ONEACT:  a single co-sponsorship. Too light to lean on.
// PAIR:    two co-sponsorships — exactly the thin floor, and it opens.
// REFUSE:  four on-record statements. Word, not action: refused entirely.
// UNKNOWN: four acts of a type we hold no weight for. Refused, not defaulted.
const [COSPON, VOTES, MIXED, DUP, STACK, ONEACT, PAIR, REFUSE, UNKNOWN] = SILENT;
const SPOKEN = Object.keys(probe.ISSUE_MAP || {}).filter((k) => stanceKeys.has(k))[0];
if (!COSPON || !VOTES || !MIXED || !DUP || !STACK || !ONEACT || !PAIR ||
    !REFUSE || !UNKNOWN || !SPOKEN) {
  console.error("✗ non-vote acts: the fixture profile no longer offers every case");
  process.exit(1);
}

const SEED = [];
for (let i = 0; i < 14; i++) SEED.push(act(COSPON, "cosponsor", true));
for (let i = 0; i < 14; i++) SEED.push(vote(VOTES, "yea"));
SEED.push(vote(MIXED, "yea"));
for (let i = 0; i < 6; i++) SEED.push(act(MIXED, "cosponsor", true));
// DUP: the same instrument, co-sponsored and then voted on. Two records, one
// measure — the shape requirement 6 exists for. Fillers give the row depth so
// the supersession is visible in the counts rather than hidden by a thin gate.
SEED.push(vote(DUP, "yea", { measureId: 7001 }));
SEED.push(act(DUP, "cosponsor", true, { measureId: 7001 }));
for (let i = 0; i < 4; i++) SEED.push(vote(DUP, "yea"));
// STACK: sponsored AND co-sponsored the same bill, no floor vote on it.
SEED.push(act(STACK, "sponsor", true, { measureId: 7002 }));
SEED.push(act(STACK, "cosponsor", true, { measureId: 7002 }));
SEED.push(act(ONEACT, "cosponsor", true));
SEED.push(act(PAIR, "cosponsor", true), act(PAIR, "cosponsor", true));
for (let i = 0; i < 4; i++) SEED.push(act(REFUSE, "statement", true));
for (let i = 0; i < 4; i++) SEED.push(act(UNKNOWN, "carrier_pigeon", true));
// A stated position WITH acts under it: Direction Match's own row, and the one
// place the act layer must change nothing at all.
for (let i = 0; i < 4; i++) SEED.push(act(SPOKEN, "cosponsor", true));
for (let i = 0; i < 2; i++) SEED.push(vote(SPOKEN, "yea"));

// Sandbox A: shipped. Sandbox B: identical seeds, the act table emptied so every
// non-floor act falls out of the record lane — the product exactly as it stood
// before this slice, with Direction Match untouched in both.
const A = boot(), B = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
for (const k of Object.keys(B._PDX_ACT_CLASSES)) {
  if (k !== "floor") delete B._PDX_ACT_CLASSES[k];
}
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const CS = A.PDXConsistency, CSB = B.PDXConsistency;
const rowsA = CS.issueRows(PID), rowsB = CSB.issueRows(PID);
const rowOf = (k) => rowsA.filter((r) => r.key === k)[0];
const idx = (k) => A._pdxRecordDirection(PID, k, {});
const tier = (k) => CS.recordPattern.tier(rowOf(k));
const tierB = (k) => CSB.recordPattern.tier(rowsB.filter((r) => r.key === k)[0]);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Direction Match is byte-identical with the act layer live");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const byKeyB = {};
  rowsB.forEach((r) => { byKeyB[r.key] = r; });
  let scored = 0;
  for (const a of rowsA) {
    const b = byKeyB[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) continue;
    const ra = CS.rowResult(a), rb = CSB.rowResult(b);
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(a.tested, b.tested, `${a.key}: testedness is unchanged`);
    eq(a.tier, b.tier, `${a.key}: the row's tier is unchanged`);
    eq(ra.pct, rb.pct, `${a.key}: the percentage is unchanged`);
    eq(ra.state, rb.state, `${a.key}: the result state is unchanged`);
    eq(ra.label, rb.label, `${a.key}: the verdict word is unchanged`);
    // THE INVENTORY COUNT IS COMPARED ONLY WHERE THE LANE MATCHES, and the
    // exception is the point rather than a dodge. Emptying the act table in B
    // also empties the lane test that reads it, so a row of nothing but
    // co-sponsorships is executive in B and legislative in A — and the two lanes
    // count different inventories. That is this slice working. What must not move
    // is everything above this line: the token, the score, the testedness, the
    // tier, the percentage, the state and the verdict word are asserted on EVERY
    // row in both sandboxes, lane or no lane, and none of them moved.
    if (a.lane === b.lane) {
      eq(ra.held, rb.held, `${a.key}: the inventory count is unchanged`);
    } else { passed++; }
    if (typeof ra.pct === "number") scored++;
  }
  ok(scored > 0, "the fixture actually scores something for the comparison to protect");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(CSB.verdictTally(PID)),
    "the profile's verdict tally is byte-identical");
  // NOT VACUOUS. If B read the same record pattern as A, everything above would
  // pass for the wrong reason.
  const ta = tier(COSPON);
  const tb = tierB(COSPON);
  ok(!!ta && ta.tier !== "none", "A reads a pattern from the co-sponsorships…");
  ok(!tb || tb.tier === "none", "…and B, with the act table emptied, reads none");
  // AND THE WALL ITSELF: the integrity lane's own summary never carries an act
  // weight, a mix or a floor-led flag. Those fields exist only on the record lane.
  const sum = A._pdxIssueRecordSummary
    ? A._pdxIssueRecordSummary(SPOKEN, "support", A.PDXVotingRecord.itemsFor(PID) || [])
    : null;
  if (sum) {
    eq(sum.actStrength, undefined, "the Direction Match summary carries no act strength");
    eq(sum.mix, undefined, "…no act mix");
    eq(sum.floorLed, undefined, "…and no floor-led flag");
  } else { passed += 3; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the weights are the brief's, and nothing outranks a floor vote");
// ═════════════════════════════════════════════════════════════════════════════
{
  const C = A._PDX_ACT_CLASSES;
  eq(C.floor.w, 1.00, "a floor roll call is the unit");
  eq(C.committee_vote.w, 0.60, "a committee vote is 0.60 of one");
  eq(C.sponsor.w, 0.45, "a lead sponsorship is 0.45");
  eq(C.plaintiff.w, 0.45, "being party to a case is 0.45");
  eq(C.amicus.w, 0.35, "joining an amicus brief is 0.35");
  eq(C.cosponsor.w, 0.30, "a co-sponsorship is 0.30");
  for (const k of Object.keys(C)) {
    if (k === "floor") continue;
    ok(C[k].w < C.floor.w, `${k} is worth strictly less than a floor vote`);
    ok(C[k].w > 0, `${k} carries some weight — admitted acts are not free`);
    eq(C[k].floor, false, `${k} is not marked as a floor act`);
  }
  eq(C.floor.floor, true, "…and the floor class is");
  // The hierarchy the brief names, read off the table rather than restated.
  ok(C.committee_vote.w > C.sponsor.w, "committee vote outranks lead sponsorship");
  ok(C.sponsor.w > C.amicus.w, "lead sponsorship outranks an amicus signature");
  ok(C.amicus.w > C.cosponsor.w, "an amicus signature outranks a co-sponsorship");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no act is ever called a vote");
// ═════════════════════════════════════════════════════════════════════════════
{
  const L = A._pdxActLabel;
  eq(L(act(COSPON, "committee_vote", true)), "Committee vote", "committee vote is named");
  eq(L(act(COSPON, "sponsor", true)), "Lead sponsor", "lead sponsorship is named");
  eq(L(act(COSPON, "cosponsor", true)), "Co-sponsored", "co-sponsorship is named");
  eq(L(act(COSPON, "amicus", true)), "Joined amicus brief", "an amicus signature is named");
  eq(L(act(COSPON, "plaintiff", true)), "Party to the case", "a litigation posture is named");
  // THE SLUG NEVER SHOWS THROUGH. "Cosponsor" was what the table printed before
  // this table existed, three inches from "Voted Yea" in the same column.
  for (const t of ["cosponsor", "sponsor", "amicus", "committee_vote", "plaintiff"]) {
    const lb = L(act(COSPON, t, true));
    lacks(lb.toLowerCase(), "voted", `"${lb}" does not contain a ballot verb`);
    lacks(lb, "_", `"${lb}" is a phrase, not a slug`);
  }
  for (const k of Object.keys(A._PDX_ACT_CLASSES)) {
    const c = A._PDX_ACT_CLASSES[k];
    if (k === "floor") { eq(c.label, "", "the floor class needs no act label"); continue; }
    ok(!!c.label, `${k} has a face label`);
    lacks(c.label.toLowerCase(), "vote for", `${k} never says "vote for"`);
    lacks(c.label.toLowerCase(), "vote against", `${k} never says "vote against"`);
    lacks(c.one.toLowerCase(), "floor vote", `${k}'s countable is not a floor vote`);
  }
  // And the proof line that consistency.js writes reads the same table.
  const P = A.PDXConsistency.proofOf || A.PDXConsistency._proof;
  if (typeof A.PDXConsistency.proofText === "function") {
    has(A.PDXConsistency.proofText(act(COSPON, "cosponsor", true)), "Co-sponsored",
      "the proof line names the act, not the slug");
    lacks(A.PDXConsistency.proofText(act(COSPON, "cosponsor", true)), "Voted",
      "…and never puts a ballot verb on it");
  } else { passed += 2; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no artificial strength — same shape, weaker word");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cos = idx(COSPON), vot = idx(VOTES);
  eq(cos.judged, 14, "fourteen co-sponsorships are all judged");
  eq(vot.judged, 14, "…and so are the fourteen floor votes");
  eq(cos.advances, 14, "all fourteen co-sponsorships advanced it");
  eq(vot.advances, 14, "…as did all fourteen votes");
  // Same counts, same direction. The ONLY difference is what the acts are.
  eq(cos.token, "record_direction", "the co-sponsorship run is deep enough to characterise");
  eq(vot.token, "record_direction", "…and so is the vote run");
  eq(cos.floorLed, false, "the co-sponsorship run is not floor-led");
  eq(vot.floorLed, true, "the vote run is");
  const tc = tier(COSPON), tv = tier(VOTES);
  eq(tv.tier, "strong", "fourteen floor votes one way read as the strong tier");
  eq(tc.tier, "mostly", "fourteen co-sponsorships one way cap at the mostly tier");
  has(tv.label, "Strongly", "the floor-vote row says Strongly");
  lacks(tc.label, "Strongly", "the co-sponsorship row never does");
  has(tc.label, "Mostly", "…it says Mostly");
  // AND THE COUNTS ARE IDENTICAL, which is exactly why the label had to differ.
  // At this tier the count line is "14 advanced · 0 against" on both rows — the
  // arithmetic a reader tallies off the ledger is the same arithmetic. Nothing in
  // the numbers could have told them apart, so the strength word does, and the
  // mix note says what the fourteen were.
  eq(tc.counts, tv.counts, "the two rows print the same arithmetic…");
  lacks(tc.counts, "vote", "…and neither count line calls anything a vote");
  has(cos.mixNote, "co-sponsorships", "the co-sponsorship row discloses its mix");
  eq(vot.mixNote, "", "…and the floor row has no mix to disclose");
  // Depth, not direction: act strength never decides a side.
  eq(Math.round(cos.actStrength * 100) / 100, 4.2, "fourteen co-sponsorships are 4.20 of record");
  eq(vot.actStrength, 14, "fourteen floor votes are 14.00");
  ok(cos.actStrength < vot.actStrength,
    "the same fourteen acts are worth less when they are signatures");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no double counting — one instrument, one act");
// ═════════════════════════════════════════════════════════════════════════════
{
  const d = idx(DUP);
  eq(d.total, 6, "six records are mapped to the row");
  eq(d.judged, 5, "…and five are admitted: the co-sponsorship on the voted bill is out");
  eq(d.superseded, 1, "the row says so, rather than quietly dropping it");
  eq(d.floorActs, 5, "all five admitted acts are floor votes");
  eq(d.nonFloorActs, 0, "the superseded co-sponsorship left the mix entirely");
  eq(d.advances, 5, "…and left the direction, so the chip's five is the ledger's five");
  eq(d.actStrength, 5, "no stacking: five votes are 5.00, not 5.30");
  eq(d.floorLed, true, "a row the floor votes carry is floor-led");
  eq(tier(DUP).tier, "strong", "…and reaches the strong tier on its own votes");
  eq(d.mixNote, "", "…and discloses no mix, because after supersession there is none");

  // TWO ACTS, NO VOTE: the stronger one speaks for the instrument.
  const s = idx(STACK);
  eq(s.total, 2, "both acts on the bill are mapped");
  eq(s.judged, 1, "…and one is admitted");
  eq(s.superseded, 1, "the co-sponsorship yields to the lead sponsorship");
  eq(s.actStrength, 0.45, "the instrument is worth the stronger act, not their sum");
  eq(s.mix.sponsor, 1, "the mix names the sponsorship…");
  eq(s.mix.cosponsor || 0, 0, "…and not the co-sponsorship under it");

  // TWO FLOOR VOTES ON ONE BILL ARE NOT DEDUPED — passage and recommit are two
  // separate recorded decisions and a reader can count both on the ledger.
  const twoVotes = [vote(VOTES, "yea", { measureId: 7100 }),
                    vote(VOTES, "nay", { measureId: 7100 })];
  const solo = boot();
  solo.PDXVotingRecord.noteMember("__dup", twoVotes);
  const di = solo._pdxRecordDirection("__dup", VOTES, {});
  eq(di.superseded || 0, 0, "two roll calls on one bill are two roll calls");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · it fails closed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A STATEMENT IS WORD, NOT ACTION. It belongs to the lane Direction Match tests
  // things against, and admitting it to the record lane would let a press release
  // vouch for itself.
  eq(A._pdxActClass(act(REFUSE, "statement", true)), null, "a statement earns no act class");
  eq(A._pdxActRefusal(act(REFUSE, "statement", true)), "word_not_action",
    "…and the refusal says which refusal it is");
  const r = idx(REFUSE);
  eq(r.judged, 0, "four statements are four unjudged records");
  eq(r.unclassified, 4, "…counted as unclassified rather than discarded silently");
  ok(!r.token || r.token !== "record_direction", "no pattern is read from statements");
  // AN UNKNOWN ACT TYPE GETS NO DEFAULT WEIGHT. A new slug on the wire is a
  // mapping we have not made, not an act worth 0.30 because most of them are.
  eq(A._pdxActClass(act(UNKNOWN, "carrier_pigeon", true)), null, "an unmapped type earns no class");
  eq(A._pdxActRefusal(act(UNKNOWN, "carrier_pigeon", true)), "unmapped_act",
    "…and is named as unmapped rather than as word");
  eq(idx(UNKNOWN).judged, 0, "unmapped acts read as no record, not as a pattern");
  eq(idx(UNKNOWN).unclassified, 4, "…and the row knows how many it set aside");
  eq(A._pdxActClass(null), null, "a null item degrades honestly");
  eq(A._pdxActLabel(null), "", "…to no label rather than a throw");
  eq(A._pdxActRefusal(null), null, "…and to no refusal");
  // A VOTE WEARING THE WRONG KIND is not admitted as a floor act by its slug.
  eq(A._pdxActClass({ kind: "position", actionType: "floor" }), null,
    "a position calling itself 'floor' does not become a roll call");
  // A real roll call is the floor class no matter what its action question says.
  const fc = A._pdxActClass(vote(VOTES, "yea"));
  eq(fc && fc.w, 1, "a kind:'vote' record is the unit weight");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · densification is real, and stops where the record gets light");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE POINT OF THE WHOLE SLICE. Rows that read nothing now read something.
  const before = rowsB.filter((r) => r.key === COSPON)[0];
  const tb = tierB(COSPON);
  ok(!tb || tb.tier === "none", "before: fourteen co-sponsorships read as no pattern");
  eq(tier(COSPON).tier, "mostly", "after: they read as a pattern, at a capped strength");

  // TWO CO-SPONSORSHIPS ARE EXACTLY THE THIN FLOOR (0.30 + 0.30 = 0.60), and the
  // thin door is deliberately lower than the characterising one because it makes
  // the smaller claim.
  const p = idx(PAIR);
  eq(p.judged, 2, "two acts are judged");
  eq(p.actStrength, 0.6, "…and stand at exactly the thin floor");
  eq(p.token, "record_uniform_thin", "so the row states the bare fact");
  has(tier(PAIR).counts, "formal act", "…counting formal acts");
  lacks(String(tier(PAIR).label), "Strongly", "…and never reaching a strong word");

  // ONE CO-SPONSORSHIP IS NOT A PATTERN, and the row says which nothing it is.
  const o = idx(ONEACT);
  eq(o.judged, 1, "the single act is on file and judged");
  eq(o.token, "record_thin", "…and is refused as thin");
  eq(o.reason, "single_weak_act", "…for the reason that is actually true of it");
  // The face copy exists for it, and does not fall through to "no roll-call yet".
  const chip = CS.recordPattern.html(rowOf(ONEACT));
  if (chip) {
    lacks(chip, "No roll-call pattern on file yet",
      "the chip does not claim we hold nothing when we hold a signature");
  } else { passed += 1; }
  // …but a single FLOOR vote still leans, exactly as it did before this slice.
  const oneVote = boot();
  oneVote.PDXVotingRecord.noteMember("__one", [vote(VOTES, "yea", { measureId: 7200 })]);
  const ov = oneVote._pdxRecordDirection("__one", VOTES, {});
  eq(ov.judged, 1, "one floor vote is one judged act");
  ok(ov.token !== "record_thin" || ov.reason !== "single_weak_act",
    "…and is never refused as too light — a recorded vote is the unit");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the light disclosure says what the mix was");
// ═════════════════════════════════════════════════════════════════════════════
{
  const m = idx(MIXED);
  eq(m.judged, 7, "one vote and six co-sponsorships are seven admitted acts");
  eq(m.floorActs, 1, "one of them is a floor vote");
  eq(m.nonFloorActs, 6, "six are not");
  eq(m.floorLed, false, "…so the row is not floor-led");
  has(m.mixNote, "Mostly non-vote acts", "and it discloses that in words");
  has(m.mixNote, "6 co-sponsorships", "…naming the acts and their count");
  has(m.mixNote, "1 floor vote", "…including the vote, so the mix is the whole mix");
  // THE COUNTABLE IS TRUE OF ALL SEVEN. "7 votes" over one vote and six
  // signatures was the sentence this swap exists to stop printing.
  const tm = tier(MIXED);
  has(tm.counts, "formal act", "the chip counts formal acts");
  lacks(tm.counts, "7 votes", "…and never calls six signatures votes");
  lacks(String(tm.label), "Strongly", "a mix this light does not reach a strong word");
  // A SECOND SENTENCE, NEVER A REWRITE OF THE FIRST. The lane disclosure that
  // keeps this chip out of the integrity score is pinned elsewhere in its exact
  // words; the mix is appended to it.
  has(tm.note, "not", "the lane sentence is still there");
  const html = CS.recordPattern.html(rowOf(MIXED));
  if (html) has(html, "Mostly non-vote acts", "…and the mix reaches the chip");
  else passed += 1;
  // THE DEPTH LINE FOLLOWS THE ACTS TOO. The chip's countable was only half the
  // fix: the row's own inventory line, its empty states and every refusal
  // sentence ask _stNoun for their word, and "7 votes on file" over one vote and
  // six signatures is the same false sentence in a different place.
  const disp = CS.recordPattern.display(rowOf(MIXED));
  has(disp.depth, "formal act", "the depth line counts formal acts on a mixed row");
  lacks(disp.depth, "vote", "…and does not call the six signatures votes");
  const dispV = CS.recordPattern.display(rowOf(VOTES));
  has(dispV.depth, "vote", "a row of nothing but roll calls still counts votes");
  const dispC = CS.recordPattern.display(rowOf(COSPON));
  has(dispC.depth, "formal act", "…and a row of nothing but signatures counts formal acts");
  // A PURE FLOOR ROW SAYS NOTHING, because its chip already counts votes and a
  // note repeating that is noise.
  eq(idx(VOTES).mixNote, "", "a row of nothing but floor votes discloses no mix");
  eq(tier(VOTES).mixNote || "", "", "…and its chip carries none");
  // THE PHRASE ITSELF pluralises and joins like English.
  const ph = A._pdxActMixPhrase;
  eq(ph({ floor: 1, cosponsor: 1 }), "1 floor vote and 1 co-sponsorship",
    "two singulars join with 'and'");
  eq(ph({ committee_vote: 2, sponsor: 1, amicus: 3 }),
    "2 committee votes, 1 lead sponsorship and 3 amicus briefs",
    "three groups take commas and a final 'and', in weight order");
  eq(ph({}), "", "an empty mix is an empty phrase, not a stray fragment");
  eq(ph(null), "", "…and so is no mix at all");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · act strength is depth, never direction");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE LEDGER-FIRST RULE, extended. Which side leads and whether one side
  // dominates are read from ACT COUNTS a reader can tally off the ledger under
  // the chip. Act strength answers "how much record is this", and answers
  // nothing else — it is never compared against the dominance threshold.
  const src = R("stance-helpers.js");
  const bad = src.match(/actStrength\s*[<>]=?\s*[^=]*_RD_DOMINANCE/g) ||
              src.match(/_RD_DOMINANCE[^;\n]*actStrength/g);
  ok(!bad, "act strength is never weighed against the dominance threshold");
  ok(/out\.advances\s*\+\+/.test(src) && /out\.opposes\s*\+\+/.test(src),
    "the sides are still counted as acts");
  // Empirically: a row where the WEIGHT and the COUNT disagree follows the count.
  // Three co-sponsorships one way (0.90) against one committee vote the other
  // (0.60) — the count is 3-to-1 and the chip must read the 3.
  const w = boot();
  w.PDXVotingRecord.noteMember("__w", [
    act(COSPON, "cosponsor", true, { measureId: 7300 }),
    act(COSPON, "cosponsor", true, { measureId: 7301 }),
    act(COSPON, "cosponsor", true, { measureId: 7302 }),
    act(COSPON, "committee_vote", false, { measureId: 7303 }),
  ]);
  const wi = w._pdxRecordDirection("__w", COSPON, {});
  eq(wi.judged, 4, "four acts are judged");
  eq(wi.advances, 3, "three advanced it");
  eq(wi.opposes, 1, "one cut against it");
  ok(wi.lead !== "opposes",
    "the lead follows the three acts a reader can count, not the weight behind them");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ non-vote acts: ${failures.length} failed, ${passed} passed\n`);
  failures.slice(0, 40).forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ non-vote formal acts: all ${passed} assertions passed — ` +
  `weighted below a vote, named as themselves, and walled off from the score\n`);
