-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 11: full-roster enrichment of two flagship roll calls + Rubio
-- ─────────────────────────────────────────────────────────────────────────────
-- Connects the two measures at the center of the Legislation library to far more
-- member profiles by attributing the full party rosters to roll calls they already
-- carry, and adds one unanimous confirmation. Data-only, additive, idempotent:
--   • Member votes are added to EXISTING roll calls (looked up by number) with
--     ON CONFLICT DO NOTHING, so rows seeded by earlier waves are never touched and
--     re-applying is a clean no-op.
--   • The new measure is inserted only when its (type, congress, number) is absent.
--   • Issue keys from db/issue-keys.json; sources are canonical official records.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
--   1) H.R. 1 (One Big Beautiful Bill Act) — SENATE roll call 372, passage 51–50 with
--      the Vice President breaking the tie (2025-07-01). Three Republicans — Rand
--      Paul, Thom Tillis, and Susan Collins — voted no; every Democrat voted no. The
--      full Senate roster is attributed here so the flagship omnibus lines up on every
--      senator's Voting Record tab (leadership was seeded earlier).
--   2) H.R. 22 (SAVE Act) — HOUSE roll call 102, passage 220–208 (2025-04-10). Two
--      roster Democrats — Jared Golden and Marie Gluesenkamp Perez — crossed over to
--      vote yes; the rest of the House roster is attributed party-line.
--   3) Marco Rubio — Secretary of State — confirmed 99–0 (2025-01-20), a rare
--      unanimous cabinet confirmation (new measure).
--
-- Politician ids match the app roster slugs.

DO $$
DECLARE
  rc_hr1s integer;
  rc_hr22h integer;
  m_rubio integer; rc_rubio integer;
  SEN_MENU text := 'https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm';
  di text[] := ARRAY['schumer','durbin','warren','wyden','klobuchar','chris_murphy','kaine','coons',
    'bennet','welch','tina_smith','hirono','merkley','markey','van_hollen','duckworth','tammy_baldwin',
    'blunt_rochester','angus_king','schatz','blumenthal','shaheen','peters','booker','alsobrooks','gallego',
    'mark_kelly','rosen','cortez_masto','slotkin','maggie_hassan','warnock','jon_ossoff','padilla','schiff',
    'gillibrand','fetterman','heinrich','hickenlooper','andy_kim','lujan','warner'];
  rr text[] := ARRAY['thune','barrasso','cruz','lee','grassley','graham','hawley','rand_paul','mcconnell',
    'ernst','lankford','banks','moreno','mullin','ricketts','sheehy','blackburn','rick_scott','hagerty',
    'roger_marshall','daines','ron_johnson','todd_young','john_cornyn','mike_rounds','kevin_cramer','hoeven',
    'britt','tommy_tuberville','dan_sullivan','deb_fischer','jim_justice','lummis','kennedy_john','ashley_moody',
    'schmitt','ted_budd','mccormick','cotton','tillis','collins','murkowski'];
  hr text[] := ARRAY['chip_roy','dan_crenshaw','donalds','don_bacon','fitzpatrick','kevin_hern','luna',
    'massie','mcclain','mike_lawler','nancy_mace','stefanik'];
  hd text[] := ARRAY['ayanna_pressley','brendan_boyle','clyburn','dan_goldman','debbie_dingell','delia_ramirez',
    'diana_degette','greg_landsman','jake_auchincloss','jan_schakowsky','jared_golden','jayapal','jim_mcgovern',
    'josh_gottheimer','marie_gluesenkamp_perez','maxwell_frost','nadler','omar','raja_krishnamoorthi','rick_larsen',
    'sarah_mcbride','seth_moulton','steny_hoyer','summer_lee','tlaib','tom_suozzi','torres'];
BEGIN
  -- ── 1) H.R. 1 — enrich Senate roll call 372 with the full roster ──────────────
  SELECT id INTO rc_hr1s FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 372 LIMIT 1;
  IF rc_hr1s IS NOT NULL THEN
    -- Republicans — yea, except the three who voted no.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr1s, s, 'yea', 'with_party' FROM unnest(rr) s
      WHERE s NOT IN ('rand_paul','tillis','collins') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr1s, s, 'nay', 'against_party' FROM unnest(rr) s
      WHERE s IN ('rand_paul','tillis','collins') ON CONFLICT DO NOTHING;
    -- Democrats / Independents — nay (party-line).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr1s, s, 'nay', 'with_party' FROM unnest(di) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── 2) H.R. 22 (SAVE Act) — enrich House roll call 102 with the full roster ───
  SELECT id INTO rc_hr22h FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 102 LIMIT 1;
  IF rc_hr22h IS NOT NULL THEN
    -- Republicans — yea (party-line).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr22h, s, 'yea', 'with_party' FROM unnest(hr) s ON CONFLICT DO NOTHING;
    -- Democrats — nay, except the two who crossed over to yes.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr22h, s, 'yea', 'against_party' FROM unnest(hd) s
      WHERE s IN ('jared_golden','marie_gluesenkamp_perez') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr22h, s, 'nay', 'with_party' FROM unnest(hd) s
      WHERE s NOT IN ('jared_golden','marie_gluesenkamp_perez') ON CONFLICT DO NOTHING;
  END IF;

  -- ── 3) Marco Rubio — Secretary of State (99–0, unanimous) ─────────────────────
  SELECT id INTO m_rubio FROM vr_measures WHERE number = 'Rubio — State' AND congress = 119 LIMIT 1;
  IF m_rubio IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('nomination', 119, 'senate', 'Rubio — State', 'Nomination of Marco Rubio to be Secretary of State',
       'Rubio — Secretary of State',
       'Senate confirmation of Marco Rubio as Secretary of State, confirmed 99–0 — a rare unanimous cabinet confirmation, on the first day of the administration.',
       'enacted', SEN_MENU, 'U.S. Senate', '{}')
    RETURNING id INTO m_rubio;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_rubio, 'gov_balance',     100, true,  'yea_supports', 'A Senate advice-and-consent vote; a yea confirms the President''s Secretary of State.'),
      (m_rubio, 'foreign_balance',  60, false, 'yea_supports', 'Leadership of U.S. foreign policy and the State Department.'),
      (m_rubio, 'strong_defense',   45, false, 'yea_supports', 'The confirmation cleared unanimously across both parties.');

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_rubio, 'senate', 119, 1, NULL, '2025-01-20T00:00:00Z', 'On the Nomination', 'nomination', 'confirmed', 'simple',
       '{"yea":99,"nay":0,"present":0,"notVoting":1}', SEN_MENU, 'U.S. Senate')
    RETURNING id INTO rc_rubio;

    -- Unanimous — every roster senator voted yea.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_rubio, s, 'yea', 'with_party' FROM unnest(rr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_rubio, s, 'yea', 'with_party' FROM unnest(di) s ON CONFLICT DO NOTHING;

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_rubio, 'introduced', 'senate', NULL, 'Nomination received in the Senate.', SEN_MENU, 'U.S. Senate', 10),
      (m_rubio, 'enacted', 'senate', '2025-01-20T00:00:00Z', 'Confirmed by the Senate, 99–0.', SEN_MENU, 'U.S. Senate', 70);
  END IF;
END $$;
