#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for person.html — THE SECOND SHELL
// ─────────────────────────────────────────────────────────────────────────────
// /p/<pid> used to be index.html: 2.3 MB of markup and ~114 script tags, about
// 11.9 MB of JavaScript, for an address whose entire job is to open one record.
// The homepage civic OS, the account graph, Compare, the Archive, the Evidence
// Locker and both Doors all loaded and all ran on the main thread underneath the
// record a reader had actually asked for. The first split gave that address its
// own document: netlify.toml rewrites /p/* to /person.html, and person.html
// carries the person lane and nothing else.
//
// A second hand-edited shell with no build step has failure modes the first one
// does not, and every one of them ships silently:
//
//   1. IT SILENTLY REGROWS. Nothing stops the next feature from pasting a
//      homepage module back into this document, and the split quietly undoes
//      itself one <script> at a time.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /p/<pid> is two segments deep
//      and its rewrite returns 200 for anything beneath it, so src="person-file
//      .js" resolves to /p/person-file.js, matches the rewrite, and hands the
//      browser this document to parse as JavaScript.
//   3. THE TWO DOCUMENTS DRIFT. Eight inline blocks here are verbatim copies of
//      index.html, and /issue-map.js is a verbatim copy of a region of
//      alignment-tool.js. A fix applied to one side and not the other is a bug
//      that reproduces on exactly one URL shape.
//   4. THE DOM CONTRACT BREAKS. Four ids are dereferenced with no null check by
//      the shipped modules. Losing one is a thrown TypeError mid-render.
//   5. THE SERVICE WORKER KEEPS SERVING THE OLD SHELL. If /person.html is not
//      precached, an offline person address falls back to a document its own
//      rewrite no longer sends it to.
//
// This harness gates:
//
//   1. THE REWRITE. /p/lee and /p/mike_lee resolve to /person.html at 200, and
//      every other address still resolves to index.html.
//   2. THE DENYLIST. compare-hub.js, alignment-tool.js and the rest of the
//      homepage/account stack are absent from this document.
//   3. WHAT MUST BE PRESENT. The person lane's own modules, in index.html's
//      relative order, each resolving to a file that parses.
//   4. EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE — scripts, links and the string
//      literals that feed dynamic loads.
//   5. THE VERBATIM COPIES are byte-identical to their sources.
//   6. THE DOM CONTRACT — the four unguarded ids, and the dropped footer.
//   7. THE CSS BUDGET — three render-blocking sheets, and --pdx-chrome declared.
//   8. THE SERVICE WORKER precaches /person.html and this document's modules.
//   9. THE EDGE ANCHORS share-preview.ts rewrites are all still present.
//
//   node scripts/test-person-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const html = read("person.html");
// person.html is heavily commented, and several of those comments quote the exact
// markup and the exact code this harness is checking for — the header comment
// names every denylisted module, the stylesheet comment names issue-view.css,
// and the funding comment quotes the bootstrap that had to be cut. A comment
// cannot satisfy a contract, so every PRESENCE-or-ABSENCE check below runs
// against `bare`: the document with its HTML comments removed. (Verified safe:
// no inline block in person.html contains an HTML comment marker, so stripping
// them cannot cut into executable code.)
const bare = html.replace(/<!--[\s\S]*?-->/g, "");
const index = read("index.html");
const sw = read("sw.js");
const toml = read("netlify.toml");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// Budgets. Tripwires, not targets — raise them deliberately, with a reason. The
// whole point of this document is that it is small; a number going red here is
// the split being undone, not a metric needing adjustment.
const MAX_DOC_GZ = 90 * 1024;     // the whole document, gzipped
const MAX_SCRIPT_TAGS = 70;       // <script src> count, external SDKs included
const MAX_BLOCKING_CSS = 3;       // render-blocking <link rel=stylesheet>

// Paired match, so a `<script>` written inside a JS comment or a string literal
// (index.html's copied blocks contain three) is body text and not a tag.
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const srcs = TAGS
  .map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter(Boolean);
