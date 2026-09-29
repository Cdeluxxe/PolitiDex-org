-- ────────────────────────────────────────────────────────────────────────────
-- 🇮🇷 Iran — one new issue key, and only the acts whose subject is Iran on it
-- ────────────────────────────────────────────────────────────────────────────
-- WHY THIS IS A MIGRATION AT ALL. The issue vocabulary is a stored table:
-- dd_issue_keys (seeded in 20261029000000_create_dd_district_discussion_tables)
-- is the foreign-key target for dd_threads, dd_poll_votes and voice_polls, and
-- the issue rows themselves live in vr_measure_issues. Adding iran_policy to
-- ISSUE_MAP (alignment-tool.js / issue-map.js) and to db/issue-keys.json without
-- this file would leave the key readable in the app and refused by the database.
--
-- WHAT IT ADDS
--   1. 'iran_policy' into dd_issue_keys, ON CONFLICT DO NOTHING.
--   2. Seven vr_measure_issues rows, one per act whose own text names Iran as its
--      subject, mirroring db/vr-issue-seed.json and db/exec-action-seed.json:
--        S.J.Res. 59, 104, 184, 163, 185 (119th, Senate discharge rolls on the
--        Iran withdrawal resolution — the ones already mapped; the seven
--        identical re-votes stay unmapped under runbook rule 34),
--        H.Con.Res. 89 (119th, House), and
--        S.J. Res. 68 (116th, the vetoed Iran war-powers resolution).
--      Each is is_primary = false, alongside its existing restraint / war-powers /
--      defense rows and never in place of them.
--
-- WHAT IT DOES NOT DO. No roll call is created, no existing row is touched, no
-- weight, polarity or primary flag moves. S.J.Res. 7 (Yemen), S.J.Res. 83 (no
-- theatre named), S.J.Res. 90 / 98 (Venezuela) and H.Con.Res. 108 (Lebanon) are
-- not Iran and get no row. iran_policy carries no pole (_RD_NO_POLE in
-- stance-helpers.js): it names a country, not a proposition, so the record
-- engine never prints a direction on it and Direction Match is unchanged. The
-- support_meaning column is NOT NULL and is filled as yea_supports, recorded
-- against withdrawal exactly as the restraint row on the same measure is.
--
-- Idempotent: a missing measure raises a NOTICE and is skipped; an existing
-- (measure_id, issue_key) pair is left alone.
--
-- pack-generation: derived — up to 7 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts (row count and the md5 over the
--   ordered tuples), so every member pack built on the old mapping is retired by
--   its key; confirm with scripts/test-vr-pack-key-version.mjs after it lands.

INSERT INTO "dd_issue_keys" ("issue_key") VALUES ('iran_policy')
ON CONFLICT DO NOTHING;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 59'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J.Res. 59 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: it directs removal of U.S. forces from hostilities against Iran that Congress has not authorized. Filed here alongside its restraint, war-powers and defense rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'house' AND congress = 119 AND number = 'H.Con.Res. 89'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures H.Con.Res. 89 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: it directs the President under section 5(c) of the War Powers Resolution to remove U.S. forces from hostilities with Iran. Filed here alongside its restraint row, not in place of it; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 104'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J.Res. 104 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized. Filed here alongside its existing rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/104');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 184'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J.Res. 184 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized. Filed here alongside its existing rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/184');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 163'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J.Res. 163 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized. Filed here alongside its existing rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/163');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 185'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J.Res. 185 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 100, false, 'yea_supports',
       'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized. Filed here alongside its existing rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/185');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 116 AND number = 'S.J. Res. 68'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'iran_policy: vr_measures S.J. Res. 68 (116th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 85, false, 'yea_supports',
       'Iran is the resolution’s own subject: S.J. Res. 68 directed removal of United States Armed Forces from hostilities against the Islamic Republic of Iran. Filed alongside the restraint and war-powers rows, not in place of them. The key names a country, so no side is read on it; the direction field records the resolution, as on the rows above.',
       'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68');
  END IF;
END $$;
