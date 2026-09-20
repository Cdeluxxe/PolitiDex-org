#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-no-default-state.mjs — the app has no default place, and one resolved
// object answers for the reader on every surface
// ─────────────────────────────────────────────────────────────────────────────
// Two reports, one shape. A signed-out visitor was told "You are set to Utah"
// over a band reading "3 of 6 seats resolved", and a reader whose home card
// already printed U.S. House District 2 · Celeste Maloy, State Senate District
// 6 · Jerry Stevenson and State House District 15 · Ariel Defay opened /me in
// the same browser to find District 2 on the account block, "needs a district
// map" on both state chambers, and no names on either. In both cases the app
// answered a question the reader had not answered — once by inventing a place,
// once by forgetting one it had already resolved.
//
// WHERE THE PLACE CAME FROM. detectVoterLocation() ran at module load in
// voter-hub-location.js and wrote an IP-derived state through
// saveVoterLocation(), which sets window._hasUserLocation — the flag every
// surface in the app reads as "this reader told us where they vote". A state
// name resolves two senators and a governor and nothing else, which is the
// "3 of 6". So the store now distinguishes a reader's choice from a guess, and
// the only thing that stamps a choice is the save path a gesture goes through.
//
// WHERE THE DISTRICTS WENT. The curated tables that turn Davis County into
// {cd:2, sd:6, hd:15} live in ballot-breakdown.js, which is 407 KB and is not
// loaded on /me. So the home card could resolve three districts that existed
// nowhere /me could read them, and /me's own honest fallback — "needs a
// district map" — was true about /me and false about the reader. The walk that
// HAS those tables now persists what it resolved into the same location record,
// and the resolver reads it back. There is no second store and no second
// schema: /me asks pdxRepsForMe() exactly as the home card does.
//
// The failure modes this file gates, every one of which ships silently:
//
//   1. A PLACE NOBODY CHOSE. Any surface naming a state, county or district
//      that came from an IP lookup, a geolocation prompt nobody answered, or a
//      compiled-in default rather than from this reader's own saved gesture.
//   2. A COMPILED DEFAULT AREA. `_krCurrentLocationId()` ends
//      `_krInferLocation() || 'davis'`. A reader saved as Utah with no county
//      must not be handed Davis County's ballot as their own.
//   3. TWO ANSWERS TO ONE QUESTION. /me computing its own districts, carrying
//      its own copy of the curated tables, or loading ballot-breakdown.js. The
//      day the two disagree, one of them is wrong and neither knows which.
//   4. A COVERAGE ADMISSION OVER A RESOLVED FACT. "needs a district map" is a
//      true sentence about a chamber we do not draw. Printed over a district
//      the home card resolved ten seconds ago it is simply false.
//   5. A WAIT READ AS AN ABSENCE. /me carries no bundled roster. Before it
//      arrives, "not resolved for your area" and "no officeholder" are both
//      claims about coverage over people we hold full files for.
//   6. A STALE LABEL. "Change location" offered to a reader who has none, or
//      "needs a district map" still on screen after the home card resolved the
//      district and the reader navigated back.
//
// Six sections:
//
//   1. NO LOAD-TIME WRITER — the detector cannot run without a gesture.
//   2. EMPTY UNTIL SET — booted against an empty store, and against the two
//      record shapes the detector left in browsers.
//   3. ZERO HARDCODED UTAH AS THE READER'S PLACE — the first paint of the hero
//      line, the home card and /me, all three on an empty store.
//   4. ONE RESOLVED OBJECT — the home card's own paint writes it; /me, with no
//      ballot-breakdown.js in the context, reads back the same three numbers,
//      the same three pids and the same three names.
//   5. THE LABEL AND THE RETURN — "Set your location" vs "Change location", and
//      the pageshow re-read.
//   6. THE SERVICE WORKER.
//
//   node scripts/test-no-default-state.mjs
//
// Sections 2–5 BOOT THE REAL MODULES. voter-hub-location.js, who-represents-me.js,
// scope-chrome.js and me-desk.js are evaluated in a vm context against a mini-DOM
// and a real in-memory localStorage, in the order the two shells load them. Every
// claim below about markup is about markup this harness painted, and every claim
// about a district number is the resolver's own answer — not a second copy of its
// district branch, which is the antipattern this pass exists to remove.
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const LOC_JS = R("voter-hub-location.js");
const DESK_JS = R("me-desk.js");
const WRM_JS = R("who-represents-me.js");
const CHROME_JS = R("scope-chrome.js");
const BALLOT_JS = R("ballot-breakdown.js");
const CHUB_JS = R("compare-hub.js");
const ME_HTML = R("me.html");
const INDEX_HTML = R("index.html");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const hasnt = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const must = (cond, msg) => { if (!cond) { console.error("✗ " + msg); process.exit(1); } };
const section = (t) => console.log(`\n   ${t}`);

