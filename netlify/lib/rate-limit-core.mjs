// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit core — the pure arithmetic, with no database in it
// ─────────────────────────────────────────────────────────────────────────────
// Split out of rate-limit.ts on purpose. Everything a rate limiter can get
// subtly wrong is in here — the window boundary, the off-by-one on `max`, the
// retry-after, and above all WHAT GOES INTO THE STORED KEY — and none of it
// needs Postgres to check. rate-limit.ts imports these; scripts/test-support-
// lane.mjs imports the same functions and exercises them directly, so the maths
// the suite verifies is literally the maths that ships.
//
// Plain .mjs rather than .ts so the test can import it with no build step, which
// is the same reason every client module in this repo is plain .js.

import crypto from "node:crypto";

// Start of the fixed window containing `nowMs`, in epoch SECONDS.
//
// Fixed windows, not sliding: a sliding window needs the timestamp of every
// request retained to be evicted later, and this table's whole privacy claim is
// that it holds a counter and not a history. The cost is the classic fixed-window
// edge — up to 2×max in the instant either side of a boundary — which for a
// support button is not worth a request log to close.
export function windowStartSeconds(nowMs, windowSeconds) {
  return Math.floor(nowMs / 1000 / windowSeconds) * windowSeconds;
}

// The stored bucket key: a truncated SHA-256 over endpoint, actor class, actor
// identifier and window start.
//
// The actor identifier — a participant key or an IP — is an INPUT and is never
// part of the output. 40 hex chars (160 bits) is far past collision relevance for
// a table that is swept hourly, and the window start being inside the digest
// means one actor's rows in different windows are not equal by value, so the
// table cannot be read as one actor's activity over time.
export function bucketKey(endpoint, actorClass, actor, startSec) {
  return crypto
    .createHash("sha256")
    .update(`${endpoint}|${actorClass}|${actor}|${startSec}`)
    .digest("hex")
    .slice(0, 40);
}

// Given the post-increment hit count, decide. `max` is inclusive: max=3 allows the
// 3rd request and refuses the 4th, because "3 per 10 minutes" that refuses the 3rd
// is a limit of 2 and the copy would be lying.
//
// retryAfter is time remaining in the CURRENT window, floored at 1 so a caller
// that trips in the final millisecond is never told to retry in 0 seconds.
export function evaluate(hits, limit, nowMs) {
  const startSec = windowStartSeconds(nowMs, limit.windowSeconds);
  const elapsed = Math.floor(nowMs / 1000) - startSec;
  return {
    allowed: hits <= limit.max,
    retryAfter: Math.max(1, limit.windowSeconds - elapsed),
  };
}
