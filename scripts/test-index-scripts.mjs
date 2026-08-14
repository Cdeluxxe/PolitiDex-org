#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for index.html's SCRIPT AND STYLE CRITICAL PATH
// ─────────────────────────────────────────────────────────────────────────────
// index.html has no build step: it is hand-edited, it is the largest artifact in
// the repo, and every <script src> in it is a plain parser-blocking tag. That
// combination has two quiet failure modes, and both ship silently — the page
// still "works" in the sense that it renders, it just loses a feature or a
// second of first paint, with nothing in the console pointing at the cause.
//
//   1. A DANGLING REFERENCE. A file gets renamed or removed and its <script src>
//      404s. The browser reports one line in the network tab and carries on; the
//      feature that lived in that file is simply gone.
//   2. RE-INLINING. The first-paint pass moved ~2.7 MB of script out of this
//      document into cacheable external files. Nothing stops the next large
//      feature from being pasted back inline, and the document creeps back up.
//
// This harness gates:
//
//   1. EVERY LOCAL <script src> RESOLVES to a file that exists and parses.
//   2. THE HERO'S CRITICAL PATH is intact — the receipt data and renderer are
//      referenced, preloaded, and precached by the service worker.
//   3. THE DOCUMENT STAYS SPLIT — no single inline block grows past the budget,
//      and the gzipped document stays under its ceiling.
//   4. RENDER-BLOCKING CSS is not silently added to.
//   5. THE FIXED CHROME IS MEASURED ONCE — everything that has to start below the
//      nav + search stack reads one variable instead of carrying its own guess.
//
//   node scripts/test-index-scripts.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const sw = readFileSync(join(ROOT, "sw.js"), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// Budgets. These are tripwires, not targets — raise them deliberately, with a
// reason, rather than because a number went red.
const MAX_DOC_GZ = 620 * 1024;      // the whole document, gzipped
const MAX_INLINE_BLOCK = 120 * 1024; // any single inline <script>, raw
const MAX_BLOCKING_CSS = 6;          // render-blocking <link rel=stylesheet> count
const MAX_PRELOADED_CSS = 10;        // rel=preload as=style swaps (non-blocking, high priority)

// Paired match so a `<script>` written inside a JS comment or string is treated
// as body text, not as a tag.
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));

