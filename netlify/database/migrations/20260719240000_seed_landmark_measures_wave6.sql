-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 6 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more landmark 119th-Congress measures:
--   (1) the confirmation of ROBERT F. KENNEDY Jr. as Secretary of Health and Human
--       Services — a near party-line 52-48 Senate vote; and
--   (2) the FULL-YEAR CONTINUING RESOLUTION (H.R. 1968) that averted the March 2025
--       shutdown, whose Senate cloture vote is the record's marquee "say-vs-do"
--       moment — Minority Leader Schumer and nine other Democrats/Independents
--       crossed over to let it advance, breaking with most of their caucus.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (official Senate / House record):
--   Kennedy nomination — Senate roll call 52, 2025-02-13, On the Nomination, confirmed
--     52-48. Every Democrat/Independent voted nay; ONE Republican — Mitch McConnell —
--     crossed over to vote nay (recorded here as against-party). Collins and Murkowski
--     voted yea. No absences. (senate.gov vote_119_1_00052)
--   H.R. 1968 (Full-Year CR) — House roll call 70, 2025-03-11, On Passage, 217-213
--     (near party-line; only the leadership is recorded here, the two individual
--     crossovers being unconfirmed). Senate cloture roll call 128, 2025-03-14, invoked
--     62-38: every Republican voted yea EXCEPT Rand Paul (nay, against-party), and TEN
--     Democrats/Independents crossed over to invoke cloture and avert a shutdown —
--     Schumer, Durbin, Cortez Masto, Fetterman, Gillibrand, Hassan, King, Peters,
--     Schatz, and Shaheen (recorded as against-party). Signed into law March 15, 2025.
--     (senate.gov vote_119_1_00128 · clerk.house.gov/Votes/202570)
--
-- Idempotent: guarded on the Kennedy Senate roll-call (52) sentinel, and every member
-- insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) index.
DO $$
DECLARE
  m_rfk       integer;
  m_cr        integer;
  rc_rfk      integer;
  rc_house    integer;
  rc_cloture  integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 52
  ) THEN
    RETURN;
  END IF;

  -- ── (1) Confirmation of RFK Jr. as Secretary of Health and Human Services ────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('nomination', 119, 'senate', 'Kennedy — HHS', 'Nomination of Robert F. Kennedy Jr. to be Secretary of Health and Human Services', 'Kennedy — HHS Secretary',
     'Senate confirmation of Robert F. Kennedy Jr. as Secretary of Health and Human Services, confirmed 52-48 nearly along party lines.',
     'enacted', 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00052.htm', 'U.S. Senate',
     '{"rollCall":"119-1-52"}')
  RETURNING id INTO m_rfk;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_rfk, 'healthcare',   100, true,  'yea_supports', 'Confirmation of the Secretary who runs federal health policy (HHS, CDC, FDA, NIH).'),
    (m_rfk, 'gov_balance',   50, false, 'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s nominee.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_rfk, 'senate', 119, 1, 52, '2025-02-13T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
     '{"yea":52,"nay":48,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00052.htm', 'U.S. Senate')
  RETURNING id INTO rc_rfk;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (party-line; Collins and Murkowski included)
    (rc_rfk, 'thune', 'yea', 'with_party'),            (rc_rfk, 'barrasso', 'yea', 'with_party'),
    (rc_rfk, 'cruz', 'yea', 'with_party'),             (rc_rfk, 'lee', 'yea', 'with_party'),
    (rc_rfk, 'grassley', 'yea', 'with_party'),         (rc_rfk, 'graham', 'yea', 'with_party'),
    (rc_rfk, 'hawley', 'yea', 'with_party'),           (rc_rfk, 'rand_paul', 'yea', 'with_party'),
    (rc_rfk, 'ernst', 'yea', 'with_party'),            (rc_rfk, 'lankford', 'yea', 'with_party'),
    (rc_rfk, 'banks', 'yea', 'with_party'),            (rc_rfk, 'moreno', 'yea', 'with_party'),
    (rc_rfk, 'mullin', 'yea', 'with_party'),           (rc_rfk, 'ricketts', 'yea', 'with_party'),
    (rc_rfk, 'sheehy', 'yea', 'with_party'),           (rc_rfk, 'blackburn', 'yea', 'with_party'),
    (rc_rfk, 'rick_scott', 'yea', 'with_party'),       (rc_rfk, 'hagerty', 'yea', 'with_party'),
    (rc_rfk, 'roger_marshall', 'yea', 'with_party'),   (rc_rfk, 'daines', 'yea', 'with_party'),
    (rc_rfk, 'ron_johnson', 'yea', 'with_party'),      (rc_rfk, 'todd_young', 'yea', 'with_party'),
    (rc_rfk, 'john_cornyn', 'yea', 'with_party'),      (rc_rfk, 'mike_rounds', 'yea', 'with_party'),
    (rc_rfk, 'kevin_cramer', 'yea', 'with_party'),     (rc_rfk, 'hoeven', 'yea', 'with_party'),
    (rc_rfk, 'britt', 'yea', 'with_party'),            (rc_rfk, 'tommy_tuberville', 'yea', 'with_party'),
    (rc_rfk, 'dan_sullivan', 'yea', 'with_party'),     (rc_rfk, 'deb_fischer', 'yea', 'with_party'),
    (rc_rfk, 'jim_justice', 'yea', 'with_party'),      (rc_rfk, 'lummis', 'yea', 'with_party'),
    (rc_rfk, 'kennedy_john', 'yea', 'with_party'),     (rc_rfk, 'ashley_moody', 'yea', 'with_party'),
    (rc_rfk, 'schmitt', 'yea', 'with_party'),          (rc_rfk, 'ted_budd', 'yea', 'with_party'),
    (rc_rfk, 'mccormick', 'yea', 'with_party'),        (rc_rfk, 'cotton', 'yea', 'with_party'),
    (rc_rfk, 'collins', 'yea', 'with_party'),          (rc_rfk, 'murkowski', 'yea', 'with_party'),
    -- Republican — nay (broke with party)
    (rc_rfk, 'mcconnell', 'nay', 'against_party'),
    -- Democrats / Independents — nay (party-line)
    (rc_rfk, 'schumer', 'nay', 'with_party'),          (rc_rfk, 'durbin', 'nay', 'with_party'),
    (rc_rfk, 'warren', 'nay', 'with_party'),           (rc_rfk, 'wyden', 'nay', 'with_party'),
    (rc_rfk, 'klobuchar', 'nay', 'with_party'),        (rc_rfk, 'chris_murphy', 'nay', 'with_party'),
    (rc_rfk, 'kaine', 'nay', 'with_party'),            (rc_rfk, 'coons', 'nay', 'with_party'),
    (rc_rfk, 'bennet', 'nay', 'with_party'),           (rc_rfk, 'welch', 'nay', 'with_party'),
    (rc_rfk, 'tina_smith', 'nay', 'with_party'),       (rc_rfk, 'hirono', 'nay', 'with_party'),
    (rc_rfk, 'merkley', 'nay', 'with_party'),          (rc_rfk, 'markey', 'nay', 'with_party'),
    (rc_rfk, 'van_hollen', 'nay', 'with_party'),       (rc_rfk, 'duckworth', 'nay', 'with_party'),
    (rc_rfk, 'tammy_baldwin', 'nay', 'with_party'),    (rc_rfk, 'blunt_rochester', 'nay', 'with_party'),
    (rc_rfk, 'angus_king', 'nay', 'with_party'),       (rc_rfk, 'schatz', 'nay', 'with_party'),
    (rc_rfk, 'blumenthal', 'nay', 'with_party'),       (rc_rfk, 'shaheen', 'nay', 'with_party'),
    (rc_rfk, 'peters', 'nay', 'with_party'),           (rc_rfk, 'booker', 'nay', 'with_party'),
    (rc_rfk, 'alsobrooks', 'nay', 'with_party'),       (rc_rfk, 'gallego', 'nay', 'with_party'),
    (rc_rfk, 'mark_kelly', 'nay', 'with_party'),       (rc_rfk, 'rosen', 'nay', 'with_party'),
    (rc_rfk, 'cortez_masto', 'nay', 'with_party'),     (rc_rfk, 'slotkin', 'nay', 'with_party'),
    (rc_rfk, 'maggie_hassan', 'nay', 'with_party'),    (rc_rfk, 'warnock', 'nay', 'with_party'),
    (rc_rfk, 'jon_ossoff', 'nay', 'with_party'),       (rc_rfk, 'padilla', 'nay', 'with_party'),
    (rc_rfk, 'schiff', 'nay', 'with_party'),           (rc_rfk, 'gillibrand', 'nay', 'with_party'),
    (rc_rfk, 'fetterman', 'nay', 'with_party'),        (rc_rfk, 'heinrich', 'nay', 'with_party'),
    (rc_rfk, 'hickenlooper', 'nay', 'with_party'),     (rc_rfk, 'andy_kim', 'nay', 'with_party'),
    (rc_rfk, 'lujan', 'nay', 'with_party'),            (rc_rfk, 'warner', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── (2) Full-Year Continuing Resolution (H.R. 1968) ──────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 1968', 'Full-Year Continuing Appropriations and Extensions Act, 2025', 'FY2025 Full-Year CR',
     'Funded the federal government through the end of FY2025, trimming some domestic spending while boosting defense and immigration enforcement; averted a shutdown. Signed into law March 15, 2025.',
     'enacted', 'https://www.congress.gov/bill/119th-congress/house-bill/1968', 'Congress.gov',
     '{"congressGovId":"hr1968-119"}')
  RETURNING id INTO m_cr;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_cr, 'cut_spending', 100, true,  'yea_supports', 'A yea funds the government at Republican-set levels, trimming some domestic programs.'),
    (m_cr, 'gov_balance',   60, false, 'yea_supports', 'A yea (including on cloture) averts a government shutdown.');

  -- House passage (leadership only; the two individual crossovers are unconfirmed)
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_cr, 'house', 119, 1, 70, '2025-03-11T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":217,"nay":213,"present":0,"notVoting":2}', 'https://clerk.house.gov/Votes/202570', 'U.S. House Clerk')
  RETURNING id INTO rc_house;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_house, 'mike_johnson', 'yea', 'with_party'),
    (rc_house, 'scalise',      'yea', 'with_party'),
    (rc_house, 'emmer',        'yea', 'with_party'),
    (rc_house, 'jeffries',     'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- Senate cloture (the marquee crossover vote)
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_cr, 'senate', 119, 1, 128, '2025-03-14T00:00:00Z', 'On the Cloture Motion', 'cloture', 'agreed_to', 'three_fifths',
     '{"yea":62,"nay":38,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00128.htm', 'U.S. Senate')
  RETURNING id INTO rc_cloture;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (party-line)
    (rc_cloture, 'thune', 'yea', 'with_party'),            (rc_cloture, 'barrasso', 'yea', 'with_party'),
    (rc_cloture, 'cruz', 'yea', 'with_party'),             (rc_cloture, 'lee', 'yea', 'with_party'),
    (rc_cloture, 'grassley', 'yea', 'with_party'),         (rc_cloture, 'graham', 'yea', 'with_party'),
    (rc_cloture, 'hawley', 'yea', 'with_party'),           (rc_cloture, 'mcconnell', 'yea', 'with_party'),
    (rc_cloture, 'ernst', 'yea', 'with_party'),            (rc_cloture, 'lankford', 'yea', 'with_party'),
    (rc_cloture, 'banks', 'yea', 'with_party'),            (rc_cloture, 'moreno', 'yea', 'with_party'),
    (rc_cloture, 'mullin', 'yea', 'with_party'),           (rc_cloture, 'ricketts', 'yea', 'with_party'),
    (rc_cloture, 'sheehy', 'yea', 'with_party'),           (rc_cloture, 'blackburn', 'yea', 'with_party'),
    (rc_cloture, 'rick_scott', 'yea', 'with_party'),       (rc_cloture, 'hagerty', 'yea', 'with_party'),
    (rc_cloture, 'roger_marshall', 'yea', 'with_party'),   (rc_cloture, 'daines', 'yea', 'with_party'),
    (rc_cloture, 'ron_johnson', 'yea', 'with_party'),      (rc_cloture, 'todd_young', 'yea', 'with_party'),
    (rc_cloture, 'john_cornyn', 'yea', 'with_party'),      (rc_cloture, 'mike_rounds', 'yea', 'with_party'),
    (rc_cloture, 'kevin_cramer', 'yea', 'with_party'),     (rc_cloture, 'hoeven', 'yea', 'with_party'),
    (rc_cloture, 'britt', 'yea', 'with_party'),            (rc_cloture, 'tommy_tuberville', 'yea', 'with_party'),
    (rc_cloture, 'dan_sullivan', 'yea', 'with_party'),     (rc_cloture, 'deb_fischer', 'yea', 'with_party'),
    (rc_cloture, 'jim_justice', 'yea', 'with_party'),      (rc_cloture, 'lummis', 'yea', 'with_party'),
    (rc_cloture, 'kennedy_john', 'yea', 'with_party'),     (rc_cloture, 'ashley_moody', 'yea', 'with_party'),
    (rc_cloture, 'schmitt', 'yea', 'with_party'),          (rc_cloture, 'ted_budd', 'yea', 'with_party'),
    (rc_cloture, 'mccormick', 'yea', 'with_party'),        (rc_cloture, 'cotton', 'yea', 'with_party'),
    (rc_cloture, 'collins', 'yea', 'with_party'),          (rc_cloture, 'murkowski', 'yea', 'with_party'),
    -- Republican — nay (broke with party)
    (rc_cloture, 'rand_paul', 'nay', 'against_party'),
    -- Democrats / Independents — yea (crossed over to advance the CR and avert a shutdown)
    (rc_cloture, 'schumer', 'yea', 'against_party'),       (rc_cloture, 'durbin', 'yea', 'against_party'),
    (rc_cloture, 'cortez_masto', 'yea', 'against_party'),  (rc_cloture, 'fetterman', 'yea', 'against_party'),
    (rc_cloture, 'gillibrand', 'yea', 'against_party'),    (rc_cloture, 'maggie_hassan', 'yea', 'against_party'),
    (rc_cloture, 'angus_king', 'yea', 'against_party'),    (rc_cloture, 'peters', 'yea', 'against_party'),
    (rc_cloture, 'schatz', 'yea', 'against_party'),        (rc_cloture, 'shaheen', 'yea', 'against_party'),
    -- Democrats — nay (party-line; opposed advancing the bill)
    (rc_cloture, 'warren', 'nay', 'with_party'),           (rc_cloture, 'wyden', 'nay', 'with_party'),
    (rc_cloture, 'klobuchar', 'nay', 'with_party'),        (rc_cloture, 'chris_murphy', 'nay', 'with_party'),
    (rc_cloture, 'kaine', 'nay', 'with_party'),            (rc_cloture, 'coons', 'nay', 'with_party'),
    (rc_cloture, 'bennet', 'nay', 'with_party'),           (rc_cloture, 'welch', 'nay', 'with_party'),
    (rc_cloture, 'tina_smith', 'nay', 'with_party'),       (rc_cloture, 'hirono', 'nay', 'with_party'),
    (rc_cloture, 'merkley', 'nay', 'with_party'),          (rc_cloture, 'markey', 'nay', 'with_party'),
    (rc_cloture, 'van_hollen', 'nay', 'with_party'),       (rc_cloture, 'duckworth', 'nay', 'with_party'),
    (rc_cloture, 'tammy_baldwin', 'nay', 'with_party'),    (rc_cloture, 'blunt_rochester', 'nay', 'with_party'),
    (rc_cloture, 'blumenthal', 'nay', 'with_party'),       (rc_cloture, 'booker', 'nay', 'with_party'),
    (rc_cloture, 'alsobrooks', 'nay', 'with_party'),       (rc_cloture, 'gallego', 'nay', 'with_party'),
    (rc_cloture, 'mark_kelly', 'nay', 'with_party'),       (rc_cloture, 'rosen', 'nay', 'with_party'),
    (rc_cloture, 'slotkin', 'nay', 'with_party'),          (rc_cloture, 'warnock', 'nay', 'with_party'),
    (rc_cloture, 'jon_ossoff', 'nay', 'with_party'),       (rc_cloture, 'padilla', 'nay', 'with_party'),
    (rc_cloture, 'schiff', 'nay', 'with_party'),           (rc_cloture, 'heinrich', 'nay', 'with_party'),
    (rc_cloture, 'hickenlooper', 'nay', 'with_party'),     (rc_cloture, 'andy_kim', 'nay', 'with_party'),
    (rc_cloture, 'lujan', 'nay', 'with_party'),            (rc_cloture, 'warner', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
