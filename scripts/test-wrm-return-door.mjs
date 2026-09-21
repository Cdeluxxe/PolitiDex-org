#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wrm-return-door.mjs — the finder returns you to the door you came in by
// ─────────────────────────────────────────────────────────────────────────────
// Who Represents Me is a band on the front page. It asks one question — who
// holds your seats — and when it has no location it offers three doors to set
// one. Two of those doors are the picker, and the picker lives on /find now.
//
// SO A READER WHO PRESSED "CHANGE ON MAP" INSIDE THAT BAND LEFT THE DOCUMENT,
// SET A DISTRICT, AND CAME BACK TO THE TOP OF THE HOMEPAGE. The openers in
// voter-hub-location.js compose the trip as PDXReturn.finderHref(here()), and
// here() on the front page is '/', so the confirm honoured '/' exactly: the
// hero, the arrival chrome, and several thousand pixels between the reader and
// the six rows they had just gone to the trouble of resolving.
//
// PDXReturn ALREADY OWNED THE ANSWER. settled() falls back to '/' + FRAGMENT —
// the band's own anchor — when a confirm carries no intent, and "no intent" is
// exactly what this band should send, because the band is where the answer is
// read. So the fix is at the kickoff: the band walks to the finder itself and
// sends no next. It is NOT inside PDXReturn, because next=/ is right for
// everybody else who sends it (the welcome flow and Start Here both do, and both
// genuinely want the homepage's onboarding on the way back).
//
// This file pins that trip in both directions, plus the two things the same pass
// owed a reader outside Utah: copy that names only the seats their state has,
// and a tap that settles which state it is in before it reads any geometry.
//
//   node scripts/test-wrm-return-door.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ wrm return door: STALE HARNESS — ${m}`);
  process.exit(2);
};

const INDEX = R("index.html");
const WRM = R("who-represents-me.js");
const LOC = R("voter-hub-location.js");
const FIND = R("find.html");
// The finder's controller is one inline IIFE in find.html, sliced by its own
// banner so nothing below can pass on text from elsewhere in the shell.
const MAPC = (() => {
  const a = FIND.indexOf("INTERACTIVE UTAH DISTRICT MAP");
  must(a > 0, "find.html carries no INTERACTIVE UTAH DISTRICT MAP banner");
  const b = FIND.indexOf("</script>", a);
  must(b > a, "the map controller's closing script tag is missing");
  return strip(FIND.slice(a, b));
})();
must(MAPC.length > 20000, `the map controller slice is too thin to test (${MAPC.length} chars)`);

// ── A DOCUMENT THE BAND CAN RUN ON, AND A LOCATION IT CANNOT FOLLOW ────────
// A navigation IS the thing being measured, so the harness records the address
// instead of going to it.
function boot(opts = {}) {
  const win = makeSandbox();
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, attrs: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, getBoundingClientRect() { return { top: 0, bottom: 0, height: 0 }; },
      querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  win.document.body = mk("body");
  win.document.addEventListener = () => {};
  // The band, and — only when the test asks for it — the picker markup that
  // would make the openers a modal rather than a navigation.
  ["who-represents-me", "wrm-reps", "wrm-locbar", "voter-hub"].forEach(mk);
  if (opts.pickerHere) mk("change-location-form");

  const nav = [];
  win.location = {
    pathname: opts.pathname || "/", search: opts.search || "", hash: opts.hash || "",
    origin: "https://politidex.fyi", href: "https://politidex.fyi" + (opts.pathname || "/"),
    assign: (u) => nav.push(String(u)), replace: (u) => nav.push("replace:" + String(u)),
  };
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = win.localStorage;
  win.auth = { currentUser: null };
  if (opts.findDoc) win.__PDX_FIND_DOC = true;
  const sandbox = vm.createContext(win);
  const errors = [];
  for (const f of ["voter-hub-location.js", "who-represents-me.js"]) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  }
  win._hasUserLocation = !!opts.hasLocation;
  win._currentVoterLocation = opts.loc || {};
  win.__errors = errors;
  win.__nav = nav;
  return win;
}

