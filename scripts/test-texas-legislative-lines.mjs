#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-texas-legislative-lines.mjs — State House and State Senate lines for Texas
// ─────────────────────────────────────────────────────────────────────────────
// Texas is the second state whose two legislative chambers /find draws. The
// lines come from TIGERweb's 2024 State Legislative Districts layers (5 upper,
// 6 lower), queried one state at a time by FIPS — the same pattern as the
// congressional layer — and only after a geocode has said Texas. The resolver
// then names the sitting member for those seats only from a roster record that
// claims that chamber and that number.
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY. Opening it with a saved Texas record fetches no
//      boundary and draws no polygon.
//   2. A TEXAS ADDRESS RESOLVES BOTH CHAMBERS from the TIGERweb lines, and the
//      saved record carries both numbers.
//   3. A SEAM MISS IS ASKED, NOT GUESSED: a point the simplified lines do not
//      contain is put to the unsimplified layer, still scoped to Texas.
//   4. NO NATIONAL LAYER, EVER. Every TIGERweb request names one state's FIPS;
//      no legislative layer is asked for outside Texas and Utah, and Utah's
//      UGRC layers are never asked for a Texas pin.
//   5. THE CARD NAMES A MEMBER WHEN THE ROSTER HAS ONE, and says "no member on
//      file yet" when it does not. Every member it names is a record that
//      claims that exact chamber and number.
//   6. UTAH IS UNCHANGED: the resolver's legislative levels for Utah readers are
//      identical to HEAD's.
//
//   node scripts/test-texas-legislative-lines.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ texas legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };

const FIND = R("find.html");
const MAP = (() => {
  const a = FIND.indexOf("INTERACTIVE UTAH DISTRICT MAP");
  must(a > 0, "find.html carries no INTERACTIVE UTAH DISTRICT MAP banner");
  const b = FIND.indexOf("</script>", a);
  return FIND.slice(a, b);
})();

