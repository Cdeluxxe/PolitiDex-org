#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for COMPOSER BOARD GROUPS START COLLAPSED
// ─────────────────────────────────────────────────────────────────────────────
// On the five composer boards every "On the table" issue group must start
// collapsed, and say so in the markup rather than only through <details>:
//
//   1. ON A COMPOSER BOARD every group header starts with the collapsed class
//      and aria-expanded="false", and the body is hidden — except the group the
//      visitor holds a side on, which starts open (v425: the same rule the
//      other boards always had), in all four places.
//   2. A CHIP OPENS ONLY THAT GROUP; a search opens only the groups it
//      matches. The same answer re-applied in place keeps header, aria and
//      body in step, and a hand toggle does too.
//   3. A GENERATED BOARD still opens the visitor's stance group, with the
//      markup it always had.
//   4. MUTATION: a renderer that leaves groups open on load fails the checker,
//      and so does markup with an open body or an expanded header.
//   5. The SW moved, with no migration.
//
//   node scripts/test-district-board-collapsed.mjs
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
  console.log(`\n   ✓ district board collapsed: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

function boot({ composer, desk, src } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  const d = desk || {};
  win.PDXYourFile = { answered: () => Object.keys(d), position: (k) => d[k] || null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  if (composer) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  vm.runInContext(src || MOD, ctx, { filename: "district-board.js" });
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
const DESK = { water: "support" };   // the visitor holds a side on water

// ── THE PARSER AND THE CHECKER ──────────────────────────────────────────────
function parseGroups(html) {
  const out = [];
  const re = /<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>\s*<summary([^>]*)>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  let g;
  while ((g = re.exec(html))) {
    const [, key, attrs, sumAttrs, , rest] = g;
    const cls = ((/class="([^"]*)"/.exec(sumAttrs)) || [])[1] || "";
    const aria = ((/aria-expanded="([^"]*)"/.exec(sumAttrs)) || [])[1];
    const bodyTag = (/<div class="pdxdb-group-b"[^>]*>/.exec(rest) || [])[0] || "";
    out.push({
      key,
      open: /\sopen\b/.test(attrs),
      hidden: /\shidden\b/.test(attrs),
      collapsedClass: cls.split(/\s+/).includes("pdxdb-group-h--collapsed"),
      aria,
      hasBody: !!bodyTag,
      bodyHidden: /\shidden\b/.test(bodyTag),
    });
  }
  return out;
}
// Problems with "every group starts collapsed, except the visitor's stance
// groups (`open`), which start expanded"; [] means it holds.
function checkCollapsed(html, open = []) {
  const problems = [];
  const gs = parseGroups(html);
  if (!gs.length) problems.push("no groups rendered");
  for (const g of gs) {
    const id = g.key || "(unfiled)";
    if (open.includes(g.key)) {
      if (!g.open) problems.push(`${id}: the stance group is not open`);
      if (g.collapsedClass) problems.push(`${id}: the stance group's header wears the collapsed class`);
      if (g.aria !== "true") problems.push(`${id}: the stance group's aria-expanded is ${JSON.stringify(g.aria)}`);
      if (g.hasBody && g.bodyHidden) problems.push(`${id}: the stance group's body is hidden`);
      continue;
    }
    if (g.open) problems.push(`${id}: the <details> is open`);
    if (!g.collapsedClass) problems.push(`${id}: the header lacks the collapsed class`);
    if (g.aria !== "false") problems.push(`${id}: aria-expanded is ${JSON.stringify(g.aria)}, not "false"`);
    if (!g.hasBody) problems.push(`${id}: no body wrapper`);
    else if (!g.bodyHidden) problems.push(`${id}: the body is visible`);
  }
  return problems;
}

