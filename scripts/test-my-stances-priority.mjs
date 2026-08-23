#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-my-stances-priority.mjs — the star has to be findable, and it has to move
// something
// ─────────────────────────────────────────────────────────────────────────────
// My Stances has always carried a ternary priority (High / Normal / Low) feeding
// one weight, window._msPriorityWeight, which the match engine and the race
// sheet's issue axis both read. It was also a <select> at the end of a control
// row, which is a very good way to ship a feature nobody uses: set a direction,
// never find the weight, and every issue pulls the same — so a ranked field of
// candidates looks flat for a reason the visitor cannot see.
//
// This file guards the fix, and the fix has two halves that are easy to ship
// separately and useless apart:
//
//   1. THE CONTROL IS VISIBLE AND ONE TAP. Three buttons, always rendered on an
//      answered issue, current level readable without opening anything, 44px on
//      a phone. No <select>.
//   2. THE STAR ACTUALLY MOVES SOMETHING. A priority change writes the store,
//      lifts _msPriorityWeight, re-orders the race sheet's issue axis in BOTH
//      match modes, and repaints an ALREADY-OPEN sheet — no reload, no re-open.
//      That last hop is the one that silently didn't exist: positionToLevel
//      ignores priority on purpose, so projectOne never fired for a star and
//      nothing downstream ever learned the weights had moved.
//   3. DIRECTION AND WEIGHT ARE INDEPENDENT. Re-answering Support → Oppose must
//      not quietly reset a starred issue to Normal.
//   4. ONE WEIGHT SYSTEM. No second store, no per-seat override, no third number.
//   5. THE NUDGE IS HONEST AND ONCE. Shown only to people who have positions and
//      no stars; gone after dismissal; never shown to someone with nothing set.
//   6. THE COPY DOES NOT OVERCLAIM. Stars move Your Match ranking. They do not
//      move Direction Match, party filters, or formal verdicts — and the page
//      says so.
//   7. NOTHING DRIFTED. Direction Match and Word-vs-Action are byte-identical.
//
//   node scripts/test-my-stances-priority.mjs

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
const MS_JS = R("my-stances.js");
const MS_CSS = R("my-stances.css");
const RS_JS = R("race-sheet.js");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// Same shape as the race-sheet harness, plus one difference that matters: the
// My Stances mount (#ms-body) is pre-registered, because init() bails without it
// and this file needs the real rendered row markup, not a reconstruction of it.
function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
      removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  mk("ms-body");
  mk("my-stances");
  return byId;
}

function boot() {
  const win = makeSandbox();
  const store = {};
  const sess = {};
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
  const byId = miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  win.__byId = byId;
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
  console.error(`✗ my-stances priority: ${msg}`);
  process.exit(1);
};

