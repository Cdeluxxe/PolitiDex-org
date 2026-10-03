// ─────────────────────────────────────────────────────────────────────────────
// Membership — a $20 yearly Stripe subscription that LIFTS THE MONTHLY CAP
// ─────────────────────────────────────────────────────────────────────────────
// THREE DOORS, AND THEY DO NOT COLLAPSE:
//
//   1. account     a verified, non-anonymous Firebase sign-in. Required to post
//                  or vote. Proof of nothing.
//   2. residency   a voice_residency row for THAT exact seat with status
//                  'verified' and method 'vendor'. No row, no post and no vote —
//                  paid or not. The board gates ask this FIRST, and nothing in
//                  this file can answer it.
//   3. membership  a voice_membership row for the ACCOUNT, active. It names no
//                  seat, writes no residency row and opens no seat. It does two
//                  things: it lifts the monthly cap on seats door 2 already
//                  opened, and it lets the account START the vendor check for
//                  one seat (residency-vendor-core.mjs). Only the signed vendor
//                  decision then writes door 2; a second seat is not included.
//
// THE CAP. A verified non-member gets ONE comment and FIVE poll votes a month on
// a seat — the month is Utah's calendar month (America/Denver), because every
// seat that takes a voice is a Utah seat. A second comment, a sixth vote or a
// vote on a sixth issue the same month is refused with CAP_COPY: a line that
// names the cap. It is not a paywall slogan and it does not mention money.
// Counts still publish; reading stays free.
//
// The cap reads the timestamps already stored — voice_takes.created_at and
// voice_poll_votes.updated_at — so it needs no ledger. A vote "used" this month
// is a vote row on this seat cast or changed since the month began; changing a
// vote already used this month does not use another, and once five are used
// any new or changed vote is refused.
//
// ONLY THE SIGNED WEBHOOK WRITES THE FLAG. handleWebhook checks the
// Stripe-Signature header (HMAC-SHA256 over "t.raw" under STRIPE_WEBHOOK_SECRET,
// timing-safe, five-minute tolerance) before it parses a byte. Then it moves the
// flag only on a customer.subscription.* event whose every item is
// STRIPE_PRICE_ID and whose metadata names an account hash this code minted.
// Unsigned, wrong price, pending (incomplete / past_due / trialing) and any
// other event type write nothing. Checkout starting writes nothing either.
//
// NOTHING PERSON-SHAPED IS KEPT. The account hash is sha256('member:' + uid),
// truncated: not the uid, and not the seat-scoped author hash, so a membership
// row cannot be joined to a post. Stripe's metadata carries the hash, never the
// uid. No email, customer id, card or amount is stored, and no board endpoint
// returns the flag or the hash.
//
// SECRETS LIVE IN NETLIFY ENV ONLY: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and
// STRIPE_PRICE_ID. Without them checkout is 503 and every webhook writes nothing.
//
// Pure over injected deps, so scripts/test-membership-cap.mjs drives the real
// handlers with no database and no network.

import crypto from "node:crypto";

export const PRICE_LABEL = "$20 a year";
export const MONTHLY_COMMENTS = 1;
export const MONTHLY_VOTES = 5;
export const CAP_TZ = "America/Denver";
export const SIGNATURE_TOLERANCE_SECONDS = 300;
// A missed cancel still lapses: the flag stops counting this long after the paid
// period Stripe last reported, whatever the row says.
export const PERIOD_GRACE_MS = 2 * 24 * 3600 * 1000;
export const STRIPE_API = "https://api.stripe.com/v1";

// THE LINES THAT NAME THE CAP. Shown verbatim by the composer and the poll when
// the server refuses; neither mentions money.
export const CAP_COPY = {
  comment: "Verified residents get one comment a month on this seat, and this month's is used. " +
    "The next one opens on the 1st, Mountain time.",
  vote: "Verified residents get five poll votes a month on this seat, and this month's are used — " +
    "changing a vote counts as a vote. The next ones open on the 1st, Mountain time.",
};

// The server's own lines for /api/membership. /me's fixed copy (reading is free,
// one comment and five poll votes a month per verified seat, $20 a year removes
// the cap) lives in me.html; these are only what the endpoint answers with.
export const ME_COPY = {
  signedOut: "Sign in to become a member.",
  active: "You are a member. The monthly cap is off on every seat you are verified for.",
  unavailable: "Membership checkout is not available right now.",
};

// ── IDENTITY ────────────────────────────────────────────────────────────────
export function accountHash(uid) {
  const u = String(uid == null ? "" : uid).trim();
  if (!u) return "";
  return crypto.createHash("sha256").update(`member:${u}`).digest("hex").slice(0, 32);
}

