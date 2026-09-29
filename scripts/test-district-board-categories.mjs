#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for ON THE TABLE: CATEGORIES FIRST, THEN MEASURES
// ─────────────────────────────────────────────────────────────────────────────
// Band 3 of a district board used to be one flat scroll of every measure mapped
// to the seat. It is now grouped by the issue chips the rows already wear, with
// a chip row to filter and one search field. What must hold:
//
//   1. EVERY MEASURE SITS UNDER THE CATEGORY ITS CHIP NAMES, and the header is
//      that chip's own label and colour token. All shows every group; one chip
//      hides the others. No chip for a category with no rows on the seat.
//   2. A MEASURE WITH TWO CHIPS APPEARS IN BOTH GROUPS — not under a new
//      "primary".
//   3. HEADERS CARRY THE COUNT of that category's measures on the seat, and the
//      row counts stay people counts for the group's issue.
//   4. GROUPS START CLOSED, except one the visitor already holds a side on.
//   5. THE SEARCH matches title or bill number inside the visible groups.
//   6. A GENERATED BOARD (HD-29) USES THE SAME RENDERER — the same markup for
//      the same rows, not a second list.
//   7. MUTATIONS: a flat ungrouped list fails the checker; a made-up category
//      label that is not on any chip fails it.
//   8. The stylesheet is one file, linked by the module and precached; the SW
//      moved one version.
//
//   node scripts/test-district-board-categories.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
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
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ district board categories: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

function boot({ items, desk, seat } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ rooms: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  const d = desk || {};
  win.PDXYourFile = { answered: () => Object.keys(d), position: (k) => d[k] || null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: items || [], summary: {} }) };
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return win;
}
function hostEl(seat) {
  return { innerHTML: "", getAttribute: (n) => (n === "data-pdxdb-seat" ? seat || null : null), setAttribute() {}, appendChild() {} };
}
function flush(n = 12) {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) p = p.then(() => new Promise((r) => setTimeout(r, 0)));
  return p;
}

// ── THE FIXTURE SEAT: MIXED CHIPS ───────────────────────────────────────────
const iss = (...keys) => keys.map((k) => ({ issueKey: k, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }));
const m = (id, number, title, keys) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: iss(...keys),
});
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", ["housing"]),
  m(2, "S.B. 57", "Public Education Funding", ["public_schools"]),
  m(3, "H.B. 208", "Great Salt Lake Watershed", ["water"]),
  // THE TWO-CHIP MEASURE. Housing and water, and neither is its "primary".
  m(4, "S.B. 336", "Water-Wise Housing Development", ["housing", "water"]),
  m(5, "H.B. 12", "Rural Energy Siting", ["enviro_energy"]),
  // A row with no labelled issue: still printed, under All only.
  m(6, "H.B. 9", "Technical Corrections", []),
];
const W = boot({ items: ITEMS });
const B = W.PDXDistrictBoard;
must(B && typeof B.tableHtml === "function", "PDXDistrictBoard did not publish");
const LABEL = (k) => B.issueLabel(k);
for (const k of ["housing", "public_schools", "water", "enviro_energy"]) {
  must(!!LABEL(k), `ISSUE_MAP no longer labels ${k} — the fixture would be vacuous`);
}

