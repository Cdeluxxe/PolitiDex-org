// ─────────────────────────────────────────────────────────────────────────────
// locker-read.mjs — bounded Blobs reads for the Evidence Locker
// ─────────────────────────────────────────────────────────────────────────────
// Every Locker item is its own blob. Reading them all with one Promise.all opens
// one HTTPS socket per key at once; past ~1,000 items that exhausts the
// function's file descriptors (a Lambda allows 1,024), and for the rest of the
// invocation EVERY new connection — the raw-ingest pull, discovery and the
// Netlify Database driver — fails instantly with "fetch failed" (EMFILE, or
// ENOTFOUND because DNS cannot open a socket either). Reads go through a pool of
// LOCKER_READ_CONCURRENCY instead; the same documents come back in the same
// order, so nothing downstream (scoring, promotion) sees a difference.

export const LOCKER_READ_CONCURRENCY = 24;

/** `fn` over `items`, at most `limit` at a time; results keep input order. */
export async function mapLimit(items, limit, fn) {
  const list = [...(items || [])];
  const out = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) { const i = next++; out[i] = await fn(list[i], i); }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(Math.trunc(limit) || 1, list.length)) }, worker));
  return out;
}

/** [{ key, doc }] for `keys` (doc null when unreadable), LOCKER_READ_CONCURRENCY at a time. */
export function readLockerDocs(store, keys, { concurrency = LOCKER_READ_CONCURRENCY } = {}) {
  return mapLimit(keys, concurrency, async (key) => ({ key, doc: await store.get(key, { type: "json" }).catch(() => null) }));
}
