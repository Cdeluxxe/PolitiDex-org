#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-mapping-weights-inert.mjs — curated mapping weights carry no signal
// ─────────────────────────────────────────────────────────────────────────────
// A curated measure→issue mapping (vr_measure_issues) says THAT a bill touches an
// issue and WHICH WAY a yea cuts on it. It carries no strength. This file pins:
//
//   1. WEIGHT IS INERT. The same record with every mapping weight rewritten (1, 35,
//      100, 999, missing) produces byte-identical say-vs-do summaries, record-
//      direction indexes, receipt-card candidates/audits and Alignment Tool votes.
//   2. THE PRIMARY FLAG IS A LABEL. Toggling `isPrimary` on every mapping moves no
//      score, verdict, index or card.
//   3. BOTH SIDES OF ONE KEY IS NO SIGNAL. A bill mapped yea_supports AND
//      yea_opposes on the same key (the S. 5653 shape) contributes nothing to that
//      key's scores, in either row order, and a record with it added scores
//      exactly like the record without it.
//   4. NOTHING IN THE SCORING PATH READS `.weight`. Structural check over the
//      engine functions that score or promote.
//   5. THE CURATED DATA IS UNTOUCHED. The S. 5653 seed rows keep their weight,
//      primary flag and rationale text; no applied migration was edited.
//
//   node scripts/test-mapping-weights-inert.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "receipt-cards.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  return win;
}
const win = boot();

// A stable fingerprint of an engine result: item references become their ids so a
// rewritten weight on the item itself cannot make two equal results look different.
const fp = (v) => JSON.stringify(v, (k, x) => {
  if (x && typeof x === "object" && Array.isArray(x.issues) && (x.kind === "vote" || x.kind === "position")) {
    return `item:${x.measureId}:${x.rollcallId || ""}:${x.position || ""}`;
  }
  return x;
});

// ── Fixture: a mixed record on two keys ─────────────────────────────────────
const K = "border_security", K2 = "national_debt";
const vote = (measureId, position, issues, extra) => ({
  kind: "vote", measureId, rollcallId: measureId * 10, number: `H.R. ${measureId}`, title: `Measure ${measureId}`,
  position, isProcedural: false, advanceInverted: false, chamber: "house",
  date: `2025-0${(measureId % 9) + 1}-15T00:00:00.000Z`,
  source: { url: `https://clerk.house.gov/Votes/2025${measureId}`, label: "Clerk" },
  issues, ...(extra || {}),
});
const map = (issueKey, supportMeaning, weight, isPrimary) => {
  const m = { issueKey, supportMeaning, rationale: `Fixture rationale for ${issueKey}.` };
  if (weight !== undefined) m.weight = weight;
  if (isPrimary !== undefined) m.isPrimary = isPrimary;
  return m;
};
function baseRecords(w, prim) {
  // w(i) → the weight for mapping i; prim(i) → isPrimary for mapping i.
  let i = 0;
  const M = (key, sm) => { const n = i++; return map(key, sm, w(n), prim(n)); };
  return [
    vote(101, "yea", [M(K, "yea_supports"), M(K2, "yea_opposes")]),
    vote(102, "yea", [M(K, "yea_supports")]),
    vote(103, "nay", [M(K, "yea_supports"), M(K2, "yea_supports")]),
    vote(104, "yea", [M(K, "yea_opposes")]),
    vote(105, "yea", [M(K, "yea_supports")], { isProcedural: true }),
    vote(106, "nay", [M(K2, "yea_supports")]),
    vote(107, "yea", [M(K, "yea_supports"), M(K2, "yea_opposes")]),
  ];
}
const WEIGHTINGS = {
  default100: () => 100,
  missing: () => undefined,
  allOne: () => 1,
  riderish: (n) => (n % 2 ? 35 : 100),
  inverted: (n) => (n % 2 ? 100 : 5),
  absurd: (n) => 999 - n * 97,
};
const PRIMARIES = {
  none: () => false,
  all: () => true,
  firstOnly: (n) => n === 0,
  alternate: (n) => n % 2 === 0,
};

// ── 1 + 2. Say-vs-do summary and record-direction index ──────────────────────
const summarise = (recs) => ["support", "oppose"].flatMap((st) =>
  [K, K2].map((key) => fp(win._issueRecordSummary(key, st, recs))));
