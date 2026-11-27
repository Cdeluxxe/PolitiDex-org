#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-pipeline-fixes.mjs — the four video / YouTube pipeline fixes
//
//   1. TIMESTAMPS. Gemini is asked for clock strings ("11:47") and they are
//      parsed to seconds; transcripts cached with clock digits as numbers
//      (1147 = 11:47) are decoded on read; Locker items cut from them are
//      repaired (moved to their corrected link's key) by video-link-repair.mjs.
//      Regression: Grijalva, G1xkgCCvPvY — the discharge-petition quote is at
//      11:47 = 707 s, not 1147 s.
//   2. C-SPAN. The facts line says "In a C-SPAN video", never "campaign page";
//      the source type is named for the member's chamber.
//   3. MEDIA. Video items carry media { type: "video", kind: "youtube", url,
//      label, timestamp }, which the Locker UI classifies as a YouTube video;
//      other items are served unchanged.
//   4. QUEUE ORDER. The transcript queue is worked hearing / floor > C-SPAN >
//      official > campaign, then tier, then evidence need, then newest.
//
// No network, no AI calls.   node scripts/test-video-pipeline-fixes.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vt = await import("../netlify/lib/video-transcripts.mjs");
const locker = await import("../netlify/lib/evidence-locker-core.mjs");
const repair = await import("../netlify/lib/video-link-repair.mjs");
const video = await import("../netlify/lib/raw-ingest-video.mjs");
const worker = await import(pathToFileURL(path.join(root, "netlify/functions/video-transcribe.mts")).href);

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

/** In-memory Blobs store: conditional writes, prefix + directory listing, delete. */
function memStore(init = {}) {
  const data = new Map(Object.entries(init).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])); let n = 0; const etags = new Map();
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
    async list({ prefix = "", directories = false } = {}) {
      const keys = [...data.keys()].filter((k) => k.startsWith(prefix));
      if (!directories) return { blobs: keys.map((key) => ({ key })) };
      const dirs = new Set(), blobs = [];
      for (const k of keys) { const rest = k.slice(prefix.length); const i = rest.indexOf("/"); if (i >= 0) dirs.add(prefix + rest.slice(0, i)); else blobs.push({ key: k }); }
      return { blobs, directories: [...dirs] };
    },
  };
}

// The real cached transcript (clock digits, no time_format).
const GRIJALVA = JSON.parse(fs.readFileSync(path.join(root, "scripts/fixtures/video-G1xkgCCvPvY-transcript.json"), "utf8"));
const GID = "G1xkgCCvPvY";
const QUOTE = "That is why I will sign the discharge petition right now to release the Epstein files.";
const GSRC = {
  politician_id: "adelita_grijalva", topic: "epstein_files_transparency", source_class: "youtube_video", source_tier: 2,
  source_type: "official House proceedings video (C-SPAN) — video post", source_id: "fresh-vs-0123456789ab", url: `https://www.youtube.com/watch?v=${GID}`,
};
const gRecord = (doc = GRIJALVA) => vt.buildVideoRecord({ src: GSRC, videoId: GID, title: "Adelita Grijalva sworn in", doc, fetchedAt: "2026-11-21T00:00:00.000Z" });

console.log("video pipeline fixes:");

// ── 1. Timestamps ───────────────────────────────────────────────────────────
console.log(" 1 · timestamps");
await t("clock strings are parsed to seconds; the prompt and schema ask for them", async () => {
  assert.equal(vt.parseClock("0:07"), 7);
  assert.equal(vt.parseClock("11:47"), 707);
  assert.equal(vt.parseClock("1:02:05"), 3725);
  assert.equal(vt.parseClock("19:57"), 1197);
  assert.equal(vt.parseClock("1:75"), null, "seconds past 59 are not a clock");
  assert.equal(vt.parseClock(1147), null, "a bare number is not a clock string");
  assert.match(vt.transcriptPrompt("Pat Doe"), /H:MM:SS/);
  const seg = vt.normaliseSegments({ segments: [
    { start: "11:47", text: "later", speaker_is_politician: true },
    { start: "0:05", text: "first", speaker_is_politician: false },
    { start: "1:02:05", text: "last", speaker_is_politician: true },
  ] });
  assert.deepEqual(seg, [{ t: 5, text: "first", own: false }, { t: 707, text: "later", own: true }, { t: 3725, text: "last", own: true }]);
});

