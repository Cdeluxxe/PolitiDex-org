-- ─────────────────────────────────────────────────────────────────────────────
-- pdx_notification_prefs — four follow categories for record events
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS IS FOR. 20260924000000 added `topic_record`: one switch for "tell me
-- when the record on my people and issues changes". It works, and it is too
-- coarse. The record group emits materially different things — a roll-call vote,
-- a sourced statement, a citation we repaired, a measure we did not previously
-- hold — and a single switch forces a reader to accept all four or none. Someone
-- who wants to know when a tracked member CASTS A VOTE was also being paid in
-- notices that we fixed a bill title.
--
-- So the record group is now followable by CATEGORY:
--
--   follow_acts         roll-call votes, sponsorships and co-sponsorships,
--                       committee actions, and a measure moving a stage.
--                       What was DONE. (kinds: vote, position, action)
--   follow_word         a newly sourced on-record statement by a tracked person.
--                       What was SAID. (kind: stated)
--   follow_corrections  a measure we already held had a citation, title or issue
--                       mapping fixed. Us correcting ourselves. (kind: mapping)
--   follow_coverage     a measure on a followed issue was added to the archive.
--                       The archive announcing that it grew. (kind: coverage)
--
-- The kind → category mapping lives in exactly one place in the code
-- (EVENT_CATEGORY in netlify/lib/digest-record-core.mjs) and these four columns
-- are its persistence, so a checkbox and an email subhead cannot drift apart.
--
-- WHY ALL FOUR DEFAULT TRUE, and why that is not laziness. Every existing row
-- belongs to someone who already opted into record updates under the old single
-- switch. Defaulting any category to FALSE would silently narrow consent that was
-- already given — the user would keep seeing the same "Record updates: on" and
-- quietly stop receiving votes. These columns may only ever REMOVE kinds a reader
-- explicitly declined. They can never add a kind nobody asked for, because
-- `topic_record` still gates the whole group above them.
--
-- WHAT THESE COLUMNS ARE NOT. Not a volume cap, not a "highlights only" mode, not
-- a digest-worthiness threshold, and there will not be one. Any of those would
-- drop real, sourced formal acts that we told the reader we would send, chosen by
-- us for interestingness — which is the mechanic this digest was built to avoid.
-- The honest lever is WHICH KINDS OF CHANGE matter to you. The dishonest lever is
-- a cap.
--
-- ADDITIVE AND IDEMPOTENT. Four ADD COLUMN IF NOT EXISTS statements on one
-- existing table. No data is read, moved, defaulted from another column or
-- deleted; no existing column, constraint or index is touched; nothing here
-- depends on a prior migration having run in any particular order beyond
-- pdx_notification_prefs existing. Re-running it is a no-op, so a partially
-- applied deploy converges rather than failing.
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
