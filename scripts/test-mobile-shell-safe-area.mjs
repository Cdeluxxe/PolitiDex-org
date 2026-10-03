#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SHELL SAFE AREA — the top bar clears the device inset, never eats it
// ─────────────────────────────────────────────────────────────────────────────
// Reported on a phone: scrolled to the very top, the header sat under the
// browser chrome and the POLITIDEX mark was the first visible thing, clipped.
//
// The cause was one declaration repeated across every inner shell:
//
//     height: 3.25rem; padding: env(safe-area-inset-top, 0px) 1rem 0;
//
// Under a border-box reset (tailwind.css) `height` is the WHOLE bar, padding
// included, so a 47px status-bar inset left a 5px row for a 52px bar and the
// wordmark overflowed up into the inset. --pdx-chrome — what the body pads by —
// says 3.25rem + inset, so the bar and the page disagreed by the inset too.
//
// This file resolves the shipped declarations against inset FIXTURES (no
// browser) and asserts, for every shell:
//
//   · a non-zero inset pushes the header row below it, at full row height;
//   · the bar's outer height is exactly --pdx-chrome at that inset;
//   · a zero inset adds no gap — the bar is the old 3.25rem bar (desktop);
//   · no html/body rule is a 100vh scroll container that could pin the header.
//
//   node scripts/test-mobile-shell-safe-area.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let failures = 0;
const ok = (cond, msg) => {
  if (cond) return;
  failures++;
  console.error("  ✗ " + msg);
};

const ROOT_PX = 16;
const ROW_PX = 3.25 * ROOT_PX;            // the bar's own row: 52px
const INSETS = [0, 24, 47, 59];           // flat, Android cutout, notched iPhone, Dynamic Island

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const styleText = (html) =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");

// Every top-level-ish rule body for an exact selector, in source order.
function rules(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(?:^|[}\\s;])" + esc + "\\s*\\{([^{}]*)\\}", "g");
  return [...stripComments(css).matchAll(re)].map((m) => m[1]);
}
function decls(body) {
  const out = {};
  for (const part of body.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

// Resolve a length token at a given inset fixture. Supports what the bars use.
function px(tok, inset) {
  tok = tok.trim();
  if (/^env\(\s*safe-area-inset-top\b/.test(tok)) return inset;
  if (tok === "0") return 0;
  let m = /^(-?[\d.]+)rem$/.exec(tok);
  if (m) return Number(m[1]) * ROOT_PX;
  m = /^(-?[\d.]+)px$/.exec(tok);
  if (m) return Number(m[1]);
  m = /^calc\(\s*([\d.]+rem)\s*\+\s*(env\([^)]*\))\s*\)$/.exec(tok);
  if (m) return px(m[1], inset) + px(m[2], inset);
  throw new Error("unresolvable length: " + tok);
}
// First token of a padding shorthand, respecting parentheses.
function firstToken(v) {
  let depth = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === "(") depth++;
    else if (v[i] === ")") depth--;
    else if (v[i] === " " && depth === 0) return v.slice(0, i);
  }
  return v;
}

// The bar as a box at a fixture inset. An undeclared box-sizing is resolved
// as border-box — the worst case, and what tailwind.css's reset gives.
function barBox(d, inset) {
  const padTop = d["padding-top"] != null ? px(d["padding-top"], inset) : px(firstToken(d.padding || "0"), inset);
  const height = px(d.height, inset);
  const sizing = (d["box-sizing"] || "border-box").toLowerCase();
  const outer = sizing === "content-box" ? height + padTop : Math.max(height, padTop);
  return { rowTop: padTop, row: outer - padTop, outer };
}

