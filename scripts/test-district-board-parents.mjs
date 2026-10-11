#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for COMPOSER BOARDS GROUP ISSUES UNDER PARENT CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
// On the five composer boards band 3 nests each issue group under its core
// category from CORE_NATIONAL_ISSUES (the existing one parent table). What
// must hold:
//
//   1. EVERY PARENT STARTS COLLAPSED (closed <details>, collapsed class,
//      aria-expanded="false", hidden body) with a count of its issues, and the
//      nested issue groups and chips are inside that hidden body.
//   2. EXPANDING A PARENT shows only its own issues.
//   3. SEARCH (titles, bill numbers) and an ISSUE CHIP open the matching
//      parent and only the matching issue group; the Mandates chip stays in
//      the top row and shows mandate rows only.
//   4. NO NEW TAXONOMY: each parent is the core coreIssueForKey names, with
//      that core's own label, in that table's order.
//   5. A GENERATED BOARD stays flat.
//   6. No equity or stock language; the SW moved, no migration.
//
//   node scripts/test-district-board-parents.mjs
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
  console.log(`\n   ✓ district board parents: all ${passed} assertions passed`);
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
  return { B: win.PDXDistrictBoard, win };
}

const iss = (...keys) => keys.map((k) => ({ issueKey: k, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }));
const m = (id, number, title, keys) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: iss(...keys),
});
// Two issues under Economy, one each under Education, Climate and Foreign
// Policy, and an unfiled row.
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", ["housing"]),
  m(2, "S.B. 12", "Property Tax Relief", ["prop_tax"]),
  m(3, "S.B. 57", "Public Education Funding", ["public_schools"]),
  m(4, "H.B. 208", "Great Salt Lake Watershed", ["water"]),
  m(5, "H.C.R. 3", "Resolution Supporting Israel", ["israel_support"]),
  m(6, "H.B. 9", "Technical Corrections", []),
];
const MANDATES = [{ id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3 }];

function parseParents(html) {
  const out = [];
  const re = /<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"([^>]*)>\s*<summary([^>]*)>([\s\S]*?)<\/summary>\s*<div class="pdxdb-parent-b"([^>]*)>([\s\S]*?)<\/div><\/div>\s*<\/details>/g;
  let g;
  while ((g = re.exec(html))) {
    const [, key, attrs, sumAttrs, head, bodyAttrs, body] = g;
    out.push({
      key,
      open: /\sopen\b/.test(attrs),
      hidden: /\shidden\b/.test(attrs),
      collapsed: /pdxdb-parent-h--collapsed/.test(sumAttrs),
      aria: ((/aria-expanded="([^"]*)"/.exec(sumAttrs)) || [])[1],
      label: ((/<span class="pdxdb-parent-l">([^<]*)<\/span>/.exec(head)) || [])[1] || "",
      count: Number(((/data-pdxdb-parent-count="(\d+)"/.exec(head)) || [])[1]),
      bodyHidden: /\shidden\b/.test(bodyAttrs),
      chips: [...body.matchAll(/data-pdxdb-cat="([^"]*)"/g)].map((x) => x[1]),
      groups: [...body.matchAll(/<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>/g)].map((x) => ({ key: x[1], open: /\sopen\b/.test(x[2]), hidden: /\shidden\b/.test(x[2]) })),
    });
  }
  return out;
}
function topGroups(html) {
  // Groups outside any parent: strip the parents first.
  const flat = html.replace(/<details class="pdxdb-parent"[\s\S]*?<\/div><\/div>\s*<\/details>/g, "");
  return [...flat.matchAll(/<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>/g)].map((x) => ({ key: x[1], hidden: /\shidden\b/.test(x[2]) }));
}
const topChips = (html) => [...(((/<div class="pdxdb-cats" role="group"[^>]*>([\s\S]*?)<\/div>/.exec(html)) || [])[1] || "").matchAll(/data-pdxdb-cat="([^"]*)"/g)].map((x) => x[1]);
const mandateShown = (html) => { const l = /<ul class="pdxdb-mandates"([^>]*)>/.exec(html); return !!l && !/\shidden\b/.test(l[1]); };

