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
//   2b. SCORE AND AUTO-APPROVE. Each proposed key gets a 0..100 confidence
//      (see "Confidence" below). At or above AUTO_APPROVE_CUTOFF (60) — and only
//      for a key in db/issue-keys.json — the row is promoted at once through the
//      same guarded proposed→reviewed transition a manual review uses, with
//      reviewed_by 'auto' and the support_meaning the direction rule picks:
//      'yea_opposes' when the measure's text carries a reversal/restriction cue,
//      'yea_supports' otherwise. Below the cutoff it stays 'proposed'
//      ("auto — review"), cue or no cue.
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
  confidence: number; // 0..100, see scoreProposal
  directionClear: boolean; // false when the measure's text carries a reversal cue
  supportMeaning: "yea_supports" | "yea_opposes"; // the direction rule's pick — see below
  signals: string[]; // the scoring rules that fired, for the rationale + tests
};

// ── Confidence (0..100) and the auto-approve cutoff ─────────────────────────
// Each proposed key is scored from HOW it was selected:
//   location     subject + instrument (+ facet) read in the title / short title → 70
//                read only once the summary is added → 45
//                keyword suggester only (no pattern fits) → 35
//   specificity  the key has a facet (a narrower child key) and it read → +10
//   agreement    title AND summary each match the pattern on their own → +10
//                the keyword suggester independently picks the same key → +10
//   competition  more than one pattern key fits the measure → −10 for every key,
//                and a further −10 for each key after the first
// The score measures the ISSUE MATCH only. Direction is decided separately and
// never lowers the score:
//   direction    a measure whose text carries a reversal or restriction cue
//                (REVERSAL_CUES: repeal, rescind, prohibit, ban, restrict, …) gets
//                supportMeaning 'yea_opposes' — a yea reverses or restricts the
//                issue. Without a cue: 'yea_supports'. A strong match is
//                auto-approved in whichever direction the rule picks; a weak match
//                stays proposed either way, and a human sets the final direction.
// Bands: high ≥ 80, medium 60–79, low < 60. High and medium (≥ AUTO_APPROVE_CUTOFF)
// are auto-approved — review_status 'reviewed', reviewed_by 'auto' — and low stays
// 'proposed' with the "auto — review" rationale in the manual queue.
export const AUTO_APPROVE_CUTOFF = 60;
export const HIGH_CONFIDENCE = 80;
export const AUTO_REVIEWER = "auto";
export const CONF = {
  titleMatch: 70,
  summaryMatch: 45,
  keywordOnly: 35,
  facet: 10,
  titleAndSummary: 10,
  keywordAgrees: 10,
  competing: 10,
  secondaryRank: 10,
} as const;

export const REVERSAL_CUES =
  /\b(?:repeal\w*|rescind\w*|rescission\w*|disapprov\w*|nullif\w*|terminat\w*|prohibit\w*|ban|bans|banned|banning|restrict\w*|block\w*|defund\w*|roll(?:ing)?[- ]back|overturn\w*|eliminat\w*|limit|limits|limited|limiting|limitations?|freez\w*|deny\w*|denial|suspend\w*|suspension|withdraw\w*|revok\w*|revocation|exempt\w*|waiv\w+|delay\w*|cuts?|cutting|reduc\w+|proof of citizenship|voter id|concealed carry|reciprocity|deregulat\w*)\b/i;

