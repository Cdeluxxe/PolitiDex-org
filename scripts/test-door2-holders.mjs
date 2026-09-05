#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door2-holders.mjs — one owner of "who holds this seat for this voter"
// ─────────────────────────────────────────────────────────────────────────────
// Live smoke, Layton / Davis County, 2026-09-05: Door 2 named three of six
// seats. The two U.S. Senate rows and the Governor row printed "No record on
// file yet / we'd rather leave this blank than name the wrong person" over Mike
// Lee, John Curtis and Spencer Cox — three people with full files at /p/lee,
// /p/curtis and /p/cox. "Work this seat" on the U.S. House tagged Celeste Maloy
// (UT-2) as HOLDS THIS SEAT for a reader whose resolved district is UT-1. And
// the Senate workspace header said "No record on file for the current holder"
// directly above a field listing Curtis and Lee.
//
// Three surfaces, three disagreeing answers to one question. So there is now one
// function that answers it — window.pdxSeatHolders(seat) — and this file pins
// that all three read it and that the copy around it can only say what is true:
//
//   1. ONE OWNER. pdxSeatKey/pdxSeatHolders exist, every resolver level carries
//      the seat key they project on, and the homepage band, the race sheet and
//      the workspace all go through that owner rather than re-deriving holders.
//   2. LAYTON RESOLVES SIX OF SIX. Both senators, the Governor, the UT-1
//      House member, and both statehouse seats — by incumbency, not by party.
//   3. STATEWIDE COMES FROM THE STATE ROSTER, NOT THE HOUSE DISTRICT MAP, and
//      survives the load order that broke it (resolver before cmp-data.js).
//   4. THE BAND NAMES THEM. Name, photo and "See their record" on every
//      resolved row; the blank sentence on none of them.
//   5. THE DESK AGREES WITH THE PIN. HOLDS THIS SEAT is exactly the owner's pid
//      list — so the 2026 UT-2 candidate is not tagged as this reader's member.
//   6. HEADER AND BODY AGREE. "No record on file for the current holder" is
//      reachable only for a pid whose display record is genuinely absent, and
//      never over a person the pane itself is listing.
//   7. A NON-UTAH READER KEEPS THE GAPS. House and statehouse blank, no Utah
//      names, and the statewide seats still resolve from that state's roster.
//   8. TWIN BOOT. The formal record still rules the field and Direction Match
//      still orders nothing — the seat owner changed who is named, not the tiers.
//
//   node scripts/test-door2-holders.mjs
//
// Real shipped modules in a node:vm sandbox with a mini-DOM, the real roster and
// the real resolver: every claim below is about painted markup or a live call.

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
  "ballot-breakdown.js",
  "who-represents-me.js",
];
const TAIL = ["race-sheet.js", "ballot-workspace.js"];
const VHL = R("voter-hub-location.js");
const WRM = R("who-represents-me.js");
const SHEET = R("race-sheet.js");
const WORK = R("ballot-workspace.js");

// The fixture. Layton is in Davis County, whose 2026 congressional row carries
// congressDistrict 2 (the court-ordered map Maloy runs on) and
// priorCongressDistrict 1 (the map Blake Moore currently sits on) — which is
// precisely why this address is the one that broke.
const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };
const COLUMBUS = { state: "Ohio", city: "Columbus", county: "Franklin County" };

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// The shared sandbox returns null from every lookup and each surface paints into
// an element it finds by id, so these ids have to exist or every assertion here
// is vacuous.
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
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub",
   "ballot-workspace", "bw-body"].forEach(el);
  return byId;
}

// opts.coldResolver reproduces the shipped load order that caused the blank
// statewide rows: voter-hub-location.js is a SYNC script in index.html and
// cmp-data.js is DEFERRED, so the first pdxRepsForMe() of a page can run with no
// roster in the window at all.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {};
  const sess = {};
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
  const byId = miniDom(win);
  const sandbox = vm.createContext(win);
  const errors = [];
  const run = (f) => {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  };

  let order = FILES;
  if (opts.coldResolver) {
    run("voter-hub-location.js");
    // The reader's address is already in the window on a warm return visit, so
    // the early call is a real call with a real location and an empty roster.
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location || LAYTON;
    try { win.__early = win.pdxRepsForMe(); } catch (e) { win.__early = null; }
    order = FILES.filter((f) => f !== "voter-hub-location.js");
  }
  order.forEach(run);
  TAIL.forEach(run);

  win.PROFILES = win.CMP_DATA;
  // compare-table.js owns this accessor and cannot boot headless (it paints on
  // load), so the sandbox supplies the same three lines it exports. Without it
  // every surface below would be reading a roster the live page can read, which
  // would make the "named vs no record" distinction untestable.
  win._pdxPersonById = function (pid) {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; }
    catch (e) { return null; }
  };
  if (opts.located === false) {
    win._hasUserLocation = false;
    win._currentVoterLocation = null;
  } else {
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location || LAYTON;
  }
  win.__errors = errors;
  win.__byId = byId;
  return win;
}

