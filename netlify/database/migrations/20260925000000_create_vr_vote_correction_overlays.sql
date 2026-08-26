-- ─────────────────────────────────────────────────────────────────────────────
-- vr_vote_correction_overlays — a correction path that does not need a deploy
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS WRONG. Until now every fix to the formal record was migration-bound.
-- 20260909000000_vr_vote_corrections.sql is the shape of it: eighteen verified
-- position corrections, each written as a guarded UPDATE inside a DO block that
-- RAISEs rather than guess. That migration is good work and it stays exactly as it
-- is — but it means a reader who finds a wrong cell waits for a deploy, and a
-- moderator who can prove the cell is wrong has nowhere to put the proof. The
-- practical result was that small, provable errors sat in the record because fixing
-- one cost a release.
--
-- WHAT THIS ADDS. One additive table holding proposed and approved corrections to
-- cells of vr_member_votes. Reads overlay APPROVED rows on top of the stored value;
-- the stored value is never mutated by this path. Migrations stay append-only and
-- immutable, as the platform requires, and nothing here edits an applied one.
--
-- WHY AN OVERLAY AND NOT AN UPDATE. Two reasons, and both are trust rather than
-- convenience:
--   1. The correction is the record. A silent UPDATE leaves a reader unable to tell
--      a corrected cell from an uncorrected one, and unable to see who changed it,
--      when, why, or on what source. Every approved row here carries reason,
--      source_url, proposer, reviewer and both timestamps, and the read path emits
--      them alongside the corrected value so the UI can DISCLOSE the correction.
--      A correction nobody can audit is indistinguishable from a quiet rewrite.
--   2. Ingest re-asserts. The vote ingest is idempotent and re-runnable; an UPDATE
--      applied outside it can be silently overwritten by the next pass, and then
--      re-applied, and nobody would know which state a given read saw. An overlay
--      that carries the value it EXAMINED (stored_value) survives that honestly:
--      if the underlying cell no longer holds what the moderator looked at, the
--      correction stops applying and is marked stale instead of being re-imposed on
--      a cell it was never reviewed against.
--
-- FAIL CLOSED — the five refusals, enforced here in CHECK constraints and again in
-- netlify/lib/vr-corrections.ts on every read:
--   • Only status='approved' ever reaches a reader.
--   • A correction applies ONLY while the cell still holds stored_value. Any other
--     value and it does not apply — no re-imposition on unreviewed data.
--   • proposed_value must be in the column's shipped vocabulary. Position is one of
--     yea | nay | present | not_voting; is_party is with_party | against_party |
--     the empty string meaning NULL. A correction cannot introduce a value the
--     schema's own vocabulary does not contain.
--   • stored_value <> proposed_value. A correction that changes nothing is not a
--     correction; it is noise in an audit log.
--   • NOTHING HERE CREATES A VOTE. There is no path from this table to an INSERT
--     into vr_member_votes: the FK means a correction can only ever point at a roll
--     call that already exists, and the overlay can only move a cell BETWEEN
--     recorded values. A missing vote stays missing — the archive says "no formal
--     read" rather than inventing one, and this table cannot change that.
--
-- WHAT IT CANNOT TOUCH. Only the two member-vote cells named above. Not issue
-- mappings, not support_meaning, not weights, not Direction Match, not a
-- publication floor. Direction is a curator judgement made in db/vr-issue-seed.json
-- under db/vr-ingest-runbook.md rule 22, and no moderator action at runtime may
-- reach it. A wrong DIRECTION is still a migration, on purpose.
--
-- Rolls forward from the applied voting-record migrations; never edits one.

CREATE TABLE IF NOT EXISTS "vr_vote_correction_overlays" (
  "id" serial PRIMARY KEY,
  -- WHICH CELL. rollcall_id + politician_id is the unique key of vr_member_votes,
  -- so a correction can name exactly one cell and cannot be vague about it.
  "rollcall_id" integer NOT NULL REFERENCES "vr_rollcalls"("id") ON DELETE CASCADE,
  "politician_id" text NOT NULL,
  -- 'position' | 'is_party' — the only two correctable columns.
  "field" text NOT NULL,
  -- THE MATCH GUARD: the value the moderator actually examined. An empty string
  -- means the cell was NULL (is_party is nullable).
  "stored_value" text NOT NULL,
  "proposed_value" text NOT NULL,
  -- Human-readable identity of the roll call, denormalised so the audit row stays
  -- legible if a rollcall row is ever renumbered upstream.
  "chamber" text,
  "congress" integer,
  "session" integer,
  "roll_number" integer,
  -- WHY, AND ON WHAT. Both required: a correction without a reason is an assertion,
  -- and a correction without a citable source is an opinion.
  "reason" text NOT NULL,
  "source_url" text NOT NULL,
  "source_label" text DEFAULT '',
  -- AUDIT. pending → approved | rejected | superseded. Only 'approved' is read.
  "status" text DEFAULT 'pending' NOT NULL,
  "proposed_by" text NOT NULL,
  "proposed_by_label" text DEFAULT '',
  "proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_by" text,
  "reviewed_by_label" text DEFAULT '',
  "reviewed_at" timestamp with time zone,
  "review_note" text DEFAULT '',
  CONSTRAINT "vr_vco_field_ck" CHECK ("field" IN ('position', 'is_party')),
  CONSTRAINT "vr_vco_status_ck" CHECK ("status" IN ('pending', 'approved', 'rejected', 'superseded')),
  CONSTRAINT "vr_vco_changes_something_ck" CHECK ("stored_value" <> "proposed_value"),
  CONSTRAINT "vr_vco_reason_ck" CHECK (length(btrim("reason")) >= 12),
  CONSTRAINT "vr_vco_source_ck" CHECK ("source_url" LIKE 'http%'),
  -- The shipped vocabulary of each correctable column, restated as a constraint so
  -- the database refuses a value the application layer somehow let through.
  CONSTRAINT "vr_vco_vocabulary_ck" CHECK (
    ("field" = 'position'
      AND "proposed_value" IN ('yea', 'nay', 'present', 'not_voting')
      AND "stored_value" IN ('yea', 'nay', 'present', 'not_voting'))
    OR
    ("field" = 'is_party'
      AND "proposed_value" IN ('with_party', 'against_party', '')
      AND "stored_value" IN ('with_party', 'against_party', ''))
  )
);
--> statement-breakpoint

-- One APPROVED correction per cell per field. Pending and rejected rows are
-- deliberately unconstrained: a cell may be proposed against more than once, and
-- the history of what was rejected is part of the audit trail.
CREATE UNIQUE INDEX IF NOT EXISTS "vr_vco_approved_unique"
  ON "vr_vote_correction_overlays" ("rollcall_id", "politician_id", "field")
  WHERE "status" = 'approved';
--> statement-breakpoint

-- The read path's lookup: every approved correction for a politician, in one hit.
CREATE INDEX IF NOT EXISTS "vr_vco_politician_idx"
  ON "vr_vote_correction_overlays" ("politician_id", "status");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "vr_vco_rollcall_idx"
  ON "vr_vote_correction_overlays" ("rollcall_id");
--> statement-breakpoint

-- The moderation queue's lookup.
CREATE INDEX IF NOT EXISTS "vr_vco_status_idx"
  ON "vr_vote_correction_overlays" ("status", "proposed_at");
