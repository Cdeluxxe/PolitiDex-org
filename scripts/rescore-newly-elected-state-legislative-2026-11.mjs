#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// rescore-newly-elected-state-legislative-2026-11.mjs — offline diagnostic
//
// Re-scores every page from the newly elected state legislative ingest run
// (db/raw-ingest-run-newly-elected-state-legislative-2026-11.json) under the
// current rules (stance-score-core.mjs, phase8-v3) and compares each read with
// the curated stance on the key the curator assigned
// (db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json).
//
// Read-only: raw records are read back from the "raw-ingest" Blobs store (or
// from --cache <dir> when given and populated); nothing is written to Blobs,
// the Locker or any stance file. Scoring rules, issue keys and curated
// records are not touched. The report goes to
// db/rescore-newly-elected-state-legislative-2026-11.json.
//
//   node scripts/rescore-newly-elected-state-legislative-2026-11.mjs [--cache /tmp/dir]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "@netlify/blobs";
import * as S from "../netlify/lib/stance-score-core.mjs";
import { RAW_STORE_NAME } from "../netlify/lib/raw-ingest-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const ROSTER = read("db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json");
const RUN = read("db/raw-ingest-run-newly-elected-state-legislative-2026-11.json");
const OUT = path.join(root, "db/rescore-newly-elected-state-legislative-2026-11.json");
const ci = process.argv.indexOf("--cache");
const cacheDir = ci > 0 ? process.argv[ci + 1] : null;

let store = null;
const getRaw = async (key) => {
  const file = cacheDir && path.join(cacheDir, key.replace(/\//g, "__"));
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  store ||= getStore({ name: RAW_STORE_NAME, siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN });
  const raw = await store.get(key, { type: "json" });
  if (file && raw) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(raw)); }
  return raw;
};

const curatedFor = new Map();
for (const r of ROSTER.roster) for (const s of r.sources) curatedFor.set(`${s.politician_id} ${s.url}`, s);

const isDir = (p) => p === "support" || p === "oppose";

// Why a curated key stays at NO CLEAR POSITION (a triage tag, not a rule):
//   r9_sibling_key            — the key's own read is directional, but R9 credits the same sentence(s) to another key on the page;
//   action_language_missed    — a key mention (not attributed to an opponent; a pronoun misread still counts) carries a commitment/action cue (will, fight, ensure, fund, cut, oppose …);
//   problem_or_value_language — the key is mentioned only as a heading, a problem or a value ("should be", "belongs to all of us");
//   no_key_vocabulary         — the page never mentions the key in the vocabulary's terms.
// Imperative bullets ("Expand …", "Fund …") count as action language.
const ACTION_CUE = /\b(?:will|would|must|need to|going to|plan to|commit(?:ted)? to|fight(?:s|ing)?|push(?:es|ing)? (?:for|back)|champion\w*|advocat\w*|support(?:s|ing|ers?)?|oppos\w*|against|protect\w*|defend\w*|ensur\w*|expand\w*|invest\w*|fund(?:s|ed|ing)?|fully[- ]fund\w*|restor\w*|repeal\w*|ban(?:s|ning)?|end(?:s|ing)?|stop\w*|lower\w*|cut(?:s|ting)?|rais\w*|increas\w*|creat\w*|pass(?:es|ing)?|requir\w*|guarantee\w*|deliver\w*|strengthen\w*|wants?)\b/i;
const IMPERATIVE = /^(?:Expand|Fund|Fully|Protect|Defend|Lower|Cut|Raise|Increase|Create|Pass|Require|Guarantee|Deliver|Strengthen|Invest|Restore|Repeal|Ban|End|Stop|Support|Oppose|Make|Build|Keep|Ensure|Improve|Provide|Reduce|Hold|Eliminate|Preserve|Secure|Modernize|Establish|Give|Bring|Streamline|Prioritize|Fix|Close|Allow|Reform|Fight|Champion|Advocate|Expand)\b(?!.*:$)/;
const lowReason = (k, direct) => {
  if (k.dropped_by_r9) return { low_reason: "r9_sibling_key" };
  const ms = stmts(direct).filter((s) => s.kind === "mention");
  if (!ms.length) return { low_reason: "no_key_vocabulary" };
  const act = ms.find((s) => s.attributed_to !== "opponent" && s.text.split(/\s+/).length >= 4 && (IMPERATIVE.test(s.text) || ACTION_CUE.test(s.text)));
  return act ? { low_reason: "action_language_missed", low_evidence: act.text } : { low_reason: "problem_or_value_language", low_evidence: ms[0].text };
};
const stmts = (c) => c?.sources?.[0]?.statements || [];
const directional = (c) => stmts(c).filter((s) => s.kind === "clear" || s.kind === "implication");
const brief = (c) => c && {
  topic: c.topic, position: c.position, confidence: c.confidence, stated: !!c.stated_position,
  r10: stmts(c).some((s) => s.claim_pattern),
  clear: stmts(c).filter((s) => s.kind === "clear").length,
  implied: stmts(c).filter((s) => s.kind === "implication").length,
  mentions: stmts(c).filter((s) => s.kind === "mention").length,
  excerpts: directional(c).slice(0, 4).map((s) => `${s.side}${s.claim_pattern ? " [R10]" : s.implication ? ` [imp:${s.implication}]` : ""}: ${s.text}`),
};

