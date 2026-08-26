-- ─────────────────────────────────────────────────────────────────────────────
-- vr_vote_correction_overlays — the drizzle snapshot carrier for the overlay table
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS IS. The authoritative DDL for this table is the hand-written migration
-- one version earlier, 20260925000000_create_vr_vote_correction_overlays.sql, which
-- carries the CHECK constraints and the PARTIAL unique index that express the
-- fail-closed rules — a vocabulary constraint per correctable column, a
-- stored_value <> proposed_value guard, and one APPROVED correction per cell while
-- the history of what was proposed and rejected stays unconstrained. None of that
-- is expressible in db/schema.ts, so none of it can come out of `drizzle-kit
-- generate`; it has to be written by hand.
--
-- WHY THIS DIRECTORY EXISTS ANYWAY. Drizzle diffs the newest snapshot in this tree
-- to build the next migration, so the snapshot has to travel with the SQL. If the
-- table were introduced by a bare .sql alone, the chain would never learn it exists
-- and the very next `generate` would emit a second CREATE TABLE for it. That is the
-- same reason 20260720053826_create_vr_measure_actions_and_provisions sits beside
-- 20260721000000_create_vr_measure_actions_provisions.sql: the directory keeps the
-- chain honest, the hand-written file carries the rules.
--
-- WHY THE VERSION WAS RE-PICKED. `drizzle-kit generate` stamps the wall clock, and
-- this repo's hand-versioned migrations run ahead of the calendar — so the generated
-- stamp (20260826053355) sorted BEHIND migrations already applied to the branch and
-- the platform rejected the deploy, correctly. The version is therefore chosen, not
-- inherited: 20260926000000 sorts after every migration in the tree, and after the
-- hand-written file it follows. The generated snapshot.json is untouched, and its
-- prevIds still name the snapshot of the applied migration it was diffed against.
--
-- WHY EVERY STATEMENT IS GUARDED. This runs immediately after the hand-written
-- migration, on a database where the table, its indexes and its foreign key already
-- exist. Generated SQL is unguarded, which would abort the deploy on the first
-- duplicate object. Each statement below is therefore idempotent, so this migration
-- converges to the same shape whether or not the file before it did the work — and
-- re-applying it is a no-op rather than an error.
--
-- WHAT IT DOES NOT DO. It adds nothing the hand-written migration did not already
-- add, and it relaxes nothing the hand-written migration constrained: no CHECK is
-- dropped here, no vocabulary widened, no unique index loosened. It is additive and
-- append-only, it edits no applied migration, and it touches no data.

CREATE TABLE IF NOT EXISTS "vr_vote_correction_overlays" (
	"id" serial PRIMARY KEY,
	"rollcall_id" integer NOT NULL,
	"politician_id" text NOT NULL,
	"field" text NOT NULL,
	"stored_value" text NOT NULL,
	"proposed_value" text NOT NULL,
	"chamber" text,
	"congress" integer,
	"session" integer,
	"roll_number" integer,
	"reason" text NOT NULL,
	"source_url" text NOT NULL,
	"source_label" text DEFAULT '',
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_by_label" text DEFAULT '',
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_by_label" text DEFAULT '',
	"reviewed_at" timestamp with time zone,
	"review_note" text DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_vco_politician_idx" ON "vr_vote_correction_overlays" ("politician_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_vco_rollcall_idx" ON "vr_vote_correction_overlays" ("rollcall_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_vco_status_idx" ON "vr_vote_correction_overlays" ("status","proposed_at");--> statement-breakpoint
-- The hand-written migration declares this foreign key inline, so PostgreSQL names
-- it vr_vote_correction_overlays_rollcall_id_fkey while drizzle would name it after
-- both sides of the reference. Adding it a second time under a different name would
-- leave two identical constraints on one column, so the guard asks whether the
-- COLUMN is already covered rather than whether drizzle's chosen name is taken.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY (c.conkey)
     WHERE c.conrelid = '"vr_vote_correction_overlays"'::regclass
       AND c.contype = 'f'
       AND a.attname = 'rollcall_id'
  ) THEN
    ALTER TABLE "vr_vote_correction_overlays"
      ADD CONSTRAINT "vr_vote_correction_overlays_rollcall_id_vr_rollcalls_id_fkey"
      FOREIGN KEY ("rollcall_id") REFERENCES "vr_rollcalls"("id") ON DELETE CASCADE;
  END IF;
END $$;
