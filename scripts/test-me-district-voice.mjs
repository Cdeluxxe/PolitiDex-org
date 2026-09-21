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
// So /me gets ONE region. It is a standing line, a line per seat and one
// control, and the whole risk of it is that it grows into the board. The
// failure modes, every one of which ships silently:
//
// AND IT IS A LIST NOW, BECAUSE A READER HAS MORE THAN ONE SEAT. The first cut
// of this region named a single district — "Verified for State House District
// 68" — which was the same singular mistake /voice made: a saved address sits
// in a House district AND a Senate district, and the desk could mention only
// one of them. It now lists every seat the location resolves, each with whether
// a board is on hand, and the one control opens the hub that holds them all.
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
//   7. A FAKE ADDRESS, OR A BOARD OFFERED TO THE WRONG SEAT. One board is open
//      today, in Weber SD-3. Putting it on a Davis County reader's desk because
//      it is the only board there is — or because the desk kept its own list of
//      which seats have one — hands somebody a room they cannot speak in.
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
//   3. THE THREE STANDINGS AND THE SEAT LIST, BOOTED — each one painted from
//      real stores, over the resolver's real levels.
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
section("3 · three standings, one seat list, painted from real stores");

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
  win.location = { href: "https://politidex.fyi/me", pathname: "/me", search: "", hash: "", origin: "https://politidex.fyi", replace() {}, assign() {} };
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
  // THE SEATS COME FROM THE RESOLVER, WHICH IS WHERE THEY COME FROM ON THE REAL
  // DOCUMENT. pdxRepsForMe() is voter-hub-location.js's answer for the saved
  // location: one level per chamber, with the district number it resolved. The
  // desk asks district-voice.js, district-voice.js asks this. Handing the desk a
  // seat list directly would skip the composition that actually turns a level
  // into a seat key, which is the step that decides whether a board exists.
  win.pdxRepsForMe = () => ({
    located: !!o.loc,
    state: (o.loc && o.loc.state) || "",
    county: (o.loc && o.loc.county) || "",
    levels: o.levels || [],
  });
  // voter-hub-location.js's return-intent helper. It is on /me — the real desk
  // reads the finder href out of it — and it is stubbed here rather than loaded
  // because that file is 255 KB and the only thing the desk asks of it is one
  // address. What that address actually looks like is pinned in the hub suite,
  // against the real implementation.
  if (!o.noReturn) {
    win.PDXReturn = {
      HOME: "/voice",
      finderHref: (next) => "/?next=" + encodeURIComponent(next || "/voice") + "#who-represents-me",
    };
  }
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

// THE LEVELS A SAVED LOCATION RESOLVES, in pdxRepsForMe()'s own shape. Two seats
// for one reader, which is the whole reason /voice stopped being one board: a
// Davis County address sits in a State House district AND a State Senate
// district, and before this pass the desk could only ever mention one of them.
// THE HOUSE SEAT HERE IS HD-14, AND IT USED TO BE HD-15. It is the fixture
// standing 3b uses to prove a seat with no board says so, so it has to be a
// seat that really has none — HD-15 opened /district/ut-hd-15 and stopped being
// one. HD-14 is Clearfield and Syracuse in Davis County: a member on the
// roster, a person file, and no room.
const LV_HD14 = { key: "statehouse", seat: "statehouse", label: "State House", statewide: false, district: "14", pid: "rep_davis", resolved: true };
const LV_SD3 = { key: "statesenate", seat: "statesenate", label: "State Senate", statewide: false, district: "3", pid: "john_johnson", resolved: true };
const LV_GOV = { key: "governor", seat: "governor", label: "Governor", statewide: true, district: "", distLabel: "Utah", pid: "gov_ut", resolved: true };

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