const localSrcs = srcs.filter((s) => !/^(https?:)?\/\//.test(s));

// ── 1. The rewrite: /p/* serves person.html, everything else serves index ────
// Netlify matches [[redirects]] top to bottom and takes the first hit, so the
// question a test can actually answer is "which rule wins for this path", not
// "does a rule exist". `*` is a trailing wildcard; `:splat` interpolates it.
const RULES = [...toml.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const body = m[1];
  const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const resolveAddr = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) {
      const prefix = r.from.slice(0, -1);            // "/p/*" → "/p/"
      if (path.startsWith(prefix)) return r;
    } else if (r.from === path) return r;
  }
  return null;
};

ok(RULES.length > 0, "rewrite: netlify.toml declares at least one [[redirects]] rule");
for (const addr of ["/p/lee", "/p/mike_lee", "/p/celeste_maloy", "/p/null"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/person.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /person.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
// The whole point of "do one thing": no other address moved off index.html.
for (const addr of ["/vote/hr1", "/d/ut-statehouse-68", "/b/hr1", "/locker", "/locker/x"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/index.html",
    `rewrite: ${addr} still resolves to /index.html (got ${hit ? hit.to : "no matching rule"})`);
}
// /issue/* LEFT THAT LIST IN THE THIRD SPLIT, for the same reason /i/* left it
// in the second: it got its own document. /issue/<slug> is a Spotlight — one
// long curated writeup out of the 1.2 MB spotlights-data.js — and it now serves
// /spotlight.html, which scripts/test-spotlight-shell.mjs owns. It is checked
// here rather than just deleted, because what THIS harness has a stake in is
// that a third rewrite did not reach back into /p/.
{
  const hit = resolveAddr("/issue/guns");
  ok(hit && hit.to === "/spotlight.html" && String(hit.status) === "200",
    `rewrite: /issue/guns is served /spotlight.html at 200, not this document (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
// /i/* LEFT THIS LIST IN THE SECOND SPLIT, and it is checked here rather than
// just deleted. /i/<key> — the Issue File address every gap-sheet title, stance
// tree leaf and Word-vs-Action shape row on a person file links to — now serves
// its own document, /issue.html, and scripts/test-issue-shell.mjs owns that
// contract. What THIS harness still has a stake in is that the change did not
// reach back into /p/: a person address must still get person.html, which the
// loop above asserts, and an issue address must not be answered by it.
{
  const hit = resolveAddr("/i/guns");
  ok(hit && hit.to === "/issue.html" && String(hit.status) === "200",
    `rewrite: /i/guns is served /issue.html at 200, not this document (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}

// '/' has no rewrite of its own — it is the published document. A rule that
// started matching it would mean the homepage had been moved by accident.
ok(resolveAddr("/") === null, "rewrite: / is not caught by any rewrite rule");
ok(existsSync(join(ROOT, "person.html")), "rewrite: /person.html exists to be served");

// ── 2. The denylist — what this document exists in order NOT to load ─────────
// Each of these is either a homepage surface, an account/Door surface, or a
// click-through into one. If a module is only used for homepage grids, it does
// not ship here; that is the rule the split is built on, and this is the gate.
const DENY = [
  "compare-hub.js", "compare-table.js", "alignment-tool.js", "like-dislike.js",
  "my-stances.js", "ballot-workspace.js", "archive-browse.js", "evidence-locker.js",
  "all-seeing-eye.js", "your-file.js", "your-ballot.js", "voter-hub-location.js",
  "my-profile.js", "profile-connect.js", "door1-workspace.js", "door2-spine.js",
  "hero-showcase.js", "hero-showcase-data.js", "hero-receipt.js", "spotlight-hub.js",
  "spotlight-cards-data.js", "relevant-grid.js", "who-represents-me.js",
  "receipt-cards.js", "issue-view.js", "issue-page.js", "issue-file.js",
  "bill-detail.js", "bills.js", "claim-check.js", "journey.js", "support-route.js",
  "support-lane.js", "self-defection.js", "pdx-learn.js", "first-run.js",
  "district-room.js", "district-file.js", "district-voice.js", "district-ballot.js",
  "judicial-ballot.js", "seat-field.js", "ballot-breakdown.js", "ballot-actions.js",
  "impact-tracker.js", "impact-ledger.js", "race-sheet.js", "issue-compare.js",
  "scope-chrome.js", "pdx-issue-profile.js", "digital-library.js", "hr1-showcase.js",
  "gov-contracts.js", "stance-library.js", "data-hygiene-ext.js", "live-proof.js",
];
for (const f of DENY) {
  ok(!localSrcs.some((s) => s === "/" + f),
    `denylist: person.html must not load /${f} — it belongs to the homepage or the account graph`);
}
// The two the request named explicitly, checked against the raw text as well, so
// a preload hint or a dynamic injection cannot smuggle them in past the tag scan.
for (const f of ["compare-hub.js", "alignment-tool.js"]) {
  const refs = [...bare.matchAll(new RegExp(`["'(=]\\s*/?${f.replace(/\./g, "\\.")}`, "g"))];
  ok(refs.length === 0,
    `denylist: /${f} is not referenced anywhere in person.html, not even as a preload or a dynamic src`);
}

// ── 3. What must be present, and in index.html's relative order ──────────────
// These modules register with each other and extend shared objects as they
// execute, so the ORDER is behaviour and not tidiness. The expected order is
// read off index.html rather than written down twice: any module on both
// documents must appear here in the same relative sequence it has there.
const MUST_LOAD = [
  "/pdx-perf.js", "/pdx-lazy-data.js", "/share-links.js", "/cmp-data.js",
  "/firebase-config.js", "/firebase-boot.js",
  "/pdx-stability.js", "/person-link.js", "/data-hygiene.js",
  "/profiles-full.js", "/profile-evidence.js",
  "/politician-stances-core.js", "/politician-stances-ext.js",
  "/state-senate-stances.js",
  "/stance-helpers.js", "/issue-map.js", "/pdx-issue-family.js", "/issue-colors.js",
  "/issue-scope.js", "/formal-index.js", "/publication-floor.js", "/finance-lane.js",
  "/person-file.js", "/voting-record.js", "/say-vs-do.js", "/consistency.js",
  "/stance-tree.js", "/ballot-axes.js", "/profile-card.js", "/share-anywhere.js",
  "/profile-spine.js", "/person-outline.js",
  "/exec-action-data.js", "/exec-record.js", "/exec-record-ui.js", "/controversies.js",
  "/coverage.js", "/gaps.js", "/inventory.js", "/word-action.js", "/record-card.js",
  "/profile-dossier.js",
  "/judicial-data.js", "/judicial-retention.js", "/judge-file.js",
];
for (const m of MUST_LOAD) ok(localSrcs.includes(m), `modules: person.html loads ${m}`);
for (let w = 2; w <= 16; w++) {
  ok(localSrcs.includes(`/state-senate-stances-w${w}.js`),
    `modules: person.html loads /state-senate-stances-w${w}.js (the waves are additive over one object — a partial set is a legislator with no positions)`);
}
// The three Firebase compat bundles, anonymous auth only.
for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) {
  ok(srcs.some((s) => s.includes(f)), `modules: person.html loads the Firebase ${f} bundle`);
}
{
  // issue-map.js occupies alignment-tool.js's slot, so compare the two orders
  // with that one substitution applied.
  const idxOrder = [...index.matchAll(/<script\b[^>]*src="(\/[^"]+)"/gi)]
    .map((m) => (m[1] === "/alignment-tool.js" ? "/issue-map.js" : m[1]));
  const expected = idxOrder.filter((p) => localSrcs.includes(p));
  const actual = localSrcs.filter((p) => expected.includes(p));
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    `order: person.html loads the shared modules in index.html's relative order\n      expected: ${expected.join(" ")}\n      actual:   ${actual.join(" ")}`);
}

// Every local reference resolves to a file that exists and parses. /firebase-
// config.js is generated per request by an edge function so the API key is never
// committed — it is "resolved" by a route declaring the path, not by a file.
const EDGE_ROUTES = new Set(
  readdirSync(join(ROOT, "netlify/edge-functions"))
    .filter((f) => /\.(ts|js|mjs)$/.test(f))
    .flatMap((f) => [...read(join("netlify/edge-functions", f)).matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]))
);
for (const src of localSrcs) {
  const rel = src.replace(/^\//, "").split("?")[0];
  if (EDGE_ROUTES.has("/" + rel)) { passed++; continue; }
  if (!existsSync(join(ROOT, rel))) { failures.push(`dangling: <script src="${src}"> is neither a file on disk nor an edge-function route`); continue; }
  passed++;
  try { new vm.Script(read(rel), { filename: rel }); passed++; }
  catch (e) { failures.push(`syntax: ${rel} does not parse as a classic script — ${e.message}`); }
}
// Every inline block has to parse too: one of them is a PARTIAL copy of an
// index.html block (the funding lane, cut before its homepage bootstrap and
// re-closed here), which is exactly the edit that can leave a document with an
// unbalanced brace and no error until a browser loads it.
let inlineBlocks = 0;
for (const t of TAGS) {
  if (/\bsrc\s*=/.test(t.attrs) || /type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs)) continue;
  inlineBlocks++;
  try { new vm.Script(t.body, { filename: `person.html inline #${inlineBlocks}` }); passed++; }
  catch (e) { failures.push(`syntax: person.html inline block #${inlineBlocks} does not parse — ${e.message}`); }
}
ok(inlineBlocks >= 10, `inline: person.html carries its copied inline blocks (found ${inlineBlocks})`);
for (const t of TAGS) {
  const hasSrc = /\bsrc\s*=/.test(t.attrs);
  const isData = /type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs);
  ok(hasSrc || isData || t.body.trim().length > 0, "inline: no empty <script> tags left behind");
}

