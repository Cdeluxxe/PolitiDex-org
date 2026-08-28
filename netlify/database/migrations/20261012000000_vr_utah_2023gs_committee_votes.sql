-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah 2023 committee votes as formal acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 303 committee votes — 40 committee actions on 27 bills
-- already in the formal lane for 2023GS — written as
-- vr_positions rows with action_type = 'committee_vote'. That action type already
-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";
-- nothing about weights, labels or floors is changed by this file.
--
-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call
-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a
-- space the floor already owns. vr_positions has no roll_number column at all, so
-- these 303 rows cannot collide with any floor roll number, in this session or
-- another. The meeting is identified in each row's note and source URL instead.
--
-- AND IT DOES NOT DOUBLE COUNT. 207 of these rows belong to a member
-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every
-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts
-- leaves those rows out of the coverage count for the same reason. They are written
-- because they happened, not to add depth: the depth this file adds is the other
-- 96 rows, where the committee record is the only record of that member on
-- that bill.
--
-- WHAT IS NOT HERE. No measures and no issue mappings: a committee act reuses the
-- parent bill's reviewed keys, and a bill with no reviewed mapping is refused rather
-- than mapped on the strength of a committee vote. No sponsorships. No absences —
-- an absence is not a recorded position. No procedural motions (amend, replace,
-- hold, calendar): vr_positions has no field for an inverted direction, so a motion
-- whose yea does not mean "advance this bill" is left out rather than guessed at.
-- 9 later reprints of a committee's own vote on the same bill are dropped, so a
-- member holds one committee act per bill. And no near-unanimous committee vote: the
-- same 10%-minority bar the floor roll calls were selected under applies here, which
-- is why 27 bills are represented and not the 40 that had a committee vote at all.
--
-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date; they do not
-- timestamp the individual motion. acted_at is therefore that date at midnight
-- Mountain Standard Time, which is the session's own clock, rather than a guess at
-- the hour taken from the meeting's start time.
--
-- SOURCES. Every row carries the published minutes PDF it was confirmed against.
--   committees        https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=2023
--   meetings          https://le.utah.gov/committee/getMeetingInfo.jsp?com=<COM>&yr=2023
--   one meeting       https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=<ID>
--   minutes, machine  https://le.utah.gov/MtgMinutes/PublicMinutes
--                       ?requestType=getMeetingInfo&meetingID=<ID>
--   minutes, PDF      https://le.utah.gov/interim/2023/pdf/<N>.pdf
--
-- REPRODUCING IT. scripts/vr-utah-committee-ingest.mjs --survey --session 2023GS
-- (network), then --collect (reads the cache, drafts the printed-name map), then
-- --seed and --sql. The seed is committed at db/vr-utah-committee-seed-2023GS.json;
-- the reviewed name table at db/vr-utah-committee-map-2023GS.json.
--
-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique
-- (measure_id, politician_id, action_type). No DDL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── H.B. 105 — Public Employee Disability Benefits Amendments  (2023GS/HB0105) ──────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 105' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0105: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-10 · House Government Operations Standing Committee · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.
    --   printed tally 9-2-1 (yea-nay-absent); 11 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'bolinder_h68', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'cmusselman', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'cory_maloy_h52', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'doug_welton', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'nthurston', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001981.pdf', 'House Government Operations Standing Committee · meeting 18613 · Rep. Dailey-Provost moved to pass H.B. 105 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 107 — Concealed Weapons Permit Fee Amendments  (2023GS/HB0107) ─────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 107' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0107: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-02 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Burton moved to pass H.B. 107 out favorably.
    --   printed tally 8-2-3 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'gwynn_h6', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Burton moved to pass H.B. 107 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-14 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Kennedy moved to pass H.B. 107 out favorably.
    --   printed tally 2-1-3 (yea-nay-absent); 2 of the 3 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'lescamilla', 'committee_vote', false, '2023-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002018.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18646 · Sen. Kennedy moved to pass H.B. 107 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2023-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002018.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18646 · Sen. Kennedy moved to pass H.B. 107 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 114 — Theft Defense Amendments  (2023GS/HB0114) ────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 114' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0114: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-01 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Kennedy moved to pass 1st Substitute H.B. 114 out favorably.
    --   printed tally 3-2-1 (yea-nay-absent); 4 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'jstevenson', 'committee_vote', true, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001604.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18559 · Sen. Kennedy moved to pass 1st Substitute H.B. 114 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001604.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18559 · Sen. Kennedy moved to pass 1st Substitute H.B. 114 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001604.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18559 · Sen. Kennedy moved to pass 1st Substitute H.B. 114 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001604.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18559 · Sen. Kennedy moved to pass 1st Substitute H.B. 114 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 131 — Vaccine Passport Prohibition  (2023GS/HB0131) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 131' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0131: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-08 · Senate Health and Human Services Standing Committee · Sen. Buxton moved to pass H.B. 131 out favorably.
    --   printed tally 3-2-2 (yea-nay-absent); 4 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'david_buxton', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001949.pdf', 'Senate Health and Human Services Standing Committee · meeting 18599 · Sen. Buxton moved to pass H.B. 131 out favorably.'),
      (m_id, 'jacob_anderegg', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001949.pdf', 'Senate Health and Human Services Standing Committee · meeting 18599 · Sen. Buxton moved to pass H.B. 131 out favorably.'),
      (m_id, 'jennifer_plumb', 'committee_vote', false, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001949.pdf', 'Senate Health and Human Services Standing Committee · meeting 18599 · Sen. Buxton moved to pass H.B. 131 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001949.pdf', 'Senate Health and Human Services Standing Committee · meeting 18599 · Sen. Buxton moved to pass H.B. 131 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 165 — Firearm Discharge on Private Property Amendments  (2023GS/HB0165) ────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 165' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0165: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-02 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.
    --   printed tally 9-2-2 (yea-nay-absent); 11 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'gwynn_h6', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'tlee', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Gwynn moved to pass 1st Substitute H.B. 165 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 208 — Criminal Trespass Amendments  (2023GS/HB0208) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 208' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0208: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-07 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Kohler moved to pass H.B. 208 out favorably.
    --   printed tally 8-3-3 (yea-nay-absent); 11 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'chew_h68', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', false, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'kohler_h59', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'tim_jimenez', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.'),
      (m_id, 'walt_brooks', 'committee_vote', true, '2023-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001912.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 18582 · Rep. Kohler moved to pass H.B. 208 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-21 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.
    --   printed tally 5-3-0 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002140.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18696 · Sen. Sandall moved to pass 1st Substitute H.B. 208 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 215 — Funding for Teacher Salaries and Optional Education Opportunities  (2023GS/HB0215) ──
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 215' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0215: measure absent, committee votes skipped';
  ELSE
    -- 2023-01-19 · House Education Standing Committee · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.
    --   printed tally 12-4-0 (yea-nay-absent); 15 of the 16 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'jefferson_moss', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', false, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'mschultz', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', false, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2023-01-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000432.pdf', 'House Education Standing Committee · meeting 18488 · Rep. Lisonbee moved to pass 1st Substitute H.B. 215 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-01-23 · Senate Education Standing Committee · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.
    --   printed tally 7-2-0 (yea-nay-absent); 9 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', false, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'jstevenson', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.'),
      (m_id, 'sadams', 'committee_vote', true, '2023-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000829.pdf', 'Senate Education Standing Committee · meeting 18506 · Sen. Grover moved to pass 3rd Substitute H.B. 215 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 217 — School Energy and Water Reductions  (2023GS/HB0217) ──────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 217' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0217: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-01 · House Education Standing Committee · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.
    --   printed tally 3-8-5 (yea-nay-absent); 10 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', true, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', false, '2023-02-01T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001747.pdf', 'House Education Standing Committee · meeting 18555 · Rep. Romero moved to pass 1st Substitute H.B. 217 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-23 · House Education Standing Committee · Rep. Romero moved to pass 2nd Substitute H.B. 217 out favorably.
    --   printed tally 9-2-5 (yea-nay-absent); 1 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Romero moved to pass 2nd Substitute H.B. 217 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 219 — Firearms Regulations  (2023GS/HB0219) ────────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 219' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0219: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-02 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.
    --   printed tally 8-2-3 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'gwynn_h6', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001690.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18566 · Rep. Hall moved to pass 1st Substitute H.B. 219 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-28 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.
    --   printed tally 4-2-2 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Vickers moved to pass 2nd Substitute H.B. 219 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 243 — Public Transit Employee Collective Bargaining Amendments  (2023GS/HB0243) ────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 243' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0243: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-02 · House Transportation Standing Committee · Chair Peterson moved to pass H.B. 243 out favorably.
    --   printed tally 5-3-4 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'ashlee_matthews', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'brett_garner', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'doug_welton', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'jeffrey_stenquist', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'nelson_abbott', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001798.pdf', 'House Transportation Standing Committee · meeting 18562 · Chair Peterson moved to pass H.B. 243 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-10 · Senate Business and Labor Standing Committee · Sen. Sandall moved to pass H.B. 243 out favorably.
    --   printed tally 4-1-3 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001980.pdf', 'Senate Business and Labor Standing Committee · meeting 18614 · Sen. Sandall moved to pass H.B. 243 out favorably.'),
      (m_id, 'cbramble', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001980.pdf', 'Senate Business and Labor Standing Committee · meeting 18614 · Sen. Sandall moved to pass H.B. 243 out favorably.'),
      (m_id, 'dipson', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001980.pdf', 'Senate Business and Labor Standing Committee · meeting 18614 · Sen. Sandall moved to pass H.B. 243 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001980.pdf', 'Senate Business and Labor Standing Committee · meeting 18614 · Sen. Sandall moved to pass H.B. 243 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001980.pdf', 'Senate Business and Labor Standing Committee · meeting 18614 · Sen. Sandall moved to pass H.B. 243 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 281 — Social Credit Score Amendments  (2023GS/HB0281) ──────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 281' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0281: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-21 · Senate Business and Labor Standing Committee · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.
    --   printed tally 3-2-3 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002104.pdf', 'Senate Business and Labor Standing Committee · meeting 18691 · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.'),
      (m_id, 'cbramble', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002104.pdf', 'Senate Business and Labor Standing Committee · meeting 18691 · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002104.pdf', 'Senate Business and Labor Standing Committee · meeting 18691 · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002104.pdf', 'Senate Business and Labor Standing Committee · meeting 18691 · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002104.pdf', 'Senate Business and Labor Standing Committee · meeting 18691 · Sen. Sandall moved to pass 1st Substitute H.B. 281 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 289 — Blockchain Provider Registration  (2023GS/HB0289) ────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 289' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0289: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-02 · House Public Utilities and Energy Standing Committee · Rep. Lyman moved to pass H.B. 289 out favorably.
    --   printed tally 5-4-2 (yea-nay-absent); 8 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'james_cobb', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.'),
      (m_id, 'quinn_kotter', 'committee_vote', false, '2023-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001672.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18560 · Rep. Lyman moved to pass H.B. 289 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 347 — Ballot Drop Box Amendments  (2023GS/HB0347) ──────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 347' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0347: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-08 · House Government Operations Standing Committee · Rep. Maloy moved to pass H.B. 347 out favorably.
    --   printed tally 7-3-2 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'cmusselman', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'cory_maloy_h52', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'doug_welton', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', false, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'nthurston', 'committee_vote', false, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2023-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001947.pdf', 'House Government Operations Standing Committee · meeting 18592 · Rep. Maloy moved to pass H.B. 347 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-23 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Acting Chair Kennedy moved to pass H.B. 347 out favorably.
    --   printed tally 3-2-1 (yea-nay-absent); 4 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'daniel_thatcher', 'committee_vote', false, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002165.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18716 · Acting Chair Kennedy moved to pass H.B. 347 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002165.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18716 · Acting Chair Kennedy moved to pass H.B. 347 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002165.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18716 · Acting Chair Kennedy moved to pass H.B. 347 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002165.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18716 · Acting Chair Kennedy moved to pass H.B. 347 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 348 — Participation Waiver Amendments  (2023GS/HB0348) ─────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 348' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0348: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-13 · House Education Standing Committee · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.
    --   printed tally 10-3-3 (yea-nay-absent); 12 of the 13 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'mschultz', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', false, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001971.pdf', 'House Education Standing Committee · meeting 18627 · Rep. Birkeland moved to pass 1st Substitute H.B. 348 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 357 — Decentralized Autonomous Organizations Amendments  (2023GS/HB0357) ───────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 357' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0357: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-10 · House Public Utilities and Energy Standing Committee · Rep. Kyle moved to pass H.B. 357 out favorably.
    --   printed tally 5-4-2 (yea-nay-absent); 8 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'james_cobb', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.'),
      (m_id, 'quinn_kotter', 'committee_vote', false, '2023-02-10T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001952.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18606 · Rep. Kyle moved to pass H.B. 357 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 398 — Special Needs Opportunity Scholarship Program Amendments  (2023GS/HB0398) ────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 398' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0398: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-21 · House Education Standing Committee · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.
    --   printed tally 8-2-6 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002133.pdf', 'House Education Standing Committee · meeting 18681 · Rep. Pierucci moved to pass 1st Substitute H.B. 398 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-27 · Senate Education Standing Committee · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.
    --   printed tally 5-1-3 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'jstevenson', 'committee_vote', true, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.'),
      (m_id, 'sadams', 'committee_vote', true, '2023-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002289.pdf', 'Senate Education Standing Committee · meeting 18747 · Sen. Fillmore moved to pass 1st Substitute H.B. 398 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 425 — Energy Security Amendments  (2023GS/HB0425) ──────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 425' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0425: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-15 · House Public Utilities and Energy Standing Committee · Rep. Albrecht moved to pass H.B. 425 out favorably.
    --   printed tally 7-2-2 (yea-nay-absent); 8 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'james_cobb', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.'),
      (m_id, 'quinn_kotter', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002028.pdf', 'House Public Utilities and Energy Standing Committee · meeting 18651 · Rep. Albrecht moved to pass H.B. 425 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-24 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.
    --   printed tally 6-2-0 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002233.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18738 · Sen. Sandall moved to pass 3rd Substitute H.B. 425 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 427 — Individual Freedom in Public Education  (2023GS/HB0427) ──────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 427' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0427: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-24 · House Education Standing Committee · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.
    --   printed tally 7-2-7 (yea-nay-absent); 8 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002228.pdf', 'House Education Standing Committee · meeting 18735 · Rep. Elison moved to pass 1st Substitute H.B. 427 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 461 — Airport Firearm Possession Amendments  (2023GS/HB0461) ───────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 461' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0461: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-22 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Lisonbee moved to pass H.B. 461 out favorably.
    --   printed tally 5-3-5 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'gwynn_h6', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'mballard', 'committee_vote', false, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'tlee', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', false, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002141.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 18699 · Rep. Lisonbee moved to pass H.B. 461 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-28 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.
    --   printed tally 3-2-3 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002294.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18755 · Sen. Sandall moved to pass 2nd Substitute H.B. 461 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 465 — Public School Library Transparency Amendments  (2023GS/HB0465) ───────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 465' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0465: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-23 · House Education Standing Committee · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.
    --   printed tally 10-2-4 (yea-nay-absent); 11 of the 12 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002205.pdf', 'House Education Standing Committee · meeting 18713 · Rep. Birkeland moved to pass 1st Substitute H.B. 465 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-28 · Senate Economic Development and Workforce Services Standing Committee · Sen. Owens moved to pass 1st Substitute H.B. 465 out favorably.
    --   printed tally 2-1-3 (yea-nay-absent); 3 of the 3 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002281.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18772 · Sen. Owens moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002281.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18772 · Sen. Owens moved to pass 1st Substitute H.B. 465 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2023-02-28T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002281.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18772 · Sen. Owens moved to pass 1st Substitute H.B. 465 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 467 — Abortion Changes  (2023GS/HB0467) ────────────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 467' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0467: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-15 · House Judiciary Standing Committee · Rep. Clancy moved to pass H.B. 467 out favorably.
    --   printed tally 9-2-1 (yea-nay-absent); 11 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'brian_king', 'committee_vote', false, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'cheryl_acton', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'james_cobb', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'jon_hawkins', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'mark_wheatley', 'committee_vote', false, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'nelson_abbott', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2023-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002055.pdf', 'House Judiciary Standing Committee · meeting 18662 · Rep. Clancy moved to pass H.B. 467 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-02-22 · Senate Health and Human Services Standing Committee · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.
    --   printed tally 5-2-0 (yea-nay-absent); 6 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cwilson', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.'),
      (m_id, 'jacob_anderegg', 'committee_vote', true, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.'),
      (m_id, 'jennifer_plumb', 'committee_vote', false, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2023-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002176.pdf', 'Senate Health and Human Services Standing Committee · meeting 18708 · Chair Kennedy moved to pass 2nd Substitute H.B. 467 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 16 — Transgender Medical Treatments and Procedures Amendments  (2023GS/SB0016) ────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 16' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0016: measure absent, committee votes skipped';
  ELSE
    -- 2023-01-18 · Senate Health and Human Services Standing Committee · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.
    --   printed tally 5-2-0 (yea-nay-absent); 6 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cwilson', 'committee_vote', true, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.'),
      (m_id, 'jacob_anderegg', 'committee_vote', true, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.'),
      (m_id, 'jennifer_plumb', 'committee_vote', false, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2023-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000381.pdf', 'Senate Health and Human Services Standing Committee · meeting 18481 · Sen. Vickers moved to pass 1st Substitute S.B. 16 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2023-01-24 · House Health and Human Services Standing Committee · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.
    --   printed tally 11-3-0 (yea-nay-absent); 13 of the 14 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'anthony_loubet', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'cheryl_acton', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'ivory_h39', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', false, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'quinn_kotter', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'robert_spendlove', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'rosemary_lesser', 'committee_vote', false, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'rward', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.'),
      (m_id, 'tim_jimenez', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000887.pdf', 'House Health and Human Services Standing Committee · meeting 18513 · Rep. Ward moved to pass 2nd Substitute S.B. 16 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 118 — Water Efficient Landscaping Incentives  (2023GS/SB0118) ──────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 118' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0118: measure absent, committee votes skipped';
  ELSE
    -- 2023-01-24 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.
    --   printed tally 5-1-2 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', false, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2023-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00000832.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 18515 · Sen. Sandall moved to pass 1st Substitute S.B. 118 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 156 — Investigative Genetic Genealogy Modifications  (2023GS/SB0156) ───────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 156' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0156: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-13 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Kennedy moved to pass 2nd Substitute S.B. 156 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 3 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'kcullimore', 'committee_vote', false, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001972.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18629 · Sen. Kennedy moved to pass 2nd Substitute S.B. 156 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001972.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18629 · Sen. Kennedy moved to pass 2nd Substitute S.B. 156 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2023-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00001972.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 18629 · Sen. Kennedy moved to pass 2nd Substitute S.B. 156 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 174 — Local Land Use and Development Revisions  (2023GS/SB0174) ────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 174' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0174: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-24 · House Government Operations Standing Committee · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.
    --   printed tally 7-4-1 (yea-nay-absent); 11 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'bolinder_h68', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'cmusselman', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'cory_maloy_h52', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'doug_welton', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'gricius_h50', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'jennifer_dailey_provost', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'nthurston', 'committee_vote', false, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', true, '2023-02-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002207.pdf', 'House Government Operations Standing Committee · meeting 18732 · Rep. Stoddard moved to pass 1st Substitute S.B. 174 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 217 — Children's Health Coverage Amendments  (2023GS/SB0217) ───────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 217' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0217: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-21 · Senate Health and Human Services Standing Committee · Sen. Anderegg moved to pass S.B. 217 out favorably.
    --   printed tally 5-1-1 (yea-nay-absent); 5 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cwilson', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002103.pdf', 'Senate Health and Human Services Standing Committee · meeting 18685 · Sen. Anderegg moved to pass S.B. 217 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002103.pdf', 'Senate Health and Human Services Standing Committee · meeting 18685 · Sen. Anderegg moved to pass S.B. 217 out favorably.'),
      (m_id, 'jacob_anderegg', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002103.pdf', 'Senate Health and Human Services Standing Committee · meeting 18685 · Sen. Anderegg moved to pass S.B. 217 out favorably.'),
      (m_id, 'jennifer_plumb', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002103.pdf', 'Senate Health and Human Services Standing Committee · meeting 18685 · Sen. Anderegg moved to pass S.B. 217 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', true, '2023-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002103.pdf', 'Senate Health and Human Services Standing Committee · meeting 18685 · Sen. Anderegg moved to pass S.B. 217 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 271 — Home Ownership Requirements  (2023GS/SB0271) ─────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 271' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0271: measure absent, committee votes skipped';
  ELSE
    -- 2023-02-23 · Senate Economic Development and Workforce Services Standing Committee · Sen. McKell moved to pass S.B. 271 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002206.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18721 · Sen. McKell moved to pass S.B. 271 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', false, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002206.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18721 · Sen. McKell moved to pass S.B. 271 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002206.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18721 · Sen. McKell moved to pass S.B. 271 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', true, '2023-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2023/pdf/00002206.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 18721 · Sen. McKell moved to pass S.B. 271 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── VERIFICATION ────────────────────────────────────────────────────────────
-- Fails loudly rather than leaving a half-written committee record behind.
DO $$
DECLARE n_pos integer; n_floorish integer; n_nosrc integer; n_measures integer;
BEGIN
  -- This lane only: the committee-only bills the mapping lane writes carry
  -- committeeOnly on the measure and are counted by that lane, not this one.
  SELECT count(*) INTO n_pos FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2023GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_pos <> 303 THEN
    RAISE EXCEPTION 'expected 303 Utah 2023GS seed-lane committee_vote positions, found %', n_pos;
  END IF;
  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2023GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_measures <> 27 THEN
    RAISE EXCEPTION 'expected 27 bills with Utah 2023GS seed-lane committee votes, found %', n_measures;
  END IF;
  -- A committee act must never have been written as a roll call.
  SELECT count(*) INTO n_floorish FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.external_ids->>'utahSession' = '2023GS'
     AND r.action_type = 'committee_vote';
  IF n_floorish > 0 THEN
    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;
  END IF;
  -- Every act carries the published PDF it was confirmed against.
  SELECT count(*) INTO n_nosrc FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2023GS'
     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf');
  IF n_nosrc > 0 THEN
    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;
  END IF;
END $$;
