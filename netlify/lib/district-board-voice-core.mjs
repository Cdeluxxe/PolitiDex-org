// ─────────────────────────────────────────────────────────────────────────────
// District board composer — THE GATE (every Utah district board)
// ─────────────────────────────────────────────────────────────────────────────
// This is the one place a board takes a voice. It opened on FIVE named seats —
// SD-3, then the Layton cluster's HD-16, SD-7, HD-15 and UT-2 — and now covers
// every seat that has a board: SD-6, every generated district board and the
// three statewide boards (ut-gov and both U.S. Senate seats). The allow-list
// below is still ROWS, never a pattern, for the same reason BOARD_SEATS in
// district-board.mts is: a seat with no board must never take a post. The
// generated rows are written by scripts/gen-district-boards.mjs from the same
// plan that writes BOARD_SEATS, so the two lists cannot drift.
//
// ── THE GATE, AND IT FAILS CLOSED ───────────────────────────────────────────
// A post is accepted only when BOTH are true on the server:
//
//   1. signed in       a verified, non-anonymous Firebase identity.
//   2. verified_seat   the account carries a residency row for THIS seat whose
//      === this seat   status is 'verified' AND whose method is 'vendor' — the
//                      ID check (Didit). A 'location_match'
//                      row does NOT open this composer: that method is a
//                      consistency check on a location the reader typed, and a
//                      typed location or zip is not proof of residency.
//
// THE ONLY WRITER OF method = 'vendor' is the signed Didit decision webhook
// (netlify/lib/residency-vendor-core.mjs), and it writes the seat the session
// was started from plus every other composer seat the reader's saved location
// resolved at start (the hallway's resolver, bound into the signed session).
// Until a row lands for THIS seat the gate
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
// ── THE MONTHLY CAP, AFTER THE GATE ─────────────────────────────────────────
// A verified resident who is not a member gets ONE comment a Mountain-time
// calendar month on this seat
// (netlify/lib/membership-core.mjs). The cap is asked only AFTER the residency
// gate and the post checks have passed, so membership can never stand in for a
// vendor row: a member with no row for this seat is 403 like anybody else. A
// second comment the same month is 429 with CAP_COPY.comment and
// writes nothing. The GET never carries the flag or an account id.
//
// ── WHO MAY START THE CHECK ─────────────────────────────────────────────────
// ONE CHECK COVERS EVERY RESOLVED SEAT. The GET answers `voice.canVerify` —
// true for any signed-in reader unverified on THIS seat and holding no
// verified vendor row on ANY composer seat — and the composer
// paints the proof button on that alone. It is the caller's own permission,
// not the flag: a verified resident reads false member or not, so a member and
// a non-member who can both post still read byte-identical JSON.
// POST /api/residency-verify asks the same canVerifyHere() and is 403 without it.
//
// Pure over injected dependencies, so scripts/test-district-board-composer.mjs
// drives the real handler against an in-memory fake and asserts what was
// written — no database, no network.

import crypto from "node:crypto";
import { authorHash, normalizeSeatKey } from "./district-voice-core.mjs";
import { CAP_COPY, MONTHLY_COMMENTS, memberFor, monthStart } from "./membership-core.mjs";

