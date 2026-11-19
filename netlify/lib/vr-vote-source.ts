// ─────────────────────────────────────────────────────────────────────────────
// vr-vote-source — pdx_vote_actions is the source of truth for member votes
// ─────────────────────────────────────────────────────────────────────────────
// Two paths ingest federal roll calls:
//
//   vote-actions (vote-actions-core.ts)  every roll call, every member, keyed by
//       the source's own member id (bioguide / LIS), the unmodified payload kept
//       in Blobs "raw-ingest-votes", re-reads stamped revised_at. → pdx_vote_actions
//   vr ingest (vr-ingest.ts)             the curated voting record: measures,
//       issue mappings, packs, the stance-vs-record verdict.          → vr_*
//
// They used to disagree, because each one decided for itself how a member
// voted: the House side parsed the same payload twice with two normalizers, and
// the Senate side was the curated seed on one path and live senate.gov XML on
// the other. A seeded vote that the Senate's own XML contradicts stayed
// contradicted until someone wrote a repair migration by hand.
//
// THE RULE NOW: pdx_vote_actions decides HOW A MEMBER VOTED. The vr ingest
// still owns everything editorial (which measure, which issue, what a yea
// means), but a member position it writes for a roll call that vote-actions
// holds comes from vote-actions' row for that member, mapped into the vr
// vocabulary (yes→yea, no→nay, present, not_voting). Nothing flows the
// other way: vote-actions never reads vr_*.
//
// This module is the pure half (no database, no Blobs) so it is testable
// offline: vocabulary mapping, overlaying positions onto RawVote[], the Senate
// RawVote built from a stored senate.gov payload, and reconcile planning.
// The database half is vr-vote-source-db.ts.
import type { RawMemberVote, RawVote } from "./vr-normalize.js";
import { canonicalMeasureNumber, crossoverFlags, mapActionType, originatingChamber } from "./vr-normalize.js";
import type { RollRecord } from "./vote-actions-core.js";

// The one place the two vocabularies meet.
export const VR_POSITION_OF: Record<string, string> = { yes: "yea", no: "nay", present: "present", not_voting: "not_voting" };
export const positionOfVote = (vote: string | null | undefined): string | null => VR_POSITION_OF[String(vote || "")] || null;

export const rollIdentity = (chamber: string, congress: number | null | undefined, session: number | null | undefined, roll: number | null | undefined) =>
  `${String(chamber).toLowerCase()}|${Number(congress)}|${Number(session)}|${Number(roll)}`;

// What the vr side needs from one pdx_vote_actions row.
export type VoteActionRow = {
  chamber: string; congress: number; session: number; rollNumber: number;
  politicianId: string | null; bioguideId: string | null; memberId?: string | null;
  memberName?: string | null; party?: string | null; state?: string | null; vote: string;
};

// pdx_vote_actions rows of ONE roll call → the vr RawMemberVote list. A row with
// no bioguide id (a Senate LIS id that never resolved) is not identified, so it
// cannot be attributed on the vr side either; it is counted, never guessed.
export function memberVotesFromActions(rows: VoteActionRow[]): { memberVotes: RawMemberVote[]; unidentified: number } {
  const memberVotes: RawMemberVote[] = [];
  let unidentified = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    const position = positionOfVote(r.vote);
    if (!position) continue; // the table's CHECK keeps this unreachable
    if (!r.bioguideId) { unidentified++; continue; }
    if (seen.has(r.bioguideId)) continue;
    seen.add(r.bioguideId);
    memberVotes.push({
      bioguideId: r.bioguideId,
      ...(r.memberName ? { name: r.memberName } : {}),
      ...(r.state ? { state: r.state } : {}),
      ...(r.party ? { party: r.party } : {}),
      position,
    });
  }
  return { memberVotes, unidentified };
}

export function tallyPositions(memberVotes: RawMemberVote[]): Record<string, number> {
  const t: Record<string, number> = { yea: 0, nay: 0, present: 0, notVoting: 0 };
  for (const m of memberVotes) {
    if (m.position === "yea") t.yea++;
    else if (m.position === "nay") t.nay++;
    else if (m.position === "present") t.present++;
    else if (m.position === "not_voting") t.notVoting++;
  }
  return t;
}

