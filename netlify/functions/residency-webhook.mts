// ─────────────────────────────────────────────────────────────────────────────
// Residency vendor — DECISION WEBHOOK (Veriff → PolitiDex)
// ─────────────────────────────────────────────────────────────────────────────
//   POST /api/residency-webhook   configured in Veriff as the decision webhook
//                                 URL for an integration that runs BOTH the ID
//                                 document check and Proof of Address.
//
// The wiring for handleWebhook() in netlify/lib/residency-vendor-core.mjs,
// which decides everything: signature, final approved decision, document AND
// address checks present, vendorData seat one of the five. This file only
// supplies the secrets and the one write.
//
// THE ONE WRITE: voice_residency (seat_key, author_hash, 'verified', 'vendor',
// reviewed_at = now()). author_hash is authorHash(uid, seat), the value every
// gate already looks the row up by; no uid, name, address, document or session
// id is stored, and the payload is never logged. A 'revoked' row is never
// touched, and a 'location_match' row for the same seat is upgraded in place
// (the unique index is one row per person per seat).

import type { Config } from "@netlify/functions";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { voiceResidency } from "../../db/schema.js";
import { handleWebhook } from "../lib/residency-vendor-core.mjs";

const deps = {
  config() {
    return {
      apiKey: process.env.VERIFF_API_KEY || "",
      sharedSecret: process.env.VERIFF_SHARED_SECRET || "",
    };
  },

  async findResidency(seatKey: string, hash: string) {
    const [row] = await db
      .select({ status: voiceResidency.status, method: voiceResidency.method })
      .from(voiceResidency)
      .where(and(eq(voiceResidency.seatKey, seatKey), eq(voiceResidency.authorHash, hash)));
    return row || null;
  },

  async writeVerified(seatKey: string, hash: string) {
    await db
      .insert(voiceResidency)
      .values({ seatKey, authorHash: hash, status: "verified", method: "vendor", reviewedAt: sql`now()` })
      .onConflictDoNothing({ target: [voiceResidency.seatKey, voiceResidency.authorHash] });
    await db
      .update(voiceResidency)
      .set({ status: "verified", method: "vendor", reviewedAt: sql`now()` })
      .where(
        and(
          eq(voiceResidency.seatKey, seatKey),
          eq(voiceResidency.authorHash, hash),
          ne(voiceResidency.status, "revoked")
        )
      );
  },
};

export default async (req: Request): Promise<Response> => {
  try {
    return await handleWebhook(req, deps);
  } catch (err) {
    console.error("residency-webhook error", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};

export const config: Config = {
  path: "/api/residency-webhook",
};
