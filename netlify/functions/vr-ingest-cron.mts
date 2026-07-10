// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — scheduled ingest cron · Phase 7
// ─────────────────────────────────────────────────────────────────────────────
// Runs on a schedule and pulls the latest roll calls from Congress.gov into the
// vr_* tables, then refreshes the affected members' offline packs. It lives
// entirely OFF the read path: the UI serves the curated seed regardless, and this
// job simply layers more records on over time.
//
// SAFE BY DEFAULT: with no CONGRESS_GOV_API_KEY set it is a clean no-op (logs and
// returns), exactly like pdx-digest-cron when no mail provider is configured — so
// the deploy is green and no secret is ever hard-coded. Configure these to enable:
//   CONGRESS_GOV_API_KEY   — a Congress.gov API key (https://api.congress.gov)
//   VR_INGEST_CONGRESS     — optional; which Congress to pull (default 119)
//   VR_INGEST_LIMIT        — optional; roll calls per chamber per run (default 40)

import type { Config } from "@netlify/functions";
import { runIngest } from "../lib/vr-ingest.js";

export default async (): Promise<Response> => {
  if (!process.env.CONGRESS_GOV_API_KEY) {
    console.log("vr-ingest-cron: CONGRESS_GOV_API_KEY not set — no-op.");
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const congress = Number(process.env.VR_INGEST_CONGRESS || 119);
  const limit = Number(process.env.VR_INGEST_LIMIT || 40);
  const reports: any[] = [];
  for (const chamber of ["house", "senate"]) {
    try {
      reports.push({ chamber, ...(await runIngest({ congress, chamber, limit })) });
    } catch (e: any) {
      reports.push({ chamber, error: e?.message || String(e) });
    }
  }
  console.log("vr-ingest-cron:", JSON.stringify(reports));
  return new Response(JSON.stringify({ reports }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// Daily at 07:00 UTC — after the previous day's roll calls have posted.
export const config: Config = {
  schedule: "0 7 * * *",
};
