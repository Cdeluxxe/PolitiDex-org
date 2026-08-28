-- ─────────────────────────────────────────────────────────────────────────────
-- vr_measures / vr_measure_issues / vr_positions — Utah 2024GS committee-only measures
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 44 Utah bills whose committee rows changed after the earlier
-- 2024GS migration shipped, restated in full: 44 reviewed issue mappings and
-- 432 committee positions across 52 standing-committee actions, of which whatever
-- the database already holds is a no-op. Every one of these bills was already in the
-- committee ingest's refusal bucket for 2024GS: a CONTESTED pass-out-favorably vote,
-- confirmed against the published minutes PDF, with every voting name resolved through
-- the reviewed printed-name map — refused only because nobody had reviewed an issue
-- mapping for the parent bill. Wave 4 read the enrolled text and reviewed them.
--
-- WHERE THE MAPPINGS CAME FROM. db/vr-utah-committee-bills-2024GS.json, one entry per
-- bill, each carrying a direction, a weight, exactly one primary key and prose saying
-- what in the text supports it. 74 of the 140 bills in the bucket are REFUSED in the
-- same file, in writing. No issue key was added to the vocabulary for this pass.
--
-- NO FLOOR VOTES. These measures carry no vr_rollcalls row. A bill reaches this file
-- precisely because it has no admitted floor roll for 2024GS — its floor votes were
-- near-unanimous under the shipped 10%-minority bar, or it never reached a floor vote,
-- or it died in the second chamber. No floor action code was widened and no margin bar
-- was lowered to manufacture one. The consequence is stated rather than hidden:
-- 432 of the 432 positions are the member's ONLY act on that bill and all of them
-- count, because there is no floor vote on these measures for stance-helpers to
-- supersede them with (0 are superseded).
--
-- ACTION TYPE AND WEIGHT ARE UNCHANGED. 'committee_vote' at 0.60 in stance-helpers'
-- act table, printing as "Committee vote", exactly as 20261004000000 wrote it. This
-- file changes no weight, no label, no floor and no threshold.
--
-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date and do not
-- timestamp the motion, so acted_at is that date at midnight Mountain Standard Time.
--
-- SOURCES. Every measure cites its bill page; every position cites the minutes PDF the
-- act was confirmed against. Each measure's external_ids records which document the
-- mapping was read out of — enrolled text, or the last substitute where the bill never
-- enrolled — so a reader can check the mapping against the same file the curator used.
--
-- THIS IS A DELTA, NOT THE WHOLE SEED. The 2024GS committee mapping already shipped
-- in an earlier migration and that file is applied, so it is not edited. This one
-- carries only the 44 bill(s) whose rows changed afterwards:
--   HB0029 · H.B. 29
--   HB0059 · H.B. 59
--   HB0062 · H.B. 62
--   HB0097 · H.B. 97
--   HB0098 · H.B. 98
--   HB0111 · H.B. 111
--   HB0137 · H.B. 137
--   HB0141 · H.B. 141
--   HB0149 · H.B. 149
--   HB0161 · H.B. 161
--   HB0173 · H.B. 173
--   HB0186 · H.B. 186
--   HB0191 · H.B. 191
--   HB0241 · H.B. 241
--   HB0242 · H.B. 242
--   HB0267 · H.B. 267
--   HB0289 · H.B. 289
--   HB0303 · H.B. 303
--   HB0307 · H.B. 307
--   HB0316 · H.B. 316
--   HB0323 · H.B. 323
--   HB0326 · H.B. 326
--   HB0396 · H.B. 396
--   HB0406 · H.B. 406
--   HB0409 · H.B. 409
--   HB0430 · H.B. 430
--   HB0459 · H.B. 459
--   HB0460 · H.B. 460
--   HB0463 · H.B. 463
--   HB0473 · H.B. 473
--   HB0481 · H.B. 481
--   HB0514 · H.B. 514
--   HB0517 · H.B. 517
--   HB0560 · H.B. 560
--   HB0562 · H.B. 562
--   SB0061 · S.B. 61
--   SB0071 · S.B. 71
--   SB0118 · S.B. 118
--   SB0126 · S.B. 126
--   SB0166 · S.B. 166
--   SB0176 · S.B. 176
--   SB0182 · S.B. 182
--   SB0211 · S.B. 211
--   SB0233 · S.B. 233
--
-- WHY THEY CHANGED.
-- Two causes, neither of them a moved fence. (1) S.B. 61 (tobacco_nicotine)
-- and H.B. 562 (dev_district_finance) are the 2024GS half of the four bills
-- the vocabulary wave V1 (20261010000000) deliberately deferred to this
-- pass: V1 would not attribute their committee votes without the minutes
-- bucket that scripts/vr-utah-committee-ingest.mjs --bucket produces,
-- because that would have meant guessing who was in the room. The bucket
-- exists now and both curator mappings were already reviewed in
-- db/vr-utah-committee-bills-2024GS.json. (2) The other 42 bills gained
-- positions because fourteen legislators who cast recorded committee votes
-- in 2024 had no roster record at all, so the ingest could not attribute
-- their votes to a human and dropped them. Wave 6 added their identity rows
-- to cmp-data.js from the Legislature's own 2024 roster page and resolved
-- their printed forms through the new unique_surname_on_session_roster door
-- in db/vr-utah-committee-map-2024GS.json. Those 42 blocks are re-emitted
-- unchanged and every row in them that the database already holds is a
-- no-op. No issue key was added to the vocabulary, no weight moved, no floor
-- action code was widened and the 10-percent-minority contestedness bar is
-- untouched.
--
-- Each block below is the same generated block as before, unmodified: it selects the
-- measure before inserting, guards every issue mapping with NOT EXISTS, and ends every
-- position insert with ON CONFLICT DO NOTHING. Re-stating a bill that is already in
-- the database is a no-op; only rows that are genuinely new land.
-- Generated by scripts/vr-utah-committee-mapping.mjs --sql --session 2024GS --bills HB0029,HB0059,HB0062,HB0097,HB0098,HB0111,HB0137,HB0141,HB0149,HB0161,HB0173,HB0186,HB0191,HB0241,HB0242,HB0267,HB0289,HB0303,HB0307,HB0316,HB0323,HB0326,HB0396,HB0406,HB0409,HB0430,HB0459,HB0460,HB0463,HB0473,HB0481,HB0514,HB0517,HB0560,HB0562,SB0061,SB0071,SB0118,SB0126,SB0166,SB0176,SB0182,SB0211,SB0233. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- HB0029 · H.B. 29 · Sensitive Material Review Amendments
--   mapping read from the enrolled text: https://le.utah.gov/Session/2024/bills/Enrolled/HB0029.xml
--   1 issue mapping(s), 2 committee action(s), 17 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 29' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 29', 'Sensitive Material Review Amendments',
      'Sensitive Material Review Amendments', 'This bill amends provisions regarding the evaluation of instructional material to identify and remove pornographic or indecent material.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0029.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0029',
        'primeSponsor', 'Rep. Ivory, Ken', 'floorSponsor', 'Sen. Weiler, Todd D.',
        'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://le.utah.gov/Session/2024/bills/Enrolled/HB0029.xml',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 70, true,
      'yea_supports', 'Enrolled text requires that protecting children from illicit pornography be prioritized over other considerations when instructional material is evaluated, names who may trigger a formal sensitive material review, splits objective from subjective sensitive material, forces statewide removal once a threshold of LEAs finds material objectively sensitive, and orders a compliance audit. Parent-triggered control of classroom material is the whole bill.', 'https://le.utah.gov/Session/2024/bills/Enrolled/HB0029.xml');
  END IF;
  -- 2024-01-23 · House Education Standing Committee · Rep. Hall moved to pass H.B. 29 out favorably.
  --   printed tally 10-2-3 (yea-nay-absent); 11 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000744.pdf', 'House Education Standing Committee · meeting 19034 · Rep. Hall moved to pass H.B. 29 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-09 · Senate Education Standing Committee · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.
  --   printed tally 5-1-3 (yea-nay-absent); 6 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'amillner', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.'),
    (m_id, 'john_johnson', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.'),
    (m_id, 'jstevenson', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.'),
    (m_id, 'kathleen_riebe', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.'),
    (m_id, 'kgrover', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.'),
    (m_id, 'mckell_s25', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001614.pdf', 'Senate Education Standing Committee · meeting 19267 · Sen. McKell moved to pass 1st Substitute H.B. 29 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0059 · H.B. 59 · Federal Funds Contingency Planning
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0059S01.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 59' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 59', 'Federal Funds Contingency Planning',
      'Federal Funds Contingency Planning', 'This bill addresses contingency planning related to federal funds.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0059.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0059',
        'primeSponsor', 'IVORYK', 'floorSponsor', 'KENNEMS',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0059S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 55, true,
      'yea_supports', 'First substitute text requires a state agency seeking a federal funds reauthorization or a new federal request above a threshold to file a contingency disclosure, a contingency plan, and a state jurisdiction evaluation, and requires agencies above a federal funding threshold to keep a standing contingency plan. The bill exists to prepare the state to operate without federal money, which is the state-autonomy direction.', 'https://le.utah.gov/~2024/bills/hbillint/HB0059S01.htm');
  END IF;
  -- 2024-01-23 · House Health and Human Services Standing Committee · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.
  --   printed tally 10-3-1 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'hollins_h24', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'robert_spendlove', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'rosemary_lesser', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000575.pdf', 'House Health and Human Services Standing Committee · meeting 19035 · Rep. Ward moved to pass 1st Substitute H.B. 59 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0062 · H.B. 62 · Utah Water Ways Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0062S01.htm
--   1 issue mapping(s), 1 committee action(s), 12 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 62' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 62', 'Utah Water Ways Amendments',
      'Utah Water Ways Amendments', 'This bill addresses the partnership of Utah Water Ways.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0062.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0062',
        'primeSponsor', 'OWENSDO', 'floorSponsor', 'SANDASD',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0062S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 45, true,
      'yea_supports', 'First substitute text directs the Utah Water Ways partnership to work with the State Board of Education on standards-aligned conservation resources and professional development, and to promote coordination of grants, rebate programs, and localized conservation messaging, with annual reporting. Conservation outreach is a real but narrow water measure, so it sits at the narrow-link floor.', 'https://le.utah.gov/~2024/bills/hbillint/HB0062S01.htm');
  END IF;
  -- 2024-01-18 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Bennion moved to pass H.B. 62 out favorably.
  --   printed tally 9-3-2 (yea-nay-absent); 12 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'bolinder_h68', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'chew_h68', 'committee_vote', false, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'doug_owens', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'kohler_h59', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'rshipp', 'committee_vote', false, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'snider_h5', 'committee_vote', false, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'thomas_peterson', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'tim_jimenez', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-01-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000379.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19015 · Rep. Bennion moved to pass H.B. 62 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0097 · H.B. 97 · Gun Safety Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0097.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 97' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 97', 'Gun Safety Amendments',
      'Gun Safety Amendments', 'This bill concerns a waiting period for the sale of a firearm.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0097.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0097',
        'primeSponsor', 'STODDA', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0097.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_safety') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_safety', 75, true,
      'yea_supports', 'Introduced text creates a waiting period between the purchase of a firearm from a dealer and delivery of the firearm to the purchaser, with defined exceptions. A purchase-to-delivery delay is a firearm restriction in the plain sense and is the entire operative content of the bill.', 'https://le.utah.gov/~2024/bills/hbillint/HB0097.htm');
  END IF;
  -- 2024-02-09 · House Public Utilities and Energy Standing Committee · Rep. Moss moved to pass H.B. 97 out favorably.
  --   printed tally 1-9-1 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'colin_w_jack', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 97 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0098 · H.B. 98 · Firearm Access Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0098.htm
--   1 issue mapping(s), 1 committee action(s), 10 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 98' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 98', 'Firearm Access Amendments',
      'Firearm Access Amendments', 'This bill requires that a firearm is secured and provides penalties.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0098.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0098',
        'primeSponsor', 'STODDA', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0098.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_safety') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_safety', 80, true,
      'yea_supports', 'Introduced text requires that a firearm be securely stored or rendered inoperable by a locking device and sets civil penalties for violations. A storage mandate backed by penalties is the core of the safe-storage agenda, and the bill does nothing else.', 'https://le.utah.gov/~2024/bills/hbillint/HB0098.htm');
  END IF;
  -- 2024-02-09 · House Public Utilities and Energy Standing Committee · Rep. Moss moved to pass H.B. 98 out favorably.
  --   printed tally 2-9-0 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'colin_w_jack', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001761.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19240 · Rep. Moss moved to pass H.B. 98 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0111 · H.B. 111 · Employment Training Requirement Limitations
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0111.htm
--   1 issue mapping(s), 2 committee action(s), 16 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 111' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 111', 'Employment Training Requirement Limitations',
      'Employment Training Requirement Limitations', 'This bill prohibits, for purposes of employment discrimination, certain training or other requirements that compel or require adherence to or belief in certain concepts.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0111.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0111',
        'primeSponsor', 'JIMENT', 'floorSponsor', 'MCCAYD',
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0111.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'end_dei') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'end_dei', 70, true,
      'yea_supports', 'Introduced text makes it employment discrimination for an employer to impose training or other requirements that compel adherence to or belief in specified concepts about race, sex, and related characteristics, while clarifying that objective discussion is still allowed, and adds a severability clause. Banning compelled-belief training is the operative anti-DEI mechanism.', 'https://le.utah.gov/~2024/bills/hbillint/HB0111.htm');
  END IF;
  -- 2024-01-23 · House Business, Labor, and Commerce Standing Committee · Rep. Brammer moved to pass H.B. 111 out favorably as amended.
  --   printed tally 7-2-7 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'ashlee_matthews', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'brammer_s21', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'brian_king', 'committee_vote', false, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'cmusselman', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'cory_maloy_h52', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'jefferson_burton', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'teuscher_h44', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'thomas_peterson', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.'),
    (m_id, 'whyte_h63', 'committee_vote', true, '2024-01-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001155.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19033 · Rep. Brammer moved to pass H.B. 111 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-09 · Senate Business and Labor Standing Committee · Sen. Sandall moved to pass H.B. 111 out favorably.
  --   printed tally 2-5-1 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'cbramble', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'dipson', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'kcullimore', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'kwan_s12', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'mccay_s11', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.'),
    (m_id, 'ssandall', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001511.pdf', 'Senate Business and Labor Standing Committee · meeting 19198 · Sen. Sandall moved to pass H.B. 111 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0137 · H.B. 137 · Disability Coverage Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0137.htm
--   1 issue mapping(s), 1 committee action(s), 12 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 137' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 137', 'Disability Coverage Amendments',
      'Disability Coverage Amendments', 'This bill addresses wraparound services for certain individuals with a disability.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0137.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0137',
        'primeSponsor', 'DAILEJ', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0137.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 55, true,
      'yea_supports', 'Introduced text requires the Department of Health and Human Services to seek a Medicaid waiver or state plan amendment providing wraparound services to qualified individuals with a disability, with sliding-scale cost sharing capped at stated percentages and maximums. It directs the state to add a Medicaid benefit that does not exist today.', 'https://le.utah.gov/~2024/bills/hbillint/HB0137.htm');
  END IF;
  -- 2024-02-05 · House Business, Labor, and Commerce Standing Committee · Rep. Matthews moved to pass H.B. 137 out favorably.
  --   printed tally 6-6-4 (yea-nay-absent); 12 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'ashlee_matthews', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'brammer_s21', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'brian_king', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'cmusselman', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'cory_maloy_h52', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'james_dunnigan', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'jefferson_burton', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'nthurston', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'ryan_d_wilcox', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'teuscher_h44', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.'),
    (m_id, 'whyte_h63', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001472.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19221 · Rep. Matthews moved to pass H.B. 137 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0141 · H.B. 141 · Olene Walker Housing Loan Fund Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0141.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 141' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 141', 'Olene Walker Housing Loan Fund Amendments',
      'Olene Walker Housing Loan Fund Amendments', 'This bill modifies provisions related to the Olene Walker Housing Loan Fund within the Department of Workforce Services.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0141.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0141',
        'primeSponsor', 'MOSSCS', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0141.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_support', 55, true,
      'yea_supports', 'Introduced text requires the Division of Finance to transfer a set amount of state liquor sale revenue from the Liquor Control Fund to the Olene Walker Housing Loan Fund every year. It is a single provision, but it moves ongoing money into the state''s affordable housing loan fund rather than studying or reorganizing it.', 'https://le.utah.gov/~2024/bills/hbillint/HB0141.htm');
  END IF;
  -- 2024-02-09 · House Revenue and Taxation Standing Committee · Rep. Briscoe moved to pass H.B. 141 out favorably.
  --   printed tally 2-6-5 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'bolinder_h68', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'doug_owens', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'joel_briscoe', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'snider_h5', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001538.pdf', 'House Revenue and Taxation Standing Committee · meeting 19295 · Rep. Briscoe moved to pass H.B. 141 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0149 · H.B. 149 · Earned Income Tax Credit Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0149.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 149' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 149', 'Earned Income Tax Credit Amendments',
      'Earned Income Tax Credit Amendments', 'This bill makes the earned income tax credit refundable.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0149.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0149',
        'primeSponsor', 'JUDKIM', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0149.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tax_middle_class') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tax_middle_class', 60, true,
      'yea_supports', 'Introduced text makes the state earned income tax credit refundable, so a low or moderate wage household receives the credit amount that exceeds its liability instead of only zeroing the liability out. Refundability is the whole bill and the benefit lands entirely on working households below the median.', 'https://le.utah.gov/~2024/bills/hbillint/HB0149.htm');
  END IF;
  -- 2024-01-30 · House Revenue and Taxation Standing Committee · Rep. Briscoe moved to pass H.B. 149 out favorably.
  --   printed tally 2-6-5 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'joel_briscoe', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'kstratton', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'mark_strong', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'robert_spendlove', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'snider_h5', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001174.pdf', 'House Revenue and Taxation Standing Committee · meeting 19104 · Rep. Briscoe moved to pass H.B. 149 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0161 · H.B. 161 · School Board Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0161S01.htm