const index = (recs) => [K, K2].map((key) =>
  fp(win._recordDirectionIndex(key, recs, { memberRecordCount: 50, label: key })));

const refRecs = baseRecords(WEIGHTINGS.default100, PRIMARIES.none);
const refSum = summarise(refRecs);
const refIdx = index(refRecs);
for (const [wn, w] of Object.entries(WEIGHTINGS)) {
  for (const [pn, p] of Object.entries(PRIMARIES)) {
    const recs = baseRecords(w, p);
    const s = summarise(recs), x = index(recs);
    for (let j = 0; j < s.length; j++) eq(s[j], refSum[j], `say-vs-do summary #${j} moved with weights=${wn}, primary=${pn}`);
    for (let j = 0; j < x.length; j++) eq(x[j], refIdx[j], `record-direction index #${j} moved with weights=${wn}, primary=${pn}`);
  }
}
// Sanity: the fixture is not trivially empty, so equality above means something.
{
  const s = win._issueRecordSummary(K, "support", refRecs);
  ok(s.consistent > 0 && s.contradicts > 0, "fixture should carry both directions on the key");
  // One unit per mapping, quarter for the procedural vote: 101,102,107 + 105×0.25
  eq(s.consistentScore, 325, "consistent score is a count of equal units, not curated mass");
  eq(s.contradictScore, 200, "contradict score is a count of equal units (103 nay, 104 yea_opposes)");
}

// ── 3. Both sides of one key → no movement on that key ──────────────────────
const both = (order, w) => vote(900, "yea", order === "sup-first"
  ? [map(K, "yea_supports", w ? 100 : undefined, false), map(K, "yea_opposes", w ? 10 : undefined, false), map(K2, "yea_supports", 100, false)]
  : [map(K, "yea_opposes", w ? 100 : undefined, false), map(K, "yea_supports", w ? 10 : undefined, false), map(K2, "yea_supports", 100, false)]);
for (const order of ["sup-first", "opp-first"]) {
  for (const withW of [true, false]) {
    for (const pos of ["yea", "nay"]) {
      const item = { ...both(order, withW), position: pos };
      for (const st of ["support", "oppose"]) {
        const alone = win._issueRecordSummary(K, st, [item]);
        eq(alone.consistentScore, 0, `both-sides ${order} ${pos} (${st}) gave a consistent score`);
        eq(alone.contradictScore, 0, `both-sides ${order} ${pos} (${st}) gave a contradict score`);
        eq(alone.consistent + alone.contradicts, 0, `both-sides ${order} ${pos} (${st}) was judged as a side`);
        eq(alone.noPosition, 1, `both-sides ${order} ${pos} (${st}) should be listed as no position`);
        const withIt = win._issueRecordSummary(K, st, refRecs.concat([item]));
        const without = win._issueRecordSummary(K, st, refRecs);
        eq(withIt.consistentScore, without.consistentScore, `both-sides ${order} ${pos} moved the consistent score`);
        eq(withIt.contradictScore, without.contradictScore, `both-sides ${order} ${pos} moved the contradict score`);
        eq(withIt.netVerdict, without.netVerdict, `both-sides ${order} ${pos} moved the verdict`);
      }
      const xi = win._recordDirectionIndex(K, refRecs.concat([item]), { memberRecordCount: 50 });
      const xo = win._recordDirectionIndex(K, refRecs, { memberRecordCount: 50 });
      eq(xi.advances, xo.advances, `both-sides ${order} ${pos} moved the index's advances`);
      eq(xi.opposes, xo.opposes, `both-sides ${order} ${pos} moved the index's opposes`);
      eq(xi.advanceScore, xo.advanceScore, `both-sides ${order} ${pos} moved advanceScore`);
      eq(xi.opposeScore, xo.opposeScore, `both-sides ${order} ${pos} moved opposeScore`);
      eq(xi.token, xo.token, `both-sides ${order} ${pos} moved the index token`);
      // The bill's OTHER key is still recorded normally: only the split key is neutral.
      const other = win._issueRecordSummary(K2, "support", [item]);
      eq(other.consistent + other.contradicts, 1, `both-sides ${order} ${pos}: the bill's single-sided key should still record the vote`);
    }
  }
}
eq(win._voteEffectiveSupport("yea", win._PDX_BOTH_SIDES), null, "a both-sides meaning gives no direction on a yea");
eq(win._voteEffectiveSupport("nay", win._PDX_BOTH_SIDES), null, "a both-sides meaning gives no direction on a nay");
eq(win._voteEffectiveSupport({ kind: "position", supports: true }, win._PDX_BOTH_SIDES), null,
  "a both-sides meaning gives no direction on a co-sponsorship");
{
  const single = vote(950, "yea", [map(K, "yea_supports", 100)]);
  eq(win._pdxIssueMapping(single, K), single.issues[0], "a single-sided mapping is returned as-is");
  const split = both("sup-first", true);
  const m = win._pdxIssueMapping(split, K);
  eq(m && m.bothSides, true, "a split key is flagged bothSides");
  eq(split.issues[0].supportMeaning, "yea_supports", "the lookup never mutates the stored mapping");
}

