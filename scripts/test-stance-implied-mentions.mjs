#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-implied-mentions.mjs — R15 implied stance from aligned mentions
// (rules phase8-v4) and the widened raw-ingest rotation pool.
//
//   · 3+ zero-weight mentions on a page that all lean the same way, with no
//     contradicting language → implied support / oppose at confidence 0.5,
//     with a reason that says so.
//   · 1–2 aligned mentions stay zero weight and produce no position.
//   · Explicit stance language keeps its higher-confidence clear position.
//   · A contradicting mention, a negated mention, an opponent's words or a
//     quote from someone else never make an implied stance.
//   · Evidence Locker grading and cross-topic (R13) checks are unchanged: an
//     implied read is a weak Locker item, never a stated position, never a
//     cross-topic candidate.
//   · Pool: newly elected members and more issue pairs join the rotation; a
//     page stays open while any of its pairs is unfilled; a politician with
//     every pair filled is still deprioritised.
// ═══════════════════════════════════════════════════════════════════════════
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as L from "../netlify/lib/evidence-locker-core.mjs";
import * as core from "../netlify/lib/raw-ingest-core.mjs";
import POOL from "../db/raw-ingest-pool-expansion-2026-11.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const page = (topic, paras, { politician_id = "jane_test", source_type = "campaign issues page", url = "https://janetestforcongress.com/issues" } = {}) => ({
  url, final_url: url, fetched_at: "2026-11-16T12:00:00.000Z", source_type, politician_id, topic, http_status: 200,
  body: `<html><body>${paras.map((p) => `<p>${p}</p>`).join("")}</body></html>`,
});
const score = (raw, opts) => S.scoreRawRecord(raw, raw.topic, null, opts);

const SS_SUPPORT = [
  "Social Security must be protected for every retiree.",
  "Medicare should be strengthened for the next generation.",
  "Earned benefits must be preserved in full.",
];
const UKR_OPPOSE = [
  "Ukraine aid should be cut.",
  "Ukraine funding must be halted.",
  "More aid to Ukraine should be stopped.",
];

t("rules version is bumped to phase8-v4", () => assert.equal(S.RULES_VERSION, "phase8-v4"));

// ── R15 fires ───────────────────────────────────────────────────────────────
t("3 aligned support mentions, nothing contradicting → implied support at 0.5", () => {
  const c = score(page("social_security", SS_SUPPORT));
  assert.equal(c.position, "support");
  assert.equal(c.confidence, 0.5);
  assert.match(c.confidence_reason, /implied stance/);
  assert.match(c.confidence_reason, /3 aligned mentions imply support/);
  assert.equal(c.implied_stance, true);
  assert.equal(c.sources[0].aligned_mentions, 3);
  assert.equal(c.sources[0].takes_clear_position, false, "no explicit statement on the page");
  assert.ok(c.sources[0].statements.every((s) => s.kind === "mention" && s.weight === 0), "mentions stay zero weight");
  assert.ok(c.sources[0].statements.every((s) => s.lean === "support"));
  assert.ok(!c.stated_position, "an implied read is never an R8 stated position");
  assert.equal(c.sources[0].excerpt, SS_SUPPORT[0]);
});
t("3 aligned oppose mentions → implied oppose at 0.5", () => {
  const c = score(page("ukraine_aid", UKR_OPPOSE));
  assert.equal(c.position, "oppose");
  assert.equal(c.confidence, 0.5);
  assert.match(c.confidence_reason, /3 aligned mentions imply oppose/);
});
t("more than 3 aligned mentions → still 0.5 (implied, not explicit)", () => {
  const c = score(page("social_security", [...SS_SUPPORT, "Medicare must be expanded to cover dental care."]));
  assert.equal(c.position, "support");
  assert.equal(c.confidence, 0.5);
  assert.match(c.confidence_reason, /4 aligned mentions imply support/);
});
t("neutral mentions alongside 3 aligned ones do not block the implied stance", () => {
  const c = score(page("social_security", [...SS_SUPPORT, "Social Security turns 91 this year."]));
  assert.equal(c.position, "support");
  assert.equal(c.confidence, 0.5);
  assert.match(c.confidence_reason, /1 other mention\(s\) recorded at zero weight/);
});

