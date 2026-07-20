-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Phase 4 polish (wave 9): five timely, high-visibility measures
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds landmark 119th-Congress measures that connect the Legislation library to the
-- Spotlight themes visitors already browse — tariffs, foreign policy / restraint,
-- taxes & cost of living, and energy. Data-only, additive, idempotent:
--   • Each measure is inserted only when one with its (type, congress, number) does
--     not already exist, so re-applying is a clean no-op.
--   • Member votes use ON CONFLICT DO NOTHING against (rollcall_id, politician_id).
--   • Every issue key is from db/issue-keys.json; support_meaning + rationale follow
--     the existing curated pattern. Sources are canonical Congress.gov pages.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
-- Measures:
--   1) S.J.Res. 37 — terminate the national-emergency tariffs on Canadian imports.
--      Passed the Senate 51–48 (2025-04-02) with four Republicans crossing over.
--   2) S.J.Res. 59 — require congressional authorization before hostilities against
--      Iran (War Powers). Failed 47–53 (2025-06-27); Rand Paul (R) and John Fetterman
--      (D) crossed party lines.
--   3) S. 129 — No Tax on Tips Act. Passed the Senate by unanimous consent (2025-05-20).
--   4) H.J.Res. 88 — Congressional Review Act disapproval of the EPA waiver enabling
--      California's Advanced Clean Cars II (zero-emission vehicle) sales mandate.
--      Enacted 2025-06-12.
--   5) H.J.Res. 89 — CRA disapproval of the EPA waiver for California's Advanced Clean
--      Trucks rule. Enacted 2025-06-12.
--
-- For the two recorded votes the seeded roster captures the party blocs and the named
-- crossover senators (roster slugs match the app + prior waves); the official totals
-- live in each roll call's `totals`. For measures cleared without a recorded roll call
-- (unanimous consent) or where a member-by-member roster is not asserted here, the
-- sourced action timeline carries the "how it moved" story.

