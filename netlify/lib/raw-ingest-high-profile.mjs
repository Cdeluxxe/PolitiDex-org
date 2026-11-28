// ─────────────────────────────────────────────────────────────────────────────
// High-profile sources — an explicit URL list pulled on EVERY raw-ingest run
// ─────────────────────────────────────────────────────────────────────────────
// db/high-profile-sources.json maps politician ids to source URLs (official
// issue / priority pages, press pages, campaign issue pages) that the normal
// crawler misses. After the normal crawler's pull, the cron (raw-ingest-cron.mts)
// hands this list to runHighProfile, which:
//   · pulls every listed URL with the crawler's own pullOne, so each page is
//     stored in the same "raw-ingest" Blobs store with the same record shape
//     (key: <politician_id>/<topic>/hp-<slug>/<timestamp>.json);
//   · scores each stored page with the existing scorer (scoreRecordCandidates)
//     and only LOGS the candidates — nothing goes to the Evidence Locker,
//     pdx_stated_positions or any ground-truth file;
//   · logs one "high-profile: OK / FAIL / SKIP …" line per source and a closing
//     "high-profile: …" summary. A failed URL never stops the others or the run.
// The crawler's own planning, discovery, frontier, host health and seen ledger
// never see these URLs; this is not a discovery source.

import HIGH_PROFILE_FILE from "../../db/high-profile-sources.json" with { type: "json" };
import { pullOne } from "./raw-ingest-core.mjs";
import { scoreRecordCandidates } from "./video-transcripts.mjs";
import { filterToScope } from "./raw-ingest-scope.mjs";
import { statementDateFor, statementDateLine, ownWordsCheck } from "./evidence-statement.mjs";
import { isOwnPage } from "./evidence-locker-core.mjs";

export const HIGH_PROFILE_DEFAULT_TOPIC = "cost_living";
// Per-URL fetch ceiling. The cron passes min(this, what is left of the run
// budget), never below HIGH_PROFILE_MIN_TIMEOUT_MS. All URLs are concurrent.
export const HIGH_PROFILE_TIMEOUT_MS = 8_000;
export const HIGH_PROFILE_MIN_TIMEOUT_MS = 4_000;
export const HIGH_PROFILE_SOURCE_PREFIX = "hp-";

const normUrl = (u) => String(u || "").trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();

// "https://www.thune.senate.gov/policy-solutions/priorities/healthcare/" →
// "hp-thune-senate-gov-policy-solutions-priorities-healthcare"
export function highProfileSourceId(url) {
  let slug = "";
  try {
    const u = new URL(url);
    slug = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
  } catch { slug = String(url || ""); }
  slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  return `${HIGH_PROFILE_SOURCE_PREFIX}${slug || "page"}`;
}

export const isHighProfileSource = (s) => Boolean(s && s.high_profile);

// Load + validate the config. Bad entries are reported in `rejected` (and
// logged by the caller), duplicates of a URL already listed are dropped.
// Returns crawler-shaped sources: { politician_id, topic, source_type,
// source_id, url, note?, high_profile: true }.
export function loadHighProfileSources(doc = HIGH_PROFILE_FILE) {
  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.sources) ? doc.sources : [];
  const sources = [];
  const rejected = [];
  const seen = new Set();
  for (const e of list) {
    const pid = typeof e?.politician_id === "string" ? e.politician_id.trim() : "";
    const url = typeof e?.url === "string" ? e.url.trim() : "";
    const type = typeof e?.source_type === "string" ? e.source_type.trim() : "";
    let why = !pid ? "missing politician_id" : !type ? "missing source_type" : !/^https?:\/\//i.test(url) ? "url is not http(s)" : null;
    if (!why && seen.has(normUrl(url))) why = "duplicate url";
    if (why) { rejected.push({ entry: e, reason: why }); continue; }
    seen.add(normUrl(url));
    sources.push({
      politician_id: pid,
      topic: typeof e.topic === "string" && e.topic.trim() ? e.topic.trim() : HIGH_PROFILE_DEFAULT_TOPIC,
      source_type: type,
      source_id: highProfileSourceId(url),
      url,
      ...(typeof e.note === "string" && e.note.trim() ? { note: e.note.trim() } : {}),
      high_profile: true,
    });
  }
  return { sources, rejected, politicians: [...new Set(sources.map((s) => s.politician_id))] };
}

// A fetch with this pass's own timeout (combined with any caller signal).
function withTimeout(fetchFn, ms) {
  return (url, init = {}) => {
    const t = AbortSignal.timeout(ms);
    const signal = init.signal && typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, t]) : t;
    return fetchFn(url, { ...init, signal });
  };
}

