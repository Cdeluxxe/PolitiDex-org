#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for PARENT HEADERS KEEP ISSUE COLOURS, AND A PINNED STRIP LEADS
// ─────────────────────────────────────────────────────────────────────────────
// On the five composer boards:
//
//   1. EVERY PARENT HEADER carries a colour class from the existing palette
//      (pdxdb-ic-<core>, <core> a key of PDXIssueColors.CORE_ISSUE_COLORS) and
//      the very token its issue chips wear.
//   2. THE PINNED STRIP, above the parent list, shows at most two mandates and
//      at most three issue groups (ranked by people who answered or
//      commented), and only when such rows exist.
//   3. IT STAYS VISIBLE whatever is collapsed or filtered, and a pinned issue
//      opens its group the way its chip does. Nested chips, collapse, search
//      and the Mandates filter are unchanged.
//   4. MUTATION: a renderer that drops the colour class, or the pinned strip,
//      fails the checker.
//   5. A GENERATED BOARD is unchanged: no pin strip, no parent colours.
//   6. No equity language; the SW moved, no migration.
//
//   node scripts/test-district-board-pinned.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const MOD = R("district-board.js");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ district board pinned: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

function boot({ composer, src } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  if (composer) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  vm.runInContext(src || MOD, ctx, { filename: "district-board.js" });
  return { B: win.PDXDistrictBoard, win };
}

const iss = (...keys) => keys.map((k) => ({ issueKey: k, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }));
const m = (id, number, title, keys) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: iss(...keys),
});
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", ["housing"]),
  m(2, "S.B. 12", "Property Tax Relief", ["prop_tax"]),
  m(3, "S.B. 57", "Public Education Funding", ["public_schools"]),
  m(4, "H.B. 208", "Great Salt Lake Watershed", ["water"]),
  m(5, "H.C.R. 3", "Resolution Supporting Israel", ["israel_support"]),
  m(6, "H.B. 9", "Technical Corrections", []),
];
// People who answered / commented, per issue. Ranked: housing 7, israel 4,
// water 3, schools 2, prop_tax 0 (never pinned).
const ROOMS = [
  { issueKey: "housing", polls: 5, comments: 2 },
  { issueKey: "water", polls: 3, comments: 0 },
  { issueKey: "public_schools", polls: 1, comments: 1 },
  { issueKey: "israel_support", polls: 0, comments: 4 },
  { issueKey: "prop_tax", polls: 0, comments: 0 },
];
const MANDATES = [
  { id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3 },
  { id: 8, title: "Open the redistricting map files", supportCount: 1 },
  { id: 9, title: "Post every bill draft a week before its hearing", supportCount: 0 },
];

