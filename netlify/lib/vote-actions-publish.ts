// ─────────────────────────────────────────────────────────────────────────────
// Action layer — automatic publish gate (computed on read)
// ─────────────────────────────────────────────────────────────────────────────
// Decides, per bill, whether its raw vote records (pdx_vote_actions) may appear
// on public pages. There is no stored flag and no review queue: every read
// recomputes the rules from the current tables, so mapping a member, adding a
// tag or storing a payload flips a bill the next time anything reads it.
//
// A bill is PUBLISHABLE when every rule below holds over the bill row and ALL of
// its vote rows (every roll call on it, every member):
//   bill_record        the bill has a pdx_action_bills row
//   not_nomination     it is not a nomination (nominations stay excluded)
//   has_topic_tag      it carries at least one topic tag
//   has_votes          it has at least one vote row
//   members_mapped     no vote row lacks a politician (no unmapped member on it)
//   vote_kind_known    no vote row has an unclassified vote kind
//   raw_payload_stored every vote row points at its stored, parsed source payload
// Procedural votes ARE publishable; each public roll carries `procedural` so the
// reader-facing note labels it.
//
// The signals are the same ones the curator status page reports as rates
// (vote-actions-quality.ts): unmapped rows, untagged bills, unknown kind, raw_ref.
// Pure: no database, no Blobs, no network. Data comes in through injected deps.

export const PUBLISH_RULES_VERSION = "va-publish-v1";

// Per-bill counts, as vote-actions-db.ts billPublishStats returns them.
export type BillPublishStats = {
  billKey: string;
  measureType: string | null;
  tagCount: number;
  rows: number;            // vote rows on the bill
  unmappedRows: number;    // rows with politician_id NULL
  unknownKindRows: number; // rows whose vote kind is 'unknown' / is_procedural NULL
  missingRawRows: number;  // rows with raw_ref NULL
  proceduralRows?: number;
  rolls?: number;
};

export const PUBLISH_RULES: Array<{ id: string; label: string; pass: (s: BillPublishStats) => boolean }> = [
  { id: "not_nomination", label: "not a nomination", pass: (s) => s.measureType !== "nomination" },
  { id: "has_topic_tag", label: "at least one topic tag", pass: (s) => (Number(s.tagCount) || 0) > 0 },
  { id: "has_votes", label: "at least one vote row", pass: (s) => (Number(s.rows) || 0) > 0 },
  { id: "members_mapped", label: "every member mapped to a politician", pass: (s) => (Number(s.unmappedRows) || 0) === 0 },
  { id: "vote_kind_known", label: "every vote kind classified", pass: (s) => (Number(s.unknownKindRows) || 0) === 0 },
  { id: "raw_payload_stored", label: "every vote row has its stored source payload", pass: (s) => (Number(s.missingRawRows) || 0) === 0 },
];

export type BillPublish = { billKey: string; publishable: boolean; failed: string[] };
// `s` null/undefined = no bill row on file for that key.
export function evaluateBill(billKey: string, s: BillPublishStats | null | undefined): BillPublish {
  if (!s) return { billKey, publishable: false, failed: ["bill_record"] };
  const failed = PUBLISH_RULES.filter((r) => !r.pass(s)).map((r) => r.id);
  return { billKey, publishable: failed.length === 0, failed };
}

// Curator status: how many bills pass, and how many fail each rule.
export function publishSummary(stats: BillPublishStats[] | null | undefined) {
  const all = (stats || []).map((s) => evaluateBill(s.billKey, s));
  const failingByRule: Record<string, number> = {};
  for (const r of PUBLISH_RULES) failingByRule[r.id] = 0;
  for (const b of all) for (const f of b.failed) failingByRule[f] = (failingByRule[f] || 0) + 1;
  const n = all.filter((b) => b.publishable).length;
  const pct = all.length ? Math.round((n / all.length) * 1000) / 10 : null;
  return {
    rulesVersion: PUBLISH_RULES_VERSION,
    rules: PUBLISH_RULES.map((r) => ({ id: r.id, label: r.label })),
    publishableBills: { n, of: all.length, pct, text: pct === null ? `${n} / ${all.length} (n/a)` : `${n} / ${all.length} (${pct.toFixed(1)}%)` },
    failingByRule,
  };
}

// One raw vote row as the DB read returns it (see voteActionsForPolitician).
export type PoliticianVoteRow = {
  billKey: string; chamber: string; congress: number; session: number; rollNumber: number; voteDate: string | Date | null;
  vote: string; voteRaw?: string | null; voteKind?: string | null; isProcedural?: boolean | null; question?: string | null;
  sourceUrl: string; sourceLabel?: string | null; rawRef?: string | null;
};
export type PublishDeps = {
  rowsForPolitician: (pid: string) => Promise<PoliticianVoteRow[]>;
  statsForBills: (billKeys: string[]) => Promise<BillPublishStats[]>;
};

const iso = (d: unknown) => (d ? new Date(d as any).toISOString() : null);

// THE PUBLIC READ. Only rolls on publishable bills leave this function, and only
// public fields: no member id, no politician id of anyone else, no raw key.
export async function publishedForPolitician(pid: string, deps: PublishDeps) {
  const rows = await deps.rowsForPolitician(pid);
  const keys = [...new Set(rows.map((r) => r.billKey).filter(Boolean))];
  const stats = keys.length ? await deps.statsForBills(keys) : [];
  const byKey = new Map(stats.map((s) => [s.billKey, s]));
  const billKeys: Record<string, any[]> = {};
  for (const r of rows) {
    if (!evaluateBill(r.billKey, byKey.get(r.billKey)).publishable) continue;
    (billKeys[r.billKey] ||= []).push({
      chamber: r.chamber, congress: r.congress, session: r.session, roll: r.rollNumber, date: iso(r.voteDate),
      vote: r.vote, voteRaw: r.voteRaw ?? null, voteKind: r.voteKind ?? null, procedural: r.isProcedural === true,
      question: r.question ?? null, sourceUrl: r.sourceUrl, sourceLabel: r.sourceLabel ?? null,
    });
  }
  return { pid, rulesVersion: PUBLISH_RULES_VERSION, bills: Object.keys(billKeys).length, billKeys };
}

// The curator read: every row (with raw keys), plus each bill's gate result.
export async function curatorLinksForPolitician(pid: string, deps: PublishDeps) {
  const rows = await deps.rowsForPolitician(pid);
  const keys = [...new Set(rows.map((r) => r.billKey).filter(Boolean))];
  const stats = keys.length ? await deps.statsForBills(keys) : [];
  const byKey = new Map(stats.map((s) => [s.billKey, s]));
  const billKeys: Record<string, any[]> = {};
  const publish: Record<string, BillPublish> = {};
  for (const r of rows) {
    if (!r || !r.billKey) continue;
    publish[r.billKey] ||= evaluateBill(r.billKey, byKey.get(r.billKey));
    (billKeys[r.billKey] ||= []).push({
      chamber: r.chamber, congress: r.congress, session: r.session, roll: r.rollNumber, date: iso(r.voteDate),
      vote: r.vote, voteRaw: r.voteRaw ?? null, voteKind: r.voteKind ?? null, procedural: r.isProcedural === true,
      question: r.question ?? null, sourceUrl: r.sourceUrl, sourceLabel: r.sourceLabel ?? null, rawRef: r.rawRef ?? null,
    });
  }
  return { pid, rulesVersion: PUBLISH_RULES_VERSION, bills: Object.keys(billKeys).length, billKeys, publish };
}
