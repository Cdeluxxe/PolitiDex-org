#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-lane-reprocess.mjs — video priority lane + transcript versions
//
//   1. VIDEO LANE. Up to 2 slots per run are reserved for video / speech
//      frontier entries of tier-1 and zero-evidence members, hearing / floor
//      first; a member leaves the lane once covered; everyone else keeps the
//      leftover-slot behaviour. Checked on planVideoLane and on a real run.
//   2. VERSIONS. Cached transcripts carry prompt_version / schema_version
//      (older docs are read with inferred versions); a selected video can be
//      re-transcribed on request, safely (a failed re-run keeps the old doc).
//   3. RESCORE. A video Locker item under older rules is re-read from its
//      stored video record, moved to the key of its corrected link — never
//      duplicated; on-demand requests (db/video-reprocess.json) work once.
//   4. SPEAKER CONFIDENCE. A mixed video whose cited words have an uncertain
//      speaker reads as a mention.
//
// No network, no AI calls.   node scripts/test-video-lane-reprocess.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const vt = await imp("netlify/lib/video-transcripts.mjs");
const video = await imp("netlify/lib/raw-ingest-video.mjs");
const locker = await imp("netlify/lib/evidence-locker-core.mjs");
const RS = await imp("netlify/lib/locker-rescore.mjs");
const RP = await imp("netlify/lib/video-reprocess.mjs");
const ss = await imp("netlify/lib/stance-score-core.mjs");
const freshLib = await imp("netlify/lib/raw-ingest-fresh.mjs");

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
    async list({ prefix = "", directories = false } = {}) {
      const keys = [...data.keys()].filter((k) => k.startsWith(prefix));
      if (!directories) return { blobs: keys.map((key) => ({ key })) };
      const dirs = new Set(), blobs = [];
      for (const k of keys) { const rest = k.slice(prefix.length); const i = rest.indexOf("/"); if (i >= 0) dirs.add(prefix + rest.slice(0, i)); else blobs.push({ key: k }); }
      return { blobs, directories: [...dirs] };
    },
  };
}
const NOW = () => new Date("2026-11-28T16:00:00.000Z");
const W = (id) => `https://www.youtube.com/watch?v=${id}`;

// ── Lane fixtures ──────────────────────────────────────────────────────────
const fe = (pid, id, { kind = "video post", type = "official YouTube video (own channel) — video post", cls = "youtube_video", published = "2026-11-20", url = null } = {}) => ({
  politician_id: pid, topic: "cost_living", source_type: type, source_class: cls, source_id: `fresh-vs-${id.slice(0, 12).padEnd(12, "0").toLowerCase()}`,
  source_tier: 2, url: url || W(id), title: `${pid} ${kind}`, published, speech_kind: kind, found_from: "test", found_at: "2026-11-21T00:00:00Z", rank: 6,
});
const LANE_ROSTER = [
  { politician_id: "t1_member", name: "Tee One", tier: 1, sources: [] },
  { politician_id: "zero_ev", name: "Zero Ev", tier: 3, sources: [] },
  { politician_id: "t2_covered", name: "Tee Two", tier: 2, sources: [] },
];
const LANE_COUNTS = { "t1_member|cost_living": { strong: 2 }, "t2_covered|housing": { strong: 1 } };
const laneFrontier = () => ({ frontier: {
  t1_member: [
    fe("t1_member", "T1Campaign1", { kind: "video post", type: "campaign YouTube video — video post", published: "2026-11-26" }),
    fe("t1_member", "T1Hearing01", { kind: "hearing", type: "official House committee video (House Judiciary Committee) — hearing", published: "2026-11-10" }),
    fe("t1_member", "T1Official1", { published: "2026-11-25" }),
  ],
  zero_ev: [fe("zero_ev", "ZeroCspan01", { kind: "video post", type: "official House proceedings video (C-SPAN) — video post" })],
  t2_covered: [fe("t2_covered", "T2Floor0001", { kind: "floor speech", type: "official YouTube video (own channel) — floor speech" })],
}, seen: {} });

