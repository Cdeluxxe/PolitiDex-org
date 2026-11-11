#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-stated-position.mjs — clear campaign-page claims read as normal
// stated positions (scorer R8), one claim is filed under one issue (R9), and
// neither makes a claim a formal record or action.
//
//   · Scorer: a specific, on-topic claim on a primary source (campaign/official
//     page, press release, statement) scores at the strong bar with no external
//     verification; a non-primary source, an implication-only read, a contested
//     page and a pure mention do not move.
//   · Talarico health-care page: the insulin-pricing claims land in the Locker
//     as a normal stated position on an existing issue key, once, not restated
//     under every issue the sentence touches.
//   · Legacy weak items written under the older rules are re-read when served;
//     restated duplicates are served once.
//   · Profile: the claim prints as a stated position (no "Weak signal"), Word vs
//     Action's figure does not move and the row says it is not a formal act; a
//     pure mention stays "Mentions this topic · not a stance".
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as L from "../netlify/lib/evidence-locker-core.mjs";
import { listLockerEntries } from "../netlify/functions/evidence-locker-items.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const issueKeys = JSON.parse(read("db/issue-keys.json")).keys;
const gt = JSON.parse(read("db/stance-ground-truth-talarico-cost-of-living.json"));

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const PID = "james_talarico";
const HC_URL = "https://jamestalarico.com/issue/health-care/";
const HC_PAGE = `<html><head><title>Health Care | James Talarico for U.S. Senate</title></head><body>
<h1>Health Care</h1>
<p>Texas has the highest uninsured rate in the nation.</p>
<p>In the Senate, James will cap the price of insulin at $35 a month for every Texan.</p>
</body></html>`;
const rawOf = (over = {}) => ({
  url: HC_URL, final_url: HC_URL, fetched_at: "2026-11-10T08:00:00.000Z", source_type: "campaign issue page",
  politician_id: PID, topic: "healthcare_costs", http_status: 200, body: HC_PAGE, ...over,
});
const fakeStore = () => {
  const data = new Map();
  return {
    data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
  };
};

console.log("stance pipeline: clear campaign-page claims are stated positions");

// ── Scorer ──────────────────────────────────────────────────────────────────
const own = S.scoreRawRecord(rawOf());
await t("Talarico insulin claim: healthcare_costs support at the strong bar, marked stated, not a formal record", () => {
  assert.ok(issueKeys.includes("healthcare_costs"), "existing issue key");
  assert.equal(own.position, "support");
  assert.equal(own.confidence, S.WEIGHTS.statedPositionConfidence);
  assert.ok(own.confidence >= L.LOCKER_MIN_CONFIDENCE);
  assert.match(own.confidence_reason, /\(R8\)/);
  assert.equal(own.stated_position, true);
  assert.equal(own.layer, "stated");
  assert.equal(own.formal_record, false);
  assert.match(own.sources[0].excerpt, /insulin at \$35/);
});

await t("R8 applies to press releases / official statements too, and needs no external verification", () => {
  for (const source_type of ["press release", "official statement", "official Senate issue page"]) {
    const c = S.scoreRawRecord(rawOf({ source_type }));
    assert.equal(c.position, "support", source_type);
    assert.ok(c.confidence >= 0.8, `${source_type}: ${c.confidence}`);
    assert.equal(L.lockerStrength(c).strength, "strong", source_type);
  }
  // A .gov link is a primary source whatever the type label says.
  const gov = S.scoreRawRecord(rawOf({ source_type: "issue", url: "https://example.senate.gov/issues", final_url: "https://example.senate.gov/issues" }));
  assert.equal(gov.confidence, 0.8);
});

await t("R8 does not lift a non-primary source, an implication-only read, or a contested page", () => {
  const news = S.scoreRawRecord(rawOf({ source_type: "news article", url: "https://news.example.com/x", final_url: "https://news.example.com/x" }));
  assert.equal(news.position, "support");
  assert.equal(news.confidence, 0.7, "a secondary source keeps the old medium read");
  assert.ok(!news.stated_position);
  const imp = S.scoreRawRecord(rawOf({ body: "<p>We will confront fentanyl trafficking in every county.</p>" }), "immig_fentanyl");
  assert.equal(imp.confidence, 0.7, "implication-only stays a weak signal");
  assert.ok(!imp.stated_position);
  const split = S.scoreRawRecord(rawOf({ body: HC_PAGE.replace("</body>", "<p>In the Senate, James will cap the price of insulin.</p><p>We will lower insulin costs.</p><p>I oppose price caps on drugs.</p></body>") }));
  assert.ok(!/\(R8\)/.test(split.confidence_reason), "an outlier keeps the page off the floor");
});

