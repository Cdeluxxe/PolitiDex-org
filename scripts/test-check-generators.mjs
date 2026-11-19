#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-check-generators.mjs — the scheduled freshness job
// ─────────────────────────────────────────────────────────────────────────────
// Pins scripts/check-generators.mjs and its registry (scripts/generators.mjs):
//   1. every registered generator exists and documents a --check mode
//   2. report mode runs --check only and never writes
//   3. --fix rewrites only the stale ones, then loops until a pass is clean
//   4. a generator that errors (exit ≠ 0/1) is reported, not rewritten
//   5. a generator that stays stale after its own rewrite → "did not converge"
//   6. the PR summary flags files the service worker precaches
//   7. the workflow runs --fix on a schedule and opens a PR (does not push main)
//
//   node scripts/test-check-generators.mjs   (no generator is actually run)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATORS } from "./generators.mjs";
import { freshness, summaryMarkdown, precachedPaths, relatedTests, MAX_PASSES } from "./check-generators.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const quiet = () => {};

// 1. registry
ok(GENERATORS.length >= 15, "registry lists the generators");
eq(new Set(GENERATORS.map((g) => g.script)).size, GENERATORS.length, "no generator listed twice");
for (const g of GENERATORS) {
  const p = join(ROOT, "scripts", g.script);
  ok(existsSync(p), `${g.script} exists`);
  ok(existsSync(p) && /--check/.test(readFileSync(p, "utf8")), `${g.script} has a --check mode`);
}
eq(GENERATORS[GENERATORS.length - 1].script, "gen-sitemap.mjs", "the sitemap runs last (it reads the others' output)");
ok(GENERATORS.findIndex((g) => g.script === "gen-district-boards.mjs") < GENERATORS.findIndex((g) => g.script === "gen-seat-holders.mjs"), "boards before seat holders");
// The share index feeds the stance-name table and the raw-ingest rotation builders.
{
  const at = (s) => GENERATORS.findIndex((g) => g.script === s);
  ok(at("gen-share-index.mjs") >= 0, "gen-share-index is registered");
  ok(at("gen-share-index.mjs") < at("gen-stance-person-names.mjs"), "share index before the stance-name table");
  for (const b of ["build-raw-ingest-official-cited-2026-11.mjs", "build-raw-ingest-direct-cited-2026-11.mjs", "build-raw-ingest-full-roster-2026-11.mjs"]) {
    ok(at("gen-share-index.mjs") < at(b), `share index before ${b}`);
  }
  // The member map stays by hand (its cross-check reads the network), and the registry says why.
  ok(at("vr-gen-member-map.mjs") === -1, "vr-gen-member-map is not registered");
  ok(/vr-gen-member-map\.mjs[\s\S]{0,400}network/.test(readFileSync(join(ROOT, "scripts/generators.mjs"), "utf8")), "the registry explains why vr-gen-member-map is left out");
}
// The workflow file is kept in scripts/ci/ until the owner copies it into .github/workflows/.
ok(existsSync(join(ROOT, "scripts/ci/generator-freshness.yml")), "the freshness workflow is committed under scripts/ci/");

// A fake world: `stale` holds scripts whose check fails until written.
function world(stale, { errors = {}, sticky = [] } = {}) {
  const calls = [];
  const s = new Set(stale);
  const run = (script, mode) => {
    calls.push(`${mode}:${script}`);
    if (errors[script] && errors[script] === mode) return { code: 2, tail: "boom" };
    if (mode === "check") return { code: s.has(script) ? 1 : 0 };
    if (!sticky.includes(script)) s.delete(script);
    // Writing a raises b (a downstream dependency).
    if (script === "a.mjs") s.add("b.mjs");
    return { code: 0 };
  };
  return { run, calls };
}
const gens = ["a.mjs", "b.mjs", "c.mjs"].map((script) => ({ script }));

