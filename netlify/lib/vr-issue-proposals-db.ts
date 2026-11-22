// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — drizzle-backed repository for automatic mapping proposals
// ─────────────────────────────────────────────────────────────────────────────
// The database half of netlify/lib/vr-issue-proposals.ts. Kept separate so the
// proposal/review logic can be executed in tests against an in-memory repo.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { vrMeasureIssues, vrMeasures, vrMemberVotes, vrRollcalls } from "../../db/schema.js";
import { resetMappingVersionMemo, writeMemberPack } from "./vr-pack.js";
import {
  proposeForMeasures,
  rejectProposal,
  reviewProposal,
  type MappingRow,
  type ProposalRepo,
} from "./vr-issue-proposals.js";

export const dbProposalRepo: ProposalRepo = {
  async loadMeasures(ids) {
    if (!ids.length) return [];
    return db
      .select({
        id: vrMeasures.id,
        measureType: vrMeasures.measureType,
        title: vrMeasures.title,
        shortTitle: vrMeasures.shortTitle,
        summary: vrMeasures.summary,
        sourceUrl: vrMeasures.sourceUrl,
      })
      .from(vrMeasures)
      .where(inArray(vrMeasures.id, ids));
  },

  async mappedMeasureIds(ids) {
    if (!ids.length) return new Set();
    const rows = await db
      .selectDistinct({ id: vrMeasureIssues.measureId })
      .from(vrMeasureIssues)
      .where(inArray(vrMeasureIssues.measureId, ids));
    return new Set(rows.map((r) => r.id));
  },

  async insertProposal(row) {
    const res = await db
      .insert(vrMeasureIssues)
      .values(row)
      .onConflictDoNothing({ target: [vrMeasureIssues.measureId, vrMeasureIssues.issueKey, vrMeasureIssues.supportMeaning] })
      .returning({ id: vrMeasureIssues.id });
    return res.length ? res[0].id : null;
  },

  async getMapping(id) {
    const [r] = await db.select().from(vrMeasureIssues).where(eq(vrMeasureIssues.id, id));
    return (r as MappingRow) ?? null;
  },

  async findMapping(measureId, issueKey) {
    const [r] = await db
      .select()
      .from(vrMeasureIssues)
      .where(and(eq(vrMeasureIssues.measureId, measureId), eq(vrMeasureIssues.issueKey, issueKey)));
    return (r as MappingRow) ?? null;
  },

  async updateMapping(id, expectStatus, set) {
    const [r] = await db
      .update(vrMeasureIssues)
      .set(set as any)
      .where(and(eq(vrMeasureIssues.id, id), eq(vrMeasureIssues.reviewStatus, expectStatus)))
      .returning();
    return (r as MappingRow) ?? null;
  },

  async listMappings({ status, limit }) {
    const q = db.select().from(vrMeasureIssues);
    const rows = status
      ? await q.where(eq(vrMeasureIssues.reviewStatus, status)).orderBy(desc(vrMeasureIssues.id)).limit(limit)
      : await q.orderBy(desc(vrMeasureIssues.id)).limit(limit);
    return rows as MappingRow[];
  },

  async votersForMeasures(ids) {
    if (!ids.length) return [];
    const rows = await db
      .selectDistinct({ pid: vrMemberVotes.politicianId })
      .from(vrMemberVotes)
      .innerJoin(vrRollcalls, eq(vrMemberVotes.rollcallId, vrRollcalls.id))
      .where(inArray(vrRollcalls.measureId, ids));
    return rows.map((r) => r.pid);
  },

  async refreshPacks(pids) {
    // Same discipline as the ingest's pack loop: drop the memoised mapping version
    // first so packs are written under the key the next read will ask for.
    resetMappingVersionMemo();
    let written = 0;
    const errors: string[] = [];
    for (const pid of pids) {
      try { await writeMemberPack(pid); written++; }
      catch (e: any) { errors.push(`pack ${pid}: ${e?.message || String(e)}`); }
    }
    return { written, errors };
  },
};

// Proposal rows joined with their measure, for the review queue.
export async function listProposalQueue(status: string | null, limit: number) {
  const rows = await dbProposalRepo.listMappings({ status, limit });
  const ids = [...new Set(rows.map((r) => r.measureId))];
  const measures = ids.length
    ? await db
        .select({
          id: vrMeasures.id, number: vrMeasures.number, congress: vrMeasures.congress,
          chamber: vrMeasures.chamber, title: vrMeasures.title, sourceUrl: vrMeasures.sourceUrl,
        })
        .from(vrMeasures)
        .where(inArray(vrMeasures.id, ids))
    : [];
  const byId = new Map(measures.map((m) => [m.id, m]));
  return rows.map((r) => ({ ...r, measure: byId.get(r.measureId) ?? null }));
}

export const proposeIssuesForMeasures = (ids: number[], opts?: { refreshPacks?: boolean }) =>
  proposeForMeasures(dbProposalRepo, ids, opts);
export const reviewIssueProposal = (id: number, body: any) => reviewProposal(dbProposalRepo, id, body);
export const rejectIssueProposal = (id: number, body: any) => rejectProposal(dbProposalRepo, id, body);