console.log("video lane + transcript versions:");
console.log(" 1 · video priority lane");

await t("the lane reserves ≤ 2 slots for tier-1 / zero-evidence members, zero-evidence first, hearing / floor first inside a member", async () => {
  const lane = video.planVideoLane(laneFrontier(), { roster: LANE_ROSTER, counts: LANE_COUNTS, log: () => {} });
  assert.equal(lane.reserved, 2);
  assert.deepEqual(lane.eligible.sort(), ["t1_member", "zero_ev"], "tier 2 with evidence is not in the lane");
  assert.deepEqual(lane.picks.map((p) => p.politician_id), ["zero_ev", "t1_member"], "zero-evidence member first, then tier 1");
  const t1 = lane.picks.find((p) => p.politician_id === "t1_member");
  assert.equal(t1.url, W("T1Hearing01"), "the hearing wins over newer official / campaign videos");
  assert.equal(t1.video_lane, true);
  for (const p of lane.picks) { assert.equal(p.rank, undefined); assert.equal(p.found_from, undefined); assert.ok(video.isVideoSpeechEntry(p)); }
  assert.deepEqual(lane.state.given, { zero_ev: 1, t1_member: 1 });
});

await t("entry order: hearing / floor > C-SPAN / committee > official > campaign", async () => {
  assert.equal(video.videoEntryRank({ speech_kind: "floor speech" }), 0);
  assert.equal(video.videoEntryRank({ source_class: "hearing_transcript" }), 0);
  assert.equal(video.videoEntryRank({ speech_kind: "video post", source_type: "official Senate proceedings video (C-SPAN) — video post" }), 1);
  assert.equal(video.videoEntryRank({ speech_kind: "video post", source_type: "official Senate party conference video (Senate Democrats) — video post" }), 1);
  assert.equal(video.videoEntryRank({ speech_kind: "video post", source_type: "official YouTube video (own channel) — video post" }), 2);
  assert.equal(video.videoEntryRank({ speech_kind: "video post", source_type: "campaign YouTube video — video post" }), 3);
});

await t("a member with a hearing goes before one with only a campaign video; a lone member fills the spare slot", async () => {
  const fr = { frontier: {
    a_campaign: [fe("a_campaign", "ACampaign01", { type: "campaign YouTube video — video post" })],
    b_hearing: [fe("b_hearing", "BHearing001", { kind: "hearing" }), fe("b_hearing", "BOfficial01")],
  }, seen: {} };
  const roster = [{ politician_id: "a_campaign", tier: 1 }, { politician_id: "b_hearing", tier: 1 }];
  const one = video.planVideoLane(fr, { roster, counts: { "a_campaign|x": { strong: 1 }, "b_hearing|x": { strong: 1 } }, perRun: 1, log: () => {} });
  assert.deepEqual(one.picks.map((p) => p.url), [W("BHearing001")]);
  const solo = video.planVideoLane({ frontier: { b_hearing: fr.frontier.b_hearing }, seen: {} }, { roster, counts: {}, log: () => {} });
  assert.deepEqual(solo.picks.map((p) => p.url), [W("BHearing001"), W("BOfficial01")], "spare slot → the member's next entry");
});

await t("lap rotation, then coverage: a member who got VIDEO_LANE_COVERED slots leaves the lane", async () => {
  const fr = laneFrontier();
  let state = null;
  const turns = [];
  for (let i = 0; i < 3; i++) {
    const lane = video.planVideoLane(fr, { roster: LANE_ROSTER, counts: LANE_COUNTS, state, perRun: 1, log: () => {} });
    turns.push(lane.picks.map((p) => p.politician_id).join(","));
    state = lane.state;
  }
  assert.deepEqual(turns, ["zero_ev", "t1_member", "zero_ev"], "one slot alternates through the lap");
  const covered = video.planVideoLane(fr, { roster: LANE_ROSTER, counts: LANE_COUNTS, state: { lap_done: [], given: { zero_ev: video.VIDEO_LANE_COVERED } }, log: () => {} });
  assert.ok(!covered.eligible.includes("zero_ev"), "covered member dropped out");
  assert.deepEqual(covered.covered, ["zero_ev"]);
  assert.deepEqual([...new Set(covered.picks.map((p) => p.politician_id))], ["t1_member"]);
});

