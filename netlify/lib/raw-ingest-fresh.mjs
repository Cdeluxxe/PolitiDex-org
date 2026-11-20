// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-fresh.mjs — fresh pages + topic targeting for the raw-ingest cron
// ─────────────────────────────────────────────────────────────────────────────
// The rotation had settled into re-reading the same known homepages and press
// indexes, each filed under a default topic (mostly cost_living), so runs ended
// with "0 new items". This module adds three things, all opt-in through the
// cron's `fresh` dependency (the scheduled entry point turns it on):
//
// 1. LINK HARVEST (expanded source types). Every index-like page the run
//    fetches (a newsroom, an issues index or a homepage, during the discovery
//    check or the pull) is read for links to the politician's own
//      · press releases        (…/press-releases/<slug>, …/news/<slug>, DocumentID=…)
//      · statements / remarks  (…/statement-…, …/remarks-…, op-eds, testimony)
//      · issue / priority pages (…/issues/<slug>, …/priorities/<slug>, …/platform/…)
//    Only same-host links count. Nothing is built from a pattern or guessed:
//    each URL was linked from a page the politician's roster row already
//    points to. Hosts shared by two roster politicians (whitehouse.gov) and
//    state-legislature / Congress.gov pages (which list other members) are not
//    harvested, so a link always belongs to the page's politician. Ceremonial
//    items (congratulates, honors, grants …) rank last; statements and issue
//    pages rank first because they are the likeliest to carry clear position
//    language.
//
// 2. FRONTIER + SEEN LEDGER (discovery adds URLs). Harvested links wait in a
//    per-politician frontier (FRONTIER_KEY in the rotation store); every URL the
//    run fetches goes into the seen ledger (SEEN_KEY). When the planner picks a
//    politician, up to FRESH_PER_POLITICIAN unfetched frontier pages join the
//    run's pull list. The caps do not change: a fresh page takes a free slot
//    under the per-politician and per-run caps, or displaces a page the ledger
//    already shows as fetched (never the politician's index pages, which feed
//    the harvest, and never the ground-truth page).
//
// 3. TOPIC TARGETING. A page filed under a default topic — a homepage, index,
//    newsroom, official pattern, discovery pattern or fresh page — is scored
//    under the topic the page itself signals (title / h1 ×4, URL slug ×3, body
//    sentences ×1, cost_living's very broad vocabulary counted at half weight),
//    with a bonus for topics the politician has no or thin Locker coverage on.
//    It moves off its filed topic only when another topic clearly wins. Pages
//    cited for a specific topic (issue pages, extra sources) keep their topic.
//    Only issue keys the scorer has rules for are ever chosen, so an unknown
//    key can never enter the Locker this way. Cross-topic scoring is unchanged.
//
// 4. HEADLINE PASS + FRONTIER FILTER. On harvested pages, before the full-page signal, a light
//    pass on the title, first <h1> and URL slug picks the topic when they
//    clearly name one issue key (headlineTopic). Harvested links that are
//    obviously low-signal (congratulations, awards / honors, "meets with",
//    pure grant announcements, ceremonial events) are dropped before they
//    enter the frontier (lowSignalReason). Scoring rules and caps unchanged.
//
// Pure and dependency-injected; the cron owns the stores.

import { createHash } from "node:crypto";
import { TOPIC_RULES, SCORED_TOPICS, NO_POLE_TOPICS, hasRulesFor, extractSentences } from "./stance-score-core.mjs";
import { preferWordGaps } from "./raw-ingest-word-gap.mjs";

export const FRONTIER_KEY = "frontier.json";
export const SEEN_KEY = "seen.json";
export const FRESH_VERSION = "fresh-v1";
// Unfetched pages added for one politician in one run (inside the existing caps).
export const FRESH_PER_POLITICIAN = 2;
// Links kept from one harvested page, and per politician in the frontier.
export const HARVEST_PER_PAGE = 12;
export const MAX_FRONTIER_PER_POLITICIAN = 30;
// Seen-ledger size (most recent kept).
export const MAX_SEEN = 6000;
// Topic targeting: how far another topic must lead the filed one to move a page.
export const TARGET_MIN_SIGNAL = 3;
export const TARGET_BODY_SENTENCES = 600;
export const TARGET_BODY_CAP = 10;
export const BROAD_TOPIC_WEIGHT = { cost_living: 0.5 };
// Coverage bonus: no Locker coverage on the pair / thin coverage (below the baseline).
export const EMPTY_BONUS = 1.5;
export const THIN_BONUS = 0.75;

