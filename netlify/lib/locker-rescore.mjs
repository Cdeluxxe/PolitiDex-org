// ─────────────────────────────────────────────────────────────────────────────
// locker-rescore.mjs — re-read Evidence Locker items under the current rules
// ─────────────────────────────────────────────────────────────────────────────
// The Locker used to keep a strong item forever (W4), so a read made under older,
// weaker scorer rules stayed live after the rules were fixed. This pass re-reads
// every clear item (strong or weak) written under an OLDER rules version against
// the page it came from (the latest stored capture in the "raw-ingest" store)
// and keeps the NEW read when it differs:
//
//   · same page still reads a position on the topic → the item is rewritten at
//     its own key with today's read (side, confidence, strength, excerpt) and
//     carries the read it replaced under `rescored.from` — whether it changed
//     or not, so it is never picked up again under the same rules;
//   · the page now reads only a mention → rewritten as a mention (never a stance);
//   · the page no longer yields a candidate on that topic at all (e.g. a
//     cross-topic read of a page that does not address the topic) → the item
//     is RETIRED: moved to the "evidence-locker-retired" store (kept for audit,
//     with the reason) and removed from the Locker, so no surface serves it.
//
// Never touched: items an editor flagged (reviewed / needs_edit / hidden — the
// editor's call stands), items already at the current rules version, mentions,
// and video items that are not YouTube links (no stored transcript record).
//
// VIDEO ITEMS (YouTube watch links). Re-read from the stored page-shaped video
// record (type "video", timed segments) exactly as the video pipeline scores
// it — scoreRecordCandidates (long videos per time window, uncertain speakers
// as mentions) and lockerRawFor (the link at the second the cited words are
// spoken). A Locker key hashes the link, so when today's read cites another
// second the item is MOVED to the key of its new link (written there, old key
// deleted) — or, when that key already holds an item, the old one is dropped
// in its favour — so a rescore never leaves two items for one video and
// issue. Flagged items are never touched. rescoreVideoItems re-reads the
// video items of one politician (optionally one video) on demand, whatever
// their rules version.
// An item whose page has no stored capture is left as it is and counted.
//
// Scoring is exactly the cron's: scoreAllTopics on the stored page — under the
// item's own topic for an on-topic item, under its `page_topic` for a
// cross-topic item — then lockerDecision / buildLockerItem from
// evidence-locker-core.mjs (ground-truth pair, own-page and citation rules
// unchanged; the ground-truth file is read-only here too).
//
// After a politician's items are done, the politician's promoted stances are
// recomputed (syncPolitician), so a corrected read reaches the live card in the
// same pass. Curated rows and rows resting on reviewed evidence are never written.
//
// Resumable: politicians in sorted order, pages inside a politician in sorted
// order, inside a time budget; `state` (cursor + tallies) is persisted by the
// caller and passed back. A new RULES_VERSION starts a fresh pass.
//
// The cursor inside a politician is the KEY of the last page group handled
// (`page_after`), not a position. A group that was just re-scored is at the
// current rules and drops out of the list on the next run, so a stored
// position would skip groups nobody had handled yet (the phase9-v2 gap).
//
// CATCH-UP (CATCH_UP below). The first phase9-v2 pass resumed by position and
// marked itself complete with old-rule items left in high-volume politicians.
// A cursor at those rules without the catch-up mark is not trusted: a fresh
// pass runs over every politician (only items still at older rules are
// re-scored — the same eligibility as always), and every politician visited,
// plus every politician holding a live pipeline card, has their promotion
// recomputed, so cards that no longer qualify are withdrawn and drifted cards
// resynced. Once that pass completes the mark is stored and later passes —
// including the next RULES_VERSION bump — behave exactly as before.

import { RULES_VERSION, scoreAllTopics } from "./stance-score-core.mjs";
import { scoreRecordCandidates, lockerRawFor } from "./video-transcripts.mjs";
import { lockerKey, lockerDecision, buildLockerItem, storedStrength, reviewFor, withRescore, ownEvidenceRows, collapseRestatedItems, regradeStatedPosition } from "./evidence-locker-core.mjs";
import { itemOwnership, OWNERSHIP_VERSION } from "./page-ownership.mjs";
import { readLockerDocs, mapLimit } from "./locker-read.mjs";

