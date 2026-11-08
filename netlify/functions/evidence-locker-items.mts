// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evidence-locker/items — pipeline-written Evidence Locker items
// ─────────────────────────────────────────────────────────────────────────────
// Read-only. Lists the finished items the raw-ingest cron wrote to the
// "evidence-locker" Blobs store and returns them in the spotlight-entry shape
// the existing Evidence Locker components already render, grouped by
// politician id: { items: { <pid>: [entry, …] }, count }.
//
// Manual review flags (db/evidence-locker-review.json, or a `review` field on
// the stored item): a "hidden" item is left out entirely, so no profile or
// Locker page can show it; "reviewed" and "needs_edit" items are served with
// `review.status` so the profile can print its "Reviewed" note. Every entry
// carries its store key under pipeline.key, which is what a flag row names.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { LOCKER_STORE_NAME, toSpotlightEntry, loadReviewFlags, reviewFor } from "../lib/evidence-locker-core.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

export async function listLockerEntries(store: any, flagsDoc: any = reviewFile) {
  const flags = loadReviewFlags(flagsDoc);
  const { blobs } = await store.list();
  const items: Record<string, any[]> = {};
  let count = 0, hidden = 0;
  const docs = await Promise.all(blobs.map(async (b: any) => {
    const doc = await store.get(b.key, { type: "json" }).catch(() => null);
    return { key: b.key, doc };
  }));
  for (const { key, doc } of docs) {
    if (!doc || !doc.politician_id || !doc.link) continue;
    const review = reviewFor(doc, key, flags);
    if (review?.status === "hidden") { hidden++; continue; }
    (items[doc.politician_id] ||= []).push(toSpotlightEntry(doc, { key, review }));
    count++;
  }
  return { items, count, hidden };
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
