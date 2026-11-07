// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evidence-locker/items — pipeline-written Evidence Locker items
// ─────────────────────────────────────────────────────────────────────────────
// Read-only. Lists the finished items the raw-ingest cron wrote to the
// "evidence-locker" Blobs store and returns them in the spotlight-entry shape
// the existing Evidence Locker components already render, grouped by
// politician id: { items: { <pid>: [entry, …] }, count }.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { LOCKER_STORE_NAME, toSpotlightEntry } from "../lib/evidence-locker-core.mjs";

export async function listLockerEntries(store: any) {
  const { blobs } = await store.list();
  const items: Record<string, any[]> = {};
  let count = 0;
  const docs = await Promise.all(blobs.map((b: any) => store.get(b.key, { type: "json" }).catch(() => null)));
  for (const doc of docs) {
    if (!doc || !doc.politician_id || !doc.link) continue;
    (items[doc.politician_id] ||= []).push(toSpotlightEntry(doc));
    count++;
  }
  return { items, count };
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  try {
    const body = await listLockerEntries(getStore(LOCKER_STORE_NAME));
    return Response.json(body, { headers: { "cache-control": "public, max-age=300" } });
  } catch (e: any) {
    console.log(`evidence-locker-items: ERROR ${e?.message || e}`);
    return Response.json({ items: {}, count: 0, error: "unavailable" }, { status: 503 });
  }
};

export const config: Config = {
  path: "/api/evidence-locker/items",
  method: "GET",
};
