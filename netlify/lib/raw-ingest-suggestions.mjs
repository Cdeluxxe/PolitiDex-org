// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-suggestions.mjs — a short, readable log of what the raw-ingest job
// is finding, so the curator does not have to dig through function logs.
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY OVER THE JOB. This module never changes scoring, discovery or the
// pull. After a run finishes it reads the run's own log lines (and the failed
// results in its report) and appends an entry for anything new or notable:
//
//   url   — a "discovery: NEW …" line for a URL not suggested before
//   score — a "stance-score: cross-topic candidate {…}" line whose position is
//           support or oppose (politician, topic, position, confidence, URL),
//           new or with a changed position since it was last suggested
//   key   — an issue key the scorer used this run that the related-issues map
//           (RELATED_ISSUE_KEYS) does not name
//   fail  — a source that has now failed FAIL_THRESHOLD pulls in a row (once
//           per streak; a successful pull resets the streak)
//
// WHERE IT LIVES. One JSON document in Netlify Blobs (store
// "raw-ingest-suggestions", key "suggestions.json"). A deployed function cannot
// write files into the repo, so the "single JSON file" is this blob. Shape:
//   { entries: [{ ts, type, details }], seen: { url, score, key }, fails, updated_at }
// Entries are newest-last on disk and capped at MAX_ENTRIES (oldest dropped).
// `seen` and `fails` are the small memories that keep the every-minute job from
// re-suggesting the same thing each minute; each is capped too.

import { RELATED_ISSUE_KEYS } from "./related-issue-keys.mjs";

export const SUGGESTIONS_STORE_NAME = "raw-ingest-suggestions";
export const SUGGESTIONS_KEY = "suggestions.json";
export const MAX_ENTRIES = 250;
export const MAX_SEEN = 3000;
export const MAX_FAILS_TRACKED = 1000;
export const FAIL_THRESHOLD = 3;
export const SUGGESTION_TYPES = ["url", "score", "key", "fail"];

export function emptyDoc() {
  return { entries: [], seen: { url: {}, score: {}, key: {} }, fails: {}, updated_at: null };
}

/** Whatever was stored → a well-formed doc (a missing or broken doc starts empty). */
export function normaliseDoc(doc) {
  const d = emptyDoc();
  if (!doc || typeof doc !== "object") return d;
  if (Array.isArray(doc.entries)) d.entries = doc.entries.filter((e) => e && SUGGESTION_TYPES.includes(e.type) && e.ts);
  for (const k of Object.keys(d.seen)) if (doc.seen?.[k] && typeof doc.seen[k] === "object") d.seen[k] = { ...doc.seen[k] };
  if (doc.fails && typeof doc.fails === "object") d.fails = { ...doc.fails };
  d.updated_at = doc.updated_at || null;
  return d;
}

const NEW_URL_RE = /^discovery: NEW (\S+?)\|(\S+) (\S+) \((.*)\) — added to this run's pull list$/;
const CROSS_RE = /^stance-score: cross-topic candidate (\{.*\})$/;
const OWN_RE = /^stance-score: candidate (\{.*\})$/;

/** Pull the interesting facts out of one run's log lines. Never throws. */
export function parseRunLines(lines = []) {
  const urls = [], scores = [], topics = new Set();
  for (const raw of lines) {
    const l = String(raw ?? "");
    let m = l.match(NEW_URL_RE);
    if (m) { urls.push({ politician_id: m[1], topic: m[2], url: m[3], source_type: m[4] }); continue; }
    m = l.match(CROSS_RE);
    if (m) {
      try {
        const c = JSON.parse(m[1]);
        if (c?.topic) topics.add(c.topic);
        if (c?.position === "support" || c?.position === "oppose") {
          scores.push({ politician_id: c.politician_id, topic: c.topic, position: c.position, confidence: c.confidence,
            url: c.url, ...(c.page_topic ? { page_topic: c.page_topic } : {}), ...(c.source_id ? { source_id: c.source_id } : {}) });
        }
      } catch {}
      continue;
    }
    m = l.match(OWN_RE);
    if (m) { try { const c = JSON.parse(m[1]); if (c?.topic) topics.add(c.topic); } catch {} }
  }
  return { urls, scores, topics: [...topics] };
}

