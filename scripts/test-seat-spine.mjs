#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-seat-spine.mjs — Who Represents Me → seat → compare the field → team
// ─────────────────────────────────────────────────────────────────────────────
// A voter's election path has exactly four steps, in one order:
//
//     set location → my seats → compare the field for a seat → pick for my team
//
// Every one of those steps already existed somewhere in the product. What did
// not exist was a SPINE: one seat row that carries all of it, painted the same
// way by every surface that lists seats, so a cold visitor never has to learn
// the Alignment Tool, open a full profile, or browse seven hundred strangers
// ranked by a number to answer "who do I vote for".
//
// This file guards the spine, and in particular the places it could quietly
// start lying:
//
//   1. ONE HELPER, AND NOW ONE HOST. window.pdxSeatStrip owns the seat contract
//      and Who Represents Me is the only surface that renders it. The Voter Hub
//      used to paint the same roster from _vhSyncDistrictStrip, and this file
//      used to prove the two hosts agreed strip-for-strip. They cannot disagree
//      now: the second renderer is gone, so the assertion inverted — the hop
//      survives and paints nothing into the host it used to own.
//   2. COMPARE IS ON THE SEAT, NOT BEHIND A PROFILE. Activating it opens the
//      race sheet for THAT seat key, from a seat list, with no profile in
//      between.
//   3. NO LOCATION → A CTA, NEVER A GUESS. The cold state is static markup in
//      index.html rather than a second renderer's own wording, so it reads
//      correctly in the first frame; the seat host paints nothing until a
//      location lands. Either way not one officeholder is named, because with
//      no location there is no honest answer to "who is my House member".
//   4. AN UNMAPPED SEAT STAYS EMPTY. "Not resolved yet", no invented name, and
//      the compare control still offered where a field exists.
//   5. ZERO STANCES STILL COMPARES. The strip says how to rank the race in one
//      line, the sheet still opens, and the sheet's own no-stances honesty
//      (no numbers, fixed order) is untouched.
//   6. A PICK REACHES THE SEAT ROW. Adding from the sheet writes the one team
//      store and the seat row's chip reflects it — same store My Voting Team
//      reads, no second copy.
//   7. THE SPINE COMES FIRST. Represents-me markup precedes the all-politicians
//      research surfaces in the document, and no Door-2 headline still sells
//      "browse everyone by score" as the way to find your ballot. The Voter
//      Hub's slot in that order is now held by a LINK back to the band rather
//      than by a copy of it.
//   8. NO PARTY, NO FAKE MATCH. Not in the strip, not in the seat rows.
//   9. NOTHING DRIFTED. Direction Match and both Your Match lanes are
//      byte-identical with the whole spine loaded.
//
//   node scripts/test-seat-spine.mjs
//
// Real shipped modules in a node:vm sandbox, the real location resolver, the
// real ballot roster and the real team store — plus a mini-DOM, because every
// claim here is about something painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The engine stack the sheet needs, plus the three seat hosts: the resolver
// (voter-hub-location.js), the homepage band (who-represents-me.js) and the
// ballot store (ballot-breakdown.js).
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
const HTML = R("index.html");
const RS_CSS = R("race-sheet.css");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// The shared sandbox returns null from every lookup. The hosts here all paint
// into an element they look up by id, so the registry has to pre-create those
// ids or every surface silently no-ops and every assertion below is vacuous.
function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
      removeAttribute(k) { delete this["attr_" + k]; },
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
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  if (!opts.withoutSheet) vm.runInContext(SHEET, sandbox, { filename: "race-sheet.js" });
  win.PROFILES = win.CMP_DATA;
  win.__store = store;
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
  console.error(`✗ seat spine: ${msg}`);
  process.exit(1);
};

