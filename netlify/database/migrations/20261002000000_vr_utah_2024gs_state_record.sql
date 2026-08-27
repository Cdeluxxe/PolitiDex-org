-- ─────────────────────────────────────────────────────────────────────────────
-- vr_* — the Utah state legislature's 2024 floor record
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 20260929000000_vr_utah_2025gs_state_record.sql put one session of
-- Utah's floor record into the formal lane, and one session is a snapshot: a member
-- who arrived in 2025 and a member who has served since 2019 came out looking equally
-- thin, because the window was the same width for both. This migration adds the 2024
-- General Session — 28 bills, 39 floor roll calls (26 House, 13 Senate),
-- 1,885 member votes across 86 rostered legislators, and 33 issue mappings, each with
-- the rationale that names the provision it read.
--
-- WHAT IS THE SAME, ON PURPOSE. Every rule the 2025 migration was built on applies
-- here unchanged, and none of them was relaxed to make this session look fuller:
--
--   • chamber is 'utah house' / 'utah senate' and congress is NULL. A Utah floor vote
--     cannot render under a glossary card about 435 members.
--   • ONE recorded final-passage vote per (bill, chamber) — the latest. A Utah bill
--     can produce four recorded votes in one chamber; writing all four would let one
--     instrument read as four items of depth.
--   • No near-unanimous roll calls. The losing side must be at least 10% of votes
--     cast. 15 roll calls on bills that are otherwise in this file were refused for
--     that reason, including H.B. 68 in the Senate (23-0) and S.B. 194 in the Senate
--     (26-0) — the other chamber of each is here, the lopsided half is not.
--   • No guessed identities. db/vr-utah-member-map-2024GS.json is a hand-reviewed
--     file, and this session needed a check the 2025 one did not: a 2024 member who
--     has since left prints no district on the vote page, so a namesake now serving
--     would be indistinguishable. Every accepted name was therefore confirmed against
--     the legislature's own roster for 2024 (roster.asp?year=2024) — same chamber,
--     agreeing full name. That is what keeps a departed member's votes off their
--     successor's page.
--   • No invented issue keys. 25 keys are used and all of them already existed.
--     12 bills with contested recorded votes were read and left out with reasons in
--     db/vr-utah-bills-2024GS.json's _refused — including H.B. 348 (Precious Metals,
--     25.7% minority) and H.B. 249 (Legal Personhood, 24.0%), which are exactly the
--     "close vote with no key" case: a contested margin is not a reason to invent one.
--
-- WHAT IS NEW HERE.
--
--   1. THE CANDIDATE LIST IS NO LONGER A MEMORY. Pre-2025 sessions publish no vote
--      ids in their bill JSON, so wave 1's path did not exist for 2024. The ingest
--      grew two things: it reads the recorded-vote links out of the bill's own static
--      action table, and it has a --survey mode that walks the legislature's
--      passed-bills index and reports every contested final-passage vote in a session
--      before a curator picks anything. For 2024: 552 bills indexed, 125 admissible
--      contested roll calls across 103 bills. 40 of those 103 were read; 28 are here.
--      The other 63 are a disclosed coverage gap, not a verdict.
--
--   2. THE ARCHIVE ACTION CODES ARE THE LEGISLATURE'S OWN PAIRING, not a guess. The
--      2024 action table prints text ("House/ passed 3rd reading") where 2025 prints
--      a code (HPASS3). The mapping between them was harvested from sessions that
--      publish both fields. Recorded votes whose text matches no admitted code are
--      REPORTED as unclassified by --collect and --survey rather than dropped in
--      silence: 264 of them in 2024, nearly all "passed 2nd & 3rd readings/
--      suspension", which wave 1 excluded and this wave still excludes.
--
-- WHAT IS NOT WRITTEN. 18 people cast recorded votes in these roll calls and are
-- not on the PolitiDex roster; 442 of their vote rows are therefore absent, counted
-- and listed by name below. Most left the legislature before the roster snapshot was
-- taken. Fifteen are plain gaps, two are refusals rather than gaps, and one is a
-- member who has since moved to Congress and whose state votes are therefore left
-- out of a wave that does not touch federal records. The map says which is which and
-- why. None of them is resolved to a successor.
--
-- SOURCES. Every row carries its own URL.
--   bill               https://le.utah.gov/~2024/bills/static/<BILL>.html
--   bill JSON          https://le.utah.gov/data/2024GS/<BILL>.json
--   passed-bills index https://le.utah.gov/asp/passedbills/passedbills.asp?Session=2024GS
--   floor roll call    https://le.utah.gov/DynaBill/svotes.jsp
--                        ?sessionid=2024GS&voteid=<ID>&house=<H|S>
--
-- REPRODUCING IT. scripts/vr-utah-ingest.mjs --survey --session 2024GS (network) to
-- see what the session has; --collect --session 2024GS (network) to fetch the vote
-- pages and draft the member map; --seed then --sql. The seed is committed at
-- db/vr-utah-vote-seed-2024GS.json, the selection and mappings at
-- db/vr-utah-bills-2024GS.json, the reviewed name table at
-- db/vr-utah-member-map-2024GS.json. The tool refuses to write into this directory —
-- see db/vr-ingest-runbook.md § Utah.
--
-- IDEMPOTENT. Every measure, mapping and roll call is sentinelled; member votes are
-- ON CONFLICT DO NOTHING. No DDL: the two partial unique indexes this file depends on
-- were created by the 2025 session's migration and are relied on, not restated.
-- ─────────────────────────────────────────────────────────────────────────────

