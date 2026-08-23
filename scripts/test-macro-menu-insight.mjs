#!/usr/bin/env node
/**
 * test-macro-menu-insight.mjs — one bag, shown as one bag
 * ─────────────────────────────────────────────────────────────────────────────
 * The act face already shows the whole menu: fourteen mappings, fourteen rows,
 * none of them ranked. What it never said out loud is the thing that makes the
 * menu matter — that all fourteen went through on ONE roll call. A reader could
 * scroll the list and still come away thinking they were reading fourteen
 * decisions rather than one decision with fourteen consequences.
 *
 * This file guards the panel that says it. The danger in a panel like this is
 * that "how it was packaged" quietly becomes "what it was really about", so the
 * assertions here are mostly about what the insight is NOT allowed to become:
 *
 *   1. IT IS THE SAME LIST. Every topic in the bag is a topic already on the
 *      face, in the same order, and the count it prints is the ledger's own row
 *      count. A panel that says "12 topics" under a 14-row list is a new and
 *      quieter way of dropping two.
 *   2. IT READS NO CURATION. The panel never touches isPrimary or weight, and
 *      the proof is behavioural: flip every flag on, off, or onto a different
 *      mapping and the rendered panel does not move by one byte.
 *   3. IT RANKS NOTHING. No chip is styled, badged or worded differently from
 *      any other; no rank vocabulary appears anywhere in the panel; the topic
 *      areas are printed in the taxonomy's own order rather than by size.
 *   4. IT CHANGES NOTHING IT SITS NEXT TO. The ledger's default view, its lane
 *      keys, its row count and its filter are all exactly as they were, and the
 *      panel computes no score of any kind.
 *   5. IT DEGRADES HONESTLY. A one-topic measure gets no bag panel at all,
 *      because a bag of one is not a bag and the ledger already says so.
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

// The bag panel, cut out of the page so every check below is scoped to it.
const bagAt = HTML.indexOf('<section class="bd-sec bd-bag">');
if (bagAt < 0) die("the co-travel panel is not on the act face at all");
const BAG = HTML.slice(bagAt, HTML.indexOf("</section>", bagAt) + 10);
const CHIPS = [...BAG.matchAll(/class="bd-bag-chip" data-issue="([^"]+)"/g)].map((m) => m[1]);
const LEDGER = [...HTML.matchAll(/class="bd-omni-issue bd-omni-link" data-issue="([^"]+)"/g)].map((m) => m[1]);

console.log(`\n🎒 macro menu insight — H.R. 1: ${N} mappings on one instrument`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the panel is there, and it is after the full topic list");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(BAG, "Topics that shared this vote", "the panel does not name what it is showing");
  const ledgerAt = HTML.indexOf("Every topic this act touches");
  ok(ledgerAt >= 0 && ledgerAt < bagAt, "the bag panel is drawn before the full topic list it summarises");
  const lastRow = HTML.lastIndexOf('class="bd-omni-row');
  ok(lastRow < bagAt, "the bag panel is drawn inside or above the ledger instead of after it");
  // It is an addition, not a replacement: the ledger is untouched underneath it.
  eq((HTML.match(/class="bd-omni-row/g) || []).length, N, "the ledger no longer renders one row per mapping");
  eq((HTML.match(/data-bd-view="all"/g) || []).length, 1, "the ledger no longer opens in the all-topics state");
  eq((HTML.match(/data-bd-lane="(?:main|other)"/g) || []).length, N, "the ledger's lane keys changed");
  hasNot(BAG, "data-bd-lane", "the bag chips carry the ledger's filter key, so a slice could hide them");
  hasNot(BAG, "data-bd-view", "the bag panel is wired into the ledger's view filter");
  hasNot(BAG, "bd-omni-row", "the bag panel is re-rendering ledger rows instead of summarising them");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · co-travel completeness — the bag is exactly the mapping set");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(CHIPS.length, N, `the bag lists all ${N} mapped topics`);
  eq(LEDGER.length, N, "the ledger row count could not be read back");
  eq(JSON.stringify(CHIPS), JSON.stringify(LEDGER),
    "the bag and the ledger disagree about which topics this act carries, or about their order");
  eq(new Set(CHIPS).size, CHIPS.length, "a topic appears twice in the bag");
  const mapped = new Set(ISSUES.map((i) => i.issueKey));
  ok(CHIPS.every((k) => mapped.has(k)), "the bag invented a topic that is not one of this act's mappings");
  ok([...mapped].every((k) => CHIPS.includes(k)), "a mapped topic is missing from the bag");
  ok(CHIPS.every((k) => !!(B.win.ISSUE_MAP || {})[k]), "the bag prints a key the shipped taxonomy does not know");
  // Every count the panel states is the same count, and it is the ledger's.
  has(BAG, `All <strong>${N} topics</strong> listed above`, "the lead does not state the size of the bag");
  has(BAG, `📦 ${N} topics on this instrument`, "the bag-size chip does not state the size of the bag");
  has(BAG, `1 roll call on all ${N}`, "the roll-call fact does not say the vote covered every topic");
  has(BAG, `same ${N} mappings as the list above`, "the panel does not admit it is the same list");
  has(HTML, `mapped to <strong>${N} topics</strong>`, "the ledger's own count changed");
  const numbers = [...BAG.replace(/<[^>]+>/g, " ").matchAll(/\b(\d+) (?:topics?|mappings?)\b/g)]
    .map((m) => Number(m[1]));
  ok(numbers.length >= 3 && numbers.every((x) => x === N),
    `a number in the panel claims a different-sized act: ${JSON.stringify(numbers)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the panel reads no curation — flags move, the panel does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  const fn = SRC.slice(SRC.indexOf("function coTravelSection"), SRC.indexOf("function rollcallsSection"));
  ok(fn.length > 400, "the panel's source could not be located");
  const code = fn.replace(/\/\/.*$/gm, "");
  for (const w of ["isPrimary", "weight", "score", "_measureComponentBreakdown", "supportMeaning"]) {
    ok(!code.includes(w), `the panel reads ${w} — it is supposed to know only which topics travelled together`);
  }
  ok(!/\.sort\(/.test(code), "the panel sorts the list itself instead of taking the shared Big Picture order");
  // The behavioural proof: the same mappings with the flags rearranged render the
  // same panel, byte for byte.
  const variants = [
    ["every mapping flagged", ISSUES.map((i) => ({ ...i, isPrimary: true }))],
    ["no mapping flagged", ISSUES.map((i) => ({ ...i, isPrimary: false }))],
    ["the flag moved to the last mapping", ISSUES.map((i, idx) => ({ ...i, isPrimary: idx === N - 1 }))],
    ["the weights inverted", ISSUES.map((i, idx) => ({ ...i, weight: idx }))],
  ];
  for (const [name, issues] of variants) {
    const b = boot();
    const html = await render(b, { ...BASE, issues });
    const at = html.indexOf('<section class="bd-sec bd-bag">');
    ok(at >= 0, `${name}: the bag panel vanished`);
    eq(html.slice(at, html.indexOf("</section>", at) + 10), BAG, `${name}: the bag panel changed`);
  }
  // And nothing was written back into the data on the way through.
  eq(JSON.stringify(BASE), FROZEN, "rendering the panel mutated the mappings it was handed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it ranks nothing, and it says nothing that ranks");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of ["primary", "Primary", "secondary", "Secondary", "supporting", "Supporting",
                   "cargo", "lesser", "minor", "footnote", "headline topic", "core topic",
                   "sideshow", "rider", "the real subject", "mainly about", "chiefly"]) {
    hasNot(BAG, w, `the bag panel calls part of the act ${JSON.stringify(w)}`);
  }
  ok(!/\bmain\b/i.test(BAG), "the bag panel names a main topic");
  ok(!/Republican|Democrat|\bGOP\b|party/i.test(BAG), "the bag panel brings party into a packaging fact");
  // Every chip is the same chip: one class, no modifier, no badge, no per-topic
  // annotation that could be read as a rank.
  const chipTags = [...BAG.matchAll(/<button[^>]*class="([^"]*)"/g)].map((m) => m[1]);
  eq(new Set(chipTags).size, 1, `the chips are not all the same element: ${[...new Set(chipTags)].join(" / ")}`);
  eq(chipTags.length, N, "some topics in the bag are not rendered as chips");
  hasNot(BAG, "bd-eff", "the bag repeats the per-topic direction, which belongs to the ledger row");
  hasNot(BAG, "bd-v-", "the bag carries a verdict");
  // No style rule singles a chip out.
  const styleBlock = SRC.slice(SRC.indexOf("function injectCss"));
  const chipRules = [...styleBlock.matchAll(/'(\.bd-bag[^']*)\{/g)].map((m) => m[1]);
  ok(chipRules.length > 0, "the bag panel ships without styles");
  ok(!chipRules.some((sel) => /nth-child|first-child|\[data-issue=/.test(sel)),
    `a style rule singles out one topic in the bag: ${chipRules.join(" / ")}`);
  // The panel says outright that it is not a ranking.
  has(BAG, "Nothing here is a ranking", "the panel does not disclaim the reading it invites");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the packaging facts reconcile, and the areas are taxonomy order");
// ═════════════════════════════════════════════════════════════════════════════
{
  const areas = [...BAG.matchAll(/class="bd-bag-area">([^<]*)<b>(\d+)<\/b>/g)]
    .map((m) => ({ label: m[1].trim(), n: Number(m[2]) }));
  ok(areas.length > 1, `H.R. 1 should span more than one area of the topic map (${areas.length})`);
  eq(areas.reduce((a, x) => a + x.n, 0), N, "the area counts do not add up to the size of the bag");
  has(BAG, `🗂 ${areas.length} area`, "the stat row and the area list disagree about how many areas there are");
  // Independently recomputed: category index of each area, in the order printed.
  const cats = B.win._pdxIssueCategories();
  const rankOf = (key) => cats.findIndex((c) => c.key === B.win._pdxIssueCatOf(key));
  const printedRanks = [];
  const seen = new Set();
  for (const k of CHIPS) {
    const r = rankOf(k);
    if (!seen.has(r)) { seen.add(r); printedRanks.push(r); }
  }
  eq(printedRanks.length, areas.length, "the panel groups the bag into a different number of areas than the taxonomy does");
  eq(JSON.stringify(printedRanks), JSON.stringify([...printedRanks].sort((a, b) => a - b)),
    "the areas are not in the shipped taxonomy's own order");
  ok(printedRanks.every((r) => r >= 0), "an area was printed for a category the taxonomy does not have");
  // Explicitly NOT by size — that would be a ranking of the act's subjects.
  const bySize = [...areas].sort((a, b) => b.n - a.n).map((a) => a.label);
  ok(areas.length < 3 || JSON.stringify(areas.map((a) => a.label)) !== JSON.stringify(bySize),
    "the areas happen to be in descending size order — check the sort, that is a ranking");
  has(BAG, "a bigger group means more mappings landed in it", "the panel does not say what a big group is and is not");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the wording follows the instrument, and every chip is a door");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Each chip uses the delegated issue handler the rest of the panel uses, so a
  // topic in the bag opens the same dossier a ledger row opens.
  has(SRC, "closest('[data-issue]')", "the panel's issue handler is gone");
  eq((BAG.match(/data-issue="/g) || []).length, N, "not every chip in the bag is a link into its topic");
  // Wording cases, all from the data already on the page.
  const one = BAG;
  has(one, "One roll call decided every one of them", "a single-roll-call act does not say so");
  const three = await render(boot(), { ...BASE, rollcalls: [rc(1), rc(2), rc(3)] });
  has(three, "Topics that shared this vote", "a multi-roll-call act loses the vote wording");
  has(three, "3 roll calls each decided every one of them at once", "a multi-roll-call act does not say how many carried the bag");
  has(three, `3 roll calls, each on all ${N}`, "the stat row does not scale to several roll calls");
  const signed = await render(boot(), { ...BASE, rollcalls: [] });
  has(signed, "Topics that shared this act", "an enacted instrument with no roll call on file does not say 'act'");
  has(signed, "signed into law as one instrument", "the signed case does not state how the topics arrived");
  ok(!/roll call/.test(signed.slice(signed.indexOf('<section class="bd-sec bd-bag">'),
    signed.indexOf("</section>", signed.indexOf('<section class="bd-sec bd-bag">')))),
    "the signed case claims a roll call that is not in the record");
  const pending = await render(boot(), { ...BASE, measure: { ...MEASURE, status: "introduced" }, rollcalls: [] });
  has(pending, "Topics that shared this measure", "a measure with no vote yet is called something it is not");
  has(pending, "They ride on one measure", "the pending case does not say the topics move together");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · a bag of one is not a bag");
// ═════════════════════════════════════════════════════════════════════════════
{
  const one = await render(boot(), { ...BASE, issues: [ISSUES[0]] });
  hasNot(one, "bd-bag", "a single-topic measure grew a co-travel panel");
  has(one, "mapped to one topic", "the single-topic measure lost the ledger's own plain sentence");
  eq((one.match(/class="bd-omni-row/g) || []).length, 1, "the single-topic ledger changed");
  const none = await render(boot(), { ...BASE, issues: [] });
  hasNot(none, "bd-bag", "an unmapped measure grew a co-travel panel");
  const two = await render(boot(), { ...BASE, issues: ISSUES.slice(0, 2) });
  has(two, "bd-bag", "a two-topic act should say the two travelled together");
  eq((two.match(/class="bd-bag-chip"/g) || []).length, 2, "the two-topic bag does not hold exactly two topics");
  has(two, "All <strong>2 topics</strong>", "the two-topic bag miscounts itself");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing next to it moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The ledger, its filter and the jump chips are all exactly as the neighbouring
  // suites pin them — this section is the local canary for that, so a change here
  // fails in the file that made it rather than three files away.
  eq((HTML.match(/class="bd-person bd-issuejump"/g) || []).length, N, "the explore chips changed count");
  eq((HTML.match(/data-bd-view-set="[a-z]+"/g) || []).length, 3, "the ledger's view control changed shape");
  has(HTML, 'data-bd-view-set="all" aria-pressed="true"', "the ledger no longer opens on all topics");
  eq((HTML.match(/class="bd-omni-head"/g) || []).length, N, "the ledger rows changed structure");
  // The panel is presentation with no engine underneath: it appears in exactly one
  // file, is called from exactly one place, and nothing else renders a bag.
  eq((SRC.match(/coTravelSection\(/g) || []).length, 2, "the bag panel is built or called from more than one place");
  for (const f of ["digital-library.js", "spotlight-hub.js", "profiles-full.js", "exec-record-ui.js", "consistency.js"]) {
    ok(!readFileSync(join(ROOT, f), "utf8").includes("bd-bag"),
      `${f} has grown its own copy of the bag panel`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ macro menu insight: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ macro menu insight: all ${passed} assertions passed — ${N} topics, one instrument, nothing demoted to make the point\n`);
