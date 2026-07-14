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

// Accepts youtube.com/watch?v=, youtu.be/, /embed/, /shorts/, or a bare id.
const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Pull the 11-character video id out of any supported form, or '' if none.
function videoIdOf(raw: string): string {
  const s = raw.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m = s.match(YT_ID_RE)
  return m ? m[1] : ''
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const raw = new URL(req.url).searchParams.get('url') || ''
  if (!raw) return jsonError(400, 'A YouTube URL or video id is required.')

  const videoId = videoIdOf(raw)
  if (!videoId) return jsonError(400, 'That does not look like a YouTube video URL.')

  // Canonical watch URL is what oEmbed expects — rebuild it from the id so a
  // messy or tracking-laden input can never reach YouTube verbatim.
  const watchUrl = 'https://www.youtube.com/watch?v=' + videoId
  const oembed =
    'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watchUrl)

  let res: Response
  try {
    res = await fetch(oembed, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return jsonError(502, 'Could not reach YouTube to verify this video.')
  }

  // oEmbed returns 401/403/404 for a video that is private, deleted, or does not
  // exist — surface that as "not verifiable" rather than a server error.
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    return Response.json(
      { ok: false, videoId, error: 'This video is private, removed, or does not exist.' },
      { headers: { 'cache-control': 'public, max-age=3600' } }
    )
  }
  if (!res.ok) return jsonError(502, 'YouTube did not confirm this video.')

  let data: any
  try {
    data = await res.json()
  } catch {
    return jsonError(502, 'YouTube returned an unreadable response.')
  }

  return Response.json(
    {
      ok: true,
      videoId,
      // The REAL values, straight from YouTube — the basis for judging attribution.
      title: String(data.title || ''),
      channel: String(data.author_name || ''),
      channelUrl: String(data.author_url || ''),
      thumbnail: String(data.thumbnail_url || ''),
      watchUrl,
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
