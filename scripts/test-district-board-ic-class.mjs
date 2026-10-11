#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for PARENT CATEGORY HEADERS WEAR THE ISSUE COLOUR CLASS
// ─────────────────────────────────────────────────────────────────────────────
// On the five composer boards the parent header ELEMENT carries the core's
// colour class, pdxdb-ic-<core>, and so does every issue chip nested under it.
// What must hold:
//
//   1. EVERY PARENT HEADER ELEMENT on a composer board has exactly one colour
//      class from the existing issue palette — its own core's — and every chip
//      nested in that parent wears the same class.
//   2. THE CLASS COLOURS BY ITSELF: district-board.css defines one rule per
//      PDXIssueColors core, pointing the --pdx-ic tokens at the --pdx-issue-<core>
//      variables issue-colors.js injects; the header rule keys off the class.
//   3. NESTED CHIPS KEEP THEIR COLOURS: the same data-ic="on" and the same
//      inline token PDXIssueColors gives the issue.
//   4. MUTATION: a renderer that leaves the header unclassed fails, and so
//      does one that classes only the chips.
//   5. GENERATED BOARDS are untouched; the SW moved.
//
//   node scripts/test-district-board-ic-class.mjs
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
const CSS = R("district-board.css");
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
  console.log(`\n   ✓ district board ic class: all ${passed} assertions passed`);
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
  m(6, "H.B. 77", "Border Enforcement Funding", ["border_security"]),
];

