#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-lead-signals.mjs — R14 title and lead-sentence stance signals.
//
//   · Four pages that used to land as "no clear position" now score a clear
//     position from the stance verb in the title or the first two sentences:
//     AOC Israel → oppose, Duckworth NDAA → oppose, Cortez Masto Yucca →
//     oppose, Mace cost of living → support.
//   · R14 only fills in a page with NO directional read: every page that
//     already scores a clear position (or mixed) scores exactly the same.
//   · Guard rails: the verb must be the page's own politician's (not an
//     opponent's, not someone else's quote), not negated, not a question, and
//     the lead must be about the page's topic (or name a bill the politician
//     acts on). Cross-topic candidates do not read R14.
// ═══════════════════════════════════════════════════════════════════════════
import assert from "node:assert/strict";
import * as S from "../netlify/lib/stance-score-core.mjs";

let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const page = (politician_id, topic, source_type, url, { title = null, h1 = null, paras = [] } = {}) => ({
  url, final_url: url, fetched_at: "2026-11-15T20:00:00.000Z", source_type, politician_id, topic, http_status: 200,
  body: `<html><head>${title ? `<title>${title}</title>` : ""}</head><body><nav><a href="/">Home</a></nav>${h1 ? `<h1>${h1}</h1>` : ""}${paras.map((s) => `<p>${s}</p>`).join("")}</body></html>`,
});
const clearPos = (c) => c.position === "support" || c.position === "oppose";
// The same page with R14 switched off — the rules as they were before.
const without = (raw) => S.scoreRawRecord(raw, raw.topic, null, { leadSignals: false });

// ── The four pages ──────────────────────────────────────────────────────────
const AOC = page("aoc", "israel_support", "official House press release",
  "https://ocasio-cortez.house.gov/media/press-releases/ocasio-cortez-calls-block-offensive-arms-sale-israel", {
    title: "Ocasio-Cortez Calls to Block Offensive Arms Sale to Israel | Congresswoman Alexandria Ocasio-Cortez",
    h1: "Ocasio-Cortez Calls to Block Offensive Arms Sale to Israel",
    paras: [
      "WASHINGTON — Today, Rep. Alexandria Ocasio-Cortez (NY-14) introduced a joint resolution of disapproval on the proposed sale of 2,000-pound bombs and guidance kits to the Netanyahu government.",
      "The sale comes as the humanitarian catastrophe in Gaza deepens.",
      "Congress has a responsibility to review these transfers under the Arms Export Control Act.",
    ] });
const DUCKWORTH = page("duckworth", "strong_defense", "official Senate press release",
  "https://www.duckworth.senate.gov/news/press-releases/duckworth-votes-against-final-ndaa", {
    title: "Duckworth Votes Against Final NDAA | U.S. Senator Tammy Duckworth",
    h1: "Duckworth Votes Against Final NDAA",
    paras: [
      "U.S. Senator Tammy Duckworth (D-IL), a combat Veteran and member of the Senate Armed Services Committee, released the following statement after voting against the final Fiscal Year 2026 National Defense Authorization Act.",
      "This bill fails the servicemembers and military families who were promised better.",
      "The Senate Armed Services Committee will take up the next bill in the spring.",
    ] });
const CORTEZ_MASTO = page("cortez_masto", "enviro_energy", "official Senate press release",
  "https://www.cortezmasto.senate.gov/news/press-releases/cortez-masto-rosen-introduce-bill-to-block-yucca-mountain", {
    title: "Cortez Masto, Rosen Introduce Bill to Block Yucca Mountain Nuclear Waste Repository",
    h1: "Cortez Masto, Rosen Introduce Bill to Block Yucca Mountain Nuclear Waste Repository",
    paras: [
      "U.S. Senators Catherine Cortez Masto (D-Nev.) and Jacky Rosen (D-Nev.) introduced legislation that would require consent from Nevada before any nuclear waste could be stored at Yucca Mountain.",
      "Nevadans have made clear for decades that the state will not be the nation's dumping ground.",
      "The Department of Energy has spent billions on the site since 1987.",
    ] });
const MACE = page("nancy_mace", "cost_living", "official House press release",
  "https://mace.house.gov/media/press-releases/mace-votes-family-affordability-act", {
    title: "Mace Votes for the Family Affordability Act",
    h1: "Mace Votes for the Family Affordability Act",
    paras: [
      "Congresswoman Nancy Mace (SC-01) voted for H.R. 4410, the Family Affordability Act, which passed the House today.",
      "Lowcountry families are paying too much for groceries, gas and rent.",
      "The bill now heads to the Senate for consideration.",
    ] });

