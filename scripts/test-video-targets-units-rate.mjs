#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-targets-units-rate.mjs — video coverage targets, YouTube API
// units, transcription rate
//
//   1. TARGETS. Tier-1 members stay in the video lane until 5–8 video /
//      official-speech Locker items, tier-2 until 3–5 (the high end only while
//      a Word vs Action gap item waits); the lane keeps one member until they
//      reach it (or run out of entries), then moves on; every run logs how
//      many tier-1 / tier-2 members are still under target.
//   2. GAP PREFERENCE. Entries on a Word vs Action gap issue (formal record,
//      no stated position) go first — inside a member, between members, and in
//      the transcript queue.
//   3. API UNITS. search.list = 100 units, list = 1 unit; one
//      "youtube-api: N units (search X, list Y)" line per run; a daily soft
//      guard skips new C-SPAN searches past ~6,000 units.
//   4. RATE. 3 videos per run, woken every 3 minutes; no call starts past the
//      budget and each call has a timeout, so a run ends inside the lock.
//
// No network, no AI calls.   node scripts/test-video-targets-units-rate.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const video = await imp("netlify/lib/raw-ingest-video.mjs");
const vt = await imp("netlify/lib/video-transcripts.mjs");
const freshLib = await imp("netlify/lib/raw-ingest-fresh.mjs");
const wg = await imp("netlify/lib/raw-ingest-word-gap.mjs");
const locker = await imp("netlify/lib/evidence-locker-core.mjs");

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.stack?.split("\n").slice(0, 4).join("\n     ") || e}`); }
}
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};
function memStore(init = {}) {
  const data = new Map(Object.entries(init).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  return {
    data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async getWithMetadata(k) { return data.has(k) ? { data: JSON.parse(JSON.stringify(data.get(k))), etag: "1" } : null; },
    async set(k, v) { data.set(k, v); },
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
    async delete(k) { data.delete(k); },
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const W = (id) => `https://www.youtube.com/watch?v=${id}`;
const fe = (pid, id, { topic = "cost_living", kind = "video post", type = "official YouTube video (own channel) — video post", published = "2026-11-20" } = {}) => ({
  politician_id: pid, topic, source_type: type, source_class: "youtube_video", source_id: `fresh-vs-${id.slice(0, 12).padEnd(12, "0").toLowerCase()}`,
  source_tier: 2, url: W(id), title: `${pid} ${kind}`, published, speech_kind: kind, found_from: "test", found_at: "2026-11-21T00:00:00Z", rank: 6,
});
const HEARING = "official House committee video (House Judiciary Committee) — hearing";

console.log("video targets, API units, transcription rate:");
console.log(" 1 · tier-1 / tier-2 coverage targets");

await t("targets: tier 1 = 5–8 items, tier 2 = 3–5; the high end applies only while a gap item waits", async () => {
  assert.deepEqual({ ...video.VIDEO_LANE_TARGETS[1] }, { min: 5, max: 8 });
  assert.deepEqual({ ...video.VIDEO_LANE_TARGETS[2] }, { min: 3, max: 5 });
  const s = (tier, items, gapWaiting = false, given = 0) => video.videoLaneStatus({ tier, items, gapWaiting, given }).under;
  // Tier 1
  assert.equal(s(1, 0), true); assert.equal(s(1, 4), true, "4 of 5–8 → under");
  assert.equal(s(1, 5), false, "5 items and no gap item waiting → reached");
  assert.equal(s(1, 5, true), true, "5 items with a gap item waiting → stays up to 8");
  assert.equal(s(1, 7, true), true);
  assert.equal(s(1, 8, true), false, "8 items → reached even with gaps waiting");
  // Tier 2
  assert.equal(s(2, 2), true); assert.equal(s(2, 3), false); assert.equal(s(2, 3, true), true); assert.equal(s(2, 5, true), false);
  // Videos that keep yielding nothing: out after 3 × the high end lane slots.
  assert.equal(s(1, 0, false, 8 * video.VIDEO_LANE_SLOT_FACTOR), false);
  assert.equal(s(2, 0, false, 5 * video.VIDEO_LANE_SLOT_FACTOR - 1), true);
  // Other tiers: the earlier slot rule.
  assert.equal(video.videoLaneStatus({ tier: 3, items: 0, given: 2 }).under, true);
  assert.equal(video.videoLaneStatus({ tier: 3, items: 0, given: video.VIDEO_LANE_COVERED }).under, false);
});

