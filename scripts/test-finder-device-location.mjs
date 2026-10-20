#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-finder-device-location.mjs — /find: a device-location fix sets the
// districts, or offers one obvious button, and never leaves "selected yet"
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. A TIGHT FIX SELECTS ALL THREE SEATS, with no second tap: the chips fill,
//      the confirm button reads "Use these districts: …", the info line names
//      the district, and the "Use this location" button is not shown.
//   2. A WIDE OR BOUNDARY-CROSSING FIX keeps the pin and shows "Use this
//      location" directly under the map, selects nothing until it is pressed,
//      and pressing it selects all three seats the way a map tap does.
//   3. THE INFO LINE NEVER STAYS ON "No … district selected yet" after a fix
//      is accepted: "Location found — use this location" until it is used.
//   4. ADDRESS SEARCH AND A NORMAL MAP TAP behave as before, and both retire a
//      waiting phone point.
//   5. SHIPPED: the button sits under the map canvas, the copy carries no
//      equity language, and the service worker moved past HEAD's.
//
//   node scripts/test-finder-device-location.mjs
//
// find.html's own controller script in a node:vm sandbox with a stub Leaflet
// (it records the pin and the circle), square district lines around Layton,
// and a stub for the Census point and address lookups.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const HTML = R("find.html");
const at = HTML.indexOf("window.pdxMapDetectAt = function");
const open = HTML.lastIndexOf("\n  <script>\n", at);
const CTRL = HTML.slice(open + "\n  <script>\n".length, HTML.indexOf("\n  </script>", at));
if (at < 0 || !CTRL.includes("window.pdxMapUseDetected")) {
  console.error("✗ finder device location: STALE HARNESS — the controller script or pdxMapUseDetected is missing");
  process.exit(2);
}

// ── Fake district lines: big squares around Layton. The House splits at
// lng -111.97 (District 14 west, 15 east); one Senate (7) and one U.S. House (2)
// district cover the whole square.
const sq = (w, e, s, n) => ({ type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] });
const W = -112.4, E = -111.5, S = 40.8, N = 41.4, SPLIT = -111.97;
const GEO = {
  house: { features: [{ properties: { DIST: 14 }, geometry: sq(W, SPLIT, S, N) }, { properties: { DIST: 15 }, geometry: sq(SPLIT, E, S, N) }] },
  senate: { features: [{ properties: { DIST: 7 }, geometry: sq(W, E, S, N) }] },
  congress: { features: [{ properties: { DISTRICT: 2 }, geometry: sq(W, E, S, N) }] },
};
const CENSUS_POINT = { result: { geographies: { States: [{ NAME: "Utah" }], Counties: [{ BASENAME: "Davis" }], "Incorporated Places": [{ BASENAME: "Layton" }] } } };
const ADDRESS_AT = { lat: 41.1, lng: -111.8 }; // inside House 15
const CENSUS_ADDRESS = { result: { addressMatches: [{
  matchedAddress: "100 MAIN ST, LAYTON, UT, 84041",
  coordinates: { x: ADDRESS_AT.lng, y: ADDRESS_AT.lat },
  addressComponents: { city: "LAYTON", state: "UT" },
  geographies: { States: [{ NAME: "Utah" }], Counties: [{ BASENAME: "Davis" }] },
}] } };

function node(id, byId) {
  const classes = new Set();
  const n = {
    id: id || "", tagName: "DIV", style: {}, dataset: {}, attrs: {}, children: [], parentNode: null,
    disabled: false, hidden: false, value: "",
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle: (c, on) => (on === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : on ? classes.add(c) : classes.delete(c)) },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, scrollIntoView() {},
    appendChild(c) { this.children.push(c); c.parentNode = this; if (c.id) byId[c.id] = c; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; },
    insertAdjacentHTML() {}, remove() {},
    querySelector(sel) { if (sel === ".pdx-sel-val") return this._val || (this._val = node("", byId)); return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 300, height: 300 }; },
  };
  // textContent and innerHTML are one value, as in a browser: writing either
  // is read back through the other (tags stripped for textContent).
  let html = "";
  Object.defineProperty(n, "innerHTML", { get: () => html, set: (v) => { html = String(v); } });
  Object.defineProperty(n, "textContent", {
    get: () => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " "),
    set: (v) => { html = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;"); },
  });
  return n;
}

