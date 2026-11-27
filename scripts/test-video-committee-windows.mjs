#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-committee-windows.mjs — hearing coverage + long-video scoring
//
//   1. COMMITTEE / FLOOR CHANNELS. A short, verified list of official
//      committee channels and the two Senate party conference channels feeds
//      the existing video discovery path: each video is matched to ONE roster
//      member (named in the title, else the committee chair for a hearing),
//      queued into that member's frontier, picked into the pull list when they
//      are planned, and worked first by the transcript queue (hearing).
//   2. LONG VIDEOS IN WINDOWS. A long transcript is scored per time window: a
//      clear position in one window is no longer cancelled by a counter-note
//      elsewhere; short videos are scored exactly as before.
//   3. HEARINGS. A hearing with little of the member in the first 20 minutes
//      is read in further 20-minute windows; other videos are read once.
//
// No network, no AI calls.   node scripts/test-video-committee-windows.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vt = await import("../netlify/lib/video-transcripts.mjs");
const video = await import("../netlify/lib/raw-ingest-video.mjs");
const locker = await import("../netlify/lib/evidence-locker-core.mjs");
const ss = await import("../netlify/lib/stance-score-core.mjs");
const freshLib = await import("../netlify/lib/raw-ingest-fresh.mjs");
const { ROSTER } = await import("../netlify/lib/raw-ingest-core.mjs");

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
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
    async delete(k) { data.delete(k); },
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const NOW = () => new Date("2026-11-27T16:00:00.000Z");
const PERSON_COMMITTEES = JSON.parse(fs.readFileSync(path.join(root, "db/person-committees.json"), "utf8"));

// ── Fixtures: a tiny roster + committee file ───────────────────────────────
const JUD = video.INSTITUTIONAL_CHANNELS.find((c) => c.committee === "JU00");
const COMMERCE = video.INSTITUTIONAL_CHANNELS.find((c) => c.committee === "SSCM00");
const row = (pid, name, tier, host) => ({ politician_id: pid, name, tier, official: { url: `https://${host}/`, topic: "cost_living" }, sources: [] });
const ROSTER_FX = [
  row("pat_doe", "Pat Doe", 2, "doe.house.gov"),
  row("lee_chair", "Lee Chairman", 1, "chairman.house.gov"),
  row("sam_outsider", "Sam Outsider", 1, "outsider.house.gov"),
  row("kim_senator", "Kim Senator", 1, "senator.senate.gov"),
];
const COMMITTEES_FX = {
  committees: { JU00: ["Committee on the Judiciary", "house"], JU01: ["Crime", "house", "JU00"], SSCM00: ["Committee on Commerce, Science, and Transportation", "senate"] },
  people: { pat_doe: [["JU00"], ["JU01"]], lee_chair: [["JU00", "Chair"]], sam_outsider: [], kim_senator: [["SSCM00"]] },
};
const MEMBERS = video.institutionalMembers(ROSTER_FX, { committees: COMMITTEES_FX });
const feedXml = (items) => `<?xml version="1.0"?><feed>${items.map((v) => `<entry><yt:videoId>${v.id}</yt:videoId><title>${v.title}</title><published>${v.published || "2026-11-26T15:00:00+00:00"}</published></entry>`).join("")}</feed>`;
const FEEDS = {
  [JUD.channel_id]: feedXml([
    { id: "JudDoe00001", title: "Rep. Pat Doe Questions FBI Director at Judiciary Hearing" },
    { id: "JudGeneric1", title: "Full Committee Hearing: Oversight of the Department of Justice" },
    { id: "JudOutsid01", title: "Rep. Sam Outsider joins the hearing" },
    { id: "JudSeen0001", title: "Rep. Pat Doe on the floor" },
  ]),
  [COMMERCE.channel_id]: feedXml([{ id: "ComKim00001", title: "Sen. Kim Senator presses witnesses at Commerce hearing" }]),
};
function fakeFetch(calls = []) {
  return async (url) => {
    calls.push(String(url));
    const id = (/channel_id=([^&]+)/.exec(String(url)) || [])[1];
    if (id && FEEDS[id]) return new Response(FEEDS[id], { status: 200 });
    return new Response("not found", { status: 404 });
  };
}

