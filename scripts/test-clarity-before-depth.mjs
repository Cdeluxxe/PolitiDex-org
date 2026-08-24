#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-clarity-before-depth.mjs — the formal record's one fairness rule
// ─────────────────────────────────────────────────────────────────────────────
// Your Match · record turns a member's formal record on an issue into a side, a
// confidence and a weight. This file guards the single rule that makes those
// three fair to each other:
//
//   CLARITY CAPS CONFIDENCE. DEPTH BOOSTS ONLY CLEAR RUNS.
//
// Three concrete failures it exists to catch, each one measured on the shipped
// brain before it was fixed:
//
//   1. THE CONFIDENCE INVERSION. `_ALIGN_PAT_CONF` priced `split` at 0.6 and
//      `thin` at 0.5, so a record the engine REFUSED to read a direction from
//      occupied more of the weighted average than one it read cleanly. On a
//      two-issue basket (a clear 1–0 and a 3–3 coin flip) the coin flip took
//      54.5% of the number against the clear vote's 45.5%.
//   2. THE COVERAGE-FLOOR CLIFF. Below the member coverage floor, ONE mapped
//      vote read as "Thin supports" and scored the issue; TWO votes the same way
//      fell to "No clear pattern yet" and were dropped from the match. A second
//      act agreeing with the first deleted the signal the first one earned.
//   3. "NO CLEAR PATTERN YET" OVER A KNOWN SIDE. One sentence stood in for four
//      different refusals — nothing took a side, the mapping was incidental, we
//      hold too little of the file, the items ran both ways — two of which sit
//      over a ledger whose side is perfectly visible.
//
// AND THE LINES THAT MUST NOT MOVE WHILE FIXING THEM. A split never acquires a
// direction, at any depth or margin; the 90/55/12 ladder is untouched; a poleless
// issue and an incidental mapping are still silent; nothing here reaches Direction
// Match.
//
//   node scripts/test-clarity-before-depth.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, vote packs seeded
// the way a completed /api/voting-record fetch leaves the cache. No database, no
// network, no browser.

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
  "compare-hub.js", "ballot-breakdown.js", "race-sheet.js",
];
const SRC = FILES.map((f) => [f, R(f)]);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) < 0,
     `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A stale probe is not a pass. When the fixture stops being the fixture the
// contract is written about, this file can say nothing about the contract, and
// saying nothing quietly is the exact failure mode it exists to remove.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ clarity harness is STALE — a contract cannot be verified:\n  ${msg}`);
  process.exit(2);
};