const FOUR = [["AOC Israel", AOC, "oppose"], ["Duckworth NDAA", DUCKWORTH, "oppose"], ["Cortez Masto Yucca", CORTEZ_MASTO, "oppose"], ["Mace cost of living", MACE, "support"]];

for (const [name, raw, want] of FOUR) {
  t(`${name}: was "no clear position" before R14`, () => assert.equal(without(raw).position, "no clear position"));
  t(`${name}: now scores ${want}`, () => {
    const c = S.scoreRawRecord(raw);
    assert.equal(c.position, want, c.confidence_reason);
    assert.ok(c.confidence >= S.WEIGHTS.baseConfidence.medium, `confidence ${c.confidence}`);
    assert.ok(c.sources[0].statements.some((s) => s.kind === "clear" && s.lead_signal), "a lead-signal statement carries the read");
    assert.match(c.confidence_reason, /R14/);
    assert.equal(c.sources[0].takes_clear_position, true);
    assert.equal(c.formal_record, false);
    assert.equal(c.layer, "stated");
  });
  t(`${name}: scoreAllTopics carries the same own-topic read`, () => {
    const [own] = S.scoreAllTopics(raw);
    assert.equal(own.topic, raw.topic);
    assert.equal(own.position, want);
  });
}

// ── Pages that already score a clear position are unchanged ─────────────────
const CLEAR_PAGES = [
  page("james_talarico", "cost_living", "campaign issue page", "https://jamestalarico.com/issues", { paras: [
    "I will fight to lower costs for working families.", "We must pass a cost-of-living tax cut.", "I will cap insulin at $35 a month.",
  ] }),
  page("crockett", "housing", "official House issue page", "https://crockett.house.gov/issues/housing", { paras: [
    "Congresswoman Crockett is a proponent of an array of housing options.", "She voted for the Housing Supply Act.",
  ] }),
  page("collins", "israel_support", "official Senate press release", "https://www.collins.senate.gov/newsroom/x", {
    h1: "Collins Votes Against Offensive Arms Sale Block", paras: ["Senator Collins will always stand with Israel.", "Hamas must be defeated."] }),
  page("duckworth", "strong_defense", "official Senate press release", "https://www.duckworth.senate.gov/news/press-releases/x", {
    h1: "Duckworth Votes Against NDAA", paras: ["I will always fight for our troops.", "We must cut the defense budget by ten percent."] }),
  page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/media/press-releases/y", {
    h1: "Mace Votes Against Spending Bill", paras: ["I will lower costs for Lowcountry families.", "We will cut taxes for every family."] }),
];
for (const raw of CLEAR_PAGES) {
  t(`unchanged: ${raw.politician_id}|${raw.topic} (${without(raw).position})`, () => {
    const before = without(raw);
    const after = S.scoreRawRecord(raw);
    assert.ok(clearPos(before) || before.position === "mixed", `fixture should already be directional: ${before.position}`);
    assert.deepEqual(after, before);
    assert.deepEqual(S.scoreAllTopics(raw), S.scoreAllTopics(raw).map((c) => c)); // deterministic
  });
}

