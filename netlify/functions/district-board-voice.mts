// ─────────────────────────────────────────────────────────────────────────────
// District board composer — API (every Utah district and statewide board)
// ─────────────────────────────────────────────────────────────────────────────
// The wiring for netlify/lib/district-board-voice-core.mjs. Every decision — the
// seat allow-list, the verified_seat gate, the post checks and the public shape
// of a post — lives in that core; this file only resolves its inputs against
// Postgres and hands them over.
//
//   GET  /api/district-board-voice?seat=ut-sd-3   the seat's posts, newest first,
//                                                 and whether THIS caller can post.
//                                                 Open to everyone; a token only
//                                                 personalizes (`mine`, `canPost`).
//   POST /api/district-board-voice                { seat, issueKey, body }.
//                                                 403 and NO WRITE unless the
//                                                 account is vendor-verified for
//                                                 THAT seat — see the core.
//
// THE STORE IS voice_takes, and no table was added. It is already seat-scoped,
// already carries a seat-scoped author hash instead of a uid, already caps a
// body at 280 by CHECK, and is already one of the stores /api/district-board
// counts — so a post here moves band 2 from the very rows the counts endpoint
// reads, and district-board.mts did not change.
//
// THE GENERAL ROOM IS voice_takes TOO: a row with no issue and a holder_pid
// (20261117000000_voice_general_room_and_likes). LIKES are voice_take_likes,
// the one table that migration adds: one row per (comment, seat-scoped hash).
//
// WHAT THIS FILE CAN REACH: voice_takes (read + insert), voice_take_likes (read
// + insert, never a liker on the wire), voice_residency (read
// only — nothing here writes a residency row, so nothing here can verify
// anybody), voice_membership (read only — the daily cap; nothing here writes
// it), dd_issue_keys (read only). No vr_*, pol_*, finance or stance table.
// No update and no delete.

