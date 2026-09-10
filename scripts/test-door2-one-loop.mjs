#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door2-one-loop.mjs — one Door 2, one person door, one pick store
// ─────────────────────────────────────────────────────────────────────────────
// Live Layton, 2026-09-06. Four things the reader saw, all of them the same
// mistake — a second implementation of an answer the app already had:
//
//   · "Compare field for this seat" on the U.S. House named CELESTE MALOY as the
//     holder and printed "nobody holds the seat" over BLAKE MOORE. The field came
//     from the curated 2026 ballot (Davis County → UT-2); the holder came from
//     the resolver, which applies the court-ordered map (Layton → UT-1). Two
//     districts, one seat, one screen.
//   · The state seats painted the holder alone, while "Where they stand" three
//     rows above already listed other rostered people for that same seat.
//   · A tap on Caroline Gleich in Relevant to Me opened a compact Kept/Broken
//     quick-view instead of her own file. Her row is not in the bundled roster —
//     it arrives from the expansion merge at runtime — so section 5 injects it
//     the way that merge does, and pins the same property on a bundled row too.
//   · The picks counter said 0/11 while the workspace rail said 0 of 6, because
//     each projected the seat list its own way.
//
// So there is now ONE function that answers "who is on this seat for this
// reader" — window.pdxSeatField(seat) — one door to a person, and one store
// behind the count. This file pins that, and pins that the vocabulary on Door 2's
// faces is ballot and picks rather than "team":
//
//   1. ONE FIELD FUNCTION. pdxSeatField owns office + state + district → every
//      roster pid on that key. Holders are pdxSeatHolders' pids and nothing else.
//      Recomputed here from the roster keyers: nobody on the key is omitted.
//   2. UT-1 IS THE FIELD. Moore is in it and tagged as holding it; Maloy, who is
//      UT-2's candidate, is not in a UT-1 reader's field on any surface.
//   3. EVERY FIELD SURFACE READS IT. Compare Field (_ballotCandidates), the race
//      sheet's model and the workspace desk return the same pid set for a seat.
//   4. WHERE THEY STAND AGREES. The Relevant-to-Me columns for the state seats
//      are exactly the seat's field — that divergence was the visible bug.
//   5. ONE PERSON DOOR. openMediumModal is a door to /p/<pid>, the compact
//      Kept/Broken card is the fail-open fallback underneath it, and the
//      Relevant-to-Me grid opens people through that door.
//   6. ONE PICK STORE. The badge's seat list, its filled figure and the
//      workspace's rail and "N of M" are one read of one store.
//   7. HONEST HOLES. The redistricting note rides the three district seats; a
//      one-person field names the district and refuses the unopposed claim.
//   8. NO "TEAM" ON DOOR 2's FACES. Nothing the reader can read calls their
//      ballot picks a team.
//   9. TWIN BOOT. The formal tiers and every Direction Match read are unchanged —
//      this pass moved who is named, not how anyone is scored.
//
//   node scripts/test-door2-one-loop.mjs
//
// Real shipped modules in a node:vm sandbox with a mini-DOM, the real roster and
// the real resolver: every claim below is a live call or painted markup.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  "compare-hub.js", "seat-field.js", "ballot-breakdown.js", "who-represents-me.js",
  "person-file.js", "person-link.js",
];
const TAIL = ["race-sheet.js", "ballot-workspace.js"];
const SEATFIELD = R("seat-field.js");
const HUB = R("compare-hub.js");
const WORK = R("ballot-workspace.js");

// Layton, Davis County: the 2026 congressional row carries district 2 (the map
// Maloy runs on) while the resolver's court-ordered map puts Layton in UT-1 with
// Blake Moore. This address is the one that broke, so it is the one under test.
const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };
const COLUMBUS = { state: "Ohio", city: "Columbus", county: "Franklin County" };

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// innerHTML registers the ids it contains, the way a browser does, so a surface
// that paints a mount for another surface is reachable here too.
function miniDom(win, ids) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {}, _html: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; },
    };
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html; },
      set(v) {
        node._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(node._html)) !== null) if (!byId[m[1]]) byId[m[1]] = el(m[1]);
      },
    });
    if (id) byId[id] = node;
    return node;
  };
  (ids || []).forEach((i) => { byId[i] = el(i); });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  return byId;
}