const ROSTER = [
  { politician_id: "t1_a", tier: 1 }, { politician_id: "t1_b", tier: 1 }, { politician_id: "t1_done", tier: 1 },
  { politician_id: "t2_a", tier: 2 }, { politician_id: "t2_done", tier: 2 }, { politician_id: "t3_ev", tier: 3 },
];
const COUNTS = Object.fromEntries(ROSTER.map((r) => [`${r.politician_id}|cost_living`, { strong: 1, weak: 0 }]));

await t("tier-1 and tier-2 members are in the lane until their target; members at target and tier 3 with evidence are not", async () => {
  const fr = { frontier: Object.fromEntries(ROSTER.map((r) => [r.politician_id, [fe(r.politician_id, `${r.politician_id}V1`.padEnd(11, "x"))]])), seen: {} };
  const videoItems = { t1_a: 2, t1_b: { items: 4 }, t1_done: 6, t2_a: 1, t2_done: 3 };
  const lines = [];
  const lane = video.planVideoLane(fr, { roster: ROSTER, counts: COUNTS, videoItems, perRun: 2, log: (l) => lines.push(l) });
  assert.deepEqual(lane.eligible.sort(), ["t1_a", "t1_b", "t2_a"]);
  assert.deepEqual(lane.picks.map((p) => p.politician_id), ["t1_a", "t1_b"], "tier 1 before tier 2");
  assert.deepEqual(lane.targets.tier1, { members: 3, under: 2, reached: 1, min: 5, max: 8 });
  assert.deepEqual(lane.targets.tier2, { members: 2, under: 1, reached: 1, min: 3, max: 5 });
  assert.deepEqual(lane.covered, ["t1_done", "t2_done"]);
  const line = lines.find((l) => l.startsWith("video-lane: targets — "));
  assert.equal(line, "video-lane: targets — tier 1: 2 of 3 member(s) under target (5–8 video/speech items) · tier 2: 1 of 2 under target (3–5)");
});

await t("the lane keeps selecting one member until they reach their target or their frontier is empty, then moves on", async () => {
  const fr = { frontier: {
    t1_a: [fe("t1_a", "A0000000001"), fe("t1_a", "A0000000002", { published: "2026-11-21" }), fe("t1_a", "A0000000003", { published: "2026-11-22" })],
    t1_b: [fe("t1_b", "B0000000001")],
  }, seen: {} };
  const roster = [{ politician_id: "t1_b", tier: 1 }, { politician_id: "t1_a", tier: 1 }];
  const counts = { "t1_a|x": { strong: 1 }, "t1_b|x": { strong: 1 } };
  let state = { focus: "t1_a", given: {} };
  const turns = [];
  for (let i = 0; i < 4; i++) {
    const lane = video.planVideoLane(fr, { roster, counts, state, perRun: 1, log: () => {} });
    turns.push(lane.picks.map((p) => p.url.slice(-11)).join(","));
    for (const p of lane.picks) fr.seen[freshLib.normUrl(p.url)] = "read";   // the pull marks it read
    state = lane.state;
  }
  assert.deepEqual(turns, ["A0000000003", "A0000000002", "A0000000001", "B0000000001"], "t1_a until its frontier is empty, then t1_b");
  // Reaching the target ends the focus even with entries left.
  const fr2 = { frontier: { t1_a: [fe("t1_a", "A0000000009")], t1_b: [fe("t1_b", "B0000000009")] }, seen: {} };
  const done = video.planVideoLane(fr2, { roster, counts, state: { focus: "t1_a", given: { t1_a: 5 } }, videoItems: { t1_a: 5 }, perRun: 1, log: () => {} });
  assert.deepEqual(done.picks.map((p) => p.politician_id), ["t1_b"]);
  assert.ok(done.covered.includes("t1_a"));
  // Both slots go to the focus member when they have two entries.
  const two = video.planVideoLane({ frontier: { t1_a: [fe("t1_a", "A0000000011"), fe("t1_a", "A0000000012")], t1_b: [fe("t1_b", "B0000000011")] }, seen: {} },
    { roster, counts, state: { focus: "t1_a", given: {} }, perRun: 2, log: () => {} });
  assert.deepEqual(two.picks.map((p) => p.politician_id), ["t1_a", "t1_a"]);
  assert.equal(two.state.focus, "t1_a");
});