await t("entries already in the pull list, already read or waiting in the transcript queue are not given a lane slot", async () => {
  const fr = laneFrontier();
  fr.seen[freshLib.normUrl(W("ZeroCspan01"))] = "2026-11-27";
  const lane = video.planVideoLane(fr, { roster: LANE_ROSTER, counts: LANE_COUNTS, known: new Set([freshLib.normUrl(W("T1Hearing01"))]), pendingVideoIds: new Set(["T1Official1"]), log: () => {} });
  assert.deepEqual(lane.picks.map((p) => p.url), [W("T1Campaign1")]);
  assert.equal(video.planVideoLane({ frontier: {}, seen: {} }, { roster: LANE_ROSTER, counts: {}, log: () => {} }).reserved, 0, "nothing waiting → nothing reserved");
});

await t("on a real run the reserved slot carries the tier-1 member's hearing even when the rotation does not plan them", async () => {
  const cron = await imp("netlify/functions/raw-ingest-cron.mts");
  const core = await imp("netlify/lib/raw-ingest-core.mjs");
  const row = (pid, tier, n) => ({ politician_id: pid, name: pid, tier, has_board: true, has_stances: true,
    sources: Array.from({ length: n }, (_, i) => ({ politician_id: pid, topic: "cost_living", source_type: "official issue page", source_id: `${pid}-p${i}`, url: `https://${pid}.example.gov/p${i}` })) });
  // big_member fills the whole run cap by itself; t1_member is never planned.
  const roster = [row("big_member", 2, 8), row("t1_member", 1, 1)];
  const counts = { "t1_member|cost_living": { strong: 5 }, "t1_member|housing": { strong: 5 } };
  const fr = laneFrontier();
  const fetch = async (u) => ({ ok: true, status: 200, url: String(u), headers: new Map([["content-type", "text/html"]]), text: async () => "<html><body><p>I will lower prices for families.</p></body></html>", json: async () => ({ title: "t", author_name: "a", author_url: "https://www.youtube.com/@a" }) });
  const { value: res } = await quiet(() => cron.run({
    fetch, store: memStore(), lockerStore: memStore(), rotationStore: memStore({ [core.ROTATION_KEY]: { cycle: 3, done: ["t1_member"], pool_version: core.POOL_VERSION } }), transcriptStore: memStore(),
    rotate: { roster, max: 4, counts, state: { cycle: 3, done: ["t1_member"] } }, fresh: { state: { frontier: { t1_member: fr.frontier.t1_member }, seen: {} } },
    videoSpeech: { youtubeKey: "", govinfoKey: "", channels: false, lane: { state: {} } }, now: NOW, curatedStances: {}, statedDb: null,
  }));
  const report = await res.json();
  assert.ok(!report.plan.politicians.includes("t1_member"), "the rotation did not plan the tier-1 member");
  assert.ok(report.plan.planned_size <= 3, `the plan left room for the reserved slot (planned ${report.plan.planned_size})`);
  assert.equal(report.video_lane.reserved, 2);
  assert.equal(report.video_lane.pulled[0].url, W("T1Hearing01"), "the hearing was pulled first");
  const urls = report.included.sources.map((s) => s.url);
  assert.ok(urls.includes(W("T1Hearing01")));
  assert.ok(urls.length <= 4, `run cap holds (${urls.length})`);
});

