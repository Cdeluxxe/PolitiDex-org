// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-video.mjs — video + speech sources for the raw-ingest rotation
// ─────────────────────────────────────────────────────────────────────────────
// Until this pass the scheduled rotation read web pages only (homepages, press
// releases, issue pages). Hearings, floor speeches and a member's own video
// posts never reached the frontier, so they were never pulled or scored. This
// module adds that path. It runs for EVERY politician the normal raw-ingest
// run plans (the raw-ingest allow-list is off by default). Each politician's
// configuration is either hand-written in VIDEO_SPEECH_SOURCES (Thomas Massie,
// with verified channel ids — used exactly as before) or derived from the
// ingest roster by videoSpeechConfigFromRoster:
//   · member channel feed — only channel ids already verified on the roster
//     (a "youtube" source with a channel_id); none are guessed;
//   · C-SPAN search — the politician's full name, a clip title must name them
//     (full name, or an office title + surname);
//   · GovInfo floor speeches / hearings — sitting House / Senate members only
//     (chamber from the member map, else the official .house.gov /
//     .senate.gov host); the speaking-turn match uses their surname;
//   · Facebook — never queued while no Facebook access is configured.
// VIDEO_SPEECH_ALLOW_LIST is a dormant switch: when it holds ids, only those
// politicians get this path. It defaults to [] (off → whole roster).
//
// DISCOVERY (discoverVideoSpeech) — at most once per VIDEO_DISCOVERY_INTERVAL_MS
// per politician (a small state doc in the rotation store remembers when), so
// the every-minute cron never hammers YouTube or GovInfo. New URLs are queued
// into the SAME per-politician frontier the web-page harvest fills, as
// frontier entries with a video / speech source class:
//   · youtube_video (member channel) — recent uploads from the member's own
//     YouTube channel, read from its public channel feed (no key needed). The
//     channel id is the one the channel's own feed reports for its handle.
//     When the feed fails and a YouTube Data API key is set, the channel's
//     uploads playlist is read through the API instead.
//   · youtube_video (C-SPAN) — recent C-SPAN clips whose title names the
//     member, found through the YouTube Data API search endpoint
//     (YOUTUBE_API_KEY). No key → logged and skipped.
//   · floor_speech — the member's own House floor remarks and extensions of
//     remarks in the Congressional Record (GovInfo search, CREC collection).
//   · hearing_transcript — published House hearing transcripts that list the
//     member (GovInfo search, CHRG collection).
//   GovInfo search uses the api.data.gov key the site already has
//   (GOVINFO_API_KEY, else CONGRESS_GOV_API_KEY). The stored URL is always the
//   public govinfo.gov page, never one carrying a key.
//   · Facebook video posts are an eligible class, but Facebook shows no posts
//     to an anonymous fetch and its videos cannot be handed to the transcriber
//     by URL, so with no Facebook access configured they are logged as
//     unavailable and nothing is queued.
//
// SELECTION (addVideoSpeechSources) — up to VIDEO_SPEECH_PER_POLITICIAN
// unfetched video / speech frontier entries per planned politician join the
// pull list, newest first, only in FREE slots under the unchanged per-run and
// per-politician caps (nothing already planned is displaced, so the official
// pages stay in the run). The web-page fresh selection skips these entries.
//
// PULL — youtube_video goes through the existing pullYouTubeVideo (transcript
// cache → page-shaped record → scorer + Locker; no transcript yet → queued for
// the background transcriber, which scores it the same way once transcribed;
// a failed transcription is logged and skipped). floor_speech /
// hearing_transcript are fetched here (pullSpeechTranscript): only the
// member's own speaking turns become the record body, then the same onRecord
// hook (scorer + Locker writer) every page goes through runs on it.

import { createHash } from "node:crypto";
import { parseYouTubeFeed, youtubeFeedUrl, youtubeWatchUrl } from "./raw-ingest-social.mjs";
import { topicHits, normUrl } from "./raw-ingest-fresh.mjs";
import { hasRulesFor } from "./stance-score-core.mjs";
import { describeFetchError } from "./raw-ingest-hosts.mjs";