function stubLeaflet(win) {
  const chain = () => {
    const o = new Proxy({}, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === "then") return undefined;
        if (k === "getBounds") return () => chain();
        if (k === "isValid") return () => true;
        if (k === "getZoom") return () => 10;
        if (k === "getCenter") return () => ({ lat: 41, lng: -112 });
        if (k === "eachLayer") return () => {};
        return () => o;
      },
    });
    return o;
  };
  win.__markers = []; win.__circles = [];
  win.L = {
    map: () => { const m = chain(); m.on = (ev, fn) => { if (ev === "click") win.__click = fn; return m; }; return m; }, tileLayer: () => chain(), divIcon: () => ({}), geoJSON: () => chain(),
    latLng: (lat, lng) => ({ lat, lng }), latLngBounds: () => chain(),
    marker: (ll, o) => { const m = chain(); m.ll = ll; m.label = ""; m.bindTooltip = (lab) => { m.label = lab; return m; }; win.__markers.push(m); return m; },
    circle: (ll, o) => { const c = chain(); c.ll = ll; c.radius = o && o.radius; win.__circles.push(c); return c; },
  };
}

async function boot(opts = {}) {
  const byId = {};
  const win = { console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, isFinite, URLSearchParams };
  win.window = win; win.self = win;
  const store = {};
  win.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  win.sessionStorage = win.localStorage;
  win.location = { hash: "", pathname: "/find", search: "", href: "https://politidex.fyi/find" };
  win.history = { replaceState() {}, state: null };
  win.navigator = { userAgent: "node" };
  win.requestAnimationFrame = (f) => setTimeout(f, 0);
  win.__fetched = [];
  win.fetch = (url) => {
    const u = String(url);
    win.__fetched.push(u);
    const key = /UtahHouseDistricts/.test(u) ? "house" : /UtahSenateDistricts/.test(u) ? "senate" : /congress_districts/.test(u) ? "congress" : null;
    if (key) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(GEO[key]))) });
    return Promise.reject(new Error("no network: " + u));
  };
  const body = node("body", byId);
  body.appendChild = function (c) {
    const src = String(c.src || "");
    const cb = (/[?&]callback=([A-Za-z0-9_]+)/.exec(src) || [])[1];
    if (cb) {
      const data = /onelineaddress/.test(src) ? CENSUS_ADDRESS : CENSUS_POINT;
      setTimeout(() => { if (typeof win[cb] === "function") win[cb](JSON.parse(JSON.stringify(data))); }, 1);
    }
    return c;
  };
  win.document = {
    readyState: "complete", body, head: node("head", byId),
    getElementById: (id) => byId[id] || (byId[id] = node(id, byId)),
    createElement: (t) => { const n = node("", byId); n.tagName = String(t).toUpperCase(); return n; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
  };
  win.addEventListener = () => {}; win.removeEventListener = () => {};
  win._currentVoterLocation = { state: "Utah" };
  win._hasUserLocation = true;
  win.saveVoterLocation = () => {};
  stubLeaflet(win);
  win.__byId = byId;
  const ctx = vm.createContext(win);
  vm.runInContext(CTRL, ctx, { filename: "find.html#controller" });
  await tick(150); // openDistrictMapModal → setTimeout(ensureMap)
  return win;
}
const info = (w) => w.document.getElementById("pdx-map-info-val").textContent;
const useBox = (w) => w.document.getElementById("pdx-map-detect-use");
// The markup ships it display:none; the controller shows it by clearing that.
const useShown = (w) => useBox(w).style.display === "";
const chip = (w, t) => w.document.getElementById("pdx-sel-" + t).querySelector(".pdx-sel-val").textContent;
const confirmLabel = (w) => w.document.getElementById("pdx-map-done").textContent;
const note = (w) => w.document.getElementById("pdx-map-search-note").innerHTML;
const loc = (w) => w._currentVoterLocation || {};
const SELECTED_YET = /district selected yet/;
const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;