// The funding lane's cut, asserted directly: renderFTM() dereferences #ftm-grid
// and #ftm-count with no null check and neither id exists on this document, so
// index.html's `DOMContentLoaded → renderFTM` bootstrap must NOT have come with
// the copy. It would throw at boot on every single /p/ address.
ok(!/addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*renderFTM\s*\)/.test(bare),
  "funding: index.html's renderFTM bootstrap is not copied — it would dereference #ftm-grid on a document that has no funding section");
{
  // renderFTM may still be DEFINED (it is, at the end of the copied region) as
  // long as nothing on this document can reach it. Its one surviving call site
  // is inside window.setFTMSector, which only the homepage's own sector buttons
  // invoke — and those are not here.
  // The lookbehind skips the DECLARATION (`function renderFTM()`); what is
  // being counted is call sites.
  const calls = [...bare.matchAll(/(?<!function )(?<![.\w])renderFTM\s*\(\s*\)/g)].length;
  ok(calls === 1, `funding: renderFTM has exactly one reachable-by-nothing call site left (found ${calls})`);
  ok(/window\.setFTMSector = function\(sector\) \{\s*\n\s*ftmCurrentSector = sector;\s*\n\s*renderFTM\(\);/.test(bare),
    "funding: that call site is inside window.setFTMSector, which no control on this document invokes");
}
ok(!/id="ftm-grid"/.test(bare) && !/id="ftm-count"/.test(bare) && !/id="ftm-sec-/.test(bare),
  "funding: the homepage funding section's own DOM is absent, which is why the bootstrap had to be cut");

// ── 4. Every same-origin asset reference is root-absolute ────────────────────
// THE HTML-AS-JS BUG. /p/<pid> is served by a rewrite that returns HTTP 200 for
// anything under /p/, so a path-relative src="person-file.js" on this document
// resolves to /p/person-file.js, matches that rewrite, and the browser is handed
// person.html and told to parse it as JavaScript. There is no 404 to notice: the
// request succeeds and the module silently never defines anything. A leading
// slash is correct at every depth, so the rule is absolute, with no exceptions.
const rooted = (v) => /^(\/|https?:|\/\/|data:|#|mailto:)/.test(v);
{
  const relScripts = localSrcs.filter((v) => !rooted(v));
  ok(relScripts.length === 0,
    `assets: ${relScripts.length} <script src> are path-relative and will parse person.html as JavaScript under the /p/* rewrite — write them as "/file.js": ${relScripts.join(", ")}`);

  const linkRefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => (m[0].match(/\bhref\s*=\s*["']([^"']+)["']/) || [])[1])
    .filter(Boolean);
  const relLinks = linkRefs.filter((v) => !rooted(v));
  ok(relLinks.length === 0,
    `assets: ${relLinks.length} <link href> are path-relative and break under the /p/* rewrite the same way: ${relLinks.join(", ")}`);

  const dynamic = [
    ...html.matchAll(/\.src\s*=\s*["']([^"'`]+)["']/g),
    ...html.matchAll(/loadScript\(\s*["']([^"'`]+)["']/g),
  ].map((m) => m[1]).filter((v) => /\.(js|mjs|css)(\?|$)/.test(v));
  const relDynamic = dynamic.filter((v) => !rooted(v));
  ok(relDynamic.length === 0,
    `assets: ${relDynamic.length} dynamically loaded script path(s) are path-relative: ${relDynamic.join(", ")}`);

  console.log(`  same-origin asset refs: ${localSrcs.length} script + ${linkRefs.length} link, ` +
    (relScripts.length + relLinks.length + relDynamic.length === 0 ? "all root-absolute" : "PATH-RELATIVE REFS PRESENT"));
}

// ── 5. The verbatim copies ───────────────────────────────────────────────────
// person.html does not re-derive index.html's shared inline blocks, it COPIES
// them, so that a fix applied to the storage seam, the promise ledger, the
// Firebase boot, the funding lane or PDXStance cannot land on one document and
// skip the other. Byte-identity is the only version of that promise a test can
// hold: a paraphrase passes a behavioural test and still drifts.
const idxLines = index.split("\n");
const COPIES = [
  [89, 241, "the cold-open prefetch and PDXPerf"],
  [316, 1299, "PDXStore / PDXTeam / PDXTeamV2"],
  [1300, 1409, "PDXTeamView"],
  [1410, 1919, "the promise ledger and the deferred-event capture"],
  [1936, 2010, "PDXLazy"],
  [2012, 2035, "the Firebase compat bundles, the key injection, the stub and firebase-boot.js"],
  [2040, 2085, "the share furniture share-preview.ts rewrites"],
  [3567, 3630, "the crawl-header guard"],
  [17791, 18713, "the funding lane, up to the cut"],
  [20603, 20637, "the profile modal down to #modal-content"],
  [20698, 20744, "the stance popover, the record overlay and the share sheet"],
  [27828, 27948, "PDXStance"],
  [31232, 31427, "the PWA runtime and the service-worker registration"],
];
for (const [a, b, what] of COPIES) {
  const slice = idxLines.slice(a - 1, b).join("\n");
  ok(slice.split("\n").length === b - a + 1 && slice.trim().length > 0,
    `copy: index.html lines ${a}–${b} (${what}) are out of range or empty — the anchors have gone stale, and an empty slice would pass this pin for free`);
  ok(html.includes(slice),
    `copy: ${what} is NOT byte-identical to index.html lines ${a}–${b} — the two documents have drifted, and a fix to one will not reach the other`);
}

// /issue-map.js is the other copy, and the one that is a whole file: the issue
// register (ISSUE_MAP, CORE_NATIONAL_ISSUES, coreIssueForKey and the category
// helpers) lifted verbatim out of alignment-tool.js, because the formal brief
// reads several of those WITHOUT a guard and alignment-tool.js itself is a
// homepage surface this document does not ship. alignment-tool.js and index.html
// were deliberately left untouched — 100+ test files read ISSUE_MAP out of
// alignment-tool.js's own source text — so this is the pin that keeps the copy
// from becoming a fork.
{
  const at = read("alignment-tool.js").split("\n");
  const region = at.slice(109, 1413).join("\n");     // lines 110–1413
  const im = read("issue-map.js");
  ok(im.includes(region),
    "copy: issue-map.js is NOT byte-identical to alignment-tool.js lines 110–1413 — the issue register has forked");
  for (const g of ["ISSUE_MAP", "CORE_NATIONAL_ISSUES", "coreIssueForKey", "_pdxIssueCatOf", "_pdxCategoryOf", "_pdxEvidenceCategories"]) {
    ok(new RegExp(`window\\.${g}\\s*=`).test(im), `copy: issue-map.js publishes window.${g}`);
  }
  try { new vm.Script(im, { filename: "issue-map.js" }); passed++; }
  catch (e) { failures.push(`syntax: issue-map.js does not parse as a classic script — ${e.message}`); }
}

// ── 6. The DOM contract ──────────────────────────────────────────────────────
// Four ids are dereferenced by the shipped modules with NO null check, because
// on index.html they are always present. Losing one is not a missing block, it
// is a thrown TypeError partway through painting the file.
for (const id of ["modal-body", "modal-icon", "modal-name-small", "modal-office-small"]) {
  ok(html.includes(`id="${id}"`),
    `dom: #${id} is present — the shipped modules dereference it with no null check`);
}
for (const id of ["modal-overlay", "modal-panel", "modal-content", "modal-file-kicker",
                  "sag-pop-overlay", "pdx-record-overlay", "pdx-share-overlay",
                  "pdx-share-name", "pdx-share-artifact", "pdx-share-link", "pdx-share-copy"]) {
  ok(html.includes(`id="${id}"`), `dom: #${id} is present`);
}
// The dropped footer. Its five handlers all live in denylisted modules, so the
// markup would have been five controls that do nothing when tapped. Dropped
// whole rather than left as dead furniture — and nothing shipped reads them.
for (const id of ["modal-footer", "modal-addteam-btn", "modal-addteam-hint", "modal-action-strip",
                  "modal-like-btn", "modal-dislike-btn", "modal-favorite-btn", "modal-comment-btn"]) {
  ok(!bare.includes(`id="${id}"`),
    `dom: #${id} is absent — its handler lives in a denylisted module, so the control would fail on tap`);
}
// Sharing survived the footer being dropped: it moved to the header button.
ok(html.includes('id="modal-share-btn"') && html.includes("pdxSharePolitician"),
  "dom: the header share button is kept — share-anywhere.js and profiles-full.js both define pdxSharePolitician, so it works");
// The homepage card-tap layer is not here: on this document the profile IS the page.
ok(!bare.includes('id="pdx-medium-overlay"'), "dom: the medium/summary modal is absent");
// The crawl header is INJECTED by the edge function, so the id must not be in the
// source — but the inline guard that vets it has to be.
ok(!bare.includes('id="pdx-crawl-person"'),
  "dom: #pdx-crawl-person is not in the source — share-preview.ts injects it after <body>");
ok(html.includes("pdx-crawl-person") && html.includes("data-pdx-crawl-for"),
  "dom: the inline crawl-header guard is present and reads the injected node");
// One <head>, one <body>, and a </head> for the edge function to inject before.
ok((html.match(/<head>/g) || []).length === 1 && (html.match(/<\/head>/g) || []).length === 1,
  "dom: exactly one <head> and one </head>");
ok((html.match(/<body[^>]*>/g) || []).length >= 1 && (html.match(/<\/body>/g) || []).length === 1,
  "dom: exactly one </body>");
ok(/<body class="bg-navy-900 text-white font-body">/.test(html),
  "dom: the body carries index.html's own shell classes, so app.css dresses this document the same way");
ok(html.includes('class="pdx-person-bar"'), "dom: the one-row shell bar is present");
ok(!bare.includes('id="pdx-topnav"'), "dom: index.html's two-row nav is not here");

// ── 7. The CSS budget and the chrome variable ────────────────────────────────
{
  // Render-blocking = a stylesheet link with no media swap and not inside
  // <noscript> (the noscript copies are the JS-disabled fallback and cost
  // nothing when JS is on).
  const noscriptStripped = bare.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
  const sheets = [...noscriptStripped.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)].map((m) => m[0]);
  const blocking = sheets.filter((t) => !/media\s*=/.test(t));
  ok(blocking.length <= MAX_BLOCKING_CSS,
    `css: ${blocking.length} render-blocking stylesheets, budget ${MAX_BLOCKING_CSS} (index.html carries 6; this document does not need the homepage chrome)`);
  ok(blocking.length === 3, `css: exactly the three sheets that dress the shell itself block render (got ${blocking.length})`);
  for (const s of ["/css/tailwind.css", "/app.css", "/app-2.css"]) {
    ok(blocking.some((t) => t.includes(`href="${s}"`)), `css: ${s} is render-blocking`);
  }
  // issue-view.css styles nothing on this document — ifd- classes are emitted by
  // no module here — so it must not creep back in with the rest of the sheets.
  ok(!bare.includes("issue-view.css"), "css: issue-view.css is absent — nothing here emits its classes");
  // Every swapped sheet needs its <noscript> twin or the file is unstyled with
  // JS off, and every referenced sheet has to exist.
  const swapped = sheets.filter((t) => /media="print"/.test(t)).map((t) => (t.match(/href="([^"]+)"/) || [])[1]);
  for (const s of swapped) {
    ok(new RegExp(`<noscript><link rel="stylesheet" href="${s.replace(/\./g, "\\.")}"`).test(html),
      `css: ${s} has a <noscript> twin`);
    ok(existsSync(join(ROOT, s.replace(/^\//, ""))), `css: ${s} exists on disk`);
  }
  console.log(`  stylesheets: ${blocking.length} render-blocking, ${swapped.length} low-priority swaps`);

  // THE FIXED CHROME IS MEASURED ONCE. app.css computes scroll-padding-top from
  // calc(var(--pdx-chrome) …) and mobile-polish.css offsets from it; a custom
  // property that is never declared invalidates every calc() that reads it, which
  // silently turns this document's scroll padding into 0. index.html declares
  // 7.125rem for its two-row chrome — this document's bar is one row, so the
  // number is different on purpose and has to match the bar's own height.
  ok(/:root\s*\{\s*--pdx-chrome:\s*3\.25rem;\s*\}/.test(html),
    "chrome: --pdx-chrome is declared, so every calc() that reads it resolves");
  ok(/@supports \(padding-top: env\(safe-area-inset-top\)\)/.test(html),
    "chrome: the env() variant is guarded by @supports, as index.html guards its own");
  const barHeight = (html.match(/\.pdx-person-bar\s*\{[\s\S]*?height:\s*([\d.]+rem)/) || [])[1];
  ok(barHeight === "3.25rem",
    `chrome: --pdx-chrome (3.25rem) matches the bar's declared height (got ${barHeight}) — the variable is a measurement, not a guess`);
  ok(/body\s*\{\s*padding-top:\s*calc\(var\(--pdx-chrome\)/.test(html),
    "chrome: the offset is on <body>, because share-preview.ts injects the crawl header ahead of anything this document could wrap it in");
}

// ── 8. The service worker ────────────────────────────────────────────────────
// SHELL_ASSETS entries are matched line-anchored: the surrounding comments
// contain apostrophes, so a naive quote scan mis-pairs them.
{
  const start = sw.indexOf("const SHELL_ASSETS = [");
  const end = sw.indexOf("\n];", start);
  ok(start > 0 && end > start, "sw: SHELL_ASSETS is present and closed");
  const block = sw.slice(start, end);
  const shellAssets = new Set([...block.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]));

  ok(shellAssets.has("/person.html"),
    "sw: /person.html is precached — without it an offline person address falls back to a document its own rewrite no longer serves");
  ok(shellAssets.has("/"), "sw: '/' is still precached — the homepage did not move");

  // Every module this document loads, precached with one deliberate exception.
  const EXEMPT = new Set([
    "/firebase-config.js",          // generated per request by an edge function
    "/politician-stances-ext.js",   // 1.1 MB of long-tail officials, fetchpriority=low, runtime entry on purpose
  ]);
  const missing = localSrcs.filter((s) => !EXEMPT.has(s) && !shellAssets.has(s));
  ok(missing.length === 0,
    `sw: every module person.html loads is precached (missing: ${missing.join(", ")})`);
  ok(!shellAssets.has("/politician-stances-ext.js"),
    "sw: /politician-stances-ext.js stays a runtime entry — a 1.1 MB long-tail data file does not belong in a mandatory install");

  // And the CSS the document actually blocks on or swaps in.
  const sheetRefs = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/gi)].map((m) => m[1]);
  const missingCss = [...new Set(sheetRefs)].filter((s) => !shellAssets.has(s));
  ok(missingCss.length === 0, `sw: every stylesheet person.html references is precached (missing: ${missingCss.join(", ")})`);

  // Do not make '/' install the Door 2 / account graph. This split removes those
  // modules from the person lane; it must not add them to everyone's install.
  for (const f of ["/door2-spine.js", "/your-file.js", "/my-profile.js", "/profile-connect.js", "/compare-hub.js"]) {
    const wasThere = index.includes(`src="${f}"`);
    ok(!(shellAssets.has(f) && !wasThere), `sw: ${f} was not added to the precache by this split`);
  }

  // The version has to move, or a phone holding the old shell keeps the old
  // fallback while the new rewrite is already live.
  const version = (sw.match(/const CACHE_VERSION = '(v\d+)';/) || [])[1];
  ok(!!version, "sw: CACHE_VERSION is present");
  ok(version && Number(version.slice(1)) >= 184,
    `sw: CACHE_VERSION was bumped for the new shell (got ${version})`);

  // The offline fallback for a person address is /person.html, not '/'.
  ok(/isPerson\s*\)\s*\{[\s\S]{0,400}?shell\.match\('\/person\.html'\)/.test(sw),
    "sw: handleNavigate falls back to /person.html for a person address before reaching for '/'");
  const fbAt = sw.search(/shell\.match\('\/person\.html'\)/);
  const slashAt = sw.search(/const shellDoc = await shell\.match\('\/'\)/);
  ok(fbAt > 0 && slashAt > fbAt, "sw: the /person.html fallback is tried BEFORE the '/' fallback");
  // The person-document keying itself did not move.
  ok(/const PERSON_NAV_RE = \/\^\\\/p\\\/\(\[A-Za-z0-9_\]\+\)\\\/\?\$\//.test(sw),
    "sw: PERSON_NAV_RE still keys a person document to its own /p/<pid> address");
}

// ── 9. The edge anchors ──────────────────────────────────────────────────────
// share-preview.ts already routes /p/*, so after the rewrite it operates on THIS
// document. It rewrites by regex against the served HTML, which means every tag
// below has to keep index.html's exact shape — attribute order included — or a
// shared person link silently falls back to the generic site card with nothing
// in any log to say so.
{
  const edge = read("netlify/edge-functions/share-preview.ts");
  ok(/path:\s*\[[^\]]*"\/p\/\*"/s.test(edge), "edge: share-preview.ts still routes /p/*");
  ok(/<title>[^<]*<\/title>/i.test(html), "edge: <title> matches the pattern share-preview.ts replaces");
  for (const [sel, key] of [["property", "og:title"], ["property", "og:description"], ["property", "og:url"],
                            ["property", "og:image"], ["property", "og:image:alt"],
                            ["name", "twitter:title"], ["name", "twitter:description"], ["name", "twitter:image"],
                            ["name", "description"]]) {
    ok(new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i").test(html),
      `edge: <meta ${sel}="${key}"> matches share-preview.ts's setMeta pattern exactly`);
  }
  ok(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i.test(html),
    "edge: <link rel=\"canonical\"> matches share-preview.ts's setCanonical pattern");
  ok(/<\/head>/i.test(html), "edge: </head> exists for the __PDX_SHARE_TARGET__ boot injection");
  ok(/<body[^>]*>/i.test(html), "edge: <body …> exists for the crawl-header injection");
}

// ── 10. The document stays small ─────────────────────────────────────────────
{
  const gz = gzipSync(Buffer.from(html, "utf8")).length;
  ok(gz <= MAX_DOC_GZ, `size: person.html is ${(gz / 1024).toFixed(1)} KB gzipped, budget ${MAX_DOC_GZ / 1024} KB`);
  ok(srcs.length <= MAX_SCRIPT_TAGS,
    `size: ${srcs.length} <script src> tags, budget ${MAX_SCRIPT_TAGS} (index.html carries ~114 — that is the number this split exists to cut)`);
  const idxGz = gzipSync(Buffer.from(index, "utf8")).length;
  const idxTags = (index.match(/<script\b[^>]*src=/gi) || []).length;
  ok(gz < idxGz && srcs.length < idxTags,
    "size: person.html is smaller than index.html by both measures");
  console.log(`  person.html: ${(html.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ${srcs.length} script tags` +
    `  (index.html: ${(index.length / 1024).toFixed(0)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} tags)`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — person.html: /p/* is its own document, the homepage stack stays off it`);
