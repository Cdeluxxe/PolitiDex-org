// ─────────────────────────────────────────────────────────────────────────────
// PDX Sync — cross-device account sync backend (Phase 2: authenticated sync)
// ─────────────────────────────────────────────────────────────────────────────
// The server-side half of the sync system that PDXStore drives on the client. It
// implements the REMOTE BACKEND CONTRACT documented in index.html (search
// "REMOTE BACKEND CONTRACT"): a client registers a backend that PUTs a
// collection's full snapshot upstream, and PDXStore clears the collection's
// "dirty" flag once the server confirms the store.
//
// Storage is Netlify Database (managed Postgres) via Drizzle. Each snapshot is a
// single row in `pdx_snapshots`, keyed uniquely by (user_id, collection). A push
// is a full-snapshot upsert, which makes it idempotent: retrying a failed push
// simply re-writes the same row and can never lose or duplicate data.
//
// Routes (all under /api/pdx-sync):
//   PUT  /:collection          push a snapshot   (body: { snapshot, revision? })
//   GET  /:collection          pull a snapshot   → snapshot or 204
//   GET  /:collection/meta     last-synced meta  → { syncedAt, revision }
//
// AUTHENTICATION — the identity is now REAL (this is the Phase-2 change).
//   Every request MUST carry the caller's Firebase ID token as
//   `Authorization: Bearer <token>`. We verify that token server-side against
//   Google's public signing keys — the exact same scheme the community function
//   uses (netlify/functions/community.mts) — and derive `userId` from the token's
//   verified `sub` (the Firebase uid). The client can no longer choose whose data
//   it reads or writes: any `userId` in the request body/query is IGNORED. This
//   is what makes each user's saved evidence private and safely syncable across
//   their own devices.
//
//   Requests without a token, or with an invalid/expired one, are rejected
//   (401). Anonymous Firebase sign-ins are rejected too (403): an anonymous uid
//   is minted fresh per browser, so syncing it would be pointless and would
//   re-introduce the per-device, non-private identity this phase removes. Only a
//   real (non-anonymous) account sync.
//
//   Writes remain limited to an allow-list of collections (currently just
//   `saved`) and snapshot size is capped, as defense in depth.

import type { Config } from "@netlify/functions";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxSnapshots } from "../../db/schema.js";

// The site's Firebase project — the audience every valid ID token must carry.
// Kept in sync with netlify/functions/community.mts and the client firebaseConfig.
const FIREBASE_PROJECT_ID = "politidex-979bd";

// Collections a client is allowed to sync. All three personal collections use the
// same tombstone + watermark snapshot format (see PDXSaved / PDXTeamSync /
// PDXEvidenceSync in index.html), so the server treats them identically — it only
// stores and returns opaque JSON snapshots keyed by (user_id, collection); all
// merge/GC logic lives on the client. Adding a collection here is purely an
// allow-list widening: no schema change, since every snapshot is just another row
// in the existing table.
const ALLOWED_COLLECTIONS = new Set(["saved", "team", "evidence", "impact", "stances"]);

// A sane ceiling so a caller can't push an unbounded payload. The `saved`
// collection is small (bookmarks + short tags/notes); 1 MB is generous headroom.
const MAX_SNAPSHOT_BYTES = 1_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Validate the collection name from the path against the allow-list.
function checkCollection(collection: string): Response | null {
  if (!collection) return json({ error: "Missing collection" }, 400);
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return json(
      { error: `Unknown or unsupported collection: ${collection}` },
      404
    );
  }
  return null;
}

// ── Firebase ID token verification ──────────────────────────────────────────
// Mirrors the scheme in netlify/functions/community.mts: verify the RS256-signed
// ID token WITHOUT firebase-admin (no service account needed) by checking its
// signature against Google's published x509 certs and validating the standard
// claims. Certs are cached in module scope until Google's Cache-Control expires.
// (This is duplicated rather than shared to keep the change scoped to sync and
// leave the working community function untouched; a future cleanup could extract
// a shared helper both import.)
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let _certCache: { certs: Record<string, string>; expires: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (_certCache && _certCache.expires > now) return _certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing certs");
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  const maxAge = m ? parseInt(m[1], 10) : 3600;
  _certCache = { certs, expires: now + maxAge * 1000 };
  return certs;
}

