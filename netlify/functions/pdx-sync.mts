// ─────────────────────────────────────────────────────────────────────────────
// PDX Sync — cross-device account sync backend (Phase 1: push + read-back)
// ─────────────────────────────────────────────────────────────────────────────
// The first real server-side piece of the sync system that PDXStore prepares for
// on the client. It implements the REMOTE BACKEND CONTRACT documented in
// index.html (search "REMOTE BACKEND CONTRACT"): a client registers a backend
// that PUTs a collection's full snapshot upstream, and PDXStore clears the
// collection's "dirty" flag once the server confirms the store.
//
// Storage is Netlify Database (managed Postgres) via Drizzle. Each snapshot is a
// single row in `pdx_snapshots`, keyed uniquely by (user_id, collection). A push
// is a full-snapshot upsert, which makes it idempotent: retrying a failed push
// simply re-writes the same row and can never lose or duplicate data.
//
// Routes (all under /api/pdx-sync):
//   PUT  /:collection          push a snapshot   (body: { userId, snapshot, revision? })
//   GET  /:collection          pull a snapshot   (?userId=...)  → snapshot or 204
//   GET  /:collection/meta     last-synced meta  (?userId=...)  → { syncedAt, revision }
//
// SECURITY — Phase 1 scope
//   There is NO authentication yet. The client passes an opaque `userId` and the
//   server trusts it as-is. This is deliberate for this phase; verifying the
//   caller's identity against a real token is the next step and will replace the
//   trusted-userId reads below without changing the storage shape. Because there
//   is no auth, this endpoint must not store anything sensitive — the `saved`
//   collection is non-sensitive personal bookmarks/tags/notes.
//
//   To keep the blast radius small while unauthenticated, writes are limited to
//   an allow-list of collections (currently just `saved`) and snapshot size is
//   capped.

import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxSnapshots } from "../../db/schema.js";

// Collections a client is allowed to sync in this phase. PDXStore also defines a
// `team` collection, but this first server-side step focuses on `saved` only.
const ALLOWED_COLLECTIONS = new Set(["saved"]);

// A sane ceiling so an unauthenticated caller can't push an unbounded payload.
// The `saved` collection is small (bookmarks + short tags/notes); 1 MB is very
// generous headroom.
const MAX_SNAPSHOT_BYTES = 1_000_000;

// Basic shape/length guard for the opaque user identifier.
const MAX_USER_ID_LEN = 256;

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

function checkUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.length > 0 && userId.length <= MAX_USER_ID_LEN;
}

// ── PUT /:collection — push a snapshot (idempotent full-snapshot upsert) ──────
async function pushSnapshot(collection: string, req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userId = body?.userId;
  if (!checkUserId(userId)) {
    return json({ error: "Missing or invalid userId" }, 400);
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
// Not used by the push-only client flow yet, but implemented now so the future
// sync loop can adopt pull() without a backend change. userId comes from the
// query string in this phase; auth will supply it later.
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
    // /:collection/meta  (GET)
    const metaMatch = path.match(/^\/([a-z0-9_-]+)\/meta$/i);
    if (metaMatch) {
      const collection = metaMatch[1];
      const bad = checkCollection(collection);
      if (bad) return bad;
      if (method !== "GET") return json({ error: "Method not allowed" }, 405);
      const userId = url.searchParams.get("userId") || "";
      if (!checkUserId(userId)) return json({ error: "Missing or invalid userId" }, 400);
      return await metaSnapshot(collection, userId);
    }

    // /:collection  (PUT push, GET pull)
    const colMatch = path.match(/^\/([a-z0-9_-]+)$/i);
    if (colMatch) {
      const collection = colMatch[1];
      const bad = checkCollection(collection);
      if (bad) return bad;

      if (method === "PUT" || method === "POST") {
        return await pushSnapshot(collection, req);
      }
      if (method === "GET") {
        const userId = url.searchParams.get("userId") || "";
        if (!checkUserId(userId)) return json({ error: "Missing or invalid userId" }, 400);
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