export const VIDEO_SPEECH_STATE_KEY = "video-speech-discovery.json";
export const VIDEO_DISCOVERY_INTERVAL_MS = 60 * 60_000;   // one discovery pass per politician per hour
export const VIDEO_DISCOVERY_TIMEOUT_MS = 6_000;          // per discovery request
export const VIDEO_DISCOVERY_PER_SOURCE = 5;              // newest items read per channel / search
export const VIDEO_SPEECH_PER_POLITICIAN = 2;             // video / speech pulls per politician per run (inside the caps)
export const SPEECH_FETCH_TIMEOUT_MS = 12_000;
export const MAX_SPEECH_BODY_CHARS = 200_000;

export const VIDEO_SPEECH_CLASSES = {
  youtube_video: "YouTube video — member channel upload or C-SPAN clip (transcribed, member's own words scored)",
  floor_speech: "House floor remarks / extension of remarks in the Congressional Record (member's own turns scored)",
  hearing_transcript: "published House hearing transcript (member's own turns scored)",
  facebook_video: "video post on the member's own Facebook page (not available: no Facebook access configured)",
};

const UA = "PolitiDex raw-ingest (+https://politidex.fyi)";
const VS_PREFIX = "fresh-vs-";

// Dormant allow-list for this path alone. [] (or null) → every planned
// politician with a usable configuration; ids here → only those.
export const VIDEO_SPEECH_ALLOW_LIST = [];

// Hand-written per-politician configuration (verified channel ids). These
// win over anything derived from the roster.
export const VIDEO_SPEECH_SOURCES = {
  massie: {
    name: "Thomas Massie",
    surname: "Massie",
    chamber: "house",
    default_topic: "cost_living",
    youtube_channels: [
      // Verified: https://www.youtube.com/feeds/videos.xml?user=RepThomasMassie
      // reports this channel id; oEmbed author of its uploads is @RepThomasMassie.
      { channel_id: "UCpmXOtvvXC3GE8o9VxYNK7g", handle: "@RepThomasMassie", label: "member channel" },
    ],
    search_channels: [
      // C-SPAN's own channel feed reports this id. Searched for clips naming the member.
      { channel_id: "UCb--64Gl51jIEVE-GLDAVTg", label: "C-SPAN", query: "Thomas Massie", title_must: /\bmassie\b/i },
    ],
    govinfo: { collections: ["CREC", "CHRG"] },
    facebook_pages: [],
  },
};

export const isVideoSpeechClass = (c) => Object.prototype.hasOwnProperty.call(VIDEO_SPEECH_CLASSES, c);
/** A frontier entry / pull-list source queued by this module. */
export const isVideoSpeechEntry = (s) => String(s?.source_id || "").startsWith(VS_PREFIX) && isVideoSpeechClass(s?.source_class);
const CSPAN_CHANNEL_ID = "UCb--64Gl51jIEVE-GLDAVTg";
const NAME_SUFFIX = /^(?:jr|sr|ii|iii|iv|v|md|phd|esq)\.?$/i;
const asciiName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether the dormant allow-list (if on) admits this politician. */
export function videoSpeechAllowed(pid, list = VIDEO_SPEECH_ALLOW_LIST) {
  if (!Array.isArray(list) || !list.length) return true;
  return list.map(String).includes(String(pid || ""));
}

/** First / last name parts of a display name ("Thomas Massie", "Robert F. Kennedy Jr."). */
export function nameParts(name) {
  const parts = asciiName(name).replace(/["“”(].*?["“”)]/g, " ").split(/[\s,]+/).filter(Boolean);
  while (parts.length > 1 && NAME_SUFFIX.test(parts[parts.length - 1])) parts.pop();
  if (parts.length < 2) return null;
  return { first: parts[0].replace(/\.$/, ""), last: parts[parts.length - 1] };
}

function chamberFromUrls(row) {
  const urls = [row?.official?.url, row?.page?.url, ...((row?.sources || []).map((s) => s?.url))].filter(Boolean).map(String);
  const host = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
  if (urls.some((u) => /(^|\.)house\.gov$/.test(host(u)))) return "house";
  if (urls.some((u) => /(^|\.)senate\.gov$/.test(host(u)))) return "senate";
  return null;
}

/**
 * "house" | "senate" | null for one roster row: the member map's chamber for a
 * sitting member, else the official .house.gov / .senate.gov host on the row.
 */
