/**
 * test-macro-menu-insight.mjs — one bag, said once
 * ─────────────────────────────────────────────────────────────────────────────
 * The act face already shows the whole menu: fourteen mappings, fourteen rows,
 * none of them ranked. What it never said out loud is the thing that makes the
 * menu matter — that all fourteen went through on ONE roll call. A reader could
 * scroll the list and still come away thinking they were reading fourteen
 * decisions rather than one decision with fourteen consequences.
 *
 * That sentence is still on the face. What is gone is first the panel it used to
 * arrive in — a heading, three stat pills, a chip strip naming every topic again,
 * a grouping by area of the topic map — and now the section itself. Every topic in
 * that strip was already a row in the ledger immediately above it, in the same
 * order, so a reader met the same fourteen keys twice and had to work out which of
 * the two lists was the real one. Two renderings of one list is not twice the
 * information.
 *
 * The fact has moved to where the reader already is. The letterhead's teaching
 * line said one half of the doctrine — one recorded vote counts in full on every
 * topic below — and a screen further down a second block said the other half, that
 * the topics moved as one instrument and nobody voted on them singly. Two adjacent
 * halves of one idea, printed a scroll apart, read as the page explaining itself
 * twice. They are one sentence now, above the topic list, in the position the
 * first half already held.
 *
 * So this file guards a clause of the teaching line, and mostly guards it against
 * growing back into a panel:
 *
 *   1. IT IS PART OF ONE LINE, ABOVE THE LEDGER. No heading, no chips, no stat
 *      row, no area grouping, no section of its own — and it names no topic keys,
 *      because the doors are the ledger's rows and a second set of doors is a
 *      second list.
 *   2. IT COUNTS WHAT THE LEDGER COUNTS. Every number in the line is a number the
 *      face can back: the roll-call count it was handed, and nothing else. The
 *      size of the act is stated once, by the letterhead's tally.
 *   3. IT READS NO CURATION. It never touches isPrimary or weight, and the proof
 *      is behavioural: flip every flag on, off, or onto a different mapping and
 *      the rendered line does not move by one byte.
 *   4. IT RANKS NOTHING AND SAYS NOTHING THAT RANKS.
 *   5. THE WORDING FOLLOWS THE INSTRUMENT — one roll call, several, signed with
 *      no roll call on file, or still moving.
 *   6. IT DEGRADES HONESTLY. A one-topic measure gets no packaging clause at all,
 *      because a bag of one is not a bag.
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
  for (const f of [...ENGINE_FILES, "receipt-cards.js", "bill-detail.js"]) {
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

// The teaching line, cut out of the page so every check below is scoped to it —
// several claims ("names no topic", "no rank word") would be trivially
// satisfiable by a page that keeps the offending text one section lower.
const TEACH = '<p class="bd-lh-teach">';
const noteAt = HTML.indexOf(TEACH);
if (noteAt < 0) die("the teaching line is not on the act face at all");
const NOTE = HTML.slice(noteAt, HTML.indexOf("</p>", noteAt) + 4);
if (!/one instrument|roll call|one measure/.test(NOTE)) {
  die("the teaching line no longer says the topics travelled as one instrument");
}
const teachOf = (html) => {
  const i = html.indexOf(TEACH);
  return i < 0 ? "" : html.slice(i, html.indexOf("</p>", i) + 4);
};
const LEDGER = [...HTML.matchAll(/class="bd-omni-issue bd-omni-link" data-issue="([^"]+)"/g)].map((m) => m[1]);

console.log(`\n🎒 one bag, said once — H.R. 1: ${N} mappings on one instrument`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one line, above the full topic list, and only one topic list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ledgerAt = HTML.indexOf("Every topic this act touches");
  ok(ledgerAt >= 0 && noteAt < ledgerAt,
    "the teaching line is drawn after the topic list it is supposed to teach");
  const firstRow = HTML.indexOf('class="bd-omni-row');
  ok(firstRow > noteAt, "the teaching line is drawn inside or below the ledger");
  // ONE SURFACE. The second block is gone from the page and from the source, and
  // its clause exists in exactly one paragraph.
  hasNot(HTML, "bd-onebag", "the separate one-instrument section is back on the face");
  hasNot(SRC, "coTravelSection", "the deleted co-travel section is still in the source");
  eq((HTML.match(/class="bd-lh-teach"/g) || []).length, 1,
    "the teaching line is printed more than once");
  eq((HTML.match(/one instrument|no separate vote on any single topic/g) || []).length,
    (NOTE.match(/one instrument|no separate vote on any single topic/g) || []).length,
    "the one-instrument fact is stated somewhere else on the face as well");
  // It is an addition, not a replacement: the ledger is untouched underneath it.
  eq((HTML.match(/class="bd-omni-row/g) || []).length, N, "the ledger no longer renders one row per mapping");
  eq((HTML.match(/data-bd-view="all"/g) || []).length, 1, "the ledger no longer opens in the all-topics state");
  eq((HTML.match(/data-bd-lane="(?:main|other)"/g) || []).length, N, "the ledger's lane keys changed");

  // ONE LINE. Structurally: one paragraph, no heading, no list, no controls.
  eq((NOTE.match(/<p /g) || []).length, 1, "the note is more than one paragraph");
  ok(!NOTE.includes("<section"), "the note is a section again rather than a line");
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
  // The size of the act is stated ONCE, by the letterhead's tally, and the line
  // does not restate it — "The same 14 topics, one instrument" was a second claim
  // about a number the tally two lines above already owns, and a second claim is
  // a second thing that can drift.
  has(HTML, `${N} topics mapped`, "the letterhead's tally no longer states the size of the act");
  const topicNums = [...NOTE.replace(/<[^>]+>/g, " ").matchAll(/\b(\d+) (?:topics?|mappings?)\b/g)]
    .map((m) => Number(m[1]));
  eq(topicNums.length, 0,
    `the teaching line restates the size of the act: ${JSON.stringify(topicNums)}`);
  // Every number it does print is one it was handed: the roll-call count.
  const nums = [...NOTE.replace(/<[^>]+>/g, " ").matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  ok(nums.every((x) => x === BASE.rollcalls.length),
    `a number in the teaching line is not the roll-call count: ${JSON.stringify(nums)}`);
  // Any roll-call count it states is the roll-call count it was handed.
  has(NOTE, "One roll call decided every one of them", "a single-roll-call act does not say so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · it reads no curation — flags move, the line does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  const fn = SRC.slice(SRC.indexOf("function letterheadTeach"), SRC.indexOf("function letterheadHtml"));
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
    const line = teachOf(html);
    ok(line.length > 0, `${name}: the note vanished`);
    eq(line, NOTE, `${name}: the note changed`);
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
  const rules = [...styleBlock.matchAll(/'(\.bd-lh-teach[^']*)\{/g)].map((m) => m[1]);
  ok(rules.length > 0, "the note ships without styles");
  ok(!styleBlock.includes(".bd-onebag"), "the deleted section's styles are still shipping");
  ok(!rules.some((sel) => /nth-child|first-child|\[data-issue=/.test(sel)),
    `a style rule singles out part of the note: ${rules.join(" / ")}`);
  ok(!styleBlock.includes(".bd-bag-"), "the deleted panel's styles are still shipping");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the wording follows the instrument");
// ═════════════════════════════════════════════════════════════════════════════
{
  const three = await render(boot(), { ...BASE, rollcalls: [rc(1), rc(2), rc(3)] });
  has(teachOf(three), "3 recorded votes",
    "a multi-roll-call act does not say how many votes are on the record");
  has(teachOf(three), "Each of those roll calls decided every one of them at once",
    "a multi-roll-call act does not say each roll call carried the whole bag");
  const signed = await render(boot(), { ...BASE, rollcalls: [] });
  has(signed, "signed into law as one instrument", "the signed case does not state how the topics arrived");
  const signedNote = teachOf(signed);
  ok(!/roll call/.test(signedNote), "the signed case claims a roll call that is not in the record");
  const pending = await render(boot(), { ...BASE, measure: { ...MEASURE, status: "introduced" }, rollcalls: [] });
  has(pending, "They ride on one measure", "the pending case does not say the topics move together");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a bag of one is not a bag");
// ═════════════════════════════════════════════════════════════════════════════
{
  const one = await render(boot(), { ...BASE, issues: [ISSUES[0]] });
  const oneLine = teachOf(one);
  ok(!/one instrument|whole bill|one measure/.test(oneLine),
    "a single-topic measure grew a packaging clause about a bag of one");
  has(oneLine, "One recorded vote", "the single-topic measure lost the teaching line itself");
  has(one, "1 topic mapped", "the single-topic measure lost the letterhead's own plain tally");
  eq((one.match(/class="bd-omni-row/g) || []).length, 1, "the single-topic ledger changed");
  const none = await render(boot(), { ...BASE, issues: [] });
  ok(!/one instrument|whole bill/.test(teachOf(none)),
    "an unmapped measure grew a packaging clause");
  const two = await render(boot(), { ...BASE, issues: ISSUES.slice(0, 2) });
  has(teachOf(two), "no separate vote on any single topic",
    "a two-topic act should say the two travelled together with no vote on either alone");
  ok(!/\b2 topics\b/.test(teachOf(two)), "the two-topic line restates a count the tally owns");
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
  eq((SRC.match(/letterheadTeach\(/g) || []).length, 2, "the note is built or called from more than one place");
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