await t("pure topic mentions stay non-stances", () => {
  const m = S.scoreRawRecord(rawOf({ body: "<p>America spends more on health care than any nation in the world.</p>" }));
  assert.equal(m.position, "no clear position");
  assert.ok(!m.stated_position);
  assert.equal(L.lockerStrength(m).strength, "mention");
});

await t("R9: the insulin claim is filed once, not restated under every issue it touches", () => {
  const all = S.scoreAllTopics(rawOf());
  assert.equal(all[0].topic, "healthcare_costs");
  const quoting = all.filter((c) => (c.sources[0].statements || []).some((s) => /insulin at \$35/.test(s.text) && s.kind !== "mention"));
  assert.equal(quoting.length, 1, `claim carried by ${quoting.map((c) => c.topic)}`);
  // Without the collapse, more than one issue key reads the same sentence.
  const raw = S.scoreRawRecord(rawOf(), "health_drug_prices");
  assert.ok(S.directionalSignals(raw) > 0, "fixture: health_drug_prices also reads the sentence");
  // Distinct claims on distinct issues still each produce their own candidate.
  const multi = S.scoreAllTopics(rawOf({ body: "<p>I will raise teacher pay and fully fund our public schools.</p><p>I will secure the border.</p><p>We will bring down the national debt.</p>" }));
  for (const k of ["public_schools", "border_security", "national_debt"]) assert.ok(multi.some((c) => c.topic === k), k);
});

await t("Talarico cost-of-living ground truth is unchanged (support 0.85)", () => {
  const body = read("scripts/test-stance-score.mjs").match(/const PAGE = `([\s\S]*?)`;/)[1];
  const r = S.scoreAgainstGroundTruth({ ...rawOf({ topic: "cost_living", url: "https://jamestalarico.com/issue/taxes-cost-of-living/", final_url: "https://jamestalarico.com/issue/taxes-cost-of-living/" }), body }, gt, { log: () => {} });
  assert.equal(r.candidate.confidence, 0.85);
  assert.equal(r.comparison.delta, 0);
});

// ── Locker ──────────────────────────────────────────────────────────────────
const store = fakeStore();
for (const c of S.scoreAllTopics(rawOf())) await L.maybeWriteLockerItem(c, rawOf(), { store, gt, log: () => {} });
const stored = [...store.data.values()];
const hcItem = stored.find((i) => i.topic === "healthcare_costs");

await t("Locker: the insulin claim is one strong stated item on healthcare_costs", () => {
  assert.ok(hcItem, "item written");
  assert.equal(hcItem.strength, "strong");
  assert.equal(hcItem.stated_position, true);
  assert.equal(hcItem.formal_record, false);
  assert.equal(stored.filter((i) => /insulin at \$35/.test(i.excerpt)).length, 1, "no near-duplicate item");
  const e = L.toSpotlightEntry(hcItem);
  assert.equal(e.issueKey, "healthcare_costs");
  assert.equal(e.category, "statement");
  assert.equal(e.pipeline.layer, "stated");
  assert.equal(e.pipeline.formal_record, false);
  assert.equal(e.pipeline.strength, "strong");
});

await t("legacy weak items: an explicit campaign claim is re-read as a stated position when served; others are not", async () => {
  const base = { politician_id: PID, topic: "healthcare_costs", position: "support", confidence: 0.7, strength: "weak", source_type: "campaign issue page",
    link: HC_URL, excerpt: "In the Senate, James will cap the price of insulin at $35 a month for every Texan.", date: "2026-11-01",
    attribution: "Source: campaign page", rules_version: "phase7-v1",
    confidence_reason: "1 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6); 1 mention(s) recorded at zero weight (R3)" };
  const up = L.regradeStatedPosition(base);
  assert.equal(up.strength, "strong"); assert.equal(up.confidence, 0.8); assert.equal(up.stated_position, true);
  assert.deepEqual(up.regraded_from, { confidence: 0.7, rules_version: "phase7-v1" });
  assert.equal(base.strength, "weak", "pure: the stored item is not mutated");
  const keep = (over) => assert.equal(L.regradeStatedPosition({ ...base, ...over }).strength, over.strength || "weak", JSON.stringify(over));
  keep({ confidence_reason: "0 implication(s) for support at medium weight (R6)" });                        // implication only
  keep({ confidence_reason: base.confidence_reason + "; 1 outlier(s) without reversal language lower confidence, do not flip (R5)", confidence: 0.6 });
  keep({ source_type: "news article", link: "https://news.example.com/x" });                               // not primary
  keep({ position: "no clear position", strength: "mention", confidence: 0.3 });                          // mention
  // Served through the endpoint: the legacy item is strong, and the restated
  // copy under another key is served once.
  const st = fakeStore();
  st.data.set(L.lockerKey(base), base);
  const dup = { ...base, topic: "health_drug_prices", page_topic: "healthcare_costs" };
  st.data.set(L.lockerKey(dup), dup);
  const other = { ...base, topic: "public_schools", excerpt: "I will fully fund our public schools.", confidence_reason: "1 clear medium-weight statement(s) for support" };
  st.data.set(L.lockerKey(other), other);
  const body = await listLockerEntries(st, { items: [] });
  const list = body.items[PID];
  assert.equal(list.length, 2, list.map((e) => e.issueKey).join());
  assert.equal(body.restated, 1);
  const hc = list.find((e) => e.issueKey === "healthcare_costs");
  assert.ok(hc, "the page's own topic is the one kept");
  assert.equal(hc.pipeline.strength, "strong"); assert.equal(hc.pipeline.confidence, 0.8);
  assert.equal(hc.pipeline.formal_record, false);
  assert.ok(list.some((e) => e.issueKey === "public_schools"), "a distinct claim is not collapsed");
  const counts = await L.lockerBaselineCounts(st, { log: () => {} });
  assert.deepEqual(counts[`${PID}|healthcare_costs`], { strong: 1, weak: 0 });
});

