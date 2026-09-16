#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the DISTRICT VOICE SLOT ON /me — region g, and only region g
// ─────────────────────────────────────────────────────────────────────────────
// District Voice is the residency-gated district board, and it is the PUBLIC
// lane: reading is open to everybody, posting is for verified residents, and
// the board lives at its own address. Before this pass a reader's standing with
// it was discoverable only by arriving at a seat file and reading the composer's
// closed note — which is to say, only by being told "no" somewhere else.
//
// So /me gets ONE region. It is a standing line and one control, and the whole
// risk of it is that it grows into the board. The failure modes, every one of
// which ships silently:
//
//   1. A STATE GOES MISSING. Three standings, three sentences. A signed-out
//      reader shown the unverified copy is told they failed a check nobody ran;
//      an unverified reader shown the verified copy is told they have a board
//      they cannot enter.
//   2. THE BADGE LEAKS DOWN. A badge on the unverified standing — even greyed —
//      says "verified" to a reader who is not, which is the one claim this slot
//      exists to make carefully.
//   3. THE SLOT BECOMES THE BOARD. A thread list, a take, a poll, a count, a
//      composer or a feed of bills on /me is the board with none of its gates.
//   4. A SCORE ARRIVES. A percentage, a participation figure, "you have not
//      posted in a while". The desk grades no voter, and this region holds no
//      number at all.
//   5. THE LANES MERGE. The board is public; the eight answers above it are
//      private. A wire between them — Direction Match, Your Match, the formal
//      pattern, the ballot order, a merge of pdx_your_file and pdx_my_stances —
//      is the one thing neither lane survives.
//   6. PARTY REACHES IT. A letter, a colour, a caucus, a gate.
//   7. A FAKE ADDRESS. An anchor reading "Open District Voice" pointing at a
//      seat where Voice has not opened is a promise the app cannot keep.
//   8. A SECOND ALLOW-LIST. me-desk.js composing its own seat key, or carrying
//      its own copy of which seats have a board, is a second answer — and the
//      day a seat opens, one of the two is wrong.
//   9. A NAME IS INVENTED. "Verified for …" filled from a county table, a
//      geometry claim or a label corpus rather than from the fields this reader
//      already saved.
//  10. THE SERVICE WORKER PAIRS HALVES. A warm device with a cached me.html
//      that does not load district-voice.js against a new me-desk.js that asks
//      for it renders the region permanently unverified.
//
// This harness gates all ten, in six sections:
//
//   1. THE OWNER — district-voice.js answers all four questions, and its state
//      list and seat-key prefix are the gate's.
//   2. THE CRITICAL PATH — /me loads the owner before the desk, and not the
//      board's stylesheet.
//   3. THE THREE STANDINGS, BOOTED — each one painted from real stores.
//   4. THE DENYLIST — what the slot may never contain.
//   5. THE SLOT IS NOT THE BOARD — no embed, no network, no merged store.
//   6. THE SERVICE WORKER.
//
//   node scripts/test-me-district-voice.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  VOICE_STATES,
  VOICE_SEATS,
  stateAllowed,
  seatFromLocation,
  COPY as CORE_COPY,
} from "../netlify/lib/district-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const ME = R("me.html");
const DESK_JS = R("me-desk.js");
const DESK_CSS = R("me-desk.css");
const VOICE_JS = R("district-voice.js");
const SW = R("sw.js");

// Comments can neither satisfy nor violate a contract. me-desk.js's own block
// over regionVoice() names the seven things the region must not do, and a
// denylist over the raw file would read that list as a violation of itself.
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, " ");
const jsBare = (s) =>
  String(s).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
