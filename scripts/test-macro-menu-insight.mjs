/**
 * test-macro-menu-insight.mjs — one bag, said once
 * ─────────────────────────────────────────────────────────────────────────────
 * The act face already shows the whole menu: fourteen mappings, fourteen rows,
 * none of them ranked. What it never said out loud is the thing that makes the
 * menu matter — that all fourteen went through on ONE roll call. A reader could
 * scroll the list and still come away thinking they were reading fourteen
 * decisions rather than one decision with fourteen consequences.
 *
 * That sentence is still on the face. What is gone is the panel it used to
 * arrive in: a heading, three stat pills, a chip strip naming every topic again,
 * a grouping by area of the topic map, and a paragraph disclaiming the ranking
 * the grouping invited. Every topic in that strip was already a row in the
 * ledger immediately above it, in the same order — so a reader met the same
 * fourteen keys twice and had to work out which of the two lists was the real
 * one. Two renderings of one list is not twice the information.
 *
 * So this file now guards a single line, and mostly guards it against growing
 * back into a panel:
 *
 *   1. IT IS ONE LINE, UNDER THE LEDGER. No heading, no chips, no stat row, no
 *      area grouping — and it names no topic keys, because the doors are the
 *      ledger's rows and a second set of doors is a second list.
 *   2. IT COUNTS WHAT THE LEDGER COUNTS. The number it states is the ledger's
 *      own row count. A line that says "12 topics" under a 14-row list is a new
 *      and quieter way of dropping two.
 *   3. IT READS NO CURATION. It never touches isPrimary or weight, and the proof
 *      is behavioural: flip every flag on, off, or onto a different mapping and
 *      the rendered line does not move by one byte.
 *   4. IT RANKS NOTHING AND SAYS NOTHING THAT RANKS.
 *   5. THE WORDING FOLLOWS THE INSTRUMENT — one roll call, several, signed with
 *      no roll call on file, or still moving.
 *   6. IT DEGRADES HONESTLY. A one-topic measure gets no line at all, because a
 *      bag of one is not a bag and the ledger already says so.
 *
 *   node scripts/test-macro-menu-insight.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "bill-detail.js"), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`✗ macro menu insight: ${msg}`); process.exit(1); };

// ── the fixture: H.R. 1, the real curated mappings ────────────────────────────
const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));
const HR1 = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
if (!HR1 || !HR1.issues || HR1.issues.length < 9) die("the H.R. 1 seed is missing or too small to be a bag");
const ISSUES = HR1.issues.map((m) => ({
  issueKey: m.issueKey,
  supportMeaning: m.direction === "opposes" ? "yea_opposes" : "yea_supports",
  isPrimary: !!m.isPrimary,
  weight: m.weight,
  rationale: m.rationale || "",
}));
const N = ISSUES.length;
const MEASURE = {
  id: 1, number: "H.R. 1", congress: 119, chamber: "house", status: "enacted",
  title: "One Big Beautiful Bill Act",
  source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1", label: "Congress.gov" },
};
const rc = (id) => ({
  id, chamber: "house", question: "On Passage", result: "passed", voteDate: "2025-07-03",
  totals: { yea: 218, nay: 214 }, votes: [], source: { url: "https://clerk.house.gov/x", label: "Clerk" },
});

function boot() {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "bill-detail.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXBillDetail) die("PDXBillDetail is unavailable");
  return { win, capture };
}
async function render(b, data) {
  b.win.PDXBills = {
    get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }), isFollowed: () => false,
  };
  b.win.PDXBillDetail.open(1);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return b.capture.innerHTML;
}
const BASE = { measure: MEASURE, issues: ISSUES, rollcalls: [rc(9001)], positions: [], provisions: [], actions: [] };
const FROZEN = JSON.stringify(BASE);

const B = boot();
const HTML = await render(B, BASE);
if (!HTML || HTML.length < 2000) die(`the act face rendered ${HTML.length} characters`);

// The one-instrument note, cut out of the page so every check below is scoped
// to it — several claims ("names no topic", "no rank word") would be trivially
// satisfiable by a page that keeps the offending text one section lower.
const noteAt = HTML.indexOf('<section class="bd-sec bd-onebag">');
if (noteAt < 0) die("the one-instrument note is not on the act face at all");
const NOTE = HTML.slice(noteAt, HTML.indexOf("</section>", noteAt) + 10);
const LEDGER = [...HTML.matchAll(/class="bd-omni-issue bd-omni-link" data-issue="([^"]+)"/g)].map((m) => m[1]);

console.log(`\n🎒 one bag, said once — H.R. 1: ${N} mappings on one instrument`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one line, after the full topic list, and only one topic list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ledgerAt = HTML.indexOf("Every topic this act touches");
  ok(ledgerAt >= 0 && ledgerAt < noteAt, "the note is drawn before the topic ledger it qualifies");
  const lastRow = HTML.lastIndexOf('class="bd-omni-row');
  ok(lastRow < noteAt, "the note is drawn inside or above the ledger instead of after it");
  // It is an addition, not a replacement: the ledger is untouched underneath it.
  eq((HTML.match(/class="bd-omni-row/g) || []).length, N, "the ledger no longer renders one row per mapping");
  eq((HTML.match(/data-bd-view="all"/g) || []).length, 1, "the ledger no longer opens in the all-topics state");
  eq((HTML.match(/data-bd-lane="(?:main|other)"/g) || []).length, N, "the ledger's lane keys changed");

  // ONE LINE. Structurally: one paragraph, no heading, no list, no controls.
  eq((NOTE.match(/<p /g) || []).length, 1, "the note is more than one paragraph");
  hasNot(NOTE, "<h3", "the note grew a heading again, which is what made it read as a second panel");
  hasNot(NOTE, "<button", "the note grew controls again");
  hasNot(NOTE, "<ul", "the note grew a list");

  // AND IT NAMES NO TOPIC. The ledger's rows are the doors; a second set of
  // doors is the duplicate list this pass deleted.
  hasNot(NOTE, "data-issue", "the note is printing topic doors again — that is the second list, back");
  eq(LEDGER.length, N, "the ledger row count could not be read back");
  for (const k of LEDGER) hasNot(NOTE, k, `the note names ${k}, so the topic list is on the face twice`);
  for (const cls of ["bd-bag-chip", "bd-bag-strip", "bd-bag-stat", "bd-bag-area", "bd-bag-note", "bd-omni-row"]) {
    hasNot(NOTE, cls, `the note is rebuilding ${cls} — the panel is growing back`);
  }
  // Nothing anywhere on the face still renders the old panel.
  hasNot(HTML, "bd-bag", "the old co-travel panel is still being rendered somewhere");
  hasNot(HTML, "Topics that shared this", "the old panel's heading is still on the face");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · it counts what the ledger counts");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(NOTE, `The same ${N} topics, one instrument.`, "the note does not state the size of the bag");
  has(HTML, `mapped to <strong>${N} topics</strong>`, "the ledger's own count changed");
  const numbers = [...NOTE.replace(/<[^>]+>/g, " ").matchAll(/\b(\d+) (?:topics?|mappings?)\b/g)]
    .map((m) => Number(m[1]));
  ok(numbers.length >= 1 && numbers.every((x) => x === N),
    `a number in the note claims a different-sized act: ${JSON.stringify(numbers)}`);
  // Any roll-call count it states is the roll-call count it was handed.
  has(NOTE, "One roll call decided every one of them", "a single-roll-call act does not say so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · it reads no curation — flags move, the line does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  const fn = SRC.slice(SRC.indexOf("function coTravelSection"), SRC.indexOf("  var POS_SLOTS"));
  ok(fn.length > 400, "the note's source could not be located");
  const code = fn.replace(/\/\/.*$/gm, "");
  for (const w of ["isPrimary", "weight", "score", "_measureComponentBreakdown", "supportMeaning"]) {
    ok(!code.includes(w), `the note reads ${w} — it is supposed to know only that the topics travelled together`);
  }
  ok(!/\.sort\(/.test(code), "the note sorts the mappings itself");
  // The behavioural proof: the same mappings with the flags rearranged render the
  // same line, byte for byte.
  const variants = [
    ["every mapping flagged", ISSUES.map((i) => ({ ...i, isPrimary: true }))],
    ["no mapping flagged", ISSUES.map((i) => ({ ...i, isPrimary: false }))],
    ["the flag moved to the last mapping", ISSUES.map((i, idx) => ({ ...i, isPrimary: idx === N - 1 }))],
    ["the weights inverted", ISSUES.map((i, idx) => ({ ...i, weight: idx }))],
  ];
  for (const [name, issues] of variants) {
    const b = boot();
    const html = await render(b, { ...BASE, issues });
    const at = html.indexOf('<section class="bd-sec bd-onebag">');
    ok(at >= 0, `${name}: the note vanished`);
    eq(html.slice(at, html.indexOf("</section>", at) + 10), NOTE, `${name}: the note changed`);
  }
  // And nothing was written back into the data on the way through.
  eq(JSON.stringify(BASE), FROZEN, "rendering the note mutated the mappings it was handed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it ranks nothing, and it says nothing that ranks");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of ["primary", "Primary", "secondary", "Secondary", "supporting", "Supporting",
                   "cargo", "lesser", "minor", "footnote", "headline topic", "core topic",
                   "sideshow", "rider", "the real subject", "mainly about", "chiefly"]) {
    hasNot(NOTE, w, `the note calls part of the act ${JSON.stringify(w)}`);
  }
  ok(!/\bmain\b/i.test(NOTE), "the note names a main topic");
  ok(!/Republican|Democrat|\bGOP\b|party/i.test(NOTE), "the note brings party into a packaging fact");
  ok(!/\d\s*%/.test(NOTE), "there is a percentage on the bill face");
  // Its styles cannot single a topic out either, because it has no per-topic
  // element left to single out.
  const styleBlock = SRC.slice(SRC.indexOf("function injectCss"));
  const rules = [...styleBlock.matchAll(/'(\.bd-onebag[^']*)\{/g)].map((m) => m[1]);
  ok(rules.length > 0, "the note ships without styles");
  ok(!rules.some((sel) => /nth-child|first-child|\[data-issue=/.test(sel)),
    `a style rule singles out part of the note: ${rules.join(" / ")}`);
  ok(!styleBlock.includes(".bd-bag-"), "the deleted panel's styles are still shipping");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the wording follows the instrument");
// ═════════════════════════════════════════════════════════════════════════════
{
  const three = await render(boot(), { ...BASE, rollcalls: [rc(1), rc(2), rc(3)] });
  has(three, "3 roll calls each decided every one of them at once",
    "a multi-roll-call act does not say how many carried the bag");
  const signed = await render(boot(), { ...BASE, rollcalls: [] });
  has(signed, "signed into law as one instrument", "the signed case does not state how the topics arrived");
  const signedNote = signed.slice(signed.indexOf('<section class="bd-sec bd-onebag">'),
    signed.indexOf("</section>", signed.indexOf('<section class="bd-sec bd-onebag">')));
  ok(!/roll call/.test(signedNote), "the signed case claims a roll call that is not in the record");
  const pending = await render(boot(), { ...BASE, measure: { ...MEASURE, status: "introduced" }, rollcalls: [] });
  has(pending, "They ride on one measure", "the pending case does not say the topics move together");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a bag of one is not a bag");
// ═════════════════════════════════════════════════════════════════════════════
{
  const one = await render(boot(), { ...BASE, issues: [ISSUES[0]] });
  hasNot(one, "bd-onebag", "a single-topic measure grew a one-instrument note");
  has(one, "mapped to one topic", "the single-topic measure lost the ledger's own plain sentence");
  eq((one.match(/class="bd-omni-row/g) || []).length, 1, "the single-topic ledger changed");
  const none = await render(boot(), { ...BASE, issues: [] });
  hasNot(none, "bd-onebag", "an unmapped measure grew a one-instrument note");
  const two = await render(boot(), { ...BASE, issues: ISSUES.slice(0, 2) });
  has(two, "bd-onebag", "a two-topic act should say the two travelled together");
  has(two, "The same 2 topics, one instrument.", "the two-topic note miscounts itself");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing next to it moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The ledger, its filter and the jump chips are all exactly as the neighbouring
  // suites pin them — this section is the local canary for that, so a change here
  // fails in the file that made it rather than three files away.
  eq((HTML.match(/class="bd-person bd-issuejump"/g) || []).length, N, "the explore chips changed count");
  eq((HTML.match(/data-bd-view-set="[a-z]+"/g) || []).length, 3, "the ledger's view control changed shape");
  has(HTML, 'data-bd-view-set="all" aria-pressed="true"', "the ledger no longer opens on all topics");
  eq((HTML.match(/class="bd-omni-head"/g) || []).length, N, "the ledger rows changed structure");
  // The note is presentation with no engine underneath: it appears in exactly one
  // file, is called from exactly one place, and nothing else renders it.
  eq((SRC.match(/coTravelSection\(/g) || []).length, 2, "the note is built or called from more than one place");
  for (const f of ["digital-library.js", "spotlight-hub.js", "profiles-full.js", "exec-record-ui.js", "consistency.js"]) {
    const other = readFileSync(join(ROOT, f), "utf8");
    ok(!other.includes("bd-bag") && !other.includes("bd-onebag"),
      `${f} has grown its own copy of the co-travel note`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ one bag, said once: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ one bag, said once: all ${passed} assertions passed — ${N} topics, one instrument, said in one line and listed once\n`);
