// ─────────────────────────────────────────────────────────────────────────────
// Residency vendor — Veriff, on the five composer seats, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
// The one writer of voice_residency.method = 'vendor'. Two handlers:
//
//   handleStart(req, deps)    POST /api/residency-verify { seat }
//     A signed-in MEMBER on SD-3, HD-16, SD-7, HD-15 or UT-2 asks to prove they
//     live in THAT seat. Without an active membership flag it is 403 and no
//     session is created. The year includes the check for ONE seat: an account
//     that already holds a vendor row on another of the five is 403 too, read
//     from voice_residency itself — there is no counter. The seat comes from the board they pressed the button
//     on (COMPOSER_SEATS, named rows, no pattern) and the uid from the verified
//     Firebase token — never from anything else in the body. A Veriff session
//     is created with vendorData = {"uid","seat"} and its URL returned. Writes
//     NOTHING to Postgres: starting a check is not a claim.
//
//   handleWebhook(req, deps)  POST /api/residency-webhook   (Veriff → us)
//     Writes one row — (seat, authorHash(uid, seat), 'verified', 'vendor') —
//     only when ALL of these hold:
//       1. X-HMAC-SIGNATURE is the HMAC-SHA256 of the raw body under the shared
//          secret (timing-safe), and X-AUTH-CLIENT, when sent, is our key.
//       2. verification.status === 'approved' AND code === 9001.
//       3. verification.document is present (the document check ran) AND
//          verification.additionalVerifiedData.proofOfAddress is present (the
//          address check ran), with no failed name match and no HIGH_RISK
//          fraud verdict on the address document.
//       4. vendorData parses to { uid, seat } and seat is EXACTLY one of the
//          five canonical keys. The row is written for that seat and no other,
//          so a UT-2 session can only ever verify UT-2.
//     Anything else — unsigned, pending, review, declined, expired, abandoned,
//     resubmission, a seat outside the five, a malformed vendorData — writes
//     nothing. A revoked row is never overturned.
//
// NOTHING FROM THE VENDOR IS KEPT. No name, document number, image, address,
// session id or raw payload is stored or logged. The only thing that survives a
// decision is the seat-scoped hash the gates already look up.
//
// NO BACKDOOR. There is no env flag, query param or test hook that stamps
// verified: without both Veriff secrets the start is 503 and every webhook is
// 401. Tests verify by inserting a row into their own in-memory fake.
//
// Pure over injected deps, so scripts/test-residency-vendor.mjs drives the real
// handlers with no database and no network.

import crypto from "node:crypto";
import { authorHash } from "./district-voice-core.mjs";
import { COMPOSER_SEATS, composerSeat, otherVendorSeat } from "./district-board-voice-core.mjs";
import { memberFor } from "./membership-core.mjs";

export const VENDOR = "veriff";
export const DEFAULT_API_URL = "https://stationapi.veriff.com";
export const APPROVED_CODE = 9001;

export const COPY = {
  noSeat: "This board does not take a residency check.",
  signedOut: "Sign in to start. Reading stays open to everyone.",
  unavailable: "The ID check is not available right now. Posting stays closed on this board.",
  revoked: "Residency for this seat was revoked by a reviewer.",
  already: "You are already verified for this seat.",
  notMember: "The ID and address check is open to members. Posting stays closed on this board.",
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

export function signatureOk(secret, raw, header) {
  if (!secret || typeof header !== "string") return false;
  const got = header.trim().toLowerCase().replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(got)) return false;
  const want = sign(secret, raw);
  return crypto.timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(want, "hex"));
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
// address checks ran. Absence of either is a no: an integration that is not
// configured for proof of address can never verify anybody.
export function decisionPassed(payload) {
  const v = payload && typeof payload === "object" ? payload.verification : null;
  if (!v || typeof v !== "object") return false;
  if (v.status !== "approved" || Number(v.code) !== APPROVED_CODE) return false;
  if (!v.document || typeof v.document !== "object") return false;
  const avd = v.additionalVerifiedData;
  const poa = avd && typeof avd === "object" ? avd.proofOfAddress : null;
  if (!poa || typeof poa !== "object") return false;
  if (poa.nameMatch === false) return false;
  if (poa.fraud && typeof poa.fraud === "object" && poa.fraud.riskLevel === "HIGH_RISK") return false;
  return true;
}