export function chamberForRow(row, member = null) {
  return member && member.serving119 !== false && /^(house|senate)$/.test(String(member.chamber || "")) ? member.chamber : chamberFromUrls(row);
}

/**
 * Source type of a C-SPAN clip, named for the member's chamber (it was
 * hard-coded "House proceedings", also for senators and governors).
 */
export function cspanSourceType(chamber, kind = "") {
  const base = chamber === "senate" ? "official Senate proceedings video (C-SPAN)"
    : chamber === "house" ? "official House proceedings video (C-SPAN)"
    : "official C-SPAN video";
  return kind ? `${base} — ${kind}` : base;
}

/** A C-SPAN source type that still carries the old hard-coded chamber. */
export const LEGACY_CSPAN_TYPE = /^official House proceedings video \(C-SPAN\)/;

/** The C-SPAN source type for `chamber`, keeping the old label's "— kind" suffix; null when unchanged. */
export function relabelCspanSourceType(sourceType, chamber) {
  const st = String(sourceType || "");
  if (!LEGACY_CSPAN_TYPE.test(st) || chamber === "house") return null;
  const kind = (/ — (.+)$/.exec(st) || [])[1] || "";
  return cspanSourceType(chamber, kind);
}

/**
 * Video / speech configuration for one roster politician that has no
 * hand-written entry. `member` (optional) is their member-map row
 * ({ name, chamber, serving119 }). Null when nothing can be searched for.
 */
export function videoSpeechConfigFromRoster(row, { member = null } = {}) {
  if (!row || !row.politician_id) return null;
  // Display name (roster, e.g. "Chuck Schumer") for the search; the member-map
  // name ("Charles E. Schumer") as a fallback. Either first name matches a title.
  const display = oneLine(row.name || member?.name || "");
  const name = oneLine(member?.name || row.name || "");
  const np = nameParts(display) || nameParts(name);
  const firsts = [...new Set([nameParts(display)?.first, nameParts(name)?.first].filter(Boolean))];
  const chamber = chamberForRow(row, member);
  const channels = [];
  for (const s of [row.official, ...(row.sources || [])]) {
    const id = String(s?.channel_id || "");
    if (s?.source_class === "youtube" && /^UC[A-Za-z0-9_-]{22}$/.test(id) && !channels.some((c) => c.channel_id === id)) {
      channels.push({ channel_id: id, label: "member channel" });
    }
  }
  if (!np && !channels.length) return null;
  const topics = [row.official?.topic, ...(row.sources || []).map((s) => s?.topic)].filter((t) => t && hasRulesFor(t));
  const office = "(?:rep|sen|gov|senator|representative|congressman|congresswoman|governor|speaker|leader)\\.?";
  return {
    name: display || name || row.politician_id,
    ...(np ? { surname: np.last } : {}),
    chamber,
    default_topic: topics[0] || "cost_living",
    youtube_channels: channels,
    search_channels: np ? [{
      channel_id: CSPAN_CHANNEL_ID, label: "C-SPAN", query: `${np.first} ${np.last}`,
      title_must: new RegExp(`\\b(?:(?:${firsts.map(reEsc).join("|")})\\s+(?:[A-Z]\\.\\s+)?${reEsc(np.last)}|${office}\\s+${reEsc(np.last)})\\b`, "i"),
    }] : [],
    govinfo: { collections: np && chamber ? ["CREC", "CHRG"] : [] },
    facebook_pages: [],
    derived: true,
  };
}

/**
 * Configurations for a set of roster rows (hand-written entries win).
 * `members` is the member map's `members` list (slug → name / chamber).
 */
export function buildVideoSpeechConfigs(roster = [], { members = [], allow = VIDEO_SPEECH_ALLOW_LIST } = {}) {
  const bySlug = new Map();
  for (const m of members || []) if (m?.slug && (m.serving119 !== false || !bySlug.has(m.slug))) bySlug.set(m.slug, m);
  const out = {};
  for (const row of roster || []) {
    const pid = String(row?.politician_id || "");
    if (!pid || out[pid] || !videoSpeechAllowed(pid, allow)) continue;
    const cfg = VIDEO_SPEECH_SOURCES[pid] || videoSpeechConfigFromRoster(row, { member: bySlug.get(pid) || null });
    if (cfg) out[pid] = cfg;
  }
  return out;
}

