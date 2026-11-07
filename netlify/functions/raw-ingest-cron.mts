// ─────────────────────────────────────────────────────────────────────────────
// Raw ingest — scheduled cron · Phase 3 (raw store only)
// ─────────────────────────────────────────────────────────────────────────────
// Pulls Talarico's campaign "Taxes & Cost of Living" page once a day and stores
// the untouched HTML, URL, timestamp and source type in the "raw-ingest" Blobs
// store. No parsing, no stance, no scoring. Every run logs a single
// "raw-ingest: OK …" / "raw-ingest: FAIL …" line per source plus a summary line,
// so a run can be verified from the function logs.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runRawIngest, RAW_STORE_NAME } from "../lib/raw-ingest-core.mjs";

// Exported so the test suite can invoke this exact entry point with fakes.
export async function run(deps: { fetch: typeof fetch; store: any; now?: () => Date }) {
  const report = await runRawIngest(deps);
  return new Response(JSON.stringify(report), {
    status: report.ok ? 200 : 502,
    headers: { "content-type": "application/json" },
  });
}

export default async (): Promise<Response> =>
  run({ fetch: globalThis.fetch, store: getStore(RAW_STORE_NAME) });

// Daily at 08:00 UTC.
export const config: Config = {
  schedule: "0 8 * * *",
};
