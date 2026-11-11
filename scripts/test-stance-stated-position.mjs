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
//   · phase8-v2: explicit floor-speech, press-release and co-sponsor claims are
//     normal stated positions too (never formal records); secondary sources,
//     implication-only pages and other people's quotes stay lower.
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

// ── More primary sources (phase8-v2): floor speeches, releases, co-sponsors ──
const CR = "crockett";
const rawFor = (source_type, body, over = {}) => ({
  url: "https://example.org/r", final_url: "https://example.org/r", fetched_at: "2026-11-10T08:00:00.000Z",
  source_type, politician_id: CR, topic: "healthcare_costs", http_status: 200, body, ...over,
});
const FLOOR = "<p>Madam Speaker, I rise in strong support of H.R. 1234, the Affordable Insulin Now Act, which caps insulin costs at $35 a month.</p>";
const RELEASE = "<p>WASHINGTON — Today, Congresswoman Jasmine Crockett introduced the Affordable Insulin Now Act, legislation that would cap insulin costs at $35 a month.</p>";
const COSPONSOR = "<p>I am proud to co-sponsor the Affordable Insulin Now Act to cap insulin costs for every family.</p>";

await t("phase8-v2: explicit floor-speech, press-release and co-sponsor claims are normal stated positions on existing keys", () => {
  assert.ok(issueKeys.includes("healthcare_costs"));
  const cases = [
    ["floor speech", FLOOR, {}, "floor_speech"],
    ["Congressional Record", FLOOR, {}, "floor_speech"],
    ["page", FLOOR, { url: "https://www.congress.gov/congressional-record/volume-172/issue-1/house-section/article/H100-1", final_url: "https://www.congress.gov/congressional-record/volume-172/issue-1/house-section/article/H100-1" }, "floor_speech"],
    ["news release", RELEASE, {}, "press_release"],
    ["media release", RELEASE, {}, "press_release"],
    ["official House newsroom", RELEASE, {}, "press_release"],
    ["cosponsor announcement", COSPONSOR, {}, "cosponsor_statement"],
    ["co-sponsor statement", COSPONSOR, {}, "cosponsor_statement"],
  ];
  for (const [type, body, over, kind] of cases) {
    const c = S.scoreRawRecord(rawFor(type, body, over));
    assert.equal(c.position, "support", type);
    assert.equal(c.confidence, 0.8, `${type}: ${c.confidence} (${c.confidence_reason})`);
    assert.equal(c.stated_position, true, type);
    assert.equal(c.primary_kind, kind, type);
    assert.equal(c.formal_record, false, type);
    assert.equal(c.layer, "stated", type);
    assert.equal(L.lockerStrength(c).strength, "strong", type);
  }
  // The bill number stays inside its sentence ("H.R." is not a sentence end).
  const floor = S.scoreRawRecord(rawFor("floor speech", FLOOR));
  assert.match(floor.sources[0].excerpt, /H\.R\. 1234, the Affordable Insulin Now Act/);
  // Before phase8-v2 these two read 0.70 (weak): the rule is what moved them.
  assert.match(S.scoreRawRecord(rawFor("news release", RELEASE)).confidence_reason, /\(press release\) reads as a stated position \(R8\)/);
  assert.match(S.scoreRawRecord(rawFor("cosponsor announcement", COSPONSOR)).confidence_reason, /\(co-sponsor statement\) reads as a stated position \(R8\)/);
});

await t("phase8-v2: a non-official release must name a bill or outcome; quotes from someone else never set the position", () => {
  const vague = S.scoreRawRecord(rawFor("news release", "<p>Crockett will lower health care costs.</p>"));
  assert.equal(vague.position, "support");
  assert.equal(vague.confidence, 0.7, "no named bill or outcome: still a weak read");
  assert.ok(!vague.stated_position);
  // The same sentence on an official release, or one naming a figure, qualifies.
  assert.equal(S.scoreRawRecord(rawFor("official news release", "<p>Crockett will lower health care costs.</p>")).confidence, 0.8);
  assert.equal(S.scoreRawRecord(rawFor("news release", "<p>Crockett will lower health care costs by $600 a year.</p>")).confidence, 0.8);
  // Another member quoted in the release is not the candidate speaking.
  const quoted = S.scoreRawRecord(rawFor("news release",
    "<p>“This bill will lower drug costs for every family,” said Rep. Jane Doe, lead sponsor of the Affordable Insulin Now Act.</p>"));
  assert.equal(quoted.confidence, 0.7);
  assert.ok(!quoted.stated_position);
  assert.equal(quoted.sources[0].statements.find((x) => x.kind === "clear").quoted_speaker, "other");
  const multi = S.scoreRawRecord(rawFor("cosponsor announcement",
    "<p>“We have to act. This bill will lower insulin costs at last,” Senator Doe said.</p>"));
  assert.ok(!multi.stated_position, "a multi-sentence quote takes the speaker named where it closes");
  // The candidate's own quote counts.
  const own = S.scoreRawRecord(rawFor("news release",
    "<p>“This bill caps insulin costs at $35 a month,” said Congresswoman Crockett.</p>"));
  assert.equal(own.confidence, 0.8); assert.equal(own.stated_position, true);
  assert.equal(S.quotedSpeakerOf("“We will cut costs,” she said.", CR), "self");
});

