// ─────────────────────────────────────────────────────────────────────────────
// share-preview — give every shared PolitiDex link its own unfurl
// ─────────────────────────────────────────────────────────────────────────────
// The whole app is one index.html with one set of static Open Graph tags, so a
// pasted link to a profile, an Issue Spotlight, a bill, a ranking or a receipt has
// always unfurled as the same generic homepage card. Social scrapers do not run
// JavaScript, so the client-side meta updates the app already performs (see the
// Spotlight's setMeta) are invisible to them. The only place left to fix it is the
// edge, before the document is served.
//
// This function rewrites the HEAD for links it recognises, and does three other
// things worth naming:
//
//   1. It leaves ?views= links alone. stance-share.ts owns those and is unchanged.
//   2. It FAILS OPEN. Every unknown link, every timeout, every unexpected throw
//      returns the page exactly as it was. A preview is a nicety; the page is not.
//   3. It is the one exception to (2): a /vote/… address we can positively
//      identify as wrong gets an honest 404 instead of a silent homepage. Those
//      links used to be rewritten to index.html and quietly show the front page,
//      which is the one outcome worse than a dead link — a reader believes they
//      followed a citation and lands somewhere that looks fine.
//
// Hash links keep working untouched. Where a surface's deep link lives in the hash
// (#bill/…, #receipt=…, #issue=…) — invisible to any server — the share button now
// emits a query-string equivalent instead, and share-links.js turns it back into
// the very same hash on arrival. Nothing downstream of the hash changed.
import type { Context, Config } from "@netlify/edge-functions";
import { parseTarget, resolveTarget, pageTitle, canonicalPath, type Resolved } from "../lib/share-target.ts";