// Replace each RawVote's member positions with vote-actions' rows for the same
// roll call. A roll call vote-actions does not hold yet keeps the positions it
// came with (the raw-store / Congress.gov read, or the curated Senate seed), so
// nothing is dropped while vote-actions catches up. Totals are left as they
// came: they are the chamber's own tally, not derived from the member list.
export type OverlayReport = { overlaid: number; kept: number; changedPositions: number; unidentified: number };
export function overlayMemberVotes(
  votes: RawVote[], rowsByRoll: Map<string, VoteActionRow[]>,
): { votes: RawVote[]; report: OverlayReport } {
  const report: OverlayReport = { overlaid: 0, kept: 0, changedPositions: 0, unidentified: 0 };
  const out = votes.map((v) => {
    const rows = rowsByRoll.get(rollIdentity(v.chamber, v.congress, v.session, v.rollNumber));
    if (!rows || !rows.length) { report.kept++; return v; }
    const { memberVotes, unidentified } = memberVotesFromActions(rows);
    if (!memberVotes.length) { report.kept++; return v; }
    report.overlaid++;
    report.unidentified += unidentified;
    const before = new Map((v.memberVotes || []).filter((m) => m.bioguideId).map((m) => [m.bioguideId!, m.position]));
    for (const m of memberVotes) if (before.has(m.bioguideId!) && before.get(m.bioguideId!) !== m.position) report.changedPositions++;
    return { ...v, memberVotes };
  });
  return { votes: out, report };
}

// A vr RawVote for a Senate roll call, built from vote-actions' parse of the
// senate.gov XML it stored (rollFromEnvelope). Member positions come from
// pdx_vote_actions (overlayMemberVotes), so this carries the roll call and
// its measure only. Null when the roll call has no measure (a quorum call) or
// its vote words are outside the four values (vote-actions parks those too).
export function rawVoteFromSenateRecord(rec: RollRecord): RawVote | null {
  if (!rec || rec.chamber !== "senate" || !rec.measure || rec.unsupported.length) return null;
  const m = rec.measure;
  const number = canonicalMeasureNumber(m.number || `${m.billType}${m.num}`);
  const question = rec.question ? String(rec.question).trim() || null : null;
  return {
    chamber: "senate",
    congress: rec.congress,
    session: rec.session,
    rollNumber: rec.roll,
    voteDate: rec.voteDate,
    question,
    actionType: mapActionType(question || ""),
    result: rec.result,
    requiredMajority: "simple",
    totals: {},
    sourceUrl: rec.sourceUrl,
    sourceLabel: "U.S. Senate",
    measure: {
      measureType: m.measureType,
      number,
      title: m.feedTitle || number || `Roll call ${rec.roll}`,
      congress: rec.congress,
      chamber: originatingChamber(m.billType, "senate"),
      sourceUrl: `https://www.congress.gov/roll-call-vote/${rec.congress}/senate/${rec.roll}`,
      sourceLabel: "Congress.gov",
      externalIds: { voteActionsBillKey: m.billKey },
    },
    memberVotes: [],
  };
}

// ── Reconcile: rows the vr side already stored ───────────────────────────────
// The overlay keeps NEW writes in step. Rows written before it existed (seeds,
// earlier pulls) are compared here: for each roll call both tables hold, every
// vr_member_votes cell whose position differs from vote-actions' row for the
// same member is planned for an update, with the party-crossover flag
// recomputed over vote-actions' full member list for that roll call.
//
// A cell with an APPROVED correction overlay (vr_vote_correction_overlays) is
// left alone and reported: a moderator reviewed that exact stored value, and
// moving it underneath them would silently stale their review.
export type StoredMemberVote = { rollcallId: number; politicianId: string; position: string; isParty: string | null };
export type ReconcileChange = { rollcallId: number; politicianId: string; from: string; to: string; isParty: string | null };
export type ReconcilePlan = { changes: ReconcileChange[]; protectedByCorrection: Array<{ rollcallId: number; politicianId: string; from: string; to: string }>; compared: number };

export function planReconcile(input: {
  rollcallId: number;
  stored: StoredMemberVote[];
  actions: VoteActionRow[];
  memberMap: Record<string, string>; // bioguide → canonical politician id
  corrected?: Set<string>;           // "<rollcallId>|<politicianId>" with an approved position correction
}): ReconcilePlan {
  const plan: ReconcilePlan = { changes: [], protectedByCorrection: [], compared: 0 };
  const { memberVotes } = memberVotesFromActions(input.actions);
  const flags = crossoverFlags(memberVotes);
  const truth = new Map<string, { position: string; isParty: string | null }>();
  for (const mv of memberVotes) {
    const pid = mv.bioguideId ? input.memberMap[mv.bioguideId] : null;
    if (pid && !truth.has(pid)) truth.set(pid, { position: mv.position, isParty: flags.get(mv) ?? null });
  }
  for (const s of input.stored) {
    const t = truth.get(s.politicianId);
    if (!t) continue; // vote-actions has no identified row for this member — nothing to compare
    plan.compared++;
    if (t.position === s.position) continue;
    if (input.corrected?.has(`${input.rollcallId}|${s.politicianId}`)) {
      plan.protectedByCorrection.push({ rollcallId: input.rollcallId, politicianId: s.politicianId, from: s.position, to: t.position });
      continue;
    }
    plan.changes.push({ rollcallId: input.rollcallId, politicianId: s.politicianId, from: s.position, to: t.position, isParty: t.isParty });
  }
  return plan;
}
