// ─────────────────────────────────────────────────────────────────────────────
// PDX Digest — the Notifications & "What Changed" backend
// ─────────────────────────────────────────────────────────────────────────────
// The interactive half of the notifications system. It serves the in-app "What
// Changed" digest and stores each user's opt-in notification preferences. The
// scheduled email half lives in pdx-digest-cron.mts; both share netlify/lib/digest.
//
// Routes (all under /api/pdx-digest):
//   POST /                      build the digest for the caller's interests
//                               body: { politicianIds?, issueKeys?, saved?, team?, since? }
//                               → { digest, prefs }   (works signed-out on public data)
//   GET  /prefs                 read the caller's notification preferences (auth)
//   PUT  /prefs                 update them (auth)   body: partial prefs
//   POST /seen                  advance the in-app "last seen" watermark (auth)
//
// DESIGN NOTES
//   • Non-spammy by construction: the digest is pull-only (the user visits it),
//     capped per group, and scoped to the people/issues the user already saved.
//   • Privacy: identity is the verified Firebase uid from the token — the client
//     can never read or write another user's prefs, and any uid in the body is
//     ignored. Building a digest needs no account (it reads only public activity),
//     so signed-out visitors still get a useful "what changed" from interests they
//     send inline; only prefs + the seen-watermark require a real account.

import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxNotificationPrefs } from "../../db/schema.js";
import {
  authenticate,
  buildDigest,
  interestsFromSnapshots,
  verifyUnsubToken,
  type Interests,
} from "../lib/digest.js";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FREQUENCIES = new Set(["off", "daily", "weekly"]);

// The default preferences a user has before they ever open settings: in-app on,
// email off, every topic on, weekly cadence pre-selected for when they opt into
// email. Calm and non-spammy out of the box.
function defaultPrefs(email: string | null = null) {
  return {
    email,
    inApp: true,
    emailEnabled: false,
    frequency: "weekly",
    topicEvidence: true,
    topicPromises: true,
    topicCommunity: true,
    topicTeam: true,
    lastSeenAt: null as string | null,
    lastDigestAt: null as string | null,
  };
}

// Shape a prefs row (or defaults) into the client-facing object.
function shapePrefs(row: typeof pdxNotificationPrefs.$inferSelect | null, email: string | null) {
  if (!row) return defaultPrefs(email);
  return {
    email: row.email,
    inApp: row.inApp,
    emailEnabled: row.emailEnabled,
    frequency: row.frequency,
    topicEvidence: row.topicEvidence,
    topicPromises: row.topicPromises,
    topicCommunity: row.topicCommunity,
    topicTeam: row.topicTeam,
    lastSeenAt: row.lastSeenAt ? (row.lastSeenAt as Date).toISOString() : null,
    lastDigestAt: row.lastDigestAt ? (row.lastDigestAt as Date).toISOString() : null,
  };
}

async function loadPrefsRow(userId: string) {
  const [row] = await db
    .select()
    .from(pdxNotificationPrefs)
    .where(eq(pdxNotificationPrefs.userId, userId))
    .limit(1);
  return row || null;
}

// ── GET /prefs ────────────────────────────────────────────────────────────────
async function getPrefs(userId: string, email: string | null): Promise<Response> {
  const row = await loadPrefsRow(userId);
  return json({ prefs: shapePrefs(row, email) });
}

