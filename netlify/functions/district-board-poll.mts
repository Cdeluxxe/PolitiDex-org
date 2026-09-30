// ─────────────────────────────────────────────────────────────────────────────
// District board poll — API (SD-3, HD-16, SD-7, HD-15 and UT-2)
// ─────────────────────────────────────────────────────────────────────────────
// The wiring for netlify/lib/district-board-poll-core.mjs. Every decision — the
// seat allow-list, the verified_seat gate (the composer's own), the choice check
// and the public shape of a tally — lives in that core; this file only resolves
// its inputs against Postgres.
//
//   GET  /api/district-board-poll?seat=ut-sd-3   per-issue counts for the seat,
//                                                and whether THIS caller can vote.
//                                                Open to everyone.
//   POST /api/district-board-poll                { seat, issueKey, choice }.
//                                                403 and NO WRITE unless the
//                                                account is vendor-verified for
//                                                THAT seat.
//
// THE STORE IS voice_poll_votes (migration 20261109000000_create_voice_poll_votes),
// one row per (seat, issue, author hash); /api/district-board counts it in band
// 2 and in the per-issue `polls` column.
//
// WHAT THIS FILE CAN REACH: voice_poll_votes (grouped read + upsert),
// voice_residency (read only — nothing here can verify anybody), dd_issue_keys
// (read only). No delete.

import type { Config } from "@netlify/functions";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ddIssueKeys, voicePollVotes, voiceResidency } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import { handle } from "../lib/district-board-poll-core.mjs";

const deps = {
  verifyUser,

  async findResidency(seatKey: string, hash: string) {
    const [row] = await db
      .select({
        seatKey: voiceResidency.seatKey,
        status: voiceResidency.status,
        method: voiceResidency.method,
      })
      .from(voiceResidency)
      .where(and(eq(voiceResidency.seatKey, seatKey), eq(voiceResidency.authorHash, hash)));
    return row || null;
  },

  async issueExists(issueKey: string) {
    const [row] = await db
      .select({ issueKey: ddIssueKeys.issueKey })
      .from(ddIssueKeys)
      .where(eq(ddIssueKeys.issueKey, issueKey));
    return !!row;
  },

  // Grouped counts only. One row per person per (seat, issue) is a schema fact,
  // so count(*) is a count of people.
  async countVotes(seatKey: string) {
    return db
      .select({ issueKey: voicePollVotes.issueKey, choice: voicePollVotes.choice, v: count() })
      .from(voicePollVotes)
      .where(eq(voicePollVotes.seatKey, seatKey))
      .groupBy(voicePollVotes.issueKey, voicePollVotes.choice);
  },

  // The caller's own votes, looked up by their own hash. Never another's.
  async myVotes(seatKey: string, hash: string) {
    return db
      .select({ issueKey: voicePollVotes.issueKey, choice: voicePollVotes.choice })
      .from(voicePollVotes)
      .where(and(eq(voicePollVotes.seatKey, seatKey), eq(voicePollVotes.authorHash, hash)));
  },

  async upsertVote(v: { seatKey: string; issueKey: string; authorHash: string; choice: string }) {
    await db
      .insert(voicePollVotes)
      .values(v)
      .onConflictDoUpdate({
        target: [voicePollVotes.seatKey, voicePollVotes.issueKey, voicePollVotes.authorHash],
        set: { choice: v.choice, updatedAt: sql`now()` },
      });
  },

  // Writes are rate-limited per person and per address; reads are not.
  async limit(req: Request, user: { uid?: string } | null) {
    const decision = await checkLimits("district-board-poll", [
      { cls: "user", id: user?.uid || "", limit: { max: 60, windowSeconds: 3600 } },
      { cls: "ip", id: clientIp(req), limit: { max: 120, windowSeconds: 3600 } },
    ]);
    return decision.ok ? null : tooManyRequests(decision.retryAfter);
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handle(req, deps);
  } catch (err) {
    console.error("district-board-poll error", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/district-board-poll",
};
