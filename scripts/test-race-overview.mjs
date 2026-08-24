#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-race-overview.mjs — Compare the field before the reader has said anything
// ─────────────────────────────────────────────────────────────────────────────
// A first-time visitor opens a seat. They have set no positions, so both Your
// Match rulers have nothing to rank with — and the sheet used to answer that by
// painting the entire field under "No formal record on your issues yet" with
// every issue cell blank. That sentence is true about a question nobody asked,
// and it sat exactly where the comparison belongs. This file guards the view
// that replaced it, and the line it must not cross.
//
//   1. OVERVIEW IS THE DEFAULT WHEN THERE IS NOTHING TO RANK, and the two match
//      tabs are still there, still pressable, and honest about what they need.
//   2. NO PERSONAL MATCH WITHOUT POSITIONS. Not a percentage, not a rank number,
//      not a band header that blames the candidate for the reader's empty list.
//   3. RACE CONTEXT IS ALWAYS ON — seat, who holds it, Direction Match with its
//      denominator, and the caveat that it is not a match to the reader.
//   4. THE SNAPSHOT'S RULE IS PUBLIC. It reads the candidates' formal files and
//      nothing about the reader: two visitors who disagree about everything get
//      the same rows in the same order.
//   5. THE AT-A-GLANCE COMPARES FILES, NOT PEOPLE. Similar depth / thin /
//      different depth, and no word that picks a winner.
//   6. EVERY CELL IS A DOOR into the shipped politician × issue dossier.
//   7. THE BLURB IS RULES-BASED — tested counts, Direction Match bands, thin vs
//      read rows. No "better", no party, no blend of the two lanes.
//   8. CARDS ARE NEVER DEAD. Identity, seat, Direction Match, tested N, topic
//      peeks and both actions, with no positions set at all.
//   9. ≥3 POSITIONS RANKS AS IT ALWAYS DID, and Overview stays available and
//      stays truthful.
//  10. NOTHING DRIFTED. Party is still nowhere. The ledger is byte-identical.
//
//   node scripts/test-race-overview.mjs

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
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");
const CSS = R("race-sheet.css");

// Same mini-DOM the sheet's own harness uses: an id registry, innerHTML as a
// plain string, every other DOM call a no-op.
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
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  if (!opts.withoutSheet) vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  win.__sess = sess;
  win.__store = store;
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
  console.error(`✗ race overview: ${msg}`);
  process.exit(1);
};

const SEAT = "senate";
const probe = boot();
must(typeof probe.pdxOpenRaceSheet === "function", "the race sheet is not exposed");
must(typeof probe.PDXRaceSheet.view === "function", "the view resolver is not exposed");
must(typeof probe.PDXRaceSheet._snapshot === "function", "the snapshot model is not exposed");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "the formal pattern index the snapshot reads is not loaded");

const FIELD0 = probe.PDXRaceSheet._field(SEAT);
must(FIELD0.length >= 2, `the fixture seat "${SEAT}" no longer has a field of 2+`);
const [A_PID, B_PID] = FIELD0.map((c) => c.pid);
const NAME = {};
FIELD0.forEach((c) => { NAME[c.pid] = c.name; });

// ── Seeded formal files ──────────────────────────────────────────────────────
// A deep, one-directional file on several issues for candidate A; a shallow file
// on two of them for candidate B. That gives the snapshot every case it has to
// word differently: shared and comparable, shared and lopsided, one-sided, and
// thin for everybody.
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
const KEYS = ISSUE_KEYS.slice(0, 5);
must(KEYS.length === 5, "the taxonomy no longer offers five sideable issues");
const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 750 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
});
const SEED_A = [];
KEYS.forEach((k, i) => { for (let j = 0; j < (i + 1) * 3; j++) SEED_A.push(vote(i * 40 + j, k, "yea")); });
const SEED_B = [];
KEYS.slice(0, 2).forEach((k, i) => { for (let j = 0; j < 2; j++) SEED_B.push(vote(500 + i * 10 + j, k, "nay")); });
const clone = (a) => a.map((v) => JSON.parse(JSON.stringify(v)));

