-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 18: State attorneys general in the courts (litigation layer)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Until now the Voting Record held only federal bills, resolutions
-- and nominations — every entry keyed to members of Congress. Yet PolitiDex already
-- profiles ~40 state attorneys general (both parties) with stated positions, and the
-- schema was built from day one to carry courts too (measure_type='litigation',
-- chamber='court', vr_positions.action_type IN ('plaintiff','amicus', …)). This wave
-- lights up that dormant path: it records four major, well-documented multistate
-- cases and connects each participating AG — by the SAME roster slug their profile
-- and stances already use — so their courtroom actions line up with their words in
-- Say-vs-Do, and each case surfaces under the Spotlights/issues it shares a key with.
--
-- BALANCE / NEUTRALITY: two Democratic-led suits, one Republican-led amicus brief,
-- and one bipartisan suit. Each measure records WHAT was filed and WHO joined, with a
-- dated, sourced timeline — never a verdict or an opinion. Status is kept at the
-- neutral 'pending' (the status vocabulary is legislative; the timeline carries the
-- actual court outcomes). Every politician_id below is verified against the shipped
-- roster; every issue_key against db/issue-keys.json; every source is a canonical
-- official (state DOJ/AG office) or major-outlet URL.
--
-- ADDITIVE + IDEMPOTENT: each measure is inserted only when absent (guarded by its
-- case title); issues/actions are guarded by NOT EXISTS; positions use ON CONFLICT
-- DO NOTHING. Safe to re-run. Rolls forward from the applied migrations; edits none.

