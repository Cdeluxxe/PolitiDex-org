#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-federal-house-locator.mjs — the U.S. House resolves outside Utah, lazily
// ─────────────────────────────────────────────────────────────────────────────
// A reader in Columbus opened Who Represents Me and read six rows: two senators,
// a governor, and three blanks. Two of those blanks were honest — PolitiDex
// draws no state legislative lines outside Utah. The third was not: the roster
// holds a full file for the sitting member of Ohio's 15th, keyed to that exact
// district, and the only thing standing between the reader and it was that the
// only congressional geometry on the site was Utah's.
//
// So the congressional layer went national, one state at a time, and this file
// pins the two halves of that:
//
//   THE SEAT. window._pdxUsHouseSeat(state, district) is the only place a
//   district number becomes a person. It matches on the roster's own
//   district-qualified state string ("Ohio · OH-15"), it refuses a record that
//   does not say which district it holds (a leadership row carrying a bare
//   "Louisiana" is never placed in Louisiana's 1st), and a district claimed
//   twice resolves to NOBODY rather than to whichever row came first.
//
//   THE MAP. /find fetches one state's congressional lines after the geocode
//   has a state, never a national layer, and never Utah's state legislative
//   FeatureServers for an out-of-state pin. Utah keeps the UGRC layer it
//   already had; everyone else gets TIGERweb's 119th-Congress layer, which is
//   the vintage the roster is keyed to.
//
// AND THE HONESTY GRAMMAR STAYS THREE-WAY. A district with no member on file,
// a seat we can map but have not placed, and a seat we do not map in that state
// are three different sentences. None of them is a district number.
//
//   node scripts/test-federal-house-locator.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "issue-colors.js",
  "person-link.js",
  "voter-hub-location.js",
  "compare-hub.js",
  "archive-browse.js",
  "seat-field.js",
  "ballot-breakdown.js",
  "who-represents-me.js",
];

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ federal house locator: STALE HARNESS — ${m}`);
  process.exit(2);
};

// ── The real modules, the real roster, a mini-DOM ──────────────────────────
function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.addEventListener = () => {};
  ["who-represents-me", "wrm-reps", "voter-hub"].forEach(el);
  return byId;
}

function boot(location) {
  const win = makeSandbox();
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = win.localStorage;
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  const errors = [];
  FILES.forEach((f) => {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  });
  win.PROFILES = win.CMP_DATA;
  win._pdxPersonById = (pid) => {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; } catch (e) { return null; }
  };
  win._hasUserLocation = true;
  win._currentVoterLocation = location;
  win.__errors = errors;
  return win;
}

const band = (w) => {
  w.PDXWhoRepresentsMe.sync();
  const n = w.document.getElementById("wrm-reps");
  return n ? String(n.innerHTML) : "";
};
const levelOf = (w, key) => (w.pdxRepsForMe().levels || []).filter((lv) => lv.key === key)[0] || null;

const COLUMBUS   = { state: "Ohio", city: "Columbus", county: "Franklin County", district: "3" };
const COLUMBUS_0 = { state: "Ohio", city: "Columbus", county: "Franklin County" };
const LAYTON     = { state: "Utah", city: "Layton", county: "Davis County", district: "2" };

const W = boot(COLUMBUS);
must(typeof W.pdxRepsForMe === "function", `the resolver did not load — ${W.__errors.join(" | ")}`);
must(typeof W._pdxUsHouseSeat === "function", "window._pdxUsHouseSeat is gone — this whole file is stale");
must(Object.keys(W.CMP_DATA || {}).length > 400, "the roster did not load");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · A DISTRICT NUMBER BECOMES A PERSON IN EXACTLY ONE PLACE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the seat lookup places a member, or nobody");
{
  const seat = (st, d) => W._pdxUsHouseSeat(st, d);

  // The ordinary case, and the reason this pass exists: a real district in a
  // state PolitiDex has never mapped resolves the member who holds it.
  eq(seat("Ohio", 3), "joyce_beatty",
    "seat: Ohio's 3rd does not resolve its sitting member, which is the whole point of the pass");
  eq(seat("Ohio", "3"), "joyce_beatty", "seat: a district passed as a string does not resolve the same seat as a number");

  // A record that does not say WHICH district it holds is never placed in one.
  // greg_landsman's row carries a bare "Ohio" — true, and not an answer to
  // "who represents Ohio's 1st".
  eq(seat("Ohio", 1), null,
    "seat: a roster row carrying a bare state name was placed in a district it never claimed — this is\n" +
    "    how a leadership record becomes somebody's representative");

  // A district nobody in the roster claims is a blank, not a neighbour.
  eq(seat("Ohio", 99), null, "seat: an unclaimed district resolved a person anyway");
  eq(seat("Texas", 35), null, "seat: a district with no roster row resolved somebody");

  // At-large states, and the tolerance is ONE-WAY. TIGER writes "00" for an
  // at-large seat, which /find reads as district 1, so district 1 may answer an
  // AL row — but Montana's 2nd may never reach one.
  eq(seat("Wyoming", "AL"), "harriet_hageman", "seat: an at-large key does not resolve the at-large member");
  eq(seat("Wyoming", 1), "harriet_hageman",
    "seat: district 1 no longer reaches the at-large row, so every at-large state reads as unresolved");
  eq(seat("Alaska", 1), "nicholas_begich", "seat: Alaska's single seat does not resolve from district 1");
  eq(seat("Alaska", 2), null,
    "seat: a district number an at-large state does not have resolved its at-large member anyway");

  // Utah is not special-cased out: the same lookup answers it.
  eq(seat("Utah", 2), "maloy", "seat: Utah stopped resolving through the same lookup as every other state");

  // No state, no district, no answer — and 'national' is not a state.
  for (const [st, d] of [["", 3], ["national", 3], ["Ohio", ""], ["Ohio", null], ["Narnia", 3]])
    eq(seat(st, d), null, `seat: ${JSON.stringify([st, d])} resolved a person out of nothing`);

  // DC's delegate is not a voting House member in this roster, and is not
  // invented as one.
  eq(seat("District of Columbia", 1), null,
    "seat: DC resolved a U.S. House member — the roster holds no district-keyed row for it, and a\n" +
    "    delegate is not silently promoted into one");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · TWO FLAGS, TWO DIFFERENT QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the congressional map widened and the legislative one did not");
{
  const reps = W.pdxRepsForMe();
  eq(reps.districtsResolvable, false,
    "flags: districtsResolvable went true outside Utah — it gates the STATE legislative geometry, which\n" +
    "    did not move, and every surface downstream reads it as 'this reader's district seats are safe'");
  eq(reps.congressMapped, true, "flags: congressMapped is false in Ohio, so the seat this pass resolves reads as unmappable");

  const house = levelOf(W, "house");
  must(house, "the U.S. House level is gone from the resolver");
  eq(house.pid, "joyce_beatty", "flags: the U.S. House level did not resolve its member for an Ohio reader");
  eq(String(house.district), "3", "flags: the U.S. House level lost the district it resolved from");
  eq(house.mapped, true, "flags: the U.S. House level is not marked as mapped, so its blank state reads as our gap");

  for (const key of ["statesenate", "statehouse"]) {
    const lv = levelOf(W, key);
    must(lv, `the ${key} level is gone from the resolver`);
    eq(lv.pid, null, `flags: the ${key} seat resolved a person outside Utah, where we draw no lines for it`);
    eq(lv.district, null, `flags: the ${key} seat carries a district outside Utah`);
    eq(lv.mapped, false, `flags: the ${key} seat claims to be mapped outside Utah`);
  }

  // Statewide seats are untouched by any of this.
  for (const key of ["ussenate1", "ussenate2", "governor"]) {
    const lv = levelOf(W, key);
    must(lv, `the ${key} level is gone`);
    eq(lv.mapped, true, `flags: the statewide ${key} seat is not mapped, though a state is all it needs`);
    ok(!!lv.pid, `flags: the statewide ${key} seat stopped resolving for an Ohio reader`);
  }

  // A Utah reader keeps everything.
  const U = boot(LAYTON);
  const ur = U.pdxRepsForMe();
  eq(ur.districtsResolvable, true, "flags: a Utah reader lost the district flag");
  eq(ur.congressMapped, true, "flags: a Utah reader is not congress-mapped");
  eq((ur.levels.filter((l) => l.key === "house")[0] || {}).pid, "maloy",
    "flags: Utah's own U.S. House answer changed — the UGRC path must be untouched by the national one");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THREE BLANKS, THREE SENTENCES
// ═════════════════════════════════════════════════════════════════════════════
section("3 · a mapped blank and an unmapped blank do not read the same");
{
  // Ohio, no district pinned: the U.S. House seat is mappable and unplaced.
  const N = boot(COLUMBUS_0);
  const nh = levelOf(N, "house");
  must(nh, "the U.S. House level is gone");
  eq(nh.pid, null, "band: an Ohio reader with no district was handed a member anyway");
  eq(nh.mapped, true, "band: the unplaced U.S. House seat is not marked mapped, so it cannot offer a way forward");

  const out = band(N);
  has(out, "Not resolved for your area yet",
    "band: an unplaced district seat stopped saying so — there is no district number to print, and\n" +
    "    nothing may imply there is one");
  has(out, "set your address in the district finder",
    "band: a seat we CAN map but have not placed no longer points at the thing that would place it,\n" +
    "    so our own coverage reads as our own gap");
  has(out, "State Senate and State House",
    "band: the scope note no longer names the two seats that actually need lines we do not draw");
  lacks(out, "U.S. House, State Senate and State House",
    "band: the scope note still groups the U.S. House with the unmapped seats, which understates the\n" +
    "    coverage this pass added");
  has(out, "someone else",
    "band: the scope note dropped the promise that the remaining blanks are deliberate");

  // Ohio WITH a district: the row resolves, and the note stops offering the
  // finder for a seat that is already answered.
  const filled = band(boot(COLUMBUS));
  has(filled, "Joyce Beatty", "band: a resolved out-of-state U.S. House member is not painted");
  lacks(filled, "set your address in the district finder",
    "band: the finder prompt is printed for a reader whose U.S. House seat is already resolved");

  // A district we located with nobody on file keeps its own third sentence:
  // Ohio's 1st is claimed by a bare-state row, so the district is real and the
  // seat is not ours to fill.
  const gap = band(boot({ state: "Ohio", city: "Columbus", county: "Franklin County", district: "1" }));
  has(gap, "District 1 — no member on file yet",
    "band: a located district with no member on file lost the sentence that says which half is missing");
  lacks(gap, "District 1 — no member on file yet</span><span class=\"wrm-rowsub\">We&rsquo;d rather leave this blank than guess",
    "band: the located-gap row is wearing the unplaced-seat subtitle");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE MAP IS FETCHED ONE STATE AT A TIME, AND NEVER NATIONALLY
// ═════════════════════════════════════════════════════════════════════════════
section("4 · /find loads one state's congressional lines, after it has a state");
{
  const FIND = R("find.html");
  const MAPC = (() => {
    const a = FIND.indexOf("var GEO_URLS");
    must(a > 0, "the finder controller could not be located");
    return FIND.slice(a);
  })();

  // The vintage is the layer number, and the wrong one is a plausible answer to
  // a different map. Layer 4 is the 119th Congress, which is what the roster's
  // "Ohio · OH-15" keys are.
  has(MAPC, "TIGERweb/Legislative/MapServer/4/query",
    "map: the congressional layer is not TIGERweb's 119th-Congress layer — layer 0 is the 120th, a\n" +
    "    different map whose district numbers would be matched against a 119th roster");
  has(MAPC, "CD119", "map: the district field is not the 119th-Congress field");
  lacks(MAPC, "MapServer/0/query", "map: the 120th-Congress layer is being queried");

  // One row per state, and the state's own FIPS is what scopes the query.
  const tbl = MAPC.slice(MAPC.indexOf("var US_STATES"), MAPC.indexOf("function stateInfo"));
  must(tbl.length > 400, "the state table could not be sliced");
  eq((tbl.match(/:\d\d:/g) || []).length, 51,
    "map: the state table is not 51 rows (50 states + DC), so some reader's state has no lines at all");
  has(MAPC, "where=STATE%3D%27",
    "map: the congressional query is not scoped to one state, so a national layer is being fetched");

  // Utah keeps its own layer, which is a NEWER map than the Census one.
  has(MAPC, "if (layerType !== 'congress' || utahScope()) return GEO_URLS[layerType];",
    "map: Utah no longer keeps the UGRC congressional layer, so its court-ordered 2026 lines are being\n" +
    "    answered from the Census's older map");

  // Outside Utah the seat set narrows, so no Utah FeatureServer is ever asked
  // for an out-of-state pin.
  has(MAPC, "SEATS = utahScope() ? ALL_SEATS.slice() : ['congress'];",
    "map: the seat set does not narrow outside Utah, so an Ohio address fetches Utah's state house and\n" +
    "    state senate boundaries — 50 states' worth of files this pass exists not to fetch");
  has(MAPC, "function setScopeState(", "map: nothing sets the finder's state scope");
  has(MAPC, "function utahScope(", "map: the Utah-only test is no longer asked in one place");

  // The state is known BEFORE the boundary request goes out.
  const og = MAPC.slice(MAPC.indexOf("function onGeocoded("), MAPC.indexOf("window.pdxMapSearchAddress"));
  must(og.length > 800, "onGeocoded could not be sliced");
  ok(og.indexOf("setScopeState(hit.state)") > 0 && og.indexOf("setScopeState(hit.state)") < og.indexOf("Promise.all("),
    "map: the boundary request is built before the state is known, so the wrong state's lines are\n" +
    "    fetched for the address that was actually searched");
  has(og, "SEATS.map(function(t){", "map: onGeocoded still fetches a fixed three layers rather than the seats this scope has");
  has(og, "cdAtPointRemote(hit.lat, hit.lng)",
    "map: a point the simplified lines do not contain is no longer put to the unsimplified service, so a\n" +
    "    seam miss is a dead end");

  // AND THE MISS IS NEVER GUESSED. nearestDistrict exists for the two Utah
  // legislative layers; a nearest centroid across a whole state would be a coin
  // toss between two sitting members.
  const remote = MAPC.slice(MAPC.indexOf("function cdAtPointRemote("), MAPC.indexOf("window._pdxCongressAt"));
  must(remote.length > 200, "cdAtPointRemote could not be sliced");
  lacks(remote, "nearestDistrict", "map: the congressional seam fallback guesses at the nearest district");
  has(remote, "returnGeometry=false", "map: the point-intersect query drags a polygon back for an answer it does not draw");

  // The record is written with the state the reader actually landed in.
  const apply = MAPC.slice(MAPC.indexOf("function applyToLocation("), MAPC.indexOf("function escapeHtml("));
  must(apply.length > 400, "applyToLocation could not be sliced");
  lacks(apply, "loc.state = 'Utah';", "map: every saved location is still stamped Utah");
  has(apply, "loc.state = _scopeState || 'Utah';", "map: the saved state is not the scope the reader resolved in");
  has(apply, "loc.stateHouseDistrict  = '';",
    "map: a Utah legislative district survives a save made outside Utah, where it is somebody else's seat");

  // One pin, and a tap moves it rather than adding another.
  has(MAPC, "function dropPin(", "pin: there is no single marker owner");
  has(MAPC, "if (_marker && _map)", "pin: the previous marker is not removed, so taps accumulate pins");
  eq((MAPC.match(/L\.marker\(/g) || []).length, 1,
    "pin: a second marker constructor appeared — two owners is two pins the reader can see at once");
}

if (failures.length) {
  console.error(`\n✗ federal house locator: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  process.exit(1);
}
console.log(`\n✓ federal house locator: all ${passed} assertions passed — one state's lines at a time, one lookup from district to member, and three different blanks\n`);