export const FRESH_KINDS = {
  fresh_statement: "statement, remarks, op-ed or testimony linked from the politician's own page",
  fresh_press_release: "press release linked from the politician's own newsroom / homepage",
  fresh_issue_page: "campaign or official issue / priority page linked from the politician's own site",
};

export const normUrl = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

// ── Which pages are harvested / retargeted ──────────────────────────────────
const UNTARGETED_ID = /^(?:known-homepage|official-|discovered-|fresh-)/;
const UNTARGETED_TYPE = /\b(?:homepage|home page|index|newsroom|press releases page)\b/i;
const NO_HARVEST_TYPE = /\b(?:legislature|congress\.gov|youtube|video|channel)\b/i;
const NO_HARVEST_HOST = /(?:^|\.)congress\.gov$|(?:^|\.)capitol\.texas\.gov$|^house\.texas\.gov$|^senate\.texas\.gov$|(?:^|\.)le\.utah\.gov$/i;

/** Was this page filed under a default topic (so its own signals may pick a better one)? */
export function isUntargeted(src) {
  return UNTARGETED_ID.test(String(src?.source_id || "")) || UNTARGETED_TYPE.test(String(src?.source_type || ""));
}

/** Hosts that more than one roster politician's pages live on (their links cannot be told apart). */
export function sharedHosts(roster = []) {
  const by = new Map();
  for (const r of roster) {
    for (const s of [...(r.sources || []), ...(r.official ? [r.official] : [])]) {
      const h = hostOf(s?.url);
      if (!h) continue;
      (by.get(h) || by.set(h, new Set()).get(h)).add(r.politician_id);
    }
  }
  return new Set([...by].filter(([, p]) => p.size > 1).map(([h]) => h));
}

/** May links be harvested from this page? */
export function isHarvestable(src, shared = new Set()) {
  if (!src?.url || !src.politician_id) return false;
  if (src.source_class === "youtube" || src.source_class === "congress_gov" || src.source_class === "state_legislature") return false;
  if (src.official_kind === "state_legislature") return false;
  if (NO_HARVEST_TYPE.test(String(src.source_type || ""))) return false;
  const h = hostOf(src.final_url || src.url);
  return Boolean(h) && !NO_HARVEST_HOST.test(h) && !shared.has(h);
}

// ── Link classification ─────────────────────────────────────────────────────
const ASSET = /\.(?:pdf|jpe?g|png|gif|svg|webp|mp4|mp3|mov|zip|docx?|xlsx?|pptx?|css|js|xml|ics|json|txt)$/i;
const EXCLUDE_SEG = /^(?:tags?|category|categories|author|authors|search|feed|rss|contact|contact-us|donate|volunteer|events?|calendar|photos?|gallery|galleries|videos?|subscribe|newsletter|privacy|privacy-policy|accessibility|sitemap|login|log-in|signup|sign-up|shop|store|careers|jobs|internships?|services|casework|tours?|flags?|grants?|forms?|help|faq|about|biography|bio|offices?|wp-admin|wp-content|wp-json|cdn-cgi|page|archive|archives|espanol|es|map|maps|share|print|email)$/i;
const EXCLUDE_QUERY = /(?:^|[?&])(?:page|sort|filter|start|offset|year|month|tag|cat|category|s|q|search)=/i;
const STATEMENT_RE = /(?:^|[\/_-])(?:statements?|remarks|speech(?:es)?|op-?eds?|opinion|column|columns|testimony|floor-?speech|letters?)(?:[\/_-]|$)/i;
const PRESS_SEG = /\/(?:press-releases?|press|news|newsroom|news-releases?|media|media-center|releases?|blog|updates?)\//i;
const DOCUMENT_ID = /[?&](?:documentid|id|newsid|releaseid)=\d+/i;
const ISSUE_SEG = /\/(?:issues?|priorit(?:y|ies)|platform|agenda|polic(?:y|ies)|plans?|vision|key-issues|legislation|on-the-issues)\/[^/]+/i;
const POLICY_WORDS = /\b(?:introduc\w*|bill|act|legislation|vote[sd]?|oppos\w*|support\w*|calls?|urg\w*|demand\w*|fight\w*|protect\w*|ban\w*|cut\w*|lower\w*|plan|statement|condemn\w*|blast\w*|slam\w*|reject\w*|push\w*|block\w*|repeal\w*|expand\w*|reform\w*|secure\w*|defend\w*|stop\w*|end\w*|rais\w*|reduc\w*|cap)\b/i;
const CEREMONIAL = /\b(?:honou?r\w*|congratulat\w*|recogni[sz]\w*|celebrat\w*|welcom\w*|visit\w*|tours?|awards?|grants?|ribbon|meets?|condolence\w*|mourn\w*|birthday|anniversary|holiday|thanksgiving|christmas|memorial|tribute|announces? (?:funding|winners?)|art competition|academy nominat\w*|office hours|town hall schedule)\b/i;

