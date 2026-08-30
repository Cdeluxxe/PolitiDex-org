#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-jumps.mjs — the bill and legislation jumps land in real rooms
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WENT WRONG ON A PHONE. Two of the app's most-used destinations answered a
// tap with nothing at all:
//
//   · "Legislation / Bills" (nav menu and hamburger) asked the Digital Library
//     for its Legislation tab and got it — and then lost it. The library
//     re-renders whenever one of its lazily-loaded datasets arrives, and
//     scrolling the library into view is itself what triggers that fetch, so the
//     re-render landed a beat AFTER the reader opened the tab and repainted the
//     archive grid over their bill list. The room looked identical to "Digital
//     Library", which is exactly what was reported.
//
//   · "H.R.1 / Omnibus Showcase" (nav menu, hamburger, homepage pulse chip)
//     pointed a bare hash at a section that lives inside Door 1's work layer,
//     which starts at display:none. The hamburger's hash reached the layer's hash
//     handler, but the homepage chip never did: the pulse bar preventDefault()s
//     every chip and scrolls the element itself, and scrollIntoView on a
//     display:none element is a silent no-op.
//
// WHAT THIS FILE PINS:
//   1. THREE ENTRANCES, ONE BEHAVIOUR. Desktop nav, mobile hamburger and the
//      homepage chip carry the same href and resolve through the same call. No
//      entrance is left to a bare hash into a closed layer.
//   2. THE SEAM OPENS THE ROOM. pdxOpenSurface() paints the surface, opens the
//      work layer and scrolls; it declines anything that is not in that layer, so
//      the plain smooth-scroll still owns every other anchor.
//   3. THE CATALOG KEEPS THE TAB IT WAS GIVEN. A re-render of the library
//      repaints the SELECTED mode, and "Digital Library" with no mode named is
//      still the archive.
//   4. ONE BILL FILE, AND IT IS /b/<sitting>/<number>. A row in the catalog opens
//      the same panel every other entrance opens, carrying the sitting that makes
//      a repeated bill number unambiguous. Nothing here invents a second bill
//      product.
//
//   node scripts/test-bill-jumps.mjs
//
// Static analysis of the shipped files plus node:vm runs of the door seam and of
// digital-library.js against a minimal DOM. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const INDEX = R("index.html");
const DLIB = R("digital-library.js");
const BILLS = R("bills.js");
const SHARE = R("share-links.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const must = (c, m) => { if (!c) { console.error(`✗ bill jumps: ${m}`); process.exit(1); } passed++; };

// Every <a> tag in the shipped page, as raw source.
const ANCHORS = INDEX.match(/<a\b[^>]*>/g) || [];
const anchorsFor = (href) => ANCHORS.filter((a) => a.includes(`href="${href}"`));

// ── 1 · Three entrances, one behaviour ───────────────────────────────────────
{
  const hr1 = anchorsFor("#hr1-showcase");
  must(hr1.length >= 3,
    `only ${hr1.length} link(s) point at the H.R.1 showcase. The brief names three entrances — desktop\n` +
    "    nav, mobile hamburger and the homepage quick-jump — and they are what this file is about");
  for (const a of hr1) {
    const isChip = /class="[^"]*pulse-chip/.test(a);
    ok(isChip || a.includes("pdxOpenSurface('hr1-showcase')"),
      "a link to #hr1-showcase neither calls pdxOpenSurface nor is a pulse chip (whose bar handler\n" +
      "    routes through it). A bare hash into the closed work layer is the bug this fixes:\n" +
      "    " + a.slice(0, 120));
  }
  // The chips go through the shared seam FIRST, before the branch that scrolls
  // the element itself — which is the branch that silently did nothing.
  const barIdx = INDEX.indexOf("var chips=Array.prototype.slice.call(bar.querySelectorAll('.pulse-chip'))");
  must(barIdx !== -1, "the homepage pulse bar's chip wiring is gone — the chip assertions cannot be trusted");
  const bar = INDEX.slice(barIdx, INDEX.indexOf("</script>", barIdx));
  const seam = bar.indexOf("window.pdxOpenSurface(id)");
  const plain = bar.indexOf("target.scrollIntoView(");
  ok(seam !== -1,
    "the pulse bar does not offer its chips to pdxOpenSurface. Three of its chips name sections inside\n" +
    "    the closed work layer, and scrolling a display:none element is a no-op the reader cannot see");
  ok(seam !== -1 && plain !== -1 && seam < plain,
    "the pulse bar scrolls the element before asking the seam, so the work-layer chips still land on\n" +
    "    nothing — the order is the whole fix");
  ok(bar.includes("e.preventDefault();return;"),
    "the seam branch does not stop the chip's default jump, so the hash fires a second arrival at the\n" +
    "    same surface mid-scroll");
}
{
  // Legislation / Bills: same href in both menus, same call in both menus, and
  // the call is the bills entry point rather than a raw library focus.
  const leg = ANCHORS.filter((a) => /Bills (?:&|&amp;) measures/.test(a));
  eq(leg.length, 2,
    "the page does not carry exactly two Legislation / Bills entries (desktop nav + hamburger). A\n" +
    "    missing one is a destination a phone cannot reach; an extra one is a fourth place to keep in sync");
  for (const a of leg) {
    ok(a.includes('href="#digital-library"'),
      "a Legislation / Bills entry no longer falls back to the library's own anchor, so a tap that\n" +
      "    lands before the module has loaded goes nowhere at all");
    ok(a.includes("pdxOpenBills()"),
      "a Legislation / Bills entry does not call pdxOpenBills(), which is what retries the tab until\n" +
      "    the library exists instead of asking once and giving up:\n    " + a.slice(0, 140));
  }
  // Digital Library keeps its own entrance, and it is NOT the bills one.
  const LIB_TITLE = 'title="The central searchable archive of everything PolitiDex tracks"';
  const lib = ANCHORS.filter((a) => a.includes(LIB_TITLE));
  eq(lib.length, 2,
    "the Digital Library's own menu entries are gone. The archive and the bill catalog are two rooms\n" +
    "    behind one anchor, and the library must still open the library");
  for (const a of lib) {
    ok(a.includes("PDXDigitalLibrary.focus()") && !a.includes("legislation"),
      "a Digital Library entry now asks for a mode, which is how the archive door started opening the\n" +
      "    bill catalog:\n    " + a.slice(0, 140));
  }
}

