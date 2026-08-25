#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-race-sheet.mjs — one office, the whole field, ranked by the voting record
// ─────────────────────────────────────────────────────────────────────────────
// A voter who has set positions should be able to open one seat on their ballot,
// see every candidate the product knows for it side by side, and have the field
// ORDERED BY HOW THE FORMAL RECORD LINES UP WITH THEM — by default, before they
// touch a control. That is the race sheet. It computes nothing: it calls the one
// match brain (_calcAlignmentScore / _calcAlignmentBreakdown) once per lane per
// candidate and presents the answer. This file guards the presentation, because
// a ranking is exactly the kind of surface that lies quietly.
//
//   1. THREE RULERS, NEVER COLLAPSED. Your Record Match, Your Match · stated,
//      and Direction Match are separately named, separately explained, and only
//      the first two can order the field.
//   2. RECORD IS THE DEFAULT, and it says so on screen. A corrupt stored mode
//      falls back to record; the toggle persists for the session.
//   3. THE ORDER IS THE SCORE. Rank position follows the active lane's number
//      descending, and flipping the toggle re-orders the field.
//   4. DIRECTION MATCH DOES NOT RANK. Its chip is on every pane and the field's
//      order is provably not its order.
//   5. STARRED ISSUES FIRST. A "high" priority stance pins its issue to the top
//      of the axis in BOTH modes.
//   6. NO STANCES → NO FAKE RANK. No numbers, no ordering claim, a CTA, and a
//      stable officeholder-first order.
//   7. NO FORMAL COVERAGE → AN HONEST BAND, not an invented percentage, and not
//      the other lane's number wearing this lane's name.
//   8. ONE PICK PER OFFICE. Adding from the sheet writes the ballot store; a
//      second add to the same seat REPLACES rather than accumulates.
//   9. NOTHING DRIFTED. Direction Match, Word-vs-Action and the ledger slots are
//      byte-identical with this file loaded.
//  10. NO PARTY, ANYWHERE. Not in the rank, not in the copy, not in the markup.
//
//   node scripts/test-race-sheet.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, real ballot
// roster, votes seeded the way a completed /api/voting-record fetch leaves the
// cache — plus a mini-DOM, because unlike the engines this surface paints.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The sheet reads across most of the app, so the boot list is the standard
// engine stack plus the four surfaces it borrows from: issue colours, My Stances
// (priority weight), the location resolver, the compare hub (ledger slot) and
// the ballot store (roster + picks).
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
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// The shared sandbox returns null for every lookup, which is right for engines
// and useless for a surface that appends an overlay and reads it back. This is
// the smallest registry that lets render() actually run: elements keyed by id,
// innerHTML as a plain string, everything else a no-op.
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

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {};
  const sess = opts.session || {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  // compare-hub.js reaches for the Firebase `auth` handle the page defines
  // inline; absent it the module throws partway through. A null handle is what
  // a signed-out visitor has, and it lets the whole file run.
  // Two globals the PAGE defines inline that compare-hub.js expects to already
  // exist: the Firebase auth handle (signed-out shape) and the compare tray's
  // selection array. Without them the module throws partway through and the
  // ledger slot the DM chip reads never gets defined.
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  // A few modules paint on load and reach for page elements this harness has no
  // reason to model; they throw partway through and still export everything the
  // sheet reads. That is expected, so load errors are COLLECTED rather than
  // printed — and the boot asserts below fail loudly if an export we need is
  // actually missing, which is the thing that would matter.
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  if (!opts.withoutSheet) vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  win.PROFILES = win.CMP_DATA;
  // Location comes AFTER boot: voter-hub-location.js resets these on init, so a
  // value set beforehand is thrown away.
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
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
  console.error(`✗ race sheet: ${msg}`);
  process.exit(1);
};