const DOM_IDS = [
  "relevant-browse-grid", "relevant-count-badge", "relevant-location-text",
  "relevant-grid-hint", "relevant-guided-status", "relevant-section",
  "chub-empty", "chub-count", "chub-launch-bar", "chub-sel-pills",
  "chub-launch-btn", "chub-launch-hint",
  "who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub",
  "ballot-workspace", "bw-body", "bw-rail", "bw-count",
  // The compact quick-view's mounts. They have to EXIST for section 5 to mean
  // anything: "the Kept/Broken card did not paint" is only a claim about the
  // door if the card had somewhere to paint into.
  "pdx-medium-overlay", "pdx-medium-content", "pdx-med-photo-wrap",
  "pdx-med-name", "pdx-med-office", "pdx-med-badges",
];

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
  win._cmpSelected = new Set();
  win.history = { replaceState() {}, pushState() {}, state: null, back() {} };
  // Defined in index.html, not in a module, and read by the card renderers.
  // null is the honest "no score on file" answer and keeps this file about
  // routing and fields rather than about scoring.
  win._pdxDisplayScore = () => null;
  const byId = miniDom(win, DOM_IDS);
  const sandbox = vm.createContext(win);
  const errors = [];
  const run = (f) => {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  };
  FILES.forEach(run);
  TAIL.forEach(run);
  win.PROFILES = win.CMP_DATA;
  // compare-table.js owns this accessor and cannot boot headless; the sandbox
  // supplies the same three lines it exports.
  win._pdxPersonById = (pid) => {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; } catch (e) { return null; }
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
  win.__store = store;
  return win;
}

const pane = (w, key) => {
  try { w.pdxBallotWorkspaceOpen(key); } catch (e) { return `THREW: ${e.message}`; }
  const n = w.document.getElementById("bw-body");
  return n ? String(n.innerHTML) : "";
};
const relevant = (w) => {
  try { w.renderRelevantToMe(); } catch (e) { return `THREW: ${e.message}`; }
  const n = w.document.getElementById("relevant-browse-grid");
  return n ? String(n.innerHTML) : "";
};
// Visible text only: attributes live inside the angle brackets, so stripping
// tags is exactly the reader's eye.
const strip = (a) => String(a).replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ");
const sorted = (a) => (a || []).slice().sort().join(",");

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
  console.error(`✗ door 2 one loop: ${msg}`);
  process.exit(1);
};

// ── Boot asserts ─────────────────────────────────────────────────────────────
const W = boot({ location: LAYTON });
must(W.__errors.length === 0,
  `a module failed to load, so every property below would pass against a stub:\n    ${W.__errors.join("\n    ")}`);
must(typeof W.pdxSeatField === "function",
  "window.pdxSeatField is not exposed — the one field function this file is named after does not exist");
must(typeof W.pdxSeatHolders === "function", "window.pdxSeatHolders is not exposed");
must(typeof W._ballotCandidates === "function", "window._ballotCandidates is not exposed");
must(typeof W._myteamBallotCounts === "function", "the picks counter is not exposed");
must(typeof W.renderRelevantToMe === "function", "Relevant to Me does not render");
must(W.PDXBallotWorkspace && typeof W.PDXBallotWorkspace._seats === "function",
  "the ballot workspace is not loaded");
must(W.PDXRaceSheet && typeof W.PDXRaceSheet._field === "function", "the race sheet model is not loaded");
must(W.PDXPerson && typeof W.PDXPerson.open === "function", "person-file.js is not loaded");
must(W.PDXPersonLink && typeof W.PDXPersonLink.href === "function", "person-link.js is not loaded");
must(Object.keys(W.CMP_DATA || {}).length > 50,
  "the roster did not load, so every name assertion below would be vacuous");
must(!!W.CMP_DATA.bmoore && !!W.CMP_DATA.maloy,
  "the two House members this file is about are not both on the roster");

