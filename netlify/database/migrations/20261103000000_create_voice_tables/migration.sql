-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRICT VOICE, slice 1 — the belonging layer's own five tables
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. Five tables, voice_*, standing up ONE place per Utah seat where
-- a verified neighbour answers one poll and posts one short take:
--
--   voice_polls          one active poll per seat, tied to ONE issue key
--   voice_poll_options   that poll's two-to-four options
--   voice_poll_answers   one answer per person per poll — an upsert, not a row
--   voice_takes          one person's sentence, keyed to an ISSUE_MAP key
--   voice_residency      the verified-residency flag the write gate reads
--
-- WHY NEW TABLES RATHER THAN THE dd_* ONES. The District Room's tables were the
-- first thing checked, and three of their shapes are wrong for a take:
--
--   · dd_posts hangs off a dd_threads row, which is (district, issue). A take is
--     keyed to a seat and CARRIES an issue key, so the seat's feed is one list
--     across issues — not one list per issue. Reusing dd_posts would have meant
--     reading twenty threads to paint twenty takes.
--   · dd_posts.body has no length ceiling and stores the raw uid. A take is
--     280 characters and stores an AUTHOR HASH and nothing else (see below).
--   · dd_poll_votes has no poll row and no option rows at all: its question is
--     fixed copy and its three poles are constants. Slice 1's poll has a stored
--     question and two-to-four stored options, so it needs rows to be two of.
--
-- Nothing here alters, drops or reads a dd_* table. The District Room keeps its
-- own gate, its own residency rule and its own poll, and neither surface can
-- change the other's answer.
--
-- THE WALLS, AS SCHEMA. There is no party column, no score column, no upvote,
-- no reaction, no reply parent, no rank and no weight — not defaulted off,
-- ABSENT, because a column that counts is a column something eventually ranks.
-- There is no percentage column and no stored total either: the poll publishes
-- integers grouped at read time. And there is no composite anywhere: no table
-- below can express a "district mood" number, because there is nothing to
-- average and no column to keep an average in.
--
-- NOTHING HERE IS A FORMAL ACT. No pid, no measure id, no roll call, no
-- citation, no stance, no finance row and no direction. Voice never writes the
-- formal record (vr_*), the evidence exchange (cee_*), the open forum (pdx_*),
-- Direction Match, Word vs Action, the finance lane or a baseline-from-record —
-- and it cannot, because it holds no foreign key into any of them. The only two
-- vocabularies it borrows are the two the app already agrees on, and it borrows
-- them as FOREIGN KEYS so a seat or an issue this app does not ship cannot have
-- a poll, a take or a resident:
--
--   voice_*.seat_key  → dd_districts.district_id   ('ut-statehouse-68')
--   voice_*.issue_key → dd_issue_keys.issue_key    (the shipped ISSUE_MAP key)
--
-- AN AUTHOR HASH, NOT A UID. Every person-shaped column below is `author_hash`:
-- sha256(uid + ':' + seat_key), truncated. It is stable for one person in one
-- seat — which is all "one answer per person" and "act on a report" need — and
-- it is not the same value for that person in the next seat, so two seats' rows
-- cannot be joined into one profile. The verified Firebase uid is never stored
-- in these tables and never leaves the Function. There is no name, no email, no
-- address, no zip, no coordinate and no document anywhere in this pass.
--
-- WHY THE VERSION WAS HAND-SET. `drizzle-kit generate` stamps the wall clock and
-- this repo's hand-versioned migrations run ahead of the calendar, so a generated
-- stamp would sort BEHIND migrations already applied and land mid-tree, which the
-- platform rejects. 20261103000000 is one version after the current applied tail
-- (20261102000000_vr_utah_exec_e1_signed_vetoed.sql), so it lands at the END of
-- the tree. It edits no applied migration and alters no existing table.
--
-- The generated stamp for this pass was 20260910040405, which is a calendar date
-- five months BEHIND the applied tail — it failed the deploy outright, which is
-- why the version is hand-set here and why there is no second migration beside
-- this one. This is a DIRECTORY rather than a bare .sql for the same reason the
-- dd_* migrations are: the snapshot.json drizzle generated is carried beside this
-- file UNTOUCHED, so it is this pass's snapshot rather than a discarded one, and
-- the next `drizzle-kit generate` diffs against a schema that already holds the
-- five voice_* tables instead of proposing to create them a second time. (Like
-- every other snapshot in this tree it carries an id and no prevId; there is no
-- central journal, so the file order IS the chain.) The SQL itself is hand-written — it is a superset of the generated DDL, adding the
-- partial unique index that makes "one active poll per seat" a schema fact and
-- the composite foreign key that makes an answer name a real option.
--
-- WHY EVERY STATEMENT IS GUARDED. Each CREATE is IF NOT EXISTS and each foreign
-- key is added inside a DO block that swallows duplicate_object, so re-applying
-- this file is a no-op rather than an error.

