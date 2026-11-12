#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-phase8-v3.mjs — wrong-direction cross-topic reads are gone and a
// small set of campaign-claim forms (R10) now read as clear positions.
//
//   · The five wrong-direction cases from the diagnostic produce no directional
//     candidate on the wrong key (ICE shootings → deportations, Court ruling
//     gutting the VRA → voting_access, a physician-ownership ban →
//     lands_energy, product audits → election_security, government-program
//     fraud → crypto_cbdc).
//   · R10 campaign-claim forms score as clear statements on the intended key,
//     only on campaign pages, official issue pages and own speeches.
//   · Pure problem statements, value statements, opponent-attributed language
//     and other people's quotes stay low; newsrooms do not read R10.
//   · R11(a): "Trump’s declaration that he … his promise" is not the speaker.
// ═══════════════════════════════════════════════════════════════════════════
import assert from "node:assert/strict";
import * as S from "../netlify/lib/stance-score-core.mjs";

let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const page = (politician_id, topic, source_type, url, sentences) => ({
  url, final_url: url, fetched_at: "2026-11-11T20:00:00.000Z", source_type, politician_id, topic,
  http_status: 200, body: `<html><body>${sentences.map((s) => `<p>${s}</p>`).join("")}</body></html>`,
});
const byTopic = (raw) => Object.fromEntries(S.scoreAllTopics(raw).map((c) => [c.topic, c]));
const directional = (c) => !!c && (c.position === "support" || c.position === "oppose");

t("rules version is phase8-v3", () => assert.equal(S.RULES_VERSION, "phase8-v3"));

// ── The five wrong-direction reads ───────────────────────────────────────────
t("Casar: hearing to investigate ICE shootings is not support for deportations", () => {
  const c = byTopic(page("casar", "healthcare_costs", "official House newsroom", "https://casar.house.gov/media/press-releases",
    ["Members of Congress Hold Hearing in Austin to Investigate ICE Shootings Across Texas"]));
  assert.ok(!directional(c.deportations));
});
t("Crockett: a Court ruling gutting the VRA is not the candidate opposing voting access", () => {
  const c = byTopic(page("crockett", "cost_living", "official House newsroom", "https://crockett.house.gov/media/press-releases",
    ["Rep. Crockett's Statement on the Supreme Court Ruling Gutting the Voting Rights Act", "Callais gutting Section 2 of the Voting Rights Act:"]));
  assert.ok(!(c.voting_access?.position === "oppose"));
});
t("Ocasio-Cortez: a ban on corporate ownership of physicians is not lands_energy", () => {
  const c = byTopic(page("aoc", "healthcare_costs", "official House issue page", "https://ocasio-cortez.house.gov/legislation/healthcare",
    ["The Stop Corporate Takeovers of Physicians Act would ban corporations and private equity from owning physicians."]));
  assert.ok(!directional(c.lands_energy));
  // A real drilling ban still reads.
  assert.equal(S.classify("We will stop the leasing moratorium on federal land.", "lands_energy", "x").side, "support");
  assert.notEqual(S.classify("I voted against all of the Big Bank bailouts.", "lands_energy", "x").kind, "clear");
});
t("Paxton: product audits are not election security or integrity", () => {
  const c = byTopic(page("ken_paxton", "healthcare_costs", "official agency newsroom", "https://www.texasattorneygeneral.gov/news/releases",
    ["The settlement also requires the company to implement rigorous new product audits and safety standards to protect consumers."]));
  assert.ok(!directional(c.election_security));
  assert.ok(!directional(c.election_integrity));
  assert.equal(S.classify("I will require post-election audits in every county.", "election_security", "x").side, "support");
});
t("Moore: fraud in government programs is not crypto_cbdc", () => {
  const c = byTopic(page("bmoore", "cost_living", "official House newsroom", "https://blakemoore.house.gov/media/press-releases",
    ["Congressman Blake Moore Introduces Legislation to Prevent Fraud in Government Programs"]));
  assert.ok(!c.crypto_cbdc);
  assert.equal(S.classify("I will crack down on crypto scams that target seniors.", "crypto_cbdc", "x").kind, "implication");
});

