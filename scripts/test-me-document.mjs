#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for me.html — THE SIXTH SHELL, and the voter's own file
// ─────────────────────────────────────────────────────────────────────────────
// The reader had four addresses and not one of them was theirs:
//
//   · "Your File" in the account menu was the hash #your-file — an overlay that
//     painted onto whatever document the reader happened to be standing on, and
//     since the menu only exists on the front page, always the front page.
//   · "My Views" in the same menu was a SCROLL to a different region of that
//     same front page, under a second name for the same thing.
//   · Ballot picks were a third place (/ballot), starred issues a fourth (the
//     My Stances wall's High-priority flags).
//
// Two names, two surfaces, one person. None of it linkable, bookmarkable or
// Back-able — and the eight answers of record had TWO live editors over two
// stores (pdx_your_file_v1 and pdx_my_stances_v1) that both project into one
// alignment engine, which is to say they could disagree about the same issue
// and the last writer won.
//
// So /me is the desk, /me is the only address for it, and the front page keeps
// a card that names it.
//
// The failure modes, every one of which ships silently:
//
//   1. /me RESOLVES TO THE FRONT PAGE. Without the rewrite, or with it declared
//      under something that also matches, the desk is 2.24 MB of homepage and
//      the reader never sees their file.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /me/ is served 200 at a
//      trailing-slash path, so src="me-desk.js" resolves to /me/me-desk.js,
//      matches the rewrite, and hands the browser this document to parse as
//      JavaScript: a blank desk with no error naming the cause.
//   3. THE FLAG GOES MISSING and every module that gates on it either runs on
//      the wrong document or refuses to run on the right one. Sniffing
//      location.pathname instead is the same bug with three spellings (/me,
//      /me/ and a preview server's /me.html).
//   4. A SECOND EDITOR SURVIVES. If #your-file still opens an overlay, or the
//      homepage wall still mounts itself, the drift this pass exists to end is
//      still shipping.
//   5. A DOOR FIRES TWICE. your-file.js now redirects and returns false WITHOUT
//      preventDefault, so an anchor that kept data-pdxyf-open would fire both
//      the module's location.replace and its own href.
//   6. A SCORE APPEARS ON THE VOTER. A percentage, a grade, a meter, a party
//      chip, "80% aligned with Utah" — the one thing this document must never
//      grow. The mission is person vs record; Direction Match is the reader's
//      own integrity check, not ours.
//   7. A HARDCODED SEAT COUNT. "pick 6" is a lie in 49 states and in several
//      Utah counties. Region d's denominator is the length of this reader's own
//      resolved slate or it is a lie.
//   8. THE COPY CHAIN BECOMES A FAN. Four store blocks are copied verbatim into
//      this document. Edited in place, a fix to the origin stops reaching here
//      and nothing fails.
//   9. THE DOCUMENT REGROWS. Nothing stops the next pass pasting the alignment
//      engine, the roster corpus or the ballot workspace back onto this shell.
//  10. THE SERVICE WORKER SERVES A SHELL WITH NO DESK, or pairs a new homepage
//      whose My Stances band is a door against a cached my-stances.js that has
//      no mount for it.
//
// This harness gates all ten, in eleven sections:
//
//   1. THE REWRITE — /me and /me/ at 200, after /p/*, /i/*, /issue/* and
//      /ballot, no wildcard beneath them, and no other address moved.
//   2. THE FLAG — declared once, read through one accessor, never sniffed.
//   3. EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE, and every inline block parses.
//   4. THE COPY CHAIN — four slices byte-identical to their origins.
//   5. THE DOORS — every control that said #your-file now says /me, and the
//      attribute that would double-fire is gone from all of them.
//   6. NO SCORE ON THE VOTER, on any of the three files this pass added.
//   7. THE HOMEPAGE DEMOTION — one editor, and the wall is a card over a
//      template that a gesture still opens.
//   8. THE DENYLIST — what this shell must never carry.
//   9. THE DESK, BOOTED — six regions, real stores, and a snapshot whose
//      denominator is a list length.
//  10. THE REDIRECT CONTRACT, BOOTED — both halves of it.
//  11. THE SERVICE WORKER.
//
//   node scripts/test-me-document.mjs
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

const ME = R("me.html");
const DESK_JS = R("me-desk.js");
const DESK_CSS = R("me-desk.css");
const YF_JS = R("your-file.js");
const MS_JS = R("my-stances.js");
const HUB_JS = R("compare-hub.js");
const WRM_JS = R("who-represents-me.js");
const INDEX = R("index.html");
const PERSON = R("person.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");

