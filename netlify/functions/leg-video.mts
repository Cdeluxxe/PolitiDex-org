import type { Config, Context } from '@netlify/functions'
import https from 'node:https'

// ──────────────────────────────────────────────────────────────────────────
// le.utah.gov video resolver
// ──────────────────────────────────────────────────────────────────────────
// PolitiDex cites floor/committee video as
//   https://le.utah.gov/av/floorArchive.jsp?markerID=<id>
//   https://le.utah.gov/av/committeeArchive.jsp?mtgID=<id>&markerID=<id>
// Those pages are heavy desktop pages whose own video.js player is not
// configured for inline mobile playback, and they cannot be embedded (their CSP
// pins frame-ancestors to utleg.gov). The underlying HLS recordings, however,
// live on stream1.utleg.gov and are served with `Access-Control-Allow-Origin: *`
// and Range support — so they can be played directly in our own mobile-friendly
// player.
//
// This function fetches the archive page server-side (no CORS limits there),
// locates the timeline marker the citation points at, and returns the marker's
// HLS stream URL plus its start offset in seconds. The browser then plays that
// stream inline, seeked to the exact moment the legislator begins speaking.
// Archives are immutable, so responses are cached aggressively.

const ARCHIVE_RE =
  /^https:\/\/le\.utah\.gov\/av\/(floor|committee)Archive\.jsp(\?.*)?$/i

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Pull one numeric attribute (e.g. data-offset=1482) out of a button tag.
function attrNum(tag: string, name: string): number | null {
  const m = tag.match(new RegExp(name + "=['\"]?(-?\\d+)", 'i'))
  return m ? parseInt(m[1], 10) : null
}

// Pull one quoted attribute (e.g. data-hls='https://…') out of a button tag.
function attrStr(tag: string, name: string): string {
  const m = tag.match(new RegExp(name + "=['\"]([^'\"]+)['\"]", 'i'))
  return m ? m[1] : ''
}

// Fetch the archive page. The le.utah.gov WAF rejects undici/`fetch`'s client
// fingerprint outright (a 246-byte "Request Rejected" stub), so we use Node's
// native https client, whose requests it serves normally.
function fetchPage(target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(target)
    const req = https.request(
      {
        host: u.host,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c) => { data += c })
        res.on('end', () => {
          if ((res.statusCode || 0) >= 400) reject(new Error('HTTP ' + res.statusCode))
          else resolve(data)
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => req.destroy(new Error('timeout')))
    req.end()
  })
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url).searchParams.get('url') || ''
  if (!ARCHIVE_RE.test(url)) {
    return jsonError(400, 'A le.utah.gov floor/committee archive URL is required.')
  }

  // The marker we want is identified by markerID (floor pages tag it
  // data-markerid; committee pages tag the same id data-timelineid).
  const markerID = new URL(url).searchParams.get('markerID')

  let page: string
  try {
    page = await fetchPage(url)
  } catch {
    return jsonError(502, 'Could not reach the official video archive.')
  }

  // Isolate the opening <button …> tag for the requested marker. Fall back to
  // the recording-level marker (data-markerid=-1) so the clip still plays from
  // the top when a precise marker can't be matched.
  let tag = ''
  if (markerID) {
    const re = new RegExp(
      "<button[^>]*data-(?:markerid|timelineid)=['\"]?" +
        markerID.replace(/[^\d-]/g, '') +
        "(?![\\d])[^>]*>",
      'i'
    )
    const m = page.match(re)
    if (m) tag = m[0]
  }
  if (!tag) {
    const rec = page.match(/<button[^>]*data-markerid=['"]?-1(?![\d])[^>]*>/i)
    if (rec) tag = rec[0]
  }
  if (!tag) return jsonError(404, 'No playable recording was found for this citation.')

  const hls = attrStr(tag, 'data-hls') || attrStr(tag, 'data-vodurl')
  const canPlay = !/data-canplay=['"]?false/i.test(tag)
  if (!hls || !canPlay) {
    return jsonError(404, 'This recording is not available to stream yet.')
  }

  const offset = attrNum(tag, 'data-offset') ?? 0

  // The human-readable marker label (e.g. the bill it covers), if present.
  let title = ''
  const idx = page.indexOf(tag)
  if (idx !== -1) {
    const after = page.slice(idx, idx + 1200)
    const dm = after.match(/class=['"]description['"][^>]*>([^<]+)</i)
    if (dm) title = dm[1].replace(/\s+/g, ' ').trim()
  }

  return Response.json(
    { hls, offset: Math.max(0, offset), title },
    {
      headers: {
        // Archives never change; let the CDN + browser hold the answer.
        'cache-control': 'public, max-age=86400, s-maxage=2592000',
      },
    }
  )
}

export const config: Config = {
  path: '/api/leg-video',
  method: 'GET',
}
