#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-transcripts.mjs — server-side video transcripts → Evidence Locker
//
//   · The background transcriber (video-transcribe.mts → video-transcripts.mjs)
//     turns a queued own-channel video into a cached transcript, a page-shaped
//     raw record, and — through the SAME scorer + Locker writer as a campaign
//     page — a valid Evidence Locker citation item when the politician states
//     a clear position. The item links to watch?v=ID&t=NNs.
//   · A video with no transcript (no speech, provider failure, or only other
//     speakers) produces NO Locker item.
//   · Each video is transcribed once (cache by video id); a worker lock keeps
//     background runs from overlapping.
//   · /api/yt-verify keeps its responses on the shared oEmbed helper; the cron
//     wakes the transcriber only when a run queued videos.
//
// The provider is injected (no network, no AI calls).
//   node scripts/test-video-transcripts.mjs
// ═══════════════════════════════════════════════════════════════════════════
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vt = await import("../netlify/lib/video-transcripts.mjs");
const locker = await import("../netlify/lib/evidence-locker-core.mjs");
const social = await import("../netlify/lib/raw-ingest-social.mjs");
const worker = await import(pathToFileURL(path.join(root, "netlify/functions/video-transcribe.mts")).href);
const cron = await import(pathToFileURL(path.join(root, "netlify/functions/raw-ingest-cron.mts")).href);
const ytVerify = (await import(pathToFileURL(path.join(root, "netlify/functions/yt-verify.mts")).href)).default;

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.stack?.split("\n").slice(0, 3).join("\n     ") || e}`); }
}
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};

/** In-memory Blobs store with the calls the worker uses (conditional writes, list, delete). */
function memStore() {
  const data = new Map(); let n = 0; const etags = new Map();
  return {
    data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async getWithMetadata(k) { return data.has(k) ? { data: JSON.parse(JSON.stringify(data.get(k))), etag: etags.get(k) } : null; },
    async setJSON(k, v, o = {}) {
      if (o.onlyIfNew && data.has(k)) return { modified: false };
      if (o.onlyIfMatch && etags.get(k) !== o.onlyIfMatch) return { modified: false };
      data.set(k, JSON.parse(JSON.stringify(v))); etags.set(k, `e${++n}`); return { modified: true };
    },
    async delete(k) { data.delete(k); etags.delete(k); },
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}

const VID = "AbCdEfGhIj0";
const SRC = {
  politician_id: "vid_test", topic: "healthcare_costs", source_type: "campaign YouTube channel (the politician's own)",
  source_class: "youtube", source_tier: 2, source_id: "discovered-youtube-com-channel-test", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxxxxxxxxxxxxxxxx",
};
// A clear first-person health-care-cost commitment, spoken from 0:42.
const CLEAR = { segments: [
  { start: 0, text: "Thanks for joining us tonight.", speaker_is_politician: false },
  { start: 4, text: "Hi, I'm running for the state house in our district.", speaker_is_politician: true },
  { start: 42, text: "I will fight to lower prescription drug costs and cap insulin co-pays.", speaker_is_politician: true },
  { start: 50, text: "We will reduce insurance premiums for families.", speaker_is_politician: true },
] };

async function runWorker({ ts = memStore(), raw = memStore(), ls = memStore(), generate, logs = [] } = {}) {
  const calls = [];
  const gen = async (args) => { calls.push(args); return typeof generate === "function" ? generate(args) : generate; };
  const { value } = await quiet(() => worker.transcribeRun({ store: ts, rawStore: raw, lockerStore: ls, generate: gen, log: (l) => logs.push(l), wake: async () => {} }));
  return { summary: value, ts, raw, ls, calls, logs };
}

console.log("video transcripts → Evidence Locker:");

// ── 1. Provider output ──────────────────────────────────────────────────────
await t("transcribeVideo cleans the provider's segments and never throws", async () => {
  const ok = await vt.transcribeVideo(VID, { name: "Pat Doe", generate: async () => ({ segments: [{ start: 9.7, text: "  second  line ", speaker_is_politician: true }, { start: 1, text: "first", speaker_is_politician: false }, { start: 3, text: "   " }] }) });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.segments, [{ t: 1, text: "first", own: false }, { t: 9, text: "second line", own: true }], "time-ordered, trimmed, blanks dropped");
  const bad = await vt.transcribeVideo(VID, { generate: async () => { throw new Error("gateway 503"); } });
  assert.deepEqual(bad, { ok: false, error: "gateway 503" });
  const prompt = vt.transcriptPrompt("Pat Doe");
  assert.match(prompt, /VERBATIM/); assert.match(prompt, /Pat Doe/); assert.match(prompt, /false for anyone else/);
});

// ── 2. A clear transcript becomes a valid Locker citation ───────────────────
await t("a queued video with a clear transcript becomes a valid Evidence Locker citation item, linked to the second", async () => {
  const ts = memStore();
  assert.equal(await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "Lowering health care costs", published: "2026-11-02T10:00:00Z" }), true);
  const { summary, raw, ls, calls } = await runWorker({ ts, generate: CLEAR });
  assert.equal(calls.length, 1, "transcribed once");
  assert.equal(calls[0].videoId, VID);
  assert.equal(summary.recorded, 1);
  // Cached by video id, queue drained.
  const doc = ts.data.get(vt.cacheKey(VID));
  assert.equal(doc.status, "ok"); assert.equal(doc.segments.length, 4);
  assert.ok(!ts.data.has(vt.queueKey(VID)), "queue entry removed");
  // Page-shaped raw record: the politician's words only, timed.
  const rec = raw.data.get(vt.videoRecordKey(SRC, VID));
  assert.equal(rec.type, "video"); assert.equal(rec.source_tier, 2); assert.equal(rec.final_url, `https://www.youtube.com/watch?v=${VID}`);
  assert.ok(!rec.body.includes("Thanks for joining"), "the host's words are not the politician's");
  assert.ok(!rec.body.includes("Lowering health care costs"), "the title is not quoted as speech");
  assert.equal(rec.title, "Lowering health care costs");
  assert.equal(rec.segments.length, 3);
  for (const s of rec.segments) assert.ok(rec.body.slice(s.at).startsWith(CLEAR.segments.find((x) => x.start === s.t).text), "offsets point at each segment");
  // The Locker item.
  const items = [...ls.data.entries()].filter(([, v]) => v.topic === "healthcare_costs");
  assert.equal(items.length, 1, "one item on the video's issue");
  const [key, item] = items[0];
  assert.equal(item.position, "support");
  assert.ok(["strong", "weak"].includes(item.strength), `a clear read (${item.strength})`);
  assert.ok(item.confidence >= locker.LOCKER_WEAK_MIN_CONFIDENCE);
  assert.match(item.link, new RegExp(`^https://www\\.youtube\\.com/watch\\?v=${VID}&t=(42|50)s$`), "linked to the second the cited words are spoken");
  assert.equal(key, locker.lockerKey(item), "keyed like every Locker item");
  assert.equal(item.attribution, "Source: campaign YouTube channel");
  assert.equal(item.source_tier, 2);
  assert.equal(item.layer, "stated"); assert.equal(item.formal_record, false);
  assert.equal(item.item_version, locker.LOCKER_ITEM_VERSION);
  // The full citation record a campaign-page item carries.
  assert.equal(item.issue_key, "healthcare_costs");
  assert.equal(item.own_page, true);
  assert.ok(item.excerpts.length >= 1);
  const spoken = CLEAR.segments.filter((s) => s.speaker_is_politician).map((s) => s.text).join(" ");
  for (const e of item.excerpts) assert.ok(spoken.includes(e.replace(/…$/, "")), `excerpt is verbatim from the politician's words: ${e}`);
  const c = item.citation;
  assert.deepEqual({ pid: c.politician_id, issue: c.issue_key, pos: c.stated_position, url: c.url, own: c.own_page }, { pid: "vid_test", issue: "healthcare_costs", pos: "support", url: item.link, own: true });
  assert.match(c.attribution, /^Source: campaign YouTube channel — the politician's own page$/);
  assert.ok(/(42|50)s$/.test(c.url));
  // The served shape the Locker components render.
  const entry = locker.toSpotlightEntry(item, { key });
  assert.equal(entry.source.url, item.link);
  assert.match(entry.facts, /own YouTube channel/);
});

