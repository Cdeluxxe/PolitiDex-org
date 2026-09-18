#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for evidence.html — THE EIGHTH SHELL, and the room the receipts live in
// ─────────────────────────────────────────────────────────────────────────────
// The Evidence Locker is a workspace: four views, a sticky quick-jump map, a
// filter toolbar, a bill-number search, a discovery showcase, a featured rail
// and a grid of every receipt on file. For its whole life it was a FRAGMENT of
// the front page. A previous pass got it off the critical path — closed door,
// markup parked in <template id="el-workspace-tpl"> — and gave it /locker, but
// /locker was a 200-rewrite to index.html: "the receipts room" was still 2.25 MB
// of homepage that mounted a workspace once it arrived.
//
// So /evidence is the room, /locker is a 301 into it, and the homepage keeps one
// line that opens it.
//
// The failure modes, every one of which ships silently:
//
//   1. /evidence RESOLVES TO THE FRONT PAGE, or /locker stays a SECOND 200 —
//      two addresses answering with one document, which is the canonical split
//      in half and the reader still paying for the homepage.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /evidence/ is served 200, so
//      src="evidence-locker.js" resolves to /evidence/evidence-locker.js, matches
//      the rewrite, and hands the browser this document to parse as JavaScript.
//   3. THE ENGINE GETS DUPLICATED. The brief's first rule was "engines stay
//      where they are". A room that inlines evidence-locker.js is a 278 KB fork.
//   4. THE HOMEPAGE KEEPS THE WORKSPACE. If the template, the quick-jump nav or
//      the density switch is still on '/', the split bought nothing.
//   5. A MOVED BLOCK COMES BACK, OR NEVER ARRIVES. Four blocks were MOVED here
//      rather than copied — the workspace markup, the quick-jump nav, the
//      density switch and the locker half of two stylesheets. Each has to be
//      PRESENT here and ABSENT there; either half alone is a bug, and one of
//      them (the CSS) is the difference between a styled filter banner and an
//      unstyled one.
//   6. A DOOR GOES NOWHERE. This document has no profile modal, no bill panel
//      and no account UI, but the workspace's markup calls openModal(),
//      PDXBillDetail.open() and openAuthModal(). Unseamed, every one of those
//      taps is a silent throw inside a click handler.
//   7. A STANCE SHELF APPEARS. The brief forbids a second library here: the
//      positions are ONE line pointing at /stances.
//   8. A SCORE OR A PARTY SORT APPEARS. Every number in this room is a count.
//   9. THE SERVICE WORKER SERVES A ROOM WITH NO ENGINE, or pairs a new shell
//      against a stale evidence-locker.js that cannot navigate.
//  10. THE SITEMAP GETS IT WRONG — not listing a public browse room, listing
//      the legacy alias that is a 301, or listing the two private workspaces.
//
// This harness gates all ten, in nine sections:
//
//   1. THE REWRITE — /evidence and /evidence/ at 200 after every earlier shell,
//      /locker and /locker/* as 301s, no wildcard, and no other address moved.
//   2. THE DOCUMENT — its banner, its canonical, root-absolute paths, every
//      inline block parses, and the two budgets.
//   3. THE COPY CHAIN — two slices byte-identical to their origins.
//   4. THE ENGINE IS SHARED, NOT COPIED.
//   5. THE MOVED BLOCKS — present here AND absent there, for all four.
//   6. THE SEAMS — every in-page gesture is an address, and Back still works.
//   7. THE DENYLIST — what this room must never carry.
//   8. THE HOMEPAGE IS A DOOR — no workspace, one line, and the count kept.
//   9. THE SERVICE WORKER AND THE SITEMAP.
//
//   node scripts/test-evidence-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const EV = R("evidence.html");
const INDEX = R("index.html");
const PERSON = R("person.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");
const SITEMAP = R("sitemap.xml");
const EL_JS = R("evidence-locker.js");
const APP2 = R("app-2.css");

// Every "must not contain" runs against a comment-stripped view: this document's
// doctrine block NAMES the modules it deliberately does not carry and the blocks
// it took off the front page, and a comment can neither satisfy nor violate a
// contract. index.html's side of each MOVED pin is the same story in reverse —
// its remaining prose explains where each block went, in HTML comments and in
// CSS ones. Blanked rather than removed so line numbers survive.
const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
// CSS comments only INSIDE <style>, so a `/*` in a JavaScript string is never
// mistaken for the start of one and live code is never blanked.
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) =>
  b.replace(/\/\*[\s\S]*?\*\//g, blank));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
const EV_BARE = styleBare(htmlBare(EV));
const EV_CODE = jsBare(EV_BARE);
const INDEX_BARE = styleBare(htmlBare(INDEX));
const INDEX_CODE = jsBare(INDEX_BARE);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE REWRITE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · /evidence is its own address, and /locker is a 301 into it");

const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const body = m[1];
  const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const ruleIndex = (from) => RULES.findIndex((r) => r.from === from);
// Netlify is first-match-wins, so the only question a static test can answer is
// "which rule wins for this path".
const resolveAddr = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) { if (path.startsWith(r.from.slice(0, -1))) return r; }
    else if (r.from === path) return r;
  }
  return null;
};

