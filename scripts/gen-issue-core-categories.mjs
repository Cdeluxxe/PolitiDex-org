// ─────────────────────────────────────────────────────────────────────────────
// gen-issue-core-categories.mjs — the key → topic-category table for the server
// ─────────────────────────────────────────────────────────────────────────────
// A measure's on-axis / off-axis read is counted from its DOMINANT CATEGORY: the
// topic category (CORE_NATIONAL_ISSUES in issue-map.js) holding the most of the
// measure's mapped leaf issues. The browser counts it with _pdxMeasureAxis
// (stance-helpers.js); the Voting Record API needs the same table without booting
// a DOM bundle, so this step boots issue-map.js in a sandbox and writes each
// key's category to db/issue-core-categories.json. Keys outside every category
// are omitted — they count as a category of their own, on both sides.
//
// Run it whenever CORE_NATIONAL_ISSUES changes:  node scripts/gen-issue-core-categories.mjs
// Deterministic (sorted, no timestamp). scripts/test-primary-label-not-gate.mjs
// fails when the file is stale.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(ROOT, "db", "issue-core-categories.json");

export function buildTable() {
  const noop = () => {};
  const el = () => ({ style: {}, setAttribute: noop, appendChild: noop });
  const w = {
    document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], createElement: el, head: { appendChild: noop }, documentElement: {} },
    addEventListener: noop,
    localStorage: { getItem: () => null, setItem: noop },
  };
  w.window = w;
  vm.createContext(w);
  vm.runInContext(readFileSync(join(ROOT, "issue-map.js"), "utf8"), w, { filename: "issue-map.js" });
  const core = w.CORE_NATIONAL_ISSUES;
  if (!Array.isArray(core) || !core.length) throw new Error("issue-map.js did not publish CORE_NATIONAL_ISSUES");
  const categoryOf = {};
  for (const ci of core) for (const k of ci.keys) if (!(k in categoryOf)) categoryOf[k] = ci.key;
  const sorted = {};
  for (const k of Object.keys(categoryOf).sort()) sorted[k] = categoryOf[k];
  return {
    _generatedBy: "scripts/gen-issue-core-categories.mjs (from CORE_NATIONAL_ISSUES in issue-map.js)",
    count: Object.keys(sorted).length,
    categoryOf: sorted,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(OUT, JSON.stringify(buildTable(), null, 2) + "\n");
  console.log("wrote", OUT);
}