await t("each video is transcribed once: a re-queued video is served from the cache and the Locker item is not duplicated", async () => {
  const ts = memStore(), raw = memStore(), ls = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "Lowering health care costs" });
  await runWorker({ ts, raw, ls, generate: CLEAR });
  const before = ls.data.size;
  assert.equal(await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "Lowering health care costs" }), true, "queued again (e.g. another run)");
  assert.equal(await vt.enqueueTranscript(ts, SRC, { videoId: VID }), false, "write-once while queued");
  const again = await runWorker({ ts, raw, ls, generate: CLEAR });
  assert.equal(again.calls.length, 0, "no second provider call");
  assert.equal(again.summary.cache_hits, 1);
  assert.equal(ls.data.size, before, "no duplicate item");
  // And the cron, reading the cache, scores it directly without queueing.
  const hooked = [];
  const feed = `<feed><entry><yt:videoId>${VID}</yt:videoId><title>Lowering health care costs</title><published>2026-11-02T10:00:00+00:00</published></entry></feed>`;
  const r = await quiet(() => social.pullYouTube(SRC, { fetch: async (u) => ({ ok: true, status: 200, url: u, text: async () => feed }), store: memStore(), transcriptStore: ts, log: () => {}, onRecord: async (x) => hooked.push(x) }));
  assert.equal(r.value.youtube.transcript, 1);
  assert.equal(r.value.youtube.queued, 0);
  assert.equal(hooked.length, 1);
});