const { B: C, win: CW } = boot({ composer: true, desk: { water: "support" } });
const { B: G } = boot({ composer: false, desk: { water: "support" } });
must(C && G && typeof C.tableHtml === "function", "PDXDistrictBoard did not publish");
must(typeof CW.coreIssueForKey === "function" && Array.isArray(CW.CORE_NATIONAL_ISSUES), "issue-map.js did not publish the core table");
const coreOf = (k) => CW.coreIssueForKey(k).key;
const MK = C.MANDATE_KEY;

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · every parent starts collapsed, its issues hidden inside it");
const first = C.tableHtml("ok", ITEMS, [], MANDATES);
const P1 = parseParents(first);
eq(P1.length, 4, "four parents: Economy, Education, Climate and Foreign Policy");
for (const p of P1) {
  ok(!p.open && p.collapsed && p.aria === "false" && p.bodyHidden, `${p.key}: closed, collapsed class, aria-expanded false, body hidden`);
  ok(!p.hidden, `${p.key}: listed under All`);
  eq(p.count, p.groups.length, `${p.key}: the header counts the issues inside`);
}
eq(P1.find((p) => p.key === "economy_cost_of_living").count, 2, "Economy holds two issues: housing and property tax");
ok(P1.find((p) => p.key === "climate_energy").groups.every((g) => !g.open), "the visitor's stance group is collapsed inside its collapsed parent");
eq(JSON.stringify(topGroups(first).map((g) => g.key)), '[""]', "only the unfiled rows sit outside a parent");
eq(JSON.stringify(topChips(first)), JSON.stringify(["", MK]), "the top chip row is All and Mandates");
ok(first.indexOf('data-pdxdb-cat="housing"') > first.indexOf('data-pdxdb-parent="economy_cost_of_living"'), "the housing chip sits inside the Economy parent");

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · expanding a parent shows only its issues");
{
  for (const p of P1) {
    const want = ITEMS.filter((it) => it.issues.length && coreOf(it.issues[0].issueKey) === p.key).map((it) => it.issues[0].issueKey).sort();
    eq(JSON.stringify(p.groups.map((g) => g.key).sort()), JSON.stringify(want), `${p.key} holds exactly its own issues`);
    eq(JSON.stringify(p.chips.slice().sort()), JSON.stringify(want), `${p.key}'s chips are exactly its own issues`);
  }
  // In place: a hand toggle expands one parent, and only it.
  const mk = (key, kids) => {
    const sum = { attrs: { "aria-expanded": "false" }, cls: new Set(["pdxdb-parent-h", "pdxdb-parent-h--collapsed"]) };
    sum.setAttribute = (n, v) => { sum.attrs[n] = v; };
    sum.classList = { add: (c) => sum.cls.add(c), remove: (c) => sum.cls.delete(c), contains: (c) => sum.cls.has(c) };
    const body = { hidden: true };
    const d = { open: false, hidden: false, attrs: { "data-pdxdb-parent": key },
      getAttribute(n) { return this.attrs[n]; }, hasAttribute(n) { return n in this.attrs; },
      querySelector: (s) => s === ".pdxdb-parent-h" ? sum : s === "[data-pdxdb-parent-body]" ? body : null,
      querySelectorAll: () => kids };
    return { d, sum, body };
  };
  const kid = (key) => ({ open: false, hidden: false, attrs: { "data-pdxdb-group": key }, getAttribute(n) { return this.attrs[n]; },
    hasAttribute(n) { return n in this.attrs; }, querySelector: () => null, querySelectorAll: () => [] });
  const econKids = [kid("housing"), kid("prop_tax")];
  const eduKids = [kid("public_schools")];
  const econ = mk("economy_cost_of_living", econKids);
  const edu = mk("education_parental", eduKids);
  const listeners = {};
  const host = { innerHTML: "", getAttribute: () => null, setAttribute() {}, appendChild() {},
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    querySelector: () => null,
    querySelectorAll: () => [] };
  C.mount(host);
  host.querySelectorAll = (s) => s === "[data-pdxdb-group]" ? [...econKids, ...eduKids] : s === "[data-pdxdb-parent]" ? [econ.d, edu.d] : [];
  econ.d.open = true;
  for (const f of listeners.toggle || []) f({ target: econ.d });
  ok(econ.sum.attrs["aria-expanded"] === "true" && !econ.sum.cls.has("pdxdb-parent-h--collapsed") && !econ.body.hidden, "a hand toggle expands Economy in all three places");
  ok(edu.sum.attrs["aria-expanded"] === "false" && edu.body.hidden && !edu.d.open, "…and Education stays collapsed");
  ok(econKids.every((k) => !k.open), "…and Economy's issue groups are listed but still collapsed");

  // In place: a chip opens only its parent.
  C.setCategory("public_schools");
  ok(edu.d.open && !edu.d.hidden && !edu.body.hidden, "in place: the schools chip opens Education");
  ok(econ.d.hidden, "in place: …and hides Economy");
  ok(eduKids[0].open && econKids.every((k) => k.hidden), "in place: …with only the schools group open");
  C.setCategory("");
  ok(!edu.d.open && edu.body.hidden && !edu.d.hidden && !econ.d.hidden, "in place: All collapses Education again and lists both");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · search and issue chips open the matching parent and group");
{
  for (const [q, issue] of [["S.B. 57", "public_schools"], ["sb12", "prop_tax"], ["starter home", "housing"], ["israel", "israel_support"]]) {
    C.setQuery(q);
    const P = parseParents(C.tableHtml("ok", ITEMS, [], MANDATES));
    const shown = P.filter((p) => !p.hidden);
    eq(JSON.stringify(shown.map((p) => p.key)), JSON.stringify([coreOf(issue)]), `"${q}" shows only the ${coreOf(issue)} parent`);
    ok(shown[0] && shown[0].open && !shown[0].bodyHidden && shown[0].aria === "true", `"${q}" opens that parent`);
    const gs = shown[0] ? shown[0].groups : [];
    eq(JSON.stringify(gs.filter((g) => !g.hidden && g.open).map((g) => g.key)), JSON.stringify([issue]), `"${q}" opens only the ${issue} group`);
  }
  C.setQuery("");

  C.setCategory("housing");
  const P = parseParents(C.tableHtml("ok", ITEMS, [], MANDATES));
  eq(JSON.stringify(P.filter((p) => !p.hidden).map((p) => p.key)), '["economy_cost_of_living"]', "the housing chip shows only Economy");
  const econ = P.find((p) => p.key === "economy_cost_of_living");
  ok(econ.open && !econ.bodyHidden, "…open");
  eq(JSON.stringify(econ.groups.filter((g) => !g.hidden).map((g) => g.key)), '["housing"]', "…with only the housing group shown");
  ok(econ.groups.find((g) => g.key === "housing").open, "…and open");
  ok(!mandateShown(C.tableHtml("ok", ITEMS, [], MANDATES)), "an issue chip hides the mandate rows");

  C.setCategory(MK);
  const hm = C.tableHtml("ok", ITEMS, [], MANDATES);
  ok(mandateShown(hm), "the Mandates chip shows the mandate rows");
  ok(parseParents(hm).every((p) => p.hidden), "…and hides every parent");
  ok(topGroups(hm).every((g) => g.hidden), "…and the unfiled rows");
  C.setCategory("");
  const back = C.tableHtml("ok", ITEMS, [], MANDATES);
  ok(parseParents(back).every((p) => !p.open && p.collapsed && !p.hidden), "back to All: every parent listed and collapsed");
  ok(mandateShown(back), "…and the mandate rows shown");
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · no new taxonomy");
{
  const cores = CW.CORE_NATIONAL_ISSUES;
  for (const p of P1) {
    const c = cores.find((x) => x.key === p.key);
    ok(!!c, `${p.key} is a core in CORE_NATIONAL_ISSUES`);
    eq(p.label.replace(/&amp;/g, "&"), c && c.label, `${p.key} prints the core's own label`);
  }
  const rank = (k) => cores.findIndex((x) => x.key === k);
  const order = P1.map((p) => rank(p.key));
  ok(order.every((r, i) => i === 0 || order[i - 1] < r), "parents print in the core table's order");
  ok(P1.some((p) => /Foreign Policy &amp; National Security/.test(first.slice(first.indexOf(`data-pdxdb-parent="${p.key}"`)).slice(0, 600))),
    "Foreign Policy & National Security is a parent header");
  ok(!/Other|Misc/.test(P1.map((p) => p.label).join(" ")), "no Other or Misc parent");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · a generated board stays flat");
{
  const h = G.tableHtml("ok", ITEMS, []);
  eq(parseParents(h).length, 0, "no parent on a generated board");
  ok(!/pdxdb-parent/.test(h), "no parent markup at all");
  ok(topChips(h).includes("housing") && topChips(h).includes("water"), "the issue chips stay in the one chip row");
  eq(topGroups(h).length, 6, "every issue group and the unfiled rows sit flat");
  eq(JSON.stringify(topGroups(h).filter((g) => !g.hidden).length), "6", "…all listed");
  ok(/data-pdxdb-group="water" open/.test(h), "the visitor's stance group still opens on a generated board");
}

// ── 6 ───────────────────────────────────────────────────────────────────────
section("6 · no equity or stock language, and the shell moved");
{
  const BANNED = /\b(equity|equities|stocks?|shares?|shareholders?|stakes?|stakeholders?|dividends?|portfolio)\b/i;
  // The new markup: parent headers and counts. Core labels are the table's own.
  const heads = [...first.matchAll(/<summary class="pdxdb-parent-h[\s\S]*?<\/summary>/g)].map((x) => x[0].replace(/<[^>]+>/g, " ")).join(" ");
  must(heads.length > 40, "parent headers not found");
  ok(!BANNED.test(heads), `the parent headers carry no equity or stock word — ${(BANNED.exec(heads) || [])[0]}`);
  const css = R("district-board.css");
  const note = css.slice(css.indexOf("THE PARENT LAYER"), css.indexOf(".pdxdb-parent {"));
  ok(!BANNED.test(note), "the stylesheet's parent note carries no equity or stock word");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 338, "the shell moved at least to v338");
  ok(/v338 - [\s\S]*?MIGRATION COST: none/.test(SW), "v338's log says no migration");
}

report();
