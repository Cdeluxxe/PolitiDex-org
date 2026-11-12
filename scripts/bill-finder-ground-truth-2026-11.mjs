#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// bill-finder-ground-truth-2026-11.mjs — offline diagnostic for the bill finder
//
// Runs the shared bill finder (netlify/lib/bill-finder-core.mjs) and the v1
// mapping pattern (netlify/lib/bill-key-patterns.mjs, israel_offensive_arms
// only) over:
//   1. GROUND TRUTH — every source excerpt in the ground-truth file, scored as
//      the reviewer recorded it (the same text rescore-ground-truth-directional
//      reads: fragments split on " ... " become paragraphs), with the source's
//      own link and date. The Sanders and Massie records are the targets; the
//      Talarico and Sanders-healthcare records are off-key controls.
//   2. ROUTINE SWEEP — the pages the raw-ingest cron pulls on its fixed list
//      (SOURCES + DISCOVERY_PATTERNS) and the newly-elected state-legislative
//      ingest roster, fetched live. None is about Israel arms, so any mapping
//      there is a false mapping. Skip with --no-sweep (no network).
//
// Read-only: no ground-truth label, scoring rule, issue key, store or site
// file is touched. The report goes to db/bill-finder-ground-truth-2026-11.json.
//
//   node scripts/bill-finder-ground-truth-2026-11.mjs [--no-sweep]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as F from "../netlify/lib/bill-finder-core.mjs";
import * as K from "../netlify/lib/bill-key-patterns.mjs";
import { SOURCES, DISCOVERY_PATTERNS, FETCH_TIMEOUT_MS, MAX_BODY_CHARS } from "../netlify/lib/raw-ingest-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json");
const ROSTER_PATH = path.join(root, "db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json");
const OUT = path.join(root, "db/bill-finder-ground-truth-2026-11.json");