// ── 3. No transcript → no Locker item ───────────────────────────────────────
await t("a video with no transcript (no speech) produces no Locker item and stays a mention", async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "B-roll" });
  const { summary, raw, ls } = await runWorker({ ts, generate: { segments: [] } });
  assert.equal(ls.data.size, 0, "nothing in the Locker");
  assert.equal(raw.data.size, 0, "no page-shaped record");
  assert.equal(summary.no_own_speech, 1);
  assert.equal(ts.data.get(vt.cacheKey(VID)).status, "empty", "cached, so it is never re-transcribed");
  // The cron then keeps it a mention and does not queue it again.
  const store = memStore();
  const feed = `<feed><entry><yt:videoId>${VID}</yt:videoId><title>B-roll</title><published>2026-11-02T10:00:00+00:00</published><media:description>Lower costs now.</media:description></entry></feed>`;
  const hooked = [];
  await quiet(() => social.pullYouTube(SRC, { fetch: async (u) => ({ ok: true, status: 200, url: u, text: async () => feed }), store, transcriptStore: ts, log: () => {}, onRecord: async (x) => hooked.push(x) }));
  assert.equal(hooked.length, 0, "not scored");
  assert.equal([...store.data.values()][0].weight, "mention");
  assert.ok(!ts.data.has(vt.queueKey(VID)));
});

await t("a clear stance spoken only by someone else (host, opponent) produces no Locker item", async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "Debate night" });
  const other = { segments: CLEAR.segments.map((s) => ({ ...s, speaker_is_politician: false })) };
  const { raw, ls } = await runWorker({ ts, generate: other });
  assert.equal(ls.data.size, 0);
  assert.equal(raw.data.size, 0);
});

await t("a provider failure is retried, then given up and cached — never a Locker item", async () => {
  const ts = memStore(), ls = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "x" });
  const boom = () => { throw new Error("gateway timeout"); };
  for (let i = 1; i < vt.MAX_ATTEMPTS; i++) {
    const r = await runWorker({ ts, ls, generate: boom });
    assert.equal(r.summary.retry_later, 1);
    assert.equal(ts.data.get(vt.queueKey(VID)).attempts, i);
  }
  const last = await runWorker({ ts, ls, generate: boom });
  assert.equal(last.summary.failed, 1);
  assert.equal(ts.data.get(vt.cacheKey(VID)).status, "failed");
  assert.ok(!ts.data.has(vt.queueKey(VID)));
  assert.equal(ls.data.size, 0);
});

