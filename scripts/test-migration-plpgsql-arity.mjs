#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Migration discipline — every RAISE in every migration compiles
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG CLASS THIS EXISTS TO PREVENT
//
// A RAISE whose format string carries fewer `%` placeholders than the arguments
// supplied after it. Postgres rejects it with
//
//   pq: too many parameters specified for RAISE (42601)
//
// and 42601 is a PARSE error, which is the whole problem. PL/pgSQL compiles a
// DO block in full before it executes a single statement of it, so one bad RAISE
// buried in a verification sentinel at the bottom aborts the entire block —
// including the hundreds of INSERTs above it that were perfectly good. The
// migration does not half-apply and get flagged; it does not apply at all, and
// the deploy fails on `options.onPostBuild` with a message that names the
// migration but not the line.
//
// It reached production once, in 20261011000000_vr_federal_wave_f2. The failing
// sentinel read:
//
//   IF n_hb_senate < 1 THEN
//     RAISE EXCEPTION '… no senate roll sits on a housing_build PRIMARY …', n_hb_senate;
//
// The prose had been written to state the count ("no senate roll sits"), so the
// `%` was edited out of the message while the argument stayed behind it. Every
// sibling guard in the same block interpolates its count and reads fine, which
// is exactly why nothing looked wrong on inspection: the defect is a mismatch
// between two parts of one statement, and each part is defensible alone.
//
// Nothing else in the repo catches this. The migrations are not parsed by any
// test — scripts/test-mapping-discipline.mjs reads them as text for INSERT
// tuples, and the per-wave harnesses assert on message SUBSTRINGS, which a
// broken RAISE satisfies happily. There is no local Postgres in the build image
// to compile against. So the check has to be static, and it has to be cheap
// enough to run over the whole archive on every suite.
//
// WHY THE COUNTING IS FUSSY
//
// The naive version of this test produces three false positives on applied
// migrations that have run successfully for months, all of the same shape:
//
//   RAISE NOTICE 'H.R. 29: status % (target passed_house), publicLaw % (target NULL)',
//     coalesce(st, '(absent)'), coalesce(pl, 'NULL');
//
// Two placeholders, two arguments — but four if you split the argument list on
// commas, because `coalesce(a, b)` contains one. A test that cries wolf on
// migrations that demonstrably compile is worse than no test, so the splitter
// here is paren-aware and quote-aware. Likewise `%%` is a literal percent sign
// and consumes no argument, and a `%` inside a `--` comment or a single-quoted
// literal that is not the format string is not a placeholder at all.
//
// This test asserts arity ONLY. It is not a PL/pgSQL parser and should not grow
// into one: the point is to hold the one line of the language that has already
// cost a deploy, over every file, forever.
//
//   node scripts/test-migration-plpgsql-arity.mjs
//
// Exit code is non-zero on any failure so it can gate CI.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG = join(ROOT, "netlify/database/migrations");

let passed = 0;
const failures = [];
const ok = (cond, msg) => {
  if (cond) passed++;
  else failures.push(msg);
  return cond;
};
// A fixture that stopped offering a case is a silent pass, so the shape of the
// corpus is itself asserted rather than assumed.
const must = (cond, msg) => {
  if (!cond) {
    console.error(`\n✗ migration RAISE arity: ${msg}\n`);
    process.exit(1);
  }
};

// ── the scanner ──────────────────────────────────────────────────────────────
// Walks a migration once, tracking whether it is inside a single-quoted literal
// (`''` is an escaped quote, not a terminator), a `--` line comment, or a
// `/* */` block comment. Returns every RAISE it finds with its format literal
// and its argument list already separated.

function scanRaises(src) {
  const found = [];
  let i = 0;
  const n = src.length;

  const atRaise = (k) => {
    if (src.startsWith("RAISE", k)) {
      // Word boundary in front, so `_RAISE` and `MYRAISE` do not qualify.
      const before = k === 0 ? " " : src[k - 1];
      return !/[A-Za-z0-9_]/.test(before);
    }
    return false;
  };

  while (i < n) {
    const c = src[i];
    if (c === "-" && src[i + 1] === "-") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const close = src.indexOf("*/", i + 2);
      i = close === -1 ? n : close + 2;
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n) {
        if (src[i] === "'") {
          if (src[i + 1] === "'") { i += 2; continue; }
          i++; break;
        }
        i++;
      }
      continue;
    }
    if (c === "$" && src[i + 1] === "$") { i += 2; continue; }

    if (atRaise(i)) {
      const start = i;
      const line = src.slice(0, start).split("\n").length;
      // level: EXCEPTION | NOTICE | WARNING | … , then the format literal.
      let j = i + 5;
      while (j < n && /\s/.test(src[j])) j++;
      let level = "";
      while (j < n && /[A-Za-z_]/.test(src[j])) level += src[j++];
      while (j < n && /\s/.test(src[j])) j++;

      if (src[j] !== "'") {
        // `RAISE;` (re-raise) and `RAISE EXCEPTION USING …` carry no format
        // literal and no positional arguments. Nothing to check.
        i = j;
        continue;
      }

      // Read the format literal, unescaping '' so a `%` after one is seen.
      j++;
      let lit = "";
      while (j < n) {
        if (src[j] === "'") {
          if (src[j + 1] === "'") { lit += "'"; j += 2; continue; }
          j++; break;
        }
        lit += src[j++];
      }

      // Read to the statement-terminating semicolon, respecting quotes and
      // parens, then split the tail into arguments.
      let tail = "";
      let depth = 0;
      let inq = false;
      while (j < n) {
        const d = src[j];
        if (d === "'") {
          if (inq && src[j + 1] === "'") { tail += "''"; j += 2; continue; }
          inq = !inq; tail += d; j++; continue;
        }
        if (!inq) {
          if (d === "(") depth++;
          else if (d === ")") depth--;
          else if (d === ";" && depth === 0) { j++; break; }
        }
        tail += d; j++;
      }

      found.push({ line, level, lit, args: splitArgs(tail) });
      i = j;
      continue;
    }
    i++;
  }
  return found;
}