await t("numeric starts: clock digits are decoded, true seconds are left alone", async () => {
  assert.equal(vt.looksLikeClockDigits([0, 10, 107, 146, 1147]), true);
  assert.equal(vt.looksLikeClockDigits([0, 10, 75, 168]), false, "75 / 168 can only be seconds");
  assert.equal(vt.looksLikeClockDigits([0, 4, 42, 50]), false, "nothing ≥ 100: nothing to tell, read as seconds");
  assert.equal(vt.clockDigitsToSeconds(1147), 707);
  assert.equal(vt.clockDigitsToSeconds(10507), 3907);
  const digits = vt.normaliseSegments({ segments: [{ start: 107, text: "a" }, { start: 1147, text: "b" }] });
  assert.deepEqual(digits.map((s) => s.t), [67, 707]);
  const secs = vt.normaliseSegments({ segments: [{ start: 75, text: "a" }, { start: 168, text: "b" }] });
  assert.deepEqual(secs.map((s) => s.t), [75, 168]);
});

await t("REGRESSION G1xkgCCvPvY: the cached clock-digit transcript puts the discharge-petition quote at 707 s (11:47)", async () => {
  assert.equal(GRIJALVA.time_format, undefined, "the fixture is the pre-fix cache doc");
  assert.ok(GRIJALVA.segments.some((s) => s.t === 1147 && s.text === QUOTE), "stored as 1147");
  assert.equal(vt.hasClockDigitTimes(GRIJALVA), true);
  const rec = gRecord();
  assert.equal(rec.time_format, "seconds", "records are stamped as seconds");
  assert.equal(vt.videoExcerptSecond(rec, QUOTE), 707);
  assert.equal(vt.videoTimestampLink(rec, QUOTE), `https://www.youtube.com/watch?v=${GID}&t=707s`);
  // A record stored before the fix (raw clock digits in segments, no time_format) resolves the same.
  const old = { ...rec, segments: rec.segments.map((s) => ({ ...s, t: GRIJALVA.segments.filter((x) => x.own).find((x, i) => i === rec.segments.indexOf(s))?.t })) };
  delete old.time_format;
  assert.ok(old.segments.some((s) => s.t === 1147));
  assert.equal(vt.videoExcerptSecond(old, QUOTE), 707);
  // A second check inside the clip: "I do." (the oath) is at 1:46 = 106 s.
  assert.equal(vt.videoExcerptSecond(rec, "Thank you to my colleague and friend, Congressman Stanton"), 6 * 60 + 32);
});

await t("REGRESSION G1xkgCCvPvY: scored through the real writer, the Locker item links to &t=707s", async () => {
  const ls = memStore();
  const { value } = await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...gRecord(), key: "k" }), { lockerStore: ls, log: () => {} }));
  const item = [...ls.data.values()].find((v) => v.topic === "epstein_files_transparency" && v.position === "support");
  assert.ok(item, `an Epstein-files support item (writes: ${JSON.stringify(value.writes)})`);
  assert.equal(item.link, `https://www.youtube.com/watch?v=${GID}&t=707s`);
  assert.equal(item.citation.url, item.link);
});

await t("new transcripts are cached in seconds and stamped time_format", async () => {
  const ts = memStore(); const raw = memStore();
  await vt.enqueueTranscript(ts, GSRC, { videoId: "AbCdEfGhIj0", title: "t" });
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: raw, callDelayMs: 0, log: () => {},
    generate: async () => ({ segments: [{ start: "0:00", text: "Hello.", speaker_is_politician: false }, { start: "11:47", text: QUOTE, speaker_is_politician: true }] }) }));
  const doc = ts.data.get(vt.cacheKey("AbCdEfGhIj0"));
  assert.equal(doc.time_format, "seconds");
  assert.deepEqual(doc.segments.map((s) => s.t), [0, 707]);
  assert.deepEqual(vt.segmentSeconds(doc).map((s) => s.t), [0, 707], "never decoded twice");
});

