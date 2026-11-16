-- ─────────────────────────────────────────────────────────────────────────────
-- Action layer — raw payload references on pdx_action_bills / pdx_vote_actions
-- ─────────────────────────────────────────────────────────────────────────────
-- Each row records the Blobs key (store "raw-ingest-votes") of the unmodified
-- source payload it was parsed from, so rows can be rebuilt from stored payloads
-- without refetching. Nullable and additive: existing rows keep NULL, and no
-- existing column, row or public read changes.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261209000000_create_pdx_vote_actions); the drizzle-generated stamp
-- (20261116051531) sorted behind it.
ALTER TABLE "pdx_action_bills" ADD COLUMN "raw_ref" text;--> statement-breakpoint
ALTER TABLE "pdx_vote_actions" ADD COLUMN "raw_ref" text;