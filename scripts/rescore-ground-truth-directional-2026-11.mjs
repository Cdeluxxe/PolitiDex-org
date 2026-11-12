#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-ground-truth-directional-2026-11.mjs — offline diagnostic
//
// Re-scores the three ground-truth records that were remapped onto directional
// keys (Massie × ukraine_aid, Massie × iran_hostilities, Sanders ×
// israel_military_aid) under the directional-key rules (stance-score-core.mjs,
// phase8-v3 + issue-vocab-v2-directional) and compares each read with the human
// label.
//
// INPUT. The scorer reads one page of text at a time. No raw ingest record
// exists for these sources, so each source is scored on the verbatim excerpt
// the reviewer recorded in the ground-truth file (fragments split on " ... "
// become separate paragraphs). That is the text the human label rests on, but
// it is not the full page. Two reads are recorded per record:
//   · per source — each excerpt as its own page, typed as the source is typed;
//   · pooled     — every excerpt of the record as one page (the scorer's
//                  record-level read). It is typed "statement" so every
//                  explicit line weighs the same; R8 does not apply to it.
// Roll-call excerpts ("Massie (R-KY): Nay") are vote records, not statements.
// The scorer reads the stated layer only, so they stay mentions by design.
//
// Read-only: the ground-truth file, scoring rules and issue keys are not
// touched. The report goes to db/rescore-ground-truth-directional-2026-11.json.
//
//   node scripts/rescore-ground-truth-directional-2026-11.mjs [--check]
// --check exits non-zero if the committed report differs from a fresh run.
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json");
const OUT = path.join(root, "db/rescore-ground-truth-directional-2026-11.json");
const FETCHED_AT = "2026-11-12T00:00:00.000Z"; // the reviewer's read date; keeps the report stable

export const REMAPPED = ["massie|ukraine_aid|gt-002", "massie|iran_hostilities|gt-005", "sanders|israel_military_aid|gt-006"];
// Extra keys read for a record (not compared: the human label is on the record's own key).
const ALSO = { "sanders|israel_military_aid|gt-006": ["israel_offensive_arms", "israel_defensive_systems"] };

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, "").replace(/,$/, "."))}</p>`).join("\n");

const brief = (c) => {
  const src = c.sources[0];
  return {
    position: c.position,
    confidence: c.confidence,
    confidence_reason: c.confidence_reason,
    note: src.note,
    statements: src.statements.map((s) => ({ kind: s.kind, side: s.side, weight: s.weight, text: s.text, ...(s.attributed_to ? { attributed_to: s.attributed_to } : {}) })),
    ...(c.stated_position ? { stated_position: true } : {}),
  };
};

export function buildReport(gtFile) {
  const records = gtFile.additional_records.filter((r) => REMAPPED.includes(r.stance_id));
  if (records.length !== REMAPPED.length) throw new Error("remapped ground-truth records not found");
  const rows = records.map((gt) => {
    const raw = (body, source_type, url) => ({ url, fetched_at: FETCHED_AT, source_type, politician_id: gt.politician_id, topic: gt.topic, body });
    const per_source = gt.sources.map((s) => {
      const c = S.scoreRawRecord(raw(toBody(s.excerpt), s.type, s.link), gt.topic);
      return { type: s.type, date: s.date, link: s.link, human_weight: s.weight, ...brief(c) };
    });
    const pooledRaw = raw(gt.sources.map((s) => toBody(s.excerpt)).join("\n"), "statement", gt.sources[0].link);
    const pooled = S.scoreRawRecord(pooledRaw, gt.topic);
    const cmp = S.compareToGroundTruth(pooled, gt);
    return {
      stance_id: gt.stance_id,
      politician_id: gt.politician_id,
      topic: gt.topic,
      previous_topic: gt.previous_topic,
      human: { position: gt.position, confidence: gt.confidence, position_on: gt.position_on },
      scorer: { position: pooled.position, confidence: pooled.confidence, confidence_reason: pooled.confidence_reason, note: pooled.sources[0].note },
      verdict: cmp.positionMatch ? (cmp.confidenceWithin ? "agrees" : "agrees on position, confidence outside tolerance") : "disagrees",
      confidence_delta: cmp.delta,
      comparison: cmp.note,
      per_source,
      ...(ALSO[gt.stance_id] ? { also_read: Object.fromEntries(ALSO[gt.stance_id].map((k) => [k, brief(S.scoreRawRecord({ ...pooledRaw, topic: k }, k))])) } : {}),
    };
  });
  return {
    _note: "Offline re-score of the three ground-truth records remapped onto directional keys, read from the reviewer's verbatim excerpts. Diagnostic only: nothing here changes a ground-truth record, a stance, a Locker item or a scoring rule. `scorer` is the pooled record-level read; `per_source` scores each excerpt on its own.",
    rules_version: S.RULES_VERSION,
    vocab_version: S.DIRECTIONAL_VOCAB_VERSION,
    confidence_tolerance: S.CONFIDENCE_TOLERANCE,
    input: "ground-truth source excerpts (db/stance-ground-truth-talarico-cost-of-living.json)",
    summary: {
      records: rows.length,
      agree: rows.filter((r) => r.verdict === "agrees").length,
      agree_position_only: rows.filter((r) => r.verdict.startsWith("agrees on position")).length,
      disagree: rows.filter((r) => r.verdict === "disagrees").length,
    },
    records: rows,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildReport(JSON.parse(fs.readFileSync(GT_PATH, "utf8")));
  const text = JSON.stringify(report, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, "utf8") === text;
    console.log(ok ? "report is current" : "report is stale");
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(OUT, text);
  for (const r of report.records) console.log(`${r.stance_id}: human ${r.human.position} ${r.human.confidence} · scorer ${r.scorer.position} ${r.scorer.confidence} → ${r.verdict}`);
}
