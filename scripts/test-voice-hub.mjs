#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE VOICE HUB AND THE JUMP BACK — /voice as a hallway of seats, and
// every "set your location" door that returns to it
// ─────────────────────────────────────────────────────────────────────────────
// /voice shipped as ONE BOARD. It resolved the reader's saved location down to a
// single seat, mounted that seat's board inline, and called the result "your
// district" — which is wrong twice over. A saved address sits in a State House
// district AND a State Senate district AND a congressional district AND two
// Senate seats AND a governor's state; naming one of them "yours" hides the rest
// behind a page that appears to be about them. And there is exactly ONE board
// open in the whole product today, in Weber SD-3, so the singular framing made
// every other reader's /voice an apology.
//
// /voice is now a HALLWAY. One card per seat the location resolves: the chamber
// and district, the sitting member linked to their person file, and either a
// door to that seat's board or the plain sentence that there is not one. The
// doors come from an ALLOW-LIST keyed by seat — one row long today — so a board
// is offered to a reader only when it is the board for a seat they vote in.
//
// AND THE OTHER HALF IS THE JUMP. Every door reading "set your location so you
// can use District Voice" went to /#who-represents-me, which set one and then
// left the reader standing on the finder holding an answer they had not asked
// for. The intent now travels with them as ?next=, and the location owner spends
// it when the save completes.
//
// THE FAILURE MODES, EACH OF WHICH SHIPS LOOKING FINE:
//
//   1. A BOARD IS OFFERED TO THE WRONG SEAT, because it is the only board there
//      is. A Davis County reader handed the Weber SD-3 board is handed a room
//      they cannot speak in, and the page that hands it over has told them they
//      are a resident of somewhere they are not. Layton is not North Ogden, and
//      that exclusivity IS the product.
//   2. THE ALLOW-LIST BECOMES A PATTERN. /district/<anything>, or a splat, or a
//      composed "ut-sd-" + n. A table with one row is a table; a pattern is a
//      promise about addresses that do not exist.
//   3. THE HUB GOES BACK TO BEING ONE SEAT — one card, "your district", a board
//      mounted inline.
//   4. THE JUMP IS AN OPEN REDIRECT. `next` arrives in a URL, which means it
//      arrives from anywhere, and location.assign() on an attacker-chosen string
//      leaves the origin.
//   5. THE JUMP FIRES WITHOUT A SAVE. A reader who opens the picker with ?next=
//      in the URL and presses Escape must stay exactly where they are.
//   6. THE JUMP FIRES WITHOUT AN INTENT. No `next` means nobody said where they
//      were going, and sending every reader who touched the front page's picker
//      to /voice is this module deciding that for them.
//   7. "YET" COMES BACK. A seat with no board is not a seat waiting for one. And
//      no equity vocabulary — shares, stock, units, dues, Reg CF — reaches a
//      page about who represents somebody.
//   8. THE RECORD ENGINES MOVE. Direction Match, the formal pattern index and
//      the publication floor must be byte-identical with the hallway rendered
//      and without it, and no saved location key may be migrated.
//
// Eight sections, one per item in the brief:
//
//   1. THE NAV ROW POINTS AT /voice.
//   2. A READER WITH NO LOCATION IS OFFERED THE FINDER, CARRYING next=/voice.
//   3. A MOCKED SAVE WITH next=/voice LANDS ON /voice.
//   4. TWO SEATS, TWO CARDS, ONE DOOR.
//   5. WRONG-SEAT EXCLUSIVITY.
//   6. JOHNSON'S PERSON FILE STILL OPENS /district/ut-sd-3.
//   7. THE COPY SWEEP.
//   8. TWIN BOOT, AND NO KEY MIGRATED.
//
//   node scripts/test-voice-hub.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const VOICE_HTML = R("voice.html");
const INDEX = R("index.html");
const FIND = R("find.html");
const VR = R("voice-room.js");
const DV = R("district-voice.js");
const LOC = R("voter-hub-location.js");
const DB = R("district-board.js");
const PF = R("person-file.js");
const MD = R("me-desk.js");
const SW = R("sw.js");
const TOML = R("netlify.toml");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ voice hub: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const stripComments = (s) => String(s)
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");
const textOf = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE NAV ROW
// ═════════════════════════════════════════════════════════════════════════════
section("1 · every District Voice nav row is an anchor to /voice");

// THE ROWS, FOUND BY THEIR OWN TEXT rather than by a class, because the class is
// the thing most likely to be renamed out from under a test. Both of them: the
// desktop bar and the mobile sheet are two separate pieces of markup and the
// mobile one is the one a reader on a phone actually taps.
{
  // The anchor, whatever it wraps: the desktop row nests two spans and an
  // emoji, the mobile row is text, and a match that only admitted bare text
  // would silently stop finding the one a phone actually taps.
  const rows = [...INDEX.matchAll(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?District Voice(?:(?!<\/a>)[\s\S])*?<\/a>/g)]
    .map((m) => m[0]);
  must(rows.length >= 2,
    `index.html carries ${rows.length} "District Voice" nav anchors — the desktop bar and the mobile sheet are two`);
  for (const row of rows) {
    const href = (/href="([^"]*)"/.exec(row) || [, ""])[1];
    eq(href, "/voice", `nav: a District Voice row points at ${JSON.stringify(href)}`);
    // AND IT IS AN ANCHOR, not a button with a click handler. A nav row that is
    // JavaScript-only cannot be opened in a tab, copied, or followed by anything
    // that reads links.
    ok(/^<a\b/.test(row), "nav: a District Voice row is not an anchor");
    ok(href !== "#", "nav: a District Voice row is a dead hash");
  }
  // NO ROW POINTS AT A SEAT. /d/<seat-key> is one seat's file and /district/…
  // is one seat's board; a nav destination that is a single district is the
  // singular framing this pass removed, in the chrome.
  //
  // Swept comment-free, and against an opening TAG rather than the four letters
  // "<nav": index.html's own sheet explains the chrome in prose that contains
  // "a single fixed <nav> carrying TWO stacked rows", and a sweep that reads
  // that as an open tag runs to the next real </nav> a hundred kilobytes below
  // and fails on whatever any unrelated comment in between happens to mention.
  const navs = [...stripComments(INDEX).matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)].join(" ");
  must(navs.length > 500, "no <nav> element could be read out of index.html");
  no(navs, "/d/ut-", "nav: a nav row links to a seat file");
  no(navs, "/district/", "nav: a nav row links to one seat's board");
}
// AND THE ADDRESS RESOLVES. One exact rule per spelling, and no wildcard — a
// splat over /district/* would answer for boards that do not exist.
{
  const rules = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
    const body = m[1];
    // Values are quoted for paths and BARE for the status code, which is how the
    // file writes them: status = 200, not status = "200".
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
    "rewrite: /district/* is splatted — an allow-list of one board must not answer for every slug somebody types");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · NO LOCATION → THE FINDER, CARRYING THE WAY BACK
