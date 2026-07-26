-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — coverage pass: unblock roll calls the ranking engine can't use
-- ─────────────────────────────────────────────────────────────────────────────
-- The issue ranking judges a member on an issue by comparing their stated stance
-- to their roll-call record on that issue. A vote only reaches that comparison
-- when its measure carries a vr_measure_issues row, so every unmapped measure is
-- a pile of member-votes the engine cannot see. A coverage audit of the live
-- tables found 5,746 yea/nay member-votes recorded, of which 2,331 sit on the 56
-- measures that have votes but no issue mapping at all. This migration goes after
-- the largest, most defensible blocks of that gap.
--
-- Two kinds of change, both additive, both idempotent:
--
--   1. DUPLICATE MEASURE ROWS. One measure existing twice splits its roll calls
--      away from its issue mappings. H.J.Res. 88 (the CRA resolution revoking
--      California's Advanced Clean Cars II waiver) is in the table twice: the
--      curated row carries five issue mappings and the Senate roll call, while a
--      second row created by the live ingest — measure_type 'bill' instead of
--      'resolution', title still the "Roll call 114" placeholder — holds the
--      HOUSE passage vote and its 116 member-votes with no mappings at all. That
--      single split is the biggest unusable block in the record. Folding the
--      House roll call onto the mapped row makes all 116 votes checkable against
--      climate_action, energy_production, gov_regulation, cost_living and
--      states_federal_power at once, with no new curation.
--
--      WHY THE SPLIT HAPPENED (fixed alongside this migration): the curated seed
--      in db/vr-issue-seed.json is matched to a measure by
--      (measure_type, congress, chamber, number) with LIMIT 1, so the ingest's
--      'bill'-typed copy never matched the seed's 'resolution' entry and silently
--      counted as "not ingested yet". netlify/lib/vr-ingest.ts now matches on
--      (congress, chamber, canonical number) and applies to EVERY matching row,
--      so a type disagreement can no longer swallow a curated mapping.
--
--   2. NEW CURATED MAPPINGS for eight previously unmapped measures that do carry
--      votes. Same rules as the earlier waves, from db/vr-ingest-runbook.md: map
--      only where a single clear policy nexus to an existing ISSUE_MAP key
--      exists, read support_meaning off the measure's own operative text, give
--      every row a rationale and a canonical source, and leave anything
--      ambiguous unmapped.
--
-- DELIBERATELY NOT MAPPED, so a later wave does not re-litigate them:
--   * The six "providing for consideration of" rule resolutions (H.Res. 682,
--     916, 1075, 1398, 1423 and 1438) — 447 member-votes, the single largest
--     remaining block. A rule vote is a party-line vote on floor procedure; it
--     differentiates nobody on the policy inside the bills it queues, and mapping
--     it to those bills' issues would score members on legislation they had not
--     yet voted on. Consistent with the wave-2 decision to skip rule resolutions.
--     (H.Res. 1399, despite the neighbouring number, is not one of them — it is a
--     substantive ethics resolution and is mapped below.)
--   * H.Con.Res. 113 (FY2027 budget resolution, 37 votes) — wave 2 already
--     declined this one because a budget resolution's direction on cut_spending /
--     gov_balance depends on the budgetary levels it sets, which our record does
--     not contain. Nothing has changed; still no honest direction to assert.
--   * The remaining placeholder-titled ingest rows (H.J.Res. 78, H.R. 530,
--     H.R. 973, H.R. 1402, H.R. 1503, S. 356, S. 1071, S. 2503, S.J.Res. 18 and
--     others, ~450 member-votes) — we hold a bill number and a roll call but no
--     title, summary or text for them, so there is nothing to read a nexus off.
--     H.R. 2965 and H.R. 4305 are the exceptions and are mapped below: the rule
--     resolution that queued them (H.Res. 916) describes both in our own record.
--   * H.R. 36 (MEGOBARI Act), H.R. 4423 (No New Burma Funds Act), H.R. 5348 and
--     the other suspension-calendar bills that passed 385-0 / 386-0 / 397-1 — a
--     near-unanimous vote separates nobody, and crediting every member who holds
--     a matching stance with a "consistent" receipt for a vote no one opposed
--     inflates the score without adding information.
--   * H.R. 139 (Sunshine Protection Act, permanent daylight saving time) — no
--     key in the 108-key vocabulary corresponds to it. An honest unknown.
--
-- Changes no schema and adds no scoring logic. Every INSERT is guarded by
-- ON CONFLICT (measure_id, issue_key) DO NOTHING against the existing unique
-- index and every block by IF … IS NOT NULL, so re-running is a no-op and a
-- database missing any of these measures skips that block instead of failing.
-- Measures are resolved by their natural keys (number + congress), never by
-- hard-coded serials.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_canon    integer;
  m_dupe     integer;
  v_rc       int := 0;
  v_actions  int := 0;
  v_orphans  int := 0;
  m_hr6955   integer;
  m_hres1399 integer;
  m_hr8884   integer;
  m_ha235    integer;
  m_ha236    integer;
  m_ha248    integer;
  m_hr2965   integer;
  m_hr4305   integer;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. Fold the placeholder H.J.Res. 88 row onto the curated one
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The survivor is chosen by evidence, not by id: it is the row that carries the
  -- issue mappings and the real title. The casualty must carry NO mappings, so
  -- this can never discard curation. Both conditions are re-checked here rather
  -- than assumed, and after the first run no placeholder row exists, so the
  -- SELECTs return NULL and the whole block is skipped.
  SELECT id INTO m_canon
    FROM vr_measures
   WHERE number = 'H.J.Res. 88' AND congress = 119
     AND EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = vr_measures.id)
   ORDER BY id LIMIT 1;

  SELECT id INTO m_dupe
    FROM vr_measures
   WHERE number = 'H.J.Res. 88' AND congress = 119
     AND id IS DISTINCT FROM m_canon
     AND title ~ '^Roll call [0-9]+$'
     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = vr_measures.id)
   ORDER BY id LIMIT 1;

  IF m_canon IS NOT NULL AND m_dupe IS NOT NULL THEN
    -- Re-point the roll calls FIRST. vr_rollcalls.measure_id cascades on delete,
    -- so deleting the duplicate measure before moving its roll calls would take
    -- all 116 member-votes with it. vr_rollcalls is UNIQUE on
    -- (chamber, congress, session, roll_number); the House #114 vote cannot
    -- collide with the Senate #277 vote already on the survivor, but the guard
    -- makes that a checked fact rather than a hope — a colliding row is left
    -- where it is instead of aborting the migration.
    UPDATE vr_rollcalls r SET measure_id = m_canon
     WHERE r.measure_id = m_dupe
       AND NOT EXISTS (
         SELECT 1 FROM vr_rollcalls k
          WHERE k.measure_id  = m_canon
            AND k.chamber     = r.chamber
            AND k.congress    = r.congress
            AND k.session     = r.session
            AND k.roll_number = r.roll_number
       );
    GET DIAGNOSTICS v_rc = ROW_COUNT;

    -- Action history has no unique index. These two rows describe the SAME
    -- measure, so the survivor's timeline already covers most of the same
    -- legislative stages — moving a second 'passed_house' onto it would render a
    -- doubled step. Only stages the survivor is MISSING move across (here that is
    -- the 'to_president' step the curated row never had); the rest are dropped as
    -- redundant copies of steps already recorded.
    UPDATE vr_measure_actions a SET measure_id = m_canon
     WHERE a.measure_id = m_dupe
       AND NOT EXISTS (
         SELECT 1 FROM vr_measure_actions k WHERE k.measure_id = m_canon AND k.stage = a.stage
       );
    GET DIAGNOSTICS v_actions = ROW_COUNT;

    -- Only drop the duplicate once it is provably empty of roll calls; anything
    -- still attached (a collision left behind above) keeps the row alive. Action
    -- rows still on it at this point are, by construction, stages the survivor
    -- already records, so the FK cascade discarding them loses no history.
    DELETE FROM vr_measures
     WHERE id = m_dupe
       AND NOT EXISTS (SELECT 1 FROM vr_rollcalls r WHERE r.measure_id = m_dupe);

    RAISE NOTICE 'H.J.Res. 88: % roll call(s) and % action(s) folded onto measure %', v_rc, v_actions, m_canon;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. Retire empty duplicate measure rows
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Four more numbers exist twice (H.Con.Res. 14, H.R. 1005, H.R. 1676, S. 1071)
  -- where the second row holds nothing but action history. They carry no votes so
  -- they cost no coverage today, but they are live tripwires: a future curated
  -- mapping can land on the empty twin and silently do nothing, which is exactly
  -- how the H.J.Res. 88 split above went unnoticed. Their action rows move to the
  -- sibling that owns the roll calls, then the shells go.
  --
  -- The predicate is deliberately narrow: same congress and same canonical number
  -- (case- and punctuation-insensitive, so 'H.Res. 377' and 'H. Res. 377' match),
  -- zero roll calls, zero issue mappings, zero positions, zero provisions, zero
  -- distributional impacts, and a sibling that DOES hold roll calls. A row that is
  -- the only one for its number can never match.
  --
  -- Same two-step as above: any legislative stage the survivor is missing moves
  -- across first (today there are none — all four shells duplicate stages the
  -- survivor already records), then the shell goes and the cascade takes the
  -- redundant copies with it.
  WITH canon AS (
    SELECT id, congress, upper(replace(replace(number, '.', ''), ' ', '')) AS key,
           (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id) AS rc
      FROM vr_measures m
     WHERE number IS NOT NULL
  ),
  orphan AS (
    SELECT c.id,
           (SELECT s.id FROM canon s
             WHERE s.key = c.key AND s.congress = c.congress AND s.rc > 0
             ORDER BY s.rc DESC, s.id LIMIT 1) AS survivor
      FROM canon c
     WHERE c.rc = 0
       AND NOT EXISTS (SELECT 1 FROM vr_measure_issues       x WHERE x.measure_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM vr_positions            x WHERE x.measure_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM vr_measure_provisions   x WHERE x.measure_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts x WHERE x.measure_id = c.id)
  )
  UPDATE vr_measure_actions a SET measure_id = o.survivor
    FROM orphan o
   WHERE a.measure_id = o.id
     AND o.survivor IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM vr_measure_actions k WHERE k.measure_id = o.survivor AND k.stage = a.stage
     );

  WITH canon AS (
    SELECT id, congress, upper(replace(replace(number, '.', ''), ' ', '')) AS key,
           (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id) AS rc
      FROM vr_measures m
     WHERE number IS NOT NULL
  )
  DELETE FROM vr_measures d
   USING canon c
   WHERE c.id = d.id
     AND c.rc = 0
     AND EXISTS (SELECT 1 FROM canon s WHERE s.key = c.key AND s.congress = c.congress AND s.rc > 0)
     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues       x WHERE x.measure_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM vr_positions            x WHERE x.measure_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM vr_measure_provisions   x WHERE x.measure_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts x WHERE x.measure_id = d.id);
  GET DIAGNOSTICS v_orphans = ROW_COUNT;
  RAISE NOTICE 'coverage pass: % empty duplicate measure row(s) retired', v_orphans;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. Curated mappings for the highest-value unmapped measures
  -- ═══════════════════════════════════════════════════════════════════════════

  -- ── H.R. 6955 — Main Street Capital Access Act (74 member-votes: a motion to
  --    recommit and final passage) ──────────────────────────────────────────────
  -- The rule that queued it (H.Res. 1438, in our own record) describes it as a
  -- bill "to make improvements to the Federal banking laws". The title states the
  -- purpose those improvements serve — capital access for Main Street — which is
  -- the econ_smallbiz key ("Help Small Businesses"). Nothing in what we hold
  -- supports a second key, so it gets one.
  SELECT id INTO m_hr6955 FROM vr_measures WHERE number = 'H.R. 6955' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_hr6955 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr6955, 'econ_smallbiz', 100, true, 'yea_supports',
        'Amends the Federal banking laws to widen small-business and Main Street access to capital; a yea backs that expansion of access.',
        'https://www.congress.gov/bill/119th-congress/house-bill/6955')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Res. 1399 — release of House harassment-settlement records (37 votes) ──
  -- Not a rule resolution despite the neighbouring numbers: its operative text
  -- directs a standing committee to preserve and PUBLICLY RELEASE records of
  -- taxpayer-funded settlements. That is the gov_transparency key almost verbatim
  -- ("Force more disclosure … toughen ethics rules"), and the direction is not
  -- arguable — a yea releases the records.
  SELECT id INTO m_hres1399 FROM vr_measures WHERE number = 'H.Res. 1399' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_hres1399 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hres1399, 'gov_transparency', 100, true, 'yea_supports',
        'Directs the Committee on Ethics to preserve and publicly release records of monetary settlements involving sexual harassment; a yea forces disclosure of settlements that are otherwise sealed.',
        'https://www.congress.gov/bill/119th-congress/house-resolution/1399')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 8884 — Removing Barriers to Work for Disabled Americans Act (37) ────
  -- Reauthorizes demonstration authority under title II of the Social Security
  -- Act — i.e. the Social Security Disability Insurance program. Mapped to
  -- social_security only, at a deliberately reduced weight: the key's own framing
  -- is protecting benefits from cuts or privatization, and this is a program
  -- administration bill, so it is real evidence on the issue but not a defining
  -- test of it. No second key — "removing barriers to work" describes the intent
  -- of the demonstration authority, not an operative labour provision we can see.
  SELECT id INTO m_hr8884 FROM vr_measures WHERE number = 'H.R. 8884' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_hr8884 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr8884, 'social_security', 70, true, 'yea_supports',
        'Amends title II of the Social Security Act to reauthorize demonstration authority for the disability insurance program; a yea keeps that Social Security program authority in place. Weighted below a full-strength mapping on purpose: this is program administration, not a vote on benefit levels.',
        'https://www.congress.gov/bill/119th-congress/house-bill/8884')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 235 (Massie) to H.R. 8595 — bar the Act's funds for Israel and
  --    cut the Foreign Military Financing account accordingly (38 votes) ────────
  -- Same treatment as H.Amdt. 252 (Ukraine) in the wave-2 migration: the primary
  -- key is america_first_fp ("rethink foreign aid commitments") and the secondary
  -- is cut_spending, because the amendment's own text reduces a named account.
  -- foreign_balance is deliberately NOT applied here, matching the wave-2 rule
  -- that reserves it for amendments about ALLIED MILITARY cooperation rather than
  -- aid defunding — using it here would manufacture contradictions for members
  -- who back allied diplomacy while opposing a particular aid line.
  SELECT id INTO m_ha235 FROM vr_measures WHERE number = 'H.Amdt. 235' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_ha235 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha235, 'america_first_fp', 100, true, 'yea_supports',
        'Prohibits funds appropriated by the Act from being used for Israel — a direct floor test of whether to continue a standing foreign-aid commitment.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/235'),
      (m_ha235, 'cut_spending', 55, false, 'yea_supports',
        'The amendment reduces the Foreign Military Financing Program account by the corresponding amount; a yea cuts that spending.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/235')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 236 (Massie) to H.R. 8595 — same, for Jordan (38 votes) ──────────
  SELECT id INTO m_ha236 FROM vr_measures WHERE number = 'H.Amdt. 236' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_ha236 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha236, 'america_first_fp', 100, true, 'yea_supports',
        'Prohibits funds appropriated by the Act from being used for Jordan — a direct floor test of whether to continue a standing foreign-aid commitment.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/236'),
      (m_ha236, 'cut_spending', 55, false, 'yea_supports',
        'The amendment reduces the National Security Investment Programs and Foreign Military Financing accounts by the corresponding amounts; a yea cuts that spending.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/236')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 248 (Hunt) to H.R. 8800 — keep the Santa Ynez unit operating to
  --    protect California's defense fuel supply chain (38 votes, agreed to) ─────
  -- Both keys are read straight off the amendment's own text: what it does
  -- (keeps a domestic oil production asset running) and the reason it gives for
  -- doing it (a defense fuel supply chain).
  SELECT id INTO m_ha248 FROM vr_measures WHERE number = 'H.Amdt. 248' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_ha248 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha248, 'energy_production', 100, true, 'yea_supports',
        'Ensures the continued operation of the Santa Ynez production unit; a yea keeps a domestic oil production asset online rather than letting it shut down.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/248'),
      (m_ha248, 'strong_defense', 70, false, 'yea_supports',
        'The amendment''s stated purpose is protecting a critical component of the military''s fuel supply chain; a yea backs that supply-chain security.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/248')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 2965 — small business regulatory budget (38 votes) ─────────────────
  -- The measure row itself still carries the ingest's "Roll call 310" placeholder
  -- title, but its content is not a guess: H.Res. 916 — the rule that queued it,
  -- already in this database with a Congress.gov source — describes H.R. 2965 as
  -- the "small business regulatory budget" bill. A regulatory budget caps the
  -- cumulative cost of new rules, which is the gov_regulation key ("Sunset
  -- outdated federal regulations and require a cost-benefit review of new ones")
  -- with econ_smallbiz as the population it protects.
  SELECT id INTO m_hr2965 FROM vr_measures WHERE number = 'H.R. 2965' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_hr2965 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr2965, 'gov_regulation', 100, true, 'yea_supports',
        'Establishes a small business regulatory budget, capping the regulatory cost federal agencies may impose; a yea constrains new regulation. Identified from the H.Res. 916 rule already in this record, which describes H.R. 2965 as the small business regulatory budget bill.',
        'https://www.congress.gov/bill/119th-congress/house-bill/2965'),
      (m_hr2965, 'econ_smallbiz', 80, false, 'yea_supports',
        'The regulatory budget is scoped to the compliance burden borne by small businesses; a yea reduces that burden.',
        'https://www.congress.gov/bill/119th-congress/house-bill/2965')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 4305 — SBA Red Tape Hotline (38 votes) ─────────────────────────────
  -- Same provenance: named in the H.Res. 916 rule in our record. A hotline for
  -- small businesses to report burdensome rules is econ_smallbiz first ("Cut the
  -- licensing fees, permits and paperwork that fall hardest on small businesses")
  -- and gov_regulation second.
  SELECT id INTO m_hr4305 FROM vr_measures WHERE number = 'H.R. 4305' AND congress = 119 ORDER BY id LIMIT 1;
  IF m_hr4305 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr4305, 'econ_smallbiz', 100, true, 'yea_supports',
        'Creates an SBA hotline for small businesses to report federal rules they find burdensome; a yea backs that channel. Identified from the H.Res. 916 rule already in this record, which describes H.R. 4305 as the SBA Red Tape Hotline bill.',
        'https://www.congress.gov/bill/119th-congress/house-bill/4305'),
      (m_hr4305, 'gov_regulation', 80, false, 'yea_supports',
        'The hotline exists to surface federal red tape for repeal or revision; a yea advances that deregulatory review.',
        'https://www.congress.gov/bill/119th-congress/house-bill/4305')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;