// ── Guard rails ─────────────────────────────────────────────────────────────
t("an opponent's vote is not the page's politician's stance", () => {
  const c = S.scoreRawRecord(page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/a", {
    h1: "Republicans Voted Against the Family Affordability Act", paras: ["Families are paying too much for groceries and rent.", "The vote was 210 to 215."] }));
  assert.equal(c.position, "no clear position");
  assert.ok(!c.sources[0].statements.some((s) => s.lead_signal));
});
t("a negated verb does not count", () => {
  const c = S.scoreRawRecord(page("duckworth", "strong_defense", "official Senate press release", "https://www.duckworth.senate.gov/b", {
    h1: "Duckworth Statement on the Defense Bill", paras: ["Senator Duckworth did not vote for the National Defense Authorization Act this week.", "She was recovering from surgery."] }));
  assert.equal(c.position, "no clear position");
});
t("a question does not count", () => {
  const c = S.scoreRawRecord(page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/c", {
    h1: "Will Congress Vote for the Family Affordability Act?", paras: ["Rent and groceries keep climbing in South Carolina.", "The House returns Monday."] }));
  assert.equal(c.position, "no clear position");
});
t("someone else's quote does not count", () => {
  const c = S.scoreRawRecord(page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/d", {
    h1: "Lowcountry Leaders Weigh In on Grocery Prices", paras: ["“We voted for the Family Affordability Act because rent is out of reach,” said Mayor Jane Doe.", "Groceries are up again this year."] }));
  assert.equal(c.position, "no clear position");
});
t("a verb with no topic and no named bill in the lead does not count", () => {
  const c = S.scoreRawRecord(page("cortez_masto", "enviro_energy", "official Senate press release", "https://www.cortezmasto.senate.gov/e", {
    h1: "Cortez Masto Votes Against Nominee", paras: ["The nominee lacks the experience the job requires.", "The vote is expected Thursday.", "Later on the page, Nevada's nuclear future is discussed."] }));
  assert.equal(c.position, "no clear position");
});
t("the verb must sit in the title or the first two sentences", () => {
  const c = S.scoreRawRecord(page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/f", {
    h1: "Mace Statement on Grocery Prices", paras: ["Groceries cost more in South Carolina this year.", "Families have noticed at the checkout.", "Mace voted for the Family Affordability Act last spring."] }));
  assert.equal(c.position, "no clear position");
});
t("conflicting firm verbs in the lead do not pick a side", () => {
  const c = S.scoreRawRecord(page("duckworth", "strong_defense", "official Senate press release", "https://www.duckworth.senate.gov/g", {
    h1: "Duckworth Votes for House NDAA, Votes Against Senate NDAA", paras: ["Two versions of the National Defense Authorization Act reached the floor.", "The conference begins next week."] }));
  assert.equal(c.position, "no clear position");
});
t("the topic in the title and the verb in the next sentence count together", () => {
  const c = S.scoreRawRecord(page("cortez_masto", "enviro_energy", "official Senate press release", "https://www.cortezmasto.senate.gov/h", {
    h1: "Yucca Mountain Nuclear Waste Dump", paras: ["Senator Cortez Masto demands zero dollars for the project in next year's budget.", "Nevada was never consulted."] }));
  assert.equal(c.position, "oppose");
});
t("'must not fund' / 'will not agree' read as oppose", () => {
  assert.equal(S.scoreRawRecord(page("aoc", "israel_support", "official House press release", "https://ocasio-cortez.house.gov/i", {
    h1: "Statement on Gaza", paras: ["Congress must not fund more 2,000-pound bombs for the Netanyahu government in Gaza.", "The toll is unacceptable."] })).position, "oppose");
  assert.equal(S.scoreRawRecord(page("duckworth", "strong_defense", "official Senate press release", "https://www.duckworth.senate.gov/j", {
    h1: "Duckworth on the Defense Bill", paras: ["I will not agree to a National Defense Authorization Act that strips these protections.", "Servicemembers deserve better."] })).position, "oppose");
});
t("cosponsoring a named bill reads as support on the page's topic", () => {
  const c = S.scoreRawRecord(page("nancy_mace", "cost_living", "official House press release", "https://mace.house.gov/k", {
    h1: "Mace Cosponsors H.R. 4410", paras: ["The bill is now before the Ways and Means Committee.", "A hearing is set for March."] }));
  assert.equal(c.position, "support");
});
t("R14 never adds a cross-topic candidate", () => {
  const topics = S.scoreAllTopics(MACE).map((c) => c.topic);
  const before = S.scoreAllTopics({ ...MACE, body: MACE.body.replace(/Votes for/g, "Statement on").replace(/voted for/g, "spoke on") }).map((c) => c.topic);
  assert.deepEqual(topics.filter((x) => x !== MACE.topic), before.filter((x) => x !== MACE.topic));
});
t("no-pole topics never read R14", () => {
  const c = S.scoreRawRecord(page("aoc", "iran_policy", "official House press release", "https://ocasio-cortez.house.gov/l", {
    h1: "Ocasio-Cortez Votes Against Iran Sanctions Bill", paras: ["Iran is a threat.", "Diplomacy matters."] }));
  assert.equal(c.position, "no clear position");
});
t("rules version is phase9-v1 (R15 implied stance kept; phase9-v1 adds R17 framing)", () => assert.equal(S.RULES_VERSION, "phase9-v1"));

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nall lead-signal checks passed");