console.log("committee channels + long-video windows:");

// ── 1. Committee / floor channels ──────────────────────────────────────────
console.log(" 1 · committee and floor channels");
await t("a focused list of 8–12 verified channels; committee codes exist; the conference channels come as a pair", async () => {
  const list = video.INSTITUTIONAL_CHANNELS;
  assert.ok(list.length >= 8 && list.length <= 12, `${list.length} channels`);
  assert.equal(new Set(list.map((c) => c.channel_id)).size, list.length, "unique channel ids");
  for (const c of list) {
    assert.match(c.channel_id, /^UC[A-Za-z0-9_-]{22}$/, c.label);
    assert.ok(c.chamber === "house" || c.chamber === "senate", c.label);
    if (c.kind === "committee") assert.ok(PERSON_COMMITTEES.committees[c.committee] && !PERSON_COMMITTEES.committees[c.committee][2], `${c.label}: top-level committee ${c.committee}`);
  }
  const conf = list.filter((c) => c.kind === "conference");
  assert.deepEqual(conf.map((c) => c.label).sort(), ["Senate Democrats", "Senate Republicans"]);
  for (const k of ["JU00", "GO00", "IF00", "AS00"]) assert.ok(list.some((c) => c.committee === k), `has ${k}`);
});

await t("every listed committee seats at least one tier-1 / tier-2 roster member", async () => {
  const tier = new Map(ROSTER.map((r) => [r.politician_id, Number(r.tier)]));
  for (const c of video.INSTITUTIONAL_CHANNELS.filter((x) => x.kind === "committee")) {
    const n = Object.entries(PERSON_COMMITTEES.people).filter(([pid, l]) => (tier.get(pid) === 1 || tier.get(pid) === 2) && l.some(([code]) => (PERSON_COMMITTEES.committees[code]?.[2] || code) === c.committee)).length;
    assert.ok(n > 0, `${c.label}: ${n}`);
  }
});

await t("a title is matched to one committee member (named first, else the chair for a hearing); non-members are not", async () => {
  const m = (title, ch = JUD) => video.matchInstitutionalVideo({ title }, ch, MEMBERS);
  assert.equal(m("Rep. Pat Doe Questions FBI Director")?.member.politician_id, "pat_doe");
  assert.equal(m("Rep. Pat Doe Questions FBI Director")?.via, "title");
  assert.equal(m("Chairman Chairman opens the markup")?.member.politician_id, "lee_chair");
  const g = m("Full Committee Hearing: Oversight of the Department of Justice");
  assert.equal(g?.member.politician_id, "lee_chair"); assert.equal(g?.via, "chair");
  assert.equal(m("Rep. Sam Outsider joins the hearing")?.via, "chair", "Outsider is not on Judiciary → never matched by name");
  assert.equal(video.matchInstitutionalVideo({ title: "Rep. Sam Outsider joins" }, JUD, MEMBERS, { allowChair: false }), null);
  assert.equal(m("Sen. Kim Senator presses witnesses", COMMERCE)?.member.politician_id, "kim_senator");
  assert.equal(m("Rep. Pat Doe at Commerce", COMMERCE), null, "a House member is never matched on a Senate channel");
});

