#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-match-axis-formal.mjs — your issues × their formal pattern, with no quote
// ─────────────────────────────────────────────────────────────────────────────
// Your Record Match asks one question: do this person's VOTES AND FORMAL
// ACTIONS line up with the positions I set? Whether we ever sourced a quote from
// them on the same issue is a fact about our stance corpus, not about their
// record, and it must not decide whether they can be ranked, whether an axis is
// live, or what a cell is allowed to print.
//
// This file guards that, and — just as hard — the line it must not cross. A
// pattern is not a stance. The failures worth catching are:
//
//   1. AXIS ELIGIBILITY. A reader-selected issue the candidate has a readable
//      formal pattern on is live for ranking and for the cell, with no stance
//      anywhere in the fixture. Absence of a quote excludes nothing.
//   2. THE CANDIDATE HALF IS THE RECORD'S. The breakdown row for such an issue
//      carries the pattern and carries NO quoted field — no stance, no topic, no
//      text — so no surface can render it as "Says: supports".
//   3. THE ORDER IS THE PATTERN. The field is ordered by the record's own
//      direction against the reader's, and a candidate with a real file is not
//      sorted as a void.
//   4. AN EMPTY FILE AND AN UNREADABLE ONE ARE DIFFERENT ADMISSIONS. Votes on
//      file that the engine would not characterise must not print as "no formal
//      record" — in the cell, in the number slot, or in the band header.
//   5. HONEST EMPTY SURVIVES. Neither stance nor formal record still says so,
//      in the same words it always did.
//   6. ZERO POSITIONS IS STILL OVERVIEW. Nothing here lowers that line.
//   7. NO NEW ARITHMETIC. The record half is the shipped 90/55/12 ladder scaled
//      by the shipped confidence table; the sheet invents no figure.
//   8. THE MUTATIONS. Re-requiring a stated position for axis eligibility — in
//      either of the two places it could be reimposed — must fail this file.
//
// THE STATED LANE'S BASELINE. Since the record-derived baseline shipped, the
// stated ruler answers an issue it holds no quote for with the record's own
// direction — the same reading, the same confidence, marked on every face as
// record-derived and never as something they said. This file pins that too: the
// fallback must equal the record lane's answer exactly, must never displace a
// real quote, and must never appear without its disclosure.
//
//   node scripts/test-match-axis-formal.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, real ballot
// roster, votes seeded the way a completed /api/voting-record fetch leaves the
// cache. No database, no network, no browser.

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
  "issue-colors.js",
  "my-stances.js",
  "voter-hub-location.js",
  "compare-hub.js",
  "ballot-breakdown.js",
  "race-sheet.js",
];
const SRC = FILES.map((f) => [f, R(f)]);

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
// A stale probe is not a pass. When the fixture stops being the fixture the
// contract is written about, this file can say nothing about the contract, and
// saying nothing quietly is the exact failure mode it exists to remove.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ match axis harness is STALE — a contract cannot be verified:\n  ${msg}`);
  process.exit(2);
};