// ── 1 + 2 + 3 on the promotion path: receipt cards ──────────────────────────
// Pick a real member with directional stances, feed the receipt engine a record on
// two of their keys, and require identical candidates/cards under every weighting.
{
  let pid = null, keys = [];
  for (const id of Object.keys(win.CMP_DATA || {})) {
    const pm = win._polPositionMap(id, win.CMP_DATA[id]) || {};
    const ks = Object.keys(pm).filter((k) => pm[k] && (pm[k].stance === "support" || pm[k].stance === "oppose"));
    if (ks.length >= 2) { pid = id; keys = ks.slice(0, 2); break; }
  }
  ok(!!pid, "no member with two directional stances found for the receipt-card check");
  if (pid) {
    const [A, B] = keys;
    const recsFor = (w, p) => {
      let i = 0;
      const M = (key, sm) => { const n = i++; return map(key, sm, w(n), p(n)); };
      return [
        vote(201, "yea", [M(A, "yea_supports"), M(B, "yea_opposes")]),
        vote(202, "nay", [M(A, "yea_supports")]),
        vote(203, "yea", [M(A, "yea_supports"), M(B, "yea_supports")]),
        vote(204, "yea", [M(B, "yea_opposes")]),
        vote(205, "nay", [M(A, "yea_opposes"), M(B, "yea_supports")]),
        vote(206, "yea", [M(A, "yea_supports")]),
        vote(207, "yea", [M(B, "yea_supports")]),
      ];
    };
    let current = [];
    win.PDXVotingRecord = Object.assign(win.PDXVotingRecord || {}, { memberRecords: () => current });
    const RC = win.PDXReceiptCards;
    const run = () => {
      const out = [];
      for (const f of ["cardsFor", "audit", "recordDirectionCardsFor", "recordDirectionAudit", "recordDirectionCandidates"]) {
        if (typeof RC[f] !== "function") continue;
        let v; try { v = RC[f](pid); } catch (e) { v = `threw:${e && e.message}`; }
        out.push(`${f}=${fp(v)}`);
      }
      return out;
    };
    current = recsFor(WEIGHTINGS.default100, PRIMARIES.none);
    const ref = run();
    ok(ref.length >= 2, "receipt engine exposes no entry points to compare");
    for (const [wn, w] of Object.entries(WEIGHTINGS)) {
      for (const [pn, p] of Object.entries(PRIMARIES)) {
        current = recsFor(w, p);
        const got = run();
        for (let j = 0; j < ref.length; j++) eq(got[j], ref[j], `receipt ${ref[j].split("=")[0]} moved with weights=${wn}, primary=${pn}`);
      }
    }
  }
}