// v2 (locker-own-v1): every item whose page is not the politician's own is
// retired, whatever its rules version or strength, and every politician whose
// served evidence loses foreign pages, site-menu text or repeated sentences has
// their promoted stances recomputed.
export const RESCORE_VERSION = "locker-rescore-v2";
export const RESCORE_STATE_KEY = "locker-rescore-state.json";
export const RETIRED_STORE_NAME = "evidence-locker-retired";
const RAW_READ_CONCURRENCY = 6;
/** The one-time catch-up pass for the phase9-v2 gap (see header). */
export const CATCH_UP = Object.freeze({ id: "phase9-v2-gap-1", rules_version: "phase9-v2" });
const catchUpApplies = (rulesVersion = RULES_VERSION) => rulesVersion === CATCH_UP.rules_version;

const isVideoItem = (doc) => /(?:youtube\.com|youtu\.be)\//i.test(String(doc?.link || "")) || /\b(?:youtube|video)\b/i.test(String(doc?.source_type || ""));
/** Video id of a YouTube watch link (with or without &t=NNs), else null. */
export const videoIdOfLink = (link) => (/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/i.exec(String(link || "")) || /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/i.exec(String(link || "")) || [])[1] || null;
/** A stored page-shaped video transcript record (what a video item is re-read from). */
export const isVideoRecord = (raw) => raw?.type === "video" && Array.isArray(raw?.segments) && raw.segments.length > 0 && typeof raw.body === "string";

/** Why an item is not re-scored, or null when it is. */
export function skipReason(doc, key, { flags = null, rulesVersion = RULES_VERSION } = {}) {
  if (!doc || !doc.politician_id || !doc.topic || !doc.link) return "unreadable";
  if (reviewFor(doc, key, flags)) return "flagged";
  const st = storedStrength(doc);
  if (st !== "strong" && st !== "weak") return "mention";
  if (String(doc.rules_version || "") === rulesVersion) return "current";
  // YouTube items are re-read from their stored transcript record; other video items are not.
  if (isVideoItem(doc) && !videoIdOfLink(doc.link)) return "video";
  return null;
}

/** The page topic an item was scored under (its own topic, or `page_topic` for a cross-topic read). */
export const pageTopicOf = (doc) => doc.page_topic || doc.topic;

/**
 * Today's read of `doc` from `raw` → { action, next?, reason, changed, from, to }.
 * action: 'rewrite' (next = the item to store) | 'retire'.
 * `scored` caches scoreAllTopics per page topic for this raw record.
 */
export function rescoreItem(doc, raw, { gt = null, scored = new Map(), at = new Date().toISOString() } = {}) {
  if (videoIdOfLink(doc?.link) && isVideoRecord(raw)) return rescoreVideoItem(doc, raw, { gt, scored, at });
  const pt = pageTopicOf(doc);
  let cands = scored.get(pt);
  if (!cands) { cands = scoreAllTopics({ ...raw, topic: pt }); scored.set(pt, cands); }
  const c = cands.find((x) => x.topic === doc.topic);
  const from = { position: doc.position, strength: storedStrength(doc), confidence: doc.confidence ?? null, rules_version: doc.rules_version ?? null };
  if (!c) return { action: "retire", reason: doc.page_topic ? `the ${doc.page_topic} page no longer reads a position on ${doc.topic} (cross-topic rules)` : "the page no longer yields a candidate on its topic", changed: true, from, to: null };
  const d = lockerDecision(c, raw, gt);
  if (!d.write) return { action: "retire", reason: `today's read is not admissible: ${d.reason}`, changed: true, from, to: { position: c.position, confidence: c.confidence } };
  const item = withRescore(buildLockerItem(c, raw, d.strength), doc, at);
  // The item stays at its own key even if the page now resolves to another URL.
  item.link = doc.link;
  const to = { position: item.position, strength: item.strength, confidence: item.confidence ?? null, rules_version: item.rules_version };
  const changed = to.position !== from.position || to.strength !== from.strength || to.confidence !== from.confidence;
  return { action: "rewrite", next: item, reason: d.reason, changed, from, to };
}

