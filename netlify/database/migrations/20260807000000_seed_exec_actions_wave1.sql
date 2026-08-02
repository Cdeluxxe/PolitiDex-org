-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — Phase 3: the wave-1 formal actions (data only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds the five wave-1 actions into the vr_* spine. Changes NO schema: it inserts
-- into vr_measures, vr_measure_issues, vr_positions and vr_exec_action_status only,
-- and every insert is guarded, so re-applying is a no-op. Rolls forward from the
-- applied migrations and edits none of them.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- asserts that every citation in that file appears in this SQL, so the client data
-- and the database rows cannot drift apart without the suite failing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW AN EXECUTIVE ACTION IS RECORDED — three tables, no new ones
-- ─────────────────────────────────────────────────────────────────────────────
--   vr_measures         the DOCUMENT. For signed legislation this row already
--                       exists (S. 5, H.R. 1) and is reused, never duplicated. For
--                       an order it is created with measure_type 'executive_order'
--                       and chamber 'executive', the additive values Phase 1 added
--                       to the Function's allow-lists.
--   vr_measure_issues   WHAT IT DOES, per issue, with a direction. Same table and
--                       same support_meaning column the congressional lane reads, so
--                       the two lanes cannot disagree about what a law does.
--   vr_positions        THE ACT of signing or issuing. action_type 'signed' /
--                       'issued'. vr_positions is already documented as
--                       "non-roll-call actions that still count as doing", which is
--                       exactly what this is — so no fake roll call is manufactured
--                       and no "Voted Yea" can ever be rendered from these rows.
--   vr_exec_action_status  WHAT HAPPENED TO IT AFTERWARDS (Axis B), append-only, one
--                       row per change, each carrying its own citation.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Orders, from the Federal Register API document records (title, signing date,
-- publication date, FR citation, document number, disposition notes):
--   EO 14151  Ending Radical and Wasteful Government DEI Programs and Preferencing
--             signed 2025-01-20, published 2025-01-29, 90 FR 8339, doc 2025-01953
--   EO 14154  Unleashing American Energy
--             signed 2025-01-20, published 2025-01-29, 90 FR 8353, doc 2025-01956
--   EO 14248  Preserving and Protecting the Integrity of American Elections
--             signed 2025-03-25, published 2025-03-28, 90 FR 14005, doc 2025-05523
-- None of the three carries a "Revoked by" or "Superseded by" disposition note.
--
-- Statutes, from GPO's published Public Law packages:
--   PL 119-1   S. 5, Laken Riley Act, approved 2025-01-29
--              https://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf
--   PL 119-21  H.R. 1, approved 2025-07-04
--              https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf
--
-- Standing, from the courts' own opinions, downloaded and read — the operative
-- disposition, not a description of it. See the per-row notes below.
--
-- congress.gov refuses this environment (HTTP 403), as it has every prior pass. The
-- congress.gov bill pages are still the cited source of record, because
-- db/exec-action-types.json names them as such and the entire congressional lane
-- already cites them; the FACTS about those two laws were verified against GPO.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
-- Every action had a primary citation available, so none was needed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THE TWO STATUTES SHARE THEIR ISSUE MAPPINGS WITH THE 🏛️ LANE
-- ─────────────────────────────────────────────────────────────────────────────
-- The mappings re-asserted below are the ones S. 5 and H.R. 1 already carry, not new
-- curation: four for S. 5 (from 20260804000000) and fourteen for H.R. 1 (five from
-- db/vr-issue-seed.json, nine from 20260720000000). They are re-asserted with
-- ON CONFLICT DO NOTHING so this seed is self-sufficient on a database where
-- POST /seed-issues has not run, and a complete no-op where it has.
--
-- Four of H.R. 1's fourteen are yea_opposes — national_debt, healthcare,
-- climate_action, edu_college_cost. That is the point of seeding the whole split
-- rather than the headline issue: one signature reports in both directions, and a
-- lane that could only ever show alignment would be a scoreboard, not a record.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE + IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- The three order rows are guarded by an existence check on their natural identity
-- (vr_measures has no unique constraint, so ON CONFLICT is unavailable there — the
-- same pattern 20260804000000 used for S. 5). Issue rows use the
-- vr_measure_issues_unique index. Position rows use the vr_positions_unique index
-- on (measure_id, politician_id, action_type). Status rows are guarded per
-- (position_id, status, effective_at), the natural key of an append-only log entry.
-- Nothing is updated and nothing is deleted: there is no UPDATE, DELETE, DROP,
-- ALTER or TRUNCATE statement in this file.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_s5    integer;
  m_hr1   integer;
  m_14154 integer;
  m_14151 integer;
  m_14248 integer;
  pos     integer;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Public Law 119-1 — S. 5, Laken Riley Act (signed_law)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- S. 5, NOT H.R. 29, is the vehicle that became Public Law 119-1: the two bills
  -- shared the name and the House-numbered one never left the Senate calendar.
  -- 20260804000000 repaired that identity; this seed attaches to the corrected row,
  -- and GPO's enrolled text carries "[S. 5]" on its face. Resolved by natural key so
  -- it lands on the same row a fresh ingest would.
  SELECT id INTO m_s5
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'senate' AND number = 'S. 5'
   LIMIT 1;

  IF m_s5 IS NOT NULL THEN
    -- The four mappings S. 5 already carries, re-asserted so this seed stands alone.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s5, 'deportations', 100, true, 'yea_supports',
       'Mandates detention and removal proceedings for covered unauthorized immigrants.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'border_security', 70, false, 'yea_supports',
       'Tightens immigration enforcement.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'tough_on_crime', 55, false, 'yea_supports',
       'Triggered by arrest for burglary, theft, larceny, shoplifting, assault of a '
       || 'law enforcement officer, or any crime resulting in death or serious bodily injury.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'states_federal_power', 40, false, 'yea_supports',
       'Gives state attorneys general standing to sue the federal government over certain '
       || 'immigration-detention and enforcement decisions.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    -- THE ACT. action_type 'signed' — not a vote, and structurally incapable of
    -- becoming one: vr_member_votes is keyed on a roll call, and this row has none.
    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_s5, 'trump', 'signed', true, TIMESTAMPTZ '2025-01-29T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5',
       'Signed into law as Public Law 119-1 on 2025-01-29. Shared authorship: Congress '
       || 'wrote and passed the bill and the signature enacted it, so the per-issue '
       || 'directions below carry the claim, not the signature alone.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_s5 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-29T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-1, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf',
             'Enacted and published as Public Law 119-1, approved January 29, 2025. '
             || 'Nothing on file repeals or amends it. This states that the law exists '
             || 'and stands as published; it is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-29T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Public Law 119-21 — H.R. 1, 2025 reconciliation act (signed_law)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The enacted law carries NO act-wide short title: the popular name is not the name
  -- of the Act in the enrolled text, only a section-level short title inside it. The
  -- existing measure row keeps the popular name, which is how readers search for it;
  -- this migration does not rename a measure the 🏛️ lane renders.
  SELECT id INTO m_hr1
    FROM vr_measures
   WHERE congress = 119 AND number = 'H.R. 1'
   LIMIT 1;

  IF m_hr1 IS NOT NULL THEN
    -- THE OMNIBUS SPLIT — all fourteen mappings, four of them yea_opposes.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_hr1, 'lower_taxes', 100, true, 'yea_supports',
       'Extends and makes permanent the 2017 individual income-tax rates.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'cut_spending', 70, false, 'yea_supports',
       'Reduces federal spending across several mandatory programs.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'national_debt', 65, false, 'yea_opposes',
       'Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal '
       || 'deficits over ten years.',
       'https://www.cbo.gov/publication/61461'),
      (m_hr1, 'tax_middle_class', 60, false, 'yea_supports',
       'Makes the 2017 individual income-tax rates permanent and adds temporary '
       || 'deductions for tips and overtime pay.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'healthcare', 60, false, 'yea_opposes',
       'Offsets part of its cost with Medicaid and SNAP reductions the CBO estimates '
       || 'leave millions more people uninsured.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'border_security', 55, false, 'yea_supports',
       'Funds border-barrier construction and border enforcement personnel.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'climate_action', 55, false, 'yea_opposes',
       'Phases out and repeals clean-energy and electric-vehicle tax credits enacted in 2022.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'deportations', 50, false, 'yea_supports',
       'Appropriates tens of billions of dollars for immigration detention and removal operations.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'family_support', 45, false, 'yea_supports',
       'Raises the child tax credit to $2,200 per child and makes it permanent.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'energy_production', 45, false, 'yea_supports',
       'Expands onshore and offshore oil, gas, and coal leasing and speeds fossil-fuel permitting.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'strong_defense', 45, false, 'yea_supports',
       'Adds a large increase in defense and military spending.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'lands_energy', 40, false, 'yea_supports',
       'Opens additional federal lands and waters to energy leasing.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'edu_college_cost', 40, false, 'yea_opposes',
       'Restricts graduate and parent student-loan borrowing and repayment options.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'school_choice', 35, false, 'yea_supports',
       'Creates a federal tax credit for donations to K-12 private-school scholarship organizations.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_hr1, 'trump', 'signed', true, TIMESTAMPTZ '2025-07-04T00:00:00Z',
       'https://www.congress.gov/bill/119th-congress/house-bill/1',
       'Signed into law as Public Law 119-21 on 2025-07-04. Official title: "To provide '
       || 'for reconciliation pursuant to title II of H. Con. Res. 14". Shared authorship, '
       || 'and fourteen mapped issues running in both directions — signing an omnibus is '
       || 'not an endorsement of each provision in it.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_hr1 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-04T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-21, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf',
             'Enacted and published as Public Law 119-21, approved July 4, 2025. Nothing '
             || 'on file repeals it. This states that the law exists and stands as '
             || 'published; it is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-04T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14154 — Unleashing American Energy
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ONE energy action, not two. The app's curated spotlight data carried this order
  -- twice for Trump under a single headline that also folded in a SECOND, separate
  -- order: "Declared a national energy emergency to expand production" described both
  -- Unleashing American Energy and Declaring a National Energy Emergency (EO 14156,
  -- 90 FR 8433, doc 2025-02003, signed the same day). Two documents inside one card
  -- cannot each be given a standing, which is exactly what Axis B needs. This seed
  -- carries EO 14154 alone; EO 14156 is a wave-2 candidate with its own citation and
  -- its own standing. The duplicated spotlight entry is removed in the same commit.
  --
  -- vr_measures.status has no executive token (introduced | passed_house |
  -- passed_senate | enacted | failed | vetoed | pending). 'enacted' is the least
  -- misleading of the available values, and nothing in the EER reads it: standing
  -- comes from vr_exec_action_status, which is why that table exists.
  SELECT id INTO m_14154
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14154'
   LIMIT 1;

  IF m_14154 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14154',
       'Unleashing American Energy', 'Unleashing American Energy',
       'Signed 2025-01-20 and published at 90 FR 8353 on 2025-01-29. Directs agencies to '
       || 'expedite energy permitting and leasing, to remove regulatory barriers to '
       || 'domestic energy production, and revokes a series of earlier climate and '
       || 'clean-energy executive orders, including EO 13990 and EO 14008, as enumerated '
       || 'in the Federal Register disposition record for this document.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy',
       'Federal Register',
       '{"executiveOrder":"14154","frCitation":"90 FR 8353","frDocumentNumber":"2025-01956"}'::jsonb)
    RETURNING id INTO m_14154;
    RAISE NOTICE 'created vr_measures Executive Order 14154 as id %', m_14154;
  END IF;

  IF m_14154 IS NOT NULL THEN
    -- Both directions from a sole-authored order. The 'opposes' mapping is not an
    -- inference about intent: it is read off the Federal Register's own disposition
    -- notes for this document, which enumerate the climate orders it revokes.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14154, 'energy_production', 100, true, 'yea_supports',
       'Directs agencies to expedite oil, gas and mineral permitting and leasing and to '
       || 'remove regulatory barriers to domestic energy production.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy'),
      (m_14154, 'climate_action', 55, false, 'yea_opposes',
       'Revokes the previous administration''s climate executive orders. The Federal '
       || 'Register disposition record for this document lists the revocations by number, '
       || 'including EO 13990 and EO 14008.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14154, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy',
       'Signed Executive Order 14154 on 2025-01-20. Sole authorship — acted alone under '
       || 'claimed executive authority, which is why the standing axis carries the most '
       || 'weight on this class of action.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14154 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- Standing basis: the Federal Register document record. Narrower than a court
      -- ruling, and the note says so — it speaks to revocation and supersession BY
      -- LATER PRESIDENTIAL ACTION, not to the outcome of any challenge.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14154 document record, 90 FR 8353',
             'https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy',
             'Published at 90 FR 8353 and not revoked or superseded by any later '
             || 'presidential action in the Federal Register disposition record for this '
             || 'document. That is the whole of the claim: it describes the order''s status '
             || 'in the register, not the outcome of any challenge to it. This pass found '
             || 'no ruling enjoining EO 14154 itself; the litigation it appears in concerns '
             || 'agency implementation of funding provisions, and the appellate ruling there '
             || '(4th Cir. No. 25-1575, decided 2026-01-21) vacated the district court''s '
             || 'injunctions rather than extending them.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14151 — Ending Radical and Wasteful Government DEI Programs
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14151
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14151'
   LIMIT 1;

  IF m_14151 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14151',
       'Ending Radical and Wasteful Government DEI Programs and Preferencing',
       'Ending Government DEI Programs',
       'Signed 2025-01-20 and published at 90 FR 8339 on 2025-01-29. Directs the '
       || 'termination of federal diversity, equity and inclusion offices, positions, '
       || 'programs and related grants and contracts.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs-and-preferencing',
       'Federal Register',
       '{"executiveOrder":"14151","frCitation":"90 FR 8339","frDocumentNumber":"2025-01953"}'::jsonb)
    RETURNING id INTO m_14151;
    RAISE NOTICE 'created vr_measures Executive Order 14151 as id %', m_14151;
  END IF;

  IF m_14151 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14151, 'end_dei', 100, true, 'yea_supports',
       'Directs the termination of federal diversity, equity and inclusion offices, '
       || 'positions, programs and related grants and contracts.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs-and-preferencing')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14151, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z',
       'https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs-and-preferencing',
       'Signed Executive Order 14151 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14151 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- Standing basis: a ruling, read in full. The facial challenge to this order
      -- reached judgment and the injunction against it was VACATED, so the order is
      -- operative — which is a fact about a court's disposition, not an assumption
      -- from silence. The earlier history (a February 2025 preliminary injunction,
      -- stayed in March 2025) is real and is deliberately NOT seeded: this pass did
      -- not read either document from a primary source. The log is append-only
      -- precisely so that history can be filled in behind the current standing.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-06T00:00:00Z',
             'U.S. Court of Appeals for the Fourth Circuit',
             'Fourth Circuit — National Association of Diversity Officers in Higher '
             || 'Education v. Trump, No. 25-1189 (published opinion, Feb. 6, 2026)',
             'https://storage.courtlistener.com/pdf/2026/02/06/natl._assoc._of_diversity_officers_in_higher_edu._v._donald_trump.pdf',
             'The facial challenge to this order reached judgment: the Fourth Circuit '
             || 'VACATED the district court''s preliminary injunction and remanded for '
             || 'further proceedings, so no injunction against the order is in effect. '
             || 'Read from the court''s own published opinion, which closes "we vacate the '
             || 'district court''s order granting plaintiffs'' motion for a preliminary '
             || 'injunction, and remand for further proceedings. VACATED AND REMANDED". '
             || 'The case continues on remand; a later ruling arrives as a further row in '
             || 'this log rather than a change to this one.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-06T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Executive Order 14248 — Preserving and Protecting the Integrity of American
  --    Elections. THE WORKED EXAMPLE FOR THE WHOLE LANE.
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Three rulings, three rows, three citations. A mutable status column would have
  -- kept only the last and silently lost the other two — which is the entire reason
  -- vr_exec_action_status is append-only. Every row reads 'partly_blocked' because
  -- parts of this order are permanently enjoined and other parts are still operative:
  -- neither "in force" nor "blocked" is a true one-word answer at any point in the
  -- sequence, and a lane that had to pick one would have been wrong three times.
  SELECT id INTO m_14248
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14248'
   LIMIT 1;

  IF m_14248 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14248',
       'Preserving and Protecting the Integrity of American Elections',
       'Integrity of American Elections',
       'Signed 2025-03-25 and published at 90 FR 14005 on 2025-03-28. Section 2(a) '
       || 'directs the Election Assistance Commission to require documentary proof of '
       || 'United States citizenship on the federal voter-registration form; other '
       || 'sections direct interagency data sharing to identify ineligible registrants '
       || 'and enforcement of ballot-receipt deadlines. Sections 2(a), 2(d) and 3(d) have '
       || 'since been permanently enjoined; other sections remain operative.',
       NULL, TIMESTAMPTZ '2025-03-25T00:00:00Z', NULL, 'enacted',
       'https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections',
       'Federal Register',
       '{"executiveOrder":"14248","frCitation":"90 FR 14005","frDocumentNumber":"2025-05523"}'::jsonb)
    RETURNING id INTO m_14248;
    RAISE NOTICE 'created vr_measures Executive Order 14248 as id %', m_14248;
  END IF;

  IF m_14248 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14248, 'voter_id', 100, true, 'yea_supports',
       'Section 2(a) directs the Election Assistance Commission to require documentary '
       || 'proof of United States citizenship on the federal voter-registration form.',
       'https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections'),
      (m_14248, 'election_integrity', 60, false, 'yea_supports',
       'Directs federal agencies to share data to identify ineligible registrants and '
       || 'directs enforcement of ballot-receipt deadlines against States that count '
       || 'late-arriving ballots.',
       'https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14248, 'trump', 'issued', true, TIMESTAMPTZ '2025-03-25T00:00:00Z',
       'https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections',
       'Signed Executive Order 14248 on 2025-03-25. Sole authorship. Sections of this '
       || 'order have since been permanently enjoined — see the standing log, which '
       || 'carries one row per ruling.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14248 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- Ruling 1 of 3 — the preliminary injunction.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2025-04-24T00:00:00Z',
             'U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)',
             'D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 '
             || '/ 25-0955 (CKK), Memorandum Opinion of Apr. 24, 2025',
             'https://storage.courtlistener.com/pdf/2025/04/24/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf',
             'Sections 2(a) and 2(d) PRELIMINARILY ENJOINED; the motions were DENIED as to '
             || 'Sections 2(b), 7(a) and 7(b), which were left free to operate. Read from '
             || 'the court''s own opinion, whose disposition names each section separately.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2025-04-24T00:00:00Z');

      -- Ruling 2 of 3 — escalation, not resolution.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2025-10-31T00:00:00Z',
             'U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)',
             'D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 '
             || '/ 25-0955 (CKK), Memorandum Opinion of Oct. 31, 2025',
             'https://storage.courtlistener.com/pdf/2025/10/31/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf',
             'On partial summary judgment the court PERMANENTLY ENJOINED implementation of '
             || 'Section 2(a) and entered a final, appealable judgment on those '
             || 'separation-of-powers claims. Certain Administrative Procedure Act claims '
             || 'were dismissed without prejudice for want of final agency action. The rest '
             || 'of the order was not enjoined, so the standing stays partly blocked.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2025-10-31T00:00:00Z');

      -- Ruling 3 of 3 — the current standing (latest effective_at wins).
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2026-01-30T00:00:00Z',
             'U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)',
             'D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 '
             || '/ 25-0955 (CKK), Memorandum Opinion of Jan. 30, 2026',
             'https://storage.courtlistener.com/pdf/2026/01/30/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf',
             'The court DECLARED that Sections 2(d) and 3(d) cannot lawfully be implemented '
             || 'and PERMANENTLY ENJOINED them; dismissed the claims directed at Sections '
             || '4(a), 7(a) and 7(b) for want of standing or final agency action; and left '
             || 'claims touching Sections 2(b) and 3(a) for further proceedings, subject to '
             || 'strict Privacy Act compliance. Parts of the order are permanently enjoined '
             || 'and parts are still operative, which is what partly blocked means.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2026-01-30T00:00:00Z');
    END IF;
  END IF;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — reports state, never raises. A branch database missing the
