#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for courts.html — THE NINTH SHELL, and the archive that became a list
// with a map
// ─────────────────────────────────────────────────────────────────────────────
// The third branch used to be two of the tallest blocks on the front page:
// #judicial-lane carried the reader's own retention questions AND the whole Utah
// courts archive — a hundred and twenty-six judges in one scroll — on the
// document whose job is two doors. A previous pass moved both to /courts and left
// one short card behind. This pass made region B navigable: the archive is a list
// with a map rather than a roster to scroll.
//
// The failure modes, each of which ships looking fine:
//
//   1. /courts RESOLVES TO THE FRONT PAGE, or the trailing-slash form hops
//      instead of answering — two spellings of one room disagreeing.
//   2. A RELATIVE PATH BECOMES AN HTML-AS-JS BUG. /courts/ is served 200, so a
//      bare src="judicial-ballot.js" resolves to /courts/judicial-ballot.js, the
//      rewrite answers with this document, and the browser is told to parse HTML
//      as JavaScript. netlify.toml's own comment names this file as the guard.
//   3. A PATH SNIFF REPLACES THE FLAG. /courts, /courts/ and a preview server's
//      /courts.html are three spellings a pathname test gets differently;
//      __PDX_COURTS_DOC is the one answer to "which document is this".
//   4. THE FILTER INVENTS A CLAIM. A chip that reads as "your court" turns an
//      archive listing into a seat assignment. Region B is for every reader
//      anywhere; only region A is resolved for where this reader votes.
//   5. THE FILTER DOES NOT FILTER. Chips that restyle a row, or hide a court's
//      heading while leaving its judges on the page, are the defect this pass
//      exists to prevent — the reader still scrolls the names.
//   6. A CHIP FILTERS TO NOTHING. A judicial-district number with no judges
//      behind it, or district numbers offered for a statewide court, is a
//      control that answers with an empty page.
//   7. A REPAINT EATS THE SELECTION. paintCourts() reprints region B on boot and
//      on four settle timers; a filter held in the DOM rather than in the module
//      would be reset out from under the reader on every one of them.
//   8. REGION A MOVES. The questions band is resolver-defended: statewide from a
//      state, trial courts from the county's own division, and a court with no
//      map on file names the missing map and claims nobody. A filter in region B
//      is not allowed to touch any of that.
//   9. A JUDGE GETS A SCORE, A PARTY OR AN ADDRESS OF THEIR OWN. Retention is an
//      office on a ballot; the only figure near a judge is JPEC's own phrase, and
//      a judge's file is /p/<pid>, which person.html already owns.
//  10. THE SERVICE WORKER OR THE SITEMAP GETS IT WRONG — a shell with no
//      renderer, a stale sheet against a new document, or an unlisted room.
//
// Six sections:
//
//   1. THE REWRITE — two exact 200s, no wildcard, nothing in front of them.
//   2. THE DOCUMENT — banner, canonical, root-absolute paths, the one flag,
//      the two empty mounts, the budgets.
//   3. REGION B IS A LIST WITH A MAP — the chips, the computed default, what a
//      selection actually hides, and what a repaint keeps.
//   4. REGION A IS UNCHANGED — resolver-defended, county by county, fail-closed,
//      and untouched by anything region B does.
//   5. THE DENYLIST — no score, no party, no per-judge address, no second
//      resolver.
//   6. THE SERVICE WORKER AND THE SITEMAP.
//
//   node scripts/test-courts-shell.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const CT = R("courts.html");
const INDEX = R("index.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");
const SITEMAP = R("sitemap.xml");
const JB = R("judicial-ballot.js");
const JCSS = R("judicial-retention.css");

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) => blank(b));
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
const CT_BARE = styleBare(htmlBare(CT));
const JB_CODE = jsBare(JB);
const JCSS_BARE = cssBare(JCSS);

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
section("1 · /courts and /courts/ are one room, declared twice and exactly");

const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const b = m[1];
  const g = (k) => ((new RegExp(`^[ \\t]{2}${k}\\s*=\\s*"?([^"\\n]*)"?`, "m")).exec(b) || [, ""])[1].trim();
  return { from: g("from"), to: g("to"), status: g("status"), force: g("force") };
});
ok(RULES.length > 10, `toml: the redirect table parsed (${RULES.length} rules)`);

