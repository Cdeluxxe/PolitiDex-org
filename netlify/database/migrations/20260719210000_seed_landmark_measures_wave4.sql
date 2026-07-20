-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 4 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the GENIUS Act (S. 1582) — the first major U.S. crypto law, establishing a
-- federal framework for payment stablecoins — to the Voting Record. It is the first
-- SENATE-ORIGIN bill and the first broadly BIPARTISAN law in the record (every prior
-- measure was a House-origin bill), so it balances the mix of measures and gives the
-- Senate roster a high-profile crossover vote to sit beside their stances.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (from the official congressional record):
--   S. 1582 — GENIUS Act. Senate roll call 318, 2025-06-17, On Passage, passed 68-30
--     (2 not voting). Bipartisan: 51 Republicans + 18 Democrats voted yea. Two
--     Republicans — Josh Hawley and Rand Paul — voted nay; Tom Cotton (R) and Mark
--     Kelly (D) did not vote. The 18 Democratic yeas (recorded here as against-party):
--     Alsobrooks, Booker, Cortez Masto, Fetterman, Gallego, Gillibrand, Hassan,
--     Heinrich, Hickenlooper, Kim (NJ), Lujan, Ossoff, Padilla, Rosen, Schiff,
--     Slotkin, Warner, Warnock. (senate.gov vote_119_1_00318)
--   S. 1582 — House roll call 200, 2025-07-17, On Passage, passed 308-122 (2 not
--     voting). The House adopted the Senate bill without amendment; it was signed
--     into law July 18, 2025 (Pub. L. 119-27). Individual House votes split within
--     both parties; only the Republican leadership that shepherded it (Johnson,
--     Scalise, Emmer) is recorded here rather than guessing the rest.
--     (clerk.house.gov/Votes/2025200)
--
-- Idempotent: guarded on the S. 1582 measure sentinel, and every member insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_genius integer;
  rc       integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'S. 1582' AND congress = 119) THEN
    RETURN;
  END IF;

  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'senate', 'S. 1582',
     'Guiding and Establishing National Innovation for U.S. Stablecoins Act (GENIUS Act)', 'GENIUS Act',
     'Creates the first federal regulatory framework for payment stablecoins — reserve, disclosure, and licensing rules for issuers. The first major U.S. crypto law; signed as Pub. L. 119-27.',
     'enacted', 'https://www.congress.gov/bill/119th-congress/senate-bill/1582', 'Congress.gov',
     '{"congressGovId":"s1582-119","publicLaw":"119-27"}')
  RETURNING id INTO m_genius;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_genius, 'tech_innovation',   100, true,  'yea_supports', 'A yea vote establishes a national framework for digital-asset (stablecoin) innovation.'),
    (m_genius, 'crypto',             90, false, 'yea_supports', 'The first comprehensive federal crypto-market statute.'),
    (m_genius, 'econ_corp_account',  60, false, 'yea_opposes',  'Opponents argued the framework was too light on consumer and financial-stability safeguards, so a yea cut against stricter corporate accountability.');

  -- ── Senate roll call 318 ────────────────────────────────────────────────────
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_genius, 'senate', 119, 1, 318, '2025-06-17T00:00:00Z', 'On Passage of the Bill', 'passage', 'passed', 'simple',
     '{"yea":68,"nay":30,"present":0,"notVoting":2}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00318.htm', 'U.S. Senate')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    -- Republicans — yea (party-line)
    (rc, 'thune', 'yea', 'with_party'),            (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),             (rc, 'lee', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),         (rc, 'graham', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),            (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'banks', 'yea', 'with_party'),            (rc, 'moreno', 'yea', 'with_party'),
    (rc, 'mullin', 'yea', 'with_party'),           (rc, 'ricketts', 'yea', 'with_party'),
    (rc, 'sheehy', 'yea', 'with_party'),           (rc, 'blackburn', 'yea', 'with_party'),
    (rc, 'rick_scott', 'yea', 'with_party'),       (rc, 'hagerty', 'yea', 'with_party'),
    (rc, 'roger_marshall', 'yea', 'with_party'),   (rc, 'daines', 'yea', 'with_party'),
    (rc, 'ron_johnson', 'yea', 'with_party'),      (rc, 'todd_young', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),      (rc, 'mike_rounds', 'yea', 'with_party'),
    (rc, 'kevin_cramer', 'yea', 'with_party'),     (rc, 'hoeven', 'yea', 'with_party'),
    (rc, 'britt', 'yea', 'with_party'),            (rc, 'tommy_tuberville', 'yea', 'with_party'),
    (rc, 'dan_sullivan', 'yea', 'with_party'),     (rc, 'deb_fischer', 'yea', 'with_party'),
    (rc, 'jim_justice', 'yea', 'with_party'),      (rc, 'lummis', 'yea', 'with_party'),
    (rc, 'kennedy_john', 'yea', 'with_party'),     (rc, 'ashley_moody', 'yea', 'with_party'),
    (rc, 'schmitt', 'yea', 'with_party'),          (rc, 'ted_budd', 'yea', 'with_party'),
    (rc, 'mccormick', 'yea', 'with_party'),        (rc, 'collins', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),        (rc, 'tillis', 'yea', 'with_party'),
    -- Republicans — nay (broke with party)
    (rc, 'hawley', 'nay', 'against_party'),        (rc, 'rand_paul', 'nay', 'against_party'),
    -- Democrats — yea (crossed over, against party)
    (rc, 'alsobrooks', 'yea', 'against_party'),    (rc, 'booker', 'yea', 'against_party'),
    (rc, 'cortez_masto', 'yea', 'against_party'),  (rc, 'fetterman', 'yea', 'against_party'),
    (rc, 'gallego', 'yea', 'against_party'),       (rc, 'gillibrand', 'yea', 'against_party'),
    (rc, 'maggie_hassan', 'yea', 'against_party'), (rc, 'heinrich', 'yea', 'against_party'),
    (rc, 'hickenlooper', 'yea', 'against_party'),  (rc, 'andy_kim', 'yea', 'against_party'),
    (rc, 'lujan', 'yea', 'against_party'),         (rc, 'jon_ossoff', 'yea', 'against_party'),
    (rc, 'padilla', 'yea', 'against_party'),       (rc, 'rosen', 'yea', 'against_party'),
    (rc, 'schiff', 'yea', 'against_party'),        (rc, 'slotkin', 'yea', 'against_party'),
    (rc, 'warner', 'yea', 'against_party'),        (rc, 'warnock', 'yea', 'against_party'),
    -- Democrats — nay (party-line)
    (rc, 'schumer', 'nay', 'with_party'),          (rc, 'durbin', 'nay', 'with_party'),
    (rc, 'warren', 'nay', 'with_party'),           (rc, 'wyden', 'nay', 'with_party'),
    (rc, 'klobuchar', 'nay', 'with_party'),        (rc, 'chris_murphy', 'nay', 'with_party'),
    (rc, 'kaine', 'nay', 'with_party'),            (rc, 'coons', 'nay', 'with_party'),
    (rc, 'bennet', 'nay', 'with_party'),           (rc, 'welch', 'nay', 'with_party'),
    (rc, 'tina_smith', 'nay', 'with_party'),       (rc, 'hirono', 'nay', 'with_party'),
    (rc, 'merkley', 'nay', 'with_party'),          (rc, 'markey', 'nay', 'with_party'),
    (rc, 'van_hollen', 'nay', 'with_party'),       (rc, 'duckworth', 'nay', 'with_party'),
    (rc, 'tammy_baldwin', 'nay', 'with_party'),    (rc, 'blunt_rochester', 'nay', 'with_party'),
    (rc, 'angus_king', 'nay', 'with_party'),       (rc, 'schatz', 'nay', 'with_party'),
    (rc, 'blumenthal', 'nay', 'with_party'),       (rc, 'shaheen', 'nay', 'with_party'),
    (rc, 'peters', 'nay', 'with_party'),
    -- Not voting
    (rc, 'cotton', 'not_voting', NULL),            (rc, 'mark_kelly', 'not_voting', NULL)
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── House roll call 200 ─────────────────────────────────────────────────────
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_genius, 'house', 119, 1, 200, '2025-07-17T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":308,"nay":122,"present":0,"notVoting":2}', 'https://clerk.house.gov/Votes/2025200', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
