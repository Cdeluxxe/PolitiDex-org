#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-seat-never-unnamed.mjs — a seat that has been named is never un-named
// ─────────────────────────────────────────────────────────────────────────────
// Live phone, Layton / Davis County: Who Represents Me painted SIX of six. John
// Curtis and Mike Lee on the two U.S. Senate rows, Spencer Cox on the Governor
// row, photos, "See their record". Then the "Loading the latest roster…" pill
// fired, a second roster payload merged, and those same three rows became "No
// record on file yet — we'd rather leave this blank than name the wrong person"
// with the count down to three of six. The House and state-legislative rows,
// which resolve from the district map rather than from roster metadata, stayed.
//
// The blank sentence is an admission about OUR coverage. Printing it over people
// the same page named a moment earlier is the app calling its own true answer a
// mistake, and it is strictly worse than never having answered: the reader had
// their senators and then watched the site take them away.
//
// TWO THINGS ARE PINNED HERE, an input and a rule.
//
//   THE INPUT. A light Firestore stub carries only the fields its document has,
//   and the bulk merge in index.html defaults the essentials before assigning —
//   so a document with no `office`/`state` arrives as office:'' state:'' and the
//   old Object.assign wrote those two empty strings over "U.S. Senator"/"Utah".
//   Statewide seats resolve from exactly those two strings, which is how one
//   merge deleted three officeholders. _pdxMergeRosterRecord now refuses to let
//   a blank overwrite a value.
//
//   THE RULE, which holds even if some future payload finds another way to
//   flatten a record. The resolver keeps a ledger of the seats it has already
//   named for this reader, and a seat only loses its holder to a DIFFERENT pid
//   or to that person leaving the roster outright. A mid-load read or a smaller
//   second snapshot cannot write a blank over a named row.
//
// Sections:
//   1. THE COUNTERFACTUAL. The blanking payload really is destructive: a page
//      that meets it with no prior answer resolves three of six. That is what
//      the reader got, and it is what the rule has to survive.
//   2. THE BAND HOLDS. Same payload after a good paint — six of six, the same
//      pids, no blank sentence, and the toast is only a toast.
//   3. THE OWNER HOLDS. pdxSeatHolders() keeps both senators and the governor,
//      nobody is named twice, and a half-flattened Senate keeps both seats.
//   4. THE HEADERS AGREE. The workspace Senate/Governor panes cannot say "no
//      officeholder" over holders the band has already shown this session.
//   5. AN EMPTY ROSTER IS A LOAD STATE. window.CMP_DATA going empty mid-flight
//      does not blank a named row; the memo is not re-poisoned.
//   6. WHAT STILL RELEASES A SEAT. A different pid wins outright; a pid dropped
//      from the roster is released; a change of location forgets everything, so
//      a Utah reader's senators never follow them to Ohio.
//   7. THE MERGE GUARD. A live field still wins; only blanks lose.
//   8. TWIN BOOT. DM and the formal tiers are untouched by any of it.
//
//   node scripts/test-seat-never-unnamed.mjs
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
  "seat-field.js",
  "ballot-breakdown.js",
  "who-represents-me.js",
];
const TAIL = ["race-sheet.js", "ballot-workspace.js"];
const VHL = R("voter-hub-location.js");
const INDEX = R("index.html");
const BOOT = R("firebase-boot.js");

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };
const COLUMBUS = { state: "Ohio", city: "Columbus", county: "Franklin County" };

// The three seats the reader lost, and the two strings a statewide seat is
// resolved from. Flattening these is the whole payload.
const STATEWIDE_PIDS = ["curtis", "lee", "cox"];
const IDENTITY = ["office", "state"];

