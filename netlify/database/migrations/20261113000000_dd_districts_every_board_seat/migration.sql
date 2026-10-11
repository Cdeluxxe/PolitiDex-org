-- ────────────────────────────────────────────────────────────────────────────
-- dd_districts — one row for every seat that has a district board
-- ────────────────────────────────────────────────────────────────────────────
-- WHY. voice_residency, voice_takes and voice_poll_votes each carry a foreign
-- key on seat_key → dd_districts.district_id. The composer and the poll now open
-- on every board (the 79 generated district boards, SD-6, and the three
-- statewide boards), but dd_districts held only the seats earlier slices seeded.
-- Without a row, a signed Didit decision, a comment or a vote on one of the
-- other boards would fail at the foreign key instead of landing.
--
-- WHAT IT CHANGES.
--   1. dd_districts_seat_key_check also admits 'gov' and 'us-senate', so the
--      statewide boards (ut-gov, ut-us-senate-<pid>) can be rows. Their
--      district_id is the board key the board functions already use.
--   2. dd_districts_number_check admits 0 for those two classes only. A
--      district seat still needs a number above zero.
--   3. One row per board seat, ON CONFLICT DO NOTHING: rows that already exist
--      keep their labels and nothing is overwritten.
--
-- It writes no residency, take or vote. Opening a seat to the gate is not a
-- verification; only the signed Didit webhook writes method = 'vendor'.
-- No applied migration is edited.
ALTER TABLE "dd_districts" DROP CONSTRAINT IF EXISTS "dd_districts_seat_key_check";
--> statement-breakpoint
ALTER TABLE "dd_districts" ADD CONSTRAINT "dd_districts_seat_key_check"
	CHECK ("seat_key" in ('house', 'statesenate', 'statehouse', 'gov', 'us-senate'));
--> statement-breakpoint
ALTER TABLE "dd_districts" DROP CONSTRAINT IF EXISTS "dd_districts_number_check";
--> statement-breakpoint
ALTER TABLE "dd_districts" ADD CONSTRAINT "dd_districts_number_check"
	CHECK ("district_number" > 0 OR ("seat_key" in ('gov', 'us-senate') AND "district_number" = 0));