await t("a real ingest run logs tier-1 / tier-2 members under target and reports the tally", async () => {
  const cron = await imp("netlify/functions/raw-ingest-cron.mts");
  const core = await imp("netlify/lib/raw-ingest-core.mjs");
  const row = (pid, tier) => ({ politician_id: pid, name: pid, tier, has_board: true, has_stances: true,
    sources: [{ politician_id: pid, topic: "cost_living", source_type: "official issue page", source_id: `${pid}-p0`, url: `https://${pid}.example.gov/p0` }] });
  const roster = [row("t1_a", 1), row("t2_a", 2), row("t2_done", 2)];
  const counts = { "t1_a|cost_living": { strong: 1 }, "t2_a|cost_living": { strong: 1 }, "t2_done|cost_living": { strong: 1 } };
  const fetch = async (u) => ({ ok: true, status: 200, url: String(u), headers: new Map([["content-type", "text/html"]]), text: async () => "<html><body><p>Hello.</p></body></html>", json: async () => ({}) });
  const logs = [];
  const { value: res } = await quiet(() => cron.run({
    fetch, store: memStore(), lockerStore: memStore(), rotationStore: memStore({ [core.ROTATION_KEY]: { cycle: 1, done: [], pool_version: core.POOL_VERSION } }), transcriptStore: memStore(),
    rotate: { roster, max: 4, counts, state: { cycle: 1, done: [] }, videoItems: { t2_done: 4 } },
    fresh: { state: { frontier: { t2_a: [fe("t2_a", "T2aHearing1", { kind: "hearing", type: HEARING })] }, seen: {} } },
    videoSpeech: { youtubeKey: "", govinfoKey: "", channels: false, lane: { state: {} }, youtubeUnits: { day: "2026-11-27", units: 0 } },
    now: () => new Date("2026-11-27T20:00:00Z"), curatedStances: {}, statedDb: null, log: (l) => logs.push(l),
  }));
  const report = await res.json();
  assert.deepEqual(report.video_lane.targets.tier1, { members: 1, under: 1, reached: 0, min: 5, max: 8 });
  assert.deepEqual(report.video_lane.targets.tier2, { members: 2, under: 1, reached: 1, min: 3, max: 5 });
  assert.equal(report.video_lane.pulled[0].url, W("T2aHearing1"), "the tier-2 member under target got the reserved slot");
  assert.ok(logs.some((l) => l.startsWith("video-lane: targets — tier 1: 1 of 1 member(s) under target")), "targets line logged");
  assert.ok(logs.some((l) => /^raw-ingest: video lane — .* under target: tier 1 1\/1, tier 2 1\/2$/.test(l)));
});

await t("video / official-speech Locker items are tallied per member alongside the baseline counts (counts keep their shape)", async () => {
  const ls = memStore();
  const put = (it) => ls.data.set(locker.lockerKey(it), it);
  put({ politician_id: "p", topic: "cost_living", position: "support", confidence: 0.8, strength: "strong", link: "https://www.youtube.com/watch?v=AAAAAAAAAAA&t=42s", excerpt: "x", source_type: "official YouTube video (own channel) — video post" });
  put({ politician_id: "p", topic: "housing", position: "support", confidence: 0.6, strength: "weak", link: "https://www.govinfo.gov/content/pkg/CREC-1/html/CREC-1-pt1-PgH1.htm", excerpt: "x", source_type: "official floor speech (Congressional Record)" });
  put({ politician_id: "p", topic: "housing", position: "support", confidence: 0.8, strength: "strong", link: "https://p.example.gov/issues", excerpt: "y", source_type: "official issue page" });
  put({ politician_id: "p", topic: "taxes", position: "mention", confidence: 0.2, strength: "mention", link: "https://www.youtube.com/watch?v=BBBBBBBBBBB", excerpt: "z" });
  const v = {};
  const counts = await locker.lockerBaselineCounts(ls, { log: () => {}, video: v });
  assert.deepEqual(counts["p|housing"], { strong: 1, weak: 1 });
  assert.deepEqual(v, { p: { items: 2, topics: { cost_living: 1, housing: 1 } } }, "mentions and web pages are not video items");
  const cs = memStore();
  const r = await locker.cachedBaselineCounts(ls, cs, { log: () => {}, now: () => new Date("2026-11-27T10:00:00Z") });
  assert.equal(r.video.p.items, 2);
  const again = await locker.cachedBaselineCounts(ls, cs, { log: () => {}, pids: ["p"], now: () => new Date("2026-11-27T10:05:00Z") });
  assert.equal(again.source, "cache"); assert.equal(again.video.p.items, 2, "the tally is cached with the counts");
});

