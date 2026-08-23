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
//   1. ONE HELPER, NOT THREE COPIES. window.pdxSeatStrip owns the seat contract;
//      Who Represents Me and the Voter Hub strip both render it, so they cannot
//      drift apart on team state, the compare control, or the stance line.
//   2. COMPARE IS ON THE SEAT, NOT BEHIND A PROFILE. Activating it opens the
//      race sheet for THAT seat key, from a seat list, with no profile in
//      between.
//   3. NO LOCATION → A CTA, NEVER A GUESS. The block holds its place and asks
//      for a location. It names no officeholder, because with no location there
//      is no honest answer to "who is my House member".
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
//      "browse everyone by score" as the way to find your ballot.
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
section("1 · One helper owns the seat contract — both hosts render it");

{
  const w = boot();
  const strip = w.pdxSeatStrip(SEAT, { compact: true });
  has(strip, 'class="rs-seat-strip"', "pdxSeatStrip returns the strip wrapper");
  has(strip, "rs-seat-team", "the strip carries a team-state chip");
  has(strip, "rs-entry", "the strip carries the compare control");

  const wrm = wrmHtml(w);
  const vh = vhHtml(w);
  has(wrm, "rs-seat-strip", "Who Represents Me renders the shared strip");
  has(vh, "rs-seat-strip", "the Voter Hub district strip renders the shared strip");
  // Same helper, same markup: the two hosts must agree seat-for-seat.
  const stripsIn = (html) => (html.match(/data-rs-seat-probe|rs-seat-strip/g) || []).length;
  eq(stripsIn(wrm), stripsIn(vh),
    "the two seat hosts paint a different number of strips");

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

{
  const w = boot({ located: false });
  const vh = vhHtml(w);
  ok(vh.length > 50, "with no location the Voter Hub seat block painted nothing at all");
  const host = w.document.getElementById("vh-district-strip");
  ok(host.style.display !== "none", "the seat block hid itself instead of asking for a location");
  has(vh, "Set my location", "no set-location CTA in the no-location seat block");
  has(vh, "Who Represents You Now", "the no-location block dropped its own heading");
  has(vh, "no location, no representative", "the no-location block does not state the rule it follows");
  // The honesty clause: not one officeholder is named.
  const names = Object.keys(w.CMP_DATA || {})
    .map((pid) => (w.CMP_DATA[pid] || {}).name)
    .filter((n) => n && n.length > 6);
  const named = names.filter((n) => vh.indexOf(n) >= 0);
  eq(named.length, 0, `the no-location block named ${JSON.stringify(named.slice(0, 3))}`);
  lacks(vh, "rs-seat-team", "the no-location block shows a team slot for a seat it cannot name");
  lacks(vh, "Compare field for this seat", "the no-location block offers a compare for an unknown seat");

  // The homepage band fails closed the same way: no rows, and the section drops
  // its located flag so the cold CTA state shows instead.
  const wrm = wrmHtml(w);
  eq(wrm, "", "the homepage seat band painted rows with no location");
  const sec = w.document.getElementById("who-represents-me");
  eq(sec.getAttribute("data-located"), null, "the band still claims to be located");
}

// National focus is a location without seats. Six blank rows under "the people
// who hold power in your state" would read as a coverage failure; it is a scope
// the visitor chose, so it asks for a state instead.
{
  const w = boot({ location: { state: "National", city: "", county: "", district: "" } });
  const vh = vhHtml(w);
  has(vh, "Pick my state", "national focus does not offer a way to pick a state");
  lacks(vh, "rs-seat-team", "national focus paints team slots for seats it has not resolved");
  lacks(vh, "Not resolved", "national focus lists blank seat rows");
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
  has(strip, "PDXStances", "the stance line does not lead to My Stances");
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
  lacks(w.pdxSeatStrip(rk, {}), "On your team", "an empty slot claims a pick");

  sheetHtml(w, rk);
  w.pdxRaceSheetPick(rk, pick.pid);

  // One store, the same one My Voting Team reads.
  const sel = w._ballotLoad();
  ok(Object.values(sel).indexOf(pick.pid) >= 0,
    "the pick did not land in the team store the rest of the app reads");
  eq(Object.keys(w.__store).filter((k) => /team|ballot/i.test(k) && k !== "politidex_my_team").length, 0,
    "the pick created a second team store");

  const strip = w.pdxSeatStrip(rk, {});
  has(strip, "On your team", "the seat strip does not reflect the pick");
  has(strip, pick.name, "the seat strip does not name the pick");
  lacks(strip, "No pick yet", "the seat strip still shows the slot as empty");

  // And it reaches the painted seat lists without anything else being touched.
  has(wrmHtml(w), "On your team", "the homepage seat list did not learn about the pick");
  has(vhHtml(w), "On your team", "the Voter Hub seat list did not learn about the pick");

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
  const iStrip = HTML.indexOf('id="vh-district-strip"');
  const iHub = HTML.indexOf('id="voter-hub"');
  ok(iWrm > 0 && iStart > 0 && iRelevant > 0 && iBrowse > 0 && iStrip > 0,
    "a spine anchor is missing from index.html");
  ok(iWrm < iStart, "the represents-me band no longer precedes the Door-2 election block");
  ok(iStrip > iHub && iStrip < iRelevant,
    "Who Represents You Now is no longer the first substantive Voter Hub block after location");
  ok(iStrip < iBrowse, "the all-politicians browse panel precedes the seat list");
  ok(iRelevant < iBrowse || iBrowse > iStrip,
    "the research surfaces precede the seat spine");

  // The Door-2 election block leads with the seat path, not a roster.
  const sh = HTML.slice(iStart, iStart + 12000);
  has(sh, "See who represents me", "the Door-2 block lost its primary seat CTA");
  has(sh, "Your seats → compare the field → pick for your team.",
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
  has(nav.slice(0, 4000), 'href="#my-politicians"',
    "My Voting Team is no longer in the same nav row");

  // The spine line reads the same everywhere it is stated.
  const SPINE = "Your seats → compare the field → pick for your team.";
  ok(HTML.indexOf(SPINE) >= 0, "the spine line is not in index.html");
  ok(R("who-represents-me.js").indexOf("compare the field") >= 0,
    "the homepage seat list does not carry the spine line");
  ok(R("voter-hub-location.js").indexOf("compare the field") >= 0,
    "the Voter Hub seat list does not carry the spine line");
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
