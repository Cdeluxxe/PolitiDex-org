// GET /api/admin/vote-actions/cross-links?pid=<politician_id> — one politician's
// raw vote rows (pdx_vote_actions), grouped by the shared bill key
// ("us-119-hr-5000", see vrMeasureBillKey). The person-page issue drawer calls it
// ONLY for the signed-in curator and prints a short "also in the raw vote feed"
// note under a curated measure with the same key. Curator only (the existing
// /admin Firebase login, verified server-side); read-only; nothing public
// links to it, and no public read changes.
import type { Config } from "@netlify/functions";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { voteActionsForPolitician } from "../lib/vote-actions-db.js";
import { crossLinksBody } from "../lib/vote-actions-quality.js";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "private, no-store" } });

export default async (req: Request): Promise<Response> => {
  const who = await requireAdmin(req);
  if (!who.ok) return json(who.status, { error: who.status === 401 ? "sign in required" : "not the curator account" });
  const pid = String(new URL(req.url).searchParams.get("pid") || "").trim();
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(pid)) return json(400, { error: "pid required" });
  try {
    return json(200, crossLinksBody(pid, await voteActionsForPolitician(pid)));
  } catch (e: any) {
    return json(500, { error: "cross-links unavailable", detail: e?.message || String(e) });
  }
};

export const config: Config = {
  path: "/api/admin/vote-actions/cross-links",
  method: ["GET"],
};