const ME_BARE = htmlBare(ME);
const DESK_CODE = jsBare(DESK_JS);
const CSS_CODE = String(DESK_CSS).replace(/\/\*[\s\S]*?\*\//g, " ");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

const HD68 = "ut-statehouse-68";

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE OWNER
// ═════════════════════════════════════════════════════════════════════════════
section("1 · district-voice.js is the one owner, and it agrees with the gate");

// A second copy of a list is a second answer. The client cannot import the core
// (it loads as a plain script), so the suite is where the two are held to one.
const CLIENT_STATES = /var VOICE_STATES = (\[[^\]]*\]);/.exec(VOICE_JS);
ok(!!CLIENT_STATES, "district-voice.js declares the states this lane accepts");
if (CLIENT_STATES) {
  eq(CLIENT_STATES[1].replace(/'/g, '"').replace(/\s+/g, ""),
    JSON.stringify(VOICE_STATES).replace(/\s+/g, ""),
    "the client's state list is the gate's");
}
// The gate composes `ut-statehouse-${n}`. The client composes SEAT_STATE +
// '-statehouse-' + n, and SEAT_STATE must be that same prefix — otherwise a
// claim the server honours names a seat the client never points at.
const CLIENT_PREFIX = /var SEAT_STATE = '([a-z]{2})';/.exec(VOICE_JS);
ok(!!CLIENT_PREFIX, "district-voice.js declares the prefix a claimed seat key composes with");
const CORE_SEAT = seatFromLocation({ state: "Utah", county: "Daggett County", houseDistrict: "68" });
eq(CORE_SEAT, HD68, "the gate resolves Daggett / 68 to HD-68");
if (CLIENT_PREFIX) {
  eq(`${CLIENT_PREFIX[1]}-statehouse-68`, CORE_SEAT,
    "the client composes the seat key the gate composes");
}
// And the four questions region g asks are all answered HERE.
for (const name of ["seatForMe", "stateAllowed", "shipped", "path", "claim"])
  has(VOICE_JS, `    ${name}: ${name},`, `PDXVoice publishes ${name}() for a surface to ask`);
// The gate's own state rule, spelled the same way: the saved location stores
// either the postal code or the state's name, and both are the same state.
eq(stateAllowed("Utah"), true, "the gate accepts the state's name");
eq(stateAllowed("UT"), true, "the gate accepts the postal code");
eq(stateAllowed("Ohio"), false, "and nothing else");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE CRITICAL PATH
// ═════════════════════════════════════════════════════════════════════════════
section("2 · /me loads the owner before the desk, and not the board's sheet");

const voiceAt = ME_BARE.indexOf('src="/district-voice.js"');
const deskAt = ME_BARE.indexOf('src="/me-desk.js"');
ok(voiceAt >= 0, "me.html loads /district-voice.js");
ok(deskAt >= 0, "me.html loads /me-desk.js");
ok(voiceAt >= 0 && deskAt >= 0 && voiceAt < deskAt,
  "the owner is deferred BEFORE the desk, so PDXVoice exists at the desk's first paint");
// THE BOARD'S OWN SHAPES STAY ON THE BOARD. district-voice.css carries the poll
// cards, the take rows and the composer; none of that has any business on a desk
// whose region is a sentence and a control.
lacks(ME_BARE, "district-voice.css",
  "me.html does not load the board's stylesheet — region g is a sentence, not a board");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE THREE STANDINGS, BOOTED
// ═════════════════════════════════════════════════════════════════════════════
section("3 · three standings, three sentences, painted from real stores");

function makeDoc() {
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", innerHTML: "", textContent: "", hidden: false,
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

// THE REAL MODULE, NOT A STUB. district-voice.js is evaluated in the same
// context as the desk, in the same order me.html loads them, so every answer
// region g renders is the owner's real answer over the owner's real allow-list.
// A stubbed PDXVoice would let the desk pass this suite while disagreeing with
// the module it ships beside.
function bootDesk(opts) {
  const o = opts || {};
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, Promise, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.__PDX_ME_DOC = true;
  const mount = win.document.__node("main");
  mount.id = "me-desk";
  win.document.body.appendChild(mount);
  win.location = { href: "https://www.politidex.fyi/me", pathname: "/me", search: "", hash: "", origin: "https://www.politidex.fyi", replace() {}, assign() {} };
  win.history = { pushState() {}, replaceState() {} };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.auth = {
    currentUser: o.uid
      ? { uid: o.uid, isAnonymous: false, email: "voter@example.org", displayName: null }
      : null,
    onAuthStateChanged() {},
  };
  win.TEAM_POSITIONS = [];
  // THE SAVED BALLOT LOCATION, AND NOTHING ELSE. ballot-breakdown.js is not on
  // /me, so pdxRepsForMe() publishes no county and no State House district
  // there and claim() falls through to this store — which is exactly the field
  // the region's name is allowed to come from.
  win._currentVoterLocation = o.loc || { state: "", city: "", county: "", district: "" };
  win._hasUserLocation = !!(o.loc && o.loc.state);
  win.pdxRepsForMe = () => ({ located: !!o.loc, state: (o.loc && o.loc.state) || "", county: "", levels: [] });
  win.PROFILES = {};
  win.ISSUE_MAP = {};
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(VOICE_JS, ctx, { filename: "district-voice.js" });
    vm.runInContext(DESK_JS, ctx, { filename: "me-desk.js" });
  } catch (e) { win.__err = e; }
  win.__mount = mount;
  return win;
}

const SLOT_RE = /<section class="me-region" id="me-voice"[\s\S]*?<\/section>/;
function slotOf(win) {
  const m = SLOT_RE.exec(String(win.__mount.innerHTML));
  return m ? m[0] : "";
}

// Every standing's slot is collected here, so the denylist in section 4 runs
// over all three paints rather than over whichever one was convenient.
const slots = {};

// ── STANDING 1 · NOT SIGNED IN ───────────────────────────────────────────────
{
  const w = bootDesk({ uid: null });
  ok(!w.__err, `signed out: the desk boots beside the owner (${w.__err ? w.__err.message : "ok"})`);
  ok(!!w.PDXVoice, "signed out: the owner published itself");
  const slot = slotOf(w);
  slots.out = slot;
  ok(!!slot, "signed out: region g is painted");
  eq(w.PDXMeDesk.voice().standing, "out", "signed out: the standing is 'out'");
  has(slot, "District Voice is for verified residents.",
    "signed out: the region says who the board is for");
  // THE DOCUMENT'S EXISTING AUTH, through the seam region a already uses. A
  // second sign-in path on one document is a second thing to keep working.
  has(slot, "data-me-signin", "signed out: the control is the desk's existing sign-in seam");
  has(DESK_CODE, "data-me-signin", "and the desk still wires that seam");
  lacks(slot, "Not verified for a district yet.",
    "signed out: a reader with no account is not told they failed a check nobody ran");
  lacks(slot, "Verified for", "signed out: nothing is claimed about a district");
  lacks(slot, "me-voicetag", "signed out: the badge is off");
  lacks(slot, "Open District Voice", "signed out: no board is offered");
}

// ── STANDING 2 · SIGNED IN, NOT VERIFIED ─────────────────────────────────────
{
  const w = bootDesk({ uid: "u_1" });
  ok(!w.__err, "unverified: the desk boots");
  const slot = slotOf(w);
  slots.unverified = slot;
  eq(w.PDXMeDesk.voice().standing, "unverified", "unverified: the standing is 'unverified'");
  has(slot, "Not verified for a district yet.", "unverified: the region says what is missing");
  lacks(slot, "me-voicetag", "unverified: the badge is off");
  lacks(slot, "Open District Voice",
    "unverified: no board is offered — the copy must not imply they already have one");
  lacks(slot, "Verified for", "unverified: no district is named");
  // THE VERIFY CONTROL IS A LINK. A trip to another address, so the reader can
  // see where it goes, open it in a tab and copy it.
  const cta = /<a class="me-voicecta" href="([^"]+)">([^<]+)<\/a>/.exec(slot);
  ok(!!cta, "unverified: the verify control is an anchor with an href");
  if (cta) {
    ok(cta[1].startsWith("/"), `unverified: the verify jump is a real root-absolute address (${cta[1]})`);
    ok(/verify/i.test(cta[2]), `unverified: and it reads as the verify jump ("${cta[2]}")`);
  }
  lacks(slot, "<button", "unverified: the verify control is a link, not a button");
}