// 2. report mode
{
  const w = world(["a.mjs", "c.mjs"]);
  const r = freshness({ generators: gens, fix: false, run: w.run, log: quiet });
  eq(r.stale, ["a.mjs", "c.mjs"], "report: stale list");
  ok(w.calls.every((c) => c.startsWith("check:")), "report mode never writes");
}
// 3. fix loop
{
  const w = world(["a.mjs"]);
  const r = freshness({ generators: gens, fix: true, run: w.run, log: quiet });
  eq(r.regenerated, ["a.mjs", "b.mjs"], "fix: a rewritten, then b (made stale by a) in the same or a later pass");
  ok(r.converged, "fix: converged");
  eq(r.passes[r.passes.length - 1].stale, [], "fix: the last pass is clean");
  ok(!w.calls.includes("write:c.mjs"), "fix: a current generator is never rewritten");
}
// 4. errors
{
  const w = world(["a.mjs"], { errors: { "c.mjs": "check" } });
  const r = freshness({ generators: gens, fix: true, run: w.run, log: quiet });
  eq(r.errors.map((e) => [e.script, e.mode, e.code]), [["c.mjs", "check", 2], ["c.mjs", "check", 2]].slice(0, r.passes.length), "an erroring check is reported each pass");
  ok(!w.calls.includes("write:c.mjs"), "an erroring generator is not rewritten");
}
// 5. non-convergence
{
  const w = world(["c.mjs"], { sticky: ["c.mjs"] });
  const r = freshness({ generators: gens, fix: true, run: w.run, log: quiet });
  ok(!r.converged, "a generator stale after its own rewrite → not converged");
  eq(r.passes.length, MAX_PASSES, "it stops after MAX_PASSES");
}
// 6. summary
{
  const pre = precachedPaths();
  ok(pre.has("index.html") && pre.size > 50, "sw.js SHELL_ASSETS read (index.html among them)");
  const anyPre = [...pre].find((f) => f.endsWith(".js"));
  const md = summaryMarkdown({ fix: true, stale: ["gen-x.mjs"], errors: [], converged: true }, { changed: ["db/x.json", anyPre], precached: pre });
  ok(md.includes("`scripts/gen-x.mjs`") && md.includes("`db/x.json`"), "summary lists stale generators and changed files");
  ok(/CACHE_VERSION/.test(md) && md.includes(`\`${anyPre}\``), "summary flags a precached file for a service-worker bump");
  ok(!/CACHE_VERSION/.test(summaryMarkdown({ fix: true, stale: ["gen-x.mjs"], errors: [], converged: true }, { changed: ["db/x.json"], precached: pre })), "no bump note when nothing precached changed");
}
// 6b. related tests
{
  const rel = relatedTests({ changed: ["db/raw-ingest-full-roster-2026-11.json"], regenerated: ["build-raw-ingest-full-roster-2026-11.mjs"] });
  ok(rel.includes("test-raw-ingest-board-holders.mjs"), "a test that reads a rewritten file is picked up");
  eq(relatedTests({ changed: [], regenerated: [] }), [], "nothing changed → no tests");
  const md = summaryMarkdown({ fix: true, stale: ["gen-x.mjs"], errors: [], converged: true, tests: [{ test: "test-a.mjs", ok: false, code: 1, tail: "✗ broke" }, { test: "test-b.mjs", ok: true, code: 0 }] }, { changed: ["db/x.json"], precached: new Set() });
  ok(/1 of 2 related test file\(s\) FAIL/.test(md) && md.includes("test-a.mjs"), "summary calls out failing related tests");
}
// 7. workflow
{
  const wf = readFileSync(join(ROOT, "scripts/ci/generator-freshness.yml"), "utf8");
  ok(/schedule:(?:\s*\n\s*#[^\n]*)*\s*\n\s*- cron: "[^"]+"/.test(wf), "workflow is scheduled");
  ok(/check-generators\.mjs --fix --test/.test(wf), "workflow runs --fix with the related tests");
  ok(/related tests FAIL/.test(wf), "a failing related test is put in the PR title");
  ok(/gh pr create/.test(wf) && /--base main/.test(wf), "workflow opens a PR against main");
  ok(!/git push[^\n]*\bmain\b/.test(wf), "workflow never pushes to main directly");
  ok(/gen-roster-official\.mjs --check/.test(wf), "workflow reports roster drift (report only)");
}

if (failures.length) { console.error(`✗ ${failures.length} failure(s):\n  ${failures.join("\n  ")}`); process.exit(1); }
console.log(`✓ test-check-generators: ${passed} checks passed`);
