#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-canonical-and-origin.mjs — one origin, and a canonical that means something
// ─────────────────────────────────────────────────────────────────────────────
// TWO BUGS, ONE FILE.
//
// 1. TWO DOMAINS. The public site is politidex.fyi. Seven places still named an
//    old .org host that we do not serve, and they were not decorative: the digest
//    library built every emailed UNSUBSCRIBE link from it (an unsubscribe link
//    that 404s is a compliance problem, not a typo), the digest functions built
//    every record link in every email from it, the ballot .ics export stamped it
//    into every calendar event UID, and the shared ballot summary printed it as
//    the place to go. There is now exactly one origin in the repo.
//
// 2. A CANONICAL THAT LIES. index.html is a single document, so it carries a
//    single hardcoded `<link rel="canonical" href="https://politidex.fyi/">` and
//    a single `og:url`. Every share link is a rewrite of that same document —
//    /issue/<slug>, /vote/<congress>/<chamber>/<roll>, /?p=<id>, /?bill=…,
//    /?receipt=… — so every one of them shipped a HEAD whose title, description
//    and card were record-specific while its canonical said "this is really the
//    homepage." That is the strongest instruction there is to index none of them.
//
//    Both halves are fixed where they can be seen: the edge function rewrites the
//    served HTML for scrapers, and the Spotlight's own meta swap rewrites the live
//    document for anything reading the DOM. The canonical is derived from the
//    PARSED TARGET, not from the request, so tracking params and duplicate address
//    forms collapse to the one address that actually opens the record.
//
//   node scripts/test-canonical-and-origin.mjs
//
// Transpiles netlify/lib/share-target.ts with esbuild, same as
// scripts/test-share-preview.mjs. No database, no network, no browser.

import { readFileSync, readdirSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++; else failures.push(`${m}\n    expected ${y}\n    got      ${x}`);
};
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ canonical/origin: STALE HARNESS — ${m}`); process.exit(2); };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · there is exactly one public origin in the repo");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Walk the whole tree rather than a hand-listed set of files: the point of this
  // gate is to catch the eighth occurrence someone adds in a directory nobody
  // thought to list. Skip only what we do not author.
  const SKIP = new Set(["node_modules", ".git", ".netlify", "dist", "build", ".cache"]);
  const EXT = /\.(js|mjs|cjs|ts|mts|tsx|jsx|html|css|json|toml|md|yml|yaml|sql|txt)$/i;
  const walk = (dir, out = []) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p, out);
      else if (EXT.test(e.name) && statSync(join(ROOT, p)).size < 4_000_000) out.push(p);
    }
    return out;
  };
  const files = walk("");
  must(files.length > 300, `the origin sweep sees the repo (${files.length} files)`);

  // Assembled from parts on purpose: written out as one literal, this file would
  // be its own first hit and the gate would have to exempt itself. Built this way
  // the sweep covers the entire repo, including the sweep.
  const OLD = new RegExp("politidex" + "\\." + "org", "i");
  const hits = files.filter((f) => OLD.test(R(f)));
  eq(hits, [], "no file names the retired .org domain — including comments, docs and runbooks");

  // …and the live origin is present and singular. A second live host would be the
  // same bug wearing a different name.
  const LIVE = "politidex.fyi";
  has(R("index.html"), `<link rel="canonical" href="https://${LIVE}/"`, "index.html declares the live origin as its canonical");
  has(R("netlify/lib/digest.ts"), `https://${LIVE}`, "the digest library builds unsubscribe links on the live origin");
  for (const f of ["netlify/functions/pdx-digest.mts", "netlify/functions/pdx-digest-cron.mts"]) {
    has(R(f), `https://${LIVE}`, `${f} builds email links on the live origin`);
  }
  const wwwHits = files.filter((f) => /https?:\/\/www\.politidex\./i.test(R(f)));
  eq(wwwHits, [], "no file mixes a www host into the apex origin — one form, or the two compete as duplicates");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · canonicalPath derives the record address, not the request");
