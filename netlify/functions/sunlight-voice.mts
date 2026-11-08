// ─────────────────────────────────────────────────────────────────────────────
// Sunlight Governance in District Voice — API (Utah district boards)
// ─────────────────────────────────────────────────────────────────────────────
// The wiring for netlify/lib/sunlight-voice-core.mjs. Every decision — the Utah
// seat check, District Voice's residency gate (imported unchanged from the
// board composer's core), the comment cap and the public shapes — lives in that
// core; this file only resolves its inputs against Postgres.
//
//   GET  /api/sunlight-voice                 the district engagement view and
//                                            the PSC filing note. Open to all.
//   GET  /api/sunlight-voice?seat=ut-hd-68   + that seat's comments, support
//                                            count, the "ask your rep" card and
//                                            whether THIS caller can act.
//   POST /api/sunlight-voice                 { seat, action: 'comment', body }
//                                            { seat, action: 'support', on? }
//                                            { seat, action: 'ask' }
//                                            403 and NO WRITE unless the account
//                                            is vendor-verified for THAT seat.
//
// THE STORE IS cee_item_comments / cee_item_votes, and no table was added: they
// are the app's item-keyed threads. The target families this file writes are
// unreachable from /api/threads (see the core). Author columns hold the
// seat-scoped hash, never a uid. voice_residency and voice_membership are read
// only — nothing here can verify anybody.

import type { Config } from "@netlify/functions";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ceeItemComments, ceeItemVotes, voiceMembership, voiceResidency } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import { TARGET_PREFIXES, handle } from "../lib/sunlight-voice-core.mjs";

const deps = {
  verifyUser,

  async findResidency(seatKey: string, hash: string) {
    const [row] = await db
      .select({ seatKey: voiceResidency.seatKey, status: voiceResidency.status, method: voiceResidency.method })
      .from(voiceResidency)
      .where(and(eq(voiceResidency.seatKey, seatKey), eq(voiceResidency.authorHash, hash)));
    return row || null;
  },

  async findMembership(accountHash: string) {
    const [row] = await db
      .select({ status: voiceMembership.status, currentPeriodEnd: voiceMembership.currentPeriodEnd })
      .from(voiceMembership)
      .where(eq(voiceMembership.accountHash, accountHash));
    return row || null;
  },

  async listComments(target: string, cap: number) {
    return db
      .select({
        id: ceeItemComments.id,
        body: ceeItemComments.body,
        createdAt: ceeItemComments.createdAt,
        authorUid: ceeItemComments.authorUid,
      })
      .from(ceeItemComments)
      .where(and(eq(ceeItemComments.targetId, target), eq(ceeItemComments.status, "active")))
      .orderBy(desc(ceeItemComments.createdAt), desc(ceeItemComments.id))
      .limit(cap);
  },

  async countCommentsSince(target: string, hash: string, since: Date) {
    const [row] = await db
      .select({ n: count() })
      .from(ceeItemComments)
      .where(and(
        eq(ceeItemComments.targetId, target),
        eq(ceeItemComments.authorUid, hash),
        gte(ceeItemComments.createdAt, since),
      ));
    return Number(row?.n) || 0;
  },

  async insertComment(v: { targetId: string; authorUid: string; authorName: string; body: string }) {
    const [row] = await db
      .insert(ceeItemComments)
      .values(v)
      .returning({ id: ceeItemComments.id, body: ceeItemComments.body, createdAt: ceeItemComments.createdAt });
    return row;
  },

  async voteCount(target: string, vote: string) {
    const [row] = await db
      .select({ n: count() })
      .from(ceeItemVotes)
      .where(and(eq(ceeItemVotes.targetId, target), eq(ceeItemVotes.vote, vote)));
    return Number(row?.n) || 0;
  },

  async hasVote(target: string, hash: string) {
    const [row] = await db
      .select({ id: ceeItemVotes.id })
      .from(ceeItemVotes)
      .where(and(eq(ceeItemVotes.targetId, target), eq(ceeItemVotes.uid, hash)));
    return !!row;
  },

  // ON CONFLICT DO NOTHING against the (target, uid) unique index: one row per
  // resident per target, so a second signal or request writes nothing.
  async addVote(v: { targetId: string; uid: string; vote: string }) {
    const rows = await db
      .insert(ceeItemVotes)
      .values(v)
      .onConflictDoNothing({ target: [ceeItemVotes.targetId, ceeItemVotes.uid] })
      .returning({ id: ceeItemVotes.id });
    return rows.length > 0;
  },

  async removeVote(target: string, hash: string) {
    await db.delete(ceeItemVotes).where(and(eq(ceeItemVotes.targetId, target), eq(ceeItemVotes.uid, hash)));
  },

  // Grouped counts for every seat, for the district engagement view. starts_with
  // rather than LIKE, so the underscore in a prefix is literal.
  async engagementRows() {
    const comments = await db
      .select({ targetId: ceeItemComments.targetId, n: count() })
      .from(ceeItemComments)
      .where(and(
        sql`starts_with(${ceeItemComments.targetId}, ${TARGET_PREFIXES.comment})`,
        eq(ceeItemComments.status, "active"),
      ))
      .groupBy(ceeItemComments.targetId);
    const votes = await db
      .select({ targetId: ceeItemVotes.targetId, vote: ceeItemVotes.vote, n: count() })
      .from(ceeItemVotes)
      .where(sql`(starts_with(${ceeItemVotes.targetId}, ${TARGET_PREFIXES.support}) or starts_with(${ceeItemVotes.targetId}, ${TARGET_PREFIXES.ask}))`)
      .groupBy(ceeItemVotes.targetId, ceeItemVotes.vote);
    return [
      ...comments.map((r) => ({ targetId: r.targetId, kind: "comment", n: Number(r.n) || 0 })),
      ...votes.map((r) => ({ targetId: r.targetId, kind: "vote", vote: r.vote, n: Number(r.n) || 0 })),
    ];
  },

  // Writes are rate-limited per person and per address; reads are not.
  async limit(req: Request, user: { uid?: string } | null) {
    const decision = await checkLimits("sunlight-voice", [
      { cls: "user", id: user?.uid || "", limit: { max: 30, windowSeconds: 3600 } },
      { cls: "ip", id: clientIp(req), limit: { max: 60, windowSeconds: 3600 } },
    ]);
    return decision.ok ? null : tooManyRequests(decision.retryAfter);
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handle(req, deps);
  } catch (err) {
    console.error("sunlight-voice error", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/sunlight-voice",
};
