#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-utah-statewide-named.mjs — Utah's statewide seats are never an admission
// ─────────────────────────────────────────────────────────────────────────────
// Live phone, Layton / Davis County. Who Represents Me printed three rows as
// "No record on file yet — we'd rather leave this blank than name the wrong
// person": both U.S. Senate rows and the Governor row. Further down the SAME
// page, the archive band listed John Curtis and Mike Lee, in office, under
// "U.S. Senate · Utah", and the contact strip listed Curtis and Spencer Cox.
//
// One document, one roster, two classifiers, two answers. The blank sentence is
// a statement about OUR coverage, and this app holds full files at /p/curtis,
// /p/lee and /p/cox — so printing it there was the app calling its own true
// answer a mistake.
//
// WHY THE TWO DISAGREED. A statewide seat resolved from two roster strings with
// the resolver's own matchers, and those matchers are stricter than the ones
// Door 1's archive uses (window._pdxBrowseType / window._pdxBrowseStateOf in
// compare-hub.js). An office of plain "Senator" is a U.S. Senate seat to the
// archive and nothing to /\bsenate\b/. "Governor of Utah" is the Governor to
// the archive and not an exact match for "governor". A `state` field rewritten
// to "UT" still reads as Utah to the archive and matches no state name here.
// None of those are missing data. Every one of them is a resolver miss.
//
// WHAT IS PINNED HERE
//   1. The Layton fixture names two Senate pids and a Governor pid, and they
//      are the canonical ones: curtis, lee, cox.
//   2. Those pids are the people the ARCHIVE lists for the same chamber and
//      state. Not a parallel identity, not a second roster.
//   3. The blank-coverage sentence is absent from those three rows, and each of
//      them offers the record jump to /p/<pid>.
//   4. Three payload shapes that used to break the match do not: a title-only
//      office, an abbreviated state, and a fully flattened record.
//   5. The scope did not widen. A Columbus reader still gets their statewide
//      seats and three BLANK district rows carrying the district-map copy, and
//      no Utah district officeholder reaches them.
//   6. No party sort, no score, no new verdict on any of it.
//
//   node scripts/test-utah-statewide-named.mjs
//
// Real shipped modules in a node:vm sandbox with a mini-DOM, the real roster,
// the real resolver and the real archive band.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Everything the band, the resolver and the archive need, in load order.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "issue-colors.js",
  "person-link.js",
  "voter-hub-location.js",
  "compare-hub.js",
  "archive-browse.js",
  "seat-field.js",
  "ballot-breakdown.js",
  "who-represents-me.js",
];

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };
const COLUMBUS = { state: "Ohio", city: "Columbus", county: "Franklin County" };
const CANON = { senators: ["curtis", "lee"], governor: "cox" };
const BLANK = "No record on file yet";
const BLANK_WHY = "rather leave this blank than name the wrong person";

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
  win.document.addEventListener = (ev, cb) => { (listeners[ev] = listeners[ev] || []).push(cb); };
  win.document.removeEventListener = (ev, cb) => {
    listeners[ev] = (listeners[ev] || []).filter((f) => f !== cb);
  };
  win.__fire = (ev) => (listeners[ev] || []).slice().forEach((cb) => { try { cb({ type: ev }); } catch (e) {} });
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub",
   "archive-browse", "pdx-door-truth"].forEach(el);
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = win.localStorage;
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  const errors = [];
  FILES.forEach((f) => {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  });
  win.PROFILES = win.CMP_DATA;
  win._pdxPersonById = (pid) => {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; } catch (e) { return null; }
  };
  win._hasUserLocation = true;
  win._currentVoterLocation = opts.location || LAYTON;
  win.__errors = errors;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ utah statewide named: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const strip = (h) => String(h).replace(/<[^>]*>/g, " ");
