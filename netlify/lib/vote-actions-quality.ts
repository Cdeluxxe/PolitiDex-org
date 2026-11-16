// ─────────────────────────────────────────────────────────────────────────────
// Action layer — data-quality rates (read-only)
// ─────────────────────────────────────────────────────────────────────────────
// Turns counts that already exist into rates a curator can scan:
//   • from the tables (vote-actions-db.ts voteActionsStatus): rows with no
//     politician (split by id scheme), bills with no topic tags, procedural share,
//     late-summary backlog
//   • from the run ledger (Blobs "vote-actions-state"): roll calls not done,
//     grouped by status and reason, and the retry backlog
//   • from one run's report: the same rates for that run, for the summary line
// Nothing here is stored or written; every rate is recomputed on each read.
// Pure: no database, no Blobs, no network.

export type Rate = { n: number; of: number; pct: number | null; text: string };
export function rate(n: unknown, of: unknown): Rate {
  const a = Math.max(0, Number(n) || 0), b = Math.max(0, Number(of) || 0);
  const pct = b ? Math.round((a / b) * 1000) / 10 : null;
  return { n: a, of: b, pct, text: pct === null ? `${a} / ${b} (n/a)` : `${a} / ${b} (${pct.toFixed(1)}%)` };
}

// Counts as voteActionsStatus returns them (all optional: a missing count is 0).
export type BillCounts = {
  bills?: number; tagged?: number; multi_topic?: number; awaiting_summary?: number;
  taggable?: number; taggable_untagged?: number; summarisable?: number; summary_gave_up?: number;
};
export type VoteCounts = {
  votes?: number; on_roster?: number;
  bioguide_rows?: number; bioguide_unmapped?: number;
  lis_rows?: number; lis_unmapped?: number; lis_unresolved?: number;
  procedural?: number; substantive?: number; procedural_unknown?: number;
};
export type LedgerLike = Record<string, { status: string; attempts?: number; date?: string; at?: string; note?: string }>;

// "processing error: Cannot read … (reading 'replace')" → "processing error";
// a vote-word list ("Jeffries, Jordan") → "unsupported vote words"; a no_measure
// note is the vote question, which varies per roll call, so it groups as one.
export function reasonOf(status: string, note?: string): string {
  const n = String(note || "").trim();
  if (status === "unsupported") return "unsupported vote words";
  if (status === "no_measure") return "no measure (e.g. quorum, Journal, Speaker)";
  if (/^processing error/i.test(n)) return "processing error";
  return n || "no reason recorded";
}

export type LedgerQuality = {
  total: number; done: number;
  byStatus: Record<string, number>;
  notDoneByReason: Array<{ status: string; reason: string; rolls: number }>;
  retryBacklog: { rolls: number; maxAttempts: number; oldestVoteDate: string | null };
  doneRate: Rate;
};
export function ledgerQuality(ledger: LedgerLike | null | undefined): LedgerQuality {
  const entries = Object.values(ledger || {});
  const byStatus: Record<string, number> = {};
  const groups = new Map<string, { status: string; reason: string; rolls: number }>();
  let retry = 0, maxAttempts = 0, oldest: string | null = null;
  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    if (e.status === "done") continue;
    const reason = reasonOf(e.status, e.note);
    const k = `${e.status}|${reason}`;
    if (!groups.has(k)) groups.set(k, { status: e.status, reason, rolls: 0 });
    groups.get(k)!.rolls++;
    if (e.status === "incomplete") {
      retry++;
      maxAttempts = Math.max(maxAttempts, Number(e.attempts) || 0);
      if (e.date && (!oldest || e.date < oldest)) oldest = e.date;
    }
  }
  const done = byStatus.done || 0;
  return {
    total: entries.length, done, byStatus,
    notDoneByReason: [...groups.values()].sort((a, b) => b.rolls - a.rolls || a.status.localeCompare(b.status) || a.reason.localeCompare(b.reason)),
    retryBacklog: { rolls: retry, maxAttempts, oldestVoteDate: oldest },
    doneRate: rate(done, entries.length),
  };
}