const probe = boot();
must(probe.PDXStances && typeof probe.PDXStances.setPriority === "function",
  `PDXStances.setPriority is not exposed — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe._msPriorityWeight === "function", "_msPriorityWeight is not exposed");
must(typeof probe._alignRefreshAll === "function",
  "_alignRefreshAll is not exposed — a star change cannot reach the alignment surfaces");
must(probe.PDXRaceSheet && typeof probe.PDXRaceSheet._axis === "function", "the race sheet axis is not exposed");

// ── The fixture issues ───────────────────────────────────────────────────────
// Three real, sideable issues from the shipped map. A is the one the visitor
// will eventually star; B is the one the star later moves to.
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
// Taken from what the browse list ACTUALLY paints, not from ISSUE_MAP: the map
// is wider than the twelve core groups the page walks, and an issue the visitor
// cannot reach on this screen would make every assertion below vacuous.
const BROWSED = (() => {
  const w = boot();
  try { w.PDXStances.open(); } catch (e) {}
  const mount = w.document.getElementById("ms-body");
  const html = mount ? String(mount.innerHTML) : "";
  return (html.match(/data-ms-row="([^"]+)"/g) || []).map((m) => m.slice(13, -1));
})();
must(BROWSED.length >= 3, "the browse list paints no issue rows at all");
const [A_KEY, B_KEY, C_KEY] = BROWSED.filter(sideable);
must(A_KEY && B_KEY && C_KEY, "the browse list no longer offers three sideable issues");

// A visitor with three positions and no stars — the state the nudge exists for.
function stanced(win) {
  win = win || boot();
  [A_KEY, B_KEY, C_KEY].forEach((k) => win.PDXStances.set(k, "support", "medium", ""));
  return win;
}
// The rendered My Stances body, as painted.
function msHtml(win) {
  try { win.PDXStances.open(); } catch (e) {}
  try { win.PDXStances.render(); } catch (e) {}
  const mount = win.document.getElementById("ms-body");
  return mount ? String(mount.innerHTML) : "";
}
const axisKeys = (win) => win.PDXRaceSheet._axis().map((r) => r.key);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the control is visible, one tap, and not a dropdown");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  const html = msHtml(w);
  must(html.length > 500, `My Stances painted nothing — boot errors: ${w.__loadErrors.join(" | ")}`);
  if (process.env.DBG) { console.log(html.slice(0, 400)); console.log("...LEN", html.length, "rows", (html.match(/ms-issue/g)||[]).length); console.log("STORE KEYS", Object.keys(w.__store)); console.log("all",JSON.stringify(w.PDXStances.all())); console.log("rowmatch", (html.match(/data-ms-row="lands_preserve"[^>]*/)||[])[0]); console.log("ctrls",(html.match(/ms-row-controls/g)||[]).length,"active",(html.match(/is-active/g)||[]).length, "KEYS", A_KEY,B_KEY,C_KEY, "cnt", w.PDXStances.count()); }

  // The old hidden control is gone from the shipped source, not merely unused.
  lacks(MS_JS, "<select data-ms-prio", "the priority <select> is still in the source");
  lacks(html, "<select", "a <select> is still painted in the stances body");

  // Three buttons per answered issue, one per level, each carrying the level it
  // sets — so raising AND lowering are both a single tap.
  const btns = (html.match(/data-ms-prio="(high|medium|low)"/g) || []);
  ok(btns.length >= 9, `expected 3 priority buttons on each of 3 answered issues, got ${btns.length}`);
  has(html, 'data-ms-prio="high"', "no High button");
  has(html, 'data-ms-prio="medium"', "no Normal button");
  has(html, 'data-ms-prio="low"', "no Low button");

  // Current state readable at a glance: pressed state on the button, and the
  // star drawn hollow while nothing is starred.
  has(html, 'aria-pressed="true"', "no button reports its pressed state");
  has(html, "☆", "the unstarred state is not drawn as a hollow star");

  // And it is a real group with a real name, not three loose buttons.
  has(html, 'class="ms-prio"', "the priority buttons are not grouped");
  has(html, 'role="group"', "the priority group has no role");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a star lifts the weight the match engine already reads");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  const before = w._msPriorityWeight(A_KEY);
  eq(before, 1, "an unstarred stance should weigh exactly 1");

  w.PDXStances.setPriority(A_KEY, "high");
  const after = w._msPriorityWeight(A_KEY);
  ok(after > before, `starring should raise the weight — ${before} → ${after}`);
  eq(w._msPriorityWeight(B_KEY), 1, "starring A must not touch B's weight");

  w.PDXStances.setPriority(C_KEY, "low");
  ok(w._msPriorityWeight(C_KEY) < 1, "Low should sink below Normal");

  // One weight system: the number the sheet sorts by IS the number the engine
  // weights by. Both read the same hook, so they cannot disagree.
  eq(w.PDXStances.priorityWeight(A_KEY), after, "PDXStances and _msPriorityWeight disagree on the weight");
  const axisA = w.PDXRaceSheet._axis().filter((r) => r.key === A_KEY)[0];
  ok(axisA && axisA.weight === after, "the race sheet axis is not reading _msPriorityWeight");
  ok(axisA && axisA.starred === true, "a High stance is not marked starred on the axis");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the starred issue heads the axis — in BOTH match modes");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  // Insertion order puts A first anyway, so star B: if the axis moves, it moved
  // for the weight and not for the order the stances happened to be set in.
  w.PDXStances.setPriority(B_KEY, "high");
  const keys = axisKeys(w);
  eq(keys[0], B_KEY, "the starred issue is not first on the axis");

  // The axis is mode-independent by construction — it is the visitor's issue
  // list, not the candidate's — but the requirement is that BOTH modes show it
  // first, so both are asserted through the public mode switch.
  w.pdxRaceSheetMode("record");
  eq(axisKeys(w)[0], B_KEY, "record mode does not put the starred issue first");
  w.pdxRaceSheetMode("stated");
  eq(axisKeys(w)[0], B_KEY, "stated mode does not put the starred issue first");
  eq(w.pdxRaceSheetMatchMode(), "stated", "the mode switch did not take");

  // Moving the star moves the axis; it does not accumulate two heads.
  w.PDXStances.setPriority(B_KEY, "medium");
  w.PDXStances.setPriority(A_KEY, "high");
  const moved = axisKeys(w);
  eq(moved[0], A_KEY, "moving the star did not move the head of the axis");
  ok(moved.indexOf(B_KEY) > 0, "the un-starred issue is still pinned to the top");
  eq(moved.length, 3, "the axis gained or lost an issue on a priority change");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · an ALREADY-OPEN race sheet repaints on a star change");
// ═════════════════════════════════════════════════════════════════════════════
// The half that silently did not exist. positionToLevel ignores priority by
// design, so projectOne no-ops on a star and nothing in the projection path
// fires. The chain has to be: setPriority → _alignRefreshAll → the race sheet's
// own refresh hook. Asserted as a repaint of the LIVE overlay, with no re-open.
{
  const w = stanced();
  const seat = "senate";
  let opened = "";
  try { w.pdxOpenRaceSheet(seat); } catch (e) {}
  const ov = w.document.getElementById("pdx-racesheet-overlay");
  must(ov, "the race sheet overlay never mounted");
  opened = String(ov.innerHTML);
  must(opened.length > 500, "the race sheet painted nothing");

  // Axis order as PAINTED, read off the issue labels in row order.
  const painted = (html) => (html.match(/data-rs-issue="([^"]+)"/g) || []).map((m) => m.slice(15, -1));
  const first0 = painted(opened)[0];

  // No re-open, no reload: just move the star and read the same live node back.
  w.PDXStances.setPriority(B_KEY, "high");
  const after = String(w.document.getElementById("pdx-racesheet-overlay").innerHTML);
  ok(after !== opened, "the open sheet did not repaint when the star moved");
  const first1 = painted(after)[0];
  ok(first1 === B_KEY, `the open sheet's axis did not re-head on the star — first row is ${first1}`);
  ok(first0 !== first1 || painted(opened).length < 2,
    "the axis head did not actually change, so the repaint proves nothing");

  // And the rank line now says why this order is this order.
  has(after, "Weighted toward your starred issues.", "the rank line does not mention the stars");
  // …only when there are stars to mention.
  lacks(opened, "Weighted toward your starred issues.",
    "the starred-issues rank line shows even with nothing starred");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · direction and weight are independent");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  w.PDXStances.setPriority(A_KEY, "high");
  const starred = w._msPriorityWeight(A_KEY);

  // Re-answer the issue the other way — the star must survive.
  w.PDXStances.set(A_KEY, "oppose", undefined, "");
  eq(w.PDXStances.get(A_KEY).position, "oppose", "the direction change did not take");
  eq(w.PDXStances.get(A_KEY).priority, "high", "changing the direction cleared the priority");
  eq(w._msPriorityWeight(A_KEY), starred, "changing the direction reset the weight");

  // Same through the click path the row actually uses, which re-sends the
  // current priority rather than a default.
  has(MS_JS, "setStance(key, pos, cur ? cur.priority : 'medium', cur ? cur.note : '')",
    "the position click path no longer preserves the existing priority");

  // And a note edit must not touch it either.
  w.PDXStances.set(A_KEY, "oppose", w.PDXStances.get(A_KEY).priority, "because it matters");
  eq(w.PDXStances.get(A_KEY).priority, "high", "editing the note cleared the priority");

  // Priority on an issue with no position is meaningless and is refused rather
  // than invented — otherwise a weight could outlive the stance it weighed.
  const orphan = ISSUE_KEYS.filter(sideable).filter((k) => k !== A_KEY && k !== B_KEY && k !== C_KEY)[0];
  eq(w.PDXStances.setPriority(orphan, "high"), null, "a weight was set on an issue with no position");
  eq(w._msPriorityWeight(orphan), 1, "an unanswered issue picked up a weight");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · persistence — a star survives the same way a stance does");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  w.PDXStances.setPriority(A_KEY, "high");
  const raw = w.__store[w.PDXStances.KEY];
  ok(raw && /"priority":"high"/.test(raw), "the star was never written to the store");
  // No new key, no new auth path: it rides the record that already syncs.
  const keys = Object.keys(w.__store).filter((k) => /prio|star/i.test(k));
  eq(keys.length, 0, `a star wrote a side store: ${keys.join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the nudge — once, and only to the people it helps");
// ═════════════════════════════════════════════════════════════════════════════
const NUDGE = "Star the issues that matter most";
{
  // Nothing set: the existing "take a position" CTA, and not a word about stars.
  const empty = boot();
  const emptyHtml = msHtml(empty);
  lacks(emptyHtml, NUDGE, "the star nudge shows to someone with no positions");
  has(emptyHtml, "haven", "the existing no-positions CTA is gone");

  // Positions, no stars: shown.
  const w = stanced();
  has(msHtml(w), NUDGE, "the star nudge is missing for a voter with positions and no stars");

  // Starred: gone, because it has nothing to ask for.
  w.PDXStances.setPriority(A_KEY, "high");
  lacks(msHtml(w), NUDGE, "the star nudge still shows after the voter starred something");

  // Dismissed: gone, and stays gone across a re-read of the store.
  const w2 = stanced();
  has(msHtml(w2), NUDGE, "sanity — the nudge should be up before dismissal");
  w2.PDXStances.setPriority(A_KEY, "high");
  w2.PDXStances.setPriority(A_KEY, "medium");   // back to no stars at all
  has(msHtml(w2), NUDGE, "un-starring should bring the ask back before it is dismissed");
  // The dismissal path writes a settings flag, not a stance.
  has(MS_JS, "markStarNudgeSeen", "there is no dismissal path for the nudge");
  has(MS_JS, "data-ms-nudgeclose", "the nudge has no dismiss control");
  has(MS_JS, "starNudge = 'seen'", "the dismissal is not persisted");
  // …and it is a settings flag, so it can never leak into a public showcase.
  has(MS_JS, "s.settings.starNudge", "the nudge flag does not live in settings");
  ok(!/items\[[^\]]*\]\.starNudge/.test(MS_JS), "the nudge flag was written onto an item");

  // The dismissal has to SURVIVE normalize(), which rebuilds settings from a
  // whitelist and would otherwise drop the flag on the next read — a nudge that
  // comes back every reload is worse than one that never showed.
  const w3 = stanced();
  const raw = JSON.parse(w3.__store[w3.PDXStances.KEY]);
  raw.settings.starNudge = "seen";
  w3.__store[w3.PDXStances.KEY] = JSON.stringify(raw);
  lacks(msHtml(w3), NUDGE, "a dismissed nudge came back after the store was re-read");
  // …and the flag is still there after a write, i.e. normalize did not eat it.
  w3.PDXStances.setPriority(A_KEY, "low");
  eq(JSON.parse(w3.__store[w3.PDXStances.KEY]).settings.starNudge, "seen",
    "normalize() dropped the dismissal flag on the next save");

  // Never a modal.
  lacks(MS_JS, "ms-nudge-overlay", "the nudge is an overlay");
  has(MS_JS, 'class="ms-nudge"', "the nudge is not the inline note it should be");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the copy claims exactly what the stars do");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stanced();
  const html = msHtml(w);
  has(html, "Your Match", "the copy never names what a star actually changes");
  has(html, "Direction Match", "the copy never says what a star does NOT change");
  has(html, "party filters", "the copy does not rule out party filters");
  has(html, "formal verdicts", "the copy does not rule out formal verdicts");
  has(html, "does not change", "the copy has no negative claim at all");

  // No overclaim in the other direction: a star must not be sold as changing a
  // politician's own record, score, or grade.
  const claims = [
    "changes their Direction Match",
    "raises their score",
    "improves their record",
    "boosts their grade",
  ];
  claims.forEach((c) => lacks(html, c, `the copy claims a star ${c}`));

  // And no party framing anywhere in the new surface.
  ["Republican", "Democrat", "GOP", "party loyalty", "with their party"].forEach((p) =>
    lacks(html, p, `party framing "${p}" appeared in My Stances`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · one weight system, no second brain");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The new mutation reuses the existing model: same PRIORITIES, same
  // PRIORITY_WEIGHT, same exported hook. If a second weight table appears here,
  // the sheet and the engine will drift apart the day someone edits one of them.
  const tables = (MS_JS.match(/PRIORITY_WEIGHT\s*=/g) || []).length;
  eq(tables, 1, "there is more than one priority weight table in My Stances");
  const hooks = (MS_JS.match(/window\._msPriorityWeight\s*=/g) || []).length;
  eq(hooks, 1, "the priority weight hook is assigned more than once");
  // The race sheet reads the hook and does not keep its own copy.
  lacks(RS_JS, "PRIORITY_WEIGHT", "the race sheet re-implemented the weight table");
  has(RS_JS, "_msPriorityWeight", "the race sheet is not reading the shared weight");
  // No per-seat override in v1.
  lacks(RS_JS, "seatPriority", "a per-seat priority override crept into the race sheet");
  lacks(MS_JS, "seatPriority", "a per-seat priority override crept into My Stances");

  // setPriority does not go through setStance — a weight edit must not rewrite
  // the direction or the note.
  const body = MS_JS.slice(MS_JS.indexOf("function setPriority"), MS_JS.indexOf("function refreshMatchSurfaces"));
  lacks(body, "setStance(", "setPriority rewrites the whole record through setStance");
  has(body, "refreshMatchSurfaces()", "setPriority does not refresh the match surfaces");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · 44px targets and a visible state in the stylesheet");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(MS_CSS, ".ms-prio-btn", "the priority buttons have no styles");
  has(MS_CSS, ".ms-prio-btn.is-high.is-on", "the starred state has no distinct style");
  has(MS_CSS, ".ms-nudge", "the nudge has no styles");
  // The mobile block is where the tap target promise is kept.
  const mobile = MS_CSS.slice(MS_CSS.indexOf("@media (max-width: 640px)"));
  has(mobile, "min-height: 44px", "no 44px tap target on mobile");
  const targets = (mobile.match(/min-height:\s*44px/g) || []).length;
  ok(targets >= 2, `expected the priority buttons and the dismiss to both hit 44px, got ${targets}`);
  has(mobile, ".ms-prio-btn", "the priority buttons are not sized for a phone");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · nothing drifted");
// ═════════════════════════════════════════════════════════════════════════════
// Direction Match and Word-vs-Action must be byte-identical whatever the visitor
// stars. A star is a statement about the VOTER, and it may not move a number
// that is a statement about the POLITICIAN.
{
  const base = boot();
  const w = stanced();
  const pids = Object.keys(base.CMP_DATA || {}).slice(0, 120);
  let dmDrift = 0, waDrift = 0;
  const dmOf = (win, pid) => {
    try { const s = win._pdxLedgerSlot(pid); return s ? JSON.stringify([s.pct, s.tier, s.label]) : "none"; }
    catch (e) { return "err"; }
  };
  const waOf = (win, pid) => {
    try { const r = win.PDXWordAction && win.PDXWordAction.read(pid); return r ? JSON.stringify(r) : "none"; }
    catch (e) { return "err"; }
  };
  const before = pids.map((p) => [dmOf(base, p), waOf(base, p)]);
  w.PDXStances.setPriority(A_KEY, "high");
  w.PDXStances.setPriority(C_KEY, "low");
  pids.forEach((p, i) => {
    if (dmOf(w, p) !== before[i][0]) dmDrift++;
    if (waOf(w, p) !== before[i][1]) waDrift++;
  });
  eq(dmDrift, 0, `starring moved Direction Match on ${dmDrift} profiles`);
  eq(waDrift, 0, `starring moved Word-vs-Action on ${waDrift} profiles`);

  // The formula files were not touched by this pass.
  lacks(MS_JS, "formalPatternIndex", "My Stances started reading the formal pattern index directly");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("");
if (failures.length) {
  console.error(`✗ my-stances priority — ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error("   • " + f));
  console.error("");
  process.exit(1);
}
console.log(`✓ my-stances priority — ${passed} assertions passed\n`);
