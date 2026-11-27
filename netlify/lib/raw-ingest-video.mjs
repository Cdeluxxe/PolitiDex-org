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
//   · youtube_video (committee / conference channel) — recent uploads of a
//     short, verified list of official committee channels and the two Senate
//     party conference channels (INSTITUTIONAL_CHANNELS), each queued for the
//     one roster member its title names (else, for a hearing, the committee
//     chair). Checked hourly per channel; same frontier, same transcript queue.
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
import { wordGapRank, GAP_RANK } from "./raw-ingest-word-gap.mjs";

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

// ── Committee and conference channels (institutional) ─────────────────────
// Hearings and floor remarks posted by the institutions themselves, not by a
// member. Each channel id below was read from the channel page the
// committee's own website links to (or, for the two Senate conference
// channels, the channel page itself), and its public feed was checked to
// carry hearings / markups / floor remarks (2026-11-27). Chosen for the
// committees tier-1 / tier-2 roster members sit on most (db/person-committees.json):
// the House committees with an official full-hearing channel, and Senate
// Commerce — the Senate committee with the most tier-1 / tier-2 members.
// Most other Senate committees stream on senate.gov, not YouTube. Neither
// chamber publishes an official floor-proceedings channel on YouTube (House
// floor video is on live.house.gov, Senate floor video on senate.gov; both
// reach the frontier through the C-SPAN search). For Senate floor remarks
// the two party conference channels are used as a balanced pair.
//
// A channel video joins the frontier of ONE roster politician — the cached
// transcript is per video id and marks one speaker's words — chosen as:
//   1. a member the title names (full name, or an office / committee title +
//      surname), restricted to the channel's chamber and, for a committee
//      channel, to that committee's members; lowest roster tier first;
//   2. otherwise, for a hearing / markup on a committee channel, the
//      committee's chair when they are on the roster (at most
//      INSTITUTIONAL_CHAIR_FALLBACK_PER_PASS per channel per pass);
//   3. otherwise nothing is queued (logged).
export const INSTITUTIONAL_CHANNELS = [
  // House committees (official site → channel)
  { channel_id: "UCdvbanLNRlC0Af1QWeJ9foA", label: "House Judiciary Committee", chamber: "house", committee: "JU00", kind: "committee", site: "judiciary.house.gov" },
  { channel_id: "UCn8TJ6Tyq2aGvhybME_itDQ", label: "House Oversight Committee", chamber: "house", committee: "GO00", kind: "committee", site: "oversight.house.gov" },
  { channel_id: "UC5s1kIfkfWbap31d5ef-VtQ", label: "House Energy and Commerce Committee", chamber: "house", committee: "IF00", kind: "committee", site: "energycommerce.house.gov" },
  { channel_id: "UCD506yORW2voSanqEgLOUIQ", label: "House Armed Services Committee", chamber: "house", committee: "AS00", kind: "committee", site: "armedservices.house.gov" },
  { channel_id: "UC8FSgDMEzdK7j3lsQ4G4L0A", label: "House Ways and Means Committee", chamber: "house", committee: "WM00", kind: "committee", site: "waysandmeans.house.gov" },
  { channel_id: "UCMaSlF09S0fpoRshS2t_7XA", label: "House Appropriations Committee", chamber: "house", committee: "AP00", kind: "committee", site: "appropriations.house.gov" },
  { channel_id: "UChdT2snPVxfp2m8n4VDdMag", label: "House Homeland Security Committee", chamber: "house", committee: "HM00", kind: "committee", site: "homeland.house.gov" },
  { channel_id: "UCtxAmeCl0xtSuo7tHZpgcQA", label: "House Foreign Affairs Committee", chamber: "house", committee: "FA00", kind: "committee", site: "foreignaffairs.house.gov" },
  // Senate committee (official site → channel)
  { channel_id: "UC0lKQz7pObyGEYLz-CIUvUw", label: "Senate Commerce Committee", chamber: "senate", committee: "SSCM00", kind: "committee", site: "commerce.senate.gov" },
  // Senate floor remarks — the two party conferences, as a pair
  { channel_id: "UCAdyfSY2oRwNIB4LddDYZJA", label: "Senate Republicans", chamber: "senate", committee: null, kind: "conference" },
  { channel_id: "UCpgILFSGxY-9mQR79fLSt2A", label: "Senate Democrats", chamber: "senate", committee: null, kind: "conference" },
];
export const INSTITUTIONAL_CHAIR_FALLBACK_PER_PASS = 2;
const CHANNEL_STATE_PREFIX = "channel:";
const CHAIR_TITLE = /^(?:chair|chairman|chairwoman)$/i;

