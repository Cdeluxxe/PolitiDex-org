import type { Config, Context } from '@netlify/functions'

// ──────────────────────────────────────────────────────────────────────────
// YouTube oEmbed verifier
// ──────────────────────────────────────────────────────────────────────────
// PolitiDex's Evidence Strength standard lifts a "high-quality direct interview"
// on YouTube above the generic social/video ceiling (EVIDENCE_STRENGTH.md). One
// of the four criteria for that exception is ATTRIBUTABLE — the clip must be
// verifiably the named politician (their own channel, or a reputable outlet whose
// title names them). The docs describe confirming this "live via YouTube's oEmbed
// endpoint"; this Function is that check, made real and reusable.
//
// Given a YouTube watch/short/youtu.be URL (or a bare 11-char video id), it calls
// YouTube's public oEmbed endpoint server-side and returns the video's REAL title
// and channel straight from YouTube. That lets the UI (a) confirm a cited video
// actually exists, and (b) show the true title + channel so a human can judge
// attribution rather than trust the submitter's label. It NEVER grades or promotes
// anything — the interview exception stays an explicit, author/moderator decision.
// This is read-only public metadata, so responses are cached aggressively.

import { videoIdOf, fetchOEmbed } from '../lib/youtube-oembed.mjs'

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const raw = new URL(req.url).searchParams.get('url') || ''
  if (!raw) return jsonError(400, 'A YouTube URL or video id is required.')

  const videoId = videoIdOf(raw)
  if (!videoId) return jsonError(400, 'That does not look like a YouTube video URL.')

  // The oEmbed lookup is shared with the raw-ingest video pullers
  // (netlify/lib/youtube-oembed.mjs); it rebuilds the canonical watch URL from
  // the id, so a messy input never reaches YouTube verbatim.
  const o: any = await fetchOEmbed(videoId)

  // oEmbed returns 401/403/404 for a video that is private, deleted, or does not
  // exist — surface that as "not verifiable" rather than a server error.
  if (!o.ok && o.missing) {
    return Response.json(
      { ok: false, videoId, error: o.error },
      { headers: { 'cache-control': 'public, max-age=3600' } }
    )
  }
  if (!o.ok) return jsonError(502, o.error)

  return Response.json(
    {
      ok: true,
      videoId,
      // The REAL values, straight from YouTube — the basis for judging attribution.
      title: o.title,
      channel: o.channel,
      channelUrl: o.channelUrl,
      thumbnail: o.thumbnail,
      watchUrl: o.watchUrl,
    },
    {
      headers: {
        // Attribution rarely changes; let the CDN + browser hold the answer.
        'cache-control': 'public, max-age=86400, s-maxage=2592000',
      },
    }
  )
}

export const config: Config = {
  path: '/api/yt-verify',
  method: 'GET',
}