// ── 1. Every local script reference resolves and parses ──────────────────────
const srcs = TAGS
  .map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter(Boolean)
  .filter((s) => !/^(https?:)?\/\//.test(s));

ok(srcs.length > 0, "scripts: index.html references at least one local script");

// Not every local script path is a file on disk: some are generated per-request
// by an edge function (e.g. /firebase-config.js, which injects the API key from
// an environment variable so it is never committed). Those are "resolved" by an
// edge function declaring the path, not by a file existing.
const EDGE_ROUTES = new Set(
  readdirSync(join(ROOT, "netlify/edge-functions"))
    .filter((f) => /\.(ts|js|mjs)$/.test(f))
    .flatMap((f) => {
      const s = readFileSync(join(ROOT, "netlify/edge-functions", f), "utf8");
      return [...s.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    })
);

for (const src of srcs) {
  const rel = src.replace(/^\//, "").split("?")[0];
  if (EDGE_ROUTES.has("/" + rel)) { passed++; continue; }   // served dynamically
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { failures.push(`dangling: <script src="${src}"> is neither a file on disk nor an edge-function route`); continue; }
  passed++;
  try { new vm.Script(readFileSync(abs, "utf8"), { filename: rel }); passed++; }
  catch (e) { failures.push(`syntax: ${rel} does not parse as a classic script — ${e.message}`); }
}

// A parser-blocking tag with no src and no body is a leftover from a bad edit.
for (const t of TAGS) {
  const hasSrc = /\bsrc\s*=/.test(t.attrs);
  const isData = /type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs);
  ok(hasSrc || isData || t.body.trim().length > 0, "scripts: no empty <script> tags left behind");
}

// ── 2. The hero showcase's critical path is wired end to end ─────────────────
// The hero slot used to hold a single receipt. It now holds the summary card,
// because one anecdote read cold looks like a gotcha and the summary card is the
// artifact people actually share. The receipt was demoted, not deleted — the two
// halves of this section encode both sides of that swap so a later edit cannot
// quietly promote the receipt back or leave the showcase unwired.
for (const f of ["hero-showcase-data.js", "hero-showcase.js"]) {
  ok(html.includes(`<script src="/${f}"></script>`), `hero: index.html loads /${f} as a parser-blocking script`);
  ok(new RegExp(`rel="preload"[^>]*href="/${f.replace(/\./g, "\\.")}"`).test(html),
    `hero: /${f} is preloaded from the head`);
  ok(sw.includes(`'/${f}'`), `hero: /${f} is in the service worker's shell precache`);
  ok(existsSync(join(ROOT, f)), `hero: /${f} exists`);
}
ok(/<div id="hero-showcase"[^>]*\bhidden\b/.test(html),
  "hero: the showcase slot starts hidden, so a missing seed shows nothing rather than an empty frame");
{
  const hero = html.slice(html.indexOf('<section id="hero"'), html.indexOf("</section>", html.indexOf('<section id="hero"')));
  ok(hero.includes('id="hero-showcase"'), "hero: the showcase slot is inside #hero");
  ok(hero.indexOf('id="hero-showcase"') > hero.indexOf("</h1>"), "hero: the showcase sits below the headline");
  ok(hero.indexOf('id="hero-showcase"') < hero.indexOf("hero-body"), "hero: the showcase sits above the explainer copy");
  ok(!hero.includes('id="hero-receipt"'),
    "hero: the single-receipt band is out of the hero — it is one receipt among many, not the lead artifact");
}
// The receipt still ships: same true, sourced card, now a lead-in to Say vs Do.
// Deferred, so demoting it actually bought back critical-path bytes.
for (const f of ["hero-receipt-data.js", "hero-receipt.js"]) {
  ok(html.includes(`<script src="/${f}" defer></script>`), `hero: /${f} loads deferred, off the critical path`);
  ok(!new RegExp(`rel="preload"[^>]*href="/${f.replace(/\./g, "\\.")}"`).test(html),
    `hero: /${f} is no longer preloaded — a demoted band must not keep hero priority`);
  ok(sw.includes(`'/${f}'`), `hero: /${f} is in the service worker's shell precache`);
  ok(existsSync(join(ROOT, f)), `hero: /${f} exists`);
}
ok(/<div id="hero-receipt"[^>]*\bhidden\b/.test(html),
  "hero: the receipt slot starts hidden, so a missing seed shows nothing rather than an empty frame");
ok(html.indexOf('id="hero-receipt"') < html.indexOf('<section id="say-vs-do"'),
  "hero: the demoted receipt sits directly above Say vs Do, where it reads as one example");

// ── 3. The document stays split ──────────────────────────────────────────────
{
  const inline = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && !/type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs));
  const biggest = inline.reduce((a, t) => Math.max(a, t.body.length), 0);
  ok(biggest <= MAX_INLINE_BLOCK,
    `split: the largest inline <script> is ${(biggest / 1024).toFixed(0)} KB (budget ${MAX_INLINE_BLOCK / 1024} KB) — ` +
    "extract it to a cacheable external file instead of growing the document");

  const gz = gzipSync(Buffer.from(html)).length;
  ok(gz <= MAX_DOC_GZ,
    `split: index.html is ${(gz / 1024).toFixed(0)} KB gzipped (budget ${MAX_DOC_GZ / 1024} KB)`);
  console.log(`  index.html: ${(html.length / 1024 / 1024).toFixed(2)} MB raw, ${(gz / 1024).toFixed(0)} KB gzipped, ` +
    `${inline.length} inline blocks (largest ${(biggest / 1024).toFixed(0)} KB), ${srcs.length} local script refs`);
}

