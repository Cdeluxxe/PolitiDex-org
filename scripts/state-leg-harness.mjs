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
// DECLARED EDITS TO AN EARLIER CYCLE'S FILES. A later pass may change an
// earlier state's ballot file only by a change named here, and the baseline
// every suite compares against is HEAD with exactly these applied — so the
// change is visible in one place and nothing else in those files may move.
//   · The contested-boards voice pass retitled Minnesota's HF 2484 from
//     "Capital investment (bonding), 2026" to "Bonding bill, 2026" (the
//     Revisor's own one-line description), because a board that takes a voice
//     carries no investment language. The measure, its effect line, its acts
//     and its links are unchanged.
//
// A DECLARED EDIT IS RETIRED ONCE IT LANDS. When the pass that made it is
// committed, HEAD already holds the edit, and re-applying it would build a
// baseline nobody ever wrote (an inserted block, twice). So each edit applies
// only while HEAD still lacks its result, and a landed one is removed from
// this list: Washington's position edits to voter-hub-location.js and
// cmp-data.js were declared here for that pass and are retired now that HEAD
// carries them. (The Minnesota retitle has landed too; its `from` is no longer
// in HEAD, so it is already a no-op, and it is kept as the record of why
// those files differ from the pass that wrote them.)
//   · The four-state pass (Maine, Colorado, Minnesota, Nevada) taught
//     voter-hub-location.js's U.S. House classifier to read a House leadership
//     or committee title as a House seat, as its Senate classifier already did,
//     so Neguse's, Craig's and Emmer's rows can hold CO-2, MN-2 and MN-6. No
//     other state's row with such a title names a district, so no other seat
//     moves (test-four-state-deepen.mjs walks the neighbours).
const HOUSE_TITLE_FROM = "    if (/^(representative|congress(man|woman|person|member))\\b/i.test(o)) return true;\n    return false;\n";
const HOUSE_TITLE_TO = "    if (/^(representative|congress(man|woman|person|member))\\b/i.test(o)) return true;\n" +
  "    // A House floor leader, whip, committee chair or ranking member is a seat in\n" +
  "    // the United States House, as the Senate's are in its classifier: \"House\n" +
  "    // Majority Whip\", \"Assistant House Democratic Leader\", \"House Agriculture\n" +
  "    // Ranking Member\". A record like this names its district only on `district`,\n" +
  "    // so one without it still holds no seat here.\n" +
  "    if (/^(assistant\\s+)?house\\b/i.test(o) && /\\b(leader|whip|chair|ranking\\s+member)\\b/i.test(o)) return true;\n" +
  "    return false;\n";
const DECLARED_EDITS = [
  { file: /^(?:mn-ballot-2026\.js|district-mn-(?:hd|sd)-\d+\.html)$/,
    from: "Capital investment (bonding), 2026", to: "Bonding bill, 2026" },
  { file: /^voter-hub-location\.js$/, from: HOUSE_TITLE_FROM, to: HOUSE_TITLE_TO },
  // The Mississippi, Vermont, Michigan and Tennessee pass gave Vermont's Senate
  // positions and a per-district member count in voter-hub-location.js, and
  // taught district-board.js, district-voice.js and district-board.mts the
  // position shape on either chamber. The exact pairs, each with a line of
  // context, are scripts/state-leg-ms-vt-mi-tn-edits.json; several are pure
  // insertions, so each applies only while HEAD lacks its result (`once`).
  ...Object.entries(JSON.parse(readFileSync(join(ROOT, "scripts/state-leg-ms-vt-mi-tn-edits.json"), "utf8")))
    .flatMap(([file, pairs]) => pairs.map(([from, to]) => ({ file: new RegExp(`^${file.replace(/[./]/g, "\\$&")}$`), from, to, once: true }))),
];
// The same pairs, undone: an earlier pass's suite that compares one of those
// files against its own older baseline reads it with this pass's edits lifted out.
export const undoMsVtMiTnEdits = (f, src) => DECLARED_EDITS.filter((d) => d.once && d.file.test(f))
  .reduce((s, d) => s.split(d.to).join(d.from), String(src));