ok(RULES.length > 0, "rewrite: netlify.toml declares at least one [[redirects]] rule");
for (const addr of ["/evidence", "/evidence/"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/evidence.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /evidence.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}

// ONE SPELLING, AND THE OLD ONE REDIRECTS. /locker was the address this room had
// while it was a rewrite to the front page. Readers hold those links, so it is
// kept — as a 301, never as a second 200, because two live addresses for one
// document is the canonical split in half and the analytics with it.
for (const addr of ["/locker", "/locker/", "/locker/anything"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/evidence" && String(hit.status) === "301",
    `rewrite: ${addr} is a 301 to /evidence (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}
ok(!RULES.some((r) => r.from && /^\/locker/.test(r.from) && String(r.status) === "200"),
  "rewrite: /locker is not a second 200 for this room — one spelling, used everywhere");

// THE ORDER. Every rule for this room is an exact path or a single wildcard, so
// nothing above them can swallow them today; the assertion is that declaration
// order still protects them the day a rule above gains a wildcard.
{
  const p = ruleIndex("/p/*"), b = ruleIndex("/ballot"), m = ruleIndex("/me");
  const s = ruleIndex("/stances"), e = ruleIndex("/evidence"), ee = ruleIndex("/evidence/");
  const l = ruleIndex("/locker");
  ok(p >= 0 && b >= 0 && m >= 0 && s >= 0 && e >= 0 && ee >= 0 && l >= 0,
    "rewrite: /p/*, /ballot, /me, /stances, /evidence, /evidence/ and /locker are all declared");
  ok(e > b && e > m && e > p,
    `rewrite: /evidence is declared after /p/*, /ballot and /me (indices p=${p} ballot=${b} me=${m} evidence=${e})`);
  ok(ee > e, "rewrite: /evidence/ is declared after /evidence");
  ok(l > e, "rewrite: the /locker alias is declared after the address it points at");
}

// NO WILDCARD UNDER THIS ADDRESS. What a reader is looking at in this room is a
// QUERY (?pol=, ?issue=, ?bill=, ?mandate=…), never a segment, and a query
// string does not participate in rule matching at all.
ok(!RULES.some((r) => r.from && /^\/evidence/.test(r.from) && r.from.includes("*")),
  "rewrite: no /evidence* wildcard rule exists — a filter is a query, not a segment");

// THE ADDRESSES THIS SPLIT MUST NOT STEAL.
for (const [addr, expect] of [
  ["/p/lee", "/person.html"],
  ["/i/guns", "/issue.html"],
  ["/issue/guns", "/spotlight.html"],
  ["/ballot", "/ballot.html"],
  ["/me", "/me.html"],
  ["/stances", "/stances.html"],
]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === expect,
    `rewrite: ${addr} still resolves to ${expect} (got ${hit ? hit.to : "no matching rule"})`);
}
// A near-miss is NOT this address.
for (const addr of ["/evidencelocker", "/evidence/hb101"]) {
  const hit = resolveAddr(addr);
  ok(!hit || hit.to !== "/evidence.html",
    `rewrite: ${addr} is not answered by /evidence.html (got ${hit ? hit.to : "no matching rule"})`);
}
ok(resolveAddr("/") === null, "rewrite: '/' has no rewrite rule — the front page is still index.html");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the banner, the canonical, root-absolute paths, the budgets");

// THE BANNER, which sw.js's SUB_SHELL_BANNER_RE reads to refuse a cached '/'
// whose body is actually this document. It has to be inside the sniff window.
const BANNER_RE = /\b(person|issue|spotlight|ballot|stances|evidence)\.html\s*—\s*THE\s+(?:SECOND|THIRD|FOURTH|FIFTH|SEVENTH|EIGHTH)\s+SHELL\b/;
const bm = BANNER_RE.exec(EV.slice(0, 4096));
ok(bm && bm[1] === "evidence",
  "banner: evidence.html declares itself the eighth shell inside the first 4096 characters");
has(EV, "/evidence IS ITS OWN DOCUMENT", "banner: the banner names the address it serves");
ok(!BANNER_RE.test(INDEX), "banner: index.html carries no shell banner — that is what makes the guard a discriminator");

// A PUBLIC BROWSE ROOM, so unlike /ballot and /me it is indexable and carries a
// real canonical — on the www host, which is the one the apex 301s to.
has(EV, '<link rel="canonical" href="https://www.politidex.fyi/evidence" />',
  "head: the canonical is www.politidex.fyi/evidence");
has(EV, '<meta property="og:url" content="https://www.politidex.fyi/evidence" />',
  "head: og:url matches the canonical");
ok(/<title>[^<]*PolitiDex[^<]*<\/title>/.test(EV), "head: the title names PolitiDex");
lacks(EV, 'name="robots"', "head: no robots meta — a public browse room is indexed");
lacks(EV, "application/ld+json",
  "head: no JSON-LD — index.html's WebSite block describes the front page, and a browse room is not it");
// The canonical is the ADDRESS, not the alias.
lacks(EV_BARE, "politidex.fyi/locker", "head: nothing on this document points the canonical at the legacy alias");

// EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE. /evidence/ is served 200, so a bare
// src would be answered with this document and parsed as JavaScript.
const attrs = [...EV_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in evidence.html is root-absolute (offenders: ${relative.join(", ")})`);

const TAGS = [...EV.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inlineBlocks = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
ok(inlineBlocks.length >= 5,
  `paths: evidence.html carries its inline blocks (${inlineBlocks.length} found — the nav, the density switch, ` +
  "the vocabulary, the canonicaliser and the seams)");
let parseFails = [];
for (const b of inlineBlocks) { try { new vm.Script(b.body); } catch (e) { parseFails.push(e.message); } }
eq(parseFails.length, 0, `paths: every inline <script> block in evidence.html parses (${parseFails[0] || ""})`);

// Two tripwires, not targets. The document is CHROME plus the workspace markup
// that moved here; a budget going red is the split being undone one <script> at
// a time. The ceiling is higher than /stances' because the 388-line workspace
// template lives here.
const gz = gzipSync(Buffer.from(EV, "utf8")).length;
ok(gz < 36 * 1024, `budget: evidence.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 36 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 34,
  `budget: evidence.html loads ${localSrcs.length} local scripts (ceiling 34 — sixteen of them are State Senate waves)`);
ok(localSrcs.every((s) => s.charAt(0) === "/"), "budget: every local script src is root-absolute");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE COPY CHAIN
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the two copied blocks are byte-identical to their origins");

// A chain, not a fan: each block records the file and the line range it came
// from, so a fix to the origin surfaces as ONE test failure per document
// instead of as a silent divergence nobody is looking for. When the origin
// shifts, the header comment in evidence.html and this table move TOGETHER.
const lines = (s) => String(s).split("\n");
const slice = (src, a, b) => lines(src).slice(a - 1, b).join("\n");
// The index.html range moved by roughly a thousand lines without a single
// character of the block changing: the passes that gave the courts archive and
// the reader's own desk their own documents took that much markup off the front
// page ABOVE this script, so the same bytes now start at a lower line. That is
// what a range pin is for — it failed loudly on the shift instead of quietly
// pinning a slice of some other block.
//
// Both ranges moved again when the pre-SDK auth stub stopped answering for the
// SDK. index.html's PDXStance block shifted 56 lines down the document without
// a character of it changing (the note and the queueing stub above it are what
// grew), and the Firebase boot block itself got thirty lines longer in both
// documents at once — the queue, and the timeout that flushes it if
// firebase-boot.js never arrives. The pin is deliberately the WHOLE block,
// opening script tag through the firebase-boot.js include, so a stub fix that
// lands on one document and not the other fails here rather than in a room.
const COPIES = [
  { from: "index.html", src: INDEX, a: 21070, b: 21191, what: "the PDXStance vocabulary" },
  { from: "person.html", src: PERSON, a: 2006, b: 2060, what: "the Firebase boot" },
];
// The three-room split moved the index.html range by −2021 — /mandate, /voice
// and /money took the agenda wall, the proposals wall and five inline blocks out
// of the front page, and PDXStance sits below all of it. Re-derived by locating
// the block, not by subtracting; person.html's Firebase boot did not move.
//   It moved again for the same reason twice over: /community took the Exchange
// and the Open board off the front page, and the pass after it made the front
// page a DOOR to the money lane — #follow-the-money, the Wealth Transparency
// board and the retired #N-by-funding leaderboard all came out of index.html,
// the first two landing on /money. PDXStance sits below every one of those
// cuts. Re-derived again by locating the run, and again evidence.html's own
// declared range moved with it in the same edit.
//   And once more, this time UPWARD IN NUMBER rather than down: the Digital
// Library split took the #digital-library warehouse out of index.html but left
// a longer note in its place and added a paragraph to the head forwarder, so
// the front page grew by twelve lines above this block and PDXStance moved DOWN
// the document to 20956–21077. A pin that only ever drifts one direction is a
// pin nobody re-derives; this one was re-derived by locating the 122-line run
// verbatim, like every move before it.
//   AND ONCE MORE, DOWN AGAIN BY 114, for a pass that added nothing to a room
// and took nothing out of one. Home hygiene put four things above this block:
// a CSS lock in the head that hides the admin expansion tools for anyone the
// gate has not recognized, a compact H.R.1 teaching card above Door 1, a
// <template> wrapper that keeps the two admin sections out of the document
// entirely, and the <script> tag that Follow the Money's departure had taken
// with it — the tag whose absence was painting raw JavaScript under the footer.
// None of them is anywhere near PDXStance; all four sit above it, which is the
// only fact this pin cares about. 21070-21191, re-derived by locating the
// 122-line run.
for (const c of COPIES) {
  const header = new RegExp(`COPIED VERBATIM FROM ${c.from.replace(".", "\\.")} LINES ${c.a}[^0-9]{1,3}${c.b}`);
  ok(header.test(EV), `copy: evidence.html declares ${c.what} as ${c.from} ${c.a}–${c.b}`);
  const body = slice(c.src, c.a, c.b);
  ok(body.trim().length > 0, `copy: ${c.from} ${c.a}–${c.b} is a non-empty slice`);
  ok(EV.indexOf(body) >= 0,
    `copy: ${c.what} in evidence.html is byte-identical to ${c.from} ${c.a}–${c.b} — ` +
    "if the origin moved, move the declared range and this pin together");
}
// The vocabulary is a copy on BOTH documents, which is the point of pinning it:
// index.html still declares its own, and so does /stances.
has(INDEX_CODE, "window.PDXStance", "copy: index.html still declares PDXStance — this split did not take it");
has(EV_CODE, "window.PDXStance", "copy: evidence.html declares PDXStance so a receipt can print a stance pill");
// Firebase is here for the live per-member evidence documents, which is the one
// thing in this room that is not a bundled asset — the same reason person.html
// carries it, and the reason /stances does not.
has(EV_BARE, "/firebase-config.js", "copy: the Firebase boot is loaded, not reimplemented");
has(EV_BARE, "/firebase-boot.js", "copy: and its initialiser");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE ENGINE IS SHARED, NOT COPIED
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the workspace is painted by the same engine the homepage loaded");

for (const f of ["/evidence-locker.js", "/app-2.css", "/issue-map.js", "/issue-colors.js",
                 "/stance-helpers.js", "/spotlight-index.js", "/spotlight-cards-data.js",
                 "/cmp-data.js", "/person-link.js", "/profile-evidence.js", "/data-hygiene.js"]) {
  has(EV_BARE, f, `engine: evidence.html loads ${f}`);
}
// PARSER-BLOCKING, exactly as index.html loads it: _init() is registered on
// DOMContentLoaded and on a 4-second safety net, and both have to be in place
// before the document finishes parsing.
ok(/<script src="\/evidence-locker\.js"><\/script>/.test(EV),
  "engine: evidence-locker.js is a plain parser-blocking script, not deferred");
// NOT INLINED. A distinctive interior line from the engine must appear in the
// module and NOT in this document — that is the difference between reusing an
// engine and forking 278 KB of one.
const fingerprint = (src, re, name) => {
  const m = re.exec(src);
  ok(!!m, `engine: could not fingerprint ${name} — this test needs updating, not silencing`);
  return m ? m[0] : null;
};
const EL_FP = fingerprint(EL_JS, /var _NAV_KEYS = \['pol', 'pols'[^\n]*/, "evidence-locker.js");
if (EL_FP) lacks(EV, EL_FP, "engine: evidence-locker.js is loaded, not pasted into evidence.html");
const EL_FP2 = fingerprint(EL_JS, /function _lockerHref\(filters\) \{/, "evidence-locker.js's href builder");
if (EL_FP2) lacks(EV, EL_FP2, "engine: and the navigation helper is the module's, not a second copy");
// app-2.css is the locker's own 561-rule stylesheet, loaded AFTER tailwind so a
// .el- rule still wins a tie against a utility, exactly as on the homepage.
// Compared on the STYLESHEET links, not on the preload hint above them: a
// preload does not participate in the cascade, and app-2.css is preloaded first
// on purpose (it is the bigger of the two and the one first paint waits on).
ok(EV.indexOf('<link rel="stylesheet" href="/css/tailwind.css" />') <
   EV.indexOf('<link rel="stylesheet" href="/app-2.css" />'),
  "engine: tailwind.css is declared before app-2.css — the locker's rules win their ties");
ok(APP2.indexOf(".el-") >= 0, "engine: app-2.css is the file that carries the .el- rules");

// THE HOST. Same section id the homepage keeps, so every deep link a reader
// holds still resolves, and the workspace still arrives through _mount().
has(EV_BARE, '<section id="evidence-locker"', "engine: the workspace's host section id is unchanged");
has(EV_BARE, '<template id="el-workspace-tpl">', "engine: the workspace is a template here too, mounted by _mount()");
lacks(EV_BARE, "el-closed", "engine: the homepage's shut-state class is not here — the workspace arrives open");

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE MOVED BLOCKS
// ═════════════════════════════════════════════════════════════════════════════
section("5 · four blocks moved: present here AND absent there");

// A MOVE has a stronger invariant than a copy and no line pin: the original was
// deleted, so there is no second copy to drift from, and a line range pinned to
// a block that no longer exists at that line is worse than no pin. What is
// asserted instead is both halves — here, and gone from there.
const MOVED = [
  {
    what: "the workspace template",
    here: ['<template id="el-workspace-tpl">', 'class="el-shell"', 'id="el-jump"', 'id="el-toolbar"',
           'id="el-results"', 'id="el-f-bill"', 'id="el-f-search"', 'id="el-modal-overlay"'],
    gone: ['<template id="el-workspace-tpl">', 'class="el-shell"', 'id="el-jump"', 'id="el-results"',
           'id="el-f-bill"'],
  },
  {
    what: "the quick-jump nav",
    here: ["window.rebuildEvidenceNav", "el-jump-pill", "pdx:locker:mounted"],
    gone: ["window.rebuildEvidenceNav", "el-jump-pill"],
  },
  {
    what: "the card-density switch",
    here: ["pdx-el-density", "el-density-btn"],
    gone: ["pdx-el-density", "el-density-btn"],
  },
  {
    what: "the locker half of the People's Mandate stylesheet",
    here: [".el-mandate-filter", ".el-compare-filter", ".el-relevant-filter", ".el-pol-ctx-card",
           ".el-results-grouped", ".el-polgrp-head", ".el-power-badge", ".el-card-cmp"],
    gone: [".el-mandate-filter", ".el-compare-filter", ".el-relevant-filter", ".el-pol-ctx-card",
           ".el-results-grouped", ".el-polgrp-head", ".el-power-badge", ".el-card-cmp"],
  },
];
for (const b of MOVED) {
  for (const n of b.here) has(EV_BARE, n, `moved: ${b.what} — ${n} is on evidence.html`);
  for (const n of b.gone) lacks(INDEX_BARE, n, `moved: ${b.what} — ${n} is gone from index.html`);
}
// THE CSS MOVE IS THE ONE THAT WOULD HAVE FAILED SILENTLY. These selectors are
// in NEITHER app-2.css nor any other stylesheet: they only ever existed in the
// string index.html's People's Mandate block injected into <head>. Left behind,
// they would have been dead there and missing here, and /evidence would paint an
// unstyled banner over the grid for any reader arriving with ?mandate=, ?pol= or
// the relevant-to-me toggle on.
for (const sel of ["el-mandate-filter", "el-pol-ctx-card", "el-power-badge", "el-results-grouped"]) {
  lacks(APP2, sel, `moved: .${sel} is not in app-2.css — which is why the move was load-bearing`);
  has(EL_JS, sel, `moved: the engine still renders ${sel}, so the rule has to travel with it`);
}
has(EV_BARE, 'id="pdx-ev-mandate-css"', "moved: the rules arrive as a real stylesheet, not a second script");
// Its cascade position: after app-2.css, which is where the appendChild put it.
ok(EV.indexOf('<link rel="stylesheet" href="/app-2.css" />') < EV.indexOf('id="pdx-ev-mandate-css"'),
  "moved: the moved rules are declared after app-2.css, the position the injector gave them");
// The .pdx-mandate-* half STAYED. The reform rail is still a homepage surface.
has(INDEX_CODE, ".pdx-mandate-chip", "moved: the reform rail's own rules stayed on the front page");
lacks(EV_BARE, ".pdx-mandate-chip", "moved: and did not come along — there is no reform rail in this room");

// The nav's public name must be UNDEFINED on the homepage, not merely unwired:
// nothing there can satisfy it, and a stub would be a pill bar whose counts
// never move.
ok(!/window\.rebuildEvidenceNav\s*=/.test(INDEX_CODE),
  "moved: index.html defines no rebuildEvidenceNav — there is no #el-jump there to rebuild");
ok(/window\.rebuildEvidenceNav\s*=/.test(EV_CODE),
  "moved: evidence.html defines it, because the pill bar is here");

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SEAMS
// ═════════════════════════════════════════════════════════════════════════════
section("6 · every in-page gesture is an address, and Back still works");

has(EV_CODE, "location.assign", "seams: navigations go through location.assign");
lacks(EV_CODE, "history.replaceState",
  "seams: nothing here fabricates a history entry — Back has to return the reader to where they were");
lacks(EV_CODE, "history.pushState", "seams: nothing here pushes a fake history entry either");

// SEAM 1 — a person is an address, not a modal. closeModal is a real no-op
// rather than absent: the engine calls it before applying a filter, and a
// missing function there would throw inside a click handler and eat the tap.
for (const n of ["window.openModal", "window.showProfile", "window.closeModal"])
  has(EV_CODE, n, `seams: ${n} is defined on this document`);
has(EV_CODE, "PDXPersonLink", "seams: the person hop asks person-link.js for the address");
has(EV_CODE, "'/p/'", "seams: the person hop falls back to /p/<pid>");
has(EV_CODE, "window._pdxOpenStanceRecord",
  "seams: the context header's 'back to their Full Stance Record' is their person file");
has(EL_JS, "_pdxOpenStanceRecord", "seams: the engine still reaches for that name — the seam is load-bearing");

// SEAM 2 — a measure is an address. PDXBillDetail is the name the engine tries
// FIRST, so defining it is what makes a bill tap one navigation and not two
// guesses ending in a source PDF.
for (const n of ["window.PDXBillDetail", "window.PDXBills"])
  has(EV_CODE, n, `seams: ${n} is defined so a receipt that names a measure opens the measure`);
has(EV_CODE, "'/b/'", "seams: and the address it opens is /b/<sitting>/<number>");
ok(/return '\/b\/' \+ \(sit \? encodeURIComponent\(sit\) \+ '\/' : ''\) \+ encodeURIComponent\(n\)/.test(EV_CODE),
  "seams: the sitting comes first when there is one — a bill number repeats every session");

// SEAM 3 — the ask this document cannot answer. There is no account UI here and
// stubbing one would be a lie, so it is a trip to the front page.
has(EV_CODE, "window.openAuthModal", "seams: the sign-in gate is defined rather than left to throw");
has(EV_CODE, "'/#account'", "seams: and it goes to the document that has the real modal");

// SEAM 4 — the hashes that used to land somewhere. #evidence-locker is THIS
// document (the engine's _wantsLocker reads it), so it must NOT be in the table
// that navigates away.
ok(/HASH_HOME\s*=\s*\{[^}]*'open-forum'/.test(EV_CODE),
  "seams: the homepage hashes are a table, not a chain of ifs");
ok(!/HASH_HOME\s*=\s*\{[^}]*'evidence-locker'/.test(EV_CODE),
  "seams: #evidence-locker is NOT in the leave-the-page table — it is this address");
has(EV_CODE, "if (h === 'stance-library') { go('/stances'); return; }",
  "seams: the old stance-library hash becomes the other room");
has(EV_CODE, "if (h === 'all-spotlights') { go('/stances#all-spotlights'); return; }",
  "seams: and the Spotlight shelf hash lands on the shelf, which is in that room");

// DELIBERATELY NOT SEAMED. _pdxOpenEvidenceLocker is the engine's OWN opener,
// and on this document it must MOUNT rather than navigate — re-seaming it here
// would be the address asking the server for itself in a loop.
ok(!/window\._pdxOpenEvidenceLocker\s*=/.test(EV_CODE),
  "seams: _pdxOpenEvidenceLocker is NOT redefined here — on this address it mounts, it does not navigate");
has(EL_JS, "function _navToLocker", "seams: the engine owns that decision, and it is the one that navigates");
ok(/if \(_atLocker\(\)\)/.test(EL_JS),
  "seams: and it refuses to navigate when it is already at this address");

// The modified-click escape hatch: the wordmark and the Home chip are real
// anchors, so cmd/middle-click has to keep the browser's own behaviour.
ok(/e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey \|\| e\.button/.test(EV_CODE),
  "seams: a modified click is left to the browser rather than swallowed");

// ═════════════════════════════════════════════════════════════════════════════
// 7 · THE DENYLIST
// ═════════════════════════════════════════════════════════════════════════════
section("7 · what this room must never carry");

const DENY = [
  ["/app.css", "986 KB of homepage styling for a document with its own stylesheet"],
  ["/stance-library.js", "the stance desk — the positions are /stances"],
  ["/stance-library.css", "and its stylesheet"],
  ["/spotlight-hub.js", "the sixty-card Spotlight shelf, which is the other room's"],
  ["/spotlights-data.js", "the 1.2 MB Spotlight corpus belongs to /issue/<slug>"],
  ["/profiles-full.js", "the profile modal — a person is /p/<pid> from here"],
  ["/bill-detail.js", "the bill panel — a measure is /b/<number> from here"],
  ["/my-stances.js", "the reader's own positions belong to /me"],
  ["/my-profile.js", "the reader's own file belongs to /me"],
  ["/ballot-workspace.js", "the ballot desk is /ballot"],
  ["/me-desk.js", "the voter's file is /me"],
  ["/compare-hub.js", "the nav's account menu, and with it the whole homepage chrome"],
  ["/pdx-stability.js", "a homepage-scale stability harness for a document with one surface"],
  ["/digital-library.js", "the front page's library rail, whose three buttons are now links"],
];
for (const [file, why] of DENY) lacks(EV_BARE, file, `denylist: evidence.html must not load ${file} — ${why}`);

// NO SECOND SHELF. The brief's rule for this document: no full stance-library
// grid here — the positions are ONE line.
for (const n of ['id="sl-body"', "sl-shell", 'id="all-spotlights"', "shub-grid", "shub-controls"])
  lacks(EV_BARE, n, `no-shelf: ${n} is not on this document`);
has(EV_BARE, 'class="pdx-ev-seam"', "no-shelf: the positions are one line");
has(EV_BARE, '<a href="/stances">', "no-shelf: and it is a real anchor to the other room");
ok((EV_BARE.match(/href="\/stances"/g) || []).length >= 2,
  "no-shelf: the shell bar's room chip and the cross-link both point at /stances");

// NEVER A SCORE, NEVER A PARTY SORT. Not a ban on the WORDS — the doctrine block
// uses them — but on this document's own markup and script printing one.
for (const n of ['class="pdx-score', 'aria-label="score', "% aligned", "Direction Match", "sort=party"])
  lacks(EV_BARE, n, `no-score: evidence.html must not print ${n}`);

// ═════════════════════════════════════════════════════════════════════════════
// 8 · THE HOMEPAGE IS A DOOR
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the homepage keeps one line, the count, and no workspace");

// FIRST PAINT: ZERO RECEIPT GRID. The section id stays (four other surfaces
// wire to it and #evidence-locker is a bookmark readers already hold) and the
// engine stays (it is what counts the receipts those surfaces print).
has(INDEX_BARE, 'id="evidence-locker"', "homepage: the section id survives for the deep links that point at it");
has(INDEX_BARE, 'id="el-door"', "homepage: what is inside it now is a door");
has(INDEX_BARE, 'id="el-door-open"', "homepage: with a control that opens the room");
has(INDEX_BARE, 'href="/evidence"', "homepage: and the control is a real anchor, so a middle-click opens a tab");
ok((INDEX_BARE.match(/href="\/evidence"/g) || []).length >= 3,
  "homepage: the desktop nav row, the mobile drawer row and the section door all point at /evidence");
// THE COUNT IS THE ONE THING THE HOMEPAGE KEPT.
has(INDEX_BARE, 'id="el-door-count"', "homepage: the door's one line can print a count");
ok(/id="el-door-count"[^>]*\bhidden\b/.test(INDEX_BARE),
  "homepage: and it fails closed — [hidden] until there is a real number to print");
has(INDEX_BARE, '/evidence-locker.js', "homepage: the engine stays, because it is what counts the receipts");

// ONE ITEM PER ROOM. The homepage carried two labels for this one shelf.
lacks(INDEX_BARE, 'href="#evidence-locker"',
  "homepage: no in-app link still scrolls to the section instead of going to the room");
// The perf styles must not reserve a workspace's height for a door.
ok(!/content-visibility[\s\S]{0,400}#evidence-locker/.test(cssBare(INDEX_BARE)),
  "homepage: #evidence-locker is out of the content-visibility list — a door needs no reservation");
// And the brief's explicit leftovers.
lacks(INDEX_BARE, "Loading your profile", "homepage: no profile-loading line on the front page");

// THE ENGINE IS THE DOOR'S OWN SEAM. With no template in the document, every
// opener it publishes becomes a navigation carrying the filter it was asked for.
has(EL_JS, "function _wantsLocker", "links: the engine decides whether it is at this address");
ok(/\/\^\\\/\(\?:evidence\|locker\)\\\/\?\$\/i/.test(EL_JS),
  "links: and it recognises both spellings of it");
has(EL_JS, "return _navToLocker(opts.filters);",
  "links: an open() that cannot mount becomes a navigation to the room, filters and all");

// ═════════════════════════════════════════════════════════════════════════════
// 9 · THE SERVICE WORKER AND THE SITEMAP
// ═════════════════════════════════════════════════════════════════════════════
section("9 · the shell is precached, and the room is advertised");

const assetsSrc = (SW.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || "";
ok(assetsSrc.length > 0, "sw: SHELL_ASSETS is still an array literal");
const ASSETS = [...assetsSrc.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
ok(ASSETS.includes("/evidence.html"), "sw: /evidence.html is precached — the room boots offline");
ok(ASSETS.includes("/evidence-locker.js"), "sw: the engine is precached with it, in the same version");
ok(ASSETS.includes("/"), "sw: the homepage is still precached");
// The pairing that made the bump necessary: a new shell beside a stale engine is
// a door with nothing behind it, and the reverse is an engine with no room.
ok(SW.indexOf("'/evidence.html'") < SW.indexOf("'/evidence-locker.js'") ||
   SW.indexOf("'/evidence-locker.js'") < SW.indexOf("'/evidence.html'"),
  "sw: both halves of the pair are in the same precache list");

has(SW, "const EVIDENCE_NAV_RE", "sw: the address has a navigation regex");
ok(/const EVIDENCE_NAV_RE = \/\^\\\/evidence\\\/\?\$\//.test(SW),
  "sw: EVIDENCE_NAV_RE is the two exact spellings and nothing beneath them");
has(SW, "shell.match('/evidence.html')", "sw: an offline /evidence navigation falls back to its own document");
// Ordered so no earlier shell can be intercepted by it, and before the generic
// '/' fallback, which since this split carries the door and not the workspace.
ok(SW.indexOf("shell.match('/stances.html')") < SW.indexOf("shell.match('/evidence.html')"),
  "sw: the /evidence branch is after every earlier shell branch");
ok(SW.indexOf("shell.match('/evidence.html')") < SW.indexOf("shell.match('/')"),
  "sw: and before the generic '/' fallback, which carries only the door");
// The banner guard has to recognise this document or a poisoned '/' entry
// carrying it would be served as the homepage.
ok(/SUB_SHELL_BANNER_RE = [^\n]*evidence/.test(SW),
  "sw: SUB_SHELL_BANNER_RE recognises the eighth shell");
ok(/SUB_SHELL_BANNER_RE = [^\n]*EIGHTH/.test(SW), "sw: and the ordinal it declares itself with");
// A new shell is a new precache list, which is what the version is for.
const ver = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
ok(!!ver, "sw: CACHE_VERSION is declared");
ok(ver && Number(ver.slice(1)) >= 199,
  `sw: CACHE_VERSION was bumped for the new shells (found ${ver}, expected v199 or later)`);
has(SW, `// ${ver} - `, `sw: ${ver} has a version-log entry in the file's own style`);
// THE ENTRY THIS SUITE READS IS v199's, NAMED, NOT WHATEVER IS LIVE.
// An earlier draft read the log entry belonging to the CURRENT CACHE_VERSION and
// asserted it named evidence.html, stances.html, evidence-locker.js and
// index.html. That is true of exactly one entry — the one written by the pass
// that shipped those two shells — so the assertion held until the next unrelated
// bump and then failed with a message about a bump that had nothing to do with
// this room. The log is append-only and its entries are immutable, so the pin
// is the version that made the claim.
{
  const at = SW.indexOf("// v199 - ");
  ok(at >= 0, "sw: the v199 entry — the one that shipped the seventh and eighth shells — is gone from the log");
  const next = SW.indexOf("\n// v200 - ", at);
  const entry = at >= 0 ? SW.slice(at, next > at ? next : at + 12000) : "";
  for (const f of ["evidence.html", "stances.html", "evidence-locker.js", "index.html"])
    has(entry, f, `sw: the v199 note no longer says the bump carried ${f}`);
}

// THE SITEMAP. A public browse room is listed; the legacy alias is not, because
// it is a 301, and the two private workspaces are not either.
has(SITEMAP, "<loc>https://www.politidex.fyi/evidence</loc>", "sitemap: /evidence is advertised");
has(SITEMAP, "<loc>https://www.politidex.fyi/stances</loc>", "sitemap: /stances is advertised beside it");
lacks(SITEMAP, "politidex.fyi/locker", "sitemap: the legacy alias is not listed — it is a 301");
lacks(SITEMAP, "politidex.fyi/evidence/", "sitemap: only one spelling of the room is listed");
lacks(SITEMAP, "politidex.fyi/me<", "sitemap: /me is NOT advertised — it is the reader's own desk");
lacks(SITEMAP, "politidex.fyi/ballot<", "sitemap: /ballot is NOT advertised either");
// And it is GENERATED, never hand-edited.
has(R("scripts/gen-sitemap.mjs"), '"/evidence"', "sitemap: the address comes from the generator, not from an edit");

// ═════════════════════════════════════════════════════════════════════════════
console.log(
  `\n  evidence.html: ${(EV.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ` +
  `${TAGS.length} script tags\n`
);
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — evidence.html: /evidence is its own room, the homepage keeps the door`);