// ── STANDING 2b · A LOCATION THIS LANE CANNOT ACCEPT ─────────────────────────
// Signed in, with a saved location — and still unverified, because the lane
// resolves districts in Utah and nowhere else. Fail closed, and say so in the
// same sentence rather than inventing a district for somebody.
{
  const w = bootDesk({
    uid: "u_2",
    loc: { state: "Ohio", city: "Columbus", county: "Franklin County", stateHouseDistrict: "68" },
  });
  eq(w.PDXMeDesk.voice().standing, "unverified",
    "out-of-scope: a state this lane does not map is not verified, even with a district number saved");
  eq(w.PDXVoice.seatForMe(), "", "out-of-scope: the owner names no seat for it");
  lacks(slotOf(w), "Verified for", "out-of-scope: no district is named");
}

// ── STANDING 2c · A DISTRICT WE DO NOT HOLD ──────────────────────────────────
// The name comes from the fields already stored, or the slot stays unverified.
// This is the same reader with the county and without the district number.
{
  const w = bootDesk({ uid: "u_3", loc: { state: "Utah", city: "Manila", county: "Daggett County" } });
  eq(w.PDXMeDesk.voice().standing, "unverified",
    "no district saved: the slot stays unverified rather than naming the county alone");
  lacks(slotOf(w), "Verified for", "no district saved: nothing is claimed");
}