// --pdx-chrome as the document declares it where env() is supported.
function chromeAt(css, inset) {
  const m = /@supports\s*\(padding-top:\s*env\(safe-area-inset-top\)\)\s*\{\s*:root\s*\{\s*--pdx-chrome:\s*([^;]+);/.exec(
    stripComments(css)
  );
  return m ? px(m[1], inset) : null;
}

// No html/body rule may be a fixed-height viewport scroller: that is the
// container that keeps scroll 0 from being the document's true top.
function noViewportPin(css, where) {
  for (const sel of ["html", "body", "html, body", "html,body"]) {
    for (const body of rules(css, sel)) {
      const d = decls(body);
      for (const p of ["height", "max-height"]) {
        ok(!(d[p] && /\d(s|d|l)?vh\b/.test(d[p])), `${where}: \`${sel} { ${p}: ${d[p]} }\` pins the document to the viewport`);
      }
      for (const p of ["overflow", "overflow-y"]) {
        ok(!(d[p] && /\b(auto|scroll|hidden)\b/.test(d[p]) && sel !== "body"),
          `${where}: \`${sel} { ${p}: ${d[p]} }\` makes the root a scroll container`);
      }
    }
  }
}

// ── 1 · the inner shells ────────────────────────────────────────────────────
const SHARED = read("shell-chrome.css");
const shells = [];
for (const f of readdirSync(ROOT).filter((n) => n.endsWith(".html"))) {
  const html = read(f);
  const header = /<header class="(pdx-[a-z-]*bar)"/.exec(html);
  if (!header) continue;
  const cls = header[1];
  const inline = styleText(html);
  const own = rules(inline, "." + cls);
  const src = own.length ? inline : cls === "pdx-sh-bar" && html.includes("/shell-chrome.css") ? SHARED : null;
  shells.push({ f, cls, html, inline, src });
}
ok(shells.length >= 10, `expected the inner shells to be found, got ${shells.length}`);

for (const { f, cls, inline, src } of shells) {
  ok(src, `${f}: .${cls} has no rule in its own <style> or shell-chrome.css`);
  if (!src) continue;
  const d = Object.assign({}, ...rules(src, "." + cls).map(decls));
  ok(/fixed/.test(d.position || "") && /^0(px)?$/.test(d.top || ""), `${f}: .${cls} is not position: fixed; top: 0`);
  ok(/safe-area-inset-top/.test(d["padding-top"] || firstToken(d.padding || "")),
    `${f}: .${cls} is not padded by env(safe-area-inset-top)`);

  for (const inset of INSETS) {
    const box = barBox(d, inset);
    const chrome = chromeAt(inline, inset);
    ok(box.rowTop >= inset, `${f} @${inset}px: header row starts at ${box.rowTop}px, inside the inset`);
    ok(box.row >= ROW_PX, `${f} @${inset}px: header row is ${box.row}px, squeezed below ${ROW_PX}px — the mark clips`);
    ok(chrome === null || box.outer === chrome,
      `${f} @${inset}px: bar is ${box.outer}px but --pdx-chrome says ${chrome}px`);
    if (inset === 0) {
      ok(box.rowTop === 0 && box.outer === ROW_PX, `${f} @0px: a zero inset changed the bar (${box.outer}px, row at ${box.rowTop}px)`);
    }
  }
  ok(/padding-top:\s*(calc\()?\s*var\(--pdx-chrome\)/.test(stripComments(inline)),
    `${f}: body does not pad by var(--pdx-chrome), so content can sit under the bar`);
  noViewportPin(inline, f);
}
noViewportPin(SHARED, "shell-chrome.css");

// ── 2 · the front page ──────────────────────────────────────────────────────
{
  const html = read("index.html");
  const css = styleText(html);
  const nav = /<nav id="pdx-topnav" class="([^"]*)"/.exec(html);
  ok(nav, "index.html: #pdx-topnav is missing");
  if (nav) {
    ok(/\bfixed\b/.test(nav[1]) && /\btop-0\b/.test(nav[1]), "index.html: #pdx-topnav is not fixed at top 0");
    ok(!/(^|\s)(h|max-h)-/.test(nav[1]), "index.html: #pdx-topnav carries a fixed height utility the inset would squeeze");
  }
  const navDecls = Object.assign({}, ...rules(css, "#pdx-topnav").map(decls));
  ok(/^env\(\s*safe-area-inset-top/.test(navDecls["padding-top"] || ""), "index.html: #pdx-topnav is not padded by env(safe-area-inset-top)");
  ok(!navDecls.height && !navDecls["max-height"], "index.html: #pdx-topnav declares a height the inset would eat");
  for (const inset of INSETS) {
    const rowTop = navDecls["padding-top"] ? px(navDecls["padding-top"], inset) : 0;
    ok(rowTop === inset, `index.html @${inset}px: nav row starts at ${rowTop}px`);
    ok(chromeAt(css, inset) === 7.125 * ROOT_PX + inset, `index.html @${inset}px: --pdx-chrome does not add the inset exactly once`);
  }
  ok(/#hero\s*\{\s*min-height:\s*100svh;\s*\}/.test(stripComments(css)), "index.html: the phone hero is sized by 100vh again, not 100svh");
  noViewportPin(css, "index.html");
  noViewportPin(read("app.css"), "app.css");
  noViewportPin(read("mobile-polish.css"), "mobile-polish.css");
}

// ── 3 · the shell is re-issued ──────────────────────────────────────────────
{
  const SW = read("sw.js");
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1] || 0);
  ok(v >= 282, `sw.js: CACHE_VERSION is v${v}; the precached shell bar changed and it did not move`);
  ok(SW.includes("'/shell-chrome.css'"), "sw.js: shell-chrome.css is no longer precached");
}

if (failures) {
  console.error(`test-mobile-shell-safe-area: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`test-mobile-shell-safe-area: ok (${shells.length} shells + front page, insets ${INSETS.join("/")}px)`);