function isAccountHash(v) {
  return typeof v === "string" && /^[0-9a-f]{32}$/.test(v);
}

// The flag, over a resolved row. Active AND inside its paid period (plus grace).
export function isMember(row, now = new Date()) {
  if (!row || typeof row !== "object" || row.status !== "active") return false;
  if (row.currentPeriodEnd == null) return true;
  const end = new Date(row.currentPeriodEnd).getTime();
  if (!Number.isFinite(end)) return false;
  return end + PERIOD_GRACE_MS > now.getTime();
}

// For a gate: the caller's flag, failing CLOSED (capped) on any missing dep,
// signed-out caller or lookup error.
export async function memberFor(deps, user) {
  if (!deps || typeof deps.findMembership !== "function") return false;
  if (!user || user.isAnonymous || !user.uid) return false;
  try {
    const row = await deps.findMembership(accountHash(user.uid));
    return isMember(row, deps.now ? deps.now() : new Date());
  } catch {
    return false;
  }
}

// ── THE DAY AND THE MONTH ───────────────────────────────────────────────────
// How far the zone's wall clock is ahead of UTC at one instant, in ms.
function offsetAt(instant, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const wallAsUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

function wallDate(now, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: g("year"), m: g("month"), d: g("day") };
}

// The instant a wall-clock midnight happened, using the offset in force AT that
// midnight — not the offset now, which differs on a DST-switch day (Utah's
// switch is 2 a.m., so midnight is always on the old side of it).
function midnight(y, m, d, tz) {
  const wall = Date.UTC(y, m - 1, d);
  const guess = wall - offsetAt(wall, tz);
  return new Date(wall - offsetAt(guess, tz));
}

// The instant the current Mountain-time day began.
export function dayStart(now = new Date(), tz = CAP_TZ) {
  const { y, m, d } = wallDate(now, tz);
  return midnight(y, m, d, tz);
}

// The instant the current Mountain-time calendar month began: midnight on the 1st.
export function monthStart(now = new Date(), tz = CAP_TZ) {
  const { y, m } = wallDate(now, tz);
  return midnight(y, m, 1, tz);
}

// ── RESPONSES ───────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

// ── STRIPE SIGNATURE ────────────────────────────────────────────────────────
export function stripeSign(secret, timestamp, raw) {
  return crypto.createHmac("sha256", String(secret)).update(`${timestamp}.${raw}`, "utf8").digest("hex");
}

export function stripeSignatureOk(secret, raw, header, nowSeconds, tolerance = SIGNATURE_TOLERANCE_SECONDS) {
  if (!secret || typeof header !== "string" || !header) return false;
  let t = "";
  const sigs = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1" && /^[0-9a-f]{64}$/.test(v)) sigs.push(v);
  }
  if (!/^\d{1,12}$/.test(t) || !sigs.length) return false;
  if (Math.abs(Number(nowSeconds) - Number(t)) > tolerance) return false;
  const want = Buffer.from(stripeSign(secret, t, raw), "hex");
  return sigs.some((s) => crypto.timingSafeEqual(Buffer.from(s, "hex"), want));
}

