#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE BOARD HEADING NAMES ITS HOLDER (sw v382)
// ─────────────────────────────────────────────────────────────────────────────
// When the roster names the seat's sitting member, the board's heading reads
// "<seat> · <name>" with ONLY the name linking that person's file, and one
// "Current holder · <name>" chip sits under it pointing at the same file. When
// the roster cannot name the holder, the served heading is left exactly as it
// was and there is no chip. Nothing is guessed.
//
//   1. A DISTRICT SEAT (HD-16 · Trevor Lee) and A STATEWIDE SEAT (Governor ·
//      Spencer Cox), from the real cmp-data.js roster, mounted on the real
//      documents' served headings.
//   2. THE ROSTER CANNOT NAME THE HOLDER: no link, no chip, heading unchanged.
//   3. A PRIOR HOLDER: once the seat changes hands, nothing names them.
//   4. MUTATIONS: a wrong pid, a chip without a name, a heading linked with no
//      roster name — each fails.
//
//   node scripts/test-board-heading-holder.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const DB = R("district-board.js");
const CMP = R("cmp-data.js");
const CSS = R("district-board.css");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// The served heading, read out of the real document.
const servedH1 = (doc) => (/<h1 class="pdxdb-h1">([^<]*)<\/h1>/.exec(R(doc)) || [, ""])[1];

// A document with exactly what paintHeading() touches: the h1, the chip host
// it inserts after the h1, and the board host.
function boot({ doc, seat, roster = true, rosterName, src, mutate } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  const els = {};
  const h1 = {
    innerHTML: servedH1(doc),
    insertAdjacentHTML(where, html) {
      const m = /id="([^"]+)"/.exec(html);
      const node = { id: m && m[1], innerHTML: "", parentNode: { removeChild(n) { delete els[n.id]; } } };
      els[node.id] = node;
    },
  };
  const host = { innerHTML: "", getAttribute: (k) => (k === "data-pdxdb-seat" ? seat : null), setAttribute() {}, contains: () => false };
  els["pdx-district-board"] = host;
  win.document.getElementById = (id) => els[id] || null;
  win.document.querySelector = (q) => (q === ".pdxdb-h1" ? h1 : null);
  win.fetch = () => new Promise(() => {});
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => new Promise(() => {}) };
  if (roster) vm.runInContext(CMP, ctx, { filename: "cmp-data.js" });
  if (rosterName) win.pdxRosterName = rosterName;
  vm.runInContext(src || DB, ctx, { filename: "district-board.js" });
  const B = win.PDXDistrictBoard;
  if (mutate) mutate(B, win);
  B.mount(host);
  return { B, win, h1: () => h1.innerHTML, chip: () => (els["pdx-db-holder"] ? els["pdx-db-holder"].innerHTML : null), repaint: () => B.mount(host) };
}