function seeded(opts) {
  const win = boot(opts);
  win.PDXVotingRecord.noteMember(A_PID, clone(SEED_A));
  win.PDXVotingRecord.noteMember(B_PID, clone(SEED_B));
  return win;
}
function withPicks(win, keys) {
  (keys || KEYS.slice(0, 3)).forEach((k) => win.alignToggleIssue(k));
  return win;
}
const sheetHtml = (win, seat) => {
  win.pdxOpenRaceSheet(seat || SEAT);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};
const cardOrder = (html) =>
  (html.match(/data-align-pid="([^"]+)"/g) || []).map((m) => m.slice(16, -1));

const COLD = seeded();                       // votes on file, ZERO positions set
const OVHTML = sheetHtml(COLD);
must(OVHTML.length > 800, "the unset sheet painted nothing at all");
const WARM = withPicks(seeded());            // the same field, three positions set
const RECHTML = sheetHtml(WARM);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Overview is what a reader with no positions gets");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(COLD.PDXRaceSheet._axis().length, 0, "the fixture reader genuinely has no positions");
  eq(COLD.PDXRaceSheet.view(), "overview", "the sheet opens on Overview");
  has(OVHTML, 'class="rs-vtab is-on"', "…and the Overview tab is the selected one");
  has(OVHTML, "Overview · public record", "the tab is named for what it shows");
  // The two rulers are still offered — pressing one is how a reader finds out
  // what it needs — and they say what they are waiting for.
  has(OVHTML, "Your Match · record", "the record ruler is still on the tablist");
  has(OVHTML, "Your Match · stated", "…and so is the stated ruler");
  eq((OVHTML.match(/class="rs-mode[ "]/g) || []).length, 2,
    "exactly two controls can order this field, and Overview is not one of them");
  has(OVHTML, "rs-mode is-gated", "a ruler that cannot rank yet is marked as gated");
  // The tab a gated ruler lands on is Overview, not the wall it used to paint.
  const tapped = seeded();
  tapped.pdxRaceSheetMode("record");
  eq(tapped.PDXRaceSheet.view(), "overview",
    "pressing a match tab with no positions lands on Overview rather than an empty ranking");
  eq(tapped.pdxRaceSheetMatchMode(), "record",
    "…and the ruler underneath is untouched by that refusal");
  // Choosing Overview must not silently re-point the ruler a share would name.
  const chose = withPicks(seeded());
  chose.pdxRaceSheetMode("stated");
  chose.pdxRaceSheetMode("overview");
  eq(chose.PDXRaceSheet.view(), "overview", "Overview can be chosen outright");
  eq(chose.pdxRaceSheetMatchMode(), "stated",
    "…and picking a non-ruler leaves the active ruler exactly where it was");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no personal match without positions");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The whole point. Not one figure on this view may be readable as agreement
  // between the reader and a candidate.
  lacks(OVHTML, 'class="rs-score"', "no match percentage is painted for anyone");
  lacks(OVHTML, '<span class="rs-rank">1</span>', "nobody is numbered first");
  lacks(OVHTML, 'class="rs-gapword"', "the per-candidate gap word is not the card's message");
  // The old primary empty state, gone as a HEADLINE — it is still the right
  // sentence in the band under a ranked field, which section 9 checks.
  lacks(OVHTML, "No formal record on your issues yet",
    "the unset state no longer blames the candidate's file for the reader's empty stance list");
  has(OVHTML, "Set your positions to score how their formal record lines up with you.",
    "the ask is scoped to the reader");
  has(OVHTML, "Until then, Overview is Direction Match + shared issues — not agreement with you.",
    "…and says what they get in the meantime");
  has(OVHTML, "Nothing is ranking this field yet — it is in a fixed order: officeholder first, then alphabetical.",
    "the existing no-ranking admission is kept word for word");
  has(OVHTML, "Set my positions", "the CTA into positions is still the way forward");
  // Every percentage on the unset view is Direction Match, which is about the
  // candidate alone. Prove it by counting.
  const pcts = OVHTML.match(/>(\d{1,3})%</g) || [];
  const dmPcts = (OVHTML.match(/class="rs-ctx-pct">\d{1,3}%/g) || []).length +
                 (OVHTML.match(/class="rs-ovdm-p">\d{1,3}%/g) || []).length +
                 (OVHTML.match(/class="rs-dm-pct">\d{1,3}%/g) || []).length;
  ok(pcts.length === dmPcts,
    `every percentage on the unset view is a Direction Match figure (${pcts.length} printed, ${dmPcts} accounted for)`);
  // And the word "match" only ever appears attached to the two things that are
  // honestly named — never as a bare claim about the reader.
  ok(!/your match is|matches you|match with you|% match/i.test(OVHTML),
    "no phrasing on the unset view claims a match with the reader");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the race context strip, on every tab");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [html, where] of [[OVHTML, "Overview"], [RECHTML, "the ranked record tab"]]) {
    has(html, 'class="rs-ctx"', `${where}: the context strip is painted`);
    has(html, "U.S. Senate", `${where}: the office is named`);
    has(html, "candidates on file", `${where}: the size of the field is stated`);
    has(html, "Holds this seat now", `${where}: incumbency is shown as data, not inferred`);
    has(html, "Direction Match is the <b>formal lane only</b>",
      `${where}: the caveat names the lane`);
    has(html, "It is not a personal match to you, and it orders nothing on this sheet.",
      `${where}: …and refuses the reading the figure invites`);
    ok((html.match(/class="rs-ctx-chip"/g) || []).length >= 2,
      `${where}: every candidate gets a Direction Match chip, not just the leader`);
    ok(/rs-ctx-n">(\d+ tested|nothing tested yet)</.test(html),
      `${where}: the tested denominator rides with the figure`);
  }
  // The strip reads the shipped ledger slot, so a figure that never cleared the
  // publishable floor cannot appear here as one.
  const facts = COLD.PDXRaceSheet._dm(COLD.PDXRaceSheet._field(SEAT)[0]);
  ok(facts.pct === null || typeof facts.pct === "number", "the chip reads a real slot");
  ok(!(facts.pct === null && facts.tested > 0),
    "no branch returns a denominator without the figure it belongs to");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the snapshot's rule is public, and it is the same for everyone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const snap = COLD.PDXRaceSheet._snapshot(COLD.PDXRaceSheet._field(SEAT));
  ok(snap.rows.length >= 3, `the snapshot found shared issues to lay out (${snap.rows.length})`);
  ok(snap.rows.length <= COLD.PDXRaceSheet.SNAP_CAP,
    `…and never more than the cap of ${COLD.PDXRaceSheet.SNAP_CAP}`);
  // THE PROPERTY THAT MATTERS: the reader's own politics cannot move this table.
  const left = withPicks(seeded(), [KEYS[0], KEYS[1], KEYS[2]]);
  const right = withPicks(seeded(), [KEYS[3], KEYS[4]]);
  const shape = (w) => JSON.stringify(w.PDXRaceSheet._snapshot(w.PDXRaceSheet._field(SEAT))
    .rows.map((r) => [r.key, r.glance.token, r.cells.map((c) => [c.pid, c.judged, c.read])]));
  eq(shape(left), shape(COLD), "a reader with positions sees the same rows as one without");
  eq(shape(right), shape(left), "…and two readers with different positions see the same rows");
  // Deterministic between runs, and in the site's own topic order.
  eq(shape(seeded()), shape(COLD), "the same field produces the same table twice");
  const keys = snap.rows.map((r) => r.key);
  const tax = COLD._pdxBigPictureKeys(keys.slice(), { labelFn: (k) => (COLD.ISSUE_MAP[k] || {}).label || k });
  eq(keys.join(","), tax.join(","), "the rows are laid out in the shared taxonomy order");
  // Nothing is coined: every key is a real issue and every label is the site's.
  ok(keys.every((k) => !!COLD.ISSUE_MAP[k]), "every row is a key from the shared taxonomy");
  snap.rows.forEach((r) => {
    ok(r.label === (COLD.ISSUE_MAP[r.key] || {}).label, `${r.key}: the row prints the site's own label`);
  });
  // Coverage-first selection: an issue the whole field holds a file on outranks
  // one only a single candidate has, whatever the reader thinks of either.
  const covered = snap.rows.filter((r) => r.cells.every((c) => c.onFile)).length;
  const lopsided = snap.rows.filter((r) => r.cells.some((c) => !c.onFile)).length;
  ok(covered + lopsided === snap.rows.length, "every row is one or the other");
  has(OVHTML, "Picked by a public rule, not from your positions",
    "the rule is stated on the surface, not just in the code");
  has(SHEET, "THE RULE THAT PICKS THESE ISSUES IS PUBLIC, AND IT IS THIS ONE.",
    "…and written out in full where the rule lives");
  // The snapshot reads the shipped index rather than counting for itself.
  has(SHEET, "formalPatternIndex", "the snapshot reads the shipped formal-pattern index");
  has(SHEET, "recordPattern.display", "…and the shipped record display slot for each cell");
  ok(!/_RD_MIN|MIN_JUDGED|>=\s*3\s*\)\s*\?\s*'deep'/.test(SHEET),
    "the sheet redefines none of the record engine's depth floors");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the at-a-glance compares files, and names no winner");
