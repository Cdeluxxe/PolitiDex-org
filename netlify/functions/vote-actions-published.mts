// GET /api/vote-actions/published?pid=<politician_id> — PUBLIC. One politician's
// raw vote records (pdx_vote_actions) on bills that pass the automatic publish
// gate (netlify/lib/vote-actions-publish.ts), grouped by the shared bill key.
// Rows on any bill that fails a rule never leave publishedForPolitician; the
// response carries only public fields (no member ids, no raw payload keys).
// The gate is computed on every read — no stored flag, no review queue. The
// person-page issue drawer prints a short "also in the raw vote feed" note
// under a curated measure with the same key. No scoring, tally or verdict reads it.
import type { Config } from "@netlify/functions";
import { publishDeps } from "../lib/vote-actions-db.js";
import { publishedForPolitician } from "../lib/vote-actions-publish.js";

const json = (status: number, body: unknown, cache = "no-store") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

export default async (req: Request): Promise<Response> => {
  const pid = String(new URL(req.url).searchParams.get("pid") || "").trim();
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(pid)) return json(400, { error: "pid required" });
  try {
    return json(200, await publishedForPolitician(pid, publishDeps), "public, max-age=300");
  } catch (e: any) {
    return json(500, { error: "published records unavailable" });
  }
};

export const config: Config = {
  path: "/api/vote-actions/published",
  method: ["GET"],
};
