#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-relevant-is-my-ballot.mjs — Relevant to Me is the reader's civic stack
// ─────────────────────────────────────────────────────────────────────────────
// TWO BUGS, IN OPPOSITE DIRECTIONS, AND THIS FILE HOLDS THE LINE BETWEEN THEM.
//
// TOO LOOSE, as a Layton reader met it on Door 2. Above the ballot workspace,
// under the heading RELEVANT TO ME, sat an accordion labelled CABINET /
// APPOINTED with the subtitle "Federal — represents every American" and a button
// reading "Compare the field · 38 in this race". Opening it produced the
// secretaries of state of California, Colorado, Washington, Texas, Ohio,
// Georgia, Michigan and nine other states, mixed in with the federal cabinet.
// Nobody in Layton asked for Jena Griswold. Under it, a second accordion offered
// a five-way "race" between Trump, Vance, Biden, Obama and G.W. Bush.
//
//   1. The located sweep added `president` and `cabinet` to the reader's slate
//      BEFORE the state check, so both groups were national for every visitor.
//   2. Door 1's classifier files any office containing secretary/director/
//      ambassador under `cabinet`. That is the federal cabinet AND sixteen other
//      states' secretaries of state, in one bucket.
//   3. _pdxFieldCompareBtn renders "N in this race" for any group, so a roster
//      slice of 38 appointed officials was printed as a race with 38 runners.
//
// TOO TIGHT, as the first fix left it. Scoping the section to the seat kinds
// window.TEAM_POSITIONS can name dropped the presidency and the whole federal
// cabinet from a Utah ballot — because Utah's slate does not name them. But a
// Layton reader IS governed by the President and by the federal executive. They
// are simply not governed by another state's Secretary of State. A section
// titled "relevant to me" that omits the President is answering a narrower
// question than the one it asks.
//
// AND THEN THE CARDS THEMSELVES SPOKE MARKUP. With the scope right, five cards
// on a live Layton ballot — Lee, Curtis, Moore, Trump, Rubio — printed one good
// record sentence and then the source of an HTML tag under it, beginning `<span
// class="pdxst-pat w-full" style="--c:#4ade80;…"`. The shared reader handed the
// card the shape row's `chip` field alongside the sentence, and that field is not
// a token: it is the characterisation engine's already-rendered .pdxst-pat span.
// The card escaped everything it printed, correctly, and the escaping turned the
// node into words. Two smaller things travelled with it: senators wore a 📍 Local
// pin over a seat that is the whole state, and a card that had asked for a member
// payload and never been handed one read "Formal record still loading…" for the
// life of the page, because the only deadline that ends that wait is armed by the
// person file's own paragraph and never by a list.
//
// THEN THE SEAT ITSELF WAS ASKED THE WRONG QUESTION. "Currently holds this
// seat" for the U.S. House on a Layton ballot was reported to name Thomas W.
// Peterson beside Blake Moore. Peterson sits in the UTAH House, for Box Elder /
// Cache County. The two records share exactly one thing: the numeral 1 — Moore
// holds Utah's 1st congressional district, Peterson holds Utah House District 1.
// A seat is an office AND a state AND a district, and the whole chain that
// answers who fills one keys on all three. Section I asks every link in it.
//
// AND THE ⚖️ CHIP UNDER THE RECORD LINE PRINTED A GRADE. On a settled page it
// read "Backs it up" — a verdict word, alone, on a card in a list, standing on
// five tested statements out of fourteen with neither integer shown. The person
// file's letterhead chip had already been fixed to print the figure AND the set
// that sizes it, both halves or neither; this surface kept the loose half.
// Section J holds it to the figure owner's own two integers, and to publishing
// nothing at all until the tested set under them has stopped growing.
//
// SO THERE ARE TWO RULES, NOT ONE, AND THE SECOND IS NOT A HOLE IN THE FIRST:
//   · WHAT THIS READER VOTES ON — the seat kinds their own slate names, and
//     inside those, only their own state's people (with the seat field's answer
//     exempt so it stays authoritative about who fills a seat).
//   · WHAT GOVERNS EVERY READER — the presidency, held to its current occupant
//     and anyone on file running this cycle, and the federal executive. Never
//     state-filtered, never a race, never a pick slot on anyone's ballot.
// The split between the two is _relevantIsNationalOfficer, and it fails CLOSED
// to "state": a misfiled record vanishes from one page rather than appearing on
// every page in the country.
//
// This file holds that to eleven properties:
//
//   A. THE FEDERAL LAYER IS THERE, AND ONLY THE FEDERAL PART OF IT. A Layton
//      ballot renders a presidency group and a federal-cabinet group, and no
//      group for a seat Utah's slate cannot name.
//   B. NOBODY FROM ANOTHER STATE, in any group that is about this state. The
//      exemptions are the three groups where that is meaningless: U.S. Senate,
//      the presidency, and the federal cabinet.
//   C. NO RACE THAT IS NOT A RACE. "N in this race" appears only over groups
//      that are seats on this ballot — and never anywhere inside the presidency
//      or federal-cabinet accordions.
//   D. THE SCOPE IS THE SLATE, NOT A HARDCODED LIST. A state whose slate names
//      a Secretary of State keeps that group — filtered to that state — and the
//      federal cabinet beside it stays federal.
//   E. THE BALLOT DID NOT MOVE. The expanded local seats stay expanded, the
//      count is still 0 of 11, and adding a federal officer fills no slot.
//   F. THE RECORDS WERE SCOPED, NOT DELETED, and they have a home in the
//      archive under a kicker that makes no seat claim.
//   G. THE JUDICIAL WALL is out of the pick flow.
//   H. THE CARD MATCHES THE PERSON FILE. Office and status, then the same
//      formal-record one-liner /p/<pid> prints, then Word vs Action as a small
//      secondary chip. No kept/broken strip. No in-office voting pattern claimed
//      for someone with no record. The lost-primary banner survives. AND THAT
//      ONE-LINER IS PROSE: nothing on it is a tag, no statewide or national
//      office wears the 📍 Local pin, and "still loading" is a wait that ends.
//   I. THE SEAT IS AN OFFICE PLUS A DISTRICT, AND A DISTRICT NUMBER ALONE IS NOT
//      A SEAT. "Currently holds this seat" for the U.S. House is Blake Moore and
//      other U.S. House UT-01 records — never a Utah House member who happens to
//      sit in a district numbered 1. Thomas Peterson stays on State House
//      District 1, and nobody's chamber is decided by an office STRING when the
//      classifier has already named their chamber.
//   J. THE ⚖️ CHIP PRINTS A FIGURE IT OWNS, OR NO NUMBER AT ALL. Not the verdict
//      word "Backs it up" — a percentage and the set that sizes it, straight off
//      PDXWordAction.figure(), and only once that set has stopped growing.
//   K. NOTHING ON THE DO-NOT LIST WAS TOUCHED.
//   L. TWIN BOOT. Direction Match and the formal tiers are byte-identical to
//      HEAD's, because this pass changed scope and presentation, not one reading.
//   M. EVERY GUARD IS LOAD-BEARING — each bug is put back and has to be caught.
//
//   node scripts/test-relevant-is-my-ballot.mjs
//
// Real shipped modules in a node:vm sandbox against the real roster. No
// database, no network, no browser.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    // maxBuffer: the roster modules are megabytes; the default 1MB pipe fails
    // with ENOBUFS and would silently skip the twin boot.
    return execFileSync("git", ["show", `HEAD:${f}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ relevant is my ballot: STALE HARNESS — ${m}`); process.exit(2); };

// The engine returns a sentence; every surface that prints it into HTML escapes
// it first. So a card is compared against the escaped form of the same sentence.
const ESC = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const CH_SRC = R("compare-hub.js");
["compare-hub.js", "voter-hub-location.js", "seat-field.js", "archive-browse.js"]
  .forEach((f) => must(existsSync(join(ROOT, f)), `${f} is gone — this probe is stale`));

// ─────────────────────────────────────────────────────────────────────────────
// A mini-DOM just real enough that renderRelevantToMe() paints. Elements found
// in assigned innerHTML register themselves by id, because the section looks its
// own accordion containers up by id after writing them.
// ─────────────────────────────────────────────────────────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  "compare-hub.js", "seat-field.js", "ballot-breakdown.js", "race-sheet.js",
];

const DOM_IDS = [
  "relevant-browse-grid", "relevant-count-badge", "relevant-location-text",
  "relevant-grid-hint", "relevant-guided-status", "relevant-section",
  "chub-empty", "chub-count", "chub-launch-bar", "chub-sel-pills",
  "chub-launch-btn", "chub-launch-hint",
];

function miniDom(win, ids) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", textContent: "", style: {}, dataset: {},
      children: [], _scrolled: 0, _html: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this["attr_" + k] = v; },
      getAttribute(k) { const v = this["attr_" + k]; return v === undefined ? null : v; },
      removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() { this._scrolled++; },
      querySelector() { return null; }, querySelectorAll() { return []; },
    };
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html; },
      set(v) {
        node._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(node._html)) !== null) { if (!byId[m[1]]) byId[m[1]] = el(m[1]); }
      },
    });
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

// THE OFFLINE ROLL-CALL RECORD, BUILT ONCE. The roster's member records arrive
// over the network in the browser, so a bare sandbox boot leaves almost every
// member's Word vs Action coverage empty and still warming — which is a real
// state of the page, but it is the state in which the ⚖️ chip is SUPPOSED to
// publish nothing. Section J needs the other state too: a settled ledger, which
// is what a reader meets seconds later. noteMember() is the same door
// voting-record.js uses when the fetch lands.
let _corpus = null;
const corpus = () => {
  if (!_corpus) _corpus = buildCorpus(ROOT);
  return _corpus;
};