// ── The sandbox ──────────────────────────────────────────────────────────────
// The sheet paints, so it needs a document it can append to and read back. The
// smallest registry that lets render() actually run.
function miniDom(win) {
  const byId = {};
  const el = (id) => ({
    id: id || "", className: "", innerHTML: "", textContent: "",
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
    removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  return byId;
}

// `mutate` is a per-file source rewrite, used only by section 8. Everything else
// boots the shipped bytes.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {}, sess = opts.session || {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    const body = (opts.mutate && opts.mutate[f]) ? opts.mutate[f](src) : src;
    try { vm.runInContext(body, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  return win;
}

// ── The fixture ──────────────────────────────────────────────────────────────
const SEAT = "senate";
const probe = boot();
must(typeof probe.pdxOpenRaceSheet === "function", "the race sheet is not exposed");
must(typeof probe._calcAlignmentScore === "function", "the match brain is not loaded");
must(typeof probe._calcAlignmentBreakdown === "function", "the breakdown is not loaded");
must(typeof probe._polPositionMap === "function", "the stance position map is not loaded");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "the formal-pattern index is not loaded");

const FIELD = probe.PDXRaceSheet._field(SEAT);
must(FIELD.length >= 2, `the fixture seat "${SEAT}" no longer has a field of 2+`);
const [A_PID, B_PID] = FIELD.map((c) => c.pid);

// The axis: issues NEITHER candidate has a documented position on, and which the
// site's own taxonomy gives a directional pole to. That is the whole point — the
// stated lane can say nothing about anyone here, so every number and every cell
// below can only have come from the formal record.
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
const mapA0 = probe._polPositionMap(A_PID, probe.CMP_DATA[A_PID]) || {};
const mapB0 = probe._polPositionMap(B_PID, probe.CMP_DATA[B_PID]) || {};
const SILENT = Object.keys(probe.ISSUE_MAP || {})
  .filter((k) => sideable(k) && !mapA0[k] && !mapB0[k]);
must(SILENT.length >= 3,
  `the fixture needs 3+ issues neither candidate has stated, has ${SILENT.length}`);
const [K, K2, DARK] = SILENT;

const vote = (n, key, position, o) => ({
  kind: "vote", rollcallId: 8000 + n, measureId: 8500 + n, number: "S. " + (200 + n),
  date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  issues: [{ issueKey: key, weight: 100,
             isPrimary: !(o && o.incidental), supportMeaning: "yea_supports" }],
  source: { url: "https://www.congress.gov/roll-call-vote/" + (8000 + n), label: "Congress.gov" },
});
const runOf = (n, key, position, from) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(vote(from + i, key, position));
  return out;
};

// A advances K and K2; B cuts against both. Nobody has said a word about either.
const SEED_A = runOf(12, K, "yea", 0).concat(runOf(12, K2, "yea", 20));
const SEED_B = runOf(12, K, "nay", 40).concat(runOf(12, K2, "nay", 60));

function stage(opts) {
  opts = opts || {};
  const win = boot(opts);
  win.PDXVotingRecord.noteMember(A_PID, JSON.parse(JSON.stringify(opts.a || SEED_A)));
  win.PDXVotingRecord.noteMember(B_PID, JSON.parse(JSON.stringify(opts.b || SEED_B)));
  (opts.keys || [K, K2]).forEach((k) => win.alignToggleIssue(k));
  return win;
}
const sheetHtml = (win, seat) => {
  win.pdxOpenRaceSheet(seat || SEAT);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};

const LIVE = stage();
const HTML = sheetHtml(LIVE);
must(HTML.length > 800, "the sheet painted nothing at all");
must(LIVE.PDXRaceSheet.mode() === "record", "the sheet no longer defaults to the record ruler");
// The premise, asserted rather than assumed: there is genuinely no quote here.
must(!(LIVE._polPositionMap(A_PID, LIVE.CMP_DATA[A_PID]) || {})[K],
  "the fixture candidate acquired a documented position on the axis issue");
must(!(LIVE._polPositionMap(B_PID, LIVE.CMP_DATA[B_PID]) || {})[K],
  "the fixture challenger acquired a documented position on the axis issue");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a formal file makes the axis live, with no stance anywhere");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE STATED LANE HAS A BASELINE NOW. It holds no quote from this candidate on
  // these issues — the `must` above asserts that — so what it answers with is the
  // direction of the formal record itself, and it answers with EXACTLY the record
  // lane's own reading rather than a softened or a second one.
  const sBase = LIVE._calcAlignmentScore(A_PID, { mode: "stated" });
  const rBase = LIVE._calcAlignmentScore(A_PID, { mode: "record" });
  eq(sBase, rBase,
    "with no quote anywhere, the stated lane falls back to the record's own reading");
  const sbd = LIVE._calcAlignmentBreakdown(A_PID, { mode: "stated" });
  ok(sbd && sbd.issues.every((r) => r.baseline === true),
    "…and every row it produced is flagged as a baseline, not as a quote");
  ok(sbd && sbd.issues.every((r) => r.stance === null && r.text === null && !r.direct),
    "…carrying no stance, no prose and no documented-position flag");
  const rec = LIVE._calcAlignmentScore(A_PID, { mode: "record" });
  ok(typeof rec === "number" && isFinite(rec),
    `the record lane scores them anyway — got ${JSON.stringify(rec)}`);
  const bd = LIVE._calcAlignmentBreakdown(A_PID, { mode: "record" });
  must(bd && Array.isArray(bd.issues), "the record breakdown returned nothing to read");
  const row = bd.issues.filter((r) => r.key === K)[0];
  ok(!!row, "the reader's issue is a live axis on the record ruler");
  must(row, "no axis row for the fixture issue — the rest of section 1 is untestable");
  eq(bd.uncovered.filter((u) => u.key === K).length, 0,
    "…and it is not reported as uncovered");
  eq(row.source, "record", "the candidate half of that axis came from the formal lane");
  ok(row.pattern && row.pattern.label,
    "…carrying the pattern engine's own label, not one coined for the match");
  ok(!!row.verdict, "…and a verdict, so it contributes to the ranking rather than sitting inert");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a pattern is never printed as a stated position");
// ═════════════════════════════════════════════════════════════════════════════
{
  const bd = LIVE._calcAlignmentBreakdown(A_PID, { mode: "record" });
  const row = bd.issues.filter((r) => r.key === K)[0];
  must(row, "no axis row to inspect");
  eq(row.stance, null, "a record row carries no stance");
  eq(row.topic, null, "…no quoted topic");
  eq(row.text, null, "…no quoted text");
  eq(row.direct, false, "…and is not flagged as a documented position");
  // Whatever a surface does with a record row, the vocabulary it gets is the
  // record's. This is the whole guard against "Says: supports".
  const chip = LIVE._alignSignalChipHtml(row);
  has(chip, "Record pattern:", "the shared chip stamps the lane on its face");
  has(chip, "🏛", "…with the formal lane's own marker");
  lacks(chip, "Says:", "…and never borrows the stated lane's verb");
  // And on the painted sheet, where there is no stance in the fixture at all.
  lacks(HTML, "align-sig-said", "no cell on this sheet renders a stated-position chip");
  lacks(HTML, "Says:", "…so the word \"Says\" appears nowhere on it");
  has(HTML, "Record pattern:", "…while the record chips do appear");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the order is the record's direction, and nobody with a file is a void");
// ═════════════════════════════════════════════════════════════════════════════
{
  const r = LIVE.PDXRaceSheet._rank(LIVE.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.gap.length, 0, "nobody with a readable file is banded as unrankable");
  eq(r.ranked.length, FIELD.length, "…the whole field is ordered");
  eq(r.unranked, false, "…and the sheet is genuinely in ranking mode");
  eq(r.ranked[0].pid, A_PID,
    "the candidate whose votes ran WITH the reader leads the field");
  ok(r.ranked[0].score > r.ranked[1].score,
    `…on a strictly higher number (${r.ranked[0].score} vs ${r.ranked[1].score})`);
  // The order on screen, which is the only order a reader experiences.
  const order = (HTML.match(/data-align-pid="([^"]+)"/g) || []).map((m) => m.slice(16, -1));
  eq(order[0], A_PID, "…and that is the order painted");
  has(HTML, 'class="rs-rank">1<', "the leader is numbered, not banded");
  // The cell itself: a real pattern with its depth, plus the quiet disclosure.
  has(HTML, "No stance on file · not in Direction Match",
    "a record cell with no quote behind it says so, quietly and second");
  const cellAt = HTML.indexOf("No stance on file");
  const before = HTML.slice(Math.max(0, cellAt - 700), cellAt);
  has(before, "Record pattern:",
    "…underneath the pattern chip, never in place of it");
  has(before, 'class="rs-cell-lead"',
    "…in the second slot, so the signal still leads the cell");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · votes on file that the engine will not characterise are not 'no record'");
// ═════════════════════════════════════════════════════════════════════════════
{
  // B's items on the reader's issue are real, dated, mapped votes on which B took
  // no side — Present and Not Voting. That is a real formal file and it is behind a
  // MEANING wall, not a depth one, so no direction may be read off it and B cannot
  // be scored — correctly. What B must not be told is that there is nothing there.
  //   (A single item that IS about the issue is a different fixture and a
  //   different contract: it reads a side and it scores. That contract lives in
  //   scripts/test-single-item-side.mjs, which also pins this wall from the other
  //   direction — that lowering the depth floor to one item left it standing.)
  //   WHY THE FIXTURE IS PRESENT VOTES NOW. It used to be one non-primary vote,
  // and then a 1–1 pair of them, on the theory that a package-borne mapping was
  // itself a meaning wall. It is not, and as of the August 2026 pass it never was:
  // one instrument means one official Yea or Nay, and every issue mapped to that
  // instrument gets that vote at full strength, whatever the measure was mainly
  // about. So "not about this issue" is gone from the refusal ladder entirely, and
  // a fixture built on it would now be demonstrating a coverage shortfall rather
  // than the meaning wall this section is about.
  //   What remains a meaning wall, and is the one being demonstrated here, is a
  // file with no judged side in it: acts that are real, dated, sourced and mapped,
  // where the member was Present or Not Voting and so nothing on the row went
  // either way. There is nothing to read a direction FROM, at any depth — and the
  // padding on K2 puts B over the member coverage floor so it is that wall
  // answering and not ours.
  const thin = stage({ b: [vote(90, K, "present"), vote(91, K, "not_voting")]
                        .concat(runOf(12, K2, "nay", 40)), keys: [K] });
  const html = sheetHtml(thin);
  const idx = thin.PDXConsistency.formalPatternIndex.rows(B_PID).filter((x) => x.key === K)[0];
  must(idx && (idx.held || 0) > 0,
    "the thin fixture no longer puts a formal item on file for the challenger");
  must(thin._calcAlignmentScore(B_PID, { mode: "record" }) === null,
    "the thin fixture is now scoreable — it can no longer demonstrate the band");
  const r = thin.PDXRaceSheet._rank(thin.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.gap.length, 1, "the unscoreable candidate is banded, not dropped from the field");
  eq(r.gap[0].pid, B_PID, "…and it is the one with the thin file");
  ok(r.gap[0].filed > 0,
    "…flagged as holding a formal file on the reader's issues, for the wording only");
  // The three places the old copy claimed an empty record.
  has(html, "votes on file · no vote here took a side",
    "the cell prints the depth of the file and the engine's own reason");
  lacks(html, "no clear pattern yet",
    "…and the reason is the specific one, not the blanket sentence that fits four cases");
  lacks(html, "not about this issue",
    "…and never the retired one, which said a mapped act was not an act on its issue");
  lacks(html.slice(html.indexOf('class="rs-band"')), "No formal record on your issues yet",
    "the band no longer claims an empty record over a real one");
  has(html, "Not ranked on your issues yet", "…it says what is actually true instead");
  has(html, "Formal file on your issues · no readable direction",
    "…and the number slot names the file rather than denying it");
  has(html, "too little of it took a side for the record engine to characterise",
    "…with the reason spelled out");
  has(html, "they are not scored from their words instead",
    "…and the substitution a reader would suspect still ruled out");
  // The candidate who CAN be scored still is — the point is only that the one who
  // cannot is not handed a number for holding a thin file.
  const gapGrid = html.slice(html.indexOf('class="rs-grid rs-grid--gap"'));
  must(gapGrid.length > 200, "the banded track did not render — its copy is untestable");
  lacks(gapGrid, 'class="rs-score"', "the banded pane still carries no invented percentage");
  has(gapGrid, 'class="rs-rank rs-rank--gap"', "…and a dash where a rank position would be");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · honest empty is still honest empty");
// ═════════════════════════════════════════════════════════════════════════════
{
  // DARK: no stance from anyone, no vote from anyone. Nothing to say, said.
  const cold = stage({ a: [], b: [], keys: [DARK] });
  const html = sheetHtml(cold);
  eq(cold._calcAlignmentScore(A_PID, { mode: "record" }), null,
    "an issue with neither lane on file scores nobody");
  const r = cold.PDXRaceSheet._rank(cold.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.ranked.length, 0, "…so nobody is ranked");
  ok(r.gap.every((c) => !c.filed), "…and nobody is credited with a file they do not have");
  has(html, "No formal record on your issues yet",
    "the original admission survives, word for word, where it is true");
  has(html, "No readable vote pattern",
    "…and the empty cell still says the lane is silent, with no depth claim attached");
  lacks(html, "vote on file ·",
    "…and does not dress a genuinely empty file up as a thin one");
  lacks(html, 'class="rs-score"', "no percentage is invented out of two silences");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · zero positions is still Overview, and the stated tab still leads on quotes");
// ═════════════════════════════════════════════════════════════════════════════
{
  const none = boot();
  none.PDXVotingRecord.noteMember(A_PID, JSON.parse(JSON.stringify(SEED_A)));
  none.PDXVotingRecord.noteMember(B_PID, JSON.parse(JSON.stringify(SEED_B)));
  eq(none.PDXRaceSheet._axis().length, 0, "the fixture reader has set nothing");
  eq(none.PDXRaceSheet.view(), "overview",
    "a reader with no positions lands on Overview however deep the field's record is");
  const html = sheetHtml(none);
  lacks(html, 'class="rs-score"', "…with no match percentage on screen");
  lacks(html, "No stance on file · not in Direction Match",
    "…and no per-issue disclosure, because there are no reader issues to disclose against");
  has(html, "Set your positions", "…and the reader-scoped ask instead");

  // The stated ruler is still quote-led: the record does not get forced into it.
  const st = stage({ session: { politidex_racesheet_mode: "stated" } });
  st.PDXRaceSheet.setMode("stated");
  const shtml = sheetHtml(st);
  eq(st.PDXRaceSheet.mode(), "stated", "the reader is on the stated ruler");
  const sr = st.PDXRaceSheet._rank(st.PDXRaceSheet._field(SEAT), "stated", true);
  // THE STATED RULER IS QUOTE-LED, NOT QUOTE-ONLY. It leads on what they said and
  // falls back to what the record did where they said nothing — so a field with a
  // full formal file and no sourced quote is now rankable on this tab too, where
  // it used to be one undifferentiated band of "no stated position".
  eq(sr.ranked.length, FIELD.length,
    "the stated ruler ranks a field the record can answer, rather than banding all of it");
  eq(sr.gap.length, 0, "…so nobody is banded as unanswerable");
  lacks(shtml, "No stated position on your issues yet",
    "…and the admission is not printed over a sheet that demonstrably has an answer");
  // …and every one of those answers is marked, on the face, as record-derived.
  has(shtml, "From the record",
    "each stood-in cell carries the baseline tag rather than passing as a quote");
  has(shtml, "No stance on file · not in Direction Match",
    "…over the same two-fact disclosure the record ruler prints");
  lacks(shtml, "Says:",
    "…and the word \"Says\" appears nowhere, because nothing here was said");
  // The pointer to the other tab is gone BECAUSE it is no longer needed: the
  // record already answered, in this tab. It survives for the case it was written
  // for — a candidate the record cannot answer either — which section 5 covers.
  lacks(shtml, "open Your Record Match",
    "…and the cross-tab pointer is not printed where this tab already answered");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no new arithmetic — the record half is the shipped ladder");
// ═════════════════════════════════════════════════════════════════════════════
{
  const AT = R("alignment-tool.js");
  has(AT, "_ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.45, thin: 0.5 }",
    "the confidence table the record weight is scaled by is the shipped one");
  has(AT, "issueScore = _rVerdict === 'match' ? 90 : _rVerdict === 'partial' ? 55 : 12;",
    "…and the record branch uses the same 90/55/12 ladder a documented position does");
  // The sheet still computes nothing. `filed` in particular is a count of issues
  // for wording, and it must never reach a comparator.
  const SH = R("race-sheet.js");
  const rankAt = SH.indexOf("function rank(list, mode, hasIssues)");
  must(rankAt > 0, "race-sheet's rank() has been renamed");
  const rankBody = SH.slice(rankAt, SH.indexOf("\n  }", rankAt));
  has(rankBody, "c.score = hasIssues ? scoreOf(c.pid, mode) : null;",
    "the rank is the one match brain's number and nothing else");
  const sorts = rankBody.slice(rankBody.indexOf("ranked.sort"));
  lacks(sorts, "filed", "…and the file count never enters the sort");
  lacks(sorts, "held", "…nor any inventory depth");
  const codeOnly = SH.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/(score|pct|overall)\s*[+\-*/]\s*(score|pct|overall|alt|dm)/i.test(codeOnly),
    "no arithmetic in the sheet combines two rulers");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the mutations — re-requiring a stance must break this file");
// ═════════════════════════════════════════════════════════════════════════════
// Every assertion above is only worth what its counterfactual is worth. These
// three rewrites are the three places the stance requirement could be put back:
// the score's own axis gate, the record side map that feeds it, and the cell's
// depth line. Each must produce a demonstrably worse product.
{
  const mutant = (mutate, probeFn) => {
    let win;
    try {
      win = boot({ mutate });
      win.PDXVotingRecord.noteMember(A_PID, JSON.parse(JSON.stringify(SEED_A)));
      win.PDXVotingRecord.noteMember(B_PID, JSON.parse(JSON.stringify(SEED_B)));
      [K, K2].forEach((k) => win.alignToggleIssue(k));
    } catch (e) { return { threw: String(e && e.message) }; }
    return probeFn(win);
  };

  // M1 — the axis gate in _calcAlignmentScore / _calcAlignmentBreakdown: require
  // a documented position alongside the pattern before the axis counts.
  const G1 = "if (_recMode && !recSig) return;";
  const G2 = "if (_recMode && !recSig) {";
  must(R("alignment-tool.js").indexOf(G1) > 0 && R("alignment-tool.js").indexOf(G2) > 0,
    "the record-mode axis gate has moved — M1 can no longer be applied");
  const m1 = mutant({
    "alignment-tool.js": (s) => s
      .replace(G1, "if (_recMode && (!recSig || !polMap[issueKey])) return;")
      .replace(G2, "if (_recMode && (!recSig || !polMap[issueKey])) {"),
  }, (w) => ({
    score: w._calcAlignmentScore(A_PID, { mode: "record" }),
    ranked: w.PDXRaceSheet._rank(w.PDXRaceSheet._field(SEAT), "record", true).ranked.length,
  }));
  eq(m1.score, null,
    "M1: requiring a quote alongside the pattern un-scores the candidate — which is the bug");
  eq(m1.ranked, 0, "M1: …and empties the ranked field, which section 3 would catch");

  // M2 — the record side map: drop any pattern row we hold no quote for.
  const G3 = "if (!x.read || !side || !conf) return;";
  must(R("alignment-tool.js").indexOf(G3) > 0,
    "the record side map's fail-closed line has moved — M2 can no longer be applied");
  const m2 = mutant({
    "alignment-tool.js": (s) => s.replace(G3, "if (!x.read || !side || !conf || !x.said) return;"),
  }, (w) => ({
    score: w._calcAlignmentScore(A_PID, { mode: "record" }),
    html: sheetHtml(w),
  }));
  eq(m2.score, null,
    "M2: filtering the pattern index by `said` un-scores the candidate too");
  lacks(m2.html, "Record pattern:",
    "M2: …and strips every pattern chip off the sheet, which section 2 would catch");

  // M3 — the cell's depth line: go back to one sentence for both silences.
  const G4 = "var silence = (mode === 'record') ? recSilence(fRow) : 'No documented position';";
  must(R("race-sheet.js").indexOf(G4) > 0,
    "the cell's silence branch has moved — M3 can no longer be applied");
  const m3 = mutant({
    "race-sheet.js": (s) =>
      s.replace(G4, "var silence = (mode === 'record') ? 'No readable vote pattern' : 'No documented position';"),
  }, (w) => {
    w.PDXVotingRecord.noteMember(B_PID,
      [vote(90, K, "present"), vote(91, K, "not_voting")].concat(runOf(12, K2, "nay", 40)));
    return { html: sheetHtml(w) };
  });
  lacks(m3.html, "votes on file · no vote here took a side",
    "M3: collapsing the two silences hides a live file behind an empty-file sentence");
  has(m3.html, "No readable vote pattern",
    "M3: …and the mutant really does print the one flat sentence, so the lack above is the defect and not a typo");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ match axis (formal, no stance): ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ your issues × their formal pattern — ${passed} assertions passed`);