const capMap = (obj, max) => {
  const keys = Object.keys(obj);
  if (keys.length <= max) return obj;
  const out = {};
  for (const k of keys.slice(keys.length - max)) out[k] = obj[k];
  return out;
};

/**
 * Fold one run into the doc. `lines` = the run's log lines, `report` = its JSON
 * report (only `results` is read, for failures). Returns { doc, added }.
 */
export function foldRun(doc, { lines = [], report = {}, now = new Date(), relatedKeys = RELATED_ISSUE_KEYS, failThreshold = FAIL_THRESHOLD, maxEntries = MAX_ENTRIES } = {}) {
  const d = normaliseDoc(doc);
  const ts = now.toISOString();
  const added = [];
  const push = (type, details) => { const e = { ts, type, details }; d.entries.push(e); added.push(e); };
  const { urls, scores, topics } = parseRunLines(lines);

  for (const u of urls) {
    const k = u.url.toLowerCase();
    if (d.seen.url[k]) continue;
    d.seen.url[k] = ts;
    push("url", u);
  }
  for (const s of scores) {
    const k = `${s.politician_id}|${s.topic}|${String(s.url).toLowerCase()}`;
    if (d.seen.score[k] === s.position) continue;
    const previous = d.seen.score[k];
    d.seen.score[k] = s.position;
    push("score", previous ? { ...s, previous_position: previous } : s);
  }
  const mapped = new Set(relatedKeys);
  for (const t of topics) {
    if (mapped.has(t) || d.seen.key[t]) continue;
    d.seen.key[t] = ts;
    push("key", { key: t, note: "used by the scorer but not in the related-issues map" });
  }
  for (const r of Array.isArray(report?.results) ? report.results : []) {
    if (!r?.url) continue;
    const k = r.url;
    if (r.ok) { if (d.fails[k]) delete d.fails[k]; continue; }
    const f = d.fails[k] || { count: 0, first_failed_at: ts, reported: false };
    f.count += 1; f.last_failed_at = ts; f.last_error = r.error || "unknown error";
    if (!f.reported && f.count >= failThreshold) {
      f.reported = true;
      push("fail", { url: k, consecutive_failures: f.count, first_failed_at: f.first_failed_at, last_error: f.last_error });
    }
    delete d.fails[k]; d.fails[k] = f; // keep most recent last for the cap
  }

  if (d.entries.length > maxEntries) d.entries = d.entries.slice(d.entries.length - maxEntries);
  for (const k of Object.keys(d.seen)) d.seen[k] = capMap(d.seen[k], MAX_SEEN);
  d.fails = capMap(d.fails, MAX_FAILS_TRACKED);
  d.updated_at = ts;
  return { doc: d, added };
}

/** Read the doc, fold the run in, write it back. Never throws. */
export async function appendRunSuggestions(store, run, { log = console.log } = {}) {
  if (!store) return { added: [] };
  try {
    let prior = null;
    try { prior = await store.get(SUGGESTIONS_KEY, { type: "json" }); } catch (e) { log(`raw-ingest-suggestions: unreadable — starting fresh (${e?.message || e})`); }
    const { doc, added } = foldRun(prior, run);
    // Written every run, even with nothing new: the fail streaks must stay current.
    await store.setJSON(SUGGESTIONS_KEY, doc);
    const by = (t) => added.filter((e) => e.type === t).length;
    log(`raw-ingest-suggestions: ${added.length} new entr${added.length === 1 ? "y" : "ies"} (url ${by("url")}, score ${by("score")}, key ${by("key")}, fail ${by("fail")}) · ${doc.entries.length} kept (max ${MAX_ENTRIES})`);
    return { added, kept: doc.entries.length };
  } catch (e) {
    log(`raw-ingest-suggestions: not written — ${e?.message || e}`);
    return { added: [], error: e?.message || String(e) };
  }
}

/** Entries newest first, optionally limited / filtered by type. */
export function recentEntries(doc, { limit = MAX_ENTRIES, type } = {}) {
  const d = normaliseDoc(doc);
  const list = type && SUGGESTION_TYPES.includes(type) ? d.entries.filter((e) => e.type === type) : d.entries;
  return list.slice().reverse().slice(0, Math.max(0, limit));
}
