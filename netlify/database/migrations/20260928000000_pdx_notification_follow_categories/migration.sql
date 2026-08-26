-- ─────────────────────────────────────────────────────────────────────────────
-- Snapshot carrier for the four follow categories
-- ─────────────────────────────────────────────────────────────────────────────
-- THIS IS THE TWIN, NOT THE CHANGE. The four columns are introduced by the
-- hand-written 20260927000000_pdx_notification_follow_categories.sql, which is
-- where their reasoning lives and which is the file to read. This directory
-- exists for one mechanical reason: drizzle-kit builds the next migration by
-- diffing db/schema.ts against the NEWEST snapshot.json in this tree. A column
-- introduced by hand-written .sql alone never enters that chain, so the next
-- `generate` would look at schema.ts, not find follow_acts in the last snapshot,
-- and emit a second ALTER TABLE for four columns that already exist.
--
-- 20260925000000_create_vr_vote_correction_overlays.sql and its folder twin
-- 20260926000000_create_vr_vote_correction_overlays sit in this tree for exactly
-- the same reason, and 20260720053826_create_vr_measure_actions_and_provisions
-- before them. Same shape, same reason.
--
-- WHY THE VERSION IS HAND-PICKED. drizzle-kit stamps the wall clock, and this
-- repo's migrations run ahead of the calendar, so a generated stamp would sort
-- behind migrations already applied to the branch and the platform would reject
-- the deploy. 20260928000000 sorts after the .sql it follows.
--
-- WHY RE-STATING THE ALTERs IS SAFE. Every statement is ADD COLUMN IF NOT
-- EXISTS, so on any branch where 20260927000000 already applied this is a no-op,
-- and on a branch that somehow skipped it the columns arrive with the same type,
-- the same default and the same NOT NULL. Nothing is read, moved, defaulted from
-- another column or dropped. It cannot narrow a consent that was already given:
-- all four default TRUE, and topic_record still gates the whole group above them.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "pdx_notification_prefs"
  ADD COLUMN IF NOT EXISTS "follow_acts" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "pdx_notification_prefs"
  ADD COLUMN IF NOT EXISTS "follow_word" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "pdx_notification_prefs"
  ADD COLUMN IF NOT EXISTS "follow_corrections" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "pdx_notification_prefs"
  ADD COLUMN IF NOT EXISTS "follow_coverage" boolean DEFAULT true NOT NULL;
