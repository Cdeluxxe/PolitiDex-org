// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-core.mjs — Phase 3 ingestion pipeline, RAW STORE ONLY
// ─────────────────────────────────────────────────────────────────────────────
// Pulls one configured source and stores exactly what came back: body, URL,
// timestamp, source type. It does NOT parse, score, or derive a stance — no
// position, no confidence, no contradiction flags. The ground-truth record in
// db/stance-ground-truth-talarico-cost-of-living.json is the benchmark a later
// phase compares against; this module never reads or writes it.
//
// Pure and dependency-injected (fetch, store, now) so the test suite can invoke
// it without network or a Blobs environment.

export const RAW_STORE_NAME = "raw-ingest";

// One politician × one topic × one source, for now.
export const SOURCES = [
  {
    politician_id: "james_talarico",
    topic: "cost_living",
    source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/taxes-cost-of-living/",
  },
];

// Hard ceiling on stored body size (bytes of text) — a campaign page is far
// smaller; this only guards against a runaway response.
export const MAX_BODY_CHARS = 2_000_000;

export function rawKey(src, fetchedAt) {
  // e.g. james_talarico/cost_living/2026-11-07T07-00-00-000Z.json
  return `${src.politician_id}/${src.topic}/${fetchedAt.replace(/[:.]/g, "-")}.json`;
}

export async function pullOne(src, { fetch, store, now = () => new Date() }) {
  const fetchedAt = now().toISOString();
  try {
    const res = await fetch(src.url, {
      headers: { "user-agent": "PolitiDex raw-ingest (+https://politidex.fyi)", accept: "text/html,*/*" },
      redirect: "follow",
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
  const results = [];
  for (const src of sources) results.push(await pullOne(src, deps));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`raw-ingest: run complete — ${results.length - failed} ok, ${failed} failed`);
  return { ok: failed === 0, results };
}
