#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE POSITIONS SNAPSHOT ON /me — region b, and the two controls
// beside it
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG. /me region b painted a fixed octet: eight issue rows, each
// with Support / Oppose / Mixed / Not sure, whether the reader had answered any
// of them or not. On the reader's OWN desk — the one surface in the product
// that is supposed to be a summary of what they have already said — that reads
// as a survey they still owe. A reader who had answered two issues was shown
// six blanks; a reader who had answered none was shown a form eight rows long
// before anything else on the page. And eight was wrong twice over: it was a
// form where a summary belonged, and eight was never the number of issues this
// product holds.
//
// WHAT IT IS NOW. A snapshot: the keys this reader has actually set, as chips
// carrying the side they chose, six on the face, and "N more" behind one door.
// At zero it is three starter chips and one sentence. The editor is NOT gone and
// NOT duplicated — "Set all issues →" mounts your-file.js's own editor into the
// host it always used, on the gesture, and that editor offers the whole issue
// vocabulary rather than the octet it opened this pass with.
//
// THE FAILURE MODES THIS EXISTS TO CATCH, every one of which ships quietly:
//
//   1. THE FORM COMES BACK. Rows, or four side controls per row, painted before
//      any gesture. The tell is the editor's own markup in the first paint of
//      region b, and the count of side labels in it.
//   2. A KEY THE READER NEVER ANSWERED APPEARS AS A CHIP. A snapshot that lists
//      the vocabulary rather than the answers is the form again with rounder
//      corners, and it puts words in the reader's mouth.
//   3. THE SIDE IS WRONG, OR MISSING. A chip that names the issue but not the
//      side they chose is not a snapshot of anything; a chip that names the
//      wrong side is the worst bug on this page.
//   4. THE CAP LEAKS. Seven answers printing seven chips, or six chips with no
//      "1 more" — a face that silently drops an answer is a claim that the
//      reader said less than they did.
//   5. THE ZERO STATE SCOLDS OR INVENTS. A percentage, "you have not finished",
//      or starter chips from a vocabulary that is not the one the editor owns.
//   6. THE DOOR DUPLICATES THE EDITOR. A second setter written into me-desk.js
//      is a second owner of the reader's positions, and the day one of them
//      changes, one of them is wrong.
//   7. THE CHIPS ARE UNTHEMED, OR THEMED FROM A SECOND TABLE. The issue colour
//      belongs to PDXIssueColors; a chip painting its own palette would drift
//      from every bill letterhead in the product the first time a hex changes.
//   8. A SCORE ARRIVES. A match, a completeness figure, a grade on the voter.
//   9. WORK SEAT STOPS BEING A DOOR. A control that restyles the row instead of
//      opening that seat in the ballot workspace.
//  10. THE SERVICE WORKER PAIRS HALVES. me.html gained a script and me-desk.css
//      gained the rules for what it paints; a warm device holding one and not
//      the other paints unstyled markup.
//
// WHAT THE FOLLOW-UP PASS ADDED, and the three things /me was still teaching
// wrong after the snapshot landed:
//
//  11. EIGHT IS NOT A UNIVERSE. The caption read "2 of 8 on file", which told a
//      reader the product holds eight issues. It holds a hundred and twenty-one.
//      The denominator is the setter's own key count now — one source, read off
//      PDXYourFile rather than typed here — and section 8 pins the literal out
//      of me-desk.js entirely, because a literal that agreed with the vocabulary
//      the day it was typed is the defect: it stops agreeing the first time a
//      key is added and nothing fails until a reader reads a wrong number.
//  12. A VOTER IS NOT IN ONE DISTRICT. Region a printed "Davis County, Utah ·
//      District 2" — one unlabelled number for somebody who sits in a U.S.
//      House district, a state senate district, a state house district and a
//      municipality simultaneously. Section 6 is the labelled list off the same
//      resolver the rest of the app asks, fail-closed row by row, and its
//      sharpest assertion is the negative one: an unresolved row invents no
//      number.
//  13. SIX EMPTY "NO PICK" ROWS ON A DESK THAT KNOWS THE INCUMBENTS.
//      pdxSeatHolders answers who holds a resolved seat, so a row printing "No
//      pick" was withholding the fact the reader came for. Section 7:
//      officeholder first with a door to their file, pick second and labelled as
//      a pick, "No officeholder on file" where nobody resolves — and never a
//      borrowed or guessed name.
//
// AND THE THIRD PASS, which is the one that made 13 true on the live site
// instead of only in a fixture:
//
//  14. THE DESK ASKED THE RIGHT OWNER A QUESTION IT COULD NOT ANSWER HERE. A
//      Davis County reader got "No officeholder on file" on all six rows while
//      Who Represents Me named their senators and governor from the same saved
//      location — because the resolver read window.CMP_DATA and only
//      window.CMP_DATA, and /me has no cmp-data.js and never creates that
//      global. The resolver now asks which people index THIS document carries
//      (the bundle, or the live Firestore roster in window.PROFILES) and walks
//      that one; pdxSeatHolders publishes whether it has arrived; and the desk
//      prints three distinct sentences — still loading, nobody on file, the
//      names — instead of collapsing the first two into the second. Section 9
//      boots the desk over the REAL resolver with no stub between them, because
//      a fixture that hands the desk an answer cannot catch a resolver that was
//      never able to give one.
//
// Nine sections:
//   1. ZERO POSITIONS — no form, a starter set, one door.
//   2. TWO POSITIONS — those two and nothing else, with their own sides.
//   3. THE CAP — six on the face and the leftover counted.
//   4. COLOUR — a themed chip's hex is the register's hex for that key.
//   5. THE DOOR, THE SEAT AND THE BUMP.
//   6. EVERY DISTRICT — labelled, from the resolver, or honestly blank.
//   7. THE BALLOT SNAPSHOT — incumbent first, pick second, never a guess.
//   8. NO LITERAL OCTET — the denominator is not typed anywhere on the desk.
//   9. THE REAL RESOLVER — officeholders over /me's own roster, and the three
//      sentences a row can print.
//
//   node scripts/test-me-snapshot.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const ME = R("me.html");
const DESK_JS = R("me-desk.js");
const DESK_CSS = R("me-desk.css");
const YF_JS = R("your-file.js");
// THE ONE READER, loaded because /me loads it. Region b used to walk
// PDXYourFile itself, which is how it went blank over positions written in the
// stance studio; it asks PDXStanceSides now. The editor's own answers still
// reach it here — your-file.js projects every sided answer into the alignment
// signature from its parse-time adopt(), and the reader merges that signature
// with the stance store — so the fixtures below are unchanged.
const SIDES_JS = R("stance-sides.js");
const MAP_JS = R("issue-map.js");
const IC_JS = R("issue-colors.js");
const VHL_JS = R("voter-hub-location.js");
const SW = R("sw.js");

const jsBare = (s) =>
  String(s).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
const DESK_CODE = jsBare(DESK_JS);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
// A STALE HARNESS IS NOT A PASS. Every probe below reads a region out of a
// painted document; if the paint stops happening this suite must die loudly
// rather than report zero failures over an empty string.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ me-snapshot: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

/* ── the desk, booted the way me.html loads it ──────────────────────────────
   THE REAL MODULES, NOT STUBS. your-file.js owns the eight keys, their labels
   and the four side words; issue-map.js owns the issue register and the core
   families; issue-colors.js owns the hex. All four files are evaluated in one
   context in me.html's own order, so every answer this suite reads is the
   shipped owner's answer. A stubbed PDXYourFile would let region b pass here
   while disagreeing with the module it ships beside. */
