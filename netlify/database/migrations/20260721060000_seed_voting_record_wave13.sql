-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 13: the documented Laken Riley (H.R. 29) crossovers
-- ─────────────────────────────────────────────────────────────────────────────
-- H.R. 29 (the Laken Riley Act) is one of the clearest bipartisan-crossover stories
-- of 2025: it drew Democratic yes votes in both chambers. The earlier House backfill
-- attributed the roster's Republicans but left the Democratic crossovers unattributed
-- "rather than guessed." This wave fills in the DOCUMENTED Democratic crossovers only
-- — the frontline and border/swing-state members who publicly voted yes — connecting
-- them to the bill and to the immigration / border-security Spotlights.
--
-- Data-only, additive, idempotent:
--   • Votes are added to the EXISTING roll calls (House roll 6, Senate roll 7) with
--     ON CONFLICT DO NOTHING; nothing already seeded is touched and re-applying is a
--     clean no-op.
--   • Only well-documented crossover votes are attributed — no full-roster guessing.
--   • On H.R. 29 the majority Democratic position was NAY, so a Democratic yea is
--     recorded as against_party. Politician ids match the app roster slugs.
--
-- Verified crossovers (official House Clerk / Senate record):
--   House roll 6 (264–159, 2025-01-07): Jared Golden, Marie Gluesenkamp Perez, and
--     Tom Suozzi among the Democrats voting yes.
--   Senate roll 7 (64–35, 2025-01-20): Fetterman, Gallego, Mark Kelly, Rosen, Cortez
--     Masto, Ossoff, Warnock, and Hassan among the Democrats voting yes.

DO $$
DECLARE
  rc_h6 integer;
  rc_s7 integer;
  house_cross text[] := ARRAY['jared_golden','marie_gluesenkamp_perez','tom_suozzi'];
  sen_cross text[] := ARRAY['fetterman','gallego','mark_kelly','rosen','cortez_masto','jon_ossoff','warnock','maggie_hassan'];
BEGIN
  -- ── House roll call 6 — Democratic crossovers to yea ─────────────────────────
  SELECT id INTO rc_h6 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 6 LIMIT 1;
  IF rc_h6 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_h6, s, 'yea', 'against_party' FROM unnest(house_cross) s ON CONFLICT DO NOTHING;
  END IF;

  -- ── Senate roll call 7 — Democratic crossovers to yea ────────────────────────
  SELECT id INTO rc_s7 FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7 LIMIT 1;
  IF rc_s7 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
      SELECT rc_s7, s, 'yea', 'against_party' FROM unnest(sen_cross) s ON CONFLICT DO NOTHING;
  END IF;
END $$;