// ── 4. Render-blocking CSS is not silently added to ──────────────────────────
// Two async patterns are in use in this document, and NEITHER blocks first paint:
//   · `media="print" onload="this.media='all'"` — lowest fetch priority. For CSS
//     that only dresses modal/overlay content the visitor has not opened yet.
//   · `rel="preload" as="style" onload="this.rel='stylesheet'"` — high fetch
//     priority, applied as soon as it lands. For CSS that styles content laid out
//     IN THE PAGE FLOW, where arriving late means reflowing the page under the
//     reader (see the note above the links in index.html).
// So a link counts against the blocking budget only when its own `rel` attribute
// is literally `stylesheet` and it carries no media swap. Event-handler
// attributes are stripped before classifying, because the preload pattern's
// onload body contains the text `rel='stylesheet'` and would otherwise be
// misread as a render-blocking tag.
{
  const noNoscript = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
  const withoutHandlers = (tag) =>
    tag.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
  const links = [...noNoscript.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);

  const blocking = links
    .map(withoutHandlers)
    .filter((tag) => /rel\s*=\s*["']stylesheet["']/i.test(tag))
    .filter((tag) => !/media\s*=\s*["']print["']/i.test(tag));
  ok(blocking.length <= MAX_BLOCKING_CSS,
    `css: ${blocking.length} render-blocking stylesheets (budget ${MAX_BLOCKING_CSS}) — ` +
    `use the media="print" onload swap with a <noscript> fallback for anything below the fold`);
  console.log(`  render-blocking stylesheets: ${blocking.length}`);

  // The high-priority preload swap is non-blocking, but it does compete for
  // bandwidth on the critical path, so it gets its own tripwire rather than
  // becoming an unbounded way around the budget above.
  const preloaded = links
    .map(withoutHandlers)
    .filter((tag) => /rel\s*=\s*["']preload["']/i.test(tag) && /as\s*=\s*["']style["']/i.test(tag));
  ok(preloaded.length <= MAX_PRELOADED_CSS,
    `css: ${preloaded.length} high-priority preloaded stylesheets (budget ${MAX_PRELOADED_CSS}) — ` +
    `only page-flow CSS earns the priority; modal-only CSS belongs on the media="print" swap`);
  console.log(`  high-priority preloaded stylesheets: ${preloaded.length}`);

  // The hero cards' styles must NOT be one of them: they have to be correct in
  // the first frame, so they live inline in the head.
  ok(/#hero-showcase\s*\{/.test(html), "css: the hero showcase's styles are inlined in the document head");
  ok(/#hero-receipt\s*\{/.test(html), "css: the hero receipt's styles are inlined in the document head");
}

// ── 5. The fixed chrome is one number, and the hero clears it ─────────────────
// The whole top of every page is a single fixed <nav> holding two stacked rows:
// the nav bar and the All-Seeing Eye search row. Anything starting at the top of
// the document has to begin below both. The hero used to carry its own guesses at
// that height — a desktop `pt-32` and two smaller phone values — and the phone
// guesses were shorter than the chrome, so at scroll 0 the POLITIDEX wordmark
// rendered underneath the search bar. Nothing catches that: each value is valid
// CSS, and the collision only appears at the viewport widths that use it.
//
// So the height is declared once and every consumer derives from it. These
// assertions exist to keep it that way, because the failure mode is not a broken
// rule — it is a second, plausible-looking number.
{
  const css = readFileSync(join(ROOT, "app.css"), "utf8");
  ok(/:root\s*\{[^}]*--pdx-chrome:\s*[\d.]+rem/.test(html),
    "chrome: --pdx-chrome is not declared on :root — the fixed nav + search height has no single home");

  // Every #hero top padding, at every breakpoint, is chrome + air. A bare length
  // here is the exact shape of the original bug.
  const heroPads = [...html.matchAll(/#hero\s*\{[^}]*?padding-top:\s*([^;}]+)/g)].map((m) => m[1].trim());
  ok(heroPads.length >= 2,
    "chrome: the hero's top padding is not stated in the inline critical CSS, so first paint depends on a\n" +
    "    stylesheet that has not arrived yet");
  ok(heroPads.every((v) => v.includes("var(--pdx-chrome")),
    `chrome: a #hero top padding is a hand-measured length (${heroPads.filter((v) => !v.includes("var(--pdx-chrome")).join(", ")})\n` +
    "    — that is the guess that put the brand wordmark under the search bar on phones");

  // Anchor scrolling reads the same number. A hand-measured offset here lands a
  // jumped-to heading behind the chrome instead.
  ok(/scroll-padding-top:\s*calc\(var\(--pdx-chrome/.test(css),
    "chrome: app.css's scroll-padding-top carries its own measurement of the fixed chrome");

  // The phone overrides have to key on classes the markup actually carries. The
  // previous set matched `.mb-8` while the markup said `mb-5 md:mb-8`, so every
  // trim — including hiding the badge on short screens — silently did nothing.
  const hero = html.slice(html.indexOf('<section id="hero"'), html.indexOf("</section>", html.indexOf('<section id="hero"')));
  // Depth of each hook inside the hero, counting only <div> nesting. Every rule
  // above is a child combinator, so a hook one level deeper is styled by nothing.
  const heroDepth = (cls) => {
    const src = hero.replace(/<!--[\s\S]*?-->/g, "");
    const at = src.search(new RegExp(`<div class="[^"]*\\b${cls}\\b`));
    if (at < 0) return -1;
    let depth = 0;
    for (const m of src.slice(0, at).matchAll(/<(\/?)div\b/g)) depth += m[1] ? -1 : 1;
    return depth;
  };
  for (const cls of ["hero-stack-top", "hero-brand", "hero-stack-end"]) {
    ok(new RegExp(`class="[^"]*\\b${cls}\\b`).test(hero),
      `chrome: no element in the hero carries .${cls}, so the rules written against it are dead CSS`);
    ok(new RegExp(`#hero\\s*>\\s*\\.${cls}\\b`).test(html),
      `chrome: .${cls} is on a hero element but nothing styles it — a hook with no rule is a rule that was lost`);
    ok(heroDepth(cls) === 0,
      `chrome: .${cls} is not a direct child of #hero (nested ${heroDepth(cls)} deep), so every\n` +
      `    \`#hero > .${cls}\` override — including the clearance that keeps the brand lockup out from under\n` +
      "    the search bar — stops applying to it");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — index.html critical path: no dangling refs, document stays split`);
