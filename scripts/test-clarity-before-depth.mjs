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
    isProcedural: false, title: "Measure " + seq,
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

  // M1 — restore the confidence inversion: split back above thin.
  const G1 = "var _ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.45, thin: 0.5 };";
  must(R("alignment-tool.js").indexOf(G1) > 0,
    "the confidence table has moved — M1 can no longer be applied");
  const m1 = mutant({
    "alignment-tool.js": (s) => s.replace(G1,
      "var _ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.6, thin: 0.5 };"),
  }, (w) => {
    const bd = w._calcAlignmentBreakdown(DEEP, { mode: "record" });
    const rq = bd.issues.find((x) => x.key === DEEP_FIX.coin33.key);
    const rp = bd.issues.find((x) => x.key === DEEP_FIX.one_for.key);
    return { conf: w._PDX_ALIGN_PAT_CONF, heavier: rq.weight > rp.weight };
  });
  ok(m1.conf.split > m1.conf.thin, "M1: the inversion is genuinely restored");
  eq(m1.heavier, true,
    "M1: …and the coin flip immediately outweighs the clear vote, which section 1 and 6 both catch");

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
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ clarity before depth: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ clarity caps confidence, depth boosts only clear runs — ${passed} assertions passed`);