await t("link repair: an existing &t=1147s item is moved to its corrected key; re-scoring finds it (no duplicate); a second pass is a no-op", async () => {
  // The item as the writer stored it before the fix: link at the clock digits.
  const ls0 = memStore();
  await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...gRecord(), key: "k" }), { lockerStore: ls0, log: () => {} }));
  const good = [...ls0.data.values()].find((v) => v.topic === "epstein_files_transparency" && v.position === "support");
  const badLink = `https://www.youtube.com/watch?v=${GID}&t=1147s`;
  const bad = { ...good, link: badLink, citation: { ...good.citation, url: badLink } };
  const badKey = locker.lockerKey(bad);
  const other = { politician_id: "adelita_grijalva", topic: "housing", position: "support", link: "https://grijalva.house.gov/issues/housing", excerpt: "x", strength: "strong" };
  const ls = memStore({ [badKey]: bad, [locker.lockerKey(other)]: other });
  const ts = memStore({ [vt.cacheKey(GID)]: GRIJALVA });
  const synced = [];
  const st = await repair.repairStep(null, { lockerStore: ls, transcriptStore: ts, sync: async (p) => { synced.push(p); }, log: () => {} });
  assert.equal(st.done, true);
  assert.equal(st.tallies.links_fixed, 1); assert.equal(st.tallies.moved, 1);
  assert.ok(!ls.data.has(badKey), "the old key is gone");
  const goodKey = locker.lockerKey({ ...bad, link: `https://www.youtube.com/watch?v=${GID}&t=707s` });
  const moved = ls.data.get(goodKey);
  assert.equal(moved.link, `https://www.youtube.com/watch?v=${GID}&t=707s`);
  assert.equal(moved.citation.url, moved.link);
  assert.equal(moved.link_repair.from_link, badLink);
  assert.equal(moved.position, bad.position); assert.equal(moved.strength, bad.strength); assert.equal(moved.confidence, bad.confidence);
  assert.deepEqual(ls.data.get(locker.lockerKey(other)), other, "a non-video item is untouched");
  assert.deepEqual(synced, ["adelita_grijalva"], "the politician's stated positions are recomputed");
  // Re-scoring the same video now lands on the moved key: no second copy.
  const before = ls.data.size;
  const { value } = await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...gRecord(), key: "k" }), { lockerStore: ls, log: () => {} }));
  assert.ok(!value.writes.some((w) => w.key === goodKey), "already in the Locker");
  assert.equal([...ls.data.values()].filter((v) => v.topic === "epstein_files_transparency" && /G1xkgCCvPvY/.test(v.link)).length, [...ls0.data.values()].filter((v) => v.topic === "epstein_files_transparency").length);
  assert.ok(ls.data.size >= before);
  // A fresh pass over repaired data changes nothing.
  const again = await repair.repairStep(null, { lockerStore: ls, transcriptStore: ts, log: () => {} });
  assert.equal(again.tallies.links_fixed, 0);
});

await t("link repair leaves items from true-seconds transcripts and flagged items' keys alone", async () => {
  const secsDoc = { video_id: "SecSecSec01", status: "ok", segments: [{ t: 0, text: "Intro.", own: false }, { t: 75, text: "I will fight to cap insulin co-pays for every family.", own: true }, { t: 168, text: "Thanks.", own: true }] };
  const item = { politician_id: "p", topic: "healthcare_costs", position: "support", link: "https://www.youtube.com/watch?v=SecSecSec01&t=75s", excerpt: "I will fight to cap insulin co-pays for every family.", source_type: "official YouTube video (own channel) — video post" };
  assert.equal(repair.repairVideoItem(item, secsDoc), null, "already right");
  // Flagged: corrected in place, key kept.
  const bad = { ...item, link: `https://www.youtube.com/watch?v=${GID}&t=1147s`, excerpt: QUOTE, politician_id: "adelita_grijalva", topic: "epstein_files_transparency" };
  const key = locker.lockerKey(bad);
  const ls = memStore({ [key]: { ...bad, review: { status: "reviewed" } } });
  const st = await repair.repairStep(null, { lockerStore: ls, transcriptStore: memStore({ [vt.cacheKey(GID)]: GRIJALVA }), log: () => {} });
  assert.equal(st.tallies.in_place, 1);
  assert.equal(ls.data.get(key).link, `https://www.youtube.com/watch?v=${GID}&t=707s`);
});

await t("the background run performs the repair pass once (under the worker lock) and records it", async () => {
  const badLink = `https://www.youtube.com/watch?v=${GID}&t=1147s`;
  const bad = { politician_id: "adelita_grijalva", topic: "epstein_files_transparency", position: "support", strength: "strong", link: badLink, excerpt: QUOTE, source_type: GSRC.source_type, attribution: "Source: C-SPAN video" };
  const ls = memStore({ [locker.lockerKey(bad)]: bad });
  const ts = memStore({ [vt.cacheKey(GID)]: GRIJALVA });
  await quiet(() => worker.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: ls, log: () => {}, wake: async () => {}, sync: null }));
  const st = ts.data.get(repair.LINK_REPAIR_STATE_KEY);
  assert.equal(st.done, true); assert.equal(st.tallies.links_fixed, 1);
  assert.ok(!ts.data.has(vt.LOCK_KEY), "lock released");
  assert.ok([...ls.data.values()].every((v) => v.link.endsWith("&t=707s")));
});