// ═════════════════════════════════════════════════════════════════════════════
// A driven finder: the real controller, a Leaflet stub that runs the real
// onEachFeature binding, and a network that answers TIGERweb and UGRC by URL.
// ═════════════════════════════════════════════════════════════════════════════
const sq = (w, s, e, n, props) => ({
  type: "Feature", properties: props,
  geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
});
async function driveFinder(opts) {
  const SRC = MAP.slice(MAP.indexOf("(function(){"));
  const mkEl = (id) => {
    let kid = null;
    const el = {
      id, innerHTML: "", textContent: "", value: "", className: "", disabled: false, style: {}, _cls: new Set(),
      classList: { add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); }, contains(c) { return el._cls.has(c); },
        toggle(c, on) { if (on === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else if (on) el._cls.add(c); else el._cls.delete(c); } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      addEventListener() {}, removeEventListener() {}, focus() {}, appendChild() {}, remove() {},
      querySelector() { return (kid = kid || mkEl(id + "-child")); }, querySelectorAll() { return []; },
    };
    return el;
  };
  const els = {};
  for (const id of ["district-map-modal", "pdx-district-map", "pdx-map-status", "pdx-map-status-text",
    "pdx-map-search-input", "pdx-map-search-note", "pdx-map-search-btn", "pdx-map-search-ico",
    "pdx-map-hint", "pdx-map-done", "pdx-sel-house", "pdx-sel-senate", "pdx-sel-congress",
    "pdx-map-missing", "pdx-map-save-only", "pdx-map-info", "pdx-map-info-label", "pdx-map-info-val",
    "pdx-map-info-ico", "pdx-map-result", "pdx-map-result-addr-text", "pdx-map-result-dist-label",
    "pdx-map-result-dist-val", "pdx-map-result-alt", "pdx-map-result-use", "pdx-congress-note",
    "pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) els[id] = mkEl(id);

  const timers = [];
  const added = [];
  const layerish = (tag) => {
    const o = { _tag: tag, _paths: [],
      on() { return o; }, off() { return o; }, addTo(m) { m.addLayer(o); return o; }, setStyle() { return o; },
      bindTooltip() { return o; }, bringToFront() { return o; }, bringToBack() { return o; },
      getBounds() { return { isValid: () => true, pad: () => ({}) }; },
      eachLayer(fn) { o._paths.forEach((pp) => fn(pp)); }, clearLayers() { return o; }, remove() { return o; } };
    return o;
  };
  const mapObj = {
    setView() { return mapObj; }, invalidateSize() { return mapObj; }, on() { return mapObj; },
    hasLayer(l) { return added.indexOf(l) >= 0; }, addLayer(l) { added.push(l); return mapObj; },
    removeLayer(l) { const i = added.indexOf(l); if (i >= 0) added.splice(i, 1); return mapObj; },
    fitBounds() { return mapObj; }, setMaxBounds() { return mapObj; }, getZoom() { return 6; },
    getCenter() { return { lat: 31, lng: -99 }; }, flyTo() { return mapObj; }, panTo() { return mapObj; },
  };
  const mkPath = (feature) => {
    const el = { _cls: new Set(), classList: { add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); }, contains(c) { return el._cls.has(c); } } };
    const p = { feature, _handlers: {},
      on(a, b) { if (typeof a === "string") p._handlers[a] = b; else Object.assign(p._handlers, a); return p; },
      off() { return p; }, bindTooltip() { return p; }, setStyle() { return p; }, getElement() { return el; },
      bringToFront() { return p; }, bringToBack() { return p; }, addTo(m) { m.addLayer(p); return p; }, remove() { return p; } };
    return p;
  };
  const geojsonLayers = [];
  const L = {
    map() { return mapObj; }, tileLayer() { return layerish("tiles"); },
    geoJSON(data, o) {
      const g = layerish("geojson");
      geojsonLayers.push(g);
      (data && data.features || []).forEach((f) => {
        const p = mkPath(f); g._paths.push(p);
        if (o && o.style) { try { p.setStyle(o.style(f)); } catch (e) {} }
        if (o && o.onEachFeature) o.onEachFeature(f, p);
      });
      return g;
    },
    marker() { return layerish("marker"); }, circleMarker() { return layerish("marker"); }, circle() { return layerish("circle"); },
    divIcon() { return {}; }, point(a, b) { return { x: a, y: b }; }, latLng(a, b) { return { lat: a, lng: b }; },
    latLngBounds() { return { isValid: () => true, pad: () => ({}) }; },
    control: { attribution: () => layerish("control") }, DomEvent: { stopPropagation() {}, preventDefault() {} },
  };
  const win = {
    console, JSON, Math, Date, Promise, String, Number, Boolean, Array, Object, RegExp, Error,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, setInterval() {}, clearInterval() {},
    navigator: { userAgent: "node", onLine: true }, L,
  };
  win.window = win;
  win.setTimeout = (fn, ms) => { timers.push({ fn, ms: ms || 0 }); return timers.length; };
  win.clearTimeout = () => {};
  win.requestAnimationFrame = (fn) => { timers.push({ fn, ms: 0 }); return timers.length; };
  const listeners = {};
  const jsonp = [];
  const answerJsonp = (url) => {
    jsonp.push(url);
    const m = /[?&]callback=([^&]+)/.exec(url);
    const f = m && win[m[1]];
    if (typeof f !== "function") return;
    f({ result: { geographies: { States: [{ NAME: opts.state }], Counties: [{ BASENAME: opts.county || "" }] } } });
  };
  win.document = {
    readyState: "loading", head: { appendChild() {} },
    body: { style: {}, classList: mkEl("body").classList, appendChild() {} }, documentElement: { style: {} },
    getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [],
    createElement: (t) => {
      const e = mkEl(t);
      if (t === "script") {
        let v = "";
        Object.defineProperty(e, "src", { set(x) { v = String(x); answerJsonp(v); }, get() { return v; } });
      }
      return e;
    },
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }, removeEventListener() {},
  };
  const wire = [];
  win.fetch = (u) => { wire.push("bare:" + String(u)); return new Promise(() => {}); };
  win._currentVoterLocation = opts.saved || {};
  win._hasUserLocation = !!opts.saved;
  win.location = { pathname: "/find", search: "", hash: "", href: "https://politidex.fyi/find", origin: "https://politidex.fyi", assign() {}, replace() {} };
  vm.runInContext(SRC, vm.createContext(win), { filename: "find.html#controller" });

  const HIT = Object.assign({ precise: true }, opts.hit);
  const resp = (j) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(j) });
  win.PDXFinder = {
    isOpen: () => true, markPending() {}, flush() {}, abort() {}, track: (x) => x,
    deadline: () => Promise.resolve({ timedOut: false, hit: HIT }),
    fetch(url) {
      const u = String(url);
      wire.push(u);
      const layer = (/MapServer\/(\d+)\/query/.exec(u) || [])[1];
      if (u.indexOf("tigerweb") > 0) {
        const point = u.indexOf("returnGeometry=false") > 0;
        const T = opts.tiger || {};
        const spec = T[layer];
        if (!spec) return resp({ type: "FeatureCollection", features: [] });
        if (point) return resp({ features: spec.point ? [{ attributes: spec.point }] : [] });
        return resp({ type: "FeatureCollection", features: spec.features });
      }
      const k = u.indexOf("UtahHouseDistricts") > 0 ? "house"
              : u.indexOf("UtahSenateDistricts") > 0 ? "senate"
              : u.indexOf("political_us_congress_districts") > 0 ? "congress" : null;
      if (k && opts.ugrc && opts.ugrc[k]) return resp({ type: "FeatureCollection", features: opts.ugrc[k] });
      return new Promise(() => {});
    },
  };
  win.PDXReturn = { settled() {}, consume() { return false; }, finderHref: () => "/find" };
  const mkStore = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem(k, v) { m[k] = String(v); }, removeItem(k) { delete m[k]; } }; };
  win.sessionStorage = mkStore();
  win.localStorage = mkStore();
  const pump = async (rounds = 60) => {
    for (let i = 0; i < rounds; i++) {
      const q = timers.splice(0, timers.length);
      for (const t of q) { try { t.fn(); } catch (e) {} }
      await Promise.resolve(); await null;
    }
  };
  for (const fn of listeners.DOMContentLoaded || []) fn({});
  await pump();
  const chip = (t) => els["pdx-sel-" + t].querySelector().textContent;
  const search = async (q) => { els["pdx-map-search-input"].value = q; win.pdxMapSearchAddress(); await pump(); };
  return { win, els, wire, jsonp, pump, chip, search, geojsonLayers, added };
}

