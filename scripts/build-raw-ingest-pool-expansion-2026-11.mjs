#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-pool-expansion-2026-11.mjs
//
// Widens the cron rotation pool (ROSTER in netlify/lib/raw-ingest-core.mjs) so
// the raw-ingest and stance-score jobs have more politician + issue pairs to
// work on. Writes db/raw-ingest-pool-expansion-2026-11.json:
//
//   · politicians — NEW roster rows, newly elected first:
//       1. the November 3, 2026 newly elected state legislators
//          (db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json,
//          until now pulled once by a one-off script and never rotated) —
//          flagged newly_elected and placed ahead of the rest;
//       2. every other politician with curated stated positions
//          (politician-stances.js) who is not in the rotation yet.
//     Tier and has_board follow the roster rule (board + several stated
//     positions = tier 1, otherwise tier 2). Pages carry source_class
//     "curated_page".
//     Pages are only pages already cited for that politician. No URL is guessed.
//     EVIDENCE TIER (`source_tier` on every page, carried onto the raw record
//     and the Locker item):
//       tier 1 — first-party pages cited as the source of a curated stance
//                claim (campaign / official / .gov pages). Unchanged.
//       tier 2 — official government sources and the politician's own YouTube
//                channel (pool v2, 2026-11-16):
//                · Congress.gov member pages, measures and Congressional Record
//                  pages cited for the politician (class congress_gov);
//                · other official hosts that are clearly the politician's own
//                  office or a committee / member page — a member's own
//                  house.gov / senate.gov subdomain the news filter caught by
//                  name, a statewide office host (ag., governor. … .state.xx.us),
//                  a legislature page below the site root (class official_gov);
//                · a YouTube video cited from the politician's OWN channel
//                  (spotlight-cards-data.js, labelled "<name>'s … channel" /
//                  "own channel") — never interviews, debates, news or chamber
//                  channels (class youtube_video).
//     News outlets, voter guides, general archives (GovInfo, CRS reports, the
//     Federal Register, the Congress.gov home page) and retired URLs stay out.
//   · extra_sources — tier-2 pages for politicians ALREADY in the rotation.
//   · issue_pairs — EXTRA issue keys per page (politician → url → keys): every
//     curated key a page backs beyond the page's record topic, for new rows and
//     for pages already in the rotation. The planner treats a page as open
//     while ANY of its pairs is unfilled, so a page whose record topic is
//     filled keeps working on the others. Filled pairs keep the existing
//     deprioritisation.
//   · person_pairs — curated issue keys for the newly elected federal members
//     already in the rotation (db/newly-elected-stated-2026-11.json), applied
//     to each of their pages.
//
// Read-only on stance data. `--check` exits non-zero when the committed file is
// out of date.
//
//   node scripts/build-raw-ingest-pool-expansion-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-pool-expansion-2026-11.json");
// Bump when the pool's contents change in kind: the cron starts a fresh
// rotation cycle when the stored state was planned under another version, so
// the next runs reach the new sources straight away.
//   pool-2026-11-v1 — first-party pages (tier 1) only
//   pool-2026-11-v2 — + tier 2: official government sources and own YouTube channels
const POOL_VERSION = "pool-2026-11-v2";
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

// The base roster, WITHOUT this expansion applied (so the build is stable).
process.env.PDX_RAW_INGEST_NO_POOL_EXPANSION = "1";
const core = await import("../netlify/lib/raw-ingest-core.mjs");
const { RETIRED_SOURCES } = await import("../netlify/lib/raw-ingest-retired.mjs");
const { hasRulesFor } = await import("../netlify/lib/stance-score-core.mjs");

