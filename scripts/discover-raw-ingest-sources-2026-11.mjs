#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// discover-raw-ingest-sources-2026-11.mjs — the OFFLINE discovery job for the
// raw-ingest URL resolver's step 5.
//
// For every tier-3 roster row still page-less after steps 1–4, find the
// politician's own campaign / personal site, their own YouTube channel, and
// interviews / statements about them alone, and keep only what passes the
// rules in netlify/lib/raw-ingest-discovery.mjs. Writes
// db/raw-ingest-discovered-2026-11.json: each kept URL with its source type,
// how it was found and every reason it was accepted, plus counts of what was
// refused and why. The roster build reads that committed file; this job is
// never imported by the cron, the planner or the pull path.
//
// SOURCES, in order (an own site or channel always wins over an interview):
//   1. FEC — federal candidates: the candidate's principal campaign
//      committee's own `website` field (api.open.fec.gov, FEC_API_KEY).
//      Matched on office + state (+ House district) + name, exactly one FEC
//      candidate. While that committee is open, its FEC money summary (total
//      receipts, total disbursements, cash on hand, coverage end of the last
//      report) is kept too and written to the FTM_FEC_SUMMARY block of
//      ftm-data.js — only for people with no newer money figure on their
//      profile (netlify/lib/fec-money-summary.mjs).
//   2. Open States — state legislators and statewide officials: the person's
//      current record (github.com/openstates/people, open data). Links that
//      are not legislature / government / social pages are own-site
//      candidates; `ids.youtube` is a channel candidate. Exactly one record.
//   3. Their verified own site — its issues / priorities pages and the
//      YouTube channel it links.
//   4. Tavily search (TAVILY_API_KEY), only for rows with no own site from 1–3,
//      one query per person: own sites, channels, own-channel videos and
//      interview / podcast pages in the results, each checked like the rest.
// Every candidate page is fetched and verified (names them in full, mentions
// their office and state, not parked, not a multi-candidate piece). Rows whose
// name another politician on the site shares are skipped (never resolvable).
//
// Flags: --only pid,pid · --limit N · --no-search · --max-searches N ·
//        --concurrency N (default 6) · --fresh (ignore the fetch cache)
// The fetch / search cache lives in the OS temp directory, never the repo.
//
//   node scripts/discover-raw-ingest-sources-2026-11.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-discovered-2026-11.json");
const UA = "PolitiDex raw-ingest discovery (+https://politidex.fyi)";
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);
const ONLY = arg("--only") ? new Set(arg("--only").split(",")) : null;
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const MAX_SEARCHES = flag("--no-search") ? 0 : Number(arg("--max-searches", Infinity)) || Infinity;
const CONCURRENCY = Number(arg("--concurrency", 6)) || 6;
const CACHE = path.join(os.tmpdir(), "pdx-raw-ingest-discovery-cache");
fs.mkdirSync(CACHE, { recursive: true });
if (flag("--fresh")) for (const f of fs.readdirSync(CACHE)) fs.rmSync(path.join(CACHE, f), { force: true });

// The rows step 5 serves: page-less after steps 1–4 (built without step 5).
process.env.PDX_RAW_INGEST_NO_DISCOVERED = "1";
const core = await import(pathToFileURL(path.join(root, "netlify/lib/raw-ingest-core.mjs")).href);
const R = await import(pathToFileURL(path.join(root, "netlify/lib/raw-ingest-resolve.mjs")).href);
const D = await import(pathToFileURL(path.join(root, "netlify/lib/raw-ingest-discovery.mjs")).href);
const M = await import(pathToFileURL(path.join(root, "netlify/lib/fec-money-summary.mjs")).href);
const FTM = path.join(root, "ftm-data.js");
const PEOPLE = core.RESOLVER_PEOPLE;
const ALIAS = JSON.parse(fs.readFileSync(path.join(root, "db/share-index.json"), "utf8")).personAliases || {};
const canon = (p) => ALIAS[p] || p;

