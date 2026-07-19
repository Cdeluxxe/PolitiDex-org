-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Senate chamber-balance backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- The Voting Record leaned House-heavy: most measures carried a House roll call,
-- but only H.R. 1 and H.R. 29 (Laken Riley) carried a Senate roll call, and those
-- had only a handful of senators recorded. This migration rebalances the chambers
-- by (1) adding a NEW Senate roll call — the Rescissions Act (H.R. 4) final
-- passage — and (2) backfilling many more roster senators onto the two existing
-- Senate roll calls, so the "what they actually did" record populates for the
-- Senate the way it already does for the House and lines up with senators'
-- curated stance cards (say-vs-do).
--
-- Changes NO schema. Inserts into vr_rollcalls and vr_member_votes only, against
-- measures already seeded by the applied voting-record migrations. Rolls forward
-- from the applied migrations; never edits one. Politician ids match the app
-- roster slugs (CMP_DATA / ISSUE_STANCE_DATA keys).
--
-- Verified facts (bill numbers, roll calls, dates and tallies from the official
-- Senate roll-call record):
--   H.R. 4  (Rescissions Act of 2025) SENATE roll call 411 — 2025-07-17, On
--     Passage (as amended), passed 51-48. Party-line: every Republican voted yea
--     EXCEPT Susan Collins (ME) and Lisa Murkowski (AK), who voted nay with every
--     Democrat; Tina Smith (D-MN) was absent (not voting). It rescinded ~$9B in
--     unobligated funds for foreign aid, USAID and public broadcasting; the House
--     re-passed the amended bill and it was signed into law.
--     (senate.gov roll_call_votes vote_119_1_00411)
--   H.R. 29 (Laken Riley Act) SENATE roll call 7 — 2025-01-20, On Passage, passed
--     64-35. Every Republican voted yea; TWELVE Democrats crossed over to vote yea.
--     Backfilled here: those twelve Democrats (yea, against party) — Fetterman,
--     Gallego, Kelly, Ossoff, Warnock, Cortez Masto, Rosen, Hassan, Shaheen,
--     Peters, Slotkin, Warner — plus the rest of the roster's Republicans (yea) and
--     the Democrats who voted nay. Ashley Moody (FL) is intentionally NOT recorded
--     here: she was appointed to Rubio's seat and seated Jan 21, 2025, the day
--     AFTER this vote. (senate.gov vote_119_1_00007)
--   H.R. 1  SENATE roll call 372 — 2025-07-01, On Passage, 50-50, passed on the
--     Vice President's tie-break. Every Democrat voted nay; three Republicans (Paul,
--     Collins, Tillis) voted nay and Murkowski voted yea — all four already recorded
--     by earlier migrations. Backfilled here: the remaining roster Republicans (yea)
--     and Democrats (nay). (senate.gov vote_119_1_00372)
--
-- Idempotent: guarded on the H.R. 4 Senate roll-call (411) sentinel, and every
-- member insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id)
-- unique index.
DO $$
DECLARE
  m_hr4   integer;
  rc_411  integer;
  rc_7    integer;
  rc_372  integer;