/** Source type of an institutional channel video ("official House committee video (House Judiciary Committee) — hearing"). */
export function institutionalSourceType(ch, kind = "") {
  const ch2 = ch.chamber === "senate" ? "Senate" : "House";
  const base = ch.kind === "conference" ? `official ${ch2} party conference video (${ch.label})` : `official ${ch2} committee video (${ch.label})`;
  return kind ? `${base} — ${kind}` : base;
}

/** Kind of a committee / conference video: a committee video that is neither floor speech nor hearing by title is still a hearing clip. */
export function institutionalKind(ch, title) {
  const k = speechKindOf(title);
  return ch.kind === "committee" && k === "video post" ? "hearing" : k;
}

/**
 * Who can be matched in institutional channel titles: one row per roster
 * politician with a usable video configuration — { politician_id, cfg,
 * name_re, chamber, committees (top-level codes), chairs, tier }.
 * `committees` is db/person-committees.json; `members` the member map list.
 */
export function institutionalMembers(roster = [], { members = [], committees = null, configs = null } = {}) {
  const bySlug = new Map();
  for (const m of members || []) if (m?.slug && (m.serving119 !== false || !bySlug.has(m.slug))) bySlug.set(m.slug, m);
  const codes = committees?.committees || {};
  const out = [];
  const seen = new Set();
  for (const row of roster || []) {
    const pid = String(row?.politician_id || "");
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const member = bySlug.get(pid) || null;
    const cfg = (configs && configs[pid]) || VIDEO_SPEECH_SOURCES[pid] || videoSpeechConfigFromRoster(row, { member });
    if (!cfg?.surname) continue;
    const chamber = cfg.chamber || chamberForRow(row, member);
    if (!chamber) continue;
    const firsts = [...new Set([nameParts(row.name)?.first, nameParts(member?.name)?.first, nameParts(cfg.name)?.first].filter(Boolean))];
    const office = "(?:rep|sen|senator|representative|congressman|congresswoman|chair|chairman|chairwoman|ranking member|leader|whip|speaker)\\.?";
    const name_re = new RegExp(`\\b(?:(?:${firsts.map(reEsc).join("|")})\\s+(?:[A-Z]\\.\\s+)?${reEsc(cfg.surname)}|${office}\\s+${reEsc(cfg.surname)})\\b`, "i");
    const tops = new Set(), chairs = new Set();
    for (const [code, title] of committees?.people?.[pid] || []) {
      const top = codes[code]?.[2] || code;
      tops.add(top);
      if (!codes[code]?.[2] && CHAIR_TITLE.test(String(title || ""))) chairs.add(code);
    }
    const tier = Number(row.tier);
    out.push({ politician_id: pid, cfg: { ...cfg, chamber }, name_re, chamber, committees: tops, chairs, tier: Number.isFinite(tier) && tier > 0 ? tier : 9 });
  }
  return out;
}

/**
 * The one roster politician an institutional channel video is queued for:
 * { member, via: "title" | "chair" } or null (see INSTITUTIONAL_CHANNELS).
 */
export function matchInstitutionalVideo(video, ch, members = [], { allowChair = true } = {}) {
  const title = String(video?.title || "");
  const pool = members.filter((m) => m.chamber === ch.chamber && (!ch.committee || m.committees.has(ch.committee)));
  const named = pool.map((m) => ({ m, at: title.search(m.name_re) })).filter((x) => x.at >= 0)
    .sort((a, b) => (a.m.tier - b.m.tier) || (a.at - b.at) || a.m.politician_id.localeCompare(b.m.politician_id));
  if (named.length) return { member: named[0].m, via: "title" };
  if (allowChair && ch.kind === "committee" && ch.committee && institutionalKind(ch, title) === "hearing") {
    const chair = pool.filter((m) => m.chairs.has(ch.committee)).sort((a, b) => a.tier - b.tier)[0];
    if (chair) return { member: chair, via: "chair" };
  }
  return null;
}

