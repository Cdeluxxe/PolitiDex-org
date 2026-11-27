// ─────────────────────────────────────────────────────────────────────────────
// video-transcripts.mjs — server-side transcripts for the politician's own
// YouTube videos, so a clear statement in a video can become an Evidence
// Locker citation the same way a campaign page does.
// ─────────────────────────────────────────────────────────────────────────────
// WHY. The old path scraped the caption track out of the YouTube watch page.
// YouTube serves automated server fetches a bot check / LOGIN_REQUIRED page
// with no `captionTracks` in it, so no transcript ever came back in production
// and the one cited video failed every run with "empty body".
//
// PROVIDER. Gemini through the Netlify AI Gateway. Gemini reads a public
// YouTube URL directly (fileData.fileUri), so Google fetches the video, not
// this site. The model is asked for a VERBATIM transcript, split into short
// segments, each with its start second and whether the speaker is the
// politician. Only the politician's own segments go into the text that is
// scored, so a debate or a host's question on their channel is never credited
// to them. At most MAX_TRANSCRIBE_SECONDS of each video is read.
//
// CACHE. One doc per video id in the TRANSCRIPT_STORE_NAME blob store
// (`video/<id>.json`), written once: a video is transcribed at most once
// (a video with no speech is cached as "empty"; one that keeps erroring is
// cached as "failed" after MAX_ATTEMPTS).
//
// QUEUE. Transcription takes 10–45 s per video, far too slow for the
// every-minute raw-ingest cron (30 s limit). The cron only READS the cache:
// a video with no cached transcript is queued (`queue/<id>.json`) and the
// background function (netlify/functions/video-transcribe.mts) works the
// queue: transcribe → cache → page-shaped raw record → the same scorer and
// Locker writer every campaign page goes through. A worker lock keeps two
// background runs from transcribing the same videos.
//
// RECORD. The raw record is page-shaped (body = the politician's own words
// only; the title rides along as `title`) with `type: "video"`, `link` (the watch URL) and `segments`
// ([{ t: start second, at: character offset into body }]); the Locker writer
// is handed, per candidate, a copy of the record whose link is
// watch?v=ID&t=NNs at the excerpt it cites (lockerRawFor), so the item and its
// citation point at the moment the words are spoken. The Locker writer itself
// is unchanged.

import { logCandidateStances } from "./stance-score-core.mjs";
import { maybeWriteLockerItem, citationExcerpts } from "./evidence-locker-core.mjs";

export const TRANSCRIPT_STORE_NAME = "video-transcripts";
export const TRANSCRIPT_PROVIDER = "gemini";
export const TRANSCRIPT_MODEL = "gemini-3.5-flash";
export const MAX_TRANSCRIBE_SECONDS = 1200;      // the first 20 minutes of a video
export const TRANSCRIBE_PER_RUN = 4;             // videos per background run (kept small for Gemini rate limits)
export const TRANSCRIBE_CONCURRENCY = 1;         // one Gemini call at a time …
// … with a pause between calls, to stay under the 429 limit. A 20-minute video
// is a large request, so the limit that bites is tokens per minute, not
// requests: at 1.5 s the 3rd and 4th call of a batch drew 429s. 18 s keeps a
// 4-video batch near three calls a minute (a run is ~1–4 min, well inside the
// 11-min budget and the 15-min lock).
export const TRANSCRIBE_CALL_DELAY_MS = 18_000;
export const TRANSCRIBE_BUDGET_MS = 11 * 60_000; // stop starting new videos after this (15-min limit)
export const MAX_ATTEMPTS = 3;
export const LOCK_KEY = "worker-lock.json";
export const LOCK_TTL_MS = 15 * 60_000;
export const MAX_VIDEO_BODY_CHARS = 200_000;

export const cacheKey = (videoId) => `video/${videoId}.json`;
export const queueKey = (videoId) => `queue/${videoId}.json`;
const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;
const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();

