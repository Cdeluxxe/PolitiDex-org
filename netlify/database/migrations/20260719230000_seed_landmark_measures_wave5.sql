-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 5 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more landmark 119th-Congress measures, broadening the record's variety:
--   (1) the TAKE IT DOWN Act (S. 146) — a near-unanimous bipartisan tech/privacy law
--       criminalizing nonconsensual intimate imagery, including AI deepfakes; and
--   (2) the confirmation of PETE HEGSETH as Secretary of Defense — the record's FIRST
--       nomination vote, a party-line 51-50 Senate cliffhanger decided on the Vice
--       President's tie-break.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (official congressional / Senate record):
--   S. 146 — TAKE IT DOWN Act. House roll call 104, 2025-04-28, suspension of the
--     rules, agreed 409-2 (2/3 required; 22 not voting). The only two nays were
--     Republicans Thomas Massie (KY) and Eric Burlison (MO); Massie is recorded here
--     as against-party. The Senate had passed it by unanimous consent (no roll call).
--     Signed into law May 19, 2025. (clerk.house.gov/Votes/2025104)
--   Hegseth nomination (PN11-7) — Senate roll call 15, 2025-01-24, On the Nomination,
--     confirmed 51-50: the senators split 50-50 and Vice President Vance broke the
--     tie. Every Democrat/Independent voted nay; three Republicans — Susan Collins,
--     Lisa Murkowski, and Mitch McConnell — crossed over to vote nay (recorded here
--     as against-party). (senate.gov vote_119_1_00015)
--
-- Idempotent: guarded on the S. 146 measure sentinel, and every member insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_s146    integer;
  m_hegseth integer;
  rc        integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'S. 146' AND congress = 119) THEN
    RETURN;
  END IF;

  -- ── (1) TAKE IT DOWN Act (S. 146) ───────────────────────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'senate', 'S. 146', 'TAKE IT DOWN Act', 'TAKE IT DOWN Act',
     'Criminalizes the publication of nonconsensual intimate imagery — including AI-generated "deepfakes" — and requires online platforms to remove such content within 48 hours of notice. Signed into law May 19, 2025.',
     'enacted', 'https://www.congress.gov/bill/119th-congress/senate-bill/146', 'Congress.gov',
     '{"congressGovId":"s146-119"}')
  RETURNING id INTO m_s146;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_s146, 'privacy_rights', 100, true,  'yea_supports', 'A yea vote criminalizes nonconsensual intimate imagery and mandates platform takedowns.'),
    (m_s146, 'tech_balance',    60, false, 'yea_supports', 'Imposes new content-removal obligations on online platforms.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_s146, 'house', 119, 1, 104, '2025-04-28T00:00:00Z', 'On Motion to Suspend the Rules and Pass', 'passage', 'passed', 'two_thirds',
     '{"yea":409,"nay":2,"present":0,"notVoting":22}', 'https://clerk.house.gov/Votes/2025104', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jeffries',     'yea', 'with_party'),
    (rc, 'massie',       'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── (2) Confirmation of Pete Hegseth as Secretary of Defense (PN11-7) ────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('nomination', 119, 'senate', 'PN11-7', 'Nomination of Pete Hegseth to be Secretary of Defense', 'Hegseth — SecDef',
     'Senate confirmation of Pete Hegseth as Secretary of Defense. Confirmed 51-50 on the Vice President''s tie-breaking vote after the senators split 50-50.',
     'enacted', 'https://www.congress.gov/nomination/119th-congress/11', 'Congress.gov',
     '{"nominationNumber":"PN11-7"}')
  RETURNING id INTO m_hegseth;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hegseth, 'defense',     100, true,  'yea_supports', 'Confirmation of the civilian leader of the Department of Defense.'),
    (m_hegseth, 'gov_balance',  50, false, 'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s nominee.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hegseth, 'senate', 119, 1, 15, '2025-01-24T00:00:00Z', 'On the Nomination (confirmed 51-50 on the VP tie-break)', 'nomination', 'confirmed', 'simple',
     '{"yea":50,"nay":50,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00015.htm', 'U.S. Senate')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (party-line)
    (rc, 'thune', 'yea', 'with_party'),            (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),             (rc, 'lee', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),         (rc, 'graham', 'yea', 'with_party'),
    (rc, 'hawley', 'yea', 'with_party'),           (rc, 'rand_paul', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),            (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'banks', 'yea', 'with_party'),            (rc, 'moreno', 'yea', 'with_party'),
    (rc, 'mullin', 'yea', 'with_party'),           (rc, 'ricketts', 'yea', 'with_party'),
    (rc, 'sheehy', 'yea', 'with_party'),           (rc, 'blackburn', 'yea', 'with_party'),
    (rc, 'rick_scott', 'yea', 'with_party'),       (rc, 'hagerty', 'yea', 'with_party'),
    (rc, 'roger_marshall', 'yea', 'with_party'),   (rc, 'daines', 'yea', 'with_party'),
    (rc, 'ron_johnson', 'yea', 'with_party'),      (rc, 'todd_young', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),      (rc, 'mike_rounds', 'yea', 'with_party'),
    (rc, 'kevin_cramer', 'yea', 'with_party'),     (rc, 'hoeven', 'yea', 'with_party'),
    (rc, 'britt', 'yea', 'with_party'),            (rc, 'tommy_tuberville', 'yea', 'with_party'),
    (rc, 'dan_sullivan', 'yea', 'with_party'),     (rc, 'deb_fischer', 'yea', 'with_party'),
    (rc, 'jim_justice', 'yea', 'with_party'),      (rc, 'lummis', 'yea', 'with_party'),
    (rc, 'kennedy_john', 'yea', 'with_party'),     (rc, 'ashley_moody', 'yea', 'with_party'),
    (rc, 'schmitt', 'yea', 'with_party'),          (rc, 'ted_budd', 'yea', 'with_party'),
    (rc, 'mccormick', 'yea', 'with_party'),        (rc, 'cotton', 'yea', 'with_party'),
    -- Republicans — nay (broke with party)
    (rc, 'collins', 'nay', 'against_party'),       (rc, 'murkowski', 'nay', 'against_party'),
    (rc, 'mcconnell', 'nay', 'against_party'),
    -- Democrats / Independents — nay (party-line)
    (rc, 'schumer', 'nay', 'with_party'),          (rc, 'durbin', 'nay', 'with_party'),
    (rc, 'warren', 'nay', 'with_party'),           (rc, 'wyden', 'nay', 'with_party'),
    (rc, 'klobuchar', 'nay', 'with_party'),        (rc, 'chris_murphy', 'nay', 'with_party'),
    (rc, 'kaine', 'nay', 'with_party'),            (rc, 'coons', 'nay', 'with_party'),
    (rc, 'bennet', 'nay', 'with_party'),           (rc, 'welch', 'nay', 'with_party'),
    (rc, 'tina_smith', 'nay', 'with_party'),       (rc, 'hirono', 'nay', 'with_party'),
    (rc, 'merkley', 'nay', 'with_party'),          (rc, 'markey', 'nay', 'with_party'),
    (rc, 'van_hollen', 'nay', 'with_party'),       (rc, 'duckworth', 'nay', 'with_party'),
    (rc, 'tammy_baldwin', 'nay', 'with_party'),    (rc, 'blunt_rochester', 'nay', 'with_party'),
    (rc, 'angus_king', 'nay', 'with_party'),       (rc, 'schatz', 'nay', 'with_party'),
    (rc, 'blumenthal', 'nay', 'with_party'),       (rc, 'shaheen', 'nay', 'with_party'),
    (rc, 'peters', 'nay', 'with_party'),           (rc, 'booker', 'nay', 'with_party'),
    (rc, 'alsobrooks', 'nay', 'with_party'),       (rc, 'gallego', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),       (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'cortez_masto', 'nay', 'with_party'),     (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'maggie_hassan', 'nay', 'with_party'),    (rc, 'warnock', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'nay', 'with_party'),       (rc, 'padilla', 'nay', 'with_party'),
    (rc, 'schiff', 'nay', 'with_party'),           (rc, 'gillibrand', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),        (rc, 'heinrich', 'nay', 'with_party'),
    (rc, 'hickenlooper', 'nay', 'with_party'),     (rc, 'andy_kim', 'nay', 'with_party'),
    (rc, 'lujan', 'nay', 'with_party'),            (rc, 'warner', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
