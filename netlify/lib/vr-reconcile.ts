// ─────────────────────────────────────────────────────────────────────────────
// vr-reconcile — vr_member_votes ← pdx_vote_actions, then the affected packs
// ─────────────────────────────────────────────────────────────────────────────
// The one entry point both callers use: the daily vr-ingest cron and the
// authenticated POST /api/vr-ingest/reconcile. The comparison itself is
// reconcileMemberVotes (vr-vote-source-db.ts); this adds the member map and
// refreshes the offline packs of every member whose cell moved (positions do
// not move the mapping version, so a pack would otherwise keep the old cell).
import { loadMemberMap } from "./vr-ingest.js";
import { reconcileMemberVotes, type ReconcileReport } from "./vr-vote-source-db.js";
import { writeMemberPack } from "./vr-pack.js";

export async function reconcileAndRefresh(opts: { limit?: number; write?: boolean } = {}): Promise<ReconcileReport & { packsWritten: number }> {
  const report = await reconcileMemberVotes({ memberMap: await loadMemberMap(), limit: opts.limit, write: opts.write });
  let packsWritten = 0;
  for (const pid of report.affectedMembers) {
    try { await writeMemberPack(pid); packsWritten++; }
    catch (e: any) { report.errors.push(`pack ${pid}: ${e?.message || e}`); }
  }
  return { ...report, packsWritten };
}