// ── STATUS + CHECKOUT ───────────────────────────────────────────────────────
// deps:
//   verifyUser(req)              → { uid, isAnonymous } | null
//   config()                     → { secretKey, webhookSecret, priceId }   ('' when unset)
//   findMembership(accountHash)  → row | null
//   createCheckout(params)       → { ok, data }   (POST /v1/checkout/sessions, injected)
//   origin(req)                  → 'https://…'
//   limit(req, user)             → Response | null   (optional)
//   now()                        → Date              (optional)
//
//   GET  → the CALLER'S OWN flag, for /me only: { signedIn, member }.
//   POST → { url } to a Stripe Checkout session that returns to /me.
export async function handleMembership(req, deps) {
  const method = String(req.method || "GET").toUpperCase();
  const user = await deps.verifyUser(req);
  const signedIn = !!(user && !user.isAnonymous && user.uid);

  if (method === "GET") {
    const member = signedIn ? await memberFor(deps, user) : false;
    return json({ signedIn, member });
  }
  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!signedIn) return json({ error: ME_COPY.signedOut, code: "signed_out" }, 403);
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }
  if (await memberFor(deps, user)) return json({ member: true, message: ME_COPY.active }, 200);

  const cfg = (await deps.config()) || {};
  if (!cfg.secretKey || !cfg.priceId) {
    return json({ error: ME_COPY.unavailable, code: "checkout_unavailable" }, 503);
  }
  const hash = accountHash(user.uid);
  const origin = String(deps.origin(req) || "").replace(/\/+$/, "");
  const params = {
    mode: "subscription",
    "line_items[0][price]": cfg.priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/me?membership=returned`,
    cancel_url: `${origin}/me?membership=cancelled`,
    client_reference_id: hash,
    "metadata[account]": hash,
    "subscription_data[metadata][account]": hash,
  };
  let res;
  try { res = await deps.createCheckout(params, cfg.secretKey); } catch { res = null; }
  const url = res && res.ok && res.data && res.data.url;
  if (typeof url !== "string" || !/^https:\/\//.test(url)) {
    return json({ error: ME_COPY.unavailable, code: "checkout_unavailable" }, 502);
  }
  return json({ url }, 200);
}

// ── THE WEBHOOK'S DECISION ──────────────────────────────────────────────────
export const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];
const ACTIVE = ["active"];
const ENDED = ["canceled", "unpaid", "incomplete_expired", "paused"];

// Every item on the subscription is OUR price, and there is at least one.
export function priceMatches(sub, priceId) {
  const items = sub && sub.items && Array.isArray(sub.items.data) ? sub.items.data : [];
  if (!priceId || !items.length) return false;
  return items.every((i) => i && i.price && i.price.id === priceId);
}

function periodEnd(sub) {
  const ends = [];
  if (Number.isFinite(Number(sub.current_period_end)) && sub.current_period_end) ends.push(Number(sub.current_period_end));
  for (const i of (sub.items && sub.items.data) || []) {
    if (i && Number.isFinite(Number(i.current_period_end)) && i.current_period_end) ends.push(Number(i.current_period_end));
  }
  return ends.length ? new Date(Math.max(...ends) * 1000) : null;
}

// What an event would write, or { write: false, reason }. Pure.
export function decide(event, priceId) {
  if (!event || typeof event !== "object" || !SUBSCRIPTION_EVENTS.includes(event.type)) {
    return { write: false, reason: "ignored_event" };
  }
  const sub = event.data && event.data.object;
  if (!sub || typeof sub !== "object" || typeof sub.id !== "string" || !sub.id) {
    return { write: false, reason: "malformed" };
  }
  if (!priceMatches(sub, priceId)) return { write: false, reason: "wrong_price" };
  const hash = sub.metadata && sub.metadata.account;
  if (!isAccountHash(hash)) return { write: false, reason: "no_account" };
  let status = "";
  if (event.type === "customer.subscription.deleted" || ENDED.includes(sub.status)) status = "inactive";
  else if (ACTIVE.includes(sub.status)) status = "active";
  else return { write: false, reason: "pending" };
  const at = Number(event.created);
  return {
    write: true,
    row: {
      accountHash: hash,
      status,
      subscriptionId: sub.id,
      currentPeriodEnd: periodEnd(sub),
      lastEventAt: new Date((Number.isFinite(at) && at > 0 ? at : 0) * 1000),
    },
  };
}

// deps:
//   config()                     → { webhookSecret, priceId }
//   findMembership(accountHash)  → { status, subscriptionId, lastEventAt } | null
//   writeMembership(row)         → void   (upsert on account_hash — the ONE write)
//   now()                        → Date   (optional)
export async function handleWebhook(req, deps) {
  if (String(req.method || "").toUpperCase() !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  const cfg = (await deps.config()) || {};
  const now = deps.now ? deps.now() : new Date();

  // Unsigned, badly signed, stale, or no secret configured: refuse before parsing.
  if (!cfg.webhookSecret || !cfg.priceId) return json({ error: "unauthorized" }, 401);
  if (!stripeSignatureOk(cfg.webhookSecret, raw, req.headers.get("stripe-signature"), Math.floor(now.getTime() / 1000))) {
    return json({ error: "unauthorized" }, 400);
  }

  let event;
  try { event = JSON.parse(raw); } catch { return json({ received: true, written: false, reason: "malformed" }); }

  const d = decide(event, cfg.priceId);
  if (!d.write) return json({ received: true, written: false, reason: d.reason });

  const existing = await deps.findMembership(d.row.accountHash);
  if (existing && existing.lastEventAt && new Date(existing.lastEventAt).getTime() > d.row.lastEventAt.getTime()) {
    return json({ received: true, written: false, reason: "stale" });
  }
  // A clear only ever clears the subscription that set the flag. Ending an old
  // subscription cannot switch off a newer one, and clearing an account that was
  // never a member writes nothing.
  if (d.row.status === "inactive" && (!existing || existing.subscriptionId !== d.row.subscriptionId)) {
    return json({ received: true, written: false, reason: "not_current" });
  }
  await deps.writeMembership(d.row);
  return json({ received: true, written: true });
}