// ── 2. C-SPAN attribution + chamber ─────────────────────────────────────────
console.log(" 2 · C-SPAN attribution and source type");
const CSPAN_ITEM = {
  politician_id: "adelita_grijalva", topic: "epstein_files_transparency", position: "support", confidence: 1, strength: "strong",
  source_type: "official House proceedings video (C-SPAN) — video post", link: `https://www.youtube.com/watch?v=${GID}&t=707s`,
  excerpt: QUOTE, date: "2026-11-21", attribution: "Source: C-SPAN video", primary_kind: "official_page", rules_version: "phase9-v3",
};
await t("a C-SPAN item's facts line says “C-SPAN video” and never “campaign page”", async () => {
  const e = locker.toSpotlightEntry(CSPAN_ITEM, { key: "k" });
  assert.ok(!/campaign page/i.test(JSON.stringify(e)), e.facts);
  assert.match(e.facts, /^In a C-SPAN video, Grijalva stated: “That is why I will sign/);
  assert.match(e.facts, /Source: C-SPAN video\./);
  // Same with no primary kind at all (the fall-through that produced "campaign page").
  const e2 = locker.toSpotlightEntry({ ...CSPAN_ITEM, primary_kind: undefined });
  assert.ok(!/campaign page/i.test(e2.facts), e2.facts);
});

await t("the C-SPAN source type is named for the member's chamber", async () => {
  assert.equal(video.cspanSourceType("senate", "video post"), "official Senate proceedings video (C-SPAN) — video post");
  assert.equal(video.cspanSourceType("house", "hearing"), "official House proceedings video (C-SPAN) — hearing");
  assert.equal(video.cspanSourceType(null, "video post"), "official C-SPAN video — video post", "a governor is not given a chamber");
  assert.equal(locker.attributionFor(video.cspanSourceType("senate"), CSPAN_ITEM.link), "Source: C-SPAN video");
  assert.equal(video.relabelCspanSourceType("official House proceedings video (C-SPAN) — floor speech", "senate"), "official Senate proceedings video (C-SPAN) — floor speech");
  assert.equal(video.relabelCspanSourceType("official House proceedings video (C-SPAN) — floor speech", "house"), null);
  // Chamber from the member map, else the official host.
  assert.equal(video.chamberForRow({ politician_id: "x" }, { chamber: "senate", serving119: true }), "senate");
  assert.equal(video.chamberForRow({ politician_id: "x", official: { url: "https://www.kelly.senate.gov/" } }, null), "senate");
});

await t("discovery types a senator's C-SPAN clip as Senate proceedings", async () => {
  const cfg = { name: "Mark Kelly", surname: "Kelly", chamber: "senate", default_topic: "cost_living", youtube_channels: [], govinfo: { collections: [] }, facebook_pages: [],
    search_channels: [{ channel_id: "UCb--64Gl51jIEVE-GLDAVTg", label: "C-SPAN", query: "Mark Kelly", title_must: /\bkelly\b/i }] };
  const fetch = async () => new Response(JSON.stringify({ items: [{ id: { videoId: "7qnY4S-VCvA" }, snippet: { title: "Sen. Mark Kelly at a hearing", publishedAt: "2026-11-20T00:00:00Z" } }] }), { status: 200 });
  const fresh = { frontier: {}, seen: {} };
  const merge = (st, list) => { for (const e of list) (st.frontier[e.politician_id] ||= []).push(e); return list.length; };
  const d = await video.discoverVideoSpeech({ politicians: ["mark_kelly"], configs: { mark_kelly: cfg }, fresh, fetch, state: { last: {} }, youtubeKey: "k", govinfoKey: "", mergeFrontier: merge, log: () => {} });
  assert.equal(d.entries.length, 1);
  assert.equal(d.entries[0].source_type, "official Senate proceedings video (C-SPAN) — hearing");
  // A frontier entry queued before the fix is relabelled when it is picked.
  fresh.frontier.mark_kelly[0].source_type = "official House proceedings video (C-SPAN) — hearing";
  const a = video.addVideoSpeechSources([], fresh, { configs: { mark_kelly: cfg }, politicians: ["mark_kelly"], max: 10, perPolitician: 6, log: () => {} });
  assert.equal(a.sources[0].source_type, "official Senate proceedings video (C-SPAN) — hearing");
});

