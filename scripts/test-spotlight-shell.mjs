#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for spotlight.html — THE FOURTH SHELL
// ─────────────────────────────────────────────────────────────────────────────
// /issue/<slug> is an Issue Spotlight: one long curated writeup, and the sixty
// of them live in spotlights-data.js — 1.2 MB of prose, timelines, evidence,
// cases and a roster of who stands where. That file was on index.html. So:
//
//   · EVERY HOMEPAGE VISIT PAID FOR IT. Lazily, by the end — pdx-lazy-data.js
//     moved the cost off first paint — but a scroll toward Local Issues or the
//     first tap anywhere still fetched and compiled sixty articles the reader
//     had not opened.
//   · AND A READER WHO DID OPEN ONE got the writeup wrapped in the whole app:
//     Compare Hub, the alignment tool, Door 2, the ballot workspace, the
//     person-file spine, the account graph, the Locker.
//
// The third split gives that address its own document: netlify.toml rewrites
// /issue/* to /spotlight.html, which carries the corpus, the engine lifted out
// of index.html, the one stylesheet it paints with, and person-link.js so a
// name still opens that person's file. Nothing else.
//
// A FOURTH hand-edited shell has every failure mode the third has, plus three
// that belong to this split specifically:
//
//   1. IT SILENTLY REGROWS. Nothing stops the next feature from pasting a
//      homepage module back in. The denylist below is the gate.
//   2. THE CORPUS COMES BACK TO THE FRONT PAGE. The whole point of this pass is
//      one file moving one direction. A `<script src="/spotlights-data.js">` on
//      index.html — or a re-entry in pdx-lazy-data.js's FILES — undoes it with
//      no visible symptom at all, because everything still works. Only a test
//      notices.
//   3. TWO ADDRESSES, ONE PREFIX. /i/<key> is the Issue File (a dossier ledger
//      over a vocabulary key) and /issue/<slug> is a Spotlight (one writeup).
//      They share a prefix in spelling only, they are different products, and
//      each has its own document. A door that spells the wrong one sends a
//      reader to a page that cannot answer them — and both rewrites return 200,
//      so nobody gets a 404 to notice.
//   4. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /issue/<slug> is two segments
//      deep and its rewrite returns 200 for anything beneath it, so
//      src="spotlight-engine.js" resolves to /issue/spotlight-engine.js, matches
//      the rewrite, and the browser is handed this document and told to parse it
//      as JavaScript. No 404, no error, just a module that never defines
//      anything.
//   5. THREE COPIES OF THE STANCE LANGUAGE CAN DRIFT. window.PDXStance is inline
//      on index.html, on person.html and now here; the stance-pill CSS is in
//      index.html's <style> and in spotlight-overlay.css. The pins below hold
//      this document's copies to INDEX.HTML's.
//   6. THE GENERATED INDEX CAN GO STALE. spotlight-index.js is derived from the
//      corpus; an edited Spotlight with no regenerate leaves the front page
//      showing a title that no longer exists.
//   7. THE SERVICE WORKER KEEPS SERVING THE OLD SHELL. If /spotlight.html is not
//      precached, an offline Spotlight address falls back to a document that no
//      longer carries the Spotlight surface at all.
//
// This harness gates:
//
//   1. THE REWRITE AND ITS ORDER. /issue/<slug> → /spotlight.html at 200, and
//      /i/* and /p/* are declared AHEAD of it so first-match-wins cannot let a
//      Spotlight rule swallow an Issue File or a person file.
//   2. THE DENYLIST, module by module.
//   3. THE CORPUS LIVES ON EXACTLY ONE DOCUMENT — present here, absent from
//      index.html, absent from the lazy loader.
//   4. WHAT MUST BE PRESENT, each resolving to a file that parses.
//   5. EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE.
//   6. THE VERBATIM COPIES are byte-identical to their source in index.html.
//   7. THE CHROME CONTRACT — one thin bar, no observer of any kind.
//   8. NO EMPTY MOUNT IS OWED. The overlay host is built by script.
//   9. THE ENGINE'S SEVEN SEAMS are actually sewn: no _basePath, no pushState
//      close, no showProfile, no issue-page hand-off, and a registry miss hops
//      once to /i/<key>.
//  10. NO DOOR SPELLS THE WRONG PREFIX, in either direction.
//  11. THE GENERATED INDEX IS IN SYNC with the corpus, and carries no writeup.
//  12. THE SERVICE WORKER precaches /spotlight.html and falls back to it for
//      /issue/, after the /p/ and /i/ branches.
//  13. THE EDGE ANCHORS share-preview.ts rewrites are present in its exact tag
//      shape — and /i/* is still deliberately NOT on its route list.
//  14. THE DOCUMENT STAYS SMALL, against a hard ceiling and against index.html.
//  15. INDEX.HTML ACTUALLY GOT SMALLER. The split is only real if the front page
//      lost the weight; this compares the working tree against HEAD.
//
//   node scripts/test-spotlight-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const html = read("spotlight.html");
// spotlight.html's header comment quotes the exact things this harness forbids —
// it names every denylisted module by filename and it quotes a bare
// spotlight-engine.js src as the relative-path bug it must not have. A comment
// cannot satisfy or break a contract, so every PRESENCE-or-ABSENCE check runs
// against `bare`: the document with its HTML comments removed. (Verified safe:
// no inline block in spotlight.html contains an HTML comment marker, so
// stripping them cannot cut into executable code.)
const bare = html.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const index = read("index.html");
const indexBare = index.replace(/<!--[\s\S]*?-->/g, "");
const engine = read("spotlight-engine.js");
// Same reason as `bare`: the engine header documents the seams it had cut by
// naming them, so every ABSENCE check runs against the code and not the prose.
const engineCode = engine.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");
const overlayCss = read("spotlight-overlay.css");
const overlayRules = overlayCss.replace(/\/\*[\s\S]*?\*\//g, "");
const spotIndex = read("spotlight-index.js");
const lazy = read("pdx-lazy-data.js");
const hub = read("spotlight-hub.js");
const sw = read("sw.js");
const toml = read("netlify.toml");
const edge = read("netlify/edge-functions/share-preview.ts");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// Budgets. Tripwires, not targets — raise them deliberately, with a reason. A
// number going red here is the split being undone, not a metric needing
// adjustment. RAW is bounded as well as gzipped: a big document that compresses
// well would slip past a gzip-only ceiling while still costing the phone every
// byte of parse.
const MAX_DOC_RAW = 48 * 1024;    // the whole document, on the wire before gzip
const MAX_DOC_GZ = 14 * 1024;     // the whole document, gzipped
const MAX_SCRIPT_TAGS = 8;        // <script src> count, external SDKs included
const MAX_BLOCKING_CSS = 2;       // render-blocking <link rel=stylesheet>
// The front page's index of the shelf. It replaces 1.2 MB; it must not grow into
// a second copy of it.
const MAX_INDEX_RAW = 140 * 1024;
const MAX_INDEX_GZ = 40 * 1024;

// Paired match, so a `<script>` written inside a JS comment or a string literal
// is body text and not a tag.
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const srcs = TAGS
  .map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter(Boolean);
const localSrcs = srcs.filter((s) => !/^(https?:)?\/\//.test(s));

// Real slugs, read out of spotlights-data.js rather than written down here, so
// every routing and registry test below exercises addresses the app can resolve.
const SPOT = (() => {
  const sandbox = { window: {} };
  try {
    new vm.Script(read("spotlights-data.js"), { filename: "spotlights-data.js" })
      .runInNewContext(sandbox);
  } catch (e) { return {}; }
  return sandbox.window.SPOTLIGHTS || {};
})();
const SLUGS = Object.keys(SPOT);
ok(SLUGS.length > 40,
  `corpus: spotlights-data.js publishes a populated SPOTLIGHTS (got ${SLUGS.length} slugs) — every test below needs a real slug`);
const SLUG = SLUGS.includes("box-elder-stratos-data-center")
  ? "box-elder-stratos-data-center" : SLUGS[0];

// ── 1. The rewrite, and the ORDER of the four documents ──────────────────────
// Netlify matches [[redirects]] top to bottom and takes the first hit, so the
// question a test can answer is "which rule wins for this path", not "does a
// rule exist". `*` is a trailing wildcard.
const RULES = [...toml.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const body = m[1];
  const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const ruleIndex = (from) => RULES.findIndex((r) => r.from === from);
const resolveAddr = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) {
      const prefix = r.from.slice(0, -1);            // "/issue/*" → "/issue/"
      if (path.startsWith(prefix)) return r;
    } else if (r.from === path) return r;
  }
  return null;
};

