// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-social.mjs — official social sources for the raw-ingest rotation
// ─────────────────────────────────────────────────────────────────────────────
// YouTube only for now (X and Facebook need paid / page-token API access and
// show no posts to an anonymous fetch, so they are not configured).
//
// One configured channel = ONE source slot in the planner. Pulling it reads the
// channel's public Atom feed (recent uploads, with title + description). Per
// new video:
//   · a cached transcript in which the politician speaks
//     (video-transcripts.mjs) → ONE page-shaped raw record (body = the
//     politician's own words, title as a field, `segments` for timestamped links, tier 2) that IS
//     handed to the scorer / Locker hook, exactly like a campaign page;
//   · otherwise the unscored item in the locked shape —
//       type "video" · date (YYYY-MM-DD) · link (watch URL) · excerpt · weight
//     plus the identity fields every raw record carries — with the description
//     (the title when it is blank) as the excerpt, and, when nothing is cached
//     yet, a queue entry for the background transcriber. One
//     "raw-ingest: TRANSCRIPT FALLBACK …" line per such video.
// Videos already in the store (same channel + video id key) are skipped, so a
// channel costs one feed fetch per run once its recent uploads are stored.
//
// TRANSCRIPTS. The watch page cannot be read from a server (YouTube answers
// with a bot check and no caption track), so captions are no longer scraped.
// Transcripts come from the background transcriber (Gemini via the Netlify AI
// Gateway, cached once per video id); this module only reads that cache.
//
// CITED OWN-CHANNEL VIDEOS (source_class "youtube_video", evidence tier 2).
// Title and channel come from YouTube oEmbed (youtube-oembed.mjs, shared with
// /api/yt-verify). With a cached transcript the video is scored like a page;
// without one it is queued and the run moves on (not a failure).

import { cleanReadableText } from "./evidence-locker-core.mjs";
import { fetchOEmbed } from "./youtube-oembed.mjs";
import { readTranscript, hasOwnSpeech, enqueueTranscript, buildVideoRecord, videoRecordKey } from "./video-transcripts.mjs";

export const SOCIAL_CLASSES = {
  youtube: "official YouTube channel — recent videos (transcript, else description)",
  youtube_video: "video already cited from the politician's own YouTube channel — transcript (else description), scored as tier-2 evidence",
};
export const SOCIAL_CLASS_SET = new Set(Object.keys(SOCIAL_CLASSES));
export const isSocial = (s) => SOCIAL_CLASS_SET.has(s?.source_class);

export const YOUTUBE_MAX_VIDEOS = 3;          // most recent uploads read per channel per run
export const SOCIAL_FEED_TIMEOUT_MS = 6_000;  // channel feed fetch
export const VIDEO_META_TIMEOUT_MS = 6_000;   // oEmbed lookup for one cited video
export const SOCIAL_EXCERPT_MAX = 280;        // same ceiling as a Locker excerpt
export const SOCIAL_WEIGHT = "mention";       // unscored: the lowest weight

const UA = "PolitiDex raw-ingest (+https://politidex.fyi)";

export const youtubeFeedUrl = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
export const youtubeWatchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

const decode = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]).trim() : ""; };

/** Parse a YouTube channel Atom feed → [{ video_id, title, published, description }], newest first. */
export function parseYouTubeFeed(xml) {
  const out = [];
  for (const m of String(xml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const video_id = tag(e, "yt:videoId");
    if (!/^[A-Za-z0-9_-]{11}$/.test(video_id)) continue;
    out.push({ video_id, title: tag(e, "title"), published: tag(e, "published"), description: tag(e, "media:description") });
  }
  return out.sort((a, b) => String(b.published).localeCompare(String(a.published)));
}

export function trimExcerpt(s, max = SOCIAL_EXCERPT_MAX) {
  // A mention excerpt keeps only clean readable text (see cleanReadableText).
  const t = cleanReadableText(String(s || "")).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** The 11-character video id of a watch / youtu.be / embed URL, or null. */
export function youtubeVideoId(url) {
  const m = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(String(url || ""));
  return m ? m[1] : null;
}

export function youtubeItemKey(src, videoId) {
  return videoRecordKey(src, videoId);
}

async function storedRecord(store, key) {
  if (typeof store?.get !== "function") return null;
  try {
    let v = await store.get(key);
    if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* present, unreadable */ } }
    return v ?? null;
  } catch { return null; }
}

