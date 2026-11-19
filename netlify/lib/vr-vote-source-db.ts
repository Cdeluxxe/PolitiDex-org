// ─────────────────────────────────────────────────────────────────────────────
// vr-vote-source-db — the database half of vr-vote-source.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reads pdx_vote_actions (vote-actions' table, the source of truth for how a
// member voted) for the vr ingest, and reconciles vr_member_votes rows that
// were written before the two paths were joined. Read-only on pdx_vote_actions
// and on Blobs "raw-ingest-votes": vote-actions stays their only writer.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxVoteActions, vrMemberVotes, vrVoteCorrectionOverlays } from "../../db/schema.js";
import type { RawVote } from "./vr-normalize.js";
import { rollFromEnvelope, type RawStore, type RollEnvelope } from "./vote-actions-core.js";
import {
  overlayMemberVotes, planReconcile, rawVoteFromSenateRecord, rollIdentity,
  type OverlayReport, type ReconcileChange, type VoteActionRow,
} from "./vr-vote-source.js";

const rowsOf = (res: any): any[] => (Array.isArray(res) ? res : res?.rows ?? []);

const ACTION_COLUMNS = {
  chamber: pdxVoteActions.chamber, congress: pdxVoteActions.congress, session: pdxVoteActions.session,
  rollNumber: pdxVoteActions.rollNumber, politicianId: pdxVoteActions.politicianId, bioguideId: pdxVoteActions.bioguideId,
  memberId: pdxVoteActions.memberId, memberName: pdxVoteActions.memberName, party: pdxVoteActions.party,
  state: pdxVoteActions.state, vote: pdxVoteActions.vote,
};

// vote-actions' rows for the given roll calls, grouped by roll identity.
export async function loadVoteActionRows(
  rolls: Array<{ chamber: string; congress: number; session: number; rollNumber: number }>,
): Promise<Map<string, VoteActionRow[]>> {
  const out = new Map<string, VoteActionRow[]>();
  const groups = new Map<string, { chamber: string; congress: number; rolls: Set<number>; wanted: Set<string> }>();
  for (const r of rolls) {
    if (!Number.isFinite(Number(r.congress)) || !Number.isFinite(Number(r.rollNumber))) continue;
    const k = `${r.chamber}|${r.congress}`;
    const g = groups.get(k) || { chamber: r.chamber, congress: Number(r.congress), rolls: new Set<number>(), wanted: new Set<string>() };
    g.rolls.add(Number(r.rollNumber));
    g.wanted.add(rollIdentity(r.chamber, r.congress, r.session, r.rollNumber));
    groups.set(k, g);
  }
  for (const g of groups.values()) {
    const nums = [...g.rolls];
    for (let i = 0; i < nums.length; i += 200) {
      const rows = await db.select(ACTION_COLUMNS).from(pdxVoteActions).where(and(
        eq(pdxVoteActions.jurisdiction, "us"), eq(pdxVoteActions.chamber, g.chamber),
        eq(pdxVoteActions.congress, g.congress), inArray(pdxVoteActions.rollNumber, nums.slice(i, i + 200)),
      ));
      for (const r of rows as VoteActionRow[]) {
        const id = rollIdentity(r.chamber, r.congress, r.session, r.rollNumber);
        if (!g.wanted.has(id)) continue; // same roll number, other session
        (out.get(id) || out.set(id, []).get(id)!).push(r);
      }
    }
  }
  return out;
}

// RawVote[] with every member position vote-actions holds taken from it.
// A database error leaves the votes as they came (logged), never drops one.
export async function overlayFromVoteActions(votes: RawVote[], log: (l: string) => void = console.log): Promise<{ votes: RawVote[]; report: OverlayReport | null }> {
  if (!votes.length) return { votes, report: null };
  try {
    const rows = await loadVoteActionRows(votes);
    const res = overlayMemberVotes(votes, rows);
    log(`vr-ingest: member positions — ${res.report.overlaid} roll call(s) from pdx_vote_actions, ${res.report.kept} not held there yet (kept as read), ${res.report.changedPositions} position(s) differed from the direct read`);
    return res;
  } catch (e: any) {
    log(`vr-ingest: pdx_vote_actions unreadable — member positions kept as read (${e?.message || e})`);
    return { votes, report: null };
  }
}

// Senate roll calls from vote-actions' stored senate.gov XML (Blobs
// "raw-ingest-votes", senate/<congress>/<session>/roll-NNNNN/<fetchedAt>.json),
// newest roll first, the newest payload of each. Measure + roll call only; the
// caller overlays positions from pdx_vote_actions.
export async function senateRollcallsFromVoteActions(opts: { store: RawStore | null; congress: number; limit?: number }): Promise<RawVote[]> {
  const store = opts.store;
  if (!store || !store.list) return [];
  const { blobs = [] } = (await store.list({ prefix: `senate/${opts.congress}/` })) || ({} as any);
  const newest = new Map<string, string>();
  for (const { key } of blobs) {
    const dir = key.slice(0, key.lastIndexOf("/") + 1);
    if (!newest.has(dir) || key > newest.get(dir)!) newest.set(dir, key);
  }
  const limit = Math.min(Math.max(opts.limit || 20, 1), 250);
  // Directory names sort by session then zero-padded roll, so reverse = newest first.
  const keys = [...newest.values()].sort().reverse().slice(0, limit);
  const out: RawVote[] = [];
  for (const key of keys) {
    try {
      const env = (await store.get(key, { type: "json" })) as RollEnvelope | null;
      if (!env || !(env.http_status >= 200 && env.http_status < 300)) continue;
      const rec = rollFromEnvelope(env);
      const v = rec && rec.members.length ? rawVoteFromSenateRecord(rec) : null;
      if (v) out.push(v);
    } catch (e: any) {
      console.warn(`vr-ingest: stored Senate payload ${key} unreadable — skipped (${e?.message || e})`);
    }
  }
  return out;
}