// ── STANDING 2 · SIGNED IN, NO SEATS ON FILE ─────────────────────────────────
// The copy changed with the page. It used to read "Not verified for a district
// yet" — which is two wrong things at once now: "a district" is singular, and
// "yet" promises a check that is coming. What is actually missing is a saved
// location, so that is what it says, and the control goes and gets one.
{
  const w = bootDesk({ uid: "u_1" });
  ok(!w.__err, "unverified: the desk boots");
  const slot = slotOf(w);
  slots.unverified = slot;
  eq(w.PDXMeDesk.voice().standing, "unverified", "unverified: the standing is 'unverified'");
  has(slot, "No seats on file for this account.", "unverified: the region does not say what is missing");
  lacks(slot, "me-voicetag", "unverified: the badge is off");
  lacks(slot, "Open District Voice",
    "unverified: a hub is offered — the copy must not imply seats we have not resolved");
  lacks(slot, "me-voiceseat", "unverified: a seat row was painted for an account with no location");
  lacks(slot.toLowerCase(), "yet",
    "unverified: the missing location is described with 'yet', which promises a check nobody has queued");
  // THE CONTROL IS A LINK, AND IT CARRIES THE WAY BACK. This is the jump the
  // pass exists to fix: a reader who taps it from the desk sets a location and
  // is returned to /voice, instead of being left standing on the finder holding
  // an answer nobody asked them for.
  const cta = /<a class="me-voicecta" href="([^"]+)">([^<]+)<\/a>/.exec(slot);
  ok(!!cta, "unverified: the location control is an anchor with an href");
  if (cta) {
    ok(cta[1].startsWith("/"), `unverified: the jump is a real root-absolute address (${cta[1]})`);
    ok(cta[1].indexOf("next=") >= 0, `unverified: the jump carries no return intent (${cta[1]})`);
    ok(/voice/.test(decodeURIComponent(cta[1])), `unverified: the intent it carries is not /voice (${cta[1]})`);
    ok(/location/i.test(cta[2]), `unverified: and it does not read as the location jump ("${cta[2]}")`);
  }
  lacks(slot, "<button", "unverified: the location control is a button rather than a link");
  // AND WITH NO RETURN HELPER ON THE PAGE IT IS STILL A WORKING DOOR, just
  // without the intent — a missing 255 KB file may cost the bounce-back, never
  // the ability to set a location at all.
  const bare = bootDesk({ uid: "u_1b", noReturn: true });
  const bareCta = /<a class="me-voicecta" href="([^"]+)"/.exec(slotOf(bare));
  ok(!!bareCta && bareCta[1] === "/find",
    "unverified: with no PDXReturn on the document the control loses its href instead of falling back to the finder");
}

// ── STANDING 2b · A LOCATION THAT RESOLVES NOTHING ───────────────────────────
// Signed in, with a saved location, and the resolver came back with no levels —
// an address it could not place in any district. Fail closed and say the same
// thing as an empty account: we have no seats. Do not invent one.
{
  const w = bootDesk({
    uid: "u_2",
    loc: { state: "Ohio", city: "Columbus", county: "Franklin County" },
    levels: [],
  });
  eq(w.PDXMeDesk.voice().standing, "unverified",
    "unresolved: a location the resolver placed in no district is treated as verified");
  eq(w.PDXVoice.seatsForMe().length, 0, "unresolved: the owner composed seats from a resolver that returned none");
  has(slotOf(w), "No seats on file for this account.", "unresolved: the region claims something instead");
}

// ── STANDING 2c · STATEWIDE ONLY, WHICH IS NOT A SEAT ────────────────────────
// A governor is a real level and it is not a district: there is no seat key to
// compose, so there is no board to have or lack. The desk lists what the
// resolver placed and nothing statewide can carry a board line.
{
  const w = bootDesk({ uid: "u_3", loc: { state: "Utah", county: "Davis County" }, levels: [LV_GOV] });
  const v = w.PDXMeDesk.voice();
  eq(v.seats.length, 1, "statewide: the governor's row was dropped from the snapshot");
  eq(v.seats[0].board, false, "statewide: a statewide office was given a board");
  // Scoped to the row, because the region's own title is "District Voice" and
  // the ban is on a statewide office WEARING a district number.
  const row = (/<li class="me-voiceseat">[\s\S]*?<\/li>/.exec(slotOf(w)) || [""])[0];
  ok(!/District \d/.test(row), `statewide: a statewide office was printed as a district — "${row}"`);
}

// ── STANDING 3 · SEATS ON FILE, ONE OF THEM BOARDED ─────────────────────────
{
  const w = bootDesk({
    uid: "u_4",
    loc: { state: "Utah", city: "Layton", county: "Davis County" },
    levels: [LV_HD14, LV_SD3],
  });
  ok(!w.__err, "verified: the desk boots");
  const v = w.PDXMeDesk.voice();
  const slot = slotOf(w);
  slots.verified = slot;
  eq(v.standing, "verified", "verified: the standing is 'verified'");
  // THE SEATS ARE THE OWNER'S, COMPOSED FROM THE RESOLVER'S LEVELS. Two
  // derivations of one fact would drift; the desk performs none of its own.
  eq(w.PDXVoice.seatsForMe().length, 2, "verified: the owner did not compose both resolved seats");
  eq(v.seats.length, 2, "verified: the snapshot dropped a seat");
  // ONE LINE PER SEAT, and the line is the chamber and the district the reader's
  // own saved location resolved.
  eq((slot.match(/class="me-voiceseat"/g) || []).length, 2, "verified: the desk did not print one row per seat");
  has(slot, "Seats on file:", "verified: the block does not say what it is listing");
  has(slot, "State House District 14", "verified: the House seat is not named");
  has(slot, "State Senate District 3", "verified: the Senate seat is not named");
  has(slot, "Davis County", "verified: the county the reader saved is not on the rows");
  has(slot, "me-voicetag", "verified: the badge is off");
  has(slot, "Verified resident", "verified: and it does not say what it certifies");
  // BOARD ON HAND, SEAT BY SEAT. SD-3 is the one allow-listed board today, so
  // exactly one of these two rows carries it — and the wording is the hallway's
  // own sentence, lower-cased, so the two documents cannot describe one absence
  // two ways.
  eq((slot.match(/board on hand/g) || []).length, 1, "verified: 'board on hand' is not on exactly one row");
  eq((slot.match(/board not on hand/g) || []).length, 1, "verified: 'board not on hand' is not on exactly one row");
  lacks(slot.toLowerCase(), "yet", "verified: a seat with no board is described with 'yet'");
  // ONE DOOR OUT OF THE WHOLE BLOCK, AND IT IS THE HUB.
  has(slot, 'href="/voice"', "verified: the CTA is not the District Voice hub");
  has(slot, "Open District Voice", "verified: and it does not say so");
  eq((slot.match(/me-voicecta/g) || []).length, 1, "verified: the block has more than one control");
  // AND THE HALLWAY IS NOT DUPLICATED HERE. The desk is a snapshot: no per-seat
  // door, no person link, no empty-board explanation. /voice owns all of that,
  // and a second copy is where one reader starts being told two things.
  ["Open board", "/district/ut-sd-3", "/p/", "pdxvr-", "this room is not open"].forEach((n) =>
    lacks(slot, n, `verified: the desk reproduces the hallway's "${n}" — the snapshot is a list, not a second hub`));
}

