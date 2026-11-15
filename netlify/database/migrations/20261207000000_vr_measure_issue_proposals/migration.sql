-- ─────────────────────────────────────────────────────────────────────────────
-- Automatic bill→issue mapping proposals — vr_measure_issues.review_status
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds a review status so an automatically proposed mapping can live in
-- vr_measure_issues without driving a verdict until a human reviews it:
--   curated  — every existing row and every hand-written migration / seed row
--              (the column default, so nothing already applied changes meaning)
--   proposed — written by the ingest's proposal step (low weight, rationale
--              "auto — review"); skipped by every public read
--   reviewed — a proposal a reviewer confirmed via /api/vr-ingest/proposals;
--              a normal mapping from then on
--   rejected — a proposal a reviewer turned down; kept so it is not re-proposed
-- Additive only: no existing row is rewritten and no existing column changes.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261206000000_create_pdx_stated_positions); the drizzle-generated stamp
-- (20261115054200) sorted behind it.
ALTER TABLE "vr_measure_issues" ADD COLUMN "review_status" text DEFAULT 'curated' NOT NULL;--> statement-breakpoint
ALTER TABLE "vr_measure_issues" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vr_measure_issues" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
CREATE INDEX "vr_measure_issues_review_status_idx" ON "vr_measure_issues" ("review_status");