const band = (w) => {
  w.PDXWhoRepresentsMe.sync();
  const n = w.document.getElementById("wrm-reps");
  return n ? String(n.innerHTML) : "";
};
const levelsOf = (w) => (w.pdxRepsForMe().levels || []);
const pidFor = (w, key) => (levelsOf(w).filter((lv) => lv.key === key)[0] || {}).pid || null;
const senatePids = (w) => [pidFor(w, "ussenate1"), pidFor(w, "ussenate2")].filter(Boolean).slice().sort();
// The seat rows, split apart and looked up by the heading each one prints, so a
// claim about what a statewide row says cannot be satisfied by a district row
// elsewhere in the same band. (`data-rk` is the RACE key and is empty without
// the race sheet loaded, so the reader-visible label is the honest handle.)
const rowsOf = (html) => String(html).split(/(?=<(?:a|div) class="wrm-row)/).slice(1);
const rowsFor = (html, label) => rowsOf(html).filter((seg) => {
  const m = seg.match(/class="wrm-rowlevel"[^>]*>([^<]*)</);
  return !!m && m[1].trim() === label;
});

const W = boot({ location: LAYTON });
must(typeof W.pdxRepsForMe === "function", `the resolver did not load — ${W.__errors.join(" | ")}`);
must(W.PDXWhoRepresentsMe && typeof W.PDXWhoRepresentsMe.sync === "function", "the homepage band did not load");
must(W.PDXArchiveBrowse && typeof W.PDXArchiveBrowse.roster === "function", "the archive band did not load");
must(W.PDXArchiveBrowse.ready(), "the archive band has no roster/classifier, so every archive comparison is vacuous");
must(Object.keys(W.CMP_DATA || {}).length > 400, "the roster did not load");
// The two classifiers the archive and the agreement walk share. A mini-DOM lets
// compare-hub.js throw partway through its own boot (it reaches for elements this
// sandbox has no reason to hold), so what matters is that these are exported —
// without them the archive comparisons below would be measuring nothing.
must(typeof W._pdxBrowseType === "function" && typeof W._pdxBrowseStateOf === "function",
  `the shared chamber/state classifiers are not exported — ${W.__errors.join(" | ")}`);
CANON.senators.concat(CANON.governor).forEach((pid) =>
  must(!!W.CMP_DATA[pid], `${pid} is not on the roster — the canonical pids in the brief are stale`));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Layton / Davis: two Senate pids and one Governor pid, by name");

{
  eq(senatePids(W).join(","), CANON.senators.join(","),
    "the Layton fixture does not resolve BOTH U.S. Senate seats to Utah's sitting senators");
  eq(pidFor(W, "governor"), CANON.governor,
    "the Layton fixture does not resolve the Governor seat to Utah's sitting governor");
  // The seat owner every other surface reads has to agree, since a band that is
  // right and a workspace header that is not is the same bug in a second place.
  eq((W.pdxSeatHolders("senate").pids || []).slice().sort().join(","), CANON.senators.join(","),
    "pdxSeatHolders('senate') disagrees with the band about who holds Utah's Senate seats");
  eq((W.pdxSeatHolders("governor").pids || []).join(","), CANON.governor,
    "pdxSeatHolders('governor') disagrees with the band about Utah's Governor");
  // Nobody is named twice: two Senate rows, two different people.
  ok(pidFor(W, "ussenate1") && pidFor(W, "ussenate2") &&
     pidFor(W, "ussenate1") !== pidFor(W, "ussenate2"),
    "one person is standing on both U.S. Senate rows");
  eq(W.pdxRepsForMe().statewideAmbiguous, false,
    "Utah's statewide seats came back ambiguous, which blanks all three rows for every reader there");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · The pids are the ARCHIVE's people, not a second identity");

{
  // The archive lists a CHAMBER in a STATE. Anyone the ballot names for a
  // statewide seat has to be somebody that listing already contains, in office
  // — otherwise the page is asserting two different Utahs.
  const archSen = W.PDXArchiveBrowse.roster("senator", "Utah").filter((r) => r.status === "office");
  const archGov = W.PDXArchiveBrowse.roster("governor", "Utah").filter((r) => r.status === "office");
  must(archSen.length > 0, "the archive lists no in-office Utah senators, so the premise of the report is gone");
  const senIds = archSen.map((r) => r.pid);
  senatePids(W).forEach((pid) =>
    ok(senIds.indexOf(pid) !== -1,
      `the ballot names ${pid} for a Utah U.S. Senate seat and the archive band on the same page does not list them: ` +
      JSON.stringify(senIds)));
  eq(senIds.slice().sort().join(","), CANON.senators.join(","),
    "the archive's own in-office Utah Senate listing is not Curtis and Lee, so the two surfaces were reconciled to the wrong set");
  ok(archGov.some((r) => r.pid === CANON.governor),
    "the archive does not list Utah's governor in office, so the Governor row has nothing to agree with");
  // And the roster read is the same object in both directions — one roster, not
  // a ballot copy and an archive copy.
  CANON.senators.concat(CANON.governor).forEach((pid) =>
    eq(W.PDXArchiveBrowse.stateOf(pid), "Utah",
      `the archive does not place ${pid} in Utah, so the two surfaces are reading different state fields`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The blank sentence is gone from those three rows, and the record is one tap away");

{
  const html = band(W);
  const text = strip(html);
  has(text, "6 of 6 seats resolved", "the Layton band no longer reports six of six");
  [["U.S. Senate · Utah", 2], ["Governor · Utah", 1]].forEach(([label, n]) => {
    const rows = rowsFor(html, label);
    must(rows.length === n, `the band paints ${rows.length} "${label}" rows, not ${n} — this section is vacuous`);
    rows.forEach((seg, i) => {
      const row = strip(seg);
      lacks(row, BLANK, `the "${label}" row ${i + 1} prints the blank-coverage sentence over somebody the archive lists`);
      lacks(row, "rather leave this blank", `the "${label}" row ${i + 1} still carries the blank-coverage explanation`);
      has(row, "See their record", `the "${label}" row ${i + 1} does not offer the reader the record`);
    });
  });
  lacks(html, "wrm-row--unresolved",
    "a seat row painted as unresolved for a Layton reader whose six seats all resolved");
  ["curtis", "lee", "cox"].forEach((pid) => {
    has(text, W.CMP_DATA[pid].name, `${pid} is not named on the band`);
    has(html, "/p/" + pid, `the ${pid} row does not offer "See their record" at /p/${pid}`);
  });
  has(text, "See their record", "no row offers the record jump the band promises");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Three payload shapes that used to blank the rows");

// Each case rewrites the two strings a statewide seat used to be resolved from,
// with a NON-blank value — so index.html's blank-never-overwrites merge guard
// does not apply and the record really does arrive looking like this. None of
// them is a departure from office; every one of them used to be a blank row.
const REWRITES = [
  {
    label: "a title-only office (\"Senator\" / \"Governor of Utah\")",
    apply(w) {
      w.CMP_DATA.curtis.office = "Senator";
      w.CMP_DATA.lee.office = "Senator";
      w.CMP_DATA.cox.office = "Governor of Utah";
    },
    // The archive's classifier reads all three of these, so the agreement walk
    // is what has to catch them.
    archiveStillLists: true,
  },
  {
    label: "an abbreviated state (\"UT\")",
    apply(w) {
      ["curtis", "lee", "cox"].forEach((pid) => { w.CMP_DATA[pid].state = "UT"; });
    },
    archiveStillLists: true,
  },
  {
    label: "a fully flattened record (office and state both emptied)",
    apply(w) {
      ["curtis", "lee", "cox"].forEach((pid) => { w.CMP_DATA[pid].office = ""; w.CMP_DATA[pid].state = ""; });
    },
    // Here even the archive loses them, so nothing is left but the curated
    // floor — and a cold page has no earlier paint to carry forward.
    archiveStillLists: false,
  },
];

REWRITES.forEach((c) => {
  const w = boot({ location: LAYTON });
  c.apply(w);
  // A merge also ADDS records, which is what invalidates every size-keyed memo.
  w.CMP_DATA.__pdx_stub_a = { name: "", office: "", state: "" };
  try { w.__fire("pdx:data:cmpDetail"); } catch (e) {}

  eq(senatePids(w).join(","), CANON.senators.join(","), `[${c.label}] both Senate seats did not resolve`);
  eq(pidFor(w, "governor"), CANON.governor, `[${c.label}] the Governor seat did not resolve`);
  const text = strip(band(w));
  lacks(text, BLANK, `[${c.label}] the band prints the blank-coverage sentence`);
  lacks(text, BLANK_WHY, `[${c.label}] the band prints the blank-coverage explanation`);
  has(text, "6 of 6 seats resolved", `[${c.label}] the count dropped below six of six`);
  if (c.archiveStillLists) {
    const senIds = w.PDXArchiveBrowse.roster("senator", "Utah")
      .filter((r) => r.status === "office").map((r) => r.pid);
    senatePids(w).forEach((pid) =>
      ok(senIds.indexOf(pid) !== -1,
        `[${c.label}] the ballot and the archive disagree again — ${pid} is not in the archive listing`));
  }
  // Whatever the payload did to the strings, nobody was invented: every pid the
  // band names is a roster record, and UT-1's member is not on a UT-2 ballot.
  levelsOf(w).forEach((lv) => {
    if (!lv.pid) return;
    ok(!!w.CMP_DATA[lv.pid], `[${c.label}] the ${lv.key} row names ${lv.pid}, who is not on the roster`);
  });
  lacks(text, "Blake Moore", `[${c.label}] UT-1's member appeared on a UT-2 ballot`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("5 · The scope did not widen: Columbus keeps three honest blanks");

{
  const O = boot({ location: COLUMBUS });
  const reps = O.pdxRepsForMe();
  eq(reps.districtsResolvable, false, "Ohio now claims curated district geometry");
  ["house", "statesenate", "statehouse"].forEach((key) => {
    eq(pidFor(O, key), null,
      `the ${key} seat resolved an officeholder for an Ohio reader — district seats outside Utah have no map`);
    const lv = levelsOf(O).filter((l) => l.key === key)[0] || {};
    eq(lv.district, null, `the ${key} row carries a district number for an Ohio reader`);
  });
  // Statewide coverage is national and stays national: this pass did not take
  // Ohio's two Senate seats and its Governor away to fix Utah's.
  ok(senatePids(O).length === 2, "an Ohio reader lost a U.S. Senate seat to this pass");
  ok(!!pidFor(O, "governor"), "an Ohio reader lost their Governor to this pass");
  // And no Utah pid leaks into an Ohio answer.
  const utahish = CANON.senators.concat(CANON.governor, ["maloy", "moore", "stevenson", "ward"]);
  levelsOf(O).forEach((lv) => {
    if (!lv.pid) return;
    ok(utahish.indexOf(lv.pid) === -1, `an Ohio reader's ${lv.key} row names the Utah record ${lv.pid}`);
  });

  const text = strip(band(O));
  has(text, "Not resolved for your area yet",
    "an Ohio reader's district rows do not say they are unresolved");
  has(text, "rather leave this blank than guess at your seat",
    "the district-blank copy changed — an Ohio reader's blank rows must still explain themselves");
  has(text, "3 of 6 seats resolved", "the Ohio count no longer reports three of six");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · No party sort, no score, no new verdict");

{
  const text = strip(band(W));
  // (R) beside a name is an identifier, the way a ballot prints one. What must
  // not exist is an ORDER built on it: Utah's two senators are both Republicans,
  // so party cannot be shown to order anything from this fixture alone — the
  // resolver's own source is the checkable claim.
  const SRC = R("voter-hub-location.js");
  const swBlock = SRC.slice(SRC.indexOf("_pdxArchiveStatewideWalk"), SRC.indexOf("window.pdxRosterReady"));
  must(swBlock.length > 500, "the statewide block could not be located in voter-hub-location.js");
  ["\\.party", "sortByParty", "partyRank"].forEach((needle) => {
    ok(!new RegExp(needle).test(swBlock),
      `the statewide seat resolution reads party ("${needle}") — an identity chip may print beside a name and must not order the field`);
  });
  ok(!/\.score\b/.test(swBlock),
    "the statewide seat resolution reads a score — naming who holds a seat is not a judgement about them");
  ["% match", "aligned", "loyalty", "grade"].forEach((w) =>
    lacks(text.toLowerCase(), w.toLowerCase(), `the band says "${w}" — it is a name-and-seat surface`));
}

if (failures.length) {
  console.error(`\n✗ utah statewide named: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ utah statewide named: ${passed} checks passed — Layton resolves Curtis, Lee and Cox, the archive agrees, the blank sentence is gone, and Columbus keeps its district blanks`);