// ── STANDING 3b · SEATS ON FILE, NONE OF THEM BOARDED ───────────────────────
// A Davis County reader in HD-14 alone. Five boards exist in the product and
// not one of them is theirs, so the row says so plainly and the hub is still
// worth opening — it is where the seat and its member live even when the room
// does not exist.
{
  const w = bootDesk({
    uid: "u_5",
    loc: { state: "Utah", city: "Layton", county: "Davis County" },
    levels: [LV_HD14],
  });
  const v = w.PDXMeDesk.voice();
  const slot = slotOf(w);
  slots.dark = slot;
  eq(v.standing, "verified", "no board: a reader with a seat and no board is not on file at all");
  eq(w.PDXVoice.boardPath("ut-statehouse-14"), "", "no board: the allow-list answers for a seat it does not hold");
  // AND THE SEAT ONE NUMBER AWAY REALLY DOES HAVE A BOARD, so the line above is
  // an assertion about this key and not about an empty table.
  eq(w.PDXVoice.boardPath("ut-statehouse-15"), "/district/ut-hd-15",
    "no board: HD-15's board went missing, so the HD-14 refusal above proves nothing");
  has(slot, "board not on hand", "no board: the row does not say the board is not on hand");
  lacks(slot, "board on hand<", "no board: a board was claimed for a seat that has none");
  // WRONG-SEAT EXCLUSIVITY, ON THE DESK TOO. Clearfield is not North Ogden and
  // HD-14 is not HD-15, so no open board may appear on this reader's desk —
  // least of all the one next door that shares their county.
  lacks(slot, "/district/ut-sd-3",
    "no board: SD-3's board is on a Davis County reader's desk — a board belongs to its own seat's residents");
  lacks(slot, "/district/ut-hd-15",
    "no board: HD-15's board is on an HD-14 reader's desk — one number away is still another district");
  lacks(slot, "John Johnson", "no board: another seat's member is named on this reader's desk");
  // AND THE HUB IS STILL OFFERED. The old desk went dark here — no control at
  // all — which left the reader with a sentence and nowhere to go, on a page
  // that does hold their seat and their member.
  has(slot, 'href="/voice"', "no board: the hub is not offered to a reader whose seat has no board");
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
  win.location = { href: "https://politidex.fyi/me", pathname: "/me", search: "", hash: "", origin: "https://politidex.fyi", replace() {}, assign() {} };
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
    has(slot[0], "No seats on file for this account.",
      "owner absent: the region understates rather than inventing a board");
    lacks(slot[0], "me-voiceseat",
      "owner absent: a seat row was painted without the module that composes seats");
    lacks(slot[0], "Open District Voice",
      "owner absent: the hub is offered as though we knew this reader had seats in it");
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
  // ONE EXEMPTION, AND IT IS NOT A FIGURE: the finder link carries its return
  // intent as ?next=%2Fvoice, so the escape lives inside an href. The ban exists
  // to keep a rate off this region, so it is enforced on everything a reader can
  // read — attribute values stripped — and the raw slot is separately held to
  // having no bare percent outside one.
  const readable = slots[name].replace(/="[^"]*"/g, '=""');
  lacks(readable, "%", `${name}: the slot carries a percent sign a reader can see`);
  const hrefs = (slots[name].match(/href="[^"]*"/g) || []).join(" ");
  ok(!/%(?![0-9A-F]{2})/i.test(hrefs),
    `${name}: an href carries a percent that is not an escape — ${hrefs}`);
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
