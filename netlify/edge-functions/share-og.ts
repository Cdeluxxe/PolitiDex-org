// ─────────────────────────────────────────────────────────────────────────────
// share-og — the 1200×630 social card for any shared PolitiDex link
// ─────────────────────────────────────────────────────────────────────────────
// Sibling of stance-og.ts (which owns the ?views= "My Stances" card and is left
// exactly as it was). This one renders the card for the other six surfaces:
// profiles, Issue Spotlights, issue rankings, bills, receipts and roll calls.
//
// It takes IDS, NOT TEXT. Every word on the card is looked up here from the same
// resolver the meta rewriter uses, so /share-og cannot be handed a title and made
// to print arbitrary words on PolitiDex letterhead — a URL anyone can construct
// and screenshot has to be incapable of lying.
//
// Each surface gets a visibly different eyebrow and accent, which is the point:
// two PolitiDex links in one feed should not look like the same card. In
// particular an Issue Spotlight is drawn in its own colour, labelled as an
// explainer, and carries a footer saying it is not a verdict on any politician —
// it must never be mistaken for an Official Record judgment.
//
// Served as SVG; share-preview.ts points og:image at it through the Netlify Image
// CDN (?fm=png) so scrapers that insist on a raster still get one.
import type { Config } from "@netlify/edge-functions";
import { parseTarget, resolveTarget, type Resolved } from "../lib/share-target.ts";

function esc(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Greedy wrap on an approximate glyph width. The card fonts are condensed, so
// ~0.46em per character is close enough to keep a headline inside the frame
// without shipping a font metrics table to the edge.
function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const per = fontSize * 0.46;
  const limit = Math.max(8, Math.floor(maxWidth / per));
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (next.length <= limit) { line = next; continue; }
    if (line) lines.push(line);
    line = w.length > limit ? w.slice(0, limit - 1) + "…" : w;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    // Signal truncation only if we actually dropped something.
    const shown = lines.join(" ").replace(/…$/, "");
    if (shown.length < String(text || "").replace(/\s+/g, " ").trim().length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,;:.\-—]+$/, "") + "…";
    }
  }
  return lines;
}

// The generic site card — what a link falls back to when we cannot resolve it,
// and what an unknown /share-og request gets. Branded, honest, says nothing
// specific it cannot back up.
function genericCard(): string {
  return card({
    kind: "profile",
    eyebrow: "POLITIDEX",
    accent: "#f5c842",
    title: "Track promises, money and receipts",
    subtitle: "",
    description: "",
    footnote: "Every claim sourced. Judge each politician on their own record.",
    ogQuery: "",
  });
}

function card(r: Resolved): string {
  const titleSize = r.title.length > 58 ? 62 : r.title.length > 34 ? 76 : 92;
  const titleLines = wrap(r.title, titleSize, 1040, 3);
  const subLines = r.subtitle ? wrap(r.subtitle, 34, 1040, 2) : [];

  let y = 250;
  const titleSvg = titleLines
    .map((ln, i) => {
      const ty = y + i * (titleSize + 10);
      return `<text x="80" y="${ty}" font-family="'Bebas Neue','Arial Narrow',sans-serif" font-size="${titleSize}" fill="#eef4ff">${esc(ln)}</text>`;
    })
    .join("");
  y += (titleLines.length - 1) * (titleSize + 10) + 60;

  const subSvg = subLines
    .map((ln, i) =>
      `<text x="82" y="${y + i * 44}" font-family="'Barlow','Arial',sans-serif" font-size="34" fill="#9fb4d4">${esc(ln)}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0f1e"/>
      <stop offset="1" stop-color="#0d1526"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="${esc(r.accent)}"/>
  <rect x="80" y="86" width="6" height="44" fill="${esc(r.accent)}"/>
  <text x="106" y="120" font-family="'Barlow Condensed','Arial',sans-serif" font-size="34" letter-spacing="6" fill="${esc(r.accent)}">${esc(r.eyebrow.toUpperCase())}</text>
  ${titleSvg}
  ${subSvg}
  <text x="80" y="562" font-family="'Barlow','Arial',sans-serif" font-size="26" fill="#7f93b6">${esc(r.footnote)}</text>
  <text x="1120" y="562" text-anchor="end" font-family="'Barlow Condensed','Arial',sans-serif" font-size="30" letter-spacing="2" fill="#e7ecf6">politidex.fyi</text>
</svg>`;
}

// /share-og is addressed by the same ids the resolver parses, so rebuild a URL it
// understands from the card request and ask it the identical question.
function targetUrlFor(url: URL): URL | null {
  const kind = url.searchParams.get("kind") || "";
  const out = new URL(url.origin);
  const g = (k: string) => url.searchParams.get(k) || "";
  switch (kind) {
    case "profile":
      if (!g("id")) return null;
      out.pathname = "/"; out.searchParams.set("p", g("id"));
      return out;
    case "spotlight":
      if (!g("slug")) return null;
      out.pathname = "/issue/" + encodeURIComponent(g("slug"));
      return out;
    case "rank":
      if (!g("core")) return null;
      out.pathname = "/"; out.searchParams.set("rank", g("core"));
      if (g("key")) out.searchParams.set("key", g("key"));
      return out;
    case "bill":
      if (!g("congress") || !g("number")) return null;
      out.pathname = "/"; out.searchParams.set("bill", g("congress") + "/" + g("number"));
      return out;
    case "receipt":
    case "record":
      if (!g("pid")) return null;
      out.pathname = "/";
      out.searchParams.set(kind, g("pid") + (g("issue") ? "~" + g("issue") : ""));
      return out;
    case "vote":
      if (!g("congress") || !g("chamber") || !g("roll")) return null;
      out.pathname = `/vote/${encodeURIComponent(g("congress"))}/${encodeURIComponent(g("chamber"))}/${encodeURIComponent(g("roll"))}`;
      return out;
    default:
      return null;
  }
}

function svgResponse(svg: string, maxAge: number): Response {
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": `public, max-age=${maxAge}, s-maxage=604800`,
    },
  });
}

export default async (req: Request): Promise<Response> => {
  // Fail open, always: a broken card must never be a broken response, because a
  // scraper that gets a 500 here caches the failure, not the retry.
  try {
    const url = new URL(req.url);
    const targetUrl = targetUrlFor(url);
    if (!targetUrl) return svgResponse(genericCard(), 3600);

    const target = parseTarget(targetUrl);
    if (!target) return svgResponse(genericCard(), 3600);

    const resolved = await resolveTarget(target, url.origin);
    if (!resolved || "notFound" in resolved) {
      // Cache the generic fallback briefly — the underlying record may simply be
      // slow to resolve, and we do not want that frozen at the edge for a week.
      return svgResponse(genericCard(), 300);
    }
    return svgResponse(card(resolved), 86400);
  } catch {
    return svgResponse(genericCard(), 300);
  }
};

export const config: Config = { path: "/share-og" };