// ── Profile: stated position, never a formal action ─────────────────────────
const html = read("person.html");
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js", "related-issues.js",
  "profile-evidence.js", "profiles-full.js", "gaps.js",
];
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const boot = (withLocker) => {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) vm.runInContext(read(f), sb, { filename: f });
  for (const tg of TAGS) if (!/\bsrc\s*=/.test(tg.attrs) && /window\.PDXStance\s*=/.test(tg.body)) vm.runInContext(tg.body, sb, { filename: "person.html PDXStance" });
  if (withLocker) vm.runInContext(read("profile-locker.js"), sb, { filename: "profile-locker.js" });
  win.PROFILES = win.CMP_DATA;
  return win;
};
const mentionItem = L.buildLockerItem(S.scoreRawRecord(rawOf({ url: HC_URL + "m", final_url: HC_URL + "m", topic: "health_drug_prices",
  body: "<p>Pharmacy benefit managers came up at the town hall.</p>" })), rawOf({ url: HC_URL + "m", final_url: HC_URL + "m" }), "mention");

await t("profile: the insulin claim is a stated position (no Weak signal); Word vs Action does not count it as an action", () => {
  const w0 = boot(false), w = boot(true);
  const entries = [L.toSpotlightEntry(hcItem), L.toSpotlightEntry(mentionItem)];
  const r = w.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [PID]: entries }, count: entries.length })));
  assert.ok(r && r.added >= 1);
  const P = w.PDXProfileLocker;
  const it = P.forIssue(PID, "healthcare_costs")[0];
  assert.ok(it, "the item is on healthcare_costs");
  assert.equal(P.strengthOf(it), "strong", "not a weak signal");
  const ps = P.promotedStance(PID, "healthcare_costs");
  assert.ok(ps, "promoted to a Said line"); assert.equal(ps.strength, "strong"); assert.equal(ps.side, "support"); assert.equal(ps.source, "pipeline");
  const p = w.CMP_DATA[PID], p0 = w0.CMP_DATA[PID];
  const wa = w.PDXWordAction.sectionHtml(PID, p) || "", wa0 = w0.PDXWordAction.sectionHtml(PID, p0) || "";
  const num = (h) => (h.match(/class="pdxwa-num-v">([^<]*)</) || [])[1];
  assert.equal(num(wa), num(wa0), "Word vs Action figure unchanged");
  const tree = w.PDXStanceTree.sectionHtml(PID) || "";
  const surfaces = wa + tree + (w._renderEvidenceConnections(PID, p) || "");
  const near = (h) => { const i = h.indexOf("insulin at $35"); return i === -1 ? "" : h.slice(Math.max(0, i - 1500), i + 1500); };
  assert.ok(surfaces.includes("insulin at $35"), "the claim prints on the profile");
  assert.ok(!/Weak signal/.test(near(wa)) && !/Weak signal/.test(near(tree)), "no Weak signal badge beside the claim");
  assert.ok(/not formal actions|not a formal act/i.test(wa), "Word vs Action says Locker statements are not formal actions");
  // The pure mention stays a non-stance.
  const m = P.forIssue(PID, "health_drug_prices")[0];
  assert.ok(m, "mention ingested"); assert.equal(P.strengthOf(m), "mention");
  assert.equal(P.promotedStance(PID, "health_drug_prices"), null, "a mention never promotes a stance");
  assert.ok(/Pharmacy benefit managers/.test(surfaces), "the mention prints"); assert.ok(/Mentions this topic/.test(surfaces) && /not a stance/.test(surfaces));
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log("stated position: all checks pass");