function b64urlToJson(seg: string): any {
  return JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
}

// The outcome of authenticating a request: either a verified identity, or a
// ready-to-return error Response with a precise status. Keeping the failure
// reason explicit lets callers distinguish "no token" / "expired" / "anonymous"
// so the client can react (retry vs. stay local-only) appropriately.
type AuthResult =
  | { userId: string }
  | { error: Response };

// Verify the caller's Firebase ID token and return the derived userId (the
// token's verified `sub`). Any userId supplied by the client is intentionally
// ignored — identity comes from the token alone.
async function authenticate(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { error: json({ error: "Authentication required" }, 401) };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { error: json({ error: "Invalid authentication token" }, 401) };
  }

  let header0: any, payload: any;
  try {
    header0 = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return { error: json({ error: "Invalid authentication token" }, 401) };
  }

  // Standard Firebase ID token claim checks.
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID)
    return { error: json({ error: "Invalid authentication token" }, 401) };
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`)
    return { error: json({ error: "Invalid authentication token" }, 401) };
  if (typeof payload.exp !== "number" || payload.exp < nowSec)
    return { error: json({ error: "Authentication token expired" }, 401) };
  if (typeof payload.sub !== "string" || !payload.sub)
    return { error: json({ error: "Invalid authentication token" }, 401) };

  // Signature check against the matching Google cert. A cert-fetch failure is a
  // transient server-side problem (not the caller's fault): answer 503 so the
  // client keeps its data dirty and retries, rather than treating it as a hard
  // auth rejection.
  let certs: Record<string, string>;
  try {
    certs = await getGoogleCerts();
  } catch (e) {
    console.error("pdx-sync: could not fetch Google certs:", e);
    return { error: json({ error: "Auth temporarily unavailable" }, 503) };
  }
  const pem = certs[header0.kid];
  if (!pem) return { error: json({ error: "Invalid authentication token" }, 401) };

  let ok = false;
  try {
    const pubKey = crypto.createPublicKey(pem);
    const signed = `${parts[0]}.${parts[1]}`;
    const sig = Buffer.from(parts[2], "base64url");
    ok = crypto.verify("RSA-SHA256", Buffer.from(signed), pubKey, sig);
  } catch {
    ok = false;
  }
  if (!ok) return { error: json({ error: "Invalid authentication token" }, 401) };

  // Reject anonymous sign-ins: an anonymous uid is per-browser and ephemeral, so
  // syncing it would re-create the per-device, non-private identity this phase
  // removes. The client already declines to sync anonymous sessions; this is the
  // authoritative server-side enforcement.
  const provider = payload.firebase?.sign_in_provider;
  const email = typeof payload.email === "string" ? payload.email : null;
  const isAnonymous = provider === "anonymous" || (!email && provider !== "custom");
  if (isAnonymous) {
    return {
      error: json(
        { error: "Anonymous accounts cannot sync; sign in to enable cross-device sync" },
        403
      ),
    };
  }

  return { userId: payload.sub };
}

// ── PUT /:collection — push a snapshot (idempotent full-snapshot upsert) ──────
// `userId` is the VERIFIED Firebase uid derived from the caller's token by the
// router — never a value the client chose. Any `userId` in the body is ignored.
async function pushSnapshot(collection: string, userId: string, req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // `snapshot` is the full serializable state of the collection. It must be
  // present (null/undefined means "nothing to store", which is a client bug).
  if (body?.snapshot === undefined || body?.snapshot === null) {
    return json({ error: "Missing snapshot" }, 400);
  }

  const snapshot = body.snapshot;
  const size = Buffer.byteLength(JSON.stringify(snapshot), "utf8");
  if (size > MAX_SNAPSHOT_BYTES) {
    return json(
      { error: `Snapshot too large (${size} bytes, max ${MAX_SNAPSHOT_BYTES})` },
      413
    );
  }

  // The client's revision counter is an ordering hint we echo back; default 0.
  const revision =
    Number.isInteger(body?.revision) && body.revision >= 0 ? body.revision : 0;

  const now = new Date();

  // Idempotent upsert: one row per (user_id, collection). A repeated push with
  // the same data simply rewrites the row — safe to retry after any failure.
  const [row] = await db
    .insert(pdxSnapshots)
    .values({ userId, collection, snapshot, revision, syncedAt: now })
    .onConflictDoUpdate({
      target: [pdxSnapshots.userId, pdxSnapshots.collection],
      set: { snapshot, revision, syncedAt: now },
    })
    .returning({
      syncedAt: pdxSnapshots.syncedAt,
      revision: pdxSnapshots.revision,
    });

  console.log(
    `pdx-sync push ok: user=${userId} collection=${collection} revision=${revision} bytes=${size}`
  );

  // Shape matches the contract's push() resolve value: { syncedAt, revision }.
  return json({
    ok: true,
    collection,
    syncedAt: row.syncedAt,
    revision: row.revision,
  });
}

// Look up a single snapshot row for (userId, collection), or null.
async function findRow(userId: string, collection: string) {
  const [row] = await db
    .select()
    .from(pdxSnapshots)
    .where(and(eq(pdxSnapshots.userId, userId), eq(pdxSnapshots.collection, collection)))
    .limit(1);
  return row || null;
}

// ── GET /:collection — pull the latest snapshot ──────────────────────────────
// `userId` is the verified Firebase uid from the caller's token (see router).
async function pullSnapshot(collection: string, userId: string): Promise<Response> {
  const row = await findRow(userId, collection);
  if (!row) {
    // 204: the server has no snapshot for this user+collection yet. The client
    // contract treats a null/empty pull as "server has none".
    return new Response(null, { status: 204 });
  }
  return json({
    collection,
    snapshot: row.snapshot,
    syncedAt: row.syncedAt,
    revision: row.revision,
  });
}

// ── GET /:collection/meta — cheap last-synced lookup ─────────────────────────
async function metaSnapshot(collection: string, userId: string): Promise<Response> {
  const row = await findRow(userId, collection);
  if (!row) return json({ syncedAt: null, revision: null });
  return json({ collection, syncedAt: row.syncedAt, revision: row.revision });
}

// ── Router ───────────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  // Strip the /api/pdx-sync prefix and trailing slashes to get the sub-path.
  const path = url.pathname.replace(/^\/api\/pdx-sync/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();

  try {
    // Every route is per-user, so authenticate up front and derive the userId
    // from the verified token. This replaces the old trusted client-supplied id:
    // the caller can no longer read or write another user's data.
    const auth = await authenticate(req);
    if ("error" in auth) return auth.error;
    const userId = auth.userId;

    // /:collection/meta  (GET)
    const metaMatch = path.match(/^\/([a-z0-9_-]+)\/meta$/i);
    if (metaMatch) {
      const collection = metaMatch[1];
      const bad = checkCollection(collection);
      if (bad) return bad;
      if (method !== "GET") return json({ error: "Method not allowed" }, 405);
      return await metaSnapshot(collection, userId);
    }

    // /:collection  (PUT push, GET pull)
    const colMatch = path.match(/^\/([a-z0-9_-]+)$/i);
    if (colMatch) {
      const collection = colMatch[1];
      const bad = checkCollection(collection);
      if (bad) return bad;

      if (method === "PUT" || method === "POST") {
        return await pushSnapshot(collection, userId, req);
      }
      if (method === "GET") {
        return await pullSnapshot(collection, userId);
      }
      return json({ error: "Method not allowed" }, 405);
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("pdx-sync error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/pdx-sync", "/api/pdx-sync/*"],
};
