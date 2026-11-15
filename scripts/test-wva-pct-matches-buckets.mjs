#!/usr/bin/env node
/**
 * test-wva-pct-matches-buckets.mjs — the Direction Match % is the buckets' own sum
 * ─────────────────────────────────────────────────────────────────────────────
 * /p/trump printed "79% Direction Match · 36 issues tested" over 23 Backed up,
 * 2 Contradicted, 11 Mixed, 3 Not enough on file and 0 Record only. No sum of
 * those counts gave 79: the figure was a weighted mean of each issue's own
 * continuous score × tier weight × evidence depth, which a reader cannot redo.
 *
 * The figure is now:
 *
 *     pct = round(100 × (Backed up + ½ × Mixed) ÷ issues tested)
 *
 * where "issues tested" is the tested set — exactly the rows in the three result
 * buckets — and Not enough on file / Record only are outside it.
 *
 * WHAT THIS FILE PINS
 *   1. The formula itself, on the reported /p/trump counts (23/2/11 → 79).
 *   2. Every person whose read publishes a %, all-time AND current-term: the
 *      printed % equals the formula over the same buckets the section paints,
 *      and the tested caption equals the buckets' sum.
 *   3. The painted surfaces: the section's big number and the current-term strip
 *      print that %, and the strip prints the slice's own counts beside it.
 *   4. Issue verdicts did not move: the buckets and counts are the shipped ones.
 *   5. The method copy says how the number is worked out.
 *
 *   node scripts/test-wva-pct-matches-buckets.mjs
 *
 * Real shipped modules in a node:vm sandbox over the offline record corpus.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js",
];
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
win.PROFILES = win.CMP_DATA;
const corpus = buildCorpus(ROOT);
for (const [pid, recs] of corpus.byMember) {
  try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
}
const WA = win.PDXWordAction;
if (!WA || typeof WA.read !== "function" || typeof WA.directionPct !== "function") {
  console.error("PDXWordAction.read / directionPct missing — every assertion here would be vacuous");
  process.exit(1);
}
const P = (pid) => win.CMP_DATA[pid];
// The formula, written out here independently of the module's copy of it.
const expected = (b, c, m) => (b + c + m ? Math.round((100 * (b + m / 2)) / (b + c + m)) : null);
const len = (bk, k) => (bk && bk.buckets && bk.buckets[k] ? bk.buckets[k].length : 0);

// ═════════════════════════════════════════════════════════════════════════════
section("1. the formula, on the reported /p/trump counts");
{
  eq(WA.directionPct({ consistent: 23, contradicts: 2, mixed: 11 }, 36), 79, "23 backed · 2 contradicted · 11 mixed over 36 tested → 79%");
  eq(expected(23, 2, 11), 79, "…which a reader gets as (23 + 11/2) / 36");
  eq(WA.directionPct({ consistent: 3, contradicts: 0, mixed: 0 }, 3), 100, "all backed → 100");
  eq(WA.directionPct({ consistent: 0, contradicts: 3, mixed: 0 }, 3), 0, "all contradicted → 0");
  eq(WA.directionPct({ consistent: 0, contradicts: 0, mixed: 4 }, 4), 50, "all mixed → 50");
  eq(WA.directionPct({ consistent: 0, contradicts: 0, mixed: 0 }, 0), null, "nothing tested → no number");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2. every published %, all-time and current-term, equals the formula over its buckets");
{
  let pub = 0, cur = 0;
  const bad = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    let sr;
    try { sr = WA.scopedRead(pid, P(pid)); } catch { continue; }
    const r = sr && sr.main;
    if (r && typeof r.pct === "number") {
      pub++;
      // The buckets the section paints (all-time, the page's default scope).
      const bk = WA.outcomeBuckets(pid, P(pid));
      const B = len(bk, "consistent"), C = len(bk, "contradicts"), M = len(bk, "mixed");
      if (B + C + M !== r.coverage.tested) bad.push(`${pid}: buckets sum ${B + C + M} ≠ ${r.coverage.tested} tested`);
      if (expected(B, C, M) !== r.pct) bad.push(`${pid}: ${r.pct}% printed, buckets ${B}/${C}/${M} give ${expected(B, C, M)}%`);
      if (r.counts.consistent !== B || r.counts.contradicts !== C || r.counts.mixed !== M) bad.push(`${pid}: read counts ≠ buckets`);
    }
    const c = sr && sr.current;
    if (c && typeof c.pct === "number") {
      cur++;
      const k = c.counts;
      if (k.consistent + k.contradicts + k.mixed !== c.coverage.tested) bad.push(`${pid} (current term): counts ≠ tested`);
      if (expected(k.consistent, k.contradicts, k.mixed) !== c.pct) bad.push(`${pid} (current term): ${c.pct}% ≠ formula`);
    }
  }
  ok(pub > 100, `enough published figures to sweep (${pub})`);
  ok(cur >= 1, `at least one current-term slice to check (${cur})`);
  ok(bad.length === 0, `every figure is its own buckets' sum:\n      ${bad.slice(0, 10).join("\n      ")}`);
  console.log(`      ${pub} all-time figures, ${cur} current-term slices`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3. the painted surfaces print that number, and the slice prints its counts");
{
  const pid = "trump";
  const sr = WA.scopedRead(pid, P(pid));
  ok(sr && typeof sr.main.pct === "number", "trump publishes an all-time figure in the offline corpus");
  const html = WA.sectionHtml(pid, P(pid)) || "";
  ok(html.includes(`${sr.main.pct}%`), `the section prints the all-time ${sr.main.pct}%`);
  if (sr.current && typeof sr.current.pct === "number") {
    const k = sr.current.counts;
    const want = `${k.consistent} backed up, ${k.contradicts} contradicted, ${k.mixed} mixed`;
    ok(html.includes(want), `the current-term strip prints its own counts ("${want}")`);
    eq(sr.current.pct, expected(k.consistent, k.contradicts, k.mixed), "…and its % is their sum");
    ok(html.includes(`${sr.current.pct}%`), "…and that %");
  } else ok(true, "no current-term slice painted for trump here");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4. issue verdicts were not touched");
{
  const SRC = R("word-action.js");
  ok(/var TOKEN_SCORE = \{ consistent: 100, contradicts: 0, mixed: 50 \};/.test(SRC), "row scores unchanged");
  ok(/outcomeToken = _mixedGate\(consW, contraW,/.test(SRC), "the overall verdict word still goes through the shared Mixed gate on weight");
  ok(/tested\.length >= MIN_TESTED_ITEMS && wN >= MIN_TESTED_WEIGHT/.test(SRC), "both publishing floors unchanged");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5. the method copy says how it is worked out");
{
  const SRC = R("word-action.js");
  ok(/issues Backed up count in full, Mixed count half/.test(SRC), "method line states the formula");
  ok(!/weighted share of tested word/.test(SRC), "the old 'weighted share' sentence is gone");
}

console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