function boot(loc, opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (k in sess ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = new Set();
  const byId = miniDom(win, DOM_IDS);
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win._pdxDisplayScore = () => null;
  // compare-table.js owns this lookup and cannot boot headless. Without it the
  // U.S. House redistricting path cannot confirm that the incumbent it resolved
  // is a real record, so it hands back a blank pid and the seat field answers
  // "district 1, holder unknown" — which is not the state a browser is ever in.
  win._pdxPersonById = (pid) => (pid && win.CMP_DATA[pid]) || null;
  const loadErrors = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  if (opts.warm) {
    for (const [pid, recs] of corpus().byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
  }
  win._hasUserLocation = !!(loc && loc.state);
  win._currentVoterLocation = loc || null;
  // The per-state ballot slate, exactly as the page sets it before the section
  // renders. This is the definition the scope gate reads, so a probe that skips
  // it would be testing a default rather than the reader's own ballot.
  if (loc && loc.state && typeof win._updateTeamPositionsForLocation === "function") {
    try { win._updateTeamPositionsForLocation(); } catch (e) { /* DOM-light */ }
  }
  return { win, byId, loadErrors };
}

function render(loc, opts) {
  const r = boot(loc, opts);
  must(!r.loadErrors.length, `modules failed to load: ${r.loadErrors.join(" | ")}`);
  let threw = null;
  try { r.win.renderRelevantToMe(); } catch (e) { threw = e; }
  return {
    ...r, threw,
    groups: r.win._relevantLastOfficeGroups || {},
    html: r.byId["relevant-browse-grid"].innerHTML || "",
    distOf: (pid) => r.win._pdxRelevantDistNum(pid),
    slate: (r.win.TEAM_POSITIONS || []).map((p) => p.key),
    stateOf: (pid) => String(r.win._pdxBrowseStateOf(pid) || ""),
    typeOf: (pid) => String(r.win._pdxBrowseType(pid) || ""),
  };
}

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County", district: "1" };

console.log("\n═══ RELEVANT TO ME IS THE READER'S BALLOT ═══");

// ═════════════════════════════════════════════════════════════════════════════
section("A · the federal layer is there, and only the federal part of it");
// ═════════════════════════════════════════════════════════════════════════════
const layton = render(LAYTON);
ok(!layton.threw, `renderRelevantToMe threw for a Layton reader — ${layton.threw && layton.threw.message}`);

const filled = Object.keys(layton.groups).filter((g) => (layton.groups[g] || []).length);
must(filled.length > 0, "the Layton ballot rendered no groups at all — this probe is stale");

// Utah's slate is six seats. Neither the presidency nor the federal cabinet is
// one of them — they are on this page for the other reason.
eq(JSON.stringify(layton.slate),
   JSON.stringify(["senate", "house", "governor", "statesenate", "statehouse", "local"]),
   "Utah's ballot slate is not the six seats this probe was written against — re-derive the scope below");

// ── The two federal groups, present ──
ok((layton.groups.president || []).length > 0,
   "a Layton ballot renders no presidency group. A Layton reader IS governed by the President; scoping\n" +
   "    this section to TEAM_POSITIONS seats was too tight");
ok((layton.groups.fed_cabinet || []).length > 0,
   "a Layton ballot renders no federal-cabinet group. The federal executive serves every American and\n" +
   "    belongs on every located reader's page");
has(layton.html, "relevant-browse-group-president",
    "the presidency accordion is not painted on a located reader's page");
has(layton.html, "relevant-browse-group-fed_cabinet",
    "the federal-cabinet accordion is not painted on a located reader's page");
has(layton.html, "Federal executive · serves every American",
    "the federal-cabinet group lost the subtitle that says what it is");

// ── The presidency is the seat's current occupant, not the archive of it ──
{
  const pres = layton.groups.president || [];
  ["biden", "obama", "gwbush"].forEach((pid) => {
    if (!layton.win.CMP_DATA[pid]) return;
    ok(pres.indexOf(pid) === -1,
       `the presidency group carries ${pid}. Former presidents are the archive's; this group is the seat\n` +
       "    and who holds it now, plus anyone on file running this cycle");
  });
  ok(pres.length <= 4,
     `the presidency group holds ${pres.length} people, which is the reported five-way "race" between\n` +
     "    Trump, Vance, Biden, Obama and G.W. Bush coming back");
  pres.forEach((pid) => {
    const d = layton.win.CMP_DATA[pid];
    must(d, `the presidency group carries ${pid}, who is not in the roster — this probe is stale`);
    const st = String(layton.win._pdxOfficeStatus(d) || "");
    ok(st !== "former", `the presidency group carries ${pid}, whose office status reads "former"`);
  });
}

// ── The state remainder of Door 1's cabinet bucket did NOT come with it ──
eq((layton.groups.cabinet || []).length, 0,
   "a Layton ballot still renders a state-scoped appointed-office group. Utah's slate names no Secretary\n" +
   "    of State, so there is no such seat on this ballot");
lacks(layton.html, "relevant-browse-group-cabinet\"",
      "the state-scoped appointed-office accordion is still painted on a Utah ballot page");

// The named people from the report, by name, in the painted markup. These are
// the ones the federal/state split has to keep out — every one of them holds a
// STATE office, and no reader outside their state votes on it.
[["shirley_weber", "California"], ["jena_griswold", "Colorado"],
 ["steve_hobbs", "Washington"], ["jane_nelson_tx", "Texas"]].forEach(([pid, st]) => {
  must(layton.win.CMP_DATA[pid], `${pid} is gone from the roster — this probe is stale`);
  lacks(layton.html, layton.win.CMP_DATA[pid].name,
        `the ${st} Secretary of State is still on a Layton reader's ballot`);
  ok((layton.groups.fed_cabinet || []).indexOf(pid) === -1,
     `${pid} is a STATE officer and was filed into the federal cabinet group — the split is the whole fix`);
});

// ── And the reader's own seats are untouched by any of it ──
{
  const house = layton.groups.representative || [];
  ok(house.indexOf("bmoore") !== -1,
     "the U.S. House group no longer names Blake Moore for a Layton reader in District 1");
  const sf = layton.win.pdxSeatField("house");
  must(sf && sf.answerable, "the seat field cannot answer the U.S. House for a Layton reader — this probe is stale");
  eq(String(sf.district || ""), "1",
     "the seat field no longer resolves District 1 for Layton — this pass must not touch district math");
}
console.log(`      president ${(layton.groups.president || []).length}, federal cabinet ${(layton.groups.fed_cabinet || []).length}, state appointed ${(layton.groups.cabinet || []).length}`);

// ═════════════════════════════════════════════════════════════════════════════
section("B · nobody from another state, in any group that is about this state");
// ═════════════════════════════════════════════════════════════════════════════
// The exemptions are the three groups where an out-of-state record is
// meaningless, not tolerated: a U.S. Senator's record may carry no state or an
// odd normalization, and the presidency and the federal executive serve every
// state by definition — that is the whole reason they are on this page.
// Everything else in this section is a claim about Utah.
const STATE_EXEMPT = { senator: 1, president: 1, fed_cabinet: 1 };
let swept = 0;
filled.forEach((g) => {
  if (STATE_EXEMPT[g]) return;
  (layton.groups[g] || []).forEach((pid) => {
    swept++;
    eq(layton.stateOf(pid).toLowerCase(), "utah",
       `the Layton reader's ${g} group carries ${pid} (${layton.stateOf(pid)}) — Relevant to Me is the\n` +
       "    reader's ballot, not the national directory");
  });
});
ok(swept > 10, `only ${swept} pids were state-checked; the groups look empty and this section may be vacuous`);

// And the U.S. Senate exemption is not a loophole in practice: the two names in
// it are the reader's own senators, as the one seat resolver answers them.
{
  const sf = layton.win.pdxSeatField("senate");
  must(sf && sf.answerable && sf.pids && sf.pids.length,
       "the seat field cannot answer the U.S. Senate for a Layton reader — this probe is stale");
  (layton.groups.senator || []).forEach((pid) => {
    ok(sf.pids.indexOf(pid) !== -1 || layton.stateOf(pid).toLowerCase() === "utah",
       `the U.S. Senate group carries ${pid}, who is neither a Utah record nor a pid the seat field named`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("C · every 'in this race' is over a seat that is on this ballot");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Each compare-field button is emitted inside its group's accordion, so the
  // group key that precedes a race claim in the markup is the group it claims for.
  const races = [];
  const re = /in this race/g;
  let m;
  while ((m = re.exec(layton.html)) !== null) {
    const before = layton.html.slice(0, m.index);
    const gm = /relevant-browse-group-([a-z_]+)/g;
    let last = null, g;
    while ((g = gm.exec(before)) !== null) last = g[1];
    races.push(last);
  }
  ok(races.length > 0,
     "no compare-field button rendered at all, so this section is guarding nothing — re-derive it");
  const BALLOT_GROUPS = { senator: 1, representative: 1, governor: 1, state_senator: 1, state_rep: 1, local: 1, candidate: 1 };
  races.forEach((g) => {
    ok(g !== null && !!BALLOT_GROUPS[g],
       `"N in this race" was printed over the ${JSON.stringify(g)} group, which is not a seat on this\n` +
       "    ballot. That is the reported \"Compare the field · 38 in this race\" over the Cabinet bucket");
  });
  console.log(`      ${races.length} race claim(s), all over ballot seats`);
}

// AND NOT ONE OF THEM IS INSIDE THE FEDERAL LAYER, asked the other way round:
// slice each federal accordion out of the painted page and read what is in it.
// This is stricter than the sweep above, and it caught what the sweep did not —
// the per-card team tooltip said "Compare them against the others in this race"
// on every card on every surface, so twenty-two race claims were sitting inside
// the cabinet accordion with no compare-field button anywhere near them.
{
  const slice = (gk) => {
    const i = layton.html.indexOf('id="relevant-browse-group-' + gk + '"');
    if (i === -1) return "";
    const j = layton.html.indexOf('id="relevant-browse-group-', i + 10);
    return layton.html.slice(i, j === -1 ? layton.html.length : j);
  };
  ["president", "fed_cabinet"].forEach((gk) => {
    const body = slice(gk);
    must(body.length > 400, `the ${gk} accordion did not slice out of the page — this probe is stale`);
    lacks(body, "in this race",
          `"in this race" prints inside the ${gk} accordion. Nobody runs against the Secretary of\n` +
          "    Defense, and the presidency group is the seat, not a field");
    lacks(body, "Rank these",
          `the ${gk} accordion offers to rank its members. These are separate offices, not a field to\n` +
          "    put in order");
  });
  // What the federal groups offer INSTEAD of a race: a roster to read.
  has(slice("fed_cabinet"), "Browse these officers",
      "the federal-cabinet group's compare control is not the brief's \"Browse these officers\"");
}

// ═════════════════════════════════════════════════════════════════════════════
section("D · the scope is the reader's slate, not a list hardcoded here");
// ═════════════════════════════════════════════════════════════════════════════
// Colorado's slate names a Secretary of State, so a Colorado reader KEEPS that
// group. This is the property that makes the fix scope rather than suppression:
// the same code that drops Jena Griswold from a Utah ballot keeps her on a
// Colorado one, and drops Shirley Weber from both — while the federal cabinet
// sits beside her, federal, on both pages.
{
  const co = render({ state: "Colorado", city: "Denver", county: "Denver County", district: "" });
  ok(!co.threw, `renderRelevantToMe threw for a Colorado reader — ${co.threw && co.threw.message}`);
  ok(co.slate.indexOf("secstate") !== -1,
     "Colorado's ballot slate no longer names a Secretary of State — re-derive this section");
  const cab = co.groups.cabinet || [];
  ok(cab.length > 0,
     "Colorado's slate names a Secretary of State but the ballot renders no group for it — the scope gate\n" +
     "    is suppressing a seat the reader actually votes on");
  cab.forEach((pid) => {
    eq(co.stateOf(pid).toLowerCase(), "colorado",
       `the Colorado reader's appointed-office group carries ${pid} (${co.stateOf(pid)})`);
  });
  ok(cab.indexOf("jena_griswold") !== -1,
     "Colorado's own Secretary of State is missing from a Colorado ballot");
  ok(cab.indexOf("shirley_weber") === -1,
     "California's Secretary of State is on a Colorado ballot");

  // THE TWO GROUPS ARE TWO GROUPS. This is the state that proves it: Colorado
  // renders both, and if they were ever re-merged one of them would be empty and
  // the other would be the old thirty-eight-strong pile.
  const fed = co.groups.fed_cabinet || [];
  ok(fed.length > 0, "the Colorado reader lost the federal cabinet when their own Secretary of State kept a group");
  ok(fed.indexOf("jena_griswold") === -1,
     "a state Secretary of State is inside the FEDERAL cabinet group on a Colorado ballot — the two\n" +
     "    groups have been re-merged");
  ok(fed.indexOf("shirley_weber") === -1, "California's Secretary of State is in the federal cabinet group");
  // Every federal-cabinet member, on every page, is a national officer by the
  // one predicate that decides it.
  fed.forEach((pid) => {
    ok(co.win._relevantIsNationalOfficer(pid) === true,
       `${pid} is in the federal cabinet group but _relevantIsNationalOfficer says otherwise`);
  });

  // The gate reads TEAM_POSITIONS by name, so nobody can "fix" it by adding a
  // second list of allowed offices next to the slate.
  has(CH_SRC, "TEAM_POSITIONS", "the scope gate no longer reads the per-state ballot slate");
  const gate = CH_SRC.slice(CH_SRC.indexOf("function _relevantBallotGroupKeys"),
                            CH_SRC.indexOf("function _relevantEnforceBallotScope"));
  must(gate.length > 100, "_relevantBallotGroupKeys is gone — this probe is stale");
  has(gate, "window.TEAM_POSITIONS",
      "the allowed-group list is computed without reading the reader's own slate");
}

// An Ohio reader — no district geometry, no curated locals, and a slate with no
// appointed seat on it — gets Ohio, plus the federal layer, and nothing else.
{
  const oh = render({ state: "Ohio", city: "Columbus", county: "Franklin County", district: "" });
  ok(!oh.threw, `renderRelevantToMe threw for an Ohio reader — ${oh.threw && oh.threw.message}`);
  eq((oh.groups.cabinet || []).length, 0, "an Ohio reader is shown a state appointed-office group Ohio's slate does not name");
  ok((oh.groups.fed_cabinet || []).length > 0, "an Ohio reader lost the federal cabinet");
  ok((oh.groups.president || []).length > 0, "an Ohio reader lost the presidency");
  ok((oh.groups.cabinet || []).indexOf("frank_larose") === -1 &&
     (oh.groups.fed_cabinet || []).indexOf("frank_larose") === -1,
     "Ohio's own Secretary of State is on an Ohio ballot, but Ohio's slate does not name that seat");
  Object.keys(oh.groups).forEach((g) => {
    if (STATE_EXEMPT[g]) return;
    (oh.groups[g] || []).forEach((pid) => {
      eq(oh.stateOf(pid).toLowerCase(), "ohio",
         `the Ohio reader's ${g} group carries ${pid} (${oh.stateOf(pid)})`);
    });
  });
  // And the federal layer is the SAME federal layer on both pages — it is not
  // recomputed per state, because it does not depend on the state.
  eq(JSON.stringify((oh.groups.fed_cabinet || []).slice().sort()),
     JSON.stringify((layton.groups.fed_cabinet || []).slice().sort()),
     "the federal cabinet differs between an Ohio reader and a Utah reader. It serves every American;\n" +
     "    a state filter has been applied to it somewhere");
}

// ═════════════════════════════════════════════════════════════════════════════
section("E · the ballot did not move: 11 seats, 0 filled, no new slots");
// ═════════════════════════════════════════════════════════════════════════════
// The scope gate runs over the same officeGroups the local seats live in, so the
// thing to prove is that it took nothing local with it: the coverage answer, the
// rendered group and the workspace's own seat expansion still agree.
{
  const cov = layton.win.pdxLocalSeatsForMe();
  eq(cov.ok, true, "a Layton reader lost local coverage");
  const local = layton.groups.local || [];
  eq(local.length, cov.pids.length,
     "the rendered local group and the one coverage answer disagree about how many local seats there are");
  cov.pids.forEach((pid) => {
    ok(local.indexOf(pid) !== -1, `${pid} is in the coverage answer but not in the rendered local group`);
  });
  ok(local.length > 8,
     `only ${local.length} local seats rendered — the expanded local ballot has been squashed back toward one generic "Local Office"`);
  has(layton.html, "relevant-browse-group-local",
      "the local accordion is gone from the reader's ballot");

  // ── THE COUNT IS THE BALLOT'S, AND THE FEDERAL LAYER IS NOT ON IT ──
  // The presidency and the federal cabinet are context, not pick slots. The one
  // count function is the arbiter, and it must not have grown an entry for
  // either — 11 seats for a Layton reader, none of them federal executive.
  const counts = layton.win._myteamBallotCounts();
  must(counts, "_myteamBallotCounts no longer answers — this probe is stale");
  eq(counts.total, 11, "the Layton ballot is no longer 11 seats — the federal layer has become pick slots");
  eq(counts.filled, 0, "a fresh Layton reader's ballot is not empty — something is pre-filling picks");
  const seatKeys = (counts.seats || []).map((x) => x.key);
  ["president", "cabinet", "fed_cabinet", "secstate"].forEach((k) => {
    ok(seatKeys.indexOf(k) === -1,
       `the ballot seat counts have grown a ${JSON.stringify(k)} slot — the civic-stack groups are context,\n` +
       "    not seats a Utah reader votes on");
  });

  // And adding a federal officer to the reader's picks fills nothing, because
  // there is no slot for them to fill.
  {
    const before = JSON.stringify(layton.win._myteamBallotCounts());
    let added = false;
    try {
      const MP = layton.win._myPoliticians;
      if (MP && typeof MP.add === "function") { MP.add("rubio"); added = true; }
      else if (Array.isArray(MP)) { MP.push("rubio"); added = true; }
    } catch { /* below */ }
    if (!added) {
      console.log("      (the picks store is not writable from this sandbox — slot check skipped)");
    } else {
      const after = layton.win._myteamBallotCounts();
      eq(after.filled, 0,
         "adding a federal cabinet officer to the reader's picks filled a ballot slot. The federal layer is\n" +
         "    Relevant-to-Me context; it is not on this reader's ballot");
      eq(JSON.stringify(after), before,
         "the ballot counts moved when a federal officer was added to the picks");
      try { layton.win._myPoliticians.delete("rubio"); } catch { /* leave it */ }
    }
  }
  console.log(`      ${local.length} local seats, coverage and render agreed; ballot ${counts.filled}/${counts.total}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("F · the records were scoped, not deleted, and they have a home");
// ═════════════════════════════════════════════════════════════════════════════
// Nothing was removed from the roster. The people who came off the ballot are
// still readable — in archive browse, under a kicker that makes no seat claim.
{
  ["shirley_weber", "jena_griswold", "steve_hobbs", "jane_nelson_tx",
   "rubio", "noem", "obama", "trump"].forEach((pid) => {
    ok(!!layton.win.CMP_DATA[pid], `${pid} was deleted from the roster instead of scoped out of the ballot`);
  });

  const AB = R("archive-browse.js");
  const chambers = AB.slice(AB.indexOf("var CHAMBERS = ["), AB.indexOf("var ALL = "));
  must(chambers.length > 100, "archive-browse's chamber list is gone — this probe is stale");
  has(chambers, "d1: 'cabinet'", "the archive has no chamber for the appointed and executive officers");
  has(chambers, "d1: 'president'", "the archive has no chamber for the presidency");
  // And the frame there is a roster slice, never a ballot.
  has(AB, "Archive · not a ballot", "the archive listing lost its not-a-ballot kicker");
  // The file's own doctrine comment quotes the phrases it bans, so the ban is
  // checked against the code with line comments stripped — otherwise the
  // warning against ballot language would itself trip the check.
  const ABCode = AB.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  must(ABCode.length > 4000, "archive-browse.js is almost all comments now — this probe is stale");
  ["your ballot", "your representative", "your seat", "in this race", "represents you"].forEach((p) => {
    lacks(ABCode, p, `archive-browse.js now makes a ballot claim (${JSON.stringify(p)})`);
  });
  // Door 1's own office filter already speaks both values, so the chips drive
  // the existing filter rather than a second one.
  const IX = R("index.html");
  has(IX, '<option value="cabinet">', "Door 1's office filter lost its cabinet value, which the archive chip drives");
  has(IX, '<option value="president">', "Door 1's office filter lost its president value");
}

// ═════════════════════════════════════════════════════════════════════════════
section("G · the judicial wall is out of the pick flow");
// ═════════════════════════════════════════════════════════════════════════════
// The full placement proof lives in test-judicial-retention.mjs. What belongs
// here is the one thing this brief was about: the courts archive is not mounted
// between Who Represents Me and the ballot workspace.
{
  const JB = R("judicial-ballot.js");
  lacks(JB, "#who-represents-me .wrm-inner",
        "judicial-ballot.js still mounts into the Who-Represents-Me host — that is the wall of judges\n" +
        "    between the reader's seat list and their picks");
  has(JB, "judicial-lane", "judicial-ballot.js no longer paints into a lane of its own");
  has(JB, "separate from this ballot builder",
      "Door 2 lost the one line that says judicial retention is separate from the builder");

  const IX = R("index.html");
  has(IX, 'id="judicial-lane"', "index.html has no judicial lane section");
  const iWs = IX.indexOf('id="ballot-workspace"');
  const iPicks = IX.indexOf('id="my-politicians"');
  const iRel = IX.indexOf('id="relevant-section"');
  const iLane = IX.indexOf('id="judicial-lane"');
  must(iWs > 0 && iPicks > 0 && iRel > 0 && iLane > 0, "a Door 2 section id moved — this probe is stale");
  ok(iLane > iWs, "the judicial lane is above the ballot workspace in the document");
  ok(iLane > iPicks, "the judicial lane is above the reader's picks in the document");
  ok(iLane > iRel, "the judicial lane is above Relevant to Me in the document");
  const iWrm = IX.indexOf('id="who-represents-me"');
  ok(iWrm < iWs, "Who Represents Me is no longer above the workspace — this probe is stale");
}

// ═════════════════════════════════════════════════════════════════════════════
section("H · the card matches the person file");
// ═════════════════════════════════════════════════════════════════════════════
// THE SECOND HALF OF THE BRIEF. A list card here used to lead with a metric: a
// headed two-cell scorecard asking "Does what they say match what they do?" with
// a ⚖️ Word vs Action figure in the left cell. Open the same person's /p/<pid>
// and the file led with their formal record instead. Two headlines about one
// person, and the list's came first.
//
// The card now prints PDXWordAction.recordLine — the brief's own finding at card
// length, off the same two lanes in the same precedence — and the two readings
// are demoted to chips below it.
{
  const wa = layton.win.PDXWordAction;
  must(wa && typeof wa.recordLine === "function",
       "PDXWordAction.recordLine is gone — the card and the person file have no shared reader");

  // ── The block is on the card, and the retired hero is not ──
  has(layton.html, 'class="rel-rec ', "no formal-record line is painted on any Relevant-to-Me card");
  has(layton.html, "The formal record", "the record line lost its heading");
  lacks(layton.html, "Does what they say match what they do?",
        "the retired two-cell scorecard headline is back at the top of the card, above the record");
  lacks(layton.html, "rel-dual-grid",
        "the two big equal-weight signal cells are back — Word vs Action is supposed to be a small\n" +
        "    secondary chip, not the card's hero");
  has(layton.html, "rel-sig-chip", "the demoted Word vs Action / on-your-issues chips are gone entirely");

  // ── The record line comes BEFORE the chips on every card ──
  {
    const cards = layton.html.split('class="chub-card pdx-card').slice(1);
    ok(cards.length > 10, `only ${cards.length} cards painted — this section may be vacuous`);
    let checked = 0, bad = [];
    cards.forEach((c) => {
      const iRec = c.indexOf('class="rel-rec ');
      const iSig = c.indexOf("rel-sig-chip");
      if (iRec === -1 || iSig === -1) return;
      checked++;
      if (iRec > iSig) bad.push(c.slice(0, 60));
    });
    ok(checked > 10, `only ${checked} cards carried both a record line and a chip row`);
    eq(bad.length, 0,
       `${bad.length} card(s) print the Word vs Action chip above the formal record. The record is the\n` +
       "    finding; the chip is a reading of it");
  }

  // ── NO KEPT/BROKEN STRIP, anywhere on this surface ──
  ["promises kept", "promises broken", "Promise Follow-Through", "pdx-stat-pill"].forEach((n) => {
    lacks(layton.html, n,
          `the pledge kept/broken strip is back on a Relevant-to-Me card (${JSON.stringify(n)}). The formal\n` +
          "    record is the card's finding; a pledge tally beside it is a second headline");
  });

  // ── THE CARD SAYS WHAT THE FILE SAYS, read by read ──
  // Not "both mention the record" — the card's exact sentence has to be the one
  // the shared reader returns for that pid, on every card painted.
  {
    let n = 0, drift = [];
    filled.forEach((g) => (layton.groups[g] || []).forEach((pid) => {
      const d = layton.win.CMP_DATA[pid];
      if (!d) return;
      let r = null;
      try { r = wa.recordLine(pid, d); } catch (e) { r = null; }
      if (!r || !r.text) { drift.push(`${pid}/no-read`); return; }
      n++;
      const i = layton.html.indexOf('data-pid="' + pid + '"');
      if (i === -1) return;                       // grouped but not painted on this path
      const card = layton.html.slice(i, i + 14000);
      if (card.indexOf(ESC(r.text)) === -1) drift.push(`${pid}/${r.kind}`);
    }));
    ok(n > 20, `only ${n} cards were read-checked — this section may be vacuous`);
    eq(drift.slice(0, 5).join(" | "), "",
       `${drift.length} card(s) print a record line that is not what PDXWordAction.recordLine returns for\n` +
       "    them. The card and /p/<pid> are supposed to be one finding at two lengths");
    console.log(`      ${n} cards checked against the shared record reader`);
  }

  // ── A NO-RECORD CANDIDATE'S CARD CLAIMS NO IN-OFFICE VOTING PATTERN ──
  // The brief's own test, and the one that decides whether this surface is
  // honest. Take everyone the reader's own ballot lists whose record reader says
  // there is nothing in office to read, and prove the card does not describe a
  // record they do not have.
  {
    const pre = [];
    filled.forEach((g) => (layton.groups[g] || []).forEach((pid) => {
      const d = layton.win.CMP_DATA[pid];
      if (!d) return;
      let r = null;
      try { r = wa.recordLine(pid, d); } catch { r = null; }
      if (r && r.kind === "preoffice") pre.push(pid);
    }));
    ok(pre.length > 0,
       "not one person on this ballot reads as pre-office, so the claim below is untested — the Layton\n" +
       "    slate normally carries first-time candidates. Re-derive this check");
    pre.forEach((pid) => {
      const i = layton.html.indexOf('data-pid="' + pid + '"');
      if (i === -1) return;
      const card = layton.html.slice(i, i + 14000);
      const line = card.slice(card.indexOf('class="rel-rec '), card.indexOf('class="rel-rec ') + 700);
      has(line, "rel-rec-preoffice", `${pid} has no in-office record but their card's record line is not marked as such`);
      has(line, "Record begins in office", `${pid}'s card does not say their record begins in office`);
      // The pattern vocabulary, which only a read record may use.
      ["formal record:", "Strongly supports", "Strongly opposes", "Mostly supports",
       "Mostly opposes", "Ran both ways", "Every vote one way", "votes back words"].forEach((n) => {
        lacks(line, n,
              `${pid} has no record in office and their card's record line uses pattern language\n` +
              `    (${JSON.stringify(n)}) — that is a voting pattern claimed for someone who has never voted`);
      });
      // …and the ⚖️ chip does not repeat the same sentence beside it.
      const chips = card.slice(card.indexOf("rel-sig-row"), card.indexOf("rel-sig-row") + 900);
      lacks(chips, "rel-sig-wa",
            `${pid}'s card carries a ⚖️ Word vs Action chip whose only word for a pre-office candidate is\n` +
            "    the sentence the record line above it already printed");
    });
    console.log(`      ${pre.length} pre-office card(s), none claiming a voting pattern`);
  }

  // ── AND WHERE THERE IS A PATTERN, IT IS THE FILE'S PATTERN ──
  // One deep record, read both ways: the card's line and the profile brief have
  // to name the same issue. trump is the executive lane; a deep member would be
  // the roll-call lane, and in this sandbox the roll-call payload is
  // network-loaded, so the exec lane is the one that can be proved here.
  {
    const d = layton.win.CMP_DATA.trump;
    if (d) {
      const r = wa.recordLine("trump", d);
      eq(r.kind, "pattern", "the deepest formal record in the roster reads as no pattern — this probe is stale");
      eq(r.lane, "exec", "the executive record lane no longer answers for a president");
      const brief = String(wa.briefHtml("trump", d) || "");
      must(brief.length > 200, "the person file's brief did not render for trump — this probe is stale");
      ok(r.issue && brief.indexOf(ESC(r.issue)) !== -1,
         `the card names ${JSON.stringify(r.issue)} as this record's strongest pattern and the person file's\n` +
         "    brief does not mention it. The card and the file are reading two different records");
      // The one-liner is drawn from the row's own published sentence, not reworded.
      must(typeof wa.shapeRowSay === "function", "PDXWordAction.shapeRowSay is gone — the row sentence has two authors again");
      console.log(`      exec lane: ${r.text.slice(0, 74)}`);
    }
  }

  // ── THE NAME, THE PROFILE BUTTON AND THE CARD CHROME ALL OPEN /p/<pid> ──
  {
    const i = layton.html.indexOf('data-pid="bmoore"');
    must(i !== -1, "Blake Moore's card did not paint — this probe is stale");
    const card = layton.html.slice(i - 220, i + 14000);
    has(card, "openMediumModal('bmoore')",
        "the card chrome no longer opens the person door");
    const nameLine = card.slice(card.indexOf("pdx-snap-name"), card.indexOf("pdx-snap-name") + 320);
    has(nameLine, "openMediumModal", "tapping the politician's name on the card no longer opens their file");
    // And that door is the /p/<pid> door, not a second reader.
    has(CH_SRC, "window.PDXPerson.open", "openMediumModal no longer routes through the person-file door");
    has(R("profiles-full.js"), "PDXPerson.open", "showProfile no longer routes through the person-file door");
  }

  // ── THE LOST-PRIMARY BANNER SURVIVES ──
  // No roster record currently carries a concluded candidacy, so the property is
  // proved the only way it can be: give one that status and re-render the card.
  // The banner's own words come from _pdxCandidacyState, so this asserts the
  // wiring — statusEmphasis: 'high' on both card tiers — and not a copy of them.
  {
    const cardAt = CH_SRC.indexOf("function _renderRelevantPersonCard");
    must(cardAt !== -1, "_renderRelevantPersonCard is gone — this probe is stale");
    // Bounded by the next declaration rather than a byte count, so adding a line
    // to the card cannot silently truncate this slice into a passing count.
    const src = CH_SRC.slice(cardAt, CH_SRC.indexOf("function _relevantCompareCTA", cardAt));
    must(src.length > 500, "_renderRelevantPersonCard is gone — this probe is stale");
    eq((src.match(/statusEmphasis: 'high'/g) || []).length, 2,
       "one of the two Relevant-to-Me card tiers no longer asks for the high-emphasis candidacy banner —\n" +
       "    that is the lost-primary banner");

    const w = layton.win;
    const victim = (layton.groups.representative || []).concat(layton.groups.local || [])
      .filter((pid) => w.CMP_DATA[pid])[0];
    must(victim, "no card pid available to test the banner against — this probe is stale");
    const keep = w.CMP_DATA[victim].candidacyStatus;
    w.CMP_DATA[victim].candidacyStatus = "lost_primary";
    let painted = "";
    try { w.renderRelevantToMe(); painted = layton.byId["relevant-browse-grid"].innerHTML || ""; } catch (e) { painted = ""; }
    w.CMP_DATA[victim].candidacyStatus = keep;
    has(painted, "Lost the 2026 primary",
        `a card for someone who lost their primary no longer carries the banner saying so (${victim})`);
    // …and the page goes back to what it was, so the sections after this one are
    // reading the same render they were written against.
    try { w.renderRelevantToMe(); } catch { /* the twin below is independent */ }
  }

  // ── THE RECORD LINE IS PROSE, AND NOTHING IN IT IS A TAG ──
  // WHAT SHIPPED: five cards on a live Layton ballot — Lee, Curtis, Moore, Trump,
  // Rubio — printed one good sentence and then the source of an HTML tag beneath
  // it, starting `<span class="pdxst-pat w-full" style="--c:#4ade80;…"`. The two
  // record lanes publish their rows through _fpiShapeRow, and one of that row's
  // fields is `chip`: not a token, but _stPatternHtml's ALREADY-RENDERED
  // .pdxst-pat span, tone variable and aria-label included. recordLine() handed
  // it out beside the sentence; the card escaped everything it printed — which is
  // right, because "Strong Border & Enforcement" has to survive its ampersand —
  // and the escaping painted the markup as words.
  //
  // So this asserts the property in both directions: nothing the reader can see
  // is a serialized tag, AND nothing on the object the card reads is markup in the
  // first place. The second is the one that holds: a card cannot print a tag it
  // was never given, whether it escapes or not.
  {
    // 1. The painted section, whole. The escaped form is what a serialized node
    // looks like once a prose block has been through esc(); the raw form is what
    // it looks like if some future caller stops escaping. Neither is acceptable.
    ["pdxst-pat", "data-pdxst", "&lt;span", 'style="--c:'].forEach((n) => {
      lacks(layton.html, n,
            `the Relevant-to-Me grid prints ${JSON.stringify(n)} — the characterisation engine's rendered\n` +
            "    chip reached a card. If a tier bar is wanted there it mounts as a sibling node from the\n" +
            "    engine's own helper, not through the record sentence");
    });

    // 2. Every record block on every card, read on its own, so a count over the
    // whole grid cannot be diluted by the rest of the markup.
    {
      const blocks = layton.html.split('class="rel-rec ').slice(1);
      ok(blocks.length > 20, `only ${blocks.length} record blocks painted — this check may be vacuous`);
      let bad = [];
      blocks.forEach((b) => {
        const line = b.slice(0, b.indexOf("</div>", b.indexOf("rel-rec-line")) + 6);
        if (/&lt;|&gt;|pdxst/.test(line)) bad.push(line.slice(0, 90));
      });
      eq(bad.slice(0, 2).join(" | "), "",
         `${bad.length} record line(s) contain an escaped angle bracket or an engine class name. The line\n` +
         "    is a sentence; a sentence about a politician has no tags in it");
    }

    // 3. AND THE OBJECT ITSELF IS TEXT. Every string field recordLine returns, for
    // everyone on this ballot — because the doctrine the card relies on is that
    // there is nothing on this object a caller has to know the type of.
    {
      let n = 0, bad = [];
      filled.forEach((g) => (layton.groups[g] || []).forEach((pid) => {
        const d = layton.win.CMP_DATA[pid];
        if (!d) return;
        let r = null;
        try { r = wa.recordLine(pid, d); } catch { r = null; }
        if (!r) return;
        n++;
        Object.keys(r).forEach((k) => {
          if (typeof r[k] !== "string") return;
          if (/[<>]|pdxst/.test(r[k])) bad.push(`${pid}.${k}`);
        });
        if ("chip" in r) bad.push(`${pid}.chip exists`);
      }));
      ok(n > 20, `only ${n} record reads checked — this check may be vacuous`);
      eq(bad.slice(0, 4).join(" | "), "",
         `${bad.length} field(s) on the shared record object hold markup or the row's rendered chip. Every\n` +
         "    field here is documented as a plain sentence or a token, and the card prints them as such");
    }

    // 4. AND THE SENTENCE IS THE ROW'S OWN SENTENCE — shapeRowSay's, byte for
    // byte, not a paraphrase of it and not it plus something appended. This is the
    // check the brief names: the line for a pattern equals shapeRowSay(row).
    {
      const CS = layton.win.PDXConsistency;
      must(CS && CS.execRecordSummary && CS.formalPatternIndex,
           "the two record lanes are no longer both published — this probe is stale");
      let pats = 0, bad = [];
      filled.forEach((g) => (layton.groups[g] || []).forEach((pid) => {
        const d = layton.win.CMP_DATA[pid];
        if (!d) return;
        let r = null;
        try { r = wa.recordLine(pid, d); } catch { r = null; }
        if (!r || r.kind !== "pattern") return;
        pats++;
        const lane = r.lane === "exec" ? CS.execRecordSummary : CS.formalPatternIndex;
        let sh = null;
        try { sh = lane.shape(pid); } catch { sh = null; }
        const row = sh && ((sh.tops || [])[0] || (sh.splits || [])[0]);
        if (!row) { bad.push(`${pid}/no-row`); return; }
        if (r.text !== wa.shapeRowSay(row)) bad.push(`${pid}: ${JSON.stringify(r.text.slice(0, 60))}`);
        // The row DID carry a chip, and it IS markup — which is the whole reason
        // this property exists. If that stops being true the reported bug is no
        // longer reproducible and these checks are guarding a shape that changed.
        must(typeof row.chip === "string" && row.chip.indexOf("<span") === 0,
             `the shape row for ${pid} no longer carries a rendered chip, so the field this pass removed\n` +
             "    from recordLine() is not the field that painted a tag — re-derive this section");
      }));
      ok(pats > 0,
         "nobody on this ballot reads as a formal pattern, so the sentence-equality check above is\n" +
         "    untested. In this sandbox the roll-call payload is network-loaded and the executive lane is\n" +
         "    the one that answers — re-derive this check");
      eq(bad.slice(0, 3).join(" | "), "",
         `${bad.length} pattern line(s) are not shapeRowSay's sentence. The row publishes its own words so\n` +
         "    the card and the profile row have one author");
    }
  }

  // ── A STATEWIDE FEDERAL OFFICE DOES NOT WEAR THE 📍 LOCAL PIN ──
  // The badge means "one of your own local seats". _pdxIsLocalToUser already
  // refused it to the presidency and the federal executive on the ground that
  // they affect every American, so nothing about them is local to one place — but
  // a U.S. Senator was still getting it, because a senator genuinely does
  // represent the reader's state and that is the question the badge's other caller
  // asks. A statewide seat is the opposite of local: there is no district.
  {
    const fedGroups = ["senator", "president", "fed_cabinet"];
    let n = 0, pinned = [];
    fedGroups.forEach((g) => (layton.groups[g] || []).forEach((pid) => {
      const i = layton.html.indexOf('data-pid="' + pid + '"');
      if (i === -1) return;
      n++;
      const card = layton.html.slice(i, i + 14000);
      if (card.indexOf("📍 Local") !== -1) pinned.push(`${g}/${pid}`);
    }));
    ok(n > 3, `only ${n} statewide-federal cards painted — this check may be vacuous`);
    eq(pinned.slice(0, 4).join(" | "), "",
       `${pinned.length} statewide or national office(s) wear the 📍 Local pin. A U.S. Senator's seat is the\n` +
       "    whole state and the President's is the whole country");
    // POSITIVE CONTROL: the badge still exists and still reaches the reader's
    // actual local seats. Deleting it outright would pass the check above.
    {
      let local = 0;
      ["local", "state_rep", "state_senator", "representative", "governor"].forEach((g) =>
        (layton.groups[g] || []).forEach((pid) => {
          const i = layton.html.indexOf('data-pid="' + pid + '"');
          if (i !== -1 && layton.html.slice(i, i + 14000).indexOf("📍 Local") !== -1) local++;
        }));
      ok(local > 3,
         `only ${local} of the reader's own state and local cards carry the 📍 Local pin. The badge was not\n` +
         "    supposed to be removed, only refused to statewide federal offices");
      console.log(`      ${n} statewide-federal cards, none pinned local; ${local} of the reader's own, pinned`);
    }
  }

  // ── "STILL LOADING" IS A WAIT, NOT A STATE ──
  // WHAT SHIPPED: the loading sentence was gated on the brief's briefWaitOver
  // alone. That predicate ends three ways — the payload is filed, nobody ever
  // asked, or the brief's own 6s deadline fires — and the third is armed by
  // armBriefDeadline, which only the brief's paragraph calls. A list card arms
  // nothing. So for anyone whose member request was started and never filed, the
  // card read "Formal record still loading…" for the whole life of the page, about
  // a person whose formal record was simply empty. Vance was the reported one.
  //
  // The wait now ends on any of three answers, and this proves the middle one: the
  // lane's own settled answer, which consistency.js publishes with a deadline of
  // its own. The clock is the third and is not exercised here — a probe cannot
  // move this sandbox's Date — but the seam file asserts it is read.
  {
    const w = layton.win, CS = w.PDXConsistency;
    const stuck = (layton.groups.president || []).concat(layton.groups.fed_cabinet || [])
      .filter((pid) => w.CMP_DATA[pid] && wa.recordLine(pid, w.CMP_DATA[pid]).kind !== "pattern")[0];
    must(stuck, "no empty-record federal card to test the wait against — this probe is stale");
    const keepBox = w.__pdxVRPrefetch, keepSettled = CS.recordSettled;

    // A request is outstanding and the lane has not settled: the card waits, and
    // says so rather than claiming the file is empty.
    w.__pdxVRPrefetch = { pid: stuck };
    CS.recordSettled = () => false;
    const waiting = wa.recordLine(stuck, w.CMP_DATA[stuck]);
    eq(waiting.text, "Formal record still loading…",
       `with a member request outstanding, ${stuck}'s card does not say the record is still coming — a\n` +
       "    list card may not call a file empty while it is being fetched");

    // The lane settles — with the same request still outstanding and unfiled, and
    // the brief's own deadline still unarmed, because no card arms it. The sentence
    // has to resolve to the real reading anyway.
    CS.recordSettled = () => true;
    const settled = wa.recordLine(stuck, w.CMP_DATA[stuck]);
    lacks(settled.text, "still loading",
          `${stuck}'s card is STILL loading after the record lane published that it has settled. That is the\n` +
          "    permanent spinner: the brief's deadline is never armed from a list, so briefWaitOver alone\n" +
          "    never ends this wait");
    ok(/^(No formal pattern yet|Record begins in office)/.test(settled.text),
       `${stuck}'s settled card reads ${JSON.stringify(settled.text.slice(0, 60))} — a settled empty record\n` +
       "    reads as the pre-office or no-pattern sentence, which are the two honest ones");

    CS.recordSettled = keepSettled;
    w.__pdxVRPrefetch = keepBox;
    try { w.renderRelevantToMe(); } catch { /* the sections below re-read the groups, not this paint */ }
    console.log(`      ${stuck}: waits while outstanding, settles to ${JSON.stringify(settled.text.slice(0, 40))}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("I · a district number alone is not a seat");
// ═════════════════════════════════════════════════════════════════════════════
// THE REPORT. On a Layton ballot, "Currently holds this seat" for the U.S. House
// was said to name Thomas W. Peterson beside Blake Moore — and Peterson is a
// UTAH HOUSE member, from Box Elder / Cache County, four hours north. The two
// records have exactly one thing in common: the numeral 1. Moore holds
// Utah's 1st CONGRESSIONAL district; Peterson holds Utah House District 1.
// A seat is an office AND a state AND a district, and any surface that drops the
// office from that key will hand a reader the wrong chamber's incumbent with
// total confidence.
//
// WHAT THIS SECTION IS FOR. Every link in the chain that answers "who holds this
// seat" — pdxSeatField, the seat's holders, the browse group, the 📍 Local badge
// — is asked here whether the office is part of its key. The collision is real
// and it is live: Peterson's browse district IS 1 and the Layton reader's
// congressional district IS 1, so nothing but the office keeps them apart.
{
  const w = layton.win;
  const PET = "thomas_peterson";
  must(w.CMP_DATA[PET], `${PET} is gone from the roster — the reported collision has no subject`);
  must(typeof w.pdxSeatField === "function", "pdxSeatField is gone — the seat has no owner to ask");

  // ── The collision is genuinely there, so the rest of this section is not vacuous ──
  eq(layton.typeOf(PET), "state_rep",
     `${PET} does not classify as a state representative, so the reported chamber collision cannot be\n` +
     "    reproduced here — re-derive this section against the record that does collide");
  eq(layton.stateOf(PET), "Utah", `${PET} is no longer a Utah record`);
  eq(layton.distOf(PET), 1,
     `${PET}'s browse district is no longer 1, so the numeral this section is about is gone. The whole\n` +
     "    point is that a Utah House district and a congressional district can share a number");
  eq(String(layton.win.pdxSeatField("house").district || ""), "1",
     "the Layton reader's congressional district is no longer 1 — the collision has no other half");

  // ── THE U.S. HOUSE SEAT FIELD IS U.S. HOUSE RECORDS, FULL STOP ──
  {
    const sf = w.pdxSeatField("house");
    must(sf && sf.answerable, "the U.S. House seat field cannot answer for Layton — this probe is stale");
    eq(JSON.stringify(sf.holders || []), JSON.stringify(["bmoore"]),
       "the U.S. House seat's holder list is not exactly Blake Moore. This is the reported symptom: a\n" +
       "    state legislator standing in the congressional seat's \"currently holds this seat\" line");
    const bad = (sf.pids || []).filter((pid) => layton.typeOf(pid) !== "representative");
    eq(bad.map((p) => `${p}/${layton.typeOf(p)}`).join(" | "), "",
       `${bad.length} record(s) in the U.S. House seat field are not U.S. House records. The seat key is\n` +
       "    office + state + district; drop the office and the district number matches another chamber");
    const offState = (sf.pids || []).filter((pid) => layton.stateOf(pid) !== "Utah");
    eq(offState.join(" | "), "", "the U.S. House seat field carries a record from another state");
    const offDist = (sf.pids || []).filter((pid) => layton.distOf(pid) !== null && layton.distOf(pid) !== 1);
    eq(offDist.join(" | "), "", "the U.S. House seat field carries a record from another district");
    ok((sf.pids || []).indexOf(PET) === -1,
       `${PET} is in the U.S. House seat field for a Layton reader — he is a Utah House member and the\n` +
       "    only thing he shares with this seat is the numeral 1");
  }

  // ── AND PETERSON STAYS WHERE HE IS: STATE HOUSE, DISTRICT 1 ──
  // Not "he is filtered out of everything" — he is a real Utah legislator with a
  // real seat, and the archive still says so. He is simply not THIS reader's.
  {
    const sh = w.pdxSeatField("statehouse");
    must(sh && sh.answerable, "the state-house seat field cannot answer for Layton — this probe is stale");
    eq(String(sh.district || ""), "15",
       "the Layton reader's Utah House district is no longer 15 — re-derive this section");
    ok((sh.pids || []).indexOf(PET) === -1,
       `${PET} is in the Layton reader's state-house seat field. His district is 1 and theirs is 15 — the\n` +
       "    right answer is a different district in the SAME chamber, not the same number in another");
    eq(JSON.stringify(sh.holders || []), JSON.stringify(["defay_h15"]),
       "the Layton reader's Utah House seat is no longer held by their own district-15 member");
    // The archive still files him under the chamber he actually sits in.
    eq(layton.typeOf(PET), "state_rep",
       "the fix reclassified Peterson instead of keying the seat on the office. He holds a Utah House\n" +
       "    seat and the archive must keep saying so");
  }

  // ── MOORE'S GROUP CARRIES NO STATE LEGISLATOR, AND PETERSON IS ON NO CARD HERE ──
  {
    const house = layton.groups.representative || [];
    ok(house.indexOf("bmoore") !== -1, "the U.S. House group no longer names Blake Moore");
    const intruders = house.filter((pid) => {
      const t = layton.typeOf(pid);
      return t === "state_rep" || t === "state_senator";
    });
    eq(intruders.map((p) => `${p}/${layton.typeOf(p)}`).join(" | "), "",
       `${intruders.length} state legislator(s) are in the group headed by Blake Moore's congressional\n` +
       "    seat. A chamber is not a district number");
    house.forEach((pid) => {
      eq(layton.typeOf(pid), "representative",
         `${pid} is in the U.S. House group and classifies as ${JSON.stringify(layton.typeOf(pid))}`);
      eq(layton.stateOf(pid), "Utah", `${pid} is in the Layton U.S. House group and is not a Utah record`);
    });
    // …and nowhere else on the page either.
    Object.keys(layton.groups).forEach((g) => {
      ok((layton.groups[g] || []).indexOf(PET) === -1,
         `${PET} is on a Layton reader's Relevant-to-Me page, in the ${g} group. He represents Box Elder /\n` +
         "    Cache County; this reader is in Davis County");
    });
    lacks(layton.html, w.CMP_DATA[PET].name,
          "the Box Elder / Cache County state representative is painted on a Layton reader's ballot page");
    console.log(`      U.S. House group: ${house.join(", ")} — all representative/Utah/1`);
  }

  // ── THE 📍 LOCAL BADGE KEYS ON THE OFFICE TOO ──
  // _pdxIsLocalToUser is the exported door onto the reader's own relevance test,
  // and it is the surface where a bare district number does the most damage: the
  // badge SAYS "this person represents you".
  {
    must(typeof w._pdxIsLocalToUser === "function",
         "_pdxIsLocalToUser is gone — the 📍 Local badge has no relevance owner to test");
    eq(w._pdxIsLocalToUser(PET), false,
       `${PET} wears the 📍 Local badge for a Layton reader. That badge is a claim that this person\n` +
       "    represents them, and he does not: his district is a Utah House district that shares a number\n" +
       "    with their congressional one");
    eq(w._pdxIsLocalToUser("bmoore"), true,
       "Blake Moore does NOT read as local to a Layton reader — this pass may not narrow the real answer");
    eq(w._pdxIsLocalToUser("defay_h15"), true,
       "the reader's own Utah House member does not read as local — this pass may not narrow the real answer");

    // THE SWEEP. Nobody who reads as local to this reader carries another
    // chamber's district number. Three chambers, three numbers, no crossing.
    //
    // ONE LEGITIMATE EXEMPTION, AND IT IS NOT THIS BUG. Utah's congressional map
    // was redrawn, so the curated ballot can place a sitting member in the
    // reader's race while that member's own record still names the district they
    // were elected in — Celeste Maloy's record says District 2 and the curated
    // UT-01 field names her. That is the ballot resolver making a considered
    // claim about a RACE, by id, and this sweep defers to it. What it does not
    // defer to is a district NUMBER matching across two different chambers,
    // which no resolver ever claimed.
    const WANT = { representative: 1, state_senator: 6, state_rep: 15 };
    const vb = (typeof w._pdxVoterBallot === "function") ? (w._pdxVoterBallot() || {}) : {};
    const byOffice = vb.byOffice || {};
    must(byOffice.representative && byOffice.state_rep,
         "the curated ballot no longer answers by office key — this sweep cannot tell a considered\n" +
         "    race claim apart from a district-number collision");
    const named = (t, pid) => ((byOffice[t] || {}).pids || []).indexOf(pid) !== -1;
    const locals = Object.keys(w.CMP_DATA).filter((pid) => {
      try { return w._pdxIsLocalToUser(pid); } catch { return false; }
    });
    ok(locals.length > 5, `only ${locals.length} record(s) read as local to Layton — this sweep is vacuous`);
    const crossed = [];
    locals.forEach((pid) => {
      const t = layton.typeOf(pid);
      if (!(t in WANT)) return;
      const dn = layton.distOf(pid);
      if (dn !== null && dn !== WANT[t] && !named(t, pid)) crossed.push(`${pid}/${t}/${dn}`);
    });
    eq(crossed.slice(0, 6).join(" | "), "",
       `${crossed.length} record(s) read as this reader's own while sitting in a district their own\n` +
       "    chamber does not have, and no ballot resolver named them for this reader's race. That is a\n" +
       "    district number deciding a chamber");
    // …and the exemption is not a hole: a record the curated ballot names is
    // named for the reader's OWN chamber, never for another one.
    Object.keys(WANT).forEach((t) => {
      ((byOffice[t] || {}).pids || []).forEach((pid) => {
        const bt = layton.typeOf(pid);
        ok(bt === t || bt === "candidate" || bt === "other",
           `the curated ballot names ${pid} for the reader's ${t} race and the archive classifies them as\n` +
           `    ${JSON.stringify(bt)}. A resolver may move someone between DISTRICTS; it may not move them\n` +
           "    between chambers");
      });
    });
    console.log(`      ${locals.length} local record(s), none carrying another chamber's district number`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("J · the ⚖️ chip prints a figure it owns, or no number at all");
// ═════════════════════════════════════════════════════════════════════════════
// WHAT THE CHIP SAID. On a settled Layton page, the ⚖️ Word vs Action chip under
// the record line read, for Mike Lee and John Curtis and Blake Moore:
//
//     ⚖️ WORD VS ACTION   Backs it up
//
// A verdict word, alone, on a card in a list. Lee's read is 84% standing on five
// tested statements out of fourteen on offer; the chip published the grade and
// withheld both integers that size it. The person file solved exactly this for
// its letterhead chip a pass ago — figure AND fraction, both halves or neither —
// and this surface kept the loose half.
//
// WHAT IT SAYS NOW. PDXWordAction.figure()'s own percentage and its own
// "K of M tested", and ONLY once figure() reports the tested set has stopped
// growing (`ready`). This ledger grows through a page's life as the roll-call
// payloads land, and a list card has no set beside it for a reader to check a
// figure against, so an unsettled read publishes NO NUMBER and the section's
// warm repaint brings the figure in when it is real.
//
// This is asked on the settled page, because the defect only exists there.
const warm = render(LAYTON, { warm: true });
{
  ok(!warm.threw, `the settled Layton page threw — ${warm.threw && warm.threw.message}`);
  const w = warm.win, wa = w.PDXWordAction;
  must(wa && typeof wa.figure === "function",
       "PDXWordAction.figure() is gone — the chip and the person file have no shared figure owner");

  const cardOf = (pid) => {
    const i = warm.html.indexOf('data-pid="' + pid + '"');
    return i === -1 ? "" : warm.html.slice(i, i + 14000);
  };
  const chipOf = (pid) => {
    const m = cardOf(pid).match(/<button[^>]*rel-sig-wa[\s\S]*?<\/button>/);
    return m ? m[0] : "";
  };
  const txt = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // Everything an unsettled chip is allowed to say. The first two are this
  // pass's; the rest are _pdxLedgerSlot's own coverage sentences, which this pass
  // did not touch and which many other card surfaces print.
  const QUIET = [
    "Not tested yet", "Reading the record…",
    "Record begins in office", "Not enough record yet", "No matched votes yet",
    "Record archived", "No stated positions yet",
  ];
  QUIET.slice(2).forEach((q) => must(CH_SRC.indexOf(q) !== -1,
    `the shared ledger slot no longer publishes ${JSON.stringify(q)} — re-derive the quiet vocabulary`));

  // Everyone painted on the settled page, and where their figure stands.
  const painted = [];
  Object.keys(warm.groups).forEach((g) => (warm.groups[g] || []).forEach((pid) => {
    if (painted.indexOf(pid) === -1 && cardOf(pid)) painted.push(pid);
  }));
  ok(painted.length > 20, `only ${painted.length} cards painted on the settled page — this section is vacuous`);

  const READY = [], UNSETTLED = [];
  painted.forEach((pid) => {
    const d = w.CMP_DATA[pid];
    let f = null;
    try { f = wa.figure(pid, d); } catch { f = null; }
    const slot = w._pdxLedgerSlot(d, { pid: pid });
    if (f && f.ready) READY.push({ pid, f, slot });
    else UNSETTLED.push({ pid, f, slot });
  });
  ok(READY.length >= 4,
     `only ${READY.length} card(s) on the settled page carry a settled figure, so the assertions below are\n` +
     "    nearly vacuous — the corpus normally settles at least the delegation");

  // ── 1 · THE VERDICT WORD IS GONE FROM THIS SURFACE ──
  // Every label the verdict vocabulary can produce, checked against the chip's
  // own value span rather than the whole card, so an unrelated mention elsewhere
  // cannot mask it.
  {
    const labels = [];
    READY.forEach(({ f }) => { if (f.verdict && f.verdict.label && labels.indexOf(f.verdict.label) === -1) labels.push(f.verdict.label); });
    must(labels.length > 0, "no settled read published a verdict label — this check has no subject");
    must(labels.indexOf("Backs it up") !== -1,
         "the reported string \"Backs it up\" is no longer a verdict label, so the smoke check below is\n" +
         "    testing a string that cannot appear — re-derive it");
    READY.forEach(({ pid }) => {
      const chip = chipOf(pid);
      must(chip, `${pid} has a settled figure and no ⚖️ chip at all — the chip may not disappear here`);
      labels.forEach((lbl) => {
        lacks(chip, ">" + lbl + "<",
              `${pid}'s ⚖️ chip still prints the verdict word ${JSON.stringify(lbl)}. A grade with no set\n` +
              "    behind it is the whole defect; the chip publishes the figure and what sizes it");
      });
    });
  }

  // ── 2 · THE SMOKE CHECK, BY NAME ──
  // Lee and Curtis, the two records in the report, on the settled page.
  ["lee", "curtis"].forEach((pid) => {
    const row = READY.filter((r) => r.pid === pid)[0];
    must(row, `${pid}'s figure does not settle on the warmed page — the report's own subject is missing`);
    const t = txt(chipOf(pid));
    eq(t, `⚖️ Word vs Action ${row.f.pct}% ${row.f.fraction}`,
       `${pid}'s ⚖️ chip reads ${JSON.stringify(t)}. The brief asks for the figure and the tested set —\n` +
       "    N% · K of M tested — and not the verdict word");
    has(t, "%", `${pid}'s chip prints no percentage on a settled page`);
    has(t, "tested", `${pid}'s chip prints a percentage with nothing sizing it`);
    lacks(t, "Backs it up", `${pid}'s ⚖️ chip still reads "Backs it up" — this is the reported symptom`);
    console.log(`      ${pid}: ${JSON.stringify(t)}`);
  });

  // ── 3 · IT IS THE FIGURE OWNER'S OBJECT, NOT A SECOND COUNT ──
  // The chip carries figure()'s stamp, so this asserts the surface printed the
  // owner's read rather than an arithmetic of its own that happens to agree.
  READY.forEach(({ pid, f }) => {
    const chip = chipOf(pid);
    has(chip, 'data-rel-wva-fig="' + f.stamp + '"',
        `${pid}'s ⚖️ chip does not carry PDXWordAction.figure()'s stamp, so nothing proves the two\n` +
        "    integers on it came from the shared figure rather than a count taken here");
    has(chip, ">" + f.pct + "%<", `${pid}'s chip does not print figure()'s own percentage`);
    has(chip, ">" + f.fraction + "<",
        `${pid}'s chip does not print figure()'s own fraction ${JSON.stringify(f.fraction)} — a paraphrase\n` +
        "    of two integers is a second arithmetic");
    has(chip, "rel-sig-den", `${pid}'s chip prints a percentage with no denominator span beside it`);
  });

  // ── 4 · SAME OWNER AS THE PERSON FILE'S CHIP ──
  // Open /p/<pid> and the letterhead chip prints the same figure and the same
  // fraction, character for character. The card may drop the verdict word (it has
  // no section under it to explain one); it may not disagree about the number.
  {
    must(typeof wa.compactBadgeHtml === "function",
         "the person file's letterhead chip builder is gone — the two surfaces have no shared owner");
    READY.forEach(({ pid, f }) => {
      const badge = txt(wa.compactBadgeHtml(pid, w.CMP_DATA[pid]));
      has(badge, f.pct + "%", `the person file's chip for ${pid} does not print ${f.pct}%`);
      has(badge, f.fraction,
          `the person file's chip for ${pid} and their card print different fractions. One figure, one\n` +
          "    owner, two surfaces");
    });
    console.log(`      ${READY.length} settled card(s), each agreeing with /p/<pid> on figure and fraction`);
  }

  // ── 5 · UNSETTLED PRINTS NO NUMBER, ANYWHERE IN THE CHIP ──
  // Not a smaller number, not a rounded one, not one in a tooltip: none.
  {
    let checked = 0;
    const leaked = [];
    UNSETTLED.forEach(({ pid, f, slot }) => {
      const chip = chipOf(pid);
      if (!chip) return;                        // the pre-office stand-down, asserted in H
      checked++;
      if (/\d+\s*%/.test(chip)) leaked.push(`${pid}/${f && f.pct}%`);
      lacks(chip, "rel-sig-den",
            `${pid}'s figure has not settled and their chip still carries a denominator span`);
      lacks(chip, "data-rel-wva-fig",
            `${pid}'s figure has not settled and their chip is still stamped as a published figure`);
      // And what it says instead is quiet, and true: either one of the two lines
      // this pass added, or a coverage sentence the shared ledger slot already
      // owned. (The slot is recomputed here without the card's status, which is
      // what picks between "Record begins in office" and "Not enough record yet"
      // for the same person, so both are accepted.)
      const t = txt(chip).replace("⚖️ Word vs Action ", "");
      ok(QUIET.indexOf(t) !== -1 || t === slot.sub,
         `${pid}'s unsettled ⚖️ chip reads ${JSON.stringify(t)}, which is neither one of this pass's two\n` +
         "    quiet lines nor a coverage sentence the shared ledger slot owns");
    });
    ok(checked > 10, `only ${checked} unsettled chip(s) checked — this half is vacuous`);
    eq(leaked.slice(0, 5).join(" | "), "",
       `${leaked.length} chip(s) publish a percentage while the tested set under them is still growing.\n` +
       "    A card in a list has no set beside it, so a figure that will move is a figure the reader\n" +
       "    carries away wrong");
    console.log(`      ${checked} unsettled chip(s), not one percentage among them`);
  }

  // ── 6 · A CARD THAT IS MID-COUNT SAYS SO, AND THE PAINT RETURNS ──
  // The one state that is neither settled nor empty: a publishable read whose
  // ledger is still warming. It has to be visible as a wait, and the section has
  // to have a door that repaints it.
  {
    const mid = UNSETTLED.filter(({ f, slot }) => f && f.shows && slot.pct !== null);
    ok(mid.length > 0,
       "no card on the settled page is mid-count (publishable but still warming), so the quiet middle\n" +
       "    branch is untested here — re-derive this check");
    mid.forEach(({ pid }) => {
      has(chipOf(pid), "Reading the record…",
          `${pid}'s read is publishable but still warming and their chip does not say so`);
    });
    has(CH_SRC, "'pdx-consistency-warm'",
        "the Relevant-to-Me section no longer listens for the ledger warming, so a chip that withholds a\n" +
        "    figure would withhold it for the life of the page");
    must(CH_SRC.indexOf("_relevantWarmRepaint") !== -1, "the warm repaint is gone — this probe is stale");
    console.log(`      ${mid.length} mid-count card(s): ${mid.map((m) => m.pid).join(", ")}`);
  }

  // ── 7 · IT IS NOT A SECOND SCORE, AND THE RECORD LINE IS STILL THE CLAIM ──
  {
    READY.forEach(({ pid }) => {
      const card = cardOf(pid);
      const iRec = card.indexOf('class="rel-rec ');
      const iChip = card.indexOf("rel-sig-wa");
      ok(iRec !== -1 && iRec < iChip,
         `${pid}'s settled figure is printed above their formal record line. The figure is a reading of\n` +
         "    the record; the record is the finding");
      // One door, still. A percentage inside a control that is also a link, or a
      // second button nested in it, is how a chip becomes a scoreboard.
      const chip = chipOf(pid);
      eq((chip.match(/<button/g) || []).length, 1,
         `${pid}'s ⚖️ chip is no longer a single control`);
      lacks(chip, "<a ", `${pid}'s ⚖️ chip grew a second destination`);
      has(chip, "_pdxScoreCompareInfo", `${pid}'s ⚖️ chip no longer opens the explainer it is a door to`);
    });
    // And nothing reads the two integers back. The chip is the only place on this
    // surface that prints them, and no sort, filter or threshold names them.
    // Comments stripped first: the doctrine block above this builder says the
    // words "ranks" and "thresholds" in order to forbid them, and a scan that
    // cannot tell prose from code would fail on the promise itself.
    const seg = CH_SRC.slice(CH_SRC.indexOf("function _relevantDualSignal"),
                             CH_SRC.indexOf("function _renderRelevantPersonCard"))
      .split("\n").filter((ln) => !/^\s*\/\//.test(ln)).join("\n");
    must(seg.length > 800, "the dual-signal builder moved — this probe is stale");
    ["sort(", "localeCompare", "threshold", "rank", "filter("].forEach((t) => {
      lacks(seg, t, `the ⚖️ chip builder now ${JSON.stringify(t)}s on its own figure — it is a reading, not a rank`);
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("K · nothing on the Do-not list was touched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The store keeps its name; the classifier keeps its buckets; the counts and
  // the seat field keep their owners.
  has(CH_SRC, "window.TEAM_POSITIONS", "the ballot slate store was renamed");
  has(CH_SRC, "window._myteamBallotCounts", "the one ballot count function was renamed or removed");
  has(CH_SRC, "window._pdxBrowseType", "compare-hub stopped exposing its chamber classifier");
  // The classifier still files a secretary of state under cabinet — the bug was
  // never the classification, it was the ballot claim made on top of it.
  eq(layton.typeOf("shirley_weber"), "cabinet",
     "the browse classifier was changed instead of the ballot's scope; Door 1's own grouping moved with it");
  eq(layton.typeOf("jena_griswold"), "cabinet",
     "the browse classifier no longer files a state Secretary of State under cabinet");

  // No party sort and no ranking by Direction Match anywhere in the new gate.
  const gate = CH_SRC.slice(CH_SRC.indexOf("var _RELEVANT_GK_OF_SLOT"),
                            CH_SRC.indexOf("// Bare county token"));
  must(gate.length > 400, "the ballot-scope gate is gone — this probe is stale");
  ["party", "Party", "DirectionMatch", "directionMatch", "score", "Score"].forEach((t) => {
    lacks(gate, t, `the ballot-scope gate reads ${JSON.stringify(t)} — scope is a question about seats, not about ranking`);
  });

  // THE TWO GROUPS MAY NOT BE RE-MERGED, and the predicate that splits them
  // fails closed. This is the Do-not that the whole federal layer rests on: a
  // record the discriminator cannot place is a STATE record, so it disappears
  // from one page rather than appearing on every page in the country.
  {
    must(typeof layton.win._relevantIsNationalOfficer === "function",
         "the federal/state discriminator is gone — this probe is stale");
    const nat = layton.win._relevantIsNationalOfficer;
    ok(nat("shirley_weber") === false, "the discriminator calls California's Secretary of State a national officer");
    ok(nat("jena_griswold") === false, "the discriminator calls Colorado's Secretary of State a national officer");
    ok(nat("__nobody_at_all__") === false,
       "the discriminator returns true for a pid that is not in the roster — it must fail closed to \"state\"");
    // Every record Door 1 files under cabinet is placed on one side or the other,
    // and the two sides together are the whole bucket — nothing is dropped by the
    // split itself.
    const bucket = Object.keys(layton.win.CMP_DATA).filter((pid) => layton.typeOf(pid) === "cabinet");
    ok(bucket.length > 20, `only ${bucket.length} records classify as cabinet — this probe is stale`);
    const fed = bucket.filter((pid) => nat(pid));
    ok(fed.length > 10, `the discriminator finds only ${fed.length} national officers in a bucket of ${bucket.length}`);
    ok(fed.length < bucket.length,
       "every record in Door 1's cabinet bucket reads as national, so the state secretaries are back in\n" +
       "    the federal group — the split has stopped splitting");
    console.log(`      cabinet bucket ${bucket.length} → federal ${fed.length}, state ${bucket.length - fed.length}`);
  }

  // The card's record line is the shared reader's, not a fourth vocabulary, and
  // it prints no figure — a percentage in the card's lead line is the metric
  // headline this pass took out.
  {
    const card = CH_SRC.slice(CH_SRC.indexOf("function _relevantRecordLine"),
                              CH_SRC.indexOf("window._relevantRecordLine ="));
    must(card.length > 300, "_relevantRecordLine is gone — this probe is stale");
    has(card, "wa.recordLine", "the card's record line no longer reads PDXWordAction.recordLine");
    ["party", "Party", "DirectionMatch", "directionMatch", ".score", "kept", "broken"].forEach((t) => {
      lacks(card, t, `the card's record line reads ${JSON.stringify(t)} — it prints the formal record and nothing else`);
    });
  }

  // The seat field stays authoritative: the gate runs AFTER the handover and
  // exempts the pids the field named.
  const located = CH_SRC.slice(CH_SRC.indexOf("_relevantSeatFields(officeGroups);"));
  const iField = located.indexOf("_relevantSeatFields(officeGroups);");
  const iGate = located.indexOf("_relevantEnforceBallotScope(officeGroups, stateName);");
  ok(iGate > iField && iGate > 0,
     "the scope gate runs before the seat-field handover, so it can filter out a pid the one seat\n" +
     "    resolver has already put on this reader's seat");
  has(CH_SRC, "if (fromField[pid]) return true;",
      "the scope gate no longer exempts the seat field's own answer, so a record with a missing state\n" +
      "    string could drop the reader's real representative");
}

// ═════════════════════════════════════════════════════════════════════════════
section("L · twin boot — the arithmetic never saw any of this");
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = (get) => {
    const w = makeSandbox();
    const ctx = vm.createContext(w);
    for (const f of ENGINE_FILES) {
      const src = get(f);
      if (src === null) return null;
      vm.runInContext(src, ctx, { filename: f });
    }
    w.PROFILES = w.CMP_DATA;
    return w;
  };
  const B = engine(R);
  must(B && B.PDXWordAction && typeof B.PDXWordAction.read === "function",
       "the working tree's engine did not boot in the twin");
  const A = engine(HEAD);
  if (!A || !A.PDXWordAction || typeof A.PDXWordAction.read !== "function") {
    console.log("      no HEAD copy available in this checkout — twin boot skipped");
  } else {
    const drift = [];
    let n = 0;
    for (const pid of Object.keys(B.CMP_DATA)) {
      if (!A.CMP_DATA[pid]) continue;
      n++;
      if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) drift.push(`${pid}/ledger`);
      if (A.PDXConsistency && B.PDXConsistency) {
        if (JSON.stringify(A.PDXConsistency.scopedOverall(A.CMP_DATA[pid], pid)) !==
            JSON.stringify(B.PDXConsistency.scopedOverall(B.CMP_DATA[pid], pid))) drift.push(`${pid}/dm`);
        if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
            JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
      }
    }
    ok(n > 300, `the twin boot only swept ${n} people`);
    eq(drift.slice(0, 6).join(" | "), "",
       `${drift.length} read(s) moved. This pass scoped a section's group list; the Direction Match ` +
       "ledger and the formal tiers must be byte-identical to HEAD's");
    console.log(`      ${n} people swept; DM ledger and formal tiers identical to HEAD`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("M · every added guard is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// Each bug is put back as it shipped, and the property above it has to catch it.
// A guard that passes with the bug reinstated is not a guard.
//
// The two bugs are in opposite directions and they share one chokepoint:
// _relevantEnforceBallotScope calls _relevantFederalStack FIRST (splitting Door
// 1's cabinet bucket into the federal executive and the state remainder), and
// then drops every group the reader's slate cannot name. Remove the split and
// BOTH bugs come back, on different pages —
//   · on Utah, whose slate names no appointed seat, the unsplit bucket is
//     dropped whole and the reader loses the federal cabinet: TOO TIGHT.
//   · on Colorado, whose slate does name one, the unsplit bucket survives whole
//     and the reader gets sixteen other states' secretaries: TOO LOOSE.
// So one deletion is enough to prove both halves of the doctrine, and it is
// asked on both pages.
{
  // ONE BROKEN BOOT, ANY FILE. `subs` maps a shipped filename to the source that
  // replaces it, so a counterfactual can revert a guard in compare-hub.js, in
  // word-action.js, or in both at once — the last two bugs this pass fixed live in
  // word-action.js and are only visible once the section has painted.
  const bootBroken = (subs, loc, opts) => {
    opts = opts || {};
    const w = makeSandbox();
    const store = {};
    w.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    w.sessionStorage = w.localStorage;
    w.auth = { currentUser: null };
    w._cmpSelected = new Set();
    miniDom(w, DOM_IDS);
    const ctx = vm.createContext(w);
    w.PROFILES = w.CMP_DATA;
    w._pdxDisplayScore = () => null;
    w._pdxPersonById = (pid) => (pid && w.CMP_DATA[pid]) || null;
    for (const f of FILES) {
      try { vm.runInContext(Object.prototype.hasOwnProperty.call(subs, f) ? subs[f] : R(f), ctx, { filename: f }); } catch (e) { /* same guards as the real boot */ }
    }
    w.PROFILES = w.CMP_DATA;
    if (opts.warm) {
      for (const [pid, recs] of corpus().byMember) {
        try { w.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
      }
    }
    w._hasUserLocation = true;
    w._currentVoterLocation = loc;
    try { w._updateTeamPositionsForLocation(); } catch (e) {}
    try { w.renderRelevantToMe(); } catch (e) {}
    return {
      w,
      groups: w._relevantLastOfficeGroups || {},
      html: String((w.document.getElementById("relevant-browse-grid") || {}).innerHTML || ""),
    };
  };

  // ── 1. The federal split, removed ──
  // Anchored on the line that FOLLOWS it, because the same call is made from the
  // unlocated preview one screen up and an unanchored replace edits that one.
  const SPLIT_CALL = "      _relevantFederalStack(officeGroups);\n\n      var allowed = _relevantBallotGroupKeys();";
  must(CH_SRC.indexOf(SPLIT_CALL) !== -1,
       "the scope gate no longer resolves the federal layer before it drops groups — this probe is stale");
  const noSplit = CH_SRC.replace(SPLIT_CALL, "      var allowed = _relevantBallotGroupKeys();");

  {
    const b = bootBroken({ "compare-hub.js": noSplit }, LAYTON);
    must(Object.keys(b.groups).length > 0,
         "the unsplit build rendered no groups at all, so it is not reproducing anything — this probe is stale");
    ok((b.groups.fed_cabinet || []).length === 0,
       "with the federal split removed, a Layton reader STILL gets a federal cabinet group. Property A is\n" +
       "    passing for some reason other than the split, so it is not pinning the too-tight bug");
    console.log(`      no split, Utah: fed_cabinet ${(b.groups.fed_cabinet || []).length}, cabinet ${(b.groups.cabinet || []).length} — the federal layer is lost`);
  }
  // ── 1b. The out-of-state gate, removed ──
  // The split and the gate are two guards, and the reported pile needed both to
  // fail: the split is why a state secretary was ever in a federal group, the
  // gate is why she was on a Colorado page at all. Reverting the split alone
  // leaves the gate holding, so the out-of-state half is reverted on its own.
  const GATE = "        if (_RELEVANT_STATE_EXEMPT_GK[gk]) return;\n";
  must(CH_SRC.split(GATE).length === 2,
       "the out-of-state gate is not where this probe reverts it — this probe is stale");
  const noGate = CH_SRC.replace(GATE, "        return;\n");
  {
    const b = bootBroken({ "compare-hub.js": noGate }, { state: "Colorado", city: "Denver", county: "Denver County", district: "" });
    const cab = b.groups.cabinet || [];
    must(cab.length > 0, "the ungated Colorado build kept no appointed group at all — this probe is stale");
    ok(cab.some((pid) => String(b.w._pdxBrowseStateOf(pid) || "").toLowerCase() !== "colorado"),
       "with the out-of-state gate removed, a Colorado reader's appointed group STILL holds only Colorado\n" +
       "    officers. Property B/D is passing for some reason other than the gate");
    ok(cab.indexOf("shirley_weber") !== -1,
       "California's Secretary of State stays out of an ungated Colorado build too, so the property that\n" +
       "    keeps her out is not the one this reverts — re-derive it");
    console.log(`      no state gate, Colorado: cabinet ${cab.length} — ${cab.slice(0, 4).join(", ")}`);
  }

  // ── 2. The presidency's present-tense filter, removed ──
  const noPres = CH_SRC.replace(
    "        officeGroups.president = officeGroups.president.filter(_relevantPresidencyNow);",
    "        officeGroups.president = officeGroups.president.filter(function(p) { return !!p; });");
  must(noPres !== CH_SRC, "the presidency filter could not be reverted — this probe is stale");
  {
    const b = bootBroken({ "compare-hub.js": noPres }, LAYTON);
    const pres = b.groups.president || [];
    ok(pres.length > (layton.groups.president || []).length,
       "removing the presidency's present-tense filter changed nothing, so property A's occupant check is\n" +
       "    not pinning the reported five-way race between Trump, Vance, Biden, Obama and G.W. Bush");
    ok(["biden", "obama", "gwbush"].some((pid) => pres.indexOf(pid) !== -1),
       "the unfiltered presidency group holds no former president, so the check above proves nothing");
    console.log(`      no occupant filter: president ${pres.length} — ${pres.slice(0, 6).join(", ")}`);
  }

  // ── 3. The de-raced card tooltip, put back ──
  // Twenty-two "in this race" strings were inside the cabinet accordion with no
  // compare-field button near them: the per-card team tooltip said it, on every
  // card on every surface. Property C's accordion slice is what caught it.
  const raced = CH_SRC.replace(
    "var cmpTitle = isMy ? 'Compare them side by side with others' : 'Not sure yet? Compare them with others first';",
    "var cmpTitle = isMy ? 'Compare them against the others in this race' : 'Not sure yet? Compare with others in this race first';");
  must(raced !== CH_SRC, "the card tooltip could not be re-raced — this probe is stale");
  {
    const b = bootBroken({ "compare-hub.js": raced }, LAYTON);
    const html = String(b.w.document.getElementById("relevant-browse-grid").innerHTML || "");
    const i = html.indexOf('id="relevant-browse-group-fed_cabinet"');
    must(i !== -1, "the re-raced build painted no federal-cabinet accordion — this probe is stale");
    const j = html.indexOf('id="relevant-browse-group-', i + 10);
    const body = html.slice(i, j === -1 ? html.length : j);
    ok(body.indexOf("in this race") !== -1,
       "re-racing the per-card tooltip puts no race claim inside the federal-cabinet accordion, so\n" +
       "    property C's slice is guarding nothing — re-derive it");
    console.log(`      re-raced tooltip: ${(body.match(/in this race/g) || []).length} race claim(s) back inside the cabinet accordion`);
  }

  // ── 4. The rendered chip, put back into the sentence ──
  // The reported bug, exactly as it shipped: the shape row's `chip` concatenated
  // onto the row's sentence and handed out of recordLine() as text. Nothing else
  // changes — the card still escapes what it prints, which is correct — and that
  // is the point: the tag paints as words because a prose block was given a node.
  const WA_SRC = R("word-action.js");
  const SAY = "      out.text = shapeRowSay(row);\n";
  must(WA_SRC.split(SAY).length === 2,
       "the one-line finding no longer prints the row's sentence at a single site — this probe is stale");
  const chipped = WA_SRC.replace(SAY, "      out.text = shapeRowSay(row) + (row.chip || '');\n");
  {
    const b = bootBroken({ "word-action.js": chipped }, LAYTON);
    must(b.html.indexOf('class="rel-rec ') !== -1,
         "the chipped build painted no record line at all, so it is not reproducing anything — this probe is stale");
    ok(b.html.indexOf("pdxst-pat") !== -1 || b.html.indexOf("&lt;span") !== -1,
       "putting the engine's rendered chip back into the record sentence puts no tag on any card, so the\n" +
       "    prose property in section H is guarding nothing — re-derive it");
    const raw = (b.html.match(/&lt;span/g) || []).length;
    console.log(`      chip back in the sentence: ${raw} serialized <span> painted as text on the cards`);
  }

  // ── 5. The unbounded wait, put back ──
  // `!briefWaitOver(pid)` on its own, which is how it shipped. The lane is asked
  // to publish that it has settled and the sentence has to be shown ignoring it —
  // because briefWaitOver waits for a filed payload or for a deadline no list card
  // arms, and neither is ever going to arrive for this person on this page.
  const WAIT = "    if (recordLineWaiting(pid)) {\n";
  must(WA_SRC.split(WAIT).length === 2,
       "the loading sentence is no longer gated by the bounded wait — this probe is stale");
  const unbounded = WA_SRC.replace(WAIT, "    if (!briefWaitOver(pid)) {\n");
  {
    const b = bootBroken({ "word-action.js": unbounded }, LAYTON);
    const w = b.w, CS = w.PDXConsistency, wa = w.PDXWordAction;
    must(wa && typeof wa.recordLine === "function" && CS,
         "the unbounded build published no record reader — this probe is stale");
    const stuck = (b.groups.president || []).concat(b.groups.fed_cabinet || [])
      .filter((pid) => w.CMP_DATA[pid] && wa.recordLine(pid, w.CMP_DATA[pid]).kind !== "pattern")[0];
    must(stuck, "no empty-record federal card in the unbounded build — this probe is stale");
    w.__pdxVRPrefetch = { pid: stuck };
    CS.recordSettled = () => true;
    const r = wa.recordLine(stuck, w.CMP_DATA[stuck]);
    ok(r.text.indexOf("still loading") !== -1,
       "gating the loading sentence on briefWaitOver alone resolves anyway once the lane settles, so the\n" +
       "    bounded wait in section H is guarding nothing. The reported symptom was a card that read\n" +
       "    \"Formal record still loading…\" for the life of the page — re-derive this check");
    console.log(`      unbounded wait, lane settled: ${stuck} still reads ${JSON.stringify(r.text)}`);
  }

  // ── 6. The office STRING back in front of the chamber classifier ──
  // The Part A fix, reverted. _isRelevantToUser used to read
  //
  //     (_btype === 'representative' || _isUSHouse) ? 'representative'
  //
  // where _isUSHouse is a guess taken off the office string, and _officeKey is
  // what decides WHICH district number the record is tested against. So a record
  // the classifier had already filed as a state legislator, whose office string
  // happened to trip that guess, was tested against the reader's CONGRESSIONAL
  // district — a district number alone deciding a chamber.
  //
  // NO SHIPPED RECORD TRIPS IT TODAY, and that is said plainly here rather than
  // papered over: all 393 records the office-string test fires on are genuine
  // U.S. House records, because Thomas Peterson's office reads "Utah State
  // Representative" and the guess excludes anything containing "state". The trap
  // is one office string away, though — "Utah State House Candidate" contains
  // both "state house" (so the classifier correctly says state_rep) and "house
  // candidate" (so the guess says U.S. House) — so the subject is added here as
  // a record rather than waiting for the archive to grow one.
  {
    const SYN = "probe_state_house_d1";
    const synth = `\n;CMP_DATA[${JSON.stringify(SYN)}] = { name: "Probe State-House Member", ` +
      `office: "Utah State House Candidate", state: "UT District 1 (Box Elder / Cache County)", ` +
      `party: "R", termStart: "2022-09", bio: "Synthetic record: a Utah House seat in a district ` +
      `numbered 1, whose office string trips the congressional guess." };\n`;
    const CD = R("cmp-data.js") + synth;

    const FIXED_KEY =
      "      var _officeKey = (_btype === 'representative') ? 'representative'\n" +
      "                     : (_btype === 'state_senator') ? 'state_senator'\n" +
      "                     : (_btype === 'state_rep') ? 'state_rep'\n" +
      "                     : (!_btype && _isUSHouse) ? 'representative' : null;";
    const OVERRIDE_KEY =
      "      var _officeKey = (_btype === 'representative' || _isUSHouse) ? 'representative'\n" +
      "                     : (_btype === 'state_senator') ? 'state_senator'\n" +
      "                     : (_btype === 'state_rep') ? 'state_rep' : null;";
    must(CH_SRC.split(FIXED_KEY).length === 2,
         "the relevance test no longer chooses its office key at a single site — this probe is stale");
    const overridden = CH_SRC.replace(FIXED_KEY, OVERRIDE_KEY);

    // First: the synthetic record is the shape this is about, under the real build.
    const good = bootBroken({ "cmp-data.js": CD }, LAYTON);
    eq(String(good.w._pdxBrowseType(SYN) || ""), "state_rep",
       "the synthetic Utah House record does not classify as a state representative, so reverting the\n" +
       "    office-string override would prove nothing — re-derive this counterfactual");
    eq(good.w._pdxRelevantDistNum(SYN), 1,
       "the synthetic record's district is not 1, so it does not collide with the reader's congressional\n" +
       "    district — re-derive this counterfactual");
    eq(good.w._pdxIsLocalToUser(SYN), false,
       "a Box Elder / Cache County Utah House record reads as local to a Layton reader under the SHIPPED\n" +
       "    build. Section I is not describing this tree");

    // Then: the override put back, and the same record walks in.
    const bad = bootBroken({ "cmp-data.js": CD, "compare-hub.js": overridden }, LAYTON);
    must(String(bad.w._pdxBrowseType(SYN) || "") === "state_rep",
         "the overridden build classifies the synthetic record differently — this probe is stale");
    ok(bad.w._pdxIsLocalToUser(SYN) === true,
       "putting the office-string override back in front of the chamber classifier does NOT make a Utah\n" +
       "    House member from the other end of the state read as a Layton reader's own representative, so\n" +
       "    section I's office-key guard is pinning nothing — re-derive it");
    // And the reader's real people are unaffected either way, so this is the
    // office key changing hands and not the whole matcher going loose.
    ["bmoore", "defay_h15"].forEach((pid) => {
      eq(bad.w._pdxIsLocalToUser(pid), true,
         `the overridden build also drops ${pid}, so the difference above is not specifically the chamber`);
    });
    console.log(`      office string in front of the classifier: ${SYN} local = ` +
      `${bad.w._pdxIsLocalToUser(SYN)} (shipped: ${good.w._pdxIsLocalToUser(SYN)})`);
  }

  // ── 7. The settled gate loosened to the publish gate ──
  // `f.shows` is "there is a percentage and a fraction"; `f.ready` is that AND
  // the coverage read has stopped warming. On a list card the difference is the
  // whole point: shows publishes a number that is still moving.
  {
    const READY_GATE = "      var _figShown = !!(_waFig && _waFig.ready);";
    must(CH_SRC.split(READY_GATE).length === 2,
         "the ⚖️ chip no longer gates on the figure's settled flag at a single site — this probe is stale");
    const loose = CH_SRC.replace(READY_GATE, "      var _figShown = !!(_waFig && _waFig.shows);");
    const b = bootBroken({ "compare-hub.js": loose }, LAYTON, { warm: true });
    must(b.html.indexOf("rel-sig-wa") !== -1, "the loosened build painted no ⚖️ chip — this probe is stale");
    const w2 = b.w, wa2 = w2.PDXWordAction;
    const moving = Object.keys(b.groups).reduce((acc, g) => acc.concat(b.groups[g] || []), [])
      .filter((pid) => {
        let f = null;
        try { f = wa2.figure(pid, w2.CMP_DATA[pid]); } catch { f = null; }
        return f && f.shows && !f.ready;
      });
    must(moving.length > 0,
         "no card on the warmed page is publishable-but-still-warming, so shows and ready cannot be told\n" +
         "    apart here — re-derive this counterfactual");
    let leaked = 0;
    moving.forEach((pid) => {
      const i = b.html.indexOf('data-pid="' + pid + '"');
      if (i === -1) return;
      const card = b.html.slice(i, i + 14000);
      const m = card.match(/<button[^>]*rel-sig-wa[\s\S]*?<\/button>/);
      if (m && /\d+\s*%/.test(m[0])) leaked++;
    });
    ok(leaked > 0,
       "gating the chip on `shows` instead of `ready` publishes no moving percentage, so section J's\n" +
       "    settled-set guard is pinning nothing. The reported failure mode is a card that says 88% over\n" +
       "    five tested and settles to 72% over fifteen after the reader has looked away — re-derive it");
    console.log(`      shows instead of ready: ${leaked} moving percentage(s) published — ${moving.join(", ")}`);
  }

  // ── 8. The verdict word put back on the card ──
  // How it shipped: the chip printed the shared ledger slot's `sub`, which on a
  // publishable read is the verdict's own label. One string, no set behind it.
  {
    const FIG_VAL = "        waVal = _waFig.pct + '%';";
    must(CH_SRC.split(FIG_VAL).length === 2,
         "the ⚖️ chip no longer prints the figure's percentage at a single site — this probe is stale");
    const worded = CH_SRC.replace(FIG_VAL, "        waVal = slot.sub;");
    const b = bootBroken({ "compare-hub.js": worded }, LAYTON, { warm: true });
    has(b.html, "Backs it up",
        "putting the ledger slot's verdict label back on the chip prints no verdict word on any card, so\n" +
        "    section J's smoke check is guarding nothing. The reported symptom was Lee's and Curtis's\n" +
        "    cards reading \"Backs it up\" with no figure and no tested set — re-derive it");
    console.log(`      verdict word back on the chip: ${(b.html.match(/Backs it up/g) || []).length} card(s) graded instead of measured`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ relevant is my ballot: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`  · ${f}`));
  console.error("");
  process.exit(1);
}
console.log(`\n✓ relevant is my ballot: the section above the workspace lists only seats this reader votes on — ${passed} assertions passed\n`);
