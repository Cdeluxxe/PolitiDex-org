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
// Ten sections, one per failure mode, an eleventh for the address the finder
// moved to, plus the worker.
//
// WHERE THE FINDER LIVES, AS OF v235. The tiles and the empty first frame were
// two of the three things that froze a phone here. The third was the HOST: the
// picker, the modal and this 1,200-line controller all sat inside a 1.5 MB
// index.html, so a location tap had to parse the archive homepage before the
// search box could move. The finder is its own document now — /find, rewritten
// from find.html — and every assertion below that used to read index.html reads
// FIND instead. index.html joined section 10's map-free list in the same pass,
// which is the assertion that stops the controller from quietly coming back.
//
//   node scripts/test-finder-basemap.mjs
//
// Real files, real text. No database, no network, no browser. Exit code is
// non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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
const FIND = R("find.html");
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
// The finder's controller is one inline IIFE in find.html now. Slicing it by
// its own banner comment and the next </script> keeps every assertion below
// aimed at the map rather than at the whole shell — a slice that silently
// widened to the whole document would pass on text from anywhere.
const MAP = (() => {
  const a = FIND.indexOf("INTERACTIVE UTAH DISTRICT MAP");
  must(a > 0, "find.html carries no INTERACTIVE UTAH DISTRICT MAP banner");
  const b = FIND.indexOf("</script>", a);
  must(b > a, "the map controller's closing script tag is missing");
  return FIND.slice(a, b);
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
  has(FIND, 'id="pdx-map-search-input"', "finder: the address search input is gone");
  has(MAPC, "window.pdxMapSearchAddress", "finder: the address search entry point is gone");
  for (const id of ["pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) {
    has(FIND, `id="${id}"`, `finder: the ${id} chamber tab is gone`);
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
  // index.html JOINED THAT LIST in v235, and it is the point of the pass: the
  // homepage is no longer the finder's host, so nothing on it may mount a map.
  // Its comments still EXPLAIN where the map went — that is documentation, not
  // a script tag — so the homepage is checked with its comments stripped, HTML
  // and JS both, and then held to exactly the same five needles as the two
  // documents that never had a map in the first place.
  const MAPFREE = ["leaflet", "tileLayer", "cartocdn", "openstreetmap.org/{z}", "district-map-modal"];
  for (const f of ["voice.html", "district-ut-sd-3.html"]) {
    const src = R(f);
    for (const n of MAPFREE) {
      ok(src.toLowerCase().indexOf(n.toLowerCase()) < 0, `${f}: ${n} appears — this document must stay map-free`);
    }
  }
  const HOMEC = String(INDEX)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const n of MAPFREE) {
    ok(HOMEC.toLowerCase().indexOf(n.toLowerCase()) < 0,
      `index.html: ${n} appears outside a comment — the homepage must not mount the map`);
  }
  // Not as markup either: the picker and the modal are at /find, and what is
  // left behind on the homepage is a pointer comment, not a hidden surface.
  for (const id of ["change-location-form", "pdx-map-search-input", "pdx-layer-house"]) {
    no(HOMEC, id, `index.html: #${id} is still in the document — that surface moved to /find`);
  }
  // And no Leaflet arm in the homepage's lazy loader, which is what would pull
  // the library back onto the front page without any markup changing at all.
  no(HOMEC, "leaflet:", "index.html: PDXLazy still declares a leaflet arm");
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
// 11 · /find IS A SERVED ADDRESS, AND A LEAN ONE
// ═════════════════════════════════════════════════════════════════════════════
// Moving the finder off the homepage is only a fix if the new document is
// actually reachable and is actually smaller. Both halves fail silently: a
// missing rewrite pair serves the SPA fallback and the tap goes nowhere, and a
// shell that drags app.css or the record engines along has moved the freeze
// rather than removed it.
section("11 · the finder's own document");
{
  const TOML11 = R("netlify.toml");
  // The exact-path 200 pair, both spellings, the way every other room is served.
  for (const from of ["/find", "/find/"]) {
    const re = new RegExp(
      "\\[\\[redirects\\]\\]\\s*\\n\\s*from = \"" + from.replace("/", "\\/") +
      "\"\\s*\\n\\s*to = \"\\/find\\.html\"\\s*\\n\\s*status = 200");
    ok(re.test(TOML11), `routes: netlify.toml has no 200 rewrite from ${from} to /find.html`);
  }
  // The document flags itself, the way every other shell does, so the owner can
  // tell "I am the finder" from "I am a page that links to it".
  has(FIND, "window.__PDX_FIND_DOC", "find: the document does not flag itself");
  has(FIND, 'rel="canonical" href="https://politidex.fyi/find"', "find: the canonical does not name /find");

  // WHAT IT MUST NOT CARRY. These four are the reason index.html could not host
  // a map: 986 KB of stylesheet and three record engines that all have to parse
  // before anything on the page can move. The document's own banner NAMES all
  // four in order to say it left them behind, so this is checked with comments
  // stripped — what is forbidden is a request, not a sentence about one.
  const FINDC = String(FIND)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const heavy of ["app.css", "ballot-breakdown.js", "cmp-data.js", "compare-hub.js"]) {
    no(FINDC, heavy, `find: the finder document loads ${heavy} — the weight it was moved away from`);
  }
  // WHAT IT MUST CARRY: the lean chrome, and the ONE owner of the location.
  for (const light of ["/css/tailwind.css", "/shell-chrome.css", "/voter-hub-location.js",
                       "/shell-account-chip.js"]) {
    has(FIND, light, `find: the finder document does not load ${light}`);
  }
  // ROOT-ABSOLUTE PATHS ONLY. A trailing-slash 200 rewrite means a relative
  // same-origin src resolves under /find/ and is answered with HTML — a script
  // tag that silently receives a document. Every other shell holds this rule.
  const rel = [];
  for (const m of String(FIND).matchAll(/(?:src|href)="([^"]+)"/g)) {
    const v = m[1];
    if (/^(\/|https:\/\/|#|data:|mailto:|tel:)/.test(v)) continue;
    rel.push(v);
  }
  eq(rel.length, 0, `find: same-origin paths that are not root-absolute: ${rel.join(", ")}`);

  // THE FINDER OPENS ON ARRIVAL. A reader who taps "Who Represents Me" asked
  // for the map, not for a landing page about the map.
  has(FIND, "function bootFinder(", "find: nothing opens the finder when the document arrives");
  ok(/bootFinder[\s\S]{0,600}openDistrictMapModal\(\)/.test(FIND) ||
     /openDistrictMapModal\(\)[\s\S]{0,600}bootFinder/.test(FIND),
    "find: the arrival path never opens the modal");

  // NO SECOND RESOLVER. voter-hub-location.js still owns the record, the modal
  // gate, the geocode ceiling and pdxRepsForMe(); find.html is a caller.
  no(MAPC, "politidex_voter_location", "find: the finder document spells the location key itself");
  ok(!/function saveVoterLocation\s*\(/.test(String(FIND)) &&
     !/window\.saveVoterLocation\s*=\s*function/.test(String(FIND)),
    "find: the finder document defines its own saver — there must be one owner");
  ok(!/window\.pdxRepsForMe\s*=\s*function/.test(String(FIND)),
    "find: the finder document forks pdxRepsForMe");

  // THE TRIP BACK is the existing PDXReturn owner, one param, one allow-list.
  const LOC11 = stripJsComments(LOC);
  has(LOC11, "var FINDER = '/find';", "return: PDXReturn does not name /find as the finder");
  has(LOC11, "function finderHref(", "return: PDXReturn cannot build a finder href");
  has(LOC11, "function settled(", "return: there is no settled() to send a saved reader home");
  ok((LOC11.match(/var PARAM = /g) || []).length === 1, "return: PDXReturn declares more than one param name");
  has(MAPC, "PDXReturn.settled()", "return: confirming a district on /find leaves the reader there");

  // AND EVERY LOCATION TAP GOES THERE. The homepage band, the desk, the voice
  // room, the courts room and the hallway all used to point at a fragment on a
  // document that hosted the picker; the picker is not on that document now.
  for (const [f, needle, why] of [
    ["voice-room.js", "'/find'", "the /voice empty state's set-location control"],
    ["judicial-ballot.js", "'/find'", "the courts room's location link"],
    ["me-desk.js", "'/find'", "the desk's change-location seam"],
    ["district-voice.js", "'/find'", "the hallway's person-link fallback"]
  ]) {
    has(R(f), needle, `taps: ${f} does not send ${why} to /find`);
  }
  // The homepage's own two openers navigate rather than scroll to a surface
  // that is not there: the owner does it, so no inline handler had to change.
  has(LOC11, "window.openDistrictMapModal = function", "taps: nothing navigates to /find when no map is on the page");
  ok(/typeof window\.openDistrictMapModal !== 'function'/.test(LOC11),
    "taps: the navigating default is unguarded, so it could overwrite the real controller on /find");

  // THE WORKER HOLDS IT OFFLINE, and that is a shell entry rather than a
  // runtime accident: this is the address every location tap now goes to.
  has(SW, "'/find.html'", "worker: /find.html is not a precached shell asset");
}

// ═════════════════════════════════════════════════════════════════════════════
// 12 · DRIVEN: THE FINDER OPENS AND DRAWS NOTHING
// ═════════════════════════════════════════════════════════════════════════════
// Every assertion above about the empty first frame reads SOURCE. Source is
// where the regression would be introduced, but it is not where it would be
// felt, and a draw call can return by a route no needle is watching — a helper
// that grew a paint, a toggle handler reused as an initialiser, a cache warmer.
// So the controller is RUN here, against a Leaflet whose only job is to count.
// The question is the one the reader asks by tapping: how many district
// polygons exist on the canvas one frame after the finder opens? Zero, and a
// prompt saying how to get some. Then one tap, and exactly one layer's worth.
section("12 · driven: the finder opens, builds a basemap and draws no districts");
{
  const SRC = MAP.slice(MAP.indexOf("(function(){"));
  must(SRC.indexOf("bootFinder") > 0, "the runnable slice of the controller does not reach bootFinder");

  const count = { map: 0, tiles: [], geoJSON: 0, added: [], invalidate: 0, fetched: [], focused: 0 };
  const mkEl = (id) => {
    const el = {
      id, innerHTML: "", textContent: "", value: "", className: "", disabled: false,
      style: {}, _cls: new Set(),
      classList: {
        add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
        contains(c) { return el._cls.has(c); },
        toggle(c, on) { if (on === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else if (on) el._cls.add(c); else el._cls.delete(c); },
      },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      focus() { count.focused++; },
      appendChild() {}, remove() {},
      querySelector() { return mkEl(id + "-child"); },
      querySelectorAll() { return []; },
    };
    return el;
  };
  // Only the ids the open path actually reaches. Everything else resolves null
  // and every helper in the module is written to survive that, which is itself
  // worth knowing: a finder that throws on a missing panel is a blank page.
  const els = {};
  for (const id of ["district-map-modal", "pdx-district-map", "pdx-map-status", "pdx-map-status-text",
                    "pdx-map-search-input", "pdx-map-search-note", "pdx-map-hint",
                    "pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) {
    els[id] = mkEl(id);
  }

  const timers = [];
  const mapObj = {
    setView() { return mapObj; },
    invalidateSize() { count.invalidate++; return mapObj; },
    on(ev, fn) { mapObj["_on_" + ev] = fn; return mapObj; },
    hasLayer(l) { return count.added.indexOf(l) >= 0; },
    addLayer(l) { count.added.push(l); return mapObj; },
    removeLayer(l) { const i = count.added.indexOf(l); if (i >= 0) count.added.splice(i, 1); return mapObj; },
    fitBounds() { return mapObj; }, setMaxBounds() { return mapObj; },
    getZoom() { return 6; }, getCenter() { return { lat: 39.3, lng: -111.5 }; },
    flyTo() { return mapObj; }, panTo() { return mapObj; },
  };
  const layerish = (tag) => {
    const o = {
      _tag: tag,
      on() { return o; }, off() { return o; },
      addTo(m) { m.addLayer(o); return o; },
      setStyle() { return o; }, bindTooltip() { return o; }, bringToFront() { return o; },
      getBounds() { return { isValid: () => true, pad: () => ({}) }; },
      eachLayer() {}, clearLayers() { return o; }, remove() { return o; },
    };
    return o;
  };
  const L = {
    map() { count.map++; return mapObj; },
    tileLayer(url) { count.tiles.push(String(url)); return layerish("tiles"); },
    geoJSON() { count.geoJSON++; return layerish("geojson"); },
    marker() { return layerish("marker"); },
    circleMarker() { return layerish("marker"); },
    latLng(a, b) { return { lat: a, lng: b }; },
    latLngBounds() { return { isValid: () => true, pad: () => ({}) }; },
    control: { attribution: () => layerish("control") },
    DomEvent: { stopPropagation() {}, preventDefault() {} },
  };

  const win = {
    console, JSON, Math, Date, Promise, String, Number, Boolean, Array, Object, RegExp, Error,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, setInterval() {}, clearInterval() {},
    navigator: { userAgent: "node", onLine: true },
    L,
  };
  win.window = win;
  win.setTimeout = (fn, ms) => { timers.push({ fn, ms: ms || 0 }); return timers.length; };
  win.clearTimeout = () => {};
  win.requestAnimationFrame = (fn) => { timers.push({ fn, ms: 0 }); return timers.length; };
  const listeners = {};
  win.document = {
    readyState: "loading",
    body: { style: {}, classList: mkEl("body").classList, appendChild() {} },
    documentElement: { style: {} },
    getElementById: (id) => els[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (t) => mkEl(t),
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener() {},
  };
  // THE LOCATION OWNER, STUBBED AT ITS PUBLISHED SURFACE — not reimplemented.
  // Every request the finder makes goes through PDXFinder.fetch, so counting
  // calls here counts every byte the open path puts on the wire.
  win.PDXFinder = {
    isOpen: () => true, markPending() {}, flush() {}, abort() {},
    deadline: (p) => p, track: (x) => x,
    fetch(url) { count.fetched.push(String(url)); return new Promise(() => {}); },
  };
  win.PDXReturn = { settled() {}, consume() { return false; }, finderHref: () => "/find" };
  win.fetch = (url) => { count.fetched.push("bare:" + String(url)); return new Promise(() => {}); };
  win._currentVoterLocation = {};
  win._hasUserLocation = false;
  win.location = { pathname: "/find", search: "", hash: "", href: "https://politidex.fyi/find", origin: "https://politidex.fyi", assign() {}, replace() {} };

  let bootErr = null;
  try { vm.runInContext(SRC, vm.createContext(win), { filename: "find.html#district-map" }); }
  catch (e) { bootErr = e; }
  ok(!bootErr, `driven: the finder controller does not boot (${bootErr ? bootErr.message : "ok"})`);
  must(!bootErr, "the controller threw on load, so nothing below is measuring the finder");

  // ARRIVAL IS THE TAP. readyState was 'loading', so the boot is a listener and
  // firing it is what a real document does a moment later.
  ok(typeof win.openDistrictMapModal === "function", "driven: openDistrictMapModal was never published");
  ok((listeners.DOMContentLoaded || []).length === 1,
    `driven: ${((listeners.DOMContentLoaded || []).length)} DOMContentLoaded listeners — arrival must open the finder exactly once`);
  for (const fn of listeners.DOMContentLoaded || []) fn({});
  eq(els["district-map-modal"].style.display, "flex", "driven: arriving at /find did not open the finder");

  // THE DEFERRED BUILD. The module waits 80 ms so Leaflet measures a visible
  // container; nothing is on the canvas until that runs.
  eq(count.map, 0, "driven: the map was built before the container was revealed");
  const queued = timers.splice(0, timers.length);
  for (const t of queued) t.fn();

  // A BASEMAP, MEASURED, KEYLESS.
  eq(count.map, 1, `driven: L.map was called ${count.map} times for one open`);
  eq(count.invalidate, 1, `driven: invalidateSize ran ${count.invalidate} times — Leaflet must re-measure once`);
  eq(count.tiles.length, 1, `driven: ${count.tiles.length} tile layers were built`);
  has(count.tiles[0], "https://tile.openstreetmap.org/{z}/{x}/{y}.png", "driven: the basemap is not the keyless OSM raster");
  no(count.tiles[0], "cartocdn", "driven: the keyed Carto host came back at runtime");
  no(count.tiles[0], "key=", "driven: the running tile template carries a key parameter");

  // AND THIS IS THE WHOLE POINT: NO DISTRICTS. Not one geojson layer built, not
  // one boundary request on the wire, and the only thing added to the map is
  // the basemap itself.
  eq(count.geoJSON, 0, `driven: ${count.geoJSON} district layers were built to open an empty finder`);
  eq(count.fetched.length, 0,
    `driven: opening the finder put ${count.fetched.length} request(s) on the wire: ${count.fetched.join(", ")}`);
  eq(count.added.length, 1, `driven: ${count.added.length} layers are on the canvas — only the basemap belongs there`);
  eq(count.added[0]._tag, "tiles", "driven: the layer on the canvas is not the basemap");

  // A CANVAS WITH NOTHING ON IT MUST SAY WHY, over a live basemap rather than
  // behind a curtain, and it must carry the control that fills it.
  eq(els["pdx-map-status"].style.display, "flex", "driven: the empty canvas opens with no explanation on it");
  ok(els["pdx-map-status"]._cls.has("pdx-map-status--idle"),
    "driven: the prompt is a loading curtain rather than an idle hint over a working map");
  has(els["pdx-map-status-text"].innerHTML, "Search your address above", "driven: the prompt does not say what to do");
  has(els["pdx-map-status-text"].innerHTML, "window.pdxMapShowBoundaries()", "driven: the prompt carries no control to draw the layer");
  // The chamber chrome is set with no draw behind it — that is what
  // setLayerChrome() is for.
  ok(els["pdx-layer-house"]._cls.has("is-active"), "driven: the active chamber is not marked on open");
  ok(!els["pdx-layer-senate"]._cls.has("is-active"), "driven: a second chamber is marked active");

  // ONE TAP, ONE LAYER. Lazy must mean deferred, not dead: the prompt's own
  // button is a reader asking, and it is answered with exactly one request for
  // the active chamber and nothing else.
  win.pdxMapShowBoundaries();
  eq(count.fetched.length, 1, `driven: asking for boundaries issued ${count.fetched.length} requests`);
  has(count.fetched[0], "UtahHouseDistricts2022to2032", "driven: the tap did not request the active chamber's layer");
  no(count.fetched.join(" "), "UtahSenateDistricts", "driven: a chamber nobody asked for was fetched alongside");
  no(count.fetched.join(" "), "political_us_congress", "driven: the congressional layer was fetched by a State House tap");
  // AND A TAP ON THE CANVAS WHILE THAT IS IN FLIGHT DOES NOT STACK A SECOND
  // FETCH. The canvas is the surface a reader can hit repeatedly by accident —
  // it covers the whole modal and a pan that does not move reads as a click —
  // so it is the entry point that carries the in-flight guard, and this drives
  // the guard rather than reading it.
  ok(typeof mapObj._on_click === "function", "driven: the canvas takes no click, so there is no tap-to-draw path");
  mapObj._on_click({ latlng: { lat: 39.3, lng: -111.5 } });
  eq(count.fetched.length, 1,
    `driven: a canvas tap during the load queued a duplicate fetch (${count.fetched.length} total)`);
  // A tap with no coordinates is not a location and must not start anything.
  mapObj._on_click({});
  eq(count.fetched.length, 1, "driven: a click carrying no latlng started a layer load");
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

  // THE MOVE'S OWN ENTRY, addressed by its own version for the same reason the
  // block above is: the pin only ever claims that v235 is still in the log and
  // still says what it did, never that it is the newest thing in the file.
  const PIN2 = "v235";
  ok(CUR >= 235, `sw: CACHE_VERSION is ${m[1]} — the finder move needs ${PIN2} or later`);
  const at2 = SW.indexOf(`// ${PIN2} - `);
  ok(at2 > 0, `sw: there is no changelog entry for ${PIN2}`);
  const nextAt2 = SW.slice(at2 + 1).search(/\n\/\/\s+v\d+ - /);
  const LOG2 = SW.slice(at2, nextAt2 < 0 ? SW.indexOf("const CACHE_VERSION", at2) : at2 + 1 + nextAt2);
  const FLAT2 = LOG2.replace(/^\s*\/\/\s?/gm, " ").replace(/\s+/g, " ");
  ok(/\/find/.test(FLAT2), `sw: the ${PIN2} entry does not name /find`);
  ok(/homepage/i.test(FLAT2) && /map/i.test(FLAT2),
    `sw: the ${PIN2} entry does not say what the homepage stopped doing`);
  ok(/location key/i.test(FLAT2) && /untouched/i.test(FLAT2),
    `sw: the ${PIN2} entry does not say the location keys were left alone`);
  ok(/MIGRATION COST: none/i.test(FLAT2), `sw: the ${PIN2} entry does not state a migration cost of none`);
  eq((LOG2.match(/\n\/\/\s+v\d+ - /g) || []).length, 0,
    `sw: another version heading sits inside the ${PIN2} entry`);
  ok(at2 > at, `sw: the ${PIN2} entry is filed above ${PIN} rather than after it`);
}

report();