-- NOT WRITTEN — 16 member(s) of the utah house who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Birkeland, K.; Briscoe, J.; Cobb, J.; Garner, B.; Jimenez, T.;
--   Johnson, D.N.; Judkins, M.; King, Brian S.; Lesser, R.; Lund, S.;
--   Lyman, P.; Pulsipher, S.; Rohner, J.; Spendlove, R.; Stenquist, J.;
--   Wheatley, M.
-- 2 of those (Judkins, M.; Lyman, P.) are REFUSALS rather than gaps:
-- resolving them would have rested on a guess about which human the printed
-- name is. See db/vr-utah-member-map-2024GS.json for each one.

-- NOT WRITTEN — 2 member(s) of the utah senate who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Buxton, D. G.; Kennedy, M.

-- No DDL. vr_rollcalls_state_unique and vr_measures_utah_unique were created
-- by the 2025 general session's migration and carried into the drizzle chain
-- by its snapshot; this session relies on them and restates neither.

-- ── H.B. 257 — Sex-based Designations for Privacy, Anti-bullying, and Women's Opportunities  (2024GS/HB0257) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 257' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 257', 'Sex-based Designations for Privacy, Anti-bullying, and Women''s Opportunities',
      'Sex-based Designations for Privacy, Anti-bullying, and Women''s Opportunities', 'This bill establishes a standard regarding distinctions on the basis of sex and applies the standard in certain facilities and opportunities where designations on the basis of sex address individual privacy, bullying, and women''s opportunities.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0257.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0257',
        'primeSponsor', 'Rep. Birkeland, Kera', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lgbtq_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lgbtq_rights', 85, true,
      'yea_opposes', 'The bill defines sex for the entire Utah Code, restricts sex-designated restroom, shower and locker room facilities in the public education system and in publicly owned or controlled buildings to the designated sex, and adds components to the crimes of voyeurism and criminal trespass for entering a covered facility. Transgender access to public facilities is the operative subject, and a yea is a vote to restrict it.', 'https://le.utah.gov/~2024/bills/static/HB0257.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 30, false,
      'yea_supports', 'The bill''s own general provisions name individual privacy as the interest being protected, and it requires government entities to adopt privacy compliance plans and to provide a single-occupant facility in new construction. Secondary because those duties are the bill''s mechanism, not its disputed subject.', 'https://le.utah.gov/~2024/bills/static/HB0257.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 49 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 49,
      '2024-01-19T12:58:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":52,"nay":17,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=49&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'gwynn_h6', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 118 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 118,
      '2024-01-25T12:44:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":8,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=118&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'daniel_thatcher', 'nay'),
    (rc_id, 'tweiler', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 261 — Equal Opportunity Initiatives  (2024GS/HB0261) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 261' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 261', 'Equal Opportunity Initiatives',
      'Equal Opportunity Initiatives', 'This bill prohibits an institution of higher education, the public education system, and a governmental employer from taking certain actions and engaging in discriminatory practices.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0261.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0261',
        'primeSponsor', 'Rep. Hall, Katy', 'floorSponsor', 'Sen. Grover, Keith'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'end_dei') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'end_dei', 90, true,
      'yea_supports', 'The bill prohibits institutions of higher education, the public education system and governmental employers from requiring diversity submissions or training that promotes differential treatment, from using protected characteristics in employment or admissions decisions, and from maintaining an office that engages in those practices. Dismantling diversity, equity and inclusion offices is the whole bill, so a yea is a vote for it.', 'https://le.utah.gov/~2024/bills/static/HB0261.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 121 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 121,
      '2024-01-26T11:54:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":60,"nay":14,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=121&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 114 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 114,
      '2024-01-25T12:08:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":23,"nay":6,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=114&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 57 — Utah Constitutional Sovereignty Act  (2024GS/SB0057) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 57' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 57', 'Utah Constitutional Sovereignty Act',
      'Utah Constitutional Sovereignty Act', 'This bill enacts the Utah Constitutional Sovereignty Act.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0057.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0057',
        'primeSponsor', 'Sen. Sandall, Scott D.', 'floorSponsor', 'Rep. Ivory, Ken'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 90, true,
      'yea_supports', 'The bill enacts the Utah Constitutional Sovereignty Act, which establishes a framework for the Legislature to prohibit state officers from enforcing a federal directive it determines violates state sovereignty. Asserting state authority against federal directives is the entire operative content.', 'https://le.utah.gov/~2024/bills/static/SB0057.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 123 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 123,
      '2024-01-26T12:17:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":15,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=123&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jefferson_burton', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nelson_abbott', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 45 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 45,
      '2024-01-19T11:47:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":22,"nay":7,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=45&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
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
    (rc_id, 'daniel_thatcher', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 529 — Utah Fits All Scholarship Program Amendments  (2024GS/HB0529) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 529' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 529', 'Utah Fits All Scholarship Program Amendments',
      'Utah Fits All Scholarship Program Amendments', 'This bill amends provisions regarding the Utah Fits All Scholarship Program.', 'failed',
      'https://le.utah.gov/~2024/bills/static/HB0529.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0529',
        'primeSponsor', 'Rep. Pierucci, Candice B.', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 75, true,
      'yea_supports', 'The bill amends the Utah Fits All Scholarship Program: it extends eligibility to children of military service members and to adopting foster parents, opens local education agency participation to home-based scholarship students, and moves administration of appeals and cost-effectiveness review. Every operative provision widens or entrenches the state''s education voucher programme.', 'https://le.utah.gov/~2024/bills/static/HB0529.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1289 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1289,
      '2024-02-29T10:01:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":53,"nay":16,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1289&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'jason_b_kyle', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 44 — Alternative Education Scholarship Combination  (2024GS/SB0044) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 44' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 44', 'Alternative Education Scholarship Combination',
      'Alternative Education Scholarship Combination', 'This bill combines the Carson Smith Scholarship and Special Needs Opportunity Scholarship Programs.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0044.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0044',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Pierucci, Candice B.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 65, true,
      'yea_supports', 'The bill merges the Carson Smith and Special Needs Opportunity scholarship programmes, extends eligibility to home-school and preschool-aged students, adds qualifying-provider expenses to allowable uses, and grants regulatory autonomy to qualifying schools and providers. It expands publicly funded private-education scholarships and reduces oversight of the providers.', 'https://le.utah.gov/~2024/bills/static/SB0044.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1477 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1477,
      '2024-02-26T10:29:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":23,"nay":6,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1477&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 119 — School Employee Firearm Possession Amendments  (2024GS/HB0119) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 119' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 119', 'School Employee Firearm Possession Amendments',
      'School Employee Firearm Possession Amendments', 'This bill creates a program regarding the possession of a firearm by a school employee.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0119.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0119',
        'primeSponsor', 'Rep. Jimenez, Tim', 'floorSponsor', 'Sen. Hinkins, David P.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 75, true,
      'yea_supports', 'The bill creates the Educator-Protector Program, which incentivises school teachers to secure or carry a firearm on school grounds. It expands where and by whom firearms may be carried, and a yea is a vote for that expansion.', 'https://le.utah.gov/~2024/bills/static/HB0119.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1273 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1273,
      '2024-02-28T21:28:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":53,"nay":13,"notVoting":9}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1273&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 194 — Social Media Regulation Amendments  (2024GS/SB0194) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 194' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 194', 'Social Media Regulation Amendments',
      'Social Media Regulation Amendments', 'This bill enacts provisions related to age assurance and protecting minors in the Utah Minor Protection in Social Media Act (Act).', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0194.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0194',
        'primeSponsor', 'Sen. McKell, Michael K.', 'floorSponsor', 'Rep. Teuscher, Jordan D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 60, true,
      'yea_supports', 'The bill requires social media companies to verify a new account holder''s age through an approved system, to enable maximum default privacy settings on Utah minor accounts, to provide supervisory and verifiable parental consent tools, and to protect the confidentiality of minors'' data, with Division of Consumer Protection enforcement behind it. The disputed question was how far the state may go in mandating data practices on behalf of minors.', 'https://le.utah.gov/~2024/bills/static/SB0194.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1186 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1186,
      '2024-02-28T16:45:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":61,"nay":11,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1186&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'mark_strong', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 374 — State Energy Policy Amendments  (2024GS/HB0374) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 374' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 374', 'State Energy Policy Amendments',
      'State Energy Policy Amendments', 'This bill modifies the state energy policy.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0374.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0374',
        'primeSponsor', 'Rep. Jack, Colin W.', 'floorSponsor', 'Sen. Vickers, Evan J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 65, true,
      'yea_supports', 'The bill rewrites the state energy policy to encourage the use of dispatchable energy resources, to focus the policy on human well-being and quality of life, and to require the Office of Energy Development to report on the state energy plan''s compliance with it. ''Dispatchable'' is the bill''s own operative word and it points at thermal generation, so a yea is a vote to steer state policy toward conventional production.', 'https://le.utah.gov/~2024/bills/static/HB0374.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 934 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 934,
      '2024-02-23T10:45:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":60,"nay":7,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=934&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'paul_a_cutler', 'not_voting'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1317 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1317,
      '2024-02-22T11:24:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":5,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1317&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'lescamilla', 'not_voting'),
    (rc_id, 'dipson', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 215 — Home Solar Energy Amendments  (2024GS/HB0215) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 215' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 215', 'Home Solar Energy Amendments',
      'Home Solar Energy Amendments', 'This bill modifies provisions related to the Residential Solar Energy Disclosure Act.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0215.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0215',
        'primeSponsor', 'Rep. Jack, Colin W.', 'floorSponsor', 'Sen. Sandall, Scott D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_corp_account') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_corp_account', 50, true,
      'yea_supports', 'The bill amends the Residential Solar Energy Disclosure Act to require a solar retailer to hand the customer a signed copy of the agreement, forbids beginning installation until four business days later, gives the customer a four-day cancellation window, and adds Division of Consumer Protection enforcement and court action. The subject is what a seller owes a household, not whether solar is built.', 'https://le.utah.gov/~2024/bills/static/HB0215.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1368 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1368,
      '2024-02-29T18:42:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":59,"nay":8,"notVoting":8}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1368&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'not_voting'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1934 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1934,
      '2024-02-29T14:19:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":5,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1934&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'cbramble', 'not_voting'),
    (rc_id, 'lescamilla', 'not_voting'),
    (rc_id, 'harper_s16', 'not_voting'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 224 — Energy Independence Amendments  (2024GS/SB0224) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 224' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 224', 'Energy Independence Amendments',
      'Energy Independence Amendments', 'This bill modifies provisions related to planning and cost recovery for certain energy resource decisions and allows a large-scale electric utility to establish a Utah fire fund.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0224.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0224',
        'primeSponsor', 'Sen. Sandall, Scott D.', 'floorSponsor', 'Rep. Albrecht, Carl R.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 70, true,
      'yea_supports', 'The bill changes the factors the Public Service Commission must weigh in evaluating energy resource decisions, sets terms for a utility''s recovery of costs for proven dispatchable generation located within the state, and encourages the commission to evaluate buying excess dispatchable capacity. It puts a thumb on the scale for in-state conventional generation.', 'https://le.utah.gov/~2024/bills/static/SB0224.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1434 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1434,
      '2024-03-01T12:28:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":54,"nay":19,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1434&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 2154 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 2154,
      '2024-03-01T17:30:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":21,"nay":6,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=2154&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
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
    (rc_id, 'lincoln_fillmore', 'not_voting'),
    (rc_id, 'amillner', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 161 — Energy Security Amendments  (2024GS/SB0161) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 161' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 161', 'Energy Security Amendments',
      'Energy Security Amendments', 'This bill modifies provisions related to the regulation of energy.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0161.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0161',
        'primeSponsor', 'Sen. Owens, Derrin R.', 'floorSponsor', 'Rep. Albrecht, Carl R.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 75, true,
      'yea_supports', 'The bill lets the state buy an electrical generation facility that is slated for decommissioning, creates a Decommissioned Asset Disposition Authority to run it, and creates an alternative air permit track for project entities. It exists to keep generating plants operating past the point their owners would retire them.', 'https://le.utah.gov/~2024/bills/static/SB0161.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1177 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1177,
      '2024-02-28T16:15:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":47,"nay":25,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1177&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'mballard', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'paul_a_cutler', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'defay_h15', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'matt_macpherson', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'tlee', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1839 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1839,
      '2024-02-28T19:50:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":18,"nay":10,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1839&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'daniel_thatcher', 'nay'),
    (rc_id, 'evickers', 'nay'),
    (rc_id, 'tweiler', 'nay'),
    (rc_id, 'lescamilla', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 11 — Water Efficient Landscaping Requirements  (2024GS/HB0011) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 11' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 11', 'Water Efficient Landscaping Requirements',
      'Water Efficient Landscaping Requirements', 'This bill addresses use of overhead spray irrigation.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0011.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0011',
        'primeSponsor', 'Rep. Owens, Doug', 'floorSponsor', 'Sen. Winterton, Ronald M.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 60, true,
      'yea_supports', 'The bill restricts the use of overhead spray irrigation by certain governmental entities. It is a single-subject conservation mandate on public landscaping, so a yea is a vote for state action on water use.', 'https://le.utah.gov/~2024/bills/static/HB0011.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 760 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 760,
      '2024-02-21T10:50:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":59,"nay":12,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=760&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 208 — Housing and Transit Reinvestment Zone Amendments  (2024GS/SB0208) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 208' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 208', 'Housing and Transit Reinvestment Zone Amendments',
      'Housing and Transit Reinvestment Zone Amendments', 'This bill amends provisions related to housing and transit reinvestment zones.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0208.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0208',
        'primeSponsor', 'Sen. Harper, Wayne A.', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 45, true,
      'yea_supports', 'The bill requires that 12% of proposed dwelling units in a housing and transit reinvestment zone be reserved for specified income levels, that the affordability requirement be met in each phase of development, and that a zone be at least ten acres, while clarifying tax-increment notice and capture. It tightens the affordability terms on which the zones get public financing.', 'https://le.utah.gov/~2024/bills/static/SB0208.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 25, false,
      'yea_supports', 'A housing and transit reinvestment zone is defined around transit infrastructure, and the bill amends how sales and use tax increment inside it is captured. Secondary because the amendments themselves are about housing terms rather than transit service.', 'https://le.utah.gov/~2024/bills/static/SB0208.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 2022 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 2022,
      '2024-02-29T18:29:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":23,"nay":3,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=2022&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
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
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 268 — First Home Investment Zone Act  (2024GS/SB0268) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 268' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 268', 'First Home Investment Zone Act',
      'First Home Investment Zone Act', 'This bill enacts the First Home Investment Zone Act.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0268.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0268',
        'primeSponsor', 'Sen. Harper, Wayne A.', 'floorSponsor', 'Rep. Musselman, Calvin R.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_first_time') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_first_time', 65, true,
      'yea_supports', 'The bill enacts the First Home Investment Zone Act, which lets a municipality create a zone that captures tax increment to finance affordable owner-occupied housing and sets requirements for density, affordability and development size. Increasing opportunities for home ownership is named in the bill''s own list of objectives.', 'https://le.utah.gov/~2024/bills/static/SB0268.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_build') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_build', 40, false,
      'yea_supports', 'The density and mixed-use requirements and the tax-increment financing are supply-side: they pay for units to be built. Secondary because the Act''s stated target is first purchase specifically.', 'https://le.utah.gov/~2024/bills/static/SB0268.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1166 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1166,
      '2024-02-28T14:58:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":55,"nay":18,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1166&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1844 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1844,
      '2024-02-28T19:55:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":20,"nay":7,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1844&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'heidi_balderree', 'nay'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'kcullimore', 'not_voting'),
    (rc_id, 'lescamilla', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 153 — Child Care Revisions  (2024GS/HB0153) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 153' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 153', 'Child Care Revisions',
      'Child Care Revisions', 'This bill modifies provisions related to caring for children.', 'failed',
      'https://le.utah.gov/~2024/bills/static/HB0153.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0153',
        'primeSponsor', 'Rep. Pulsipher, Susan', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'child_care') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'child_care', 55, true,
      'yea_supports', 'The bill makes the Department of Health and Human Services certificate optional for residential child care, caps the number of under-threes an unlicensed home provider may take, requires criminal history checks of providers operating without a licence or certificate, and raises the age of a dependent for whom a child tax credit may be claimed. Its purpose is to enlarge the supply of home-based child care, and a yea is a vote for that trade of licensing for supply.', 'https://le.utah.gov/~2024/bills/static/HB0153.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1147 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1147,
      '2024-02-28T09:58:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":50,"nay":21,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1147&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'nelson_abbott', 'not_voting'),
    (rc_id, 'bolinder_h68', 'not_voting'),
    (rc_id, 'jefferson_burton', 'not_voting'),
    (rc_id, 'colin_w_jack', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 461 — Child Care Grant Amendments  (2024GS/HB0461) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 461' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 461', 'Child Care Grant Amendments',
      'Child Care Grant Amendments', 'This bill modifies provisions related to child care subsidy.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0461.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0461',
        'primeSponsor', 'Rep. Matthews, Ashlee', 'floorSponsor', 'Sen. Escamilla, Luz'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'child_care') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'child_care', 50, true,
      'yea_supports', 'The bill authorises the Office of Child Care to award a full child care subsidy or grant to a child with at least one parent working full-time at a child care provider. It is a single-subject subsidy aimed at staffing the sector.', 'https://le.utah.gov/~2024/bills/static/HB0461.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 968 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 968,
      '2024-02-23T15:42:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":15,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=968&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 173 — Market Informed Compensation for Teachers  (2024GS/SB0173) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 173' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 173', 'Market Informed Compensation for Teachers',
      'Market Informed Compensation for Teachers', 'This bill amends and creates programs to enhance teacher salary supplement opportunities.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0173.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0173',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Peterson, Karen M.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 60, true,
      'yea_supports', 'The bill repeals and reenacts the Teacher Salary Supplement Program as a supplement for highly needed educators, creates an Excellence in Education and Leadership Supplement with eligibility criteria assessed by each local education agency and validated by the Center for the School of the Future, and directs the State Board of Education to disburse the funds. It is about how the state pays public school teachers.', 'https://le.utah.gov/~2024/bills/static/SB0173.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1168 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1168,
      '2024-02-28T15:17:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":40,"nay":32,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1168&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'matt_macpherson', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'christine_watkins', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'ryan_d_wilcox', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1575 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 1575,
      '2024-02-26T18:47:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":6,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1575&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
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
    (rc_id, 'cbramble', 'not_voting'),
    (rc_id, 'amillner', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 68 — Drug Sentencing Modifications  (2024GS/HB0068) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 68' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 68', 'Drug Sentencing Modifications',
      'Drug Sentencing Modifications', 'This bill addresses the sentencing for an individual convicted of distributing illegal drugs in certain circumstances.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0068.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0068',
        'primeSponsor', 'Rep. Stoddard, Andrew', 'floorSponsor', 'Sen. Grover, Keith'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 75, true,
      'yea_supports', 'The bill requires a court, with limited exceptions, to sentence a person convicted of distributing drugs to an indeterminate prison term where the person had a dangerous weapon readily accessible or distributed or possessed a firearm with intent to distribute. It removes judicial discretion in favour of prison, which is what this key names.', 'https://le.utah.gov/~2024/bills/static/HB0068.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1193 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1193,
      '2024-02-28T16:59:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":39,"nay":31,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1193&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'matt_macpherson', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'mschultz', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'whyte_h63', 'nay'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'aromero', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 273 — Sentencing Modifications for Certain DUI Offenses  (2024GS/HB0273) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 273' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 273', 'Sentencing Modifications for Certain DUI Offenses',
      'Sentencing Modifications for Certain DUI Offenses', 'This bill modifies provisions related to negligently operating a vehicle resulting in death and who may become an ignition interlock restricted driver.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0273.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0273',
        'primeSponsor', 'Rep. Stoddard, Andrew', 'floorSponsor', 'Sen. Weiler, Todd D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 55, true,
      'yea_supports', 'The bill renames the offence of negligently operating a vehicle resulting in death, creates a sentencing guideline for automobile homicide, and modifies impound fees and ignition-interlock election. The operative change is a sentencing guideline for a homicide offence.', 'https://le.utah.gov/~2024/bills/static/HB0273.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1293 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1293,
      '2024-02-29T10:07:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":47,"nay":24,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1293&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'aromero', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 60 — Drug Paraphernalia Amendments  (2024GS/SB0060) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 60' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 60', 'Drug Paraphernalia Amendments',
      'Drug Paraphernalia Amendments', 'This bill concerns possession of certain types of drug paraphernalia.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0060.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0060',
        'primeSponsor', 'Sen. Plumb, Jen', 'floorSponsor', 'Rep. Eliason, Steve'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'justice_reform', 55, true,
      'yea_supports', 'The bill provides for the dismissal of a charge of possession of certain drug paraphernalia under specified conditions and sets the burden of proof for that dismissal. It narrows the reach of a possession offence, which is the reform direction of this key.', 'https://le.utah.gov/~2024/bills/static/SB0060.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1338 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1338,
      '2024-02-29T15:26:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":56,"nay":16,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1338&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'jefferson_burton', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'tlee', 'not_voting'),
    (rc_id, 'cory_maloy_h52', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 471 — Public Lands Possession Amendments  (2024GS/HB0471) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 471' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 471', 'Public Lands Possession Amendments',
      'Public Lands Possession Amendments', 'This bill asserts ownership and exclusive jurisdiction of roads included on a county travel plan and requires due process before the federal government may close a road.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0471.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0471',
        'primeSponsor', 'Rep. Lyman, Phil', 'floorSponsor', 'Sen. Bramble, Curtis S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lands_local') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lands_local', 70, true,
      'yea_supports', 'The bill asserts state and county ownership and jurisdiction over roads on a county''s class B and class D road map or travel plan unless closed through proper adjudicative proceedings, lets the state or a county disregard an attempted closure without due process, and places the burden of proof on the federal government. It is a claim of local control over land access.', 'https://le.utah.gov/~2024/bills/static/HB0471.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 45, false,
      'yea_supports', 'The burden-shifting clause is directed at the federal government by name. Secondary because the bill''s subject is county roads rather than federal authority generally.', 'https://le.utah.gov/~2024/bills/static/HB0471.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1074 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1074,
      '2024-02-27T10:41:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":59,"nay":11,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1074&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'andrew_stoddard', 'not_voting'),
    (rc_id, 'mark_strong', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 69 — Income Tax Amendments  (2024GS/SB0069) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 69' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 69', 'Income Tax Amendments',
      'Income Tax Amendments', 'This bill modifies income tax provisions.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0069.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0069',
        'primeSponsor', 'Sen. Wilson, Chris H.', 'floorSponsor', 'Rep. Christofferson, Kay J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lower_taxes') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lower_taxes', 80, true,
      'yea_supports', 'The bill amends the corporate franchise and income tax rates and the individual income tax rate. It is a rate bill and nothing else; the 2024 session''s rate change was a cut.', 'https://le.utah.gov/~2024/bills/static/SB0069.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1170 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1170,
      '2024-02-28T15:33:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":63,"nay":11,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1170&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 246 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 246,
      '2024-01-31T14:40:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":23,"nay":6,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=246&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'heidi_balderree', 'yea'),
    (rc_id, 'cbramble', 'yea'),
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
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 165 — Federal Law Enforcement Amendments  (2024GS/HB0165) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 165' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 165', 'Federal Law Enforcement Amendments',
      'Federal Law Enforcement Amendments', 'This bill concerns the release of an alien within the state by a federal officer.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0165.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0165',
        'primeSponsor', 'Rep. Lee, Trevor', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'border_security') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'border_security', 60, true,
      'yea_supports', 'The bill requires a federal officer to follow specified procedures before releasing an alien within the state. It is a single-subject immigration-enforcement bill directed at federal release practices.', 'https://le.utah.gov/~2024/bills/static/HB0165.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1000 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1000,
      '2024-02-26T11:59:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":63,"nay":11,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1000&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'kohler_h59', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 269 — Public School History Curricula Amendments  (2024GS/HB0269) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 269', 'Public School History Curricula Amendments',
      'Public School History Curricula Amendments', 'This bill adds the "Ten Commandments" and the Magna Carta to a list of historical documents and principles that school curricula and activities may include for a thorough study.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0269.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0269',
        'primeSponsor', 'Rep. Petersen, Michael J.', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 45, true,
      'yea_supports', 'The bill adds the Ten Commandments and the Magna Carta to the list of historical documents and principles that school curricula and activities may include for a thorough study. The contested addition is a religious text, and a yea is a vote to name it in statute.', 'https://le.utah.gov/~2024/bills/static/HB0269.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 20, false,
      'yea_supports', 'The list the bill amends governs what public school curricula may include. Secondary because the bill grants no parental right and changes no consent requirement.', 'https://le.utah.gov/~2024/bills/static/HB0269.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 859 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 859,
      '2024-02-22T18:32:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":49,"nay":16,"notVoting":10}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=859&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'christine_watkins', 'nay'),
    (rc_id, 'chew_h68', 'not_voting'),
    (rc_id, 'defay_h15', 'not_voting'),
    (rc_id, 'eliason_h45', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'anthony_loubet', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 182 — Student Survey Amendments  (2024GS/HB0182) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 182' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 182', 'Student Survey Amendments',
      'Student Survey Amendments', 'This bill amends student survey requirements.', 'failed',
      'https://le.utah.gov/~2024/bills/static/HB0182.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0182',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. Grover, Keith'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 65, true,
      'yea_supports', 'The bill removes references to the statewide student health and risk prevention survey, requires annual written parental consent for certain student surveys and new consent for a transferring student, requires that parents be given the list of recipients of collected data, and forbids rewards or consequences tied to participation. Parental control over what a school asks a child is the whole subject.', 'https://le.utah.gov/~2024/bills/static/HB0182.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 638 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 638,
      '2024-02-16T10:51:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":57,"nay":11,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=638&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'brammer_s21', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'andrew_stoddard', 'not_voting'),
    (rc_id, 'ryan_d_wilcox', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 158 — Criminal Defamation Amendments  (2024GS/HB0158) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 158' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 158', 'Criminal Defamation Amendments',
      'Criminal Defamation Amendments', 'This bill repeals the offense of criminal defamation.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0158.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0158',
        'primeSponsor', 'Rep. Shipp, Rex P.', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'free_speech') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'free_speech', 60, true,
      'yea_supports', 'The bill repeals the offence of criminal defamation. Removing a speech crime from the code is a single-subject speech question.', 'https://le.utah.gov/~2024/bills/static/HB0158.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 314 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 314,
      '2024-02-05T14:33:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":61,"nay":11,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=314&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 405 — Public Health Amendments  (2024GS/HB0405) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 405' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 405', 'Public Health Amendments',
      'Public Health Amendments', 'This bill amends provisions related to public health.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/HB0405.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'HB0405',
        'primeSponsor', 'Rep. Birkeland, Kera', 'floorSponsor', 'Sen. Harper, Wayne A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'medical_freedom') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'medical_freedom', 65, true,
      'yea_supports', 'The bill narrows when the Department of Health and Human Services and a local health department may invoke an order of restriction, and repeals the exception that let institutions of higher education impose vaccination and face covering requirements on medical students. Both provisions cut public health authority over individuals.', 'https://le.utah.gov/~2024/bills/static/HB0405.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1377 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1377,
      '2024-02-29T18:51:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":58,"nay":11,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1377&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'brammer_s21', 'not_voting'),
    (rc_id, 'cory_maloy_h52', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 272 — Capital City Revitalization Zone  (2024GS/SB0272) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 272' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 272', 'Capital City Revitalization Zone',
      'Capital City Revitalization Zone', 'This bill enacts provisions to enable a local government to create a revitalization zone.', 'enacted',
      'https://le.utah.gov/~2024/bills/static/SB0272.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2024GS', 'utahBill', 'SB0272',
        'primeSponsor', 'Sen. McCay, Daniel', 'floorSponsor', 'Rep. Hawkins, Jon'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_growth') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_growth', 40, true,
      'yea_supports', 'The bill establishes procedures for a qualifying local government to create a capital city revitalization zone, authorises a sales and use tax within its boundaries for use in the project area, and provides for a project participation agreement letting a private participant share in the funds collected. It is a publicly financed development district, and the disagreement was over the subsidy.', 'https://le.utah.gov/~2024/bills/static/SB0272.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2024
     AND roll_number = 1362 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2024, 1362,
      '2024-02-29T18:35:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":50,"nay":20,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1362&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'defay_h15', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'matt_macpherson', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'anthony_loubet', 'not_voting'),
    (rc_id, 'ashlee_matthews', 'not_voting'),
    (rc_id, 'karen_m_peterson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2024
     AND roll_number = 2040 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2024, 2040,
      '2024-03-01T10:18:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":22,"nay":4,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=2040&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 2 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
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
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'daniel_thatcher', 'nay'),
    (rc_id, 'harper_s16', 'not_voting'),
    (rc_id, 'dhinkins', 'not_voting'),
    (rc_id, 'amillner', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── Verification ─────────────────────────────────────────────────────────────
-- A silently-skipped sentinel must not read as success, so the counts are asserted
-- here. Lower bounds, not equalities, where a later session could legitimately add
-- rows to the same table; exact where this file is the only writer of the fact.
DO $$
DECLARE n_measures integer; n_rolls integer; n_votes integer; n_issues integer; n_orphan integer;
BEGIN
  SELECT count(*) INTO n_measures FROM vr_measures
   WHERE external_ids->>'utahSession' = '2024GS';
  SELECT count(*) INTO n_rolls FROM vr_rollcalls r
   WHERE r.congress IS NULL AND r.session = 2024
     AND r.chamber IN ('utah house', 'utah senate');
  SELECT count(*) INTO n_votes FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.congress IS NULL AND r.session = 2024
     AND r.chamber IN ('utah house', 'utah senate');
  SELECT count(*) INTO n_issues FROM vr_measure_issues i
    JOIN vr_measures m ON m.id = i.measure_id
   WHERE m.external_ids->>'utahSession' = '2024GS';
  SELECT count(*) INTO n_orphan FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.congress IS NULL AND r.session = 2024
     AND r.chamber IN ('utah house', 'utah senate')
     AND v.politician_id NOT IN ('amillner', 'andrew_stoddard', 'anthony_loubet', 'aromero', 'ashlee_matthews', 'blouin_s13', 'bolinder_h68', 'brammer_s21', 'candice_pierucci', 'carl_albrecht', 'carol_spackman_moss', 'cbramble', 'cheryl_acton', 'chew_h68', 'christine_watkins', 'cmusselman', 'colin_w_jack', 'cory_maloy_h52', 'cwilson', 'daniel_thatcher', 'defay_h15', 'dhinkins', 'dipson', 'doug_owens', 'doug_welton', 'dowens_st', 'eliason_h45', 'evickers', 'gay_lynn_bennion', 'gricius_h50', 'gwynn_h6', 'hall_h11', 'harper_s16', 'heidi_balderree', 'hollins_h24', 'ivory_h39', 'james_dunnigan', 'jason_b_kyle', 'jefferson_burton', 'jefferson_moss', 'jennifer_dailey_provost', 'jennifer_plumb', 'john_johnson', 'jon_hawkins', 'joseph_elison', 'jstevenson', 'karen_m_peterson', 'kathleen_riebe', 'kay_christofferson', 'kcullimore', 'kgrover', 'kohler_h59', 'kstratton', 'kwan_s12', 'lescamilla', 'lincoln_fillmore', 'lisonbee_h14', 'mark_strong', 'matt_macpherson', 'mballard', 'mccay_s11', 'mckell_s25', 'mike_petersen', 'mschultz', 'nelson_abbott', 'nthurston', 'paul_a_cutler', 'r_neil_walter', 'rshipp', 'rward', 'rwinterton', 'ryan_d_wilcox', 'sadams', 'sahara_hayes', 'snider_h5', 'ssandall', 'stephanie_pitcher', 'stewart_e_barlow', 'teuscher_h44', 'thomas_peterson', 'tlee', 'tweiler', 'tyler_clancy', 'valpeterson_h56', 'walt_brooks', 'whyte_h63');
  RAISE NOTICE 'Utah 2024GS: % measures, % roll calls, % member votes, % issue mappings',
    n_measures, n_rolls, n_votes, n_issues;
  IF n_measures <> 28 THEN
    RAISE EXCEPTION 'Utah 2024GS: expected 28 measures, found %', n_measures;
  END IF;
  IF n_rolls <> 39 THEN
    RAISE EXCEPTION 'Utah 2024GS: expected 39 roll calls, found %', n_rolls;
  END IF;
  IF n_votes < 1885 THEN
    RAISE EXCEPTION 'Utah 2024GS: expected at least 1885 member votes, found % — the inserts did not land', n_votes;
  END IF;
  IF n_issues <> 33 THEN
    RAISE EXCEPTION 'Utah 2024GS: expected 33 issue mappings, found %', n_issues;
  END IF;
  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'Utah 2024GS: % member vote(s) name a politician_id outside the reviewed member map', n_orphan;
  END IF;
END $$;