const W0 = boot();
must(typeof W0.pdxSetLocation === "function", `pdxSetLocation is gone — ${W0.__errors.join(" | ")}`);
must(W0.PDXReturn && typeof W0.PDXReturn.settled === "function", "PDXReturn.settled is gone — this file is stale");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE BAND WALKS TO THE FINDER, AND SENDS NO INTENT
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the band's doors go to /find with no next");
{
  // Both picker doors, from the band, on a document where the picker is not.
  for (const mode of ["map", "form", undefined]) {
    const W = boot();
    W.pdxSetLocation(mode);
    eq(W.__nav.length, 1, `door: pdxSetLocation(${JSON.stringify(mode)}) did not navigate exactly once`);
    eq(W.__nav[0], "/find",
      `door: pdxSetLocation(${JSON.stringify(mode)}) carried an intent to the finder — a next=/ is what returned the\n` +
      "    reader to the top of the homepage instead of to the band they asked from");
  }
  // And the lookup's own entry point, when there is nothing to look up yet.
  const W1 = boot();
  W1.pdxFindMyReps();
  eq(W1.__nav[0], "/find", "door: pdxFindMyReps with no location does not reach the finder cleanly");
  no(String(W1.__nav[0] || ""), "next", "door: pdxFindMyReps composed a next the band does not want");

  // A READER WHO ALREADY HAS A LOCATION IS NOT SENT ANYWHERE. They asked who
  // holds the seats, not to be shown the address form again.
  const W2 = boot({ hasLocation: true, loc: { state: "Ohio", city: "Columbus" } });
  W2.pdxFindMyReps();
  eq(W2.__nav.length, 0, "door: a reader with a location was navigated off the page they were reading");

  // AND WHEN THE PICKER IS ON THIS DOCUMENT, NOTHING NAVIGATES. The band scrolls
  // to it and opens it, exactly as before — this is a feature test, not a page
  // test, so the day the picker moves back it goes back to being a modal.
  const W3 = boot({ pickerHere: true });
  let opened = 0;
  W3.toggleChangeLocation = () => { opened++; };
  W3.pdxSetLocation("map");
  eq(W3.__nav.length, 0, "door: the band navigated away from a picker that is on this very document");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · AND THE CONFIRM COMES BACK TO THE BAND
// ═════════════════════════════════════════════════════════════════════════════
section("2 · a confirm with no intent lands on #who-represents-me");
{
  // The finder document, a save, and the press. This is the far half of the
  // smoke test: WRM → Change on map → confirm → back on the band.
  const W = boot({ pathname: "/find", findDoc: true, hasLocation: true });
  W._pdxLocSaved = true;
  eq(W.PDXReturn.settled(), true, "return: a saved confirm on /find did not settle anywhere");
  eq(W.__nav[0], "/#who-represents-me",
    "return: the confirm did not land on the band that shows the seats");

  // WITHOUT A SAVE THERE IS NO TRIP. A reader who opened the finder and pressed
  // Escape has expressed no intent and is owed no navigation.
  const W2 = boot({ pathname: "/find", findDoc: true, hasLocation: false });
  eq(W2.PDXReturn.settled(), false, "return: an unsaved close navigated the reader anyway");
  eq(W2.__nav.length, 0, "return: an unsaved close moved the reader");

  // AND THE OTHER DOORS KEEP THEIR INTENT. This is why the fix is at the
  // kickoff: a door that DOES send next=/ still gets /, because the welcome flow
  // and Start Here both want the homepage's onboarding on the way back.
  eq(W.PDXReturn.finderHref("/"), "/find?next=%2F",
    "return: finderHref stopped carrying an intent, which breaks every door that legitimately has one");
  const W3 = boot({ pathname: "/", search: "?next=%2Fvoice", hasLocation: true });
  W3._pdxLocSaved = true;
  eq(W3.PDXReturn.consume(), true, "return: an explicit intent is no longer honoured");
  eq(W3.__nav[0], "/voice", "return: an explicit intent went somewhere other than where it named");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE BAND'S BUTTONS, AND THE ARRIVAL THAT LEAVES THEM ALONE
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the band's markup and the front page's arrival");
{
  const bar = INDEX.slice(INDEX.indexOf('<div id="wrm-locbar"'), INDEX.indexOf('<div class="wrm-cold">'));
  must(bar.length > 400, "the #wrm-locbar band could not be sliced out of index.html");
  // Every picker door in this band goes through the band's own setter, which is
  // the only function that knows the reader is standing in it.
  eq((bar.match(/window\.pdxSetLocation\(/g) || []).length, 3,
    "band: the three picker doors do not all route through pdxSetLocation — a direct opener composes\n" +
    "    next=/ and returns the reader to the top of the homepage");
  has(bar, "window.pdxSetLocation?window.pdxSetLocation('map')", "band: the map door does not ask for the map");
  has(bar, "window.pdxSetLocation?window.pdxSetLocation('form')", "band: the address door does not ask for the form");
  // The fallbacks stay: these buttons must still do something before the band's
  // own script has run.
  has(bar, "window.toggleChangeLocation&amp;&amp;window.toggleChangeLocation()",
    "band: the map door lost its no-script fallback");
  // Detect is not a picker door and is untouched.
  has(bar, "window.triggerManualLocationDetection()", "band: the Detect door changed");

  // AND THE ARRIVAL HONOURS THE FRAGMENT. finderArrival owns what happens after
  // a confirm; a confirm that named the band is a reader who asked for the band.
  const arr = INDEX.slice(INDEX.indexOf("function finderArrival(){"), INDEX.indexOf("if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finderArrival);"));
  must(arr.length > 300, "finderArrival could not be sliced out of index.html");
  has(arr, "'#who-represents-me'", "arrival: nothing checks whether the confirm asked for the band");
  ok(arr.indexOf("sessionStorage.removeItem('pdx_finder_confirm')") < arr.indexOf("'#who-represents-me'"),
    "arrival: the one-shot flag is read after the fragment check, so a band arrival leaves it armed and the\n" +
    "    next reload re-onboards");
  ok(arr.indexOf("'#who-represents-me'") < arr.indexOf("pdxOpenHomeTeamOnboard"),
    "arrival: the team-builder opens before the fragment is considered, over the answer the reader came for");
  ok(arr.indexOf("'#who-represents-me'") < arr.indexOf("_pdxRunWelcomeBallotHandoff"),
    "arrival: the ballot scroll runs before the fragment is considered, pulling the reader off the band");

  // THE KICKOFF ITSELF: one helper, named, with no intent in it.
  const wrm = strip(WRM);
  has(wrm, "function goFinder()", "kickoff: the band has no single owner for the trip to the finder");
  no(wrm, "finderHref", "kickoff: the band is back to composing a next through finderHref");
  eq((wrm.match(/goFinder\(\)/g) || []).length, 3,
    "kickoff: goFinder is not called from exactly the two doors that need it — its definition, pdxFindMyReps\n" +
    "    and pdxSetLocation are the only three mentions");
  has(wrm, "if (!pickerIsHere()) { goFinder(); return; }",
    "kickoff: the walk to the finder is not gated on the picker being elsewhere");
  // It asks PDXReturn for the address rather than hard-coding a second copy of
  // it, and still has a literal to fall back on.
  has(wrm, "R.FINDER", "kickoff: the finder's address is spelled out again instead of read from its owner");
  has(wrm, "to = '/find'", "kickoff: there is no fallback when the location owner has not loaded");
  // And the owner still publishes both halves of the contract.
  has(strip(LOC), "FINDER: FINDER", "kickoff: PDXReturn stopped publishing the finder's address");
  has(strip(LOC), "window.location.assign('/' + FRAGMENT)", "kickoff: settled() no longer falls back to the band");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · UTAH-ONLY COPY IS UTAH-ONLY
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the 2026 court-map story is scoped to the state it is about");
{
  // The banner is a Utah fact: a 2025 ruling, a 2026 remap, Davis County out of
  // the 1st. It is shown on the congressional layer AND in Utah, never on the
  // congressional layer alone.
  const chrome = MAPC.slice(MAPC.indexOf("function setLayerChrome("), MAPC.indexOf("window.pdxMapSetLayer = function"));
  must(chrome.length > 200, "setLayerChrome could not be sliced");
  has(chrome, "(layerType === 'congress' && utahScope())",
    "copy: the court-map banner is still hung on the layer rather than on the state it is about");
  has(chrome, "escapeHtml(_scopeState)", "copy: the out-of-Utah hint does not name the state whose lines are drawn");
  ok(chrome.indexOf("utahScope()") < chrome.indexOf("2026 U.S. House"),
    "copy: the 2026 wording is reached before the scope is consulted");

  // The info panel names the vintage that is actually on the canvas.
  const info = MAPC.slice(MAPC.indexOf("function refreshInfoPanel("), MAPC.indexOf("function selectedSummary("));
  must(info.length > 400, "refreshInfoPanel could not be sliced");
  has(info, "utahScope() ? 'U.S. House (2026 court-ordered map)'",
    "copy: the info label credits every state's lines to Utah's court-ordered map");
  has(info, "utahScope() ? 'the 2026 map'",
    "copy: the info value says every district came off the 2026 map");
  // AND NOTHING ELSE IN THE CONTROLLER DATES A MAP TO 2026 WITHOUT ASKING WHOSE
  // MAP IT IS. Every mention is read in its surroundings rather than on its own
  // line, because the gate is a ternary and the wording it guards is two lines
  // below it. The one legitimate ungated mention is the UGRC service path, which
  // is an address rather than a sentence — a reader never sees it.
  let dated = 0;
  for (let i = MAPC.indexOf("2026"); i >= 0; i = MAPC.indexOf("2026", i + 1)) {
    const ctx = MAPC.slice(Math.max(0, i - 300), i + 140);
    if (/political_us_congress_districts_2026/.test(ctx)) continue;
    dated++;
    ok(ctx.indexOf("utahScope(") >= 0,
      `copy: "${MAPC.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, " ")}" dates a map to 2026 with no state behind the claim`);
  }
  ok(dated >= 3, `copy: only ${dated} scoped mentions of the 2026 map remain — the banner, the hint and the info panel\n    each name it, so a drop means one of them stopped saying which map a reader is looking at`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE STATUS LINE COUNTS THE SEATS THIS STATE HAS
// ═════════════════════════════════════════════════════════════════════════════
section("5 · outside Utah the copy names only the seats that exist");
{
  has(MAPC, "function seatsPhrase()", "seats: nothing computes how many seats this scope actually has");
  has(MAPC, "function allSetPhrase()", "seats: nothing computes the 'set' sentence for a scope with one seat");
  // Both are driven off SEATS, which is the same list missingSeats() and
  // confirmState() walk — one source for "which seats is this about".
  const sp = MAPC.slice(MAPC.indexOf("function seatsPhrase()"), MAPC.indexOf("function confirmState()"));
  must(sp.length > 200, "the seat-phrase helpers could not be sliced");
  has(sp, "SEATS.length === 3", "seats: the three-seat wording is not kept for the scope that has three seats");
  has(sp, "LABEL[SEATS[0]]", "seats: a one-seat scope does not name the seat it has");

  const miss = MAPC.slice(MAPC.indexOf("function refreshMissingLine()"), MAPC.indexOf("function resolveArea()"));
  must(miss.length > 400, "refreshMissingLine could not be sliced");
  has(miss, "seatsPhrase()", "seats: the empty-state line still counts seats this state may not have");
  has(miss, "allSetPhrase()", "seats: the complete line still claims three districts in every state");
  no(miss, "to set all three of your districts",
    "seats: the prompt hard-codes three districts, which is a miscount in 49 states and DC");
  no(miss, "State House, State Senate and U.S. House",
    "seats: the done line names two chambers this state may have no map for");

  // "Outside X's State House map" cannot print for a state with no legislative
  // layer, because it cannot print at all — the branch that produced it went
  // with the tap-to-load picker.
  no(MAPC, "district map. Tap inside",
    "seats: a miss can still tell a reader they are outside a legislative map their state does not have");
  no(MAPC, "'s ' + LABEL[layerType] +",
    "seats: a miss still names a per-chamber map for the scoped state");
  // And the markup's own first frame does not promise three either.
  no(FIND, "tap the map, to set all three of your districts",
    "seats: the first frame of the status line still promises three districts");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE TAP SETTLES THE STATE BEFORE IT READS ANY GEOMETRY
// ═════════════════════════════════════════════════════════════════════════════
section("6 · reverse-geocode, set state, fetch that state's lines, then resolve");
{
  const tap = MAPC.slice(MAPC.indexOf("function tapAt("), MAPC.indexOf("function loadAndShow("));
  must(tap.length > 300, "tapAt could not be sliced");
  // The pin is the reader's own gesture and owes nothing to the network, so it
  // still goes down first, before anything that can wait or fail.
  ok(tap.indexOf("dropPin(") > 0 && tap.indexOf("dropPin(") < tap.indexOf("if (_loadingLayer) return;"),
    "tap: the pin is no longer dropped before the early-outs");
  // Containment in geometry we hold is proof of state; everything else asks.
  ok(tap.indexOf("districtAt(_activeLayer") < tap.indexOf("scopeFromPoint(latlng)"),
    "tap: the containment fast path no longer runs ahead of the round trip, so every in-state tap pays for one");
  no(tap, "loadAndShow(", "tap: the tap still pre-loads a layer, which is the path that resolved against the wrong state");

  const scope = MAPC.slice(MAPC.indexOf("function scopeFromPoint("), MAPC.indexOf("function ensurePinStyles("));
  must(scope.length > 400, "scopeFromPoint could not be sliced");
  const iGeo = scope.indexOf("censusAtPoint(");
  const iSet = scope.indexOf("setScopeState(extra.state)");
  const iRes = scope.indexOf("resolveAllAt(pt, true)");
  ok(iGeo > 0 && iSet > iGeo, "tap: the state is set before the point has been reverse-geocoded");
  ok(iRes > iSet, "tap: the point is resolved before the scope has been moved to the state it is in — this is the\n" +
    "    order that read an Arizona pin off Utah's polygons");
  has(scope, "stateInfo(extra.state)", "tap: a state the finder cannot name is not checked for");
  has(scope, "Search your address instead", "tap: a pin we cannot place says nothing to the reader");
  no(scope, "nearest", "tap: an unplaceable pin is given a nearest-state guess");

  // Dropping the old state's geometry is setScopeState's job, and it drops all
  // three chambers plus the selections made on them.
  const set = MAPC.slice(MAPC.indexOf("function setScopeState("), MAPC.indexOf("function syncScopeChrome()"));
  must(set.length > 200, "setScopeState could not be sliced");
  for (const seat of ["dropSeat('congress')", "dropSeat('house')", "dropSeat('senate')"]) {
    has(set, seat, `tap: a state change leaves ${seat.slice(9, -2)} geometry from the state the reader left`);
  }
  // And the copy that names a state or a seat is repainted in the same breath.
  const sync = MAPC.slice(MAPC.indexOf("function syncScopeChrome()"), MAPC.indexOf("function distOf("));
  must(sync.length > 200, "syncScopeChrome could not be sliced");
  has(sync, "setLayerChrome(_activeLayer)", "tap: a state change leaves the banner and hint describing the old state");
  has(sync, "refreshConfirmBtn()", "tap: a state change leaves the confirm bar naming seats this state does not have");

  // The point resolver paints on the tap path, because a press on the canvas IS
  // the request to see the lines — and the tap no longer loads them itself.
  has(MAPC, "function resolveAllAt(pt, paint)", "tap: resolveAllAt cannot be told to paint, so an empty canvas stays empty");
  has(MAPC, "if (paint || isPainted(_activeLayer)) showLayer(_activeLayer, true)",
    "tap: the resolve does not draw for the tap that asked for it");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · ONE BUMP, ONE ENTRY
// ═════════════════════════════════════════════════════════════════════════════
section("7 · the shell is versioned and the entry says what moved");
{
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
  must(m, "CACHE_VERSION is gone from sw.js");
  const PIN = "v241";
  ok(Number(String(m[1]).slice(1)) >= 241, `sw: CACHE_VERSION is ${m[1]} — ${PIN} or later is the floor for this pass`);
  const at = SW.indexOf(`// ${PIN} - `);
  ok(at > 0, `sw: there is no changelog entry for ${PIN}`);
  const nextAt = SW.slice(at + 1).search(/\n\/\/\s+v\d+ - /);
  const LOG = SW.slice(at, nextAt < 0 ? SW.indexOf("const CACHE_VERSION", at) : at + 1 + nextAt);
  const FLAT = LOG.replace(/^\s*\/\/\s?/gm, " ").replace(/\s+/g, " ");
  ok(/who-represents-me/i.test(FLAT), `sw: the ${PIN} entry does not name the band the confirm returns to`);
  ok(/next/i.test(FLAT), `sw: the ${PIN} entry does not explain the intent that was being sent`);
  ok(/2026/.test(FLAT) && /utah/i.test(FLAT), `sw: the ${PIN} entry does not say whose the 2026 story is`);
  ok(/all three/i.test(FLAT), `sw: the ${PIN} entry does not mention the seat count the copy was claiming`);
  ok(/MIGRATION COST: none/i.test(FLAT), `sw: the ${PIN} entry does not state a migration cost of none`);
  eq((LOG.match(/\n\/\/\s+v\d+ - /g) || []).length, 0, `sw: another version heading sits inside the ${PIN} entry`);
  ok(LOG.split("\n").length <= 48, `sw: the ${PIN} entry runs ${LOG.split("\n").length} lines, over the 48-line budget`);
}

if (failures.length) {
  console.error(`\n✗ wrm return door: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  process.exit(1);
}
console.log(`\n✓ wrm return door: all ${passed} assertions passed — the band gets its reader back, Utah's story stays Utah's, and a tap knows its state before it reads a polygon\n`);