// ── 2. Versions ─────────────────────────────────────────────────────────────
console.log(" 2 · transcript versions + re-transcription");
const GRIJALVA = JSON.parse(fs.readFileSync(path.join(root, "scripts/fixtures/video-G1xkgCCvPvY-transcript.json"), "utf8"));
const SRC = { politician_id: "pat_doe", topic: "cost_living", source_type: "official YouTube video (own channel) — video post", source_class: "youtube_video", source_id: "fresh-vs-aaaaaaaaaaaa", url: W("AAAAAAAAAAA") };
const SUPPORT = "I will fight to lower prices for working families in my district.";

await t("new cached docs carry prompt_version and schema_version; older docs are read with inferred versions", async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: "AAAAAAAAAAA", title: "t" });
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => ({ segments: [{ start: "0:05", text: SUPPORT, speaker_is_politician: true }] }) }));
  const doc = ts.data.get(vt.cacheKey("AAAAAAAAAAA"));
  assert.equal(doc.prompt_version, vt.TRANSCRIPT_PROMPT_VERSION);
  assert.equal(doc.schema_version, vt.TRANSCRIPT_SCHEMA_VERSION);
  assert.deepEqual(vt.transcriptVersionOf(doc), { prompt_version: vt.TRANSCRIPT_PROMPT_VERSION, schema_version: vt.TRANSCRIPT_SCHEMA_VERSION, stamped: true, current: true });
  assert.deepEqual(vt.transcriptVersionOf(GRIJALVA), { prompt_version: "transcript-prompt-v1", schema_version: "transcript-schema-v1", stamped: false, current: false });
  assert.equal(vt.transcriptVersionOf({ status: "ok", time_format: "seconds", segments: [] }).prompt_version, "transcript-prompt-v2");
  const rec = vt.buildVideoRecord({ src: SRC, videoId: "AAAAAAAAAAA", doc, fetchedAt: "2026-11-28T00:00:00Z" });
  assert.equal(rec.transcript.prompt_version, vt.TRANSCRIPT_PROMPT_VERSION, "the raw record says which transcript it came from");
  assert.equal(vt.buildVideoRecord({ src: SRC, videoId: GRIJALVA.video_id, doc: GRIJALVA, fetchedAt: "x" }).transcript.schema_version, "transcript-schema-v1");
});

await t("nothing is re-transcribed automatically: a cached old doc is still served from cache", async () => {
  const ts = memStore({ [vt.cacheKey("G1xkgCCvPvY")]: GRIJALVA });
  await vt.enqueueTranscript(ts, SRC, { videoId: "G1xkgCCvPvY", title: "t" });
  let calls = 0;
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => { calls++; return { segments: [] }; } }));
  assert.equal(calls, 0); assert.equal(value.cache_hits, 1);
  assert.equal(ts.data.get(vt.cacheKey("G1xkgCCvPvY")).prompt_version, undefined, "the old doc is untouched");
});

await t("requestRetranscribe re-runs one old video with the current prompt and keeps what it replaced", async () => {
  const ts = memStore({ [vt.cacheKey("G1xkgCCvPvY")]: GRIJALVA });
  const q = await vt.requestRetranscribe(ts, { videoId: "G1xkgCCvPvY", src: SRC, reason: "pre-v3 prompt" });
  assert.equal(q.queued, true);
  assert.equal(ts.data.get(vt.queueKey("G1xkgCCvPvY")).retranscribe.from.prompt_version, "transcript-prompt-v1");
  const records = [];
  let calls = 0;
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, onRecord: async (r) => records.push(r),
    generate: async () => { calls++; return { segments: [{ start: "11:47", text: SUPPORT, speaker_is_politician: true }] }; } }));
  assert.equal(calls, 1); assert.equal(value.retranscribed, 1);
  const doc = ts.data.get(vt.cacheKey("G1xkgCCvPvY"));
  assert.equal(doc.prompt_version, vt.TRANSCRIPT_PROMPT_VERSION);
  assert.equal(doc.previous.prompt_version, "transcript-prompt-v1");
  assert.equal(doc.previous.segments, GRIJALVA.segments.length);
  assert.equal(records[0].retranscribed.prompt_version, "transcript-prompt-v1", "the record hook knows it is a re-transcription");
  // Already current → skipped unless forced.
  assert.equal((await vt.requestRetranscribe(ts, { videoId: "G1xkgCCvPvY", src: SRC })).queued, false);
  assert.equal((await vt.requestRetranscribe(ts, { videoId: "G1xkgCCvPvY", src: SRC, force: true })).queued, true);
});