// Fort Worth. Every square below holds the point; the seam scenario moves the
// legislative squares off it.
const FTW = { lat: 32.7555, lng: -97.3308 };
const around = (props, off = 0) => [sq(FTW.lng - 0.2 + off, FTW.lat - 0.2, FTW.lng + 0.2 + off, FTW.lat + 0.2, props)];
const TX_TIGER = {
  4: { features: around({ CD119: "12" }), point: { CD119: "12" } },
  5: { features: around({ SLDU: "010" }), point: { SLDU: "010" } },
  6: { features: around({ SLDL: "095" }), point: { SLDL: "095" } },
};
const TX_HIT = { lat: FTW.lat, lng: FTW.lng, name: "200 Texas St, Fort Worth, TX 76102", city: "Fort Worth", county: "Tarrant", state: "Texas" };
const tigerUrls = (wire) => wire.filter((u) => u.indexOf("tigerweb") >= 0);
const layerOf = (u) => (/MapServer\/(\d+)\/query/.exec(u) || [])[1];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the finder opens empty, even on a saved Texas record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const saved = { state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12",
                  stateHouseDistrict: "95", stateSenateDistrict: "10", mapSelected: true };
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: TX_TIGER, saved });
  F.win.openDistrictMapModal();
  await F.pump();
  eq(F.wire.filter((u) => !/^bare:/.test(u)).length, 0, "open: the finder fetched something on open");
  eq(F.wire.length, 0, "open: a bare fetch went out on open");
  eq(F.geojsonLayers.length, 0, "open: a district layer was built on open");
  eq(F.chip("house"), "District 95", "open: the saved Texas State House district is not seeded into its chip");
  eq(F.chip("senate"), "District 10", "open: the saved Texas State Senate district is not seeded into its chip");
  ok(F.els["pdx-layer-house"].style.display !== "none", "open: the State House toggle is hidden for a Texas reader");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a Texas address resolves State House and State Senate");
