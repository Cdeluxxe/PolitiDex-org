// ─────────────────────────────────────────────────────────────────────────────
// Residency vendor — START (SD-3, HD-16, SD-7, HD-15 and UT-2 only)
// ─────────────────────────────────────────────────────────────────────────────
//   POST /api/residency-verify { seat }   → { url } to the Veriff session, or
//                                           404 no_seat / 403 signed_out /
//                                           403 not_member / 403 second_seat /
//                                           503 vendor_unavailable.
//
// The wiring for handleStart() in netlify/lib/residency-vendor-core.mjs. The
// session's vendorData is { uid, seat }: the uid from the verified Firebase
// token and the seat from the board, never from anything else the caller sent.
//
// SECRETS LIVE IN NETLIFY ENV ONLY: VERIFF_API_KEY and VERIFF_SHARED_SECRET
// (VERIFF_API_URL optionally overrides the station host). Neither is sent to
// the browser; the browser only ever receives the session URL. Without both,
// every start is 503 and nothing is created.
//
// WHAT THIS FILE CAN REACH: voice_residency (read only) and voice_membership
// (read only — a start needs the active flag). It never writes a residency row
// or a membership row — only the signed webhooks do.

import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { voiceMembership, voiceResidency } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import { handleStart } from "../lib/residency-vendor-core.mjs";

const deps = {
  verifyUser,

  config() {
    return {
      apiKey: process.env.VERIFF_API_KEY || "",
      sharedSecret: process.env.VERIFF_SHARED_SECRET || "",
      apiUrl: process.env.VERIFF_API_URL || "",
    };
  },

  async findResidency(seatKey: string, hash: string) {
    const [row] = await db
      .select({ status: voiceResidency.status, method: voiceResidency.method })
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

  async createSession(url: string, headers: Record<string, string>, body: string) {
    const res = await fetch(url, { method: "POST", headers, body });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },

  // Back to the board the reader started from, so they land where they pressed.
  callbackUrl(req: Request, alias: string) {
    const origin = process.env.URL || new URL(req.url).origin;
    return `${origin.replace(/\/+$/, "")}/district/${alias}?residency=returned`;
  },

  async limit(req: Request, user: { uid?: string } | null) {
    const decision = await checkLimits("residency-verify", [
      { cls: "user", id: user?.uid || "", limit: { max: 6, windowSeconds: 3600 } },
      { cls: "ip", id: clientIp(req), limit: { max: 20, windowSeconds: 3600 } },
    ]);
    return decision.ok ? null : tooManyRequests(decision.retryAfter);
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handleStart(req, deps);
  } catch (err) {
    console.error("residency-verify error", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/residency-verify",
};