export type TableQuality = {
  votesNoPolitician: Rate;
  votesNoPoliticianBioguide: Rate;   // House + resolved Senate ids whose bioguide is not on the roster
  votesNoPoliticianLis: Rate;        // Senate rows (LIS ids) with no politician
  lisIdsUnresolved: Rate;            // of Senate rows: the LIS id never resolved to a bioguide id
  billsNoTags: Rate;                 // every bill row
  taggableBillsNoTags: Rate;         // excluding nominations, which are untagged by design
  proceduralVotes: Rate;             // of rows whose kind is known (procedural vs substantive)
  unknownKindVotes: Rate;            // of all rows: kind could not be classified
  awaitingSummary: Rate;             // of bills + resolutions: no CRS summary yet (re-read later)
  summaryGaveUp: Rate;               // of bills + resolutions: no summary after the last allowed re-read
};
export function tableQuality(bills: BillCounts = {}, votes: VoteCounts = {}): TableQuality {
  const v = (k: keyof VoteCounts) => Number(votes[k]) || 0;
  const b = (k: keyof BillCounts) => Number(bills[k]) || 0;
  const total = v("votes");
  const summarisable = b("summarisable");
  return {
    votesNoPolitician: rate(total - v("on_roster"), total),
    votesNoPoliticianBioguide: rate(v("bioguide_unmapped"), v("bioguide_rows")),
    votesNoPoliticianLis: rate(v("lis_unmapped"), v("lis_rows")),
    lisIdsUnresolved: rate(v("lis_unresolved"), v("lis_rows")),
    billsNoTags: rate(b("bills") - b("tagged"), b("bills")),
    taggableBillsNoTags: rate(b("taggable_untagged"), b("taggable")),
    proceduralVotes: rate(v("procedural"), v("procedural") + v("substantive")),
    unknownKindVotes: rate(v("procedural_unknown"), total),
    awaitingSummary: rate(b("awaiting_summary"), summarisable),
    summaryGaveUp: rate(b("summary_gave_up"), summarisable),
  };
}

// Per-run rates for the summary line, from the run's own report.
export function runQuality(r: {
  votesWritten?: number; membersUnmapped: number; billsTagged: number; billsUntagged: number;
  votesProcedural?: number; votesKindKnown?: number; done: number; processed: number;
}) {
  return {
    // membersUnmapped and votesWritten both count every row the run built (new or re-read).
    noPolitician: rate(r.membersUnmapped, r.votesWritten || 0),
    untaggedBills: rate(r.billsUntagged, r.billsTagged + r.billsUntagged),
    procedural: rate(r.votesProcedural || 0, r.votesKindKnown || 0),
    done: rate(r.done, r.processed),
  };
}
export const pctText = (x: Rate) => (x.pct === null ? "n/a" : `${x.pct.toFixed(1)}%`);

// The full status body: every field the endpoint returned before, plus quality.
export function buildStatusBody(input: {
  lastRun: any; ledger: LedgerLike; status: { bills: any; votes: any; tags: any; unmappedMembers?: any[]; publishStats?: any[] | null };
  publish?: (stats: any[]) => unknown;
}) {
  const ledgerCounts: Record<string, number> = {};
  for (const v of Object.values(input.ledger)) ledgerCounts[v.status] = (ledgerCounts[v.status] || 0) + 1;
  const notDone = Object.entries(input.ledger).filter(([, v]) => v.status !== "done").slice(0, 50).map(([k, v]) => ({ roll: k, ...v }));
  const { unmappedMembers = [], publishStats = null, ...status } = input.status;
  return {
    lastRun: input.lastRun, ledger: ledgerCounts, notDone, ...status,
    quality: {
      tables: tableQuality(status.bills, status.votes), ledger: ledgerQuality(input.ledger),
      // The automatic publish gate over every bill (vote-actions-publish.ts publishSummary).
      ...(input.publish && publishStats ? { publish: input.publish(publishStats) } : {}),
    },
    unmappedMembers,
  };
}
