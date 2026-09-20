#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for money.html — THE TWELFTH SHELL, and Follow the Money at an address
// ─────────────────────────────────────────────────────────────────────────────
// Follow the Money was an 11 KB section over 64 KB of inline tracker inside a
// two-megabyte document, reachable only as #follow-the-money — a scroll
// position, not a place. Every reader of the front page paid for the whole
// tracker; a reader who wanted the lane had nothing to bookmark and nothing
// that survived a reload.
//
// /money is the lane's own address, and the only page on this site where the
// green-gold money pair is the house style rather than a scoped theme.
//
// IT IS ALSO THE ONE SHELL IN THIS PASS THAT SHIPS A COPY RATHER THAN A MOVE.
// The filings index has exactly one declared owner: test-finance-lane.mjs
// sweeps every shipped .js and asserts FTM_DATA / FTM_FUNDING / FTM_AS_OF /
// _FTM_BY_ID are visible to ONE module, and finance-integrity-refresh.mjs plus
// five tests brace-match those literals out of index.html BY NAME. Extracting
// them into a shared module overnight would have rewritten a declared wall and
// a hand-verification pipeline in the same pass that moved three rooms. So the
// front page keeps its copy, /money gets a fenced duplicate, and THE FENCE IS
// THE WHOLE REASON THE INTERIM IS HONEST: section 4 below re-reads both slices
// out of index.html on every run and compares them byte for byte, so a dollar
// figure edited on one side and not the other fails the build.
//
// THE FAILURE MODES, EACH OF WHICH SHIPS LOOKING FINE:
//
//   1. /money RESOLVES TO THE FRONT PAGE, or the trailing-slash form hops.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /money/ is served 200, so a
//      bare src="finance-lane.js" resolves to /money/finance-lane.js, the
//      rewrite answers with this document, and the browser is told to parse
//      HTML as JavaScript with no error naming the cause.
//   3. A PATH SNIFF REPLACES THE FLAG.
//   4. THE TWO COPIES DRIFT. A figure corrected on the front page and not here
//      is two answers about one candidate's money, which is worse than either
//      answer alone.
//   5. THE LANE GROWS A GRADE. A 0-100, a grass/mixed/big traffic light, a tier,
//      a ramp, a ranking or a sort by dollars turns a disclosure lane into a
//      verdict. finance-lane.js publishes `scored: false` and a NEVER_FEEDS
//      wall; this document borrows both rather than restating either.
//   6. COVERAGE GOES QUIET. A filing is on file for a small minority of the
//      roster. The page that does not say so every time is a page implying the
//      grid is the roster.
//   7. A CONTROL LIES. The copied renderer addresses four functions that live
//      only on the front page. A button whose handler is absent looks live,
//      takes the click, and does nothing.
//   8. THE PERSON FILE IS DUPLICATED HERE. /money?p=<pid> is a JUMP.
//   9. SOMETHING FETCHES FEC LIVE.
//  10. THE SERVICE WORKER GETS IT WRONG.
//
// Six sections:
//
//   1. THE REWRITE — two exact 200s, no wildcard, nothing in front of them.
//   2. THE DOCUMENT — banner, canonical, root-absolute paths, the one flag, the
//      copied auth stub, the budgets and the cold payload against '/'.
//   3. THE LANE IS THE WHOLE DOCUMENT — what came, what did not, the denylist.
//   4. THE FENCE — both copied slices, byte for byte, against index.html.
//   5. THE ROOM'S OWN CODE — the forward, the hash, the re-homed controls.
//   6. THE SERVICE WORKER.
//
//   node scripts/test-money-shell.mjs
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

const MY = R("money.html");
const INDEX = R("index.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");
const ROOM = R("money-room.js");
const FIN = R("finance-lane.js");
const ME = R("me.html");

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) => blank(b));
const scriptBare = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (b) => blank(b));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
// THE MARKUP, WITH NOTHING BUT MARKUP IN IT — and on this document that matters
// more than on either of the others: the banner spends forty lines explaining
// the walls it keeps ("NO LIVE FEC", "no grass/mixed/big", "no 0-100") and the
// copied tracker is 64 KB of script whose own comments name every one of them.
// A substring sweep over the raw file fails on the sentence that promises the
// thing it is looking for.
const MY_BARE = scriptBare(styleBare(htmlBare(MY)));
const MY_MARKUP = htmlBare(MY);   // comments out, scripts and styles kept
// THE FRONT PAGE, WITH ITS COMMENTS OUT AND ITS SCRIPTS KEPT. Same reason as
// above, and on index.html it is now load bearing: where the money lane used to
// be there is a long note naming everything that moved and everything that was
// deleted — #ftm-leaderboard, FTM_LB_DATA, #wealth-leaderboard, the lot. A
// sweep over the raw file would fail on the note that records the deletion,
// which would mean the only way to pass is to delete the explanation.
const INDEX_NC = htmlBare(INDEX);
const CODE = jsBare(ROOM);

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
section("1 · /money and /money/ are one room, declared twice and exactly");

const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const b = m[1];
  const g = (k) => ((new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*)"?`, "m")).exec(b) || [, ""])[1].trim();
  return { from: g("from"), to: g("to"), status: g("status"), force: g("force") };
});
ok(RULES.length > 10, `toml: the redirect table parsed (${RULES.length} rules)`);
const idxOf = (from) => RULES.findIndex((r) => r.from === from);

