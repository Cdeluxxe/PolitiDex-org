#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for issue.html — THE THIRD SHELL
// ─────────────────────────────────────────────────────────────────────────────
// The first split gave /p/<pid> its own document. The very next tap gave it
// straight back. Every "Issue file" control on a person record is an
// <a href="/i/<key>"> — the gap sheet's title (consistency.js), the stance
// tree's leaf row (stance-tree.js), the Word-vs-Action shape row
// (word-action.js), the mandate chip's fallback (stance-helpers.js) — and
// netlify.toml rewrote /i/* to index.html. So a reader on /p/lee who tapped
// Issue File left a 229 KB document and landed on the 2.3 MB homepage OS to read
// one issue's formal record: the homepage grids, Compare Hub, the account graph,
// Door 2, Your File, the Archive, the Locker and the 1.2 MB spotlight fuel, none
// of it on the page they asked for, all of it on the main thread.
//
// The second split gives that address its own document too: netlify.toml rewrites
// /i/* to /issue.html, and issue.html carries the ledger lane and nothing else.
//
// A THIRD hand-edited shell with no build step has every failure mode the second
// one has, plus two that are new and worse:
//
//   1. IT SILENTLY REGROWS. Nothing stops the next feature from pasting a
//      homepage module back in, and the split undoes itself one <script> at a
//      time. The denylist below is the gate.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /i/<key> is two segments deep
//      and its rewrite returns 200 for anything beneath it, so src="issue-map
//      .js" resolves to /i/issue-map.js, matches the rewrite, and the browser is
//      handed this document and told to parse it as JavaScript. No 404, no
//      error, just a module that never defines anything.
//   3. NOW THREE DOCUMENTS CAN DRIFT, not two. The inline blocks here are
//      verbatim copies of person.html, which are themselves verbatim copies of
//      index.html. A fix applied to one and not the others is a bug that
//      reproduces on exactly one URL shape. The pins below hold this document to
//      PERSON.HTML rather than to index.html, so the three copies form a chain
//      and not a fan: a change to index.html fails test-person-shell first, and
//      a change to person.html fails this one.
//   4. THE BUILDER IS SHIPPED WITHOUT ITS DESK. door1-workspace.js is here for
//      one export — PDXDoor1.issueProfile — and its Door 1 desk is deliberately
//      not mounted. That is only safe while sync() keeps returning false on a
//      missing mount; if it ever starts painting, this document grows a second
//      issue UI nobody asked for.
//   5. THE SERVICE WORKER KEEPS SERVING THE OLD SHELL. If /issue.html is not
//      precached, an offline issue address falls back to a document its own
//      rewrite no longer sends it to.
//
// This harness gates:
//
//   1. THE REWRITE. /i/<key> resolves to /issue.html at 200, /p/* still resolves
//      to /person.html, '/' is still the published homepage, and nothing else
//      moved — including /issue/*, which stays on index.html on purpose.
//   2. THE DENYLIST, including the four modules person.html keeps and this
//      document drops.
//   3. WHAT MUST BE PRESENT — the ledger chain, in index.html's relative order,
//      each resolving to a file that parses.
//   4. EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE.
//   5. THE VERBATIM COPIES are byte-identical to their source lines in
//      person.html.
//   6. THE CHROME CONTRACT — one row, no search, no observer, --pdx-chrome
//      declared and equal to the bar's own height.
//   7. NO CONTAINER MARKUP IS OWED. Every surface this document paints builds
//      its own DOM, so there is nothing here that can go stale against a module.
//   8. THE SERVICE WORKER precaches /issue.html and falls back to it for /i/.
//   9. THE EDGE ANCHORS share-preview.ts would rewrite are present in its exact
//      tag shape — and /i/* is deliberately NOT on its route list.
//  10. THE DOCUMENT STAYS SMALL, against a hard ceiling and against index.html.
//  11. THE IN-APP DOORS land on this document rather than being swallowed.
//
//   node scripts/test-issue-shell.mjs
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

const html = read("issue.html");
// issue.html is heavily commented, and those comments quote the exact markup and
// the exact code this harness checks for: the header comment names every
// denylisted module, the root-absolute rule quotes `src="issue-map.js"` as the
// bug it forbids, and the stylesheet comment names the four sheets that were
// demoted. A comment cannot satisfy a contract, so every PRESENCE-or-ABSENCE
// check below runs against `bare`: the document with its HTML comments removed.
// (Verified safe: no inline block in issue.html contains an HTML comment marker,
// so stripping them cannot cut into executable code.)
const bare = html.replace(/<!--[\s\S]*?-->/g, "");
const index = read("index.html");
const person = read("person.html");
const sw = read("sw.js");
const toml = read("netlify.toml");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// Budgets. Tripwires, not targets — raise them deliberately, with a reason. The
// whole point of this document is that it is small; a number going red here is
// the split being undone, not a metric needing adjustment. The request asked for
// an upper bound that fails if this is "still ~2 MB", so RAW is bounded too and
// not just the gzipped figure: a 2 MB document that compresses well would slip
// past a gzip-only ceiling while still costing the phone every byte of parse.
const MAX_DOC_RAW = 160 * 1024;   // the whole document, on the wire before gzip
const MAX_DOC_GZ = 45 * 1024;     // the whole document, gzipped
const MAX_SCRIPT_TAGS = 50;       // <script src> count, external SDKs included
const MAX_BLOCKING_CSS = 5;       // render-blocking <link rel=stylesheet>

// Paired match, so a `<script>` written inside a JS comment or a string literal
// (the copied blocks contain several) is body text and not a tag.
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const srcs = TAGS
  .map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter(Boolean);
const localSrcs = srcs.filter((s) => !/^(https?:)?\/\//.test(s));

// Real register keys, read out of issue-map.js rather than written down here, so
// the routing tests below exercise addresses the app can actually resolve.
const KNOWN_KEYS = (() => {
  const sandbox = { window: {} };
  try {
    new vm.Script(read("issue-map.js"), { filename: "issue-map.js" })
      .runInNewContext(sandbox);
  } catch (e) { return []; }
  const m = sandbox.window.ISSUE_MAP;
  return m ? Object.keys(m) : [];
})();
ok(KNOWN_KEYS.length > 50,
  `register: issue-map.js publishes a populated ISSUE_MAP (got ${KNOWN_KEYS.length} keys) — every test below needs a real key`);
const KEY = KNOWN_KEYS.includes("lands_preserve") ? "lands_preserve" : KNOWN_KEYS[0];

// ── 1. The rewrite: /i/* serves issue.html, and nothing else moved ───────────
// Netlify matches [[redirects]] top to bottom and takes the first hit, so the
// question a test can actually answer is "which rule wins for this path", not
// "does a rule exist". `*` is a trailing wildcard.
const RULES = [...toml.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const body = m[1];
  const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const resolveAddr = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) {
      const prefix = r.from.slice(0, -1);            // "/i/*" → "/i/"
      if (path.startsWith(prefix)) return r;
    } else if (r.from === path) return r;
  }
  return null;
};