// ── Reconcile stored vr_member_votes against pdx_vote_actions ────────────────
export type ReconcileReport = {
  rollcalls: number; compared: number; updated: number; protectedByCorrection: number;
  affectedMembers: string[]; changes: ReconcileChange[]; skipped?: string; errors: string[];
};

export async function reconcileMemberVotes(opts: {
  memberMap: Record<string, string>; limit?: number; write?: boolean; log?: (l: string) => void;
}): Promise<ReconcileReport> {
  const log = opts.log || ((l: string) => console.log(l));
  const report: ReconcileReport = { rollcalls: 0, compared: 0, updated: 0, protectedByCorrection: 0, affectedMembers: [], changes: [], errors: [] };
  const limit = Math.min(Math.max(opts.limit || 200, 1), 2000);

  // Roll calls where at least one shared member disagrees. The join on
  // politician_id only FINDS candidates; planReconcile re-derives who is who
  // from the bioguide id through the current member map.
  const found = rowsOf(await db.execute(sql`
    SELECT DISTINCT r.id AS id, r.chamber, r.congress, r.session, r.roll_number
    FROM vr_member_votes mv
    JOIN vr_rollcalls r ON r.id = mv.rollcall_id
    JOIN pdx_vote_actions a
      ON a.jurisdiction = 'us' AND a.chamber = r.chamber AND a.congress = r.congress
     AND a.session = r.session AND a.roll_number = r.roll_number AND a.politician_id = mv.politician_id
    WHERE r.congress IS NOT NULL
      AND mv.position <> CASE a.vote WHEN 'yes' THEN 'yea' WHEN 'no' THEN 'nay' ELSE a.vote END
    ORDER BY r.id
    LIMIT ${limit}
  `));
  if (!found.length) { log("vr-reconcile: vr_member_votes agrees with pdx_vote_actions on every shared roll call"); return report; }

  // Approved position corrections on those roll calls. If the overlay table
  // cannot be read, nothing is changed: a reviewed cell must never move unseen.
  const rcIds = found.map((r: any) => Number(r.id));
  let corrected: Set<string>;
  try {
    const rows = await db.select({ rollcallId: vrVoteCorrectionOverlays.rollcallId, politicianId: vrVoteCorrectionOverlays.politicianId })
      .from(vrVoteCorrectionOverlays)
      .where(and(inArray(vrVoteCorrectionOverlays.rollcallId, rcIds), eq(vrVoteCorrectionOverlays.status, "approved"), eq(vrVoteCorrectionOverlays.field, "position")));
    corrected = new Set(rows.map((r) => `${r.rollcallId}|${r.politicianId}`));
  } catch (e: any) {
    report.skipped = `correction overlays unreadable (${e?.message || e}) — no cell changed`;
    log(`vr-reconcile: ${report.skipped}`);
    return report;
  }

  const actions = await loadVoteActionRows(found.map((r: any) => ({ chamber: r.chamber, congress: Number(r.congress), session: Number(r.session), rollNumber: Number(r.roll_number) })));
  const affected = new Set<string>();
  for (const r of found) {
    report.rollcalls++;
    try {
      const rollcallId = Number(r.id);
      const stored = await db.select({ rollcallId: vrMemberVotes.rollcallId, politicianId: vrMemberVotes.politicianId, position: vrMemberVotes.position, isParty: vrMemberVotes.isParty })
        .from(vrMemberVotes).where(eq(vrMemberVotes.rollcallId, rollcallId));
      const plan = planReconcile({
        rollcallId, stored, memberMap: opts.memberMap, corrected,
        actions: actions.get(rollIdentity(r.chamber, r.congress, r.session, r.roll_number)) || [],
      });
      report.compared += plan.compared;
      report.protectedByCorrection += plan.protectedByCorrection.length;
      for (const p of plan.protectedByCorrection) log(`vr-reconcile: ${r.chamber} ${r.congress}-${r.session} roll ${r.roll_number} ${p.politicianId}: ${p.from} ≠ source ${p.to}, left alone (approved correction on the cell)`);
      for (const c of plan.changes) {
        report.changes.push(c);
        if (opts.write === false) continue;
        await db.update(vrMemberVotes).set({ position: c.to, isParty: c.isParty })
          .where(and(eq(vrMemberVotes.rollcallId, c.rollcallId), eq(vrMemberVotes.politicianId, c.politicianId)));
        report.updated++;
        affected.add(c.politicianId);
        log(`vr-reconcile: ${r.chamber} ${r.congress}-${r.session} roll ${r.roll_number} ${c.politicianId}: ${c.from} → ${c.to} (pdx_vote_actions)`);
      }
    } catch (e: any) {
      report.errors.push(`rollcall ${r.id}: ${String(e?.message || e).slice(0, 160)}`);
    }
  }
  report.affectedMembers = [...affected];
  log(`vr-reconcile: ${report.rollcalls} roll call(s), ${report.compared} shared member(s) compared, ${opts.write === false ? `${report.changes.length} would change (dry run)` : `${report.updated} updated`}, ${report.protectedByCorrection} protected by a correction, ${report.errors.length} error(s)`);
  return report;
}
