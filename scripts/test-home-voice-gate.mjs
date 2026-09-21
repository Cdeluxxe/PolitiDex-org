#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-home-voice-gate.mjs — the homepage's one door into District Voice
// ─────────────────────────────────────────────────────────────────────────────
// /voice has been its own document for a while and the front page named it in
// exactly two places, both of them nav rows: the desktop nav menu and the mobile
// sheet. A stranger who never opens a nav menu had no way to learn that the
// rooms for their own seats exist, so the lane with the narrowest audience had
// the most hidden door in the product. One card in the hero fixes that, and
// every way a card like this goes wrong ships looking fine:
//
//   1. IT POINTS AT THE FINDER. /#who-represents-me SETS a location and then
//      leaves the reader standing on the front page holding an answer they did
//      not ask for — the exact bug `next=` was added to fix, and /voice's own
//      empty state already carries the finder door with the intent attached.
//      A card that points at the finder re-opens it from the homepage.
//   2. IT POINTS AT A SEAT. /district/ut-sd-3 is Weber County SD-3's board. A
//      stranger handed that address has been told they live somewhere they may
//      not, and that exclusivity IS the product.
//   3. IT ONLY WORKS WITH JAVASCRIPT. A button with a click handler, an
//      href="#", or a label painted by a module cannot be middle-clicked,
//      copied, crawled, or followed with scripting off.
//   4. THE HREF BECOMES STATEFUL. A card that rewrites its own destination once
//      a location resolves has two addresses, and one of them is wrong the
//      moment the resolver disagrees with the page.
//   5. THE FAT RESOLVER ARRIVES. pdxRepsForMe() called on the homepage to
//      PREVIEW five seats pulls the whole location resolver onto index.html's
//      critical path to render a label that has two possible values.
//   6. EQUITY VOCABULARY, OR "YET". A share, a unit, a due, a percentage or a
//      freeze on this card is a different product wearing this one's URL; and a
//      seat with no board is not a seat waiting for one.
//   7. THE CARD WRITES. A location key, a stance store or a team slate touched
//      by a label swap is a store with two owners.
//   8. SOMETHING ELSE MOVED WITH IT. The nav rows, Johnson's own board control,
//      the one-row allow-list, the FD tables, or the record engines.
//
// Eight sections, one per failure mode, plus the worker.
//
//   node scripts/test-home-voice-gate.mjs
//
// Real files, real modules, one node:vm sandbox. No database, no network, no
// browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

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
  console.log(`   ✓ home voice gate: all ${passed} assertions passed`);
}
// A probe whose target was renamed away is stale, not passing.
const must = (c, m) => { if (!c) { console.error(`✗ home voice gate: STALE HARNESS — ${m}`); process.exit(2); } };

const INDEX = R("index.html");
const DV = R("district-voice.js");
const DB = R("district-board.js");
const PF = R("person-file.js");
const SW = R("sw.js");

const stripComments = (s) => String(s)
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");
const textOf = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// ═════════════════════════════════════════════════════════════════════════════
// THE CARD, SLICED BY ITS OWN MARKERS
// ═════════════════════════════════════════════════════════════════════════════
// Bounded by comment markers rather than by a class, for the same reason the
// hero's record strip is: a class is the thing most likely to be renamed out
// from under a test, and a slice that silently widens to the rest of the hero
// would sweep the two ranked doors' copy and pass for the wrong reason.
const GATE = (() => {
  const a = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
  must(a > 0, "index.html carries no pdx:home-voice-gate:begin marker");
  const b = INDEX.indexOf("<!-- pdx:home-voice-gate:end -->", a);
  must(b > a, "the gate's end marker is missing or above its begin marker");
  return INDEX.slice(a, b);
})();
must(GATE.length > 600, `the gate slice is too thin to test (${GATE.length} chars)`);

