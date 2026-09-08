-- ---------------------------------------------------------------------------
-- The district file's first room — HD-68 × lands_preserve
-- ---------------------------------------------------------------------------
-- WHAT THIS ADDS. Exactly one dd_threads row: ('ut-statehouse-68',
-- 'lands_preserve'). Nothing else. No district, no issue key, no post, no vote,
-- no residency and no person.
--
-- WHY IT IS NEEDED. The district file at /d/ut-statehouse-68 lists the issue
-- rooms that ALREADY EXIST for that district — it does not invent a room per
-- ISSUE_MAP key. "Exists" means a dd_threads row, and a room is otherwise only
-- created the first time somebody with a reviewer grant posts in it. On a fresh
-- branch database, seeded by migrations alone, nobody has ever posted, so the
-- list would be empty and the file would have no door to open. This row is that
-- door: it makes the ONE room the district file ships with a fact of the schema
-- rather than a side effect of somebody's first post.
--
-- WHY THIS PAIR. ut-statehouse-68 is the one district key the file ships for,
-- and lands_preserve is the issue the Uintah Basin seat's neighbors are being
-- given a door into. Both halves already exist as rows: ut-statehouse-68 is
-- seeded in 20261029000000_create_dd_district_discussion_tables along with every
-- other Utah district, and lands_preserve is seeded there among the 121 issue
-- keys. This migration adds no vocabulary — it only pairs two rows that are
-- already present, which is all a room is.
--
-- WHY NOT MORE ROOMS. One room per remaining Utah district × 121 issue keys
-- would be ~14,000 empty rooms nobody asked for, and an empty room presented as
-- a place to go is a lie about where the conversation is. Other districts get a
-- file when they get a room; until then /d/<other-key> says there is no district
-- file yet.
--
-- IDEMPOTENT. ON CONFLICT DO NOTHING against the unique index on
-- (district_id, issue_key), so re-running this on a database where the room was
-- already created by a post is a no-op and cannot produce a second thread for
-- the same pair. created_at defaults to now(), which for a seeded room is the
-- migration time and is never shown as a posting time anywhere.
--
-- NOT A SCHEMA CHANGE. No table, column, index or constraint is touched, so
-- there is no snapshot beside this file. Roll forward with a new migration.
-- ---------------------------------------------------------------------------

INSERT INTO "dd_threads" ("district_id", "issue_key")
SELECT 'ut-statehouse-68', 'lands_preserve'
WHERE EXISTS (SELECT 1 FROM "dd_districts" WHERE "district_id" = 'ut-statehouse-68')
  AND EXISTS (SELECT 1 FROM "dd_issue_keys" WHERE "issue_key" = 'lands_preserve')
ON CONFLICT ("district_id", "issue_key") DO NOTHING;
