#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-workspace.mjs — Door 2 is a ballot workspace, not a seat list
// ─────────────────────────────────────────────────────────────────────────────
// The seat spine test (test-seat-spine.mjs) guards that a seat row carries the
// whole loop. This one guards that the loop is CONTINUOUS: that resolving seats,
// comparing a field and taking a pick happen on one surface, with the reader's
// progress never off screen and never disagreeing with the team builder.
//
// What it pins:
//
//   1. ONE SURFACE, MOUNTED IN DOOR 2. The section exists in the document
//      between the location card and the countdown, its stylesheet and script
//      are wired, and both are in the service worker's precache together.
//   2. THE RAIL IS THE BALLOT. Every seat in TEAM_POSITIONS gets a chip, the
//      count is over that same list, and the count agrees with the team store.
//   3. THE SEAT IS THE WORKING SURFACE. Who holds it, the field, and a pick
//      control — on the panel, not behind an overlay or a scroll.
//   4. THE FORMAL RECORD IS THE RULER, AND IT SAYS SO. The order comes from
//      _rank(list,'record',…); the panel names the ruler and names what is not
//      ordering it.
//   5. DIRECTION MATCH IS SECONDARY AND ORDERS NOTHING. Printed, labelled with
//      the question it answers, never in the number slot, never a sort key.
//   6. A PICK STAYS ON THE SURFACE AND REACHES EVERYWHERE. One store, one
//      writer; the rail, the count and the panel all move.
//   7. NEXT-SEAT CONTINUITY. The panel offers the next UNDECIDED seat, and says
//      so when there are none left.
//   8. HONEST THIN AND EMPTY FIELDS. Zero on file, one on file, an unmapped
//      district and an uncurated local area are four different sentences, and
//      none of them is a field.
//   9. NO PARTY, NO FALLBACK. No party token anywhere on the surface, and a
//      non-Utah reader is never shown Utah's district fields.
//  10. THE BROCHURE IS DEMOTED, NOT DELETED. One attribute hides the pitch once
//      a location exists; the second one-race tool is hidden; the seat list's
//      "What now?" stack is one action.
//  11. ADDITIVE, AND NEVER DOUBLE-HOOKED. Everything that shipped before this
//      surface still works when this file does not load, and wrapping the pick
//      writer twice is impossible.
//  12. THE RAIL OUTRANKS THE ADDRESS IT ARRIVED ON. An arriving ?seat= picks the
//      FIRST seat and nothing after it; the rail and "Next seat" both win over it
//      and carry the address with them, by replace and never by push; and the
//      open seat is held by the desk rather than by the URL, so a browser with no
//      replaceState still cannot snap the reader back.
//
//   node scripts/test-ballot-workspace.mjs
//
// Real shipped modules in a node:vm sandbox, the real resolver, the real roster
// and the real team store, plus a mini-DOM — every claim here is about painted
// markup.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "voter-hub-location.js",
  "compare-hub.js",
  "seat-field.js",
  "ballot-breakdown.js",
  "who-represents-me.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");
const WORK = R("ballot-workspace.js");
const HTML = R("index.html");
// The desk moved to its own document in the fourth split. index.html keeps the
// DOOR, ballot.html carries the DESK — so the mount, the script and the
// stylesheet are asserted against the document that actually serves /ballot.
// scripts/test-ballot-shell.mjs owns the split itself; this file owns the desk.
const BALLOT = R("ballot.html");
const CSS = R("ballot-workspace.css");
const SW = R("sw.js");
const WRM = R("who-represents-me.js");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// Same shape as the spine harness: the shared sandbox returns null from every
// lookup, and every surface here paints into an element it finds by id — so the
// registry has to pre-create those ids or every assertion below is vacuous.
function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  el("who-represents-me");
  el("wrm-reps");
  el("vh-district-strip");
  el("voter-hub");
  el("ballot-workspace");
  el("bw-body");
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {};
  const sess = opts.session || {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  // ── AN ADDRESS BAR THAT ACTUALLY MOVES ──────────────────────────────────────
  // makeSandbox ships a location literal and NO history object, so a desk that
  // corrects the address would be asserted against nothing here. This gives the
  // sandbox the two halves of an address bar the desk touches: a location.search
  // it can read, and a replaceState that really moves it. Every history call is
  // recorded, so a test can tell "corrected the address once" apart from
  // "stacked one entry per chip" — which is the failure the desk's replace-never-
  // push rule exists to prevent, and is invisible if you only read the final URL.
  //
  // Opt-in, and deliberately so: it also moves location.pathname to /ballot, and
  // eleven sections above this one boot with the default '/' . Gating it keeps
  // those boots byte-identical to what they were.
  if (opts.address || opts.search !== undefined) {
    const base = "https://www.politidex.fyi";
    win.__nav = [];
    win.location = {
      href: base + "/ballot" + (opts.search || ""), origin: base,
      pathname: "/ballot", search: opts.search || "", hash: opts.hash || "",
      assign(u) { win.__nav.push("assign:" + u); },
      replace(u) { win.__nav.push("replace-nav:" + u); },
    };
    const applyUrl = (url) => {
      const u = String(url || "");
      const hi = u.indexOf("#");
      const hash = hi >= 0 ? u.slice(hi) : "";
      const rest = hi >= 0 ? u.slice(0, hi) : u;
      const qi = rest.indexOf("?");
      win.location.pathname = qi >= 0 ? rest.slice(0, qi) : rest;
      win.location.search = qi >= 0 ? rest.slice(qi) : "";
      win.location.hash = hash;
      win.location.href = base + rest + hash;
    };
    if (opts.noHistory) {
      // A browser (or a harness) with no replaceState at all. The desk must not
      // snap back here either — if it only holds the open seat by rewriting the
      // URL, then the rewrite IS the fix and it is one failed call from the bug.
      win.history = undefined;
    } else {
      win.history = {
        state: null,
        replaceState(st, _t, url) { win.__nav.push("replace:" + url); this.state = st; applyUrl(url); },
        pushState(st, _t, url) { win.__nav.push("push:" + url); this.state = st; applyUrl(url); },
      };
    }
  }
  const byId = miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  if (!opts.withoutWorkspace) vm.runInContext(WORK, sandbox, { filename: "ballot-workspace.js" });
  win.PROFILES = win.CMP_DATA;
  win.__store = store;
  win.__session = sess;
  win.__byId = byId;
  // Location comes AFTER boot: voter-hub-location.js resets these on init.
  if (opts.located !== false) {
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location ||
      { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  } else {
    win._hasUserLocation = false;
    win._currentVoterLocation = null;
  }
  return win;
}

const paint = (w) => {
  w.PDXBallotWorkspace.sync();
  const h = w.document.getElementById("bw-body");
  return h ? String(h.innerHTML) : "";
};

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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ ballot workspace: ${msg}`);
  process.exit(1);
};

// ── Boot asserts ─────────────────────────────────────────────────────────────
const probe = boot();
must(probe.PDXBallotWorkspace && typeof probe.PDXBallotWorkspace.sync === "function",
  `the workspace did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.pdxBallotWorkspaceOpen === "function", "pdxBallotWorkspaceOpen is not exposed");
