-- ─────────────────────────────────────────────────────────────────────────────
-- vr_* — the Utah state legislature's 2025 floor record
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS FIXES. Utah is the reference ballot: the one state where a district
-- resolves and a reader is shown their own seats rather than the national archive.
-- And until this migration, opening any of the 77 Utah legislators on the roster
-- produced "No formal pattern on file yet" — a sentence about the absence of OUR
-- data, sitting on a page that reads as a sentence about THEM. The formal lane had
-- only ever been fed by the federal ingest (api.congress.gov for the House,
-- senate.gov roll-call XML for the Senate), and neither knows a state legislature
-- exists. Utah publishes all of it, in public, without a key. We were not asking.
--
-- WHAT IS HERE. 42 bills from the 2025 General Session, 55 floor roll calls, and
-- 2,254 member votes across 77 rostered legislators — 49 of 75 representatives and
-- 28 of 29 senators. Plus 54 issue mappings, each with the rationale that names the
-- provision it read.
--
-- FIVE THINGS THIS DELIBERATELY DOES NOT DO.
--
--   1. It does not pretend to be federal. `chamber` is 'utah house' / 'utah senate'
--      and `congress` is NULL. That is not decoration — the client renders the
--      chamber string, so a Utah floor vote physically cannot print as "House"
--      above a glossary card reading "435 members, each representing one district".
--      Storing the jurisdiction in the field the UI displays is what keeps the data
--      and its label from drifting apart.
--
--   2. It does not count one bill twice. A Utah bill can produce four recorded
--      floor votes in a single chamber — second reading, third reading, a re-vote
--      after amendment, concurrence. Exactly ONE per (bill, chamber) is written:
--      the latest recorded final-passage vote. Ingesting all four would let one
--      instrument look like four items of depth, which is how a thin record starts
--      to read as a deep one.
--
--   3. It does not ingest lopsided votes. A 72-0 floor vote differentiates nobody;
--      it adds attribution without adding signal. Seven roll calls on bills that
--      are otherwise in this file were refused for that reason (S.B. 262 and
--      S.B. 181 in the Senate, S.B. 23, S.B. 154 and H.B. 235 in the House, S.B. 80
--      in the Senate, H.B. 195 in the House at 65-5). Their other chamber is here;
--      the near-unanimous half is not.
--
--   4. It does not guess who anyone is. le.utah.gov prints "Schultz, M." on a roll
--      call, never a roster id. The name→id table is db/vr-utah-member-map.json and
--      every line of it was reviewed by a person: matched on surname plus
--      first-name compatibility within one chamber, then confirmed against the
--      district in the cell's own leglookup link. District was never the primary
--      key — a district's occupant changes between sessions, so keying on it would
--      hand a departed member's 2025 votes to their successor. 27 printed names did
--      not resolve and their votes are simply absent; they are listed by name below
--      and three of them are refusals rather than gaps (a surname shared with a
--      different person on the roster).
--
--   5. It does not map a bill it cannot read. 30 bills with contested recorded
--      votes were considered and left out, each with a stated reason, in
--      db/vr-utah-bills.json's `_refused`. The largest group is bills whose own
--      provisions run both ways on their own subject — S.B. 197 restricts the
--      homeowner's credit while expanding the renter's credit; S.B. 327 asserts a
--      private bargaining right and carries a clause superseding H.B. 267.
--      H.B. 247 was the session's closest floor vote (38-37) and is not here,
--      because no issue key covers school swimming programs and a contested margin
--      is not a reason to invent one.
--
-- SOURCES. Every row carries its own URL.
--   bill               https://le.utah.gov/~2025/bills/static/<BILL>.html
--   bill JSON          https://le.utah.gov/data/2025GS/<BILL>.json
--   floor roll call    https://le.utah.gov/DynaBill/svotes.jsp
--                        ?sessionid=2025GS&voteid=<ID>&house=<H|S>
--
-- REPRODUCING IT. scripts/vr-utah-ingest.mjs --collect (network) then --seed then
-- --sql. The seed it produces is committed at db/vr-utah-vote-seed.json; the
-- selection and the mappings are hand-authored in db/vr-utah-bills.json. The tool
-- decides which action rows are final-passage votes and how a printed name reads.
-- It decides no bill, no issue, no direction and no weight, and it refuses to write
-- into this directory at all — see db/vr-ingest-runbook.md § Utah.
--
-- IDEMPOTENT. Every measure, mapping and roll call is sentinelled; member votes are
-- ON CONFLICT DO NOTHING. Re-running changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────


-- NOT WRITTEN — 26 member(s) of the utah house who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Abbott, N.; Acton, C.K.; Ballard, M.G.; Barlow, S.; Bennion, G.;
--   Burton, J.; Chevrier, K.; Cutler, P.; Dominguez, R.; Elison, J.;
--   Fiefia, D.; Hayes, S.; Kyle, J.; Loubet, A.; MacPherson, M.; Moss, J.;
--   Petersen, M.; Peterson, K.; Peterson, T.; Shallenberger, D.;
--   Stoddard, A.; Strong, M.A.; Thompson, J.; Thurston, N.; Walter, N.;
--   Wilcox, R.
-- 3 of those (Moss, J.; Peterson, K.; Peterson, T.) are REFUSALS rather than gaps:
-- the surname is shared with a different person on the roster. See
-- db/vr-utah-member-map.json for each one.

-- NOT WRITTEN — 1 member(s) of the utah senate who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Thatcher, D.

-- Additive. Neither index constrains any existing federal row: both are
-- partial and both predicates are false for every row already in the table.
CREATE UNIQUE INDEX IF NOT EXISTS vr_rollcalls_state_unique
  ON vr_rollcalls (chamber, session, roll_number) WHERE congress IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS vr_measures_utah_unique
  ON vr_measures (chamber, number, (external_ids->>'utahSession'))
  WHERE external_ids ? 'utahSession';
--> statement-breakpoint