console.log(" 2 · preference for Word vs Action gap items");
// Formal record on housing, no stated position → housing is a gap issue.
const GAPS = wg.buildWordGaps({ formal: { t1_a: ["housing"], t1_b: ["housing"] }, stated: { t1_a: ["cost_living"], t1_b: ["cost_living"] } });

await t("inside a member a gap item goes before a hearing, and is marked wva_gap", async () => {
  const fr = { frontier: { t1_a: [fe("t1_a", "AHearing001", { kind: "hearing", type: HEARING }), fe("t1_a", "AGapOffic01", { topic: "housing" })] }, seen: {} };
  const lane = video.planVideoLane(fr, { roster: [{ politician_id: "t1_a", tier: 1 }], counts: COUNTS, wordGaps: GAPS, perRun: 2, log: () => {} });
  assert.deepEqual(lane.picks.map((p) => p.url), [W("AGapOffic01"), W("AHearing001")]);
  assert.equal(lane.picks[0].wva_gap, true); assert.equal(lane.picks[1].wva_gap, undefined);
  assert.equal(video.isWvaGapEntry(fe("t1_a", "x", { topic: "housing" }), GAPS), true);
  assert.equal(video.isWvaGapEntry(fe("t1_a", "x", { topic: "cost_living" }), GAPS), false, "an issue with a stated position is not a gap");
  assert.equal(video.isWvaGapEntry(fe("t1_a", "x", { topic: "housing" }), null), false);
});

await t("between members of the same tier, the one with a gap item waiting goes first", async () => {
  const fr = { frontier: {
    t1_a: [fe("t1_a", "AHearing002", { kind: "hearing", type: HEARING })],
    t1_b: [fe("t1_b", "BGapVideo01", { topic: "housing" })],
  }, seen: {} };
  const roster = [{ politician_id: "t1_a", tier: 1 }, { politician_id: "t1_b", tier: 1 }];
  const lane = video.planVideoLane(fr, { roster, counts: COUNTS, wordGaps: GAPS, perRun: 1, log: () => {} });
  assert.deepEqual(lane.picks.map((p) => p.politician_id), ["t1_b"]);
  const without = video.planVideoLane(fr, { roster, counts: COUNTS, perRun: 1, log: () => {} });
  assert.deepEqual(without.picks.map((p) => p.politician_id), ["t1_a"], "without gaps the hearing member goes first");
});

await t("a gap item waiting keeps a member at the low end of their target in the lane", async () => {
  const roster = [{ politician_id: "t1_a", tier: 1 }];
  const gapFr = { frontier: { t1_a: [fe("t1_a", "AGapOffic03", { topic: "housing" })] }, seen: {} };
  const plainFr = { frontier: { t1_a: [fe("t1_a", "APlainOff03")] }, seen: {} };
  assert.equal(video.planVideoLane(gapFr, { roster, counts: COUNTS, wordGaps: GAPS, videoItems: { t1_a: 6 }, log: () => {} }).reserved, 1);
  assert.equal(video.planVideoLane(plainFr, { roster, counts: COUNTS, wordGaps: GAPS, videoItems: { t1_a: 6 }, log: () => {} }).reserved, 0);
});

await t("the transcript queue takes a gap item first among items of the same kind; hearing / floor still leads", async () => {
  const row = (key, { kind = "video post", gap = false, tier = 1 } = {}) => ({ key, entry: { video_id: key, src: { politician_id: "p", speech_kind: kind, source_type: "official YouTube video (own channel) — x" }, priority: { tier, ...(gap ? { gap: true } : {}) } } });
  const order = vt.orderQueue([row("plain"), row("gap", { gap: true }), row("hearing", { kind: "hearing" }), row("gapT2", { gap: true, tier: 2 })]).map((r) => r.key);
  assert.deepEqual(order, ["hearing", "gap", "gapT2", "plain"]);
});

