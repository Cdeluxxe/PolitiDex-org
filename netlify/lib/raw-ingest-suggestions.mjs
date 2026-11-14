// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-suggestions.mjs — a short, readable log of what the raw-ingest job
// is finding, so the curator does not have to dig through function logs.
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY OVER THE JOB. This module never changes scoring, discovery or the
// pull. After a run finishes it reads the run's own log lines (and the failed
// results in its report) and appends an entry for anything new or notable:
//
//   url   — a "discovery: NEW …" line for a URL not suggested before
//   url   — logged once, never again
//   score — a "stance-score: cross-topic candidate {…}" line whose position is
//           support or oppose (politician, topic, position, confidence, URL).
//           Logged once per politician + topic, whatever page it came from;
//           logged again only when the position flips (support ↔ oppose), with
//           the earlier position as `previous_position` — and only when the
//           flip comes from a source allowed to rewrite the held stance
//           (shouldReplaceStance): the same page re-read, or an on-topic page
//           (a "stance-score: candidate" line on its own topic, remembered
//           silently) over a cross-topic one. A cross-topic read from another
//           page never rewrites a held stance, so two pages scored onto one
//           topic from different issue pages cannot flip it back and forth.
//   key   — an issue key the scorer used this run that the related-issues map
//           (RELATED_ISSUE_KEYS) does not name; logged once
//   fail  — a source that has now failed FAIL_THRESHOLD pulls in a row (once
//           per streak; a successful pull resets the streak)
//
// WHERE IT LIVES. One JSON document in Netlify Blobs (store
// "raw-ingest-suggestions", key "suggestions.json"). A deployed function cannot
// write files into the repo, so the "single JSON file" is this blob. Shape:
//   { entries: [{ ts, type, details }], seen: { url, score, key }, fails, updated_at }
// Entries are newest-last on disk. Each type has its own cap (TYPE_CAPS — the
// oldest of that type dropped first), so one kind of entry cannot crowd out the
// others; MAX_ENTRIES is the overall hard limit (oldest across all types).
// `seen` and `fails` are the small memories that keep the every-minute job from
// re-suggesting the same thing each minute; each is capped too.

import { RELATED_ISSUE_KEYS } from "./related-issue-keys.mjs";

export const SUGGESTIONS_STORE_NAME = "raw-ingest-suggestions";
export const SUGGESTIONS_KEY = "suggestions.json";
export const MAX_ENTRIES = 400;
export const TYPE_CAPS = { url: 100, score: 200, key: 50, fail: 50 };
// Dedupe memory per type. Large so "log once" holds in practice (score keys are
// politician + topic, bounded by roster × issue keys); a safety cap only.
export const MAX_SEEN = 50000;
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
  d.seen.score = scoreSeenByPair(d.seen.score);
  if (doc.fails && typeof doc.fails === "object") d.fails = { ...doc.fails };
  d.updated_at = doc.updated_at || null;
  return d;
}

const NEW_URL_RE = /^discovery: NEW (\S+?)\|(\S+) (\S+) \((.*)\) — added to this run's pull list$/;
const CROSS_RE = /^stance-score: cross-topic candidate (\{.*\})$/;
const OWN_RE = /^stance-score: candidate (\{.*\})$/;

/** Pull the interesting facts out of one run's log lines. Never throws. */
export function parseRunLines(lines = []) {
  const urls = [], scores = [], own = [], topics = new Set();
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
    if (m) {
      try {
        const c = JSON.parse(m[1]);
        if (c?.topic) topics.add(c.topic);
        if (c?.politician_id && (c.position === "support" || c.position === "oppose")) {
          own.push({ politician_id: c.politician_id, topic: c.topic, position: c.position, confidence: c.confidence, url: c.url });
        }
      } catch {}
    }
  }
  return { urls, scores, own, topics: [...topics] };
}

/** A held stance in the score memory: { position, url, on_topic, confidence }. */
const heldStance = (v) => {
  if (v === "support" || v === "oppose") return { position: v, url: null, on_topic: false, confidence: null }; // older docs
  if (v && (v.position === "support" || v.position === "oppose")) {
    return { position: v.position, url: v.url ?? null, on_topic: v.on_topic === true, confidence: typeof v.confidence === "number" ? v.confidence : null };
  }
  return null;
};
const sameUrl = (a, b) => Boolean(a && b) && String(a).replace(/\/+$/, "").toLowerCase() === String(b).replace(/\/+$/, "").toLowerCase();

