#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-live-counts.mjs — one counts object, live chips, and a Record slot that
// starts at the first formal item
// ─────────────────────────────────────────────────────────────────────────────
// Three related contracts, tested together because they are one product rule
// seen from three surfaces:
//
//   0. ONE COUNTS OBJECT. PDXConsistency.profileCounts(pid) is the only place a
//      "N of M" about a profile's issues is derived, and every figure on it
//      carries a label naming WHICH M it is. No surface may keep a parallel
//      total.
//   1. THE QUICK CHIPS ARE LIVE. The rail's figures come from one derivation
//      (window._pdxNavChips) read by both the build-time string and the warm
//      repaint, they agree with the section each chip jumps to, and while an
//      engine is still warming they say so instead of printing an integer they
//      would have to take back.
//   2. ONE MAPPED FORMAL ITEM IS ALREADY A RECORD — for DISPLAY. A single vote,
//      or a single executive action, is enough to show a Record line with its
//      depth. It is NOT enough to score anything: Direction Match's floors are
//      untouched, and this file pins them.
//
//   node scripts/test-live-counts.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, roll-call votes
// seeded the way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// profiles-full.js is here because the chips live in it: asserting the chip
// derivation from the engine side only would leave the rail untested.
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
  "exec-record-ui.js",
  "issue-colors.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
  "stance-tree.js",
  "profiles-full.js",
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
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`✗ live counts: ${msg}`);
  process.exit(2);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// A roll-call member with real stated positions, and votes seeded at three
// depths so the display bar and the scoring floors can be told apart:
//
//   DEEP    — twelve mapped votes: deep enough for the pattern engine AND for
//             Direction Match.
//   ONEVOTE — exactly one mapped vote: enough for a Record line, and not enough
//             to score anything.
//   TWOVOTE — two: still under Direction Match's three-item floor.
const PID = "khanna";
const EXEC = "trump";

const probe = boot();
must(!!probe.PDXConsistency, "consistency.js did not publish PDXConsistency");
must(typeof probe.PDXConsistency.profileCounts === "function",
  "PDXConsistency.profileCounts is not exported — Phase 0's one counts object is the whole contract");
must(!!probe.PDXStanceTree, "stance-tree.js did not publish PDXStanceTree");
must(typeof probe._pdxNavChips === "function",
  "profiles-full.js does not publish window._pdxNavChips — the chips have no single derivation");

const stanceOf = {};
probe.PDXConsistency.issueRows(PID).forEach((r) => {
  if (r.stance && r.stance.key) stanceOf[r.key] = r.stance.key;
});
const SAID_SUPPORT = Object.keys(stanceOf).filter((k) => stanceOf[k] === "support");
must(SAID_SUPPORT.length >= 3, "the fixture no longer offers three supported issues");
const [DEEP, ONEVOTE, TWOVOTE] = SAID_SUPPORT;

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 1100 + n, number: "H.R. " + (300 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, DEEP, "yea"));
SEED.push(vote(40, ONEVOTE, "yea"));
SEED.push(vote(50, TWOVOTE, "yea"));
SEED.push(vote(51, TWOVOTE, "yea"));

// WARM is the profile after the roll-call fetch came back. COLD is the same
// profile a beat earlier, with nothing noted — the state every profile is in on
// first paint, and the one a frozen string used to lie about.
const WARM = boot();
WARM.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const COLD = boot();

const CS = WARM.PDXConsistency;
const T = WARM.PDXStanceTree;
const counts = CS.profileCounts(PID);
const leaves = T.leaves(PID);
const byKey = {};
leaves.forEach((lf) => { byKey[lf.key] = lf; });