for (const path of ["/money", "/money/"]) {
  const i = idxOf(path);
  ok(i >= 0, `toml: ${path} has no rule of its own — the room is only reachable as a file`);
  if (i >= 0) {
    eq(RULES[i].to, "/money.html", `toml: ${path} does not serve the twelfth shell`);
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
// NO /money/* — AND THE REASON IS THE JUMP. ?p=<pid> is a QUERY on this path,
// answered by money-room.js with one replace() to /p/<pid>#money. A splat rule
// here would publish /money/<pid> as a second URL shape for a person.
eq(RULES.filter((r) => /^\/money/.test(r.from) && r.from.indexOf("*") >= 0).length, 0,
  "toml: a /money wildcard exists — /money/<pid> would become a second address for a person's money");
eq(RULES.filter((r) => r.from === "/*" && r.status === "200").length, 0,
  "toml: a /* → 200 catch-all is declared — every address in this file becomes the front page behind it");
{
  ["/me", "/ballot", "/courts", "/evidence", "/stances", "/mandate", "/voice"].forEach((p) => {
    const j = idxOf(p);
    ok(j < 0 || RULES[j].to !== "/money.html", `toml: ${p} was pointed at money.html`);
  });
  const i = idxOf("/p/*");
  ok(i >= 0 && RULES[i].to !== "/money.html",
    "toml: /p/* is gone or was pointed here — the person file owns a person's money section and this document does not");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the banner, the canonical, root-absolute paths, the one flag, the budgets");

const BRE_SRC = (/const SUB_SHELL_BANNER_RE = (\/[^\n]+\/);/.exec(SW) || [, ""])[1];
must(!!BRE_SRC, "sw.js no longer declares SUB_SHELL_BANNER_RE as one literal");
const BRE = new RegExp(BRE_SRC.slice(1, BRE_SRC.lastIndexOf("/")), BRE_SRC.slice(BRE_SRC.lastIndexOf("/") + 1));
const bm = BRE.exec(MY.slice(0, 4096));
ok(bm && bm[1] === "money",
  "banner: money.html does not declare itself the twelfth shell inside sw.js's own 4096-character sniff window");
has(MY, "/money IS ITS OWN DOCUMENT", "banner: the banner names the address it serves");
ok(!BRE.test(INDEX), "banner: index.html carries a shell banner — that is what makes the guard a discriminator");

has(MY, '<link rel="canonical" href="https://politidex.fyi/money" />',
  "head: the canonical is politidex.fyi/money");
has(MY, '<meta property="og:url" content="https://politidex.fyi/money" />',
  "head: og:url matches the canonical");
lacks(MY_MARKUP, 'name="robots"', "head: no robots meta — a public disclosure lane is meant to be indexed and linked");
// THE SITEMAP IS NOT ASSERTED HERE, DELIBERATELY — same reason as the other two
// shells' harnesses record: advertising the three new addresses is its own pass
// (sitemap.xml, gen-sitemap.mjs, robots.txt and the canonicals are one system
// with one test), and nothing is pinned here in either direction so that pass
// can land without editing this file.

const attrs = [...MY_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in money.html is root-absolute (offenders: ${relative.join(", ")})`);

const TAGS = [...MY_MARKUP.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inline = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
const parseFails = [];
for (const b of inline) { try { new vm.Script(b.body); } catch (e) { parseFails.push(e.message); } }
eq(parseFails.length, 0, `paths: every inline <script> block in money.html parses (${parseFails[0] || ""})`);
ok(inline.length >= 2,
  `paths: only ${inline.length} inline blocks found — the copied tracker is one of them, and the parse above is ` +
  "the only thing standing between a truncated copy and a blank grid");

const flagIdx = MY.indexOf("window.__PDX_MONEY_DOC = true");
ok(flagIdx > 0, "flag: money.html does not set __PDX_MONEY_DOC at all");
const firstSrc = MY_MARKUP.search(/<script\b[^>]*\bsrc=/);
ok(flagIdx < firstSrc, "flag: a script with a src is loaded before the flag is set");
eq((MY.match(/__PDX_MONEY_DOC\s*=/g) || []).length, 1,
  "flag: the flag is assigned more than once on this document — one owner, one assignment");
lacks(CODE, "location.pathname === ",
  "flag: money-room.js compares location.pathname — /money, /money/ and /money.html are three spellings of one " +
  "document that a path test gets differently");

// THE AUTH STUB IS THE ONE THE OTHER INNER SHELLS SHIP, NOT A THIRD ONE, and
// the declaration is checked by BYTES against me.html.
//
// THESE LINE NUMBERS MOVE. When me.html changes above line 1809 the range in all
// three new shells must be RE-DERIVED — locate the run in me.html, do not
// recompute it by arithmetic. test-person-shell.mjs states the same rule for the
// seven copies it fences.
{
  const a = 1815, b = 1870;
  const slice = ME.split("\n").slice(a - 1, b).join("\n");
  has(MY, `COPIED VERBATIM FROM me.html LINES ${a}–${b}`,
    "auth: money.html does not declare which lines of me.html its Firebase block is");
  ok(MY.indexOf(slice) > 0,
    `auth: me.html lines ${a}–${b} are not present in money.html byte for byte — either the copy drifted or the ` +
    "declared range is stale. Re-derive the range from me.html, do not adjust the number by hand");
  has(slice, "window.PDXAuth", "auth: the sliced range is not the PDXAuth block — the declared range names the wrong lines");
}
has(MY, '<div id="pdx-shell-acct" data-pdx-acct-sig="unknown"></div>',
  "auth: the account slot is not empty-with-unknown — a Join CTA in the markup is a returning member told to sign up");
lacks(MY_BARE, "Join", "auth: the word Join is in this document's markup — the chip paints that, and only after auth answers");
has(MY_MARKUP, '<script defer src="/shell-account-chip.js"></script>',
  "auth: the chip is not loaded, so the account slot would stay empty forever");

// THE BUDGETS. This document is the largest of the three because it carries the
// copied tracker in its own body — which is the point: the tracker is the data,
// and a reader of /money is the one reader who came for it.
const gz = gzipSync(Buffer.from(MY, "utf8")).length;
ok(gz < 40 * 1024, `budget: money.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 40 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 8, `budget: money.html loads ${localSrcs.length} local scripts (ceiling 8)`);
ok(localSrcs.every((s) => s.charAt(0) === "/"), "budget: every local script src is root-absolute");
// READ OFF THE ASSET REFERENCES, NOT OUT OF THE MARKUP. The copied tracker's
// own comments name profiles-full.js — that is where the composite score it
// explains used to live — so a substring sweep over this document would fail on
// the sentence explaining why the file is absent. What matters is whether the
// browser is told to FETCH it, so the list under test is every local src and
// every stylesheet href this document declares.
const REFS = [...localSrcs,
  ...[...MY_MARKUP.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1])];
[["app.css", "986 KB of homepage cascade — money-lane.css is 27 KB of it, lifted by selector"],
  ["compare-hub.js", "758 KB of homepage engine — the chip is shell-account-chip.js"],
  ["profiles-full.js", "598 KB of person overlay — money-room.js re-homes those controls onto /p/<pid> instead"],
  ["ballot-breakdown.js", "407 KB of ballot machinery, and nothing here resolves a district"],
  ["evidence-locker.js", "310 KB of locker, and the Evidence Locker is its own address"],
  ["cmp-data.js", "the Compare Hub's dataset, for a page with no comparison on it"]]
  .forEach(([f, why]) => eq(REFS.filter((r) => r.indexOf(f) >= 0).length, 0,
    `budget: ${f} is fetched by this document — ${why}`));
["/finance-lane.css", "/money-lane.css", "/shell-chrome.css"].forEach((s) =>
  has(MY, `<link rel="stylesheet" href="${s}" />`, `budget: ${s} is not loaded — the lane would paint unstyled`));

// THE LANE'S SHEET IS A SUBSET OF WHAT THE FRONT PAGE ALREADY SHIPPED: this is
// a MOVE, not a redesign. Every class in it is either in app.css or in this
// document's own markup.
{
  const LC = cssBare(R("money-lane.css"));
  const APP = cssBare(R("app.css"));
  const sels = [...LC.matchAll(/^\s*(\.[a-z][\w-]*)[^{]*\{/gm)].map((m) => m[1]);
  const own = [...new Set(sels)];
  ok(own.length > 20, `css: only ${own.length} classes are in money-lane.css — the sheet was not lifted, it was written`);
  const invented = own.filter((s) => APP.indexOf(s) < 0 && MY_BARE.indexOf(s.slice(1)) < 0);
  eq(invented.length, 0,
    `css: money-lane.css declares classes that are in neither app.css nor this document (${invented.slice(0, 5).join(", ")})`);
  // AND THE TWO SHEETS DO NOT DECLARE EACH OTHER'S JOB. finance-lane.css owns
  // the tokens and money-lane.css CONSUMES them — var(--pdx-money-fill, …) with
  // a fallback is a read, and it is correct here. A DECLARATION is not: two
  // sheets defining one token is two greens, and the fallback in every var()
  // call is what keeps this sheet honest if it loads alone.
  const declared = (css) => [...cssBare(css).matchAll(/(^|[;{]|\s)(--pdx-money-[\w-]+)\s*:/g)].map((m) => m[2]);
  eq(declared(LC).length, 0,
    `css: money-lane.css DECLARES the lane's theme tokens (${[...new Set(declared(LC))].join(", ")}) — ` +
    "finance-lane.css owns them and this sheet may only read them");
  ok(declared(R("finance-lane.css")).length > 0,
    "css: finance-lane.css no longer declares the money tokens, so every var() in money-lane.css falls back");
}

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
ok(gz < idxGz && TAGS.length < idxTags && MY.length < INDEX.length,
  "cold: money.html is not smaller than index.html by every measure");
const cMy = cold(MY);
const cIdx = cold(INDEX);
ok(cMy.bytes < cIdx.bytes,
  `cold: /money's critical path is ${(cMy.bytes / 1024).toFixed(0)} KB gzipped and /'s is ` +
  `${(cIdx.bytes / 1024).toFixed(0)} KB — the address exists to be the smaller one`);
ok(cMy.bytes * 8 < cIdx.bytes,
  `cold: /money is only ${(cIdx.bytes / cMy.bytes).toFixed(1)}× cheaper than the front page. It was roughly forty ` +
  "times when it shipped; a ratio this low means the homepage stack has been re-linked here");
console.log(`  /money: ${(MY.length / 1024).toFixed(0)} KB raw / ${(gz / 1024).toFixed(1)} KB gz, ` +
  `${localSrcs.length} local scripts, cold path ${(cMy.bytes / 1024).toFixed(0)} KB over ${cMy.files} files` +
  `  (/: ${(INDEX.length / 1024).toFixed(0)} KB raw / ${(idxGz / 1024).toFixed(1)} KB gz, ${idxTags} tags, ` +
  `cold path ${(cIdx.bytes / 1024).toFixed(0)} KB over ${cIdx.files} files)`);

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE LANE IS THE WHOLE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("3 · two blocks came, the homepage did not, and neither block is a grade");

// WHAT CAME. The section, the sector filter, the grid, the as-of line and the
// coverage host — amounts, composition and coverage, which is the brief.
[['<section id="follow-the-money"', "the lane's section itself"],
  ['id="ftm-grid"', "the card grid"],
  ['id="ftm-count"', "the count line"],
  ['id="ftm-asof"', "the as-of line — a filing with no date is a figure with no provenance"],
  ['id="ftm-sec-all"', "the sector filter"],
  ['id="pdx-money-coverage"', "the coverage host"],
  // BLOCK 2. The Wealth Transparency board followed the filings here in a later
  // pass, so /money is one page with two blocks and two archives: what a
  // campaign RAISED above, what a person OWNS below.
  ['<section id="wealth-leaderboard"', "the wealth disclosures section"],
  ['id="wl-grid"', "the wealth card grid"],
  ['id="wl-count"', "the wealth count line"],
  ['id="wl-tab-gainers"', "the wealth tabs"],
  ['<script defer src="/wealth-lane.js"></script>', "the wealth block's controller"]].forEach(([n, what]) =>
  has(MY_MARKUP, n, `came: ${what} did not come with the room`));

// AND THE FILINGS COME FIRST. "Campaign filings, then wealth disclosures" is the
// reading order, not a preference: the block with the coverage sentence and the
// unprompted disclaimer opens the document.
ok(MY.indexOf('<section id="follow-the-money"') < MY.indexOf('<section id="wealth-leaderboard"'),
  "order: the wealth block is printed ABOVE the campaign filings — amounts owned is the second question at this " +
  "address, not the first");

// THE WEALTH BLOCK IS A DISCLOSURE, NOT A GRADE, AND IT SAYS SO BEFORE IT SAYS
// ANYTHING ELSE. The ⚠ line is inside the section and above the first control.
{
  const wa = MY_BARE.indexOf('<section id="wealth-leaderboard"');
  const wb = MY_BARE.indexOf("</section>", wa);
  ok(wa > 0 && wb > wa, "wealth: the wealth section is not a closed run of markup");
  const WEALTH = MY_BARE.slice(wa, wb);
  has(WEALTH, "Net worth change alone does not prove integrity or corruption",
    "wealth: the disclaimer is gone — a net-worth delta with no disclaimer reads as an accusation");
  ok(WEALTH.indexOf("DISCLAIMER") < WEALTH.indexOf('id="wl-tab-gainers"'),
    "wealth: a control is printed above the disclaimer — the qualification has to arrive before the ranking does");
  ok(WEALTH.indexOf("<h1") < 0, "wealth: the second section took an h1 — block 1 opens the document");
  has(WEALTH, "OpenSecrets", "wealth: the block does not name the archive a reader can check for themselves");
}

// AND IT IS NOT IN THE 💰 CHIP MATH. The chip, the composition read and the
// coverage sentence are finance-lane.js's, computed off /ftm-data.js. The wealth
// module is named by none of them and names none of them back; the two archives
// meet on this page and nowhere in the code.
{
  const WL = jsBare(R("wealth-lane.js"));
  ok(!/\bFTM_DATA\b|\bFTM_FUNDING\b|\bFTM_AS_OF\b|\b_FTM_BY_ID\b/.test(WL),
    "wealth: wealth-lane.js can see the filings index — amounts owned must not be able to move amounts raised");
  ["_pdxFinanceFiling", "_pdxFinanceSignal", "_pdxFinanceRecord", "PDXFinanceLane"].forEach((sym) =>
    lacks(WL, sym, `wealth: wealth-lane.js reads ${sym} — the wealth block is an input to no filings figure`));
  ["WEALTH_DATA", "wealth-lane", "wl-grid"].forEach((sym) =>
    lacks(jsBare(FIN), sym, `chip math: finance-lane.js references ${sym} — the 💰 chip does not read net worth`));
  lacks(jsBare(R("ftm-data.js")), "WEALTH_DATA", "chip math: the filings module references the wealth data");
  // The mount gate: a module that assumes its grid throws on every document
  // without one, and this one is loaded from a shell that may outlive the block.
  has(WL, "getElementById('wl-grid')", "wealth: the module does not look its mount up");
  ok(/if\s*\(!grid\)\s*return/.test(WL),
    "wealth: wealth-lane.js has no mount gate — it would throw on every document with no #wl-grid");
}
// ONE h1, AND IT IS THE LANE'S NAME. On the front page this was an <h2> among
// twenty sections; here it is the document. That single tag pair is also the ONLY
// difference the fence in section 4 normalises.
eq((MY_BARE.match(/<h1/g) || []).length, 1, "came: the document does not have exactly one h1");
// TWO section-titles, ONE h1. Both blocks wear the house header class; only the
// first one is the document's heading.
eq((MY_BARE.match(/class="section-title/g) || []).length, 2,
  "came: the document no longer has exactly two section headers — campaign filings and wealth disclosures");
// COVERAGE IS SAID OUT LOUD, AND IT IS THE LANE'S SENTENCE, NOT THIS PAGE'S.
has(CODE, "coverageHtml",
  "coverage: money-room.js no longer asks finance-lane.js for the sentence — a second copy of 'N of M filed' is a " +
  "second answer about how much of the roster is covered");
eq((MY_BARE.match(/of \d+ filed/g) || []).length, 0,
  "coverage: a coverage figure is hard-coded into this document's markup — the denominator is the roster and the " +
  "roster arrives at runtime");
has(FIN, "function coverageHtml", "coverage: finance-lane.js no longer publishes coverageHtml()");
// THE NOSCRIPT NOTE, which is also the disclosure in plain English.
{
  const ns = (/<noscript>[\s\S]*?<\/noscript>/.exec(MY_MARKUP.slice(MY_MARKUP.indexOf("<main"))) || [""])[0];
  ok(ns.length > 100, "noscript: a reader with no JavaScript is told nothing at all");
  has(ns, "do not imply", "noscript: the note does not carry the lane's own disclaimer");
  has(ns, "fec.gov", "noscript: the note does not link the archive a reader can check for themselves");
}

// WHAT DID NOT COME.
[['id="hero"', "the homepage hero"],
  ['id="who-represents-me"', "the Who Represents Me card"],
  ['id="pdx-door1-workspace"', "Door 1's work layer"],
  ['id="pdx-d1-body"', "Door 1's body"],
  ['id="voter-hub"', "the ballot workspace"],
  ['id="agenda"', "the Mandate, which is its own address"],
  ['id="judicial-lane"', "the courts lane, which is its own address"],
  ["<template", "an inert template — the Evidence Locker's is the big one and it is not here"],
  ["el-workspace-tpl", "the Evidence Locker workspace template"],
  ["ms-shell-tpl", "the my-stances shell template"],
  // THE ONE MONEY SURFACE THAT DID NOT COME, AND WAS NOT KEPT EITHER. The front
  // page's #ftm-leaderboard ranked five people #1–#5 with a hand-set 0-100
  // integrity grade under each. It was DELETED in the pass that moved the other
  // two blocks here, because a board that ranks people by a typed number is the
  // grade this lane publishes `scored: false` to refuse. It is not on /money and
  // it is not on the front page.
  ['id="ftm-leaderboard"', "the retired #N-by-funding board, which was deleted rather than moved"],
  ["ftm-lb-rank", "the retired board's rank column"]].forEach(([n, what]) =>
  lacks(MY_BARE, n, `walls: ${what} is on this document — that is the front page wearing a new URL`));
[['id="ftm-leaderboard"', "the #N-by-funding board"],
  ["ftm-lb-rank", "its rank column"],
  ["FTM_LB_DATA", "its hand-set integrity grades"]].forEach(([n, what]) =>
  lacks(INDEX_NC, n, `walls: ${what} is still on the front page — it was deleted, not relocated`));

// THE DENYLIST. The lane publishes `scored: false`; nothing on this page may
// imply otherwise.
// TWO OF THESE WORDS ARE ON THE PAGE, AND THEY BELONG THERE — the lane's own
// wall paragraph names what it is not an input to ("Nothing on this lane is an
// input to Direction Match, to ⚖️ Word vs Action, to a formal pattern tier…").
// That sentence is the reason the words are allowed nowhere ELSE, so it is
// lifted out first and the sweep runs over the rest of the document.
const WALL = (/<p[^>]*>(?:(?!<\/p>)[\s\S])*?The wall\.[\s\S]*?<\/p>/.exec(MY_BARE) || [""])[0];
ok(WALL.indexOf("Direction Match") > 0,
  "wall: the lane's wall paragraph is gone from this document — it is the sentence that makes every name below a " +
  "refusal rather than a claim");
has(WALL, "Nothing on this lane is an input to", "wall: the wall paragraph no longer says the lane feeds nothing");
const REST = MY_BARE.split(WALL).join(" ");
["Direction Match", "Word vs Action", "0–100", "0-100", "PRIMARY", "Your Match",
  "Grassroots-funded", "Big-money", "Mixed funding"].forEach((w) =>
  lacks(REST, w, `denylist: "${w}" is printed on the money lane outside the wall paragraph — a disclosure is not a grade`));
ok(!/\bftm-(?:score|grade|rating|tier|rank)\b/.test(MY_BARE), "denylist: a score-shaped element is in the lane's markup");
// NO SORT BY DOLLARS. The sector filter is a FILTER; a dollars-ranked grid is a
// league table of who raised most, which is the ranking the wall forbids.
ok(!/<option[^>]*value="(?:raised|amount|dollars|funding)-desc"/.test(MY_BARE),
  "denylist: the grid can be sorted by dollars raised, which is a ranking the lane publishes scored:false to refuse");
// AND THE WALL IS BORROWED, NOT RESTATED.
has(FIN, "NEVER_FEEDS", "wall: finance-lane.js no longer declares NEVER_FEEDS");
eq((CODE.match(/NEVER_FEEDS/g) || []).length, 0,
  "wall: money-room.js restates the NEVER_FEEDS list — two copies of a wall is two walls, and they drift");
has(FIN, "scored: false", "wall: finance-lane.js no longer publishes scored:false");
// NO LIVE FEC. The figures are hand-verified through
// scripts/finance-integrity-refresh.mjs, which prints a draft for a human and
// writes nothing. Links to the archives are correct and expected — a FETCH is
// not, so this is asserted over the code, not over the markup.
[ROOM, MY_BARE].forEach((src, i) => {
  ok(!/fetch\s*\(\s*['"`]https?:\/\/(?:api\.)?(?:open|www\.fec)/.test(src),
    `fec: ${i ? "this document" : "money-room.js"} fetches finance data live — every figure here is hand-verified`);
});
lacks(CODE, "api.open.fec.gov", "fec: money-room.js names the FEC API");
has(MY, "NO LIVE FEC", "fec: the banner no longer states the rule, which is the only place a future pass would read it");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · NOTHING IS COPIED ANY MORE — NOT THE FIGURES, AND NOT THE MARKUP
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the lane moved off the front page, and the front page kept a door");

// WHAT THIS SECTION USED TO BE, AND WHY IT IS A DIFFERENT SHAPE NOW.
//
// It fenced TWO slices of index.html. First the tracker script — 931 lines of
// hand-verified campaign finance data, re-read out of index.html on every run
// and byte-compared against the paste in this document, because a figure edited
// on one side only is two answers about one candidate's money. Then, after that
// became /ftm-data.js, just the section MARKUP: index.html's lines, normalised
// by exactly one declared change (h2 → h1, because here the section IS the
// document), with the range spelled out in money.html so the next reader did
// not have to search for it.
//
// BOTH COPIES ARE GONE, so both fences are. The front page no longer carries
// the Follow the Money section, the sector filter, the card grid or the Wealth
// Transparency board; all of it is on /money, and the Wealth board came here in
// the same pass. A byte fence needs two ends and there is one left.
//
// WHAT REPLACES IT IS AN ABSENCE TEST AND A DOOR TEST, which is the stronger
// pair for a move: the front page must not still be painting the lane (that is
// how a "move" quietly becomes a second copy), and it must still be able to
// reach it (that is how a move becomes a deletion the reader finds out about by
// hitting a dead nav item).
{
  // ── THE FRONT PAGE DOES NOT PAINT THE LANE ─────────────────────────────────
  [['<section id="follow-the-money"', "the campaign filings section"],
    ['id="ftm-grid"', "the filings card grid"],
    ['id="ftm-sec-all"', "the sector filter"],
    ['id="ftm-count"', "the filings count line"],
    ['id="ftm-asof"', "the filings as-of line"],
    ['<section id="wealth-leaderboard"', "the Wealth Transparency board"],
    ['id="wl-grid"', "the wealth card grid"],
    ["setWealthTab", "the wealth tab controls"]].forEach(([n, what]) =>
    lacks(INDEX_NC, n, `moved: ${what} is still on index.html — the lane moved, so a copy on the front page is a ` +
      "second answer that nothing keeps in step with the first"));

  // ── AND IT STILL HAS EXACTLY ONE DOOR TO IT ────────────────────────────────
  // The nav item and the hero chip both pointed at /money before this pass. No
  // new door was added to replace what was removed: a second door to one room
  // is how two rooms start.
  ok(INDEX.indexOf('href="/money"') > 0,
    "door: the front page has no plain /money link left — the lane is unreachable from the page it left");
  has(INDEX, "💰 Follow the Money",
    "door: the nav item that names the lane is gone — a reader who used it now has nothing to use");
  // THE OLD FRAGMENTS ARE FORWARDED. Three of them named live sections on this
  // page and now name nothing, so a bookmark has to land on the room.
  ["'follow-the-money': '/money'", "'wealth-leaderboard': '/money'", "'ftm-leaderboard': '/money'"].forEach((k) =>
    has(INDEX, k, `door: the fragment forwarder is missing ${k} — an old bookmark lands on a fragment that names ` +
      "nothing on this page"));

  // ── THE 💰 CHIP ON A PERSON FILE IS NOT PART OF ANY OF THIS ────────────────
  // It is finance-lane.js's, computed off /ftm-data.js, and it was never in the
  // sections above. Both script tags stay on the front page for exactly that
  // reason, and the test that would otherwise catch their removal is this one.
  has(INDEX, '<script defer src="/ftm-data.js"></script>',
    "chip: index.html stopped loading the filings module — the person-file 💰 chip reads it directly");
  has(INDEX, '<script defer src="/finance-lane.js"></script>',
    "chip: index.html stopped loading the finance lane — the 💰 chip is painted by it");
  ok(INDEX.indexOf('src="/ftm-data.js"') < INDEX.indexOf('src="/finance-lane.js"'),
    "chip: index.html loads /ftm-data.js AFTER /finance-lane.js — the lane would read an index that is not there yet");

  // ── ONE OWNER FOR THE FIGURES ──────────────────────────────────────────────
  // Not one filings literal is left in this document, or in the front page. The
  // grid above is markup; the numbers in it come from one file.
  const LITERALS = /\bFTM_DATA\b|\bFTM_FUNDING\b|\bFTM_AS_OF\b|\b_FTM_BY_ID\b/;
  ok(!LITERALS.test(MY),
    "owner: money.html still carries a filings literal — every figure has exactly one home and it is /ftm-data.js");
  ok(!LITERALS.test(INDEX),
    "owner: index.html still carries a filings literal — the front page reads the module like everyone else");
  has(MY, '<script defer src="/ftm-data.js"></script>',
    "owner: money.html does not load the shared filings module");

  // ORDER IS THE CONTRACT, AND ON THIS DOCUMENT IT IS NOT A FORMALITY. Both tags
  // are `defer`, deferred scripts run in document order, and finance-lane.js
  // reads the index /ftm-data.js attaches. Here the lane is in <head> while the
  // section markup is in <body> — so a tag placed where the old inline block sat
  // would run AFTER the lane that needs it. It goes in the head, above the lane.
  const iData = MY.indexOf('src="/ftm-data.js"');
  const iLane = MY.indexOf('src="/finance-lane.js"');
  ok(iData > 0 && iLane > 0 && iData < iLane,
    "owner: money.html loads /ftm-data.js AFTER /finance-lane.js — the lane would read an index that is not there yet");
  ok(MY.slice(0, MY.indexOf("</head>")).indexOf('src="/ftm-data.js"') > 0,
    "owner: the filings module is not in this document's <head>, where it has to be to precede the lane");
  // The wealth controller has the same requirement for a different reason: it
  // must be deferred, because it renders into markup further down the document.
  has(MY, '<script defer src="/wealth-lane.js"></script>',
    "owner: the wealth controller is not deferred — it would run before its own grid exists");

  has(ROOM, "test-money-shell.mjs",
    "fence: money-room.js's header no longer names the test that fences its copy — the note is how the next " +
    "reader learns what may and may not drift");
  console.log("  moved: filings + wealth on /money, zero copies on / · door: nav, chip, 3 forwarded fragments");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE ROOM'S OWN CODE
// ═════════════════════════════════════════════════════════════════════════════
section("5 · the jump, the stale hash, and four controls that no longer lie");

// THE MODULE RENDERS NO FIGURE. It re-homes controls and forwards a query; every
// number, colour, bucket and sentence comes from the copied tracker or from
// finance-lane.js. This is asserted as a property of the file, because it is the
// property that makes "delete it and /money still tells the truth" true.
["FTM_DATA", "FTM_FUNDING", "FTM_AS_OF", "raised", "$"].forEach((w) =>
  lacks(CODE, w, `owner: money-room.js contains "${w}" — this file reads no figure at all, by design`));

function room(opts) {
  const o = opts || {};
  const w = makeSandbox();
  const nodes = [];
  const mk = (tag, onclick, cls) => {
    const n = {
      tagName: tag, className: cls || "", hidden: false, style: {}, innerHTML: "",
      _attrs: onclick ? { onclick } : {},
      _kids: [],
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      removeAttribute(k) { delete this._attrs[k]; },
      querySelectorAll() { return this._kids; },
    };
    nodes.push(n);
    return n;
  };
  const cards = (o.cards || []).map((c) => {
    const card = mk("DIV", c.onclick, "dir-card");
    card._kids = (c.kids || []).map((k) => mk("BUTTON", k, ""));
    return card;
  });
  const grid = mk("DIV", null, "grid");
  grid._kids = cards;
  const cov = mk("DIV", null, "cov");
  w.document.getElementById = (id) => (id === "ftm-grid" ? grid : id === "pdx-money-coverage" ? cov : null);
  w.document.querySelectorAll = () => [];
  w.document.readyState = "complete";
  const replaced = [];
  const assigned = [];
  w.location = {
    href: "https://politidex.fyi/money", pathname: "/money", search: o.search || "", hash: o.hash || "",
    origin: "https://politidex.fyi",
    replace: (h) => replaced.push(h), assign: (h) => assigned.push(h),
  };
  const rs = [];
  w.history = { replaceState: (a, b, c) => rs.push(c) };
  const timers = [];
  w.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  w.MutationObserver = class { observe() {} };
  // person-link.js is the one owner of "what is this person's URL". The real
  // module is loaded here rather than stubbed, so the href this file produces is
  // the href the rest of the site produces.
  const ctx = vm.createContext(w);
  vm.runInContext(R("person-link.js"), ctx, { filename: "person-link.js" });
  if (o.lane !== false) w.PDXFinanceLane = { coverageHtml: () => o.coverage || "13 filings on file" };
  vm.runInContext(ROOM, ctx, { filename: "money-room.js" });
  return { w, cards, grid, cov, replaced, assigned, rs, timers, nodes };
}

// THE JUMP. /money?p=<pid> is forwarded ONCE, with replace() so this document
// never becomes a step in the reader's history, to the money section the person
// file already owns.
{
  const r = room({ search: "?p=mike_lee" });
  eq(r.replaced.length, 1, "jump: /money?p=<pid> was not forwarded exactly once");
  ok(r.replaced[0] && /^\/p\/[^?#]+#money$/.test(r.replaced[0]),
    `jump: the forward is ${JSON.stringify(r.replaced[0])} — it must be /p/<pid>#money, which is the section that exists`);
  eq(r.assigned.length, 0, "jump: the forward used assign(), so Back returns here and forwards again");
  // AND NOTHING ELSE RAN. The forward is synchronous and first.
  eq(r.timers.length, 0, "jump: the room booted its paint schedule on a document that is on its way somewhere else");
}
// A pid person-link.js cannot place is NOT forwarded anywhere: the reader stays
// on a real page about the lane rather than being sent to a 404 built out of
// their own typo.
{
  const r = room({ search: "?p=" });
  eq(r.replaced.length, 0, "jump: an empty ?p= was forwarded somewhere");
  ok(r.timers.length > 0, "jump: the room did not boot for a reader with no ?p= to forward");
}
// THE STALE HASH, CLEARED IN ONE HOP. index.html forwards #follow-the-money
// here; keeping it would leave a fragment in the address bar that names a
// section this document does have — but the canonical address is /money.
{
  const r = room({ hash: "#follow-the-money" });
  eq(r.rs.length, 1, "hash: the stale #follow-the-money was not cleared with replaceState");
  eq(r.rs[0], "/money", "hash: the cleared address is not the bare path");
  const keep = room({ hash: "#donors" });
  eq(keep.rs.length, 0, "hash: a fragment that is not the stale one was cleared anyway");
}
// THE FOUR CONTROLS. Two are re-homed onto the person's real address; two have
// no standalone equivalent and are hidden for BOTH the eye and the screen
// reader, because a control that cannot act must not be announced either.
{
  const r = room({
    cards: [{
      onclick: "openMediumModal('mike_lee', event)",
      kids: ["showProfile('mike_lee', event)", "window.pdxSharePolitician('mike_lee')", "window._pdxCompareWith('mike_lee')"],
    }],
  });
  const card = r.cards[0];
  eq(card.getAttribute("onclick"), null,
    "controls: the card's onclick was left in place — a browser that fires the attribute first still throws a " +
    "ReferenceError into the console on every click");
  ok(/^\/p\/[^?#]+#money$/.test(card.getAttribute("data-pdx-money-href") || ""),
    "controls: the card does not navigate to the person's real money section");
  eq(card.getAttribute("data-pdx-money-rehomed"), "1", "controls: the card was not marked, so a re-render doubles the work");
  const [prof, share, cmp] = card._kids;
  ok(/^\/p\/[^?#]+#money$/.test(prof.getAttribute("data-pdx-money-href") || ""),
    "controls: View Full Profile does not point at the person's file");
  [["the share glyph", share], ["Compare funding", cmp]].forEach(([what, b]) => {
    eq(b.hidden, true, `controls: ${what} is still painted, and its handler is not on this document`);
    eq(b.getAttribute("aria-hidden"), "true", `controls: ${what} is hidden from the eye but still announced`);
    eq(b.getAttribute("onclick"), null, `controls: ${what} kept its onclick`);
  });
  // IDEMPOTENT. The grid is re-rendered on every sector filter change.
  const before = JSON.stringify(card._attrs);
  r.w.PDXMoneyRoom.rehomeGrid();
  eq(JSON.stringify(card._attrs), before, "controls: a second pass over the same card changed it again");
}
// A CARD WITH NO PID WE CAN DEFEND IS NOT A DOOR. It still shows everything it
// showed; it just stops pretending to be a link.
{
  const r = room({ cards: [{ onclick: "" }] });
  eq(r.cards[0].getAttribute("data-pdx-money-href"), null, "controls: a card with no pid was given a click target anyway");
  eq(r.cards[0].style.cursor, "default", "controls: a card with no address still looks clickable");
}
// COVERAGE IS ASKED FOR, NOT COMPUTED, and a lane that has not landed prints
// nothing rather than a placeholder.
{
  const r = room({ coverage: "<p>13 of 104 filed</p>" });
  r.timers.forEach((t) => { try { t.fn(); } catch (e) {} });
  has(r.cov.innerHTML, "13 of 104 filed", "coverage: the borrowed sentence was never painted");
  const none = room({ lane: false });
  none.timers.forEach((t) => { try { t.fn(); } catch (e) {} });
  eq(none.cov.innerHTML, "", "coverage: something was painted into the coverage host with no lane to ask");
}
// THE DOORS. The front page keeps a door card, the nav rows point at the
// address, and no control still points at the old fragment.
{
  const IDX_BARE = htmlBare(INDEX);
  ok((IDX_BARE.match(/href="\/money"/g) || []).length >= 1, "door: the front page no longer links the lane at its own address");
  eq((IDX_BARE.match(/href="#follow-the-money"/g) || []).length, 0,
    "door: a control on the front page still points at #follow-the-money rather than the room");
  const FWD = /var LANE = \{[\s\S]*?\};/.exec(INDEX);
  must(!!FWD, "index.html no longer declares the LANE hash-forward table");
  ["'follow-the-money': '/money'", "'ftm': '/money'"].forEach((n) =>
    has(FWD[0], n, `forward: ${n} is not in the table — that bookmark lands on the front page`));
  ["stances.html", "evidence.html"].forEach((f) =>
    has(R(f), "'follow-the-money': '/money'", `${f}: #follow-the-money is not routed to the room`));
  has(MY, 'href="/money" aria-current="page"',
    "nav: /money does not mark itself current — and it must still navigate, because a self-link that does nothing lies");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SERVICE WORKER
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the room is precached with its vocabulary and its sheets");

const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER), `sw: CACHE_VERSION does not read as one version literal (got "${VER}")`);
ok(Number(VER.slice(1)) >= 211,
  `sw: CACHE_VERSION is ${VER} — three new documents shipped in this pass, and a warm device keeps serving the ` +
  "old front page without a rename");
has(SW, "money.html", "sw: the version log has no entry naming the new shell");

const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL, "sw.js no longer declares SHELL_ASSETS as one literal array");
["/money.html", "/money-room.js", "/money-lane.css", "/finance-lane.js", "/finance-lane.css",
  "/shell-chrome.css", "/shell-account-chip.js", "/person-link.js"]
  .forEach((a) => has(SHELL, `'${a}'`, `sw: ${a} is not precached — the room would open unstyled, or with lying controls`));

const NAV = (/const MONEY_NAV_RE = (\/[^\n;]+\/);/.exec(SW) || [, ""])[1];
ok(!!NAV, "sw: MONEY_NAV_RE is not one literal");
if (NAV) {
  const re = new RegExp(NAV.slice(1, NAV.lastIndexOf("/")));
  ["/money", "/money/"].forEach((p) => ok(re.test(p), `sw: ${p} is not recognised as the money room`));
  ["/moneys", "/money/mike_lee", "/money.html.bak", "/me", "/mandate", "/voice", "/p/mike_lee", "/"]
    .forEach((p) => ok(!re.test(p), `sw: ${p} is served the money document`));
}
// THE OFFLINE FALLBACK, before the '/' branch. The amounts and the tracker are
// in this document's own body, so an offline reader gets the real figures rather
// than a front page whose lane is now a door.
{
  const mAt = SW.indexOf("shell.match('/money.html')");
  const homeAt = SW.indexOf("shell.match('/index.html')");
  ok(mAt > 0, "sw: there is no offline branch for /money");
  ok(homeAt < 0 || mAt < homeAt, "sw: the '/' offline branch is declared before /money's, and would answer first");
}

// ═════════════════════════════════════════════════════════════════════════════
function report() {
  console.log(
    `\n${failures.length ? "✗" : "✓"} money shell: ${passed} checks passed` +
    (failures.length ? `, ${failures.length} failed` : "")
  );
  if (failures.length) {
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}
report();