// ═════════════════════════════════════════════════════════════════════════════
{
  const g = COLD.PDXRaceSheet._glance;
  const cell = (read, judged) => ({ read: read, judged: judged });
  eq(g([cell(false, 0), cell(false, 1)]).word, "Both thin",
    "two files the engine cannot read are both thin");
  eq(g([cell(false, 0), cell(false, 1), cell(false, 2)]).word, "All thin",
    "…and three of them are all thin");
  eq(g([cell(true, 6), cell(false, 1)]).word, "Different depth",
    "one readable pattern against one the engine declined is different depth");
  eq(g([cell(true, 6), cell(true, 5)]).word, "Similar depth",
    "two readable patterns of comparable size are similar depth");
  eq(g([cell(true, 20), cell(true, 3)]).word, "Different depth",
    "…and one file several times the other's size is not");
  eq(g([cell(true, 6), cell(true, 3)]).word, "Similar depth", "the boundary case sits inside");
  eq(g([cell(true, 7), cell(true, 3)]).word, "Different depth", "…and one item past it does not");
  // Thin is not a tie, and depth is not a verdict.
  const words = [g([cell(false, 0), cell(false, 0)]), g([cell(true, 6), cell(true, 5)]),
                 g([cell(true, 20), cell(true, 3)])];
  words.forEach((w) => {
    ok(!/better|worse|wins|stronger candidate|ahead|leads/i.test(w.word + " " + w.why),
      `the "${w.word}" reading picks no winner`);
  });
  has(SHEET, "one item is not a pattern, and thin is not a tie",
    "the thin reading says on the surface that an empty file is not an agreement");
  has(SHEET, "It says how much evidence there is, not who is right",
    "…and the similar reading refuses the verdict reading too");
  // Whichever readings this field actually produced, their reasons are printed.
  const shown = COLD.PDXRaceSheet._snapshot(COLD.PDXRaceSheet._field(SEAT))
    .rows.map((r) => r.glance.why);
  [...new Set(shown)].forEach((why) => {
    has(OVHTML, why.slice(0, 60), "the reader can see why a row was read that way");
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every cell with a file behind it is a door into the dossier");
// ═════════════════════════════════════════════════════════════════════════════
{
  const doors = OVHTML.match(/data-pdxc-gap="([^"]+)" data-pdxc-gap-pid="([^"]+)"/g) || [];
  ok(doors.length >= 4, `the snapshot and the cards open real dossiers (${doors.length} doors)`);
  // Every door names a real politician and a real issue, and the two agree with
  // the row they were painted on.
  const snap = COLD.PDXRaceSheet._snapshot(COLD.PDXRaceSheet._field(SEAT));
  const wanted = {};
  snap.rows.forEach((r) => r.cells.forEach((c) => { if (c.onFile) wanted[c.pid + "|" + c.key] = 1; }));
  const seen = {};
  doors.forEach((d) => {
    const m = d.match(/gap="([^"]+)" data-pdxc-gap-pid="([^"]+)"/);
    seen[m[2] + "|" + m[1]] = 1;
    ok(!!COLD.ISSUE_MAP[m[1]], `door names a real issue (${m[1]})`);
    ok(!!COLD.CMP_DATA[m[2]], `…and a real politician (${m[2]})`);
    ok(!!wanted[m[2] + "|" + m[1]], `…and matches a cell that actually has a file (${m[2]} × ${m[1]})`);
  });
  ok(Object.keys(seen).length >= 3, "more than one person × issue pair is reachable");
  // A cell with nothing behind it is not a door pretending to be one.
  const empties = OVHTML.match(/class="rs-snap-cell is-empty"/g) || [];
  if (empties.length) {
    ok(!/is-empty"[^>]*data-pdxc-gap/.test(OVHTML), "an empty cell offers no door");
    has(OVHTML, "Nothing is inferred from what they have said.",
      "…and says the gap is not filled from the public lane");
  } else { passed += 2; }
  // The contract is the shipped one, not a private opener.
  has(R("consistency.js"), "[data-pdxc-gap]", "the dossier's own delegated handler owns the attribute");
  ok(!/pdxOpenGap|openGap\s*\(/.test(SHEET), "the sheet does not reach past it into a private opener");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the head-to-head blurb is rules-based, and only formal");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(OVHTML, 'class="rs-h2h"', "the blurb is painted");
  has(OVHTML, "How this field compares, on the record alone", "…and scoped in its heading");
  has(OVHTML, "<b>Tested formal items:</b>", "it reports the tested inventories");
  has(OVHTML, "A bigger file is more evidence, not a better candidate.",
    "…and refuses the reading that a bigger file is a better person");
  has(OVHTML, "<b>Direction Match:</b>", "it reports the Direction Match band");
  has(OVHTML, "the reader is not in it", "…and says whose question that is");
  has(OVHTML, "<b>Issues in common:</b>", "it counts the snapshot rows");
  ok(/\d+ of \d+ shared issues? read a formal direction/.test(OVHTML) ||
     /No issue in this field has a formal file behind it yet/.test(OVHTML),
    "…as read-vs-thin, from the same table the reader is looking at");
  has(OVHTML, "None of the above is agreement with you.", "the blurb disclaims itself");
  has(OVHTML, "Set your positions for your own record match →", "…and hands over the CTA");
  // The blurb may say "not a better candidate"; it may never say one IS.
  const claims = OVHTML.replace(/\bnot (a|the) [a-z-]+( [a-z-]+)?/gi, "not·");
  ok(!/better candidate|the stronger|out-?performs|beats\b|more trustworthy|clear favou?rite/i.test(claims),
    "no sentence in the view declares a winner, disclaimers aside");
  has(OVHTML, "not a better candidate", "…and the one place it comes up is a refusal");
  // The counts in the sentence are the counts in the table.
  const snap = COLD.PDXRaceSheet._snapshot(COLD.PDXRaceSheet._field(SEAT));
  const thin = snap.rows.filter((r) => r.glance.token === "thin").length;
  const m = OVHTML.match(/(\d+) of (\d+) shared issues? read a formal direction/);
  if (m) {
    eq(Number(m[2]), snap.rows.length, "the blurb's denominator is the table's row count");
    eq(Number(m[1]), snap.rows.length - thin, "…and its numerator is the rows that read a direction");
  } else { passed += 2; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the cards are never dead");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cards = OVHTML.match(/class="rs-ovcard"/g) || [];
  eq(cards.length, FIELD0.length, "every candidate on file gets a card");
  FIELD0.forEach((c) => {
    has(OVHTML, `data-align-pid="${c.pid}"`, `${c.name}: the card is addressable`);
    has(OVHTML, `window.showProfile('${c.pid}')`, `${c.name}: the profile is one tap away`);
    has(OVHTML, `window.pdxRaceSheetPick('${SEAT}','${c.pid}')`, `${c.name}: so is the team control`);
  });
  has(OVHTML, 'class="rs-ovseat"', "each card carries its seat chip");
  has(OVHTML, 'class="rs-ovdm"', "…and its Direction Match slot");
  ok(/rs-ovdm-n">(\d+ tested items?|nothing tested yet)</.test(OVHTML),
    "…with the tested count beside it");
  const peeks = OVHTML.match(/class="rs-peek"/g) || [];
  ok(peeks.length >= 2, `the cards carry topic peeks into the dossier (${peeks.length})`);
  ok((OVHTML.match(/class="rs-peek"[\s\S]*?<\/button>/g) || []).length <= FIELD0.length * 3,
    "…capped at three per card");
  has(OVHTML, "➕ Add to my team", "the team action is live with no positions set");
  has(OVHTML, "Open profile ›", "…and so is the profile action");
  // A candidate with no formal file at all still gets a card that says why.
  const bare = boot();
  const bareHtml = sheetHtml(bare);
  has(bareHtml, 'class="rs-ovcard"', "a cold field still paints cards");
  ok(/rs-peek-none|rs-peek/.test(bareHtml), "…each with either peeks or the reason there are none");
  lacks(bareHtml, "No formal record on your issues yet",
    "…and never the reader-blaming empty state as the card's message");
  // Stable order, run to run: officeholder first, then alphabetical.
  eq(cardOrder(OVHTML).join(","), cardOrder(sheetHtml(seeded())).join(","),
    "the unranked card order is stable between visits");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · with positions set, the ranking is exactly what it was");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(WARM.PDXRaceSheet._axis().length, 3, "the fixture reader set three positions");
  eq(WARM.PDXRaceSheet.view(), "record", "…so the sheet opens on the record ruler, as it always did");
  has(RECHTML, "Ranked by their <b>formal record</b> on the issues you set",
    "the ranked sheet still says what ordered it");
  has(RECHTML, 'class="rs-score"', "…and still paints the match figure");
  has(RECHTML, '<span class="rs-rank">1</span>', "…and still numbers the field");
  const ranked = WARM.PDXRaceSheet._rank(WARM.PDXRaceSheet._field(SEAT), "record", true);
  ok(ranked.ranked.length >= 1, "the record lane still scores the field");
  // Overview stays reachable and stays honest at three positions.
  WARM.pdxRaceSheetMode("overview");
  const ovWarm = sheetHtml(WARM);
  has(ovWarm, 'class="rs-vtab is-on"', "Overview is still available once positions are set");
  lacks(ovWarm, 'class="rs-score"', "…and still prints no personal match figure");
  lacks(ovWarm, "Set your positions to score how their formal record lines up with you.",
    "…and drops the ask it no longer needs to make");
  has(ovWarm, "Overview is never ranked — it is in a fixed order",
    "…while still saying it is not a ranking");
  has(ovWarm, 'class="rs-ctx"', "Direction Match stays as secondary context");
  // The band copy the unset state no longer uses is still correct where it is.
  const cold3 = withPicks(boot());
  const bandHtml = sheetHtml(cold3);
  has(bandHtml, "No formal record on your issues yet",
    "a reader who HAS positions still gets the honest per-candidate band");
  has(bandHtml, "they are not scored from their words instead",
    "…with the substitution still ruled out");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · no party, no blend, no drift");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(OVHTML, "Party is not read, printed or ranked anywhere on this sheet",
    "the footer promise survives on the new view");
  has(OVHTML, "Only the <b>formal</b> lane", "…and so does the lane wall");
  ok(!/\bRepublican\b|\bDemocrat\b|\bGOP\b|\bparty-line\b|with their party/i
      .test(OVHTML.replace(/Party is not read[^<]*/g, "")),
    "no party framing anywhere on the Overview");
  // The Overview adds no arithmetic of its own.
  const codeOnly = SHEET.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/(score|pct|overall)\s*[+\-*/]\s*(score|pct|overall|alt|dm)/i.test(codeOnly),
    "nothing on this view combines two of the three rulers");
  ok(!/publicTally|stated.*\+.*formal/i.test(codeOnly), "…and the two lanes are never added");
  // Byte-identical ledger and Word-vs-Action with the new view in the file.
  const withOut = boot({ withoutSheet: true });
  const withIn = boot();
  let same = 0, checked = 0;
  FIELD0.map((c) => c.pid).concat(["schumer", "romney"]).forEach((pid) => {
    if (!withOut.CMP_DATA[pid]) return;
    checked++;
    const slot = (w) => {
      try {
        const st = w._pdxOfficeStatus ? w._pdxOfficeStatus(w.CMP_DATA[pid]) : "office";
        return JSON.stringify(w._pdxLedgerSlot(w.CMP_DATA[pid], { pid, status: st })) +
          JSON.stringify(w.PDXWordAction.read(pid));
      } catch (e) { return "err"; }
    };
    if (slot(withOut) === slot(withIn)) same++;
  });
  ok(checked >= 2, "the drift check covered a real set of profiles");
  eq(same, checked, "every published figure is byte-identical with the Overview loaded");
  // Styles exist for everything the view paints.
  for (const cls of [".rs-vtab", ".rs-gate", ".rs-ctx", ".rs-ctx-chip", ".rs-snap",
                     ".rs-snap-cell", ".rs-snap-glance", ".rs-h2h", ".rs-ovcard",
                     ".rs-ovdm", ".rs-peek", ".rs-ovprof"]) {
    has(CSS, cls, `the Overview is styled (${cls})`);
  }
  for (const sel of [".rs-vtab", ".rs-snap-cell", ".rs-peek", ".rs-ovprof", ".rs-h2h-btn"]) {
    ok(new RegExp("\\" + sel + "[^{]*\\{[^}]*min-height:\\s*44px").test(CSS),
      `${sel} is a 44px touch target`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the line is at zero, not at three");
// ═════════════════════════════════════════════════════════════════════════════
// The sheet asks for three positions and requires one. Those are different
// numbers doing different jobs, and the failure mode this section exists to
// catch is the ask quietly becoming the requirement: a reader who set one
// stance opening on a tab that never mentions it, and concluding the product
// ignored them. So the boundary is walked one position at a time.
{
  const view = (w) => w.PDXRaceSheet.view();
  const at = (n) => {
    const w = n ? withPicks(seeded(), KEYS.slice(0, n)) : seeded();
    return { w, n, html: sheetHtml(w) };
  };
  const RANKED = /<span class="rs-rank">1<\/span>/;

  // ── zero: a different kind of state, not a thinner one ────────────────────
  const s0 = at(0);
  eq(s0.w.PDXRaceSheet._axis().length, 0, "0 positions: the fixture reader really has none");
  eq(view(s0.w), "overview", "0 positions: the sheet opens on Overview");
  ok(!RANKED.test(s0.html), "0 positions: nothing on the page is numbered into an order");
  lacks(s0.html, 'class="rs-score"', "0 positions: no personal match figure anywhere");
  has(s0.html, "Nothing is ranking this field yet", "0 positions: and the sheet says so plainly");
  has(s0.html, "Set my positions →", "0 positions: the ask is the call to action, not a verdict");
  // Asking for a ruler with nothing to rule still refuses — and explains itself
  // in the reader's terms rather than blaming a candidate's file.
  for (const m of ["record", "stated"]) {
    s0.w.pdxRaceSheetMode(m);
    eq(view(s0.w), "overview", `0 positions: choosing ${m} still resolves to Overview`);
    const h = sheetHtml(s0.w);
    ok(!RANKED.test(h), `0 positions: choosing ${m} orders nobody`);
    has(h, "Set my positions →", `0 positions: choosing ${m} says what would change it`);
  }
  s0.w.pdxRaceSheetMode("overview");

  // ── one and two: thin, real, and labelled as thin ─────────────────────────
  for (const n of [1, 2]) {
    const s = at(n);
    eq(s.w.PDXRaceSheet._axis().length, n, `${n} position(s): the fixture set exactly that many`);
    eq(view(s.w), "record", `${n} position(s): the sheet opens on the reader's ruler, not Overview`);
    ok(RANKED.test(s.html), `${n} position(s): the field is actually ordered`);
    has(s.html, 'class="rs-score"', `${n} position(s): and carries a real match figure`);
    has(s.html, "Ranked by their <b>formal record</b> on the issues you set",
      `${n} position(s): the rank line names what ordered it`);
    const ranked = s.w.PDXRaceSheet._rank(s.w.PDXRaceSheet._field(SEAT), "record", true);
    ok(ranked.ranked.length >= 1, `${n} position(s): the record lane scores somebody`);
    ok(!ranked.unranked, `${n} position(s): the lane does not declare itself unranked`);
    // The disclosure that replaces the gate: the size of the axis, in the
    // reader's own terms, above the order it produced.
    has(s.html, `Ranked on the <b>${n} position${n === 1 ? "" : "s"}</b> you’ve set`,
      `${n} position(s): the sheet discloses how thin the ranking is`);
    has(s.html, "not enough to be sure of it", `${n} position(s): …and what that does not buy`);
    has(s.html, "Set my positions →", `${n} position(s): the ask for three still rides along`);
    // Thin is disclosed, never withheld: the words that would mean "we are not
    // showing you this yet" must not appear.
    for (const w of ["not enough positions", "at least 3", "at least three",
                     "Set 3", "Set three", "need 3 ", "need three "]) {
      lacks(s.html, w, `${n} position(s): the sheet imposes a floor in words`);
    }
    // Overview is still one tap away and still is not a ranking.
    s.w.pdxRaceSheetMode("overview");
    const ov = sheetHtml(s.w);
    eq(view(s.w), "overview", `${n} position(s): Overview stays reachable`);
    lacks(ov, 'class="rs-score"', `${n} position(s): Overview still prints no personal figure`);
    has(ov, "Overview is never ranked", `${n} position(s): …and still says it is not one`);
  }

  // ── three: unchanged in spirit, and the note steps aside ──────────────────
  const s3 = at(3);
  eq(view(s3.w), "record", "3 positions: unchanged — the sheet opens on the ruler");
  ok(RANKED.test(s3.html), "3 positions: still ranks");
  lacks(s3.html, "Ranked on the <b>3 positions</b>", "3 positions: the thin note steps aside at the ask");
  lacks(s3.html, "Set my positions →", "3 positions: and so does the ask");

  // ── the boundary is monotone: once it ranks, it keeps ranking ─────────────
  const ranks = [0, 1, 2, 3, 4].map((n) => RANKED.test(at(n).html));
  eq(JSON.stringify(ranks), JSON.stringify([false, true, true, true, true]),
    `ranking should begin at one position and never switch back off — got ${JSON.stringify(ranks)}`);
  const views = [0, 1, 2, 3, 4].map((n) => view(at(n).w));
  eq(JSON.stringify(views), JSON.stringify(["overview", "record", "record", "record", "record"]),
    `the default view should flip once, at the first position — got ${JSON.stringify(views)}`);

  // ── and no floor of three survives in the source ──────────────────────────
  // ASK_ISSUES is a copy constant. If it turns up in a condition that decides
  // whether the field is ordered or which tab opens, the ask has become a gate.
  const code = SHEET.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const uses = code.split("\n").filter((l) => l.includes("ASK_ISSUES"));
  ok(uses.length > 0, "ASK_ISSUES is still the one place the ask is written down");
  for (const line of uses) {
    ok(/ASK_ISSUES\s*=\s*3|ASK_ISSUES: ASK_ISSUES|rs-cta-sub|ctaHtml\(\)|return ''/.test(line),
      `ASK_ISSUES decides something other than the CTA or the thin note: ${line.trim()}`);
    ok(!/readMode\(\)|activeView|view\s*=|'overview'/.test(line),
      `the ask for three is gating which view opens: ${line.trim()}`);
  }
  ok(!/(axis\(\)\.length|rows\.length|axisN|\bn\b)\s*[<>]=?\s*3\b/.test(
      code.replace(/rows\.length < ASK_ISSUES/g, "").replace(/n >= ASK_ISSUES/g, "")),
    "a literal three-position threshold is hard-coded somewhere in the sheet");
  ok(/if \(!v\) v = n \? readMode\(\) : 'overview';/.test(code),
    "the view resolver no longer reads 'one position is enough' at a glance");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ race overview: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ race overview: a real race comparison before the reader says anything — ${passed} assertions passed\n`);
