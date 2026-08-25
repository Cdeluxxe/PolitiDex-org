#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-seat-pack.mjs — the ballot seat pack: formal pattern first
// ─────────────────────────────────────────────────────────────────────────────
// The product rule this file guards, in one sentence:
//
//     Voting pattern vs the user's issues is the DEFAULT rank when formal
//     evidence exists. Stance prose is not required to rank. Direction Match is
//     integrity only — displayed, never ranked on.
//
// A seat pack is that rule made real for ONE seat: everyone the sheet will show,
// formal mappings good enough that a set issue can return a record number, no
// invented stances, and pledges as side context if they exist at all. The four
// ways a pack can quietly stop being honest are what this tests:
//
//   1. RECORD IS THE DEFAULT AND DM IS NOT IN THE RANK. Opening a sheet cold
//      lands in record mode; the stated toggle still exists and still works; and
//      the ranking function never consults Direction Match.
//   2. THE SPINE OPENS, AND ITS FIELD IS THE ROSTER'S. Every seat the Utah
//      fixture resolves paints a sheet. The seats with roll-call officeholders
//      come back with a real number on the fixture's issues; the ones without
//      formal coverage stay banded, with the banded copy saying so in words.
//      No seat is empty for a reason the roster can fix — in particular
//      SD-24's officeholder resolves to a record, which is what a dangling pid
//      looks like once it is repaired.
//   3. THE OFFICEHOLDER-ONLY LINE NAMES AN OFFICEHOLDER. A field of one only
//      earns "only the officeholder is on file" when that one IS the incumbent.
//      A lone challenger gets no such line — saying it would name the wrong
//      person as the sitting member.
//   4. NO PARTY, NO INVENTED MATCH, NO PROMISE %. Not in the sheet copy, not in
//      the banded track, not anywhere a pack touches.
//
// Plus a drift sweep: the alignment lanes, PDXWordAction and the ledger slot are
// byte-identical against the same stack booted without the sheet, because a data
// pass is allowed to change what the DATABASE says and never what the client
// arithmetic does.
//
//   node scripts/test-seat-pack.mjs
//
// Shipped modules in a node:vm sandbox. No network, no database: the formal-
// coverage half of this pack is measured against the live corpus by
// scripts/seat-pack-coverage.mjs, which needs NETLIFY_DB_URL and therefore
// cannot be a test. What is asserted here is everything that holds without it.

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
const SRC = FILES.map((f) => [f, R(f)]);
const SHEET = R("race-sheet.js");

// The fixture voter — the same Provo / UT-03 voter the seat-spine, race-sheet
// and coverage harnesses use, with the same five issues and the same two stars,
// so a claim here and a number there describe one person.
const LOCATION = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
const ISSUES = [
  ["cost_living", "high"],
  ["border_security", "high"],
  ["healthcare", "medium"],
  ["climate_action", "medium"],
  ["strong_defense", "medium"],
];

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
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const sess = opts.session || {};
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

  // compare-table.js owns window._pdxPersonById — a three-line accessor over
  // CMP_DATA that _pdxVoterBallot()'s roster filter uses to drop pids the roster
  // does not actually carry. That file's boot IIFE binds real DOM and throws in
  // this sandbox before the assignment lands, so without the shim the filter
  // rejects EVERY pid and every district field reads as empty for harness
  // reasons rather than product reasons. Copied verbatim from compare-table.js.
  if (typeof win._pdxPersonById !== "function") {
    win._pdxPersonById = function (pid) {
      try { return (win.CMP_DATA && pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; }
      catch (e) { return null; }
    };
  }
  win.__store = store;
  win._hasUserLocation = true;
  win._currentVoterLocation = opts.location || LOCATION;
  if (opts.issues !== false) setIssues(win);
  return win;
}

// Set the fixture's issues through the SHIPPED writers — PDXStances.set() for
// the position and the priority, which is what the star control calls, and it
// mirrors into the alignment picks the sheet's axis reads. Nothing here writes a
// storage key by hand: a test that hand-rolls the store stops testing the store.
function setIssues(win) {
  ISSUES.forEach(([k, pri]) => {
    // PDXStances.set() mirrors the pick into the alignment set itself, so the
    // toggle below is a repair for the case where it did not — calling it
    // unconditionally would UN-pick the issue that was just set.
    try { win.PDXStances.set(k, "support", pri); } catch (e) { /* fall through */ }
    try {
      if (!(win._alignIssues && win._alignIssues.has(k))) win.alignToggleIssue(k);
    } catch (e) { /* the axis assertion below is what catches this */ }
  });
}