const CASES = [
  { doc: "district-ut-hd-16.html", seat: "ut-hd-16", pid: "tlee", name: "Trevor Lee", seatText: "Utah House District 16" },
  { doc: "district-ut-gov.html", seat: "ut-gov", pid: "cox", name: "Spencer Cox", seatText: "Governor" },
];
function faults(r, c) {
  const f = [];
  const want = `${c.seatText} · <a class="pdxdb-h1-name" href="/p/${c.pid}">${c.name}</a>`;
  if (r.h1() !== want) f.push(`${c.seat}: heading is ${JSON.stringify(r.h1())}, not ${JSON.stringify(want)}`);
  const chip = `<a class="pdxdb-holder-a" href="/p/${c.pid}">Current holder · ${c.name}</a>`;
  if (r.chip() !== chip) f.push(`${c.seat}: chip is ${JSON.stringify(r.chip())}, not ${JSON.stringify(chip)}`);
  // Only the name is a link; the seat stays text.
  if ((r.h1().match(/<a\b/g) || []).length !== 1 || !r.h1().startsWith(c.seatText + " · <a")) f.push(`${c.seat}: more than the name is linked`);
  return f;
}
// No name: the served heading, untouched, and no chip.
function bareFaults(r, c) {
  const f = [];
  if (r.h1() !== servedH1(c.doc)) f.push(`${c.seat}: heading changed to ${JSON.stringify(r.h1())} with no roster name`);
  if (/<a\b/.test(r.h1())) f.push(`${c.seat}: the heading is linked with no roster name`);
  if (r.chip() !== null && r.chip() !== "") f.push(`${c.seat}: a chip appeared with no roster name — ${r.chip()}`);
  return f;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the real roster names the holder: heading name and chip link the person file");
for (const c of CASES) {
  const r = boot(c);
  eq(r.B.active().seat === c.seat || r.B.active().alias === c.seat, true, `${c.seat}: the board did not mount`);
  const f = faults(r, c);
  eq(f.length, 0, `${c.seat}: ${JSON.stringify(f)}`);
  // A repaint is idempotent: still one chip, same heading.
  r.repaint();
  eq(faults(r, c).length, 0, `${c.seat}: a repaint changed the heading or chip`);
  // Through the resolver's pdxRosterName too, which wins where it is present.
  const r2 = boot(Object.assign({}, c, { rosterName: (pid, held) => (held && held.name) || "" }));
  eq(faults(r2, c).length, 0, `${c.seat}: pdxRosterName on the document changes the answer`);
}
eq(servedH1("district-ut-hd-16.html"), "Utah House District 16", "the HD-16 document's served heading moved");
eq(servedH1("district-ut-gov.html"), "Governor · Spencer Cox", "the governor document's served heading moved");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the roster cannot name the holder: heading unlinked, no chip");
for (const c of CASES) {
  eq(bareFaults(boot(Object.assign({}, c, { roster: false })), c).length, 0, `${c.seat}: no roster loaded`);
  eq(bareFaults(boot(Object.assign({}, c, { rosterName: () => "" })), c).length, 0, `${c.seat}: the resolver cannot name the pid`);
}
// The roster arrives late: the second paint names the holder.
{
  const c = CASES[0];
  const r = boot(Object.assign({}, c, { roster: false }));
  eq(bareFaults(r, c).length, 0, "late roster: the first paint guessed");
  vm.runInContext(CMP, vm.createContext(r.win), { filename: "cmp-data.js" });
  r.repaint();
  eq(faults(r, c).length, 0, "late roster: the paint after the roster arrived did not name the holder");
}
// A congressional board with no holder join on the document: no name to print.
{
  const r = boot({ doc: "district-ut-cd-2.html", seat: "ut-cd-2" });
  ok(!/<a\b/.test(r.h1()) && !r.chip(), "UT-2 with no congressional join linked or chipped a holder");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a prior holder is never named once the seat changes hands");
{
  const c = CASES[0];
  const r = boot(Object.assign({}, c, { mutate: (B) => { B.BOARDS["ut-statehouse-16"].pid = "sadams"; } }));
  ok(r.h1().indexOf("tlee") < 0 && r.h1().indexOf("Trevor Lee") < 0, "prior holder: the heading still names Trevor Lee");
  ok(String(r.chip()).indexOf("tlee") < 0 && String(r.chip()).indexOf("Trevor Lee") < 0, "prior holder: the chip still names Trevor Lee");
  eq(faults(r, Object.assign({}, c, { pid: "sadams", name: "Stuart Adams" })).length, 0, "prior holder: the current holder is not the one named");
  // A new holder the roster has no row for: nothing named at all.
  const r2 = boot(Object.assign({}, c, { mutate: (B) => { B.BOARDS["ut-statehouse-16"].pid = "new_rep_h16"; } }));
  eq(bareFaults(r2, c).length, 0, "prior holder: a new holder the roster cannot name produced a link or chip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · mutations fail");
const mut = (from, to) => { const m = DB.replace(from, to); ok(m !== DB, `mutation found nothing to replace: ${from}`); return m; };
{
  const m = mut("function personHref(pid) { return '/p/' + encodeURIComponent(String(pid)); }",
    "function personHref(pid) { return '/p/' + encodeURIComponent(String(pid) + '_x'); }");
  ok(faults(boot(Object.assign({}, CASES[0], { src: m })), CASES[0]).length > 0, "a link at the wrong pid passed");
}
{
  const m = mut("    if (!pid || !name) return '';\n    return '<a class=\"pdxdb-holder-a\"",
    "    if (!pid) return '';\n    return '<a class=\"pdxdb-holder-a\"");
  const m2 = m.replace("var chip = head ? holderChipHtml(ACTIVE) : '';", "var chip = holderChipHtml(ACTIVE);");
  ok(bareFaults(boot(Object.assign({}, CASES[0], { src: m2, rosterName: () => "" })), CASES[0]).length > 0,
    "a chip with no name passed");
}
{
  const m = mut("    if (!pid || !name || !seat) return '';", "    if (!pid || !seat) return '';");
  ok(bareFaults(boot(Object.assign({}, CASES[0], { src: m, rosterName: () => "" })), CASES[0]).length > 0,
    "a heading linked with no roster name passed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · style and shell");
ok(CSS.includes(".pdxdb-h1-name") && CSS.includes(".pdxdb-holder-a"), "district-board.css does not style the name link and chip");
const VER = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [, "0"])[1]);
ok(VER >= 382 && SW.includes("// v382 - THE BOARD HEADING NAMES ITS HOLDER"), "the service worker did not move to v382 with a note");

console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`   ✗ ${f}`); process.exit(1); }
console.log("   ✓ the board heading names its holder\n");