// ─────────────────────────────────────────────────────────────────────────────
// THE HARNESS
// ─────────────────────────────────────────────────────────────────────────────
// A mini-DOM with a real innerHTML, a real appendChild and a real getElementById,
// which is all four modules under test reach for. Deliberately NOT a full DOM:
// a module that needs layout, geometry or a live stylesheet to decide what a
// reader's districts are has a defect this file should fail on.
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

// THE THREE PEOPLE THE REPORT NAMES, and nothing else in the roster. A fixture
// with the whole roster in it would hide the one thing section 4 is about:
// whether the pid travelled, not whether a name could be looked up.
const ROSTER = {
  maloy: { name: "Celeste Maloy", party: "R" },
  stevenson: { name: "Jerry Stevenson", party: "R" },
  defay: { name: "Ariel Defay", party: "R" },
};

// DAVIS AS THE CURATED TABLES PUBLISH IT. These two accessors are
// ballot-breakdown.js's published shape — keyRacesRelevantData() for the matched
// area and _pdxVoterBallot() for the three districts and their incumbents — and
// they are the ONLY thing a home-card context gets that a /me context does not.
// That asymmetry is the defect under test, so it is the fixture's one variable.
const KRD = {
  locId: "davis", label: "Layton / Davis County", city: "Layton",
  county: "Davis County", state: "Utah", matched: true, byRace: {}, statewide: {},
};
const VB = {
  districts: { house: 2, senate: 6, lower: 15 },
  byOffice: {
    representative: { district: 2, incumbentPid: "maloy", pids: ["maloy"] },
    state_senator: { district: 6, incumbentPid: "stevenson", pids: ["stevenson"] },
    state_rep: { district: 15, incumbentPid: "defay", pids: ["defay"] },
  },
};
// The record saveVoterLocation() writes when a reader picks Layton on the map.
const DAVIS_SAVED = JSON.stringify({
  state: "Utah", city: "Layton", county: "Davis County", district: "2", src: "set",
});

function boot(o) {
  o = o || {};
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
    Promise, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
    requestIdleCallback(f) { try { f(); } catch (e) {} return 0; },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    // A fetch firing here is the bug: every fact below is either in the store or
    // in a fixture, so a reached network is a module answering on its own.
    fetch() { failures.push("a module reached the network during boot"); return Promise.reject(new Error("no network")); },
  };
  // A REAL DEFERRAL QUEUE, DRAINED ON DEMAND. me-desk.js repaints through
  // renderSoon() and who-represents-me.js syncs on a short timer, so a setTimeout
  // that returns 0 and drops the callback would leave every assertion below
  // reading a first frame nobody ships. Capped, because a module that reschedules
  // itself forever is a hang rather than a failure.
  const timers = [];
  win.setTimeout = (f) => { if (typeof f === "function") timers.push(f); return timers.length; };
  win.__flush = (cap) => {
    let n = 0;
    while (timers.length && n++ < (cap || 200)) {
      const f = timers.shift();
      try { f(); } catch (e) { failures.push("a deferred callback threw: " + e.message); }
    }
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.location = {
    href: o.desk ? "https://politidex.fyi/me" : "https://politidex.fyi/",
    pathname: o.desk ? "/me" : "/", search: "", hash: "",
    origin: "https://politidex.fyi", replace() {}, assign() {},
  };
  win.history = { pushState() {}, replaceState() {} };
  win.navigator = { userAgent: "node" };
  // A REAL STORE. The whole pass is about what is and is not in this object, so
  // a stub returning null for everything would pass every assertion vacuously.
  win.localStorage = {
    _d: Object.assign({}, o.store),
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  win.__events = {};
  win.addEventListener = (t, f) => { (win.__events[t] = win.__events[t] || []).push(f); };
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.auth = {
    currentUser: o.uid ? { uid: o.uid, isAnonymous: false, email: "voter@example.org", displayName: null } : null,
    onAuthStateChanged() {},
  };
  win.CMP_DATA = o.roster || {};
  win.PROFILES = {};
  win.ISSUE_MAP = {};
  // The one person reader both the home card and /me go through.
  win._pdxPersonById = (pid) => (win.CMP_DATA && win.CMP_DATA[pid]) || null;
  // TEAM_POSITIONS IS NOT SEEDED. voter-hub-location.js owns that table and
  // rewrites it for the reader's location, so a fixture copy here would be the
  // second answer this pass exists to delete — and it would hide the app's real
  // office labels from the row lookups in section 4.
  win.TEAM_POSITIONS = [];
  if (o.krd) win.keyRacesRelevantData = () => o.krd;
  if (o.vb) win._pdxVoterBallot = () => o.vb;
  if (o.desk) {
    win.__PDX_ME_DOC = true;
    const m = win.document.__node("main");
    m.id = "me-desk";
    win.document.body.appendChild(m);
    win.__mount = m;
  }
  if (o.home) {
    const sec = win.document.__node("section");
    sec.id = "who-represents-me";
    win.document.body.appendChild(sec);
    const body = win.document.__node("div");
    body.id = "wrm-reps";
    sec.appendChild(body);
    win.__homeSec = sec;
    win.__homeBody = body;
  }
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(LOC_JS, ctx, { filename: "voter-hub-location.js" });
    if (o.home) {
      vm.runInContext(WRM_JS, ctx, { filename: "who-represents-me.js" });
      vm.runInContext(CHROME_JS, ctx, { filename: "scope-chrome.js" });
    }
    if (o.desk) vm.runInContext(DESK_JS, ctx, { filename: "me-desk.js" });
  } catch (e) { win.__err = e; }
  win.__flush();
  return win;
}