await t("link repair relabels a senator's stored C-SPAN item in place (key unchanged)", async () => {
  const item = { ...CSPAN_ITEM, politician_id: "mark_kelly", link: "https://www.youtube.com/watch?v=7qnY4S-VCvA&t=40s", citation: { source_type: CSPAN_ITEM.source_type, url: "https://www.youtube.com/watch?v=7qnY4S-VCvA&t=40s" } };
  const key = locker.lockerKey(item);
  const ls = memStore({ [key]: item });
  const st = await repair.repairStep(null, { lockerStore: ls, transcriptStore: memStore(), chamberOf: (p) => (p === "mark_kelly" ? "senate" : null), log: () => {} });
  assert.equal(st.tallies.source_types_fixed, 1);
  const next = ls.data.get(key);
  assert.equal(next.source_type, "official Senate proceedings video (C-SPAN) — video post");
  assert.equal(next.citation.source_type, next.source_type);
  assert.equal(next.link, item.link);
});

// ── 3. Video items surface as video ─────────────────────────────────────────
console.log(" 3 · video items carry media");
// The Locker UI's own classifier, lifted out of evidence-locker.js.
const elSrc = fs.readFileSync(path.join(root, "evidence-locker.js"), "utf8");
const start = elSrc.indexOf("function _classify(it) {");
let depth = 0, end = start;
for (let i = elSrc.indexOf("{", start); i < elSrc.length; i++) { if (elSrc[i] === "{") depth++; else if (elSrc[i] === "}" && --depth === 0) { end = i + 1; break; } }
const classify = new Function(`${elSrc.slice(start, end)}; return _classify;`)();

await t("a video item's spotlight entry carries media and the Locker UI classifies it as a YouTube video", async () => {
  const e = locker.toSpotlightEntry(CSPAN_ITEM);
  assert.deepEqual(e.media, { type: "video", kind: "youtube", url: CSPAN_ITEM.link, label: "C-SPAN video", timestamp: "11:47" });
  assert.equal(classify(e), "youtube");
  const own = locker.toSpotlightEntry({ ...CSPAN_ITEM, source_type: "official YouTube video (own channel) — video post", attribution: "Source: official YouTube channel", link: "https://www.youtube.com/watch?v=AbCdEfGhIj0&t=3725s" });
  assert.equal(own.media.label, "official YouTube channel");
  assert.equal(own.media.timestamp, "1:02:05");
  assert.match(own.facts, /^On Grijalva's own YouTube channel/);
  const plain = locker.toSpotlightEntry({ ...CSPAN_ITEM, link: "https://www.youtube.com/watch?v=AbCdEfGhIj0" });
  assert.equal(plain.media.timestamp, undefined);
  assert.equal(classify(plain), "youtube");
});

await t("non-video items are served exactly as before (no media, same facts)", async () => {
  const page = { politician_id: "aoc", topic: "housing", position: "support", confidence: 0.85, strength: "strong", source_type: "official issues page", link: "https://ocasio-cortez.house.gov/issues/housing", excerpt: "Housing is a human right.", date: "2026-11-01", attribution: "Source: official House page", rules_version: "phase9-v3" };
  const e = locker.toSpotlightEntry(page);
  assert.equal("media" in e, false);
  assert.match(e.facts, /^On (\S+)'s official page, \1 stated: “Housing is a human right\.” Source: official House page\. Captured Nov 1, 2026\.$/);
  assert.equal(e.sourceType, "statement");
  assert.equal(classify(e), "statement");
  const camp = locker.toSpotlightEntry({ ...page, attribution: "Source: campaign page", link: "https://example.com/issues" });
  assert.match(camp.facts, /'s campaign page, /);
});

// ── 4. Queue order ──────────────────────────────────────────────────────────
console.log(" 4 · transcript queue order");
const entry = (over) => ({ video_id: "x", queued_at: "2026-11-20T00:00:00Z", title: "", src: { politician_id: "p", source_type: "official YouTube video (own channel) — video post", source_class: "youtube_video" }, ...over });
await t("a C-SPAN hearing is transcribed before a campaign livestream that sorts first by video id", async () => {
  const ts = memStore();
  const campaign = { politician_id: "camp_pol", topic: "cost_living", source_type: "campaign YouTube channel (the politician's own)", source_class: "youtube", source_id: "discovered-camp", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCaaaaaaaaaaaaaaaaaaaaaa" };
  const hearing = { politician_id: "hear_pol", topic: "cost_living", source_type: "official House proceedings video (C-SPAN) — hearing", source_class: "youtube_video", source_id: "fresh-vs-aaaaaaaaaaaa", speech_kind: "hearing", url: "https://www.youtube.com/watch?v=zzzzzzzzzzz" };
  await vt.enqueueTranscript(ts, campaign, { videoId: "-aaaaaaaaaa", title: "LIVE: Election night livestream", published: "2026-11-26" });
  await vt.enqueueTranscript(ts, hearing, { videoId: "zzzzzzzzzzz", title: "Rep. Doe questions witnesses at Oversight hearing", published: "2026-11-01" });
  const order = [];
  const logs = [];
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), max: 1, callDelayMs: 0, log: (l) => logs.push(l),
    generate: async ({ videoId }) => { order.push(videoId); return { segments: [] }; } }));
  assert.deepEqual(order, ["zzzzzzzzzzz"], "the hearing goes first, the livestream waits");
  assert.equal(value.remaining, 1);
  assert.ok(ts.data.has(vt.queueKey("-aaaaaaaaaa")));
  assert.ok(logs.some((l) => /queue order — zzzzzzzzzzz \(hearing\/floor\)/.test(l)));
});