const idxOf = (from) => RULES.findIndex((r) => r.from === from);
for (const path of ["/courts", "/courts/"]) {
  const i = idxOf(path);
  ok(i >= 0, `toml: ${path} has no rule of its own — the room is only reachable as a file`);
  if (i >= 0) {
    eq(RULES[i].to, "/courts.html", `toml: ${path} does not serve the ninth shell`);
    eq(RULES[i].status, "200", `toml: ${path} is not a rewrite — a redirect here is a hop, not a room`);
  }
  // NOTHING IN FRONT OF THEM. Netlify takes the first matching rule, so a
  // wildcard declared earlier that also matches this path would win silently.
  const shadow = RULES.slice(0, i < 0 ? RULES.length : i).filter((r) => {
    if (!r.from || r.from === path) return false;
    if (r.from.indexOf("*") < 0) return false;
    const re = new RegExp("^" + r.from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return re.test(path);
  }).map((r) => r.from);
  eq(shadow.length, 0, `toml: ${path} is shadowed by an earlier wildcard (${shadow.join(", ")})`);
}
// NO WILDCARD OF ITS OWN, matching sw.js's COURTS_NAV_RE: /courtss and
// /courts/district are not this address, and never silently become it.
eq(RULES.filter((r) => /^\/courts/.test(r.from) && r.from.indexOf("*") >= 0).length, 0,
  "toml: a /courts wildcard exists — every path under it would answer with this document");
// The two paths are disjoint from the earlier shells' rules.
["/ballot", "/me", "/stances", "/evidence"].forEach((p) => {
  const i = idxOf(p);
  ok(i < 0 || RULES[i].to !== "/courts.html", `toml: ${p} was pointed at courts.html`);
});

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the banner, the canonical, root-absolute paths, the one flag");

// THE BANNER, read by sw.js to refuse a cached '/' whose body is this document.
// The regex is taken OUT OF sw.js rather than retyped, so a shell added there
// without its banner here fails on this line.
const BRE_SRC = (/const SUB_SHELL_BANNER_RE = (\/[^\n]+\/);/.exec(SW) || [, ""])[1];
must(!!BRE_SRC, "sw.js no longer declares SUB_SHELL_BANNER_RE as one literal");
const BRE = new RegExp(BRE_SRC.slice(1, BRE_SRC.lastIndexOf("/")), BRE_SRC.slice(BRE_SRC.lastIndexOf("/") + 1));
const bm = BRE.exec(CT.slice(0, 4096));
ok(bm && bm[1] === "courts",
  "banner: courts.html declares itself the ninth shell inside sw.js's own 4096-character sniff window");
has(CT, "/courts IS ITS OWN DOCUMENT", "banner: the banner names the address it serves");
ok(!BRE.test(INDEX), "banner: index.html carries no shell banner — that is what makes the guard a discriminator");

// A PUBLIC BROWSE ROOM: indexable, canonical on the www host the apex 301s to.
has(CT, '<link rel="canonical" href="https://politidex.fyi/courts" />',
  "head: the canonical is politidex.fyi/courts");
has(CT, '<meta property="og:url" content="https://politidex.fyi/courts" />',
  "head: og:url matches the canonical");
lacks(CT, 'name="robots"', "head: no robots meta — a public browse room is indexed");
lacks(CT, "application/ld+json",
  "head: no JSON-LD — index.html's WebSite block describes the front page, and a browse room is not it");

// EVERY SAME-ORIGIN PATH IS ROOT-ABSOLUTE. This is the assertion netlify.toml's
// own comment promises: served at /courts/, a bare src is answered with this
// document and parsed as JavaScript, with no error naming the cause.
const attrs = [...CT_BARE.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
const relative = attrs.filter((v) => v && !/^(?:\/|https?:|#|mailto:|data:|\/\/)/.test(v));
eq(relative.length, 0,
  `paths: every same-origin src/href in courts.html is root-absolute (offenders: ${relative.join(", ")})`);

const TAGS = [...CT.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1] || "", body: m[2] }));
const inline = TAGS.filter((t) => !/\bsrc\s*=/.test(t.attrs) && t.body.trim());
let parseFails = [];
for (const b of inline) { try { new vm.Script(b.body); } catch (e) { parseFails.push(e.message); } }
eq(parseFails.length, 0, `paths: every inline <script> block in courts.html parses (${parseFails[0] || ""})`);

// ONE FLAG, NO HEURISTICS, AND IT IS FIRST. A module that looks for the flag
// before it is set paints the homepage card into a document with no lane.
const flagIdx = CT.indexOf("window.__PDX_COURTS_DOC = true");
ok(flagIdx > 0, "flag: courts.html does not set __PDX_COURTS_DOC at all");
const firstSrc = CT.search(/<script\b[^>]*\bsrc=/);
ok(flagIdx < firstSrc, "flag: a script with a src is loaded before the flag is set");
eq((CT.match(/__PDX_COURTS_DOC\s*=/g) || []).length, 1,
  "flag: the flag is assigned more than once on this document — one owner, one assignment");
ok(!/location\.pathname/.test(JB_CODE),
  "flag: judicial-ballot.js sniffs location.pathname — /courts, /courts/ and /courts.html are three " +
  "spellings of one document that a path test gets differently");
has(JB_CODE, "__PDX_COURTS_DOC", "flag: judicial-ballot.js does not read the flag it is switched by");

// THE TWO MOUNTS ARE EMPTY. A pre-rendered band is a shape that reads as data to
// a reader whose JavaScript never arrived.
["courts-ballot", "courts-archive"].forEach((id) => {
  const m = new RegExp(`<div id="${id}"[^>]*>([\\s\\S]*?)</div>`).exec(CT_BARE);
  ok(!!m, `mounts: #${id} is not on the document`);
  if (m) eq(m[1].trim(), "", `mounts: #${id} ships pre-rendered markup`);
});
lacks(CT_BARE, "jr-row", "mounts: a question row is hard-coded into the document rather than painted");
lacks(CT_BARE, "jr-fchip", "mounts: a filter chip is hard-coded into the document — the module owns the chips");

// Two tripwires, not targets. This document is chrome and two mounts.
const gz = gzipSync(Buffer.from(CT, "utf8")).length;
ok(gz < 12 * 1024, `budget: courts.html is ${(gz / 1024).toFixed(1)} KB gzipped (ceiling 12 KB)`);
const localSrcs = TAGS.map((t) => (t.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/) || [])[1])
  .filter((s) => s && !/^(?:https?:)?\/\//.test(s));
ok(localSrcs.length <= 8, `budget: courts.html loads ${localSrcs.length} local scripts (ceiling 8)`);
ok(localSrcs.every((s) => s.charAt(0) === "/"), "budget: every local script src is root-absolute");
lacks(CT, "/app.css", "budget: app.css is on this document — 986 KB of homepage cascade for two regions");
lacks(CT, "firebase", "budget: Firebase is on this document — nothing here is written or per-account");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · REGION B IS A LIST WITH A MAP
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the archive filters, and a selection hides the other courts' names");

// The real modules, in the real order, with the flag on — no fixture roster and
// no second renderer. Region B's markup below is what a reader receives.
function courtsWin() {
  const w = makeSandbox();
  w.__PDX_COURTS_DOC = true;
  const els = {};
  w.document.getElementById = (id) => els[id] || null;
  w.__els = els;
  w.__mount = (id) => {
    const el = {
      id, innerHTML: "",
      querySelector() { return { focus() { el.__focused = true; } }; },
      querySelectorAll() { return []; },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, addEventListener() {},
      appendChild() {}, closest() { return null; }, style: {},
    };
    els[id] = el;
    return el;
  };
  const ctx = vm.createContext(w);
  for (const f of ["person-link.js", "judicial-data.js", "judicial-retention.js",
    "voter-hub-location.js", "judicial-ballot.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  return w;
}
const W = courtsWin();
const B = W.PDXJudicialBallot;
must(!!B && typeof B._arch === "function", "judicial-ballot.js no longer exports its archive renderer");
const GROUPS = W.PDXJudicial.archive();
must(Array.isArray(GROUPS) && GROUPS.length === 5,
  `PDXJudicial.archive() no longer answers five court groups (got ${GROUPS && GROUPS.length})`);
const COURT_KEYS = GROUPS.map((g) => g.key);
["supreme", "appeals", "district", "juvenile", "justice"].forEach((k) =>
  must(COURT_KEYS.indexOf(k) >= 0, `the archive no longer has a "${k}" group`));

// ── THE MARKUP THE READER GETS ───────────────────────────────────────────────
// One parse, shared by every claim below, so a selector this file invents cannot
// pass while the real markup says something else.
const rootOf = (h) => {
  const m = /<div class="jr-archive" id="([^"]*)" data-ct="([^"]*)" data-jd="([^"]*)"/.exec(h);
  return m ? { id: m[1], ct: m[2], jd: m[3] } : null;
};
const groupsOf = (h) => [...h.matchAll(/<div class="jr-group" data-ct="([^"]+)">([\s\S]*?)<\/div>/g)]
  .map((m) => ({ ct: m[1], html: m[2] }));
const namesIn = (h) => (h.match(/data-pdx-person-link="([^"]+)"/g) || []).map((s) => s.slice(23, -1));
const chipsOf = (h, attr) => [...h.matchAll(new RegExp(`<button[^>]*${attr}="([^"]*)"[^>]*aria-pressed="([^"]*)"`, "g"))]
  .map((m) => ({ val: m[1], on: m[2] === "true" }));

// THE CSS IS THE MECHANISM, so the rules are read out of the sheet rather than
// assumed. One rule per court and one per division: `display:none`, on the
// group or the row, keyed off the one attribute the module writes.
const hideRuleFor = (k) => new RegExp(
  `\\.jr-archive\\[data-ct="${k}"\\] \\.jr-group:not\\(\\[data-ct="${k}"\\]\\)`).test(JCSS_BARE);
const hideRowFor = (n) => new RegExp(
  `\\.jr-archive\\[data-jd="${n}"\\] \\.jr-li\\[data-jd\\]:not\\(\\[data-jd="${n}"\\]\\)`).test(JCSS_BARE);
COURT_KEYS.forEach((k) => ok(hideRuleFor(k),
  `css: nothing hides the other groups when the archive is filtered to "${k}" — the chip would restyle and ` +
  "the reader would still scroll every name"));
ok(/\.jr-group:not\(\[data-ct="justice"\]\) \{ display: none; \}/.test(JCSS_BARE) ||
  /:not\(\[data-ct="justice"\]\)[\s\S]{0,40}display: none/.test(JCSS_BARE),
  "css: the court-hiding selector list does not end in display:none");

// What a reader can actually READ, given a root attribute and the sheet above.
// ROW BY ROW, NOT BY PROXIMITY. An earlier draft of this helper looked up each
// judge's division by searching backwards from their name for the nearest <li>
// attributes, which found the FIRST row of the group every time and reported
// every division as visible — the filter passed for a reason unrelated to the
// filter. The rows are walked as rows instead.
const rowsOf = (h) => [...h.matchAll(/<li class="jr-li"([^>]*)>([\s\S]*?)<\/li>/g)]
  .map((m) => ({ jd: (/data-jd="(\d+)"/.exec(m[1]) || [, ""])[1], html: m[2] }));
function visible(h) {
  const root = rootOf(h);
  const out = [];
  groupsOf(h).forEach((g) => {
    if (root && root.ct && root.ct !== "all" && hideRuleFor(root.ct) && g.ct !== root.ct) return;
    rowsOf(g.html).forEach((r) => {
      if (root && root.jd && r.jd && hideRowFor(root.jd) && r.jd !== root.jd) return;
      namesIn(r.html).forEach((pid) => out.push(pid));
    });
  });
  return out;
}

// ── 1. THE DEFAULT IS COMPUTED, AND IT IS PRINTED ALREADY APPLIED ────────────
// Nothing renders before the first paint, so the pressed chip and the visible
// list have to agree before any script runs.
{
  const h = B._arch();
  const root = rootOf(h);
  ok(!!root, "archive: region B is not wrapped in the one element the filter is keyed off");
  eq(root.id, B.ARCH_ROOT_ID, "archive: the filter root does not carry the id the module publishes");
  const total = GROUPS.reduce((n, g) => n + g.rows.length, 0);
  const biggest = GROUPS.slice().sort((a, b) => b.rows.length - a.rows.length)[0];
  // A COMPARISON, NOT A LITERAL: a court is the default only while it is more
  // than half the archive, so a roster that grows past it moves the default
  // with no edit here and no edit there.
  const want = biggest.rows.length * 2 > total ? biggest.key : "all";
  eq(B._archDefault(GROUPS), want,
    `archive: the default court is not the one that is more than half of the ${total} records on file`);
  eq(root.ct, want, "archive: region B prints a default the chip row does not agree with");
  const pressed = chipsOf(h, "data-jr-ct").filter((c) => c.on).map((c) => c.val);
  eq(pressed.length, 1, `archive: ${pressed.length} court chips are pressed at once (${pressed.join(", ")})`);
  eq(pressed[0], want, "archive: the pressed chip is not the filter that is actually applied");
}

// ── 2. THE CHIP ROW IS THE WHOLE MAP, WITH COUNTS ────────────────────────────
{
  const h = B._arch();
  const chips = chipsOf(h, "data-jr-ct");
  eq(chips.length, 6, "archive: the chip row is not All courts plus the five courts on file");
  eq(chips[0].val, "all", "archive: the first chip is not the way back to the whole archive");
  COURT_KEYS.forEach((k) => ok(chips.some((c) => c.val === k), `archive: no chip for the ${k} court`));
  // The count on a chip is the count in that group, so a chip never promises
  // more names than pressing it shows.
  GROUPS.forEach((g) => {
    const m = new RegExp(`data-jr-ct="${g.key}"[^>]*>[^<]*<span class="jr-fn">(\\d+)<`).exec(h);
    ok(!!m, `archive: the ${g.key} chip carries no count`);
    if (m) eq(Number(m[1]), g.rows.length, `archive: the ${g.key} chip's count is not its own roster`);
  });
  has(h, "These chips filter the archive", "archive: the chip row does not say what it does");
  has(h, "They do not decide what is on your ballot",
    "archive: the chip row does not deny the claim a reader would otherwise read into it");
}

// ── 3. PRESSING A CHIP HIDES THE OTHER COURTS' NAMES ─────────────────────────
// The claim in the brief, stated as the reader would check it: after selecting
// Supreme, no appeals, district, juvenile or justice judge is readable, and
// every Supreme judge still is.
{
  COURT_KEYS.filter((k) => GROUPS.find((g) => g.key === k).rows.length).forEach((k) => {
    B.filterCourt(k);
    const h = B._arch();
    eq(rootOf(h).ct, k, `archive: selecting ${k} did not move the filter`);
    const seen = visible(h);
    const mine = GROUPS.find((g) => g.key === k).rows.length;
    eq(seen.length, mine, `archive: filtering to ${k} leaves ${seen.length} names readable, not its own ${mine}`);
    // AND THE OTHERS ARE STILL ON THE PAGE, just not readable — which is why
    // this is a filter and not a second roster fetched per chip.
    const others = COURT_KEYS.filter((x) => x !== k)
      .flatMap((x) => namesIn(groupsOf(h).find((g) => g.ct === x).html));
    const leaked = others.filter((pid) => seen.indexOf(pid) >= 0);
    eq(leaked.length, 0, `archive: filtering to ${k} still shows ${leaked.length} other courts' judges`);
    if (others.length) ok(others.every((pid) => h.indexOf(pid) >= 0),
      `archive: filtering to ${k} dropped the other courts out of the markup — a chip is a view, not a fetch`);
  });
  // All courts is the way back, and it hides nothing.
  B.filterCourt("all");
  eq(visible(B._arch()).length, GROUPS.reduce((n, g) => n + g.rows.length, 0),
    "archive: All courts does not return the whole archive");
}

// ── 4. DISTRICT NUMBERS, ONLY WHERE A DISTRICT MEANS SOMETHING ───────────────
{
  const trial = ["district", "juvenile"];
  COURT_KEYS.forEach((k) => {
    B.filterCourt(k);
    const h = B._arch();
    const jds = chipsOf(h, "data-jr-jd");
    if (trial.indexOf(k) >= 0) {
      ok(jds.length > 1,
        `archive: the ${k} court is divided into judicial districts and offers no numbers to jump to`);
      has(h, "Judicial district", `archive: the ${k} number row is unlabelled`);
      // NO CHIP FILTERS TO NOTHING. Every number offered has judges behind it.
      jds.filter((c) => c.val !== "0").forEach((c) => {
        B.filterDistrict(Number(c.val));
        const n = visible(B._arch()).length;
        ok(n > 0, `archive: the ${k} court offers district ${c.val}, and selecting it shows no judges at all`);
        B.filterDistrict(0);
      });
    } else {
      eq(jds.length, 0,
        `archive: the ${k} court is statewide or local and still offers judicial-district numbers`);
      lacks(h, "All districts", `archive: the ${k} court prints a district row it cannot use`);
    }
  });
}

// ── 5. A DIVISION SELECTION HIDES THE OTHER DIVISIONS' ROWS ──────────────────
{
  B.filterCourt("district");
  const all = visible(B._arch()).length;
  const nums = chipsOf(B._arch(), "data-jr-jd").filter((c) => c.val !== "0").map((c) => Number(c.val));
  must(nums.length >= 2, "the district court no longer spans two divisions, so there is nothing to filter between");
  let sum = 0;
  nums.forEach((n) => {
    B.filterDistrict(n);
    const h = B._arch();
    eq(rootOf(h).jd, String(n), `archive: selecting district ${n} did not move the division filter`);
    const seen = visible(h);
    sum += seen.length;
    ok(seen.length > 0 && seen.length < all,
      `archive: district ${n} shows ${seen.length} of ${all} district judges — that is not a filter`);
    const pressed = chipsOf(h, "data-jr-jd").filter((c) => c.on).map((c) => c.val);
    eq(pressed.join(","), String(n), `archive: district ${n} is applied without being the pressed chip`);
  });
  // THE DIVISIONS PARTITION THE COURT: no judge is in two of them and none is
  // lost between them, which is what makes "the rest are hidden" honest.
  eq(sum, all, `archive: the divisions sum to ${sum} judges, and the unfiltered court has ${all}`);

  // SELECTING A COURT CLEARS THE NUMBER. Otherwise a reader who jumps from
  // District 3 to Supreme carries an invisible filter into a court that has no
  // divisions at all.
  B.filterCourt("supreme");
  eq(B._filter().district, 0, "archive: switching courts kept a judicial-district filter that court cannot use");
  eq(rootOf(B._arch()).jd, "", "archive: the printed region still carries a division filter after a court change");
}

// ── 6. A REPAINT KEEPS THE SELECTION ─────────────────────────────────────────
// paintCourts() reprints region B on boot and on four settle timers. The filter
// lives in the module, so each of those reprints through the SAME renderer and
// the reader's view survives — and the control that moved keeps focus.
{
  const w2 = courtsWin();
  const mount = w2.__mount(w2.PDXJudicialBallot.CT_ARCH_ID);
  w2.__mount(w2.PDXJudicialBallot.CT_BAND_ID);
  eq(w2.PDXJudicialBallot.filterCourt("appeals"), true,
    "archive: pressing a chip did not repaint the region it is in");
  has(mount.innerHTML, 'data-ct="appeals"', "archive: the repaint did not print the selection");
  ok(mount.__focused, "archive: the chip that was pressed lost focus after its own repaint");
  w2.PDXJudicialBallot.sync();
  has(mount.innerHTML, 'data-ct="appeals"',
    "archive: a settle repaint reset the reader's filter — the selection is held in the DOM, not the module");
  eq(w2.PDXJudicialBallot._filter().court, "appeals", "archive: the module forgot which chip is pressed");
  // ONE RENDERER. The repaint path prints through archHtml() and not a second
  // copy of the list.
  eq(mount.innerHTML, w2.PDXJudicialBallot._arch(),
    "archive: the repainted region is not byte-identical to the renderer's own output");
}

// ── 7. A CHIP IS NOT A VERDICT ───────────────────────────────────────────────
// The filter may not invent a "your judge" anywhere: region B reads the same for
// every reader, and the chips are labelled as courts, not as claims.
{
  B.filterCourt("district");
  B.filterDistrict(3);
  const h = B._arch();
  const chipText = (h.match(/<nav class="jr-f[a-z]+"[\s\S]*?<\/nav>/g) || []).join(" ");
  ["your judge", "your court", "your district", "on your ballot", "yours"].forEach((p) =>
    lacks(chipText.toLowerCase(), p, `archive: a filter control claims "${p}" — region B resolves nothing`));
  has(h, "not a claim that these questions are on your ballot",
    "archive: the archive's own denial went missing once it became filterable");
  B.filterCourt("all");
}

// ── 8. THE FAIL-CLOSED LINE SURVIVES THE FILTER ──────────────────────────────
// The justice courts list nobody, and the archive says so in its own words
// rather than printing an empty court and letting the reader guess.
{
  const empty = GROUPS.filter((g) => !g.rows.length);
  must(empty.length >= 1, "every court now has judges on file, so there is no empty-group copy to defend");
  empty.forEach((g) => {
    B.filterCourt(g.key);
    const h = B._arch();
    const grp = groupsOf(h).find((x) => x.ct === g.key);
    ok(!!grp && /jr-empty/.test(grp.html),
      `archive: the ${g.key} court is empty and says nothing about why`);
    has(grp.html, "on file", `archive: the ${g.key} court's empty line does not name what is missing`);
    eq(visible(h).length, 0, `archive: filtering to the empty ${g.key} court still reads out somebody's name`);
  });
  B.filterCourt("all");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · REGION A IS UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════
section("4 · region A is still the resolver's answer, and region B cannot touch it");

const bandFor = (county) => {
  W.pdxRepsForMe = () => ({ located: true, state: "Utah", stateName: "Utah", county: county });
  return W.PDXJudicialBallot._courtsBand();
};

// ── A READER'S OWN QUESTIONS ARE THEIR DIVISION'S, AND NOBODY ELSE'S ─────────
{
  const sl = bandFor("Salt Lake");
  const cache = bandFor("Cache");
  const A = namesIn(sl), C = namesIn(cache);
  ok(A.length > 0 && C.length > 0, "band: a located reader is shown no retention questions at all");
  has(sl, "Judicial District", "band: the resolved band does not name the division it resolved to");
  ok(A.some((p) => C.indexOf(p) < 0) && C.some((p) => A.indexOf(p) < 0),
    "band: two different counties resolve to the same trial-court judges — the division is not being read");
  // The statewide questions are shared; the trial-court ones are not.
  const shared = A.filter((p) => C.indexOf(p) >= 0);
  ok(shared.length > 0, "band: no statewide question is shown to either county");
  ok(shared.length < A.length, "band: every question in the band is statewide — the county resolved nothing");
  has(sl, "publishes no rating of a judge", "band: the no-position sentence is not on the reader's own questions");
  has(sl, "Do not retain", "band: the question is not drawn as the two-way choice it is on the ballot");
}

// ── A COUNTY WE CANNOT PLACE NAMES THE MISSING MAP AND CLAIMS NOBODY ─────────
{
  const nowhere = bandFor("Nowhere");
  has(nowhere, "Maps not on file", "band: an unplaceable county says nothing about what is missing");
  has(nowhere, "no judicial district map on file for Nowhere",
    "band: the missing-map line does not name the county it could not place");
  has(nowhere, "no roster on file for Nowhere",
    "band: the justice courts' missing ROSTER is reported as something else");
  ok(namesIn(nowhere).length < namesIn(bandFor("Salt Lake")).length,
    "band: a county with no map on file was still handed trial-court judges");
  // AND NO LOCATION AT ALL IS A DOOR, NOT A GUESS.
  W.pdxRepsForMe = () => ({ located: false });
  const cold = W.PDXJudicialBallot._courtsBand();
  eq(namesIn(cold).length, 0, "band: a reader with no location saved is shown judges as if they were theirs");
  has(cold, "Set where you vote", "band: a reader with no location is given no way to set one");
}

// ── AND NOTHING IN REGION B REACHES IT ───────────────────────────────────────
{
  const before = bandFor("Salt Lake");
  B.filterCourt("supreme");
  B.filterDistrict(0);
  eq(bandFor("Salt Lake"), before, "band: filtering the archive changed the reader's own questions");
  B.filterCourt("district");
  B.filterDistrict(3);
  eq(bandFor("Cache"), bandFor("Cache"),
    "band: the band is not a pure function of the resolver and the roster");
  const cache = bandFor("Cache");
  ok(namesIn(cache).length > 0 && !/jr-fchip/.test(cache),
    "band: region A grew filter chips — only the archive is filterable");
  ok(!/First Judicial District[\s\S]*Third Judicial District/.test(cache),
    "band: a Cache county reader is shown a second division's questions");
  B.filterCourt("all");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE DENYLIST
// ═════════════════════════════════════════════════════════════════════════════
section("5 · no score, no party, no address of a judge's own, no second resolver");

{
  const painted = B._arch() + bandFor("Salt Lake");
  // A DENIAL IS NOT AN INSTANCE OF WHAT IT DENIES. Both regions carry a sentence
  // reading "Nothing here feeds Direction Match, Word vs Action, a formal-record
  // tier or any score", and a probe that fails on the words inside it would be
  // asking the product to stop saying the one thing this room most needs to say.
  // So the disclaimers are lifted out, asserted as present in their own right,
  // and the denylist is run over everything else — which is where a real score
  // would have to appear to reach a reader as a claim.
  const DENIALS = painted.match(/<p class="jr-(?:note|fnote|missing)">[\s\S]*?<\/p>/g) || [];
  ok(DENIALS.length >= 3, `denylist: the room prints only ${DENIALS.length} disclaimers`);
  const DENIAL = DENIALS.join(" ");
  has(DENIAL, "not a grade", "denylist: the archive stopped saying that a retention question is not a grade");
  has(DENIAL, "Direction Match",
    "denylist: the sentence naming the scores retention does NOT feed is gone — that sentence is the reason " +
    "the words below are allowed nowhere else in this room");
  const claims = DENIALS.reduce((h, d) => h.replace(d, " "), painted);
  ["Direction Match", "Word vs Action", "WVA", "match score", "grade", "tier", "Republican", "Democrat"]
    .forEach((w) => lacks(claims, w, `denylist: "${w}" is printed near a judge, outside a disclaimer`));
  ok(!/\bjr-(?:score|grade|rating|tier)\b/.test(painted), "denylist: a judge carries a score-shaped element");
  // The one figure allowed near a judge is JPEC's own phrase, or its absence.
  has(painted, "JPEC", "denylist: the commission's own phrase is gone, which is what kept a number off a judge");

  // EVERY JUDGE LINK IS THE ONE ADDRESS person.html ALREADY OWNS.
  const hrefs = [...painted.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const judgeHrefs = hrefs.filter((h) => /jr-plink/.test(painted) && /^\/p\//.test(h));
  ok(judgeHrefs.length > 0, "denylist: no judge links to their own file");
  const minted = hrefs.filter((h) => /^\/courts\/./.test(h) || /^\/judge/.test(h) || /^\/retention/.test(h));
  eq(minted.length, 0, `denylist: a per-judge or per-court address was minted (${minted.join(", ")})`);

  // NO SECOND RESOLVER ON THE DOCUMENT. courts.html holds two mounts and a
  // frame; the county table and the district map live where they always did.
  ["Salt Lake", "Judicial District", "county"].forEach((t) =>
    lacks(CT_BARE.replace(/your county/g, ""), t,
      `denylist: courts.html carries "${t}" of its own — that is a second answer to where this reader votes`));
  has(JB_CODE, "pdxRepsForMe", "denylist: the renderer no longer asks the one location resolver");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE SERVICE WORKER AND THE SITEMAP
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the room is precached with its renderer, and advertised once");

const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER), `sw: CACHE_VERSION does not read as one version literal (got "${VER}")`);
ok(Number(VER.slice(1)) >= 204,
  `sw: CACHE_VERSION is ${VER} — courts.html, judicial-ballot.js and judicial-retention.css all changed in ` +
  "the pass that made region B filterable, and a warm device keeps serving the scroll without a rename");

const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL, "sw.js no longer declares SHELL_ASSETS as one literal array");
["/courts.html", "/judicial-ballot.js", "/judicial-retention.css", "/judicial-data.js",
  "/judicial-retention.js", "/person-link.js"].forEach((a) =>
  has(SHELL, `'${a}'`, `sw: ${a} is not precached — the room would open with no renderer, or no sheet`));
// THE OTHER TWO FILES ON THE CRITICAL PATH ARE DELIBERATELY NOT ON THAT LIST,
// and this pass did not change that. voter-hub-location.js and
// ballot-breakdown.js are runtime entries that arrive fresh, on the reasoning
// sw.js records for itself: a resolver cached against a stale shell is how a
// header comes to contradict the pane under it. Region A degrades honestly
// without them — no location resolves, so nothing is claimed — which is the
// same fail-closed branch section 4 measures.
["/voter-hub-location.js", "/ballot-breakdown.js"].forEach((a) =>
  lacks(SHELL, `'${a}'`,
    `sw: ${a} was added to the precache — it is a runtime entry so a fresh resolver never pairs with a ` +
    "stale shell, and two other passes wrote that decision down"));

// THE NAV MATCH IS THE TWO PATHS netlify.toml DECLARES, AND NOTHING ELSE.
const NAV = (/const COURTS_NAV_RE = (\/[^\n;]+\/);/.exec(SW) || [, ""])[1];
ok(!!NAV, "sw: COURTS_NAV_RE is not one literal");
if (NAV) {
  const re = new RegExp(NAV.slice(1, NAV.lastIndexOf("/")));
  ["/courts", "/courts/"].forEach((p) => ok(re.test(p), `sw: ${p} is not recognised as the courts room`));
  ["/courtss", "/courts/district", "/court", "/courts.html.bak", "/"].forEach((p) =>
    ok(!re.test(p), `sw: ${p} is served the courts document`));
}
has(SW, "v204", "sw: the version log has no entry for the pass that made region B a list with a map");

// THE SITEMAP: the room is listed once, no per-judge address is minted here, and
// the account-shaped room stays out.
const LOCS = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
eq(LOCS.filter((u) => /\/courts$/.test(u)).length, 1, "sitemap: /courts is not listed exactly once");
eq(LOCS.filter((u) => /\/courts\//.test(u)).length, 0, "sitemap: an address under /courts/ is advertised");
eq(LOCS.filter((u) => /\/me$/.test(u)).length, 0,
  "sitemap: /me is advertised — it is account-shaped, and the generator excludes it on purpose");
ok(LOCS.filter((u) => /\/p\//.test(u)).length > 0,
  "sitemap: no person file is listed, which is where a judge's own page is governed");

// ═════════════════════════════════════════════════════════════════════════════
function report() {
  console.log(
    `\n${failures.length ? "✗" : "✓"} courts shell: ${passed} checks passed` +
    (failures.length ? `, ${failures.length} failed` : "")
  );
  if (failures.length) {
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}
report();