const deskHtml = (w) => String(w.__mount.innerHTML);
const homeHtml = (w) => String(w.__homeBody.innerHTML);
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/\s+/g, " ");
const levelOf = (r, key) => (r && r.levels || []).find((l) => l && l.key === key) || null;
// One ballot row, by the office label it prints. The rows are <li class="me-seat">
// and each opens with <span class="me-office">, so a row can be isolated without
// a DOM — which is what lets a claim be made about ONE seat rather than the page.
const labelFor = (w, key) => {
  const p = (w.TEAM_POSITIONS || []).find((x) => x && x.key === key);
  return p ? String(p.label || "") : "";
};
function seatRow(html, label) {
  const parts = String(html).split('<li class="me-seat">');
  for (let i = 1; i < parts.length; i++) {
    const row = parts[i].split("</li>")[0];
    if (new RegExp('<span class="me-office">' + label.replace(/\./g, "\\.") + "</span>").test(row)) return row;
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · no load-time writer — the detector cannot run without a gesture");
// ═════════════════════════════════════════════════════════════════════════════
// The silent writer is gone by construction, not by configuration. An IP lookup
// behind a flag is the same defect with a switch on it, so the function that did
// it is removed rather than disabled.
// AGAINST CODE, NOT AGAINST THE COMMENT THAT RECORDS THE REMOVAL. This repo
// documents what it deleted and why, in place, and a sweep that cannot tell a
// changelog from a call site would force that note out of the file it explains.
// Whole-line comments are dropped; a `//` inside a URL is not, so a real
// fetch('https://ipapi.co/…') still fails this.
const code = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const LOC_CODE = code(LOC_JS);
hasnt(LOC_CODE, "_detectVoterLocationByIP", "the silent IP detector is still live code in voter-hub-location.js");
hasnt(LOC_CODE, "ipapi.co", "voter-hub-location.js still calls an IP-geolocation endpoint");
// THE PROMPT IS NOT GONE, IT IS BEHIND THE TAP. A reader who presses Detect has
// consented; a reader who loaded the page has not. So the browser prompt must
// have exactly one call site and it must be inside the button's own handler.
{
  const sites = (LOC_CODE.match(/geolocation\.getCurrentPosition/g) || []).length;
  eq(sites, 1, "the browser geolocation prompt has more than one call site");
  const handler = LOC_JS.indexOf("window.triggerManualLocationDetection");
  const prompt = LOC_JS.indexOf("geolocation.getCurrentPosition");
  ok(handler > 0 && prompt > handler,
    "the geolocation prompt is not inside triggerManualLocationDetection — it can fire without a tap");
}
ok(!/^\s*window\.detectVoterLocation\(\);\s*$/m.test(LOC_JS),
  "voter-hub-location.js still calls detectVoterLocation() at module load — that write is the defect");
// The Detect button stays. A tap IS consent, and removing the offer would answer
// requirement 1's "Set my location / Detect" CTA with half a control.
has(LOC_JS, "triggerManualLocationDetection",
  "the Detect button's handler is gone — a reader who taps Detect must still be able to");
has(LOC_JS, "_applyDetectedLocation",
  "the gesture-applied detection path is gone, so the Detect button has nothing to apply");
{
  // detectVoterLocation() is kept as a published name because callers exist; it
  // must decline rather than detect.
  const w = boot({});
  eq(typeof w.detectVoterLocation, "function", "detectVoterLocation is no longer published");
  eq(w.detectVoterLocation(), false, "detectVoterLocation() still claims to have detected something");
  eq(w._hasUserLocation, false, "calling detectVoterLocation() set the reader-has-a-location flag");
  eq(w.localStorage.getItem("politidex_voter_location"), null,
    "calling detectVoterLocation() wrote a location to the store");
}
// ONE STAMPER. Provenance is worthless if any writer can mint it, so the stamp
// is written by the save path a gesture goes through and by the Home Base
// writer, which writes the same key directly.
{
  const stamps = (LOC_JS.match(/src:\s*PDX_LOC_SRC/g) || []).length +
                 (LOC_JS.match(/\.src\s*=\s*PDX_LOC_SRC/g) || []).length;
  ok(stamps > 0, "voter-hub-location.js stamps no provenance on save");
  has(BALLOT_JS, "src: 'set'",
    "_homeAnchorLocation() writes the location key directly and must stamp it, or a Home Base stops being read back");
}
// ONE GATE, AND EVERY WRITER DEFERS TO IT. compare-hub.js restores a signed-in
// member's mirrored location by writing the key and calling the owner — so it
// must also accept the owner's verdict. A mirrored record written before
// provenance existed can fail the gate, and painting the state into the selector
// and the three location lines anyway puts a place on screen that the store
// itself declined. That is the same invented place arriving by another door.
{
  const at = CHUB_JS.indexOf("politidex_voter_location");
  ok(at > 0, "compare-hub.js no longer restores the mirrored location, so this pin is about nothing");
  const block = CHUB_JS.slice(at, at + 3000);
  has(block, "loadVoterLocation", "the Firestore restore does not go through the location owner");
  ok(/loadVoterLocation[\s\S]{0,1600}if \(window\._hasUserLocation\)/.test(block),
    "the Firestore restore paints a state without first asking whether the owner accepted the record");
  ok(block.indexOf("if (window._hasUserLocation)") < block.indexOf("voter-state-sel"),
    "the state selector is filled from the mirrored record before the owner has accepted it");
  // And it does not mint a stamp of its own on the way through.
  hasnt(block.slice(0, block.indexOf("loadVoterLocation")), "src:",
    "compare-hub.js stamps provenance on a record it is only relaying — the stamp must mean a gesture");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · empty until set");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({});
  must(!w.__err, `voter-hub-location.js threw on an empty store: ${w.__err && w.__err.stack}`);
  eq(w._hasUserLocation, false, "an empty store produced a located reader");
  eq(String(w._currentVoterLocation.state || ""), "", "an empty store produced a state");
  const r = w.pdxRepsForMe();
  eq(r.located, false, "the resolver claims a location nobody set");
  eq(String(r.state || ""), "", "the resolver names a state nobody set");
  eq(String(r.area || ""), "", "the resolver names an area nobody set");
}
// THE TWO SHAPES THE DETECTOR LEFT IN BROWSERS. Both are a state this reader
// never chose, and neither may be read back as their place. This is the pass's
// migration cost and it is asserted rather than described: these readers set
// their location once more.
{
  const ip = boot({ store: { politidex_voter_location: JSON.stringify({ state: "Utah", city: "", county: "", district: "" }) } });
  eq(ip._hasUserLocation, false, "an IP-shaped record (a bare state, no stamp) is still read back as the reader's place");
  const geo = boot({ store: { politidex_voter_location: JSON.stringify({ state: "Utah", city: "Davis County", county: "Davis County", district: "" }) } });
  eq(geo._hasUserLocation, false, "a reverse-geocoded record (city equal to county, no stamp) is still read back");
}
// AND THE SHAPES A READER'S OWN GESTURE LEFT. Unstamped, because they predate
// provenance — and a reader who picked a district or a city is not asked again.
{
  const dist = boot({ store: { politidex_voter_location: JSON.stringify({ state: "Utah", city: "Layton", county: "Davis County", district: "2" }) } });
  eq(dist._hasUserLocation, true, "a legacy record holding a district was discarded — that reader chose it");
  const city = boot({ store: { politidex_voter_location: JSON.stringify({ state: "Utah", city: "Layton", county: "Davis County" }) } });
  eq(city._hasUserLocation, true, "a legacy record whose city differs from its county was discarded");
  const sd = boot({ store: { politidex_voter_location: JSON.stringify({ state: "Utah", stateSenateDistrict: "6" }) } });
  eq(sd._hasUserLocation, true, "a legacy record holding a state-senate district was discarded");
}
// A STAMPED RECORD IS READ BACK IN FULL, which is what makes the store usable
// at all after this pass.
{
  const w = boot({ store: { politidex_voter_location: DAVIS_SAVED } });
  eq(w._hasUserLocation, true, "a stamped record is not read back");
  eq(String(w._currentVoterLocation.county || ""), "Davis County", "a stamped record's county is not restored");
}
// NO COMPILED DEFAULT AREA. A stamped state-only reader, with the curated
// accessors present but reporting no area match, must not be handed Davis.
{
  const w = boot({
    store: { politidex_voter_location: JSON.stringify({ state: "Utah", city: "", county: "", district: "", src: "set" }) },
    krd: Object.assign({}, KRD, { matched: false }), vb: VB, roster: ROSTER,
  });
  const r = w.pdxRepsForMe();
  eq(r.located, true, "a stamped state-only reader is not located at all");
  for (const [key, label] of [["house", "U.S. House"], ["statesenate", "State Senate"], ["statehouse", "State House"]]) {
    const lv = levelOf(r, key);
    ok(lv && !lv.district, `${label} was handed a district from the curated default area`);
    ok(lv && !lv.pid, `${label} was handed an officeholder from the curated default area`);
  }
  has(BALLOT_JS, "_krInferLocation() || 'davis'",
    "the curated default area moved — the resolver's match gate is written against this exact expression");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · zero hardcoded Utah as the reader's place, on first paint");
// ═════════════════════════════════════════════════════════════════════════════
// THE READER'S PLACE, NOT THE WORD. "PolitiDex maps Utah today" is a true
// sentence about our coverage and it stays. What may not exist on an empty store
// is Utah in the slot where this reader's own place goes — which is why these
// three assertions are made against PAINTED OUTPUT rather than against source.
{
  const home = boot({ home: true, store: {} });
  must(!home.__err, `the home surfaces threw on an empty store: ${home.__err && home.__err.stack}`);

  // The hero line.
  const line = home.PDXScope.line();
  hasnt(line, "Utah", "the hero line names Utah as the place of a reader who set none");
  hasnt(line, "You are set to", "the hero line tells a reader with no location that they are set to somewhere");
  has(line, "Set a location", "the hero line does not offer a reader with no location the way to set one");

  // The home card.
  eq(homeHtml(home), "", "the home card painted representative rows for a reader with no location");
  eq(home.__homeSec.getAttribute("data-located"), null, "the home card is marked located for a reader with no location");
  hasnt(homeHtml(home), "Utah", "the home card names Utah on an empty store");
  hasnt(homeHtml(home), "3 of 6", "the home card printed a Utah-only seat count on an empty store");

  // /me.
  const me = boot({ desk: true, store: {} });
  must(!me.__err, `me-desk.js threw on an empty store: ${me.__err && me.__err.stack}`);
  ok(deskHtml(me).length > 0, "the desk painted nothing at all, so the sweep below is vacuous");
  eq((deskHtml(me).match(/Utah/g) || []).length, 0, "/me names Utah on an empty store");
  hasnt(deskHtml(me), "District 2", "/me printed a district for a reader with no location");
  hasnt(deskHtml(me), "Davis", "/me named the curated default county on an empty store");

  // GUEST AFTER CLEAR STORAGE: the control reads "Set", never "set to".
  has(deskHtml(me), "Set your location", "/me does not offer a reader with no location the way to set one");
  hasnt(deskHtml(me), "Change location", "/me offers to CHANGE a location this reader never set");
  hasnt(text(deskHtml(me)), "set to", "/me tells a guest they are set to somewhere");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one resolved object — the home card writes it, /me reads it");
// ═════════════════════════════════════════════════════════════════════════════
// THE FIXTURE IS DAVIS AS THE HOME CARD ITSELF SAVES IT. This context gets the
// curated accessors, the home card boots and paints of its own accord, and what
// lands in the store is whatever that paint decided — not a literal typed here.
let SAVED_AFTER_HOME = null;
{
  const w = boot({ home: true, store: { politidex_voter_location: DAVIS_SAVED }, krd: KRD, vb: VB, roster: ROSTER });
  must(!w.__err, `the home surfaces threw on the Davis fixture: ${w.__err && w.__err.stack}`);
  const t = text(homeHtml(w));
  has(t, "U.S. House · District 2", "the home card did not resolve U.S. House District 2 from the Davis fixture");
  has(t, "State Senate · District 6", "the home card did not resolve State Senate District 6");
  has(t, "State House · District 15", "the home card did not resolve State House District 15");
  has(t, "Celeste Maloy", "the home card did not name the U.S. House incumbent");
  has(t, "Jerry Stevenson", "the home card did not name the State Senate incumbent");
  has(t, "Ariel Defay", "the home card did not name the State House incumbent");

  // ONE STORE, ONE KEY. A second key here would be the second schema the whole
  // design avoids, so the key list is asserted exactly.
  eq(Object.keys(w.localStorage._d).join(","), "politidex_voter_location",
    "resolving the reader's districts wrote a key other than the one location record");

  SAVED_AFTER_HOME = w.localStorage.getItem("politidex_voter_location");
  const rec = JSON.parse(SAVED_AFTER_HOME);
  ok(rec.resolved && typeof rec.resolved === "object",
    "the home card resolved three districts and persisted none of them — /me has nothing to read");
  eq(String(rec.resolved.house.d), "2", "the persisted U.S. House district is not the one the card printed");
  eq(String(rec.resolved.statesenate.d), "6", "the persisted State Senate district is not the one the card printed");
  eq(String(rec.resolved.statehouse.d), "15", "the persisted State House district is not the one the card printed");
  // THE NAME AND THE NUMBER MOVE TOGETHER. A district with no officeholder beside
  // it is how /me ends up printing a number over "no officeholder on file".
  eq(rec.resolved.house.pid, "maloy", "the persisted U.S. House seat carries no officeholder");
  eq(rec.resolved.statesenate.pid, "stevenson", "the persisted State Senate seat carries no officeholder");
  eq(rec.resolved.statehouse.pid, "defay", "the persisted State House seat carries no officeholder");
  // KEYED TO THE PLACE IT WAS RESOLVED FOR. Memory that outlives the location it
  // was true of is worse than no memory.
  ok(String(rec.resolved.sig || "").length > 0, "the persisted seats carry no signature of the place they were resolved for");

  // ASKING IS A READ. The write above belongs to the location-sync signal, which
  // is the moment a place is established, restored or changed. Every other
  // surface in the app asks the resolver while painting, so if the ASK carried
  // the write, a seat row, a compare sheet and the hub would each leave a
  // different record behind — which is the rule test-seat-spine already holds
  // for the seat strip ("the spine reads the stores; it must never write one").
  const before = JSON.stringify(w.localStorage._d);
  w.pdxRepsForMe();
  w.pdxSeatHolders("statesenate");
  w.pdxSeatHolders("house");
  w.PDXWhoRepresentsMe.sync();
  w.PDXScope.sync();
  w.__flush();
  eq(JSON.stringify(w.localStorage._d), before, "asking the resolver, or repainting from it, wrote to the store");
  // And the write path is published and separate, so there is exactly one of them.
  eq(typeof w.pdxRememberResolved, "function", "the resolved-seat write path is not published as its own call");
  has(LOC_CODE, "pdxRememberResolved",
    "voter-hub-location.js has no named write path for the resolved seats — the write is back inside a read");
}

// /me, WITH NO ballot-breakdown.js IN THE CONTEXT. This is the reported browser:
// same store, same resolver, 407 KB of curated tables absent.
{
  must(SAVED_AFTER_HOME, "the home card wrote nothing, so there is nothing for /me to read");
  const w = boot({ desk: true, store: { politidex_voter_location: SAVED_AFTER_HOME }, roster: ROSTER });
  must(!w.__err, `me-desk.js threw on the saved Davis record: ${w.__err && w.__err.stack}`);
  eq(typeof w.keyRacesRelevantData, "undefined", "the /me context has the curated tables, so it is not the reported browser");
  eq(typeof w._pdxVoterBallot, "undefined", "the /me context has the curated ballot, so it is not the reported browser");

  const h = deskHtml(w);
  // THE THREE NUMBERS ON THE ACCOUNT BLOCK.
  has(h, "District 2", "/me does not print the U.S. House district the home card resolved");
  has(h, "District 6", "/me does not print the State Senate district the home card resolved");
  has(h, "District 15", "/me does not print the State House district the home card resolved");
  // AND NOT THE COVERAGE ADMISSION OVER ANY OF THEM.
  hasnt(h, "needs a district map",
    "/me still prints a coverage admission over a district the home card resolved");

  // THE SAME INCUMBENTS, BY PID, WITH WORKING DOORS.
  for (const [pid, name] of [["maloy", "Celeste Maloy"], ["stevenson", "Jerry Stevenson"], ["defay", "Ariel Defay"]]) {
    has(h, name, `/me does not name ${name}, whom the home card named for the same seat`);
    has(h, "/p/" + pid, `/me names ${name} without a door to their record`);
  }
  hasnt(h, "Not resolved for your area", "/me says a seat is unresolved that the home card resolved");
  // PER ROW, NOT PER PAGE. "No officeholder on file" is the honest sentence for a
  // seat this fixture's three-person roster genuinely cannot fill — U.S. Senate,
  // Governor, Local. Over one of the three the home card just resolved it is a
  // false claim, so the assertion is made against those three rows alone.
  for (const [key, pid, name] of [["house", "maloy", "Celeste Maloy"], ["statesenate", "stevenson", "Jerry Stevenson"], ["statehouse", "defay", "Ariel Defay"]]) {
    // THE ROW IS FOUND BY THE APP'S OWN LABEL FOR THAT SEAT. window.TEAM_POSITIONS
    // is the location module's table, not this file's — a label typed here would
    // make the assertion pass or fail on a copy of a string the app owns.
    const label = labelFor(w, key);
    ok(!!label, `window.TEAM_POSITIONS carries no label for the ${key} seat`);
    const row = seatRow(h, label);
    ok(row !== null, `/me printed no ballot row for ${label}`);
    has(row || "", name, `/me's ${label} ballot row does not name ${name}`);
    hasnt(row || "", "No officeholder on file", `/me's ${label} row says no officeholder over a seat the home card resolved`);
    hasnt(row || "", "Still loading seats", `/me's ${label} row reports a wait over a seat already resolved from the store`);
    has(row || "", "/p/" + pid, `/me's ${label} row names ${name} without a door to their record`);
  }

  // THE RESOLVER ITSELF AGREES, seat by seat — the surface and the owner, not
  // one of them.
  const r = w.pdxRepsForMe();
  eq(String(levelOf(r, "house").district), "2", "the resolver on /me lost the U.S. House district");
  eq(String(levelOf(r, "statesenate").district), "6", "the resolver on /me lost the State Senate district");
  eq(String(levelOf(r, "statehouse").district), "15", "the resolver on /me lost the State House district");
  eq(w.pdxSeatHolders("statesenate").pids.join(","), "stevenson", "pdxSeatHolders lost the State Senate incumbent on /me");
  eq(w.pdxSeatHolders("statehouse").pids.join(","), "defay", "pdxSeatHolders lost the State House incumbent on /me");
  eq(w.pdxSeatHolders("house").pids.join(","), "maloy", "pdxSeatHolders lost the U.S. House incumbent on /me");
}
// NO SECOND COPY OF THE TABLES ON /me. The 407 KB file is not loaded, and the
// desk does not carry a sliver of it either.
// SCRIPT TAGS, NOT PROSE. me.html names ballot-breakdown.js twice in comments,
// explaining which reader owns a store on /ballot — that note is documentation,
// and a sweep over raw text would read it as a 407 KB load.
const tagAt = (html, file) => {
  const re = new RegExp('<script[^>]*src="[^"]*' + file.replace(/\./g, "\\.") + '"', "g");
  const m = re.exec(html);
  return m ? m.index : -1;
};
eq(tagAt(ME_HTML, "ballot-breakdown.js"), -1,
  "/me loads ballot-breakdown.js — 407 KB for three numbers already in the store");
ok(tagAt(ME_HTML, "voter-hub-location.js") > 0, "/me does not load the location owner, so it has no resolver to ask");
ok(tagAt(ME_HTML, "voter-hub-location.js") < tagAt(ME_HTML, "me-desk.js"),
  "/me loads me-desk.js before the resolver it reads districts from");
hasnt(DESK_JS, "KEY_RACES_BY_LOCATION", "me-desk.js carries a copy of the curated area tables");
hasnt(DESK_JS, "_pdxHouseRedistrict", "me-desk.js carries its own copy of the redistricting read");
// A MEMORY IS NOT A SECOND SOURCE. It lives inside the one location record.
hasnt(LOC_JS, "politidex_resolved", "the resolved seats went into a second store key");

// A WAIT IS NOT AN ABSENCE. Located reader, no persisted memory, cold roster.
{
  const w = boot({ desk: true, store: { politidex_voter_location: DAVIS_SAVED }, roster: {} });
  const h = deskHtml(w);
  has(h, "Still loading seats", "a cold roster prints a coverage claim instead of a wait");
  hasnt(h, "No officeholder on file", "a cold roster is reported as an absent officeholder");
  hasnt(h, "Not resolved for your area", "a cold roster is reported as an unresolvable area");
  eq(w.pdxRosterWarm(), false, "the resolver reports a warm roster over an empty one");
  eq(w.pdxSeatHolders("statesenate").rosterCold, true, "pdxSeatHolders does not report the cold roster it answered over");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the label, and the return from the home card");
// ═════════════════════════════════════════════════════════════════════════════
// "Change location" is a promise that there is one to change. It may only appear
// once county, U.S. House, State Senate and State House are all answered — which
// is exactly the state a reader arrives in after the home card resolves them.
{
  const set = boot({ desk: true, store: { politidex_voter_location: SAVED_AFTER_HOME }, roster: ROSTER });
  eq(set.PDXMeDesk.locLabel(), "Change location", "a fully-resolved reader is asked to SET a location they have");
  has(deskHtml(set), "Change location", "the painted control does not offer a resolved reader the change");

  const partial = boot({ desk: true, store: { politidex_voter_location: DAVIS_SAVED }, roster: ROSTER });
  eq(partial.PDXMeDesk.locLabel(), "Set your location",
    "a reader missing two chambers is offered CHANGE, which claims those lines are answered");
  eq(partial.PDXMeDesk.locComplete(), false, "a reader missing two chambers is reported as complete");

  const none = boot({ desk: true, store: {} });
  eq(none.PDXMeDesk.locLabel(), "Set your location", "a reader with no location at all is offered CHANGE");
  eq(none.PDXMeDesk.locComplete(), false, "a reader with no location at all is reported as complete");
}
// RETURNING FROM THE HOME CARD. A back navigation restores a frozen page from
// the bfcache: no script re-runs, so a desk that only reads the store at boot
// keeps showing the "needs a map" it painted before the reader left.
{
  const w = boot({ desk: true, store: {} });
  const hooks = w.__events.pageshow || [];
  ok(hooks.length > 0, "/me does not listen for pageshow, so a reader returning from the home card keeps a stale district row");
  // The listener re-reads the store through its OWNER rather than parsing the
  // key itself, which is what keeps the provenance gate in one place.
  const wire = LOC_JS.indexOf("window.loadVoterLocation");
  ok(wire > 0, "loadVoterLocation is not published, so the pageshow re-read has nothing to call");
  has(DESK_JS, "pageshow", "me-desk.js has no pageshow wiring");
  ok(/pageshow[\s\S]{0,300}loadVoterLocation/.test(DESK_JS),
    "/me's pageshow handler does not re-read the location through loadVoterLocation()");

  // And the re-read actually repaints from what the store now says: the reader
  // left with nothing and comes back to a resolved Davis.
  eq((deskHtml(w).match(/District 6/g) || []).length, 0, "the desk already showed a district before the return");
  w.localStorage.setItem("politidex_voter_location", SAVED_AFTER_HOME);
  w.CMP_DATA = ROSTER;
  hooks.forEach((f) => { try { f({ persisted: true }); } catch (e) { failures.push("the pageshow handler threw: " + e.message); } });
  w.__flush();
  const after = deskHtml(w);
  has(after, "District 6", "returning from the home card left the stale row — the store says District 6 and /me does not");
  has(after, "District 15", "returning from the home card left the stale State House row");
  hasnt(after, "needs a district map",
    "a stale coverage admission survived the return after the home card resolved the district");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the service worker");
// ═════════════════════════════════════════════════════════════════════════════
// me-desk.js, voter-hub-location.js and the home card's resolver all changed, and
// two precached shells ship beside them. A warm device that pairs the new shell
// with the old script is the one way this fix reads as a regression.
{
  const m = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
  must(m, "sw.js has no CACHE_VERSION");
  const live = m[1];
  ok(Number(live.slice(1)) >= 209, `CACHE_VERSION is ${live} — /me, the store and the resolver changed and the shell was not re-issued`);
  // AND THE ENTRY THIS PASS FILED IS v209, PINNED. The three assertions below
  // are about what THIS pass claimed, and the note just under them already says
  // so — but they were reading the NEWEST entry, which asks every later bump to
  // re-make this pass's claims or fail. Sliced from its own heading to the next
  // heading, so a later entry cannot satisfy it either.
  const v = "v209";
  const start = SW.indexOf(`// ${v} -`);
  ok(start > 0, `sw.js has no version-log entry for ${v}`);
  const nextHead = SW.slice(start + 1).search(/\n\/\/ v\d+ - /);
  const constAt = SW.indexOf("const CACHE_VERSION");
  const entry = SW.slice(start, nextHead >= 0 ? Math.min(start + 1 + nextHead + 1, constAt) : constAt);
  // THE MANIFEST IS PINNED AGAINST THE WHOLE LOG, NOT THE NEWEST ENTRY. What this
  // defends is that the change to the store, the desk and /me's shell shipped WITH
  // a cache bump — and it did, in the entry that made it. Reading only the newest
  // entry re-asks every later pass to claim it touched me-desk.js whether it did
  // or not, which is how a manifest stops being a record of what changed.
  has(SW, "voter-hub-location.js", "no version-log entry names the store file this pass changed");
  has(SW, "me-desk.js", "no version-log entry names the desk file this pass changed");
  has(SW, "me.html", "no version-log entry names the shell /me ships in");
  has(entry, "voter-hub-location.js", `the ${v} entry does not name the store file, which every pass since 209 has had to touch`);
  has(entry, "Direction Match", `the ${v} entry does not say what did NOT move`);
  has(entry, "MIGRATION COST", `the ${v} entry does not state what this pass costs readers already carrying a record`);
  // The two surfaces are wired into the pages they paint on.
  has(INDEX_HTML, "who-represents-me.js", "the home card script is not wired into index.html");
  has(INDEX_HTML, "voter-hub-location.js", "the location owner is not wired into index.html");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ no default state: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ no default state: all ${passed} assertions passed — 0 invented places, 1 resolved object, 3 districts on both surfaces\n`);
