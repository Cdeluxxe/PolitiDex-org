#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for MANDATES STAND OUT, AND SEARCH FINDS THEM
// ─────────────────────────────────────────────────────────────────────────────
// On every composer board (a hand-built one, SD-3; a generated one, HD-29; a
// statewide one, ut-gov):
//
//   1. A MANDATE ROW, in the table and in the pinned strip, carries the ⚑
//      marker before its tag and the mandate colour class (pdxdb-mandate-c).
//   2. NO ISSUE ROW, pinned issue or parent header carries either.
//   3. SEARCH matches a mandate's tag ("Mandate", its category) and any part of
//      its title, and a measure's title, bill number and issue label.
//   4. THE CATEGORY COUNT is the number of issue categories with at least one
//      measure on the seat — every row the read returns is printed (no forty-row
//      cap), and the unfiled rows are not a category.
//   5. The colour token is defined once in district-board.css; parent headers
//      keep their issue colours; no equity language; the SW moved.
//
//   node scripts/test-district-board-mandate-marker.mjs
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

function boot(seat, src) {
  const win = makeSandbox();
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  vm.runInContext(src || MOD, ctx, { filename: "district-board.js" });
  return win.PDXDistrictBoard;
}
const m = (id, number, title, keys) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: keys.map((k) => ({ issueKey: k, weight: 1, isPrimary: false, supportMeaning: "", rationale: null })),
});
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", ["housing"]),
  m(2, "S.B. 57", "Public Education Funding", ["public_schools"]),
  m(3, "H.B. 208", "Great Salt Lake Watershed", ["water"]),
  m(4, "H.B. 9", "Technical Corrections", []),
];
const ROOMS = [{ issueKey: "housing", polls: 4, comments: 1 }, { issueKey: "water", polls: 2, comments: 0 }];
const MANDATES = [
  { id: 7, title: "Publish every committee vote within 24 hours", category: "Government Transparency", supportCount: 3 },
  { id: 8, title: "Open the redistricting map files", category: "", supportCount: 1 },
];
const FLAG = "⚑";
const MC = "pdxdb-mandate-c";

