#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-canonical-and-origin.mjs — one origin, and a canonical that means something
// ─────────────────────────────────────────────────────────────────────────────
// TWO BUGS, ONE FILE.
//
// 1. TWO DOMAINS. The public site is https://politidex.fyi — the apex, on HTTPS,
//    with www and both http spellings 301ing onto it. Seven places once named an
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
//    /issue/<slug>, /vote/<congress>/<chamber>/<roll>, /p/<id>, /?bill=…,
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

  // ── THE PUBLIC ORIGIN IS THE APEX, ON HTTPS ────────────────────────────────
  // https://politidex.fyi is the one address the site has. www — on either
  // scheme — and the apex on http all 301 onto it in a single hop, by the three
  // rules at the top of netlify.toml that section 5 below pins.
  //
  // THIS PIN HAS NOW BEEN BOTH WAYS ROUND, so it is worth writing down why it
  // landed here. It originally pinned the apex; a later pass flipped it to www on
  // the grounds that www was the indexed host and the apex merely redirected to
  // it. Both passes were arguing about which of two live hostnames to advertise.
  // What settled it was not an SEO preference but an interstitial: a tap from
  // inside the Facebook in-app browser opened the www host over plain http with an
  // ?fbclid= click id attached, and Xfinity Advanced Security (safebrowse.io)
  // painted "This site could be risky" over it. (The offending URL is described
  // here rather than quoted, because the two sweeps below forbid writing it — this
  // file is inside its own sweep, which is the point of assembling their patterns
  // from parts.) Desktop Chrome and incognito were fine, which is the tell —
  // there is nothing wrong with the content. What got scored was the SHAPE of the
  // first hop: cleartext, to the longer of two hostnames, on a young .fyi, from a
  // webview, with a click id attached.
  //
  // So the criterion changed. It is no longer "which host does Google have" but
  // "how few hops, and how little cleartext, does a cold reader traverse" — and
  // on that criterion the apex wins for a reason no preference can overturn: it
  // is the shortest name that can serve the site, and every character of "www."
  // is one more thing a link can carry that has to be redirected away. One origin,
  // and the shortest one.
  const LIVE = "politidex.fyi";
  has(R("index.html"), `<link rel="canonical" href="https://${LIVE}/"`, "index.html declares the apex origin as its canonical");
  has(R("index.html"), `<meta property="og:url" content="https://${LIVE}/"`, "…and unfurls on the same host it canonicalizes to");
  has(R("netlify/lib/digest.ts"), `https://${LIVE}`, "the digest library builds unsubscribe links on the apex origin");
  for (const f of ["netlify/functions/pdx-digest.mts", "netlify/functions/pdx-digest-cron.mts"]) {
    has(R(f), `https://${LIVE}`, `${f} builds email links on the apex origin`);
  }

  // ONE SITEMAP, ONE HOST, AND IT IS THE CANONICAL ONE. The generator writes both
  // files from a single ORIGIN — scripts/gen-sitemap.mjs — so these pins are what
  // stops a hand edit from introducing a crawl entry point on one host and
  // addresses on another. All 1,399 <loc> entries move when that constant moves,
  // which is why this pass regenerated rather than hand-edited them.
  const sitemap = R("sitemap.xml"), robots = R("robots.txt");
  has(sitemap, `<loc>https://${LIVE}/</loc>`, "sitemap.xml lists the homepage on the apex origin");
  eq(robots.match(/^Sitemap:/gm) || [], ["Sitemap:"], "robots.txt names exactly one sitemap — a second host would be a second site");
  has(robots, `Sitemap: https://${LIVE}/sitemap.xml`, "…and that one sitemap is on the apex origin");
  const locHosts = [...new Set([...sitemap.matchAll(/<loc>https?:\/\/([^/<]+)/g)].map((m) => m[1]))];
  eq(locHosts, [LIVE], "every <loc> in the sitemap is on the one canonical host");
  // THE SINGLE ORIGIN HELPER, PINNED AT ITS SOURCE. Every sitemap entry and the
  // robots Sitemap line are built by concatenating this one constant, so pinning
  // it is what makes the two assertions above a property of the generator rather
  // than of a file somebody could hand-edit back.
  has(R("scripts/gen-sitemap.mjs"), `export const ORIGIN = "https://${LIVE}"`,
     "the sitemap generator's one ORIGIN constant is the apex on HTTPS");

  // …and the www form appears in no absolute URL anywhere in the tree, on either
  // scheme. This is the assertion the previous pass had inverted, and it is the
  // one that keeps the flag from being re-earned: an absolute www URL anywhere we
  // emit is a link that, when tapped, performs the exact redirect that got scored.
  // Assembled from parts for the same reason the .org pattern above is — written
  // as one literal, this line would be its own first hit.
  //
  // netlify.toml IS THE ONE EXEMPTION, AND IT HAS TO BE. The redirect table is the
  // single place the retired spelling MUST still be written down, because naming
  // it in a `from` is what retires it. A gate that forbade the string everywhere
  // would forbid the rule that does the work. Nothing else is exempt: not a test
  // stub, not a comment, not a doc.
  const WWW = new RegExp("https?://" + "www" + "\\." + "politidex" + "\\." + "fyi", "i");
  const REDIRECT_TABLE = "netlify.toml";
  const wwwHits = files.filter((f) => f !== REDIRECT_TABLE && WWW.test(R(f)));
  eq(wwwHits, [], "no absolute URL names the www host — it 301s to the apex, so emitting it publishes a redirect as an address");
  // And the exemption is not a hole: the one file allowed to name www must name it
  // ONLY inside a redirect `from`, never in a `to`. A www target would mean the
  // table redirects onto the host it is retiring.
  const tomlLines = R(REDIRECT_TABLE).split("\n").filter((l) => WWW.test(l) && /^\s*(from|to)\s*=/.test(l));
  eq(tomlLines.filter((l) => /^\s*to\s*=/.test(l)), [],
     "the redirect table never points a `to` at the www host — that would redirect onto the spelling being retired");
  ok(tomlLines.length > 0, "…and it does still name www in a `from`, which is what retires it");

  // NO http SPELLING OF OUR OWN HOST IS EMITTED EITHER, same exemption and same
  // reason. The cleartext hop is half of what got scored, so a hardcoded http://
  // link to ourselves is the bug even when the host after it is correct.
  const INSECURE = new RegExp("http://" + "(www\\.)?" + "politidex" + "\\." + "fyi", "i");
  const insecureHits = files.filter((f) => f !== REDIRECT_TABLE && INSECURE.test(R(f)));
  eq(insecureHits, [], "no absolute URL names our host over http — cleartext is the hop the interstitial scored");

  // ── AND THE RETIRED .us DOMAIN, WHICH NO LONGER RESOLVES AT ALL ───────────
  // politidex.us was an older spelling of this site. It is not a redirect and not
  // a second host — the name does not resolve — so an absolute URL naming it is a
  // dead link, not merely a non-canonical one. Three documents still carried it
  // after the .org sweep, because that sweep looked for .org: ballot.html and
  // spotlight.html canonicalised onto it (spotlight.html being the document behind
  // every /issue/<slug> address), and ballot.html, me.html and spotlight.html all
  // pointed og:image at a /og-image.png that 404s on the live host besides. Swept
  // by ABSOLUTE URL rather than by bare name so the three prose notes that record
  // the correction are not hits: a comment explaining which host was wrong is the
  // opposite of the bug. The sandbox window.location stubs in this directory were
  // moved onto the live host rather than exempted — a stub host is arbitrary, so
  // there is no reason for it to be the one spelling this gate forbids.
  const DEAD = new RegExp("https?://" + "politidex" + "\\." + "us", "i");
  const deadHits = files.filter((f) => DEAD.test(R(f)));
  eq(deadHits, [], "no absolute URL names the retired .us domain — it does not resolve, so it is a dead address");

  // WHAT IS DELIBERATELY NOT SWEPT: the bare hostname with no scheme. Cards paint
  // "politidex.fyi" as the wordmark, the footer prints it as a signature, the
  // methodology line on a share card reads "politidex.fyi/#methodology", and the
  // ballot .ics export builds its event UIDs on "@politidex.fyi". None of those is
  // an address a crawler follows or a link a canonical competes with: the first
  // three are brand text a human reads and may type (where the 301 does its job),
  // and the last is an opaque identifier that must stay stable across exports —
  // rewriting it would make every already-exported calendar event a new event.
  const brand = new RegExp("(^|[^./@a-z])" + "politidex" + "\\." + "fyi", "i");
  ok(brand.test(R("profile-card.js")), "the painted wordmark is still the brand host, not a URL");
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
  // the query form wherever one exists. A person file has such a path now —
  // /p/<pid> — so the ?p= form collapses onto it exactly the way ?issue= already
  // collapsed onto /issue/<slug>. ?p= still RESOLVES; it just stops being the
  // address we claim, emit or advertise.
  eq(canon("/?p=lee"), "/p/lee",
     "the ?p= form collapses onto the person file's clean /p/ path");
  eq(canon("/p/lee"), "/p/lee", "a person file canonicalizes to its own /p/ path");
  eq(canon("/p/lee/"), "/p/lee", "…with or without a trailing slash");

  // AND AN ALIAS ADDRESS COLLAPSES ONTO THE RECORD'S OWN, which reverses what
  // this file used to assert. These three lines pinned /p/mike_lee → /p/mike_lee
  // back when the edge could not resolve an alias: `mike_lee` is a browse key, the
  // roster record is `lee`, and the generated index the edge reads held no row
  // under the key. So parseTarget resolved nothing, and /p/mike_lee — an address
  // the app has opened correctly for a long time, and one that is linked — served
  // the HOMEPAGE's canonical. A second address for a senator who already has one,
  // declaring itself a duplicate of "/". Collapsing it is the fix, not a
  // relaxation: the assertion below is strictly stronger than the one it replaced,
  // because it now names WHICH person the address belongs to.
  eq(canon("/p/mike_lee"), "/p/lee", "an alias address canonicalizes to the roster record's address");
  eq(canon("/p/mike_lee/"), "/p/lee", "…with or without a trailing slash");
  eq(canon("/?p=mike_lee"), "/p/lee", "…and from the ?p= form too");
  eq(canon("/p/scott_chew"), "/p/chew_h68", "the retirement case collapses the same way");
  // One person, one canonical: the two spellings must not produce two addresses.
  eq(canon("/p/mike_lee") === canon("/p/lee"), true, "both spellings of one senator yield one canonical");
  // An id nobody carries is not repointed at whoever is nearest. It keeps the
  // address it was cited at, and the edge writes no person markup for it at all.
  eq(canon("/p/definitely_not_a_politician"), "/p/definitely_not_a_politician",
     "an unknown pid keeps its own address rather than being mapped onto a real person");
  eq(canon("/issue/box-elder-stratos-data-center"), "/issue/box-elder-stratos-data-center",
     "a Spotlight canonicalizes to its clean /issue/ path");
  eq(canon("/?issue=box-elder-stratos-data-center"), "/issue/box-elder-stratos-data-center",
     "…and the ?issue= form collapses onto that same path rather than competing with it");
  eq(canon("/vote/119/house/190"), "/vote/119/house/190", "a roll call canonicalizes to its official path");
  // A bill profile is a record, so it canonicalizes to a path, and the ?bill= form
  // collapses onto it the same way ?p= collapses onto /p/. The sitting leads because
  // a bill number is only unique inside one — and a state measure, which has no
  // congress at all, gets its session code in that slot rather than nothing.
  eq(canon("/b/119/H.R.%201"), "/b/119/H.R.%201", "a bill canonicalizes to its own /b/ path");
  eq(canon("/?bill=119/H.R.%201"), "/b/119/H.R.%201",
     "the ?bill= form collapses onto the bill profile's clean /b/ path");
  eq(canon("/b/2024GS/H.B.%20257"), "/b/2024GS/H.B.%20257",
     "a state measure canonicalizes on its session, which is the only thing that makes its number unique");
  eq(canon("/b/H.R.%201"), "/b/H.R.%201", "a number cited without a sitting keeps the address it was cited at");
  eq(canon("/?receipt=mike_lee~healthcare"), "/?receipt=mike_lee~healthcare", "a receipt keeps its issue key");
  // ── A RECORD CANONICALIZES ONTO THE PERSON'S DOCUMENT ────────────────────
  // The Official Record for one member on one issue is a layer on that member's
  // file, not a variant of the front page. It used to canonicalize to
  // "/?record=mike_lee~healthcare", which told a crawler that one senator's
  // healthcare votes were really the homepage — competing with the person's own
  // /p/ page for the same content, and unable to rank as itself either way.
  //
  // The PATH is canonicalized (mike_lee → lee, the roster's own id) so a record
  // cannot publish a second address for a person who already has one. The QUERY
  // keeps the pid it was cited with, deliberately: person-file.js checks it
  // against the path and refuses a card whose pid disagrees, and silently
  // rewriting it here would repair exactly the link that ought to be caught.
  eq(canon("/?record=mike_lee~healthcare"), "/p/lee?record=mike_lee~healthcare",
     "a record canonicalizes onto the person's own document, keeping its issue key");
  // The receipt surface stays on '/' — it has no document of its own — so the
  // two remain distinct addresses for two different cards.
  ok(canon("/?receipt=mike_lee~healthcare") !== canon("/?record=mike_lee~healthcare"),
     "…and stays distinct from the receipt surface");
  // No issue named is not a record, it is a person, and it says so.
  eq(canon("/?record=mike_lee"), "/p/lee",
     "a record with no issue key is just the person, and canonicalizes as one");
  eq(canon("/?rank=healthcare&key=aca"), "/?rank=healthcare&key=aca", "a ranking keeps the focus that produced it");
  eq(canon("/?rank=healthcare"), "/?rank=healthcare", "…and does not invent one when there is none");

  // The whole reason to derive from the target: junk in the address bar does not
  // become a second canonical address for one record.
  eq(canon("/issue/box-elder-stratos-data-center?utm_source=twitter&fbclid=abc"),
     "/issue/box-elder-stratos-data-center", "tracking params are not part of a record's address");
  // ?p= wins over the path it was layered on, exactly as parseTarget decides —
  // the canonical follows the resolved record rather than second-guessing it.
  eq(canon("/issue/box-elder-stratos-data-center?p=mike_lee"), "/p/lee",
     "a profile opened on top of a Spotlight canonicalizes to the profile that is on screen");

  // Nothing may return a bare "/" — that is the bug this file exists to prevent.
  for (const u of ["/?p=mike_lee", "/p/mike_lee", "/p/lee", "/p/scott_chew", "/issue/x", "/vote/119/house/190", "/?bill=119/HR1",
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
  // THE CANONICAL IS BUILT FROM THE PINNED ORIGIN AND THE TARGET — neither half
  // from the request. This pin used to read "url.origin + canonicalPath(target)",
  // which guarded the path half and left the HOST half free to be whatever
  // answered: every address this function touches is reachable on www, on the
  // apex, and on politidex-org.netlify.app plus a per-deploy preview subdomain,
  // all answering 200. So one record self-canonicalised onto each host it was
  // fetched from, which is the duplicate-host bug section 1 exists to catch,
  // arriving through the one code path section 1 could not see.
  has(sp, 'const ORIGIN = "https://politidex.fyi"',
     "share-preview pins the one public origin rather than trusting the request host");
  has(sp, "ORIGIN + canonicalPath(target)",
     "the canonical is built from the pinned origin and the target, not from the request");
  ok(!/url\.origin \+ canonicalPath/.test(sp),
     "…and no longer from url.origin, which would self-canonicalise onto the apex or a preview host");
  // og:image is the deliberate exception and stays on the request origin: it
  // points at THIS deploy's own /.netlify/images card, so a preview renders the
  // preview's card. An image URL is not an identity claim.
  has(sp, "function ogImageUrl(origin: string", "…while the card URL still follows the deploy it is served from");
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
  // Read from spotlight-engine.js, not index.html. The third split lifted the
  // Spotlight overlay out of the homepage document into its own module (and its
  // own address, /issue/<slug> → spotlight.html), taking setMeta with it — which
  // silently stranded this harness: it went on asking index.html for a function
  // that had moved, so the only thing it could still report was its own
  // staleness. The contract it guards did not move, so neither should the pin.
  const html = R("spotlight-engine.js");
  const start = html.indexOf("function setMeta(sp)");
  must(start > 0, "spotlight-engine.js no longer defines the Spotlight's setMeta(sp)");
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

// ═════════════════════════════════════════════════════════════════════════════
section("5 · every other spelling 301s to the apex in one hop");
// ═════════════════════════════════════════════════════════════════════════════
// Sections 1–4 govern what the repo EMITS. This one governs what the edge DOES
// with a link somebody already sent — the ones in feeds, texts, print-outs and
// search indexes that still name www or http, and will keep naming them for
// years. Those links are the population that earned the interstitial, and no
// amount of correct canonical markup reaches them. Only the redirect table does.
//
// Parsed as TOML rather than grepped, because the three things that can be wrong
// here are all structural: a rule can exist with the right hostnames and the
// wrong status, it can be missing `force` and be silently shadowed by a static
// file, or it can be in the wrong POSITION and never be consulted at all. A
// substring match sees none of those.
{
  // A PURPOSE-BUILT READER RATHER THAN A TOML LIBRARY, DELIBERATELY. The only
  // parsers on hand here (`toml`, `smol-toml`) are transitive dependencies of the
  // Netlify CLI that resolve out of the build image's global node-deps, not out of
  // this repo's package.json — a test that imported one would pass in CI and throw
  // ERR_MODULE_NOT_FOUND on a contributor's machine. The subset this needs is
  // small and the file's own shape is uniform: `[[table]]` headers, `key = value`
  // lines, and one nested `[headers.values]`. Comments and blanks are skipped, so
  // the long rationale blocks in netlify.toml cannot be misread as data.
  const readTables = (src) => {
    const out = { redirects: [], headers: [] };
    let cur = null, sub = null;
    for (const raw of src.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      let m = /^\[\[(\w+)\]\]$/.exec(line);
      if (m) { cur = out[m[1]] ? (out[m[1]].push({}), out[m[1]][out[m[1]].length - 1]) : null; sub = null; continue; }
      m = /^\[(\w+)\.(\w+)\]$/.exec(line);
      if (m) { sub = cur ? (cur[m[2]] = cur[m[2]] || {}) : null; continue; }
      m = /^\[[^\]]+\]$/.exec(line);
      if (m) { cur = null; sub = null; continue; }   // an unrelated table, e.g. [images]
      m = /^([\w-]+)\s*=\s*(.+)$/.exec(line);
      if (!m || !cur) continue;
      let v = m[2].trim().replace(/\s*#.*$/, "");
      if (/^".*"$/.test(v)) v = v.slice(1, -1);
      else if (v === "true") v = true;
      else if (v === "false") v = false;
      else if (/^-?\d+$/.test(v)) v = Number(v);
      (sub || cur)[m[1]] = v;
    }
    return out;
  };
  const cfg = readTables(R("netlify.toml"));
  const rules = cfg.redirects || [];
  // The reader is only trustworthy if it actually found the shapes it claims to
  // read, so prove that before asserting anything about their contents.
  must(rules.every((r) => typeof r.from === "string"), "the redirect reader parsed a `from` for every rule");
  must((cfg.headers || []).some((h) => h.values), "the redirect reader parsed the nested [headers.values] tables");
  must(rules.length > 10, `netlify.toml still carries its redirect table (${rules.length} rules)`);

  const APEX = "https://politidex.fyi";
  // The three spellings that can reach us and are not the canonical one. Written
  // as host+scheme pairs rather than literals so the expected `from` is assembled
  // the same way the sweeps in section 1 assemble their patterns — this file is
  // inside those sweeps and may not write an absolute www or http URL of its own.
  const W = "www" + ".politidex" + ".fyi";
  const A = "politidex" + ".fyi";
  const SPELLINGS = [
    { from: `http://${A}/*`,  why: "the apex over cleartext" },
    { from: `http://${W}/*`,  why: "www over cleartext — the exact first hop that got flagged" },
    { from: `https://${W}/*`, why: "www over TLS" },
  ];

  for (const { from, why } of SPELLINGS) {
    const r = rules.find((x) => x.from === from);
    ok(r, `a redirect rule exists for ${why}`);
    if (!r) continue;
    // 301, NOT 302. A temporary redirect tells a crawler to keep asking at the old
    // spelling, which means keep making the request that got scored.
    eq(r.status, 301, `${why} answers 301 — permanent, not a 302 that invites the old spelling back`);
    // force, or the static file at '/' answers first and no redirect happens.
    eq(r.force, true, `${why} is forced — without it the publish directory's own index.html answers at 200 instead`);
    // ONE HOP: the target is the canonical origin itself, not another redirecting
    // spelling. This is what forbids http://www → http://apex → https://apex.
    eq(r.to, `${APEX}/:splat`, `${why} lands on the canonical origin directly, in a single hop`);
  }

  // ── ORDER IS PART OF THE CONTRACT ──────────────────────────────────────
  // Netlify evaluates this table top-down and the first match wins. Every other
  // rule in the file is path-only in `from`, so it matches on ANY host: if a host
  // redirect sits below one of them, a cleartext request to
  // www/<a path those rules cover> matches the rewrite first and is served HTML at
  // 200 over plain http on the non-canonical host. That is precisely the hop this
  // whole pass exists to delete, so "the rules exist" is not enough — they have to
  // be first.
  const firstThree = rules.slice(0, 3).map((r) => r.from);
  eq(firstThree, SPELLINGS.map((s2) => s2.from),
     "the three host redirects are the FIRST three rules — a path-only rewrite above them would serve HTML on port 80");

  // ── AND NOTHING ELSE IN THE TABLE REDIRECTS ONTO A NON-CANONICAL HOST ─────
  // A `to` on another absolute host would be a second origin arriving through the
  // one door section 1's file sweep cannot see, since it reads the table as text.
  const badTargets = rules
    .map((r) => String(r.to || ""))
    .filter((t) => /^https?:\/\//.test(t) && !t.startsWith(`${APEX}/`) && !t.startsWith(APEX + "?"));
  eq(badTargets, [], "no redirect in the table targets any absolute host but the canonical origin");

  // ── HSTS: THE HOP THE REDIRECTS CANNOT REMOVE ─────────────────────
  // A redirect catches a cleartext request after it has been sent. This header
  // stops the next one being sent at all, which is the difference between "we
  // handle the flagged shape" and "a warm browser cannot produce it."
  const hsts = (cfg.headers || []).find(
    (h) => h && h.values && h.values["Strict-Transport-Security"]
  );
  ok(hsts, "a Strict-Transport-Security header is declared");
  if (hsts) {
    eq(hsts.for, "/*", "HSTS rides every response, not one path — a scoped header teaches the browser nothing about the origin");
    const v = hsts.values["Strict-Transport-Security"];
    eq(v, "max-age=31536000; includeSubDomains",
       "HSTS is one year and covers subdomains — includeSubDomains is what upgrades a www link before it leaves the device");
    // NO preload, AND THIS ASSERTION IS THE POINT RATHER THAN AN OVERSIGHT.
    // Preload is a one-way door: submission bakes the whole name into browser
    // binaries and removal takes months to propagate. This pass canonicalizes and
    // stops there deliberately, so the gate pins the ABSENCE — otherwise a later
    // pass could add it by reflex while thinking it was finishing this one.
    ok(!/preload/i.test(v), "HSTS does NOT carry preload — a one-way door this pass deliberately leaves shut");
  }
  // Belt and braces on the same point: no live directive anywhere in the config
  // says preload, comments excluded so the note explaining the decision is not a hit.
  const tomlNoComments = R("netlify.toml").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  ok(!/preload/i.test(tomlNoComments), "…and no live line in netlify.toml mentions preload at all");
}

// Collect every redirect `from` in the table. Shared by sections 5 and 6; defined
// at module scope because section 5's reader is block-scoped to its own braces.
function readTablesFroms(src) {
  return src
    .split("\n")
    .map((l) => /^\s*from\s*=\s*"([^"]+)"/.exec(l.replace(/^\s*#.*$/, "")))
    .filter(Boolean)
    .map((m) => m[1]);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a hostname change moved a hostname and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
// THE RISK IN A SWEEP IS THE SWEEP. Retiring a hostname touched 114 files, and a
// regex that rewrites 114 files is exactly the kind of change that quietly takes
// something else with it. So this section does not re-test the District Voice
// lane's behaviour — test-district-voice.mjs, test-district-voice-sd3.mjs,
// test-finder-basemap.mjs and test-home-voice-gate.mjs own that, and they run in
// the same suite. It asserts the narrower thing those suites cannot: that the
// files carrying that behaviour were not edited by this pass at all, and that the
// ones which WERE edited differ from their committed form by the hostname only.
{
  const gitShow = (f) => {
    try {
      return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch { return null; }
  };
  const baseline = gitShow("netlify.toml");

  // ── THE LANES THAT MUST NOT HAVE MOVED AT ALL ───────────────────────
  // None of these carries an absolute URL, so a hostname sweep had no business in
  // any of them — which makes "byte-identical to HEAD" the honest assertion rather
  // than a proxy for one. district-voice.js owns BOARD_ROUTES and the seat
  // resolver; voice-room.js owns personOf; the board and map engines own the SD-3
  // room; and word-action.js / consistency.js / profiles-full.js are the engines
  // the twin-boot drift harnesses re-boot against HEAD. If a file here is listed
  // as differing, the twin boots downstream are no longer trivially identical and
  // this pass has exceeded its mandate.
  const FROZEN = [
    "district-voice.js", "voice-room.js", "district-board.js", "district-file.js",
    "district-room.js", "issue-map.js", "word-action.js", "consistency.js",
    "profiles-full.js", "voter-hub-location.js", "profile-alias.js",
  ];
  //
  // AND THE CLAIM IS "NO HOSTNAME IN THEM", NOT "BYTE-IDENTICAL TO HEAD". It was
  // byte-identity when the sweep was the working tree's own change, and that pin
  // could pass exactly once: the next pass to touch any of these files for any
  // unrelated reason fails it, indistinguishable from a sweep that overreached.
  // v235 was that pass — moving the finder to /find edited district-voice.js,
  // voice-room.js and voter-hub-location.js, none of them by a hostname. What
  // still has teeth afterwards is the thing the comment above actually says:
  // none of these files carries an absolute politidex address at all, so no
  // hostname sweep has any business in one, and a later pass that put a
  // hardcoded origin into the seat resolver or the record engines is caught.
  for (const f of FROZEN) {
    const src = R(f);
    eq((src.match(new RegExp("politidex" + "\\.fyi", "gi")) || []).length, 0,
       `${f} carries no absolute politidex hostname — a host sweep has no business in this file`);
  }
  // The twin-boot engines are held to the stronger form, because unlike the
  // resolver and the hallway they have no reason to change in a routing or a
  // finder pass: if one of these differs from its committed form, the drift
  // harnesses downstream are no longer trivially identical.
  const ENGINES = ["word-action.js", "consistency.js", "profiles-full.js"];
  if (baseline === null) {
    console.log("      (no git baseline available — the engine audit did not run here)");
  } else {
    const moved = ENGINES.filter((f) => { const b = gitShow(f); return b !== null && b !== R(f); });
    eq(moved, [], "no twin-boot engine file was edited — the drift harnesses stay identical by construction");
  }

  // ── BOARD_ROUTES IS STILL EXACTLY ONE ROW ────────────────────────
  // Asserted on the literal rather than inferred from the file being unchanged, so
  // it holds even where no git baseline exists. One shipped seat, one row: the
  // allow-list is what stops /district/<anything> promising a room that does not
  // exist, and a second row here would be a new board — which this pass may not add.
  const DV = R("district-voice.js");
  const routesAt = DV.indexOf("var BOARD_ROUTES = {");
  must(routesAt > 0, "district-voice.js no longer declares BOARD_ROUTES as an object literal");
  const routesLit = DV.slice(routesAt, DV.indexOf("}", routesAt) + 1);
  eq((routesLit.match(/:/g) || []).length, 1, "BOARD_ROUTES still holds exactly one row — one shipped seat, one board");
  has(routesLit, "'ut-statesenate-3': '/district/ut-sd-3'", "…and it is still SD-3 pointing at its own address");

  // ── NO SPLAT OVER /district/ ─────────────────────────────────
  // The three host rules added at the top of the table are the only wildcards this
  // pass introduced, and they are scoped by HOST. A /district/* wildcard would
  // publish an address for every district in the country; only one has a file.
  const districtFroms = (readTablesFroms(R("netlify.toml")) || []).filter((f) => f.startsWith("/district"));
  eq(districtFroms.filter((f) => f.includes("*")), [],
     "no /district/* splat redirect exists — exact paths only, one per shipped seat");
  ok(districtFroms.includes("/district/ut-sd-3"), "…and SD-3's own exact rule is still there");

  // ── /voice AND THE HOMEPAGE DOOR INTO IT ───────────────────────
  const voiceFroms = (readTablesFroms(R("netlify.toml")) || []).filter((f) => f === "/voice" || f === "/voice/");
  eq(voiceFroms, ["/voice", "/voice/"], "both spellings of /voice still route, and no third was added");
  has(R("voice.html"), `<link rel="canonical" href="https://${"politidex" + ".fyi"}/voice" />`,
     "voice.html canonicalises to /voice on the apex — the host moved, the address did not");
  has(R("voice-room.js"), "function personOf(pid)", "voice-room.js still owns personOf, unrenamed");
  has(R("index.html"), "<!-- pdx:home-voice-gate:begin -->", "the homepage Voice card is still on the front page");

  // ── THE SD-3 BOARD DOCUMENT ───────────────────────────────
  // Its head moved to the apex like every other shell. Nothing else in it may have,
  // and unlike the frozen list above this file WAS edited, so the assertion is the
  // stronger one: identical to HEAD once the hostname is normalised away.
  const SD3 = "district-ut-sd-3.html";
  has(R(SD3), `<link rel="canonical" href="https://${"politidex" + ".fyi"}/district/ut-sd-3" />`,
     "the SD-3 board canonicalises to its own address on the apex");
  const sd3Base = gitShow(SD3);
  if (sd3Base !== null) {
    const normalised = sd3Base.split("www" + ".politidex" + ".fyi").join("politidex" + ".fyi");
    eq(normalised === R(SD3), true, "…and the SD-3 board differs from its committed form by the hostname alone");
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ canonical/origin: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ canonical/origin: one origin, and every record URL is its own canonical — ${passed} assertions passed\n`);