// ═════════════════════════════════════════════════════════════════════════════
{
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: TX_TIGER });
  eq(F.wire.length, 0, "search: something was fetched before the search");
  await F.search("200 Texas St, Fort Worth");
  eq(F.chip("house"), "District 95", "search: the Texas State House district did not resolve");
  eq(F.chip("senate"), "District 10", "search: the Texas State Senate district did not resolve");
  eq(F.chip("congress"), "District 12", "search: the U.S. House district stopped resolving in Texas");
  has(F.els["pdx-map-missing"].textContent, "All three districts set", "search: the bar does not call the Texas answer complete");
  const loc = F.win._currentVoterLocation;
  eq(loc.state, "Texas", "search: the record is not stamped Texas");
  eq(loc.stateHouseDistrict, "95", "search: the State House number did not reach the record");
  eq(loc.stateSenateDistrict, "10", "search: the State Senate number did not reach the record");
  eq(loc.district, "12", "search: the U.S. House number did not reach the record");

  const T = tigerUrls(F.wire);
  ok(T.some((u) => layerOf(u) === "5"), "search: the State Senate layer (5) was not fetched");
  ok(T.some((u) => layerOf(u) === "6"), "search: the State House layer (6) was not fetched");
  T.forEach((u) => has(u, "where=STATE%3D%2748%27", `search: a TIGERweb request is not scoped to Texas (${u.slice(0, 120)})`));
  T.forEach((u) => ok(["4", "5", "6"].indexOf(layerOf(u)) >= 0, `search: an unexpected TIGERweb layer was asked for (${layerOf(u)})`));
  lacks(F.wire.join("\n"), "UtahHouseDistricts", "search: Utah's State House layer was fetched for a Texas pin");
  lacks(F.wire.join("\n"), "UtahSenateDistricts", "search: Utah's State Senate layer was fetched for a Texas pin");
  lacks(F.wire.join("\n"), "where=1%3D1", "search: an unscoped (national) query went out");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a seam miss is asked of the unsimplified lines, not guessed");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seam = {
    4: TX_TIGER[4],
    5: { features: around({ SLDU: "009" }, 1), point: { SLDU: "010" } },
    6: { features: around({ SLDL: "094" }, 1), point: { SLDL: "095" } },
  };
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: seam });
  await F.search("200 Texas St, Fort Worth");
  eq(F.chip("house"), "District 95", "seam: the State House seam miss was not resolved by the point query");
  eq(F.chip("senate"), "District 10", "seam: the State Senate seam miss was not resolved by the point query");
  const pts = tigerUrls(F.wire).filter((u) => u.indexOf("returnGeometry=false") > 0 && ["5", "6"].indexOf(layerOf(u)) >= 0);
  eq(pts.length, 2, "seam: expected one point query per missed chamber");
  pts.forEach((u) => has(u, "where=STATE%3D%2748%27", "seam: the point query is not scoped to Texas"));

  // And when the authority has nothing either, the seat stays empty.
  const none = { 4: TX_TIGER[4], 5: { features: around({ SLDU: "009" }, 1) }, 6: { features: around({ SLDL: "094" }, 1) } };
  const G = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: none });
  await G.search("200 Texas St, Fort Worth");
  eq(G.chip("house"), "Not set", "seam: a State House seat nobody could place was filled anyway (a nearest-centroid guess)");
  eq(G.chip("senate"), "Not set", "seam: a State Senate seat nobody could place was filled anyway");
  has(G.els["pdx-map-missing"].textContent, "Still missing", "seam: the bar does not say the legislative seats are missing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no legislative layer outside Texas and Utah; Utah keeps UGRC");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CBUS = { lat: 39.96, lng: -82.99 };
  const F = await driveFinder({
    state: "Ohio",
    hit: { lat: CBUS.lat, lng: CBUS.lng, name: "1 High St, Columbus, OH", city: "Columbus", county: "Franklin", state: "Ohio" },
    tiger: { 4: { features: [sq(CBUS.lng - 0.2, CBUS.lat - 0.2, CBUS.lng + 0.2, CBUS.lat + 0.2, { CD119: "03" })] } },
  });
  await F.search("1 High St, Columbus");
  eq(F.chip("congress"), "District 3", "ohio: the U.S. House stopped resolving in Ohio");
  const T = tigerUrls(F.wire);
  ok(T.length > 0 && T.every((u) => layerOf(u) === "4"), `ohio: a legislative layer was fetched for an Ohio pin (${T.map(layerOf).join(",")})`);
  T.forEach((u) => has(u, "where=STATE%3D%2739%27", "ohio: a TIGERweb request is not scoped to Ohio"));
  eq(F.els["pdx-layer-house"].style.display, "none", "ohio: the State House toggle is offered in Ohio");
  eq(F.win._currentVoterLocation.stateHouseDistrict, "", "ohio: a State House number was written for an Ohio save");

  const UT = { lat: 40.7, lng: -111.9 };
  const U = await driveFinder({
    state: "Utah",
    hit: { lat: UT.lat, lng: UT.lng, name: "123 Main St, Layton, UT", city: "Layton", county: "Davis", state: "Utah" },
    ugrc: {
      house: [sq(-112.0, 40.6, -111.8, 40.8, { DIST: 15 })],
      senate: [sq(-112.0, 40.6, -111.6, 40.8, { DIST: 7 })],
      congress: [sq(-112.0, 40.6, -111.6, 40.8, { DISTRICT: 2 })],
    },
  });
  await U.search("123 Main St, Layton");
  eq(U.chip("house"), "District 15", "utah: the Utah State House chip changed");
  eq(U.chip("senate"), "District 7", "utah: the Utah State Senate chip changed");
  eq(U.chip("congress"), "District 2", "utah: the Utah U.S. House chip changed");
  eq(tigerUrls(U.wire).length, 0, "utah: a TIGERweb layer was fetched for a Utah pin");
  has(U.wire.join("\n"), "UtahHouseDistricts", "utah: Utah no longer reads its own UGRC State House layer");
}

