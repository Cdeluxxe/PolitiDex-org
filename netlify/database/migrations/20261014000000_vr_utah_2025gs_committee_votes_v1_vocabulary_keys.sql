-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah 2025 committee votes as formal acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS RESTATES. 17 committee votes — 3 committee actions on 3 bills
-- already in the formal lane for 2025GS — re-emitted in full so the rows that are
-- genuinely new can land. Whatever the database already holds is a no-op; how many of
-- these rows are new depends on which 2025GS committee migrations have been applied,
-- which is a fact about the database and not about this file, so no count is claimed
-- for it here. They are written as
-- vr_positions rows with action_type = 'committee_vote'. That action type already
-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";
-- nothing about weights, labels or floors is changed by this file.
--
-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call
-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a
-- space the floor already owns. vr_positions has no roll_number column at all, so
-- these 17 rows cannot collide with any floor roll number, in this session or
-- another. The meeting is identified in each row's note and source URL instead.
--
-- AND IT DOES NOT DOUBLE COUNT. 10 of these rows belong to a member
-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every
-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts
-- leaves those rows out of the coverage count for the same reason. They are written
-- because they happened, not to add depth: the depth this file adds is the other
-- 7 rows, where the committee record is the only record of that member on
-- that bill.
--
-- WHAT IS NOT HERE. No measures and no issue mappings: a committee act reuses the
-- parent bill's reviewed keys, and a bill with no reviewed mapping is refused rather
-- than mapped on the strength of a committee vote. No sponsorships. No absences —
-- an absence is not a recorded position. No procedural motions (amend, replace,
-- hold, calendar): vr_positions has no field for an inverted direction, so a motion
-- whose yea does not mean "advance this bill" is left out rather than guessed at.
-- 10 later reprints of a committee's own vote on the same bill are dropped, so a
-- member holds one committee act per bill. And no near-unanimous committee vote: the
-- same 10%-minority bar the floor roll calls were selected under applies here, which
-- is why 3 bills are represented and not the 46 that had a committee vote at all.
--
-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date; they do not
-- timestamp the individual motion. acted_at is therefore that date at midnight
-- Mountain Standard Time, which is the session's own clock, rather than a guess at
-- the hour taken from the meeting's start time.
--
-- SOURCES. Every row carries the published minutes PDF it was confirmed against.
--   committees        https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=2025
--   meetings          https://le.utah.gov/committee/getMeetingInfo.jsp?com=<COM>&yr=2025
--   one meeting       https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=<ID>
--   minutes, machine  https://le.utah.gov/MtgMinutes/PublicMinutes
--                       ?requestType=getMeetingInfo&meetingID=<ID>
--   minutes, PDF      https://le.utah.gov/interim/2025/pdf/<N>.pdf
--
-- REPRODUCING IT. scripts/vr-utah-committee-ingest.mjs --survey --session 2025GS
-- (network), then --collect (reads the cache, drafts the printed-name map), then
-- --seed and --sql. The seed is committed at db/vr-utah-committee-seed.json;
-- the reviewed name table at db/vr-utah-committee-map.json.
--
-- THIS IS A DELTA, NOT THE WHOLE SEED. 2025GS's committee votes already shipped in
-- an earlier migration and that file is applied, so it is not edited. This one
-- carries only the 3 bill(s) whose rows changed afterwards:
--   SB0026 · S.B. 26 · 1 act(s), 7 position(s)
--   SB0316 · S.B. 316 · 1 act(s), 7 position(s)
--   SB0336 · S.B. 336 · 1 act(s), 3 position(s)
--
-- WHY THEY CHANGED.
-- Nothing about the ingest's rules, the 2025 reviewed printed-name map or
-- the roster changed for this session: the 2025 map resolved every printed
-- name it met before wave 6 and still does, with nothing dropped and nothing
-- refused. These three bills are new to the lane because the vocabulary wave
-- V1 (20261010000000) gave each of them a reviewed dev_district_finance
-- mapping in db/vr-utah-vote-seed.json. A bill with no reviewed issue keys
-- is off-lane by rule and its committee votes are refused rather than mapped
-- on the strength of the vote; once V1 reviewed the key, the three contested
-- pass-out-favorably votes already sitting in the cache became admissible
-- under the rules already in force. The seven admission rules, the
-- 10-percent-minority contestedness bar, the four-way cross-check against
-- the published PDF and the 0.60 committee_vote weight are all unchanged.
--
-- Each block is the same generated block as before, unmodified: it selects the
-- measure before inserting and ends ON CONFLICT DO NOTHING, so re-stating a bill the
-- database already holds is a no-op and only genuinely new rows land. The
-- VERIFICATION block at the foot asserts this lane's whole end state
-- (258 positions on 27 bills), not this file's 17 on 3, because it runs
-- after every 2025GS committee migration has been applied. The committee-only
-- measures written by the mapping lane are excluded from that count by their own
-- committeeOnly flag, so a later mapping wave cannot move it. Regenerate this exact
-- file with --sql --session 2025GS --bills
--   SB0026,SB0316,SB0336
--
-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique
-- (measure_id, politician_id, action_type). No DDL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── S.B. 26 — Housing and Transit Reinvestment Zone Amendments  (2025GS/SB0026) ────────────
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 26' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0026: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-25 · House Political Subdivisions Standing Committee · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.
    --   printed tally 2-6-2 (yea-nay-absent); 7 of the 8 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'fitisemanu_h30', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'gay_lynn_bennion', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'gwynn_h6', 'committee_vote', true, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'james_dunnigan', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'r_neil_walter', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'rward', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.'),
      (m_id, 'tracy_miller', 'committee_vote', false, '2025-02-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001806.pdf', 'House Political Subdivisions Standing Committee · meeting 19876 · Rep. Gwynn moved to pass 2nd Substitute S.B. 26 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 316 — Military Installation Development Authority and Other Development Zone Amendments  (2025GS/SB0316) ──
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 316' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0316: measure absent, committee votes skipped';
  ELSE
    -- 2025-03-04 · House Economic Development and Workforce Services Standing Committee · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.
    --   printed tally 4-3-3 (yea-nay-absent); 7 of the 7 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'colin_w_jack', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'david_shallenberger', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'doug_fiefia', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'grant_miller', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'jon_hawkins', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'paul_a_cutler', 'committee_vote', true, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.'),
      (m_id, 'shelley_h66', 'committee_vote', false, '2025-03-04T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001936.pdf', 'House Economic Development and Workforce Services Standing Committee · meeting 19891 · Chair Hawkins moved to pass 3rd Substitute S.B. 316 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── S.B. 336 — Utah Fairpark Area Investment and Restoration District Modifications  (2025GS/SB0336) ──
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 336' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'SB0336: measure absent, committee votes skipped';
  ELSE
    -- 2025-02-27 · Senate Economic Development and Workforce Services Standing Committee · Sen. Kwan moved to pass 1st Substitute S.B. 336 out favorably.
    --   printed tally 2-1-3 (yea-nay-absent); 3 of the 3 named voters are on the PolitiDex roster
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_id, 'amillner', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001844.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19894 · Sen. Kwan moved to pass 1st Substitute S.B. 336 out favorably.'),
      (m_id, 'john_johnson', 'committee_vote', false, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001844.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19894 · Sen. Kwan moved to pass 1st Substitute S.B. 336 out favorably.'),
      (m_id, 'kwan_s12', 'committee_vote', true, '2025-02-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/interim/2025/pdf/00001844.pdf', 'Senate Economic Development and Workforce Services Standing Committee · meeting 19894 · Sen. Kwan moved to pass 1st Substitute S.B. 336 out favorably.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;

-- ── VERIFICATION ────────────────────────────────────────────────────────────
-- Fails loudly rather than leaving a half-written committee record behind.
DO $$
DECLARE n_pos integer; n_floorish integer; n_nosrc integer; n_measures integer;
BEGIN
  -- This lane only: the committee-only bills the mapping lane writes carry
  -- committeeOnly on the measure and are counted by that lane, not this one.
  SELECT count(*) INTO n_pos FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_pos <> 258 THEN
    RAISE EXCEPTION 'expected 258 Utah 2025GS seed-lane committee_vote positions, found %', n_pos;
  END IF;
  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS'
     AND (m.external_ids->>'committeeOnly') IS DISTINCT FROM 'true';
  IF n_measures <> 27 THEN
    RAISE EXCEPTION 'expected 27 bills with Utah 2025GS seed-lane committee votes, found %', n_measures;
  END IF;
  -- A committee act must never have been written as a roll call.
  SELECT count(*) INTO n_floorish FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.external_ids->>'utahSession' = '2025GS'
     AND r.action_type = 'committee_vote';
  IF n_floorish > 0 THEN
    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;
  END IF;
  -- Every act carries the published PDF it was confirmed against.
  SELECT count(*) INTO n_nosrc FROM vr_positions p
    JOIN vr_measures m ON m.id = p.measure_id
   WHERE p.action_type = 'committee_vote'
     AND m.external_ids->>'utahSession' = '2025GS'
     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf');
  IF n_nosrc > 0 THEN
    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;
  END IF;
END $$;