/** The configuration for one politician: `configs` first, then the hand-written set. */
export const videoSpeechConfigFor = (pid, configs = null) => {
  const id = String(pid || "");
  return (configs && configs[id]) || VIDEO_SPEECH_SOURCES[id] || null;
};

const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();
const sourceIdFor = (url) => VS_PREFIX + createHash("sha1").update(normUrl(url)).digest("hex").slice(0, 12);

/** What a video or transcript is, from its title: "floor speech" | "hearing" | "video post". */
export function speechKindOf(title, { collection = "" } = {}) {
  if (collection === "CREC") return "floor speech";
  if (collection === "CHRG") return "hearing";
  const t = String(title || "");
  if (/\b(?:on (?:the )?(?:house )?floor|floor (?:speech|remarks|debate)|house floor|speaks on floor)\b/i.test(t)) return "floor speech";
  if (/\b(?:hearings?|committee|subcommittee|markup|testif\w*|questions?|grills?|cross-exam\w*)\b/i.test(t)) return "hearing";
  return "video post";
}

/** Issue key a title names (rules-backed keys only), else the fallback. */
export function topicForTitle(title, fallback) {
  const hits = Object.entries(topicHits(title)).filter(([t]) => hasRulesFor(t)).sort((a, b) => b[1] - a[1]);
  return hits.length ? hits[0][0] : fallback;
}

function entry(pid, cfg, { url, source_class, source_type, title, published, found_from, kind, rank, now }) {
  const topic = topicForTitle(title, cfg.default_topic);
  return {
    politician_id: pid,
    topic: hasRulesFor(topic) ? topic : cfg.default_topic,
    source_type,
    source_class,
    source_id: sourceIdFor(url),
    source_tier: 2,
    url,
    title: oneLine(title).slice(0, 300),
    ...(published ? { published: String(published).slice(0, 10) } : {}),
    speech_kind: kind,
    // Derived configurations only: who to match in the speaking turns at pull
    // time (hand-written ones are looked up by id, so their entries are unchanged).
    ...(cfg.derived && cfg.surname ? { speaker_name: cfg.name, speaker_surname: cfg.surname } : {}),
    found_from,
    found_at: now.toISOString(),
    rank,
  };
}

// ── Discovery fetchers (each never throws; returns { items, error? }) ─────

