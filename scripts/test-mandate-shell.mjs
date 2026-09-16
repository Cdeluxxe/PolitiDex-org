#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for mandate.html — THE TENTH SHELL, and the People's Mandate at an
// address
// ─────────────────────────────────────────────────────────────────────────────
// The People's Mandate was 174 KB of a two-megabyte document: a 112 KB section,
// an 8 KB submit modal and five inline <script> blocks. Every reader of the
// front page — including every reader who arrived to answer "who represents me"
// and nothing else — downloaded and parsed all of it, and every reader who
// actually wanted the Mandate had no address to bookmark, nothing to send and
// nothing that survived a reload. #agenda was a scroll position, not a place.
//
// So the room moved to /mandate and one short door card stayed behind. The five
// script blocks became mandate-lane.js, which BOTH documents load — the room
// for the lane, the front page for the one hook a person overlay still calls.
//
// The failure modes, each of which ships looking fine:
//
//   1. /mandate RESOLVES TO THE FRONT PAGE, or the trailing-slash form hops
//      instead of answering — two spellings of one room disagreeing.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /mandate/ is served 200, so a
//      bare src="mandate-lane.js" resolves to /mandate/mandate-lane.js, the
//      rewrite answers with this document, and the browser is told to parse
//      HTML as JavaScript with no error naming the cause.
//   3. A PATH SNIFF REPLACES THE FLAG. /mandate, /mandate/ and a preview
//      server's /mandate.html are three spellings a pathname test gets
//      differently.
//   4. THE SPLIT IS UNDONE ONE <script> AT A TIME. The whole point of the
//      address is what it does NOT load: app.css, compare-hub.js,
//      ballot-breakdown.js, evidence-locker.js. A budget going red is the
//      2 MB parse coming back.
//   5. THE HOMEPAGE COMES WITH IT. A hero, the Who Represents Me card, Door 1's
//      work layer, the Evidence Locker template or the ballot workspace on this
//      document is the front page wearing a new URL.
//   6. AN INLINE HANDLER IS LEFT BEHIND. The copied markup addresses thirteen
//      functions by name in onclick attributes. A block that did not come out
//      of index.html with the others is a ReferenceError on a control, and
//      nothing on the page says so.
//   7. TWO OWNERS OF ONE TALLY. A copy of the lane's code inline on either
//      document is two answers to how many people are backing a reform.
//   8. THE LANE GROWS A CLAIM. A support count is momentum: not a score, not
//      Direction Match, not party, not finance. A colour, a rank, a sort or a
//      grade here turns a petition into a verdict.
//   9. A BOOKMARK LANDS ON A BLANK LAYER. #agenda used to be a scroll position;
//      after the split it names nothing, so the front page forwards it here in
//      one hop.
//  10. THE SERVICE WORKER GETS IT WRONG — a shell with no renderer, a stale
//      sheet against a new document, or '/' answered with this body.
//
// Six sections:
//
//   1. THE REWRITE — two exact 200s, no wildcard, nothing in front of them.
//   2. THE DOCUMENT — banner, canonical, root-absolute paths, the one flag,
//      the budgets, and the cold payload against the front page's.
//   3. THE LANE IS THE WHOLE DOCUMENT — what came, what did not, and the
//      denylist.
//   4. ONE OWNER OF THE LANE'S CODE — the module boots with no mounts, and
//      every inline handler resolves.
//   5. THE DOOR AND THE OLD ADDRESSES — the card that stayed, and the hashes.
//   6. THE SERVICE WORKER.
//
//   node scripts/test-mandate-shell.mjs
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

const MD = R("mandate.html");
const INDEX = R("index.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");
const LANE = R("mandate-lane.js");
const LCSS = R("mandate-lane.css");

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) => blank(b));
const scriptBare = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (b) => blank(b));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
// THE MARKUP, WITH NOTHING BUT MARKUP IN IT. This document's banner documents
// every wall it keeps ("No app.css", "No compare-hub.js", "NO DIRECTION MATCH")
// and its scripts contain the lane's own prose, so a substring test run over
// the raw file fails on the sentence that promises the thing it is looking for.
const MD_BARE = scriptBare(styleBare(htmlBare(MD)));
const MD_MARKUP = htmlBare(MD);   // comments out, scripts and styles kept
const CODE = jsBare(LANE);

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
section("1 · /mandate and /mandate/ are one room, declared twice and exactly");