// ── 1–2 mentions stay zero weight ───────────────────────────────────────────
t("1 aligned mention → no position", () => {
  const c = score(page("social_security", SS_SUPPORT.slice(0, 1)));
  assert.equal(c.position, "no clear position");
  assert.equal(c.confidence, S.WEIGHTS.mentionOnlyConfidence);
  assert.ok(!c.implied_stance);
});
t("2 aligned mentions → no position, zero weight", () => {
  for (const [topic, paras] of [["social_security", SS_SUPPORT.slice(0, 2)], ["ukraine_aid", UKR_OPPOSE.slice(0, 2)]]) {
    const c = score(page(topic, paras));
    assert.equal(c.position, "no clear position");
    assert.ok(c.sources[0].statements.every((s) => s.weight === 0 && !s.lean));
  }
});

// ── Contradiction and guard rails ───────────────────────────────────────────
t("a mention leaning the other way blocks the implied stance", () => {
  const c = score(page("social_security", [...SS_SUPPORT, "Medicare spending should be cut back hard."]));
  assert.equal(c.position, "no clear position");
});
t("a mention carrying both directions blocks the implied stance", () => {
  assert.equal(S.mentionLean("Medicare must be protected, and Social Security should be cut.", "social_security"), "both");
  const c = score(page("social_security", [...SS_SUPPORT, "Medicare must be protected, and Social Security should be cut."]));
  assert.equal(c.position, "no clear position");
});
t("negated, questioned, opponent and quoted-other mentions never lean", () => {
  assert.equal(S.mentionLean("Social Security should not be protected.", "social_security"), null);
  assert.equal(S.mentionLean("Should Social Security be protected?", "social_security"), null);
  const opp = score(page("social_security", SS_SUPPORT.map((s) => `My opponent says ${s.charAt(0).toLowerCase()}${s.slice(1)}`)));
  assert.equal(opp.position, "no clear position");
  const quoted = score(page("social_security", SS_SUPPORT.map((s) => `“${s}” said Rep. John Other.`)));
  assert.equal(quoted.position, "no clear position");
});
t("no-pole topics never read an implied stance", () => {
  for (const k of S.NO_POLE_TOPICS) {
    const c = score(page(k, SS_SUPPORT));
    assert.ok(c.position === "no clear position" || !c.implied_stance, k);
  }
});
t("the rule can be switched off (rules as before)", () => {
  assert.equal(score(page("social_security", SS_SUPPORT), { impliedMentions: false }).position, "no clear position");
});

// ── Explicit language is unchanged ──────────────────────────────────────────
t("explicit stance language still gives the higher-confidence clear position", () => {
  const one = score(page("social_security", ["I will protect Social Security."]));
  assert.equal(one.position, "support");
  assert.ok(one.confidence >= 0.8, `${one.confidence}`);
  assert.ok(!one.implied_stance);
  const mix = score(page("social_security", ["I will protect Social Security.", ...SS_SUPPORT]));
  assert.equal(mix.position, "support");
  assert.ok(mix.confidence > S.WEIGHTS.impliedMentionConfidence, `${mix.confidence}`);
  assert.ok(!mix.implied_stance, "explicit reads keep the explicit rules");
  assert.doesNotMatch(mix.confidence_reason, /implied stance/);
});
t("an explicit page reads the same with R15 on or off", () => {
  const raw = page("social_security", ["I will protect Social Security.", "Medicare spending should be cut back hard.", ...SS_SUPPORT]);
  const a = score(raw), b = score(raw, { impliedMentions: false });
  assert.deepEqual([a.position, a.confidence, a.confidence_reason], [b.position, b.confidence, b.confidence_reason]);
});

