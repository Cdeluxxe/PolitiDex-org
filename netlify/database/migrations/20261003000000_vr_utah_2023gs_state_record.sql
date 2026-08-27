-- ─────────────────────────────────────────────────────────────────────────────
-- vr_* — the Utah state legislature's 2023 floor record
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. This is the third and oldest Utah session in the formal lane, after
-- 20260929000000 (2025) and 20261002000000 (2024). With one session the record was a
-- snapshot; with two it was a comparison; with three a member who has served since
-- before 2023 can show a pattern that survives a single year's agenda. It adds the
-- 2023 General Session — 40 bills, 49 floor roll calls (38 House, 11 Senate),
-- 2,490 member votes across 84 rostered legislators, and 49 issue mappings, each with
-- the rationale that names the provision it read.
--
-- WHAT IS THE SAME, ON PURPOSE. Every rule the earlier two migrations were built on
-- applies here unchanged, and none was relaxed to make an older session look fuller:
--
--   • chamber is 'utah house' / 'utah senate' and congress is NULL. A Utah floor vote
--     cannot render under a glossary card about 435 members.
--   • ONE recorded final-passage vote per (bill, chamber) — the latest. A Utah bill
--     can produce four recorded votes in one chamber; writing all four would let one
--     instrument read as four items of depth.
--   • No near-unanimous roll calls. The losing side must be at least 10% of votes
--     cast. 14 roll calls on bills that are otherwise in this file were refused for
--     that reason, including S.B. 133 in the Senate (24-0) and H.B. 165 in the Senate
--     (28-0) — the contested chamber of each is here, the lopsided half is not.
--   • No guessed identities. db/vr-utah-member-map-2023GS.json is hand-reviewed, and
--     it needed the check 2024 introduced even more than 2024 did: 2023 is the
--     furthest session from the roster snapshot, so more of its members have left and
--     print no district on the vote page. Every accepted name was confirmed against
--     the legislature's own roster for 2023 (roster.asp?year=2023) — same chamber,
--     agreeing full name. That is what keeps a departed member's votes off their
--     successor's page.
--   • No invented issue keys. 30 keys are used and all of them already existed.
--     21 bills with contested recorded votes were read and left out with reasons in
--     db/vr-utah-bills-2023GS.json's _refused — starting with S.B. 31 (State Flag,
--     46.7% minority share, the single most contested vote of the session), which is
--     exactly the "close vote with no key" case: a contested margin is not a reason to
--     invent one.
--
-- WHAT THIS SESSION MADE PLAIN. Two refusals are worth naming here because they are
-- the ones a reader would most expect to find written:
--
--   • S.B. 100 is titled "School Gender Identity Policies" and its surviving
--     provisions are about a parent's access to a child's education record. The title
--     fits one key and the text fits another, and a member who voted on it cannot be
--     said to have taken either position from the provisions alone.
--   • S.B. 97 adds an "economic boycott" certification beside a boycott-of-Israel
--     certification that an earlier legislature had already enacted. Reading the
--     enrolled text was what showed that — the highlighted provisions do not name
--     either target — and mapping it to israel_support would have credited this
--     session's vote with someone else's clause.
--
-- WHAT IS NOT WRITTEN. 20 people cast recorded votes in these roll calls and are
-- not on the PolitiDex roster; 677 of their vote rows are therefore absent, counted and
-- listed by name below. That is the largest drop of the three sessions, for the
-- obvious reason: the further back the session, the more of its members have left.
-- Seventeen are plain gaps, two are refusals rather than gaps, and one is a member who
-- has since moved to Congress; the map says which is which and why. None of them is
-- resolved to a successor.
--
-- SOURCES. Every row carries its own URL.
--   bill               https://le.utah.gov/~2023/bills/static/<BILL>.html
--   bill JSON          https://le.utah.gov/data/2023GS/<BILL>.json
--   passed-bills index https://le.utah.gov/asp/passedbills/passedbills.asp?Session=2023GS
--   floor roll call    https://le.utah.gov/DynaBill/svotes.jsp
--                        ?sessionid=2023GS&voteid=<ID>&house=<H|S>
--
-- REPRODUCING IT. scripts/vr-utah-ingest.mjs --survey --session 2023GS (network) to
-- see what the session has — 543 bills indexed, 113 admissible contested roll calls
-- across 91 bills, 232 recorded votes on action codes this ingest does not admit as
-- final passage, reported rather than dropped in silence; --collect --session 2023GS
-- (network) to fetch the vote pages and draft the member map; --seed then --sql. The
-- seed is committed at db/vr-utah-vote-seed-2023GS.json, the selection and mappings at
-- db/vr-utah-bills-2023GS.json, the reviewed name table at
-- db/vr-utah-member-map-2023GS.json. The tool refuses to write into this directory —
-- see db/vr-ingest-runbook.md § Utah.
--
-- IDEMPOTENT. Every measure, mapping and roll call is sentinelled; member votes are
-- ON CONFLICT DO NOTHING. No DDL: the two partial unique indexes this file depends on
-- were created by the 2025 session's migration and are relied on, not restated.
-- ─────────────────────────────────────────────────────────────────────────────

-- NOT WRITTEN — 17 member(s) of the utah house who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Birkeland, K.; Briscoe, J.; Cobb, J.; Garner, B.; Jimenez, T.;
--   Johnson, D.N.; Judkins, M.; King, Brian S.; Kotter, Q.; Lesser, R.;
--   Lund, S.; Lyman, P.; Pulsipher, S.; Rohner, J.; Spendlove, R.;
--   Stenquist, J.; Wheatley, M.
-- 2 of those (Judkins, M.; Lyman, P.) are REFUSALS rather than gaps:
-- resolving them would have rested on a guess about which human the printed
-- name is. See db/vr-utah-member-map-2023GS.json for each one.

-- NOT WRITTEN — 3 member(s) of the utah senate who cast recorded votes in
-- these roll calls and are not on the PolitiDex roster:
--   Anderegg, J.; Buxton, D. G.; Kennedy, M.

-- No DDL. vr_rollcalls_state_unique and vr_measures_utah_unique were created
-- by the 2025 general session's migration and carried into the drizzle chain
-- by its snapshot; this session relies on them and restates neither.

