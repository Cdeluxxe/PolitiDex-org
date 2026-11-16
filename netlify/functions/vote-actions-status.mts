// GET /api/admin/vote-actions — read-only status of the action layer
// (pdx_action_bills / pdx_vote_actions and the cron's last run), for the
// curator only (the existing /admin Firebase login, verified server-side).
// It never writes, scores or triggers anything, and nothing public links to it.
// Rates (no-politician, untagged, procedural, backlog) come from vote-actions-quality.ts.
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { STATE_STORE_NAME, STATE_KEY, normaliseState } from "../lib/vote-actions-core.js";
import { buildStatusBody } from "../lib/vote-actions-quality.js";
import { publishSummary } from "../lib/vote-actions-publish.js";
import { voteActionsStatus } from "../lib/vote-actions-db.js";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req: Request): Promise<Response> => {
  const who = await requireAdmin(req);
  if (!who.ok) return json(who.status, { error: who.status === 401 ? "sign in required" : "not the curator account" });
  let state = normaliseState(null);
  try { state = normaliseState(await getStore(STATE_STORE_NAME).get(STATE_KEY, { type: "json" })); } catch { /* fresh */ }
  try {
    // Same fields as before (lastRun, ledger, notDone, bills, votes, tags) plus
    // quality rates and the unmapped-member to-do list, all recomputed per read.
    return json(200, buildStatusBody({ lastRun: state.lastRun, ledger: state.ledger, status: await voteActionsStatus(), publish: publishSummary }));
  } catch (e: any) {
    return json(500, { error: "status unavailable", detail: e?.message || String(e) });
  }
};

export const config: Config = {
  path: "/api/admin/vote-actions",
  method: ["GET"],
};