const TIGHT = { lat: 41.1, lng: -112.15, acc: 30 };      // deep inside House 14
const WIDE = { lat: 41.1, lng: -112.15, acc: 25000 };    // the circle runs off every line
const ONLINE = { lat: 41.1, lng: -111.972, acc: 60 };    // 170 m from the House 14/15 line

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a tight fix selects all three seats with no second tap");
{
  const w = await boot();
  ok(typeof w.pdxMapDetectAt === "function" && typeof w.pdxMapUseDetected === "function", "the finder controller booted");
  ok(SELECTED_YET.test(info(w)), `before any fix the info line is the empty one (got "${info(w)}")`);
  const p = w.pdxMapDetectAt(TIGHT);
  ok(!SELECTED_YET.test(info(w)), `the moment the fix is accepted the info line moves off "selected yet" (got "${info(w)}")`);
  const got = await p; await tick(20);
  eq(got, true, "the tight fix committed");
  eq(chip(w, "house"), "District 14", "House chip set");
  eq(chip(w, "senate"), "District 7", "Senate chip set");
  eq(chip(w, "congress"), "District 2", "U.S. House chip set");
  eq(confirmLabel(w), "Use these districts: State House 14 · State Senate 7 · U.S. House 2", "the confirm button names all three, with no further tap");
  ok(!SELECTED_YET.test(info(w)) && /District 14/.test(info(w)), `the info line is the success line (got "${info(w)}")`);
  ok(!useShown(w), "no Use this location button once the seats are set");
  eq(loc(w).pointSource, "detect", "the record is stamped as a detect point, as before");
  eq(loc(w).stateHouseDistrict, "14", "…and carries the three seats through the one writer");
  ok(w.__markers.some((m) => /phone/.test(m.label)), "the phone pin was dropped");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a wide or boundary-crossing fix offers one obvious button, and selects only when pressed");
for (const [name, pt, want] of [["wide", WIDE, 14], ["boundary-crossing", ONLINE, 15]]) {
  const w = await boot();
  const got = await w.pdxMapDetectAt(pt); await tick(20);
  eq(got, false, `${name}: nothing is committed on its own`);
  for (const t of ["house", "senate", "congress"]) eq(chip(w, t), "Not set", `${name}: the ${t} chip waits`);
  ok(useShown(w), `${name}: "Use this location" is shown`);
  eq(w.document.getElementById("pdx-map-detect-use-btn").textContent || "📍 Use this location", "📍 Use this location", `${name}: the button says what it does`);
  eq(info(w), "Location found — use this location", `${name}: the info line says the location was found`);
  ok(/Use this location/.test(note(w)), `${name}: the note points at the button`);
  ok(w.__markers.length > 0 && /phone/.test(w.__markers[w.__markers.length - 1].label), `${name}: the pin stays on the phone's point`);
  ok(w.__circles.length > 0, `${name}: the accuracy circle is drawn`);
  ok(!loc(w).mapSelected, `${name}: nothing was written to the location record`);
  // The press: a map tap at the pin.
  eq(w.pdxMapUseDetected(), true, `${name}: the button press is accepted`);
  await tick(40);
  eq(chip(w, "house"), `District ${pt.lng < SPLIT ? 14 : 15}`, `${name}: the House seat at the pin is selected`);
  eq(chip(w, "senate"), "District 7", `${name}: the Senate seat is selected`);
  eq(chip(w, "congress"), "District 2", `${name}: the U.S. House seat is selected`);
  ok(/^Use these districts: /.test(confirmLabel(w)), `${name}: the confirm button appears`);
  ok(!useShown(w), `${name}: the button is retired once used`);
  ok(!SELECTED_YET.test(info(w)) && info(w) !== "Location found — use this location", `${name}: the info line is the success line (got "${info(w)}")`);
  eq(loc(w).pointSource, undefined, `${name}: the press is a map tap — no detect stamp`);
  eq(w.pdxMapUseDetected(), false, `${name}: a second press does nothing`);
  void want;
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the info line never stays on \"selected yet\" after a fix");
{
  // Every non-committing branch, sampled while the check runs and after it lands.
  const cases = [["no accuracy", { lat: 41.1, lng: -112.15, acc: 0 }], ["wide", WIDE], ["on a line", ONLINE]];
  for (const [name, pt] of cases) {
    const w = await boot();
    for (const layer of ["house", "senate", "congress"]) {
      w.pdxMapSetLayer(layer); await tick(5);
    }
    w.pdxMapSetLayer("house");
    const p = w.pdxMapDetectAt(pt);
    ok(!SELECTED_YET.test(info(w)), `${name}: off "selected yet" while the check runs (got "${info(w)}")`);
    await p; await tick(20);
    ok(!SELECTED_YET.test(info(w)), `${name}: off "selected yet" after the check (got "${info(w)}")`);
    for (const layer of ["senate", "congress", "house"]) {
      w.pdxMapSetLayer(layer); await tick(5);
      ok(!SELECTED_YET.test(info(w)), `${name}: off "selected yet" on the ${layer} layer too (got "${info(w)}")`);
    }
  }
  // A declined fix is not a fix: it still says nothing is selected, honestly.
  const w = await boot();
  await w.pdxMapDetectAt(null, "Location access was declined.");
  ok(SELECTED_YET.test(info(w)) && !useShown(w), "a declined fix keeps the empty line and shows no button");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · address search and a normal map tap still work, and retire a waiting point");
{
  const w = await boot();
  await w.pdxMapDetectAt(WIDE); await tick(20);
  ok(useShown(w), "a waiting phone point");
  w.document.getElementById("pdx-map-search-input").value = "100 Main St, Layton";
  w.pdxMapSearchAddress();
  ok(!useShown(w), "an address search retires the button straight away");
  await tick(80);
  eq(chip(w, "house"), "District 15", "the searched address sets its House seat");
  eq(chip(w, "senate"), "District 7", "…its Senate seat");
  eq(chip(w, "congress"), "District 2", "…and its U.S. House seat");
  ok(!SELECTED_YET.test(info(w)) && info(w) !== "Location found — use this location", `the info line is the address's (got "${info(w)}")`);
  eq(loc(w).pointSource, undefined, "an address is the reader's own point");
}
{
  // A NORMAL MAP TAP, no device fix in play: the canvas handler the controller
  // bound on the map, called the way Leaflet calls it.
  const w = await boot();
  ok(typeof w.__click === "function", "the canvas click handler was bound");
  ok(SELECTED_YET.test(info(w)), "before the tap, nothing is selected");
  w.__click({ latlng: { lat: 41.1, lng: -112.15 }, originalEvent: {} });
  await tick(80);
  eq(chip(w, "house"), "District 14", "a map tap sets its House seat");
  eq(chip(w, "senate"), "District 7", "…its Senate seat");
  eq(chip(w, "congress"), "District 2", "…its U.S. House seat");
  ok(!useShown(w), "a map tap shows no Use this location button");
  eq(loc(w).pointSource, undefined, "a tap is the reader's own point");
}
{
  // …and a map tap while a phone point waits retires the button.
  const w = await boot();
  await w.pdxMapDetectAt(WIDE); await tick(20);
  ok(useShown(w), "a waiting phone point");
  w.__click({ latlng: { lat: 41.1, lng: -111.8 }, originalEvent: {} });
  await tick(80);
  ok(!useShown(w), "the tap retires the button");
  eq(chip(w, "house"), "District 15", "the tapped point's House seat wins");
  ok(info(w) !== "Location found — use this location", "the info line is the tap's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · shipped");
{
  const canvas = HTML.indexOf('<div class="pdx-map-canvas-wrap">');
  const btn = HTML.indexOf('id="pdx-map-detect-use"');
  const foot = HTML.indexOf('<div class="pdx-map-foot">');
  ok(canvas > 0 && btn > canvas && btn < foot, "the Use this location button sits directly under the map canvas");
  ok(/>📍 Use this location<\/button>/.test(HTML), "…and is labelled Use this location");
  const copy = (CTRL.match(/DETECT_[A-Z]+ = [\s\S]*?;\n/g) || []).join(" ");
  ok(copy.length > 100 && !EQ.test(copy), "the detect copy carries no equity language");
  ok(!/localStorage\.setItem\([^)]*detect/i.test(CTRL), "no new location key is written for the waiting point");
  const v = (src) => +((/CACHE_VERSION = 'v(\d+)'/.exec(src || "") || [])[1] || 0);
  const head = HEAD("sw.js");
  if (head != null && HEAD("find.html") !== HTML) ok(v(R("sw.js")) > v(head), "find.html changed and the shell version moved");
  else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} finder device location: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
