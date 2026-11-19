#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-generators.mjs — run every generator's --check; optionally regenerate
// ─────────────────────────────────────────────────────────────────────────────
// The freshness job. It runs each generator in scripts/generators.mjs with
// --check and reports which ones are stale. With --fix it then re-runs each
// stale generator WITHOUT --check (its normal write mode) and checks the whole
// list again, looping until one pass comes back clean, because one
// generator's output can make the next one stale.
//
// It does not change what any generator does. It runs the same command a
// person would run by hand and reports which files changed.
//
//   node scripts/check-generators.mjs                 report only; exit 1 if any are stale
//   node scripts/check-generators.mjs --fix           regenerate until clean; exit 0 when converged
//   node scripts/check-generators.mjs --only a,b      just these scripts (names from the registry)
//   node scripts/check-generators.mjs --json out.json machine-readable report
//   node scripts/check-generators.mjs --summary out.md  markdown summary (the PR body)
//   node scripts/check-generators.mjs --fix --test    then run every scripts/test-*.mjs that names
//                                                     a changed file or a regenerated generator
//
// WHY --test. A stale generator is not always fixed by re-running it: when its
// inputs moved in a way its logic did not anticipate, the rewrite can be a
// regression (a rotation file losing the seat fields its own suite pins). The
// tests that read the rewritten files are what tell those apart, so the PR
// carries their result and its title says when one fails.
//
// Exit codes: 0 = everything current (or converged under --fix) · 1 = stale
// (report mode) · 2 = a generator errored (exit code other than 0/1), timed out,
// or --fix did not converge within MAX_PASSES.
//
// Run on a schedule by scripts/ci/generator-freshness.yml, which commits
// whatever --fix changed to a branch and opens a pull request.
// ─────────────────────────────────────────────────────────────────────────────
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATORS } from "./generators.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MAX_PASSES = 4;
const TIMEOUT_MS = 10 * 60_000;

// Runs one generator. `mode` is "check" or "write". Injected in tests.
export function runScript(script, mode, { root = ROOT } = {}) {
  const args = [join(root, "scripts", script), ...(mode === "check" ? ["--check"] : [])];
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return { code: r.error ? null : r.status, error: r.error ? String(r.error.message || r.error) : null, tail: out.trim().split("\n").slice(-12).join("\n") };
}

// The paths git sees as changed or new (relative to the repo root).
export function changedFiles({ root = ROOT } = {}) {
  const r = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return null;
  return r.stdout.split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop()).sort();
}

// The URLs the service worker precaches (sw.js SHELL_ASSETS), as repo paths.
export function precachedPaths({ root = ROOT } = {}) {
  const p = join(root, "sw.js");
  if (!existsSync(p)) return new Set();
  const src = readFileSync(p, "utf8");
  const m = /const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(src);
  if (!m) return new Set();
  const out = new Set();
  for (const line of m[1].split("\n")) {
    const code = line.replace(/\/\/.*$/, "");
    for (const s of code.matchAll(/'([^']+)'|"([^"]+)"/g)) {
      const u = (s[1] || s[2]).replace(/^\//, "").split("?")[0];
      out.add(u === "" ? "index.html" : u);
    }
  }
  return out;
}

// The test files that read a changed file or name a regenerated generator.
export function relatedTests({ changed = [], regenerated = [], root = ROOT, list = null } = {}) {
  const dir = join(root, "scripts");
  const files = list || readdirSync(dir).filter((f) => /^test-.*\.mjs$/.test(f)).sort();
  const needles = [...new Set([...changed.map((f) => f.split("/").pop()), ...regenerated])].filter(Boolean);
  if (!needles.length) return [];
  return files.filter((f) => { const src = readFileSync(join(dir, f), "utf8"); return needles.some((n) => src.includes(n)); });
}
export function runTests(tests, { root = ROOT, log = console.log } = {}) {
  const out = [];
  for (const t of tests) {
    const r = spawnSync(process.execPath, [join(root, "scripts", t)], { cwd: root, encoding: "utf8", timeout: 15 * 60_000, maxBuffer: 256 * 1024 * 1024 });
    const tail = `${r.stdout || ""}${r.stderr || ""}`.trim().split("\n").filter((l) => /✗|FAIL|Error/.test(l)).slice(0, 6).join("\n");
    out.push({ test: t, ok: r.status === 0, code: r.status, tail });
    log(`  ${r.status === 0 ? "pass" : "FAIL"}     ${t}`);
  }
  return out;
}

// The loop. Pure over `run` (script, mode) → { code, error, tail }.
export function freshness({ generators = GENERATORS, fix = false, run = runScript, log = console.log } = {}) {
  const report = { fix, passes: [], stale: [], regenerated: [], errors: [], converged: true };
  const staleFirst = new Set();
  for (let pass = 1; pass <= (fix ? MAX_PASSES : 1); pass++) {
    const thisPass = { pass, stale: [] };
    for (const g of generators) {
      const r = run(g.script, "check");
      if (r.code === 0) continue;
      if (r.code === 1) {
        thisPass.stale.push(g.script);
        if (pass === 1) staleFirst.add(g.script);
        log(`  stale    ${g.script}`);
        if (!fix) continue;
        const w = run(g.script, "write");
        if (w.code !== 0) { report.errors.push({ script: g.script, mode: "write", code: w.code, error: w.error, tail: w.tail }); log(`  ERROR    ${g.script} (write, exit ${w.code ?? w.error})`); continue; }
        if (!report.regenerated.includes(g.script)) report.regenerated.push(g.script);
        log(`  rewrote  ${g.script}`);
        continue;
      }
      report.errors.push({ script: g.script, mode: "check", code: r.code, error: r.error, tail: r.tail });
      log(`  ERROR    ${g.script} (check, exit ${r.code ?? r.error})`);
    }
    report.passes.push(thisPass);
    if (!thisPass.stale.length || !fix) break;
    if (pass === MAX_PASSES) report.converged = false;
  }
  report.stale = [...staleFirst];
  // Under --fix, converged means the LAST pass found nothing stale.
  if (fix) report.converged = report.converged && report.passes[report.passes.length - 1].stale.length === 0;
  return report;
}

