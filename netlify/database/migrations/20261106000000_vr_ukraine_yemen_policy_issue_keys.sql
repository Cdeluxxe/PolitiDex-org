-- ────────────────────────────────────────────────────────────────────────────
-- 🇺🇦 Ukraine and 🇾🇪 Yemen — two issue keys, and only the acts about each on them
-- ────────────────────────────────────────────────────────────────────────────
-- Same shape as 20261105000000_vr_iran_policy_issue_key. The issue vocabulary is
-- a stored table (dd_issue_keys, the foreign-key target for dd_threads,
-- dd_poll_votes and voice_polls) and the mappings live in vr_measure_issues, so
-- adding ukraine_policy and yemen_policy to ISSUE_MAP and db/issue-keys.json
-- without this file would leave both keys readable in the app and refused by
-- the database.
--
-- WHAT IT ADDS
--   1. 'ukraine_policy' and 'yemen_policy' into dd_issue_keys, ON CONFLICT DO NOTHING.
--   2. Four vr_measure_issues rows, one per act whose own text names the country
--      as its subject, mirroring db/vr-issue-seed.json and db/exec-action-seed.json:
--        ukraine_policy — H.R. 8035 (118th, the standalone Ukraine supplemental),
--          H.R. 815 (118th, whose Division B it became; weight 60 because four
--          other divisions ride with it) and H.Amdt. 252 (119th, the bar on
--          Ukraine Security Assistance funds);
--        yemen_policy — S.J. Res. 7 (116th, the vetoed Yemen war-powers resolution).
--      Each is is_primary = false, beside its existing rows and never in place of them.
--
-- WHAT IT DOES NOT DO. No roll call is created, no existing row is touched, no
-- weight, polarity or primary flag moves. S.J. Res. 68 (Iran) gets no Yemen row;
-- H.R. 7217 and H.R. 8034 (the Israel supplementals, which name Ukraine only as
-- the package they were offered against) and the defense and appropriations
-- bills that carry a Ukraine line among many get no Ukraine row. Both keys carry
-- no pole (_RD_NO_POLE in stance-helpers.js): each names a country, not a
-- proposition, so the record engine never prints a direction on them and
-- Direction Match is unchanged. support_meaning is NOT NULL and is filled as
-- yea_supports, recording the measure's own action, never printed.
--
-- Idempotent: a missing measure raises a NOTICE and is skipped; an existing
-- (measure_id, issue_key) pair is left alone.
--
-- pack-generation: derived — up to 4 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.

INSERT INTO "dd_issue_keys" ("issue_key") VALUES ('ukraine_policy')
ON CONFLICT DO NOTHING;
INSERT INTO "dd_issue_keys" ("issue_key") VALUES ('yemen_policy')
ON CONFLICT DO NOTHING;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 8035'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'ukraine_policy: vr_measures H.R. 8035 (118th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'ukraine_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'ukraine_policy', 100, false, 'yea_supports',
       'Ukraine is the bill''s own subject: supplemental appropriations to respond to the situation in Ukraine, including the Ukraine Security Assistance Initiative and replacement of defense articles already provided to Ukraine. Filed here alongside its alliance, America First and restraint rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/118th-congress/house-bill/8035');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 815'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'ukraine_policy: vr_measures H.R. 815 (118th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'ukraine_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'ukraine_policy', 60, false, 'yea_supports',
       'Ukraine is the subject of the package''s Division B, the Ukraine Security Supplemental Appropriations Act, 2024, which became law through this vehicle. Filed here alongside its existing rows, not in place of them; weighted below H.R. 8035 because four other divisions ride with it. No side is read on this key.',
       'https://www.congress.gov/bill/118th-congress/house-bill/815');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'amendment' AND chamber = 'house' AND congress = 119 AND number = 'H.Amdt. 252'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'ukraine_policy: vr_measures H.Amdt. 252 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'ukraine_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'ukraine_policy', 100, false, 'yea_supports',
       'Ukraine is the amendment''s own subject: it prohibits funds for the Ukraine Security Assistance Initiative, except for U.S. embassy security in Ukraine. Filed here alongside its restraint, America First, alliance and defense rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/252');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 116 AND number = 'S.J. Res. 7'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'yemen_policy: vr_measures S.J. Res. 7 (116th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'yemen_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'yemen_policy', 85, false, 'yea_supports',
       'Yemen is the resolution’s own subject: S.J. Res. 7 directed removal of United States Armed Forces from hostilities in the Republic of Yemen. Filed alongside the restraint and war-powers rows, not in place of them. The key names a country, so no side is read on it; the direction field records the resolution, as on the rows above.',
       'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7');
  END IF;
END $$;
