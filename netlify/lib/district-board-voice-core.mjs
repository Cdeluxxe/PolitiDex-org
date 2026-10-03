// ─────────────────────────────────────────────────────────────────────────────
// District board composer — THE GATE (the Layton cluster's hand-built boards)
// ─────────────────────────────────────────────────────────────────────────────
// The boards are readers. This is the one place a board takes a voice, and it is
// FIVE named seats: SD-3, where the composer shipped first, and the Layton
// cluster's other hand-built boards — HD-16, SD-7, HD-15 and UT-2. Every
// generated board and every statewide board (ut-gov, both U.S. Senate seats)
// stays a reader, and the allow-list below is rows, never a pattern, for the
// same reason BOARD_SEATS in district-board.mts is: a regex here would open a
// composer on 85 boards.
//
// ── THE GATE, AND IT FAILS CLOSED ───────────────────────────────────────────
// A post is accepted only when BOTH are true on the server:
//
//   1. signed in       a verified, non-anonymous Firebase identity.
//   2. verified_seat   the account carries a residency row for THIS seat whose
//      === this seat   status is 'verified' AND whose method is 'vendor' — the
//                      ID check (Stripe Identity / Veriff). A 'location_match'
//                      row does NOT open this composer: that method is a
//                      consistency check on a location the reader typed, and a
//                      typed location or zip is not proof of residency.
//
// THE ONLY WRITER OF method = 'vendor' is the signed Veriff decision webhook
// (netlify/lib/residency-vendor-core.mjs), and it writes the seat the session
// was started from and no other. Until that lands for THIS seat the gate
// refuses, and the composer is on the page, disabled, with the locked line. It
// is NOT faked verified — there is no flag, env var or test hook that turns it on.
//
// ── A REFUSAL WRITES NOTHING ────────────────────────────────────────────────
// Every refusal returns before the store's insert is reachable. The gate is
// asked BEFORE the issue and the body are even looked at, so an unverified
// caller learns only that they are unverified (403) and a verified one learns
// what was wrong with the post (400).
//
// ── NO PERSON ON THE WIRE ───────────────────────────────────────────────────
// A post goes out as { id, issueKey, body, createdAt, mine } and nothing else:
// no author hash, no uid, no name, no email, no address. `mine` is computed here
// by comparing hashes so the wire carries nothing that could group one person's
// posts. The store is voice_takes, the seat-scoped table band 2 already counts,
// so a post moves "People who answered a poll or wrote a comment" from the same
// rows the counts endpoint reads.
//
// ── THE DAILY CAP, AFTER THE GATE ───────────────────────────────────────────
// A verified resident who is not a member gets ONE comment a day on this seat
// (netlify/lib/membership-core.mjs). The cap is asked only AFTER the residency
// gate and the post checks have passed, so membership can never stand in for a
// vendor row: a member with no row for this seat is 403 like anybody else. A
// second comment the same Mountain-time day is 429 with CAP_COPY.comment and
// writes nothing. The GET never says whether the caller is a member.
//
// Pure over injected dependencies, so scripts/test-district-board-composer.mjs
// drives the real handler against an in-memory fake and asserts what was
// written — no database, no network.

import { authorHash, normalizeSeatKey } from "./district-voice-core.mjs";
import { CAP_COPY, DAILY_COMMENTS, dayStart, memberFor } from "./membership-core.mjs";

// NAMED ROWS. Canonical seat key → the board alias the flag is spelled in. A
// verified flag for one of these seats opens that seat's box and no other.
export const COMPOSER_SEATS = {
  "ut-statesenate-3": "ut-sd-3",
  "ut-statehouse-16": "ut-hd-16",
  "ut-statesenate-7": "ut-sd-7",
  "ut-statehouse-15": "ut-hd-15",
  "ut-house-2": "ut-cd-2",
};

export const POST_MAX = 280;
export const POSTS_CAP = 20;

// The hub's own line, verbatim — index.html and /voice already print "Only
// verified residents of that seat get a voice that counts"; on the board itself
// the seat is THIS one.
export const LOCKED_LINE = "Only verified residents of this seat get a voice that counts.";

export const COPY = {
  noSeat: "This board does not take posts.",
  signedOut: "Sign in to start. Reading stays open to everyone.",
  unverified: "Posting opens after an ID and address check for this seat. " +
    "A typed address, zip or saved location is not accepted as proof.",
  open: "You are a verified resident of this seat. Posts are public and carry no name.",
  noIssue: "Choose an issue from this seat's table.",
  empty: "Write something first.",
  tooLong: "Keep it to " + POST_MAX + " characters.",
  emptyFeed: "No posts on hand for this seat.",
};

// The canonical seat if it has a composer, else ''.
export function composerSeat(raw) {
  const k = normalizeSeatKey(raw);
  return k && Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, k) ? k : "";
}

// THE FLAG. The alias of the seat this account is VENDOR-verified for, or ''.
// A pending, revoked or location_match row answers '' — never a seat.
export function verifiedSeat(row, seatKey) {
  if (!row || typeof row !== "object") return "";
  if (row.status !== "verified" || row.method !== "vendor") return "";
  const k = composerSeat(row.seatKey || seatKey);
  return k ? COMPOSER_SEATS[k] : "";
}