const slugWords = (u) => {
  try { const x = new URL(u); return decodeURIComponent(x.pathname).replace(/[\/_.-]+/g, " ").trim(); }
  catch { return ""; }
};
const lastSegment = (u) => { try { return new URL(u).pathname.replace(/\/+$/, "").split("/").pop() || ""; } catch { return ""; } };

/**
 * One link → { kind, source_type, base } or null when it is not a content page
 * worth pulling. `official` = the politician's page is an official (.gov or
 * "official") page; otherwise campaign.
 */
export function classifyLink(url, text, { official = false } = {}) {
  let x;
  try { x = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(x.protocol)) return null;
  const path = x.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return null;
  if (ASSET.test(path)) return null;
  if (path.split("/").filter(Boolean).some((seg) => EXCLUDE_SEG.test(seg))) return null;
  if (EXCLUDE_QUERY.test(x.search)) return null;
  const last = lastSegment(url);
  const words = last.split(/[-_]+/).filter(Boolean).length;
  const full = path + x.search;
  const side = official ? "official" : "campaign";
  // A content page has a slug of a few words or a document id.
  const hasSlug = words >= 3 || DOCUMENT_ID.test(x.search);
  if (STATEMENT_RE.test(path) && hasSlug) return { kind: "fresh_statement", source_type: `${side} statement`, base: 5 };
  if ((PRESS_SEG.test(full + "/") || DOCUMENT_ID.test(x.search)) && hasSlug) return { kind: "fresh_press_release", source_type: `${side} press release`, base: 3 };
  if (ISSUE_SEG.test(path) && last && !/^(?:issues?|priorit(?:y|ies)|platform|agenda|polic(?:y|ies)|plans?)$/i.test(last)) {
    return { kind: "fresh_issue_page", source_type: /priorit/i.test(path) ? `${side} priority page` : `${side} issue page`, base: 4 };
  }
  return null;
}

/** Topics a short piece of text (link text + slug, or a title) names, by hit count. */
export function topicHits(text, topics = SCORED_TOPICS) {
  const s = String(text || "");
  const out = {};
  if (!s.trim()) return out;
  for (const t of topics) {
    if (!hasRulesFor(t) || NO_POLE_TOPICS.has(t)) continue;
    const re = TOPIC_RULES[t].mention;
    if (!re) continue;
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const n = (s.match(g) || []).length;
    if (n) out[t] = n;
  }
  return out;
}

/** Coverage bonus for a politician + topic from the Locker baseline counts. */
export function coverageBonus(counts, pid, topic, { baseline = 3, weakPerStrong = 3 } = {}) {
  const c = counts?.[`${pid}|${topic}`];
  const w = (Number(c?.strong) || 0) * weakPerStrong + (Number(c?.weak) || 0);
  if (!w) return EMPTY_BONUS;
  return w < baseline ? THIN_BONUS : 0;
}

