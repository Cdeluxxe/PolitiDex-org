-- ────────────────────────────────────────────────────────────────────────────
-- dd_districts — one row for each contested California board that takes a voice
-- ────────────────────────────────────────────────────────────────────────────
-- WHY. voice_residency, voice_takes, voice_take_likes and voice_poll_votes each
-- carry a foreign key on seat_key → dd_districts.district_id. The composer, the
-- poll and the Didit residency check now open on California's seven contested
-- State Assembly and State Senate boards (ca-ballot-2026.js), and dd_districts
-- holds no California legislative seat. Without a row, a signed Didit
-- decision, a comment, a like or a vote on one of those boards would fail at
-- the foreign key instead of landing.
--
-- WHAT IT CHANGES. Rows only — NO NEW TABLE AND NO SCHEMA CHANGE. The seat-key
-- check already admits 'statehouse' and 'statesenate', the number check admits
-- any number above zero, and the state check any two-letter code. district_id
-- is the board's seat key, ca-<chamber>-<n>. ON CONFLICT DO NOTHING: a row
-- that already exists keeps its label.
--
-- It writes no residency, take or vote. Opening a seat to the gate is not a
-- verification; only the signed Didit webhook writes method = 'vendor'.
-- Generated once from scripts/gen-district-boards.mjs planBoards() (the
-- voiced California state legislative rows). No applied migration is edited.
INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('ca-statesenate-16', 'CA', 'statesenate', 16, 'California State Senate District 16'),
	('ca-statesenate-38', 'CA', 'statesenate', 38, 'California State Senate District 38'),
	('ca-statehouse-7', 'CA', 'statehouse', 7, 'California State Assembly District 7'),
	('ca-statehouse-36', 'CA', 'statehouse', 36, 'California State Assembly District 36'),
	('ca-statehouse-47', 'CA', 'statehouse', 47, 'California State Assembly District 47'),
	('ca-statehouse-58', 'CA', 'statehouse', 58, 'California State Assembly District 58'),
	('ca-statehouse-74', 'CA', 'statehouse', 74, 'California State Assembly District 74')
ON CONFLICT ("district_id") DO NOTHING;