// ═════════════════════════════════════════════════════════════════════════════
section("2 · a reader with no location is offered the finder, carrying next=/voice");

// THE RETURN HELPER, SLICED OUT OF ITS OWNER AND RUN FOR REAL. voter-hub-location.js
// is 255 KB and boots a location picker; the helper is a self-contained IIFE, so
// the suite runs THAT rather than a stub, and a stub of it anywhere else in the
// test tree is checked against this.
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  must(at > 0, "voter-hub-location.js no longer declares window.PDXReturn");
  const end = LOC.indexOf("\n  })();", at);
  must(end > at, "the PDXReturn IIFE has no closing line this suite can find");
  return LOC.slice(at, end + "\n  })();".length);
})();
function returnAt(pathname, search) {
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
  };
  win.window = win;
  win.__assigned = [];
  win.location = {
    pathname: pathname || "/",
    search: search || "",
    hash: "",
    origin: "https://politidex.fyi",
    assign(u) { win.__assigned.push(String(u)); },
    replace(u) { win.__assigned.push(String(u)); },
  };
  vm.runInContext(RET_SRC, vm.createContext(win), { filename: "voter-hub-location.js#PDXReturn" });
  return win;
}
{
  const w = returnAt("/voice", "");
  const Rt = w.PDXReturn;
  must(!!Rt && typeof Rt.finderHref === "function", "PDXReturn did not publish finderHref()");
  eq(Rt.HOME, "/voice", "return: the lane's home is not /voice");

  // THE FINDER HREF. A real root-absolute address with the intent in the query.
  // It used to be a fragment on the front page, and the fragment was the whole
  // problem: arriving at #who-represents-me meant parsing 1.5 MB of archive
  // homepage before the picker could move. The finder is its own document now,
  // so the href is the document.
  const href = Rt.finderHref("/voice");
  has(href, "next=", "finder: the href carries no return intent");
  ok(href.indexOf("/find") === 0, `finder: the href does not point at the finder's own document (${href})`);
  ok(href.indexOf("#who-represents-me") < 0,
    "finder: the href still carries the front-page fragment the finder moved off");
  eq(decodeURIComponent((/next=([^&#]*)/.exec(href) || [, ""])[1]), "/voice",
    "finder: the intent it carries is not /voice");
  ok(href.startsWith("/"), `finder: the href is not root-absolute (${href})`);
  ok(href !== "#", "finder: the href is a dead hash");

  // AND A PATH ALREADY IN THE LANE IS PRESERVED, which is the other half of the
  // brief: a reader who was reading SD-3's board and is asked for a location
  // goes back to SD-3's board, not to the hub.
  eq(decodeURIComponent((/next=([^&#]*)/.exec(Rt.finderHref("/district/ut-sd-3")) || [, ""])[1]),
    "/district/ut-sd-3", "finder: a reader sent from a board does not return to that board");
  eq(returnAt("/district/ut-sd-3", "").PDXReturn.here(), "/district/ut-sd-3",
    "finder: here() does not recognise a board path as somewhere worth returning to");
  eq(returnAt("/voice.html", "").PDXReturn.here(), "/voice",
    "finder: a preview server's /voice.html is not recognised as /voice");

  // THE OPEN-REDIRECT WALL. Every one of these is a real payload and every one
  // of them must degrade to the lane's home rather than navigate.
  for (const bad of ["//evil.example", "https://evil.example/x", "javascript:alert(1)",
    "/\\evil.example", "\\\\evil.example", "/admin", "/ballot/../admin", "//evil.example/voice"]) {
    eq(Rt.sanitize(bad), "", `redirect: ${JSON.stringify(bad)} survived sanitize()`);
  }
  // AND THE FIVE SHAPES THAT ARE ALLOWED, spelled out, so widening the pattern
  // is a visible diff rather than a silent one. The front page joined the list
  // when the finder left it: here() on "/" has to be able to name where it
  // stands, and consume() refuses to navigate to the address it is already on,
  // so admitting "/" adds a destination and not a hop.
  for (const good of ["/voice", "/me", "/ballot", "/district/ut-sd-3", "/"]) {
    eq(Rt.sanitize(good), good, `redirect: ${good} is not in the allow-list and it must be`);
  }
  // AND THE FINDER ITSELF IS NOT ON IT, deliberately: a save must never land
  // back on the picker that made it.
  eq(Rt.sanitize("/find"), "", "redirect: /find is in the allow-list and a save could bounce back to it");
  eq(Rt.sanitize("/VOICE"), "/voice", "redirect: a shouted path is not folded to the canonical one");
  eq(Rt.sanitize("/voice?x=1#y"), "/voice", "redirect: a query and fragment are not trimmed off the intent");
}

// THE HUB'S OWN NO-LOCATION PAINT. Not a stub: district-voice.js and
// voice-room.js, booted together, in the order voice.html loads them.
function hub(opts) {
  const o = opts || {};
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: o.search || "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = !!(o.levels && o.levels.length);
  win._currentVoterLocation = o.loc || {};
  win.pdxRepsForMe = () => ({
    located: !!(o.levels && o.levels.length),
    state: (o.loc && o.loc.state) || "",
    county: (o.loc && o.loc.county) || "",
    levels: o.levels || [],
  });
  win.PROFILES = {};
  win.CMP_DATA = {};
  win._pdxPersonById = (pid) => (o.people && o.people[pid]) || null;
  const ctx = vm.createContext(win);
  let err = null;
  try {
    vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
    vm.runInContext(DV, ctx, { filename: "district-voice.js" });
    vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  } catch (e) { err = e; }
  return {
    win, err,
    advance(ms) { now += ms; },
    paint: () => win.PDXVoiceRoom.paint(),
    card: () => els["pdx-voice-standing"].innerHTML,
    list: () => els["pdx-voice-seats"].innerHTML,
  };
}

const LV = {
  // THE NEIGHBOUR WITH NO BOARD, AND IT IS HD-14 NOW. This fixture was HD-15
  // until /district/ut-hd-15 opened. Every section below uses it to prove the
  // hallway refuses a door for a seat that has none, so it has to BE a seat
  // that has none — an assertion aimed at a seat with a document proves the
  // opposite of what it says. HD-14 is Clearfield and Syracuse in Davis County
  // and has a member on the roster, a person file, and no room.
  hd14: { key: "statehouse", seat: "statehouse", label: "State House", statewide: false, district: "14", pid: "rep_davis", resolved: true },
  sd3: { key: "statesenate", seat: "statesenate", label: "State Senate", statewide: false, district: "3", pid: "john_johnson", resolved: true },
  ush4: { key: "house", seat: "house", label: "U.S. House", statewide: false, district: "1", pid: "moore", resolved: true },
  gov: { key: "governor", seat: "governor", label: "Governor", statewide: true, district: "", distLabel: "Utah", pid: "cox", resolved: true },
};
const DAVIS = { state: "Utah", city: "Layton", county: "Davis County" };
const WEBER = { state: "Utah", city: "North Ogden", county: "Weber County" };

{
  const h = hub({ levels: [] });
  ok(!h.err, `no location: the hub boots (${h.err ? h.err.message : "ok"})`);
  h.advance(20000);
  eq(h.paint(), "unplaced", "no location: the hub does not settle on 'unplaced'");
  // NO CARDS AT ALL. Not an empty table, not a placeholder row, not a sample
  // seat — the same page with nothing in the hallway.
  eq(h.list(), "", "no location: seat cards were painted for a reader we cannot place");
  // AND ONE DOOR, WHICH IS THE FINDER WITH THE WAY BACK.
  const cta = /<a class="pdxvr-door" href="([^"]+)">/.exec(h.card());
  must(!!cta, "no location: the hub offers no anchor to a page that can place the reader");
  ok(cta[1].indexOf("/find") === 0, `no location: the door does not point at the finder (${cta[1]})`);
  has(cta[1], "next=", "no location: the door carries no return intent");
  eq(decodeURIComponent((/next=([^&#]*)/.exec(cta[1]) || [, ""])[1]), "/voice",
    "no location: the intent the door carries is not /voice");
  no(h.card(), 'href="#"', "no location: the door is a dead hash");
  // AND IT NAMES NO STATE. A default location on this page is a claim about a
  // stranger.
  for (const n of ["Utah", "Davis", "District 14", "ut-"]) {
    no(h.card(), n, `no location: the hub prints "${n}" for a reader who has saved nothing`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE SAVE LANDS ON /voice
// ═════════════════════════════════════════════════════════════════════════════
section("3 · a mocked save on /find?next=/voice lands the reader on /voice");

{
  // THE READER CAME FROM THE HUB. ?next=/voice in the URL, a save that completed,
  // and a location to show for it: consume() navigates, once, to that address.
  // THE PATHNAME IN THIS FIXTURE IS /find AND THAT IS THE POINT OF THE MOVE: the
  // save now completes on the finder's own document, not on the archive homepage
  // it used to be a fragment of, and the return trip is the same one either way
  // because the intent rides in the query and not in the host page.
  const w = returnAt("/find", "?next=%2Fvoice");
  w._pdxLocSaved = true;
  w._hasUserLocation = true;
  eq(w.PDXReturn.read(), "/voice", "save: the intent was not read back out of the URL");
  eq(w.PDXReturn.consume(), true, "save: a completed save with an intent did not navigate");
  eq(w.__assigned.length, 1, `save: the reader was sent ${w.__assigned.length} places`);
  eq(w.__assigned[0], "/voice", "save: the landing path is not /voice");

  // AND IT SPENDS ONCE. A second call after the navigation has been issued must
  // not fire again — a double assign is a back button that cannot escape.
  w.location.pathname = "/voice";
  eq(w.PDXReturn.consume(), false, "save: consume() fires again once the reader is already there");
  eq(w.__assigned.length, 1, "save: the reader was sent to the address they are standing on");
}
{
  // NO SAVE, NO JUMP. The picker opened with ?next= in the URL and the reader
  // pressed Escape. Nothing was saved, so nothing moves.
  const w = returnAt("/find", "?next=%2Fvoice");
  w._pdxLocSaved = false;
  w._hasUserLocation = false;
  eq(w.PDXReturn.consume(), false, "escape: a reader who saved nothing was navigated anyway");
  eq(w.__assigned.length, 0, "escape: a reader who dismissed the picker was moved off the page");
  // A SAVE FLAG WITHOUT A LOCATION IS ALSO NOT A SAVE.
  const half = returnAt("/find", "?next=%2Fvoice");
  half._pdxLocSaved = true;
  half._hasUserLocation = false;
  eq(half.PDXReturn.consume(), false, "escape: a save flag with no location behind it navigated");
}
{
  // NO INTENT, NO JUMP — and this is the reading the brief's "default /voice"
  // gets. An ABSENT `next` means nobody said where they were going, so a reader
  // who opened the finder on its own address stays on it and reads the answer
  // there. The default is the fallback for an intent that is PRESENT and
  // unusable, never a teleport for a reader who expressed nothing.
  const w = returnAt("/find", "");
  w._pdxLocSaved = true;
  w._hasUserLocation = true;
  eq(w.PDXReturn.read(), "", "no intent: an absent next was read as an intent");
  eq(w.PDXReturn.consume(), false, "no intent: a location save with no expressed intent teleported the reader");
  eq(w.__assigned.length, 0, "no intent: the reader was moved off the page they chose to be on");

  // A PRESENT BUT UNUSABLE INTENT IS THE LANE'S HOME, not a dead end and not an
  // off-origin navigation.
  const evil = returnAt("/find", "?next=%2F%2Fevil.example");
  evil._pdxLocSaved = true;
  evil._hasUserLocation = true;
  eq(evil.PDXReturn.read(), "/voice", "unusable intent: an off-origin next did not degrade to the lane's home");
  eq(evil.PDXReturn.consume(), true, "unusable intent: the reader was stranded on the finder");
  eq(evil.__assigned[0], "/voice", `unusable intent: the reader was sent to ${JSON.stringify(evil.__assigned[0])}`);
}
// THE TWO PLACES THE SAVE ACTUALLY COMPLETES, wired in source. saveVoterLocation()
// fires on every field change, so the jump hangs off flow COMPLETION — the map
// confirm and the picker's close — and both early-return if it navigated.
{
  has(LOC, "window._pdxLocSaved = true;",
    "wiring: voter-hub-location.js does not record that a real save came through this page view");
  // Both slices run from the function's own declaration to its closing line at
  // the same indent, so the assertion is about THAT function rather than about
  // the file containing the string somewhere.
  const bodyOf = (src, decl, close) => {
    const at = src.indexOf(decl);
    if (at < 0) return "";
    const end = src.indexOf(close, at);
    return end > at ? src.slice(at, end + close.length) : src.slice(at);
  };
  const close = bodyOf(LOC, "window.closeLocationModal = function", "\n  };");
  ok(close.length > 200, `wiring: closeLocationModal could not be sliced (${close.length} chars)`);
  has(close, "PDXReturn.settled()",
    "wiring: closing the location picker does not spend the return intent");
  // pdxMapConfirm LIVES ON find.html NOW, and it spends the intent through
  // settled() rather than consume(). settled() IS consume() plus one fallback
  // that only fires on the finder's own document: a reader who saved a location
  // with no next= to spend would otherwise be left standing on a blank tool
  // page, so they go to the band that answers the question they asked.
  // The confirm button is a GATE now - House, Senate and U.S. House, or the
  // labelled partial save - so the hand-off moved one level down, into the one
  // commit path both exits share. That is where the intent is spent, and
  // pdxMapConfirm has to reach it rather than carry its own copy.
  const confirm = bodyOf(FIND, "window.pdxMapConfirm = function", "\n    };");
  ok(confirm.length > 200, `wiring: pdxMapConfirm could not be sliced out of find.html (${confirm.length} chars)`);
  has(confirm, "commitAndLeave()",
    "wiring: confirming the district map does not reach the one commit path, so it either spends the\n" +
    "    return intent itself or does not spend it at all");
  const commit = bodyOf(FIND, "function commitAndLeave(", "\n    }");
  ok(commit.length > 200, `wiring: commitAndLeave could not be sliced out of find.html (${commit.length} chars)`);
  has(commit, "PDXReturn.settled()",
    "wiring: confirming the district map does not spend the return intent");
  has(commit, "applyToLocation()",
    "wiring: the commit path hands off the return intent without writing the districts first");
  // No early return needed here and none wanted: the forty lines of front-page
  // follow-through that used to run after the confirm did not move with it.
  const SETTLED = bodyOf(LOC, "function settled(", "\n    }");
  ok(SETTLED.length > 100, `wiring: settled() could not be sliced (${SETTLED.length} chars)`);
  has(SETTLED, "consume()", "wiring: settled() does not spend the return intent first");
  has(SETTLED, "__PDX_FIND_DOC", "wiring: settled()'s fallback is not scoped to the finder's own document");
  ok(/_pdxLocSaved/.test(SETTLED) && /_hasUserLocation/.test(SETTLED),
    "wiring: settled() would navigate without a completed save");
  // AND NO closeModal() ON THE WAY. The person file's modal closer rewrites the
  // address; calling it from this lane would eat the document the reader was on.
  no(RET_SRC, "closeModal", "wiring: the return helper reaches for closeModal() and would eat the person file");
}
// AND THE SEATS ON THE OTHER SIDE OF THE TRIP ARE THE SAME SEATS. The finder
// moving to its own document would be a regression if the reader landed on
// /voice and found a different answer than the one the picker resolved, so the
// round trip is asserted end to end here: a save at /find?next=/voice navigates
// to /voice, and a hub booted on THAT SAVED RECORD paints the seats the record
// resolves. It is the same record and the same resolver either way — there is
// exactly one pdxRepsForMe() and the finder did not fork it — which is why this
// holds, and the check is here so that forking it later fails out loud.
{
  const trip = returnAt("/find", "?next=%2Fvoice");
  trip._pdxLocSaved = true;
  trip._hasUserLocation = true;
  eq(trip.PDXReturn.consume(), true, "round trip: the save on /find did not navigate");
  eq(trip.__assigned[0], "/voice", "round trip: the save on /find did not land on /voice");

  const landed = hub({ loc: WEBER, levels: [LV.hd14, LV.sd3], people: { john_johnson: { name: "John Johnson" } } });
  eq(landed.paint(), "placed", "round trip: the reader landed on /voice and the hub did not settle on 'placed'");
  const seats = landed.win.PDXVoice.seatsForMe();
  eq(seats.length, 2, `round trip: the record that was saved on /find resolves ${seats.length} seats on /voice`);
  eq(seats.map((x) => x.seatKey).join("|"), "ut-statehouse-14|ut-statesenate-3",
    "round trip: the seats after the hop are not the seats the saved record resolves");
  has(landed.list(), "State House District 14", "round trip: the House seat did not survive the hop");
  has(landed.list(), "State Senate District 3", "round trip: the Senate seat did not survive the hop");
  has(landed.list(), "Weber County", "round trip: the county the reader saved on /find is not on the cards");
  // ONE RESOLVER, NAMED ONCE. The finder consumes the owner's export; it does
  // not ship a second copy of the join under another name.
  // `\s*=` alone also matched `window.pdxRepsForMe === 'function'`, which is a
  // READER guarding on the export, not a second publisher of it — and the
  // location header became one such reader when it started naming every located
  // chamber instead of only the U.S. House. `=[^=]` is what this line always
  // meant: one assignment, and any number of callers.
  eq((LOC.match(/window\.pdxRepsForMe\s*=[^=]/g) || []).length, 1,
    "round trip: voter-hub-location.js publishes pdxRepsForMe more than once");
  no(FIND, "pdxRepsForMe =", "round trip: find.html assigns its own pdxRepsForMe and the two answers can drift");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · TWO SEATS, TWO CARDS, ONE DOOR
// ═════════════════════════════════════════════════════════════════════════════
section("4 · a location that resolves a House seat and a Senate seat paints two cards");

{
  const h = hub({ loc: WEBER, levels: [LV.hd14, LV.sd3], people: { john_johnson: { name: "John Johnson" } } });
  ok(!h.err, `two seats: the hub boots (${h.err ? h.err.message : "ok"})`);
  eq(h.paint(), "placed", "two seats: the hub does not settle on 'placed'");
  const list = h.list();
  eq((list.match(/class="pdxvr-seat"/g) || []).length, 2, "two seats: the hallway did not paint one card per seat");
  has(list, "State House District 14", "two seats: the House seat is not named");
  has(list, "State Senate District 3", "two seats: the Senate seat is not named");
  has(list, "Weber County", "two seats: the county the reader saved is not on the cards");

  // THE DOOR IS ON THE ALLOW-LISTED SEAT AND ONLY THERE.
  eq((list.match(/Open board/g) || []).length, 1,
    "two seats: 'Open board' is not on exactly one card — one board is open in this product");
  has(list, 'href="/district/ut-sd-3"', "two seats: the allow-listed seat does not link that exact address");
  eq((list.match(/data-pdxvr-board="on"/g) || []).length, 1, "two seats: more or fewer than one card is boarded");
  // AND THE OTHER CARD SAYS SO, WITHOUT A SHAPE. No door onto nothing, no
  // disabled control, no 0/0 table.
  has(list, "Board not on hand for this seat.", "two seats: the unboarded card does not say so");
  has(list, "this room is not open", "two seats: the unboarded card gives no reason");
  no(list, "0/0", "two seats: a fake empty table was painted for a seat with no board");
  no(list, "<table", "two seats: a table was painted on a hallway card");
  no(list, "disabled", "two seats: a dead control was painted where a door does not exist");

  // THE MEMBER, LINKED TO THEIR PERSON FILE, on both cards.
  has(list, 'href="/p/john_johnson"', "two seats: the sitting member is not linked to their file");
  has(list, 'href="/p/rep_davis"', "two seats: a seat whose holder has no display record lost its person link");
  has(list, "John Johnson", "two seats: a roster name on hand was not printed");

  // THE ALLOW-LIST IS THE OWNER'S, AND IT IS A TABLE OF NAMED ROWS. Four of
  // them today. What this block fences is not the count but the EXCLUSIVITY: a
  // seat next door to a board still gets no board, because the table grew by
  // names and never by a pattern.
  const V = h.win.PDXVoice;
  const rows = Object.keys(V.BOARD_ROUTES);
  ok(rows.length >= 1, "allow-list: no board is routed at all");
  eq(V.boardPath("ut-statesenate-3"), "/district/ut-sd-3", "allow-list: SD-3's row does not name its board");
  eq(V.boardPath("ut-statehouse-16"), "/district/ut-hd-16", "allow-list: HD-16's row does not name its board");
  eq(V.boardPath("ut-statesenate-7"), "/district/ut-sd-7", "allow-list: SD-7's row does not name its board");
  eq(V.boardPath("ut-house-2"), "/district/ut-cd-2", "allow-list: UT-2's row does not name its board");
  eq(V.boardPath("ut-statehouse-15"), "/district/ut-hd-15", "allow-list: HD-15's row does not name its board");
  // THE NEIGHBOURS, AND THEY STILL GET NOTHING. HD-14 sits beside HD-15 and
  // SD-4 sits beside SD-3; a pattern would have opened a room for both. HD-14
  // is on this line because HD-15 came off it: opening a board means moving the
  // counter-example to a seat that still has no document, not deleting it.
  eq(V.boardPath("ut-statehouse-14"), "", "allow-list: HD-14 was given a board");
  eq(V.boardPath("ut-statesenate-4"), "", "allow-list: a neighbouring seat resolves a board by pattern");
  eq(V.boardPath("ut-statesenate-8"), "", "allow-list: SD-8 resolves a board because SD-7 has one");
  eq(V.boardPath("ut-house-1"), "", "allow-list: UT-1 resolves a board because UT-2 has one");
  eq(V.boardPath(""), "", "allow-list: an empty seat key resolves a board");
  // AND EVERY ROW IS A ROUTE THE SITE ACTUALLY SERVES, WITH A DOCUMENT BEHIND IT.
  for (const route of Object.values(V.BOARD_ROUTES)) {
    ok(TOML.indexOf(`from = "${route}"`) >= 0, `allow-list: ${route} is in the table with no rewrite behind it`);
    const doc = `district-${String(route).split("/").pop()}.html`;
    ok(existsSync(join(ROOT, doc)), `allow-list: ${route} is routed with no ${doc} behind it`);
  }
  // NO SPLAT, ANYWHERE. Asserted on the table itself, because a single
  // /district/* rule would make every check above pass and every seat in the
  // state a door.
  ok(!/from = "\/district\/[^"]*\*/.test(TOML),
    "allow-list: netlify.toml splats /district/ — an allow-list behind a wildcard is not an allow-list");
}
// STATEWIDE OFFICES COMPOSE NO SEAT KEY, so they can never carry a board. A
// governor is not a district and the hallway must not imply a room in one.
{
  const h = hub({ loc: DAVIS, levels: [LV.gov, LV.hd14, LV.ush4] });
  eq(h.paint(), "placed", "statewide: a mixed level set does not settle on 'placed'");
  eq((h.list().match(/class="pdxvr-seat"/g) || []).length, 3, "statewide: the hallway dropped a resolved level");
  eq((h.list().match(/data-pdxvr-board="on"/g) || []).length, 0, "statewide: a board was offered in this set");
  const V = h.win.PDXVoice;
  eq(V.seatKeyForLevel(LV.gov, "Utah"), "", "statewide: a governor composed a seat key");
  eq(V.seatKeyForLevel(LV.hd14, "Utah"), "ut-statehouse-14", "statewide: a House level composed the wrong seat key");
  eq(V.seatKeyForLevel(LV.hd14, "Ohio"), "",
    "statewide: a state with no code in the table composed a seat key anyway");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · WRONG-SEAT EXCLUSIVITY
// ═════════════════════════════════════════════════════════════════════════════
section("5 · a reader who does not vote in SD-3 is never shown SD-3's board");

{
  // Davis County, HD-14 — a seat with a member and no room. Five boards exist
  // and not one of them is this reader's, so they must not see any of them —
  // not as a card, not as a door, not as "the board nearest you". This is the
  // product, not a detail.
  const h = hub({ loc: DAVIS, levels: [LV.hd14] });
  eq(h.paint(), "placed", "exclusivity: one resolved seat does not settle on 'placed'");
  const list = h.list();
  eq((list.match(/class="pdxvr-seat"/g) || []).length, 1, "exclusivity: one seat did not paint one card");
  no(list, "/district/ut-sd-3", "exclusivity: a Davis County reader was handed the Weber SD-3 board");
  no(list, "Open board", "exclusivity: a door was offered on a seat whose board does not exist");
  no(list, "john_johnson", "exclusivity: another seat's member is on this reader's hallway");
  no(list, "State Senate District 3", "exclusivity: another seat is listed as this reader's");
  has(list, "Board not on hand for this seat.", "exclusivity: the unboarded seat does not say so");
  // AND THE SEAT KEYS DIFFER, which is the mechanism: the hallway asks the
  // allow-list by key and Davis HD-14 is not a key it holds.
  const V = h.win.PDXVoice;
  eq(V.seatsForMe()[0].seatKey, "ut-statehouse-14", "exclusivity: the resolved seat key is not this reader's");
  eq(V.seatsForMe()[0].board, "", "exclusivity: this reader's seat resolved a board");
  // AND THE SEAT ONE NUMBER AWAY REALLY DOES HAVE ONE, which is what makes the
  // line above an assertion about the KEY rather than about an empty table.
  eq(V.boardPath("ut-statehouse-15"), "/district/ut-hd-15",
    "exclusivity: HD-15's board went missing, so the HD-14 refusal above proves nothing");
  // A WEBER SD-3 READER DOES GET IT, because the exclusivity has to cut both
  // ways or it is just an outage.
  const w = hub({ loc: WEBER, levels: [LV.sd3] });
  w.paint();
  has(w.list(), 'href="/district/ut-sd-3"',
    "exclusivity: a reader who actually votes in SD-3 is not offered SD-3's board");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE BOARD'S OWN DOOR IS UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════
section("6 · Johnson's person file still opens /district/ut-sd-3");

// THIS ONE IS A DON'T-TOUCH, and it is here so that it stays one. The hub is not
// the only way to that board: the member who sits in SD-3 has a link on his own
// person file, and THAT link is about this seat rather than about the reader, so
// it goes straight to the board.
{
  const win = makeSandbox();
  win.PROFILES = {};
  win.CMP_DATA = {};
  const ctx = vm.createContext(win);
  let err = null;
  try { vm.runInContext(DB, ctx, { filename: "district-board.js" }); } catch (e) { err = e; }
  ok(!err, `board: district-board.js boots (${err ? err.message : "ok"})`);
  const B = win.PDXDistrictBoard;
  must(!!B, "district-board.js did not publish PDXDistrictBoard");
  eq(B.ROUTE, "/district/ut-sd-3", "board: the board's own address moved");
  eq(B.SEAT, "ut-statesenate-3", "board: the board's seat key moved");
  eq(B.PID, "john_johnson", "board: the member who sits in it changed");
  const link = B.personLinkHtml("john_johnson");
  has(link, 'href="/district/ut-sd-3"', "board: Johnson's person-file link no longer opens his seat's board");
  eq((String(link).match(/<a /g) || []).length, 1, "board: the person-file link is more than one anchor");
  // AND NOBODY ELSE GETS IT.
  for (const pid of ["cox", "lee", "chew", "", null]) {
    eq(B.personLinkHtml(pid), "", `board: ${JSON.stringify(pid)} carries a link to somebody else's seat`);
  }
  // THE ADDRESS IS SERVED, in all three spellings, with no splat.
  for (const from of ["/district/ut-sd-3", "/district/ut-sd-3/", "/district/ut-sd-3.html"]) {
    has(TOML, `from = "${from}"`, `board: ${from} has no rewrite`);
  }
}
// person-file.js STILL ASKS THE BOARD FOR ITS OWN LINK, so the address has one
// owner, and it is a DIFFERENT link from the hub's — two doors, two jobs.
has(PF, "PDXDistrictBoard", "board: person-file.js no longer asks the board module for that link");
has(DV, "personLinkHtml", "board: district-voice.js no longer renders the hub's own person-file link");
{
  // The two must not have been collapsed into one. The board's link is about the
  // seat; the hub's is about the reader.
  const dvLink = DV.slice(DV.indexOf("function personLinkHtml"), DV.indexOf("function personLinkHtml") + 1200);
  no(dvLink, "/district/", "board: the hub's person-file link hard-codes a board address");
  has(dvLink, "'/voice'", "board: the hub's person-file link does not point at the hub");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · THE COPY SWEEP
// ═════════════════════════════════════════════════════════════════════════════
section("7 · no 'yet' on a missing board, and no equity vocabulary anywhere near it");

// WHAT A READER ACTUALLY READS, not what the source contains: the document's
// visible text with its comments, scripts and styles stripped, plus every string
// the two renderers paint for a reader with seats and a reader without.
const READER_TEXT = (() => {
  const doc = stripComments(VOICE_HTML)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const placed = hub({ loc: WEBER, levels: [LV.hd14, LV.sd3] });
  placed.paint();
  const empty = hub({ levels: [] });
  empty.advance(20000);
  empty.paint();
  return [textOf(doc), textOf(placed.card()), textOf(placed.list()),
    textOf(empty.card()), textOf(empty.list())].join("  ·  ");
})();
must(READER_TEXT.length > 500, `the reader-visible copy is too thin to sweep (${READER_TEXT.length} chars)`);

// "YET" IS THE WHOLE BAN. A seat with no board is not a seat waiting for one:
// we have not built that room, we have not promised to, and saying "yet" is a
// roadmap printed as a status.
ok(!/\byet\b/i.test(READER_TEXT),
  `copy: "yet" reaches a reader — ${(/[^·]*\byet\b[^·]*/i.exec(READER_TEXT) || [""])[0].trim()}`);
// AND THE ABSENCE GRAMMAR IS THE ONE THIS CODEBASE USES EVERYWHERE ELSE.
has(READER_TEXT, "not on hand", "copy: the missing board is not described in the absence grammar");

// NO EQUITY VOCABULARY. This is a page about who represents somebody. A share, a
// unit, a due or a Reg CF disclosure on it would be a different product wearing
// this one's URL, and the words are banned before the feature can arrive.
for (const re of [/\bshares?\b/i, /\bstock\b/i, /\bunits?\b/i, /\bdues\b/i, /reg\s*cf/i,
  /\bequity\b/i, /\bfreeze\b/i, /\b20\s*%/, /\bcap\s*table\b/i, /\bdividend/i, /\bvaluation\b/i]) {
  ok(!re.test(READER_TEXT),
    `copy: ${re} matches reader-visible copy — "${(new RegExp("[^·]*" + re.source + "[^·]*", "i").exec(READER_TEXT) || [""])[0].trim()}"`);
}
// AND NOT IN THE STRINGS THE RENDERERS COULD REACH FOR EITHER. The COPY block is
// the one owner of these sentences, so it is swept directly.
{
  const copyAt = DV.indexOf("var COPY = {");
  must(copyAt > 0, "district-voice.js no longer declares its COPY block");
  const COPY = DV.slice(copyAt, DV.indexOf("\n  };", copyAt));
  // THE HUB'S OWN KEYS, not the whole block. The board's reader copy is a
  // different surface with a different history — "No takes yet" is a true
  // sentence about a room that EXISTS and is empty, and the brief left the SD-3
  // reader's guts alone. What may not say "yet" is the sentence about a room we
  // have not built.
  const HUB_KEYS = ["hubHd", "boardOpen", "boardNone", "boardWhy"];
  const hubStrings = HUB_KEYS.map((k) => {
    const at = COPY.indexOf(k + ":");
    ok(at >= 0, `copy: the owner does not hold ${k}`);
    return at < 0 ? "" : (COPY.slice(at, COPY.indexOf("\n", COPY.indexOf("',", at))).match(/'(?:[^'\\]|\\.)*'/g) || []).join(" ");
  }).join("  ");
  ok(hubStrings.length > 120, `the hub's own strings are too thin to sweep (${hubStrings.length} chars)`);
  ok(!/\byet\b/i.test(hubStrings), `copy: a hub sentence contains 'yet' — ${hubStrings}`);
  for (const re of [/\bshares?\b/i, /\bstock\b/i, /\bdues\b/i, /reg\s*cf/i, /\bequity\b/i]) {
    ok(!re.test(hubStrings), `copy: a hub sentence matches ${re}`);
  }
  // THE HEADER SENTENCE IS THE BRIEF'S, VERBATIM, and it is in the document as
  // markup so it arrives with the first paint rather than after a module lands.
  const HD = "District Voice is the rooms for your seats. Anyone can read a board. " +
    "Only verified residents of that seat get a voice that counts. This page lists " +
    "the seats for the location on file.";
  has(COPY, "hubHd:", "copy: the owner does not hold the hub's header sentence");
  eq(textOf(stripComments(VOICE_HTML).replace(/<style\b[\s\S]*?<\/style>/gi, " "))
    .indexOf(HD) >= 0, true, "copy: the hub's header sentence is not on the document, verbatim");
  // AND THE SENTENCE IT REPLACED IS GONE. "One seat, one live question" was the
  // single-seat framing in a single line.
  ok(!/one seat, one live question/i.test(VOICE_HTML),
    "copy: the single-seat header line is still on the document");
}
// NO DEAD CONTROLS ON THE HUB, in the document or in what it paints. An anchor
// with href="#" is a control that looks pressable and is not, and a JS-only
// button cannot be opened in a tab.
{
  const paintable = hub({ loc: WEBER, levels: [LV.hd14, LV.sd3] });
  paintable.paint();
  const painted = paintable.card() + paintable.list();
  no(painted, 'href="#"', "controls: the hub paints a dead hash");
  no(painted, "<button", "controls: the hub paints a button where an anchor would work");
  no(stripComments(VOICE_HTML), 'href="#"', "controls: the document carries a dead hash");
  for (const m of painted.match(/href="[^"]*"/g) || []) {
    ok(/href="(?:\/|https:)/.test(m), `controls: ${m} is not a real address`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · TWIN BOOT, AND NO KEY MIGRATED
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the record engines are byte-identical with the hallway rendered, and no key moved");

{
  const FILES = [
    "cmp-data.js", "formal-index.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);

  const snapshot = (renderHub) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.Date = Date;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;

    let rendered = 0;
    if (renderHub) {
      const els = {};
      const mk = (id) => ({ id, innerHTML: "", _a: {}, setAttribute(k, v) { this._a[k] = v; }, getAttribute(k) { return this._a[k] || null; } });
      els["pdx-voice-standing"] = mk("pdx-voice-standing");
      els["pdx-voice-seats"] = mk("pdx-voice-seats");
      win.document.getElementById = (id) => els[id] || null;
      win.__PDX_VOICE_DOC = true;
      win._hasUserLocation = true;
      win.pdxRepsForMe = () => ({ located: true, state: "Utah", county: "Weber County", levels: [LV.hd14, LV.sd3] });
      vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
      vm.runInContext(DV, ctx, { filename: "district-voice.js" });
      vm.runInContext(VR, ctx, { filename: "voice-room.js" });
      for (const round of [0, 1]) {
        rendered += String(win.PDXVoiceRoom.paint() || "").length ? 1 : 0;
        rendered += String(win.PDXVoiceRoom.seatsHtml(win.PDXVoice.seatsForMe()) || "").length ? 1 : 0;
        rendered += String(win.PDXVoice.personLinkHtml("chew") || "").length >= 0 ? 1 : 0;
      }
      rendered += els["pdx-voice-seats"].innerHTML.length ? 1 : 0;
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
    return { snap: out.join("\n"), rendered };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 300, `twin boot: the record snapshot has something in it (${off.snap.length} chars)`);
  ok(on.rendered >= 7, `twin boot: the rendering boot painted ${on.rendered} surfaces`);
  eq(off.rendered, 0, "twin boot: the other boot painted something");
  eq(on.snap, off.snap,
    "twin boot: Direction Match, the formal pattern index, the publication floor and the formal index are not " +
    "byte-identical with the hallway rendered and without it");
  console.log(`   twin boot · john_johnson + chew · ${off.snap.length}-char snapshot identical either way`);
}

// THE HALLWAY TOUCHES NO STORAGE AT ALL. It is a list of addresses; it has
// nothing to remember.
{
  const win = makeSandbox();
  const writes = [];
  win.localStorage = {
    getItem: () => null,
    setItem: (k, v) => writes.push([k, String(v).slice(0, 40)]),
    removeItem: (k) => writes.push(["remove", k]),
  };
  win.document.getElementById = () => null;
  win.__PDX_VOICE_DOC = true;
  win._hasUserLocation = true;
  win.pdxRepsForMe = () => ({ located: true, state: "Utah", county: "Weber County", levels: [LV.hd14, LV.sd3] });
  const ctx = vm.createContext(win);
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  win.PDXVoiceRoom.paint();
  eq(writes.length, 0, `storage: the hallway wrote to storage — ${JSON.stringify(writes)}`);
  eq(win.document.cookie, "", "storage: the hallway set a cookie");
}

// AND NO SAVED LOCATION KEY WAS MIGRATED. The key is the reader's saved address,
// and a rename would silently un-place every warm device in the product — every
// one of them arriving at the hub as a stranger who has saved nothing.
{
  const key = (/var PDX_LOC_KEY = '([^']+)';/.exec(LOC) || [, ""])[1];
  eq(key, "politidex_voter_location", "keys: the saved location key moved");
  // THE TEAM KEY IS READ FROM ITS OWNER NOW, NOT FROM THE RESOLVER. This used to
  // read LOC, because voter-hub-location.js named the key inside the second copy
  // of the represents-me roster it painted into the Voter Hub — it read the team
  // store to put a team chip on each seat row. That duplicate is deleted and the
  // resolver resolves districts; the store it never owned is ballot-breakdown.js's
  // BALLOT_KEY. Asserting against LOC would have been asserting that the
  // duplicate is still there.
  has(R("ballot-breakdown.js"), "'politidex_my_team'", "keys: the team store's key moved");
  ok(LOC.indexOf("politidex_my_team") < 0,
    "keys: the resolver names the team store again, which is a second reader of a store it does not own");
  // NO MIGRATION CODE IN EITHER FILE OF THIS PASS. Not a rename, not a copy,
  // not a read-old-write-new.
  for (const [name, src] of [["district-voice.js", DV], ["voice-room.js", VR]]) {
    no(stripComments(src), "politidex_voter_location",
      `keys: ${name} reaches for the location key directly instead of asking the resolver`);
    no(stripComments(src), "localStorage", `keys: ${name} touches localStorage at all`);
  }
  // AND THE WORKER SAYS SO. One bump, and the entry states the cost.
  const VER = (/const CACHE_VERSION = '(v\d+)';/.exec(SW) || [, ""])[1];
  ok(/^v\d+$/.test(VER), `keys: CACHE_VERSION is not set (${VER})`);
  const at = SW.indexOf(`// ${VER} - `);
  ok(at > 0, `keys: there is no ${VER} changelog entry`);
  const LOG = at > 0 ? SW.slice(at, SW.indexOf("const CACHE_VERSION", at)) : "";
  ok(/MIGRATION COST: none/i.test(LOG), `keys: the ${VER} entry does not state a migration cost of none`);
  ok(/no location key/i.test(LOG) || /not migrated/i.test(LOG),
    `keys: the ${VER} entry does not say the saved location key was left alone`);
  ok(LOG.split("\n").length <= 48,
    `keys: the ${VER} entry is ${LOG.split("\n").length} lines — the budget is 48 and the worker ships whole`);
  // ONE BUMP, NOT TWO.
  eq((SW.match(/const CACHE_VERSION = /g) || []).length, 1, "keys: the worker declares its version more than once");
}

// AND THE SHELL STILL PRECACHES THE HUB WITH ITS TWO MODULES, or a warm device
// gets the document and resolves no seats.
{
  const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
  for (const f of ["/voice.html", "/voice-room.js", "/district-voice.js", "/district-ut-sd-3.html"]) {
    has(SHELL, `'${f}'`, `precache: ${f} is not in SHELL_ASSETS — a warm device would get half the hub`);
  }
  // AND voter-hub-location.js IS DELIBERATELY NOT ONE. It is the location owner,
  // it is 255 KB, and it arrives fresh on every load precisely so a warm shell
  // cannot pin an old copy of the resolver against a new document — see the
  // worker's own header. Adding it here would make a stale location answer
  // survive a deploy.
  ok(SHELL.indexOf("'/voter-hub-location.js'") < 0,
    "precache: voter-hub-location.js was added to SHELL_ASSETS — it arrives fresh on purpose, and pinning it " +
    "pairs an old resolver with a new hub");
}

report();