// Every "must not contain" runs against a comment-stripped view. me.html's
// doctrine comment names the modules it deliberately does not carry, and
// me-desk.js explains in `//` comments which globals it refuses to read — a
// comment can neither satisfy nor violate a contract.
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, " ");
const jsBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
const ME_BARE = htmlBare(ME);
const ME_CODE = jsBare(ME_BARE);
const DESK_CODE = jsBare(DESK_JS);
const YF_CODE = jsBare(YF_JS);
const MS_CODE = jsBare(MS_JS);
const HUB_CODE = jsBare(HUB_JS);
const WRM_CODE = jsBare(WRM_JS);
const INDEX_BARE = htmlBare(INDEX);
const CSS_CODE = String(DESK_CSS).replace(/\/\*[\s\S]*?\*\//g, " ");

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
section("1 · /me is its own address");

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
for (const addr of ["/me", "/me/"]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/me.html" && String(hit.status) === "200",
    `rewrite: ${addr} is served /me.html at 200 (got ${hit ? hit.to + " " + hit.status : "no matching rule"})`);
}

// THE ORDER, which the brief required. Both rules are exact paths so nothing
// above them can swallow them today; the assertion is that the declaration
// order still protects them the day one of the rules above gains a wildcard.
{
  const p = ruleIndex("/p/*"), b = ruleIndex("/ballot"), bs = ruleIndex("/ballot/");
  const m = ruleIndex("/me"), ms = ruleIndex("/me/");
  ok(p >= 0 && b >= 0 && bs >= 0 && m >= 0 && ms >= 0,
    "rewrite: /p/*, /ballot, /ballot/, /me and /me/ are all declared");
  ok(m > b && m > bs && m > p,
    `rewrite: /me is declared after /p/* and /ballot (indices p=${p} ballot=${b} me=${m})`);
  ok(ms > m, "rewrite: /me/ is declared after /me");
}

// NO WILDCARD. A region of the desk is a QUERY (?tab=...), not a segment, so
// there is nothing beneath /me for a rule to own — and a query string does not
// participate in rule matching at all, so ?tab= needs no rule and cannot be
// broken by one.
ok(!RULES.some((r) => r.from && /^\/me/.test(r.from) && r.from.includes("*")),
  "rewrite: no /me* wildcard rule exists — a tab is a query, not a segment");

// THE ADDRESSES THIS SPLIT MUST NOT STEAL.
for (const [addr, expect] of [["/p/lee", "/person.html"], ["/ballot", "/ballot.html"]]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === expect, `rewrite: ${addr} still resolves to ${expect}`);
}
ok(!resolveAddr("/") || resolveAddr("/").to !== "/me.html",
  "rewrite: / is not answered with the desk — the front page is still the front page");
// The /ballot block's own comment used to assert that /me was untouched. It is
// not any more, and a comment that lies is worse than no comment.
ok(!/\/locker and \/me are untouched/.test(TOML),
  "rewrite: the stale 'and /me are untouched' clause is gone from netlify.toml");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE FLAG
// ═════════════════════════════════════════════════════════════════════════════
section("2 · one document, one flag, no pathname sniffing");

const FLAG = "__PDX_ME_DOC";
eq((ME.match(/window\.__PDX_ME_DOC\s*=\s*true/g) || []).length, 1,
  "flag: me.html declares window.__PDX_ME_DOC exactly once");
// Declared BEFORE anything that reads it: a module that parses first and asks
// later would read undefined and return.
// Against the SCRIPT TAG, not the preload hint: /me-desk.js is preloaded in the
// head, which is above the flag on purpose (a preload fetches, it does not run).
ok(ME.indexOf(FLAG) < ME.indexOf('src="/me-desk.js"'),
  "flag: the declaration comes before the <script> that reads it");