function miniDom(win) {
  const byId = {};
  const listeners = {};
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
  // The roster-arrival watcher subscribes to pdx:data:cmpDetail on the document,
  // which is exactly the moment this test needs to be able to fire.
  win.document.addEventListener = (ev, cb) => {
    (listeners[ev] = listeners[ev] || []).push(cb);
  };
  win.document.removeEventListener = (ev, cb) => {
    listeners[ev] = (listeners[ev] || []).filter((f) => f !== cb);
  };
  win.__fire = (ev) => (listeners[ev] || []).slice().forEach((cb) => { try { cb({ type: ev }); } catch (e) {} });
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub",
   "ballot-workspace", "bw-body"].forEach(el);
  return byId;
}

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
  FILES.forEach(run);
  TAIL.forEach(run);

  win.PROFILES = win.CMP_DATA;
  win._pdxPersonById = function (pid) {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; }
    catch (e) { return null; }
  };
  win._hasUserLocation = true;
  win._currentVoterLocation = opts.location || LAYTON;
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
const count = (w) => (w.pdxRepsForMe().levels || []).filter((lv) => lv.resolved).length;
const pidsOf = (w) => (w.pdxRepsForMe().levels || []).map((lv) => lv.key + ":" + (lv.pid || "")).join(",");
const senate = (w) => (w.pdxSeatHolders("senate").pids || []).slice().sort().join(",");
// Several claims below are about what a shipped file DOES, and a file is allowed
// to describe the shape it used to have in a comment. Strip the prose first.
const CODE = (src) => String(src).replace(/^[ \t]*\/\/.*$/gm, "");

// ── The second payload, exactly as the live one behaved ──────────────────────
// A merge into the same global that carries the record but not its identity
// strings — which is what the light Firestore stub did once index.html's
// defaulting had turned two missing fields into two empty strings. The records
// stay on the roster: nobody resigned, the payload simply did not describe them.
function flatten(w, pids) {
  (pids || STATEWIDE_PIDS).forEach((pid) => {
    const rec = w.CMP_DATA[pid];
    if (!rec) return;
    IDENTITY.forEach((f) => { rec[f] = ""; });
  });
  // Merges also ADD records, which grows the roster and invalidates every
  // size-keyed memo — the reason the old memo could not defend against this.
  w.CMP_DATA.__pdx_payload_stub_a = { bio: "arrived with the second payload" };
  w.CMP_DATA.__pdx_payload_stub_b = { bio: "arrived with the second payload" };
  try { w.__fire("pdx:data:cmpDetail"); } catch (e) {}
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
  console.error(`✗ seat never un-named: ${msg}`);
  process.exit(1);
};

const W = boot({ location: LAYTON });
must(typeof W.pdxRepsForMe === "function", `the resolver is not loaded — ${W.__errors.join(" | ")}`);
must(typeof W.pdxSeatHolders === "function", "window.pdxSeatHolders is not exposed");
must(W.PDXWhoRepresentsMe && typeof W.PDXWhoRepresentsMe.sync === "function",
  "the homepage band is not loaded");
must(W.PDXBallotWorkspace && typeof W.PDXBallotWorkspace.sync === "function",
  "the ballot workspace is not loaded");
must(Object.keys(W.CMP_DATA || {}).length > 50,
  "the roster did not load, so every name assertion below would be vacuous");
STATEWIDE_PIDS.forEach((pid) =>
  must(!!W.CMP_DATA[pid], `${pid} is not on the roster, so the smoke report's premise is gone`));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Counterfactual: the payload really does delete three officeholders");