// ── 3b. Backlog: videos stored as mentions before transcripts existed ───────
await t("a channel video already stored as a mention is queued once, then scored once its transcript is cached", async () => {
  const feed = `<feed><entry><yt:videoId>${VID}</yt:videoId><title>Lowering health care costs</title><published>2026-11-02T10:00:00+00:00</published><media:description>Lower costs now.</media:description></entry></feed>`;
  const fetchFeed = async (u) => ({ ok: true, status: 200, url: u, text: async () => feed });
  const store = memStore(), ts = memStore(), hooked = [];
  await quiet(() => social.pullYouTube(SRC, { fetch: fetchFeed, store, log: () => {} })); // before transcripts: a mention
  assert.equal(store.data.get(vt.videoRecordKey(SRC, VID)).weight, "mention");
  const a = await quiet(() => social.pullYouTube(SRC, { fetch: fetchFeed, store, transcriptStore: ts, log: () => {}, onRecord: async (x) => hooked.push(x) }));
  assert.deepEqual({ seen: a.value.youtube.seen, queued: a.value.youtube.queued }, { seen: 1, queued: 1 }, "the stored mention is queued");
  const b = await quiet(() => social.pullYouTube(SRC, { fetch: fetchFeed, store, transcriptStore: ts, log: () => {} }));
  assert.equal(b.value.youtube.queued, 0, "queued only once");
  const ls = memStore();
  await runWorker({ ts, raw: store, ls, generate: CLEAR });
  assert.ok(store.data.get(vt.videoRecordKey(SRC, VID)).body, "the mention is replaced by the scored record");
  assert.ok([...ls.data.values()].some((i) => i.topic === "healthcare_costs" && i.position === "support"));
  const c = await quiet(() => social.pullYouTube(SRC, { fetch: fetchFeed, store, transcriptStore: ts, log: () => {}, onRecord: async (x) => hooked.push(x) }));
  assert.deepEqual({ queued: c.value.youtube.queued, scored: hooked.length }, { queued: 0, scored: 0 }, "a scored video is left alone");
});

// ── 4. Worker lock ──────────────────────────────────────────────────────────
await t("a held worker lock stops a second run; a stale lock is taken over", async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "x" });
  await ts.setJSON(vt.LOCK_KEY, { until: Date.now() + 60_000 });
  const held = await runWorker({ ts, generate: CLEAR });
  assert.equal(held.summary.locked, true);
  assert.equal(held.calls.length, 0);
  assert.ok(ts.data.has(vt.queueKey(VID)), "queue untouched");
  await ts.setJSON(vt.LOCK_KEY, { until: Date.now() - 1 });
  const stale = await runWorker({ ts, generate: CLEAR });
  assert.equal(stale.summary.locked, false);
  assert.equal(stale.calls.length, 1);
  assert.ok(!ts.data.has(vt.LOCK_KEY), "lock released after the run");
});

// ── 5. Timestamp links ──────────────────────────────────────────────────────
await t("videoTimestampLink / lockerRawFor point at the segment holding the excerpt, else keeps the plain link", () => {
  const rec = vt.buildVideoRecord({ src: SRC, videoId: VID, title: "Title", doc: { status: "ok", segments: vt.normaliseSegments(CLEAR) }, fetchedAt: "2026-11-19T00:00:00Z" });
  const plain = `https://www.youtube.com/watch?v=${VID}`;
  assert.equal(vt.videoTimestampLink(rec, "We will reduce insurance premiums for families."), `${plain}&t=50s`);
  assert.equal(vt.videoTimestampLink(rec, "I will fight to lower prescription drug costs and cap insulin…"), `${plain}&t=42s`, "a trimmed excerpt still matches");
  assert.equal(vt.videoTimestampLink(rec, "Words nobody said in this video at all."), plain);
  assert.equal(vt.videoTimestampLink({ ...rec, segments: [] }, "We will reduce insurance premiums for families."), plain);
  // The Locker writer gets a per-candidate copy linked to the second; a page record is passed through untouched.
  const cand = { politician_id: "p", topic: "healthcare_costs", position: "support", confidence: 0.9, sources: [{ excerpt: "We will reduce insurance premiums for families.", link: plain }] };
  assert.equal(locker.buildLockerItem(cand, vt.lockerRawFor(cand, rec), "strong").link, `${plain}&t=50s`);
  assert.equal(rec.final_url, plain, "the stored record is not modified");
  const page = { url: "https://x.org/a", source_type: "campaign page" };
  assert.equal(vt.lockerRawFor(cand, page), page);
});