await t("a re-transcription that keeps failing never replaces the old transcript", async () => {
  const ts = memStore({ [vt.cacheKey("G1xkgCCvPvY")]: GRIJALVA });
  await vt.requestRetranscribe(ts, { videoId: "G1xkgCCvPvY", src: SRC });
  ts.data.get(vt.queueKey("G1xkgCCvPvY")).attempts = vt.MAX_ATTEMPTS - 1;
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => { throw new Error("429"); } }));
  assert.deepEqual(ts.data.get(vt.cacheKey("G1xkgCCvPvY")), GRIJALVA);
  assert.equal(ts.data.has(vt.queueKey("G1xkgCCvPvY")), false, "the request is dropped, not retried forever");
});

// ── 3. Rescore ──────────────────────────────────────────────────────────────
console.log(" 3 · video items rescored without duplicates");
const FILL = ["Thank you, Mr. Chairman.", "I welcome our witnesses.", "Let me ask about the timeline.", "We will have more questions."];
const docAt = (t0, { low = false } = {}) => ({ status: "ok", time_format: "seconds", prompt_version: vt.TRANSCRIPT_PROMPT_VERSION, schema_version: vt.TRANSCRIPT_SCHEMA_VERSION,
  segments: [{ t: 0, text: "The gentlewoman is recognized.", own: false }, { t: t0, text: SUPPORT, own: true, ...(low ? { low: true } : {}) }, ...FILL.map((x, i) => ({ t: t0 + 10 * (i + 1), text: x, own: true }))] });
const VID = "AAAAAAAAAAA";
const recFor = (doc) => vt.buildVideoRecord({ src: SRC, videoId: VID, title: "Rep. Doe on the cost of living", doc, fetchedAt: "2026-11-28T00:00:00.000Z" });
async function seedLocker(rec, { rules = "phase9-v2", link = null } = {}) {
  const ls = memStore();
  await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...rec, key: "k" }), { lockerStore: ls, log: () => {} }));
  const [key, item] = [...ls.data.entries()].find(([, v]) => v.topic === "cost_living");
  const old = { ...item, rules_version: rules, ...(link ? { link, citation: { ...(item.citation || {}), url: link } } : {}) };
  ls.data.delete(key);
  const oldKey = locker.lockerKey(old);
  ls.data.set(oldKey, old);
  return { ls, oldKey, old };
}
const videoItems = (ls) => [...ls.data.entries()].filter(([, v]) => RS.videoIdOfLink(v.link) === VID && v.topic === "cost_living");

await t("the rescore pass no longer skips YouTube items: an older-rule item is re-read from its video record and brought current", async () => {
  assert.equal(RS.skipReason({ politician_id: "p", topic: "x", position: "support", confidence: 0.9, link: W(VID), rules_version: "old" }, "k"), null);
  assert.equal(RS.skipReason({ politician_id: "p", topic: "x", position: "support", confidence: 0.9, link: "https://facebook.com/v/1", source_type: "facebook video", rules_version: "old" }, "k"), "video");
  const rec = recFor(docAt(30));
  const raw = memStore({ [vt.videoRecordKey(SRC, VID)]: rec });
  const { ls, oldKey } = await seedLocker(rec);
  const { value: st } = await quiet(() => RS.rescoreStep(null, { lockerStore: ls, rawStore: raw, budgetMs: 10_000, log: () => {} }));
  assert.equal(st.complete, true);
  const items = videoItems(ls);
  assert.equal(items.length, 1);
  assert.equal(items[0][0], oldKey, "same link → rewritten in place");
  assert.equal(items[0][1].rules_version, ss.RULES_VERSION);
  assert.equal(items[0][1].rescored.from.rules_version, "phase9-v2");
});

