-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 14: complete the flagship's House roster (H.R. 1 roll 190)
-- ─────────────────────────────────────────────────────────────────────────────
-- H.R. 1 (the One Big Beautiful Bill Act) now carries a full Senate roster (wave 11);
-- this fills in the remaining roster U.S. House members on its final House concurrence
-- vote (roll call 190, 218–214, 2025-07-03), so the flagship omnibus lines up on every
-- roster member's Voting Record tab in BOTH chambers — the strongest single
-- profile ↔ bill ↔ Spotlight connection in the dataset.
--
-- Data-only, additive, idempotent:
--   • Votes are added to the EXISTING roll call with ON CONFLICT DO NOTHING; the
--     leadership and earlier House backfills are never touched and re-applying is a
--     clean no-op.
--   • Politician ids match the app roster slugs.
--
-- Documented pattern (official U.S. House Clerk record, roll 190): every Republican
-- voted yea EXCEPT Brian Fitzpatrick and Thomas Massie (recorded against-party); every
-- Democrat voted nay.

DO $$
DECLARE
  rc_190 integer;
  hr text[] := ARRAY['chip_roy','dan_crenshaw','donalds','don_bacon','fitzpatrick','kevin_hern','luna',
    'massie','mcclain','mike_lawler','nancy_mace','stefanik'];
  hd text[] := ARRAY['ayanna_pressley','brendan_boyle','clyburn','dan_goldman','debbie_dingell','delia_ramirez',
    'diana_degette','greg_landsman','jake_auchincloss','jan_schakowsky','jared_golden','jayapal','jim_mcgovern',
    'josh_gottheimer','marie_gluesenkamp_perez','maxwell_frost','nadler','omar','raja_krishnamoorthi','rick_larsen',
    'sarah_mcbride','seth_moulton','steny_hoyer','summer_lee','tlaib','tom_suozzi','torres'];
BEGIN
  SELECT id INTO rc_190 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 190 LIMIT 1;
  IF rc_190 IS NOT NULL THEN
    -- Republicans — yea, except the two who voted no.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_190, s, 'yea', 'with_party' FROM unnest(hr) s
      WHERE s NOT IN ('fitzpatrick','massie') ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_190, s, 'nay', 'against_party' FROM unnest(hr) s
      WHERE s IN ('fitzpatrick','massie') ON CONFLICT DO NOTHING;
    -- Democrats — nay (party-line).
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_190, s, 'nay', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;
END $$;