// ── 6. oEmbed + cron wake ───────────────────────────────────────────────────
await t("/api/yt-verify keeps its responses on the shared oEmbed helper", async () => {
  const orig = globalThis.fetch;
  try {
    globalThis.fetch = async (u) => {
      assert.ok(String(u).startsWith("https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D"));
      return { ok: true, status: 200, json: async () => ({ title: "Real title", author_name: "Real channel", author_url: "https://www.youtube.com/@real", thumbnail_url: "https://i.ytimg.com/x.jpg" }) };
    };
    const ok = await (await ytVerify(new Request(`https://x/api/yt-verify?url=https://youtu.be/${VID}`), {})).json();
    assert.deepEqual(ok, { ok: true, videoId: VID, title: "Real title", channel: "Real channel", channelUrl: "https://www.youtube.com/@real", thumbnail: "https://i.ytimg.com/x.jpg", watchUrl: `https://www.youtube.com/watch?v=${VID}` });
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    const gone = await ytVerify(new Request(`https://x/api/yt-verify?url=${VID}`), {});
    assert.equal(gone.status, 200);
    assert.equal((await gone.json()).ok, false);
    assert.equal((await ytVerify(new Request("https://x/api/yt-verify?url=nope"), {})).status, 400);
  } finally { globalThis.fetch = orig; }
});

await t("the cron wakes the background transcriber only when a run queued videos", async () => {
  let woken = 0;
  const fakeRun = (queued) => async () => new Response(JSON.stringify({ ok: true, results: [], youtube: { queued } }), { status: 200 });
  const deps = { store: memStore(), lockerStore: memStore(), rotationStore: memStore(), statedDb: null, suggestionsStore: memStore(), triggerTranscriber: async () => { woken++; } };
  await quiet(() => cron.scheduled({ ...deps, run: fakeRun(2) }));
  assert.equal(woken, 1);
  await quiet(() => cron.scheduled({ ...deps, run: fakeRun(0) }));
  assert.equal(woken, 1, "no wake without queued videos");
});

// ── 7. Gemini rate-limit throttle ───────────────────────────────────────────
const SRC_OF = (i) => ({ ...SRC, source_id: `throttle-${i}` });
const vidOf = (i) => `Thr0ttle${String(i).padStart(3, "0")}`;
async function queueN(ts, n) { for (let i = 0; i < n; i++) await vt.enqueueTranscript(ts, SRC_OF(i), { videoId: vidOf(i), title: `v${i}` }); }
async function throttledRun({ ts, generate, wake = async () => {}, logs = [] }) {
  const events = [];
  const sleeps = [];
  const gen = async (args) => { events.push(`call:${args.videoId}`); return generate(args); };
  const sleep = async (ms) => { sleeps.push(ms); events.push(`sleep:${ms}`); };
  const { value } = await quiet(() => worker.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: memStore(), generate: gen, sleep, log: (l) => logs.push(l), wake }));
  return { summary: value, events, sleeps, logs };
}

await t("the transcriber picks at most 4 videos per run", async () => {
  assert.equal(vt.TRANSCRIBE_PER_RUN, 4);
  const ts = memStore(); await queueN(ts, 10);
  const { summary, events } = await throttledRun({ ts, generate: async () => CLEAR });
  assert.equal(summary.picked, 4);
  assert.equal(events.filter((e) => e.startsWith("call:")).length, 4, "four Gemini calls");
  assert.equal(summary.remaining, 6, "the rest waits in the queue");
});

