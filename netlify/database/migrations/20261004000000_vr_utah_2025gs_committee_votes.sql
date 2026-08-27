-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah 2025 committee votes as formal acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 241 committee votes — 32 committee actions on 24 bills
-- already in the formal lane for 2025GS — written as
-- vr_positions rows with action_type = 'committee_vote'. That action type already
-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";
-- nothing about weights, labels or floors is changed by this file.
--
-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call
-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a
-- space the floor already owns. vr_positions has no roll_number column at all, so
-- these 241 rows cannot collide with any floor roll number, in this session or
-- another. The meeting is identified in each row's note and source URL instead.
--
-- AND IT DOES NOT DOUBLE COUNT. 191 of these rows belong to a member
-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every
-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts
-- leaves those rows out of the coverage count for the same reason. They are written
-- because they happened, not to add depth: the depth this file adds is the other
-- 50 rows, where the committee record is the only record of that member on
-- that bill.
--
-- WHAT IS NOT HERE. No measures and no issue mappings: a committee act reuses the
-- parent bill's reviewed keys, and a bill with no reviewed mapping is refused rather
-- than mapped on the strength of a committee vote. No sponsorships. No absences —
-- an absence is not a recorded position. No procedural motions (amend, replace,
-- hold, calendar): vr_positions has no field for an inverted direction, so a motion
-- whose yea does not mean "advance this bill" is left out rather than guessed at.
-- 10 later reprints of a committee's own vote on the same bill are dropped, so a
-- member holds one committee act per bill. And no near-unanimous committee vote: the
-- same 10%-minority bar the floor roll calls were selected under applies here, which
-- is why 24 bills are represented and not the 42 that had a committee vote at all.
--
-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date; they do not
-- timestamp the individual motion. acted_at is therefore that date at midnight
-- Mountain Standard Time, which is the session's own clock, rather than a guess at
-- the hour taken from the meeting's start time.
--
-- SOURCES. Every row carries the published minutes PDF it was confirmed against.
--   committees        https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=2025
--   meetings          https://le.utah.gov/committee/getMeetingInfo.jsp?com=<COM>&yr=2025
--   one meeting       https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=<ID>
--   minutes, machine  https://le.utah.gov/MtgMinutes/PublicMinutes
--                       ?requestType=getMeetingInfo&meetingID=<ID>
--   minutes, PDF      https://le.utah.gov/interim/2025/pdf/<N>.pdf
--
-- REPRODUCING IT. scripts/vr-utah-committee-ingest.mjs --survey --session 2025GS
-- (network), then --collect (reads the cache, drafts the printed-name map), then
-- --seed and --sql. The seed is committed at db/vr-utah-committee-seed.json;
-- the reviewed name table at db/vr-utah-committee-map.json.
--
-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique
-- (measure_id, politician_id, action_type). No DDL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── H.B. 85 — Environmental Permitting Modifications  (2025GS/HB0085) ──────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 85' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0085: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-24 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.
    --   printed tally 10-2-2 (yea-nay-absent); 12 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'chew_h68', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'david_shallenberger', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'koford_h10', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'kohler_h59', 'committee_vote', false, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'logan_monson', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'snider_h5', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'walt_brooks', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000448.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19683 · Rep. Brooks moved to pass 1st Substitute H.B. 85 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-02-18 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Hinkins moved to pass 1st Substitute H.B. 85 out favorably.
    --   printed tally 2-1-4 (yea-nay-absent); 3 of the 3 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 1st Substitute H.B. 85 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 1st Substitute H.B. 85 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 103 — State Land Access Road Amendments  (2025GS/HB0103) ───────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 103' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0103: measure absent, committee votes skipped';
  ELSE
    -- 2025-03-04 · Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.
    --   printed tally 5-1-2 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.'),
      (m_id, 'dipson', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.'),
      (m_id, 'harper_s16', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001932.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19924 · Sen. Millner moved to pass 3rd Substitute H.B. 103 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 106 — Income Tax Revisions  (2025GS/HB0106) ────────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 106' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0106: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-25 · House Revenue and Taxation Standing Committee · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.
    --   printed tally 8-2-1 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'clinton_okerlund', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'hoang_nguyen', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'koford_h10', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'lisa_shepherd', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001788.pdf', 'House Revenue and Taxation Standing Committee · meeting 19884 · Rep. Okerlund moved to pass 1st Substitute H.B. 106 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 124 — Education Industry Employee Privacy  (2025GS/HB0124) ─────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 124' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0124: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-07 · Senate Education Standing Committee · Sen. Balderree moved to pass 1st Substitute H.B. 124 out favorably.
    --   printed tally 3-1-3 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001533.pdf', 'Senate Education Standing Committee · meeting 19620 · Sen. Balderree moved to pass 1st Substitute H.B. 124 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001533.pdf', 'Senate Education Standing Committee · meeting 19620 · Sen. Balderree moved to pass 1st Substitute H.B. 124 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001533.pdf', 'Senate Education Standing Committee · meeting 19620 · Sen. Balderree moved to pass 1st Substitute H.B. 124 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2025-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001533.pdf', 'Senate Education Standing Committee · meeting 19620 · Sen. Balderree moved to pass 1st Substitute H.B. 124 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 187 — Imitation Firearm Amendments  (2025GS/HB0187) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 187' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0187: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-06 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.
    --   printed tally 5-5-1 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', true, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'gwynn_h6', 'committee_vote', false, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', false, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', true, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'lisa_shepherd', 'committee_vote', false, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'tlee', 'committee_vote', false, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', false, '2025-02-06T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001514.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19665 · Rep. Stoddard moved to pass 1st Substitute H.B. 187 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 195 — Firearm Retention Amendments  (2025GS/HB0195) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 195' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0195: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-03 · House Judiciary Standing Committee · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.
    --   printed tally 7-2-2 (yea-nay-absent); 9 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'anthony_loubet', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'auxier_h4', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'cheryl_acton', 'committee_vote', false, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'grant_miller', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'jason_thompson', 'committee_vote', false, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'jon_hawkins', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'nelson_abbott', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2025-02-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001247.pdf', 'House Judiciary Standing Committee · meeting 19605 · Rep. Gricius moved to pass 1st Substitute H.B. 195 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-02-19 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.
    --   printed tally 4-2-3 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'brammer_s21', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'cmusselman', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001958.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19781 · Sen. Balderree moved to pass 1st Substitute H.B. 195 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 201 — Energy Resource Amendments  (2025GS/HB0201) ──────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 201' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0201: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-04 · House Public Utilities and Energy Standing Committee · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.
    --   printed tally 9-1-3 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'chew_h68', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'nicholeen_p_peck', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'rosalba_dominguez', 'committee_vote', false, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'shelley_h66', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'snider_h5', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2025-02-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001532.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19662 · Rep. Peck moved to pass 1st Substitute H.B. 201 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-02-18 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Hinkins moved to pass 2nd Substitute H.B. 201 out favorably.
    --   printed tally 3-1-3 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 2nd Substitute H.B. 201 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 2nd Substitute H.B. 201 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 2nd Substitute H.B. 201 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001689.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19834 · Sen. Hinkins moved to pass 2nd Substitute H.B. 201 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 203 — Cannabis Amendments  (2025GS/HB0203) ─────────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 203' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0203: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-29 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.
    --   printed tally 8-5-1 (yea-nay-absent); 13 of the 13 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'chew_h68', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'david_shallenberger', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'koford_h10', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'kohler_h59', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'logan_monson', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'mschultz', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'snider_h5', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.'),
      (m_id, 'walt_brooks', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000908.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19684 · Rep. Watkins moved to pass 2nd Substitute H.B. 203 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 267 — Public Sector Labor Union Amendments  (2025GS/HB0267) ────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 267' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0267: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-29 · Senate Revenue and Taxation Standing Committee · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.
    --   printed tally 4-3-0 (yea-nay-absent); 7 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'brammer_s21', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'cwilson', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'harper_s16', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', false, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.'),
      (m_id, 'mccay_s11', 'committee_vote', true, '2025-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000825.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19649 · Sen. Brammer moved to pass 1st Substitute H.B. 267 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 269 — Privacy Protections in Sex-designated Areas  (2025GS/HB0269) ─────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0269: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-30 · Senate Education Standing Committee · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.
    --   printed tally 5-1-1 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cwilson', 'committee_vote', true, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', true, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2025-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000994.pdf', 'Senate Education Standing Committee · meeting 19795 · Sen. Hinkins moved to pass 1st Substitute H.B. 269 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 290 — Bicycle Lane Safety Amendments  (2025GS/HB0290) ──────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 290' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0290: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-19 · Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · Sen. Ipson moved to pass H.B. 290 out favorably.
    --   printed tally 5-1-2 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.'),
      (m_id, 'dipson', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.'),
      (m_id, 'harper_s16', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001717.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19803 · Sen. Ipson moved to pass H.B. 290 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 303 — Public School Directory Sharing Amendments  (2025GS/HB0303) ──────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 303' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0303: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-21 · House Education Standing Committee · Rep. Auxier moved to pass H.B. 303 out favorably as amended.
    --   printed tally 6-2-8 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'auxier_h4', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'kohler_h59', 'committee_vote', false, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'nicholeen_p_peck', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'sahara_hayes', 'committee_vote', true, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.'),
      (m_id, 'tracy_miller', 'committee_vote', false, '2025-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001751.pdf', 'House Education Standing Committee · meeting 19822 · Rep. Auxier moved to pass H.B. 303 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-03-03 · Senate Education Standing Committee · Sen. Balderree moved to pass H.B. 303 out favorably.
    --   printed tally 2-2-3 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001942.pdf', 'Senate Education Standing Committee · meeting 19940 · Sen. Balderree moved to pass H.B. 303 out favorably.'),
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001942.pdf', 'Senate Education Standing Committee · meeting 19940 · Sen. Balderree moved to pass H.B. 303 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001942.pdf', 'Senate Education Standing Committee · meeting 19940 · Sen. Balderree moved to pass H.B. 303 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001942.pdf', 'Senate Education Standing Committee · meeting 19940 · Sen. Balderree moved to pass H.B. 303 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 355 — Mining and Critical Infrastructure Materials Amendments  (2025GS/HB0355) ─────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 355' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0355: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-14 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.
    --   printed tally 9-3-2 (yea-nay-absent); 12 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'chew_h68', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'koford_h10', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'kohler_h59', 'committee_vote', false, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'logan_monson', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'mschultz', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.'),
      (m_id, 'snider_h5', 'committee_vote', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001626.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19845 · Rep. Bolinder moved to pass 1st Substitute H.B. 355 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-03-04 · Senate Revenue and Taxation Standing Committee · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.
    --   printed tally 4-1-2 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'brammer_s21', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001966.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19936 · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.'),
      (m_id, 'harper_s16', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001966.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19936 · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001966.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19936 · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001966.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19936 · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.'),
      (m_id, 'mccay_s11', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001966.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19936 · Chair McCay moved to pass 3rd Substitute H.B. 355 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 360 — Housing Attainability Amendments  (2025GS/HB0360) ────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 360' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0360: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-13 · House Political Subdivisions Standing Committee · Rep. Walter moved to pass H.B. 360 out favorably.
    --   printed tally 6-1-3 (yea-nay-absent); 7 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'fitisemanu_h30', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'james_dunnigan', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'rward', 'committee_vote', false, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'tlee', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.'),
      (m_id, 'tracy_miller', 'committee_vote', true, '2025-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001647.pdf', 'House Political Subdivisions Standing Committee · meeting 19810 · Rep. Walter moved to pass H.B. 360 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 365 — Mental Health Care Study Amendments  (2025GS/HB0365) ─────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 365' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0365: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-18 · House Health and Human Services Standing Committee · Rep. Eliason moved to pass H.B. 365 out favorably.
    --   printed tally 10-2-2 (yea-nay-absent); 12 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'cheryl_acton', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'fitisemanu_h30', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', false, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'kristen_chevrier', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'logan_monson', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'nelson_abbott', 'committee_vote', false, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'rward', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001643.pdf', 'House Health and Human Services Standing Committee · meeting 19763 · Rep. Eliason moved to pass H.B. 365 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 453 — State School Board Transparency Amendments  (2025GS/HB0453) ──────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 453' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0453: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-19 · House Education Standing Committee · Rep. Walter moved to pass H.B. 453 out favorably as amended.
    --   printed tally 5-5-6 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'auxier_h4', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'defay_h15', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'doug_welton', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'kohler_h59', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'sahara_hayes', 'committee_vote', true, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.'),
      (m_id, 'tracy_miller', 'committee_vote', false, '2025-02-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001721.pdf', 'House Education Standing Committee · meeting 19821 · Rep. Walter moved to pass H.B. 453 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-02-27 · House Education Standing Committee · Rep. MacPherson moved to pass 1st Substitute H.B. 453 out favorably.
    --   printed tally 9-3-4 (yea-nay-absent); 2 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'candice_pierucci', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001836.pdf', 'House Education Standing Committee · meeting 19908 · Rep. MacPherson moved to pass 1st Substitute H.B. 453 out favorably.'),
      (m_id, 'nicholeen_p_peck', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001836.pdf', 'House Education Standing Committee · meeting 19908 · Rep. MacPherson moved to pass 1st Substitute H.B. 453 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-03-04 · Senate Economic Development and Workforce Services Standing Committee · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.
    --   printed tally 3-2-1 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.'),
      (m_id, 'jstevenson', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Owens moved to pass 1st Substitute H.B. 453 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 508 — School Data Amendments  (2025GS/HB0508) ──────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 508' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0508: measure absent, committee votes skipped';
  ELSE
    -- 2025-03-04 · Senate Economic Development and Workforce Services Standing Committee · Sen. Johnson moved to pass 1st Substitute H.B. 508 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Johnson moved to pass 1st Substitute H.B. 508 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Johnson moved to pass 1st Substitute H.B. 508 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Johnson moved to pass 1st Substitute H.B. 508 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001939.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19896 · Sen. Johnson moved to pass 1st Substitute H.B. 508 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 562 — Law Enforcement and Criminal Justice Amendments  (2025GS/HB0562) ─────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 562' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0562: measure absent, committee votes skipped';
  ELSE
    -- 2025-03-03 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.
    --   printed tally 9-1-1 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'gwynn_h6', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'lisa_shepherd', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001910.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19948 · Rep. Hall moved to pass 1st Substitute H.B. 562 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 97 — Emergency Shelter Amendments  (2025GS/SB0097) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 97' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0097: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-24 · Senate Government Operations and Political Subdivisions Standing Committee · Sen. Plumb moved to pass S.B. 97 out favorably.
    --   printed tally 5-1-1 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.'),
      (m_id, 'daniel_thatcher', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.'),
      (m_id, 'jennifer_plumb', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', false, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2025-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000420.pdf', 'Senate Government Operations and Political Subdivisions Standing Committee · meeting 19638 · Sen. Plumb moved to pass S.B. 97 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 102 — Public Education Reporting Amendments  (2025GS/SB0102) ───────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 102' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0102: measure absent, committee votes skipped';
  ELSE
    -- 2025-01-27 · Senate Education Standing Committee · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.
    --   printed tally 4-1-2 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cwilson', 'committee_vote', true, '2025-01-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000623.pdf', 'Senate Education Standing Committee · meeting 19615 · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.'),
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-01-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000623.pdf', 'Senate Education Standing Committee · meeting 19615 · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-01-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000623.pdf', 'Senate Education Standing Committee · meeting 19615 · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-01-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000623.pdf', 'Senate Education Standing Committee · meeting 19615 · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2025-01-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00000623.pdf', 'Senate Education Standing Committee · meeting 19615 · Sen. Fillmore moved to pass 2nd Substitute S.B. 102 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 154 — Legislative Audit Amendments  (2025GS/SB0154) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 154' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0154: measure absent, committee votes skipped';
  ELSE
    -- 2025-03-03 · House Government Operations Standing Committee · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.
    --   printed tally 10-3-0 (yea-nay-absent); 13 of the 13 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'anthony_loubet', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'aromero', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'cory_maloy_h52', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'doug_fiefia', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'doug_welton', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'jason_thompson', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'paul_a_cutler', 'committee_vote', true, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2025-03-03T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001941.pdf', 'House Government Operations Standing Committee · meeting 19883 · Rep. Maloy moved to pass 1st Substitute S.B. 154 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 195 — Transportation Amendments  (2025GS/SB0195) ───────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 195' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0195: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-27 · House Transportation Standing Committee · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.
    --   printed tally 10-2-0 (yea-nay-absent); 12 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'ashlee_matthews', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'calvin_roberts', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'clinton_okerlund', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'defay_h15', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'ivory_h39', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'jake_sawyer', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'kristen_chevrier', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'nthurston', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.'),
      (m_id, 'rosalba_dominguez', 'committee_vote', false, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001852.pdf', 'House Transportation Standing Committee · meeting 19911 · Rep. Ivory moved to pass 5th Substitute S.B. 195 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 262 — Housing Affordability Modifications  (2025GS/SB0262) ─────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 262' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0262: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-18 · Senate Economic Development and Workforce Services Standing Committee · Sen. Johnson moved to pass S.B. 262 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001719.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19767 · Sen. Johnson moved to pass S.B. 262 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001719.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19767 · Sen. Johnson moved to pass S.B. 262 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001719.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19767 · Sen. Johnson moved to pass S.B. 262 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2025-02-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001719.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19767 · Sen. Johnson moved to pass S.B. 262 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2025-03-04 · House Transportation Standing Committee · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.
    --   printed tally 8-2-2 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'ashlee_matthews', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'calvin_roberts', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'clinton_okerlund', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'defay_h15', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'ivory_h39', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'jake_sawyer', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'nthurston', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.'),
      (m_id, 'rosalba_dominguez', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001934.pdf', 'House Transportation Standing Committee · meeting 19914 · Rep. Roberts moved to pass 2nd Substitute S.B. 262 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 272 — Micro-education Entity Amendments  (2025GS/SB0272) ───────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 272' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0272: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-20 · Senate Education Standing Committee · Sen. Fillmore moved to pass S.B. 272 out favorably.
    --   printed tally 5-1-1 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.'),
      (m_id, 'heidi_balderree', 'committee_vote', true, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', true, '2025-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001760.pdf', 'Senate Education Standing Committee · meeting 19772 · Sen. Fillmore moved to pass S.B. 272 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── VERIFICATION ────────────────────────────────────────────────────────────
-- Fails loudly rather than leaving a half-written committee record behind.
DO $$
DECLARE n_pos integer; n_floorish integer; n_nosrc integer; n_measures integer;
BEGIN
  SELECT count(*) INTO n_pos FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS';
  IF n_pos <> 241 THEN
    RAISE EXCEPTION 'expected 241 Utah 2025GS committee_vote positions, found %', n_pos;
  END IF;
  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS';
  IF n_measures <> 24 THEN
    RAISE EXCEPTION 'expected 24 bills with Utah 2025GS committee votes, found %', n_measures;
  END IF;
  -- A committee act must never have been written as a roll call.
  SELECT count(*) INTO n_floorish FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.external_ids->>'utahSession' = '2025GS'
     AND r.action_type = 'committee_vote';
  IF n_floorish > 0 THEN
    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;
  END IF;
  -- Every act carries the published PDF it was confirmed against.
  SELECT count(*) INTO n_nosrc FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS'
     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf');
  IF n_nosrc > 0 THEN
    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;
  END IF;
END $$;
