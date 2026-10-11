#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE PARENT LAYER IS FORCED ON THE COMPOSER BOARDS
// ─────────────────────────────────────────────────────────────────────────────
// The five composer boards must open with one collapsed parent header per core
// before any issue group — whether the board knows it is a composer board from
// the composer host or from its own declared seat. What must hold:
//
//   1. A COMPOSER-BOARD FIXTURE — host present, OR seat declared with no host —
//      shows parent headers (collapsed class, nested issues hidden) before any
//      issue group, and no issue group outside a parent. Top chips: All +
//      Mandates.
//   2. EXPANDING A PARENT shows only its issues.
//   3. A GENERATED-BOARD FIXTURE has zero parent headers, declared seat or not.
//   4. THE CORE LOOKUP holds when coreIssueForKey is absent (the table itself).
//   5. MUTATION: a renderer that skips the parent layer fails the checker, and
//      so does one that ignores the declared seat.
//   6. The composer seat list equals district-composer.js's; the SW moved.
//
//   node scripts/test-district-board-force-parents.mjs
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
  console.log(`\n   ✓ district board force parents: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

// `host`: the composer host is on the document. `seat`: the document declares
// a seat. `noCoreReader`: coreIssueForKey is removed after issue-map.js loads.
function boot({ host, seat, src, noCoreReader } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  if (noCoreReader) { delete win.coreIssueForKey; delete win.PDXIssueFamily; }
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => ["water"], position: (k) => (k === "water" ? "support" : null) };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  if (host) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
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
];
const MANDATES = [{ id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3 }];

// ── THE CHECKER ─────────────────────────────────────────────────────────────
// Problems with "this band opens with collapsed parent headers"; [] holds.
function parentHeads(html) {
  return [...html.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"([^>]*)>\s*<summary class="([^"]*)" aria-expanded="([^"]*)"[^>]*>/g)]
    .map((x) => ({ key: x[1], open: /\sopen\b/.test(x[2]), cls: x[3], aria: x[4], at: x.index }));
}
function checkParents(html) {
  const problems = [];
  const heads = parentHeads(html);
  if (!heads.length) { problems.push("no parent header — the band is flat"); return problems; }
  const firstGroup = html.search(/<details class="pdxdb-group[^"]*" data-pdxdb-group="[^"]+"/);
  if (firstGroup >= 0 && firstGroup < heads[0].at) problems.push("an issue group paints before the first parent header");
  for (const h of heads) {
    if (h.open) problems.push(`${h.key}: the parent is open`);
    if (!h.cls.split(/\s+/).includes("pdxdb-parent-h--collapsed")) problems.push(`${h.key}: the header lacks the collapsed class`);
    if (h.aria !== "false") problems.push(`${h.key}: aria-expanded is ${h.aria}`);
  }
  const bodies = [...html.matchAll(/<div class="pdxdb-parent-b" data-pdxdb-parent-body=""([^>]*)>/g)];
  if (bodies.length !== heads.length) problems.push("a parent has no body");
  if (bodies.some((b) => !/\shidden\b/.test(b[1]))) problems.push("a parent body is visible — its issues show");
  // No keyed issue group outside a parent.
  const outside = html.replace(/<details class="pdxdb-parent"[\s\S]*?<\/div><\/div>\s*<\/details>/g, "");
  if (/<details class="pdxdb-group[^"]*" data-pdxdb-group="[^"]+"/.test(outside)) problems.push("an issue group sits outside every parent");
  const top = ((/<div class="pdxdb-cats" role="group"[^>]*>([\s\S]*?)<\/div>/.exec(html)) || [])[1] || "";
  const topKeys = [...top.matchAll(/data-pdxdb-cat="([^"]*)"/g)].map((x) => x[1]);
  if (topKeys.some((k) => k && k[0] !== "@")) problems.push(`the top chip row carries an issue chip (${topKeys.join(",")})`);
  return problems;
}

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · a composer board opens with collapsed parent headers");
const FIXTURES = [
  ["host present", { host: true }],
  ["seat declared, no host", { seat: "ut-sd-3" }],
  ["UT-2 by its key", { seat: "ut-house-2" }],
  ["HD-16 by its alias", { seat: "ut-hd-16" }],
];
let C;
for (const [name, opts] of FIXTURES) {
  const { B } = boot(opts);
  must(B && typeof B.tableHtml === "function", `${name}: PDXDistrictBoard did not publish`);
  ok(B.composerBoard() === true, `${name}: the board knows it is a composer board`);
  const h = B.tableHtml("ok", ITEMS, [], MANDATES);
  eq(JSON.stringify(checkParents(h)), "[]", `${name}: collapsed parents, nested issues hidden, All + Mandates on top`);
  ok(/data-pdxdb-layout="parents"/.test(h), `${name}: the list says its layout`);
  if (!C) C = B;
}
const first = C.tableHtml("ok", ITEMS, [], MANDATES);
ok(parentHeads(first).length >= 1, "at least one parent header");
ok(/<span class="pdxdb-parent-l">🦅 Foreign Policy &amp; National Security<\/span>/.test(first), "Foreign Policy & National Security is a parent header");
ok(/<span class="pdxdb-parent-l">💵 Economy, Cost of Living &amp; Infrastructure<\/span>/.test(first), "Economy is a parent header");
// Mounted on a host that declares the seat, with no composer host on the doc.
{
  const { B } = boot({});
  const host = { innerHTML: "", getAttribute: (n) => (n === "data-pdxdb-seat" ? "ut-sd-7" : null), setAttribute() {}, appendChild() {}, addEventListener() {} };
  ok(B.mount(host) === true, "SD-7 mounts from its host's declared seat");
  ok(B.composerBoard() === true, "…and is a composer board with no composer host found");
}

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · expanding a parent shows only its issues");
{
  const { win } = boot({ host: true });
  const coreOf = (k) => win.coreIssueForKey(k).key;
  const re = /<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"[\s\S]*?<div class="pdxdb-parent-b"[^>]*>([\s\S]*?)<\/div><\/div>\s*<\/details>/g;
  let g, n = 0;
  while ((g = re.exec(first))) {
    n++;
    const inside = [...g[2].matchAll(/data-pdxdb-group="([^"]+)"/g)].map((x) => x[1]).sort();
    const want = ITEMS.map((it) => it.issues[0].issueKey).filter((k) => coreOf(k) === g[1]).sort();
    eq(JSON.stringify(inside), JSON.stringify(want), `${g[1]} holds only its own issues`);
  }
  eq(n, 4, "four parents for the fixture's four cores");
  // A hand toggle on one parent leaves every other parent collapsed.
  const mk = (key) => {
    const sum = { a: { "aria-expanded": "false" }, c: new Set(["pdxdb-parent-h", "pdxdb-parent-h--collapsed"]) };
    sum.setAttribute = (k, v) => { sum.a[k] = v; };
    sum.classList = { add: (x) => sum.c.add(x), remove: (x) => sum.c.delete(x) };
    const body = { hidden: true };
    const d = { open: false, hidden: false, attrs: { "data-pdxdb-parent": key }, getAttribute(k) { return this.attrs[k]; }, hasAttribute(k) { return k in this.attrs; },
      querySelector: (s) => s === ".pdxdb-parent-h" ? sum : s === "[data-pdxdb-parent-body]" ? body : null, querySelectorAll: () => [] };
    return { d, sum, body };
  };
  const a = mk("economy_cost_of_living"), b = mk("foreign_policy_defense");
  const L = {};
  const host = { innerHTML: "", getAttribute: () => null, setAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); } };
  C.mount(host);
  a.d.open = true;
  for (const f of L.toggle || []) f({ target: a.d });
  ok(a.sum.a["aria-expanded"] === "true" && !a.body.hidden && !a.sum.c.has("pdxdb-parent-h--collapsed"), "expanding Economy shows its body");
  ok(b.sum.a["aria-expanded"] === "false" && b.body.hidden && !b.d.open, "…and Foreign Policy stays collapsed");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · a generated board has zero parent headers");
for (const [name, opts] of [["no seat", {}], ["HD-29", { seat: "ut-hd-29" }], ["Governor", { seat: "ut-gov" }], ["Lee", { seat: "ut-us-senate-lee" }]]) {
  const { B } = boot(opts);
  ok(B.composerBoard() === false, `${name}: not a composer board`);
  const h = B.tableHtml("ok", ITEMS, []);
  eq(parentHeads(h).length, 0, `${name}: zero parent headers`);
  ok(!/pdxdb-parent|data-pdxdb-layout/.test(h), `${name}: no parent markup at all`);
  ok(/data-pdxdb-cat="housing"/.test(((/<div class="pdxdb-cats" role="group"[^>]*>([\s\S]*?)<\/div>/.exec(h)) || [])[1] || ""), `${name}: issue chips stay in the one chip row`);
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · the core lookup holds without coreIssueForKey");
{
  const { B, win } = boot({ host: true, noCoreReader: true });
  ok(typeof win.coreIssueForKey !== "function", "fixture: coreIssueForKey is gone");
  const h = B.tableHtml("ok", ITEMS, [], MANDATES);
  eq(JSON.stringify(checkParents(h)), "[]", "the parents still paint from CORE_NATIONAL_ISSUES itself");
  eq(parentHeads(h).map((x) => x.key).join(","), parentHeads(first).map((x) => x.key).join(","), "…the same parents, in the same order");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · mutation: a renderer that skips the parent layer fails");
{
  const SKIP = "var P = composer ? parentsOf(G.groups) : null;";
  must(MOD.includes(SKIP), "the parent layer's switch is not where the mutation expects it");
  const { B: M1 } = boot({ host: true, src: MOD.replace(SKIP, "var P = null;") });
  const p1 = checkParents(M1.tableHtml("ok", ITEMS, [], MANDATES));
  ok(p1.includes("no parent header — the band is flat"), `a renderer with no parent layer fails (${p1.join("; ")})`);

  const SEAT = "return composerOwned() || composerSeatDeclared();";
  must(MOD.includes(SEAT), "the seat switch is not where the mutation expects it");
  const { B: M2 } = boot({ seat: "ut-sd-3", src: MOD.replace(SEAT, "return composerOwned();") });
  ok(checkParents(M2.tableHtml("ok", ITEMS, [], MANDATES)).length > 0, "a renderer that ignores the declared seat fails on a host-less composer board");

  const { B: M3 } = boot({ host: true, src: MOD.replace("for (var pi = 0; pi < P.parents.length; pi++) groups += parentHtml(P.parents[pi], tally, stance);",
    "for (var pi = 0; pi < P.parents.length; pi++) for (var pj = 0; pj < P.parents[pi].groups.length; pj++) groups += groupHtml(P.parents[pi].groups[pj].key, P.parents[pi].groups[pj].label, P.parents[pi].groups[pj].rows, tally, stance);") });
  ok(checkParents(M3.tableHtml("ok", ITEMS, [], MANDATES)).length > 0, "a renderer that flattens the parents' groups fails");

  ok(checkParents(first.replace(/ pdxdb-parent-h--collapsed/, "")).some((x) => /collapsed class/.test(x)), "a parent header without the collapsed class fails");
  ok(checkParents(first.replace(/(<div class="pdxdb-parent-b" data-pdxdb-parent-body="") hidden>/, "$1>")).some((x) => /body is visible/.test(x)), "a visible parent body fails");
}

// ── 6 ───────────────────────────────────────────────────────────────────────
section("6 · one composer seat list, and the shell moved");
{
  const theirs = /var COMPOSER_SEATS = \{([^}]*)\}/.exec(R("district-composer.js"));
  must(!!theirs, "district-composer.js's COMPOSER_SEATS not found");
  const keys = (src) => [...src.matchAll(/'([a-z0-9-]+)'\s*:/g)].map((x) => x[1]).sort().join(",");
  eq(Object.keys(C.COMPOSER_SEATS).sort().join(","), keys(theirs[1]), "district-board.js's composer seats equal district-composer.js's");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 339, "the shell moved at least to v339");
  ok(/v339 - [\s\S]*?MIGRATION COST: none/.test(SW), "v339's log says no migration");
  ok(/'\/district-board\.js'/.test(SW), "district-board.js is precached");
}

report();
