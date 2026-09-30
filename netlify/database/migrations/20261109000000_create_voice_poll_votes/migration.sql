-- ─────────────────────────────────────────────────────────────────────────────
-- District Voice poll on the Layton composer boards — voice_poll_votes
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. One table, voice_poll_votes: one row per (seat, issue, person)
-- recording where that person stands on "this issue, on this seat":
--
--   seat_key     a seat the app already maps          (FK to dd_districts)
--   issue_key    an issue the app already ships       (FK to dd_issue_keys)
--   author_hash  sha256(uid + ':' + seat_key), truncated — the same seat-scoped
--                hash voice_takes carries, never the uid
--   choice       support | oppose | not_sure, and the CHECK refuses a fourth
--
-- And TWO dd_districts rows the vocabulary was missing: ut-statehouse-16 and
-- ut-statesenate-7. Both are composer seats (/district/ut-hd-16, ut-sd-7), and
-- without their rows every voice_takes insert — and every vote below — for those
-- two boards would be refused by the seat foreign key. They are inserted ON
-- CONFLICT DO NOTHING, so a branch that already has them is untouched.
--
-- WHY NOT voice_polls / voice_poll_answers. voice_polls carries a partial unique
-- index that allows ONE active poll per seat; this surface is one poll per ISSUE
-- per seat, and minting a voice_polls row per issue would break that index's
-- promise. WHY NOT dd_poll_votes: it stores the raw Firebase uid, its third pole
-- is 'mixed' rather than "not sure", and it is the District Room's store behind
-- the District Room's gate — sharing it would let one surface change the other's
-- answer. Like dd_poll_votes, there is no poll row: the question is fixed copy
-- and the options are three fixed constants, so the (seat, issue) pair IS the
-- poll and a second poll for the same pair cannot be expressed.
--
-- ONE VOTE PER PERSON PER (SEAT, ISSUE). The unique index is what the Function's
-- only write — an upsert — targets, so changing a vote overwrites it and can
-- never double-count. There is no delete path.
--
-- COUNTS ONLY. No percentage, weight, score or stored total. The public read is
-- three integers per issue, grouped at read time. No name, email, address, zip,
-- pid or party column exists here.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261108000000_vr_exec_dcpd_publication_standing.sql), so it lands at the end
-- of the tree. It edits no applied migration and alters no existing table. Every
-- statement is guarded, so re-applying is a no-op. The drizzle-generated stamp
-- for this pass (20260930033319) sorted BEHIND the applied tail and failed the
-- deploy; its snapshot.json is carried beside this file untouched, so the next
-- `drizzle-kit generate` diffs against a schema that already holds
-- voice_poll_votes, and the foreign-key names below are drizzle's own.

INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('ut-statehouse-16', 'UT', 'statehouse', 16, 'Utah State House District 16'),
	('ut-statesenate-7', 'UT', 'statesenate', 7, 'Utah State Senate District 7')
ON CONFLICT ("district_id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_poll_votes" (
	"id" serial PRIMARY KEY,
	"seat_key" text NOT NULL,
	"issue_key" text NOT NULL,
	"author_hash" text NOT NULL,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_poll_votes_choice_check" CHECK ("choice" in ('support', 'oppose', 'not_sure'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "voice_poll_votes_seat_issue_author_unique"
	ON "voice_poll_votes" ("seat_key","issue_key","author_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_poll_votes_seat_issue_choice_idx"
	ON "voice_poll_votes" ("seat_key","issue_key","choice");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_poll_votes" ADD CONSTRAINT "voice_poll_votes_seat_key_dd_districts_district_id_fkey"
		FOREIGN KEY ("seat_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_poll_votes" ADD CONSTRAINT "voice_poll_votes_issue_key_dd_issue_keys_issue_key_fkey"
		FOREIGN KEY ("issue_key") REFERENCES "dd_issue_keys"("issue_key") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