// ── The fixture seat ─────────────────────────────────────────────────────────
// 'senate' resolves, from the shipped roster, to a real two-candidate field for
// a Utah voter. Two is the minimum a comparison means anything at, and using the
// live roster rather than a hand-built one means this test breaks if the seat
// model moves — which is the point.
const SEAT = "senate";
const probe = boot();
must(typeof probe.pdxOpenRaceSheet === "function", "pdxOpenRaceSheet is not exposed");
must(typeof probe._calcAlignmentScore === "function", "the match brain is not loaded");
must(typeof probe._ballotCandidates === "function", "the ballot roster is not loaded");
must(typeof probe._pdxLedgerSlot === "function",
  `the Direction Match ledger slot is not loaded — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe._msPriorityWeight === "function", "the My Stances priority weight is not loaded");

const FIELD0 = probe.PDXRaceSheet._field(SEAT);
must(FIELD0.length >= 2, `the fixture seat "${SEAT}" no longer has a field of 2+ candidates`);
const [A_PID, B_PID] = FIELD0.map((c) => c.pid);

// Two issues neither candidate has a documented position on, so the record lane
// is the ONLY thing that can score them and the ordering below is unambiguously
// a voting-record ordering.
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
const mapA = probe._polPositionMap(A_PID) || {};
const mapB = probe._polPositionMap(B_PID) || {};
const SILENT = ISSUE_KEYS.filter((k) => sideable(k) && !mapA[k] && !mapB[k]);
const [PIN, SECOND, DARK] = SILENT;
// A documented position on at least one candidate — the stated lane needs
// something to say for the toggle to be a real change of question.
const SAID = ISSUE_KEYS.filter((k) => sideable(k) && (mapA[k] || mapB[k]))[0];
must(PIN && SECOND && DARK && SAID, "the fixture no longer offers every case");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 750 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
});
// A votes WITH the visitor on both pinned issues; B votes AGAINST on both. The
// visitor supports both. So on the record ruler A must outrank B — and there is
// no other lane that could have produced that order.
const SEED_A = [];
for (let i = 0; i < 12; i++) SEED_A.push(vote(i, PIN, "yea"));
for (let i = 0; i < 12; i++) SEED_A.push(vote(20 + i, SECOND, "yea"));
const SEED_B = [];
for (let i = 0; i < 12; i++) SEED_B.push(vote(40 + i, PIN, "nay"));
for (let i = 0; i < 12; i++) SEED_B.push(vote(60 + i, SECOND, "nay"));

const clone = (a) => a.map((v) => JSON.parse(JSON.stringify(v)));
function seeded(opts) {
  const win = boot(opts);
  win.PDXVotingRecord.noteMember(A_PID, clone(SEED_A));
  win.PDXVotingRecord.noteMember(B_PID, clone(SEED_B));
  return win;
}
function withPicks(win, keys) {
  (keys || [PIN, SECOND, DARK]).forEach((k) => win.alignToggleIssue(k));
  return win;
}
const sheetHtml = (win, seat) => {
  win.pdxOpenRaceSheet(seat || SEAT);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};
// Pane order as painted, which is the only order a reader actually experiences.
const paneOrder = (html) =>
  (html.match(/data-align-pid="([^"]+)"/g) || []).map((m) => m.slice(16, -1));

const LIVE = withPicks(seeded());
const HTML = sheetHtml(LIVE);
must(HTML.length > 500, "the sheet painted nothing at all");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · three rulers, never collapsed");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HTML, "Your Record Match", "the record ruler is named");
  has(HTML, "Your Match · stated", "…the stated ruler is named");
  has(HTML, "Direction Match", "…and Direction Match is named");
  has(HTML, "Record match</b> = their votes/actions vs your positions",
    "the one-line explainer distinguishes the two ideas");
  has(HTML, "Direction Match</b> = whether they kept their own word",
    "…on both halves");
  // The wall the whole product rests on: no lane is blended into another.
  has(HTML, "Only the <b>formal</b> lane", "the sheet states which lane feeds the record ruler");
  has(HTML, "Public statements are never added into it",
    "…and that the public lane is not in the number");
  const RS = SHEET;
  lacks(RS, "publicTally", "the sheet never reaches for a public-lane tally");
  // "Refuses to blend" has to be checked against the code, not the prose: no
  // arithmetic anywhere in the file combines two of the three rulers.
  const codeOnly = RS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/(score|pct|overall)\s*[+\-*/]\s*(score|pct|overall|alt|dm)/i.test(codeOnly),
    "no arithmetic in the sheet combines two of the three rulers");
  ok(!/\/\s*2\b/.test(codeOnly), "…and nothing is averaged into a single figure");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · record is the default, and the toggle persists");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(boot().PDXRaceSheet.mode(), "record", "a fresh visitor opens on the formal record");
  eq(boot({ session: { politidex_racesheet_mode: "banana" } }).PDXRaceSheet.mode(), "record",
    "a corrupt stored mode falls back to record, not to the sparser lane");
  eq(boot({ session: { politidex_racesheet_mode: "stated" } }).PDXRaceSheet.mode(), "stated",
    "…and a real stored mode is honoured");
  const sess = {};
  const w = withPicks(seeded({ session: sess }));
  sheetHtml(w);
  w.PDXRaceSheet.setMode("stated");
  eq(sess.politidex_racesheet_mode, "stated", "the choice is written for the session");
  eq(w.PDXRaceSheet.mode(), "stated", "…and read back");
  // Sheet-local: opening a race sheet, and flipping its ruler, must not silently
  // re-point the Alignment Tool, the browse grid or Key Races at a different
  // question. The tool keeps its own default (stated — right for ranking a whole
  // database, most of which has no roll calls) while the sheet defaults to record.
  const toolMode = boot().alignMatchMode();
  eq(w.alignMatchMode(), toolMode,
    "flipping the sheet's ruler leaves the Alignment Tool's own mode untouched");
  ok(toolMode !== w.PDXRaceSheet.mode() || toolMode === "stated",
    "the two surfaces hold their defaults independently");
  // Only the comment explaining the choice may name it; no call site may.
  ok(!/[^.a-zA-Z]alignSetMatchMode\s*\(/.test(SHEET) && !/window\.alignSetMatchMode\s*\(/.test(SHEET),
    "the sheet never writes the Alignment Tool's global mode");
  has(SHEET, "politidex_racesheet_mode", "the sheet keeps its own key");
  has(SHEET, "sessionStorage", "…in session scope, so it is a visit-level choice");
  // The default is stated ON SCREEN, not just in a variable.
  has(HTML, "Ranked by their <b>formal record</b> on the issues you set",
    "the sheet says out loud what is ordering the field");
  has(HTML, "not by party, and not by Direction Match",
    "…and names the two things that are NOT ordering it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the order is the score, and the toggle re-orders");
// ═════════════════════════════════════════════════════════════════════════════
{
  const f = LIVE.PDXRaceSheet._field(SEAT);
  const rec = LIVE.PDXRaceSheet._rank(f, "record", true);
  ok(rec.ranked.length === 2, `both seeded candidates are scorable on the record lane (got ${rec.ranked.length})`);
  if (rec.ranked.length === 2) {
    eq(rec.ranked[0].pid, A_PID, "the candidate whose votes agree with the visitor ranks first");
    eq(rec.ranked[1].pid, B_PID, "…and the one who voted against them ranks second");
    ok(rec.ranked[0].score > rec.ranked[1].score,
      `first place holds the higher record match (${rec.ranked[0].score} vs ${rec.ranked[1].score})`);
  }
  // Painted order, not just model order.
  const order = paneOrder(HTML);
  eq(order[0], A_PID, "the painted field leads with the best record match");
  has(HTML, '<span class="rs-rank">1</span>', "the leader is numbered 1");

  // Flip the ruler and the question genuinely changes. Give the visitor an issue
  // the stated lane can answer so the two lanes are not measuring the same thing.
  const w2 = withPicks(seeded(), [PIN, SECOND, SAID]);
  const recOrder = paneOrder(sheetHtml(w2));
  w2.PDXRaceSheet.setMode("stated");
  const statedHtml = sheetHtml(w2);
  has(statedHtml, "Ranked by their <b>stated positions</b> on the issues you set",
    "the stated ruler states its own basis");
  const statedScores = w2.PDXRaceSheet._rank(w2.PDXRaceSheet._field(SEAT), "stated", true);
  const recScores = w2.PDXRaceSheet._rank(w2.PDXRaceSheet._field(SEAT), "record", true);
  const num = (r, pid) => { const h = r.ranked.filter((c) => c.pid === pid)[0]; return h ? h.score : null; };
  ok(num(recScores, A_PID) !== num(statedScores, A_PID) ||
     num(recScores, B_PID) !== num(statedScores, B_PID),
    "the two rulers return different numbers for the same field — they are two questions");
  ok(recOrder.length > 0 && paneOrder(statedHtml).length > 0,
    "both rulers paint the whole field");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Direction Match is present and does not rank");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HTML, 'class="rs-dm"', "every pane carries the Direction Match chip");
  has(HTML, "did they keep their own word",
    "…subtitled with the question it answers, so it cannot be read as a match to the reader");
  has(HTML, "It is not a match to you, and it does not order this list",
    "…and says so outright on hover");
  ok((HTML.match(/class="rs-dm"/g) || []).length >= 2,
    "the chip is on the whole field, not just the leader");

  // The proof it is not the sort key. The roster no longer arrives DM-sorted
  // (ballot-breakdown.js orders it officeholder-then-alphabetical now), so this
  // checks the two things that still matter: field() passes the roster through
  // untouched, and the painted order is rank()'s work.
  const raw = LIVE._ballotCandidates(SEAT);
  const rosterOrder = raw.map((c) => c.pid);
  const shown = paneOrder(HTML);
  eq(shown[0], A_PID, "the field leads with the best record match");
  // field() must hand rank() the roster untouched — so the painted order is
  // provably rank()'s work and not a Direction Match order that happened to
  // agree. And the DM figure the roster carries as `.score` is never reused.
  eq(LIVE.PDXRaceSheet._field(SEAT).map((c) => c.pid).join(","), rosterOrder.join(","),
    "field() preserves the roster order, so any re-ordering is the match's doing");
  ok(LIVE.PDXRaceSheet._field(SEAT).every((c) => c.score === undefined),
    "…and drops the Direction Match figure the roster arrives carrying");
  has(SHEET, "This sheet discards both",
    "the sheet documents that it drops the roster's ordering and its DM figure");
  // No control offers Direction Match as a sort.
  ok(!/onclick="[^"]*[Ss]ort[^"]*[Dd]irection/.test(HTML),
    "there is no sort-by-Direction-Match control");
  const modeBtns = (HTML.match(/class="rs-mode[ "]/g) || []).length;
  eq(modeBtns, 2, "exactly two rulers can order this field");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · starred issues come first on the axis");
// ═════════════════════════════════════════════════════════════════════════════
{
  // "Starred" is a My Stances HIGH priority, which is the weight the match brain
  // already honours. The axis must agree with the scorer about what matters.
  const w = withPicks(seeded(), [PIN, SECOND, DARK]);
  const before = w.PDXRaceSheet._axis().map((r) => r.key);
  ok(before.length >= 3, "the axis lists the visitor's issues");
  // Star the issue that is NOT already first, so passing cannot be an accident.
  const target = before[before.length - 1];
  w.PDXStances.set(target, "support", "high");
  const after = w.PDXRaceSheet._axis();
  eq(after[0].key, target, "a high-priority stance pins its issue to the top of the axis");
  eq(after[0].starred, true, "…and is flagged as starred");
  ok(after[0].weight > 1, `…with the weight the scorer uses (${after[0].weight})`);
  const starHtml = sheetHtml(w);
  has(starHtml, "rs-star", "the starred issue is marked in the painted axis");
  // Both modes, same axis — the pin is not a record-mode quirk.
  w.PDXRaceSheet.setMode("stated");
  eq(w.PDXRaceSheet._axis()[0].key, target, "…and it stays pinned on the stated ruler too");
  // Low priority is the mirror image: it sinks, it does not disappear.
  w.PDXStances.set(target, "support", "low");
  const sunk = w.PDXRaceSheet._axis();
  eq(sunk[sunk.length - 1].key, target, "a low-priority stance sinks to the bottom of the axis");
  eq(sunk.filter((r) => r.key === target).length, 1, "…and is still on it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no stances → no fake rank");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = seeded();                                   // votes on file, zero positions
  const html = sheetHtml(w);
  eq(w.PDXRaceSheet._axis().length, 0, "a visitor with no positions has no axis");
  const r = w.PDXRaceSheet._rank(w.PDXRaceSheet._field(SEAT), "record", false);
  eq(r.unranked, true, "the model refuses to rank");
  eq(r.ranked.length, 0, "…so nobody is placed");
  eq(r.gap.length, FIELD0.length, "…and nobody is dropped either");
  has(html, "it is in a fixed order: officeholder first, then alphabetical",
    "the sheet says the order is not a ranking");
  has(html, "Set your positions and this field re-orders itself", "the CTA is present");
  has(html, "Pick at least <b>3</b> issues", "…and names the ask");
  has(html, "rs-cta-btn", "…with something to press");
  // The hard part: not one number anywhere that could be read as a match.
  lacks(html, 'class="rs-score"', "no match percentage is painted for anyone");
  lacks(html, '<span class="rs-rank">1</span>', "…and nobody is numbered first");
  // Stable order: officeholder first, then alphabetical, deterministic run to run.
  const again = sheetHtml(seeded());
  eq(paneOrder(html).join(","), paneOrder(again).join(","),
    "the unranked order is stable between visits");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no formal coverage → an honest band, never an invented number");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Same visitor, same issues, no vote packs at all: the record lane has nothing
  // and must say so rather than borrow from the stated lane.
  const cold = withPicks(boot(), [PIN, SECOND, DARK]);
  const html = sheetHtml(cold);
  const r = cold.PDXRaceSheet._rank(cold.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.ranked.length, 0, "no vote pattern means nobody earns a record rank");
  ok(r.gap.length >= 2, "…and the whole field sits in the band instead");
  has(html, "No formal record on your issues yet", "the band names the gap in the reader's terms");
  has(html, "there is no record match to give them", "…and explains why there is no number");
  has(html, "they are not scored from their words instead",
    "…and rules out the substitution a reader would suspect");
  lacks(html, 'class="rs-score"', "not one invented record-match percentage");
  has(html, 'class="rs-rank rs-rank--gap"', "banded candidates get a dash, not a position");
  has(html, "No readable vote pattern", "…and each empty cell says which lane is silent");

  // If the OTHER lane can answer, its figure may appear — wearing its own name,
  // in the band, where it plainly is not the rank.
  const alt = html.indexOf('class="rs-alt"');
  if (alt >= 0) {
    const seg = html.slice(alt, alt + 400);
    ok(/stated \d+%/.test(seg) || /record \d+%/.test(seg),
      "a borrowed figure is labelled with the lane it came from");
    has(html, "It does not rank this list", "…and disclaims itself");
  } else { passed++; }

  // A one-candidate field is a different admission and gets different words.
  const solo = cold.PDXRaceSheet._field("governor");
  if (solo.length === 1) {
    has(sheetHtml(cold, "governor"), "there is no field to compare yet",
      "a field of one is not dressed up as a comparison");
  } else { passed++; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · one pick per office, added or replaced from the sheet");
// ═════════════════════════════════════════════════════════════════════════════
{
  const store = {};
  const w = withPicks(seeded({ store }));
  sheetHtml(w);
  has(sheetHtml(w), "➕ Add to my team", "an unfilled seat offers the add");

  w.pdxRaceSheetPick(SEAT, A_PID);
  const afterAdd = JSON.parse(store.politidex_my_team || "{}");
  eq(afterAdd[SEAT], A_PID, "the pick lands in the ballot store My Voting Team reads");
  has(sheetHtml(w), "✓ On my team", "…and the sheet shows it as picked");
  has(sheetHtml(w), "Replace my pick", "…while the rival now offers a replace");

  w.pdxRaceSheetPick(SEAT, B_PID);
  const afterSwap = JSON.parse(store.politidex_my_team || "{}");
  eq(afterSwap[SEAT], B_PID, "a second pick REPLACES the first");
  eq(Object.keys(afterSwap).filter((k) => k === SEAT).length, 1,
    "…the seat holds exactly one pick, never two");
  has(SHEET, "One pick per office is the ballot store's own rule",
    "the sheet documents that it inherits the rule rather than inventing one");
  has(SHEET, "ballotPickCard", "…by routing through the shipped pick path");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · nothing drifted");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The sheet reads. If it writes, it writes only the ballot store. Every figure
  // the rest of the product publishes must be identical with it loaded.
  const withOut = boot({ withoutSheet: true, quiet: true });
  const withIn = boot({ quiet: true });
  const pids = FIELD0.map((c) => c.pid).concat(["curtis", "lee", "schumer", "romney"]);
  let waSame = 0, dmSame = 0, checked = 0;
  pids.forEach((pid) => {
    const d = withOut.CMP_DATA[pid];
    if (!d) return;
    checked++;
    const wa = (w) => { try { return JSON.stringify(w.PDXWordAction.read(pid)); } catch (e) { return "err"; } };
    if (wa(withOut) === wa(withIn)) waSame++;
    const slot = (w) => {
      try {
        const st = w._pdxOfficeStatus ? w._pdxOfficeStatus(w.CMP_DATA[pid]) : "office";
        return JSON.stringify(w._pdxLedgerSlot(w.CMP_DATA[pid], { pid, status: st }));
      } catch (e) { return "err"; }
    };
    if (slot(withOut) === slot(withIn)) dmSame++;
  });
  ok(checked >= 2, "the drift check covered a real set of profiles");
  eq(waSame, checked, "Word-vs-Action is byte-identical with the race sheet loaded");
  eq(dmSame, checked, "…and so is every Direction Match ledger slot");
  // And the sheet holds no arithmetic of its own to drift.
  ok(!/_ALIGN_PAT_CONF|_issueVerdict\s*\(|90\s*:\s*55|MIN_TESTED/.test(SHEET),
    "the sheet re-implements no part of the scoring ladder");
  has(SHEET, "_calcAlignmentScore", "it calls the one match brain");
  has(SHEET, "_calcAlignmentBreakdown", "…for both the number and the rows");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · no party, anywhere");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HTML, "Party is not read, printed or ranked anywhere on this sheet",
    "the sheet commits to it in words");
  ok(!/\bRepublican\b|\bDemocrat\b|\bparty-line\b|with their party|against their party/i
      .test(HTML.replace(/Party is not read[^<]*/g, "")),
    "no party framing survives in the painted sheet");
  ok(!/\bd\.party\b|\bparty\b\s*[:=]/.test(SHEET.replace(/\/\/[^\n]*/g, "")),
    "the sheet never reads a party field");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the entry points and the wiring");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = R("index.html");
  has(html, '<script defer src="race-sheet.js"></script>', "the page loads the sheet");
  has(html, 'href="/race-sheet.css"', "…and its styles");
  // One control, three hosts, all defensive: the entry returns '' for a seat it
  // cannot compare, so no host can paint a button that leads nowhere.
  for (const [f, why] of [
    ["who-represents-me.js", "Who Represents Me offers a comparison per seat"],
    ["voter-hub-location.js", "the Voter Hub seat rows offer one too"],
    ["ballot-breakdown.js", "and so does a My Voting Team seat card"],
  ]) has(R(f), "pdxRaceSheetEntry", why);
  eq(probe.pdxRaceSheetEntry("not-a-seat", {}), "",
    "an uncomparable seat yields no button at all");
  has(probe.pdxRaceSheetEntry("house", { compact: true }), "Compare field for this seat",
    "…and a real seat yields the one agreed label");
  has(probe.pdxRaceSheetEntry("house", {}), "pdxOpenRaceSheet('house')",
    "…wired to the sheet");
  // Three-way seat vocabulary: the hosts speak different dialects and the sheet
  // has to answer all of them for the same office.
  const alias = (k) => (probe.PDXRaceSheet._seat(k) || {}).key;
  eq(alias("ussenate1"), alias("senate"), "pdxRepsForMe's senate key resolves to the seat");
  eq(alias("representative"), alias("house"), "…the voter ballot's House key too");
  eq(alias("state_rep"), alias("statehouse"), "…and its State House key");
  // A stance change has to re-order an open sheet.
  has(R("alignment-tool.js"), "window._pdxRaceSheetRefresh()",
    "_alignRefreshAll repaints an open sheet");
  has(R("alignment-tool.js"), "window._alignQueueConsistWarm = _alignQueueConsistWarm",
    "…and the vote-pack warmer is reachable from another file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · it works on a phone and side by side on a desktop");
// ═════════════════════════════════════════════════════════════════════════════
{
  const css = R("race-sheet.css");
  for (const cls of [".rs-overlay", ".rs-sheet", ".rs-grid", ".rs-pane", ".rs-panehd",
                     ".rs-issuecell", ".rs-cell", ".rs-dm", ".rs-band", ".rs-cta",
                     ".rs-mode", ".rs-team", ".rs-entry", ".rs-entry--compact"]) {
    has(css, cls, `the sheet is styled (${cls})`);
  }
  ok(/\.rs-panehd\s*\{[^}]*position:\s*sticky/.test(css),
    "stacked on a phone, the candidate's name and score stay on screen while issues scroll");
  ok(/@media \(min-width:\s*900px\)[\s\S]*grid-auto-flow:\s*column/.test(css),
    "on a desktop the field is a true side-by-side grid");
  ok(/@media \(min-width:\s*900px\)[\s\S]*\.rs-panehd\s*\{\s*position:\s*static/.test(css),
    "…and the sticky header stands down when it is no longer helping");
  // 44px is the floor for anything a thumb has to hit.
  for (const sel of [".rs-mode", ".rs-team", ".rs-close", ".rs-entry"]) {
    const m = new RegExp("\\" + sel + "[^{]*\\{[^}]*min-height:\\s*(44px|2\\.75rem)").test(css);
    ok(m, `${sel} is a 44px touch target`);
  }
  // Issue colour comes from the site's own map, not a private palette.
  ok(!/#[0-9a-f]{6}\s*;\s*\/\*\s*issue/i.test(css), "no per-issue colours are hard-coded in the CSS");
  has(SHEET, "PDXIssueColors", "issue hues come from the site's shared issue-colour map");
  has(SHEET, "styleFor", "…through its own styleFor helper, not a private palette");
  // Every issue label is the site's label, not a re-spelling.
  has(SHEET, "ISSUE_MAP", "issue labels come from the shared ISSUE_MAP");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ race sheet: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ race sheet: one seat, the whole field, ranked by the record — ${passed} assertions passed\n`);