console.log(" 3 · YouTube Data API units");

await t("search costs 100 units, a list call 1; the summary line has the requested shape", async () => {
  const m = video.createYoutubeMeter({});
  m.charge("search"); m.charge("list"); m.charge("list");
  assert.equal(m.units, 102); assert.equal(m.search, 100); assert.equal(m.list, 2);
  assert.match(video.youtubeUnitsLine(m), /^youtube-api: 102 units \(search 100, list 2\)/);
  assert.match(video.youtubeUnitsLine(video.createYoutubeMeter({})), /^youtube-api: 0 units \(search 0, list 0\)/);
});

const MASSIE_FETCH = (calls) => async (u) => {
  const url = String(u); calls.push(url);
  if (url.includes("/feeds/videos.xml")) return { ok: false, status: 500, text: async () => "" };
  if (url.includes("/youtube/v3/playlistItems")) return { ok: true, status: 200, json: async () => ({ items: [{ snippet: { resourceId: { videoId: "MassieUp001" }, title: "Massie on the floor", publishedAt: "2026-11-26" } }] }) };
  if (url.includes("/youtube/v3/search")) return { ok: true, status: 200, json: async () => ({ items: [{ id: { videoId: "MassieCsp01" }, snippet: { title: "Rep. Thomas Massie at hearing", publishedAt: "2026-11-25" } }] }) };
  return { ok: false, status: 404, text: async () => "" };
};

await t("discovery counts the units it sends: uploads fallback (list) + C-SPAN search", async () => {
  const calls = [];
  const meter = video.createYoutubeMeter({ dayUnits: 0, day: "2026-11-27" });
  const out = await video.discoverVideoSpeech({ politicians: ["massie"], fresh: { frontier: {}, seen: {} }, fetch: MASSIE_FETCH(calls), state: { last: {} }, youtubeKey: "k", govinfoKey: "", mergeFrontier: freshLib.mergeFrontier, youtubeMeter: meter, log: () => {} });
  assert.deepEqual({ units: out.youtube_api.units, search: out.youtube_api.search, list: out.youtube_api.list }, { units: 101, search: 100, list: 1 });
  assert.equal(calls.filter((c) => c.includes("googleapis")).length, 2);
  assert.equal(video.youtubeUnitsLine(meter), "youtube-api: 101 units (search 100, list 1) · 1 search call(s), 1 list call(s) · 101 units today (2026-11-27 Pacific)");
});

await t("the soft daily guard skips new C-SPAN searches past ~6,000 units; list calls still run", async () => {
  assert.equal(video.YOUTUBE_SEARCH_GUARD_UNITS, 6_000);
  const calls = []; const logs = [];
  const meter = video.createYoutubeMeter({ dayUnits: 5_950, day: "2026-11-27" });
  const out = await video.discoverVideoSpeech({ politicians: ["massie"], fresh: { frontier: {}, seen: {} }, fetch: MASSIE_FETCH(calls), state: { last: {} }, youtubeKey: "k", govinfoKey: "", mergeFrontier: freshLib.mergeFrontier, youtubeMeter: meter, log: (l) => logs.push(l) });
  assert.ok(!calls.some((c) => c.includes("/youtube/v3/search")), "no search request sent");
  assert.ok(calls.some((c) => c.includes("/youtube/v3/playlistItems")));
  assert.equal(out.youtube_api.search, 0); assert.equal(out.youtube_api.list, 1); assert.equal(out.youtube_api.search_skipped, 1);
  assert.ok(logs.some((l) => /SKIP massie YouTube C-SPAN search .* daily YouTube API guard/.test(l)));
  assert.match(video.youtubeUnitsLine(meter), /1 C-SPAN search\(es\) skipped by the daily guard/);
});

