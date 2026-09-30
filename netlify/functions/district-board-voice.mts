// ─────────────────────────────────────────────────────────────────────────────
// District board composer — API (SD-3, HD-16, SD-7, HD-15 and UT-2)
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
// WHAT THIS FILE CAN REACH: voice_takes (read + insert), voice_residency (read
// only — nothing here writes a residency row, so nothing here can verify
// anybody), dd_issue_keys (read only). No vr_*, pol_*, finance or stance table.
// No update and no delete.

import type { Config } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ddIssueKeys, voiceResidency, voiceTakes } from "../../db/schema.js";
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

  async issueExists(issueKey: string) {
    const [row] = await db
      .select({ issueKey: ddIssueKeys.issueKey })
      .from(ddIssueKeys)
      .where(eq(ddIssueKeys.issueKey, issueKey));
    return !!row;
  },

  async listPosts(seatKey: string, cap: number) {
    return db
      .select({
        id: voiceTakes.id,
        issueKey: voiceTakes.issueKey,
        body: voiceTakes.body,
        createdAt: voiceTakes.createdAt,
        authorHash: voiceTakes.authorHash,
      })
      .from(voiceTakes)
      .where(eq(voiceTakes.seatKey, seatKey))
      .orderBy(desc(voiceTakes.createdAt), desc(voiceTakes.id))
      .limit(cap);
  },

  async insertPost(v: { seatKey: string; issueKey: string; body: string; authorHash: string }) {
    const [row] = await db
      .insert(voiceTakes)
      .values(v)
      .returning({
        id: voiceTakes.id,
        issueKey: voiceTakes.issueKey,
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