// Pull every high-profile source. Never throws.
//   deps.fetch / store / now / log — as for the crawler's pullOne.
//   deps.sources — loaded sources (default: the committed config).
//   deps.alreadyPulled — URLs the crawler pulled this run (normalised or not);
//     those are not fetched twice (their raw page is already stored).
//   deps.timeoutMs — per-URL fetch ceiling.
//   deps.scope — the ingest allow-list (scopeIds), null/omitted = everyone.
export async function runHighProfile(deps = {}) {
  const log = deps.log ?? console.log;
  let loaded;
  try {
    loaded = deps.sources ? { sources: deps.sources, rejected: [], politicians: [...new Set(deps.sources.map((s) => s.politician_id))] } : loadHighProfileSources(deps.config);
  } catch (e) {
    log(`high-profile: config unreadable — no high-profile sources this run (${e?.message || e})`);
    return { configured: 0, politicians: [], ok: 0, failed: 0, skipped: 0, candidates: 0, results: [], rejected: [] };
  }
  // The ingest allow-list (raw-ingest-scope.mjs), when on, narrows this list too.
  if (deps.scope) {
    loaded.sources = filterToScope(deps.scope, loaded.sources);
    loaded.politicians = [...new Set(loaded.sources.map((s) => s.politician_id))];
  }
  for (const r of loaded.rejected) log(`high-profile: CONFIG SKIP ${r.entry?.politician_id || "?"} ${r.entry?.url || "?"} — ${r.reason}`);
  const already = new Set([...(deps.alreadyPulled || [])].map(normUrl));
  const timeoutMs = Math.max(1, Number(deps.timeoutMs) || HIGH_PROFILE_TIMEOUT_MS);
  const fetchFn = withTimeout(deps.fetch ?? globalThis.fetch, timeoutMs);

  const pullHp = async (src) => {
    const base = { politician_id: src.politician_id, source_type: src.source_type, topic: src.topic, url: src.url };
    if (already.has(normUrl(src.url))) {
      log(`high-profile: SKIP ${src.politician_id} [${src.source_type}] ${src.url} — already pulled by the crawler this run (raw page stored there)`);
      return { ...base, ok: true, skipped: true, candidates: [] };
    }
    const candidates = [];
    // Log-only scoring: the same scorer the crawler uses, nothing written.
    const onRecord = async (rec) => {
      // The scorer's own lines are prefixed so nothing downstream that reads
      // "stance-score: …" lines (the suggestions log) mistakes them for crawler finds.
      const scored = scoreRecordCandidates(rec, { log: (l) => log(`high-profile: ${l}`) });
      // Statement date (page vs. fetch-time fallback), once per stored page.
      const sd = statementDateFor(rec);
      if (scored.length) log(`high-profile: ${statementDateLine(`${rec.politician_id}|${rec.source_id}`, sd)}`);
      for (const { candidate: c, raw } of scored) {
        // The same own-words filter the Locker writer applies, reported here.
        const own = ownWordsCheck(c, raw, { ownPage: isOwnPage(c, raw) });
        candidates.push({ topic: c.topic, position: c.position, confidence: c.confidence, takes_clear_position: !!c.takes_clear_position, statement_date: sd.date, statement_date_source: sd.source, own_words: own.ok, ...(own.ok ? {} : { filtered: own.code, filter_reason: own.reason }) });
        log(`high-profile: CANDIDATE ${rec.politician_id}|${c.topic}|${rec.source_id} — ${c.position} (confidence ${c.confidence}) · statement date ${sd.date} (${sd.source}) · ${own.ok ? "own words" : `FILTERED (${own.code}): ${own.reason}`} · log-only, not written`);
      }
    };
    let r;
    try {
      r = await pullOne(src, { fetch: fetchFn, store: deps.store, now: deps.now, onRecord, log });
    } catch (e) {
      r = { ok: false, url: src.url, error: String(e?.message || e), error_class: "other" };
    }
    if (r.ok) log(`high-profile: OK ${src.politician_id} [${src.source_type}] ${src.url} → ${r.key} (${r.body_chars} chars) · ${candidates.length} candidate(s) logged`);
    else log(`high-profile: FAIL ${src.politician_id} [${src.source_type}] ${src.url} — ${r.error}; skipped, the rest of the run continues`);
    return { ...base, ok: !!r.ok, ...(r.key ? { key: r.key } : {}), ...(r.ok ? {} : { error: r.error, error_class: r.error_class || "other" }), candidates };
  };

  const results = await Promise.all(loaded.sources.map((s) => pullHp(s).catch((e) => ({ politician_id: s.politician_id, source_type: s.source_type, topic: s.topic, url: s.url, ok: false, error: String(e?.message || e), error_class: "other", candidates: [] }))));
  const okPulled = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  const candidates = results.reduce((n, r) => n + r.candidates.length, 0);
  const failedPids = [...new Set(results.filter((r) => !r.ok).map((r) => r.politician_id))];
  log(`high-profile: ${loaded.sources.length} source(s) for ${loaded.politicians.length} politician(s) — ${okPulled} stored, ${failed} failed${failed ? ` (${failedPids.join(", ")})` : ""}, ${skipped} already pulled by the crawler · ${candidates} candidate(s) logged (log-only: no Locker, stated-position or ground-truth writes)`);
  return { configured: loaded.sources.length, politicians: loaded.politicians, ok: okPulled, failed, skipped, candidates, results, rejected: loaded.rejected.map((r) => ({ url: r.entry?.url || null, reason: r.reason })) };
}
