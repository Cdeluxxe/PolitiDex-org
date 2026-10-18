-- ────────────────────────────────────────────────────────────────────────────
-- The Iran withdrawal resolution, voted eleven times: the seven repeat votes
-- get their topic rows, with no primary, and score nowhere twice
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. 28 vr_measure_issues rows — four topics on each of S.J.Res.
-- 118, 116, 123, 114, 172, 180 and 181 (119th, Senate). Nothing else: no
-- measure, roll call, member vote, position, provision, UPDATE or DELETE. A
-- missing measure RAISEs, because all seven and their discharge rolls were
-- filed by 20261023000000_vr_federal_wave_f7 and must not be re-invented.
--
-- THE SAME TEXT. F7 recorded (db/vr-federal-mapping-seed-f7.json) that eleven
-- Senate joint resolutions carry the same operative language: direct removal of
-- United States Armed Forces from hostilities within or against Iran that
-- Congress has not authorized, saving only defence against an attack under way
-- or imminent. Four were mapped — S.J.Res. 104 as the act of record, and 184,
-- 163 and 185, each the only record of one senator's crossing — and these seven
-- were left with no rows under runbook rule 34, because none records a position
-- an earlier roll does not.
--
-- THE ROWS, COPIED FROM THE COUNTED SIBLINGS, WITH NO PRIMARY. Each gets the
-- four topics the text touches, at S.J.Res. 104's weight and polarity:
--   restraint       100  yea_supports
--   war_powers       70  yea_supports   (no pole: inventory, never a direction)
--   strong_defense   55  yea_opposes
--   iran_policy     100  yea_supports   (no pole: names a country)
-- and is_primary = false on every one, so each bill page lists every topic the
-- text touches without naming one of them its subject a second time.
--
-- SCORES COUNT A POSITION ONCE PER TEXT. db/vr-text-families.json names the
-- eleven as one family with the four counted. The client holds a member's vote
-- on a repeat out of every scored list unless it is that member's only record
-- of that position on the text (voting-record.js, SAME_TEXT); F7's diff shows
-- that set is empty today, so no member's score, weight or direction moves. The
-- held votes are listed in the drawer's and the bill page's History section,
-- with each outcome and a link, not as extra ledger rows.
--
-- WHAT IT DOES NOT TOUCH. The four counted siblings' rows (restraint primary on
-- each) and H.Con.Res. 89's rows are read, not written; the verification block
-- RAISEs if any of them reads differently. No new issue key.
--
-- Idempotent: every row ON CONFLICT (measure_id, issue_key) DO NOTHING.
-- Pinned by scripts/test-war-powers-same-text.mjs.
--
-- pack-generation: derived — up to 28 vr_measure_issues rows below, each
--   ON CONFLICT DO NOTHING. The rows that land move mappingVersion() in
--   netlify/lib/vr-pack.ts, so every member pack built on the old mapping is
--   retired by its key.

-- S.J.Res. 118 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 118'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 118 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/118'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/118'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/118'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/118')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 116 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 116'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 116 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/116'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/116'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/116'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/116')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 123 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 123'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 123 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/123'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/123'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/123'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/123')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 114 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 114'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 114 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/114'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/114'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/114'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/114')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 172 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 172'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 172 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/172'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/172'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/172'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/172')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 180 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 180'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 180 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/180'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/180'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/180'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/180')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- S.J.Res. 181 · 119th · Senate — four rows, no primary
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = 'S.J.Res. 181'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Iran same-text: S.J.Res. 181 (119, senate) is not in vr_measures. This pass adds to existing measures and creates none.';
  END IF;
  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'restraint', 100, false, 'yea_supports',
      'The resolution''s operative section directs the President to remove United States Armed Forces from hostilities within or against Iran that Congress has not authorized, and its saving clause preserves only defence against an attack already under way or imminent. The instrument''s whole command is withdrawal: a yea ordered forces out and a nay left them in. The same operative text was voted on as S.J.Res. 104, the act of record for this text.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/181'),
    (m_id, 'war_powers', 70, false, 'yea_supports',
      'A privileged joint resolution under section 5(c) of the War Powers Resolution, which reaches the floor only if the Foreign Relations Committee is discharged, and what it asserts is that the decision to authorize belongs to Congress. The operative command is the removal of forces rather than a change to the authorization machinery itself.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/181'),
    (m_id, 'strong_defense', 55, false, 'yea_opposes',
      'A yea withdraws United States forces from an ongoing engagement absent a vote of Congress. The resolution takes no position on force levels, procurement, budgets or posture; it reaches one engagement and stops.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/181'),
    (m_id, 'iran_policy', 100, false, 'yea_supports',
      'Iran is the resolution''s own subject: its operative section directs removal of U.S. forces from hostilities within or against Iran that Congress has not authorized.',
      'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/181')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- VERIFICATION