ok(RULES.length > 0, "rewrite: netlify.toml declares at least one [[redirects]] rule");
for (const addr of [`/i/${KEY}`, `/i/${KEY}/`, "/i/term_limits", "/i/anything_at_all"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/issue.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /issue.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
ok(existsSync(join(ROOT, "issue.html")), "rewrite: /issue.html exists to be served");

// THE FIRST SPLIT IS NOT DISTURBED. /p/* still gets its own document; if this
// pass had reordered the rules or widened a glob, this is where it shows.
for (const addr of ["/p/lee", "/p/mike_lee", "/p/null"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/person.html" && String(hit.status) === "200",
    `rewrite: ${addr} still serves /person.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}

// AND /issue/* IS SOMEBODY ELSE. It reads the same as this address out loud and
// it is a different product: /issue/<slug> is a Spotlight, one long curated
// writeup out of the 1.2 MB spotlights-data.js, and /i/<key> is the Issue File,
// a dossier ledger over a vocabulary key. The third split gave the Spotlight its
// own document too, so both now route away from index.html — to DIFFERENT
// documents, and the pin is that neither one answers the other.
for (const addr of ["/issue/guns", `/issue/${KEY}`, "/issue/box-elder-stratos-data-center"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/spotlight.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /spotlight.html, not this document — a Spotlight is not an Issue File (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
// The rest are addresses no Issue File door on a person record uses, so neither
// this pass nor the one after it had any business touching them.
for (const addr of ["/vote/hr1", "/d/ut-statehouse-68", "/b/hr1", "/locker", "/locker/x"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/index.html",
    `rewrite: ${addr} still resolves to /index.html (got ${hit ? hit.to : "no matching rule"})`);
}
// '/' has no rewrite of its own — it is the published document.
ok(resolveAddr("/") === null, "rewrite: / is not caught by any rewrite rule");
// /issue/* must win its own paths ahead of any rule that could swallow them, and
// /i/* must not be written in a shape that also catches /issue/.
{
  const iRule = RULES.find((r) => r.from === "/i/*");
  ok(iRule && iRule.to === "/issue.html",
    "rewrite: the /i/* rule itself points at /issue.html");
  ok(!resolveAddr("/issue/x") || resolveAddr("/issue/x").from !== "/i/*",
    "rewrite: the /i/* rule does not also catch /issue/* — they are different addresses with different documents");
}

// ── 2. The denylist — what this document exists in order NOT to load ─────────
// Each of these is a homepage surface, an account/Door surface, or a
// click-through into one. The request named the first group explicitly; the rest
// are the same rule applied to the same codebase.
const DENY = [
  "compare-hub.js", "compare-table.js", "alignment-tool.js", "like-dislike.js",
  "my-stances.js", "my-profile.js", "profile-connect.js", "account-graph.js",
  "ballot-workspace.js", "door2-spine.js", "your-file.js", "your-ballot.js",
  "archive-browse.js", "evidence-locker.js", "all-seeing-eye.js",
  "voter-hub-location.js", "voter-hub.js", "journey.js", "support-route.js",
  "support-lane.js", "self-defection.js",
  "hero-showcase.js", "hero-showcase-data.js", "hero-receipt.js",
  "spotlight-hub.js", "spotlights-data.js", "spotlight-cards-data.js",
  "relevant-grid.js", "who-represents-me.js", "receipt-cards.js",
  "first-run.js", "pdx-learn.js", "stance-library.js", "digital-library.js",
  "hr1-showcase.js", "claim-check.js", "live-proof.js", "issue-compare.js",
  "district-room.js", "district-file.js", "district-voice.js", "district-ballot.js",
  "judicial-ballot.js", "judicial-data.js", "judicial-retention.js", "judge-file.js",
  "seat-field.js", "ballot-breakdown.js", "ballot-actions.js", "race-sheet.js",
  "impact-tracker.js", "impact-ledger.js", "scope-chrome.js",
  // Homepage/person surfaces this document drops that person.html keeps, so the
  // list is not just index.html's — see MUST_NOT_LOAD_BUT_ON_PERSON below for
  // the four that carry a reason of their own.
  "issue-page.js", "bill-detail.js", "bills.js", "gov-contracts.js",
  "person-file.js", "person-outline.js", "profile-dossier.js", "record-card.js",
  "coverage.js", "gaps.js", "inventory.js", "stance-tree.js", "ballot-axes.js",
  "exec-record-ui.js", "controversies.js", "finance-lane.js",
];
for (const f of DENY) {
  ok(!localSrcs.some((s) => s === "/" + f),
    `denylist: issue.html must not load /${f} — it belongs to the homepage, the account graph or the person record`);
}
// The four the request named as must-nots, checked against the raw text as well,
// so a preload hint or a dynamic injection cannot smuggle one in past the tag
// scan. alignment-tool.js is the sharpest of them: its issue register is the one
// thing this document genuinely needs, and /issue-map.js exists precisely so the
// 1.3 MB tool does not have to come with it.
for (const f of ["compare-hub.js", "alignment-tool.js", "like-dislike.js", "journey.js",
                 "support-route.js", "self-defection.js", "my-profile.js",
                 "ballot-workspace.js", "spotlights-data.js"]) {
  const refs = [...bare.matchAll(new RegExp(`["'(=]\\s*/?${f.replace(/\./g, "\\.")}`, "g"))];
  ok(refs.length === 0,
    `denylist: /${f} is not referenced anywhere in issue.html, not even as a preload or a dynamic src`);
}
// THE TWO BIG DROPS, named on their own because they are the difference between
// this document and person.html and because each removes a whole dependency
// lane. profiles-full.js is 580 KB of person records: a ledger row NAMES a
// person, it does not paint one, and without it a person name in a row is a real
// cross-document navigation to /p/<pid> — which is the behaviour person-link.js
// documents as the correct fail-open. word-action.js is 414 KB and nothing the
// dossier reads calls into it.
for (const [f, why] of [["profiles-full.js", "580 KB of person records; a ledger row names a person, person-link.js navigates to it"],
                        ["word-action.js", "414 KB; no surface on this document reads it"],
                        ["profile-card.js", "the gap sheet's share-card pipeline, which PDXShareAnywhere degrades to a link without"],
                        ["issue-page.js", "59 KB second issue UI; this document has one dossier and does not invent another"]]) {
  ok(!localSrcs.includes("/" + f), `denylist: /${f} is dropped — ${why}`);
  ok(person.includes(`src="/${f}"`) || f === "issue-page.js",
    `denylist: /${f} is on person.html, so its absence here is a deliberate drop and not a typo`);
}

// ── 3. What must be present, and in index.html's relative order ──────────────
// These modules register with each other and extend shared objects as they
// execute, so the ORDER is behaviour and not tidiness.
const MUST_LOAD = [
  // The perf ledger, the lazy loader, the notice owner and the roster index.
  "/pdx-perf.js", "/pdx-lazy-data.js", "/share-links.js", "/cmp-data.js",
  // Firebase, anonymous only — the roster is what turns a pid in a ledger row
  // into a person's name.
  "/firebase-config.js", "/firebase-boot.js",
  // The scroll-lock seam, the /p/ link builder, the normalisation pass.
  "/pdx-stability.js", "/person-link.js", "/data-hygiene.js",
  // The stance data the ranking reads.
  "/politician-stances-core.js", "/politician-stances-ext.js", "/state-senate-stances.js",
  // The vocabulary, the register, the family table, the colours, the scope.
  "/stance-helpers.js", "/issue-map.js", "/pdx-issue-family.js", "/issue-colors.js",
  "/issue-scope.js",
  // The formal record and the publication bar.
  "/formal-index.js", "/publication-floor.js", "/voting-record.js",
  // _resolveStanceList, PDXReceipts, _getPhotoUrl.
  "/say-vs-do.js",
  // formalPatternIndex (door1-workspace.js requires it) and openGap.
  "/consistency.js",
  // buildRanking — without it issueLedger() returns null.
  "/issue-view.js",
  // The one builder of the dossier body, and the panel it mounts in.
  "/door1-workspace.js", "/issue-file.js",
  // The address: reads /i/<key> off the path and opens the file. Last.
  "/pdx-issue-profile.js",
  // The share affordance, and the alias table behind the mike_lee → lee hop.
  "/share-anywhere.js", "/profile-evidence.js",
];
for (const m of MUST_LOAD) ok(localSrcs.includes(m), `modules: issue.html loads ${m}`);
for (let w = 2; w <= 16; w++) {
  ok(localSrcs.includes(`/state-senate-stances-w${w}.js`),
    `modules: issue.html loads /state-senate-stances-w${w}.js (the waves are additive over one object — a partial set is a legislator with no positions)`);
}
// The three Firebase compat bundles, anonymous auth only.
for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) {
  ok(srcs.some((s) => s.includes(f)), `modules: issue.html loads the Firebase ${f} bundle`);
}
// pdx-issue-profile.js is the cold open and every module it asks for has to have
// executed first, so it is LAST among the deferred chain.
{
  const deferred = localSrcs.filter((s) => s !== "/profile-evidence.js");
  ok(deferred[deferred.length - 1] === "/pdx-issue-profile.js",
    `order: /pdx-issue-profile.js is the last module in the chain (got ${deferred[deferred.length - 1]})`);
}
{
  // issue-map.js occupies alignment-tool.js's slot, so compare the two orders
  // with that one substitution applied.
  const idxOrder = [...index.matchAll(/<script\b[^>]*src="(\/[^"]+)"/gi)]
    .map((m) => (m[1] === "/alignment-tool.js" ? "/issue-map.js" : m[1]));
  const expected = idxOrder.filter((p) => localSrcs.includes(p));
  const actual = localSrcs.filter((p) => expected.includes(p));
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    `order: issue.html loads the shared modules in index.html's relative order\n      expected: ${expected.join(" ")}\n      actual:   ${actual.join(" ")}`);
}

// Every local reference resolves to a file that exists and parses.
// /firebase-config.js is generated per request by an edge function so the API key
// is never committed — it is "resolved" by a route declaring the path.
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
// Every inline block has to parse too. All but one are verbatim copies, and the
// one that is not — the back-link receiver — is the kind of small hand-written
// block that can carry an unbalanced brace with no error until a browser loads it.
let inlineBlocks = 0;
for (const t of TAGS) {
  if (/\bsrc\s*=/.test(t.attrs) || /type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs)) continue;
  inlineBlocks++;
  try { new vm.Script(t.body, { filename: `issue.html inline #${inlineBlocks}` }); passed++; }
  catch (e) { failures.push(`syntax: issue.html inline block #${inlineBlocks} does not parse — ${e.message}`); }
}
ok(inlineBlocks >= 5, `inline: issue.html carries its copied inline blocks (found ${inlineBlocks})`);
for (const t of TAGS) {
  const hasSrc = /\bsrc\s*=/.test(t.attrs);
  const isData = /type\s*=\s*["'](?!text\/javascript)/i.test(t.attrs);
  ok(hasSrc || isData || t.body.trim().length > 0, "inline: no empty <script> tags left behind");
}

// ── 4. Every same-origin asset reference is root-absolute ────────────────────
// THE HTML-AS-JS BUG. /i/<key> is served by a rewrite that returns HTTP 200 for
// anything under /i/, so a path-relative src="issue-map.js" on this document
// resolves to /i/issue-map.js, matches that rewrite, and the browser is handed
// issue.html and told to parse it as JavaScript. There is no 404 to notice: the
// request succeeds and the module silently never defines anything.
const rooted = (v) => /^(\/|https?:|\/\/|data:|#|mailto:)/.test(v);
{
  const relScripts = localSrcs.filter((v) => !rooted(v));
  ok(relScripts.length === 0,
    `assets: ${relScripts.length} <script src> are path-relative and will parse issue.html as JavaScript under the /i/* rewrite — write them as "/file.js": ${relScripts.join(", ")}`);

  const linkRefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => (m[0].match(/\bhref\s*=\s*["']([^"']+)["']/) || [])[1])
    .filter(Boolean);
  const relLinks = linkRefs.filter((v) => !rooted(v));
  ok(relLinks.length === 0,
    `assets: ${relLinks.length} <link href> are path-relative and break under the /i/* rewrite the same way: ${relLinks.join(", ")}`);

  const anchorRefs = [...bare.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const relAnchors = anchorRefs.filter((v) => !rooted(v));
  ok(relAnchors.length === 0,
    `assets: ${relAnchors.length} <a href> in the chrome are path-relative — under /i/<key> they would point back inside /i/: ${relAnchors.join(", ")}`);

  const dynamic = [
    ...html.matchAll(/\.src\s*=\s*["']([^"'`]+)["']/g),
    ...html.matchAll(/loadScript\(\s*["']([^"'`]+)["']/g),
  ].map((m) => m[1]).filter((v) => /\.(js|mjs|css)(\?|$)/.test(v));
  const relDynamic = dynamic.filter((v) => !rooted(v));
  ok(relDynamic.length === 0,
    `assets: ${relDynamic.length} dynamically loaded script path(s) are path-relative: ${relDynamic.join(", ")}`);

  console.log(`  same-origin asset refs: ${localSrcs.length} script + ${linkRefs.length} link + ${anchorRefs.length} anchor, ` +
    (relScripts.length + relLinks.length + relAnchors.length + relDynamic.length === 0 ? "all root-absolute" : "PATH-RELATIVE REFS PRESENT"));
}

// ── 5. The verbatim copies, pinned to PERSON.HTML ────────────────────────────
// issue.html does not re-derive the shared inline blocks and it does not fork
// them a third time out of index.html: it copies them from person.html, which
// test-person-shell.mjs already pins to index.html. That makes the three copies
// a CHAIN — index.html → person.html → issue.html — so a fix to the promise
// ledger, the Firebase boot, the split seam, the share furniture or the PWA
// runtime fails exactly one test per document it did not reach, instead of three
// forks drifting quietly in parallel.
//
// Byte-identity is the only version of that promise a test can hold: a
// paraphrase passes a behavioural test and still drifts.
const personLines = person.split("\n");
const COPIES = [
  [1373, 1882, "the promise ledger and the deferred-event capture (firebase-boot.js reads _firestoreLoaded and _checkAndTrigger as bare identifiers)"],
  [1974, 1997, "the Firebase compat bundles, the key injection, the synchronous stub and firebase-boot.js"],
  [2000, 2034, "the split-seam stubs (_pdxMandateForIssue is called unguarded from inside stance-helpers.js)"],
  [2052, 2096, "the share furniture share-preview.ts rewrites"],
  [2159, 2162, "the Bebas Neue / Barlow preload swap"],
  [3644, 3840, "the PWA runtime and the service-worker registration"],
];
for (const [a, b, what] of COPIES) {
  const slice = personLines.slice(a - 1, b).join("\n");
  ok(html.includes(slice),
    `copy: ${what} is NOT byte-identical to person.html lines ${a}–${b} — the documents have drifted, and a fix to one will not reach the other`);
}
// The chain only holds if the middle link is still there. If person.html stops
// matching index.html, test-person-shell.mjs fails — but a reader of THIS file
// deserves to be told which pin to look at, so the source of each block is named
// as a fact rather than implied.
ok(person.includes("COPIED VERBATIM FROM index.html LINES"),
  "copy: person.html still declares its own copies from index.html, so this document's pins sit on a chain and not on a fork");
for (const [a, b] of COPIES) {
  ok(html.includes(`FROM person.html LINES ${a}\u2013${b}`) || html.includes(`FROM person.html LINES ${a}-${b}`),
    `copy: issue.html names person.html lines ${a}\u2013${b} as the source of a block, so the pin is discoverable from the document`);
}

// /issue-map.js is the other copy, and it is a whole FILE: the issue register
// lifted verbatim out of alignment-tool.js, created by the first split. Nothing
// is re-cut here — the same file is loaded — but the pin is repeated because on
// THIS document the register is not a dependency, it is the subject.
{
  const at = read("alignment-tool.js").split("\n");
  const region = at.slice(109, 1413).join("\n");     // lines 110–1413
  const im = read("issue-map.js");
  ok(im.includes(region),
    "copy: issue-map.js is NOT byte-identical to alignment-tool.js lines 110–1413 — the issue register has forked");
  for (const g of ["ISSUE_MAP", "CORE_NATIONAL_ISSUES", "coreIssueForKey"]) {
    ok(new RegExp(`window\\.${g}\\s*=`).test(im), `copy: issue-map.js publishes window.${g}`);
  }
}

// ── 6. The chrome contract ───────────────────────────────────────────────────
{
  ok(/<header class="pdx-issue-bar">/.test(bare), "chrome: the one-row shell bar is present");
  ok(!bare.includes('id="pdx-topnav"'), "chrome: index.html's two-row nav is not here");
  ok(!bare.includes('class="pdx-person-bar"'), "chrome: this is not person.html's bar either — the two documents have different chrome");
  // The request: wordmark, a link to /, and a way back to the person file when a
  // pid is in the query or the hash.
  ok(/<a href="\/" class="pdx-issue-wordmark"/.test(bare),
    "chrome: the wordmark links to / — a reader who followed a citation can tell whose site this is and get to the front page");
  ok(/id="pdx-issue-back"[^>]*\bhidden\b/.test(bare),
    "chrome: the person-file link starts hidden — no pid in the address means no link, never a guess");
  // NO SEARCH FIELD AND NO LAYOUT OBSERVER. Both were named as must-nots, and
  // both are the kind of thing that arrives by copy-paste from index.html's nav.
  ok(!/<input[^>]*type="search"/i.test(bare) && !/id="pdx-search/.test(bare) && !/role="searchbox"/.test(bare),
    "chrome: no search field — the Eye is a homepage surface and this bar is static");
  ok(!/ResizeObserver|IntersectionObserver|MutationObserver/.test(bare),
    "chrome: no layout observer anywhere in this document — the bar is a fixed height, declared once");
  ok(!/getBoundingClientRect|offsetHeight/.test(bare),
    "chrome: nothing measures the viewport or the bar at runtime");

  // THE ADDRESS IS BUILT BY THE FILE THAT OWNS IT. The back-link must go through
  // PDXPersonLink.href — it runs the retired-id alias hop and the pid shape wall
  // and returns '' for anything it will not advertise — rather than pasting
  // '/p/' together here, which is how a shell ends up linking to an address the
  // app does not serve.
  ok(/PDXPersonLink/.test(bare) && /PL\.href\(raw\)/.test(bare),
    "chrome: the back-link href comes from PDXPersonLink.href, the one builder for /p/<pid>");
  ok(!/['"]\/p\/['"]\s*\+/.test(bare),
    "chrome: no '/p/' is pasted together by hand in this document");
  ok(/person-link\.js/.test(bare), "chrome: person-link.js is loaded before the block that calls it");
  {
    const plAt = html.indexOf('src="/person-link.js"');
    const backAt = html.indexOf("pdx-issue-back");
    const scriptAt = html.indexOf("PL.href(raw)");
    ok(plAt > 0 && backAt > 0 && scriptAt > plAt,
      "chrome: the back-link script runs AFTER person-link.js, which is parser-blocking for exactly that reason");
  }
  // The four address shapes it accepts, asserted as the regexes rather than as
  // behaviour, because a widened pattern here is a widened trust boundary.
  ok(/\[\?&\]\(\?:pid\|p\)=/.test(bare),
    "chrome: the back-link reads ?pid= and ?p= and nothing else from the query");
  ok(/\^#\\\/\?p\\\//.test(bare),
    "chrome: it reads #p/<pid> and #/p/<pid> and nothing else from the hash");

  // THE FIXED CHROME IS MEASURED ONCE. app.css computes scroll-padding-top from
  // calc(var(--pdx-chrome) …) and mobile-polish.css offsets from it; a custom
  // property that is never declared invalidates every calc() that reads it,
  // which silently turns this document's scroll padding into 0 and lands a
  // jumped-to heading behind the bar. index.html declares 7.125rem for its
  // two-row chrome; this bar is one row.
  ok(/:root\s*\{\s*--pdx-chrome:\s*3\.25rem;\s*\}/.test(html),
    "chrome: --pdx-chrome is declared, so every calc() that reads it resolves");
  ok(/@supports \(padding-top: env\(safe-area-inset-top\)\)/.test(html),
    "chrome: the env() variant is guarded by @supports, as both other documents guard their own");
  const barHeight = (html.match(/\.pdx-issue-bar\s*\{[\s\S]*?height:\s*([\d.]+rem)/) || [])[1];
  ok(barHeight === "3.25rem",
    `chrome: --pdx-chrome (3.25rem) matches the bar's declared height (got ${barHeight}) — the variable is a measurement, not a guess`);
  ok(/body\s*\{\s*padding-top:\s*calc\(var\(--pdx-chrome\)/.test(html),
    "chrome: the document's own flow starts below the fixed bar");

  // NO INVENTED STRUCTURED DATA AND NO INVENTED SCORE. index.html's
  // WebSite/Organization JSON-LD describes the front page, and an issue file is
  // not the front page.
  ok(!/application\/ld\+json/i.test(html),
    "chrome: no JSON-LD — issue-level structured data belongs to the record, and this split does not invent it");
  // NO BLENDED PERCENTAGE IN THE DOCUMENT'S OWN MARKUP. Nothing this shell
  // authors may print a rate; what the modules compute from the formal record is
  // their business and is tested where they live.
  ok(!/>[^<]{0,40}\d+\s*%[^<]{0,40}</.test(bare),
    "chrome: this document's own markup prints no percentage");
}

// ── 7. The CSS budget ────────────────────────────────────────────────────────
{
  const noscriptStripped = bare.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
  const sheets = [...noscriptStripped.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)].map((m) => m[0]);
  const blocking = sheets.filter((t) => !/media\s*=/.test(t));
  ok(blocking.length <= MAX_BLOCKING_CSS,
    `css: ${blocking.length} render-blocking stylesheets, budget ${MAX_BLOCKING_CSS} (index.html carries 6)`);
  // Three dress the shell; two are this document's CONTENT, because on an /i/
  // arrival the issue file mounts immediately and the ledger is inside it.
  for (const s of ["/css/tailwind.css", "/app.css", "/app-2.css", "/issue-file.css", "/door1-workspace.css"]) {
    ok(blocking.some((t) => t.includes(`href="${s}"`)), `css: ${s} is render-blocking`);
  }
  // The four sheets person.html carries that this document does not, because
  // consistency.js self-injects everything they would have supplied or the
  // module that names them is not here.
  for (const [s, why] of [["alignment-tool.css", "align- classes come from profiles-full.js, which is not here"],
                          ["stance-library.css", "sl- classes come from stance-library.js, which is not here"],
                          ["pdx-learn.css", "pdxl-link only renders when window.PDXLearn exists"],
                          ["word-action.css", "word-action.js is not here"]]) {
    ok(!bare.includes(s), `css: ${s} is absent — ${why}`);
  }
  // Every swapped sheet needs its <noscript> twin or the file is unstyled with
  // JS off, and every referenced sheet has to exist.
  const swapped = sheets.filter((t) => /media="print"/.test(t)).map((t) => (t.match(/href="([^"]+)"/) || [])[1]);
  for (const s of swapped) {
    ok(new RegExp(`<noscript><link rel="stylesheet" href="${s.replace(/\./g, "\\.")}"`).test(html),
      `css: ${s} has a <noscript> twin`);
  }
  for (const t of sheets) {
    const href = (t.match(/href="([^"]+)"/) || [])[1];
    if (href && href.startsWith("/")) ok(existsSync(join(ROOT, href.slice(1))), `css: ${href} exists on disk`);
  }
  console.log(`  stylesheets: ${blocking.length} render-blocking, ${swapped.length} low-priority swaps`);
}

// ── 8. No container markup is owed ───────────────────────────────────────────
// Every surface this document paints builds its own DOM: issue-file.js appends
// its overlay to <body>, consistency.js's openGap builds the gap sheet and
// injects its own ~126 KB of styles, issue-view.js writes its panel into an
// overlay it created, say-vs-do.js's receipt lightbox is self-built, and
// share-links.js's notice is a fixed-position node it appends on demand. So this
// document owes them nothing — which is also why nothing here can go stale
// against a module. Asserted as absence, because a copied-in container is
// exactly the kind of dead furniture a third shell accumulates.
for (const id of ["modal-overlay", "modal-panel", "modal-content", "modal-body", "modal-footer",
                  "pdx-share-overlay", "pdx-record-overlay", "sag-pop-overlay",
                  "pdx-medium-overlay", "ftm-grid", "ftm-count",
                  "pdx-door1-desk", "pdx-door1-body", "pdx-crawl-person"]) {
  ok(!bare.includes(`id="${id}"`),
    `dom: #${id} is absent — nothing on this document owns it, and a container with no module is dead furniture`);
}
// DOOR 1'S DESK IS UNMOUNTED ON PURPOSE. door1-workspace.js ships for one export
// (PDXDoor1.issueProfile); sync() looks for its mount and its body host, finds
// neither and returns false, so nothing paints and no second issue UI exists.
// If either id ever appears here, this document has grown a Door.
{
  const dw = read("door1-workspace.js");
  const authority = (dw.match(/var AUTHORITY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const bodyId = (dw.match(/var BODY_ID\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  if (authority) ok(!bare.includes(`id="${authority}"`), `dom: Door 1's #${authority} mount is absent — the desk stays unmounted`);
  if (bodyId) ok(!bare.includes(`id="${bodyId}"`), `dom: Door 1's #${bodyId} body host is absent — the desk stays unmounted`);
  ok(/function sync\(\)/.test(dw) && /return false/.test(dw),
    "dom: door1-workspace.js's sync() still has a false return, which is what keeps the unmounted desk silent");
}
// One <head>, one <body>, and the shell classes app.css dresses.
ok((html.match(/<head>/g) || []).length === 1 && (html.match(/<\/head>/g) || []).length === 1,
  "dom: exactly one <head> and one </head>");
// Counted on `bare`: the head comments quote "<body>" when explaining that
// issue-file.js appends its own overlay there, and a comment is not a tag.
ok((bare.match(/<body[^>]*>/g) || []).length === 1 && (bare.match(/<\/body>/g) || []).length === 1,
  `dom: exactly one <body> and one </body> (got ${(bare.match(/<body[^>]*>/g) || []).length} open, ${(bare.match(/<\/body>/g) || []).length} close)`);
ok(/<body class="bg-navy-900 text-white font-body">/.test(html),
  "dom: the body carries index.html's own shell classes, so app.css dresses this document the same way");

// ── 9. The service worker ────────────────────────────────────────────────────
{
  const start = sw.indexOf("const SHELL_ASSETS = [");
  const end = sw.indexOf("\n];", start);
  ok(start > 0 && end > start, "sw: SHELL_ASSETS is present and closed");
  const block = sw.slice(start, end);
  const shellAssets = new Set([...block.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]));

  ok(shellAssets.has("/issue.html"),
    "sw: /issue.html is precached — without it an offline issue address falls back to a document its own rewrite no longer serves");
  ok(shellAssets.has("/person.html"), "sw: /person.html is still precached — the first split did not regress");
  ok(shellAssets.has("/"), "sw: '/' is still precached — the homepage did not move");

  // Every module this document loads, precached, with the same two exceptions
  // the person lane declared and for the same reasons.
  const EXEMPT = new Set([
    "/firebase-config.js",          // written per request by an edge function; a precached copy is a stale one
    "/politician-stances-ext.js",   // 1.1 MB of long-tail officials, fetchpriority=low, runtime entry on purpose
  ]);
  const missing = localSrcs.filter((s) => !EXEMPT.has(s) && !shellAssets.has(s));
  ok(missing.length === 0,
    `sw: every module issue.html loads is precached (missing: ${missing.join(", ")})`);
  ok(!shellAssets.has("/politician-stances-ext.js"),
    "sw: /politician-stances-ext.js stays a runtime entry — a 1.1 MB long-tail data file does not belong in a mandatory install");
  ok(!shellAssets.has("/firebase-config.js"),
    "sw: /firebase-config.js is never precached — it is generated per request");

  const sheetRefs = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/gi)].map((m) => m[1]);
  const missingCss = [...new Set(sheetRefs)].filter((s) => !shellAssets.has(s));
  ok(missingCss.length === 0, `sw: every stylesheet issue.html references is precached (missing: ${missingCss.join(", ")})`);

  // NO DENYLISTED MODULE JOINED THE INSTALL BECAUSE OF THIS SPLIT — which is a
  // different claim from "no denylisted module is on SHELL_ASSETS", and the
  // weaker-sounding one is the correct one. SHELL_ASSETS is '/' 's precache as
  // well as this document's: alignment-tool.js, ballot-workspace.js, journey.js
  // and support-route.js are all legitimately there because index.html loads
  // them and the homepage is a precached shell too. "Denylisted" means "not on
  // THIS document", not "deleted from the app". So the test that has teeth is:
  // anything on the install that this document refuses must be a module the
  // HOMEPAGE actually loads. A module on neither index.html nor issue.html has
  // no business in anyone's mandatory install, and that is the regression this
  // catches — a future pass adding an issue-lane module to the precache and
  // reaching for a denylisted one by mistake.
  for (const f of DENY) {
    if (!shellAssets.has("/" + f)) { passed++; continue; }
    ok(index.includes(`src="/${f}"`),
      `sw: /${f} is on SHELL_ASSETS but index.html does not load it either — nothing should be in the mandatory install for a document that refuses it`);
  }
  // And the ones that are not on index.html must not appear at all. These are
  // the modules with no shell left to justify them.
  for (const f of ["/spotlights-data.js", "/issue-page.js", "/account-graph.js", "/voter-hub.js"]) {
    const onIndex = index.includes(`src="${f}"`);
    ok(onIndex || !shellAssets.has(f),
      `sw: ${f} is on no shell that loads it and must not be in anyone's mandatory install`);
  }

  // The version has to move, or a phone holding the old shell keeps the old
  // fallback while the new rewrite is already live.
  const version = (sw.match(/const CACHE_VERSION = '(v\d+)';/) || [])[1];
  ok(!!version, "sw: CACHE_VERSION is present");
  ok(version && Number(version.slice(1)) >= 185,
    `sw: CACHE_VERSION was bumped past the person split's v184 for this shell (got ${version})`);
  ok(new RegExp(`^// ${version} - `, "m").test(sw),
    `sw: ${version} has a changelog entry in the file's own convention`);

  // The offline fallback for an issue address is /issue.html, and it is tried
  // BEFORE '/', which since this split is not even the document the network
  // would return for /i/.
  ok(/ISSUE_NAV_RE\s*=\s*\/\^\\\/i\\\//.test(sw),
    "sw: ISSUE_NAV_RE recognises an /i/<key> navigation");
  ok(/isIssue\s*\)\s*\{[\s\S]{0,400}?shell\.match\('\/issue\.html'\)/.test(sw),
    "sw: handleNavigate falls back to /issue.html for an issue address");
  const issueAt = sw.search(/shell\.match\('\/issue\.html'\)/);
  const personAt = sw.search(/shell\.match\('\/person\.html'\)/);
  const slashAt = sw.search(/const shellDoc = await shell\.match\('\/'\)/);
  ok(issueAt > 0 && slashAt > issueAt, "sw: the /issue.html fallback is tried BEFORE the '/' fallback");
  ok(personAt > 0 && slashAt > personAt, "sw: the /person.html fallback is still tried before '/' too");
  // The person lane's keying did not move.
  ok(/const PERSON_NAV_RE = \/\^\\\/p\\\/\(\[A-Za-z0-9_\]\+\)\\\/\?\$\//.test(sw),
    "sw: PERSON_NAV_RE still keys a person document to its own /p/<pid> address");
  ok(/const PERSON_DOC_LIMIT = 4;/.test(sw), "sw: PERSON_DOC_LIMIT is unchanged at four slots");
  // And an issue document is deliberately NOT keyed: no edge function rewrites
  // /i/*, so every arrival is byte-identical and one precached document serves
  // all of them. This also keeps /i/ out of the four person-document slots.
  ok(!/ISSUE_NAV_RE\.exec/.test(sw),
    "sw: navDocKey does not key an issue document — /i/ arrivals are byte-identical, so one precached /issue.html serves all of them");
}

// ── 10. The edge anchors, and the route deliberately not added ───────────────
// share-preview.ts rewrites the served HTML by regex, so every tag below has to
// keep the exact shape the function matches — attribute order included.
{
  const edge = read("netlify/edge-functions/share-preview.ts");
  ok(/<title>[^<]*<\/title>/i.test(html), "edge: <title> matches the pattern share-preview.ts replaces");
  for (const [sel, key] of [["property", "og:title"], ["property", "og:description"], ["property", "og:url"],
                            ["property", "og:image"], ["property", "og:image:alt"],
                            ["name", "twitter:title"], ["name", "twitter:description"], ["name", "twitter:image"],
                            ["name", "description"]]) {
    ok(new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i").test(html),
      `edge: <meta ${sel}="${key}"> matches share-preview.ts's setMeta pattern exactly`);
  }
  ok(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i.test(html),
    'edge: <link rel="canonical"> matches share-preview.ts\'s setCanonical pattern');
  ok(/<\/head>/i.test(html), "edge: </head> exists for the __PDX_SHARE_TARGET__ boot injection");
  ok(/<body[^>]*>/i.test(html), "edge: <body …> exists ahead of everything the function could inject");

  // AND /i/* IS DELIBERATELY NOT ON ITS ROUTE LIST. The function has no
  // server-side resolver for an ISSUE_MAP key, so pointing it at /i/* would mean
  // rewriting the tags with nothing to say — and emitting the generic site card
  // on every issue file, which is worse than the honest untouched head above
  // because a wrong card looks authoritative. The anchors are carried in the
  // right shape so the day a resolver lands, the edge can be pointed here
  // without touching the document. This assertion is the record of that choice:
  // if someone adds the route, they have to come here and say why.
  ok(!/path:\s*\[[^\]]*"\/i\/\*"/s.test(edge),
    "edge: share-preview.ts does NOT route /i/* — there is no server-side key resolver, and a card with nothing to say is the generic site card this split refused");
  ok(/path:\s*\[[^\]]*"\/p\/\*"/s.test(edge), "edge: share-preview.ts still routes /p/* — the first split's card is untouched");
  ok(/path:\s*\[[^\]]*"\/issue\/\*"/s.test(edge), "edge: share-preview.ts still routes /issue/*, which still resolves to index.html");
  // netlify.toml has to say this out loud too, next to the rule.
  ok(/share-preview\.ts IS NOT BEING EXTENDED TO \/i\/\*/.test(toml),
    "edge: netlify.toml records beside the rule why the edge function was not extended to /i/*");
}

// ── 11. The in-app doors ─────────────────────────────────────────────────────
// Three doors already pointed at /i/<key> as a plain <a href>, so the rewrite
// alone is what moves them — no interception exists to update, which is checked
// here rather than assumed.
{
  for (const [file, what] of [["consistency.js", "the gap sheet's Issue File title"],
                              ["stance-tree.js", "the stance tree's leaf row"],
                              ["word-action.js", "the Word-vs-Action shape row"]]) {
    const src = read(file);
    // Either guard shape is fine (consistency.js writes the negated early
    // return, the other two the positive test); what must hold is that the call
    // is guarded and that it is PDXIssueFamily's.
    ok(/typeof F\.profileUrl [!=]== 'function'/.test(src) && /F\.profileUrl\(/.test(src),
      `doors: ${file} builds ${what}'s address through PDXIssueFamily.profileUrl, guarded, rather than spelling one`);
    // And none of them writes the prefix itself, which is what makes the single
    // netlify.toml rule enough to move all three. Scanned with JS comments
    // stripped: all three files EXPLAIN in prose that they must not write '/i/'
    // inline, and a comment saying so must not read as the thing it forbids.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    const spelled = [...code.matchAll(/["'`]\/i\//g)];
    ok(spelled.length === 0,
      `doors: ${file} never spells '/i/' as a string literal (found ${spelled.length}) — the address has one owner, so one rewrite moves every door`);
  }
  // stance-helpers.js's mandate chip was the last spelled /i/ in the tree. It
  // had no pid to carry, so its fallback landed a reader on an issue file whose
  // close control could only offer the homepage. It now asks the same owner for
  // the address, with the row's person in hand, so the way back exists.
  const helpers = read("stance-helpers.js");
  ok(/FAM\.profileUrl\(key, id\)/.test(helpers),
    "doors: stance-helpers.js's mandate chip builds its address through PDXIssueFamily.profileUrl with the row's pid");
  ok(/window\.location\.href='/.test(helpers),
    "doors: the mandate chip still navigates when no in-page opener answers");
  const helpersCode = helpers.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  ok(!/["'`]\/i\//.test(helpersCode),
    "doors: stance-helpers.js no longer spells '/i/' — the prefix has one owner and this was the last hand-pasted copy");

  // THE TWO DOORS THAT WERE BEING SWALLOWED. Both had only in-page openers, and
  // both of those openers live on the homepage shell, so on a person file every
  // branch missed: the control painted, took the tap, stopped the event and moved
  // nothing. Each now has a LAST-resort navigation, gated on a real key.
  const spine = read("profile-spine.js");
  ok(/function sigTapJs\(key, pid\)/.test(spine),
    "doors: profile-spine.js's signature chip carries the pid, so the issue file can offer the way back");
  ok(/PDXIssueFamily\.keyIsReal\(K\)[\s\S]{0,260}profileUrl\(K,/.test(spine),
    "doors: the signature chip tests the key before it navigates — a display label must never be widened into an address");
  // The pid reaches profileUrl as its second argument; the query itself is
  // spelled once, in pdx-issue-family.js, so this door cannot disagree with the
  // other five about what the return address looks like.
  const spineCode = spine.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  ok(!/\?pid=/.test(spineCode),
    "doors: the signature chip does not assemble ?pid= itself — it hands the pid to profileUrl, which owns the whole address");
  ok(spine.indexOf("PDXIssuePage") < spine.indexOf("keyIsReal"),
    "doors: the in-page openers are still tried FIRST — a shell that has one keeps its behaviour exactly");

  const ctv = read("controversies.js");
  ok(/keyIsReal\(&quot;/.test(ctv),
    "doors: controversies.js's issue action tests the key before it navigates");
  ok(/PDXIssueView\.open[\s\S]{0,300}keyIsReal/.test(ctv),
    "doors: controversies.js still tries the in-page overlay first");
  ok(/function _ctvPid\(v\)/.test(ctv) && /\^\[A-Za-z0-9_\]\+\$/.test(ctv),
    "doors: controversies.js refuses any pid that is not the shape person-link.js publishes, because it is written into a JS string inside an HTML attribute");

  // THE GATE ITSELF, defined once in the file that owns the address.
  const fam = read("pdx-issue-family.js");
  ok(/function keyIsReal\(key\)/.test(fam) && /keyIsReal: keyIsReal/.test(fam),
    "doors: PDXIssueFamily.keyIsReal is the one vocabulary gate both new branches ask");
  ok(/\^\[A-Za-z0-9_-\]\+\$/.test(fam), "doors: keyIsReal's first wall is the key SHAPE, before any table is touched");
  ok(/hasOwnProperty\.call\(m, k\)/.test(fam),
    "doors: keyIsReal reads ISSUE_MAP with hasOwnProperty, so an inherited Object.prototype member is not mistaken for an issue");
  ok(/PDXIssueScope[\s\S]{0,120}\.read\(k\)[\s\S]{0,80}\.defined/.test(fam),
    "doors: keyIsReal also accepts a key the scope table defines, matching issue-page.js's has()");
  // And it agrees with issue-page.js, which is the authority it mirrors.
  const page = read("issue-page.js");
  ok(/\^\[A-Za-z0-9_-\]\+\$/.test(page),
    "doors: issue-page.js's has() uses the same key shape, so the two gates cannot disagree about what an issue is");

  // THE ADDRESS SHAPE, asserted so it is documented in one testable place:
  // /i/<key>, a single segment, optional trailing slash, optional ?pid= that the
  // page's own PATH_RE ignores and stamp() preserves.
  const prof = read("pdx-issue-profile.js");
  ok(/replaceState\([\s\S]{0,120}location\.search/.test(prof),
    "doors: pdx-issue-profile.js's stamp() preserves location.search, so ?pid= survives the canonical re-stamp");
  ok(/querySelector\('link\[rel="canonical"\]'\)/.test(prof),
    "doors: pdx-issue-profile.js repoints <link rel=canonical> at the bare /i/<key>, so a ?pid= query costs no canonical honesty");
  ok(/(<link\s+rel="canonical"\s+href=")/.test(html),
    "doors: and this document ships the tag it repoints, in the shape that querySelector finds");
  ok(/\/i\/' \+ encodeURIComponent/.test(fam),
    "doors: PDXIssueFamily.profileUrl is still the only place /i/ is spelled");
}

// ── 12. The document stays small ─────────────────────────────────────────────
{
  const raw = Buffer.byteLength(html, "utf8");
  const gz = gzipSync(Buffer.from(html, "utf8")).length;
  ok(raw <= MAX_DOC_RAW,
    `size: issue.html is ${(raw / 1024).toFixed(1)} KB raw, budget ${MAX_DOC_RAW / 1024} KB — if this is ever ~2 MB the split has been undone`);
  ok(gz <= MAX_DOC_GZ, `size: issue.html is ${(gz / 1024).toFixed(1)} KB gzipped, budget ${MAX_DOC_GZ / 1024} KB`);
  ok(srcs.length <= MAX_SCRIPT_TAGS,
    `size: ${srcs.length} <script src> tags, budget ${MAX_SCRIPT_TAGS} (index.html carries ~117 — that is the number this split exists to cut)`);

  const idxRaw = Buffer.byteLength(index, "utf8");
  const idxGz = gzipSync(Buffer.from(index, "utf8")).length;
  const idxTags = (index.match(/<script\b[^>]*src=/gi) || []).length;
  const perRaw = Buffer.byteLength(person, "utf8");
  const perGz = gzipSync(Buffer.from(person, "utf8")).length;
  const perTags = (person.match(/<script\b[^>]*src=/gi) || []).length;

  // Relative bounds, not just absolute ones: a ceiling can be raised, but "this
  // document must stay a fraction of the homepage" is the actual promise.
  ok(raw * 8 < idxRaw,
    `size: issue.html (${(raw / 1024).toFixed(1)} KB) is less than an eighth of index.html (${(idxRaw / 1024).toFixed(1)} KB) raw`);
  ok(gz * 8 < idxGz,
    `size: issue.html (${(gz / 1024).toFixed(1)} KB gz) is less than an eighth of index.html (${(idxGz / 1024).toFixed(1)} KB gz)`);
  ok(srcs.length * 2 < idxTags,
    `size: issue.html carries fewer than half index.html's script tags (${srcs.length} vs ${idxTags})`);
  // And smaller than person.html, which is the point of a third shell: an issue
  // dossier needs strictly less than a person record does.
  ok(raw < perRaw && srcs.length < perTags,
    `size: issue.html is smaller than person.html (${(raw / 1024).toFixed(1)} KB / ${srcs.length} tags vs ${(perRaw / 1024).toFixed(1)} KB / ${perTags} tags)`);

  console.log(`  issue.html:  ${(raw / 1024).toFixed(1)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ${srcs.length} script tags`);
  console.log(`  person.html: ${(perRaw / 1024).toFixed(1)} KB raw / ${(perGz / 1024).toFixed(1)} KB gz, ${perTags} script tags`);
  console.log(`  index.html:  ${(idxRaw / 1024).toFixed(1)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} script tags`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s) in issue.html — the third shell's contract is broken:\n`);
  for (const f of failures) console.error("  FAIL: " + f);
  console.error(`\n  (${passed} assertions passed)`);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — issue.html: /i/* is its own document, the homepage stack stays off it`);
