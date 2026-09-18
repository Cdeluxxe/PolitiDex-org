#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for voice.html — THE ELEVENTH SHELL, and the first address District
// Voice has ever had
// ─────────────────────────────────────────────────────────────────────────────
// District Voice was not a section of the front page. It was a BLOCK INSIDE A
// DISTRICT FILE — /d/<seat-key>, which netlify.toml rewrites to index.html — so
// the only way to a board was to already know your seat key, and the only way
// to find that out was the front page: two megabytes, the hero, Door 1's work
// layer, the Evidence Locker template and 407 KB of ballot machinery, to read
// one poll and a handful of neighbours' sentences.
//
// /voice is the address for the arrival that was never served: "show me MY
// board." The seat is resolved out of the reader's own saved location, by the
// same module that owns every other answer about District Voice.
//
// THE FAILURE MODES, EACH OF WHICH SHIPS LOOKING FINE:
//
//   1. /voice RESOLVES TO THE FRONT PAGE, or the trailing-slash form hops
//      instead of answering. And /d/<seat-key> IS NOT BEING REPLACED: a rule
//      that moved the seat file onto this document would take the "show me THIS
//      seat" arrival away from the address that is right for it.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /voice/ is served 200, so a
//      bare src="district-voice.js" resolves to /voice/district-voice.js, the
//      rewrite answers with this document, and the browser is told to parse
//      HTML as JavaScript with no error naming the cause.
//   3. A PATH SNIFF REPLACES THE FLAG. /voice, /voice/ and a preview server's
//      /voice.html are three spellings a pathname test gets differently.
//   4. THE SPLIT IS UNDONE ONE <script> AT A TIME — app.css, compare-hub.js,
//      ballot-breakdown.js. The last of those is also a correctness wall, not
//      only a budget: district-voice.js resolves the SEATED MEMBER through
//      ballot-breakdown.js's pdxSeatedMemberFor() and fails soft to '' without
//      it, and "how the member voted" is the one thing this page may not print.
//   5. A GUESS IS PRINTED AS A FINDING. The board is open in exactly one seat
//      today. A default location, a Utah pre-fill, an invented neighbour or a
//      district named out of anything but the reader's own saved fields turns
//      an honest "we do not know where you vote" into a claim about a stranger.
//   6. UNKNOWN IS PAINTED AS EMPTY. The location resolver is deferred and the
//      account it is keyed to arrives with Firebase. "You have nothing" before
//      those land is false, and it is false for exactly the reason the account
//      chip's Join CTA is: a deferred file has not returned yet.
//   7. A SECOND ANSWER APPEARS. A copy of the seat allow-list, of the seat-key
//      shape or of the frame sentence on this document is a second owner, and
//      two owners of one fact drift.
//   8. THE BOARD IS REMOUNTED ON A REPAINT, tearing down a half-typed take.
//   9. THE SERVICE WORKER GETS IT WRONG — a shell with no resolver, or '/'
//      answered with this body.
//
// Six sections:
//
//   1. THE REWRITE — two exact 200s, no wildcard, and /d/* left alone.
//   2. THE DOCUMENT — banner, canonical, root-absolute paths, the one flag, the
//      copied Firebase stub, the budgets and the cold payload against '/'.
//   3. THE ROOM IS THE WHOLE DOCUMENT — what came, what did not, the denylist.
//   4. THE FIVE STANDINGS, booted in a sandbox against a stub owner.
//   5. THE DOORS — /me's CTA, the front page's forward, the nav rows.
//   6. THE SERVICE WORKER.
//
//   node scripts/test-voice-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const VD = R("voice.html");
const INDEX = R("index.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");
const VR = R("voice-room.js");
const DV = R("district-voice.js");
const CHIP = R("shell-account-chip.js");
const ME = R("me.html");

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) => blank(b));
const scriptBare = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (b) => blank(b));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
// THE MARKUP, WITH NOTHING BUT MARKUP IN IT. This document's banner states every
// wall it keeps ("not a poll of the internet", "not how the member voted", "no
// default location") and its noscript note repeats two of them, so a substring
// sweep over the raw file fails on the sentence that promises the thing it is
// looking for. Same stripping order, same reason, as test-mandate-shell.mjs.
const VD_BARE = scriptBare(styleBare(htmlBare(VD)));
const VD_MARKUP = htmlBare(VD);   // comments out, scripts and styles kept
const CODE = jsBare(VR);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { failures.push(`FIXTURE: ${msg}`); report(); } else passed++; };

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE REWRITE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · /voice and /voice/ are one room, and /d/<seat-key> still is not");

