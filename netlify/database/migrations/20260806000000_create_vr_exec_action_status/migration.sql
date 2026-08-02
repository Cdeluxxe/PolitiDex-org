-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — Phase 1: the standing log (additive)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds ONE additive table. Seeds nothing: Phase 3 carries the data, and it will
-- arrive in its own roll-forward migration. Fully additive and idempotent
-- (CREATE TABLE IF NOT EXISTS + IF NOT EXISTS indexes), so re-applying is safe and
-- it never touches an existing table. Rolls forward from the applied voting-record
-- migrations; never edits one.
--
-- WHY THIS TABLE EXISTS
-- The Executive Enactment Record reports two independent facts about every action,
-- and refuses to collapse them into one word:
--   Axis A  Alignment — did the formal action match the stated position?
--   Axis B  Standing  — what happened to the action afterwards?
-- Axis B has no congressional counterpart. A roll call is over when the vote is
-- counted; an executive order can be signed, enjoined, and struck down, and a lane
-- that reports only "he signed it" is as misleading as one that reports only "the
-- court blocked it". The worked example is already in the app's curated data: the
-- IEEPA tariff orders were signed, and the Supreme Court held they exceeded
-- presidential authority (supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf).
--
-- WHY APPEND-ONLY RATHER THAN A STATUS COLUMN ON vr_positions
-- One row per status CHANGE, never an update in place. A mutable column would let
-- "signed Jan 2025 → enjoined Mar 2025 → struck down Feb 2026" be silently
-- overwritten down to its last value, losing both the history and the two earlier
-- citations. Kept as a log, the arrival sheet can render the timeline with all three
-- sources. Current standing = the latest row for a position by effective_at.
--
-- VERIFIABILITY: source_label and source_url are both NOT NULL, exactly like every
-- other vr_* record. "Struck down" without a citable ruling is not publishable — the
-- claim that an action was blocked is at least as consequential as the claim that it
-- was signed, so it carries the same burden of proof.

CREATE TABLE IF NOT EXISTS "vr_exec_action_status" (
  "id" serial PRIMARY KEY,
  -- The signing / issuance this status is about. vr_positions is already documented
  -- as "non-roll-call actions that still count as 'doing'", which is exactly what an
  -- executive action is — so the EER reuses it rather than forking a parallel table.
  "position_id" integer NOT NULL,
  -- in_force | partly_blocked | blocked | struck_down | rescinded | superseded | expired
  -- Validated against db/exec-summary-keys.json in the Function, the way issue keys
  -- are validated against db/issue-keys.json. Plain text, no CHECK constraint, so the
  -- vocabulary can be widened by a data change rather than a schema migration.
  "status" text NOT NULL,
  -- When the standing changed — the date of the injunction, the ruling, the
  -- rescission. Not the date the row was written.
  "effective_at" timestamp with time zone,
  -- WHO changed it: the court's name, or the signer for a self-rescission. Never
  -- "a court" — an unnamed authority is not a citation.
  "authority" text DEFAULT '' NOT NULL,
  -- VERIFIABILITY: both required. The Function refuses to emit a status without them.
  "source_label" text NOT NULL,
  "source_url" text NOT NULL,
  -- One-line plain-language description of what happened, shown on the timeline.
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- Named explicitly rather than left to Postgres, so the constraint name matches the
  -- one drizzle records in snapshot.json for this migration. An inline unnamed
  -- REFERENCES would be created as vr_exec_action_status_position_id_fkey and the next
  -- drizzle-kit diff would see a constraint it did not recognise.
  CONSTRAINT "vr_exec_action_status_position_id_vr_positions_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "vr_positions"("id") ON DELETE CASCADE
);
--> statement-breakpoint
-- Current standing is read per action, for every action in a summary. Without this
-- index that resolution is a scan per action; with it, the latest row is a lookup.
-- Column order (position_id, effective_at) ASC matches db/schema.ts and the snapshot.
-- ASC is deliberate and costs nothing here: Postgres scans a btree backwards just as
-- cheaply, so "latest row per position" is still an index lookup rather than a scan.
CREATE INDEX IF NOT EXISTS "vr_exec_action_status_position_idx"
  ON "vr_exec_action_status" ("position_id", "effective_at");
--> statement-breakpoint
-- Supports the aggregate read behind the count summary's Axis B buckets.
CREATE INDEX IF NOT EXISTS "vr_exec_action_status_status_idx"
  ON "vr_exec_action_status" ("status");