await t("the day's total is kept per Pacific quota day and resets on a new day", async () => {
  const st = memStore();
  const at = new Date("2026-11-27T20:00:00Z");
  assert.equal(video.youtubeQuotaDay(new Date("2026-11-28T07:30:00Z")), "2026-11-27", "before midnight Pacific");
  assert.equal(video.youtubeQuotaDay(new Date("2026-11-28T08:30:00Z")), "2026-11-28");
  const m = video.createYoutubeMeter({}); m.charge("search"); m.charge("list");
  await video.saveYoutubeUnits(st, m, { now: at, log: () => {} });
  await video.saveYoutubeUnits(st, m, { now: at, log: () => {} });
  assert.deepEqual(await video.readYoutubeUnits(st, at), { day: "2026-11-27", units: 202, search: 200, list: 2 });
  assert.equal((await video.readYoutubeUnits(st, new Date("2026-11-29T12:00:00Z"))).units, 0, "a new quota day starts at 0");
});

await t("every ingest run logs one youtube-api line and stores the day's total", async () => {
  const cron = await imp("netlify/functions/raw-ingest-cron.mts");
  const core = await imp("netlify/lib/raw-ingest-core.mjs");
  const roster = [{ politician_id: "massie", name: "Thomas Massie", tier: 1, has_board: true, has_stances: true, sources: [{ politician_id: "massie", topic: "cost_living", source_type: "official issue page", source_id: "m-p0", url: "https://massie.example.gov/p0" }] }];
  const calls = [];
  const base = MASSIE_FETCH(calls);
  const fetch = async (u, o) => (String(u).includes("massie.example.gov") ? { ok: true, status: 200, url: String(u), headers: new Map([["content-type", "text/html"]]), text: async () => "<html><body><p>Hi.</p></body></html>" } : base(u, o));
  const rot = memStore({ [core.ROTATION_KEY]: { cycle: 1, done: [], pool_version: core.POOL_VERSION } });
  const logs = [];
  const { value: res } = await quiet(() => cron.run({
    fetch, store: memStore(), lockerStore: memStore(), rotationStore: rot, transcriptStore: memStore(),
    rotate: { roster, max: 4, counts: {}, state: { cycle: 1, done: [] } }, fresh: { state: { frontier: {}, seen: {} } },
    videoSpeech: { youtubeKey: "k", govinfoKey: "", channels: false, state: { last: {} }, lane: { state: {} } },
    now: () => new Date("2026-11-27T20:00:00Z"), curatedStances: {}, statedDb: null, log: (l) => logs.push(l),
  }));
  const report = await res.json();
  const lines = logs.filter((l) => l.startsWith("youtube-api: "));
  assert.equal(lines.length, 1, "one summary line per run");
  assert.match(lines[0], /^youtube-api: 101 units \(search 100, list 1\)/);
  assert.equal(report.youtube_api.units, 101);
  assert.equal((await rot.get(video.YOUTUBE_UNITS_STATE_KEY)).units, 101, "the day's total is stored");
});

console.log(" 4 · transcription rate inside the time budget");
const CLEAR = { segments: [{ start: "0:05", text: "I will fight to lower prices for working families.", speaker_is_politician: true }] };
const SRC = { politician_id: "pat_doe", topic: "cost_living", source_type: "official YouTube video (own channel) — video post", source_class: "youtube_video", url: W("AAAAAAAAAAA") };
async function queueN(ts, n, { hearing = false } = {}) {
  for (let i = 0; i < n; i++) {
    const id = `Rate${String(i).padStart(7, "0")}`;
    await vt.enqueueTranscript(ts, { ...SRC, source_id: `rate-${i}`, url: W(id), ...(hearing ? { speech_kind: "hearing", source_type: HEARING } : {}) }, { videoId: id, title: hearing ? "Hearing" : `v${i}` });
  }
}
// Simulated clock: a Gemini call takes `callMs`, a pause takes its length.
function simulated({ callMs, segments = () => CLEAR }) {
  let now = 1_000_000;
  const starts = [];
  return {
    clock: () => now,
    starts,
    sleep: async (ms) => { now += ms; },
    generate: async (args) => { starts.push(now); now += callMs; return segments(args); },
  };
}

await t("the new rate: 3 videos per run, woken every 3 minutes; a normal 3-video run fits inside one 3-minute wake", async () => {
  assert.equal(vt.TRANSCRIBE_PER_RUN, 3);
  const cronSrc = fs.readFileSync(path.join(root, "netlify/functions/video-transcribe-cron.mts"), "utf8");
  assert.match(cronSrc, /schedule: "\*\/3 \* \* \* \*"/);
  const ts = memStore(); await queueN(ts, 5);
  const sim = simulated({ callMs: 40_000 });
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), generate: sim.generate, sleep: sim.sleep, clock: sim.clock, log: () => {} }));
  assert.equal(value.transcribed, 3); assert.equal(value.remaining, 2);
  assert.ok(value.elapsed_ms <= 3 * 60_000, `3 videos took ${value.elapsed_ms / 1000} s (≤ 180 s)`);
  assert.ok(!ts.data.has(vt.LOCK_KEY), "lock released");
});