BEGIN
  -- Sentinel: if the H.R. 4 Senate roll call already exists, this migration ran.
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 411
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO m_hr4  FROM vr_measures  WHERE number = 'H.R. 4'  AND congress = 119 LIMIT 1;
  SELECT id INTO rc_7   FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7   LIMIT 1;
  SELECT id INTO rc_372 FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 372 LIMIT 1;

  -- ── (1) NEW Senate roll call — H.R. 4, Rescissions Act of 2025 ─────────────────
  IF m_hr4 IS NOT NULL THEN
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_hr4, 'senate', 119, 1, 411, '2025-07-17T00:00:00Z', 'On Passage of the Bill (as amended)', 'passage', 'passed', 'simple',
       '{"yea":51,"nay":48,"present":0,"notVoting":1}',
       'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00411.htm', 'U.S. Senate')
    RETURNING id INTO rc_411;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      -- Republicans — yea (party-line)
      (rc_411, 'thune', 'yea', 'with_party'),            (rc_411, 'barrasso', 'yea', 'with_party'),
      (rc_411, 'cruz', 'yea', 'with_party'),             (rc_411, 'lee', 'yea', 'with_party'),
      (rc_411, 'grassley', 'yea', 'with_party'),         (rc_411, 'hawley', 'yea', 'with_party'),
      (rc_411, 'graham', 'yea', 'with_party'),           (rc_411, 'rand_paul', 'yea', 'with_party'),
      (rc_411, 'ernst', 'yea', 'with_party'),            (rc_411, 'lankford', 'yea', 'with_party'),
      (rc_411, 'banks', 'yea', 'with_party'),            (rc_411, 'moreno', 'yea', 'with_party'),
      (rc_411, 'mullin', 'yea', 'with_party'),           (rc_411, 'ricketts', 'yea', 'with_party'),
      (rc_411, 'sheehy', 'yea', 'with_party'),           (rc_411, 'blackburn', 'yea', 'with_party'),
      (rc_411, 'rick_scott', 'yea', 'with_party'),       (rc_411, 'hagerty', 'yea', 'with_party'),
      (rc_411, 'roger_marshall', 'yea', 'with_party'),   (rc_411, 'daines', 'yea', 'with_party'),
      (rc_411, 'ron_johnson', 'yea', 'with_party'),      (rc_411, 'todd_young', 'yea', 'with_party'),
      (rc_411, 'john_cornyn', 'yea', 'with_party'),      (rc_411, 'mike_rounds', 'yea', 'with_party'),
      (rc_411, 'kevin_cramer', 'yea', 'with_party'),     (rc_411, 'hoeven', 'yea', 'with_party'),
      (rc_411, 'britt', 'yea', 'with_party'),            (rc_411, 'tommy_tuberville', 'yea', 'with_party'),
      (rc_411, 'dan_sullivan', 'yea', 'with_party'),     (rc_411, 'deb_fischer', 'yea', 'with_party'),
      (rc_411, 'jim_justice', 'yea', 'with_party'),      (rc_411, 'lummis', 'yea', 'with_party'),
      (rc_411, 'kennedy_john', 'yea', 'with_party'),     (rc_411, 'schmitt', 'yea', 'with_party'),
      (rc_411, 'ted_budd', 'yea', 'with_party'),         (rc_411, 'mccormick', 'yea', 'with_party'),
      (rc_411, 'tillis', 'yea', 'with_party'),           (rc_411, 'ashley_moody', 'yea', 'with_party'),
      -- Republicans — nay (broke with party)
      (rc_411, 'collins', 'nay', 'against_party'),       (rc_411, 'murkowski', 'nay', 'against_party'),
      -- Democrats / Independents — nay (party-line)
      (rc_411, 'schumer', 'nay', 'with_party'),          (rc_411, 'durbin', 'nay', 'with_party'),
      (rc_411, 'warren', 'nay', 'with_party'),           (rc_411, 'booker', 'nay', 'with_party'),
      (rc_411, 'wyden', 'nay', 'with_party'),            (rc_411, 'klobuchar', 'nay', 'with_party'),
      (rc_411, 'warnock', 'nay', 'with_party'),          (rc_411, 'jon_ossoff', 'nay', 'with_party'),
      (rc_411, 'gallego', 'nay', 'with_party'),          (rc_411, 'mark_kelly', 'nay', 'with_party'),
      (rc_411, 'rosen', 'nay', 'with_party'),            (rc_411, 'cortez_masto', 'nay', 'with_party'),
      (rc_411, 'slotkin', 'nay', 'with_party'),          (rc_411, 'peters', 'nay', 'with_party'),
      (rc_411, 'maggie_hassan', 'nay', 'with_party'),    (rc_411, 'shaheen', 'nay', 'with_party'),
      (rc_411, 'warner', 'nay', 'with_party'),           (rc_411, 'kaine', 'nay', 'with_party'),
      (rc_411, 'bennet', 'nay', 'with_party'),           (rc_411, 'hickenlooper', 'nay', 'with_party'),
      (rc_411, 'welch', 'nay', 'with_party'),            (rc_411, 'padilla', 'nay', 'with_party'),
      (rc_411, 'schiff', 'nay', 'with_party'),           (rc_411, 'gillibrand', 'nay', 'with_party'),
      (rc_411, 'blumenthal', 'nay', 'with_party'),       (rc_411, 'chris_murphy', 'nay', 'with_party'),
      (rc_411, 'coons', 'nay', 'with_party'),            (rc_411, 'blunt_rochester', 'nay', 'with_party'),
      (rc_411, 'alsobrooks', 'nay', 'with_party'),       (rc_411, 'andy_kim', 'nay', 'with_party'),
      (rc_411, 'hirono', 'nay', 'with_party'),           (rc_411, 'schatz', 'nay', 'with_party'),
      (rc_411, 'van_hollen', 'nay', 'with_party'),       (rc_411, 'duckworth', 'nay', 'with_party'),
      (rc_411, 'tammy_baldwin', 'nay', 'with_party'),    (rc_411, 'markey', 'nay', 'with_party'),
      (rc_411, 'merkley', 'nay', 'with_party'),          (rc_411, 'angus_king', 'nay', 'with_party'),
      -- Democrat — absent
      (rc_411, 'tina_smith', 'not_voting', NULL)
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── (2) Backfill the existing Laken Riley Senate roll call (H.R. 29, roll 7) ───
  IF rc_7 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      -- The twelve Democrats who crossed over to vote yea
      (rc_7, 'fetterman', 'yea', 'against_party'),       (rc_7, 'gallego', 'yea', 'against_party'),
      (rc_7, 'mark_kelly', 'yea', 'against_party'),      (rc_7, 'jon_ossoff', 'yea', 'against_party'),
      (rc_7, 'warnock', 'yea', 'against_party'),         (rc_7, 'cortez_masto', 'yea', 'against_party'),
      (rc_7, 'rosen', 'yea', 'against_party'),           (rc_7, 'maggie_hassan', 'yea', 'against_party'),
      (rc_7, 'shaheen', 'yea', 'against_party'),         (rc_7, 'peters', 'yea', 'against_party'),
      (rc_7, 'slotkin', 'yea', 'against_party'),         (rc_7, 'warner', 'yea', 'against_party'),
      -- Additional Republicans — yea (party-line); Moody not yet seated, so excluded
      (rc_7, 'thune', 'yea', 'with_party'),              (rc_7, 'barrasso', 'yea', 'with_party'),
      (rc_7, 'ernst', 'yea', 'with_party'),              (rc_7, 'lankford', 'yea', 'with_party'),
      (rc_7, 'banks', 'yea', 'with_party'),              (rc_7, 'moreno', 'yea', 'with_party'),
      (rc_7, 'mullin', 'yea', 'with_party'),             (rc_7, 'ricketts', 'yea', 'with_party'),
      (rc_7, 'sheehy', 'yea', 'with_party'),             (rc_7, 'blackburn', 'yea', 'with_party'),
      (rc_7, 'rick_scott', 'yea', 'with_party'),         (rc_7, 'hagerty', 'yea', 'with_party'),
      (rc_7, 'roger_marshall', 'yea', 'with_party'),     (rc_7, 'daines', 'yea', 'with_party'),
      (rc_7, 'ron_johnson', 'yea', 'with_party'),        (rc_7, 'todd_young', 'yea', 'with_party'),
      (rc_7, 'john_cornyn', 'yea', 'with_party'),        (rc_7, 'mike_rounds', 'yea', 'with_party'),
      (rc_7, 'kevin_cramer', 'yea', 'with_party'),       (rc_7, 'hoeven', 'yea', 'with_party'),
      (rc_7, 'britt', 'yea', 'with_party'),              (rc_7, 'tommy_tuberville', 'yea', 'with_party'),
      (rc_7, 'dan_sullivan', 'yea', 'with_party'),       (rc_7, 'deb_fischer', 'yea', 'with_party'),
      (rc_7, 'jim_justice', 'yea', 'with_party'),        (rc_7, 'lummis', 'yea', 'with_party'),
      (rc_7, 'kennedy_john', 'yea', 'with_party'),       (rc_7, 'schmitt', 'yea', 'with_party'),
      (rc_7, 'ted_budd', 'yea', 'with_party'),           (rc_7, 'mccormick', 'yea', 'with_party'),
      (rc_7, 'collins', 'yea', 'with_party'),            (rc_7, 'murkowski', 'yea', 'with_party'),
      (rc_7, 'tillis', 'yea', 'with_party'),
      -- Democrats — nay (party-line)
      (rc_7, 'schumer', 'nay', 'with_party'),            (rc_7, 'durbin', 'nay', 'with_party'),
      (rc_7, 'booker', 'nay', 'with_party'),             (rc_7, 'wyden', 'nay', 'with_party'),
      (rc_7, 'klobuchar', 'nay', 'with_party'),          (rc_7, 'chris_murphy', 'nay', 'with_party'),
      (rc_7, 'kaine', 'nay', 'with_party'),              (rc_7, 'schiff', 'nay', 'with_party'),
      (rc_7, 'coons', 'nay', 'with_party'),              (rc_7, 'gillibrand', 'nay', 'with_party'),
      (rc_7, 'bennet', 'nay', 'with_party'),             (rc_7, 'hickenlooper', 'nay', 'with_party'),
      (rc_7, 'welch', 'nay', 'with_party'),              (rc_7, 'tina_smith', 'nay', 'with_party'),
      (rc_7, 'andy_kim', 'nay', 'with_party'),           (rc_7, 'hirono', 'nay', 'with_party'),
      (rc_7, 'blumenthal', 'nay', 'with_party'),         (rc_7, 'merkley', 'nay', 'with_party'),
      (rc_7, 'markey', 'nay', 'with_party'),             (rc_7, 'angus_king', 'nay', 'with_party'),
      (rc_7, 'schatz', 'nay', 'with_party'),             (rc_7, 'van_hollen', 'nay', 'with_party'),
      (rc_7, 'padilla', 'nay', 'with_party'),            (rc_7, 'duckworth', 'nay', 'with_party'),
      (rc_7, 'tammy_baldwin', 'nay', 'with_party'),      (rc_7, 'blunt_rochester', 'nay', 'with_party'),
      (rc_7, 'alsobrooks', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── (3) Backfill the existing H.R. 1 Senate roll call (roll 372) ───────────────
  IF rc_372 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      -- Additional Republicans — yea (party-line)
      (rc_372, 'ernst', 'yea', 'with_party'),            (rc_372, 'lankford', 'yea', 'with_party'),
      (rc_372, 'banks', 'yea', 'with_party'),            (rc_372, 'moreno', 'yea', 'with_party'),
      (rc_372, 'mullin', 'yea', 'with_party'),           (rc_372, 'ricketts', 'yea', 'with_party'),
      (rc_372, 'sheehy', 'yea', 'with_party'),           (rc_372, 'blackburn', 'yea', 'with_party'),
      (rc_372, 'rick_scott', 'yea', 'with_party'),       (rc_372, 'hagerty', 'yea', 'with_party'),
      (rc_372, 'roger_marshall', 'yea', 'with_party'),   (rc_372, 'daines', 'yea', 'with_party'),
      (rc_372, 'ron_johnson', 'yea', 'with_party'),      (rc_372, 'todd_young', 'yea', 'with_party'),
      (rc_372, 'john_cornyn', 'yea', 'with_party'),      (rc_372, 'mike_rounds', 'yea', 'with_party'),
      (rc_372, 'kevin_cramer', 'yea', 'with_party'),     (rc_372, 'hoeven', 'yea', 'with_party'),
      (rc_372, 'britt', 'yea', 'with_party'),            (rc_372, 'tommy_tuberville', 'yea', 'with_party'),
      (rc_372, 'dan_sullivan', 'yea', 'with_party'),     (rc_372, 'deb_fischer', 'yea', 'with_party'),
      (rc_372, 'jim_justice', 'yea', 'with_party'),      (rc_372, 'lummis', 'yea', 'with_party'),
      (rc_372, 'kennedy_john', 'yea', 'with_party'),     (rc_372, 'schmitt', 'yea', 'with_party'),
      (rc_372, 'ted_budd', 'yea', 'with_party'),         (rc_372, 'mccormick', 'yea', 'with_party'),
      (rc_372, 'ashley_moody', 'yea', 'with_party'),
      -- Additional Democrats / Independents — nay (party-line)
      (rc_372, 'warnock', 'nay', 'with_party'),          (rc_372, 'jon_ossoff', 'nay', 'with_party'),
      (rc_372, 'gallego', 'nay', 'with_party'),          (rc_372, 'mark_kelly', 'nay', 'with_party'),
      (rc_372, 'rosen', 'nay', 'with_party'),            (rc_372, 'cortez_masto', 'nay', 'with_party'),
      (rc_372, 'slotkin', 'nay', 'with_party'),          (rc_372, 'peters', 'nay', 'with_party'),
      (rc_372, 'maggie_hassan', 'nay', 'with_party'),    (rc_372, 'shaheen', 'nay', 'with_party'),
      (rc_372, 'warner', 'nay', 'with_party'),           (rc_372, 'kaine', 'nay', 'with_party'),
      (rc_372, 'bennet', 'nay', 'with_party'),           (rc_372, 'hickenlooper', 'nay', 'with_party'),
      (rc_372, 'welch', 'nay', 'with_party'),            (rc_372, 'padilla', 'nay', 'with_party'),
      (rc_372, 'schiff', 'nay', 'with_party'),           (rc_372, 'gillibrand', 'nay', 'with_party'),
      (rc_372, 'blumenthal', 'nay', 'with_party'),       (rc_372, 'chris_murphy', 'nay', 'with_party'),
      (rc_372, 'coons', 'nay', 'with_party'),            (rc_372, 'blunt_rochester', 'nay', 'with_party'),
      (rc_372, 'alsobrooks', 'nay', 'with_party'),       (rc_372, 'andy_kim', 'nay', 'with_party'),
      (rc_372, 'hirono', 'nay', 'with_party'),           (rc_372, 'schatz', 'nay', 'with_party'),
      (rc_372, 'van_hollen', 'nay', 'with_party'),       (rc_372, 'duckworth', 'nay', 'with_party'),
      (rc_372, 'tammy_baldwin', 'nay', 'with_party'),    (rc_372, 'markey', 'nay', 'with_party'),
      (rc_372, 'merkley', 'nay', 'with_party'),          (rc_372, 'angus_king', 'nay', 'with_party'),
      (rc_372, 'tina_smith', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;
END $$;
