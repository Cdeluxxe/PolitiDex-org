// ─────────────────────────────────────────────────────────────────────────────
// dirkey-flag-core.mjs — "Flag a problem" on the person-page directional-key
// section: validate a flag and queue it for a later batch pass
// ─────────────────────────────────────────────────────────────────────────────
// A flag records the person id, the directional key, an optional note and a
// timestamp, as one record in the "dirkey-flags" Blobs store. That is all it
// does: it does not hide, change or re-score the row on the page, and nothing
// reads the store on the public side. A later batch pass reads the store next
// to the rows tagged { source: "auto" }.
//
// Pure and dependency-injected (store, now, keys) so the suite can run it
// without a Blobs environment. The HTTP side is the POST branch of
// netlify/functions/evidence-locker-items.mts.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { MAPPED_KEYS } from "./bill-key-patterns.mjs";

export const FLAG_STORE_NAME = "dirkey-flags";
export const FLAG_KIND = "dirkey_flag";
export const FLAG_NOTE_MAX = 1000;
const PID = /^[a-z0-9_]{1,80}$/;

/** → { ok: true, flag } | { ok: false, error } */
export function parseFlag(body, { keys = MAPPED_KEYS, now = () => new Date() } = {}) {
  if (!body || typeof body !== "object" || body.kind !== FLAG_KIND) return { ok: false, error: "not a flag" };
  const pid = String(body.politician_id || "");
  const key = String(body.key || "");
  if (!PID.test(pid)) return { ok: false, error: "unknown person" };
  if (!keys.includes(key)) return { ok: false, error: "unknown issue" };
  const note = String(body.note ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, FLAG_NOTE_MAX);
  return { ok: true, flag: { politician_id: pid, key, ...(note ? { note } : {}), flagged_at: now().toISOString() } };
}

/** Store key: one record per flag, grouped by person and key for the batch pass. */
export const flagKey = (flag, id = randomUUID()) => `${flag.politician_id}/${flag.key}/${flag.flagged_at.replace(/[:.]/g, "-")}-${id.slice(0, 8)}.json`;

/** Validate and queue one flag. → { status, body } */
export async function recordFlag(body, { store, keys = MAPPED_KEYS, now = () => new Date(), id } = {}) {
  const p = parseFlag(body, { keys, now });
  if (!p.ok) return { status: 400, body: { error: p.error } };
  const key = flagKey(p.flag, id);
  await store.setJSON(key, p.flag);
  return { status: 202, body: { ok: true } };
}

/** Every queued flag (for the later batch pass). */
export async function listFlags(store) {
  const { blobs } = await store.list();
  const out = [];
  for (const b of blobs) {
    const doc = await store.get(b.key, { type: "json" }).catch(() => null);
    if (doc) out.push({ store_key: b.key, ...doc });
  }
  return out.sort((a, b) => String(a.flagged_at).localeCompare(String(b.flagged_at)));
}