// The same parser and the same three claims courts.html's and mandate.html's
// harnesses make, for the same reason: Netlify takes the FIRST matching rule.
const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const b = m[1];
  const g = (k) => ((new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*)"?`, "m")).exec(b) || [, ""])[1].trim();
  return { from: g("from"), to: g("to"), status: g("status"), force: g("force") };
});
ok(RULES.length > 10, `toml: the redirect table parsed (${RULES.length} rules)`);
const idxOf = (from) => RULES.findIndex((r) => r.from === from);

for (const path of ["/voice", "/voice/"]) {
  const i = idxOf(path);
  ok(i >= 0, `toml: ${path} has no rule of its own — the room is only reachable as a file`);
  if (i >= 0) {
    eq(RULES[i].to, "/voice.html", `toml: ${path} does not serve the eleventh shell`);
    eq(RULES[i].status, "200", `toml: ${path} is not a rewrite — a redirect here is a hop, not a room`);
  }
  const shadow = RULES.slice(0, i < 0 ? RULES.length : i).filter((r) => {
    if (!r.from || r.from === path) return false;
    if (r.from.indexOf("*") < 0) return false;
    const re = new RegExp("^" + r.from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return re.test(path);
  }).map((r) => r.from);
  eq(shadow.length, 0, `toml: ${path} is shadowed by an earlier wildcard (${shadow.join(", ")})`);
}
eq(RULES.filter((r) => /^\/voice/.test(r.from) && r.from.indexOf("*") >= 0).length, 0,
  "toml: a /voice wildcard exists — every path under it would answer with this document");
eq(RULES.filter((r) => r.from === "/*" && r.status === "200").length, 0,
  "toml: a /* → 200 catch-all is declared — every address in this file becomes the front page behind it");

// THE SEAT FILE IS NOT BEING REPLACED. /d/<seat-key> is "show me THIS seat" and
// it still rewrites to index.html; /voice is "show me MY board". One owner
// answers both, so the two can never disagree — but they are two addresses.
{
  const i = idxOf("/d/*");
  ok(i >= 0, "toml: /d/* has no rule — the district file was the only home District Voice had, and it still has readers");
  ok(i < 0 || RULES[i].to !== "/voice.html",
    "toml: /d/* was pointed at voice.html — the seat file is a different arrival and this shell resolves no seat from a path");
  ["/me", "/ballot", "/courts", "/evidence", "/stances", "/mandate", "/money"].forEach((p) => {
    const j = idxOf(p);
    ok(j < 0 || RULES[j].to !== "/voice.html", `toml: ${p} was pointed at voice.html`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the banner, the canonical, root-absolute paths, the one flag, the budgets");

// THE BANNER, read by sw.js to refuse a cached '/' whose body is this document.
// The regex is taken OUT OF sw.js rather than retyped, so a shell added there
// without its banner here fails on this line.
const BRE_SRC = (/const SUB_SHELL_BANNER_RE = (\/[^\n]+\/);/.exec(SW) || [, ""])[1];
must(!!BRE_SRC, "sw.js no longer declares SUB_SHELL_BANNER_RE as one literal");
const BRE = new RegExp(BRE_SRC.slice(1, BRE_SRC.lastIndexOf("/")), BRE_SRC.slice(BRE_SRC.lastIndexOf("/") + 1));
const bm = BRE.exec(VD.slice(0, 4096));
ok(bm && bm[1] === "voice",
  "banner: voice.html does not declare itself the eleventh shell inside sw.js's own 4096-character sniff window");
has(VD, "/voice IS ITS OWN DOCUMENT", "banner: the banner names the address it serves");
ok(!BRE.test(INDEX), "banner: index.html carries a shell banner — that is what makes the guard a discriminator");

// A PUBLIC BROWSE ROOM: indexable, canonical on the www host the apex 301s to.
has(VD, '<link rel="canonical" href="https://www.politidex.fyi/voice" />',
  "head: the canonical is www.politidex.fyi/voice");
has(VD, '<meta property="og:url" content="https://www.politidex.fyi/voice" />',
  "head: og:url matches the canonical");
lacks(VD_MARKUP, 'name="robots"',
  "head: no robots meta — this page holds no personal data, only a public seat's board, and it is meant to be linked");
// THE SITEMAP IS NOT ASSERTED HERE, DELIBERATELY. Advertising the three new
// addresses is its own pass (sitemap.xml, gen-sitemap.mjs, robots.txt and the
// canonicals are one system with one test), and this file pins nothing about it
// in either direction so that pass can land without editing this one.

// EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE. Served at /voice/, a bare src is
// answered with this document and parsed as JavaScript.
const attrs = [...VD_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in voice.html is root-absolute (offenders: ${relative.join(", ")})`);

// READ OUT OF THE COMMENT-STRIPPED DOCUMENT, for the reason the mandate shell's
// harness records: the banner explains this shell in English, and a tag scan
// over the raw file hands those sentences to the JavaScript parser.
const TAGS = [...VD_MARKUP.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inline = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
const parseFails = [];
for (const b of inline) { try { new vm.Script(b.body); } catch (e) { parseFails.push(e.message); } }
eq(parseFails.length, 0, `paths: every inline <script> block in voice.html parses (${parseFails[0] || ""})`);

// ONE FLAG, NO HEURISTICS, AND IT IS FIRST.
const flagIdx = VD.indexOf("window.__PDX_VOICE_DOC = true");
ok(flagIdx > 0, "flag: voice.html does not set __PDX_VOICE_DOC at all");
const firstSrc = VD_MARKUP.search(/<script\b[^>]*\bsrc=/);
ok(flagIdx < firstSrc, "flag: a script with a src is loaded before the flag is set");
eq((VD.match(/__PDX_VOICE_DOC\s*=/g) || []).length, 1,
  "flag: the flag is assigned more than once on this document — one owner, one assignment");
lacks(CODE, "location.pathname",
  "flag: voice-room.js sniffs location.pathname — /voice, /voice/ and /voice.html are three spellings of one " +
  "document that a path test gets differently");

// THE AUTH STUB IS THE ONE THE OTHER INNER SHELLS SHIP, NOT A THIRD ONE. The
// block is declared as a verbatim copy of me.html's, and the declaration is
// checked here by BYTES: the named lines are sliced out of me.html and must
// appear in this document unchanged.
//
// THESE LINE NUMBERS MOVE. When me.html changes above line 1809 the range in
// all three new shells must be RE-DERIVED — locate the run in me.html, do not
// recompute it by arithmetic. test-person-shell.mjs states the same rule for
// the seven copies it fences, and the three-room split had to re-derive every
// one of them.
{
  const a = 1815, b = 1870;
  const slice = ME.split("\n").slice(a - 1, b).join("\n");
  has(VD, `COPIED VERBATIM FROM me.html LINES ${a}–${b}`,
    "auth: voice.html does not declare which lines of me.html its Firebase block is");
  ok(VD.indexOf(slice) > 0,
    `auth: me.html lines ${a}–${b} are not present in voice.html byte for byte — either the copy drifted or the ` +
    "declared range is stale. Re-derive the range from me.html, do not adjust the number by hand");
  has(slice, "window.PDXAuth", "auth: the sliced range is not the PDXAuth block — the declared range names the wrong lines");
  has(slice, "queue", "auth: the sliced range does not contain the deferred queue");
}
// AND THE CHIP'S CONTRACT: unknown is not signed-out, so the Join CTA cannot be
// the first paint. The markup ships the unknown signature and nothing else.
has(VD, '<div id="pdx-shell-acct" data-pdx-acct-sig="unknown"></div>',
  "auth: the account slot is not empty-with-unknown — a Join CTA in the markup is a returning member told to sign up");
lacks(VD_BARE, "Join", "auth: the word Join is in this document's markup — the chip paints that, and only after auth answers");
has(VD_MARKUP, '<script defer src="/shell-account-chip.js"></script>',
  "auth: the chip is not loaded, so the account slot would stay empty forever");
lacks(VD_MARKUP, "compare-hub.js",
  "auth: the homepage engine is back on this document — the chip answers the identical three-state contract in 9 KB");

// THE BUDGETS. Tripwires, not targets.
const gz = gzipSync(Buffer.from(VD, "utf8")).length;
ok(gz < 16 * 1024, `budget: voice.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 16 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 10, `budget: voice.html loads ${localSrcs.length} local scripts (ceiling 10)`);
ok(localSrcs.every((s) => s.charAt(0) === "/"), "budget: every local script src is root-absolute");
// THE FOUR FILES THIS ADDRESS EXISTS TO NOT LOAD. ballot-breakdown.js is both a
// budget and a wall — see failure mode 4 in the header.
[["/app.css", "986 KB of homepage cascade for one board"],
  ["compare-hub.js", "758 KB of homepage engine — the chip is shell-account-chip.js"],
  ["ballot-breakdown.js", "407 KB of ballot machinery, and it is also what would resolve the seated member"],
  ["evidence-locker.js", "310 KB of locker, and the Evidence Locker is its own address"]]
  .forEach(([f, why]) => lacks(VD_MARKUP, f, `budget: ${f} is on this document — ${why}`));
has(VD, '<link rel="stylesheet" href="/district-voice.css" />',
  "budget: the board's own sheet is not loaded — the standings would paint unstyled");

// THE COLD PAYLOAD, WHICH IS THE WHOLE POINT. Measured exactly as the mandate
// shell measures it: the document plus every local script and stylesheet a cold
// browser must fetch before the room is usable.
function cold(html) {
  let bytes = gzipSync(Buffer.from(html, "utf8")).length;
  const files = [
    ...[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
  ].filter((p) => p.charAt(0) === "/");
  const seen = new Set();
  for (const p of files) {
    if (seen.has(p)) continue;
    seen.add(p);
    const abs = join(ROOT, p.slice(1));
    if (existsSync(abs)) bytes += gzipSync(readFileSync(abs)).length;
  }
  return { bytes, files: seen.size };
}
const idxGz = gzipSync(Buffer.from(INDEX, "utf8")).length;
const idxTags = (INDEX.match(/<script\b[^>]*src=/gi) || []).length;
ok(gz < idxGz && TAGS.length < idxTags && VD.length < INDEX.length,
  "cold: voice.html is not smaller than index.html by every measure");
const cVd = cold(VD);
const cIdx = cold(INDEX);
ok(cVd.bytes < cIdx.bytes,
  `cold: /voice's critical path is ${(cVd.bytes / 1024).toFixed(0)} KB gzipped and /'s is ` +
  `${(cIdx.bytes / 1024).toFixed(0)} KB — the address exists to be the smaller one`);
ok(cVd.bytes * 8 < cIdx.bytes,
  `cold: /voice is only ${(cIdx.bytes / cVd.bytes).toFixed(1)}× cheaper than the front page. It was roughly ` +
  "twenty times when it shipped; a ratio this low means the homepage stack has been re-linked here");
console.log(`  /voice: ${(VD.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ` +
  `${localSrcs.length} local scripts, cold path ${(cVd.bytes / 1024).toFixed(0)} KB over ${cVd.files} files` +
  `  (/: ${(INDEX.length / 1024).toFixed(0)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} tags, ` +
  `cold path ${(cIdx.bytes / 1024).toFixed(0)} KB over ${cIdx.files} files)`);

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE ROOM IS THE WHOLE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("3 · one standing, one board host, no homepage, and nothing guessed");

// WHAT CAME. Two mount points and the honest first paint, and that is all this
// document is: voice-room.js decides the standing, district-voice.js renders the
// board.
[['id="pdx-voice-standing"', "the standing card"],
  ['id="pdx-voice-board"', "the board's host"],
  ['data-pdxvr-standing="checking"', "the quiet first standing, in the markup rather than after a paint"],
  ["Checking where you vote", "the checking line the module's own checkingHtml() produces"]].forEach(([n, what]) =>
  has(VD_MARKUP, n, `came: ${what} did not come with the room`));
// THE FIRST PAINT IS THE MODULE'S OWN, BYTE FOR BYTE. The point of putting it in
// the document is that arrival is immediate and there is no flash of a wrong
// answer; the point of taking it out of voice-room.js is that there is one copy
// of the sentence.
{
  const card = (/<div class="pdxvr-card pdxvr-card--wait" aria-live="polite">[\s\S]*?<\/div>/.exec(VD_MARKUP) || [""])[0];
  ok(card.length > 60, "came: the checking card is not in the markup, so the first paint is whatever the resolver does");
  has(CODE, "pdxvr-card--wait", "came: voice-room.js no longer produces the same card, so a repaint would change the arrival");
}
eq((VD_BARE.match(/<h1/g) || []).length, 1, "came: the document does not have exactly one h1");
has(VD_BARE, "District Voice", "came: the document does not name the room");
// THE NOSCRIPT NOTE, WHICH IS ALSO THE TWO WALLS IN PLAIN ENGLISH.
{
  const ns = (/<noscript>[\s\S]*?<\/noscript>/.exec(VD_MARKUP.slice(VD_MARKUP.indexOf("<body"))) || [""])[0];
  ok(ns.length > 100, "noscript: a reader with no JavaScript is told nothing at all");
  has(ns, "/#who-represents-me", "noscript: the note does not point at a door that can place the reader");
  has(ns, "/ballot", "noscript: the note does not point at the location setter");
}

// WHAT DID NOT COME. The front page's surfaces, by the ids their own tests pin
// them by.
[['id="hero"', "the homepage hero"],
  ['id="who-represents-me"', "the Who Represents Me card"],
  ['id="pdx-door1-workspace"', "Door 1's work layer"],
  ['id="pdx-d1-body"', "Door 1's body"],
  ['id="voter-hub"', "the ballot workspace"],
  ['id="agenda"', "the Mandate, which is its own address"],
  ['id="follow-the-money"', "the money lane, which is its own address"],
  ['id="judicial-lane"', "the courts lane, which is its own address"],
  ["<template", "an inert template — the Evidence Locker's is the big one and it is not here"],
  ["el-workspace-tpl", "the Evidence Locker workspace template"],
  ["ms-shell-tpl", "the my-stances shell template"]].forEach(([n, what]) =>
  lacks(VD_BARE, n, `walls: ${what} is on this document — that is the front page wearing a new URL`));

// THE DENYLIST, AND IT IS THE POINT OF THE PAGE. Two halves: no claim about a
// person's record, and no guess about the reader.
["Direction Match", "Word vs Action", "Republican", "Democrat", "0–100", "0-100",
  "PRIMARY", "Your Match"].forEach((w) =>
  lacks(VD_BARE, w, `denylist: "${w}" is printed on District Voice — neighbours' takes are not a verdict on a member`));
["Utah", "UT-", "ut-statehouse", "Salt Lake"].forEach((w) =>
  lacks(VD_BARE, w, `denylist: "${w}" is in this document's markup — Utah is where the first board happens to be ` +
    "open, not a guess we make about a stranger who has saved no location"));
// AND IN THE MODULE, WHICH IS WHERE A DEFAULT WOULD ACTUALLY LIVE.
["Utah", "ut-statehouse", "SEAT_KEY_RE", "VOICE_SEATS"].forEach((w) =>
  lacks(CODE, w, `denylist: voice-room.js contains "${w}" — the seat allow-list and the seat-key shape have one ` +
    "owner, district-voice.js, and a second copy here is a second answer"));
lacks(CODE, (/frame: '([^']+)'/.exec(DV) || [, "___no-frame___"])[1],
  "denylist: voice-room.js restates district-voice.js's frame sentence instead of borrowing COPY.frame");
has(CODE, "V.COPY", "denylist: the frame sentence is no longer borrowed from the module that owns it");
["how the member voted", "not a poll of the internet"].forEach((w) =>
  ok(VD.toLowerCase().indexOf(w) >= 0,
    `wall: the document no longer says "${w}" — those two sentences are what separate a neighbours' board from a poll`));

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE FIVE STANDINGS
// ═════════════════════════════════════════════════════════════════════════════
section("4 · five standings, one decider, and unknown is never painted as empty");

// THE GRACE IS THE CHIP'S GRACE, DELIBERATELY THE SAME NUMBER. Two quiet
// "asking" states on one document that expired at different times would read as
// a bug, so the number is read out of both files rather than typed here.
const GRACE = Number((/var GRACE_MS = (\d+);/.exec(VR) || [, "0"])[1]);
const UNKNOWN = Number((/var UNKNOWN_MS = (\d+);/.exec(CHIP) || [, "0"])[1]);
ok(GRACE > 0, "grace: voice-room.js no longer declares GRACE_MS as one literal");
eq(GRACE, UNKNOWN,
  "grace: voice-room.js's GRACE_MS and shell-account-chip.js's UNKNOWN_MS disagree — one document, two quiet " +
  "states, and they must stop being quiet at the same moment");

const FRAME = "FRAME SENTENCE OWNED BY DISTRICT-VOICE.JS";
function room(opts) {
  const o = opts || {};
  const w = makeSandbox();
  let now = 1000000;
  w.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-board": mk("pdx-voice-board") };
  w.document.getElementById = (id) => (o.noMounts ? null : (els[id] || null));
  w.document.readyState = "complete";
  const timers = [];
  w.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const mounts = [];
  if (!o.noModule) {
    w.PDXVoice = Object.assign({
      seatForMe: () => o.seat || "",
      claim: () => o.claim || {},
      shipped: () => !!o.open,
      path: (s) => (o.open ? "/d/" + s : ""),
      mount: (seat, host) => { mounts.push({ seat, host }); return o.mountFails ? false : true; },
      COPY: { frame: FRAME },
    }, o.api || {});
  }
  if (o.hook) w._vhBallotRerender = o.hook;
  const ctx = vm.createContext(w);
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  return {
    w, els, mounts, timers,
    advance(ms) { now += ms; },
    standing: () => w.PDXVoiceRoom.standing(),
    decide: () => w.PDXVoiceRoom.decide(),
    paint: () => w.PDXVoiceRoom.paint(),
    card: () => els["pdx-voice-standing"].innerHTML,
    attr: () => els["pdx-voice-standing"].getAttribute("data-pdxvr-standing"),
  };
}

// THE EXPORT EXISTS, or nothing below can be asserted without reading the DOM.
{
  let r = null;
  try { r = room({}); } catch (e) { failures.push(`standings: voice-room.js throws on a bare document — ${e.message}`); }
  must(!!r, "voice-room.js did not boot in the sandbox");
  ["STANDING_ID", "BOARD_ID", "GRACE_MS", "decide", "paint", "standing", "seated"].forEach((k) =>
    ok(r.w.PDXVoiceRoom && r.w.PDXVoiceRoom[k] !== undefined, `standings: PDXVoiceRoom.${k} is not exported`));
}

// 1 · BOOT — the module is missing. A load failure said as a load failure, and
// HELD as checking until the grace closes, because before then it is not even a
// load failure: it is a deferred file that has not landed.
{
  const r = room({ noModule: true });
  eq(r.decide().standing, "boot", "boot: a document with no district-voice.js does not decide 'boot'");
  eq(r.standing(), "checking", "boot: a missing module is painted immediately instead of waiting out the grace");
  r.advance(GRACE + 1);
  eq(r.paint(), "boot", "boot: after the grace the standing is still not 'boot'");
  has(r.card(), "did not load", "boot: the card does not say the module failed to load");
  lacks(r.card(), "no district", "boot: a load failure is being reported as the reader having no district");
}

// 2 · UNPLACED — no saved location. Points at the two doors that SET one, names
// no state, and is held as checking until the grace closes.
{
  const r = room({ seat: "", claim: {} });
  eq(r.decide().standing, "unplaced", "unplaced: an empty claim does not decide 'unplaced'");
  eq(r.standing(), "checking", "unplaced: 'we do not know where you vote' is painted before the resolver has had its window");
  has(r.card(), "Checking where you vote", "unplaced: the held paint is not the checking card");
  r.advance(GRACE + 1);
  eq(r.paint(), "unplaced", "unplaced: the standing never resolves after the grace");
  eq(r.attr(), "unplaced", "unplaced: the host's data-pdxvr-standing was not updated");
  has(r.card(), "/#who-represents-me", "unplaced: the card does not point at Who Represents Me");
  has(r.card(), "/ballot", "unplaced: the card does not point at the location setter on Your Ballot");
  has(r.card(), FRAME, "unplaced: the borrowed frame sentence is not printed");
  ["Utah", "District 68", "ut-"].forEach((w) =>
    lacks(r.card(), w, `unplaced: the card names "${w}" for a reader who has saved nothing`));
  eq(r.mounts.length, 0, "unplaced: a board was mounted for a reader with no seat");
}

// 3 · NOLANE — a location we can read, in a state with no lane. NOT held: it
// rests on a claim the resolver has already produced. And it names no district,
// because the claim did not normalise to a seat key.
{
  const r = room({ seat: "", claim: { state: "TX", county: "Travis", houseDistrict: "46" } });
  eq(r.decide().standing, "nolane", "nolane: a readable claim in an uncovered state does not decide 'nolane'");
  eq(r.standing(), "nolane", "nolane: the standing was held behind the grace — the location is already known");
  has(r.card(), "No board where you vote yet", "nolane: the card does not say there is no board yet");
  ["Travis", "46", "TX"].forEach((w) =>
    lacks(r.card(), w, `nolane: the card prints "${w}" — the claim did not normalise to a seat, so any seat named ` +
      "here is this file inventing a shape district-voice.js declined to give"));
  eq(r.mounts.length, 0, "nolane: a board was mounted in a state with no lane");
}

// 4 · NOTLIVE — a real seat, no board open in it. "Board not live yet" is a true
// sentence and it stays. The name is the reader's own two saved fields or there
// is no name.
{
  const r = room({ seat: "ut-statehouse-68", claim: { state: "UT", county: "Utah County", houseDistrict: "68" }, open: false });
  eq(r.decide().standing, "notlive", "notlive: a real seat with no board does not decide 'notlive'");
  eq(r.standing(), "notlive", "notlive: the standing was held behind the grace — the seat is already known");
  has(r.card(), "Board not live yet", "notlive: the shipped sentence is gone");
  has(r.card(), "State House District 68 · Utah County",
    "notlive: the district is not named out of the two fields the reader saved");
  eq(r.mounts.length, 0, "notlive: a board was mounted in a seat that has none");
  // AND WITH ONE FIELD MISSING THERE IS NO NAME AT ALL.
  const half = room({ seat: "ut-statehouse-68", claim: { state: "UT", houseDistrict: "68" }, open: false });
  eq(half.decide().name, "", "notlive: a district was named from a house number with no county");
  lacks(half.card(), "District 68", "notlive: a half-saved location was printed as a district anyway");
}

// 5 · OPEN — the board is open in this reader's seat, and district-voice.js owns
// every pixel of it from there.
{
  const r = room({ seat: "ut-statehouse-68", claim: { state: "UT", county: "Utah County", houseDistrict: "68" }, open: true });
  eq(r.decide().standing, "open", "open: a seat with a board does not decide 'open'");
  eq(r.standing(), "open", "open: the standing was held behind the grace");
  eq(r.mounts.length, 1, "open: district-voice.js's mount() was not called exactly once");
  eq(r.mounts[0] && r.mounts[0].seat, "ut-statehouse-68", "open: the board was mounted for the wrong seat");
  eq(r.mounts[0] && r.mounts[0].host, "pdx-voice-board", "open: the board was mounted into the wrong host");
  eq(r.w.PDXVoiceRoom.seated(), "ut-statehouse-68", "open: the mounted seat is not recorded");
  // THE FRAME IS NOT PRINTED TWICE. district-voice.js's render() prints it above
  // the board's own blocks; a second copy on one screen is the drift this
  // codebase fences against.
  lacks(r.card(), FRAME, "open: the standing prints the frame sentence that the board is about to print");
  // MOUNTED ONCE PER SEAT. paint() may run many times on one visit — a remount
  // would tear down a poll answer or a half-typed take.
  r.paint(); r.paint(); r.advance(9000); r.paint();
  eq(r.mounts.length, 1, `open: the board was mounted ${r.mounts.length} times — a remount tears down a half-typed take`);
  // AND THE SCHEDULED TICKS STOP once the board is up.
  r.timers.forEach((t) => { try { t.fn(); } catch (e) {} });
  eq(r.mounts.length, 1, "open: a scheduled tick remounted the board after it was already up");
}

// A MISSING HOST PAINTS NOTHING AND THROWS NOTHING. Every early return lands on
// a weaker standing; none of them may take the page down.
{
  let r = null;
  try { r = room({ noMounts: true, seat: "ut-statehouse-68", claim: { state: "UT" }, open: true }); }
  catch (e) { failures.push(`soft: voice-room.js throws when its mount points are absent — ${e.message}`); }
  if (r) { passed++; eq(r.mounts.length, 0, "soft: a board was mounted with no host element"); }
}

// THE REPAINT HOOK, CLAIMED HERE AND GUARDED. voter-hub-location.js calls
// _vhBallotRerender() when the saved location resolves; unclaimed, the resolver
// lands and nothing on the page notices.
{
  const r = room({});
  eq(typeof r.w._vhBallotRerender, "function",
    "hook: window._vhBallotRerender is not claimed — the location resolver would land and the standing would never change");
  const prior = () => "kept";
  const g = room({ hook: prior });
  eq(g.w._vhBallotRerender, prior,
    "hook: voice-room.js overwrites an existing _vhBallotRerender — a future owner on this document would be " +
    "silently replaced");
}
// THE TICKS ARE A BOUNDED SCHEDULE, NOT A POLL, and the last one sits past the
// grace so the quiet state is always replaced by a real one.
{
  const r = room({});
  ok(r.timers.length > 0 && r.timers.length <= 8,
    `ticks: voice-room.js scheduled ${r.timers.length} timers — a bounded schedule is six ticks, a poll is not bounded`);
  ok(Math.max(...r.timers.map((t) => t.ms)) > GRACE,
    "ticks: the last tick lands inside the grace window, so 'checking' could be the final paint a reader ever sees");
  lacks(CODE, "setInterval", "ticks: voice-room.js polls on an interval");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE DOORS
// ═════════════════════════════════════════════════════════════════════════════
section("5 · every door points at the address, and the old hash lands in the room");

// /me's CTA. me-desk.js asks district-voice.js the same gate it always did —
// path(seat) — and only the destination moved: /d/<seat-key> was the district
// file, which is a rewrite to index.html, so the reader who tapped "Open
// District Voice" paid the front page to reach a board that is now 28 KB.
{
  const MD = R("me-desk.js");
  has(MD, "out.href = open ? '/voice' : ''",
    "door: me-desk.js's voice CTA no longer points at /voice");
  eq((MD.match(/'\/d\/' \+ seat/g) || []).length, 0,
    "door: me-desk.js still builds a /d/<seat-key> href for the Voice CTA — that is the front page again");
  has(MD, "V.path", "door: the gate is no longer district-voice.js's path(seat) — an empty path must still mean no CTA");
}
// THE FRONT PAGE'S FORWARD, IN <head>, BEFORE ANYTHING PAINTS.
const FWD = /var LANE = \{[\s\S]*?\};/.exec(INDEX);
must(!!FWD, "index.html no longer declares the LANE hash-forward table");
["'district-voice': '/voice'", "'voice': '/voice'"].forEach((n) =>
  has(FWD[0], n, `forward: ${n} is not in the table — that bookmark lands on the front page`));
ok(INDEX.indexOf("var LANE = {") < INDEX.indexOf("</head>"),
  "forward: the forward is not in <head> — a reader would parse two megabytes before being sent one document over");
ok(/location\.replace\(/.test(INDEX.slice(INDEX.indexOf("var LANE = {"), INDEX.indexOf("var LANE = {") + 2000)),
  "forward: the forward uses assign() rather than replace(), so Back returns to the hash and forwards again");
// THE TWO SHELLS THAT ROUTE HASHES route this one too.
["stances.html", "evidence.html"].forEach((f) => {
  const src = R(f);
  has(src, "'district-voice': '/voice'", `${f}: #district-voice is not routed to the room`);
  has(src, "var HASH_ROOM", `${f}: the room table is gone — every hash would be sent to the front page`);
});
// THE NAV ROW IS THE SAME ROW ON ALL THREE SIDE-LANE SHELLS, so the row is a
// fixed place rather than a per-page guess.
["mandate.html", "voice.html", "money.html"].forEach((f) => {
  const src = R(f);
  ["/mandate", "/voice", "/money", "/ballot", "/#who-represents-me", "/#say-vs-do"].forEach((p) =>
    has(src, `href="${p}"`, `nav: ${f} does not carry the shared destination ${p}`));
  has(src, 'id="pdx-shell-acct"', `nav: ${f} has no account slot`);
});
has(VD, 'href="/voice" aria-current="page"',
  "nav: /voice does not mark itself current — and it must still navigate, because a self-link that does nothing lies");
// THE FRONT PAGE'S OWN MENUS POINT AT THE ADDRESS, not at a fragment that now
// names nothing on it.
{
  const IDX_BARE = htmlBare(INDEX);
  ok((IDX_BARE.match(/href="\/voice"/g) || []).length >= 2,
    "door: the front page's menus no longer link District Voice at its own address");
  eq((IDX_BARE.match(/href="#district-voice"/g) || []).length, 0,
    "door: a control on the front page still points at #district-voice, which names nothing there");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the room is precached with its resolver and its sheet");

const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER), `sw: CACHE_VERSION does not read as one version literal (got "${VER}")`);
ok(Number(VER.slice(1)) >= 211,
  `sw: CACHE_VERSION is ${VER} — three new documents shipped in this pass, and a warm device keeps serving the ` +
  "old front page without a rename");
has(SW, "voice.html", "sw: the version log has no entry naming the new shell");

const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL, "sw.js no longer declares SHELL_ASSETS as one literal array");
["/voice.html", "/voice-room.js", "/district-voice.js", "/district-voice.css", "/shell-chrome.css", "/shell-account-chip.js"]
  .forEach((a) => has(SHELL, `'${a}'`, `sw: ${a} is not precached — the room would open with no resolver, or unstyled`));
lacks(SHELL, "'/ballot-breakdown.js'",
  "sw: ballot-breakdown.js was added to the precache — 407 KB of ballot machinery is not what a reader came to /voice for");

// THE NAV MATCH IS THE TWO PATHS netlify.toml DECLARES, AND NOTHING ELSE. /d/*
// is in the list of paths that must NOT match: the seat file is a different
// arrival and it is still answered by the front page's document.
const NAV = (/const VOICE_NAV_RE = (\/[^\n;]+\/);/.exec(SW) || [, ""])[1];
ok(!!NAV, "sw: VOICE_NAV_RE is not one literal");
if (NAV) {
  const re = new RegExp(NAV.slice(1, NAV.lastIndexOf("/")));
  ["/voice", "/voice/"].forEach((p) => ok(re.test(p), `sw: ${p} is not recognised as the Voice room`));
  ["/voices", "/voice/ut-statehouse-68", "/voice.html.bak", "/d/ut-statehouse-68", "/me", "/money", "/mandate", "/"]
    .forEach((p) => ok(!re.test(p), `sw: ${p} is served the Voice document`));
}
// THE OFFLINE FALLBACK, declared before the '/' branch — otherwise a cold
// offline /voice is answered with the front page, which never held this room.
{
  const vAt = SW.indexOf("shell.match('/voice.html')");
  const homeAt = SW.indexOf("shell.match('/index.html')");
  ok(vAt > 0, "sw: there is no offline branch for /voice");
  ok(homeAt < 0 || vAt < homeAt, "sw: the '/' offline branch is declared before /voice's, and would answer first");
}

// ═════════════════════════════════════════════════════════════════════════════
function report() {
  console.log(
    `\n${failures.length ? "✗" : "✓"} voice shell: ${passed} checks passed` +
    (failures.length ? `, ${failures.length} failed` : "")
  );
  if (failures.length) {
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}
report();