/** Turn a politician id into a readable name when no roster name is at hand. */
export function nameFromId(pid) {
  const words = String(pid || "").split("_").filter(Boolean);
  if (words.length > 1 && /^[a-z]{2}$/.test(words[words.length - 1])) words.pop(); // "altendorf_mn" → "Altendorf"
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Provider ────────────────────────────────────────────────────────────────

export function transcriptPrompt(name) {
  return [
    "Transcribe the spoken words in this video VERBATIM — exactly as spoken. Do not summarise, paraphrase, correct or add anything.",
    "Split the transcript into segments of one or two sentences, in order.",
    "For each segment give `start` (its start time from the beginning of the video as a clock string: \"M:SS\" or \"MM:SS\" under an hour, \"H:MM:SS\" after — e.g. \"0:07\", \"11:47\", \"1:02:05\"), `text` (the exact words), and",
    `\`speaker_is_politician\`: true only when the person speaking is ${name || "the politician who owns this channel"}; false for anyone else (a host, moderator, opponent, narrator, voice-over or crowd).`,
    "Leave out music, sound effects and on-screen text that nobody says. If nobody speaks, return an empty list of segments.",
  ].join("\n");
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        // A clock string ("11:47", "1:02:05"). As a NUMBER the model wrote the
        // clock digits as one number (11:47 → 1147), not seconds.
        properties: { start: { type: "STRING" }, text: { type: "STRING" }, speaker_is_politician: { type: "BOOLEAN" } },
        required: ["start", "text", "speaker_is_politician"],
      },
    },
  },
  required: ["segments"],
};

/**
 * Default provider call: Gemini via the Netlify AI Gateway. Returns the
 * model's parsed JSON ({ segments: [...] }). Throws on a provider error.
 */
export async function geminiGenerate({ videoId, name, model = TRANSCRIPT_MODEL, maxSeconds = MAX_TRANSCRIBE_SECONDS }) {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({
    apiKey: process.env.NETLIFY_AI_GATEWAY_KEY,
    httpOptions: { baseUrl: process.env.NETLIFY_AI_GATEWAY_URL?.replace(/\/$/, "") },
  });
  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: "user",
      parts: [
        { fileData: { fileUri: watchUrl(videoId), mimeType: "video/*" }, videoMetadata: { startOffset: "0s", endOffset: `${maxSeconds}s` } },
        { text: transcriptPrompt(name) },
      ],
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      mediaResolution: "MEDIA_RESOLUTION_LOW",
      thinkingConfig: { thinkingLevel: "low" },
    },
  });
  return JSON.parse(String(response.text || "{}"));
}

// ── Segment times ───────────────────────────────────────────────────────────
// Every `t` this module writes from now on is SECONDS from the start of the
// video (TIME_FORMAT, stamped as `time_format` on the cache doc and the raw
// record). Transcripts cached before that asked Gemini for a NUMBER and got the
// clock digits instead: 1:07 → 107, 19:57 → 1957. Those docs carry no
// `time_format`; segmentSeconds decodes them on read (looksLikeClockDigits), so
// already-cached data resolves to the right second without a re-transcription.
export const TIME_FORMAT = "seconds";

/** "M:SS" / "MM:SS" / "H:MM:SS" → seconds; null when the value is not a clock string. */
export function parseClock(v) {
  const m = /^\s*(?:(\d+):)?(\d{1,3}):(\d{1,2}(?:\.\d+)?)\s*$/.exec(String(v ?? ""));
  if (!m) return null;
  const h = Number(m[1] || 0), mi = Number(m[2]), se = Math.floor(Number(m[3]));
  if (se >= 60 || (m[1] !== undefined && mi >= 60)) return null;
  return h * 3600 + mi * 60 + se;
}

/** Clock digits written as one number (1147 = 11:47, 10507 = 1:05:07) → seconds. */
export const clockDigitsToSeconds = (n) => {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return Math.floor(v / 10000) * 3600 + (Math.floor(v / 100) % 100) * 60 + (v % 100);
};

/**
 * Do these numeric start values look like clock digits rather than seconds?
 * Yes when some value is ≥ 100 and none has last two digits ≥ 60 (nor, past
 * 9999, a minutes pair ≥ 60) — real seconds land on :60–:99 about 40% of the
 * time, clock digits never do.
 */