// Everyone on the site, for name conflicts (and other-politician checks in titles).
const allNames = new Map();
for (const [pid, v] of Object.entries(PEOPLE)) if (v?.n) allNames.set(pid, v.n);
for (const r of core.ROSTER) if (r.name && !allNames.has(r.politician_id)) allNames.set(r.politician_id, r.name);
const byLast = new Map();
for (const [pid, n] of allNames) { const t = R.nameTokens(n); if (t.length >= 2) (byLast.get(t.at(-1)) || byLast.set(t.at(-1), []).get(t.at(-1))).push([pid, n]); }
const homonymOf = (pid, name) => { const t = R.nameTokens(name); return (byLast.get(t.at(-1)) || []).find(([p, n]) => canon(p) !== canon(pid) && R.sameName(n, name))?.[0] || null; };
const OTHERS = [...allNames].map(([pid, n]) => ({ pid, re: D.fullNameRe(n) })).filter((o) => o.re);

const rows = core.RESOLUTION.unresolved.map((u) => core.ROSTER.find((r) => r.politician_id === u.politician_id))
  .filter((r) => r && Number(r.tier) === 3 && (!ONLY || ONLY.has(r.politician_id))).slice(0, LIMIT);
const ids = new Map(rows.map((r) => [r.politician_id, R.identityOf(r.politician_id, PEOPLE[r.politician_id] || { n: r.name, o: r.office, s: r.state_listed || r.state })]));

