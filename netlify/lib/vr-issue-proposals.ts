// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — automatic bill→issue mapping PROPOSALS + their human review
// ─────────────────────────────────────────────────────────────────────────────
// Until this module, a measure got issue keys only from a hand-written migration
// or the curated seed (db/vr-issue-seed.json). That stays exactly as it was. What
// this adds is a lane for measures the ingest pulls in that NOBODY has mapped yet:
//
//   1. PROPOSE. After an ingest run, every measure the run touched that has no row
//      at all in vr_measure_issues is read by the bill-key-patterns per-key
//      patterns (subject + instrument + facet, read over the measure's title, short
//      title and summary), falling back to the conservative keyword suggester
//      (suggestIssue) when no pattern fits. Each proposal is written as a
//      vr_measure_issues row with
//         review_status = 'proposed', weight ≤ 40, rationale "auto — review",
//         support_meaning = the column default (never read — see below).
//      Unknown issue keys are rejected against db/issue-keys.json before any write.
//      A measure that already has ANY mapping row (curated, reviewed, proposed or
//      rejected) is skipped, and the insert is ON CONFLICT DO NOTHING, so a curated
//      or reviewed mapping is never overwritten.
//
//   2. KEEP IT OUT OF VERDICTS. A proposed row is not verdict-bearing: every public
//      read of vr_measure_issues (voting-record.mts, the offline pack builder, the
//      digest) skips rows whose status is 'proposed' or 'rejected'. Its
//      support_meaning is therefore never served, which is why a placeholder is
//      safe there — the client's verdict code would read ANY unknown value as
//      "yea_supports", so the guard has to be server-side and it is.
//
//   3. REVIEW. An authenticated operator (POST /api/vr-ingest/proposals/:id/review)
//      confirms or edits the issue key, sets the final weight and support_meaning,
//      optionally marks it primary, and the row becomes 'reviewed' — a normal
//      mapping from then on. Or rejects it ('rejected'), which keeps the row so the
//      same proposal is not re-made on the next run.
//
//   4. RE-PACK. After proposals are written or a review is applied, the affected
//      members' offline packs are rewritten through writeMemberPack under the
//      current mapping version (review_status is part of the fingerprint, so a
//      review always moves the key).
//
// This file is pure logic over a small repository interface — no database or Blobs
// import — so scripts/test-vr-issue-proposals.mjs can execute it against an
// in-memory repo. The drizzle-backed repo lives in vr-issue-proposals-db.ts.

import { BILL_KEY_PATTERNS, MAPPED_KEYS, PATTERNS_VERSION } from "./bill-key-patterns.mjs";
import { ISSUE_KEYS, suggestIssue } from "./vr-normalize.js";
import { REVIEW_STATUS } from "./vr-review-status.js";

// ── Vocabulary ───────────────────────────────────────────────────────────────
export const PROPOSAL_RATIONALE = "auto — review";
export const PROPOSAL_MAX_WEIGHT = 40;
export const PROPOSAL_PRIMARY_WEIGHT = 40; // first pattern hit
export const PROPOSAL_SECONDARY_WEIGHT = 25; // further pattern hits
export const PROPOSAL_KEYWORD_WEIGHT = 30; // keyword-suggester fallback
export const PROPOSAL_MAX_PER_MEASURE = 3;
export const PROPOSAL_PLACEHOLDER_SUPPORT = "yea_supports"; // never served — see header

export {
  REVIEW_STATUS,
  REVIEW_STATUSES,
  NON_VERDICT_STATUSES,
  isVerdictBearingStatus,
  type ReviewStatus,
} from "./vr-review-status.js";

export const SUPPORT_MEANINGS = new Set(["yea_supports", "yea_opposes"]);

// ── The proposer (pure) ──────────────────────────────────────────────────────
export type MeasureLite = {
  id: number;
  measureType?: string | null;
  title?: string | null;
  shortTitle?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
};

export type ProposalCandidate = {
  issueKey: string;
  weight: number;
  basis: string; // which reader produced it — kept out of the served rationale
};

const PATTERN_MEASURE_TYPES_SKIPPED = new Set(["litigation", "nomination"]);