/**
 * Today's read of a YouTube Locker item from its stored video record — the
 * video pipeline's own scoring (scoreRecordCandidates + lockerRawFor). The
 * new item's link is the second today's read cites; `next.link` may differ
 * from the stored one (the caller moves the item, see moveOrRewrite).
 */
export function rescoreVideoItem(doc, raw, { gt = null, scored = new Map(), at = new Date().toISOString() } = {}) {
  const pt = pageTopicOf(doc);
  const ck = `video:${pt}`;
  let cands = scored.get(ck);
  if (!cands) { cands = scoreRecordCandidates({ ...raw, topic: pt }, { log: () => {} }); scored.set(ck, cands); }
  const hit = cands.find((x) => x.candidate.topic === doc.topic);
  const from = { position: doc.position, strength: storedStrength(doc), confidence: doc.confidence ?? null, rules_version: doc.rules_version ?? null };
  if (!hit) return { action: "retire", reason: doc.page_topic ? `the ${doc.page_topic} video no longer reads a position on ${doc.topic} (cross-topic rules)` : "the video no longer yields a candidate on its topic", changed: true, from, to: null };
  const forLocker = lockerRawFor(hit.candidate, hit.raw);
  const d = lockerDecision(hit.candidate, forLocker, gt);
  if (!d.write) return { action: "retire", reason: `today's read is not admissible: ${d.reason}`, changed: true, from, to: { position: hit.candidate.position, confidence: hit.candidate.confidence } };
  const item = withRescore(buildLockerItem(hit.candidate, forLocker, d.strength), doc, at);
  const to = { position: item.position, strength: item.strength, confidence: item.confidence ?? null, rules_version: item.rules_version, link: item.link };
  const changed = to.position !== from.position || to.strength !== from.strength || to.confidence !== from.confidence || item.link !== doc.link;
  return { action: "rewrite", next: item, reason: d.reason, changed, from, to, video: true };
}

/**
 * Store a rewritten item. Same key → in place. A video item whose link moved:
 * written at its new key (onlyIfNew) and the old key deleted; when the new
 * key is already taken (the pipeline wrote it), the old item is dropped in
 * its favour — never two items for one video and issue. Returns
 * "in_place" | "moved" | "merged".
 */
export async function moveOrRewrite(lockerStore, key, next, { flags = null } = {}) {
  const target = lockerKey(next);
  if (target === key) { await lockerStore.setJSON(key, next); return "in_place"; }
  const r = await lockerStore.setJSON(target, next, { onlyIfNew: true });
  if (r && r.modified === false) {
    // The new key is taken: today's read replaces it unless it is flagged or already current.
    const held = await lockerStore.get(target, { type: "json" }).catch(() => null);
    if (held && !reviewFor(held, target, flags) && String(held.rules_version || "") !== String(next.rules_version || "")) await lockerStore.setJSON(target, next);
  }
  await lockerStore.delete(key);
  return r && r.modified === false ? "merged" : "moved";
}

/**
 * Raw record of a video item. Video records are keyed
 * <pid>/<topic>/<source_id>/<video id>.json (one per video, many per channel
 * directory), so the item's own key is tried first, then any key of that
 * video id under the politician.
 */
async function videoRawFor(rawStore, idx, doc) {
  const id = videoIdOfLink(doc.link);
  const tryKey = async (k) => { const r = await rawStore.get(k, { type: "json" }).catch(() => null); return isVideoRecord(r) && (r.video_id === id || videoIdOfLink(r.link) === id) ? r : null; };
  if (doc.source_id) for (const t of [...new Set([doc.topic, doc.page_topic].filter(Boolean))]) {
    const r = await tryKey(`${doc.politician_id}/${t}/${doc.source_id}/${id}.json`);
    if (r) return r;
  }
  if (!idx.all) { const { blobs = [] } = (await rawStore.list({ prefix: `${doc.politician_id}/` })) || {}; idx.all = blobs.map((b) => b.key); }
  for (const k of idx.all.filter((k) => k.endsWith(`/${id}.json`)).sort().reverse()) {
    const r = await tryKey(k);
    if (r) return r;
  }
  return null;
}