const band = (w) => {
  w.PDXWhoRepresentsMe.sync();
  const n = w.document.getElementById("wrm-reps");
  return n ? String(n.innerHTML) : "";
};
const pane = (w, key) => {
  w.pdxBallotWorkspaceOpen(key);
  const n = w.document.getElementById("bw-body");
  return n ? String(n.innerHTML) : "";
};
const strip = (a) => String(a).replace(/<[^>]*>/g, " ");

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
  console.error(`✗ door 2 holders: ${msg}`);
  process.exit(1);
};

// ── Boot asserts ─────────────────────────────────────────────────────────────
const W = boot({ location: LAYTON });
must(typeof W.pdxRepsForMe === "function", `the resolver is not loaded — ${W.__errors.join(" | ")}`);
must(typeof W.pdxSeatHolders === "function", "window.pdxSeatHolders is not exposed");
must(typeof W.pdxSeatKey === "function", "window.pdxSeatKey is not exposed");
must(W.PDXWhoRepresentsMe && typeof W.PDXWhoRepresentsMe.sync === "function",
  "the homepage band is not loaded");
must(W.PDXBallotWorkspace && typeof W.PDXBallotWorkspace.sync === "function",
  "the ballot workspace is not loaded");
must(W.PDXRaceSheet && typeof W.PDXRaceSheet._field === "function",
  "the race sheet model is not loaded");
must(Object.keys(W.CMP_DATA || {}).length > 50,
  "the roster did not load, so every name assertion below would be vacuous");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One function owns 'who holds this seat for this voter'");