// The same parser and the same three claims courts.html's harness makes, for
// the same reason: Netlify takes the FIRST matching rule.
const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const b = m[1];
  const g = (k) => ((new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*)"?`, "m")).exec(b) || [, ""])[1].trim();
  return { from: g("from"), to: g("to"), status: g("status"), force: g("force") };
});
ok(RULES.length > 10, `toml: the redirect table parsed (${RULES.length} rules)`);
const idxOf = (from) => RULES.findIndex((r) => r.from === from);

for (const path of ["/mandate", "/mandate/"]) {
  const i = idxOf(path);
  ok(i >= 0, `toml: ${path} has no rule of its own — the room is only reachable as a file`);
  if (i >= 0) {
    eq(RULES[i].to, "/mandate.html", `toml: ${path} does not serve the tenth shell`);
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
eq(RULES.filter((r) => /^\/mandate/.test(r.from) && r.from.indexOf("*") >= 0).length, 0,
  "toml: a /mandate wildcard exists — every path under it would answer with this document");
// NO CATCH-ALL ANYWHERE IN THE FILE. "SPA rewrite everything to index" is the
// one pattern that would silently make all six of the new paths the front page.
eq(RULES.filter((r) => r.from === "/*" && r.status === "200").length, 0,
  "toml: a /* → 200 catch-all is declared — every address in this file becomes the front page behind it");

// AND THE MANDATE DID NOT MOVE INTO /me. Your File is the account room; the
// Mandate is public and has its own address. Two rooms, two rules.
{
  const i = idxOf("/me");
  ok(i >= 0 && RULES[i].to === "/me.html",
    "toml: /me no longer serves me.html — the Mandate is not allowed to absorb the account room, or the reverse");
  ["/me", "/ballot", "/courts", "/evidence", "/stances"].forEach((p) => {
    const j = idxOf(p);
    ok(j < 0 || RULES[j].to !== "/mandate.html", `toml: ${p} was pointed at mandate.html`);
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
const bm = BRE.exec(MD.slice(0, 4096));
ok(bm && bm[1] === "mandate",
  "banner: mandate.html does not declare itself the tenth shell inside sw.js's own 4096-character sniff window");
has(MD, "/mandate IS ITS OWN DOCUMENT", "banner: the banner names the address it serves");
ok(!BRE.test(INDEX), "banner: index.html carries a shell banner — that is what makes the guard a discriminator");

// A PUBLIC BROWSE ROOM: indexable, canonical on the www host the apex 301s to.
has(MD, '<link rel="canonical" href="https://www.politidex.fyi/mandate" />',
  "head: the canonical is www.politidex.fyi/mandate");
has(MD, '<meta property="og:url" content="https://www.politidex.fyi/mandate" />',
  "head: og:url matches the canonical");
lacks(MD_MARKUP, 'name="robots"', "head: no robots meta — a public room the whole point of which is to be linked is indexed");
// THE SITEMAP IS NOT ASSERTED HERE, DELIBERATELY. Advertising the three new
// addresses is its own pass (sitemap.xml, gen-sitemap.mjs, robots.txt and the
// canonicals are one system with one test), and this file pins nothing about
// it in either direction so that pass can land without editing this one.

// EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE. Served at /mandate/, a bare src is
// answered with this document and parsed as JavaScript.
const attrs = [...MD_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in mandate.html is root-absolute (offenders: ${relative.join(", ")})`);

// READ OUT OF THE COMMENT-STRIPPED DOCUMENT. This shell's banner explains what
// it is by quoting what it replaced — "five inline <script> blocks totalling
// 62 KB" — and a tag scan over the raw file hands that English sentence to the
// JavaScript parser.
const TAGS = [...MD_MARKUP.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inline = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
const parseFails = [];
for (const b of inline) { try { new vm.Script(b.body); } catch (e) { parseFails.push(e.message); } }
eq(parseFails.length, 0, `paths: every inline <script> block in mandate.html parses (${parseFails[0] || ""})`);

// ONE FLAG, NO HEURISTICS, AND IT IS FIRST.
const flagIdx = MD.indexOf("window.__PDX_MANDATE_DOC = true");
ok(flagIdx > 0, "flag: mandate.html does not set __PDX_MANDATE_DOC at all");
const firstSrc = MD_MARKUP.search(/<script\b[^>]*\bsrc=/);
ok(flagIdx < firstSrc, "flag: a script with a src is loaded before the flag is set");
eq((MD.match(/__PDX_MANDATE_DOC\s*=/g) || []).length, 1,
  "flag: the flag is assigned more than once on this document — one owner, one assignment");
lacks(CODE, "location.pathname",
  "flag: mandate-lane.js sniffs location.pathname — /mandate, /mandate/ and /mandate.html are three spellings " +
  "of one document that a path test gets differently");

// THE AUTH STUB IS THE ONE THE OTHER INNER SHELLS SHIP, NOT A THIRD ONE. The
// block is declared as a verbatim copy of me.html's, and the declaration is
// checked here by BYTES: the named lines are sliced out of me.html and must
// appear in this document unchanged. voice.html and money.html carry the same
// copy and their harnesses run the identical fence.
//
// THESE LINE NUMBERS MOVE. When me.html changes above line 1809 the range in all
// three new shells must be RE-DERIVED — locate the run in me.html, do not
// recompute it by arithmetic. test-person-shell.mjs states the same rule for the
// seven copies it fences, and this pass had to re-derive every one of them.
{
  const a = 1809, b = 1864;
  const ME = R("me.html");
  const slice = ME.split("\n").slice(a - 1, b).join("\n");
  has(MD, `COPIED VERBATIM FROM me.html LINES ${a}\u2013${b}`,
    "auth: mandate.html does not declare which lines of me.html its Firebase block is");
  ok(MD.indexOf(slice) > 0,
    `auth: me.html lines ${a}\u2013${b} are not present in mandate.html byte for byte — either the copy drifted or ` +
    "the declared range is stale. Re-derive the range from me.html, do not adjust the number by hand");
  has(slice, "window.PDXAuth", "auth: the sliced range is not the PDXAuth block — the declared range names the wrong lines");
  has(slice, "queue", "auth: the sliced range does not contain the deferred queue");
}
// AND THE CHIP'S CONTRACT: unknown is not signed-out, so the Join CTA cannot be
// the first paint. The markup ships the unknown signature and nothing else.
has(MD, '<div id="pdx-shell-acct" data-pdx-acct-sig="unknown"></div>',
  "auth: the account slot is not empty-with-unknown — a Join CTA in the markup is a returning member told to sign up");
lacks(MD_BARE, "Join", "auth: the word Join is in this document's markup — the chip paints that, and only after auth answers");
has(MD_MARKUP, '<script defer src="/shell-account-chip.js"></script>',
  "auth: the chip is not loaded, so the account slot would stay empty forever");

// THE BUDGETS. Tripwires, not targets: this document is chrome, the lane's
// markup and four scripts, and a budget going red is the split being undone one
// <script> at a time.
const gz = gzipSync(Buffer.from(MD, "utf8")).length;
ok(gz < 32 * 1024, `budget: mandate.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 32 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 8, `budget: mandate.html loads ${localSrcs.length} local scripts (ceiling 8)`);
ok(localSrcs.every((s) => s.charAt(0) === "/"), "budget: every local script src is root-absolute");
// THE FOUR FILES THIS ADDRESS EXISTS TO NOT LOAD.
[["/app.css", "986 KB of homepage cascade for one lane"],
  ["compare-hub.js", "758 KB of homepage engine — the chip is shell-account-chip.js"],
  ["ballot-breakdown.js", "407 KB of ballot machinery, and nothing here is a ballot"],
  ["evidence-locker.js", "310 KB of locker, and the Evidence Locker is its own address"]]
  .forEach(([f, why]) => lacks(MD_MARKUP, f, `budget: ${f} is on this document — ${why}`));

// THE COLD PAYLOAD, WHICH IS THE WHOLE POINT. Measured the way
// test-ballot-shell.mjs measures it — gzipped document, script-tag count, raw
// bytes — and then extended to the critical path: the document plus every local
// script and stylesheet a cold browser must fetch before the room is usable.
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
ok(gz < idxGz && TAGS.length < idxTags && MD.length < INDEX.length,
  "cold: mandate.html is not smaller than index.html by every measure");
const cMd = cold(MD);
const cIdx = cold(INDEX);
ok(cMd.bytes < cIdx.bytes,
  `cold: /mandate's critical path is ${(cMd.bytes / 1024).toFixed(0)} KB gzipped and /'s is ` +
  `${(cIdx.bytes / 1024).toFixed(0)} KB — the address exists to be the smaller one`);
ok(cMd.bytes * 4 < cIdx.bytes,
  `cold: /mandate is only ${(cIdx.bytes / cMd.bytes).toFixed(1)}× cheaper than the front page. The split was ` +
  "worth roughly forty times when it shipped; a ratio this low means the homepage stack has been re-linked here");
console.log(`  /mandate: ${(MD.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ` +
  `${localSrcs.length} local scripts, cold path ${(cMd.bytes / 1024).toFixed(0)} KB over ${cMd.files} files` +
  `  (/: ${(INDEX.length / 1024).toFixed(0)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} tags, ` +
  `cold path ${(cIdx.bytes / 1024).toFixed(0)} KB over ${cIdx.files} files)`);

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE LANE IS THE WHOLE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("3 · one lane came, the homepage did not, and nothing here is a score");

// WHAT CAME. The board, the counts, the named items, the controls that already
// existed, and the submit modal — because a page that can show a reform and not
// let a reader add one is the door without the room.
[['<section id="agenda"', "the Mandate section itself"],
  ['id="agenda-grid"', "the reform board"],
  ['id="peoples-proposals"', "the proposals engine's own block"],
  ['id="pp-grid"', "the proposals mount"],
  ['id="agenda-submit-overlay"', "the submit modal"],
  ['id="rh-filter-bar"', "the reform hub's filters"],
  ['id="mandate-jump"', "the quick-jump map"]].forEach(([n, what]) =>
  has(MD_MARKUP, n, `came: ${what} did not come with the room`));
// ONE h1, AND IT IS THE ROOM'S NAME. On the front page this was an <h2> among
// twenty sections; here it is the document.
eq((MD_BARE.match(/<h1/g) || []).length, 1, "came: the document does not have exactly one h1");
has(MD_BARE, "THE PEOPLE'S MANDATE", "came: the h1 is not the room's own name");
// THE EMPTY STATES ARE THE SHIPPED ONES, not a zero dressed as a finding.
['id="pp-empty"', 'id="rh-empty"', 'id="pp-error"'].forEach((n) =>
  has(MD_MARKUP, n, `empty: ${n} is gone — an empty board would print nothing at all`));

// WHAT DID NOT COME. Five surfaces of the front page, by the ids their own
// tests pin them by.
[['id="hero"', "the homepage hero"],
  ['id="who-represents-me"', "the Who Represents Me card"],
  ['id="pdx-door1-workspace"', "Door 1's work layer"],
  ['id="pdx-d1-body"', "Door 1's body"],
  ['id="voter-hub"', "the ballot workspace"],
  ['id="follow-the-money"', "the money lane, which is its own address"],
  ['id="judicial-lane"', "the courts lane, which is its own address"],
  ["<template", "an inert template — the Evidence Locker's is the big one and it is not here"],
  ["el-workspace-tpl", "the Evidence Locker workspace template"],
  ["ms-shell-tpl", "the my-stances shell template"]].forEach(([n, what]) =>
  lacks(MD_BARE, n, `walls: ${what} is on this document — that is the front page wearing a new URL`));

// THE DENYLIST. A support count is momentum. Every word below is a claim about
// a person's record, and this page holds no person's record.
["Direction Match", "Word vs Action", "Republican", "Democrat", "0–100", "0-100",
  "PRIMARY", "Your Match"].forEach((w) =>
  lacks(MD_BARE, w, `denylist: "${w}" is printed on the Mandate — a petition is not a verdict`));
ok(!/\b(?:agenda|mandate|pp|rh)-(?:score|grade|rating|tier|rank)\b/.test(MD_BARE),
  "denylist: a score-shaped element is on the board");
// AND THE SENTENCE THAT MAKES THE ABOVE A RULE RATHER THAN A CURRENT STATE.
has(MD_BARE, "Momentum, not evidence",
  "denylist: the sentence separating a support count from a record is gone — it is the reason the words above " +
  "are allowed nowhere on this page");
has(MD_BARE, "feed no score", "denylist: the page no longer says the counts feed no score");
// NO SORT BY SUPPORT. The hub sorts by the fields it always did; a dollars- or
// backing-ranked board is a league table.
ok(!/<option[^>]*value="(?:support|backing|momentum)-desc"/.test(MD_BARE),
  "denylist: the board can be sorted by how much support an item has, which is a ranking of people's asks");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · ONE OWNER OF THE LANE'S CODE
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the lane's code has one owner, and every inline handler resolves");

// NOT INLINE ON EITHER DOCUMENT. index.html keeps the door card and the bridge;
// the lane's own functions live in exactly one file.
// Two spellings, both of which the extraction preserved: the four top-level
// declarations the copied markup calls by name, and the one the proposals engine
// publishes onto window from inside its own closure.
["function handleAgendaVote", "function openAgendaSubmit", "function submitAgendaIdea",
  "function filterAgenda", "window.setProposalSort = function"].forEach((n) => {
  eq((INDEX.match(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 0,
    `owner: ${n} is inline on index.html again — two copies of one tally is the drift the address ended`);
  eq((LANE.match(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1,
    `owner: ${n} is not declared exactly once in mandate-lane.js`);
});
// THE MODULE BOOTS WITH NO MOUNTS AND PAINTS NOTHING. This is the courts.html
// contract, and it is what lets index.html load this file for one hook without
// the front page growing a second Mandate.
function laneWin(opts) {
  const w = makeSandbox();
  if (opts && opts.doc) w.__PDX_MANDATE_DOC = true;
  const writes = [];
  w.document.getElementById = () => null;
  w.document.querySelector = () => null;
  w.document.querySelectorAll = () => [];
  w.document.body = { appendChild(n) { writes.push(n); }, addEventListener() {}, classList: { add() {}, remove() {} }, style: {} };
  const ctx = vm.createContext(w);
  vm.runInContext(LANE, ctx, { filename: "mandate-lane.js" });
  return { w, writes };
}
let boot = null;
try { boot = laneWin({ doc: false }); } catch (e) { failures.push(`mounts: mandate-lane.js throws on a document with no lane markup — ${e.message}`); }
if (boot) {
  passed++;
  eq(boot.writes.length, 0, "mounts: the lane appended something to a document that has no Mandate on it");
  // EVERY INLINE HANDLER THE COPIED MARKUP ADDRESSES IS A FUNCTION THIS MODULE
  // PUBLISHES. Thirteen names, read out of the document's own onclick
  // attributes rather than listed here, so a block left behind in the
  // extraction fails on this line instead of throwing at a reader's click.
  const names = new Set();
  for (const m of MD_BARE.matchAll(/on(?:click|input|change|submit|keydown)="([^"]*)"/g)) {
    for (const f of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) names.add(f[1]);
  }
  names.delete("if");
  ok(names.size >= 10, `handlers: only ${names.size} inline handlers found — the parse is wrong, not the document`);
  const missing = [...names].filter((n) => typeof boot.w[n] !== "function");
  eq(missing.length, 0,
    `handlers: the document addresses ${missing.join(", ")} and mandate-lane.js does not publish it — a control ` +
    "that throws a ReferenceError looks exactly like a control that does nothing");
  // AND THE ONE HOOK index.html LOADS THIS FILE FOR.
  eq(typeof boot.w._pdxLoadRelatedProposals, "function",
    "hook: window._pdxLoadRelatedProposals is gone — profiles-full.js calls it for a person overlay's related " +
    "proposals, and it is the only reason the front page loads this file");
}
// THE SUPPORT WALL IS BORROWED, NOT RESTATED. support-lane.js owns the
// vocabulary, the palette and the NEVER_FEEDS list.
has(CODE, "window.PDXSupportLane", "wall: the lane no longer asks support-lane.js for the shipped vocabulary");
eq((CODE.match(/NEVER_FEEDS/g) || []).length, 0,
  "wall: mandate-lane.js restates the NEVER_FEEDS list — two copies of a wall is two walls, and they drift");
lacks(CODE, "fec.gov", "wall: the Mandate fetches finance data");
lacks(CODE, "Direction Match", "wall: the lane names Direction Match, which no support count may reach");

// THE SHEET IS THE LANE'S OWN, and it is a subset of what the front page
// already shipped: this is a MOVE, not a redesign.
const LC = cssBare(LCSS);
const APP = cssBare(R("app.css"));
{
  const sels = [...LC.matchAll(/^\s*(\.[a-z][\w-]*)[^{]*\{/gm)].map((m) => m[1]);
  const own = [...new Set(sels)].filter((s) => /^\.(?:mandate|agenda|rh|pp|mj)-/.test(s));
  ok(own.length > 20, `css: only ${own.length} of the lane's own classes are in mandate-lane.css`);
  const invented = own.filter((s) => APP.indexOf(s) < 0 && MD_BARE.indexOf(s.slice(1)) < 0);
  eq(invented.length, 0,
    `css: mandate-lane.css declares classes that are in neither app.css nor this document (${invented.slice(0, 5).join(", ")}) ` +
    "— the sheet was extracted from the front page, not written fresh");
}
has(MD, '<link rel="stylesheet" href="/mandate-lane.css" />', "css: the document does not load the lane's sheet");

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE DOOR AND THE OLD ADDRESSES
// ═════════════════════════════════════════════════════════════════════════════
section("5 · the front page keeps a door, and every old hash lands in the room");

// THE DOOR CARD. It keeps id="agenda" — four other tests and the All-Seeing
// Eye's navigate arm address the Mandate by that id — and it prints no count,
// because a count on the front page is a Firestore read the door does not need.
const door = /<section id="agenda"[\s\S]*?<\/section>/.exec(htmlBare(INDEX));
ok(!!door, "door: index.html no longer has a section with id=\"agenda\"");
if (door) {
  has(door[0], 'href="/mandate"', "door: the card does not link to the room");
  has(door[0], "THE PEOPLE'S", "door: the card does not name the Mandate");
  ok(door[0].length < 3000,
    `door: the card is ${door[0].length} characters — it is a door, and anything this size is the room again`);
  lacks(door[0], "agenda-card", "door: a reform card is being printed on the front page");
  lacks(door[0], "agenda-grid", "door: the board came back to the front page");
}
// NO CONTROL ON THE FRONT PAGE STILL POINTS AT THE FRAGMENT, and nothing calls
// the modal that now lives in another document.
const IDX_BARE = htmlBare(INDEX);
eq((IDX_BARE.match(/href="#agenda"/g) || []).length, 0,
  "hashes: a control on the front page still points at #agenda, which is now a door card rather than the room");
eq((IDX_BARE.match(/openAgendaSubmit\(/g) || []).length, 0,
  "hashes: index.html still calls openAgendaSubmit() — the modal is on /mandate, so this is a ReferenceError");
has(IDX_BARE, '<script defer src="/mandate-lane.js"></script>',
  "hashes: index.html does not load mandate-lane.js, so a person overlay's related proposals would throw");

// THE ONE-HOP FORWARD, IN <head>, BEFORE ANYTHING PAINTS. A bookmark on
// #agenda must not land on a blank layer; replace() rather than assign() so the
// forward is not a step in the reader's history.
const FWD = /var LANE = \{[\s\S]*?\};/.exec(INDEX);
must(!!FWD, "index.html no longer declares the LANE hash-forward table");
["'agenda': '/mandate'", "'mandate': '/mandate'", "'peoples-mandate': '/mandate'"].forEach((n) =>
  has(FWD[0], n, `forward: ${n} is not in the table — that bookmark lands on the front page`));
ok(INDEX.indexOf("var LANE = {") < INDEX.indexOf("</head>"),
  "forward: the forward is not in <head> — a reader would parse two megabytes before being sent one document over");
ok(/location\.replace\(/.test(INDEX.slice(INDEX.indexOf("var LANE = {"), INDEX.indexOf("var LANE = {") + 2000)),
  "forward: the forward uses assign() rather than replace(), so Back returns to the hash and forwards again");

// THE BRIDGE STAYED. index.html publishes twelve window._pdxMandate* functions
// that all-seeing-eye.js, profiles-full.js, stance-helpers.js and
// digital-library.js consume, and test-eye-mandate-lane.mjs pins three of them
// plus the id. Moving the room did not move the bridge.
["window._pdxMandateFocusReform = function", "window._pdxMandateFocus = function",
  "window._pdxMandateItems = MANDATE_ITEMS"].forEach((n) =>
  has(INDEX, n, `bridge: ${n} left index.html — four other files and the Eye's navigate arm call into it`));

// THE TWO SHELLS THAT ROUTE HASHES route this one too, so an inner-shell
// bookmark does not send a reader to a fragment that names nothing.
["stances.html", "evidence.html"].forEach((f) => {
  const src = R(f);
  has(src, "'agenda': '/mandate'", `${f}: #agenda is not routed to the room`);
  has(src, "var HASH_ROOM", `${f}: the room table is gone — every hash would be sent to the front page`);
});

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the room is precached with its renderer and its sheet");

const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER), `sw: CACHE_VERSION does not read as one version literal (got "${VER}")`);
ok(Number(VER.slice(1)) >= 211,
  `sw: CACHE_VERSION is ${VER} — three new documents and seven new assets shipped in this pass, and a warm ` +
  "device keeps serving the old front page without a rename");
has(SW, "mandate.html", "sw: the version log has no entry naming the new shell");

const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL, "sw.js no longer declares SHELL_ASSETS as one literal array");
["/mandate.html", "/mandate-lane.js", "/mandate-lane.css", "/shell-chrome.css", "/shell-account-chip.js"]
  .forEach((a) => has(SHELL, `'${a}'`, `sw: ${a} is not precached — the room would open with no renderer, or unstyled`));
// support-lane.js IS DELIBERATELY NOT ON THAT LIST. It is a runtime entry, on
// the reasoning sw.js records for itself: the room degrades honestly without it
// (the counts print, the borrowed sentence does not), and a vocabulary cached
// against a stale shell is how a wall comes to contradict the page under it.
lacks(SHELL, "'/support-lane.js'",
  "sw: support-lane.js was added to the precache — it is a runtime entry so a fresh wall never pairs with a stale shell");

// THE NAV MATCH IS THE TWO PATHS netlify.toml DECLARES, AND NOTHING ELSE.
const NAV = (/const MANDATE_NAV_RE = (\/[^\n;]+\/);/.exec(SW) || [, ""])[1];
ok(!!NAV, "sw: MANDATE_NAV_RE is not one literal");
if (NAV) {
  const re = new RegExp(NAV.slice(1, NAV.lastIndexOf("/")));
  ["/mandate", "/mandate/"].forEach((p) => ok(re.test(p), `sw: ${p} is not recognised as the Mandate room`));
  ["/mandates", "/mandate/reform", "/mandate.html.bak", "/me", "/money", "/"].forEach((p) =>
    ok(!re.test(p), `sw: ${p} is served the Mandate document`));
}
// THE OFFLINE FALLBACK. The branch is the room's own shell, and it is declared
// before the '/' branch — otherwise a cold offline /mandate is answered with
// the front page, which no longer contains the Mandate.
{
  const mdAt = SW.indexOf("shell.match('/mandate.html')");
  const homeAt = SW.indexOf("shell.match('/index.html')");
  ok(mdAt > 0, "sw: there is no offline branch for /mandate");
  ok(homeAt < 0 || mdAt < homeAt, "sw: the '/' offline branch is declared before /mandate's, and would answer first");
}

// ═════════════════════════════════════════════════════════════════════════════
function report() {
  console.log(
    `\n${failures.length ? "✗" : "✓"} mandate shell: ${passed} checks passed` +
    (failures.length ? `, ${failures.length} failed` : "")
  );
  if (failures.length) {
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}
report();
