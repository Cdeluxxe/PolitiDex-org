-- ────────────────────────────────────────────────────────────────────────────
-- 🇻🇪 Venezuela — one issue key, and only the acts about Venezuela on it
-- ────────────────────────────────────────────────────────────────────────────
-- Same shape as 20261105000000_vr_iran_policy_issue_key and
-- 20261106000000_vr_ukraine_yemen_policy_issue_keys. The issue vocabulary is a
-- stored table (dd_issue_keys, the foreign-key target for dd_threads,
-- dd_poll_votes and voice_polls) and the mappings live in vr_measure_issues, so
-- adding venezuela_policy to ISSUE_MAP and db/issue-keys.json without this file
-- would leave the key readable in the app and refused by the database.
--
-- WHAT IT ADDS
--   1. 'venezuela_policy' into dd_issue_keys, ON CONFLICT DO NOTHING.
--   2. Four vr_measure_issues rows, one per act whose own text names Venezuela as
--      its subject, mirroring db/vr-issue-seed.json and db/exec-action-seed.json:
--        S.J.Res. 90 and S.J.Res. 98 (119th, the Senate war-powers resolutions
--          directed at hostilities within or against Venezuela);
--        Executive Order 14245 (duties on countries that import Venezuelan oil);
--        Executive Order 14373 (Venezuelan oil revenue held in Treasury custody).
--      Each is is_primary = false, beside its existing rows and never in place of them.
--
-- WHAT IT DOES NOT DO. No measure or roll call is created, no existing row is
-- touched, no weight, polarity or primary flag moves. S.J.Res. 83 (no theatre
-- named), Proclamation 11015 (cartels across the whole hemisphere) and every
-- defense or appropriations bill that carries a Venezuela line among many get no
-- Venezuela row. The key carries no pole (_RD_NO_POLE in stance-helpers.js): it
-- names a country, not a proposition, so the record engine never prints a
-- direction on it and Direction Match is unchanged. support_meaning is NOT NULL
-- and is filled as yea_supports, recording the act's own action, never printed.
--
-- Idempotent: a missing measure raises a NOTICE and is skipped; an existing
-- (measure_id, issue_key) pair is left alone.
--
-- pack-generation: derived — up to 4 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.

INSERT INTO "dd_issue_keys" ("issue_key") VALUES ('venezuela_policy')
ON CONFLICT DO NOTHING;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 90'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'venezuela_policy: vr_measures S.J.Res. 90 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'venezuela_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'venezuela_policy', 100, false, 'yea_supports',
       'Venezuela is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Venezuela that Congress has not authorized. Filed here alongside its restraint, war-powers and defense rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/90');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 119 AND number = 'S.J.Res. 98'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'venezuela_policy: vr_measures S.J.Res. 98 (119th) not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'venezuela_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'venezuela_policy', 100, false, 'yea_supports',
       'Venezuela is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Venezuela that Congress has not authorized. Filed here alongside its restraint, war-powers and defense rows, not in place of them; no side is read on this key.',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/98');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive' AND number = 'Executive Order 14245'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'venezuela_policy: vr_measures Executive Order 14245 not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'venezuela_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'venezuela_policy', 65, false, 'yea_supports',
       'Venezuela is the order’s own subject: issued under the International Emergency Economic Powers Act and the National Emergencies Act, it authorizes a 25 percent ad valorem duty on goods from any country determined to import Venezuelan oil, directly or indirectly, with the determination left to the Secretary of State. Filed alongside the Tariffs & Trade Authority row, not in place of it. The key names a country, so no side is read on it; the direction field records the order’s own action.',
       'https://www.federalregister.gov/documents/2025/03/27/2025-05440/imposing-tariffs-on-countries-importing-venezuelan-oil');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive' AND number = 'Executive Order 14373'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'venezuela_policy: vr_measures Executive Order 14373 not on file; skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'venezuela_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'venezuela_policy', 70, false, 'yea_supports',
       'Venezuela is the order’s own subject: section 1 finds that judicial process against the covered funds would interfere with efforts to ensure economic and political stability in Venezuela, section 3 renders any attachment, judgment, lien, execution or garnishment against them null and void, and section 4 holds them pending disposition on behalf of the Government of Venezuela. Filed alongside the America First row, not in place of it. The key names a country, so no side is read on it; the direction field records the order’s own action.',
       'https://www.federalregister.gov/documents/2026/01/15/2026-00831/safeguarding-venezuelan-oil-revenue-for-the-good-of-the-american-and-venezuelan-people');
  END IF;
END $$;
