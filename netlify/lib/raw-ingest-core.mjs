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

// Load-test source set: 9 real, stable campaign pages across 4 politicians on
// cost of living and closely related economic topics. Each source's key is
// unique: (politician_id, topic) alone when that pair has one source, plus a
// `source_id` slug when a pair has more than one — so every source writes its
// own raw record per run and the original Talarico key layout is unchanged.
// The first entry is the Phase 2 ground-truth source and stays first.
export const SOURCES = [
  { politician_id: "james_talarico", topic: "cost_living", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/taxes-cost-of-living/" },
  { politician_id: "james_talarico", topic: "healthcare_costs", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/health-care/" },
  { politician_id: "james_talarico", topic: "econ_workers", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/labor-business/" },
  { politician_id: "james_talarico", topic: "energy_production", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/energy-environment/" },
  { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "campaign priority page",
    url: "https://ginafortexas.com/priority/an-affordable-texas-that-works-for-everyone/" },
  { politician_id: "ken_paxton", topic: "lower_taxes", source_type: "campaign issues page",
    url: "https://www.kenpaxton.com/issues" },
  { politician_id: "greg_abbott", topic: "cost_living", source_type: "campaign policy page",
    url: "https://www.gregabbott.com/policy/" },
  { politician_id: "greg_abbott", topic: "cost_living", source_type: "campaign newsletter post",
    source_id: "affordability-agenda",
    url: "https://govgregabbott.substack.com/p/the-path-to-number-one-governor-abbotts" },
  { politician_id: "greg_abbott", topic: "property_tax", source_type: "campaign accomplishments page",
    url: "https://www.gregabbott.com/accomplishments/" },
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

export async function pullOne(src, { fetch, store, now = () => new Date() }) {
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
    return { ok: true, key, url: src.url, fetched_at: fetchedAt, body_chars: body.length };
  } catch (e) {
    const error = e?.message || String(e);
    console.log(`raw-ingest: FAIL ${src.url} at ${fetchedAt} — ${error}`);
    return { ok: false, url: src.url, fetched_at: fetchedAt, error };
  }
}

export async function runRawIngest(deps, sources = SOURCES) {
  // Concurrent; pullOne never throws, so one failed source cannot block the rest.
  // Results (and the summary) keep source order.
  const results = await Promise.all(sources.map((src) => pullOne(src, deps)));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`raw-ingest: run complete — ${results.length - failed} ok, ${failed} failed`);
  return { ok: failed === 0, results };
}