/**
 * Discover institutional channel videos (each channel at most once per
 * `interval`, remembered in the same state doc under "channel:<id>") and turn
 * them into frontier entries for the politician each is matched to.
 * Returns { checked, entries, sources }; never throws.
 */
async function discoverInstitutional({ channels, members, st, at, fresh, fetch, youtubeKey, force, interval, log, meter = null }) {
  const out = { checked: [], entries: [], sources: [] };
  if (!channels?.length || !members?.length) return out;
  const inFrontier = new Set(Object.values(fresh.frontier || {}).flat().map((e) => normUrl(e.url)));
  const due = channels.filter((ch) => {
    const last = Date.parse(st.last[CHANNEL_STATE_PREFIX + ch.channel_id] || "");
    if (!force && Number.isFinite(last) && at.getTime() - last < interval) return false;
    return true;
  });
  if (!due.length) { log(`video/speech discovery: committee / conference channels — none due this pass (${channels.length} channel(s), checked hourly)`); return out; }
  const results = await Promise.all(due.map((ch) => memberChannelVideos(ch, { fetch, youtubeKey, meter }).then((r) => ({ ch, r }))));
  const taken = new Set();
  for (const { ch, r } of results) {
    out.checked.push(ch.channel_id);
    let queued = 0, unmatched = 0, chairs = 0;
    for (const v of r.items) {
      const url = youtubeWatchUrl(v.video_id);
      const n = normUrl(url);
      if (fresh.seen?.[n] || inFrontier.has(n) || taken.has(n)) continue;
      const match = matchInstitutionalVideo(v, ch, members, { allowChair: chairs < INSTITUTIONAL_CHAIR_FALLBACK_PER_PASS });
      if (!match) { unmatched++; log(`video/speech discovery: ${ch.label} ${url} "${oneLine(v.title).slice(0, 90)}" — names no roster member of this ${ch.kind}; not queued`); continue; }
      if (match.via === "chair") chairs++;
      const kind = institutionalKind(ch, v.title);
      const e = entry(match.member.politician_id, { ...match.member.cfg, derived: true }, {
        url, source_class: "youtube_video", source_type: institutionalSourceType(ch, kind),
        title: v.title, published: v.published, found_from: youtubeFeedUrl(ch.channel_id), kind, rank: 6, now: at,
      });
      e.institutional = { channel: ch.label, matched_by: match.via };
      taken.add(n);
      out.entries.push(e);
      queued++;
    }
    const row = { politician_id: null, source: `YouTube ${ch.kind} channel ${ch.label}`, via: r.via || null, found: r.items.length, new: queued, ...(unmatched ? { unmatched } : {}), ...(r.error ? { error: r.error } : {}) };
    out.sources.push(row);
    if (r.error) log(`video/speech discovery: FAIL ${ch.kind} channel ${ch.label} — ${r.error}; skipped this pass, the rest of the run continues`);
    else log(`video/speech discovery: ${ch.kind} channel ${ch.label} via ${r.via} — ${r.items.length} item(s) found, ${queued} matched to a roster member${chairs ? ` (${chairs} via the chair)` : ""}, ${unmatched} unmatched`);
    if (!r.error) st.last[CHANNEL_STATE_PREFIX + ch.channel_id] = at.toISOString();
  }
  return out;
}

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

