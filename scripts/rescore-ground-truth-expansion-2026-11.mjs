#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-ground-truth-expansion-2026-11.mjs — offline diagnostic
//
// Scores each record in db/stance-ground-truth-expansion-2026-11.json with the
// current stance scorer and records whether the scorer agrees with the human
// label. Same input and read as the earlier re-score reports and the
// person-file table (scripts/gen-person-directional-keys.mjs): the reviewer's
// verbatim excerpts (fragments split on " ... " become paragraphs), one read
// per source (typed as the source is typed) and one pooled, record-level read
// (typed "statement"). The pooled read is the one shown on the person page.
//
// Read-only: no ground-truth label, scoring rule, issue key or site file is
// touched. A disagreement is recorded as it is; nothing is tuned to remove it.
// Report → db/rescore-ground-truth-expansion-2026-11.json.
//   node scripts/rescore-ground-truth-expansion-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = path.join(root, "db/stance-ground-truth-expansion-2026-11.json");
const OUT = path.join(root, "db/rescore-ground-truth-expansion-2026-11.json");
const FETCHED_AT = "2026-11-12T00:00:00.000Z";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, "").replace(/,$/, "."))}</p>`).join("\n");
const statements = (c) => c.sources[0].statements.filter((s) => s.kind === "clear" || s.kind === "implication").map((s) => `${s.side} (${s.kind}): ${s.text}`);
const verdict = (c) => (c.positionMatch ? (c.confidenceWithin ? "agrees" : "agrees on position, confidence outside tolerance") : "disagrees");

export function buildReport(file) {
  const rows = file.records.map((gt) => {
    const raw = (body, source_type, url) => ({ url, fetched_at: FETCHED_AT, source_type, politician_id: gt.politician_id, topic: gt.topic, body });
    const per_source = gt.sources.map((s) => {
      const c = S.scoreRawRecord(raw(toBody(s.excerpt), s.type, s.link), gt.topic);
      return { type: s.type, date: s.date, link: s.link, position: c.position, confidence: c.confidence, reason: c.confidence_reason, statements: statements(c) };
    });
    const pooled = S.scoreRawRecord(raw(gt.sources.map((s) => toBody(s.excerpt)).join("\n"), "statement", gt.sources[0].link), gt.topic);
    const cmp = S.compareToGroundTruth(pooled, gt);
    return {
      stance_id: gt.stance_id, politician_id: gt.politician_id, topic: gt.topic,
      human: { position: gt.position, confidence: gt.confidence },
      scorer: { position: pooled.position, confidence: pooled.confidence, reason: pooled.confidence_reason, statements: statements(pooled) },
      verdict: verdict(cmp),
      scorer_agrees: cmp.positionMatch,
      note: cmp.note,
      per_source,
    };
  });
  return {
    _note: "Offline score of the expansion ground-truth records with the current stance scorer, compared with each human label. Diagnostic only: no ground-truth label, rule or site file changes, and a disagreement is left as it is.",
    rules_version: S.RULES_VERSION,
    vocab_version: S.DIRECTIONAL_VOCAB_VERSION,
    confidence_tolerance: S.CONFIDENCE_TOLERANCE,
    summary: {
      records: rows.length,
      scorer_agrees_on_position: rows.filter((r) => r.scorer_agrees).length,
      verdicts: Object.fromEntries(rows.map((r) => [r.stance_id, `${r.human.position} → ${r.scorer.position} (${r.verdict})`])),
    },
    records: rows,
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