// A pattern regex is case-insensitive and stateless (no /g) today; re-create
// defensively so a future /g flag can never make .test() alternate.
const stateless = (re: RegExp | undefined | null): RegExp | null =>
  re ? new RegExp(re.source, re.flags.replace(/g|y/g, "")) : null;

function measureText(m: MeasureLite): string {
  return [m.title, m.shortTitle, m.summary]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(" — ");
}

// Every key whose bill-key-patterns subject AND instrument (and facet, when the
// key has one) read in the measure's own text, in pattern order — the same order
// the per-key yields rule uses, so an earlier key leads.
function patternHits(text: string): string[] {
  const hits: string[] = [];
  for (const key of MAPPED_KEYS as string[]) {
    const P: any = (BILL_KEY_PATTERNS as any)[key];
    if (!P) continue;
    const subject = stateless(P.subject);
    const instrument = stateless(P.instrument);
    if (!subject || !instrument) continue;
    if (!subject.test(text) || !instrument.test(text)) continue;
    const facet = stateless(P.facet);
    if (facet && !facet.test(text)) continue;
    const cedes = stateless(P.cedes);
    if (cedes && cedes.test(text)) continue;
    hits.push(key);
  }
  return hits;
}

// Propose issue keys for ONE measure. Returns accepted proposals (known keys,
// capped, low weight) and the unknown keys the guard rejected, for the report.
export function proposeIssueKeys(m: MeasureLite): {
  accepted: ProposalCandidate[];
  rejected: Array<{ issueKey: string; basis: string }>;
} {
  const accepted: ProposalCandidate[] = [];
  const rejected: Array<{ issueKey: string; basis: string }> = [];
  if (PATTERN_MEASURE_TYPES_SKIPPED.has(String(m.measureType || ""))) return { accepted, rejected };
  const text = measureText(m);
  if (!text) return { accepted, rejected };

  for (const key of patternHits(text)) {
    if (!ISSUE_KEYS.has(key)) {
      rejected.push({ issueKey: key, basis: PATTERNS_VERSION });
      continue;
    }
    if (accepted.length >= PROPOSAL_MAX_PER_MEASURE) break;
    accepted.push({
      issueKey: key,
      weight: accepted.length === 0 ? PROPOSAL_PRIMARY_WEIGHT : PROPOSAL_SECONDARY_WEIGHT,
      basis: PATTERNS_VERSION,
    });
  }

  if (!accepted.length) {
    const kw = suggestIssue(text);
    if (kw && ISSUE_KEYS.has(kw)) {
      accepted.push({ issueKey: kw, weight: PROPOSAL_KEYWORD_WEIGHT, basis: "keyword-suggester" });
    }
  }
  return { accepted, rejected };
}

// Validate a proposal row against the guard before it is ever written. Exported
// so the write path and the tests check the exact same thing.
export function validateProposalRow(row: { issueKey: string; weight: number }): string | null {
  if (!ISSUE_KEYS.has(row.issueKey)) return `unknown issue key: ${row.issueKey}`;
  if (!Number.isInteger(row.weight) || row.weight < 0 || row.weight > PROPOSAL_MAX_WEIGHT) {
    return `proposal weight must be an integer 0..${PROPOSAL_MAX_WEIGHT}`;
  }
  return null;
}

// ── Repository interface (the DB-backed one is in vr-issue-proposals-db.ts) ────
export type MappingRow = {
  id: number;
  measureId: number;
  issueKey: string;
  weight: number;
  isPrimary: boolean;
  supportMeaning: string;
  rationale: string | null;
  sourceUrl: string | null;
  reviewStatus: string;
  reviewedAt: Date | string | null;
  reviewedBy: string | null;
};

export type ProposalInsert = {
  measureId: number;
  issueKey: string;
  weight: number;
  isPrimary: boolean;
  supportMeaning: string;
  rationale: string;
  sourceUrl: string | null;
  reviewStatus: "proposed";
};

export type ReviewUpdate = Partial<
  Pick<MappingRow, "issueKey" | "weight" | "isPrimary" | "supportMeaning" | "rationale" | "sourceUrl" | "reviewStatus" | "reviewedAt" | "reviewedBy">
>;

