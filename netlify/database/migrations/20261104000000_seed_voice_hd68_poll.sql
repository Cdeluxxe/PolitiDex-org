-- ---------------------------------------------------------------------------
-- District Voice's first poll — HD-68 × lands_preserve
-- ---------------------------------------------------------------------------
-- WHAT THIS ADDS. One voice_polls row for ('ut-statehouse-68', 'lands_preserve')
-- and its THREE options. Nothing else: no seat, no issue key, no take, no answer,
-- no residency and no person.
--
-- WHY IT IS SEEDED RATHER THAN CREATED BY A CALLER. There is no "create a poll"
-- route in slice 1 — deliberately, because a route that mints polls is a route
-- that mints a second one. A seat's live question is therefore a fact of the
-- schema, set here, and the district file reads whichever row is active. On a
-- fresh branch database this is the ONE poll District Voice ships with, which is
-- what lets the HD-68 file paint "one poll slot, zero takes" honestly instead of
-- painting nothing at all.
--
-- WHY THIS PAIR. ut-statehouse-68 is the flagship seat (Scott Chew's Uintah
-- Basin seat) and lands_preserve is the issue that seat actually touches — it is
-- also already the district's one open District Room, seeded by
-- 20261101000000_seed_dd_hd68_district_file_room.sql, so the file's poll and the
-- file's room are about the same thing rather than two unrelated subjects. Both
-- halves already exist as rows: the seat among the 49 districts and the issue
-- among the 121 keys, both seeded in
-- 20261029000000_create_dd_district_discussion_tables. This migration adds no
-- vocabulary; it pairs two rows that are already there, which is all a poll is.
--
-- WHY THREE ISSUE-SIDED OPTIONS AND NOT A NAME. The options are sides of the
-- issue. None of them is a candidate, a party, a caucus or a person, and there is
-- no pid column here for one to be — an option list of names would make the seat's
-- one question a contest between its officeholders instead of a question about
-- public land. Three is inside the two-to-four range the write path enforces, and
-- the third option exists so a neighbour whose honest answer is "it depends on the
-- parcel" is not forced into a pole they do not hold.
--
-- COUNTS, NOT A PERCENTAGE. No proportion is stored, computed or seeded here.
-- There is no total column, and the file prints one integer per option.
--
-- IDEMPOTENT. The poll inserts only when the seat has no poll at all, and the
-- options are ON CONFLICT DO NOTHING against the (poll_id, option_key) unique
-- index — so re-applying this file cannot produce a second poll for the seat or a
-- duplicate option. created_at defaults to now(), which for a seeded poll is the
-- migration time and is never shown as anybody's answering time.
--
-- NOT A SCHEMA CHANGE. No table, column, index or constraint is touched, so there
-- is no snapshot beside this file. Roll forward with a new migration.
-- ---------------------------------------------------------------------------

INSERT INTO "voice_polls" ("seat_key", "issue_key", "question", "active")
SELECT
	'ut-statehouse-68',
	'lands_preserve',
	'On public lands in this district, which should state policy weigh more heavily?',
	true
WHERE EXISTS (SELECT 1 FROM "dd_districts" WHERE "district_id" = 'ut-statehouse-68')
  AND EXISTS (SELECT 1 FROM "dd_issue_keys" WHERE "issue_key" = 'lands_preserve')
  AND NOT EXISTS (SELECT 1 FROM "voice_polls" WHERE "seat_key" = 'ut-statehouse-68');
--> statement-breakpoint
INSERT INTO "voice_poll_options" ("poll_id", "option_key", "label", "sort_order")
SELECT p."id", v."k", v."l", v."o"
FROM "voice_polls" p
CROSS JOIN (VALUES
	('preserve',  'Keeping them preserved',                    1),
	('multiuse',  'Opening more for development and grazing',   2),
	('depends',   'Depends on the parcel',                      3)
) AS v("k", "l", "o")
WHERE p."seat_key" = 'ut-statehouse-68'
  AND p."issue_key" = 'lands_preserve'
  AND p."active"
ON CONFLICT ("poll_id", "option_key") DO NOTHING;
