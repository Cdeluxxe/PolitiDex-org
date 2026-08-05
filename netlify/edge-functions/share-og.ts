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
// Say-vs-Do and Official Record links get a second layout: the SAID half and the
// RECORD half in two panels, side by side, both quoted and both sourced. There is
// no verdict on it and there never will be — the two facts are immutable and a
// judgment drawn from them is revisable, and this image will sit in a platform
// cache long after we could correct it. The reader does the arithmetic; we just
// have to make sure both numbers are on the card.
//
// Served as SVG; share-preview.ts points og:image at it through the Netlify Image
// CDN (?fm=png) so scrapers that insist on a raster still get one.
import type { Config } from "@netlify/edge-functions";
import { parseTarget, resolveTarget, prettyDate, type Resolved } from "../lib/share-target.ts";

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

// ── The comparison layout ────────────────────────────────────────────────────
// Two panels of plain fact. Everything on it came out of the resolver, which got
// the SAID half from the generated stance index and the RECORD half from the
// Voting Record API; nothing here is computed from the pair.
const PANEL_Y = 278;
const PANEL_H = 244;

// wrap() assumes no letter-spacing; a tracked-out line needs its own budget or it
// runs off the card. One line, truncated on a word boundary where possible.
function fitSpaced(text: string, size: number, spacing: number, maxWidth: number): string {
  const per = size * 0.46 + spacing;
  const limit = Math.max(6, Math.floor(maxWidth / per));
  const s = String(text || "");
  if (s.length <= limit) return s;
  return s.slice(0, limit - 1).replace(/[\s,;:.\-—]+$/, "") + "…";
}

function initials(name: string): string {
  const parts = String(name || "").replace(/[^\p{L}\p{N}\s.'-]/gu, " ").split(/\s+/).filter(Boolean);
  const letters = parts.filter((p) => /^\p{L}/u.test(p)).map((p) => p[0].toUpperCase());
  if (!letters.length) return "?";
  return letters.length === 1 ? letters[0] : letters[0] + letters[letters.length - 1];
}

function panelFrame(x: number, w: number, accent: string, tinted: boolean): string {
  return (
    `<rect x="${x}" y="${PANEL_Y}" width="${w}" height="${PANEL_H}" rx="18" fill="#111a2e" stroke="#1e2a44" stroke-width="2"/>` +
    `<rect x="${x}" y="${PANEL_Y}" width="5" height="${PANEL_H}" rx="2.5" fill="${esc(tinted ? accent : "#3d4d6b")}"/>`
  );
}

function panelLabel(x: number, text: string, fill: string): string {
  return `<text x="${x + 30}" y="${PANEL_Y + 46}" font-family="'Barlow Condensed','Arial',sans-serif" font-size="26" letter-spacing="5" fill="${esc(fill)}">${esc(text.toUpperCase())}</text>`;
}

function textRows(
  lines: string[],
  x: number,
  y: number,
  lh: number,
  size: number,
  fill: string,
  family = "'Barlow','Arial',sans-serif"
): string {
  return lines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y + i * lh}" font-family="${family}" font-size="${size}" fill="${esc(fill)}">${esc(ln)}</text>`
    )
    .join("");
}

// The SAID panel. The stance data carries no date anywhere in it, so this side
// names the source that reported the position and says nothing about when — an
// invented date on a real quote would be the worst possible thing to cache.
function saidPanel(said: NonNullable<Resolved["comparison"]>["said"], x: number, w: number, accent: string): string {
  if (!said) return "";
  // "Mixed on" reads as a sentence fragment in a tracked-out label; the panel wants
  // the bare direction.
  const label = "Said" + (said.word ? ` · ${said.word.replace(/\s+on$/i, "")}` : "");
  const body = wrap(`“${said.text}”`, 25, w - 60, 4);
  // "Source:" is true whether that is a news outlet or the member's own site;
  // anything warmer would overclaim.
  const source = said.source ? `Source: ${said.source}` : "Sourced on PolitiDex";
  return (
    panelFrame(x, w, accent, false) +
    panelLabel(x, label, "#9fb4d4") +
    textRows(body, x + 30, PANEL_Y + 96, 32, 25, "#e7ecf6") +
    textRows([source], x + 30, PANEL_Y + PANEL_H - 20, 0, 22, "#7f93b6")
  );
}