// ═════════════════════════════════════════════════════════════════════════════
section("0 · one counts object, and every figure names its own M");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FIGURES = ["total", "stated", "tested", "scorable", "onRecord", "scored", "shown", "signature"];
  eq(Object.keys(counts).sort().join(","),
     ["of", "pid", "warming"].concat(FIGURES).sort().join(","),
    "the counts object holds exactly the documented figures — a new one is a new parallel total");
  FIGURES.forEach((k) => {
    eq(typeof counts[k], "number", `counts.${k} is a number`);
    ok(counts[k] >= 0, `counts.${k} is not negative`);
    ok(!!counts.of[k] && counts.of[k].length > 4,
      `counts.of.${k} names which M this figure is out of — a bare integer is unreadable`);
  });
  eq(typeof counts.warming, "boolean", "counts.warming says whether an engine is still answering");
  eq(counts.pid, PID, "…and the object names the profile it describes");

  // The invariants that make the figures safe to print beside each other.
  const sample = ["khanna", EXEC, "aoc", "mike_johnson", "bernie", "chuck_schumer"]
    .filter((p) => WARM.CMP_DATA[p]);
  must(sample.length >= 4, "the roster no longer offers the sampled profiles");
  sample.forEach((pid) => {
    const c = CS.profileCounts(pid);
    ok(c.stated <= c.total, `${pid}: stated positions cannot outnumber the issues we track`);
    ok(c.tested <= c.scorable, `${pid}: Direction Match cannot test more issues than it counts`);
    ok(c.scored <= c.onRecord, `${pid}: the formal record cannot score an issue it holds no item on`);
    ok(c.onRecord <= c.total, `${pid}: …nor hold items on more issues than exist`);
    ok(c.shown <= c.total && c.shown >= c.stated,
      `${pid}: the browse population is every stated issue plus every issue on record`);
    eq(JSON.stringify(CS.profileCounts(pid)), JSON.stringify(c),
      `${pid}: two reads of the counts object agree — it derives, it does not accumulate`);
  });

  // NO PARALLEL TOTALS. Both surfaces that print a count read the accessor.
  has(R("stance-tree.js"), "profileCounts", "the tree's tally reads the counts object");
  has(R("profiles-full.js"), "profileCounts", "…and so does the rail's chip derivation");
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the chips are live, and they match the section they jump to");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chips = WARM._pdxNavChips(PID, WARM.CMP_DATA[PID]);
  ok(!!chips.record, "the Record chip is built for a profile with a formal record");
  eq(chips.record.pending, false, "…and it is not pending once the record has arrived");
  eq(chips.record.value, counts.scored + " of " + counts.onRecord + " tested",
    "the Record chip's figure is the counts object's, not a second coverage read");
  has(chips.record.note, counts.of.scored, "…and its accessible note names the numerator's M");
  has(chips.record.note, counts.of.onRecord, "…and the denominator's");

  // CHIP ↔ SECTION. The Record chip jumps to the Official Record, whose own
  // digest leads with the number of issues it tested. One number, two places.
  const orSection = CS.officialRecordSectionHtml(PID, WARM.CMP_DATA[PID]) || "";
  must(orSection.length > 400, "the Official Record renders nothing for the fixture");
  const digest = (orSection.match(/(\d+) issues? tested against (?:orders, signings and vetoes|roll-call votes)/) || [])[1];
  must(digest !== undefined, "the Official Record digest no longer states what it tested");
  eq(Number(digest), counts.scored,
    "the Record chip and the section it jumps to state different totals — the chip is the\n" +
    "    compressed version of that section, so its numerator is that section's own");

  // The ⚖️ chip is the one percentage, and it is the engine's, not a rounding of
  // something else.
  const wa = WARM.PDXWordAction.read(PID, WARM.CMP_DATA[PID]);
  ok(!!chips.wordaction, "the ⚖️ chip is built for a profile with a stated word");
  if (wa && wa.pct !== null) {
    eq(chips.wordaction.value, wa.pct + "%", "…and prints Direction Match's own percentage");
  } else {
    ok(/Checking|Thin record|Untested/.test(chips.wordaction.value),
      "…and where there is no percentage it prints the engine's own honest state");
  }
  has(chips.wordaction.note, "Direction Match", "…with the metric named in its accessible note");

  // The tree's tally is the same object, printed. Every integer in it is a figure
  // from the counts object, and each one says which M it means.
  const html = T.html(PID, { uid: "t" });
  const tally = (html.match(/<p class="pdxtree-tally">[\s\S]*?<\/p>/) || [])[0] || "";
  must(!!tally, "the tree no longer prints a tally");
  has(tally, counts.shown + " issue", "the tally leads with the number of issues on the tree");
  has(tally, counts.stated + " with a stated position", "…then the stated population");
  has(tally, counts.onRecord + " with a formal record on file", "…then the record bar");
  has(tally, counts.tested + " of " + counts.scorable + " tested by Direction Match",
    "…and Direction Match's coverage, named as Direction Match's");
  has(tally, counts.of.shown, "every bit of the tally names which M it is out of");
  has(tally, counts.of.onRecord, "…including the record bar's");
  eq(T.count(PID), counts.shown,
    "the tree renders exactly the browse population the counts object reports");
  eq(leaves.length, counts.shown, "…leaf for leaf");
  eq(T.counts(PID).onRecord, counts.onRecord,
    "the tree's own accessor is the shared one, not a copy of it");

  // PENDING, NEVER A WRONG INTEGER. Cold, the roll-call lane has not answered.
  const cold = COLD.PDXConsistency.profileCounts(PID);
  eq(cold.warming, true, "a profile whose roll-call fetch has not returned is warming");
  const coldChips = COLD._pdxNavChips(PID, COLD.CMP_DATA[PID]);
  if (coldChips.record) {
    eq(coldChips.record.pending, true, "…so the Record chip is pending");
    ok(!/\d/.test(coldChips.record.value),
      `…and prints no integer at all while warming (got ${JSON.stringify(coldChips.record.value)})`);
  } else {
    ok(true, "…and no Record chip is built at all, which is also not a wrong integer");
  }
  const coldTally = (COLD.PDXStanceTree.html(PID, { uid: "c" })
    .match(/<p class="pdxtree-tally">[\s\S]*?<\/p>/) || [])[0] || "";
  must(!!coldTally, "the cold tree prints no tally");
  has(coldTally, COLD.PDXStanceTree.TALLY_WARM,
    "the cold tally says the formal record is still being read");
  lacks(coldTally, "with a formal record on file",
    "…and states no record bar it would have to correct one event later");
  lacks(coldTally, "tested by Direction Match",
    "…nor a coverage ratio over a denominator that has not settled");

  // The repaint is bound to the same event the rest of the profile rebuilds on,
  // and it writes into pills that already exist.
  const PF = R("profiles-full.js");
  has(PF, "pdx-consistency-warm", "the rail repaints on the shared warm event");
  has(PF, "window._pdxNavLive", "…through one repaint entry point");
  has(PF, "data-pdxnav-live", "…into pills that publish the key it writes back into");
  ok(/_pdxNavChipAria\(/.test(PF),
    "…and the spoken name is rebuilt with the figure, so it cannot fall behind the visible one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one formal item is already a record — for display only");
// ═════════════════════════════════════════════════════════════════════════════
{
  const one = byKey[ONEVOTE];
  must(!!one, `${ONEVOTE}: the one-vote fixture row is missing from the tree`);
  const rc = one.record;
  eq(rc.onRecord, true, `${ONEVOTE}: one mapped vote puts the issue on the record bar`);
  eq(rc.items, 1, "…of exactly one item");
  eq(rc.depth, "1 vote", "…and the depth says one, in the singular");
  ok(!!rc.label, "…the Record slot is not blank");
  ok(rc.state !== "none", `…and does not claim there is no record (state ${rc.state})`);
  eq(rc.early, true, "…it is marked as an early signal");
  ok(/more votes can change this/.test(rc.earlyNote || ""),
    "…and says in words that more votes can change it");
  // Whether ONE item also gets a VERDICT is the scoring engine's call, not this
  // bar's: a row Direction Match resolved carries its verdict language and its
  // percentage, and a row it did not carries a description of the record. Either
  // way the depth is printed, and either way the slot is not blank.
  if (rc.scored) {
    eq(typeof rc.pct, "number", "…a scored one-item row carries the score's own percentage");
    eq(rc.metric, "Direction match", "…named as Direction Match");
    ok(["Contradicted", "Mixed", "Backed up", "Thin record"].indexOf(rc.label) !== -1,
      `…and the score's own word for it (got ${JSON.stringify(rc.label)})`);
  } else {
    eq(rc.pct, null, "…an unscored one-item row carries no percentage");
    ok(!!rc.label, "…only a description of what is on file");
  }

  // THE PROFILE-LEVEL FLOOR DID NOT MOVE. Direction Match publishes a pooled
  // percentage only over three tested items and four weight, and a profile whose
  // whole record is two thin issues still gets no headline number — while both of
  // those issues DO get a Record line. That is the whole shape of this pass: the
  // display bar is under the score, not through it.
  const FLOOR = boot();
  FLOOR.PDXVotingRecord.noteMember(PID, [vote(40, ONEVOTE, "yea"), vote(50, TWOVOTE, "yea")]
    .map((v) => JSON.parse(JSON.stringify(v))));
  const thin = FLOOR.PDXWordAction.read(PID, FLOOR.CMP_DATA[PID]);
  ok(!!thin && thin.coverage, "the thin fixture reads at all");
  ok(thin.coverage.tested < 3,
    `the thin fixture really is under the floor (tested ${thin.coverage.tested})`);
  eq(thin.pct, null,
    "a profile under Direction Match's item floor still publishes NO pooled percentage");
  const thinLeaves = FLOOR.PDXStanceTree.leaves(PID);
  const thinByKey = {};
  thinLeaves.forEach((lf) => { thinByKey[lf.key] = lf; });
  [ONEVOTE, TWOVOTE].forEach((k) => {
    const lf = thinByKey[k];
    must(!!lf, `${k}: the thin fixture row is missing from the tree`);
    eq(lf.record.onRecord, true, `${k}: …and it is on the record bar all the same`);
    ok(!!lf.record.label, `${k}: …with a Record line, under a score that does not exist`);
    ok(!!lf.record.depth, `${k}: …and the depth it is drawn from`);
  });
  eq(FLOOR.PDXConsistency.profileCounts(PID).onRecord, 2,
    "…and the counts object counts both of them as on-record");

  const deep = byKey[DEEP];
  must(!!deep, `${DEEP}: the deep fixture row is missing`);
  eq(deep.record.scored, true, `${DEEP}: a twelve-item issue is scored`);
  eq(typeof deep.record.pct, "number", "…so that row carries a %");
  eq(deep.record.depth, "12 votes", "…beside the depth it was drawn from");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the scoring floors are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Direction Match's own floors, in the file that owns them.
  const WA = R("word-action.js");
  has(WA, "var MIN_TESTED_ITEMS = 3;", "Direction Match still needs three tested items");
  has(WA, "var MIN_TESTED_WEIGHT = 4;", "…and four weight");
  has(WA, "var EVIDENCE_CAP = 3;", "…and the evidence cap is unchanged");
  // The pattern engine's floors, which the display bar sits beside and never
  // rewrites.
  const SH = R("stance-helpers.js");
  [["_RD_MEMBER_FLOOR", "12"], ["_RD_MIN_JUDGED", "4"], ["_RD_THIN_MIN", "2"],
   ["_RD_MIN_PRIMARY", "1"], ["_RD_DOMINANCE", "0.75"], ["_RD_SPLIT_MIN_JUDGED", "6"],
   ["_RD_SPLIT_MIN_SIDE", "2"], ["_RECORD_PROCEDURAL_FACTOR", "0.25"]].forEach(([k, v]) => {
    ok(new RegExp("var " + k + " = " + v.replace(".", "\\.") + ";").test(SH),
      `the pattern engine's ${k} is still ${v} — the display bar lowered no scoring floor`);
  });
  eq(WARM._PDX_RD_MIN_JUDGED, 4, "…and the published floor agrees at runtime");
  eq(WARM._PDX_RD_DOMINANCE, 0.75, "…as does the dominance threshold");

  // The display bar is a SEPARATE read. It may not be reached from a scoring path,
  // and the two walls that are about meaning rather than depth do not move with it.
  eq(typeof WARM._recordDisplayTier, "function", "the display bar is its own function");
  eq(typeof WARM._recordPatternTier === "function" || typeof WARM._recordDirectionIndex === "function",
     true, "…beside the pattern engine it defers to");
  ok(!/_recordDisplayTier/.test(WA),
    "Word vs Action never reads the display bar — a display read cannot enter the score");
  // …and the row-direction input the score reads is still the pattern engine's,
  // asserted over the function's own body rather than a window around its name.
  const CJS = R("consistency.js");
  const dirFrom = CJS.indexOf("function _stDirRaw");
  must(dirFrom !== -1, "consistency.js no longer holds the row-direction input");
  const dirBody = CJS.slice(dirFrom, CJS.indexOf("\n  function ", dirFrom + 10));
  lacks(dirBody, "_recordDisplayTier",
    "the row-direction input reads the display bar — a display read would enter the score");
  has(dirBody, "_pdxRecordDirection",
    "…instead of the pattern engine's own direction accessor");

  // A pattern-only row stays out of Direction Match, and says so three ways.
  const pOnly = leaves.filter((lf) => lf.patternOnly);
  if (pOnly.length) {
    const html = T.html(PID, { uid: "t" });
    has(html, T.PATTERN_ONLY_TAG, "a pattern-only row still carries its visible tag");
    has(html, T.PATTERN_ONLY_NOTE, "…and the tree prints the full disclosure");
    pOnly.forEach((lf) => {
      eq(lf.record.scored, false, `${lf.key}: a pattern-only row is never scored`);
      eq(lf.record.pct, null, `${lf.key}: …and never carries a percentage`);
    });
  } else {
    ok(true, "the fixture produced no pattern-only row to check here");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the executive lane has a Record too");
// ═════════════════════════════════════════════════════════════════════════════
{
  const p = WARM.CMP_DATA[EXEC];
  must(!!p, `${EXEC} is no longer on the roster`);
  must(WARM.PDXExecRecord && WARM.PDXExecRecord.eligible(EXEC),
    `${EXEC} is no longer an executive-lane profile`);
  const ec = CS.profileCounts(EXEC);
  ok(ec.onRecord > 0, `${EXEC}: formal actions put issues on the record bar`);
  eq(ec.warming, false,
    "the executive lane never warms — its actions are bundled, so nothing is pending");
  const eleaves = WARM.PDXStanceTree.leaves(EXEC);
  must(eleaves.length > 0, `${EXEC} renders no tree`);
  const onRec = eleaves.filter((lf) => lf.record && lf.record.onRecord);
  ok(onRec.length > 0, `${EXEC}: the tree shows issues with formal actions on file`);
  let blank = 0, pending = 0;
  eleaves.forEach((lf) => {
    if (!lf.record || !lf.record.label) blank++;
    if (lf.record && lf.record.state === "pending") pending++;
  });
  eq(blank, 0,
    `${EXEC}: ${blank} leaf/leaves print an empty Record slot — an executive profile has no\n` +
    "    roll-call pattern to wait for, so a blank here is permanent");
  eq(pending, 0, `${EXEC}: no leaf claims to be still checking a lane that never fetches`);
  onRec.forEach((lf) => {
    ok(lf.record.state !== "none",
      `${EXEC}/${lf.key}: an issue with formal actions must not say there is no record`);
    ok(lf.record.items > 0, `${EXEC}/${lf.key}: …and its depth counts them`);
  });
  // The lane's own nouns. A president does not have votes on file.
  const eh = WARM.PDXStanceTree.html(EXEC, { uid: "e" });
  onRec.forEach((lf) => {
    if (!lf.record.note) return;
    lacks(lf.record.note, "votes on file",
      `${EXEC}/${lf.key}: the Record note counts votes on an executive record`);
  });
  ok(/actions?\b/.test(eh), `${EXEC}: the tree speaks the executive lane's noun`);
  // And the rail's Record chip is a real figure, not a permanent blank.
  const echips = WARM._pdxNavChips(EXEC, p);
  ok(!!echips.record, `${EXEC}: the rail carries a Record chip`);
  eq(echips.record.pending, false, "…not pending");
  ok(/^\d+ of \d+ tested$/.test(echips.record.value),
    `…and it states coverage (got ${JSON.stringify(echips.record.value)})`);
  const eOr = CS.officialRecordSectionHtml(EXEC, p) || "";
  const eDigest = (eOr.match(/(\d+) issues? tested against orders, signings and vetoes/) || [])[1];
  must(eDigest !== undefined, "the executive Official Record digest no longer names its lane");
  eq(Number(eDigest), ec.scored,
    "the executive Record chip and its section state the same numerator");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ live counts: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ live counts: all ${passed} assertions passed`);
