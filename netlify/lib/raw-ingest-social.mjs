// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-social.mjs — official social sources for the raw-ingest rotation
// ─────────────────────────────────────────────────────────────────────────────
// YouTube only for now (X and Facebook need paid / page-token API access and
// show no posts to an anonymous fetch, so they are not configured).
//
// One configured channel = ONE source slot in the planner. Pulling it reads the
// channel's public Atom feed (recent uploads) and writes ONE raw record per new
// video, in the locked item shape:
//   type "video" · date (YYYY-MM-DD) · link (watch URL) · excerpt · weight
// plus the identity fields every raw record carries (politician_id, topic,
// source_type, source_id, url, fetched_at). No scoring, no stance fields, and
// the scorer / Locker hook is NOT run on these records.
//
// EXCERPT. The auto-generated (or uploaded) English transcript is tried first.
// If it cannot be fetched or comes back empty, the video description is used
// instead (the title when the description is blank) and the run logs one
// "raw-ingest: TRANSCRIPT FALLBACK …" line per video, so how often transcripts
// actually work is visible in the function logs and in report.youtube.
//
// Videos already in the store (same channel + video id key) are skipped before
// any transcript fetch, so a channel costs one feed fetch per run once its
// recent uploads are stored.

export const SOCIAL_CLASSES = {
  youtube: "official YouTube channel — recent videos (transcript, else description)",
};
export const SOCIAL_CLASS_SET = new Set(Object.keys(SOCIAL_CLASSES));
export const isSocial = (s) => SOCIAL_CLASS_SET.has(s?.source_class);

export const YOUTUBE_MAX_VIDEOS = 3;          // most recent uploads read per channel per run
export const SOCIAL_FEED_TIMEOUT_MS = 6_000;  // channel feed fetch
export const TRANSCRIPT_TIMEOUT_MS = 5_000;   // watch page + caption track, per video
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
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** The JSON array that follows `"captionTracks":` in a watch page (bracket-matched). */
export function extractCaptionTracks(html) {
  const at = String(html || "").indexOf('"captionTracks":');
  if (at < 0) return null;
  const start = html.indexOf("[", at);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}

/** English track, auto-generated preferred; else any English; else the first. */
export function pickCaptionTrack(tracks) {
  if (!Array.isArray(tracks) || !tracks.length) return null;
  const en = tracks.filter((t) => /^en\b/i.test(t?.languageCode || ""));
  return en.find((t) => t.kind === "asr") || en[0] || tracks[0];
}

/** Caption body (json3 or XML timedtext) → plain text. */
export function captionText(body) {
  const b = String(body || "").trim();
  if (!b) return "";
  if (b.startsWith("{")) {
    try {
      const j = JSON.parse(b);
      return (j.events || []).flatMap((ev) => (ev.segs || []).map((s) => s.utf8 || "")).join("").replace(/\s+/g, " ").trim();
    } catch { return ""; }
  }
  return [...b.matchAll(/<(?:text|p)\b[^>]*>([\s\S]*?)<\/(?:text|p)>/g)].map((m) => decode(decode(m[1]).replace(/<[^>]+>/g, ""))).join(" ").replace(/\s+/g, " ").trim();
}

/** Try the transcript for one video. Never throws: { text } or { text: "", why }. */
export async function fetchTranscript(videoId, { fetch, timeoutMs = TRANSCRIPT_TIMEOUT_MS } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const res = await fetch(`${youtubeWatchUrl(videoId)}&hl=en`, { headers: { "user-agent": UA, "accept-language": "en" }, redirect: "follow", signal });
    if (!res.ok) return { text: "", why: `watch page HTTP ${res.status}` };
    const track = pickCaptionTrack(extractCaptionTracks(await res.text()));
    if (!track?.baseUrl) return { text: "", why: "no caption track on the watch page" };
    const base = String(track.baseUrl).replace(/\\u0026/g, "&");
    const cap = await fetch(`${base}${base.includes("fmt=") ? "" : "&fmt=json3"}`, { headers: { "user-agent": UA }, signal });
    if (!cap.ok) return { text: "", why: `caption track HTTP ${cap.status}` };
    const text = captionText(await cap.text());
    return text ? { text, kind: track.kind === "asr" ? "auto-generated" : "uploaded" } : { text: "", why: "caption track came back empty" };
  } catch (e) {
    return { text: "", why: e?.name === "TimeoutError" ? `timed out after ${timeoutMs}ms` : (e?.message || String(e)) };
  }
}

export function youtubeItemKey(src, videoId) {
  return `${[src.politician_id, src.topic, src.source_id].filter(Boolean).join("/")}/${videoId}.json`;
}

async function alreadyStored(store, key) {
  if (typeof store?.get !== "function") return false;
  try { return (await store.get(key)) != null; } catch { return false; }
}

/**
 * Pull one YouTube channel source. Never throws. Writes one raw item record per
 * new video. Returns the same result shape as pullOne plus `items` and
 * `youtube` ({ videos, stored, transcript, fallback, seen }).
 */
export async function pullYouTube(src, { fetch, store, now = () => new Date(), log = console.log, storeName = "raw-ingest" }) {
  const fetchedAt = now().toISOString();
  const stats = { videos: 0, stored: 0, transcript: 0, fallback: 0, seen: 0 };
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
      if (await alreadyStored(store, key)) { stats.seen++; return; }
      const tr = await fetchTranscript(v.video_id, { fetch });
      let excerpt = trimExcerpt(tr.text);
      if (excerpt) stats.transcript++;
      else {
        stats.fallback++;
        excerpt = trimExcerpt(v.description) || trimExcerpt(v.title);
        log(`raw-ingest: TRANSCRIPT FALLBACK ${src.politician_id} ${youtubeWatchUrl(v.video_id)} — ${tr.why} → video ${trimExcerpt(v.description) ? "description" : "title (description empty)"}`);
      }
      if (!excerpt) return;
      const record = {
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
      await store.setJSON(key, record);
      keys.push(key);
      stats.stored++;
    }));
    console.log(`raw-ingest: OK ${src.url} → ${storeName} (${stats.stored} new video(s), ${stats.seen} already stored; transcript ${stats.transcript}, description fallback ${stats.fallback})`);
    return { ok: true, key: keys[0] || null, keys, items: stats.stored, url: src.url, fetched_at: fetchedAt, youtube: stats };
  } catch (e) {
    const error = e?.message || String(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error, youtube: stats };
  }
}