-- congressional measures must still migrate cleanly, so every check is a NOTICE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  ident text;
  n     integer;
  cnt   integer;
BEGIN
  FOR ident, n, cnt IN
    SELECT coalesce(m.number, '(numberless)') || '  [' || p.action_type || ' ' ||
             coalesce(to_char(p.acted_at, 'YYYY-MM-DD'), '(undated)') || ']',
           (SELECT count(*) FROM vr_measure_issues mi WHERE mi.measure_id = m.id),
           (SELECT count(*) FROM vr_exec_action_status s WHERE s.position_id = p.id)
      FROM vr_positions p
      JOIN vr_measures m ON m.id = p.measure_id
     WHERE p.politician_id = 'trump' AND p.action_type IN ('signed', 'issued')
     ORDER BY p.acted_at
  LOOP
    RAISE NOTICE 'exec action: %  (% mapped issues, % standing rows)', ident, n, cnt;
  END LOOP;
  -- Targets: S. 5 (4 issues, 1 status), H.R. 1 (14, 1), EO 14154 (2, 1),
  --          EO 14151 (1, 1), EO 14248 (2, 3).

  SELECT count(*) INTO n FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive';
  RAISE NOTICE 'executive_order measures: % (target 3)', n;

  SELECT count(*) INTO n FROM vr_positions
   WHERE politician_id = 'trump' AND action_type IN ('signed', 'issued');
  RAISE NOTICE 'trump signed/issued positions: % (target 5)', n;

  SELECT count(*) INTO n
    FROM vr_exec_action_status s
    JOIN vr_positions p ON p.id = s.position_id
   WHERE p.politician_id = 'trump';
  RAISE NOTICE 'standing rows for trump: % (target 7 — 5 actions, 3 rulings on EO 14248)', n;

  SELECT count(*) INTO n
    FROM vr_measure_issues mi
    JOIN vr_measures m ON m.id = mi.measure_id
   WHERE m.congress = 119 AND m.number = 'H.R. 1' AND mi.support_meaning = 'yea_opposes';
  RAISE NOTICE 'H.R. 1 mappings that CUT AGAINST an issue: % (target 4 — national_debt, healthcare, climate_action, edu_college_cost)', n;

  SELECT count(*) INTO n
    FROM vr_exec_action_status s
    JOIN vr_positions p ON p.id = s.position_id
   WHERE p.politician_id = 'trump' AND (s.source_url = '' OR s.source_label = '');
  RAISE NOTICE 'standing rows missing a citation: % (target 0)', n;
END $$;