must(typeof probe.pdxBallotWorkspacePick === "function", "pdxBallotWorkspacePick is not exposed");
must(typeof probe.pdxRepsForMe === "function", "the location resolver is not loaded");
must(typeof probe._ballotLoad === "function", "the team store is not loaded");
must(probe.PDXRaceSheet && typeof probe.PDXRaceSheet._rank === "function",
  "the race sheet model is not available to the workspace");

const SEATS = probe.PDXBallotWorkspace._seats();
must(SEATS.length >= 5, `expected the full ballot on the rail, got ${SEATS.length} seats`);
// A seat with a real field behind it in this fixture, so the field assertions are
// not vacuous. Taken from the live roster, so this file breaks if the seat model
// moves — which is the point.
const RICH = SEATS.filter((s) => probe.PDXRaceSheet._field(s.key).length >= 2).map((s) => s.key);
must(RICH.length >= 1, "no seat on the fixture ballot has a field of 2+ any more");
const SEAT = RICH[0];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One surface, served at its own address, shipped whole");

{
  // THE DESK IS AT /ballot. It is built in JS there rather than shipped as an
  // empty section, because a mount that never fills is worse than no mount.
  ok(/\.id\s*=\s*['"]ballot-workspace['"]/.test(BALLOT), "the workspace has no mount on ballot.html");
  ok(/\.id\s*=\s*['"]bw-body['"]/.test(BALLOT), "the workspace body mount is missing from ballot.html");
  has(BALLOT, 'href="/ballot-workspace.css"', "the workspace stylesheet is not linked on ballot.html");
  has(BALLOT, 'src="/ballot-workspace.js"', "the workspace script is not loaded on ballot.html");
  // Deferred there too: the desk builds its own mount at parse time, so nothing
  // above the fold waits on the module.
  ok(/<script defer src="\/ballot-workspace\.js"><\/script>/.test(BALLOT),
    "the workspace script is not deferred on ballot.html");
  // The sheet owns every model helper the workspace reads, so it must load first.
  ok(BALLOT.indexOf('src="/race-sheet.js"') < BALLOT.indexOf('src="/ballot-workspace.js"'),
    "the workspace loads before the race sheet model it reads");

  // AND THE HOMEPAGE KEEPS ONLY THE DOOR. Two desks on two addresses would share
  // one sessionStorage key and disagree about which seat is open.
  ok(HTML.indexOf('id="ballot-workspace"') < 0, "the desk mount is back on index.html");
  ok(!/src="\/ballot-workspace\.js"/.test(HTML), "the desk script is back on index.html");
  // WHERE THE DOOR IS, AND WHAT THAT ORDER IS ACTUALLY PROTECTING. This used to
  // require the door to sit inside #voter-hub and below its pm-location-bar,
  // because the desk cannot resolve a seat list without a location and a door
  // offered above every way of setting one sends the reader somewhere that can
  // only tell them to come back. The door has since been lifted out of the hub
  // into #pdx-ballot-band, directly under Who Represents Me — which is the
  // homepage's front location step, and is where the front page now replaces the
  // whole ballot-builder wall it used to paint under the hub. So the pin is
  // restated as the thing it was defending rather than the one element it
  // happened to be measured against: ONE door, and a location step above it.
  const iHub = HTML.indexOf('id="voter-hub"');
  const iLoc = HTML.indexOf('id="wrm-locbar"');
  const iWrm = HTML.indexOf('id="who-represents-me"');
  const iDoor = HTML.indexOf('id="pdx-ballot-door"');
  ok(iDoor > 0, "Door 2 has no entrance on the homepage");
  ok(HTML.split('id="pdx-ballot-door"').length === 2,
    "the homepage carries more than one primary Door 2 entrance, so two of them describe the desk");
  ok(iWrm > 0 && iDoor > iWrm,
    "the door sits above Who Represents Me, the location step the desk depends on");
  // AND THE LOCATION STEP HAS SINCE MOVED ABOVE THE DOOR RATHER THAN BELOW IT.
  // The card used to be .pm-location-bar inside #voter-hub, two sections under
  // this door, so this line read "iLoc > iHub" — the door is above the hub, the
  // card was in the hub, and the pin was satisfied by the card being LATER in
  // the document than the thing that needs it. That was never the property; it
  // was the accident of where the card happened to live. The setter is now
  // #wrm-locbar at the top of Who Represents Me, which is above the door, so the
  // pin is stated as what it always meant: there is exactly one location setter
  // on the homepage, and the reader passes it before they reach the door.
  ok(iLoc > 0, "the homepage has no location setter, so the step the desk depends on is gone");
  ok(HTML.split('id="wrm-locbar"').length === 2,
    "the homepage carries more than one location setter, so two surfaces can each be the one the reader " +
    "last touched and neither owns where they vote");
  ok(iHub > 0 && iLoc < iHub,
    "the location setter is back below the voter hub, which puts the one control the desk depends on two " +
    "sections beneath the band that asks for it");
  ok(iLoc < iDoor,
    "the door to the desk now comes before the location setter, so a reader reaches the ballot workspace " +
    "before anything has asked them where they vote");
  // The band's own controls, which are the reason it can lead the hub: the place
  // (or the offer to set one) and a single anchor to the desk, no candidate, no
  // party, no count.
  const band = HTML.slice(HTML.indexOf('id="pdx-ballot-band"'),
    HTML.indexOf("</section>", HTML.indexOf('id="pdx-ballot-band"')));
  ok(band.split('href="/ballot"').length === 2,
    "the ballot band does not carry exactly one /ballot primary");
  ok(/Set where you vote/.test(band), "the ballot band never offers to set a location");
  ok(!/mypolToggleAnimated|_pdxPartyChip|pdx-party|Word vs Action/.test(band),
    "the ballot band grew a pick control, a party chip or a record read — it is a door, not a desk");
  // The precache comment in sw.js warns against splitting a feature's JS from its
  // CSS. Both, or the first offline visit paints an unstyled rail.
  has(SW, "'/ballot-workspace.js'", "the workspace script is not precached");
  has(SW, "'/ballot-workspace.css'", "the workspace stylesheet is not precached");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · The rail is the ballot, and its count is the team's count");

{
  const w = boot();
  const html = paint(w);
  has(html, "bw-rail", "the workspace paints no seat rail");
  // Every ballot seat gets a chip. Dropping the ones that cannot resolve would
  // leave a rail that reads as complete when it is not, and would make the count
  // disagree with the team builder's own six slots.
  const chips = (html.match(/class="bw-seat[ "]/g) || []).length;
  eq(chips, SEATS.length, "the rail does not carry every seat on the ballot");
  SEATS.forEach((s) => has(html, `pdxBallotWorkspaceOpen('${s.key}')`,
    `the rail cannot open the ${s.key} seat`));

  // ── AND THE METER COUNTS WHAT WE CAN ACTUALLY RESOLVE ─────────────────────
  // The denominator used to be SEATS.length — the whole ballot, gaps included.
  // For Utah that is six, and two of those six regularly cannot be resolved (a
  // district we do not map, a local roster this document did not load), so the
  // desk opened on "0/6": a target the reader cannot reach and a per-state
  // constant presented as their progress.
  //
  // It is now the length of THIS VOTER'S RESOLVED LIST — `_seats` filtered
  // through `_gate`, which is the same gate the desk paints each seat from. So
  // the figure is computed here the way the surface computes it, out of the
  // module's own exports, and there is no literal on either side of this
  // assertion. The rail is still asserted at SEATS.length above: six is how many
  // seats this voter decides, and the meter promises only the ones we can hand
  // them.
  const workable = w.PDXBallotWorkspace._workable();
  ok(workable.length > 0, "the fixture resolves no seats at all, so the meter cannot be measured");
  ok(workable.length <= SEATS.length, "the resolved list is longer than the ballot it comes from");
  workable.forEach((s) => eq(w.PDXBallotWorkspace._gate(s, w.pdxRepsForMe()), "ok",
    `the resolved list carries ${s.key}, which the gate does not call resolvable`));
  has(html, `/${workable.length}<`, "the progress figure does not count this voter's resolved seats");
  eq(w.PDXBallotWorkspace._decided(), 0, "a fresh visitor is not at zero decided");
  has(html, "we can resolve", "the progress figure does not say which figure it is");
  lacks(html, "seats decided", "the meter still claims to count decisions out of the whole ballot");
  lacks(html, "NaN", "the progress figure did not resolve");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The seat is the working surface");

{
  const w = boot();
  w.pdxBallotWorkspaceOpen(SEAT);
  const html = paint(w);
  const sm = w.PDXRaceSheet._seat(SEAT);
  has(html, "bw-desk", "the open seat has no panel");
  has(html, sm.label, "the panel does not name the seat it is showing");
  // Who holds it, or an honest statement that nobody resolvable does.
  ok(/Holds this seat now|No current officeholder resolved|District not mapped/.test(html),
    "the panel does not say who holds this seat");
  // The field, on the panel, with a pick control per candidate — not behind an
  // overlay and not two thousand lines down the document.
  has(html, "bw-field", "the field is not on the seat panel");
  const picks = (html.match(/pdxBallotWorkspacePick\('/g) || []).length;
  ok(picks >= 2, `the panel offers ${picks} pick controls for a field of 2+`);
  has(html, "Add to ballot", "the panel offers no way to take a pick");
  // And the full side-by-side is still one tap away, for a reader who wants it.
  has(html, `pdxOpenRaceSheet('${sm.key}')`, "the panel cannot hand off to the full sheet");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The formal record is the ruler, and the panel says so");

{
  // With stances set, the record lane can score, and the order must be the
  // record lane's order — not the roster order, not Direction Match's order.
  const w = boot();
  // Stances go into the LIVE set the match engine and the race sheet's axis()
  // both read, using real ISSUE_MAP keys — a made-up key is filtered out by
  // axis() and would silently make this whole block test the cold path.
  const KEYS = Object.keys(w.ISSUE_MAP || {}).slice(0, 4);
  must(KEYS.length >= 2, "ISSUE_MAP is empty, so the ranked path cannot be tested");
  KEYS.forEach((k) => w._alignIssues.add(k));
  must(w.PDXRaceSheet._axis().length >= 2, "the stances did not reach the shared axis");

  w.pdxBallotWorkspaceOpen(SEAT);
  const html = paint(w);
  const sm = w.PDXRaceSheet._seat(SEAT);
  const all = w.PDXRaceSheet._field(sm.key);
  const ranked = w.PDXRaceSheet._rank(all, "record", true);

  // THE RULER SENTENCE TRACKS WHAT ACTUALLY SCORED, NOT WHAT WAS ASKED FOR.
  // Having positions is not the same as the field having a record to read
  // against them. Whichever of the three cases this fixture lands in, the
  // sentence must describe THAT case — a blanket "Ordered by their formal
  // record" over an order the record never produced is a manufactured ranking,
  // which is the one claim this surface exists to refuse.
  has(html, "formal record", "the ruler never names the formal record at all");
  if (!ranked.ranked.length) {
    has(html, "no one in this field has a formal record",
      "nothing scored, yet the panel does not say so");
    lacks(html, "Ordered by",
      "the panel claims an order the record lane never produced");
    has(html, "officeholder first",
      "the panel hides how the field is actually listed when nothing scored");
  } else if (ranked.ranked.length < all.length) {
    has(html, `<b>${ranked.ranked.length} of ${all.length}</b>`,
      "a partly-scored field does not say how many the record could place");
    has(html, "not ranked among them",
      "the unscored remainder is not held out of the ranking in words");
  } else {
    has(html, "Ordered by", "a fully-scored field does not name its ruler");
  }
  // Both disclaimers survive in every case, whatever the sentence around them.
  ok(/[Pp]arty is never read here/.test(html),
    "the panel never says party is not read on this surface");
  ok(/Direction Match/.test(html),
    "the panel never mentions Direction Match as a non-ordering figure");
  lacks(html, "Ordered by party", "the field claims to be ordered by party");

  if (ranked.ranked.length >= 2) {
    // The painted order IS _rank's order. Read off the markup, not asserted from
    // the model twice.
    const order = (html.match(/showProfile\('([^']+)'\)/g) || [])
      .map((m) => m.slice(13, -2));
    const wanted = ranked.ranked.map((c) => c.pid);
    const seen = order.filter((p) => wanted.indexOf(p) >= 0);
    ok(seen.indexOf(wanted[0]) >= 0 && seen.indexOf(wanted[0]) < seen.indexOf(wanted[1]),
      "the painted field is not in the record lane's order");
    // A scored candidate gets a figure; an unscored one gets a reason and no
    // figure. Both bands are present in the markup and neither borrows the other.
    has(html, 'class="bw-score-n"', "a scoreable field printed no figure at all");
  } else { passed += 2; }
  if (ranked.gap.length) {
    ok(/No formal record on your issues yet|no readable direction yet/.test(html),
      "an unscored candidate has no reason printed in place of a figure");
  } else { passed++; }
}

{
  // THE THREE RULER CASES, FORCED. The shipped Utah fixture only exercises one
  // of them (whichever the real formal-pattern index supports today), so the
  // other two are driven by pinning the record lane's own return value. The
  // workspace reads the split through PDXRaceSheet._rank at paint time, so this
  // exercises the real render path — only the lane's verdict is controlled.
  const w = boot();
  Object.keys(w.ISSUE_MAP || {}).slice(0, 4).forEach((k) => w._alignIssues.add(k));
  w.pdxBallotWorkspaceOpen(SEAT);
  const all = w.PDXRaceSheet._field(w.PDXRaceSheet._seat(SEAT).key);
  must(all.length >= 2, "the fixture seat has no field to split");
  const realRank = w.PDXRaceSheet._rank;

  const pin = (nRanked) => {
    w.PDXRaceSheet._rank = () => ({
      ranked: all.slice(0, nRanked).map((c, i) => ({ ...c, score: 80 - i * 10, filed: true })),
      gap: all.slice(nRanked),
      unranked: nRanked === 0,
    });
    return paint(w);
  };

  // Every candidate placed: the plain claim is allowed, because it is true.
  const full = pin(all.length);
  has(full, "Ordered by <b>their formal record</b>",
    "a fully-scored field does not name the record as its ruler");
  lacks(full, " of " + all.length + "</b> ordered",
    "a fully-scored field still hedges with a partial count");

  // Some placed, some not: the count is stated and the remainder is explicitly
  // held out of the ranking, so a reader cannot mistake position for standing.
  const part = pin(1);
  has(part, "<b>1 of " + all.length + "</b> ordered by <b>their formal record</b>",
    "a partly-scored field does not state how many the record could place");
  has(part, "not ranked among them",
    "the unscored remainder is not held out of the ranking");

  // None placed, though positions are set: no order is claimed, and the real
  // listing rule is named instead.
  const none = pin(0);
  has(none, "no one in this field has a formal record",
    "an unscoreable field does not say the record is missing");
  has(none, "nothing to order them by",
    "an unscoreable field does not say why it is not ordered");
  has(none, "officeholder first",
    "an unscoreable field hides how it is actually listed");
  lacks(none, "Ordered by",
    "an unscoreable field still claims to be ordered");
  // Even here, DM is named only as something that orders nothing.
  has(none, "orders", "the unscoreable case drops the note that DM orders nothing");

  w.PDXRaceSheet._rank = realRank;
}

{
  // No stances at all: no numbers anywhere, one line saying what would change,
  // and the field still listed.
  const w = boot();
  w.pdxBallotWorkspaceOpen(SEAT);
  const html = paint(w);
  has(html, "not ranked", "with no positions the panel still claims an order");
  has(html, "Set your positions", "the panel does not say what would rank the field");
  ok((html.match(/Set your positions/g) || []).length <= 2,
    "the no-positions prompt is repeated as a stack");
  ok(!/class="bw-score-n"/.test(html), "the panel prints a match figure it cannot compute");
  has(html, "bw-field", "the field disappears when there are no positions");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Direction Match is printed, secondary, and orders nothing");

{
  const w = boot();
  w.pdxBallotWorkspaceOpen(SEAT);
  const html = paint(w);
  if (html.indexOf("bw-dm") >= 0) {
    has(html, "Direction Match", "the DM line is not labelled");
    has(html, "did they keep their own word", "the DM line does not state the question it answers");
    // Never in the number slot: the ruler's slot is .bw-score, and no DM figure
    // may appear inside it.
    const scoreSlots = html.match(/<span class="bw-score">[\s\S]*?<\/span><span class="bw-cand-who">/g) || [];
    scoreSlots.forEach((s) => lacks(s, "Direction Match", "Direction Match is in the ruler's number slot"));
  } else {
    passed++;
  }
  // The one sort in this file is _rank. Nothing else may order the field.
  const src = WORK;
  const sorts = (src.match(/\.sort\(/g) || []).length;
  eq(sorts, 0, "the workspace sorts the field itself instead of asking _rank");
  lacks(src, "_dm(c).pct >", "the workspace compares Direction Match figures");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · A pick stays on the surface and reaches every host");

{
  const w = boot();
  w.pdxBallotWorkspaceOpen(SEAT);
  const sm = w.PDXRaceSheet._seat(SEAT);
  const all = w.PDXRaceSheet._field(sm.key);
  const pick = all[0];

  w.pdxBallotWorkspacePick(sm.key, pick.pid);
  const html = paint(w);
  // The one store, written by the one writer.
  const sel = w._ballotLoad() || {};
  eq(sel[sm.key], pick.pid, "the pick did not reach the team store");
  eq(w.PDXBallotWorkspace._picked(sm.key), pick.pid, "the workspace cannot read back its own pick");
  eq(w.PDXBallotWorkspace._decided(), 1, "the running count did not move");

  // Rail, count and panel all move — that is the persistence the old surface
  // lost every time the reader changed seats.
  has(html, "Your pick", "the panel does not reflect the pick");
  has(html, pick.name, "the surface does not name the pick");
  has(html, "is-picked", "the rail chip does not show the seat as decided");
  has(html, "\u2713 Your pick", "the pick button did not become the picked state");
  has(html, "1<small>", "the progress figure did not count the pick");

  // And it reaches the OTHER hosts, because ballotPickCard is still the writer.
  w.PDXWhoRepresentsMe.sync();
  const wrm = String(w.document.getElementById("wrm-reps").innerHTML || "");
  has(wrm, "Your pick", "the seat list did not learn about the pick");

  // Replacing swaps rather than stacking: one pick per seat is the store's rule.
  if (all.length >= 2) {
    w.pdxBallotWorkspacePick(sm.key, all[1].pid);
    eq((w._ballotLoad() || {})[sm.key], all[1].pid, "replacing a pick did not swap it");
    eq(w.PDXBallotWorkspace._decided(), 1, "replacing a pick double-counted the seat");
  } else { passed += 2; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Next-seat continuity");

{
  const w = boot();
  const first = SEATS[0].key;
  w.pdxBallotWorkspaceOpen(first);
  let html = paint(w);
  has(html, "Next seat", "the panel offers no way on to the next seat");

  // The next seat offered is an UNDECIDED one. Sending a reader to a seat they
  // already decided is the loop stalling.
  const all = w.PDXRaceSheet._field(first);
  if (all.length) {
    w.pdxBallotWorkspacePick(first, all[0].pid);
    html = paint(w);
    const m = html.match(/pdxBallotWorkspaceOpen\('([^']+)'\)"\s+aria-label="Move to your next undecided seat/);
    ok(!!m, "the next-seat control does not name an undecided seat");
    if (m) ok(!w.PDXBallotWorkspace._picked(m[1]),
      `the next seat offered (${m[1]}) is already decided`);
  } else { passed += 2; }

  // Every seat decided → the loop ends somewhere honest, not on a dead "next".
  const w2 = boot();
  SEATS.forEach((s) => {
    const f = w2.PDXRaceSheet._field(s.key);
    if (f.length) w2.ballotPickCard(s.key, f[0].pid);
  });
  const done = w2.PDXBallotWorkspace._decided();
  const h2 = paint(w2);
  if (done === SEATS.length) has(h2, "Every seat decided", "a finished ballot still says 'next seat'");
  else has(h2, "Next seat", "an unfinished ballot lost its next-seat control");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · Thin, empty and unmapped are four different sentences");

{
  // Zero on file. Not a comparison, not a dead end, and it says what would fill
  // it in — the same honesty the race sheet's own empty state carries.
  const w = boot();
  const empty = SEATS.filter((s) => w.PDXRaceSheet._field(s.key).length === 0 &&
    w.PDXBallotWorkspace._gate(s, w.pdxRepsForMe()) === "ok")[0];
  if (empty) {
    w.pdxBallotWorkspaceOpen(empty.key);
    const html = paint(w);
    has(html, "Nobody is on file for this seat yet", "an empty field is not stated honestly");
    has(html, "not a finding about the race", "an empty field reads as a finding about the race");
    lacks(html, "bw-field", "an empty seat paints a field list anyway");
    ok(!/class="bw-score-n"/.test(html), "an empty seat prints a score");
  } else { passed += 4; }

  // One on file. A field of one is not a comparison and must say so.
  const w1 = boot();
  const one = SEATS.filter((s) => w1.PDXRaceSheet._field(s.key).length === 1)[0];
  if (one) {
    w1.pdxBallotWorkspaceOpen(one.key);
    const html = paint(w1);
    has(html, "No other person on file", "a field of one is presented as a comparison");
    has(html, "not a claim that the seat is unopposed", "a field of one reads as a finding about the seat");
    has(html, "pdxBallotWorkspacePick", "a field of one cannot be picked");
    lacks(html, "Ordered by", "a field of one claims to have been ordered");
  } else { passed += 4; }
}

{
  // An unmapped district. THE RULE THIS EXISTS FOR: a Columbus voter must never
  // be shown Utah's House field. The gate says 'district' and the panel says why.
  const w = boot({ location: { state: "Ohio", city: "Columbus", county: "Franklin County" } });
  const r = w.pdxRepsForMe();
  const house = SEATS.filter((s) => s.key === "house")[0];
  ok(!!house, "the ballot has no U.S. House seat to test the district gate on");
  if (house) {
    eq(w.PDXBallotWorkspace._gate(house, r), "district",
      "an unmapped district seat is not gated");
    w.pdxBallotWorkspaceOpen("house");
    const html = paint(w);
    has(html, "isn’t mapped for your area yet", "the unmapped district is not explained");
    has(html, "Utah", "the panel does not say which districts are mapped");
    lacks(html, "bw-field", "an unmapped district seat paints a field anyway");
    // The statewide seats DO resolve outside Utah, and the panel says so rather
    // than leaving the reader thinking the whole ballot is unavailable.
    has(html, "statewide seats", "the panel does not point at the seats that do resolve");
    // No Utah officeholder leaked into an Ohio reader's House seat.
    lacks(html, "Holds this seat now", "an unmapped seat names a holder");
  }
}

{
  // Local offices. Curated area by area; where they are not curated the panel
  // says exactly that instead of painting an empty list.
  const w = boot();
  const local = SEATS.filter((s) => s.key === "local")[0];
  if (local) {
    const gate = w.PDXBallotWorkspace._gate(local, w.pdxRepsForMe());
    ok(gate === "ok" || gate === "localgap" || gate === "nolocation",
      `the local gate returned an unknown state: ${gate}`);
    w.pdxBallotWorkspaceOpen("local");
    const html = paint(w);
    if (gate === "localgap") {
      has(html, "Local offices aren’t mapped", "an uncurated local area is not stated");
      lacks(html, "bw-field", "an uncurated local area paints a field");
    } else {
      ok(html.indexOf("bw-desk") >= 0, "the local seat has no panel");
    }
  } else { passed += 2; }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · No party, no location guess");

{
  const w = boot();
  w.pdxBallotWorkspaceOpen(SEAT);
  const html = paint(w);
  ["Republican", "Democrat", "(R)", "(D)", "party-", "GOP"].forEach((t) =>
    lacks(html, t, `the workspace prints "${t}"`));
  // Nor does the source read it.
  lacks(WORK, ".party", "the workspace source reads a party field");
  // No party SELECTOR — the file's own comment says party is never read, which is
  // the sentence, not the violation.
  ok(!/[.#[][a-z0-9_-]*party/i.test(CSS), "the workspace stylesheet has a party rule");

  // No location → one action, no ballot, no names.
  const cold = boot({ located: false });
  const h = paint(cold);
  has(h, "Set my location", "the cold state does not offer the one action that unblocks it");
  lacks(h, "bw-rail", "the cold state paints a rail for a ballot it cannot resolve");
  lacks(h, "Holds this seat now", "the cold state names an officeholder");
  lacks(h, "decided", "the cold state shows a progress count");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · The brochure and the duplicate tool are demoted, not deleted");

{
  // The pitch is hidden by ONE attribute, set from the same located read the
  // workspace paints from. Markup untouched; remove the attribute and it is back.
  has(CSS, '#voter-hub[data-bw-working="1"]', "the brochure demotion has no rule");
  [".vh-compare-frame", ".vh-path-section", ".vh-cta-row", ".vh-reassure"].forEach((sel) =>
    has(CSS, sel, `the brochure demotion does not cover ${sel}`));
  // All four still ship — this is a demotion, not a deletion.
  [".vh-compare-frame", "vh-path-steps", "vh-cta-row", "vh-reassure"].forEach((sel) =>
    has(HTML, sel, `${sel} was deleted rather than demoted`));

  const w = boot();
  paint(w);
  eq(w.document.getElementById("voter-hub").getAttribute("data-bw-working"), "1",
    "a located reader still gets the cold-arrival pitch");
  const cold = boot({ located: false });
  paint(cold);
  eq(cold.document.getElementById("voter-hub").getAttribute("data-bw-working"), null,
    "a cold arrival lost the pitch that is written for it");

  // The second one-race-at-a-time tool is hidden, and its API still answers.
  ok(/<section id="race-focus"[^>]*\shidden>/.test(HTML),
    "the duplicate one-race tool is still shown");
  has(HTML, "race-focus-body", "the duplicate tool's engine lost its mount");

  // The seat list's "What now?" stack is one action into the workspace.
  has(WRM, "pdxBallotWorkspaceOpen", "the seat list has no way into the workspace");
  const w2 = boot();
  w2.PDXWhoRepresentsMe.sync();
  const wrm = String(w2.document.getElementById("wrm-reps").innerHTML || "");
  lacks(wrm, "What now?", "the seat list still paints a 'What now?' menu");
  lacks(wrm, "wrm-nextlabel", "the menu label survived the restructure");
  // Exactly one LEAD action, and it is the loop. The older destinations survive —
  // the scope note above depends on the local one, and team-building has to stay
  // marked optional — but one weight down, so the end of the list reads as one
  // next step rather than four peers.
  eq((wrm.match(/wrm-next-btn--lead/g) || []).length, 1,
    "the seat list does not have exactly one lead action");
  has(wrm, "Work my ballot", "the seat list does not lead into the workspace");
  ok(wrm.indexOf("Work my ballot") < wrm.indexOf("Compare them on an issue"),
    "the loop is not the first thing offered after the lookup");
  ok((wrm.match(/wrm-next-btn--sub/g) || []).length >= 2,
    "the older destinations were deleted rather than demoted");
  has(wrm, "(optional)", "team building stopped reading as optional");
  // And the tap target survived the restructure.
  has(HTML, ".wrm-next-btn{", "the next-action button lost its styles");

  // Every seat row carries the workspace entry too, so "open a seat" works from
  // the list as well as from the rail.
  has(wrm, "rs-seat-work", "the seat rows lost the workspace entry");
  has(wrm, "Work this seat", "the seat rows do not offer to work the seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · Degrades without the workspace, and never double-hooks");

{
  // The one hard requirement of an additive surface: everything that shipped
  // before still works when this file does not load.
  const w = boot({ withoutWorkspace: true });
  w.PDXWhoRepresentsMe.sync();
  const wrm = String(w.document.getElementById("wrm-reps").innerHTML || "");
  has(wrm, "rs-seat-strip", "the seat strip broke without the workspace");
  lacks(wrm, "rs-seat-work", "the strip paints a workspace control the page cannot honour");
  has(wrm, "Work your ballot", "the seat list has no fallback way on");
  ok(typeof w.pdxOpenRaceSheet === "function", "the race sheet broke without the workspace");

  // The pick writer is wrapped, not replaced, and wrapping is idempotent — a
  // double boot must not stack two repaints on one pick.
  const w2 = boot();
  ok(w2.ballotPickCard.__bwPick === true, "the workspace did not hook the pick writer");
  const before = w2.ballotPickCard;
  w2.PDXBallotWorkspace.sync();
  eq(w2.ballotPickCard, before, "a repaint re-wrapped the pick writer");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · The rail outranks the address it arrived on");

// THE BUG THIS SECTION EXISTS FOR. /ballot?seat=house painted House, and then
// U.S. Senate, Governor and State House were dead chips: tapping one called
// pdxBallotWorkspaceOpen, which wrote the new seat and asked for a repaint, and
// the repaint re-read ?seat= and put House back. Arriving with no query worked
// perfectly, which is the tell — the rail was never broken, the address was
// outranking it on every paint.
//
// So the claim here is about ORDER, not about one tap. A paint is not a one-off
// on this surface: a pick repaints, a location change repaints, the roster
// arriving repaints, and three settle timers repaint. Every assertion below
// therefore paints AGAIN after the tap, because the first paint was never the
// one that lost the reader's choice.
{
  // Named seats, not indexes, because the bug report is about specific chips —
  // and this breaks loudly if the seat model renames them rather than passing
  // vacuously.
  const KEYS = SEATS.map((x) => x.key);
  ["senate", "house", "governor", "statehouse"].forEach((k) =>
    must(KEYS.indexOf(k) >= 0, `the fixture ballot no longer has a "${k}" seat`));

  // The open seat as the RAIL reports it, which is what the reader sees.
  const openKey = (html) => {
    const m = String(html).match(/<button[^>]*class="bw-seat is-open[^"]*"[^>]*data-sk="([^"]+)"/);
    return m ? m[1] : "";
  };

  // ── 1. The arriving key still wins the FIRST seat ─────────────────────────
  {
    const w = boot({ search: "?seat=house" });
    eq(openKey(paint(w)), "house", "boot /ballot?seat=house does not open the House seat");
  }

  // ── 2. A rail tap beats it, and the address follows ───────────────────────
  {
    const w = boot({ search: "?seat=house" });
    eq(openKey(paint(w)), "house", "the arrival did not open House before the tap");

    w.pdxBallotWorkspaceOpen("governor");
    eq(openKey(paint(w)), "governor", "tapping Governor in the rail did not change the desk");
    ok(w.location.search.indexOf("seat=house") < 0,
      `the address still names the arriving seat (search is "${w.location.search}")`);
    has(w.location.search, "seat=governor", "the address does not name the open seat");

    // THE REPAINTS. Each of these is a real trigger in the browser, and each one
    // used to hand the desk back to ?seat=house.
    eq(openKey(paint(w)), "governor", "a second paint snapped the desk back to the arriving seat");
    const sm = w.PDXRaceSheet._seat("governor");
    const field = w.PDXRaceSheet._field(sm.key);
    if (field.length) {
      w.pdxBallotWorkspacePick(sm.key, field[0].pid);
      eq(openKey(paint(w)), "governor", "taking a pick snapped the desk back to the arriving seat");
    } else { passed += 1; }
    w.PDXBallotWorkspace.sync();
    eq(openKey(paint(w)), "governor", "a sync() snapped the desk back to the arriving seat");

    // ── AND IT IS ONE HISTORY ENTRY, NOT ONE PER CHIP ───────────────────────
    // Six seats worth of tapping must still leave Back meaning "the page I came
    // from", not "the seat before this one".
    ["senate", "statehouse", "house", "governor"].forEach((k) => w.pdxBallotWorkspaceOpen(k));
    eq(openKey(paint(w)), "governor", "walking the rail did not leave the desk on the last seat tapped");
    has(w.location.search, "seat=governor", "walking the rail left the address on an earlier seat");
    eq(w.__nav.filter((x) => x.indexOf("push:") === 0).length, 0,
      "a seat change pushed a history entry — Back now means \"the previous seat\"");
    eq(w.__nav.filter((x) => x.indexOf("assign:") === 0).length, 0,
      "a seat change navigated; opening a seat must repaint in place");
  }

  // ── 3. No query: the first undecided seat, and the rail still switches ────
  {
    const w = boot({ search: "" });
    const first = SEATS.filter((x) => !w.PDXBallotWorkspace._picked(x.key))[0];
    must(!!first, "the fixture ballot boots with every seat already decided");
    eq(openKey(paint(w)), first.key, "boot /ballot with no query does not open the first undecided seat");

    w.pdxBallotWorkspaceOpen("statehouse");
    eq(openKey(paint(w)), "statehouse", "with no query, tapping the rail did not change the desk");
    eq(openKey(paint(w)), "statehouse", "with no query, a repaint moved the desk off the tapped seat");
    // CORRECT A KEY, NEVER ADD ONE. A clean /ballot stays clean: there is
    // nothing in it contradicting the desk, so there is nothing to fix.
    eq(w.location.search, "", `a bare /ballot grew a query string ("${w.location.search}")`);
    eq(w.__nav.length, 0, "a bare /ballot was rewritten when there was no wrong key in it");
  }

  // ── 4. Next seat goes through the same funnel ─────────────────────────────
  {
    const w = boot({ search: "?seat=house" });
    eq(openKey(paint(w)), "house", "the arrival did not open House before Next seat");
    ok(w.pdxBallotWorkspaceNext() !== false, "the Next-seat control refused to move");
    const moved = openKey(paint(w));
    ok(moved && moved !== "house", `Next seat left the desk on the arriving seat (${moved})`);
    eq(openKey(paint(w)), moved, "Next seat moved and then a repaint snapped back to ?seat=");
    ok(w.location.search.indexOf("seat=house") < 0,
      `Next seat left the arriving key in the address ("${w.location.search}")`);
    has(w.location.search, "seat=" + moved, "Next seat did not carry the address with it");
  }

  // ── 5. The choice survives WITHOUT the address rewrite ────────────────────
  // The rewrite is for the reader's benefit — an address they can share and
  // reload. It is not the mechanism that holds the open seat, and this is the
  // assertion that keeps those two things separate: with no history API at all,
  // ?seat=house is still in the bar and the desk must still stay on Governor.
  {
    const w = boot({ search: "?seat=house", noHistory: true });
    eq(openKey(paint(w)), "house", "without history, the arrival did not open House");
    w.pdxBallotWorkspaceOpen("governor");
    eq(openKey(paint(w)), "governor", "without history, the rail could not change the desk");
    eq(openKey(paint(w)), "governor",
      "the open seat is held by the URL rewrite rather than by the desk — one failed replaceState and the bug is back");
    has(w.location.search, "seat=house", "the no-history fixture is not testing what it claims to");
  }

  // ── 6. An unknown or foreign key still falls through, unchanged ───────────
  // The existing rule this pass must not break: a ?seat= naming a race this
  // voter cannot vote falls through to the normal default rather than painting
  // somebody else's ballot.
  {
    const w = boot({ search: "?seat=notaseat" });
    const first = SEATS.filter((x) => !w.PDXBallotWorkspace._picked(x.key))[0];
    eq(openKey(paint(w)), first.key, "an unknown ?seat= was not ignored in favour of the normal default");
    eq(w.location.search, "?seat=notaseat",
      "an unknown ?seat= was rewritten; nothing opened, so there was nothing to correct it to");
    w.pdxBallotWorkspaceOpen("governor");
    eq(openKey(paint(w)), "governor", "the rail could not switch away from an unknown arriving key");
    has(w.location.search, "seat=governor", "the address kept an unknown key after a real seat opened");
  }

  // ── 7. ?seat= is the ONLY arrival key on this desk ────────────────────────
  // The bug asked for the same fix on "any other arrival key (hash, data-seat)"
  // that beats the rail. There is none, and this is the assertion that keeps it
  // that way: the desk reads location.search for a seat and nothing else, so a
  // future hash or data-attribute opener has to come through
  // pdxBallotWorkspaceOpen — where the reader's choice is recorded — or fail here.
  {
    const code = WORK.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
    ok(!/location\.hash/.test(code.replace(/#my-stances/g, "")) || !/hash[^;]*seat/i.test(code),
      "the desk reads a seat out of location.hash without going through the one opener");
    ok(!/getAttribute\(\s*['"]data-seat/.test(code) && !/dataset\.seat/.test(code),
      "the desk reads a seat out of a data-seat attribute without going through the one opener");
    // And the address rewrite is a replace, never a push, in the source too.
    ok(/history\.replaceState|h\.replaceState/.test(code), "the desk never corrects the address at all");
    ok(!/\.pushState\(/.test(code), "the desk pushes a history entry when it changes seats");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · A Work seat control on the /me desk lands on that seat's desk");

// WHY THIS LIVES HERE AND NOT ON THE DESK. The /me desk prints one "Work seat"
// control per office. The claim under test is not that the control is styled or
// that the row highlights — it is that pressing it ARRIVES, on this workspace,
// with that office open. Half of that is the desk's job (does it print the
// address?) and half is this file's (does that address open that seat?), and
// this file owns the expensive half: the roster, the seat model, the rail and
// the paint are already standing up here.
//
// So the two halves are asserted where each one can actually be observed.
// test-me-snapshot.mjs section 5 resolves the desk's painted Senate row and
// asserts the href is /ballot?seat=senate and that the control is an anchor
// rather than a button that only restyles the row. Here the SAME address the
// desk builds is taken out of me-desk.js and driven through the real boot.
//
// The failure mode this catches is a link that looks right and opens the wrong
// desk: a Work seat pointing at bare /ballot (arrive on the first undecided
// seat, not the one pressed), at #senate (the desk reads no hash — section 12
// pins that), or at a key the seat model does not use.
{
  const DESK = R("me-desk.js");

  // The desk's own expression, not a copy of it. If the template moves, this
  // extraction fails loudly rather than testing a string this file invented.
  const cta = /class="me-work" href="([^"]*)'\s*\+\s*encodeURIComponent\(([^)]+)\)/.exec(DESK);
  must(!!cta, "me-desk.js no longer builds the Work seat control as one href + an encoded seat key");
  eq(cta[1], "/ballot?seat=", `the Work seat control points somewhere else now ("${cta && cta[1]}")`);
  has(cta[2], "key", "the Work seat control encodes something other than the seat's key into the address");

  // U.S. Senate, named, because the brief names it — and because a vacuous pass
  // on a seat the fixture does not carry would prove nothing.
  const senate = SEATS.filter((x) => x.key === "senate")[0];
  must(!!senate, "the fixture ballot no longer carries a U.S. Senate seat");
  has(String(senate.label).toLowerCase(), "senate",
    `the seat keyed "senate" is not the Senate row a reader would press ("${senate.label}")`);

  // Build the href exactly as the desk does, then arrive on it the way a
  // browser would: parse the address, hand the workspace only its query.
  const href = cta[1] + encodeURIComponent(senate.key);
  eq(href, "/ballot?seat=senate", `the desk would print "${href}" for the Senate row`);
  const arrival = new URL(href, "https://politidex.example");
  eq(arrival.pathname, "/ballot", "the Work seat control leaves the ballot room to open a seat");

  const openKey = (html) => {
    const m = String(html).match(/<button[^>]*class="bw-seat is-open[^"]*"[^>]*data-sk="([^"]+)"/);
    return m ? m[1] : "";
  };

  {
    const w = boot({ search: arrival.search });
    eq(openKey(paint(w)), "senate",
      "pressing Work seat on the Senate row does not open the Senate desk");

    // AND IT IS THE DESK, NOT JUST A HIGHLIGHT. The seat that opened has to be
    // the one the workspace is actually working: its field is on the page and
    // its own name is in the desk, not only in the rail.
    const sheet = paint(w);
    const body = sheet.slice(sheet.indexOf("bw-seat is-open"));
    has(body, senate.label, "the Senate desk opened without naming the office being worked");
    const sm = w.PDXRaceSheet._seat("senate");
    must(!!sm, "the seat model does not know the key the Work seat control sends");
    ok(w.PDXRaceSheet._field(sm.key).length > 0,
      "the Senate desk opened with no field to work — the arrival opened a shell");
  }

  // A SECOND PRESS IS NOT A TRAP. A reader who worked Governor, went back to
  // /me and pressed Work seat on Senate arrives on Senate; the rail's memory of
  // the earlier seat is not allowed to outrank a fresh arrival from the desk.
  {
    const w = boot({ search: arrival.search });
    eq(openKey(paint(w)), "senate", "the first arrival did not open Senate");
    w.pdxBallotWorkspaceOpen("governor");
    eq(openKey(paint(w)), "governor", "the rail could not move off an arriving Senate");
    const back = boot({ search: arrival.search });
    eq(openKey(paint(back)), "senate",
      "arriving again from the desk did not reopen Senate — a stale seat outranks the control pressed");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log(
  `\n${failures.length ? "✗" : "✓"} ballot workspace: ${passed} checks passed` +
  (failures.length ? `, ${failures.length} failed` : "")
);
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  process.exit(1);
}
