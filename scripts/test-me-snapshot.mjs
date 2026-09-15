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
// before anything else on the page.
//
// WHAT IT IS NOW. A snapshot: the keys this reader has actually set, as chips
// carrying the side they chose, six on the face, and "N more" behind one door.
// At zero it is three starter chips and one sentence. The eight-row editor is
// NOT gone and NOT duplicated — "Set all issues →" mounts your-file.js's own
// editor into the host it always used, on the gesture.
//
// THE FAILURE MODES THIS EXISTS TO CATCH, every one of which ships quietly:
//
//   1. THE OCTET COMES BACK. Eight rows, or four side controls per row, painted
//      before any gesture. The tell is the editor's own markup in the first
//      paint of region b, and the count of side labels in it.
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
//   6. THE DOOR DUPLICATES THE EDITOR. A second eight-issue setter written into
//      me-desk.js is a second owner of the reader's positions, and the day one
//      of them changes, one of them is wrong.
//   7. THE CHIPS ARE UNTHEMED, OR THEMED FROM A SECOND TABLE. The issue colour
//      belongs to PDXIssueColors; a chip painting its own palette would drift
//      from every bill letterhead in the product the first time a hex changes.
//   8. A SCORE ARRIVES. A match, a completeness figure, a grade on the voter.
//   9. WORK SEAT STOPS BEING A DOOR. A control that restyles the row instead of
//      opening that seat in the ballot workspace.
//  10. THE SERVICE WORKER PAIRS HALVES. me.html gained a script and me-desk.css
//      lost the octet's rules; a warm device holding one and not the other
//      paints an unstyled form.
//
// Five sections:
//   1. ZERO POSITIONS — no form, a starter set, one door.
//   2. TWO POSITIONS — those two and nothing else, with their own sides.
//   3. THE CAP — six on the face and the leftover counted.
//   4. COLOUR — a themed chip's hex is the register's hex for that key.
//   5. THE DOOR, THE SEAT AND THE BUMP.
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
const MAP_JS = R("issue-map.js");
const IC_JS = R("issue-colors.js");
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
  win.pdxRepsForMe = () => ({
    located: !!o.loc, state: (o.loc && o.loc.state) || "", county: "", levels: [],
  });
  win.PROFILES = {};
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: "issue-map.js" });
    vm.runInContext(IC_JS, ctx, { filename: "issue-colors.js" });
    if (!o.withoutEditor) vm.runInContext(YF_JS, ctx, { filename: "your-file.js" });
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
section("1 · zero positions: no form, a starter set, one door");
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
eq(KEYS.length, 8, "the locked list is no longer eight — this suite's cap arithmetic is written against it");
const z = regionOf(zero, "me-positions");
must(z.length > 120, "region b did not paint for a reader with nothing on file");

eq(zero.PDXMeDesk.positions().length, 0, "a reader with an empty file has positions on the desk");
eq(chipsIn(z).filter((c) => !/me-pchip--start/.test(c)).length, 0,
  "a reader who has answered nothing is shown answer chips");

