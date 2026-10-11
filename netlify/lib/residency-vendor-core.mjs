// ─────────────────────────────────────────────────────────────────────────────
// Residency vendor — Didit, on the five composer seats, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
// The one writer of voice_residency.method = 'vendor'. Two handlers:
//
//   handleStart(req, deps)    POST /api/residency-verify { seat }
//     Any signed-in reader on SD-3, HD-16, SD-7, HD-15 or UT-2 asks to prove
//     they live in THAT seat. Membership is never asked: it only lifts the
//     daily comment/poll cap. The year includes the check for ONE seat: an account
//     that already holds a vendor row on another of the five is 403 too, read
//     from voice_residency itself — there is no counter. The seat comes from the board they pressed the button
//     on (COMPOSER_SEATS, named rows, no pattern) and the uid from the verified
//     Firebase token — never from anything else in the body. A Didit session
//     is created on the configured workflow (ID document + proof of address)
//     with vendor_data = {"uid","seat"} and its URL returned. Writes NOTHING to
//     Postgres: starting a check is not a claim.
//
//   handleWebhook(req, deps)  POST /api/residency-webhook   (Didit → us)
//     Writes one row — (seat, authorHash(uid, seat), 'verified', 'vendor') —
//     only when ALL of these hold:
//       1. X-Timestamp is within five minutes of now, AND X-Signature-V2 is the
//          HMAC-SHA256 of the sorted, compact JSON of the body, or X-Signature
//          the HMAC-SHA256 of the raw body, under the webhook secret
//          (timing-safe). The envelope-only X-Signature-Simple is not enough.
//       2. The session status is 'Approved' (and the decision's own, if sent).
//       3. The decision carries at least one ID verification AND at least one
//          proof-of-address verification, and every one of them is 'Approved'
//          (the document check and the address check both ran and passed).
//       4. vendor_data parses to { uid, seat } and seat is EXACTLY one of the
//          five canonical keys. The row is written for that seat and no other,
//          so a UT-2 session can only ever verify UT-2.
//     Anything else — unsigned, stale, In Review, Declined, Expired, Abandoned,
//     Resubmitted, no address check, a seat outside the five, a malformed
//     vendor_data — writes nothing. A revoked row is never overturned.
//
// NOTHING FROM THE VENDOR IS KEPT. No name, document number, image, address,
// session id or raw payload is stored or logged. The only thing that survives a
// decision is the seat-scoped hash the gates already look up.
//
// NO BACKDOOR. There is no env flag, query param or test hook that stamps
// verified: without the API key and the workflow id the start is 503, and
// without the webhook secret every webhook is 401. Tests verify by inserting a
// row into their own in-memory fake.
//
// Pure over injected deps, so scripts/test-residency-vendor.mjs drives the real
// handlers with no database and no network.

import crypto from "node:crypto";
import { authorHash } from "./district-voice-core.mjs";
import { COMPOSER_SEATS, composerSeat, otherVendorSeat } from "./district-board-voice-core.mjs";

export const VENDOR = "didit";
export const SESSION_URL = "https://verification.didit.me/v3/session/";
export const TIMESTAMP_TOLERANCE_S = 300;
// The session events a decision rides on. Transaction, business and test
// events are never a residency decision.
const SESSION_EVENTS = new Set(["status.updated", "data.updated"]);

export const COPY = {
  noSeat: "This board does not take a residency check.",
  signedOut: "Sign in to start. Reading stays open to everyone.",
  unavailable: "The ID check is not available right now. Posting stays closed on this board.",
  revoked: "Residency for this seat was revoked by a reviewer.",
  already: "You are already verified for this seat.",
  secondSeat: "Your ID and address check is already used on another seat. A second seat is not included.",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

// ── SIGNATURES ──────────────────────────────────────────────────────────────
export function sign(secret, raw) {
  return crypto.createHmac("sha256", String(secret)).update(raw, "utf8").digest("hex");
}

// Didit's V2 form: keys sorted at every depth, compact separators, Unicode
// left as is. JSON.stringify already writes whole floats as ints and leaves
// non-ASCII unescaped, which is what the vendor signs.
export function canonicalJson(v) {
  const sort = (x) => {
    if (Array.isArray(x)) return x.map(sort);
    if (x && typeof x === "object") {
      const o = {};
      for (const k of Object.keys(x).sort()) o[k] = sort(x[k]);
      return o;
    }
    return x;
  };
  return JSON.stringify(sort(v));
}

function hexEqual(header, want) {
  if (typeof header !== "string") return false;
  const got = header.trim().toLowerCase().replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(got)) return false;
  return crypto.timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(want, "hex"));
}

