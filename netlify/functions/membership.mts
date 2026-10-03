// ─────────────────────────────────────────────────────────────────────────────
// Membership — STATUS + CHECKOUT (/me only)
// ─────────────────────────────────────────────────────────────────────────────
//   GET  /api/membership   the CALLER'S OWN flag: { signedIn, member }. Read by
//                          /me and nothing else; no board endpoint carries it.
//   POST /api/membership   { url } to a Stripe Checkout session for the $20
//                          yearly price, returning to /me. 403 signed out,
//                          503 when Stripe is not configured.
//
// The wiring for handleMembership() in netlify/lib/membership-core.mjs. Starting
// checkout WRITES NOTHING: only the signed webhook moves the flag.
//
// SECRETS LIVE IN NETLIFY ENV ONLY: STRIPE_SECRET_KEY and STRIPE_PRICE_ID. The
// browser only ever receives the Checkout URL.
//
// WHAT THIS FILE CAN REACH: voice_membership (read only).

import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { voiceMembership } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import { STRIPE_API, handleMembership } from "../lib/membership-core.mjs";

const deps = {
  verifyUser,

  config() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
      priceId: process.env.STRIPE_PRICE_ID || "",
    };
  },

  async findMembership(accountHash: string) {
    const [row] = await db
      .select({ status: voiceMembership.status, currentPeriodEnd: voiceMembership.currentPeriodEnd })
      .from(voiceMembership)
      .where(eq(voiceMembership.accountHash, accountHash));
    return row || null;
  },

  async createCheckout(params: Record<string, string>, secretKey: string) {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },

  origin(req: Request) {
    return process.env.URL || new URL(req.url).origin;
  },

  async limit(req: Request, user: { uid?: string } | null) {
    const decision = await checkLimits("membership-checkout", [
      { cls: "user", id: user?.uid || "", limit: { max: 10, windowSeconds: 3600 } },
      { cls: "ip", id: clientIp(req), limit: { max: 30, windowSeconds: 3600 } },
    ]);
    return decision.ok ? null : tooManyRequests(decision.retryAfter);
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handleMembership(req, deps);
  } catch (err) {
    console.error("membership error", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/membership",
};