-- ── H.B. 37 — Utah Housing Amendments  (2025GS/HB0037) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 37' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 37', 'Utah Housing Amendments',
      'Utah Housing Amendments', 'This bill deals with housing development and housing policy.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0037.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0037',
        'primeSponsor', 'Rep. Dunnigan, James A.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 90, true,
      'yea_supports', 'The bill authorizes a municipality or county to allow additional housing density in exchange for certain requirements, lets local governments offer incentives to promote owner-occupied affordable housing, tightens moderate income housing plan and reporting requirements, and directs the Governor''s Office of Planning and Budget to produce a state housing plan. Housing supply and affordability are the bill''s whole subject, so a yea is a vote to act on housing.', 'https://le.utah.gov/~2025/bills/static/HB0037.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_build') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_build', 70, false,
      'yea_supports', 'The density-for-requirements authorization and the lowered minimum population for incorporating a new town are supply-side provisions specifically: they let more units be built where local government agrees. Secondary because the bill also carries planning, reporting and special-district provisions that are not about building.', 'https://le.utah.gov/~2025/bills/static/HB0037.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1651 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1651,
      '2025-03-07T23:22:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":39,"nay":30,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1651&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'defay_h15', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'shelley_h66', 'nay'),
    (rc_id, 'lisa_shepherd', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'christine_watkins', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'carol_spackman_moss', 'not_voting'),
    (rc_id, 'clinton_okerlund', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 360 — Housing Attainability Amendments  (2025GS/HB0360) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 360' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 360', 'Housing Attainability Amendments',
      'Housing Attainability Amendments', 'This bill amends provisions related to affordable housing.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0360.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0360',
        'primeSponsor', 'Rep. Whyte, Stephen L.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 80, true,
      'yea_supports', 'The bill qualifies cities of the first and second class for Utah Homes Investment Program funds to rehabilitate attainable homes, extends that program''s sunset by a year, repeals the Utah Housing Corporation''s sunset, and opens school surplus land to affordable housing use. Every operative provision expands a housing-affordability instrument, so a yea is a vote for them.', 'https://le.utah.gov/~2025/bills/static/HB0360.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_support', 60, false,
      'yea_supports', 'The program funds and the Utah Housing Corporation sunset repeal are subsidy and finance provisions rather than construction provisions — public support for housing, which is this key''s subject.', 'https://le.utah.gov/~2025/bills/static/HB0360.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1576 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1576,
      '2025-03-07T20:47:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":48,"nay":21,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1576&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'shelley_h66', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'carl_albrecht', 'not_voting'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 262 — Housing Affordability Modifications  (2025GS/SB0262) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 262' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 262', 'Housing Affordability Modifications',
      'Housing Affordability Modifications', 'This bill amends provisions related to affordable housing.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0262.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0262',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 80, true,
      'yea_supports', 'The bill broadens the permitted uses of home ownership promotion zone revenue (water exactions, street lighting, environmental remediation), requires counties to apply land use provisions to pending as well as new applications, and directs the Utah Housing Corporation to write rules for first-time homebuyer lending. Affordable housing is named in the bill''s own general provisions as its subject.', 'https://le.utah.gov/~2025/bills/static/SB0262.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_first_time') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_first_time', 60, false,
      'yea_supports', 'The first-time homebuyer mortgage rules and the buyer incentive program are aimed at first purchases specifically. Secondary because the promotion-zone and land-use provisions are the larger part of the bill.', 'https://le.utah.gov/~2025/bills/static/SB0262.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1238 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1238,
      '2025-03-05T18:31:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":45,"nay":22,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1238&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'hoang_nguyen', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 181 — Housing Affordability Amendments  (2025GS/SB0181) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 181' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 181', 'Housing Affordability Amendments',
      'Housing Affordability Amendments', 'This bill enacts and amends provisions related to housing affordability.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0181.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0181',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 70, true,
      'yea_supports', 'The bill is short and single-purpose: it enacts limits on how local land use regulation may treat certain parking spaces, with exceptions. Its own general provisions name housing affordability as the subject, and parking minimums are a recognised cost per unit.', 'https://le.utah.gov/~2025/bills/static/SB0181.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_build') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_build', 60, false,
      'yea_supports', 'Capping a parking requirement is a supply-side change — it reduces what a project must include before it may be built. Secondary only because the bill reaches parking and nothing else.', 'https://le.utah.gov/~2025/bills/static/SB0181.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1404 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1404,
      '2025-03-06T19:14:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":50,"nay":20,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1404&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'clinton_okerlund', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'shelley_h66', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'auxier_h4', 'not_voting'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 23 — First Home Investment Zone Amendments  (2025GS/SB0023) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 23' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 23', 'First Home Investment Zone Amendments',
      'First Home Investment Zone Amendments', 'This bill modifies provisions affecting first home investment zones.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0023.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0023',
        'primeSponsor', 'Sen. Harper, Wayne A.', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 50, true,
      'yea_supports', 'The bill clarifies owner-occupancy requirements in a first home investment zone and how extraterritorial homes count toward that zone''s density and owner-occupancy tests. It is a maintenance bill on a housing instrument, and the weight is deliberately low to say so: a yea keeps the zone workable, which is a smaller thing than creating it.', 'https://le.utah.gov/~2025/bills/static/SB0023.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_first_time') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_first_time', 40, false,
      'yea_supports', 'First home investment zones exist for first purchases, and the owner-occupancy clarification is what keeps them pointed there. Low weight for the same reason as above.', 'https://le.utah.gov/~2025/bills/static/SB0023.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 340 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 340,
      '2025-02-10T11:22:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":22,"nay":4,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=340&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'lescamilla', 'not_voting'),
    (rc_id, 'john_johnson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 256 — Municipal and County Zoning Amendments  (2025GS/HB0256) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 256' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 256', 'Municipal and County Zoning Amendments',
      'Municipal and County Zoning Amendments', 'This bill modifies provisions related to the authority of municipalities and counties regarding short-term rentals.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0256.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0256',
        'primeSponsor', 'Rep. Walter, R. Neil', 'floorSponsor', 'Sen. Vickers, Evan J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lands_local') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lands_local', 60, true,
      'yea_supports', 'The bill lets a municipality or county require a business license for a short-term rental, use a website listing as partial evidence of a violation, and ask a short-term rental platform to remove a non-compliant listing. Every provision hands a local government a tool it did not have, so a yea is a vote for local land use authority.', 'https://le.utah.gov/~2025/bills/static/HB0256.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 40, false,
      'yea_opposes', 'The same provisions are restrictions on what an owner may do with their own dwelling — licensing, evidence, delisting. Recorded as the other side of the same coin rather than left out, because a reader who cares about property rights would read this vote the other way and is entitled to see it.', 'https://le.utah.gov/~2025/bills/static/HB0256.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1340 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1340,
      '2025-03-06T15:11:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":47,"nay":22,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1340&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'defay_h15', 'not_voting'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 103 — State Land Access Road Amendments  (2025GS/HB0103) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 103' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 103', 'State Land Access Road Amendments',
      'State Land Access Road Amendments', 'This bill requires certain state entities to identify and record notice of roads that traverse certain lands owned by the state.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0103.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0103',
        'primeSponsor', 'Rep. Shelley, Troy', 'floorSponsor', 'Sen. Stratton, Keven J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lands_local') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lands_local', 60, true,
      'yea_supports', 'The bill requires PLPCO and SITLA to identify and record notice of roads crossing state and trust lands, and — the operative provision — bars the Division of Wildlife Resources from permanently closing a road without the consent of the county''s legislative body. A county consent requirement over a state division''s closure decision is local control over land, which is this key''s subject.', 'https://le.utah.gov/~2025/bills/static/HB0103.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 682 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 682,
      '2025-02-24T11:39:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":61,"nay":8,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=682&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 209 — Homeschool Amendments  (2025GS/HB0209) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 209' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 209', 'Homeschool Amendments',
      'Homeschool Amendments', 'This bill amends provisions related to home school affidavits.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0209.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0209',
        'primeSponsor', 'Rep. Peck, Nicholeen P.', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 80, true,
      'yea_supports', 'The bill removes the affidavit requirement for parents whose children begin homeschooling at the start of an academic year, removes the requirement that parents attest to criminal background history, and reduces a letter of intent to a notice the local board processes. It moves the decision to homeschool further from state review and closer to the parent, which is what this key is about.', 'https://le.utah.gov/~2025/bills/static/HB0209.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 50, false,
      'yea_supports', 'Lowering the procedural cost of leaving a district school widens the practical set of schooling options. Secondary because the bill funds nothing and creates no alternative — it only removes paperwork.', 'https://le.utah.gov/~2025/bills/static/HB0209.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1160 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1160,
      '2025-03-05T10:22:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":62,"nay":13,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1160&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1541 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1541,
      '2025-03-03T15:36:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":20,"nay":5,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1541&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'evickers', 'nay'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'cmusselman', 'not_voting'),
    (rc_id, 'cwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 272 — Micro-education Entity Amendments  (2025GS/SB0272) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 272' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 272', 'Micro-education Entity Amendments',
      'Micro-education Entity Amendments', 'This bill amends provisions regarding a facility in which a micro-education entity or home-based microschool operates.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0272.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0272',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Peterson, Thomas W.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 80, true,
      'yea_supports', 'The bill expands the occupancy standards a facility may satisfy to host a micro-education entity or home-based microschool, removes square footage minimums, and excludes such entities from the definition of "school" that triggers certain administrative regulation. Each provision makes a small non-district school easier to open and operate.', 'https://le.utah.gov/~2025/bills/static/SB0272.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 50, false,
      'yea_supports', 'Microschools and home-based microschools are parent-organised. Secondary because the bill''s text is about facilities and occupancy codes, not about parental authority as such.', 'https://le.utah.gov/~2025/bills/static/SB0272.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1591 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1591,
      '2025-03-07T21:25:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":11,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1591&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1172 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1172,
      '2025-02-26T10:58:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":6,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1172&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'tweiler', 'not_voting'),
    (rc_id, 'rwinterton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 321 — Public Education Funding Amendments  (2025GS/SB0321) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 321' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 321', 'Public Education Funding Amendments',
      'Public Education Funding Amendments', 'This bill removes a hold harmless provision.', 'failed',
      'https://le.utah.gov/~2025/bills/static/SB0321.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0321',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Pierucci, Candice B.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 60, true,
      'yea_opposes', 'The bill removes the hold harmless provision on voted and board levies, with a graduated phase-out. Hold harmless is what protects a district''s levy revenue when its enrolment or valuation falls; removing it withdraws a funding protection from district schools. A yea is therefore a vote against this key''s direction, and the mapping says so rather than dressing a cut as a reform.', 'https://le.utah.gov/~2025/bills/static/SB0321.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1484 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1484,
      '2025-03-03T11:00:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":18,"nay":8,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1484&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'rwinterton', 'nay'),
    (rc_id, 'jennifer_plumb', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 102 — Public Education Reporting Amendments  (2025GS/SB0102) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 102' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 102', 'Public Education Reporting Amendments',
      'Public Education Reporting Amendments', 'This bill requires certain programs be reviewed.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0102.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0102',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. MacPherson, Matt'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 50, true,
      'yea_supports', 'The bill mandates regular program reviews by the Education Interim Committee for named programs. A standing legislative review requirement is oversight of how public money is working, which is this key''s subject. Weight is modest because the bill creates a review duty and nothing else.', 'https://le.utah.gov/~2025/bills/static/SB0102.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 40, false,
      'yea_supports', 'The programs reviewed are public education programs and the review is aimed at whether they work. Recorded as secondary and as support because scrutiny of a programme is not a cut to it; nothing in the bill reduces a funding line.', 'https://le.utah.gov/~2025/bills/static/SB0102.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1614 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1614,
      '2025-03-07T22:28:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":55,"nay":12,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1614&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'auxier_h4', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 683 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 683,
      '2025-02-19T11:06:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":6,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=683&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'mckell_s25', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 497 — Public Education Compliance  (2025GS/HB0497) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 497' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 497', 'Public Education Compliance',
      'Public Education Compliance', 'This bill amends and enacts provisions expanding the authority of the State Board of Education (state board) to address transparency and local education agency compliance.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0497.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0497',
        'primeSponsor', 'Rep. Hall, Katy', 'floorSponsor', 'Sen. Wilson, Chris H.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 60, true,
      'yea_supports', 'The bill requires the State Board of Education to publish information about its own meetings, to use an existing compliance framework when handling noncompliance reports, and to build a timely complaints process; and it requires districts and charter schools to hand the board the data its statutory reporting duties need. Publication and compliance machinery is what this key names.', 'https://le.utah.gov/~2025/bills/static/HB0497.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 40, false,
      'yea_supports', 'The duties land on the state board and on local education agencies, and are aimed at making the public system answerable rather than at reducing it.', 'https://le.utah.gov/~2025/bills/static/HB0497.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1533 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1533,
      '2025-03-07T17:15:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":60,"nay":11,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1533&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 453 — State School Board Transparency Amendments  (2025GS/HB0453) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 453' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 453', 'State School Board Transparency Amendments',
      'State School Board Transparency Amendments', 'This bill creates new duties for the Utah State Board of Education.', 'failed',
      'https://le.utah.gov/~2025/bills/static/HB0453.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0453',
        'primeSponsor', 'Rep. Brooks, Walt', 'floorSponsor', 'Sen. Hinkins, David P.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 50, true,
      'yea_supports', 'The bill has two provisions and both are disclosure: the State Board of Education must publish information related to its meetings on its website, and may be required to issue a report. Weight is modest because the bill is small, not because the direction is unclear.', 'https://le.utah.gov/~2025/bills/static/HB0453.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1018 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1018,
      '2025-02-28T15:36:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":10,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1018&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'auxier_h4', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 154 — Legislative Audit Amendments  (2025GS/SB0154) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 154' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 154', 'Legislative Audit Amendments',
      'Legislative Audit Amendments', 'This bill enacts and amends provisions governing the duties and powers of the legislative auditor general.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0154.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0154',
        'primeSponsor', 'Sen. Brammer, Brady', 'floorSponsor', 'Rep. Teuscher, Jordan D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 70, true,
      'yea_supports', 'The bill restates the legislative auditor general''s authority, requires an entity withholding privileged items to expressly assert the privilege, lets the auditor general contest that claim, and sends contested claims to an arbitrator. It makes it harder for an audited agency to refuse an auditor silently, which is oversight machinery.', 'https://le.utah.gov/~2025/bills/static/SB0154.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 2155 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 2155,
      '2025-03-07T21:07:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":20,"nay":5,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=2155&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'jennifer_plumb', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'rwinterton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 235 — County Auditor Modifications  (2025GS/HB0235) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 235' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 235', 'County Auditor Modifications',
      'County Auditor Modifications', 'This bill amends provisions related to a county auditor in a county of the first class.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0235.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0235',
        'primeSponsor', 'Rep. Teuscher, Jordan D.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 50, true,
      'yea_supports', 'The bill establishes professional requirements for the county auditor, and for candidates for that office, in a county of the first class. The auditor is the county''s internal check, and qualification requirements go to whether that check is capable of working. Weight is modest: the bill sets qualifications, and publishes nothing.', 'https://le.utah.gov/~2025/bills/static/HB0235.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 794 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 794,
      '2025-02-20T11:19:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":20,"nay":3,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=794&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'kgrover', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 508 — School Data Amendments  (2025GS/HB0508) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 508' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 508', 'School Data Amendments',
      'School Data Amendments', 'This bill requires the State Board of Education (state board) to study and make recommendations regarding local education agency (LEA) data collection, retention, student information systems, and reporting requirements.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0508.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0508',
        'primeSponsor', 'Rep. MacPherson, Matt', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 50, true,
      'yea_supports', 'The bill directs the State Board of Education to study how local education agencies collect and retain student personally identifiable information, to examine reporting requirements and possible sunsets, and to report recommendations. It is a study bill, so the weight is modest — but the thing being studied is student data collection, and the bill''s stated aim is to find what can be reduced.', 'https://le.utah.gov/~2025/bills/static/HB0508.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1491 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1491,
      '2025-03-07T15:13:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":62,"nay":8,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1491&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'hoang_nguyen', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 303 — Public School Directory Sharing Amendments  (2025GS/HB0303) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 303' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 303', 'Public School Directory Sharing Amendments',
      'Public School Directory Sharing Amendments', 'This bill amends the communication requirements of a local education agency.', 'failed',
      'https://le.utah.gov/~2025/bills/static/HB0303.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0303',
        'primeSponsor', 'Rep. Acton, Cheryl K.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 50, true,
      'yea_opposes', 'The bill requires a local education agency to share student directory information with another local education agency on request. It converts a discretionary disclosure into a mandatory one, so a yea moves student data more freely between agencies. Recorded as opposition to the privacy key because that is the direction of the operative provision, whatever the bill''s purpose in sharing.', 'https://le.utah.gov/~2025/bills/static/HB0303.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 907 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 907,
      '2025-02-27T15:09:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":40,"nay":33,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=907&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'eliason_h45', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'tracy_miller', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'clinton_okerlund', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'calvin_roberts', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'shelley_h66', 'nay'),
    (rc_id, 'lisa_shepherd', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'whyte_h63', 'nay'),
    (rc_id, 'colin_w_jack', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 124 — Education Industry Employee Privacy  (2025GS/HB0124) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 124' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 124', 'Education Industry Employee Privacy',
      'Education Industry Employee Privacy', 'This bill provides for the personal privacy of local education agency employees.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0124.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0124',
        'primeSponsor', 'Rep. Lee, Trevor ', 'floorSponsor', 'Sen. Wilson, Chris H.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 70, true,
      'yea_supports', 'The bill bars a local education agency from selling or transferring employee contact information without consent, prohibits requiring certain technologies on an employee''s personal device, requires accommodations where such technology use is mandatory, and gives employees a complaint route to the State Board of Education. Consent, device autonomy and enforcement are all squarely this key.', 'https://le.utah.gov/~2025/bills/static/HB0124.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 480 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 480,
      '2025-02-19T11:07:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":62,"nay":10,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=480&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 561 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 561,
      '2025-02-14T11:26:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":16,"nay":5,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=561&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'lincoln_fillmore', 'not_voting'),
    (rc_id, 'kgrover', 'not_voting'),
    (rc_id, 'dipson', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 267 — Public Sector Labor Union Amendments  (2025GS/HB0267) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 267' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 267', 'Public Sector Labor Union Amendments',
      'Public Sector Labor Union Amendments', 'This bill amends provisions governing public employee, public safety, and public fire labor organizations.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0267.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0267',
        'primeSponsor', 'Rep. Teuscher, Jordan D.', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_workers') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_workers', 100, true,
      'yea_opposes', 'The bill prohibits a public employer from recognising a labor organization as a bargaining agent, prohibits public employers from entering collective bargaining contracts at all, bars public money or property from being used to assist or deter union organizing, and excludes new labor organization employees from Utah Retirement Systems. Ending public sector collective bargaining is the bill''s headline and its operative core, so a yea runs against organised worker bargaining power. This is the session''s clearest single division and the weight says so.', 'https://le.utah.gov/~2025/bills/static/HB0267.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 55 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 55,
      '2025-01-27T12:14:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":42,"nay":32,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=55&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'eliason_h45', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'jon_hawkins', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'tracy_miller', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'christine_watkins', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'carl_albrecht', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 270 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 270,
      '2025-02-06T12:12:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":16,"nay":13,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=270&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'amillner', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'evickers', 'nay'),
    (rc_id, 'rwinterton', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 106 — Income Tax Revisions  (2025GS/HB0106) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 106' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 106', 'Income Tax Revisions',
      'Income Tax Revisions', 'This bill amends income tax provisions.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0106.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0106',
        'primeSponsor', 'Rep. Christofferson, Kay J.', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lower_taxes') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lower_taxes', 100, true,
      'yea_supports', 'The bill amends the individual income tax rate and the corporate franchise and income tax rates, and adds nonrefundable credits. Rate reduction is the bill''s subject, named in its own title and general provisions.', 'https://le.utah.gov/~2025/bills/static/HB0106.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'child_care') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'child_care', 50, false,
      'yea_supports', 'The same bill enacts nonrefundable corporate and individual credits for employer-provided child care and extends the child tax credit to dependents under one and up to five years old. Secondary because the credits ride on a rate bill rather than being its purpose.', 'https://le.utah.gov/~2025/bills/static/HB0106.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1272 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1272,
      '2025-03-05T20:56:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":58,"nay":13,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1272&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 201 — Energy Resource Amendments  (2025GS/HB0201) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 201' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 201', 'Energy Resource Amendments',
      'Energy Resource Amendments', 'This bill modifies provisions related to the evaluation of integrated resource plans by the Public Service Commission.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0201.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0201',
        'primeSponsor', 'Rep. Jack, Colin W.', 'floorSponsor', 'Sen. Winterton, Ronald M.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 80, true,
      'yea_supports', 'The bill requires full cost attribution for supplemental resources in an electrical utility''s integrated resource plan, sets how generation capacity is calculated, requires certain designations in the utility''s action plan, and prohibits involuntary demand management programs. Attributing full cost to supplemental resources and forbidding involuntary demand reduction both push planning toward firm generating capacity, which is this key''s subject.', 'https://le.utah.gov/~2025/bills/static/HB0201.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 587 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 587,
      '2025-02-21T10:53:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":57,"nay":10,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=587&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'chew_h68', 'not_voting'),
    (rc_id, 'tyler_clancy', 'not_voting'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 812 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 812,
      '2025-02-20T12:06:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":6,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=812&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'brammer_s21', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 119 — Solar Panel Restrictions in Homeowners Associations Amendments  (2025GS/HB0119) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 119' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 119', 'Solar Panel Restrictions in Homeowners Associations Amendments',
      'Solar Panel Restrictions in Homeowners Associations Amendments', 'This bill modifies the Utah Community Association Act.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0119.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0119',
        'primeSponsor', 'Rep. Owens, Doug', 'floorSponsor', 'Sen. Weiler, Todd'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'enviro_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'enviro_energy', 70, true,
      'yea_supports', 'The bill stops a homeowners association from prohibiting solar panel installation, while leaving the association power to restrict how it is done. Removing an outright private ban on rooftop solar is a vote for that generation existing, which is what this key reads.', 'https://le.utah.gov/~2025/bills/static/HB0119.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 40, false,
      'yea_supports', 'The provision runs in the owner''s favour against a community association''s restriction on their own roof. Secondary because the bill also preserves association authority to restrict installation, so it is not a clean expansion of owner control.', 'https://le.utah.gov/~2025/bills/static/HB0119.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 337 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 337,
      '2025-02-11T15:49:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":42,"nay":31,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=337&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'clinton_okerlund', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'calvin_roberts', 'nay'),
    (rc_id, 'jake_sawyer', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'whyte_h63', 'nay'),
    (rc_id, 'hall_h11', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1550 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1550,
      '2025-03-04T09:52:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":10,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1550&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'kgrover', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'mckell_s25', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'cwilson', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 85 — Environmental Permitting Modifications  (2025GS/HB0085) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 85' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 85', 'Environmental Permitting Modifications',
      'Environmental Permitting Modifications', 'This bill addresses provisions related to environmental permitting.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0085.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0085',
        'primeSponsor', 'Rep. Clancy, Tyler', 'floorSponsor', 'Sen. Winterton, Ronald M.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'permitting_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'permitting_reform', 80, true,
      'yea_supports', 'The bill requires the Division of Air Quality to publish guidance and rules on federal plantwide applicability limitations, to review its permit-by-rule registration rules, and to add at least five new source categories to the permit-by-rule program. Moving sources from individual permits into permit-by-rule is a reduction in permitting burden, which is this key''s subject.', 'https://le.utah.gov/~2025/bills/static/HB0085.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 153 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 153,
      '2025-02-04T15:01:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":64,"nay":9,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=153&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 747 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 747,
      '2025-02-19T15:35:00-07:00'::timestamptz, 'On passage, second reading', 'passage', 'passed',
      '{"yea":17,"nay":4,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=747&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'heidi_balderree', 'not_voting'),
    (rc_id, 'dhinkins', 'not_voting'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'mckell_s25', 'not_voting'),
    (rc_id, 'amillner', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 355 — Mining and Critical Infrastructure Materials Amendments  (2025GS/HB0355) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 355' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 355', 'Mining and Critical Infrastructure Materials Amendments',
      'Mining and Critical Infrastructure Materials Amendments', 'This bill addresses mining and critical infrastructure materials operations.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0355.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0355',
        'primeSponsor', 'Rep. Snider, Casey', 'floorSponsor', 'Sen. Sandall, Scott D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lands_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lands_energy', 60, true,
      'yea_supports', 'The bill widens vested critical infrastructure materials use provisions toward the more permissive vested mining standard, addresses operations on new land for both mining and critical infrastructure materials uses, and repeals a study requirement. It expands extractive use of land, which is this key''s direction.', 'https://le.utah.gov/~2025/bills/static/HB0355.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1623 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1623,
      '2025-03-07T22:40:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":41,"nay":29,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1623&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'tracy_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'clinton_okerlund', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'auxier_h4', 'not_voting'),
    (rc_id, 'chew_h68', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 187 — Throughput Infrastructure Funding Amendments  (2025GS/SB0187) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 187' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 187', 'Throughput Infrastructure Funding Amendments',
      'Throughput Infrastructure Funding Amendments', 'This bill addresses financial assistance that is funded through the Throughput Infrastructure Fund.', 'passed_senate',
      'https://le.utah.gov/~2025/bills/static/SB0187.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0187',
        'primeSponsor', 'Sen. Stevenson, Jerry W.', 'floorSponsor', 'Rep. Snider, Casey'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lands_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lands_energy', 60, true,
      'yea_supports', 'The bill widens the definition of a throughput infrastructure project, expands the Permanent Community Impact Fund Board''s authority over the Throughput Infrastructure Fund, and allows a loan or grant from that fund for certain mining activity. Public finance for extraction and its transport is a vote for extractive land use.', 'https://le.utah.gov/~2025/bills/static/SB0187.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1607 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1607,
      '2025-03-07T22:15:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":11,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1607&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'defay_h15', 'not_voting'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 2224 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 2224,
      '2025-03-07T23:25:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":22,"nay":5,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=2224&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'lescamilla', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 274 — Water Amendments  (2025GS/HB0274) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 274' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 274', 'Water Amendments',
      'Water Amendments', 'This bill addresses regulations related to water.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0274.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0274',
        'primeSponsor', 'Rep. Snider, Casey', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 70, true,
      'yea_supports', 'The bill lets a municipality set different water rates based partly on conservation, creates a presumption that a conservation-based rate is reasonable, addresses tiered secondary water rates, and governs how retail rate revenue may be spent. Making conservation pricing legally defensible is a water-policy provision, and the conservation direction is explicit in the text.', 'https://le.utah.gov/~2025/bills/static/HB0274.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1655 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1655,
      '2025-03-07T23:24:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":60,"nay":9,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1655&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'auxier_h4', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 80 — Water Fee Amendments  (2025GS/SB0080) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 80' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 80', 'Water Fee Amendments',
      'Water Fee Amendments', 'This bill allows state agencies to develop a fee schedule for water consumption.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0080.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0080',
        'primeSponsor', 'Sen. Sandall, Scott D.', 'floorSponsor', 'Rep. Snider, Casey'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 60, true,
      'yea_supports', 'The bill requires the Department of Environmental Quality to establish a water consumption fee schedule, allows the Water Development Coordinating Council to establish one subject to legislative approval, exempts wholesale and agricultural water, and deposits the proceeds into the Water Infrastructure Fund. A dedicated fee funding water infrastructure is a water-policy instrument; the agricultural exemption is why the weight is not higher.', 'https://le.utah.gov/~2025/bills/static/SB0080.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 819 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 819,
      '2025-02-26T10:52:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":62,"nay":7,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=819&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'tyler_clancy', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 269 — Privacy Protections in Sex-designated Areas  (2025GS/HB0269) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 269', 'Privacy Protections in Sex-designated Areas',
      'Privacy Protections in Sex-designated Areas', 'This bill modifies provisions regarding sex-designated privacy spaces in education and government facilities.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0269.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0269',
        'primeSponsor', 'Rep. Gricius, Stephanie', 'floorSponsor', 'Sen. Brammer, Brady'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lgbtq_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lgbtq_rights', 100, true,
      'yea_opposes', 'The bill removes a medical treatment documentation provision from the evidence a person may offer for access to a sex-designated privacy space, narrows an exception to the prohibition on sex-based distinctions so it reaches only a School Activity Eligibility Commission determination, broadens a nonprofit educational institution exception to the Utah Fair Housing Act, and adds student housing guidance duties. Each provision narrows where a transgender person may be, or removes a route by which they may establish access, so a yea runs against this key. Direction is stated plainly because the operative text is plain.', 'https://le.utah.gov/~2025/bills/static/HB0269.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 258 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 258,
      '2025-02-10T11:22:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":59,"nay":14,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=258&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 280 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 280,
      '2025-02-06T15:04:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":20,"nay":7,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=280&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'harper_s16', 'not_voting'),
    (rc_id, 'amillner', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 312 — Criminal Justice Amendments  (2025GS/HB0312) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 312' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 312', 'Criminal Justice Amendments',
      'Criminal Justice Amendments', 'This bill modifies statutory provisions related to criminal justice.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0312.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0312',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. Brammer, Brady'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 90, true,
      'yea_supports', 'The bill constrains release of individuals due to correctional facility overcrowding, expands contracting to house individuals with federal and county entities, adds detention removal officers to the federal officers holding statewide law enforcement authority, and prohibits state funds for syringe exchange programs. Several independent provisions all increase detention capacity or enforcement reach and one withdraws a harm-reduction program, so the direction is consistent across the bill.', 'https://le.utah.gov/~2025/bills/static/HB0312.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1221 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1221,
      '2025-03-05T18:01:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":57,"nay":15,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1221&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'defay_h15', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 562 — Law Enforcement and Criminal Justice Amendments  (2025GS/HB0562) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 562' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 562', 'Law Enforcement and Criminal Justice Amendments',
      'Law Enforcement and Criminal Justice Amendments', 'This bill modifies provisions related to law enforcement and criminal justice.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0562.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0562',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. Weiler, Todd'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 70, true,
      'yea_supports', 'The bill extends the Office of State Debt Collection''s authority to civil accounts receivable and civil restitution judgments, extends administrative garnishment to a debtor''s property or wages held by a third party, sets repayment procedures for unpaid criminal accounts receivable after a sentence ends, and adds requirements for temporary pretrial detention orders. Collection after sentence and pretrial detention machinery both extend the reach of the criminal process.', 'https://le.utah.gov/~2025/bills/static/HB0562.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1466 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1466,
      '2025-03-07T12:03:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":58,"nay":14,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1466&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'kohler_h59', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 465 — Public Safety Amendments  (2025GS/HB0465) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 465' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 465', 'Public Safety Amendments',
      'Public Safety Amendments', 'This bill addresses provisions related to public safety.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0465.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0465',
        'primeSponsor', 'Rep. Snider, Casey', 'floorSponsor', 'Sen. McKell, Michael K.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 70, true,
      'yea_supports', 'The bill requires the law enforcement agency of the city that is a first-class county''s seat of government to enter an interagency public safety agreement with the Department of Public Safety and to report on it, and lets the Division of Facilities Construction and Management condemn certain city-owned unincorporated property. It imposes state public safety involvement on a specific city''s policing, which is an enforcement-side provision.', 'https://le.utah.gov/~2025/bills/static/HB0465.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1649 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1649,
      '2025-03-07T23:21:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":56,"nay":12,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1649&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'grant_miller', 'not_voting'),
    (rc_id, 'carol_spackman_moss', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 96 — Fraud Amendments  (2025GS/HB0096) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 96' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 96', 'Fraud Amendments',
      'Fraud Amendments', 'This bill addresses the criminal offense of defrauding of creditors.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0096.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0096',
        'primeSponsor', 'Rep. Cutler, Paul A.', 'floorSponsor', 'Sen. Balderree, Heidi'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 60, true,
      'yea_supports', 'The bill increases the penalty for defrauding creditors according to the value defrauded. It is a single-provision penalty increase — clear in direction, modest in reach, and weighted accordingly.', 'https://le.utah.gov/~2025/bills/static/HB0096.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1567 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1567,
      '2025-03-07T20:39:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":63,"nay":11,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1567&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 195 — Firearm Retention Amendments  (2025GS/HB0195) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 195' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 195', 'Firearm Retention Amendments',
      'Firearm Retention Amendments', 'This bill address the retention in evidence of seized firearms.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0195.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0195',
        'primeSponsor', 'Rep. MacPherson, Matt', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 80, true,
      'yea_supports', 'The bill bars a plea in abeyance from conditioning on firearm forfeiture in certain circumstances and requires law enforcement to return a seized firearm to a person who may lawfully possess it and is not charged with a disqualifying crime. Both provisions restore possession, which is this key''s subject.', 'https://le.utah.gov/~2025/bills/static/HB0195.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1544 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1544,
      '2025-03-03T15:39:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":6,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1544&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'cwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 187 — Imitation Firearm Amendments  (2025GS/HB0187) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 187' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 187', 'Imitation Firearm Amendments',
      'Imitation Firearm Amendments', 'This bill addresses imitation firearms that have been altered to have the appearance of a firearm.', 'failed',
      'https://le.utah.gov/~2025/bills/static/HB0187.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0187',
        'primeSponsor', 'Rep. Fitisemanu, Jake', 'floorSponsor', 'Sen. Harper, Wayne A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_safety') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_safety', 50, true,
      'yea_supports', 'The bill creates an infraction for a minor who, after a written warning, possesses an altered toy or imitation firearm made to look like an actual firearm. It regulates an object because of the danger created by mistaking it for a real gun. Weight is modest — the bill reaches imitations only, never a firearm — and it is mapped to safety rather than to rights for the same reason.', 'https://le.utah.gov/~2025/bills/static/HB0187.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 561 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 561,
      '2025-02-20T14:49:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":11,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=561&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'mschultz', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'kay_christofferson', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 365 — Mental Health Care Study Amendments  (2025GS/HB0365) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 365' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 365', 'Mental Health Care Study Amendments',
      'Mental Health Care Study Amendments', 'This bill requires the Department of Health and Human Services to issue a request for proposals to conduct a study.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0365.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0365',
        'primeSponsor', 'Rep. Barlow, Stewart E.', 'floorSponsor', 'Sen. Plumb, Jen'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'health_mental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'health_mental', 50, true,
      'yea_supports', 'The bill requires the Department of Health and Human Services to issue a request for proposals for a study of wait times and barriers for a child to see a therapist. It is a study and the weight says so, but its whole subject is access to mental health care.', 'https://le.utah.gov/~2025/bills/static/HB0365.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 742 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 742,
      '2025-02-25T10:14:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":53,"nay":11,"notVoting":11}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=742&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'koford_h10', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'defay_h15', 'not_voting'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'ashlee_matthews', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 78 — Homeless Individuals Protection Amendments  (2025GS/SB0078) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 78' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 78', 'Homeless Individuals Protection Amendments',
      'Homeless Individuals Protection Amendments', 'This bill creates the homeless service provider ombudsman within the Office of Homeless Services.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/SB0078.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0078',
        'primeSponsor', 'Sen. Plumb, Jen', 'floorSponsor', 'Rep. Clancy, Tyler'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'homeless') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'homeless', 70, true,
      'yea_supports', 'The bill creates a homeless service provider ombudsman inside the Office of Homeless Services, defines the ombudsman''s duties, authorizes implementing rules, and sets a five-year sunset review. A standing complaints and oversight route for people using homeless services is a service-side provision, which is this key''s direction.', 'https://le.utah.gov/~2025/bills/static/SB0078.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1373 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1373,
      '2025-03-06T17:49:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":43,"nay":28,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1373&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'logan_monson', 'nay'),
    (rc_id, 'nicholeen_p_peck', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'jake_sawyer', 'nay'),
    (rc_id, 'mschultz', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 475 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 475,
      '2025-02-12T11:47:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":18,"nay":8,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=475&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'sadams', 'nay'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'mckell_s25', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 189 — Child Care Services Amendments  (2025GS/SB0189) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 189' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 189', 'Child Care Services Amendments',
      'Child Care Services Amendments', 'This bill enacts the Child Care Capacity Expansion Act.', 'failed',
      'https://le.utah.gov/~2025/bills/static/SB0189.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0189',
        'primeSponsor', 'Sen. Escamilla, Luz', 'floorSponsor', 'Rep. Lisonbee, Karianne'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'child_care') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'child_care', 70, true,
      'yea_supports', 'The bill enacts the Child Care Capacity Expansion Act, directs state departments to collaborate on implementing it, limits liability arising from an expanded facility''s operations, and requires annual reporting. Expanding capacity is the act''s stated purpose and its operative content.', 'https://le.utah.gov/~2025/bills/static/SB0189.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 669 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 669,
      '2025-02-19T10:39:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":17,"nay":7,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=669&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'mckell_s25', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'kathleen_riebe', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 114 — Veteran Access to State Parks  (2025GS/SB0114) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 114' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 114', 'Veteran Access to State Parks',
      'Veteran Access to State Parks', 'This bill addresses a program that offers a discounted annual pass to state parks for qualified veterans.', 'failed',
      'https://le.utah.gov/~2025/bills/static/SB0114.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0114',
        'primeSponsor', 'Sen. Kwan, Karen', 'floorSponsor', 'Rep. Gwynn, Matthew H.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'veterans') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'veterans', 50, true,
      'yea_supports', 'The bill creates a program, as funding allows, offering resident qualified veterans an annual state parks pass at at least 25 percent off, with rulemaking authority and a three-year automatic repeal. A benefit for veterans is this key''s subject; the funding condition and the sunset are why the weight is modest.', 'https://le.utah.gov/~2025/bills/static/SB0114.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 273 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 273,
      '2025-02-06T14:50:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":17,"nay":12,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=273&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'sadams', 'nay'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'kcullimore', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'kgrover', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'ssandall', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'cwilson', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 290 — Bicycle Lane Safety Amendments  (2025GS/HB0290) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 290' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 290', 'Bicycle Lane Safety Amendments',
      'Bicycle Lane Safety Amendments', 'This bill addresses safety elements in a bicycle lane.', 'enacted',
      'https://le.utah.gov/~2025/bills/static/HB0290.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0290',
        'primeSponsor', 'Rep. Mauga, Verona', 'floorSponsor', 'Sen. Weiler, Todd'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 50, true,
      'yea_supports', 'The bill clarifies when a motor vehicle may be in a bicycle lane and restricts obstructing one. Protecting a bicycle lane from vehicles is a provision about non-car mobility, which is what this key covers. Weight is modest because the bill funds nothing and builds nothing.', 'https://le.utah.gov/~2025/bills/static/HB0290.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 332 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 332,
      '2025-02-11T15:37:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":61,"nay":10,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=332&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'cory_maloy_h52', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1414 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 1414,
      '2025-02-28T11:18:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":16,"nay":8,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1414&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'mckell_s25', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting'),
    (rc_id, 'evickers', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 195 — Transportation Amendments  (2025GS/SB0195) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 195' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 195', 'Transportation Amendments',
      'Transportation Amendments', 'This bill amends provisions related to transportation items, transportation mobility plans, and adherence to proposed phases of certain transportation developments.', 'passed_senate',
      'https://le.utah.gov/~2025/bills/static/SB0195.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0195',
        'primeSponsor', 'Sen. Harper, Wayne A.', 'floorSponsor', 'Rep. Christofferson, Kay J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 70, true,
      'yea_supports', 'The bill adjusts a sales and use tax earmark to increase transportation funding, extends the deadline for taxes allocated to public transit innovation grants, requires that property the Department of Transportation acquires for a public transit purpose stay in department ownership, requires cities and metropolitan planning organizations to report on connectivity impediments, and requires follow-up on station area plans. Several provisions specifically protect or fund transit.', 'https://le.utah.gov/~2025/bills/static/SB0195.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 1144 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 1144,
      '2025-03-04T21:12:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":14,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=1144&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'auxier_h4', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'lisa_shepherd', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'fitisemanu_h30', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'verona_mauga', 'nay'),
    (rc_id, 'grant_miller', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'hoang_nguyen', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'lisonbee_h14', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 820 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 820,
      '2025-02-20T14:39:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":6,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=820&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'kgrover', 'not_voting'),
    (rc_id, 'dhinkins', 'not_voting'),
    (rc_id, 'ssandall', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 203 — Cannabis Amendments  (2025GS/HB0203) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 203' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 203', 'Cannabis Amendments',
      'Cannabis Amendments', 'This bill amends provisions related to medical cannabis.', 'failed',
      'https://le.utah.gov/~2025/bills/static/HB0203.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0203',
        'primeSponsor', 'Rep. Dailey-Provost, Jennifer', 'floorSponsor', 'Sen. Vickers, Evan J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'cannabis_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'cannabis_reform', 70, true,
      'yea_supports', 'The bill allows additional medical cannabis pharmacies, creates a licence class for independent pharmacies with ownership restrictions, lets a processing facility publish product information on a website, and adjusts fees. Widening the number and kinds of licensed outlets is expansion of legal access, which is this key''s direction; the processing licence cap is why the weight is not higher.', 'https://le.utah.gov/~2025/bills/static/HB0203.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2025
     AND roll_number = 247 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2025, 247,
      '2025-02-07T15:36:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":15,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=247&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 26 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'fitisemanu_h30', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'koford_h10', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'verona_mauga', 'yea'),
    (rc_id, 'grant_miller', 'yea'),
    (rc_id, 'tracy_miller', 'yea'),
    (rc_id, 'logan_monson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'hoang_nguyen', 'yea'),
    (rc_id, 'clinton_okerlund', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'nicholeen_p_peck', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'calvin_roberts', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'jake_sawyer', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'shelley_h66', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'auxier_h4', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'eliason_h45', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'lisa_shepherd', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 97 — Emergency Shelter Amendments  (2025GS/SB0097) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 97' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 97', 'Emergency Shelter Amendments',
      'Emergency Shelter Amendments', 'This bill amends provisions related to an emergency operations plan.', 'failed',
      'https://le.utah.gov/~2025/bills/static/SB0097.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'SB0097',
        'primeSponsor', 'Sen. Plumb, Jen', 'floorSponsor', ''))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'disaster_resilience') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'disaster_resilience', 50, true,
      'yea_supports', 'The bill requires a county, city or town emergency operations plan to designate at least one shelter able to accommodate a person''s animal. It is a single requirement added to emergency planning — modest in weight, unambiguous in direction, and a known reason people refuse evacuation.', 'https://le.utah.gov/~2025/bills/static/SB0097.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2025
     AND roll_number = 152 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2025, 152,
      '2025-02-03T11:55:00-07:00'::timestamptz, 'On passage, second reading', 'passage', 'passed',
      '{"yea":15,"nay":12,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=152&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 1 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'sadams', 'nay'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mckell_s25', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'ssandall', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'cwilson', 'nay'),
    (rc_id, 'kgrover', 'not_voting'),
    (rc_id, 'mccay_s11', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint
