#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-pattern-first-no-stance.mjs — a full file is not an empty product
// ─────────────────────────────────────────────────────────────────────────────
// Three comparison surfaces used to treat "we have no sourced quote from this
// person" as "there is nothing here", and they said so in pixels:
//
//   · the seat board (_pdxSeatIssueBoard) refused to draw at all unless TWO
//     people in the field had documented positions, and printed "·" over a
//     member with a hundred roll calls on the issue;
//   · the compare overlay's issue section was gated on anyDocumented, so a
//     lineup with no quotes got no issue comparison — and therefore no cells
//     for the record-direction hydration to fill either;
//   · the race sheet's stated column led every cell with "No documented
//     position" and greyed the real record chip behind it.
//
// All three are facts about OUR sourcing, printed over theirs. This file guards
// the pass that replaced them, and — much more importantly — the line it must
// not cross while doing it. A record is not a stance. The failures worth
// catching are not "did a tile appear"; they are:
//
//   1. a record tile that reads as a stated position — unmarked, or worded with
//      the stance lane's verbs, or filed under a "where they stand" heading;
//   2. a direction this product invented, where the pattern engine declined to
//      characterise one;
//   3. the two lanes counted together — a stated support against a recorded
//      oppose showing up as "the field disagrees", or a record row landing in
//      nAgree / nDiffer / a verdict tint;
//   4. the eligibility gates opening so far that a surface draws over nothing;
//   5. the honest empty state disappearing — "·" must still mean "·".
//
//   node scripts/test-pattern-first-no-stance.mjs
//
// No database, no network, no browser. Exit 1 on a failed assertion, 2 when a
// probe target has moved and a contract can no longer be checked at all.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
// A stale probe is not a pass. If the fixture stops being the fixture the
// contract is written about, this file cannot say anything about the contract,
// and saying nothing quietly is the failure this whole pass exists to remove.
function must(cond, what) {
  if (cond) return;
  console.error(
    "✗ pattern-first harness is STALE — a contract cannot be verified:\n  " + what +
    "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
    "  harness AND re-check the lane rule it describes."
  );
  process.exit(2);
}

// ── Mini DOM ─────────────────────────────────────────────────────────────────
// Ids are auto-vivified: compare-table.js binds listeners to a handful of
// document ids at load and reads #cmp-tbody back out, and the alternative to
// handing it those is not testing the shipped builder at all.
function autoDom(win) {
  const byId = {};
  const el = (id) => ({
    id: id || "", className: "", innerHTML: "", textContent: "", value: "",
    checked: false, style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    scrollIntoView() {},
  });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => { if (!byId[id]) byId[id] = el(id); return byId[id]; };
  win.document.body = el("body");
  win.document.head = el("head");
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  return byId;
}

const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
];

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win.performance = { now: () => 0 };
  // The hub reads this global while rendering cards. compare-table.js replaces
  // it with its own module-scoped set at load, so seeding it here only matters
  // for the boots that do not include that file.
  win._cmpSelected = new Set();
  const byId = autoDom(win);
  const sandbox = vm.createContext(win);
  win.__err = [];
  for (const f of ENGINE) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  // Globals the compare table reads from index.html's inline block, which is not
  // a loadable module. Each is stubbed at its NULL answer, which is the honest
  // one for a fixture with no pledge ledger and no mandate data — and which
  // keeps every branch under test on the thin-lineup path these surfaces exist
  // for. None of them is part of any contract below.
  win._pdxDisplayScore = () => null;
  win._pdxMandateForIssue = () => null;
  win._pdxMandateChip = () => "";
  win._pdxOfficeStatus = () => "office";
  if (opts.compare) {
    try { vm.runInContext(R("compare-table.js"), sandbox, { filename: "compare-table.js" }); }
    catch (e) { win.__err.push(`compare-table.js: ${e.message}`); }
  }
  if (opts.sheet) {
    // The sheet resolves its field through the hub and the ballot model, so
    // those two ride along only for the race boot.
    for (const f of ["compare-hub.js", "ballot-breakdown.js", "race-sheet.js"]) {
      try { vm.runInContext(R(f), sandbox, { filename: f }); }
      catch (e) { win.__err.push(`${f}: ${e.message}`); }
    }
  }
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  win.__byId = byId;
  return win;
}

// ── Seeded formal files ──────────────────────────────────────────────────────
// One vote shape, varied only in count and direction, so every tier the pattern
// engine can land on is reachable and none of them is reachable by accident.
let seq = 0;
const vote = (issueKey, position) => {
  seq++;
  return {
    kind: "vote", rollcallId: 9000 + seq, measureId: 9500 + seq,
    number: "S. " + (100 + seq), date: "2025-0" + ((seq % 9) + 1) + "-11",
    action: "On Passage", position, isProcedural: false, title: "Measure " + seq,
    issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
    source: { url: "https://www.congress.gov/roll-call-vote/" + (9000 + seq), label: "Congress.gov" },
  };
};
const many = (n, issueKey, position) => Array.from({ length: n }, () => vote(issueKey, position));

// ── Who the fixture is ───────────────────────────────────────────────────────
const probe = boot();
must(probe.__err.length === 0, `the engine did not load cleanly: ${probe.__err.join(" | ")}`);
must(typeof probe._pdxSeatIssueBoard === "function", "_pdxSeatIssueBoard is not exported");
must(typeof probe._pdxSeatFormalMap === "function",
  "_pdxSeatFormalMap is not exported — the board's formal lane has no accessor");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "the formal pattern index the board reads is not loaded");

const stanceCount = (win, pid) =>
  Object.keys(win._polPositionMap(pid, win.CMP_DATA[pid]) || {}).length;

// Two people who share a chamber, have a profile, and have no sourced position
// anywhere in the ledger. That combination is the whole subject of this file.
const SILENT = Object.keys(probe.CMP_DATA)
  .filter((pid) => /Pennsylvania State Senator/.test(String(probe.CMP_DATA[pid].office || "")))
  .filter((pid) => stanceCount(probe, pid) === 0);
must(SILENT.length >= 3,
  `the fixture needs 3+ stance-silent PA senators and has ${SILENT.length}`);
const [A, B, C] = SILENT;

const KEYS = Object.keys(probe.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k)).slice(0, 6);
must(KEYS.length === 6, "the taxonomy no longer offers six sideable issues");
const [K_UNI_A, K_SPLIT, K_SHARED, K_SOLO, K_THIN, K_NONE] = KEYS;

// A: deep and one-directional on three issues, one-vote thin on a fourth.
const REC_A = [
  ...many(8, K_UNI_A, "yea"),
  ...many(8, K_SPLIT, "yea"),
  ...many(8, K_SHARED, "yea"),
  ...many(8, K_SOLO, "yea"),
  ...many(1, K_THIN, "yea"),
];
// B: the opposite direction on K_SPLIT, the same direction on K_SHARED, and
// nothing at all on K_SOLO — so the board has a records-differ row, a
// records-agree row and a one-sided row to word differently.
const REC_B = [
  ...many(8, K_SPLIT, "nay"),
  ...many(8, K_SHARED, "yea"),
];

function seeded(opts) {
  const win = boot(opts);
  win.PDXVotingRecord.noteMember(A, JSON.parse(JSON.stringify(REC_A)));
  win.PDXVotingRecord.noteMember(B, JSON.parse(JSON.stringify(REC_B)));
  const store = { [A]: REC_A, [B]: REC_B };
  win.PDXVotingRecord.memberRecords = (pid) => store[pid] || null;
  return win;
}

const W = seeded();
must(stanceCount(W, A) === 0 && stanceCount(W, B) === 0,
  "the fixture subjects acquired stated positions — the no-stance case is gone");
const FMAP_A = W._pdxSeatFormalMap(A);
const FMAP_B = W._pdxSeatFormalMap(B);
must(Object.keys(FMAP_A).length >= 4,
  `candidate A should carry 4+ readable formal rows, has ${Object.keys(FMAP_A).length}`);
must(!FMAP_A[K_NONE], "the unseeded key leaked into the formal index — fail-closed is broken");

// ── A very small HTML reader ─────────────────────────────────────────────────
// Enough to walk <tr>/<td> and read attributes. The board is generated markup
// with no nesting inside a cell beyond one level, so a regex split is honest
// here in a way it would not be against arbitrary HTML.
const rowsOf = (html) => (String(html).match(/<tr class="pdx-sib-row[^"]*"[\s\S]*?<\/tr>/g) || []);
const cellsOf = (row) => (String(row).match(/<td class="pdx-sib-cell[^"]*"[\s\S]*?<\/td>/g) || []);
const attr = (frag, name) => {
  const m = new RegExp(name + '="([^"]*)"').exec(String(frag));
  return m ? m[1] : "";
};
const rowLabel = (row) => {
  const m = /<span class="pdx-sib-issue-lbl">([\s\S]*?)<\/span>/.exec(row);
  return m ? m[1] : "";
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a race where nobody has a quote still gets a board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = W._pdxSeatIssueBoard([A, B], { max: 20 });
  ok(html.length > 400, "the board draws for a field with zero stated positions");
  must(html.length > 400, "the board is empty, so nothing below this line can be checked");
  const rows = rowsOf(html);
  ok(rows.length >= 4, `the board carries the field's formal issues (${rows.length} rows)`);

  // The gate that moved is WHICH lane counts, not how many people it takes. It
  // still wants a readable signal from two of them — one filled column beside a
  // wall of "·" is not a comparison and drawing it would be the mirror of the
  // bug — but two formal files now satisfy it where two ledgers used to be
  // required.
  eq(W._pdxSeatIssueBoard([A, C], { max: 20 }), "",
    "one file beside an empty column is still not a comparison");
  eq(W._pdxSeatIssueBoard([C, SILENT[3] || C], { max: 20 }), "",
    "…and two people with nothing in either lane get no board at all");
  eq(W._pdxSeatIssueBoard([A], { max: 20 }), "", "a field of one is never a board");
  ok(rows.length >= 4 && W._pdxSeatIssueBoard([A, B], { max: 20 }).length > 400,
    "…while two formal files, and no ledger between them, now clear it");

  // The heading has to be true of what is under it.
  has(html, "What their records did", "a record-only board says that is what it is");
  lacks(html, "Where they stand",
    "…and does not file a record under the stated lane's heading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every record tile is marked as the record, on its own face");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = W._pdxSeatIssueBoard([A, B], { max: 20 });
  const recCells = rowsOf(html).flatMap(cellsOf).filter((c) => /pdx-sib-cell is-rec/.test(c));
  must(recCells.length >= 5, `expected 5+ record tiles on the board, found ${recCells.length}`);
  ok(true, `${recCells.length} record tiles to check`);

  let marked = 0, framed = 0, disclosed = 0, stanceVerbed = 0, missingAria = 0;
  for (const c of recCells) {
    const title = attr(c, "title");
    if (/🏛/.test(c)) marked++;
    if (title.indexOf("Record on this issue") >= 0) framed++;
    if (title.indexOf("no stated position on file") >= 0) disclosed++;
    if (/— (Supports|Opposes|Mixed record on) /.test(title)) stanceVerbed++;
    if (!attr(c, "aria-label")) missingAria++;
  }
  eq(marked, recCells.length, "every record tile carries the 🏛 lane mark");
  eq(framed, recCells.length,
    "every record tile's tooltip leads with the engine's frame, \"Record on this issue\"");
  eq(disclosed, recCells.length,
    "every record tile says out loud that there is no stated position behind it");
  eq(stanceVerbed, 0,
    "no record tile borrows the stated lane's verb form (\"— Supports X\")");
  eq(missingAria, 0, "every record tile is announced as one labelled thing");

  // The legend has to explain the second kind of tile it just showed.
  has(html, "outlined = formal record, no stated position",
    "the legend decodes the outlined tile");
  has(html, "· Nothing on file yet",
    "…and the empty state now means empty in BOTH lanes, and says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the board never reads a direction the engine refused to read");
// ═════════════════════════════════════════════════════════════════════════════
{
  // K_THIN is a single vote. The pattern engine's plain-language layer files a
  // one-vote lean as "Too early to say" and declines to characterise it, and
  // this surface does not get a second opinion about that.
  const thin = FMAP_A[K_THIN];
  must(!!thin, `the single-vote issue ${K_THIN} is not in the formal index at all`);
  eq(thin.cls, "is-onfile", "a record the engine would not characterise gets no direction class");
  eq(thin.lane, false, "…and the 🏛 mark IS its glyph, so it is not stamped twice");
  eq(thin.ico, "🏛", "…which is what the tile shows");
  has(thin.counts, "on file", "…beside the depth it was refused from");
  lacks(thin.dir, "Supports", "…and the word is the engine's refusal, not a lean");

  // And the characterising case is the engine's word, verbatim — not one this
  // surface chose from the tone.
  const strong = FMAP_A[K_UNI_A];
  must(!!strong && !!strong.dir, `${K_UNI_A} is missing from the formal index`);
  const SAYS = W._PDX_RD_SAYS;
  must(!!SAYS, "the engine's plain-language vocabulary is not exported");
  const words = Object.keys(SAYS).map((k) => SAYS[k].label);
  ok(words.indexOf(strong.dir) >= 0,
    `the tile's direction word "${strong.dir}" is one of the engine's own seven`);
  for (const k of Object.keys(FMAP_A)) {
    ok(words.indexOf(FMAP_A[k].dir) >= 0,
      `${k}: "${FMAP_A[k].dir}" comes from the engine's vocabulary`);
  }
  // The issue's NAME and the direction word are two different facts and must
  // never be the same string — the bug that printed four rows called "Supports".
  for (const k of Object.keys(FMAP_A)) {
    ok(FMAP_A[k].issueLabel && FMAP_A[k].issueLabel !== FMAP_A[k].dir,
      `${k}: the row heading is the issue, not the direction word`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the two lanes are counted apart, always");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = W._pdxSeatIssueBoard([A, B], { max: 20 });
  const rows = rowsOf(html);
  // K_SPLIT: A's record advanced it 8 times, B's cut against it 8 times. That
  // is a real, showable divergence — inside one lane — and it is flagged in the
  // record's own words, never as the stated lane's "⚡ split".
  const splitRow = rows.find((r) => /is-reccontested/.test(r));
  ok(!!splitRow, "two records running opposite ways is visible as a divergence");
  if (splitRow) {
    has(splitRow, "🏛 records differ", "…worded in the record's own lane");
    lacks(splitRow, "⚡ split", "…and never as the stated lane's disagreement flag");
    has(splitRow, "the record, not a stated disagreement",
      "…with the disclosure attached");
  }
  const totalSplitFlags = (html.match(/⚡ split/g) || []).length;
  eq(totalSplitFlags, 0,
    "no stated-lane split flag can fire on a board with no stated positions");

  // A stated position on one side and a record on the other is a said-vs-did
  // question for a profile, not a disagreement between two candidates. The
  // board must not stage it as one.
  const M = seeded();
  const utah = ["curtis", "lee"].filter((p) => M.CMP_DATA[p]);
  must(utah.length === 2, "the two-stance-ledger fixture pair is gone");
  const [U1, U2] = utah;
  const map1 = M._polPositionMap(U1, M.CMP_DATA[U1]) || {};
  const map2 = M._polPositionMap(U2, M.CMP_DATA[U2]) || {};
  const oneSided = Object.keys(map1).filter((k) => !map2[k] &&
    String(map1[k].stance).toLowerCase() === "support");
  must(oneSided.length > 0,
    "no issue where exactly one of the pair has a stated support — the blend case is untestable");
  const XK = oneSided[0];
  M.PDXVotingRecord.noteMember(U2, many(8, XK, "nay"));
  const store2 = { [U1]: [], [U2]: many(8, XK, "nay") };
  M.PDXVotingRecord.memberRecords = (pid) => store2[pid] || null;
  const mixHtml = M._pdxSeatIssueBoard([U1, U2], { max: 90 });
  const mixRows = rowsOf(mixHtml);
  const target = mixRows.find((r) => cellsOf(r).some((c) => /data-vrdot="[^"|]*\|/.test(c) &&
    attr(c, "title").indexOf(String(map1[XK].text || "").slice(0, 24)) >= 0));
  ok(!!target, `the one-stance issue ${XK} has a row on the board`);
  if (target) {
    lacks(target, "⚡ split",
      "a stated support opposite a recorded oppose is NOT staged as the field disagreeing");
    lacks(target, "is-contested",
      "…and the row carries no stated-lane contest class");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the compare overlay opens its issue section on records alone");
// ═════════════════════════════════════════════════════════════════════════════
const CT = seeded({ compare: true });
must(CT.__err.length === 0, `compare-table did not load: ${CT.__err.join(" | ")}`);
must(CT._cmpSelected && typeof CT._cmpSelected.add === "function",
  "compare-table's selection set is not reachable");
CT._cmpSelected.add(A); CT._cmpSelected.add(B);
CT.openCompare();
const TBODY = String((CT.__byId["cmp-tbody"] || {}).innerHTML || "");
must(TBODY.length > 2000, `the compare table rendered ${TBODY.length} chars — it did not build`);
{
  has(TBODY, "What Their Records Did — Issue by Issue",
    "the issue section renders with no sourced position anywhere in the lineup");
  lacks(TBODY, "Where They Stand — Issue by Issue",
    "…under a heading that does not claim these are their positions");
  has(TBODY, "None of these picks has a sourced position we can quote yet",
    "the lead-in names which of the two facts this is");
  has(TBODY, "that is the record, not a stated position",
    "…and states the lane rule before the first cell");
  has(TBODY, "🏛 Record only", "a record-only row is badged as one");

  const recRows = (TBODY.match(/data-agreement="record"/g) || []).length;
  ok(recRows >= 4, `${recRows} issue rows exist that only the formal lane put there`);

  // The cell leads with the record and demotes the missing quote, and it is the
  // shared slot's own markup — the same one the hydration pass renders — so a
  // warm fetch upgrades the cell instead of contradicting it.
  const leads = (TBODY.match(/cmp-issue-reclead/g) || []).length;
  ok(leads >= 4, `${leads} cells lead with what the record did`);
  const at = TBODY.indexOf("cmp-issue-reclead");
  must(at > 0, "a record-leading cell could not be read back out of the table");
  const cellEnd = TBODY.indexOf("</div>", TBODY.indexOf("cmp-issue-none-note", at));
  const cell = TBODY.slice(at, cellEnd);
  has(cell, 'class="pdx-rdir', "the record cell is the shared slot's own markup");
  has(cell, "No stated position on file — this is the record",
    "…with the missing quote demoted to the quiet second line");
  ok(cell.toLowerCase().indexOf("no clear position") < 0,
    "the grey \"No Clear Position\" pill is dropped where a record answers the cell");
  ok(cell.indexOf('class="pdx-rdir') < cell.indexOf("No stated position on file"),
    "…and the record is what the cell opens with, not the footnote");

  // …and the honest blank is still honest where there is genuinely nothing.
  has(TBODY, "Not documented yet",
    "a cell with no record in either lane still reads as the documented gap");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing the record lane added is counted as agreement");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A record-only row is not "1 documented", it is not agree, and it is not
  // differ — the three words the overlay uses for the stated lane's arithmetic.
  const recRowBlocks = TBODY.match(/<tr [^>]*data-agreement="record"[^>]*>[\s\S]*?<\/tr>/g) || [];
  must(recRowBlocks.length > 0, "no record-only row to check the tallies against");
  let leaked = 0;
  for (const r of recRowBlocks) {
    if (/cmp-issue-agree-row|cmp-issue-differ-row/.test(r)) leaked++;
    if (/is-agree|is-differ|is-partial|is-solo/.test(r)) leaked++;
  }
  eq(leaked, 0, "no record-only row wears an agreement class or badge");
  const INSIGHT = String((CT.__byId["cmp-insights"] || {}).innerHTML || "");
  must(INSIGHT.length > 100, "the Common Ground card did not render");
  lacks(INSIGHT, "Agree on", "the Common Ground read claims no common ground it did not find");
  has(INSIGHT, "Records on file, no sourced positions",
    "…and says what it did find instead of \"still being documented\"");
  lacks(INSIGHT, "still being documented",
    "…so the lineup is never described as undocumented while its files are on screen");
  has(INSIGHT, "compared as 🏛 what the record did",
    "…naming the lane the rows below are actually in");

  // A MIXED LINEUP IS THE HARDER CASE. Two people with real ledgers, plus a
  // formal file on issues neither of them ever spoke about: the stated
  // comparison is the answer to the question the reader asked, and the record
  // rows are extra context. Extra context sorts last. Interleaving them would
  // push a row nobody has a position on above a row where they genuinely
  // disagree.
  const MX = boot({ compare: true });
  const pair = ["curtis", "lee"].filter((x) => MX.CMP_DATA[x]);
  must(pair.length === 2, "the two-ledger fixture pair is gone");
  const mapsOf = (w, pid) => Object.keys(w._polPositionMap(pid, w.CMP_DATA[pid]) || {});
  const spoken = new Set([...mapsOf(MX, pair[0]), ...mapsOf(MX, pair[1])]);
  const quiet = Object.keys(MX.ISSUE_MAP || {})
    .filter((k) => !/_balance$/.test(k) && !spoken.has(k)).slice(0, 3);
  must(quiet.length === 3,
    `the mixed fixture needs 3 issues neither of the pair has stated, has ${quiet.length}`);
  const qv = quiet.flatMap((k) => many(8, k, "yea"));
  MX.PDXVotingRecord.noteMember(pair[0], qv);
  MX.PDXVotingRecord.memberRecords = (pid) => (pid === pair[0] ? qv : []);
  MX._cmpSelected.add(pair[0]); MX._cmpSelected.add(pair[1]);
  MX.openCompare();
  const MTB = String((MX.__byId["cmp-tbody"] || {}).innerHTML || "");
  must(MTB.length > 2000, "the mixed compare table did not build");
  const seqAg = (MTB.match(/data-agreement="[a-z]+"/g) || []).map((x) => x.slice(16, -1));
  must(seqAg.indexOf("record") >= 0, "the mixed lineup produced no record-only row");
  must(seqAg.some((x) => x !== "record"), "the mixed lineup produced no stated row");
  const lastStated = seqAg.map((x, i) => (x === "record" ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
  const firstRec = seqAg.indexOf("record");
  ok(firstRec > lastStated,
    "every record-only row sorts below every row the stated lane could answer");
  has(MTB, "Where They Stand — Issue by Issue",
    "…and a lineup that DOES have positions keeps the stated heading");
  has(MTB, "🏛 Record only", "…with the record rows still badged as their own lane");

  // The meter's legend separates the two, so "one side only" never silently
  // absorbs a row that has no sides at all.
  if (TBODY.indexOf("cmp-issue-meter-legend") >= 0) {
    lacks(TBODY.slice(TBODY.indexOf("cmp-issue-meter-legend")).slice(0, 600),
      "one side only",
      "with no stated position anywhere there is no \"one side only\" count to print");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the race sheet lets the lane that has something to say lead");
// ═════════════════════════════════════════════════════════════════════════════
{
  const RS = boot({ sheet: true });
  must(typeof RS.pdxOpenRaceSheet === "function", "the race sheet is not exposed");
  const field = RS.PDXRaceSheet._field("senate");
  must(field.length >= 2, "the fixture seat no longer has a field of 2+");
  const [P, Q] = field.map((c) => c.pid);
  const rkeys = Object.keys(RS.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k)).slice(0, 5);
  const sv = [];
  rkeys.forEach((k, i) => { for (let j = 0; j < (i + 2) * 2; j++) sv.push(vote(k, "yea")); });
  RS.PDXVotingRecord.noteMember(P, sv);
  RS.PDXVotingRecord.noteMember(Q, sv.slice(0, 6).map((v) => JSON.parse(JSON.stringify(v))));
  const mapP = RS._polPositionMap(P, RS.CMP_DATA[P]) || {};
  const mapQ = RS._polPositionMap(Q, RS.CMP_DATA[Q]) || {};
  const silentKeys = rkeys.filter((k) => !mapP[k] && !mapQ[k]);
  must(silentKeys.length >= 2,
    `the race fixture needs 2+ issues neither candidate has stated, has ${silentKeys.length}`);
  silentKeys.slice(0, 3).forEach((k) => RS.alignToggleIssue(k));
  RS.pdxRaceSheetMode("stated");
  RS.pdxOpenRaceSheet("senate");
  const sheet = String((RS.document.getElementById("pdx-racesheet-overlay") || {}).innerHTML || "");
  must(sheet.length > 800, "the race sheet painted nothing");
  eq(RS.pdxRaceSheetMatchMode(), "stated", "the reader is on the stated ruler");

  const alt = (sheet.match(/data-rs-alt="record"/g) || []).length;
  ok(alt >= 2, `${alt} stated-lane cells hand the slot to the record that does speak`);
  must(alt >= 2, "no promoted cell to read — the rest of this section is untestable");

  const cellRe = /<div class="rs-cell" data-rs-v="([^"]*)" data-rs-alt="([^"]*)">([\s\S]*?)<\/div><\/div>/g;
  let n = 0, tinted = 0, unmarked = 0, silenceLed = 0;
  let mm;
  while ((mm = cellRe.exec(sheet)) !== null) {
    n++;
    if (mm[1] !== "none") tinted++;
    const lead = /<span class="rs-cell-lead">([\s\S]*?)<\/span><span class="rs-cell-other">/.exec(mm[3]);
    const leadHtml = lead ? lead[1] : mm[3];
    if (mm[2] === "record" && leadHtml.indexOf("Record pattern:") < 0) unmarked++;
    if (leadHtml.indexOf("rs-cell-none") >= 0) silenceLed++;
  }
  ok(n >= 2, `${n} promoted cells parsed`);
  eq(tinted, 0,
    "a promoted cell carries no verdict tint — the tint belongs to the ACTIVE lane's read");
  eq(unmarked, 0,
    "every promoted record chip still says \"Record pattern:\" on its face");
  eq(silenceLed, 0,
    "the silence never leads a cell that has a signal behind it");
  has(sheet, "No documented position",
    "…and the missing quote is still stated, just no longer first");

  // The one thing that must NOT have moved: what the sheet ranks on.
  const part = RS.PDXRaceSheet._rank(RS.PDXRaceSheet._field("senate"), "stated", true);
  must(part && Array.isArray(part.ranked) && Array.isArray(part.gap),
    "the sheet's ranker no longer returns a ranked/gap partition");
  eq(part.ranked.length + part.gap.length, field.length,
    "no candidate falls out of the field when the ruler is one they never spoke on");
  eq(part.unranked, false, "…and with picks set the sheet is in ranking mode, not Overview");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · display only — no lane, count or score moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The formal map is a projection. It must not write anything back: a position
  // map read after the board has rendered is byte-identical to one read before.
  const Z = seeded();
  const before = JSON.stringify(Z._polPositionMap(A, Z.CMP_DATA[A]) || {});
  Z._pdxSeatIssueBoard([A, B], { max: 20 });
  const after = JSON.stringify(Z._polPositionMap(A, Z.CMP_DATA[A]) || {});
  eq(after, before, "rendering the board wrote nothing into anybody's position map");
  eq(JSON.stringify(Z.ISSUE_STANCE_DATA) === JSON.stringify(seeded().ISSUE_STANCE_DATA), true,
    "…and nothing into the stance ledger");

  // No figure anywhere on a record-only board. Not a percentage, not a rank.
  const html = Z._pdxSeatIssueBoard([A, B], { max: 20 });
  const pct = html.match(/\d+(\.\d+)?%/g) || [];
  eq(pct.length, 0, "a record-only board publishes no percentage");
  lacks(html, "Direction Match",
    "…and does not name the said-vs-did metric it has nothing to compute");
  lacks(html, "score", "…or call any of this a score");

  // The formal map is reproducible: same file in, same answer out, no ordering
  // or memo effect between reads.
  eq(JSON.stringify(Z._pdxSeatFormalMap(A)), JSON.stringify(seeded()._pdxSeatFormalMap(A)),
    "the formal map is a pure read of the file");
}

// ══════════════════════════════════════════════════════════════════════════════
section("9 · the promoted cell drops the verdict, in the source");
// ══════════════════════════════════════════════════════════════════════════════
{
  // Section 7 proves no promoted cell in the fixture carries a tint, but it
  // cannot prove the clearing line is what prevents it: on this fixture the
  // active lane's row is absent, so the verdict is empty before the branch is
  // even reached. The rule still has to hold on the shape where the row exists
  // and only its chip is empty — a shape the fixture cannot manufacture. So the
  // guard is read out of the source instead of rendered, which is what this
  // repo already does where a live path cannot reach a contract.
  const src = R("race-sheet.js")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n").map((l) => l.replace(/(^|[^:'"\\])\/\/.*$/, "$1")).join("\n");
  const at = src.indexOf("function cell(key, sRow, rRow, mode, fRow)");
  must(at > 0, "race-sheet's cell() has been renamed — the promotion guard is unreadable");
  const body = src.slice(at, src.indexOf("\n  }", at));
  const promo = body.indexOf("leadHtml = otherHtml;");
  must(promo > 0, "the promotion branch is gone from cell()");
  const branchEnd = body.indexOf("} else {", promo);
  must(branchEnd > promo, "the promotion branch's shape has changed");
  const branch = body.slice(promo, branchEnd);
  ok(/\bv\s*=\s*''/.test(branch),
    "the promotion branch clears the verdict, so a promoted cell can never be tinted");
  ok(/alt\s*=\s*\(mode === 'record'\)/.test(branch),
    "…and names the lane it promoted, so the tint's absence is styled deliberately");
  ok(!/score|pct|rank|tally/.test(branch),
    "…and touches nothing that is counted");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ pattern-first: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ pattern-first when no stance — ${passed} assertions passed`);
