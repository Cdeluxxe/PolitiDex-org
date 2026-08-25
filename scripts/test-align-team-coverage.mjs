#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-align-team-coverage.mjs — honest coverage, a readable "why", and a Team
// Builder that stops printing holes as mild agreement
// ─────────────────────────────────────────────────────────────────────────────
// Profiles now carry a dense formal record, and the stated lane already knew how
// to fall back to it — an issue with no documented position borrows the direction
// of the record and is scored as a BASELINE. Three things were wrong with how
// that reached a reader, and this file is the fence around all three.
//
//   1. COVERAGE, HONESTLY SPLIT. The stated lane returned `coverage: null`: the
//      one lane with a fallback in it had nothing to disclose the fallback from.
//      It now returns a real object that splits `said` from `baseline`, counts
//      how many baselines rest on thin or split records, and distinguishes a hole
//      we know is empty from one we have not finished reading (`pending`).
//   2. WHY THIS MATCH. A percentage with no account of itself. There is now a
//      ranked block naming the issues that moved the number, each one tagged with
//      what it was built on — and the tag for a baseline says, in as many words,
//      that it is a reading of votes and not a quoted promise.
//   3. TEAM BUILDER. The team aggregate averaged each issue over only the members
//      who had it covered, so one 82% and five silences rendered exactly like six
//      82s. The arithmetic is unchanged — inventing a neutral score for an absent
//      member is the artificial strength this project refuses — but the
//      denominator, the spread, and the wholly-uncovered issues are now published
//      and printed.
//
// And the walls that must not move: no party fill-in, no percentages in a
// coverage note, a baseline never dressed as a quote, and Direction Match
// byte-identical.
//
//   node scripts/test-align-team-coverage.mjs
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
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ align team coverage: ${msg}`);
  process.exit(1);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// A three-person team, deliberately uneven, because an even team cannot show the
// bug. Every visitor pick is a SUPPORT pick, so "supports" is a match and
// "opposes" is a mismatch with no intensity arithmetic to do in the head.
//
//   DEEP   documented position on FLIP + deep records on STRONG/THIN/SPLIT
//          → its stated match is mostly baselines
//   MID    a deep record on STRONG only          → one baseline, several holes
//   QUIET  no votes at all                       → stated positions or nothing
const probe = boot();
must(typeof probe._calcTeamAlignment === "function", "_calcTeamAlignment is not exposed");
must(typeof probe._alignWhyMatchHtml === "function", "_alignWhyMatchHtml is not exposed");
must(typeof probe._alignWarmBaseline === "function", "_alignWarmBaseline is not exposed");

const DEEP = "schumer";
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
const POLMAP = probe._polPositionMap(DEEP) || {};
const FLIP = ISSUE_KEYS.filter((k) => sideable(k) && POLMAP[k] && POLMAP[k].stance === "support")[0];
const SILENT = ISSUE_KEYS.filter((k) => sideable(k) && !POLMAP[k]);
const [STRONG, THIN, SPLIT, DARK] = SILENT;
must(FLIP && STRONG && THIN && SPLIT && DARK, "the fixture profile no longer offers every case");

// Two more members for the team. QUIET has to be someone with a documented
// position on at least one of the picks and nothing seeded behind it — that is
// the "words only, no record" corner, and picking a member at random would just
// as likely produce a member with no coverage at all, who is a different test.
const OTHERS = Object.keys(probe.CMP_DATA).filter((p) => p !== DEEP &&
  probe.CMP_DATA[p] && probe.CMP_DATA[p].name);

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 900 + n, measureId: 950 + n, number: "S. " + (200 + n),
  date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (900 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const DEEP_SEED = [];
for (let i = 0; i < 10; i++) DEEP_SEED.push(vote(i, FLIP, "nay"));        // words say support
for (let i = 0; i < 12; i++) DEEP_SEED.push(vote(20 + i, STRONG, "yea"));
DEEP_SEED.push(vote(40, THIN, "yea"));
for (let i = 0; i < 8; i++) DEEP_SEED.push(vote(45 + i, SPLIT, i % 2 ? "nay" : "yea"));
const MID_SEED = [];
for (let i = 0; i < 12; i++) MID_SEED.push(vote(70 + i, STRONG, "nay"));  // the opposite run

const PICKS = [FLIP, STRONG, THIN, SPLIT, DARK];
const QUIET = OTHERS.filter((p) => {
  const m = probe._polPositionMap(p) || {};
  return PICKS.some((k) => m[k]);
})[0];
const MID = OTHERS.filter((p) => p !== QUIET)[0];
must(MID && QUIET, "the roster no longer offers two more members for the team");

function team() {
  const win = boot();
  win.PDXVotingRecord.noteMember(DEEP, JSON.parse(JSON.stringify(DEEP_SEED)));
  win.PDXVotingRecord.noteMember(MID, JSON.parse(JSON.stringify(MID_SEED)));
  win.PDXVotingRecord.noteMember(QUIET, []);
  PICKS.forEach((k) => win.alignToggleIssue(k));
  return win;
}
const A = team();
const BD = A._calcAlignmentBreakdown(DEEP);
must(BD && BD.issues && BD.issues.length, "the fixture produced no stated-lane breakdown at all");
must(BD.sources && BD.sources.baseline > 0,
  `the fixture produced no record-derived baselines (${JSON.stringify(BD.sources)}) — nothing to test`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the stated lane owns up to what it borrowed");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cov = A._alignStatedCoverage(DEEP);
  ok(cov && typeof cov === "object", "the stated lane has a coverage object of its own");
  eq(cov.total, PICKS.length, "…counted against every issue the visitor picked");
  eq(cov.said + cov.baseline, cov.covered,
    "…every covered issue is either stated or stood in for — never both, never neither");
  eq(cov.covered + cov.missing.length, cov.total,
    "…and covered plus missing is the whole pick list, with nothing unaccounted for");
  ok(cov.baseline > 0, "…a member with a deep record and few quotes reports real baseline coverage");
  eq(cov.baselineThin + cov.baselineSplit + cov.baselineDeep, cov.baseline,
    "…and every baseline is graded thin, split or deep — the borrow states its own strength");
  ok(cov.missing.every((m) => m.key && m.label), "each named gap carries a human label");

  // The tally the surfaces read, rather than each recomputing its own slice.
  const s = BD.sources;
  eq(s.said + s.baseline + s.record, s.scored, "the published tally accounts for every scored row");
  eq(s.record, 0, "…nothing in the stated lane is a bare record pattern");
  eq(s.scored + s.uncovered, s.picked, "…and scored plus dropped is every issue picked");
  eq(s.baseline, cov.baseline, "…and the tally and the coverage object agree about the baselines");
  ok(BD.issues.filter((i) => i.baseline).every((i) => i.source === "record"),
    "every baseline row names the record as its source");
  ok(BD.issues.filter((i) => i.baseline).every((i) => !i.direct),
    "…and no baseline row claims to be a direct position");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a hole we haven't read is not a hole we know is empty");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Cold: no vote pack, no warm attempt settled. The tool must say it is still
  // reading rather than reporting an absence it has not established.
  const cold = boot();
  PICKS.forEach((k) => cold.alignToggleIssue(k));
  const ccov = cold._alignStatedCoverage(DEEP);
  eq(ccov.warm, false, "a cold member's coverage knows the record has not landed");
  ok(ccov.pending, "…and reports the gaps as pending, not as established absences");
  const cnote = cold._alignCoverageNoteHtml(DEEP, cold._calcAlignmentBreakdown(DEEP));
  has(cnote, "formal record", "…and the note a visitor reads says the record is still being read");
  lacks(cnote, "%", "…and still never states coverage as a percentage");

  // Warm: the answer is settled, so the pending language must be gone.
  eq(A._alignStatedCoverage(DEEP).pending, false,
    "once the record has landed the coverage stops calling itself pending");
  const note = A._alignCoverageNoteHtml(DEEP, BD);
  has(note, "formal record</b> stands in", "the warm note discloses what stood in for the words");
  has(note, "not</b> counted in Direction Match", "…and names the wall in the same breath");
  has(note, "reading of the votes, not a quote", "…and refuses to call it a quote");
  lacks(note, "%", "…states coverage in counts, never percentages");
  lacks(note.toLowerCase(), "democrat", "…and never reaches for party");
  lacks(note.toLowerCase(), "republican", "…in either direction");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · why this match — ranked, signed, and sourced");
// ═════════════════════════════════════════════════════════════════════════════
{
  const why = A._alignWhyMatchHtml(DEEP);
  ok(why, "a member with a real breakdown gets a why block");
  has(why, "Why this match", "…titled as the question it answers");
  has(why, "Pulling it up", "…and separates what helped…");
  has(why, "issues are in this number", "…names how many of the visitor's issues are in the number");
  has(why, "stood in from the formal record", "…and how many of those were stood in for");
  has(why, "From the record", "…tags the borrowed rows on the row itself");
  has(why, "not a quoted promise", "…and says in as many words that a baseline is not a promise");
  has(why, "not</b> counted in Direction Match",
    "…and repeats the wall: a baseline never reaches Direction Match");
  lacks(why, "%.", "the mix sentence deals in counts, not derived percentages");
  lacks(why.toLowerCase(), "democrat", "no party framing in the explanation");
  lacks(why.toLowerCase(), "republican", "…in either direction");

  // Ranked by the weight the engine gave the row — not by score, or the block
  // would name whatever scored highest rather than whatever moved the number.
  const up = A._calcAlignmentBreakdown(DEEP).issues
    .filter((i) => i.score >= 55).sort((a, b) => (b.weight || 0) - (a.weight || 0));
  if (up.length > 1) {
    const first = why.indexOf(up[0].label), second = why.indexOf(up[1].label);
    ok(first >= 0 && (second < 0 || first < second),
      "the heaviest issue is named before a lighter one");
  } else ok(true, "only one issue pulls up on this fixture — ordering is vacuous");

  // A visitor with no issues picked has nothing to explain, and the block must
  // not invent a reason for a number it cannot account for.
  eq(boot()._alignWhyMatchHtml(DEEP), "", "no picks, no explanation");

  // The per-row mark is the same vocabulary everywhere.
  const base = A._calcAlignmentBreakdown(DEEP).issues.filter((i) => i.baseline)[0];
  const said = A._calcAlignmentBreakdown(DEEP).issues.filter((i) => !i.baseline && i.direct)[0];
  if (base) {
    eq(A._alignRowSource(base), "baseline", "a borrowed row classifies as a baseline");
    has(A._alignSrcMarkHtml(base), "From the record", "…and its mark says so");
    lacks(A._alignSrcMarkHtml(base), "Says:", "…and never claims they said it");
  } else ok(false, "the fixture lost its baseline rows");
  if (said) {
    eq(A._alignRowSource(said), "said", "a documented row classifies as stated");
    lacks(A._alignSrcMarkHtml(said), "From the record", "…and carries no baseline tag");
  } else ok(true, "no directly-documented row on this fixture");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the team aggregate publishes its denominator");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ta = A._calcTeamAlignment([DEEP, MID, QUIET]);
  ok(ta, "a three-person team produces an aggregate");
  eq(ta.members.length, 3, "…covering every filled slot");
  ok(ta.issues.every((i) => i.members === 3), "every issue row knows how many picks it was averaged over");
  ok(ta.issues.every((i) => i.covered >= 1 && i.covered <= i.members),
    "…and how many of them actually had anything on file");
  ok(ta.issues.every((i) => i.said + i.baseline + i.record === i.covered),
    "…and every covered member on the row is accounted for by source");
  ok(ta.issues.some((i) => i.covered < i.members),
    "the uneven fixture produces at least one partly-covered issue — the case the old average hid");
  ok(ta.issues.every((i) => i.high >= i.score && i.low <= i.score),
    "the published range brackets the average it is qualifying");
  ok(ta.issues.every((i) => i.spread === (i.covered > 1 ? i.high - i.low : 0)),
    "…and the spread is the range, or zero when there is only one member to spread");

  // The arithmetic itself is untouched: still the mean over covered members only,
  // because filling an absent member in at 50 would be exactly the invented
  // strength this tool refuses.
  const row = ta.issues.filter((i) => i.key === STRONG)[0];
  if (row) {
    const scores = [DEEP, MID, QUIET]
      .map((p) => A._calcAlignmentBreakdown(p))
      .filter(Boolean)
      .map((b) => (b.issues.filter((i) => i.key === STRONG)[0] || {}).score)
      .filter((v) => typeof v === "number");
    eq(row.covered, scores.length, "the covered count is the number of members who actually scored");
    eq(row.score, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      "…and the score is still their mean, with no neutral filler for the silent ones");
  } else ok(false, "the fixture lost its deep shared issue");

  // Wholly-uncovered issues leave the scored list entirely and land in their own
  // bucket, carrying no score at all.
  ok(Array.isArray(ta.uncovered), "the aggregate publishes the issues nobody could answer");
  ok(ta.uncovered.every((i) => i.score === null && i.covered === 0),
    "…and not one of them carries a percentage");
  ok(ta.issues.every((i) => i.covered > 0), "…and none of them leaked into the scored list");
  const dark = ta.uncovered.filter((i) => i.key === DARK)[0];
  ok(dark, "the issue with no stated position and no record anywhere is reported as uncovered");

  // Per-member provenance, so the renderer never has to recount.
  ok(ta.members.every((m) => m.said + m.baseline + m.record === m.covered),
    "each member's own row splits stated from borrowed");
  eq(ta.sources.said + ta.sources.baseline + ta.sources.record, ta.sources.scored,
    "…and the team tally is the sum of them");
  ok(ta.sources.baseline > 0, "…and the team's number really does lean on the record here");
  eq(ta.mode, "stated", "the aggregate reports which lane it ran in");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · 'not enough on file' never reads as mild agreement");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ta = A._calcTeamAlignment([DEEP, MID, QUIET]);
  const html = A._renderTeamAlignOverview(ta);
  ok(html, "the overview renders");
  has(html, "Not enough on file", "an issue nobody can answer is named as an absence");
  has(html, "no read", "…and labelled with words, not a number");
  has(html, "myteam-ao-drow is-empty", "…in its own visually distinct row");
  // The uncovered chip must contain no percentage anywhere inside it.
  const chunk = html.slice(html.indexOf("myteam-ao-drow is-empty"));
  const chip = chunk.slice(0, chunk.indexOf("</div>"));
  lacks(chip, "%", "…and no percentage appears anywhere in that row");
  has(chip, "not counted as neutral", "…and it says outright that a hole is not a neutral score");

  // Partial coverage is marked on the chip itself.
  has(html, "myteam-ao-issue-cov", "a partly-covered issue prints its denominator");
  has(html, "is-partial", "…and is drawn differently from a fully-covered one");
  const part = ta.issues.filter((i) => i.covered < i.members)[0];
  if (part) has(html, part.covered + "/" + part.members, "…as an explicit N-of-M");
  else ok(false, "the fixture lost its partly-covered issue");

  // The source mix, in counts.
  has(html, "issue–candidate read", "the overview says what its number is made of");
  has(html, "stood in from the formal record", "…including how much the record stood in for");
  has(html, "not a quoted stance", "…and carries the same wall sentence as everywhere else");
  has(html, "never counted", "…including that it never reaches Direction Match");
  lacks(html.toLowerCase(), "democrat", "no party framing in the team overview");
  lacks(html.toLowerCase(), "republican", "…in either direction");

  // A team that genuinely divides on an issue is told so, because the average is
  // exactly where that fact goes to die. DEEP and MID voted opposite runs on the
  // same issue, so this fixture must produce one.
  const split = ta.splits.filter((i) => i.key === STRONG)[0];
  ok(split, "opposite records on the same issue register as a split");
  if (split) {
    ok(split.spread >= 35, "…a real one, not a rounding difference");
    has(html, "Where your team splits", "…and the overview names it");
    has(html, split.low + "–" + split.high + "%", "…with the range the average was hiding");
  }
  ok(ta.splits.every((i) => i.readable),
    "a split is only ever claimed where the signal is readable — never manufactured from a thin record");
  ok(ta.overlaps.every((i) => i.covered === i.members),
    "…and an overlap is only claimed when every pick is actually on file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the walls hold");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Direction Match is computed by a different module and must be untouched by
  // everything above — same input, same bytes, with the alignment tool's picks
  // set and its baselines in play.
  const dm = (win) => {
    const wa = win.PDXConsistency && win.PDXConsistency.wordAction;
    return wa && typeof wa.rows === "function" ? JSON.stringify(wa.rows(DEEP)) : null;
  };
  const clean = boot();
  clean.PDXVotingRecord.noteMember(DEEP, JSON.parse(JSON.stringify(DEEP_SEED)));
  const before = dm(clean);
  // A: picks toggled, three breakdowns computed, baselines borrowed, the team
  // aggregated and rendered. If any of that reached Direction Match, this moves.
  A._calcTeamAlignment([DEEP, MID, QUIET]);
  A._alignWhyMatchHtml(DEEP);
  if (before) eq(dm(A), before, "Direction Match rows are byte-identical after a full baseline pass");
  else ok(true, "no Direction Match rows on this fixture — nothing to move");
  // Say-vs-Do asks the stated question by definition — an identical fixture that
  // never ran a baseline pass must produce an identical score.
  const untouched = team();
  const say = (win) => JSON.stringify(win._calcConsistencyScore(DEEP) || null);
  eq(say(A), say(untouched), "…and so is the Say-vs-Do score");
  const bl = A.PDXConsistency.baseline;
  ok(bl && bl.NOT_DM, "the baseline API still publishes its not-in-Direction-Match wall");
  has(bl.NOT_DM, "Direction Match", "…and that wall still names Direction Match");

  // A baseline is never dressed as a quote, on any surface.
  const base = BD.issues.filter((i) => i.baseline)[0];
  ok(base && !base.stance, "a baseline row carries no stance pill");
  ok(base && !base.prose, "…no stated prose");
  ok(base && !base.topic, "…and no stated topic");

  // Thin data buys no confidence: a baseline resting on a thin record must be
  // marked thin and must weigh less than one resting on a deep run.
  const thinRow = BD.issues.filter((i) => i.key === THIN)[0];
  const deepRow = BD.issues.filter((i) => i.key === STRONG)[0];
  if (thinRow && deepRow) {
    ok(thinRow.thin, "a baseline read off a single vote is flagged thin");
    ok(!deepRow.thin, "…and one read off a deep run is not");
    ok(thinRow.conf < deepRow.conf, "…and the thin one carries strictly less confidence");
  } else ok(false, "the fixture lost its thin/deep contrast");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the surfaces are actually wired to it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const at = R("alignment-tool.js");
  // A team slot never renders a card bar, so it never inherited the card bar's
  // warm — which made the fallback structurally unreachable from the one surface
  // where the visitor has committed to six specific people.
  ok(/function _slotMatchBand\(pid\)[\s\S]{0,900}_alignWarmBaseline\(pid\)/.test(at),
    "the Team Builder slot band warms the record it wants to fall back on");
  ok(/function _calcTeamAlignment\(pids\)[\s\S]{0,2000}_alignWarmBaseline\(pid\)/.test(at),
    "…and so does the team aggregate");

  const bb = R("ballot-breakdown.js");
  has(bb, "_alignWhyMatchHtml(pid)", "Your Match carries the why-this-match block");
  has(bb, "kraq-sig-base", "…and counts the record-derived rows in its header pills");
  has(bb, "baseClause", "…and its confidence note names what was borrowed");

  const css = R("alignment-tool.css");
  for (const cls of [".align-src-mark", ".align-src-mark.is-baseline", ".align-why",
                     ".align-why-wall", ".align-cov-pend", ".align-driver-base"]) {
    has(css, cls, `the provenance UI is styled (${cls})`);
  }
  has(css, ".align-src-mark.is-baseline { border: 1px dashed",
    "…and a borrowed row is drawn dashed, never as solid as a quoted one");
  const app = R("app.css");
  for (const cls of [".myteam-ao-issue-cov", ".myteam-ao-issue-none", ".myteam-ao-mix",
                     ".myteam-ao-drow.is-empty", ".myteam-ao-issue-range", ".kraq-sig-base"]) {
    has(app, cls, `the team overview additions are styled (${cls})`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ align team coverage — ${failures.length} failure(s):`);
  failures.forEach((f) => console.error("   • " + f));
  process.exit(1);
}
console.log(`\n✓ align team coverage: all ${passed} assertions passed — coverage split, the match explained, and a hole that looks like a hole`);