function makeDoc() {
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", textContent: "", hidden: false,
      _html: "",
      children: [], parentNode: null, attrs: {},
      style: { setProperty() {}, removeProperty() {} },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, focus() {}, click() {}, remove() {},
      scrollIntoView() {}, insertAdjacentHTML() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    // INNERHTML HAS TO MAKE THE IDS FINDABLE, or the one gesture in this suite
    // cannot be tested at all. me-desk.js prints region b as a STRING that
    // declares <div id="me-yf-host">, and the door then looks that host up by
    // id and hands it to your-file.js's inline(). A flat string property
    // satisfies every markup probe here and quietly makes the door untestable:
    // getElementById would answer null, mountPositions() would return false for
    // the harness's reason rather than the product's, and section 5 would be
    // asserting over a bug in this file. So a write registers a stub node for
    // every id it declares — no parser, no tree, just the lookup the door
    // needs. Text written into an id'd stub is the module's own and is read
    // back off that stub, not off its parent's string.
    Object.defineProperty(n, "innerHTML", {
      get() { return this._html; },
      set(v) {
        this._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(this._html))) {
          if (!nodes.some((x) => x.id === m[1])) {
            const stub = node("div");
            stub.id = m[1];
            stub.parentNode = this;
          }
        }
      },
      enumerable: true, configurable: true,
    });
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const doc = {
    readyState: "complete", cookie: "", body,
    head: node("head"), documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };
  doc.__node = node;
  return doc;
}

const YF_STORE_KEY = "pdx_your_file_v1";

function bootDesk(opts) {
  const o = opts || {};
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, Promise, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {},
    requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.__PDX_ME_DOC = true;
  const mount = win.document.__node("main");
  mount.id = "me-desk";
  win.document.body.appendChild(mount);
  win.location = {
    href: "https://www.politidex.fyi/me", pathname: "/me", search: "", hash: "",
    origin: "https://www.politidex.fyi", replace() {}, assign() {},
  };
  win.history = { pushState() {}, replaceState() {} };

  // THE ANSWERS, WRITTEN THE WAY THE OWNER WRITES THEM. One opaque JSON row
  // under your-file.js's own key, in its own shape, so the read under test is
  // the module's real load() and normalize() rather than a fixture handed
  // straight to the desk.
  const store = {};
  if (o.answers) {
    const answers = {};
    Object.keys(o.answers).forEach((k) => {
      answers[k] = { position: o.answers[k], updatedAt: 1700000000000 };
    });
    store[YF_STORE_KEY] = JSON.stringify({ version: 1, answers, updatedAt: 1700000000000 });
  }
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.auth = {
    currentUser: o.uid
      ? { uid: o.uid, isAnonymous: false, email: "voter@example.org", displayName: null }
      : null,
    onAuthStateChanged() {},
  };
  win.TEAM_POSITIONS = o.seats || [];
  win._currentVoterLocation = o.loc || null;
  win._hasUserLocation = !!o.loc;
  // THE RESOLVER IS THE ONE OWNER OF WHERE THIS READER SITS, and the desk asks
  // it rather than holding a second copy — so a fixture that wants to test the
  // district list hands over a resolver answer, not a desk field. `reps`
  // replaces the whole return value; the default is the located-but-levelless
  // answer every earlier section was written against.
  win.pdxRepsForMe = () => (o.reps ? o.reps : {
    located: !!o.loc, state: (o.loc && o.loc.state) || "", county: "", levels: [],
  });
  // WHO HOLDS THE SEAT is voter-hub-location.js's question, asked through the
  // same one hook the ballot workspace asks. A fixture supplies a map of seat
  // key to pids; absent the hook entirely, every row must fail closed.
  if (o.holders) {
    win.pdxSeatHolders = (k) => {
      const pids = o.holders[String(k)];
      return { ok: !!(pids && pids.length), seat: String(k), pids: pids ? pids.slice() : [] };
    };
  }
  win.PROFILES = o.people || {};
  if (o.picks) store["politidex_my_team"] = JSON.stringify(o.picks);
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: "issue-map.js" });
    vm.runInContext(IC_JS, ctx, { filename: "issue-colors.js" });
    vm.runInContext(SIDES_JS, ctx, { filename: "stance-sides.js" });
    if (!o.withoutEditor) vm.runInContext(YF_JS, ctx, { filename: "your-file.js" });
    vm.runInContext(DESK_JS, ctx, { filename: "me-desk.js" });
  } catch (e) { win.__err = e; }
  win.__mount = mount;
  return win;
}

/* ── THE DESK OVER THE REAL RESOLVER ────────────────────────────────────────
   bootDesk() hands the desk a resolver ANSWER, which is the right fixture for
   "does the row print what the resolver said". It cannot catch the bug section 9
   exists for, because that bug was the resolver never being ASKED a question it
   could answer on this document: voter-hub-location.js read window.CMP_DATA and
   only window.CMP_DATA, cmp-data.js is not on /me, me.html's whole
   PROFILES-into-CMP_DATA merge is gated on `typeof CMP_DATA !== 'undefined'`, so
   the global was never created, the statewide walk saw a roster of size zero and
   every one of the six ballot rows printed "No officeholder on file" over people
   the product holds full files for.

   So this boot stubs NOTHING between the desk and the resolver. The real
   voter-hub-location.js runs, the location arrives the way it arrives on a real
   visit (out of localStorage, through the module's own loadVoterLocation, which
   is also what sets TEAM_POSITIONS), and the roster is the only roster /me has:
   window.PROFILES. If the desk and the resolver ever stop agreeing about who
   holds a seat, this is the boot that fails. */
function bootLive(opts) {
  const o = opts || {};
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, Promise, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {},
    requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.__PDX_ME_DOC = true;
  const mount = win.document.__node("main");
  mount.id = "me-desk";
  win.document.body.appendChild(mount);
  win.location = {
    href: "https://www.politidex.fyi/me", pathname: "/me", search: "", hash: "",
    origin: "https://www.politidex.fyi", replace() {}, assign() {},
  };
  win.history = { pushState() {}, replaceState() {} };
  const store = {};
  // THE LOCATION ARRIVES THE WAY IT ARRIVES. Written into the module's own
  // storage key rather than onto its globals, so loadVoterLocation() — the one
  // owner of "where does this reader vote" — is what publishes it, exactly as on
  // a real second visit.
  if (o.loc) store["politidex_voter_location"] = JSON.stringify(o.loc);
  if (o.picks) store["politidex_my_team"] = JSON.stringify(o.picks);
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.auth = {
    currentUser: o.uid
      ? { uid: o.uid, isAnonymous: false, email: "voter@example.org", displayName: null }
      : null,
    onAuthStateChanged() {},
  };
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: "issue-map.js" });
    vm.runInContext(IC_JS, ctx, { filename: "issue-colors.js" });
    vm.runInContext(VHL_JS, ctx, { filename: "voter-hub-location.js" });
    // /me HAS NO BUNDLED ROSTER. cmp-data.js is not on the document, so
    // window.CMP_DATA is never created — that absence is the fixture, and it is
    // asserted rather than assumed in section 9.
    win.PROFILES = o.people || {};
    win.loadVoterLocation();
    vm.runInContext(SIDES_JS, ctx, { filename: "stance-sides.js" });
    vm.runInContext(YF_JS, ctx, { filename: "your-file.js" });
    vm.runInContext(DESK_JS, ctx, { filename: "me-desk.js" });
  } catch (e) { win.__err = e; }
  win.__mount = mount;
  return win;
}