// NAMED ROWS. Canonical seat key → the board alias the flag is spelled in. A
// verified flag for one of these seats opens that seat's box and no other.
export const COMPOSER_SEATS = {
  "ut-statesenate-3": "ut-sd-3",
  "ut-statehouse-16": "ut-hd-16",
  "ut-statesenate-7": "ut-sd-7",
  "ut-statehouse-15": "ut-hd-15",
  "ut-house-2": "ut-cd-2",
  "ut-statesenate-6": "ut-sd-6",
  // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
  "ut-statehouse-4": "ut-hd-4",
  "ut-statehouse-5": "ut-hd-5",
  "ut-statehouse-6": "ut-hd-6",
  "ut-statehouse-9": "ut-hd-9",
  "ut-statehouse-10": "ut-hd-10",
  "ut-statehouse-11": "ut-hd-11",
  "ut-statehouse-12": "ut-hd-12",
  "ut-statehouse-14": "ut-hd-14",
  "ut-statehouse-19": "ut-hd-19",
  "ut-statehouse-21": "ut-hd-21",
  "ut-statehouse-22": "ut-hd-22",
  "ut-statehouse-23": "ut-hd-23",
  "ut-statehouse-24": "ut-hd-24",
  "ut-statehouse-25": "ut-hd-25",
  "ut-statehouse-28": "ut-hd-28",
  "ut-statehouse-29": "ut-hd-29",
  "ut-statehouse-30": "ut-hd-30",
  "ut-statehouse-31": "ut-hd-31",
  "ut-statehouse-33": "ut-hd-33",
  "ut-statehouse-34": "ut-hd-34",
  "ut-statehouse-36": "ut-hd-36",
  "ut-statehouse-37": "ut-hd-37",
  "ut-statehouse-39": "ut-hd-39",
  "ut-statehouse-41": "ut-hd-41",
  "ut-statehouse-42": "ut-hd-42",
  "ut-statehouse-43": "ut-hd-43",
  "ut-statehouse-44": "ut-hd-44",
  "ut-statehouse-45": "ut-hd-45",
  "ut-statehouse-46": "ut-hd-46",
  "ut-statehouse-49": "ut-hd-49",
  "ut-statehouse-50": "ut-hd-50",
  "ut-statehouse-51": "ut-hd-51",
  "ut-statehouse-52": "ut-hd-52",
  "ut-statehouse-53": "ut-hd-53",
  "ut-statehouse-55": "ut-hd-55",
  "ut-statehouse-56": "ut-hd-56",
  "ut-statehouse-59": "ut-hd-59",
  "ut-statehouse-60": "ut-hd-60",
  "ut-statehouse-61": "ut-hd-61",
  "ut-statehouse-63": "ut-hd-63",
  "ut-statehouse-64": "ut-hd-64",
  "ut-statehouse-65": "ut-hd-65",
  "ut-statehouse-66": "ut-hd-66",
  "ut-statehouse-67": "ut-hd-67",
  "ut-statehouse-68": "ut-hd-68",
  "ut-statehouse-69": "ut-hd-69",
  "ut-statehouse-70": "ut-hd-70",
  "ut-statehouse-71": "ut-hd-71",
  "ut-statehouse-73": "ut-hd-73",
  "ut-statehouse-75": "ut-hd-75",
  "ut-statesenate-1": "ut-sd-1",
  "ut-statesenate-2": "ut-sd-2",
  "ut-statesenate-4": "ut-sd-4",
  "ut-statesenate-5": "ut-sd-5",
  "ut-statesenate-8": "ut-sd-8",
  "ut-statesenate-9": "ut-sd-9",
  "ut-statesenate-10": "ut-sd-10",
  "ut-statesenate-11": "ut-sd-11",
  "ut-statesenate-12": "ut-sd-12",
  "ut-statesenate-13": "ut-sd-13",
  "ut-statesenate-14": "ut-sd-14",
  "ut-statesenate-15": "ut-sd-15",
  "ut-statesenate-16": "ut-sd-16",
  "ut-statesenate-17": "ut-sd-17",
  "ut-statesenate-18": "ut-sd-18",
  "ut-statesenate-19": "ut-sd-19",
  "ut-statesenate-20": "ut-sd-20",
  "ut-statesenate-21": "ut-sd-21",
  "ut-statesenate-22": "ut-sd-22",
  "ut-statesenate-23": "ut-sd-23",
  "ut-statesenate-24": "ut-sd-24",
  "ut-statesenate-25": "ut-sd-25",
  "ut-statesenate-26": "ut-sd-26",
  "ut-statesenate-27": "ut-sd-27",
  "ut-statesenate-28": "ut-sd-28",
  "ut-statesenate-29": "ut-sd-29",
  "ut-house-1": "ut-cd-1",
  "ut-house-3": "ut-cd-3",
  "ut-house-4": "ut-cd-4",
  "ut-gov": "ut-gov",
  "ut-us-senate-curtis": "ut-us-senate-curtis",
  "ut-us-senate-lee": "ut-us-senate-lee",
  // @generated district-boards end
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
  // A reader whose one check already ran and did not name this seat. Names no
  // price and no plan; boards carry no money copy.
  alreadyChecked: "Your ID and address check is already done. It covered the seats your saved location named when you ran it, and this seat was not one of them.",
  noIssue: "Choose an issue from this seat's table.",
  empty: "Write something first.",
  tooLong: "Keep it to " + POST_MAX + " characters.",
  emptyFeed: "No posts on hand for this seat.",
};

// A statewide board's key IS its canonical key (ut-gov, ut-us-senate-<pid>);
// the same shape district-board.mts and gen-district-boards.mjs accept.
export const STATEWIDE_KEY_RE = /^[a-z]{2}-(?:gov|us-senate-[a-z][a-z0-9_]*)$/;

// The canonical seat if it has a composer, else ''.
export function composerSeat(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  const k = STATEWIDE_KEY_RE.test(s) ? s : normalizeSeatKey(s);
  return k && Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, k) ? k : "";
}