// ── fetching (cached) ───────────────────────────────────────────────────────
const key = (s) => crypto.createHash("sha1").update(s).digest("hex");
const cached = async (k, f) => {
  const file = path.join(CACHE, `${key(k)}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const v = await f();
  if (v && !v.transient) fs.writeFileSync(file, JSON.stringify(v));
  return v;
};
async function getPage(url) {
  return cached(`page ${url}`, async () => {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA, accept: "text/html,*/*", "accept-language": "en-US,en" }, signal: AbortSignal.timeout(15_000) });
      const ct = res.headers.get("content-type") || "";
      let html = "";
      if (/html/i.test(ct)) { const buf = Buffer.from(await res.arrayBuffer()); html = buf.subarray(0, 1_500_000).toString("utf8"); } else await res.body?.cancel();
      return { url, final_url: res.url, status: res.status, content_type: ct, html };
    } catch (e) { return { url, final_url: url, status: 0, content_type: "", html: "", error: String(e?.message || e).slice(0, 120), transient: true }; }
  });
}
// The FEC key allows about 60 requests a minute: FEC calls are spaced out one
// at a time, and a 429 waits out the window instead of giving up after seconds.
let fecNext = 0;
const fecSlot = async () => { const now = Date.now(), at = Math.max(now, fecNext); fecNext = at + 1100; if (at > now) await new Promise((r) => setTimeout(r, at - now)); };
async function getJson(url, init = {}, label = url) {
  return cached(`json ${label}`, async () => {
    const fec = /^https:\/\/api\.open\.fec\.gov\//.test(url);
    for (let attempt = 0; attempt < (fec ? 8 : 4); attempt++) {
      if (fec) await fecSlot();
      const res = await fetch(url, { ...init, headers: { accept: "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(30_000) }).catch((e) => ({ ok: false, status: 0, e }));
      if (res.ok) return res.json();
      if (res.status === 429 || res.status === 0 || res.status >= 500) { await new Promise((r) => setTimeout(r, fec && res.status === 429 ? 65_000 : 2000 * (attempt + 1))); continue; }
      return { transient: true, error: `HTTP ${res.status}`, status: res.status };
    }
    return { transient: true, error: "gave up after retries" };
  });
}
async function pool(items, n, f) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const x = items[i++]; await f(x); } })); }

// ── bookkeeping ─────────────────────────────────────────────────────────────
const found = new Map();     // pid → [accepted entries]
const refused = new Map();   // why (generalised) → count
const refusedSample = [];
const tried = new Map();     // pid → Set(url) already judged
const today = new Date().toISOString().slice(0, 10);
const refuse = (pid, url, why, via) => {
  const k = why.replace(/https?:\/\/\S+/g, "<url>").replace(/"[^"]*"/g, '"…"').replace(/\([^)]*\)/g, "(…)").replace(/\b[a-z0-9.-]+\.[a-z]{2,}\b/g, "<host>");
  refused.set(k, (refused.get(k) || 0) + 1);
  if (refusedSample.length < 400) refusedSample.push({ politician_id: pid, url, found_by: via, why });
};
const accept = (pid, entry) => {
  const list = found.get(pid) || found.set(pid, []).get(pid);
  if (list.some((e) => R.normUrl(e.url) === R.normUrl(entry.url))) return;
  list.push(entry);
};
const hasOwn = (pid) => (found.get(pid) || []).some((e) => e.source_class === "own_site");

/** Judge one candidate web page (own site or interview). */
async function judgePage(pid, url, via, extra = {}) {
  const id = ids.get(pid);
  const seen = tried.get(pid) || tried.set(pid, new Set()).get(pid);
  if (seen.has(R.normUrl(url))) return null;
  seen.add(R.normUrl(url));
  const cand = D.classifyCandidate(url, id, { listed: !!extra.listed });
  if (!cand.ok) { refuse(pid, url, cand.why, via); return null; }
  if (cand.source_class === "youtube" || cand.source_class === "youtube_video") return judgeYouTube(pid, url, cand, via, extra);
  const res = await getPage(url);
  const facts = D.pageFacts(res.html, res.final_url || url);
  const v = D.verifyPage(facts, res, id, cand, { others: OTHERS, via });
  if (!v.ok) { refuse(pid, url, v.why, via); return null; }
  const finalUrl = res.final_url || url;
  // A site that presents itself as a campaign ("… for Congress", "Elect …") is
  // their campaign site, whatever its host.
  if (cand.source_class === "own_site" && cand.kind === "personal" && D.campaignPage(facts)) cand.kind = "campaign";
  const type = cand.source_class === "own_site" ? D.DISCOVERY_CLASSES.own_site.type[cand.kind] : D.DISCOVERY_CLASSES[cand.source_class].type;
  const entry = { url: finalUrl, source_class: cand.source_class, source_type: type, source_tier: D.DISCOVERY_CLASSES[cand.source_class].tier,
    kind: extra.kind || (cand.source_class === "own_site" ? `${cand.kind}_site` : "interview"), found_by: via, ...(extra.detail ? { found_detail: extra.detail } : {}),
    accepted_because: [...(extra.because || []), ...v.reasons], checked: { status: res.status, title: (facts.title || facts.og_title || "").slice(0, 140), fetched_on: today } };
  accept(pid, entry);
  return { entry, facts };
}

/** Judge a YouTube channel or video: only the politician's own channel is kept. */
async function judgeYouTube(pid, url, cand, via, extra = {}) {
  const id = ids.get(pid);
  let channelUrl, because = [...(extra.because || [])];
  if (cand.source_class === "youtube_video") {
    // YouTube's oEmbed record names the uploader and links its channel page.
    const oq = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${cand.video_id}`)}`;
    const o = await getJson(oq, { headers: { "user-agent": UA } }, oq);
    if (!/^https:\/\/www\.youtube\.com\/(?:@|channel\/|c\/|user\/)/.test(String(o?.author_url || ""))) { refuse(pid, url, "video uploader unreadable", via); return null; }
    channelUrl = o.author_url;
    because.push(`video ${cand.video_id} was uploaded by "${o.author_name}" (${o.author_url})`);
  } else channelUrl = `https://www.youtube.com/${cand.channel_ref}`;
  const res = await getPage(channelUrl);
  const f = D.pageFacts(res.html, res.final_url);
  const v = D.verifyChannel(f, res, id, { others: OTHERS, via });
  if (!v.ok) { refuse(pid, url, v.why, via); return null; }
  const entry = { url: `https://www.youtube.com/feeds/videos.xml?channel_id=${v.channel_id}`, channel_id: v.channel_id, channel_url: `https://www.youtube.com/channel/${v.channel_id}`,
    source_class: "youtube", source_type: D.DISCOVERY_CLASSES.youtube.type, source_tier: D.DISCOVERY_CLASSES.youtube.tier, kind: "own_channel", found_by: via,
    ...(extra.detail ? { found_detail: extra.detail } : {}), accepted_because: [...because, ...v.reasons], checked: { status: res.status, title: (f.og_title || f.title || "").slice(0, 140), fetched_on: today } };
  accept(pid, entry);
  return { entry };
}