--   1 issue mapping(s), 1 committee action(s), 10 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 161' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 161', 'School Board Amendments',
      'School Board Amendments', 'This bill addresses actions of a school district that may be subject to a referendum.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0161.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0161',
        'primeSponsor', 'SHIPPRP', 'floorSponsor', 'JOHNSJD',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0161S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'voting_access') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'voting_access', 45, true,
      'yea_supports', 'First substitute text provides that a law passed by a local school board, other than one imposing a new tax or a tax increase, may be referred to the voters of the school district for approval or rejection, subject to stated exceptions. It creates a ballot route where none existed, which is an access gain, though confined to school district law.', 'https://le.utah.gov/~2024/bills/hbillint/HB0161S01.htm');
  END IF;
  -- 2024-02-05 · House Education Standing Committee · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.
  --   printed tally 9-2-4 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Lund moved to pass 1st Substitute H.B. 161 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0173 · H.B. 173 · Local School Board Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0173S01.htm
--   1 issue mapping(s), 1 committee action(s), 14 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 173' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 173', 'Local School Board Amendments',
      'Local School Board Amendments', 'This bill addresses actions of a school district that may be subject to a referendum.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0173.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0173',
        'primeSponsor', 'PIERUC', 'floorSponsor', 'KENNEMS',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0173S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'voting_access') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'voting_access', 45, true,
      'yea_supports', 'First substitute text provides that a law passed by a local school board that imposes a new tax or increases a tax may be referred to the voters of the school district for approval or rejection. Like its companion, it adds a referendum route that the electorate did not previously have, which is a narrow access gain.', 'https://le.utah.gov/~2024/bills/hbillint/HB0173S01.htm');
  END IF;
  -- 2024-02-05 · House Education Standing Committee · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.
  --   printed tally 10-5-0 (yea-nay-absent); 14 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'jefferson_moss', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.'),
    (m_id, 'valpeterson_h56', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001459.pdf', 'House Education Standing Committee · meeting 19165 · Rep. Birkeland moved to pass 1st Substitute H.B. 173 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0186 · H.B. 186 · License Plate Requirements
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0186S01.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 186' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 186', 'License Plate Requirements',
      'License Plate Requirements', 'This bill amends provisions related to the issuance of personalized license plates.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0186.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0186',
        'primeSponsor', 'THURSNK', 'floorSponsor', 'HARPEWA',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0186S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'free_speech') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'free_speech', 45, true,
      'yea_opposes', 'First substitute text defines the words that may appear on a personalized license plate and prohibits the Motor Vehicle Division from issuing a plate whose requested combination is indecent, obscene, profane, or connotes certain illegal activities or substances, with a severability clause. The state is deciding which expressive combinations it will refuse, which is a speech restriction, narrow because the forum is a state-issued plate.', 'https://le.utah.gov/~2024/bills/hbillint/HB0186S01.htm');
  END IF;
  -- 2024-01-24 · House Transportation Standing Committee · Rep. Matthews moved to pass H.B. 186 out favorably.
  --   printed tally 7-3-2 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'ashlee_matthews', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'brett_garner', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'jeffrey_stenquist', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000689.pdf', 'House Transportation Standing Committee · meeting 19040 · Rep. Matthews moved to pass H.B. 186 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0191 · H.B. 191 · Electrical Energy Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0191S02.htm
