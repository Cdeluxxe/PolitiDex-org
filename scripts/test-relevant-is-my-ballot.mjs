#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-relevant-is-my-ballot.mjs — Relevant to Me is the reader's ballot
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS FILE EXISTS TO KEEP FIXED, as a Layton reader met it on Door 2:
//
// Above the ballot workspace, under the heading RELEVANT TO ME, sat an accordion
// labelled CABINET / APPOINTED with the subtitle "Federal — represents every
// American" and a button reading "Compare the field · 38 in this race". Opening
// it produced the secretaries of state of California, Colorado, Washington,
// Texas, Ohio, Georgia, Michigan and nine other states, mixed in with the
// federal cabinet. Nobody in Layton asked for Jena Griswold. Under it, a second
// accordion offered a five-way "race" between Trump, Vance, Biden, Obama and
// G.W. Bush. Under THAT, a long list of Utah judges — the courts archive, which
// makes no claim about anyone's ballot — sat between the reader's seat list and
// the workspace where they choose their candidates.
//
// Every record was real and correctly labelled. What was false was the FRAME:
// a section that sits above the picks and is titled "relevant to me" makes a
// seat claim about the reader, and three separate code paths were making that
// claim for people no resolver had ever placed on their ballot.
//
//   1. The located sweep in compare-hub added `president` and `cabinet` to the
//      reader's slate BEFORE the state check, unconditionally, so both groups
//      were national for every visitor in every state.
//   2. Door 1's classifier files any office containing secretary/director/
//      ambassador under `cabinet`. That is the federal cabinet AND sixteen other
//      states' secretaries of state, in one bucket.
//   3. _pdxFieldCompareBtn renders "N in this race" for any group, so a roster
//      slice of 38 appointed officials was printed as a race with 38 runners.
//
// The fix is SCOPE, not deletion. Relevant to Me keeps only the seat kinds the
// reader's own slate can name — window.TEAM_POSITIONS, the same per-state ballot
// definition the workspace and the seat counts read — and inside those, only
// their own state's people, with the seat field's answer exempt so it stays
// authoritative about who fills a seat. This file holds that to six properties:
//
//   A. NO GROUP THE SLATE CANNOT NAME. A Layton reader's section renders no
//      cabinet group and no president group, on every render path.
//   B. NOBODY FROM ANOTHER STATE. No pid in any group is filed under a state
//      other than the reader's, except in the two groups where that is
//      legitimate: U.S. Senate and President.
//   C. NO RACE THAT IS NOT A RACE. "N in this race" appears only over groups
//      that are seats on this ballot.
//   D. THE SCOPE IS THE SLATE, NOT A HARDCODED LIST. A state whose slate names
//      a Secretary of State keeps that group — filtered to that state.
//   E. THE LOCAL COUNT SURVIVES. The expanded local seats stay expanded; this
//      pass did not squash them back to one generic "Local Office".
//   F. TWIN BOOT. Direction Match and the formal tiers are byte-identical to
//      HEAD's, because this pass changed scope and not one reading.
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

