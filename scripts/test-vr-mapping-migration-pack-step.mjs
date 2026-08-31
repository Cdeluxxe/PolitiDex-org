#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-mapping-migration-pack-step.mjs — a promote may not ship without the
// pack-generation step
// ─────────────────────────────────────────────────────────────────────────────
// The offline pack's blob key and its URL both carry a fingerprint of
// vr_measure_issues (`mappingVersion()` in netlify/lib/vr-pack.ts), so a mapping
// write retires every pack built from the old mapping by making its key
// unreachable. Nothing has to be bumped by hand. That is the good news and it is
// also the failure mode: a step nobody performs is a step nobody notices has
// stopped working.
//
// Federal wave F4 is the case. It promoted H.R. 6644 | housing to PRIMARY with a
// one-boolean UPDATE. The row count did not move, no file said the word "pack",
// and the pack kept serving isPrimary: false for six hours — long enough for a
// reader to meet "Not about this issue" on a row the database said was a housing
// vote. The generation scheme fixes the mechanism. This file fixes the checklist:
//
//   EVERY MIGRATION THAT WRITES vr_measure_issues MUST DECLARE THE PACK STEP,
//   on one comment line, or CI fails:
//
//     -- pack-generation: derived — the fingerprint moves with these rows;
//     --   confirm with scripts/test-vr-pack-key-version.mjs after the wave lands.
//
//   or, for the rare wave that has to invalidate by hand instead:
//
//     -- pack-generation: purge — <what is purged from the vr-packs store, and why
//     --   the derived fingerprint was not enough>
//
// WHY A DECLARATION AND NOT A DERIVED CHECK. What CI can compute — does the
// fingerprint cover the columns the pack serves — is already computed, by
// test-vr-pack-key-version.mjs. What it cannot compute is whether the human who
// wrote a promote KNEW that a pack of every affected member is now retired and
// that the next read pays a rebuild. That is what the line asserts, and a line
// nobody can add absent-mindedly (it names one of two modes and, for `purge`,
// what is purged) is the cheapest instrument that asserts it.
//
// GRANDFATHERED BY DATE, NOT BY LIST. The 95 mapping migrations already applied
// to the branch predate the rule and are immutable — an applied migration may
// never be edited, so requiring the line inside them would be requiring an
// illegal edit. Anything timestamped at or after PACK_STEP_CUTOFF is subject. No
// exemption list exists, because an exemption list is a place to hide.
//
//   node scripts/test-vr-mapping-migration-pack-step.mjs
//
// Reads the migration directory and the runbook. No database, no network.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

// The day the rule ships. Everything before it is grandfathered (and immutable);
// everything from it on is subject. One constant, named in the runbook.
const PACK_STEP_CUTOFF = "20261022000000";

const MIG_DIR = "netlify/database/migrations";

// ── The rule, as three small functions ───────────────────────────────────────
// Comments are stripped before asking "does this WRITE the mapping table", so a
// migration that only talks about vr_measure_issues in its prose — a rationale, a
// reference to an earlier wave — is not dragged in. The marker is then looked for
// in the ORIGINAL text, because the marker is itself a comment.
const stripComments = (sql) =>
  String(sql)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

const WRITE_RE =
  /\b(?:insert\s+into|update|delete\s+from|truncate(?:\s+table)?|merge\s+into)\s+(?:only\s+)?(?:public\s*\.\s*)?"?vr_measure_issues"?/i;

export const writesMapping = (sql) => WRITE_RE.test(stripComments(sql));

// The declaration. One line, `-- pack-generation: <derived|purge>`, followed by
// the operator's own words. `purge` additionally has to name the store or the
// helper it purges through, so the word cannot be used as a synonym for "handled".
const MARKER_RE = /^[ \t]*--[ \t]*pack-generation:[ \t]*(derived|purge)\b(.*)$/im;

export const packStepOf = (sql) => {
  const m = MARKER_RE.exec(String(sql));
  if (!m) return { declared: false, mode: "", reason: "no `-- pack-generation:` line" };
  const mode = m[1].toLowerCase();
  if (mode === "purge" && !/vr-packs|deletePack/.test(String(sql))) {
    return {
      declared: false,
      mode,
      reason: "`purge` must name the vr-packs store or deletePack — what is being purged",
    };
  }
  return { declared: true, mode, reason: "" };
};

// Subject to the rule = writes the mapping table AND is timestamped at or after
// the cutoff.
export const isSubject = (file, sql) =>
  (file.match(/^(\d{14})_/) || [])[1] >= PACK_STEP_CUTOFF && writesMapping(sql);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every mapping migration from the cutoff on declares the pack step");
// ═════════════════════════════════════════════════════════════════════════════
const files = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
must(files.length > 100, `only ${files.length} migrations found — is ${MIG_DIR} the right path?`);

