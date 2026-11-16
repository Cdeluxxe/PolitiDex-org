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
//     Pages are only first-party pages already cited as the source of a
//     curated stance claim for that politician (campaign / official / .gov
//     pages). News and reference hosts, Congress.gov / GovInfo (they refuse
//     automated fetches) and retired URLs are left out. No URL is guessed.
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
  return (u.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home").slice(0, 60);
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
  const pages = [...curatedPages(pid).values()].filter((p) => firstParty(p.url, pid));
  if (!pages.length) return null;
  const multi = pages.length > 1;
  const sources = pages.map((p) => ({
    politician_id: pid,
    topic: p.keys[0],
    source_type: sourceTypeFor(p.label, p.url),
    source_class: "curated_page",
    source_id: multi ? `pool-${slug(p.url)}` : "pool-page",
    url: p.url,
    ...(p.keys.length > 1 ? { issue_pairs: p.keys.slice(1) } : {}),
  }));
  // Two pages with one slug would share a record key: keep the first.
  const seen = new Set();
  if (!hasStances(pid)) return null;
  return { politician_id: pid, ...(name ? { name } : {}), tier: tierFor(pid), has_board: hasBoard(pid), has_stances: true, ...extra,
    sources: sources.filter((s) => !seen.has(s.source_id) && seen.add(s.source_id)) };
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

// Newly elected federal members already rotating: their curated keys on every page.
const person_pairs = {};
for (const m of read("db/newly-elected-stated-2026-11.json").members || []) {
  if (!inRoster.has(m.pid)) continue;
  const keys = uniq((m.issueKeys || []).filter((k) => hasRulesFor(k)));
  if (keys.length) person_pairs[m.pid] = keys;
}

const pages = politicians.reduce((n, r) => n + r.sources.length, 0);
const pairs = (rows) => rows.reduce((n, r) => n + r.sources.reduce((k, s) => k + 1 + (s.issue_pairs?.length || 0), 0), 0);
const doc = {
  _note: "Rotation pool expansion for the raw-ingest / stance-score cron (applied by netlify/lib/raw-ingest-core.mjs). Generated by scripts/build-raw-ingest-pool-expansion-2026-11.mjs from curated stance data: every URL is a first-party page already cited as the source of a curated stance claim for that politician. `politicians` are new roster rows (newly elected first); `issue_pairs` adds the other curated keys a page backs; `person_pairs` adds newly elected federal members' curated keys to each of their pages.",
  summary: {
    new_politicians: politicians.length,
    newly_elected: politicians.filter((r) => r.newly_elected).length,
    new_pages: pages,
    new_issue_pairs: pairs(politicians),
    existing_pages_with_extra_pairs: Object.values(issue_pairs).reduce((n, m) => n + Object.keys(m).length, 0),
    existing_extra_pairs: Object.values(issue_pairs).reduce((n, m) => n + Object.values(m).reduce((k, a) => k + a.length, 0), 0),
    newly_elected_federal_with_pairs: Object.keys(person_pairs).length,
  },
  politicians,
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