// Region b as painted, and nothing around it. The region ids are the desk's own
// and the harness dies if one is renamed rather than measuring the whole desk.
function regionOf(win, id) {
  const html = String(win.__mount.innerHTML);
  const open = html.indexOf(`id="${id}"`);
  if (open < 0) return "";
  const start = html.lastIndexOf("<section", open);
  const end = html.indexOf("</section>", open);
  return start < 0 || end < 0 ? "" : html.slice(start, end + 10);
}
const chipsIn = (region) =>
  [...String(region).matchAll(/<li class="me-pchip[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[0]);
const labelOf = (chip) =>
  (/<span class="me-pchip-l">([\s\S]*?)<\/span>/.exec(chip) || [, ""])[1];
const sideOf = (chip) =>
  (/<span class="me-pchip-s">([\s\S]*?)<\/span>/.exec(chip) || [, ""])[1];

console.log("\n   test-me-snapshot — region b is a snapshot, not a form\n");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · zero positions: no form, no ghosts, one address");
// ═════════════════════════════════════════════════════════════════════════════
const zero = bootDesk({ uid: "u_zero" });
ok(!zero.__err, `the desk boots with an empty file (${zero.__err ? zero.__err.message : "ok"})`);
must(!!zero.PDXYourFile, "your-file.js did not publish itself — this harness is stale");
const KEYS = zero.PDXYourFile.KEYS.slice();
// POSITIONS is the owner's ARRAY of { key, label } — the four side words in the
// order the editor prints them. Indexed here by key so the side a chip carries
// can be compared against the word its owner would have used for it.
const POSITIONS = {};
zero.PDXYourFile.POSITIONS.forEach((p) => { POSITIONS[p.key] = p; });
// HOW WIDE THE SETTER IS, ASKED OF THE SETTER. The caption on region b reads
// "n of N set", and N is this number — the count of keys the editor actually
// offers, derived by your-file.js from the shipped issue vocabulary. It used to
// be eight, and eight taught a reader that eight was the universe of issues in
// this product. Every denominator and every cap sum below is arithmetic on
// N_KEYS, so this suite moves with the vocabulary instead of pinning it.
const N_KEYS = KEYS.length;
ok(N_KEYS > 8,
  `the editor offers ${N_KEYS} keys — the denominator on the desk is still a starter octet`);
const z = regionOf(zero, "me-positions");
must(z.length > 120, "region b did not paint for a reader with nothing on file");

eq(zero.PDXMeDesk.positions().length, 0, "a reader with an empty file has positions on the desk");
eq(chipsIn(z).length, 0,
  "a reader who has answered nothing is shown chips in the row where a chip means a side held");

// THE OCTET IS NOT HERE. Two independent tells, because either one alone can be
// satisfied by markup that is still a form: the editor's own row class, and the
// number of side words on the face. Four sides on every row is the shape that
// was wrong; three starter chips carry no side at all.
lacks(z, "pdxyf-row", "region b paints the editor's own rows before any gesture");
lacks(z, 'data-pdxyf-pos', "region b paints the editor's side controls before any gesture");
const sideWords = Object.keys(POSITIONS).map((k) => POSITIONS[k].label);
const sidesOnFace = sideWords.reduce(
  (n, w) => n + (String(z).match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 0);
ok(sidesOnFace === 0,
  `region b prints ${sidesOnFace} side words for a reader with nothing on file — an empty desk offers no sides to choose`);
// THERE ARE NO STARTER CHIPS HERE ANY MORE, AND THAT IS A FIX, NOT A LOSS.
//
// This region used to paint three dashed "starter" chips — housing, gun rights,
// school choice — in the row directly above the sentence "Nothing on file yet."
// Two things were wrong with them at once, and the second is the one that
// mattered. A chip in this row means A SIDE YOU HOLD everywhere else on the
// desk, so three chips holding no side made the row and the sentence beneath it
// contradict each other, and the row is louder. And they were <li> elements
// with no handler behind them: a reader who took the invitation and tapped one
// got nothing at all. The honest empty state is a sentence, and the sentence
// says what the one gesture is.
//
// WHERE THE GESTURE GOES. /my-stances is the stance studio now — a document
// that opens on a self-tutorial when the file is empty, with twelve starter
// chips of its own over both poles of every fight in them and a locked scope
// sentence under each. Starters belong there, where tapping one asks a
// question and saves an answer. They do not belong on a read-only desk.
lacks(z, "me-pchip--start", "the desk paints starter chips again — a chip in this row means a side held");
lacks(z, "me-yf-host", "the desk declares a mount for a second positions editor");
has(z, "Nothing on file yet", "the empty desk does not say plainly that the file is empty");
has(z, "it takes one tap", "the empty desk does not say what the one gesture costs");
// NOT A SCOLD AND NOT A SCORE.
lacks(z, "%", "the zero state prints a percentage");
lacks(z, "incomplete", "the zero state tells the reader they are incomplete");
lacks(z, "of 8", "the zero state prints a denominator over answers nobody gave");

// ONE DOOR, AND IT IS AN ADDRESS — not a mount, not a hash.
//
// "Set all issues" used to open your-file.js inline, under this region, on a
// desk whose whole job is reading a file back. That left the product with two
// editors for one store: two empty states, two first-runs, and one of them
// wrong the day the other changed. It is now a plain <a href="/my-stances">,
// which a middle click and a copy-link both handle correctly and which the
// reader can press Back out of.
has(z, "data-me-setall", "the zero state has no door to the editor");
has(z, "Set all issues", "the door does not say where it goes");
eq((String(z).match(/data-me-setall/g) || []).length, 1,
  "region b carries more than one door to the same editor");
has(z, 'href="/my-stances"', "the door is not an address — /my-stances is the document positions are set on");
lacks(z, '#my-stances"', "the door is a fragment again, which is the scroll-not-address defect");
must(typeof zero.PDXMeDesk.starters !== "function",
  "me-desk.js publishes starters() again — the desk paints no starter chips, so nothing should ask it for any");
ok(typeof zero.PDXMeDesk.openSetter !== "function",
  "me-desk.js can still mount an editor of its own — /my-stances is the one editor");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · two positions: those two, their own sides, and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
const TWO = { [KEYS[0]]: "support", [KEYS[3]]: "oppose" };
const two = bootDesk({ uid: "u_two", answers: TWO });
ok(!two.__err, "the desk boots with two answers on file");
const t = regionOf(two, "me-positions");
must(t.length > 120, "region b did not paint for a reader with two answers");

const tRows = two.PDXMeDesk.positions();
eq(tRows.length, 2, "the desk does not read exactly the two answers on file");
const tChips = chipsIn(t);
eq(tChips.length, 2, "region b paints a number of chips that is not the number of answers");
// THE LABELS ARE COMPARED AS PAINTED. me-desk.js escapes what it prints, so
// "School Choice & Education Freedom" reaches the markup as "&amp;" — comparing
// the raw register label against the painted one would fail on an ampersand and
// say nothing about the claim under test.
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const painted = tChips.map(labelOf).sort();
const expected = tRows.map((r) => esc(two.PDXMeDesk.issueLabel(r.key))).sort();
eq(painted.join(" | "), expected.join(" | "),
  "the chips painted are not the labels of the keys this reader answered");

// THE SIDE IS THE READER'S OWN, READ BACK THROUGH THE OWNER'S LABEL TABLE.
tRows.forEach((r) => {
  const chip = tChips.find((c) => labelOf(c) === esc(two.PDXMeDesk.issueLabel(r.key)));
  ok(!!chip, `the key "${r.key}" this reader answered has no chip`);
  if (!chip) return;
  const want = (POSITIONS[r.pos] && POSITIONS[r.pos].label) || "";
  eq(sideOf(chip), want, `the chip for "${r.key}" does not carry the side this reader chose`);
  eq(r.pos, TWO[r.key], `the desk read a different side for "${r.key}" than the file holds`);
});

// AND NOT ONE OF THE MANY THEY DID NOT ANSWER.
KEYS.filter((k) => !TWO[k]).forEach((k) => {
  const lab = esc(two.PDXMeDesk.issueLabel(k));
  ok(painted.indexOf(lab) < 0,
    `"${lab}" is on the face although this reader never answered it — a snapshot of the vocabulary is the form`);
});
// The denominator is a list length over a list length, and both are read.
has(t, `2 of ${N_KEYS} set`,
  "region b does not state the snapshot's own denominator — it should be answers over what the editor offers");
ok(String(t).indexOf("2 of 8 ") < 0,
  "region b's caption still reads 2 of 8 — eight is not the vocabulary");
ok(String(t).indexOf("of 8 on file") < 0, "region b still prints the octet denominator");
lacks(t, "me-pchip--start", "a reader with answers is also shown starter chips");
eq((String(t).match(/me-pmore/g) || []).length, 0,
  "two answers printed a leftover count, which would be a claim the reader said more than they did");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the cap: six on the face, the rest counted behind the door");
// ═════════════════════════════════════════════════════════════════════════════
const CAP = zero.PDXMeDesk.SNAP_CAP;
eq(CAP, 6, "the face cap is not six, which is the number the brief named");
const seven = {};
KEYS.slice(0, 7).forEach((k, i) => { seven[k] = i % 2 ? "oppose" : "support"; });
const w7 = bootDesk({ uid: "u_seven", answers: seven });
const s7 = regionOf(w7, "me-positions");
must(s7.length > 120, "region b did not paint for a reader with seven answers");
eq(w7.PDXMeDesk.positions().length, 7, "the desk does not read all seven answers on file");
eq(chipsIn(s7).length, CAP, `the face is not capped at ${CAP} chips`);
has(s7, "1 more", "the seventh answer is dropped without being counted");
has(s7, "data-me-setall", "the leftover count is not printed beside the door that shows them");
// Every chip on the capped face is still one of the seven, in the owner's order.
const faceKeys = chipsIn(s7).map(labelOf);
const orderKeys = w7.PDXMeDesk.positions().slice(0, CAP)
  .map((r) => String(w7.PDXMeDesk.issueLabel(r.key)).replace(/&/g, "&amp;"));
eq(faceKeys.join(" | "), orderKeys.join(" | "),
  "the capped face is not the first six of the answered list in the owner's own order");
// And a fully answered file is a full face with everything else behind the door.
const all = {};
KEYS.forEach((k) => { all[k] = "mixed"; });
const wAll = bootDesk({ uid: "u_all", answers: all });
const sAll = regionOf(wAll, "me-positions");
eq(chipsIn(sAll).length, CAP, "a reader who answered everything is shown more than the face holds");
has(sAll, `${N_KEYS - CAP} more`, "a full file does not count the answers behind the door");
has(sAll, `${N_KEYS} of ${N_KEYS} set`, "a full file does not state its own denominator");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · colour: the chip's hex is the register's hex for that key");
// ═════════════════════════════════════════════════════════════════════════════
// ONE OWNER FOR ISSUE COLOUR. PDXIssueColors.skin() resolves a key through the
// register and the core families and hands back the whole attribute fragment;
// the desk prints that fragment and holds no palette of its own. This section
// takes a key the reader has answered, asks the OWNER what its hex is, and
// looks for that exact hex in the chip — so a second table in me-desk.css or a
// hard-coded tint would fail here even if it happened to look right.
must(!!zero.PDXIssueColors && typeof zero.PDXIssueColors.skin === "function",
  "issue-colors.js did not publish skin() — this harness is stale");
has(ME, 'src="/issue-colors.js"', "me.html does not load the colour owner at all");
ok(ME.indexOf('src="/issue-map.js"') < ME.indexOf('src="/issue-colors.js"'),
  "me.html loads issue-colors.js before issue-map.js — the core-family fallback would resolve nothing");

// skin() answers { on, style, attr }: `on` is whether the key resolved at all,
// `style` is the four custom properties, and the hex this section is about is
// the first of them. Reading it off the OWNER's own style string — rather than
// off a table in this file — is what makes this a cross-check and not a second
// copy of the palette.
const hexOf = (k) => {
  const sk = zero.PDXIssueColors.skin(k, zero.PDXIssueFamily);
  if (!sk || !sk.on) return "";
  return (/--pdx-ic:([^;]+);/.exec(String(sk.style)) || [, ""])[1].trim();
};
let themed = 0;
KEYS.forEach((k) => {
  const hex = hexOf(k);
  const attr = zero.PDXMeDesk.icAttr(k);
  if (!hex) {
    // UNTHEMED STEEL IS AN HONEST ANSWER. A key with no colour on file gets an
    // EMPTY attribute on purpose, so the chip falls to the sheet's own ink
    // rather than borrowing a neighbouring issue's identity.
    eq(attr, "", `the key "${k}" has no colour on file but the desk printed one anyway`);
    return;
  }
  themed++;
  has(attr, 'data-ic="on"', `the themed key "${k}" does not carry the register's own flag`);
  has(attr, `--pdx-ic:${hex}`, `the chip for "${k}" does not carry the register's hex (${hex})`);
});
ok(themed >= 1, "not one of the offered keys resolves to a colour — the chips would all be steel");

// And it reaches the painted markup, not just the helper.
const oneThemed = KEYS.find((k) => !!hexOf(k));
must(!!oneThemed, "no key resolves to a colour at all — section 4 has nothing to measure");
const themedWin = bootDesk({ uid: "u_colour", answers: { [oneThemed]: "support" } });
const themedRegion = regionOf(themedWin, "me-positions");
const themedHex = hexOf(oneThemed);
has(themedRegion, `--pdx-ic:${themedHex}`,
  `the painted chip for "${oneThemed}" does not carry ${themedHex}, which is the register's colour for it`);
has(themedRegion, 'data-ic="on"', "the painted chip does not carry the themed flag");
// The stylesheet reads the variable rather than naming a colour per key.
const CSS_CODE = String(DESK_CSS).replace(/\/\*[\s\S]*?\*\//g, " ");
has(CSS_CODE, "--pdx-ic", "me-desk.css does not read the issue-colour variable");
ok(!new RegExp(themedHex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(CSS_CODE),
  `me-desk.css hard-codes ${themedHex} — that is a second copy of the register's palette`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the door, the seat, and the bump");
// ═════════════════════════════════════════════════════════════════════════════
// THE DESK READS POSITIONS AND DOES NOT SET THEM, AND THE DOOR IS AN ADDRESS.
//
// What this section used to assert was that "Set all issues" mounted
// your-file.js inline, under region b, into a #me-yf-host the desk declared —
// and that the editor which arrived was the owner's markup rather than a copy.
// The mount was the right answer to the wrong question. /my-stances is a
// document now, so the product had two editors over one store: two empty
// states, two first-runs, two places to learn the same lingo, and one of them
// wrong the day the other changed. The desk kept the half it is good at.
//
// WHAT STILL HAS TO BE TRUE. The desk must read positions through their owner
// rather than reaching into storage, and it must not write a side anywhere.
// your-file.js itself is untouched by this pass — it still publishes
// PDXYourFile and its own modal, and scripts/test-your-file.mjs still owns
// that claim; the desk simply no longer mounts it.
has(DESK_CODE, "PDXYourFile", "the desk does not reference the module that owns the positions");
lacks(DESK_CODE, "data-pdxyf-pos",
  "me-desk.js writes the editor's side controls itself, which is a second owner of the reader's answers");
lacks(DESK_CODE, "function openSetter", "the desk can still mount an editor of its own");
lacks(DESK_CODE, "me-yf-host", "the desk still declares a host for a second editor");
ok(typeof zero.PDXMeDesk.openSetter !== "function",
  "the desk exports a mount for a second editor — the door is an <a href> now");
ok(typeof zero.PDXMeDesk.isSetterOpen !== "function",
  "the desk still reports on an inline editor it no longer has");
must(!!zero.PDXMeDesk.positions, "the desk stopped exporting its read of the positions — this suite is stale");
{
  // THE DOOR, READ OFF THE PAINT. One anchor, root-absolute, no fragment, and
  // it survives a repaint — a reader who signs in and back out must not lose it.
  const doorRegion = regionOf(zero, "me-positions");
  const door = (String(doorRegion).match(/<a[^>]*data-me-setall[^>]*>/) || [])[0] || "";
  ok(!!door, "the positions door is not an anchor any more");
  has(door, 'href="/my-stances"', "the positions door does not name the document positions are set on");
  ok(!/href="\/?#/.test(door), "the positions door is a fragment, which is the defect this pass removed");
  zero.PDXMeDesk.render();
  has(String(regionOf(zero, "me-positions")), 'href="/my-stances"',
    "the positions door does not survive a repaint");
}

// LOG OUT LIVES ON THE DESK. The nav chip is one link now (test-me-menu-doors
// owns that claim), so the control the panel used to hold has to be here.
const idRegion = String(zero.__mount.innerHTML);
has(idRegion, "data-me-signout", "the desk carries no log-out control, and the nav panel that held one is gone");
has(DESK_CODE, "signOut", "the desk wires no sign-out at all");

// WORK SEAT IS A DOOR ONTO DOOR 2. The href is the ballot workspace's own
// arrival key — /ballot?seat=<key> — and it is asserted on the U.S. Senate row
// specifically, resolved as a URL rather than matched as a literal, so a bare
// "ballot?seat=senate" (which resolves to /ballot?seat=senate from /me and to
// nothing useful from anywhere else) would fail here.
const SEATS = [
  { key: "senate", label: "U.S. Senate", icon: "\u{1F3DB}" },
  { key: "house", label: "U.S. House", icon: "\u{1F3DB}" },
];
const withSeats = bootDesk({
  uid: "u_seat", seats: SEATS,
  loc: { state: "Utah", city: "Provo", county: "Utah County", district: "3" },
});
const ballotRegion = regionOf(withSeats, "me-ballot");
must(ballotRegion.length > 120, "region d did not paint for a located reader with a slate");
has(ballotRegion, "U.S. Senate", "the located reader's slate does not list the Senate seat");
const senateRow = /<li class="me-seat">(?:(?!<\/li>)[\s\S])*?U\.S\. Senate[\s\S]*?<\/li>/.exec(ballotRegion);
must(!!senateRow, "the U.S. Senate row could not be found in region d");
const workHref = (/<a class="me-work" href="([^"]+)">([^<]*)<\/a>/.exec(senateRow[0]) || [])[1];
ok(!!workHref, "the U.S. Senate row has no Work seat control");
ok(String(workHref).startsWith("/"),
  `the Work seat href is not root-absolute (${workHref}) — it would resolve differently per document`);
if (workHref) {
  const u = new URL(workHref, "https://www.politidex.fyi/me");
  eq(u.pathname, "/ballot", "the Work seat control does not open the ballot workspace");
  eq(u.searchParams.get("seat"), "senate",
    "the Work seat control does not name the seat it was printed on");
}
const workLabel = (/<a class="me-work" href="[^"]+">([^<]*)<\/a>/.exec(senateRow[0]) || [])[1];
ok(/Work seat|Change/.test(String(workLabel)),
  `the Work seat control reads "${workLabel}" rather than naming the job it opens`);
// A CONTROL THAT ONLY RESTYLES THE ROW IS THE MISS THIS GUARDS. An <a href> is
// the navigation; a button with a class toggle is not.
lacks(senateRow[0], "<button", "the Work seat control is a button rather than a link to the seat");
// And the other half of the contract, in the file that honours the key: the
// workspace reads ?seat= and only for a seat on this voter's own slate.
const WORK_JS = R("ballot-workspace.js");
has(WORK_JS, "[?&]seat=", "the ballot workspace no longer reads the arrival key this href sets");
has(jsBare(WORK_JS), "onList", "the workspace no longer checks the arriving seat against the voter's slate");

// THE BUMP. me-desk.js and me-desk.css are precached and both moved again this
// pass, on top of the district list and the officeholder line the pass before
// added: region d gained a third sentence ("Still loading seats…") and the
// stylesheet gained the rule that dresses it, and the district rows gained a
// second reason for being blank. A warm device holding the old desk beside the
// new resolver prints the empty sentence over a roster that has not arrived —
// the reported bug — and a warm device holding the new desk beside the old
// stylesheet prints the wait in the same weight as a name. So the shell cache
// has to be renamed. (your-file.js, your-file.css and voter-hub-location.js are
// runtime entries, deliberately, and the rename reaches them through the
// runtime cache's own version namespace.)
const ver = (/const CACHE_VERSION = '([^']+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(ver), `CACHE_VERSION is not a version literal (${ver})`);
ok(Number(ver.slice(1)) >= 206,
  `CACHE_VERSION is ${ver}; this pass changed precached me-desk.js and me-desk.css — the ` +
  "ballot rows learned to tell a roster that has not arrived from a seat nobody is on file " +
  "for, and the district rows learned to say whether the map or the record is what is " +
  "missing. A warm device pairing the old desk with the new resolver paints the coverage " +
  "admission this pass exists to remove. It has to be at least v206");
const shellList = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(shellList.length > 500, "the SHELL_ASSETS probe matched nothing in sw.js");
["/me.html", "/me-desk.js", "/me-desk.css", "/issue-colors.js", "/issue-map.js"].forEach((a) => {
  has(shellList, `'${a}'`, `${a} is not precached, so the desk would boot half-cold`);
});
// /your-file.js IS DELIBERATELY NOT ON THAT LIST, and this pass did not change
// that. It is runtime-cached, pinned out of the precache by
// test-mobile-body-lock.mjs and test-your-file.mjs, and the desk is written for
// its absence: mountPositions() says the editor is still loading rather than
// painting rows the desk would then own. Adding it here would be a
// different decision than the one those two suites recorded.
ok(!new RegExp("'/your-file\\.js'").test(shellList),
  "/your-file.js was added to the precache — two other suites pin it out, and the desk's " +
  "'still loading' branch exists because it is not there");
// The log names the bump, so a reader of sw.js can tell WHY the cache moved.
has(SW, `// ${ver} -`, `the cache log has no entry for ${ver}`);


// ═════════════════════════════════════════════════════════════════════════════
section("6 · every district this location resolves, labelled, or honestly blank");
// ═════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG. Region a's where line read "Davis County, Utah · District 2."
// A voter does not sit in "District 2." They sit in a U.S. House district AND a
// state senate district AND a state house district AND a municipality, all at
// once, and printing one number with no label is worse than printing none: the
// reader cannot tell which of the four it is, and four fifths of their ballot
// is invisible on the one page that is supposed to be about them.
//
// WHAT IT IS NOW. A labelled list off the SAME resolver Who Represents Me and
// the ballot workspace ask — pdxRepsForMe() — fail-closed row by row. A row
// the resolver cannot answer says "not on file" and invents no number.
{
  // THE DAVIS / UTAH FIXTURE, resolved the way the resolver resolves it: levels
  // carrying a district apiece. The desk must not read these off the location
  // record — that is why the fixture's own stateSenateDistrict / stateHouseDistrict
  // are left out here and tested separately below.
  const davis = bootDesk({
    uid: "u_davis",
    loc: { state: "Utah", county: "Davis County", city: "Kaysville", district: "2" },
    reps: {
      located: true, state: "Utah", county: "Davis County",
      levels: [
        { key: "house", seat: "house", label: "U.S. House", district: "2", pid: "" },
        { key: "statesenate", seat: "statesenate", label: "State Senate", district: "22", pid: "" },
        { key: "statehouse", seat: "statehouse", label: "State House", district: "15", pid: "" },
      ],
    },
  });
  ok(!davis.__err, `the desk boots for a located reader (${davis.__err ? davis.__err.message : "ok"})`);
  const a = regionOf(davis, "me-identity");
  must(a.length > 120, "region a did not paint for a located reader");

  // THE ROWS ARE THE RESOLVER'S, AND THEY ARE ASKED OF THE DESK'S OWN API so a
  // renamed class cannot make this section silently stop measuring anything.
  const rows = davis.PDXMeDesk.districts();
  ok(rows.length >= 5, `region a lists ${rows.length} district rows — the brief named at least five`);
  const byLabel = {};
  rows.forEach((d) => { byLabel[d.label] = d; });
  ["County", "U.S. House", "State Senate", "State House", "Local"].forEach((lb) => {
    ok(!!byLabel[lb], `region a has no "${lb}" row — a whole level of this reader's ballot is invisible`);
    has(a, `>${lb}</dt>`, `the "${lb}" row is not painted with its label`);
  });
  eq(byLabel["County"].value, "Davis County, Utah", "the county row is not county and state");
  eq(byLabel["U.S. House"].value, "District 2", "the U.S. House row does not name the resolved CD");
  eq(byLabel["State Senate"].value, "District 22", "the State Senate row does not name the resolved district");
  eq(byLabel["State House"].value, "District 15", "the State House row does not name the resolved district");
  eq(byLabel["Local"].value, "Kaysville", "the local row does not name the municipality this location sits in");
  ["District 2", "District 22", "District 15", "Kaysville"].forEach((v) => {
    has(a, `>${v}</dd>`, `"${v}" is resolved but not painted`);
  });

  // AND THE BARE NUMBER IS GONE. "District 2" alone was the miss even though it
  // WAS the House CD, because nothing on the line said so — so the assertion is
  // that the old shape (the where line, a separator, a naked district) does not
  // survive anywhere in region a.
  ok(!/·\s*District\s*\d/.test(a),
    "region a still prints a bare unlabelled district after a separator, which is the string this pass removed");
  const whereLine = (/<p class="me-where">([\s\S]*?)<\/p>/.exec(a) || [, ""])[1];
  ok(!/District/.test(whereLine),
    `the where line still carries a district ("${whereLine}") instead of leaving it to the labelled list`);

  // FAIL CLOSED, ROW BY ROW. Same county, same state, a resolver that knows
  // nothing below the county: every legislative row says "not on file" and NOT
  // ONE OF THEM INVENTS A NUMBER. This is the assertion that matters most —
  // a desk that guesses a district sends a reader to the wrong ballot.
  const thin = bootDesk({
    uid: "u_thin",
    loc: { state: "Utah", county: "Davis County" },
    reps: { located: true, state: "Utah", county: "Davis County", levels: [] },
  });
  const tRegion = regionOf(thin, "me-identity");
  const tRows = {};
  thin.PDXMeDesk.districts().forEach((d) => { tRows[d.label] = d; });
  ["U.S. House", "State Senate", "State House", "Local"].forEach((lb) => {
    ok(!!tRows[lb], `the unresolved fixture dropped the "${lb}" row instead of printing it blank`);
    eq(tRows[lb].none, true, `the "${lb}" row claims a value the resolver never gave it`);
  });
  eq(tRows["County"].none, false, "the county row went blank although the county resolved");
  has(tRegion, thin.PDXMeDesk.DIST_NONE,
    "an unresolved district row does not say it is not on file");
  ok(!/District\s*\d/.test(tRegion),
    "region a printed a district number for a reader whose districts do not resolve — that is an invented number");

  // THE READER'S OWN SAVED FIELD IS A LEGITIMATE FALLBACK, and only because the
  // list makes no officeholder claim: it is their own input echoed back with a
  // label on it. Who holds the seat stays with pdxSeatHolders in region d.
  const saved = bootDesk({
    uid: "u_saved",
    loc: {
      state: "Utah", county: "Davis County", district: "1",
      stateSenateDistrict: "7", stateHouseDistrict: "12",
    },
    reps: { located: true, state: "Utah", county: "Davis County", levels: [] },
  });
  const sRows = {};
  saved.PDXMeDesk.districts().forEach((d) => { sRows[d.label] = d; });
  eq(sRows["U.S. House"].value, "District 1", "the reader's own saved CD is not echoed back");
  eq(sRows["State Senate"].value, "District 7", "the reader's own saved state senate district is not echoed back");
  eq(sRows["State House"].value, "District 12", "the reader's own saved state house district is not echoed back");

  // JUDICIAL IS ASKED OF ITS OWNER OR NOT AT ALL. PDXJudicial is not on /me, so
  // the row is absent rather than permanently "not on file" — a row that can
  // only ever be blank is noise. Where the module IS on the document (a shell
  // that carries it), the row appears and carries that owner's answer.
  ok(!byLabel["Judicial"],
    "region a prints a judicial row on a document that does not carry PDXJudicial — it could only ever be blank");
  lacks(DESK_CODE, "judicialDistricts", "the desk holds its own table of judicial divisions");

  // AN UNPLACEABLE READER GETS NO LIST AT ALL, rather than a column of "not on
  // file" that reads as a broken page.
  eq(bootDesk({ uid: "u_nowhere" }).PDXMeDesk.districts().length, 0,
    "a reader we cannot place is shown a district list anyway");

  // ONE OWNER. The desk asks the resolver; it does not hold district geometry,
  // a CD table, or a second reader of the location record's district fields.
  has(DESK_CODE, "pdxRepsForMe", "the desk no longer asks the resolver where this reader sits");
  lacks(DESK_CODE, "pdxCdForAddress", "the desk resolves congressional districts itself");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the ballot snapshot leads with whoever holds the seat");
// ═════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG. Region d printed six seat rows and, under each, "No pick" —
// so a reader arriving at their own desk for the first time saw six blanks and
// nothing else. The desk HAS the incumbent for a resolved seat: pdxSeatHolders
// answers it, and the roster index on /me fills CMP_DATA. A row that knows who
// the sitting senator is and prints "No pick" is withholding the one fact the
// reader came for.
//
// WHAT IT IS NOW. Office name, then the current officeholder (a name and a door
// to /p/<pid>) or the honest "No officeholder on file", then the pick underneath
// if they set one. This is NOT a second ballot and NOT the complete ballot —
// challengers stay on Door 2.
{
  const SEATS7 = [
    { key: "senate", label: "U.S. Senate", icon: "\u{1F3DB}" },
    { key: "house", label: "U.S. House", icon: "\u{1F3DB}" },
    { key: "local", label: "Mayor", icon: "\u{1F3D9}" },
  ];
  const held = bootDesk({
    uid: "u_held", seats: SEATS7,
    loc: { state: "Utah", county: "Davis County", city: "Kaysville", district: "2" },
    reps: { located: true, state: "Utah", county: "Davis County", levels: [] },
    holders: { senate: ["mike-lee", "john-curtis"], house: ["blake-moore"], local: [] },
    people: {
      "mike-lee": { name: "Mike Lee" },
      "john-curtis": { name: "John Curtis" },
      "blake-moore": { name: "Blake Moore" },
      "someone-else": { name: "Someone Else" },
    },
    picks: { house: "someone-else", senate: "mike-lee" },
  });
  ok(!held.__err, `region d boots with holders on file (${held.__err ? held.__err.message : "ok"})`);
  const d = regionOf(held, "me-ballot");
  must(d.length > 120, "region d did not paint for a located reader with a slate");
  const rowOf = (office) => {
    const re = new RegExp('<li class="me-seat">(?:(?!</li>)[\\s\\S])*?' +
      office.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '[\\s\\S]*?</li>');
    const m = re.exec(d);
    return m ? m[0] : "";
  };

  // THE SITTING SENATORS, NAMED, EACH WITH A DOOR TO THEIR FILE. Two holders on
  // one seat is the ordinary case for a Senate row and both belong on it.
  const senate = rowOf("U.S. Senate");
  must(!!senate, "the U.S. Senate row could not be found in region d");
  has(senate, "Mike Lee", "the Senate row does not name the sitting senator the roster holds");
  has(senate, "John Curtis", "the Senate row names one of two sitting senators and drops the other");
  has(senate, 'href="/p/mike-lee"', "the sitting senator's name is not a door to their file");
  has(senate, 'href="/p/john-curtis"', "the second sitting senator's name is not a door to their file");
  has(senate, "me-holds", "the officeholder line does not carry the class the stylesheet dresses");

  // THE PICK IS SECOND, AND IT IS LABELLED AS A PICK so the two lines cannot be
  // read as one claim. A pick that IS the incumbent is printed all the same —
  // that is a real and common answer, not a duplicate to suppress.
  has(senate, "Your pick:", "a seat with a pick on it does not say so");
  const holdsAt = senate.indexOf("me-holds");
  const pickAt = senate.indexOf("me-pick");
  ok(holdsAt >= 0 && pickAt > holdsAt,
    "the pick is printed above the officeholder — the row is supposed to lead with who holds the seat");

  // A PICK THAT IS NOT THE INCUMBENT SITS UNDER THE INCUMBENT, both named.
  const house = rowOf("U.S. House");
  must(!!house, "the U.S. House row could not be found in region d");
  has(house, "Blake Moore", "the House row does not name the officeholder the roster holds");
  has(house, "Someone Else", "the House row drops this reader's own pick");
  ok(house.indexOf("Blake Moore") < house.indexOf("Someone Else"),
    "the House row prints the pick before the incumbent");

  // AND A SEAT NOBODY IS ON FILE FOR SAYS SO, rather than borrowing a name from
  // a neighbouring row or guessing from the office. This is the fail-closed half
  // and it is the one that would ship quietly.
  const mayor = rowOf("Mayor");
  must(!!mayor, "the Mayor row could not be found in region d");
  has(mayor, held.PDXMeDesk.HOLD_NONE,
    "an unresolved local seat does not say there is no officeholder on file");
  ["Mike Lee", "John Curtis", "Blake Moore", "Someone Else"].forEach((n) => {
    ok(mayor.indexOf(n) < 0, `the unresolved Mayor row borrowed "${n}" from another row`);
  });
  ok(!/href="\/p\//.test(mayor), "the unresolved Mayor row links to a person's file anyway");

  // NO HOLDER HOOK AT ALL — an older shell, a document without
  // voter-hub-location.js — and every row fails closed the same way. Nothing
  // here may fall through to a name derived from the office or the state.
  const noHook = bootDesk({
    uid: "u_nohook", seats: SEATS7,
    loc: { state: "Utah", county: "Davis County", city: "Kaysville" },
    reps: { located: true, state: "Utah", county: "Davis County", levels: [] },
  });
  const nd = regionOf(noHook, "me-ballot");
  eq((String(nd).match(new RegExp(noHook.PDXMeDesk.HOLD_NONE, "g")) || []).length, SEATS7.length,
    "without the holder hook, some seat row claimed an officeholder");
  ok(!/href="\/p\//.test(nd), "without the holder hook, a row still linked to somebody's file");

  // THE SEAT IS STILL A DOOR, UNCHANGED. Adding the incumbent must not have
  // turned the row into a destination of its own.
  has(senate, '/ballot?seat=senate', "the Senate row lost its door to the ballot workspace");
  // AND THIS IS NOT THE COMPLETE BALLOT. No challenger, no field, no count of
  // candidates — the copy on the block stays and keeps saying so.
  has(d, "This is not an official ballot", "region d dropped the line that says what it is not");
  ["challenger", "Challenger", "candidates in this race", "field"].forEach((n) => {
    ok(String(d).indexOf(n) < 0, `region d pulled "${n}" onto /me, which is Door 2's job`);
  });
  lacks(DESK_CODE, "keyRacesRelevantData", "the desk reaches for the ballot workspace's own field data");

  // ONE OWNER FOR "WHO HOLDS THIS SEAT". The desk asks pdxSeatHolders and holds
  // no incumbent table, no sitting-member list and no seat-to-person map.
  has(DESK_CODE, "pdxSeatHolders", "the desk no longer asks the one owner who holds a seat");
  ["INCUMBENTS", "SITTING_", "SEAT_HOLDERS ="].forEach((n) => {
    lacks(DESK_CODE, n, "the desk holds its own table of who sits in which seat");
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · no literal octet anywhere on the desk's source");
// ═════════════════════════════════════════════════════════════════════════════
// The point of the widening is that there is ONE source for how many issues
// exist, and me-desk.js is not it. A literal that agreed with the vocabulary on
// the day it was typed is the defect — it stops agreeing the first time a key is
// added, and nothing fails until a reader reads a wrong number.
ok(String(DESK_JS).indexOf("of 8") < 0,
  'me-desk.js contains the substring "of 8" — the denominator is a literal again');
ok(!/\b(EIGHT|eightIssues|ISSUE_OCTET)\b/.test(DESK_CODE),
  "me-desk.js names an octet constant");
ok(!/\.slice\(0,\s*8\)/.test(DESK_CODE), "me-desk.js truncates the issue list to eight");
ok(!/\.length\s*[<>=]=?\s*8\b/.test(DESK_CODE), "me-desk.js compares a list length against eight");
// The caption's denominator is read off the owner, not counted here.
has(DESK_CODE, "PDXYourFile", "the desk does not ask the owner for the vocabulary it counts against");
has(DESK_CODE, "KEYS", "the desk no longer reads the owner's key list as its denominator");
// And the same rule on the two surfaces the old string leaked onto.
["index.html", "who-represents-me.js", "me.html"].forEach((f) => {
  const src = R(f);
  ok(String(src).indexOf("positions on eight issues") < 0,
    `${f} still advertises Your file as eight issues`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the desk resolves officeholders through the resolver the rest of the app uses");
// ═════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG, on a live phone, for a Davis County / Utah reader. /me read
// "Positions: 2 of 121", printed "U.S. House · District 2", and then printed
// "No officeholder on file" on ALL SIX ballot rows — while Who Represents Me,
// for the same saved location, named John Curtis, Mike Lee and Spencer Cox. Two
// surfaces, one location, one resolver, two different answers.
//
// WHY. voter-hub-location.js read window.CMP_DATA, and only window.CMP_DATA, for
// every roster question it asks — how big is the roster, does it hold this pid,
// walk it for this state's senators. CMP_DATA is created by cmp-data.js, which is
// NOT on /me; me.html gates its entire PROFILES-into-CMP_DATA merge on
// `typeof CMP_DATA !== 'undefined'`, so on that document the global is never
// created at all. Roster size zero → no statewide walk → no pid on any level →
// pdxSeatHolders() answers with an empty pid list → six honest-looking sentences
// over three people with full files at /p/curtis, /p/lee and /p/cox.
//
// WHAT IT IS NOW. The resolver asks ONE question in ONE place — which people
// index does this document carry — and answers it with the bundled roster where
// there is one and the live Firestore roster (window.PROFILES) where there is
// not. Same walk, same records, same single owner of "who holds this seat":
// nothing was copied onto /me and no second seat table exists.
//
// AND A COLD ROSTER IS A WAIT, NOT AN ABSENCE. The live index arrives after the
// first paint, so pdxSeatHolders() publishes rosterCold on every reply and the
// row says "Still loading seats…" until it lands, then repaints into the names.
// Three states, three sentences, and the row never has to guess which it is in.
{
  // THE DAVIS COUNTY FIXTURE, END TO END. No stubbed resolver, no stubbed seat
  // holders, no CMP_DATA — the real voter-hub-location.js over the only roster
  // /me has.
  const UT_ROSTER = {
    curtis: { name: "John Curtis", office: "U.S. Senator", state: "Utah", party: "R" },
    lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah", party: "R" },
    cox: { name: "Spencer Cox", office: "Governor", state: "Utah", party: "R" },
  };
  const DAVIS = { state: "Utah", county: "Davis County", city: "Kaysville", district: "2" };

  const live = bootLive({ uid: "u_live", loc: DAVIS, people: UT_ROSTER });
  ok(!live.__err, `the desk boots over the real resolver (${live.__err ? live.__err.message : "ok"})`);
  must(!!live.pdxSeatHolders, "voter-hub-location.js did not publish pdxSeatHolders — this harness is stale");
  must(!!live.PDXMeDesk, "me-desk.js did not publish itself over the real resolver");

  // THE FIXTURE'S OWN PREMISE, ASSERTED. If CMP_DATA ever appears on this
  // document the bug this section guards becomes unreachable through it, and the
  // section would pass while measuring nothing.
  eq(typeof live.CMP_DATA, "undefined",
    "the /me fixture grew a bundled roster — the whole failure was that /me has none");
  eq(live.pdxRosterWarm(), true,
    "the resolver does not consider the live Firestore roster a roster, which is the bug itself");
  eq(live._hasUserLocation, true, "the saved location did not load through the module that owns it");

  // ONE RESOLVER, AND IT NAMES BOTH SENATORS. Asked of the resolver first,
  // because if this is empty the paint below cannot be right for the right
  // reason.
  const senPids = (live.pdxSeatHolders("senate").pids || []).slice().sort();
  eq(senPids.join(","), "curtis,lee",
    "the resolver does not name both rostered Utah senators for a Davis County reader");
  eq((live.pdxSeatHolders("governor").pids || []).join(","), "cox",
    "the resolver does not name the rostered governor");
  eq(live.pdxSeatHolders("senate").rosterCold, false,
    "the resolver reports a cold roster while holding rows");

  // AND THE DESK PRINTS THEM, EACH A DOOR TO THEIR OWN FILE.
  const ld = regionOf(live, "me-ballot");
  must(ld.length > 120, "region d did not paint over the real resolver");
  const liveRow = (office) => {
    const re = new RegExp('<li class="me-seat">(?:(?!</li>)[\\s\\S])*?' +
      office.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '[\\s\\S]*?</li>');
    const m = re.exec(ld);
    return m ? m[0] : "";
  };
  const liveSenate = liveRow("U.S. Senate");
  must(!!liveSenate, "the U.S. Senate row is not on the desk over the real resolver");
  has(liveSenate, "John Curtis", "the Senate row does not name the senator the roster holds");
  has(liveSenate, "Mike Lee", "the Senate row names one senator and drops the other");
  has(liveSenate, 'href="/p/curtis"', "the named senator is not a door to their file");
  has(liveSenate, 'href="/p/lee"', "the second named senator is not a door to their file");
  lacks(liveSenate, live.PDXMeDesk.HOLD_NONE,
    "the Senate row claims no officeholder is on file for a seat the resolver just named two people for");
  const liveGov = liveRow("Governor");
  must(!!liveGov, "the Governor row is not on the desk over the real resolver");
  has(liveGov, "Spencer Cox", "the Governor row does not name the governor the roster holds");
  has(liveGov, 'href="/p/cox"', "the named governor is not a door to their file");

  // THE PID IS THE ROSTER'S PID, not a slug this file derived from a name — the
  // /p/ door has to open the record the resolver actually resolved.
  Object.keys(UT_ROSTER).forEach((pid) => {
    has(ld, 'href="/p/' + pid + '"', `region d does not open /p/${pid} for a seat the resolver filled with ${pid}`);
  });

  // THE SEAT LIST IS THE OWNER'S. loadVoterLocation() set TEAM_POSITIONS for
  // Utah; the desk projected it. A fixture that hand-wrote the slate could not
  // catch a desk reading the wrong seats.
  const liveSeatKeys = live.PDXMeDesk.seats().map((x) => x.key);
  ok(liveSeatKeys.indexOf("senate") >= 0 && liveSeatKeys.indexOf("governor") >= 0,
    `the Utah slate the resolver published does not reach the desk (${liveSeatKeys.join(",")})`);

  // ── BEFORE THE ROSTER: A WAIT, AND NOT THE EMPTY SENTENCE ─────────────────
  // Same reader, same location, roster not yet arrived. This is the state /me
  // is ALWAYS in at first paint, because its roster is a Firestore round trip —
  // so the sentence printed here is the one most readers see first, and it was
  // the wrong one.
  const cold = bootLive({ uid: "u_cold", loc: DAVIS, people: {} });
  ok(!cold.__err, `the desk boots with a cold roster (${cold.__err ? cold.__err.message : "ok"})`);
  eq(cold.pdxRosterWarm(), false, "the fixture's roster is not actually cold");
  eq(cold.pdxSeatHolders("senate").rosterCold, true,
    "the resolver does not report a cold roster while it has no rows — the desk cannot tell a wait from an absence");
  const cd = regionOf(cold, "me-ballot");
  must(cd.length > 120, "region d did not paint with a cold roster");
  has(cd, cold.PDXMeDesk.HOLD_WAIT,
    "a row whose roster has not arrived does not say it is still loading");
  ok(String(cd).indexOf(cold.PDXMeDesk.HOLD_NONE) < 0,
    "a row whose roster has not arrived claims no officeholder is on file — that is a coverage admission " +
    "made before the data to make it arrived, and it is the reported bug");
  ok(!/href="\/p\//.test(cd), "a cold row linked to somebody's file anyway");
  // AND THE TWO SENTENCES ARE NOT THE SAME SENTENCE.
  ok(cold.PDXMeDesk.HOLD_WAIT !== cold.PDXMeDesk.HOLD_NONE,
    "the loading sentence and the empty sentence are the same string, so no reader can tell them apart");
  ok(/loading/i.test(cold.PDXMeDesk.HOLD_WAIT),
    `the cold sentence ("${cold.PDXMeDesk.HOLD_WAIT}") does not say it is loading`);
  // AND THE TWO HALVES TRAVEL TOGETHER, which is failure mode 10 on this
  // document: a sentence with a class no stylesheet dresses reads in the same
  // weight as a name, and a wait that looks like a name is the bug wearing
  // different clothes.
  has(cd, "me-holds--wait",
    "the loading sentence carries no class of its own, so nothing can tell it apart from a name");
  has(DESK_CSS, ".me-holds--wait",
    "me-desk.css has no rule for the loading sentence the desk now paints");

  // ── AND THE WAIT ENDS. The roster arrives, the desk repaints, the names land.
  // A desk that painted the cold sentence and never asked again is the second
  // half of the reported bug: the reader keeps "still loading" for the visit.
  Object.keys(UT_ROSTER).forEach((pid) => { cold.PROFILES[pid] = UT_ROSTER[pid]; });
  eq(cold.pdxRosterWarm(), true, "the roster arriving did not warm the resolver");
  cold.PDXMeDesk.render();
  const warm = regionOf(cold, "me-ballot");
  has(warm, "John Curtis", "the roster arrived and the repaint still does not name the senator");
  has(warm, "Spencer Cox", "the roster arrived and the repaint still does not name the governor");
  ok(String(warm).indexOf(cold.PDXMeDesk.HOLD_WAIT) < 0,
    "the desk still says it is loading seats after the roster landed");
  // THE SUBSCRIPTION, IN THE SOURCE. The repaint above was driven by hand; what
  // ships has to be driven by the resolver's own announcement of the arrival,
  // because a desk that only repaints on a gesture leaves the first paint
  // standing for the whole visit.
  has(DESK_CODE, "pdxRosterReady",
    "the desk does not subscribe to the roster arriving, so its first cold paint would stand for the visit");
  has(jsBare(VHL_JS), "window.pdxRosterReady",
    "the resolver no longer publishes the roster arrival the desk subscribes to");

  // ── THE DISTRICT ROWS SAY WHICH THING IS MISSING ──────────────────────────
  // "not on file" next to a U.S. House district that DID resolve reads as "we
  // lost your district". We never drew it. Three different facts, three
  // different sentences, and none of them may be the sentence a seat with
  // nobody in it prints.
  const dRows = {};
  live.PDXMeDesk.districts().forEach((d) => { dRows[d.label] = d; });
  eq(dRows["U.S. House"].value, "District 2",
    "the U.S. House district the reader's own saved location carries is not printed");
  const ss = dRows["State Senate"];
  ok(!!ss, "the district list dropped the State Senate row");
  const NOMAP = live.PDXMeDesk.DIST_NOMAP;
  ok(ss.value ? /^District \d+$/.test(ss.value) : ss.why === NOMAP,
    `the State Senate row reads "${ss.value || ss.why}" — it must be a district number the resolver ` +
    "gave or the sentence that says we have no map for it");
  ok(!ss.value, "the Davis County fixture resolved a state senate district — no map in this pass draws one");
  eq(dRows["State House"].why, NOMAP, "the State House row does not say why it is blank");
  ok(NOMAP !== live.PDXMeDesk.DIST_NONE,
    "a district we never drew and a record field the reader never filled print the same sentence");
  ok(NOMAP !== live.PDXMeDesk.HOLD_NONE,
    "a district with no map and a seat with no person print the same sentence, so the reader cannot tell " +
    "which of the two is missing");
  ok(/map/i.test(NOMAP), `the state-legislative blank ("${NOMAP}") does not name the missing map`);
  const la = regionOf(live, "me-identity");
  has(la, ">" + NOMAP + "</dd>", "the map-missing sentence is not painted on the row that needs it");
  // AND NOTHING WAS INVENTED. No shapefile shipped in this pass, so no state
  // legislative number may appear for this county.
  ok(!/District\s*(22|15)\b/.test(la),
    "region a printed a state legislative district for a county no map in this pass covers");

  // ── ONE OWNER, STILL ────────────────────────────────────────────────────────
  // The desk asks pdxSeatHolders. It does not read the roster to find a person
  // for a seat, and it holds no second index of officeholders.
  const VHL_CODE = jsBare(VHL_JS);
  has(DESK_CODE, "pdxSeatHolders", "the desk no longer asks the one owner who holds a seat");
  ok(!/CMP_DATA\s*\[[^\]]*\]\s*\.\s*office/.test(DESK_CODE),
    "the desk reads office strings off the roster, which is the resolver's walk written a second time");
  ["_pdxStatewideSeats", "U.S. Senator", "Governor'", "isUsSenator"].forEach((n) => {
    lacks(DESK_CODE, n, "the desk classifies offices itself instead of asking the resolver");
  });
  // AND THE RESOLVER HAS ONE ANSWER TO "WHICH INDEX IS THE ROSTER". A file that
  // goes back to naming one global in six places is the bug returning.
  has(VHL_CODE, "_pdxRosterTable",
    "the resolver no longer has one owner of which people index this document carries");
  const rawCmp = (VHL_CODE.match(/window\.CMP_DATA/g) || []).length;
  ok(rawCmp <= 2,
    `voter-hub-location.js names window.CMP_DATA directly ${rawCmp} times — the roster reads go through ` +
    "_pdxRosterTable/_pdxRosterRec so a document without the bundle is not a document without a roster");
  has(VHL_CODE, "window.PROFILES",
    "the resolver cannot see the only roster /me has, which is the reported failure");
  has(VHL_CODE, "rosterCold",
    "pdxSeatHolders no longer publishes whether the roster has arrived, so every surface has to guess");
}

/* ── report ─────────────────────────────────────────────────────────────── */
if (failures.length) {
  console.error(`\n✗ me-snapshot: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  · " + f);
  console.error("");
  process.exit(1);
}
console.log(`\n✓ me-snapshot: region b is a snapshot of what this reader said — ${passed} assertions passed\n`);