export function looksLikeClockDigits(values) {
  const v = (values || []).map((x) => Math.floor(Number(x))).filter((x) => Number.isFinite(x) && x >= 0);
  if (!v.some((x) => x >= 100)) return false;
  return v.every((x) => x % 100 < 60 && (x < 10000 || Math.floor(x / 100) % 100 < 60));
}

/**
 * A cached doc's (or stored raw record's) segments with `t` in seconds. Docs
 * stamped time_format "seconds" are returned as is; older ones are decoded
 * when their times look like clock digits.
 */
export function segmentSeconds(docOrRecord) {
  const segs = Array.isArray(docOrRecord?.segments) ? docOrRecord.segments : [];
  if (docOrRecord?.time_format === TIME_FORMAT || !looksLikeClockDigits(segs.map((s) => s?.t))) return segs;
  return segs.map((s) => ({ ...s, t: clockDigitsToSeconds(s.t) }));
}

/** Was this cached doc written with clock digits (needs decoding)? */
export const hasClockDigitTimes = (doc) => !!doc && doc.time_format !== TIME_FORMAT && looksLikeClockDigits((doc.segments || []).map((s) => s?.t));

/**
 * Clean the provider's segments: [{ t, text, own }], t in seconds, in time
 * order, empty text dropped. A clock string start is parsed; a bare number
 * (an injected or older provider) is read as seconds unless the response's
 * numbers look like clock digits, then they are decoded.
 */
export function normaliseSegments(json) {
  const list = Array.isArray(json?.segments) ? json.segments : [];
  const rows = list.map((s) => {
    const v = s?.start ?? s?.t;
    const clock = parseClock(v);
    return { clock, num: clock === null ? Math.max(0, Math.floor(Number(v) || 0)) : null, text: oneLine(s?.text), own: s?.speaker_is_politician !== false };
  });
  const digits = looksLikeClockDigits(rows.filter((r) => r.clock === null).map((r) => r.num));
  return rows
    .map((r) => ({ t: r.clock !== null ? r.clock : digits ? clockDigitsToSeconds(r.num) : r.num, text: r.text, own: r.own }))
    .filter((s) => s.text)
    .sort((a, b) => a.t - b.t);
}

/**
 * Transcribe one video. Never throws:
 *   { ok: true, segments, text }   (text = every segment, whoever speaks)
 *   { ok: false, error }
 */
export async function transcribeVideo(videoId, { name, generate = geminiGenerate, model = TRANSCRIPT_MODEL } = {}) {
  try {
    const segments = normaliseSegments(await generate({ videoId, name, model }));
    return { ok: true, segments, text: segments.map((s) => s.text).join(" ") };
  } catch (e) {
    return { ok: false, error: oneLine(e?.message || e).slice(0, 300) || "transcription failed" };
  }
}

// ── Cache + queue ───────────────────────────────────────────────────────────

async function getJSON(store, key) {
  if (!store) return null;
  try {
    let v = await store.get(key, { type: "json" });
    if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
    return v ?? null;
  } catch { return null; }
}

/** The cached transcript doc for a video, or null. status: "ok" | "empty" | "failed". */
export const readTranscript = (store, videoId) => getJSON(store, cacheKey(videoId));

/** The politician's own segments of a cached transcript doc. */
export const ownSegments = (doc) => segmentSeconds(doc).filter((s) => s.own !== false && s.text);

/** Does this cached doc carry words by the politician (scorable)? */
export const hasOwnSpeech = (doc) => doc?.status === "ok" && ownSegments(doc).length > 0;

/**
 * Queue a video for the background transcriber. Write-once: a video already
 * queued is left alone. Returns true when newly queued.
 */
