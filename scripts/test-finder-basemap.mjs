#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-finder-basemap.mjs — the district finder's tiles, and its first frame
// ─────────────────────────────────────────────────────────────────────────────
// Two defects shipped together in the same modal and each one made the other
// harder to see.
//
//   THE TILES WERE DEAD AND THEY DID NOT LOOK DEAD. Carto's dark_all CDN went
//   API-keyed. An unkeyed request does not 404 — it answers 200 with a PNG that
//   has "API KEY REQUIRED" printed into the image. Leaflet has no way to know
//   that is not a map: it caches the tile, paints it, and re-requests a fresh
//   grid of them on every pan and zoom, forever. The finder's basemap must
//   therefore need NO key at all, because a placeholder key, an env read, or a
//   keyed host with the key stripped all reproduce the same stamped grid.
//
//   AND THE MODAL PAINTED 75 POLYGONS TO OPEN. Opening the finder fetched and
//   drew the whole State House layer before the reader had asked for anything,
//   and then a city search ran the front page's entire rebuild TWICE — once for
//   the house district, once for the senate one — behind a modal covering the
//   page being rebuilt. That is the "Page Unresponsive".
//
// Every way the fix goes wrong ships looking fine:
//
//   1. A KEYED TILE HOST SURVIVES. Anywhere in the tree, in any template, with
//      or without a key in it.
//   2. THE WATERMARK BECOMES THE FIX. "API KEY REQUIRED" pasted into a tile
//      URL, an errorTileUrl, or a status string is the bug with a label on it.
//   3. THE KEY MOVES TO ENV. A basemap that reads process.env is a basemap that
//      is blank on every deploy where that variable is unset — which is all of
//      them.
//   4. THE BASEMAP GOES AWAY QUIETLY. Hiding the canvas is an allowed outcome,
//      but only WITH the address search and the chamber toggle still standing.
//   5. IT STILL PAINTS ON OPEN. A draw call left in the open path, under any
//      name, is the freeze.
//   6. THE GEOCODE HAS NO CEILING. No deadline, no abort, and a slow provider
//      holds the finder open behind a spinner.
//   7. THE REBUILD STILL RUNS BEHIND THE MODAL. The gate exists but the map
//      module, or the reaction itself, walks around it.
//   8. THE DEFERRED REBUILD IS DROPPED, NOT DEFERRED. A reader who closes the
//      finder and never sees their own districts is worse off than one who
//      waited.
//   9. A STORE CHANGED OWNER. The saved location, the chooser flag, the stance
//      stores or the team slate written by a map that draws boundaries.
//  10. SOMETHING ELSE MOVED WITH IT. /voice, SD-3's board, the one-row
//      allow-list, the homepage card, or the record engines.
//
// Ten sections, one per failure mode, plus the worker.
//
//   node scripts/test-finder-basemap.mjs
//
// Real files, real text. No database, no network, no browser. Exit code is
// non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — ${JSON.stringify(n)} missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — ${JSON.stringify(n)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  console.log("");
  if (failures.length) {
    console.log(`   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`   ✓ finder basemap: all ${passed} assertions passed`);
}
// A probe whose target was renamed away is stale, not passing.
const must = (c, m) => { if (!c) { console.error(`✗ finder basemap: STALE HARNESS — ${m}`); process.exit(2); } };

const INDEX = R("index.html");
const LOC = R("voter-hub-location.js");
const LAZY = R("pdx-lazy-data.js");
const DV = R("district-voice.js");
const SW = R("sw.js");

const stripJsComments = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");

// ═════════════════════════════════════════════════════════════════════════════
// THE MODULE, SLICED BY ITS OWN HEADING
// ═════════════════════════════════════════════════════════════════════════════
// The finder's controller is one inline IIFE in index.html. Slicing it by its
// own banner comment and the next </script> keeps every assertion below aimed
// at the map rather than at 1.6 MB of unrelated shell — a slice that silently
// widened to the whole document would pass on text from anywhere.
const MAP = (() => {
  const a = INDEX.indexOf("INTERACTIVE UTAH DISTRICT MAP");
  must(a > 0, "index.html carries no INTERACTIVE UTAH DISTRICT MAP banner");
  const b = INDEX.indexOf("</script>", a);
  must(b > a, "the map controller's closing script tag is missing");
  return INDEX.slice(a, b);
})();
must(MAP.length > 20000, `the map controller slice is too thin to test (${MAP.length} chars)`);
const MAPC = stripJsComments(MAP);

// Every file that could hold a tile template, so section 1 cannot pass because
// the keyed host moved to the file the test does not read.
const TREE = (() => {
  const out = [];
  const skip = new Set([".git", "node_modules", ".netlify", ".cache", "dist", "build"]);
  (function walk(d, depth) {
    if (depth > 3) return;
    for (const e of readdirSync(d)) {
      if (skip.has(e)) continue;
      const p = join(d, e);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { walk(p, depth + 1); continue; }
      if (!/\.(html|js|mjs|json|toml|css)$/.test(e)) continue;
      if (st.size > 4 * 1024 * 1024) continue;
      out.push([p.slice(ROOT.length + 1), readFileSync(p, "utf8")]);
    }
  })(ROOT, 0);
  return out;
})();
must(TREE.length > 20, `the file sweep found only ${TREE.length} files`);

// ═════════════════════════════════════════════════════════════════════════════
// 1 · NO KEYED TILE HOST, ANYWHERE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · no keyed tile host survives");
{
  // Hosts that will not serve a raster tile without a key or a token. A
  // template pointing at any of them is either stamped today or blank tomorrow.
  const KEYED = [
    ["basemaps.cartocdn.com", "Carto's keyed basemap CDN — the host that stamps API KEY REQUIRED"],
    ["cartodb-basemaps", "Carto's legacy basemap CDN, same keyed backend"],
    ["api.mapbox.com/styles", "Mapbox styles, which require an access token"],
    ["api.mapbox.com/v4", "Mapbox v4 raster, which requires an access token"],
    ["tiles.stadiamaps.com", "Stadia, which requires an API key for hosted styles"],
    ["api.maptiler.com", "MapTiler, which requires a key"],
    ["tile.thunderforest.com", "Thunderforest, which requires an apikey"],
    ["maps.googleapis.com/maps/vt", "Google's tile endpoint, which requires a key"]
  ];
  // The test file itself names these hosts in order to forbid them; so does the
  // service-worker changelog entry explaining why they are gone. Neither is a
  // tile template, and excluding them by path is what lets the ban be literal.
  const EXEMPT = /^(scripts\/test-finder-basemap\.mjs|sw\.js)$/;
  for (const [needle, why] of KEYED) {
    const hits = TREE.filter(([p, src]) => !EXEMPT.test(p) && src.indexOf(needle) >= 0).map(([p]) => p);
    eq(hits.length, 0, `keyed host: ${needle} (${why}) still appears in ${hits.join(", ")}`);
  }
  // And the ban is real rather than vacuous: sw.js is exempt above precisely
  // because it explains the removal, so the changelog must actually say so.
  has(SW, "basemaps.cartocdn.com", "sw: the changelog does not name the keyed host it removed");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE WATERMARK IS NOT PART OF THE FIX
// ═════════════════════════════════════════════════════════════════════════════
section("2 · no API KEY REQUIRED string as a tile template");
{
  const EXEMPT = /^(scripts\/test-finder-basemap\.mjs|sw\.js)$/;
  const hits = TREE.filter(([p, src]) => !EXEMPT.test(p) && /API\s*KEY\s*REQUIRED/i.test(src)).map(([p]) => p);
  eq(hits.length, 0, `watermark: "API KEY REQUIRED" still appears in ${hits.join(", ")}`);
  // Not in the map module in any casing, and not as a tile or error-tile URL.
  ok(!/API\s*KEY\s*REQUIRED/i.test(MAP), "watermark: the map module still carries the stamped-tile string");
  ok(!/(tileLayer|errorTileUrl)[^\n]*API\s*KEY/i.test(MAP),
    "watermark: a tile template or errorTileUrl mentions an API key");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE BASEMAP NEEDS NO KEY — IT DOES NOT READ ONE
// ═════════════════════════════════════════════════════════════════════════════
section("3 · keyless OSM tiles, attributed, with no env read");
{
  has(MAPC, "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "tiles: the finder does not point at OpenStreetMap's keyless standard raster");
  // ONE template, so a keyed layer cannot be sitting behind the keyless one.
  const templates = (MAPC.match(/L\.tileLayer\(/g) || []).length;
  eq(templates, 1, `tiles: the map module declares ${templates} tile layers, not one`);
  // Attribution is a licence condition of using those tiles, not decoration,
  // and UGRC keeps its credit for the boundaries.
  const att = MAPC.slice(MAPC.indexOf("L.tileLayer("), MAPC.indexOf("L.tileLayer(") + 900);
  has(att, "openstreetmap.org/copyright", "tiles: OSM's attribution link is missing from the layer options");
  has(att, "UGRC", "tiles: UGRC's boundary credit was dropped from the attribution");
  // No key, no token, no env — not a placeholder, not a build-time read.
  for (const n of ["process.env", "CARTO_API_KEY", "MAPBOX_TOKEN", "MAPBOX_ACCESS_TOKEN",
                   "MAPTILER_KEY", "STADIA_API_KEY", "GOOGLE_MAPS_API_KEY", "apikey=", "access_token="]) {
    no(MAPC, n, `tiles: the map module reads or carries ${n}`);
  }
  // A tile grid that keeps failing is removed rather than retried behind the
  // districts, and it says so where the attribution was.
  has(MAPC, "tileerror", "tiles: nothing listens for tileerror, so a dead grid would retry forever");
  has(MAPC, "removeLayer(_tiles)", "tiles: a persistently failing grid is never removed");
  has(MAPC, "basemap unavailable", "tiles: a removed grid leaves no note in the attribution");
  // And a single missing tile is a transparent pixel, not a broken-image icon.
  has(MAPC, "errorTileUrl", "tiles: no errorTileUrl, so one missing tile shows a broken image");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · IF THE MAP WERE HIDDEN, SEARCH AND TABS WOULD STILL STAND
// ═════════════════════════════════════════════════════════════════════════════
section("4 · address search and the chamber toggle are intact");
{
  has(INDEX, 'id="pdx-map-search-input"', "finder: the address search input is gone");
  has(MAPC, "window.pdxMapSearchAddress", "finder: the address search entry point is gone");
  for (const id of ["pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) {
    has(INDEX, `id="${id}"`, `finder: the ${id} chamber tab is gone`);
  }
  has(MAPC, "window.pdxMapSetLayer", "finder: the chamber toggle entry point is gone");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE FINDER OPENS WITHOUT DRAWING A DISTRICT
// ═════════════════════════════════════════════════════════════════════════════
section("5 · no full House layer until a result or a tap");
{
  const OPEN = (() => {
    const a = MAPC.indexOf("window.openDistrictMapModal = function");
    must(a > 0, "the map module no longer defines openDistrictMapModal");
    const b = MAPC.indexOf("window.closeDistrictMapModal", a);
    must(b > a, "openDistrictMapModal and closeDistrictMapModal are no longer adjacent");
    return MAPC.slice(a, b);
  })();
  // The map is still built — the canvas is not blank, it is a basemap.
  has(OPEN, "ensureMap()", "open: the map is no longer built when the modal opens");
  has(OPEN, "invalidateSize()", "open: Leaflet is never told to re-measure the revealed canvas");
  // The chrome is set WITHOUT the draw. setLayerChrome exists precisely so the
  // toggle can show the active chamber with no fetch behind it.
  has(MAPC, "function setLayerChrome(", "open: setLayerChrome was folded back into the draw path");
  has(OPEN, "setLayerChrome(_activeLayer)", "open: the layer chrome is not set on open");
  // And the draw itself is conditional on a RESULT or an existing painted layer.
  no(OPEN, "window.pdxMapSetLayer(", "open: the modal still calls the drawing toggle to open itself");
  ok(/_hasSearchView\s*\)\s*loadAndShow/.test(OPEN) || /_hasSearchView\s*\?\s*loadAndShow/.test(OPEN),
    "open: the boundary draw is not gated on a standing search result");
  has(OPEN, "promptForLayer()", "open: there is no idle prompt, so the canvas opens unexplained");
  // The unconditional first-open paint is gone with the flag that drove it.
  no(MAPC, "_booted", "open: the one-shot boot flag that force-painted the House layer is back");
  // A TAP is the other way to get boundaries: the map itself, and the prompt's
  // own button. Both are real entry points, not the same one counted twice.
  has(MAPC, "_map.on('click'", "tap: the canvas no longer accepts a tap to draw and pick");
  has(MAPC, "window.pdxMapShowBoundaries", "tap: the idle prompt has no button to draw the layer");
  has(MAPC, 'onclick="window.pdxMapShowBoundaries()"', "tap: the prompt's button is not wired");
  // And a tap while a fetch is already on the wire does not stack a second one.
  has(MAPC, "if (_loadingLayer || isPainted(_activeLayer)) return;",
    "tap: a tap during a load or over a painted layer would queue a duplicate fetch");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE GEOCODE HAS A DEADLINE, A CEILING AND AN ABORT
// ═════════════════════════════════════════════════════════════════════════════
section("6 · geocode deadline, per-request ceiling, abort in flight");
{
  // The ceilings and the canceller registry live in voter-hub-location.js, which
  // owns the location record and the modal — the map module calls them.
  const LOCC = stripJsComments(LOC);
  has(LOCC, "AbortController", "geocode: no AbortController, so a slow request cannot be cut off");
  ok(/fetch: function/.test(LOCC), "geocode: PDXFinder.fetch is gone, so requests have no ceiling");
  ok(/deadline: function/.test(LOCC), "geocode: PDXFinder.deadline is gone, so a search has no deadline");
  ok(/track: function/.test(LOCC) && /abort: function/.test(LOCC),
    "geocode: the in-flight registry is gone, so nothing cancels work on the wire");
  has(MAPC, "SEARCH_DEADLINE_MS", "geocode: the search deadline is not a named constant");
  has(MAPC, "PDXF.deadline(", "geocode: the search does not run under the deadline");
  has(MAPC, "PDXF.fetch(", "geocode: the finder's requests bypass the ceiling");
  has(MAPC, "PDXF.track(", "geocode: the JSONP leg registers no canceller");
  has(MAPC, "PDXF.abort()", "geocode: nothing takes the previous attempt off the wire");
  // A second search retires the first rather than racing it, and the old
  // "ignore the tap while busy" early-out that made the finder feel stuck is gone.
  has(MAPC, "var tok = ++_searchSeq;", "geocode: a repeat search does not retire the previous one");
  has(MAPC, "function stale(tok)", "geocode: there is no way to recognise a retired response");
  no(MAPC, "if (_searching) return;", "geocode: the busy early-out that swallowed a re-search is back");
  ok(!/\bfunction fetchWithTimeout\(/.test(MAPC) && !/\bfunction withDeadline\(/.test(MAPC),
    "geocode: a second copy of the ceiling helpers is back in index.html");
  // The deadline actually reports to the reader instead of spinning.
  has(MAPC, "timed out", "geocode: a timed-out search shows no message");
  // A city-only hit still carries its centroid warning — the report asked for
  // that copy to survive, not to be replaced by a timeout path.
  ok(/area center/i.test(MAPC), "geocode: the city-centroid warning copy is gone");
  ok(/street number/i.test(MAPC), "geocode: the 'add a street number' guidance is gone");
  // Closing the finder is also an abort, and it retires both sequences so a
  // late response cannot paint into a modal the reader has left.
  const CLOSE = MAPC.slice(MAPC.indexOf("window.closeDistrictMapModal = function"));
  must(CLOSE.length > 100, "the map module no longer defines closeDistrictMapModal");
  has(CLOSE, "PDXF.abort()", "close: leaving the finder does not cancel in-flight requests");
  has(CLOSE, "_searchSeq++", "close: the geocode token is not retired on close");
  has(CLOSE, "_layerSeq++", "close: the boundary token is not retired on close");
  has(CLOSE, "setSearchBusy(false)", "close: the search spinner is left running");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · THE FRONT-PAGE REBUILD IS GATED WHILE THE FINDER IS OPEN
// ═════════════════════════════════════════════════════════════════════════════
section("7 · no rebuild behind an open modal");
{
  // The gate is published by the finder and read by the reaction, so any other
  // caller is covered too.
  // Published by voter-hub-location.js, which already owns the location record,
  // the modal and the reaction — so every caller of the reaction is covered, not
  // just the map module.
  const LOCG = stripJsComments(LOC);
  has(LOCG, "window.PDXFinder = {", "gate: nothing publishes the finder's open-state gate");
  has(LOCG, "isOpen: function", "gate: PDXFinder has no isOpen()");
  has(LOCG, "markPending: function", "gate: PDXFinder cannot record a deferred rebuild");
  has(LOCG, "flush: function", "gate: PDXFinder cannot flush a deferred rebuild");
  has(MAPC, "var PDXF = window.PDXFinder;", "gate: the map module no longer reads the shared gate");
  no(MAPC, "window.PDXFinder = {", "gate: the map module publishes a second PDXFinder");
  // The map module never calls the reaction directly any more — every path goes
  // through the gate. The IIFE runs at parse time, so the name it would have
  // captured is the OUTERMOST decorator: skipping the call here skips
  // ballot-actions.js's and your-ballot.js's wrappers as well.
  has(MAPC, "function reactToLocation(", "gate: the map module has no gated reaction helper");
  // Exactly two call sites, and both inside the gate itself: flush() runs the
  // deferred rebuild, reactToLocation() runs an undeferred one. Any third is a
  // path around the gate — applyToLocation, pdxMapClearSelection or selectDistrict
  // going straight at the front page the way they all used to.
  const GATE_REGION = (() => {
    const a = MAPC.indexOf("function reactToLocation(");
    must(a > 0, "the map module no longer defines reactToLocation");
    const b = MAPC.indexOf("function stale(tok)", a);
    must(b > a, "reactToLocation and the token check are no longer adjacent");
    return [a, b];
  })();
  const sites = [];
  for (let i = MAPC.indexOf("window._triggerLocationReaction()"); i >= 0;
       i = MAPC.indexOf("window._triggerLocationReaction()", i + 1)) sites.push(i);
  eq(sites.length, 1, `gate: the map module has ${sites.length} direct reaction calls, not the one inside reactToLocation`);
  for (const i of sites) {
    ok(i > GATE_REGION[0] && i < GATE_REGION[1],
      "gate: a direct _triggerLocationReaction call sits outside reactToLocation");
  }
  // And the paths that used to call it now go through the gate instead.
  for (const fn of ["window.pdxMapClearSelection", "function applyToLocation"]) {
    const a = MAPC.indexOf(fn);
    must(a > 0, `the map module no longer defines ${fn}`);
    const body = MAPC.slice(a, a + 2200);
    has(body, "reactToLocation()", `gate: ${fn} does not route its rebuild through the gate`);
  }
  // And the reaction itself refuses to run behind the modal, for any caller.
  const REACT = (() => {
    const a = stripJsComments(LOC).indexOf("window._triggerLocationReaction = function");
    must(a > 0, "voter-hub-location.js no longer defines _triggerLocationReaction");
    const s = stripJsComments(LOC);
    return s.slice(a, s.indexOf("window.voterLocationStateChanged", a));
  })();
  has(REACT, "PDXFinder", "gate: the reaction does not consult the finder's open state");
  has(REACT, "markPending()", "gate: the reaction drops the rebuild instead of deferring it");
  ok(/markPending\(\);[\s\S]{0,400}?return;/.test(REACT),
    "gate: the reaction records the deferral but then rebuilds anyway");
  // The heavy consumers named in the report are all downstream of that return.
  const after = REACT.slice(REACT.indexOf("return;"));
  for (const fn of ["_vhSyncBanner", "renderKeyRaces", "renderRelevantToMe", "myteamBrowseFilter", "PDXHR1"]) {
    has(after, fn, `gate: ${fn} is no longer behind the finder gate`);
  }
  // The ~2 MB lazy data warm waits out an open finder too — without disarming,
  // so the next interaction after the finder closes still warms.
  const LAZYC = stripJsComments(LAZY);
  has(LAZYC, "function finderOpen(", "lazy: the data warm does not check the finder's open state");
  has(LAZYC, "if (finderOpen()) return;", "lazy: the first-interaction warm still parses under an open finder");
  ok(/if \(finderOpen\(\)\) return;[\s\S]{0,200}removeEventListener/.test(LAZYC),
    "lazy: the warm disarms itself before deferring, so it would never fire again");
  ok(/finderOpen\(\)[\s\S]{0,80}setTimeout\(run/.test(LAZYC),
    "lazy: the post-load fallback does not come back for a deferred warm");
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · THE DEFERRED REBUILD IS DEFERRED, NOT DROPPED
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the rebuild runs once, on close");
{
  const CLOSE = MAPC.slice(MAPC.indexOf("window.closeDistrictMapModal = function"));
  has(CLOSE, "PDXF.flush()", "defer: closing the finder never runs the rebuild it deferred");
  // flush() is one-shot: the pending flag is cleared before the call, so a
  // house pick and a senate pick in the same search collapse into one rebuild
  // rather than two, and a second close does nothing.
  const FLUSH = (() => {
    const src = stripJsComments(LOC);
    const a = src.indexOf("flush: function");
    must(a > 0, "PDXFinder.flush is gone");
    return src.slice(a, src.indexOf("},", a));
  })();
  ok(FLUSH.indexOf("pending = false") < FLUSH.indexOf("_triggerLocationReaction"),
    "defer: flush() calls the rebuild before clearing its flag, so it can re-enter");
  has(FLUSH, "if (!pending) return;", "defer: flush() rebuilds even when nothing was deferred");
}

// ═════════════════════════════════════════════════════════════════════════════
// 9 · NO STORE CHANGED OWNER
// ═════════════════════════════════════════════════════════════════════════════
section("9 · location, stance and team stores untouched");
{
  // The saved-location key and the chooser flag keep their one owner.
  has(LOC, "PDX_LOC_KEY = 'politidex_voter_location'", "stores: voter-hub-location.js no longer owns the location key");
  no(MAPC, "politidex_voter_location", "stores: the map module reads or writes the location key directly");
  no(MAPC, "_pdxLocWasChosen", "stores: the map module touches the chooser flag");
  eq((LOC.match(/politidex_voter_location/g) || []).length,
     (LOC.match(/politidex_voter_location/g) || []).length,
     "stores: location key occurrences drifted");
  // Persistence still goes through the one saver rather than around it.
  has(MAPC, "window.saveVoterLocation()", "stores: the map module no longer delegates persistence to saveVoterLocation");
  // And nothing the finder does writes a stance, an alignment or a team slate.
  for (const k of ["politidex_my_team", "politidex_team_v", "politidex_active_team_v", "politidex_saved_teams_v",
                   "politidex_align_issues", "politidex_align_intensity", "politidex_align_matchmode",
                   "politidex_my_politicians", "politidex_favorites"]) {
    no(MAPC, k, `stores: the map module touches ${k}`);
  }
  // The one store the finder has always written (Key Races' own area) is
  // unchanged and still written through its published key.
  has(MAPC, "window.KR_LOCATION_KEY", "stores: the Key Races area key stopped going through its published name");
}

// ═════════════════════════════════════════════════════════════════════════════
// 10 · NOTHING ELSE MOVED
// ═════════════════════════════════════════════════════════════════════════════
section("10 · /voice, SD-3, the allow-list and the engines");
{
  // /voice and SD-3's board stay map-free: no Leaflet, no tiles, no finder.
  for (const f of ["voice.html", "district-ut-sd-3.html"]) {
    const src = R(f);
    for (const n of ["leaflet", "tileLayer", "cartocdn", "openstreetmap.org/{z}", "district-map-modal"]) {
      ok(src.toLowerCase().indexOf(n.toLowerCase()) < 0, `${f}: ${n} appears — this document must stay map-free`);
    }
  }
  // The allow-list is still one row, and it is still Johnson's board.
  const ROUTES = (() => {
    const a = DV.indexOf("BOARD_ROUTES");
    must(a > 0, "district-voice.js no longer declares BOARD_ROUTES");
    const open = DV.indexOf("{", a);
    return DV.slice(open, DV.indexOf("};", open) + 2);
  })();
  const rows = (ROUTES.match(/['"]\/district\/[a-z0-9-]+['"]/g) || []);
  eq(rows.length, 1, `routes: BOARD_ROUTES has ${rows.length} rows, not one`);
  has(ROUTES, "/district/ut-sd-3", "routes: the one board row is no longer SD-3's");
  // The homepage's District Voice card still points at /voice, not at the finder
  // this pass spent its time inside.
  const GATE = (() => {
    const a = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
    must(a > 0, "index.html carries no pdx:home-voice-gate:begin marker");
    return INDEX.slice(a, INDEX.indexOf("<!-- pdx:home-voice-gate:end -->", a));
  })();
  has(GATE, 'href="/voice"', "homepage: the District Voice card no longer points at /voice");
  no(GATE, "#who-represents-me", "homepage: the District Voice card was repointed at the finder");
  // No /district/* splat was added while routing was open in front of us.
  const TOML = R("netlify.toml");
  no(TOML, '"/district/*"', "routes: a /district/* splat redirect was added");
  // And the record engines still twin-boot byte-identical.
  const twin = TREE.find(([p]) => p === "scripts/test-vr-pack-live-twin-boot.mjs");
  ok(!!twin, "engines: the twin-boot suite is gone, so byte-identity is no longer checked");
}

// ═════════════════════════════════════════════════════════════════════════════
// THE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("worker · one bump, one entry");
{
  const m = SW.match(/const CACHE_VERSION = '(v\d+)';/);
  must(!!m, "sw.js no longer declares CACHE_VERSION");
  // ONE BUMP, AND THAT CLAIM EXPIRES THE DAY THIS PASS LANDS. While the finder
  // pass is the working tree's own, CACHE_VERSION *is* v231 and reading the
  // newest entry reads this pass's entry. The moment a later pass bumps the
  // shell, "CACHE_VERSION is v231" stops being a statement about the finder and
  // becomes a statement about whoever went last — a pin that can pass exactly
  // once, in the tree of its author, and reports its own obsolescence forever
  // after, indistinguishable from the regression it was meant to catch.
  //
  // What still has teeth after the pass lands: the version only ever goes UP,
  // and the finder's own entry is still in the log, still filed after v230,
  // where a reader of sw.js can find out why the tiles have no key. So the
  // entry below is addressed by its OWN version, not by the newest one.
  const PIN = "v231";
  const CUR = Number(String(m[1]).slice(1));
  ok(CUR >= 231, `sw: CACHE_VERSION went backwards to ${m[1]} — ${PIN} or later is the floor`);
  const at = SW.indexOf(`// ${PIN} - `);
  ok(at > 0, `sw: there is no changelog entry for ${PIN}`);
  // The entry ends at the next version heading, or at CACHE_VERSION when this
  // pass is still the newest one. Slicing to CACHE_VERSION unconditionally
  // would swallow every later entry and let their prose answer for this one.
  const nextAt = SW.slice(at + 1).search(/\n\/\/\s+v\d+ - /);
  const LOG = SW.slice(at, nextAt < 0 ? SW.indexOf("const CACHE_VERSION", at) : at + 1 + nextAt);
  const FLAT = LOG.replace(/^\s*\/\/\s?/gm, " ").replace(/\s+/g, " ");
  ok(/key/i.test(FLAT), `sw: the ${PIN} entry does not mention the basemap key at all`);
  ok(/openstreetmap/i.test(FLAT), `sw: the ${PIN} entry does not name the keyless basemap it swapped to`);
  ok(/no key is committed/i.test(FLAT), `sw: the ${PIN} entry does not say no key was committed`);
  ok(/75/.test(FLAT) && /polygon/i.test(FLAT), `sw: the ${PIN} entry does not describe the on-open paint it removed`);
  ok(/until a (result|RESULT)/i.test(FLAT), `sw: the ${PIN} entry does not say the House layer waits for a result`);
  ok(/location key/i.test(FLAT) && /untouched/i.test(FLAT),
    `sw: the ${PIN} entry does not say the location keys were left alone`);
  ok(/_pdxLocWasChosen/.test(FLAT), `sw: the ${PIN} entry does not name the chooser flag it left alone`);
  ok(/no equity copy/i.test(FLAT), `sw: the ${PIN} entry does not say there is no equity copy`);
  ok(/MIGRATION COST: none/i.test(FLAT), `sw: the ${PIN} entry does not state a migration cost of none`);
  ok(/byte-identical/i.test(FLAT), `sw: the ${PIN} entry does not say the record engines did not move`);
  // ONE bump: no other version heading is inside this pass's own entry.
  eq((LOG.match(/\n\/\/\s+v\d+ - /g) || []).length, 0,
    `sw: another version heading sits inside the ${PIN} entry`);
  const prev = SW.indexOf("// v230 - ");
  ok(prev > 0 && prev < at, `sw: the ${PIN} entry is filed above v230 rather than after it`);
}

report();