/** Best topic among hit counts, coverage-weighted; null when nothing hits. */
function bestTopic(scores, { counts, pid, fallback, order = SCORED_TOPICS }) {
  const idx = new Map(order.map((t, i) => [t, i]));
  const ranked = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .map(([t, v]) => ({ t, v, total: v + coverageBonus(counts, pid, t) }))
    .sort((a, b) => (b.total - a.total) || (a.t === fallback ? -1 : b.t === fallback ? 1 : 0) || ((idx.get(a.t) ?? 1e9) - (idx.get(b.t) ?? 1e9)));
  return ranked[0] || null;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…" };
const decode = (s) => String(s || "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const stripTags = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Every <a href> on a page, resolved against `base`, in page order. */
export function extractLinks(body, base) {
  const out = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  const html = String(body || "").slice(0, 600_000);
  while ((m = re.exec(html))) {
    const href = decode((m[1] ?? m[2] ?? m[3] ?? "").trim());
    if (!href || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, base).toString(); } catch { continue; }
    out.push({ url: abs, text: stripTags(m[4]).slice(0, 200) });
  }
  return out;
}

const officialSide = (src) => /\bofficial\b/i.test(String(src?.source_type || "")) || /\.(?:gov|mil)$/i.test(hostOf(src?.final_url || src?.url));

// ── Frontier quality filter ─────────────────────────────────────────────────
// Before a harvested link enters the frontier, obvious low-signal pages are
// dropped outright (they would only take a fetch slot to land a mention at
// best). Judged on the link text + URL slug only; first matching reason wins.
// A link that also names a bill, a vote or a policy fight is kept (a grant
// announcement inside a bill statement is not "pure"). Ranking, scoring and
// the frontier / run caps are unchanged.
const LOW_SIGNAL_KEEP = /\b(?:bill|act|legislation|introduc\w*|vot(?:e|es|ed|ing)|oppos\w*|statement|testimony|op-?ed|condemn\w*|repeal\w*|veto\w*|amendment|resolution|calls? (?:for|on)|urg\w*|demand\w*|fight\w*|slam\w*|blast\w*|reject\w*|block\w*)\b/i;
export const LOW_SIGNAL_RULES = [
  { reason: "congratulations", re: /\bcongratulat\w*|\bcongrats\b/i },
  { reason: "award / honor", re: /\b(?:awards?|awarded|honou?r(?:s|ed|ing|ee|ees)?|recogni[sz](?:es|ed|ing)|inducted|hall of fame|medal|commend\w*)\b/i, keepIfPolicy: true },
  { reason: "\"meets with\"", re: /\b(?:meets?|met) with\b|\bmeeting with\b/i },
  { reason: "grant / funding announcement", re: /\bgrants?\b|\b(?:announc\w*|secur\w*|deliver\w*|bring\w*|award\w*|receiv\w*)\b[^.]{0,40}?\b(?:funding|federal dollars|million|billion)\b|\bcommunity project funding\b|\bearmarks?\b/i, keepIfPolicy: true },
  { reason: "ceremonial event", re: /\b(?:condolence\w*|mourn\w*|in memoriam|rest in peace|lying in state)\b/i },
  { reason: "ceremonial event", re: /\b(?:ribbon[- ]cutting|groundbreaking|ground[- ]breaking|proclamation|memorial day|veterans day|birthday|anniversary|holiday|thanksgiving|christmas|hanukkah|easter|tribute|celebrat\w*|art competition|academy nominat\w*|service academy|office hours|mobile office|town hall schedule|tours?|visits?|commencement)\b/i, keepIfPolicy: true },
];

/** Low-signal reason for a harvested link (link text + slug), or null to keep it. */
export function lowSignalReason(url, text = "") {
  const words = `${text || ""} ${slugWords(url)}`;
  const policy = LOW_SIGNAL_KEEP.test(words);
  for (const r of LOW_SIGNAL_RULES) {
    if (!r.re.test(words)) continue;
    if (r.keepIfPolicy && policy) continue;
    return r.reason;
  }
  return null;
}

/** "reason ×n; …" summary of dropped links ({ url, reason }[]). */
export function droppedSummary(dropped = []) {
  const by = {};
  for (const d of dropped) by[d.reason] = (by[d.reason] || 0) + 1;
  return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ×${n}`).join("; ");
}

/**
 * Candidate content pages linked from one fetched page of `src`'s politician.
 * Same host only; known (roster) URLs, seen URLs and the page itself are left
 * out. Ranked by how likely the page is to carry position language (kind,
 * policy words, ceremonial penalty, thin-topic bonus), then page order.
 * Returns at most HARVEST_PER_PAGE sources ready for the pull list. Links the
 * frontier quality filter rejects are left out; pass `dropped` (an array) to
 * collect them as { url, reason }.
 */
export function harvestLinks(src, body, { known = new Set(), seen = new Set(), counts = {}, now = new Date(), limit = HARVEST_PER_PAGE, dropped = null } = {}) {
  const pageUrl = src.final_url || src.url;
  const host = hostOf(pageUrl);
  if (!host) return [];
  const self = normUrl(pageUrl), selfReq = normUrl(src.url);
  const official = officialSide(src);
  const byUrl = new Map();
  extractLinks(body, pageUrl).forEach((l, i) => {
    if (hostOf(l.url) !== host) return;
    const n = normUrl(l.url);
    if (n === self || n === selfReq || known.has(n) || seen.has(n) || byUrl.has(n)) return;
    // Parent pages of the page itself (its section index) are not content.
    if (self.startsWith(n + "/")) return;
    const c = classifyLink(l.url, l.text, { official });
    if (!c) return;
    // Frontier quality filter: obvious low-signal pages never enter the frontier.
    const low = lowSignalReason(l.url, l.text);
    if (low) { if (dropped && !dropped.some((d) => normUrl(d.url) === n)) dropped.push({ url: l.url, reason: low }); return; }
    const words = `${l.text} ${slugWords(l.url)}`;
    const hits = topicHits(words);
    const top = bestTopic(hits, { counts, pid: src.politician_id, fallback: src.topic });
    let score = c.base;
    if (POLICY_WORDS.test(words)) score += 2;
    if (CEREMONIAL.test(words)) score -= 4;
    if (top) score += coverageBonus(counts, src.politician_id, top.t);
    let clean;
    try { const x = new URL(l.url); x.hash = ""; clean = x.toString(); } catch { return; }
    byUrl.set(n, {
      politician_id: src.politician_id,
      topic: top && hasRulesFor(top.t) ? top.t : src.topic,
      source_type: c.source_type,
      source_class: c.kind,
      source_id: `fresh-${createHash("sha1").update(n).digest("hex").slice(0, 12)}`,
      url: clean,
      found_from: src.url,
      found_at: now.toISOString(),
      rank: score,
      order: i,
    });
  });
  return [...byUrl.values()]
    .filter((x) => x.rank > 0)
    .sort((a, b) => (b.rank - a.rank) || (a.order - b.order))
    .slice(0, limit)
    .map(({ order, ...x }) => x);
}

// ── Persisted state ─────────────────────────────────────────────────────────
/** { frontier: { pid: [source] }, seen: { normUrl: iso } } from whatever was stored. */
export function normaliseFreshState(frontierDoc, seenDoc) {
  const parse = (d) => { if (typeof d === "string") { try { return JSON.parse(d); } catch { return null; } } return d; };
  const f = parse(frontierDoc), s = parse(seenDoc);
  const frontier = {};
  for (const [pid, list] of Object.entries((f && f.items) || {})) {
    if (!Array.isArray(list)) continue;
    const ok = list.filter((x) => x && x.url && x.politician_id === pid && hasRulesFor(x.topic));
    if (ok.length) frontier[pid] = ok;
  }
  const seen = {};
  for (const [u, at] of Object.entries((s && s.urls) || {})) if (u) seen[u] = String(at || "");
  return { frontier, seen };
}

export async function readFreshState(store, log = console.log) {
  if (!store) return normaliseFreshState(null, null);
  try {
    const [f, s] = await Promise.all([
      store.get(FRONTIER_KEY, { type: "json" }).catch(() => null),
      store.get(SEEN_KEY, { type: "json" }).catch(() => null),
    ]);
    return normaliseFreshState(f, s);
  } catch (e) {
    log(`discovery: fresh-page state unreadable — starting empty (${e?.message || e})`);
    return normaliseFreshState(null, null);
  }
}

export async function saveFreshState(store, state, { now = new Date(), log = console.log } = {}) {
  if (!store) return false;
  try {
    const seenEntries = Object.entries(state.seen || {}).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, MAX_SEEN);
    await store.setJSON(SEEN_KEY, { version: FRESH_VERSION, updated_at: now.toISOString(), urls: Object.fromEntries(seenEntries) });
    await store.setJSON(FRONTIER_KEY, { version: FRESH_VERSION, updated_at: now.toISOString(), items: state.frontier || {} });
    return true;
  } catch (e) {
    log(`discovery: fresh-page state not saved — ${e?.message || e}`);
    return false;
  }
}

/** Add harvested candidates to a politician's frontier (deduped, best first, capped). */
export function mergeFrontier(state, candidates) {
  let added = 0;
  for (const c of candidates || []) {
    const n = normUrl(c.url);
    if (state.seen?.[n]) continue;
    const list = (state.frontier[c.politician_id] ||= []);
    if (list.some((x) => normUrl(x.url) === n)) continue;
    list.push(c);
    added++;
  }
  for (const pid of Object.keys(state.frontier)) {
    state.frontier[pid] = state.frontier[pid]
      .filter((x) => !state.seen?.[normUrl(x.url)])
      .sort((a, b) => (Number(b.rank) || 0) - (Number(a.rank) || 0) || String(b.found_at || "").localeCompare(String(a.found_at || "")))
      .slice(0, MAX_FRONTIER_PER_POLITICIAN);
    if (!state.frontier[pid].length) delete state.frontier[pid];
  }
  return added;
}

/** Mark fetched URLs as seen and drop them from the frontier. */
export function markSeen(state, urls, at) {
  for (const u of urls) if (u) state.seen[normUrl(u)] = at;
  for (const pid of Object.keys(state.frontier)) {
    state.frontier[pid] = state.frontier[pid].filter((x) => !state.seen[normUrl(x.url)]);
    if (!state.frontier[pid].length) delete state.frontier[pid];
  }
}

const isIndexLike = (s) => isUntargeted(s) && !String(s.source_id || "").startsWith("fresh-");

// Spare run slots: when the planned politicians leave the run under its source
// cap, up to FRESH_SPARE_PER_RUN frontier pages of OTHER politicians (best
// ranked first, FRESH_PER_POLITICIAN each) take those slots. The rotation is
// untouched (they are not "planned"); the run and per-politician caps hold.
export const FRESH_SPARE_PER_RUN = 12;
// A fresh page that fails at host level this many times leaves the frontier.
export const FRESH_MAX_ATTEMPTS = 2;
// Per-candidate skip lines logged per run (the summary line counts them all).
export const FRESH_SKIP_LOG_LIMIT = 20;

/**
 * Put up to FRESH_PER_POLITICIAN unfetched frontier pages per planned
 * politician into the pull list, within `max` (run) and `perPolitician`.
 * When a politician is at their cap, a page the seen ledger already holds is
 * displaced (never an index-like page, never `protect`ed URLs). Then, with
 * `spare` > 0, frontier pages of politicians outside the plan fill free run
 * slots. Candidates on `skipHosts` (failing this cycle) are passed over.
 * Returns { sources, added, displaced, considered, skipped, reasons }.
 * Logs one "discovery: NEW …" line per fresh page, one "discovery: DISPLACED …"
 * per swap, one "discovery: frontier SKIP …" per passed-over candidate (up to
 * FRESH_SKIP_LOG_LIMIT) and a "discovery: frontier —" summary line.
 */
export function addFreshSources(sources, state, { politicians, max, perPolitician, per = FRESH_PER_POLITICIAN, protect = new Set(), skipHosts = new Set(), spare = 0, log = console.log, wordGaps = null } = {}) {
  const out = [...sources];
  const known = new Set(out.map((s) => normUrl(s.url)));
  const added = [], displaced = [], skipped = [];
  const reasons = {};
  let considered = 0, beyondLimit = 0, spareAdded = 0;
  const skip = (pid, cand, why) => { reasons[why] = (reasons[why] || 0) + 1; skipped.push({ politician_id: pid, url: cand.url, reason: why }); };
  const planned = politicians || [...new Set(out.map((s) => s.politician_id))];

  const take = (pid, { spareSlot }) => {
    // Word vs Action gaps first (by harvested topic); stable, so frontier rank breaks ties.
    const list = preferWordGaps(state.frontier[pid] || [], wordGaps);
    let n = 0, i = 0;
    for (; i < list.length; i++) {
      const cand = list[i];
      if (n >= per || (spareSlot && spareAdded >= spare)) break;
      considered++;
      const u = normUrl(cand.url);
      if (known.has(u)) { skip(pid, cand, "already in this run's pull list"); continue; }
      if (state.seen[u]) { skip(pid, cand, "already fetched (seen ledger)"); continue; }
      const h = hostOf(cand.url);
      if (skipHosts.has(h)) { skip(pid, cand, "host failing this cycle (skipped)"); continue; }
      const mine = out.filter((s) => s.politician_id === pid);
      let room = mine.length < perPolitician && out.length < max;
      if (!room) {
        if (spareSlot) { skip(pid, cand, out.length >= max ? `run cap (${max}) reached` : `politician cap (${perPolitician}) reached`); i++; break; }
        // Swap out a page already fetched before (a pure re-read) for the fresh one.
        const victim = [...mine].reverse().find((s) => state.seen[normUrl(s.url)] && !isIndexLike(s) && !s.official_kind && !protect.has(normUrl(s.url)) && !String(s.source_id || "").startsWith("fresh-"));
        if (!victim) {
          skip(pid, cand, mine.length >= perPolitician
            ? `politician cap (${perPolitician}) reached and no already-read page to displace (the rest are index, official or unread pages)`
            : `run cap (${max}) reached and no already-read page of this politician to displace`);
          i++;
          break;
        }
        out.splice(out.indexOf(victim), 1);
        displaced.push(victim);
        log(`discovery: DISPLACED ${pid}|${victim.topic} ${victim.url} — already read; slot given to an unfetched page`);
        room = true;
      }
      const { rank, found_from, found_at, attempts, ...src } = cand;
      out.push(src);
      known.add(u);
      added.push({ ...src, found_from, ...(spareSlot ? { spare_slot: true } : {}) });
      n++;
      if (spareSlot) spareAdded++;
      log(`discovery: NEW ${pid}|${src.topic} ${src.url} (${src.source_type} · fresh, linked from ${found_from}${spareSlot ? " · spare run slot" : ""}) — added to this run's pull list`);
    }
    beyondLimit += Math.max(0, list.length - i);
  };

  for (const pid of planned) take(pid, { spareSlot: false });
  const plannedSet = new Set(planned);
  if (spare > 0) {
    const others = Object.keys(state.frontier)
      .filter((pid) => !plannedSet.has(pid) && state.frontier[pid]?.length)
      .sort((a, b) => (Number(state.frontier[b][0]?.rank) || 0) - (Number(state.frontier[a][0]?.rank) || 0) || a.localeCompare(b));
    for (const pid of others) {
      if (spareAdded >= spare || out.length >= max) break;
      take(pid, { spareSlot: true });
    }
  }

  const withFrontier = planned.filter((pid) => state.frontier[pid]?.length).length;
  const total = Object.values(state.frontier).reduce((n, l) => n + l.length, 0);
  const pols = Object.keys(state.frontier).length;
  skipped.slice(0, FRESH_SKIP_LOG_LIMIT).forEach((x) => log(`discovery: frontier SKIP ${x.politician_id} ${x.url} — ${x.reason}`));
  if (skipped.length > FRESH_SKIP_LOG_LIMIT) log(`discovery: frontier SKIP … +${skipped.length - FRESH_SKIP_LOG_LIMIT} more (counted below)`);
  const why = Object.entries(reasons).map(([r, k]) => `${r} ×${k}`);
  log(`discovery: frontier — ${planned.length} planned politician(s), ${withFrontier} with frontier pages (frontier holds ${total} across ${pols} politician(s)) · considered ${considered} candidate(s): ${added.length} added (${added.length - spareAdded} for planned politicians, ${spareAdded} in spare run slots), ${displaced.length} re-read(s) displaced · skipped: ${why.length ? why.join("; ") : "none"}${beyondLimit ? ` · ${beyondLimit} left queued (past the ${per}-per-politician limit or the cap)` : ""}${!withFrontier && !spareAdded ? " · none of this run's politicians has frontier pages yet" : ""}`);
  return { sources: out, added, displaced, considered, skipped, reasons, spare_added: spareAdded };
}

