-- ─────────────────────────────────────────────────────────────────────────────
-- THE DISTRICT ROOM'S ONE POLL, phase 3 — one answer per person per room
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. One table, dd_poll_votes: one row per (district, issue, person)
-- recording where that person stands on the room's ONE structured question.
--
--   district_key  a district the app already maps (FK to dd_districts)
--   issue_key     an issue the app already ships   (FK to dd_issue_keys)
--   user_id       the verified Firebase uid, spelled as dd_posts.user_id spells it
--   choice        support | oppose | mixed, and the CHECK refuses a fourth
--   created_at    when they first answered
--   updated_at    when they last changed their mind — an overwrite, not a row
--
-- WHY THERE IS NO `dd_polls` TABLE. A poll in a room has no content of its own:
-- the question is FIXED COPY (COPY.pollQuestion in netlify/lib/district-room-
-- core.mjs) and the options are the three FIXED poles Support / Oppose / Mixed,
-- the same poles My Stances already spends. A dd_polls row would therefore carry
-- nothing but the (district, issue) pair the room is already named by — and it
-- would be a row somebody could insert a SECOND of. So the poll is not a row: it
-- IS the room. "Exactly one poll per (district, issue)" is not a rule a code path
-- remembers to enforce here; it is a thing this schema cannot express otherwise,
-- because there is no poll identifier anywhere in it to have two of, and no
-- question or option column for a second one to differ in.
--
-- ONE VOTE PER PERSON, AND CHANGING IT OVERWRITES. That is what the unique index
-- on (district_key, issue_key, user_id) is for. The Function's only write is an
-- upsert targeting exactly that index, so a second answer REPLACES the first and
-- can never double-count. There is no delete path and no second row to reconcile.
--
-- COUNTS ONLY. There is no percentage column, no weight, no score and no stored
-- total: the results are three integers grouped at read time and printed as
-- "N support · N oppose · N mixed". Nothing joins this table to dd_posts, so a
-- post is never promoted, ranked or reordered by an answer — and no answer is
-- ever inferred from post text, because a comment is not a vote.
--
-- NOT A PROFILE, AND NOT A PERSON FILE. No name, no email, no address, no zip, no
-- coordinate, no pid and no party. Nothing here is read by the formal record
-- (vr_*), the evidence exchange (cee_*), the open forum (pdx_*), Direction Match,
-- Word vs Action, the finance lane, the Eye, the Utah ingest or the offline pack,
-- and no number from it reaches a person file.
--
-- WHY THE VERSION WAS HAND-SET. `drizzle-kit generate` stamps the wall clock and
-- this repo's hand-versioned migrations run ahead of the calendar — the generated
-- stamp for this pass was 20260907225819, which sorts BEHIND migrations already
-- applied and would be rejected on deploy. 20261031000000 is one version after the
-- current applied tail (20261030000000_create_dd_residency), so it lands at the
-- END of the tree and never mid-tree. The generated snapshot.json is untouched and
-- its prevIds still names the snapshot this migration was diffed against, so the
-- drizzle chain stays honest.
--
-- WHY EVERY STATEMENT IS GUARDED. Each CREATE is IF NOT EXISTS and each foreign
-- key is added inside a DO block that swallows duplicate_object, so re-applying
-- this file is a no-op rather than an error. It edits no applied migration, alters
-- no existing table and deletes nothing.

CREATE TABLE IF NOT EXISTS "dd_poll_votes" (
	"id" serial PRIMARY KEY,
	"district_key" text NOT NULL,
	"issue_key" text NOT NULL,
	"user_id" text NOT NULL,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dd_poll_votes_choice_check" CHECK ("choice" in ('support', 'oppose', 'mixed'))
);
--> statement-breakpoint
-- ONE ANSWER PER PERSON PER ROOM. The upsert in netlify/functions/district-room.mts
-- targets exactly this index, which is what turns "changing your vote" into an
-- update rather than a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "dd_poll_votes_room_user_unique" ON "dd_poll_votes" ("district_key","issue_key","user_id");
--> statement-breakpoint
-- The read: three grouped counts for one room, and nothing wider.
CREATE INDEX IF NOT EXISTS "dd_poll_votes_room_choice_idx" ON "dd_poll_votes" ("district_key","issue_key","choice");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_poll_votes" ADD CONSTRAINT "dd_poll_votes_district_key_dd_districts_district_id_fkey" FOREIGN KEY ("district_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_poll_votes" ADD CONSTRAINT "dd_poll_votes_issue_key_dd_issue_keys_issue_key_fkey" FOREIGN KEY ("issue_key") REFERENCES "dd_issue_keys"("issue_key") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