// AND IT IS IN THE HERO, which is the placement the brief asked for: the hero
// strip, under the record carousel and its record links — not a second nav row
// and not a new section of its own.
{
  const heroAt = INDEX.indexOf('<section id="hero"');
  must(heroAt > 0, "index.html no longer opens a #hero section");
  const heroEnd = INDEX.indexOf("</section>", heroAt);
  const gateAt = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
  ok(gateAt > heroAt && gateAt < heroEnd,
    "placement: the gate is not inside the hero section");
  ok(gateAt > INDEX.indexOf('<div id="hero-showcase"'),
    "placement: the gate sits above the record carousel it is supposed to follow");
  // NO NESTED <section>. #hero is sliced to its FIRST closing tag by
  // test-index-scripts.mjs and test-first-run.mjs, so a section opened here
  // truncates the hero for both of them and takes .hero-stack-end out of range.
  no(GATE, "<section", "placement: the gate opens a nested <section> inside #hero");
  no(GATE, "</section>", "placement: the gate closes a section it did not open");
  // AND IT IS ABOVE THE BOTTOM-SLACK HOOK, which must stay the last direct child.
  ok(gateAt < INDEX.indexOf('class="hero-stack-end'),
    "placement: the gate is filed below .hero-stack-end");
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one anchor, and its address is /voice");
// ═════════════════════════════════════════════════════════════════════════════

const ANCHORS = [...GATE.matchAll(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<\/a>/g)].map((m) => m[0]);
eq(ANCHORS.length, 1, `the gate carries ${ANCHORS.length} anchors — it is one card with one door`);
const DOOR = ANCHORS[0] || "";
const DOOR_HREF = (/href="([^"]*)"/.exec(DOOR) || [, ""])[1];
eq(DOOR_HREF, "/voice", "the door's href is not /voice");
ok(/^<a\b/.test(DOOR), "the door is not an anchor element");
// IT WORKS WITH JAVASCRIPT OFF AND IT MIDDLE-CLICKS. Both follow from the same
// two facts: a real anchor, and a real address in the served markup.
no(GATE, 'href="#"', "the gate carries a dead hash");
no(GATE, "closeModal(", "the gate dismisses the page it is on instead of going somewhere");
no(GATE, "<button", "the gate's door is a button, which cannot be opened in a tab or copied");
no(GATE, "preventDefault", "the gate intercepts its own click, which breaks middle-click and JS-off");
no(GATE, "onclick", "the gate hangs behaviour off a click handler");