// ── STANDING 3 · VERIFIED, BOARD OPEN ───────────────────────────────────────
{
  const w = bootDesk({
    uid: "u_4",
    loc: { state: "Utah", city: "Manila", county: "Daggett County", stateHouseDistrict: "68" },
  });
  ok(!w.__err, "verified: the desk boots");
  const v = w.PDXMeDesk.voice();
  const slot = slotOf(w);
  slots.verified = slot;
  eq(v.standing, "verified", "verified: the standing is 'verified'");
  // THE SEAT IS THE OWNER'S ANSWER, and it is the seat the GATE resolves for the
  // same saved location. Two derivations, one seat.
  eq(w.PDXVoice.seatForMe(), CORE_SEAT, "verified: the client and the gate name the same seat");
  // THE NAME IS THE TWO STORED FIELDS AND NOTHING ELSE. No county table, no
  // geometry, no label corpus — both halves are in the saved location above.
  has(slot, "Verified for", "verified: the region names the district");
  has(slot, "68", "verified: the district number is the one this reader saved");
  has(slot, "Daggett County", "verified: the county is the one this reader saved");
  has(slot, "me-voicetag", "verified: the badge is on");
  has(slot, "Verified resident", "verified: and it says what it certifies");
  // THE GATE IS STILL THE OWNER'S ANSWER, AND THE DESTINATION IS THE ROOM.
  // PDXVoice.path(seat) is what decides whether this CTA appears at all — '' is
  // "no board here" — and that has not changed. Where it POINTS has: /d/<seat>
  // is a rewrite to index.html, so the desk's Voice button was a 1.9 MB trip to
  // read one board. /voice is 28 KB and resolves this same seat through this
  // same module. Same gate, same seat, one twentieth of the bytes.
  eq(w.PDXVoice.path(HD68), "/d/" + HD68, "verified: the owner holds the board's address");
  has(slot, 'href="/voice"', "verified: the CTA is the District Voice room");
  has(slot, "Open District Voice", "verified: and it says so");
  lacks(slot, "board not live yet", "verified: the board IS live in this seat, so that sentence is absent");
}

// ── STANDING 3b · VERIFIED, BOARD NOT OPEN IN THIS SEAT ─────────────────────
// HD-67 is mapped, real, and has no Voice yet. That is true, and it is the
// answer — an anchor reading "Open District Voice" pointing there would be a
// promise the app cannot keep, so the sentence is unlinked.
{
  const w = bootDesk({
    uid: "u_5",
    loc: { state: "Utah", city: "Roosevelt", county: "Duchesne County", stateHouseDistrict: "67" },
  });
  const v = w.PDXMeDesk.voice();
  const slot = slotOf(w);
  slots.dark = slot;
  eq(v.standing, "verified", "no board yet: the reader is still verified for their district");
  eq(w.PDXVoice.shipped("ut-statehouse-67"), false, "no board yet: Voice has not opened in HD-67");
  eq(v.href, "", "no board yet: the owner offers no address");
  has(slot, "Verified for", "no board yet: the district is still named");
  has(slot, "board not live yet", "no board yet: the region says exactly that");
  lacks(slot, "Open District Voice", "no board yet: nothing offers to open a board");
  lacks(slot, "me-voicecta", "no board yet: there is no control at all — a sentence cannot be pressed");
  // AND NO FAKE THREAD LIST in its place.
  ok(!/<ul|<li/.test(slot), "no board yet: no list is painted where the board would be");
}

