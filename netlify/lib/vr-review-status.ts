// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — vr_measure_issues.review_status vocabulary (dependency-free)
// ─────────────────────────────────────────────────────────────────────────────
// Shared by every reader of vr_measure_issues. A row is verdict-bearing — allowed
// on a public read and into the offline pack — unless it is an automatic proposal
// still awaiting review ('proposed') or one a reviewer turned down ('rejected').
// See netlify/lib/vr-issue-proposals.ts for the lane that writes those rows.
// No imports on purpose: the read path and the pack builder import this without
// pulling the proposal engine into their bundles.

export const REVIEW_STATUS = {
  curated: "curated",
  proposed: "proposed",
  reviewed: "reviewed",
  rejected: "rejected",
} as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];
export const REVIEW_STATUSES = new Set<string>(Object.values(REVIEW_STATUS));

// Statuses that never reach a public read.
export const NON_VERDICT_STATUSES: string[] = [REVIEW_STATUS.proposed, REVIEW_STATUS.rejected];

// A missing status (a row read before the column existed) is curated by definition.
export function isVerdictBearingStatus(status: string | null | undefined): boolean {
  return !NON_VERDICT_STATUSES.includes(String(status ?? REVIEW_STATUS.curated));
}