// ── THE CHECKERS ────────────────────────────────────────────────────────────
function parentHeads(html) {
  return [...html.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"[^>]*>\s*<summary([^>]*)>[\s\S]*?<div class="pdxdb-parent-b"[^>]*>([\s\S]*?)<\/div><\/div>\s*<\/details>/g)]
    .map((x) => ({
      key: x[1],
      cls: ((/class="([^"]*)"/.exec(x[2])) || [])[1] || "",
      ic: /data-ic="on"/.test(x[2]),
      style: ((/style="([^"]*)"/.exec(x[2])) || [])[1] || "",
      chipStyles: [...x[3].matchAll(/<button type="button" class="pdxdb-cat"[^>]*style="([^"]*)"/g)].map((c) => c[1]),
    }));
}
function checkColours(html, palette) {
  const problems = [];
  const heads = parentHeads(html);
  if (!heads.length) problems.push("no parent headers");
  for (const h of heads) {
    const cls = h.cls.split(/\s+/).filter((c) => c.startsWith("pdxdb-ic-"));
    if (cls.length !== 1) problems.push(`${h.key}: no palette colour class`);
    else if (!(cls[0].slice("pdxdb-ic-".length) in palette)) problems.push(`${h.key}: ${cls[0]} is not a palette entry`);
    else if (cls[0] !== `pdxdb-ic-${h.key}`) problems.push(`${h.key}: wears another core's class ${cls[0]}`);
    if (!h.ic || !h.style) problems.push(`${h.key}: no colour token on the header`);
    if (h.chipStyles.some((s) => s !== h.style)) problems.push(`${h.key}: the header's token differs from its chips'`);
  }
  return problems;
}
function pinned(html) {
  const sec = /<section class="pdxdb-pinned" data-pdxdb-pinned=""([^>]*)>([\s\S]*?)<\/section>/.exec(html);
  if (!sec) return null;
  return {
    hidden: /\shidden\b/.test(sec[1]),
    at: sec.index,
    mandates: [...sec[2].matchAll(/data-pdxdb-pin-mandate="(\d+)"/g)].map((x) => Number(x[1])),
    issues: [...sec[2].matchAll(/data-pdxdb-pin-issue="([^"]+)"/g)].map((x) => x[1]),
    body: sec[2],
  };
}
function checkPinned(html, { mandates, issues }) {
  const problems = [];
  const p = pinned(html);
  const want = mandates.length || issues.length;
  if (!want) { if (p) problems.push("a pinned strip printed with nothing to pin"); return problems; }
  if (!p) { problems.push("no pinned strip"); return problems; }
  if (p.hidden) problems.push("the pinned strip is hidden");
  if (p.mandates.length > 2) problems.push(`${p.mandates.length} pinned mandates — at most two`);
  if (p.issues.length > 3) problems.push(`${p.issues.length} pinned issues — at most three`);
  if (JSON.stringify(p.mandates) !== JSON.stringify(mandates)) problems.push(`pinned mandates ${JSON.stringify(p.mandates)}, wanted ${JSON.stringify(mandates)}`);
  if (JSON.stringify(p.issues) !== JSON.stringify(issues)) problems.push(`pinned issues ${JSON.stringify(p.issues)}, wanted ${JSON.stringify(issues)}`);
  const firstParent = html.indexOf('<details class="pdxdb-parent"');
  if (firstParent >= 0 && p.at > firstParent) problems.push("the pinned strip is not above the parent list");
  return problems;
}

const { B: C, win: CW } = boot({ composer: true });
const { B: G } = boot({ composer: false });
must(C && G && typeof C.tableHtml === "function", "PDXDistrictBoard did not publish");
const PALETTE = CW.PDXIssueColors && CW.PDXIssueColors.CORE_ISSUE_COLORS;
must(PALETTE && Object.keys(PALETTE).length >= 10, "PDXIssueColors.CORE_ISSUE_COLORS is missing");
const FULL = C.tableHtml("ok", ITEMS, ROOMS, MANDATES);

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · every parent header carries its chips' palette colour");
{
  const heads = parentHeads(FULL);
  eq(heads.length, 4, "four parents in the fixture");
  eq(JSON.stringify(checkColours(FULL, PALETTE)), "[]", "every header: one palette class, the core's own, and its chips' exact token");
  for (const h of heads) ok(h.cls.includes("pdxdb-parent-h--collapsed"), `${h.key}: still collapsed`);
  const econ = heads.find((h) => h.key === "economy_cost_of_living");
  ok(econ && econ.chipStyles.length === 2, "Economy's two chips were compared against its header");
  ok(econ && econ.style === CW.PDXIssueColors.styleFor("housing", CW.coreIssueForKey), "the token is PDXIssueColors' own for the issue");
}

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · the pinned strip: at most two mandates and three issues, only when they exist");
{
  eq(JSON.stringify(checkPinned(FULL, { mandates: [7, 8], issues: ["housing", "israel_support", "water"] })), "[]",
    "two of three mandates, and the three issues the most people touched, in that order");
  const p = pinned(FULL);
  ok(p.body.includes('href="/mandate#pp-card-7"'), "a pinned mandate links to its card on /mandate");
  ok(p.body.includes("5 people answered · 2 people commented"), "a pinned issue says how many people answered and commented");
  ok(!p.issues.includes("prop_tax"), "an issue nobody touched is never pinned");
  ok(!/data-pdxdb-group=/.test(p.body), "a pinned issue is not a second copy of its group (the poll module sees each issue once)");
  ok(!/class="pdxdb-cat"/.test(p.body), "a pinned issue is not counted as a chip in a chip row");

  eq(JSON.stringify(checkPinned(C.tableHtml("ok", ITEMS, [], []), { mandates: [], issues: [] })), "[]", "nothing live: no strip at all");
  ok(!/data-pdxdb-pinned/.test(C.tableHtml("ok", ITEMS, [], [])), "…not even an empty heading");
  eq(JSON.stringify(checkPinned(C.tableHtml("ok", ITEMS, [], MANDATES.slice(0, 1)), { mandates: [7], issues: [] })), "[]", "one mandate, no activity: one pinned row");
  eq(JSON.stringify(checkPinned(C.tableHtml("ok", ITEMS, ROOMS.slice(1, 2), []), { mandates: [], issues: ["water"] })), "[]", "activity on one issue, no mandates: one pinned issue");
  eq(JSON.stringify(checkPinned(C.tableHtml("ok", ITEMS, [{ issueKey: "prop_tax", polls: 0, comments: 0 }], []), { mandates: [], issues: [] })), "[]", "zero activity is not activity");
  // An issue with activity but no row on this seat's table is not pinned.
  eq(JSON.stringify(checkPinned(C.tableHtml("ok", ITEMS, [{ issueKey: "gun_rights", polls: 9, comments: 9 }], []), { mandates: [], issues: [] })), "[]",
    "a tally for an issue not on the table pins nothing");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · the strip stays visible, and everything else is unchanged");
{
  for (const [name, set] of [["Mandates chip", () => C.setCategory(C.MANDATE_KEY)], ["an issue chip", () => C.setCategory("water")], ["a search", () => C.setQuery("watershed")]]) {
    set();
    const h = C.tableHtml("ok", ITEMS, ROOMS, MANDATES);
    const p = pinned(h);
    ok(p && !p.hidden && p.issues.length === 3 && p.mandates.length === 2, `under ${name}: the pinned strip still shows in full`);
    C.setCategory(""); C.setQuery("");
  }
  // A pinned issue is a data-pdxdb-cat control: pressing it is selecting its chip.
  const btn = /<button type="button" class="pdxdb-pin-i" data-pdxdb-cat="([^"]+)"/.exec(FULL);
  eq(btn && btn[1], "housing", "the first pinned issue is a control onto housing");
  C.setCategory(btn[1]);
  const h = C.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  const econ = /<details class="pdxdb-parent" data-pdxdb-parent="economy_cost_of_living"([^>]*)>/.exec(h);
  ok(econ && /\sopen\b/.test(econ[1]), "pressing it opens the housing parent");
  ok(/data-pdxdb-group="housing" open/.test(h), "…and the housing group");
  ok(/<button type="button" class="pdxdb-pin-i" data-pdxdb-cat="housing" aria-pressed="true"/.test(h), "…and marks the pinned control pressed");
  C.setCategory("");
  // Nothing else moved: with an empty tally and no mandates the parents, nested
  // chips and groups are the same (counts aside) as with them.
  const parentsOf = (x) => (x.match(/<details class="pdxdb-parent"[\s\S]*?<\/div><\/div>\s*<\/details>/g) || []).map((p) => p.replace(/data-pdxdb-(polls|comments)="\d+">\d+</g, ""));
  eq(JSON.stringify(parentsOf(FULL)), JSON.stringify(parentsOf(C.tableHtml("ok", ITEMS, [], []))), "the parents, nested chips and groups are the same with or without the strip");
  ok(/data-pdxdb-find-none hidden/.test(FULL), "the search's no-match line is unaffected");
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · mutation: dropping the colour class or the strip fails");
{
  const COLOUR = "var icClass = (skin && paletteHas(par.key)) ? ' ' + IC_PREFIX + par.key : '';";
  must(MOD.includes(COLOUR), "the colour class line is not where the mutation expects it");
  const { B: M1 } = boot({ composer: true, src: MOD.replace(COLOUR, "var icClass = '';") });
  const p1 = checkColours(M1.tableHtml("ok", ITEMS, ROOMS, MANDATES), PALETTE);
  ok(p1.some((x) => /no palette colour class/.test(x)), `a renderer without the colour class fails (${p1.slice(0, 2).join("; ")})`);

  const PIN = "(P ? pinnedHtml(mrows, G.groups, tally) : '')";
  must(MOD.includes(PIN), "the pinned strip's call is not where the mutation expects it");
  const { B: M2 } = boot({ composer: true, src: MOD.replace(PIN, "''") });
  ok(checkPinned(M2.tableHtml("ok", ITEMS, ROOMS, MANDATES), { mandates: [7, 8], issues: ["housing", "israel_support", "water"] }).includes("no pinned strip"),
    "a renderer without the pinned strip fails");

  const { B: M3 } = boot({ composer: true, src: MOD.replace("var PIN_ISSUES = 3;", "var PIN_ISSUES = 9;").replace("var PIN_MANDATES = 2;", "var PIN_MANDATES = 9;") });
  const p3 = checkPinned(M3.tableHtml("ok", ITEMS, ROOMS, MANDATES), { mandates: [7, 8], issues: ["housing", "israel_support", "water"] });
  ok(p3.some((x) => /at most two/.test(x)) && p3.some((x) => /at most three/.test(x)), "a renderer that pins too many fails");

  ok(checkColours(FULL.replace(/ pdxdb-ic-economy_cost_of_living/, " pdxdb-ic-healthcare"), PALETTE).some((x) => /another core/.test(x)), "a header wearing another core's class fails");
  ok(checkColours(FULL.replace(/(<summary class="pdxdb-parent-h[^"]*" aria-expanded="false") data-ic="on" style="[^"]*"/, "$1"), PALETTE).some((x) => /no colour token/.test(x)),
    "a header without the token fails");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · a generated board is unchanged");
{
  const h = G.tableHtml("ok", ITEMS, ROOMS, []);
  ok(!/data-pdxdb-pinned|pdxdb-pin/.test(h), "no pinned strip on a generated board");
  ok(!/pdxdb-ic-|pdxdb-parent/.test(h), "no parents and no parent colour on a generated board");
  eq(h, G.tableHtml("ok", ITEMS, ROOMS), "the generated band paints exactly its three-argument self");
}

// ── 6 ───────────────────────────────────────────────────────────────────────
section("6 · no equity language, and the shell moved");
{
  const BANNED = /\b(equity|equities|stocks?|shares?|shareholders?|stakes?|stakeholders?|dividends?|portfolio)\b/i;
  const copy = [C.COPY.pinnedHead, C.COPY.pinAnswered, C.COPY.pinCommented].join(" ");
  ok(!BANNED.test(copy), `the new copy carries no equity word — ${(BANNED.exec(copy) || [])[0]}`);
  const text = pinned(FULL).body.replace(/<[^>]+>/g, " ") + " " + parentHeads(FULL).map((h) => h.cls).join(" ");
  ok(!BANNED.test(text), `the pinned strip and parent headers carry no equity word — ${(BANNED.exec(text) || [])[0]}`);
  ok(!/\b(majority|wins?|winning|supports? X)\b/i.test(pinned(FULL).body.replace(/<[^>]+>/g, " ")), "the pinned counts are people, never a majority");
  const css = R("district-board.css");
  const note = css.slice(css.indexOf("A parent header wears its chips"), css.indexOf(".pdxdb-pins {"));
  ok(note.length > 100 && !BANNED.test(note), "the stylesheet's notes carry no equity word");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 340, "the shell moved at least to v340");
  ok(/v340 - [\s\S]*?MIGRATION COST: none/.test(SW), "v340's log says no migration");
}

report();