// Source guards on the shape: one state per query, pinned vintage.
{
  has(MAP, "TIGERweb/Legislative/MapServer/5/query", "source: the State Senate layer is not TIGERweb's 2024 upper layer");
  has(MAP, "TIGERweb/Legislative/MapServer/6/query", "source: the State House layer is not TIGERweb's 2024 lower layer");
  lacks(MAP, "MapServer/1/query", "source: the 2026 upper layer is being queried");
  lacks(MAP, "MapServer/2/query", "source: the 2026 lower layer is being queried");
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1 };", "source: the TIGERweb legislative state list is not Texas alone");
}

// ═════════════════════════════════════════════════════════════════════════════
// The resolver and the card, on the real roster.
// ═════════════════════════════════════════════════════════════════════════════
const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "issue-colors.js", "person-link.js", "voter-hub-location.js", "compare-hub.js",
  "archive-browse.js", "seat-field.js", "ballot-breakdown.js", "who-represents-me.js"];
function boot(loc, override) {
  const win = makeSandbox();
  const st = {};
  win.localStorage = { getItem: (k) => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: (k) => { delete st[k]; } };
  win.sessionStorage = win.localStorage;
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  const by = {};
  const el = (id) => {
    const n = { id: id || "", innerHTML: "", textContent: "", style: {}, dataset: {}, children: [], attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {},
      querySelector() { return null; }, querySelectorAll() { return []; } };
    if (id) by[id] = n;
    return n;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => by[id] || null;
  win.document.body = el("body");
  win.document.addEventListener = () => {};
  ["who-represents-me", "wrm-reps", "voter-hub"].forEach(el);
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = (override && override[f]) || R(f);
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = loc;
  return win;
}
const levelOf = (w, key) => (w.pdxRepsForMe().levels || []).filter((l) => l.key === key)[0] || null;
const band = (w) => { w.PDXWhoRepresentsMe.sync(); return String(w.document.getElementById("wrm-reps").innerHTML); };
const TX = (sd, hd) => ({ state: "Texas", city: "Houston", county: "Harris County", district: "7",
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the card names a member when the roster has one, and nobody otherwise");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(TX("7", "95"));
  must(typeof W.pdxRepsForMe === "function" && typeof W._pdxStateLegSeat === "function", "the resolver did not load");
  const reps = W.pdxRepsForMe();
  eq(reps.legislativeMapped, true, "resolver: Texas is not legislatively mapped");
  eq(reps.districtsResolvable, false, "resolver: districtsResolvable went true in Texas — it still gates Utah's curated local offices");
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss.district, "7", "resolver: the Texas State Senate district did not reach the level");
  eq(ss.pid, "bettencourt_tx", "resolver: the sitting SD 7 member on file was not named");
  eq(ss.mapped, true, "resolver: the Texas State Senate level is not marked mapped");
  eq(sh.district, "95", "resolver: the Texas State House district did not reach the level");
  eq(sh.pid, null, "resolver: a State House member was named for a seat no roster record claims");
  eq(sh.mapped, true, "resolver: the Texas State House level is not marked mapped");

  const out = band(W);
  has(out, "Paul Bettencourt", "card: the sitting Texas State Senator on file is not on the card");
  has(out, "District 95 — no member on file yet", "card: the Texas State House row does not say nobody is on file");
  lacks(out, "only maps state legislative districts in", "card: a Texas reader is told their legislative lines are not drawn");

  // Every seat in both chambers: whoever is named is a record that claims it.
  const named = new Set();
  for (const [ch, n] of [["statesenate", 31], ["statehouse", 150]]) {
    for (let d = 1; d <= n; d++) {
      const pid = W._pdxStateLegSeat("Texas", ch, d);
      if (!pid) continue;
      named.add(pid);
      eq(W.pdxSeatClaim(pid, ch, d) === "mismatch", false, `roster: ${pid} was seated in ${ch} ${d}, a seat its record contradicts`);
      const rec = W.CMP_DATA[pid];
      ok(rec && String(rec.state).indexOf("Texas") === 0, `roster: ${pid} is not a Texas record`);
      ok(rec && new RegExp("^(SD|HD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name district ${d}`);
    }
  }
  eq(JSON.stringify([...named].sort()), JSON.stringify(["bettencourt_tx", "gutierrez_tx", "paxton_tx"]),
    "roster: the set of Texas legislators the lookup can name is not exactly the district-keyed records on file");
  eq(W._pdxStateLegSeat("Texas", "statesenate", 1), null, "roster: a member with no district on their record was placed in SD 1");
  eq(W._pdxStateLegSeat("Texas", "statehouse", 7), null, "roster: a State Senate record (SD 7) was seated in State House 7");
  eq(W._pdxStateLegSeat("Ohio", "statesenate", 7), null, "roster: an unmapped state resolved a legislator");

  // A Texas reader who has not pinned the legislative seats yet: mapped, blank, no number.
  const N = boot({ state: "Texas", city: "Houston", county: "Harris County", district: "7" });
  const nl = levelOf(N, "statehouse");
  eq(nl.district, null, "unpinned: a State House number appeared out of nothing");
  eq(nl.pid, null, "unpinned: a State House member appeared out of nothing");
  has(band(N), "set your address in the district finder", "unpinned: the row does not point at the finder that would fill it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Utah's legislative resolution is identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headVhl = HEAD("voter-hub-location.js");
  const UT_LOCS = [
    { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateHouseDistrict: "16", stateSenateDistrict: "7", mapSelected: true },
    { state: "Utah", city: "Provo", county: "Utah County", district: "3" },
    { state: "Utah", city: "Vernal", county: "Uintah County", district: "3", stateHouseDistrict: "68", stateSenateDistrict: "26", mapSelected: true },
    { state: "Utah" },
  ];
  for (const loc of UT_LOCS) {
    const now = boot(Object.assign({}, loc)).pdxRepsForMe();
    eq(now.legislativeMapped, true, `utah: ${loc.city || "state-only"} is not legislatively mapped`);
    if (!headVhl) continue;
    const was = boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }).pdxRepsForMe();
    const pick = (r) => JSON.stringify(r.levels.map((l) => [l.key, l.district, l.pid, l.mapped]));
    eq(pick(now), pick(was), `utah: ${loc.city || "state-only"}'s levels changed`);
    eq(now.districtsResolvable, was.districtsResolvable, `utah: ${loc.city || "state-only"}'s districtsResolvable changed`);
  }
  // And a state that is neither keeps its honest unmapped rows.
  const O = boot({ state: "Ohio", city: "Columbus", county: "Franklin County", district: "3", stateHouseDistrict: "18", stateSenateDistrict: "15" });
  for (const k of ["statesenate", "statehouse"]) {
    const l = levelOf(O, k);
    eq(l.mapped, false, `ohio: ${k} claims to be mapped`);
    eq(l.district, null, `ohio: ${k} carries a stray district number`);
    eq(l.pid, null, `ohio: ${k} named someone`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// The two lists that say "Texas" agree, and the shell moved.
// ═════════════════════════════════════════════════════════════════════════════
{
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1 };", "lists: the resolver's legislative state list is not Texas alone");
  const SW = R("sw.js");
  const v = Number((SW.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  ok(v >= 445, `sw: find.html changed and CACHE_VERSION is v${v}`);
  has(SW, "'/find.html',", "sw: find.html is no longer precached");
}

console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ texas legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ texas legislative lines: ${passed} passed — one state's lines at a time, a member only where the roster claims the seat`);
