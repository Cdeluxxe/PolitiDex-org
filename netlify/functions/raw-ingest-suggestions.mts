// GET /api/admin/raw-ingest-suggestions — the raw-ingest suggestions log,
// newest first, for the curator only (the existing /admin Firebase login,
// verified server-side; see netlify/lib/admin-auth.mjs). Read-only.
//   ?type=url|score|key|fail   only that type
//   ?limit=N                   at most N entries (default: all kept, ≤ 400)
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { recentEntries, SUGGESTIONS_KEY, SUGGESTIONS_STORE_NAME, MAX_ENTRIES } from "../lib/raw-ingest-suggestions.mjs";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function handle(req: Request, deps: { store?: any; auth?: any } = {}): Promise<Response> {
  const who = await requireAdmin(req, deps.auth);
  if (!who.ok) return json(who.status, { error: who.status === 401 ? "sign in required" : "not the curator account" });
  const url = new URL(req.url);
  const limit = Math.min(MAX_ENTRIES, Math.max(1, Number(url.searchParams.get("limit")) || MAX_ENTRIES));
  const type = url.searchParams.get("type") || undefined;
  let doc: any = null;
  try { doc = await (deps.store ?? getStore(SUGGESTIONS_STORE_NAME)).get(SUGGESTIONS_KEY, { type: "json" }); }
  catch (e: any) { return json(500, { error: `suggestions log unreadable: ${e?.message || e}` }); }
  const entries = recentEntries(doc, { limit, type });
  return json(200, { updated_at: doc?.updated_at ?? null, total: Array.isArray(doc?.entries) ? doc.entries.length : 0, max: MAX_ENTRIES, entries });
}

export default (req: Request) => handle(req);

export const config: Config = {
  path: "/api/admin/raw-ingest-suggestions",
  method: ["GET"],
};