async function fetchWithTimeout(fetch, url, init = {}) {
  return fetch(url, { redirect: "follow", ...init, headers: { "user-agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(VIDEO_DISCOVERY_TIMEOUT_MS) });
}
// Error text with any key in a URL removed, so a key never reaches a log line.
const safeErr = (e) => oneLine(e?.name === "TimeoutError" ? "timeout" : e?.message || e).replace(/([?&](?:key|api_key)=)[^&\s]+/gi, "$1…").slice(0, 200);

async function memberChannelVideos(ch, { fetch, youtubeKey }) {
  try {
    const res = await fetchWithTimeout(fetch, youtubeFeedUrl(ch.channel_id), { headers: { accept: "application/atom+xml,application/xml,*/*" } });
    const body = await res.text();
    if (!res.ok) throw new Error(`channel feed HTTP ${res.status}`);
    const videos = parseYouTubeFeed(body).slice(0, VIDEO_DISCOVERY_PER_SOURCE);
    if (!videos.length) throw new Error("no videos in the channel feed");
    return { items: videos.map((v) => ({ video_id: v.video_id, title: v.title, published: v.published })), via: "channel feed" };
  } catch (feedErr) {
    if (!youtubeKey) return { items: [], error: safeErr(feedErr) };
    // Uploads playlist of a channel is its id with the "UC" prefix swapped for "UU".
    try {
      const pl = "UU" + ch.channel_id.slice(2);
      const res = await fetchWithTimeout(fetch, `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${VIDEO_DISCOVERY_PER_SOURCE}&playlistId=${encodeURIComponent(pl)}&key=${encodeURIComponent(youtubeKey)}`);
      if (!res.ok) throw new Error(`YouTube Data API HTTP ${res.status}`);
      const json = await res.json();
      const items = (json?.items || []).map((it) => ({ video_id: it?.snippet?.resourceId?.videoId, title: it?.snippet?.title, published: it?.snippet?.publishedAt }))
        .filter((v) => /^[A-Za-z0-9_-]{11}$/.test(String(v.video_id || "")));
      return { items, via: "YouTube Data API (uploads)" };
    } catch (apiErr) {
      return { items: [], error: `${safeErr(feedErr)}; API fallback: ${safeErr(apiErr)}` };
    }
  }
}

async function searchChannelVideos(ch, { fetch, youtubeKey }) {
  if (!youtubeKey) return { items: [], skipped: "YouTube Data API key (YOUTUBE_API_KEY) not set" };
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=${VIDEO_DISCOVERY_PER_SOURCE}&channelId=${encodeURIComponent(ch.channel_id)}&q=${encodeURIComponent(ch.query)}&key=${encodeURIComponent(youtubeKey)}`;
    const res = await fetchWithTimeout(fetch, url);
    if (!res.ok) throw new Error(`YouTube Data API HTTP ${res.status}`);
    const json = await res.json();
    const items = (json?.items || []).map((it) => ({ video_id: it?.id?.videoId, title: decodeEntities(it?.snippet?.title), published: it?.snippet?.publishedAt }))
      .filter((v) => /^[A-Za-z0-9_-]{11}$/.test(String(v.video_id || "")) && (!ch.title_must || ch.title_must.test(v.title)));
    return { items, via: "YouTube Data API (search)" };
  } catch (e) {
    return { items: [], error: safeErr(e) };
  }
}

async function govinfoSearch(collection, cfg, { fetch, govinfoKey }) {
  if (!govinfoKey) return { items: [], skipped: "no api.data.gov key (GOVINFO_API_KEY / CONGRESS_GOV_API_KEY) set" };
  try {
    const res = await fetchWithTimeout(fetch, `https://api.govinfo.gov/search?api_key=${encodeURIComponent(govinfoKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: `collection:${collection} AND member:(${cfg.surname})`, pageSize: VIDEO_DISCOVERY_PER_SOURCE * 2, offsetMark: "*", sorts: [{ field: "publishdate", sortOrder: "DESC" }] }),
    });
    if (!res.ok) throw new Error(`GovInfo search HTTP ${res.status}`);
    const json = await res.json();
    const house = cfg.chamber === "house";
    const items = (json?.results || []).filter((r) => {
      const g = String(r?.granuleId || "");
      if (!r?.packageId || !g) return false;
      // Floor: House pages (PgH) and Extensions of Remarks (PgE); hearings: House / joint.
      if (collection === "CREC") return house ? /-Pg[HE]\d/.test(g) : /-PgS\d/.test(g);
      return house ? /hhrg|jhrg/.test(g) : /shrg|jhrg/.test(g);
    }).slice(0, VIDEO_DISCOVERY_PER_SOURCE).map((r) => ({
      url: `https://www.govinfo.gov/content/pkg/${r.packageId}/html/${r.granuleId}.htm`,
      title: oneLine(r.title), published: r.dateIssued,
    }));
    return { items, via: "GovInfo search" };
  } catch (e) {
    return { items: [], error: safeErr(e) };
  }
}

function decodeEntities(s) {
  return String(s || "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// ── Discovery state ─────────────────────────────────────────────────────────

export async function readVideoSpeechState(store) {
  if (!store) return { last: {} };
  try {
    let d = await store.get(VIDEO_SPEECH_STATE_KEY, { type: "json" });
    if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = null; } }
    return { last: (d && typeof d.last === "object" && d.last) || {} };
  } catch { return { last: {} }; }
}

/**
 * Discover fresh video / speech URLs for the planned politicians that have a
 * configuration (`configs`, else VIDEO_SPEECH_SOURCES) and queue them into the frontier
 * (`fresh.frontier`, the same one the web-page harvest fills). Never throws.
 * Returns { checked, added, entries, sources: [{ politician_id, source, via, found, added, error?, skipped? }] }.
 */