// ── R10 campaign-claim forms ─────────────────────────────────────────────────
const claim = (s, topic, pid) => S.classify(s, topic, pid, { claims: true });
const CLAIMS = [
  ["brian_babin", "healthcare_costs", "support", "I promised that I would repeal Obamacare and replace it with a workable, affordable solution which lowers premiums while protecting those with preexisting conditions."],
  ["crockett", "healthcare_costs", "support", "Crockett is a staunch defender of the Affordable Care Act, and is eager to get to work on improving the healthcare law so that costs are lowered and access is expanded."],
  ["x_y", "healthcare_costs", "support", "Our plan will lower premiums for every family on the exchange."],
  ["crockett", "healthcare_costs", "support", "Through federal action, Congresswoman Crockett works to expand access, lower cost, and keep Texans healthy."],
  ["crockett", "housing", "support", "Congresswoman Crockett is a proponent of an array of housing options, so all adults are able to find a home."],
  ["khanna", "child_care", "support", "As a co-founder of the Caucus , I am leading the effort to provide families with $10 per day childcare while guaranteeing fair wages."],
  ["tom_cole", "cut_spending", "support", "We must also rein in the Administration’s excessive government spending and misguided policies, which instigated our present inflation crisis and threaten a recession."],
  ["gina_hinojosa", "school_choice", "oppose", "On day one we will work tirelessly to repair the damage of the Texas vouchers scam and end an era in which our schools are sold for parts."],
  ["casar", "healthcare_costs", "support", "Congress must ensure that families across the country can afford their prescription drugs and to receive high-quality health care."],
];
t("R10: each diagnostic claim form is a clear statement on its intended key", () => {
  for (const [pid, topic, side, s] of CLAIMS) {
    const c = claim(s, topic, pid);
    assert.equal(c.kind, "clear", `${topic}: ${s}`);
    assert.equal(c.side, side, `${topic}: ${s}`);
  }
});
t("R10 patterns are off unless the source is a campaign / official issue page or own speech", () => {
  assert.equal(S.isClaimPage("campaign issue page", "https://x.com/issue"), true);
  assert.equal(S.isClaimPage("official House issue page", "https://x.house.gov/issues/health"), true);
  assert.equal(S.isClaimPage("speech (victory remarks transcript)", "https://x.com/remarks"), true);
  assert.equal(S.isClaimPage("official House newsroom", "https://x.house.gov/media/press-releases"), false);
  assert.equal(S.isClaimPage("news article", "https://news.example.com/a"), false);
  const s = "Congresswoman Crockett is a proponent of an array of housing options.";
  const nr = byTopic(page("crockett", "cost_living", "official House newsroom", "https://crockett.house.gov/media/press-releases", [s]));
  assert.ok(!directional(nr.housing));
  const ip = byTopic(page("crockett", "cost_living", "official House issue page", "https://crockett.house.gov/issues/economy", [s]));
  assert.equal(ip.housing.position, "support");
  assert.equal(ip.housing.stated_position, true);
});
t("R10 + R9: a claim-pattern read on its own key is not collapsed as another key's restatement", () => {
  const c = byTopic(page("khanna", "cost_living", "official House issue page", "https://khanna.house.gov/issues/economy",
    ["I am leading the effort to provide families with $10 per day childcare while guaranteeing that childcare workers receive family-supporting wages."]));
  assert.equal(c.child_care?.position, "support");
});

// ── Guardrails: still low ────────────────────────────────────────────────────
t("problem statements, value statements and opponent-attributed claims stay low", () => {
  const LOW = [
    ["healthcare_costs", "Premiums are going up for families across the district."],
    ["healthcare_costs", "Health care is a right, and every family deserves dignity."],
    ["healthcare_costs", "Republicans will lower premiums only for the wealthy."],
    ["healthcare_costs", "My opponent claims his plan lowers premiums."],
    ["healthcare_costs", "They say their program lowers prescription drug costs."],
    ["housing", "My opponent is a proponent of luxury housing for developers."],
    ["school_choice", "My opponent supports the vouchers scam."],
    ["healthcare_costs", "Families cannot afford their prescription drugs."],
    ["cost_living", "I will fight for you and put money in your pocket."],
  ];
  for (const [topic, s] of LOW) {
    const c = claim(s, topic, "x_y");
    assert.notEqual(c.kind, "clear", `${topic}: ${s}`);
  }
});
t("a quote from someone else on a claim page never sets the stated position", () => {
  const raw = page("crockett", "healthcare_costs", "official House issue page", "https://crockett.house.gov/issues/health", [
    "“Our bill works to expand access, lower cost, and keep Texans healthy,” said Rep. Jane Doe.",
  ]);
  const c = S.scoreRawRecord(raw);
  assert.notEqual(c.stated_position, true);
});
t("R11(a): a pronoun after another person’s possessive is that person, not the speaker", () => {
  const s = "“Trump’s declaration that he couldn’t care less is a mighty big reversal from his promise to bring down prices drastically.";
  assert.notEqual(S.classify(s, "cost_living", "lloyd_doggett").kind, "clear");
  // A name that is only an object does not take the pronoun.
  assert.equal(S.actorFor("Alongside President Trump, he will ", "ken_paxton").kind, "self");
  assert.equal(S.actorFor("Rep. Doggett said his ", "lloyd_doggett").kind, "self");
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log("phase8-v3: all checks pass");