await t("order: hearing/floor > C-SPAN > official > campaign, then tier, then evidence need, then newest", async () => {
  const rows = [
    { key: "a", entry: entry({ src: { politician_id: "p", source_type: "campaign YouTube channel (the politician's own)" } }) },
    { key: "b", entry: entry({ src: { politician_id: "p", source_type: "official House proceedings video (C-SPAN) — video post" } }) },
    { key: "c", entry: entry({}) },
    { key: "d", entry: entry({ title: "Sen. Doe speaks on Senate floor about the farm bill" }) },
    { key: "e", entry: entry({ src: { politician_id: "p", source_type: "official House proceedings video (C-SPAN) — floor speech", speech_kind: "floor speech" } }) },
  ];
  assert.deepEqual(vt.orderQueue(rows).map((r) => r.key), ["d", "e", "b", "c", "a"]);
  const tiers = [
    { key: "t3", entry: entry({ priority: { tier: 3 } }) },
    { key: "t1", entry: entry({ priority: { tier: 1 } }) },
    { key: "roster2", entry: entry({ src: { politician_id: "two", source_type: "official YouTube video (own channel)" } }) },
  ];
  assert.deepEqual(vt.orderQueue(tiers, { tierOf: (p) => (p === "two" ? 2 : null) }).map((r) => r.key), ["t1", "roster2", "t3"]);
  const need = [
    { key: "filled", entry: entry({ priority: { tier: 1, band: 1, no_evidence: false } }) },
    { key: "open", entry: entry({ priority: { tier: 1, band: 0, no_evidence: false } }) },
    { key: "none", entry: entry({ priority: { tier: 1, band: 0, no_evidence: true } }) },
  ];
  assert.deepEqual(vt.orderQueue(need).map((r) => r.key), ["none", "open", "filled"]);
  const when = [
    { key: "old", entry: entry({ published: "2026-10-01" }) },
    { key: "new", entry: entry({ published: "2026-11-25" }) },
    { key: "queued-only", entry: entry({ queued_at: "2026-11-10T00:00:00Z" }) },
  ];
  assert.deepEqual(vt.orderQueue(when).map((r) => r.key), ["new", "queued-only", "old"]);
});

await t("the queue entry carries the cron's priority hints and the speech kind", async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, { ...GSRC, speech_kind: "hearing", queue_priority: { tier: 1, band: 0, no_evidence: true } }, { videoId: GID, title: "t" });
  const e = ts.data.get(vt.queueKey(GID));
  assert.deepEqual(e.priority, { tier: 1, band: 0, no_evidence: true });
  assert.equal(e.src.speech_kind, "hearing");
  assert.equal(vt.queueKindRank(e), 0);
  assert.equal(worker.politicianTier("__nobody__"), null);
});

console.log(failures ? `✗ video pipeline fixes: ${passed} passed, ${failures} failed` : `✓ video pipeline fixes: ${passed} passed, 0 failed`);
if (failures) process.exit(1);