export async function discoverVideoSpeech({
  politicians = [], fresh, fetch, store = null, state = null, now = () => new Date(), log = console.log,
  youtubeKey = process.env.YOUTUBE_API_KEY || "", govinfoKey = process.env.GOVINFO_API_KEY || process.env.CONGRESS_GOV_API_KEY || "",
  force = false, interval = VIDEO_DISCOVERY_INTERVAL_MS, mergeFrontier, configs = null,
} = {}) {
  const out = { checked: [], added: 0, entries: [], sources: [] };
  if (!fresh || typeof fetch !== "function") return out;
  const st = state ? { last: { ...(state.last || {}) } } : await readVideoSpeechState(store);
  const at = now();
  const pids = [...new Set(politicians)].filter((p) => videoSpeechConfigFor(p, configs));
  const seen = (u) => !!fresh.seen?.[normUrl(u)];
  for (const pid of pids) {
    const last = Date.parse(st.last[pid] || "");
    if (!force && Number.isFinite(last) && at.getTime() - last < interval) {
      log(`video/speech discovery: ${pid} — checked ${Math.round((at.getTime() - last) / 60_000)} min ago; next check in ${Math.max(1, Math.ceil((interval - (at.getTime() - last)) / 60_000))} min (frontier entries already queued are still pulled)`);
      continue;
    }
    const cfg = videoSpeechConfigFor(pid, configs);
    out.checked.push(pid);
    const jobs = [
      ...cfg.youtube_channels.map((ch) => memberChannelVideos(ch, { fetch, youtubeKey }).then((r) => ({ r, source: `YouTube ${ch.label} ${ch.handle || ch.channel_id}`, make: (v) => entry(pid, cfg, {
        url: youtubeWatchUrl(v.video_id), source_class: "youtube_video",
        source_type: `official YouTube video (own channel) — ${speechKindOf(v.title)}`,
        title: v.title, published: v.published, found_from: youtubeFeedUrl(ch.channel_id), kind: speechKindOf(v.title), rank: 6, now: at,
      }) }))),
      ...cfg.search_channels.map((ch) => searchChannelVideos(ch, { fetch, youtubeKey }).then((r) => ({ r, source: `YouTube ${ch.label} search "${ch.query}"`, make: (v) => entry(pid, cfg, {
        url: youtubeWatchUrl(v.video_id), source_class: "youtube_video",
        source_type: cspanSourceType(cfg.chamber, speechKindOf(v.title)),
        title: v.title, published: v.published, found_from: `youtube:${ch.channel_id}?q=${ch.query}`, kind: speechKindOf(v.title), rank: 6, now: at,
      }) }))),
      ...(cfg.govinfo?.collections || []).map((c) => govinfoSearch(c, cfg, { fetch, govinfoKey }).then((r) => ({ r, source: `GovInfo ${c === "CREC" ? "Congressional Record" : "hearing transcripts"}`, make: (v) => entry(pid, cfg, {
        url: v.url, source_class: c === "CREC" ? "floor_speech" : "hearing_transcript",
        source_type: c === "CREC"
          ? (/-PgE\d/.test(v.url) ? "official extension of remarks (Congressional Record)" : "official floor speech (Congressional Record)")
          : "official hearing transcript (GPO)",
        title: v.title, published: v.published, found_from: `govinfo:${c}`, kind: speechKindOf(v.title, { collection: c }), rank: c === "CREC" ? 7 : 6, now: at,
      }) }))),
    ];
    const done = await Promise.all(jobs);
    const found = [];
    for (const { r, source, make } of done) {
      const items = r.items.map(make).filter((e) => !seen(e.url));
      found.push(...items);
      const row = { politician_id: pid, source, via: r.via || null, found: r.items.length, new: items.length, ...(r.error ? { error: r.error } : {}), ...(r.skipped ? { skipped: r.skipped } : {}) };
      out.sources.push(row);
      if (r.error) log(`video/speech discovery: FAIL ${pid} ${source} — ${r.error}; skipped this pass, the rest of the run continues`);
      else if (r.skipped) log(`video/speech discovery: SKIP ${pid} ${source} — ${r.skipped}`);
      else log(`video/speech discovery: ${pid} ${source} via ${r.via} — ${r.items.length} item(s) found, ${items.length} not yet fetched`);
    }
    if (!cfg.facebook_pages?.length) log(`video/speech discovery: SKIP ${pid} Facebook video posts — not available (Facebook shows no posts to an anonymous fetch and no Facebook access is configured); nothing queued`);
    const before = (fresh.frontier[pid] || []).length;
    const n = typeof mergeFrontier === "function" ? mergeFrontier(fresh, found) : 0;
    out.added += n;
    out.entries.push(...found.filter((e) => (fresh.frontier[pid] || []).some((x) => x.url === e.url)));
    for (const e of found) log(`discovery: QUEUE ${pid}|${e.topic} ${e.url} (${e.source_class} · ${e.speech_kind} · ${e.source_type}) — video/speech frontier entry`);
    log(`video/speech discovery: ${pid} — ${n} new video/speech URL(s) queued into the frontier (frontier ${before} → ${(fresh.frontier[pid] || []).length})`);
    st.last[pid] = at.toISOString();
  }
  if (out.checked.length && store && !state) {
    try { await store.setJSON(VIDEO_SPEECH_STATE_KEY, { updated_at: at.toISOString(), last: st.last }); }
    catch (e) { log(`video/speech discovery: state not saved — ${safeErr(e)}`); }
  }
  out.state = st;
  return out;
}