export async function enqueueTranscript(store, src, { videoId, title = "", channel = "", published = "", name = "" } = {}) {
  if (!store || !videoId) return false;
  const entry = {
    video_id: videoId,
    queued_at: new Date().toISOString(),
    attempts: 0,
    title: oneLine(title),
    ...(channel ? { channel } : {}),
    ...(published ? { published: String(published).slice(0, 10) } : {}),
    ...(name || src?.name ? { name: name || src.name } : {}),
    // Queue order hints (queuePriority): the run's roster tier / band /
    // evidence for this politician, when the cron knew them.
    ...(src?.queue_priority && typeof src.queue_priority === "object" ? { priority: { ...src.queue_priority } } : {}),
    src: {
      politician_id: src.politician_id,
      topic: src.topic,
      source_type: src.source_type,
      source_class: src.source_class,
      ...(src.source_id ? { source_id: src.source_id } : {}),
      ...(src.speech_kind ? { speech_kind: src.speech_kind } : {}),
      source_tier: 2,
      url: src.url,
    },
  };
  try {
    const r = await store.setJSON(queueKey(videoId), entry, { onlyIfNew: true });
    return !(r && r.modified === false);
  } catch { return false; }
}

// ── Queue order ─────────────────────────────────────────────────────────────
// The queue is worked in priority order, not blob-list (video id) order:
//   1. what the video is — a hearing or floor speech, then a C-SPAN clip, then
//      the member's official channel, then a campaign channel;
//   2. the politician's roster tier (1 first);
//   3. evidence need — no Locker evidence at all, then an open issue (band 0),
//      then fully filled (band 1);
//   4. newest first (published date, else when it was queued).
// Ties fall back to the queue key, so the order is deterministic.
const HEARING_OR_FLOOR = /\b(?:hearings?|committee|subcommittee|markup|testif\w*|floor (?:speech|remarks|debate)|on (?:the )?(?:house |senate )?floor|house floor|senate floor|speaks on floor)\b/i;

/** 0 hearing / floor speech · 1 C-SPAN · 2 official channel · 3 campaign channel. */
export function queueKindRank(entry) {
  const src = entry?.src || {};
  const kind = String(src.speech_kind || entry?.speech_kind || "");
  if (/^(?:hearing|floor speech)$/.test(kind) || src.source_class === "floor_speech" || src.source_class === "hearing_transcript") return 0;
  if (!kind && HEARING_OR_FLOOR.test(String(entry?.title || ""))) return 0;
  const st = String(src.source_type || "");
  if (/\bc-span\b/i.test(st)) return 1;
  if (/\bcampaign\b/i.test(st)) return 3;
  return 2;
}

/**
 * Sort key for one queue entry (lower runs first). `tierOf(pid)` supplies a
 * roster tier when the entry carries none.
 */
export function queuePriority(entry, { tierOf = null } = {}) {
  const p = entry?.priority || {};
  const pid = entry?.src?.politician_id;
  const tier = Number(p.tier ?? (tierOf ? tierOf(pid) : null));
  const need = p.no_evidence === true ? 0 : Number(p.band) === 1 ? 2 : 1;
  return {
    kind: queueKindRank(entry),
    tier: Number.isFinite(tier) && tier > 0 ? tier : 9,
    need,
    when: String(entry?.published || entry?.queued_at || ""),
  };
}

/** Queue entries ([{ key, entry }]) in processing order. */
export function orderQueue(rows, { tierOf = null } = {}) {
  return rows
    .map((r) => ({ ...r, p: queuePriority(r.entry, { tierOf }) }))
    .sort((a, b) => (a.p.kind - b.p.kind) || (a.p.tier - b.p.tier) || (a.p.need - b.p.need) || b.p.when.localeCompare(a.p.when) || String(a.key).localeCompare(String(b.key)))
    .map(({ p, ...r }) => r);
}

// ── The page-shaped record ──────────────────────────────────────────────────

/** Raw-store key of a video's record: one per politician + topic + source + video id. */
export function videoRecordKey(src, videoId) {
  return `${[src.politician_id, src.topic, src.source_id].filter(Boolean).join("/")}/${videoId}.json`;
}

/**
 * The page-shaped raw record for a video with a transcript, or null when the
 * politician says nothing in it. body = the politician's own words only;
 * segments = [{ t, at }] (start second, character offset into body).
 */
