#!/usr/bin/env node
/**
 * test-big-picture-surfaces.mjs — the act keeps its whole topic list everywhere
 * ─────────────────────────────────────────────────────────────────────────────
 * scripts/test-big-picture-ledger.mjs pins the BILL PAGE: fourteen mappings in,
 * fourteen rows out, no fold, no crown. That page was never the problem on its
 * own. The problem is that a reader does not stay on it. They follow the act to
 * a member's vote, from there to the record card, from there to the profile
 * highlight, and they meet the same act again on the library shelf and in the
 * search box — and every one of those surfaces used to redraw the act SMALLER
 * than its own page had just drawn it:
 *
 *   · the record card printed all the topics, but in the scoring path's order —
 *     is_primary first, then weight descending — and captioned its verdict badge
 *     "this bill's main issue", then "(1 of 5 topics this vote touched)";
 *   · the profile highlight named the flagged topic and folded the other four
 *     into a grey "+4 more";
 *   · the library card ordered the flagged topic first, drew it as a filled chip,
 *     cut the row at eight and rolled the rest into "+N more";
 *   · the search result named three topics and stopped;
 *   · the record card's "Stated stance" line quoted one topic — chosen by the
 *     flag — out of however many the member had actually spoken on.
 *
 * None of that is a scoring decision. It is the scoring flag leaking into what a
 * citizen is allowed to see, on every surface except the one that had been fixed.
 * This file is the sibling guard: it renders the SAME multi-topic act through the
 * shipped functions on each of those surfaces and asserts the whole list survives.
 *
 * The fixture is H.R. 1's real curated mappings out of db/exec-action-seed.json,
 * so the counts move when the curation moves.
 *
 *   node scripts/test-big-picture-surfaces.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);

// ── the fixture ───────────────────────────────────────────────────────────────
const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));
const HR1 = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
if (!HR1 || !HR1.issues || HR1.issues.length < 9) {
  console.error("✗ big-picture surfaces: the H.R. 1 seed is missing or too small to probe a fold");
  process.exit(1);
}
// measure→issue `direction` in the seed, said in the vocabulary a roll call speaks.
const MAPPINGS = HR1.issues.map((m) => ({
  issueKey: m.issueKey,
  supportMeaning: m.direction === "opposes" ? "yea_opposes" : "yea_supports",
  isPrimary: !!m.isPrimary,
  weight: typeof m.weight === "number" ? m.weight : 100,
}));
const N = MAPPINGS.length;
const KEYS = MAPPINGS.map((m) => m.issueKey);

const ITEM = {
  kind: "vote", rollcallId: 9001, measureId: 1, number: "H.R. 1", date: "2025-07-03",
  action: "On Passage", position: "yea", isProcedural: false, isOmnibus: true,
  title: "One Big Beautiful Bill Act",
  issues: MAPPINGS,
  source: { url: "https://clerk.house.gov/Votes/2025190", label: "Clerk of the House" },
};

// ── boot the shipped surfaces ─────────────────────────────────────────────────
const win = makeSandbox();
const ctx = vm.createContext(win);
for (const f of [...ENGINE_FILES, "voting-record.js", "profiles-full.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
}
const W = ctx.window;
for (const fn of ["_pdxBigPictureOrder", "_pdxBigPictureKeys", "_vrCardHtml",
                  "_pdxVoteHighlightCard", "_measureComponentBreakdown"]) {
  if (typeof W[fn] !== "function") {
    console.error(`✗ big-picture surfaces: window.${fn} is missing — nothing below can be checked`);
    process.exit(1);
  }
}
const label = (k) => (typeof W._issueLabel === "function" ? (W._issueLabel(k) || k) : k);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

console.log("\n🗺  big-picture surfaces — the act stays whole after the bill page");
ok(N > 8, `fixture drift: H.R. 1 now carries ${N} mappings, which no longer exceeds the old eight-chip cut`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one shared order, and it cannot read the flag");
// ═════════════════════════════════════════════════════════════════════════════
// Every surface below sorts through this one function. If it ever learns to look
// at is_primary or weight, all of them regress at once — so it is pinned here by
// the only test that actually proves indifference: feed it the same list twice
// with the flags and weights inverted and demand the identical answer.
{
  const a = W._pdxBigPictureOrder(MAPPINGS, { labelFn: label }).map((m) => m.issueKey);
  const flipped = MAPPINGS.map((m) => ({ ...m, isPrimary: !m.isPrimary, weight: 200 - m.weight }));
  const b = W._pdxBigPictureOrder(flipped, { labelFn: label }).map((m) => m.issueKey);
  eq(a.length, N, "the shared order dropped or duplicated a mapping");
  eq(JSON.stringify(a), JSON.stringify(b),
    "the shared Big Picture order changes when is_primary and weight change — it is reading the flag");
  eq(JSON.stringify([...a].sort()), JSON.stringify([...KEYS].sort()),
    "the shared order returned a different set of topics than it was given");
  // And it is not the scoring path's order, which is the thing it exists to replace.
  const byScore = [...MAPPINGS]
    .sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary) || y.weight - x.weight)
    .map((m) => m.issueKey);
  ok(JSON.stringify(a) !== JSON.stringify(byScore),
    "the shared order is identical to the primary-then-weight score sort");
  // Stable: same input, same answer, so two surfaces never disagree about the act.
  eq(JSON.stringify(W._pdxBigPictureKeys(KEYS, { labelFn: label })), JSON.stringify(a),
    "the keys flavour and the mappings flavour of the shared order disagree");
  // The score path itself is untouched — this is a fork, not a rewrite.
  const brk = W._measureComponentBreakdown(ITEM, {}, { labelFn: label });
  eq(JSON.stringify(brk.components.map((c) => c.issueKey)), JSON.stringify(byScore),
    "_measureComponentBreakdown no longer returns the score order — the engine sort was changed, not forked");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the record card: every topic, no crown, no ordinal");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A stance on exactly two of the act's topics, so the "stated stance" line has
  // more than one thing to say and the old issues[0]-only version would show one.
  const posMap = { [KEYS[0]]: { stance: "support" }, [KEYS[N - 1]]: { stance: "oppose" } };
  const card = W._vrCardHtml(ITEM, posMap);
  ok(card.length > 500, "the record card rendered nothing worth checking");

  for (const k of KEYS) has(card, esc(label(k)), `${k} is on this vote but not on its record card`);
  eq((card.match(/class="vr-omni-row"/g) || []).length, N,
    "the record card is not giving every mapped topic its own effect row");

  // The order is the shared one, on both layers of the card.
  const rows = [...card.matchAll(/<span class="vr-omni-issue">([^<]*)<\/span>/g)].map((m) => m[1]);
  const want = W._pdxBigPictureOrder(MAPPINGS, { labelFn: label }).map((m) => esc(label(m.issueKey)));
  eq(JSON.stringify(rows), JSON.stringify(want),
    "the record card's per-topic rows are not in the shared Big Picture order");
  const touched = (card.match(/This vote touched: ([\s\S]*?)<\/p>/) || [])[1] || "";
  const named = [...touched.matchAll(/<b>([^<]*)<\/b>/g)].map((m) => m[1]);
  eq(JSON.stringify(named), JSON.stringify(want),
    "the 'this vote touched' line and the rows below it disagree about the act");

  // The two claims the badge used to make about the other topics.
  hasNot(card, "main issue", "the record card still calls one of the act's topics its main issue");
  ok(!/\b1 of \d+ topics/.test(card),
    "the record card still ranks its topics as '1 of N' — an ordinal is a ranking");
  has(card, `all ${N} topics are judged below`,
    "the verdict badge does not disclose how many topics sit under it");

  // The stated-stance line covers every topic the member has spoken on, not the
  // one the flag happened to sit on.
  const note = (card.match(/<div class="vr-stance-note">([\s\S]*?)<\/div>/) || [])[1] || "";
  ok(note, "the record card printed no stated-stance line for a member who has two stances on this act");
  has(note, esc(label(KEYS[0])), "a stated stance on this act is missing from the note");
  has(note, esc(label(KEYS[N - 1])), "the second stated stance on this act is missing from the note");
  has(note, "Stated stances:", "two stances are announced with the singular label");
  // One stance → the singular sentence, unchanged.
  const one = W._vrCardHtml(ITEM, { [KEYS[0]]: { stance: "support" } });
  has(one, "Stated stance: ", "a single stance no longer reads as one plain sentence");
  hasNot(one, "Stated stances:", "one stance is announced in the plural");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the profile highlight: no '+N more'");
// ═════════════════════════════════════════════════════════════════════════════
{
  const hi = W._pdxVoteHighlightCard(ITEM, { [KEYS[0]]: { stance: "support" } });
  ok(hi.length > 100, "the vote-highlight card rendered nothing worth checking");
  eq((hi.match(/class="pdx-vrhi-issue"/g) || []).length, N,
    "the profile's vote highlight is not showing one chip per mapped topic");
  hasNot(hi, "pdx-vrhi-issue is-more", "the '+N more' fold is back on the profile highlight");
  ok(!/\+\d+ more/.test(hi), "the profile highlight still rolls topics up into a count");
  for (const k of KEYS) has(hi, esc(label(k)), `${k} is on this vote but not on the profile highlight`);
  const chips = [...hi.matchAll(/class="pdx-vrhi-issue">([^<]*)</g)].map((m) => m[1]);
  const want = W._pdxBigPictureOrder(MAPPINGS, { labelFn: label }).map((m) => esc(label(m.issueKey)));
  eq(JSON.stringify(chips), JSON.stringify(want),
    "the profile highlight's chips are not in the shared Big Picture order");
  // Its one badge names its own scope rather than floating over chips it cannot speak for.
  if (/class="vr-verdict /.test(hi)) {
    has(hi, "Compares the stated stance on",
      "the highlight's verdict badge claims the whole vote without naming what it compares");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the surfaces that are pinned in their source");
// ═════════════════════════════════════════════════════════════════════════════
// The library shelf and the search index build their rows deep inside a live DOM
// and a live index, which a node harness cannot stand up cheaply. What CAN be
// pinned is the shape of the code that builds them — and the three patterns below
// are exactly the ones that were removed, so their reappearance is the regression.
{
  const dlib = readFileSync(join(ROOT, "digital-library.js"), "utf8");
  hasNot(dlib, "dlib-sec-more", "the library card's '+N more' topic fold is back");
  hasNot(dlib, "dlib-sec-chip.is-primary", "the library card is drawing one topic chip louder than the rest");
  ok(!/ordered\.slice\(0,\s*8\)/.test(dlib), "the library card is cutting its topic chips at eight again");
  has(dlib, "_pdxBigPictureKeys", "the library card no longer sorts its topic chips through the shared order");
  ok(!/issueCatOf\(b\.primaryIssue \|\| keys\[0\]/.test(dlib),
    "the library card's headline category is being resolved from the scoring flag again");

  const eye = readFileSync(join(ROOT, "all-seeing-eye.js"), "utf8");
  ok(!/ikeys\.unshift\(b\.primaryIssue\)/.test(eye),
    "the search index is pulling the flagged topic to the front of a bill's topic list again");
  has(eye, "more of ' + namedLbls.length + ' topics",
    "a search result names some of a bill's topics without stating the total");

  const bd = readFileSync(join(ROOT, "bill-detail.js"), "utf8");
  ok(!/\(primary \? \[primary\] : \[\]\)\.concat\(keys\)/.test(bd),
    "bill-detail's offline fallback is building a primary-first chip row again");

  // The example pick — allowed to prefer a primary, required to prefer evidence.
  const rc = readFileSync(join(ROOT, "receipt-cards.js"), "utf8");
  const sort = (rc.match(/function rdStrongest[\s\S]*?\n    \}\);/) || [""])[0];
  ok(sort.length > 100, "rdStrongest's ranking could not be read out of receipt-cards.js");
  const iProc = sort.indexOf("isProcedural");
  const iWeight = sort.indexOf("wa !== wb");
  const iPrimary = sort.indexOf("isPrimary");
  ok(iProc > -1 && iWeight > -1 && iPrimary > -1,
    "rdStrongest no longer ranks on all three of procedural, weight and the flag");
  ok(iProc < iPrimary,
    "rdStrongest ranks on is_primary before it rules out procedural votes — the flag is beating the evidence");
  ok(iWeight < iPrimary,
    "rdStrongest ranks on is_primary before curated weight — the flag is beating the evidence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the trail out of one act reaches every issue it was mapped to");
// ═════════════════════════════════════════════════════════════════════════════
// The dossier trail and the gap sheet's disclosure both read _measureOmnibusContext.
// Whichever issue a reader arrives on, the other thirteen have to be there — and in
// the same order the act's own page used, not the score sort.
{
  for (const from of [KEYS[0], KEYS[N - 1]]) {
    const c = W._measureOmnibusContext(ITEM, from, {}, { labelFn: label });
    ok(!!c, `the omnibus context returned nothing when arriving from ${from}`);
    if (!c) continue;
    eq(c.count, N, `arriving from ${from}, the trail states the wrong number of topics`);
    eq(c.others.length + (c.thisIssue ? 1 : 0), N,
      `arriving from ${from}, the trail reaches fewer issues than the act maps to`);
    const reached = (c.thisIssue ? [c.thisIssue.issueKey] : []).concat(c.others.map((o) => o.issueKey));
    eq(JSON.stringify([...reached].sort()), JSON.stringify([...KEYS].sort()),
      `arriving from ${from}, the trail reaches a different set of issues than the act maps to`);
    const wantOthers = W._pdxBigPictureOrder(
      MAPPINGS.filter((m) => m.issueKey !== from), { labelFn: label }).map((m) => m.issueKey);
    eq(JSON.stringify(c.others.map((o) => o.issueKey)), JSON.stringify(wantOthers),
      `arriving from ${from}, the sibling issues are not in the shared Big Picture order`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no surface labels a mapped topic second-class");
// ═════════════════════════════════════════════════════════════════════════════
// The vocabulary check, run over everything these surfaces actually print. The
// words are not banned from the codebase — the flag is real data — but no default
// string may tell a reader which of an act's topics are footnotes.
{
  const rendered = [
    W._vrCardHtml(ITEM, { [KEYS[0]]: { stance: "support" } }),
    W._pdxVoteHighlightCard(ITEM, { [KEYS[0]]: { stance: "support" } }),
  ].join("\n");
  for (const w of ["main issue", "Main issue", "primary issue", "Primary issue",
                   "secondary", "Secondary", "supporting only", "minor issue"]) {
    hasNot(rendered, w, `a surface calls one of the act's own topics ${JSON.stringify(w)}`);
  }
  ok(!/\+\d+ more/.test(rendered), "a surface still rolls mapped topics up into a '+N more'");
  ok(!/\b1 of \d+ (topic|issue)/.test(rendered), "a surface still ranks a topic as '1 of N'");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ big-picture surfaces: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ big-picture surfaces: all ${passed} assertions passed — ${N} topics carried intact from the bill page to the record card, the profile highlight and the trail\n`);
