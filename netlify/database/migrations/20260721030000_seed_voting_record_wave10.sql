-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 10: Senate confirmations + House vote enrichment
-- ─────────────────────────────────────────────────────────────────────────────
-- Grows the record on both sides of the Capitol and connects existing profiles to
-- the Legislation library and Issue Spotlights. Data-only, additive, idempotent:
--   • Each new measure is inserted only when one with its (type, congress, number)
--     does not already exist; re-applying is a clean no-op.
--   • Every member vote uses ON CONFLICT DO NOTHING on (rollcall_id, politician_id).
--   • Issue keys are from db/issue-keys.json; support_meaning + rationale follow the
--     curated pattern. Roster slugs match the app + prior waves.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
-- SENATE — three 2025 cabinet/agency confirmations (new nomination measures):
--   1) Russell Vought — Director, Office of Management and Budget. Confirmed 53–47,
--      party-line. Connects to the spending / national-debt Spotlights.
--   2) Tulsi Gabbard — Director of National Intelligence. Confirmed 52–48; Mitch
--      McConnell (R) crossed over to vote no.
--   3) Linda McMahon — Secretary of Education. Confirmed 51–45, party-line.
--
-- HOUSE — recorded votes added to two spending measures already in the record
--   (enrichment; both had a timeline but no roll call):
--   4) H.Con.Res. 14 — FY2025 budget resolution, House adoption 217–215. Thomas
--      Massie (R) crossed over to vote no.
--   5) H.R. 1968 — full-year continuing resolution, House passage 217–213. Thomas
--      Massie (R) voted no; Jared Golden (D) crossed over to vote yes.
--
-- Rosters capture the party blocs plus the named crossovers; official totals live in
-- each roll call's `totals`. Sources are the official Senate roll-call menu and each
-- measure's canonical Congress.gov page.

DO $$
DECLARE
  m_vought integer; rc_vought integer;
  m_gabbard integer; rc_gabbard integer;
  m_mcmahon integer; rc_mcmahon integer;
  m_hcr14 integer; rc_hcr14 integer;
  m_cr integer; rc_cr integer;
  SEN_MENU text := 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm';
  -- Democratic + Independent caucus (roster slugs proven in prior waves).
  di text[] := ARRAY['schumer','durbin','warren','wyden','klobuchar','chris_murphy','kaine','coons',
    'bennet','welch','tina_smith','hirono','merkley','markey','van_hollen','duckworth','tammy_baldwin',
    'blunt_rochester','angus_king','schatz','blumenthal','shaheen','peters','booker','alsobrooks','gallego',
    'mark_kelly','rosen','cortez_masto','slotkin','maggie_hassan','warnock','jon_ossoff','padilla','schiff',
    'gillibrand','fetterman','heinrich','hickenlooper','andy_kim','lujan','warner'];
  -- Republican conference (roster slugs proven in prior waves).
  rr text[] := ARRAY['thune','barrasso','cruz','lee','grassley','graham','hawley','rand_paul','mcconnell',
    'ernst','lankford','banks','moreno','mullin','ricketts','sheehy','blackburn','rick_scott','hagerty',
    'roger_marshall','daines','ron_johnson','todd_young','john_cornyn','mike_rounds','kevin_cramer','hoeven',
    'britt','tommy_tuberville','dan_sullivan','deb_fischer','jim_justice','lummis','kennedy_john','ashley_moody',
    'schmitt','ted_budd','mccormick','cotton','tillis','collins','murkowski'];
  -- U.S. House roster members already in the app (from the House member-vote backfill).
  hr text[] := ARRAY['chip_roy','dan_crenshaw','donalds','don_bacon','fitzpatrick','kevin_hern','luna',
    'massie','mcclain','mike_lawler','nancy_mace','stefanik'];
  hd text[] := ARRAY['ayanna_pressley','brendan_boyle','clyburn','dan_goldman','debbie_dingell','delia_ramirez',
    'diana_degette','greg_landsman','jake_auchincloss','jan_schakowsky','jared_golden','jayapal','jim_mcgovern',
    'josh_gottheimer','marie_gluesenkamp_perez','maxwell_frost','nadler','omar','raja_krishnamoorthi','rick_larsen',
    'sarah_mcbride','seth_moulton','steny_hoyer','summer_lee','tlaib','tom_suozzi','torres'];
