#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// gen-person-directional-keys.mjs — the table person-directional-keys.js shows
//
// For each person with a ground-truth record (the six locked records and
// db/stance-ground-truth-expansion-2026-11.json), two things, on the five keys
// that have a bill mapping pattern (bill-key-patterns.mjs: israel_offensive_arms,
// ukraine_aid, iran_hostilities, and the register keys tariffs_china and
// border_security) and on no other key:
//
//   mappings  every bill the shared bill finder matched to one of those keys in
//             that person's ground-truth sources (bill, key, confidence, a short
//             justification quoted from the source, and the source it was
//             found in). One row per bill and key; the highest confidence wins,
//             and the other sources that matched the same bill are listed.
//   stances   the stance scorer's read on each of those keys that has a
//             ground-truth or scored record: the record's own key when it has
//             a pattern, otherwise its pattern-key children (Sanders's
//             israel_military_aid record → israel_offensive_arms). The read is
//             the scorer's pooled, record-level read of the reviewer's
//             verbatim excerpts (the same read the re-score reports record).
//             It is the scorer's output, not the human label; the human labels
//             are not changed or shown as the scorer's.
//
// Same inputs as scripts/bill-finder-ground-truth-2026-11.mjs and
// scripts/rescore-ground-truth-directional-2026-11.mjs, recomputed here so the
// table can never drift from the finder and scorer code. Offline, deterministic.
//
//   node scripts/gen-person-directional-keys.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as F from "../netlify/lib/bill-finder-core.mjs";
import * as K from "../netlify/lib/bill-key-patterns.mjs";
import * as S from "../netlify/lib/stance-score-core.mjs";
import { DIRECTIONAL_ISSUE_KEYS, ISSUE_TOPIC_VOCAB, ISSUE_TOPIC_LABELS } from "../netlify/lib/stance-topic-vocab.mjs";
import { groundTruthRows, loadCatalog, loadGroundTruth } from "./bill-finder-ground-truth-2026-11.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "person-directional-keys.json");
const FETCHED_AT = "2026-11-12T00:00:00.000Z";
const RANK = { high: 3, medium: 2, low: 1 };

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, "").replace(/,$/, "."))}</p>`).join("\n");
const clip = (s, n = 240) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t; };
const source = (r) => ({ type: r.source_type, ...(r.date ? { date: r.date } : {}), link: r.link });

// The keys to read a record on: its own key if it has a pattern, else its pattern-key children.
const keysForRecord = (topic) => (K.MAPPED_KEYS.includes(topic) ? [topic] : K.MAPPED_KEYS.filter((k) => DIRECTIONAL_ISSUE_KEYS[k]?.parent === topic));

export function buildTable(gtFile, catalog) {
  const people = {};
  const person = (pid) => (people[pid] ||= { mappings: [], stances: [] });

  // 1. Mappings.
  const rows = groundTruthRows(gtFile, catalog);
  const byRow = new Map();
  for (const r of rows) for (const m of r.mappings) {
    if (!K.MAPPED_KEYS.includes(m.key)) continue;
    const ident = m.id || (m.resolves_to ? `phrase:${m.resolves_to.map((x) => x.id).join(",")}` : `name:${String(m.matched).toLowerCase()}`);
    const k = `${r.politician_id}|${ident}|${m.key}`;
    const row = byRow.get(k);
    const entry = { pid: r.politician_id, m, src: source(r) };
    if (!row) { byRow.set(k, { best: entry, also: [] }); continue; }
    if (RANK[m.confidence] > RANK[row.best.m.confidence]) { row.also.push(row.best.src); row.best = entry; }
    else row.also.push(entry.src);
  }
  for (const { best, also } of byRow.values()) {
    const { m, src, pid } = best;
    const cat = m.id ? catalog.byId.get(m.id) : null;
    // The justification quotes the source's own words; the URL headline the finder also reads is not a quote.
    const slug = F.urlSlugText(src.link);
    const quoted = String(m.span).split(" … ").filter((x) => x && x !== slug).join(" … ") || m.span;
    const page = (c) => `/b/${encodeURIComponent(c.congress)}/${encodeURIComponent(c.bill)}`;
    person(pid).mappings.push({
      key: m.key,
      ...(m.bill ? { bill: m.bill, congress: Number(m.id.split("|")[0]) || null } : {}),
      ...(cat ? { title: cat.title, page: page(cat) } : {}),
      // A bill named only by its title, with no number on the page and no catalog row.
      ...(!m.bill && !m.resolves_to ? { name: m.matched } : {}),
      ...(!m.bill && m.resolves_to ? {
        one_of: m.resolves_to.map((x) => { const c = catalog.byId.get(x.id); return c ? { bill: c.bill, congress: c.congress, page: page(c) } : { bill: x.id.split("|")[1], congress: Number(x.id.split("|")[0]) }; }),
        ...(m.best_fit ? { best_fit: catalog.byId.get(m.best_fit)?.bill || m.best_fit } : {}) } : {}),
      confidence: m.confidence,
      basis: m.basis,
      justification: clip(quoted),
      source: src,
      ...(also.length ? { also_found_in: also } : {}),
    });
  }

  // 2. Stance reads.
  for (const gt of [gtFile, ...(gtFile.additional_records || [])]) {
    const keys = keysForRecord(gt.topic);
    if (!keys.length) continue;
    const body = gt.sources.map((s) => toBody(s.excerpt)).join("\n");
    for (const key of keys) {
      const raw = { url: gt.sources[0].link, fetched_at: FETCHED_AT, source_type: "statement", politician_id: gt.politician_id, topic: key, body };
      const c = S.scoreRawRecord(raw, key);
      const clear = c.sources[0].statements.filter((x) => x.kind === "clear" || x.kind === "implication");
      person(gt.politician_id).stances.push({
        key, position: c.position, confidence: c.confidence, reason: c.confidence_reason,
        record: gt.topic === key ? "ground-truth record on this key" : `ground-truth record on ${gt.topic}, read on this key`,
        ...(clear.length ? { quote: clip(clear[0].text, 200) } : {}),
        sources: gt.sources.map((s) => ({ type: s.type, ...(s.date ? { date: s.date } : {}), link: s.link })),
      });
    }
  }
  for (const p of Object.values(people)) {
    p.mappings.sort((a, b) => K.MAPPED_KEYS.indexOf(a.key) - K.MAPPED_KEYS.indexOf(b.key) || RANK[b.confidence] - RANK[a.confidence]);
    p.stances.sort((a, b) => K.MAPPED_KEYS.indexOf(a.key) - K.MAPPED_KEYS.indexOf(b.key));
  }
  return {
    _comment: "GENERATED by scripts/gen-person-directional-keys.mjs — do not edit by hand. Per person, the bill matches the bill finder made in that person's ground-truth sources and the stance scorer's read on each directional key with a record, on the keys that have a bill mapping pattern only. Shown on person pages by person-directional-keys.js.",
    finder_version: F.FINDER_VERSION,
    patterns_version: K.PATTERNS_VERSION,
    rules_version: S.RULES_VERSION,
    vocab_version: S.DIRECTIONAL_VOCAB_VERSION,
    keys: Object.fromEntries(K.MAPPED_KEYS.map((k) => [k, { label: ISSUE_TOPIC_LABELS[k], pos: (DIRECTIONAL_ISSUE_KEYS[k] || ISSUE_TOPIC_VOCAB[k]).pos }])),
    people: Object.fromEntries(Object.entries(people).filter(([, p]) => p.mappings.length || p.stances.length).sort(([a], [b]) => a.localeCompare(b))),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(buildTable(loadGroundTruth(), loadCatalog()), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, "utf8") === text;
    console.log(ok ? "person-directional-keys.json is current" : "person-directional-keys.json is stale — run node scripts/gen-person-directional-keys.mjs");
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(OUT, text);
  const t = JSON.parse(text);
  for (const [pid, p] of Object.entries(t.people)) {
    console.log(`${pid}: ${p.mappings.length} mapping(s), ${p.stances.length} stance read(s)`);
    for (const m of p.mappings) console.log(`   map  ${m.bill || m.name || `one of ${m.one_of.map((x) => x.bill).join(", ")}`} → ${m.key} · ${m.confidence} · ${m.source.type} :: ${m.justification.slice(0, 90)}`);
    for (const s of p.stances) console.log(`   read ${s.key}: ${s.position} (${s.confidence})`);
  }
}
