#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-home-hygiene.mjs — the front page after the /library extract
// ─────────────────────────────────────────────────────────────────────────────
// Three defects were visible on Home at once, and all three were consequences of
// rooms leaving index.html rather than of anything a reader did:
//
//   1. RAW JAVASCRIPT UNDER THE FOOTER. Follow the Money's departure deleted a
//      leaderboard IIFE that shared one <script> block with
//      window.toggleFollowMoney. Removing the first half took the OPENING TAG
//      with it, so the browser parsed the second half as body text and painted
//      the function's source under the footer — and the name was never defined,
//      which made the 💰 button in the profile modal throw on click.
//
//   2. CURATOR CHROME ON AN ANONYMOUS FRONT PAGE. DATABASE EXPANSION / Bulk
//      Import / AI-Assisted Database Expansion and the Politician Manager stood
//      in the document for every visitor, hidden by one inline style and
//      revealed by one line of JavaScript. That is a reveal, not a gate.
//
//      AND THE FIX FOR (2) WAS REPLACED BY A BETTER ONE. The first pass wrapped
//      the tools in an inert <template> behind a positive html.pdx-admin lock and
//      cloned them only for the allowed account — three locks, each failing
//      closed alone, and this suite ran the gate in a sandbox across six session
//      states to prove it. The tools have since moved to admin.html, served at
//      /admin, and the front page holds none of it: no markup, no template, no
//      allow-list, no gate, no gated nav rows. So section 2 below asserts
//      ABSENCE rather than gating, which is the one claim about Home that no
//      failed stylesheet, stale service worker or reader-mode extension can
//      turn back into a visible expansion wall. The behavioural simulation did
//      not disappear with it — it moved to scripts/test-admin-shell.mjs, which
//      runs the same gate against the document that now owns it.
//
//   3. THE LESSON BEHIND A DOOR. The H.R.1 teaching case lived only inside
//      #hr1-showcase, which starts display:none inside #pdx-door-work, so the
//      one thing most worth learning was the one thing a reader had to hunt for.
//
// What must stay true:
//
//   · Zero source text is visible in the body, and toggleFollowMoney is defined
//     inside a real script block that parses.
//   · The admin tools are NOT ON THIS DOCUMENT. Not gated, not hidden, not
//     inert inside a template: absent. And not deleted either — admin.html has
//     them, and scripts/test-admin-shell.mjs is what proves that end of it.
//   · Home carries ONE compact H.R.1 card, outside #pdx-door-work, with 2–4
//     issue chips the measure actually maps to, one control to the bill's own
//     address, no percentage, no party and no second catalog.
//   · #hr1-showcase is still the deep read, still opened by the Door 1 chip.
//
//   node scripts/test-home-hygiene.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe whose target was renamed away is stale, not passing.
const must = (c, m) => { if (c) return; console.error(`✗ home hygiene: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing in the body is source text");
// ═════════════════════════════════════════════════════════════════════════════
// THE SCAN IS A TOKENIZER, NOT A REGEX, and it has to be: `<script` appears
// inside JS strings all over this document, and inside the HTML comment that
// explains this very repair, so counting tags or matching pairs with a regular
// expression reports nonsense. This walks the document the way the parser does —
// whichever of `<!--`, `<script` or `<style` comes first wins, and inside a
// script or style element EVERYTHING up to the matching close tag is that
// element's text, not markup.
const visibleText = (() => {
  let p = 0, out = [];
  for (;;) {
    const c = INDEX.indexOf("<!--", p);
    const s = INDEX.indexOf("<script", p);
    const y = INDEX.indexOf("<style", p);
    const next = [c, s, y].filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (next === undefined) { out.push(INDEX.slice(p)); break; }
    out.push(INDEX.slice(p, next));
    if (next === c) {
      const e = INDEX.indexOf("-->", next);
      p = e < 0 ? INDEX.length : e + 3;
    } else {
      const tag = next === s ? "</script>" : "</style>";
      const e = INDEX.indexOf(tag, next);
      p = e < 0 ? INDEX.length : e + tag.length;
    }
  }
  // Strip the remaining markup tags; what is left is what a reader can see.
  return out.join("\n").replace(/<[^>]*>/g, " ");
})();

ok(!visibleText.includes("toggleFollowMoney"),
  "the string toggleFollowMoney is visible as body text — the Follow the Money block lost its opening <script> tag again");
const SOURCE_TELLS = [
  [/window\.[A-Za-z_$][\w$]*\s*=/, "a window.* assignment"],
  [/function\s*\([^)]*\)\s*\{/, "a function literal"],
  [/=>\s*\{/, "an arrow function"],
  [/\}\s*\)\s*;/, "an IIFE tail"],
  [/document\.getElementById\(/, "a getElementById call"],
];
for (const [re, what] of SOURCE_TELLS) {
  const m = visibleText.match(re);
  ok(!m, `index.html paints ${what} as visible body text — ${JSON.stringify(String(m && m[0]).slice(0, 60))}`);
}

// THE SECOND HALF OF THE RULE THIS SUITE WROTE DOWN. When the Follow the Money
// leaderboard IIFE was deleted it took the opening <script> tag of the block it
// shared with window.toggleFollowMoney, and the function's source painted as
// body text under the footer. The repair then was to restore the tag rather than
// delete the function, because profiles-full.js still called it by name — and
// this suite recorded the condition: if the caller is gone the function should be
// too. The caller is now gone. The 💰 Follow This Money Trail button sat on the
// fabricated transparency card in the person file's money section, and that card
// was removed, so the function became a writer to a followMoney doc that no
// surface reads back. So the pin flips: the definition must be ABSENT, and the
// orphan check still runs against whatever shares that neighbourhood.
ok(!/toggleFollowMoney\s*=/.test(R("profiles-full.js")) && R("profiles-full.js").indexOf("toggleFollowMoney(") === -1,
  "profiles-full.js calls toggleFollowMoney again — the control it belonged to was deleted with\n" +
  "    the transparency card, and the person file's money section is two blocks and nothing else");
ok(INDEX.indexOf("window.toggleFollowMoney = function") === -1,
  "index.html defines window.toggleFollowMoney again — nothing calls it, and a write with no\n" +
  "    caller is how a dead control comes back as a live one later");
{
  // WHAT REPLACED IT IN THAT BLOCK, AND WHY IT STAYED. The sync wrapper is a
  // READ: on sign-in it pulls any followMoney doc the reader already has into
  // memory. It writes nothing and, with the toggle gone, has no way to grow the
  // list. It also has to survive the same orphaning the leaderboard caused, so
  // its block is checked whole: a real opening tag, and source that parses.
  const at = INDEX.indexOf("window.syncUserDataFromFirestore = function");
  must(at > 0, "the followMoney sync wrapper is gone from index.html — a signed-in reader's existing\n" +
               "    followed trails no longer load, which is a silent data loss, not a deletion");
  const open = INDEX.lastIndexOf("<script>", at);
  const close = INDEX.indexOf("</script>", at);
  must(open > 0 && close > at, "the followMoney sync block has no surrounding script tags at all — this is exactly the\n" +
                               "    orphaning that painted JavaScript under the footer last time");
  const body = INDEX.slice(open + "<script>".length, close);
  ok(body.indexOf("toggleFollowMoney") === -1,
    "the deleted toggle is back inside the sync block — that block is a read, and mixing a write\n" +
    "    into it is how both halves end up sharing one tag again");
  let parsed = true;
  try { new vm.Script(body, { filename: "index.html#followMoneySync" }); }
  catch (e) { parsed = false; failures.push("the followMoney sync block does not parse — " + e.message); }
  if (parsed) passed++;
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the curator's tools are not on this document at all");
// ═════════════════════════════════════════════════════════════════════════════
// THE STRONGEST STATEMENT A TEST CAN MAKE ABOUT A SURFACE IS THAT IT IS NOT
// THERE. Everything below is an absence, and every one of them used to be a
// presence with a lock on it.
{
  // THE FOUR STRINGS THE BRIEF NAMED, CASE-INSENSITIVELY AND TWICE OVER: once
  // against the visible body text the tokenizer above produced — which is what a
  // signed-out reader can actually read, including anything a cleared style would
  // reveal, because <template> content is markup and the tokenizer keeps it —
  // and once against the RAW FILE, comments included. The second is stricter than
  // the brief asks and it is the one that catches a relocation that left a
  // commented-out copy behind, which is how 650 lines of markup usually die.
  const BANNED = ["DATABASE EXPANSION", "BULK IMPORT MODE", "AI-ASSISTED DATABASE",
                  "Ready for discovery scan"];
  const upperVisible = visibleText.toUpperCase();
  const upperFile = INDEX.toUpperCase();
  for (const phrase of BANNED) {
    const needle = phrase.toUpperCase();
    ok(!upperVisible.includes(needle),
      `a signed-out index.html paints ${JSON.stringify(phrase)} as visible body text — the expansion wall is back on Home`);
    ok(!upperFile.includes(needle),
      `index.html still contains ${JSON.stringify(phrase)} somewhere in the file — a commented-out or inert copy is still a copy`);
  }

  // THE MACHINERY, EACH PIECE BY NAME. Markup is checked against the
  // comment-stripped document, because this file's own prose has to be able to
  // say "data-admin-only" while explaining why there is no longer one.
  const MARKUP = INDEX.replace(/<!--[\s\S]*?-->/g, "");
  for (const needle of ['<template id="pdx-admin-tools">',
                        '<section id="database-expansion"',
                        '<section id="politician-manager"',
                        '<style id="pdx-admin-gate-css">',
                        "data-admin-only",
                        "pdx-navmenu__item--admin"]) {
    ok(!MARKUP.includes(needle),
      `index.html still carries ${JSON.stringify(needle)} — the curator's markup did not leave the front page`);
  }
  // …and the code. mountAdminTools() must not exist here to inject anything,
  // which is the brief's own line, and ADMIN_EMAILS must not exist here to
  // decide anything.
  for (const needle of ["ADMIN_EMAILS", "mountAdminTools", "unmountAdminTools",
                        "applyAdminGate", "loadAdminModules", "isAdminUser"]) {
    ok(!INDEX.includes(needle),
      `index.html still defines or names ${needle} — the front page still holds an opinion about who a curator is`);
  }
  // No [data-admin-only] element means no querySelectorAll over it either, and
  // no `.pdx-admin` class to switch on. Checked on the raw file: a live line and
  // a leftover line look identical to a browser.
  ok(!/classList\.(?:add|remove|toggle)\(\s*['"]pdx-admin['"]/.test(INDEX),
    "index.html still toggles the .pdx-admin class — the front page still has an admin state");

  // THE FRONT PAGE DOES NOT ADDRESS THE 451 KB PAIR. Section 1 of
  // test-admin-not-on-critical-path.mjs owns the script-tag claim for every
  // shell; this is the companion that belongs next to the absences above, and
  // it is about ADDRESSES rather than mentions. Prose may name the two files —
  // the note above the data-hygiene tag has to, to explain where they went, and
  // so does the guard left on updateExpansionStats() — but nothing on this
  // document may hold either one in a quoted path, which is the only form a
  // browser can act on. Checked against the whole raw file, comments included,
  // because a quoted path inside a JS comment is one uncomment away from a
  // fetch.
  for (const f of ["admin-politician-manager.js", "expansion-controller.js"]) {
    // A quote, then nothing but path characters, then the file name: that is a
    // path and an apostrophe three words earlier in a sentence is not.
    const esc = f.replace(/\./g, "\\.");
    ok(!new RegExp(`["'\`][\\w./-]*${esc}`).test(INDEX),
      `index.html holds /${f} in a quoted path — the front page can still fetch the curator's controllers`);
  }
  // …but the public hygiene layer STAYED. It was never admin-only, and the
  // directory and the dashboard counts read through it.
  has(INDEX, 'src="/data-hygiene.js"',
    "index.html stopped loading /data-hygiene.js — the tools took the public de-duplication layer with them");
}

// RELOCATED, NOT DELETED — the brief's own line, and the half of it this suite
// can still see from here. The tools have to be SOMEWHERE, and the somewhere has
// to be one place. Deep assertions about that document belong to
// scripts/test-admin-shell.mjs; these three are the seam between the two suites,
// so that deleting the room cannot pass as cleaning the front page.
{
  let ADMIN_DOC = null;
  try { ADMIN_DOC = R("admin.html"); } catch (e) { /* reported below */ }
  must(ADMIN_DOC, "admin.html does not exist — the curator's tools were deleted rather than moved");
  for (const marker of ["AI-Assisted Database Expansion", "Bulk Import",
                        'id="politician-manager"', '<template id="pdx-admin-tools">',
                        "var ADMIN_EMAILS"]) {
    has(ADMIN_DOC, marker, "admin.html does not carry the relocated tool — the move lost it");
  }
  const TOML = R("netlify.toml");
  has(TOML, 'from = "/admin"', "there is no /admin rewrite, so the relocated tools have no address");
  has(TOML, 'to = "/admin.html"', "the /admin rewrite does not point at the curator's document");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one compact H.R.1 card on Home, and the showcase still behind Door 1");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cardAt = INDEX.indexOf('<section id="pdx-hr1-card"');
  must(cardAt > 0, "the H.R.1 card (#pdx-hr1-card) is not on index.html");
  const cardEnd = INDEX.indexOf("</section>", INDEX.indexOf('<div class="phc-wrap">', cardAt));
  const card = INDEX.slice(cardAt, cardEnd);
  const doorAt = INDEX.indexOf('id="pdx-door-work"');
  const showcaseAt = INDEX.indexOf('<section id="hr1-showcase"');
  must(doorAt > 0 && showcaseAt > 0, "#pdx-door-work or #hr1-showcase was renamed");

  ok(cardEnd < doorAt, "the H.R.1 card is inside (or below) #pdx-door-work — it has to be readable without opening a door");
  ok(INDEX.indexOf('<section id="pdx-hr1-card"', cardAt + 1) < 0, "there are two H.R.1 cards on Home");
  ok(!/display:\s*none/.test(card) && !/\bhidden\b/.test(card.slice(0, card.indexOf(">"))),
    "the card ships hidden, which is the defect it was written to fix");

  // ONE CONTROL, AND IT IS THE BILL'S OWN ADDRESS.
  const anchors = card.match(/<a\b/g) || [];
  ok(anchors.length === 1, `the card has ${anchors.length} controls — the brief is one`);
  ok(/href="\/b\/119\/H\.R\.(%20|\s)1"/.test(card), "the control does not point at /b/119/H.R. 1, the bill's own shareable address");
  has(card, "PDXBillDetail", "the control does not hand off to the in-page bill panel when it is already loaded");
  ok(!/href="\/library/.test(card), "the card links into /library — Home is not getting a second catalog this pass");

  // 2–4 CHIPS, AND EVERY KEY IS ONE THE MEASURE ACTUALLY MAPS TO.
  const keys = [...card.matchAll(/data-issue="([a-z_]+)"/g)].map((m) => m[1]);
  ok(keys.length >= 2 && keys.length <= 4, `the card shows ${keys.length} issue chips — the brief is 2 to 4`);
  const HR1 = R("hr1-showcase.js");
  const omnibus = HR1.slice(HR1.indexOf("var OMNIBUS"), HR1.indexOf("var TIMELINE"));
  must(omnibus.length > 500, "hr1-showcase.js no longer declares OMNIBUS — the chip keys cannot be checked against the measure");
  const mapped = new Set();
  for (const m of omnibus.matchAll(/keys:\s*\[([^\]]*)\]/g)) {
    for (const k of m[1].matchAll(/'([a-z_]+)'/g)) mapped.add(k[1]);
  }
  must(mapped.size >= 5, `OMNIBUS parsed to ${mapped.size} keys, which is too few to be the real table`);
  for (const k of keys) {
    ok(mapped.has(k), `the chip "${k}" is not an issue H.R.1 maps to in hr1-showcase.js — Home would be teaching something the measure does not do`);
  }
  ok(new Set(keys).size === keys.length, "the card repeats an issue chip");

  // WHAT THE CARD MAY NOT SAY. No score, no party, no verdict.
  const text = card.replace(/<style>[\s\S]*?<\/style>/g, " ").replace(/<[^>]*>/g, " ");
  ok(!text.includes("%"), "the card prints a percentage — no figure here carries a depth marker or a denominator");
  for (const word of ["Republican", "Democrat", "GOP", "party", "R-", "D-"]) {
    ok(!text.includes(word), `the card says ${JSON.stringify(word)} — the chips name issues, not sides`);
  }
  for (const word of ["Direction Match", "kept", "broken", "score"]) {
    ok(!text.includes(word), `the card says ${JSON.stringify(word)} — a verdict belongs beside the member whose promise it was`);
  }
  // THE ONE SENTENCE IS THE CIVICS, and it does not claim a law is not a law.
  const lede = (card.match(/class="phc-lede"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
  ok(/not law by itself/.test(lede), "the card no longer teaches that a House-passed package is not law by itself");
  ok(/Senate/.test(lede) && /sign/.test(lede), "the sentence names the House but not what else it takes to become law");
  has(HR1, "Signed into law", "hr1-showcase.js no longer records the signature this sentence is careful about");

  // THE SHOWCASE IS STILL THE DEEP READ, AND THE CHIP STILL OPENS IT.
  has(INDEX, 'href="#hr1-showcase" class="pulse-chip"', "the Door 1 pulse chip for the showcase is gone");
  has(INDEX, "window.pdxOpenSurface = function", "index.html no longer publishes pdxOpenSurface, the one way in for an in-page jump");
  // The work-layer seam, taken from its own landmark: `window.pdxDoor` also
  // appears in five button onclicks ABOVE this block, so the slice has to start
  // at WORK_IDS and end at the close of the script that declares it.
  const seamAt = INDEX.indexOf("var WORK_IDS");
  must(seamAt > 0, "the Door 1 work-layer roster (WORK_IDS) was renamed");
  const door = INDEX.slice(seamAt, INDEX.indexOf("</script>", seamAt));
  has(door, "'hr1-showcase'", "hr1-showcase left the Door 1 work-layer roster");
  ok(/'hr1-showcase':\s*function\s*\(\)\s*\{[^}]*PDXHR1[^}]*mount/.test(door),
    "opening the showcase no longer paints it — the chip would open an empty layer, which is the bug the brief calls out");
  has(door, "openWork('hr1-showcase')", "pdxDoor no longer routes the bill lane to the showcase");
  has(R("door1-workspace.js"), "id: 'hr1-showcase'", "the workspace chip roster lost the showcase");
  // …and the showcase was NOT duplicated onto Home or folded into /library.
  // Counted with comments stripped: the note above hr1-showcase.js's include
  // quotes the tag it renders into, and a quotation is not a second room.
  const MARKUP = INDEX.replace(/<!--[\s\S]*?-->/g, "");
  ok((MARKUP.match(/<section id="hr1-showcase"/g) || []).length === 1,
    "there is more than one #hr1-showcase section on index.html — the showcase was duplicated rather than summarized");
  // /library may POINT at the showcase (its LANE table forwards the old hash
  // home), but it may not host it: folding the showcase into the archive is a
  // different decision, and not this pass's.
  const LIB = R("library.html");
  ok(!/<section id="hr1-showcase"/.test(LIB) && !LIB.includes("PDXHR1"),
    "the showcase was folded into /library — not this pass");
}

console.log("");
if (failures.length) {
  console.error(`✗ home hygiene: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ home hygiene: no source text in the body, no curator tools on the page at all, one H.R.1 card in the open — ${passed} assertions passed\n`);