export const loadCatalog = () => F.catalogFromBillDocs(JSON.parse(fs.readFileSync(path.join(root, "db/bill-docs.json"), "utf8")));

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const excerptBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, ""))}</p>`).join("\n");

const briefCandidate = (c) => ({
  id: c.id, bill: c.bill ?? c.name ?? null, kind: c.kind, ...(c.family ? { family: c.family } : {}),
  in_catalog: c.in_catalog, ...(c.catalog ? { official_title: c.catalog.title } : {}),
  ...(c.resolves_to ? { resolves_to: c.resolves_to.map((r) => `${r.id} — ${r.why}`) } : {}),
  ...(c.unresolved ? { unresolved: c.unresolved } : {}),
  mentions: c.mentions.map((m) => ({ kind: m.kind, origin: m.origin, match: m.match, ...(m.congress_from ? { congress_from: m.congress_from } : {}), span: m.span.text })),
});
const briefMapping = (m) => ({ bill: m.bill, id: m.id, key: m.key, confidence: m.confidence, confidence_score: m.confidence_score, basis: m.basis, matched: m.matched, span: m.span,
  ...(m.resolves_to ? { resolves_to: m.resolves_to.map((r) => ({ id: r.id, title: r.title, title_fits_key: r.title_fits_key })) } : {}),
  ...(m.best_fit !== undefined ? { best_fit: m.best_fit } : {}) });

export function runPage(page, catalog) {
  const found = F.findBills(page, { catalog });
  const { mappings, unmapped } = K.mapFound(found);
  return { found, mappings, unmapped };
}

export function groundTruthRows(gtFile, catalog) {
  const records = [gtFile, ...(gtFile.additional_records || [])];
  return records.flatMap((r) => r.sources.map((s) => {
    const { found, mappings, unmapped } = runPage({ body: excerptBody(s.excerpt), url: s.link, date: s.date, politician_id: r.politician_id, source_type: s.type }, catalog);
    return { stance_id: r.stance_id, politician_id: r.politician_id, topic: r.topic, source_type: s.type, date: s.date, link: s.link,
      candidates: found.candidates.map(briefCandidate), mappings: mappings.map(briefMapping), unmapped };
  }));
}

function sweepList() {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
  const list = [
    ...SOURCES.map((s) => ({ ...s, group: "raw-ingest SOURCES" })),
    ...DISCOVERY_PATTERNS.map((s) => ({ ...s, group: "raw-ingest DISCOVERY_PATTERNS" })),
    ...roster.roster.flatMap((m) => m.sources.map((s) => ({ politician_id: s.politician_id, topic: s.topic, source_type: s.source_type, url: s.url, group: "newly-elected state-legislative roster" }))),
  ];
  const seen = new Set();
  return list.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

async function fetchPage(src) {
  try {
    const res = await fetch(src.url, { headers: { "user-agent": "PolitiDex bill-finder diagnostic", accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const body = (await res.text()).slice(0, MAX_BODY_CHARS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, body };
  } catch (e) { return { ok: false, error: e?.message || String(e) }; }
}

async function sweepRows(catalog) {
  const list = sweepList();
  const out = new Array(list.length);
  let next = 0;
  const fetchedAt = new Date().toISOString();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < list.length) {
      const i = next++;
      const src = list[i];
      let got = await fetchPage(src);
      if (!got.ok) got = await fetchPage(src); // one retry for a slow site
      const head = { group: src.group, politician_id: src.politician_id, topic: src.topic, source_type: src.source_type, url: src.url };
      if (!got.ok) { out[i] = { ...head, ok: false, error: got.error }; continue; }
      const { found, mappings, unmapped } = runPage({ body: got.body, url: src.url, date: fetchedAt.slice(0, 10), politician_id: src.politician_id, source_type: src.source_type }, catalog);
      out[i] = { ...head, ok: true, body_chars: got.body.length, sentences: found.sentences, candidates: found.candidates.length,
        mappings: mappings.map(briefMapping), mentioned_not_mapped: unmapped.map((u) => ({ bill: u.bill, kind: u.kind, matched: u.matched, ...(u.congress_from ? { congress_from: u.congress_from } : {}), reason: u.reason })) };
    }
  }));
  return { fetched_at: fetchedAt, rows: out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = loadCatalog();
  const gt = groundTruthRows(JSON.parse(fs.readFileSync(GT_PATH, "utf8")), catalog);
  const sweep = process.argv.includes("--no-sweep") ? null : await sweepRows(catalog);
  const okSweep = sweep ? sweep.rows.filter((r) => r.ok) : [];
  const report = {
    _note: "Diagnostic run of the shared bill finder and the v1 mapping pattern (israel_offensive_arms only). Read-only: nothing here changes a ground-truth label, a scoring rule, an issue key or the site. `ground_truth` reads the reviewer's verbatim excerpts with each source's own link and date; `routine_sweep` reads live pages the raw-ingest runs already pull, where every mapping would be a false mapping.",
    finder_version: F.FINDER_VERSION,
    patterns_version: K.PATTERNS_VERSION,
    mapped_keys: K.MAPPED_KEYS,
    catalog: { source: "db/bill-docs.json", bills: catalog.rows.length, short_titles: catalog.shortTitles.length },
    summary: {
      ground_truth_sources: gt.length,
      ground_truth_candidates: gt.reduce((n, r) => n + r.candidates.length, 0),
      ground_truth_mappings: gt.reduce((n, r) => n + r.mappings.length, 0),
      ground_truth_mentioned_not_mapped: gt.reduce((n, r) => n + r.unmapped.length, 0),
      ...(sweep ? {
        sweep_pages: sweep.rows.length, sweep_fetched: okSweep.length, sweep_failed: sweep.rows.length - okSweep.length,
        sweep_candidates: okSweep.reduce((n, r) => n + r.candidates, 0),
        sweep_mappings: okSweep.reduce((n, r) => n + r.mappings.length, 0),
      } : { sweep: "skipped (--no-sweep)" }),
    },
    ground_truth: gt,
    ...(sweep ? { routine_sweep: sweep } : {}),
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report.summary, null, 2));
  for (const r of gt) for (const m of r.mappings) console.log(`MAP  ${r.stance_id} · ${r.source_type} → ${m.bill ?? `(phrase → ${m.resolves_to.map((x) => x.id).join(", ")})`} · ${m.key} · ${m.confidence}`);
  if (sweep) for (const r of okSweep) for (const m of r.mappings) console.log(`SWEEP MAP (false?) ${r.url} → ${m.bill} ${m.confidence} :: ${m.span.slice(0, 160)}`);
}
