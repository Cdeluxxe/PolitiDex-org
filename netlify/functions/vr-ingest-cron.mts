// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — scheduled ingest cron · Phase 7
// ─────────────────────────────────────────────────────────────────────────────
// Runs on a schedule and pulls the latest roll calls from Congress.gov into the
// vr_* tables — including each affected measure's legislative-action timeline
// (vr_measure_actions) — then refreshes the affected members' offline packs. It lives
// entirely OFF the read path: the UI serves the curated seed regardless, and this
// job simply layers more records on over time.
//
// SAFE BY DEFAULT: with no CONGRESS_GOV_API_KEY set it is a clean no-op (logs and
// returns), exactly like pdx-digest-cron when no mail provider is configured — so
// the deploy is green and no secret is ever hard-coded. Configure these to enable:
//   CONGRESS_GOV_API_KEY   — a Congress.gov API key (https://api.congress.gov)
//   VR_INGEST_CONGRESS     — optional; which Congress to pull (default 119)
//   VR_INGEST_LIMIT        — optional; roll calls per chamber per run (default 40)
//   VR_RECONCILE_LIMIT     — optional; roll calls reconciled per run (default 200)
//   VR_RECONCILE_DISABLED=1 — skip the reconcile step
//
// RECONCILE (no key needed). After the ingest, vr_member_votes rows that
// disagree with pdx_vote_actions (the vote-actions cron's table, the source
// of truth for how a member voted) are corrected to match it, and the affected
// members' packs are refreshed. Cells with an approved correction overlay are
// left alone. See netlify/lib/vr-vote-source.ts.

import type { Config } from "@netlify/functions";
import { runIngest } from "../lib/vr-ingest.js";
import { reconcileAndRefresh } from "../lib/vr-reconcile.js";

async function reconcile(): Promise<any> {
  if (process.env.VR_RECONCILE_DISABLED === "1") return { skipped: "VR_RECONCILE_DISABLED=1" };
  try {
    const r = await reconcileAndRefresh({ limit: Number(process.env.VR_RECONCILE_LIMIT || 200) });
    return { rollcalls: r.rollcalls, compared: r.compared, updated: r.updated, protectedByCorrection: r.protectedByCorrection, packsWritten: r.packsWritten, skipped: r.skipped, errors: r.errors.slice(0, 10) };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}

export default async (): Promise<Response> => {
  if (!process.env.CONGRESS_GOV_API_KEY) {
    console.log("vr-ingest-cron: CONGRESS_GOV_API_KEY not set — ingest skipped; reconciling only.");
    const rec = await reconcile();
    console.log("vr-ingest-cron: reconcile", JSON.stringify(rec));
    return new Response(JSON.stringify({ skipped: true, reconcile: rec }), {
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
  const rec = await reconcile();
  console.log("vr-ingest-cron:", JSON.stringify(reports), "reconcile", JSON.stringify(rec));
  return new Response(JSON.stringify({ reports, reconcile: rec }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// Daily at 07:00 UTC — after the previous day's roll calls have posted.
export const config: Config = {
  schedule: "0 7 * * *",
};
