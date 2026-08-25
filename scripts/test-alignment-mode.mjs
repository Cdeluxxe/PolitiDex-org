#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-alignment-mode.mjs — match on what they SAID, or on what the record DID
// ─────────────────────────────────────────────────────────────────────────────
// The Alignment Tool has always answered one question: "how close are this
// politician's STATED positions to mine?" That question has a blind spot the
// formal-pattern work made impossible to ignore — a member can hold a documented
// position and vote against it for years, and the stated lane will keep scoring
// the words. This slice adds the second question, "how close is their RECORD to
// mine?", as a toggle. Same issue list, same values, same verdict function; the
// only thing that changes is which side of the politician gets read.
//
// A second question is also a second way to mislead, so every fence is asserted:
//
//   1. TWO MODES, ONE ENGINE. Both lanes run the shipped verdict ladder and the
//      shipped intensity model. Neither is a re-implementation.
//   2. STATED IS THE DEFAULT, and a corrupt stored value fails to it — never to
//      the newer, sparser lane.
//   3. THEY GENUINELY DIVERGE. On a member whose votes contradict their words,
//      the two modes return different numbers and opposite per-issue verdicts.
//   4. NO INVENTED SIDES. An issue with no readable pattern is dropped from the
//      record-mode match — not guessed, and NOT quietly scored from the stated
//      position instead. Fail closed. The stated lane fails closed the other way:
//      it will fall back to the record's own direction as a BASELINE where there
//      is no documented position, but only where the record actually reads one,
//      and never over a position the candidate is on record as holding.
//   5. COVERAGE IS STATED OUT LOUD. Sparse coverage says "sparse", zero coverage
//      says there is nothing to match, and both name what fell out.
//   6. A PATTERN IS NEVER A QUOTE. Record rows carry `Record pattern:` and the
//      counts the index published; they never carry `Says:`, a stance pill, a
//      stated topic or stated prose.
//   7. THIN COUNTS LESS. A thin pattern moves the match, but strictly less than
//      a strong one on the same facts.
//   8. THE WALLS HOLD. Direction Match, the position maps, the Say-vs-Do score
//      and the verdict tally are byte-identical with the toggle flipped.
//   9. FORMAL LANE ONLY, no party framing.
//
//   node scripts/test-alignment-mode.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot(store) {
  const win = makeSandbox();
  if (store) {
    // A real browser hands the tool back whatever it last wrote. Modelling that is
    // the only way to test how a stored mode (or a corrupted one) is read.
    win.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  }
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
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ alignment mode: ${msg}`);
  process.exit(1);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// One member, and a seeded record built so the two questions cannot agree:
//
//   FLIP    a DOCUMENTED "supports" position, voted against 10 times → the
//           divergence case. Stated says Supports, the record says Mostly opposes.
//   STRONG  a silent issue, 12 votes one way        → Strongly supports
//   THIN    a silent issue, one vote                → Thin (counts, counts less)
//   SPLIT   a silent issue, 4-4                     → Split → mixed/partial
//   NONE    a silent issue, 2-to-1                  → no clear pattern → no signal
//   DARK    a silent issue with NO votes at all     → no signal, ever
const PID = "schumer";
const probe = boot();
must(typeof probe.alignSetMatchMode === "function", "alignSetMatchMode is not exposed");
must(typeof probe._calcAlignmentBreakdown === "function", "_calcAlignmentBreakdown is not exposed");

const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const POLMAP = probe._polPositionMap(PID) || {};
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
// The divergence issue: a documented SUPPORT they can be shown voting against.
const FLIP = ISSUE_KEYS.filter((k) =>
  sideable(k) && POLMAP[k] && POLMAP[k].stance === "support")[0];
const SILENT = ISSUE_KEYS.filter((k) => sideable(k) && !POLMAP[k]);
const [STRONG, THIN, SPLIT, NONE, DARK] = SILENT;
// A documented position with no votes behind it — stated mode scores it, record
// mode must not.
const SAID_ONLY = ISSUE_KEYS.filter((k) =>
  sideable(k) && POLMAP[k] && k !== FLIP)[0];
must(FLIP && STRONG && THIN && SPLIT && NONE && DARK && SAID_ONLY,
  "the fixture profile no longer offers every case");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 900 + n, measureId: 950 + n, number: "S. " + (200 + n),
  date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (900 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const SEED = [];
for (let i = 0; i < 10; i++) SEED.push(vote(i, FLIP, "nay"));          // words say support
for (let i = 0; i < 12; i++) SEED.push(vote(20 + i, STRONG, "yea"));
SEED.push(vote(40, THIN, "yea"));
for (let i = 0; i < 8; i++) SEED.push(vote(45 + i, SPLIT, i % 2 ? "nay" : "yea"));
SEED.push(vote(60, NONE, "nay"), vote(61, NONE, "nay"), vote(62, NONE, "yea"));

// The issues our test visitor cares about. Every one of them is a SUPPORT pick, so
// a "Supports" signal is a match and an "Opposes" signal is a mismatch — no
// intensity arithmetic needed to read the result.
const PICKS = [FLIP, STRONG, THIN, SPLIT, NONE, DARK];

function warm(win, seed) {
  win.PDXVotingRecord.noteMember(PID, (seed || SEED).map((v) => JSON.parse(JSON.stringify(v))));
  return win;
}
function pick(win, keys) {
  (keys || PICKS).forEach((k) => win.alignToggleIssue(k));
  return win;
}

const A = pick(warm(boot()));                      // the shipped surface, votes on file
const COLD = pick(boot());                         // same picks, no vote pack at all
const idxRows = A.PDXConsistency.formalPatternIndex.rows(PID);
const tierOf = (k) => (idxRows.filter((x) => x.key === k)[0] || {}).tier;
must(tierOf(FLIP) === "strong" || tierOf(FLIP) === "mostly",
  `the seeded flip issue read as "${tierOf(FLIP)}" — expected a deep opposing run`);
must(tierOf(THIN) === "thin", `the seeded thin issue read as "${tierOf(THIN)}"`);

const bdOf = (win, mode) => win._calcAlignmentBreakdown(PID, { mode });
const rowOf = (bd, k) => (bd && bd.issues ? bd.issues.filter((r) => r.key === k)[0] : null) || null;
const SAID = bdOf(A, "stated");
const REC = bdOf(A, "record");
must(SAID && REC, "one of the two modes produced no breakdown at all on the fixture");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · two modes, one engine");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(SAID.mode, "stated", "a stated-mode breakdown reports the mode it ran in");
  eq(REC.mode, "record", "…and so does a record-mode breakdown");
  ok(typeof SAID.overall === "number" && typeof REC.overall === "number",
    "both modes return a real overall number");
  // The verdict ladder is the shipped one: every score is one of 90/55/12 or an
  // inferred score, and every record row is exactly one of the three rungs.
  const rungs = REC.issues.map((r) => r.score);
  ok(rungs.every((s) => s === 90 || s === 55 || s === 12),
    `record rows land on the shipped 90/55/12 ladder (got ${[...new Set(rungs)].join("/")})`);
  ok(SAID.issues.length > 0 && REC.issues.length > 0, "both modes compare real issues");
  // Same values, same list, same verdict function — the tool did not fork.
  const modeMeta = A.alignMatchModeMeta("record");
  eq(modeMeta.key, "record", "the record lane publishes its own metadata");
  has(modeMeta.sub, "never part of Direction Match",
    "the record lane's own description states the wall it sits behind");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · stated is the default, and a bad value fails to it");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(boot().alignMatchMode(), "stated", "a fresh visitor is matching on stated positions");
  eq(bdOf(A).mode, "stated", "…and an un-opted breakdown runs the stated lane");
  const KEY = "politidex_align_matchmode";
  eq(boot({ [KEY]: "record" }).alignMatchMode(), "record",
    "a stored record choice is honoured on the next visit");
  eq(boot({ [KEY]: "stated" }).alignMatchMode(), "stated", "…as is a stored stated choice");
  for (const junk of ["RECORD", "records", "pattern", "", "1", "{}", "stated "]) {
    eq(boot({ [KEY]: junk }).alignMatchMode(), "stated",
      `a corrupt stored mode (${JSON.stringify(junk)}) fails to stated, not to the sparser lane`);
  }
  const w = boot();
  eq(w.alignSetMatchMode("record"), "record", "the setter switches lanes");
  eq(w.alignMatchMode(), "record", "…and the switch sticks");
  eq(w.alignToggleMatchMode(), "stated", "…and the toggle comes back");
  eq(w.alignSetMatchMode("nonsense"), "stated", "an unknown mode is not settable");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the two questions get different, honest answers");
// ═════════════════════════════════════════════════════════════════════════════
{
  const sf = rowOf(SAID, FLIP), rf = rowOf(REC, FLIP);
  must(sf && rf, "the divergence issue is missing from one of the two modes");
  eq(sf.source, "stated", "on the flip issue the stated lane reads their documented position");
  eq(sf.stance, "support", "…which is a support position");
  eq(sf.score, 90, "…so the stated lane calls it a match for a supporter");
  eq(rf.source, "record", "the record lane reads the same issue from the votes");
  eq(rf.pattern.side, "oppose", "…and the votes went the other way");
  eq(rf.score, 12, "…so the record lane calls the very same issue a mismatch");
  ok(REC.overall !== SAID.overall,
    `the two modes disagree on the overall number (${SAID.overall}% vs ${REC.overall}%)`);
  ok(REC.overall < SAID.overall,
    "…and on this member the record is the less flattering answer");
  // The divergence is visible per-issue, not just in the total.
  const flipped = REC.issues.filter((r) => {
    const s = rowOf(SAID, r.key);
    return s && Math.abs(s.score - r.score) >= 35;
  });
  ok(flipped.length >= 1, "at least one issue's verdict actually flips between modes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no invented sides, and no silent fallback");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = REC.issues.map((r) => r.key);
  eq(keys.indexOf(DARK), -1, "an issue with no votes at all is not scored in record mode");
  eq(keys.indexOf(NONE), -1, "…nor is an issue whose votes read no clear pattern");
  ok(REC.issues.every((r) => r.source === "record"),
    "EVERY row in a record-mode match came from the record — nothing fell through to words");
  ok(REC.issues.every((r) => r.pattern && r.pattern.side),
    "…and every one of them carries the pattern that produced it");
  // The dropped issues are reported, not disappeared.
  const unc = (REC.uncovered || []).map((u) => u.key);
  ok(unc.indexOf(DARK) >= 0, "the no-vote issue is reported as uncovered");
  ok(unc.indexOf(NONE) >= 0, "…as is the no-pattern issue");
  eq(unc.length + REC.issues.length, PICKS.length,
    "every issue the visitor picked is either matched or named as uncovered — none vanish");
  // The stated lane now applies the SAME rule to its own silence. DARK is an issue
  // with no documented position AND no votes; it used to be scored anyway, from the
  // candidate's party. Both lanes now decline it and both report it.
  ok(!rowOf(SAID, DARK),
    "the stated lane also drops an issue it has no documented position on");
  ok((SAID.uncovered || []).some((u) => u.key === DARK),
    "…and names it as uncovered rather than dropping it silently");
  // A documented position with no votes behind it is the sharpest version of the
  // same rule: record mode must refuse it even though a stance is right there.
  const S2 = pick(warm(boot()), [SAID_ONLY]);
  const r2 = bdOf(S2, "record");
  const s2 = bdOf(S2, "stated");
  ok(s2 && s2.issues.length === 1, "stated mode scores a documented position with no votes");
  ok(!r2 || !r2.issues.length,
    "record mode returns NO match for it rather than borrowing the stated stance");
  if (r2) eq((r2.uncovered || []).length, 1, "…and names it as uncovered instead");

  // ── THE BASELINE, AND WHAT IT MAY NOT DO ──────────────────────────────────
  // The stated lane fills a silent issue from the record's own direction. It is
  // the fallback that has to be checked hardest, because it is the one place a
  // reading of the votes gets printed on a surface a visitor came to for words.
  const bStrong = rowOf(SAID, STRONG);
  ok(bStrong, "the stated lane now answers a silent issue the record reads clearly");
  eq(bStrong.baseline, true, "…and flags it as a baseline rather than a quote");
  eq(bStrong.source, "record", "…names the record as its source…");
  eq(bStrong.direct, false, "…is not flagged as a documented position…");
  eq(bStrong.stance, null, "…carries no stance string…");
  eq(bStrong.text, null, "…and no stated prose, so no quoting renderer can fire");
  ok(rowOf(SAID, THIN) && rowOf(SAID, SPLIT),
    "…and the thin and split readings stand in on their issues too");
  // The two things it must never do.
  const sFlip = rowOf(SAID, FLIP);
  eq(sFlip.baseline, false,
    "a documented position is NEVER replaced by the record — the baseline only fills holes");
  eq(sFlip.source, "stated", "…and that row still reads as stated");
  ok(!rowOf(SAID, NONE), "an unreadable record produces no baseline…");
  ok(!rowOf(SAID, DARK), "…and neither does an empty one");
  // A baseline can never outweigh the same pattern read in record mode: same
  // ladder, same confidence tier, same number.
  eq(bStrong.score, rowOf(REC, STRONG).score,
    "a baseline scores on the same 90/55/12 rung the record lane gives it");
  eq(bStrong.pattern.conf, rowOf(REC, STRONG).pattern.conf,
    "…and carries the same confidence, so it cannot weigh more as a fallback");
  // And it is marked on the face, not just in the data.
  const bChip = A._alignSignalChipHtml(bStrong);
  has(bChip, "Record pattern:", "the baseline chip names the record as its source");
  has(bChip, "From the record", "…carries the baseline tag…");
  lacks(bChip, "Says:", "…and never says they said it");
  has(bChip, "never counted", "…and its own title states the Direction Match wall");
  lacks(A._alignSignalChipHtml(sFlip), "From the record",
    "a documented row carries no baseline tag");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · coverage is stated out loud");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cov = A._alignRecordCoverage(PID);
  eq(cov.total, PICKS.length, "coverage counts every issue the visitor picked");
  eq(cov.covered, REC.issues.length, "…and counts the ones the record can answer");
  eq(cov.missing.length, PICKS.length - REC.issues.length, "…and names the rest");
  ok(cov.missing.every((m) => m.label && m.key), "each named gap carries a human label");
  ok(cov.thin >= 1, "the thin-pattern count is surfaced");
  eq(REC.coverage.total, cov.total, "the breakdown carries the same coverage object");
  // The stated lane used to return `coverage: null` — the one lane with a
  // fallback in it had nothing to disclose the fallback from. It now carries a
  // coverage object of its own, and that object must split the quoted issues
  // from the ones the record stood in for, or the disclosure is impossible.
  ok(SAID.coverage && typeof SAID.coverage === "object",
    "the stated lane carries a coverage object too");
  eq(SAID.coverage.total, PICKS.length, "…counted against every issue the visitor picked");
  eq(SAID.coverage.said + SAID.coverage.baseline, SAID.coverage.covered,
    "…and every covered issue is either stated or stood in for by the record — never both, never neither");
  ok(SAID.sources && SAID.sources.said + SAID.sources.baseline + SAID.sources.record === SAID.sources.scored,
    "the published source tally accounts for every scored row");
  eq(SAID.sources.record, 0, "…and nothing in the stated lane is a bare record pattern");

  // The note a visitor actually reads.
  A.alignSetMatchMode("record");
  const note = A._alignCoverageNoteHtml(PID, REC);
  has(note, "of your 6 issues</b> have a formal-record pattern",
    "the note states the coverage fraction in the visitor's own terms");
  has(note, "rests on a <b>thin</b> pattern", "…and agrees with itself about one thin pattern");
  has(note, "Not counted", "…names the issues left out");
  has(note, "not</b> scored from stated positions instead",
    "…and says in as many words that they were NOT quietly scored from the words");
  has(note, "thin", "…and flags that thin patterns count less");
  eq(A._alignCoverageNoteHtml(PID, REC).indexOf("%") >= 0, false,
    "the coverage note is a count, not a score");
  A.alignSetMatchMode("stated");
  const snote = A._alignCoverageNoteHtml(PID, SAID);
  has(snote, "have a position to match against",
    "the stated lane states its own coverage fraction, in its own vocabulary");
  has(snote, "documented,", "…and splits it into the documented half…");
  has(snote, "from the formal record", "…and the record-derived half");
  has(snote, "not</b> counted in Direction Match",
    "…and the baseline disclosure names the wall it sits behind");
  has(snote, "Not counted", "…names the issues it left out");
  has(snote, "not</b> estimated from their party",
    "…and says in as many words that the gap was NOT filled from party");
  lacks(snote, "formal-record pattern",
    "…without borrowing the record lane's words for it");
  eq(snote.indexOf("%") >= 0, false, "the stated coverage note is a count, not a score");

  // Sparse: one covered issue against a pile of uncoverable ones.
  const SPARSE = pick(warm(boot()), [STRONG, DARK, NONE, SAID_ONLY]);
  const sc = SPARSE._alignRecordCoverage(PID);
  eq(sc.sparse, true, "one-of-four coverage is flagged sparse");
  SPARSE.alignSetMatchMode("record");
  has(SPARSE._alignCoverageNoteHtml(PID, bdOf(SPARSE, "record")), "Sparse coverage",
    "…and the note leads with the word");

  // Zero coverage: no number, no fallback, and a way out.
  const DRY = pick(warm(boot()), [DARK, NONE]);
  DRY.alignSetMatchMode("record");
  eq(bdOf(DRY, "record"), null, "with nothing readable, record mode returns no score at all");
  eq(bdOf(DRY, "stated"), null,
    "…and the stated lane comes up dry too rather than inventing an answer from party");
  const gap = DRY._alignModeGapBarHtml(PID);
  has(gap, "No formal-record pattern on your issues", "the card says which lane came up dry");
  has(gap, "nothing to match in this mode", "…that it is this mode, not the person");
  has(gap, "alignSetMatchMode('stated')", "…and offers the other question as a tap");
  lacks(gap, "%", "the dry state never shows a number");
  DRY.alignSetMatchMode("stated");
  const sgap = DRY._alignModeGapBarHtml(PID);
  has(sgap, "No documented position on your issues",
    "the stated lane's dry card says which lane came up dry");
  has(sgap, "will not guess one from their party",
    "…and refuses the party guess out loud rather than silently");
  has(sgap, "alignSetMatchMode('record')", "…and offers the other question as a tap");
  lacks(sgap, "%", "the dry stated state never shows a number either");

  // Cold record ≠ empty record: a pack that has not landed yet says "reading".
  COLD.alignSetMatchMode("record");
  const cold = COLD._alignRecordCoverage(PID);
  eq(cold.pending, true, "an unfetched vote pack reads as pending, not as absent");
  has(COLD._alignModeGapBarHtml(PID), "Reading their formal record",
    "…and the card says so rather than claiming no pattern exists");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a pattern is never dressed as a quote");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rf = rowOf(REC, FLIP);
  eq(rf.direct, false, "a record row is not flagged as a documented position…");
  eq(rf.stance, null, "…no stance string…");
  eq(rf.topic, null, "…no stated topic…");
  eq(rf.text, null, "…and no stated prose. The quoting renderers cannot fire.");
  eq(rowOf(SAID, FLIP).source, "stated", "a stated row still says it is stated");
  ok(rowOf(SAID, FLIP).text, "…and still carries the words they actually said");

  const recChip = A._alignSignalChipHtml(rf);
  has(recChip, "Record pattern:", "the record chip names the record as its source");
  has(recChip, "opposes", "…and states the direction the record went");
  lacks(recChip, "Says:", "…and never says they said it");
  has(recChip, "advanced", "…and carries the counts the index published");
  const saidChip = A._alignSignalChipHtml(rowOf(SAID, FLIP));
  has(saidChip, "Says:", "the stated chip names the claim as its source");
  has(saidChip, "Supports", "…and states the side they claim");
  lacks(saidChip, "Record pattern", "…and never borrows the record's voice");
  // An inferred row is neither, and must claim neither.
  const inferred = SAID.issues.filter((r) => r.source === "inferred")[0];
  if (inferred) {
    eq(A._alignSignalChipHtml(inferred), "",
      "an inferred row claims no source at all rather than the wrong one");
  } else { passed++; }

  // The tier words are the shipped ones, not a second vocabulary.
  const thinRow = rowOf(REC, THIN);
  must(thinRow, "the thin issue is missing from the record-mode match");
  has(A._alignSignalChipHtml(thinRow).toLowerCase(), "thin",
    "a thin pattern is called thin on the row face");
  has(A._alignSignalChipHtml(thinRow), "w-thin",
    "…and carries the same weight class the shipped pattern chips use");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · thin counts, but counts less");
// ═════════════════════════════════════════════════════════════════════════════
{
  const conf = A._PDX_ALIGN_PAT_CONF;
  ok(conf.thin < conf.mostly && conf.mostly <= conf.strong,
    `confidence is ordered strong ≥ mostly > thin (${conf.strong}/${conf.mostly}/${conf.thin})`);
  ok(conf.split < conf.mostly, "…and a split pattern counts less than a lean");
  const rt = rowOf(REC, THIN), rs = rowOf(REC, STRONG);
  must(rt && rs, "the thin/strong pair is missing from the record-mode match");
  eq(rt.pattern.conf, conf.thin, "a thin row carries the thin confidence");
  eq(rs.pattern.conf, conf.strong, "…and a strong row the strong one");
  ok(rt.weight < rs.weight,
    `the thin issue carries less weight than the strong one on identical values (${rt.weight} vs ${rs.weight})`);
  // Thin still counts — it is not silently dropped.
  ok(rt.weight > 0, "…but it still counts");
  // And the score itself is not softened: the ladder stays 90/55/12, the weight moves.
  eq(rt.score, 90, "a thin agreement is still a full agreement on that issue");

  // A split pattern is the mixed/neutral case, never a side.
  const sp = rowOf(REC, SPLIT);
  must(sp, "the split issue is missing from the record-mode match");
  eq(sp.pattern.side, "mixed", "a split record is mixed, not a for-or-against side");
  eq(sp.score, 55, "…and lands on the shipped partial rung");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the walls hold");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The position maps: read before and after a full record-mode pass.
  const before = JSON.stringify(A._polPositionMap(PID));
  const W = pick(warm(boot()));
  W.alignSetMatchMode("record");
  W._calcAlignmentBreakdown(PID);
  W._calcAlignmentScore(PID);
  eq(JSON.stringify(W._polPositionMap(PID)), before,
    "a full record-mode pass leaves the position map byte-identical");
  const stances = Object.values(W._polPositionMap(PID));
  ok(stances.every((s) => ["support", "oppose", "mixed"].indexOf(s.stance) >= 0),
    "…and no pattern tier was written into it as a stance");
  ok(stances.every((s) => !/pattern|advanced|against/i.test(String(s.topic || ""))),
    "…and no pattern label leaked into a stated topic");

  // Direction Match: the same inputs, the toggle flipped.
  const dm = (win) => {
    const wa = win.PDXConsistency && win.PDXConsistency.wordAction;
    if (wa && typeof wa.rows === "function") return JSON.stringify(wa.rows(PID));
    return null;
  };
  const S = pick(warm(boot()));
  const Rr = pick(warm(boot()));
  Rr.alignSetMatchMode("record");
  Rr._calcAlignmentBreakdown(PID);
  const a = dm(S), b = dm(Rr);
  if (a && b) eq(b, a, "Direction Match rows are byte-identical in both modes");
  else passed++;
  const vt = (win) => JSON.stringify((win._calcAlignmentBreakdown(PID, { mode: "stated" }) || {}).verdictTally || null);
  eq(vt(Rr), vt(S), "the stated verdict tally is unchanged by the record lane existing");

  // Say-vs-Do asks the stated question by definition, in either mode.
  const cs = (win) => JSON.stringify(win._calcConsistencyScore(PID) || null);
  eq(cs(Rr), cs(S), "the Say-vs-Do score is identical with the toggle flipped");

  // Every record signal traces to the published formal-pattern index — the record
  // match has no second source it could quietly pull a public-lane item from.
  const sm = A._alignRecordSideMap(PID);
  ok(sm.rows >= sm.read && sm.read > 0,
    `the side map read a subset of the index it was built from (${sm.read} of ${sm.rows})`);
  const idxKeys = new Set(idxRows.filter((x) => x.read).map((x) => x.key));
  ok(Object.keys(sm.sides).every((k) => idxKeys.has(k)),
    "…and every side it carries is one the index reads");
  ok(REC.issues.every((r) => idxKeys.has(r.key)),
    "…and every matched issue is one the published index actually reads");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the toggle itself, and no party framing");
// ═════════════════════════════════════════════════════════════════════════════
{
  A.alignSetMatchMode("stated");
  const t = A._alignModeToggleHtml({});
  has(t, "Match on", "the control asks the question in the visitor's words");
  has(t, "Stated positions", "…and offers the stated lane");
  has(t, "Formal-record patterns", "…and the formal-record lane");
  has(t, 'data-align-mode="stated"', "each lane is addressable");
  has(t, 'aria-pressed="true"', "the live lane is announced to a screen reader");
  eq((t.match(/aria-pressed="true"/g) || []).length, 1, "…and exactly one lane is live");
  A.alignSetMatchMode("record");
  const t2 = A._alignModeToggleHtml({});
  ok(t2.indexOf('data-align-mode="record"') >= 0 && /is-on[^>]*data-align-mode="record"|data-align-mode="record"[^>]*aria-pressed="true"/.test(t2),
    "switching lanes moves the lit segment");
  has(A._alignModeTagHtml(), "Matched on formal-record patterns",
    "a result says which question produced it");
  A.alignSetMatchMode("stated");
  has(A._alignModeTagHtml(), "Matched on stated positions", "…in either lane");

  const surfaces = [A._alignModeToggleHtml({}), A._alignModeTagHtml(),
    A._alignSignalChipHtml(rowOf(REC, FLIP)), A._alignSignalChipHtml(rowOf(REC, THIN))];
  A.alignSetMatchMode("record");
  surfaces.push(A._alignCoverageNoteHtml(PID, REC), A._alignModeGapBarHtml(PID));
  A.alignSetMatchMode("stated");
  const all = surfaces.join(" ");
  for (const w of ["Democrat", "Republican", "GOP", "partisan", "party-line"]) {
    lacks(all, w, `no party framing anywhere in the mode UI (${w})`);
  }
  lacks(all, "Reversal", "no public-lane vocabulary in the mode UI");
  // The formal-record lane is described as action, the stated lane as claim.
  has(A.alignMatchModeMeta("record").sub, "votes and formal actions",
    "the record lane is described as what the record did");
  has(A.alignMatchModeMeta("stated").sub, "claimed",
    "…and the stated lane as what they claimed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the surfaces are wired");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = R("index.html");
  has(html, 'id="align-mode-main"', "the tool has a mount for the toggle");
  has(html, 'id="align-mode-rel"', "…and so does the My Key Alignments mirror");
  has(html, 'id="align-compact-mode"', "…and the collapsed card echoes the live mode");
  const bb = R("ballot-breakdown.js");
  ok((bb.match(/_alignSignalChipHtml\(it\)/g) || []).length >= 2,
    "both breakdown surfaces render the per-issue signal source");
  has(bb, "_alignCoverageNoteHtml(pid, bd)", "…and both carry the coverage note");
  has(bb, "_krAlignRecordGapView", "…and a dry record opens an honest view, not the picker");
  const css = R("alignment-tool.css");
  for (const cls of [".align-mode-row", ".align-mode-seg", ".align-mode-tag", ".align-sig-rec",
                     ".align-sig-said", ".align-cov-note", ".align-mode-gap", ".align-mode-swap"]) {
    has(css, cls, `the mode UI is styled (${cls})`);
  }
  has(css, ".align-sig-rec.w-thin", "…and a thin pattern is visually weaker than a strong one");
  ok(/@media \(max-width: 768px\)[\s\S]*\.align-mode-seg \{[\s\S]*?min-height: 40px/.test(css),
    "…and the lanes are thumb-sized on a phone");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ alignment mode: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ alignment mode: stated vs formal-record — ${passed} assertions passed\n`);