has(DESK_CODE, FLAG, "flag: me-desk.js reads the flag");
ok(/function isMeDoc\s*\(/.test(DESK_CODE), "flag: me-desk.js reads it through one accessor (isMeDoc)");
ok(/if\s*\(\s*!isMeDoc\(\)\s*\)\s*return/.test(DESK_CODE),
  "flag: me-desk.js returns immediately on a document that is not /me");
ok(/function isMeDoc\s*\(/.test(YF_CODE), "flag: your-file.js reads it through the same accessor shape");

// NO PATHNAME SNIFFING, on either file — /me, /me/ and a preview server's
// /me.html are three spellings of one document, and a fourth arrives the day
// anyone adds a query. Both files DO read location.pathname, and must: goTab
// composes '?tab=' onto the address it is already at, and your-file.js's close
// path composes the address to return to. Composing is not sniffing. What is
// banned is pathname appearing anywhere near a /me spelling, which is the only
// way it becomes a second, disagreeing answer to "which document is this".
const SNIFF = /location\.pathname[\s\S]{0,60}['"`]\/?me|['"`]\/?me['"`][\s\S]{0,60}location\.pathname/;
for (const [name, code] of [["me-desk.js", DESK_CODE], ["your-file.js", YF_CODE]])
  ok(!SNIFF.test(code), `flag: ${name} decides the document from the flag alone, never from the path`);

// ═════════════════════════════════════════════════════════════════════════════
// 3 · ROOT-ABSOLUTE PATHS, AND EVERY INLINE BLOCK PARSES
// ═════════════════════════════════════════════════════════════════════════════
section("3 · root-absolute assets, parseable inline blocks");

const attrs = [...ME_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in me.html is root-absolute (offenders: ${relative.join(", ")})`);

const TAGS = [...ME.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inlineBlocks = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
ok(inlineBlocks.length >= 4, `paths: me.html carries its inline store blocks (${inlineBlocks.length} found)`);
let parseFails = 0;
for (const b of inlineBlocks) { try { new vm.Script(b.body); } catch (e) { parseFails++; } }
eq(parseFails, 0, "paths: every inline <script> block in me.html parses");

// A tripwire, not a target. The document is CHROME plus four copied stores; a
// budget going red is the split being undone one <script> at a time.
// 48 KB, not ballot.html's 40: this document inlines FOUR copied stores (PDXStore,
// the promise ledger, firebase and PDXSaved — 1,941 lines) because without them
// /me would read an un-namespaced key while the homepage reads the per-account
// one, which is the store divergence this whole pass exists to prevent. The
// ceiling is a tripwire on CHROME, and 42 KB of it is the copied stores.
const gz = gzipSync(Buffer.from(ME, "utf8")).length;
ok(gz < 48 * 1024, `budget: me.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 48 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 12,
  `budget: me.html loads ${localSrcs.length} local scripts (ceiling 12 — this is a desk, not a product)`);

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE COPY CHAIN
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the four copied stores are byte-identical to their origins");

// A chain, not a fan: each block records the file and the line range it came
// from, so a fix to the origin surfaces as ONE test failure per document
// instead of as a silent divergence nobody is looking for.
const lines = (s) => String(s).split("\n");
const slice = (src, a, b) => lines(src).slice(a - 1, b).join("\n");
const COPIES = [
  { from: "person.html", src: PERSON, a: 288, b: 1271, what: "PDXStore" },
  { from: "person.html", src: PERSON, a: 1405, b: 1914, what: "the promise ledger" },
  { from: "person.html", src: PERSON, a: 2006, b: 2029, what: "firebase" },
  // The one block whose origin is index.html rather than person.html: person.html
  // does not carry PDXSaved, and index.html is the origin of all four, so taking
  // it from the origin keeps the chain a chain. Its declared range moves whenever
  // an earlier edit to index.html shifts line numbers — when it does, the header
  // comment in me.html and this table move TOGETHER, which is the whole point of
  // pinning it in one place.
  { from: "index.html", src: INDEX, a: 28019, b: 28441, what: "PDXSaved" },
];
for (const c of COPIES) {
  const header = new RegExp(`COPIED VERBATIM FROM ${c.from.replace(".", "\\.")} LINES ${c.a}[^0-9]{1,3}${c.b}`);
  ok(header.test(ME), `copy: me.html declares its ${c.what} block as ${c.from} ${c.a}–${c.b}`);
  const body = slice(c.src, c.a, c.b);
  ok(body.trim().length > 0, `copy: ${c.from} ${c.a}–${c.b} is a non-empty slice`);
  ok(ME.indexOf(body) >= 0,
    `copy: the ${c.what} block in me.html is byte-identical to ${c.from} ${c.a}–${c.b} — ` +
    "if the origin moved, move the declared range and this pin together");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE DOORS
// ═════════════════════════════════════════════════════════════════════════════
section("5 · every door points at the address, and none of them fires twice");

// THE ACCOUNT MENU. Two names ("Your file", "My Views") for one person's file;
// both are now the same plain anchor, and neither carries the attribute that
// would make one tap two navigations.
const menuMatch = HUB_CODE.match(/function updateNavAuth[\s\S]*?\n  \}/);
const MENU = menuMatch ? menuMatch[0] : HUB_CODE;
ok((MENU.match(/href="\/me"/g) || []).length >= 4,
  `menu: all four account-menu controls are href="/me" (found ${(MENU.match(/href="\/me"/g) || []).length})`);
lacks(MENU, "data-pdxyf-open", "menu: the overlay attribute is gone from the account menu");
lacks(MENU, "PDXStances.openViews", "menu: 'My Views' no longer scrolls to a homepage region");
lacks(MENU, 'href="#your-file"', "menu: no control still points at the hash");

// WHO REPRESENTS ME — the front step's own "Your file" control.
has(WRM_CODE, 'href="/me"', "who-represents-me: the Your File control is a plain /me anchor");
lacks(WRM_CODE, "data-pdxyf-open", "who-represents-me: the overlay attribute is gone");

// THE HOMEPAGE MARKUP. No open path on / at all — not the hash, not the
// attribute. (The prose comments still describe what was removed, which is why
// these run on the comment-stripped view.)
lacks(INDEX_BARE, "data-pdxyf-open", "homepage: no markup carries the overlay attribute");
lacks(INDEX_BARE, 'href="#your-file"', "homepage: no markup still links to the hash");
lacks(INDEX_BARE, 'href="#my-stances"', "homepage: no nav row still scrolls to the wall");
has(INDEX_BARE, 'href="/me"', "homepage: the reader's file is reachable by its address");

// AND THE HASH STILL WORKS, as exactly one hop. A bookmark a reader made last
// year is not a thing to break.
ok(/location\.replace\(\s*ME\s*\)/.test(YF_CODE) || /location\.replace\(\s*['"]\/me['"]\s*\)/.test(YF_CODE),
  "hash: your-file.js travels to /me with location.replace — a hop, not a forward trap");
ok(/_toMe/.test(YF_CODE), "hash: the travel is latched so one gesture cannot fire two redirects");
lacks(YF_CODE, "location.assign('/me')", "hash: the redirect is not a pushed history entry");

// ═════════════════════════════════════════════════════════════════════════════
// 6 · NO SCORE ON THE VOTER
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the desk never scores, grades or party-chips the reader");

// THE BAN IS ON THE SHAPE, NOT ON THE VOCABULARY. me-desk.js says the words
// "grade" and "publishes" out loud, in the reader-facing sentence that states
// the prohibition ("PolitiDex publishes no grade for a voter and no grade for a
// party") — a denylist over that vocabulary would forbid the file from saying
// what it refuses to do. What is banned is the machinery: a rounded figure, a
// formatted number, a percent sign in a template, and a class for a meter or a
// grade badge to arrive in.
for (const [name, code] of [["me-desk.js", DESK_CODE], ["me-desk.css", CSS_CODE]]) {
  lacks(code, "Math.round", `${name}: there is no rounding, because there is no figure to round`);
  lacks(code, "toFixed", `${name}: no formatted number`);
  for (const cls of ["me-meter", "me-score", "me-grade", "me-pct", "me-bar"])
    lacks(code, cls, `${name}: there is no .${cls} class for a score to arrive in`);
}
// A PERCENT SIGN IS A FIGURE ONLY IN THE RENDERER. In the stylesheet it is a
// unit — `width: 100%`, `border-radius: 50%` — so the composition ban belongs
// to me-desk.js alone, where a `%` next to a value could only ever be a score.
ok(!/[0-9})\]]\s*\+\s*['"`]\s*%|%\s*<\//.test(DESK_CODE),
  "me-desk.js: no percentage is ever composed into the paint");

// And the sentence that states the prohibition is actually there, because the
// reader is owed the reason their file has no number on it.
ok(/publishes no grade\s+' \+\s*\n?\s*'for a voter and no grade for a party|no grade for a voter/.test(DESK_JS)
  || /no grade for a party/.test(DESK_JS),
  "desk: the desk says out loud that it grades neither the voter nor a party");
// No party colour on the voter — and no class for one to arrive in.
for (const word of ["me-party", "republican", "democrat"])
  ok(!new RegExp(word, "i").test(CSS_CODE + DESK_CODE), `desk: no "${word}" anywhere in the desk's own files`);
// NO HARDCODED SEAT COUNT in the document's visible copy. "of 6" is a lie in 49
// states. The eight-issue denominator is the editor's own and is not written here.
const visible = ME_BARE.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ");
ok(!/\bof\s+6\b|\b0\s*\/\s*6\b|\b6\s+seats\b/i.test(visible),
  "desk: me.html's visible copy holds no hardcoded seat count");
// The snapshot's denominator is a LIST LENGTH, exposed for a test rather than
// written down twice.
ok(/_workable/.test(DESK_CODE), "desk: the snapshot exposes its slate so a test can compare lists, not literals");

// ═════════════════════════════════════════════════════════════════════════════
// 7 · THE HOMEPAGE DEMOTION
// ═════════════════════════════════════════════════════════════════════════════
section("7 · one editor — the wall is a card over a template");

const msSection = INDEX.match(/<section id="my-stances"[\s\S]*?<\/section>/);
ok(!!msSection, "homepage: the #my-stances section still exists — the address is not broken");
const MS_SECTION = msSection ? msSection[0] : "";
has(MS_SECTION, 'class="ms-closed"', "homepage: the band ships closed");
has(MS_SECTION, 'id="ms-shell-tpl"', "homepage: the collection sits in a <template>");
has(MS_SECTION, 'href="/me"', "homepage: the card names the address the file lives at");
// #ms-body must exist ONLY inside the template. Outside it, my-stances.js's
// init() would find a mount and paint the whole wall on every load of /.
{
  const tplStart = MS_SECTION.indexOf('<template id="ms-shell-tpl">');
  const bodyAt = MS_SECTION.indexOf('id="ms-body"');
  ok(tplStart >= 0 && bodyAt > tplStart, "homepage: #ms-body exists only inside the template");
  eq((INDEX.match(/id="ms-body"/g) || []).length, 1, "homepage: there is exactly one #ms-body");
}
// The card states a COUNT or nothing. A reader with three saved positions is
// not 37% of a voter.
lacks(MS_SECTION, "%", "homepage: the card carries no percentage");
ok(/position/.test(MS_SECTION), "homepage: the card's one line counts positions");

// AND THE COLLECTION IS STILL REACHABLE, because the priority editor lives
// nowhere else and /me's Starred issues region links here to use it.
ok(/function mountShell\s*\(/.test(MS_CODE), "my-stances.js: a mount-on-request door exists");
ok(/ms-shell-tpl/.test(MS_CODE), "my-stances.js: the door clones the template");
ok(/if\s*\(!el\(MOUNT\)\)\s*mountShell\(\)/.test(MS_CODE),
  "my-stances.js: init() mounts before it looks for its mount, so PDXStances.open() still lands somewhere");
ok(/hashchange[\s\S]{0,120}#my-stances/.test(MS_CODE),
  "my-stances.js: a bookmarked #my-stances still opens the collection");
// NO LAZY MOUNT. The IntersectionObserver deferred the cost of the wall; it
// never avoided it, because every reader who scrolls the page scrolls past it.
lacks(MS_CODE, "IntersectionObserver", "my-stances.js: the scroll-into-view mount is gone");

// ═════════════════════════════════════════════════════════════════════════════
// 8 · THE DENYLIST
// ═════════════════════════════════════════════════════════════════════════════
section("8 · what this shell must never carry");

// The critical path is only what /me needs. Each of these is named because it
// is what the document would grow if the next pass reached for a helper instead
// of a fact: an engine, a corpus, or a second ballot.
const DENY = [
  ["alignment-tool.js", "the alignment ENGINE — there is no score on this document"],
  ["cmp-data.js", "the 393 KB roster corpus — PROFILES from the Firestore index is the name source"],
  ["profiles-full.js", "the 598 KB profile corpus"],
  ["ballot-workspace.js", "the ballot DESK — region d is a snapshot, not a third ballot"],
  ["ballot-breakdown.js", "the 416 KB race tables"],
  ["compare-hub.js", "the compare hub"],
  ["voting-record.js", "the vote-pack lane"],
  ["consistency.js", "the politician consistency engine"],
  ["app.css", "the homepage stylesheet"],
  ["spotlights-data.js", "the Spotlight corpus"],
];
for (const [file, why] of DENY) lacks(ME_CODE, file, `denylist: me.html must not load ${file} — ${why}`);

// AND THE DESK MUST NOT PUBLISH — no other reader's file, ever, and no reach
// for the network to publish one with. Positions stay private by default; there
// are no comments, no likes and no public voter grade, so there is nothing on
// this document that a POST could be for.
for (const word of ["/api/", "fetch(", "XMLHttpRequest", "navigator.sendBeacon"])
  lacks(DESK_CODE, word, `desk: me-desk.js does not reach the network (${word})`);

// WHAT MUST BE PRESENT — the seven modules that are the whole critical path,
// in dependency order.
const MUST = ["/person-link.js", "/browse-photos.js", "/issue-map.js",
  "/voter-hub-location.js", "/my-stances.js", "/your-file.js", "/me-desk.js"];
let prev = -1, ordered = true;
for (const f of MUST) {
  const at = ME_CODE.indexOf(`src="${f}"`);
  ok(at >= 0, `critical path: me.html loads ${f}`);
  if (at >= 0) { if (at < prev) ordered = false; prev = at; }
}
ok(ordered, "critical path: the seven modules are in dependency order, me-desk.js last");
has(ME, 'href="/me-desk.css"', "critical path: the desk's stylesheet is linked");
// SOURCE ORDER IS THE WHOLE MECHANISM for .pdxyf-body--inline, which unpicks the
// overlay's scroll container so the editor can sit in a page region.
// THE STYLESHEET LINKS, not the preload hints — a preload fetches, it does not
// contribute a cascade position, so the two lists are ordered on different
// grounds and only this one is the mechanism.
{
  const sheets = [...ME.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
  const yf = sheets.findIndex((t) => t.includes("/your-file.css"));
  const desk = sheets.findIndex((t) => t.includes("/me-desk.css"));
  ok(yf >= 0 && desk >= 0 && yf < desk,
    `critical path: your-file.css is linked BEFORE me-desk.css, which is the whole mechanism for ` +
    `.pdxyf-body--inline (indices your-file=${yf} me-desk=${desk})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 9 · THE DESK, BOOTED
// ═════════════════════════════════════════════════════════════════════════════
section("9 · the desk paints six regions from real stores");

function makeDoc() {
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", innerHTML: "", textContent: "", hidden: false,
      children: [], parentNode: null, attrs: {},
      style: { setProperty() {}, removeProperty() {} },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, focus() {}, click() {}, remove() {},
      scrollIntoView() {}, insertAdjacentHTML() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const doc = {
    readyState: "complete", cookie: "", body,
    head: node("head"), documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };
  doc.__nodes = nodes;
  doc.__node = node;
  return doc;
}

// The desk's real picks key, and the real shape of TEAM_POSITIONS. Both come
// from the surfaces this document must agree with, not from a fixture invented
// here: politidex_my_team is the literal key /ballot reads, and PDXStore
// namespaces nothing at the store level, which is why the two cannot disagree.
const BALLOT_KEY = "politidex_my_team";
const SLATE = [
  { key: "senate", label: "U.S. Senate", icon: "\u{1F3DB}" },
  { key: "house", label: "U.S. House", icon: "\u{1F3DB}" },
  { key: "gov", label: "Governor", icon: "\u{1F3DB}" },
  { key: "state_sen", label: "State Senate", icon: "\u{1F3DB}" },
  { key: "state_house", label: "State House", icon: "\u{1F3DB}" },
  { key: "local", label: "Local offices", icon: "\u{1F3D9}" },
];

function bootDesk(opts) {
  const o = opts || {};
  const raw = Object.assign({}, o.raw || {});
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: (f) => { if (o.runTimers && typeof f === "function") { try { f(); } catch (e) {} } return 0; },
    clearTimeout() {}, requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = o.flag === false ? makeDoc() : makeDoc();
  if (o.flag !== false) win.__PDX_ME_DOC = true;
  const mount = win.document.__node("main");
  mount.id = "me-desk";
  win.document.body.appendChild(mount);
  win.location = { href: "https://politidex.us/me" + (o.search || ""), pathname: "/me", search: o.search || "", hash: "", origin: "https://politidex.us", replace() {}, assign() {} };
  win.__pushed = [];
  win.history = { pushState(s, t, u) { win.__pushed.push(String(u)); }, replaceState() {} };
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(raw, k) ? raw[k] : null),
    setItem: (k, v) => { raw[k] = String(v); }, removeItem: (k) => { delete raw[k]; },
  };
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.auth = { currentUser: o.uid ? { uid: o.uid, isAnonymous: false, email: "voter@example.org", displayName: null } : null, onAuthStateChanged() {} };
  win.TEAM_POSITIONS = o.slate === null ? [] : (o.slate || SLATE);
  win.pdxRepsForMe = () => ({ located: o.located !== false, state: "UT", county: "Salt Lake" });
  win._hasUserLocation = () => o.located !== false;
  win._voterLocationLabel = () => "Salt Lake County, Utah";
  win.PROFILES = { cox: { name: "Spencer Cox", office: "Governor" }, lee: { name: "Mike Lee", office: "U.S. Senate" } };
  win.ISSUE_MAP = { lands_preserve: { label: "Public lands" }, housing: { label: "Housing" } };
  const ctx = vm.createContext(win);
  win.__err = null;
  try { vm.runInContext(DESK_JS, ctx, { filename: "me-desk.js" }); }
  catch (e) { win.__err = e; }
  win.__raw = raw;
  win.__mount = mount;
  return win;
}

{
  const w = bootDesk({ uid: "u_1", raw: { [BALLOT_KEY]: JSON.stringify({ gov: "cox", senate: "lee" }) } });
  ok(!w.__err, `desk: me-desk.js evaluates on the /me document (${w.__err ? w.__err.message : "ok"})`);
  ok(!!w.PDXMeDesk, "desk: the singleton is published");
  const painted = String(w.__mount.innerHTML);
  ok(painted.length > 400, `desk: the first paint writes the desk (${painted.length} chars)`);
  for (const id of ["me-positions", "me-stars", "me-ballot", "me-saved"])
    has(painted, id, `desk: region ${id} is painted`);

  // THE PICKS COME FROM /ballot's OWN KEY. Not a copy, not a namespaced
  // variant: the same literal string, which is why the two surfaces cannot
  // disagree about what this voter picked.
  const sel = w.PDXMeDesk.picks();
  eq(sel.gov, "cox", "desk: the pick store is /ballot's politidex_my_team, read raw");
  eq(w.PDXMeDesk.pickFor(sel, "gov"), "cox", "desk: a resolved seat reports its pick");
  eq(w.PDXMeDesk.pickFor(sel, "state_house"), null, "desk: an unpicked seat reports no pick");

  // THE DENOMINATOR IS A LIST LENGTH. Compared against the slate the desk
  // itself projects — two lists, no literal on either side.
  eq(w.PDXMeDesk.seats().length, SLATE.length, "desk: the slate is TEAM_POSITIONS, projected");
  eq(w.PDXMeDesk._workable().length, SLATE.length, "desk: every seat on a placed reader's slate is workable");
  ok(!/\bof 6\b/.test(painted) || /of 6/.test(painted) === (SLATE.length === 6),
    "desk: any '/ N' in the paint is the slate length, not a literal");

  // WORK THIS SEAT IS A REAL ADDRESS, and it carries the seat.
  has(painted, '/ballot?seat=gov', "desk: Work-this-seat lands on /ballot with the seat open");
  has(painted, 'href="/ballot"', "desk: the ballot workspace is one text link away");
  // A pick's name is a link to the person's own document.
  ok(/\/p\/(cox|lee)/.test(painted), "desk: a pick name links to /p/<pid>");

  // TABS ARE A QUERY, AND A TAB IS A PUSH — Back from a tab stays on /me.
  eq(w.PDXMeDesk.tabOf("?tab=stars"), "stars", "desk: ?tab= names a region");
  ok(!w.PDXMeDesk.tabOf("?tab=nonsense"), "desk: an unknown tab is not a region");
  ok(!w.PDXMeDesk.tabOf(""), "desk: no ?tab= at all is not a region either");
  w.PDXMeDesk.goTab("ballot");
  ok(w.__pushed.some((u) => /tab=ballot/.test(u)), "desk: opening a tab pushes an address");
  ok(!w.__pushed.some((u) => /^\/(\?|$)/.test(u)), "desk: opening a tab does not leave the document");
}

// A READER WE CANNOT PLACE GETS THE HONEST SENTENCE, not an empty grid and not
// a guessed seat.
{
  const w = bootDesk({ uid: "u_2", located: false });
  const painted = String(w.__mount.innerHTML);
  ok(!w.__err, "desk: the desk paints for a reader with no location");
  eq(w.PDXMeDesk._workable().length, 0, "desk: an unplaceable reader has no workable seats");
  ok(!/\/ballot\?seat=/.test(painted), "desk: no seat is offered to a reader we cannot place");
}

// SIGNED OUT: an honest sign-in, and no invented positions.
{
  const w = bootDesk({ uid: null });
  ok(!w.__err, "desk: the desk paints signed out");
  eq(w.PDXMeDesk.member(), null, "desk: signed out, there is no member");
  has(String(w.__mount.innerHTML), "data-me-signin", "desk: signed out, the desk offers a sign-in");
}

// AND THE DESK REFUSES TO RUN ANYWHERE ELSE. The mount id is the same, the
// stores are the same, the reader is the same — the ONLY difference is the flag,
// which is what makes this the assertion that the flag is load-bearing.
{
  const w = bootDesk({ uid: "u_3", flag: false, raw: { [BALLOT_KEY]: JSON.stringify({ gov: "cox" }) } });
  ok(!w.__err, "desk: me-desk.js evaluates without error on a document that is not /me");
  ok(!w.PDXMeDesk, "desk: no singleton is published off /me — the module returned before it defined one");
  eq(String(w.__mount.innerHTML), "", "desk: nothing is painted off /me, even with a mount and a store to paint from");
}

// ═════════════════════════════════════════════════════════════════════════════
// 10 · THE REDIRECT CONTRACT
// ═════════════════════════════════════════════════════════════════════════════
section("10 · #your-file hops once off /me, and mounts inline on it");

// Both halves are asserted at source level here; test-your-file.mjs boots the
// module itself with a recording location and asserts the behaviour.
ok(/if\s*\(isMeDoc\(\)\)\s*\{\s*mountReveal\(\);\s*return true;\s*\}/.test(YF_CODE),
  "redirect: on /me, open() mounts the editor inline and reveals it");
ok(/if\s*\(travelToMe\(\)\)\s*return false;/.test(YF_CODE),
  "redirect: off /me, open() travels and returns FALSE — no preventDefault, so an anchor is not double-fired");
ok(/function inline\s*\(\s*host\s*\)/.test(YF_CODE),
  "redirect: the editor has an inline presentation");
ok(/function bodyClick\s*\(/.test(YF_CODE),
  "redirect: the write path is one delegate, shared by both presentations");
// ONE RENDERER. The overlay and the inline mount build the same two ids, so
// render(), patchRow(), headHtml(), bodyHtml(), countSentence() and set() are
// the ones that shipped.
eq((YF_CODE.match(/function render\s*\(/g) || []).length, 1,
  "redirect: there is exactly one render() — two presentations, one renderer");
has(YF_CODE, "pdxyf-body--inline", "redirect: the inline body is marked so the desk can unpick the overlay's scroll container");
has(CSS_CODE, ".pdxyf-body--inline",
  "redirect: me-desk.css is the one file that contributes a rule to the editor");
// The desk hides the overlay outright, belt and braces: a stale cached
// your-file.js cannot paint a sheet over the desk.
ok(/\.pdxyf\s*\{[^}]*display:\s*none\s*!important/.test(ME),
  "redirect: me.html pins the overlay shell hidden");

// ═════════════════════════════════════════════════════════════════════════════
// 11 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("11 · the shell ships");

const version = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
ok(!!version, "sw: CACHE_VERSION is declared");
ok(version && Number(version.slice(1)) >= 194, `sw: CACHE_VERSION is bumped for the new shell (got ${version})`);
const shellBlock = (SW.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || "";
const shellAssets = [...shellBlock.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
for (const f of ["/me.html", "/me-desk.js", "/me-desk.css"])
  ok(shellAssets.includes(f), `sw: ${f} is precached — it is the whole of what paints the desk`);
// THE ONE MANIFEST PROHIBITION. A stale your-file.js paired with a fresh shell
// is the one combination that paints an overlay over the desk.
for (const f of ["/your-file.js", "/your-file.css"])
  ok(!shellAssets.includes(f), `sw: ${f} stays out of the precache`);
ok(new RegExp(`// ${version} -`).test(SW), `sw: the version log records ${version}`);
has(SW, "/me", "sw: the version log names the address this bump ships");

// ═════════════════════════════════════════════════════════════════════════════
console.log("");
if (failures.length) {
  console.error(`✗ /me document: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error("   • " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ /me document: all ${passed} assertions passed — the voter's file is one document at one ` +
  "address, with one editor, no score and a snapshot whose denominator is a list.\n");