--   1 issue mapping(s), 2 committee action(s), 13 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 191' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 191', 'Electrical Energy Amendments',
      'Electrical Energy Amendments', 'This bill modifies provisions related to the regulation of energy.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0191.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0191',
        'primeSponsor', 'JACKC', 'floorSponsor', 'WINTER',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0191S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 60, true,
      'yea_supports', 'Second substitute text requires the Public Service Commission to act in accordance with the state energy policy, requires stated determinations before it may authorize the early retirement of an electrical generation facility, and requires annual reporting on retirement requests. The operative effect is to make it harder to close existing thermal generation.', 'https://le.utah.gov/~2024/bills/hbillint/HB0191S02.htm');
  END IF;
  -- 2024-01-29 · House Public Utilities and Energy Standing Committee · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.
  --   printed tally 8-2-1 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'carl_albrecht', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'colin_w_jack', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', true, '2024-01-29T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001197.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19098 · Rep. Kyle moved to pass 1st Substitute H.B. 191 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-08 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Owens moved to pass 2nd Substitute H.B. 191 out favorably.
  --   printed tally 2-1-5 (yea-nay-absent); 3 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001536.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19317 · Sen. Owens moved to pass 2nd Substitute H.B. 191 out favorably.'),
    (m_id, 'dowens_st', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001536.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19317 · Sen. Owens moved to pass 2nd Substitute H.B. 191 out favorably.'),
    (m_id, 'rwinterton', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001536.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19317 · Sen. Owens moved to pass 2nd Substitute H.B. 191 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0241 · H.B. 241 · Clean Energy Amendments
--   mapping read from the substitute_3 text: https://le.utah.gov/~2024/bills/hbillint/HB0241S03.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 241' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 241', 'Clean Energy Amendments',
      'Clean Energy Amendments', 'This bill modifies provisions relating to clean energy.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0241.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0241',
        'primeSponsor', 'ALBRECR', 'floorSponsor', 'OWENSD',
        'mappingReadFrom', 'substitute_3', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0241S03.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'enviro_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'enviro_energy', 50, true,
      'yea_supports', 'Third substitute text replaces renewable with clean throughout the energy statutes, and the clean energy source definition it relies on includes nuclear fuel and carbon capture utilization and sequestration. The qualifying set is broadened past renewables into the all-of-the-above framing this key measures rather than narrowed.', 'https://le.utah.gov/~2024/bills/hbillint/HB0241S03.htm');
  END IF;
  -- 2024-01-24 · House Public Utilities and Energy Standing Committee · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.
  --   printed tally 9-1-1 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'carl_albrecht', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'matt_macpherson', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.'),
    (m_id, 'mike_petersen', 'committee_vote', true, '2024-01-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00000739.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19037 · Rep. Cobb moved to pass 2nd Substitute H.B. 241 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0242 · H.B. 242 · Water Usage Data Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0242S02.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 242' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 242', 'Water Usage Data Amendments',
      'Water Usage Data Amendments', 'This bill addresses water usage data.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0242.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0242',
        'primeSponsor', 'BALLAMG', 'floorSponsor', 'HINKIDP',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0242S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 50, true,
      'yea_supports', 'Second substitute text requires state agencies to report water usage, directs the Division of Water Resources to study public school water use in stated areas and publish findings and recommendations, and provides for procurement of smart irrigation controllers. Measuring and then reducing the state''s own water use is a conservation direction, with the controllers giving it operative teeth.', 'https://le.utah.gov/~2024/bills/hbillint/HB0242S02.htm');
  END IF;
  -- 2024-02-14 · House Public Utilities and Energy Standing Committee · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.
  --   printed tally 6-4-1 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'colin_w_jack', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001705.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19242 · Rep. Moss moved to pass 1st Substitute H.B. 242 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0267 · H.B. 267 · Telemedicine Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0267S01.htm
--   1 issue mapping(s), 1 committee action(s), 14 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 267' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 267', 'Telemedicine Amendments',
      'Telemedicine Amendments', 'This bill amends provisions relating to reimbursement for telemedicine services.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0267.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0267',
        'primeSponsor', 'HAWKIJ', 'floorSponsor', 'VICKEEJ',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0267S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 50, true,
      'yea_supports', 'First substitute text conditionally requires a health benefit plan to reimburse a provider for telemedicine services at no less than ninety percent of the rate the plan pays that provider for the same service delivered in person in Utah. Payment parity is what keeps a telehealth option available to patients, so the bill expands access rather than merely describing it.', 'https://le.utah.gov/~2024/bills/hbillint/HB0267S01.htm');
  END IF;
  -- 2024-02-13 · House Business, Labor, and Commerce Standing Committee · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.
  --   printed tally 3-11-2 (yea-nay-absent); 14 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'ashlee_matthews', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'brammer_s21', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'brian_king', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'cmusselman', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'cory_maloy_h52', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'james_dunnigan', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'jefferson_burton', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'nthurston', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'ryan_d_wilcox', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'teuscher_h44', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'thomas_peterson', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'walt_brooks', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.'),
    (m_id, 'whyte_h63', 'committee_vote', false, '2024-02-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001663.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19224 · Rep. Matthews moved to pass 1st Substitute H.B. 267 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0289 · H.B. 289 · Property Rights Ombudsman Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillamd/HB0289S02.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 289' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 289', 'Property Rights Ombudsman Amendments',
      'Property Rights Ombudsman Amendments', 'This bill modifies the Property Rights Ombudsman Act.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0289.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0289',
        'primeSponsor', 'BIRKEK', 'floorSponsor', 'FILLML',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0289S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 55, true,
      'yea_supports', 'Second substitute text lets a party who prevails in court on an issue the Office of the Property Rights Ombudsman had already decided in that party''s favor recover attorney fees, and in stated circumstances collect a civil penalty and consequential damages. It puts money behind a property owner''s win against a government entity that ignored the ombudsman.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0289S02.htm');
  END IF;
  -- 2024-01-30 · House Judiciary Standing Committee · Rep. King moved to pass H.B. 289 out favorably as amended.
  --   printed tally 8-2-2 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'cheryl_acton', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'christine_watkins', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'mark_wheatley', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. King moved to pass H.B. 289 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0303 · H.B. 303 · School Curriculum Requirements
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillamd/HB0303S01.htm
--   1 issue mapping(s), 1 committee action(s), 10 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 303' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 303', 'School Curriculum Requirements',
      'School Curriculum Requirements', 'This bill amends provisions that prohibit school officials and employees from endorsing, promoting, or disparaging certain beliefs or viewpoints.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0303.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0303',
        'primeSponsor', 'STENQJ', 'floorSponsor', 'KENNEMS',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0303S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'free_speech') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'free_speech', 50, true,
      'yea_opposes', 'First substitute text prohibits school officials and employees from using instructional materials or a display of symbols, images, or language to endorse, promote, or disparage a religious belief or a political viewpoint, and has the attorney general defend and the state indemnify those enforcing the prohibition. Whatever the neutrality framing, the operative clause removes expression from public employees in the classroom.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0303S01.htm');
  END IF;
  -- 2024-02-12 · House Education Standing Committee · Rep. Lisonbee moved to pass H.B. 303 out favorably.
  --   printed tally 6-5-4 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001642.pdf', 'House Education Standing Committee · meeting 19170 · Rep. Lisonbee moved to pass H.B. 303 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0307 · H.B. 307 · Firearm Data Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillamd/HB0307S01.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 307' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 307', 'Firearm Data Amendments',
      'Firearm Data Amendments', 'This bill concerns law enforcement data collection and reporting concerning firearms.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0307.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0307',
        'primeSponsor', 'HAYESS', 'floorSponsor', 'WEILET',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0307S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_safety') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_safety', 45, true,
      'yea_supports', 'First substitute text requires law enforcement agencies to report lost or stolen firearms used in a crime and the disposition of firearms in agency custody, and requires the State Commission on Criminal and Juvenile Justice to compile and publish that data. Public firearm data is the evidentiary groundwork of this key, but it regulates no purchase or possession, so it stays at the narrow-link floor.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0307S01.htm');
  END IF;
  -- 2024-02-21 · House Public Utilities and Energy Standing Committee · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.
  --   printed tally 5-5-1 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'colin_w_jack', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'jason_b_kyle', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.'),
    (m_id, 'mike_petersen', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001762.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19244 · Rep. Elison moved to pass 1st Substitute H.B. 307 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0316 · H.B. 316 · Inmate Assignment Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0316S01.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 316' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 316', 'Inmate Assignment Amendments',
      'Inmate Assignment Amendments', 'This bill addresses inmate housing assignments.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0316.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0316',
        'primeSponsor', 'LISONK', 'floorSponsor', 'BALDEH',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0316S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lgbtq_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lgbtq_rights', 65, true,
      'yea_opposes', 'First substitute text prohibits the Department of Corrections and county jails, with limited exceptions, from assigning inmates of the opposite biological sex to the same housing area. Housing determined by birth sex rather than gender identity is the operative rule, which subtracts from the recognition this key measures.', 'https://le.utah.gov/~2024/bills/hbillint/HB0316S01.htm');
  END IF;
  -- 2024-01-30 · House Judiciary Standing Committee · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.
  --   printed tally 6-2-4 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'mark_wheatley', 'committee_vote', false, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001180.pdf', 'House Judiciary Standing Committee · meeting 19102 · Rep. Birkeland moved to pass H.B. 316 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0323 · H.B. 323 · Motor Vehicle Safety Inspection Modifications
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillamd/HB0323S01.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 323' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 323', 'Motor Vehicle Safety Inspection Modifications',
      'Motor Vehicle Safety Inspection Modifications', 'This bill amends provisions relating to window tinting.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0323.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0323',
        'primeSponsor', 'LISONK', 'floorSponsor', 'MCCAYD',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0323S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'justice_reform', 50, true,
      'yea_supports', 'First substitute text allows a peace officer to stop a vehicle for improper side window tinting only if the officer has already stopped the vehicle for another offense, and prohibits revoking or suspending a registration or driver license over a tint violation. Removing a stand-alone pretext for a traffic stop is a policing-practice reform.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0323S01.htm');
  END IF;
  -- 2024-02-09 · House Judiciary Standing Committee · Rep. Clancy moved to pass H.B. 323 out favorably as amended.
  --   printed tally 5-4-3 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'jon_hawkins', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'mark_wheatley', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'rshipp', 'committee_vote', false, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-09T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001611.pdf', 'House Judiciary Standing Committee · meeting 19174 · Rep. Clancy moved to pass H.B. 323 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0326 · H.B. 326 · Firearm Safety Incentives 