// THE SEAT-SCOPED AUTHOR HASH for a composer seat. A district seat is exactly
// authorHash() (so every row already written keeps its hash); a statewide seat,
// which normalizeSeatKey() does not speak, is the same sha256(uid + ':' + seat)
// over its own key. '' for a seat with no composer or an empty uid.
export function seatHash(uid, seatKey) {
  const k = composerSeat(seatKey);
  const u = String(uid == null ? "" : uid).trim();
  if (!k || !u) return "";
  if (!STATEWIDE_KEY_RE.test(k)) return authorHash(u, k);
  return crypto.createHash("sha256").update(`${u}:${k}`).digest("hex").slice(0, 32);
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

// THE ONE CHECK. One vendor check covers every composer seat the reader's
// saved location resolved when they ran it, so an account that already holds a
// VERIFIED vendor row on any composer seat has nothing left to start. The alias
// of the first such seat, or ''. Read from voice_residency itself, so no counter
// is kept: the seat-scoped hash is recomputed for each named seat. A revoked
// row elsewhere does not count — it is not a verification.
//
// With a board on every seat that is one lookup per row, so a store may offer
// findVendorVerified(pairs) → rows { seatKey, authorHash, status, method }: one
// query for every (seat, hash) pair at once. Only a row whose seat AND hash are
// one of the pairs counts. Without it, the per-seat findResidency() walk.
export async function anyVerifiedSeat(deps, uid) {
  if (!deps || !uid) return "";
  const pairs = [];
  for (const k of Object.keys(COMPOSER_SEATS)) {
    const h = seatHash(uid, k);
    if (h) pairs.push({ seatKey: k, authorHash: h });
  }
  if (typeof deps.findVendorVerified === "function") {
    const rows = (await deps.findVendorVerified(pairs)) || [];
    for (const p of pairs) {
      const hit = rows.some((r) => r && r.seatKey === p.seatKey && r.authorHash === p.authorHash &&
        r.method === "vendor" && r.status === "verified");
      if (hit) return COMPOSER_SEATS[p.seatKey];
    }
    return "";
  }
  if (typeof deps.findResidency !== "function") return "";
  for (const p of pairs) {
    const row = await deps.findResidency(p.seatKey, p.authorHash);
    if (row && row.method === "vendor" && row.status === "verified") return COMPOSER_SEATS[p.seatKey];
  }
  return "";
}

// May THIS caller start the vendor check on THIS seat? Any signed-in reader
// (membership is never asked) not revoked here and holding no verified vendor
// row on any composer seat. Fails closed: any missing dep or lookup error is a
// no. It is the caller's own permission, never the flag or an account id.
export async function canVerifyHere(deps, user, row, seatKey) {
  if (!user || user.isAnonymous || !user.uid) return { ok: false };
  if (row && (row.status === "revoked" || (row.status === "verified" && row.method === "vendor"))) return { ok: false };
  try {
    if (await anyVerifiedSeat(deps, user.uid)) return { ok: false, alreadyChecked: true };
  } catch {
    return { ok: false };
  }
  return { ok: true };
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
  return json({ error: CAP_COPY.comment, code: "monthly_cap" }, 429);
}

// deps:
//   verifyUser(req)                 → { uid, isAnonymous } | null
//   findResidency(seatKey, hash)    → { seatKey, status, method } | null
//   issueExists(issueKey)           → boolean
//   listPosts(seatKey, cap, issueKey?) → rows (with authorHash), newest first; one issue when given
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
    const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
    const row = hash ? await deps.findResidency(seatKey, hash) : null;
    const verdict = gate(user, row, seatKey);
    const check = verdict.code === "unverified" ? await canVerifyHere(deps, user, row, seatKey) : { ok: false };
    // ONE ISSUE'S COMMENTS, ON ASK. `?issue=<key>` narrows the read to that
    // issue's posts on this seat — the topic jump from an issue file lands on
    // them — under the same cap and the same public shape. A key of the wrong
    // shape is ignored rather than refused, so the read falls back to the whole
    // feed. Reading is open to everyone either way; nothing here writes.
    const issueRaw = String(url.searchParams.get("issue") || "").trim().toLowerCase();
    const issueKey = /^[a-z0-9_]+$/.test(issueRaw) ? issueRaw : "";
    const rows = issueKey
      ? await deps.listPosts(seatKey, POSTS_CAP, issueKey)
      : await deps.listPosts(seatKey, POSTS_CAP);
    const posts = (rows || [])
      .filter((r) => !issueKey || (r && r.issueKey === issueKey))
      .map((r) => publicPost(r, hash));
    return json({
      seat: COMPOSER_SEATS[seatKey],
      issue: issueKey,
      posts,
      postsEmpty: posts.length ? "" : COPY.emptyFeed,
      voice: {
        canPost: verdict.ok,
        reason: verdict.ok ? "verified" : verdict.code,
        line: verdict.ok ? "" : LOCKED_LINE,
        note: verdict.ok ? COPY.open : (check.alreadyChecked ? COPY.alreadyChecked : verdict.note || ""),
        // The proof button paints only on this. A signed-out reader, a
        // non-member and a verified resident all read false.
        canVerify: check.ok === true,
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
  const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
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
    const since = monthStart(deps.now ? deps.now() : new Date());
    const used = typeof deps.countPostsSince === "function"
      ? Number(await deps.countPostsSince(verdict.seatKey, hash, since))
      : Infinity;
    if (!(used < MONTHLY_COMMENTS)) return capRefusal();
    saved = await deps.insertPost({ ...values, capSince: since });
    if (!saved) return capRefusal();
  }
  return json({ post: publicPost({ ...saved, authorHash: hash }, hash) }, 201);
}
