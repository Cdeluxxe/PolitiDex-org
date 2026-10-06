#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-purpose-line.mjs — every board says what the room is for
// ─────────────────────────────────────────────────────────────────────────────
// A district board opened as a table: a seat, a count, an issue list. The
// homepage card said what the room is; the board did not. Every board now
// paints the homepage's own sentence once, under the page title and above band
// 1, from one string in district-board.js (COPY.purpose).
//
// Mounts the SHIPPED district-board.js on HD-16, SD-3, a generated board
// (HD-29) and the governor board (ut-gov), then re-runs it with "demand",
// "stock" and "premium" written in to prove the checks would catch each.
//
//   node scripts/test-board-purpose-line.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ board purpose line: STALE HARNESS — ${m}`);
  process.exit(2);
};

const MOD = R("district-board.js");
const SW = R("sw.js");
const DV = R("district-voice.js");

// The sentence, fixed here so "word for word" is a string and not whatever the
// tree says today. It began as the homepage card's line; since v308 the card
// carries the three-sentence residency copy instead (scripts/
// test-voice-exclusivity-copy.mjs), and the board's purpose line stays as it was.
const LINE = "This is where neighbors read the same record and speak to the seat — not the internet. " +
  "Anyone can read a board. Only verified residents of that seat get a voice that counts.";

const LOCKED = (R("district-composer.js").match(/var LOCKED_LINE = '([^']+)';/) || [])[1];
must(LOCKED, "district-composer.js no longer declares LOCKED_LINE in a readable shape");

const SEATS = ["ut-hd-16", "ut-sd-3", "ut-hd-29", "ut-gov"];
const BANNED = /\bdemand|\bstocks?\b|\bshares?\b|\bearn|premium|\bmembers?\b|form c\b/i;

// A host the way the document serves it: the seat on the attribute, and
// whatever mount() paints into innerHTML.
function host(alias) {
  return {
    innerHTML: "",
    getAttribute: (k) => (k === "data-pdxdb-seat" ? alias : null),
    querySelector() { return null; },
    contains() { return false; },
  };
}
function mounted(alias, src) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(src, ctx, { filename: "district-board.js" });
  const M = win.PDXDistrictBoard;
  const el = host(alias);
  const okMount = !!(M && M.mount(el));
  return { M, el, okMount };
}
const lines = (html) =>
  [...String(html).matchAll(/<p class="pdxdb-purpose"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
const count = (h, n) => String(h).split(n).length - 1;

function failuresFor(src) {
  const out = [];
  for (const alias of SEATS) {
    const { M, el, okMount } = mounted(alias, src);
    if (!okMount) { out.push(`${alias}: did not mount`); continue; }
    if (!M.active() || M.board(alias).seat !== M.active().seat) out.push(`${alias}: mounted another board`);
    const html = el.innerHTML;
    const l = lines(html);
    if (l.length !== 1) out.push(`${alias}: expected one purpose line, got ${l.length}`);
    if (l[0] !== LINE) out.push(`${alias}: purpose line is not the homepage sentence: ${JSON.stringify(l[0])}`);
    if (count(html, LINE) !== 1) out.push(`${alias}: the sentence is printed ${count(html, LINE)} times`);
    const p = html.indexOf('class="pdxdb-purpose"');
    const seat = html.indexOf('data-pdxdb-band="seat"');
    if (seat < 0) out.push(`${alias}: band 1 not found`);
    else if (!(p >= 0 && p < seat)) out.push(`${alias}: the purpose line is not above the seat`);
    if (BANNED.test(l.join(" "))) out.push(`${alias}: purpose line carries a banned word`);
  }
  return out;
}

section("1 · the string is held once");
{
  const { M } = mounted("ut-hd-16", MOD);
  eq(M.COPY.purpose, LINE, "COPY.purpose");
  eq(count(MOD, "This is where neighbors"), 1, "district-board.js holds the sentence once");
  ok(!/not the internet/.test(R("scripts/district-board.template.html")), "the generator template writes no copy of it");
  ok(!/not the internet/.test(R("district-ut-hd-16.html")), "HD-16's document writes no copy of it");
  ok(!/not the internet/.test(R("district-ut-sd-3.html")), "SD-3's document writes no copy of it");
}

section("2 · HD-16, SD-3, HD-29 (generated) and ut-gov print it once, above the seat");
{
  const f = failuresFor(MOD);
  eq(f.length, 0, `shipped header — ${JSON.stringify(f.slice(0, 8))}`);
}

section("3 · mutations: \"demand\", \"stock\" and \"premium\" each fail");
for (const add of [" Demand an answer.", " Hold stock in your district.", " Go premium for more."]) {
  const mutated = MOD.replace("'Anyone can read a board. Only verified residents of that seat get a voice that counts.'",
      `'Anyone can read a board. Only verified residents of that seat get a voice that counts.${add}'`);
  must(mutated !== MOD, `the mutation "${add}" found nothing to replace`);
  ok(failuresFor(mutated).length > 0, `a purpose line with "${add.trim()}" passed the checks`);
}

section("4 · the footer and the composer did not move");
{
  eq(LOCKED, "Only verified residents of this seat get a voice that counts.", "the composer's locked line");
  const { M } = mounted("ut-hd-16", MOD);
  ok(M.COPY.voiceFoot.indexOf(LOCKED) >= 0, "the footer still carries the locked line");
  for (const f of ["district-ut-hd-16.html", "district-ut-sd-3.html", "district-ut-gov.html"]) {
    ok(R(f).indexOf(`<p class="pdxdc-locked" data-pdxdc-locked="1">${LOCKED}</p>`) >= 0 ||
       !/pdxdc-locked/.test(R(f)), `${f}: the served locked line is unchanged`);
  }
}

section("5 · scope: same boards, no splat, the shell moved, no migration");
{
  const w = makeSandbox();
  vm.runInContext(DV, vm.createContext(w), { filename: "district-voice.js" });
  eq(Object.keys(w.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES stays 88");
  ok(!/from = "\/district\/[^"]*\*/.test(R("netlify.toml")), "no /district/* splat");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 300, "the shell moved at least to v300");
  ok(/v300 - THE BOARD SAYS WHAT THE ROOM IS FOR[\s\S]*?MIGRATION COST: none/.test(SW), "v300's log says no migration");
}

if (failures.length) {
  console.error(`\n✗ board purpose line: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ board purpose line: all ${passed} assertions passed`);