export interface ProposalRepo {
  loadMeasures(ids: number[]): Promise<MeasureLite[]>;
  // Measure ids (of those given) that already have ANY vr_measure_issues row.
  mappedMeasureIds(ids: number[]): Promise<Set<number>>;
  // ON CONFLICT (measure_id, issue_key) DO NOTHING. true when a row was written.
  insertProposal(row: ProposalInsert): Promise<boolean>;
  getMapping(id: number): Promise<MappingRow | null>;
  findMapping(measureId: number, issueKey: string): Promise<MappingRow | null>;
  // Guarded on the row still being in `expectStatus`; null when it was not.
  updateMapping(id: number, expectStatus: string, set: ReviewUpdate): Promise<MappingRow | null>;
  listMappings(opts: { status: string | null; limit: number }): Promise<MappingRow[]>;
  votersForMeasures(ids: number[]): Promise<string[]>;
  // Re-read the mapping version, then writeMemberPack for each member.
  refreshPacks(pids: string[]): Promise<{ written: number; errors: string[] }>;
}

// ── Propose for a set of measures ────────────────────────────────────────────
export type ProposeReport = {
  considered: number;
  skippedMapped: number;
  proposalsWritten: number;
  measuresProposed: number[];
  rejectedKeys: string[];
  packsWritten: number;
  affectedMembers: string[];
  errors: string[];
};

export async function proposeForMeasures(
  repo: ProposalRepo,
  measureIds: number[],
  opts: { refreshPacks?: boolean } = {}
): Promise<ProposeReport> {
  const ids = [...new Set(measureIds.filter((n) => Number.isInteger(n) && n > 0))];
  const out: ProposeReport = {
    considered: 0, skippedMapped: 0, proposalsWritten: 0, measuresProposed: [],
    rejectedKeys: [], packsWritten: 0, affectedMembers: [], errors: [],
  };
  if (!ids.length) return out;

  const mapped = await repo.mappedMeasureIds(ids);
  const measures = await repo.loadMeasures(ids.filter((id) => !mapped.has(id)));
  out.skippedMapped = ids.filter((id) => mapped.has(id)).length;

  for (const m of measures) {
    out.considered++;
    try {
      const { accepted, rejected } = proposeIssueKeys(m);
      for (const r of rejected) out.rejectedKeys.push(r.issueKey);
      let wrote = false;
      for (const p of accepted) {
        const row: ProposalInsert = {
          measureId: m.id,
          issueKey: p.issueKey,
          weight: p.weight,
          isPrimary: false,
          supportMeaning: PROPOSAL_PLACEHOLDER_SUPPORT,
          rationale: PROPOSAL_RATIONALE,
          sourceUrl: m.sourceUrl ?? null,
          reviewStatus: REVIEW_STATUS.proposed,
        };
        const invalid = validateProposalRow(row);
        if (invalid) { out.rejectedKeys.push(p.issueKey); continue; }
        if (await repo.insertProposal(row)) { out.proposalsWritten++; wrote = true; }
      }
      if (wrote) out.measuresProposed.push(m.id);
    } catch (e: any) {
      out.errors.push(`propose ${m.id}: ${e?.message || String(e)}`);
    }
  }
  out.rejectedKeys = [...new Set(out.rejectedKeys)];

  if (out.measuresProposed.length) {
    out.affectedMembers = await repo.votersForMeasures(out.measuresProposed);
    if (opts.refreshPacks !== false && out.affectedMembers.length) {
      const res = await repo.refreshPacks(out.affectedMembers);
      out.packsWritten = res.written;
      out.errors.push(...res.errors);
    }
  }
  return out;
}

// ── Review ───────────────────────────────────────────────────────────────────
export type ReviewResult =
  | { ok: true; status: 200; row: MappingRow; packsWritten: number; errors: string[] }
  | { ok: false; status: 400 | 404 | 409; error: string };

const fail = (status: 400 | 404 | 409, error: string): ReviewResult => ({ ok: false, status, error });

function cleanReviewer(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 80);
  return s || "operator";
}

