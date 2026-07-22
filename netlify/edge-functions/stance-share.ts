// ─────────────────────────────────────────────────────────────────────────────
// stance-share — dynamic social-preview meta for a shared "My Views" link
// ─────────────────────────────────────────────────────────────────────────────
// The app is a single index.html with static Open Graph / Twitter tags, so a
// pasted ?views= share link would otherwise unfurl as the generic site preview.
// Social scrapers don't run JS, so the only way to give each shared link its own
// title, description and image is to rewrite the HEAD at the edge before it's
// served. This function does exactly that — and ONLY for ?views= links; every
// other request passes straight through untouched (and it fails open, returning
// the original page unmodified if anything goes wrong).
//
// It reads only the notes-free token already in the URL (name + Support/Oppose/
// Mixed counts) — no database, no auth, nothing the sharer didn't put in the link.
import type { Context, Config } from "@netlify/edge-functions";

const SHARE_PARAM = "views";

function b64urlToStr(tok: string): string {
  const b64 = tok.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(tok.length / 4) * 4, "=");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decode(tok: string): { name: string; support: number; oppose: number; mixed: number; total: number } | null {
  try {
    const obj = JSON.parse(b64urlToStr(tok));
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.s)) return null;
    let support = 0, oppose = 0, mixed = 0;
    for (const it of obj.s) {
      const p = it && it.p;
      if (p === "s") support++;
      else if (p === "o") oppose++;
      else if (p === "m") mixed++;
    }
    const total = support + oppose + mixed;
    if (total === 0) return null;
    const name = typeof obj.n === "string" ? obj.n.slice(0, 60) : "A PolitiDex member";
    return { name, support, oppose, mixed, total };
  } catch {
    return null;
  }
}

// Escape a value for safe use inside an HTML double-quoted attribute.
function attr(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Replace the `content="…"` of the FIRST meta tag matching a given attribute
// selector (property=… or name=…). No-op if the tag isn't present.
function setMeta(html: string, sel: "property" | "name", key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i");
  return html.replace(re, `$1${value}$2`);
}

export default async (req: Request, context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const tok = url.searchParams.get(SHARE_PARAM);
  if (!tok) return; // not a share link — pass straight through (most performant)

  const data = decode(tok);
  if (!data) return; // unreadable token — let the normal page load

  let res: Response;
  try {
    res = await context.next();
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return res; // only rewrite HTML documents
    let html = await res.text();

    const { name, support, oppose, mixed, total } = data;
    const isGeneric = /^a politidex member$/i.test(name.trim());
    const title = isGeneric
      ? `A voter's positions on ${total} issue${total !== 1 ? "s" : ""} · PolitiDex`
      : `${name}'s views on ${total} issue${total !== 1 ? "s" : ""} · PolitiDex`;
    const parts: string[] = [];
    if (support) parts.push(`Supports ${support}`);
    if (oppose) parts.push(`Opposes ${oppose}`);
    if (mixed) parts.push(`Mixed on ${mixed}`);
    const desc = `${parts.join(" · ")}. See how every politician lines up on these positions — no spin, just where they stand.`;

    const origin = url.origin;
    const shareUrl = origin + url.pathname + "?" + SHARE_PARAM + "=" + tok;
    // Rasterize the dynamic SVG card to PNG through the Netlify Image CDN so
    // scrapers that require a raster image still get one.
    const ogImage =
      origin + "/.netlify/images?url=" + encodeURIComponent("/stance-og?token=" + tok) + "&fm=png&w=1200&h=630&fit=cover";

    const tAttr = attr(title), dAttr = attr(desc);
    html = setMeta(html, "property", "og:title", tAttr);
    html = setMeta(html, "property", "og:description", dAttr);
    html = setMeta(html, "property", "og:url", attr(shareUrl));
    html = setMeta(html, "name", "twitter:title", tAttr);
    html = setMeta(html, "name", "twitter:description", dAttr);
    html = setMeta(html, "name", "description", dAttr);
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${tAttr}</title>`);

    // Inject the image tags (the static head has none). Insert right before
    // </head>; if og:image/twitter:image somehow already exist, refresh them too.
    const imgTags =
      `<meta property="og:image" content="${attr(ogImage)}" />` +
      `<meta property="og:image:width" content="1200" />` +
      `<meta property="og:image:height" content="630" />` +
      `<meta name="twitter:image" content="${attr(ogImage)}" />`;
    if (/property="og:image"/i.test(html)) {
      html = setMeta(html, "property", "og:image", attr(ogImage));
      html = setMeta(html, "name", "twitter:image", attr(ogImage));
    } else {
      html = html.replace(/<\/head>/i, imgTags + "</head>");
    }

    return new Response(html, {
      status: res.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return; // fail open — never break the page over a preview tweak
  }
};

export const config: Config = { path: ["/", "/index.html"] };