/** From a verified own site: its issues pages and the channel it links. */
async function expandOwnSite(pid, home) {
  for (const u of D.issueLinks(home.facts, home.entry.url)) {
    await judgePage(pid, u, home.entry.found_by, { listed: ["fec", "open_states"].includes(home.entry.found_by), kind: "issues_page", detail: `linked from ${home.entry.url}`, because: [`issues page linked from their verified site ${R.hostOf(home.entry.url)}`] });
  }
  for (const u of D.youtubeLinks(home.facts).slice(0, 2)) {
    const cand = D.classifyCandidate(u, ids.get(pid));
    if (cand.ok) await judgeYouTube(pid, u, cand, "own_site", { detail: `linked from ${home.entry.url}`, because: [`channel linked from their verified site ${R.hostOf(home.entry.url)}`] });
  }
}

// ── 1. FEC ──────────────────────────────────────────────────────────────────
const stats = { rows: rows.length, skipped_homonym: 0, fec_candidates_read: 0, fec_matched: 0, fec_money_summaries: 0, open_states_records: 0, open_states_matched: 0, searches: 0, search_errors: 0 };
const live = rows.filter((r) => { const id = ids.get(r.politician_id); if (!id) return false; if (homonymOf(r.politician_id, id.name)) { stats.skipped_homonym++; refuse(r.politician_id, "", "another politician on the site shares this name", "roster"); return false; } return true; });
const federal = live.filter((r) => M.isFederalOffice(ids.get(r.politician_id).office));
const fecMoney = new Map(); // pid → the FEC money summary of their principal committee
let fecRan = false;
if (federal.length && process.env.FEC_API_KEY) {
  fecRan = true;
  const fecList = [];
  for (const office of ["H", "S"]) {
    for (let page = 1; page < 200; page++) {
      const q = `https://api.open.fec.gov/v1/candidates/?election_year=2026&office=${office}&per_page=100&page=${page}&sort=name`;
      const j = await getJson(`${q}&api_key=${process.env.FEC_API_KEY}`, {}, q);
      if (!j?.results) { console.error(`FEC: ${q} — ${j?.error || "no results"}`); break; }
      fecList.push(...j.results);
      if (page >= (j.pagination?.pages || 0)) break;
    }
  }
  stats.fec_candidates_read = fecList.length;
  await pool(federal, 3, async (r) => {
    const pid = r.politician_id, id = ids.get(pid);
    const office = /Senat/i.test(id.office) ? "S" : "H";
    const dist = /\b[A-Z]{2}-(\d{1,2}|AL)\b/.exec(id.office)?.[1];
    const hits = fecList.filter((c) => c.office === office && c.state === id.state && R.sameName(D.fecName(c.name), id.name)
      && (office === "S" || !dist || dist === "AL" ? true : Number(c.district) === Number(dist)));
    if (hits.length !== 1) { refuse(pid, "", hits.length ? `${hits.length} FEC candidates match` : "no FEC candidate matches", "fec"); return; }
    const cand = hits[0];
    stats.fec_matched++;
    const cq = `https://api.open.fec.gov/v1/candidate/${cand.candidate_id}/committees/?designation=P&per_page=5`;
    const cj = await getJson(`${cq}&api_key=${process.env.FEC_API_KEY}`, {}, cq);
    const sums = [];
    for (const pc of (cj?.results || []).slice(0, 2)) {
      const q = `https://api.open.fec.gov/v1/committee/${pc.committee_id}/`;
      const j = await getJson(`${q}?api_key=${process.env.FEC_API_KEY}`, {}, q);
      // The committee's money summary: the FEC's totals for this same committee,
      // latest cycle first, read alongside the committee record.
      const tq = `https://api.open.fec.gov/v1/committee/${pc.committee_id}/totals/?sort=-cycle&per_page=1`;
      const tj = await getJson(`${tq}&api_key=${process.env.FEC_API_KEY}`, {}, tq);
      sums.push(M.fecMoneySummary({ ...(j?.results?.[0] || {}), ...(tj?.results?.[0] || {}) }, { committeeId: pc.committee_id, candidateId: cand.candidate_id }));
      const web = D.websiteUrl(j?.results?.[0]?.website);
      if (!web) continue;
      const got = await judgePage(pid, web, "fec", { listed: true, detail: `FEC candidate ${cand.candidate_id}, committee ${pc.committee_id}`,
        because: [`website listed in the FEC filing of ${cand.name}'s principal campaign committee ${pc.committee_id} (candidate ${cand.candidate_id})`] });
      if (got?.entry.source_class === "own_site") await expandOwnSite(pid, got);
    }
    const best = M.latestSummary(sums);
    if (best) { fecMoney.set(pid, { ...best, name: id.name, office: id.office }); stats.fec_money_summaries++; }
  });
} else if (federal.length) console.error("FEC_API_KEY not set — FEC stage skipped");

