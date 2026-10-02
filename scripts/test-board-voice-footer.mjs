#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-voice-footer.mjs — the board footer names the real gate
// ─────────────────────────────────────────────────────────────────────────────
// The line under every district board's issue list said posting was "limited
// on the free tier and unlimited for members". There is no free tier and no
// member tier on this surface: posting and polls open only after a vendor
// residency check for that seat. The footer now prints the composer's own
// locked line. Reading stays free.
//
// Runs the SHIPPED district-board.js on HD-16, SD-3, a generated board (HD-29)
// and a statewide board (ut-gov), then re-runs it with "free tier" put back to
// prove the checks would catch it.
//
//   node scripts/test-board-voice-footer.mjs
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
  console.error(`✗ board voice footer: STALE HARNESS — ${m}`);
  process.exit(2);
};

const MOD = R("district-board.js");
const SW = R("sw.js");
const DV = R("district-voice.js");
const LOCKED = (R("district-composer.js").match(/var LOCKED_LINE = '([^']+)';/) || [])[1];
must(LOCKED, "district-composer.js no longer declares LOCKED_LINE in a readable shape");
eq(LOCKED, "Only verified residents of this seat get a voice that counts.", "the composer's locked line");

const SEATS = ["ut-hd-16", "ut-sd-3", "ut-hd-29", "ut-gov"];
const BANNED = /free tier|free-tier|\btiers?\b|\bmembers?\b|premium|\bstocks?\b|\bshares?\b/i;

function board(alias, src) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(src, ctx, { filename: "district-board.js" });
  return win.PDXDistrictBoard;
}
const feet = (html) => [...String(html).matchAll(/<p class="pdxdb-foot">([\s\S]*?)<\/p>/g)].map((m) => m[1]);

// Every table state prints the footer, so every one is checked.
const ITEMS = [{ measureId: "hb1", title: "A measure", issueKeys: [] }];
function failuresFor(src) {
  const out = [];
  for (const alias of SEATS) {
    const M = board(alias, src);
    if (!M || typeof M.tableHtml !== "function") { out.push(`${alias}: no tableHtml`); continue; }
    for (const [state, items] of [["unread"], ["wait"], ["ok", []], ["ok", ITEMS]]) {
      const html = M.tableHtml(state, items, []);
      const f = feet(html);
      if (f.length !== 1) out.push(`${alias} ${state}: expected one footer, got ${f.length}`);
      const text = f.join(" ");
      if (BANNED.test(html)) out.push(`${alias} ${state}: footer band mentions a tier/member/premium/stock/share`);
      if (text.indexOf(LOCKED) < 0) out.push(`${alias} ${state}: footer does not carry the composer's locked line`);
      if (text.indexOf("free to everyone") < 0) out.push(`${alias} ${state}: footer no longer says reading is free`);
    }
  }
  return out;
}

section("1 · HD-16, SD-3, HD-29 (generated) and ut-gov (statewide) print the locked line");
{
  const f = failuresFor(MOD);
  eq(f.length, 0, `shipped footer — ${JSON.stringify(f.slice(0, 8))}`);
  ok(!/free tier|unlimited for members/i.test(MOD), "district-board.js carries no free-tier sentence anywhere");
}

section("2 · mutation: putting \"free tier\" back fails");
{
  const mutated = MOD.replace("Only verified residents of this seat get a voice that counts.",
    "Posting in this district is limited on the free tier and unlimited for members.");
  must(mutated !== MOD, "the mutation found nothing to replace");
  ok(failuresFor(mutated).length > 0, "a footer saying \"free tier\" passed the checks");
}

section("3 · scope: 88 boards, no splat, the shell moved, no migration");
{
  const w = makeSandbox();
  vm.runInContext(DV, vm.createContext(w), { filename: "district-voice.js" });
  eq(Object.keys(w.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES stays 88");
  ok(!/from = "\/district\/[^"]*\*/.test(R("netlify.toml")), "no /district/* splat");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 274, "the shell moved at least to v274");
  ok(/v274 - THE BOARD FOOTER NAMES THE REAL GATE[\s\S]*?MIGRATION COST: none/.test(SW), "v274's log says no migration");
}

if (failures.length) {
  console.error(`\n✗ board voice footer: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ board voice footer: all ${passed} assertions passed`);