// ═════════════════════════════════════════════════════════════════════════════
{
  const outFile = join(mkdtempSync(join(tmpdir(), "canon-test-")), "share-target.mjs");
  execFileSync(
    join(ROOT, "node_modules/.bin/esbuild"),
    [join(ROOT, "netlify/lib/share-target.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${outFile}`],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  const S = await import(outFile);
  must(typeof S.canonicalPath === "function", "share-target.ts no longer exports canonicalPath");

  const canon = (u) => {
    const t = S.parseTarget(new URL(u, "https://politidex.fyi"));
    return t ? S.canonicalPath(t) : null;
  };

  // Every surface gets an address that opens the record, and a clean path beats
  // the query form wherever one exists.
  eq(canon("/?p=mike_lee"), "/?p=mike_lee", "a profile canonicalizes to its own ?p= address");
  eq(canon("/issue/box-elder-stratos-data-center"), "/issue/box-elder-stratos-data-center",
     "a Spotlight canonicalizes to its clean /issue/ path");
  eq(canon("/?issue=box-elder-stratos-data-center"), "/issue/box-elder-stratos-data-center",
     "…and the ?issue= form collapses onto that same path rather than competing with it");
  eq(canon("/vote/119/house/190"), "/vote/119/house/190", "a roll call canonicalizes to its official path");
  eq(canon("/?bill=119/H.R.%201"), "/?bill=119%2FH.R.%201", "a bill canonicalizes to its own address");
  eq(canon("/?receipt=mike_lee~healthcare"), "/?receipt=mike_lee~healthcare", "a receipt keeps its issue key");
  eq(canon("/?record=mike_lee~healthcare"), "/?record=mike_lee~healthcare",
     "a record keeps its issue key — and stays distinct from the receipt surface");
  eq(canon("/?rank=healthcare&key=aca"), "/?rank=healthcare&key=aca", "a ranking keeps the focus that produced it");
  eq(canon("/?rank=healthcare"), "/?rank=healthcare", "…and does not invent one when there is none");

  // The whole reason to derive from the target: junk in the address bar does not
  // become a second canonical address for one record.
  eq(canon("/issue/box-elder-stratos-data-center?utm_source=twitter&fbclid=abc"),
     "/issue/box-elder-stratos-data-center", "tracking params are not part of a record's address");
  // ?p= wins over the path it was layered on, exactly as parseTarget decides —
  // the canonical follows the resolved record rather than second-guessing it.
  eq(canon("/issue/box-elder-stratos-data-center?p=mike_lee"), "/?p=mike_lee",
     "a profile opened on top of a Spotlight canonicalizes to the profile that is on screen");

  // Nothing may return a bare "/" — that is the bug this file exists to prevent.
  for (const u of ["/?p=mike_lee", "/issue/x", "/vote/119/house/190", "/?bill=119/HR1",
                   "/?receipt=a~b", "/?record=a~b", "/?rank=healthcare"]) {
    const c = canon(u);
    ok(c && c !== "/", `${u} does not canonicalize to the homepage (got ${JSON.stringify(c)})`);
    ok(c.startsWith("/"), `${u} canonicalizes to an origin-relative path`);
  }
  // A non-share address is not a target at all and is left entirely alone.
  eq(canon("/"), null, "the homepage itself is not a share target and keeps its static canonical");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the edge function rewrites canonical, not just og:url");
// ═════════════════════════════════════════════════════════════════════════════
{
  const sp = R("netlify/edge-functions/share-preview.ts");
  has(sp, "canonicalPath", "share-preview imports the canonical deriver");
  has(sp, "function setCanonical", "share-preview can rewrite a canonical href");
  has(sp, "setCanonical(html", "…and actually calls it on the served HTML");
  has(sp, "url.origin + canonicalPath(target)", "the canonical is built from the target, not from url.toString()");
  ok(!/applyMeta\([^)]*url\.toString\(\)/.test(sp),
    "og:url is still the raw request URL — a tracking param would become part of the record's identity");

  // The rewriter has to survive attribute order, because nothing guarantees it.
  const fn = sp.slice(sp.indexOf("function setCanonical"), sp.indexOf("function setCanonical") + 700);
  ok(/rel="canonical"\\s\+href/.test(fn.replace(/\\\\s/g, "\\s")) || fn.includes('rel="canonical"'),
    "setCanonical matches the rel-first form the document actually ships");
  ok(fn.includes('rel="canonical"') && fn.split('rel="canonical"').length >= 3,
    "setCanonical handles both attribute orders, so a head reshuffle cannot silently no-op it");

  // The document must still present a tag for it to find.
  ok(/<link rel="canonical" href="[^"]+" \/>/.test(R("index.html")),
    "index.html ships a canonical tag in the rel-first form setCanonical matches");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the live document's canonical tracks the open record too");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Scrapers read the served HTML; JS-executing crawlers, reader modes and
  // "copy canonical link" tools read the DOM. The Spotlight overlay changes what
  // the page IS, so both have to move.
  const html = R("index.html");
  const start = html.indexOf("function setMeta(sp)");
  must(start > 0, "index.html no longer defines the Spotlight's setMeta(sp)");
  const block = html.slice(start, html.indexOf("function showOverlay", start));
  has(block, "setCanonicalHref(spotlightUrl(sp.slug))", "opening a Spotlight repoints the live canonical at the Spotlight");
  has(block, "_meta.canonical", "…the homepage canonical is saved first");
  has(block, "setCanonicalHref(_meta.canonical)", "…and restored when the overlay closes");
  has(block, 'link[rel="canonical"]', "the helper reads the real canonical link element");
  // Saving must happen inside the one-time snapshot, or the restore puts back a
  // Spotlight URL and every later close is wrong.
  const snapshot = block.slice(block.indexOf("if (!_meta)"), block.indexOf("document.title ="));
  has(snapshot, "_meta.canonical", "the canonical is captured in the same one-shot snapshot as the meta tags");
}

console.log("");
if (failures.length) {
  console.error(`✗ canonical/origin: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ canonical/origin: one origin, and every record URL is its own canonical — ${passed} assertions passed\n`);
