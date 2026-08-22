#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-welcome-honesty.mjs — the first thing a visitor reads is the real product
// ─────────────────────────────────────────────────────────────────────────────
// The Quick tour is opt-in, which makes it easy to leave behind. It was: the
// welcome panel promised "a clear Accountability Score, one Word vs Action read
// … and a personal match", and the walkthrough promised that "every politician
// gets" that read. Two claims, both wrong, in the copy a new reader meets first.
//
//   · TWO SCORES. The product publishes ONE formal figure — Direction Match,
//     stated positions against the votes and official acts on file. Naming a
//     second metric ahead of the record invents a number the profile does not
//     have and cannot show.
//   · A UNIVERSAL GUARANTEE. The figure is fail-closed: below the tested floor
//     there is no percentage, and roughly four profiles in five are below it.
//     "Every politician earns…" promises a number that mostly is not there.
//
// So this file reads the shipped markup and holds the welcome overlay and the
// three tour steps to what the rest of the site says: one metric, named; a floor,
// disclosed; and the values match kept where it belongs, as a personal tool
// rather than a grade already sitting on every profile.
//
//   node scripts/test-welcome-honesty.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(ROOT, "index.html"), "utf8");

const failures = [];
let passed = 0;
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);

// ── The two texts under test ────────────────────────────────────────────────
// The overlay is the panel itself; the tour strings are the three steps its
// "quick tour" button walks through. They are read separately so a failure names
// which surface regressed, and both are located by structure rather than by a
// copy fragment, so rewording the copy cannot silently empty the test.
const ovStart = HTML.indexOf('<div id="pdx-welcome-overlay"');
ok(ovStart !== -1, "the welcome overlay is still in index.html");
const ovEnd = HTML.indexOf('BUILD MY VOTING TEAM', ovStart);
ok(ovEnd > ovStart, "the welcome overlay still ends before the onboarding modal");
const OVERLAY = HTML.slice(ovStart, ovEnd);
ok(OVERLAY.length > 2000, `the overlay slice is substantial (${OVERLAY.length} chars)`);

const stStart = HTML.indexOf("var steps = [");
ok(stStart !== -1, "the guided tour still declares its steps");
const stEnd = HTML.indexOf("function overlay()", stStart);
ok(stEnd > stStart, "the tour steps array still closes before the tour helpers");
const STEPS = HTML.slice(stStart, stEnd);
ok((STEPS.match(/\bbody:\s*'/g) || []).length === 3, "all three tour steps are in the slice");

if (failures.length) {
  console.error("\n✖ welcome honesty: could not locate the copy under test\n");
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}

const SURFACES = [["welcome overlay", OVERLAY], ["tour steps", STEPS]];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one metric, named — no second score in front of the record");
// ═════════════════════════════════════════════════════════════════════════════
// "Accountability Score" is a real engine name in the codebase; what it may not
// be is a product metric offered to a reader beside Direction Match, because the
// profile publishes one percentage and this is where the reader learns what it is.
for (const [label, src] of SURFACES) {
  ok(!/Accountability Score/i.test(src),
    `${label}: names "Accountability Score" as a metric — the product publishes one figure, Direction Match`);
  ok(!/\bIntegrity Score\b|\bTruth Score\b|\bHonesty Score\b|\bPolitiDex Score\b/i.test(src),
    `${label}: names a second score alongside Direction Match`);
}
ok(/Direction Match/.test(OVERLAY),
  "the overlay names Direction Match — a reader is told which figure the product publishes");
ok(/Direction Match/.test(STEPS),
  "the record step names Direction Match too, so the walkthrough and the panel agree");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no universal publish claim — the floor is real and disclosed");
// ═════════════════════════════════════════════════════════════════════════════
// word-action.js fails closed at MIN_TESTED_ITEMS / MIN_TESTED_WEIGHT, so most
// profiles carry no percentage at all. Any sentence of the form "every politician
// {earns,gets,has} a {score,read,figure}" promises one to all of them.
const UNIVERSAL = [
  /\bevery politician\b[^.<]{0,80}\b(earns?|gets?|has|have|receives?|comes with)\b/i,
  /\bevery profile\b[^.<]{0,80}\b(earns?|gets?|has a|publishes a)\b[^.<]{0,40}\b(score|figure|percentage|rating|read)\b/i,
  /\ball politicians\b[^.<]{0,80}\b(earn|get|have)\b/i,
  /\beveryone\b[^.<]{0,60}\b(scored|rated|graded)\b/i,
];
for (const [label, src] of SURFACES) {
  for (const re of UNIVERSAL) {
    ok(!re.test(src),
      `${label}: claims a figure for every politician (${re}) — the read is fail-closed and most profiles have none`);
  }
}

// …and the scope is stated positively, not merely left unsaid. A reader should
// learn from this copy that the figure is conditional on the record's depth.
const CONDITIONAL = /(deep enough|enough (?:of it |formal )?record|runs deep enough|where there is enough|tested floor|only where)/i;
for (const [label, src] of SURFACES) {
  ok(CONDITIONAL.test(src),
    `${label}: does not say the figure depends on how much record there is — the floor is the honest part`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the values match stays a personal tool, not a universal grade");
// ═════════════════════════════════════════════════════════════════════════════
ok(!/every politician gets a personal match score/i.test(OVERLAY),
  "the alignment card no longer frames the match as a score already sitting on every profile");
ok(/your (?:own )?(?:values|match)|values? (?:match|line up)|line up with yours/i.test(OVERLAY),
  "the overlay still offers the values match — it is a real tool, just a personal one");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no party framing, no catch-them-lying tone");
// ═════════════════════════════════════════════════════════════════════════════
// The panel's premise line is explicitly anti-party ("don't judge them by their
// party"), which is the framing this checks for the ABSENCE of — a loyalty
// metric, a party-line rate, a broke-with-party badge.
for (const [label, src] of SURFACES) {
  ok(!/party loyalty|party-line (?:score|rate|percentage)|broke with (?:the |his |her |their )?party|votes? with (?:his|her|their) party \d/i.test(src),
    `${label}: introduces party-loyalty framing`);
  ok(!/catch (?:them|him|her|politicians) (?:lying|out)|expose the liars|liar/i.test(src),
    `${label}: falls back on the promise-era "catch them lying" tone`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the shell is renamed, so a repeat visitor actually reads it");
// ═════════════════════════════════════════════════════════════════════════════
// index.html is precached as '/' in the app shell. A copy fix that does not
// rename the cache is invisible to exactly the visitors who have been here before.
{
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  const m = /const CACHE_VERSION = 'v(\d+)'/.exec(sw);
  ok(!!m, "sw.js still declares CACHE_VERSION");
  ok(m && Number(m[1]) >= 66,
    `sw: CACHE_VERSION is ${m ? "v" + m[1] : "missing"} — bump it past v65, or a returning phone keeps ` +
    "being served the shell that still promises an Accountability Score for every politician");
  ok(/'\/'/.test(sw), "sw: '/' is still precached, which is why the bump is required");
}

console.log("");
if (failures.length) {
  console.error(`✖ welcome honesty: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ welcome honesty: all ${passed} assertions passed — one metric named, the floor disclosed, the match kept personal\n`);