// ── THE OWNER MISSING ENTIRELY ──────────────────────────────────────────────
// A device that took me.html and not district-voice.js — a stale cache, a failed
// request, a blocked script. The weakest standing is the default, so the region
// understates rather than invents. The reader and the store are the verified
// reader from the section above; only the owner is gone.
{
  const o = { state: "Utah", city: "Manila", county: "Daggett County", stateHouseDistrict: "68" };
  const win = { console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error, Promise,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; } };
  win.window = win; win.self = win; win.document = makeDoc(); win.__PDX_ME_DOC = true;
  const mount = win.document.__node("main"); mount.id = "me-desk"; win.document.body.appendChild(mount);
  win.location = { href: "https://www.politidex.fyi/me", pathname: "/me", search: "", hash: "", origin: "https://www.politidex.fyi", replace() {}, assign() {} };
  win.history = { pushState() {}, replaceState() {} };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.addEventListener = () => {}; win.removeEventListener = () => {}; win.dispatchEvent = () => true;
  win.auth = { currentUser: { uid: "u_7", isAnonymous: false, email: "v@example.org", displayName: null }, onAuthStateChanged() {} };
  win.TEAM_POSITIONS = [];
  win._currentVoterLocation = o;
  win._hasUserLocation = true;
  win.pdxRepsForMe = () => ({ located: true, state: "Utah", county: "", levels: [] });
  win.PROFILES = {}; win.ISSUE_MAP = {};
  let err = null;
  try { vm.runInContext(DESK_JS, vm.createContext(win), { filename: "me-desk.js" }); } catch (e) { err = e; }
  ok(!err, `owner absent: the desk still boots (${err ? err.message : "ok"})`);
  const slot = SLOT_RE.exec(String(mount.innerHTML));
  ok(!!slot, "owner absent: region g is still painted");
  if (slot) {
    has(slot[0], "Not verified for a district yet.",
      "owner absent: the region understates rather than inventing a board");
    lacks(slot[0], "Verified for", "owner absent: no district is named without the module that owns seats");
  }
  eq(win.PDXMeDesk.voice().standing, "unverified", "owner absent: the standing falls to the weakest one");
}

// THE FRAME SENTENCE IS BORROWED, NEVER WRITTEN HERE. One owner for what the
// board IS, so /me and the board cannot describe it differently.
lacks(DESK_CODE, "Not a poll of the internet",
  "me-desk.js does not copy the board's frame sentence — it reads PDXVoice.COPY.frame");
