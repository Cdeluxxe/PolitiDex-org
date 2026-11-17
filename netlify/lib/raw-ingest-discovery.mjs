// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-discovery.mjs — the rules for DISCOVERED sources (resolver step 5)
// ─────────────────────────────────────────────────────────────────────────────
// Steps 1–4 of the URL resolver only attach pages the repo already holds. Step
// 5 attaches pages an OFFLINE job found: scripts/discover-raw-ingest-sources-2026-11.mjs
// reads public records (FEC committee filings, Open States legislator data),
// searches (Tavily) for whoever is still unmatched, fetches every candidate
// page and keeps it only when the rules below accept it. The job commits what
// it accepted, with the reasons, to db/raw-ingest-discovered-2026-11.json; the
// roster build reads that file. Nothing here fetches or searches: this module
// is pure, and neither the cron nor the planner imports it.
//
// A candidate URL (classifyCandidate) is one of:
//   own_site         their own campaign / personal site — the host (or a blog
//                    platform subdomain) carries their surname, full name, or
//                    the nickname the roster prints in quotes;
//   youtube          a YouTube channel (by /channel/UC… or @handle; the job
//                    reads the channel page to learn its UC… ID);
//   youtube_video    a video, kept only when the job reads that its uploader
//                    is their own channel (an interview on someone else's
//                    channel is never kept: the Locker credits YouTube items
//                    to the politician's own channel);
//   direct_statement an interview, Q&A, podcast or statement page whose address
//                    names them, on a host that is NOT a news outlet, election
//                    guide, party / candidate platform or reference site.
// Never: social and reference hosts, shared platforms (goodparty, ActBlue,
// party sites, Apple / Spotify podcasts …), news outlets, election and voter
// guides, endorsement lists, government / legislature hosts (steps 1–3).
//
// The fetched page must then (verifyPage): answer 200 with HTML, not be a
// parked / for-sale / suspended domain, stay on an acceptable host after
// redirects, name them in full (title, heading or site name — or, for a host
// carrying their name, the page text), mention their office, mention their
// state, and not name another politician on the site in its title, or read as
// a debate / forum / guide. The engine (resolveDiscovered in
// raw-ingest-resolve.mjs) re-checks name conflicts and uniqueness on roster
// build.

import {
  nameTokens, letters, hostOf, directKeys, officeConflict, STATES,
  REFERENCE, PLATFORM, BLOG_PLATFORM, CAUCUS_HOST, MULTI, STATE_LEGIS_HOST, GOV_HOST, MEMBER_OFFICE_HOST, GENERAL_GOV,
  THIRD_PARTY, CAMPAIGN_WORD, NOT_OWN_CHANNEL,
} from "./raw-ingest-resolve.mjs";

export const DISCOVERY_VERSION = "discovery-2026-11-v1";
export const MAX_DISCOVERED_PER_POLITICIAN = 3;

export const DISCOVERY_CLASSES = {
  own_site: { tier: 1, type: { campaign: "campaign site (the politician's own)", personal: "the politician's own personal site" } },
  youtube: { tier: 2, type: "campaign YouTube channel (the politician's own)" },
  youtube_video: { tier: 2, type: "campaign YouTube video (the politician's own channel)" },
  direct_statement: { tier: 2, type: "interview / statement about the politician (not a news outlet)" },
};
// Own site before channel before third-party interview.
export const DISCOVERY_ORDER = ["own_site", "youtube", "youtube_video", "direct_statement"];

