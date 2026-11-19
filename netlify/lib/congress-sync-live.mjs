// ─────────────────────────────────────────────────────────────────────────────
// congress-sync-live.mjs — serve the newest published coverage file
// ─────────────────────────────────────────────────────────────────────────────
// The scheduled pulls (congress-sync-core.mjs) publish db/person-committees.json
// and db/cosponsorships.json to the "congress-sync" blob store. A reader asks
// for one of them here and gets the published copy when it is at least as new
// as the copy committed with the deploy, else the committed copy. Any blob
// error falls back to the committed copy too, so a store outage never blanks a
// person file. One read per instance per ttlMs.
// ─────────────────────────────────────────────────────────────────────────────
import { STORE_NAME, fileKey } from "./congress-sync-core.mjs";

// The date each file says it was fetched.
export const AS_OF = {
  "db/person-committees.json": (f) => String(f?.sources?.fetchedOn || ""),
  "db/cosponsorships.json": (f) => String(f?.fetchedOn || ""),
};

// Is `live` a usable copy of `repoPath`, no older than `committed`?
export function preferLive(repoPath, live, committed) {
  if (!live || typeof live !== "object") return false;
  const asOf = AS_OF[repoPath];
  if (repoPath === "db/person-committees.json" && !(live.committees && live.people)) return false;
  if (repoPath === "db/cosponsorships.json" && !(Array.isArray(live.bills) && live.people)) return false;
  return asOf(live) >= asOf(committed);
}

// liveFile(repoPath, committed, { storeFor, ttlMs, now }) → async () => file
export function liveFile(repoPath, committed, { storeFor, ttlMs = 10 * 60_000, now = Date.now } = {}) {
  let memo = null;
  return async function read() {
    if (memo && now() - memo.at < ttlMs) return memo.data;
    let data = committed;
    try {
      const store = await storeFor(STORE_NAME);
      const live = await store.get(fileKey(repoPath), { type: "json" });
      if (preferLive(repoPath, live, committed)) data = live;
    } catch (e) {
      console.log(`congress-sync live read: ${repoPath} from the committed copy (${e?.message || e})`);
    }
    memo = { at: now(), data };
    return data;
  };
}