await t("an item whose cited second moved is moved to its corrected key; scoring the video again finds it (no duplicate)", async () => {
  const rec = recFor(docAt(30));
  const raw = memStore({ [vt.videoRecordKey(SRC, VID)]: rec });
  const { ls, oldKey } = await seedLocker(rec, { link: `${W(VID)}&t=999s` });
  await quiet(() => RS.rescoreStep(null, { lockerStore: ls, rawStore: raw, budgetMs: 10_000, log: () => {} }));
  let items = videoItems(ls);
  assert.equal(items.length, 1, "one item for the video and issue");
  assert.notEqual(items[0][0], oldKey);
  assert.equal(items[0][1].link, `${W(VID)}&t=30s`);
  assert.equal(ls.data.has(oldKey), false);
  const { value } = await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...rec, key: "k" }), { lockerStore: ls, log: () => {} }));
  assert.equal(value.writes.filter((w) => w.topic === "cost_living").length, 0, "the writer finds the moved item");
  items = videoItems(ls);
  assert.equal(items.length, 1);
});

await t("when the corrected key is already taken, the old item is dropped in its favour; flagged items are left alone", async () => {
  const rec = recFor(docAt(30));
  const raw = memStore({ [vt.videoRecordKey(SRC, VID)]: rec });
  const { ls, oldKey } = await seedLocker(rec, { link: `${W(VID)}&t=999s` });
  await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...rec, key: "k" }), { lockerStore: ls, log: () => {} }));
  assert.equal(videoItems(ls).length, 2, "the duplicate the old pipeline would leave behind");
  const { value: r } = await quiet(() => RS.rescoreVideoItems("pat_doe", { videoId: VID }, { lockerStore: ls, rawStore: raw, log: () => {} }));
  assert.ok(r.merged >= 1);
  assert.equal(videoItems(ls).length, 1, "merged into one");
  const { ls: ls2, oldKey: k2, old } = await seedLocker(rec, { link: `${W(VID)}&t=999s` });
  ls2.data.set(k2, { ...old, review: { status: "reviewed" } });
  const { value: r2 } = await quiet(() => RS.rescoreVideoItems("pat_doe", { videoId: VID }, { lockerStore: ls2, rawStore: raw, log: () => {} }));
  assert.equal(r2.flagged, 1); assert.equal(r2.rescored, 0);
  assert.equal(ls2.data.get(k2).link, `${W(VID)}&t=999s`, "the editor's call stands");
  assert.ok(oldKey);
});

await t("on-demand requests: rescore and retranscribe each run once; a re-transcribed video's item moves, never doubles", async () => {
  const oldRec = recFor(docAt(30));
  const raw = memStore({ [vt.videoRecordKey(SRC, VID)]: oldRec });
  const { ls } = await seedLocker(oldRec, { rules: ss.RULES_VERSION });
  const ts = memStore({ [vt.cacheKey(VID)]: { ...docAt(30), prompt_version: "transcript-prompt-v2", schema_version: "transcript-schema-v2" } });
  const file = { requests: [
    { id: "r1", action: "retranscribe", politician_id: "pat_doe", video_id: VID, reason: "test" },
    { id: "r2", action: "rescore", politician_id: "pat_doe", video_id: VID },
    { id: "bad", action: "delete", politician_id: "pat_doe" },
  ] };
  const deps = { transcriptStore: ts, rawStore: raw, lockerStore: ls, log: () => {}, now: NOW };
  const { value: first } = await quiet(() => RP.processReprocessRequests(file, deps));
  assert.deepEqual(first.done.sort(), ["r1", "r2"]);
  const q = ts.data.get(vt.queueKey(VID));
  assert.equal(q.src.source_id, SRC.source_id, "the queue source comes from the stored raw record");
  assert.ok(q.retranscribe);
  const { value: again } = await quiet(() => RP.processReprocessRequests(file, deps));
  assert.deepEqual(again.done, [], "done ids are not repeated");
  // The worker re-transcribes; the quote is now at 0:45 → the item moves.
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: raw, callDelayMs: 0, log: () => {},
    generate: async () => ({ segments: [{ start: "0:00", text: "The gentlewoman is recognized.", speaker_is_politician: false }, { start: "0:45", text: SUPPORT, speaker_is_politician: true }, ...FILL.map((x, i) => ({ start: `0:${55 + i}`, text: x, speaker_is_politician: true }))] }),
    onRecord: async (rec) => { await RP.scoreRecordIntoLocker(rec, { lockerStore: ls, rawStore: raw, log: () => {} }); } }));
  const items = videoItems(ls);
  assert.equal(items.length, 1, `one item (${items.map(([k, v]) => v.link).join(", ")})`);
  assert.equal(items[0][1].link, `${W(VID)}&t=45s`);
});

