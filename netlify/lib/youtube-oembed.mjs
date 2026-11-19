// ─────────────────────────────────────────────────────────────────────────────
// youtube-oembed.mjs — a YouTube video's real title and channel, from YouTube's
// public oEmbed endpoint.
// ─────────────────────────────────────────────────────────────────────────────
// Shared by /api/yt-verify (the attribution check for the interview exception)
// and the raw-ingest video pullers. oEmbed answers server-side requests; the
// watch page does not (it serves a bot check to automated fetches, with no
// title, description or caption track in it).

/** watch / youtu.be / embed / shorts / live / v URLs, or a bare 11-character id. */
const YT_ID_RE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/** The 11-character video id of a YouTube URL (or a bare id), or "". */
export function videoIdOf(raw) {
  const s = String(raw || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = YT_ID_RE.exec(s);
  return m ? m[1] : "";
}

export const watchUrlOf = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;
export const OEMBED_TIMEOUT_MS = 8_000;

/**
 * Look a video up on oEmbed. Never throws. Returns
 *   { ok: true, videoId, title, channel, channelUrl, thumbnail, watchUrl }
 *   { ok: false, videoId, status, error, missing? }   (missing = private / removed / no such video)
 */
export async function fetchOEmbed(videoId, { fetch = globalThis.fetch, timeoutMs = OEMBED_TIMEOUT_MS, signal } = {}) {
  const watchUrl = watchUrlOf(videoId);
  // Rebuilt from the id, so a messy or tracking-laden input never reaches YouTube verbatim.
  const url = "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(watchUrl);
  let res;
  try {
    res = await fetch(url, { headers: { accept: "application/json" }, signal: signal ?? AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    return { ok: false, videoId, status: 0, error: e?.name === "TimeoutError" ? `oEmbed timed out after ${timeoutMs}ms` : "Could not reach YouTube to verify this video." };
  }
  // 401 / 403 / 404: the video is private, removed or does not exist.
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    return { ok: false, videoId, status: res.status, missing: true, error: "This video is private, removed, or does not exist." };
  }
  if (!res.ok) return { ok: false, videoId, status: res.status, error: "YouTube did not confirm this video." };
  let data;
  try { data = await res.json(); } catch { return { ok: false, videoId, status: res.status, error: "YouTube returned an unreadable response." }; }
  return {
    ok: true,
    videoId,
    title: String(data?.title || ""),
    channel: String(data?.author_name || ""),
    channelUrl: String(data?.author_url || ""),
    thumbnail: String(data?.thumbnail_url || ""),
    watchUrl,
  };
}