// ── YouTube Data API units ─────────────────────────────────────────────────
// Quota cost per request (YouTube Data API v3): search.list 100 units, any
// *.list read (playlistItems.list here) 1 unit. A run counts what it sent
// (a request is charged whether or not it succeeds) and logs one line,
// "youtube-api: N units (search X, list Y)". The day's running total sits in
// YOUTUBE_UNITS_STATE_KEY (rotation store), on the API's own day (midnight
// Pacific, when the quota resets). Soft guard: once the day passes
// YOUTUBE_SEARCH_GUARD_UNITS, new C-SPAN searches are skipped until the next
// day; the 1-unit uploads fallback keeps running.
export const YOUTUBE_UNIT_COST = { search: 100, list: 1 };
export const YOUTUBE_SEARCH_GUARD_UNITS = 6_000;
export const YOUTUBE_UNITS_STATE_KEY = "youtube-api-units.json";

/** The YouTube quota day ("YYYY-MM-DD", America/Los_Angeles) of a Date. */
export function youtubeQuotaDay(d = new Date()) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
  catch { return new Date(d.getTime() - 8 * 3_600_000).toISOString().slice(0, 10); }
}

/**
 * A per-run unit meter. `dayUnits` = units already used today before this run.
 * `guard` = daily total past which new searches are skipped (0 / Infinity = off).
 */
export function createYoutubeMeter({ dayUnits = 0, day = null, guard = YOUTUBE_SEARCH_GUARD_UNITS } = {}) {
  const m = {
    day, day_before: Math.max(0, Number(dayUnits) || 0), guard,
    search_calls: 0, list_calls: 0, search_skipped: 0,
    get search() { return m.search_calls * YOUTUBE_UNIT_COST.search; },
    get list() { return m.list_calls * YOUTUBE_UNIT_COST.list; },
    get units() { return m.search + m.list; },
    get day_units() { return m.day_before + m.units; },
    charge(kind) { if (kind === "search") m.search_calls++; else m.list_calls++; },
    canSearch() { return !(m.guard > 0 && Number.isFinite(m.guard)) || m.day_units + YOUTUBE_UNIT_COST.search <= m.guard; },
    summary() { return { units: m.units, search: m.search, list: m.list, search_calls: m.search_calls, list_calls: m.list_calls, search_skipped: m.search_skipped, day: m.day, day_units: m.day_units, guard: m.guard }; },
  };
  return m;
}

/** The run's one summary line. */
export function youtubeUnitsLine(meter) {
  const s = meter?.summary ? meter.summary() : { units: 0, search: 0, list: 0, search_calls: 0, list_calls: 0, search_skipped: 0, day_units: 0 };
  return `youtube-api: ${s.units} units (search ${s.search}, list ${s.list}) · ${s.search_calls} search call(s), ${s.list_calls} list call(s)`
    + `${s.day ? ` · ${s.day_units} units today (${s.day} Pacific)` : ""}`
    + `${s.search_skipped ? ` · ${s.search_skipped} C-SPAN search(es) skipped by the daily guard (≥ ${s.guard} units)` : ""}`;
}

/** Today's stored total ({ day, units, search, list }); a new day starts at 0. */
export async function readYoutubeUnits(store, now = new Date()) {
  const day = youtubeQuotaDay(now);
  const empty = { day, units: 0, search: 0, list: 0 };
  if (!store) return empty;
  try {
    let d = await store.get(YOUTUBE_UNITS_STATE_KEY, { type: "json" });
    if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = null; } }
    if (!d || d.day !== day) return empty;
    return { day, units: Number(d.units) || 0, search: Number(d.search) || 0, list: Number(d.list) || 0 };
  } catch { return empty; }
}

/** Add this run's units to today's total. Never throws. */
export async function saveYoutubeUnits(store, meter, { now = new Date(), log = console.log } = {}) {
  if (!store || !meter || !meter.units) return;
  try {
    const cur = await readYoutubeUnits(store, now);
    await store.setJSON(YOUTUBE_UNITS_STATE_KEY, { day: cur.day, units: cur.units + meter.units, search: cur.search + meter.search, list: cur.list + meter.list, updated_at: now.toISOString() });
  } catch (e) { log(`youtube-api: daily total not saved — ${safeErr(e)}`); }
}

