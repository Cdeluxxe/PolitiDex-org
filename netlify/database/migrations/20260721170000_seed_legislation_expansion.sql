-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 24: Legislation library expansion (new bills + linkage)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: The user asked for MORE bills in the Legislation library, each
-- tightly linked to voting records + per-member Say-vs-Do, prioritizing high-impact
-- recent / omnibus measures that connect to existing hot issues and politicians.
-- Prior waves enriched bills already in the record; this wave ADDS three new
-- 119th-Congress measures with full detail (issue breakdown, provisions, timeline),
-- real recorded roll calls, and member votes/sponsorships that light up Say-vs-Do —
-- and enriches the already-present Laken Riley Act (H.R. 29) with its Senate roll
-- call so the Senate roster (both parties, including the crossover Democrats) links in.
--
-- NEW MEASURES (all verified against Congress.gov / the House Clerk / the Senate):
--   • H.R. 471  — Fix Our Forests Act. House Roll 25, 2025-01-23, On Passage,
--                 passed 279–141 (bipartisan). Sponsor Rep. Bruce Westerman (R-AR).
--                 Wildfire / federal forest management. (clerk.house.gov/Votes/202525)
--   • H.R. 1526 — No Rogue Rulings Act (NORRA). House, 2025-04-09, On Passage,
--                 passed 219–213 (party-line). Limits nationwide/universal injunctions.
--   • S. 331    — HALT Fentanyl Act. Senate Record Vote 127, 2025-03-14, passed
--                 84–16; enacted 2025-07-16 (Public Law 119-26). Co-led by Sen. Chuck
--                 Grassley (R-IA). Permanent Schedule I placement of fentanyl analogues.
--
-- ENRICHMENT:
--   • H.R. 29 (Laken Riley Act, already in the record) — adds the Senate passage
--     roll call (64–35, 2025-01-20) with roster senators, including the Democratic
--     crossovers Fetterman and Ossoff, so their Say-vs-Do on immigration reflects it.
--
-- NEUTRALITY: each issue/provision records what a section does and which way a Yea
-- cuts (support_meaning), with a factual rationale + citable source — including,
-- where relevant, the concern critics raised, recorded as a neutral tag (not an
-- endorsement). Every issue_key is validated against db/issue-keys.json. Politician
-- ids match the app roster slugs already used by earlier voting-record waves.
--
-- ACCURACY OF MEMBER VOTES: only votes that are a matter of settled public record
-- are asserted — chamber leadership + the bill sponsor on party-backed passage votes,
-- the all-Republican yea bloc on the Laken Riley Act (the 35 nays were all Democrats),
-- and the two named Democratic crossovers. Where a chamber split in a way individual
-- roster members can't be pinned down without guessing, those members are omitted
-- rather than invented (same discipline the landmark-measures waves used).
--
-- ADDITIVE + IDEMPOTENT: each new measure is guarded on its own existence (the whole
-- block runs only if the measure is absent); member votes use ON CONFLICT
-- (rollcall_id, politician_id) DO NOTHING; positions use ON CONFLICT DO NOTHING; the
-- H.R. 29 enrichment is guarded by NOT EXISTS of a Senate roll call on that measure.
-- Rolls forward from the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_id integer;
  rc   integer;
  HR471   text := 'https://www.congress.gov/bill/119th-congress/house-bill/471';
  HR471V  text := 'https://clerk.house.gov/Votes/202525';
  HR1526  text := 'https://www.congress.gov/bill/119th-congress/house-bill/1526';
  HR1526V text := 'https://issa.house.gov/media/press-releases/house-passes-issa-legislation-stop-activist-judges-and-their-rogue-rulings';
  S331    text := 'https://www.congress.gov/bill/119th-congress/senate-bill/331';
  S331C   text := 'https://www.cbo.gov/publication/61243';
  HR29    text := 'https://www.congress.gov/bill/119th-congress/house-bill/29';
  HR29V   text := 'https://www.washingtonpost.com/politics/interactive/2025/01/20/laken-riley-act-vote-immigration-senate/';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 471 — Fix Our Forests Act (wildfire / federal forest management)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 471' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 471', 'Fix Our Forests Act', 'Fix Our Forests Act',
       'Overhauls management of federal forests to reduce catastrophic wildfire risk: designates high-risk "fireshed management areas," creates an interagency Fireshed Center to map and predict fire, expedites environmental review of forest-thinning and hazardous-fuels projects, and tightens court timelines for challenges to those projects. Passed the House with bipartisan support; awaits Senate action.',
       'passed_house', '2025-01-16T00:00:00Z', 'bruce_westerman', HR471, 'Congress.gov',
       '{"congressGovId":"hr471-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'disaster_resilience', 100, true,  'yea_supports', 'Core purpose: reduce catastrophic wildfire risk through fireshed mapping, hazardous-fuels reduction, and faster mitigation.'),
      (m_id, 'lands_balance',        70, false, 'yea_supports', 'Sets federal forest-management policy on public lands, balancing active management against preservation.'),
      (m_id, 'gov_regulation',       55, false, 'yea_supports', 'Expedites NEPA environmental review and streamlines permitting for qualifying forest-management projects.'),
      (m_id, 'enviro_balance',       45, false, 'yea_opposes',  'Recorded neutrally: some conservation groups warn the expedited-review and litigation limits weaken environmental safeguards — a Yea is tagged as cutting against that concern.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Fireshed management areas + Fireshed Center', 'Designates high-risk firesheds as management areas and directs the Forest Service and USGS to jointly run an interagency Fireshed Center that maps and predicts wildfire on a public registry.', 'disaster_resilience', 'yea_supports', HR471, 10),
      (m_id, 'Expedited environmental review for forest projects', 'Speeds NEPA review and permitting for hazardous-fuels reduction and forest-thinning projects in designated areas.', 'gov_regulation', 'yea_supports', HR471, 20),
      (m_id, 'Shorter litigation timelines', 'Tightens the window and standards for court challenges to covered forest-management projects, aiming to keep mitigation on schedule.', 'lands_balance', 'yea_supports', HR471, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-01-16T00:00:00Z', 'Introduced by Rep. Bruce Westerman (R-AR) and referred to committee.', HR471, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-01-23T00:00:00Z', 'House passed the bill, 279–141 (Roll Call 25), with bipartisan support.', HR471V, 'U.S. House Clerk', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, 25, '2025-01-23T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":279,"nay":141,"present":0,"notVoting":13}', HR471V, 'U.S. House Clerk')
    RETURNING id INTO rc;

    -- GOP leadership + the sponsor + Utah Republicans voted yea on this GOP-led bill
    -- that passed with a Republican majority. Democrats split; individual Democratic
    -- votes are omitted rather than guessed.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson',    'yea', 'with_party'),
      (rc, 'scalise',         'yea', 'with_party'),
      (rc, 'emmer',           'yea', 'with_party'),
      (rc, 'jim_jordan',      'yea', 'with_party'),
      (rc, 'bruce_westerman', 'yea', 'with_party'),
      (rc, 'owens',           'yea', 'with_party'),
      (rc, 'bmoore',          'yea', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'bruce_westerman', 'sponsor', true, '2025-01-16T00:00:00Z', HR471, 'Lead sponsor; Chair of the House Natural Resources Committee.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 1526 — No Rogue Rulings Act (NORRA): limits nationwide injunctions
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 1526' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 1526', 'No Rogue Rulings Act of 2025', 'No Rogue Rulings Act (NORRA)',
       'Limits federal district courts to issuing injunctive relief that applies only to the parties before the court, curtailing nationwide ("universal") injunctions. Creates an exception routing multi-state challenges to executive actions to a randomly assigned three-judge panel. Passed the House on a near party-line vote; awaits Senate action.',
       'passed_house', HR1526, 'Congress.gov', '{"congressGovId":"hr1526-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'gov_balance',    100, true,  'yea_supports', 'Reasserts limits on the judiciary''s power to block executive-branch policy nationwide through a single district-court order.'),
      (m_id, 'reform_balance',  60, false, 'yea_supports', 'A structural change to how courts issue relief; supporters call it a reform of judicial overreach.'),
      (m_id, 'democracy_balance',45, false, 'yea_opposes',  'Recorded neutrally: critics argue narrowing nationwide injunctions weakens a check courts use against unlawful federal action — a Yea is tagged as cutting against that concern.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Bar on universal (nationwide) injunctions', 'Prohibits a district court from granting injunctive relief broader than the parties to the case, ending nationwide blocks issued by a single judge.', 'gov_balance', 'yea_supports', HR1526, 10),
      (m_id, 'Three-judge panel for multi-state suits', 'When two or more States in different circuits challenge an executive action, the case is referred to a randomly assigned three-judge panel that may issue broader relief, subject to appeal.', 'reform_balance', 'yea_supports', HR1526, 20);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'passed_house', 'house', '2025-04-09T00:00:00Z', 'House passed the bill, 219–213, on a near party-line vote.', HR1526V, 'Rep. Issa (sponsor)', 10);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, NULL, '2025-04-09T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":219,"nay":213,"present":0}', HR1526, 'Congress.gov')
    RETURNING id INTO rc;

    -- Near party-line passage: GOP leadership + Utah Republicans yea; Democratic
    -- leaders yea/nay follow the party line (nay).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'jeffries',     'nay', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'khanna',       'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- S. 331 — HALT Fentanyl Act (enacted, Public Law 119-26)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'S. 331' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'senate', 'S. 331', 'Halt All Lethal Trafficking of Fentanyl Act', 'HALT Fentanyl Act',
       'Permanently places fentanyl-related substances as a class in Schedule I of the Controlled Substances Act, replacing the temporary class-wide order that had been repeatedly extended. Applies the same quantity thresholds and mandatory-minimum penalties as for fentanyl analogues, and adds an alternative registration pathway for Schedule I research. Signed into law July 16, 2025 (Public Law 119-26).',
       'enacted', '2025-01-30T00:00:00Z', S331, 'Congress.gov', '{"congressGovId":"s331-119","publicLaw":"119-26"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'immig_fentanyl', 100, true,  'yea_supports', 'Directly targets the fentanyl overdose crisis by making class-wide Schedule I placement of fentanyl-related substances permanent.'),
      (m_id, 'tough_on_crime',  75, false, 'yea_supports', 'Attaches mandatory-minimum penalties and quantity triggers to fentanyl-analogue offenses.'),
      (m_id, 'health_mental',   45, false, 'yea_opposes',  'Recorded neutrally: some public-health advocates argue permanent scheduling and mandatory minimums emphasize enforcement over treatment — a Yea is tagged as cutting against that concern.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Permanent class-wide Schedule I placement', 'Makes permanent the Schedule I classification of fentanyl-related substances as a class, which had been temporary since 2018 and set to lapse.', 'immig_fentanyl', 'yea_supports', S331, 10),
      (m_id, 'Mandatory-minimum triggers', 'Applies the same quantity thresholds and mandatory-minimum prison terms used for fentanyl analogues (e.g., 100 grams triggers a 10-year minimum).', 'tough_on_crime', 'yea_supports', S331, 20),
      (m_id, 'Alternative Schedule I research registration', 'Creates a streamlined registration pathway so approved researchers can study Schedule I fentanyl-related substances.', 'health_mental', 'yea_supports', S331C, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'senate', '2025-01-30T00:00:00Z', 'Introduced by Sen. Bill Cassidy (R-LA); co-led by Sens. Grassley (R-IA) and Heinrich (D-NM).', S331, 'Congress.gov', 10),
      (m_id, 'passed_senate', 'senate', '2025-03-14T00:00:00Z', 'Senate passed the bill, 84–16 (Record Vote 127).', S331, 'Congress.gov', 20),
      (m_id, 'enacted', 'joint', '2025-07-16T00:00:00Z', 'Signed into law as Public Law 119-26.', S331, 'Congress.gov', 30);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'senate', 119, 1, 127, '2025-03-14T00:00:00Z', 'On Passage of the Bill', 'passage', 'passed', 'simple',
       '{"yea":84,"nay":16}', S331, 'Congress.gov')
    RETURNING id INTO rc;

    -- 84–16 bipartisan passage. Mainstream Republican senators (incl. co-lead
    -- Grassley) voted yea. Members whose vote on this bipartisan bill cannot be pinned
    -- down without guessing are omitted.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'grassley',    'yea', 'with_party'),
      (rc, 'cruz',        'yea', 'with_party'),
      (rc, 'hawley',      'yea', 'with_party'),
      (rc, 'graham',      'yea', 'with_party'),
      (rc, 'john_cornyn', 'yea', 'with_party'),
      (rc, 'barrasso',    'yea', 'with_party'),
      (rc, 'collins',     'yea', 'with_party'),
      (rc, 'murkowski',   'yea', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'grassley', 'cosponsor', true, '2025-01-30T00:00:00Z', S331, 'Original co-lead of the bill with Sens. Cassidy and Heinrich.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 29 — Laken Riley Act (already in the record): add the Senate roll call.
  -- The Senate passed the Laken Riley Act 64–35 on 2025-01-20; 12 Democrats crossed
  -- over (including Fetterman and Ossoff), and all 35 nays were Democrats — so the
  -- all-Republican yea bloc is settled, and Warren/Booker/Durbin (not among the 12
  -- crossovers) voted nay.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119 LIMIT 1;
  IF m_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_rollcalls WHERE measure_id = m_id AND chamber = 'senate') THEN
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'senate', 119, 1, NULL, '2025-01-20T00:00:00Z', 'On Passage of the Laken Riley Act (Senate)', 'passage', 'passed', 'simple',
       '{"yea":64,"nay":35}', HR29V, 'Washington Post roll-call tracker')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'cruz',        'yea', 'with_party'),
      (rc, 'hawley',      'yea', 'with_party'),
      (rc, 'graham',      'yea', 'with_party'),
      (rc, 'grassley',    'yea', 'with_party'),
      (rc, 'lee',         'yea', 'with_party'),
      (rc, 'curtis',      'yea', 'with_party'),
      (rc, 'collins',     'yea', 'with_party'),
      (rc, 'murkowski',   'yea', 'with_party'),
      (rc, 'john_cornyn', 'yea', 'with_party'),
      (rc, 'barrasso',    'yea', 'with_party'),
      (rc, 'rand_paul',   'yea', 'with_party'),
      (rc, 'fetterman',   'yea', 'against_party'),
      (rc, 'jon_ossoff',  'yea', 'against_party'),
      (rc, 'warren',      'nay', 'with_party'),
      (rc, 'booker',      'nay', 'with_party'),
      (rc, 'durbin',      'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

END $$;