// ── Boot asserts ─────────────────────────────────────────────────────────────
const probe = boot();
must(typeof probe.pdxSeatStrip === "function",
  `pdxSeatStrip is not exposed — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.pdxRaceSheetEntry === "function", "pdxRaceSheetEntry is not exposed");
must(typeof probe.pdxRepsForMe === "function", "the location resolver is not loaded");
must(typeof probe._ballotLoad === "function", "the team store is not loaded");
must(probe.PDXWhoRepresentsMe && typeof probe.PDXWhoRepresentsMe.sync === "function",
  "who-represents-me.js did not export sync()");
must(typeof probe._vhSyncDistrictStrip === "function", "the Voter Hub district strip is not loaded");

const REPS0 = probe.pdxRepsForMe();
must(REPS0 && REPS0.located, "the Utah fixture no longer resolves as located");
must(REPS0.levels.length === 6, `expected 6 seat levels, got ${REPS0.levels.length}`);

// A seat with a real field, and a seat the resolver leaves unresolved for this
// fixture. Both taken from the live resolver, so this file breaks if the seat
// model moves — which is the point.
const COMPARABLE = REPS0.levels.filter((l) => probe.pdxRaceSheetEntry(l.key, {}) !== "").map((l) => l.key);
must(COMPARABLE.length >= 1, "no seat level maps to a comparable race key any more");
// The fixture seat is a LEVEL key with a real rostered field behind it, taken
// from the live resolver + the live roster. Not every level has one — the Provo
// fixture holds no U.S. House challengers — and a seat with an empty field would
// make the pick assertions vacuous rather than failing them.
const SEAT = COMPARABLE.filter(
  (k) => probe.PDXRaceSheet._field(probe.PDXRaceSheet._seat(k).key).length >= 2
)[0];
must(SEAT, "no seat level in the fixture has a field of 2+ candidates any more");

const wrmHtml = (win) => {
  win.PDXWhoRepresentsMe.sync();
  const h = win.document.getElementById("wrm-reps");
  return h ? String(h.innerHTML) : "";
};
const vhHtml = (win) => {
  win._vhSyncDistrictStrip();
  const h = win.document.getElementById("vh-district-strip");
  return h ? String(h.innerHTML) : "";
};
const sheetHtml = (win, seat) => {
  win.pdxOpenRaceSheet(seat);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One helper owns the seat contract — and one host renders it");

{
  const w = boot();
  const strip = w.pdxSeatStrip(SEAT, { compact: true });
  has(strip, 'class="rs-seat-strip"', "pdxSeatStrip returns the strip wrapper");
  has(strip, "rs-seat-team", "the strip carries a team-state chip");
  has(strip, "rs-entry", "the strip carries the compare control");

  const wrm = wrmHtml(w);
  has(wrm, "rs-seat-strip", "Who Represents Me renders the shared strip");
  const stripsIn = (html) => (html.match(/data-rs-seat-probe|rs-seat-strip/g) || []).length;
  ok(stripsIn(wrm) >= 1, "the one seat host painted no strip at all");

  // THE SECOND HOST IS GONE, AND THAT IS THE CLAIM NOW. This used to read
  // eq(stripsIn(wrm), stripsIn(vh)) — the two hosts had to agree seat-for-seat,
  // because the Voter Hub painted its own copy of this roster from
  // _vhSyncDistrictStrip. Agreement was the best that arrangement could offer,
  // and it was not enough: the copy shipped its own spelling of every empty
  // state, so it said "Not resolved yet" on a House seat the map had placed.
  // The hop still exists and is still called by five guarded callers; what it
  // does now is empty the host and forward to the owner. So the assertion is
  // no longer "the same" — it is "nothing".
  eq(vhHtml(w), "", "the retired Voter Hub roster is painting seat rows again");
  eq(stripsIn(vhHtml(w)), 0, "a second host is rendering the shared seat strip");

  // A seat key the sheet does not understand yields nothing at all, rather than
  // an empty team slot for an office we cannot name.
  eq(w.pdxSeatStrip("dogcatcher", {}), "", "an unknown seat key yields no strip");
  eq(w.pdxSeatStrip("", {}), "", "an empty seat key yields no strip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Compare is on the seat row, and it opens THAT seat");

{
  const w = boot();
  const wrm = wrmHtml(w);
  has(wrm, "Compare field for this seat", "the seat list offers the compare control");
  // The control names the seat key it will open — that is the whole handshake.
  const opens = (wrm.match(/pdxOpenRaceSheet\('([^']+)'\)/g) || [])
    .map((m) => m.slice(18, -2));
  ok(opens.length >= 1, "no compare control in the seat list carries a seat key");
  ok(opens.indexOf(w.PDXRaceSheet._seat(SEAT).key) >= 0,
    `the ${SEAT} seat row does not open the ${SEAT} race sheet`);
  // Every key it offers is one the sheet can actually open.
  opens.forEach((k) => ok(!!w.PDXRaceSheet._seat(k),
    `a seat row offers "${k}", which the sheet cannot open`));

  // Activating it really opens the sheet, on that seat, with no profile in
  // between — the "do not require opening a full profile" clause.
  const rk = w.PDXRaceSheet._seat(SEAT).key;
  const html = sheetHtml(w, rk);
  ok(html.length > 200, "activating the seat compare painted nothing");
  has(html, "rs-rankline", "the race sheet overlay did not open from the seat row");
  const ov = w.document.getElementById("pdx-racesheet-overlay");
  ok(ov && ov.style.display === "flex", "the sheet opened but stayed hidden");

  // The row itself is still the profile link; the strip is a SIBLING, never
  // nested inside the role="button" row.
  const rowIdx = wrm.indexOf('class="wrm-row');
  const stripIdx = wrm.indexOf("rs-seat-strip");
  ok(rowIdx >= 0 && stripIdx > rowIdx, "the strip is not painted after a seat row");
  lacks(wrm.replace(/<div class="wrm-seatcompare">[\s\S]*?<\/div>/g, ""), "rs-entry",
    "a compare control leaked outside its .wrm-seatcompare wrapper");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · No location → a CTA, never a guessed officeholder");

// The cold state the reader actually meets. #wrm-reps stays empty and the
// section drops data-located, which is what uncovers .wrm-cold — static markup,
// so the ask is on the page in the first frame, before a script has run. That
// is the whole mechanism; there is no renderer to interrogate.
const COLD_BAND = HTML.slice(HTML.indexOf('id="who-represents-me"'), HTML.indexOf('id="wrm-reps"'));
const SCOPE_RULE = HTML.slice(HTML.indexOf('class="wrm-scope"'), HTML.indexOf('class="wrm-scope"') + 1600);

{
  const w = boot({ located: false });
  const wrm = wrmHtml(w);
  eq(wrm, "", "the homepage seat band painted rows with no location");
  const sec = w.document.getElementById("who-represents-me");
  eq(sec.getAttribute("data-located"), null, "the band still claims to be located");

  // WHY THIS BLOCK NO LONGER READS A SECOND BLOCK'S OUTPUT. The Voter Hub copy
  // carried its own no-location card: its own heading, its own "Set my
  // location" button, its own statement of the rule. All three of those now
  // have exactly one home, and none of them is a renderer.
  eq(vhHtml(w), "", "the retired Voter Hub block is asking for a location again");
  const host = w.document.getElementById("vh-district-strip");
  eq(String(host.style.display), "none", "the emptied host is still taking up space");

  ok(COLD_BAND.length > 2000, "the cold represents-me markup is missing from index.html");
  has(COLD_BAND, "Set my location", "no set-location CTA in the cold represents-me band");
  has(COLD_BAND, "Find who represents you", "the cold band dropped the first step of the path");
  has(HTML, ".wrm[data-located] .wrm-cold{display:none;}",
    "the cold block is not the thing that gets uncovered when no location is set");
  // The rule the product follows, stated once, in the band that follows it.
  has(SCOPE_RULE, "rather than name someone else", "the band does not state the blank-row rule");

  // The honesty clause, unchanged in substance: with no location not one
  // officeholder is named — not by the band's output, and not by its markup.
  const names = Object.keys(w.CMP_DATA || {})
    .map((pid) => (w.CMP_DATA[pid] || {}).name)
    .filter((n) => n && n.length > 6);
  const named = names.filter((n) => wrm.indexOf(n) >= 0 || COLD_BAND.indexOf(n) >= 0);
  eq(named.length, 0, `the cold band named ${JSON.stringify(named.slice(0, 3))}`);
  lacks(COLD_BAND, "rs-seat-team", "the cold band shows a team slot for a seat it cannot name");
  lacks(COLD_BAND, "Compare field for this seat", "the cold band offers a compare for an unknown seat");
}

// National focus is a location without seats. Six blank rows under "the people
// who hold power in your state" would read as a coverage failure; it is a scope
// the visitor chose, so the band asks for a state instead — through the same
// cold markup a first visit gets, since "National" resolves no seat either.
// (The retired copy had its own "Pick my state" button. The locbar's Detect /
// Change on map / Set my location are that door now, and there is one of them.)
{
  const w = boot({ location: { state: "National", city: "", county: "", district: "" } });
  const wrm = wrmHtml(w);
  eq(wrm, "", "national focus painted seat rows for a scope with no seats");
  eq(w.document.getElementById("who-represents-me").getAttribute("data-located"), null,
    "national focus claims to be located, which hides the state-picking CTA");
  const reps = w.pdxRepsForMe();
  eq((reps.levels || []).filter((l) => l.resolved).length, 0,
    "national focus resolved a seat it cannot have");
  eq(vhHtml(w), "", "the retired Voter Hub block is painting a national-focus card again");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · An unmapped seat stays honestly empty");

{
  // A state we hold statewide seats for but draw no legislative districts in.
  const w = boot({ location: { state: "Texas", city: "Austin", county: "Travis", district: "" } });
  const reps = w.pdxRepsForMe();
  eq(reps.districtsResolvable, false, "the fixture state unexpectedly has mapped districts");
  const unresolved = reps.levels.filter((l) => !l.resolved);
  ok(unresolved.length >= 1, "the fixture no longer has an unresolved seat");

  const wrm = wrmHtml(w);
  has(wrm, "wrm-row--unresolved", "an unresolved seat is not marked as such");
  has(wrm, "Not resolved for your area yet", "an unresolved district seat does not say so");
  // No name, no district number invented for it.
  lacks(wrm, "Being confirmed", "an unresolved seat still uses the old hedging copy");
  const distLabels = unresolved.map((l) => l.distLabel);
  distLabels.forEach((d) => ok(!/District \d/.test(d),
    `an unresolved seat claims a district number: ${d}`));
  // The count is stated rather than implied, so a partial answer reads partial.
  has(wrm, " of 6 seats resolved", "the seat list no longer states how many it resolved");
  // …and it still offers the compare, because a seat with no known officeholder
  // can still have a field worth reading.
  has(wrm, "rs-seat-strip", "an unresolved seat lost its strip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Zero stances: the compare still opens, honestly");

{
  const w = boot();
  eq(w.PDXRaceSheet._axis().length, 0, "the fixture visitor already has positions");
  const strip = w.pdxSeatStrip(SEAT, {});
  has(strip, "Set stances to rank this race", "no stance line for a visitor with no positions");
  // THE LINE IS AN ANCHOR NOW, NOT A CALL INTO A MODULE THAT MAY NOT BE HERE.
  //
  // This used to assert the markup mentioned PDXStances, because the control
  // called PDXStances.open() and fell back to a fragment when the module was
  // absent — which on this document it always is. The fragment named no section
  // here, so the line did nothing at all for exactly the reader it was written
  // for. /my-stances is a document now, so the line is a real <a href> with
  // ?add=1 on it, and it works whether or not any stance module ever parsed.
  has(strip, 'href="/my-stances?add=1"', "the stance line does not lead to the stance studio");
  ok(!/PDXStances/.test(strip),
    "the stance line still calls into a module this document does not load");
  // A line, not a lecture.
  ok(strip.split("Set stances to rank this race").length === 2,
    "the stance line is repeated");
  lacks(strip, "%", "the strip shows a percentage it cannot honestly read");

  // Compare still opens, and the sheet's own no-stances honesty is untouched.
  const rk = w.PDXRaceSheet._seat(SEAT).key;
  const html = sheetHtml(w, rk);
  has(html, "it is in a fixed order", "the sheet dropped its no-stances order disclosure");
  has(html, "rs-cta", "the sheet dropped its set-positions CTA");
  lacks(html, "rs-rank-num", "the sheet numbered a field it cannot rank");

  // One position, and the line goes away wherever it is painted.
  w.alignToggleIssue(Object.keys(w.ISSUE_MAP)[0]);
  ok(w.PDXRaceSheet._axis().length >= 1, "the test could not set a position");
  lacks(w.pdxSeatStrip(SEAT, {}), "Set stances to rank this race",
    "the stance line survives the visitor setting a position");
  lacks(wrmHtml(w), "Set stances to rank this race",
    "the seat list still tells a visitor with positions to set positions");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · A pick from the sheet reaches the seat row and the team store");

{
  const w = boot();
  const rk = w.PDXRaceSheet._seat(SEAT).key;
  const fld = w.PDXRaceSheet._field(rk);
  must(fld.length >= 1, `the fixture seat "${rk}" has no field to pick from`);
  const pick = fld[0];

  has(w.pdxSeatStrip(rk, {}), "No pick yet", "an empty team slot does not say so");
  lacks(w.pdxSeatStrip(rk, {}), "Your pick", "an empty slot claims a pick");

  sheetHtml(w, rk);
  w.pdxRaceSheetPick(rk, pick.pid);

  // One store, the same one My Voting Team reads.
  const sel = w._ballotLoad();
  ok(Object.values(sel).indexOf(pick.pid) >= 0,
    "the pick did not land in the team store the rest of the app reads");
  eq(Object.keys(w.__store).filter((k) => /team|ballot/i.test(k) && k !== "politidex_my_team").length, 0,
    "the pick created a second team store");

  const strip = w.pdxSeatStrip(rk, {});
  has(strip, "Your pick", "the seat strip does not reflect the pick");
  has(strip, pick.name, "the seat strip does not name the pick");
  lacks(strip, "No pick yet", "the seat strip still shows the slot as empty");

  // And it reaches the one painted seat list without anything else being
  // touched. There is no second list to check: a pick could not be shown
  // inconsistently by two hosts, because only one host paints seats.
  has(wrmHtml(w), "Your pick", "the homepage seat list did not learn about the pick");
  eq(vhHtml(w), "", "a second seat list reappeared to show the pick twice");

  // One pick per office: a second add to the same seat replaces, never stacks.
  if (fld.length >= 2) {
    w.pdxRaceSheetPick(rk, fld[1].pid);
    const sel2 = w._ballotLoad();
    eq(Object.values(sel2).filter((v) => v === pick.pid).length, 0,
      "the replaced pick is still in the store");
    has(w.pdxSeatStrip(rk, {}), fld[1].name, "the seat strip did not follow the replacement");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The spine comes first, and no headline sells browse-by-score");

{
  const iWrm = HTML.indexOf('id="who-represents-me"');
  const iStart = HTML.indexOf('id="start-here"');
  const iRelevant = HTML.indexOf('id="relevant-section"');
  const iBrowse = HTML.indexOf('id="myteam-browse-panel"');
  // The Voter Hub's slot in the spine order is held by a LINK to the band now,
  // not by a copy of it: same position, one roster. The id is the anchor these
  // order claims read, so it is load-bearing and pinned as such.
  const iJump = HTML.indexOf('id="vh-wrm-jump"');
  const iHub = HTML.indexOf('id="voter-hub"');
  ok(iWrm > 0 && iStart > 0 && iRelevant > 0 && iBrowse > 0 && iJump > 0,
    "a spine anchor is missing from index.html");
  ok(iWrm < iStart, "the represents-me band no longer precedes the Door-2 election block");
  ok(iJump > iHub && iJump < iRelevant,
    "the hand-off to Who Represents Me is no longer the first substantive Voter Hub block after location");
  ok(iJump < iBrowse, "the all-politicians browse panel precedes the hand-off to the seat list");
  ok(iRelevant < iBrowse || iBrowse > iJump,
    "the research surfaces precede the seat spine");
  // A link, not a roster: the position carries no seat row, no compare control
  // and no team slot of its own.
  const JUMP = HTML.slice(iJump - 400, iJump + 400);
  has(JUMP, 'href="#who-represents-me"', "the Voter Hub hand-off does not point at the band");
  lacks(JUMP, "rs-seat-strip", "the Voter Hub hand-off grew a seat strip");
  lacks(HTML, 'id="vh-district-strip"', "the duplicate roster host is back in index.html");

  // The Door-2 election block leads with the seat path, not a roster.
  const sh = HTML.slice(iStart, iStart + 12000);
  has(sh, "See who represents me", "the Door-2 block lost its primary seat CTA");
  has(sh, "Your seats → compare the field → pick for your ballot.",
    "the Door-2 block does not state the spine");

  // The compare hub is a research tool now, and says so.
  has(HTML, "Look anyone up", "the compare hub still frames itself as ballot discovery");
  lacks(HTML, "by office, state, party or score to see who represents",
    "the browse-everyone-by-score framing is still shipping");
  const flow = HTML.slice(HTML.indexOf('class="chub-flow '), HTML.indexOf('class="chub-flow ') + 3000);
  has(flow, "Who Represents Me", "the research list does not hand off to the seat spine");

  // The nav clarifies the job without demoting the neighbours it sits between.
  has(HTML, "Your seats &amp; races", "the nav entry does not clarify what it answers");
  const nav = HTML.slice(HTML.indexOf('href="#who-represents-me"'));
  ok(HTML.indexOf('href="#who-represents-me"') < HTML.indexOf('href="#say-vs-do"'),
    "Who Represents Me lost its lead position in the nav");
  // The ballot entry sits in the same row; it spells its address href="/ballot"
  // now that the workspace is its own document rather than href="#my-politicians",
  // an in-page anchor. The claim here is adjacency, not the spelling.
  ok(/href="(?:#my-politicians|\/ballot)"/.test(nav.slice(0, 4000)),
    "the ballot entry is no longer in the same nav row as Who Represents Me");

  // The spine line reads the same everywhere it is stated.
  const SPINE = "Your seats → compare the field → pick for your ballot.";
  ok(HTML.indexOf(SPINE) >= 0, "the spine line is not in index.html");
  ok(R("who-represents-me.js").indexOf("compare the field") >= 0,
    "the homepage seat list does not carry the spine line");
  // And the resolver states it nowhere, because the resolver paints no seats.
  // It resolves districts and hands off; the spine is stated where it is walked.
  const VHL = R("voter-hub-location.js");
  ok(VHL.indexOf("pdxSeatStrip") < 0, "the resolver is painting seat strips again");
  ok(VHL.indexOf("wrm-seatcompare") < 0, "the resolver is painting compare controls again");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · No party, no fake match, and a real tap target");

{
  const w = boot();
  const strip = w.pdxSeatStrip(SEAT, {});
  [" (R)", " (D)", "Republican", "Democrat", "party"].forEach((t) =>
    lacks(strip, t, `the seat strip mentions ${t}`));
  lacks(strip, "%", "the seat strip prints a percentage");
  lacks(strip, "Match", "the seat strip claims a match it has not computed");

  // 44px on every control the spine adds, per the mobile clause.
  has(RS_CSS, ".rs-seat-strip", "the seat strip has no styles");
  const seatCss = RS_CSS.slice(RS_CSS.indexOf(".rs-seat-strip"));
  has(seatCss, "min-height: 44px", "the stance line has no 44px mobile target");
  has(RS_CSS, "min-height: 44px", "the compare control lost its 44px target");
  // Column layout, so nothing gets squeezed off a phone row.
  has(seatCss, "flex-direction: column", "the strip lays its parts out in a row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Nothing drifted");

{
  const base = boot({ withoutSheet: true });
  const live = boot();
  const pids = Object.keys(base.CMP_DATA || {}).slice(0, 120);
  const keys = Object.keys(base.ISSUE_MAP || {}).slice(0, 6);
  keys.forEach((k) => { base.alignToggleIssue(k); live.alignToggleIssue(k); });

  let drift = 0, checked = 0;
  pids.forEach((pid) => {
    ["record", "stated"].forEach((mode) => {
      const a = base._calcAlignmentScore(pid, { mode: mode });
      const b = live._calcAlignmentScore(pid, { mode: mode });
      checked++;
      if (JSON.stringify(a) !== JSON.stringify(b)) drift++;
    });
    const da = base._pdxLedgerSlot ? base._pdxLedgerSlot(pid) : null;
    const db = live._pdxLedgerSlot ? live._pdxLedgerSlot(pid) : null;
    checked++;
    if (JSON.stringify(da) !== JSON.stringify(db)) drift++;
  });
  ok(checked >= 300, `drift sweep only checked ${checked} values`);
  eq(drift, 0, `${drift} of ${checked} scores moved with the seat spine loaded`);

  // The spine reads the stores; it must never write one.
  const w = boot();
  const before = JSON.stringify(w.__store);
  w.pdxSeatStrip(SEAT, {});
  wrmHtml(w);
  vhHtml(w);
  eq(JSON.stringify(w.__store), before, "painting the seat spine wrote to storage");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ seat spine: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ seat spine: ${passed} assertions passed\n`);
