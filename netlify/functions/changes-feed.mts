// GET /changes (HTML) and /api/changes (JSON) — PUBLIC, READ-ONLY. The "what
// changed" feed: recent changes to what PolitiDex publishes, each labelled
// with its source.
//   votes      the newest roll calls that pass the automatic publish gate
//              (recentPublishedRolls, vote-actions-publish.ts)
//   positions  stated positions the pipeline promoted, exactly the set
//              /api/stated-positions serves (cardsBody, review flags applied)
//   seats      roster seat changes logged by scripts/gen-roster-changes.mjs
//              (db/roster-changes.json)
// Nothing here writes. A lane that cannot be read is named as unavailable and
// the rest of the feed is still served.
import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxStatedPositions } from "../../db/schema.js";
import { cardsBody } from "../lib/stated-positions-core.mjs";
import { ISSUE_TOPIC_LABELS } from "../lib/stance-topic-vocab.mjs";
import { loadReviewFlags, reviewFor } from "../lib/evidence-locker-core.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };
import shareIndex from "../../db/share-index.json" with { type: "json" };
import rosterChanges from "../../db/roster-changes.json" with { type: "json" };
import { publishDeps } from "../lib/vote-actions-db.js";
import { recentPublishedRolls } from "../lib/vote-actions-publish.js";
import { voteItems, positionItems, seatItems, feedBody, changesPageHtml } from "../lib/coverage-pages.js";

const LIMIT = 30;
const names: Record<string, string> = {};
for (const [pid, v] of Object.entries((shareIndex as any).people || {})) if ((v as any)?.n) names[pid] = (v as any).n;

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const errors: string[] = [];
  let votes: any[] = [];
  let positions: any[] = [];
  try {
    votes = voteItems(await recentPublishedRolls(publishDeps, LIMIT));
  } catch (e: any) {
    console.log(`changes-feed: votes unavailable (${e?.message || e})`);
    errors.push("published votes");
  }
  try {
    const rows = await db.select().from(pdxStatedPositions).where(eq(pdxStatedPositions.status, "active"));
    const flags = loadReviewFlags(reviewFile);
    const hiddenKey = (k: string) => reviewFor({}, k, flags)?.status === "hidden";
    positions = positionItems(cardsBody(rows, ISSUE_TOPIC_LABELS, { hiddenKey }), names, LIMIT);
  } catch (e: any) {
    console.log(`changes-feed: positions unavailable (${e?.message || e})`);
    errors.push("stated positions");
  }
  const seats = seatItems(rosterChanges as any, LIMIT);
  const feed = feedBody({ votes, positions, seats }, new Date().toISOString(), errors);
  const cache = errors.length ? "public, max-age=60" : "public, max-age=300";
  if (url.pathname === "/api/changes") {
    return new Response(JSON.stringify(feed), { status: 200, headers: { "content-type": "application/json", "cache-control": cache } });
  }
  return new Response(changesPageHtml(feed), { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache } });
};

export const config: Config = {
  path: ["/changes", "/api/changes"],
  method: ["GET"],
};