ok(RULES.length > 0, "rewrite: netlify.toml declares at least one [[redirects]] rule");
for (const addr of [`/issue/${SLUG}`, `/issue/${SLUG}/`, "/issue/anything-at-all", "/issue/"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/spotlight.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /spotlight.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
ok(existsSync(join(ROOT, "spotlight.html")), "rewrite: /spotlight.html exists to be served");

// FIRST-MATCH-WINS, DECLARED IN THE RIGHT ORDER. This is the one structural
// thing a fourth rewrite can break: /i/* and /p/* must be ahead of /issue/*, so
// that even a widened Spotlight glob cannot reach an address that belongs to
// another document. (The globs do not overlap as written — "/issue/x" does not
// start with "/i/" — but order is the property that survives an edit to the
// glob, and it is what the request asked for.)
{
  const iAt = ruleIndex("/i/*"), pAt = ruleIndex("/p/*"), isAt = ruleIndex("/issue/*");
  ok(iAt >= 0 && pAt >= 0 && isAt >= 0,
    `rewrite order: all three of /i/*, /p/* and /issue/* are declared (got ${iAt}, ${pAt}, ${isAt})`);
  ok(pAt < isAt, `rewrite order: /p/* is declared before /issue/* (${pAt} < ${isAt})`);
  ok(iAt < isAt, `rewrite order: /i/* is declared before /issue/* (${iAt} < ${isAt})`);
}

// THE OTHER THREE SHELLS ARE NOT DISTURBED. If this pass had reordered the rules
// or widened a glob, this is where it shows.
for (const addr of ["/p/lee", "/p/mike_lee", "/p/null"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/person.html" && String(hit.status) === "200",
    `rewrite: ${addr} still serves /person.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
for (const addr of ["/i/housing", "/i/gun_safety", "/i/lands_preserve", "/i/anything_at_all"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/issue.html" && String(hit.status) === "200",
    `rewrite: ${addr} still serves /issue.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
// AND NOTHING ELSE WAS STOLEN. The request named these five by name.
for (const addr of ["/vote/hr1", "/d/ut-statehouse-68", "/b/hr1", "/locker", "/locker/x"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/index.html",
    `rewrite: ${addr} still resolves to /index.html — this pass took only /issue/* (got ${hit ? hit.to : "no matching rule"})`);
}
ok(resolveAddr("/") === null, "rewrite: / is not caught by any rewrite rule — it is the published document");
// No slug is enumerated in netlify.toml: a registry miss is answered inside the
// document (one hop to /i/<key>), not by a growing list of rules in a config.
ok(!RULES.some((r) => r.from && /^\/issue\/[^*]/.test(r.from)),
  "rewrite: no per-slug /issue/<slug> rule is enumerated in netlify.toml");

// ── 2. The denylist — what this document exists in order NOT to load ─────────
// The request named the first group explicitly; the rest is the same rule
// applied to the same codebase. A Spotlight is one writeup: it needs no compare
// surface, no ballot, no account, no person-file spine and no dossier builder.
const DENY = [
  // Named in the request
  "compare-hub.js", "compare-table.js", "alignment-tool.js", "alignment-tool.css",
  "door1-workspace.js", "door1-workspace.css", "ballot-workspace.js",
  "profile-spine.js", "profile-spine.css", "profile-dossier.js",
  "issue-page.js", "pdx-issue-profile.js", "issue-view.js", "issue-file.js",
  "voice.js", "like-dislike.js",
  // The homepage stack, the account lane and the rest of the doors
  "my-stances.js", "my-profile.js", "profile-connect.js", "account-graph.js",
  "acct-spotlight-data.js", "cmp-data.js", "cmp-data-detail.js",
  "profiles-full.js", "profiles.js", "spotlight-hub.js", "spotlight-index.js",
  "all-seeing-eye.js", "evidence-locker.js", "digital-library.js",
  "stance-library.js", "stance-library.css", "word-action.js", "word-action.css",
  "consistency.js", "stance-tree.js", "compare-hub.css",
  "voting-record.js", "person-file.js", "your-file.js", "support-route.js",
  "app.css", "app-2.css", "pdx-lazy-data.js", "pdx-stability.js",
  "hero-showcase.js", "inventory.js", "gov-contracts.js", "bills.js",
  "bill-detail.js", "journey.js", "firebase", "tailwind.css"
];
for (const mod of DENY) {
  ok(!bare.includes(mod),
    `denylist: spotlight.html must not reference ${mod} — a Spotlight is one writeup, not the app`);
}
// And the surfaces by name, in case one arrives inline rather than as a src.
for (const surface of ["compare-hub", "alignment-tool", "door2", "door-2", "ballot-workspace"]) {
  ok(!bare.toLowerCase().includes(surface),
    `denylist: spotlight.html must not carry any ${surface} surface`);
}
ok(srcs.length <= MAX_SCRIPT_TAGS,
  `denylist: spotlight.html carries ${srcs.length} script srcs, ceiling ${MAX_SCRIPT_TAGS}`);
{
  // A <link rel=preload as=style onload="this.rel='stylesheet'"> is not
  // render-blocking and neither is the <noscript> twin behind it — both mention
  // the word, so counting the word overcounts. Only a tag whose OWN rel is
  // stylesheet, outside noscript, holds up first paint.
  const blocking = [...bare.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "").matchAll(/<link\b[^>]*>/gi)]
    .filter((m) => /\brel\s*=\s*["']stylesheet["']/i.test(m[0].split(/\bonload\s*=/)[0]));
  ok(blocking.length <= MAX_BLOCKING_CSS,
    `denylist: spotlight.html carries ${blocking.length} render-blocking stylesheets, ceiling ${MAX_BLOCKING_CSS}`);
}

// NO OBSERVER OF ANY KIND IN THE DOCUMENT. The request was explicit: no
// ResizeObserver, no layout observer. pdx-stability.js installs both, which is
// exactly why it is on the denylist above rather than loaded for its scroll lock.
for (const obs of ["ResizeObserver", "MutationObserver", "IntersectionObserver", "PerformanceObserver"]) {
  ok(!bare.includes(obs), `chrome: spotlight.html installs no ${obs}`);
  ok(!engineCode.includes(obs), `chrome: spotlight-engine.js installs no ${obs}`);
}

// ── 3. The corpus lives on exactly ONE document ──────────────────────────────
// This is the whole pass in three assertions.
ok(bare.includes('src="/spotlights-data.js"'),
  "corpus: spotlight.html loads /spotlights-data.js — it IS the page");
ok(!/<script[^>]+spotlights-data\.js/.test(indexBare),
  "corpus: index.html must NOT load spotlights-data.js — every homepage visit used to pay 1.2 MB for writeups it never opened");
ok(!indexBare.includes("spotlights-data.js"),
  "corpus: index.html must not reference spotlights-data.js outside comments at all");
ok(!/spotlights:\s*\{\s*src:/.test(lazy),
  "corpus: pdx-lazy-data.js must not carry a `spotlights` FILES entry — lazy is not the same as gone");
ok(!/keys:\s*\[[^\]]*'spotlights'/.test(lazy),
  "corpus: pdx-lazy-data.js declares no SECTIONS row that pulls the corpus");
ok(!/ensureAll\(\[[^\]]*'spotlights'/.test(lazy) && !/warmSoon\(\[[^\]]*'spotlights'/.test(lazy),
  "corpus: pdx-lazy-data.js neither warms nor idle-loads the corpus");
// The engine and its stylesheet are not on the front page either.
ok(!indexBare.includes("pdxis-overlay"),
  "corpus: index.html carries no .pdxis-overlay — the overlay markup and stylesheet went with the engine");
// index.html still READS window.PDXSpotlight in a dozen places — the profile
// callout rail, the my-ballot tiles, the documentation badge — and every one of
// those reads is guarded. What it must no longer do is DEFINE it: the name now
// belongs to spotlight-index.js here (60 rows, no writeup) and to
// spotlight-engine.js on /issue/*, and a third definition inline would be the
// engine growing back.
ok(!/window\.PDXSpotlight\s*=/.test(indexBare),
  "corpus: index.html does not DEFINE window.PDXSpotlight inline — spotlight-index.js owns the name on this document");
ok(/window\.PDXSpotlight = \{/.test(spotIndex),
  "corpus: spotlight-index.js is the one that defines it on the front page");
ok(!/function\s+bootDeepLink/.test(indexBare),
  "corpus: index.html carries no part of the Spotlight engine's boot ladder (bootDeepLink)");
// THE ONE PIECE THAT STAYED, AND WHY IT IS NOT THE ENGINE COMING BACK.
// window._pdxRelatedSpotlight is the "Featured in Issue Spotlight" rail on the
// profile modal. profiles-full.js asks for it by name when a profile paints
// (typeof-guarded, so nothing threw while it was briefly gone), and
// PDXDossier.railHtml — which ships on this document and has no other caller —
// paints it. It is a DOOR, not the room: slug and title only, read out of
// spotlight-index.js, and every chip an ordinary <a href="/issue/<slug>">.
{
  const rail = indexBare.slice(indexBare.indexOf("window._pdxRelatedSpotlight = function"));
  ok(rail.length > 400, "doors: index.html still defines the profile-modal Spotlight rail");
  ok(/PDXSpotlight\.forPolitician/.test(rail),
    "doors: the rail reads forPolitician from the INDEX — it must not need the corpus");
  ok(/PDXDossier\.railHtml/.test(rail),
    "doors: the rail prefers the compact PDXDossier rail, which is the only caller that module has");
  ok(/href=/.test(rail.slice(0, 2600)) && !/<button/.test(rail.slice(0, 2600)),
    "doors: the rail's fallback chips are links to /issue/<slug>, not buttons that open an overlay this document no longer has");
  for (const gone of ["render(sp)", "showOverlay", "setMeta(sp)", "SPOTLIGHTS[", "timeline", "caseFor"]) {
    ok(!rail.slice(0, 2600).includes(gone),
      `doors: the rail carries no part of the engine (${gone}) — it reads slug and title and nothing else`);
  }
  const dos = read("profile-dossier.js");
  ok(/href="\/issue\/'/.test(dos) && !/<button type="button" class="pdxis-rail-b"/.test(dos),
    "doors: PDXDossier.railHtml emits <a href=\"/issue/<slug>\"> chips, not buttons");
}

// ── 4. What must be present, and each must parse ─────────────────────────────
// Four files, in this order, and the order is load-bearing: the corpus is a
// parser-blocking <script> ABOVE the engine, because the engine reads
// window.SPOTLIGHTS at closure time.
const MUST = ["/person-link.js", "/spotlights-data.js", "/spotlight-engine.js"];
for (const m of MUST) {
  ok(srcs.includes(m), `present: spotlight.html loads ${m}`);
  ok(existsSync(join(ROOT, m.slice(1))), `present: ${m} exists on disk`);
}
ok(bare.includes('href="/spotlight-overlay.css"'),
  "present: spotlight.html links /spotlight-overlay.css");
ok(existsSync(join(ROOT, "spotlight-overlay.css")), "present: spotlight-overlay.css exists on disk");
ok(srcs.indexOf("/spotlights-data.js") < srcs.indexOf("/spotlight-engine.js"),
  "present: the corpus is loaded BEFORE the engine — the engine reads window.SPOTLIGHTS at closure time");
ok(!/<script[^>]+spotlights-data\.js[^>]*\b(defer|async)\b/.test(bare),
  "present: the corpus is parser-blocking, not deferred — the engine must not run first");
for (const f of ["spotlight-engine.js", "spotlight-index.js", "spotlight-hub.js", "pdx-lazy-data.js"]) {
  let threw = null;
  try { new vm.Script(read(f), { filename: f }); } catch (e) { threw = e.message; }
  ok(!threw, `present: ${f} parses (${threw || "ok"})`);
}
// The inline blocks parse too.
for (const t of TAGS.filter((t) => !t.attrs.includes("src") && t.body.trim())) {
  let threw = null;
  try { new vm.Script(t.body, { filename: "spotlight.html inline" }); } catch (e) { threw = e.message; }
  ok(!threw, `present: an inline <script> in spotlight.html parses (${threw || "ok"})`);
}

// ── 5. Every same-origin path is root-absolute ───────────────────────────────
// /issue/<slug> is two segments deep and its rewrite returns 200 for anything
// beneath it, so a bare src resolves to /issue/<file>, matches the rewrite, and
// the browser is handed this document and told to parse it as JavaScript.
for (const s of localSrcs) {
  ok(s.startsWith("/"),
    `root-absolute: script src "${s}" must start with / — a relative src under /issue/<slug> is served this document as JavaScript`);
}
for (const m of bare.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
  const v = m[1];
  if (/^(https?:|mailto:|tel:|data:|#|\/)/.test(v)) continue;
  ok(false, `root-absolute: attribute value "${v}" is neither root-absolute nor an off-origin URL`);
}
passed++; // the loop above only records failures

// ── 6. The verbatim copies ───────────────────────────────────────────────────
// window.PDXStance is the engine's ONE unguarded dependency: it reads
// window.PDXStance.pill() with no typeof guard, so a missing copy is a blank
// "Who Stands Where" rather than a degraded one. It is inline here for the same
// reason person.html has its own inline copy — it is ~4 KB and a fourth file
// request for it would cost more than it saves. Which means a THIRD copy that
// can drift, so it is pinned to index.html's byte-for-byte.
{
  const grab = (src) => {
    const at = src.indexOf("// ── PDXStance — shared canonical stance language");
    if (at < 0) return null;
    const end = src.indexOf("</script>", at);
    return end < 0 ? null : src.slice(at, end).replace(/[ \t]+$/gm, "").trim();
  };
  const mine = grab(html);
  const theirs = grab(index);
  ok(mine && theirs, "verbatim: the PDXStance block is findable in both spotlight.html and index.html");
  ok(mine && theirs && mine === theirs,
    "verbatim: spotlight.html's PDXStance block is byte-identical to index.html's (modulo trailing space) — three copies must not drift");
}
// The stance-pill CSS is the other copy, and it is deliberately in BOTH places:
// index.html keeps it because profiles-full.js paints .pdxis-stance / -k / -dot /
// -none and .pdxis-p-meta / .pdxis-meta-k there (app-2.css only shrinks the pill
// inside .el-pss-row — nothing defines the base), and spotlight-overlay.css has
// it because the engine paints the same pill here.
for (const rule of [
  ".pdxis-stance{display:inline-flex;align-items:center;gap:.42rem;flex:0 0 auto;",
  ".pdxis-stance-k{font:700 .56rem/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;",
  ".pdxis-stance-dot{width:.5rem;height:.5rem;border-radius:50%;background:currentColor;",
  ".pdxis-stance-supported{color:#4fd6b3;background:rgba(45,212,164,.13);border-color:rgba(45,212,164,.42);}",
  ".pdxis-stance-opposed{color:#ff9d84;background:rgba(248,113,90,.13);border-color:rgba(248,113,90,.42);}",
  ".pdxis-stance-mixed{color:#f3cb5c;background:rgba(245,193,66,.13);border-color:rgba(245,193,66,.42);}",
  ".pdxis-stance-none{color:#a4b4cc;background:rgba(140,156,182,.1);border-color:rgba(140,156,182,.3);}",
  ".pdxis-p-meta{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-top:.55rem;}",
  ".pdxis-meta-k{font:700 .58rem/1 'Barlow Condensed',sans-serif;letter-spacing:.13em;"
]) {
  ok(index.includes(rule),
    `verbatim: index.html keeps the shared stance-pill rule "${rule.slice(0, 40)}…" — profiles-full.js paints it there`);
  ok(overlayCss.includes(rule),
    `verbatim: spotlight-overlay.css carries the same rule "${rule.slice(0, 40)}…"`);
}
// The engine-only pills went, and did not linger on the front page.
for (const gone of [".pdxis-stance-cta{", ".pdxis-stverd{", ".pdxis-wrap{", ".pdxis-tl-date{"]) {
  ok(!index.includes(gone),
    `verbatim: index.html dropped the engine-only rule "${gone}" — only the shared pill stayed`);
  ok(overlayCss.includes(gone), `verbatim: spotlight-overlay.css owns "${gone}"`);
}
// The stylesheet must stand on its own: it is loaded without app.css, so a
// var() with no fallback would paint nothing.
for (const m of overlayRules.matchAll(/var\(\s*(--[A-Za-z0-9-]+)\s*\)/g)) {
  ok(false, `verbatim: spotlight-overlay.css uses var(${m[1]}) with no fallback, but it ships without app.css`);
}
passed++;

// ── 7. The chrome contract ───────────────────────────────────────────────────
// Thin chrome only: the wordmark home, an optional back when the referrer is
// safe, and "← All politicians". Nothing else, and no second navigation UI.
ok(/class="pdx-spot-wordmark"[^>]*|pdx-spot-wordmark/.test(bare),
  "chrome: spotlight.html has a wordmark control");
ok(bare.includes('id="pdx-spot-back"'), "chrome: spotlight.html has an optional back control");
ok(/hidden/.test((bare.match(/<a[^>]+id="pdx-spot-back"[^>]*>/) || [""])[0]),
  "chrome: the back control starts hidden — it is shown only when the referrer is safe");
ok(bare.includes("← All politicians"),
  'chrome: "← All politicians" is a separate control, not the back button');
ok((bare.match(/← All politicians/g) || []).length === 1,
  'chrome: exactly one "← All politicians" control');
ok(bare.includes("document.referrer"),
  "chrome: the back control is gated on document.referrer");
ok(/\borigin\s*[!=]==\s*location\.origin/.test(bare),
  "chrome: the referrer gate compares the referrer origin with location.origin — an off-site referrer is not a back path");
ok(/\/\^\\\/issue\\\//.test(bare) || /\^\\\/issue/.test(bare),
  "chrome: the referrer gate also rejects another /issue/ page — back out of a Spotlight must not mean back into one");
ok(/--pdx-chrome/.test(bare), "chrome: --pdx-chrome is declared so the overlay can sit below the bar");
ok(!/<input/.test(bare), "chrome: no search input on this document — it is one writeup, not a directory");
ok(!/shub-|li-card|\.cmp-|mp-card/.test(bare),
  "chrome: no homepage grid, hub or compare markup on this document");

// ── 8. No empty mount is owed ────────────────────────────────────────────────
// The overlay host is built by script. Static markup for a module's mount is a
// thing that can go stale against the module; a self-built host cannot.
ok(!/<section[^>]+id="issue-spotlight"/.test(bare),
  "no-empty-mount: #issue-spotlight is NOT static markup in spotlight.html");
ok(/getElementById\('issue-spotlight'\)|id\s*=\s*'issue-spotlight'/.test(bare),
  "no-empty-mount: spotlight.html builds #issue-spotlight in script");
ok(/createElement\(['"]section['"]\)/.test(bare),
  "no-empty-mount: the host is created with document.createElement");
ok(/pdxis-wrap/.test(bare), "no-empty-mount: the self-built host carries the .pdxis-wrap the engine paints into");

// ── 9. The engine's seams ────────────────────────────────────────────────────
// spotlight-engine.js is index.html's inline engine moved out. It was written
// for an overlay on a page that also held the profile modal, the stance library
// and issue-page.js. Seven assumptions had to be cut, and each cut is a thing
// that can be quietly pasted back.
ok(!/\b_basePath\b/.test(engine),
  "seam 1: no _basePath — closing does not pushState back to a homepage path that no longer exists");
// SEAM 2 IS NOT "never pushState". This document serves every slug, so opening a
// SECOND Spotlight without a reload is a real navigation and owes the reader a
// real history entry — open() pushes one, and that is right. What the seam cut
// is the two places that assumed an overlay ON TOP of a page: the FIRST paint
// must not push (the browser is already at this address, so a push would make
// Back a no-op that stays on the same writeup), and close() must not push a
// homepage path this document cannot paint. The smoke test below asserts the
// first-paint half against the real engine; this is the close() half.
{
  const closeFn = engineCode.slice(engineCode.indexOf("function close(opts)"));
  const body = closeFn.slice(0, closeFn.indexOf("\n  }\n"));
  ok(body.length > 40, "seam 2: close() is findable in spotlight-engine.js");
  ok(!/pushState/.test(body),
    "seam 2: close() does not pushState — leaving is a document boundary, not an overlay state change");
  ok(/leave\(/.test(body), "seam 2: close() leaves through leave(), the one way out");
}
ok(/if \(!opts\.fromPop\)/.test(engineCode),
  "seam 2: open() pushes only when it was not driven BY history — a popstate open must not push again");
ok(/function leave\(/.test(engine), "seam 1: leave() is the one way out of this document");
ok(/history\.back\(\)/.test(engine), "seam 1: leave() prefers history.back() when the referrer was safe");
{
  const code = engine.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  ok(!/\bshowProfile\b/.test(code),
    "seam 3: no showProfile call — a name opens that person's FILE through PDXPersonLink, not a modal that is not here");
  ok(!/\bsyncIssuePage\b/.test(code) && !/\bPDXIssuePage\b/.test(code),
    "seam 6: no issue-page.js hand-off — the dossier is issue.html's lane and is not rebuilt here");
  ok(!/\bbootDeepLink\b/.test(code),
    "seam 6: no bootDeepLink retry ladder — there is no PROFILES or CMP_DATA on this document to wait 5s for");
  ok(!/_pdxRelatedSpotlight/.test(code),
    "seam 7: no _pdxRelatedSpotlight — the profile-modal rail belongs to a modal that is not here");
}
ok(/PDXPersonLink/.test(engine), "seam 3: a name resolves through PDXPersonLink");
ok(/'\/#stance-library'|"\/#stance-library"/.test(engine),
  "seam 4: the Stance Library hop is a cross-document address, not a bare hash");
ok(/'\/#community-exchange'|"\/#community-exchange"/.test(engine),
  "seam 5: the Community Exchange hop is a cross-document address, not a bare hash");
// THE REGISTRY MISS. /issue/<key> for a vocabulary key that has no Spotlight is
// not an error and not a front page — it is the same key at the other address.
ok(/function hopToIssueFile/.test(engine), "seam 6: a registry miss hops to the Issue File");
ok(/location\.replace\('\/i\/' \+ encodeURIComponent\(slug\) \+ \(location\.search \|\| ''\)\)/.test(engine),
  "seam 6: the hop is location.replace (not push) to /i/<key>, carrying ?pid= through untouched");
ok(/_hopped/.test(engine), "seam 6: the hop fires at most once");
ok(/pdx:spotlight:open/.test(engine) && bare.includes("pdx:spotlight:open"),
  "seam 7: the engine announces an open and the document listens (so the loading line can go)");
ok(/location\.replace\('\/'\)/.test(engine),
  "seam: bare /issue/ with no slug goes home once rather than sitting on a loading line");

// The engine and the corpus, booted together in a sandbox: does a real slug
// actually paint, and does a miss actually hop?
{
  const stance = (() => {
    const parts = html.split("COPIED VERBATIM FROM index.html");
    if (parts.length < 2) return null;
    const m = parts[1].match(/<script>\n([\s\S]*?)\n  <\/script>/);
    return m ? m[1] : null;
  })();
  ok(!!stance, "smoke: the inline PDXStance block is extractable from spotlight.html");
  const boot = (pathname, search) => {
    const els = {};
    const mk = (id) => ({
      id, hidden: true, className: "", innerHTML: "", style: {},
      children: [], classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
      appendChild(c) { this.children.push(c); return c; },
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, focus() {}, scrollIntoView() {}, remove() {}
    });
    const wrap = mk("pdxis-wrap");
    const host = mk("issue-spotlight");
    els["pdxis-wrap"] = wrap; els["issue-spotlight"] = host;
    const replaced = [], assigned = [], pushed = [];
    const sandbox = {
      console,
      window: {},
      document: {
        readyState: "complete", title: "t", referrer: "",
        documentElement: mk("html"), head: mk("head"), body: mk("body"),
        getElementById: (id) => els[id] || null,
        createElement: (t) => mk("new-" + t),
        querySelector: () => null, querySelectorAll: () => [],
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }
      },
      location: {
        pathname, search: search || "", hash: "", origin: "https://politidex.test",
        href: "https://politidex.test" + pathname + (search || ""),
        assign: (u) => assigned.push(u), replace: (u) => replaced.push(u)
      },
      history: { length: 2, pushState: (a, b, u) => pushed.push(u), replaceState() {}, back() {} },
      CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
      setTimeout, clearTimeout, requestAnimationFrame: (f) => f(),
      // The engine binds popstate on the window at closure time (SHELL SEAM 2 —
      // a Spotlight address is a real history entry here, not an overlay state),
      // so the sandbox window has to be an event target or the file throws
      // before it publishes anything.
      addEventListener(t, fn) { (this._ls || (this._ls = {}))[t] = fn; },
      removeEventListener() {}, dispatchEvent() { return true; },
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      scrollTo() {}, innerWidth: 390, innerHeight: 844
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    for (const [name, src] of [["spotlights-data.js", read("spotlights-data.js")],
                               ["PDXStance", stance || ""],
                               ["spotlight-engine.js", engine]]) {
      new vm.Script(src, { filename: name }).runInContext(sandbox);
    }
    return { api: sandbox.window.PDXSpotlight, wrap, host, replaced, assigned, pushed };
  };
  const hit = boot("/issue/" + SLUG, "");
  ok(hit.api && typeof hit.api.open === "function", "smoke: the engine publishes window.PDXSpotlight");
  ok(hit.api && Object.keys(hit.api.registry || {}).length === SLUGS.length,
    `smoke: the engine's registry holds all ${SLUGS.length} slugs`);
  ok(hit.wrap.innerHTML.length > 4000,
    `smoke: /issue/${SLUG} paints a real writeup (${hit.wrap.innerHTML.length} bytes)`);
  ok(hit.wrap.innerHTML.includes(SPOT[SLUG].title),
    "smoke: the painted writeup carries its own title");
  ok(hit.wrap.innerHTML.includes("pdxis-stance"),
    "smoke: the painted writeup carries stance pills — PDXStance resolved");
  ok(hit.host.hidden === false, "smoke: the overlay host is shown");
  ok(hit.pushed.length === 0, "smoke: painting a Spotlight pushes no history entry");
  const missPid = boot("/issue/housing", "?pid=lee");
  ok(missPid.replaced.length === 1 && missPid.replaced[0] === "/i/housing?pid=lee",
    `smoke: a registry miss hops once to /i/<key> carrying ?pid= (got ${JSON.stringify(missPid.replaced)})`);
  const miss = boot("/issue/gun_safety", "");
  ok(miss.replaced.length === 1 && miss.replaced[0] === "/i/gun_safety",
    `smoke: a registry miss with no pid hops to the bare /i/<key> (got ${JSON.stringify(miss.replaced)})`);
  const bareSlug = boot("/issue/", "");
  ok(bareSlug.replaced.length === 1 && bareSlug.replaced[0] === "/",
    `smoke: bare /issue/ goes home once (got ${JSON.stringify(bareSlug.replaced)})`);
}

// ── 10. No door spells the wrong prefix ──────────────────────────────────────
// Two addresses, one prefix, and both rewrites return 200 — so a door that
// spells the wrong one sends a reader to a page that cannot answer them and
// nobody gets a 404 to notice. Every Spotlight door keeps /issue/<slug>; every
// Issue File door keeps /i/<key>.
const DOOR_FILES = [
  "index.html", "spotlight-hub.js", "spotlight-index.js", "spotlight-engine.js",
  "digital-library.js", "evidence-locker.js", "stance-helpers.js", "stance-library.js",
  "compare-hub.js", "profile-dossier.js", "gov-contracts.js", "bill-detail.js",
  "all-seeing-eye.js", "person.html", "issue.html"
];
for (const f of DOOR_FILES) {
  if (!existsSync(join(ROOT, f))) continue;
  const src = read(f);
  const code = src.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");
  // A Spotlight SLUG must never be spelled behind the Issue File prefix.
  for (const m of code.matchAll(/["'`]\/i\/([A-Za-z0-9_-]+)["'`]/g)) {
    ok(!SPOT[m[1]],
      `doors: ${f} spells /i/${m[1]}, but that is a Spotlight SLUG — Spotlight doors are /issue/<slug>`);
  }
  // And a door must not have been retargeted from /issue/<slug> to /i/<slug>.
  ok(!/\/i\/'\s*\+\s*(?:encodeURIComponent\()?\s*(?:sp|spot|spotlight)\./i.test(code),
    `doors: ${f} must not build an /i/ address out of a Spotlight record`);
}
// The Spotlight doors on the front page are ORDINARY LINKS to /issue/<slug>, not
// buttons that open an overlay — there is no overlay on index.html any more.
ok(/href="\/issue\/'\s*\+\s*encodeURIComponent\(sp\.slug\)/.test(index),
  "doors: index.html's Local Issues cards are <a href=\"/issue/<slug>\">");
ok(/href="\/issue\/'\s*\+\s*encodeURIComponent\(sp\.slug\)/.test(hub),
  "doors: spotlight-hub.js's All Spotlights cards are <a href=\"/issue/<slug>\">");
ok(!/<button[^>]*class=\\?"li-card/.test(index),
  "doors: no Local Issues card is still a <button>");
ok(!/<button[^>]*class=\\?"shub-card/.test(hub),
  "doors: no All Spotlights card is still a <button>");
ok(/location\.assign\(urlFor\(slug\)\)/.test(spotIndex),
  "doors: spotlight-index.js's PDXSpotlight.open() NAVIGATES to /issue/<slug> — there is no overlay on the front page");
ok(/'\/issue\/' \+ encodeURIComponent/.test(spotIndex),
  "doors: spotlight-index.js builds exactly one address, /issue/<slug>");
ok(!/\/i\//.test(spotIndex.replace(/^\s*\/\/[^\n]*$/gm, "")),
  "doors: spotlight-index.js never spells the Issue File prefix");
// The Issue File doors from the person file are untouched by this pass: they
// still carry ?pid= so the ledger can offer the way back. (test-issue-back-path
// owns that contract in full; this is the one-line tripwire.)
ok(/profileUrl/.test(read("pdx-issue-family.js")),
  "doors: pdx-issue-family.js still owns the /i/<key>?pid= spelling");

// ── 11. The generated index is in sync, and carries no writeup ───────────────
{
  let gen = null, genErr = null;
  try {
    gen = execFileSync(process.execPath,
      [join(ROOT, "scripts", "gen-spotlight-index.mjs"), "--check"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { genErr = (e.stderr || e.stdout || e.message || "").toString().trim(); }
  ok(!genErr,
    `index: spotlight-index.js matches scripts/gen-spotlight-index.mjs's output (${genErr || (gen || "").trim()}) — an edited Spotlight needs a regenerate`);
}
{
  const sandbox = { window: {}, location: { assign() {} } };
  sandbox.window = sandbox;
  let threw = null;
  try { new vm.Script(spotIndex, { filename: "spotlight-index.js" }).runInNewContext(sandbox); }
  catch (e) { threw = e.message; }
  ok(!threw, `index: spotlight-index.js boots (${threw || "ok"})`);
  const api = sandbox.window.PDXSpotlight;
  ok(api && typeof api.list === "function", "index: spotlight-index.js publishes window.PDXSpotlight");
  ok(api && (api.list() || []).length === SLUGS.length,
    `index: the index lists every slug in the corpus (${api ? (api.list() || []).length : 0} vs ${SLUGS.length})`);
  // Every field the homepage surfaces actually read.
  const row = api ? api.get(SLUG) : null;
  for (const f of ["slug", "title", "eyebrow", "place", "blurb", "searchKeywords", "primaryIssueKey", "st"]) {
    ok(row && row[f] !== undefined, `index: a row carries .${f} — the homepage cards read it`);
  }
  ok(row && row.st && row.st.level && row.st.label,
    "index: the documentation badge is precomputed, so the front page keeps it without the engine");
  // Precomputed must MATCH the engine's own arithmetic, or the badge lies.
  ok(row && row.st.sources === (SPOT[SLUG].timeline || []).filter((t) => t && t.src && t.src.url).length,
    "index: the precomputed source count equals the engine's own count over the corpus");
  // And it must carry NO writeup: no timeline, no evidence, no case-for, no roster.
  for (const f of ["timeline", "evidence", "caseFor", "caseAgainst", "sources", "standsOnIssue", "groups", "summary", "controversy"]) {
    ok(!row || row[f] === undefined,
      `index: a row must NOT carry .${f} — that is the writeup, and the writeup is at /issue/<slug>`);
  }
  const iRaw = Buffer.byteLength(spotIndex);
  const iGz = gzipSync(spotIndex).length;
  ok(iRaw <= MAX_INDEX_RAW, `index: spotlight-index.js is ${(iRaw / 1024).toFixed(1)} KB raw, ceiling ${(MAX_INDEX_RAW / 1024).toFixed(0)} KB`);
  ok(iGz <= MAX_INDEX_GZ, `index: spotlight-index.js is ${(iGz / 1024).toFixed(1)} KB gz, ceiling ${(MAX_INDEX_GZ / 1024).toFixed(0)} KB`);
  const corpusRaw = Buffer.byteLength(read("spotlights-data.js"));
  ok(iRaw * 10 < corpusRaw,
    `index: the index is under a tenth of the corpus (${(iRaw / 1024).toFixed(0)} KB vs ${(corpusRaw / 1024).toFixed(0)} KB) — otherwise nothing was saved`);
}

// ── 12. The service worker ───────────────────────────────────────────────────
ok(/const CACHE_VERSION = 'v(\d+)'/.test(sw), "sw: CACHE_VERSION is declared");
{
  const now = Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
  let head = 0;
  try {
    const headSw = execFileSync("git", ["show", "HEAD:sw.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    head = Number((headSw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
  } catch (e) { head = 0; }
  ok(!head || now > head,
    `sw: CACHE_VERSION moved past HEAD's (${now} vs ${head}) — a warm device holds an index.html that still expects the engine`);
}
ok(/^\s*'\/spotlight\.html',\s*$/m.test(sw), "sw: /spotlight.html is in SHELL_ASSETS");
ok(/^\s*'\/person\.html',\s*$/m.test(sw) && /^\s*'\/issue\.html',\s*$/m.test(sw),
  "sw: the other two shells are still precached");
ok(/const SPOTLIGHT_NAV_RE = /.test(sw), "sw: a /issue/ navigation regex is declared");
ok(/shell\.match\('\/spotlight\.html'\)/.test(sw), "sw: an offline /issue/ navigation falls back to /spotlight.html");
// ORDER: after the /p/ and /i/ branches, so neither can be intercepted.
{
  const p = sw.indexOf("shell.match('/person.html')");
  const i = sw.indexOf("shell.match('/issue.html')");
  const s = sw.indexOf("shell.match('/spotlight.html')");
  const root = sw.indexOf("shell.match('/')");
  ok(p > 0 && i > 0 && s > 0, "sw: all three document fallbacks are present");
  ok(p < s && i < s, "sw: the /issue/ fallback is tested AFTER the /p/ and /i/ ones");
  ok(root < 0 || s < root, "sw: the /issue/ fallback is tested BEFORE the generic '/' shell");
}
// NO PER-SLUG CACHING. navDocKey must give a /issue/ path no key at all.
{
  const fn = sw.slice(sw.indexOf("function navDocKey"), sw.indexOf("function navDocKey") + 1400);
  ok(!/issue\//.test(fn.replace(/^\s*\/\/[^\n]*$/gm, "")),
    "sw: navDocKey returns no cache key for a /issue/ path — sixty near-identical documents are not cached per slug");
}

// ── 13. The edge function ────────────────────────────────────────────────────
// share-preview.ts is document-agnostic (it rewrites whatever context.next()
// returns), so what this document owes it is the tag SET in the attribute ORDER
// setMeta/setCanonical match. A reordered attribute is a silent no-op: the head
// keeps its static values and a shared Spotlight unfurls as the generic app.
ok(/"\/issue\/\*"/.test(edge), "edge: /issue/* is on share-preview.ts's route list");
ok(!/"\/i\/\*"/.test(edge),
  "edge: /i/* is still NOT on the route list — there is no key resolver, so it would rewrite a head full of nothing");
for (const [sel, key] of [["property", "og:title"], ["property", "og:description"],
                          ["property", "og:url"], ["property", "og:image"],
                          ["property", "og:image:alt"], ["name", "twitter:title"],
                          ["name", "twitter:description"], ["name", "twitter:image"],
                          ["name", "description"]]) {
  ok(new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i").test(html),
    `edge: spotlight.html carries <meta ${sel}="${key}" content="…"> in setMeta's exact attribute order`);
}
ok(/<title>[^<]*<\/title>/i.test(html), "edge: spotlight.html has a rewritable <title>");
ok(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i.test(html),
  "edge: spotlight.html carries canonical in setCanonical's rel-then-href order");
ok(/<\/head>/i.test(html) && /<body[^>]*>/i.test(html),
  "edge: the </head> and <body> anchors the function injects at are present");
// No JSON-LD fiction and no invented score: the request forbade both.
ok(!/application\/ld\+json/.test(bare), "edge: no JSON-LD on this document — none was asked for and none is earned");
ok(!/aggregateRating|ratingValue|"score"/.test(bare), "edge: no score, rating or grade is claimed");

// ── 14 & 15. Size — this document, and what the front page gave up ───────────
{
  const raw = Buffer.byteLength(html);
  const gz = gzipSync(html).length;
  ok(raw <= MAX_DOC_RAW, `size: spotlight.html is ${(raw / 1024).toFixed(1)} KB raw, ceiling ${(MAX_DOC_RAW / 1024).toFixed(0)} KB`);
  ok(gz <= MAX_DOC_GZ, `size: spotlight.html is ${(gz / 1024).toFixed(1)} KB gz, ceiling ${(MAX_DOC_GZ / 1024).toFixed(0)} KB`);

  const idxRaw = Buffer.byteLength(index);
  const idxGz = gzipSync(index).length;
  const idxTags = (index.match(/<script\b[^>]*\bsrc\s*=/gi) || []).length;
  // MUCH smaller, not merely smaller. A fortieth of the raw bytes and a tenth of
  // the script tags is the promise this split is actually making.
  ok(raw * 40 < idxRaw,
    `size: spotlight.html (${(raw / 1024).toFixed(1)} KB) is under a fortieth of index.html (${(idxRaw / 1024).toFixed(1)} KB) raw`);
  ok(gz * 20 < idxGz,
    `size: spotlight.html (${(gz / 1024).toFixed(1)} KB gz) is under a twentieth of index.html (${(idxGz / 1024).toFixed(1)} KB gz)`);
  ok(srcs.length * 10 < idxTags,
    `size: spotlight.html carries under a tenth of index.html's script tags (${srcs.length} vs ${idxTags})`);
  // And smaller than the other two split shells: a Spotlight needs strictly less
  // than a person record or an issue dossier does.
  const perRaw = Buffer.byteLength(read("person.html"));
  const issRaw = Buffer.byteLength(read("issue.html"));
  ok(raw < perRaw && raw < issRaw,
    `size: spotlight.html is the smallest of the four shells (${(raw / 1024).toFixed(1)} vs person ${(perRaw / 1024).toFixed(1)} / issue ${(issRaw / 1024).toFixed(1)} KB)`);

  // THE FRONT PAGE ACTUALLY GAVE UP THE WEIGHT. Against HEAD, so this measures
  // the pass and not an absolute that a later feature could quietly re-inflate.
  let headIdx = null;
  try {
    headIdx = execFileSync("git", ["show", "HEAD:index.html"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { headIdx = null; }
  if (headIdx) {
    const hRaw = Buffer.byteLength(headIdx);
    const hGz = gzipSync(headIdx).length;
    ok(idxRaw < hRaw - 80 * 1024,
      `size: index.html shed more than 80 KB against HEAD (${(hRaw / 1024).toFixed(1)} → ${(idxRaw / 1024).toFixed(1)} KB raw)`);
    ok(idxGz < hGz,
      `size: index.html shed gzipped bytes too (${(hGz / 1024).toFixed(1)} → ${(idxGz / 1024).toFixed(1)} KB gz)`);
    console.log(`  index.html:     ${(hRaw / 1024).toFixed(1)} → ${(idxRaw / 1024).toFixed(1)} KB raw, ` +
      `${(hGz / 1024).toFixed(1)} → ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} script tags`);
  } else {
    console.log("  (index.html vs HEAD skipped — git show unavailable)");
  }
  console.log(`  spotlight.html: ${(raw / 1024).toFixed(1)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ${srcs.length} script tags`);
  console.log(`  spotlight-index.js: ${(Buffer.byteLength(spotIndex) / 1024).toFixed(1)} KB raw / ` +
    `${(gzipSync(spotIndex).length / 1024).toFixed(1)} KB gz (corpus: ${(Buffer.byteLength(read("spotlights-data.js")) / 1024).toFixed(0)} KB)`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s) in spotlight.html — the fourth shell's contract is broken:\n`);
  for (const f of failures) console.error("  FAIL: " + f);
  console.error(`\n  (${passed} assertions passed)`);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — spotlight.html: /issue/<slug> is its own document, and the 1.2 MB corpus is off the front page`);
