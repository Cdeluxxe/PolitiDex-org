// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stated-positions — promoted Evidence Locker stances, as stance cards
// ─────────────────────────────────────────────────────────────────────────────
// Read-only. Serves the active rows of pdx_stated_positions (written by the
// raw-ingest cron's promotion step, netlify/lib/stated-positions-core.mjs) in the
// ISSUE_STANCE_DATA card shape, grouped by politician id:
//
//   { cards: { <pid>: [{ topic, icon, pos, issueKey, issueStance, text,
//                        source: { label, url }, provenance: "pipeline",
//                        pipeline: { strength, confidence, strong, weak, items,
//                                    rules_version, promoted_at, updated_at } }] },
//     count, version }
//
// `provenance: "pipeline"` is the tag (the card's `source` field is already the
// citation object every surface reads, so the tag rides beside it). stance-helpers.js
// fetches this once and merges the cards into _resolveStanceList / _polPositionMap
// for issue keys the person's curated cards do not carry — curated always wins.
//
// ?view=keys answers { keys: { <pid>: [issueKey] }, count, version } — the same
// rows, issue keys only — for the edge functions that count pipeline positions.
//
// A row whose every evidence item has since been hidden by a review flag
// (db/evidence-locker-review.json) is not served, even before the cron
// withdraws it. A database failure answers 503 with an empty body, so the
// client falls back to curated cards only.

import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxStatedPositions } from "../../db/schema.js";
import { cardsBody, keysBody } from "../lib/stated-positions-core.mjs";
import { ISSUE_TOPIC_LABELS } from "../lib/stance-topic-vocab.mjs";
import { loadReviewFlags, reviewFor } from "../lib/evidence-locker-core.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  try {
    const rows = await db.select().from(pdxStatedPositions).where(eq(pdxStatedPositions.status, "active"));
    const flags = loadReviewFlags(reviewFile);
    const hiddenKey = (k: string) => reviewFor({}, k, flags)?.status === "hidden";
    const body = cardsBody(rows, ISSUE_TOPIC_LABELS, { hiddenKey });
    // ?view=keys — the same served set as issue keys only, for the edge (the
    // sitemap's floor merge and the person share preview / crawl block).
    const out = new URL(req.url).searchParams.get("view") === "keys" ? keysBody(body) : body;
    return Response.json(out, { headers: { "cache-control": "public, max-age=300" } });
  } catch (e: any) {
    console.log(`stated-positions: ERROR ${e?.message || e}`);
    const empty = new URL(req.url).searchParams.get("view") === "keys" ? { keys: {}, count: 0 } : { cards: {}, count: 0 };
    return Response.json({ ...empty, error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
};

export const config: Config = {
  path: "/api/stated-positions",
  method: ["GET"],
};