// ── Evidence Locker and cross-topic checks ──────────────────────────────────
t("Evidence Locker: an implied read grades as a weak item on a campaign page, thresholds unchanged", () => {
  const raw = page("social_security", SS_SUPPORT);
  const c = score(raw);
  assert.equal(L.lockerStrength(c).strength, "weak");
  const d = L.lockerDecision(c, raw, null);
  assert.equal(d.write, true);
  assert.equal(d.strength, "weak");
  assert.equal(L.buildLockerItem(c, raw).excerpt, SS_SUPPORT[0]);
  const news = { ...raw, url: "https://example-news.com/story", final_url: "https://example-news.com/story", source_type: "news report" };
  assert.equal(L.lockerDecision(score(news), news, null).write, false, "non-campaign sources still stay out");
});
t("cross-topic: aligned mentions on another topic never yield a cross-topic candidate", () => {
  const raw = page("cost_living", ["Our town deserves better.", ...SS_SUPPORT]);
  const all = S.scoreAllTopics(raw);
  assert.equal(all[0].topic, "cost_living");
  assert.ok(!all.some((c) => c.topic === "social_security"), "R13 still needs an explicit anchor");
  assert.ok(all.slice(1).every((c) => !c.implied_stance));
});

// ── Pool expansion ──────────────────────────────────────────────────────────
t("the pool expansion file is current", () => {
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-pool-expansion-2026-11.mjs"), "--check"], { stdio: "pipe" });
});
t("newly elected members and more politicians join the rotation roster", () => {
  assert.ok(POOL.politicians.length > 0);
  const ids = new Set(core.ROSTER.map((r) => r.politician_id));
  assert.equal(ids.size, core.ROSTER.length, "no duplicate roster rows");
  for (const r of POOL.politicians) assert.ok(ids.has(r.politician_id), r.politician_id);
  const newly = POOL.politicians.filter((r) => r.newly_elected);
  assert.ok(newly.length > 0, "newly elected state legislators are in");
  assert.ok(newly.every((r) => r.tier === 2), "newly elected rank ahead of the tier-3 additions");
  for (const r of POOL.politicians) for (const s of r.sources) {
    assert.ok(/^https?:\/\//.test(s.url));
    assert.ok(S.hasRulesFor(s.topic), `${r.politician_id} ${s.topic}`);
    // Congress.gov enters only as tier 2 (pool v2); GovInfo is a general archive and stays out.
    const h = new URL(s.url).hostname;
    if (/(?:^|\.)congress\.gov$/.test(h)) assert.equal(s.source_tier, 2, s.url);
    assert.ok(!/(?:^|\.)govinfo\.gov$/.test(h), s.url);
  }
});
t("every new page gets its own raw record key", () => {
  const keys = core.ROSTER.flatMap((r) => r.sources.map((s) => core.rawKey(s, "2026-11-16T00:00:00.000Z")));
  assert.equal(new Set(keys).size, keys.length);
});
t("more issue pairs: a page stays open while any of its pairs is unfilled", () => {
  const row = core.ROSTER.find((r) => r.sources.some((s) => (s.issue_pairs || []).length));
  assert.ok(row, "some page carries extra issue pairs");
  const s = row.sources.find((x) => (x.issue_pairs || []).length);
  const pid = row.politician_id;
  const fill = (topics) => Object.fromEntries(topics.map((k) => [core.pairKey(pid, k), { strong: 1, weak: 0 }]));
  assert.equal(core.pageFilled(fill([s.topic]), pid, s), false, "record topic filled, other pairs open");
  assert.equal(core.pageFilled(fill(core.pageTopics(s)), pid, s), true);
});
t("deprioritisation is unchanged: every pair filled → band 1", () => {
  const pid = "pool_test";
  const r = { politician_id: pid, tier: 2, sources: [{ politician_id: pid, topic: "housing", issue_pairs: ["child_care"], url: "https://x.example/a" }] };
  const all = { [core.pairKey(pid, "housing")]: { strong: 1 }, [core.pairKey(pid, "child_care")]: { weak: 3 } };
  assert.equal(core.splitByBaseline(r, all).band, 1);
  assert.equal(core.splitByBaseline(r, { [core.pairKey(pid, "housing")]: { strong: 1 } }).band, 0);
  const plain = { politician_id: "p2", tier: 2, sources: [{ politician_id: "p2", topic: "housing", url: "https://x.example/b" }] };
  assert.equal(core.splitByBaseline(plain, { [core.pairKey("p2", "housing")]: { strong: 1 } }).band, 1, "pages without extra pairs read as before");
});

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nall implied-mention and pool checks passed");