// ── The sandbox ──────────────────────────────────────────────────────────────
function miniDom(win) {
  const byId = {};
  const el = (id) => ({
    id: id || "", className: "", innerHTML: "", textContent: "",
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
    removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  return byId;
}
// `mutate` is a per-file source rewrite, used only by the mutation section.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    const body = (opts.mutate && opts.mutate[f]) ? opts.mutate[f](src) : src;
    try { vm.runInContext(body, sandbox, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  return win;
}

// ── The vote packs ───────────────────────────────────────────────────────────
let seq = 0;
const vote = (key, position, o) => {
  o = o || {}; seq++;
  return {
    kind: "vote", rollcallId: 9000 + seq, measureId: 9500 + seq, number: "S. " + (300 + seq),
    date: "2025-0" + ((seq % 9) + 1) + "-11", action: "On Passage", position,
    isProcedural: !!o.proc, title: "Measure " + seq,
    issues: [{ issueKey: key, weight: 100,
               isPrimary: !o.incidental, supportMeaning: "yea_supports" }],
    source: { url: "https://www.congress.gov/roll-call-vote/" + (9000 + seq), label: "Congress.gov" },
  };
};
const run = (n, key, pos, o) => {
  const out = []; for (let i = 0; i < n; i++) out.push(vote(key, pos, o)); return out;
};

// ── The fixture ──────────────────────────────────────────────────────────────
// DEEP is a member we hold well over the coverage floor of mapped votes; SHALLOW
// is one we hold three of. The issues are ones NEITHER has a documented position
// on and which the site's own taxonomy gives a directional pole to, so every
// number below can only have come from the formal record.
const probe = boot();
// compare-hub paints on load and is not part of this contract; the files that
// carry the record→match path are, and they must have executed cleanly.
const CORE = ["stance-helpers.js", "alignment-tool.js", "consistency.js", "voting-record.js"];
must(!probe.__loadErrors.some((e) => CORE.some((f) => e.indexOf(f) === 0)),
  "a core module failed to load: " + probe.__loadErrors.join(" · "));
must(typeof probe._calcAlignmentBreakdown === "function", "the match brain is not loaded");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "the formal-pattern index is not loaded");
must(probe._PDX_ALIGN_PAT_CONF, "the alignment confidence table is not published");

const FLOOR = probe._PDX_RD_MEMBER_FLOOR;
must(typeof FLOOR === "number" && FLOOR > 3, `the member coverage floor is not a number above 3 (${FLOOR})`);
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
const DEEP = "curtis", SHALLOW = "lee";
const mapD = probe._polPositionMap(DEEP, probe.CMP_DATA[DEEP]) || {};
const mapS = probe._polPositionMap(SHALLOW, probe.CMP_DATA[SHALLOW]) || {};
const SILENT = Object.keys(probe.ISSUE_MAP || {}).filter((k) => sideable(k) && !mapD[k] && !mapS[k]);
must(SILENT.length >= 12, `the fixture needs 12+ issues neither member has stated, has ${SILENT.length}`);
const POLELESS = Object.keys(NO_POLE).filter((k) => probe.ISSUE_MAP[k])[0];
must(POLELESS, "no poleless issue survives in the shared taxonomy");

// key → the pack that lands on it, for the member named
const DEEP_FIX = {
  one_for:    { key: SILENT[0],  desc: "n=1 readable support",        recs: run(1, SILENT[0], "yea") },
  one_agst:   { key: SILENT[1],  desc: "n=1 readable oppose",         recs: run(1, SILENT[1], "nay") },
  no_side:    { key: SILENT[2],  desc: "n=1 with no readable side",   recs: run(1, SILENT[2], "present") },
  clear5:     { key: SILENT[3],  desc: "clear multi 5–0",             recs: run(5, SILENT[3], "yea") },
  clear61:    { key: SILENT[4],  desc: "clear multi 6–1",             recs: run(6, SILENT[4], "yea").concat(run(1, SILENT[4], "nay")) },
  near43:     { key: SILENT[5],  desc: "near split 4–3 oppose lean",  recs: run(4, SILENT[5], "nay").concat(run(3, SILENT[5], "yea")) },
  coin33:     { key: SILENT[6],  desc: "true coin flip 3–3",          recs: run(3, SILENT[6], "yea").concat(run(3, SILENT[6], "nay")) },
  incidental: { key: SILENT[7],  desc: "incidental n=1",              recs: run(1, SILENT[7], "yea", { incidental: true }) },
  uniform2:   { key: SILENT[8],  desc: "2–0 above the floor",         recs: run(2, SILENT[8], "yea") },
  proc_only:  { key: SILENT[10], desc: "1–1, and both were procedural",
                recs: run(1, SILENT[10], "yea", { proc: true })
                  .concat(run(1, SILENT[10], "nay", { proc: true })) },
  mixed_thin: { key: SILENT[11], desc: "1–1 on the substance, above the floor",
                recs: run(1, SILENT[11], "yea").concat(run(1, SILENT[11], "nay")) },
  poleless:   { key: POLELESS,   desc: "poleless key, 5–0 arithmetic", recs: run(5, POLELESS, "yea") },
  pad:        { key: SILENT[9],  desc: "padding, lifts DEEP over the floor", recs: run(14, SILENT[9], "yea") },
};
const SHALLOW_FIX = {
  below1: { key: SILENT[0], desc: "n=1 support, below the floor",  recs: run(1, SILENT[0], "yea") },
  below2: { key: SILENT[1], desc: "2–0 support, below the floor",  recs: run(2, SILENT[1], "yea") },
};

function stage(opts) {
  const win = boot(opts);
  const dPack = [].concat(...Object.values(DEEP_FIX).map((f) => f.recs));
  const sPack = [].concat(...Object.values(SHALLOW_FIX).map((f) => f.recs));
  win.PDXVotingRecord.noteMember(DEEP, JSON.parse(JSON.stringify(dPack)));
  win.PDXVotingRecord.noteMember(SHALLOW, JSON.parse(JSON.stringify(sPack)));
  const keys = [...new Set(Object.values(DEEP_FIX).concat(Object.values(SHALLOW_FIX)).map((f) => f.key))];
  keys.forEach((k) => win.alignSetIntensity(k, "support"));
  return win;
}
const LIVE = stage();
must((LIVE._pdxRecordMappedCounts(DEEP) || {}).votes >= FLOOR,
  "the deep member no longer clears the coverage floor");
must((LIVE._pdxRecordMappedCounts(SHALLOW) || {}).votes < FLOOR,
  "the shallow member no longer sits below the coverage floor");

const fpiOf = (pid) => {
  const out = {};
  (LIVE.PDXConsistency.formalPatternIndex.rows(pid) || []).forEach((r) => { out[r.key] = r; });
  return out;
};
const F_DEEP = fpiOf(DEEP), F_SHALLOW = fpiOf(SHALLOW);
const bdRows = (win, pid) => {
  const bd = win._calcAlignmentBreakdown(pid, { mode: "record" });
  const out = { rows: {}, bd: bd };
  if (bd) bd.issues.forEach((r) => { out.rows[r.key] = r; });
  return out;
};
const B_DEEP = bdRows(LIVE, DEEP), B_SHALLOW = bdRows(LIVE, SHALLOW);
must(B_DEEP.bd, "the deep member scores nothing at all in record mode");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · clarity caps confidence — the one ordering the table must keep");
// ═════════════════════════════════════════════════════════════════════════════
{
  const C = LIVE._PDX_ALIGN_PAT_CONF;
  ok(C.split <= C.thin, `conf(split)=${C.split} must not exceed conf(thin)=${C.thin} — a record with no readable direction may never outweigh one with a direction`);
  ok(C.thin <= C.mostly, `conf(thin)=${C.thin} must not exceed conf(mostly)=${C.mostly}`);
  ok(C.mostly <= C.strong, `conf(mostly)=${C.mostly} must not exceed conf(strong)=${C.strong}`);
  eq(C.strong, 1, "a uniform characterised run is still the full-confidence read");

  // ── AND THE ORDERING IS HELD AT RUNTIME, NOT ONLY HERE ────────────────────
  // The four assertions above describe the table as it is shipped. They cannot
  // describe the table as it will be after the next edit to it, which is exactly
  // how the inversion arrived the first time: the literal drifted, every surface
  // kept rendering, and only a test run months later noticed. So the module
  // publishes a lock and the read goes through it, and this is the test that the
  // lock is real — a table tampered with in memory comes back ordered.
  const LOCK = LIVE._pdxAlignPatConfLock;
  ok(typeof LOCK === "function", "the confidence table publishes a runtime lock");
  if (typeof LOCK === "function") {
    const bad = { strong: 1, mostly: 0.85, split: 0.6, thin: 0.5 };
    const fixed = LOCK(bad);
    ok(fixed.split <= fixed.thin,
      `the lock repairs an inverted split — got ${JSON.stringify(fixed)}`);
    eq(fixed.split, fixed.thin, "…by clamping it DOWN to thin, never by raising thin");
    eq(fixed.thin, 0.5, "…and thin itself does not move to accommodate it");
    // Clamping upward would let a typo in a low slot raise the tier above it,
    // which is the same silent drift with the sign flipped.
    const low = LOCK({ strong: 1, mostly: 0.85, split: 0.1, thin: 0.2 });
    eq(low.split, 0.1, "a correctly-ordered table is left exactly as written");
    eq(low.thin, 0.2, "…on every slot");
    // Garbage in a slot is not a licence to invent a confidence.
    const junk = LOCK({ strong: "loud", mostly: null, split: 9, thin: undefined });
    ok(junk.split <= junk.thin && junk.thin <= junk.mostly && junk.mostly <= junk.strong,
      `a table of nonsense still comes back ordered — got ${JSON.stringify(junk)}`);
    eq(junk.strong, 1, "…with strong defaulted to the full read");
  }
  // The live table has already been through it.
  ok(C.split <= C.thin && C.thin <= C.mostly && C.mostly <= C.strong,
    "and the shipped table satisfies the whole ladder, not just the one pair");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the fixtures — tier, side, verdict and confidence, end to end");
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = (k) => (F_DEEP[k] || {}).tier;
  const row = (k) => B_DEEP.rows[k] || null;

  eq(t(DEEP_FIX.one_for.key), "thin", "one vote that advanced is a thin READ, not a refusal");
  eq(t(DEEP_FIX.one_agst.key), "thin", "one vote that cut against is a thin read too");
  eq(t(DEEP_FIX.clear5.key), "strong", "5–0 is the strong tier");
  eq(t(DEEP_FIX.clear61.key), "mostly", "6–1 is the mostly tier");
  eq(t(DEEP_FIX.near43.key), "split", "4–3 is a split");
  eq(t(DEEP_FIX.coin33.key), "split", "3–3 is a split");
  eq(t(DEEP_FIX.uniform2.key), "thin", "2–0 above the floor is a thin read");

  // A single clear vote is directional and scores. Depth boosts only clear runs.
  eq(row(DEEP_FIX.one_for.key).verdict, "match", "a reader who supports matches a lone advancing vote");
  eq(row(DEEP_FIX.one_agst.key).verdict, "mismatch", "…and mismatches a lone opposing one");
  eq(row(DEEP_FIX.clear5.key).verdict, "match", "5–0 the same way is the same verdict, carried harder");
  ok(row(DEEP_FIX.clear5.key).weight > row(DEEP_FIX.one_for.key).weight,
    "depth boosts a CLEAR run: 5–0 must weigh more than 1–0");
  ok(row(DEEP_FIX.clear61.key).weight < row(DEEP_FIX.clear5.key).weight,
    "…and 6–1 weighs less than 5–0, because one exception is less clear than none");

  // A split never acquires a direction, however lopsided the margin.
  ["near43", "coin33"].forEach((f) => {
    const k = DEEP_FIX[f].key, r = row(k);
    eq(r.verdict, "partial", `${DEEP_FIX[f].desc}: a split resolves to partial and never to a full verdict`);
    eq(r.score, 55, `${DEEP_FIX[f].desc}: the 90/55/12 ladder is untouched`);
    eq(r.pattern.side, "mixed", `${DEEP_FIX[f].desc}: the side stays mixed — no lead is derived`);
    ok(r.weight < row(DEEP_FIX.one_for.key).weight,
      `${DEEP_FIX[f].desc}: a record with no direction must weigh less than one clear vote (got ${r.weight.toFixed(3)} vs ${row(DEEP_FIX.one_for.key).weight.toFixed(3)})`);
  });

  // The two meaning walls are untouched: no pole, and an incidental mapping.
  eq(row(DEEP_FIX.poleless.key), null, "a poleless issue is scored by nobody, at any depth");
  eq(row(DEEP_FIX.incidental.key), null, "an incidental mapping is a coincidence, not a vote on the issue");
  eq(row(DEEP_FIX.no_side.key), null, "a vote that took no side gives the match nothing to read");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one more agreeing vote never silences the first (monotonicity)");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Below the coverage floor, every uniform depth from 1 upward must read, must
  // stay directional, and must never lose confidence by gaining evidence.
  const KEY = SILENT[0];
  let prevConf = 0, prevIncluded = true;
  for (let n = 1; n <= 6; n++) {
    const win = boot();
    win.PDXVotingRecord.noteMember(SHALLOW, run(n, KEY, "yea"));
    win.alignSetIntensity(KEY, "support");
    const held = (win._pdxRecordMappedCounts(SHALLOW) || {}).votes;
    must(held < FLOOR, `n=${n}: the shallow member drifted over the coverage floor (${held})`);
    const fr = (win.PDXConsistency.formalPatternIndex.rows(SHALLOW) || []).find((x) => x.key === KEY);
    const bd = win._calcAlignmentBreakdown(SHALLOW, { mode: "record" });
    const r = bd ? bd.issues.find((x) => x.key === KEY) : null;
    ok(!!fr && fr.directional, `n=${n} below the floor: ${n} vote(s) all one way must carry a side`);
    eq(fr && fr.tier, "thin", `n=${n} below the floor: …at the thin tier, never promoted by depth we do not hold`);
    ok(!!r, `n=${n} below the floor: …and must be included in the match`);
    lacks(fr ? fr.patLabel : "", "no clear pattern",
      `n=${n} below the floor: a known side must never print "no clear pattern yet"`);
    const conf = r ? r.pattern.conf : 0;
    ok(conf >= prevConf, `n=${n}: confidence fell from ${prevConf} to ${conf} by adding an AGREEING vote`);
    ok(prevIncluded && !!r, `n=${n}: a row that scored at n=${n - 1} must still score at n=${n}`);
    prevConf = conf; prevIncluded = !!r;
  }
  // …and mixed below the floor is still refused: this door is for uniform runs.
  {
    const win = boot();
    win.PDXVotingRecord.noteMember(SHALLOW, run(2, SILENT[0], "yea").concat(run(1, SILENT[0], "nay")));
    win.alignSetIntensity(SILENT[0], "support");
    const bd = win._calcAlignmentBreakdown(SHALLOW, { mode: "record" });
    eq(bd, null, "a 2–1 below the coverage floor still reads nothing — the door is for uniform runs only");
  }
  // …and the incidental wall does not move for a run either.
  {
    const win = boot();
    win.PDXVotingRecord.noteMember(SHALLOW, run(3, SILENT[0], "yea", { incidental: true }));
    win.alignSetIntensity(SILENT[0], "support");
    const bd = win._calcAlignmentBreakdown(SHALLOW, { mode: "record" });
    eq(bd, null, "three incidental mappings are three coincidences, not a record on the issue");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the B2 class — 2–0 below the floor scores and names its side");
// ═════════════════════════════════════════════════════════════════════════════
{
  const k = SHALLOW_FIX.below2.key;
  const fr = F_SHALLOW[k], r = B_SHALLOW.rows[k];
  ok(!!fr, "the 2–0 row is in the formal index at all");
  eq(fr && fr.tier, "thin", "2–0 below the floor reads at the thin tier");
  eq(fr && fr.tone, "support", "…with the side the ledger shows");
  lacks(fr ? fr.patLabel : "", "no clear pattern",
    "…and never tells the reader there is no pattern over a side that is on the ledger");
  ok(!!r, "…and it contributes to Your Match · record");
  eq(r && r.verdict, "match", "…as a match for a reader who supports the issue");
  // The race-sheet cell reads the same row: it must not say it either.
  const one = F_SHALLOW[SHALLOW_FIX.below1.key];
  ok(!!one && one.directional, "the n=1 row below the floor still reads, exactly as it did");
  eq(one && one.single, true, "…and is still marked as a single item");
  eq(fr && fr.single, false, "…while a two-item run is a run, and is not marked as one item");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a refusal names its own reason");
// ═════════════════════════════════════════════════════════════════════════════
{
  const why = (rows, k) => (rows[k] || {}).why || null;
  const w1 = why(F_DEEP, DEEP_FIX.incidental.key);
  ok(w1 && w1.id === "incidental",
    `an incidental mapping says so — got ${JSON.stringify(w1 && w1.id)}`);
  lacks(w1 ? w1.lb : "", "no clear pattern", "…and does not fall back to the old blanket sentence");
  eq(F_DEEP[DEEP_FIX.incidental.key].read, false, "…and reports itself as unread, not as a read with no answer");

  const w2 = why(F_DEEP, DEEP_FIX.no_side.key);
  ok(w2 && w2.id === "no_side_taken",
    `a Present-only row says nothing took a side — got ${JSON.stringify(w2 && w2.id)}`);
  ok(w1 && w2 && w1.lb !== w2.lb,
    "…and the two refusals are two different sentences, which was the whole complaint");

  const w3 = why(F_DEEP, DEEP_FIX.poleless.key);
  ok(w3 && w3.id === "no_side", "a poleless issue still names the gap as ours, not theirs");

  // Every unread row in the index now carries a reason and a note.
  [F_DEEP, F_SHALLOW].forEach((rows) => {
    Object.keys(rows).forEach((k) => {
      const x = rows[k];
      if (x.read) return;
      ok(!!(x.why && x.why.id && x.why.lb && x.why.note), `unread row ${k} carries no reason`);
      lacks(x.patLabel, "no clear pattern", `unread row ${k} still prints the blanket sentence`);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5b · the ROW CHIP — the surface the last pass missed");
// ═════════════════════════════════════════════════════════════════════════════
// PDXConsistency.recordPattern.html() is the 🏛 Record chip on every stance row:
// the profile face list and the All Stances overlay both print it, and so does
// anything else that mounts a stance row. The formal-record INDEX learned to
// offer a declined row the thin door and to name its refusal; this chip did not,
// so one member on one issue could read "Thin supports" in the index and "No
// clear pattern yet" in the list below it. Same engine, same votes, two answers,
// and the wrong one was the one on the longer list.
{
  const label = (html) => (/pdxst-pat-lb">([^<]*)</.exec(String(html)) || [])[1] || "";
  const rowOf = (pid, key) => (LIVE.PDXConsistency.issueRows(pid) || []).find((r) => r.key === key) || null;
  const chip = (pid, key) => {
    const r = rowOf(pid, key);
    return r ? LIVE.PDXConsistency.recordPattern.html(r) : "";
  };

  // The thin door, on the chip. A one-vote and a two-vote run BELOW the coverage
  // floor are the exact rows the brief names, and both have a side on the ledger.
  const c1 = chip(SHALLOW, SHALLOW_FIX.below1.key);
  const c2 = chip(SHALLOW, SHALLOW_FIX.below2.key);
  eq(label(c1), "Thin supports", "a 1-vote row below the floor says which way that vote went");
  eq(label(c2), "Thin supports", "…and so does a 2-vote run, which used to lose its side by growing");
  [c1, c2].forEach((h, i) => lacks(h, "no clear pattern",
    `the ${i ? "two" : "one"}-vote chip must not tell a reader there is no pattern over a side on the ledger`));

  // And the chip agrees with the index it sits under, row for row.
  [SHALLOW_FIX.below1.key, SHALLOW_FIX.below2.key].forEach((k) => {
    eq(label(chip(SHALLOW, k)), (F_SHALLOW[k] || {}).patLabel,
      `${k}: the row chip and the formal index print the same words`);
  });

  // A refusal on the chip names which refusal it is, in _fpiUnreadWhy's own
  // vocabulary — the same sentences the index already uses, not a second set.
  const refusals = {
    [DEEP_FIX.no_side.key]: "no vote here took a side",
    [DEEP_FIX.incidental.key]: "not about this issue",
    [DEEP_FIX.proc_only.key]: "procedural votes only",
    [DEEP_FIX.mixed_thin.key]: "ran both ways, too few to weigh",
  };
  Object.keys(refusals).forEach((k) => {
    const h = chip(DEEP, k);
    eq(label(h).toLowerCase(), refusals[k], `${k}: the chip names the real reason`);
    lacks(h, "no clear pattern", `${k}: …and not the blanket sentence`);
    lacks(h, "supports", `${k}: …and borrows no direction word`);
    lacks(h, "opposes", `${k}: …in either direction`);
  });

  // NOT A NEW VOICE — the refusal chip is the grey flat chip the index already
  // renders, so a row does not change shape when it changes what it says.
  const one = chip(DEEP, DEEP_FIX.no_side.key);
  ok(/class="pdxst-pat w-flat/.test(one), "a refusal chip keeps the flat weight it always had");
  ok(/🏛 Record/.test(one), "…and the lane marker, so it is never read as a stated position");
  ok(/ title="[^"]/.test(one), "…and carries the full sentence in its title");

  // A ROW WITH NOTHING FORMAL ON FILE STILL PRINTS NOTHING. Silence over an empty
  // file is the honest state; a grey chip explaining an absence would be a claim
  // about a record that is not there.
  const empty = (LIVE.PDXConsistency.issueRows(DEEP) || [])
    .find((r) => !((r.evidence && r.evidence.actions) || 0));
  if (empty) eq(LIVE.PDXConsistency.recordPattern.html(empty), "",
    "a row with no formal items on file prints no chip at all");

  // NOWHERE ON EITHER MEMBER, on any row, in any state.
  [DEEP, SHALLOW].forEach((pid) => {
    (LIVE.PDXConsistency.issueRows(pid) || []).forEach((r) => {
      lacks(LIVE.PDXConsistency.recordPattern.html(r), "no clear pattern",
        `${pid}/${r.key}: the row chip still prints the blanket sentence`);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5c · the index carries a REASON, and it is copy rather than a gate");
// ═════════════════════════════════════════════════════════════════════════════
// `suppressed` decides things — it is what mutes a chip and what marks a partial
// read. It could not also carry the reason, because the two branches that refuse
// WITHOUT gating (one judged item; two or three that ran both ways) have to stay
// ungated so the thin read above them can still speak. So `reason` is a second,
// inert field: always set on a refusal, read by nothing that decides anything.
{
  const idxOf = (pid, key) => {
    const recs = (LIVE.PDXVotingRecord.memberRecords(pid) || [])
      .filter((v) => (v.issues || []).some((m) => m.issueKey === key));
    const held = (LIVE._pdxRecordMappedCounts(pid) || {}).votes || 0;
    return LIVE._recordDirectionIndex(key, recs, { memberRecordCount: held });
  };

  const single = idxOf(DEEP, DEEP_FIX.one_for.key);
  eq(single.reason, "single_item", "one judged item names itself as one item");
  eq(single.suppressed, null, "…and sets no gate, so the thin read above it still speaks");

  const mixed = idxOf(DEEP, DEEP_FIX.mixed_thin.key);
  eq(mixed.reason, "mixed_thin", "1–1 above the floor says it ran both ways");
  eq(mixed.suppressed, null, "…and gates nothing either");

  const proc = idxOf(DEEP, DEEP_FIX.proc_only.key);
  eq(proc.reason, "procedural_only", "a row of nothing but floor machinery says so");
  eq(proc.procedural, proc.judged, "…and the tally that decided it is on the index");
  eq(proc.judged, 2, "…over both of its judged acts");

  const none = idxOf(DEEP, DEEP_FIX.no_side.key);
  eq(none.reason, "no_side_taken", "items that all resolved to neither side say that");
  eq(none.judged, 0, "…with nothing judged behind it");

  const floor = idxOf(SHALLOW, SHALLOW_FIX.below1.key);
  eq(floor.reason, "coverage_floor", "below the floor, the reason is OUR coverage");
  eq(floor.suppressed, "coverage_floor", "…and that one IS a gate, unchanged");

  // A row with no mapped items at all: no vehicle, not a verdict about anyone.
  const bare = LIVE._recordDirectionIndex(SILENT[0], [], { memberRecordCount: 99 });
  eq(bare.reason, "no_vehicle", "nothing on file is named as nothing on file");

  // THE INERTNESS, STATED AS A TEST. The reason field must never be the thing that
  // decides whether a row reads — the fixtures that DO read carry no reason at all.
  eq(idxOf(DEEP, DEEP_FIX.clear5.key).reason, null, "a characterised read carries no refusal reason");
  eq(idxOf(DEEP, DEEP_FIX.uniform2.key).reason, null, "…nor does a uniform thin run");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · head to head — a coin flip may not outweigh a clear vote");
// ═════════════════════════════════════════════════════════════════════════════
{
  // One member, two reader issues: a clear 1–0 on P and a 3–3 coin flip on Q.
  const P = SILENT[0], Q = SILENT[1];
  const win = boot();
  win.PDXVotingRecord.noteMember(DEEP,
    run(1, P, "yea").concat(run(3, Q, "yea"), run(3, Q, "nay"), run(14, SILENT[9], "yea")));
  [P, Q].forEach((k) => win.alignSetIntensity(k, "support"));
  const bd = win._calcAlignmentBreakdown(DEEP, { mode: "record" });
  must(bd, "the head-to-head member scores nothing");
  const rp = bd.issues.find((x) => x.key === P), rq = bd.issues.find((x) => x.key === Q);
  must(rp && rq, "the head-to-head basket lost one of its two issues");
  const share = (r) => r.weight / (rp.weight + rq.weight);
  ok(share(rq) < share(rp),
    `the 3–3 coin flip takes ${(share(rq) * 100).toFixed(1)}% of the weighted average against the clear 1–0's ${(share(rp) * 100).toFixed(1)}% — a record with no direction must never hold more of the number than one with a direction`);
  eq(rq.verdict, "partial", "…and the coin flip is still a partial, not a side");
  eq(rp.verdict, "match", "…and the clear vote is still a full match");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the mutations — each one must fail this file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const mutant = (mutate, probeFn) => {
    let win;
    try { win = stage({ mutate }); } catch (e) { return { threw: String(e && e.message) }; }
    return probeFn(win);
  };

  // M1 — write the inversion straight back into the table. This is the exact edit
  // that shipped once already, and the point of the mutation is that it is now
  // SURVIVABLE: the runtime lock clamps split down to thin on the read, so the
  // literal being wrong no longer makes the site wrong. A harness assertion alone
  // could not have said that — it would only have caught the edit in CI, months
  // after a reader saw the consequence.
  const G1 = "var _ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.45, thin: 0.5 };";
  const G1BAD = "var _ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.6, thin: 0.5 };";
  must(R("alignment-tool.js").indexOf(G1) > 0,
    "the confidence table has moved — M1 can no longer be applied");
  const m1 = mutant({
    "alignment-tool.js": (s) => s.replace(G1, G1BAD),
  }, (w) => {
    const bd = w._calcAlignmentBreakdown(DEEP, { mode: "record" });
    const rq = bd.issues.find((x) => x.key === DEEP_FIX.coin33.key);
    const rp = bd.issues.find((x) => x.key === DEEP_FIX.one_for.key);
    return { conf: w._PDX_ALIGN_PAT_CONF, heavier: rq.weight > rp.weight };
  });
  ok(m1.conf.split <= m1.conf.thin,
    `M1: the lock repairs an inverted literal at runtime — conf(split)=${m1.conf.split} was written above conf(thin)=${m1.conf.thin} and must not have survived`);
  eq(m1.conf.split, m1.conf.thin,
    "M1: …clamped DOWN to its neighbour's ceiling, never up — a low slot may not raise the tier above it");
  eq(m1.heavier, false,
    "M1: …and the coin flip still does not outweigh the clear vote, with the bad literal in the file");

  // M1b — the inversion AND the lock removed from the read. This is the control
  // for M1: it proves the clamp is what held the line above, not some other
  // accident of the table, by showing the original defect return the moment the
  // guard is taken off.
  const G1L = "var conf = _alignPatConfLock(_ALIGN_PAT_CONF)[x.tier];";
  const G1B = "    _alignPatConfLock(_ALIGN_PAT_CONF);\n";
  must(R("alignment-tool.js").indexOf(G1L) > 0,
    "the confidence lock has moved off the read — M1b can no longer be applied");
  must(R("alignment-tool.js").indexOf(G1B) > 0,
    "the confidence lock no longer runs at load — M1b can no longer be applied");
  const m1b = mutant({
    "alignment-tool.js": (s) => s.replace(G1, G1BAD)
      .replace(G1L, "var conf = _ALIGN_PAT_CONF[x.tier];")
      .replace(G1B, ""),
  }, (w) => {
    const bd = w._calcAlignmentBreakdown(DEEP, { mode: "record" });
    const rq = bd.issues.find((x) => x.key === DEEP_FIX.coin33.key);
    const rp = bd.issues.find((x) => x.key === DEEP_FIX.one_for.key);
    return { conf: w._PDX_ALIGN_PAT_CONF, heavier: rq.weight > rp.weight };
  });
  ok(m1b.conf.split > m1b.conf.thin, "M1b: without the lock the inversion is genuinely restored");
  eq(m1b.heavier, true,
    "M1b: …and the coin flip immediately outweighs the clear vote again — which is the defect the lock exists to make unreachable");

  // M2 — restore the one-item cap on the thin door.
  const G2 = "if (!idx || (idx.judged || 0) < 1) return null;";
  must(R("consistency.js").indexOf(G2) > 0,
    "the thin door's depth guard has moved — M2 can no longer be applied");
  const m2 = mutant({
    "consistency.js": (s) => s.replace(G2, "if (!idx || (idx.judged || 0) !== 1) return null;"),
  }, (w) => {
    const rows = w.PDXConsistency.formalPatternIndex.rows(SHALLOW) || [];
    const fr = rows.find((x) => x.key === SHALLOW_FIX.below2.key) || null;
    const bd = w._calcAlignmentBreakdown(SHALLOW, { mode: "record" });
    return { tier: fr ? fr.tier : null, label: fr ? fr.patLabel : "",
             scored: !!(bd && bd.issues.some((x) => x.key === SHALLOW_FIX.below2.key)) };
  });
  eq(m2.scored, false,
    "M2: capping the door at one item drops the 2–0 below the floor out of the match, which sections 3 and 4 catch");
  ok(m2.tier !== "thin", "M2: …and the row loses its side entirely");

  // M3 — let the door promote past thin, which would let it overrule the floors.
  const G3 = "if (!d || !d.directional || d.tier !== 'thin') return null;";
  must(R("consistency.js").indexOf(G3) > 0,
    "the thin door's no-promotion guard has moved — M3 can no longer be applied");
  const m3 = mutant({
    "consistency.js": (s) => s.replace(G3, "if (!d || !d.directional) return null;"),
  }, (w) => {
    const rows = w.PDXConsistency.formalPatternIndex.rows(SHALLOW) || [];
    return { tiers: rows.map((x) => x.tier) };
  });
  ok(Array.isArray(m3.tiers), "M3: the mutant booted");

  // M4 — let a split through the door, which would invent a side on a knife-edge.
  const G4 = "if ((idx.advances || 0) > 0 && (idx.opposes || 0) > 0) return null;";
  must(R("consistency.js").indexOf(G4) > 0,
    "the thin door's uniform guard has moved — M4 can no longer be applied");
  const m4 = mutant({
    "consistency.js": (s) => s.replace(G4, "if (false) return null;"),
  }, (w) => {
    w.PDXVotingRecord.noteMember(SHALLOW,
      run(2, SILENT[0], "yea").concat(run(1, SILENT[0], "nay")));
    w.alignSetIntensity(SILENT[0], "support");
    const bd = w._calcAlignmentBreakdown(SHALLOW, { mode: "record" });
    const r = bd ? bd.issues.find((x) => x.key === SILENT[0]) : null;
    return { verdict: r ? r.verdict : null };
  });
  ok(m4.verdict === null || m4.verdict === "partial",
    `M4: dropping the uniform guard must never hand a knife-edge a full verdict — got ${JSON.stringify(m4.verdict)}`);

  // M5 — take the refusal door back off the row chip, which is the exact state
  // the surface shipped in: the index had learned to read a thin side and name a
  // refusal, and the chip on every stance row had not.
  const G5 = "    if (t && t.tier === 'none') {\n      t = _stThinDirRead(r) || null;";
  must(R("consistency.js").indexOf(G5) > 0,
    "the row chip's refusal door has moved — M5 can no longer be applied");
  const m5 = mutant({
    "consistency.js": (s) => s.replace(G5, "    if (false) {\n      t = _stThinDirRead(r) || null;"),
  }, (w) => {
    const rows = w.PDXConsistency.issueRows(SHALLOW) || [];
    const one = rows.find((r) => r.key === SHALLOW_FIX.below1.key);
    const dead = rows.find((r) => r.key === DEEP_FIX.no_side.key);
    return {
      thin: one ? w.PDXConsistency.recordPattern.html(one) : "",
      refused: dead ? w.PDXConsistency.recordPattern.html(dead) : "",
    };
  });
  ok(/no clear pattern yet/i.test(m5.thin),
    "M5: without the door the below-floor row goes straight back to the blanket sentence, which 5b catches");

  // M6 — let the chip print the pattern engine's `none` label instead of asking
  // WHY. The side comes back on the rows that have one, so only the refusals
  // change: they all collapse to one sentence again.
  const G6 = "        return why ? _fpiUnreadHtml({ why: why }) : '';";
  must(R("consistency.js").indexOf(G6) > 0,
    "the row chip's reason branch has moved — M6 can no longer be applied");
  const m6 = mutant({
    "consistency.js": (s) => s.replace(G6, "        return why ? '' : '';"),
  }, (w) => {
    const rows = w.PDXConsistency.issueRows(DEEP) || [];
    const dead = rows.find((r) => r.key === DEEP_FIX.no_side.key);
    return { refused: dead ? w.PDXConsistency.recordPattern.html(dead) : null };
  });
  eq(m6.refused, "",
    "M6: dropping the reason branch blanks the chip over a real record, which 5b catches as a missing label");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ clarity before depth: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ clarity caps confidence, depth boosts only clear runs — ${passed} assertions passed`);
