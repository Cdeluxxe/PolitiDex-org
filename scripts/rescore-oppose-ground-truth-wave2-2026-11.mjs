#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-oppose-ground-truth-wave2-2026-11.mjs — offline diagnostic
//
// Scores the second batch of hand-labeled oppose records
// (db/oppose-ground-truth-wave2-2026-11.json: Murray, Schumer, Crapo, Arrington,
// Lieu, Raskin, Angie Craig, Debbie Dingell) with the current stance scorer.
// The read is exactly the first oppose batch's
// (scripts/rescore-oppose-ground-truth-2026-11.mjs buildReport): one read per
// source and one pooled record-level read, which is the one compared with the
// label. Every record whose pooled read is not oppose, or whose confidence is
// outside tolerance, is listed under `oppose_misses` with the scorer's reason,
// for a later rules pass. Labels only: nothing is tuned to remove a miss.
//
// Read-only: no ground-truth label, scoring rule, issue key or site file is
// touched, and nothing is written to the stance store or the Evidence Locker.
// Report → db/rescore-oppose-ground-truth-wave2-2026-11.json.
//   node scripts/rescore-oppose-ground-truth-wave2-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport as buildBatchOneReport } from "./rescore-oppose-ground-truth-2026-11.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GT_PATH = path.join(root, "db/oppose-ground-truth-wave2-2026-11.json");
export const OUT = path.join(root, "db/rescore-oppose-ground-truth-wave2-2026-11.json");

export function buildReport(file) {
  const base = buildBatchOneReport(file);
  return {
    ...base,
    _note: "Offline score of the second batch of hand-labeled oppose ground-truth records with the current stance scorer, compared with each human label. Diagnostic only: labels were added without changing any rule, and every miss is logged for a later rules pass.",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(buildReport(JSON.parse(fs.readFileSync(GT_PATH, "utf8"))), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, "utf8") === text;
    console.log(ok ? "report is current" : "report is stale");
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(OUT, text);
  const r = JSON.parse(text);
  console.log(JSON.stringify(r.summary, null, 2));
  for (const m of r.oppose_misses) console.log(`stance-score: OPPOSE MISS ${m.stance_id} — ${m.miss} (scorer ${m.scorer_confidence} vs label ${m.human_confidence}): ${m.scorer_reason}`);
}