const SOCIAL = /(?:^|\.)(?:facebook\.com|fb\.com|x\.com|twitter\.com|instagram\.com|tiktok\.com|linkedin\.com|threads\.net|bsky\.app|truthsocial\.com|reddit\.com|pinterest\.com|nextdoor\.com|rumble\.com|substack\.com|medium\.com|linktr\.ee|beacons\.ai)$/;
const MORE_REFERENCE = /(?:^|\.)(?:rocketreach\.co|zoominfo\.com|wikiwand\.com|britannica\.com|justia\.com|legistorm\.com|influencewatch\.org|muckrack\.com|prabook\.com|imdb\.com|amazon\.com|ebay\.com|yelp\.com|indeed\.com|glassdoor\.com|crunchbase\.com|bloomberg\.com|spokeo\.com|whitepages\.com|peoplefinders\.com|legacy\.com|findagrave\.com|ancestry\.com|myheritage\.com|meetup\.com|eventbrite\.com|change\.org|gofundme\.com)$/;
// Shared platforms: one host serves many candidates or shows.
const MORE_PLATFORM = /(?:^|\.)(?:lp\.org|gop\.com|democrats\.org|dccc\.org|nrcc\.org|dscc\.org|nrsc\.org|podcasts\.apple\.com|open\.spotify\.com|spotify\.com|soundcloud\.com|podbean\.com|buzzsprout\.com|anchor\.fm|iheart\.com|stitcher\.com|audible\.com|castbox\.fm|podchaser\.com|listennotes\.com|pca\.st|acast\.com|transistor\.fm|podcastics\.com|beehiiv\.com|libsyn\.com|captivate\.fm|simplecast\.com|spreaker\.com|podomatic\.com|megaphone\.fm|redcircle\.com|rss\.com|audioboom\.com|omny\.fm|podcasters\.spotify\.com|podbean\.com|substack\.com|squarespace\.com|ballotready\.org|candidate\.vote|runforsomething\.net|emilyslist\.org|justicedemocrats\.com)$/;
const PARTY_HOST = /(?:gop|democrats?|dems|republicans?|libertarian|greenparty|greens|constitutionparty|workingfamilies|dfl|forwardparty|reformparty)/;
// Election / voter guides and endorsement lists are about many candidates.
const GUIDE = /voter-?guide|votersguide|election-?guide|electionguide|candidate-?guide|ballot-?guide|endorse|slate|candidates\/?$|vote411|isidewith|ivoterguide|votesmart|lwv|leagueofwomenvoters/i;
// News outlets and broadcasters (beyond the resolver's list).
const NEWS = /(?:stories|banner|citizen|chieftain|courant|quirer|advocate|express|globe|news|press|times|post|tribune|herald|journal|gazette|daily|radio|chronicle|observer|courier|record|report|magazine|weekly|monitor|sentinel|beacon|bulletin|ledger|dispatch|leader|telegraph|review|current|examiner|independent|today|insider|media|broadcast|public|politic|capitol|statehouse|wire|patch|kff|npr|pbs|cbs|nbc|abc|fox|cnn|msnbc|cspan|c-span|reuters|bloomberg|axios|hill|newsweek|yahoo|aol|msn|vox|slate|salon|atlantic|nation|mother|reason|federalist|breitbart|dailywire|blaze|townhall|newsmax|oann|epoch|huffpost|buzzfeed|vice|guardian|economist|ft\.com|forbes|fortune|cnbc|marketwatch|apnews|usatoday)/;
const BROADCAST = /^(?:[kw][a-z]{2,3})(?:tv|fm|am)?\d*\.(?:com|org|net)$/;
// Public broadcasters by short call-sign-like names: mtpr, opb, vpm, iowapbs, wbur …
const PUBLIC_MEDIA = /^(?:[a-z]{1,4}(?:pr|pb|pbs|pm|tv|fm|am)|(?:[a-z]+)?(?:publicradio|publicmedia|pbs|npr))$/;
const INTERVIEW = /\binterview|\bq\s*&\s*a\b|(?:^|[\/-])q-?a(?:[\/-]|$)|podcast|episode|in-(?:his|her|their)-own-words|\bstatement\b|\bconversation with\b|fireside/i;
const PARKED = /domain (?:is )?for sale|buy this domain|this domain (?:may be|is) for sale|parked (?:free|domain)|domain parking|account (?:has been )?suspended|site (?:not found|unavailable)|website (?:is )?(?:coming soon|under construction)|hugedomains|sedo\.com|dan\.com|afternic|godaddy\.com\/domainsearch|future home of|default web site page|index of \//i;
const YT_HOST = /(?:^|\.)(?:youtube\.com|youtu\.be)$/;
const YT_VIDEO = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const YT_CHANNEL_ID = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/;
const YT_HANDLE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(@[A-Za-z0-9._-]{3,30}|c\/[A-Za-z0-9._-]+|user\/[A-Za-z0-9._-]+)\/?(?:[?#].*|\/(?:videos|featured|about|streams|shorts)\/?)?$/;

const STATE_NAME = Object.fromEntries(Object.entries(STATES).map(([n, c]) => [c, n.replace(/\b[a-z]/g, (x) => x.toUpperCase())]));
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Office words a page must mention for this identity (a RegExp), or null when the office is unclear. */
export function officeTerms(id) {
  const o = String(id?.office || "");
  if (/\bU\.?S\.? Senat|\bUnited States Senat/i.test(o)) return /\bU\.?\s?S\.?\s+Senat|\bUnited States Senat|\bSenat(?:e|or)\b/i;
  if (/\bU\.?S\.? (?:House|Representative|Delegate)|\bCongress|\bResident Commissioner/i.test(o)) return /\bCongress|\bU\.?\s?S\.?\s+House|\bHouse of Representatives|\bRepresentative\b|\bCongressional District\b/i;
  if (/\bLieutenant Governor|\bLt\.? Governor/i.test(o)) return /\bLieutenant Governor|\bLt\.? Gov/i;
  if (/\bGovernor\b/i.test(o)) return /\bGovernor\b/i;
  if (/\bAttorney General\b/i.test(o)) return /\bAttorney General\b/i;
  if (/\bSecretary of State\b/i.test(o)) return /\bSecretary of State\b/i;
  if (/\bTreasurer\b/i.test(o)) return /\bTreasurer\b/i;
  if (/\bAuditor\b/i.test(o)) return /\bAuditor\b/i;
  if (/\bComptroller\b/i.test(o)) return /\bComptroller\b/i;
  if (/\bState Senat|\bSenat(?:e|or)\b/i.test(o) && /\bState\b|Senate District/i.test(o)) return /\bState Senat|\bSenate District|\bSenat(?:e|or)\b/i;
  if (/\bState (?:House|Representative)|\bAssembly|\bDelegate\b|\bHouse District/i.test(o)) return /\bState (?:House|Representative)|\bHouse District|\bAssembly|\bDelegate\b|\bRepresentative\b|\bLegislat/i;
  if (/\bMayor\b/i.test(o)) return /\bMayor\b/i;
  if (/\bSheriff\b/i.test(o)) return /\bSheriff\b/i;
  if (/\bCouncil/i.test(o)) return /\bCouncil/i;
  if (/\bCommission/i.test(o)) return /\bCommission/i;
  if (/\bSchool Board|\bBoard of Education/i.test(o)) return /\bSchool Board|\bBoard of Education|\bSchool District/i;
  if (/\bJudge|\bJustice\b|\bCourt\b/i.test(o)) return /\bJudge|\bJustice\b|\bCourt\b/i;
  return null;
}

/** "Kyle Austin" in running text (first name or a nickname, optional middle name / initial). */
export function fullNameRe(name) {
  const t = nameTokens(name);
  if (t.length < 2) return null;
  const last = t[t.length - 1];
  const keys = directKeys(name);
  const firsts = [...new Set([t[0], ...keys.full.map((f) => f.slice(0, -last.length)), ...keys.nick])].filter((x) => x.length >= 2);
  return new RegExp(`\\b(?:${firsts.map(reEsc).join("|")})\\b[\\s.]+(?:[a-z]\\.?\\s+|[a-z'’-]+\\s+){0,2}?${reEsc(last).replace(/ /g, "[\\s-]+")}\\b`, "i");
}
const namesIn = (re, s) => !!re && re.test(fold(s).toLowerCase().replace(/-/g, " "));

/** Does a page text mention their state (full name, or the code as "XX-12" / ", XX")? */
export function mentionsState(text, code) {
  if (!code) return false;
  const name = STATE_NAME[code];
  const t = fold(text);
  return (name && new RegExp(`\\b${reEsc(name)}\\b`, "i").test(t)) || new RegExp(`\\b${code}-\\d{1,2}\\b|,\\s*${code}\\b|\\b${code}\\s+\\d{5}\\b`).test(t);
}

/**
 * What kind of discovered source is this URL for this identity, before any
 * fetch? → { ok: true, source_class, kind, channel_ref? , video_id? } or { ok: false, why }.
 */
export function classifyCandidate(url, id, { listed = false } = {}) {
  let u;
  try { u = new URL(String(url || "")); } catch { return { ok: false, why: "not a URL" }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, why: "not a web address" };
  const h = hostOf(u.href);
  if (!id?.name || nameTokens(id.name).length < 2) return { ok: false, why: "no usable name" };
  if (YT_HOST.test(h)) {
    const v = YT_VIDEO.exec(u.href)?.[1];
    if (v) return { ok: true, source_class: "youtube_video", kind: "video", video_id: v };
    const ch = YT_CHANNEL_ID.exec(u.href)?.[1];
    if (ch) return { ok: true, source_class: "youtube", kind: "channel", channel_ref: `channel/${ch}` };
    const hd = YT_HANDLE.exec(u.href)?.[1];
    if (hd) return { ok: true, source_class: "youtube", kind: "channel", channel_ref: hd };
    return { ok: false, why: "a YouTube address that is not a channel or video" };
  }
  if (SOCIAL.test(h)) return { ok: false, why: `${h} is a social platform` };
  if (REFERENCE.test(h) || MORE_REFERENCE.test(h)) return { ok: false, why: `${h} is a reference / aggregator site` };
  if (PLATFORM.test(h) || MORE_PLATFORM.test(h)) return { ok: false, why: `${h} is a shared platform` };
  if (GOV_HOST.test(h) || STATE_LEGIS_HOST.test(h) || MEMBER_OFFICE_HOST.test(h) || GENERAL_GOV.test(h) || /\.gov$|\.mil$|\.[a-z]{2}\.us$/.test(h) || /legislature|legis(?:lative)?\b|^leg\./.test(h)) return { ok: false, why: `${h} is a government / legislature host (steps 1–3)` };
  if (GUIDE.test(h) || GUIDE.test(u.pathname)) return { ok: false, why: `${u.href} is an election guide or endorsement list` };
  // Housekeeping pages say nothing about them.
  if (/^\/(?:[a-z-]+\/)?(?:privacy(?:-policy)?|terms(?:-of-(?:use|service))?|contact(?:-us)?|donate|contribute|volunteer|shop|store|cart|checkout|login|sign-?up|subscribe|events?|calendar|press-kit|accessibility|sitemap)(?:\.html?)?\/?$/i.test(u.pathname)) return { ok: false, why: "a housekeeping page (privacy, contact, donate …)" };
  const keys = directKeys(id.name);
  const blog = BLOG_PLATFORM.exec(h);
  const siteName = blog ? blog[1] : h.split(".").slice(0, -1).join(".");
  const site = letters(siteName);
  if (PARTY_HOST.test(site) || CAUCUS_HOST.test(site)) return { ok: false, why: `${h} is a party or caucus site` };
  const has = (s, list) => list.some((k) => s.includes(k));
  const tied = has(site, keys.full) || has(site, keys.nick) || has(site, keys.sur);
  const shaped = has(site, keys.full) || CAMPAIGN_WORD.test(site) || /senator|rep|4|for|elect|vote|team|friends/.test(site)
    || [...keys.sur, ...keys.nick].some((k) => site.startsWith(k) || site.endsWith(k));
  const newsHost = THIRD_PARTY.test(h) || NEWS.test(site) || BROADCAST.test(h) || PUBLIC_MEDIA.test(letters(h.split(".").slice(-2, -1)[0] || ""));
  if (tied && shaped && !newsHost) {
    const conflict = officeConflict(site, id.office);
    if (conflict) return { ok: false, why: `${h} names another office (${conflict})` };
    return { ok: true, source_class: "own_site", kind: /for|elect|vote|campaign|20\d\d|4|team|friends/.test(site) ? "campaign" : "personal" };
  }
  if (newsHost) return { ok: false, why: `${h} is a news outlet, not their own` };
  // A site their own official record lists (their FEC committee filing, their
  // Open States record) is theirs by that record; the page checks still apply.
  if (listed) {
    const conflict = officeConflict(site, id.office);
    if (conflict) return { ok: false, why: `${h} names another office (${conflict})` };
    return { ok: true, source_class: "own_site", kind: /for|elect|vote|campaign|20\d\d|4|team|friends/.test(site) ? "campaign" : "personal", listed: true };
  }
  const pathL = letters(decodeURIComponent(u.pathname));
  if (!u.pathname.replace(/\/+$/, "")) return { ok: false, why: `${h} does not carry their name` };
  if (!has(pathL, keys.sur)) return { ok: false, why: "weak match: neither the host nor the address names them" };
  if (!INTERVIEW.test(u.pathname)) return { ok: false, why: "weak match: names them, but is not their site or an interview / statement" };
  if (MULTI.test(u.pathname) || /-and-/.test(u.pathname)) return { ok: false, why: "a piece about several people" };
  return { ok: true, source_class: "direct_statement", kind: "interview" };
}

const tag = (html, re) => { const m = re.exec(html); return m ? decodeEntities(m[1]).trim() : ""; };
export function decodeEntities(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&#0*39;|&apos;|&#x27;/gi, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&rsquo;|&lsquo;/g, "’").replace(/&rdquo;|&ldquo;/g, '"').replace(/&hellip;/g, "…").replace(/&middot;/g, "·").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
/** The parts of a fetched HTML page the checks read. */
export function pageFacts(html, base) {
  const s = String(html || "");
  const meta = (p) => tag(s, new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, "i")) || tag(s, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, "i"));
  const text = decodeEntities(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").slice(0, 60000);
  const links = [];
  for (const m of s.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try { links.push({ href: new URL(decodeEntities(m[1]), base).href, text: decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() }); } catch { /* bad href */ }
  }
  return {
    title: tag(s, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, " "),
    // The page's own markup says it is a news article / a news outlet.
    og_type: tag(s, /<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']*)["']/i),
    news_markup: /"@type"\s*:\s*"(?:NewsArticle|ReportageNewsArticle|AnalysisNewsArticle|NewsMediaOrganization)"/.test(s) || /<meta[^>]+property=["']og:type["'][^>]+content=["']article["']/i.test(s) && /<meta[^>]+property=["']article:publisher["']/i.test(s),
    og_title: meta("og:title"), site_name: meta("og:site_name"), description: meta("og:description") || meta("description"),
    h1: tag(s, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
    text, links,
    // YouTube pages carry these.
    channel_id: tag(s, /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/) || tag(s, /"externalId":"(UC[A-Za-z0-9_-]{22})"/) || tag(s, /"channelId":"(UC[A-Za-z0-9_-]{22})"/),
    owner_channel: tag(s, /"ownerChannelName":"([^"]+)"/) || tag(s, /<link itemprop="name" content="([^"]+)"/),
    // A watch page's uploader: videoDetails.channelId (then the microformat fallbacks).
    owner_channel_id: tag(s, /"videoDetails":\{[^{}]*?"channelId":"(UC[A-Za-z0-9_-]{22})"/) || tag(s, /"externalChannelId":"(UC[A-Za-z0-9_-]{22})"/) || tag(s, /<meta itemprop="channelId" content="(UC[A-Za-z0-9_-]{22})"/),
  };
}

/** Another politician's full name in this text, from `others` ([{ pid, re }]). */
function otherNamed(text, others = [], pid) {
  const t = fold(text).toLowerCase().replace(/-/g, " ");
  return others.find((o) => o.pid !== pid && o.re.test(t))?.pid || null;
}

/**
 * Accept or refuse a fetched page for this identity. `cand` = classifyCandidate
 * result; `res` = { url, final_url, status, content_type }; `ctx` = { others,
 * via } (`others` = other politicians' full-name patterns; `via` = how the URL
 * was found, e.g. "fec" / "open_states" / "own_site" / "search").
 * → { ok: true, reasons: [...] } or { ok: false, why }.
 */
export function verifyPage(facts, res, id, cand, ctx = {}) {
  if (!res || Number(res.status) !== 200) return { ok: false, why: `HTTP ${res?.status ?? "error"}` };
  if (!/html/i.test(String(res.content_type || ""))) return { ok: false, why: `not an HTML page (${res.content_type || "?"})` };
  const finalCls = classifyCandidate(res.final_url || res.url, id, { listed: !!cand.listed && hostOf(res.final_url || res.url).replace(/^www\./, "") === hostOf(res.url).replace(/^www\./, "") });
  if (!finalCls.ok) return { ok: false, why: `redirects to ${res.final_url}: ${finalCls.why}` };
  if (finalCls.source_class !== cand.source_class) return { ok: false, why: `redirects to ${res.final_url}, a different kind of page` };
  const head = [facts.title, facts.og_title, facts.site_name, facts.h1].filter(Boolean).join(" · ");
  if (PARKED.test(head) || PARKED.test(facts.text.slice(0, 3000)) || facts.text.length < 200) return { ok: false, why: "a parked, empty or unavailable domain" };
  const nre = fullNameRe(id.name);
  const reasons = [];
  if (namesIn(nre, head)) reasons.push(`names ${id.name} in its title / heading ("${head.slice(0, 90)}")`);
  else if (cand.source_class === "own_site" && namesIn(nre, facts.text)) reasons.push(`host carries their name and the page text names ${id.name}`);
  else return { ok: false, why: `the page does not name ${id.name}` };
  const office = officeTerms(id);
  if (!office) return { ok: false, why: `office "${id.office}" cannot be checked` };
  const officeHit = office.exec(fold(`${head} ${facts.description} ${facts.text}`));
  if (!officeHit) return { ok: false, why: `the page does not mention their office (${id.office})` };
  reasons.push(`mentions the office ("${officeHit[0]}${/^\w*/.exec(fold(`${head} ${facts.description} ${facts.text}`).slice(officeHit.index + officeHit[0].length))[0]}")`);
  const conflict = officeConflict(head, id.office);
  if (conflict) return { ok: false, why: `the title names another office (${conflict})` };
  // "… for Attorney General" on a state senator's page: a campaign for another office.
  const runFor = /\bfor\s+((?:Lieutenant |Lt\.? )?Governor|Attorney General|Secretary of State|(?:State )?Treasurer|(?:State )?Auditor|Comptroller|Congress|(?:the )?U\.?\s?S\.?\s+(?:Senate|House)|United States Senate|Mayor|Sheriff|City Council|County Commission(?:er)?|School Board|Judge|State Senate|State House|State Representative|Assembly)\b/i.exec(fold(head));
  if (runFor && !office.test(runFor[1])) return { ok: false, why: `the title campaigns for another office ("for ${runFor[1]}")` };
  if (!mentionsState(`${head} ${facts.description} ${facts.text}`, id.state)) return { ok: false, why: `the page does not mention ${STATE_NAME[id.state] || id.state || "their state"}` };
  reasons.push(`mentions ${STATE_NAME[id.state] || id.state}`);
  if (MULTI.test(head) || GUIDE.test(head)) return { ok: false, why: "reads as a debate, forum or guide about several candidates" };
  const other = otherNamed(head, ctx.others, id.politician_id);
  if (other) return { ok: false, why: `the title also names another politician (${other})` };
  if (cand.source_class === "direct_statement" && !INTERVIEW.test(`${head} ${res.final_url || res.url}`)) return { ok: false, why: "not an interview, podcast or statement" };
  if (cand.source_class === "direct_statement" && facts.news_markup) return { ok: false, why: "the page marks itself as a news article (a news outlet, not their own)" };
  // A third-party piece is a podcast episode, or an organization's own page
  // (.org / .edu, not published as an article). Publications are news outlets.
  if (cand.source_class === "direct_statement") {
    const fh = hostOf(res.final_url || res.url);
    const podcast = /podcast|episode/i.test(`${head} ${res.final_url || res.url}`);
    if (!podcast && !(/\.(?:org|edu)$/.test(fh) && !/^article$/i.test(facts.og_type || ""))) return { ok: false, why: "a publication's article, not a podcast or an organization's own page" };
  }
  // A site only search found must present itself as political — a campaign, or
  // their office in its title — not a business or a namesake's page.
  if (cand.source_class === "own_site" && !cand.listed && ctx.via === "search" && !campaignPage(facts) && !office.test(fold(head))) return { ok: false, why: "a site named for them that is not about their office or campaign (business or namesake?)" };
  return { ok: true, reasons };
}

/**
 * Accept or refuse a YouTube channel page (or a video's uploader) for this
 * identity. `facts` from the channel page. A channel found by search must also
 * mention their office or state; one linked from their verified site or listed
 * in Open States needs only their name.
 */
export function verifyChannel(facts, res, id, ctx = {}) {
  if (!res || Number(res.status) !== 200) return { ok: false, why: `HTTP ${res?.status ?? "error"}` };
  const channelId = facts.channel_id;
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId || "")) return { ok: false, why: "no channel ID on the channel page" };
  const name = facts.og_title || facts.title.replace(/\s*-\s*YouTube\s*$/i, "");
  const nre = fullNameRe(id.name);
  const t = nameTokens(id.name);
  const stateName = STATE_NAME[id.state] || "";
  const campaignName = new RegExp(`\\b${reEsc(t.at(-1) || "")}\\s+(?:for|4)\\s+(?:${[stateName, id.state, "Congress", "Senate", "Governor", "Assembly", "House", "Mayor", "Sheriff"].filter(Boolean).map(reEsc).join("|")})\\b`, "i");
  const full = namesIn(nre, name);
  // "Beck for Missouri": their campaign's name, accepted only when their own
  // verified site or official record links the channel.
  if (!full && !(ctx.via !== "search" && campaignName.test(fold(name)))) return { ok: false, why: `channel "${name}" is not named for ${id.name}` };
  if (NOT_OWN_CHANNEL.test(name) || NEWS.test(letters(name).replace(letters(id.name), ""))) return { ok: false, why: `channel "${name}" reads as a news / media channel` };
  const reasons = [full ? `channel "${name}" is named for ${id.name}` : `channel "${name}" is their campaign's name`, `channel ID ${channelId} read from the channel page`];
  if (ctx.via === "search") {
    const office = officeTerms(id);
    const blob = `${name} ${facts.description}`;
    if (!(office && office.test(fold(blob))) && !mentionsState(blob, id.state)) return { ok: false, why: `channel "${name}" does not mention their office or state` };
    reasons.push("its title / description mentions their office or state");
  } else reasons.push(`linked from ${ctx.via === "open_states" ? "their Open States record" : "their verified own site"}`);
  const other = otherNamed(name, ctx.others, id.politician_id);
  if (other) return { ok: false, why: `channel also names another politician (${other})` };
  return { ok: true, channel_id: channelId, reasons };
}

/** Does the page present itself as a campaign ("… for Congress", "Elect …", "Donate")? */
export function campaignPage(facts) {
  const head = [facts.title, facts.og_title, facts.site_name, facts.h1].filter(Boolean).join(" ");
  return /\bfor (?:Congress|Senate|Governor|Mayor|Sheriff|(?:the )?(?:State )?(?:House|Assembly|Senate)|[A-Z][a-z]+(?: [A-Z][a-z]+)?)\b|\b(?:Elect|Re-?elect|Vote|Campaign)\b|\b20\d\d\b/.test(head)
    || /\bpaid for by\b/i.test(facts.text);
}

/** Same-host issue / priorities pages linked from a verified own site. */
export function issueLinks(facts, homeUrl) {
  const h = hostOf(homeUrl);
  const out = [];
  for (const l of facts.links) {
    if (hostOf(l.href) !== h) continue;
    let p = "";
    try { p = new URL(l.href).pathname; } catch { continue; }
    if (!/^\/(?:[a-z0-9-]+\/)?(?:issues?|priorities|platform|policy|policies|positions|plans?|agenda|vision|where-i-stand|stances?|on-the-issues|my-platform)\/?$/i.test(p)) continue;
    const u = new URL(l.href); u.hash = ""; u.search = "";
    if (!out.includes(u.href)) out.push(u.href);
  }
  return out.slice(0, 2);
}
/** YouTube channel / handle links on a verified own site. */
export function youtubeLinks(facts) {
  const out = [];
  for (const l of facts.links) if (YT_CHANNEL_ID.test(l.href) || YT_HANDLE.test(l.href)) { const u = l.href.replace(/[?#].*$/, ""); if (!out.includes(u)) out.push(u); }
  return out;
}

/** "AUSTIN, KYLE R. MR." (FEC) → "Kyle R. Austin". */
export function fecName(n) {
  const [last, rest = ""] = String(n || "").split(",").map((x) => x.trim());
  const first = rest.replace(/\b(?:MR|MRS|MS|DR|JR|SR|II|III|IV|HON|REV)\.?\b/gi, " ").replace(/\s+/g, " ").trim();
  const cap = (x) => x.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return cap(`${first} ${last}`.trim());
}
/** A committee's `website` field as an address ("KYLEAUSTINMT.COM" → "https://kyleaustinmt.com/"), or null. */
export function websiteUrl(w) {
  const s = String(w || "").trim().toLowerCase();
  if (!s || /\s/.test(s) || !/^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/.test(s)) return null;
  try { const u = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`); return u.href; } catch { return null; }
}

/** Minimal reader for an Open States person file (YAML): name, roles, links, ids. */
export function readOpenStatesPerson(text) {
  const out = { links: [], ids: {}, roles: [], other_names: [] };
  let sec = null, cur = null;
  const unq = (v) => {
    v = v.trim();
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\x([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16)))
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, x) => String.fromCharCode(parseInt(x, 16))).replace(/\\(["\\])/g, "$1");
    return v;
  };
  for (const line of String(text || "").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const top = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (top) { sec = top[1]; cur = null; if (top[2]) out[sec] = unq(top[2]); continue; }
    const item = /^(\s*)- ([a-z_]+):\s*(.*)$/.exec(line);
    if (item) {
      cur = { [item[2]]: unq(item[3]) };
      if (sec === "links") out.links.push(cur); else if (sec === "roles") out.roles.push(cur); else if (sec === "other_names") out.other_names.push(cur);
      continue;
    }
    const kv = /^\s+([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) { if (sec === "ids") out.ids[kv[1]] = unq(kv[2]); else if (cur) cur[kv[1]] = unq(kv[2]); }
  }
  return out;
}