{
  const reps = W.pdxRepsForMe();
  ok(!!reps && !!reps.located, "the fixture reader is not located");
  const levels = reps.levels || [];
  eq(levels.length, 6, "the resolver does not emit all six seats");

  // Every level declares the ballot seat it belongs to, and declares it in the
  // same dialect pdxSeatKey() speaks. Without this the owner cannot group the
  // two Senate levels onto one seat, which is the whole reason it exists.
  levels.forEach((lv) => {
    ok(!!lv.seat, `level ${lv.key} carries no seat key`);
    eq(lv.seat, W.pdxSeatKey(lv.key), `level ${lv.key}'s seat key disagrees with pdxSeatKey()`);
  });
  // The three dialects the app already speaks all land on the same seat.
  eq(W.pdxSeatKey("ussenate1"), "senate", "resolver senate level does not map to the senate seat");
  eq(W.pdxSeatKey("representative"), "house", "the ballot office key for the House does not map");
  eq(W.pdxSeatKey("state_rep"), "statehouse", "the ballot office key for the statehouse does not map");
  eq(W.pdxSeatKey("nonsense"), "", "an unknown seat key is not rejected");

  // And the two consumers ask it rather than re-deriving. Source-level on
  // purpose: a consumer that keeps its own union will agree with the owner on
  // this fixture and diverge on the next one.
  has(SHEET, "pdxSeatHolders", "the race sheet does not read the seat owner");
  has(WORK, "pdxSeatHolders", "the workspace does not read the seat owner");
  // The band reads the resolver's levels directly, which IS the owner's source —
  // what it must not do is gate a row on the display record instead of the pid.
  lacks(WRM, "if (!person)", "the band still gates a row on the display record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Layton / Davis County resolves six of six, by incumbency");

const HOLD = {};
{
  ["senate", "house", "governor", "statesenate", "statehouse"].forEach((k) => {
    HOLD[k] = W.pdxSeatHolders(k);
  });

  // Both senators, as a set: the owner returns two pids for one seat, and which
  // one is "ussenate1" is not a ranking of any kind.
  const sen = (HOLD.senate.pids || []).slice().sort();
  eq(sen.join(","), "curtis,lee", "the Senate seat does not resolve to both Utah incumbents");
  ok(HOLD.senate.statewide, "the Senate seat is not marked statewide");
  ok(HOLD.senate.ok, "the Senate seat reports no holders");
  // NO PARTY RANKING: both senators are seated because they hold the seats, and
  // the owner never reads a party field to decide that.
  ["lee", "curtis"].forEach((pid) => {
    const p = W.CMP_DATA[pid];
    ok(!!p, `${pid} is not on the roster, so the smoke report's premise is gone`);
  });
  const OWNER = VHL.slice(VHL.indexOf("window.pdxSeatHolders = function"),
    VHL.indexOf("window._vhSyncDistrictStrip = function"));
  ok(OWNER.length > 200, "the seat owner function could not be located in the resolver");
  lacks(OWNER, "party", "the seat owner reads a party field");
  lacks(OWNER, "rank", "the seat owner ranks the holders it returns");

  eq((HOLD.governor.pids || []).join(","), "cox", "the Governor seat does not resolve to Cox");
  ok(HOLD.governor.statewide, "the Governor seat is not marked statewide");

  // The House pid is the CURRENT holder of the reader's district under the map
  // in force today — UT-1, Blake Moore — and not the incumbent of the district
  // this address moves into on the 2026 map (UT-2, Celeste Maloy).
  eq((HOLD.house.pids || []).join(","), "bmoore",
    "the House seat does not resolve to the UT-1 member");
  ok((HOLD.house.pids || []).indexOf("maloy") < 0,
    "the House seat resolves to the UT-2 member for a Davis County reader");
  ok(!HOLD.house.statewide, "the House seat is marked statewide");

  eq((HOLD.statesenate.pids || []).join(","), "jstevenson",
    "the State Senate seat does not resolve to the SD-6 incumbent");
  eq((HOLD.statehouse.pids || []).join(","), "defay_h15",
    "the State House seat does not resolve to the HD-15 incumbent");

  // Six of six: no seat on this ballot comes back empty for this reader.
  const gaps = (W.pdxRepsForMe().levels || []).filter((lv) => !lv.pid).map((lv) => lv.key);
  eq(gaps.join(","), "", "some seat still resolves to nothing for the fixture reader");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Statewide seats come from the state roster, in any load order");

{
  // THE ORIGINAL DEFECT. voter-hub-location.js is a sync script; cmp-data.js is
  // deferred. The first pdxRepsForMe() therefore ran with no roster, found no
  // senators and no governor — and the statewide memo then cached that emptiness
  // for the life of the page, so the roster arriving 200ms later changed nothing.
  // Three of six seats, forever.
  const cold = boot({ coldResolver: true, location: LAYTON });
  must(typeof cold.pdxSeatHolders === "function",
    `the cold boot did not finish loading — ${cold.__errors.join(" | ")}`);
  ok(!!cold.__early, "the early pre-roster call threw instead of returning a shape");

  const late = cold.pdxRepsForMe();
  const lateSen = (cold.pdxSeatHolders("senate").pids || []).slice().sort();
  eq(lateSen.join(","), "curtis,lee",
    "the statewide memo cached its pre-roster emptiness: both senators are still missing after the roster loads");
  eq((cold.pdxSeatHolders("governor").pids || []).join(","), "cox",
    "the Governor is still missing after the roster loads");
  eq((late.levels || []).filter((lv) => lv.pid).length, 6,
    "the cold-booted page does not recover all six seats");

  // And the statewide seats are answered from the roster, not from the House
  // district map: a state with no curated district data still names both
  // senators and its governor (section 7 checks the district gaps stay gaps).
  const oh = boot({ location: COLUMBUS });
  eq((oh.pdxSeatHolders("senate").pids || []).length, 2,
    "a state outside the curated district map loses its senators");
  eq((oh.pdxSeatHolders("governor").pids || []).length, 1,
    "a state outside the curated district map loses its governor");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Who Represents Me names every resolved seat");

const BAND = band(W);
{
  ok(BAND.length > 500, "the band painted nothing");
  const BT = strip(BAND);
  [["lee", "Mike Lee"], ["curtis", "John Curtis"], ["cox", "Spencer Cox"],
   ["bmoore", "Blake Moore"], ["jstevenson", "Jerry Stevenson"]].forEach(([pid, name]) => {
    const p = W.CMP_DATA[pid];
    has(BT, (p && p.name) || name, `${pid} is not named in the band`);
  });
  // Same treatment as the House row that worked: a record link and a photo.
  ["lee", "curtis", "cox"].forEach((pid) => {
    ok(BAND.indexOf(pid) >= 0, `the ${pid} row carries no link to their record`);
  });
  const photos = (BAND.match(/class="wrm-avatar" /g) || []).length;
  ok(photos >= 4, `only ${photos} rows carry a photo frame; the statewide rows are still blank`);
  eq((BAND.match(/See their record/g) || []).length, 6,
    "not every resolved seat offers the reader their record");

  // THE SENTENCE THAT STARTED THIS. It is an admission about our coverage, so it
  // may never appear over somebody with a file.
  lacks(BT, "No record on file yet",
    "the band still prints the blank-coverage sentence for a fully resolved ballot");
  lacks(BT, "rather leave this blank than name the wrong person",
    "the statewide rows still carry the blank statewide copy");
  lacks(BT, "rather leave this blank than guess at your seat",
    "a resolved district row still carries the unmapped-district copy");
  lacks(BAND, "wrm-row--unresolved",
    "a row is painted unresolved though every seat resolved");
  // The UT-2 member is not this reader's representative and is not named as one.
  lacks(BT, "Celeste Maloy", "the band names the UT-2 member as a Davis County holder");
}

{
  // A PID WE HOLD NO DISPLAY RECORD FOR IS A LOADING PROBLEM, NOT A COVERAGE
  // CLAIM. The roster accessor lives in compare-table.js and merges after the
  // resolver, so a row can be painted while _pdxPersonById(pid) is still null.
  // The seat is resolved either way — the pid is the record's address — so the
  // row must stay a resolved row and must not accuse that person of having no
  // file. This is the second half of the smoke report: never "no record" over
  // somebody who has /p/<pid>.
  const w = boot({ location: LAYTON });
  const real = w._pdxPersonById;
  w._pdxPersonById = (pid) => (pid === "lee" ? null : real(pid));
  const b2 = band(w);
  const T2 = strip(b2);
  lacks(T2, "No record on file yet",
    "a pid with no merged display record is reported to the reader as missing coverage");
  lacks(b2, "wrm-row--unresolved",
    "a pid with no merged display record paints as an unresolved seat");
  has(b2, "lee", "the row for an unmerged record drops the link to /p/lee");
  eq((b2.match(/See their record/g) || []).length, 6,
    "the row for an unmerged record stops offering the record");
  w._pdxPersonById = real;
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · 'Work this seat' tags the pin's member, not the other district's");

{
  // HOLDS THIS SEAT on the desk card is exactly the owner's pid list. This is
  // the assertion the shipped bug fails: the sheet used to union the resolver
  // with _pdxVoterBallot()'s office row, and that row carries the 2026 UT-2
  // incumbent for a Davis County address.
  ["house", "senate", "governor", "statesenate", "statehouse"].forEach((rk) => {
    const field = W.PDXRaceSheet._field(rk) || [];
    const tagged = field.filter((c) => c.incumbent).map((c) => c.pid).sort();
    const owned = (HOLD[rk].pids || []).slice().sort();
    // Every tagged person must be a holder. (A holder can be absent from the
    // field — a member not standing for re-election is not a candidate — so the
    // check is containment in that direction, plus no stranger wearing the tag.)
    tagged.forEach((pid) => {
      ok(owned.indexOf(pid) >= 0,
        `${rk}: ${pid} is tagged as holding the seat but is not one of the resolved holders (${owned.join(",") || "none"})`);
    });
  });

  const houseField = W.PDXRaceSheet._field("house") || [];
  ok(houseField.length > 0, "the House seat has no field at all in this fixture");
  ok(!houseField.some((c) => c.pid === "maloy" && c.incumbent),
    "the House desk still tags Celeste Maloy as holding this reader's seat");
  // Don't invent a challenger: the fix removes a false tag, never a person.
  ok(houseField.some((c) => c.pid === "maloy"),
    "the House field lost the candidate on the reader's 2026 ballot");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · The workspace header agrees with the pane under it");

{
  const senate = pane(W, "senate");
  const ST = strip(senate);
  has(ST, "Holds this seat now", "the Senate pane does not say who holds the seat");
  has(ST, W.CMP_DATA.curtis.name, "the Senate header does not name Curtis");
  has(ST, W.CMP_DATA.lee.name, "the Senate header does not name Lee");
  lacks(ST, "No record on file for the current holder",
    "the Senate header still claims no record over the holders its own field lists");
  lacks(ST, "District not mapped",
    "a statewide seat is described as an unmapped district");

  // The House desk's holder line is the band's House pid, not a second opinion.
  const houseLv = (W.pdxRepsForMe().levels || []).filter((lv) => lv.seat === "house")[0];
  const house = pane(W, "house");
  const HT = strip(house);
  has(HT, "Holds this seat now", "the House pane does not say who holds the seat");
  has(HT, W.CMP_DATA[houseLv.pid].name,
    "the House header does not name the same member the band pinned");
  lacks(HT, "Holds this seat now: " + W.CMP_DATA.maloy.name,
    "the House header names the UT-2 member as the holder");
  lacks(HT, "No record on file for the current holder",
    "the House header claims no record over a member with a file");

  const gov = strip(pane(W, "governor"));
  has(gov, "Holds this seat now", "the Governor pane does not say who holds the seat");
  has(gov, W.CMP_DATA.cox.name, "the Governor header does not name Cox");
  lacks(gov, "No record on file for the current holder",
    "the Governor header claims no record over a governor with a file");

  // The two remaining sentences exist, and each is now guarded by the fact it
  // states. "No record on file for the current holder" sits behind a resolved
  // pid; the no-holder case says so instead of describing an empty file.
  const iNamed = WORK.indexOf("'<span>Holds this seat now: '");
  const iNoRec = WORK.indexOf("'<span>No record on file for the current holder</span></span>'");
  const iGuard = WORK.indexOf("if (withPid.length)");
  const iNone = WORK.indexOf("'<span>No current officeholder resolved for this seat</span></span>'");
  ok(iNoRec > 0, "the workspace lost the no-record-on-file sentence entirely");
  // ...and the sentence is still reachable, for the one fact it describes: the
  // owner resolved a pid this app holds nothing on. Asked through the owner, so
  // this exercises the branch rather than asserting its source.
  {
    const w = boot({ location: LAYTON });
    const real = w.pdxSeatHolders;
    const ghost = "pdx_unmerged_holder";
    ok(!w.CMP_DATA[ghost], "the fixture pid for an unheld record is on the roster");
    w.pdxSeatHolders = (k) => (w.pdxSeatKey(k) !== "senate" ? real(k) : {
      ok: true, seat: "senate", located: true, statewide: true, districtGap: false,
      pids: [ghost],
      levels: [{ key: "ussenate1", seat: "senate", label: "U.S. Senate",
        tierLabel: "U.S. Senate", statewide: true, district: null,
        distLabel: "U.S. Senate · Utah", pid: ghost, resolved: true }],
    });
    const g = strip(pane(w, "senate"));
    has(g, "No record on file for the current holder",
      "a resolved pid with no record on file does not produce the sentence that describes it");
    lacks(g, "Holds this seat now",
      "a pid with no record is named as a holder anyway");
    lacks(g, "No current officeholder resolved",
      "a resolved pid is reported as no officeholder at all");
    w.pdxSeatHolders = real;
  }
  ok(iGuard > 0 && iGuard < iNoRec && iGuard > iNamed,
    "the no-record sentence is not guarded by a resolved pid");
  ok(iNone > iNoRec, "the no-holder case has no sentence of its own");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · A non-Utah reader keeps their gaps and gets no Utah names");

{
  const oh = boot({ location: COLUMBUS });
  const lv = {};
  (oh.pdxRepsForMe().levels || []).forEach((l) => { lv[l.key] = l; });

  // Statewide resolves from Ohio's own roster rows.
  ok((oh.pdxSeatHolders("senate").pids || []).length === 2,
    "an Ohio reader does not get both of their senators");
  ok(!!oh.pdxSeatHolders("governor").pids[0], "an Ohio reader does not get their governor");

  // District seats stay empty. Widening the Utah map to fill them is the one
  // thing worse than a blank.
  ["house", "statesenate", "statehouse"].forEach((k) => {
    const h = oh.pdxSeatHolders(k);
    eq((h.pids || []).length, 0, `${k} is filled for an Ohio reader`);
    ok(h.districtGap, `${k} does not report a district gap for an Ohio reader`);
    ok(!h.ok, `${k} reports resolved holders for an Ohio reader`);
  });

  const ob = strip(band(oh));
  ["Blake Moore", "Celeste Maloy", "Jerry Stevenson", "Ariel Defay", "Mike Lee", "Spencer Cox"]
    .forEach((n) => lacks(ob, n, `an Ohio reader is shown Utah's ${n}`));
  has(ob, "Not resolved for your area yet",
    "an unmapped district does not say so for an Ohio reader");
  // And the blank there is the district sentence, not the coverage one: we hold
  // no district map for Ohio, which is not a claim about anybody's file.
  lacks(ob, "rather leave this blank than name the wrong person",
    "an unmapped Ohio district borrows the statewide blank-coverage copy");

  const oHouse = strip(pane(oh, "house"));
  has(oHouse, "District not mapped", "the Ohio House pane does not name the gap");
  lacks(oHouse, "Holds this seat now", "the Ohio House pane names a holder it never resolved");
  lacks(oHouse, "No record on file for the current holder",
    "an unmapped district is reported as an officeholder with an empty file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · Twin boot: the formal record still rules, DM still orders nothing");

{
  // Two boots of the same fixture, one of them with positions set so the record
  // lane can actually score. The seat owner decides WHO is named on a seat; it
  // must not have touched which lane ranks a field or where DM is printed.
  const a = boot({ location: LAYTON });
  const b = boot({ location: LAYTON });
  const KEYS = Object.keys(b.ISSUE_MAP || {}).slice(0, 4);
  must(KEYS.length >= 2, "ISSUE_MAP is empty, so the ranked lane cannot be exercised");
  KEYS.forEach((k) => b._alignIssues.add(k));
  must(b.PDXRaceSheet._axis().length >= 2, "the positions did not reach the shared axis");

  ["senate", "house", "governor"].forEach((k) => {
    const pa = pane(a, k);
    const pb = pane(b, k);
    // With no positions set the pane claims NO order and says why; with them
    // set the ruler is the formal record. Neither pane may name party as a
    // ruler, and the one that ranks must say party is not read. A field of one
    // carries no ruler at all — there is nothing to order — so those two claims
    // are only made where a comparison actually exists.
    if ((a.PDXRaceSheet._field(k) || []).length >= 2) {
      has(pa, "not ranked", `${k}: the unscored pane claims an order it cannot have`);
      has(pb, "formal record", `${k}: the scored pane does not name the formal record`);
      ok(/[Pp]arty[^.]{0,40}never read here/.test(pb),
        `${k}: the ranked pane stops saying party is not read here`);
    } else {
      lacks(pa, "bw-ruler", `${k}: a field too small to rank still carries a ruler`);
      passed += 2;
    }
    [pa, pb].forEach((h, i) => {
      lacks(h, "Ordered by party", `${k}: pane ${i} claims a party order`);
      lacks(h, "Ordered by Direction Match", `${k}: pane ${i} claims a DM order`);
    });

    // DM is printed and labelled, and never in the ruler's number slot.
    [pa, pb].forEach((h, i) => {
      if (h.indexOf("bw-dm") < 0) { passed++; return; }
      has(h, "Direction Match", `${k}: pane ${i} lost the DM label`);
      has(h, "did they keep their own word", `${k}: pane ${i} lost the DM question`);
      const slots = h.match(/<span class="bw-score">[\s\S]*?<\/span><span class="bw-cand-who">/g) || [];
      slots.forEach((sl) => lacks(sl, "Direction Match", `${k}: pane ${i} puts DM in the ruler's number slot`));
    });

    // Whoever holds the seat, both boots name the same people — the tiers moved
    // nobody in or out.
    eq((a.pdxSeatHolders(k).pids || []).join(","), (b.pdxSeatHolders(k).pids || []).join(","),
      `${k}: the two boots disagree about who holds the seat`);
    // The painted order is _rank's order, on the seat the reader is working.
    const sm = b.PDXRaceSheet._seat(k);
    const all = b.PDXRaceSheet._field(sm.key) || [];
    const ranked = b.PDXRaceSheet._rank(all, "record", true);
    if (ranked.ranked.length >= 2) {
      const seen = ranked.ranked.map((c) => c.pid).filter((pid) => pb.indexOf(pid) >= 0);
      eq(seen.join(","), ranked.ranked.map((c) => c.pid).join(","),
        `${k}: the painted field is not in the record lane's order`);
    } else { passed++; }
  });

  // The workspace still asks _rank for the one sort on the surface.
  eq((WORK.match(/\.sort\(/g) || []).length, 0,
    "the workspace sorts the field itself instead of asking _rank");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ door 2 holders: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ door 2 holders: ${passed} checks passed — one owner names the seat, ` +
  `and every surface reads it\n`);
