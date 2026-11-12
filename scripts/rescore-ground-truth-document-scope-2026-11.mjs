#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-ground-truth-document-scope-2026-11.mjs — offline diagnostic
//
// Re-scores all six ground-truth records twice — under the old PARAGRAPH span
// scope and under the DOCUMENT scope (a speech, interview, press release,
// statement or bill text is one scope; stance-score-core.mjs spanScopeFor) —
// and compares each read with the human label. Same input as
// rescore-ground-truth-directional-2026-11.mjs: the reviewer's verbatim
// excerpts (fragments split on " ... " become paragraphs), one read per source
// (typed as the source is typed) and one pooled read per record (typed
// "statement").
//
// Spans are read only for the directional keys, so the three register records
// (Talarico cost_living and school_choice, Sanders healthcare) cannot move;
// they are included so all six labels are on one sheet.
//
// Read-only: no ground-truth label, scoring rule, issue key or site file is
// touched. Report → db/rescore-ground-truth-document-scope-2026-11.json.
//   node scripts/rescore-ground-truth-document-scope-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json");
const OUT = path.join(root, "db/rescore-ground-truth-document-scope-2026-11.json");
const FETCHED_AT = "2026-11-12T00:00:00.000Z";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, "").replace(/,$/, "."))}</p>`).join("\n");
const read = (c) => ({ position: c.position, confidence: c.confidence, ...(c.subject ? { spans: c.subject.spans, spans_with_signal: c.subject.spans_with_signal } : {}),
  clear: c.sources[0].statements.filter((s) => s.kind === "clear").map((s) => `${s.side}: ${s.text}`) });

export function buildReport(gtFile) {
  const records = [gtFile, ...(gtFile.additional_records || [])];
  const rows = records.map((gt) => {
    const raw = (body, source_type, url) => ({ url, fetched_at: FETCHED_AT, source_type, politician_id: gt.politician_id, topic: gt.topic, body });
    const both = (r) => {
      const p = S.scoreRawRecord(r, gt.topic, null, { spanScope: "paragraph" });
      const d = S.scoreRawRecord(r, gt.topic, null, { spanScope: "document" });
      const auto = S.scoreRawRecord(r, gt.topic);
      return { p, d, auto };
    };
    const per_source = gt.sources.map((s) => {
      const { p, d, auto } = both(raw(toBody(s.excerpt), s.type, s.link));
      return { type: s.type, scope_for_type: S.spanScopeFor(s.type), paragraph: read(p), document: read(d),
        moved: p.position !== d.position || p.confidence !== d.confidence, auto_is: auto.position === d.position && auto.confidence === d.confidence ? "document" : "paragraph" };
    });
    const pooledRaw = raw(gt.sources.map((s) => toBody(s.excerpt)).join("\n"), "statement", gt.sources[0].link);
    const { p, d } = both(pooledRaw);
    const cp = S.compareToGroundTruth(p, gt), cd = S.compareToGroundTruth(d, gt);
    const verdict = (c) => (c.positionMatch ? (c.confidenceWithin ? "agrees" : "agrees on position, confidence outside tolerance") : "disagrees");
    return {
      stance_id: gt.stance_id, topic: gt.topic, reads_spans: !!S.subjectOf(gt.topic),
      human: { position: gt.position, confidence: gt.confidence },
      paragraph_scope: { position: p.position, confidence: p.confidence, verdict: verdict(cp) },
      document_scope: { position: d.position, confidence: d.confidence, verdict: verdict(cd) },
      changed: p.position !== d.position || p.confidence !== d.confidence,
      per_source,
    };
  });
  return {
    _note: "Offline re-score of the six ground-truth records under the paragraph span scope (before) and the document span scope (after). Diagnostic only: no ground-truth label, rule or site file changes. The pooled read is the record-level read (typed \"statement\", so it reads at document scope).",
    rules_version: S.RULES_VERSION,
    vocab_version: S.DIRECTIONAL_VOCAB_VERSION,
    document_gap_paragraphs: S.SPAN_DOCUMENT_GAP_PARAGRAPHS,
    summary: {
      records: rows.length,
      changed_records: rows.filter((r) => r.changed).length,
      changed_source_reads: rows.flatMap((r) => r.per_source).filter((x) => x.moved).length,
      verdicts: Object.fromEntries(rows.map((r) => [r.stance_id, `${r.human.position} → ${r.document_scope.position} (${r.document_scope.verdict})`])),
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
  const r = JSON.parse(text);
  console.log(JSON.stringify(r.summary, null, 2));
  for (const x of r.records) for (const s of x.per_source) if (s.moved) console.log(`moved: ${x.stance_id} · ${s.type}: ${s.paragraph.position} ${s.paragraph.confidence} → ${s.document.position} ${s.document.confidence}`);
}