/**
 * A video with a cached transcript in which the politician speaks: store the
 * page-shaped record and run the scorer / Locker hook on it. Returns the key,
 * or null when the cache holds no words by the politician.
 */
async function storeTranscriptRecord(src, videoId, doc, { store, onRecord, fetchedAt, title, published, channel, storeName }) {
  if (!hasOwnSpeech(doc)) return null;
  const record = buildVideoRecord({ src, videoId, title, doc, fetchedAt, published, channel });
  const key = videoRecordKey(src, videoId);
  await store.setJSON(key, record);
  console.log(`raw-ingest: OK ${youtubeWatchUrl(videoId)} → ${storeName}/${key} (${record.body_chars} chars, transcript (${doc.provider || "cached"}), ${record.segments.length} timed segment(s), tier 2)`);
  if (onRecord) {
    try { await onRecord(Object.freeze({ ...record, key })); }
    catch (e) { console.log(`raw-ingest: hook error for ${key} — ${e?.message || e}`); }
  }
  return key;
}

/** The unscored mention item for a video with no usable transcript (locked item shape). */
function mentionRecord(src, v, excerpt, fetchedAt) {
  return {
    type: "video",
    date: String(v.published || fetchedAt).slice(0, 10),
    link: youtubeWatchUrl(v.video_id),
    excerpt,
    weight: SOCIAL_WEIGHT,
    politician_id: src.politician_id,
    topic: src.topic,
    source_type: src.source_type,
    source_id: src.source_id,
    url: src.url,
    fetched_at: fetchedAt,
  };
}

/** Why a video has no transcript to score, for the TRANSCRIPT FALLBACK line. */
const fallbackWhy = (doc, queued) => !doc
  ? (queued ? "transcript queued for the background transcriber" : "no transcript cached (no transcript store)")
  : doc.status === "failed" ? `transcription failed (${doc.error || "error"})`
  : doc.status === "empty" ? "no speech in the video"
  : "the politician does not speak in it";

/**
 * Pull one cited own-channel video (source_class "youtube_video"). Never
 * throws. Title + channel come from oEmbed (the watch page is a bot check to
 * server fetches). With a cached transcript in which the politician speaks it
 * writes ONE page-shaped raw record and runs `onRecord` on it, so the scorer
 * and the Locker writer read it like any page. Without one, the video is
 * queued for the background transcriber (`transcriptStore`) and the run moves
 * on — that is not a failure; the background run scores it once transcribed.
 */
export async function pullYouTubeVideo(src, { fetch, store, now = () => new Date(), onRecord, log = console.log, storeName = "raw-ingest", transcriptStore = null }) {
  const fetchedAt = now().toISOString();
  const stats = { videos: 1, stored: 0, transcript: 0, fallback: 0, seen: 0, queued: 0 };
  const id = youtubeVideoId(src.url);
  try {
    if (!id) throw new Error("not a YouTube video URL");
    const meta = await fetchOEmbed(id, { fetch, timeoutMs: VIDEO_META_TIMEOUT_MS });
    if (!meta.ok) throw new Error(`oEmbed ${meta.status ? `HTTP ${meta.status}` : "unreachable"} — ${meta.error}`);
    const doc = await readTranscript(transcriptStore, id);
    if (hasOwnSpeech(doc)) {
      const key = await storeTranscriptRecord(src, id, doc, { store, onRecord, fetchedAt, title: meta.title, channel: meta.channel, storeName });
      stats.stored++; stats.transcript++;
      return { ok: true, key, url: src.url, fetched_at: fetchedAt, youtube: stats };
    }
    const queued = !doc && transcriptStore ? await enqueueTranscript(transcriptStore, src, { videoId: id, title: meta.title, channel: meta.channel }) : false;
    if (queued) stats.queued++;
    const pending = !doc && transcriptStore;
    stats.fallback++;
    log(`raw-ingest: TRANSCRIPT FALLBACK ${src.politician_id} ${youtubeWatchUrl(id)} — ${fallbackWhy(doc, pending)} → ${pending ? "nothing scored this run" : "video title (mention)"}`);
    if (pending) return { ok: true, key: null, queued: true, url: src.url, fetched_at: fetchedAt, youtube: stats };
    // No words by the politician to score: an unscored mention, like a channel video.
    const excerpt = trimExcerpt(meta.title);
    const key = videoRecordKey(src, id);
    if (excerpt) { await store.setJSON(key, mentionRecord(src, { video_id: id, published: "" }, excerpt, fetchedAt)); stats.stored++; }
    return { ok: true, key: excerpt ? key : null, url: src.url, fetched_at: fetchedAt, youtube: stats };
  } catch (e) {
    const error = e?.message || String(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error, youtube: stats };
  }
}

