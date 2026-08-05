-- ═══════════════════════════════════════════════════════════════════════════
-- Epstein Files Transparency Act — cosponsor resolution + roster expansion votes
-- ═══════════════════════════════════════════════════════════════════════════
--
-- H.R. 4405 (119th, P.L. 119-38) carries twenty-five names: one sponsor and
-- twenty-four cosponsors, most of them recorded in July 2025, four months before the
-- House voted 427-1 under suspension. That 427-1 roll confirms a stated transparency
-- position and separates almost nobody; the cosponsorship list is the part that
-- separates. 20260820000000_vr_landmark_enacted_law_rollcalls.sql could resolve four
-- of the twenty-five through db/vr-member-map.json and skipped the rest rather than
-- guessing. This migration carries the three that a second pass could resolve.
--
-- WHAT 'RESOLVED' MEANS HERE. A cosponsor reaches a politician_id only through
-- db/vr-member-map.json, which scripts/vr-gen-member-map.mjs derives from the Bioguide
-- embedded in each curated portrait URL and scopes to db/vr-roster-admitted.json. So
-- resolvable means the app already profiles this member. Being named on Congress.gov is
-- not enough: a slug minted for a cosponsor would be a profile holding one sponsorship
-- row, no stated position to test it against and no face — which is the guess the
-- fail-closed rule exists to prevent.
--
-- NEWLY RESOLVED (admitted in db/vr-roster-admitted.json wave epstein_cosponsors_aug2026):
--   M000312  jim_mcgovern   Rep. James P. McGovern (D-MA-2)
--   M001196  seth_moulton   Rep. Seth Moulton (D-MA-6)
--   G000598  robert_garcia  Rep. Robert Garcia (D-CA-42)
--   All three already had published stance cards and ZERO attributable votes before
--   this pass — the largest possible gap between stated and testable positions. Rep.
--   Robert Garcia is Ranking Member of the Committee on Oversight and Government
--   Reform, the committee whose jurisdiction this bill concerns.
--
-- DECLINED — 18 cosponsors, credited to nobody:
--   S001200  Rep. Soto, Darren (D-FL-9), joined 2025-07-16
--   L000562  Rep. Lynch, Stephen F. (D-MA-8), joined 2025-07-16
--   A000381  Rep. Ansari, Yassamin (D-AZ-3), joined 2025-07-17
--   T000488  Rep. Thanedar, Shri (D-MI-13), joined 2025-07-17
--   J000288  Rep. Johnson, Henry C. "Hank" (D-GA-4), joined 2025-07-17
--   S000344  Rep. Sherman, Brad (D-CA-32), joined 2025-07-17
--   B001324  Rep. Bell, Wesley (D-MO-1), joined 2025-07-21
--   O000176  Rep. Olszewski, Johnny (D-MD-2), joined 2025-07-21
--   P000197  Rep. Pelosi, Nancy (D-CA-11), joined 2025-07-22
--   D000530  Rep. Deluzio, Christopher R. (D-PA-17), joined 2025-07-22
--   N000147  Del. Norton, Eleanor Holmes (D-DC-AL), joined 2025-07-23
--   M000687  Rep. Mfume, Kweisi (D-MD-7), joined 2025-07-23
--   D000096  Rep. Davis, Danny K. (D-IL-7), joined 2025-07-23
--   S001205  Rep. Scanlon, Mary Gay (D-PA-5), joined 2025-07-29
--   F000481  Rep. Figures, Shomari (D-AL-2), joined 2025-07-29
--   M001223  Rep. Magaziner, Seth (D-RI-2), joined 2025-08-08
--   D000635  Rep. Dexter, Maxine (D-OR-3), joined 2025-08-22
--   H001090  Rep. Harder, Josh (D-CA-9), joined 2025-10-24
--   None has a curated portrait under any URL form, and none appears in any compare
--   card, spotlight or stance block. There is no roster figure to credit. That includes
--   Speaker Emerita Pelosi, the most prominent name this pass declines — declined for
--   exactly the same reason as the other seventeen, not a different one.
--
-- ADDITIVE AND IDEMPOTENT. Two kinds of row only: vr_positions cosponsorship rows for
-- the full resolved set, and vr_member_votes on the two rolls the expansion unlocked.
-- Both re-assert the complete set rather than a delta, both under ON CONFLICT DO
-- NOTHING, so what the earlier migrations wrote conflicts away and only the new rows
-- land. No measure, roll call or issue row is created or altered here — every one is
-- looked up and a missing one RAISEs, because a row invented here would hold none of
-- the verified question, tally, summary or source the earlier migrations attached.
--
-- ORDERING. Requires 20260820000000_vr_landmark_enacted_law_rollcalls.sql (H.R. 4405,
-- house 119/1/289) and 20260821000000_vr_secure_america_act_rollcalls.sql (S. 2,
-- house 119/2/214). Both sort before this file.
--
-- Source of truth: db/vr-epstein-cosponsor-vote-seed.json, built by scripts/vr-build-epstein-cosponsor-seed.mjs from
-- the bill's own BILLSTATUS feed (isOriginalCosponsor and sponsorshipDate read from the
-- record, never inferred from a date) and the House Clerk's roll-call XML, re-verified
-- on <legis-num> and <vote-question> with the chamber tally read from <totals-by-vote>.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE m_hr4405 bigint;
BEGIN
  SELECT id INTO m_hr4405 FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 4405'
   ORDER BY id LIMIT 1;
  IF m_hr4405 IS NULL THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: H.R. 4405 (119th) is missing — 20260820000000_vr_landmark_enacted_law_rollcalls.sql must run first; this migration never creates the measure because it holds none of its verified summary, status or public-law citation';
  END IF;

  -- The full resolved set of names on the bill. The first four are already live from
  -- the landmark migration and conflict away; the rest are this pass's addition.
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Rep. Khanna, Ro (D-CA-17)
    (m_hr4405, 'khanna', 'sponsor', true, TIMESTAMPTZ '2025-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Lead sponsor. Introduced H.R. 4405 on 2025-07-15, four months before the House voted on it.'),
    -- Rep. Massie, Thomas (R-KY-4)
    (m_hr4405, 'massie', 'cosponsor', true, TIMESTAMPTZ '2025-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-07-15.'),
    -- Rep. McGovern, James P. (D-MA-2)  ← new this pass
    (m_hr4405, 'jim_mcgovern', 'cosponsor', true, TIMESTAMPTZ '2025-07-17T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Cosponsor, joined 2025-07-17.'),
    -- Rep. Omar, Ilhan (D-MN-5)
    (m_hr4405, 'omar', 'cosponsor', true, TIMESTAMPTZ '2025-07-17T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Cosponsor, joined 2025-07-17.'),
    -- Rep. Moulton, Seth (D-MA-6)  ← new this pass
    (m_hr4405, 'seth_moulton', 'cosponsor', true, TIMESTAMPTZ '2025-07-22T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Cosponsor, joined 2025-07-22.'),
    -- Rep. Smith, Adam (D-WA-9)
    (m_hr4405, 'adam_smith', 'cosponsor', true, TIMESTAMPTZ '2025-07-23T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Cosponsor, joined 2025-07-23.'),
    -- Rep. Garcia, Robert (D-CA-42)  ← new this pass
    (m_hr4405, 'robert_garcia', 'cosponsor', true, TIMESTAMPTZ '2025-08-22T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors', 'Cosponsor, joined 2025-08-22.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

DO $$
DECLARE rc bigint;
BEGIN

  -- house 119/1 roll 289 — H.R. 4405: On Motion to Suspend the Rules and Pass
  --   427-1, 60 roster attribution(s) · U.S. House Clerk
  --   created by 20260820000000_vr_landmark_enacted_law_rollcalls.sql
  --   new here: jim_mcgovern yea, robert_garcia yea, seth_moulton yea
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1
     AND roll_number = 289;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: house 119/1 roll 289 is missing — 20260820000000_vr_landmark_enacted_law_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'bmoore', 'yea', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'jim_mcgovern', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'julie_fedorchak', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'kennedy', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'yea', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mtg', 'yea', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'rob_bresnahan', 'yea', 'with_party'),
    (rc, 'robert_garcia', 'yea', 'with_party'),
    (rc, 'ryan_mackenzie', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'seth_moulton', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'not_voting', NULL),
    (rc, 'summer_lee', 'yea', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party'),
    (rc, 'troy_downing', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 119/2 roll 214 — S. 2: On Passage
  --   214-212, 59 roster attribution(s) · U.S. House Clerk
  --   created by 20260821000000_vr_secure_america_act_rollcalls.sql
  --   new here: jim_mcgovern nay, robert_garcia nay, seth_moulton nay
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 2
     AND roll_number = 214;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: house 119/2 roll 214 is missing — 20260821000000_vr_secure_america_act_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'with_party'),
    (rc, 'aoc', 'nay', 'with_party'),
    (rc, 'bennie_thompson', 'nay', 'with_party'),
    (rc, 'bmoore', 'yea', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'nay', 'with_party'),
    (rc, 'dan_goldman', 'nay', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'nay', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'greg_landsman', 'nay', 'with_party'),
    (rc, 'haley_stevens', 'nay', 'with_party'),
    (rc, 'jake_auchincloss', 'nay', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'with_party'),
    (rc, 'jeffries', 'nay', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'jim_mcgovern', 'nay', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'nay', 'with_party'),
    (rc, 'julie_fedorchak', 'yea', 'with_party'),
    (rc, 'kclark', 'nay', 'with_party'),
    (rc, 'kennedy', 'yea', 'with_party'),
    (rc, 'khanna', 'nay', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'yea', 'with_party'),
    (rc, 'maxine_waters', 'nay', 'with_party'),
    (rc, 'meeks', 'nay', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'omar', 'nay', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'rob_bresnahan', 'yea', 'with_party'),
    (rc, 'robert_garcia', 'nay', 'with_party'),
    (rc, 'ryan_mackenzie', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'seth_moulton', 'nay', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'nay', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'nay', 'with_party'),
    (rc, 'torres', 'nay', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party'),
    (rc, 'troy_downing', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;

-- ── Verification ─────────────────────────────────────────────────────────
DO $$
DECLARE n_rolls integer; n_votes integer; n_orphan integer; n_pos integer;
        n_new_pos integer; n_new_votes integer; n_mapped integer;
BEGIN
  WITH want (chamber, congress, session, roll_number) AS (VALUES
    ('house'::text, 119::integer, 1::integer, 289::integer),
    ('house'::text, 119::integer, 2::integer, 214::integer)
  ), roll_ids AS (
    SELECT r.id FROM vr_rollcalls r JOIN want w
      ON r.chamber = w.chamber AND r.congress = w.congress
     AND r.session = w.session AND r.roll_number = w.roll_number
  ), m AS (
    SELECT id FROM vr_measures WHERE congress = 119
      AND chamber = 'house' AND number = 'H.R. 4405'
     ORDER BY id LIMIT 1
  )
  SELECT (SELECT count(*) FROM roll_ids),
         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),
         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)
            AND v.politician_id NOT IN ('adam_smith', 'andy_kim', 'aoc', 'barrasso', 'bennie_thompson', 'bmoore', 'boebert', 'booker', 'brian_mast', 'britt', 'bruce_westerman', 'chris_murphy', 'collins', 'crockett', 'cruz', 'cstewart', 'curtis', 'dan_goldman', 'don_bacon', 'don_davis', 'durbin', 'emmer', 'ernst', 'fetterman', 'frank_lucas', 'french_hill', 'gaetz', 'gallego', 'graham', 'grassley', 'greg_landsman', 'haley_stevens', 'hawley', 'jake_auchincloss', 'jason_smith', 'jayapal', 'jeffries', 'jim_jordan', 'jim_mcgovern', 'john_cornyn', 'jon_ossoff', 'josh_brecheen', 'josh_gottheimer', 'julie_fedorchak', 'kaine', 'kclark', 'kennedy', 'kennedy_john', 'khanna', 'lankford', 'lee', 'mariannette_miller_meeks', 'mark_kelly', 'massie', 'maxine_waters', 'mcconnell', 'meeks', 'michael_guest', 'mike_collins', 'mike_ezell', 'mike_flood', 'mike_johnson', 'mike_lawler', 'mike_simpson', 'mike_waltz', 'mtg', 'murkowski', 'omar', 'owens', 'rand_paul', 'reed', 'rick_crawford', 'risch', 'rob_bresnahan', 'robert_garcia', 'rosen', 'rubio', 'ryan_mackenzie', 'sanders', 'scalise', 'schiff', 'schumer', 'scott_perry', 'seth_moulton', 'shaheen', 'slotkin', 'stefanik', 'steny_hoyer', 'stephanie_bice', 'steve_womack', 'summer_lee', 'tgabbard', 'thune', 'tim_scott', 'tlaib', 'tom_cole', 'tom_suozzi', 'torres', 'trent_kelly', 'troy_downing', 'van_hollen', 'warnock', 'warren', 'zeldin')),
         (SELECT count(*) FROM vr_positions p WHERE p.measure_id IN (SELECT id FROM m)
            AND p.action_type IN ('sponsor', 'cosponsor')),
         (SELECT count(*) FROM vr_positions p WHERE p.measure_id IN (SELECT id FROM m)
            AND p.politician_id IN ('jim_mcgovern', 'seth_moulton', 'robert_garcia')),
         (SELECT count(DISTINCT v.politician_id) FROM vr_member_votes v
           WHERE v.rollcall_id IN (SELECT id FROM roll_ids)
            AND v.politician_id IN ('jim_mcgovern', 'seth_moulton', 'robert_garcia')),
         (SELECT count(*) FROM vr_measure_issues i WHERE i.measure_id IN (SELECT id FROM m)
            AND i.issue_key = 'gov_transparency')
    INTO n_rolls, n_votes, n_orphan, n_pos, n_new_pos, n_new_votes, n_mapped;

  RAISE NOTICE 'Epstein cosponsor pass: % roll calls, % member votes, % sponsorship rows (% newly resolved), % newly attributed member(s)',
    n_rolls, n_votes, n_pos, n_new_pos, n_new_votes;
  IF n_rolls <> 2 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: expected 2 roll calls, found %', n_rolls;
  END IF;
  IF n_votes < 119 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: expected at least 119 member votes on these rolls, found % — the expansion did not land', n_votes;
  END IF;
  IF n_pos <> 7 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: expected 7 sponsorship rows on H.R. 4405, found %', n_pos;
  END IF;
  IF n_new_pos <> 3 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: expected 3 newly resolved cosponsor row(s), found % — the whole point of this migration', n_new_pos;
  END IF;
  IF n_new_votes <> 3 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: 3 newly admitted member(s) should each carry votes on these rolls, but only % do', n_new_votes;
  END IF;
  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: % member vote(s) carry a politician_id outside the ingest roster', n_orphan;
  END IF;
  IF n_mapped < 1 THEN
    RAISE EXCEPTION 'Epstein cosponsor pass: H.R. 4405 carries no gov_transparency mapping — the cosponsorship rows would score nothing';
  END IF;
END $$;