has(DESK_CODE, "V.COPY.frame", "me-desk.js borrows the frame from its owner");
const bodies = {};
const texts = {};
for (const key of Object.keys(slots)) {
  has(slots[key], CORE_COPY.frame, `${key}: the frame sentence is the gate's own, verbatim`);
  // THE FRAME IS QUOTED, SO IT IS NOT SCANNED. It is the owner's description of
  // what the board is — "Verified neighbors. Not a poll of the internet." — so
  // the board's own vocabulary belongs inside it and nowhere else in the region.
  // Every word ban below therefore runs over what /me itself wrote: strip the
  // borrowed sentence and scan the remainder, which is the region's own copy.
  bodies[key] = slots[key].split(CORE_COPY.frame).join(" ");
  // And the sentences a reader actually sees, for the one check that has to
  // count digits: `<h2>` and `margin:0.7rem` are markup, not figures.
  texts[key] = bodies[key].replace(/<[^>]*>/g, " ");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE DENYLIST — WHAT THE SLOT MAY NEVER CONTAIN
// ═════════════════════════════════════════════════════════════════════════════
section("4 · no score, no party, no match, in any standing");

// A PERCENTAGE IS THE WHOLE BAN. Not in the paint, and not composable in the
// renderer either — see test-me-document.mjs, which holds the same line for the
// document as a whole.
for (const [name, body] of Object.entries(bodies)) {
  // A PERCENT SIGN IS THE WHOLE BAN, and it is banned in the quoted frame too.
  lacks(slots[name], "%", `${name}: the slot carries no percent sign`);
  // THE ONLY NUMBER IN THIS REGION IS THE READER'S OWN DISTRICT. Anything else
  // is a count, a rate or a rank that arrived without a name.
  const digits = texts[name].replace(/District \d+/g, "");
  ok(!/[0-9]/.test(digits),
    `${name}: the only number a reader sees is their district — found "${digits.replace(/[^0-9]+/g, " ").trim()}"`);
  // PARTY CANNOT REACH IT.
  for (const word of ["party", "Republican", "Democrat", "caucus", "GOP"])
    ok(!new RegExp(word, "i").test(slots[name]), `${name}: no "${word}" in the slot`);
  // THE TWO LANES STAY TWO LANES.
  for (const word of ["Direction Match", "Your Match", "match", "formal pattern",
    "Word vs Action", "alignment"])
    ok(!new RegExp(word, "i").test(slots[name]),
      `${name}: no "${word}" in the slot — the board is the public lane`);
  // NO PARTICIPATION SCORE, and nothing that could hold one.
  for (const word of ["streak", "posts", "active", "activity", "contribut", "rank", "level"])
    ok(!new RegExp(word, "i").test(body), `${name}: no "${word}" — a voter is not a participation rate`);
}
// AND NO CLASS FOR ONE TO ARRIVE IN, on either of the desk's own files.
for (const [name, code] of [["me-desk.js", DESK_CODE], ["me-desk.css", CSS_CODE]]) {
  for (const cls of ["me-voicemeter", "me-voicescore", "me-voicebar", "me-voicepct", "me-voicecount"])
    lacks(code, cls, `${name}: there is no .${cls} for a figure to arrive in`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE SLOT IS NOT THE BOARD
// ═════════════════════════════════════════════════════════════════════════════
section("5 · no embed, no network, no merged store");

// THE BOARD'S OWN MACHINERY, by the attribute and class names district-voice.js
// actually paints. If any of these ever appear on the desk, the board has been
// embedded — with none of its gates.
for (const [name, body] of Object.entries(bodies)) {
  for (const mark of ["pdxv-", "data-pdxv-answer", "data-pdxv-send", "pdxv-body", "pdxv-optcount"])
    lacks(slots[name], mark, `${name}: the board's own markup (${mark}) is not on the desk`);
  for (const word of ["take", "thread", "poll", "composer", "neighbor", "answers so far", "bill"])
    ok(!new RegExp(word, "i").test(body), `${name}: no "${word}" in the region's own copy — the board holds those`);
}
// THE DESK REACHES NO NETWORK AT ALL. Same line test-me-document.mjs holds, kept
// here too because this is the pass that added a region with a server-side twin
// and therefore the obvious place for a fetch to be reached for.
for (const word of ["/api/", "fetch(", "XMLHttpRequest", "navigator.sendBeacon"])
  lacks(DESK_CODE, word, `me-desk.js does not reach the network (${word})`);
// NO FORMAL-RECORD MODULE IS READ.
for (const word of ["voting-record", "PDXVotingRecord", "PDXWordAction", "PDXConsistency", "vote_pack"])
  lacks(DESK_CODE, word, `me-desk.js reads no formal-record module (${word})`);
// THE TWO PRIVATE STORES STAY TWO. The desk holds neither key literally — region
// b and region c each read through their own module's reader.
for (const key of ["pdx_your_file", "pdx_my_stances"])
  lacks(DESK_CODE, key, `me-desk.js does not name ${key} — the owning module reads it`);
// AND THE DESK COMPOSES NO SEAT KEY OF ITS OWN.
for (const mark of ["statehouse-", "VOICE_SEATS", "ut-statehouse"])
  lacks(DESK_CODE, mark, `me-desk.js carries no seat allow-list of its own (${mark})`);
// The region is addressable and labelled like every other region.
has(DESK_CODE, 'id="me-voice"', "the region has one id");
has(DESK_CODE, 'aria-labelledby="me-voice-t"', "and it is labelled by its own heading");
// IT SITS BESIDE THE BALLOT SNAPSHOT, which is where the brief put it.
{
  const ballotAt = DESK_CODE.indexOf("regionBallot() +");
  const voiceAt = DESK_CODE.indexOf("regionVoice() +");
  const identityAt = DESK_CODE.indexOf("regionIdentity() +");
  ok(identityAt >= 0 && voiceAt > identityAt, "region g is painted after the identity region");
  ok(ballotAt >= 0 && voiceAt > ballotAt, "and beside the ballot snapshot, not instead of it");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the four changed shell assets ship together");

const V = /const CACHE_VERSION = '(v\d+)';/.exec(SW);
ok(!!V, "sw.js declares a cache version");
ok(!!V && Number(V[1].slice(1)) >= 195,
  `sw.js: CACHE_VERSION moved for the changed shell assets (at ${V ? V[1] : "?"})`);
for (const asset of ["/me.html", "/me-desk.js", "/me-desk.css", "/district-voice.js"])
  has(SW, `'${asset}'`, `sw.js precaches ${asset} — a warm device must not pair halves`);

// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("");
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log("   ✓ the District Voice slot on /me holds\n");