// ── THE CHECKER ─────────────────────────────────────────────────────────────
function parents(html) {
  return [...html.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"[^>]*>\s*<summary([^>]*)>[\s\S]*?<div class="pdxdb-parent-b"[^>]*>([\s\S]*?)<\/div><\/div>\s*<\/details>/g)]
    .map((x) => ({
      key: x[1],
      headClasses: (((/class="([^"]*)"/.exec(x[2])) || [])[1] || "").split(/\s+/),
      chips: [...x[3].matchAll(/<button type="button" class="(pdxdb-cat[^"]*)" data-pdxdb-cat="([^"]*)"([^>]*)>/g)]
        .map((c) => ({ classes: c[1].split(/\s+/), key: c[2], ic: /data-ic="on"/.test(c[3]), style: ((/style="([^"]*)"/.exec(c[3])) || [])[1] || "" })),
    }));
}
function checkHeaderClass(html, palette) {
  const problems = [];
  const ps = parents(html);
  if (!ps.length) problems.push("no parent headers");
  for (const p of ps) {
    const ic = p.headClasses.filter((c) => c.startsWith("pdxdb-ic-"));
    if (ic.length !== 1) { problems.push(`${p.key}: the header element is unclassed`); continue; }
    const core = ic[0].slice("pdxdb-ic-".length);
    if (!(core in palette)) problems.push(`${p.key}: ${ic[0]} is not in the issue palette`);
    if (core !== p.key) problems.push(`${p.key}: wears ${ic[0]}, another core's class`);
    for (const c of p.chips) if (!c.classes.includes(ic[0])) problems.push(`${p.key}: chip ${c.key} does not wear ${ic[0]}`);
  }
  return problems;
}

const { B: C, win: CW } = boot({ composer: true });
const { B: G } = boot({ composer: false });
must(C && G && typeof C.tableHtml === "function", "PDXDistrictBoard did not publish");
const IC = CW.PDXIssueColors;
must(IC && IC.CORE_ISSUE_COLORS, "PDXIssueColors did not publish its palette");
const PALETTE = IC.CORE_ISSUE_COLORS;
const PKEYS = Object.keys(PALETTE);
must(PKEYS.length >= 13, `the palette holds ${PKEYS.length} cores`);
const HTML = C.tableHtml("ok", ITEMS, []);

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · every parent header element wears its core's palette class");
{
  const ps = parents(HTML);
  eq(ps.length, 5, "five parents: Economy, Education, Climate, Foreign Policy, Immigration");
  eq(JSON.stringify(checkHeaderClass(HTML, PALETTE)), "[]", "one palette class per header, its own core's, and the same class on every nested chip");
  for (const p of ps) ok(p.headClasses.includes("pdxdb-parent-h"), `${p.key}: the class is on the header element itself`);
  ok(parents(HTML).find((p) => p.key === "economy_cost_of_living").chips.length === 2, "Economy's two chips were both checked");
  // Coloured by class alone: strip every inline token and the class is still there.
  const bare = HTML.replace(/ data-ic="on" style="[^"]*"/g, "");
  eq(JSON.stringify(checkHeaderClass(bare, PALETTE)), "[]", "with every inline token stripped, the headers still carry their class");
  // Collapse and filters are unchanged by the class.
  ok(parents(HTML).every((p) => p.headClasses.includes("pdxdb-parent-h--collapsed")), "every header is still collapsed");
  C.setCategory("housing");
  const hc = C.tableHtml("ok", ITEMS, []);
  eq(JSON.stringify(checkHeaderClass(hc, PALETTE)), "[]", "under an issue chip the classes hold");
  ok(/<details class="pdxdb-parent" data-pdxdb-parent="economy_cost_of_living" open>/.test(hc), "…and the chip still opens its parent");
  C.setCategory("");
}

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · the class colours by itself, off the palette's own variables");
{
  const vars = IC.cssText();
  for (const k of PKEYS) {
    const rule = new RegExp(`\\.pdxdb-ic-${k} \\{ --pdx-ic: var\\(--pdx-issue-${k}\\); --pdx-ic-soft: var\\(--pdx-issue-${k}-soft\\); --pdx-ic-wash: var\\(--pdx-issue-${k}-wash\\); --pdx-ic-ink: var\\(--pdx-issue-${k}-ink\\); \\}`);
    ok(rule.test(CSS), `district-board.css defines .pdxdb-ic-${k} off --pdx-issue-${k}`);
    ok(vars.includes(`--pdx-issue-${k}:`) && vars.includes(`--pdx-issue-${k}-ink:`), `issue-colors.js injects --pdx-issue-${k}`);
  }
  const defined = [...CSS.matchAll(/^\.pdxdb-ic-([a-z_]+) \{/gm)].map((x) => x[1]);
  eq(JSON.stringify(defined), JSON.stringify(PKEYS), "the stylesheet's classes are exactly the palette, in its order");
  ok(/\.pdxdb-parent-h\[class\*="pdxdb-ic-"\] \{[^}]*color: var\(--pdx-ic-ink\)/.test(CSS), "the header rule keys off the class, not the inline token");
  ok(!/\.pdxdb-ic-[a-z_]+ \{[^}]*#[0-9a-fA-F]{3,6}/.test(CSS), "no hex in the class rules");
  ok(/^\s*injectVars\(\);/m.test(R("issue-colors.js")), "issue-colors.js injects its variables on load");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · nested chips keep their current colours");
{
  for (const p of parents(HTML)) {
    for (const c of p.chips) {
      ok(c.ic, `${c.key}: still data-ic="on"`);
      eq(c.style, IC.styleFor(c.key, CW.coreIssueForKey), `${c.key}: the same inline token PDXIssueColors gives it`);
    }
  }
  // The chip's class resolves to the very values its inline token sets.
  const t = IC.getIssueColor("housing", CW.coreIssueForKey);
  ok(IC.cssText().includes(`--pdx-issue-economy_cost_of_living: ${t.color};`), "housing's class resolves to the colour its inline token sets");
  // The top chip row (All + Mandates) carries no colour class.
  const top = ((/<div class="pdxdb-cats" role="group"[^>]*>([\s\S]*?)<\/div>/.exec(HTML)) || [])[1] || "";
  ok(!/pdxdb-ic-/.test(top), "the top chip row is unchanged");
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · mutation: an unclassed header fails");
{
  const NAME = "var icName = (skin && paletteHas(par.key)) ? IC_PREFIX + par.key : '';";
  must(MOD.includes(NAME), "the colour class line is not where the mutation expects it");
  const { B: M1 } = boot({ composer: true, src: MOD.replace(NAME, "var icName = '';") });
  const p1 = checkHeaderClass(M1.tableHtml("ok", ITEMS, []), PALETTE);
  ok(p1.some((x) => /header element is unclassed/.test(x)), `a renderer that never classes the header fails (${p1.slice(0, 1).join("")})`);

  const HEAD = "'<summary class=\"pdxdb-parent-h' + esc(icClass) +";
  must(MOD.includes(HEAD), "the header's class concatenation is not where the mutation expects it");
  const { B: M2 } = boot({ composer: true, src: MOD.replace(HEAD, "'<summary class=\"pdxdb-parent-h' +") });
  const h2 = M2.tableHtml("ok", ITEMS, []);
  ok(/class="pdxdb-cat pdxdb-ic-/.test(h2), "fixture: the mutated renderer still classes the chips");
  ok(checkHeaderClass(h2, PALETTE).some((x) => /header element is unclassed/.test(x)), "a renderer that classes only the chips fails");

  ok(checkHeaderClass(HTML.replace(/(<summary class="pdxdb-parent-h) pdxdb-ic-economy_cost_of_living/, "$1 pdxdb-ic-not_a_core"), PALETTE).some((x) => /not in the issue palette/.test(x)),
    "a class outside the palette fails");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · generated boards are untouched, and the shell moved");
{
  const h = G.tableHtml("ok", ITEMS, []);
  ok(!/pdxdb-ic-|pdxdb-parent/.test(h), "a generated board carries no parent and no colour class");
  ok(/<button type="button" class="pdxdb-cat" data-pdxdb-cat="housing"/.test(h), "its chips print exactly as before");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 341, "the shell moved at least to v341");
  ok(/v341 - [\s\S]*?MIGRATION COST: none/.test(SW), "v341's log says no migration");
  ok(/'\/district-board\.css'/.test(SW) && /'\/district-board\.js'/.test(SW), "both files are precached");
}

report();
