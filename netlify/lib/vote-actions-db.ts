// Drizzle-backed repository for the action layer (vote-actions-core.ts).
// Writes ONLY pdx_action_bills and pdx_vote_actions; no other table is read or written.
import { and, eq, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxActionBills, pdxVoteActions } from "../../db/schema.js";
import type { BillRow, VoteActionsRepo, VoteRow } from "./vote-actions-core.js";
import { META_MAX_ATTEMPTS } from "./vote-actions-core.js";

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

  async unmappedBioguides() {
    const rows = await db.selectDistinct({ b: pdxVoteActions.bioguideId }).from(pdxVoteActions)
      .where(and(isNull(pdxVoteActions.politicianId), isNotNull(pdxVoteActions.bioguideId)));
    return rows.map((r) => r.b as string);
  },

  async mapMembers(pairs) {
    let n = 0;
    for (const [bioguide, pid] of pairs) {
      const res: any = await db.update(pdxVoteActions)
        .set({ politicianId: pid, updatedAt: new Date() })
        .where(and(eq(pdxVoteActions.bioguideId, bioguide), isNull(pdxVoteActions.politicianId)))
        .returning({ id: pdxVoteActions.id });
      n += res.length;
    }
    return n;
  },

  // Page inputs for every stored bill of one Congress — the columns the page
  // reads only (no summary text), so a full Congress is a light read.
  async billsForPages(congress) {
    const rows = await db.select({
      billKey: pdxActionBills.billKey, congress: pdxActionBills.congress, measureType: pdxActionBills.measureType,
      billType: pdxActionBills.billType, number: pdxActionBills.number, title: pdxActionBills.title,
      topicTags: pdxActionBills.topicTags, tagDetail: pdxActionBills.tagDetail, taggerVersion: pdxActionBills.taggerVersion,
      hasSummary: pdxActionBills.hasSummary, sourceUrl: pdxActionBills.sourceUrl, rawRef: pdxActionBills.rawRef,
    }).from(pdxActionBills).where(eq(pdxActionBills.congress, congress)).orderBy(pdxActionBills.billKey);
    return rows.map((r: any) => ({
      ...r, congress: Number(r.congress), topicTags: r.topicTags || [], tagDetail: Array.isArray(r.tagDetail) ? r.tagDetail : [],
      hasSummary: !!r.hasSummary, rawRef: r.rawRef ?? null,
    }));
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
           count(*) FILTER (WHERE NOT has_summary AND measure_type IN ('bill','resolution'))::int AS awaiting_summary,
           count(*) FILTER (WHERE measure_type <> 'nomination')::int AS taggable,
           count(*) FILTER (WHERE measure_type <> 'nomination' AND cardinality(topic_tags) = 0)::int AS taggable_untagged,
           count(*) FILTER (WHERE measure_type IN ('bill','resolution'))::int AS summarisable,
           count(*) FILTER (WHERE NOT has_summary AND measure_type IN ('bill','resolution') AND meta_attempts >= ${META_MAX_ATTEMPTS})::int AS summary_gave_up
      FROM pdx_action_bills`));
  const [votes]: any = rowsOf(await db.execute(sql`
    SELECT count(*)::int AS votes,
           count(*) FILTER (WHERE politician_id IS NOT NULL)::int AS on_roster,
           count(DISTINCT politician_id)::int AS politicians,
           count(DISTINCT (chamber, congress, session, roll_number))::int AS roll_calls,
           count(*) FILTER (WHERE revised_at IS NOT NULL)::int AS revised,
           max(vote_date) AS newest_vote,
           count(*) FILTER (WHERE member_id_scheme = 'bioguide')::int AS bioguide_rows,
           count(*) FILTER (WHERE member_id_scheme = 'bioguide' AND politician_id IS NULL)::int AS bioguide_unmapped,
           count(*) FILTER (WHERE member_id_scheme = 'lis')::int AS lis_rows,
           count(*) FILTER (WHERE member_id_scheme = 'lis' AND politician_id IS NULL)::int AS lis_unmapped,
           count(*) FILTER (WHERE member_id_scheme = 'lis' AND bioguide_id IS NULL)::int AS lis_unresolved,
           count(*) FILTER (WHERE is_procedural IS TRUE)::int AS procedural,
           count(*) FILTER (WHERE is_procedural IS FALSE)::int AS substantive,
           count(*) FILTER (WHERE is_procedural IS NULL)::int AS procedural_unknown
      FROM pdx_vote_actions`));
  const tags: any = rowsOf(await db.execute(sql`
    SELECT t AS issue_key, count(*)::int AS bills
      FROM pdx_action_bills, unnest(topic_tags) AS t
     GROUP BY t ORDER BY 2 DESC LIMIT 40`));
  // Curator to-do: members with vote rows but no politician, most rows first.
  // "lis id not resolved" = a senator whose LIS id the congress-legislators index
  // did not map (an identity gap); "bioguide not on roster" = the member-map has
  // no roster slug for that bioguide id (a roster gap, often expected).
  const unmappedMembers: any = rowsOf(await db.execute(sql`
    SELECT member_id_scheme AS scheme, member_id, bioguide_id,
           max(member_name) AS name, max(party) AS party, max(state) AS state, max(chamber) AS chamber,
           CASE WHEN bioguide_id IS NULL THEN 'lis id not resolved' ELSE 'bioguide not on roster' END AS reason,
           count(*)::int AS rows, max(vote_date) AS last_vote
      FROM pdx_vote_actions
     WHERE politician_id IS NULL
     GROUP BY member_id_scheme, member_id, bioguide_id
     ORDER BY (bioguide_id IS NULL) DESC, count(*) DESC, member_id
     LIMIT 25`));
  return { bills, votes, tags, unmappedMembers, publishStats: await billPublishStats() };
}

// Curator-only cross-links (GET /api/admin/vote-actions/cross-links): one
// politician's raw vote rows, for the drawer to match against the curated
// measures it already shows by the shared bill key. Read-only; pdx_vote_actions only.
export async function voteActionsForPolitician(politicianId: string, limit = 2000) {
  return db.select({
    billKey: pdxVoteActions.billKey, chamber: pdxVoteActions.chamber, congress: pdxVoteActions.congress,
    session: pdxVoteActions.session, rollNumber: pdxVoteActions.rollNumber, voteDate: pdxVoteActions.voteDate,
    vote: pdxVoteActions.vote, voteRaw: pdxVoteActions.voteRaw, voteKind: pdxVoteActions.voteKind,
    isProcedural: pdxVoteActions.isProcedural, question: pdxVoteActions.question, sourceUrl: pdxVoteActions.sourceUrl, sourceLabel: pdxVoteActions.sourceLabel,
    rawRef: pdxVoteActions.rawRef,
  }).from(pdxVoteActions)
    .where(eq(pdxVoteActions.politicianId, politicianId))
    .orderBy(pdxVoteActions.voteDate, pdxVoteActions.rollNumber)
    .limit(limit);
}

// Publish-gate inputs per bill (netlify/lib/vote-actions-publish.ts evaluates
// them): the bill's kind and tag count, and over ALL its vote rows the counts of
// unmapped members, unclassified kinds and missing raw payloads. Read-only,
// recomputed on every call — no stored flag. `billKeys` omitted = every bill.
export async function billPublishStats(billKeys?: string[]) {
  if (billKeys && !billKeys.length) return [];
  const rowsOf = (res: any) => (Array.isArray(res) ? res : res?.rows ?? []);
  const where = billKeys ? sql`WHERE b.bill_key IN (${sql.join(billKeys.map((k) => sql`${k}`), sql`, `)})` : sql``;
  const res: any[] = rowsOf(await db.execute(sql`
    SELECT b.bill_key, b.measure_type, cardinality(b.topic_tags)::int AS tag_count,
           count(v.id)::int AS rows,
           count(v.id) FILTER (WHERE v.politician_id IS NULL)::int AS unmapped_rows,
           count(v.id) FILTER (WHERE v.vote_kind = 'unknown' OR v.is_procedural IS NULL)::int AS unknown_kind_rows,
           count(v.id) FILTER (WHERE v.raw_ref IS NULL)::int AS missing_raw_rows,
           count(v.id) FILTER (WHERE v.is_procedural IS TRUE)::int AS procedural_rows,
           count(DISTINCT (v.chamber, v.congress, v.session, v.roll_number)) FILTER (WHERE v.id IS NOT NULL)::int AS rolls
      FROM pdx_action_bills b
      LEFT JOIN pdx_vote_actions v ON v.bill_key = b.bill_key
      ${where}
     GROUP BY b.bill_key, b.measure_type, b.topic_tags`));
  return res.map((r) => ({
    billKey: r.bill_key, measureType: r.measure_type, tagCount: Number(r.tag_count) || 0, rows: Number(r.rows) || 0,
    unmappedRows: Number(r.unmapped_rows) || 0, unknownKindRows: Number(r.unknown_kind_rows) || 0,
    missingRawRows: Number(r.missing_raw_rows) || 0, proceduralRows: Number(r.procedural_rows) || 0, rolls: Number(r.rolls) || 0,
  }));
}

// The gate's data deps, wired to the tables.
export const publishDeps = {
  rowsForPolitician: (pid: string) => voteActionsForPolitician(pid),
  statsForBills: (keys: string[]) => billPublishStats(keys),
};