BEGIN
  -- ── 1) Russell Vought — OMB (53–47, party-line) ───────────────────────────────
  SELECT id INTO m_vought FROM vr_measures WHERE number = 'Vought — OMB' AND congress = 119 LIMIT 1;
  IF m_vought IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('nomination', 119, 'senate', 'Vought — OMB', 'Nomination of Russell Vought to be Director of the Office of Management and Budget',
       'Vought — OMB Director',
       'Senate confirmation of Russell Vought as OMB Director, confirmed 53–47 on a party-line vote. Vought is a leading advocate of deep reductions in federal spending.',
       'enacted', SEN_MENU, 'U.S. Senate', '{}')
    RETURNING id INTO m_vought;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_vought, 'gov_balance',  100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s budget director.'),
      (m_vought, 'cut_spending',  70, false, 'yea_supports', 'Vought is a prominent proponent of steep cuts to federal spending and the size of government.'),
      (m_vought, 'national_debt', 55, false, 'yea_supports', 'OMB leads the administration''s budget and deficit strategy.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_vought, 'senate', 119, 1, NULL, '2025-02-07T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
       '{"yea":53,"nay":47,"present":0,"notVoting":0}', SEN_MENU, 'U.S. Senate')
    RETURNING id INTO rc_vought;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_vought, s, 'yea', 'with_party' FROM unnest(rr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_vought, s, 'nay', 'with_party' FROM unnest(di) s ON CONFLICT DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_vought, 'introduced', 'senate', NULL, 'Nomination received in the Senate.', SEN_MENU, 'U.S. Senate', 10),
      (m_vought, 'enacted', 'senate', '2025-02-07T00:00:00Z', 'Confirmed by the Senate, 53–47.', SEN_MENU, 'U.S. Senate', 70);
  END IF;

  -- ── 2) Tulsi Gabbard — DNI (52–48; McConnell crossed over) ────────────────────
  SELECT id INTO m_gabbard FROM vr_measures WHERE number = 'Gabbard — DNI' AND congress = 119 LIMIT 1;
  IF m_gabbard IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('nomination', 119, 'senate', 'Gabbard — DNI', 'Nomination of Tulsi Gabbard to be Director of National Intelligence',
       'Gabbard — Director of National Intelligence',
       'Senate confirmation of Tulsi Gabbard as Director of National Intelligence, confirmed 52–48. Mitch McConnell was the lone Republican to vote no.',
       'enacted', SEN_MENU, 'U.S. Senate', '{}')
    RETURNING id INTO m_gabbard;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_gabbard, 'gov_balance',      100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s intelligence chief.'),
      (m_gabbard, 'america_first_fp',  60, false, 'yea_supports', 'Gabbard has argued for a more restrained U.S. posture abroad.'),
      (m_gabbard, 'foreign_balance',   50, false, 'yea_supports', 'Leadership of the intelligence community.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_gabbard, 'senate', 119, 1, NULL, '2025-02-12T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
       '{"yea":52,"nay":48,"present":0,"notVoting":0}', SEN_MENU, 'U.S. Senate')
    RETURNING id INTO rc_gabbard;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_gabbard, s, 'yea', 'with_party' FROM unnest(rr) s WHERE s <> 'mcconnell' ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_gabbard, 'mcconnell', 'nay', 'against_party') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_gabbard, s, 'nay', 'with_party' FROM unnest(di) s ON CONFLICT DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_gabbard, 'introduced', 'senate', NULL, 'Nomination received in the Senate.', SEN_MENU, 'U.S. Senate', 10),
      (m_gabbard, 'enacted', 'senate', '2025-02-12T00:00:00Z', 'Confirmed by the Senate, 52–48.', SEN_MENU, 'U.S. Senate', 70);
  END IF;

  -- ── 3) Linda McMahon — Education (51–45, party-line) ──────────────────────────
  SELECT id INTO m_mcmahon FROM vr_measures WHERE number = 'McMahon — ED' AND congress = 119 LIMIT 1;
  IF m_mcmahon IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('nomination', 119, 'senate', 'McMahon — ED', 'Nomination of Linda McMahon to be Secretary of Education',
       'McMahon — Secretary of Education',
       'Senate confirmation of Linda McMahon as Secretary of Education, confirmed 51–45 on a party-line vote, amid the administration''s stated goal of shrinking the department.',
       'enacted', SEN_MENU, 'U.S. Senate', '{}')
    RETURNING id INTO m_mcmahon;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_mcmahon, 'gov_balance',    100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s education secretary.'),
      (m_mcmahon, 'school_choice',   60, false, 'yea_supports', 'The administration has prioritized school choice and a smaller federal role in education.'),
      (m_mcmahon, 'public_schools',  55, false, 'yea_opposes',  'Critics warned that downsizing the department would weaken support for public schools; a yea cuts against that view.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_mcmahon, 'senate', 119, 1, NULL, '2025-03-03T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
       '{"yea":51,"nay":45,"present":0,"notVoting":4}', SEN_MENU, 'U.S. Senate')
    RETURNING id INTO rc_mcmahon;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_mcmahon, s, 'yea', 'with_party' FROM unnest(rr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_mcmahon, s, 'nay', 'with_party' FROM unnest(di) s ON CONFLICT DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_mcmahon, 'introduced', 'senate', NULL, 'Nomination received in the Senate.', SEN_MENU, 'U.S. Senate', 10),
      (m_mcmahon, 'enacted', 'senate', '2025-03-03T00:00:00Z', 'Confirmed by the Senate, 51–45.', SEN_MENU, 'U.S. Senate', 70);
  END IF;

  -- ── 4) H.Con.Res. 14 — House adoption 217–215 (Massie crossed over) ───────────
  SELECT id INTO m_hcr14 FROM vr_measures WHERE number = 'H.Con.Res. 14' AND congress = 119 LIMIT 1;
  IF m_hcr14 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vr_rollcalls WHERE measure_id = m_hcr14 AND chamber = 'house'
  ) THEN
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_hcr14, 'house', 119, 1, NULL, '2025-04-10T00:00:00Z', 'On Agreeing to the Senate Amendment', 'passage', 'passed', 'simple',
       '{"yea":216,"nay":214,"present":0,"notVoting":0}',
       'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14/all-actions', 'Congress.gov')
    RETURNING id INTO rc_hcr14;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hcr14, s, 'yea', 'with_party' FROM unnest(hr) s WHERE s <> 'massie' ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_hcr14, 'massie', 'nay', 'against_party') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hcr14, s, 'nay', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── 5) H.R. 1968 — House passage 217–213 (Massie nay, Golden crossed over) ────
  SELECT id INTO m_cr FROM vr_measures WHERE number = 'H.R. 1968' AND congress = 119 LIMIT 1;
  IF m_cr IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vr_rollcalls WHERE measure_id = m_cr AND chamber = 'house'
  ) THEN
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_cr, 'house', 119, 1, NULL, '2025-03-11T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":217,"nay":213,"present":0,"notVoting":0}',
       'https://www.congress.gov/bill/119th-congress/house-bill/1968/all-actions', 'Congress.gov')
    RETURNING id INTO rc_cr;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_cr, s, 'yea', 'with_party' FROM unnest(hr) s WHERE s <> 'massie' ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_cr, 'massie', 'nay', 'against_party') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_cr, s, 'nay', 'with_party' FROM unnest(hd) s WHERE s <> 'jared_golden' ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_cr, 'jared_golden', 'yea', 'against_party') ON CONFLICT DO NOTHING;
  END IF;
END $$;