await t("discovery queues committee videos into the matched member's frontier (same frontier), one member per video", async () => {
  const fresh = { frontier: {}, seen: { [freshLib.normUrl("https://www.youtube.com/watch?v=JudSeen0001")]: "2026-11-01" } };
  const calls = [];
  const { value: out } = await quiet(() => video.discoverVideoSpeech({
    politicians: [], fresh, fetch: fakeFetch(calls), now: NOW, log: () => {}, state: { last: {} }, mergeFrontier: freshLib.mergeFrontier,
    youtubeKey: "", govinfoKey: "",
    institutional: { channels: [JUD, COMMERCE], members: MEMBERS },
  }));
  assert.deepEqual(out.channels_checked.sort(), [JUD.channel_id, COMMERCE.channel_id].sort());
  assert.ok(calls.every((u) => /feeds\/videos\.xml\?channel_id=/.test(u)), "reads the public channel feeds");
  const doe = fresh.frontier.pat_doe || [];
  assert.equal(doe.length, 1);
  assert.equal(doe[0].url, "https://www.youtube.com/watch?v=JudDoe00001");
  assert.equal(doe[0].source_class, "youtube_video");
  assert.equal(doe[0].speech_kind, "hearing");
  assert.equal(doe[0].source_type, "official House committee video (House Judiciary Committee) — hearing");
  assert.ok(video.isVideoSpeechEntry(doe[0]), "a video/speech frontier entry");
  assert.equal(doe[0].speaker_surname, "Doe");
  const chair = (fresh.frontier.lee_chair || []).map((e) => e.url).sort();
  assert.deepEqual(chair, ["https://www.youtube.com/watch?v=JudGeneric1", "https://www.youtube.com/watch?v=JudOutsid01"], "generic hearings go to the chair (≤ 2 per channel)");
  assert.equal(fresh.frontier.sam_outsider, undefined);
  assert.equal(fresh.frontier.kim_senator?.[0]?.source_type, "official Senate committee video (Senate Commerce Committee) — hearing");
  const all = Object.values(fresh.frontier).flat().map((e) => e.url);
  assert.equal(new Set(all).size, all.length, "each video in one frontier only");
  assert.ok(!all.includes("https://www.youtube.com/watch?v=JudSeen0001"), "already-read video not queued");
  // A second pass inside the hour does not re-read the channels.
  const calls2 = [];
  const { value: again } = await quiet(() => video.discoverVideoSpeech({ politicians: [], fresh, fetch: fakeFetch(calls2), now: NOW, log: () => {}, state: out.state, mergeFrontier: freshLib.mergeFrontier, youtubeKey: "", govinfoKey: "", institutional: { channels: [JUD, COMMERCE], members: MEMBERS } }));
  assert.equal(calls2.length, 0); assert.equal(again.channels_checked.length, 0);
});

await t("a queued committee video joins the pull list when its member is planned and is transcribed before a campaign video", async () => {
  const fresh = { frontier: {}, seen: { [freshLib.normUrl("https://www.youtube.com/watch?v=JudSeen0001")]: "2026-11-01" } };
  await quiet(() => video.discoverVideoSpeech({ politicians: [], fresh, fetch: fakeFetch(), now: NOW, log: () => {}, state: { last: {} }, mergeFrontier: freshLib.mergeFrontier, youtubeKey: "", govinfoKey: "", institutional: { channels: [JUD], members: MEMBERS } }));
  const configs = video.buildVideoSpeechConfigs(ROSTER_FX);
  const { sources, added } = video.addVideoSpeechSources([], fresh, { politicians: ["pat_doe"], max: 10, perPolitician: 5, configs, log: () => {} });
  assert.equal(added.length, 1);
  assert.equal(sources[0].url, "https://www.youtube.com/watch?v=JudDoe00001");
  const ts = memStore();
  await vt.enqueueTranscript(ts, { politician_id: "zz_campaign", topic: "cost_living", source_class: "youtube_video", source_type: "campaign YouTube video", url: "https://www.youtube.com/watch?v=AAAAcampaig" }, { videoId: "AAAAcampaig", title: "Campaign livestream" });
  await vt.enqueueTranscript(ts, sources[0], { videoId: "JudDoe00001", title: sources[0].title });
  const q = ts.data.get(vt.queueKey("JudDoe00001"));
  assert.equal(q.src.speech_kind, "hearing");
  assert.equal(vt.queueKindRank(q), 0, "hearing / floor first");
  const order = vt.orderQueue([...ts.data.entries()].map(([key, entry]) => ({ key, entry })));
  assert.equal(order[0].entry.video_id, "JudDoe00001");
});

