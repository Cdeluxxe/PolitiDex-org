// POST /api/admin/vote-actions/reparse — rebuild action-layer rows from the
// stored raw payloads (Blobs "raw-ingest-votes"), never from the network.
// Curator only (the existing /admin Firebase login, verified server-side).
//   ?limit=N   roll calls to re-parse this call (default 25, max 200)
//   ?write=1   upsert the rebuilt rows; without it this is a dry run that only
//              reports what would be rebuilt
// Safe to repeat: rows are upserted on the same roll/member key the cron uses,
// so re-parsing unchanged payloads reports new 0 / revised 0. Nothing public
// links to it, and it scores, flags and fetches nothing.
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { replayRawRolls, normaliseState, RAW_VOTES_STORE_NAME, STATE_STORE_NAME, STATE_KEY } from "../lib/vote-actions-core.js";
import { voteActionsRepo } from "../lib/vote-actions-db.js";
import { loadMemberMap } from "../lib/vr-ingest.js";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req: Request): Promise<Response> => {
  const who = await requireAdmin(req);
  if (!who.ok) return json(who.status, { error: who.status === 401 ? "sign in required" : "not the curator account" });
  const q = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(q.get("limit")) || 25, 1), 200);
  const write = q.get("write") === "1";
  let state = normaliseState(null);
  try { state = normaliseState(await getStore(STATE_STORE_NAME).get(STATE_KEY, { type: "json" })); } catch { /* no LIS index yet */ }
  try {
    const report = await replayRawRolls({
      store: getStore(RAW_VOTES_STORE_NAME) as any,
      repo: voteActionsRepo,
      memberMap: await loadMemberMap(),
      lis: state.lis?.map || {},
      write,
      limit,
    });
    return json(200, { write, limit, ...report, skipped: report.skipped.slice(0, 50), errors: report.errors.slice(0, 20) });
  } catch (e: any) {
    return json(500, { error: "re-parse failed", detail: e?.message || String(e) });
  }
};

export const config: Config = {
  path: "/api/admin/vote-actions/reparse",
  method: ["POST"],
};