// headers: { timestamp, v2, raw } as sent (X-Timestamp, X-Signature-V2,
// X-Signature). nowS is the current Unix time in seconds.
export function signatureOk(secret, raw, headers, nowS) {
  if (!secret || !headers) return false;
  const ts = Number(String(headers.timestamp == null ? "" : headers.timestamp).trim());
  if (!headers.timestamp || !Number.isFinite(ts)) return false;
  if (Math.abs(nowS - ts) > TIMESTAMP_TOLERANCE_S) return false;
  if (headers.v2) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = undefined; }
    if (parsed !== undefined && hexEqual(headers.v2, sign(secret, canonicalJson(parsed)))) return true;
  }
  if (headers.raw && hexEqual(headers.raw, sign(secret, raw))) return true;
  return false;
}

// ── vendorData ──────────────────────────────────────────────────────────────
export function vendorData(uid, seatKey) {
  return JSON.stringify({ uid: String(uid), seat: String(seatKey) });
}

// { uid, seat } only when seat is EXACTLY a canonical composer seat. An alias,
// a neighbour district or a padded key is not "the seat they started from".
export function parseVendorData(raw) {
  if (typeof raw !== "string" || raw.length > 1000) return null;
  let v;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== "object") return null;
  const uid = typeof v.uid === "string" ? v.uid : "";
  const seat = typeof v.seat === "string" ? v.seat : "";
  if (!uid || uid.length > 128 || /\s/.test(uid)) return null;
  if (!seat || !Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, seat)) return null;
  return { uid, seat };
}

// ── THE DECISION ────────────────────────────────────────────────────────────
// True only for a final, positive decision where BOTH the document and the
// address checks ran and passed. Absence of either is a no: a workflow that is
// not configured for proof of address can never verify anybody.
// Didit sends per-feature results as arrays (id_verifications[],
// poa_verifications[]); a destination pinned to webhook v2 sends the singular
// id_verification / poa instead. Both are read; every item must be Approved.
function features(d, plural, singular) {
  const many = d[plural];
  if (Array.isArray(many)) return many;
  const one = d[singular];
  return one && typeof one === "object" ? [one] : [];
}
function allApproved(list) {
  return list.length > 0 && list.every((f) => f && typeof f === "object" && f.status === "Approved");
}
export function decisionPassed(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.webhook_type != null && !SESSION_EVENTS.has(payload.webhook_type)) return false;
  if (payload.status !== "Approved") return false;
  const d = payload.decision;
  if (!d || typeof d !== "object") return false;
  if (d.status != null && d.status !== "Approved") return false;
  if (!allApproved(features(d, "id_verifications", "id_verification"))) return false;
  if (!allApproved(features(d, "poa_verifications", "poa"))) return false;
  return true;
}

// The vendor_data the session was created with: the envelope's, else the
// decision's copy.
function vendorDataOf(payload) {
  if (typeof payload.vendor_data === "string") return payload.vendor_data;
  const d = payload.decision;
  return d && typeof d.vendor_data === "string" ? d.vendor_data : null;
}