/**
 * May `next` (a scored read) rewrite the stance `held` for its politician +
 * topic? Yes when nothing is held, when it is the same page re-read, or when an
 * on-topic page replaces a cross-topic one. Another on-topic page replaces an
 * on-topic stance only with a strictly higher confidence. A cross-topic read
 * from a different page never rewrites a held stance. A stance remembered by an
 * older doc (position only, no source) is adopted by the first read that
 * agrees with it; until then only an on-topic read replaces it.
 */
export function shouldReplaceStance(held, next) {
  const h = heldStance(held);
  if (!h) return true;
  if (sameUrl(h.url, next.url)) return true;
  if (next.on_topic && !h.on_topic) return true;
  if (next.on_topic && h.on_topic) return typeof next.confidence === "number" && typeof h.confidence === "number" && next.confidence > h.confidence;
  return false;
}

/** Score memory keyed by "politician|topic" → the held stance. Older docs
 *  keyed it by "politician|topic|url" and stored the position alone; those
 *  fold into their pair (latest position wins, insertion order = oldest
 *  first), so already-logged pairs stay logged. */
export function scoreSeenByPair(seen = {}) {
  const out = {};
  for (const [k, v] of Object.entries(seen || {})) {
    const h = heldStance(v);
    if (!h) continue;
    const [pid, topic] = k.split("|");
    if (!pid || !topic) continue;
    const pk = `${pid}|${topic}`;
    delete out[pk]; out[pk] = typeof v === "string" ? v : h;
  }
  return out;
}

/** Per-type caps first (oldest of each type dropped), then the overall limit. */
export function pruneEntries(entries, { caps = TYPE_CAPS, max = MAX_ENTRIES } = {}) {
  const left = { ...caps };
  const keep = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const cap = left[e.type];
    if (cap !== undefined) { if (cap <= 0) continue; left[e.type] = cap - 1; }
    keep.push(e);
  }
  keep.reverse();
  return keep.length > max ? keep.slice(keep.length - max) : keep;
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
export function foldRun(doc, { lines = [], report = {}, now = new Date(), relatedKeys = RELATED_ISSUE_KEYS, failThreshold = FAIL_THRESHOLD, maxEntries = MAX_ENTRIES, typeCaps = TYPE_CAPS } = {}) {
  const d = normaliseDoc(doc);
  const ts = now.toISOString();
  const added = [];
  const push = (type, details) => { const e = { ts, type, details }; d.entries.push(e); added.push(e); };
  const { urls, scores, own, topics } = parseRunLines(lines);
  const held = [];

  for (const u of urls) {
    const k = u.url.toLowerCase();
    if (d.seen.url[k]) continue;
    d.seen.url[k] = ts;
    push("url", u);
  }
  const remember = (k, s, on_topic) => {
    delete d.seen.score[k]; // most recent last for the cap
    d.seen.score[k] = { position: s.position, url: s.url ?? null, on_topic, confidence: typeof s.confidence === "number" ? s.confidence : null };
  };
  // On-topic reads: remembered (they outrank cross-topic reads), never logged.
  for (const s of own) {
    const k = `${s.politician_id}|${s.topic}`;
    if (shouldReplaceStance(d.seen.score[k], { ...s, on_topic: true })) remember(k, s, true);
  }
  for (const s of scores) {
    const k = `${s.politician_id}|${s.topic}`;
    const h = heldStance(d.seen.score[k]);
    if (h && h.position === s.position) {
      if (!h.url) remember(k, s, false); // an older doc's stance adopts its source
      continue;
    }
    if (!shouldReplaceStance(d.seen.score[k], { ...s, on_topic: false })) {
      held.push({ ...s, held_position: h.position, held_url: h.url, held_on_topic: h.on_topic });
      continue;
    }
    remember(k, s, false);
    push("score", h ? { ...s, previous_position: h.position } : s);
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

  d.entries = pruneEntries(d.entries, { caps: typeCaps, max: maxEntries });
  for (const k of Object.keys(d.seen)) d.seen[k] = capMap(d.seen[k], MAX_SEEN);
  d.fails = capMap(d.fails, MAX_FAILS_TRACKED);
  d.updated_at = ts;
  return { doc: d, added, held };
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
    log(`raw-ingest-suggestions: ${added.length} new entr${added.length === 1 ? "y" : "ies"} (url ${by("url")}, score ${by("score")}, key ${by("key")}, fail ${by("fail")}) · ${doc.entries.length} kept (max ${MAX_ENTRIES}; per type ${SUGGESTION_TYPES.map((t) => `${t} ${doc.entries.filter((e) => e.type === t).length}/${TYPE_CAPS[t]}`).join(", ")})`);
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