const C = boot({ composer: true, desk: DESK });
const G = boot({ composer: false, desk: DESK });
must(C && G && typeof C.tableHtml === "function", "PDXDistrictBoard did not publish");
must(!!C.issueLabel("water"), "ISSUE_MAP no longer labels water — the stance fixture would be vacuous");

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · a composer board starts with every group collapsed but the visitor's own");
const first = C.tableHtml("ok", ITEMS, []);
const gs1 = parseGroups(first);
eq(gs1.length, 4, "housing, schools, water and the unfiled rows all render");
eq(JSON.stringify(checkCollapsed(first, ["water"])), "[]", "every group header is collapsed and every body hidden, except the stance group");
ok(gs1.find((g) => g.key === "water") && gs1.find((g) => g.key === "water").open, "the visitor's stance group starts open");
ok(checkCollapsed(first).some((x) => /^water: the <details> is open/.test(x)), "…which the strict all-collapsed reading refuses, so the exception is real");
ok(gs1.every((g) => !g.hidden), "every group is still listed under All");

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · a chip or a search opens only the matching groups");
{
  C.setCategory("housing");
  const gs = parseGroups(C.tableHtml("ok", ITEMS, []));
  const open = gs.filter((g) => g.open && !g.hidden).map((g) => g.key);
  eq(JSON.stringify(open), '["housing"]', "the housing chip opens only the housing group");
  const h = gs.find((g) => g.key === "housing");
  ok(!h.collapsedClass && h.aria === "true" && !h.bodyHidden, "…and its header is expanded and its body visible");
  ok(gs.filter((g) => g.key !== "housing").every((g) => g.hidden && !g.open), "every other group is hidden and closed");
  C.setCategory("");
  eq(JSON.stringify(checkCollapsed(C.tableHtml("ok", ITEMS, []), ["water"])), "[]", "back to All: collapsed again, the stance group open");

  C.setQuery("S.B. 57");
  const gq = parseGroups(C.tableHtml("ok", ITEMS, []));
  eq(JSON.stringify(gq.filter((g) => g.open).map((g) => g.key)), '["public_schools"]', "a bill-number search opens only its group");
  ok(gq.find((g) => g.key === "public_schools").aria === "true", "…expanded in aria too");
  C.setQuery("watershed");
  eq(JSON.stringify(parseGroups(C.tableHtml("ok", ITEMS, [])).filter((g) => g.open).map((g) => g.key)), '["water"]', "a title search opens only its group");
  C.setQuery("");

  // THE SAME ANSWER IN PLACE, over a minimal DOM.
  const mkClassList = (init) => {
    const set = new Set(init);
    return { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) };
  };
  const mkGroup = (key) => {
    const sum = { attrs: { "aria-expanded": "false" }, classList: mkClassList(["pdxdb-group-h", "pdxdb-group-h--collapsed"]),
      hasAttribute(n) { return n in this.attrs; }, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n]; } };
    const body = { hidden: true };
    const d = {
      open: false, hidden: false, attrs: { "data-pdxdb-group": key },
      getAttribute(n) { return this.attrs[n]; }, hasAttribute(n) { return n in this.attrs; },
      querySelector: (sel) => sel === ".pdxdb-group-h" ? sum : sel === "[data-pdxdb-group-body]" ? body : null,
      querySelectorAll: () => [],
    };
    return { d, sum, body };
  };
  const groups = ["housing", "public_schools", "water"].map(mkGroup);
  const listeners = {};
  const host = {
    innerHTML: "", getAttribute: () => null, setAttribute() {}, appendChild() {},
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    querySelector: () => null,
    querySelectorAll: (sel) => sel === "[data-pdxdb-group]" ? groups.map((x) => x.d) : [],
  };
  C.mount(host);
  C.setCategory("water");
  const st = (x) => ({ open: x.d.open, aria: x.sum.attrs["aria-expanded"], cls: x.sum.classList.contains("pdxdb-group-h--collapsed"), body: x.body.hidden });
  eq(JSON.stringify(st(groups[2])), JSON.stringify({ open: true, aria: "true", cls: false, body: false }), "in place: the water chip expands water in all four places");
  eq(JSON.stringify(st(groups[0])), JSON.stringify({ open: false, aria: "false", cls: true, body: true }), "in place: housing stays collapsed in all four places");
  C.setCategory("");
  ok(groups.slice(0, 2).every((x) => !x.d.open && x.sum.attrs["aria-expanded"] === "false" && x.body.hidden), "in place: All collapses every group but the stance one");
  eq(JSON.stringify(st(groups[2])), JSON.stringify({ open: true, aria: "true", cls: false, body: false }), "in place: …which stays open on the visitor's side");
  // A hand toggle: the <details> opens, the header and body follow.
  groups[0].d.open = true;
  for (const f of listeners.toggle || []) f({ target: groups[0].d });
  eq(JSON.stringify(st(groups[0])), JSON.stringify({ open: true, aria: "true", cls: false, body: false }), "a hand toggle keeps header, aria and body in step");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · a generated board still opens the visitor's stance group");
{
  const h = G.tableHtml("ok", ITEMS, []);
  const gs = parseGroups(h);
  eq(JSON.stringify(gs.filter((g) => g.open).map((g) => g.key)), '["water"]', "the water side opens the water group, and only it");
  ok(!/pdxdb-group-h--collapsed|aria-expanded|data-pdxdb-group-body/.test(h), "a generated board prints the markup it always had");
  ok(checkCollapsed(h).length > 0, "…which the composer checker would not accept");
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · mutation: a renderer that leaves groups open on load fails");
{
  // A. The stance exception removed: the visitor's group stays shut.
  const GATE = "else if (composerBoard()) open = !!(key && stance[key]);";
  must(MOD.includes(GATE), "the composer collapse gate is not where the mutation expects it");
  const M1 = boot({ composer: true, desk: DESK, src: MOD.replace(GATE, "else if (composerBoard()) open = false;") });
  const p1 = checkCollapsed(M1.tableHtml("ok", ITEMS, []), ["water"]);
  ok(p1.some((x) => /^water: the stance group is not open/.test(x)), `a renderer that shuts the stance group on load fails (${p1.join("; ")})`);
  // A2. The gate removed outright: composer boards fall through to the flat
  // boards' rule, which opens the same stance group — still exactly one open.
  const M1b = boot({ composer: true, desk: DESK, src: MOD.replace(GATE, "") });
  eq(JSON.stringify(checkCollapsed(M1b.tableHtml("ok", ITEMS, []), ["water"])), "[]", "without the gate the stance rule still holds (the same rule)");
  // B. Every group forced open on load.
  const M2 = boot({ composer: true, desk: DESK, src: MOD.replace("var st = groupState(key, hits, stance);\n    var head", "var st = groupState(key, hits, stance); st.open = true;\n    var head") });
  const p2 = checkCollapsed(M2.tableHtml("ok", ITEMS, []), ["water"]);
  eq(p2.filter((x) => /is open/.test(x)).length, 3, "a renderer that opens every group fails for every group but the stance one");
  // C. Markup mutations the checker must refuse.
  ok(checkCollapsed(first.replace(/ data-pdxdb-group-body="" hidden>/, ' data-pdxdb-group-body="">'), ["water"]).some((x) => /body is visible/.test(x)),
    "a visible body fails");
  ok(checkCollapsed(first.replace('pdxdb-group-h--collapsed" aria-expanded="false"', 'pdxdb-group-h--collapsed" aria-expanded="true"'), ["water"]).some((x) => /aria-expanded/.test(x)),
    "an expanded header fails");
  ok(checkCollapsed(first.replace(" pdxdb-group-h--collapsed", ""), ["water"]).some((x) => /collapsed class/.test(x)),
    "a header without the collapsed class fails");
  ok(checkCollapsed(first.replace(/(data-pdxdb-group="housing")>/, "$1 open>"), ["water"]).some((x) => /housing: the <details> is open/.test(x)),
    "an open <details> fails");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · the shell moved");
ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 337, "the shell moved at least to v337");
ok(/v337 - [\s\S]*?MIGRATION COST: none/.test(SW), "v337's log says no migration");
ok(/\.pdxdb-group-b\[hidden\] \{ display: none; \}/.test(R("district-board.css")), "the stylesheet hides a hidden body");

report();