-- ── H.B. 215 — Funding for Teacher Salaries and Optional Education Opportunities  (2023GS/HB0215) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 215' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 215', 'Funding for Teacher Salaries and Optional Education Opportunities',
      'Funding for Teacher Salaries and Optional Education Opportunities', 'This bill establishes the Utah Fits All Scholarship Program and provides funding for the program and a doubling of an educator salary adjustment.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0215.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0215',
        'primeSponsor', 'Rep. Pierucci, Candice B.', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 90, true,
      'yea_supports', 'The bill establishes the Utah Fits All Scholarship Program, requires the state board to contract a program manager by September 1, 2023, and authorises scholarship accounts that pay for approved education goods and services at eligible private schools and providers from the 2024-2025 school year. Publicly funded scholarship accounts spendable outside the district system is what school_choice names, and a yea created the program. The same bill also codifies and doubles the state-provided educator salary adjustment; the two were joined on purpose, and a legislator who wanted the raise could not vote for it separately. The mapping records the position the vote enacted, not the motive behind it, which is why the salary half carries no second key.', 'https://le.utah.gov/~2023/bills/static/HB0215.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 60 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 60,
      '2023-01-20T12:25:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":54,"nay":20,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=60&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 74 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'eliason_h45', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 105 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 105,
      '2023-01-26T12:09:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":20,"nay":8,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=105&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'dowens_st', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 398 — Special Needs Opportunity Scholarship Program Amendments  (2023GS/HB0398) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 398' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 398', 'Special Needs Opportunity Scholarship Program Amendments',
      'Special Needs Opportunity Scholarship Program Amendments', 'This bill amends provisions related to the Special Needs Opportunity Scholarship Program.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0398.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0398',
        'primeSponsor', 'Rep. Abbott, Nelson T.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'school_choice') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'school_choice', 75, true,
      'yea_supports', 'The bill expands the expenses a Special Needs Opportunity Scholarship recipient may pay with an award, amends the formula for calculating the amount, and increases the donations a scholarship granting organisation may carry forward. Every operative clause widens a tax-credit scholarship that pays for private schooling, so a yea is a vote to enlarge it.', 'https://le.utah.gov/~2023/bills/static/HB0398.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1621 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1621,
      '2023-03-03T19:37:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":51,"nay":14,"notVoting":10}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1621&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'eliason_h45', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'tyler_clancy', 'not_voting'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'cmusselman', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 477 — Full-day Kindergarten Amendments  (2023GS/HB0477) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 477' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 477', 'Full-day Kindergarten Amendments',
      'Full-day Kindergarten Amendments', 'This bill makes full-day kindergarten available for all local education agencies with an option for half-day kindergarten.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0477.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0477',
        'primeSponsor', 'Rep. Spendlove, Robert M.', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 70, true,
      'yea_supports', 'The bill amends the kindergarten funding formulas to reflect a full-day class, requires local education agency boards to keep an optional half-day class available on request, and repeals the earlier optional expanded kindergarten program it replaces. Moving the district funding formula to full-day kindergarten is spending on the public system, and a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0477.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 887 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 887,
      '2023-02-23T15:30:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":51,"nay":14,"notVoting":10}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=887&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'cheryl_acton', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'bolinder_h68', 'not_voting'),
    (rc_id, 'paul_a_cutler', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'thomas_peterson', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 400 — School Absenteeism Amendments  (2023GS/HB0400) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 400' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 400', 'School Absenteeism Amendments',
      'School Absenteeism Amendments', 'This bill enacts provisions relating to school absenteeism and student behavior.', 'passed_senate',
      'https://le.utah.gov/~2023/bills/static/HB0400.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0400',
        'primeSponsor', 'Rep. Johnson, Dan N.', 'floorSponsor', 'Sen. Millner, Ann'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'public_schools') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'public_schools', 55, true,
      'yea_supports', 'The bill directs local education agencies to use named evidence-based strategies against student absenteeism, enacts State Board of Education duties for chronic absenteeism prevention and intervention, and requires the Division of Juvenile Justice and Youth Services to use research-informed interventions. It is a duty imposed on and resourced through the district system; the weight is moderate because the bill spends attention rather than money.', 'https://le.utah.gov/~2023/bills/static/HB0400.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1306 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1306,
      '2023-03-01T16:45:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":53,"nay":19,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1306&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'rshipp', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'jefferson_burton', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 465 — Public School Library Transparency Amendments  (2023GS/HB0465) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 465' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 465', 'Public School Library Transparency Amendments',
      'Public School Library Transparency Amendments', 'This bill addresses transparency regarding materials accessible to students in public school libraries.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0465.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0465',
        'primeSponsor', 'Rep. Welton, Douglas R.', 'floorSponsor', 'Sen. Grover, Keith'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 80, true,
      'yea_supports', 'The bill requires local education agencies that provide school libraries to run an online platform on which a parent can see what materials the parent''s child has borrowed. Parental visibility into a child''s schooling is the entire operative provision, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0465.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 955 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 955,
      '2023-02-24T15:26:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":62,"nay":10,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=955&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'ivory_h39', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 427 — Individual Freedom in Public Education  (2023GS/HB0427) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 427' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 427', 'Individual Freedom in Public Education',
      'Individual Freedom in Public Education', 'This bill ensures that all instructional materials and classroom instruction are consistent with the principles of inalienable rights, equal opportunity, and individual merit.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0427.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0427',
        'primeSponsor', 'Rep. Jimenez, Tim', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'end_dei') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'end_dei', 85, true,
      'yea_supports', 'The bill requires the State Board of Education, local education agencies and staff to keep instructional materials and classroom instruction consistent with enumerated principles, prohibits materials and policies inconsistent with them, and bars the State Instructional Materials Commission from recommending such materials. Those principles are the ''divisive concepts'' list, and a yea restricts how race and sex may be taught in public classrooms.', 'https://le.utah.gov/~2023/bills/static/HB0427.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 35, false,
      'yea_supports', 'The same bill broadens the existing provision on prayer and religious devotionals in public schools. Secondary because it is one clause beside the instructional-materials restrictions that occupy the rest of the bill.', 'https://le.utah.gov/~2023/bills/static/HB0427.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1514 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1514,
      '2023-03-03T09:32:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":53,"nay":18,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1514&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 348 — Participation Waiver Amendments  (2023GS/HB0348) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 348' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 348', 'Participation Waiver Amendments',
      'Participation Waiver Amendments', 'This bill clarifies how a school responds when a student refrains from participation in school due to a student''s or a student''s parent''s religious belief or right of conscience.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0348.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0348',
        'primeSponsor', 'Rep. Acton, Cheryl K.', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'religious_liberty') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'religious_liberty', 75, true,
      'yea_supports', 'The bill clarifies how a school must respond when a student refrains from participating because of the student''s or a parent''s religious belief or right of conscience, citing Utah Constitution Article I Section 4, and grants the state board rulemaking authority to implement it. Protecting religiously grounded non-participation is the whole bill, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0348.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'edu_parental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'edu_parental', 45, false,
      'yea_supports', 'The waiver runs to the parent''s belief as well as the student''s, so it also enlarges what a parent may opt a child out of. Secondary because the religious ground, not parental authority generally, is what the bill turns on.', 'https://le.utah.gov/~2023/bills/static/HB0348.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1626 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1626,
      '2023-03-03T19:40:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":51,"nay":17,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1626&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting'),
    (rc_id, 'cmusselman', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 16 — Transgender Medical Treatments and Procedures Amendments  (2023GS/SB0016) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 16' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 16', 'Transgender Medical Treatments and Procedures Amendments',
      'Transgender Medical Treatments and Procedures Amendments', 'This bill enacts provisions regarding transgender medical treatments and procedures.', 'failed',
      'https://le.utah.gov/~2023/bills/static/SB0016.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0016',
        'primeSponsor', 'Sen. Kennedy, Michael S.', 'floorSponsor', 'Rep. Hall, Katy'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lgbtq_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lgbtq_rights', 90, true,
      'yea_opposes', 'The bill prohibits a health care provider from giving a hormonal transgender treatment to any new patient not diagnosed with gender dysphoria before a set date, prohibits sex characteristic surgical procedures on a minor for the purpose of a sex change, extends the malpractice limitations period for those treatments and lets a patient disaffirm consent given as a minor. Access to transgender medical care is the operative subject and a yea is a vote to restrict it.', 'https://le.utah.gov/~2023/bills/static/SB0016.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 117 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 117,
      '2023-01-26T13:31:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":14,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=117&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 16 of the 74 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
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
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'kohler_h59', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 109 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 109,
      '2023-01-27T11:29:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":20,"nay":8,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=109&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
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
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'tweiler', 'nay'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 467 — Abortion Changes  (2023GS/HB0467) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 467' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 467', 'Abortion Changes',
      'Abortion Changes', 'This bill modifies provisions related to abortion.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0467.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0467',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. McCay, Daniel'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'pro_life') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'pro_life', 90, true,
      'yea_supports', 'The bill requires abortions to be performed in a hospital with limited exceptions, prohibits the licensing of abortion clinics after May 2, 2023, makes performing an abortion contrary to statute unprofessional conduct for six categories of clinician, bars an abortion for rape or incest after 18 weeks gestational age, and creates a criminal offence for prescribing an abortion drug unless the prescriber is a Utah-licensed physician. Every operative clause narrows lawful access, so a yea is a vote to restrict abortion.', 'https://le.utah.gov/~2023/bills/static/HB0467.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1524 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1524,
      '2023-03-03T09:41:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":56,"nay":14,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1524&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'rshipp', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'chew_h68', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 219 — Firearms Regulations  (2023GS/HB0219) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 219' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 219', 'Firearms Regulations',
      'Firearms Regulations', 'This bill declares that the state will not enforce certain federal firearms regulations.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0219.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0219',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. Vickers, Evan J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 90, true,
      'yea_supports', 'The bill declares the state''s commitment to the Second Amendment and declares that the state and its political subdivisions will not enforce federal regulations purporting to restrict or ban certain firearms, ammunition or accessories. Refusing to enforce federal firearm regulation is the whole bill, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0219.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 55, false,
      'yea_supports', 'The mechanism is a refusal of state assistance in enforcing federal law, which is a claim about the division of authority as much as about firearms. Secondary because the subject the refusal is aimed at is guns.', 'https://le.utah.gov/~2023/bills/static/HB0219.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 392 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 392,
      '2023-02-09T14:17:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":13,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=392&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'mark_strong', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 107 — Concealed Weapons Permit Fee Amendments  (2023GS/HB0107) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 107' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 107', 'Concealed Weapons Permit Fee Amendments',
      'Concealed Weapons Permit Fee Amendments', 'This bill amends who is eligible for a waiver to a concealed weapons permit fee.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0107.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0107',
        'primeSponsor', 'Rep. Lisonbee, Karianne', 'floorSponsor', 'Sen. Johnson, John D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 60, true,
      'yea_supports', 'The bill waives the concealed weapons permit fee for a school employee in certain circumstances. It lowers the cost of carrying rather than changing who may carry, which is why the weight is moderate, but the direction is not in doubt: a yea makes a permit easier to obtain.', 'https://le.utah.gov/~2023/bills/static/HB0107.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 313 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 313,
      '2023-02-06T11:32:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":12,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=313&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'rshipp', 'yea'),
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
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1642 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 1642,
      '2023-03-01T14:21:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":22,"nay":6,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1642&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
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
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 461 — Airport Firearm Possession Amendments  (2023GS/HB0461) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 461' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 461', 'Airport Firearm Possession Amendments',
      'Airport Firearm Possession Amendments', 'This bill concerns possession of a firearm at an airport.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0461.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0461',
        'primeSponsor', 'Rep. Gricius, Stephanie', 'floorSponsor', 'Sen. Hinkins, David P.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 65, true,
      'yea_supports', 'The bill provides when a firearm seized in connection with an airport offence may be returned to its owner, modifies the offence of possession of a dangerous weapon at an airport, and restricts a prosecutor''s ability to seek forfeiture of a firearm. Each clause moves in the owner''s favour, so a yea is a vote for firearm owners against the seizure.', 'https://le.utah.gov/~2023/bills/static/HB0461.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 908 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 908,
      '2023-02-24T10:42:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":14,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=908&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting'),
    (rc_id, 'ryan_d_wilcox', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 165 — Firearm Discharge on Private Property Amendments  (2023GS/HB0165) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 165' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 165', 'Firearm Discharge on Private Property Amendments',
      'Firearm Discharge on Private Property Amendments', 'This bill addresses liability resulting from the discharge of a firearm on private property.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0165.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0165',
        'primeSponsor', 'Rep. Lee, Trevor', 'floorSponsor', 'Sen. Anderegg, Jacob L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gun_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gun_rights', 60, true,
      'yea_supports', 'The bill provides that a private property occupant is not liable for the discharge of a firearm on the property by someone in lawful possession of it. Removing the liability that deters an occupant from allowing lawful discharge is a vote for firearm use, so a yea supports it.', 'https://le.utah.gov/~2023/bills/static/HB0165.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 40, false,
      'yea_supports', 'The immunity attaches to the occupant of private property and is about what an owner may permit on their own land. Secondary because firearms, not land use generally, are what the immunity covers.', 'https://le.utah.gov/~2023/bills/static/HB0165.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 315 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 315,
      '2023-02-06T11:37:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":11,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=315&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 131 — Vaccine Passport Prohibition  (2023GS/HB0131) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 131' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 131', 'Vaccine Passport Prohibition',
      'Vaccine Passport Prohibition', 'This bill enacts a prohibition on the use of an individual''s immunity status by places of public accommodation, governmental entities, and employers.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0131.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0131',
        'primeSponsor', 'Rep. Brooks, Walt', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'medical_freedom') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'medical_freedom', 90, true,
      'yea_supports', 'The bill makes it unlawful for a place of public accommodation to discriminate on immunity status, prohibits a governmental entity from requiring proof of immunity status, makes an employer''s demand for such proof unlawful discrimination, and prohibits a governmental entity or employer from requiring an individual to receive a vaccine. Barring vaccine and vaccine-proof requirements is the whole bill, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0131.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 137 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 137,
      '2023-01-30T11:24:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":13,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=137&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1592 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 1592,
      '2023-03-01T09:57:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":21,"nay":5,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1592&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'dipson', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mccay_s11', 'yea'),
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
    (rc_id, 'mckell_s25', 'not_voting'),
    (rc_id, 'kathleen_riebe', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 133 — Modifications to Medicaid Coverage  (2023GS/SB0133) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 133' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 133', 'Modifications to Medicaid Coverage',
      'Modifications to Medicaid Coverage', 'This bill addresses Medicaid for pregnant and postpartum women.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0133.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0133',
        'primeSponsor', 'Sen. Harper, Wayne A.', 'floorSponsor', 'Rep. Acton, Cheryl K.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 75, true,
      'yea_supports', 'The bill requires the state Medicaid program to seek waivers or state plan amendments to expand eligibility for certain limited family planning services and to extend the duration of postpartum coverage. Both clauses widen public coverage, so a yea is a vote to expand it. This was the most contested House vote of the session.', 'https://le.utah.gov/~2023/bills/static/SB0133.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1194 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1194,
      '2023-03-01T10:23:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":43,"nay":29,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1194&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'jefferson_burton', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'thomas_peterson', 'nay'),
    (rc_id, 'valpeterson_h56', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 19 — Medicaid Dental Waiver Amendments  (2023GS/SB0019) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 19' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 19', 'Medicaid Dental Waiver Amendments',
      'Medicaid Dental Waiver Amendments', 'This bill amends the Medical Assistance Act.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0019.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0019',
        'primeSponsor', 'Sen. Vickers, Evan J.', 'floorSponsor', 'Rep. Eliason, Steve'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 65, true,
      'yea_supports', 'The bill requires the Department of Health and Human Services to seek authorisation to provide dental services to Medicaid-eligible adults not already eligible for them. Adding a benefit to public coverage is the operative provision, so a yea is a vote to expand it.', 'https://le.utah.gov/~2023/bills/static/SB0019.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 359 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 359,
      '2023-02-08T11:46:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":51,"nay":15,"notVoting":9}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=359&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'thomas_peterson', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'candice_pierucci', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting'),
    (rc_id, 'ryan_d_wilcox', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 217 — Children's Health Coverage Amendments  (2023GS/SB0217) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 217' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 217', 'Children''s Health Coverage Amendments',
      'Children''s Health Coverage Amendments', 'This bill creates alternative eligibility requirements for the Children''s Health Insurance Program.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0217.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0217',
        'primeSponsor', 'Sen. Escamilla, Luz', 'floorSponsor', 'Rep. Dunnigan, James A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 70, true,
      'yea_supports', 'The bill creates alternative eligibility requirements for the Children''s Health Insurance Program, specifies the benefits a child eligible under them may receive, and creates a fund to pay for that enrolment. It brings children into public coverage who were not eligible before, so a yea is a vote to expand it; the waiting-list and enrolment-cap clauses limit the size of the expansion rather than reversing its direction.', 'https://le.utah.gov/~2023/bills/static/SB0217.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1757 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 1757,
      '2023-03-02T09:37:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":25,"nay":3,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1757&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'john_johnson', 'yea'),
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
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 204 — Autism Coverage Amendments  (2023GS/SB0204) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 204' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 204', 'Autism Coverage Amendments',
      'Autism Coverage Amendments', 'This bill requires the Department of Health and Human Services to request a state plan amendment for the Medicaid program to provide coverage for autism treatment services.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0204.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0204',
        'primeSponsor', 'Sen. Bramble, Curtis S.', 'floorSponsor', 'Rep. Eliason, Steve'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 60, true,
      'yea_supports', 'The bill requires the Department of Health and Human Services to seek a state plan amendment providing Medicaid coverage for autism treatment services. One added benefit, no offsetting clause, so a yea is a vote to widen public coverage.', 'https://le.utah.gov/~2023/bills/static/SB0204.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1165 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1165,
      '2023-02-28T19:29:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":62,"nay":10,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1165&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'jon_hawkins', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'jefferson_moss', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 315 — Recreational Therapy Medicaid Coverage Amendments  (2023GS/HB0315) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 315' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 315', 'Recreational Therapy Medicaid Coverage Amendments',
      'Recreational Therapy Medicaid Coverage Amendments', 'This bill enacts provisions relating to recreational therapy coverage under Medicaid.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0315.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0315',
        'primeSponsor', 'Rep. Dunnigan, James A.', 'floorSponsor', 'Sen. Bramble, Curtis S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'healthcare', 50, true,
      'yea_supports', 'The bill requires the department to apply for a waiver or state plan amendment expanding Medicaid coverage of recreational therapy services. The weight is modest because the bill directs a request rather than an entitlement, but the direction of the request is unambiguous.', 'https://le.utah.gov/~2023/bills/static/HB0315.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 407 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 407,
      '2023-02-09T15:56:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":10,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=407&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'jefferson_moss', 'nay'),
    (rc_id, 'karen_m_peterson', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'nelson_abbott', 'not_voting'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'teuscher_h44', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 105 — Public Employee Disability Benefits Amendments  (2023GS/HB0105) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 105' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 105', 'Public Employee Disability Benefits Amendments',
      'Public Employee Disability Benefits Amendments', 'This bill amends the Public Employees'' Long-Term Disability Act.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0105.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0105',
        'primeSponsor', 'Rep. King, Brian S.', 'floorSponsor', 'Sen. Bramble, Curtis S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'health_mental') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'health_mental', 80, true,
      'yea_supports', 'The bill establishes a three-year pilot in which a public employee with a mental objective medical impairment qualifies for the same disability benefit as one with a physical objective medical impairment, with review and compliance requirements attached. Paying for mental impairment on the same terms as physical impairment is what the bill does, so a yea is a vote for mental-health parity. It was the second most contested House vote of the session.', 'https://le.utah.gov/~2023/bills/static/HB0105.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 609 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 609,
      '2023-02-15T14:58:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":38,"nay":30,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=609&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'cheryl_acton', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'bolinder_h68', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'jefferson_moss', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'nelson_abbott', 'not_voting'),
    (rc_id, 'carl_albrecht', 'not_voting'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'jon_hawkins', 'not_voting'),
    (rc_id, 'cmusselman', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 425 — Energy Security Amendments  (2023GS/HB0425) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 425' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 425', 'Energy Security Amendments',
      'Energy Security Amendments', 'This bill modifies provisions related to the regulation of energy.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0425.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0425',
        'primeSponsor', 'Rep. Ivory, Ken', 'floorSponsor', 'Sen. Owens, Derrin R.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'energy_production') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'energy_production', 75, true,
      'yea_supports', 'The bill requires 180 days'' notice to the Legislative Management Committee before a project entity disposes of an asset or decommissions a coal-powered generation facility, requires an Office of Energy Development study of a project entity, and amends the state energy policy to promote energy independence through the use of energy resources generated within the state. Slowing coal retirement and writing in-state generation into state policy is a vote for domestic production.', 'https://le.utah.gov/~2023/bills/static/HB0425.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 709 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 709,
      '2023-02-17T11:12:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":58,"nay":12,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=709&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
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
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nelson_abbott', 'not_voting'),
    (rc_id, 'james_dunnigan', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 288 — Utility Bill Assistance Program  (2023GS/SB0288) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 288' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 288', 'Utility Bill Assistance Program',
      'Utility Bill Assistance Program', 'This bill creates the Utility Bill Assistance Program (program).', 'failed',
      'https://le.utah.gov/~2023/bills/static/SB0288.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0288',
        'primeSponsor', 'Sen. Ipson, Don L.', 'floorSponsor', 'Rep. Spendlove, Robert M.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'cost_living') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'cost_living', 60, true,
      'yea_supports', 'The bill creates a Utility Bill Assistance Program under the Division of Public Utilities that disburses money to large-scale electricity and natural gas utilities to fund bill credits for customers meeting income requirements. Lowering household energy bills for lower-income customers is the whole programme, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/SB0288.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1262 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1262,
      '2023-03-01T15:38:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":50,"nay":24,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1262&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'karen_m_peterson', 'nay'),
    (rc_id, 'thomas_peterson', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'jefferson_burton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 118 — Water Efficient Landscaping Incentives  (2023GS/SB0118) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 118' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 118', 'Water Efficient Landscaping Incentives',
      'Water Efficient Landscaping Incentives', 'This bill addresses efficient use of water including incentives to install and maintain water efficient landscaping.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0118.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0118',
        'primeSponsor', 'Sen. Sandall, Scott D.', 'floorSponsor', 'Rep. Owens, Doug'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 75, true,
      'yea_supports', 'The bill authorises water conservancy districts to receive grants funding water-efficient landscaping incentives, sets the conditions under which an owner may receive an incentive, and tracks local government implementation of water use efficiency standards. Reducing outdoor water demand is the operative subject, so a yea is a vote for conservation.', 'https://le.utah.gov/~2023/bills/static/SB0118.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1354 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1354,
      '2023-03-01T19:24:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":12,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1354&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'cheryl_acton', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'gwynn_h6', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'jefferson_burton', 'not_voting'),
    (rc_id, 'lisonbee_h14', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 217 — School Energy and Water Reductions  (2023GS/HB0217) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 217' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 217', 'School Energy and Water Reductions',
      'School Energy and Water Reductions', 'This bill addresses grant money for energy and water reductions.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0217.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0217',
        'primeSponsor', 'Rep. Bennion, Gay Lynn', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 55, true,
      'yea_supports', 'The bill authorises the state board to issue grants for school energy and water reduction projects, prioritises certain projects, requires an evaluation panel and reporting, and sets a repeal date. Water reduction is half of a two-part purpose and the programme sunsets, which is why the weight is moderate; the direction is not in question.', 'https://le.utah.gov/~2023/bills/static/HB0217.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1516 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1516,
      '2023-03-03T09:34:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":63,"nay":8,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1516&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'mschultz', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 174 — Local Land Use and Development Revisions  (2023GS/SB0174) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 174' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 174', 'Local Land Use and Development Revisions',
      'Local Land Use and Development Revisions', 'This bill amends provisions related to local land use and development.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0174.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0174',
        'primeSponsor', 'Sen. Fillmore, Lincoln', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_build') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_build', 75, true,
      'yea_supports', 'The bill widens what counts as an internal accessory dwelling unit to include a garage in defined circumstances, limits a political subdivision''s authority to restrict internal accessory dwelling units, enacts a new subdivision review and approval process, and amends the penalties for a political subdivision that fails to file its moderate income housing report. Each clause makes it harder for a local government to stop new units, so a yea is a vote for building.', 'https://le.utah.gov/~2023/bills/static/SB0174.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1337 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1337,
      '2023-03-01T17:26:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":55,"nay":13,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1337&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'jason_b_kyle', 'not_voting'),
    (rc_id, 'doug_owens', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 271 — Home Ownership Requirements  (2023GS/SB0271) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 271' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 271', 'Home Ownership Requirements',
      'Home Ownership Requirements', 'This bill prohibits certain municipal and county land use regulations.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0271.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0271',
        'primeSponsor', 'Sen. McKell, Michael K.', 'floorSponsor', 'Rep. Peterson, Val L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing', 60, true,
      'yea_supports', 'The bill prohibits a county or municipal legislative body from adopting or enforcing a land use regulation that treats co-owned homes differently from other residential units, or from using such a regulation to punish people for owning or using a co-owned home. Protecting a lower-cost route into ownership is the operative provision, so a yea is a vote for housing supply of that kind.', 'https://le.utah.gov/~2023/bills/static/SB0271.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 45, false,
      'yea_supports', 'The prohibition runs against local regulation of what an owner may do with a home they hold in common with others. Secondary because the class of property protected is narrow.', 'https://le.utah.gov/~2023/bills/static/SB0271.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1555 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1555,
      '2023-03-03T12:19:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":56,"nay":16,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1555&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'jason_b_kyle', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 240 — First-time Homebuyer Assistance Program  (2023GS/SB0240) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 240' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 240', 'First-time Homebuyer Assistance Program',
      'First-time Homebuyer Assistance Program', 'This bill creates the First-Time Homebuyer Assistance Program.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0240.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0240',
        'primeSponsor', 'Sen. Adams, J. Stuart', 'floorSponsor', 'Rep. Whyte, Stephen L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_first_time') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_first_time', 85, true,
      'yea_supports', 'The bill creates the First-Time Homebuyer Assistance Program within the Utah Housing Corporation, limits which purchase costs programme funds may pay, provides for repayment in certain circumstances and requires annual reporting on disbursements. The programme is named for the constituency the key names, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/SB0240.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1155 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1155,
      '2023-02-28T19:19:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":60,"nay":8,"notVoting":7}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1155&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
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
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'brammer_s21', 'not_voting'),
    (rc_id, 'anthony_loubet', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting'),
    (rc_id, 'ryan_d_wilcox', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 364 — Housing Affordability Amendments  (2023GS/HB0364) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 364' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 364', 'Housing Affordability Amendments',
      'Housing Affordability Amendments', 'This bill modifies provisions relating to affordable housing and the provision of services related to affordable housing.', 'passed_senate',
      'https://le.utah.gov/~2023/bills/static/HB0364.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0364',
        'primeSponsor', 'Rep. Whyte, Stephen L.', 'floorSponsor', 'Sen. Fillmore, Lincoln'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_support', 70, true,
      'yea_supports', 'The bill increases the aggregate annual amount of state low-income housing tax credits, allows the credit to pass through to certain business entities, creates an appeal board for a city or county found out of compliance with its moderate income housing report, and requires annual reporting on the Utah Housing Preservation Fund. Subsidised low-income housing is the operative subject, so a yea is a vote to fund more of it.', 'https://le.utah.gov/~2023/bills/static/HB0364.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1386 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1386,
      '2023-03-02T09:41:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":63,"nay":9,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1386&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'jefferson_burton', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 468 — Employment Screening Requirements  (2023GS/HB0468) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 468' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 468', 'Employment Screening Requirements',
      'Employment Screening Requirements', 'This bill addresses employment background screening requirements.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0468.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0468',
        'primeSponsor', 'Rep. Judkins, Marsha', 'floorSponsor', 'Sen. Kennedy, Michael S.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'justice_reform', 70, true,
      'yea_supports', 'The bill prohibits public employers and their contractors hiring a mental health professional from considering certain arrests or convictions or denying employment for certain convictions or participation in substance use treatment, and prohibits a private employer from excluding such an applicant from an interview over a juvenile adjudication, certain arrests, or an expunged offence. Removing a criminal record as a bar to work is what justice_reform names, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0468.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 878 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 878,
      '2023-02-23T14:41:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":41,"nay":25,"notVoting":9}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=878&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'gricius_h50', 'nay'),
    (rc_id, 'jon_hawkins', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'thomas_peterson', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'mballard', 'not_voting'),
    (rc_id, 'walt_brooks', 'not_voting'),
    (rc_id, 'jefferson_burton', 'not_voting'),
    (rc_id, 'hollins_h24', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'cory_maloy_h52', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'rshipp', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 114 — Theft Defense Amendments  (2023GS/HB0114) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 114' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 114', 'Theft Defense Amendments',
      'Theft Defense Amendments', 'This bill amends the defenses available to those charged with theft.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0114.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0114',
        'primeSponsor', 'Rep. Albrecht, Carl R.', 'floorSponsor', 'Sen. Vickers, Evan J.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 55, true,
      'yea_supports', 'The bill provides that it is not a defence to theft of livestock that the animal was sick, injured or a liability to its owner. Closing a defence makes conviction easier, so a yea is a vote in the prosecution''s direction; the weight is moderate because the offence is a single narrow one.', 'https://le.utah.gov/~2023/bills/static/HB0114.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'rural_ag') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'rural_ag', 40, false,
      'yea_supports', 'The protected interest is a livestock owner''s, and the bill exists because of theft from Utah ranches. Secondary because the mechanism is criminal-defence law.', 'https://le.utah.gov/~2023/bills/static/HB0114.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 466 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 466,
      '2023-02-09T10:41:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":7,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=466&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
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
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'daniel_thatcher', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'tweiler', 'nay'),
    (rc_id, 'dipson', 'not_voting'),
    (rc_id, 'dowens_st', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 208 — Criminal Trespass Amendments  (2023GS/HB0208) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 208' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 208', 'Criminal Trespass Amendments',
      'Criminal Trespass Amendments', 'This bill addresses criminal trespass on private property related to use of public waters.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0208.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0208',
        'primeSponsor', 'Rep. Chew, Scott H.', 'floorSponsor', 'Sen. Sandall, Scott D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tough_on_crime') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tough_on_crime', 60, true,
      'yea_supports', 'The bill establishes the elements of and penalty for a form of criminal trespass, specifies defences, and provides statutory damages, attorney fees and court costs. Creating an offence and attaching penalties to it is a vote for enforcement, so a yea supports it.', 'https://le.utah.gov/~2023/bills/static/HB0208.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'property_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'property_rights', 50, false,
      'yea_supports', 'The interest the new offence and its statutory damages protect is the landowner''s right to exclude. Secondary because the instrument is the criminal code.', 'https://le.utah.gov/~2023/bills/static/HB0208.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 975 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 975,
      '2023-02-27T10:33:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":54,"nay":17,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=975&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'cmusselman', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'carl_albrecht', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1307 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 1307,
      '2023-02-24T14:44:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":22,"nay":4,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1307&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
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
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'kathleen_riebe', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 156 — Investigative Genetic Genealogy Modifications  (2023GS/SB0156) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 156' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 156', 'Investigative Genetic Genealogy Modifications',
      'Investigative Genetic Genealogy Modifications', 'This bill concerns the use of investigative genetic genealogy.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0156.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0156',
        'primeSponsor', 'Sen. Weiler, Todd D.', 'floorSponsor', 'Rep. Eliason, Steve'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 80, true,
      'yea_supports', 'The bill sets requirements a law enforcement agency must meet before requesting investigative genetic genealogy services or processing a third-party DNA specimen, limits arrests, charges and uses based on genetic information, requires retention and destruction procedures, and creates remedies. Constraining police use of genetic data is the whole bill, so a yea is a vote for the privacy interest.', 'https://le.utah.gov/~2023/bills/static/SB0156.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1219 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1219,
      '2023-03-01T11:32:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":46,"nay":24,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1219&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'brammer_s21', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'jon_hawkins', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'lisonbee_h14', 'nay'),
    (rc_id, 'cory_maloy_h52', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'mschultz', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'christine_watkins', 'nay'),
    (rc_id, 'doug_welton', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'nthurston', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 281 — Social Credit Score Amendments  (2023GS/HB0281) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 281' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 281', 'Social Credit Score Amendments',
      'Social Credit Score Amendments', 'This bill addresses social credit scores.', 'passed_senate',
      'https://le.utah.gov/~2023/bills/static/HB0281.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0281',
        'primeSponsor', 'Rep. Acton, Cheryl K.', 'floorSponsor', 'Sen. McKell, Michael K.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 65, true,
      'yea_supports', 'The bill prohibits a governmental entity from using, enforcing, feeding data into or otherwise participating in any system that uses a social credit score to advantage or disadvantage a person, and requires the Division of Consumer Protection to take consumer reports about a financial institution''s use of such a score. Barring state scoring of individuals is the operative provision, so a yea is a vote against that surveillance. The bill is also read as an anti-ESG measure; no key was assigned for that reading, because the clause the reading rests on creates a reporting channel rather than a duty on any company.', 'https://le.utah.gov/~2023/bills/static/HB0281.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1296 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1296,
      '2023-03-01T16:40:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":60,"nay":14,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1296&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'mike_petersen', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'mschultz', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1608 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 1608,
      '2023-03-01T10:38:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":18,"nay":5,"notVoting":6}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1608&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'harper_s16', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'blouin_s13', 'nay'),
    (rc_id, 'lescamilla', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'sadams', 'not_voting'),
    (rc_id, 'dipson', 'not_voting'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'jennifer_plumb', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 347 — Ballot Drop Box Amendments  (2023GS/HB0347) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 347' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 347', 'Ballot Drop Box Amendments',
      'Ballot Drop Box Amendments', 'This bill increases the criminal penalty relating to taking, carrying away, concealing, removing, or destroying a ballot drop box or the contents of a ballot drop box.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0347.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0347',
        'primeSponsor', 'Rep. Petersen, Michael J.', 'floorSponsor', 'Sen. Owens, Derrin R.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'election_integrity') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'election_integrity', 55, true,
      'yea_supports', 'The bill increases the criminal penalty for taking, carrying away, concealing, removing or destroying a ballot drop box or its contents. Penalising interference with ballots in transit is the whole bill, so a yea is a vote for it. The weight is moderate because the bill changes a penalty rather than any rule about who may vote or how.', 'https://le.utah.gov/~2023/bills/static/HB0347.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 462 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 462,
      '2023-02-13T14:24:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":54,"nay":16,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=462&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
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
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'jefferson_burton', 'not_voting'),
    (rc_id, 'gwynn_h6', 'not_voting'),
    (rc_id, 'valpeterson_h56', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 243 — Public Transit Employee Collective Bargaining Amendments  (2023GS/HB0243) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 243' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 243', 'Public Transit Employee Collective Bargaining Amendments',
      'Public Transit Employee Collective Bargaining Amendments', 'This bill makes changes to provisions related to collective bargaining for employees of a public transit district.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0243.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0243',
        'primeSponsor', 'Rep. Hawkins, Jon', 'floorSponsor', 'Sen. McKell, Michael K.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_workers') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_workers', 80, true,
      'yea_opposes', 'The bill excludes confidential employees, managerial employees and supervisors of a public transit district from the rights to self-organisation, to form or join a labour organisation, and to bargain collectively through representatives of their choosing. Removing collective bargaining rights from a class of public workers is the whole bill, so a yea is a vote against those workers'' organising rights.', 'https://le.utah.gov/~2023/bills/static/HB0243.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 329 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 329,
      '2023-02-06T15:02:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":49,"nay":21,"notVoting":5}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=329&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'paul_a_cutler', 'yea'),
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
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'hollins_h24', 'nay'),
    (rc_id, 'anthony_loubet', 'nay'),
    (rc_id, 'ashlee_matthews', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'rward', 'nay'),
    (rc_id, 'eliason_h45', 'not_voting'),
    (rc_id, 'kohler_h59', 'not_voting'),
    (rc_id, 'christine_watkins', 'not_voting'),
    (rc_id, 'doug_welton', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 864 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 864,
      '2023-02-16T11:39:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":20,"nay":9,"notVoting":0}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=864&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lincoln_fillmore', 'yea'),
    (rc_id, 'kgrover', 'yea'),
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
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'dhinkins', 'nay'),
    (rc_id, 'kwan_s12', 'nay'),
    (rc_id, 'stephanie_pitcher', 'nay'),
    (rc_id, 'jennifer_plumb', 'nay'),
    (rc_id, 'kathleen_riebe', 'nay'),
    (rc_id, 'daniel_thatcher', 'nay')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 260 — Transportation Funding Requirements  (2023GS/SB0260) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 260' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 260', 'Transportation Funding Requirements',
      'Transportation Funding Requirements', 'This bill amends provisions related to allowed uses for a certain local option sales and use tax for transportation.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0260.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0260',
        'primeSponsor', 'Sen. Cullimore, Kirk A.', 'floorSponsor', 'Rep. Peterson, Val L.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'transit', 70, true,
      'yea_supports', 'The bill allows a portion of a local option sales and use tax in a county of the first class to fund or make loans for public transit projects, and amends the distribution and allowed uses of that tax. Opening a revenue stream to transit capital is the operative provision, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/SB0260.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'housing_support', 35, false,
      'yea_supports', 'The same bill conditions a city''s receipt of the revenue on complying with the moderate income housing plan requirements. Secondary because the housing clause is a condition attached to a transportation tax rather than a housing programme.', 'https://le.utah.gov/~2023/bills/static/SB0260.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1640 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1640,
      '2023-03-03T20:04:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":57,"nay":17,"notVoting":1}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1640&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'carl_albrecht', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'stewart_e_barlow', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'jefferson_burton', 'yea'),
    (rc_id, 'chew_h68', 'yea'),
    (rc_id, 'kay_christofferson', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'snider_h5', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'nelson_abbott', 'nay'),
    (rc_id, 'cheryl_acton', 'nay'),
    (rc_id, 'walt_brooks', 'nay'),
    (rc_id, 'tyler_clancy', 'nay'),
    (rc_id, 'james_dunnigan', 'nay'),
    (rc_id, 'joseph_elison', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'colin_w_jack', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'christine_watkins', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 2100 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 2100,
      '2023-03-03T21:09:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":23,"nay":3,"notVoting":3}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=2100&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'john_johnson', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'mckell_s25', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'jstevenson', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'cwilson', 'nay'),
    (rc_id, 'mccay_s11', 'not_voting'),
    (rc_id, 'amillner', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── S.B. 153 — Governor's Office of Economic Opportunity Amendments  (2023GS/SB0153) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 153' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 153', 'Governor''s Office of Economic Opportunity Amendments',
      'Governor''s Office of Economic Opportunity Amendments', 'This bill modifies provisions related to the Governor''s Office of Economic Opportunity.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/SB0153.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'SB0153',
        'primeSponsor', 'Sen. Winterton, Ronald M.', 'floorSponsor', 'Rep. Stenquist, Jeffrey D.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_growth') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_growth', 50, true,
      'yea_supports', 'The bill modifies the Governor''s Office of Economic Opportunity''s authorisation of economic development tax credits and its award of loans and grants from the Industrial Assistance Account, repeals a limit on its use of State Small Business Credit Initiative funds for administration, and requires reporting on reinvestment agencies. State incentives for business expansion are the operative subject; the weight is modest because the bill is an omnibus of adjustments to an existing office rather than a new commitment.', 'https://le.utah.gov/~2023/bills/static/SB0153.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1400 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1400,
      '2023-03-02T09:53:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":62,"nay":11,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1400&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'kstratton', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'jason_b_kyle', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'mark_strong', 'nay'),
    (rc_id, 'teuscher_h44', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'nthurston', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 42 — Technology Commercialization Amendments  (2023GS/HB0042) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 42' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 42', 'Technology Commercialization Amendments',
      'Technology Commercialization Amendments', 'This bill enacts provisions relating to technology commercialization.', 'enacted',
      'https://le.utah.gov/~2023/bills/static/HB0042.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0042',
        'primeSponsor', 'Rep. Stenquist, Jeffrey D.', 'floorSponsor', 'Sen. Millner, Ann'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'tech_innovation') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'tech_innovation', 70, true,
      'yea_supports', 'The bill enacts the Utah Innovation Lab Act, creates the innovation lab and its governing board, and establishes the Utah innovation fund to invest in businesses developed in the state through technology commercialisation, with audit and reporting requirements. Public money placed behind commercialising research is what the key names, so a yea is a vote for it.', 'https://le.utah.gov/~2023/bills/static/HB0042.html');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_growth') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_growth', 40, false,
      'yea_supports', 'The fund''s stated purpose is business formation in the state. Secondary because the instrument is specific to technology transfer.', 'https://le.utah.gov/~2023/bills/static/HB0042.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 286 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 286,
      '2023-02-03T14:44:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":51,"nay":20,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=286&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'nelson_abbott', 'yea'),
    (rc_id, 'cheryl_acton', 'yea'),
    (rc_id, 'mballard', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'yea'),
    (rc_id, 'bolinder_h68', 'yea'),
    (rc_id, 'brammer_s21', 'yea'),
    (rc_id, 'walt_brooks', 'yea'),
    (rc_id, 'tyler_clancy', 'yea'),
    (rc_id, 'paul_a_cutler', 'yea'),
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'jefferson_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'doug_owens', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'aromero', 'yea'),
    (rc_id, 'mschultz', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'nthurston', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'carl_albrecht', 'nay'),
    (rc_id, 'stewart_e_barlow', 'nay'),
    (rc_id, 'jefferson_burton', 'nay'),
    (rc_id, 'chew_h68', 'nay'),
    (rc_id, 'kay_christofferson', 'nay'),
    (rc_id, 'hall_h11', 'nay'),
    (rc_id, 'ivory_h39', 'nay'),
    (rc_id, 'kohler_h59', 'nay'),
    (rc_id, 'tlee', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'candice_pierucci', 'nay'),
    (rc_id, 'rshipp', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'r_neil_walter', 'nay'),
    (rc_id, 'ryan_d_wilcox', 'nay'),
    (rc_id, 'gricius_h50', 'not_voting'),
    (rc_id, 'kstratton', 'not_voting'),
    (rc_id, 'bwilson', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah senate'
     AND congress IS NULL AND session = 2023
     AND roll_number = 986 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah senate', NULL, 2023, 986,
      '2023-02-17T11:27:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":19,"nay":6,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=986&house=S', 'Utah State Legislature · Utah Senate roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 3 of the 29 members recorded on this roll call are not on the PolitiDex roster; their
  -- votes are not written. Names are listed once at the head of this file.
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES
    (rc_id, 'sadams', 'yea'),
    (rc_id, 'blouin_s13', 'yea'),
    (rc_id, 'cbramble', 'yea'),
    (rc_id, 'kcullimore', 'yea'),
    (rc_id, 'lescamilla', 'yea'),
    (rc_id, 'kgrover', 'yea'),
    (rc_id, 'dhinkins', 'yea'),
    (rc_id, 'kwan_s12', 'yea'),
    (rc_id, 'amillner', 'yea'),
    (rc_id, 'dowens_st', 'yea'),
    (rc_id, 'stephanie_pitcher', 'yea'),
    (rc_id, 'jennifer_plumb', 'yea'),
    (rc_id, 'kathleen_riebe', 'yea'),
    (rc_id, 'ssandall', 'yea'),
    (rc_id, 'evickers', 'yea'),
    (rc_id, 'tweiler', 'yea'),
    (rc_id, 'cwilson', 'yea'),
    (rc_id, 'rwinterton', 'yea'),
    (rc_id, 'lincoln_fillmore', 'nay'),
    (rc_id, 'harper_s16', 'nay'),
    (rc_id, 'john_johnson', 'nay'),
    (rc_id, 'mccay_s11', 'nay'),
    (rc_id, 'dipson', 'not_voting'),
    (rc_id, 'mckell_s25', 'not_voting'),
    (rc_id, 'jstevenson', 'not_voting'),
    (rc_id, 'daniel_thatcher', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 289 — Blockchain Provider Registration  (2023GS/HB0289) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 289' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 289', 'Blockchain Provider Registration',
      'Blockchain Provider Registration', 'This bill creates the Noncustodial Blockchain Registry.', 'passed_senate',
      'https://le.utah.gov/~2023/bills/static/HB0289.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0289',
        'primeSponsor', 'Rep. Lee, Trevor', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'crypto_cbdc') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'crypto_cbdc', 60, true,
      'yea_supports', 'The bill creates the Noncustodial Blockchain Registry within the Utah Office of Regulatory Relief and sets application, renewal and removal requirements, giving a registered provider that does not hold customer keys a defined status in state law. Accommodating blockchain businesses is the operative provision, so a yea is a vote for the industry; the weight is moderate because registration is voluntary.', 'https://le.utah.gov/~2023/bills/static/HB0289.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 328 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 328,
      '2023-02-06T14:48:00-07:00'::timestamptz, 'On passage, third reading', 'passage', 'passed',
      '{"yea":61,"nay":10,"notVoting":4}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=328&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
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
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'jennifer_dailey_provost', 'nay'),
    (rc_id, 'sahara_hayes', 'nay'),
    (rc_id, 'carol_spackman_moss', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'andrew_stoddard', 'nay'),
    (rc_id, 'ivory_h39', 'not_voting'),
    (rc_id, 'snider_h5', 'not_voting')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
--> statement-breakpoint

-- ── H.B. 357 — Decentralized Autonomous Organizations Amendments  (2023GS/HB0357) ─────────────────────────
DO $$
DECLARE m_id integer; rc_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 357' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2023GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 357', 'Decentralized Autonomous Organizations Amendments',
      'Decentralized Autonomous Organizations Amendments', 'This bill allows a decentralized autonomous organization that has not registered as a for-profit corporate entity or a non-profit entity to be treated as the legal equivalent of a domestic limited liability company.', 'passed_senate',
      'https://le.utah.gov/~2023/bills/static/HB0357.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2023GS', 'utahBill', 'HB0357',
        'primeSponsor', 'Rep. Teuscher, Jordan D.', 'floorSponsor', 'Sen. Cullimore, Kirk A.'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'crypto_cbdc') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'crypto_cbdc', 70, true,
      'yea_supports', 'The bill enacts the Decentralized Autonomous Organization Act, establishing what a decentralised autonomous organisation must do to be recognised by the state, the purposes for which one may be formed, and the membership rights of its members. Giving on-chain organisations legal recognition is the whole bill, so a yea is a vote for them.', 'https://le.utah.gov/~2023/bills/static/HB0357.html');
  END IF;
  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = 'utah house'
     AND congress IS NULL AND session = 2023
     AND roll_number = 1298 LIMIT 1;
  IF rc_id IS NULL THEN
    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,
      vote_date, question, action_type, result, totals, source_url, source_label)
    VALUES (m_id, 'utah house', NULL, 2023, 1298,
      '2023-03-01T16:42:00-07:00'::timestamptz, 'On concurrence in amendments', 'passage', 'passed',
      '{"yea":62,"nay":11,"notVoting":2}'::jsonb, 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2023GS&voteid=1298&house=H', 'Utah State Legislature · Utah House roll call')
    RETURNING id INTO rc_id;
  END IF;
  -- 17 of the 75 members recorded on this roll call are not on the PolitiDex roster; their
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
    (rc_id, 'jennifer_dailey_provost', 'yea'),
    (rc_id, 'james_dunnigan', 'yea'),
    (rc_id, 'eliason_h45', 'yea'),
    (rc_id, 'joseph_elison', 'yea'),
    (rc_id, 'gricius_h50', 'yea'),
    (rc_id, 'gwynn_h6', 'yea'),
    (rc_id, 'hall_h11', 'yea'),
    (rc_id, 'jon_hawkins', 'yea'),
    (rc_id, 'sahara_hayes', 'yea'),
    (rc_id, 'hollins_h24', 'yea'),
    (rc_id, 'ivory_h39', 'yea'),
    (rc_id, 'colin_w_jack', 'yea'),
    (rc_id, 'kohler_h59', 'yea'),
    (rc_id, 'jason_b_kyle', 'yea'),
    (rc_id, 'tlee', 'yea'),
    (rc_id, 'lisonbee_h14', 'yea'),
    (rc_id, 'anthony_loubet', 'yea'),
    (rc_id, 'cory_maloy_h52', 'yea'),
    (rc_id, 'ashlee_matthews', 'yea'),
    (rc_id, 'carol_spackman_moss', 'yea'),
    (rc_id, 'cmusselman', 'yea'),
    (rc_id, 'karen_m_peterson', 'yea'),
    (rc_id, 'thomas_peterson', 'yea'),
    (rc_id, 'valpeterson_h56', 'yea'),
    (rc_id, 'candice_pierucci', 'yea'),
    (rc_id, 'rshipp', 'yea'),
    (rc_id, 'andrew_stoddard', 'yea'),
    (rc_id, 'mark_strong', 'yea'),
    (rc_id, 'teuscher_h44', 'yea'),
    (rc_id, 'r_neil_walter', 'yea'),
    (rc_id, 'rward', 'yea'),
    (rc_id, 'christine_watkins', 'yea'),
    (rc_id, 'doug_welton', 'yea'),
    (rc_id, 'whyte_h63', 'yea'),
    (rc_id, 'ryan_d_wilcox', 'yea'),
    (rc_id, 'bwilson', 'yea'),
    (rc_id, 'gay_lynn_bennion', 'nay'),
    (rc_id, 'doug_owens', 'nay'),
    (rc_id, 'mike_petersen', 'nay'),
    (rc_id, 'aromero', 'nay'),
    (rc_id, 'snider_h5', 'nay'),
    (rc_id, 'kstratton', 'nay'),
    (rc_id, 'nthurston', 'nay'),
    (rc_id, 'jefferson_moss', 'not_voting'),
    (rc_id, 'mschultz', 'not_voting')
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
   WHERE external_ids->>'utahSession' = '2023GS';
  SELECT count(*) INTO n_rolls FROM vr_rollcalls r
   WHERE r.congress IS NULL AND r.session = 2023
     AND r.chamber IN ('utah house', 'utah senate');
  SELECT count(*) INTO n_votes FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.congress IS NULL AND r.session = 2023
     AND r.chamber IN ('utah house', 'utah senate');
  SELECT count(*) INTO n_issues FROM vr_measure_issues i
    JOIN vr_measures m ON m.id = i.measure_id
   WHERE m.external_ids->>'utahSession' = '2023GS';
  SELECT count(*) INTO n_orphan FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE r.congress IS NULL AND r.session = 2023
     AND r.chamber IN ('utah house', 'utah senate')
     AND v.politician_id NOT IN ('amillner', 'andrew_stoddard', 'anthony_loubet', 'aromero', 'ashlee_matthews', 'blouin_s13', 'bolinder_h68', 'brammer_s21', 'bwilson', 'candice_pierucci', 'carl_albrecht', 'carol_spackman_moss', 'cbramble', 'cheryl_acton', 'chew_h68', 'christine_watkins', 'cmusselman', 'colin_w_jack', 'cory_maloy_h52', 'cwilson', 'daniel_thatcher', 'dhinkins', 'dipson', 'doug_owens', 'doug_welton', 'dowens_st', 'eliason_h45', 'evickers', 'gay_lynn_bennion', 'gricius_h50', 'gwynn_h6', 'hall_h11', 'harper_s16', 'hollins_h24', 'ivory_h39', 'james_dunnigan', 'jason_b_kyle', 'jefferson_burton', 'jefferson_moss', 'jennifer_dailey_provost', 'jennifer_plumb', 'john_johnson', 'jon_hawkins', 'joseph_elison', 'jstevenson', 'karen_m_peterson', 'kathleen_riebe', 'kay_christofferson', 'kcullimore', 'kgrover', 'kohler_h59', 'kstratton', 'kwan_s12', 'lescamilla', 'lincoln_fillmore', 'lisonbee_h14', 'mark_strong', 'mballard', 'mccay_s11', 'mckell_s25', 'mike_petersen', 'mschultz', 'nelson_abbott', 'nthurston', 'paul_a_cutler', 'r_neil_walter', 'rshipp', 'rward', 'rwinterton', 'ryan_d_wilcox', 'sadams', 'sahara_hayes', 'snider_h5', 'ssandall', 'stephanie_pitcher', 'stewart_e_barlow', 'teuscher_h44', 'thomas_peterson', 'tlee', 'tweiler', 'tyler_clancy', 'valpeterson_h56', 'walt_brooks', 'whyte_h63');
  RAISE NOTICE 'Utah 2023GS: % measures, % roll calls, % member votes, % issue mappings',
    n_measures, n_rolls, n_votes, n_issues;
  IF n_measures <> 40 THEN
    RAISE EXCEPTION 'Utah 2023GS: expected 40 measures, found %', n_measures;
  END IF;
  IF n_rolls <> 49 THEN
    RAISE EXCEPTION 'Utah 2023GS: expected 49 roll calls, found %', n_rolls;
  END IF;
  IF n_votes < 2490 THEN
    RAISE EXCEPTION 'Utah 2023GS: expected at least 2490 member votes, found % — the inserts did not land', n_votes;
  END IF;
  IF n_issues <> 49 THEN
    RAISE EXCEPTION 'Utah 2023GS: expected 49 issue mappings, found %', n_issues;
  END IF;
  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'Utah 2023GS: % member vote(s) name a politician_id outside the reviewed member map', n_orphan;
  END IF;
END $$;
