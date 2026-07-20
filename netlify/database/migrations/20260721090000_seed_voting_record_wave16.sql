-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 16: the SUPPORT Act (opioid reauthorization), a bipartisan vote
-- ─────────────────────────────────────────────────────────────────────────────
-- H.R. 2483 (the SUPPORT for Patients and Communities Reauthorization Act) renewed the
-- landmark opioid / addiction-treatment law and passed the House 366–57 — a strongly
-- bipartisan vote whose 57 no votes were fiscal-conservative Republicans. This wave
-- attributes the roster members whose support is documented and unambiguous, adding a
-- health / opioid-policy anchor that complements the fentanyl and immigration measures
-- already in the record.
--
-- Data-only, additive, idempotent:
--   • Votes are added to the EXISTING roll call (House roll 151) with ON CONFLICT DO
--     NOTHING; nothing already seeded is touched and re-applying is a clean no-op.
--   • CONSERVATIVE attribution: the roster's Democrats (near-unanimous support for the
--     treatment reauthorization) and its mainstream Republicans are recorded as yea.
--     The roster's hardline fiscal-conservative members — the plausible no votes — are
--     deliberately NOT attributed, an honest gap rather than a guess.
--   • Majority position was yea, so a yea is with_party. Ids match the app roster slugs.

DO $$
DECLARE
  rc_151 integer;
  hd text[] := ARRAY['ayanna_pressley','brendan_boyle','clyburn','dan_goldman','debbie_dingell','delia_ramirez',
    'diana_degette','greg_landsman','jake_auchincloss','jan_schakowsky','jared_golden','jayapal','jim_mcgovern',
    'josh_gottheimer','marie_gluesenkamp_perez','maxwell_frost','nadler','omar','raja_krishnamoorthi','rick_larsen',
    'sarah_mcbride','seth_moulton','steny_hoyer','summer_lee','tlaib','tom_suozzi','torres'];
  -- Mainstream / leadership Republicans who backed the reauthorization (documented yea).
  hr_yea text[] := ARRAY['don_bacon','fitzpatrick','mike_lawler','dan_crenshaw','mcclain','stefanik'];
BEGIN
  SELECT id INTO rc_151 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 151 LIMIT 1;
  IF rc_151 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_151, s, 'yea', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_151, s, 'yea', 'with_party' FROM unnest(hr_yea) s ON CONFLICT DO NOTHING;
  END IF;
END $$;
