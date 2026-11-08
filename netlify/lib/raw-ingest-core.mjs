// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-core.mjs — Phase 3 ingestion pipeline, RAW STORE ONLY
// ─────────────────────────────────────────────────────────────────────────────
// Pulls each configured source and stores exactly what came back: body, URL,
// timestamp, source type. It does NOT parse, score, or derive a stance — no
// position, no confidence, no contradiction flags. The ground-truth record in
// db/stance-ground-truth-talarico-cost-of-living.json is the benchmark a later
// phase compares against; this module never reads or writes it.
//
// Pure and dependency-injected (fetch, store, now) so the test suite can invoke
// it without network or a Blobs environment.

export const RAW_STORE_NAME = "raw-ingest";

// Phase 5 source set: 8 real, stable campaign/official pages, 5 politicians,
// 2 topics (cost_living — the ground-truth topic — and healthcare_costs).
// Each source's key is unique: (politician_id, topic) alone when that pair has
// one source, plus a `source_id` slug when a pair has more than one — so every
// source writes its own raw record per run and the original Talarico key
// layout is unchanged. The first entry is the Phase 2 ground-truth source.
export const SOURCES = [
  // ── cost_living ──
  { politician_id: "james_talarico", topic: "cost_living", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/taxes-cost-of-living/" },
  { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "campaign priority page",
    url: "https://ginafortexas.com/priority/an-affordable-texas-that-works-for-everyone/" },
  { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "speech (victory remarks transcript)",
    source_id: "victory-remarks",
    url: "https://ginafortexas.com/2026/11/remarks-governor-elect-hinojosa-declares-victory-in-texas-governors-race/" },
  { politician_id: "greg_abbott", topic: "cost_living", source_type: "campaign policy page",
    url: "https://www.gregabbott.com/policy/" },
  { politician_id: "greg_abbott", topic: "cost_living", source_type: "campaign newsletter post",
    source_id: "affordability-agenda",
    url: "https://govgregabbott.substack.com/p/the-path-to-number-one-governor-abbotts" },
  // ── healthcare_costs ──
  { politician_id: "james_talarico", topic: "healthcare_costs", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/health-care/" },
  { politician_id: "ken_paxton", topic: "healthcare_costs", source_type: "campaign issues page",
    url: "https://www.kenpaxton.com/issues" },
  { politician_id: "john_cornyn", topic: "healthcare_costs", source_type: "official Senate issue page",
    url: "https://www.cornyn.senate.gov/issues/health-care/" },
];

// Per-source fetch ceiling. Sources are pulled concurrently, so a whole run
// stays well inside the scheduled-function time limit even if one site hangs.
export const FETCH_TIMEOUT_MS = 20_000;

// Hard ceiling on stored body size (bytes of text) — a campaign page is far
// smaller; this only guards against a runaway response.
export const MAX_BODY_CHARS = 2_000_000;

export function rawKey(src, fetchedAt) {
  // e.g. james_talarico/cost_living/2026-11-07T07-00-00-000Z.json
  //      greg_abbott/cost_living/affordability-agenda/2026-11-07T07-00-00-000Z.json
  const ts = fetchedAt.replace(/[:.]/g, "-");
  const parts = [src.politician_id, src.topic, src.source_id].filter(Boolean);
  return `${parts.join("/")}/${ts}.json`;
}

export async function pullOne(src, { fetch, store, now = () => new Date(), onRecord }) {
  const fetchedAt = now().toISOString();
  try {
    const res = await fetch(src.url, {
      headers: { "user-agent": "PolitiDex raw-ingest (+https://politidex.fyi)", accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const body = (await res.text()).slice(0, MAX_BODY_CHARS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!body.trim()) throw new Error("empty body");
    const record = {
      url: src.url,
      final_url: res.url || src.url,
      fetched_at: fetchedAt,
      source_type: src.source_type,
      politician_id: src.politician_id,
      topic: src.topic,
      ...(src.source_id ? { source_id: src.source_id } : {}),
      http_status: res.status,
      content_type: res.headers?.get?.("content-type") || null,
      body_chars: body.length,
      body,
    };
    const key = rawKey(src, fetchedAt);
    await store.setJSON(key, record);
    console.log(`raw-ingest: OK ${src.url} → ${RAW_STORE_NAME}/${key} (${body.length} chars, HTTP ${res.status})`);
    // Optional post-store hook (Phase 5: log-only candidate scoring). It runs
    // only after the record is safely stored, gets a frozen copy, and its
    // errors are contained here — it can never undo a store or stop the run.
    if (onRecord) {
      try { await onRecord(Object.freeze({ ...record, key })); }
      catch (e) { console.log(`raw-ingest: hook error for ${key} — ${e?.message || e}`); }
    }
    return { ok: true, key, url: src.url, fetched_at: fetchedAt, body_chars: body.length };
  } catch (e) {
    const error = e?.message || String(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error };
  }
}

// ── Phase 6: simple discovery ────────────────────────────────────────────────
// One additional known URL pattern per politician already in SOURCES — their
// issues/priorities index or an official newsroom page. Each run checks every
// pattern once; a page that answers as a stable page (see isStablePage) and is
// not already in the pull list is added to THAT run's pull list only (nothing
// is persisted), until the run reaches MAX_SOURCES_PER_RUN. Each discovered
// page keeps the politician's existing topic and carries a `source_id` so its
// raw record key never collides with the configured source's key.
export const MAX_SOURCES_PER_RUN = 11; // "under 12"

export const DISCOVERY_PATTERNS = [
  { politician_id: "james_talarico", topic: "cost_living", source_type: "campaign issues index",
    source_id: "discovered-issues-index", url: "https://jamestalarico.com/issues/" },
  { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "campaign priorities index",
    source_id: "discovered-priorities-index", url: "https://ginafortexas.com/priorities/" },
  { politician_id: "greg_abbott", topic: "cost_living", source_type: "official newsroom index",
    source_id: "discovered-newsroom", url: "https://gov.texas.gov/news" },
  { politician_id: "ken_paxton", topic: "healthcare_costs", source_type: "official newsroom index",
    source_id: "discovered-newsroom", url: "https://www.texasattorneygeneral.gov/news/releases" },
  { politician_id: "john_cornyn", topic: "healthcare_costs", source_type: "official Senate key-issue page",
    source_id: "discovered-key-issue", url: "https://www.cornyn.senate.gov/key-issues/health-care/" },
];

export const MIN_STABLE_BODY_CHARS = 200;

const normUrl = (u) => {
  try { const x = new URL(u); x.hash = ""; return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); }
  catch { return String(u || "").toLowerCase(); }
};

/**
 * A stable page: HTTP 2xx, HTML (when a content type is given), a real body,
 * and it did not redirect off-host or to the site's home page.
 */
export function isStablePage(requestedUrl, res, body) {
  if (!res?.ok) return { ok: false, why: `HTTP ${res?.status}` };
  const ct = res.headers?.get?.("content-type") || "";
  if (ct && !/html/i.test(ct)) return { ok: false, why: `not HTML (${ct})` };
  if (String(body || "").trim().length < MIN_STABLE_BODY_CHARS) return { ok: false, why: "body too small" };
  try {
    const want = new URL(requestedUrl), got = new URL(res.url || requestedUrl);
    if (got.hostname.replace(/^www\./, "") !== want.hostname.replace(/^www\./, "")) return { ok: false, why: `redirected off-host to ${got.hostname}` };
    if (want.pathname.replace(/\/+$/, "") && !got.pathname.replace(/\/+$/, "")) return { ok: false, why: "redirected to home page" };
  } catch { return { ok: false, why: "bad URL" }; }
  return { ok: true, why: "stable" };
}

/**
 * Check each pattern whose politician is in `sources`; return the pull list
 * extended with every new stable page, never exceeding `max` entries.
 * Never throws. Logs one "discovery:" line per pattern plus a summary.
 */
export async function discoverSources(sources, { fetch, log = console.log, patterns = DISCOVERY_PATTERNS, max = MAX_SOURCES_PER_RUN, restrict = true } = {}) {
  const known = new Set(sources.map((s) => normUrl(s.url)));
  const pols = new Set(sources.map((s) => s.politician_id));
  // `restrict: false` (the rotation planner) checks every pattern it was given:
  // a politician whose only page this run is their official pattern still counts.
  const eligible = restrict ? patterns.filter((p) => pols.has(p.politician_id)) : patterns;
  const checks = await Promise.all(eligible.map(async (p) => {
    if (known.has(normUrl(p.url))) return { p, ok: false, why: "already in pull list" };
    try {
      const res = await fetch(p.url, {
        headers: { "user-agent": "PolitiDex raw-ingest (+https://politidex.fyi)", accept: "text/html,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const body = await res.text();
      return { p, ...isStablePage(p.url, res, body) };
    } catch (e) {
      return { p, ok: false, why: e?.message || String(e) };
    }
  }));
  const out = [...sources];
  const added = [];
  for (const c of checks) {
    if (!c.ok) { log(`discovery: SKIP ${c.p.politician_id} ${c.p.url} — ${c.why}`); continue; }
    if (out.length >= max) { log(`discovery: CAP ${c.p.politician_id} ${c.p.url} — stable, but the run is at ${max} sources`); continue; }
    known.add(normUrl(c.p.url));
    out.push(c.p);
    added.push(c.p);
    log(`discovery: NEW ${c.p.politician_id}|${c.p.topic} ${c.p.url} (${c.p.source_type}${c.p.official_kind ? " · " + (OFFICIAL_KINDS[c.p.official_kind] || c.p.official_kind) : ""}) — added to this run's pull list`);
  }
  log(`discovery: ${added.length} new URL(s) added — ${out.length} source(s) this run (cap ${max})`);
  return { sources: out, added };
}

export async function runRawIngest(deps, sources = SOURCES) {
  // Concurrent; pullOne never throws, so one failed source cannot block the rest.
  // Results (and the summary) keep source order.
  const results = await Promise.all(sources.map((src) => pullOne(src, deps)));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`raw-ingest: run complete — ${results.length - failed} ok, ${failed} failed`);
  return { ok: failed === 0, results };
}

// ── Roster rotation + official sources ──────────────────────────────────────
// The fixed five above stay the configured core. ROSTER widens the pool: each
// entry is one politician, the topic pages to pull for them, and ONE official
// government pattern (state legislature member/news page, a member's House or
// Senate newsroom — the Congress pattern — or a governor/agency newsroom).
//
// PRIORITY. `has_board` = the politician holds a seat with a district board
// (SEAT_HOLDERS); `has_stances` = at least one stated position on file
// (ISSUE_STANCE_DATA). Tier 1 has both, tier 2 has one, tier 3 neither (kept
// only because it was in the original five). The rotation order is tier, then
// roster order, so prioritised people are always reached first in a cycle.
//
// ROTATION. planRun(cursor) walks the ordered roster from `cursor`, adding
// whole politicians (their pages + their official pattern) while the run stays
// within MAX_SOURCES_PER_RUN. The next run starts where this one stopped, so
// successive runs check different people and every politician is reached once
// per cycle. The cursor lives in its own tiny Blobs store (ROTATION_STORE_NAME);
// a missing or bad cursor starts at 0.
//
// Congress.gov member pages answer automated fetches with HTTP 403, so they
// fail the stable-page check; the member's own House/Senate newsroom is the
// Congress pattern used here.
export const ROTATION_STORE_NAME = "raw-ingest-rotation";
export const ROTATION_KEY = "cursor.json";

const bySrc = (pid) => SOURCES.filter((s) => s.politician_id === pid);

export const OFFICIAL_KINDS = {
  state_legislature: "state legislature page",
  congress: "Congress member newsroom",
  executive: "governor/agency newsroom",
};

export const ROSTER = [
  // ── Tier 1 · board + stated positions ──
  { politician_id: "greg_abbott", tier: 1, has_board: true, has_stances: true,
    sources: bySrc("greg_abbott"),
    official: { politician_id: "greg_abbott", topic: "cost_living", source_type: "official governor newsroom",
      official_kind: "executive", source_id: "official-newsroom", url: "https://gov.texas.gov/news" } },
  { politician_id: "john_cornyn", tier: 1, has_board: true, has_stances: true,
    sources: bySrc("john_cornyn"),
    official: { politician_id: "john_cornyn", topic: "healthcare_costs", source_type: "official Senate key-issue page",
      official_kind: "congress", source_id: "official-key-issue", url: "https://www.cornyn.senate.gov/key-issues/health-care/" } },
  { politician_id: "chip_roy", tier: 1, has_board: true, has_stances: true,
    sources: [{ politician_id: "chip_roy", topic: "healthcare_costs", source_type: "official House issue page",
      url: "https://roy.house.gov/issues/health" }],
    official: { politician_id: "chip_roy", topic: "healthcare_costs", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://roy.house.gov/media/press-releases" } },
  { politician_id: "crockett", tier: 1, has_board: true, has_stances: true,
    sources: [
      { politician_id: "crockett", topic: "cost_living", source_type: "official House issue page",
        url: "https://crockett.house.gov/issues/economy-jobs-housing" },
      { politician_id: "crockett", topic: "healthcare_costs", source_type: "official House issue page",
        url: "https://crockett.house.gov/issues/health" },
    ],
    official: { politician_id: "crockett", topic: "cost_living", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://crockett.house.gov/media/press-releases" } },
  { politician_id: "aoc", tier: 1, has_board: true, has_stances: true,
    sources: [
      { politician_id: "aoc", topic: "healthcare_costs", source_type: "official House issue page",
        url: "https://ocasio-cortez.house.gov/legislation/healthcare" },
      { politician_id: "aoc", topic: "cost_living", source_type: "official House issue page",
        url: "https://ocasio-cortez.house.gov/legislation/economy" },
    ],
    official: { politician_id: "aoc", topic: "cost_living", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://ocasio-cortez.house.gov/media/press-releases" } },
  { politician_id: "maloy", tier: 1, has_board: true, has_stances: true,
    sources: [{ politician_id: "maloy", topic: "cost_living", source_type: "official House issue page",
      url: "https://maloy.house.gov/issues/issue/?IssueID=14891" }],
    official: { politician_id: "maloy", topic: "cost_living", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://maloy.house.gov/news/documentquery.aspx?DocumentTypeID=27" } },
  { politician_id: "cox", tier: 1, has_board: true, has_stances: true,
    sources: [],
    official: { politician_id: "cox", topic: "cost_living", source_type: "official governor newsroom",
      official_kind: "executive", source_id: "official-newsroom", url: "https://governor.utah.gov/news/" } },
  // ── Tier 2 · board or stated positions ──
  { politician_id: "james_talarico", tier: 2, has_board: false, has_stances: true,
    sources: bySrc("james_talarico"),
    official: { politician_id: "james_talarico", topic: "cost_living", source_type: "official state legislature member page",
      official_kind: "state_legislature", source_id: "official-legislature", url: "https://house.texas.gov/members/50" } },
  { politician_id: "ken_paxton", tier: 2, has_board: false, has_stances: true,
    sources: bySrc("ken_paxton"),
    official: { politician_id: "ken_paxton", topic: "healthcare_costs", source_type: "official agency newsroom",
      official_kind: "executive", source_id: "official-newsroom", url: "https://www.texasattorneygeneral.gov/news/releases" } },
  { politician_id: "lloyd_doggett", tier: 2, has_board: true, has_stances: false,
    sources: [
      { politician_id: "lloyd_doggett", topic: "healthcare_costs", source_type: "official House issue page",
        url: "https://doggett.house.gov/issues/healthcare-0" },
      { politician_id: "lloyd_doggett", topic: "cost_living", source_type: "official House issue page",
        url: "https://doggett.house.gov/issues/growing-our-economy-0" },
    ],
    official: { politician_id: "lloyd_doggett", topic: "cost_living", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://doggett.house.gov/media/press-releases" } },
  { politician_id: "casar", tier: 2, has_board: false, has_stances: true,
    sources: [{ politician_id: "casar", topic: "healthcare_costs", source_type: "official House issue page",
      url: "https://casar.house.gov/issues/health-care" }],
    official: { politician_id: "casar", topic: "healthcare_costs", source_type: "official House newsroom",
      official_kind: "congress", source_id: "official-newsroom", url: "https://casar.house.gov/media/press-releases" } },
  { politician_id: "dan_patrick", tier: 2, has_board: false, has_stances: true,
    sources: [],
    official: { politician_id: "dan_patrick", topic: "cost_living", source_type: "official lieutenant governor newsroom",
      official_kind: "executive", source_id: "official-newsroom", url: "https://www.ltgov.texas.gov/news/" } },
  // ── Tier 3 · carried over from the original five ──
  { politician_id: "gina_hinojosa", tier: 3, has_board: false, has_stances: false,
    sources: bySrc("gina_hinojosa"),
    official: { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "official state legislature member page",
      official_kind: "state_legislature", source_id: "official-legislature", url: "https://house.texas.gov/members/49" } },
];

export const ORIGINAL_FIVE = ["james_talarico", "gina_hinojosa", "greg_abbott", "ken_paxton", "john_cornyn"];

/** Roster in rotation order: tier first, then roster order (stable). */
export function rotationOrder(roster = ROSTER) {
  return roster.map((r, i) => ({ r, i })).sort((a, b) => (a.r.tier - b.r.tier) || (a.i - b.i)).map((x) => x.r);
}

/** "campaign" | "official" | "other" for one source (for the run log). */
export function sourceKind(src) {
  const st = String(src?.source_type || "");
  if (/\bofficial\b/i.test(st)) return "official";
  try { if (/\.(gov|mil)$/i.test(new URL(src.url).hostname)) return "official"; } catch {}
  if (/\bcampaign\b/i.test(st)) return "campaign";
  return "other";
}

/**
 * The pull list for one run. Walks the ordered roster from `cursor`, taking
 * whole politicians — their pages plus one slot for their official pattern
 * when it is not already one of their pages — while the total stays ≤ `max`.
 * Returns { sources, patterns, politicians, cursor, next_cursor, size }.
 * Never returns more than `max` sources even after every pattern is added.
 */
export function planRun(cursor = 0, { roster = ROSTER, max = MAX_SOURCES_PER_RUN } = {}) {
  const order = rotationOrder(roster);
  const n = order.length;
  const start = n ? ((Math.trunc(Number(cursor) || 0) % n) + n) % n : 0;
  const sources = [], patterns = [], politicians = [];
  const seen = new Set();
  let used = 0, taken = 0;
  for (; taken < n; taken++) {
    const r = order[(start + taken) % n];
    const pages = (r.sources || []).filter((s) => !seen.has(normUrl(s.url)));
    const off = r.official && !seen.has(normUrl(r.official.url)) && !pages.some((s) => normUrl(s.url) === normUrl(r.official.url)) ? r.official : null;
    const cost = pages.length + (off ? 1 : 0);
    if (!cost) continue;
    if (used + cost > max) {
      if (taken === 0) {
        // A single politician larger than the cap: take what fits.
        const fit = pages.slice(0, Math.max(0, max - (off ? 1 : 0)));
        fit.forEach((s) => { sources.push(s); seen.add(normUrl(s.url)); });
        if (off && fit.length < max) { patterns.push(off); seen.add(normUrl(off.url)); }
        politicians.push(r.politician_id);
        taken = 1;
      }
      break;
    }
    pages.forEach((s) => { sources.push(s); seen.add(normUrl(s.url)); });
    if (off) { patterns.push(off); seen.add(normUrl(off.url)); }
    politicians.push(r.politician_id);
    used += cost;
  }
  const next = n ? (start + Math.max(taken, 1)) % n : 0;
  return { sources, patterns, politicians, cursor: start, next_cursor: next, size: sources.length + patterns.length };
}

/** One summary line: who and which source types were included in this run. */
export function runPlanLine(sources) {
  const pols = [...new Set(sources.map((s) => s.politician_id))];
  const kinds = {}, types = {};
  for (const s of sources) {
    const k = sourceKind(s);
    kinds[k] = (kinds[k] || 0) + 1;
    types[s.source_type] = (types[s.source_type] || 0) + 1;
  }
  return { politicians: pols, kinds, source_types: types, count: sources.length };
}