export function buildVideoRecord({ src, videoId, title = "", doc, fetchedAt, published = "", channel = "" }) {
  const own = ownSegments(doc);
  if (!own.length) return null;
  // The body is ONLY the politician's spoken words: the title is not speech,
  // and the sentence splitter would otherwise fold it into the first quote.
  let body = "";
  const segments = [];
  for (const s of own) {
    if (body.length >= MAX_VIDEO_BODY_CHARS) break;
    if (segments.length && !/\s$/.test(body)) body += " ";
    segments.push({ t: s.t, at: body.length });
    body += s.text;
  }
  body = body.slice(0, MAX_VIDEO_BODY_CHARS);
  return {
    url: src.url,
    final_url: watchUrl(videoId),
    fetched_at: fetchedAt,
    source_type: src.source_type,
    politician_id: src.politician_id,
    topic: src.topic,
    ...(src.source_id ? { source_id: src.source_id } : {}),
    source_tier: 2,
    http_status: 200,
    content_type: `text/plain; source=youtube-transcript (${doc.provider || TRANSCRIPT_PROVIDER})`,
    body_chars: body.length,
    body,
    type: "video",
    link: watchUrl(videoId),
    video_id: videoId,
    ...(published ? { date: String(published).slice(0, 10) } : {}),
    ...(oneLine(title) ? { title: oneLine(title) } : {}),
    ...(channel ? { channel } : {}),
    segments,
    time_format: TIME_FORMAT,
    transcript: { provider: doc.provider || TRANSCRIPT_PROVIDER, model: doc.model || TRANSCRIPT_MODEL, transcribed_at: doc.transcribed_at || null, own_segments: own.length, all_segments: (doc.segments || []).length },
  };
}

