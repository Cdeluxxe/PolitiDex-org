#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-tier2.mjs — pool v2: official government sources and own
// YouTube channels join the raw-ingest rotation as TIER 2 evidence.
//
//   · Congress.gov pages and own-channel YouTube videos already cited for a
//     politician enter the rotation pool, tagged source_tier 2.
//   · A stance read on a tier-2 source is written to the Evidence Locker the
//     same way as on a tier-1 page — same strength, confidence and rules — with
//     source_tier 2 on the item.
//   · Tier-1 pages are unaffected (tier 1, same ids, same scoring).
//   · News, third-party / chamber YouTube, general archives and retired URLs
//     stay out.
//   · POOL_VERSION is bumped and an older rotation state starts a fresh cycle.
//
//   node scripts/test-raw-ingest-tier2.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = await import("../netlify/lib/raw-ingest-core.mjs");
const social = await import("../netlify/lib/raw-ingest-social.mjs");
const locker = await import("../netlify/lib/evidence-locker-core.mjs");
const { RETIRED_SOURCES } = await import("../netlify/lib/raw-ingest-retired.mjs");
const fn = await import(pathToFileURL(path.join(root, "netlify/functions/raw-ingest-cron.mts")).href);
const POOL = JSON.parse(fs.readFileSync(path.join(root, "db/raw-ingest-pool-expansion-2026-11.json"), "utf8"));

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};
const norm = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};
const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const ALL = core.ROSTER.flatMap((r) => pagesOf(r).map((s) => ({ ...s, row: r.politician_id })));
const TIER2 = ALL.filter((s) => s.source_tier === 2);
const NOW = () => new Date("2026-11-16T08:00:00.000Z");
const rawStore = () => { const data = new Map(); return { data, async get(k) { return data.has(k) ? data.get(k) : null; }, async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); } }; };
const lockerStore = () => {
  const data = new Map();
  return {
    data,
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, opts = {}) { if (opts.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
  };
};
const res = (url, status, body, ct = "text/html; charset=UTF-8") => ({ ok: status >= 200 && status < 300, status, url, headers: new Map([["content-type", ct]]), text: async () => body });

// Spotlight data: which cited YouTube videos are the politician's own channel.
const sctx = { window: {} };
vm.createContext(sctx);
vm.runInContext(fs.readFileSync(path.join(root, "spotlight-cards-data.js"), "utf8"), sctx);
const CITED_YT = Object.entries(sctx.window.SPOTLIGHT_DATA).flatMap(([pid, list]) => (Array.isArray(list) ? list : [])
  .filter((it) => it?.media?.kind === "youtube").map((it) => ({ pid, url: it.media.url, label: it.media.label })));

console.log("raw-ingest tier 2 (official government + own YouTube):");

// ── 1. Congress.gov + own YouTube enter the pool as tier 2 ──────────────────
await t("cited Congress.gov pages enter the rotation pool, tagged tier 2", () => {
  const cg = ALL.filter((s) => host(s.url) === "congress.gov");
  assert.ok(cg.length >= 10, `Congress.gov pages in the roster (${cg.length})`);
  for (const s of cg) {
    assert.equal(s.source_tier, 2, `${s.url} is tier 2`);
    assert.equal(s.source_class, "congress_gov");
    assert.match(new URL(s.url).pathname, /^\/(?:member|bill|amendment|congressional-record)\//, `${s.url}: a member / measure / record page`);
    assert.ok(locker.isCampaignOrOfficial(s.source_type, s.url), `${s.url}: passes the Locker's official-page rule`);
  }
  // Each one is already cited for that politician (politician-stances.js), never guessed.
  const stances = fs.readFileSync(path.join(root, "politician-stances.js"), "utf8");
  for (const s of cg) assert.ok(stances.includes(s.url), `${s.url} is cited on the site`);
  // Member pages are in, both for new rows and for politicians already rotating.
  assert.ok(cg.some((s) => /\/member\//.test(s.url)), "a Congress.gov member page is in");
  assert.ok(Object.values(POOL.extra_sources || {}).flat().some((s) => s.source_class === "congress_gov"), "politicians already rotating gain their cited Congress.gov pages");
});

await t("a video cited from the politician's own YouTube channel enters the pool, tagged tier 2", () => {
  const yt = ALL.filter((s) => s.source_class === "youtube_video");
  assert.ok(yt.length >= 1, "at least one own-channel video");
  for (const s of yt) {
    assert.equal(s.source_tier, 2);
    assert.ok(social.isSocial(s), "filled after official / campaign pages, like other social sources");
    const cited = CITED_YT.find((c) => c.pid === s.politician_id && social.youtubeVideoId(c.url) === social.youtubeVideoId(s.url));
    assert.ok(cited, `${s.url} is cited for ${s.politician_id}`);
    assert.match(cited.label, /channel/i, "labelled as the politician's channel");
  }
  const nguyen = yt.find((s) => s.politician_id === "hoang_nguyen");
  assert.ok(nguyen, "Nguyen's own campaign channel video is in");
  assert.equal(nguyen.url, "https://www.youtube.com/watch?v=c7mYbUvbHq4");
});

await t("other official government hosts: only the politician's own office / member pages, as tier 2", () => {
  const og = ALL.filter((s) => s.source_class === "official_gov" && s.source_tier === 2);
  assert.ok(og.length >= 1);
  for (const s of og) {
    const h = host(s.url);
    assert.ok(/^[a-z0-9-]+\.(?:house|senate)\.gov$/.test(h) || /\.state\.[a-z]{2}\.us$/.test(h), `${s.url}: an office host`);
    assert.ok(/\bofficial\b/.test(s.source_type), `${s.url}: typed as official`);
  }
  // A legislature's bare home page is a general site, not the member's office.
  for (const bare of ["https://www.leg.state.nv.us/", "https://www.njleg.state.nj.us/"]) assert.ok(!ALL.some((s) => norm(s.url) === norm(bare)), `${bare} stays out`);
});

// ── 2. Exclusions ──────────────────────────────────────────────────────────
await t("news and non-official YouTube stay out", () => {
  const inPool = new Set(ALL.map((s) => social.youtubeVideoId(s.url)).filter(Boolean));
  const own = new Set(ALL.filter((s) => s.source_class === "youtube_video").map((s) => social.youtubeVideoId(s.url)));
  for (const c of CITED_YT) {
    const id = social.youtubeVideoId(c.url);
    const thirdParty = /interview|debate|panel|podcast|featuring|news|pbs|c-span|media|report|senate channel|house channel/i.test(c.label);
    if (thirdParty) assert.ok(!inPool.has(id), `${c.pid} ${c.url} (${c.label.slice(0, 60)}…) stays out`);
  }
  // The Utah Senate's chamber channel (cited for Hinkins) is not his own.
  assert.ok(!ALL.some((s) => s.politician_id === "dhinkins" && /youtube/.test(s.url)), "chamber channel stays out");
  assert.equal(own.size, ALL.filter((s) => s.source_class === "youtube_video").length, "one source per video");
  const NEWS = /(?:^|\.)(?:apnews\.com|reuters\.com|npr\.org|pbs\.org|c-span\.org|politico\.com|axios\.com|thehill\.com|cnn\.com|foxnews\.com|nytimes\.com|washingtonpost\.com|ballotpedia\.org|vote411\.org|votesmart\.org|govtrack\.us|wikipedia\.org)$/;
  for (const s of TIER2) assert.ok(!NEWS.test(host(s.url)), `${s.url}: no news / voter guide / reference host`);
  for (const s of POOL.politicians.flatMap((r) => r.sources)) assert.ok(!NEWS.test(host(s.url)), `${s.url}: no news host in the pool`);
});

await t("general archives and retired URLs stay out", () => {
  const ARCHIVE = /(?:^|\.)(?:govinfo\.gov|crsreports\.congress\.gov|federalregister\.gov|archives\.gov|loc\.gov)$/;
  for (const s of TIER2) assert.ok(!ARCHIVE.test(host(s.url)), `${s.url}: no general archive`);
  for (const s of TIER2) if (host(s.url) === "congress.gov") assert.ok(new URL(s.url).pathname.replace(/\/+$/, ""), "the Congress.gov home page stays out");
  assert.ok(!TIER2.some((s) => /\/crs-product\//.test(s.url)), "CRS products stay out");
  const retired = new Set(RETIRED_SOURCES.map((r) => norm(r.url)));
  for (const s of TIER2) assert.ok(!retired.has(norm(s.url)), `${s.url} was retired`);
});

// ── 3. Tier 1 unaffected ───────────────────────────────────────────────────
await t("tier 1 pages are unaffected: every non-tier-2 page reads as tier 1, pool pages keep their ids", () => {
  for (const s of ALL) if (s.source_tier !== 2) assert.equal(core.sourceTierOf(s), 1, s.url);
  for (const r of POOL.politicians) {
    const t1 = r.sources.filter((s) => s.source_tier === 1);
    assert.ok(t1.every((s) => s.source_class === "curated_page"), `${r.politician_id}: tier-1 pool pages are curated first-party pages`);
    // A row's tier-1 source ids depend on its tier-1 pages alone.
    if (t1.length === 1) assert.equal(t1[0].source_id, "pool-page", `${r.politician_id}: single tier-1 page keeps "pool-page"`);
    for (const s of r.sources.filter((x) => x.source_tier === 2)) assert.match(s.source_id, /^tier2-/);
    // Tier-1 pages come first.
    const firstT2 = r.sources.findIndex((s) => s.source_tier === 2);
    if (firstT2 >= 0) assert.ok(r.sources.slice(firstT2).every((s) => s.source_tier === 2), `${r.politician_id}: tier 2 after tier 1`);
  }
  // Configured (non-pool) pages carry no tier tag and read as tier 1.
  assert.equal(core.sourceTierOf(core.SOURCES[0]), 1);
  assert.ok(core.SOURCES.every((s) => !("source_tier" in s)));
  const keys = core.ROSTER.flatMap((r) => r.sources.map((s) => core.rawKey(s, "2026-11-16T00:00:00.000Z")));
  assert.equal(new Set(keys).size, keys.length, "every page has its own raw record key");
});

// ── 4. Stance on a tier-2 source → Locker item with the correct tier ─────────
const CG_URL = "https://www.congress.gov/member/test-member/T000001";
const HC_HTML = "<html><body><h1>Health Care</h1><p>In the Senate, he will fight to lower prescription drug costs and cap insulin co-pays.</p>"
  + "<p>Our bill to bring down out-of-pocket costs for patients passed.</p><p>We will reduce insurance premiums for Texas families.</p></body></html>";
const cgSrc = { politician_id: "tier_test", topic: "healthcare_costs", source_type: "official Congress.gov member page", source_class: "congress_gov", source_tier: 2, source_id: "tier2-member", url: CG_URL };
const t1Src = { politician_id: "tier_test", topic: "healthcare_costs", source_type: "official Senate issue page", source_id: "t1-page", url: "https://www.tiertest.senate.gov/issues/health-care/" };

async function runOne(src, fetchFn) {
  const store = rawStore(), ls = lockerStore(), logs = [];
  const { value } = await quiet(() => fn.run({ fetch: fetchFn, store, lockerStore: ls, now: NOW, sources: [src], log: (l) => logs.push(l) }));
  const report = await value.json();
  return { store, ls, logs, report, own: [...ls.data.values()].filter((i) => !i.page_topic) };
}
const pageFetch = (body) => async (url) => res(url, 200, body);

await t("a stance on a tier-2 Congress.gov page is written to the Locker with source_tier 2", async () => {
  const { store, own, report, logs } = await runOne(cgSrc, pageFetch(HC_HTML));
  const raw = [...store.data.values()][0];
  assert.equal(raw.source_tier, 2, "the raw record carries the tier");
  assert.equal(own.length, 1, "one item on the page's own topic");
  const item = own[0];
  assert.equal(item.position, "support");
  assert.equal(item.strength, "strong");
  assert.equal(item.source_tier, 2, "the Locker item says where it came from");
  assert.equal(item.link, CG_URL);
  assert.equal(item.attribution, "Source: official government page");
  assert.equal(locker.toSpotlightEntry(item).pipeline.source_tier, 2, "served entries carry the tier");
  assert.ok(report.locker_writes.some((w) => w.source_tier === 2), "run report lists the tier");
  assert.ok(logs.some((l) => l.startsWith("evidence-locker: WRITE tier_test|healthcare_costs") && l.includes('"source_tier":2')), "WRITE log line carries the tier");
});

await t("the same page as tier 1 scores identically — only the tier differs", async () => {
  const a = await runOne(cgSrc, pageFetch(HC_HTML));
  const b = await runOne({ ...cgSrc, source_tier: undefined, source_class: undefined, source_id: "tier2-member" }, pageFetch(HC_HTML));
  const strip = (i) => { const { source_tier, ...rest } = i; return rest; };
  assert.equal(a.own[0].source_tier, 2);
  assert.equal(b.own[0].source_tier, 1, "an untagged page is tier 1");
  assert.deepEqual(strip(a.own[0]), strip(b.own[0]), "strength, confidence, reason, rules version — all unchanged");
  assert.equal(a.ls.data.size, b.ls.data.size, "same items across every topic");
  // A real tier-1 page keeps writing as before, tagged tier 1.
  const c = await runOne(t1Src, pageFetch(HC_HTML));
  assert.equal(c.own[0].source_tier, 1);
  assert.equal(c.own[0].strength, "strong");
  assert.ok(!("source_tier" in [...c.store.data.values()][0]), "an untagged tier-1 raw record keeps its shape");
});

await t("implied stances (R15) on a tier-2 page become weak items exactly as on tier 1", async () => {
  const S = await import("../netlify/lib/stance-score-core.mjs");
  // The same aligned-mention fixture the R15 suite uses (test-stance-implied-mentions.mjs).
  const paras = [
    "Social Security must be protected for every retiree.",
    "Medicare should be strengthened for the next generation.",
    "Earned benefits must be preserved in full.",
  ];
  const raw = (tier) => ({ url: CG_URL, final_url: CG_URL, fetched_at: NOW().toISOString(), source_type: "official Congress.gov member page", politician_id: "tier_test", topic: "social_security", http_status: 200, body: `<html><body>${paras.map((p) => `<p>${p}</p>`).join("")}</body></html>`, ...(tier ? { source_tier: tier } : {}) });
  const c2 = S.scoreRawRecord(raw(2)), c1 = S.scoreRawRecord(raw(null));
  assert.deepEqual(c2, c1, "the scorer never reads the tier");
  assert.equal(c2.implied_stance, true, "R15 reads an implied stance");
  const d = locker.lockerDecision(c2, raw(2), null);
  assert.equal(d.write, true);
  assert.equal(d.strength, "weak", "an implied stance on a tier-2 page is a weak item");
  assert.equal(locker.lockerDecision(c1, raw(null), null).strength, "weak", "…exactly as on tier 1");
  const item = locker.buildLockerItem(c2, raw(2), d.strength);
  assert.equal(item.source_tier, 2);
  assert.equal(locker.buildLockerItem(c1, raw(null), d.strength).source_tier, 1);
});

await t("a tier-2 own-channel YouTube video is pulled like a page, scored, and written as tier 2", async () => {
  const id = "c7mYbUvbHq4";
  const src = { politician_id: "tier_test", topic: "healthcare_costs", source_type: "campaign YouTube video (own channel)", source_class: "youtube_video", source_tier: 2, source_id: `tier2-watch-${id.toLowerCase()}`, url: `https://www.youtube.com/watch?v=${id}` };
  const tracks = JSON.stringify([{ baseUrl: `https://www.youtube.com/api/timedtext?v=${id}&lang=en`, languageCode: "en", kind: "asr" }]);
  const watch = `<html><head><meta property="og:title" content="My health care plan"></head><script>var x = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${tracks}}}};"shortDescription":"Our campaign."</script></html>`;
  const transcript = "I will fight to lower prescription drug costs and cap insulin co-pays. We will reduce insurance premiums for families. Our bill to bring down out-of-pocket costs for patients passed.";
  const fetchFn = async (url) => {
    if (url.includes("/watch?v=")) return res(url, 200, watch);
    if (url.includes("/api/timedtext")) return res(url, 200, JSON.stringify({ events: [{ segs: [{ utf8: transcript }] }] }), "application/json");
    return res(url, 404, "");
  };
  const { store, own, report } = await runOne(src, fetchFn);
  const raw = [...store.data.values()][0];
  assert.equal(raw.source_tier, 2);
  assert.ok(raw.body.includes("insurance premiums"), "body is the transcript");
  assert.equal(report.youtube?.transcript, 1, "transcript tallied");
  assert.equal(own.length, 1, "the video is scored and written");
  assert.equal(own[0].source_tier, 2);
  assert.equal(own[0].position, "support");
  assert.equal(own[0].attribution, "Source: campaign YouTube channel");
  // No transcript → the description is used (logged), never a crash.
  const noCap = async (url) => res(url, 200, `<html><title>Clip - YouTube</title>"shortDescription":"Lower drug costs now."</html>`);
  const fb = await runOne(src, noCap);
  assert.ok([...fb.store.data.values()][0].body.includes("Lower drug costs now."));
  assert.ok(fb.logs.some((l) => l.startsWith("raw-ingest: TRANSCRIPT FALLBACK tier_test")));
});

// ── 5. Pool version ─────────────────────────────────────────────────────────
await t("the pool version is bumped and an older rotation state starts a fresh cycle", async () => {
  assert.equal(core.POOL_VERSION, "pool-2026-11-v2");
  assert.equal(POOL.pool_version, core.POOL_VERSION);
  const old = core.rotationStateForPool({ cycle: 4, done: ["aoc", "cox"] });
  assert.equal(old.reset, true, "a v1 (unversioned) state resets");
  assert.deepEqual(old.state, { cycle: 5, done: [] });
  const cur = core.rotationStateForPool({ cycle: 4, done: ["aoc"], pool_version: core.POOL_VERSION });
  assert.equal(cur.reset, false);
  assert.deepEqual(cur.state, { cycle: 4, done: ["aoc"] });
  assert.equal(core.rotationStateForPool(null).reset, false, "no stored state: a normal first cycle");
  // Over a few cycles the planner reaches tier-2 pages.
  let state = {}; const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const plan = core.planRun(state);
    for (const s of plan.sources) if (s.source_tier === 2) seen.add(s.source_class);
    state = plan.state;
    if (seen.has("congress_gov") && seen.has("official_gov")) break;
  }
  assert.ok(seen.has("congress_gov") && seen.has("official_gov"), `tier-2 classes planned (${[...seen].join(", ")})`);
  // The run log counts pages per evidence tier.
  const line = core.runPlanLine([cgSrc, t1Src]);
  assert.deepEqual(line.source_tiers, { "tier 2": 1, "tier 1": 1 });
});

console.log(`\n${failures ? "✗" : "✓"} raw-ingest tier 2: ${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
