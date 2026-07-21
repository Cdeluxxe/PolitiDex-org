-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 20: Governors, round 2 (executive action + funding freeze)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Governors remained the largest under-covered group of key officials
-- in the accountability layer — wave 19 brought in only the three who sued to stop
-- National Guard federalization in their own states. This wave broadens governor
-- coverage on both sides of the aisle and connects them to concrete, dated, sourced
-- actions, keyed to the SAME roster slugs their profiles and stances use.
--
-- Two connected threads, deliberately balanced against each other and against wave 19:
--   1) The August 2025 multistate National Guard deployment to Washington, D.C. Six
--      Republican governors voluntarily sent their states' Guard at the federal
--      government's request. Recorded as a single executive-action measure with each
--      governor's on-record action. (Pairs with wave 19, where Democratic governors
--      went to court to STOP Guard deployments in their states — the two waves
--      together show the full spectrum of governor responses.)
--   2) The January 2025 federal funding-freeze fight (New York v. Trump, D.R.I.). A
--      22-state coalition of attorneys general — and, notably, Kentucky's Democratic
--      GOVERNOR, who joined the suit — challenged an OMB memo pausing federal grants.
--      Recorded as a litigation measure. This reconnects the AG coalition on a NEW
--      issue (government services / the spending power) and adds a Democratic governor.
--
-- NEUTRALITY: each item records only what an official did and when, with a dated,
-- sourced account — no verdict framing. Litigation/executive-action status stays at
-- the neutral 'pending'; the timeline carries outcomes. Every politician_id is
-- verified against the roster; every issue_key against db/issue-keys.json; every
-- source is an official government page or a major outlet.
--
-- ADDITIVE + IDEMPOTENT: measures inserted only when absent (guarded by title);
-- issues/actions guarded; positions use ON CONFLICT DO NOTHING. Rolls forward from
-- the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_dcguard integer;
  m_freeze  integer;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · August 2025 multistate National Guard deployment to Washington, D.C.
  --     Six Republican governors sent their states' National Guard to D.C. at the
  --     federal government's request as part of a crime-and-safety surge. Modeled as
  --     an executive-action measure; each governor's action is an on-record position.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_dcguard FROM vr_measures
    WHERE measure_type = 'executive_action' AND title = 'Multistate National Guard deployment to Washington, D.C. (August 2025)' LIMIT 1;
  IF m_dcguard IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('executive_action', NULL, NULL, 'D.C. Guard deployment (2025)',
       'Multistate National Guard deployment to Washington, D.C. (August 2025)',
       'D.C. National Guard deployment (2025)',
       'In August 2025, as the federal government surged forces into Washington, D.C. and placed the city''s police under federal control, six Republican-led states sent their own National Guard troops to the capital at the Department of the Army''s request. The states that deployed troops were West Virginia, Mississippi, Tennessee, Louisiana, South Carolina, and Ohio. The action was framed by the administration as a crime-and-safety crackdown.',
       'pending',
       'https://www.cnn.com/2025/08/19/politics/national-guard-washington-dc-troops', 'CNN',
       '{"executiveOrder":"EO 14339"}')
    RETURNING id INTO m_dcguard;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_dcguard, 'gov_balance',       100, true,  'yea_supports', 'A federalism question: states sending their Guard to the capital at federal request, amid federal control of D.C. policing.'),
      (m_dcguard, 'back_police',        65, false, 'yea_supports', 'The deployment was framed as a law-and-order crime crackdown assisting law enforcement in the capital.'),
      (m_dcguard, 'democracy_balance',  50, false, 'yea_supports', 'Raises questions about domestic use of the National Guard and federal authority over the District of Columbia.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_dcguard, 'other', NULL, '2025-08-17T00:00:00Z', 'Governors of Mississippi, Tennessee, and Louisiana announced they would send National Guard troops to Washington, D.C.', 'https://www.npr.org/2025/08/17/nx-s1-5505271/three-republican-led-states-to-send-hundreds-of-national-guard-troops-to-washington', 'NPR', 10),
      (m_dcguard, 'other', NULL, '2025-08-19T00:00:00Z', 'National Guard troops from Republican-led states began arriving in D.C.; West Virginia, South Carolina, and Ohio also pledged troops.', 'https://www.cnn.com/2025/08/19/politics/national-guard-washington-dc-troops', 'CNN', 20);

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_dcguard, 'patrick_morrisey', 'statement', true, '2025-08-19T00:00:00Z', 'https://www.cbsnews.com/news/west-virginia-to-deploy-hundreds-of-national-guard-troops-to-d-c/', 'Governor of West Virginia; announced deploying several hundred National Guard troops to D.C. in support of the federal effort.'),
      (m_dcguard, 'tate_reeves',      'statement', true, '2025-08-17T00:00:00Z', 'https://www.npr.org/2025/08/17/nx-s1-5505271/three-republican-led-states-to-send-hundreds-of-national-guard-troops-to-washington', 'Governor of Mississippi; announced sending National Guard troops to D.C.'),
      (m_dcguard, 'bill_lee',         'statement', true, '2025-08-17T00:00:00Z', 'https://www.npr.org/2025/08/17/nx-s1-5505271/three-republican-led-states-to-send-hundreds-of-national-guard-troops-to-washington', 'Governor of Tennessee; announced sending National Guard troops to D.C.'),
      (m_dcguard, 'jeff_landry',      'statement', true, '2025-08-17T00:00:00Z', 'https://www.npr.org/2025/08/17/nx-s1-5505271/three-republican-led-states-to-send-hundreds-of-national-guard-troops-to-washington', 'Governor of Louisiana; announced sending National Guard troops to D.C. in support of the federal effort.'),
      (m_dcguard, 'henry_mcmaster',   'statement', true, '2025-08-19T00:00:00Z', 'https://www.cnn.com/2025/08/19/politics/national-guard-washington-dc-troops', 'Governor of South Carolina; authorized deploying about 200 National Guard troops to D.C. at the Pentagon''s request.'),
      (m_dcguard, 'mike_dewine',      'statement', true, '2025-08-19T00:00:00Z', 'https://www.cnn.com/2025/08/19/politics/national-guard-washington-dc-troops', 'Governor of Ohio; announced sending about 150 Guard military police to D.C. for presence patrols and added security at the Army''s request.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · Federal funding freeze — New York v. Trump (D.R.I. 1:25-cv-00039, Jan 2025)
  --     A 22-state coalition of attorneys general (and Kentucky's governor) challenged
  --     an OMB memo pausing federal grants, arguing it usurped Congress's spending
  --     power and violated the Administrative Procedure Act.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_freeze FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'State challenge to the federal funding freeze (New York v. Trump)' LIMIT 1;
  IF m_freeze IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'New York v. Trump (D.R.I. 1:25-cv-00039)',
       'State challenge to the federal funding freeze (New York v. Trump)',
       'Federal funding freeze (New York v. Trump)',
       'After a January 27, 2025 OMB memo directed federal agencies to pause broad categories of federal financial assistance, a coalition of 22 states filed suit in the U.S. District Court for the District of Rhode Island, arguing the pause overrode Congress''s spending power and violated the Administrative Procedure Act. Kentucky''s governor later joined. Courts blocked the freeze; the First Circuit largely affirmed in 2026.',
       'pending', 'letitia_james',
       'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'New York Attorney General',
       '{"court":"U.S. District Court, D.R.I.","docketNumber":"1:25-cv-00039"}')
    RETURNING id INTO m_freeze;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_freeze, 'gov_services',      100, true,  'yea_supports', 'The paused funds covered grants for education, health care, and public safety; the suit sought to keep those services funded.'),
      (m_freeze, 'gov_balance',        75, false, 'yea_supports', 'A separation-of-powers dispute over whether the executive can pause spending Congress has appropriated.'),
      (m_freeze, 'democracy_balance',  55, false, 'yea_supports', 'Tests checks on unilateral executive action under the Administrative Procedure Act.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_freeze, 'other', 'court', '2025-01-28T00:00:00Z', 'A coalition of 22 states filed suit in the District of Rhode Island challenging the OMB funding-pause memo.', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'New York Attorney General', 10),
      (m_freeze, 'other', 'court', '2025-01-31T00:00:00Z', 'The court issued a temporary restraining order, finding the states likely to succeed on the merits.', 'https://ag.ny.gov/press-release/2025/attorney-general-james-and-multistate-coalition-secure-court-order-blocking', 'New York Attorney General', 20),
      (m_freeze, 'other', 'court', '2026-03-16T00:00:00Z', 'The First Circuit largely affirmed the district court, finding the states likely to succeed on their Administrative Procedure Act claims.', 'https://clearinghouse.net/case/45976/', 'Civil Rights Litigation Clearinghouse', 30);

    -- Coalition attorneys general present in the roster, plus Kentucky's governor.
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_freeze, 'letitia_james',       'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'New York Attorney General; led the 22-state coalition.'),
      (m_freeze, 'rob_bonta',           'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'California Attorney General; co-led the coalition.'),
      (m_freeze, 'kwame_raoul',         'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Illinois Attorney General; co-led the coalition.'),
      (m_freeze, 'andrea_joy_campbell', 'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Massachusetts Attorney General; co-led the coalition.'),
      (m_freeze, 'peter_neronha',       'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Rhode Island Attorney General; co-led the coalition (case filed in Rhode Island).'),
      (m_freeze, 'kris_mayes',          'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Arizona Attorney General; joined the coalition.'),
      (m_freeze, 'phil_weiser',         'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Colorado Attorney General; joined the coalition.'),
      (m_freeze, 'william_tong',        'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Connecticut Attorney General; joined the coalition.'),
      (m_freeze, 'kathy_jennings',      'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Delaware Attorney General; joined the coalition.'),
      (m_freeze, 'anthony_brown',       'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Maryland Attorney General; joined the coalition.'),
      (m_freeze, 'dana_nessel',         'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Michigan Attorney General; joined the coalition.'),
      (m_freeze, 'keith_ellison',       'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Minnesota Attorney General; joined the coalition.'),
      (m_freeze, 'aaron_ford',          'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Nevada Attorney General; joined the coalition.'),
      (m_freeze, 'raul_torrez',         'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'New Mexico Attorney General; joined the coalition.'),
      (m_freeze, 'jeff_jackson',        'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'North Carolina Attorney General; joined the coalition.'),
      (m_freeze, 'dan_rayfield',        'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Oregon Attorney General; joined the coalition.'),
      (m_freeze, 'nick_brown',          'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Washington Attorney General; joined the coalition.'),
      (m_freeze, 'josh_kaul',           'plaintiff', true, '2025-01-28T00:00:00Z', 'https://ag.ny.gov/press-release/2025/attorney-general-james-leads-coalition-suing-stop-trump-administration', 'Wisconsin Attorney General; joined the coalition.'),
      (m_freeze, 'andy_beshear',        'plaintiff', true, '2025-02-01T00:00:00Z', 'https://clearinghouse.net/case/45976/', 'Governor of Kentucky (Democrat); joined the multistate challenge to the funding freeze.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

END $$;
