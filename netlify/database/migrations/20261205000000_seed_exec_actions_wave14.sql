-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 14: surveillance, firearms and vaccine
--    mandates (the Trump–Massie contrast)
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from seed waves 1 through 13. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 14 together and asserts that every citation, date and
-- issue key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- The November 2026 Trump–Massie pass filed stated positions for the President on
-- privacy_rights, gun_rights, gun_safety and medical_freedom. None of those keys
-- held a formal action, so the executive record read each as "stated, no action
-- found". This wave files the documents behind them, on keys that already exist.
-- No key, pole, class or measure type is added.
--
--   PL 115-118  (2018-01-19)  FISA Amendments Reauthorization Act of 2017, S. 139.
--                             privacy_rights, opposes. Term 45.
--   Memorandum  (2018-02-20)  Bump-stock memorandum, 83 FR 7949. gun_safety
--                             advances (primary), gun_rights opposes. Term 45.
--   EO 14206    (2025-02-07)  Protecting Second Amendment Rights, 90 FR 9503.
--                             gun_rights advances (primary), gun_safety opposes.
--   EO 14214    (2025-02-14)  Ending COVID-19 Vaccine Mandates in Schools,
--                             90 FR 9949. medical_freedom advances.
--   PL 119-87   (2026-04-30)  Section 702 extension to June 12, 2026, S. 4465.
--                             privacy_rights, opposes. The only current-term
--                             instrument on the privacy key, filed so the
--                             current-term scope does not read the 2026 stated
--                             position as untested.
--
-- THE BUMP-STOCK RULE IS NOT FILED. The final rule of December 26, 2018 (83 FR
-- 66514) was issued by the Attorney General, not the President, and this lane
-- files only the President's own instruments. Its fate — held to exceed the
-- statute in Garland v. Cargill, June 14, 2024 — belongs to the rule, so the
-- memorandum's standing is the register's, not a ruling's.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE SHARED-ROW HAZARD, CHECKED BEFORE ANY MAPPING WAS WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- vr_measures held no 115th Congress S. 139 row and no S. 4465 row before this
-- wave, and no roll call on either is in the congressional lane's seed corpus.
-- No member position exists on any measure written here, so no mapping can
-- re-score a member through a shared row. A later import of House roll calls
-- 14-16 of 2018 or 155 of 2026 inherits the privacy_rights rows, in the
-- direction it needs: a yea extends the surveillance authority.
--
-- pack-generation: derived — up to 7 vr_measure_issues rows below, each guarded
--   by ON CONFLICT DO NOTHING so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY
-- ─────────────────────────────────────────────────────────────────────────────
-- No UPDATE, no DELETE, no ALTER. Every measure lookup is a guarded SELECT, every
-- issue and position insert carries ON CONFLICT DO NOTHING, and every standing row
-- is guarded by a NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_s139         integer;
  m_pm83fr7949   integer;
  m_eo14206      integer;
  m_eo14214      integer;
  m_s4465        integer;
  pos            integer;
  u              text;
  us             text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Public Law 115-118 — FISA Amendments Reauthorization Act of 2017
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/115th-congress/senate-bill/139';
  us := 'https://www.govinfo.gov/content/pkg/PLAW-115publ118/html/PLAW-115publ118.htm';

  SELECT id INTO m_s139
    FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 115
     AND number = 'S. 139'
   LIMIT 1;

  IF m_s139 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 115, 'senate', 'S. 139',
       'FISA Amendments Reauthorization Act of 2017',
       'FISA Amendments Reauthorization Act of 2017',
       'Approved 2018-01-19 as Public Law 115-118. Section 201(a) extends title VII '
       || 'of FISA, which holds section 702, from December 31, 2017 to December 31, '
       || '2023. Section 101 requires querying procedures and adds a court-order '
       || 'requirement for FBI access to the contents of United States person query '
       || 'results only in predicated criminal investigations unrelated to national '
       || 'security.',
       NULL, TIMESTAMPTZ '2017-01-12T00:00:00Z', NULL, 'enacted',
       u, 'Congress.gov',
       '{"billType": "s", "billNumber": "139", "congress": "115", "publicLaw": "115-118"}'::jsonb)
    RETURNING id INTO m_s139;
    RAISE NOTICE 'created vr_measures Public Law 115-118 as id %', m_s139;
  END IF;

  IF m_s139 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s139, 'privacy_rights', 85, true, 'yea_opposes',
       'Section 201(a) amends section 403(b) of the FISA Amendments Act of 2008 by '
       || 'striking ''December 31, 2017'' and inserting ''December 31, 2023'', extending '
       || 'title VII of FISA, which holds section 702. Section 101 requires querying '
       || 'procedures and adds section 702(f)(2), under which the FBI may not access the '
       || 'contents of communications retrieved by a United States person query in ''a '
       || 'predicated criminal investigation ... that does not relate to the national '
       || 'security of the United States'' unless the Foreign Intelligence Surveillance '
       || 'Court approves an application. Outside that narrow case no order is required, '
       || 'so the law extends warrantless querying of section 702 collection. Mapped '
       || 'opposes on the privacy key on the enrolled text''s own terms.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_s139, 'trump', 'signed', true, TIMESTAMPTZ '2018-01-19T00:00:00Z', u,
       'Signed S. 139 into law on 2018-01-19 as Public Law 115-118. Shared '
       || 'authorship: Congress wrote and passed it, the signature endorsed it, and '
       || 'provisions are not individually endorsed.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_s139 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2018-01-19T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 115-118, enrolled text as published by GPO',
             us,
             'Enacted and published as Public Law 115-118, approved January 19, 2018. The '
             || 'December 31, 2023 date its section 201 set was later moved by subsequent laws '
             || 'extending title VII; this row is about the Act as published, which nothing on '
             || 'file repeals. This states that the law exists and stands as published; it is '
             || 'not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2018-01-19T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Presidential Memorandum, 83 FR 7949 — Application of the Definition of Machinegun to “Bump Fire” Stocks and Other Similar Devices
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.federalregister.gov/documents/2018/02/23/2018-03868/application-of-the-definition-of-machinegun-to-bump-fire-stocks-and-other-similar-devices';
  us := 'https://www.federalregister.gov/documents/2018/02/23/2018-03868/application-of-the-definition-of-machinegun-to-bump-fire-stocks-and-other-similar-devices';

  SELECT id INTO m_pm83fr7949
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Memorandum, 83 FR 7949'
   LIMIT 1;

  IF m_pm83fr7949 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'Presidential Memorandum, 83 FR 7949',
       'Application of the Definition of Machinegun to “Bump Fire” Stocks and Other '
       || 'Similar Devices',
       'Bump-stock memorandum',
       'Memorandum for the Attorney General signed 2018-02-20 and published at 83 FR '
       || '7949 on 2018-02-23. Directs the Department of Justice to propose for notice '
       || 'and comment a rule banning all devices that turn legal weapons into '
       || 'machineguns. The final rule that followed (83 FR 66514) is a separate Justice '
       || 'Department document.',
       NULL, TIMESTAMPTZ '2018-02-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"frCitation": "83 FR 7949", "frDocumentNumber": "2018-03868"}'::jsonb)
    RETURNING id INTO m_pm83fr7949;
    RAISE NOTICE 'created vr_measures Presidential Memorandum, 83 FR 7949 as id %', m_pm83fr7949;
  END IF;

  IF m_pm83fr7949 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pm83fr7949, 'gun_safety', 85, true, 'yea_supports',
       'The memorandum directs the Department of Justice ''to dedicate all available '
       || 'resources to complete the review of the comments received, and, as '
       || 'expeditiously as possible, to propose for notice and comment a rule banning '
       || 'all devices that turn legal weapons into machineguns.'' A directed ban on a '
       || 'class of firearm accessory advances stronger gun-safety law on the document''s '
       || 'own words.', u),
      (m_pm83fr7949, 'gun_rights', 70, false, 'yea_opposes',
       'The same directive — a rule ''banning all devices that turn legal weapons into '
       || 'machineguns'' — removes a category of lawfully purchased accessory from lawful '
       || 'possession. Filed as the secondary, opposing face of the same act rather than '
       || 'as a separate claim.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_pm83fr7949, 'trump', 'issued', true, TIMESTAMPTZ '2018-02-20T00:00:00Z', u,
       'Signed Presidential Memorandum, 83 FR 7949 on 2018-02-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_pm83fr7949 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2018-02-23T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Presidential Memorandum of February 20, 2018 document record, 83 FR 7949',
             us,
             'Published February 23, 2018 at 83 FR 7949. The register''s record for this '
             || 'memorandum carries no disposition note revoking or superseding it. The rule '
             || 'it directed is a separate Justice Department document and is not described by '
             || 'this row. This describes the memorandum''s status in the register and is not a '
             || 'statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2018-02-23T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14206 — Protecting Second Amendment Rights
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.federalregister.gov/documents/2025/02/12/2025-02636/protecting-second-amendment-rights';
  us := 'https://www.federalregister.gov/documents/2025/02/12/2025-02636/protecting-second-amendment-rights';

  SELECT id INTO m_eo14206
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14206'
   LIMIT 1;

  IF m_eo14206 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14206',
       'Protecting Second Amendment Rights',
       'Second Amendment review order',
       'Signed 2025-02-07 and published at 90 FR 9503 on 2025-02-12. Section 1 states '
       || 'that the right to keep and bear arms must not be infringed. Section 2 directs '
       || 'the Attorney General to review agency actions, including Justice Department '
       || 'and ATF firearms rules from January 2021 through January 2025, for '
       || 'infringements of Second Amendment rights and to present a plan of action.',
       NULL, TIMESTAMPTZ '2025-02-07T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder": "14206", "frCitation": "90 FR 9503", "frDocumentNumber": "2025-02636"}'::jsonb)
    RETURNING id INTO m_eo14206;
    RAISE NOTICE 'created vr_measures Executive Order 14206 as id %', m_eo14206;
  END IF;

  IF m_eo14206 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14206, 'gun_rights', 90, true, 'yea_supports',
       'Section 1 states that ''the right to keep and bear arms must not be '
       || 'infringed.'' Section 2(a) directs the Attorney General, within 30 days, to '
       || 'examine agency actions ''to assess any ongoing infringements of the Second '
       || 'Amendment rights of our citizens'' and present a plan of action; section 2(b) '
       || 'names Justice Department and ATF firearms rules from January 2021 through '
       || 'January 2025, firearm classifications and the government''s litigation '
       || 'positions among what must be reviewed.', u),
      (m_eo14206, 'gun_safety', 60, false, 'yea_opposes',
       'Section 2(b)(i) and (ii) direct review of ''All Presidential and agencies'' '
       || 'actions from January 2021 through January 2025 that purport to promote safety '
       || 'but may have impinged on the Second Amendment rights'' and of the Department '
       || 'of Justice and ATF firearms rules of that period, and section 3 directs a '
       || 'process to implement the resulting plan. Reduced weight because the order '
       || 'sets a review and a plan rather than revoking a rule itself.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14206, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-07T00:00:00Z', u,
       'Signed Executive Order 14206 on 2025-02-07. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14206 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-12T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14206 document record, 90 FR 9503',
             us,
             'Signed February 7, 2025 and published February 12, 2025 at 90 FR 9503. The '
             || 'register''s record for this order carries no disposition note revoking or '
             || 'superseding it, so it stands as published by later presidential action. This '
             || 'describes the order''s status in the register and is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-12T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14214 — Keeping Education Accessible and Ending COVID-19 Vaccine Mandates in Schools
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.federalregister.gov/documents/2025/02/20/2025-02931/keeping-education-accessible-and-ending-covid-19-vaccine-mandates-in-schools';
  us := 'https://www.federalregister.gov/documents/2025/02/20/2025-02931/keeping-education-accessible-and-ending-covid-19-vaccine-mandates-in-schools';

  SELECT id INTO m_eo14214
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14214'
   LIMIT 1;

  IF m_eo14214 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14214',
       'Keeping Education Accessible and Ending COVID-19 Vaccine Mandates in Schools',
       'COVID-19 school vaccine mandate order',
       'Signed 2025-02-14 and published at 90 FR 9949 on 2025-02-20. Section 1 sets '
       || 'the policy that discretionary federal funds should not support schools or '
       || 'colleges that require students to have received a COVID-19 vaccination to '
       || 'attend in-person education. Section 3 directs guidelines and a plan to end '
       || 'coercive COVID-19 school mandates.',
       NULL, TIMESTAMPTZ '2025-02-14T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder": "14214", "frCitation": "90 FR 9949", "frDocumentNumber": "2025-02931"}'::jsonb)
    RETURNING id INTO m_eo14214;
    RAISE NOTICE 'created vr_measures Executive Order 14214 as id %', m_eo14214;
  END IF;

  IF m_eo14214 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14214, 'medical_freedom', 90, true, 'yea_supports',
       'Section 1 states the policy that ''discretionary Federal funds should not be '
       || 'used to directly or indirectly support or subsidize'' an educational agency, '
       || 'school or institution of higher education ''that requires students to have '
       || 'received a COVID-19 vaccination to attend any in-person education program.'' '
       || 'Section 3(b) directs the Secretary of Education, with the Secretary of Health '
       || 'and Human Services, to provide within 90 days ''a plan to end coercive '
       || 'COVID-19 school mandates.'' A measure against a vaccine requirement advances '
       || 'personal choice over that requirement on the order''s own words; it reaches '
       || 'COVID-19 vaccination only.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14214, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-14T00:00:00Z', u,
       'Signed Executive Order 14214 on 2025-02-14. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14214 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-20T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14214 document record, 90 FR 9949',
             us,
             'Signed February 14, 2025 and published February 20, 2025 at 90 FR 9949. The '
             || 'register''s record for this order carries no disposition note revoking or '
             || 'superseding it, so it stands as published by later presidential action. This '
             || 'describes the order''s status in the register and is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Public Law 119-87 — To amend the FISA Amendments Act of 2008 to extend the authorities of title VII of the Foreign Intelligence Surveillance Act of 1978, and for other purposes
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/119th-congress/senate-bill/4465';
  us := 'https://www.govinfo.gov/content/pkg/PLAW-119publ87/html/PLAW-119publ87.htm';

  SELECT id INTO m_s4465
    FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119
     AND number = 'S. 4465'
   LIMIT 1;

  IF m_s4465 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'senate', 'S. 4465',
       'To amend the FISA Amendments Act of 2008 to extend the authorities of title '
       || 'VII of the Foreign Intelligence Surveillance Act of 1978, and for other '
       || 'purposes',
       'Section 702 extension to June 12, 2026',
       'Approved 2026-04-30 as Public Law 119-87, at 140 Stat. 811. Section 1(a) '
       || 'moves the repeal date of title VII of FISA, which holds section 702, from '
       || 'April 30, 2026 to June 12, 2026.',
       NULL, NULL, NULL, 'enacted',
       u, 'Congress.gov',
       '{"billType": "s", "billNumber": "4465", "congress": "119", "publicLaw": "119-87"}'::jsonb)
    RETURNING id INTO m_s4465;
    RAISE NOTICE 'created vr_measures Public Law 119-87 as id %', m_s4465;
  END IF;

  IF m_s4465 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s4465, 'privacy_rights', 70, true, 'yea_opposes',
       'Section 1(a) amends section 403(b) of the FISA Amendments Act of 2008 by '
       || 'striking ''April 30, 2026'' and inserting ''June 12, 2026'', keeping title VII of '
       || 'FISA, which holds section 702, in force for six more weeks. The Act adds no '
       || 'querying or warrant limits. Weighted below the 2018 reauthorization because '
       || 'the extension runs six weeks rather than six years.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_s4465, 'trump', 'signed', true, TIMESTAMPTZ '2026-04-30T00:00:00Z', u,
       'Signed S. 4465 into law on 2026-04-30 as Public Law 119-87. Shared '
       || 'authorship: Congress wrote and passed it, the signature endorsed it, and '
       || 'provisions are not individually endorsed.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_s4465 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-04-30T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-87, enrolled text as published by GPO',
             us,
             'Enacted and published as Public Law 119-87, approved April 30, 2026, at 140 '
             || 'Stat. 811. The extension date it set has its own terms; this row is about the '
             || 'Act as published, which nothing on file repeals. This states that the law '
             || 'exists and stands as published; it is not a statement about any challenge to '
             || 'it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-04-30T00:00:00Z');
    END IF;
  END IF;
END $$;