await t("a committee item is named for the committee (not the member's own channel); C-SPAN labels unchanged", async () => {
  const st = "official House committee video (House Judiciary Committee) — hearing";
  const link = "https://www.youtube.com/watch?v=JudDoe00001&t=90s";
  assert.equal(locker.attributionFor(st, link), "Source: House Judiciary Committee video");
  assert.equal(locker.attributionFor("official Senate party conference video (Senate Democrats) — floor speech", link), "Source: Senate Democrats video");
  assert.equal(locker.attributionFor("official Senate proceedings video (C-SPAN) — hearing", link), "Source: C-SPAN video");
  assert.equal(locker.attributionFor("official YouTube video (own channel) — video post", link), "Source: official YouTube channel");
  const e = locker.toSpotlightEntry({ politician_id: "pat_doe", topic: "cost_living", position: "support", source_type: st, attribution: locker.attributionFor(st, link), link, excerpt: "I will fight to lower prices.", date: "2026-11-26" });
  assert.match(e.facts, /^In a House Judiciary Committee video, Doe stated:/);
  assert.doesNotMatch(e.facts, /own YouTube channel|campaign page/);
  assert.equal(e.media?.label, "House Judiciary Committee video");
  assert.equal(e.media?.timestamp, "1:30");
});

// ── 2. Long videos in windows ───────────────────────────────────────────────
console.log(" 2 · long videos scored in time windows");
const FILL = ["Thank you, Mr. Chairman, for holding this session today.", "I want to welcome our witnesses to the committee.", "The witness has been very generous with her time this morning.", "I appreciate the work of the staff on both sides.", "Let me ask about the timeline for the agency's report.", "When will the committee receive the final documents?", "I look forward to working with my colleagues on this.", "We will have more questions for the record."];
const SUPPORT = "I will fight to lower prices for working families in my district.";
const NOTE = "Some people want to repeal the child tax credit.";
const docOf = (parts) => ({ status: "ok", time_format: "seconds", segments: parts.map(([t, text, own = true]) => ({ t, text, own })) });
function longParts({ fill = 44, step = 20, extra = [] } = {}) {
  const p = [[10, SUPPORT]];
  let at = 10;
  for (let i = 0; i < fill; i++) p.push([at += step, FILL[i % FILL.length]]);
  for (const x of extra) p.push([at += step, x]);
  return p;
}
const VSRC = { politician_id: "pat_doe", topic: "cost_living", source_type: "official House committee video (House Ways and Means Committee) — hearing", source_class: "youtube_video", source_id: "fresh-vs-aaaaaaaaaaaa", url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" };
const recOf = (parts, title = "Rep. Doe questions witnesses on the cost of living") => vt.buildVideoRecord({ src: VSRC, videoId: "AAAAAAAAAAA", title, doc: docOf(parts), fetchedAt: "2026-11-27T00:00:00.000Z" });

await t("windows: a new window every ~2.5 minutes and after a long turn by someone else", async () => {
  const rec = recOf([[0, "One."], [40, "Two."], [80, "Three."], [120, "Four."], [150, "Five."], [400, "Six after a long answer by the witness."]]);
  const w = vt.videoWindows(rec);
  assert.deepEqual(w.map((x) => [x.start, x.end]), [[0, 120], [150, 150], [400, 400]]);
  assert.equal(w[0].body, "One. Two. Three. Four.");
  assert.deepEqual(w[0].segments, [{ t: 0, at: 0 }, { t: 40, at: 5 }, { t: 80, at: 10 }, { t: 120, at: 17 }]);
});

await t("a long video keeps a clear position that the whole-video read cancelled to mixed", async () => {
  const rec = recOf(longParts({ extra: [NOTE] }));
  assert.equal(vt.isLongVideoRecord(rec), true);
  const whole = ss.logCandidateStances(rec, { log: () => {} }).find((c) => c.topic === "cost_living");
  assert.equal(whole.position, "mixed", "before: one counter-note twenty minutes later cancels the clear statement");
  const scored = vt.scoreRecordCandidates(rec, { log: () => {} });
  const c = scored.find((x) => x.candidate.topic === "cost_living");
  assert.equal(c.candidate.position, "support");
  assert.equal(c.candidate.windowed, true);
  assert.equal(c.candidate.sources[0].windows_against, 1);
  assert.ok(c.candidate.confidence > whole.confidence && c.candidate.confidence < 1, `confidence ${c.candidate.confidence}: the counter window still costs R5's penalty`);
  assert.match(c.candidate.confidence_reason, /time window 1\/\d+ \(0:10–/);
  assert.equal(c.raw.window.index, 0, "the window record goes to the Locker writer");
  assert.equal(vt.lockerRawFor(c.candidate, c.raw).final_url, "https://www.youtube.com/watch?v=AAAAAAAAAAA&t=10s");
});

await t("scored through the real Locker writer, the long video lands a support item at the second it is said", async () => {
  const ls = memStore();
  const { value } = await quiet(() => vt.scoreIntoLocker(Object.freeze({ ...recOf(longParts({ extra: [NOTE] })), key: "k" }), { lockerStore: ls, log: () => {} }));
  const item = [...ls.data.values()].find((v) => v.topic === "cost_living");
  assert.ok(item, `a cost-of-living item (writes: ${JSON.stringify(value.writes)})`);
  assert.equal(item.position, "support");
  assert.equal(item.link, "https://www.youtube.com/watch?v=AAAAAAAAAAA&t=10s");
});

await t("an even split of explicit windows leaves the whole-video read in place", async () => {
  const rec = recOf(longParts({ extra: ["I oppose the tax cuts in this bill."] }));
  const whole = ss.logCandidateStances(rec, { log: () => {} });
  const scored = vt.scoreRecordCandidates(rec, { log: () => {} });
  const a = whole.find((c) => c.topic === "cost_living"), b = scored.find((x) => x.candidate.topic === "cost_living");
  assert.equal(b.candidate.windowed, undefined);
  assert.deepEqual(b.candidate, a);
  assert.equal(b.raw, rec);
});

await t("generic title: a window that centres on one issue is scored under it; a topical title keeps the page topic", async () => {
  const BORDER = ["We must secure the border now.", "I support finishing the border wall.", "Border security is national security and the border must be secured."];
  const parts = longParts({ fill: 30, extra: [] });
  let at = parts[parts.length - 1][0] + 200;
  for (const s of BORDER) parts.push([at += 10, s]);
  for (let i = 0; i < 12; i++) parts.push([at += 20, FILL[i % FILL.length]]);
  const generic = vt.scoreRecordCandidates(recOf(parts, "Full Committee Hearing"), { log: () => {} });
  const b = generic.find((x) => x.candidate.topic === "border_security");
  assert.ok(b, "a border-security candidate");
  assert.equal(b.candidate.position, "support");
  assert.equal(b.candidate.windowed, true);
  assert.equal(b.raw.topic, "border_security", "the window was scored under the issue it centres on");
  assert.equal(b.candidate.page_topic, "cost_living");
  const topical = vt.scoreRecordCandidates(recOf(parts), { log: () => {} });
  for (const x of topical) assert.equal(x.raw.topic, "cost_living", "title names the issue: windows keep the page topic");
});

await t("short videos are scored exactly as before (same candidates, whole record to the writer)", async () => {
  const short = recOf([[10, SUPPORT], [40, FILL[0]], [70, NOTE]]);
  assert.equal(vt.isLongVideoRecord(short), false);
  const before = ss.logCandidateStances(short, { log: () => {} });
  const now = vt.scoreRecordCandidates(short, { log: () => {} });
  assert.deepEqual(now.map((x) => x.candidate), before);
  assert.ok(now.every((x) => x.raw === short));
  // The Grijalva regression transcript (37 own segments) stays a short video.
  const G = JSON.parse(fs.readFileSync(path.join(root, "scripts/fixtures/video-G1xkgCCvPvY-transcript.json"), "utf8"));
  const g = vt.buildVideoRecord({ src: { ...VSRC, politician_id: "adelita_grijalva", topic: "epstein_files_transparency" }, videoId: "G1xkgCCvPvY", title: "Adelita Grijalva sworn in", doc: G, fetchedAt: "2026-11-21T00:00:00.000Z" });
  assert.equal(vt.isLongVideoRecord(g), false);
  assert.deepEqual(vt.scoreRecordCandidates(g, { log: () => {} }).map((x) => x.candidate), ss.logCandidateStances(g, { log: () => {} }));
  // Non-video records are never windowed.
  const page = { ...short, type: "page", segments: undefined };
  assert.equal(vt.isLongVideoRecord(page), false);
});

await t("long own speech by duration alone (≥ 15 min over ≥ 12 segments) is windowed; a few far-apart lines are not", async () => {
  const parts = Array.from({ length: 12 }, (_, i) => [i * 90, FILL[i % FILL.length]]);
  assert.equal(vt.isLongVideoRecord(recOf(parts)), true);
  assert.equal(vt.isLongVideoRecord(recOf(parts.slice(0, 11))), false);
});

// ── 3. Hearings: further 20-minute windows ─────────────────────────────────
console.log(" 3 · hearings read in further 20-minute windows");
const queued = async (ts, id, kind, title) => vt.enqueueTranscript(ts, { politician_id: "pat_doe", topic: "cost_living", source_class: "youtube_video", source_type: `official House committee video (House Judiciary Committee) — ${kind}`, speech_kind: kind, url: `https://www.youtube.com/watch?v=${id}` }, { videoId: id, title });
const others = (from, n) => Array.from({ length: n }, (_, i) => ({ start: `${Math.floor((from + i * 60) / 60)}:${String((from + i * 60) % 60).padStart(2, "0")}`, text: `Witness answer ${from + i}.`, speaker_is_politician: false }));

await t("a hearing with little of the member in the first 20 minutes is read on; clip-relative times are shifted", async () => {
  const ts = memStore(); const calls = [];
  await queued(ts, "Hearing0001", "hearing", "Full Committee Hearing");
  const generate = async (args) => {
    calls.push(args);
    if (!args.startSeconds) return { segments: [...others(0, 19), { start: "19:50", text: "I yield to the chair.", speaker_is_politician: true }] };
    // The model counts from the start of the clip it was given.
    return { segments: [{ start: "0:30", text: SUPPORT, speaker_is_politician: true }, ...Array.from({ length: 6 }, (_, i) => ({ start: `${2 + i}:00`, text: `${FILL[i]}`, speaker_is_politician: true })), ...others(600, 10)] };
  };
  const { value } = await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, generate, log: () => {} }));
  assert.equal(calls.length, 2, "first window, then 20–40 min");
  assert.equal(calls[0].startSeconds, undefined, "the first call is unchanged");
  assert.deepEqual([calls[1].startSeconds, calls[1].maxSeconds], [1200, 1200]);
  const doc = ts.data.get(vt.cacheKey("Hearing0001"));
  assert.equal(doc.max_seconds, 2400); assert.equal(doc.windows_read, 2);
  assert.ok(doc.segments.some((s) => s.t === 1230 && s.text === SUPPORT), "0:30 into the second window is 20:30 in the video");
  assert.equal(value.recorded, 1);
});

