#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for ON THE TABLE: THE MANDATES THAT NAME THE SEAT
// ─────────────────────────────────────────────────────────────────────────────
// On every composer board (every Utah board, statewide included) band 3 also
// lists the People's Mandate proposals that already name the seat — its key in
// linked_race_ids, or its sitting member in linked_politician_ids. What must
// hold:
//
//   1. A BOARD WITH A MANDATE THAT NAMES THE SEAT shows the mandate row (title,
//      short status, a link to its card on /mandate) and a "Mandates" chip.
//   2. A BOARD WITH NO SUCH MANDATE shows neither.
//   3. THE ISSUE ROWS AND POLLS ARE UNCHANGED: the issue groups render the
//      same with or without mandates, and the mandate block is not a
//      data-pdxdb-group, so district-poll.js gives it no poll.
//   4. THE "Mandates" CHIP FILTERS to the mandate rows.
//   5. EVERY BOARD READS WITH ITS OWN SEAT: a generated board and a statewide
//      board ask with their own seat and sitting member, and print the rows
//      that name them; a document with no seat never asks.
//   6. THE READ IS A READ: /api/mandate-proposals' seat filter matches both
//      spellings of the seat, and adds no write.
//   7. NO EQUITY OR STOCK LANGUAGE in the new copy or the rendered rows.
//   8. The SW moved, and mandate-lane.js honours a #pp-card-<id> link.
//
//   node scripts/test-district-board-mandates.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const MOD = R("district-board.js");
const SW = R("sw.js");
const FN = R("netlify/functions/mandate-proposals.mts");
const LANE = R("mandate-lane.js");
const CSS = R("district-board.css");

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
  console.log(`\n   ✓ district board mandates: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];

// `mandates` is what /api/mandate-proposals answers; `composer` puts the
// composer host on the document. Every fetch URL is recorded.
function boot({ items, seat, mandates, composer } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  const calls = [];
  win.fetch = (url) => {
    calls.push(String(url));
    if (String(url).indexOf("/api/mandate-proposals") === 0) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ proposals: mandates || [], stats: {} }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [] }) });
  };
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: items || [], summary: {} }) };
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  if (composer) {
    const host = { id: "pdx-district-composer", getAttribute: () => null };
    win.document.getElementById = (id) => (id === "pdx-district-composer" ? host : null);
  }
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return { win, calls };
}
function hostEl(seat) {
  return { innerHTML: "", getAttribute: (n) => (n === "data-pdxdb-seat" ? seat || null : null), setAttribute() {}, appendChild() {} };
}
function flush(n = 12) {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) p = p.then(() => new Promise((r) => setTimeout(r, 0)));
  return p;
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
  m(3, "H.B. 9", "Technical Corrections", []),
];
const MANDATE = {
  id: 7, title: "Publish every committee vote within 24 hours", description: "x".repeat(20),
  category: null, submitterName: "Anonymous", supportCount: 3, createdAt: "2026-10-01T00:00:00.000Z",
  youSupported: false, linkedPoliticianIds: [], linkedRaceIds: ["ut-sd-3"],
};

const groupBlocks = (html) => (html.match(/<details class="pdxdb-group[^"]*" data-pdxdb-group="[^"]*"[\s\S]*?<\/details>/g) || []);
const mandateBlock = (html) => ((/<ul class="pdxdb-mandates"[^>]*data-pdxdb-mandates[^>]*>[\s\S]*?<\/ul>/.exec(html)) || [""])[0];
const chips = (html) => [...html.matchAll(/<button type="button" class="pdxdb-cat" data-pdxdb-cat="([^"]*)"/g)].map((x) => x[1]);

const { win: W } = boot({ items: ITEMS });
const B = W.PDXDistrictBoard;
must(B && typeof B.tableHtml === "function" && B.MANDATE_KEY, "PDXDistrictBoard did not publish the mandate pieces");
const MK = B.MANDATE_KEY;

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · a mandate that names the seat prints a row and a Mandates chip");
B.setCategory("");
const withM = B.tableHtml("ok", ITEMS, [], [MANDATE]);
const blk = mandateBlock(withM);
ok(!!blk, "the band carries a mandates block");
has(blk, MANDATE.title, "the row prints the mandate's title");
has(blk, 'href="/mandate#pp-card-7"', "the row links to the mandate's card on /mandate");
has(blk, "Open proposal · 3 shows of support", "the row prints a short status");
eq(blk.split('class="pdxdb-mandate"').length - 1, 1, "one row per mandate");
ok(chips(withM).includes(MK), "a Mandates chip is printed");
has(withM, ">Mandates<span class=\"pdxdb-cat-n\">1</span>", "the chip reads Mandates with its count");
ok(chips(withM).indexOf(MK) === chips(withM).length - 1, "the Mandates chip sits after the issue chips");
ok(withM.indexOf("data-pdxdb-mandates") > withM.indexOf("pdxdb-cats"), "the mandate rows sit under the category chips");
// A mandate with no measure on the seat still prints, under the empty line.
const onlyM = B.tableHtml("ok", [], [], [MANDATE]);
has(onlyM, B.COPY.tableEmpty, "no measures: the empty line still prints");
has(mandateBlock(onlyM), MANDATE.title, "no measures: the mandate row still prints");
// Rows the board cannot link are not printed.
eq(B._mandateRows([{ id: "7", title: "x" }, { id: 8, title: "" }, null, { id: 9, title: "ok" }, { id: 9, title: "dup" }]).length, 1,
  "only rows with an integer id and a title, once each");

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · no mandate that names the seat: no row and no chip");
const without = B.tableHtml("ok", ITEMS, [], []);
const legacy = B.tableHtml("ok", ITEMS, []);
no(without, "data-pdxdb-mandates", "no mandates block");
ok(!chips(without).includes(MK), "no Mandates chip");
no(without, ">Mandates<", "the word Mandates is not printed as a chip");
eq(without, legacy, "an empty mandate list paints exactly what the three-argument call paints");
eq(B.tableHtml("ok", [], [], []), B.tableHtml("ok", [], []), "an empty seat with no mandates is unchanged");

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · issue rows and polls are unchanged");
eq(groupBlocks(withM).join(""), groupBlocks(without).join(""), "the issue groups render identically with and without mandates");
eq(groupBlocks(withM).length, 3, "housing, schools and the unfiled rows all render");
no(blk, "data-pdxdb-group", "the mandate block is not an issue group, so district-poll.js decorates it with no poll");
ok(/querySelectorAll\('details\[data-pdxdb-group\]'\)/.test(R("district-poll.js")), "district-poll.js still decorates issue groups only");
no(blk, "data-pdxdb-polls", "mandate rows carry no poll column");
ok(!B.issues().includes(MK), "the composer's issue list never includes the mandate key");

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · the Mandates chip filters to the mandate rows");
B.setCategory(MK);
const filtered = B.tableHtml("ok", ITEMS, [], [MANDATE]);
ok(!!mandateBlock(filtered) && !/^<ul[^>]*\shidden\b/.test(mandateBlock(filtered)), "the mandate block is shown");
ok(groupBlocks(filtered).every((g) => /^<details[^>]*\shidden\b/.test(g)), "every issue group is hidden");
eq(B.view().cat, MK, "the view holds the Mandates chip");
// The chip falls back to All when no mandate is left to show.
B.tableHtml("ok", ITEMS, [], []);
eq(B.view().cat, "", "a Mandates chip with no mandates falls back to All");
B.setCategory("housing");
const housing = B.tableHtml("ok", ITEMS, [], [MANDATE]);
ok(/^<ul[^>]*\shidden\b/.test(mandateBlock(housing)), "an issue chip hides the mandate block");
B.setCategory("");
B.setQuery("committee vote");
const searched = B.tableHtml("ok", ITEMS, [], [MANDATE]);
ok(!!mandateBlock(searched) && !/^<ul[^>]*\shidden\b/.test(mandateBlock(searched)), "the search finds a mandate by its title");
ok(/data-pdxdb-find-none hidden/.test(searched), "…so the no-match line stays hidden");
B.setQuery("");

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · only composer boards read the Mandate, with their own seat");
{
  const { win, calls } = boot({ items: ITEMS, seat: "ut-sd-3", mandates: [MANDATE], composer: true });
  const host = hostEl("ut-sd-3");
  ok(win.PDXDistrictBoard.mount(host) === true, "SD-3 mounts");
  await flush();
  const mc = calls.filter((u) => u.indexOf("/api/mandate-proposals") === 0);
  eq(mc.length, 1, "SD-3 asks the Mandate once");
  has(mc[0] || "", "seat=ut-sd-3", "…for its own seat");
  has(mc[0] || "", "member=john_johnson", "…and its sitting member");
  has(host.innerHTML, MANDATE.title, "the mounted board prints the mandate row");
  ok(chips(host.innerHTML).includes(MK), "the mounted board prints the Mandates chip");
  has(host.innerHTML, "Starter Home Amendments", "the mounted board still prints its issue rows");
  eq(win.PDXDistrictBoard.mandates().length, 1, "the board holds the one mandate");
}
{
  const { win, calls } = boot({ items: ITEMS, seat: "ut-sd-3", mandates: [], composer: true });
  const host = hostEl("ut-sd-3");
  win.PDXDistrictBoard.mount(host);
  await flush();
  eq(calls.filter((u) => u.indexOf("/api/mandate-proposals") === 0).length, 1, "SD-3 with none still asks");
  no(host.innerHTML, "data-pdxdb-mandates", "SD-3 with none prints no mandate block");
  ok(!chips(host.innerHTML).includes(MK), "SD-3 with none prints no Mandates chip");
  has(host.innerHTML, "Starter Home Amendments", "…and its issue rows");
}
{
  const { win, calls } = boot({ items: ITEMS, seat: "ut-hd-29", mandates: [MANDATE], composer: false });
  const host = hostEl("ut-hd-29");
  ok(win.PDXDistrictBoard.mount(host) === true, "generated HD-29 mounts");
  await flush();
  const mc = calls.filter((u) => u.indexOf("/api/mandate-proposals") === 0);
  eq(mc.length, 1, "a generated board asks the Mandate once");
  has(mc[0] || "", "seat=ut-hd-29", "…for its own seat");
  has(host.innerHTML, "data-pdxdb-mandates", "a generated board prints the mandate block");
  has(host.innerHTML, MANDATE.title, "…with the mandate row");
}
{
  const { win, calls } = boot({ items: ITEMS, seat: "ut-gov", mandates: [MANDATE], composer: false });
  const host = hostEl("ut-gov");
  win.PDXDistrictBoard.mount(host);
  await flush();
  const mc = calls.filter((u) => u.indexOf("/api/mandate-proposals") === 0);
  eq(mc.length, 1, "a statewide board asks the Mandate once");
  has(mc[0] || "", "seat=ut-gov", "…for its own seat");
  has(host.innerHTML, MANDATE.title, "…and prints the mandate row");
}
{
  // A failed read leaves the band as it was.
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = (url) => String(url).indexOf("/api/mandate-proposals") === 0
    ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
    : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: ITEMS, summary: {} }) };
  win.__PDX_DISTRICT_BOARD_SEAT = "ut-sd-3";
  win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  const host = hostEl("ut-sd-3");
  win.PDXDistrictBoard.mount(host);
  await flush();
  no(host.innerHTML, "data-pdxdb-mandates", "a failed Mandate read prints no mandate block");
  has(host.innerHTML, "Starter Home Amendments", "…and the issue rows still render");
}

// ── 6 ───────────────────────────────────────────────────────────────────────
section("6 · the seat filter is a read over the same store");
{
  const src = FN.slice(FN.indexOf("const SEAT_KEY_RE"), FN.indexOf("// ── GET / — list proposals"));
  must(src.length > 100, "seatSpellings() not found in mandate-proposals.mts");
  const js = stripTypeScriptTypes(src);
  const seatSpellings = new Function("clean", "LINK_ID_MAX", js + "\nreturn seatSpellings;")(
    (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : ""), 64);
  eq(JSON.stringify(seatSpellings("ut-sd-3")), JSON.stringify(["ut-sd-3", "ut-statesenate-3"]), "an alias matches both spellings");
  eq(JSON.stringify(seatSpellings("UT-StateHouse-16")), JSON.stringify(["ut-hd-16", "ut-statehouse-16"]), "a key matches both spellings, any case");
  eq(JSON.stringify(seatSpellings("ut-cd-2")), JSON.stringify(["ut-cd-2", "ut-house-2"]), "UT-2 matches both spellings");
  eq(JSON.stringify(seatSpellings("drop table")), "[]", "a non-seat matches nothing");
  eq(JSON.stringify(seatSpellings(null)), "[]", "no seat matches nothing");
}
has(FN, 'url.searchParams.has("seat")', "the list route takes a seat");
has(FN, "linkedPoliticianIds} @>", "the sitting member is matched in the politician links");
has(FN, "jsonb_array_elements_text", "the seat is matched in the race links");
eq((FN.match(/\.insert\(pdxProposals\)/g) || []).length, 1, "the only proposal insert is still the submit route");
has(MOD, "MANDATE_API = '/api/mandate-proposals'", "the board reads the endpoint /mandate reads");
ok(!/method:\s*'POST'/.test(MOD.slice(MOD.indexOf("function fetchMandates"), MOD.indexOf("// ── MOUNT"))), "the board's mandate read never posts");

// ── 7 ───────────────────────────────────────────────────────────────────────
section("7 · no equity or stock language");
const BANNED = /\b(equity|equities|stocks?|shares?|shareholders?|stakes?|stakeholders?|invest\w*|dividends?|portfolio|ownership)\b/i;
const newCopy = [B.COPY.catMandates, B.COPY.mandateTag, B.COPY.mandateStatus].join(" ");
ok(!BANNED.test(newCopy), `the mandate copy carries no equity or stock word — ${(BANNED.exec(newCopy) || [])[0]}`);
const rendered = blk.replace(/<[^>]+>/g, " ");
ok(!BANNED.test(rendered), `the rendered mandate rows carry no equity or stock word — ${(BANNED.exec(rendered) || [])[0]}`);
const cssBlock = CSS.slice(CSS.indexOf("THE MANDATE ROWS"), CSS.indexOf(".pdxdb-mandate-st {"));
ok(!BANNED.test(cssBlock), "the stylesheet's mandate note carries no equity or stock word");

// ── 8 ───────────────────────────────────────────────────────────────────────
section("8 · the shell moved, and /mandate opens on a linked card");
ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 335, "the shell moved at least to v335");
ok(/v335 - [\s\S]*?MIGRATION COST: none/.test(SW), "v335's log says no migration");
for (const f of ["/district-board.js", "/district-board.css", "/mandate-lane.js"]) has(SW, `'${f}'`, `${f} is precached`);
ok(/#pp-card-\(\\d\+\)\$/.test(LANE), "mandate-lane.js reads a #pp-card-<id> link");

report();