const pages = [];
for (const row of RUN.results) {
  const src = curatedFor.get(`${row.politician_id} ${row.url}`);
  if (!row.ok) { pages.push({ politician_id: row.politician_id, url: row.url, ingested: false, error: row.error }); continue; }
  const raw = await getRaw(row.key);
  const sentences = S.extractSentences(raw.body);
  const all = S.scoreAllTopics(raw);
  const byTopic = new Map(all.map((c) => [c.topic, c]));
  const curatedKeys = [...new Map(src.curated.map((k) => [k.key, k])).values()];
  const keys = curatedKeys.map((k) => {
    const emitted = byTopic.get(k.key) || null;               // what the cron path would log for this key
    const direct = S.scoreRawRecord(raw, k.key, sentences);   // the same rules, this key read on its own
    const pos = emitted?.position ?? "no clear position";
    const verdict = isDir(pos) ? (pos === k.side ? "match" : "wrong_direction") : pos === "mixed" ? "mixed" : "no_clear_position";
    const out = {
      key: k.key, curated_side: k.side, curated_text: src.curated.find((x) => x.key === k.key)?.topic,
      verdict, read: brief(emitted),
      ...(!emitted && isDir(direct.position) ? { dropped_by_r9: brief(direct) } : {}),
    };
    if (verdict === "no_clear_position") Object.assign(out, lowReason(out, direct));
    return out;
  });
  const curatedSet = new Set(curatedKeys.map((k) => k.key));
  const offKey = all.filter((c) => !curatedSet.has(c.topic) && isDir(c.position)).map(brief);
  pages.push({
    politician_id: row.politician_id, url: row.url, key: row.key, fetched_at: row.fetched_at,
    source_type: raw.source_type, page_topic: raw.topic, ingested: true,
    sentences: sentences.length, text_chars: sentences.join(" ").length,
    clear_on_curated_key: keys.some((k) => k.verdict === "match"),
    keys, off_key_directional: offKey,
  });
}

const ing = pages.filter((p) => p.ingested);
const allKeys = ing.flatMap((p) => p.keys.map((k) => ({ ...k, pid: p.politician_id, url: p.url })));
const count = (arr, f) => arr.filter(f).length;
const summary = {
  rules_version: S.RULES_VERSION,
  vocab_version: S.VOCAB_VERSION,
  pages_ingested: ing.length,
  pages_failed: pages.length - ing.length,
  pages_clear_on_curated_key: count(ing, (p) => p.clear_on_curated_key),
  pages_no_clear_position_on_any_curated_key: count(ing, (p) => !p.keys.some((k) => k.verdict === "match" || k.verdict === "wrong_direction" || k.verdict === "mixed")),
  pages_unreadable: count(ing, (p) => p.sentences < 3),
  curated_keys_scored: allKeys.length,
  curated_keys_match: count(allKeys, (k) => k.verdict === "match"),
  curated_keys_match_via_r10: count(allKeys, (k) => k.verdict === "match" && k.read?.r10),
  curated_keys_wrong_direction: count(allKeys, (k) => k.verdict === "wrong_direction"),
  curated_keys_mixed: count(allKeys, (k) => k.verdict === "mixed"),
  curated_keys_no_clear_position: count(allKeys, (k) => k.verdict === "no_clear_position"),
  curated_keys_dropped_by_r9: count(allKeys, (k) => k.dropped_by_r9),
  no_clear_position_reasons: Object.fromEntries(["r9_sibling_key", "action_language_missed", "problem_or_value_language", "no_key_vocabulary"]
    .map((r) => [r, count(allKeys, (k) => k.low_reason === r)])),
  off_key_directional_candidates: ing.reduce((n, p) => n + p.off_key_directional.length, 0),
  off_key_r10_candidates: ing.reduce((n, p) => n + p.off_key_directional.filter((c) => c.r10).length, 0),
  r10_reads_total: ing.reduce((n, p) => n + p.keys.filter((k) => k.read?.r10).length + p.off_key_directional.filter((c) => c.r10).length, 0),
};
fs.writeFileSync(OUT, JSON.stringify({
  _note: "Offline re-score of the newly elected state legislative ingest run under the current rules. Diagnostic only: nothing here is a stance record, a Locker item or a curated claim. `verdict` compares the read on each curated key (as the cron's scoreAllTopics path would emit it) to the curator's side.",
  run_at: RUN.run_at, scored_at: new Date().toISOString(), summary, pages,
}, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
console.log(`report → ${path.relative(root, OUT)}`);