/**
 * On demand: re-read one politician's YouTube Locker items (all, or one
 * `videoId`) from their stored video records, whatever their rules version.
 * deps: { lockerStore, rawStore, retiredStore?, flags, gt, log, now, dry }.
 * Returns { examined, rescored, moved, merged, retired, flagged, no_raw, items: [...] }.
 */
export async function rescoreVideoItems(pid, { videoId = null } = {}, deps = {}) {
  const { lockerStore, rawStore, retiredStore = null, flags = null, gt = null, log = console.log, dry = false } = deps;
  const now = deps.now || (() => new Date());
  const out = { examined: 0, rescored: 0, moved: 0, merged: 0, retired: 0, flagged: 0, no_raw: 0, items: [] };
  if (!lockerStore || !rawStore || !pid) return out;
  const { blobs = [] } = (await lockerStore.list({ prefix: `${pid}/` })) || {};
  const rows = await readLockerDocs(lockerStore, blobs.map((b) => b.key).sort());
  let idx = null;
  const scoredBy = new Map();
  for (const { key, doc } of rows) {
    const id = videoIdOfLink(doc?.link);
    if (!id || (videoId && id !== videoId)) continue;
    out.examined++;
    if (reviewFor(doc, key, flags)) { out.flagged++; continue; }
    const st = storedStrength(doc);
    if (st !== "strong" && st !== "weak") continue;
    idx = idx || (await rawIndexFor(rawStore, pid));
    const raw = await videoRawFor(rawStore, idx, doc);
    if (!raw) { out.no_raw++; log(`locker-rescore: NO VIDEO RECORD ${key} — ${doc.link} left as it is`); continue; }
    if (!scoredBy.has(id)) scoredBy.set(id, new Map());
    const r = rescoreVideoItem(doc, raw, { gt, scored: scoredBy.get(id), at: now().toISOString() });
    const kind = changeKind(r);
    log(`locker-rescore: VIDEO ${kind.toUpperCase()} ${key} — ${r.from.position}/${r.from.strength}@${r.from.confidence} (${r.from.rules_version || "unversioned"}) → ${r.to ? `${r.to.position}/${r.to.strength || "-"}@${r.to.confidence}${r.to.link && r.to.link !== doc.link ? ` at ${r.to.link}` : ""}` : "retired"} — ${r.reason}`);
    out.items.push({ key, kind, from: r.from, to: r.to });
    if (dry) continue;
    if (r.action === "rewrite") {
      const how = await moveOrRewrite(lockerStore, key, r.next, { flags });
      out.rescored++;
      if (how === "moved") out.moved++;
      if (how === "merged") out.merged++;
    } else {
      if (retiredStore) await retiredStore.setJSON(key, { ...doc, retired: { at: now().toISOString(), reason: r.reason, rules_version: RULES_VERSION } });
      await lockerStore.delete(key);
      out.retired++;
    }
  }
  return out;
}

/** Kind of change, for the tallies. */
export function changeKind(r) {
  if (r.action === "retire") return "retired";
  if (!r.changed) return "unchanged";
  const clear = (p) => p === "support" || p === "oppose";
  if (clear(r.from.position) && clear(r.to.position) && r.from.position !== r.to.position) return "flipped";
  if (r.to.strength === "mention") return "to_mention";
  const rank = { mention: 1, weak: 2, strong: 3 };
  if (rank[r.to.strength] < rank[r.from.strength]) return "downgraded";
  if (rank[r.to.strength] > rank[r.from.strength]) return "upgraded";
  return "confidence";
}

export function freshState(rulesVersion = RULES_VERSION) {
  return {
    version: RESCORE_VERSION, rules_version: rulesVersion, pid_index: 0, page_index: 0, page_after: null, complete: false, started_at: null, updated_at: null,
    // A pass under the catch-up rules version carries the catch-up mark and recomputes every politician.
    catch_up: catchUpApplies(rulesVersion) ? { id: CATCH_UP.id, recompute_all: true, live_queued: false, recomputed: 0 } : null,
    tallies: { examined: 0, eligible: { strong: 0, weak: 0 }, skipped: {}, no_raw: 0, outcomes: { strong: {}, weak: {} },
      ownership: { version: OWNERSHIP_VERSION, retired: { strong: 0, weak: 0, mention: 0 }, by_kind: {}, site_menu: 0, repeated: 0, politicians_recomputed: 0 } },
    pending_sync: [],
  };
}
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

