// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evidence-locker/items — pipeline-written Evidence Locker items
// ─────────────────────────────────────────────────────────────────────────────
// Read-only. Lists the finished items the raw-ingest cron wrote to the
// "evidence-locker" Blobs store and returns them in the spotlight-entry shape
// the existing Evidence Locker components already render, grouped by
// politician id: { items: { <pid>: [entry, …] }, count }.
//
// Manual review flags (db/evidence-locker-review.json, or a `review` field on
// the stored item): a "hidden" item is left out entirely, so no profile or
// Locker page can show it; "reviewed" and "needs_edit" items are served with
// `review.status` so the profile can print its "Reviewed" note. Every entry
// carries its store key under pipeline.key, which is what a flag row names.
//
// Stated layer: an explicit campaign/official claim stored under the older
// rules is served as a normal stated position (regradeStatedPosition), and one
// claim quoted under several issue keys is served once (collapseRestatedItems).
// Every entry is marked layer "stated" / formal_record false: what was said,
// never a formal action.
//
// POST (same path) — "Flag a problem" on the person-page directional-key
// section: { kind: "dirkey_flag", politician_id, key, note? }. Recorded with a
// timestamp in the "dirkey-flags" Blobs store for a later batch pass
// (netlify/lib/dirkey-flag-core.mjs). It changes nothing anyone sees; the GET
// side never reads it. Rate-limited per IP; no sign-in.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { LOCKER_STORE_NAME, toSpotlightEntry, loadReviewFlags, reviewFor, regradeStatedPosition, collapseRestatedItems, readableWeakerItem, ownEvidenceRows } from "../lib/evidence-locker-core.mjs";
import { readLockerDocs } from "../lib/locker-read.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };
import { recordFlag, FLAG_STORE_NAME } from "../lib/dirkey-flag-core.mjs";

// ?pid=<id>[,<id>…] — one politician's items only. Every key is stored as
// "<politician_id>/<issue>/<hash>.json", so a prefix list reads that person's
// handful of blobs instead of the whole store. The full list has grown past
// 30,000 blobs and takes longer to read than the CDN waits, so a person page
// asks for its own politician this way. Same filters, same shape, same order.
export const PID_PARAM_MAX = 6;
const PID_RE = /^[A-Za-z0-9_-]{1,80}$/;
export function pidsFromUrl(url: string): string[] {
  let raw = "";
  try { raw = new URL(url).searchParams.get("pid") || ""; } catch { raw = ""; }
  const out: string[] = [];
  for (const p of raw.split(",")) {
    const id = p.trim();
    if (PID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= PID_PARAM_MAX) break;
  }
  return out;
}

async function listKeys(store: any, pids: string[] | null): Promise<string[]> {
  if (!pids) {
    const { blobs } = await store.list();
    return blobs.map((b: any) => b.key);
  }
  const keys: string[] = [];
  for (const id of pids) {
    const { blobs } = await store.list({ prefix: `${id}/` });
    for (const b of blobs) if (!keys.includes(b.key)) keys.push(b.key);
  }
  return keys;
}

export async function listLockerEntries(store: any, flagsDoc: any = reviewFile, { pids = null }: { pids?: string[] | null } = {}) {
  const flags = loadReviewFlags(flagsDoc);
  const items: Record<string, any[]> = {};
  let count = 0, hidden = 0, unreadable = 0;
  const docs: any[] = await readLockerDocs(store, await listKeys(store, pids));
  const rows: any[] = [];
  for (const { key, doc } of docs) {
    if (!doc || !doc.politician_id || !doc.link) continue;
    const review = reviewFor(doc, key, flags);
    if (review?.status === "hidden") { hidden++; continue; }
    // Weak signals and mentions are served as clean readable text only; one
    // with nothing readable left (binary / PDF stream data) is not served.
    const served = readableWeakerItem(regradeStatedPosition(doc));
    if (!served) { unreadable++; continue; }
    rows.push({ key, doc: served, review });
  }
  const collapsed = collapseRestatedItems(rows);
  const restated = rows.length - collapsed.length;
  // Own pages only, site menus dropped, one sentence counted once (locker-own-v1).
  const { kept, dropped } = ownEvidenceRows(collapsed);
  for (const { key, doc, review } of kept) {
    (items[doc.politician_id] ||= []).push(toSpotlightEntry(doc, { key, review }));
    count++;
  }
  return {
    items, count, hidden, ...(restated ? { restated } : {}), ...(unreadable ? { unreadable } : {}),
    ...(dropped.foreign ? { not_own_page: dropped.foreign } : {}), ...(dropped.menu ? { site_menu: dropped.menu } : {}), ...(dropped.repeated ? { repeated: dropped.repeated } : {}),
  };
}

async function flag(req: Request): Promise<Response> {
  try {
    // Loaded here so the GET path (and the suite that imports this file) never touches the database.
    const { checkLimits, clientIp, tooManyRequests } = await import("../lib/rate-limit.js");
    const decision = await checkLimits("dirkey-flag", [{ cls: "ip", id: clientIp(req), limit: { max: 20, windowSeconds: 3600 } }]);
    if (!decision.ok) return tooManyRequests(decision.retryAfter);
  } catch (e: any) {
    console.log(`dirkey-flag: rate limit unavailable — ${e?.message || e}`);
  }
  let body: any = null;
  try { body = await req.json(); } catch { body = null; }
  try {
    const r = await recordFlag(body, { store: getStore(FLAG_STORE_NAME) });
    return Response.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.log(`dirkey-flag: ERROR ${e?.message || e}`);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "POST") return flag(req);
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  try {
    const pids = pidsFromUrl(req.url);
    const body = await listLockerEntries(getStore(LOCKER_STORE_NAME), reviewFile, { pids: pids.length ? pids : null });
    return Response.json(body, { headers: { "cache-control": "public, max-age=300" } });
  } catch (e: any) {
    console.log(`evidence-locker-items: ERROR ${e?.message || e}`);
    return Response.json({ items: {}, count: 0, error: "unavailable" }, { status: 503 });
  }
};

export const config: Config = {
  path: "/api/evidence-locker/items",
  method: ["GET", "POST"],
};