const tableLis = (h) => [...h.matchAll(/<li class="pdxdb-mandate[^"]*"[^>]*data-pdxdb-mandate="(\d+)"[^>]*>([\s\S]*?)<\/li>/g)]
  .map((x) => ({ id: Number(x[1]), open: x[0].slice(0, x[0].indexOf(">") + 1), body: x[2] }));
const pinLis = (h) => [...h.matchAll(/<li class="pdxdb-pin pdxdb-pin--(mandate|issue)[^"]*"[^>]*>([\s\S]*?)<\/li>/g)]
  .map((x) => ({ kind: x[1], open: x[0].slice(0, x[0].indexOf(">") + 1), body: x[2] }));

for (const seat of ["ut-sd-3", "ut-hd-29", "ut-gov"]) {
  const B = boot(seat);
  B.setQuery(""); B.setCategory("");
  const h = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);

  // ═══════════════════════════════════════════════════════════════════════════
  section(`1 · ${seat}: every mandate row carries the flag and the mandate colour`);
  // ═══════════════════════════════════════════════════════════════════════════
  const rows = tableLis(h);
  eq(rows.map((r) => r.id).join(","), "7,8", `${seat}: both mandate rows are in the table`);
  for (const r of rows) {
    ok(r.open.includes(`class="pdxdb-mandate ${MC}"`), `${seat}: table mandate ${r.id} wears ${MC}`);
    const f = r.body.indexOf(FLAG), t = r.body.indexOf('class="pdxdb-mandate-tag pdxdb-mandate-pill"');
    ok(f >= 0 && f < t, `${seat}: table mandate ${r.id} has ${FLAG} before its tag`);
    ok(!/data-ic="on"|--pdx-ic|pdxdb-ic-/.test(r.open + r.body), `${seat}: table mandate ${r.id} wears no issue colour`);
  }
  ok(/<span class="pdxdb-mandate-cat">Government Transparency<\/span>/.test(h), `${seat}: a mandate's category prints in its tag`);
  const pins = pinLis(h);
  const pm = pins.filter((p) => p.kind === "mandate");
  eq(pm.length, 2, `${seat}: two mandates pinned`);
  for (const p of pm) {
    ok(p.open.includes(MC), `${seat}: a pinned mandate wears ${MC}`);
    const f = p.body.indexOf(FLAG), t = p.body.indexOf('class="pdxdb-mandate-tag pdxdb-mandate-pill"');
    ok(f >= 0 && f < t, `${seat}: a pinned mandate has ${FLAG} before its tag`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section(`2 · ${seat}: no issue row gets the flag or the mandate colour`);
  // ═══════════════════════════════════════════════════════════════════════════
  const pi = pins.filter((p) => p.kind === "issue");
  ok(pi.length >= 1, `${seat}: an issue is pinned`);
  for (const p of pi) ok(!p.body.includes(FLAG) && !p.open.includes(MC), `${seat}: a pinned issue has no ${FLAG} and no ${MC}`);
  const issueRows = [...h.matchAll(/<tr class="pdxdb-row"[\s\S]*?<\/tr>/g)].map((x) => x[0]);
  ok(issueRows.length >= ITEMS.length, `${seat}: the measure rows paint`);
  ok(issueRows.every((r) => !r.includes(FLAG) && !r.includes(MC)), `${seat}: no measure row carries ${FLAG} or ${MC}`);
  const heads = [...h.matchAll(/<summary class="(pdxdb-parent-h[^"]*)"[^>]*>([\s\S]*?)<\/summary>/g)];
  ok(heads.length >= 2, `${seat}: parent headers paint`);
  ok(heads.every((x) => /pdxdb-ic-/.test(x[1]) && !x[1].includes(MC) && !x[2].includes(FLAG)),
    `${seat}: parent headers keep their issue colour class and carry no mandate marker`);
  eq(h.split(FLAG).length - 1, 4, `${seat}: the flag appears exactly once per mandate row (two table rows, two pins)`);

  // ═══════════════════════════════════════════════════════════════════════════
  section(`3 · ${seat}: search finds a mandate by tag, category or title fragment`);
  // ═══════════════════════════════════════════════════════════════════════════
  const shown = (q) => {
    B.setQuery(q);
    const hh = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
    const list = /<ul class="pdxdb-mandates"[^>]*>/.exec(hh)[0];
    const vis = tableLis(hh).filter((r) => !/\shidden\b/.test(r.open)).map((r) => r.id).join(",");
    const measures = [...hh.matchAll(/<tr class="pdxdb-row"([^>]*)>[\s\S]*?<a class="pdxdb-m-link"[^>]*>([^<]*)</g)]
      .filter((x) => !/\shidden\b/.test(x[1])).map((x) => x[2]);
    return { list: !/\shidden\b/.test(list) ? vis : "", none: !/data-pdxdb-find-none hidden/.test(hh), measures };
  };
  eq(shown("committee vote").list, "7", `${seat}: a title fragment surfaces that mandate`);
  eq(shown("REDISTRICTING").list, "8", `${seat}: a title fragment is matched without regard to case`);
  eq(shown("transparency").list, "7", `${seat}: the mandate's category tag surfaces it`);
  eq(shown("mandate").list, "7,8", `${seat}: the "Mandate" tag surfaces every mandate`);
  eq(shown("committee vote").none, false, `${seat}: …and the no-match line stays hidden`);
  eq(shown("hb 101").measures.join("|"), "Starter Home Amendments", `${seat}: a bill number still finds its measure`);
  ok(shown("housing").measures.includes("Starter Home Amendments"), `${seat}: an issue label finds its measure`);
  eq(shown("housing").list, "", `${seat}: …and does not surface an unrelated mandate`);
  eq(shown("zzzz nothing").none, true, `${seat}: a search that matches nothing says so`);
  B.setQuery("");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the category count is the categories with measures, and no row cap");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot("ut-hd-29");
  B.setQuery(""); B.setCategory("");
  const KEYS = ["housing", "water", "public_schools", "prop_tax", "israel_support"];
  const many = [];
  for (let i = 0; i < 60; i++) many.push(m(100 + i, `H.B. ${100 + i}`, `Measure number ${100 + i}`, [KEYS[i % KEYS.length]]));
  many.push(m(999, "H.B. 999", "Technical Corrections", []));
  const h = B.tableHtml("ok", many, [], []);
  eq((h.match(/<tr class="pdxdb-row"/g) || []).length, 61, "all 61 printable rows print — forty is not a limit");
  ok(!/TABLE_CAP/.test(MOD), "district-board.js holds no table cap");
  const cnt = /<p class="pdxdb-cat-count" data-pdxdb-cat-count="(\d+)">([^<]*)<\/p>/.exec(h);
  ok(!!cnt, "the band prints the category count");
  eq(cnt && Number(cnt[1]), KEYS.length, "the count is the number of issue categories with a measure (unfiled rows are not one)");
  eq(cnt && cnt[2], `${KEYS.length} issue categories have a measure on this seat`, "…in words that name what it counts");
  const one = B.tableHtml("ok", [m(1, "H.B. 1", "One", ["water"])], [], []);
  ok(/data-pdxdb-cat-count="1">1 issue category has a measure on this seat</.test(one), "one category reads in the singular");
  ok(!/data-pdxdb-cat-count/.test(B.tableHtml("ok", [m(1, "H.B. 1", "One", [])], [], [])), "no category, no count");
  // The count follows the groups the table prints and invents none: a seat
  // with forty-one categories says forty-one.
  const wide = [];
  const B2 = boot("ut-hd-29");
  const win2 = makeSandbox();
  const ctx2 = vm.createContext(win2);
  vm.runInContext(R("issue-map.js"), ctx2, { filename: "issue-map.js" });
  const vocab = Object.keys(win2.ISSUE_MAP || win2.PDX_ISSUE_MAP || {}).filter((k) => /^[a-z0-9_]+$/.test(k));
  ok(vocab.length >= 41, `the vocabulary has at least 41 keys to file measures under (${vocab.length})`);
  if (vocab.length >= 41) {
    for (let i = 0; i < 41; i++) wide.push(m(500 + i, `S.B. ${500 + i}`, `Wide ${i}`, [vocab[i]]));
    const hw = B2.tableHtml("ok", wide, [], []);
    const c = /data-pdxdb-cat-count="(\d+)"/.exec(hw);
    const groups = (hw.match(/<details class="pdxdb-group" data-pdxdb-group="[^"]+"/g) || []).length;
    eq(c && Number(c[1]), groups, "with 41 categories the count equals the groups printed, uncapped");
    ok(groups > 40, `…and that is more than forty (${groups})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the token, the copy, the shell");
// ═════════════════════════════════════════════════════════════════════════════
ok(/\.pdxdb-mandate-c \{[\s\S]*?--pdxdb-mandate: #f1d98a;[\s\S]*?\}/.test(CSS), "district-board.css names the mandate colour token on .pdxdb-mandate-c");
eq((CSS.match(/--pdxdb-mandate:/g) || []).length, 1, "…declared once");
ok(/\.pdxdb-mandate-tag \{[\s\S]*?var\(--pdxdb-mandate/.test(CSS), "the tag wears the token");
ok(!/pdxdb-mandate-c\b/.test(CSS.replace(/\.pdxdb-mandate-c\b[^{]*\{[^}]*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\.pdxdb-pin--mandate\.pdxdb-mandate-c[^{]*\{[^}]*\}/g, "")),
   "no other rule borrows the mandate class");
{
  const BANNED = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bequity\b|\binvest(?:or|ors|ment)\b|\bdividends?\b/i;
  const copy = [...MOD.matchAll(/^\s{4}(?:mandate\w*|catCount\w*|findLabelComposer|findPlaceholderComposer|catMandates|pinnedHead): '([^']*)'/gm)].map((x) => x[1]).join(" ");
  ok(copy.length > 20, "the mandate and count copy was read");
  ok(!BANNED.test(copy), `no equity language in the mandate or count copy — ${copy}`);
}
{
  const VER = (/const CACHE_VERSION = '(v\d+)';/.exec(SW) || [, ""])[1];
  ok(Number(VER.slice(1)) >= 344, `the shell moved to v344 or later (${VER})`);
  const at = SW.indexOf(`// ${VER} - `);
  const LOG = at > 0 ? SW.slice(at, SW.indexOf("const CACHE_VERSION", at)) : "";
  ok(/MIGRATION COST: none/.test(LOG), `the ${VER} entry states no migration`);
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ district board mandate marker: all ${passed} assertions passed`);