// Synthetic roll calls in the exact shape /api/voting-record/member/:id emits.
// n=0 votes WITH the fixture voter on both starred issues, n=1 votes against.
// Twelve of each, because the record lane will not characterise a member who
// holds fewer than _RD_MEMBER_FLOOR items and will not read a direction from
// fewer than _RD_MIN_JUDGED on an issue — the point is a real read, not a
// number squeezed past a floor.
function rollcalls(pid, n) {
  const dir = n === 0 ? "yea" : "nay";
  const out = [];
  ["cost_living", "border_security"].forEach((key, k) => {
    for (let i = 0; i < 12; i++) {
      const id = 9000 + n * 100 + k * 20 + i;
      out.push({
        kind: "vote", rollcallId: id, measureId: id, number: "S. " + id,
        date: "2025-0" + ((i % 9) + 1) + "-11", action: "On Passage", position: dir,
        isProcedural: false, title: "Fixture measure " + id,
        issues: [{ issueKey: key, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
        source: { url: "https://www.congress.gov/roll-call-vote/" + id, label: "Congress.gov" }
      });
    }
  });
  return out;
}

// The sheet paints into an overlay it creates; the innerHTML of that overlay is
// what a reader sees, so it is what every copy assertion reads.
function sheetHtml(win, seat) {
  win.pdxOpenRaceSheet(seat);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
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
  console.error(`✗ seat pack: ${msg}`);
  process.exit(1);
};

const probe = boot();
must(typeof probe.pdxRaceSheetEntry === "function",
  `the race sheet is not exposed — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.pdxRepsForMe === "function", "the location resolver is not loaded");
must(typeof probe._calcAlignmentScore === "function", "the match engine is not loaded");
const RS = probe.PDXRaceSheet;
must(RS && typeof RS._seat === "function" && typeof RS._field === "function",
  "PDXRaceSheet did not expose its internals for testing");

const REPS = probe.pdxRepsForMe();
must(REPS && REPS.located, "the Utah fixture no longer resolves as located");
const AXIS0 = RS._axis();
must(AXIS0.length === ISSUES.length,
  `the fixture set ${AXIS0.length} issues, not ${ISSUES.length} — every copy assertion below would be vacuous`);
must(AXIS0.filter((r) => r.starred).length === 2,
  `the fixture starred ${AXIS0.filter((r) => r.starred).length} issues, not 2`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Record is the default; DM is display, never rank");
{
  const w = boot();
  const M = w.PDXRaceSheet;

  // Cold open, no mode ever chosen: the lane is record.
  eq(M.mode(), "record", "a cold sheet does not open in record mode");

  const html = sheetHtml(w, "ussenate1");
  has(html, "Your Record Match", "the sheet does not name the record lane");
  has(html, "formal record</b> on the issues you set",
    "the rank line does not say the rank is the formal record");

  // The stated toggle still exists, is painted as the OFF tab, and still switches.
  has(html, "Your Match · stated", "the stated toggle is gone from the sheet");
  has(html, "pdxRaceSheetMode(&#39;stated&#39;)".replace(/&#39;/g, "'"),
    "the stated tab is not wired to the mode setter");
  eq(w.pdxRaceSheetMode("stated"), "stated", "the stated toggle did not switch the lane");
  eq(M.mode(), "stated", "the lane did not stick after switching to stated");
  has(sheetHtml(w, "ussenate1"), "stated positions</b> on the issues you set",
    "the stated lane does not say what it ranks on");
  eq(w.pdxRaceSheetMode("record"), "record", "the lane did not switch back to record");

  // rank() is the sort key. It may read the two alignment lanes and nothing
  // else — a Direction Match read inside it would make integrity a ranking.
  const src = SHEET;
  const at = src.indexOf("function rank(");
  ok(at > 0, "rank() is gone from race-sheet.js");
  const body = src.slice(at, src.indexOf("\n  }", at) + 4);
  ok(body.length > 200 && body.length < 3000, `rank() slice looks wrong (${body.length} chars)`);
  ["irectionMatch", "PDXConsistency", "sayVsDo", "_pdxLedgerSlot", "party"].forEach((s2) =>
    lacks(body, s2, `rank() reads "${s2}" — the sort key must be the match engine alone`));
  has(body, "scoreOf(c.pid, mode)", "rank() no longer scores on the active lane");

  // …and scoreOf is the match engine, not a second opinion about it.
  const sAt = src.indexOf("function scoreOf(");
  const scoreBody = src.slice(sAt, src.indexOf("\n  }", sAt) + 4);
  has(scoreBody, "_calcAlignmentScore", "scoreOf() does not call the shipped match engine");
  lacks(scoreBody, "irectionMatch", "scoreOf() reads Direction Match");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Every spine seat opens; fields are the roster's");
{
  const w = boot();
  const M = w.PDXRaceSheet;
  const seats = REPS.levels.map((l) => l.key);
  ok(seats.length >= 6, `expected the full seat spine, got ${seats.length} levels`);

  seats.forEach((k) => {
    const sm = M._seat(k);
    ok(!!sm, `seat ${k} does not resolve to a race the sheet can open`);
    if (!sm) return;
    const html = sheetHtml(w, k);
    ok(typeof html === "string" && html.length > 200,
      `seat ${k} painted nothing`);
    has(html, "rs-hd-seat", `seat ${k} painted no header`);
  });

  // The pack's own repair: SD-24's officeholder is a real roster record now, so
  // the state senate field is no longer empty for an identity reason. A dangling
  // pid reads as "no candidates on file", which is a claim about the WORLD, and
  // it was false.
  const ssLevel = REPS.levels.filter((l) => l.key === "statesenate")[0] || {};
  const sdPid = ssLevel.pid;
  eq(sdPid, "kstratton", "the Provo fixture's state senate officeholder changed");
  ok(!!(w.CMP_DATA && w.CMP_DATA[sdPid]),
    `${sdPid} holds SD-24 in the ballot resolver but has no roster record — the state senate field will read empty for an identity reason`);
  ok(typeof w._pdxPersonById === "function" && !!w._pdxPersonById(sdPid),
    `${sdPid} does not resolve through _pdxPersonById, so the ballot filter drops it`);
  const ssField = M._field("statesenate");
  ok(ssField.some((c) => c.pid === sdPid),
    "the state senate field does not include SD-24's officeholder");

  // FORMAL COVERAGE → A NUMBER; NO FORMAL COVERAGE → NO NUMBER. The votes
  // themselves come from /api/voting-record at runtime and from the database in
  // scripts/seat-pack-coverage.mjs; neither is reachable here. So this asserts
  // the CONTRACT with synthetic roll calls in the shape the API emits: the two
  // senators get a real record on two of the fixture's issues, the governor and
  // his challenger get nothing, and the engine must tell them apart on that
  // basis alone — not on who they are.
  const w2 = boot();
  ["lee", "curtis"].forEach((pid, n) => {
    w2.PDXVotingRecord.noteMember(pid, rollcalls(pid, n));
  });
  const scored = (win, pid) => {
    const v = win._calcAlignmentScore(pid, { mode: "record" });
    return (typeof v === "number" && isFinite(v)) ? Math.round(v) : null;
  };
  ["lee", "curtis"].forEach((pid) => {
    ok(scored(w2, pid) !== null,
      `${pid} has a formal record on the fixture's issues but returns no record match`);
  });
  ["cox", "lyman", "kstratton"].forEach((pid) => {
    eq(scored(w2, pid), null,
      `${pid} has no formal record and must not be given a record number`);
  });

  // The one who votes WITH the fixture outranks the one who votes against, and
  // it is the record that did it — neither has a documented position on these
  // two issues, so no other lane could have produced the order.
  ok(scored(w2, "lee") > scored(w2, "curtis"),
    "the record lane did not order the field by how they actually voted");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The banded track says the honest thing");
{
  const w = boot();
  const html = sheetHtml(w, "governor");
  has(html, "rs-grid--gap", "the governor sheet has no banded track for a field with no formal record");
  has(html, "No formal record on your issues yet",
    "the banded track does not name what is missing");
  has(html, "They are not ranked here and they are not scored from their words instead.",
    "the banded copy does not refuse the substitution it exists to refuse");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Officeholder-only copy requires an officeholder");
{
  const LINE = "Only the officeholder is on file";

  // A real one-person field where the one IS the incumbent. SD-24 is that case
  // for this fixture: the roster carries exactly the sitting senator.
  const wInc = boot();
  const incField = wInc.PDXRaceSheet._field("statesenate");
  eq(incField.length, 1, "SD-24's field is no longer exactly one person");
  eq(incField[0].incumbent, true, "SD-24's one candidate is not marked as the officeholder");
  has(sheetHtml(wInc, "statesenate"), LINE,
    "a lone officeholder did not get the officeholder-only line");

  // …and the same seat with ONE person on file who is NOT the officeholder — a
  // filing certified before the incumbent's, or a seat whose holder the roster
  // does not carry. Same count, different fact. The field is swapped at its
  // source (_ballotCandidates), which is the hook the sheet actually reads, so
  // this exercises the shipped gate rather than a stubbed copy of it.
  const wCh = boot();
  const CHALLENGER = "amillner";
  ok(!!wCh.CMP_DATA[CHALLENGER], `${CHALLENGER} is no longer in the roster`);
  const realCands = wCh._ballotCandidates;
  wCh._ballotCandidates = function (rk) {
    // The sheet asks by RACE key ("statesenate"), not by the resolver's own
    // office key, so match the one the sheet actually passes.
    if (rk !== "statesenate") return realCands.call(wCh, rk);
    return [{ pid: CHALLENGER, name: wCh.CMP_DATA[CHALLENGER].name }];
  };
  const chField = wCh.PDXRaceSheet._field("statesenate");
  eq(chField.length, 1, "the swapped field is not exactly one person");
  eq(chField[0].incumbent, false,
    "the swapped candidate reads as the officeholder — the test proves nothing");
  const loneChallenger = sheetHtml(wCh, "statesenate");
  wCh._ballotCandidates = realCands;
  lacks(loneChallenger, LINE,
    "a lone CHALLENGER was described as the officeholder on file");
  has(loneChallenger, "rs-hd-seat",
    "the sheet stopped painting once the one candidate was not an incumbent");
  has(loneChallenger, CHALLENGER, "the lone challenger is not on the sheet at all");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · No party, no invented match, no promise %");
{
  const w = boot();
  const M = w.PDXRaceSheet;
  const all = REPS.levels.map((l) => sheetHtml(w, l.key)).join("\n");

  // Party framing. The roster carries a party letter as identity; what is
  // forbidden is the sheet REASONING from it.
  [
    "Republican", "Democrat", "Democratic", "GOP",
    "party line", "party loyalty", "votes with their party",
  ].forEach((s) => lacks(all, s, `party framing "${s}" in seat pack copy`));

  // No claim that everyone has a number.
  ["everyone has a match", "every candidate has a match"].forEach((s) =>
    lacks(all.toLowerCase(), s, `the sheet claims universal coverage: "${s}"`));

  // No promise percentage anywhere near the rank.
  ["Promise %", "promise score", "Promises kept: "].forEach((s) =>
    lacks(all, s, `a promise tally surfaced on the race sheet: "${s}"`));

  // The rank line still names what it ranks on, and does not name DM or party.
  has(all, "formal record</b> on the issues you set",
    "the rank line no longer says the rank is the formal record vs the voter's positions");
  has(all, "not by party, and not by Direction Match",
    "the rank line stopped disclaiming party and Direction Match");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Nothing drifted");
{
  const base = boot({ withoutSheet: true });
  const live = boot();
  const pids = Object.keys(base.CMP_DATA).slice(0, 160)
    .concat(["lee", "curtis", "kennedy", "cox", "lyman", "kstratton"]);
  let checked = 0, drift = 0;
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
    const wa = base.PDXWordAction ? base.PDXWordAction.read(pid) : null;
    const wb = live.PDXWordAction ? live.PDXWordAction.read(pid) : null;
    checked++;
    if (JSON.stringify(wa) !== JSON.stringify(wb)) drift++;
  });
  ok(checked >= 400, `drift sweep only checked ${checked} values`);
  eq(drift, 0, `${drift} of ${checked} values moved with the seat pack loaded`);

  // Reading a pack must never write one.
  const w = boot();
  const before = JSON.stringify(w.__store);
  REPS.levels.forEach((l) => sheetHtml(w, l.key));
  eq(JSON.stringify(w.__store), before, "painting the seat packs wrote to storage");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The curated seed and the migration agree");
{
  // The one mapping this pack changed: S. 2 (119) border_security becomes a
  // PRIMARY relation. The migration is what the platform applies; the seed is
  // what a re-ingest and every offline harness read. If they disagree, the next
  // ingest silently reverts the migration.
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const s2 = (seed.measures || []).filter(
    (m) => m.number === "S. 2" && m.congress === 119)[0];
  ok(!!s2, "S. 2 (119) is no longer in the curated issue seed");
  const bs = s2 && (s2.issues || []).filter((i) => i.issueKey === "border_security")[0];
  ok(!!bs, "S. 2 no longer maps border_security");
  if (bs) {
    eq(bs.isPrimary, true, "S. 2's border_security mapping is not primary in the seed");
    eq(bs.weight, 90, "S. 2's border_security weight moved — only the primary flag should have");
    eq(bs.supportMeaning, "yea_supports", "S. 2's border_security support meaning moved");
  }

  // Exactly one primary per measure is the corpus convention everywhere EXCEPT on
  // these four, where two axes are both the instrument's own subject. S. 2 set the
  // pattern; the August 2026 primary-lane audit found three more and promoted only
  // those (see scripts/test-primary-lane-promotes.mjs for the pack's own guards).
  // Assert the exception stays deliberate and confined to this set.
  const multi = (seed.measures || [])
    .filter((m) => (m.issues || []).filter((i) => i.isPrimary).length > 1)
    .map((m) => `${m.number} (${m.congress})`);
  eq(multi.join(", "), "H.Amdt. 235 (119), S.J.Res. 18 (119), S. 1383 (119), S. 2 (119)",
    "the set of measures with two primaries changed — the flag is drifting back into a ranking");

  const mig = R("netlify/database/migrations/20260920000000_vr_s2_border_security_primary_lane.sql");
  has(mig, "is_primary = TRUE", "the migration does not set the primary flag");
  has(mig, "issue_key = 'border_security'", "the migration is not keyed on border_security");
  has(mig, "'S. 2'", "the migration is not keyed on S. 2");
  // One statement, one table, one operation. A migration that also DELETEs, or
  // reaches vr_member_votes, is not the mapping correction it says it is.
  const sql = mig.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").trim();
  eq((sql.match(/^UPDATE /gm) || []).length, 1,
    "the migration is not exactly one UPDATE");
  ok(/^UPDATE vr_measure_issues\b/.test(sql),
    "the migration's statement is not an UPDATE on vr_measure_issues");
  // Semicolons inside the rationale literal are not statement ends, so count
  // statement KEYWORDS at the start of a line instead of splitting on ";".
  eq((sql.match(/^\s*(UPDATE|INSERT|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/gim) || []).length, 1,
    "the migration runs more than one statement");
  ["DELETE ", "DROP ", "ALTER ", "vr_member_votes", "vr_rollcalls", "INSERT "].forEach((s2) =>
    lacks(sql, s2, `the migration does more than correct a mapping: "${s2}"`));
  // The rationale text is the same in both places, character for character.
  if (bs) {
    has(mig, bs.rationale.replace(/'/g, "''"),
      "the migration's rationale and the seed's rationale have diverged");
  }

  // The floors themselves are untouched by this pack.
  const sh = R("stance-helpers.js");
  [["_RD_MIN_JUDGED", "4"], ["_RD_DOMINANCE", "0.75"], ["_RD_THIN_MIN", "2"],
   ["_RD_MIN_PRIMARY", "1"], ["_RD_MEMBER_FLOOR", "12"]].forEach(([name, val]) => {
    const m = sh.match(new RegExp("var " + name + "\\s*=\\s*([0-9.]+)"));
    eq(m && m[1], val, `${name} moved — a data pass may not buy coverage by lowering a floor`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ seat pack: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`\n✓ seat pack: ${passed} assertions passed\n`);
