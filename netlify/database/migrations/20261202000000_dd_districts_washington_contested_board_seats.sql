-- ────────────────────────────────────────────────────────────────────────────
-- dd_districts — one row for each contested Washington board that takes a voice
-- ────────────────────────────────────────────────────────────────────────────
-- WHY. voice_residency, voice_takes, voice_take_likes and voice_poll_votes each
-- carry a foreign key on seat_key → dd_districts.district_id. The composer, the
-- poll and the Didit residency check now open on Washington's nine contested
-- boards (wa-ballot-2026.js): two State Senate seats and seven State House
-- positions. dd_districts holds no Washington legislative seat. Without a row,
-- a signed Didit decision, a comment, a like or a vote on one of those boards
-- would fail at the foreign key instead of landing.
--
-- A HOUSE SEAT IS A POSITION. Each Washington district elects two
-- Representatives, each to its own seat, so a House row's district_id is the
-- board's position key, wa-statehouse-<n>-p<k>, and two positions of one
-- district are two rows. seat_key stays 'statehouse' and district_number stays
-- the district's number; the label names the position.
--
-- WHAT IT CHANGES. Rows only — NO NEW TABLE AND NO SCHEMA CHANGE. district_id
-- is free text, the seat-key check already admits 'statehouse' and
-- 'statesenate', the number check admits any number above zero, and the state
-- check any two-letter code. ON CONFLICT DO NOTHING: a row that already exists
-- keeps its label.
--
-- It writes no residency, take or vote. Opening a seat to the gate is not a
-- verification; only the signed Didit webhook writes method = 'vendor'.
-- Generated once from scripts/gen-district-boards.mjs planBoards() (the
-- voiced Washington state legislative rows). No applied migration is edited.
INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('wa-statesenate-26', 'WA', 'statesenate', 26, 'Washington State Senate District 26'),
	('wa-statesenate-35', 'WA', 'statesenate', 35, 'Washington State Senate District 35'),
	('wa-statehouse-10-p1', 'WA', 'statehouse', 10, 'Washington State House District 10, Position 1'),
	('wa-statehouse-10-p2', 'WA', 'statehouse', 10, 'Washington State House District 10, Position 2'),
	('wa-statehouse-17-p1', 'WA', 'statehouse', 17, 'Washington State House District 17, Position 1'),
	('wa-statehouse-17-p2', 'WA', 'statehouse', 17, 'Washington State House District 17, Position 2'),
	('wa-statehouse-18-p1', 'WA', 'statehouse', 18, 'Washington State House District 18, Position 1'),
	('wa-statehouse-18-p2', 'WA', 'statehouse', 18, 'Washington State House District 18, Position 2'),
	('wa-statehouse-26-p1', 'WA', 'statehouse', 26, 'Washington State House District 26, Position 1')
ON CONFLICT ("district_id") DO NOTHING;