// Escape a value for an HTML double-quoted attribute.
function attr(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function text(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Replace the content="…" of the FIRST meta tag matching an attribute selector.
// No-op when the tag is absent, so a head reshuffle can never throw.
function setMeta(html: string, sel: "property" | "name", key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i");
  return html.replace(re, `$1${value}$2`);
}

// Point <link rel="canonical"> at the record instead of at the homepage.
//
// index.html hardcodes one canonical href for the whole single-page app, so until
// now every shared record — every profile, Spotlight, roll call, bill, receipt —
// declared itself a duplicate of "/". That is the strongest possible instruction
// to a search engine to index none of them, and it was being sent on pages whose
// title, description and card were all already record-specific.
//
// Attribute order is not guaranteed by anything, so match either way round rather
// than assume rel comes first. As with setMeta, an absent tag is a no-op.
function setCanonical(html: string, href: string): string {
  const withRelFirst = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i;
  if (withRelFirst.test(html)) return html.replace(withRelFirst, `$1${href}$2`);
  const withHrefFirst = /(<link\s+href=")[^"]*("\s+rel="canonical")/i;
  return html.replace(withHrefFirst, `$1${href}$2`);
}

// The rasterised card. Scrapers vary in SVG support, so the SVG goes through the
// Netlify Image CDN as a PNG, exactly as the stance card already does.
function ogImageUrl(origin: string, ogQuery: string): string {
  return (
    origin +
    "/.netlify/images?url=" +
    encodeURIComponent("/share-og?" + ogQuery) +
    "&fm=png&w=1200&h=630&fit=cover"
  );
}

function applyMeta(html: string, r: Resolved, origin: string, canonical: string): string {
  const title = pageTitle(r);
  const tAttr = attr(title);
  const dAttr = attr(r.description);
  const image = ogImageUrl(origin, r.ogQuery);

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${text(title)}</title>`);
  html = setMeta(html, "property", "og:title", tAttr);
  html = setMeta(html, "property", "og:description", dAttr);
  html = setMeta(html, "property", "og:url", attr(canonical));
  html = setCanonical(html, attr(canonical));
  html = setMeta(html, "property", "og:image", attr(image));
  // Alt text should describe the IMAGE. On a comparison card the image is the two
  // facts, which is exactly what the description now carries — so a screen reader
  // gets the comparison instead of just the name.
  html = setMeta(html, "property", "og:image:alt", r.comparison ? dAttr : tAttr);
  html = setMeta(html, "name", "twitter:title", tAttr);
  html = setMeta(html, "name", "twitter:description", dAttr);
  html = setMeta(html, "name", "twitter:image", attr(image));
  html = setMeta(html, "name", "description", dAttr);

  // An article-ish surface still reads best as og:type=website here; leaving the
  // static value alone keeps this rewrite to text the reader actually sees.

  // Tell the client which record this URL is for, so the app can open it without
  // the server needing to know anything about the hash format. Read by
  // share-links.js; absent on links that need no hash (profiles, Spotlights).
  if (r.hash) {
    const boot =
      `<script>window.__PDX_SHARE_TARGET__=${JSON.stringify({ kind: r.kind, hash: r.hash })};</script>`;
    html = html.replace(/<\/head>/i, boot + "</head>");
  }
  return html;
}

// The honest dead end. A 404 status (not a 200 dressed as one) with a page that
// says what was asked for, why it is not here, and where to go instead.
//
// LOCAL DEV CAVEAT: `netlify dev` cannot show you this page. Its proxy emulates
// CDN file-shadowing by re-requesting `<path>.html`, `<path>.htm` and
// `<path>/index.html` whenever a response is 404 or 403, and then falling through
// to the matching redirect rule (netlify-cli, utils/proxy.js — "The request has
// failed but we might still have a matching redirect rule … that should kick in").
// The edge chain runs in front of that origin, so our 404 is consumed as a missing
// static file and /vote/* ends up rewritten to index.html anyway. On the CDN the
// edge function runs ahead of the redirect engine and a returned Response is the
// response. share-links.js carries the client-side safety net for exactly this
// gap: an unresolved /vote/ address states plainly that it did not open.
function notFoundPage(origin: string, message: string): Response {
  const title = "That vote isn’t in PolitiDex · PolitiDex";
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${text(title)}</title>
<meta name="robots" content="noindex" />
<meta name="description" content="${attr(message)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(message)}" />
<meta property="og:url" content="${attr(origin + "/")}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(message)}" />
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0a0f1e,#0d1526); color:#eef4ff;
         font-family:'Barlow',system-ui,-apple-system,'Segoe UI',sans-serif; padding:24px; }
  main { max-width:620px; }
  .eyebrow { color:#f59e0b; letter-spacing:.34em; font-size:.78rem; text-transform:uppercase; margin:0 0 14px; }
  h1 { font-size:clamp(1.6rem,4vw,2.4rem); line-height:1.15; margin:0 0 16px; }
  p { color:#9fb4d4; line-height:1.6; margin:0 0 14px; }
  a { display:inline-block; margin-top:14px; padding:12px 20px; border-radius:10px;
      background:#f5c842; color:#0a0f1e; font-weight:700; text-decoration:none; }
</style>
</head>
<body>
<main>
  <p class="eyebrow">Roll-call vote</p>
  <h1>We don’t have that vote.</h1>
  <p>${text(message)}</p>
  <p>Rather than show you the front page and let you think the link worked, here’s the plain answer: this address doesn’t resolve to a record we hold.</p>
  <a href="/">Go to PolitiDex</a>
</main>
</body>
</html>`;
  return new Response(body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

export default async (req: Request, context: Context): Promise<Response | undefined> => {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return; // unparseable — not ours to fix
  }

  // "My Stances" share links belong to stance-share.ts. Leave them entirely alone.
  if (url.searchParams.has("views")) return;

  const target = parseTarget(url);
  if (!target) return; // not a share link — straight through, nothing to do

  try {
    const resolved = await resolveTarget(target, url.origin);

    // A link we can prove is wrong. Only /vote/ addresses reach this branch, and
    // only on an explicit "no such roll call" from the API — a timeout or an error
    // falls through to the normal page instead.
    if (resolved && "notFound" in resolved) {
      return notFoundPage(url.origin, resolved.message);
    }
    if (!resolved) return; // unknown but not disproven — serve the page as-is

    const res = await context.next();
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return res;

    // The canonical address of the RECORD, not of the request. Everything the
    // reader's link happened to carry — a tracking param, a stale ?p= layered on
    // an /issue/ path, the ?issue= form of a Spotlight that also has a clean
    // path — normalizes to the one address that opens this record. og:url gets
    // the same value so three shares of one record unfurl as one entity.
    const canonical = url.origin + canonicalPath(target);
    const html = applyMeta(await res.text(), resolved, url.origin, canonical);
    const headers = new Headers(res.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=300");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(html, { status: res.status, headers });
  } catch {
    return; // fail open — never break a page over a preview
  }
};

export const config: Config = {
  // /p/* and /b/* are here for the same reason /issue/* and /vote/* are: the
  // rewrites in netlify.toml serve index.html for them, so without this function a
  // person file or a bill profile would unfurl — and canonicalise — as the homepage.
  path: ["/", "/index.html", "/issue/*", "/vote/*", "/p/*", "/b/*"],
};