// The gate over RESOLVED inputs. `user` is the server-verified identity or null;
// `row` is voice_residency for (this account, this seat) or null.
export function gate(user, row, seatKey) {
  const k = composerSeat(seatKey);
  if (!k) return { ok: false, status: 404, code: "no_seat", message: COPY.noSeat };
  if (!user || user.isAnonymous || !user.uid) {
    return { ok: false, status: 403, code: "signed_out", message: LOCKED_LINE, note: COPY.signedOut };
  }
  if (verifiedSeat(row, k) !== COMPOSER_SEATS[k]) {
    return { ok: false, status: 403, code: "unverified", message: LOCKED_LINE, note: COPY.unverified };
  }
  return { ok: true, seatKey: k };
}

export function normalizeBody(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim();
}

// The post's own checks, asked only AFTER the gate has let the caller through.
export function checkPost(input) {
  const issueKey = String(input?.issueKey == null ? "" : input.issueKey).trim().toLowerCase();
  if (!issueKey || !/^[a-z0-9_]+$/.test(issueKey) || !input?.issueOk) {
    return { ok: false, status: 400, code: "bad_issue", message: COPY.noIssue };
  }
  const body = normalizeBody(input?.body);
  if (!body) return { ok: false, status: 400, code: "empty", message: COPY.empty };
  if ([...body].length > POST_MAX) return { ok: false, status: 400, code: "too_long", message: COPY.tooLong };
  return { ok: true, issueKey, body };
}

// The only shape a post ever leaves in. Whitelisted field by field, so a store
// row carrying an author hash cannot pass one through by being spread.
export function publicPost(row, viewerHash) {
  return {
    id: row.id,
    issueKey: row.issueKey,
    body: row.body,
    createdAt: row.createdAt,
    mine: !!viewerHash && row.authorHash === viewerHash,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      // Personalized (`mine`, `canPost`), so never shared by a cache.
      "cache-control": "private, no-store",
    },
  });
}

function capRefusal() {
  return json({ error: CAP_COPY.comment, code: "daily_cap" }, 429);
}

// deps:
//   verifyUser(req)                 → { uid, isAnonymous } | null
//   findResidency(seatKey, hash)    → { seatKey, status, method } | null
//   issueExists(issueKey)           → boolean
//   listPosts(seatKey, cap)         → rows (with authorHash), newest first
//   insertPost({ seatKey, issueKey, body, authorHash, capSince? }) → row | null
//                                   (with capSince: inserts only if this author
//                                   has no post on this seat since then; null if not)
//   findMembership(accountHash)     → voice_membership row | null
//   countPostsSince(seatKey, hash, since) → integer
//   limit(req, user)                → Response | null   (optional)
//   now()                           → Date              (optional)
export async function handle(req, deps) {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url);

  if (method === "GET") {
    const seatKey = composerSeat(url.searchParams.get("seat"));
    if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);
    const user = await deps.verifyUser(req);
    const hash = user && !user.isAnonymous ? authorHash(user.uid, seatKey) : "";
    const row = hash ? await deps.findResidency(seatKey, hash) : null;
    const verdict = gate(user, row, seatKey);
    const rows = await deps.listPosts(seatKey, POSTS_CAP);
    const posts = (rows || []).map((r) => publicPost(r, hash));
    return json({
      seat: COMPOSER_SEATS[seatKey],
      posts,
      postsEmpty: posts.length ? "" : COPY.emptyFeed,
      voice: {
        canPost: verdict.ok,
        reason: verdict.ok ? "verified" : verdict.code,
        line: verdict.ok ? "" : LOCKED_LINE,
        note: verdict.ok ? COPY.open : verdict.note || "",
      },
      limits: { postMax: POST_MAX, postsCap: POSTS_CAP },
    });
  }

  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload = {};
  try { payload = (await req.json()) || {}; } catch { payload = {}; }

  const seatKey = composerSeat(payload.seat);
  if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

  const user = await deps.verifyUser(req);
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }
  const hash = user && !user.isAnonymous ? authorHash(user.uid, seatKey) : "";
  const row = hash ? await deps.findResidency(seatKey, hash) : null;

  const verdict = gate(user, row, seatKey);
  if (!verdict.ok || !hash) {
    return json({
      error: verdict.message || LOCKED_LINE,
      note: verdict.note || COPY.signedOut,
      code: verdict.code || "signed_out",
    }, verdict.status || 403);
  }

  const issueRaw = String(payload.issueKey == null ? "" : payload.issueKey).trim().toLowerCase();
  const issueOk = /^[a-z0-9_]+$/.test(issueRaw) ? !!(await deps.issueExists(issueRaw)) : false;
  const post = checkPost({ issueKey: issueRaw, issueOk, body: payload.body });
  if (!post.ok) return json({ error: post.message, code: post.code }, post.status);

  const values = { seatKey: verdict.seatKey, issueKey: post.issueKey, body: post.body, authorHash: hash };
  let saved;
  if (await memberFor(deps, user)) {
    saved = await deps.insertPost(values);
  } else {
    // FAILS CLOSED: no counter means no comment, not an uncapped one.
    const since = dayStart(deps.now ? deps.now() : new Date());
    const used = typeof deps.countPostsSince === "function"
      ? Number(await deps.countPostsSince(verdict.seatKey, hash, since))
      : Infinity;
    if (!(used < DAILY_COMMENTS)) return capRefusal();
    saved = await deps.insertPost({ ...values, capSince: since });
    if (!saved) return capRefusal();
  }
  return json({ post: publicPost({ ...saved, authorHash: hash }, hash) }, 201);
}