/**
 * After the pull: a fresh page that failed for page-level reasons (404, empty
 * body, other 4xx) is retired to the seen ledger; one that failed at host level
 * is retried until FRESH_MAX_ATTEMPTS, then retired. Pages left out because
 * their host was down (host_skipped) or during a run-side outage stay queued.
 * Returns the URLs retired.
 */
export function noteFreshFailures(state, results, { at = new Date().toISOString(), outage = false, hostLevel = new Set() } = {}) {
  const retired = [];
  if (outage) return retired;
  for (const r of results || []) {
    if (r.ok || r.host_skipped || !r.url || r.error_class === "local_fd") continue;
    const n = normUrl(r.url);
    for (const list of Object.values(state.frontier)) {
      const cand = list.find((x) => normUrl(x.url) === n);
      if (!cand) continue;
      cand.attempts = (Number(cand.attempts) || 0) + 1;
      if (!hostLevel.has(r.error_class) || cand.attempts >= FRESH_MAX_ATTEMPTS) { state.seen[n] = at; retired.push(r.url); }
    }
  }
  if (retired.length) markSeen(state, [], at);
  return retired;
}

// ── Topic targeting ─────────────────────────────────────────────────────────
/** Title + h1 text of a page. */
export function headingText(body) {
  const html = String(body || "").slice(0, 400_000);
  const parts = [];
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (t) parts.push(stripTags(t[1]));
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m, k = 0;
  while ((m = re.exec(html)) && k++ < 3) parts.push(stripTags(m[1]));
  return parts.join(" · ");
}

