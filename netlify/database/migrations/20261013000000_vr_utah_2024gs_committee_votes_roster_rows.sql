-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah 2024 committee votes as formal acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS RESTATES. 164 committee votes — 20 committee actions on 13 bills
-- already in the formal lane for 2024GS — re-emitted in full so the rows that are
-- genuinely new can land. Whatever the database already holds is a no-op; how many of
-- these rows are new depends on which 2024GS committee migrations have been applied,
-- which is a fact about the database and not about this file, so no count is claimed
-- for it here. They are written as
-- vr_positions rows with action_type = 'committee_vote'. That action type already
-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";
-- nothing about weights, labels or floors is changed by this file.
--
-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call
-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a
-- space the floor already owns. vr_positions has no roll_number column at all, so
-- these 164 rows cannot collide with any floor roll number, in this session or
-- another. The meeting is identified in each row's note and source URL instead.
--
-- AND IT DOES NOT DOUBLE COUNT. 128 of these rows belong to a member
-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every
-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts
-- leaves those rows out of the coverage count for the same reason. They are written
-- because they happened, not to add depth: the depth this file adds is the other
-- 36 rows, where the committee record is the only record of that member on
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
-- is why 13 bills are represented and not the 29 that had a committee vote at all.
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
-- THIS IS A DELTA, NOT THE WHOLE SEED. 2024GS's committee votes already shipped in
-- an earlier migration and that file is applied, so it is not edited. This one
-- carries only the 13 bill(s) whose rows changed afterwards:
--   HB0153 · H.B. 153 · 1 act(s), 9 position(s)
--   HB0182 · H.B. 182 · 2 act(s), 14 position(s)
--   HB0215 · H.B. 215 · 2 act(s), 14 position(s)
--   HB0261 · H.B. 261 · 1 act(s), 14 position(s)
--   HB0269 · H.B. 269 · 1 act(s), 7 position(s)
--   HB0348 · H.B. 348 · 2 act(s), 16 position(s)
--   HB0374 · H.B. 374 · 2 act(s), 13 position(s)
--   HB0405 · H.B. 405 · 1 act(s), 9 position(s)
--   HB0471 · H.B. 471 · 1 act(s), 13 position(s)
--   HB0529 · H.B. 529 · 1 act(s), 9 position(s)
--   SB0057 · S.B. 57 · 2 act(s), 17 position(s)
--   SB0069 · S.B. 69 · 2 act(s), 14 position(s)
--   SB0161 · S.B. 161 · 2 act(s), 15 position(s)
--
-- WHY THEY CHANGED.
-- Two causes, neither of them a moved fence. (1) Twelve of the thirteen
-- bills gained positions because fourteen legislators who cast recorded
-- committee votes in 2024 had no roster record at all, so the ingest could
-- not attribute their votes to a human and dropped them: 25 of the 40 rows
-- this delta adds are theirs. Wave 6 added their identity rows to
-- cmp-data.js from the Legislature's own 2024 roster page and resolved their
-- printed forms through the new unique_surname_on_session_roster door in
-- db/vr-utah-committee-map-2024GS.json. (2) HB0348 is new to this lane, with
-- both of its acts and the remaining 15 rows, because the vocabulary wave V1
-- (20261010000000) gave it a reviewed sound_money mapping in
-- db/vr-utah-vote-seed-2024GS.json. A bill with no reviewed issue keys is
-- off-lane by rule; once V1 reviewed the key, its committee votes were
-- admissible under the rules already in force. The seven admission rules,
-- the 10-percent-minority contestedness bar, the four-way cross-check
-- against the published PDF and the 0.60 committee_vote weight are all
-- unchanged.
--
-- Each block is the same generated block as before, unmodified: it selects the
-- measure before inserting and ends ON CONFLICT DO NOTHING, so re-stating a bill the
-- database already holds is a no-op and only genuinely new rows land. The
-- VERIFICATION block at the foot asserts this lane's whole end state
-- (214 positions on 21 bills), not this file's 164 on 13, because it runs
-- after every 2024GS committee migration has been applied. The committee-only
-- measures written by the mapping lane are excluded from that count by their own
-- committeeOnly flag, so a later mapping wave cannot move it. Regenerate this exact
-- file with --sql --session 2024GS --bills
--   HB0153,HB0182,HB0215,HB0261,HB0269,HB0348,HB0374,HB0405,HB0471,HB0529,SB0057,SB0069,SB0161
--
-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique
-- (measure_id, politician_id, action_type). No DDL.
-- ─────────────────────────────────────────────────────────────────────────────

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
    --   printed tally 6-4-3 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'joel_briscoe', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001629.pdf', 'House Revenue and Taxation Standing Committee · meeting 19338 · Rep. Strong moved to pass 2nd Substitute H.B. 153 out favorably.')
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
    --   printed tally 9-2-4 (yea-nay-absent); 10 of the 11 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Peterson moved to pass 2nd Substitute H.B. 182 out favorably.'),
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
    --   printed tally 9-1-1 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'james_cobb', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 2nd Substitute H.B. 215 out favorably as amended.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-27 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.
    --   printed tally 4-1-3 (yea-nay-absent); 5 of the 5 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'kgrover', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001929.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19324 · Sen. Derrin R. Owens moved to pass 2nd Substitute H.B. 215 out favorably.')
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
    --   printed tally 12-2-1 (yea-nay-absent); 14 of the 14 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'jefferson_moss', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000540.pdf', 'House Education Standing Committee · meeting 19010 · Rep. Lisonbee moved to pass 1st Substitute H.B. 261 out favorably.'),
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
    --   printed tally 6-2-7 (yea-nay-absent); 7 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001660.pdf', 'House Education Standing Committee · meeting 19187 · Rep. Birkeland moved to pass 1st Substitute H.B. 269 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── H.B. 348 — Precious Metals Amendments  (2024GS/HB0348) ──────────────────────────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 348' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'HB0348: measure absent, committee votes skipped';
  ELSE
    -- 2024-02-14 · House Revenue and Taxation Standing Committee · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.
    --   printed tally 8-2-3 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'joel_briscoe', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'kay_christofferson', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'mark_strong', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Christofferson moved to pass 1st Substitute H.B. 348 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-02-26 · Senate Business and Labor Standing Committee · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.
    --   printed tally 5-2-1 (yea-nay-absent); 7 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'cbramble', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'kcullimore', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', false, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'mccay_s11', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.'),
      (m_id, 'tweiler', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001918.pdf', 'Senate Business and Labor Standing Committee · meeting 19204 · Sen. Cullimore moved to pass 1st Substitute H.B. 348 out favorably.')
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
    --   printed tally 7-2-2 (yea-nay-absent); 9 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
      (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Elison moved to pass H.B. 374 out favorably.'),
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
    --   printed tally 8-1-3 (yea-nay-absent); 9 of the 9 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'brian_king', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001691.pdf', 'House Judiciary Standing Committee · meeting 19361 · Rep. Shipp moved to pass 1st Substitute H.B. 405 out favorably as amended.'),
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
    --   printed tally 11-2-1 (yea-nay-absent); 13 of the 13 named voters are on the PolitiDex roster
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
      (m_id, 'steven_lund', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
      (m_id, 'tim_jimenez', 'committee_vote', true, '2024-02-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001884.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19314 · Rep. Stratton moved to pass H.B. 471 out favorably as amended.'),
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
    --   printed tally 9-1-5 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'hall_h11', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.'),
      (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Hall moved to pass 1st Substitute H.B. 529 out favorably.')
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
    --   printed tally 5-2-1 (yea-nay-absent); 7 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'blouin_s13', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'david_buxton', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'dowens_st', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'evickers', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'rwinterton', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'ssandall', 'committee_vote', true, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.'),
      (m_id, 'stephanie_pitcher', 'committee_vote', false, '2024-01-17T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000290.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19022 · Sen. Sandall moved to pass 1st Substitute S.B. 57 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
    -- 2024-01-24 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.
    --   printed tally 8-2-4 (yea-nay-absent); 10 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'chew_h68', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'christine_watkins', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'kstratton', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'rshipp', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'steven_lund', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'thomas_peterson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
      (m_id, 'tim_jimenez', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000743.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19039 · Rep. Stratton moved to pass 2nd Substitute S.B. 57 out favorably.'),
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
    --   printed tally 5-2-6 (yea-nay-absent); 6 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'doug_owens', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
      (m_id, 'joel_briscoe', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001828.pdf', 'House Revenue and Taxation Standing Committee · meeting 19349 · Rep. Lyman moved to pass S.B. 69 out favorably.'),
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
    --   printed tally 9-1-1 (yea-nay-absent); 9 of the 10 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'aromero', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'carl_albrecht', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'colin_w_jack', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'james_cobb', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.'),
      (m_id, 'mike_petersen', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001816.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19245 · Rep. MacPherson moved to pass 5th Substitute S.B. 161 out favorably.')
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
     AND m.external_ids->>'utahSession' = '2024GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_pos <> 214 THEN
    RAISE EXCEPTION 'expected 214 Utah 2024GS seed-lane committee_vote positions, found %', n_pos;
  END IF;
  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2024GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_measures <> 21 THEN
    RAISE EXCEPTION 'expected 21 bills with Utah 2024GS seed-lane committee votes, found %', n_measures;
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