// The RECORD panel. The action is printed exactly as the record labels it, and the
// measure it applies to sits directly beneath so the two cannot be read apart.
function didPanel(did: NonNullable<Resolved["comparison"]>["did"], x: number, w: number, accent: string): string {
  if (!did) return "";
  const heading = did.action;
  const body = wrap([did.measure, did.title].filter(Boolean).join(" — "), 26, w - 60, 2);
  const foot = [did.date ? prettyDate(did.date) : "", did.detail].filter(Boolean).join(" · ");
  return (
    panelFrame(x, w, accent, true) +
    panelLabel(x, "On the record", "#9fb4d4") +
    textRows(wrap(heading, 44, w - 60, 1), x + 30, PANEL_Y + 108, 0, 44, accent, "'Bebas Neue','Arial Narrow',sans-serif") +
    textRows(body, x + 30, PANEL_Y + 152, 34, 26, "#e7ecf6") +
    (foot ? textRows([foot], x + 30, PANEL_Y + PANEL_H - 20, 0, 22, "#7f93b6") : "")
  );
}

function comparisonCard(r: Resolved): string {
  const cmp = r.comparison;
  if (!cmp || (!cmp.said && !cmp.did)) return card(r);

  // Name big enough to read in a feed at thumbnail size, and clear of the
  // monogram badge on the right.
  const nameSize = r.title.length > 40 ? 58 : r.title.length > 26 ? 68 : 80;
  const nameLines = wrap(r.title, nameSize, 860, 1);
  const issue = r.subtitle ? r.subtitle.replace(/^on\s+/i, "") : "";

  // Both halves → two panels. One half → one full-width panel, because a lone
  // fact next to an empty box reads as a missing fact rather than an honest one.
  let panels: string;
  if (cmp.said && cmp.did) {
    panels =
      saidPanel(cmp.said, 80, 496, r.accent) +
      didPanel(cmp.did, 624, 496, r.accent) +
      `<text x="600" y="${PANEL_Y + PANEL_H / 2 + 10}" text-anchor="middle" font-family="'Barlow Condensed','Arial',sans-serif" font-size="30" fill="#4a5b7c">vs</text>`;
  } else {
    panels = cmp.said ? saidPanel(cmp.said, 80, 1040, r.accent) : didPanel(cmp.did, 80, 1040, r.accent);
  }

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
  <rect x="1024" y="72" width="96" height="96" rx="20" fill="#131c30" stroke="${esc(r.accent)}" stroke-width="2"/>
  <text x="1072" y="140" text-anchor="middle" font-family="'Bebas Neue','Arial Narrow',sans-serif" font-size="52" fill="${esc(r.accent)}">${esc(initials(r.title))}</text>
  ${textRows(nameLines, 80, 202, 0, nameSize, "#eef4ff", "'Bebas Neue','Arial Narrow',sans-serif")}
  ${issue ? `<text x="82" y="248" font-family="'Barlow Condensed','Arial',sans-serif" font-size="32" letter-spacing="4" fill="#9fb4d4">ON ${esc(fitSpaced(issue.toUpperCase(), 32, 4, 940))}</text>` : ""}
  ${panels}
  <text x="80" y="580" font-family="'Barlow','Arial',sans-serif" font-size="24" fill="#7f93b6">${esc(r.footnote)}</text>
  <text x="1120" y="580" text-anchor="end" font-family="'Barlow Condensed','Arial',sans-serif" font-size="30" letter-spacing="2" fill="#e7ecf6">politidex.fyi</text>
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
    return svgResponse(resolved.comparison ? comparisonCard(resolved) : card(resolved), 86400);
  } catch {
    return svgResponse(genericCard(), 300);
  }
};

export const config: Config = { path: "/share-og" };