// ── THE TWO ADDRESSES IT MUST NOT NAME ──────────────────────────────────────
// The finder: /voice's empty state already IS the finder door, with ?next=/voice
// on it, so a card that points at the finder places a reader and abandons them.
no(GATE, "#who-represents-me", "the gate points at the finder instead of /voice");
no(GATE, "next=", "the gate composes its own return intent — that belongs to /voice's empty state");
// One seat's board, and one seat's file.
no(GATE, "/district/", "the gate points at one seat's board");
no(GATE, "/d/ut-", "the gate points at one seat's file");
no(GATE, "ut-sd-3", "the gate names the one seat that has a board");
no(GATE, "Johnson", "the gate names the sitting member — the hub does that when the seat is the reader's");
// AND THE HREF IS NEVER REWRITTEN. Two possible labels, one address, forever.
const GATE_CODE = stripComments(GATE);
for (const bad of ["setAttribute('href'", 'setAttribute("href"', ".href =", ".href="]) {
  no(GATE_CODE, bad, `the gate rewrites its own destination (${bad})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the locked copy, and nothing the lane does not say");
// ═════════════════════════════════════════════════════════════════════════════

const EYEBROW = "District Voice";
const LINE = "The rooms for your seats. Anyone can read. Only verified residents of that seat get a voice that counts.";
const UNPLACED = "Find your rooms";
const PLACED = "See your rooms";
// The count in this sentence is pinned to BOARD_ROUTES in section 6, not here:
// this line is the SHAPE of the sentence, and that block is the arithmetic.
const NOTE = "Five seats have a board on file today. The others list the member and say the room is not open.";

// The visible copy, with the comments, the style block and the script stripped
// the way a reader sees it.
const CARD_TEXT = textOf(
  stripComments(GATE)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
);
must(CARD_TEXT.length > 120, `the card's reader-visible copy is too thin to sweep (${CARD_TEXT.length} chars)`);

has(CARD_TEXT, EYEBROW, "copy: the eyebrow is not on the card");
has(CARD_TEXT, LINE, "copy: the locked line is not on the card, verbatim");
has(CARD_TEXT, UNPLACED, "copy: the served label is not the no-location one");
has(CARD_TEXT, NOTE, "copy: the one true sentence about the allow-list is not on the card");
// AND THE OPTIONAL LINE IS STILL TRUE. It counts the seats that have a board;
// the table that decides that is district-voice.js's, and section 6 below reads
// it and re-derives this sentence's number from the rows rather than trusting
// the string above.

// THE SWEEP COVERS THE STRINGS THE SCRIPT COULD REACH FOR TOO, not just the
// markup — a label composed in code is copy a reader sees.
const SWEEP = [CARD_TEXT, UNPLACED, PLACED, GATE_CODE].join("  ·  ");

// "YET" IS THE WHOLE BAN on the absence of a board: a seat with no board is not
// a seat waiting for one. We have not built that room and we have not promised
// to, and "yet" prints a roadmap as a status.
ok(!/\byet\b/i.test(SWEEP),
  `copy: "yet" reaches a reader — ${(/[^·]*\byet\b[^·]*/i.exec(SWEEP) || [""])[0].trim()}`);
for (const phrase of ["coming soon", "Coming Soon"]) {
  no(SWEEP, phrase, `copy: "${phrase}" is on the card`);
}

// NO EQUITY VOCABULARY. This is a card about who represents somebody. A share, a
// unit, a due or a Reg CF disclosure on it would be a different product wearing
// this one's URL, and the words are banned before the feature can arrive.
for (const re of [/\bshares?\b/i, /\bstocks?\b/i, /\bunits?\b/i, /\bdues\b/i, /reg\s*cf/i,
  /\bequity\b/i, /\bfreeze\b/i, /\b20\s*%/, /\b15\s*%/, /\bearn\b/i, /\binvestors?\b/i,
  /\bowners?\b/i, /\bcap\s*table\b/i, /\bdividend/i, /\bvaluation\b/i]) {
  ok(!re.test(SWEEP),
    `copy: ${re} matches the card — "${(new RegExp("[^·]*" + re.source + "[^·]*", "i").exec(SWEEP) || [""])[0].trim()}"`);
}

// NO MAP, NO COMPOSER, NO COUNTS. The card is three sentences and one anchor; it
// is not a thin copy of the surfaces behind it.
for (const wall of ["Carto", "carto", "Leaflet", "leaflet", "mapbox", "Veriff", "veriff",
  "<textarea", "<form", "<table", "<input", "<canvas", "<svg", "<img"]) {
  no(GATE, wall, `the card reaches for ${wall}`);
}
// And no number of any kind on the card face: a seeded count is a claim about a
// room this card has not read.
ok(!/\d/.test(CARD_TEXT.replace(EYEBROW, "")),
  `the card face prints a figure — "${CARD_TEXT}"`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the rendered card: two labels, one address, no resolver");
// ═════════════════════════════════════════════════════════════════════════════

// THE CARD'S OWN SCRIPT, LIFTED OUT OF THE DOCUMENT AND RUN FOR REAL. Not a
// stub of it: the thing index.html ships, against a stub of the two globals it
// is allowed to read.
const GATE_JS = (() => {
  const m = /<script>([\s\S]*?)<\/script>/.exec(GATE);
  must(!!m, "the gate no longer carries an inline script this suite can lift");
  return m[1];
})();
must(GATE_JS.indexOf("_hasUserLocation") > 0, "the lifted script does not read the standing flag");

function boot(opts) {
  const o = opts || {};
  const win = makeSandbox();
  const writes = [];
  const calls = [];
  const el = {
    id: "pdx-home-voice-door",
    textContent: UNPLACED,
    _a: { href: "/voice", "data-pdxhv-standing": "unplaced" },
    setAttribute(k, v) { this._a[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
  };
  const listeners = {};
  win.document = Object.assign({}, win.document, {
    readyState: o.readyState || "complete",
    getElementById: (id) => (id === "pdx-home-voice-door" ? el : null),
    addEventListener(t, f) { (listeners["doc:" + t] = listeners["doc:" + t] || []).push(f); },
  });
  win.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  win.localStorage = {
    getItem: (k) => { calls.push(["read", k]); return null; },
    setItem: (k, v) => writes.push(["local", k]),
    removeItem: (k) => writes.push(["local-rm", k]),
  };
  win.sessionStorage = {
    getItem: (k) => { calls.push(["read", k]); return null; },
    setItem: (k, v) => writes.push(["session", k]),
    removeItem: (k) => writes.push(["session-rm", k]),
  };
  win._hasUserLocation = !!o.placed;
  // THE TRIPWIRE. If anything in the card asks the resolver, this records it and
  // the assertion below fails — which is the whole point of the section.
  win.pdxRepsForMe = () => { calls.push(["pdxRepsForMe"]); return { located: false, levels: [] }; };
  let mapRefreshes = 0;
  if (o.withHook) win._pdxRefreshMapIndicators = () => { mapRefreshes++; };
  win.window = win;
  vm.runInContext(GATE_JS, vm.createContext(win), { filename: "index.html#home-voice-gate" });
  return {
    win, el, writes, calls,
    refreshes: () => mapRefreshes,
    fire(t) { for (const f of (listeners[t] || [])) f({ type: t }); },
    fireDoc(t) { for (const f of (listeners["doc:" + t] || [])) f({ type: t }); },
  };
}

// NO LOCATION → THE VERB IS "FIND", and it is the served label unchanged.
{
  const h = boot({ placed: false });
  eq(h.el.textContent, UNPLACED, "unplaced: the label is not the no-location one");
  eq(h.el.getAttribute("href"), "/voice", "unplaced: the href moved");
  eq(h.el.getAttribute("data-pdxhv-standing"), "unplaced", "unplaced: the standing attribute is wrong");
}
// A LOCATION ON FILE → ONLY THE VERB CHANGES.
{
  const h = boot({ placed: true });
  eq(h.el.textContent, PLACED, "placed: the label did not change to the located one");
  eq(h.el.getAttribute("href"), "/voice", "placed: the href moved — it is /voice at every standing");
  eq(h.el.getAttribute("data-pdxhv-standing"), "placed", "placed: the standing attribute is wrong");
}
// AND THE RESOLVER IS NEVER ASKED, in either standing. Resolving five seats to
// preview them is how the fat resolver gets pulled onto index.html's critical
// path, and the label has two possible values.
for (const placed of [false, true]) {
  const h = boot({ placed });
  ok(!h.calls.some((c) => c[0] === "pdxRepsForMe"),
    `resolver: pdxRepsForMe() was called on the homepage (placed=${placed})`);
  // NO STORE READ EITHER. The standing is one boolean published by the module
  // that owns the record; parsing the record here would be a second answer.
  eq(h.calls.filter((c) => c[0] === "read").length, 0,
    `resolver: the card read a store directly (placed=${placed}) — ${JSON.stringify(h.calls)}`);
}
// NO SEAT NAMES, NO SEAT COUNT, NO BOARD LOOKUP. The card does not know or ask.
for (const name of ["pdxRepsForMe", "seatsForMe", "boardPath", "PDXVoice", "BOARD_ROUTES",
  "PDXReturn", "levels"]) {
  no(GATE_CODE, name, `the card's code names ${name}`);
}

// THE RE-SYNC, AND IT IS ONE GUARDED WRAP. A reader who sets a location in the
// hub below sees the verb change without a reload, and the wrap is idempotent.
{
  const h = boot({ placed: false, withHook: true });
  eq(h.el.textContent, UNPLACED, "re-sync: the first paint is wrong");
  ok(h.win._pdxRefreshMapIndicators.__pdxhvWrapped === true,
    "re-sync: the location fan-out hook was not wrapped");
  h.win._hasUserLocation = true;
  h.win._pdxRefreshMapIndicators();
  eq(h.el.textContent, PLACED, "re-sync: a location saved after boot did not change the verb");
  eq(h.refreshes(), 1, "re-sync: the wrap did not call through to the original");
  // AND IT CANNOT DOUBLE-WRAP. Running the block twice is what a duplicated
  // inline script does, and a second wrap is a second call-through per save.
  vm.runInContext(GATE_JS, vm.createContext(h.win), { filename: "index.html#home-voice-gate(2)" });
  h.win._pdxRefreshMapIndicators();
  eq(h.refreshes(), 2, "re-sync: the guard let the hook be wrapped twice");
}
// AND WITH NO HOOK AT ALL the label still stands and the door still opens.
{
  const h = boot({ placed: true, withHook: false });
  eq(h.el.textContent, PLACED, "degraded: the label is wrong with the location module absent");
  eq(h.el.getAttribute("href"), "/voice", "degraded: the href moved");
}
// A BACK-FORWARD RESTORE RE-READS THE STANDING rather than repainting a stale verb.
{
  const h = boot({ placed: false, withHook: true });
  h.win._hasUserLocation = true;
  h.fire("pageshow");
  eq(h.el.textContent, PLACED, "bfcache: pageshow did not re-read the standing");
}
// A MISSING ELEMENT IS A NO-OP, NOT A THROW. The card is in the document, but a
// reader-mode extension or a failed parse is not this script's business.
{
  const win = makeSandbox();
  win.window = win;
  win.document = Object.assign({}, win.document, { readyState: "complete", getElementById: () => null });
  win.addEventListener = () => {};
  let threw = null;
  try { vm.runInContext(GATE_JS, vm.createContext(win), { filename: "index.html#home-voice-gate(bare)" }); }
  catch (e) { threw = e; }
  ok(!threw, `degraded: the card throws with its anchor absent (${threw && threw.message})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the card writes nothing");
// ═════════════════════════════════════════════════════════════════════════════

// TWICE: by source sweep, and by booting the thing against a storage stub that
// records every write. A label swap that touches a store is a store with two
// owners, and the one that loses is the reader's saved address.
for (const key of ["politidex_voter_location", "pdx_voter_location", "politidex_my_team",
  "pdx_my_stances_v1", "pdx_your_file_v1", "pdx_team", "pdx_district", "voterLocation",
  "localStorage", "sessionStorage", "cookie", "indexedDB", "fetch("]) {
  no(GATE_CODE, key, `the card's code names ${key}`);
}
for (const placed of [false, true]) {
  const h = boot({ placed, withHook: true });
  h.win._pdxRefreshMapIndicators();
  h.fire("pageshow");
  eq(h.writes.length, 0,
    `storage: the card wrote to storage (placed=${placed}) — ${JSON.stringify(h.writes)}`);
  eq(h.win.document.cookie, "", `storage: the card set a cookie (placed=${placed})`);
}

// AND IT ADDS NOTHING TO THE CRITICAL PATH. No script tag, no stylesheet link,
// no font, no preload: the card is markup, one inline rule block and one inline
// function, and index.html's script manifest is exactly what it was.
no(GATE, "<script src", "the card loads a module");
no(GATE, "<script defer", "the card registers a deferred module");
no(GATE, "<link", "the card links a sheet");
ok(/<style>/.test(GATE), "the card's own rules are not inline, which is where a one-card sheet belongs");
// THE PREFIX IS THE CARD'S ALONE. A sheet that silently restyles another
// module's surface is the bug a checked prefix prevents.
{
  const others = ["voice.html", "district-voice.css", "app.css", "app-2.css", "me-desk.css",
    "shell-chrome.css", "district-room.css", "record-card.css"];
  for (const f of others) {
    let src = "";
    try { src = R(f); } catch (e) { src = ""; }
    if (!src) continue;
    no(src, "pdxhv-", `prefix: ${f} already defines or references pdxhv-`);
  }
  // And it is not the board's prefix, nor the hub's.
  no(GATE, "pdxvr-", "the card wears /voice's hallway prefix");
  no(GATE, "pdxv-", "the card wears the board's prefix");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the nav rows did not move");
// ═════════════════════════════════════════════════════════════════════════════

// THE ROWS, FOUND BY THEIR OWN TEXT, the same way test-voice-hub.mjs finds them:
// the desktop menu nests two spans and an emoji, the mobile sheet is text.
//
// Swept against a comment-stripped copy, because index.html's prose explains its
// own chrome: a CSS comment in the hero's sheet contains the words "fixed <nav>
// carrying TWO stacked rows", and a sweep that reads that as an open tag runs to
// the next real </nav> a hundred kilobytes later and "finds" the whole document.
const PROSE_FREE = stripComments(INDEX);
{
  const rows = [...PROSE_FREE.matchAll(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?District Voice(?:(?!<\/a>)[\s\S])*?<\/a>/g)]
    .map((m) => m[0]);
  eq(rows.length, 2,
    `index.html carries ${rows.length} "District Voice" anchors — the desktop menu and the mobile sheet are two, ` +
    "and the hero card's own eyebrow is deliberately not one of them");
  for (const row of rows) {
    const href = (/href="([^"]*)"/.exec(row) || [, ""])[1];
    eq(href, "/voice", `nav: a District Voice row points at ${JSON.stringify(href)}`);
    ok(/^<a\b/.test(row), "nav: a District Voice row is not an anchor");
  }
  // NO THIRD NAV ROW. The card is a card; the chrome carries the rows it should.
  const navs = [...PROSE_FREE.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)].join(" ");
  must(navs.length > 500, "no <nav> element could be read out of index.html");
  no(navs, "pdxhv-", "nav: the gate's card leaked into a nav element");
  no(navs, "/district/", "nav: a nav row links to one seat's board");
  no(navs, "/d/ut-", "nav: a nav row links to one seat's file");
}
// AND THE ADDRESS THE CARD AND THE ROWS SHARE IS SERVED AT 200, not hopped.
{
  const TOML = R("netlify.toml");
  const rules = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
    const body = m[1];
    const g = (k) => (new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*?)"?\\s*$`, "m").exec(body) || [, ""])[1];
    return { from: g("from"), to: g("to"), status: g("status") };
  });
  const voice = rules.filter((r) => /^\/voice\/?$/.test(r.from));
  eq(voice.length, 2, "rewrite: /voice and /voice/ are not both spelled out");
  for (const r of voice) {
    eq(r.to, "/voice.html", `rewrite: ${r.from} does not answer with the hub`);
    eq(r.status, "200", `rewrite: ${r.from} hops instead of answering`);
  }
  ok(!rules.some((r) => /^\/district\/\*/.test(r.from)),
    "rewrite: /district/* is splatted — an allow-list of named boards must not answer for every slug typed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the allow-listed boards, and the person-file control is untouched");
// ═════════════════════════════════════════════════════════════════════════════

// THE ALLOW-LIST IS A TABLE OF NAMED ROWS, read out of its owner by booting it.
// It was one row when one board had opened; it is four now, and the fence is not
// the number — it is that the card's sentence COUNTS THE TABLE. A card that says
// "one seat" while four rows ship is a page understating the site to the reader
// it is trying to place, and that is the failure this block exists to catch.
{
  const win = makeSandbox();
  win.window = win;
  win.document = Object.assign({}, win.document, { getElementById: () => null });
  vm.runInContext(DV, vm.createContext(win), { filename: "district-voice.js" });
  const V = win.PDXVoice;
  must(!!V && V.BOARD_ROUTES, "district-voice.js no longer publishes BOARD_ROUTES");
  const rows = Object.keys(V.BOARD_ROUTES);
  ok(rows.length >= 1, "allow-list: no board is routed at all");
  eq(V.BOARD_ROUTES["ut-statesenate-3"], "/district/ut-sd-3",
    "allow-list: SD-3's row does not name its board");
  // EVERY ROW IS A DOOR THAT OPENS. A routed alias with no document behind it is
  // a card promising a room that 404s, which is worse than the empty sentence.
  for (const k of rows) {
    const route = String(V.BOARD_ROUTES[k]);
    ok(/^\/district\/[a-z]{2}-(?:hd|sd|cd)-[1-9][0-9]*$/.test(route),
      `allow-list: ${k} routes to ${JSON.stringify(route)}, which is not a board address`);
    const doc = `district-${route.split("/").pop()}.html`;
    ok(existsSync(join(ROOT, doc)), `allow-list: ${k} routes at ${route} with no ${doc} behind it`);
    ok(new RegExp(`\\[\\[redirects\\]\\]\\s*\\n\\s*from = "${route}"\\n\\s*to = "${doc.replace(/^/, "/")}"\\n\\s*status = 200`).test(R("netlify.toml")),
      `allow-list: ${route} has no exact 200 rewrite onto /${doc} in netlify.toml`);
  }
  // AND THE CARD'S THIRD SENTENCE IS A COUNT OF THAT TABLE, not a description
  // somebody remembered to update. The number is spelled as a word, so the
  // assertion reads the word back.
  const WORD = ["no", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const seatWord = WORD[rows.length] || String(rows.length);
  const verb = rows.length === 1 ? "seat has" : "seats have";
  has(CARD_TEXT, `${seatWord} ${verb} a board on file today`,
    `copy: the card's allow-list sentence does not count the ${rows.length} rows BOARD_ROUTES actually holds`);
  eq(typeof V.COPY, "object", "the owner no longer publishes its COPY block");
  has(String(V.COPY.boardWhy || ""), "this room is not open",
    "copy: the card promises a sentence the hub does not print");
}
// THE PERSON-FILE CONTROL, AT EACH BOARD'S OWN ADDRESS. The homepage card points
// at /voice; the person file's board control points at the board of whichever
// seat that person holds — and the kicker and the route both come off the BOARDS
// row rather than being written into the function, which is what lets one
// control serve four boards without a branch per seat.
{
  has(DB, "'ut-statesenate-3': {", "district-board.js's BOARDS table lost SD-3's row");
  has(DB, "route: '/district/ut-sd-3'", "district-board.js's SD-3 route moved");
  has(DB, "pid: 'john_johnson'", "district-board.js's SD-3 pid moved");
  has(DB, "kick: 'District 3 board'", "district-board.js's SD-3 control lost its label");
  const fnSrc = (/function personLinkHtml\(pid\) \{[\s\S]*?\n  \}/.exec(DB) || [""])[0];
  must(fnSrc.length > 80, "district-board.js's personLinkHtml could not be located");
  has(fnSrc, "href=", "the board control is not an anchor");
  has(fnSrc, "b.kick", "the board control no longer takes its label from the board row");
  has(fnSrc, "b.route", "the board control no longer takes its address from the board row");
  ok(!/href="#"/.test(fnSrc), "the board control is a dead hash");
  no(fnSrc, "closeModal", "the board control dismisses the file instead of going somewhere");
  // AND THE PERSON FILE STILL HOLDS NO ALLOW-LIST OF ITS OWN.
  no(stripComments(PF), "'/district/", "person-file.js composes a board address itself");
  has(PF, "window.PDXDistrictBoard", "person-file.js no longer asks the board's owner for the control");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the money lane and the FD tables are unchanged");
// ═════════════════════════════════════════════════════════════════════════════

// NOT UNUSED — UNREACHABLE. No identifier in the card names any of these.
for (const wall of ["PDXFinance", "PDXFinanceLane", "WEALTH_DATA", "PDX_FD_DOCUMENTS",
  "PDX_FD_DISCLOSURES", "FTM_FUNDING", "_pdxFundingSection", "letterheadChipMount"]) {
  no(GATE, wall, `the card names ${wall}`);
}
// THE FD TABLES, PINNED BY ROW COUNT, so a backfill smuggled in beside this pass
// fails here. Lifted to its terminating semicolon and evaluated as DATA, so no
// money code is booted by the test that asserts the money code was not touched.
{
  const FIN = R("pdx-finance.js");
  const lift = (decl) => {
    const a = FIN.indexOf(decl);
    must(a > 0, `pdx-finance.js no longer declares ${decl.trim()}`);
    const b = FIN.indexOf(";", a + decl.length);
    must(b > a, `could not find the end of ${decl.trim()}`);
    return FIN.slice(a + decl.length, b);
  };
  const docs = vm.runInNewContext("(" + lift("var PDX_FD_DOCUMENTS = ") + ")");
  const dis = vm.runInNewContext("(" + lift("var PDX_FD_DISCLOSURES = ") + ")");
  eq(Object.keys(docs).length, 4, "the FD document table no longer holds four rows");
  eq(Object.keys(dis).length, 0, "the FD disclosure table is no longer empty");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the record engines are byte-identical with the card booted");
// ═════════════════════════════════════════════════════════════════════════════

{
  const FILES = [
    "cmp-data.js", "formal-index.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);

  const snapshot = (runCard) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.Date = Date;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;

    let painted = 0;
    if (runCard) {
      const el = {
        textContent: UNPLACED, _a: { href: "/voice" },
        setAttribute(k, v) { this._a[k] = String(v); },
        getAttribute(k) { return this._a[k] || null; },
      };
      win.document.getElementById = (id) => (id === "pdx-home-voice-door" ? el : null);
      win._hasUserLocation = true;
      vm.runInContext(GATE_JS, ctx, { filename: "index.html#home-voice-gate" });
      painted += el.textContent === PLACED ? 1 : 0;
      painted += el.getAttribute("href") === "/voice" ? 1 : 0;
    }

    // THE SUBJECT IS THE MEMBER WHOSE SEAT THE ONE BOARD IS IN, plus a deep
    // federal record, because a leak could land on either.
    const out = [];
    for (const pid of ["john_johnson", "chew"]) {
      const wa = win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
      out.push(["dm", pid, wa && wa.pct, wa && wa.token, wa && wa.verdict && wa.verdict.key,
        wa && wa.publishable, JSON.stringify((wa && wa.counts) || null),
        JSON.stringify((wa && wa.tiers) || null), JSON.stringify((wa && wa.coverage) || null)].join("|"));
      const rows = (win.PDXConsistency.formalPatternIndex.rows(pid) || []).map((r) =>
        [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
      out.push(["tiers", pid, rows.length, win.PDXConsistency.formalPatternIndex.count(pid), rows.join(",")].join("|"));
      const fl = win.PDXPublicationFloor.read(pid);
      out.push(["floor", pid, fl.publishable, fl.cited, fl.promises, fl.formal, (fl.reasons || []).join(";")].join("|"));
      out.push(["formal", pid, win.PDXFormalIndex.acts(pid), win.PDXFormalIndex.measures(pid),
        JSON.stringify(win.PDXFormalIndex.emptyNote(pid))].join("|"));
    }
    return { snap: out.join("\n"), painted };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 300, `twin boot: the record snapshot has something in it (${off.snap.length} chars)`);
  eq(on.painted, 2, "twin boot: the card did not actually paint in the rendering boot");
  eq(off.painted, 0, "twin boot: the other boot painted something");
  eq(on.snap, off.snap,
    "twin boot: Direction Match, the formal pattern index, the publication floor and the formal index are not " +
    "byte-identical with the homepage card booted and without it");
  console.log(`   twin boot · john_johnson + chew · ${off.snap.length}-char snapshot identical either way`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · one version bump, and the entry says what it cost");
// ═════════════════════════════════════════════════════════════════════════════

{
  const VER = (/const CACHE_VERSION = '(v\d+)';/.exec(SW) || [, ""])[1];
  ok(/^v\d+$/.test(VER), `sw: CACHE_VERSION does not read as one version literal (got "${VER}")`);
  ok(Number(VER.slice(1)) >= 229, `sw: CACHE_VERSION is ${VER} — index.html changed and the shell was not re-issued`);
  eq((SW.match(/const CACHE_VERSION = /g) || []).length, 1, "sw: the worker declares its version more than once");

  // THE ENTRY THIS PASS FILED IS v229, PINNED rather than read off the live
  // constant. A changelog entry is a historical record: the claims this pass
  // made belong to the version it shipped in, forever, and asking whatever is
  // live to re-make them turns every later bump into a failure of this suite.
  const PIN = "v229";
  const at = SW.indexOf(`// ${PIN} - `);
  ok(at > 0, `sw: there is no ${PIN} changelog entry`);
  const nextHead = SW.slice(at + 1).match(/\n\/\/ v\d+ - /);
  const constAt = SW.indexOf("const CACHE_VERSION");
  const LOG = at > 0 ? SW.slice(at, Math.min(nextHead ? at + 1 + nextHead.index : constAt, constAt)) : "";
  ok(LOG.length > 200, `sw: the ${PIN} entry is too short to be naming anything (${LOG.length} chars)`);
  ok(LOG.split("\n").length <= 48,
    `sw: the ${PIN} entry is ${LOG.split("\n").length} lines — the worker ships whole on every deploy`);
  // Read as one line, so a claim broken across two comment lines still matches.
  const FLAT = LOG.replace(/\s*\n\/\/\s*/g, " ").replace(/\s+/g, " ");
  ok(/district voice/i.test(FLAT), `sw: the ${PIN} entry does not say which lane got a door`);
  ok(/\/voice/.test(FLAT), `sw: the ${PIN} entry does not name the address the card points at`);
  ok(/no equity copy/i.test(FLAT), `sw: the ${PIN} entry does not say there is no equity copy`);
  ok(/no location key/i.test(FLAT) || /not migrated/i.test(FLAT),
    `sw: the ${PIN} entry does not say the saved location key was left alone`);
  ok(/MIGRATION COST: none/i.test(FLAT), `sw: the ${PIN} entry does not state a migration cost of none`);
  ok(/index\.html/.test(FLAT), `sw: the ${PIN} entry does not name the shell that changed`);
  ok(/byte-identical/i.test(FLAT), `sw: the ${PIN} entry does not say the record engines did not move`);
  // AND IT IS THE NEWEST ENTRY, filed under the constant it explains rather than
  // above an older heading.
  eq((LOG.match(/\n\/\/ v\d+ - /g) || []).length, 0,
    `sw: another version heading sits inside the ${PIN} entry`);
  const prev = SW.indexOf("// v228 - ");
  ok(prev > 0 && prev < at, `sw: the ${PIN} entry is filed above v228 rather than after it`);
}
// AND THE SHELL STILL PRECACHES THE FRONT PAGE AND THE HUB, or the card ships on
// a warm device pointing at a document that device cannot open offline.
{
  const a = SW.indexOf("const SHELL_ASSETS = [");
  must(a > 0, "sw.js no longer declares SHELL_ASSETS");
  const list = SW.slice(a, SW.indexOf("\n];", a)).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const f of ["/", "/voice.html", "/voice-room.js", "/district-voice.js"]) {
    has(list, `'${f}'`, `precache: ${f} is not in SHELL_ASSETS`);
  }
}

report();