let mappingWrites = 0, subject = 0, declared = 0;
const missing = [];
const modes = { derived: 0, purge: 0 };
for (const f of files) {
  const sql = read(join(MIG_DIR, f));
  if (writesMapping(sql)) mappingWrites++;
  if (!isSubject(f, sql)) continue;
  subject++;
  const step = packStepOf(sql);
  if (step.declared) { declared++; modes[step.mode]++; }
  else missing.push(`${f}: ${step.reason}`);
}
eq(missing.length, 0,
  "a migration writes vr_measure_issues and does not declare the pack-generation step" +
  (missing.length ? ` — ${missing[0]}` : ""));
console.log(`      ${files.length} migrations · ${mappingWrites} write the mapping table · ` +
  `${subject} subject to the rule (from ${PACK_STEP_CUTOFF}) · ${declared} declared ` +
  `(${modes.derived} derived, ${modes.purge} purge)`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the rule has teeth — the F4 shape, with and without the line");
// ═════════════════════════════════════════════════════════════════════════════
// Synthetic bodies, because the only honest way to prove a gate rejects something
// is to hand it something it must reject. The promote below is F4's own shape: one
// UPDATE, one boolean, no new row.
const PROMOTE = `
-- Federal wave F9 — S. 1234 | housing: secondary → PRIMARY
UPDATE vr_measure_issues
   SET is_primary = true
 WHERE measure_id = 4242 AND issue_key = 'housing';
`;
const FUTURE = "20991231000000_vr_federal_wave_f9.sql";

ok(writesMapping(PROMOTE), "an is_primary UPDATE counts as a mapping write");
ok(isSubject(FUTURE, PROMOTE), "and a future-dated promote is subject to the rule");
eq(packStepOf(PROMOTE).declared, false,
  "a promote with no pack-generation line is REJECTED — this is the CI failure a wave sees");

const WITH_LINE = PROMOTE.replace(
  "-- Federal wave",
  "-- pack-generation: derived — one is_primary flip moves the fingerprint; every\n" +
  "--   affected member's pack retires and rebuilds on next read. Confirmed with\n" +
  "--   scripts/test-vr-pack-key-version.mjs.\n-- Federal wave"
);
const step = packStepOf(WITH_LINE);
ok(step.declared, "the same promote WITH the line passes");
eq(step.mode, "derived", "and is recorded as the derived mode");

eq(packStepOf(PROMOTE.replace("-- Federal", "-- pack-generation: purge — handled\n-- Federal")).declared,
  false, "`purge` that names nothing to purge is not a declaration");
ok(packStepOf(
  PROMOTE.replace("-- Federal",
    "-- pack-generation: purge — deletePack() swept for the 63 mapped members\n-- Federal")
).declared, "`purge` that names how it purges is");

section("   · and does not fire on what it must not fire on");
const PROSE_ONLY = `
-- This wave leaves vr_measure_issues alone; see the F4 note about is_primary.
INSERT INTO vr_measures (id, title) VALUES (1, 'x');
`;
ok(!writesMapping(PROSE_ONLY), "naming the mapping table in a comment is not writing it");
ok(!isSubject(FUTURE, PROSE_ONLY), "so a measures-only migration is not subject");
ok(!isSubject("20260921000000_vr_three_primary_lane_promotes.sql", PROMOTE),
  "and an already-applied promote is grandfathered — an applied migration may not be edited");

section("   · the detector recognises the mapping waves already in the tree");
// If WRITE_RE ever stops matching real SQL, section 1 goes quietly green over an
// empty set. This is the tripwire for that.
ok(mappingWrites > 80,
  `only ${mappingWrites} migrations detected as mapping writes — the detector has gone blind`);
for (const f of ["20261018000000_vr_federal_wave_f4.sql",
                 "20260921000000_vr_three_primary_lane_promotes.sql",
                 "20260920000000_vr_s2_border_security_primary_lane.sql"])
  ok(writesMapping(read(join(MIG_DIR, f))), `${f} is detected as a mapping write`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the checklist and the docs name the step");
// ═════════════════════════════════════════════════════════════════════════════
const RUNBOOK = read("db/vr-ingest-runbook.md");
has(RUNBOOK, "pack key must change", "the runbook still carries the sentence");
has(RUNBOOK, "-- pack-generation:", "…and shows the line a migration must carry");
has(RUNBOOK, "test-vr-mapping-migration-pack-step.mjs", "…and names this gate");
has(RUNBOOK, PACK_STEP_CUTOFF, "…and records the cutoff, so the grandfathering is not folklore");
has(RUNBOOK, "derived", "…and the derived mode");
has(RUNBOOK, "purge", "…and the purge mode");

// The gate is only a gate if the suite runs it.
const PKG = JSON.parse(read("package.json"));
has(PKG.scripts.test, "scripts/test-*.mjs",
  "npm test must glob scripts/test-*.mjs, or this file is a file nobody runs");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n  ✗ ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`    • ${f}`);
  console.error(`\n  ${passed} passed, ${failures.length} failed\n`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ vr-mapping-migration-pack-step: a promote declares what it does to the packs\n");
