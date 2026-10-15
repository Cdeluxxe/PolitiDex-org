#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE GENERAL-THREAD DOOR ON THE PERSON FILE (sw v381)
// ─────────────────────────────────────────────────────────────────────────────
// A person file kept one small District Voice link at the top, and a reader
// who wanted the sitting member's general thread had to find the board, then
// the section. The file now carries one more line per boarded seat the person
// holds NOW — "General thread · <district>" — straight to ?general=<pid> on
// that seat's board, the parameter district-composer.js already reads.
//
//   1. THE CURRENT HOLDER gets the line, pointing at their own pid on their
//      own seat's board, and nothing else: no count, no composer, no preview.
//   2. A PRIOR HOLDER gets no line, and the current holder's file names no
//      prior holder.
//   3. A PERSON WITH TWO BOARDED SEATS gets two lines; a person with none gets
//      none, and the kicker is unchanged.
//   4. person-file.js asks for it under the existing links, which stay.
//   5. MUTATION: a link pointing at the wrong pid fails.
//
//   node scripts/test-person-general-thread.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const DB = R("district-board.js");
const SEATED = R("seated-member.js");
const PF = R("person-file.js");
const PF_CSS = R("person-file.css");
const COMPOSER = R("district-composer.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

// person.html's own order: seated-member.js, then district-board.js.
function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(SEATED, ctx, { filename: "seated-member.js" });
  vm.runInContext(src || DB, ctx, { filename: "district-board.js" });
  return win.PDXDistrictBoard;
}
const linksOf = (html) => [...String(html).matchAll(/<a class="pf-kick-general" href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
  .map((m) => ({ href: m[1].replace(/&amp;/g, "&"), text: m[2] }));

// THE COMPOSER'S PARAMETER, read by the composer's own parser: whatever the
// person file writes must be what the board opens.
const generalFrom = (() => {
  const a = COMPOSER.indexOf("function generalFrom(search)");
  const body = COMPOSER.slice(a, COMPOSER.indexOf("\n  }", a) + 4);
  return new Function(body + "; return generalFrom;")();
})();

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the current holder's file opens their general thread on their seat's board");
const B = boot();
ok(B && typeof B.generalLinksHtml === "function", "PDXDistrictBoard.generalLinksHtml is not published");
function holderFaults(Bd, pid, route, label) {
  const f = [];
  const html = Bd.generalLinksHtml(pid);
  const links = linksOf(html);
  if (links.length !== 1) { f.push(`${pid}: expected one general-thread line, got ${links.length}`); return f; }
  const want = `${route}?general=${pid}#pdx-general-room`;
  if (links[0].href !== want) f.push(`${pid}: the line points at ${links[0].href}, not ${want}`);
  if (links[0].text !== `General thread · ${label}`) f.push(`${pid}: the line reads "${links[0].text}"`);
  const q = links[0].href.slice(links[0].href.indexOf("?"), links[0].href.indexOf("#"));
  if (generalFrom(q) !== pid) f.push(`${pid}: the board's own parser opens ${JSON.stringify(generalFrom(q))}, not ${pid}`);
  return f;
}
{
  const f = holderFaults(B, "tlee", "/district/ut-hd-16", "Utah House District 16");
  eq(f.length, 0, `Trevor Lee's file: "General thread · Utah House District 16" → ?general=tlee — ${JSON.stringify(f)}`);
  eq(holderFaults(B, "sadams", "/district/ut-sd-7", "Utah Senate District 7").length, 0, "Stuart Adams's file opens SD-7's general thread");
  // A congressional board, whose holder is the curated table on this document.
  eq(holderFaults(B, "maloy", "/district/ut-cd-2", "Utah’s 2nd Congressional District").length, 0,
    "Celeste Maloy's file opens UT-2's general thread");
  // A statewide board names the office, not the person twice.
  eq(holderFaults(B, "cox", "/district/ut-gov", "Governor").length, 0, "the governor's file opens the governor board's general thread");
  // JUST THE DOOR: no count, no composer, no preview.
  const html = B.generalLinksHtml("tlee");
  ok(!/<(?:textarea|form|input|button)\b/i.test(html), "the line carries a composer control");
  ok(!/\d/.test(html.replace(/<[^>]+>/g, "").replace(/District 16/g, "")), "the line prints a number beyond the district's own");
  lacks(html, "onclick", "the line wires a click handler instead of being an anchor");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a prior holder gets no line, and the holder's file names no prior holder");
{
  // HD-16 changes hands. The table's row is who sits in the seat today.
  const Bm = boot();
  Bm.BOARDS["ut-statehouse-16"].pid = "new_rep_h16";
  eq(Bm.generalLinksHtml("tlee"), "", "a prior holder of HD-16 still gets a general-thread line on their file");
  const f = holderFaults(Bm, "new_rep_h16", "/district/ut-hd-16", "Utah House District 16");
  eq(f.length, 0, `the new holder's file opens their own thread — ${JSON.stringify(f)}`);
  lacks(Bm.generalLinksHtml("new_rep_h16"), "tlee", "the current holder's file links the prior holder's thread");
}
eq(B.generalLinksHtml("mitt_romney"), "", "a person who holds no boarded seat gets a line");
eq(B.generalLinksHtml(""), "", "an empty pid gets a line");
eq(B.generalLinksHtml(null), "", "a null pid gets a line");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · two boarded seats, two lines");
{
  const Bm = boot();
  Bm.BOARDS["ut-statesenate-7"].pid = "tlee";
  const links = linksOf(Bm.generalLinksHtml("tlee"));
  eq(links.length, 2, "a person holding two boarded seats does not get one line per seat");
  eq(links.map((l) => l.href).sort().join("|"),
    ["/district/ut-hd-16?general=tlee#pdx-general-room", "/district/ut-sd-7?general=tlee#pdx-general-room"].join("|"),
    "the two lines do not point at the two boards");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · person-file.js puts it under the existing links, which stay");
ok(/voiceLink\(pid\) \+ boardLink\(pid\) \+ generalLinks\(pid\)/.test(PF),
  "the kicker no longer carries the Voice link, the board link and the general-thread lines, in that order");
has(PF, "B.generalLinksHtml(pid)", "person-file.js does not ask district-board.js for the lines");
has(PF_CSS, ".pf-kick-general", "person-file.css does not style the line");
has(PF_CSS, ".pf-kick-generals", "person-file.css does not give the lines their own row");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutation: a link at the wrong pid or the wrong seat fails");
{
  const mutated = DB.replace("return b.route + '?general=' + encodeURIComponent(String(pid))",
    "return b.route + '?general=' + encodeURIComponent(String(b.pid || 'someone_else'))");
  ok(mutated !== DB, "the wrong-pid mutation found nothing to replace");
  ok(holderFaults(boot(mutated), "maloy", "/district/ut-cd-2", "Utah’s 2nd Congressional District").length > 0,
    "a general-thread link that points at the wrong pid passed the holder checks");
  const wrongSeat = DB.replace("return b.route + '?general='", "return BOARDS['ut-statesenate-3'].route + '?general='");
  ok(wrongSeat !== DB, "the wrong-seat mutation found nothing to replace");
  ok(holderFaults(boot(wrongSeat), "tlee", "/district/ut-hd-16", "Utah House District 16").length > 0,
    "a general-thread link that points at the wrong seat's board passed the holder checks");
  const mutated2 = DB.replace("if (memberOf(b) !== want) continue;", "");
  ok(mutated2 !== DB, "the every-board mutation found nothing to replace");
  ok(holderFaults(boot(mutated2), "tlee", "/district/ut-hd-16", "Utah House District 16").length > 0,
    "a file that links every board's general thread passed the holder checks");
}

console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log("   ✓ the person file's general-thread door holds\n");
