#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// video-requeue-failed.mjs — put transiently failed videos back in the queue
// ─────────────────────────────────────────────────────────────────────────────
// The transcript cache (Blobs "video-transcripts", video/<id>.json) is write-once:
// a video that failed MAX_ATTEMPTS times is cached as status "failed" and never
// tried again. Some of those failures are not about the video at all — a Gemini
// 429 burst, a "fetch failed" from the AI Gateway, a 403 burst (all 94 of the
// Nov 21 403s were public videos that transcribe fine on a later call), or a
// truncated JSON reply. This script finds those, and for each one:
//
//   1. finds the video's mention record in the "raw-ingest" store (the record
//      the channel pull wrote; it carries the politician, topic and source),
//   2. reads the title from YouTube oEmbed (the queue entry carries it),
//   3. deletes the failed cache doc, then
//   4. queues the video with enqueueTranscript() — the same write-once queue
//      entry the raw-ingest cron writes, attempts 0.
//
// The background worker then transcribes it on its next run. Nothing about
// transcription, scoring or the Locker is touched. A video whose failure is
// not one of the transient kinds below is left alone and listed.
//
// USAGE (needs NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN)
//   node scripts/video-requeue-failed.mjs            # dry run: list what would be re-queued
//   node scripts/video-requeue-failed.mjs --apply    # re-queue them
// ─────────────────────────────────────────────────────────────────────────────
import { getStore } from "@netlify/blobs";
import { enqueueTranscript, cacheKey, TRANSCRIPT_STORE_NAME } from "../netlify/lib/video-transcripts.mjs";
import { RAW_STORE_NAME } from "../netlify/lib/raw-ingest-core.mjs";

const APPLY = process.argv.includes("--apply");
const TRANSIENT = /fetch failed|"code":\s*(?:429|403|500|502|503|504)|Too Many Requests|Forbidden|Unterminated string|Unexpected end of JSON|timed? ?out/i;

const opts = { siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN };
if (!opts.siteID || !opts.token) { console.error("NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN must be set"); process.exit(1); }
const ts = getStore({ name: TRANSCRIPT_STORE_NAME, consistency: "strong", ...opts });
const raw = getStore({ name: RAW_STORE_NAME, ...opts });

const cached = (await ts.list({ prefix: "video/" })).blobs.map((b) => b.key);
const failed = [];
for (let i = 0; i < cached.length; i += 40) {
  const docs = await Promise.all(cached.slice(i, i + 40).map((k) => ts.get(k, { type: "json" }).catch(() => null)));
  for (const d of docs) if (d?.status === "failed") failed.push(d);
}
const transient = failed.filter((d) => TRANSIENT.test(String(d.error || "")));
const kept = failed.filter((d) => !TRANSIENT.test(String(d.error || "")));
console.log(`${failed.length} failed video(s) in the cache · ${transient.length} transient · ${kept.length} left alone`);
for (const d of kept) console.log(`  left alone: ${d.video_id} — ${String(d.error || "").slice(0, 100)}`);
if (!transient.length) process.exit(0);

// The mention record(s) for each video: <pid>/<topic>/<source>/<videoId>.json.
const ids = new Set(transient.map((d) => d.video_id));
const records = new Map();
for await (const page of raw.list({ paginate: true })) {
  for (const b of page.blobs) {
    const m = b.key.match(/\/([^/]+)\.json$/);
    if (m && ids.has(m[1])) (records.get(m[1]) || records.set(m[1], []).get(m[1])).push(b.key);
  }
}

let queued = 0;
for (const d of transient) {
  const id = d.video_id;
  const keys = records.get(id) || [];
  let rec = null;
  for (const k of keys) { const r = await raw.get(k, { type: "json" }).catch(() => null); if (r && !r.body) { rec = r; break; } rec ||= r; }
  if (!rec?.politician_id) { console.log(`  skip ${id} — no raw-ingest record to take the source from`); continue; }
  const src = {
    politician_id: rec.politician_id, topic: rec.topic, source_type: rec.source_type,
    ...(rec.source_class ? { source_class: rec.source_class } : {}), ...(rec.source_id ? { source_id: rec.source_id } : {}), url: rec.url,
  };
  if (!APPLY) { console.log(`  would re-queue ${id} (${src.politician_id}) — ${String(d.error || "").slice(0, 70)}`); continue; }
  let title = "";
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) title = (await r.json()).title || "";
  } catch { /* the title is optional */ }
  await ts.delete(cacheKey(id));
  if (await enqueueTranscript(ts, src, { videoId: id, title, published: rec.date || "" })) queued++;
}
console.log(APPLY ? `re-queued ${queued} video(s); queue now ${(await ts.list({ prefix: "queue/" })).blobs.length}` : "dry run — pass --apply to re-queue");
