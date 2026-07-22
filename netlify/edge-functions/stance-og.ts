// ─────────────────────────────────────────────────────────────────────────────
// stance-og — dynamic Open Graph card image for a shared "My Views" link
// ─────────────────────────────────────────────────────────────────────────────
// Renders a 1200×630 social card as SVG from the SAME notes-free token the client
// packs into a ?views= share link (see my-stances.js → publicToken). It shows the
// sharer's name and how many issues they Support / Oppose / mark Mixed — never any
// notes, never anything the sharer didn't put in the link. It reads NO database
// and needs no auth: everything is in the token.
//
// Served as image/svg+xml. stance-share.ts points og:image at this through the
// Netlify Image CDN (…/.netlify/images?url=/stance-og?token=…&fm=png) so social
// scrapers that require a raster (PNG/JPG) still get one; the SVG stays the source.
import type { Config } from "@netlify/edge-functions";

type Counts = { support: number; oppose: number; mixed: number };

function b64urlToStr(tok: string): string {
  const b64 = tok.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(tok.length / 4) * 4, "=");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Decode { v, n:name, s:[{i,p,r}] } → name + counts. Returns null on any problem
// so the caller can fall back to a generic branded card.
function decode(tok: string): { name: string; counts: Counts; total: number } | null {
  try {
    const obj = JSON.parse(b64urlToStr(tok));
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.s)) return null;
    const counts: Counts = { support: 0, oppose: 0, mixed: 0 };
    for (const it of obj.s) {
      const p = it && it.p;
      if (p === "s") counts.support++;
      else if (p === "o") counts.oppose++;
      else if (p === "m") counts.mixed++;
    }
    const total = counts.support + counts.oppose + counts.mixed;
    const name = typeof obj.n === "string" ? obj.n.slice(0, 60) : "A PolitiDex member";
    return { name, counts, total };
  } catch {
    return null;
  }
}

// Escape text for safe embedding inside SVG text nodes.
function esc(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function stat(x: number, label: string, color: string, n: number): string {
  return `
    <g transform="translate(${x},372)">
      <circle cx="18" cy="18" r="16" fill="${color}"/>
      <text x="52" y="30" font-family="'Bebas Neue','Arial Narrow',sans-serif" font-size="72" fill="#eef4ff">${n}</text>
      <text x="0" y="86" font-family="'Barlow Condensed','Arial',sans-serif" font-size="30" letter-spacing="3" fill="${color}">${label.toUpperCase()}</text>
    </g>`;
}

function card(name: string, counts: Counts, total: number): string {
  const title = total > 0 ? esc(name) : "PolitiDex";
  const sub =
    total > 0
      ? `${total} issue${total !== 1 ? "s" : ""} on the record`
      : "Where do you stand?";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0f1e"/>
      <stop offset="1" stop-color="#0d1526"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#f5c842"/>
  <text x="80" y="118" font-family="'Barlow Condensed','Arial',sans-serif" font-size="34" letter-spacing="6" fill="#fcd34d">🎯 MY STANCES · POLITIDEX</text>
  <text x="80" y="212" font-family="'Bebas Neue','Arial Narrow',sans-serif" font-size="92" fill="#eef4ff">${esc(title)}</text>
  <text x="82" y="270" font-family="'Barlow','Arial',sans-serif" font-size="34" fill="#9fb4d4">${esc(sub)}</text>
  ${stat(80, "Support", "#4ade80", counts.support)}
  ${stat(430, "Oppose", "#f87171", counts.oppose)}
  ${stat(780, "Mixed", "#facc15", counts.mixed)}
  <text x="80" y="576" font-family="'Barlow','Arial',sans-serif" font-size="30" fill="#7f93b6">See how every politician lines up on your positions.</text>
  <text x="1120" y="576" text-anchor="end" font-family="'Barlow Condensed','Arial',sans-serif" font-size="30" letter-spacing="2" fill="#e7ecf6">politidex.fyi</text>
</svg>`;
}

export default async (req: Request): Promise<Response> => {
  const tok = new URL(req.url).searchParams.get("token") || "";
  const data = decode(tok) || { name: "PolitiDex", counts: { support: 0, oppose: 0, mixed: 0 }, total: 0 };
  const svg = card(data.name, data.counts, data.total);
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Token-addressed and immutable for a given link; cache hard at the edge.
      "cache-control": "public, max-age=86400, s-maxage=604800",
    },
  });
};

export const config: Config = { path: "/stance-og" };