const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");
// Priority flags follow the roster rule (raw-ingest-core.mjs): has_board = the
// sitting holder of a seat with a district board; tier 1 = board + several
// stated positions, tier 2 = board or stated positions.
const STANCE_SRC = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js"]
  .filter((f) => fs.existsSync(path.join(root, f))).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const STANCE_COUNT = (() => {
  const re = /^\s*['"]?([a-z0-9_]+)['"]?\s*:\s*\[/gm; const starts = []; let m;
  while ((m = re.exec(STANCE_SRC))) starts.push([m[1], m.index]);
  const out = {};
  starts.forEach(([pid, at], i) => { const seg = STANCE_SRC.slice(at, starts[i + 1]?.[1] ?? STANCE_SRC.length); out[pid] = (out[pid] || 0) + (seg.match(/\bissueKey\s*:/g) || []).length; });
  return out;
})();
const hasBoard = (pid) => Object.values(SEAT_HOLDERS).some((h) => h && h.pid === pid);
const hasStances = (pid) => new RegExp(`^\\s*['"]?${pid}['"]?\\s*:\\s*\\[`, "m").test(STANCE_SRC);
const tierFor = (pid) => (hasBoard(pid) && (STANCE_COUNT[pid] || 0) >= core.SEVERAL_STANCES ? 1 : 2);

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "politician-stances.js"), "utf8"), ctx);
const STANCES = ctx.window.ISSUE_STANCE_DATA;

// Same normalisation as normUrl in raw-ingest-core.mjs (issue_pairs is keyed by it).
const norm = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};
const retired = new Set(RETIRED_SOURCES.map((s) => norm(s.url)));
const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
// News, reference and aggregator hosts: not the politician's own words.
const THIRD_PARTY = /(?:^|\.)(?:ballotpedia\.org|wikipedia\.org|vote411\.org|votesmart\.org|justfacts\.votesmart\.org|opensecrets\.org|followthemoney\.org|govtrack\.us|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|medium\.com|substack\.com|apnews\.com|reuters\.com|npr\.org|pbs\.org|c-span\.org)$|news|times|post|tribune|herald|gazette|journal|daily|politico|axios|thehill|cnn|foxnews|nbc|cbs|abc|msnbc|bloomberg|wsj|guardian|courier|observer|chronicle|sentinel|register|examiner|patch\.com|kff|brookings|heritage|cato|voterguide|guide|messenger|parentsfor|press|radio|tv\b|online/;
const REFUSES = /(?:^|\.)(?:congress\.gov|govinfo\.gov)$/;
const GOV_HOST = /\.(?:gov|mil)$|(?:^|\.)(?:house|senate)\.(?:state\.)?[a-z]{2}\.us$|(?:^|\.)legis(?:lature)?\.[a-z.]+$/;
const CAMPAIGN_HOST = /(?:for|elect|vote|campaign|team|friends|20\d\d)/;
/**
 * Allowlist, not a blocklist: a government host, or a host that reads as the
 * politician's own campaign site (a campaign word, or a part of their id such
 * as the surname). Anything else — news outlets, archives, aggregators — is out.
 */
const firstParty = (u, pid) => {
  const h = host(u);
  if (!h || !/^https?:/i.test(u) || REFUSES.test(h) || THIRD_PARTY.test(h) || retired.has(norm(u))) return false;
  if (GOV_HOST.test(h)) return true;
  const site = h.split(".").slice(0, -1).join(".");
  const names = String(pid).split("_").filter((x) => x.length >= 4);
  return CAMPAIGN_HOST.test(site) || names.some((n) => site.includes(n));
};
// ── Tier 2: official government sources (pool v2) ──────────────────────────
// Only for pages the tier-1 rule above leaves out; tier 1 is never re-tiered.
const GENERAL_ARCHIVE = /(?:^|\.)(?:govinfo\.gov|crsreports\.congress\.gov|federalregister\.gov|archives\.gov|loc\.gov|govtrack\.us)$/;
const CONGRESS_GOV_PATH = /^\/(?:member|bill|amendment|congressional-record)\//;
const MEMBER_OFFICE_HOST = /^[a-z0-9-]+\.(?:house|senate)\.gov$/;
const STATE_OFFICE_HOST = /^(?:ag|oag|doj|governor|gov|ltgov|lg|sos|treasurer|auditor|comptroller)\.state\.[a-z]{2}\.us$/;
const STATE_LEGIS_HOST = /^(?:[a-z]*leg[a-z]*|house|senate|assembly)\.state\.[a-z]{2}\.us$/;
/** { source_class, source_type } for a tier-2 official page, or null. */
const officialTier2 = (u, label) => {
  const h = host(u);
  if (!h || !/^https?:/i.test(u) || retired.has(norm(u)) || GENERAL_ARCHIVE.test(h)) return null;
  let path = "";
  try { path = new URL(u).pathname; } catch { return null; }
  if (h === "congress.gov") {
    if (!CONGRESS_GOV_PATH.test(path)) return null; // home page, CRS products, hearing files
    const kind = /^\/member\//.test(path) ? "member page" : /^\/congressional-record\//.test(path) ? "Congressional Record page" : "measure page";
    return { source_class: "congress_gov", source_type: `official Congress.gov ${kind}` };
  }
  if (MEMBER_OFFICE_HOST.test(h) || STATE_OFFICE_HOST.test(h)) return { source_class: "official_gov", source_type: sourceTypeFor(label, u) };
  if (STATE_LEGIS_HOST.test(h) && path.replace(/\/+$/, "")) return { source_class: "official_gov", source_type: sourceTypeFor(label, u) };
  return null;
};

