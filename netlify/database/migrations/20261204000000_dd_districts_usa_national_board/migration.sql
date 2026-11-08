-- ────────────────────────────────────────────────────────────────────────────
-- dd_districts — the one national board, /usa ("USA Voice")
-- ────────────────────────────────────────────────────────────────────────────
-- WHY. voice_residency, voice_takes, voice_take_likes and voice_poll_votes each
-- carry a foreign key on seat_key → dd_districts.district_id, so the national
-- board needs one row to land a Didit decision, a comment, a like or a vote.
--
-- WHAT IT CHANGES. The seat-key check also admits 'national', and the number
-- check admits 0 for it, as it already does for 'gov' and 'us-senate'. Then ONE
-- row: ('usa', 'US', 'national', 0, 'USA Voice'). Every existing row and every
-- district rule is untouched. ON CONFLICT DO NOTHING.
--
-- It writes no residency, take, like or vote. Only the signed Didit webhook
-- writes method = 'vendor'. No applied migration is edited.
ALTER TABLE "dd_districts" DROP CONSTRAINT IF EXISTS "dd_districts_seat_key_check";
--> statement-breakpoint
ALTER TABLE "dd_districts" ADD CONSTRAINT "dd_districts_seat_key_check"
	CHECK ("seat_key" in ('house', 'statesenate', 'statehouse', 'gov', 'us-senate', 'national'));
--> statement-breakpoint
ALTER TABLE "dd_districts" DROP CONSTRAINT IF EXISTS "dd_districts_number_check";
--> statement-breakpoint
ALTER TABLE "dd_districts" ADD CONSTRAINT "dd_districts_number_check"
	CHECK ("district_number" > 0 OR ("seat_key" in ('gov', 'us-senate', 'national') AND "district_number" = 0));
--> statement-breakpoint
INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('usa', 'US', 'national', 0, 'USA Voice')
ON CONFLICT ("district_id") DO NOTHING;
