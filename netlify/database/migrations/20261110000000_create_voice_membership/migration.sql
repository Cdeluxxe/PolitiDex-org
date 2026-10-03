-- ─────────────────────────────────────────────────────────────────────────────
-- Membership lifts the daily cap — voice_membership
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. One table, voice_membership: one row per ACCOUNT recording
-- whether a $20 yearly Stripe subscription is active on it.
--
--   account_hash      sha256('member:' + uid), truncated — never the uid, and
--                     not the seat-scoped author hash voice_takes carries, so a
--                     membership row cannot be joined to a post or a vote
--   status            active | inactive, and the CHECK refuses a third
--   subscription_id   the Stripe subscription that last set the row, so a stale
--                     event for an older subscription cannot clear a newer one
--   current_period_end  when the paid year ends; a missed cancel still lapses
--   last_event_at     the Stripe event time that last moved the row; an older
--                     event arriving late is ignored
--
-- THREE DOORS, AND THIS IS ONLY THE THIRD. Sign-in is the account. Residency is
-- a vendor row in voice_residency for one exact seat. Membership is this table.
-- It names no seat, it is not read by the residency gate, and no code path turns
-- a row here into a voice_residency row — a member with no vendor row for a seat
-- is still refused on that seat. All this table can do is lift the one-comment /
-- one-vote-a-day cap on seats the account is already verified for.
--
-- ONLY THE SIGNED WEBHOOK WRITES IT (netlify/functions/membership-webhook.mts),
-- and only for STRIPE_PRICE_ID. No name, email, Stripe customer id, card,
-- amount or seat is stored, and no board endpoint reads this table.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261109000000_create_voice_poll_votes); the drizzle-generated stamp
-- (20261003154433) sorted behind it. The snapshot.json drizzle generated is
-- carried beside this file untouched. Every statement is guarded, so
-- re-applying is a no-op. It edits no applied migration and alters no table.

CREATE TABLE IF NOT EXISTS "voice_membership" (
	"id" serial PRIMARY KEY,
	"account_hash" text NOT NULL,
	"status" text NOT NULL,
	"subscription_id" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"last_event_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_membership_status_check" CHECK ("status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "voice_membership_account_unique" ON "voice_membership" ("account_hash");