import type { Config } from "@netlify/functions";
import { and, count, desc, eq, gte, sql, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ddIssueKeys, voiceMembership, voiceResidency, voiceTakeLikes, voiceTakes } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import { handle } from "../lib/district-board-voice-core.mjs";

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

  // Every composer seat's (seat, hash) pair in ONE query, for anyVerifiedSeat().
  // Filtered by hash here and matched pair-for-pair in the core.
  async findVendorVerified(pairs: { seatKey: string; authorHash: string }[]) {
    const hashes = pairs.map((p) => p.authorHash).filter(Boolean);
    if (!hashes.length) return [];
    return db
      .select({
        seatKey: voiceResidency.seatKey,
        authorHash: voiceResidency.authorHash,
        status: voiceResidency.status,
        method: voiceResidency.method,
      })
      .from(voiceResidency)
      .where(and(
        inArray(voiceResidency.authorHash, hashes),
        eq(voiceResidency.status, "verified"),
        eq(voiceResidency.method, "vendor"),
      ));
  },

  async issueExists(issueKey: string) {
    const [row] = await db
      .select({ issueKey: ddIssueKeys.issueKey })
      .from(ddIssueKeys)
      .where(eq(ddIssueKeys.issueKey, issueKey));
    return !!row;
  },

  // `issueKey` narrows the read to one issue's posts on this seat (the topic
  // jump); without it, the whole feed, exactly as before.
  async listPosts(seatKey: string, cap: number, issueKey?: string) {
    return db
      .select({
        id: voiceTakes.id,
        issueKey: voiceTakes.issueKey,
        body: voiceTakes.body,
        createdAt: voiceTakes.createdAt,
        authorHash: voiceTakes.authorHash,
      })
      .from(voiceTakes)
      .where(issueKey
        ? and(eq(voiceTakes.seatKey, seatKey), eq(voiceTakes.issueKey, issueKey))
        : and(eq(voiceTakes.seatKey, seatKey), isNotNull(voiceTakes.issueKey)))
      .orderBy(desc(voiceTakes.createdAt), desc(voiceTakes.id))
      .limit(cap);
  },

  // One holder's general thread on this seat, newest first.
  async listGeneral(seatKey: string, holderPid: string, cap: number) {
    return db
      .select({
        id: voiceTakes.id,
        issueKey: voiceTakes.issueKey,
        holderPid: voiceTakes.holderPid,
        body: voiceTakes.body,
        createdAt: voiceTakes.createdAt,
        authorHash: voiceTakes.authorHash,
      })
      .from(voiceTakes)
      .where(and(eq(voiceTakes.seatKey, seatKey), eq(voiceTakes.holderPid, holderPid), isNull(voiceTakes.issueKey)))
      .orderBy(desc(voiceTakes.createdAt), desc(voiceTakes.id))
      .limit(cap);
  },

  async findTake(id: number) {
    const [row] = await db
      .select({ id: voiceTakes.id, seatKey: voiceTakes.seatKey })
      .from(voiceTakes)
      .where(eq(voiceTakes.id, id));
    return row || null;
  },

  // ON CONFLICT DO NOTHING against the (take, liker) unique index: a second like
  // writes nothing and answers false.
  async insertLike(v: { takeId: number; seatKey: string; likerHash: string }) {
    const rows = await db
      .insert(voiceTakeLikes)
      .values(v)
      .onConflictDoNothing({ target: [voiceTakeLikes.takeId, voiceTakeLikes.likerHash] })
      .returning({ id: voiceTakeLikes.id });
    return rows.length > 0;
  },

  // Counts per comment, and whether the viewer's own hash is among them.
  async likeCounts(ids: number[], viewerHash: string) {
    if (!ids.length) return [];
    const rows = await db
      .select({
        takeId: voiceTakeLikes.takeId,
        n: count(),
        mine: sql<boolean>`bool_or(${voiceTakeLikes.likerHash} = ${viewerHash || ""})`,
      })
      .from(voiceTakeLikes)
      .where(inArray(voiceTakeLikes.takeId, ids))
      .groupBy(voiceTakeLikes.takeId);
    return rows.map((r) => ({ takeId: Number(r.takeId), n: Number(r.n) || 0, mine: r.mine === true }));
  },

  async findMembership(accountHash: string) {
    const [row] = await db
      .select({ status: voiceMembership.status, currentPeriodEnd: voiceMembership.currentPeriodEnd })
      .from(voiceMembership)
      .where(eq(voiceMembership.accountHash, accountHash));
    return row || null;
  },

  async countPostsSince(seatKey: string, hash: string, since: Date) {
    const [row] = await db
      .select({ n: count() })
      .from(voiceTakes)
      .where(and(eq(voiceTakes.seatKey, seatKey), eq(voiceTakes.authorHash, hash), gte(voiceTakes.createdAt, since)));
    return Number(row?.n) || 0;
  },

  async insertPost(v: { seatKey: string; issueKey: string | null; holderPid?: string; body: string; authorHash: string; capSince?: Date }) {
    // THE CAPPED WRITE IS ONE STATEMENT: it inserts only if this author has no
    // post on this seat since the month began, so two racing requests cannot both
    // land. Null when the cap refused it.
    if (v.capSince) {
      const since = v.capSince.toISOString();
      const res = (await db.execute(sql`
        insert into voice_takes (seat_key, issue_key, holder_pid, body, author_hash)
        select ${v.seatKey}, ${v.issueKey}, ${v.holderPid ?? null}, ${v.body}, ${v.authorHash}
         where not exists (
           select 1 from voice_takes
            where seat_key = ${v.seatKey} and author_hash = ${v.authorHash}
              and created_at >= ${since}::timestamptz)
        returning id, issue_key as "issueKey", holder_pid as "holderPid", body, created_at as "createdAt"
      `)) as any;
      return (Array.isArray(res) ? res[0] : res?.rows?.[0]) || null;
    }
    const { capSince: _unused, ...values } = v;
    const [row] = await db
      .insert(voiceTakes)
      .values(values)
      .returning({
        id: voiceTakes.id,
        issueKey: voiceTakes.issueKey,
        holderPid: voiceTakes.holderPid,
        body: voiceTakes.body,
        createdAt: voiceTakes.createdAt,
      });
    return row;
  },

  // Writes are rate-limited per person and per address; reads are not.
  async limit(req: Request, user: { uid?: string } | null) {
    const decision = await checkLimits("district-board-voice", [
      { cls: "user", id: user?.uid || "", limit: { max: 20, windowSeconds: 3600 } },
      { cls: "ip", id: clientIp(req), limit: { max: 60, windowSeconds: 3600 } },
    ]);
    return decision.ok ? null : tooManyRequests(decision.retryAfter);
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handle(req, deps);
  } catch (err) {
    console.error("district-board-voice error", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/district-board-voice",
};