/** Per-topic signal for one page: heading ×4, URL slug ×3, body sentences ×1 (broad topics discounted). */
export function topicSignals(rec, { topics = SCORED_TOPICS } = {}) {
  const head = topicHits(headingText(rec?.body), topics);
  const slug = topicHits(slugWords(rec?.final_url || rec?.url), topics);
  const body = {};
  const sentences = extractSentences(rec?.body).slice(0, TARGET_BODY_SENTENCES);
  for (const t of topics) {
    if (!hasRulesFor(t) || NO_POLE_TOPICS.has(t)) continue;
    const re = TOPIC_RULES[t].mention;
    if (!re) continue;
    let n = 0;
    for (const s of sentences) { if (re.test(s) && ++n >= TARGET_BODY_CAP) break; }
    if (n) body[t] = n;
  }
  const out = {};
  for (const t of new Set([...Object.keys(head), ...Object.keys(slug), ...Object.keys(body)])) {
    const w = BROAD_TOPIC_WEIGHT[t] ?? 1;
    out[t] = Math.round(((head[t] ? 4 * Math.min(head[t], 2) : 0) + (slug[t] ? 3 : 0) + (body[t] || 0)) * w * 100) / 100;
  }
  return out;
}

// Topics never chosen by the headline pass: the broad defaults a page falls
// back to (their vocabulary shows up in almost any headline).
export const HEADLINE_BROAD = new Set(Object.keys(BROAD_TOPIC_WEIGHT));
// How many of the three headline fields (title, first h1, slug) must name the
// topic, and by how many fields it must lead the runner-up.
export const HEADLINE_MIN_FIELDS = 2;
export const HEADLINE_MIN_LEAD = 1;