// HEAD exactly as committed, with no declared edit applied.
export const RAW_HEAD = (f) => gitHead(f);
const gitHead = (f) => {
  // maxBuffer: cmp-data.js is past execFileSync's 1 MB default, and a baseline
  // that silently reads null would skip every comparison against it.
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { return null; }
};
export const HEAD = (f) => {
  let src = gitHead(f);
  if (src === null) return null;
  for (const d of DECLARED_EDITS) {
    if (!d.file.test(f) || src.indexOf(d.to) >= 0 && (d.once || src.indexOf(d.from) < 0)) continue;
    src = src.split(d.from).join(d.to);
  }
  return src;
};
// DECLARED MIGRATIONS. The contested-cycle suites hold that no pass adds a
// migration. The one exception is named here: the contested-boards voice pass
// seeds a dd_districts row for each contested board that now takes a voice
// (rows only, no schema change), because a comment, a vote or a residency row
// on a seat with no dd_districts row would fail at the foreign key. California's
// density pass seeds its seven contested boards the same way, in its own file.
// A PASS'S OWN BASELINE. A suite that asserts what ITS pass added ("the only
// new rows are…", "the one new migration is…") must compare against the tree
// before that pass, not HEAD: once the pass lands, HEAD already holds the
// additions and the check would see none. AT(rev)(f) reads a file at a fixed
// commit; the two baselines are the commit each density pass was built on.
//   PRE_13_STATE  006b7df — before the thirteen density states took a voice
//   PRE_CA_WA     d961b02 — before California's and Washington's passes
// Every "nothing else moved" check still compares against HEAD, the tree
// as it is now.
export const PRE_13_STATE = "006b7df";
export const PRE_CA_WA = "d961b02";
export const AT = (rev) => (f) => {
  try { return execFileSync("git", ["show", `${rev}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { return null; }
};
// The worker version each pass moved to. After a pass lands, "moved one step
// past HEAD" is no longer true of it; what stays true is that the worker is at
// least that version and its precache list did not grow.
export const PASS_WORKER = { "13-state": 483, ca: 484, wa: 485 };
export const DECLARED_MIGRATIONS = ["20261130000000_dd_districts_contested_legislative_board_seats.sql",
  "20261201000000_dd_districts_california_contested_board_seats.sql",
  "20261202000000_dd_districts_washington_contested_board_seats.sql"];
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
// THE ROSTER WITHOUT THE SIX STATES' SHELLS. The lines-only suites for
// Nebraska, South Dakota, Idaho, Montana, Alaska and Rhode Island were written
// when no legislator of theirs was on file: they pin that a mapped seat with no
// record names nobody, and seat their own fixture records on empty seats. The
// six-state pass put every sitting member on file (test-six-state-deepen.mjs
// holds those), so those suites boot this roster — cmp-data.js with that pass's
// two blocks carved out — and keep testing what they were written to test.
export const SIX_STATE_BANNERS = [
  "// ── Sitting state legislators, Nebraska, South Dakota, Idaho, Montana, Alaska and Rhode Island — roster shells (Oct 2026)",
  "// ── 2026 state legislative candidates, Nebraska, South Dakota, Idaho, Montana, Alaska and Rhode Island (Oct 2026)",
];
export const withoutSixStateShells = (src) => {
  let out = String(src);
  for (const b of SIX_STATE_BANNERS) {
    const a = out.indexOf(b);
    if (a < 0) continue;
    const z = out.indexOf("\n// ── ", a + b.length);
    if (z < 0) throw new Error("state-leg-harness: a six-state block has no following banner");
    out = out.slice(0, a) + out.slice(z + 1);
  }
  // …and the pass's two edits outside those blocks: the cross-seat entries it
  // appended to the candidacies table, and the district it gave Don Bacon.
  const c = out.indexOf(",\n // ── Sitting Nebraska, South Dakota, Idaho, Montana, Alaska and Rhode Island\n");
  if (c >= 0) out = out.slice(0, c) + "\n" + out.slice(out.indexOf("\n};", c) + 1);
  out = out.replace('  "state": "Nebraska",\n  "district": "2",\n  "party": "R",', '  "state": "Nebraska",\n  "party": "R",');
  return out;
};
let _noSix = null;
export function bootWithoutSixStateShells(loc, override) {
  if (_noSix === null) _noSix = withoutSixStateShells(R("cmp-data.js"));
  return boot(loc, Object.assign({ "cmp-data.js": _noSix }, override || {}));
}
// THE ROSTER WITHOUT THE FOUR STATES' PASS. Maine, Colorado, Minnesota and
// Nevada were boarded whole after the Minnesota, Colorado and Nevada contested
// cycles were written; those suites pin that a seat outside their races names
// nobody and that a challenger has no row. test-four-state-deepen.mjs holds the
// four-state pass, so those suites boot this roster — cmp-data.js with that
// pass's two blocks and its candidacies carved out, and every existing row it
// edited (a district set, a seat named) put back as it stood before the pass —
// and keep testing what they were written to test. It reads the same on the
// working tree and on any later HEAD.
export const FOUR_STATE_BANNERS = [
  "// ── Sitting state legislators, Maine, Colorado, Minnesota and Nevada — roster shells (Oct 2026)",
  "// ── 2026 state legislative candidates, Maine, Colorado, Minnesota and Nevada (Oct 2026)",
];
const PRE_FOUR_STATE = "76a69b7";
let _preFourRows = null;
const rowBlock = (src, pid) => {
  const a = src.indexOf(`\n "${pid}": {\n`);
  if (a < 0) return null;
  const z = src.indexOf("\n },", a);
  return z < 0 ? null : src.slice(a, z + 4);
};
export const withoutFourStateShells = (src) => {
  let out = String(src);
  for (const b of FOUR_STATE_BANNERS) {
    const a = out.indexOf(b);
    if (a < 0) continue;
    const z = out.indexOf("\n// ── ", a + b.length);
    if (z < 0) throw new Error("state-leg-harness: a four-state block has no following banner");
    out = out.slice(0, a) + out.slice(z + 1);
  }
  const c = out.indexOf(",\n // ── Sitting Maine, Colorado, Minnesota and Nevada legislators");
  if (c >= 0) out = out.slice(0, c) + out.slice(out.indexOf(",\n // ── Sitting Nebraska", c));
  if (_preFourRows === null) {
    const rec = JSON.parse(R("db/roster-state-legislators-me-co-mn-nv-2026-oct.json"));
    const pre = AT(PRE_FOUR_STATE)("cmp-data.js");
    if (pre === null) throw new Error("state-leg-harness: no baseline at " + PRE_FOUR_STATE);
    _preFourRows = [...rec.districtSet, ...rec.seatedFromCandidacy, ...rec.usHouseDistrictSet].map((r) => [r.pid, rowBlock(pre, r.pid)]);
  }
  for (const [pid, was] of _preFourRows) {
    const now = rowBlock(out, pid);
    if (now !== null && was !== null) out = out.replace(now, was);
  }
  return out;
};
let _noFour = null;
export function bootWithoutFourStateShells(loc, override) {
  if (_noFour === null) _noFour = withoutFourStateShells(R("cmp-data.js"));
  return boot(loc, Object.assign({ "cmp-data.js": _noFour }, override || {}));
}
// Every whole-state pass carved out — the latest first, because each pass's
// candidacies sit ahead of the one before it in the table.
let _noWhole = null;
export function bootWithoutWholeStateShells(loc, override) {
  if (_noWhole === null) _noWhole = withoutSixStateShells(withoutFourStateShells(withoutMsVtMiTnShells(R("cmp-data.js"))));
  return boot(loc, Object.assign({ "cmp-data.js": _noWhole }, override || {}));
}
// THE ROSTER WITHOUT THE MISSISSIPPI, VERMONT, MICHIGAN AND TENNESSEE PASS, for
// the Michigan contested cycle, which pins that a seat outside its races names
// nobody: the pass's two blocks and its candidacies carved out, and every
// existing row it edited (a seat named, a district set) put back as it stood
// before the pass. It reads the same on the working tree and on any later HEAD.
export const MS_VT_MI_TN_BANNERS = [
  "// ── Sitting state legislators, Mississippi, Vermont, Michigan and Tennessee — roster shells (Oct 2026)",
  "// ── 2026 state legislative candidates, Michigan, Tennessee and Vermont (Oct 2026)",
];
let _preMvmtRows = null;
export const withoutMsVtMiTnShells = (src) => {
  let out = String(src);
  for (const b of MS_VT_MI_TN_BANNERS) {
    const a = out.indexOf(b);
    if (a < 0) continue;
    const z = out.indexOf("\n// ── ", a + b.length);
    if (z < 0) throw new Error("state-leg-harness: an ms/vt/mi/tn block has no following banner");
    out = out.slice(0, a) + out.slice(z + 1);
  }
  const c = out.indexOf(",\n // ── Sitting Mississippi, Michigan, Tennessee and Vermont legislators who are");
  if (c >= 0) out = out.slice(0, c) + out.slice(out.indexOf(",\n // ── Sitting Maine, Colorado", c));
  if (_preMvmtRows === null) {
    const rec = JSON.parse(R("db/roster-state-legislators-ms-vt-mi-tn-2026-oct.json"));
    const pre = AT(PRE_MS_VT_MI_TN)("cmp-data.js");
    if (pre === null) throw new Error("state-leg-harness: no baseline at " + PRE_MS_VT_MI_TN);
    _preMvmtRows = [...rec.seatedFromCandidacy, ...rec.usHouseDistrictSet].map((r) => [r.pid, rowBlock(pre, r.pid)]);
  }
  for (const [pid, was] of _preMvmtRows) {
    const now = rowBlock(out, pid);
    if (now !== null && was !== null) out = out.replace(now, was);
  }
  return out;
};
let _noMvmt = null;
export function bootWithoutMsVtMiTnShells(loc, override) {
  if (_noMvmt === null) _noMvmt = withoutMsVtMiTnShells(R("cmp-data.js"));
  return boot(loc, Object.assign({ "cmp-data.js": _noMvmt }, override || {}));
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
// THE CONTESTED-CYCLE ROSTER BLOCKS. Minnesota's, Colorado's and Nevada's
// passes each added one block of identity-only shells (mn-, co- and
// nv-ballot-2026.js). With every such block lifted out of both sides,
// cmp-data.js must be HEAD's byte for byte, and every row in a block must be
// a sitting member in that state's contested races, and no one else.
const SHELL_BLOCKS = [
  { code: "mn", state: "Minnesota" },
  { code: "co", state: "Colorado" },
  { code: "nv", state: "Nevada" },
  { code: "wa", state: "Washington" },
].map((b) => ({ ...b, re: new RegExp(`// ── Sitting ${b.state} legislators in the contested 2026 races[\\s\\S]*?(?=// ── )`) }));
// THE FOUR-STATE PASS. Maine, Colorado, Minnesota and Nevada were boarded whole:
// roster rows added or given their district in those four states, and
// candidacies of their members added (db/roster-state-legislators-me-co-mn-nv-
// 2026-oct.json is the record). With those four states' rows and candidacies
// set aside on both sides, the roster must be HEAD's, row for row, and every
// other table cmp-data.js publishes must be HEAD's.
const FOUR_STATES = new Set(["Maine", "Colorado", "Minnesota", "Nevada"]);
function fourStateRowsOnly(now, was) {
  const load = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w; };
  let A, B;
  try { A = load(now); B = load(was); } catch (e) { return false; }
  const inFour = (r) => !!r && FOUR_STATES.has(String(r.state || "").split(" \u00b7")[0].trim());
  const outside = (T) => JSON.stringify(Object.keys(T || {}).filter((k) => !inFour(T[k])).map((k) => [k, T[k]]));
  if (outside(A.CMP_DATA) !== outside(B.CMP_DATA) || outside(A.CMP_CANDIDACIES) !== outside(B.CMP_CANDIDACIES)) return false;
  // A row that was outside the four cannot have been moved into them.
  for (const k of Object.keys(B.CMP_DATA || {})) if (!inFour(B.CMP_DATA[k]) && inFour((A.CMP_DATA || {})[k])) return false;
  const rest = (w) => JSON.stringify(Object.keys(w).filter((k) => k !== "window" && k !== "CMP_DATA" && k !== "CMP_CANDIDACIES").sort().map((k) => [k, typeof w[k] === "function" ? String(w[k]) : w[k]]));
  return rest(A) === rest(B);
}
// THE MISSISSIPPI, VERMONT, MICHIGAN AND TENNESSEE PASS, the same way: with
// those four states' rows and candidacies set aside on both sides, the roster
// must be HEAD's, row for row, and every other table cmp-data.js publishes too.
export const PRE_MS_VT_MI_TN = "69376e9";
const MS_VT_MI_TN = new Set(["Mississippi", "Vermont", "Michigan", "Tennessee"]);
const MS_VT_MI_TN_DOC_RE = /^district-(?:ms|vt|mi|tn)-(?:(?:cd|hd|sd)-\d+(?:-p\d)?|gov)\.html$/;
function statesRowsOnly(now, was, STATES) {
  const load = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w; };
  let A, B;
  try { A = load(now); B = load(was); } catch (e) { return false; }
  const inS = (r) => !!r && STATES.has(String(r.state || "").split(" \u00b7")[0].trim());
  const outside = (T) => JSON.stringify(Object.keys(T || {}).filter((k) => !inS(T[k])).map((k) => [k, T[k]]));
  if (outside(A.CMP_DATA) !== outside(B.CMP_DATA) || outside(A.CMP_CANDIDACIES) !== outside(B.CMP_CANDIDACIES)) return false;
  for (const k of Object.keys(B.CMP_DATA || {})) if (!inS(B.CMP_DATA[k]) && inS((A.CMP_DATA || {})[k])) return false;
  const rest = (w) => JSON.stringify(Object.keys(w).filter((k) => k !== "window" && k !== "CMP_DATA" && k !== "CMP_CANDIDACIES").sort().map((k) => [k, typeof w[k] === "function" ? String(w[k]) : w[k]]));
  return rest(A) === rest(B);
}
function shellBlocksOnly(now, was) {
  const strip = (src) => SHELL_BLOCKS.reduce((s, b) => s.replace(b.re, ""), src);
  if (strip(now) !== strip(was)) return false;
  for (const b of SHELL_BLOCKS) {
    const m = b.re.exec(now);
    if (!m) continue;
    const M = ballotModule(R(`${b.code}-ballot-2026.js`), b.code);
    const inRace = new Set(M.RACES.flatMap((r) => r.field.filter((c) => c.pid).map((c) => c.pid)));
    const pids = [...m[0].matchAll(/^ "([a-z0-9_]+)": \{$/gm)].map((x) => x[1]);
    // Every row in the block is a race member under this state's suffix, and
    // every race member is either in the block or already on HEAD's roster
    // (Nevada's Senate 8 incumbent was, and her row is not touched).
    const inBlock = new Set(pids);
    if (!(pids.length > 0 && pids.every((p) => inRace.has(p) && p.endsWith(`_${b.code}`)))) return false;
    if (![...inRace].every((p) => inBlock.has(p) || was.indexOf(`\n "${p}": {`) >= 0)) return false;
  }
  return true;
}
export function settled(f) {
  const now = R(f), was = HEAD(f);
  if (now === was) return true;
  if (now === null) return false;
  if (f === "cmp-data.js") return shellBlocksOnly(now, was) || fourStateRowsOnly(now, was) || statesRowsOnly(now, was, MS_VT_MI_TN);
  // A board document this pass opened in one of its four states has no HEAD
  // copy until it lands; it is the generator's, and test-ms-vt-mi-tn-deepen.mjs
  // holds every one of them.
  if (was === null) return MS_VT_MI_TN_DOC_RE.test(f) && AT(PRE_MS_VT_MI_TN)(f) === null;
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
