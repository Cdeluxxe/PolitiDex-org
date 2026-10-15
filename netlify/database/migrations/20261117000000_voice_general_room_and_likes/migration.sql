-- ────────────────────────────────────────────────────────────────────────────
-- District Voice — the general room on every board, and likes on every comment
-- ────────────────────────────────────────────────────────────────────────────
-- THE GENERAL ROOM REUSES voice_takes. No new comment table: a general comment
-- is a voice_takes row with NO issue and a holder_pid — the roster's sitting
-- member for that seat when it was written (netlify/lib/seat-holders.mjs, read
-- by netlify/lib/general-room-core.mjs). The thread key is (seat_key,
-- holder_pid), so when the seat changes hands old rows stay under the old pid
-- and the new holder starts with none. An issue comment keeps its issue_key and
-- carries no pid: issue threads stay on the seat.
--
--   1. voice_takes.issue_key becomes nullable (the foreign key to dd_issue_keys
--      is unchanged and still refuses any key outside the vocabulary).
--   2. voice_takes.holder_pid, nullable text, pid-shaped.
--   3. A CHECK that every row is exactly one of the two: an issue comment
--      (issue_key set, no pid) or a general comment (pid set, no issue). Every
--      existing row is an issue comment, so the check holds on them as written.
--   4. An index for the one read the general room makes: one seat, one holder,
--      newest first.
--
-- LIKES ARE ONE SMALL NEW TABLE, voice_take_likes: one row per (comment, liker)
-- where the liker is the same anonymous seat-scoped hash voice_takes uses —
-- never a uid. The unique index makes a second like a no-op. Only counts leave
-- the server. Deleting a comment deletes its likes.
--
-- Additive and idempotent; no row is rewritten.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE "voice_takes" ALTER COLUMN "issue_key" DROP NOT NULL;
ALTER TABLE "voice_takes" ADD COLUMN IF NOT EXISTS "holder_pid" text;

ALTER TABLE "voice_takes" DROP CONSTRAINT IF EXISTS "voice_takes_room_check";
ALTER TABLE "voice_takes" ADD CONSTRAINT "voice_takes_room_check" CHECK (
	("issue_key" IS NOT NULL AND "holder_pid" IS NULL)
	OR ("issue_key" IS NULL AND "holder_pid" IS NOT NULL AND "holder_pid" ~ '^[a-z][a-z0-9_]*$')
);

CREATE INDEX IF NOT EXISTS "voice_takes_seat_holder_created_idx"
	ON "voice_takes" ("seat_key","holder_pid","created_at" DESC);

CREATE TABLE IF NOT EXISTS "voice_take_likes" (
	"id" serial PRIMARY KEY,
	"take_id" integer NOT NULL,
	"seat_key" text NOT NULL,
	"liker_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "voice_take_likes_take_liker_unique"
	ON "voice_take_likes" ("take_id","liker_hash");
CREATE INDEX IF NOT EXISTS "voice_take_likes_take_idx" ON "voice_take_likes" ("take_id");

DO $$ BEGIN
	ALTER TABLE "voice_take_likes" ADD CONSTRAINT "voice_take_likes_take_id_voice_takes_id_fkey"
		FOREIGN KEY ("take_id") REFERENCES "voice_takes"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
	ALTER TABLE "voice_take_likes" ADD CONSTRAINT "voice_take_likes_seat_key_dd_districts_fkey"
		FOREIGN KEY ("seat_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