/** Page title, first <h1> and URL slug words of a fetched page. */
export function headlineFields(rec) {
  const html = String(rec?.body || "").slice(0, 400_000);
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const h = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return { title: t ? stripTags(t[1]) : "", h1: h ? stripTags(h[1]) : "", slug: slugWords(rec?.final_url || rec?.url) };
}

/**
 * Light topic pass on the title, first heading and URL slug (no body). Returns
 * { topic, fields } when they clearly point to one existing issue key — named
 * in at least HEADLINE_MIN_FIELDS of the three, leading every other topic by
 * HEADLINE_MIN_LEAD fields (keys named in exactly the same fields are
 * siblings, not rivals), not a broad default and with scorer rules — or null
 * (the full-body targeting then decides).
 */
export function headlineTopic(rec, { topics = SCORED_TOPICS } = {}) {
  const f = headlineFields(rec);
  const where = {}, hits = {};
  for (const [name, text] of Object.entries(f)) {
    for (const [t, n] of Object.entries(topicHits(text, topics))) { (where[t] ||= []).push(name); hits[t] = (hits[t] || 0) + n; }
  }
  const idx = new Map(topics.map((t, i) => [t, i]));
  // Keys named in exactly the same fields are sibling keys reading the same
  // words (border_security / immig_balance): more hits, then register order.
  const ranked = Object.keys(where)
    .filter((t) => !HEADLINE_BROAD.has(t) && hasRulesFor(t) && !NO_POLE_TOPICS.has(t))
    .sort((a, b) => (where[b].length - where[a].length) || (hits[b] - hits[a]) || ((idx.get(a) ?? 1e9) - (idx.get(b) ?? 1e9)));
  if (!ranked.length) return null;
  const top = ranked[0], fields = where[top], sig = fields.join("+");
  if (fields.length < HEADLINE_MIN_FIELDS) return null;
  const rival = Math.max(0, ...ranked.slice(1).filter((t) => where[t].join("+") !== sig).map((t) => where[t].length));
  if (fields.length - rival < HEADLINE_MIN_LEAD) return null;
  return { topic: top, fields };
}