await t("phase8-v2: secondary sources and implication-only pages still score lower", () => {
  for (const type of ["news article", "news report", "third-party summary", "voter guide"]) {
    for (const body of [FLOOR, RELEASE, COSPONSOR]) {
      const c = S.scoreRawRecord(rawFor(type, body, { url: "https://news.example.com/x", final_url: "https://news.example.com/x" }));
      assert.ok(c.confidence < 0.8, `${type}: ${c.confidence}`);
      assert.ok(!c.stated_position, type);
      assert.equal(S.primarySourceKind(type, "https://news.example.com/x"), null, type);
    }
  }
  for (const type of ["floor speech", "news release", "cosponsor announcement"]) {
    const imp = S.scoreRawRecord(rawFor(type, "<p>We will confront fentanyl trafficking in every county under H.R. 99.</p>", { topic: "immig_fentanyl" }), "immig_fentanyl");
    assert.ok(imp.confidence < 0.8, `${type}: implication-only stays weak (${imp.confidence})`);
    assert.ok(!imp.stated_position, type);
    const m = S.scoreRawRecord(rawFor(type, "<p>The House debated H.R. 1234 on health care today.</p>"));
    assert.equal(m.position, "no clear position", type);
    assert.equal(L.lockerStrength(m).strength, "mention", type);
  }
  // A weak (non-stated) read from these sources still never enters the Locker.
  const weak = S.scoreRawRecord(rawFor("news release", "<p>Crockett will lower health care costs.</p>"));
  assert.equal(L.lockerDecision(weak, rawFor("news release", "")).write, false);
  // Contested: a floor speech that also runs the other way stays off the floor.
  const split = S.scoreRawRecord(rawFor("cosponsor announcement", COSPONSOR + "<p>I oppose price caps on drugs.</p>"));
  assert.ok(!/\(R8\)/.test(split.confidence_reason));
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

await t("phase8-v2 Locker: floor speech / release / co-sponsor items are strong stated items, never formal records; legacy weak copies re-read", async () => {
  for (const [type, body, kind, label] of [["floor speech", FLOOR, "floor_speech", "floor speech"], ["news release", RELEASE, "press_release", "press release"], ["cosponsor announcement", COSPONSOR, "cosponsor_statement", "co-sponsor statement"]]) {
    const st = fakeStore();
    const raw = rawFor(type, body, { url: `https://example.org/${kind}`, final_url: `https://example.org/${kind}` });
    await L.maybeWriteLockerItem(S.scoreRawRecord(raw), raw, { store: st, gt, log: () => {} });
    const item = [...st.data.values()].find((i) => i.topic === "healthcare_costs");
    assert.ok(item, type);
    assert.equal(item.strength, "strong", type); assert.equal(item.stated_position, true, type);
    assert.equal(item.primary_kind, kind, type); assert.equal(item.formal_record, false, type);
    const e = L.toSpotlightEntry(item);
    assert.equal(e.category, "statement", type);
    assert.equal(e.pipeline.formal_record, false, type); assert.equal(e.pipeline.layer, "stated", type);
    assert.equal(e.pipeline.primary_kind, kind, type);
    assert.match(e.facts, new RegExp(`^In Crockett's ${label}, Crockett stated`), type);
    // The same claim stored as weak under the older rules is re-read when served.
    const legacy = { ...item, confidence: 0.7, strength: "weak", rules_version: "phase8-v1", stated_position: undefined, primary_kind: undefined,
      confidence_reason: "1 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6)" };
    const up = L.regradeStatedPosition(legacy);
    assert.equal(up.strength, "strong", type); assert.equal(up.primary_kind, kind, type);
  }
  const weakRelease = { politician_id: CR, topic: "healthcare_costs", position: "support", confidence: 0.7, strength: "weak", source_type: "news release",
    link: "https://example.org/n", date: "2026-11-01", attribution: "Source: news release", rules_version: "phase8-v1",
    confidence_reason: "1 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6)" };
  assert.equal(L.regradeStatedPosition({ ...weakRelease, excerpt: "Crockett will lower health care costs." }).strength, "weak", "no bill or outcome named");
  assert.equal(L.regradeStatedPosition({ ...weakRelease, excerpt: "“This bill will lower drug costs at $35,” said Rep. Jane Doe." }).strength, "weak", "someone else's quote");
  assert.equal(L.regradeStatedPosition({ ...weakRelease, source_type: "news article", link: "https://news.example.com/x", excerpt: "Crockett will cap insulin at $35." }).strength, "weak", "secondary");
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
  const floorRaw = rawOf({ url: HC_URL + "floor", final_url: HC_URL + "floor", source_type: "floor speech", topic: "public_schools",
    body: "<p>Madam Speaker, I rise in support of H.R. 77, and I will fully fund our public schools.</p>" });
  const floorCand = S.scoreRawRecord(floorRaw);
  assert.equal(floorCand.stated_position, true, "fixture: the floor speech is a stated position");
  const floorItem = L.buildLockerItem(floorCand, floorRaw);
  const entries = [L.toSpotlightEntry(hcItem), L.toSpotlightEntry(mentionItem), L.toSpotlightEntry(floorItem)];
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
  assert.equal(num(wa), num(wa0), "Word vs Action figure unchanged (floor speech, release and co-sponsor reads are not formal records)");
  assert.equal(P.forIssue(PID, "public_schools")[0] && P.strengthOf(P.forIssue(PID, "public_schools")[0]), "strong", "the floor-speech claim is a stated position");
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