DO $$
DECLARE
  r record;
  n integer;
BEGIN
  -- The seven: four rows each, no primary, at the siblings' weight and polarity.
  FOR r IN SELECT id, number FROM vr_measures
            WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate'
              AND number IN ('S.J.Res. 118', 'S.J.Res. 116', 'S.J.Res. 123', 'S.J.Res. 114',
                             'S.J.Res. 172', 'S.J.Res. 180', 'S.J.Res. 181')
  LOOP
    SELECT count(*) INTO n FROM vr_measure_issues
     WHERE measure_id = r.id AND NOT is_primary AND (
           (issue_key = 'restraint'      AND weight = 100 AND support_meaning = 'yea_supports')
        OR (issue_key = 'war_powers'     AND weight = 70  AND support_meaning = 'yea_supports')
        OR (issue_key = 'strong_defense' AND weight = 55  AND support_meaning = 'yea_opposes')
        OR (issue_key = 'iran_policy'    AND weight = 100 AND support_meaning = 'yea_supports'));
    IF n <> 4 THEN
      RAISE EXCEPTION 'Iran same-text: % does not carry the four sibling rows with no primary (found % matching).', r.number, n;
    END IF;
    SELECT count(*) INTO n FROM vr_measure_issues WHERE measure_id = r.id AND is_primary;
    IF n <> 0 THEN
      RAISE EXCEPTION 'Iran same-text: % carries a primary row; a repeat of the same text names none.', r.number;
    END IF;
  END LOOP;
  -- The four counted siblings read exactly as filed.
  FOR r IN SELECT id, number FROM vr_measures
            WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate'
              AND number IN ('S.J.Res. 104', 'S.J.Res. 184', 'S.J.Res. 163', 'S.J.Res. 185')
  LOOP
    SELECT count(*) INTO n FROM vr_measure_issues
     WHERE measure_id = r.id AND (
           (issue_key = 'restraint'      AND weight = 100 AND is_primary     AND support_meaning = 'yea_supports')
        OR (issue_key = 'war_powers'     AND weight = 70  AND NOT is_primary AND support_meaning = 'yea_supports')
        OR (issue_key = 'strong_defense' AND weight = 55  AND NOT is_primary AND support_meaning = 'yea_opposes')
        OR (issue_key = 'iran_policy'    AND weight = 100 AND NOT is_primary AND support_meaning = 'yea_supports'));
    IF n <> 4 THEN
      RAISE EXCEPTION 'Iran same-text: the counted sibling % no longer reads as filed (found % matching).', r.number, n;
    END IF;
  END LOOP;
  -- H.Con.Res. 89 still carries war_powers and its strong_defense row.
  SELECT count(*) INTO n FROM vr_measure_issues mi JOIN vr_measures me ON me.id = mi.measure_id
   WHERE me.congress = 119 AND me.chamber = 'house' AND me.number = 'H.Con.Res. 89'
     AND ((mi.issue_key = 'war_powers' AND NOT mi.is_primary)
       OR (mi.issue_key = 'strong_defense' AND mi.weight = 55 AND NOT mi.is_primary AND mi.support_meaning = 'yea_opposes'));
  IF n <> 2 THEN
    RAISE EXCEPTION 'Iran same-text: H.Con.Res. 89 no longer carries its war_powers and strong_defense rows as filed (found %).', n;
  END IF;
END $$;
