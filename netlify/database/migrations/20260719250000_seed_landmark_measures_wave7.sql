-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 7 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more high-profile 119th-Congress Senate confirmation votes with OPPOSITE
-- crossover patterns, so the record shows the advice-and-consent dynamic from both
-- directions:
--   (1) KASH PATEL — Director of the FBI — where two Republicans crossed over to
--       vote no; and
--   (2) PAM BONDI — Attorney General — where one Democrat crossed over to vote yes.
-- Together with the Hegseth, Kennedy, and (earlier) leadership votes already in the
-- record, this rounds out the roster's confirmation history for the Justice/FBI
-- leadership.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (official Senate record):
--   Patel nomination — Senate roll call 61, 2025-02-20, On the Nomination, confirmed
--     51-49. Every Democrat/Independent voted nay; TWO Republicans — Susan Collins
--     and Lisa Murkowski — crossed over to vote nay (recorded here as against-party).
--     Every other Republican, including Mitch McConnell, voted yea. No absences.
--     (senate.gov vote_119_1_00061)
--   Bondi nomination — Senate roll call 33, 2025-02-04, On the Nomination, confirmed
--     54-46. Every Republican voted yea; ONE Democrat — John Fetterman — crossed over
--     to vote yea (recorded here as against-party). No absences.
--     (senate.gov vote_119_1_00033)
--
-- Idempotent: guarded on the Patel Senate roll-call (61) sentinel, and every member
-- insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) index.
DO $$
DECLARE
  m_patel   integer;
  m_bondi   integer;
  rc_patel  integer;
  rc_bondi  integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 61
  ) THEN
    RETURN;
  END IF;

  -- ── (1) Confirmation of Kash Patel as Director of the FBI ────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('nomination', 119, 'senate', 'Patel — FBI', 'Nomination of Kash Patel to be Director of the Federal Bureau of Investigation', 'Patel — FBI Director',
     'Senate confirmation of Kash Patel as FBI Director, confirmed 51-49 — an unusually close vote for the post, with two Republicans opposed.',
     'enacted', 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00061.htm', 'U.S. Senate',
     '{"rollCall":"119-1-61"}')
  RETURNING id INTO m_patel;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_patel, 'gov_balance',     100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s FBI director.'),
    (m_patel, 'tough_on_crime',   60, false, 'yea_supports', 'Leadership of the nation''s top federal law-enforcement agency.'),
    (m_patel, 'gov_transparency', 50, false, 'yea_opposes',  'Opponents, including the two Republican nay votes, warned confirming Patel risked politicizing the FBI.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_patel, 'senate', 119, 1, 61, '2025-02-20T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
     '{"yea":51,"nay":49,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00061.htm', 'U.S. Senate')
  RETURNING id INTO rc_patel;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (party-line; McConnell voted yea here)
    (rc_patel, 'thune', 'yea', 'with_party'),            (rc_patel, 'barrasso', 'yea', 'with_party'),
    (rc_patel, 'cruz', 'yea', 'with_party'),             (rc_patel, 'lee', 'yea', 'with_party'),
    (rc_patel, 'grassley', 'yea', 'with_party'),         (rc_patel, 'graham', 'yea', 'with_party'),
    (rc_patel, 'hawley', 'yea', 'with_party'),           (rc_patel, 'rand_paul', 'yea', 'with_party'),
    (rc_patel, 'mcconnell', 'yea', 'with_party'),        (rc_patel, 'ernst', 'yea', 'with_party'),
    (rc_patel, 'lankford', 'yea', 'with_party'),         (rc_patel, 'banks', 'yea', 'with_party'),
    (rc_patel, 'moreno', 'yea', 'with_party'),           (rc_patel, 'mullin', 'yea', 'with_party'),
    (rc_patel, 'ricketts', 'yea', 'with_party'),         (rc_patel, 'sheehy', 'yea', 'with_party'),
    (rc_patel, 'blackburn', 'yea', 'with_party'),        (rc_patel, 'rick_scott', 'yea', 'with_party'),
    (rc_patel, 'hagerty', 'yea', 'with_party'),          (rc_patel, 'roger_marshall', 'yea', 'with_party'),
    (rc_patel, 'daines', 'yea', 'with_party'),           (rc_patel, 'ron_johnson', 'yea', 'with_party'),
    (rc_patel, 'todd_young', 'yea', 'with_party'),       (rc_patel, 'john_cornyn', 'yea', 'with_party'),
    (rc_patel, 'mike_rounds', 'yea', 'with_party'),      (rc_patel, 'kevin_cramer', 'yea', 'with_party'),
    (rc_patel, 'hoeven', 'yea', 'with_party'),           (rc_patel, 'britt', 'yea', 'with_party'),
    (rc_patel, 'tommy_tuberville', 'yea', 'with_party'), (rc_patel, 'dan_sullivan', 'yea', 'with_party'),
    (rc_patel, 'deb_fischer', 'yea', 'with_party'),      (rc_patel, 'jim_justice', 'yea', 'with_party'),
    (rc_patel, 'lummis', 'yea', 'with_party'),           (rc_patel, 'kennedy_john', 'yea', 'with_party'),
    (rc_patel, 'ashley_moody', 'yea', 'with_party'),     (rc_patel, 'schmitt', 'yea', 'with_party'),
    (rc_patel, 'ted_budd', 'yea', 'with_party'),         (rc_patel, 'mccormick', 'yea', 'with_party'),
    (rc_patel, 'cotton', 'yea', 'with_party'),           (rc_patel, 'tillis', 'yea', 'with_party'),
    -- Republicans — nay (broke with party)
    (rc_patel, 'collins', 'nay', 'against_party'),       (rc_patel, 'murkowski', 'nay', 'against_party'),
    -- Democrats / Independents — nay (party-line)
    (rc_patel, 'schumer', 'nay', 'with_party'),          (rc_patel, 'durbin', 'nay', 'with_party'),
    (rc_patel, 'warren', 'nay', 'with_party'),           (rc_patel, 'wyden', 'nay', 'with_party'),
    (rc_patel, 'klobuchar', 'nay', 'with_party'),        (rc_patel, 'chris_murphy', 'nay', 'with_party'),
    (rc_patel, 'kaine', 'nay', 'with_party'),            (rc_patel, 'coons', 'nay', 'with_party'),
    (rc_patel, 'bennet', 'nay', 'with_party'),           (rc_patel, 'welch', 'nay', 'with_party'),
    (rc_patel, 'tina_smith', 'nay', 'with_party'),       (rc_patel, 'hirono', 'nay', 'with_party'),
    (rc_patel, 'merkley', 'nay', 'with_party'),          (rc_patel, 'markey', 'nay', 'with_party'),
    (rc_patel, 'van_hollen', 'nay', 'with_party'),       (rc_patel, 'duckworth', 'nay', 'with_party'),
    (rc_patel, 'tammy_baldwin', 'nay', 'with_party'),    (rc_patel, 'blunt_rochester', 'nay', 'with_party'),
    (rc_patel, 'angus_king', 'nay', 'with_party'),       (rc_patel, 'schatz', 'nay', 'with_party'),
    (rc_patel, 'blumenthal', 'nay', 'with_party'),       (rc_patel, 'shaheen', 'nay', 'with_party'),
    (rc_patel, 'peters', 'nay', 'with_party'),           (rc_patel, 'booker', 'nay', 'with_party'),
    (rc_patel, 'alsobrooks', 'nay', 'with_party'),       (rc_patel, 'gallego', 'nay', 'with_party'),
    (rc_patel, 'mark_kelly', 'nay', 'with_party'),       (rc_patel, 'rosen', 'nay', 'with_party'),
    (rc_patel, 'cortez_masto', 'nay', 'with_party'),     (rc_patel, 'slotkin', 'nay', 'with_party'),
    (rc_patel, 'maggie_hassan', 'nay', 'with_party'),    (rc_patel, 'warnock', 'nay', 'with_party'),
    (rc_patel, 'jon_ossoff', 'nay', 'with_party'),       (rc_patel, 'padilla', 'nay', 'with_party'),
    (rc_patel, 'schiff', 'nay', 'with_party'),           (rc_patel, 'gillibrand', 'nay', 'with_party'),
    (rc_patel, 'fetterman', 'nay', 'with_party'),        (rc_patel, 'heinrich', 'nay', 'with_party'),
    (rc_patel, 'hickenlooper', 'nay', 'with_party'),     (rc_patel, 'andy_kim', 'nay', 'with_party'),
    (rc_patel, 'lujan', 'nay', 'with_party'),            (rc_patel, 'warner', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── (2) Confirmation of Pam Bondi as Attorney General ────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('nomination', 119, 'senate', 'Bondi — AG', 'Nomination of Pamela Bondi to be Attorney General', 'Bondi — Attorney General',
     'Senate confirmation of Pam Bondi as Attorney General, confirmed 54-46 with one Democrat crossing over in support.',
     'enacted', 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00033.htm', 'U.S. Senate',
     '{"rollCall":"119-1-33"}')
  RETURNING id INTO m_bondi;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_bondi, 'gov_balance',     100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s Attorney General.'),
    (m_bondi, 'tough_on_crime',   60, false, 'yea_supports', 'Leadership of the U.S. Department of Justice.'),
    (m_bondi, 'gov_transparency', 50, false, 'yea_opposes',  'Opponents warned about the Justice Department''s independence under the nominee.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_bondi, 'senate', 119, 1, 33, '2025-02-04T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
     '{"yea":54,"nay":46,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00033.htm', 'U.S. Senate')
  RETURNING id INTO rc_bondi;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (unanimous among the GOP)
    (rc_bondi, 'thune', 'yea', 'with_party'),            (rc_bondi, 'barrasso', 'yea', 'with_party'),
    (rc_bondi, 'cruz', 'yea', 'with_party'),             (rc_bondi, 'lee', 'yea', 'with_party'),
    (rc_bondi, 'grassley', 'yea', 'with_party'),         (rc_bondi, 'graham', 'yea', 'with_party'),
    (rc_bondi, 'hawley', 'yea', 'with_party'),           (rc_bondi, 'rand_paul', 'yea', 'with_party'),
    (rc_bondi, 'mcconnell', 'yea', 'with_party'),        (rc_bondi, 'ernst', 'yea', 'with_party'),
    (rc_bondi, 'lankford', 'yea', 'with_party'),         (rc_bondi, 'banks', 'yea', 'with_party'),
    (rc_bondi, 'moreno', 'yea', 'with_party'),           (rc_bondi, 'mullin', 'yea', 'with_party'),
    (rc_bondi, 'ricketts', 'yea', 'with_party'),         (rc_bondi, 'sheehy', 'yea', 'with_party'),
    (rc_bondi, 'blackburn', 'yea', 'with_party'),        (rc_bondi, 'rick_scott', 'yea', 'with_party'),
    (rc_bondi, 'hagerty', 'yea', 'with_party'),          (rc_bondi, 'roger_marshall', 'yea', 'with_party'),
    (rc_bondi, 'daines', 'yea', 'with_party'),           (rc_bondi, 'ron_johnson', 'yea', 'with_party'),
    (rc_bondi, 'todd_young', 'yea', 'with_party'),       (rc_bondi, 'john_cornyn', 'yea', 'with_party'),
    (rc_bondi, 'mike_rounds', 'yea', 'with_party'),      (rc_bondi, 'kevin_cramer', 'yea', 'with_party'),
    (rc_bondi, 'hoeven', 'yea', 'with_party'),           (rc_bondi, 'britt', 'yea', 'with_party'),
    (rc_bondi, 'tommy_tuberville', 'yea', 'with_party'), (rc_bondi, 'dan_sullivan', 'yea', 'with_party'),
    (rc_bondi, 'deb_fischer', 'yea', 'with_party'),      (rc_bondi, 'jim_justice', 'yea', 'with_party'),
    (rc_bondi, 'lummis', 'yea', 'with_party'),           (rc_bondi, 'kennedy_john', 'yea', 'with_party'),
    (rc_bondi, 'ashley_moody', 'yea', 'with_party'),     (rc_bondi, 'schmitt', 'yea', 'with_party'),
    (rc_bondi, 'ted_budd', 'yea', 'with_party'),         (rc_bondi, 'mccormick', 'yea', 'with_party'),
    (rc_bondi, 'cotton', 'yea', 'with_party'),           (rc_bondi, 'collins', 'yea', 'with_party'),
    (rc_bondi, 'murkowski', 'yea', 'with_party'),        (rc_bondi, 'tillis', 'yea', 'with_party'),
    -- Democrat — yea (crossed over, against party)
    (rc_bondi, 'fetterman', 'yea', 'against_party'),
    -- Democrats / Independents — nay (party-line)
    (rc_bondi, 'schumer', 'nay', 'with_party'),          (rc_bondi, 'durbin', 'nay', 'with_party'),
    (rc_bondi, 'warren', 'nay', 'with_party'),           (rc_bondi, 'wyden', 'nay', 'with_party'),
    (rc_bondi, 'klobuchar', 'nay', 'with_party'),        (rc_bondi, 'chris_murphy', 'nay', 'with_party'),
    (rc_bondi, 'kaine', 'nay', 'with_party'),            (rc_bondi, 'coons', 'nay', 'with_party'),
    (rc_bondi, 'bennet', 'nay', 'with_party'),           (rc_bondi, 'welch', 'nay', 'with_party'),
    (rc_bondi, 'tina_smith', 'nay', 'with_party'),       (rc_bondi, 'hirono', 'nay', 'with_party'),
    (rc_bondi, 'merkley', 'nay', 'with_party'),          (rc_bondi, 'markey', 'nay', 'with_party'),
    (rc_bondi, 'van_hollen', 'nay', 'with_party'),       (rc_bondi, 'duckworth', 'nay', 'with_party'),
    (rc_bondi, 'tammy_baldwin', 'nay', 'with_party'),    (rc_bondi, 'blunt_rochester', 'nay', 'with_party'),
    (rc_bondi, 'angus_king', 'nay', 'with_party'),       (rc_bondi, 'schatz', 'nay', 'with_party'),
    (rc_bondi, 'blumenthal', 'nay', 'with_party'),       (rc_bondi, 'shaheen', 'nay', 'with_party'),
    (rc_bondi, 'peters', 'nay', 'with_party'),           (rc_bondi, 'booker', 'nay', 'with_party'),
    (rc_bondi, 'alsobrooks', 'nay', 'with_party'),       (rc_bondi, 'gallego', 'nay', 'with_party'),
    (rc_bondi, 'mark_kelly', 'nay', 'with_party'),       (rc_bondi, 'rosen', 'nay', 'with_party'),
    (rc_bondi, 'cortez_masto', 'nay', 'with_party'),     (rc_bondi, 'slotkin', 'nay', 'with_party'),
    (rc_bondi, 'maggie_hassan', 'nay', 'with_party'),    (rc_bondi, 'warnock', 'nay', 'with_party'),
    (rc_bondi, 'jon_ossoff', 'nay', 'with_party'),       (rc_bondi, 'padilla', 'nay', 'with_party'),
    (rc_bondi, 'schiff', 'nay', 'with_party'),           (rc_bondi, 'gillibrand', 'nay', 'with_party'),
    (rc_bondi, 'heinrich', 'nay', 'with_party'),         (rc_bondi, 'hickenlooper', 'nay', 'with_party'),
    (rc_bondi, 'andy_kim', 'nay', 'with_party'),         (rc_bondi, 'lujan', 'nay', 'with_party'),
    (rc_bondi, 'warner', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