await t("transcription calls run one at a time with an 18 s pause between them", async () => {
  assert.equal(vt.TRANSCRIBE_CALL_DELAY_MS, 18_000);
  const ts = memStore(); await queueN(ts, 4);
  let inFlight = 0, peak = 0;
  const { events, sleeps } = await throttledRun({ ts, generate: async () => { inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 5)); inFlight--; return CLEAR; } });
  assert.equal(peak, 1, "never two Gemini calls at once");
  assert.deepEqual(sleeps, [18_000, 18_000, 18_000], "a pause before every call but the first");
  assert.ok(events[0].startsWith("call:"), "the first call starts at once");
  for (let i = 1; i < events.length; i += 2) { assert.equal(events[i], "sleep:18000"); assert.ok(events[i + 1].startsWith("call:")); }
  // Cache hits make no call, so they never wait.
  const ts2 = memStore(); await queueN(ts2, 2);
  for (let i = 0; i < 2; i++) await ts2.setJSON(vt.cacheKey(vidOf(i)), { video_id: vidOf(i), status: "empty", segments: [] });
  const cached = await throttledRun({ ts: ts2, generate: async () => CLEAR });
  assert.equal(cached.summary.cache_hits, 2); assert.deepEqual(cached.sleeps, []);
});

await t("the real delay is applied when no sleep is injected", async () => {
  const ts = memStore(); await queueN(ts, 2);
  const t0 = Date.now();
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), generate: async () => CLEAR, log: () => {}, callDelayMs: 300 }));
  assert.ok(Date.now() - t0 >= 280, `two calls took ${Date.now() - t0} ms`);
});

await t("retries (up to 3 attempts) and give-up still work under the throttle", async () => {
  const ts = memStore(); await queueN(ts, 1);
  const boom = async () => { throw new Error("429 Too Many Requests"); };
  const logs = [];
  const r1 = await throttledRun({ ts, generate: boom, logs });
  assert.equal(r1.summary.retry_later, 1);
  assert.equal(ts.data.get(vt.queueKey(vidOf(0))).attempts, 1, "kept in the queue");
  const r2 = await throttledRun({ ts, generate: boom, logs });
  assert.equal(r2.summary.retry_later, 1);
  const r3 = await throttledRun({ ts, generate: boom, logs });
  assert.equal(r3.summary.failed, 1, "given up on the 3rd attempt");
  assert.ok(!ts.data.has(vt.queueKey(vidOf(0))), "removed from the queue");
  assert.equal(ts.data.get(vt.cacheKey(vidOf(0))).status, "failed");
  assert.ok(logs.some((l) => /GAVE UP .* after 3 attempts/.test(l)));
});

await t("a successful run with work left wakes the next run", async () => {
  const ts = memStore(); await queueN(ts, 6);
  let woken = 0;
  const { summary } = await throttledRun({ ts, generate: async () => CLEAR, wake: async () => { woken++; } });
  assert.equal(summary.remaining, 2); assert.equal(woken, 1);
  // A run that drains the queue does not.
  await throttledRun({ ts, generate: async () => CLEAR, wake: async () => { woken++; } });
  assert.equal(woken, 1);
});

await t("a heavily failing run stops chaining; a lightly failing one still chains", async () => {
  const ts = memStore(); await queueN(ts, 6);
  let woken = 0; const logs = [];
  const { summary } = await throttledRun({ ts, generate: async () => { throw new Error("429"); }, wake: async () => { woken++; }, logs });
  assert.equal(summary.retry_later, 4); assert.ok(summary.remaining > 0);
  assert.equal(woken, 0, "all calls failed — no wake");
  assert.ok(logs.some((l) => /not waking the next run/.test(l)));
  // 3 of 4 failed: still too many.
  const ts2 = memStore(); await queueN(ts2, 6); let n = 0;
  await throttledRun({ ts: ts2, generate: async () => { if (n++ < 3) throw new Error("429"); return CLEAR; }, wake: async () => { woken++; } });
  assert.equal(woken, 0);
  // 1 of 4 failed: keeps going.
  const ts3 = memStore(); await queueN(ts3, 6); let m = 0;
  await throttledRun({ ts: ts3, generate: async () => { if (m++ < 1) throw new Error("429"); return CLEAR; }, wake: async () => { woken++; } });
  assert.equal(woken, 1);
});

console.log(`${failures ? "✗" : "✓"} video transcripts: ${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
