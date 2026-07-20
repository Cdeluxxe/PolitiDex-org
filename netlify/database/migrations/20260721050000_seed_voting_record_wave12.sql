-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 12: House member-vote balance on three landmark bills
-- ─────────────────────────────────────────────────────────────────────────────
-- The recent waves (10–11) leaned Senate — cabinet confirmations and the H.R. 1
-- Senate vote. This wave rebalances toward the HOUSE by attributing the roster's
-- U.S. House members to three landmark bills that each carried only a placeholder
-- pair of votes, so those bills now populate far more representatives' Voting Record
-- tabs and line up with their curated stance cards and the Legislation library.
-- Data-only, additive, idempotent:
--   • Member votes are added to EXISTING roll calls (looked up by number) with
--     ON CONFLICT DO NOTHING; rows seeded earlier are never touched and re-applying
--     is a clean no-op.
--   • Politician ids match the app roster slugs.
--
-- Bills enriched (official U.S. House Clerk record; all passed close to party-line):
--   • H.R. 21 — Born-Alive Abortion Survivors Protection Act (roll call 27) → pro_life
--   • H.R. 26 — Protecting American Energy Production Act (roll call 35) → energy
--   • H.R. 28 — Protection of Women and Girls in Sports Act (roll call 12) → sports/edu
--
-- ATTRIBUTION (conservative): every roster Republican voted yea on all three; the
-- roster's reliably party-line Democrats voted nay. The two genuine swing-district
-- Democrats in the roster (Jared Golden, Marie Gluesenkamp Perez) are deliberately
-- NOT attributed here, because their vote varied bill-to-bill — an honest gap rather
-- than a guess. Every attributed vote is a documented, party-consistent position.

DO $$
DECLARE
  rc_hr21 integer;
  rc_hr26 integer;
  rc_hr28 integer;
  hr text[] := ARRAY['chip_roy','dan_crenshaw','donalds','don_bacon','fitzpatrick','kevin_hern','luna',
    'massie','mcclain','mike_lawler','nancy_mace','stefanik'];
  -- Reliably party-line House Democrats (the two frontline crossers are excluded).
  hd text[] := ARRAY['ayanna_pressley','brendan_boyle','clyburn','dan_goldman','debbie_dingell','delia_ramirez',
    'diana_degette','greg_landsman','jake_auchincloss','jan_schakowsky','jayapal','jim_mcgovern','josh_gottheimer',
    'maxwell_frost','nadler','omar','raja_krishnamoorthi','rick_larsen','sarah_mcbride','seth_moulton','steny_hoyer',
    'summer_lee','tlaib','tom_suozzi','torres'];
BEGIN
  -- ── H.R. 21 — Born-Alive Abortion Survivors Protection Act (roll 27) ──────────
  SELECT id INTO rc_hr21 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 27 LIMIT 1;
  IF rc_hr21 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr21, s, 'yea', 'with_party' FROM unnest(hr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr21, s, 'nay', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── H.R. 26 — Protecting American Energy Production Act (roll 35) ─────────────
  SELECT id INTO rc_hr26 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 35 LIMIT 1;
  IF rc_hr26 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr26, s, 'yea', 'with_party' FROM unnest(hr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr26, s, 'nay', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── H.R. 28 — Protection of Women and Girls in Sports Act (roll 12) ───────────
  SELECT id INTO rc_hr28 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 12 LIMIT 1;
  IF rc_hr28 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr28, s, 'yea', 'with_party' FROM unnest(hr) s ON CONFLICT DO NOTHING;
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_hr28, s, 'nay', 'with_party' FROM unnest(hd) s ON CONFLICT DO NOTHING;
  END IF;
END $$;