{
  // A page that meets the flattened records with no prior answer to protect.
  // This is the reader's experience on the shipped build, and it is the thing
  // section 2 has to survive: THREE of six, both Senate rows and the Governor
  // row carrying the blank-coverage sentence.
  const cold = boot({ location: LAYTON });
  flatten(cold);
  eq(count(cold), 3, "the flattening payload is not destructive, so this fixture proves nothing");
  eq(senate(cold), "", "the flattened payload still resolves the Senate seat");
  const cb = strip(band(cold));
  has(cb, "3 of 6 seats resolved", "the counterfactual band does not read three of six");
  has(cb, "No record on file yet",
    "the counterfactual band does not print the blank-coverage sentence, so the defect is elsewhere");
  // And the records are still there — the payload flattened them, it did not
  // remove them. That distinction is the entire fix.
  STATEWIDE_PIDS.forEach((pid) =>
    ok(!!cold.CMP_DATA[pid], `${pid} left the roster; the fixture is testing the wrong failure`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Who Represents Me holds six of six across the same payload");

const BEFORE = pidsOf(W);
{
  const first = strip(band(W));
  eq(count(W), 6, "the Layton fixture does not start at six of six");
  has(first, "6 of 6 seats resolved", "the first paint does not read six of six");
  ["curtis", "lee", "cox"].forEach((pid) =>
    has(first, W.CMP_DATA[pid].name, `${pid} is not named on the first paint`));

  flatten(W);

  const after = band(W);
  const AT = strip(after);
  eq(count(W), 6, "the second payload dropped the reader from six of six");
  has(AT, "6 of 6 seats resolved", "the count fell after the second payload");
  eq(pidsOf(W), BEFORE, "the second payload changed which pid sits on which seat");

  // THE SENTENCE THAT STARTED THIS. It may never appear over somebody this page
  // has already named.
  lacks(AT, "No record on file yet",
    "the blank-coverage sentence is painted over holders the same page already named");
  lacks(AT, "rather leave this blank than name the wrong person",
    "the statewide rows went back to the blank statewide copy");
  lacks(after, "wrm-row--unresolved",
    "a row painted unresolved after a payload that named nobody new");
  ["curtis", "lee", "cox"].forEach((pid) => {
    has(AT, W.CMP_DATA[pid].name, `${pid} lost their name to the second payload`);
    ok(after.indexOf(pid) >= 0, `the ${pid} row lost the link to their record`);
  });
  eq((after.match(/See their record/g) || []).length, 6,
    "not every seat still offers the reader their record");
  // No invention on the way through: the band names the same six people, not a
  // guess, a challenger or a party stand-in.
  lacks(AT, "Celeste Maloy", "the band names the UT-2 member as a Davis County holder");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The seat owner keeps every holder, and names nobody twice");

{
  eq(senate(W), "curtis,lee", "the Senate seat lost a holder to the second payload");
  eq((W.pdxSeatHolders("governor").pids || []).join(","), "cox",
    "the Governor seat lost its holder to the second payload");
  eq((W.pdxSeatHolders("house").pids || []).join(","), "bmoore",
    "the House seat changed holder across a payload that touched no district");
  ok(W.pdxSeatHolders("senate").ok, "the Senate seat reports no holders");
  // The statewide walk answered out of its own ledger here, so these are its own
  // holders rather than levels refilled afterwards. `sticky` flags the latter and
  // section 5 exercises it; either way the row is resolved and no copy anywhere
  // hedges on which of the two paths named the person.
  eq(W.pdxSeatHolders("senate").sticky, false,
    "the statewide walk stopped answering for itself");

  // A HALF-FLATTENED SEAT KEEPS BOTH SEATS, AND NOT BY DUPLICATING ONE PERSON.
  // This is the case a naive per-row memory gets wrong: with one senator still
  // resolvable, the surviving one must not be printed on both Senate rows.
  const half = boot({ location: LAYTON });
  eq(senate(half), "curtis,lee", "the half-flatten fixture did not start with both senators");
  flatten(half, ["curtis"]);
  eq(senate(half), "curtis,lee", "flattening one senator cost the reader that senator");
  const levels = (half.pdxRepsForMe().levels || []).filter((lv) => lv.seat === "senate");
  eq(levels.length, 2, "the Senate seat stopped emitting both of a state's seats");
  ok(levels[0].pid !== levels[1].pid,
    `the same person is printed on both Senate rows (${levels[0].pid})`);
  const hb = strip(band(half));
  eq((hb.match(new RegExp(half.CMP_DATA.lee.name, "g")) || []).length, 1,
    "the surviving senator is named twice in the band");
  has(hb, "6 of 6 seats resolved", "a half-flattened Senate dropped the count");

  // A seat never carries more holders than the office has.
  ok((half.pdxSeatHolders("senate").pids || []).length <= 2,
    "the Senate seat reports more than two holders");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The workspace headers cannot contradict the band");

{
  const ST = strip(pane(W, "senate"));
  has(ST, "Holds this seat now", "the Senate pane stopped saying who holds the seat");
  has(ST, W.CMP_DATA.curtis.name, "the Senate header does not name Curtis after the payload");
  has(ST, W.CMP_DATA.lee.name, "the Senate header does not name Lee after the payload");
  lacks(ST, "No current officeholder resolved",
    "the Senate header reports no officeholder over holders the band already named");
  lacks(ST, "No record on file",
    "the Senate header claims no record over holders with full files");
  lacks(ST, "District not mapped", "a statewide seat is described as an unmapped district");

  const gov = strip(pane(W, "governor"));
  has(gov, "Holds this seat now", "the Governor pane stopped saying who holds the seat");
  has(gov, W.CMP_DATA.cox.name, "the Governor header does not name Cox after the payload");
  lacks(gov, "No current officeholder resolved",
    "the Governor header reports no officeholder over a governor the band already named");

  // Containment in the direction that matters: the header names only people the
  // owner returned for that seat.
  ["senate", "house", "governor", "statesenate", "statehouse"].forEach((rk) => {
    const owned = (W.pdxSeatHolders(rk).pids || []).map(String);
    const html = pane(W, rk);
    const line = /Holds this seat now:([\s\S]*?)<\/span>\s*<\/span>/.exec(html);
    if (!owned.length) {
      ok(!line, `${rk}: the header names a holder the owner never resolved`);
      return;
    }
    ok(!!line, `${rk}: the owner resolved a holder the header does not name`);
    const named = (line[1].match(/\/p\/([A-Za-z0-9_.-]+)|showProfile\('([^']+)'\)/g) || [])
      .map((m) => m.replace(/^\/p\//, "").replace(/^showProfile\('/, "").replace(/'\)$/, ""));
    named.forEach((pid) => {
      ok(owned.indexOf(pid) >= 0,
        `${rk}: the header names ${pid}, who is not one of the owner's holders (${owned.join(",")})`);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · An empty roster is a load state, not a resignation");

{
  const w = boot({ location: LAYTON });
  eq(count(w), 6, "the fixture did not start at six of six");
  const before = pidsOf(w);

  // window.CMP_DATA emptied mid-flight — the shape of every "the roster is not
  // here yet" moment on a cold phone. It is not information about who holds a
  // seat, so it may not take one away.
  Object.keys(w.CMP_DATA).forEach((k) => { delete w.CMP_DATA[k]; });
  eq(Object.keys(w.CMP_DATA).length, 0, "the roster was not actually emptied");
  eq(count(w), 6, "an empty roster un-named the reader's seats");
  ok(w.pdxSeatHolders("house").sticky,
    "a level refilled from the seat ledger is not reported as refilled");
  eq(pidsOf(w), before, "an empty roster changed which pid sits on which seat");
  lacks(strip(band(w)), "No record on file yet",
    "an empty roster paints the blank-coverage sentence over named holders");

  // And when it comes back, nothing was poisoned: the memo does not hold the
  // emptiness and the names are the same names.
  const fresh = boot({ location: LAYTON });
  Object.keys(fresh.CMP_DATA).forEach((k) => { w.CMP_DATA[k] = fresh.CMP_DATA[k]; });
  try { w.__fire("pdx:data:cmpDetail"); } catch (e) {}
  eq(count(w), 6, "the roster returning did not restore six of six");
  eq(pidsOf(w), before, "the roster returning named different people");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · What still releases a seat: a new answer, a departure, a new address");

{
  // A DIFFERENT PID WINS OUTRIGHT. The ledger never competes with an answer —
  // it only fills a slot the current walk left empty.
  const w = boot({ location: LAYTON });
  eq(senate(w), "curtis,lee", "the fixture did not start with both senators");
  const gone = w.CMP_DATA.curtis;
  w.CMP_DATA.pdx_new_senator = { name: "A Newly Seated Senator", office: "U.S. Senator", state: "Utah", party: "I" };
  gone.office = "Former U.S. Senator";
  eq(senate(w), "lee,pdx_new_senator",
    "a newly seated senator did not replace the member who left the seat");
  const nb = strip(band(w));
  has(nb, "A Newly Seated Senator", "the band does not name the new holder");
  lacks(nb, w.CMP_DATA.curtis.name, "the band still names the member who left the seat");

  // A PID THAT LEAVES THE ROSTER IS RELEASED. This is the explicit empty: the
  // app no longer holds this person at all, and the honest row is blank.
  const d = boot({ location: LAYTON });
  eq(count(d), 6, "the departure fixture did not start at six of six");
  delete d.CMP_DATA.cox;
  ok(!d.CMP_DATA.cox, "the fixture did not actually drop the record");
  eq((d.pdxSeatHolders("governor").pids || []).length, 0,
    "a pid the roster no longer holds is still named as the officeholder");
  has(strip(band(d)), "No record on file yet",
    "a genuinely unresolved statewide seat stops admitting it");
  // …and only that seat. A departure is not a reason to blank the neighbours.
  eq(senate(d), "curtis,lee", "one departure took the Senate seat down with it");
  eq(count(d), 5, "one departure cost more than one seat");

  // A NEW ADDRESS FORGETS EVERYTHING. Utah's senators must not follow a reader
  // to Ohio, which is the one way stickiness could name the wrong human.
  const m = boot({ location: LAYTON });
  eq(senate(m), "curtis,lee", "the moving reader did not start with Utah's senators");
  m._currentVoterLocation = COLUMBUS;
  const oh = senate(m);
  lacks(oh, "curtis", "Utah's senator followed the reader to Ohio");
  lacks(oh, "lee", "Utah's senator followed the reader to Ohio");
  ok((m.pdxSeatHolders("senate").pids || []).length === 2,
    "the moved reader does not get their own two senators");
  const ob = strip(band(m));
  ["Mike Lee", "Spencer Cox", "Blake Moore", "Jerry Stevenson"].forEach((n) =>
    lacks(ob, n, `an Ohio reader is shown Utah's ${n}`));
  has(ob, "Not resolved for your area yet",
    "an unmapped district stops saying so for a moved reader");
  // And the district rows do not inherit Utah's numbers on the way out.
  const dl = (m.pdxRepsForMe().levels || []).filter((lv) => !lv.statewide);
  dl.forEach((lv) => eq(lv.district, null, `${lv.key} kept a Utah district for an Ohio reader`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The merge that started it: a live field wins, a blank never does");

{
  // The guard is exercised directly, because it lives in an inline script in
  // index.html that cannot be booted headless. Both halves matter: an arriving
  // value must still win, or this would freeze the roster instead of protecting
  // it.
  has(INDEX, "function _pdxMergeRosterRecord",
    "index.html no longer owns the blank-safe roster merge");
  lacks(CODE(INDEX), "Object.assign(CMP_DATA[id], p)",
    "the bulk roster merge can still write a blank over a curated field");
  has(BOOT, "_pdxMergeRosterRecord(CMP_DATA[id], full)",
    "the full-profile merge does not use the blank-safe merge");

  const src = INDEX.slice(INDEX.indexOf("function _pdxMergeRosterRecord"));
  const end = src.indexOf("function _checkAndTrigger");
  const merge = vm.runInNewContext(
    src.slice(0, end > 0 ? end : 2000) + "\n;({ m: _pdxMergeRosterRecord })", {});

  const dst = { name: "John Curtis", office: "U.S. Senator", state: "Utah", party: "R", score: 61, issues: ["debt"] };
  merge.m(dst, { name: "John Curtis", office: "", state: "", party: "", score: null, issues: [], icon: "🏛" });
  eq(dst.office, "U.S. Senator", "a blank office overwrote a curated one");
  eq(dst.state, "Utah", "a blank state overwrote a curated one");
  eq(dst.party, "R", "a blank party overwrote a curated one");
  eq(dst.score, 61, "a null score overwrote a curated one");
  eq(dst.issues.length, 1, "an empty issues array overwrote a curated one");
  eq(dst.icon, "🏛", "an arriving field the record did not have was dropped");

  // A REAL VALUE STILL WINS, including a correction that changes the seat.
  merge.m(dst, { office: "Former U.S. Senator", state: "Utah", score: 58 });
  eq(dst.office, "Former U.S. Senator", "a live document can no longer correct an office");
  eq(dst.score, 58, "a live document can no longer correct a score");

  // A blank field on a record that had nothing there is written, so the shape
  // renderers expect is unchanged.
  const bare = {};
  merge.m(bare, { office: "", name: "Somebody" });
  eq(bare.office, "", "a record with no value at all does not receive the default");
  eq(bare.name, "Somebody", "a live value was dropped onto an empty record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · The rule lives in the resolver, and the toast is only a toast");

{
  // ONE OWNER. The rule is enforced where the levels are built, so the band, the
  // workspace header, the race sheet's tag and pdxSeatHolders() all inherit it
  // rather than each keeping their own memory of who was named.
  has(VHL, "function _pdxStickLevels", "the resolver does not own the never-un-named rule");
  has(VHL, "_pdxStickLevels(levels", "the resolver builds levels without applying the rule");
  has(VHL, "_pdxStatewideBest", "the statewide walk keeps no ledger of what it has answered");
  const FLUSH = CODE(VHL.slice(VHL.indexOf("function _pdxRosterFlush"),
    VHL.indexOf("var _PDX_ROSTER_WAIT")));
  ok(FLUSH.length > 100, "the roster-arrival flush could not be located");
  lacks(FLUSH, "_pdxStatewideBest", "a roster arrival clears the ledger of named holders");
  lacks(FLUSH, "_pdxSeatLedger", "a roster arrival clears the seat ledger");

  // NO GUESSING, NO PARTY, NO SCORE. The ledger carries a pid the resolver
  // itself produced and nothing else.
  const STICK = VHL.slice(VHL.indexOf("function _pdxStickLevels"),
    VHL.indexOf("window._pdxForgetSeatHolders"));
  ok(STICK.length > 200, "the sticky pass could not be located");
  ["party", "score", "rank", "challenger"].forEach((w) =>
    lacks(STICK, w, `the sticky pass reads ${w}`));
}

{
  // TWIN BOOT. Two boots of the same fixture, one with positions set, one of
  // them carrying the payload. Who is named on a seat changed; which lane ranks
  // a field and where Direction Match is printed did not.
  const a = boot({ location: LAYTON });
  const b = boot({ location: LAYTON });
  const KEYS = Object.keys(b.ISSUE_MAP || {}).slice(0, 4);
  must(KEYS.length >= 2, "ISSUE_MAP is empty, so the ranked lane cannot be exercised");
  KEYS.forEach((k) => b._alignIssues.add(k));
  must(b.PDXRaceSheet._axis().length >= 2, "the positions did not reach the shared axis");
  band(a); band(b);
  flatten(a); flatten(b);

  ["senate", "house", "governor"].forEach((k) => {
    const pa = pane(a, k);
    const pb = pane(b, k);
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
      if (h.indexOf("bw-dm") < 0) { passed++; return; }
      has(h, "Direction Match", `${k}: pane ${i} lost the DM label`);
      const slots = h.match(/<span class="bw-score">[\s\S]*?<\/span><span class="bw-cand-who">/g) || [];
      slots.forEach((sl) => lacks(sl, "Direction Match", `${k}: pane ${i} puts DM in the ruler's number slot`));
    });
    eq((a.pdxSeatHolders(k).pids || []).join(","), (b.pdxSeatHolders(k).pids || []).join(","),
      `${k}: the two boots disagree about who holds the seat`);
  });

  // And the band still offers exactly the controls it always did: the same
  // number of them, none wrapping another and none wrapping a link.
  const html = band(a);
  // Per-seat controls are counted rather than the band's whole button set: the
  // next-step chips below the band are derived from roster metadata this fixture
  // deliberately destroys, and one of them ("My local officials") legitimately
  // stands down when that metadata is gone. The six seat rows may not.
  ["rs-entry rs-entry--compact", "rs-seat-work", "rs-seat-stance"].forEach((c) => {
    eq((html.match(new RegExp('class="' + c + '"', "g")) || []).length, 6,
      `the payload changed how many ${c} controls the seat rows offer`);
  });
  ok(!/<button[^>]*>(?:(?!<\/button>)[\s\S])*<(?:button|a)\b/.test(html),
    "a control in the band now nests another control");
  ok(!/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<button\b/.test(html),
    "a link in the band now wraps a button");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ seat never un-named: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ seat never un-named: ${passed} checks passed — a named seat survives ` +
  `the second payload, and only a new answer or a real departure can take it\n`);
