// ─────────────────────────────────────────────────────────────────────────────
// Membership — STRIPE WEBHOOK (Stripe → PolitiDex)
// ─────────────────────────────────────────────────────────────────────────────
//   POST /api/membership-webhook   configured in Stripe for
//                                  customer.subscription.created / .updated /
//                                  .deleted, signed with STRIPE_WEBHOOK_SECRET.
//
// The wiring for handleWebhook() in netlify/lib/membership-core.mjs, which
// decides everything: the Stripe-Signature check, the price (STRIPE_PRICE_ID and
// nothing else), active vs ended vs pending, and stale or foreign events. This
// file supplies the secrets and the ONE write.
//
// THE ONE WRITE: voice_membership, upserted on account_hash. It is the only
// writer of the membership flag anywhere in the repo. It never touches
// voice_residency, so paying can never verify anybody or open a seat. The
// payload is never logged.

import type { Config } from "@netlify/functions";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { voiceMembership } from "../../db/schema.js";
import { handleWebhook } from "../lib/membership-core.mjs";

const deps = {
  config() {
    return {
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
      priceId: process.env.STRIPE_PRICE_ID || "",
    };
  },

  async findMembership(accountHash: string) {
    const [row] = await db
      .select({
        status: voiceMembership.status,
        subscriptionId: voiceMembership.subscriptionId,
        lastEventAt: voiceMembership.lastEventAt,
      })
      .from(voiceMembership)
      .where(eq(voiceMembership.accountHash, accountHash));
    return row || null;
  },

  async writeMembership(row: {
    accountHash: string;
    status: string;
    subscriptionId: string;
    currentPeriodEnd: Date | null;
    lastEventAt: Date;
  }) {
    await db
      .insert(voiceMembership)
      .values(row)
      .onConflictDoUpdate({
        target: voiceMembership.accountHash,
        set: {
          status: row.status,
          subscriptionId: row.subscriptionId,
          currentPeriodEnd: row.currentPeriodEnd,
          lastEventAt: row.lastEventAt,
          updatedAt: sql`now()`,
        },
      });
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handleWebhook(req, deps);
  } catch (err) {
    console.error("membership-webhook error", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/membership-webhook",
};