await t("a hearing stops reading when the member has spoken enough, or when the video ends", async () => {
  const ts = memStore(); let n = 0;
  await queued(ts, "Hearing0002", "hearing", "Hearing");
  await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => { n++; return { segments: Array.from({ length: 8 }, (_, i) => ({ start: `${i}:00`, text: FILL[i], speaker_is_politician: true })) }; } }));
  assert.equal(n, 1, "8 own segments in the first window");
  const ts2 = memStore(); let m = 0;
  await queued(ts2, "Hearing0003", "hearing", "Hearing");
  await quiet(() => vt.processTranscriptQueue({ store: ts2, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => { m++; return { segments: others(0, 10) }; } }));
  assert.equal(m, 1, "the video ends at ~10 minutes");
  assert.equal(ts2.data.get(vt.cacheKey("Hearing0003")).max_seconds, 1200);
});

await t("non-hearing videos keep the single first-20-minutes read", async () => {
  for (const [id, kind] of [["FloorSpch01", "floor speech"], ["VideoPost01", "video post"]]) {
    const ts = memStore(); let n = 0;
    await queued(ts, id, kind, "Remarks");
    await quiet(() => vt.processTranscriptQueue({ store: ts, rawStore: memStore(), callDelayMs: 0, log: () => {}, generate: async () => { n++; return { segments: others(0, 20) }; } }));
    assert.equal(n, 1, kind);
    assert.equal(ts.data.get(vt.cacheKey(id)).max_seconds, vt.MAX_TRANSCRIBE_SECONDS);
  }
  assert.equal(vt.isHearingEntry({ src: { speech_kind: "floor speech" }, title: "Floor remarks at committee" }), false);
  assert.equal(vt.isHearingEntry({ src: {}, title: "Subcommittee hearing on drones" }), true);
});

console.log(`${failures ? "✗" : "✓"} committee channels + long-video windows: ${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