// ── 1 + 3 on the Alignment Tool vote adapter ────────────────────────────────
// It used to read only issues[0] — the first row in weight order. Load the real
// adapter in its own sandbox with a stubbed member record.
{
  const src = R("voting-record.js");
  const start = src.indexOf("  function _alignmentOfRecord(it) {");
  const end = src.indexOf("  window._alignmentVotesAdapter = function (pid) {");
  ok(start > 0 && end > start, "voting-record.js lost _alignmentOfRecord");
  if (start > 0 && end > start) {
    const ctx = vm.createContext({ window: win });
    vm.runInContext(`${src.slice(start, end)}; this.align = _alignmentOfRecord;`, ctx);
    const align = ctx.align;
    const shapes = [
      [map(K, "yea_supports"), map(K2, "yea_supports")],
      [map(K, "yea_supports"), map(K2, "yea_opposes")],
      [map(K, "yea_opposes")],
      [map(K, "yea_supports"), map(K, "yea_opposes")],
    ];
    const expectYea = ["kept", "partial", "broken", "partial"];
    shapes.forEach((issues, s) => {
      for (const [wn, w] of Object.entries(WEIGHTINGS)) {
        for (const order of [false, true]) {
          const iss = issues.map((m, n) => ({ ...m, weight: w(n), isPrimary: n === 0 }));
          const it = vote(300 + s, "yea", order ? iss.slice().reverse() : iss);
          eq(align(it), expectYea[s], `alignment shape ${s} weights=${wn} reversed=${order}`);
        }
      }
    });
  }
}

// ── 4. Structural: nothing in the scoring/promotion path reads `.weight` ────
function body(src, sig) {
  const i = src.indexOf(sig);
  if (i < 0) return null;
  let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(j, k + 1);
  }
  return null;
}
const SH = R("stance-helpers.js"), RCJ = R("receipt-cards.js");
const strip = (s) => s.replace(/\/\/[^\n]*/g, "");
for (const [file, src, sig] of [
  ["stance-helpers.js", SH, "function _findIssueMapping("],
  ["stance-helpers.js", SH, "function _voteEffectiveSupport("],
  ["stance-helpers.js", SH, "function _issueRecordSummary("],
  ["stance-helpers.js", SH, "function _recordDirectionIndex("],
  ["receipt-cards.js", RCJ, "function rdStrongest("],
  ["receipt-cards.js", RCJ, "function rdSide("],
]) {
  const b = body(src, sig);
  ok(!!b, `${file}: ${sig} not found`);
  if (b) {
    ok(!/\.weight\b/.test(strip(b)), `${file}: ${sig} still reads a mapping weight`);
    ok(!/\.isPrimary\b|is_primary/.test(strip(b)), `${file}: ${sig} reads the primary flag`);
  }
}
{
  const i = RCJ.indexOf("// Strongest first: decisiveness");
  const seg = i >= 0 ? strip(RCJ.slice(i, i + 1200)) : "";
  ok(i >= 0 && !/mapping\.weight|\.weight\b/.test(seg.slice(0, seg.indexOf("c.strength") + 80)),
    "receipt-cards.js: card strength still reads a mapping weight");
}

// ── 5. The curated data is untouched ────────────────────────────────────────
{
  const mig = R("netlify/database/migrations/20261214000000_vr_seed_baaja_s5653.sql");
  const rows = [...mig.matchAll(/\(m_s5653, '([a-z_]+)', (\d+), (true|false), '(yea_supports|yea_opposes)',/g)];
  ok(rows.length >= 10, "S. 5653 seed rows not found");
  ok(rows.every((r) => r[2] === "100"), "S. 5653 seed weights changed");
  const split = rows.filter((r) => r[1] === "tribal_consultation").map((r) => r[4]).sort();
  eq(JSON.stringify(split), JSON.stringify(["yea_opposes", "yea_supports"]), "S. 5653 tribal_consultation is still split one row per direction");
  ok(mig.includes("Split row: the sections that run with this key are in the yea_supports row above."),
    "S. 5653 rationale text changed");
  const schema = R("db/schema.ts");
  ok(/weight: integer\(\)\.notNull\(\)\.default\(100\)/.test(schema), "the weight column (kept, defaulted) changed shape");
  ok(/isPrimary: boolean\("is_primary"\)\.notNull\(\)\.default\(false\)/.test(schema), "the is_primary column changed shape");
  // When run inside a git checkout, no applied migration or seed may be modified.
  let diff = null;
  try {
    diff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "netlify/database/migrations", "db"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch { diff = null; }
  if (diff !== null) eq(diff.trim(), "", "a migration or curated data file was modified");
}

if (failures.length) {
  console.error(`✗ ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ mapping weights inert: ${passed} assertions passed`);