/**
 * Pull one YouTube channel source. Never throws. Per new video (not already in
 * the raw store): with a cached transcript in which the politician speaks, a
 * page-shaped record that IS scored (`onRecord`); otherwise the unscored
 * mention item (description, else title) and — when nothing is cached yet —
 * a queue entry for the background transcriber. Returns the pullOne result
 * shape plus `items` and `youtube` ({ videos, stored, transcript, fallback, seen, queued }).
 */
export async function pullYouTube(src, { fetch, store, now = () => new Date(), log = console.log, storeName = "raw-ingest", transcriptStore = null, onRecord = null }) {
  const fetchedAt = now().toISOString();
  const stats = { videos: 0, stored: 0, transcript: 0, fallback: 0, seen: 0, queued: 0 };
  try {
    const res = await fetch(src.url, { headers: { "user-agent": UA, accept: "application/atom+xml,application/xml,*/*" }, redirect: "follow", signal: AbortSignal.timeout(SOCIAL_FEED_TIMEOUT_MS) });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const videos = parseYouTubeFeed(body).slice(0, YOUTUBE_MAX_VIDEOS);
    if (!videos.length) throw new Error("no videos in the channel feed");
    stats.videos = videos.length;
    const keys = [];
    await Promise.all(videos.map(async (v) => {
      const key = youtubeItemKey(src, v.video_id);
      const stored = await storedRecord(store, key);
      const doc = stored && (stored.body || !transcriptStore) ? null : await readTranscript(transcriptStore, v.video_id);
      if (stored) {
        stats.seen++;
        // Already scored (page-shaped record), or no transcript store: nothing to do.
        if (stored.body || !transcriptStore) return;
        // A video stored as a mention before transcripts existed (the backlog):
        // score it if its transcript is cached by now, else queue it once
        // (write-once; a transcribed video is never queued again).
        if (hasOwnSpeech(doc)) {
          await storeTranscriptRecord(src, v.video_id, doc, { store, onRecord, fetchedAt, title: v.title, published: v.published, storeName });
          keys.push(key); stats.transcript++;
        } else if (!doc && await enqueueTranscript(transcriptStore, src, { videoId: v.video_id, title: v.title, published: v.published })) stats.queued++;
        return;
      }
      if (hasOwnSpeech(doc)) {
        await storeTranscriptRecord(src, v.video_id, doc, { store, onRecord, fetchedAt, title: v.title, published: v.published, storeName });
        keys.push(key); stats.stored++; stats.transcript++;
        return;
      }
      stats.fallback++;
      const excerpt = trimExcerpt(v.description) || trimExcerpt(v.title);
      log(`raw-ingest: TRANSCRIPT FALLBACK ${src.politician_id} ${youtubeWatchUrl(v.video_id)} — ${fallbackWhy(doc, !doc && !!transcriptStore)} → video ${trimExcerpt(v.description) ? "description" : "title (description empty)"} (mention)`);
      // The mention goes in first; the background transcriber later replaces
      // it (same key) with the scored page-shaped record.
      if (excerpt) {
        await store.setJSON(key, mentionRecord(src, v, excerpt, fetchedAt));
        keys.push(key);
        stats.stored++;
      }
      if (!doc && transcriptStore && await enqueueTranscript(transcriptStore, src, { videoId: v.video_id, title: v.title, published: v.published })) stats.queued++;
    }));
    console.log(`raw-ingest: OK ${src.url} → ${storeName} (${stats.stored} new video(s), ${stats.seen} already stored; transcript ${stats.transcript}, description fallback ${stats.fallback}, queued ${stats.queued})`);
    return { ok: true, key: keys[0] || null, keys, items: stats.stored, url: src.url, fetched_at: fetchedAt, youtube: stats };
  } catch (e) {
    const error = e?.message || String(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error, youtube: stats };
  }
}