// ── START ───────────────────────────────────────────────────────────────────
// deps:
//   verifyUser(req)                → { uid, isAnonymous } | null
//   config()                       → { apiKey, workflowId } (strings; '' when unset)
//   findResidency(seatKey, hash)   → { status, method } | null
//   createSession(url, headers, body) → { ok, data }    (fetch, injected)
//   callbackUrl(req, alias)        → string
//   limit(req, user)               → Response | null    (optional)
export async function handleStart(req, deps) {
  if (String(req.method || "").toUpperCase() !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload = {};
  try { payload = (await req.json()) || {}; } catch { payload = {}; }

  // Only the five seats accept a start. Alias or canonical, resolved to rows.
  const seatKey = composerSeat(payload.seat);
  if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

  const user = await deps.verifyUser(req);
  if (!user || user.isAnonymous || !user.uid) {
    return json({ error: COPY.signedOut, code: "signed_out" }, 403);
  }
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }

  const hash = authorHash(user.uid, seatKey);
  const row = await deps.findResidency(seatKey, hash);
  if (row && row.status === "revoked") return json({ error: COPY.revoked, code: "revoked" }, 403);
  if (row && row.status === "verified" && row.method === "vendor") {
    return json({ verified: true, message: COPY.already }, 200);
  }

  if (await otherVendorSeat(deps, user.uid, seatKey)) {
    return json({ error: COPY.secondSeat, code: "second_seat" }, 403);
  }

  const cfg = (await deps.config()) || {};
  if (!cfg.apiKey || !cfg.workflowId) {
    return json({ error: COPY.unavailable, code: "vendor_unavailable" }, 503);
  }

  const body = JSON.stringify({
    workflow_id: String(cfg.workflowId),
    vendor_data: vendorData(user.uid, seatKey),
    callback: deps.callbackUrl(req, COMPOSER_SEATS[seatKey]),
  });
  let res;
  try {
    res = await deps.createSession(
      SESSION_URL,
      { "content-type": "application/json", "accept": "application/json", "x-api-key": cfg.apiKey },
      body
    );
  } catch {
    res = null;
  }
  const url = res && res.ok && res.data && res.data.url;
  if (typeof url !== "string" || !/^https:\/\//.test(url)) {
    return json({ error: COPY.unavailable, code: "vendor_unavailable" }, 502);
  }
  return json({ url, seat: COMPOSER_SEATS[seatKey] }, 200);
}

// ── WEBHOOK ─────────────────────────────────────────────────────────────────
// deps:
//   config()                        → { webhookSecret }
//   findResidency(seatKey, hash)    → { status, method } | null
//   writeVerified(seatKey, hash)    → void   (the ONE write; never over 'revoked')
//   now()                           → Date   (optional)
export async function handleWebhook(req, deps) {
  if (String(req.method || "").toUpperCase() !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  const cfg = (await deps.config()) || {};

  // Unsigned, badly signed, stale, or no secret configured: refuse before
  // trusting anything in the body.
  if (!cfg.webhookSecret) return json({ error: "unauthorized" }, 401);
  const nowS = Math.floor((deps.now ? deps.now() : new Date()).getTime() / 1000);
  const sig = {
    timestamp: req.headers.get("x-timestamp"),
    v2: req.headers.get("x-signature-v2"),
    raw: req.headers.get("x-signature"),
  };
  if (!signatureOk(cfg.webhookSecret, raw, sig, nowS)) return json({ error: "unauthorized" }, 401);

  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ ok: true, written: false, reason: "malformed" }); }

  // Signed but not a pass: acknowledged (so the vendor does not retry) and
  // nothing is written. In-progress and other session events land here too.
  if (!decisionPassed(payload)) return json({ ok: true, written: false, reason: "not_passed" });

  const who = parseVendorData(vendorDataOf(payload));
  if (!who) return json({ ok: true, written: false, reason: "bad_seat" });

  const hash = authorHash(who.uid, who.seat);
  if (!hash) return json({ ok: true, written: false, reason: "bad_seat" });
  const row = await deps.findResidency(who.seat, hash);
  if (row && row.status === "revoked") return json({ ok: true, written: false, reason: "revoked" });

  await deps.writeVerified(who.seat, hash);
  return json({ ok: true, written: true });
}