DO $$
DECLARE
  m_sjr37 integer; rc_sjr37 integer;
  m_sjr59 integer; rc_sjr59 integer;
  m_s129  integer;
  m_hjr88 integer;
  m_hjr89 integer;
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
BEGIN
  -- ── 1) S.J.Res. 37 — terminate the Canada tariff emergency (tariffs) ──────────
  SELECT id INTO m_sjr37 FROM vr_measures WHERE number = 'S.J.Res. 37' AND congress = 119 LIMIT 1;
  IF m_sjr37 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'senate', 'S.J.Res. 37',
       'A joint resolution to terminate the national emergency declared to impose duties on articles imported from Canada',
       'Terminate the Canada tariff emergency',
       'A Senate resolution to end the emergency declaration used to impose tariffs on Canadian imports. Passed the Senate 51–48 with four Republicans joining Democrats; it did not advance in the House.',
       'passed_senate', '2025-02-27T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37', 'Congress.gov', '{}')
    RETURNING id INTO m_sjr37;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_sjr37, 'tariffs_authority', 100, true,  'yea_supports', 'Reasserts congressional authority over tariffs by ending the emergency used to impose them; a yea rolls back the executive tariff action.'),
      (m_sjr37, 'econ_trade',         70, false, 'yea_supports', 'Removes the duties on Canadian imports; a yea favors lower trade barriers with a top trading partner.'),
      (m_sjr37, 'tariffs_prices',     55, false, 'yea_supports', 'Supporters argued the tariffs raise costs for U.S. consumers and businesses; a yea removes them.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_sjr37, 'senate', 119, 1, NULL, '2025-04-02T00:00:00Z', 'On Passage of the Joint Resolution', 'passage', 'passed', 'simple',
       '{"yea":51,"nay":48,"present":0,"notVoting":1}',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37/all-actions', 'Congress.gov')
    RETURNING id INTO rc_sjr37;

    -- Democrats/Independents — yea (party-line here).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_sjr37, s, 'yea', 'with_party' FROM unnest(di) s
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    -- Republicans who crossed over — yea (against party).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_sjr37, s, 'yea', 'against_party' FROM unnest(rr) s
      WHERE s IN ('collins','murkowski','mcconnell','rand_paul')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    -- Republicans — nay (party-line).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_sjr37, s, 'nay', 'with_party' FROM unnest(rr) s
      WHERE s NOT IN ('collins','murkowski','mcconnell','rand_paul')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_sjr37, 'introduced', 'senate', '2025-02-27T00:00:00Z', 'Introduced in the Senate under the National Emergencies Act.', 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37', 'Congress.gov', 10),
      (m_sjr37, 'passed_senate', 'senate', '2025-04-02T00:00:00Z', 'Passed the Senate, 51–48, with four Republicans crossing over.', 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37/all-actions', 'Congress.gov', 40);
  END IF;

  -- ── 2) S.J.Res. 59 — Iran War Powers (foreign policy / restraint) ─────────────
  SELECT id INTO m_sjr59 FROM vr_measures WHERE number = 'S.J.Res. 59' AND congress = 119 LIMIT 1;
  IF m_sjr59 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'senate', 'S.J.Res. 59',
       'A joint resolution to direct the removal of United States Armed Forces from hostilities against the Islamic Republic of Iran that have not been authorized by Congress',
       'Iran War Powers Resolution',
       'A War Powers resolution requiring congressional authorization before U.S. hostilities against Iran, offered after U.S. strikes on Iranian nuclear sites. Failed 47–53; Rand Paul (R) voted yes and John Fetterman (D) voted no.',
       'failed', '2025-06-23T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59', 'Congress.gov', '{}')
    RETURNING id INTO m_sjr59;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_sjr59, 'restraint',        100, true,  'yea_supports', 'Requires congressional authorization before military action against Iran; a yea favors restraint and a congressional check on war-making.'),
      (m_sjr59, 'america_first_fp',  70, false, 'yea_supports', 'A yea presses against open-ended involvement in a new Middle East conflict.'),
      (m_sjr59, 'strong_defense',    55, false, 'yea_opposes',  'Opponents held that constraining the commander-in-chief would weaken deterrence; a yea cuts against that view.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_sjr59, 'senate', 119, 1, NULL, '2025-06-27T00:00:00Z', 'On Passage of the Joint Resolution', 'passage', 'rejected', 'simple',
       '{"yea":47,"nay":53,"present":0,"notVoting":0}',
       'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59/all-actions', 'Congress.gov')
    RETURNING id INTO rc_sjr59;

    -- Democrats/Independents — yea, except Fetterman who crossed over to nay.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_sjr59, s, 'yea', 'with_party' FROM unnest(di) s WHERE s <> 'fetterman'
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_sjr59, 'fetterman', 'nay', 'against_party')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    -- Republicans — nay, except Rand Paul who crossed over to yea.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_sjr59, 'rand_paul', 'yea', 'against_party')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_sjr59, s, 'nay', 'with_party' FROM unnest(rr) s WHERE s <> 'rand_paul'
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_sjr59, 'introduced', 'senate', '2025-06-23T00:00:00Z', 'Introduced in the Senate as a War Powers resolution.', 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59', 'Congress.gov', 10),
      (m_sjr59, 'failed', 'senate', '2025-06-27T00:00:00Z', 'Failed on the Senate floor, 47–53.', 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59/all-actions', 'Congress.gov', 80);
  END IF;

  -- ── 3) S. 129 — No Tax on Tips Act (taxes / cost of living) ───────────────────
  SELECT id INTO m_s129 FROM vr_measures WHERE number = 'S. 129' AND congress = 119 LIMIT 1;
  IF m_s129 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'senate', 'S. 129',
       'No Tax on Tips Act',
       'No Tax on Tips Act',
       'Creates a federal income-tax deduction for qualified tip income for workers in traditionally tipped occupations. Passed the Senate by unanimous consent.',
       'passed_senate', '2025-01-16T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/senate-bill/129', 'Congress.gov', '{}')
    RETURNING id INTO m_s129;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_s129, 'tax_middle_class', 100, true,  'yea_supports', 'Exempts qualified tip income from federal income tax for tipped workers.'),
      (m_s129, 'cost_living',       70, false, 'yea_supports', 'Aims to raise take-home pay for service and hospitality workers.'),
      (m_s129, 'lower_taxes',       60, false, 'yea_supports', 'Reduces the federal tax burden on a category of earned income.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_s129, 'introduced', 'senate', '2025-01-16T00:00:00Z', 'Introduced in the Senate.', 'https://www.congress.gov/bill/119th-congress/senate-bill/129', 'Congress.gov', 10),
      (m_s129, 'passed_senate', 'senate', '2025-05-20T00:00:00Z', 'Passed the Senate by unanimous consent.', 'https://www.congress.gov/bill/119th-congress/senate-bill/129/all-actions', 'Congress.gov', 40);
  END IF;

  -- ── 4) H.J.Res. 88 — CRA repeal of California's EV (Clean Cars II) waiver ──────
  SELECT id INTO m_hjr88 FROM vr_measures WHERE number = 'H.J.Res. 88' AND congress = 119 LIMIT 1;
  IF m_hjr88 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'house', 'H.J.Res. 88',
       'Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Cars II regulations',
       'CRA — repeal California EV mandate waiver',
       'A Congressional Review Act resolution revoking the EPA waiver that let California require rising zero-emission-vehicle sales (the Advanced Clean Cars II rule) adopted by a dozen other states. Enacted 2025-06-12.',
       'enacted', '2025-05-01T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88', 'Congress.gov', '{}')
    RETURNING id INTO m_hjr88;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hjr88, 'climate_action',   100, true,  'yea_opposes',  'Repeals the waiver behind California''s EV sales mandate; a yea rolls back a major state climate rule.'),
      (m_hjr88, 'energy_production', 70, false, 'yea_supports', 'Supporters framed it as protecting consumer choice and gasoline-vehicle access.'),
      (m_hjr88, 'gov_regulation',    60, false, 'yea_supports', 'Uses the Congressional Review Act to strike a federal waiver/rule.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_hjr88, 'introduced', 'house', '2025-05-01T00:00:00Z', 'Introduced in the House under the Congressional Review Act.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88', 'Congress.gov', 10),
      (m_hjr88, 'passed_house', 'house', NULL, 'Passed the House.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88/all-actions', 'Congress.gov', 30),
      (m_hjr88, 'passed_senate', 'senate', NULL, 'Passed the Senate.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88/all-actions', 'Congress.gov', 40),
      (m_hjr88, 'enacted', NULL, '2025-06-12T00:00:00Z', 'Signed into law, revoking the waiver.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88', 'Congress.gov', 70);
  END IF;

  -- ── 5) H.J.Res. 89 — CRA repeal of California's Advanced Clean Trucks waiver ───
  SELECT id INTO m_hjr89 FROM vr_measures WHERE number = 'H.J.Res. 89' AND congress = 119 LIMIT 1;
  IF m_hjr89 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'house', 'H.J.Res. 89',
       'Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Trucks regulations',
       'CRA — repeal California clean-trucks waiver',
       'A Congressional Review Act resolution revoking the EPA waiver behind California''s Advanced Clean Trucks rule, which required rising zero-emission sales of medium- and heavy-duty trucks. Enacted 2025-06-12.',
       'enacted', '2025-05-01T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89', 'Congress.gov', '{}')
    RETURNING id INTO m_hjr89;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hjr89, 'climate_action',   100, true,  'yea_opposes',  'Repeals the waiver behind California''s zero-emission truck mandate; a yea rolls back a major state climate rule.'),
      (m_hjr89, 'energy_production', 70, false, 'yea_supports', 'Supporters framed it as easing costs on trucking and freight.'),
      (m_hjr89, 'gov_regulation',    60, false, 'yea_supports', 'Uses the Congressional Review Act to strike a federal waiver/rule.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_hjr89, 'introduced', 'house', '2025-05-01T00:00:00Z', 'Introduced in the House under the Congressional Review Act.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89', 'Congress.gov', 10),
      (m_hjr89, 'passed_house', 'house', NULL, 'Passed the House.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89/all-actions', 'Congress.gov', 30),
      (m_hjr89, 'passed_senate', 'senate', NULL, 'Passed the Senate.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89/all-actions', 'Congress.gov', 40),
      (m_hjr89, 'enacted', NULL, '2025-06-12T00:00:00Z', 'Signed into law, revoking the waiver.', 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89', 'Congress.gov', 70);
  END IF;
END $$;