// The hand-verified filing already on a person's profile, read from the shipped
// ftm-data.js with its FEC block emptied (so an earlier FEC row is not mistaken
// for one).
function handFilings() {
  const src = M.replaceFecSummaryBlock(fs.readFileSync(FTM, "utf8"), {});
  const at = src.indexOf("    var FTM_DATA = ["), end = src.indexOf("    // Small escapers so the funding UI is safe", at);
  const win = {};
  win.window = win;
  vm.runInContext(src.slice(at, end), vm.createContext(win), { filename: "ftm-data.js#accessors" });
  return (pid) => win._pdxFinanceFiling(pid);
}
const fecMerge = fecRan ? M.mergeFecSummaries(M.readFecSummaryBlock(fs.readFileSync(FTM, "utf8")), fecMoney, handFilings()) : null;
if (fecMerge) Object.assign(stats, { fec_money_attached: fecMerge.outcome.attached.length, fec_money_kept_existing: fecMerge.outcome.kept_existing.length });

// ── 2. Open States ──────────────────────────────────────────────────────────
const stateRows = live.filter((r) => { const id = ids.get(r.politician_id); return id.state && (id.state_legislator || id.statewide); });
if (stateRows.length) {
  // Downloaded into its own fresh directory and only read as text.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdx-openstates-"));
  try {
    const zip = path.join(dir, "people.zip");
    const res = await fetch("https://github.com/openstates/people/archive/refs/heads/main.zip", { headers: { "user-agent": UA }, signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Open States archive HTTP ${res.status}`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    execFileSync("unzip", ["-q", "-o", zip, "people-main/data/*/legislature/*", "people-main/data/*/executive/*", "-d", dir], { stdio: "pipe" });
    const data = path.join(dir, "people-main", "data");
    const people = [];
    for (const st of fs.readdirSync(data)) for (const sub of ["legislature", "executive"]) {
      const d = path.join(data, st, sub);
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d)) if (f.endsWith(".yml")) people.push({ ...D.readOpenStatesPerson(fs.readFileSync(path.join(d, f), "utf8")), state: st.toUpperCase(), sub });
    }
    stats.open_states_records = people.length;
    await pool(stateRows, CONCURRENCY, async (r) => {
      const pid = r.politician_id, id = ids.get(pid);
      const ch = R.legislativeChamber(id.office);
      const current = (p) => p.roles.some((x) => !x.end_date && (ch ? (x.type === "upper") === (ch === "senate") && /upper|lower|legislature/.test(x.type) : p.sub === "executive"));
      const hits = people.filter((p) => p.state === id.state && (R.sameName(p.name, id.name) || p.other_names.some((o) => R.sameName(o.name, id.name))) && current(p));
      if (hits.length !== 1) { refuse(pid, "", hits.length ? `${hits.length} Open States records match` : "no current Open States record matches", "open_states"); return; }
      stats.open_states_matched++;
      const p = hits[0];
      for (const l of p.links.slice(0, 6)) {
        if (!l.url) continue;
        const cand = D.classifyCandidate(l.url, id, { listed: true });
        if (!cand.ok || cand.source_class !== "own_site") { if (!cand.ok && !/government|legislature/.test(cand.why)) refuse(pid, l.url, cand.why, "open_states"); continue; }
        const got = await judgePage(pid, l.url, "open_states", { listed: true, detail: p.id, because: [`listed as a link on their Open States record ${p.id}`] });
        if (got?.entry.source_class === "own_site") await expandOwnSite(pid, got);
      }
      if (p.ids.youtube) {
        const ref = /^UC[A-Za-z0-9_-]{22}$/.test(p.ids.youtube) ? `channel/${p.ids.youtube}` : `@${p.ids.youtube.replace(/^@/, "")}`;
        await judgeYouTube(pid, `https://www.youtube.com/${ref}`, { ok: true, source_class: "youtube", channel_ref: ref }, "open_states", { detail: p.id, because: [`YouTube account listed on their Open States record ${p.id}`] });
      }
    });
  } catch (e) { console.error(`Open States stage failed: ${e.message}`); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ── 3. Tavily search, for rows with no own site yet ─────────────────────────
const EXCLUDE = ["ballotpedia.org", "wikipedia.org", "facebook.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "votesmart.org", "justfacts.votesmart.org", "opensecrets.org", "fec.gov", "followthemoney.org", "govtrack.us", "vote411.org", "ballotready.org", "rocketreach.co", "zoominfo.com"];
const officePhrase = (id) => String(id.office).replace(/\bCandidate\b/gi, "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
let searchStop = null;
const toSearch = live.filter((r) => !hasOwn(r.politician_id));
if (toSearch.length && MAX_SEARCHES > 0 && process.env.TAVILY_API_KEY) {
  await pool(toSearch, CONCURRENCY, async (r) => {
    if (searchStop || stats.searches >= MAX_SEARCHES) return;
    const pid = r.politician_id, id = ids.get(pid);
    const stateName = Object.entries(R.STATES).find(([, c]) => c === id.state)?.[0] || "";
    const query = `"${id.name.replace(/["“”]/g, "")}" ${officePhrase(id)} ${stateName.replace(/\b[a-z]/g, (c) => c.toUpperCase())}`.trim();
    stats.searches++;
    const j = await getJson("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, max_results: 10, search_depth: "basic", exclude_domains: EXCLUDE }) }, `tavily ${query}`);
    if (!j?.results) {
      stats.search_errors++;
      if ([401, 403, 429, 432, 433].includes(j?.status)) searchStop = `Tavily stopped the run: ${j.error}`;
      return;
    }
    for (const x of j.results.slice(0, 10)) {
      if ((found.get(pid) || []).length >= D.MAX_DISCOVERED_PER_POLITICIAN + 1) break;
      const got = await judgePage(pid, x.url, "search", { detail: `Tavily: ${query}`, because: [`found by searching "${query}"`] });
      if (got?.entry.source_class === "own_site" && got.entry.kind !== "issues_page") await expandOwnSite(pid, got);
    }
  });
} else if (toSearch.length && MAX_SEARCHES > 0) console.error("TAVILY_API_KEY not set — search stage skipped");

// ── assemble: uniqueness, preference, cap ───────────────────────────────────
const urlOwners = new Map(), hostOwners = new Map();
for (const [pid, list] of found) for (const e of list) {
  (urlOwners.get(R.normUrl(e.url)) || urlOwners.set(R.normUrl(e.url), new Set()).get(R.normUrl(e.url))).add(pid);
  if (e.source_class === "own_site") (hostOwners.get(R.hostOf(e.url)) || hostOwners.set(R.hostOf(e.url), new Set()).get(R.hostOf(e.url))).add(pid);
}
const politicians = {};
for (const pid of [...found.keys()].sort()) {
  const id = ids.get(pid);
  const ok = found.get(pid).filter((e) => {
    if (urlOwners.get(R.normUrl(e.url)).size > 1) { refuse(pid, e.url, "found for more than one politician", e.found_by); return false; }
    if (e.source_class === "own_site" && hostOwners.get(R.hostOf(e.url)).size > 1) { refuse(pid, e.url, "host found for more than one politician", e.found_by); return false; }
    return true;
  });
  // One own site per person. Several own-site hosts are a conflict (one may be
  // an opponent's look-alike): an official record (FEC filing, Open States)
  // settles it; search alone never does.
  const ownHosts = [...new Set(ok.filter((e) => e.source_class === "own_site").map((e) => R.hostOf(e.url)))];
  if (ownHosts.length > 1) {
    const official = [...new Set(ok.filter((e) => e.source_class === "own_site" && ["fec", "open_states"].includes(e.found_by)).map((e) => R.hostOf(e.url)))];
    const keep = official.length === 1 ? official[0] : null;
    for (let i = ok.length - 1; i >= 0; i--) {
      const e = ok[i];
      if (e.source_class !== "own_site" || R.hostOf(e.url) === keep) continue;
      refuse(pid, e.url, keep ? `another own site (${keep}) is the one their official record lists` : `more than one site claims to be theirs (${ownHosts.join(", ")})`, e.found_by);
      ok.splice(i, 1);
    }
    // A channel linked only from a refused site goes with it.
    for (let i = ok.length - 1; i >= 0; i--) if (ok[i].found_by === "own_site" && !ok.some((e) => e.source_class === "own_site" && ok[i].found_detail?.includes(R.hostOf(e.url)))) ok.splice(i, 1);
  }
  // An own site or channel is preferred: interviews only fill what is left.
  ok.sort((a, b) => D.DISCOVERY_ORDER.indexOf(a.source_class) - D.DISCOVERY_ORDER.indexOf(b.source_class) || (a.kind === "issues_page") - (b.kind === "issues_page"));
  // At most two pages of their own site (the home page first, then an issues
  // page), so their channel still fits under the cap.
  const rank = (e) => (e.kind === "issues_page" ? 1 : /^https?:\/\/[^/]+\/?$/.test(e.url) ? 0 : 2);
  const own = ok.filter((e) => e.source_class === "own_site").sort((a, b) => rank(a) - rank(b)).slice(0, 2);
  const kept = [...own, ...ok.filter((e) => e.source_class !== "own_site")].slice(0, D.MAX_DISCOVERED_PER_POLITICIAN);
  if (kept.length) politicians[pid] = { name: id.name, office: id.office, state: id.state, urls: kept };
}

const count = (f) => Object.values(politicians).reduce((n, p) => n + p.urls.filter(f).length, 0);
const doc = {
  _note: "Sources DISCOVERED for the raw-ingest URL resolver's step 5 (netlify/lib/raw-ingest-resolve.mjs resolveDiscovered) by the offline job scripts/discover-raw-ingest-sources-2026-11.mjs, under the rules in netlify/lib/raw-ingest-discovery.mjs. Only tier-3 rows page-less after steps 1–4 were searched. Each URL carries its source type, how it was found (`found_by`: fec / open_states / own_site / search) and `accepted_because` (every check it passed). `refused` counts what was turned down and why; `refused_sample` lists some. The roster build reads this file; the cron never searches or fetches for it. Re-run the job to refresh; never edited by hand.",
  version: D.DISCOVERY_VERSION,
  run_on: today,
  summary: { ...stats, ...(searchStop ? { search_stopped: searchStop } : {}), politicians: Object.keys(politicians).length,
    urls: count(() => true), own_site: count((e) => e.source_class === "own_site"), youtube: count((e) => e.source_class === "youtube"), direct_statement: count((e) => e.source_class === "direct_statement") },
  refused: Object.fromEntries([...refused].sort((a, b) => b[1] - a[1])),
  refused_sample: refusedSample,
  politicians,
};
if (ONLY || LIMIT !== Infinity) {
  console.log(JSON.stringify({ summary: doc.summary, politicians, refused: doc.refused, refused_sample: refusedSample.slice(0, 120), ...(fecMerge ? { fec_money: { ...fecMerge.outcome, rows: Object.fromEntries(fecMerge.outcome.attached.map((p) => [p, fecMerge.table[p]])) } } : {}) }, null, 1));
  console.log("(--only / --limit: nothing written)");
} else {
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
  if (fecMerge) fs.writeFileSync(FTM, M.replaceFecSummaryBlock(fs.readFileSync(FTM, "utf8"), fecMerge.table));
  console.log(`discovered: ${JSON.stringify(doc.summary)} → ${path.relative(root, OUT)}`);
}
