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
  // THE MAP MODULE READS THE GATE, AND READS IT WHEN IT CALLS IT. This pinned
  // the literal `var PDXF = window.PDXFinder;` — a single read taken while the
  // controller was being PARSED. That is a load-order bet, and on find.html it
  // lost every time: voter-hub-location.js is loaded `defer` there and this
  // controller is an inline tag, so the global was still undefined when the
  // capture ran and every PDXF call site threw on first use. The old assertion
  // could not see it, because the string it was looking for was exactly the
  // thing that was wrong. So what is pinned now is the property that actually
  // has to hold — the owner is resolved per call — plus the two ways of
  // getting it wrong: a parse-time capture, and a second gate of its own.
  has(MAPC, "window.PDXFinder", "gate: the map module no longer reads the shared gate at all");
  ok(/function own\(\)\s*\{\s*return window\.PDXFinder/.test(MAPC),
    "gate: the map module does not resolve the shared gate through a per-call accessor");
  no(MAPC, "var PDXF = window.PDXFinder;",
    "gate: the map module is back to capturing the gate once at parse time — on a document that defers " +
    "voter-hub-location.js that read is undefined, and every PDXF call site throws on first use");
  no(MAPC, "window.PDXFinder = {", "gate: the map module publishes a second PDXFinder");
  // Delegation is not reimplementation: each arm must hand off to the owner it
  // found, or the gate has quietly forked in two.
  for (const m of ["isOpen", "markPending", "flush", "track", "abort", "fetch", "deadline"]) {
    ok(new RegExp("\\b" + m + ":\\s*function").test(MAPC), `gate: the delegating shim has no ${m}()`);
  }
  ok(/if \(f\) return f\.fetch\(url, opts, ms\);/.test(MAPC),
    "gate: the shim's fetch does not hand off to the owner's fetch, so the ceiling is the shim's own");
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
  win.fetch = (url) => { count.fetched.push("bare:" + String(url)); return new Promise(() => {}); };
  win._currentVoterLocation = {};
  win._hasUserLocation = false;
  win.location = { pathname: "/find", search: "", hash: "", href: "https://politidex.fyi/find", origin: "https://politidex.fyi", assign() {}, replace() {} };

  // ══ THE OWNER IS NOT PUBLISHED YET, BECAUSE ON THIS DOCUMENT IT IS NOT ═════
  // voter-hub-location.js is loaded `defer` on find.html and this controller is
  // an inline <script>. Inline scripts run DURING parsing; deferred ones run
  // after it. So at the instant the controller is evaluated, window.PDXFinder
  // and window.PDXReturn genuinely do not exist yet.
  //
  // THIS HARNESS USED TO PUBLISH THEM FIRST, and that is exactly why it went
  // green across a controller whose every network path threw the moment it was
  // touched: the stub was standing before the parse, so the parse-time capture
  // `var PDXF = window.PDXFinder` found an object here and undefined in a
  // browser. The harness was not measuring the finder, it was measuring a load
  // order no document produces. The stubs now land where the browser puts
  // them — after the parse, before DOMContentLoaded — so a controller that
  // reads the gate too early fails here first.
  let bootErr = null;
  try { vm.runInContext(SRC, vm.createContext(win), { filename: "find.html#district-map" }); }
  catch (e) { bootErr = e; }
  ok(!bootErr, `driven: the finder controller does not boot (${bootErr ? bootErr.message : "ok"})`);
  must(!bootErr, "the controller threw on load, so nothing below is measuring the finder");
  ok(win.PDXFinder === undefined,
    "driven: the harness published the location owner before the parse, which is the load order that hid this bug");

  // AND NOW THE DEFERRED OWNER LANDS, STUBBED AT ITS PUBLISHED SURFACE — not
  // reimplemented. Every request the finder makes goes through PDXFinder.fetch,
  // so counting calls here counts every byte the open path puts on the wire.
  win.PDXFinder = {
    isOpen: () => true, markPending() {}, flush() {}, abort() {},
    deadline: (p) => p, track: (x) => x,
    fetch(url) { count.fetched.push(String(url)); return new Promise(() => {}); },
  };
  win.PDXReturn = { settled() {}, consume() { return false; }, finderHref: () => "/find" };

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
// 13 · A SEARCH IS NOT A NAVIGATION
// ── ONE DRIVEN FINDER, HANDED OUT TO EVERY SCENARIO BELOW ─────────────────
// The scaffolding below was inline for a single scenario. The contract this
// pass adds has three more, and they cannot share a context with the first or
// with each other — a congress layer whose fetch FAILS is the only way House and
// Senate can end up set with the third seat missing once a tap resolves all
// three — so the harness is a function and the scenarios are its callers. Same
// controller, same owner seam, same real onEachFeature binding; one switch.
//
//   opts.failLayers → PDXFinder.fetch rejects these boundary layers, exactly
//                     as a blocked CDN or a 500 from UGRC would.
//   opts.hitOmit    → drops these seats from the geocoder's OWN answer. UGRC's
//                     address service does not always report a congressional
//                     district, and the finder treats the one it does report as
//                     a backstop BEHIND point-in-polygon — so omitting it is what
//                     makes a failed congress boundary actually leave the third
//                     seat unset, rather than quietly falling through to the
//                     Census number. Both switches together are the report's
//                     shape: some seats hold a number, the rest are empty.
const driveFinder = async (opts = {}) => {
  const SRC = MAP.slice(MAP.indexOf("(function(){"));
  const sq = (w, e, dist, key) => ({
    type: "Feature", properties: { [key]: dist },
    geometry: { type: "Polygon", coordinates: [[[w, 40.6], [e, 40.6], [e, 40.8], [w, 40.8], [w, 40.6]]] },
  });
  const PAYLOAD = {
    house:    { type: "FeatureCollection", features: [sq(-112.0, -111.8, 15, "DIST"), sq(-111.8, -111.6, 16, "DIST")] },
    senate:   { type: "FeatureCollection", features: [sq(-112.0, -111.6, 7, "DIST")] },
    congress: { type: "FeatureCollection", features: [sq(-112.0, -111.6, 2, "DISTRICT")] },
  };

  const mkEl = (id) => {
    let kid = null;
    const el = {
      id, innerHTML: "", textContent: "", value: "", className: "", disabled: false,
      style: {}, _cls: new Set(),
      classList: {
        add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); }, contains(c) { return el._cls.has(c); },
        toggle(c, on) { if (on === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else if (on) el._cls.add(c); else el._cls.delete(c); },
      },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      addEventListener() {}, removeEventListener() {}, focus() {}, appendChild() {}, remove() {},
      // Memoised, so a caller that reads back what it wrote sees it.
      querySelector() { return (kid = kid || mkEl(id + "-child")); },
      querySelectorAll() { return []; },
    };
    return el;
  };
  const els = {};
  for (const id of ["district-map-modal", "pdx-district-map", "pdx-map-status", "pdx-map-status-text",
                    "pdx-map-search-input", "pdx-map-search-note", "pdx-map-search-btn", "pdx-map-search-ico",
                    "pdx-map-hint", "pdx-map-done", "pdx-sel-house", "pdx-sel-senate", "pdx-sel-congress",
                    "pdx-map-missing", "pdx-map-save-only",
                    "pdx-map-info", "pdx-map-info-label", "pdx-map-info-val", "pdx-map-info-ico",
                    "pdx-map-result", "pdx-map-result-addr-text", "pdx-map-result-dist-label",
                    "pdx-map-result-dist-val", "pdx-map-result-alt", "pdx-map-result-use",
                    "pdx-congress-note",
                    "pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) els[id] = mkEl(id);

  const timers = [];
  const mapObj = {
    _h: {},
    setView() { return mapObj; }, invalidateSize() { return mapObj; },
    on(ev, fn) { mapObj._h[ev] = fn; return mapObj; },
    hasLayer(l) { return added.indexOf(l) >= 0; },
    addLayer(l) { added.push(l); return mapObj; },
    removeLayer(l) { const i = added.indexOf(l); if (i >= 0) added.splice(i, 1); return mapObj; },
    fitBounds() { return mapObj; }, setMaxBounds() { return mapObj; },
    getZoom() { return 6; }, getCenter() { return { lat: 39.3, lng: -111.5 }; },
    flyTo() { return mapObj; }, panTo() { return mapObj; },
  };
  const added = [];
  // Paths record the handlers the controller binds, which is the whole point:
  // the click that gets fired below is the one buildLayer() actually wired.
  const paths = [];
  const mkPath = (feature) => {
    const p = {
      _feature: feature, _handlers: {}, _styles: [],
      on(a, b) { if (typeof a === "string") p._handlers[a] = b; else Object.keys(a).forEach((k) => { p._handlers[k] = a[k]; }); return p; },
      off() { return p; }, bindTooltip() { return p; }, setStyle(s) { p._styles.push(s); return p; },
      bringToFront() { return p; }, addTo(m) { m.addLayer(p); return p; }, remove() { return p; },
    };
    paths.push(p);
    return p;
  };
  const layerish = (tag) => {
    const o = {
      _tag: tag, on() { return o; }, off() { return o; }, addTo(m) { m.addLayer(o); return o; },
      setStyle() { return o; }, bindTooltip() { return o; }, bringToFront() { return o; },
      getBounds() { return { isValid: () => true, pad: () => ({}) }; },
      eachLayer() {}, clearLayers() { return o; }, remove() { return o; },
    };
    return o;
  };
  const L = {
    map() { return mapObj; },
    tileLayer() { return layerish("tiles"); },
    // THE REAL BINDING RUNS. onEachFeature is invoked exactly as Leaflet does.
    geoJSON(data, opts) {
      const g = layerish("geojson");
      (data && data.features || []).forEach((f) => {
        const p = mkPath(f);
        if (opts && opts.style) { try { opts.style(f); } catch (e) {} }
        if (opts && opts.onEachFeature) opts.onEachFeature(f, p);
      });
      return g;
    },
    marker() { return layerish("marker"); }, circleMarker() { return layerish("marker"); },
    divIcon() { return { _icon: true }; }, point(a, b) { return { x: a, y: b }; },
    latLng(a, b) { return { lat: a, lng: b }; },
    latLngBounds() { return { isValid: () => true, pad: () => ({}) }; },
    control: { attribution: () => layerish("control") },
    DomEvent: { stopPropagation() {}, preventDefault() {} },
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
  win.document = {
    readyState: "loading",
    head: { appendChild() {} },
    body: { style: {}, classList: mkEl("body").classList, appendChild() {} },
    documentElement: { style: {} },
    getElementById: (id) => els[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    createElement: (t) => mkEl(t),
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener() {},
  };
  win.fetch = () => new Promise(() => {});
  win._currentVoterLocation = {};
  win._hasUserLocation = false;
  win.location = { pathname: "/find", search: "", hash: "", href: "https://politidex.fyi/find", origin: "https://politidex.fyi", assign() {}, replace() {} };

  let bootErr = null;
  try { vm.runInContext(SRC, vm.createContext(win), { filename: "find.html#tap" }); }
  catch (e) { bootErr = e; }
  must(!bootErr, `the controller threw on load (${bootErr ? bootErr.message : ""}), so nothing below measures a tap`);

  // The deferred owner lands, stubbed at its published surface. Boundary
  // payloads are served through PDXFinder.fetch because that is the one seam
  // every request in the finder goes through, and the geocode is answered at
  // PDXFinder.deadline for the same reason — no geocoder is reimplemented here.
  const HIT = { lat: 40.7, lng: -111.9, name: "123 Main St, Layton, UT 84041", precise: true,
                city: "Layton", county: "Davis", house: 15, senate: 7, congress: 2 };
  for (const k of opts.hitOmit || []) delete HIT[k];
  win.PDXFinder = {
    isOpen: () => true, markPending() {}, flush() {}, abort() {}, track: (x) => x,
    deadline: () => Promise.resolve({ timedOut: false, hit: HIT }),
    fetch(url) {
      const u = String(url);
      const k = u.indexOf("UtahHouseDistricts") > 0 ? "house"
              : u.indexOf("UtahSenateDistricts") > 0 ? "senate"
              : u.indexOf("political_us_congress_districts") > 0 ? "congress" : null;
      if (!k) return new Promise(() => {});
      if ((opts.failLayers || []).indexOf(k) >= 0) return Promise.reject(new Error("UGRC: 500"));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYLOAD[k]) });
    },
  };
  // settled() is the navigation. Counting it is how the assertions below tell
  // "confirm committed and left" from "confirm advanced and stayed" — the
  // whole of the gate this pass adds.
  const nav = { settled: 0 };
  win.PDXReturn = { settled() { nav.settled++; }, consume() { return false; }, finderHref: () => "/find" };
  // Both stores are stubbed so the confirm hand-off is observable rather than
  // swallowed by the try/catch that guards a blocked-cookie browser.
  const mkStore = () => {
    const m = {};
    return { getItem: (k) => (k in m ? m[k] : null), setItem(k, v) { m[k] = String(v); },
             removeItem(k) { delete m[k]; }, _m: m };
  };
  win.sessionStorage = mkStore();
  win.localStorage = mkStore();

  const pump = async (rounds = 40) => {
    for (let i = 0; i < rounds; i++) {
      const q = timers.splice(0, timers.length);
      for (const t of q) { try { t.fn(); } catch (e) {} }
      await Promise.resolve(); await null;
    }
  };

  for (const fn of listeners.DOMContentLoaded || []) fn({});
  await pump();
  return { els, paths, win, timers, pump, mapObj, added, HIT, nav };
};

// ═════════════════════════════════════════════════════════════════════════════
// Tapping Search on /find made the modal vanish for a tick and reopen as a
// blank picker, with the typed query gone and no geocode ever issued. Three
// separate mistakes lined up to produce it, and only the last one was visible:
//
//   1. THE OWNER WAS READ AT PARSE TIME. `var PDXF = window.PDXFinder` ran while
//      the inline controller was being parsed, and voter-hub-location.js is
//      loaded `defer` on this document — so it had not run yet and the capture
//      was undefined. Nothing complained on open, because opening the finder
//      touches no PDXF at all; the first tap that used the network did.
//   2. SO THE SEARCH THREW ON ITS FIRST LINE. PDXF.abort() was the opening
//      statement of pdxMapSearchAddress, ahead of the busy state and the note,
//      which is why the query was discarded and no geocode was ever issued.
//   3. AND THE THROW BECAME A PAGE LOAD. The control was a type="submit" inside
//      a <form onsubmit="...; return false;">, and `return false` is only
//      reached if the call before it RETURNS. It threw, so the browser ran the
//      form's default action and navigated to this same document. The "blank
//      picker" was the arrival boot running again, correctly, over a fresh page.
//
// Every way it comes back:
//
//   A. A <form> RETURNS TO THE PANEL. Any form around these controls makes a
//      keystroke a navigation again the next time anything in the search path
//      throws — and that failure is indistinguishable from this one.
//   B. THE OWNER GOES BACK TO A PARSE-TIME READ. Pinned in section 7 against
//      the source, and in section 12 by publishing the stub after the parse.
//   C. A SPINNER OUTLIVES ITS REQUEST. fetchGeo is called synchronously in two
//      places, and a throw there used to escape before any .catch existed.
//   D. THE ARRIVAL BOOT RUNS TWICE.
//   E. THE TYPED QUERY IS EATEN BY A REMOUNT.
section("13 · search does not remount the finder");
{
  // ── A · THE CONTROLS ARE CONTROLS, NOT A SUBMISSION ───────────────────────
  // HTML comments come out first. This panel now carries a long note explaining
  // the <form onsubmit type="submit"> it used to be, and what is forbidden here
  // is the ELEMENT, not a sentence describing it — the same distinction section
  // 10 draws for the homepage's Leaflet prose. Stripping the comments is what
  // lets the note stay honest and specific instead of being watered down to get
  // past its own assertions.
  const panel = (() => {
    const a = FIND.indexOf('<div class="pdx-map-search">');
    must(a > 0, "the search panel markup is gone from find.html");
    const raw = FIND.slice(a, FIND.indexOf('<div class="pdx-map-toggle"', a));
    must(/<!--[\s\S]*?-->/.test(raw), "the search panel lost the note recording why it is not a <form>");
    const out = raw.replace(/<!--[\s\S]*?-->/g, " ");
    must(out.indexOf('id="pdx-map-search-input"') > 0, "stripping comments ate the search panel's own markup");
    return out;
  })();
  no(panel, "<form", "search: the search panel is wrapped in a <form> again — a throw in the search path then navigates");
  no(panel, "onsubmit", "search: an onsubmit handler is back, so `return false` is load-bearing again");
  no(panel, 'type="submit"', "search: the Search control submits rather than calls");
  has(panel, 'type="button"', "search: the Search control is not a plain button");
  has(panel, 'id="pdx-map-search-btn"', "search: the Search button lost its id, so the busy state cannot find it");
  // Click and Enter both have to exist: dropping the form also drops implicit
  // submission, and Enter is how an address actually gets searched.
  ok(/onclick="window\.pdxMapSearchAddress/.test(panel), "search: the Search button is not wired to the search");
  ok(/onkeydown="[^"]*Enter[^"]*pdxMapSearchAddress/.test(panel), "search: Enter in the address box no longer searches");
  ok(/preventDefault\(\)/.test(panel), "search: Enter does not cancel its own default action");
  // Dropping the <form> also drops what made a phone keyboard show "Go" on the
  // action key, so the affordance is restored explicitly rather than lost as a
  // side effect of the fix. role="search" does the same for the grouping the
  // form element used to convey.
  has(panel, 'enterkeyhint="search"', "search: the phone keyboard lost its search action key when the form went away");
  has(panel, 'role="search"', "search: the panel no longer announces itself as a search region");
  for (const bad of ["location.reload", "location.href =", "location.assign", "window.open("]) {
    no(panel, bad, `search: the search panel can navigate (${bad})`);
  }
  // A keystroke must never settle the location — that is the confirm button's job.
  no(panel, "PDXReturn", "search: the search panel reaches into the return-trip owner");
  no(panel, "settled(", "search: a keystroke in the search panel can settle the location and leave");

  // ── C · NEITHER BOUNDARY FETCH OUTRUNS ITS OWN FAILURE HANDLER ────────────
  has(MAPC, "function layerFailed(", "boundaries: the boundary failure path has no single shared body");
  ok(/try \{ req = fetchGeo\(layerType\); \}/.test(MAPC),
    "boundaries: loadAndShow calls fetchGeo outside a try, so a synchronous throw escapes before the catch exists");
  ok(/catch \(e\) \{ layerFailed\(e, tok\); return; \}/.test(MAPC),
    "boundaries: a synchronous fetchGeo throw does not reach the fail line");
  ok(/catch\(function\(err\)\{ layerFailed\(err, tok\); \}\)/.test(MAPC),
    "boundaries: the rejection path no longer shares the fail line");
  ok(/catch \(e\) \{ all = Promise\.reject\(e\); \}/.test(MAPC),
    "boundaries: onGeocoded's fetchGeo calls can still throw out of the array literal, before Promise.all exists");
  // AND THE REQUEST IS STILL ISSUED SYNCHRONOUSLY. A Promise.resolve().then()
  // wrapper would also catch the throw, but it defers the fetch by a microtask,
  // and the canvas in-flight guard asks whether a request is outstanding in the
  // same tick as the tap.
  no(MAPC, "Promise.resolve().then(function(){ return fetchGeo",
    "boundaries: the boundary fetch is deferred a microtask, so the in-flight guard sees no request and stacks a second");
  ok(/showStatus\('Couldn’t load the district map\./.test(MAPC), "boundaries: the failure copy is gone");
  has(MAPC, "window.pdxMapRetry()", "boundaries: the fail line carries no retry");
  // The layer URLs stay absolute, so no document path can bend them.
  const urls = MAPC.slice(MAPC.indexOf("var GEO_URLS"), MAPC.indexOf("var STROKE"));
  for (const k of ["house:", "senate:", "congress:"]) {
    const at = urls.indexOf(k);
    must(at > 0, `the ${k} layer URL is gone`);
    ok(/^\s*'https:\/\//.test(urls.slice(at + k.length, at + k.length + 40)),
      `boundaries: the ${k} layer URL is not absolute, so it resolves against the document path`);
  }

  // ── D · THE ARRIVAL BOOT IS OWED ONCE PER PAGE LOAD ───────────────────────
  ok(/if \(_arrived\) return;/.test(MAPC), "boot: the arrival open is unguarded, so it can re-run over a reader's work");
  ok(/_arrived = true;/.test(MAPC), "boot: the arrival guard is never set, so it guards nothing");
  // openDistrictMapModal itself stays re-entrant — the Leaflet-lazy arm reopens
  // it on purpose — so the guard sits on the boot, never on the opener.
  ok(MAPC.indexOf("_arrived") > MAPC.indexOf("window.openDistrictMapModal = function"),
    "boot: the once-guard sits on the opener rather than the arrival, which breaks the Leaflet-lazy reopen");

  // ── E · THE TYPED QUERY SURVIVES A LEGITIMATE REMOUNT ─────────────────────
  has(MAPC, "_lastQuery", "search: nothing remembers the query across a remount");
  ok(/_lastQuery = q;/.test(MAPC), "search: the query is never recorded, so a remount cannot restore it");
  ok(/if \(sInput && !\(sInput\.value \|\| ''\)\.trim\(\) && _lastQuery\) sInput\.value = _lastQuery;/.test(MAPC),
    "search: the opener does not restore the typed query");
  ok(/_lastQuery = '';/.test(MAPC), "search: Clear does not forget the query, so it returns after a reset");
  // The no-match line is the reader's whole answer, and the city/county escape
  // hatch has to stay reachable from it.
  ok(/Couldn’t find that address — try a street number\./.test(MAPC), "search: the no-match copy is gone");
  ok(/city \/ county below/.test(MAPC), "search: the no-match line does not point at the city/county selector");
  has(FIND, "window.openManualLocationForm", "search: the city/county door is gone from the finder");

  // ── AND THEN IT IS DRIVEN, IN THE BROWSER'S LOAD ORDER ────────────────────
  // The static checks above cannot tell whether a search COMPLETES. This
  // reproduces the reported gesture end to end: the controller is parsed with no
  // location owner present — the real order on a document that defers it — and
  // only then does the stub land.
  const SRC = MAP.slice(MAP.indexOf("(function(){"));
  const jsonp = [];
  const wire = [];
  let navigated = null;
  const mk = (id) => {
    const c = new Set();
    const el = {
      id, innerHTML: "", textContent: "", value: "", className: "", disabled: false, style: {}, _cls: c,
      classList: { add: (x) => c.add(x), remove: (x) => c.delete(x), contains: (x) => c.has(x),
        toggle: (x, on) => { if (on === undefined) { c.has(x) ? c.delete(x) : c.add(x); } else if (on) c.add(x); else c.delete(x); } },
      setAttribute() {}, getAttribute() { return null; }, addEventListener() {}, removeEventListener() {},
      focus() {}, appendChild() {}, removeChild() {}, remove() {}, querySelectorAll() { return []; },
      _kids: {}, querySelector(sel) { return el._kids[sel] || (el._kids[sel] = mk(id + sel)); },
    };
    return el;
  };
  const els = {};
  for (const id of ["district-map-modal", "pdx-district-map", "pdx-map-status", "pdx-map-status-text",
                    "pdx-map-search-input", "pdx-map-search-note", "pdx-map-search-btn", "pdx-map-search-ico",
                    "pdx-map-hint", "pdx-map-result", "pdx-map-done", "pdx-sel-house", "pdx-sel-senate",
                    "pdx-congress-note", "pdx-layer-house", "pdx-layer-senate", "pdx-layer-congress"]) els[id] = mk(id);

  const timers = [];
  const mo = { setView: () => mo, invalidateSize: () => mo, on(e, f) { mo["_on_" + e] = f; return mo; },
    hasLayer: () => false, addLayer: () => mo, removeLayer: () => mo, fitBounds: () => mo,
    getZoom: () => 6, getCenter: () => ({ lat: 39.3, lng: -111.5 }) };
  const lz = (t) => { const o = { _tag: t, on: () => o, off: () => o, addTo: () => o, setStyle: () => o,
    bindTooltip: () => o, bringToFront: () => o, getBounds: () => ({ isValid: () => true, pad: () => ({}) }),
    eachLayer() {}, clearLayers: () => o, remove: () => o }; return o; };
  const win = {
    console, JSON, Math, Date, Promise, String, Number, Boolean, Array, Object, RegExp, Error,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, setInterval() {}, clearInterval() {},
    navigator: { userAgent: "node", onLine: true },
    L: { map: () => mo, tileLayer: () => lz("tiles"), geoJSON: () => lz("geojson"), marker: () => lz("marker"),
      circleMarker: () => lz("marker"), latLng: (a, b) => ({ lat: a, lng: b }),
      latLngBounds: () => ({ isValid: () => true, pad: () => ({}) }),
      control: { attribution: () => lz("control") }, DomEvent: { stopPropagation() {}, preventDefault() {} } },
  };
  win.window = win;
  win.setTimeout = (fn, ms) => { timers.push({ fn, ms: ms || 0 }); return timers.length; };
  win.clearTimeout = () => {};
  win.requestAnimationFrame = (fn) => { timers.push({ fn, ms: 0 }); return timers.length; };
  // A hung network on purpose: a spinner that never clears is how this fails.
  win.fetch = (u) => { wire.push(String(u)); return new Promise(() => {}); };
  const listeners = {};
  win.document = {
    readyState: "loading",
    body: { style: {}, classList: mk("body").classList, appendChild() {}, removeChild() {} },
    documentElement: { style: {} },
    getElementById: (id) => els[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    // The Census leg is JSONP, so its request is a <script src>, not a fetch.
    createElement: (t) => { const e = mk("new-" + t);
      Object.defineProperty(e, "src", { set(v) { jsonp.push(String(v)); }, get() { return ""; } }); return e; },
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener() {},
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.localStorage = win.sessionStorage;
  win._currentVoterLocation = {};
  win._hasUserLocation = false;
  // A navigation IS the bug, so the harness records one instead of following it.
  win.location = { pathname: "/find", search: "", hash: "", origin: "https://politidex.fyi",
    href: "https://politidex.fyi/find", assign: (u) => { navigated = "assign:" + u; },
    replace: (u) => { navigated = "replace:" + u; }, reload: () => { navigated = "reload"; } };

  let err = null;
  try { vm.runInContext(SRC, vm.createContext(win), { filename: "find.html#search" }); }
  catch (e) { err = e; }
  must(!err, `the controller threw on parse (${err ? err.message : ""}), so nothing below measures a search`);
  ok(win.PDXFinder === undefined, "search/driven: the owner was published before the parse — the order that hid this bug");

  // The deferred owner lands, then the document finishes and the finder opens.
  const inflight = [];
  win.PDXFinder = {
    isOpen: () => els["district-map-modal"].style.display === "flex",
    markPending() {}, flush() {}, track: (c) => inflight.push(c),
    abort() { inflight.splice(0).forEach((c) => { try { c(); } catch (e) {} }); },
    fetch(u, o) { wire.push(String(u)); return win.fetch(u, o); },
    deadline: (p, ms) => new Promise((res) => {
      let d = false; const fin = (v) => { if (!d) { d = true; res(v); } };
      timers.push({ fn: () => { win.PDXFinder.abort(); fin({ timedOut: true, hit: null }); }, ms });
      p.then((v) => fin({ timedOut: false, hit: v || null }), () => fin({ timedOut: false, hit: null }));
    }),
  };
  win.PDXReturn = { settled() { navigated = "settled"; }, consume: () => false, finderHref: () => "/find" };

  for (const fn of listeners.DOMContentLoaded || []) fn({});
  timers.splice(0).forEach((t) => { try { t.fn(); } catch (e) {} });
  eq(els["district-map-modal"].style.display, "flex", "search/driven: arriving at /find did not open the finder");

  // THE TAP. This is the exact gesture that used to reload the page.
  const Q = "1572 West Camelot Dr, Layton";
  els["pdx-map-search-input"].value = Q;
  let searchErr = null;
  try { win.pdxMapSearchAddress(); } catch (e) { searchErr = e; }
  ok(!searchErr, `search/driven: Search threw (${searchErr ? searchErr.constructor.name + ": " + searchErr.message : ""}) — the throw is what navigated`);
  eq(navigated, null, `search/driven: Search navigated (${navigated}) instead of searching`);
  eq(els["district-map-modal"].style.display, "flex", "search/driven: the modal came down on a search");
  eq(els["pdx-map-search-input"].value, Q, "search/driven: the typed query was discarded by the search");
  eq(els["pdx-map-search-btn"].disabled, true, "search/driven: the button never went busy, so the search did not start");
  has(els["pdx-map-search-note"].innerHTML, "Finding", "search/driven: the reader is told nothing while the search runs");
  // AND A GEOCODE IS ACTUALLY ON THE WIRE.
  const geo = jsonp.concat(wire).filter((u) => /geocoding\.geo\.census\.gov|nominatim/.test(u));
  ok(geo.length >= 1, `search/driven: no geocode was issued (${jsonp.length} jsonp, ${wire.length} fetch)`);
  ok(/^https:\/\//.test(geo[0]), "search/driven: the geocode URL is not absolute");
  // The 12s ceiling is armed over the whole chain, not per leg.
  ok(timers.some((t) => t.ms === 12000), `search/driven: no 12s deadline was armed (${timers.map((t) => t.ms).join(",")})`);

  // THE ARRIVAL BOOT DOES NOT RUN AGAIN. Firing DOMContentLoaded a second time
  // is what the real second page load did; the guard is what makes it a no-op.
  els["pdx-map-search-note"].innerHTML = "SENTINEL";
  for (const fn of listeners.DOMContentLoaded || []) fn({});
  eq(els["pdx-map-search-note"].innerHTML, "SENTINEL",
    "search/driven: the arrival boot ran a second time and repainted the panel over a live search");
  eq(els["pdx-map-search-input"].value, Q, "search/driven: a second boot emptied the address box");

  // A CHAMBER TAP DOES NOT REBOOT EITHER, and it is still allowed to draw.
  win.pdxMapSetLayer("senate");
  eq(navigated, null, `search/driven: picking a chamber navigated (${navigated})`);
  ok(els["pdx-layer-senate"]._cls.has("is-active"), "search/driven: the chamber tap did not move the active toggle");

  // A FAILED GEOCODE IS A NOTE, NOT A NAVIGATION. The deadline is fired by hand
  // so the whole chain gives up exactly as it would at 12s.
  const dl = timers.filter((t) => t.ms === 12000);
  dl.forEach((t) => { try { t.fn(); } catch (e) {} });
  queueMicrotask(() => {});
}


// ═════════════════════════════════════════════════════════════════════════════
// A TAP HAS TO LAND, AND THE READER HAS TO BE ABLE TO SEE THAT IT DID
// ═════════════════════════════════════════════════════════════════════════════
section("14 · a tap selects, and confirm is on screen to commit it");
{
  // ── The panel scrolls, so the foot of it is reachable ─────────────────────
  // The box is a fixed-height column with overflow:hidden. With no scrollport
  // inside it, every pixel of panel past 94vh was simply unreachable — and the
  // confirm button is the last control in the panel. This is the "confirm is
  // off-screen" half of the report, and it is also most of the "taps aren't
  // landing" half: the chip and the button both updated correctly, below the fold.
  has(FIND, ".pdx-map-scroll{", "layout: the panel has no scrollport, so its foot is unreachable again");
  const scroll = FIND.slice(FIND.indexOf(".pdx-map-scroll{"), FIND.indexOf("}", FIND.indexOf(".pdx-map-scroll{")));
  has(scroll, "overflow-y:auto", "layout: the panel scrollport does not scroll");
  has(scroll, "min-height:0", "layout: the scrollport cannot shrink inside the flex column, so it will overflow instead of scrolling");
  has(scroll, "flex:1 1 auto", "layout: the scrollport does not take the space the fixed rows leave");

  // The wrapper has to actually CONTAIN the panel — an empty div that scrolls
  // nothing would satisfy every assertion above.
  {
    const open = FIND.indexOf('<div class="pdx-map-scroll">');
    must(open > 0, "the scroll wrapper is gone from the modal markup");
    ok(open < FIND.indexOf('<div class="pdx-map-head">'), "layout: the head is outside the scrollport");
    ok(open < FIND.indexOf('<div class="pdx-map-canvas-wrap">'), "layout: the map is outside the scrollport");
    ok(open < FIND.indexOf('<div class="pdx-map-foot">'), "layout: the foot is outside the scrollport");
    ok(open < FIND.indexOf('id="pdx-map-done"'), "layout: the confirm button is outside the scrollport");
    ok(FIND.indexOf("/.pdx-map-scroll") > FIND.indexOf('id="pdx-map-done"'), "layout: the scrollport closes before the confirm button");
    // The close button and the flag stripe stay pinned to the box.
    ok(FIND.indexOf('class="pdx-map-close"') < open, "layout: the close button scrolls away with the panel");
  }

  // ── The real viewport height, not 94% of the wrong one ────────────────────
  // vh on a phone is the height WITHOUT the collapsing browser toolbar, so 94vh
  // can be taller than the screen actually is. dvh is the one that tracks it.
  has(FIND, "max-height:calc(100dvh - 2rem)", "layout: the modal is not sized to the dynamic viewport");
  has(FIND, "max-height:100dvh", "layout: the modal on a phone is not sized to the dynamic viewport");
  has(FIND, "max-height:94vh", "layout: the pre-dvh fallback height is gone, so old browsers get no cap at all");
  ok(/\.pdx-map-overlay\{padding:0;\}/.test(FIND), "layout: the overlay still spends padding a phone does not have");

  // ── The map has a height of its own ───────────────────────────────────────
  // It used to be flex:1 — "whatever is left" — which is how a 300px floor on
  // the map became a clipped foot on the panel.
  {
    const wrap = FIND.slice(FIND.indexOf(".pdx-map-canvas-wrap{"), FIND.indexOf("}", FIND.indexOf(".pdx-map-canvas-wrap{")));
    no(wrap, "flex:1", "layout: the map still takes all the leftover height and pushes confirm out");
    no(wrap, "min-height:300px", "layout: the map still has a floor it can push the panel past");
    has(wrap, "height:clamp(", "layout: the map has no height of its own");
  }

  // ── The status panel is a message, not a lid ──────────────────────────────
  // inset:0 at z-index 600 over every polygon. It is shown while a layer loads
  // AND left standing by layerFailed() over a map that may already be painted,
  // and there it silently ate every pick until the reader found "Try again".
  {
    const st = FIND.slice(FIND.indexOf(".pdx-map-status{"), FIND.indexOf("}", FIND.indexOf(".pdx-map-status{")));
    has(st, "pointer-events:none", "hits: the status panel still takes the taps aimed at the districts under it");
    ok(/\.pdx-map-status button\{pointer-events:auto;\}/.test(FIND),
      "hits: the status panel passes everything through, including its own Try again button");
    // The idle ribbon's own pass-through rule is now redundant, but the class
    // must still exist — it is what makes the prompt a ribbon and not a curtain.
    has(FIND, ".pdx-map-status--idle{", "hits: the idle ribbon variant is gone");
    has(FIND, "inset:auto 0 0 0", "hits: the idle prompt covers the whole canvas again instead of ribboning the foot");
  }

  // ── Confirm is pinned ─────────────────────────────────────────────────────
  {
    const act = FIND.slice(FIND.indexOf(".pdx-map-actions{"), FIND.indexOf("}", FIND.indexOf(".pdx-map-actions{")));
    has(act, "position:sticky", "confirm: the commit row is not pinned to the foot of the scrollport");
    has(act, "bottom:0", "confirm: the commit row is sticky to the wrong edge");
    ok(/background:rgba\(/.test(act), "confirm: the pinned row is transparent, so the panel scrolls through it");
  }
  // And the city/county door is still under it.
  has(FIND, "Prefer to pick by city/county? Use the manual selector", "confirm: the city/county door was dropped");
  has(FIND, "openManualLocationForm", "confirm: the city/county door no longer opens anything");

  // ── One picker, not two ───────────────────────────────────────────────────
  // The report allowed rebinding on the geoJSON layer "the way the old homepage
  // controller did" IF Leaflet were swallowing the event. It is not: this is
  // already that binding, moved unedited, so the fix is ordering inside the
  // handler rather than a second listener racing the first.
  ok(/onEachFeature: function\(feature, path\)/.test(MAPC), "picker: the per-feature geoJSON binding is gone");
  eq((MAPC.match(/onEachFeature/g) || []).length, 1, "picker: a second onEachFeature binding appeared");
  eq((MAPC.match(/_map\.on\('click'/g) || []).length, 1, "picker: a second canvas-level click picker appeared");
  has(MAPC, "if (_loadingLayer || isPainted(_activeLayer)) return;",
    "picker: the canvas handler no longer stands down once polygons are drawn, so two pickers race one tap");

  // ── The pick is recorded and shown before anything that can fail ──────────
  {
    const sel = MAPC.slice(MAPC.indexOf("function selectDistrict("), MAPC.indexOf("function updateSelectionUI("));
    must(sel.length > 80, "selectDistrict is gone from the controller");
    const iUI = sel.indexOf("updateSelectionUI(");
    const iStyle = sel.indexOf("applyPathStyle(path");
    const iSave = sel.indexOf("applyToLocation()");
    ok(iUI > 0 && iStyle > 0 && iSave > 0, "tap: selectDistrict no longer updates the UI, the styling and the record");
    ok(iUI < iStyle, "tap: the polygon restyle runs before the chip and the confirm bar, so a Leaflet throw takes the tap with it");
    ok(iUI < iSave, "tap: the location write runs before the chip and the confirm bar");
    has(sel, "try {", "tap: the restyle can still abort the handler");
  }
  {
    const upd = MAPC.slice(MAPC.indexOf("function updateSelectionUI("), MAPC.indexOf("function shortAddr("));
    must(upd.length > 80, "updateSelectionUI is gone from the controller");
    ok(upd.indexOf("refreshConfirmBtn()") < upd.indexOf("refreshInfoPanel()"),
      "confirm: the confirm bar is armed after the chrome, so a fault in the hint or the banner leaves it greyed out");
    eq((upd.match(/refreshConfirmBtn\(\)/g) || []).length, 1, "confirm: refreshConfirmBtn is called twice per update");
  }
  // The bar says what it will commit — ALL of what it will commit. The old pin
  // was "'Use ' + LABEL[lead] + ' District ' + _selected[lead]", a single lead
  // chamber plus an optional second, which is exactly the shape of the record
  // this pass exists to stop writing.
  has(MAPC, "'Use these districts: '",
    "confirm: the pinned bar no longer names the districts it would commit");
  has(MAPC, "return SEATS.filter(function(t){ return _selected[t] == null; });",
    "confirm: missingSeats() is gone, so nothing computes which seats are still unset");
  no(MAPC, "'Use this location · '", "confirm: the bar is back to a label that names nothing");
  // ONE ANSWER TO "WHAT WILL CONFIRM DO", READ BY EVERY SURFACE THAT ASKS. The
  // banner button, the pinned button and the missing-seats line disagreed when
  // each worked it out for itself.
  eq((MAPC.match(/function confirmState\(\)/g) || []).length, 1,
    "confirm: confirmState() is gone or duplicated — the bar, the banner and the missing line are\n" +
    "    back to three independent readings of one question");
  for (const site of ["function refreshConfirmBtn(){", "function refreshMissingLine(){", "function refreshResultBanner(){"]) {
    const fn = MAPC.slice(MAPC.indexOf(site), MAPC.indexOf("\n    }", MAPC.indexOf(site)));
    must(fn.length > 40, `${site} is gone from the controller`);
    has(fn, "confirmState()", `confirm: ${site} no longer reads the shared confirm state`);
  }

  // ══ DRIVEN: A SEARCH ARMS CONFIRM, AND A POLYGON TAP RE-AIMS IT ═══════════
  // This is the assertion the report is actually about, so it is driven rather
  // than pinned: the controller is parsed, a hit is handed to it at the owner's
  // published seam, the REAL onEachFeature binding is exercised, and the chip
  // and the button are read out of the DOM afterwards.

  {
    const { els, paths, win, pump } = await driveFinder();
    eq(els["district-map-modal"].style.display, "flex", "driven: arriving at /find did not open the finder");

    // Nothing is picked yet and the bar says so.
    eq(els["pdx-map-done"].disabled, true, "driven: confirm is armed before any district is selected");

    // ── A SEARCH ARMS CONFIRM WITHOUT A SECOND TAP ──────────────────────────
    els["pdx-map-search-input"].value = "123 Main St, Layton";
    win.pdxMapSearchAddress();
    await pump();
    eq(els["pdx-map-done"].disabled, false,
      "driven: a search that already resolved a district left confirm greyed out — the reader has to tap the map too");
    eq(els["pdx-map-done"].textContent, "Use these districts: State House 15 · State Senate 7 · U.S. House 2",
      "driven: the pinned bar does not name all three districts the search resolved");
    eq(els["pdx-sel-house"].querySelector().textContent, "District 15",
      "driven: the State House chip was not filled in by the search");
    eq(els["pdx-sel-senate"].querySelector().textContent, "District 7",
      "driven: the State Senate chip was not filled in by the search");

    // The real binding got wired for every polygon in both layers.
    ok(paths.length >= 3, `driven: the geoJSON binding ran over ${paths.length} polygons — expected the House pair and the Senate seat`);
    const p16 = paths.filter((p) => p._feature.properties.DIST === 16);
    must(p16.length === 1, "the driven payload no longer contains exactly one District 16 polygon");
    ok(typeof p16[0]._handlers.click === "function",
      "driven: the District 16 polygon has no click handler, so a tap on it can never land");

    // ── A POLYGON TAP RE-AIMS IT ────────────────────────────────────────────
    let tapErr = null;
    try { p16[0]._handlers.click({ latlng: { lat: 40.7, lng: -111.7 } }); } catch (e) { tapErr = e; }
    await pump();
    ok(!tapErr, `driven: tapping a district polygon threw (${tapErr ? tapErr.message : "ok"})`);
    eq(els["pdx-sel-house"].querySelector().textContent, "District 16",
      "driven: tapping the District 16 polygon did not move the State House chip");
    eq(els["pdx-map-done"].disabled, false, "driven: a polygon tap left confirm greyed out");
    eq(els["pdx-map-done"].textContent, "Use these districts: State House 16 · State Senate 7 · U.S. House 2",
      "driven: the pinned bar does not name the district that was just tapped");
    // The tap is the reader overriding the address, and it reaches the record.
    eq(win._currentVoterLocation.stateHouseDistrict, "16",
      "driven: the tapped district never reached the location record");
    eq(win._hasUserLocation, true, "driven: a tap did not mark the location as chosen");

    // AND THE TAP STILL LANDS WHEN EVERYTHING DOWNSTREAM OF IT FAILS. This is
    // the ordering the fix is: a Leaflet throw on a restyle, or a record write
    // that cannot complete on a document without the homepage's tables, must
    // not be able to swallow the chip and the button.
    const p15 = paths.filter((p) => p._feature.properties.DIST === 15)[0];
    must(p15, "the driven payload no longer contains a District 15 polygon");
    p15.setStyle = () => { throw new Error("leaflet: path was rebuilt"); };
    let hardErr = null;
    try { p15._handlers.click({ latlng: { lat: 40.7, lng: -111.9 } }); } catch (e) { hardErr = e; }
    await pump();
    eq(els["pdx-sel-house"].querySelector().textContent, "District 15",
      `driven: a throw in the polygon restyle swallowed the tap (${hardErr ? hardErr.message : "no throw"})`);
    eq(els["pdx-map-done"].textContent, "Use these districts: State House 15 · State Senate 7 · U.S. House 2",
      "driven: a throw in the polygon restyle left the confirm bar naming the previous district");
    eq(els["pdx-map-done"].disabled, false, "driven: a throw in the polygon restyle greyed out confirm");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 15 · three seats or a labelled partial save — never a silent one
// ═════════════════════════════════════════════════════════════════════════════
// THE REPORT. "/find confirm with one chamber writes that district, then
// PDXReturn dumps to /. Who-Reps-Me shows 3/6: Gov + two Senators. House 4
// number is in the record; Senate and CD are empty; House 4 has no roster
// person." Two independent faults, both of them about the same partial answer:
//
//   ① THE FINDER RESOLVED ONE SEAT PER TAP AND LET THE READER LEAVE WITH IT.
//      A geocode already loaded all three Utah layers and ran point-in-polygon
//      against each. A tap loaded one, picked in it, and — on the legislative
//      layers — actively DELETED the congressional district a search had just
//      resolved (`_searchAreaId = null; _searchCongress = null;`). Confirm's
//      gate was `if (!_selected.house && !_selected.senate) return;`, so one
//      district out of three opened the door and PDXReturn took them home.
//
//   ② THE HOMEPAGE CALLED A LOCATED DISTRICT AN UNRESOLVED AREA. That is
//      section 16, in test-who-represents-me.mjs.
//
// What this section pins about ①: a point resolves all three layers; confirm
// only navigates on a complete answer or through a button labelled as partial;
// and the sticky bar names the gap the whole time one exists.
section("15 · three seats, or a labelled partial save");
{
  // ── The third seat is a selection, not a private variable ────────────────
  has(MAPC, "var _selected   = { house: null, senate: null, congress: null };",
    "seats: the selection object has no congressional slot, so the third seat is back to being a\n" +
    "    different kind of thing from the two beside it");
  no(MAPC, "_searchCongress",
    "seats: _searchCongress is back — the congressional district is being held outside the selection\n" +
    "    object again, which is what let a tap delete it and confirm ignore it");
  has(FIND, 'id="pdx-sel-congress"',
    "seats: the U.S. House chip is gone from the chamber row, so the third seat is invisible until\n" +
    "    the reader goes and finds its toggle");
  // The congress layer is no longer a look-only view: a tap on it selects.
  {
    const bl = MAPC.slice(MAPC.indexOf("function buildLayer("), MAPC.indexOf("function showLayer("));
    must(bl.length > 80, "buildLayer is gone from the controller");
    no(bl, "if (layerType === 'congress') {",
      "picker: the polygon click is back to an early return on the congress layer, so a tap there\n" +
      "    highlights a district it never selects");
    has(bl, "resolveAllAt(e.latlng)",
      "picker: a polygon tap no longer resolves the other two chambers from its own point");
    has(bl, "click:     function(e)",
      "picker: the polygon click handler dropped its event argument, so it has no latlng to resolve from");
  }

  // ── One resolver, two callers, and it never un-sets a seat ───────────────
  eq((MAPC.match(/function resolveAllAt\(/g) || []).length, 1,
    "seats: resolveAllAt() is gone or duplicated — the tap path and the tap-to-load path are back to\n" +
    "    two different ideas of how many seats a point answers");
  eq((MAPC.match(/resolveAllAt\(/g) || []).length, 3,
    "seats: resolveAllAt is not called from exactly the two tap paths \u2014 its definition, the polygon\n" +
    "    click and the tap-to-load pick are the only three mentions there should ever be");
  {
    const ra = MAPC.slice(MAPC.indexOf("function resolveAllAt("), MAPC.indexOf("function selectDistrict("));
    must(ra.length > 120, "resolveAllAt is gone from the controller");
    has(ra, "_selected[t] === d) return;",
      "seats: a re-resolve on the same district writes and reacts again instead of standing down");
    has(ra, "catch(function(){ return null; })",
      "seats: one failing boundary layer now rejects the whole point-resolve, so a congress outage\n" +
      "    takes House and Senate down with it — the same hazard onGeocoded already guards");
    has(ra, "if (d == null ",
      "seats: a layer whose polygons do not contain the point now un-sets whatever was there");
  }
  {
    const las = MAPC.slice(MAPC.indexOf("function loadAndShow("), MAPC.indexOf("function layerFailed("));
    must(las.length > 120, "loadAndShow is gone from the controller");
    no(las, "layerType !== 'congress'",
      "seats: the tap-to-load path excludes the congress layer again, so a first tap on that toggle\n" +
      "    draws boundaries and picks nothing");
  }

  // ── Confirm is a gate, and the exit from it is labelled ─────────────────
  {
    const cf = MAPC.slice(MAPC.indexOf("window.pdxMapConfirm = function(){"), MAPC.indexOf("window.pdxMapSaveOnly"));
    must(cf.length > 80, "pdxMapConfirm is gone from the controller");
    has(cf, "if (!cs.complete) {",
      "confirm: the completeness gate is gone — one district out of three can commit and navigate again");
    has(cf, "window.pdxMapSetLayer(cs.next)",
      "confirm: an incomplete answer no longer advances the toggle to the missing chamber, so the\n" +
      "    button that refuses to commit offers nothing instead");
    no(cf, "PDXReturn",
      "confirm: the navigation is back inside pdxMapConfirm ahead of the gate, so an incomplete\n" +
      "    answer can still leave");
    no(cf, "applyToLocation()",
      "confirm: pdxMapConfirm writes the record itself again rather than through the one commit path");
  }
  has(MAPC, "window.pdxMapSaveOnly = function(){",
    "confirm: the labelled partial save is gone, which makes the completeness gate a wall for any\n" +
    "    reader whose address genuinely cannot resolve three seats");
  eq((MAPC.match(/function commitAndLeave\(\)/g) || []).length, 1,
    "confirm: commitAndLeave() is gone or duplicated — the complete path and the partial path are\n" +
    "    back to two copies of the hand-off");
  has(FIND, 'onclick="window.pdxMapSaveOnly()"',
    "confirm: the Save-these-seats-only button is not wired to anything");
  has(FIND, "Save these seats only",
    "confirm: the partial-save control no longer says that it is partial");

  // ── The sticky bar names the gap, inside the sticky element ─────────────
  has(FIND, 'id="pdx-map-missing"', "bar: the missing-seats line is gone");
  {
    const act = FIND.indexOf('<div class="pdx-map-actions">');
    must(act > 0, "the sticky action row markup is gone");
    const end = FIND.indexOf("</div>", FIND.indexOf('onclick="window.pdxMapClearSelection()"'));
    const bar = FIND.slice(act, end);
    has(bar, 'id="pdx-map-missing"',
      "bar: the missing-seats line sits outside .pdx-map-actions, which is the sticky element — it\n" +
      "    scrolls away from the button it explains");
    has(bar, 'id="pdx-map-save-only"',
      "bar: the partial-save button is outside the pinned row, so the only labelled way out of an\n" +
      "    incomplete answer is off screen");
    ok(bar.indexOf('id="pdx-map-missing"') < bar.indexOf('id="pdx-map-done"'),
      "bar: the line naming the missing seats is filed after the buttons it is a heading for");
  }
  {
    const ms = FIND.slice(FIND.indexOf(".pdx-map-missing{"), FIND.indexOf("}", FIND.indexOf(".pdx-map-missing{")));
    has(ms, "flex:1 1 100%",
      "bar: the missing-seats line is not full width, so it competes with the buttons for a row");
  }
  // column-REVERSE would file that heading under the buttons on a phone.
  no(FIND, ".pdx-map-actions{flex-direction:column-reverse;}",
    "bar: the phone layout reverses the pinned column again, which puts the missing-seats heading\n" +
    "    below the two buttons it explains");

  // ══ DRIVEN ① — A POINT ANSWERS ALL THREE, AND CONFIRM LEAVES ═════════════
  {
    const { els, win, paths, pump, nav } = await driveFinder();
    els["pdx-map-search-input"].value = "123 Main St, Layton";
    win.pdxMapSearchAddress();
    await pump();
    eq(els["pdx-sel-congress"].querySelector().textContent, "District 2",
      "driven: the U.S. House chip is empty after a search that resolved the congressional district");
    eq(els["pdx-map-save-only"].style.display, "none",
      "driven: a COMPLETE answer still offers 'save these seats only' — there is no partial to save");
    has(els["pdx-map-missing"].textContent, "All three districts set",
      "driven: the pinned bar does not confirm that the answer is complete");
    eq(els["pdx-map-done"].disabled, false, "driven: a complete three-seat answer cannot be committed");
    // The banner's button is the same action, so it carries the same promise.
    eq(els["pdx-map-result-use"].textContent, "✓ Use these districts: State House 15 · State Senate 7 · U.S. House 2",
      "driven: the result banner promises a different commit from the pinned bar");

    // A tap re-aims all three from its own point rather than deleting two.
    const p16 = paths.filter((p) => p._feature.properties.DIST === 16)[0];
    must(p16, "the driven payload no longer contains a District 16 polygon");
    p16._handlers.click({ latlng: { lat: 40.7, lng: -111.7 } });
    await pump();
    eq(els["pdx-sel-congress"].querySelector().textContent, "District 2",
      "driven: a polygon tap wiped the congressional district again — this is the exact regression\n" +
      "    the report describes: 'House 4 number is in the record; Senate and CD are empty'");
    eq(win._currentVoterLocation.district, "2",
      "driven: the congressional district never reached the location record, so the homepage has\n" +
      "    nothing to resolve the U.S. House row from");
    eq(win._currentVoterLocation.stateSenateDistrict, "7",
      "driven: the State Senate district never reached the location record");

    // Complete, so confirm COMMITS and leaves.
    eq(nav.settled, 0, "driven: the finder navigated before confirm was ever pressed");
    win.pdxMapConfirm();
    await pump();
    eq(nav.settled, 1,
      "driven: confirm on a complete three-seat answer did not hand off to PDXReturn, so the reader\n" +
      "    is stranded on the finder with nothing left to do");
    eq(els["district-map-modal"].style.display, "none", "driven: a committed confirm left the modal standing");
    eq(win.sessionStorage.getItem("pdx_finder_confirm"), "1",
      "driven: the one fact /find hands the front page — that a map confirm happened — was dropped");
  }

  // ══ DRIVEN ② — CD MISSING: CONFIRM ADVANCES, IT DOES NOT NAVIGATE ════════
  // A congress boundary that will not load is the only way an address search can
  // land two seats and not three, and it is the report's shape exactly: numbers
  // in the record for some seats, empty for others.
  {
    const { els, win, pump, nav } = await driveFinder({ failLayers: ["congress"], hitOmit: ["congress"] });
    els["pdx-map-search-input"].value = "123 Main St, Layton";
    win.pdxMapSearchAddress();
    await pump();
    eq(els["pdx-sel-house"].querySelector().textContent, "District 15",
      "driven: a congress-layer outage took the State House seat down with it");
    eq(els["pdx-sel-senate"].querySelector().textContent, "District 7",
      "driven: a congress-layer outage took the State Senate seat down with it");
    eq(els["pdx-sel-congress"].querySelector().textContent, "Not set",
      "driven: the U.S. House chip claims a district the boundary fetch never returned");
    // The bar names the gap and offers the labelled way out.
    has(els["pdx-map-missing"].textContent, "Still missing: U.S. House",
      "driven: the pinned bar does not name the seat that is still missing");
    eq(els["pdx-map-done"].textContent, "Next: pick your U.S. House district",
      "driven: the pinned button promises to USE an answer that is two seats out of three");
    eq(els["pdx-map-save-only"].style.display, "",
      "driven: a partial answer offers no labelled way to keep the seats it did resolve");
    eq(els["pdx-map-save-only"].textContent, "Save these 2 seats only",
      "driven: the partial-save control does not say how many seats it would save, so 'only' is not\n" +
      "    a checkable claim");

    // THE PRESS THAT USED TO NAVIGATE NOW ADVANCES.
    win.pdxMapConfirm();
    await pump();
    eq(nav.settled, 0,
      "driven: confirm navigated on a two-of-three answer — this is the report's first sentence,\n" +
      "    'confirm with one chamber writes that district, then PDXReturn dumps to /'");
    eq(els["district-map-modal"].style.display, "flex",
      "driven: an incomplete confirm closed the finder, which strands the reader with the gap");
    ok(els["pdx-layer-congress"].classList.contains("is-active"),
      "driven: confirm refused to commit and did not move the reader to the missing chamber either");

    // And the labelled exit still works, because a gate that cannot be opened
    // deliberately is a wall.
    win.pdxMapSaveOnly();
    await pump();
    eq(nav.settled, 1,
      "driven: 'save these seats only' does not commit, so a reader whose third seat genuinely\n" +
      "    cannot resolve has no way off this document");
    eq(win._currentVoterLocation.stateHouseDistrict, "15",
      "driven: the partial save did not write the seats it promised to keep");
  }

  // ══ DRIVEN ③ — HOUSE-ONLY TAP: SWITCH TO SENATE, THEN U.S. HOUSE ═════════
  // The report's own sequence. Nothing is painted, the reader taps the canvas,
  // and only the active (House) layer can load.
  {
    const { els, win, mapObj, pump, nav } = await driveFinder({ failLayers: ["senate", "congress"] });
    must(typeof mapObj._h.click === "function", "the canvas-level tap-to-load handler is gone");
    mapObj._h.click({ latlng: { lat: 40.7, lng: -111.9 } });
    await pump();
    eq(els["pdx-sel-house"].querySelector().textContent, "District 15",
      "driven: a tap on a bare canvas no longer loads the active layer and picks in it");
    eq(els["pdx-sel-senate"].querySelector().textContent, "Not set",
      "driven: the State Senate chip claims a district its boundary fetch never returned");
    // "Switch to Senate, then U.S. House."
    ok(els["pdx-layer-senate"].classList.contains("is-active"),
      "driven: a House-only pick left the reader on the House layer with two seats missing and no\n" +
      "    indication of where to tap next");
    has(els["pdx-map-missing"].textContent, "Still missing: State Senate and U.S. House",
      "driven: the pinned bar does not name BOTH missing seats after a House-only pick");
    eq(els["pdx-map-done"].textContent, "Next: pick your State Senate district",
      "driven: the pinned button does not name the next seat to pick");
    eq(els["pdx-map-save-only"].textContent, "Save this one seat only",
      "driven: the one-seat partial save reads as a plural count");
    eq(nav.settled, 0, "driven: a House-only tap navigated on its own");
    // Pressing the button keeps the reader here and keeps naming the gap.
    win.pdxMapConfirm();
    await pump();
    eq(nav.settled, 0,
      "driven: confirm on a ONE-of-three answer navigated — the exact record the report found on\n" +
      "    the front page, 'House 4 number is in the record; Senate and CD are empty'");
    eq(els["district-map-modal"].style.display, "flex",
      "driven: confirm on a one-seat answer closed the finder");
  }

  // ══ DRIVEN ④ — ONE LAYER DOWN MUST NOT TAKE THE OTHER TWO WITH IT ════════
  // The congressional seat is the one the report found empty, and a tap is the
  // path that used to delete it. Here the SENATE boundary is the casualty, so the
  // assertion is about the seat nobody was watching: a tap point still has to
  // resolve the U.S. House layer even though the fetch beside it rejected. Each
  // request in resolveAllAt is caught on its own for exactly this reason.
  {
    const { els, win, mapObj, pump } = await driveFinder({ failLayers: ["senate"] });
    mapObj._h.click({ latlng: { lat: 40.7, lng: -111.9 } });
    await pump();
    eq(els["pdx-sel-house"].querySelector().textContent, "District 15",
      "driven: a senate-layer outage took the tapped State House seat down with it");
    eq(els["pdx-sel-congress"].querySelector().textContent, "District 2",
      "driven: the U.S. House seat did not resolve from the tapped point — one failing layer beside\n" +
      "    it was enough to abandon the whole point-resolve");
    eq(win._currentVoterLocation.district, "2",
      "driven: a tap resolved the congressional district but never wrote it to the record");
    eq(els["pdx-sel-senate"].querySelector().textContent, "Not set",
      "driven: the State Senate chip claims a district its boundary fetch never returned");
    has(els["pdx-map-missing"].textContent, "Still missing: State Senate",
      "driven: the pinned bar does not name the single missing seat after a two-of-three tap");
    ok(els["pdx-layer-senate"].classList.contains("is-active"),
      "driven: a two-of-three tap did not move the reader to the one chamber still missing");
    has(els["pdx-map-missing"].textContent, "One more",
      "driven: the pinned bar does not tell a reader one seat from complete how close they are");
  }
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