// ── PUT /prefs — idempotent upsert of the caller's preferences ──────────────────
async function putPrefs(userId: string, email: string | null, req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const existing = await loadPrefsRow(userId);
  const base = existing ? shapePrefs(existing, email) : defaultPrefs(email);

  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const freq = FREQUENCIES.has(body?.frequency) ? body.frequency : base.frequency;
  // Prefer the verified token email; fall back to any the client supplied, then base.
  const em = email || (typeof body?.email === "string" ? body.email.slice(0, 320) : base.email);

  const values = {
    userId,
    email: em,
    inApp: bool(body?.inApp, base.inApp),
    emailEnabled: bool(body?.emailEnabled, base.emailEnabled),
    frequency: freq,
    topicEvidence: bool(body?.topicEvidence, base.topicEvidence),
    topicPromises: bool(body?.topicPromises, base.topicPromises),
    topicCommunity: bool(body?.topicCommunity, base.topicCommunity),
    topicTeam: bool(body?.topicTeam, base.topicTeam),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(pdxNotificationPrefs)
    .values(values)
    .onConflictDoUpdate({ target: pdxNotificationPrefs.userId, set: values })
    .returning();

  return json({ ok: true, prefs: shapePrefs(row, email) });
}

// ── POST /seen — advance the in-app "last seen" watermark to now ────────────────
async function markSeen(userId: string, email: string | null): Promise<Response> {
  const now = new Date();
  const [row] = await db
    .insert(pdxNotificationPrefs)
    .values({ userId, email, lastSeenAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: pdxNotificationPrefs.userId,
      set: { lastSeenAt: now, updatedAt: now },
    })
    .returning();
  return json({ ok: true, lastSeenAt: (row.lastSeenAt as Date).toISOString() });
}

// ── GET|POST /unsubscribe?u=<token> — one-click email opt-out, NO login ─────────
// The signed token (see digest.ts) authorizes turning email off for exactly one
// account, so a recipient can unsubscribe straight from the email. POST is the
// RFC 8058 one-click path mail clients hit automatically; GET is the human click,
// which returns a small confirmation page. Both are idempotent and only ever flip
// email OFF — the in-app digest and every other preference are untouched.
async function unsubscribe(req: Request, url: URL): Promise<Response> {
  const token = url.searchParams.get("u") || url.searchParams.get("token") || "";
  const userId = verifyUnsubToken(token);
  const isPost = req.method.toUpperCase() === "POST";

  if (!userId) {
    if (isPost) return new Response("invalid token", { status: 400 });
    return new Response(unsubPage(false), { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // Only flips the flag when a row exists — never creates a spurious prefs row.
  // We leave `frequency` intact so re-enabling later restores the user's cadence;
  // emailEnabled=false alone fully stops the scheduled sender.
  await db
    .update(pdxNotificationPrefs)
    .set({ emailEnabled: false, updatedAt: new Date() })
    .where(eq(pdxNotificationPrefs.userId, userId));

  if (isPost) return new Response("unsubscribed", { status: 200 });
  return new Response(unsubPage(true), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function unsubPage(ok: boolean): string {
  const site = "https://politidex.org";
  const body = ok
    ? `<h1>You're unsubscribed</h1><p>You will no longer receive email digests from PolitiDex. The in-app “What Changed” digest is unaffected — you can re-enable email any time in Notification settings.</p>`
    : `<h1>Link expired</h1><p>This unsubscribe link is invalid or has expired. You can turn email digests off directly in Notification settings.</p>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>PolitiDex email digests</title>` +
    `<div style="max-width:520px;margin:12vh auto;padding:0 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0f1e;text-align:center;">` +
    `<div style="font-size:22px;font-weight:800;">POLITI<span style="color:#c8102e;">DEX</span></div>` +
    `<div style="margin-top:18px;font-size:16px;line-height:1.55;color:#28324a;">${body}</div>` +
    `<p style="margin-top:24px;"><a href="${site}/#whats-changed" style="color:#c8102e;font-weight:700;text-decoration:none;">Open PolitiDex →</a></p>` +
    `</div>`;
}

// ── POST / — build the digest ───────────────────────────────────────────────────
async function digest(userId: string | null, email: string | null, req: Request): Promise<Response> {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Interests come from the client's live state when present (always available in
  // the browser), else from the caller's synced snapshots in the body, else — for
  // a signed-in caller — nothing extra (the client normally sends them).
  let interests: Interests;
  if (Array.isArray(body?.politicianIds) || Array.isArray(body?.issueKeys)) {
    interests = {
      politicianIds: (Array.isArray(body.politicianIds) ? body.politicianIds : [])
        .map((s: unknown) => String(s || "").trim())
        .filter(Boolean)
        .slice(0, 500),
      issueKeys: (Array.isArray(body.issueKeys) ? body.issueKeys : [])
        .map((s: unknown) => String(s || "").trim())
        .filter(Boolean)
        .slice(0, 500),
    };
  } else {
    interests = interestsFromSnapshots(body?.saved || null, body?.team || null);
  }

  // Load prefs (topics + last-seen watermark) for a signed-in caller.
  const row = userId ? await loadPrefsRow(userId) : null;
  const prefs = shapePrefs(row, email);

  // "since" priority: explicit body override → the user's last-seen watermark →
  // (buildDigest falls back to its default look-back window when since is 0).
  let since = 0;
  if (Number.isFinite(body?.since) && body.since > 0) since = body.since;
  else if (prefs.lastSeenAt) since = Date.parse(prefs.lastSeenAt);

  const topics = {
    evidence: prefs.topicEvidence,
    community: prefs.topicCommunity,
  };

  const built = await buildDigest(interests, since, topics);
  return json({ digest: built, prefs });
}

// ── Router ───────────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/pdx-digest/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();

  try {
    // Unsubscribe is token-authorized (the signed `u` param), so it runs BEFORE the
    // Firebase check and needs no login — that is the whole point of one-click opt-out.
    if (path === "/unsubscribe") {
      if (method === "GET" || method === "POST") return await unsubscribe(req, url);
      return json({ error: "Method not allowed" }, 405);
    }

    const user = await authenticate(req);

    if (path === "/prefs") {
      if (!user) return json({ error: "Authentication required" }, 401);
      if (method === "GET") return await getPrefs(user.uid, user.email);
      if (method === "PUT" || method === "POST") return await putPrefs(user.uid, user.email, req);
      return json({ error: "Method not allowed" }, 405);
    }

    if (path === "/seen") {
      if (!user) return json({ error: "Authentication required" }, 401);
      if (method === "POST" || method === "PUT") return await markSeen(user.uid, user.email);
      return json({ error: "Method not allowed" }, 405);
    }

    if (path === "" || path === "/") {
      if (method === "POST") return await digest(user?.uid || null, user?.email || null, req);
      return json({ error: "Method not allowed" }, 405);
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("pdx-digest error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/pdx-digest", "/api/pdx-digest/*"],
};