/**
 * Put up to `per` unfetched video / speech frontier entries per planned
 * politician into the pull list (newest first), only in free slots under
 * `max` and `perPolitician`; nothing already in the list is displaced.
 */
export function addVideoSpeechSources(sources, fresh, { politicians = [], max, perPolitician, per = VIDEO_SPEECH_PER_POLITICIAN, skipHosts = new Set(), log = console.log, configs = null } = {}) {
  const out = [...sources];
  const added = [];
  const known = new Set(out.map((s) => normUrl(s.url)));
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
  for (const pid of politicians) {
    if (!videoSpeechConfigFor(pid, configs)) continue;
    const list = (fresh?.frontier?.[pid] || []).filter(isVideoSpeechEntry)
      .sort((a, b) => String(b.published || b.found_at || "").localeCompare(String(a.published || a.found_at || "")) || (Number(b.rank) || 0) - (Number(a.rank) || 0));
    let n = 0, waiting = 0;
    for (const cand of list) {
      const u = normUrl(cand.url);
      if (known.has(u) || fresh.seen?.[u]) continue;
      if (skipHosts.has(hostOf(cand.url))) { log(`discovery: frontier SKIP ${pid} ${cand.url} — host failing this cycle (skipped)`); continue; }
      const mine = out.filter((s) => s.politician_id === pid).length;
      if (n >= per || mine >= perPolitician || out.length >= max) { waiting++; continue; }
      const { rank, found_from, found_at, attempts, ...src } = cand;
      // Queued before the chamber fix: name the C-SPAN clip for this member's chamber.
      const relabel = relabelCspanSourceType(src.source_type, videoSpeechConfigFor(pid, configs)?.chamber ?? null);
      if (relabel) src.source_type = relabel;
      out.push(src);
      known.add(u);
      added.push({ ...src, found_from });
      n++;
      log(`discovery: NEW ${pid}|${src.topic} ${src.url} (${src.source_class} · ${src.speech_kind || "video/speech"} · fresh video/speech, from ${found_from}) — added to this run's pull list`);
    }
    log(`video/speech: ${pid} — ${n} video/speech source(s) added to this run (≤ ${per} per politician, caps unchanged)${waiting ? ` · ${waiting} more waiting in the frontier` : ""}`);
  }
  return { sources: out, added };
}

// ── Speech transcript pull (floor_speech / hearing_transcript) ─────────────

const SPEAKER_LINE = /^\s{2,}((?:(?:Mr|Ms|Mrs|Miss|Dr)\.\s+[A-Z][A-Za-z'’-]+(?:\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)|(?:The\s+(?:SPEAKER|CHAIR|CHAIRMAN|CHAIRWOMAN|PRESIDING OFFICER|ACTING PRESIDENT|CLERK|VICE PRESIDENT|PRESIDENT)(?:\s+pro\s+tempore)?(?:\s+\([^)]*\))?)|(?:(?:Chairman|Chairwoman|Chair|Ranking Member|Senator|Representative|Secretary|Director|General|Judge|Attorney General)\s+[A-Z][A-Za-z'’-]+))\.\s+/;
const NOISE_LINE = /^\s*(?:\{time\}\s*\d+|\[\[Page [^\]]+\]\]|_{5,}|-{5,}|\[.*Congressional Record.*\]|\[(?:House|Senate)\]|\[Pages? [^\]]+\]|From the Congressional Record Online.*)\s*$/i;

