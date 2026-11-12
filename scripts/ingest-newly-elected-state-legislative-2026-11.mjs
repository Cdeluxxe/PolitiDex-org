#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ingest-newly-elected-state-legislative-2026-11.mjs
//
// One ingest run over db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json.
// Each page goes through the existing pullOne() from raw-ingest-core.mjs, so
// the stored record is the usual raw record (url, final_url, fetched_at,
// source_type, politician_id, topic, source_id, http_status, content_type,
// body) under the usual key in the "raw-ingest" Blobs store. No onRecord hook:
// nothing is scored at ingest time and nothing is written to the Evidence
// Locker. Re-scoring is offline (rescore-newly-elected-state-legislative-2026-11.mjs).
//
//   node scripts/ingest-newly-elected-state-legislative-2026-11.mjs           # pull + store in Blobs
//   node scripts/ingest-newly-elected-state-legislative-2026-11.mjs --dry-run # pull only, store nothing
//
// Needs NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN (or NETLIFY_API_TOKEN) to reach
// the site's Blobs store from outside a Netlify runtime.
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "@netlify/blobs";
import { pullOne, RAW_STORE_NAME } from "../netlify/lib/raw-ingest-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROSTER = JSON.parse(fs.readFileSync(path.join(root, "db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json"), "utf8"));
const dry = process.argv.includes("--dry-run");
const CONCURRENCY = 8;

const memStore = () => ({ async setJSON() {} });
const store = dry ? memStore() : getStore({
  name: RAW_STORE_NAME,
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN,
});

// Strip roster-only fields so the stored record is the usual shape.
const sources = ROSTER.roster.flatMap((r) => r.sources.map(({ curated, curated_label, ...s }) => s));

const results = [];
for (let i = 0; i < sources.length; i += CONCURRENCY) {
  const batch = sources.slice(i, i + CONCURRENCY);
  results.push(...await Promise.all(batch.map((src) => pullOne(src, { fetch: globalThis.fetch, store }).then((r) => ({ ...r, politician_id: src.politician_id, topic: src.topic, source_id: src.source_id })))));
}
const ok = results.filter((r) => r.ok);
console.log(`ingest: ${ok.length} stored, ${results.length - ok.length} failed of ${results.length}${dry ? " (dry run — nothing stored)" : ` → ${RAW_STORE_NAME}`}`);
const manifest = path.join(root, "db/raw-ingest-run-newly-elected-state-legislative-2026-11.json");
if (!dry) {
  fs.writeFileSync(manifest, JSON.stringify({
    _note: "Manifest of the one ingest run over the newly elected state legislative roster: one row per page with the raw-ingest Blobs key it was stored under (or the fetch error). The raw text lives in the raw-ingest store, not in the repo.",
    store: RAW_STORE_NAME,
    run_at: results[0]?.fetched_at,
    stored: ok.length,
    failed: results.length - ok.length,
    results: results.map((r) => ({ politician_id: r.politician_id, topic: r.topic, ...(r.source_id ? { source_id: r.source_id } : {}), url: r.url, fetched_at: r.fetched_at, ok: r.ok, ...(r.ok ? { key: r.key, body_chars: r.body_chars } : { error: r.error }) })),
  }, null, 2) + "\n");
  console.log(`ingest: manifest → ${path.relative(root, manifest)}`);
}