// ── START ───────────────────────────────────────────────────────────────────
// deps:
//   verifyUser(req)                → { uid, isAnonymous } | null
//   config()                       → { apiKey, sharedSecret, apiUrl } (strings; '' when unset)
//   findResidency(seatKey, hash)   → { status, method } | null
//   findMembership(accountHash)    → voice_membership row | null  (missing = not a member)
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

  // Membership opens the CHECK, never the seat. Fails closed on a missing dep.
  if (!(await memberFor(deps, user))) {
    return json({ error: COPY.notMember, code: "not_member" }, 403);
  }
  if (await otherVendorSeat(deps, user.uid, seatKey)) {
    return json({ error: COPY.secondSeat, code: "second_seat" }, 403);
  }

  const cfg = (await deps.config()) || {};
  if (!cfg.apiKey || !cfg.sharedSecret) {
    return json({ error: COPY.unavailable, code: "vendor_unavailable" }, 503);
  }

  const body = JSON.stringify({
    verification: {
      callback: deps.callbackUrl(req, COMPOSER_SEATS[seatKey]),
      vendorData: vendorData(user.uid, seatKey),
    },
  });
  let res;
  try {
    res = await deps.createSession(
      String(cfg.apiUrl || DEFAULT_API_URL).replace(/\/+$/, "") + "/v1/sessions",
      {
        "content-type": "application/json",
        "x-auth-client": cfg.apiKey,
        "x-hmac-signature": sign(cfg.sharedSecret, body),
      },
      body
    );
  } catch {
    res = null;
  }
  const url = res && res.ok && res.data && res.data.verification && res.data.verification.url;
  if (typeof url !== "string" || !/^https:\/\//.test(url)) {
    return json({ error: COPY.unavailable, code: "vendor_unavailable" }, 502);
  }
  return json({ url, seat: COMPOSER_SEATS[seatKey] }, 200);
}

// ── WEBHOOK ─────────────────────────────────────────────────────────────────
// deps:
//   config()                        → { apiKey, sharedSecret }
//   findResidency(seatKey, hash)    → { status, method } | null
//   writeVerified(seatKey, hash)    → void   (the ONE write; never over 'revoked')
export async function handleWebhook(req, deps) {
  if (String(req.method || "").toUpperCase() !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  const cfg = (await deps.config()) || {};

  // Unsigned, badly signed, or no secret configured: refuse before parsing.
  if (!cfg.sharedSecret || !cfg.apiKey) return json({ error: "unauthorized" }, 401);
  if (!signatureOk(cfg.sharedSecret, raw, req.headers.get("x-hmac-signature"))) {
    return json({ error: "unauthorized" }, 401);
  }
  const client = req.headers.get("x-auth-client");
  if (client != null && client !== cfg.apiKey) return json({ error: "unauthorized" }, 401);

  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ ok: true, written: false, reason: "malformed" }); }

  // Signed but not a pass: acknowledged (so the vendor does not retry) and
  // nothing is written. Event webhooks (started/submitted) land here too.
  if (!decisionPassed(payload)) return json({ ok: true, written: false, reason: "not_passed" });

  const who = parseVendorData(payload.verification.vendorData);
  if (!who) return json({ ok: true, written: false, reason: "bad_seat" });

  const hash = authorHash(who.uid, who.seat);
  if (!hash) return json({ ok: true, written: false, reason: "bad_seat" });
  const row = await deps.findResidency(who.seat, hash);
  if (row && row.status === "revoked") return json({ ok: true, written: false, reason: "revoked" });

  await deps.writeVerified(who.seat, hash);
  return json({ ok: true, written: true });
}