/** Latest capture key per raw directory under `<pid>/` → { bySource: {source_id: key}, dirs: [latest keys] }. */
export async function rawIndexFor(rawStore, pid) {
  const { blobs = [] } = (await rawStore.list({ prefix: `${pid}/` })) || {};
  const latest = {};
  for (const { key } of blobs) {
    const dir = key.slice(0, key.lastIndexOf("/"));
    if (!latest[dir] || key > latest[dir]) latest[dir] = key;
  }
  const bySource = {};
  for (const [dir, key] of Object.entries(latest)) {
    const sid = dir.split("/")[2];
    if (sid && (!bySource[sid] || key > bySource[sid])) bySource[sid] = key;
  }
  return { bySource, dirs: Object.values(latest).sort() };
}

/**
 * One pass step. deps: { lockerStore, rawStore, retiredStore, flags, gt, budgetMs,
 * now, log, dry, sync(pid) }. Returns the next state. `dry` reads and scores but
 * writes nothing (a report of what the pass would do).
 */
export async function rescoreStep(state, deps) {
  const { lockerStore, rawStore, retiredStore = null, flags = null, gt = null, log = console.log, dry = false, sync = null } = deps;
  const now = deps.now || (() => new Date());
  const t0 = Date.now();
  const budget = deps.budgetMs ?? 20_000;
  const over = () => Date.now() - t0 > budget;
  const sameRules = state && state.rules_version === RULES_VERSION && state.version === RESCORE_VERSION;
  // A cursor under the catch-up rules that never ran the catch-up is not trusted (see header).
  const needsCatchUp = sameRules && catchUpApplies() && state.catch_up?.id !== CATCH_UP.id;
  let st = sameRules && !needsCatchUp ? state : freshState();
  if (needsCatchUp) log(`locker-rescore: ${CATCH_UP.id} — the stored ${RULES_VERSION} cursor is not trusted; starting a full re-score and recomputing every politician`);
  else if (st !== state && state) log(`locker-rescore: rules ${state.rules_version || "?"} → ${RULES_VERSION} — starting a fresh pass`);
  if (st.complete) return st;
  st = { ...st, started_at: st.started_at || now().toISOString() };
  // A cursor written before page_after existed resumes at the start of its politician (nothing is skipped).
  if (st.page_after === undefined) st.page_after = null;
  const T = st.tallies;
  const CU = st.catch_up && st.catch_up.recompute_all ? (st.catch_up = { ...st.catch_up }) : null;

  // Catch-up: politicians holding a live pipeline card but no Locker items are recomputed too.
  if (CU && !CU.live_queued && sync && !dry && deps.livePids) {
    try {
      const { directories: dirs = [] } = (await lockerStore.list({ directories: true })) || {};
      const inLocker = new Set(dirs.map((d) => String(d).replace(/\/$/, "")));
      const extra = [...new Set(await deps.livePids())].filter((p) => p && !inLocker.has(p) && !st.pending_sync.includes(p)).sort();
      st.pending_sync = [...st.pending_sync, ...extra];
      CU.live_queued = true;
      if (extra.length) log(`locker-rescore: ${CATCH_UP.id} — ${extra.length} politician(s) with live cards and no Locker items queued for recompute`);
    } catch (e) { log(`locker-rescore: ${CATCH_UP.id} — live cards not listed yet (${e?.message || e})`); }
  }

  // Politicians whose recompute was deferred by the budget go first.
  while (st.pending_sync.length && !over() && sync && !dry) {
    const pid = st.pending_sync[0];
    try { await sync(pid); } catch (e) { log(`locker-rescore: recompute for ${pid} deferred — ${e?.message || e}`); break; }
    st.pending_sync = st.pending_sync.slice(1);
    if (CU) CU.recomputed++;
  }

  const { directories = [] } = (await lockerStore.list({ directories: true })) || {};
  const pids = directories.map((d) => String(d).replace(/\/$/, "")).filter(Boolean).sort();
  while (st.pid_index < pids.length && !over()) {
    const pid = pids[st.pid_index];
    const { blobs = [] } = (await lockerStore.list({ prefix: `${pid}/` })) || {};
    const allDocs = await readLockerDocs(lockerStore, blobs.map((b) => b.key).sort());
    let touched = false;
    // First visit to this politician in the pass (tallies are counted once).
    const firstVisit = st.page_after == null;
    // locker-own-v1: an item from a page that is not the politician's own is
    // retired (kept in the retired store with the reason), whatever its rules
    // version or strength. Editor-flagged items are left to the editor.
    const OW = (T.ownership ||= { version: OWNERSHIP_VERSION, retired: { strong: 0, weak: 0, mention: 0 }, by_kind: {}, site_menu: 0, repeated: 0, politicians_recomputed: 0 });
    const docs = [];
    for (const row of allDocs) {
      const { key, doc } = row;
      if (doc && doc.politician_id && doc.link && !reviewFor(doc, key, flags)) {
        const o = itemOwnership(doc);
        if (!o.own) {
          const was = storedStrength(doc) || "mention";
          OW.retired[was] = (OW.retired[was] || 0) + 1;
          bump(OW.by_kind, o.kind);
          log(`locker-rescore: NOT OWN PAGE ${key} — ${doc.position}/${was} — ${o.reason}`);
          if (!dry) {
            if (retiredStore) await retiredStore.setJSON(key, { ...doc, retired: { at: now().toISOString(), reason: `not the politician's own page (${o.kind}): ${o.reason}`, ownership_version: OWNERSHIP_VERSION } });
            await lockerStore.delete(key);
          }
          touched = true;
          continue;
        }
      }
      docs.push(row);
    }
    // Site menus and repeated sentences are not stored differently — they are
    // dropped when served (ownEvidenceRows) — but the politician's stances must
    // be recomputed for the drop to reach the live cards.
    if (firstVisit) {
      const served = docs.filter(({ key, doc }) => doc && doc.politician_id === pid && doc.link && reviewFor(doc, key, flags)?.status !== "hidden")
        .map(({ key, doc }) => ({ key, doc: regradeStatedPosition(doc), review: reviewFor(doc, key, flags) }));
      const { dropped } = ownEvidenceRows(collapseRestatedItems(served));
      OW.site_menu += dropped.menu;
      OW.repeated += dropped.repeated;
      if (dropped.menu || dropped.repeated) touched = true;
    }
    // Group eligible items by the page they came from.
    const groups = new Map();
    for (const { key, doc } of docs) {
      if (firstVisit) T.examined++;
      const why = skipReason(doc, key, { flags });
      if (why) { if (firstVisit) bump(T.skipped, why); continue; }
      const gk = doc.source_id ? `sid:${doc.source_id}` : `url:${doc.link}`;
      if (!groups.has(gk)) groups.set(gk, []);
      groups.get(gk).push({ key, doc });
    }
    const order = [...groups.keys()].sort();
    if (firstVisit) for (const g of order) for (const { doc } of groups.get(g)) T.eligible[storedStrength(doc)]++;
    // Resume after the last group handled, by key: groups re-scored on an earlier
    // run have dropped out of `order`, so a position would skip unhandled ones.
    const todo = st.page_after == null ? order : order.filter((g) => g > st.page_after);
    let idx = null, gi = 0;
    while (gi < todo.length && !over()) {
      const gk = todo[gi];
      const group = groups.get(gk);
      idx = idx || (await rawIndexFor(rawStore, pid));
      const first = group[0].doc;
      let raw = null;
      if (videoIdOfLink(first.link)) raw = await videoRawFor(rawStore, idx, first);
      else if (first.source_id && idx.bySource[first.source_id]) raw = await rawStore.get(idx.bySource[first.source_id], { type: "json" }).catch(() => null);
      if (!raw && !videoIdOfLink(first.link)) {
        // Older items carry no source_id: find the page by its address.
        const found = await mapLimit(idx.dirs.slice(0, 60), RAW_READ_CONCURRENCY, async (k) => {
          const r = await rawStore.get(k, { type: "json" }).catch(() => null);
          return r && (r.url === first.link || r.final_url === first.link) ? r : null;
        });
        raw = found.find(Boolean) || null;
      }
      if (!raw || typeof raw.body !== "string") {
        T.no_raw += group.length;
        log(`locker-rescore: NO PAGE ${pid} ${first.link} — ${group.length} item(s) left as they are (no stored capture)`);
        st.page_index++; st.page_after = gk; gi++;
        continue;
      }
      const scored = new Map();
      for (const { key, doc } of group) {
        const was = storedStrength(doc);
        let r;
        try { r = rescoreItem(doc, raw, { gt, scored, at: now().toISOString() }); }
        catch (e) { log(`locker-rescore: ERROR ${key} — ${e?.message || e}`); bump(T.skipped, "error"); continue; }
        const kind = changeKind(r);
        bump(T.outcomes[was], kind);
        if (kind !== "unchanged") log(`locker-rescore: ${kind.toUpperCase()} ${key} — ${r.from.position}/${r.from.strength}@${r.from.confidence} (${r.from.rules_version || "unversioned"}) → ${r.to ? `${r.to.position}/${r.to.strength || "-"}@${r.to.confidence}` : "retired"} — ${r.reason}`);
        if (dry) continue;
        if (r.action === "rewrite") {
          if (r.video) { const how = await moveOrRewrite(lockerStore, key, r.next, { flags }); if (how !== "in_place") { bump(T, `video_${how}`); log(`locker-rescore: VIDEO ${how.toUpperCase()} ${key} → ${lockerKey(r.next)}`); } }
          else await lockerStore.setJSON(key, r.next);
        } else {
          if (retiredStore) await retiredStore.setJSON(key, { ...doc, retired: { at: now().toISOString(), reason: r.reason, rules_version: RULES_VERSION } });
          await lockerStore.delete(key);
        }
        touched = true;
      }
      st.page_index++; st.page_after = gk; gi++;
    }
    // A politician whose pass is split across runs keeps the "touched" mark.
    if (touched) st.touched_pid = pid;
    if (gi < todo.length) break; // budget ran out inside this politician
    if (st.touched_pid === pid) { touched = true; st.touched_pid = null; }
    // Catch-up: every politician visited is recomputed, touched or not.
    if ((touched || CU) && sync && !dry) {
      let synced = false;
      if (!over()) {
        try { await sync(pid); synced = true; }
        catch (e) { log(`locker-rescore: recompute for ${pid} deferred — ${e?.message || e}`); }
      }
      if (!synced) st.pending_sync = [...st.pending_sync, pid];
      else { OW.politicians_recomputed++; if (CU) CU.recomputed++; }
    }
    st.pid_index++;
    st.page_index = 0;
    st.page_after = null;
  }
  st.complete = st.pid_index >= pids.length && !st.pending_sync.length && !(CU && !CU.live_queued && sync && !dry && deps.livePids);
  // The catch-up is done once its pass completes: later passes recompute only touched politicians again.
  if (st.complete && CU && !dry) st.catch_up = { ...CU, recompute_all: false, completed_at: now().toISOString() };
  st.updated_at = now().toISOString();
  return st;
}

/** One summary line for the run log. */
export function rescoreSummaryLine(st) {
  const T = st.tallies;
  const o = (s) => Object.entries(T.outcomes[s] || {}).map(([k, n]) => `${k} ${n}`).join(", ") || "none yet";
  return `locker-rescore: ${st.complete ? "COMPLETE" : "in progress"} under ${st.rules_version} — politician ${st.pid_index}` +
    ` · examined ${T.examined} · eligible strong ${T.eligible.strong}, weak ${T.eligible.weak}` +
    ` · strong: ${o("strong")} · weak: ${o("weak")} · no stored page ${T.no_raw}` +
    ` · skipped ${Object.entries(T.skipped).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}` +
    (T.ownership ? ` · not own page retired: strong ${T.ownership.retired.strong}, weak ${T.ownership.retired.weak}, mention ${T.ownership.retired.mention}` +
      ` · site menu ${T.ownership.site_menu} · repeated ${T.ownership.repeated} · recomputed ${T.ownership.politicians_recomputed}` : "") +
    (st.catch_up ? ` · ${st.catch_up.id}: ${st.catch_up.recompute_all ? "in progress" : "done"}, ${st.catch_up.recomputed || 0} politician(s) recomputed` : "");
}