export function confidenceBand(c: number): "high" | "medium" | "low" {
  return c >= HIGH_CONFIDENCE ? "high" : c >= AUTO_APPROVE_CUTOFF ? "medium" : "low";
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const PATTERN_MEASURE_TYPES_SKIPPED = new Set(["litigation", "nomination"]);

// A pattern regex is case-insensitive and stateless (no /g) today; re-create
// defensively so a future /g flag can never make .test() alternate.
const stateless = (re: RegExp | undefined | null): RegExp | null =>
  re ? new RegExp(re.source, re.flags.replace(/g|y/g, "")) : null;

const str = (v: unknown) => String(v ?? "").trim();
function titleText(m: MeasureLite): string {
  return [m.title, m.shortTitle].map(str).filter(Boolean).join(" — ");
}
function measureText(m: MeasureLite): string {
  return [m.title, m.shortTitle, m.summary].map(str).filter(Boolean).join(" — ");
}

// The direction rule: a reversal/restriction cue anywhere in the measure's text
// (title, short title, summary) means a yea opposes the issue.
export function directionFor(text: string): "yea_supports" | "yea_opposes" {
  return REVERSAL_CUES.test(text) ? "yea_opposes" : "yea_supports";
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

// Propose issue keys for ONE measure, each scored. Returns accepted proposals
// (known keys, capped, low weight) and the unknown keys the guard rejected.
export function proposeIssueKeys(m: MeasureLite): {
  accepted: ProposalCandidate[];
  rejected: Array<{ issueKey: string; basis: string }>;
} {
  const accepted: ProposalCandidate[] = [];
  const rejected: Array<{ issueKey: string; basis: string }> = [];
  if (PATTERN_MEASURE_TYPES_SKIPPED.has(String(m.measureType || ""))) return { accepted, rejected };
  const text = measureText(m);
  if (!text) return { accepted, rejected };

  const titleHits = new Set(patternHits(titleText(m)));
  const summary = str(m.summary);
  const summaryHits = new Set(summary ? patternHits(summary) : []);
  const allHits = patternHits(text);
  const kw = suggestIssue(text);
  const supportMeaning = directionFor(text);
  const directionClear = supportMeaning === "yea_supports";

  const known = allHits.filter((k) => {
    if (ISSUE_KEYS.has(k)) return true;
    rejected.push({ issueKey: k, basis: PATTERNS_VERSION });
    return false;
  });

  known.slice(0, PROPOSAL_MAX_PER_MEASURE).forEach((key, rank) => {
    const P: any = (BILL_KEY_PATTERNS as any)[key];
    const signals: string[] = [];
    let c: number;
    if (titleHits.has(key)) { c = CONF.titleMatch; signals.push("title-match"); }
    else { c = CONF.summaryMatch; signals.push("summary-match"); }
    if (P && P.facet) { c += CONF.facet; signals.push("facet"); }
    if (titleHits.has(key) && summaryHits.has(key)) { c += CONF.titleAndSummary; signals.push("title+summary-agree"); }
    if (kw === key) { c += CONF.keywordAgrees; signals.push("keyword-agrees"); }
    if (known.length > 1) { c -= CONF.competing; signals.push("competing-keys"); }
    if (rank > 0) { c -= CONF.secondaryRank; signals.push("secondary-key"); }
    if (!directionClear) signals.push("reversal-cue");
    accepted.push({
      issueKey: key,
      weight: rank === 0 ? PROPOSAL_PRIMARY_WEIGHT : PROPOSAL_SECONDARY_WEIGHT,
      basis: PATTERNS_VERSION,
      confidence: clamp(c),
      directionClear,
      supportMeaning,
      signals,
    });
  });

  if (!accepted.length && kw && ISSUE_KEYS.has(kw)) {
    const signals = ["keyword-only"];
    if (!directionClear) signals.push("reversal-cue");
    accepted.push({ issueKey: kw, weight: PROPOSAL_KEYWORD_WEIGHT, basis: "keyword-suggester", confidence: clamp(CONF.keywordOnly), directionClear, supportMeaning, signals });
  }
  return { accepted, rejected };
}

// Should this scored candidate be promoted without a human? Never for a key the
// allow-list lacks, never below the cutoff. Direction does not gate it — the
// direction rule only chooses the support_meaning the promotion writes.
export function shouldAutoApprove(c: Pick<ProposalCandidate, "issueKey" | "confidence">): boolean {
  return ISSUE_KEYS.has(c.issueKey) && c.confidence >= AUTO_APPROVE_CUTOFF;
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
  confidence?: number | null;
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
  confidence: number;
};

export type ReviewUpdate = Partial<
  Pick<MappingRow, "issueKey" | "weight" | "isPrimary" | "supportMeaning" | "rationale" | "sourceUrl" | "reviewStatus" | "reviewedAt" | "reviewedBy">
>;

export interface ProposalRepo {
  loadMeasures(ids: number[]): Promise<MeasureLite[]>;
  // Measure ids (of those given) that already have ANY vr_measure_issues row.
  mappedMeasureIds(ids: number[]): Promise<Set<number>>;
  // ON CONFLICT (measure_id, issue_key) DO NOTHING. The new row's id, or null
  // when nothing was written.
  insertProposal(row: ProposalInsert): Promise<number | null>;
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
  // Of those: promoted to 'reviewed' by the confidence cutoff, and left 'proposed'.
  autoApproved: number;
  queuedForReview: number;
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
    considered: 0, skippedMapped: 0, proposalsWritten: 0, autoApproved: 0, queuedForReview: 0, measuresProposed: [],
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
          confidence: p.confidence,
        };
        const invalid = validateProposalRow(row);
        if (invalid) { out.rejectedKeys.push(p.issueKey); continue; }
        const id = await repo.insertProposal(row);
        if (id == null) continue;
        out.proposalsWritten++;
        wrote = true;
        // AUTO-APPROVAL: the same guarded transition a manual review makes
        // (proposed → reviewed, only while the row is still 'proposed'), with
        // the reviewer recorded as "auto". Below the cutoff the row stays in
        // the manual queue exactly as written above.
        if (shouldAutoApprove(p)) {
          const promoted = await repo.updateMapping(id, REVIEW_STATUS.proposed, {
            supportMeaning: SUPPORT_MEANINGS.has(p.supportMeaning) ? p.supportMeaning : "yea_supports",
            rationale: `auto-approved ${p.supportMeaning} — confidence ${p.confidence} (${confidenceBand(p.confidence)}: ${p.signals.join(", ")})`,
            reviewStatus: REVIEW_STATUS.reviewed,
            reviewedAt: new Date(),
            reviewedBy: AUTO_REVIEWER,
          });
          if (promoted) out.autoApproved++;
          else out.queuedForReview++;
        } else {
          out.queuedForReview++;
        }
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

// "auto" is reserved for the confidence cutoff, so the audit trail can always
// tell a machine promotion from a human one.
function cleanReviewer(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 80);
  return s && s.toLowerCase() !== AUTO_REVIEWER ? s : "operator";
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