// ── Timestamped video links ────────────────────────────────────────────────
const foldText = (s) => String(s || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").toLowerCase();

/** The start second of the segment the excerpt is in, or null. */
export function videoExcerptSecond(raw, excerpt) {
  // A raw record stored before time_format existed may carry clock digits.
  const segs = segmentSeconds(raw);
  if (!segs.length || !excerpt) return null;
  const needle = foldText(String(excerpt).replace(/…\s*$/, "")).trim().slice(0, 60);
  if (needle.length < 8) return null;
  // Fold the body character by character so offsets stay aligned with `at`.
  const body = String(raw.body || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s/g, " ").toLowerCase();
  let at = body.indexOf(needle);
  if (at < 0) {
    // The scorer collapses whitespace; retry on a collapsed body with an offset map.
    const map = []; let flat = "";
    for (let i = 0; i < body.length; i++) { if (body[i] === " " && flat.endsWith(" ")) continue; map.push(i); flat += body[i]; }
    const j = flat.indexOf(needle);
    if (j < 0) return null;
    at = map[j];
  }
  let hit = null;
  for (const s of segs) if (Number(s.at) <= at) hit = s; else break;
  return hit ? Math.max(0, Math.floor(Number(hit.t) || 0)) : null;
}

/** watch?v=ID&t=NNs for a timed video record, else the plain link. */
export function videoTimestampLink(raw, excerpt, link = raw?.final_url || raw?.url) {
  const t = videoExcerptSecond(raw, excerpt);
  if (t === null || !link) return link;
  try {
    const u = new URL(link);
    if (!/(?:^|\.)youtube\.com$/.test(u.hostname) || !u.searchParams.get("v")) return link;
    return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}&t=${t}s`;
  } catch { return link; }
}

/**
 * The record to hand the Locker writer for one candidate. A timed video record
 * gets its link (final_url) set to the second the candidate's cited excerpt is
 * spoken; every other record is returned as is.
 */
export function lockerRawFor(candidate, rec) {
  if (!rec?.segments?.length) return rec;
  const excerpt = citationExcerpts(candidate)[0] || candidate?.sources?.[0]?.excerpt;
  const link = videoTimestampLink(rec, excerpt);
  return link && link !== rec.final_url ? Object.freeze({ ...rec, final_url: link }) : rec;
}

// ── Scoring hook (same path as campaign pages) ─────────────────────────────

/**
 * Score a stored record and hand every candidate to the Locker writer —
 * logCandidateStances + maybeWriteLockerItem, exactly what the raw-ingest
 * cron does for a page. Returns the writes.
 */
export async function scoreIntoLocker(rec, { lockerStore, gt = null, flags = null, log = console.log } = {}) {
  const candidates = logCandidateStances(rec, { log });
  const writes = [];
  if (!lockerStore) return { candidates: candidates.length, writes };
  if (!candidates.length) {
    log(`evidence-locker: SKIP ${rec?.politician_id}|${rec?.topic}${rec?.source_id ? "|" + rec.source_id : ""} — no scored candidate`);
    return { candidates: 0, writes };
  }
  for (const c of candidates) {
    const w = await maybeWriteLockerItem(c, lockerRawFor(c, rec), { store: lockerStore, gt, log, flags });
    if (w.written) writes.push({ key: w.key, politician_id: c.politician_id, topic: c.topic, strength: w.item?.strength, link: w.item?.link });
  }
  return { candidates: candidates.length, writes };
}

// ── The background worker ───────────────────────────────────────────────────

export async function acquireLock(store, nowMs, ttl = LOCK_TTL_MS) {
  const doc = { until: nowMs + ttl, taken_at: new Date(nowMs).toISOString() };
  try {
    const r = await store.setJSON(LOCK_KEY, doc, { onlyIfNew: true });
    if (!(r && r.modified === false)) return true;
    const cur = store.getWithMetadata ? await store.getWithMetadata(LOCK_KEY, { type: "json" }) : null;
    const held = cur?.data && typeof cur.data === "object" ? cur.data : null;
    if (held && Number(held.until) > nowMs) return false;
    // A stale lock (a run that died): take it over, but only if nobody else just did.
    const r2 = await store.setJSON(LOCK_KEY, doc, cur?.etag ? { onlyIfMatch: cur.etag } : {});
    return !(r2 && r2.modified === false);
  } catch { return false; }
}
export async function releaseLock(store) { try { await store.delete(LOCK_KEY); } catch { /* expires on its own */ } }

/**
 * Work the queue once. Never throws. Per queued video: use the cache if it is
 * already there, else transcribe and cache it; then, when the politician
 * speaks in it, store the page-shaped raw record and run `onRecord` on it.
 * Returns a summary.
 */
export async function processTranscriptQueue({
  store, rawStore, onRecord, generate = geminiGenerate, nameOf = (pid) => nameFromId(pid), tierOf = null,
  max = TRANSCRIBE_PER_RUN, concurrency = TRANSCRIBE_CONCURRENCY, budgetMs = TRANSCRIBE_BUDGET_MS,
  now = () => new Date(), log = console.log, lock = true,
  callDelayMs = TRANSCRIBE_CALL_DELAY_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const summary = { locked: false, picked: 0, transcribed: 0, cache_hits: 0, recorded: 0, no_own_speech: 0, failed: 0, retry_later: 0, remaining: 0, records: [] };
  if (!store) return summary;
  const started = Date.now();
  if (lock && !(await acquireLock(store, now().getTime()))) {
    summary.locked = true;
    log("video-transcribe: another run holds the worker lock — nothing to do");
    return summary;
  }
  try {
    let keys = [];
    try { keys = ((await store.list({ prefix: "queue/" }))?.blobs || []).map((b) => b.key); } catch (e) { log(`video-transcribe: queue unreadable — ${e?.message || e}`); }
    // Read every queued entry and work the highest-priority ones first (orderQueue).
    const rows = [];
    for (let i = 0; i < keys.length; i += 16) {
      rows.push(...await Promise.all(keys.slice(i, i + 16).map(async (key) => ({ key, entry: await getJSON(store, key) }))));
    }
    const batch = orderQueue(rows, { tierOf }).slice(0, max);
    summary.picked = batch.length;
    if (batch.length) log(`video-transcribe: queue order — ${batch.map((r) => `${r.entry?.video_id || r.key} (${["hearing/floor", "C-SPAN", "official", "campaign"][queueKindRank(r.entry)]})`).join(", ")} first of ${keys.length}`);
    // Gemini rate limit: space the transcription calls out. Cache hits make no
    // call, so they never wait; the first call of a run starts at once.
    let callsMade = 0;
    let gate = Promise.resolve();
    const throttled = (f) => {
      const run = gate.then(async () => {
        if (callsMade++ > 0 && callDelayMs > 0) await sleep(callDelayMs);
        return f();
      });
      gate = run.catch(() => {});
      return run;
    };
    const one = async ({ key, entry }) => {
      const videoId = entry?.video_id;
      if (!videoId || !entry?.src?.politician_id) { try { await store.delete(key); } catch {} return; }
      const pid = entry.src.politician_id;
      let doc = await readTranscript(store, videoId);
      if (doc) summary.cache_hits++;
      else {
        const name = entry.name || nameOf(pid);
        const tr = await throttled(() => transcribeVideo(videoId, { name, generate }));
        if (!tr.ok) {
          const attempts = (Number(entry.attempts) || 0) + 1;
          if (attempts < MAX_ATTEMPTS) {
            summary.retry_later++;
            log(`video-transcribe: FAIL ${pid} ${watchUrl(videoId)} — ${tr.error} (attempt ${attempts}/${MAX_ATTEMPTS}, kept in the queue)`);
            try { await store.setJSON(key, { ...entry, attempts, last_error: tr.error }); } catch {}
            return;
          }
          summary.failed++;
          doc = { video_id: videoId, status: "failed", error: tr.error, attempts, provider: TRANSCRIPT_PROVIDER, model: TRANSCRIPT_MODEL, transcribed_at: now().toISOString() };
          log(`video-transcribe: GAVE UP ${pid} ${watchUrl(videoId)} — ${tr.error} after ${attempts} attempts`);
        } else {
          summary.transcribed++;
          const own = tr.segments.filter((s) => s.own).length;
          doc = { video_id: videoId, status: tr.segments.length ? "ok" : "empty", provider: TRANSCRIPT_PROVIDER, model: TRANSCRIPT_MODEL, transcribed_at: now().toISOString(), speaker: name, max_seconds: MAX_TRANSCRIBE_SECONDS, time_format: TIME_FORMAT, segments: tr.segments };
          log(`video-transcribe: OK ${pid} ${watchUrl(videoId)} — ${tr.segments.length} segment(s), ${own} by ${name}`);
        }
        try { await store.setJSON(cacheKey(videoId), doc); } catch (e) { log(`video-transcribe: cache write failed for ${videoId} — ${e?.message || e}`); }
      }
      if (hasOwnSpeech(doc) && rawStore) {
        const rec = buildVideoRecord({ src: entry.src, videoId, title: entry.title, doc, fetchedAt: now().toISOString(), published: entry.published, channel: entry.channel });
        const rk = videoRecordKey(entry.src, videoId);
        try {
          await rawStore.setJSON(rk, rec);
          summary.recorded++;
          summary.records.push(rk);
          log(`video-transcribe: RECORD ${pid} ${watchUrl(videoId)} → raw-ingest/${rk} (${rec.body_chars} chars, ${rec.segments.length} timed segment(s), tier 2)`);
          if (onRecord) {
            try { await onRecord(Object.freeze({ ...rec, key: rk })); }
            catch (e) { log(`video-transcribe: hook error for ${rk} — ${e?.message || e}`); }
          }
        } catch (e) { log(`video-transcribe: raw record not written for ${videoId} — ${e?.message || e}`); return; }
      } else if (doc?.status !== "failed") {
        summary.no_own_speech++;
        log(`video-transcribe: NO OWN SPEECH ${pid} ${watchUrl(videoId)} — stays a mention (description only)`);
      }
      try { await store.delete(key); } catch {}
    };
    for (let i = 0; i < batch.length; i += concurrency) {
      if (Date.now() - started > budgetMs) { log("video-transcribe: time budget reached — the rest waits for the next run"); break; }
      await Promise.all(batch.slice(i, i + concurrency).map((k) => one(k).catch((e) => log(`video-transcribe: error on ${k.key} — ${e?.message || e}`))));
    }
    try { summary.remaining = ((await store.list({ prefix: "queue/" }))?.blobs || []).length; } catch {}
    log(`video-transcribe: run — ${summary.picked} picked · ${summary.transcribed} transcribed · ${summary.cache_hits} from cache · ${summary.recorded} scored record(s) · ${summary.no_own_speech} without the politician's words · ${summary.retry_later} retry later · ${summary.failed} given up · ${summary.remaining} left in the queue`);
    return summary;
  } finally {
    if (lock) await releaseLock(store);
  }
}