// ── Tier 2: the politician's own YouTube channel (pool v2) ─────────────────
// A cited video counts only when its label names the channel as the
// politician's own ("Nguyen's official campaign channel", "her own channel").
// Interviews, debates, panels, news programmes and chamber channels stay out.
const NOT_OWN_CHANNEL = /\b(?:interview|debate|panel|podcast|featuring|news|pbs|c-span|radio|tv|media|report)\b|\b(?:senate|house|legislature|assembly|council|commission|chamber)(?:['’]s)?\s+(?:own\s+)?(?:official\s+)?channel\b/i;
const youtubeId = (u) => { const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(String(u || "")); return m ? m[1] : null; };
function ownChannel(item, pid) {
  const label = String(item?.media?.label || "");
  if (!label || NOT_OWN_CHANNEL.test(label)) return false;
  const names = String(pid).split("_").filter((x) => x.length >= 3);
  const poss = /([A-Za-z'’-]+?)['’]s\s+(?:own\s+)?(?:official\s+)?(?:campaign\s+)?(?:YouTube\s+)?channel\b/i.exec(label);
  if (poss && names.includes(poss[1].toLowerCase())) return true;
  return /\b(?:his|her|their)\s+own\s+(?:official\s+)?(?:campaign\s+)?(?:YouTube\s+)?channel\b/i.test(label);
}
const sctx = { window: {} };
vm.createContext(sctx);
vm.runInContext(fs.readFileSync(path.join(root, "spotlight-cards-data.js"), "utf8"), sctx);
const SPOTLIGHT = sctx.window.SPOTLIGHT_DATA || {};
/** Own-channel YouTube videos cited for `pid`: [{ url, label, keys[] }] (scored keys only). */
function ownChannelVideos(pid) {
  const by = new Map();
  for (const it of Array.isArray(SPOTLIGHT[pid]) ? SPOTLIGHT[pid] : []) {
    if (it?.media?.kind !== "youtube" || !youtubeId(it.media.url) || !ownChannel(it, pid)) continue;
    if (!it.issueKey || !hasRulesFor(it.issueKey) || retired.has(norm(it.media.url))) continue;
    const url = `https://www.youtube.com/watch?v=${youtubeId(it.media.url)}`;
    const e = by.get(url) || { url, label: it.media.label, keys: [] };
    e.keys.push(it.issueKey);
    by.set(url, e);
  }
  for (const e of by.values()) e.keys = uniq(e.keys);
  return [...by.values()];
}

/** Tier-2 pages for `pid` (official government + own YouTube), as pool sources. */
function tier2Sources(pid, exclude = new Set()) {
  const out = [];
  const add = (p, cls, type) => {
    if (exclude.has(norm(p.url))) return;
    exclude.add(norm(p.url));
    out.push({ politician_id: pid, topic: p.keys[0], source_type: type, source_class: cls, source_tier: 2,
      source_id: `tier2-${slug(p.url)}`, url: p.url, ...(p.keys.length > 1 ? { issue_pairs: p.keys.slice(1) } : {}) });
  };
  for (const p of curatedPages(pid).values()) {
    if (firstParty(p.url, pid)) continue; // tier 1 — never re-tiered
    const t2 = officialTier2(p.url, p.label);
    if (t2) add(p, t2.source_class, t2.source_type);
  }
  for (const v of ownChannelVideos(pid)) add(v, "youtube_video", /\bcampaign\b/i.test(v.label) ? "campaign YouTube video (own channel)" : "official YouTube video (own channel)");
  const seen = new Set();
  return out.filter((s) => !seen.has(s.source_id) && seen.add(s.source_id));
}

const sourceTypeFor = (label, url) => {
  const l = `${label || ""} ${url}`.toLowerCase();
  const h = host(url);
  if (/\.(gov|mil)$/.test(h) || /\.(?:house|senate|legislature|state)\./.test(h)) {
    if (/press|news|release|statement/.test(l)) return "official press release";
    return "official issue page";
  }
  if (/home page/.test(l)) return "campaign home page";
  if (/platform|pillars/.test(l)) return "campaign platform page";
  if (/priorit|fighting for|matters most|day one/.test(l)) return "campaign priorities page";
  return "campaign issues page";
};
const slug = (url) => {
  const u = new URL(url);
  const v = u.searchParams.get("v");
  return ((u.pathname.replace(/^\/+|\/+$/g, "") + (v ? `-${v}` : "")).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home").slice(0, 60);
};
const uniq = (a) => [...new Set(a)];

const inRoster = new Map(core.ROSTER.map((r) => [r.politician_id, r]));
const rosterUrls = new Map(core.ROSTER.map((r) => [r.politician_id, new Set([...(r.sources || []), ...(r.official ? [r.official] : [])].map((s) => norm(s.url)))]));

/** Curated stance claims for `pid` grouped by page: url → { url, label, keys[] } (scored keys only). */
function curatedPages(pid) {
  const by = new Map();
  for (const s of STANCES[pid] || []) {
    const url = s.source?.url;
    if (!url || !s.issueKey || !hasRulesFor(s.issueKey)) continue;
    const e = by.get(norm(url)) || { url, label: s.source.label || "", keys: [] };
    e.keys.push(s.issueKey);
    by.set(norm(url), e);
  }
  for (const e of by.values()) e.keys = uniq(e.keys);
  return by;
}

function rowFor(pid, name, extra = {}) {
  if (!hasStances(pid)) return null;
  const pages = [...curatedPages(pid).values()].filter((p) => firstParty(p.url, pid));
  // Source ids of tier-1 pages depend on the tier-1 pages alone, so adding
  // tier-2 pages never renames an existing raw record key.
  const multi = pages.length > 1;
  const sources = pages.map((p) => ({
    politician_id: pid,
    topic: p.keys[0],
    source_type: sourceTypeFor(p.label, p.url),
    source_class: "curated_page",
    source_tier: 1,
    source_id: multi ? `pool-${slug(p.url)}` : "pool-page",
    url: p.url,
    ...(p.keys.length > 1 ? { issue_pairs: p.keys.slice(1) } : {}),
  }));
  // Two pages with one slug would share a record key: keep the first.
  const seen = new Set();
  const tier1 = sources.filter((s) => !seen.has(s.source_id) && seen.add(s.source_id));
  const tier2 = tier2Sources(pid, new Set(tier1.map((s) => norm(s.url)))).filter((s) => !seen.has(s.source_id) && seen.add(s.source_id));
  if (!tier1.length && !tier2.length) return null;
  return { politician_id: pid, ...(name ? { name } : {}), tier: tierFor(pid), has_board: hasBoard(pid), has_stances: true, ...extra,
    sources: [...tier1, ...tier2] };
}

const politicians = [];
const added = new Set();
// 1. Newly elected state legislators (Nov 3, 2026).
const stateLeg = read("db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json");
for (const m of stateLeg.roster) {
  if (inRoster.has(m.politician_id) || added.has(m.politician_id)) continue;
  const row = rowFor(m.politician_id, m.name, { newly_elected: "2026-11-03", seat: m.seat });
  if (row) { politicians.push(row); added.add(m.politician_id); }
}
// 2. Everyone else with curated stated positions who is not rotating yet.
for (const pid of Object.keys(STANCES).sort()) {
  if (inRoster.has(pid) || added.has(pid)) continue;
  const row = rowFor(pid, null);
  if (row) { politicians.push(row); added.add(pid); }
}

// Extra issue pairs on pages already in the rotation.
const issue_pairs = {};
for (const r of core.ROSTER) {
  const pages = curatedPages(r.politician_id);
  for (const s of [...(r.sources || []), ...(r.official ? [r.official] : [])]) {
    const p = pages.get(norm(s.url));
    const keys = p ? p.keys.filter((k) => k !== s.topic) : [];
    if (keys.length) (issue_pairs[r.politician_id] ||= {})[norm(s.url)] = keys;
  }
}

// Tier-2 pages (official government + own YouTube) for politicians already in
// the rotation: joined to their row after its existing pages.
const extra_sources = {};
for (const r of core.ROSTER) {
  const have = rosterUrls.get(r.politician_id);
  const ids = new Set((r.sources || []).map((s) => s.source_id).filter(Boolean));
  const list = tier2Sources(r.politician_id, new Set(have)).filter((s) => !ids.has(s.source_id) && ids.add(s.source_id));
  if (list.length) extra_sources[r.politician_id] = list;
}

// Newly elected federal members already rotating: their curated keys on every page.
const person_pairs = {};
for (const m of read("db/newly-elected-stated-2026-11.json").members || []) {
  if (!inRoster.has(m.pid)) continue;
  const keys = uniq((m.issueKeys || []).filter((k) => hasRulesFor(k)));
  if (keys.length) person_pairs[m.pid] = keys;
}

const pages = politicians.reduce((n, r) => n + r.sources.length, 0);
const allTier2 = [...politicians.flatMap((r) => r.sources), ...Object.values(extra_sources).flat()].filter((s) => s.source_tier === 2);
const byClass = (list) => list.reduce((o, s) => ((o[s.source_class] = (o[s.source_class] || 0) + 1), o), {});
const pairs = (rows) => rows.reduce((n, r) => n + r.sources.reduce((k, s) => k + 1 + (s.issue_pairs?.length || 0), 0), 0);
const doc = {
  _note: "Rotation pool expansion for the raw-ingest / stance-score cron (applied by netlify/lib/raw-ingest-core.mjs). Generated by scripts/build-raw-ingest-pool-expansion-2026-11.mjs from curated stance data: every URL is a page already cited for that politician. Every page carries `source_tier`: 1 = a first-party campaign / official page cited as the source of a curated stance claim; 2 = an official government source (Congress.gov member / measure / Congressional Record pages, the politician's own office or committee pages on other government hosts) or a video from the politician's own YouTube channel. News, voter guides, general archives and retired URLs are left out. `politicians` are new roster rows (newly elected first); `extra_sources` adds tier-2 pages to politicians already rotating; `issue_pairs` adds the other curated keys a page backs; `person_pairs` adds newly elected federal members' curated keys to each of their pages.",
  pool_version: POOL_VERSION,
  summary: {
    new_politicians: politicians.length,
    newly_elected: politicians.filter((r) => r.newly_elected).length,
    new_pages: pages,
    new_issue_pairs: pairs(politicians),
    existing_pages_with_extra_pairs: Object.values(issue_pairs).reduce((n, m) => n + Object.keys(m).length, 0),
    existing_extra_pairs: Object.values(issue_pairs).reduce((n, m) => n + Object.values(m).reduce((k, a) => k + a.length, 0), 0),
    newly_elected_federal_with_pairs: Object.keys(person_pairs).length,
    tier2_pages: allTier2.length,
    tier2_by_class: byClass(allTier2),
    existing_politicians_with_tier2_pages: Object.keys(extra_sources).length,
  },
  politicians,
  extra_sources,
  issue_pairs,
  person_pairs,
};
const text = JSON.stringify(doc, null, 1) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== text) { console.error(`${path.relative(root, OUT)} is out of date — run node scripts/build-raw-ingest-pool-expansion-2026-11.mjs`); process.exit(1); }
  console.log(`${path.relative(root, OUT)} is current`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`pool expansion: ${JSON.stringify(doc.summary)} → ${path.relative(root, OUT)}`);
}
