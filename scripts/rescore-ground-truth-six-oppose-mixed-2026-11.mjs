#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-ground-truth-six-oppose-mixed-2026-11.mjs — offline diagnostic
//
// Scores each record in db/stance-ground-truth-six-oppose-mixed-2026-11.json
// (27 locked oppose / mixed records for Boebert, Owens, Cole, Thompson, Lee and
// Trump) with the current stance scorer. The read is exactly the expansion
// re-score report's (scripts/rescore-ground-truth-expansion-2026-11.mjs
// buildReport): the reviewer's verbatim excerpts, one read per source and one
// pooled record-level read, which is the one compared with the label.
//
// Read-only: no ground-truth label, scoring rule, issue key or site file is
// touched, and nothing is written to the stance store or the Evidence Locker.
// A disagreement is recorded as it is; nothing is tuned to remove it.
// Report → db/rescore-ground-truth-six-oppose-mixed-2026-11.json.
//   node scripts/rescore-ground-truth-six-oppose-mixed-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport as buildExpansionReport } from "./rescore-ground-truth-expansion-2026-11.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GT_PATH = path.join(root, "db/stance-ground-truth-six-oppose-mixed-2026-11.json");
export const OUT = path.join(root, "db/rescore-ground-truth-six-oppose-mixed-2026-11.json");

const ABSTAIN = "no clear position";
export const outcome = (r) => (r.scorer_agrees ? "match" : r.scorer.position === ABSTAIN ? "abstain" : "wrong");

export function buildReport(file) {
  const base = buildExpansionReport(file);
  const rows = base.records;
  const count = (list, o) => list.filter((r) => outcome(r) === o).length;
  const byLabel = {};
  for (const p of ["support", "oppose", "mixed"]) {
    const list = rows.filter((r) => r.human.position === p);
    if (list.length) byLabel[p] = { records: list.length, match: count(list, "match"), abstain: count(list, "abstain"), wrong: count(list, "wrong") };
  }
  const byPerson = {};
  for (const r of rows) {
    const b = (byPerson[r.politician_id] ||= { records: 0, match: 0, abstain: 0, wrong: 0 });
    b.records++; b[outcome(r)]++;
  }
  return {
    ...base,
    _note: "Offline score of the six-politician oppose / mixed ground-truth records with the current stance scorer, compared with each human label. Diagnostic only: no ground-truth label, rule or site file changes, and a disagreement is left as it is.",
    summary: {
      records: rows.length,
      scorer_agrees_on_position: count(rows, "match"),
      abstains: count(rows, "abstain"),
      wrong_position: count(rows, "wrong"),
      confidence_outside_tolerance: rows.filter((r) => r.scorer_agrees && r.verdict.includes("outside")).length,
      by_label: byLabel,
      by_politician: byPerson,
      verdicts: base.summary.verdicts,
    },
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
  console.log(JSON.stringify(JSON.parse(text).summary, null, 2));
}