// The reported tap was on a person whose row is merged in at runtime rather than
// bundled, so the door test builds that row the way the merge does. Kept/Broken
// counts and a score are on it on purpose: they are what the compact card leads
// with, which is how the wrong door announced itself.
const GLEICH = {
  name: "Caroline Gleich", office: "U.S. Senate Candidate · 2024",
  candidacyStatus: "former_candidate", state: "Utah", party: "Democrat",
  district: "Utah State", score: 90, kept: 8, broken: 1, pending: 15, icon: "🏔",
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One function owns 'who is on this seat for this reader'");

// The independent answer. Recomputed from the roster with the app's own keyers,
// so "nobody on the key is omitted" is a claim about the roster rather than a
// restatement of pdxSeatField's own walk.
function rosterOnKey(w, type, state, dist) {
  const out = [];
  Object.keys(w.CMP_DATA).forEach((pid) => {
    let t = "";
    try { t = w._pdxBrowseType(pid); } catch (e) { t = ""; }
    if (t !== type) return;
    let st = "";
    try { st = w._pdxBrowseStateOf(pid); } catch (e) { st = ""; }
    if (String(st) !== state) return;
    if (dist != null) {
      let n = null;
      try { n = w._pdxRelevantDistNum(pid); } catch (e) { n = null; }
      if (Number(n) !== Number(dist)) return;
    }
    out.push(pid);
  });
  return out;
}

const HOUSE = W.pdxSeatField("house");
{
  ok(!!HOUSE && HOUSE.answerable === true,
    `the House seat is not answerable for a located Utah reader (${HOUSE && HOUSE.reason})`);
  eq(HOUSE.reason, "", "an answerable field still carries a refusal reason");
  eq(HOUSE.state, "Utah", "the House field is not keyed to the reader's state");
  eq(Number(HOUSE.district), 1, "the House field is not keyed to the reader's resolved district");
  eq(HOUSE.statewide, false, "the House seat is claimed to be statewide");
  eq(HOUSE.scope, "Utah · District 1",
    "the field does not title the district it is about — that title is what used to read 'your districts'");

  // The holders are the resolver's pids and nothing else. A second opinion here
  // is the exact defect: the field said Maloy, the pin said Moore.
  const pin = W.pdxSeatHolders("house");
  eq(sorted(HOUSE.holders), sorted(pin.pids),
    "the field's holders disagree with pdxSeatHolders — that is two answers to one question again");
  ok((HOUSE.holders || []).length > 0, "the House seat has no holder for a located Utah reader");

  // Nobody on the key is omitted.
  const expect = rosterOnKey(W, "representative", "Utah", 1);
  ok(expect.length >= 2,
    `the roster carries ${expect.length} UT-1 House rows, so 'the whole field' is not testable here`);
  eq(sorted(HOUSE.pids), sorted(expect),
    "the House field is not every roster row on this office + state + district key");

  // It ranks nothing and scores nothing. The one order it does impose is a
  // presentation order — the holder first, then the formal status vocabulary,
  // then the name — so who LEADS the field is still decided by the surface that
  // paints it. A score or a party read here would be a second ranking, which is
  // a second answer waiting to happen.
  const CODE = SEATFIELD.replace(/\/\*[^]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  ok(!/DirectionMatch|_liveDirectionMatch|alignment|axis/i.test(CODE),
    "seat-field.js reads a score — the field function decides who is on the seat, not who leads it");
  ok(!/\bparty\b/i.test(CODE), "seat-field.js reads party");
  ok(!/\bscore\b/i.test(CODE), "seat-field.js reads a score");
  ok(/holders\.indexOf/.test(CODE) && /STATUS_RANK/.test(CODE) && /localeCompare/.test(CODE),
    "seat-field.js's order is no longer holder, then formal status, then name");
  eq(HOUSE.pids[0], (HOUSE.holders || [])[0],
    "the seat's own holder does not lead the seat's own field");
}

// A refusal is a reason, not an empty field: every existing non-Utah and
// non-keyed behaviour depends on the callers being able to tell those apart.
{
  const nope = W.pdxSeatField("nonsense");
  eq(nope.answerable, false, "an unknown seat key is answered rather than refused");
  eq(nope.reason, "not-a-keyed-seat", "an unknown seat key's refusal is not named");
  const un = boot({ located: false });
  const uh = un.pdxSeatField("house");
  eq(uh.answerable, false, "an unlocated reader gets an answerable House field");
  eq(uh.reason, "no-location", "an unlocated reader's refusal is not named");
  const oh = boot({ location: COLUMBUS });
  const ohh = oh.pdxSeatField("house");
  eq(ohh.answerable, false, "an Ohio reader gets a House field we cannot draw a district for");
  eq(ohh.reason, "no-district", "the out-of-coverage refusal is not named");
  // But that reader's statewide seat still answers from their own roster.
  const os = oh.pdxSeatField("senate");
  ok(os.answerable === false || os.state === "Ohio",
    "an Ohio reader's Senate field answers with a state that is not theirs");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · The field is UT-1: Moore is in it, UT-2's candidate is not");

{
  has(HOUSE.pids.join(","), "bmoore",
    "the UT-1 member is missing from a UT-1 reader's House field");
  ok((HOUSE.holders || []).indexOf("bmoore") >= 0,
    "Blake Moore is not tagged as holding the seat he holds for this reader");
  lacks(HOUSE.pids.join(","), "maloy",
    "UT-2's member is still in a UT-1 reader's House field — the reported bug");

  // The same claim on every surface the reader can reach it from.
  const cf = W._ballotCandidates("house") || [];
  const cfp = cf.map((c) => c.pid);
  ok(cfp.indexOf("bmoore") >= 0, "Compare Field's House row set is missing Blake Moore");
  ok(cfp.indexOf("maloy") < 0, "Compare Field still lists UT-2's member on this reader's House seat");
  ok(cf.some((c) => c.pid === "bmoore" && c.incumbent),
    "Compare Field does not tag Blake Moore as the incumbent of the seat he holds");
  ok(!cf.some((c) => c.incumbent && c.pid !== "bmoore"),
    "Compare Field tags somebody other than the resolved holder as this seat's incumbent");

  const deskText = strip(pane(W, "house"));
  has(deskText, "Blake Moore", "the workspace desk for the House seat does not name Blake Moore");
  lacks(deskText, "Celeste Maloy", "the workspace desk still names UT-2's member on a UT-1 seat");
  lacks(deskText, "nobody holds", "the desk still prints 'nobody holds' over a named holder");
  lacks(deskText, "No record on file for the current holder",
    "the desk still prints the blank-holder sentence over a named holder");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Every field surface returns the same field");

const KEYED = ["senate", "house", "governor", "statesenate", "statehouse"];
KEYED.forEach((k) => {
  const sf = W.pdxSeatField(k);
  if (!sf.answerable) { passed++; return; }
  const cf = (W._ballotCandidates(k) || []).map((c) => c.pid);
  eq(sorted(cf), sorted(sf.pids), `${k}: Compare Field's set is not the seat's field`);
  const sheet = (W.PDXRaceSheet._field(k) || []).map((c) => c.pid);
  eq(sorted(sheet), sorted(sf.pids), `${k}: the race sheet's field is not the seat's field`);
  // The scope title names the district or the state, never "your districts".
  const scope = W.pdxSeatScope(k);
  ok(!!scope && !/your district/i.test(scope), `${k}: the scope title is not a place (${scope})`);
  if (!sf.statewide) has(scope, "District", `${k}: a district seat's scope does not name its district`);
  // And the holders on that seat are a subset of its own field: a holder the
  // field does not carry is how "nobody holds the seat" got printed.
  (sf.holders || []).forEach((h) => {
    ok(sf.pids.indexOf(h) >= 0, `${k}: the holder ${h} is not in the seat's own field`);
  });
});
// Source-level, because a consumer that keeps its own union agrees on this
// fixture and diverges on the next address.
has(R("ballot-breakdown.js"), "pdxSeatField", "Compare Field does not ask the field function");
has(R("race-sheet.js"), "pdxSeatField", "the race sheet does not ask the field function");
has(HUB, "pdxSeatField", "Relevant to Me does not ask the field function");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Where they stand and the seat's field are one list");

{
  const grid = relevant(W);
  ok(grid.length > 200 && grid.indexOf("THREW") !== 0, "Relevant to Me painted nothing");
  const groups = W._relevantLastOfficeGroups || {};
  const PAIRS = [
    ["state_senator", "statesenate"],
    ["state_rep", "statehouse"],
    ["representative", "house"],
  ];
  PAIRS.forEach(([gk, seat]) => {
    const sf = W.pdxSeatField(seat);
    if (!sf.answerable) { passed++; return; }
    eq(sorted(groups[gk] || []), sorted(sf.pids),
      `the Where-they-stand column for ${gk} is not the ${seat} field — that divergence IS the bug`);
  });
  // The statewide buckets carry more than one office (Governor's column also
  // holds Lt. Governor, AG, treasurer and auditor; the Senate column holds both
  // seats), so the rule there is containment, not equality.
  [["senator", "senate"], ["governor", "governor"]].forEach(([gk, seat]) => {
    const sf = W.pdxSeatField(seat);
    if (!sf.answerable) { passed++; return; }
    const have = groups[gk] || [];
    const missing = sf.pids.filter((p) => have.indexOf(p) < 0);
    eq(missing.join(","), "", `the Where-they-stand column for ${gk} drops people on that seat`);
  });
  // Titled by place, not by possession.
  ok(!/your districts/i.test(strip(grid)), "Relevant to Me still says 'your districts'");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · One person door: a name opens the file, not a quick-view");

{
  // PDXPerson.url is absolute (it is what gets stamped into the address bar);
  // PDXPersonLink.href is the relative form the markup carries.
  has(W.PDXPerson.url("gleich"), "/p/gleich", "the person file's address for Gleich moved");
  eq(W.PDXPersonLink.href("gleich"), "/p/gleich", "the person link's href for Gleich moved");
  eq(W.PDXPersonLink.href("bmoore"), "/p/bmoore", "the person link's href for a bundled row moved");

  // The door. openModal is index.html's renderer, so the sandbox supplies it and
  // records what it was asked to open — which is what "opens the file" means.
  const D = boot({ location: LAYTON });
  D.CMP_DATA.gleich = GLEICH;
  const opened = [];
  D.openModal = (pid) => { opened.push(String(pid)); };
  // Wrapped, because a door that falls through to the compact card reaches into
  // modules this sandbox does not load and THROWS. That is a real regression and
  // it should be reported as one rather than taking the process down.
  let doorThrew = "";
  try { D.openMediumModal("gleich"); D.openMediumModal("bmoore"); }
  catch (e) { doorThrew = e.message; }
  eq(doorThrew, "",
    "the person door fell through to the compact quick-view renderer instead of opening the file");
  eq(opened.join(","), "gleich,bmoore",
    "a tap on a person did not open their file — the door still goes somewhere else");
  eq(typeof D._pdxMediumId, "undefined",
    "the compact quick-view rendered underneath the person file — that is the Kept/Broken card the reader saw");
  eq(String(D.document.getElementById("pdx-medium-content").innerHTML || ""), "",
    "the quick-view's mount was painted on the way to the person file");
  eq(String(D.document.getElementById("pdx-med-name").textContent || ""), "",
    "the quick-view's header was written on the way to the person file");

  // NOT VACUOUS. With no person file loaded the same call must still land
  // somewhere — the compact card, with the Kept/Broken read on it. So the
  // assertions above are about a card that would otherwise have painted, and
  // the fail-open the door was built with is still there.
  const F = boot({ location: LAYTON });
  F.CMP_DATA.gleich = GLEICH;
  const fallbackOpened = [];
  F.openModal = (pid) => { fallbackOpened.push(String(pid)); };
  F.PDXPerson = null;
  // The card's issue chips reach into profiles-full.js, which is not in this
  // sandbox, so the render throws partway down. That is a harness gap and not
  // the property: what matters is that the call reached the card at all and got
  // as far as writing its header, which the door test above says it must not.
  try { F.openMediumModal("gleich"); } catch (e) { F.__cardThrew = e.message; }
  eq(F._pdxMediumId, "gleich", "with no person file loaded the door is a dead end — fail-open was lost");
  eq(fallbackOpened.length, 0, "the fallback path opened the full modal as well as the quick-view");
  ok(typeof F._pdxMediumCompact === "function", "the compact quick-view renderer was deleted rather than demoted");
  eq(String(F.document.getElementById("pdx-med-name").textContent || ""), "Caroline Gleich",
    "the fallback rendered no card at all, so the door assertions above are vacuous");

  // Source-level: the door is the door, and the card is named as the fallback.
  ok(/window\.openMediumModal = function[^]*?PDXPerson[^]*?\.open\(id\)/.test(HUB),
    "openMediumModal no longer routes to the person file");
  has(HUB, "window._pdxMediumCompact = function",
    "the compact quick-view is not a separately named renderer, so the door cannot fall back to it");

  // The grid's rows go through that door. Every person-open in painted
  // Relevant-to-Me markup is openMediumModal; none of them reach past it to the
  // card renderer directly.
  const grid = relevant(W);
  has(grid, "openMediumModal(", "the Relevant-to-Me grid does not open people through the person door");
  lacks(grid, "_pdxMediumCompact(",
    "a Relevant-to-Me row calls the compact card directly, bypassing the person door");
  const deskAll = KEYED.map((k) => pane(W, k)).join("");
  lacks(deskAll, "_pdxMediumCompact(", "a workspace row bypasses the person door");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · One pick store behind one counter");

{
  const C = W._myteamBallotCounts();
  const rail = W.PDXBallotWorkspace._seats();
  eq(rail.length, C.total,
    "the workspace rail and the picks badge disagree about how many seats this ballot has — 0/11 vs 0 of 6");
  eq(rail.map((s) => s.key).join(","), C.seats.map((s) => s.key).join(","),
    "the rail's seats are not the badge's seats, in the same order");
  eq(W.PDXBallotWorkspace._decided(), C.filled,
    "the rail's decided figure and the badge's filled figure are two different reads");

  // A pick moves both, because there is one store under both.
  const P = boot({ location: LAYTON });
  P._ballotSave({ house: "bmoore" });
  const pc = P._myteamBallotCounts();
  eq(pc.filled, 1, "a saved House pick did not reach the picks counter");
  ok(pc.pids.indexOf("bmoore") >= 0, "the counter's pid list does not carry the pick");
  eq(P.PDXBallotWorkspace._decided(), 1, "a saved House pick did not reach the workspace's count");
  eq(P.PDXBallotWorkspace._picked("house"), "bmoore", "the workspace reads a different pick for the seat");
  eq(pc.total, P.PDXBallotWorkspace._seats().length, "a pick changed one surface's seat total and not the other's");

  // Source-level: the workspace derives its seats and its count from the counter
  // rather than projecting TEAM_POSITIONS a second, shorter way.
  has(WORK, "_myteamBallotCounts", "the workspace no longer reads the one counter");
  ok(/function seats\(\)[^]*?_myteamBallotCounts/.test(WORK),
    "the workspace's seat list does not come from the counter");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Honest holes: the lines may move, and one name is not 'unopposed'");

{
  ["house", "statesenate", "statehouse"].forEach((k) => {
    const t = strip(pane(W, k));
    has(t, "district lines may still move", `${k}: the redistricting note is missing from a district seat`);
    has(t, "not the official ballot", `${k}: the desk does not say it is not the official ballot`);
    has(t, "county clerk", `${k}: the note does not send the reader to the authority that knows`);
  });
  // Statewide seats have no lines to move, so the note must not ride them.
  ["senate", "governor"].forEach((k) => {
    lacks(strip(pane(W, k)), "district lines may still move",
      `${k}: a statewide seat carries a redistricting note about lines it does not have`);
  });

  // The one-person field, wherever this reader has one: the district is named
  // out loud and the unopposed claim is refused. Source-pinned as well, so the
  // property holds on the addresses this fixture does not reach.
  has(WORK, "No other person on file", "the one-person field's honest line was removed");
  ok(/not a claim that the seat is unopposed/.test(WORK),
    "the one-person field no longer refuses the unopposed claim");
  // "Unopposed" may appear on a desk only inside the sentence that REFUSES the
  // claim, because PolitiDex carries no certified filing list and cannot know.
  const deskText = strip(KEYED.map((k) => pane(W, k)).join(" "));
  const unopposed = deskText.match(/.{0,60}\bunopposed\b/gi) || [];
  unopposed.forEach((m) => {
    ok(/not a claim that the seat is unopposed/.test(m),
      `a painted desk claims a seat is unopposed: ${m.trim()}`);
  });
  if (!unopposed.length) passed++;
  const single = KEYED.filter((k) => {
    const sf = W.pdxSeatField(k);
    return sf.answerable && sf.pids.length === 1;
  });
  single.forEach((k) => {
    const t = strip(pane(W, k));
    const sf = W.pdxSeatField(k);
    has(t, "No other person on file", `${k}: a one-person field does not say so`);
    // THE CLAIM NAMES ITS OWN SCOPE, AND A STATEWIDE SEAT HAS NO DISTRICT TO NAME.
    // This asked for "District " unconditionally, which held only while every
    // one-person field in this fixture happened to be a districted seat. A
    // governor's field is one person now, and ballot-workspace's kind === 'one'
    // copy already answers it correctly: it names the district when the seat has
    // one and says "for this seat" when it does not. Naming a district a
    // statewide race does not have would be the bug, so the check follows the
    // seat rather than the other way round.
    if (sf.district != null) {
      has(t, "District " + sf.district,
        `${k}: a districted one-person field does not name the district the claim is about`);
    } else {
      has(t, "No other person on file for this seat",
        `${k}: a statewide one-person field does not name the seat the claim is about`);
      ok(!/\bDistrict\s/.test(t),
        `${k}: a statewide one-person field names a district the seat does not have`);
    }
  });
  if (!single.length) passed++;

  // Running, holding and having run are three different facts.
  has(WORK, "Holds this seat", "the desk no longer distinguishes the holder");
  has(WORK, "Former", "the desk no longer distinguishes a former officeholder from a candidate");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · Nothing the reader can read calls their ballot a team");

{
  const P = boot({ location: LAYTON });
  P._ballotSave({ house: "bmoore", senate: "curtis" });
  const painted = [relevant(P), ...KEYED.map((k) => pane(P, k))];
  // The rail and the count are chrome too.
  ["bw-rail", "bw-count", "relevant-count-badge", "relevant-grid-hint"].forEach((id) => {
    const n = P.document.getElementById(id);
    if (n) painted.push(String(n.innerHTML || "") + " " + String(n.textContent || ""));
  });
  const text = strip(painted.join("\n"));
  // A floor, so "no team" is never a claim about empty markup.
  ok(text.replace(/\s+/g, " ").length > 4000,
    `Door 2 painted only ${text.replace(/\s+/g, " ").length} characters of chrome, so section 8 is vacuous`);
  ok(!/\bteams?\b/i.test(text),
    `Door 2 paints the word "team" at the reader: ${(text.match(/[^.]{0,60}\bteams?\b[^.]{0,40}/i) || [""])[0].trim()}`);
  ok(!/loyal/i.test(text), "Door 2 paints loyalty language over a ballot pick");
  // The attributes a screen reader speaks are visible chrome as well.
  const attrs = painted.join("\n").match(/(?:aria-label|title|placeholder)="([^"]*)"/g) || [];
  const spoken = attrs.join(" ");
  ok(!/\bteams?\b/i.test(spoken),
    `a spoken label on Door 2 still says "team": ${(spoken.match(/[^"]{0,60}\bteams?\b[^"]{0,20}/i) || [""])[0].trim()}`);
  // And the picks view says what it is.
  has(R("door2-spine.js"), "Your picks", "Door 2's picks view lost its name");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Twin boot: the tiers and the scores did not move");

{
  const a = boot({ location: LAYTON });
  const b = boot({ location: LAYTON });
  KEYED.forEach((k) => {
    const fa = a.PDXRaceSheet._field(k) || [];
    const fb = b.PDXRaceSheet._field(k) || [];
    eq(fa.map((c) => c.pid).join(","), fb.map((c) => c.pid).join(","),
      `${k}: two boots disagree about who is on the seat`);
    // Direction Match, as the field surface prints it.
    eq(fa.map((c) => `${c.pid}:${c.score}`).join("|"), fb.map((c) => `${c.pid}:${c.score}`).join("|"),
      `${k}: two boots disagree about a Direction Match read`);
    // The formal lane's own order and its own gap.
    const ra = a.PDXRaceSheet._rank(fa, "record", true);
    const rb = b.PDXRaceSheet._rank(fb, "record", true);
    eq(ra.ranked.map((c) => c.pid).join(","), rb.ranked.map((c) => c.pid).join(","),
      `${k}: the formal record lane's order is not stable across boots`);
    eq((ra.gap || []).map((c) => c.pid).join(","), (rb.gap || []).map((c) => c.pid).join(","),
      `${k}: the formal lane's gap is not stable across boots`);
    // Nobody ranked by Direction Match: the record lane leads with a record.
    ok(ra.ranked.length === 0 || ra.ranked.every((c) => typeof c.pid === "string"),
      `${k}: the record lane returned something that is not a candidate row`);
  });
  eq(a.pdxSeatField("house").pids.join(","), b.pdxSeatField("house").pids.join(","),
    "two boots disagree about the House field");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ door 2 one loop: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ door 2 one loop: ${passed} checks passed — one field function, one person door, ` +
  `one pick store, and no "team"\n`);
