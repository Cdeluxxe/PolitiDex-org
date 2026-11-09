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
  // The five-location-tests pass taught voter-hub-location.js to merge the
  // reader's own state's roster-seats/<state>.js rows into its roster on a
  // document with no cmp-data.js, and to fetch that one file. No walk, no
  // classifier and no seat rule moved; on a document carrying cmp-data.js the
  // resolver reads exactly what it did. The pairs are
  // scripts/state-leg-location-tests-edits.json.
  ...Object.entries(JSON.parse(readFileSync(join(ROOT, "scripts/state-leg-location-tests-edits.json"), "utf8")))
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
  // THE ELECTION-DAY WAVE'S ROSTER EDITS ARE DECLARED TOO (see electionDayOnly
  // below): while HEAD lacks the wave's block, the baseline cmp-data.js is the
  // tree's — but only when the tree differs from HEAD by exactly that block and
  // the wave's declared districts, and by nothing else. Once the wave lands,
  // HEAD carries both and this is a no-op.
  if (f === "cmp-data.js" && src.indexOf(EDAY_BANNER) < 0) {
    const now = R(f);
    if (electionDayOnly(now, src)) return now;
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
// FROZEN PRECACHE BASELINE. Several suites check that their pass "precached
// nothing new" by comparing sw.js against the commit the pass was built on.
// Later passes (USA Voice, related-issues, my-stances, Sunlight, AIPAC and the
// rest through v543) grew the list legitimately, so that comparison stopped
// meaning anything about the pass itself. The list is pinned here as it stood
// at v543, the same way the California suite pins its own copy. A future pass
// that precaches a new file adds it here when it bumps the worker.
export const PRECACHE_BASELINE_VERSION = 543;
export const PRECACHE_BASELINE = [
  "/",
  "/alignment-tool.css",
  "/alignment-tool.js",
  "/app-2.css",
  "/app.css",
  "/assets/icon.svg",
  "/ballot-axes.css",
  "/ballot-axes.js",
  "/ballot-live-roster.js",
  "/ballot-measure.css",
  "/ballot-measures.js",
  "/ballot-ut-amendment-a.html",
  "/ballot-ut-amendment-b.html",
  "/ballot-workspace.css",
  "/ballot-workspace.js",
  "/ballot.html",
  "/bill-pages.js",
  "/bill.html",
  "/cmp-data.js",
  "/consistency.js",
  "/controversies.css",
  "/controversies.js",
  "/courts.html",
  "/coverage.js",
  "/css/tailwind.css",
  "/data-hygiene.js",
  "/digital-library.js",
  "/district-ballot.css",
  "/district-ballot.js",
  "/district-board.css",
  "/district-board.js",
  "/district-composer.js",
  "/district-file.css",
  "/district-file.js",
  "/district-poll.js",
  "/district-room.css",
  "/district-room.js",
  "/district-ut-cd-1.html",
  "/district-ut-cd-2.html",
  "/district-ut-cd-3.html",
  "/district-ut-cd-4.html",
  "/district-ut-gov.html",
  "/district-ut-hd-10.html",
  "/district-ut-hd-11.html",
  "/district-ut-hd-12.html",
  "/district-ut-hd-14.html",
  "/district-ut-hd-15.html",
  "/district-ut-hd-16.html",
  "/district-ut-hd-19.html",
  "/district-ut-hd-21.html",
  "/district-ut-hd-22.html",
  "/district-ut-hd-23.html",
  "/district-ut-hd-24.html",
  "/district-ut-hd-25.html",
  "/district-ut-hd-28.html",
  "/district-ut-hd-29.html",
  "/district-ut-hd-30.html",
  "/district-ut-hd-31.html",
  "/district-ut-hd-33.html",
  "/district-ut-hd-34.html",
  "/district-ut-hd-36.html",
  "/district-ut-hd-37.html",
  "/district-ut-hd-39.html",
  "/district-ut-hd-4.html",
  "/district-ut-hd-41.html",
  "/district-ut-hd-42.html",
  "/district-ut-hd-43.html",
  "/district-ut-hd-44.html",
  "/district-ut-hd-45.html",
  "/district-ut-hd-46.html",
  "/district-ut-hd-49.html",
  "/district-ut-hd-5.html",
  "/district-ut-hd-50.html",
  "/district-ut-hd-51.html",
  "/district-ut-hd-52.html",
  "/district-ut-hd-53.html",
  "/district-ut-hd-55.html",
  "/district-ut-hd-56.html",
  "/district-ut-hd-59.html",
  "/district-ut-hd-6.html",
  "/district-ut-hd-60.html",
  "/district-ut-hd-61.html",
  "/district-ut-hd-63.html",
  "/district-ut-hd-64.html",
  "/district-ut-hd-65.html",
  "/district-ut-hd-66.html",
  "/district-ut-hd-67.html",
  "/district-ut-hd-68.html",
  "/district-ut-hd-69.html",
  "/district-ut-hd-70.html",
  "/district-ut-hd-71.html",
  "/district-ut-hd-73.html",
  "/district-ut-hd-75.html",
  "/district-ut-hd-9.html",
  "/district-ut-sd-1.html",
  "/district-ut-sd-10.html",
  "/district-ut-sd-11.html",
  "/district-ut-sd-12.html",
  "/district-ut-sd-13.html",
  "/district-ut-sd-14.html",
  "/district-ut-sd-15.html",
  "/district-ut-sd-16.html",
  "/district-ut-sd-17.html",
  "/district-ut-sd-18.html",
  "/district-ut-sd-19.html",
  "/district-ut-sd-2.html",
  "/district-ut-sd-20.html",
  "/district-ut-sd-21.html",
  "/district-ut-sd-22.html",
  "/district-ut-sd-23.html",
  "/district-ut-sd-24.html",
  "/district-ut-sd-25.html",
  "/district-ut-sd-26.html",
  "/district-ut-sd-27.html",
  "/district-ut-sd-28.html",
  "/district-ut-sd-29.html",
  "/district-ut-sd-3.html",
  "/district-ut-sd-4.html",
  "/district-ut-sd-5.html",
  "/district-ut-sd-6.html",
  "/district-ut-sd-7.html",
  "/district-ut-sd-8.html",
  "/district-ut-sd-9.html",
  "/district-ut-us-senate-curtis.html",
  "/district-ut-us-senate-lee.html",
  "/district-voice.css",
  "/district-voice.js",
  "/door1-workspace.css",
  "/door1-workspace.js",
  "/evidence-locker.js",
  "/evidence.html",
  "/exec-action-data.js",
  "/exec-record-ui.js",
  "/exec-record.js",
  "/finance-lane.css",
  "/finance-lane.js",
  "/find.html",
  "/firebase-boot.js",
  "/first-run.js",
  "/first-visit-coach.js",
  "/formal-index.js",
  "/ftm-data.js",
  "/gaps.js",
  "/hero-receipt-data.js",
  "/hero-receipt.js",
  "/hero-showcase-data.js",
  "/hero-showcase.js",
  "/inventory.js",
  "/issue-colors.js",
  "/issue-file.css",
  "/issue-file.js",
  "/issue-map.js",
  "/issue-poll.js",
  "/issue-scope.js",
  "/issue-view.css",
  "/issue-view.js",
  "/issue.html",
  "/journey.css",
  "/journey.js",
  "/judge-file.js",
  "/judicial-ballot.js",
  "/judicial-data.js",
  "/judicial-retention.css",
  "/judicial-retention.js",
  "/library.html",
  "/mandate-lane.css",
  "/mandate-lane.js",
  "/mandate.html",
  "/manifest.json",
  "/me-desk.css",
  "/me-desk.js",
  "/me-door.js",
  "/me.html",
  "/mobile-polish.css",
  "/money-lane.css",
  "/money-room.js",
  "/money.html",
  "/my-stances.html",
  "/my-stances.js",
  "/pdx-aipac.js",
  "/pdx-finance.js",
  "/pdx-issue-family.js",
  "/pdx-issue-profile.js",
  "/pdx-lazy-data.js",
  "/pdx-learn.css",
  "/pdx-perf.js",
  "/pdx-return.js",
  "/pdx-stability.js",
  "/person-bills.js",
  "/person-file.css",
  "/person-file.js",
  "/person-link.js",
  "/person-outline.css",
  "/person-outline.js",
  "/person.html",
  "/politician-stances-core.js",
  "/profile-alias.js",
  "/profile-card.js",
  "/profile-dossier.css",
  "/profile-dossier.js",
  "/profile-evidence.js",
  "/profile-spine.css",
  "/profile-spine.js",
  "/profiles-full.js",
  "/publication-floor.js",
  "/race-sheet.css",
  "/race-sheet.js",
  "/record-card.css",
  "/record-card.js",
  "/related-issues.js",
  "/roster-keys.js",
  "/roster-names.js",
  "/roster-portrait.js",
  "/say-vs-do.css",
  "/say-vs-do.js",
  "/seat-field.js",
  "/seated-member.js",
  "/share-anywhere.js",
  "/share-links.js",
  "/shell-account-chip.js",
  "/shell-chrome.css",
  "/spotlight.html",
  "/stance-helpers.js",
  "/stance-library.css",
  "/stance-library.js",
  "/stance-sides.js",
  "/stance-studio.css",
  "/stance-studio.js",
  "/stance-tree.css",
  "/stance-tree.js",
  "/stances.html",
  "/state-senate-stances-w10.js",
  "/state-senate-stances-w11.js",
  "/state-senate-stances-w12.js",
  "/state-senate-stances-w13.js",
  "/state-senate-stances-w14.js",
  "/state-senate-stances-w15.js",
  "/state-senate-stances-w16.js",
  "/state-senate-stances-w2.js",
  "/state-senate-stances-w3.js",
  "/state-senate-stances-w4.js",
  "/state-senate-stances-w5.js",
  "/state-senate-stances-w6.js",
  "/state-senate-stances-w7.js",
  "/state-senate-stances-w8.js",
  "/state-senate-stances-w9.js",
  "/state-senate-stances.js",
  "/support-route.css",
  "/support-route.js",
  "/usa-voice.js",
  "/usa.html",
  "/voice-room.js",
  "/voice.html",
  "/voting-record.js",
  "/word-action.css",
  "/word-action.js",
].map((p) => `  '${p}',`).sort().join("\n");
export const DECLARED_MIGRATIONS = ["20261130000000_dd_districts_contested_legislative_board_seats.sql",
  "20261201000000_dd_districts_california_contested_board_seats.sql",
  "20261202000000_dd_districts_washington_contested_board_seats.sql",
  // v517: every existing board takes a voice — one dd_districts row per seat.
  "20261203000000_dd_districts_every_existing_board_seat.sql"];
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
// THE ELECTION-DAY WAVE (November 3, 2026): one block of candidate identity
// rows for Alabama, Arizona, Kansas, New Hampshire, Ohio and Pennsylvania, and
// a district on 70 sitting U.S. Representatives' rows
// (db/election-day-wave-2026-11.json, test-election-day-wave-2026.mjs). With
// the block lifted out and each declared district taken back off its own row,
// cmp-data.js must be HEAD's byte for byte. Its new board documents (70 House,
// 24 governor) have no HEAD copy until the wave lands.
export const PRE_ELECTION_DAY = "13bb0be";
const EDAY = JSON.parse(readFileSync(join(ROOT, "db/election-day-wave-2026-11.json"), "utf8"));
const EDAY_BANNER = "// ── Election-day candidates, Alabama, Arizona, Kansas, New Hampshire, Ohio and Pennsylvania, official lists (Nov 2026)";
const EDAY_DOCS = new Set([
  ...EDAY.usHouseDistrictSet.map((r) => `district-${r.seat.replace("-house-", "-cd-")}.html`),
  ...EDAY.governorStates.map((c) => `district-${c}-gov.html`),
]);
// The wave's own seats and documents, for a suite whose "nothing beyond HEAD"
// check must set them aside: a seat key ("ca-house-2", "oh-gov") or a document
// name ("district-ca-cd-2.html").
export const ELECTION_DAY_SEATS = new Set([...EDAY.usHouseDistrictSet.map((r) => r.seat), ...EDAY.governorStates.map((c) => `${c}-gov`)]);
export const isElectionDay = (k) => ELECTION_DAY_SEATS.has(k) || EDAY_DOCS.has(k) || EDAY_RECORDS.has(k);
// The wave's new candidate rows, by pid (db/roster-candidates-2026-nov.json).
export const ELECTION_DAY_CANDIDATES = new Set(JSON.parse(readFileSync(join(ROOT, "db/roster-candidates-2026-nov.json"), "utf8")).rows.map((r) => r.pid));
// The election-day wave's sitting members running for a different office: their
// candidacy is in CMP_CANDIDACIES (db/roster-cross-office-candidacies-2026-nov.json),
// held there by scripts/test-roster-cross-office-candidacies-2026-nov.mjs.
export const ELECTION_DAY_CROSS_OFFICE = new Set(JSON.parse(readFileSync(join(ROOT, "db/roster-cross-office-candidacies-2026-nov.json"), "utf8")).rows.map((r) => r.pid));
// An older baseline cmp-data.js with the wave's declared districts put on
// (each right after its row's "state" line, exactly where the wave wrote it),
// for a suite that walks the resolver on that baseline and today's roster and
// holds the two walks equal outside its own states.
export const withElectionDayDistricts = (src) => {
  let s = String(src);
  for (const r of EDAY.usHouseDistrictSet) {
    const head = `\n "${r.pid}": {`, i = s.indexOf(head);
    if (i < 0) continue;
    const end = s.indexOf("\n },", i);
    const row = s.slice(i, end);
    if (/\n  "district": /.test(row)) continue;
    s = s.slice(0, i) + row.replace(/(\n  "state": "[^"]*",)/, `$1\n  "district": ${JSON.stringify(r.district)},`) + s.slice(end);
  }
  return s;
};
// A line of an allow-list file (district-board.js, district-voice.js,
// district-board.mts) that is one of the wave's own board rows.
export const isElectionDayLine = (line) => { const m = /^\s*['"]([a-z]{2}-[a-z0-9_-]+)['"]\s*:/.exec(line); return !!m && ELECTION_DAY_SEATS.has(m[1]); };
// A roster row with the wave's declared district taken back off, for a suite
// that holds an existing row to an older baseline.
const EDAY_DISTRICT = new Map(EDAY.usHouseDistrictSet.map((r) => [r.pid, r.district]));
export const withoutElectionDayDistrict = (pid, row) => {
  if (!row || EDAY_DISTRICT.get(pid) !== row.district) return row;
  const { district, ...rest } = row;
  return rest;
};
// netlify.toml with the wave's own rewrite blocks (a comment line and the three
// 200 rewrites for one of its documents) lifted out, for a suite that holds the
// rest of the file to HEAD's.
export const withoutElectionDayRewrites = (src) => String(src).replace(
  /# [^\n]*\n(?:\[\[redirects\]\]\n  from = "[^"]*"\n  to = "\/(district-[a-z0-9-]+\.html)"\n  status = 200\n){3}\n/g,
  (m, doc) => (EDAY_DOCS.has(doc) && (m.match(new RegExp(`to = "/${doc}"`, "g")) || []).length === 3 ? "" : m));
const EDAY_RECORDS = new Set(["db/roster-candidates-2026-nov.json", "db/election-day-wave-2026-11.json"]);
// cmp-data.js with the wave lifted out: its candidate block removed and each
// declared district taken back off its own row. null if the block is malformed
// or a declared row is missing.
export function withoutElectionDay(now) {
  let s = String(now);
  const at = s.indexOf(EDAY_BANNER);
  if (at >= 0) {
    const next = s.indexOf("\n// ── ", at + EDAY_BANNER.length);
    if (next < 0) return null;
    s = s.slice(0, at) + s.slice(next + 1);
  }
  for (const r of EDAY.usHouseDistrictSet) {
    const head = `\n "${r.pid}": {`, i = s.indexOf(head);
    if (i < 0) return null;
    const end = s.indexOf("\n },", i);
    const line = `\n  "district": ${JSON.stringify(r.district)},`;
    const j = s.indexOf(line, i);
    if (j < 0 || j > end) continue;
    s = s.slice(0, j) + s.slice(j + line.length);
  }
  return s;
}
function electionDayOnly(now, was) {
  return withoutElectionDay(now) === was;
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
// THE FIFTH NEWLY ELECTED WAVE (Nov 2026) admitted one candidate row for each
// challenger who won a called race on an existing Wisconsin, Illinois, North
// Carolina, Georgia or Florida board (db/newly-elected-state-legislative-
// stated-2026-11-wave5.json). Its block is set aside only when it holds exactly
// the record's rows and everything outside it is HEAD's bytes.
const WAVE5_BANNER = "// ── Newly elected state legislators, Wisconsin, Illinois, North Carolina, Georgia and Florida — roster rows (Nov 2026)";
const WAVE5_PIDS = JSON.parse(readFileSync(new URL("../db/newly-elected-state-legislative-stated-2026-11-wave5.json", import.meta.url), "utf8")).members.map((m) => m.pid);
// THE SIXTH NEWLY ELECTED WAVE (Nov 2026) admitted rows the same way, in its own
// block just above the fifth's; its record names the banner and the rows
// (db/newly-elected-state-legislative-stated-2026-11-wave6.json, rosterBanner).
const WAVE6_REC = JSON.parse(readFileSync(new URL("../db/newly-elected-state-legislative-stated-2026-11-wave6.json", import.meta.url), "utf8"));
const NEWLY_ELECTED_ROW_BLOCKS = [
  { banner: WAVE5_BANNER, pids: WAVE5_PIDS },
  { banner: WAVE6_REC.rosterBanner, pids: WAVE6_REC.members.filter((m) => m.rosterRow === "admitted").map((m) => m.pid) },
];
// Every newly elected wave's admitted rows (each is its own suite's product).
export const WAVE5_CANDIDATES = new Set(NEWLY_ELECTED_ROW_BLOCKS.flatMap((b) => b.pids));
export const NEWLY_ELECTED_CANDIDATES = WAVE5_CANDIDATES;
function withoutRowBlock(src, b) {
  if (src == null) return src;
  const at = String(src).indexOf(b.banner);
  if (at < 0) return src;
  const end = src.indexOf("\n// ── ", at + 1);
  if (end < 0) return null;
  const pids = [...src.slice(at, end).matchAll(/^ "([a-z0-9_]+)": \{$/gm)].map((x) => x[1]);
  if (pids.slice().sort().join(",") !== b.pids.slice().sort().join(",")) return null;
  return src.slice(0, at) + src.slice(end + 1);
}
// cmp-data.js with every newly elected wave's declared row block set aside
// (the fifth's and the sixth's); null when a block holds other than its record's rows.
export function withoutWave5Rows(src) {
  let out = src;
  for (const b of NEWLY_ELECTED_ROW_BLOCKS) { out = withoutRowBlock(out, b); if (out === null) return null; }
  return out;
}
export const withoutNewlyElectedRows = withoutWave5Rows;
export function settled(f) {
  let now = R(f);
  let was = HEAD(f);
  // The declared newly elected row blocks are set aside on both sides: HEAD may
  // already hold an earlier wave's block once that wave has landed.
  if (f === "cmp-data.js" && now !== null) { const c = withoutWave5Rows(now); if (c === null) return false; now = c; }
  if (f === "cmp-data.js" && was !== null) { const c = withoutWave5Rows(was); if (c !== null) was = c; }
  if (now === was) return true;
  if (now === null) return false;
  if (f === "cmp-data.js") return shellBlocksOnly(now, was) || fourStateRowsOnly(now, was) || statesRowsOnly(now, was, MS_VT_MI_TN) || electionDayOnly(now, was);
  // A board document this pass opened in one of its four states has no HEAD
  // copy until it lands; it is the generator's, and test-ms-vt-mi-tn-deepen.mjs
  // holds every one of them.
  if (was === null) return (MS_VT_MI_TN_DOC_RE.test(f) && AT(PRE_MS_VT_MI_TN)(f) === null) ||
    ((EDAY_DOCS.has(f) || EDAY_RECORDS.has(f)) && AT(PRE_ELECTION_DAY)(f) === null);
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

// ── EVERY EXISTING BOARD TAKES A VOICE (v517) ───────────────────────────────
// The pass that put every read-only board on the composer's three lists. Its
// seats are exactly the rows of its dd_districts seed. A suite that pins what
// an EARLIER voice pass opened ("the only new rows are California's", "a
// read-only board stays off every list") reads the composer files through
// withoutEveryBoardVoice(), which takes this pass's rows back out — and only
// them — so it still checks its own pass and nothing else.
export const EVERY_BOARD_MIGRATION = "20261203000000_dd_districts_every_existing_board_seat.sql";
export const EVERY_BOARD_SEATS = new Set([...R(`netlify/database/migrations/${EVERY_BOARD_MIGRATION}`)
  .matchAll(/^\t\('([a-z0-9_-]+)', '/gm)].map((m) => m[1]));
const aliasOfSeat = (k) => k.replace(/^([a-z]{2})-house-/, "$1-cd-").replace(/^([a-z]{2})-statehouse-/, "$1-hd-")
  .replace(/^([a-z]{2})-statesenate-/, "$1-sd-");
export const EVERY_BOARD_ALIASES = new Set([...EVERY_BOARD_SEATS].map(aliasOfSeat));
export const isEveryBoardSeat = (k) => EVERY_BOARD_SEATS.has(k) || EVERY_BOARD_ALIASES.has(k);
const COMPOSER_LIST_FILES = /^(?:district-composer\.js|district-poll\.js|netlify\/lib\/district-board-voice-core\.mjs)$/;
export function withoutEveryBoardVoice(f, src) {
  if (src == null) return src;
  if (COMPOSER_LIST_FILES.test(f)) {
    return String(src).split("\n").filter((l) => {
      const m = /^\s*['"]([a-z0-9_-]+)['"]\s*:/.exec(l);
      return !(m && isEveryBoardSeat(m[1]));
    }).join("\n");
  }
  if (f === "district-board.js") {
    return String(src).replace(/^(    '([a-z0-9_-]+)': \{ seat: '[^']+', )composer: true,/gm,
      (all, pre, k) => (EVERY_BOARD_SEATS.has(k) ? `${pre}composer: false,` : all));
  }
  return src;
}
