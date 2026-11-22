// ─────────────────────────────────────────────────────────────────────────────
// Locker re-score — scheduled cron (re-runs on every RULES_VERSION bump; now phase9-v2)
// ─────────────────────────────────────────────────────────────────────────────
// Re-reads Evidence Locker items written under an older stance-scorer rules
// version against the page they came from, keeps the new read when it differs
// (or retires an item whose page no longer reads a position on its topic), and
// recomputes each touched politician's promoted stances. All of the logic is in
// netlify/lib/locker-rescore.mjs; this file wires the production stores, the
// stated-positions database adapter and the persisted cursor.
//
// Every minute, ~20 s of work per run, resumable. When the pass is complete the
// run is a no-op until the next RULES_VERSION bump starts a fresh pass. Each run
// logs "locker-rescore: …" lines (one per changed item) and a closing summary;
// the summary is also stored with the cursor for audit.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { rescoreStep, rescoreSummaryLine, RESCORE_STATE_KEY, RETIRED_STORE_NAME } from "../lib/locker-rescore.mjs";
import { loadReviewFlags, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import { lockerEntriesFor, syncPolitician } from "../lib/stated-positions-core.mjs";
import { RAW_STORE_NAME, ROTATION_STORE_NAME } from "../lib/raw-ingest-core.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

export const RUN_BUDGET_MS = 20_000;

export default async (): Promise<Response> => {
  const log = (l: string) => console.log(l);
  const lockerStore = getStore(LOCKER_STORE_NAME);
  const rawStore = getStore(RAW_STORE_NAME);
  const stateStore = getStore(ROTATION_STORE_NAME);
  const retiredStore = getStore(RETIRED_STORE_NAME);
  const flags = loadReviewFlags(reviewFile);
  const state = await stateStore.get(RESCORE_STATE_KEY, { type: "json" }).catch(() => null);
  if (state?.complete) {
    // Finished under the current rules: rescoreStep returns at once unless the rules moved.
    const next = await rescoreStep(state, { lockerStore, rawStore, retiredStore, flags, gt: groundTruth, budgetMs: 0, log });
    if (next.complete) return Response.json({ complete: true, rules_version: next.rules_version });
  }
  let db: any = null;
  try {
    const [{ db: client }, { pdxStatedPositions }, orm, { dbAdapter }] = await Promise.all([
      import("../../db/index.js"), import("../../db/schema.js"), import("drizzle-orm"), import("../lib/stated-positions-core.mjs"),
    ]);
    db = dbAdapter(client, pdxStatedPositions, orm);
  } catch (e: any) {
    log(`locker-rescore: database unavailable — items are re-scored, promotions recompute on a later run (${e?.message || e})`);
  }
  const sync = db ? async (pid: string) => { await syncPolitician(pid, await lockerEntriesFor(lockerStore, pid, flags), { db, log }); } : null;
  const next = await rescoreStep(state, {
    lockerStore, rawStore, retiredStore, flags, gt: groundTruth, budgetMs: RUN_BUDGET_MS, log,
    // Without the database, politicians are queued so their stances recompute later.
    sync: sync ?? (async () => { throw new Error("database unavailable"); }),
  }).catch((e: any) => { log(`locker-rescore: ERROR — ${e?.message || e}`); return state; });
  const line = rescoreSummaryLine(next);
  log(line);
  try { await stateStore.setJSON(RESCORE_STATE_KEY, { ...next, summary: line }); }
  catch (e: any) { log(`locker-rescore: cursor not saved — ${e?.message || e}`); }
  return Response.json({ complete: next.complete, pid_index: next.pid_index, tallies: next.tallies });
};

export const config: Config = {
  schedule: "* * * * *",
};
