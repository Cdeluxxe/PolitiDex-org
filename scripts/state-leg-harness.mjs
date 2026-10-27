// ─────────────────────────────────────────────────────────────────────────────
// state-leg-harness.mjs — shared drivers for the state legislative line suites
// ─────────────────────────────────────────────────────────────────────────────
// Not a test on its own (the runner globs test-*.mjs). Two drivers, both over
// the real shipped code:
//
//   driveFinder(opts)  the real /find controller, a Leaflet stub that runs the
//                      real onEachFeature binding, and a network that answers
//                      TIGERweb by layer and UGRC by FeatureServer name. Every
//                      request is recorded in `wire`.
//   boot(loc, over)    the real resolver, roster and Who Represents Me band in
//                      a sandbox; `over` swaps one file's source (for HEAD
//                      comparisons).
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const R = (f) => readFileSync(join(ROOT, f), "utf8");
export const HEAD = (f) => {
  // maxBuffer: cmp-data.js is past execFileSync's 1 MB default, and a baseline
  // that silently reads null would skip every comparison against it.
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { return null; }
};
export const FIND = R("find.html");
export const MAP = (() => {
  const a = FIND.indexOf("INTERACTIVE UTAH DISTRICT MAP");
  if (a < 0) throw new Error("find.html carries no INTERACTIVE UTAH DISTRICT MAP banner");
  return FIND.slice(a, FIND.indexOf("</script>", a));
})();

export const sq = (w, s, e, n, props) => ({
  type: "Feature", properties: props,
  geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
});
export async function driveFinder(opts) {
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

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "issue-colors.js", "person-link.js", "voter-hub-location.js", "compare-hub.js",
  "archive-browse.js", "seat-field.js", "ballot-breakdown.js", "who-represents-me.js"];
export function boot(loc, override) {
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
export const levelOf = (w, key) => (w.pdxRepsForMe().levels || []).filter((l) => l.key === key)[0] || null;
export const band = (w) => { w.PDXWhoRepresentsMe.sync(); return String(w.document.getElementById("wrm-reps").innerHTML); };
export const tigerUrls = (wire) => wire.filter((u) => u.indexOf("tigerweb") >= 0);
export const layerOf = (u) => (/MapServer\/(\d+)\/query/.exec(u) || [])[1];

// SETTLED: a file is HEAD's, or the only thing that moved is a contested
// race's field growing (test-full-candidate-lists.mjs holds those names).
// A ballot file keeps its seats, its measures, its acts, every name HEAD
// listed exactly as HEAD listed it, and its Who Represents Me block; a board
// is HEAD's byte for byte outside the race it prints. Every other file must
// be byte-identical.
const RACE_BLOCK = /    <!-- THE RACE: [\s\S]*?\n    <\/div>\n/;
const ballotModule = (src, code) => {
  const w = {}; w.window = w;
  vm.runInContext(src, vm.createContext(w));
  return w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`];
};
// The one roster block the Minnesota pass added (mn-ballot-2026.js): with it
// lifted out, cmp-data.js must be HEAD's byte for byte, and every row in it
// must be a sitting member in one of Minnesota's contested races.
const MN_SHELLS = /\/\/ ── Sitting Minnesota legislators in the contested 2026 races[\s\S]*?(?=\/\/ ── Current candidates outside Utah)/;
function mnShellsOnly(now, was) {
  const m = MN_SHELLS.exec(now);
  if (!m || now.replace(MN_SHELLS, "") !== was) return false;
  const M = ballotModule(R("mn-ballot-2026.js"), "mn");
  const inRace = new Set(M.RACES.flatMap((r) => r.field.filter((c) => c.pid).map((c) => c.pid)));
  const pids = [...m[0].matchAll(/^ "([a-z0-9_]+)": \{$/gm)].map((x) => x[1]);
  return pids.length > 0 && pids.length === inRace.size && pids.every((p) => inRace.has(p) && /_mn$/.test(p));
}
export function settled(f) {
  const now = R(f), was = HEAD(f);
  if (now === was) return true;
  if (was === null || now === null) return false;
  if (f === "cmp-data.js") return mnShellsOnly(now, was);
  const bf = /^([a-z]{2})-ballot-2026\.js$/.exec(f);
  if (bf) {
    const A = ballotModule(now, bf[1]), B = ballotModule(was, bf[1]);
    if (!A || !B) return false;
    if (JSON.stringify(A.MEASURES) !== JSON.stringify(B.MEASURES) || JSON.stringify(A.ACTS) !== JSON.stringify(B.ACTS)) return false;
    if (JSON.stringify(A.RACES.map((r) => r.seat)) !== JSON.stringify(B.RACES.map((r) => r.seat))) return false;
    for (const hr of B.RACES) {
      const r = A.race(hr.chamber, hr.district);
      if (!r || JSON.stringify(r.field.slice(0, hr.field.length)) !== JSON.stringify(hr.field)) return false;
      for (const c of hr.field) if (c.pid) {
        const lv = { key: hr.chamber, district: String(hr.district) };
        if (A.seatActHtml(c.pid, lv) !== B.seatActHtml(c.pid, lv)) return false;
      }
    }
    return true;
  }
  if (/^district-[a-z]{2}-(?:hd|sd)-\d+\.html$/.test(f)) {
    const a = RACE_BLOCK.exec(now), b = RACE_BLOCK.exec(was);
    return !!a && !!b && now.replace(RACE_BLOCK, "") === was.replace(RACE_BLOCK, "");
  }
  return false;
}