-- ── THE POLL ────────────────────────────────────────────────────────────────
-- ONE ACTIVE POLL PER SEAT, and that is an index rather than a promise: the
-- partial unique index below refuses a second row with active = true for a seat.
-- A poll retires by having active set false, which keeps its answers readable
-- and still leaves room for exactly one live successor.
--
-- TIED TO ONE ISSUE KEY. issue_key is NOT NULL and a foreign key, so a poll is
-- always about something the app already ships an issue file for — which is also
-- what lets the district file's "This week" strip ask the formal record for the
-- member's latest act on that same key.
CREATE TABLE IF NOT EXISTS "voice_polls" (
	"id" serial PRIMARY KEY,
	"seat_key" text NOT NULL,
	"issue_key" text NOT NULL,
	"question" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_polls_question_len_check" CHECK (char_length("question") between 1 and 200)
);
--> statement-breakpoint
-- ── THE OPTIONS ─────────────────────────────────────────────────────────────
-- TWO TO FOUR, ISSUE-SIDED OR PLAIN YES/NO. The count is enforced by the write
-- path and by the seed rather than by a CHECK, because a row constraint cannot
-- count its siblings; what the schema DOES enforce is that an answer can only
-- ever name an option that exists, via the composite foreign key on
-- voice_poll_answers below.
--
-- NEVER CANDIDATE NAMES AS THE ONLY AXIS. There is no pid column here and no
-- party column, so an option is a side of an issue and cannot be a person.
CREATE TABLE IF NOT EXISTS "voice_poll_options" (
	"id" serial PRIMARY KEY,
	"poll_id" integer NOT NULL,
	"option_key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "voice_poll_options_key_shape_check" CHECK ("option_key" ~ '^[a-z0-9_]+$'),
	CONSTRAINT "voice_poll_options_label_len_check" CHECK (char_length("label") between 1 and 60)
);
--> statement-breakpoint
-- ── THE ANSWERS ─────────────────────────────────────────────────────────────
-- ONE ANSWER PER PERSON PER POLL. The unique index on (poll_id, author_hash) is
-- what turns "changing your mind" into an update instead of a second row, so a
-- count can never double-count anybody. There is no delete path.
--
-- COUNTS ONLY. No percentage column, no weight, no stored total: the results are
-- one integer per option, grouped at read time.
CREATE TABLE IF NOT EXISTS "voice_poll_answers" (
	"id" serial PRIMARY KEY,
	"poll_id" integer NOT NULL,
	"option_key" text NOT NULL,
	"author_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ── THE TAKES ───────────────────────────────────────────────────────────────
-- { seat_key, issue_key, body <= 280, created_at, author_hash } and nothing else.
-- The 280 ceiling is a CHECK rather than a client rule, so a body that got past
-- a caller still cannot land. No party field, no upvote, no reply parent — slice
-- 1 has no thread, and the schema cannot express one.
CREATE TABLE IF NOT EXISTS "voice_takes" (
	"id" serial PRIMARY KEY,
	"seat_key" text NOT NULL,
	"issue_key" text NOT NULL,
	"body" text NOT NULL,
	"author_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_takes_body_len_check" CHECK (char_length("body") between 1 and 280)
);
--> statement-breakpoint
-- ── THE RESIDENCY FLAG ──────────────────────────────────────────────────────
-- The one fact the write gate reads. One row per (person, seat).
--
--   status  pending | verified | revoked
--   method  location_match | vendor
--
-- `location_match` is slice 1: a signed-in reader whose saved ballot location
-- names a county the app maps AND a house district that county actually contains,
-- and where that pair resolves to THIS seat. It is a consistency check on the
-- reader's own datum, not an identity check, and the Function re-runs it on every
-- write — so a row alone never grants anything and changing the saved location
-- closes the composer immediately.
--
-- `vendor` is the reserved value for the ID check that is NOT wired in this pass.
-- No Stripe Identity call, no Veriff call, no upload, no charge and no third-party
-- round trip exists anywhere in this repo. The seam is window.PDXVoice.verify()
-- on the client and verifyVendor() in netlify/lib/district-voice-core.mjs, and
-- nothing writes this method today.
--
-- UTAH ONLY IN THIS PASS, enforced by the dd_districts foreign key plus a state
-- check in the core: dd_districts holds ut- rows only, because
-- pdxRepsForMe().districtsResolvable is true in Utah and nowhere else, and
-- verifying somebody for a district the app cannot resolve is the confident wrong
-- district DISTRICT_MAPS.md forbids.
CREATE TABLE IF NOT EXISTS "voice_residency" (
	"id" serial PRIMARY KEY,
	"seat_key" text NOT NULL,
	"author_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "voice_residency_status_check" CHECK ("status" in ('pending', 'verified', 'revoked')),
	CONSTRAINT "voice_residency_method_check" CHECK ("method" in ('location_match', 'vendor'))
);
--> statement-breakpoint

-- ── INDEXES ─────────────────────────────────────────────────────────────────
-- ONE ACTIVE POLL PER SEAT. Partial and unique: a seat may keep any number of
-- retired polls and can never have two live ones.
CREATE UNIQUE INDEX IF NOT EXISTS "voice_polls_one_active_per_seat"
	ON "voice_polls" ("seat_key") WHERE "active";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_polls_seat_idx" ON "voice_polls" ("seat_key");
--> statement-breakpoint
-- The composite an answer's foreign key points at, and the read that paints the
-- option list in order.
CREATE UNIQUE INDEX IF NOT EXISTS "voice_poll_options_poll_key_unique"
	ON "voice_poll_options" ("poll_id","option_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_poll_options_poll_order_idx"
	ON "voice_poll_options" ("poll_id","sort_order");
--> statement-breakpoint
-- ONE ANSWER PER PERSON PER POLL. The upsert in netlify/functions/district-voice.mts
-- targets exactly this index.
CREATE UNIQUE INDEX IF NOT EXISTS "voice_poll_answers_poll_author_unique"
	ON "voice_poll_answers" ("poll_id","author_hash");
--> statement-breakpoint
-- The read: one integer per option for one poll, and nothing wider.
CREATE INDEX IF NOT EXISTS "voice_poll_answers_poll_option_idx"
	ON "voice_poll_answers" ("poll_id","option_key");
--> statement-breakpoint
-- The takes read: one seat, NEWEST FIRST, capped at twenty. That is the only
-- order this table is ever asked for — there is no column any other order could
-- be built from.
CREATE INDEX IF NOT EXISTS "voice_takes_seat_created_idx"
	ON "voice_takes" ("seat_key","created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_takes_seat_issue_idx" ON "voice_takes" ("seat_key","issue_key");
--> statement-breakpoint
-- One row per person per seat, and the count of verified neighbours the file
-- prints instead of a fake feed.
CREATE UNIQUE INDEX IF NOT EXISTS "voice_residency_seat_author_unique"
	ON "voice_residency" ("seat_key","author_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_residency_seat_status_idx"
	ON "voice_residency" ("seat_key","status");
--> statement-breakpoint

-- ── FOREIGN KEYS ────────────────────────────────────────────────────────────
-- Both borrowed vocabularies, on every table that names one. RESTRICT rather
-- than CASCADE on the shared vocabulary tables: a seat or an issue key with
-- Voice rows behind it must not be removable by accident.
DO $$ BEGIN
	ALTER TABLE "voice_polls" ADD CONSTRAINT "voice_polls_seat_key_dd_districts_fkey"
		FOREIGN KEY ("seat_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_polls" ADD CONSTRAINT "voice_polls_issue_key_dd_issue_keys_fkey"
		FOREIGN KEY ("issue_key") REFERENCES "dd_issue_keys"("issue_key") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_poll_options" ADD CONSTRAINT "voice_poll_options_poll_id_fkey"
		FOREIGN KEY ("poll_id") REFERENCES "voice_polls"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_poll_answers" ADD CONSTRAINT "voice_poll_answers_poll_id_fkey"
		FOREIGN KEY ("poll_id") REFERENCES "voice_polls"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- AN ANSWER CANNOT NAME AN OPTION THAT DOES NOT EXIST. This is the composite the
-- unique index above was created for, and it is why the two-to-four rule needs no
-- CHECK to stay honest: whatever options a poll has, an answer is one of them.
DO $$ BEGIN
	ALTER TABLE "voice_poll_answers" ADD CONSTRAINT "voice_poll_answers_option_fkey"
		FOREIGN KEY ("poll_id","option_key")
		REFERENCES "voice_poll_options"("poll_id","option_key") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_takes" ADD CONSTRAINT "voice_takes_seat_key_dd_districts_fkey"
		FOREIGN KEY ("seat_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- THE ISSUE KEY MUST EXIST. A take with an unknown key is refused by the core's
-- gate, by the vocabulary read in the Function, and finally by this constraint —
-- three refusals, the last of which no code path can forget.
DO $$ BEGIN
	ALTER TABLE "voice_takes" ADD CONSTRAINT "voice_takes_issue_key_dd_issue_keys_fkey"
		FOREIGN KEY ("issue_key") REFERENCES "dd_issue_keys"("issue_key") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "voice_residency" ADD CONSTRAINT "voice_residency_seat_key_dd_districts_fkey"
		FOREIGN KEY ("seat_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
