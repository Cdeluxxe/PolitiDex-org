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
// voice_residency (read only — nothing here can verify anybody),
// voice_membership (read only — the daily cap), dd_issue_keys (read only).
// No delete.

import type { Config } from "@netlify/functions";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ddIssueKeys, voiceMembership, voicePollVotes, voiceResidency } from "../../db/schema.js";
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

  async findMembership(accountHash: string) {
    const [row] = await db
      .select({ status: voiceMembership.status, currentPeriodEnd: voiceMembership.currentPeriodEnd })
      .from(voiceMembership)
      .where(eq(voiceMembership.accountHash, accountHash));
    return row || null;
  },

  // Votes this author cast or changed on this seat since `since`. An upsert
  // stamps updated_at, so a changed vote counts.
  async countVotesSince(seatKey: string, hash: string, since: Date) {
    const [row] = await db
      .select({ n: count() })
      .from(voicePollVotes)
      .where(and(eq(voicePollVotes.seatKey, seatKey), eq(voicePollVotes.authorHash, hash), gte(voicePollVotes.updatedAt, since)));
    return Number(row?.n) || 0;
  },

  async upsertVote(v: { seatKey: string; issueKey: string; authorHash: string; choice: string; capSince?: Date; capLimit?: number }) {
    // THE CAPPED WRITE IS ONE STATEMENT: both the insert and the update arm only
    // fire if this author has fewer than capLimit votes on this seat cast or
    // changed since the month began. False when the cap refused it.
    if (v.capSince) {
      const since = v.capSince.toISOString();
      const limit = Math.max(0, Math.floor(Number(v.capLimit) || 1));
      const res = (await db.execute(sql`
        insert into voice_poll_votes (seat_key, issue_key, author_hash, choice)
        select ${v.seatKey}, ${v.issueKey}, ${v.authorHash}, ${v.choice}
         where (
           select count(*) from voice_poll_votes
            where seat_key = ${v.seatKey} and author_hash = ${v.authorHash}
              and updated_at >= ${since}::timestamptz) < ${limit}::int
        on conflict (seat_key, issue_key, author_hash) do update
           set choice = excluded.choice, updated_at = now()
         where (
           select count(*) from voice_poll_votes p
            where p.seat_key = ${v.seatKey} and p.author_hash = ${v.authorHash}
              and p.updated_at >= ${since}::timestamptz) < ${limit}::int
        returning id
      `)) as any;
      const rows = Array.isArray(res) ? res : res?.rows || [];
      return rows.length > 0;
    }
    const { capSince: _unused, ...values } = v;
    await db
      .insert(voicePollVotes)
      .values(values)
      .onConflictDoUpdate({
        target: [voicePollVotes.seatKey, voicePollVotes.issueKey, voicePollVotes.authorHash],
        set: { choice: v.choice, updatedAt: sql`now()` },
      });
    return true;
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