function boot(loc) {
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
  const loadErrors = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
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

function render(loc) {
  const r = boot(loc);
  must(!r.loadErrors.length, `modules failed to load: ${r.loadErrors.join(" | ")}`);
  let threw = null;
  try { r.win.renderRelevantToMe(); } catch (e) { threw = e; }
  return {
    ...r, threw,
    groups: r.win._relevantLastOfficeGroups || {},
    html: r.byId["relevant-browse-grid"].innerHTML || "",
    slate: (r.win.TEAM_POSITIONS || []).map((p) => p.key),
    stateOf: (pid) => String(r.win._pdxBrowseStateOf(pid) || ""),
    typeOf: (pid) => String(r.win._pdxBrowseType(pid) || ""),
  };
}

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County", district: "1" };

console.log("\n═══ RELEVANT TO ME IS THE READER'S BALLOT ═══");

// ═════════════════════════════════════════════════════════════════════════════
section("A · a Layton ballot names no group the Layton slate cannot name");
// ═════════════════════════════════════════════════════════════════════════════
const layton = render(LAYTON);
ok(!layton.threw, `renderRelevantToMe threw for a Layton reader — ${layton.threw && layton.threw.message}`);

const filled = Object.keys(layton.groups).filter((g) => (layton.groups[g] || []).length);
must(filled.length > 0, "the Layton ballot rendered no groups at all — this probe is stale");

// Utah's slate is six seats. Neither of the two families that used to be swept
// in ahead of the state check is one of them.
eq(JSON.stringify(layton.slate),
   JSON.stringify(["senate", "house", "governor", "statesenate", "statehouse", "local"]),
   "Utah's ballot slate is not the six seats this probe was written against — re-derive the scope below");
eq((layton.groups.cabinet || []).length, 0,
   "a Layton ballot still renders a CABINET / APPOINTED group. That bucket is the federal cabinet plus\n" +
   "    other states' secretaries of state, and none of them is on a Utah ballot");
eq((layton.groups.president || []).length, 0,
   "a Layton ballot still renders a President group. Utah's slate has no presidential slot, and the\n" +
   "    group's members were Trump, Vance, Biden, Obama and G.W. Bush — a roster slice, not a race");

// The accordion itself, in the painted markup — not just the group map.
lacks(layton.html, "relevant-browse-group-cabinet",
      "the Cabinet accordion container is still painted above the ballot workspace");
lacks(layton.html, "CABINET / APPOINTED",
      "the CABINET / APPOINTED header is still painted on a Utah ballot page");
lacks(layton.html, "represents every American",
      "a Utah ballot page still tells the reader an appointed officer represents every American");

// The named people from the report, by name, in the painted markup.
[["shirley_weber", "California"], ["jena_griswold", "Colorado"],
 ["steve_hobbs", "Washington"], ["jane_nelson_tx", "Texas"]].forEach(([pid, st]) => {
  must(layton.win.CMP_DATA[pid], `${pid} is gone from the roster — this probe is stale`);
  lacks(layton.html, layton.win.CMP_DATA[pid].name,
        `the ${st} Secretary of State is still on a Layton reader's ballot`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("B · nobody from another state, in any group that is about this state");
// ═════════════════════════════════════════════════════════════════════════════
// The exemptions are the two groups where an out-of-state record is legitimate:
// a U.S. Senator's record may carry no state or an odd normalization, and a
// President represents every state by definition. Everything else in this
// section is a claim about Utah.
const STATE_EXEMPT = { senator: 1, president: 1 };
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

// ═════════════════════════════════════════════════════════════════════════════
section("D · the scope is the reader's slate, not a list hardcoded here");
// ═════════════════════════════════════════════════════════════════════════════
// Colorado's slate names a Secretary of State, so a Colorado reader KEEPS that
// group. This is the property that makes the fix scope rather than suppression:
// the same code that drops Jena Griswold from a Utah ballot keeps her on a
// Colorado one, and drops Shirley Weber from both.
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
  lacks(String(co.html), "represents every American",
        "the appointed-office group still tells a Colorado reader its members represent every American");

  // The gate reads TEAM_POSITIONS by name, so nobody can "fix" it by adding a
  // second list of allowed offices next to the slate.
  has(CH_SRC, "TEAM_POSITIONS", "the scope gate no longer reads the per-state ballot slate");
  const gate = CH_SRC.slice(CH_SRC.indexOf("function _relevantBallotGroupKeys"),
                            CH_SRC.indexOf("function _relevantEnforceBallotScope"));
  must(gate.length > 100, "_relevantBallotGroupKeys is gone — this probe is stale");
  has(gate, "window.TEAM_POSITIONS",
      "the allowed-group list is computed without reading the reader's own slate");
}

// An Ohio reader — no district geometry, no curated locals — gets Ohio and
// nothing else. Not one appointed officer, not one other state.
{
  const oh = render({ state: "Ohio", city: "Columbus", county: "Franklin County", district: "" });
  ok(!oh.threw, `renderRelevantToMe threw for an Ohio reader — ${oh.threw && oh.threw.message}`);
  eq((oh.groups.cabinet || []).length, 0, "an Ohio reader is shown an appointed-office group Ohio's slate does not name");
  Object.keys(oh.groups).forEach((g) => {
    if (STATE_EXEMPT[g]) return;
    (oh.groups[g] || []).forEach((pid) => {
      eq(oh.stateOf(pid).toLowerCase(), "ohio",
         `the Ohio reader's ${g} group carries ${pid} (${oh.stateOf(pid)})`);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("E · the expanded local ballot survived the scope gate");
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

  // The ballot count itself is not something this pass touched.
  const counts = layton.win._myteamBallotCounts();
  must(counts, "_myteamBallotCounts no longer answers — this probe is stale");
  ok(!("cabinet" in counts) || !counts.cabinet,
     "the ballot seat counts have grown a cabinet entry — the scope gate was supposed to leave the counts alone");
  console.log(`      ${local.length} local seats, coverage and render agreed`);
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
section("H · nothing on the Do-not list was touched");
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
section("I · twin boot — the arithmetic never saw any of this");
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
section("J · every added guard is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// Each fix is put back as it shipped broken, and the property above it has to
// catch it. A guard that passes with the bug reinstated is not a guard.
{
  // 1. The unconditional president/cabinet sweep, restored.
  const broken = CH_SRC.replace(
    "        if (t === 'president' || t === 'cabinet') {\n          if (_ballotScopeGks[t]) add(pid, t);\n          return;\n        }",
    "        if (t === 'president' || t === 'cabinet') {\n          add(pid, t);\n          return;\n        }");
  must(broken !== CH_SRC, "the located sweep's scope check could not be reverted — this probe is stale");
  const brokenNoGate = broken.replace("      _relevantEnforceBallotScope(officeGroups, stateName);", "");
  must(brokenNoGate !== broken, "the scope gate call could not be removed — this probe is stale");

  const w = makeSandbox();
  const store = {};
  w.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  w.sessionStorage = w.localStorage;
  w.auth = { currentUser: null };
  w._cmpSelected = new Set();
  const byId = miniDom(w, DOM_IDS);
  const ctx = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  w._pdxDisplayScore = () => null;
  for (const f of FILES) {
    const src = f === "compare-hub.js" ? brokenNoGate : R(f);
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { /* same guards as the real boot */ }
  }
  w.PROFILES = w.CMP_DATA;
  w._hasUserLocation = true;
  w._currentVoterLocation = LAYTON;
  try { w._updateTeamPositionsForLocation(); } catch (e) {}
  try { w.renderRelevantToMe(); } catch (e) {}
  const g = w._relevantLastOfficeGroups || {};
  must((g.cabinet || []).length > 0,
       "the reverted build does not reproduce the cabinet group, so property A may be passing for a\n" +
       "    reason other than the fix — this probe is stale");
  ok((g.cabinet || []).some((pid) => String(w._pdxBrowseStateOf(pid) || "").toLowerCase() !== "utah"),
     "the reverted build's cabinet group holds no out-of-state officer, so property B is not pinning the\n" +
     "    reported bug — re-derive it");
  console.log(`      reverted build reproduced the bug: cabinet ${g.cabinet.length}, president ${(g.president || []).length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ relevant is my ballot: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`  · ${f}`));
  console.error("");
  process.exit(1);
}
console.log(`\n✓ relevant is my ballot: the section above the workspace lists only seats this reader votes on — ${passed} assertions passed\n`);
