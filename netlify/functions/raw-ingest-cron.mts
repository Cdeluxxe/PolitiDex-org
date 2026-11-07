// ─────────────────────────────────────────────────────────────────────────────
// Raw ingest — scheduled cron · Phase 3 (raw store only)
// ─────────────────────────────────────────────────────────────────────────────
// Every 4 hours (6 runs/day) pulls the 9 configured campaign pages — Talarico's
// "Taxes & Cost of Living" page plus related pages for Talarico, Hinojosa,
// Paxton and Abbott (see SOURCES in raw-ingest-core.mjs) — and stores each one
// untouched (HTML, URL, timestamp, source type) as its own record in the
// "raw-ingest" Blobs store. ~54 records/day. A failed source writes nothing and
// does not stop the others. No parsing, no stance, no scoring. Every run logs a single
// "raw-ingest: OK …" / "raw-ingest: FAIL …" line per source plus a summary line,
// so a run can be verified from the function logs.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runRawIngest, RAW_STORE_NAME } from "../lib/raw-ingest-core.mjs";

// Exported so the test suite can invoke this exact entry point with fakes.
export async function run(deps: { fetch: typeof fetch; store: any; now?: () => Date }) {
  const report = await runRawIngest(deps);
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