DO $$
DECLARE
  m_birthright integer;
  m_tariffs    integer;
  m_ncvote     integer;
  m_meta       integer;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · Birthright-citizenship executive order — Democratic-AG coalition (Jan 2025)
  --     A coalition of Democratic state AGs sued to block the Jan. 2025 executive
  --     order narrowing birthright citizenship, arguing it conflicts with the 14th
  --     Amendment. Filed Jan. 2025; the dispute reached the U.S. Supreme Court.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_birthright FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'State challenge to the birthright-citizenship executive order' LIMIT 1;
  IF m_birthright IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'State of Washington v. Trump',
       'State challenge to the birthright-citizenship executive order',
       'Birthright citizenship (state challenge)',
       'A coalition of Democratic state attorneys general sued to block the January 2025 executive order that sought to deny automatic citizenship to some U.S.-born children, arguing it conflicts with the Fourteenth Amendment''s Citizenship Clause and federal law. Filed in early 2025; the dispute reached the U.S. Supreme Court.',
       'pending', 'nick_brown',
       'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'CBS News',
       '{"court":"U.S. District Court / U.S. Supreme Court"}')
    RETURNING id INTO m_birthright;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_birthright, 'democracy_balance', 100, true,  'yea_supports', 'The suit asks the courts to enforce constitutional limits on executive action over citizenship — a separation-of-powers question.'),
      (m_birthright, 'immig_balance',      70, false, 'yea_supports', 'The case concerns who is recognized as a U.S. citizen at birth; the coalition seeks to preserve the long-standing reading of the Fourteenth Amendment.'),
      (m_birthright, 'gov_balance',        50, false, 'yea_supports', 'Tests the scope of an executive order against existing constitutional and statutory law.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_birthright, 'other', 'court', '2025-01-21T00:00:00Z', 'A coalition of Democratic-led states filed suit challenging the executive order as unconstitutional under the Fourteenth Amendment.', 'https://www.npr.org/2025/01/21/g-s1-44023/trump-birthright-citizenship-immigration-order-14th-amendment', 'NPR', 10),
      (m_birthright, 'other', 'court', '2025-01-23T00:00:00Z', 'A federal judge in Seattle granted a temporary restraining order pausing the policy while briefing continued.', 'https://www.cnn.com/2025/01/23/politics/birthright-citizenship-lawsuit-hearing-seattle/index.html', 'CNN', 20),
      (m_birthright, 'other', 'court', '2026-01-01T00:00:00Z', 'The states urged the U.S. Supreme Court to reject the change to birthright citizenship as the litigation advanced.', 'https://ag.ny.gov/press-release/2026/attorney-general-james-urges-us-supreme-court-reject-unprecedented-attack', 'N.Y. Attorney General', 30);

    -- Participating Democratic AGs (roster slugs). action_type='plaintiff'; supports=true
    -- (each advanced the suit). Source is the coalition's own account of the filing.
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_birthright, 'nick_brown',           'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Washington AG; helped lead the state coalition and obtained the initial court order pausing the policy.'),
      (m_birthright, 'rob_bonta',            'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'California AG; joined the multistate challenge to the executive order.'),
      (m_birthright, 'letitia_james',        'plaintiff', true, '2025-01-21T00:00:00Z', 'https://ag.ny.gov/press-release/2026/attorney-general-james-urges-us-supreme-court-reject-unprecedented-attack', 'New York AG; joined the challenge and urged the Supreme Court to reject the change.'),
      (m_birthright, 'kwame_raoul',          'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Illinois AG; joined the multistate challenge.'),
      (m_birthright, 'keith_ellison',        'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Minnesota AG; joined the multistate challenge.'),
      (m_birthright, 'andrea_joy_campbell',  'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Massachusetts AG; part of the coalition that filed in Massachusetts.'),
      (m_birthright, 'kris_mayes',           'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Arizona AG; joined the multistate challenge.'),
      (m_birthright, 'dan_rayfield',         'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Oregon AG; joined the multistate challenge.'),
      (m_birthright, 'raul_torrez',          'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'New Mexico AG; joined the multistate challenge.'),
      (m_birthright, 'william_tong',         'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Connecticut AG; joined the multistate challenge.'),
      (m_birthright, 'phil_weiser',          'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Colorado AG; joined the multistate challenge.'),
      (m_birthright, 'anthony_brown',        'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Maryland AG; joined the multistate challenge.'),
      (m_birthright, 'aaron_ford',           'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Nevada AG; joined the multistate challenge.'),
      (m_birthright, 'kathy_jennings',       'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Delaware AG; joined the multistate challenge.'),
      (m_birthright, 'peter_neronha',        'plaintiff', true, '2025-01-21T00:00:00Z', 'https://www.cbsnews.com/news/trump-birthright-citizenship-suit-states/', 'Rhode Island AG; joined the multistate challenge.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · IEEPA tariffs — Oregon-led multistate suit (Oregon v. Trump, CIT, Apr 2025)
  --     A twelve-state coalition led by Oregon challenged tariffs imposed under the
  --     International Emergency Economic Powers Act, arguing IEEPA does not delegate
  --     Congress's tariff power. This connects directly to PolitiDex's tariff issue
  --     coverage. The Supreme Court ruled on the IEEPA question on Feb. 20, 2026.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_tariffs FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'State challenge to IEEPA tariffs (Oregon v. Trump)' LIMIT 1;
  IF m_tariffs IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Oregon v. Trump (1:25-cv-00077)',
       'State challenge to IEEPA tariffs (Oregon v. Trump)',
       'IEEPA tariffs (state challenge)',
       'A coalition of twelve states led by Oregon sued in the U.S. Court of International Trade in April 2025, arguing that the International Emergency Economic Powers Act (IEEPA) does not give the President authority to impose broad tariffs — a power the Constitution assigns to Congress. The case advanced through the trial court and Federal Circuit to the U.S. Supreme Court.',
       'pending', 'dan_rayfield',
       'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Oregon Department of Justice',
       '{"docketNumber":"1:25-cv-00077","court":"U.S. Court of International Trade"}')
    RETURNING id INTO m_tariffs;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_tariffs, 'tariffs_authority', 100, true,  'yea_supports', 'The core question is legal authority: whether IEEPA lets the President set tariffs, or whether that power rests with Congress. The coalition argues it rests with Congress.'),
      (m_tariffs, 'econ_trade',         70, false, 'yea_supports', 'The tariffs at issue covered a broad range of imports, making the case central to U.S. trade policy.'),
      (m_tariffs, 'cost_living',        55, false, 'yea_supports', 'The states argued the tariffs raised prices for consumers and businesses; cost-of-living impact was a central claim.'),
      (m_tariffs, 'democracy_balance',  45, false, 'yea_supports', 'A separation-of-powers dispute over how far emergency-powers statutes let the executive act without Congress.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_tariffs, 'other', 'court', '2025-04-23T00:00:00Z', 'Oregon led a twelve-state coalition in filing suit in the U.S. Court of International Trade challenging the IEEPA tariffs.', 'https://www.doj.state.or.us/media-home/news-media-releases/ag-rayfield-leads-multistate-lawsuit-against-trump-over-new-illegal-tariffs/', 'Oregon Department of Justice', 10),
      (m_tariffs, 'other', 'court', '2025-08-29T00:00:00Z', 'The U.S. Court of Appeals for the Federal Circuit affirmed the trial court, concluding IEEPA did not authorize the tariffs.', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Oregon Department of Justice', 20),
      (m_tariffs, 'other', 'court', '2026-02-20T00:00:00Z', 'The U.S. Supreme Court ruled on the IEEPA-tariff question, holding the statute did not authorize the tariffs at issue.', 'https://www.doj.state.or.us/media-home/news-media-releases/oregon-leads-u-s-supreme-court-showdown-over-trumps-unlawful-tariffs/', 'Oregon Department of Justice', 30);

    -- The confirmed twelve-state CIT coalition members present in the roster. (California
    -- litigated tariffs in a separate case and is not listed on this docket.)
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_tariffs, 'dan_rayfield',   'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/media-home/news-media-releases/ag-rayfield-leads-multistate-lawsuit-against-trump-over-new-illegal-tariffs/', 'Oregon AG; led the twelve-state coalition challenging the IEEPA tariffs.'),
      (m_tariffs, 'kris_mayes',     'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Arizona AG; member of the coalition.'),
      (m_tariffs, 'phil_weiser',    'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Colorado AG; member of the coalition.'),
      (m_tariffs, 'william_tong',   'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Connecticut AG; member of the coalition.'),
      (m_tariffs, 'kathy_jennings', 'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Delaware AG; member of the coalition.'),
      (m_tariffs, 'kwame_raoul',    'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Illinois AG; member of the coalition.'),
      (m_tariffs, 'keith_ellison',  'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Minnesota AG; member of the coalition.'),
      (m_tariffs, 'aaron_ford',     'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'Nevada AG; member of the coalition.'),
      (m_tariffs, 'raul_torrez',    'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'New Mexico AG; member of the coalition.'),
      (m_tariffs, 'letitia_james',  'plaintiff', true, '2025-04-23T00:00:00Z', 'https://www.doj.state.or.us/oregon-department-of-justice/federal-oversight/federal-litigation-tracker/tariffs-oregon-v-trump-u-s-court-of-international-trade-125-cv-00077/', 'New York AG; member of the coalition.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · Noncitizen-voting amicus — Kansas-led Republican-AG coalition (Apr 2026)
  --     A 25-state coalition led by Kansas filed an amicus brief urging the Supreme
  --     Court to uphold Arizona's proof-of-citizenship voter-registration laws.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_ncvote FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'State amicus brief defending proof-of-citizenship voter laws' LIMIT 1;
  IF m_ncvote IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Kansas-led amicus (Arizona election-law cases)',
       'State amicus brief defending proof-of-citizenship voter laws',
       'Proof-of-citizenship voting (state amicus)',
       'A 25-state coalition led by Kansas filed an amicus brief in April 2026 urging the U.S. Supreme Court to uphold Arizona laws requiring documentary proof of citizenship for voter registration. The brief supports the states'' authority to set such requirements.',
       'pending', 'kris_kobach',
       'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Georgia Office of the Attorney General',
       '{"court":"U.S. Supreme Court"}')
    RETURNING id INTO m_ncvote;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_ncvote, 'election_integrity', 100, true,  'yea_supports', 'The brief defends state proof-of-citizenship requirements as an election-integrity measure.'),
      (m_ncvote, 'voter_id',            75, false, 'yea_supports', 'Proof-of-citizenship at registration is a documentary-requirement question adjacent to voter-ID policy.'),
      (m_ncvote, 'immig_balance',       40, false, 'yea_supports', 'The dispute concerns preventing noncitizen registration, an immigration-adjacent angle on voting rules.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_ncvote, 'other', 'court', '2026-04-07T00:00:00Z', 'A 25-state coalition led by Kansas filed an amicus brief urging the Supreme Court to uphold Arizona''s proof-of-citizenship registration laws.', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Georgia Office of the Attorney General', 10);

    -- Participating Republican AGs present in the roster. action_type='amicus'.
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_ncvote, 'kris_kobach',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Kansas AG; led the 25-state amicus brief.'),
      (m_ncvote, 'chris_carr',         'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Georgia AG; joined the Kansas-led amicus brief.'),
      (m_ncvote, 'steve_marshall',     'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Alabama AG; joined the coalition brief.'),
      (m_ncvote, 'tim_griffin',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Arkansas AG; joined the coalition brief.'),
      (m_ncvote, 'james_uthmeier',     'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Florida AG; joined the coalition brief.'),
      (m_ncvote, 'raul_labrador',      'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Idaho AG; joined the coalition brief.'),
      (m_ncvote, 'todd_rokita',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Indiana AG; joined the coalition brief.'),
      (m_ncvote, 'brenna_bird',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Iowa AG; joined the coalition brief.'),
      (m_ncvote, 'russell_coleman',    'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Kentucky AG; joined the coalition brief.'),
      (m_ncvote, 'liz_murrill',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Louisiana AG; joined the coalition brief.'),
      (m_ncvote, 'lynn_fitch',         'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Mississippi AG; joined the coalition brief.'),
      (m_ncvote, 'austin_knudsen',     'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Montana AG; joined the coalition brief.'),
      (m_ncvote, 'mike_hilgers',       'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Nebraska AG; joined the coalition brief.'),
      (m_ncvote, 'john_formella',      'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'New Hampshire AG; joined the coalition brief.'),
      (m_ncvote, 'drew_wrigley',       'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'North Dakota AG; joined the coalition brief.'),
      (m_ncvote, 'dave_yost',          'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Ohio AG; joined the coalition brief.'),
      (m_ncvote, 'gentner_drummond',   'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Oklahoma AG; joined the coalition brief.'),
      (m_ncvote, 'alan_wilson',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'South Carolina AG; joined the coalition brief.'),
      (m_ncvote, 'jonathan_skrmetti',  'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'Tennessee AG; joined the coalition brief.'),
      (m_ncvote, 'jb_mccuskey',        'amicus', true, '2026-04-07T00:00:00Z', 'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting', 'West Virginia AG; joined the coalition brief.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · Meta youth-safety suit — bipartisan AG coalition (Oct 2023)
  --     42 attorneys general from both parties sued Meta over features they allege
  --     harm young users. Included because it is a rare, clearly bipartisan action —
  --     useful for showing agreement across the aisle — and connects tech/privacy.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_meta FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'Bipartisan state suit against Meta over youth safety' LIMIT 1;
  IF m_meta IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Meta youth-safety litigation (multistate)',
       'Bipartisan state suit against Meta over youth safety',
       'Meta youth safety (bipartisan state suit)',
       'A bipartisan coalition of 42 state attorneys general took action against Meta in October 2023, alleging that features on Instagram and Facebook were designed to be addictive to young users and that the company misrepresented their safety. A federal suit was filed in the Northern District of California, with additional state-court complaints.',
       'pending', 'phil_weiser',
       'https://coag.gov/press-releases/bipartisan-coalition-of-attorneys-general-file-lawsuits-against-meta-for-harming-youth-mental-health-through-its-social-media-platforms/', 'Colorado Attorney General',
       '{"court":"U.S. District Court, N.D. Cal."}')
    RETURNING id INTO m_meta;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_meta, 'tech_balance',      100, true,  'yea_supports', 'A consumer-protection action seeking guardrails on social-media product design.'),
      (m_meta, 'privacy_rights',     70, false, 'yea_supports', 'The federal complaint alleges collection of data on children under 13 in violation of federal privacy law (COPPA).'),
      (m_meta, 'health_mental',      60, false, 'yea_supports', 'The AGs tie the platform''s design to the youth mental-health crisis.'),
      (m_meta, 'econ_corp_account',  50, false, 'yea_supports', 'A corporate-accountability suit seeking penalties and changes to company practices.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_meta, 'other', 'court', '2023-10-24T00:00:00Z', 'A bipartisan coalition of 42 attorneys general filed federal and state actions against Meta over youth-safety and privacy claims; the federal suit was filed in the Northern District of California.', 'https://coag.gov/press-releases/bipartisan-coalition-of-attorneys-general-file-lawsuits-against-meta-for-harming-youth-mental-health-through-its-social-media-platforms/', 'Colorado Attorney General', 10);

    -- Confirmed co-leads and named filers present in the roster (a bipartisan set).
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_meta, 'phil_weiser',         'plaintiff', true, '2023-10-24T00:00:00Z', 'https://coag.gov/press-releases/bipartisan-coalition-of-attorneys-general-file-lawsuits-against-meta-for-harming-youth-mental-health-through-its-social-media-platforms/', 'Colorado AG (Democrat); co-led the bipartisan investigation and federal suit.'),
      (m_meta, 'jonathan_skrmetti',   'plaintiff', true, '2023-10-24T00:00:00Z', 'https://coag.gov/press-releases/bipartisan-coalition-of-attorneys-general-file-lawsuits-against-meta-for-harming-youth-mental-health-through-its-social-media-platforms/', 'Tennessee AG (Republican); co-led the bipartisan investigation.'),
      (m_meta, 'rob_bonta',           'plaintiff', true, '2023-10-24T00:00:00Z', 'https://oag.ca.gov/news/press-releases/attorney-general-bonta-files-lawsuit-against-meta-over-harms-youth-mental-health', 'California AG (Democrat); co-led and filed against Meta.'),
      (m_meta, 'letitia_james',       'plaintiff', true, '2023-10-24T00:00:00Z', 'https://ag.ny.gov/press-release/2023/attorney-general-james-and-multistate-coalition-sue-meta-harming-youth', 'New York AG (Democrat); part of the multistate coalition.'),
      (m_meta, 'andrea_joy_campbell', 'plaintiff', true, '2023-10-24T00:00:00Z', 'https://www.mass.gov/news/ag-campbell-files-lawsuit-against-meta-instagram-for-unfair-and-deceptive-practices-that-harm-young-people', 'Massachusetts AG (Democrat); filed a state-court complaint.'),
      (m_meta, 'keith_ellison',       'plaintiff', true, '2023-10-24T00:00:00Z', 'https://www.ag.state.mn.us/Office/Communications/2023/10/24_Meta.asp', 'Minnesota AG (Democrat); part of the multistate coalition.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

END $$;