export function summaryMarkdown(report, { changed = [], precached = new Set() } = {}) {
  const lines = [];
  lines.push("Automated generator freshness run (`node scripts/check-generators.mjs --fix`).", "");
  if (!report.stale.length && !report.errors.length) { lines.push("Every generator's `--check` passed. Nothing to regenerate."); return lines.join("\n") + "\n"; }
  if (report.stale.length) {
    lines.push("These generators reported stale output and were re-run in their normal write mode. Their logic was not changed:", "");
    for (const s of report.stale) lines.push(`- \`scripts/${s}\``);
    lines.push("");
  }
  if (changed.length) {
    lines.push(`Files changed (${changed.length}):`, "");
    for (const f of changed.slice(0, 200)) lines.push(`- \`${f}\``);
    if (changed.length > 200) lines.push(`- … and ${changed.length - 200} more`);
    lines.push("");
  }
  const pre = changed.filter((f) => precached.has(f));
  if (pre.length) {
    lines.push("**The service worker precaches some of these files**, so `CACHE_VERSION` in `sw.js` needs a bump (with its changelog note) before merging:", "");
    for (const f of pre) lines.push(`- \`${f}\``);
    lines.push("");
  }
  if (report.errors.length) {
    lines.push("**Errors** (these need a person to look at them; nothing was written for them):", "");
    for (const e of report.errors) lines.push(`- \`${e.script}\` (${e.mode}, exit ${e.code ?? e.error})\n\n  \`\`\`\n  ${String(e.tail || "").split("\n").join("\n  ")}\n  \`\`\``);
    lines.push("");
  }
  if (report.tests) {
    const bad = report.tests.filter((t) => !t.ok);
    lines.push(bad.length
      ? `**${bad.length} of ${report.tests.length} related test file(s) FAIL on the regenerated output.** The rewrite may be a regression (the inputs moved in a way the generator did not anticipate); review before merging:`
      : `All ${report.tests.length} related test file(s) pass on the regenerated output.`, "");
    for (const t of bad) lines.push(`- \`scripts/${t.test}\` (exit ${t.code})${t.tail ? `\n\n  \`\`\`\n  ${t.tail.split("\n").join("\n  ")}\n  \`\`\`` : ""}`);
    if (bad.length) lines.push("");
  }
  if (report.fix && !report.converged) lines.push(`**Did not converge** within ${MAX_PASSES} passes. Some generator keeps reporting stale after its own rewrite.`, "");
  return lines.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const fix = argv.includes("--fix");
  const only = arg("--only") ? new Set(arg("--only").split(",").map((s) => s.trim()).filter(Boolean)) : null;
  const generators = only ? GENERATORS.filter((g) => only.has(g.script) || only.has(g.script.replace(/\.mjs$/, ""))) : GENERATORS;
  if (only && generators.length !== only.size) { console.error(`unknown generator in --only: ${[...only].join(", ")}`); process.exit(2); }

  const before = new Set(changedFiles() || []);
  console.log(`check-generators: ${generators.length} generator(s)${fix ? ", --fix" : ""}`);
  const report = freshness({ generators, fix });
  const after = changedFiles();
  const changed = after ? after.filter((f) => !before.has(f)) : [];
  report.changed = changed;
  const precached = precachedPaths();
  report.precachedChanged = changed.filter((f) => precached.has(f));
  if (fix && argv.includes("--test") && (changed.length || report.regenerated.length)) {
    const tests = relatedTests({ changed, regenerated: report.regenerated });
    console.log(`check-generators: ${tests.length} related test file(s)`);
    report.tests = runTests(tests);
  }

  if (arg("--json")) writeFileSync(arg("--json"), JSON.stringify(report, null, 2) + "\n");
  if (arg("--summary")) writeFileSync(arg("--summary"), summaryMarkdown(report, { changed, precached }));

  if (report.errors.length || (fix && !report.converged)) {
    console.error(`✗ check-generators: ${report.errors.length} error(s)${fix && !report.converged ? ", did not converge" : ""}`);
    process.exit(2);
  }
  if (!fix && report.stale.length) {
    console.error(`✗ check-generators: ${report.stale.length} stale — run node scripts/check-generators.mjs --fix`);
    process.exit(1);
  }
  console.log(fix
    ? `✓ check-generators: ${report.regenerated.length} regenerated, ${changed.length} file(s) changed${report.precachedChanged.length ? `, ${report.precachedChanged.length} precached` : ""}`
    : "✓ check-generators: every generator is current");
}