async function memberChannelVideos(ch, { fetch, youtubeKey, meter = null }) {
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
      meter?.charge("list");
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

async function searchChannelVideos(ch, { fetch, youtubeKey, meter = null }) {
  if (!youtubeKey) return { items: [], skipped: "YouTube Data API key (YOUTUBE_API_KEY) not set" };
  if (meter && !meter.canSearch()) {
    meter.search_skipped++;
    return { items: [], skipped: `daily YouTube API guard — ${meter.day_units} units used today (guard ${meter.guard}); new searches wait for the next quota day` };
  }
  try {
    meter?.charge("search");
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
  institutional = null, youtubeMeter = null,
} = {}) {
  const out = { checked: [], added: 0, entries: [], sources: [], channels_checked: [] };
  const meter = youtubeMeter;
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
      ...cfg.youtube_channels.map((ch) => memberChannelVideos(ch, { fetch, youtubeKey, meter }).then((r) => ({ r, source: `YouTube ${ch.label} ${ch.handle || ch.channel_id}`, make: (v) => entry(pid, cfg, {
        url: youtubeWatchUrl(v.video_id), source_class: "youtube_video",
        source_type: `official YouTube video (own channel) — ${speechKindOf(v.title)}`,
        title: v.title, published: v.published, found_from: youtubeFeedUrl(ch.channel_id), kind: speechKindOf(v.title), rank: 6, now: at,
      }) }))),
      ...cfg.search_channels.map((ch) => searchChannelVideos(ch, { fetch, youtubeKey, meter }).then((r) => ({ r, source: `YouTube ${ch.label} search "${ch.query}"`, make: (v) => entry(pid, cfg, {
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
  // Committee / conference channels (INSTITUTIONAL_CHANNELS): each video goes
  // to the one roster politician it is matched to, into the same frontier.
  if (institutional) {
    const inst = await discoverInstitutional({
      channels: institutional.channels || INSTITUTIONAL_CHANNELS, members: institutional.members || [],
      st, at, fresh, fetch, youtubeKey, force, interval, log, meter,
    });
    out.channels_checked = inst.checked;
    out.sources.push(...inst.sources);
    if (inst.entries.length) {
      const n = typeof mergeFrontier === "function" ? mergeFrontier(fresh, inst.entries) : 0;
      out.added += n;
      out.entries.push(...inst.entries.filter((e) => (fresh.frontier[e.politician_id] || []).some((x) => x.url === e.url)));
      for (const e of inst.entries) log(`discovery: QUEUE ${e.politician_id}|${e.topic} ${e.url} (${e.source_class} · ${e.speech_kind} · ${e.source_type}, matched by ${e.institutional.matched_by}) — committee/conference video frontier entry`);
      log(`video/speech discovery: committee / conference channels — ${n} new video URL(s) queued into the frontier`);
    }
  }
  if ((out.checked.length || out.channels_checked.length) && store && !state) {
    try { await store.setJSON(VIDEO_SPEECH_STATE_KEY, { updated_at: at.toISOString(), last: st.last }); }
    catch (e) { log(`video/speech discovery: state not saved — ${safeErr(e)}`); }
  }
  out.state = st;
  if (meter) out.youtube_api = meter.summary();
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

// ── Video priority lane ────────────────────────────────────────────────────
// Parallel to the priority-newsroom lane (raw-ingest-core.mjs, planRun): up to
// VIDEO_LANE_PER_RUN slots of every run are RESERVED for video / speech
// frontier entries of high-value members — tier 1, tier 2, or no Locker
// evidence at all — whether or not the rotation planned them this run. The
// cron plans the rest of the run under the cap minus the reserved slots, so
// leftover-slot behaviour (addVideoSpeechSources, then fresh pages) is
// unchanged for everyone else.
//   · COVERAGE TARGETS (VIDEO_LANE_TARGETS). Tier-1 members stay in the lane
//     until they hold 5–8 video / official-speech Locker items, tier-2
//     members 3–5. Below the low end a member is always under target; between
//     the ends they stay only while a Word vs Action GAP entry is waiting (an
//     issue with a formal record — votes, sponsorships — but no stated
//     position yet, raw-ingest-word-gap.mjs): the video can supply the missing
//     word. At the high end, or after VIDEO_LANE_SLOT_FACTOR × the high end
//     lane slots (videos that keep yielding nothing), they leave the lane.
//     Zero-evidence members of other tiers keep the earlier rule: they leave
//     after VIDEO_LANE_COVERED lane slots (or once they have any evidence).
//   · Candidates: lane members with an unfetched video / speech entry in their
//     frontier (committee, C-SPAN, official or campaign video, floor speech,
//     hearing transcript), not already in the pull list, not waiting in the
//     transcript queue (a queued video would only re-occupy the slot).
//   · Member order: the member the lane is working on (`focus`) keeps every
//     slot it can fill until they reach their target or their frontier is
//     empty; then no evidence first, then members with a gap entry waiting,
//     then tier, then members holding a hearing / floor item, then roster
//     order. Spare slots go to the next member in that order.
//   · Entry order inside a member: gap entries first, then hearing / floor,
//     C-SPAN / committee, official, campaign; newest first.
// State: VIDEO_LANE_STATE_KEY in the rotation store ({ focus, given }).
export const VIDEO_LANE_PER_RUN = 2;
export const VIDEO_LANE_COVERED = 3;
export const VIDEO_LANE_STATE_KEY = "video-lane.json";
export const VIDEO_LANE_TARGETS = Object.freeze({ 1: Object.freeze({ min: 5, max: 8 }), 2: Object.freeze({ min: 3, max: 5 }) });
export const VIDEO_LANE_SLOT_FACTOR = 3;

/** The coverage target of a roster tier, or null (no item target for that tier). */
export function videoLaneTarget(tier, targets = VIDEO_LANE_TARGETS) {
  return targets?.[Number(tier)] || null;
}

/** 0 hearing / floor · 1 C-SPAN or committee / conference · 2 official · 3 campaign. */
export function videoEntryRank(e) {
  const kind = String(e?.speech_kind || "");
  if (e?.source_class === "floor_speech" || e?.source_class === "hearing_transcript" || kind === "hearing" || kind === "floor speech") return 0;
  const st = String(e?.source_type || "");
  if (/\bc-span\b/i.test(st) || /\b(?:committee|party conference) video\b/i.test(st)) return 1;
  if (/\bcampaign\b/i.test(st)) return 3;
  return 2;
}

/** True when a frontier entry works on one of the member's Word vs Action gap issues. */
export function isWvaGapEntry(e, wordGaps) {
  return !!wordGaps && !!e && wordGapRank(e, wordGaps) === GAP_RANK;
}

/** A stored lane state, normalised. */
export function normaliseVideoLaneState(doc) {
  const given = {};
  for (const [k, v] of Object.entries(doc?.given || {})) if (Number(v) > 0) given[k] = Math.trunc(Number(v));
  return { focus: doc?.focus ? String(doc.focus) : null, given };
}

const evidenceIn = (counts, pid) => {
  const pre = `${pid}|`;
  for (const [k, c] of Object.entries(counts || {})) if (k.startsWith(pre) && ((Number(c?.strong) || 0) + (Number(c?.weak) || 0)) > 0) return true;
  return false;
};
const videoItemsOf = (videoItems, pid) => {
  const v = videoItems?.[pid];
  return Math.max(0, Number(typeof v === "object" && v ? v.items : v) || 0);
};

/**
 * One member's standing against their coverage target →
 * { target, items, given, under, reason }. `gapWaiting` says whether a gap
 * entry is waiting in their frontier. Members without an item target (tier 3+)
 * use the slot rule (VIDEO_LANE_COVERED).
 */
export function videoLaneStatus({ tier, items = 0, given = 0, gapWaiting = false, targets = VIDEO_LANE_TARGETS, covered = VIDEO_LANE_COVERED, slotFactor = VIDEO_LANE_SLOT_FACTOR } = {}) {
  const target = videoLaneTarget(tier, targets);
  if (!target) {
    const under = given < covered;
    return { target: null, items, given, under, reason: under ? "below the slot rule" : `covered (${covered} lane slots)` };
  }
  if (items >= target.max) return { target, items, given, under: false, reason: `target reached (${items} ≥ ${target.max} items)` };
  if (given >= target.max * slotFactor) return { target, items, given, under: false, reason: `slot budget spent (${given} lane slots, ${items} item(s))` };
  if (items < target.min) return { target, items, given, under: true, reason: `below target (${items} of ${target.min}–${target.max} items)` };
  if (gapWaiting) return { target, items, given, under: true, reason: `gap item waiting (${items} of ${target.min}–${target.max} items)` };
  return { target, items, given, under: false, reason: `target reached (${items} ≥ ${target.min} items, no gap item waiting)` };
}

/**
 * Lane members: tier-1 / tier-2 members under their coverage target, and
 * zero-evidence members of other tiers not yet covered →
 * [{ politician_id, tier, no_evidence, i, status }].
 * `videoItems` maps pid → video / official-speech Locker items (strong / weak).
 */
export function videoLaneMembers(roster = [], { counts = {}, state = null, covered = VIDEO_LANE_COVERED, videoItems = {}, gapWaiting = null, targets = VIDEO_LANE_TARGETS } = {}) {
  const st = normaliseVideoLaneState(state);
  const out = [], seen = new Set();
  (roster || []).forEach((r, i) => {
    const pid = String(r?.politician_id || "");
    if (!pid || seen.has(pid)) return;
    seen.add(pid);
    const tier = Number(r.tier);
    const no_evidence = !evidenceIn(counts, pid);
    const target = videoLaneTarget(tier, targets);
    if (!(target || no_evidence)) return;
    const status = videoLaneStatus({ tier, items: videoItemsOf(videoItems, pid), given: st.given[pid] || 0, gapWaiting: typeof gapWaiting === "function" ? !!gapWaiting(pid) : false, targets, covered });
    if (!status.under) return;
    out.push({ politician_id: pid, tier: Number.isFinite(tier) && tier > 0 ? tier : 9, no_evidence, i, status });
  });
  return out;
}

/**
 * Plan this run's video lane. Never throws. Returns { picks, reserved,
 * members, eligible, covered, targets, state } — `picks` are pull-list
 * sources (each marked video_lane: true, and wva_gap: true when they work on a
 * gap issue), `targets` the tier-1 / tier-2 tally, `state` the lane state to
 * persist. `known` (normalised URLs already in the pull list) and
 * `pendingVideoIds` (ids waiting in the transcript queue) are skipped.
 */
export function planVideoLane(fresh, {
  roster = [], counts = {}, state = null, perRun = VIDEO_LANE_PER_RUN, covered = VIDEO_LANE_COVERED,
  known = new Set(), pendingVideoIds = new Set(), configs = null, log = console.log,
  videoItems = {}, wordGaps = null, targets = VIDEO_LANE_TARGETS,
} = {}) {
  const st = normaliseVideoLaneState(state);
  const out = { picks: [], reserved: 0, members: [], eligible: [], covered: [], targets: null, state: st };
  const vid = (u) => (/[?&]v=([A-Za-z0-9_-]{11})/.exec(String(u || "")) || [])[1] || null;
  const open = (pid) => (fresh?.frontier?.[pid] || []).filter((e) => isVideoSpeechEntry(e))
    .filter((e) => { const u = normUrl(e.url); const id = vid(e.url); return !known.has(u) && !fresh.seen?.[u] && !(id && pendingVideoIds.has(id)); });
  const gapWaiting = (pid) => !!wordGaps?.[pid] && open(pid).some((e) => isWvaGapEntry(e, wordGaps));
  // Tier-1 / tier-2 standing (logged every run) and who has left the lane.
  const tally = { 1: { members: 0, under: 0, reached: 0 }, 2: { members: 0, under: 0, reached: 0 } };
  const seen = new Set();
  for (const r of roster || []) {
    const pid = String(r?.politician_id || "");
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const tier = Number(r.tier);
    const target = videoLaneTarget(tier, targets);
    if (target) {
      const s = videoLaneStatus({ tier, items: videoItemsOf(videoItems, pid), given: st.given[pid] || 0, gapWaiting: gapWaiting(pid), targets, covered });
      const t = tally[tier] || (tally[tier] = { members: 0, under: 0, reached: 0 });
      t.members++;
      if (s.under) t.under++; else { t.reached++; out.covered.push(pid); }
    } else if ((st.given[pid] || 0) >= covered) out.covered.push(pid);
  }
  out.covered.sort();
  out.targets = { tier1: { ...tally[1], ...(targets?.[1] || {}) }, tier2: { ...tally[2], ...(targets?.[2] || {}) } };
  const targetLine = () => log(`video-lane: targets — tier 1: ${tally[1].under} of ${tally[1].members} member(s) under target (${targets?.[1]?.min}–${targets?.[1]?.max} video/speech items) · tier 2: ${tally[2].under} of ${tally[2].members} under target (${targets?.[2]?.min}–${targets?.[2]?.max})`);
  if (!fresh?.frontier || !(perRun > 0)) { targetLine(); return out; }
  const candidates = [];
  for (const m of videoLaneMembers(roster, { counts, state: st, covered, videoItems, gapWaiting, targets })) {
    const entries = open(m.politician_id)
      .map((e) => ({ e, gap: isWvaGapEntry(e, wordGaps) }))
      .sort((a, b) => (Number(b.gap) - Number(a.gap)) || (videoEntryRank(a.e) - videoEntryRank(b.e)) || String(b.e.published || b.e.found_at || "").localeCompare(String(a.e.published || a.e.found_at || "")));
    if (entries.length) candidates.push({ ...m, entries, gap: entries[0].gap, hearing: entries.some((x) => videoEntryRank(x.e) === 0) });
  }
  out.eligible = candidates.map((c) => c.politician_id);
  if (!candidates.length) {
    out.state = { focus: null, given: st.given };
    targetLine();
    log(`video-lane: 0 of ${perRun} reserved slot(s) used · no high-value member under target with video waiting · ${out.covered.length} at target / covered`);
    return out;
  }
  candidates.sort((a, b) => (Number(b.politician_id === st.focus) - Number(a.politician_id === st.focus))
    || (Number(b.no_evidence) - Number(a.no_evidence)) || (Number(b.gap) - Number(a.gap)) || (a.tier - b.tier) || (Number(b.hearing) - Number(a.hearing)) || (a.i - b.i));
  const take = (c, x) => {
    const { rank, found_from, found_at, attempts, ...src } = x.e;
    const relabel = relabelCspanSourceType(src.source_type, videoSpeechConfigFor(c.politician_id, configs)?.chamber ?? null);
    if (relabel) src.source_type = relabel;
    out.picks.push({ ...src, video_lane: true, ...(x.gap ? { wva_gap: true } : {}) });
  };
  // The focus member (else the first in order) fills every slot it can, then the next member.
  for (const c of candidates) {
    while (out.picks.length < perRun && c.entries.length) take(c, c.entries.shift());
    if (out.picks.length >= perRun) break;
  }
  out.reserved = out.picks.length;
  out.members = [...new Set(out.picks.map((p) => p.politician_id))];
  const given = { ...st.given };
  for (const p of out.picks) given[p.politician_id] = (given[p.politician_id] || 0) + 1;
  // The member served first stays the focus while they are under target with
  // entries left; the next run otherwise moves on (re-checked against targets).
  out.state = { focus: out.members[0] || null, given };
  for (const p of out.picks) log(`video-lane: SLOT ${p.politician_id}|${p.topic} ${p.url} (${p.source_class} · ${p.speech_kind || "video/speech"} · ${p.source_type}${p.wva_gap ? " · Word vs Action gap issue" : ""}) — reserved video slot (${candidates.find((c) => c.politician_id === p.politician_id)?.status?.reason || "in the lane"})`);
  targetLine();
  log(`video-lane: ${out.reserved} of ${perRun} reserved slot(s) used · ${out.picks.filter((p) => p.wva_gap).length} on a gap issue · ${out.eligible.length} high-value member(s) under target with video waiting · ${out.covered.length} at target / covered`);
  return out;
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
