// ─────────────────────────────────────────────────────────────────────────────
// Raw ingest — scheduled cron · Phase 3 (raw store only)
// ─────────────────────────────────────────────────────────────────────────────
// Every 4 hours (6 runs/day) pulls the 8 configured pages — 5 politicians
// (Talarico, Hinojosa, Abbott, Paxton, Cornyn) across 2 topics (cost_living,
// healthcare_costs); see SOURCES in raw-ingest-core.mjs — and stores each one
// untouched (HTML, URL, timestamp, source type) as its own record in the
// "raw-ingest" Blobs store. ~48 records/day. A failed source writes nothing and
// does not stop the others.
//
// Phase 5: after each record is stored, the existing Phase 4 scorer runs on it
// and LOGS a candidate stance (position + confidence) and whether the rules
// found a clear position. LOG ONLY — no candidate is written to the raw store,
// the ground-truth file, or any live stance store. Every run logs one
// "raw-ingest: OK …" / "raw-ingest: FAIL …" line per source plus a summary.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runRawIngest, RAW_STORE_NAME } from "../lib/raw-ingest-core.mjs";
import { logCandidateStance } from "../lib/stance-score-core.mjs";

// Exported so the test suite can invoke this exact entry point with fakes.
export async function run(deps: { fetch: typeof fetch; store: any; now?: () => Date; log?: (l: string) => void }) {
  const log = deps.log ?? ((l: string) => console.log(l));
  const report = await runRawIngest({ ...deps, onRecord: (rec: any) => { logCandidateStance(rec, { log }); } });
  const okCount = report.results.filter((r: any) => r.ok).length;
  // 200 all sources stored · 207 some failed (the rest still stored) · 502 none stored
  const status = report.ok ? 200 : okCount > 0 ? 207 : 502;
  return new Response(JSON.stringify(report), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (): Promise<Response> =>
  run({ fetch: globalThis.fetch, store: getStore(RAW_STORE_NAME) });

// Every 4 hours, on the hour (00, 04, 08, 12, 16, 20 UTC).
export const config: Config = {
  schedule: "0 */4 * * *",
};
