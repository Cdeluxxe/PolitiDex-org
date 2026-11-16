// Drizzle-backed repository for the action layer (vote-actions-core.ts).
// Writes ONLY pdx_action_bills and pdx_vote_actions; no other table is read or written.
import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxActionBills, pdxVoteActions } from "../../db/schema.js";
import type { BillRow, VoteActionsRepo, VoteRow } from "./vote-actions-core.js";

const toBill = (r: any): BillRow => ({
  billKey: r.billKey, congress: r.congress, measureType: r.measureType, billType: r.billType, number: r.number,
  parentBillKey: r.parentBillKey, title: r.title, shortTitle: r.shortTitle, summary: r.summary || "",
  policyArea: r.policyArea, officialSubjects: r.officialSubjects || [], topicTags: r.topicTags || [],
  tagDetail: r.tagDetail || [], multiTopic: !!r.multiTopic, taggerVersion: r.taggerVersion, metaSource: r.metaSource,
  hasSummary: !!r.hasSummary, metaAttempts: r.metaAttempts || 0,
  metaFetchedAt: r.metaFetchedAt ? new Date(r.metaFetchedAt).toISOString() : null, sourceUrl: r.sourceUrl,
  rawRef: r.rawRef ?? null,
});

const CHUNK = 200;

export const voteActionsRepo: VoteActionsRepo = {
  async getBill(billKey) {
    const rows = await db.select().from(pdxActionBills).where(eq(pdxActionBills.billKey, billKey)).limit(1);
    return rows.length ? toBill(rows[0]) : null;
  },

  async upsertBill(b) {
    const values = {
      ...b,
      metaFetchedAt: b.metaFetchedAt ? new Date(b.metaFetchedAt) : null,
      updatedAt: new Date(),
    };
    const { billKey: _k, ...set } = values;
    await db.insert(pdxActionBills).values(values).onConflictDoUpdate({ target: pdxActionBills.billKey, set });
  },

  async upsertVotes(rows: VoteRow[]) {
    if (!rows.length) return { inserted: 0, revised: 0 };
    // All rows of one call belong to one roll call: read what is stored for it
    // first, so "new" and "vote changed on re-read" are counted exactly.
    const r0 = rows[0];
    const stored = await db
      .select({ scheme: pdxVoteActions.memberIdScheme, id: pdxVoteActions.memberId, vote: pdxVoteActions.vote })
      .from(pdxVoteActions)
      .where(and(
        eq(pdxVoteActions.jurisdiction, r0.jurisdiction), eq(pdxVoteActions.chamber, r0.chamber),
        eq(pdxVoteActions.congress, r0.congress), eq(pdxVoteActions.session, r0.session),
        eq(pdxVoteActions.rollNumber, r0.rollNumber),
      ));
    const before = new Map(stored.map((s) => [`${s.scheme}|${s.id}`, s.vote]));
    let inserted = 0, revised = 0;
    for (const r of rows) {
      const prev = before.get(`${r.memberIdScheme}|${r.memberId}`);
      if (prev === undefined) inserted++;
      else if (prev !== r.vote) revised++;
    }
    const ex = (col: string) => sql.raw(`excluded.${col}`);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK).map((r) => ({ ...r, voteDate: new Date(r.voteDate) }));
      await db.insert(pdxVoteActions).values(chunk).onConflictDoUpdate({
        target: [pdxVoteActions.jurisdiction, pdxVoteActions.chamber, pdxVoteActions.congress, pdxVoteActions.session,
          pdxVoteActions.rollNumber, pdxVoteActions.memberIdScheme, pdxVoteActions.memberId],
        set: {
          revisedAt: sql`CASE WHEN ${pdxVoteActions.vote} <> ${ex("vote")} THEN now() ELSE ${pdxVoteActions.revisedAt} END`,
          vote: sql`${ex("vote")}`,
          voteRaw: sql`${ex("vote_raw")}`,
          politicianId: sql`COALESCE(${ex("politician_id")}, ${pdxVoteActions.politicianId})`,
          bioguideId: sql`COALESCE(${ex("bioguide_id")}, ${pdxVoteActions.bioguideId})`,
          question: sql`COALESCE(${ex("question")}, ${pdxVoteActions.question})`,
          voteKind: sql`${ex("vote_kind")}`,
          isProcedural: sql`${ex("is_procedural")}`,
          result: sql`COALESCE(${ex("result")}, ${pdxVoteActions.result})`,
          topicTags: sql`${ex("topic_tags")}`,
          taggerVersion: sql`${ex("tagger_version")}`,
          rawRef: sql`COALESCE(${ex("raw_ref")}, ${pdxVoteActions.rawRef})`,
          updatedAt: sql`now()`,
        },
      });
    }
    return { inserted, revised };
  },

  async retagVotes(billKey, tags, version) {
    const res: any = await db.update(pdxVoteActions)
      .set({ topicTags: tags, taggerVersion: version, updatedAt: new Date() })
      .where(eq(pdxVoteActions.billKey, billKey))
      .returning({ id: pdxVoteActions.id });
    return res.length;
  },

  async billsNeedingMeta({ olderThan, maxAttempts, limit }) {
    const rows = await db.select().from(pdxActionBills).where(and(
      eq(pdxActionBills.hasSummary, false),
      inArray(pdxActionBills.measureType, ["bill", "resolution"]),
      lt(pdxActionBills.metaAttempts, maxAttempts),
      lt(pdxActionBills.metaFetchedAt, new Date(olderThan)),
    )).orderBy(pdxActionBills.metaFetchedAt).limit(limit);
    return rows.map(toBill);
  },

  async billsWithStaleTags(version, limit) {
    const rows = await db.select().from(pdxActionBills).where(ne(pdxActionBills.taggerVersion, version)).limit(limit);
    return rows.map(toBill);
  },
};

// Read-only counts for the curator status endpoint.
export async function voteActionsStatus() {
  const rowsOf = (res: any) => (Array.isArray(res) ? res : res?.rows ?? []);
  const [bills]: any = rowsOf(await db.execute(sql`
    SELECT count(*)::int AS bills,
           count(*) FILTER (WHERE cardinality(topic_tags) > 0)::int AS tagged,
           count(*) FILTER (WHERE multi_topic)::int AS multi_topic,
           count(*) FILTER (WHERE NOT has_summary AND measure_type IN ('bill','resolution'))::int AS awaiting_summary
      FROM pdx_action_bills`));
  const [votes]: any = rowsOf(await db.execute(sql`
    SELECT count(*)::int AS votes,
           count(*) FILTER (WHERE politician_id IS NOT NULL)::int AS on_roster,
           count(DISTINCT politician_id)::int AS politicians,
           count(DISTINCT (chamber, congress, session, roll_number))::int AS roll_calls,
           count(*) FILTER (WHERE revised_at IS NOT NULL)::int AS revised,
           max(vote_date) AS newest_vote
      FROM pdx_vote_actions`));
  const tags: any = rowsOf(await db.execute(sql`
    SELECT t AS issue_key, count(*)::int AS bills
      FROM pdx_action_bills, unnest(topic_tags) AS t
     GROUP BY t ORDER BY 2 DESC LIMIT 40`));
  return { bills, votes, tags };
}
