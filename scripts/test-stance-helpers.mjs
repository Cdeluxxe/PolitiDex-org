#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the stance-vs-record ("say vs. do") engine in stance-helpers.js
// ─────────────────────────────────────────────────────────────────────────────
// stance-helpers.js ships a dependency-free, pure self-test (_stanceRecordSelfTest)
// covering supportMeaning direction, procedural inversion + down-weighting, the
// multi-issue omnibus breakdown, and the omnibus PROVENANCE helpers. It never runs
// itself. This harness loads the browser IIFE in a minimal DOM-less vm sandbox and
// runs it, so the engine can be gated from the command line:
//
//   node scripts/test-stance-helpers.mjs
//
// It then re-checks, from the outside, the two invariants the product's omnibus
// surfaces depend on: (1) one action yields OPPOSITE verdicts on two issues of the
// same bill, and (2) reading provenance changes no verdict, count, or score.
// No database, no network. Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Minimal sandbox: stance-helpers.js only needs `window` + a stub document ───
const noopEl = () => ({ style: {}, textContent: "", setAttribute() {}, appendChild() {} });
const ctx = {
  console,
  document: {
    readyState: "complete",
    head: noopEl(), documentElement: noopEl(),
    createElement: noopEl, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
  setTimeout, clearTimeout, JSON, Math, Date,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
const sandbox = vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, "stance-helpers.js"), "utf8"), sandbox, {
  filename: "stance-helpers.js",
});

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// ── 1. The engine's own self-test ─────────────────────────────────────────────
ok(typeof ctx.window._stanceRecordSelfTest === "function", "engine: self-test is exported");
const res = ctx.window._stanceRecordSelfTest();
for (const f of res.failures || []) failures.push("self-test: " + f);
passed += res.passed ? 1 : 0;
ok(res.failed === 0, `engine: self-test reported ${res.failed} failure(s)`);

// ── 2. Every primitive the omnibus surfaces call is exported ──────────────────
for (const fn of [
  "_voteEffectiveSupport", "_stanceVoteVerdict", "_issueRecordSummary", "_polRecordMap",
  "_measureComponentBreakdown", "_measureOmnibusContext", "_recordOmnibusStats",
]) {
  ok(typeof ctx.window[fn] === "function", `export: window.${fn} is a function`);
}

// ── 3. The product invariant, checked from outside the engine ─────────────────
// One real omnibus shape: H.R. 1 cut taxes (a yea ADVANCES lower_taxes) and cut
// Medicaid (the same yea OPPOSES healthcare access). A member who says they back
// both must read consistent on one and contradicting on the other — from ONE vote.
const HR1 = {
  kind: "vote", position: "yea", isProcedural: false, number: "H.R. 1",
  title: "One Big Beautiful Bill Act",
  issues: [
    { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
    { issueKey: "border_security", weight: 80, isPrimary: false, supportMeaning: "yea_supports" },
  ],
};
const SAYS_BOTH = { lower_taxes: { stance: "support" }, healthcare: { stance: "support" } };

const recMap = ctx.window._polRecordMap([HR1], SAYS_BOTH);
eq(recMap.lower_taxes.netVerdict, "consistent", "invariant: yea keeps the tax-cut promise");
eq(recMap.healthcare.netVerdict, "contradicts", "invariant: the SAME yea breaks the healthcare promise");

const brk = ctx.window._measureComponentBreakdown(HR1, SAYS_BOTH);
eq(brk.isOmnibus, true, "invariant: three-issue measure is omnibus");
eq(brk.count, 3, "invariant: all three components surfaced");
eq(brk.components.filter((c) => c.effect === "advances").length, 2, "invariant: two issues advanced");
eq(brk.components.filter((c) => c.effect === "opposes").length, 1, "invariant: one issue cut against");

// Provenance, as each surface reads it: from taxes, the same vote cut healthcare.
const fromTaxes = ctx.window._measureOmnibusContext(HR1, "lower_taxes", SAYS_BOTH);
eq(fromTaxes.count, 3, "provenance: count is the whole bill, not the slice");
eq(fromTaxes.thisIssue.issueKey, "lower_taxes", "provenance: displayed issue identified");
eq(fromTaxes.others.length, 2, "provenance: two sibling issues");
eq(fromTaxes.opposes.map((c) => c.issueKey).join(","), "healthcare", "provenance: healthcare listed as cut against");
eq(fromTaxes.advances.map((c) => c.issueKey).join(","), "border_security", "provenance: border listed as advanced");
eq(fromTaxes.splits, true, "provenance: opposite directions in one action → splits");
// A single-issue vote discloses nothing at all (ordinary votes stay unchanged).
eq(
  ctx.window._measureOmnibusContext(
    { kind: "vote", position: "yea", issues: [{ issueKey: "lower_taxes", supportMeaning: "yea_supports" }] },
    "lower_taxes", SAYS_BOTH),
  null, "provenance: single-issue vote → null (no disclosure)");

// ── 4. Provenance is presentation-only: it must not move a number ─────────────
const baseline = JSON.stringify(ctx.window._issueRecordSummary("healthcare", "support", [HR1]));
ctx.window._recordOmnibusStats("healthcare", [HR1]);
ctx.window._measureOmnibusContext(HR1, "healthcare", SAYS_BOTH);
eq(JSON.stringify(ctx.window._issueRecordSummary("healthcare", "support", [HR1])), baseline,
  "provenance: reading it leaves the issue summary byte-identical");

const stats = ctx.window._recordOmnibusStats("healthcare", [HR1]);
eq(stats.total, 1, "stats: one record touches healthcare");
eq(stats.omnibus, 1, "stats: it came from a multi-issue bill");
eq(stats.maxCount, 3, "stats: the bill touched three issues");
eq(stats.otherLabels.length, 2, "stats: two other issues disclosed");

// Neither helper may mutate its inputs — surfaces call them on live render data.
eq(HR1.issues.length, 3, "purity: input measure still has three mappings");
ok(!("verdict" in HR1.issues[0]), "purity: no verdict written back onto the mapping");
eq(Object.keys(SAYS_BOTH).length, 2, "purity: position map untouched");

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failed, ${passed} passed:\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ all ${passed} assertions passed (engine self-test: ${res.failed} failures)`);