/** The member's own speaking turns in a Congressional Record / hearing text, joined. */
export function ownSpeakingTurns(html, surname) {
  const text = decodeEntities(String(html || "").replace(/<[^>]+>/g, ""));
  const own = new RegExp(`^(?:(?:Mr|Ms|Mrs|Miss|Dr)\\.|Representative|Senator)\\s+${String(surname).replace(/[^A-Za-z'-]/g, "")}(?:\\s+of\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)?$`, "i");
  const turns = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (NOISE_LINE.test(line)) continue;
    const m = SPEAKER_LINE.exec(line);
    if (m) {
      if (cur) turns.push(cur);
      cur = own.test(m[1].trim()) ? [line.slice(m[0].length)] : null;
      continue;
    }
    if (cur) cur.push(line);
  }
  if (cur) turns.push(cur);
  return turns.map((t) => oneLine(t.join(" "))).filter(Boolean);
}

const speechKey = (src, fetchedAt) => `${[src.politician_id, src.topic, src.source_id].filter(Boolean).join("/")}/${fetchedAt.replace(/[:.]/g, "-")}.json`;

/**
 * Pull one floor speech / hearing transcript page. Never throws. The record
 * body is the member's own turns only; with none, nothing is stored and the
 * source is skipped (ok, logged). Result carries `speech` for the run log.
 */
export async function pullSpeechTranscript(src, { fetch, store, now = () => new Date(), onRecord, log = console.log, storeName = "raw-ingest" }) {
  const fetchedAt = now().toISOString();
  const cfg = videoSpeechConfigFor(src.politician_id)
    || (src.speaker_surname ? { name: oneLine(src.speaker_name) || src.politician_id, surname: src.speaker_surname } : null);
  const speech = { kind: src.source_class, own_turns: 0 };
  try {
    if (!cfg) throw new Error("no video/speech configuration for this politician");
    const res = await fetch(src.url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(SPEECH_FETCH_TIMEOUT_MS) });
    const html = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const turns = ownSpeakingTurns(html, cfg.surname);
    speech.own_turns = turns.length;
    if (!turns.length) {
      log(`raw-ingest: SPEECH SKIP ${src.politician_id} ${src.url} (${src.source_class}) — no speaking turn by ${cfg.name} in the text; nothing scored`);
      return { ok: true, key: null, url: src.url, fetched_at: fetchedAt, speech };
    }
    const body = turns.join("\n\n").slice(0, MAX_SPEECH_BODY_CHARS);
    const record = {
      url: src.url,
      final_url: res.url || src.url,
      fetched_at: fetchedAt,
      source_type: src.source_type,
      politician_id: src.politician_id,
      topic: src.topic,
      ...(src.source_id ? { source_id: src.source_id } : {}),
      source_tier: 2,
      http_status: res.status,
      content_type: `text/plain; source=${src.source_class} (member's own turns)`,
      body_chars: body.length,
      body,
      type: "speech",
      speech_kind: src.speech_kind || speechKindOf(src.title, { collection: src.source_class === "floor_speech" ? "CREC" : "CHRG" }),
      ...(src.title ? { title: src.title } : {}),
      ...(src.published ? { date: String(src.published).slice(0, 10) } : {}),
      own_turns: turns.length,
    };
    const key = speechKey(src, fetchedAt);
    await store.setJSON(key, record);
    console.log(`raw-ingest: OK ${src.url} → ${storeName}/${key} (${body.length} chars, ${turns.length} own speaking turn(s) by ${cfg.name}, ${src.source_class}, tier 2)`);
    if (onRecord) {
      try { await onRecord(Object.freeze({ ...record, key })); }
      catch (e) { console.log(`raw-ingest: hook error for ${key} — ${e?.message || e}`); }
    }
    return { ok: true, key, url: src.url, fetched_at: fetchedAt, body_chars: body.length, speech };
  } catch (e) {
    const { cls, error } = describeFetchError(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error, error_class: cls, speech };
  }
}
