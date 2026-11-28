#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-oppose-ground-truth-2026-11.mjs — offline diagnostic
//
// Scores each record in db/oppose-ground-truth-2026-11.json (six hand-labeled
// oppose records: Jason Smith, DeLauro, Pallone, Wyden, Babin, Capito) with the
// current stance scorer. The read is exactly the expansion re-score report's
// (scripts/rescore-ground-truth-expansion-2026-11.mjs buildReport): the
// reviewer's verbatim excerpts, one read per source and one pooled
// record-level read, which is the one compared with the label.
//
// Every record whose pooled read is not "oppose", or whose confidence is
// outside tolerance, is listed under `oppose_misses` with the scorer's reason,
// and each source that did not read oppose is listed with it, so a later rules
// pass can see the pattern. Nothing is tuned to remove a miss.
//
// Read-only: no ground-truth label, scoring rule, issue key or site file is
// touched, and nothing is written to the stance store or the Evidence Locker.
// Report → db/rescore-oppose-ground-truth-2026-11.json.
//   node scripts/rescore-oppose-ground-truth-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport as buildExpansionReport } from "./rescore-ground-truth-expansion-2026-11.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GT_PATH = path.join(root, "db/oppose-ground-truth-2026-11.json");
export const OUT = path.join(root, "db/rescore-oppose-ground-truth-2026-11.json");

const ABSTAIN = "no clear position";
export const outcome = (r) => (r.scorer_agrees ? "match" : r.scorer.position === ABSTAIN ? "abstain" : "wrong");

export function buildReport(file) {
  const base = buildExpansionReport(file);
  const rows = base.records;
  const count = (o) => rows.filter((r) => outcome(r) === o).length;
  const misses = rows.filter((r) => r.scorer.position !== "oppose" || r.verdict.includes("outside")).map((r) => ({
    stance_id: r.stance_id,
    miss: r.scorer.position !== "oppose" ? `called ${r.scorer.position}` : "confidence outside tolerance",
    human_confidence: r.human.confidence,
    scorer_confidence: r.scorer.confidence,
    scorer_reason: r.scorer.reason,
    sources_not_read_as_oppose: r.per_source.filter((s) => s.position !== "oppose").map((s) => ({ link: s.link, position: s.position, reason: s.reason })),
  }));
  return {
    ...base,
    _note: "Offline score of the hand-labeled oppose ground-truth records with the current stance scorer, compared with each human label. Diagnostic only: no ground-truth label, rule or site file changes, and a miss is logged as it is for a later rules pass.",
    summary: {
      records: rows.length,
      scorer_calls_oppose: rows.filter((r) => r.scorer.position === "oppose").length,
      within_confidence_tolerance: rows.filter((r) => r.verdict === "agrees").length,
      abstains: count("abstain"),
      wrong_position: count("wrong"),
      verdicts: base.summary.verdicts,
    },
    oppose_misses: misses,
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
