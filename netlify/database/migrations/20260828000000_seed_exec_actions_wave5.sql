-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 5: the last two fully-held issues, and a
--    tariff record that did not depend on a single struck-down order
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql and
-- 20260826000000_seed_exec_actions_wave4.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 5 together and asserts that every citation, date and issue
-- key in that file appears in one of them, so the client data and the database rows
-- cannot drift apart without the suite failing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 4 closed the stated-position holes. The audit afterwards found three kinds
-- of weakness left, and this wave answers them in descending order of severity.
--
--   A. TWO ISSUES WERE STILL FULLY HELD. healthcare and cost_living each held
--      documents and each rendered no_record, because every document on them is
--      named by the card that states the position:
--        · healthcare held only Public Law 119-21, and the stance card on that
--          issue — "H.R.1: Medicaid & SNAP" — exists to report that same law's
--          projected coverage effect.
--        · cost_living held only the memorandum published at 90 FR 8245, which the
--          card on the issue quotes by title.
--      As in wave 4, the remedy is the rule's own: a DIFFERENT document, not a
--      lifted flag. Every pair flagged circularWithStance before this migration is
--      still flagged after it. Four documents are added across the two issues, two
--      each, because a hold broken by exactly one document is broken by a coin flip.
--
--   B. THE WHOLE TARIFF QUADRANT RESTED ON ONE ORDER — AND THAT ORDER WAS HELD
--      UNAUTHORIZED. econ_trade, tariffs_authority, tariffs_china, tariffs_growth
--      and tariffs_prices all traced to Executive Order 14257, whose struck_down row
--      wave 3 wrote from Learning Resources, Inc. v. Trump (Feb. 20, 2026). A record
--      of trade policy that evaporates with one opinion is not a record of trade
--      policy. Proclamation 10896 is issued under section 232 of the Trade Expansion
--      Act of 1962 — a delegation Congress enacted — and is untouched by that holding
--      and by Executive Order 14389, which ended the duties imposed under the
--      emergency statute. The America First Trade Policy memorandum is the day-one
--      instrument the later orders grow out of. Executive Order 14195 carries the
--      China leg with its own honest ending.
--
--   C. america_first CARRIED A STATED POSITION AND ZERO DOCUMENTS. The profile
--      leads with "Defense & Foreign Policy" while the lane reported nothing on file
--      under that key at all — the key mismatch with america_first_fp, which wave 4
--      had filled. Executive Order 14150 is the instrument of the posture itself.
--
-- It also files the first `superseded` standing in the lane. That status has been
-- renderable since Phase 1 with nothing in it, so the record could not previously
-- show the ordinary case of a president ending his own earlier action.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Federal Register API document records, queried one document at a time for title,
-- signing date, publication date, citation, document number and disposition notes:
--   EO 14212     signed 2025-02-13, published 2025-02-19, 90 FR  9833, doc 2025-02871
--   EO 14293     signed 2025-05-05, published 2025-05-08, 90 FR 19615, doc 2025-08267
--   Proc. 11010  signed 2026-02-06, published 2026-02-13, 91 FR  7107, doc 2026-03050
--   EO 14394     signed 2026-03-13, published 2026-03-18, 91 FR 13207, doc 2026-05388
--   Proc. 10896  signed 2025-02-10, published 2025-02-18, 90 FR  9817, doc 2025-02833
--   Memorandum   signed 2025-01-20, published 2025-01-30, 90 FR  8471, doc 2025-02032
--   EO 14195     signed 2025-02-01, published 2025-02-07, 90 FR  9121, doc 2025-02408
--   EO 14399     signed 2026-03-31, published 2026-04-03, 91 FR 17125, doc 2026-06601
--   EO 14150     signed 2025-01-20, published 2025-01-29, 90 FR  8337, doc 2025-01952
--
-- Disposition notes were read for each, and every forward cross-reference that could
-- plausibly have been a repeal was opened and checked directly:
--   · EO 14212 cross-references EO 14355 of September 30, 2025 and EO 14414 of
--     June 25, 2026. Both were fetched. Both are later health and agriculture orders
--     that cite the Commission; neither revokes or supersedes it.
--   · EO 14293 cross-references EO 13944 of August 6, 2020 — the first-term
--     predecessor the order itself names — and nothing forward.
--   · EO 14150 cross-references EO 13985 of January 20, 2021, which it displaces,
--     and a memorandum of July 15, 2025.
--   · Proc. 11010, EO 14394, Proc. 10896, the memorandum at 90 FR 8471 and EO 14399
--     carry no revoking or superseding entry at all.
-- A cross-reference is not a repeal, and the in_force rows below claim only what the
-- register establishes.
--
-- One further document was fetched, for a standing rather than for an action:
--   EO 14389, Ending Certain Tariff Actions, signed 2026-02-20, published
--   2026-02-25, 91 FR 9437, doc 2026-03832. It provides that the additional ad
--   valorem duties imposed under the International Emergency Economic Powers Act by
--   EO 14195, as amended, shall no longer be in effect and shall no longer be
--   collected, and states that the national emergency and every other action taken
--   under it are unaffected. That is what the `superseded` row in section G records:
--   the end of the duties, not the end of the order.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPINGS DELIBERATELY NOT WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14212 is NOT mapped to health_drug_prices or healthcare_costs. The order is
-- about chronic disease and the research agenda behind it; it sets no price and
-- directs no pricing action. Mapping it to a pricing issue would be reading the word
-- "health" rather than the document.
--
-- Proclamation 11010 is NOT mapped to econ_trade or to any tariffs_* issue, although
-- the instrument is a tariff-rate quota. It LOWERS a trade barrier to bring a
-- consumer price down, which is the opposite direction from every tariff document on
-- this profile; filing it under a tariff issue would make the trade record read as
-- though it pointed both ways on the strength of one grocery measure.
--
-- Proclamation 10896 is NOT mapped to tariffs_authority, and the omission is the
-- point of the row. That issue is about setting tariffs without Congress; this
-- proclamation acts under section 232 of the Trade Expansion Act of 1962, which is a
-- delegation Congress enacted. Carrying it there would file a use of congressional
-- authority as evidence of bypassing Congress.
--
-- EO 14150 is NOT mapped to strong_defense. The order reaches the Department of
-- State and nothing else; the defense half of the stance it tests is carried by the
-- two documents already on that issue.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ONE DOCUMENT DELIBERATELY NOT SEEDED AS AN ACTION
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14389, Ending Certain Tariff Actions. It appears below only as the authority
-- for a standing, never as an action with issue mappings of its own. The order ends
-- the IEEPA duties in compliance with the Supreme Court's holding; mapping it as
-- formally opposing tariffs_growth would read compelled compliance as a policy
-- reversal, which is our inference and not the document's text. The lane's rule is to
-- fail closed, so the record reports what the order did to the duties and nothing
-- about why.
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
-- measure_type 'proclamation' and 'memorandum' were introduced by wave 4 and need no
-- schema change: vr_measures.measure_type is a plain text column with no CHECK
-- constraint, and db/exec-action-types.json lists both under the directive class.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14212 integer;
  m_14293 integer;
  m_11010 integer;
  m_14394 integer;
  m_10896 integer;
  m_aftp  integer;
  m_14195 integer;
  m_14399 integer;
  m_14150 integer;
  pos     integer;
  u       text;
  s       text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14212 — Establishing the President's Make America Healthy
  --    Again Commission
  --
  --    Hold-break #1. healthcare held one document, Public Law 119-21, and the
  --    card on the issue reports that same law's projected coverage effect, so the
  --    pair cannot test itself and the issue rendered no_record. This document is
  --    named by no card and no pledge in the app.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/02/19/2025-02871/establishing-the-presidents-make-america-healthy-again-commission';

  SELECT id INTO m_14212
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14212'
   LIMIT 1;

  IF m_14212 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14212',
       'Establishing the President''s Make America Healthy Again Commission',
       'Make America Healthy Again Commission',
       'Signed 2025-02-13 and published at 90 FR 9833 on 2025-02-19. Establishes the '
       || 'President''s Make America Healthy Again Commission, chaired by the '
       || 'Secretary of Health and Human Services, and directs it to submit the Make '
       || 'Our Children Healthy Again Assessment to the President within 100 days.',
       NULL, TIMESTAMPTZ '2025-02-13T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14212","frCitation":"90 FR 9833","frDocumentNumber":"2025-02871"}'::jsonb)
    RETURNING id INTO m_14212;
    RAISE NOTICE 'created vr_measures Executive Order 14212 as id %', m_14212;
  END IF;

  IF m_14212 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14212, 'healthcare', 100, true, 'yea_supports',
       'Establishes the President''s Make America Healthy Again Commission, chaired '
       || 'by the Secretary of Health and Human Services, and directs it to study the '
       || 'childhood chronic disease crisis and its contributing causes and to submit '
       || 'the Make Our Children Healthy Again Assessment to the President within 100 '
       || 'days. Section 2 sets the policy that agencies addressing health or '
       || 'healthcare focus on reversing chronic disease and ensure the availability '
       || 'of expanded treatment options.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14212, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-13T00:00:00Z', u,
       'Signed Executive Order 14212 on 2025-02-13. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14212 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-19T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14212 document record, 90 FR 9833',
             u,
             'The register''s disposition record for this order carries two forward '
             || 'cross-references — Executive Order 14355 of September 30, 2025 and '
             || 'Executive Order 14414 of June 25, 2026 — and neither revokes or '
             || 'supersedes it; both were read and are later health and agriculture '
             || 'orders that cite the Commission rather than end it. So the order '
             || 'stands as published. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-19T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14293 — Regulatory Relief To Promote Domestic Production
  --    of Critical Medicines
  --
  --    The second independent healthcare document, and a third for
  --    health_drug_prices — that issue held two documents and one of them was held
  --    circular against its own card, so it was resting on a single testable row too.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/05/08/2025-08267/regulatory-relief-to-promote-domestic-production-of-critical-medicines';

  SELECT id INTO m_14293
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14293'
   LIMIT 1;

  IF m_14293 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14293',
       'Regulatory Relief To Promote Domestic Production of Critical Medicines',
       'Domestic production of critical medicines',
       'Signed 2025-05-05 and published at 90 FR 19615 on 2025-05-08. Directs the '
       || 'Commissioner of Food and Drugs, within 180 days, to eliminate duplicative '
       || 'or unnecessary regulations governing domestic pharmaceutical manufacturing '
       || 'and to improve the timeliness and predictability of agency review of new '
       || 'and expanded manufacturing capacity.',
       NULL, TIMESTAMPTZ '2025-05-05T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14293","frCitation":"90 FR 19615","frDocumentNumber":"2025-08267"}'::jsonb)
    RETURNING id INTO m_14293;
    RAISE NOTICE 'created vr_measures Executive Order 14293 as id %', m_14293;
  END IF;

  IF m_14293 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14293, 'healthcare', 80, true, 'yea_supports',
       'Directs the Commissioner of Food and Drugs, within 180 days, to review and '
       || 'eliminate duplicative or unnecessary regulations and guidance governing '
       || 'domestic pharmaceutical manufacturing, and to improve the timeliness and '
       || 'predictability of agency review of new and expanded manufacturing '
       || 'capacity.', u),
      (m_14293, 'health_drug_prices', 60, false, 'yea_supports',
       'Sets as policy the restoration of a domestic pharmaceutical manufacturing '
       || 'base on the stated ground that the barriers it removes stand in the way of '
       || 'an affordable pharmaceutical supply chain for American patients.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14293, 'trump', 'issued', true, TIMESTAMPTZ '2025-05-05T00:00:00Z', u,
       'Signed Executive Order 14293 on 2025-05-05. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14293 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-05-08T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14293 document record, 90 FR 19615',
             u,
             'The register''s disposition record for this order carries one '
             || 'cross-reference, back to Executive Order 13944 of August 6, 2020, '
             || 'which the order itself cites as the first-term predecessor it builds '
             || 'on. There is no entry revoking or superseding it, so it stands as '
             || 'published. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-05-08T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Proclamation 11010 — Ensuring Affordable Beef for the American Consumer
  --
  --    Hold-break #2. cost_living held only the day-one memorandum at 90 FR 8245,
  --    which the card on the issue quotes by title. That memorandum names four cost
  --    categories — housing, health care, food and energy. This is a formal action
  --    inside one of them, signed thirteen months later, that no card names.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/02/13/2026-03050/ensuring-affordable-beef-for-the-american-consumer';

  SELECT id INTO m_11010
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11010'
   LIMIT 1;

  IF m_11010 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11010',
       'Ensuring Affordable Beef for the American Consumer',
       'Beef tariff-rate quota increase',
       'Signed 2026-02-06 and published at 91 FR 7107 on 2026-02-13. Increases the '
       || 'calendar-year 2026 in-quota quantity of the beef tariff-rate quota by '
       || '80,000 metric tons of lean beef trimmings, released in four quarterly '
       || 'tranches and allocated in its entirety to Argentina.',
       NULL, TIMESTAMPTZ '2026-02-06T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11010","frCitation":"91 FR 7107","frDocumentNumber":"2026-03050"}'::jsonb)
    RETURNING id INTO m_11010;
    RAISE NOTICE 'created vr_measures Proclamation 11010 as id %', m_11010;
  END IF;

  IF m_11010 IS NOT NULL THEN
    -- One mapping only, and the mappings NOT written are the point: see the header.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11010, 'cost_living', 100, true, 'yea_supports',
       'Increases the calendar-year 2026 in-quota quantity of the beef tariff-rate '
       || 'quota by 80,000 metric tons of lean beef trimmings, released in four '
       || 'quarterly tranches and allocated in its entirety to Argentina, on the '
       || 'determination that domestic supply would otherwise be inadequate to meet '
       || 'domestic demand at reasonable prices.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11010, 'trump', 'issued', true, TIMESTAMPTZ '2026-02-06T00:00:00Z', u,
       'Issued Proclamation 11010 on 2026-02-06. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11010 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-13T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11010 document record, 91 FR 7107',
             u,
             'The register''s disposition record for this proclamation carries no '
             || 'cross-references at all, so nothing has revoked, amended or '
             || 'superseded it and it stands as published. Standing describes the '
             || 'instrument, not its effect: this row asserts that the quota increase '
             || 'is on foot and asserts nothing about the price of beef. This is not a '
             || 'statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-13T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14394 — Removing Regulatory Barriers to Affordable Home
  --    Construction
  --
  --    The second independent document on cost_living, in a second one of the
  --    memorandum's four named cost categories, and the first document on this
  --    profile filed under housing_build.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/03/18/2026-05388/removing-regulatory-barriers-to-affordable-home-construction';

  SELECT id INTO m_14394
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14394'
   LIMIT 1;

  IF m_14394 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14394',
       'Removing Regulatory Barriers to Affordable Home Construction',
       'Regulatory barriers to home construction',
       'Signed 2026-03-13 and published at 91 FR 13207 on 2026-03-18. Directs the '
       || 'Army Corps of Engineers and the Environmental Protection Agency to revise '
       || 'stormwater, wetlands and Clean Water Act section 404 permitting '
       || 'requirements to reduce housing construction costs, and directs Commerce, '
       || 'HUD, Transportation and the Federal Housing Finance Agency to consider '
       || 'eliminating rules that constrain residential development.',
       NULL, TIMESTAMPTZ '2026-03-13T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14394","frCitation":"91 FR 13207","frDocumentNumber":"2026-05388"}'::jsonb)
    RETURNING id INTO m_14394;
    RAISE NOTICE 'created vr_measures Executive Order 14394 as id %', m_14394;
  END IF;

  IF m_14394 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14394, 'housing_build', 100, true, 'yea_supports',
       'Directs the Army Corps of Engineers and the Environmental Protection Agency '
       || 'to revise stormwater, wetlands and Clean Water Act section 404 permitting '
       || 'requirements to reduce housing construction costs, and directs Commerce, '
       || 'HUD, Transportation and the Federal Housing Finance Agency to consider '
       || 'eliminating rules that constrain residential development.', u),
      (m_14394, 'cost_living', 80, false, 'yea_supports',
       'Sets as administration policy the reduction of regulatory barriers to '
       || 'building homes on the stated ground that permitting delays and mandates '
       || 'have driven up the cost of new housing and made it less affordable.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14394, 'trump', 'issued', true, TIMESTAMPTZ '2026-03-13T00:00:00Z', u,
       'Signed Executive Order 14394 on 2026-03-13. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14394 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-03-18T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14394 document record, 91 FR 13207',
             u,
             'The register''s disposition record for this order carries no '
             || 'cross-references, so nothing has revoked or superseded it and it '
             || 'stands as published. The order directs rulemaking rather than '
             || 'performing it, so this row asserts that the direction is on foot and '
             || 'asserts nothing about any rule that follows from it. This is not a '
             || 'statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-03-18T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Proclamation 10896 — Adjusting Imports of Steel Into the United States
  --
  --    The row that matters most in this wave. Five tariff issues rested on
  --    Executive Order 14257 alone, and the Supreme Court held on February 20, 2026
  --    that the statute that order was issued under does not authorize tariffs at
  --    all. This proclamation acts under section 232 of the Trade Expansion Act of
  --    1962 and is untouched by that holding, so the tariff record now has a second
  --    leg that does not depend on the first.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/02/18/2025-02833/adjusting-imports-of-steel-into-the-united-states';

  SELECT id INTO m_10896
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 10896'
   LIMIT 1;

  IF m_10896 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 10896',
       'Adjusting Imports of Steel Into the United States',
       'Section 232 steel duty restored',
       'Signed 2025-02-10 and published at 90 FR 9817 on 2025-02-18. Terminates every '
       || 'country arrangement, exemption and quota that had displaced the section 232 '
       || 'steel tariff — for South Korea, Argentina, Australia, Brazil, Canada, '
       || 'Mexico, the European Union, Japan, the United Kingdom and Ukraine — '
       || 'effective March 12, 2025. Issued under section 232 of the Trade Expansion '
       || 'Act of 1962, not under the emergency statute.',
       NULL, TIMESTAMPTZ '2025-02-10T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"10896","frCitation":"90 FR 9817","frDocumentNumber":"2025-02833"}'::jsonb)
    RETURNING id INTO m_10896;
    RAISE NOTICE 'created vr_measures Proclamation 10896 as id %', m_10896;
  END IF;

  IF m_10896 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_10896, 'tariffs_growth', 100, true, 'yea_supports',
       'Terminates every country arrangement, exemption and quota that had displaced '
       || 'the section 232 steel tariff — for South Korea, Argentina, Australia, '
       || 'Brazil, Canada, Mexico, the European Union, Japan, the United Kingdom and '
       || 'Ukraine — effective March 12, 2025, restoring the ad valorem duty across '
       || 'steel imports.', u),
      (m_10896, 'econ_trade', 70, false, 'yea_supports',
       'Uses import duties on a single industrial input as the instrument for '
       || 'rebuilding domestic steel capacity, and removes the alternative '
       || 'arrangements that had let named partners ship outside the duty.', u),
      (m_10896, 'tariffs_prices', 60, false, 'yea_opposes',
       'Restores the duty across the steel import base with no offsetting relief for '
       || 'downstream purchasers.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_10896, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-10T00:00:00Z', u,
       'Issued Proclamation 10896 on 2025-02-10. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_10896 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-18T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 10896 document record, 90 FR 9817',
             u,
             'The register''s disposition record for this proclamation carries no '
             || 'revoking or superseding entry, so it stands as published. It is not '
             || 'among the documents whose duties Executive Order 14389 of February '
             || '20, 2026 ended: that order reaches only the additional ad valorem '
             || 'duties imposed under the International Emergency Economic Powers Act, '
             || 'and this proclamation was issued under section 232 of the Trade '
             || 'Expansion Act of 1962. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-18T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Presidential Memorandum, 90 FR 8471 — America First Trade Policy
  --
  --    The day-one trade instrument, and the document the later tariff orders grow
  --    out of. It is a memorandum, which is why it belongs to the lesser-instrument
  --    class rather than the order class — the distinction `directive` exists to
  --    preserve. As in wave 4, the Federal Register citation is the document id: a
  --    memorandum has no number of its own, and several were signed that day.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/30/2025-02032/america-first-trade-policy';

  SELECT id INTO m_aftp
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Memorandum, 90 FR 8471'
   LIMIT 1;

  IF m_aftp IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'Presidential Memorandum, 90 FR 8471',
       'America First Trade Policy',
       'America First Trade Policy memorandum',
       'Signed 2025-01-20 and published at 90 FR 8471 on 2025-01-30. Directs the '
       || 'Secretary of Commerce, with the Treasury and the Trade Representative, to '
       || 'investigate the causes of persistent annual goods trade deficits and to '
       || 'recommend remedies including a global supplemental tariff, and directs the '
       || 'Treasury to report on the feasibility of an external revenue service to '
       || 'collect duties.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"frCitation":"90 FR 8471","frDocumentNumber":"2025-02032"}'::jsonb)
    RETURNING id INTO m_aftp;
    RAISE NOTICE 'created vr_measures Presidential Memorandum 90 FR 8471 as id %', m_aftp;
  END IF;

  IF m_aftp IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_aftp, 'econ_trade', 100, true, 'yea_supports',
       'Directs the Secretary of Commerce, with the Treasury and the Trade '
       || 'Representative, to investigate the causes of persistent annual goods trade '
       || 'deficits and to recommend remedies including a global supplemental tariff, '
       || 'and directs the Treasury to report on the feasibility of an external '
       || 'revenue service to collect duties.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_aftp, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Issued the memorandum on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_aftp AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-30T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — America First Trade Policy document record, 90 FR 8471',
             u,
             'The register''s disposition record for this memorandum carries no '
             || 'revoking or superseding entry, so the direction to agencies stands as '
             || 'published. The later tariff actions it asked agencies to recommend '
             || 'have their own standing rows on their own documents; this row asserts '
             || 'only that the direction is on foot. This is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-30T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Executive Order 14195 — Imposing Duties To Address the Synthetic Opioid
  --    Supply Chain in the People's Republic of China
  --
  --    Two thin issues at once — tariffs_china and immig_fentanyl each held exactly
  --    one document — and the lane's first `superseded` standing. The sequence is
  --    the value of the row: duties imposed under an emergency statute in February
  --    2025, ended by the President's own later order in February 2026. Two status
  --    rows, for the same reason wave 3 wrote two for EO 14257: one word for the
  --    whole sequence would either hide the ending or hide the year of collection.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/02/07/2025-02408/imposing-duties-to-address-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of-china';
  s := 'https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions';

  SELECT id INTO m_14195
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14195'
   LIMIT 1;

  IF m_14195 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14195',
       'Imposing Duties To Address the Synthetic Opioid Supply Chain in the People''s Republic of China',
       'PRC synthetic opioid duties',
       'Signed 2025-02-01 and published at 90 FR 9121 on 2025-02-07. Imposes an '
       || 'additional ad valorem duty on all articles that are products of the '
       || 'People''s Republic of China under the International Emergency Economic '
       || 'Powers Act, and expands the emergency declared in Proclamation 10886 to '
       || 'cover the PRC synthetic opioid supply chain. The duties were ended by '
       || 'Executive Order 14389 of February 20, 2026.',
       NULL, TIMESTAMPTZ '2025-02-01T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14195","frCitation":"90 FR 9121","frDocumentNumber":"2025-02408"}'::jsonb)
    RETURNING id INTO m_14195;
    RAISE NOTICE 'created vr_measures Executive Order 14195 as id %', m_14195;
  END IF;

  IF m_14195 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14195, 'tariffs_china', 100, true, 'yea_supports',
       'Imposes an additional ad valorem duty on all articles that are products of '
       || 'the People''s Republic of China, invoking section 1702(a)(1)(B) of the '
       || 'International Emergency Economic Powers Act on the finding that other '
       || 'tariff authority was inadequate.', u),
      (m_14195, 'immig_fentanyl', 70, false, 'yea_supports',
       'Expands the national emergency declared in Proclamation 10886 to cover the '
       || 'failure of the PRC government to intercept chemical precursor suppliers, '
       || 'money launderers and transnational criminal organisations, and imposes the '
       || 'duties as the measure against that supply chain.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14195, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-01T00:00:00Z', u,
       'Signed Executive Order 14195 on 2025-02-01. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14195 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- G.1 — publication and the period of collection.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-07T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14195 document record, 90 FR 9121',
             u,
             'Issued February 1, 2025 and published February 7, 2025. The duties were '
             || 'collected under this order, as amended by Executive Order 14228 of '
             || 'March 3, 2025, for just over a year. That period is a fact about the '
             || 'record and is reported separately from what ended it, which is the row '
             || 'below. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-07T00:00:00Z');

      -- G.2 — the ending, by the President's own later order. `superseded`, not
      -- `struck_down`: no court ended these duties, the President did, and EO 14389
      -- leaves the emergency and every other action under it in place.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'superseded', TIMESTAMPTZ '2026-02-20T00:00:00Z',
             'President of the United States, by later executive order',
             'Federal Register — Executive Order 14389, Ending Certain Tariff Actions, 91 FR 9437',
             s,
             'Executive Order 14389, signed February 20, 2026 and published February '
             || '25, 2026, provides that the additional ad valorem duties imposed '
             || 'under the International Emergency Economic Powers Act by this order, '
             || 'as amended, "shall no longer be in effect and, as soon as '
             || 'practicable, shall no longer be collected." That order names this one '
             || 'expressly and states that the national emergency and every other '
             || 'action taken under it are unaffected, so this row records the end of '
             || 'the duties and not the end of the order. Read from Executive Order '
             || '14389 itself; this is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'superseded'
                            AND effective_at = TIMESTAMPTZ '2026-02-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H. Executive Order 14399 — Ensuring Citizenship Verification and Integrity in
  --    Federal Elections
  --
  --    election_integrity and voter_id both rested on Executive Order 14248 alone,
  --    and parts of that order were enjoined before they took effect — which is why
  --    the itemized pledge on the issue is recorded as partial. A second, later
  --    order on the same subject is the difference between a record with one
  --    contested document in it and a record.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/04/03/2026-06601/ensuring-citizenship-verification-and-integrity-in-federal-elections';

  SELECT id INTO m_14399
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14399'
   LIMIT 1;

  IF m_14399 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14399',
       'Ensuring Citizenship Verification and Integrity in Federal Elections',
       'Citizenship verification in federal elections',
       'Signed 2026-03-31 and published at 91 FR 17125 on 2026-04-03. Directs the '
       || 'transmission of State Citizenship Lists built from Social Security '
       || 'Administration records and the Department of Homeland Security''s SAVE '
       || 'program, directs the Attorney General to prioritise investigation and '
       || 'prosecution of officials who issue federal ballots to ineligible '
       || 'individuals, and directs the Postmaster General to begin a rulemaking '
       || 'within 60 days on uniform standards for mail-in and absentee ballot '
       || 'envelopes.',
       NULL, TIMESTAMPTZ '2026-03-31T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14399","frCitation":"91 FR 17125","frDocumentNumber":"2026-06601"}'::jsonb)
    RETURNING id INTO m_14399;
    RAISE NOTICE 'created vr_measures Executive Order 14399 as id %', m_14399;
  END IF;

  IF m_14399 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14399, 'election_integrity', 100, true, 'yea_supports',
       'Directs the transmission of State Citizenship Lists built from Social '
       || 'Security Administration records and the Department of Homeland Security''s '
       || 'SAVE program, directs the Attorney General to prioritise investigation and '
       || 'prosecution of officials who issue federal ballots to ineligible '
       || 'individuals, and directs the Postmaster General to begin a rulemaking '
       || 'within 60 days on uniform standards for mail-in and absentee ballot '
       || 'envelopes.', u),
      (m_14399, 'voter_id', 70, false, 'yea_supports',
       'Builds federal citizenship verification for election eligibility on existing '
       || 'SSA and SAVE records, and requires unique Intelligent Mail barcode '
       || 'identifiers on outbound ballot mail so that ballots can be traced to an '
       || 'identified recipient.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14399, 'trump', 'issued', true, TIMESTAMPTZ '2026-03-31T00:00:00Z', u,
       'Signed Executive Order 14399 on 2026-03-31. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14399 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-04-03T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14399 document record, 91 FR 17125',
             u,
             'The register''s disposition record for this order carries no revoking or '
             || 'superseding entry, so it stands as published. The order itself states '
             || 'that appearing on a State Citizenship List does not by itself place '
             || 'anyone on the rolls and that State and Federal registration law still '
             || 'applies, so this row asserts that the order is on foot and asserts '
             || 'nothing about any registration outcome. This is not a statement about '
             || 'any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-04-03T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- I. Executive Order 14150 — America First Policy Directive to the Secretary of
  --    State
  --
  --    america_first carried a stated position — "Defense & Foreign Policy" — and
  --    ZERO documents, so the lane reported no action on file against a stance the
  --    profile leads with. This is the formal instrument of that posture: not a
  --    slogan in a title, but an order whose entire operative content is a direction
  --    to the Secretary of State to bring the Department into line with it.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/29/2025-01952/america-first-policy-directive-to-the-secretary-of-state';

  SELECT id INTO m_14150
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14150'
   LIMIT 1;

  IF m_14150 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14150',
       'America First Policy Directive to the Secretary of State',
       'America First policy directive',
       'Signed 2025-01-20 and published at 90 FR 8337 on 2025-01-29. Section 1 '
       || 'provides that from that day forward the foreign policy of the United States '
       || 'shall champion core American interests and always put America and American '
       || 'citizens first; section 2 directs the Secretary of State to issue guidance '
       || 'bringing the Department''s policies, programs, personnel and operations in '
       || 'line with it.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14150","frCitation":"90 FR 8337","frDocumentNumber":"2025-01952"}'::jsonb)
    RETURNING id INTO m_14150;
    RAISE NOTICE 'created vr_measures Executive Order 14150 as id %', m_14150;
  END IF;

  IF m_14150 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14150, 'america_first', 100, true, 'yea_supports',
       'Section 1 provides that from that day forward the foreign policy of the '
       || 'United States shall champion core American interests and always put America '
       || 'and American citizens first; section 2 directs the Secretary of State to '
       || 'issue guidance bringing the Department''s policies, programs, personnel and '
       || 'operations in line with it.', u),
      (m_14150, 'america_first_fp', 60, false, 'yea_supports',
       'Sets the doctrine that the foreign-aid realignment order signed the same day '
       || 'carries out, at the level of the Department of State as a whole rather than '
       || 'of one program.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14150, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14150 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14150 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-29T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14150 document record, 90 FR 8337',
             u,
             'The register''s disposition record for this order carries two '
             || 'cross-references — back to Executive Order 13985 of January 20, 2021, '
             || 'which it displaces, and forward to a memorandum of July 15, 2025 — '
             || 'and no entry revoking or superseding it, so it stands as published. '
             || 'This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-29T00:00:00Z');
    END IF;
  END IF;

END $$;
