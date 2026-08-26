// ─────────────────────────────────────────────────────────────────────────────
// Write-rate limiting for anonymous endpoints
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
//
// The People's Mandate write routes take a client-minted participant key. There
// is no auth wall, deliberately — asking someone to make an account before they
// can say "track this" is how a participation surface dies. But an endpoint that
// accepts an identity the caller invents is an endpoint a script can hold down,
// and a support counter a script can hold down is not a count of people. The
// number would still render, still say "people", and be false.
//
// So: a fixed-window counter, keyed by endpoint + actor + window, stored in
// Netlify Database (`pdx_rate_limits`). Not a bot solution — a bot *posture*. It
// makes the cheap attack (one client, a loop) cost something, and it makes the
// expensive attack (a rotating pool of IPs and keys) the only one left.
//
// WHAT AN ACTOR IS
//
// Two independent limits per request, and BOTH must pass:
//
//   1. the participant key   — stops one browser looping.
//   2. the client IP         — stops one machine rotating participant keys,
//                              which is otherwise a one-line bypass since the
//                              key is minted client-side.
//
// The IP limit is the looser of the two, on purpose: a household, an office, a
// school or a mobile carrier NAT can legitimately share one address, and a limit
// tight enough to stop a script would lock out a classroom. The key limit is the
// tight one.
//
// WHAT IS STORED
//
// A truncated SHA-256 of endpoint + actor + window start, an integer, and the
// window start. The raw IP and the raw participant key are hash INPUTS and are
// never written, never logged, and not recoverable from the stored digest — the
// window start being part of the key also means a given actor's rows are not
// linkable to each other across windows by value. A row says "some actor made N
// requests to this endpoint in this minute". That is the whole record.
//
// WHAT THIS IS NOT
//
// Not moderation, not a reputation, not evidence. Exceeding a limit returns 429
// and a plain retry message. It does not flag a person, mark a proposal, feed a
// score, or write anything a reader ever sees. Nothing in this table is a finding
// about anybody, and nothing in it is readable from any published surface.

import { lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxRateLimits } from "../../db/schema.js";
// The window boundary, the stored key and the allow/refuse decision live in a
// plain .mjs module with no database in it, so the suite can import and exercise
// the real arithmetic rather than a re-typed copy of it.
import { bucketKey, evaluate, windowStartSeconds } from "./rate-limit-core.mjs";

// One limit: N requests per window, for one class of actor.
export type Limit = { max: number; windowSeconds: number };

export type LimitDecision = {
  ok: boolean;
  // Seconds until the current window rolls over. Sent as Retry-After.
  retryAfter: number;
  // Which actor class tripped ("key" | "ip"), for the log line only. Never sent
  // to the client — telling a caller which of two limits it hit is telling it
  // which one to rotate around.
  tripped?: string;
};

// Rows older than this are dead weight; each check has a small chance of sweeping
// them (see maybeSweep). One hour comfortably outlives every window below.
const SWEEP_AFTER_SECONDS = 3600;
// Sweep probability per check. Cheap amortised cleanup with no scheduled job.
const SWEEP_CHANCE = 0.02;

// Increment one counter and report the new value. A single upsert: the unique
// index on `bucket` makes concurrent requests serialise on the row rather than
// racing a read-then-write, so a burst cannot slip through by arriving together.
async function bump(bucket: string, startSec: number): Promise<number> {
  const [row] = await db
    .insert(pdxRateLimits)
    .values({ bucket, hits: 1, windowStart: new Date(startSec * 1000) })
    .onConflictDoUpdate({
      target: pdxRateLimits.bucket,
      set: { hits: sql`${pdxRateLimits.hits} + 1`, updatedAt: new Date() },
    })
    .returning({ hits: pdxRateLimits.hits });
  return row?.hits ?? 1;
}

// Best-effort deletion of expired counters. Failure is ignored: a rate limiter
// that 500s because a cleanup query failed is worse than a table with some dead
// rows in it.
async function maybeSweep(now: number): Promise<void> {
  if (Math.random() > SWEEP_CHANCE) return;
  try {
    await db
      .delete(pdxRateLimits)
      .where(lt(pdxRateLimits.windowStart, new Date(now - SWEEP_AFTER_SECONDS * 1000)));
  } catch {
    /* not worth failing a request over */
  }
}

// The client's address, as reported by the platform. Netlify sets
// x-nf-client-connection-ip; x-forwarded-for is the fallback (first hop). Returns
// "" when neither is present, in which case the IP limit is simply skipped — an
// unidentifiable caller must not be lumped in with every other unidentifiable
// caller under one shared bucket, which would rate-limit strangers as a group.
export function clientIp(req: Request): string {
  const direct = req.headers.get("x-nf-client-connection-ip");
  if (direct) return direct.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "";
}

// Check (and consume) the limits for one request.
//
// `actors` is a list of (class, identifier, limit) triples. Every entry with a
// non-empty identifier is checked and incremented; the request passes only if all
// of them are under their max. Incrementing even after one has tripped is
// deliberate — a caller that keeps hammering keeps its window full rather than
// getting a free pass on the limits it had not yet reached.
export async function checkLimits(
  endpoint: string,
  actors: Array<{ cls: string; id: string; limit: Limit }>,
  nowMs?: number
): Promise<LimitDecision> {
  const now = nowMs ?? Date.now();
  let ok = true;
  let retryAfter = 0;
  let tripped: string | undefined;

  for (const a of actors) {
    if (!a.id) continue;
    const startSec = windowStartSeconds(now, a.limit.windowSeconds);
    let hits: number;
    try {
      hits = await bump(bucketKey(endpoint, a.cls, a.id, startSec), startSec);
    } catch (e) {
      // FAIL OPEN. If the counter table is unreachable, the choice is between
      // dropping a real person's proposal and letting a hypothetical script
      // through. The former is a broken product; the latter is the situation
      // that existed before this file. Log and continue.
      console.warn(`rate-limit: counter unavailable for ${endpoint}/${a.cls}, allowing`);
      continue;
    }
    const verdict = evaluate(hits, a.limit, now);
    if (!verdict.allowed) {
      ok = false;
      retryAfter = Math.max(retryAfter, verdict.retryAfter);
      if (!tripped) tripped = a.cls;
    }
  }

  await maybeSweep(now);
  return { ok, retryAfter: Math.max(retryAfter, 1), tripped };
}

// The 429 a tripped limit returns. One message for both actor classes: it says
// what to do (wait) and nothing about which limit was hit or how high it is.
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Give it a moment and try again.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfter),
      },
    }
  );
}