await t("the background run reads db/video-reprocess.json (empty by default) and reports what it did", async () => {
  const reqFile = JSON.parse(fs.readFileSync(path.join(root, "db/video-reprocess.json"), "utf8"));
  assert.deepEqual(reqFile.requests, []);
  const worker = await imp("netlify/functions/video-transcribe.mts");
  const ts = memStore({ [vt.cacheKey("G1xkgCCvPvY")]: GRIJALVA });
  const { value } = await quiet(() => worker.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: memStore(), retiredStore: memStore(), sync: null, repair: false, callDelayMs: 0, wake: async () => {},
    generate: async () => ({ segments: [{ start: "0:05", text: SUPPORT, speaker_is_politician: true }] }),
    reprocess: { requests: [{ id: "g1", action: "retranscribe", politician_id: "adelita_grijalva", video_id: "G1xkgCCvPvY", topic: "epstein_files_transparency" }] } }));
  assert.deepEqual(value.reprocessed.done, ["g1"]);
  assert.equal(ts.data.get(vt.cacheKey("G1xkgCCvPvY")).prompt_version, vt.TRANSCRIPT_PROMPT_VERSION);
  assert.equal(value.retranscribed, 1);
});

// ── 4. Speaker confidence ──────────────────────────────────────────────────
console.log(" 4 · speaker confidence");
await t("the model's optional speaker_confidence is stored; a mixed video whose cited words are uncertain reads as a mention", async () => {
  const seg = vt.normaliseSegments({ segments: [{ start: "0:01", text: "a", speaker_is_politician: true, speaker_confidence: "low" }, { start: "0:02", text: "b", speaker_is_politician: true }] });
  assert.deepEqual(seg, [{ t: 1, text: "a", own: true, low: true }, { t: 2, text: "b", own: true }]);
  assert.match(vt.transcriptPrompt("Pat Doe"), /speaker_confidence/);
  const sure = vt.scoreRecordCandidates(recFor(docAt(30)), { log: () => {} }).find((x) => x.candidate.topic === "cost_living");
  assert.equal(sure.candidate.position, "support");
  const unsure = vt.scoreRecordCandidates(recFor(docAt(30, { low: true })), { log: () => {} }).find((x) => x.candidate.topic === "cost_living");
  assert.equal(unsure.candidate.position, "no clear position");
  assert.equal(unsure.candidate.speaker_uncertain.was, "support");
  // Only the politician speaking (not mixed): the flag alone changes nothing.
  const solo = docAt(30, { low: true }); solo.segments = solo.segments.filter((s) => s.own);
  assert.equal(vt.scoreRecordCandidates(recFor(solo), { log: () => {} }).find((x) => x.candidate.topic === "cost_living").candidate.position, "support");
});

console.log(`${failures ? "✗" : "✓"} video lane + transcript versions: ${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