// body: { issueKey?, weight, supportMeaning, isPrimary?, rationale?, sourceUrl?, reviewer? }
export async function reviewProposal(repo: ProposalRepo, id: number, body: any): Promise<ReviewResult> {
  if (!Number.isInteger(id) || id <= 0) return fail(400, "id must be a positive integer");
  const row = await repo.getMapping(id);
  if (!row) return fail(404, "mapping not found");
  if (row.reviewStatus !== REVIEW_STATUS.proposed) {
    // Curated and already-reviewed mappings are never edited from here.
    return fail(409, `only proposed mappings can be reviewed (this one is ${row.reviewStatus})`);
  }

  const b = body && typeof body === "object" ? body : {};
  const issueKey = b.issueKey == null || b.issueKey === "" ? row.issueKey : String(b.issueKey).trim();
  if (!ISSUE_KEYS.has(issueKey)) return fail(400, `unknown issue key: ${issueKey}`);

  const weight = Number(b.weight);
  if (b.weight == null || !Number.isInteger(weight) || weight < 0 || weight > 100) {
    return fail(400, "weight is required and must be an integer 0..100");
  }
  const supportMeaning = String(b.supportMeaning ?? "");
  if (!SUPPORT_MEANINGS.has(supportMeaning)) {
    return fail(400, "supportMeaning is required: yea_supports or yea_opposes");
  }
  if (b.isPrimary != null && typeof b.isPrimary !== "boolean") return fail(400, "isPrimary must be a boolean");

  if (issueKey !== row.issueKey) {
    const clash = await repo.findMapping(row.measureId, issueKey);
    if (clash) return fail(409, `measure already has a ${clash.reviewStatus} mapping for ${issueKey}`);
  }

  const rationaleIn = b.rationale == null ? "" : String(b.rationale).trim().slice(0, 500);
  const rationale = rationaleIn && rationaleIn !== PROPOSAL_RATIONALE
    ? rationaleIn
    : "auto-proposed mapping, confirmed on review";
  const sourceUrl = b.sourceUrl == null || b.sourceUrl === "" ? row.sourceUrl : String(b.sourceUrl).trim();
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return fail(400, "sourceUrl must be an http(s) URL");

  const updated = await repo.updateMapping(id, REVIEW_STATUS.proposed, {
    issueKey,
    weight,
    supportMeaning,
    isPrimary: b.isPrimary === true ? true : row.isPrimary,
    rationale,
    sourceUrl: sourceUrl || null,
    reviewStatus: REVIEW_STATUS.reviewed,
    reviewedAt: new Date(),
    reviewedBy: cleanReviewer(b.reviewer),
  });
  if (!updated) return fail(409, "mapping changed while it was being reviewed — reload and retry");

  const voters = await repo.votersForMeasures([updated.measureId]);
  const res = voters.length ? await repo.refreshPacks(voters) : { written: 0, errors: [] };
  return { ok: true, status: 200, row: updated, packsWritten: res.written, errors: res.errors };
}

// body: { reviewer?, note? }
export async function rejectProposal(repo: ProposalRepo, id: number, body: any): Promise<ReviewResult> {
  if (!Number.isInteger(id) || id <= 0) return fail(400, "id must be a positive integer");
  const row = await repo.getMapping(id);
  if (!row) return fail(404, "mapping not found");
  if (row.reviewStatus !== REVIEW_STATUS.proposed) {
    return fail(409, `only proposed mappings can be rejected (this one is ${row.reviewStatus})`);
  }
  const b = body && typeof body === "object" ? body : {};
  const note = b.note == null ? "" : String(b.note).trim().slice(0, 300);
  const updated = await repo.updateMapping(id, REVIEW_STATUS.proposed, {
    reviewStatus: REVIEW_STATUS.rejected,
    rationale: note ? `${PROPOSAL_RATIONALE} — rejected: ${note}` : `${PROPOSAL_RATIONALE} — rejected`,
    reviewedAt: new Date(),
    reviewedBy: cleanReviewer(b.reviewer),
  });
  if (!updated) return fail(409, "mapping changed while it was being reviewed — reload and retry");
  // A rejected row was never verdict-bearing, but it does move the fingerprint, so
  // repack to keep the eager keys current.
  const voters = await repo.votersForMeasures([updated.measureId]);
  const res = voters.length ? await repo.refreshPacks(voters) : { written: 0, errors: [] };
  return { ok: true, status: 200, row: updated, packsWritten: res.written, errors: res.errors };
}