// THE OCTET IS NOT HERE. Two independent tells, because either one alone can be
// satisfied by markup that is still a form: the editor's own row class, and the
// number of side words on the face. Four sides × eight rows is the shape that
// was wrong; three starter chips carry no side at all.
lacks(z, "pdxyf-row", "region b paints the editor's own eight rows before any gesture");
lacks(z, 'data-pdxyf-pos', "region b paints the editor's side controls before any gesture");
const sideWords = Object.keys(POSITIONS).map((k) => POSITIONS[k].label);
const sidesOnFace = sideWords.reduce(
  (n, w) => n + (String(z).match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 0);
ok(sidesOnFace === 0,
  `region b prints ${sidesOnFace} side words for a reader with nothing on file — an empty desk offers no sides to choose`);
// THE STARTERS ARE THE EDITOR'S OWN VOCABULARY. Three chips, every one of them
// a key the locked list already holds — a starter from anywhere else would be
// inviting the reader to answer a question this module cannot save.
const starters = zero.PDXMeDesk.starters();
ok(starters.length >= 2 && starters.length <= 3,
  `the zero state offers ${starters.length} starters — the brief asked for two or three`);
starters.forEach((k) => {
  ok(KEYS.indexOf(k) >= 0, `the starter "${k}" is not one of the eight keys the editor can save`);
});
eq(chipsIn(z).filter((c) => /me-pchip--start/.test(c)).length, starters.length,
  "the starter chips painted do not match the starter set");
has(z, "Set the rest in", "the zero state does not say where the other issues are set");
has(z, 'href="/#my-stances"', "the zero state's one link is not the existing stance surface");
// NOT A SCOLD AND NOT A SCORE.
lacks(z, "%", "the zero state prints a percentage");
lacks(z, "incomplete", "the zero state tells the reader they are incomplete");
lacks(z, "of 8", "the zero state prints a denominator over answers nobody gave");

// ONE DOOR, AND IT IS THE ONLY WAY THE EDITOR ARRIVES.
has(z, "data-me-setall", "the zero state has no door to the editor");
has(z, "Set all issues", "the door does not say where it goes");
eq((String(z).match(/data-me-setall/g) || []).length, 1,
  "region b carries more than one door to the same editor");
has(z, 'id="me-yf-host"', "the editor's host is not declared — the door would have nowhere to mount");
const zHost = zero.document.getElementById("me-yf-host");
must(!!zHost, "the editor's host is not findable by id — the door would have nowhere to mount");
eq(String(zHost.innerHTML), "",
  "the editor mounted itself without a gesture, which is the form again");
eq(zHost.children.length, 0, "the editor's host already holds nodes before any gesture");

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

// AND NOT ONE OF THE SIX THEY DID NOT ANSWER.
KEYS.filter((k) => !TWO[k]).forEach((k) => {
  const lab = esc(two.PDXMeDesk.issueLabel(k));
  ok(painted.indexOf(lab) < 0,
    `"${lab}" is on the face although this reader never answered it — a snapshot of the vocabulary is the form`);
});
// The denominator is a list length over a list length, and both are read.
has(t, "2 of 8 on file", "region b does not state the snapshot's own denominator");
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
// And eight answers is a full face with two behind the door.
const eight = {};
KEYS.forEach((k) => { eight[k] = "mixed"; });
const w8 = bootDesk({ uid: "u_eight", answers: eight });
const s8 = regionOf(w8, "me-positions");
eq(chipsIn(s8).length, CAP, "a reader who answered everything is shown more than the face holds");
has(s8, "2 more", "a full file does not count the two answers behind the door");
has(s8, "8 of 8 on file", "a full file does not state its own denominator");

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
ok(themed >= 1, "not one of the eight keys resolves to a colour — the chips would all be steel");

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
// THE DOOR OPENS THE OWNER'S EDITOR, AND THERE IS NO SECOND SETTER. me-desk.js
// may not contain an eight-issue setter of its own: the marker is that the only
// thing openSetter() does about the editor is hand it a host.
has(DESK_CODE, "PDXYourFile", "the desk does not reference the module that owns the positions");
has(DESK_CODE, "inline(", "the door does not mount the owner's own editor");
lacks(DESK_CODE, "data-pdxyf-pos",
  "me-desk.js writes the editor's side controls itself, which is a second owner of the reader's answers");
ok(typeof zero.PDXMeDesk.openSetter === "function", "the desk exports no door to the editor");
ok(zero.PDXMeDesk.isSetterOpen() === false, "the editor reports itself open before any gesture");
{
  // The gesture, through the desk's own door rather than a synthesised click.
  const opened = zero.PDXMeDesk.openSetter();
  ok(opened === true, "the door did not mount the editor when it was asked to");
  ok(zero.PDXMeDesk.isSetterOpen() === true, "the editor is not open after the door was used");
  // THE OWNER'S OWN TWO NODES, by the ids your-file.js declares. That is the
  // marker that the editor which arrived is the module's and not a copy: these
  // ids exist in your-file.js and nowhere in me-desk.js.
  const host = zero.document.getElementById("me-yf-host");
  ok(!!host && host.children.length === 2,
    `the editor's host holds ${host ? host.children.length : "no"} nodes after the door was used, not the owner's two`);
  ok(!!zero.document.getElementById("pdx-your-file-head"),
    "the editor's head did not mount, so the copy line the reader answers under is not on screen");
  const yfBody = zero.document.getElementById("pdx-your-file-scroll");
  ok(!!yfBody && String(yfBody.innerHTML).length > 200,
    "the editor's eight rows did not paint into the host the door handed it");
  // AND NOW the octet is legitimately on the page — asked for, in the owner's
  // markup, in the owner's host. That is the whole difference this pass made.
  has(String(yfBody.innerHTML), "pdxyf-row",
    "the editor mounted without its own rows, so the door opened onto nothing");
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

// THE BUMP. me.html is precached and gained a script; me-desk.css lost the
// octet's rules. A warm device holding one half and not the other paints a form
// with no styles for it, so the shell cache has to be renamed.
const ver = (/const CACHE_VERSION = '([^']+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(ver), `CACHE_VERSION is not a version literal (${ver})`);
ok(Number(ver.slice(1)) >= 204,
  `CACHE_VERSION is ${ver}; this pass changed precached me.html, me-desk.js, me-desk.css, ` +
  "judicial-ballot.js, judicial-retention.css and index.html, so it has to be at least v204");
const shellList = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(shellList.length > 500, "the SHELL_ASSETS probe matched nothing in sw.js");
["/me.html", "/me-desk.js", "/me-desk.css", "/issue-colors.js", "/issue-map.js"].forEach((a) => {
  has(shellList, `'${a}'`, `${a} is not precached, so the desk would boot half-cold`);
});
// /your-file.js IS DELIBERATELY NOT ON THAT LIST, and this pass did not change
// that. It is runtime-cached, pinned out of the precache by
// test-mobile-body-lock.mjs and test-your-file.mjs, and the desk is written for
// its absence: mountPositions() says the editor is still loading rather than
// painting eight rows the desk would then own. Adding it here would be a
// different decision than the one those two suites recorded.
ok(!new RegExp("'/your-file\\.js'").test(shellList),
  "/your-file.js was added to the precache — two other suites pin it out, and the desk's " +
  "'still loading' branch exists because it is not there");
// The log names the bump, so a reader of sw.js can tell WHY the cache moved.
has(SW, `// ${ver} -`, `the cache log has no entry for ${ver}`);

/* ── report ─────────────────────────────────────────────────────────────── */
if (failures.length) {
  console.error(`\n✗ me-snapshot: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  · " + f);
  console.error("");
  process.exit(1);
}
console.log(`\n✓ me-snapshot: region b is a snapshot of what this reader said — ${passed} assertions passed\n`);