// ── THE CHECKER: IS THIS HTML A GROUPED TABLE OF THESE ITEMS? ───────────────
// Returns a list of problems; [] means the band is grouped correctly. The
// mutation section feeds it broken HTML and asserts it complains.
function parseGroups(html) {
  const out = [];
  const re = /<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>([\s\S]*?)<\/details>/g;
  let g;
  while ((g = re.exec(html))) {
    const [, key, attrs, inner] = g;
    const label = ((/<span class="pdxdb-group-l[^"]*"[^>]*>([^<]*)<\/span>/.exec(inner)) || [])[1] || "";
    const count = Number(((/data-pdxdb-group-count="(\d+)"/.exec(inner)) || [])[1]);
    const rows = [...inner.matchAll(/<tr class="pdxdb-row"([^>]*)>([\s\S]*?)<\/tr>/g)].map((r) => ({
      hidden: /\shidden\b/.test(r[1]),
      text: r[2],
      polls: ((/data-pdxdb-polls="(\d+)"/.exec(r[2])) || [])[1],
    }));
    out.push({ key, open: /\sopen\b/.test(attrs), hidden: /\shidden\b/.test(attrs), label, count, rows });
  }
  return out;
}
function unesc(s) { return String(s).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }
function chipLabels(html) {
  return new Set([...html.matchAll(/<span class="pdxdb-m-issue"[^>]*>([^<]*)<\/span>/g)].map((x) => unesc(x[1])));
}
function checkGrouped(html, items) {
  const problems = [];
  const groups = parseGroups(html);
  const chips = chipLabels(html);
  const keyed = groups.filter((g) => g.key);
  if (!keyed.length) problems.push("no category groups — the table is a flat list");
  for (const g of keyed) {
    if (unesc(g.label) !== LABEL(g.key)) problems.push(`group ${g.key} is headed ${JSON.stringify(g.label)}, not its chip's label`);
    if (!chips.has(unesc(g.label))) problems.push(`group header ${JSON.stringify(g.label)} is not a chip any row wears`);
    if (g.count !== g.rows.length) problems.push(`group ${g.key} says ${g.count} but holds ${g.rows.length}`);
  }
  // Every row in the band sits inside a group.
  const allRows = (html.match(/<tr class="pdxdb-row"/g) || []).length;
  const grouped = groups.reduce((n, g) => n + g.rows.length, 0);
  if (allRows !== grouped) problems.push(`${allRows - grouped} row(s) sit outside any group`);
  // Every measure is under every category its chips name.
  for (const it of items) {
    const keys = (it.issues || []).map((x) => x.issueKey).filter((k) => LABEL(k));
    for (const k of keys) {
      const g = groups.find((x) => x.key === k);
      if (!g || !g.rows.some((r) => r.text.indexOf(it.title) >= 0)) problems.push(`${it.number} is not under ${k}`);
    }
    for (const g of keyed) {
      if (keys.indexOf(g.key) < 0 && g.rows.some((r) => r.text.indexOf(it.title) >= 0)) {
        problems.push(`${it.number} sits under ${g.key}, which is not one of its chips`);
      }
    }
  }
  return problems;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every measure sits under the category its chip names");
const html = B.tableHtml("ok", ITEMS, [{ issueKey: "water", polls: 3, comments: 1 }]);
{
  const problems = checkGrouped(html, ITEMS);
  eq(JSON.stringify(problems), "[]", "the fixture seat renders as a grouped table");
  const groups = parseGroups(html);
  eq(JSON.stringify(groups.filter((g) => g.key).map((g) => g.key).sort()),
    JSON.stringify(["enviro_energy", "housing", "public_schools", "water"]),
    "one group per category a row carries, and no other");
  // THE HEADER IS THE CHIP: same label, same colour token.
  const skin = W.PDXIssueColors.skin("water", W.coreIssueForKey);
  must(skin && skin.on, "water no longer resolves to a colour — the colour assertion is vacuous");
  ok(new RegExp(`<span class="pdxdb-group-l"${skin.attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`).test(html),
    "the water header carries the exact token the row chip carries");
  // The unfiled row is still on the table, under All, with no filter chip.
  const none = groups.find((g) => g.key === "");
  ok(none && none.rows.length === 1 && none.rows[0].text.indexOf("Technical Corrections") >= 0,
    "a measure with no labelled issue is still printed");
  no(html, 'data-pdxdb-cat=""><', "sanity");
}

section("2 · the chip row: All, then one per non-empty category");
{
  const cats = [...html.matchAll(/<button type="button" class="pdxdb-cat" data-pdxdb-cat="([^"]*)" aria-pressed="(true|false)"/g)]
    .map((x) => ({ key: x[1], on: x[2] === "true" }));
  eq(cats[0] && cats[0].key, "", "the first chip is All");
  eq(cats[0] && cats[0].on, true, "…and All is the default");
  eq(JSON.stringify(cats.slice(1).map((c) => c.key).sort()),
    JSON.stringify(["enviro_energy", "housing", "public_schools", "water"]),
    "one chip per category with at least one row — none for an empty one");
  no(html, 'data-pdxdb-cat="school_choice"', "no chip for a category with no row on this seat");
  // All shows every group.
  ok(parseGroups(html).every((g) => !g.hidden), "All shows every group");
  // One chip hides the others.
  B.setCategory("water");
  const one = B.tableHtml("ok", ITEMS, []);
  const g1 = parseGroups(one);
  eq(JSON.stringify(g1.filter((g) => !g.hidden).map((g) => g.key)), '["water"]', "the water chip shows only the water group");
  ok(g1.find((g) => g.key === "water").open, "…and opens it");
  ok(g1.find((g) => g.key === "").hidden, "…and the unfiled rows are All-only");
  has(one, 'data-pdxdb-cat="water" aria-pressed="true"', "the water chip reads as pressed");
  // A chip that has no group on the seat falls back to All.
  B.setCategory("school_choice");
  const back = B.tableHtml("ok", ITEMS, []);
  eq(B.view().cat, "", "a chip with no group on this seat falls back to All");
  ok(parseGroups(back).every((g) => !g.hidden), "…showing every group");
  B.setCategory("");
}

section("3 · a measure with two chips appears in both groups");
{
  const groups = parseGroups(html);
  const under = groups.filter((g) => g.rows.some((r) => r.text.indexOf("Water-Wise Housing Development") >= 0)).map((g) => g.key).sort();
  eq(JSON.stringify(under), '["housing","water"]', "S.B. 336 sits under housing AND water");
  const row = groups.find((g) => g.key === "housing").rows.find((r) => r.text.indexOf("Water-Wise") >= 0);
  has(row.text, LABEL("housing"), "the row wears the housing chip");
  has(row.text, LABEL("water"), "…and the water chip");
  eq(JSON.stringify(B._rowIssues(ITEMS[3])), '["housing","water"]', "no primary is picked: both keys are the row's");
  // COUNTS: headers count measures; row counts are the group's issue tally.
  eq(groups.find((g) => g.key === "housing").count, 2, "the housing header counts its two measures");
  eq(groups.find((g) => g.key === "water").count, 2, "the water header counts its two measures");
  const inWater = groups.find((g) => g.key === "water").rows.find((r) => r.text.indexOf("Water-Wise") >= 0);
  eq(inWater.polls, "3", "under water, the row carries water's people count");
  eq(row.polls, "0", "under housing, it carries housing's (none on file)");
  ok(!/%/.test(html.replace(/<[^>]+>/g, " ")), "no proportion appears anywhere on the band");
}

section("4 · groups start closed, except one the visitor holds a side on");
{
  ok(parseGroups(html).every((g) => !g.open), "no stance on file: every group is closed on first paint");
  const Ws = boot({ items: ITEMS, desk: { water: "support" } });
  const h = Ws.PDXDistrictBoard.tableHtml("ok", ITEMS, []);
  const gs = parseGroups(h);
  eq(JSON.stringify(gs.filter((g) => g.open).map((g) => g.key)), '["water"]', "the visitor's water side opens the water group, and only it");
  // The stance band filters against the groups the table printed.
  const st = Ws.PDXDistrictBoard.stanceHtml(["water"]);
  has(st, 'data-pdxdb-stance="mine"', "the stance band still reads the side back");
}

section("5 · one search field: title or bill number, inside the visible groups");
{
  has(html, 'data-pdxdb-search autocomplete="off"', "the band has one search field");
  eq((html.match(/<input class="pdxdb-find-i"/g) || []).length, 1, "…exactly one");
  B.setQuery("sb 336");
  const h = B.tableHtml("ok", ITEMS, []);
  const gs = parseGroups(h);
  eq(JSON.stringify(gs.filter((g) => !g.hidden).map((g) => g.key).sort()), '["housing","water"]',
    "a bill-number search shows only the groups holding it");
  ok(gs.filter((g) => !g.hidden).every((g) => g.open), "…opened");
  ok(gs.filter((g) => !g.hidden).every((g) => g.rows.filter((r) => !r.hidden).length === 1),
    "…with only the matching row visible");
  B.setQuery("salt lake");
  const t = parseGroups(B.tableHtml("ok", ITEMS, []));
  eq(JSON.stringify(t.filter((g) => !g.hidden).map((g) => g.key)), '["water"]', "a title search matches the title");
  // Inside the visible groups only: with the energy chip on, a water search finds nothing.
  B.setCategory("enviro_energy");
  const e = B.tableHtml("ok", ITEMS, []);
  ok(parseGroups(e).every((g) => g.hidden), "a search is scoped to the chip's group");
  ok(/data-pdxdb-find-none>/.test(e), "…and says nothing matched, rather than showing another group");
  B.setCategory(""); B.setQuery("");
  ok(/data-pdxdb-find-none hidden>/.test(B.tableHtml("ok", ITEMS, [])), "the no-match line is hidden with no search");
}

section("6 · HD-29, a generated board, uses the same renderer");
{
  must(existsSync(join(ROOT, "district-ut-hd-29.html")), "district-ut-hd-29.html is gone");
  const DOC = R("district-ut-hd-29.html");
  has(DOC, '<script defer src="/district-board.js"></script>', "HD-29 loads the one board module");
  no(DOC, "pdxdb-group", "HD-29 carries no grouping markup of its own");
  const Wh = boot({ items: ITEMS, seat: "ut-hd-29" });
  const host = hostEl("ut-hd-29");
  Wh.PDXDistrictBoard.mount(host);
  await flush();
  eq(Wh.PDXDistrictBoard.active().alias, "ut-hd-29", "the HD-29 board mounted");
  const problems = checkGrouped(host.innerHTML, ITEMS);
  eq(JSON.stringify(problems), "[]", "HD-29's painted band is the grouped table");
  const band = (s) => (/<section class="pdxdb-band pdxdb-band--table"[\s\S]*?<\/section>/.exec(s) || [""])[0];
  const sd3 = boot({ items: ITEMS }).PDXDistrictBoard.tableHtml("ok", ITEMS, []);
  eq(band(Wh.PDXDistrictBoard.tableHtml("ok", ITEMS, [])), band(sd3),
    "HD-29 and SD-3 print byte-identical band 3 markup for the same rows");
  eq(JSON.stringify(Wh.PDXDistrictBoard.issues().sort()),
    JSON.stringify(["enviro_energy", "housing", "public_schools", "water"]),
    "the issue list the board publishes is the groups it printed");
}

section("7 · mutations the checker must catch");
{
  // A FLAT, UNGROUPED LIST: the same rows in one table, no groups.
  const rows = [...html.matchAll(/<tr class="pdxdb-row"[\s\S]*?<\/tr>/g)].map((x) => x[0]);
  const flat = '<table class="pdxdb-table"><tbody>' + rows.join("") + "</tbody></table>";
  ok(checkGrouped(flat, ITEMS).length > 0, "a flat ungrouped list passes the grouping check");
  // A MADE-UP CATEGORY LABEL that is on no chip.
  const madeUp = html.replace(/(<details class="pdxdb-group" data-pdxdb-group="water"[^>]*><summary class="pdxdb-group-h"><span class="pdxdb-group-l"[^>]*>)[^<]*/,
    "$1Environment &amp; Everything");
  ok(madeUp !== html, "FIXTURE: the made-up-label mutation applied");
  ok(checkGrouped(madeUp, ITEMS).some((p) => /not a chip|not its chip/.test(p)), "a made-up category label passes the check");
  // A NEW PRIMARY: the two-chip measure dropped from one of its groups.
  const primaried = html.replace(/(<details class="pdxdb-group" data-pdxdb-group="housing"[\s\S]*?)<tr class="pdxdb-row"[^>]*>(?:(?!<\/tr>)[\s\S])*Water-Wise(?:(?!<\/tr>)[\s\S])*<\/tr>/, "$1");
  ok(primaried !== html, "FIXTURE: the primary mutation applied");
  ok(checkGrouped(primaried, ITEMS).some((p) => /S\.B\. 336 is not under housing/.test(p)),
    "a two-chip measure shown under one group only passes the check");
  // The module source carries no hard-coded category list.
  for (const w of ["'Other'", "'Misc", "'Uncategorized'"]) no(MOD, w, "the module invents no catch-all category");
}

section("8 · one stylesheet, linked by the module, precached; SW moved");
{
  ok(existsSync(join(ROOT, "district-board.css")), "district-board.css exists");
  has(MOD, "'/district-board.css'", "the module links the sheet");
  has(SW, "'/district-board.css',", "the sheet is precached");
  has(SW, "// v259 - ", "the SW moved one version (v259 entry filed)");
  const CSS = R("district-board.css");
  const keys = Object.keys(W.ISSUE_MAP || {});
  eq(keys.filter((k) => CSS.indexOf("--pdx-ic-" + k) >= 0).length, 0, "the sheet carries no per-issue colour rule");
  for (const w of ["equity", "equitable", "marginalized", "underserved"]) {
    ok(!new RegExp(w, "i").test((/var COPY = \{[\s\S]*?\n  \};/.exec(MOD) || [""])[0]), `no "${w}" in the board copy`);
  }
}

report();
