#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for ON THE TABLE, EASIER TO SCAN (the five composer boards)
// ─────────────────────────────────────────────────────────────────────────────
// On SD-3, HD-16, SD-7, HD-15 and UT-2 band 3 was tightened. What must hold:
//
//   1. EVERY ISSUE GROUP STARTS COLLAPSED on a composer board — even one the
//      visitor holds a side on. A generated board keeps opening that one.
//   2. THE SEARCH FIELD SITS ABOVE THE CHIPS, labelled "Find a topic or
//      mandate", and still filters by title and bill number. A generated
//      board keeps its chips-then-"Find a measure" order.
//   3. MANDATES ARE A CHIP, NOT A GROUP. The rows are a flat list (no
//      collapsible header) above the issue groups. All shows them; "Mandates"
//      shows only them; any issue chip hides them. Same answer re-applied in
//      place over the DOM.
//   4. /find's location button reads "Use my device's location", and no
//      surface prints "Use my phone's location".
//   5. No equity or stock language; the SW moved with no migration.
//
//   node scripts/test-district-board-scan.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const MOD = R("district-board.js");
const SW = R("sw.js");
const FIND = R("find.html");

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
  console.log(`\n   ✓ district board scan: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

function boot({ composer, desk } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  const d = desk || {};
  win.PDXYourFile = { answered: () => Object.keys(d), position: (k) => d[k] || null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  if (composer) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return win.PDXDistrictBoard;
}

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
  m(4, "H.B. 9", "Technical Corrections", []),
];
const MANDATES = [
  { id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3, linkedRaceIds: ["ut-sd-3"], linkedPoliticianIds: [] },
  { id: 8, title: "Open the redistricting map files", supportCount: 1, linkedRaceIds: [], linkedPoliticianIds: ["john_johnson"] },
];

function parseGroups(html) {
  const out = [];
  const re = /<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>([\s\S]*?)<\/details>/g;
  let g;
  while ((g = re.exec(html))) {
    const rows = [...g[3].matchAll(/<tr class="pdxdb-row"([^>]*)>/g)].map((r) => ({ hidden: /\shidden\b/.test(r[1]), find: ((/data-pdxdb-find="([^"]*)"/.exec(r[1])) || [])[1] }));
    out.push({ key: g[1], open: /\sopen\b/.test(g[2]), hidden: /\shidden\b/.test(g[2]), rows });
  }
  return out;
}
const mandateList = (html) => ((/<ul class="pdxdb-mandates"([^>]*)>([\s\S]*?)<\/ul>/.exec(html)) || null);
const mandateShown = (html) => { const l = mandateList(html); return !!l && !/\shidden\b/.test(l[1]); };

const C = boot({ composer: true, desk: { water: "support" } });
const G = boot({ composer: false, desk: { water: "support" } });
must(C && G && C.MANDATE_KEY, "PDXDistrictBoard did not publish");
const MK = C.MANDATE_KEY;
must(!!C.issueLabel("water") && !!C.issueLabel("housing"), "ISSUE_MAP no longer labels the fixture's issues");

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · every issue group starts collapsed on a composer board");
{
  const h = C.tableHtml("ok", ITEMS, [], MANDATES);
  const gs = parseGroups(h);
  eq(gs.length, 4, "housing, schools, water and the unfiled rows all render");
  ok(gs.every((g) => !g.open), "no issue group is open on first paint — not even the one the visitor holds a side on");
  ok(gs.every((g) => !g.hidden), "…and every one is shown under All");
  const hg = G.tableHtml("ok", ITEMS, []);
  eq(JSON.stringify(parseGroups(hg).filter((g) => g.open).map((g) => g.key)), '["water"]',
    "a generated board still opens the group the visitor holds a side on");
}

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · the search sits above the chips and still filters titles and bill numbers");
{
  const h = C.tableHtml("ok", ITEMS, [], MANDATES);
  has(h, '<span class="pdxdb-find-l">Find a topic or mandate</span>', "the finder is labelled Find a topic or mandate");
  ok(h.indexOf("data-pdxdb-search") < h.indexOf('class="pdxdb-cats"'), "the search field comes before the chip row");
  eq((h.match(/<input class="pdxdb-find-i"/g) || []).length, 1, "there is still one search field");
  no(h, "position: sticky", "no sticky filter bar");
  no(R("district-board.css"), "sticky", "the stylesheet adds no sticky bar");

  const hg = G.tableHtml("ok", ITEMS, []);
  has(hg, '<span class="pdxdb-find-l">Find a measure</span>', "a generated board keeps Find a measure");
  ok(hg.indexOf('class="pdxdb-cats"') < hg.indexOf("data-pdxdb-search"), "a generated board keeps chips before search");
  no(hg, "Find a topic or mandate", "a generated board never names mandates");

  for (const [q, want] of [["S.B. 57", "public_schools"], ["sb57", "public_schools"], ["hb 101", "housing"], ["watershed", "water"]]) {
    C.setQuery(q);
    const gs = parseGroups(C.tableHtml("ok", ITEMS, [], MANDATES));
    const shown = gs.filter((g) => !g.hidden).map((g) => g.key);
    eq(JSON.stringify(shown), JSON.stringify([want]), `"${q}" shows only the ${want} group`);
    ok(gs.find((g) => g.key === want).open, `"${q}" opens the group it matched`);
  }
  C.setQuery("committee vote");
  const hm = C.tableHtml("ok", ITEMS, [], MANDATES);
  ok(mandateShown(hm), "a mandate title is found by the same search");
  ok(parseGroups(hm).every((g) => g.hidden), "…and no issue group matches it");
  eq((mandateList(hm)[2].match(/<li [^>]*\shidden\b/g) || []).length, 1, "…and the other mandate row is hidden");
  C.setQuery("zzz-nothing");
  ok(/data-pdxdb-find-none>/.test(C.tableHtml("ok", ITEMS, [], MANDATES)), "a search matching nothing prints the no-match line");
  C.setQuery("");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · Mandates is a chip in the same row, not a group at the bottom");
{
  C.setCategory("");
  const h = C.tableHtml("ok", ITEMS, [], MANDATES);
  const cats = (/<div class="pdxdb-cats"[^>]*>([\s\S]*?)<\/div>/.exec(h) || [])[1] || "";
  has(cats, `data-pdxdb-cat="${MK}"`, "the Mandates chip sits in the chip row");
  has(cats, ">Mandates<span class=\"pdxdb-cat-n\">2</span>", "…labelled Mandates with its count");
  const list = mandateList(h);
  ok(!!list, "the mandate rows print as a list");
  no(h, "data-pdxdb-mandates=\"\" open", "the mandate list is not a collapsible");
  ok(!/<details[^>]*data-pdxdb-mandates/.test(h), "the mandate rows are not a details group");
  no(h, "Mandates that name this seat", "there is no Mandates group header");
  ok(h.indexOf("data-pdxdb-mandates") < h.indexOf("data-pdxdb-group="), "the mandate rows are not at the bottom: they lead the list");
  eq((list[2].match(/<li class="pdxdb-mandate"/g) || []).length, 2, "one row per mandate");
  has(list[2], 'href="/mandate#pp-card-7"', "each row still links to its card on /mandate");
  ok(mandateShown(h), "All shows the mandate rows");
  ok(parseGroups(h).every((g) => !g.hidden), "All shows every issue group");

  C.setCategory(MK);
  const hm = C.tableHtml("ok", ITEMS, [], MANDATES);
  ok(mandateShown(hm), "Mandates shows the mandate rows");
  ok(parseGroups(hm).every((g) => g.hidden), "Mandates hides every issue group, the unfiled rows included");

  for (const k of ["housing", "water", "public_schools"]) {
    C.setCategory(k);
    const hk = C.tableHtml("ok", ITEMS, [], MANDATES);
    ok(!mandateShown(hk), `the ${k} chip hides the mandate rows`);
    eq(JSON.stringify(parseGroups(hk).filter((g) => !g.hidden).map((g) => g.key)), JSON.stringify([k]), `the ${k} chip shows only its group`);
  }
  C.setCategory("");

  // THE SAME ANSWER IN PLACE. A chip tap re-applies over the DOM, never a
  // rebuild — so applyView() must hide and show the list the same way.
  const node = (attrs, kids) => ({
    hidden: false, open: false,
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    setAttribute(n, v) { attrs[n] = v; },
    querySelectorAll: () => kids || [],
  });
  const rowsM = [node({ "data-pdxdb-find": "publish every committee vote" }), node({ "data-pdxdb-find": "open the redistricting map files" })];
  const ul = node({}, rowsM);
  const grp = node({ "data-pdxdb-group": "housing" }, [node({ "data-pdxdb-find": "starter home amendments h.b. 101" })]);
  const chipEls = [node({ "data-pdxdb-cat": "" }), node({ "data-pdxdb-cat": MK }), node({ "data-pdxdb-cat": "housing" })];
  const host = {
    innerHTML: "", getAttribute: () => null, setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null,
    querySelectorAll: (sel) => sel === "[data-pdxdb-cat]" ? chipEls : sel === "[data-pdxdb-group]" ? [grp] : sel === "[data-pdxdb-mandates]" ? [ul] : [],
  };
  C.mount(host);
  host.querySelectorAll = (sel) => sel === "[data-pdxdb-cat]" ? chipEls : sel === "[data-pdxdb-group]" ? [grp] : sel === "[data-pdxdb-mandates]" ? [ul] : [];
  C.setCategory(MK);
  ok(!ul.hidden && grp.hidden, "in place: Mandates shows the list and hides the issue group");
  eq(chipEls[1].getAttribute("aria-pressed"), "true", "in place: the Mandates chip is pressed");
  C.setCategory("housing");
  ok(ul.hidden && !grp.hidden, "in place: an issue chip hides the list and shows its group");
  C.setCategory("");
  ok(!ul.hidden && !grp.hidden, "in place: All shows both");
  ok(!grp.open, "in place: All leaves the issue group collapsed");
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · the location button says device, never phone");
{
  const btn = (/<button[^>]*id="pdx-map-detect"[\s\S]*?<\/button>/.exec(FIND) || [""])[0];
  must(!!btn, "find.html's location button not found");
  has(btn, "Use my device’s location", "the /find button reads Use my device's location");
  no(btn, "phone", "the button never says phone");
  const SURFACES = readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f) && f !== "sw.js");
  const offenders = SURFACES.filter((f) => /Use my phone(’|'|\\u2019)s location/.test(R(f)));
  eq(JSON.stringify(offenders), "[]", "no surface prints Use my phone's location");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · no equity or stock language, and the shell moved");
{
  const BANNED = /\b(equity|equities|stocks?|shares?|shareholders?|stakes?|stakeholders?|invest\w*|dividends?|portfolio|ownership)\b/i;
  const copy = [C.COPY.findLabelComposer, C.COPY.findPlaceholderComposer, C.COPY.catMandates, C.COPY.mandateTag, C.COPY.mandateStatus].join(" ");
  ok(!BANNED.test(copy), `the new copy carries no equity or stock word — ${(BANNED.exec(copy) || [])[0]}`);
  // The new markup only: the finder and the mandate rows. The issue chips print
  // ISSUE_MAP's own labels ("Invest in Public Schools"), which this pass did
  // not write and which are about public spending, not equity.
  const band = C.tableHtml("ok", ITEMS, [], MANDATES);
  const text = (((/<label class="pdxdb-find">[\s\S]*?<\/label>/.exec(band)) || [""])[0] + (mandateList(band) || [""])[0]).replace(/<[^>]+>/g, " ");
  must(text.length > 40, "the finder and mandate rows were not found");
  ok(!BANNED.test(text), `the finder and mandate rows carry no equity or stock word — ${(BANNED.exec(text) || [])[0]}`);
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 336, "the shell moved at least to v336");
  ok(/v336 - [\s\S]*?MIGRATION COST: none/.test(SW), "v336's log says no migration");
  for (const f of ["/district-board.js", "/district-board.css", "/find.html"]) has(SW, `'${f}'`, `${f} is precached`);
}

report();
