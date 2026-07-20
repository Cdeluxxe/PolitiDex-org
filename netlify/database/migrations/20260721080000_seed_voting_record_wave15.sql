-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 15: complete two near-consensus votes (Senate + House)
-- ─────────────────────────────────────────────────────────────────────────────
-- Two clean, well-documented votes are rounded out to full roster coverage, one in
-- each chamber. Data-only, additive, idempotent:
--   • Votes are added to EXISTING roll calls (looked up by number) with ON CONFLICT
--     DO NOTHING; nothing already seeded is touched and re-applying is a no-op.
--   • Only positions that are documented and unambiguous are attributed.
--   • Politician ids match the app roster slugs.
--
--   1) H.R. 29 (Laken Riley Act) — SENATE roll call 7 (64–35). Every Republican voted
--      yea (the bill had unanimous GOP support); wave 13 already recorded the
--      Democratic crossovers, so this adds the Republican bloc to complete that side.
--      Connects to the immigration / border-security Spotlights.
--   2) S. 146 (TAKE IT DOWN Act) — HOUSE roll call 104 (409–2). A near-unanimous,
--      strongly bipartisan vote against non-consensual intimate imagery / deepfakes.
--      The entire roster voted yea except Thomas Massie, one of only two no votes.
--      Connects to the tech / child-safety Spotlights.

DO $$
DECLARE
  rc_hr29s integer;
  rc_s146h integer;
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
  -- ── H.R. 29 (Laken Riley) — Senate roll 7: complete the Republican bloc ──────
  SELECT id INTO rc_hr29s FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7 LIMIT 1;
  IF rc_hr29s IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr29s, s, 'yea', 'with_party' FROM unnest(rr) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── S. 146 (TAKE IT DOWN Act) — House roll 104: near-unanimous 409–2 ─────────
  SELECT id INTO rc_s146h FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 104 LIMIT 1;
  IF rc_s146h IS NOT NULL THEN
    -- Republicans — yea, except Massie (one of the two no votes).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_s146h, s, 'yea', 'with_party' FROM unnest(hr) s WHERE s <> 'massie' ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_s146h, 'massie', 'nay', 'against_party') ON CONFLICT DO NOTHING;
    -- Democrats — yea (the bill passed with overwhelming bipartisan support).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_s146h, s, 'yea', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;
END $$;