await t("slow calls and long hearings: no call starts after the budget, and the run ends inside the 15-min lock", async () => {
  const ts = memStore(); await queueN(ts, 3, { hearing: true });
  // Every window: lots of other speakers, none of the member → more windows are read.
  const sim = simulated({ callMs: vt.TRANSCRIBE_CALL_TIMEOUT_MS - 1_000, segments: ({ startSeconds = 0 }) => ({ segments: Array.from({ length: 10 }, (_, i) => ({ start: String(startSeconds + 115 * (i + 1)), text: `Witness answer ${i}.`, speaker_is_politician: false })) }) });
  const logs = [];
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), generate: sim.generate, sleep: sim.sleep, clock: sim.clock, log: (l) => logs.push(l) }));
  const t0 = 1_000_000;
  for (const s of sim.starts) assert.ok(s - t0 <= vt.TRANSCRIBE_BUDGET_MS, `a call started at ${(s - t0) / 60_000} min`);
  assert.ok(value.elapsed_ms <= vt.TRANSCRIBE_BUDGET_MS + vt.TRANSCRIBE_CALL_TIMEOUT_MS, `run took ${value.elapsed_ms / 60_000} min`);
  assert.ok(value.elapsed_ms + vt.TRANSCRIBE_CALL_DELAY_MS < vt.LOCK_TTL_MS, "ends (with the wake pause) before the lock expires");
  assert.ok(value.transcribed + value.deferred <= 3);
  assert.ok(logs.some((l) => /time budget reached/.test(l)), "the budget stop is logged");
  assert.ok(!ts.data.has(vt.LOCK_KEY), "lock released");
});

await t("a video left at the budget stays queued untouched (no attempt spent); the whole worker run stays inside its limit", async () => {
  const worker = await imp("netlify/functions/video-transcribe.mts");
  const ts = memStore(); await queueN(ts, 3, { hearing: true });
  // 2.4 min a call (just inside the timeout), hearings read in 3 windows each:
  // the 3rd hearing's first call would start past the 11-min budget.
  const sim = simulated({ callMs: 2.4 * 60_000, segments: ({ startSeconds = 0 }) => ({ segments: Array.from({ length: 10 }, (_, i) => ({ start: String(startSeconds + 115 * (i + 1)), text: `Witness answer ${i}.`, speaker_is_politician: false })) }) });
  const { value } = await quiet(() => worker.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: memStore(), generate: sim.generate, sleep: sim.sleep, clock: sim.clock, log: () => {}, wake: async () => {}, sync: null, repair: false, reprocess: { requests: [] } }));
  assert.equal(value.transcribed, 2, "two hearings read; the third waits (stopped at the budget, before its call)");
  const left = [...ts.data.keys()].filter((k) => k.startsWith("queue/"));
  assert.equal(left.length, 1);
  assert.equal(ts.data.get(left[0]).attempts, 0, "a video left at the budget spends no attempt");
  for (const st of sim.starts) assert.ok(st - 1_000_000 <= vt.TRANSCRIBE_BUDGET_MS);
  assert.ok(sim.clock() - 1_000_000 < worker.RUN_LIMIT_MS + 60_000 && sim.clock() - 1_000_000 < vt.LOCK_TTL_MS, `whole run ${(sim.clock() - 1_000_000) / 60_000} min`);
});

await t("a hanging Gemini call is cut off by the call timeout and counts as a failed attempt", async () => {
  const ts = memStore(); await queueN(ts, 1);
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), generate: () => new Promise(() => {}), callTimeoutMs: 30, callDelayMs: 0, log: () => {} }));
  assert.equal(value.retry_later, 1);
  const q = [...ts.data.entries()].find(([k]) => k.startsWith("queue/"))[1];
  assert.match(q.last_error, /timed out/);
});

console.log(`${failures ? "✗" : "✓"} video targets / API units / rate: ${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
