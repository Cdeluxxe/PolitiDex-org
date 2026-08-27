-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah 2024 committee votes as formal acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 174 committee votes — 26 committee actions on 20 bills
-- already in the formal lane for 2024GS — written as
-- vr_positions rows with action_type = 'committee_vote'. That action type already
-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";
-- nothing about weights, labels or floors is changed by this file.
--
-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call
-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a
-- space the floor already owns. vr_positions has no roll_number column at all, so
-- these 174 rows cannot collide with any floor roll number, in this session or
-- another. The meeting is identified in each row's note and source URL instead.
--
-- AND IT DOES NOT DOUBLE COUNT. 162 of these rows belong to a member
-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every
-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts
-- leaves those rows out of the coverage count for the same reason. They are written
-- because they happened, not to add depth: the depth this file adds is the other
-- 12 rows, where the committee record is the only record of that member on
-- that bill.
--
-- WHAT IS NOT HERE. No measures and no issue mappings: a committee act reuses the
-- parent bill's reviewed keys, and a bill with no reviewed mapping is refused rather
-- than mapped on the strength of a committee vote. No sponsorships. No absences —
-- an absence is not a recorded position. No procedural motions (amend, replace,
-- hold, calendar): vr_positions has no field for an inverted direction, so a motion
-- whose yea does not mean "advance this bill" is left out rather than guessed at.
-- 0 later reprints of a committee's own vote on the same bill are dropped, so a
-- member holds one committee act per bill. And no near-unanimous committee vote: the
-- same 10%-minority bar the floor roll calls were selected under applies here, which
-- is why 20 bills are represented and not the 28 that had a committee vote at all.
--
-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date; they do not
-- timestamp the individual motion. acted_at is therefore that date at midnight
-- Mountain Standard Time, which is the session's own clock, rather than a guess at
-- the hour taken from the meeting's start time.
--
-- SOURCES. Every row carries the published minutes PDF it was confirmed against.
--   committees        https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=2024
--   meetings          https://le.utah.gov/committee/getMeetingInfo.jsp?com=<COM>&yr=2024
--   one meeting       https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=<ID>
--   minutes, machine  https://le.utah.gov/MtgMinutes/PublicMinutes
--                       ?requestType=getMeetingInfo&meetingID=<ID>
--   minutes, PDF      https://le.utah.gov/interim/2024/pdf/<N>.pdf
--
-- REPRODUCING IT. scripts/vr-utah-committee-ingest.mjs --survey --session 2024GS
-- (network), then --collect (reads the cache, drafts the printed-name map), then
-- --seed and --sql. The seed is committed at db/vr-utah-committee-seed-2024GS.json;
-- the reviewed name table at db/vr-utah-committee-map-2024GS.json.
--
-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique
-- (measure_id, politician_id, action_type). No DDL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── H.B. 68 — Drug Sentencing Modifications  (2024GS/HB0068) ───────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 68' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0068: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-18 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Ballard moved to pass H.B. 68 out favorably.
    --   printed tally 7-2-3 (yea-nay-absent); 9 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'mballard', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'sahara_hayes', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'tlee', 'committee_vote', false, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.'),
      (m_id, 'whyte_h63', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000498.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19014 · Rep. Ballard moved to pass H.B. 68 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 119 — School Employee Firearm Possession Amendments  (2024GS/HB0119) ───────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 119' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0119: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-22 · House Law Enforcement and Criminal Justice Standing Committee · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.
    --   printed tally 5-3-4 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'andrew_stoddard', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'gwynn_h6', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'hollins_h24', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'jefferson_burton', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'mballard', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'ryan_d_wilcox', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.'),
      (m_id, 'sahara_hayes', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001853.pdf', 'House Law Enforcement and Criminal Justice Standing Committee · meeting 19331 · Rep. Burton moved to pass 1st Substitute H.B. 119 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 153 — Child Care Revisions  (2024GS/HB0153) ────────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 153' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0153: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-13 · House Revenue and Taxation Standing Committee · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.
    --   printed tally 6-4-3 (yea-nay-absent); 8 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 165 — Federal Law Enforcement Amendments  (2024GS/HB0165) ──────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 165' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0165: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-27 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.
    --   printed tally 4-2-0 (yea-nay-absent); 5 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'daniel_thatcher', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001933.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19239 · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'jstevenson', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001933.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19239 · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001933.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19239 · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001933.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19239 · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001933.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19239 · Sen. Kennedy moved to pass 1st Substitute H.B. 165 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 182 — Student Survey Amendments  (2024GS/HB0182) ───────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 182' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0182: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-23 · House Education Standing Committee · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.
    --   printed tally 9-2-4 (yea-nay-absent); 9 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-08 · Senate Education Standing Committee · Sen. Hinkins moved to pass 4th Substitute H.B. 182 out favorably.
    --   printed tally 3-1-5 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001477.pdf', 'Senate Education Standing Committee · meeting 19266 · Sen. Hinkins moved to pass 4th Substitute H.B. 182 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001477.pdf', 'Senate Education Standing Committee · meeting 19266 · Sen. Hinkins moved to pass 4th Substitute H.B. 182 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001477.pdf', 'Senate Education Standing Committee · meeting 19266 · Sen. Hinkins moved to pass 4th Substitute H.B. 182 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001477.pdf', 'Senate Education Standing Committee · meeting 19266 · Sen. Hinkins moved to pass 4th Substitute H.B. 182 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 215 — Home Solar Energy Amendments  (2024GS/HB0215) ────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 215' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0215: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-21 · House Public Utilities and Energy Standing Committee · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.
    --   printed tally 9-1-1 (yea-nay-absent); 7 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-27 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.
    --   printed tally 4-1-3 (yea-nay-absent); 4 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 257 — Sex-based Designations for Privacy, Anti-bullying, and Women's Opportunities  (2024GS/HB0257) ──
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 257' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0257: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-22 · Senate Business and Labor Standing Committee · Sen. Cullimore moved to pass H.B. 257 out favorably.
    --   printed tally 5-3-0 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'cbramble', 'committee_vote', true, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'dipson', 'committee_vote', true, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'mccay_s11', 'committee_vote', true, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', false, '2024-01-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000630.pdf', 'Senate Business and Labor Standing Committee · meeting 19056 · Sen. Cullimore moved to pass H.B. 257 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 261 — Equal Opportunity Initiatives  (2024GS/HB0261) ───────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 261' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0261: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-17 · House Education Standing Committee · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.
    --   printed tally 12-2-1 (yea-nay-absent); 11 of the 14 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'jefferson_moss', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'valpeterson_h56', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 269 — Public School History Curricula Amendments  (2024GS/HB0269) ──────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0269: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-13 · House Education Standing Committee · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.
    --   printed tally 6-2-7 (yea-nay-absent); 5 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 273 — Sentencing Modifications for Certain DUI Offenses  (2024GS/HB0273) ───────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 273' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0273: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-22 · Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · Sen. Escamilla moved to pass 2nd Substitute H.B. 273 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 3 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'daniel_thatcher', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001775.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19237 · Sen. Escamilla moved to pass 2nd Substitute H.B. 273 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001775.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19237 · Sen. Escamilla moved to pass 2nd Substitute H.B. 273 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001775.pdf', 'Senate Judiciary, Law Enforcement, and Criminal Justice Standing Committee · meeting 19237 · Sen. Escamilla moved to pass 2nd Substitute H.B. 273 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 374 — State Energy Policy Amendments  (2024GS/HB0374) ──────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 374' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0374: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-29 · House Public Utilities and Energy Standing Committee · Rep. Elison moved to pass H.B. 374 out favorably.
    --   printed tally 7-2-2 (yea-nay-absent); 8 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-12 · Senate Economic Development and Workforce Services Standing Committee · Sen. Derrin R. Owens moved to pass 1st Substitute H.B. 374 out favorably.
    --   printed tally 3-1-2 (yea-nay-absent); 4 of the 4 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001643.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19276 · Sen. Derrin R. Owens moved to pass 1st Substitute H.B. 374 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001643.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19276 · Sen. Derrin R. Owens moved to pass 1st Substitute H.B. 374 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001643.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19276 · Sen. Derrin R. Owens moved to pass 1st Substitute H.B. 374 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001643.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19276 · Sen. Derrin R. Owens moved to pass 1st Substitute H.B. 374 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 405 — Public Health Amendments  (2024GS/HB0405) ────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 405' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0405: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-14 · House Judiciary Standing Committee · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.
    --   printed tally 8-1-3 (yea-nay-absent); 6 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'rshipp', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 471 — Public Lands Possession Amendments  (2024GS/HB0471) ──────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 471' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0471: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-26 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Stratton moved to pass H.B. 471 out favorably as amended.
    --   printed tally 11-2-1 (yea-nay-absent); 11 of the 13 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'chew_h68', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'kohler_h59', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'rshipp', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'snider_h5', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 529 — Utah Fits All Scholarship Program Amendments  (2024GS/HB0529) ────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 529' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0529: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-20 · House Education Standing Committee · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.
    --   printed tally 9-1-5 (yea-nay-absent); 6 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 44 — Alternative Education Scholarship Combination  (2024GS/SB0044) ───────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 44' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0044: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-25 · Senate Education Standing Committee · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.
    --   printed tally 5-1-3 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.'),
      (m_id, 'dhinkins', 'committee_vote', true, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.'),
      (m_id, 'jstevenson', 'committee_vote', true, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2024-01-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000890.pdf', 'Senate Education Standing Committee · meeting 19066 · Sen. Hinkins moved to pass 1st Substitute S.B. 44 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 57 — Utah Constitutional Sovereignty Act  (2024GS/SB0057) ─────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 57' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0057: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-17 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.
    --   printed tally 5-2-1 (yea-nay-absent); 6 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-01-24 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.
    --   printed tally 8-2-4 (yea-nay-absent); 8 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'chew_h68', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'walt_brooks', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 69 — Income Tax Amendments  (2024GS/SB0069) ───────────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 69' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0069: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-24 · Senate Revenue and Taxation Standing Committee · Sen. Wilson moved to pass S.B. 69 out favorably.
    --   printed tally 7-1-0 (yea-nay-absent); 8 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'cbramble', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'cwilson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'dipson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'harper_s16', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'lescamilla', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.'),
      (m_id, 'mccay_s11', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000681.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19064 · Sen. Wilson moved to pass S.B. 69 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-23 · House Revenue and Taxation Standing Committee · Rep. Lyman moved to pass S.B. 69 out favorably.
    --   printed tally 5-2-6 (yea-nay-absent); 5 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 161 — Energy Security Amendments  (2024GS/SB0161) ──────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 161' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0161: measure absent, committee votes skipped';
  ELSE
    -- 2024-01-31 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.
    --   printed tally 4-2-2 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.'),
      (m_id, 'evickers', 'committee_vote', false, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001400.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19123 · Sen. Owens moved to pass 1st Substitute S.B. 161 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-22 · House Public Utilities and Energy Standing Committee · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.
    --   printed tally 9-1-1 (yea-nay-absent); 8 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 173 — Market Informed Compensation for Teachers  (2024GS/SB0173) ───────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 173' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0173: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-13 · Senate Education Standing Committee · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.
    --   printed tally 5-1-3 (yea-nay-absent); 6 of the 6 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'dhinkins', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.'),
      (m_id, 'kathleen_riebe', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.'),
      (m_id, 'lincoln_fillmore', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.'),
      (m_id, 'mckell_s25', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001648.pdf', 'Senate Education Standing Committee · meeting 19268 · Sen. Grover moved to pass 1st Substitute S.B. 173 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 268 — First Home Investment Zone Act  (2024GS/SB0268) ──────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 268' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0268: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-23 · Senate Business and Labor Standing Committee · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.
    --   printed tally 4-1-3 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001825.pdf', 'Senate Business and Labor Standing Committee · meeting 19202 · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001825.pdf', 'Senate Business and Labor Standing Committee · meeting 19202 · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001825.pdf', 'Senate Business and Labor Standing Committee · meeting 19202 · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001825.pdf', 'Senate Business and Labor Standing Committee · meeting 19202 · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001825.pdf', 'Senate Business and Labor Standing Committee · meeting 19202 · Sen. Kwan moved to pass 1st Substitute S.B. 268 out favorably.')
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
     AND m.external_ids->>'utahSession' = '2024GS';
  IF n_pos <> 174 THEN
    RAISE EXCEPTION 'expected 174 Utah 2024GS committee_vote positions, found %', n_pos;
  END IF;
  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2024GS';
  IF n_measures <> 20 THEN
    RAISE EXCEPTION 'expected 20 bills with Utah 2024GS committee votes, found %', n_measures;
  END IF;
  -- A committee act must never have been written as a roll call.
  SELECT count(*) INTO n_floorish FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.external_ids->>'utahSession' = '2024GS'
     AND r.action_type = 'committee_vote';
  IF n_floorish > 0 THEN
    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;
  END IF;
  -- Every act carries the published PDF it was confirmed against.
  SELECT count(*) INTO n_nosrc FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2024GS'
     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf');
  IF n_nosrc > 0 THEN
    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;
  END IF;
END $$;