// Top-level comma split: commas inside parens (coalesce, format, quote_ident,
// nested casts) and inside quotes do not separate arguments.
function splitArgs(tail) {
  const args = [];
  let cur = "";
  let depth = 0;
  let inq = false;
  for (let i = 0; i < tail.length; i++) {
    const c = tail[i];
    if (c === "'") {
      if (inq && tail[i + 1] === "'") { cur += "''"; i++; continue; }
      inq = !inq; cur += c; continue;
    }
    if (!inq) {
      if (c === "(") { depth++; cur += c; continue; }
      if (c === ")") { depth--; cur += c; continue; }
      if (c === "," && depth === 0) { args.push(cur); cur = ""; continue; }
    }
    cur += c;
  }
  if (cur.trim()) args.push(cur);
  return args.map((a) => a.trim()).filter(Boolean);
}

// `%%` is an escaped percent and consumes nothing. Count what is left.
const placeholders = (lit) => (lit.replace(/%%/g, "").match(/%/g) || []).length;

// ── the sweep ────────────────────────────────────────────────────────────────
const files = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
must(files.length >= 40, `only ${files.length} migrations found — the archive should be much larger`);

let totalRaises = 0;
let interpolating = 0;
const perFile = new Map();

for (const f of files) {
  const src = readFileSync(join(MIG, f), "utf8");
  const raises = scanRaises(src);
  perFile.set(f, raises.length);
  totalRaises += raises.length;

  for (const r of raises) {
    const ph = placeholders(r.lit);
    if (ph > 0) interpolating++;
    const where = `${f}:${r.line}`;
    const shown = r.lit.length > 90 ? `${r.lit.slice(0, 90)}…` : r.lit;

    ok(ph === r.args.length,
      `${where}: RAISE ${r.level} has ${ph} placeholder(s) but ${r.args.length} argument(s) `
      + `[${r.args.join(" | ")}] — Postgres rejects this at parse time with 42601 and the `
      + `whole DO block fails to compile. Message: "${shown}"`);
  }
}

// The corpus has to actually contain the shapes this test discriminates, or the
// paren-aware splitter and the %% rule are untested scaffolding.
must(totalRaises >= 200, `only ${totalRaises} RAISE statements scanned — the scanner is probably skipping files`);
must(interpolating >= 100, `only ${interpolating} RAISE statements interpolate a value — the arity check has little to bite on`);

// The migration that taught us this: its sentinel block must still interpolate
// every count it reports, including the housing_build one that regressed.
const F2 = "20261011000000_vr_federal_wave_f2.sql";
if (ok(files.includes(F2), `${F2} is missing from the archive`)) {
  const f2 = scanRaises(readFileSync(join(MIG, F2), "utf8"));
  const hb = f2.filter((r) => r.lit.includes("housing_build PRIMARY measure") && r.level === "EXCEPTION");
  must(hb.length === 1, `expected exactly 1 housing_build EXCEPTION sentinel in ${F2}, found ${hb.length}`);
  ok(placeholders(hb[0].lit) === 1 && hb[0].args.length === 1,
    `${F2}: the housing_build sentinel is the exact statement that broke the deploy — it must report its `
    + `count through a % placeholder, not drop the placeholder and leave the argument behind`);
  const sentinels = f2.filter((r) => r.args.length > 0);
  ok(sentinels.length >= 10,
    `${F2}: only ${sentinels.length} value-reporting RAISEs — the verification block should name every count it checks`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ migration RAISE arity: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ migration RAISE arity: all ${passed} assertions passed`);
console.log(`  ${totalRaises} RAISE statements across ${files.length} migrations · ${interpolating} interpolate a value`);