--> statement-breakpoint
INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('ut-statesenate-3', 'UT', 'statesenate', 3, 'Utah State Senate District 3'),
	('ut-statehouse-16', 'UT', 'statehouse', 16, 'Utah State House District 16'),
	('ut-statesenate-7', 'UT', 'statesenate', 7, 'Utah State Senate District 7'),
	('ut-house-2', 'UT', 'house', 2, 'Utah · U.S. House District 2'),
	('ut-statehouse-15', 'UT', 'statehouse', 15, 'Utah State House District 15'),
	('ut-statesenate-6', 'UT', 'statesenate', 6, 'Utah State Senate District 6'),
	('ut-statehouse-4', 'UT', 'statehouse', 4, 'Utah State House District 4'),
	('ut-statehouse-5', 'UT', 'statehouse', 5, 'Utah State House District 5'),
	('ut-statehouse-6', 'UT', 'statehouse', 6, 'Utah State House District 6'),
	('ut-statehouse-9', 'UT', 'statehouse', 9, 'Utah State House District 9'),
	('ut-statehouse-10', 'UT', 'statehouse', 10, 'Utah State House District 10'),
	('ut-statehouse-11', 'UT', 'statehouse', 11, 'Utah State House District 11'),
	('ut-statehouse-12', 'UT', 'statehouse', 12, 'Utah State House District 12'),
	('ut-statehouse-14', 'UT', 'statehouse', 14, 'Utah State House District 14'),
	('ut-statehouse-19', 'UT', 'statehouse', 19, 'Utah State House District 19'),
	('ut-statehouse-21', 'UT', 'statehouse', 21, 'Utah State House District 21'),
	('ut-statehouse-22', 'UT', 'statehouse', 22, 'Utah State House District 22'),
	('ut-statehouse-23', 'UT', 'statehouse', 23, 'Utah State House District 23'),
	('ut-statehouse-24', 'UT', 'statehouse', 24, 'Utah State House District 24'),
	('ut-statehouse-25', 'UT', 'statehouse', 25, 'Utah State House District 25'),
	('ut-statehouse-28', 'UT', 'statehouse', 28, 'Utah State House District 28'),
	('ut-statehouse-29', 'UT', 'statehouse', 29, 'Utah State House District 29'),
	('ut-statehouse-30', 'UT', 'statehouse', 30, 'Utah State House District 30'),
	('ut-statehouse-31', 'UT', 'statehouse', 31, 'Utah State House District 31'),
	('ut-statehouse-33', 'UT', 'statehouse', 33, 'Utah State House District 33'),
	('ut-statehouse-34', 'UT', 'statehouse', 34, 'Utah State House District 34'),
	('ut-statehouse-36', 'UT', 'statehouse', 36, 'Utah State House District 36'),
	('ut-statehouse-37', 'UT', 'statehouse', 37, 'Utah State House District 37'),
	('ut-statehouse-39', 'UT', 'statehouse', 39, 'Utah State House District 39'),
	('ut-statehouse-41', 'UT', 'statehouse', 41, 'Utah State House District 41'),
	('ut-statehouse-42', 'UT', 'statehouse', 42, 'Utah State House District 42'),
	('ut-statehouse-43', 'UT', 'statehouse', 43, 'Utah State House District 43'),
	('ut-statehouse-44', 'UT', 'statehouse', 44, 'Utah State House District 44'),
	('ut-statehouse-45', 'UT', 'statehouse', 45, 'Utah State House District 45'),
	('ut-statehouse-46', 'UT', 'statehouse', 46, 'Utah State House District 46'),
	('ut-statehouse-49', 'UT', 'statehouse', 49, 'Utah State House District 49'),
	('ut-statehouse-50', 'UT', 'statehouse', 50, 'Utah State House District 50'),
	('ut-statehouse-51', 'UT', 'statehouse', 51, 'Utah State House District 51'),
	('ut-statehouse-52', 'UT', 'statehouse', 52, 'Utah State House District 52'),
	('ut-statehouse-53', 'UT', 'statehouse', 53, 'Utah State House District 53'),
	('ut-statehouse-55', 'UT', 'statehouse', 55, 'Utah State House District 55'),
	('ut-statehouse-56', 'UT', 'statehouse', 56, 'Utah State House District 56'),
	('ut-statehouse-59', 'UT', 'statehouse', 59, 'Utah State House District 59'),
	('ut-statehouse-60', 'UT', 'statehouse', 60, 'Utah State House District 60'),
	('ut-statehouse-61', 'UT', 'statehouse', 61, 'Utah State House District 61'),
	('ut-statehouse-63', 'UT', 'statehouse', 63, 'Utah State House District 63'),
	('ut-statehouse-64', 'UT', 'statehouse', 64, 'Utah State House District 64'),
	('ut-statehouse-65', 'UT', 'statehouse', 65, 'Utah State House District 65'),
	('ut-statehouse-66', 'UT', 'statehouse', 66, 'Utah State House District 66'),
	('ut-statehouse-67', 'UT', 'statehouse', 67, 'Utah State House District 67'),
	('ut-statehouse-68', 'UT', 'statehouse', 68, 'Utah State House District 68'),
	('ut-statehouse-69', 'UT', 'statehouse', 69, 'Utah State House District 69'),
	('ut-statehouse-70', 'UT', 'statehouse', 70, 'Utah State House District 70'),
	('ut-statehouse-71', 'UT', 'statehouse', 71, 'Utah State House District 71'),
	('ut-statehouse-73', 'UT', 'statehouse', 73, 'Utah State House District 73'),
	('ut-statehouse-75', 'UT', 'statehouse', 75, 'Utah State House District 75'),
	('ut-statesenate-1', 'UT', 'statesenate', 1, 'Utah State Senate District 1'),
	('ut-statesenate-2', 'UT', 'statesenate', 2, 'Utah State Senate District 2'),
	('ut-statesenate-4', 'UT', 'statesenate', 4, 'Utah State Senate District 4'),
	('ut-statesenate-5', 'UT', 'statesenate', 5, 'Utah State Senate District 5'),
	('ut-statesenate-8', 'UT', 'statesenate', 8, 'Utah State Senate District 8'),
	('ut-statesenate-9', 'UT', 'statesenate', 9, 'Utah State Senate District 9'),
	('ut-statesenate-10', 'UT', 'statesenate', 10, 'Utah State Senate District 10'),
	('ut-statesenate-11', 'UT', 'statesenate', 11, 'Utah State Senate District 11'),
	('ut-statesenate-12', 'UT', 'statesenate', 12, 'Utah State Senate District 12'),
	('ut-statesenate-13', 'UT', 'statesenate', 13, 'Utah State Senate District 13'),
	('ut-statesenate-14', 'UT', 'statesenate', 14, 'Utah State Senate District 14'),
	('ut-statesenate-15', 'UT', 'statesenate', 15, 'Utah State Senate District 15'),
	('ut-statesenate-16', 'UT', 'statesenate', 16, 'Utah State Senate District 16'),
	('ut-statesenate-17', 'UT', 'statesenate', 17, 'Utah State Senate District 17'),
	('ut-statesenate-18', 'UT', 'statesenate', 18, 'Utah State Senate District 18'),
	('ut-statesenate-19', 'UT', 'statesenate', 19, 'Utah State Senate District 19'),
	('ut-statesenate-20', 'UT', 'statesenate', 20, 'Utah State Senate District 20'),
	('ut-statesenate-21', 'UT', 'statesenate', 21, 'Utah State Senate District 21'),
	('ut-statesenate-22', 'UT', 'statesenate', 22, 'Utah State Senate District 22'),
	('ut-statesenate-23', 'UT', 'statesenate', 23, 'Utah State Senate District 23'),
	('ut-statesenate-24', 'UT', 'statesenate', 24, 'Utah State Senate District 24'),
	('ut-statesenate-25', 'UT', 'statesenate', 25, 'Utah State Senate District 25'),
	('ut-statesenate-26', 'UT', 'statesenate', 26, 'Utah State Senate District 26'),
	('ut-statesenate-27', 'UT', 'statesenate', 27, 'Utah State Senate District 27'),
	('ut-statesenate-28', 'UT', 'statesenate', 28, 'Utah State Senate District 28'),
	('ut-statesenate-29', 'UT', 'statesenate', 29, 'Utah State Senate District 29'),
	('ut-house-1', 'UT', 'house', 1, 'Utah · U.S. House District 1'),
	('ut-house-3', 'UT', 'house', 3, 'Utah · U.S. House District 3'),
	('ut-house-4', 'UT', 'house', 4, 'Utah · U.S. House District 4'),
	('ut-gov', 'UT', 'gov', 0, 'Utah · Governor'),
	('ut-us-senate-curtis', 'UT', 'us-senate', 0, 'Utah · U.S. Senate (John Curtis)'),
	('ut-us-senate-lee', 'UT', 'us-senate', 0, 'Utah · U.S. Senate (Mike Lee)')
ON CONFLICT ("district_id") DO NOTHING;
