-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 4: closing the stated-position holes
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql and
-- 20260824000000_seed_exec_actions_wave3.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 4 together and asserts that every citation, date and issue
-- key in that file appears in one of them, so the client data and the database rows
-- cannot drift apart without the suite failing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 3 closed the gap where a stated position had no document. This wave closes
-- three narrower ones the audit surfaced afterwards, in descending order of how
-- badly they misrepresented the record.
--
--   A. ONE ISSUE WAS REPORTING no_record WHILE HOLDING AN ACTION. end_dei had
--      exactly one mapped action, Executive Order 14151, and that pair carries
--      circularWithStance because the pledge naming it quotes its number and date.
--      The circularity rule then held the sole action back, and the row rendered as
--      though nothing had been signed on the subject. The rule's own prescribed fix
--      is not to unflag the pair — it is to put a DIFFERENT document on the issue.
--      Executive Order 14173 is that document and no card in the app names it.
--
--   B. FOUR STATED POSITIONS HAD NO DOCUMENT AT ALL. america_first_fp, cost_living,
--      tough_on_crime as a subject in its own right, and strong_defense. The
--      cost_living case was the worst of them: the pledge on that issue is scored
--      BROKEN against a Bureau of Labor Statistics series while the lane reported
--      no action on file, so the profile was simultaneously grading a commitment
--      and claiming to hold nothing about it.
--
--   C. energy_production RESTED ON ONE CLAUSE OF ONE LAW. Three actions touched it
--      and two — the day-one orders the stance card quotes by title — were held as
--      circular. Executive Order 14261 and Executive Order 14153 are from other
--      months, are named by no card, and restore independent tests.
--
-- It also files the first two rows in the lane that are neither laws nor executive
-- orders. `directive` has been a renderable class since Phase 1 with nothing in it,
-- so the record could not show that a president also acts through proclamations and
-- memoranda. Proclamation 10886 and the January 20 cost-of-living memorandum fill
-- that class with real documents rather than leaving it a stub.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Federal Register API document records, queried one document at a time for title,
-- signing date, publication date, citation, document number and disposition notes:
--   EO 14173     signed 2025-01-21, published 2025-01-31, 90 FR  8633, doc 2025-02097
--   EO 14222     signed 2025-02-26, published 2025-03-03, 90 FR 11095, doc 2025-03527
--   EO 14169     signed 2025-01-20, published 2025-01-30, 90 FR  8619, doc 2025-02091
--   EO 14186     signed 2025-01-27, published 2025-02-03, 90 FR  8767, doc 2025-02182
--   EO 14261     signed 2025-04-08, published 2025-04-14, 90 FR 15517, doc 2025-06380
--   EO 14153     signed 2025-01-20, published 2025-01-29, 90 FR  8347, doc 2025-01955
--   EO 14164     signed 2025-01-20, published 2025-01-30, 90 FR  8463, doc 2025-02012
--   EO 14162     signed 2025-01-20, published 2025-01-30, 90 FR  8455, doc 2025-02010
--   Proc. 10886  signed 2025-01-20, published 2025-01-29, 90 FR  8327, doc 2025-01948
--   Memorandum   signed 2025-01-20, published 2025-01-28, 90 FR  8245, doc 2025-01904
--
-- Disposition notes were read for each. EO 14173 revokes EO 11246, EO 12898,
-- EO 13583, EO 13672 and a memorandum of October 5, 2016. EO 14222 cross-references
-- EO 14158. EO 14169 and EO 14162 cross-reference a memorandum of July 15, 2025.
-- EO 14261 amends EO 14241 and cross-references EO 14386. EO 14186
-- cross-references EO 14369. EO 14153, EO 14164, Proclamation 10886 and the
-- memorandum carry no disposition note at all. NOT ONE of the ten carries an entry
-- revoking or superseding it, and the two cross-references that could plausibly
-- have been repeals were opened and checked directly: EO 14369's disposition record
-- revokes EO 14056, not EO 14186; EO 14386's cross-references EO 14261 without
-- revoking it. A cross-reference is not a repeal, and the in_force rows below claim
-- only what the register establishes.
--
-- One further document was fetched, for a standing rather than for an action:
--   Notice on Declaring a National Emergency at the Southern Border of the United
--   States, signed 2025-07-15, published 2025-08-04, 90 FR 37371, doc 2025-14789.
--   A National Emergencies Act declaration expires one year after it is declared
--   unless the President continues it (50 U.S.C. 1622(d)). This notice continues
--   the emergency declared by Proclamation 10886 past its first anniversary, so the
--   proclamation had not lapsed. That is what basis 'register_continuation' exists
--   to record, and this is the first emergency declaration in the lane to use it.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPINGS DELIBERATELY NOT WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14261 is NOT mapped to climate_action. EO 14154 carries that mapping in wave 1
-- because the register's own disposition record for it enumerates the climate
-- orders it revokes; this order's disposition shows only that it amends EO 14241.
-- Reading a coal-promotion order as formally opposing climate action would be our
-- inference rather than the document's text. It is also NOT mapped to cost_living,
-- for the reason already recorded for EO 14257: the purpose section asserts the
-- order will lower costs, and an asserted economic effect is not an established one.
--
-- EO 14222 is NOT mapped to national_debt. A review process over discretionary
-- contracts and grants and the trajectory of the public debt are not commensurable,
-- and wave 3 refused the same pairing for Public Law 119-28. The debt issue is
-- tested by the instrument that moves it — section 72001 of Public Law 119-21.
--
-- EO 14162 is NOT mapped to america_first_fp despite its title. The operative
-- sections concern withdrawal from environmental agreements; treating a slogan in a
-- title as evidence of a foreign-policy direction would be matching a phrase rather
-- than a document. EO 14169 carries that issue on its own operative text.
--
-- Proclamation 10886 is NOT mapped to deportations. It concerns the border itself —
-- declaration, military support, physical barriers — and interior removal is the
-- subject of the two orders already on file for that issue.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THREE DOCUMENTS DELIBERATELY NOT SEEDED AT ALL
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14160, birthright citizenship. Its register disposition shows no revocation,
-- so a 'register_disposition' in_force row would be literally true and practically
-- misleading: the order is subject to injunctions and this pass has no court
-- opinion resolving its operative status. The lane's rule is to fail closed, so the
-- issue keeps its 'said, not done' reading rather than gaining a standing we cannot
-- support. It is the single most valuable row this wave did not write.
--
-- EO 14158, establishing DOGE. Its section 1 states its purpose as modernizing
-- federal technology and software; it stands up an organisation and says nothing
-- about reducing outlays. Mapping it to cut_spending would have been an inference
-- dressed as a citation, so EO 14222 was seeded instead — that order's section 1
-- commences a transformation in federal spending on contracts, grants and loans.
--
-- The February 2025 IEEPA trafficking-tariff orders. Their standing is entangled
-- with the same Supreme Court holding already cited for EO 14257's struck_down row,
-- and this pass did not read that opinion's treatment of these orders specifically.
-- Seeding actions whose standing we would have to guess at is the failure mode the
-- standing axis exists to prevent.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE + IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Measure rows are guarded by an existence check on their natural identity
-- (vr_measures has no unique constraint, so ON CONFLICT is unavailable there).
-- Issue rows use vr_measure_issues_unique, position rows use vr_positions_unique on
-- (measure_id, politician_id, action_type), and status rows are guarded per
-- (position_id, status, effective_at) — the natural key of an append-only log
-- entry. Nothing is updated and nothing is deleted: there is no UPDATE, DELETE,
-- DROP, ALTER or TRUNCATE statement in this file.
--
-- measure_type 'proclamation' and 'memorandum' are new values in this lane and need
-- no schema change: vr_measures.measure_type is a plain text column with no CHECK
-- constraint, and db/exec-action-types.json already lists both under the directive
-- class. Same precedent as measure_type 'litigation' with chamber 'court'.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14173 integer;
  m_14222 integer;
  m_14169 integer;
  m_14186 integer;
  m_14261 integer;
  m_14153 integer;
  m_14164 integer;
  m_14162 integer;
  m_10886 integer;
  m_memo  integer;
  pos     integer;
  u       text;
  s       text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14173 — Ending Illegal Discrimination and Restoring
  --    Merit-Based Opportunity
  --
  --    The unlock. end_dei held one action and the circularity rule held it back,
  --    so the issue rendered no_record while an order on the subject sat in the
  --    file. This document is named by no stance card and no pledge, so the pair
  --    is independent and the issue becomes testable for the first time.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/31/2025-02097/ending-illegal-discrimination-and-restoring-merit-based-opportunity';

  SELECT id INTO m_14173
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14173'
   LIMIT 1;

  IF m_14173 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14173',
       'Ending Illegal Discrimination and Restoring Merit-Based Opportunity',
       'Ending illegal discrimination',
       'Signed 2025-01-21 and published at 90 FR 8633 on 2025-01-31. Revokes the '
       || 'executive order that imposed affirmative-action obligations on federal '
       || 'contractors and directs executive agencies to end federal preference '
       || 'programs. The register''s disposition record enumerates the revocations by '
       || 'number, including Executive Order 11246 of September 24, 1965 and Executive '
       || 'Order 13672 of July 21, 2014.',
       NULL, TIMESTAMPTZ '2025-01-21T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14173","frCitation":"90 FR 8633","frDocumentNumber":"2025-02097"}'::jsonb)
    RETURNING id INTO m_14173;
    RAISE NOTICE 'created vr_measures Executive Order 14173 as id %', m_14173;
  END IF;

  IF m_14173 IS NOT NULL THEN
    -- One mapping only. The order also speaks to civil-rights enforcement generally,
    -- and stretching it across further issue keys would manufacture coverage the
    -- document does not establish.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14173, 'end_dei', 100, true, 'yea_supports',
       'Revokes the executive order that imposed affirmative-action obligations on '
       || 'federal contractors and directs agencies to end federal preference '
       || 'programs. The Federal Register disposition record for this document '
       || 'enumerates the revocations by number, including EO 11246 of September 24, '
       || '1965 and EO 13672 of July 21, 2014.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14173, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-21T00:00:00Z', u,
       'Signed Executive Order 14173 on 2025-01-21. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14173 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-21T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14173 document record, 90 FR 8633',
             u,
             'Published at 90 FR 8633. The disposition record for this document lists '
             || 'the orders it revokes and carries no entry revoking or superseding it '
             || 'in turn, so it stands as published by later presidential action. That '
             || 'is the whole of the claim and it says nothing about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-21T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14222 — DOGE Cost Efficiency Initiative
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/03/03/2025-03527/implementing-the-presidents-department-of-government-efficiency-cost-efficiency-initiative';

  SELECT id INTO m_14222
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14222'
   LIMIT 1;

  IF m_14222 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14222',
       'Implementing the President''s "Department of Government Efficiency" Cost Efficiency Initiative',
       'DOGE cost efficiency initiative',
       'Signed 2025-02-26 and published at 90 FR 11095 on 2025-03-03. Section 1 '
       || 'commences what the order calls a transformation in federal spending on '
       || 'contracts, grants and loans, and directs agency heads to build a '
       || 'centralised review of covered payments with the DOGE team lead before they '
       || 'are made.',
       NULL, TIMESTAMPTZ '2025-02-26T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14222","frCitation":"90 FR 11095","frDocumentNumber":"2025-03527"}'::jsonb)
    RETURNING id INTO m_14222;
    RAISE NOTICE 'created vr_measures Executive Order 14222 as id %', m_14222;
  END IF;

  IF m_14222 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14222, 'cut_spending', 100, true, 'yea_supports',
       'Section 1 commences what the order calls a transformation in federal spending '
       || 'on contracts, grants and loans, and directs agency heads to build a '
       || 'centralised review of covered payments with the DOGE team lead before they '
       || 'are made.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14222, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-26T00:00:00Z', u,
       'Signed Executive Order 14222 on 2025-02-26. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14222 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-26T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14222 document record, 90 FR 11095',
             u,
             'Published at 90 FR 11095. The disposition record for this document '
             || 'carries a single cross-reference to EO 14158 and no entry revoking or '
             || 'superseding it, so it stands as published by later presidential '
             || 'action. This describes the order''s status in the register and is not '
             || 'a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-26T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14169 — Reevaluating and Realigning United States
  --    Foreign Aid
  --
  --    america_first_fp carried a stated position and not one document, so the
  --    lane reported "no action on file yet" about a foreign policy whose most
  --    consequential formal instrument was signed on day one.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/30/2025-02091/reevaluating-and-realigning-united-states-foreign-aid';

  SELECT id INTO m_14169
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14169'
   LIMIT 1;

  IF m_14169 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14169',
       'Reevaluating and Realigning United States Foreign Aid',
       'Realigning foreign aid',
       'Signed 2025-01-20 and published at 90 FR 8619 on 2025-01-30. Section 2 states '
       || 'as policy that no further United States foreign assistance shall be '
       || 'disbursed in a manner that is not fully aligned with the foreign policy of '
       || 'the President, and section 3 imposes an immediate pause on new obligations '
       || 'and disbursements pending review.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14169","frCitation":"90 FR 8619","frDocumentNumber":"2025-02091"}'::jsonb)
    RETURNING id INTO m_14169;
    RAISE NOTICE 'created vr_measures Executive Order 14169 as id %', m_14169;
  END IF;

  IF m_14169 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14169, 'america_first_fp', 100, true, 'yea_supports',
       'Section 2 states as policy that no further United States foreign assistance '
       || 'shall be disbursed in a manner that is not fully aligned with the foreign '
       || 'policy of the President, and section 3 imposes an immediate pause on new '
       || 'obligations and disbursements pending review.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14169, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14169 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14169 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- The order has been litigated over the funds it paused. This row deliberately
      -- reports only the register and claims no ruling: wave 3 established that a
      -- court outcome in this lane requires the opinion itself, read and cited.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14169 document record, 90 FR 8619',
             u,
             'Published at 90 FR 8619. The disposition record for this document '
             || 'carries a cross-reference to a later presidential memorandum and no '
             || 'entry revoking or superseding the order, so it stands as published by '
             || 'later presidential action. This order has been litigated over the '
             || 'funds it paused, and this row deliberately reports only the register: '
             || 'it is not a statement about any challenge to it, and no ruling is '
             || 'claimed here.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14186 — The Iron Dome for America
  --
  --    Coverage of the record rather than a new test: there is no directional
  --    stated position on strong_defense in the app, so Axis A will read this as
  --    an action with no stated word to check it against. That is the honest
  --    reading and it is exactly what that bucket is for.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/02/03/2025-02182/the-iron-dome-for-america';

  SELECT id INTO m_14186
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14186'
   LIMIT 1;

  IF m_14186 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14186',
       'The Iron Dome for America',
       'Iron Dome for America',
       'Signed 2025-01-27 and published at 90 FR 8767 on 2025-02-03. Directs the '
       || 'Secretary of Defense to submit an architecture and implementation plan for '
       || 'a next-generation missile defense shield for the United States, including '
       || 'the capability to defeat ballistic, hypersonic and cruise missile attacks.',
       NULL, TIMESTAMPTZ '2025-01-27T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14186","frCitation":"90 FR 8767","frDocumentNumber":"2025-02182"}'::jsonb)
    RETURNING id INTO m_14186;
    RAISE NOTICE 'created vr_measures Executive Order 14186 as id %', m_14186;
  END IF;

  IF m_14186 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14186, 'strong_defense', 100, true, 'yea_supports',
       'Directs the Secretary of Defense to submit an architecture and implementation '
       || 'plan for a next-generation missile defense shield for the United States, '
       || 'including the capability to defeat ballistic, hypersonic and cruise missile '
       || 'attacks.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14186, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-27T00:00:00Z', u,
       'Signed Executive Order 14186 on 2025-01-27. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14186 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-27T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14186 document record, 90 FR 8767',
             u,
             'Published at 90 FR 8767. The disposition record for this document '
             || 'carries one cross-reference, to EO 14369 of December 18, 2025, and '
             || 'that later order''s own disposition record revokes EO 14056 rather '
             || 'than this one — so nothing on file revokes or supersedes it. This '
             || 'describes the register only and is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-27T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Executive Order 14261 — Reinvigorating America's Beautiful Clean Coal
  --    Industry and Amending Executive Order 14241
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/04/14/2025-06380/reinvigorating-americas-beautiful-clean-coal-industry-and-amending-executive-order-14241';

  SELECT id INTO m_14261
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14261'
   LIMIT 1;

  IF m_14261 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14261',
       'Reinvigorating America''s Beautiful Clean Coal Industry and Amending Executive Order 14241',
       'Reinvigorating coal',
       'Signed 2025-04-08 and published at 90 FR 15517 on 2025-04-14. Section 1 '
       || 'states that increasing domestic energy production including coal is the '
       || 'purpose of the order; section 3 designates coal as a mineral under '
       || 'Executive Order 14241 so that it receives that order''s expedited '
       || 'treatment; section 4 directs reporting on coal resources on federal lands.',
       NULL, TIMESTAMPTZ '2025-04-08T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14261","frCitation":"90 FR 15517","frDocumentNumber":"2025-06380"}'::jsonb)
    RETURNING id INTO m_14261;
    RAISE NOTICE 'created vr_measures Executive Order 14261 as id %', m_14261;
  END IF;

  IF m_14261 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14261, 'energy_production', 100, true, 'yea_supports',
       'Section 1 states that increasing domestic energy production including coal is '
       || 'the purpose of the order, and section 3 designates coal as a mineral under '
       || 'EO 14241 so that it receives that order''s expedited treatment.', u),
      (m_14261, 'lands_energy', 60, false, 'yea_supports',
       'Section 4 directs the Secretaries of the Interior, Agriculture and Energy to '
       || 'report on coal resources and reserves on federal lands and on obstacles to '
       || 'leasing and mining them.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14261, 'trump', 'issued', true, TIMESTAMPTZ '2025-04-08T00:00:00Z', u,
       'Signed Executive Order 14261 on 2025-04-08. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14261 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-04-08T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14261 document record, 90 FR 15517',
             u,
             'Published at 90 FR 15517. The disposition record for this document shows '
             || 'that it amends EO 14241 and cross-references EO 14386 of February 11, '
             || '2026; that later order''s own disposition record cross-references this '
             || 'one without revoking it, so nothing on file revokes or supersedes it. '
             || 'This is a reading of the register and is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-04-08T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Executive Order 14153 — Unleashing Alaska's Extraordinary Resource
  --    Potential
  --
  --    lands_energy is the clearest case in the file of an issue with real formal
  --    action and no stated word. This row does not move a verdict and is not
  --    meant to: it makes the federal-lands record legible so the gap is visibly a
  --    missing STATED POSITION rather than a missing action.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/29/2025-01955/unleashing-alaskas-extraordinary-resource-potential';

  SELECT id INTO m_14153
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14153'
   LIMIT 1;

  IF m_14153 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14153',
       'Unleashing Alaska''s Extraordinary Resource Potential',
       'Unleashing Alaska',
       'Signed 2025-01-20 and published at 90 FR 8347 on 2025-01-29. Directs the '
       || 'Secretaries of the Interior, Agriculture, Energy and Commerce to expedite '
       || 'permitting and leasing for energy and natural-resource projects in Alaska, '
       || 'to reopen federal acreage there to development, and to prioritise the '
       || 'development of the state''s liquefied natural gas potential.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14153","frCitation":"90 FR 8347","frDocumentNumber":"2025-01955"}'::jsonb)
    RETURNING id INTO m_14153;
    RAISE NOTICE 'created vr_measures Executive Order 14153 as id %', m_14153;
  END IF;

  IF m_14153 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14153, 'lands_energy', 100, true, 'yea_supports',
       'Directs the Secretaries of the Interior, Agriculture, Energy and Commerce to '
       || 'expedite permitting and leasing for energy and natural-resource projects in '
       || 'Alaska and to reopen federal acreage there to development.', u),
      (m_14153, 'energy_production', 70, false, 'yea_supports',
       'Section 3 directs agencies to prioritise the development of Alaska''s '
       || 'liquefied natural gas potential, including the transport of that gas to '
       || 'other regions of the United States and to allied nations.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14153, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14153 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14153 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14153 document record, 90 FR 8347',
             u,
             'Published at 90 FR 8347. The disposition record for this document is '
             || 'empty — no later presidential action revokes, supersedes or amends it '
             || '— so it stands as published. That is a reading of the register and is '
             || 'not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Executive Order 14164 — Restoring the Death Penalty and Protecting
  --    Public Safety
  --
  --    tough_on_crime was tested by two documents whose primary subject is
  --    something else — a signed immigration-detention law and a signed
  --    fentanyl-scheduling law. This is the first action on file whose own
  --    subject IS the stated position.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/30/2025-02012/restoring-the-death-penalty-and-protecting-public-safety';

  SELECT id INTO m_14164
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14164'
   LIMIT 1;

  IF m_14164 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14164',
       'Restoring the Death Penalty and Protecting Public Safety',
       'Restoring the death penalty',
       'Signed 2025-01-20 and published at 90 FR 8463 on 2025-01-30. Directs the '
       || 'Attorney General to pursue the death penalty for federal capital crimes '
       || 'and to seek it in particular for the murder of a law-enforcement officer '
       || 'and for capital crimes committed by people unlawfully present in the '
       || 'United States.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14164","frCitation":"90 FR 8463","frDocumentNumber":"2025-02012"}'::jsonb)
    RETURNING id INTO m_14164;
    RAISE NOTICE 'created vr_measures Executive Order 14164 as id %', m_14164;
  END IF;

  IF m_14164 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14164, 'tough_on_crime', 100, true, 'yea_supports',
       'Directs the Attorney General to pursue the death penalty for federal capital '
       || 'crimes and to seek it in particular for the murder of a law-enforcement '
       || 'officer and for capital crimes committed by people unlawfully present in '
       || 'the United States.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14164, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14164 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14164 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14164 document record, 90 FR 8463',
             u,
             'Published at 90 FR 8463. The disposition record for this document is '
             || 'empty — no later presidential action revokes or supersedes it — so it '
             || 'stands as published. This reports the register and is not a statement '
             || 'about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H. Executive Order 14162 — Putting America First in International
  --    Environmental Agreements
  --
  --    The single most-cited executive action on the app's climate stance card was
  --    not in the file. It arrives FLAGGED rather than scoring, because the card's
  --    evidence line is this document described in prose, and a position is never
  --    its own test. climate_action keeps two independent tests it does not name.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/30/2025-02010/putting-america-first-in-international-environmental-agreements';

  SELECT id INTO m_14162
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14162'
   LIMIT 1;

  IF m_14162 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14162',
       'Putting America First in International Environmental Agreements',
       'Paris Agreement withdrawal',
       'Signed 2025-01-20 and published at 90 FR 8455 on 2025-01-30. Section 3 '
       || 'directs the United States Ambassador to the United Nations to submit '
       || 'immediate written notice of withdrawal from the Paris Agreement and from '
       || 'any other commitment made under the United Nations Framework Convention on '
       || 'Climate Change.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14162","frCitation":"90 FR 8455","frDocumentNumber":"2025-02010"}'::jsonb)
    RETURNING id INTO m_14162;
    RAISE NOTICE 'created vr_measures Executive Order 14162 as id %', m_14162;
  END IF;

  IF m_14162 IS NOT NULL THEN
    -- 'yea_opposes' reads as `opposes` in the executive vocabulary. The direction is
    -- the document's, not ours: climate_action is written in the participatory
    -- direction and this order directs withdrawal.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14162, 'climate_action', 100, true, 'yea_opposes',
       'Section 3 directs the United States Ambassador to the United Nations to '
       || 'submit immediate written notice of withdrawal from the Paris Agreement and '
       || 'from any other commitment made under the United Nations Framework '
       || 'Convention on Climate Change.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14162, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14162 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14162 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14162 document record, 90 FR 8455',
             u,
             'Published at 90 FR 8455. The disposition record for this document '
             || 'carries a cross-reference to a later presidential memorandum and no '
             || 'entry revoking or superseding the order, so it stands as published by '
             || 'later presidential action. This is a reading of the register and is '
             || 'not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- I. Proclamation 10886 — Declaring a National Emergency at the Southern
  --    Border of the United States
  --
  --    The first row in the lane that is neither a law nor an executive order.
  --    Its standing uses 'register_continuation', because the question a reader
  --    has about an emergency declaration is not whether it was revoked but
  --    whether it LAPSED — a National Emergencies Act declaration expires after
  --    one year unless the President continues it, and this one was continued.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/29/2025-01948/declaring-a-national-emergency-at-the-southern-border-of-the-united-states';
  s := 'https://www.federalregister.gov/documents/2025/08/04/2025-14789/notice-on-declaring-a-national-emergency-at-the-southern-border-of-the-united-states';

  SELECT id INTO m_10886
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 10886'
   LIMIT 1;

  IF m_10886 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 10886',
       'Declaring a National Emergency at the Southern Border of the United States',
       'Southern border emergency',
       'Signed 2025-01-20 and published at 90 FR 8327 on 2025-01-29. Declares a '
       || 'national emergency at the southern border under the National Emergencies '
       || 'Act and directs the Secretaries of Defense and Homeland Security to order '
       || 'units of the armed forces to the border in support of the Department of '
       || 'Homeland Security''s mission there. Continued past its first anniversary '
       || 'by a notice signed 2025-07-15 and published at 90 FR 37371.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"10886","frCitation":"90 FR 8327","frDocumentNumber":"2025-01948"}'::jsonb)
    RETURNING id INTO m_10886;
    RAISE NOTICE 'created vr_measures Proclamation 10886 as id %', m_10886;
  END IF;

  IF m_10886 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_10886, 'border_security', 100, true, 'yea_supports',
       'Declares a national emergency at the southern border under the National '
       || 'Emergencies Act and directs the Secretaries of Defense and Homeland '
       || 'Security to order units of the armed forces to the border in support of '
       || 'the Department of Homeland Security''s mission there.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_10886, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Issued Proclamation 10886 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_10886 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- effective_at is the date of the CONTINUATION, not of the proclamation: the
      -- fact this row establishes is that the declaration was still on foot as of
      -- 2025-07-15, and dating it to the original signature would claim less than the
      -- source supports while looking like it claims more.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-15T00:00:00Z',
             'President of the United States, by notice continuing the declared emergency',
             'Federal Register — Notice on Declaring a National Emergency at the Southern Border of the United States, 90 FR 37371',
             s,
             'A National Emergencies Act declaration expires one year after it is '
             || 'declared unless the President continues it. This notice, signed July '
             || '15, 2025 and published at 90 FR 37371, continues the emergency '
             || 'declared in this proclamation beyond its first anniversary, so it had '
             || 'not lapsed. A continuation is itself a presidential act: it '
             || 'establishes that the declaration is still on foot and is not a '
             || 'statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-15T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- J. Presidential Memorandum of January 20, 2025 — Delivering Emergency Price
  --    Relief for American Families and Defeating the Cost-of-Living Crisis
  --
  --    cost_living is the most-tested subject on this profile and had nothing
  --    formal behind it. The pledge on the issue is scored BROKEN against a BLS
  --    series while the lane reported no action on file — the profile was grading
  --    a commitment and claiming to hold nothing about it at the same time.
  --    Recording it completes the record in the direction that does not flatter.
  --
  --    The Federal Register citation is the document id. A memorandum has no
  --    number of its own the way an order or a proclamation does, and a bare
  --    "Presidential Memorandum of January 20, 2025" would not be unique — several
  --    were signed that day. The citation is unique, permanent and resolvable.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis';

  SELECT id INTO m_memo
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Memorandum, 90 FR 8245'
   LIMIT 1;

  IF m_memo IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'Presidential Memorandum, 90 FR 8245',
       'Delivering Emergency Price Relief for American Families and Defeating the Cost-of-Living Crisis',
       'Emergency price relief memorandum',
       'Signed 2025-01-20 and published at 90 FR 8245 on 2025-01-28. Directs the '
       || 'heads of all executive departments and agencies to deliver emergency price '
       || 'relief and to pursue appropriate actions to lower the cost of housing, '
       || 'health care, food and energy, and to report to the Assistant to the '
       || 'President for Economic Policy every thirty days.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"frCitation":"90 FR 8245","frDocumentNumber":"2025-01904"}'::jsonb)
    RETURNING id INTO m_memo;
    RAISE NOTICE 'created vr_measures Presidential Memorandum 90 FR 8245 as id %', m_memo;
  END IF;

  IF m_memo IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_memo, 'cost_living', 100, true, 'yea_supports',
       'Directs the heads of all executive departments and agencies to deliver '
       || 'emergency price relief and to pursue appropriate actions to lower the cost '
       || 'of housing, health care, food and energy, and to report to the Assistant to '
       || 'the President for Economic Policy every thirty days.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_memo, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Issued the memorandum on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_memo AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Presidential Memorandum of January 20, 2025 document record, 90 FR 8245',
             u,
             'Published at 90 FR 8245. The disposition record for this document is '
             || 'empty — no later presidential action revokes or supersedes it — so '
             || 'the direction to agencies stands as published. Standing describes the '
             || 'instrument, not its effect: this row asserts that the memorandum is '
             || 'on foot and asserts nothing about prices, and it is not a statement '
             || 'about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

END $$;