/**
 * The topic to score an untargeted page under. Returns { topic, from, moved,
 * reason, signal, via? }. On harvested pages (fresh-*) a light headline pass
 * (headlineTopic) runs first:
 * when the title, first heading and slug clearly name one issue key, that key
 * is used (via: "headline"). Otherwise the filed topic stays unless another
 * known topic beats it by TARGET_MIN_SIGNAL in the full-page signal (after
 * the coverage bonus). Never returns an issue key the scorer has no rules for.
 */
export function targetTopic(rec, { counts = {}, topics = SCORED_TOPICS } = {}) {
  const from = rec?.topic;
  const keep = (reason) => ({ topic: from, from, moved: false, reason });
  if (!isUntargeted(rec)) return keep("cited for this topic");
  // Harvested (frontier) pages: a light pass first on title, first heading and
  // URL slug only. Homepages / indexes carry many topics and keep the full pass.
  const hp = String(rec?.source_id || "").startsWith("fresh-") ? headlineTopic(rec, { topics }) : null;
  if (hp && hp.topic !== from) {
    return { topic: hp.topic, from, moved: true, via: "headline", signal: hp.fields.length,
      reason: `headline pass — ${hp.fields.join(" + ")} name ${hp.topic}` };
  }
  if (hp) return { ...keep(`headline pass confirms the filed topic (${hp.fields.join(" + ")})`), via: "headline" };
  const sig = topicSignals(rec, { topics });
  const best = bestTopic(sig, { counts, pid: rec.politician_id, fallback: from, order: topics });
  if (!best || !hasRulesFor(best.t)) return keep("no topic signal on the page");
  if (best.t === from) return { ...keep("the filed topic is the page's strongest signal"), signal: best.v };
  const own = (sig[from] || 0) + (hasRulesFor(from) ? coverageBonus(counts, rec.politician_id, from) : 0);
  if (best.v < TARGET_MIN_SIGNAL || best.total - own < TARGET_MIN_SIGNAL) return { ...keep(`no topic clearly ahead (best ${best.t} ${best.v})`), signal: best.v };
  const cov = coverageBonus(counts, rec.politician_id, best.t);
  return { topic: best.t, from, moved: true, signal: best.v,
    reason: `page signals ${best.t} (${best.v} vs ${from} ${sig[from] || 0})${cov === EMPTY_BONUS ? "; no Locker coverage yet" : cov ? "; thin Locker coverage" : ""}` };
}