// ── 2 · The seam opens the room ──────────────────────────────────────────────
const doorSrc = (() => {
  const start = INDEX.indexOf("window.pdxDoor(mode) · the five doors");
  must(start !== -1, "the door router's comment header is gone — the extraction below cannot be trusted");
  const open = INDEX.lastIndexOf("<script>", start);
  return INDEX.slice(open + "<script>".length, INDEX.indexOf("</script>", start));
})();

function runSeam(over) {
  const calls = [];
  const el = (id) => ({
    id, style: {}, hidden: false,
    classList: { _s: new Set(), add(c) { this._s.add(c); calls.push(`class+${id}:${c}`); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute: () => null,
    getBoundingClientRect: () => ({ top: 500 }),
    scrollIntoView() { calls.push(`scroll:${id}`); },
  });
  const nodes = {};
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, Set, Date,
    setTimeout: (fn) => { ctx.timers++; fn(); return 1; },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    location: { hash: "" },
    document: { readyState: "complete", getElementById: (id) => (nodes[id] = nodes[id] || el(id)), addEventListener: () => {} },
    addEventListener: () => {},
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.calls = calls; ctx.nodes = nodes; ctx.timers = 0;
  vm.runInContext(doorSrc, vm.createContext(ctx), { filename: "index.html[door seam]" });
  return ctx;
}

{
  const r = runSeam({});
  let mounted = 0;
  r.PDXHR1 = { mount: () => { mounted++; } };
  const took = r.pdxOpenSurface("hr1-showcase");
  eq(took, true, "pdxOpenSurface('hr1-showcase') did not report that it handled the jump, so every caller\n" +
    "    falls through to a scroll into a closed layer");
  eq(mounted, 1, "the seam does not paint the showcase before revealing it. The module's own timer decides\n" +
    "    when the section fills, and a reader who arrives first meets an empty room");
  ok(r.calls.includes("class+pdx-door-work:is-open"),
    "the seam does not open the work layer, which is the display:none container the section sits in");
  ok(r.calls.includes("scroll:hr1-showcase"),
    "the seam opens the layer but never travels to the surface the link named");
  // A leading '#' is what an href actually carries.
  const r2 = runSeam({});
  r2.PDXHR1 = { mount: () => {} };
  eq(r2.pdxOpenSurface("#hr1-showcase"), true,
    "pdxOpenSurface rejects the '#' form, so a caller passing the href verbatim gets a silent no-op");
  // And it declines everything outside the layer, so the ordinary anchors are untouched.
  const r3 = runSeam({});
  eq(r3.pdxOpenSurface("evidence-locker"), false,
    "pdxOpenSurface claims an anchor that is not in the work layer. Claiming it means preventDefault\n" +
    "    on a link whose section is already in the open");
  eq(r3.pdxOpenSurface(""), false, "pdxOpenSurface claims an empty id");
  ok(!r3.calls.includes("class+pdx-door-work:is-open"),
    "declining an anchor still opened the work layer, which un-demotes Door 1's sections on any\n" +
    "    navigation at all");
}
{
  // The same arrival asked for twice — a click handler plus the hashchange that
  // same click causes — is one journey, not two.
  const r = runSeam({});
  r.PDXHR1 = { mount: () => {} };
  r.pdxOpenSurface("hr1-showcase");
  r.pdxOpenSurface("hr1-showcase");
  eq(r.calls.filter((c) => c === "scroll:hr1-showcase").length, 1,
    "a repeated arrival restarts the scroll. On a phone that reads as a jump that changed its mind\n" +
    "    halfway");
}
{
  // pdxOpenBills: the library's Legislation tab, with the reader moving first.
  const r = runSeam({});
  const focused = [];
  r.PDXDigitalLibrary = { focus: (o) => focused.push(o) };
  const took = r.pdxOpenBills();
  eq(took, true, "pdxOpenBills() did not report success with the library present");
  eq(focused.length, 1, "pdxOpenBills() did not ask the library for a mode exactly once");
  eq(focused[0] && focused[0].mode, "legislation",
    "pdxOpenBills() does not select the Legislation tab, which is the whole difference between the\n" +
    "    bill catalog and the archive");
  ok(r.calls.includes("scroll:digital-library"),
    "pdxOpenBills() never scrolls to the library, so on a phone the tab changes somewhere off-screen");
  // A tap that beats the module's own <script> tag. digital-library.js is loaded
  // low on the page, so on a cold phone the reader can absolutely get there first.
  const r2 = runSeam({});
  const late = [];
  let looks = 0;
  Object.defineProperty(r2, "PDXDigitalLibrary", {
    get() { return ++looks < 4 ? undefined : { focus: (o) => late.push(o) }; },
  });
  r2.pdxOpenBills();
  eq(late.length, 1,
    "a tap that lands before digital-library.js does is never retried, so the reader is left on the\n" +
    "    archive with the tab they asked for silently dropped");
  eq(late[0] && late[0].mode, "legislation", "the retry lost the mode it was retrying for");
  ok(r2.calls.includes("scroll:digital-library"),
    "with the module still absent the reader is not even taken to the library section, which is the\n" +
    "    honest fallback the anchor already promised");
  // And the retrying is bounded — a page where the module never arrives stops asking.
  // (Timers run synchronously in this sandbox, so the retry chain runs to its end
  // inside the call and the count below IS the bound.)
  const r3a = runSeam({});
  r3a.timers = 0;
  r3a.pdxOpenBills();
  ok(r3a.timers > 1 && r3a.timers <= 40,
    `pdxOpenBills() scheduled ${r3a.timers} retries with the module never arriving. It has to keep\n` +
    "    asking long enough to cover a slow script and then stop — an unbounded retry is a timer that\n" +
    "    outlives the tap that started it, and zero retries is the original bug");
  // The bills door is a mode of the existing router, not a new global.
  const r3 = runSeam({});
  const f3 = [];
  r3.PDXDigitalLibrary = { focus: (o) => f3.push(o) };
  r3.pdxDoor("bills");
  eq(f3.length, 1, "pdxDoor('bills') does not route to the bill catalog, so the router and the nav disagree\n" +
    "    about where bills live");
  // ...and adding it did not add a sixth button to the chooser.
  eq((INDEX.match(/window\.pdxDoor&&window\.pdxDoor\('/g) || []).length, 5,
    "the door chooser no longer carries exactly five buttons. 'bills' is a nav destination, not a\n" +
    "    sixth door on the first screen");
}

// ── 3 · The catalog keeps the tab it was given ───────────────────────────────
// digital-library.js is run for real against a DOM thin enough to be honest: ids
// resolve, innerHTML is a string, and nothing pretends to lay anything out.
function runLibrary() {
  const made = [];
  const stub = (id) => {
    const e = {
      id, innerHTML: "", textContent: "", hidden: false, value: "",
      style: {}, _cls: new Set(),
      classList: {
        add(c) { e._cls.add(c); }, remove(c) { e._cls.delete(c); },
        contains(c) { return e._cls.has(c); },
        toggle(c, on) { if (on === undefined) on = !e._cls.has(c); if (on) e._cls.add(c); else e._cls.delete(c); return on; },
      },
      appendChild(k) { made.push(k); return k; },
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
      querySelector(sel) { return stub(id + ">" + sel); },
      querySelectorAll() { return []; },
      scrollIntoView() { e._scrolled = (e._scrolled || 0) + 1; },
      closest: () => null,
    };
    return e;
  };
  const nodes = {};
  const get = (id) => {
    if (id === "dlib-css") return nodes[id] || null;   // absent until injectCss runs
    return (nodes[id] = nodes[id] || stub(id));
  };
  const doc = {
    readyState: "complete",
    getElementById: get,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (t) => { const e = stub("created:" + t); e.tag = t; return e; },
    addEventListener() {}, dispatchEvent() { return true; },
    head: stub("head"), body: stub("body"), documentElement: stub("html"),
  };
  const bills = [
    { id: 11, number: "H.R. 1", title: "One Big Beautiful Bill Act", congress: 119, chamber: "house", status: "enacted", issueKeys: ["taxes", "healthcare"], isOmnibus: true, voteCount: 2, issueCount: 2 },
    { id: 12, number: "H.B. 257", title: "A state measure", congress: null, externalIds: { utahSession: "2024GS" }, chamber: "house", status: "enacted", issueKeys: ["education"], voteCount: 1, issueCount: 1 },
  ];
  const opened = [];
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, Set, Map, Date, Promise, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: (fn) => { fn(); return 1; },
    document: doc,
    location: { href: "https://politidex.fyi/", pathname: "/", search: "", hash: "", origin: "https://politidex.fyi" },
    navigator: { userAgent: "node" },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    fetch: () => Promise.reject(new Error("no network in this test")),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    PDXSpotlight: {
      list: () => [{ slug: "utah-water", title: "Utah water", place: "Utah", primaryIssueKey: "environment", blurb: "A spotlight." }],
      open() {},
    },
    PDXBills: {
      ensureIndex: () => Promise.resolve(bills),
      listSync: () => ({ items: bills.slice() }),
      list: () => Promise.resolve({ items: bills.slice() }),
      open: (ref) => { opened.push(ref); return true; },
      isFollowed: () => false,
      followed: () => [],
      toggleFollow: () => true,
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.nodes = nodes; ctx.opened = opened;
  vm.runInContext(DLIB, vm.createContext(ctx), { filename: "digital-library.js" });
  return ctx;
}

const flush = () => new Promise((r) => setTimeout(r, 0));
{
  const lib = runLibrary();
  must(lib.PDXDigitalLibrary && typeof lib.PDXDigitalLibrary.focus === "function",
    "digital-library.js did not publish PDXDigitalLibrary.focus() in the sandbox — the run below\n" +
    "    proves nothing");
  const grid = () => lib.nodes["dlib-grid"].innerHTML;

  lib.PDXDigitalLibrary.focus({ mode: "legislation" });
  await flush(); await flush();
  ok(/dlib-billcard/.test(grid()),
    "asking the library for its Legislation tab does not produce a bill list. That list IS the bill\n" +
    "    catalog the nav promises");
  ok(/data-bill="/.test(grid()),
    "the bill rows carry no bill reference, so tapping one cannot open the bill file");
  ok(lib.nodes["digital-library"].classList.contains("dlib-mode-legislation"),
    "the library section is not flagged as being in Legislation mode, so its own CSS still shows the\n" +
    "    archive chrome over the bill list");
  eq(lib.nodes["dlib-bill-facets"].hidden, false,
    "the Legislation facet bar (congress / chamber / status / issue) stays hidden, so the catalog\n" +
    "    arrives with no way to filter it");

  // THE REPORTED BUG. A lazily-loaded dataset lands and the library rebuilds. It
  // must rebuild the tab the reader is looking at.
  lib.PDXDigitalLibrary.render();
  await flush(); await flush();
  ok(/dlib-billcard/.test(grid()),
    "a library re-render repainted the archive over the reader's bill list. This is exactly what made\n" +
    "    'Legislation / Bills' look like it opened the same room as 'Digital Library'");

  // ...and the archive door still opens the archive, even after that.
  lib.PDXDigitalLibrary.focus();
  await flush(); await flush();
  ok(!/dlib-billcard/.test(grid()),
    "'Digital Library' with no mode named now opens the bill catalog, because the last mode used is\n" +
    "    remembered. The archive door has to open the archive");
  ok(!lib.nodes["digital-library"].classList.contains("dlib-mode-legislation"),
    "the library section is still flagged as Legislation mode after being asked for the archive");
}
// The source-level rule behind that behaviour, so a future edit that re-hardcodes
// the archive fails here rather than on a phone.
{
  const render = DLIB.slice(DLIB.indexOf("\n  function render() {"), DLIB.indexOf("\n  function boot("));
  ok(/_state\.mode === 'legislation'\) loadBills\(\);/.test(render),
    "render() no longer branches on the selected mode. It is re-run every time a lazy dataset arrives,\n" +
    "    so an unconditional archive repaint there is a bill list that disappears on its own");
  const sStart = DLIB.indexOf("\n  function setMode(");
  must(sStart !== -1, "digital-library.js no longer has setMode() — the tab switch moved somewhere else");
  const setMode = DLIB.slice(sStart, DLIB.indexOf("\n  function ", sStart + 5));
  ok(/injectCss\(\);/.test(setMode),
    "setMode() does not inject the library's CSS. The archive needs its registry before render() will\n" +
    "    run at all, so a mode switch can legitimately arrive first — unstyled is still broken");
}

// ── 4 · One bill file, and it is /b/<sitting>/<number> ───────────────────────
{
  const aStart = DLIB.indexOf("\n  function applyBills(");
  must(aStart !== -1, "digital-library.js no longer has applyBills() — the catalog rows moved somewhere else");
  const applyBills = DLIB.slice(aStart, DLIB.indexOf("\n  function ", aStart + 5));
  ok(/api\.open\(b\.getAttribute\('data-bill'\)\)/.test(applyBills),
    "a row in the catalog no longer opens through PDXBills.open, which is the one door to the bill\n" +
    "    file. A second way in is a second product");
  ok(/PDXBillDetail\.open\(ref, sit\)/.test(BILLS),
    "PDXBills.open no longer hands the bill panel a sitting. A bill number repeats every congress and\n" +
    "    every state session, so dropping it lands the reader on the wrong measure");
  ok(/function sittingOfCard/.test(BILLS) && /utahSession/.test(BILLS),
    "PDXBills lost the sitting it derives from a card, which is what makes a state measure openable");
  ok(/'\/b\/' \+ \(sit \? encodeURIComponent\(sit\) \+ '\/' : ''\)/.test(SHARE),
    "the bill file's shareable address is no longer /b/<sitting>/<number>. That address is what the\n" +
    "    catalog rows resolve to, and it is the one the edge and the sitemap already publish");
  ok(/BILL_PATH = \/\^\\\/b\\\//.test(SHARE),
    "share-links.js no longer reads /b/<sitting>/<number> off the address bar, so a shared bill link\n" +
    "    stops opening the panel it names");
  // No new bill surface was introduced to satisfy any of the above.
  eq((INDEX.match(/href="\/bills?"/g) || []).length, 0,
    "a new standalone bills page was linked into the shipped page. /b/<sitting>/<number> is the bill\n" +
    "    file and the Legislation tab is its catalog — a third surface is the thing the brief forbade");
}

if (failures.length) {
  console.error(`\n✗ bill jumps: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ bill jumps: all ${passed} assertions passed — 3 entrances, 1 seam, tab survives a re-render, 1 bill file`);
