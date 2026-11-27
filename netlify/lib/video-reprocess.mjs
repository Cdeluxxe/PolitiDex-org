// ─────────────────────────────────────────────────────────────────────────────
// video-reprocess.mjs — on-demand re-transcription and re-scoring of videos
// ─────────────────────────────────────────────────────────────────────────────
// Nothing here runs by itself over the whole cache. An editor lists the
// videos to re-process in db/video-reprocess.json:
//
//   { "requests": [
//       { "id": "2026-11-28-grijalva", "action": "retranscribe", "politician_id": "adelita_grijalva", "video_id": "G1xkgCCvPvY", "reason": "pre-v3 prompt" },
//       { "id": "2026-11-28-doe-rescore", "action": "rescore", "politician_id": "pat_doe", "video_id": "AAAAAAAAAAA" } ] }
//
// and the background transcriber (video-transcribe.mts) works each request
// ONCE (by id; done ids are remembered in REPROCESS_STATE_KEY in the
// transcript store):
//   · retranscribe — the video is queued for transcription with the current
//     prompt (requestRetranscribe: a doc already at the current versions is
//     skipped unless "force": true; a failed re-run keeps the old transcript).
//     The queue source is read from the stored raw video record, else from
//     the request's own topic / source_type. When the new transcript is
//     recorded, the video's Locker items are re-read from it first
//     (rescoreVideoItems — moved to their new timestamp key, never doubled),
//     then the usual writer adds any new issue.
//   · rescore — the politician's Locker items from that video (or all their
//     video items, without video_id) are re-read from the stored video record
//     under the current rules, whatever their rules version.
// Flagged (editor-reviewed) items are never touched.

import { requestRetranscribe, retranscribeSrcFromRecord, scoreIntoLocker } from "./video-transcripts.mjs";
import { rescoreVideoItems } from "./locker-rescore.mjs";

export const REPROCESS_STATE_KEY = "reprocess-done.json";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Valid requests from the file (bad rows are dropped with a reason). */
export function readRequests(file) {
  const rows = Array.isArray(file?.requests) ? file.requests : [];
  const ok = [], bad = [];
  for (const r of rows) {
    const why = !r?.id ? "no id" : !/^(?:retranscribe|rescore)$/.test(String(r.action || "")) ? `unknown action ${r.action}` : !r.politician_id ? "no politician_id"
      : r.action === "retranscribe" && !VIDEO_ID.test(String(r.video_id || "")) ? "no video_id" : r.video_id && !VIDEO_ID.test(String(r.video_id)) ? "bad video_id" : null;
    if (why) bad.push({ id: r?.id || null, why }); else ok.push({ ...r, id: String(r.id) });
  }
  return { ok, bad };
}

async function rawVideoRecord(rawStore, pid, videoId) {
  if (!rawStore) return null;
  try {
    const { blobs = [] } = (await rawStore.list({ prefix: `${pid}/` })) || {};
    for (const { key } of blobs.filter((b) => b.key.endsWith(`/${videoId}.json`)).sort((a, b) => b.key.localeCompare(a.key))) {
      const r = await rawStore.get(key, { type: "json" }).catch(() => null);
      if (r?.type === "video" && Array.isArray(r.segments) && r.segments.length) return r;
    }
  } catch { /* not readable this run */ }
  return null;
}

/**
 * Work the requests not done yet. Never throws. Returns { done: [...], skipped: [...] }.
 * deps: { transcriptStore, rawStore, lockerStore, retiredStore?, flags, gt, log, now, sync? (pid) }.
 */
export async function processReprocessRequests(file, deps = {}) {
  const { transcriptStore, rawStore, lockerStore, log = console.log } = deps;
  const now = deps.now || (() => new Date());
  const out = { done: [], skipped: [] };
  if (!transcriptStore) return out;
  const { ok, bad } = readRequests(file);
  for (const b of bad) log(`video-reprocess: IGNORED request ${b.id || "(no id)"} — ${b.why}`);
  if (!ok.length) return out;
  let state = null;
  try { state = await transcriptStore.get(REPROCESS_STATE_KEY, { type: "json" }); } catch { state = null; }
  const done = { ...(state?.done || {}) };
  for (const r of ok) {
    if (done[r.id]) continue;
    try {
      if (r.action === "retranscribe") {
        const rec = await rawVideoRecord(rawStore, r.politician_id, r.video_id);
        const src = retranscribeSrcFromRecord(rec) || { politician_id: r.politician_id, topic: r.topic || "cost_living", source_type: r.source_type || "official YouTube video (own channel) — video post", source_class: "youtube_video", url: `https://www.youtube.com/watch?v=${r.video_id}` };
        const q = await requestRetranscribe(transcriptStore, { videoId: r.video_id, src, title: rec?.title || r.title || "", channel: rec?.channel || "", published: rec?.date || "", reason: r.reason || r.id, force: !!r.force, at: now().toISOString() });
        log(`video-reprocess: ${r.id} RETRANSCRIBE ${r.politician_id} ${r.video_id} — ${q.queued ? "queued" : "not queued"}: ${q.reason}`);
        done[r.id] = { at: now().toISOString(), action: r.action, queued: q.queued, reason: q.reason };
      } else {
        const res = await rescoreVideoItems(r.politician_id, { videoId: r.video_id || null }, deps);
        log(`video-reprocess: ${r.id} RESCORE ${r.politician_id}${r.video_id ? " " + r.video_id : " (all video items)"} — ${res.examined} item(s), ${res.rescored} re-read (${res.moved} moved, ${res.merged} merged), ${res.retired} retired, ${res.flagged} flagged left alone, ${res.no_raw} without a stored video record`);
        if ((res.rescored || res.retired) && deps.sync) {
          try { await deps.sync(r.politician_id); } catch (e) { log(`video-reprocess: stated positions for ${r.politician_id} recompute later — ${e?.message || e}`); }
        }
        done[r.id] = { at: now().toISOString(), action: r.action, examined: res.examined, rescored: res.rescored, retired: res.retired };
      }
      out.done.push(r.id);
    } catch (e) {
      out.skipped.push({ id: r.id, error: String(e?.message || e) });
      log(`video-reprocess: ${r.id} failed — ${e?.message || e} (retried next run)`);
    }
  }
  if (out.done.length) {
    try { await transcriptStore.setJSON(REPROCESS_STATE_KEY, { updated_at: now().toISOString(), done }); }
    catch (e) { log(`video-reprocess: state not saved — ${e?.message || e}`); }
  }
  return out;
}

/**
 * The worker's record hook for a re-transcribed video: the video's existing
 * Locker items are re-read from the new record (moved, never doubled), then
 * the usual writer adds what is new. Other records: scoreIntoLocker as before.
 */
export async function scoreRecordIntoLocker(rec, deps = {}) {
  const { lockerStore, rawStore, gt = null, flags = null, log = console.log } = deps;
  let rescored = null;
  if (rec?.retranscribed && rec.video_id && lockerStore && rawStore) {
    rescored = await rescoreVideoItems(rec.politician_id, { videoId: rec.video_id }, deps);
    log(`video-reprocess: re-transcribed ${rec.politician_id} ${rec.video_id} — ${rescored.rescored} existing Locker item(s) re-read (${rescored.moved} moved, ${rescored.merged} merged), ${rescored.retired} retired`);
  }
  const r = await scoreIntoLocker(rec, { lockerStore, gt, flags, log });
  return { ...r, rescored };
}