--   mapping read from the substitute_6 text: https://le.utah.gov/~2024/bills/hbillint/HB0326S06.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 326' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 326', 'Firearm Safety Incentives ',
      'Firearm Safety Incentives ', 'This bill establishes an income tax credit for the purchase of a firearm safety device.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0326.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0326',
        'primeSponsor', 'MACPHM', 'floorSponsor', 'KENNEMS',
        'mappingReadFrom', 'substitute_6', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0326S06.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_safety') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_safety', 45, true,
      'yea_supports', 'Sixth substitute text enacts a nonrefundable individual income tax credit for the purchase of a firearm safety device, limits it to one claim per household, and provides for sunset review. It pays people to lock firearms up, which is the safe-storage direction, but it is an incentive rather than a requirement.', 'https://le.utah.gov/~2024/bills/hbillint/HB0326S06.htm');
  END IF;
  -- 2024-02-07 · House Public Utilities and Energy Standing Committee · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.
  --   printed tally 8-2-1 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', true, '2024-02-07T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001480.pdf', 'House Public Utilities and Energy Standing Committee · meeting 19230 · Rep. Lyman moved to pass 4th Substitute H.B. 326 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0396 · H.B. 396 · Workplace Discrimination Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0396S01.htm
--   1 issue mapping(s), 2 committee action(s), 17 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 396' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 396', 'Workplace Discrimination Amendments',
      'Workplace Discrimination Amendments', 'This bill addresses religious expression in the workplace.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0396.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0396',
        'primeSponsor', 'BRAMMB', 'floorSponsor', 'KENNEMS',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0396S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 65, true,
      'yea_supports', 'First substitute text prohibits an employer from compelling an employee to communicate or act in a manner the employee believes would burden or offend the employee''s sincerely held religious beliefs, and sets out a process for accommodating those beliefs. Protecting religious conscience inside employment is the substance of this key.', 'https://le.utah.gov/~2024/bills/hbillint/HB0396S01.htm');
  END IF;
  -- 2024-02-02 · House Judiciary Standing Committee · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.
  --   printed tally 9-2-1 (yea-nay-absent); 11 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', false, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'mark_wheatley', 'committee_vote', false, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-02T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001460.pdf', 'House Judiciary Standing Committee · meeting 19112 · Rep. Lisonbee moved to pass H.B. 396 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-20 · Senate Business and Labor Standing Committee · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.
  --   printed tally 4-2-2 (yea-nay-absent); 6 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.'),
    (m_id, 'cbramble', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.'),
    (m_id, 'kwan_s12', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.'),
    (m_id, 'mccay_s11', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.'),
    (m_id, 'ssandall', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.'),
    (m_id, 'tweiler', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001742.pdf', 'Senate Business and Labor Standing Committee · meeting 19201 · Sen. McCay moved to pass 1st Substitute H.B. 396 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0406 · H.B. 406 · Firearms Financial Transaction Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0406S02.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 406' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 406', 'Firearms Financial Transaction Amendments',
      'Firearms Financial Transaction Amendments', 'This bill addresses consumer transactions related to firearms.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0406.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0406',
        'primeSponsor', 'MALOYC', 'floorSponsor', 'WILSOCH',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0406S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 60, true,
      'yea_supports', 'Second substitute text prohibits the use of a firearms merchant category code in payment processing, creates a complaint process and civil penalties for violations, and gives the attorney general enforcement power. The bill exists to stop financial intermediaries from flagging lawful firearm purchases, which is a gun-owner protection.', 'https://le.utah.gov/~2024/bills/hbillint/HB0406S02.htm');
  END IF;
  -- 2024-02-20 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.
  --   printed tally 5-2-1 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'david_buxton', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'dowens_st', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'evickers', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'rwinterton', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'ssandall', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.'),
    (m_id, 'stephanie_pitcher', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001748.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19321 · Sen. Owens moved to pass 2nd Substitute H.B. 406 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0409 · H.B. 409 · Presumption of State Jurisdiction Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0409S01.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 409' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 409', 'Presumption of State Jurisdiction Amendments',
      'Presumption of State Jurisdiction Amendments', 'This bill affirms state sovereignty and establishes a presumption of state jurisdiction.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0409.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0409',
        'primeSponsor', 'IVORYK', 'floorSponsor', NULL,
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0409S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 70, true,
      'yea_supports', 'First substitute text declares that jurisdiction over subject matters not enumerated to the federal government remains with Utah, provides that any presumption against state jurisdiction is overcome only by a federal demonstration of specific constitutional authorization, places the burden on the federal government in non-enumerated disputes, and presumes the federal interest in federal lands is proprietary. The bill is a sovereignty claim from top to bottom.', 'https://le.utah.gov/~2024/bills/hbillint/HB0409S01.htm');
  END IF;
  -- 2024-02-21 · House Judiciary Standing Committee · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.
  --   printed tally 8-2-2 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'mark_wheatley', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Shipp moved to pass 1st Substitute H.B. 409 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0430 · H.B. 430 · Local Government Transportation Services Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillamd/HB0430S02.htm
--   1 issue mapping(s), 1 committee action(s), 5 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 430' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 430', 'Local Government Transportation Services Amendments',
      'Local Government Transportation Services Amendments', 'This bill permits public transit innovation grants and amends provisions related to allocation of certain local option sales and use taxes for transportation.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0430.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0430',
        'primeSponsor', 'PIERUC', 'floorSponsor', 'CULLIKA',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0430S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 50, true,
      'yea_supports', 'Second substitute text lets local option sales tax revenue and Transit Transportation Investment Fund money pay for public transit innovation grants, has the Department of Transportation and the Transportation Commission administer and prioritize them, and requires a large transit district to report expenditures, service, and ridership to each municipality. New money for transit service plus accountability for it.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0430S02.htm');
  END IF;
  -- 2024-02-14 · House Transportation Standing Committee · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.
  --   printed tally 6-3-3 (yea-nay-absent); 5 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brett_garner', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001659.pdf', 'House Transportation Standing Committee · meeting 19260 · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001659.pdf', 'House Transportation Standing Committee · meeting 19260 · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001659.pdf', 'House Transportation Standing Committee · meeting 19260 · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001659.pdf', 'House Transportation Standing Committee · meeting 19260 · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001659.pdf', 'House Transportation Standing Committee · meeting 19260 · Rep. Pulsipher moved to pass 1st Substitute H.B. 430 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0459 · H.B. 459 · Blended Plea Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0459S02.htm
--   1 issue mapping(s), 1 committee action(s), 9 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 459' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 459', 'Blended Plea Amendments',
      'Blended Plea Amendments', 'This bill modifies procedures relating certain convictions of a minor that involve both juvenile dispositions and adult criminal sentences.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0459.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0459',
        'primeSponsor', 'TEUSCJ', 'floorSponsor', 'PITCHS',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0459S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'justice_reform', 50, true,
      'yea_supports', 'Second substitute text prohibits a court from accepting a plea that blends a juvenile adjudication and disposition with an adult criminal conviction and sentence, and voids any conviction or sentence entered as a prohibited blended plea. It closes a route by which a minor picks up an adult sentence in the same breath as a juvenile disposition.', 'https://le.utah.gov/~2024/bills/hbillint/HB0459S02.htm');
  END IF;
  -- 2024-02-21 · House Judiciary Standing Committee · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.
  --   printed tally 7-3-2 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'cheryl_acton', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'christine_watkins', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'judy_weeks_rohner', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'mark_wheatley', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001791.pdf', 'House Judiciary Standing Committee · meeting 19183 · Rep. Loubet moved to pass 2nd Substitute H.B. 459 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0460 · H.B. 460 · Government Employee Conscience Protection Amendments
--   mapping read from the substitute_3 text: https://le.utah.gov/~2024/bills/hbillamd/HB0460S03.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 460' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 460', 'Government Employee Conscience Protection Amendments',
      'Government Employee Conscience Protection Amendments', 'This bill addresses required reasonable accommodations for government employees in certain circumstances.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0460.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0460',
        'primeSponsor', 'PETERM', 'floorSponsor', 'WEILET',
        'mappingReadFrom', 'substitute_3', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillamd/HB0460S03.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 55, true,
      'yea_supports', 'Third substitute text requires a governmental entity to grant an employee''s request to be relieved from performing a task that violates the employee''s conscience, defined as a sincerely held belief about the rightness or wrongness of an action, unless doing so would impose undue hardship, and creates protections and a cause of action for a denied employee. Conscience protection with a remedy attached.', 'https://le.utah.gov/~2024/bills/hbillamd/HB0460S03.htm');
  END IF;
  -- 2024-02-23 · House Political Subdivisions Standing Committee · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.
  --   printed tally 7-3-1 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'james_cobb', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'james_dunnigan', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'kohler_h59', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'rosemary_lesser', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'teuscher_h44', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.'),
    (m_id, 'tlee', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001834.pdf', 'House Political Subdivisions Standing Committee · meeting 19210 · Rep. Judkins moved to pass 2nd Substitute H.B. 460 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0463 · H.B. 463 · Medicaid Funding Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0463S02.htm
--   1 issue mapping(s), 1 committee action(s), 14 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 463' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 463', 'Medicaid Funding Amendments',
      'Medicaid Funding Amendments', 'This bill amends provisions related to the Medicaid program and Medicaid expansion.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0463.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0463',
        'primeSponsor', 'BRAMMB', 'floorSponsor', NULL,
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0463S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 55, true,
      'yea_opposes', 'Second substitute text defines a Medicaid shortfall and requires that on a shortfall the responsible departments suspend hiring, suspend wage increases, suspend increases in provider payment rates, suspend expanding reimbursement benefits including drug reimbursements, and close enrollment to new members. A mandatory enrollment freeze is a coverage contraction written into statute ahead of time.', 'https://le.utah.gov/~2024/bills/hbillint/HB0463S02.htm');
  END IF;
  -- 2024-02-15 · House Business, Labor, and Commerce Standing Committee · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.
  --   printed tally 10-4-2 (yea-nay-absent); 14 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'ashlee_matthews', 'committee_vote', false, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'brammer_s21', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'brian_king', 'committee_vote', false, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'carl_albrecht', 'committee_vote', false, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'cmusselman', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'cory_maloy_h52', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'james_dunnigan', 'committee_vote', false, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'jefferson_burton', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'nthurston', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'teuscher_h44', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'thomas_peterson', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.'),
    (m_id, 'whyte_h63', 'committee_vote', true, '2024-02-15T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001694.pdf', 'House Business, Labor, and Commerce Standing Committee · meeting 19225 · Rep. Musselman moved to pass 2nd Substitute H.B. 463 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0473 · H.B. 473 · School Transit Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0473.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 473' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 473', 'School Transit Amendments',
      'School Transit Amendments', 'This bill creates the Transit Access Pass for Students pilot grant program (the program).', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0473.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0473',
        'primeSponsor', 'BRISCJK', 'floorSponsor', NULL,
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0473.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 50, true,
      'yea_supports', 'Introduced text creates the Transit Access Pass for Students pilot grant program with application requirements, rulemaking by the state board, reporting, and a sunset date. It puts state grant money behind transit passes for students, which is a service subsidy rather than a study.', 'https://le.utah.gov/~2024/bills/hbillint/HB0473.htm');
  END IF;
  -- 2024-02-22 · House Education Standing Committee · Rep. Romero moved to pass H.B. 473 out favorably.
  --   printed tally 4-5-6 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'joseph_elison', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001827.pdf', 'House Education Standing Committee · meeting 19178 · Rep. Romero moved to pass H.B. 473 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0481 · H.B. 481 · Technology Upgrade Incentives Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0481S01.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 481' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 481', 'Technology Upgrade Incentives Amendments',
      'Technology Upgrade Incentives Amendments', 'This bill provides for tax incentives related to certain technology upgrades.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0481.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0481',
        'primeSponsor', 'CUTLEP', 'floorSponsor', NULL,
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0481S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'climate_action') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'climate_action', 50, true,
      'yea_supports', 'First substitute text replaces the declining schedule for the alternative fuel heavy duty vehicle tax credit, which was stepping down from fifteen thousand dollars to three thousand, with a flat fifteen thousand dollar credit, and adds a new credit for locomotive idle-reduction devices subject to an annual aggregate cap and a sunset. Emission-reducing equipment is made cheaper for the taxpayers who buy it.', 'https://le.utah.gov/~2024/bills/hbillint/HB0481S01.htm');
  END IF;
  -- 2024-02-14 · House Revenue and Taxation Standing Committee · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.
  --   printed tally 3-6-4 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'bolinder_h68', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'doug_owens', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'joel_briscoe', 'committee_vote', true, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'snider_h5', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', false, '2024-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001688.pdf', 'House Revenue and Taxation Standing Committee · meeting 19339 · Rep. Owens moved to pass 1st Substitute H.B. 481 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0514 · H.B. 514 · School Chaplain Amendments
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0514.htm
--   1 issue mapping(s), 2 committee action(s), 15 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 514' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 514', 'School Chaplain Amendments',
      'School Chaplain Amendments', 'This bill allows an LEA to permit a volunteer chaplain at a school.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/HB0514.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0514',
        'primeSponsor', 'STRATKJ', 'floorSponsor', 'JOHNSJD',
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0514.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 60, true,
      'yea_supports', 'Introduced text permits an LEA to allow a volunteer chaplain in its schools, requires LEAs that do so to adopt policies and requirements for chaplains, and requires the State Board of Education to report to the Education Interim Committee. Opening the public school building to religious volunteers is the operative change.', 'https://le.utah.gov/~2024/bills/hbillint/HB0514.htm');
  END IF;
  -- 2024-02-20 · House Education Standing Committee · Rep. Walter moved to pass H.B. 514 out favorably.
  --   printed tally 10-2-3 (yea-nay-absent); 11 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Walter moved to pass H.B. 514 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-27 · Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · Sen. Balderree moved to pass H.B. 514 out favorably.
  --   printed tally 3-2-2 (yea-nay-absent); 4 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'dipson', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001935.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19256 · Sen. Balderree moved to pass H.B. 514 out favorably.'),
    (m_id, 'harper_s16', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001935.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19256 · Sen. Balderree moved to pass H.B. 514 out favorably.'),
    (m_id, 'kathleen_riebe', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001935.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19256 · Sen. Balderree moved to pass H.B. 514 out favorably.'),
    (m_id, 'kwan_s12', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001935.pdf', 'Senate Transportation, Public Utilities, Energy, and Technology Standing Committee · meeting 19256 · Sen. Balderree moved to pass H.B. 514 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0517 · H.B. 517 · Half-day Kindergarten Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/hbillint/HB0517S01.htm
--   1 issue mapping(s), 1 committee action(s), 11 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 517' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 517', 'Half-day Kindergarten Amendments',
      'Half-day Kindergarten Amendments', 'This bill amends provisions regarding half-day kindergarten to ensure that a student attending half-day kindergarten receives instruction in all of the kindergarten core competencies.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0517.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0517',
        'primeSponsor', 'LEETA', 'floorSponsor', 'WEILET',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0517S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 45, true,
      'yea_supports', 'First substitute text requires half-day kindergarten instruction to meet minimum standards the State Board of Education sets, requires an LEA governing board to inform parents that the half-day option exists, and requires it to provide a designated half-day class once half-day enrollment reaches a threshold. A parent''s option is disclosed and then guaranteed, which is the narrow parental-control end of this key.', 'https://le.utah.gov/~2024/bills/hbillint/HB0517S01.htm');
  END IF;
  -- 2024-02-20 · House Education Standing Committee · Rep. Clancy moved to pass H.B. 517 out favorably.
  --   printed tally 10-2-3 (yea-nay-absent); 11 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'aromero', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'carol_spackman_moss', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'hall_h11', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'karen_m_peterson', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'r_neil_walter', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'susan_pulsipher', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001745.pdf', 'House Education Standing Committee · meeting 19175 · Rep. Clancy moved to pass H.B. 517 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0560 · H.B. 560 · Licensing Modifications
--   mapping read from the introduced text: https://le.utah.gov/~2024/bills/hbillint/HB0560.htm
--   1 issue mapping(s), 1 committee action(s), 10 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 560' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 560', 'Licensing Modifications',
      'Licensing Modifications', 'This bill modifies licensing provisions related to abortion.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0560.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0560',
        'primeSponsor', 'LISONK', 'floorSponsor', 'MCCAYD',
        'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0560.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'pro_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'pro_choice', 55, true,
      'yea_supports', 'Introduced text deletes the prohibition on the state issuing a license for an abortion clinic after May 2, 2023 and the related bar on a licensed abortion clinic performing abortions, and restores type I and type II abortion clinics to the licensed facility categories. Removing the licensing shutdown is what keeps clinic-based abortion legally available in the state.', 'https://le.utah.gov/~2024/bills/hbillint/HB0560.htm');
  END IF;
  -- 2024-02-20 · House Judiciary Standing Committee · Rep. Birkeland moved to pass H.B. 560 out favorably.
  --   printed tally 9-2-1 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brian_king', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'jon_hawkins', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'kera_birkeland', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'lisonbee_h14', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'mark_wheatley', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'nelson_abbott', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.'),
    (m_id, 'tyler_clancy', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001737.pdf', 'House Judiciary Standing Committee · meeting 19182 · Rep. Birkeland moved to pass H.B. 560 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0562 · H.B. 562 · Utah Fairpark Area Investment and Restoration District
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/hbillint/HB0562S02.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 562' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 562', 'Utah Fairpark Area Investment and Restoration District',
      'Utah Fairpark Area Investment and Restoration District', 'This bill enacts and modifies provisions relating to the Utah Fairpark Area Investment and Restoration District.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0562.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0562',
        'primeSponsor', 'WILCORD', 'floorSponsor', 'FILLML',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/hbillint/HB0562S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'dev_district_finance') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'dev_district_finance', 80, true,
      'yea_supports', 'Second substitute text creates the Utah Fairpark Area Investment and Restoration District with a boundary and a board, gives it an array of new local taxes and a privilege tax on state land, prohibits certain impact fees, directs enhanced property tax revenue to it, and authorizes it to own and help build a qualified stadium. Standing up a tax-capture district to finance one project is the whole bill, so a yea creates the district.', 'https://le.utah.gov/~2024/bills/hbillint/HB0562S02.htm');
  END IF;
  -- 2024-02-23 · House Government Operations Standing Committee · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.
  --   printed tally 8-2-3 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'andrew_stoddard', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'brammer_s21', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'candice_pierucci', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'cmusselman', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'mike_petersen', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'nthurston', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'sahara_hayes', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.'),
    (m_id, 'valpeterson_h56', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001823.pdf', 'House Government Operations Standing Committee · meeting 19159 · Rep. Pierucci moved to pass 1st Substitute H.B. 562 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0061 · S.B. 61 · Electronic Cigarette Amendments
--   mapping read from the substitute_5 text: https://le.utah.gov/~2024/bills/sbillint/SB0061S05.htm
--   1 issue mapping(s), 1 committee action(s), 6 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 61' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 61', 'Electronic Cigarette Amendments',
      'Electronic Cigarette Amendments', 'This bill modifies provisions related to electronic cigarettes.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0061.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0061',
        'primeSponsor', 'PLUMBJ', 'floorSponsor', 'BRAMMB',
        'mappingReadFrom', 'substitute_5', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0061S05.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tobacco_nicotine') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tobacco_nicotine', 80, true,
      'yea_supports', 'Fifth substitute text prohibits the sale of an electronic cigarette product that lacks federal market authorization, codifies a nicotine limit, bans flavored electronic cigarette products, and creates a product registry retailers must sell from. Every operative provision narrows what may be sold and who may sell it, so a yea tightens the rules on nicotine products.', 'https://le.utah.gov/~2024/bills/sbillint/SB0061S05.htm');
  END IF;
  -- 2024-02-20 · House Health and Human Services Standing Committee · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.
  --   printed tally 9-1-4 (yea-nay-absent); 6 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.'),
    (m_id, 'hollins_h24', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.'),
    (m_id, 'matt_macpherson', 'committee_vote', false, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.'),
    (m_id, 'rosemary_lesser', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.'),
    (m_id, 'tim_jimenez', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001746.pdf', 'House Health and Human Services Standing Committee · meeting 19171 · Rep. Dailey-Provost moved to pass 3rd Substitute S.B. 61 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0071 · S.B. 71 · Cannabis Business Tax Credit Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/sbillamd/SB0071S02.htm
--   1 issue mapping(s), 2 committee action(s), 15 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 71' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 71', 'Cannabis Business Tax Credit Amendments',
      'Cannabis Business Tax Credit Amendments', 'This bill enacts a cannabis business expenses income tax credit.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/SB0071.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0071',
        'primeSponsor', 'VICKEEJ', 'floorSponsor', 'DAILEJ',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillamd/SB0071S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'cannabis_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'cannabis_reform', 55, true,
      'yea_supports', 'Second substitute text enacts a nonrefundable income tax credit for business expenses related to selling medical cannabis in the state, and requires the Department of Agriculture and Food to report license applicants'' tax identification numbers to the State Tax Commission. The credit exists to offset the federal deduction denial that makes cannabis retail uniquely expensive, which supports the legal medical market.', 'https://le.utah.gov/~2024/bills/sbillamd/SB0071S02.htm');
  END IF;
  -- 2024-02-21 · Senate Revenue and Taxation Standing Committee · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.
  --   printed tally 5-1-2 (yea-nay-absent); 6 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cbramble', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.'),
    (m_id, 'cwilson', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.'),
    (m_id, 'dipson', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.'),
    (m_id, 'kcullimore', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.'),
    (m_id, 'lincoln_fillmore', 'committee_vote', true, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.'),
    (m_id, 'mccay_s11', 'committee_vote', false, '2024-02-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001730.pdf', 'Senate Revenue and Taxation Standing Committee · meeting 19351 · Sen. Bramble moved to pass 2nd Substitute S.B. 71 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-27 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.
  --   printed tally 6-3-5 (yea-nay-absent); 9 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'chew_h68', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'doug_owens', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'kstratton', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'rshipp', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'thomas_peterson', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'tim_jimenez', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 71 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0118 · S.B. 118 · Water Efficiency Amendments
--   mapping read from the substitute_4 text: https://le.utah.gov/~2024/bills/sbillint/SB0118S04.htm
--   1 issue mapping(s), 2 committee action(s), 15 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 118' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 118', 'Water Efficiency Amendments',
      'Water Efficiency Amendments', 'This bill addresses programs for water efficiency.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/SB0118.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0118',
        'primeSponsor', 'MCKELMK', 'floorSponsor', 'MUSSECR',
        'mappingReadFrom', 'substitute_4', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0118S04.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 55, true,
      'yea_supports', 'Fourth substitute text provides incentives for water efficient landscaping in new residential development, grants rulemaking authority to implement them, and sets a sunset date. Landscaping is where most residential water goes in this state, so incentivizing efficient installation at build time is a substantive conservation measure.', 'https://le.utah.gov/~2024/bills/sbillint/SB0118S04.htm');
  END IF;
  -- 2024-02-05 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.
  --   printed tally 4-1-3 (yea-nay-absent); 5 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001401.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19316 · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.'),
    (m_id, 'dowens_st', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001401.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19316 · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.'),
    (m_id, 'kgrover', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001401.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19316 · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.'),
    (m_id, 'rwinterton', 'committee_vote', false, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001401.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19316 · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.'),
    (m_id, 'stephanie_pitcher', 'committee_vote', true, '2024-02-05T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001401.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19316 · Sen. Stephanie Pitcher moved to pass 1st Substitute S.B. 118 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-22 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.
  --   printed tally 9-1-4 (yea-nay-absent); 10 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'bolinder_h68', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'chew_h68', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'kohler_h59', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'kstratton', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'rshipp', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'tim_jimenez', 'committee_vote', false, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001854.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19313 · Rep. Bolinder moved to pass 4th Substitute S.B. 118 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0126 · S.B. 126 · Gestational Agreement Requirements
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/sbillint/SB0126S01.htm
--   1 issue mapping(s), 2 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 126' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 126', 'Gestational Agreement Requirements',
      'Gestational Agreement Requirements', 'This bill amends provisions relating to gestational agreements.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0126.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0126',
        'primeSponsor', 'PITCHS', 'floorSponsor', 'SPENDRM',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0126S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lgbtq_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lgbtq_rights', 45, true,
      'yea_supports', 'First substitute text replaces the gestational agreement statute''s references to a prospective gestational mother''s husband with references to the mother''s spouse, and removes the clause requiring that both spouses among the intended parents satisfy the married requirement in the gendered form. The statute stops assuming an opposite-sex marriage, which is a narrow recognition gain.', 'https://le.utah.gov/~2024/bills/sbillint/SB0126S01.htm');
  END IF;
  -- 2024-02-08 · Senate Health and Human Services Standing Committee · Sen. Escamilla moved to pass 1st Substitute S.B. 126 out favorably.
  --   printed tally 4-1-2 (yea-nay-absent); 3 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cwilson', 'committee_vote', false, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001508.pdf', 'Senate Health and Human Services Standing Committee · meeting 19213 · Sen. Escamilla moved to pass 1st Substitute S.B. 126 out favorably.'),
    (m_id, 'david_buxton', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001508.pdf', 'Senate Health and Human Services Standing Committee · meeting 19213 · Sen. Escamilla moved to pass 1st Substitute S.B. 126 out favorably.'),
    (m_id, 'lescamilla', 'committee_vote', true, '2024-02-08T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001508.pdf', 'Senate Health and Human Services Standing Committee · meeting 19213 · Sen. Escamilla moved to pass 1st Substitute S.B. 126 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  -- 2024-02-22 · House Health and Human Services Standing Committee · Rep. Dailey-Provost moved to pass 1st Substitute S.B. 126 out favorably.
  --   printed tally 8-1-5 (yea-nay-absent); 4 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'hollins_h24', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001763.pdf', 'House Health and Human Services Standing Committee · meeting 19173 · Rep. Dailey-Provost moved to pass 1st Substitute S.B. 126 out favorably.'),
    (m_id, 'rosemary_lesser', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001763.pdf', 'House Health and Human Services Standing Committee · meeting 19173 · Rep. Dailey-Provost moved to pass 1st Substitute S.B. 126 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001763.pdf', 'House Health and Human Services Standing Committee · meeting 19173 · Rep. Dailey-Provost moved to pass 1st Substitute S.B. 126 out favorably.'),
    (m_id, 'tim_jimenez', 'committee_vote', true, '2024-02-22T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001763.pdf', 'House Health and Human Services Standing Committee · meeting 19173 · Rep. Dailey-Provost moved to pass 1st Substitute S.B. 126 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0166 · S.B. 166 · Health Benefit Amendments
--   mapping read from the substitute_2 text: https://le.utah.gov/~2024/bills/sbillint/SB0166S02.htm
--   1 issue mapping(s), 1 committee action(s), 4 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 166' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 166', 'Health Benefit Amendments',
      'Health Benefit Amendments', 'This bill modifies provisions related to health benefit plans and prescription drugs.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0166.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0166',
        'primeSponsor', 'KENNEMS', 'floorSponsor', 'ELIASS',
        'mappingReadFrom', 'substitute_2', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0166S02.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 45, true,
      'yea_supports', 'Second substitute text defines a long-term drug as one an enrollee has been prescribed for at least one hundred eighty days and requires a health benefit plan to establish procedures, including notice, before requiring the enrollee to switch off that drug or when it leaves the formulary. Continuity of an established prescription is a narrow but real access protection.', 'https://le.utah.gov/~2024/bills/sbillint/SB0166S02.htm');
  END IF;
  -- 2024-02-23 · House Health and Human Services Standing Committee · Rep. Eliason moved to pass 1st Substitute S.B. 166 out favorably.
  --   printed tally 6-2-6 (yea-nay-absent); 4 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cheryl_acton', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001877.pdf', 'House Health and Human Services Standing Committee · meeting 19176 · Rep. Eliason moved to pass 1st Substitute S.B. 166 out favorably.'),
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001877.pdf', 'House Health and Human Services Standing Committee · meeting 19176 · Rep. Eliason moved to pass 1st Substitute S.B. 166 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001877.pdf', 'House Health and Human Services Standing Committee · meeting 19176 · Rep. Eliason moved to pass 1st Substitute S.B. 166 out favorably.'),
    (m_id, 'tim_jimenez', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001877.pdf', 'House Health and Human Services Standing Committee · meeting 19176 · Rep. Eliason moved to pass 1st Substitute S.B. 166 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0176 · S.B. 176 · Child Care Services Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/sbillint/SB0176S01.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 176' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 176', 'Child Care Services Amendments',
      'Child Care Services Amendments', 'This bill enacts the Child Care Capacity Expansion Act.', 'introduced',
      'https://le.utah.gov/~2024/bills/static/SB0176.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0176',
        'primeSponsor', 'ESCAML', 'floorSponsor', 'SPENDRM',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0176S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'child_care') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'child_care', 45, true,
      'yea_supports', 'First substitute text enacts the Child Care Capacity Expansion Act, states its purpose, directs named state departments to collaborate on implementing it, and requires an annual report to legislative committees. The stated object is expanding capacity, but the mechanism is interagency coordination rather than money or slots, so it stays at the narrow-link floor.', 'https://le.utah.gov/~2024/bills/sbillint/SB0176S01.htm');
  END IF;
  -- 2024-02-23 · House Economic Development and Workforce Services Standing Committee · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.
  --   printed tally 7-2-1 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'brett_garner', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'chew_h68', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'jeffrey_stenquist', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'joel_briscoe', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'mark_strong', 'committee_vote', false, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'mark_wheatley', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.'),
    (m_id, 'mballard', 'committee_vote', true, '2024-02-23T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001860.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19290 · Rep. Ballard moved to pass 1st Substitute S.B. 176 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0182 · S.B. 182 · Property Tax Assessment Amendments
--   mapping read from the substitute_5 text: https://le.utah.gov/~2024/bills/sbillint/SB0182S05.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 182' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 182', 'Property Tax Assessment Amendments',
      'Property Tax Assessment Amendments', 'This bill modifies provisions related to property tax assessment.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0182.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0182',
        'primeSponsor', 'HARPEWA', 'floorSponsor', 'ELIASS',
        'mappingReadFrom', 'substitute_5', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0182S05.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'prop_tax') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'prop_tax', 50, true,
      'yea_supports', 'Fifth substitute text gives a property owner additional remedies when valuation alone raises an assessment past a threshold with no significant change to the property, changes the burdens of proof at the county board of equalization and the State Tax Commission so the carrying party need not show substantial error, requires reporting when a county exceeds the threshold, and sets deferral and partial payment rules. The taxpayer''s position in a valuation fight improves.', 'https://le.utah.gov/~2024/bills/sbillint/SB0182S05.htm');
  END IF;
  -- 2024-02-20 · House Revenue and Taxation Standing Committee · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.
  --   printed tally 7-1-5 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'eliason_h45', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'jason_b_kyle', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'joel_briscoe', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'kay_christofferson', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'kstratton', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'mark_strong', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.'),
    (m_id, 'stewart_e_barlow', 'committee_vote', true, '2024-02-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001699.pdf', 'House Revenue and Taxation Standing Committee · meeting 19347 · Rep. Christofferson moved to pass 3rd Substitute S.B. 182 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0211 · S.B. 211 · Generational Water Infrastructure Amendments
--   mapping read from the substitute_1 text: https://le.utah.gov/~2024/bills/sbillint/SB0211S01.htm
--   1 issue mapping(s), 1 committee action(s), 7 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 211' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 211', 'Generational Water Infrastructure Amendments',
      'Generational Water Infrastructure Amendments', 'This bill addresses the development of water resources.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0211.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0211',
        'primeSponsor', 'ADAMSJS', 'floorSponsor', 'SCHULM',
        'mappingReadFrom', 'substitute_1', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillint/SB0211S01.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water_storage') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water_storage', 50, true,
      'yea_supports', 'First substitute text creates the Water District Water Development Council under the Interlocal Cooperation Act with powers, duties, reporting, and consultation requirements, addresses expenditures from the Water Infrastructure Restricted Account, and creates the Utah water agent to negotiate for new water supply with a sunset. The bill builds standing capacity to develop and import water supply.', 'https://le.utah.gov/~2024/bills/sbillint/SB0211S01.htm');
  END IF;
  -- 2024-02-12 · Senate Natural Resources, Agriculture, and Environment Standing Committee · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.
  --   printed tally 6-1-1 (yea-nay-absent); 7 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'blouin_s13', 'committee_vote', false, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'david_buxton', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'dowens_st', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'evickers', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'kgrover', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'rwinterton', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.'),
    (m_id, 'ssandall', 'committee_vote', true, '2024-02-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001628.pdf', 'Senate Natural Resources, Agriculture, and Environment Standing Committee · meeting 19318 · Sen. Scott D. Sandall moved to pass S.B. 211 out favorably.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0233 · S.B. 233 · Medical Cannabis Amendments
--   mapping read from the substitute_3 text: https://le.utah.gov/~2024/bills/sbillamd/SB0233S03.htm
--   1 issue mapping(s), 1 committee action(s), 8 position(s)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 233' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 233', 'Medical Cannabis Amendments',
      'Medical Cannabis Amendments', 'This bill modifies provisions related to medical cannabis.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0233.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0233',
        'primeSponsor', 'ESCAML', 'floorSponsor', 'WARDR',
        'mappingReadFrom', 'substitute_3', 'mappingTextUrl', 'https://le.utah.gov/~2024/bills/sbillamd/SB0233S03.htm',
        'committeeOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'cannabis_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'cannabis_reform', 60, true,
      'yea_supports', 'Third substitute text widens the address types medical cannabis may be delivered to, permits targeted marketing by pharmacies, processors, and clinics, lets additional medical providers recommend to the Compassionate Use Board, eases felony-related license bars, strengthens public employee protections for medical cannabis use, and gives a public employee a Labor Commission complaint route. The advertising limits it keeps are guardrails on a net expansion.', 'https://le.utah.gov/~2024/bills/sbillamd/SB0233S03.htm');
  END IF;
  -- 2024-02-27 · House Natural Resources, Agriculture, and Environment Standing Committee · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.
  --   printed tally 7-1-6 (yea-nay-absent); 8 named voter(s) on the PolitiDex roster
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'chew_h68', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'christine_watkins', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'doug_owens', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'gay_lynn_bennion', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'kstratton', 'committee_vote', false, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'steven_lund', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'tim_jimenez', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.'),
    (m_id, 'walt_brooks', 'committee_vote', true, '2024-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2024/pdf/00001928.pdf', 'House Natural Resources, Agriculture, and Environment Standing Committee · meeting 19315 · Rep. Watkins moved to pass 2nd Substitute S.B. 233 out favorably as amended.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

