-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 8: the recency backfill
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql,
-- 20260829000000_seed_exec_actions_wave6.sql and
-- 20260830000000_seed_exec_actions_wave7.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 8 together and asserts that every citation, date and issue
-- key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- The newest action the lane carried before this migration was Proclamation 11038,
-- signed 2026-06-29. The newest EXECUTIVE ORDER was EO 14399, signed 2026-03-31.
-- Orders are 31 of the 48 rows on file, so the part of the lane that carries most
-- of its weight stopped four months before the profile was being read.
--
-- That is a credibility problem of a particular kind. It does not show up as a
-- wrong number anywhere — every row on file was still accurate. It shows up to the
-- one reader who can check: someone who knows the Federal Register published EO
-- 14400 through EO 14419 between April and August 2026 and sees none of them here.
-- To that reader the profile does not look incomplete, it looks abandoned, and an
-- abandoned record is not evidence of anything.
--
-- So this wave puts eight documents on file, spread deliberately so that no month
-- in the window is empty: April (2), May (1), June (1), July (2), August (2).
-- Coverage of the window matters more here than volume within it — a wave that
-- added twelve August documents would close the same gap on paper and leave the
-- same hole in the middle of it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT
-- ─────────────────────────────────────────────────────────────────────────────
--  A. Proclamation 11020 (2026-04-02) — section 232, patented pharmaceuticals
--  B. Executive Order 14402 (2026-04-30) — fixed-price federal contracting
--  C. Executive Order 14406 (2026-05-19) — bank supervision, immigration status
--  D. Executive Order 14411 (2026-06-03) — customs enforcement
--  E. Proclamation 11041 (2026-07-09) — Clean Air Act section 112 exemption
--  F. Proclamation 11043 (2026-07-13) — Bears Ears boundary modification
--  G. Executive Order 14418 (2026-08-06) — citizenship documents
--  H. Executive Order 14419 (2026-08-06) — birth tourism
--
-- Every one is sole-authorship. NO row in this wave touches a measure that any
-- member of Congress ever acted on, so the shared-row hazard that governs
-- vr_measure_issues does not arise: there is no roll call attached to any of these
-- eight vr_measures rows and nobody else can be re-scored through them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE UNLOCK — immigration_reform, and why it took two documents
-- ─────────────────────────────────────────────────────────────────────────────
-- immigration_reform is a stated position on this profile: "Birthright Citizenship
-- & Courts". Before this wave it carried NO formal action at all. It was not a
-- thin row, it was an empty one — a position the profile asserted and had never
-- once tested.
--
-- It could not have been unlocked by the obvious document. The stance text is
-- written from EO 14160 and from Trump v. CASA, so under the circularity rule in
-- db/exec-action-seed.json#_circularityRule neither of those can uniquely unlock
-- it. That is the rule working as intended and it is not being relaxed here.
--
-- EO 14418 and EO 14419 are different documents. They were signed 2026-08-06,
-- thirteen months after the decision the stance was written from, and they respond
-- to a different one. Both lead on it — EO 14418 governs what documents may be
-- issued or accepted, EO 14419 governs the entry that produces the claim. The
-- position is testable for the first time and it is testable off two documents,
-- neither of which the stance was drawn from.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE ONE COUNTER-DIRECTIONAL ROW, AND AN HONEST NOTE ABOUT THE OTHER SEVEN
-- ─────────────────────────────────────────────────────────────────────────────
-- Proclamation 11020 is the only row here that pushes against an existing read.
-- health_drug_prices held three documents and all three advanced it — EO 14273, EO
-- 14297 and EO 14293 — for the familiar reason: the file carried the price-lowering
-- instruments and none of the price-raising ones. A duty of 100 percent ad valorem
-- on imported patented pharmaceuticals is a price-raising one. It was missed
-- because it lives in the section 232 stream and nobody looks for drug pricing
-- there.
--
-- The other seven rows run with the grain of what is already on file, and that is
-- stated plainly rather than dressed up as balance. This wave was commissioned to
-- fix recency, not composition. Where it deepens a one-sided read — climate_action
-- goes from five opposing rows to six — the row is here because that issue's
-- evidence had gone a year stale, not because six is better than five.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- STANDING UPDATES: NONE, AND HOW THAT WAS ESTABLISHED
-- ─────────────────────────────────────────────────────────────────────────────
-- The brief asked for standing updates where litigation, revocation, expiry or
-- supersession changed in the window. The answer is none, and the search was
-- systematic rather than a spot check: all 98 presidential documents signed on or
-- after 2026-04-01 were downloaded in full and scanned for revocation,
-- supersession, rescission, termination and amendment language occurring within
-- 260 characters of any document number this file carries.
--
-- The only explicit rescission clause anywhere in the window reads "Executive
-- Order 11644 and Executive Order 11989 are hereby rescinded", in EO 14408 of
-- 2026-05-29. Those are orders of 1972 and 1977 and this file does not carry
-- either. Nothing in the window disturbs any of the 48 rows already on file.
--
-- EO 14156 stays at challenged_unverified, where it has been since 2026-01-30.
-- Five Presidential Determinations of 2026-04-20 under section 303 of the Defense
-- Production Act recite it as the authority they act under, which shows the order
-- is being used. Being used is not a disposition. A CourtListener opinion search
-- for Executive Order 14156 filed on or after 2026-01-01 returned nothing. Fail
-- closed: the standing does not move on the strength of an order being invoked.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- TRUMP v. BARBARA IS NOT FILED AS A STANDING, AND THAT IS DELIBERATE
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14418 recites Trump v. Barbara, 609 U.S. __, 146 S. Ct. 2438, 2449 (2026),
-- decided 2026-06-30, holding that the Citizenship Clause extends citizenship to
-- children born to parents in the United States for whom no extraterritorial
-- fiction applies. That is a Supreme Court decision inside the window and it is
-- tempting to file as Axis B evidence.
--
-- It is not filed, because it is a decision about EO 14160 and this file does not
-- carry EO 14160. A ruling about one order is not a disposition of a different
-- order that cites it. The citation is recorded where it belongs — in EO 14418's
-- _issuesNote, as the ground the order rests on — and nowhere else.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS REVIEWED AND LEFT OUT
-- ─────────────────────────────────────────────────────────────────────────────
--  · The Sequestration Order for Fiscal Year 2027 (2026-04-03). Section 251A of
--    the Balanced Budget and Emergency Deficit Control Act REQUIRES the President
--    to issue this order when OMB's report shows a breach. Filing a ministerial
--    act as evidence of a spending position would attribute a statutory formula to
--    a choice.
--  · Public Law 119-75, the Consolidated Appropriations Act, 2026. Read in full
--    from GPO's PLAW-119publ75 package, which establishes it was approved
--    2026-02-03 on H.R. 7148. That is BEFORE this window. It is a genuine gap in
--    the file and a strong counter-directional candidate on cut_spending, but it
--    is a coverage gap, not a recency gap, and adding it here would have improved
--    the number this wave was asked to improve by exactly nothing.
--  · Proclamation 11030 (2026-05-19), implementing provisions of that Act. It
--    carries out duty-free treatment Congress enacted — administration of a
--    statute rather than a direction of policy.
--  · EO 14408 (2026-05-29). It rescinds two prior orders cleanly, which is
--    attractive, but its subject is off-road vehicle access to federal lands and no
--    tracked position on this profile reaches it. Mapping it to lands_energy would
--    have been a stretch invented to justify a row that had already been chosen.
--  · Proclamation 11048 (2026-07-20), Canadian discrimination duties. One of three
--    near-identical proclamations signed that day. Picking one would be arbitrary
--    and taking all three would be three rows for one decision.
--  · Proclamation 11052 (2026-08-06), polysilicon section 232 duties. A further
--    rate row on tariffs_prices, which already reads in both directions, on a date
--    two other documents already cover.
--  · EO 14415 (2026-07-20), defense supply chains; EO 14405 (2026-05-19),
--    financial technology; EO 14410 (2026-06-03), Schedule Policy/Career. The last
--    is the same rejection wave 7 made about EO 13957 and for the same reason:
--    db/issue-keys.json still has no civil-service or executive-branch personnel
--    key. That remains the highest-value small change a later pass could make.
--  · Nine commemorative proclamations, 14 notices continuing national emergencies,
--    the presidential determinations, and ten pipeline permit authorizations dated
--    2026-04-15 and 2026-04-30. This is the procedural filler the brief asked to be
--    kept out, and it is most of the window by count.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES READ IN THIS PASS
-- ─────────────────────────────────────────────────────────────────────────────
-- The Federal Register API, presidential documents with a signing date on or after
-- 2026-04-01: 98 records — 20 executive orders (EO 14400 through EO 14419), 34
-- proclamations, and the balance notices, determinations and permits. Full text was
-- downloaded for all 98 and read in full for the eight documents seeded here plus
-- EO 14405, EO 14408, EO 14415, Proclamation 11030, Proclamation 11048,
-- Proclamation 11052 and the FY2027 Sequestration Order. Title, signing date,
-- publication date, FR citation and FR document number were taken per document from
-- the register's own record and are quoted below.
--
-- GovInfo: PLAW-119publ75, read to date the Consolidated Appropriations Act, 2026.
-- CourtListener: opinion search for Executive Order 14156.
--
-- whitehouse.gov appears nowhere in this migration.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE AND IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Each measure is looked up before insert and inserted only if absent; issue rows
-- use ON CONFLICT (measure_id, issue_key) DO NOTHING; positions use ON CONFLICT
-- (measure_id, politician_id, action_type) DO NOTHING; status rows are guarded by
-- WHERE NOT EXISTS on (position_id, status, effective_at). Running this twice
-- changes nothing the first run did not already do.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_11020    integer;
  m_14402    integer;
  m_14406    integer;
  m_14411    integer;
  m_11041    integer;
  m_11043    integer;
  m_14418    integer;
  m_14419    integer;
  pos        integer;
  u          text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Proclamation 11020 — Adjusting Imports of Pharmaceuticals and Pharmaceutical Ingredients Into the United States
  --
  --    WAVE 8 — RECENCY, AND THE ONLY COUNTER-DIRECTIONAL ROW IN THIS WAVE.
  --    health_drug_prices held three documents before this one and all three
  --    advanced it: EO 14273, EO 14297 and EO 14293. It read as a clean row for
  --    the same reason the trade issues did before wave 6 — the file contained
  --    the price-lowering instruments and none of the price-raising ones. This
  --    proclamation is the correction, and it is a tariff rather than a health
  --    measure, which is exactly why it had not been picked up: it lives in the
  --    section 232 stream, not the drug-pricing stream. It is also the oldest
  --    document in this wave and the first one after the April 1 line, so it
  --    anchors the recency backfill at its earliest edge.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/04/09/2026-06956/adjusting-imports-of-pharmaceuticals-and-pharmaceutical-ingredients-into-the-united-states';

  SELECT id INTO m_11020
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11020'
   LIMIT 1;

  IF m_11020 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11020',
       'Adjusting Imports of Pharmaceuticals and Pharmaceutical Ingredients Into the United States',
       'Section 232 duties on patented pharmaceuticals',
       'Signed 2026-04-02 and published at 91 FR 18183 on 2026-04-09. Acting '
       || 'on the Secretary of Commerce''s section 232 finding, clause (3)(a) '
       || 'subjects imports of patented pharmaceuticals and associated '
       || 'pharmaceutical ingredients listed in Annex I to a 100 percent ad '
       || 'valorem duty rate, with 20 percent for companies holding approved '
       || 'onshoring plans (rising to 100 percent on April 2, 2030), 15 percent '
       || 'for Japan, the European Union, the Republic of Korea, and Switzerland '
       || 'and Liechtenstein jointly, 10 percent for the United Kingdom, and '
       || 'zero for generics, biosimilars and the specialty categories named in '
       || 'clause (3)(d).',
       NULL, TIMESTAMPTZ '2026-04-02T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11020","frCitation":"91 FR 18183","frDocumentNumber":"2026-06956"}'::jsonb)
    RETURNING id INTO m_11020;
    RAISE NOTICE 'created vr_measures Proclamation 11020 as id %', m_11020;
  END IF;

  IF m_11020 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11020, 'health_drug_prices', 80, true, 'yea_opposes',
       'Clause (3)(a) subjects imports of patented pharmaceuticals and '
       || 'associated pharmaceutical ingredients listed in Annex I to a 100 '
       || 'percent ad valorem duty rate. Clause (3)(b) sets that rate at 20 '
       || 'percent for products of companies whose onshoring plans the Secretary '
       || 'has approved, rising to 100 percent on April 2, 2030; clause (3)(c) '
       || 'sets 15 percent for products of Japan, the European Union, the '
       || 'Republic of Korea, and Switzerland and Liechtenstein jointly, and 10 '
       || 'percent for the United Kingdom. Paragraph 11 records that generic and '
       || 'biosimilar products are not subject to section 232 duties at this '
       || 'time, and clause (3)(d) sets a zero rate for orphan drugs, nuclear '
       || 'medicines, plasma derived therapies, fertility treatments, cell and '
       || 'gene therapies and antibody drug conjugates. The charge therefore '
       || 'falls on the patented medicines the proclamation names, and it is '
       || 'collected at the border on the imported article.', u),
      (m_11020, 'tariffs_prices', 75, false, 'yea_opposes',
       'A duty of 100 percent ad valorem on an imported article is the '
       || 'largest single rate on any product line in this file. Paragraph 2 '
       || 'states that approximately 53 percent of patented pharmaceutical '
       || 'products distributed domestically are produced outside the country '
       || 'and that only 15 percent of patented active pharmaceutical '
       || 'ingredients by volume are domestically produced for the United States '
       || 'market, so the proclamation''s own findings place the bulk of the '
       || 'covered supply on the dutiable side of the border.', u),
      (m_11020, 'econ_trade', 70, false, 'yea_supports',
       'The action rests on the Secretary of Commerce''s section 232 finding, '
       || 'recited in paragraph 1, that pharmaceuticals and associated active '
       || 'pharmaceutical ingredients are being imported in such quantities and '
       || 'under such circumstances as to threaten to impair the national '
       || 'security of the United States, and clause (1) directs continued '
       || 'negotiation of agreements under 19 U.S.C. 1862(c)(3)(A)(i) to address '
       || 'that threatened impairment.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11020, 'trump', 'issued', true, TIMESTAMPTZ '2026-04-02T00:00:00Z', u,
       'Signed Proclamation 11020 on 2026-04-02. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11020 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-04-09T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11020 document record, 91 FR 18183',
             u,
             'The register''s disposition record for this proclamation '
             || 'carries no revocation, amendment or supersession, so it stands '
             || 'as published. Clause (3)(b) provides on its own terms that the '
             || '20 percent rate rises to 100 percent on April 2, 2030, and '
             || 'clause (3)(c) provides that the United Kingdom rate reduces to '
             || 'zero to the extent required by any future pricing agreement; '
             || 'this row asserts nothing about either future date. This is not '
             || 'a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-04-09T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14402 — Promoting Efficiency, Accountability, and Performance in Federal Contracting
  --
  --    WAVE 8 — RECENCY. cut_spending was the issue wave 6 opened up, and after
  --    that wave it carried three advancing rows and two opposing ones. This is
  --    a fourth advancing row, and it is being added for recency rather than
  --    for balance: the profile's spending evidence stopped in 2025 and the
  --    reader had no way to see whether the DOGE-era posture continued into
  --    2026. It does, in a different instrument — procurement rather than
  --    rescission. It carries a quotable dollar figure and named approval
  --    thresholds rather than an exhortation, which is why it was taken over
  --    the FY2027 sequestration order signed three days later.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/05/05/2026-08900/promoting-efficiency-accountability-and-performance-in-federal-contracting';

  SELECT id INTO m_14402
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14402'
   LIMIT 1;

  IF m_14402 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14402',
       'Promoting Efficiency, Accountability, and Performance in Federal Contracting',
       'Fixed-price default in federal procurement',
       'Signed 2026-04-30 and published at 91 FR 24325 on 2026-05-05. Section '
       || '2(a) directs agencies, so far as applicable law allows, to use '
       || 'fixed-price contracts in procurement; section 2(b) requires written '
       || 'justification for any non-fixed-price contract and agency-head '
       || 'approval above value thresholds of 100 million dollars (Department of '
       || 'War), 35 million (NASA), 25 million (Department of Homeland Security) '
       || 'and 10 million (all others).',
       NULL, TIMESTAMPTZ '2026-04-30T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14402","frCitation":"91 FR 24325","frDocumentNumber":"2026-08900"}'::jsonb)
    RETURNING id INTO m_14402;
    RAISE NOTICE 'created vr_measures Executive Order 14402 as id %', m_14402;
  END IF;

  IF m_14402 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14402, 'cut_spending', 75, true, 'yea_supports',
       'Section 2(a) directs executive branch departments and agencies, so '
       || 'far as applicable law allows, to utilize fixed-price contracts in '
       || 'procurement, making them the default rather than the exception. '
       || 'Section 2(b)(i) requires a contracting officer to justify any '
       || 'non-fixed-price contract in writing to the agency head, and section '
       || '2(b)(ii) requires the agency head''s written approval where the '
       || 'non-fixed-price value exceeds 100 million dollars for a Department of '
       || 'War contract, 35 million for the National Aeronautics and Space '
       || 'Administration, 25 million for the Department of Homeland Security '
       || 'and 10 million for any other agency. Section 1 gives as the reason a '
       || 'review of Fiscal Year 2024 spending that identified approximately 120 '
       || 'billion dollars obligated on cost-reimbursement consulting contracts '
       || 'alone.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14402, 'trump', 'issued', true, TIMESTAMPTZ '2026-04-30T00:00:00Z', u,
       'Signed Executive Order 14402 on 2026-04-30. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14402 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-05-05T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14402 document record, 91 FR 24325',
             u,
             'The register''s disposition record for this order carries no '
             || 'revocation, amendment or supersession, so it stands as '
             || 'published. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-05-05T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14406 — Restoring Integrity to America's Financial System
  --
  --    WAVE 8 — RECENCY, AND THE MAY ANCHOR. The immigration-enforcement rows
  --    in this file are all border, removal or detention instruments signed in
  --    the first half of 2025. This one is a year later and works through a
  --    different channel entirely — bank supervision — which is the useful
  --    thing about it: it shows the enforcement posture extending into a policy
  --    area the profile was not watching, rather than repeating an instrument
  --    already on file.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/05/22/2026-10400/restoring-integrity-to-americas-financial-system';

  SELECT id INTO m_14406
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14406'
   LIMIT 1;

  IF m_14406 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14406',
       'Restoring Integrity to America''s Financial System',
       'Bank supervision and immigration status',
       'Signed 2026-05-19 and published at 91 FR 30479 on 2026-05-22. Section '
       || '3(a) directs a Treasury Advisory to financial institutions on red '
       || 'flags associated with exploitation of the financial system by '
       || 'non-work authorized populations and their employers; section 3(b) '
       || 'directs proposed Bank Secrecy Act changes covering customer due '
       || 'diligence, including information relevant to lawful immigration '
       || 'status and employment authorization.',
       NULL, TIMESTAMPTZ '2026-05-19T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14406","frCitation":"91 FR 30479","frDocumentNumber":"2026-10400"}'::jsonb)
    RETURNING id INTO m_14406;
    RAISE NOTICE 'created vr_measures Executive Order 14406 as id %', m_14406;
  END IF;

  IF m_14406 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14406, 'border_security', 70, true, 'yea_supports',
       'Section 3(a) directs the Secretary of the Treasury, within 60 days, '
       || 'to issue a formal Advisory to financial institutions describing red '
       || 'flags associated with exploitation of the United States financial '
       || 'system by non-work authorized populations and their employers, '
       || 'including payroll tax evasion and the use of an individual taxpayer '
       || 'identification number to obtain credit products or open depository '
       || 'accounts where the applicant lacks verified lawful immigration '
       || 'status. Section 3(b)(ii) directs proposed changes to Bank Secrecy Act '
       || 'implementing regulations so that institutions retain authority to '
       || 'obtain information relevant to whether account holders possess lawful '
       || 'immigration status and employment authorization.', u),
      (m_14406, 'immig_fentanyl', 65, false, 'yea_supports',
       'Section 1 gives as a reason for the order that low-dollar '
       || 'cross-border funds transfers have been used to facilitate or commit '
       || 'terrorist financing, narcotics trafficking and human trafficking, and '
       || 'that financial trend analyses have uncovered hubs of fentanyl-related '
       || 'financial activity in the United States related to Mexico-based '
       || 'cartels. Section 3(a)(v) directs the Advisory to describe financial '
       || 'activity indicative of labor trafficking or forced labor as defined '
       || 'in 18 U.S.C. 1589.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14406, 'trump', 'issued', true, TIMESTAMPTZ '2026-05-19T00:00:00Z', u,
       'Signed Executive Order 14406 on 2026-05-19. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14406 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-05-22T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14406 document record, 91 FR 30479',
             u,
             'The register''s disposition record for this order carries no '
             || 'revocation, amendment or supersession, so it stands as '
             || 'published. The order directs proposed regulatory changes on '
             || '60-, 90- and 180-day clocks; whether any of those proposals has '
             || 'been adopted is a separate question this row does not reach. '
             || 'This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-05-22T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14411 — Strengthening Customs Enforcement
  --
  --    WAVE 8 — RECENCY, AND THE JUNE ANCHOR. Every trade row in this file is
  --    about a rate — what duty applies to which article. This one is about
  --    collection: whether the duties already imposed are actually paid, and by
  --    whom. That makes it the only document on the profile that addresses the
  --    enforcement side of the tariff programme, and it is the reason it was
  --    taken over the three near-identical Canadian discrimination
  --    proclamations of July 20, which would each have added another rate row.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/06/10/2026-11595/strengthening-customs-enforcement';

  SELECT id INTO m_14411
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14411'
   LIMIT 1;

  IF m_14411 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14411',
       'Strengthening Customs Enforcement',
       'Customs enforcement and importers of record',
       'Signed 2026-06-03 and published at 91 FR 35125 on 2026-06-10. Section '
       || '2(a) directs revision of importer eligibility rules within 180 days '
       || 'to require minimum tangible domestic assets or bonding, increased '
       || 'bond coverage, and beneficial ownership disclosure for importers of '
       || 'record; section 2(b)(i) directs a prohibition on foreign importers of '
       || 'record filing informal entry under 19 U.S.C. 1498.',
       NULL, TIMESTAMPTZ '2026-06-03T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14411","frCitation":"91 FR 35125","frDocumentNumber":"2026-11595"}'::jsonb)
    RETURNING id INTO m_14411;
    RAISE NOTICE 'created vr_measures Executive Order 14411 as id %', m_14411;
  END IF;

  IF m_14411 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14411, 'econ_trade', 70, true, 'yea_supports',
       'Section 2(a) directs the Secretary of Homeland Security, within 180 '
       || 'days, to revise importer eligibility regulations to require that an '
       || 'importer of record maintain a minimum level of tangible domestic '
       || 'assets or bonding as determined by U.S. Customs and Border '
       || 'Protection, to increase the minimum required bond coverage, and to '
       || 'require additional identification data including ownership and '
       || 'beneficial ownership disclosures. Section 2(b)(i) directs the '
       || 'Secretary to prohibit a foreign importer of record from filing '
       || 'informal entry under regulations promulgated pursuant to 19 U.S.C. '
       || '1498.', u),
      (m_14411, 'tariffs_growth', 60, false, 'yea_supports',
       'Section 1 gives as the purpose of the order that effective customs '
       || 'enforcement ensures importers of record are correctly identified and '
       || 'accountable for duties owed, and identifies undervaluing imports and '
       || 'avoiding payment of duties through various arrangements and schemes '
       || 'as forms of noncompliance that disadvantage domestic businesses.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14411, 'trump', 'issued', true, TIMESTAMPTZ '2026-06-03T00:00:00Z', u,
       'Signed Executive Order 14411 on 2026-06-03. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14411 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-06-10T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14411 document record, 91 FR 35125',
             u,
             'The register''s disposition record for this order carries no '
             || 'revocation, amendment or supersession, so it stands as '
             || 'published. The order''s operative directions run on a 180-day '
             || 'clock to the Secretary of Homeland Security; whether the '
             || 'revised regulations have issued is a separate question this row '
             || 'does not reach. This is not a statement about any challenge to '
             || 'it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-06-10T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Proclamation 11041 — Regulatory Relief for Certain Stationary Sources To Promote American Chemical Manufacturing Security
  --
  --    WAVE 8 — RECENCY. climate_action carried five opposing rows and no
  --    advancing ones, and every one of them was signed in 2025. This is a
  --    sixth opposing row rather than a corrective, and it is here because the
  --    issue's evidence had gone a year stale, not to deepen a one-sided read.
  --    It is also unusual in kind: the other five withdraw from an agreement,
  --    revoke a target or reopen a review, while this one suspends an existing
  --    compliance obligation for named facilities under a statutory exemption
  --    power.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/07/16/2026-14452/regulatory-relief-for-certain-stationary-sources-to-promote-american-chemical-manufacturing-security';

  SELECT id INTO m_11041
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11041'
   LIMIT 1;

  IF m_11041 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11041',
       'Regulatory Relief for Certain Stationary Sources To Promote American Chemical Manufacturing Security',
       'Two-year Clean Air Act section 112 exemption',
       'Signed 2026-07-09 and published at 91 FR 44719 on 2026-07-16. Exempts '
       || 'stationary sources identified in Annex I from the aspects of the 2024 '
       || 'rule at 89 FR 42932 promulgated under section 112 of the Clean Air '
       || 'Act for two years beyond each relevant compliance date, using the '
       || 'exemption power in 42 U.S.C. 7412(i)(4).',
       NULL, TIMESTAMPTZ '2026-07-09T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11041","frCitation":"91 FR 44719","frDocumentNumber":"2026-14452"}'::jsonb)
    RETURNING id INTO m_11041;
    RAISE NOTICE 'created vr_measures Proclamation 11041 as id %', m_11041;
  END IF;

  IF m_11041 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11041, 'climate_action', 75, true, 'yea_opposes',
       'The proclamation exempts stationary sources identified in Annex I '
       || 'from compliance with those aspects of the 2024 rule at 89 FR 42932 '
       || 'that were promulgated under section 112 of the Clean Air Act, 42 '
       || 'U.S.C. 7412, for a period of two years beyond the rule''s relevant '
       || 'compliance dates, using the exemption power in section 112(i)(4). Its '
       || 'stated effect is that during each such two-year period those sources '
       || 'remain subject to the emissions and compliance obligations that '
       || 'applied under the standard as it existed before that rule.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11041, 'trump', 'issued', true, TIMESTAMPTZ '2026-07-09T00:00:00Z', u,
       'Signed Proclamation 11041 on 2026-07-09. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11041 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-07-16T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11041 document record, 91 FR 44719',
             u,
             'The register''s disposition record for this proclamation '
             || 'carries no revocation, amendment or supersession, so it stands '
             || 'as published. The exemption is time-limited by its own terms to '
             || 'two years beyond each affected compliance date, and this row '
             || 'asserts nothing about what happens at the end of that period. '
             || 'This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-07-16T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Proclamation 11043 — Modifying the Bears Ears National Monument
  --
  --    WAVE 8 — RECENCY, AND THE JULY ANCHOR. This is the largest single land
  --    action in the window and it is measurable: acreage in, acreage out,
  --    stated on the face of the document. It was taken over its companion of
  --    the same day on the Grand Staircase-Escalante monument because one of
  --    the two is enough to place the instrument on file, and adding both would
  --    have been two rows for one decision.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/07/17/2026-14548/modifying-the-bears-ears-national-monument';

  SELECT id INTO m_11043
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11043'
   LIMIT 1;

  IF m_11043 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11043',
       'Modifying the Bears Ears National Monument',
       'Bears Ears boundary modification',
       'Signed 2026-07-13 and published at 91 FR 45169 on 2026-07-17. Acting '
       || 'under 54 U.S.C. 320301, modifies the boundaries of the Bears Ears '
       || 'National Monument, excluding approximately 1,238,904 acres and '
       || 'leaving approximately 121,096 acres reserved in the Indian Creek Unit '
       || 'and the Shash Jaa Unit, effective 60 days after signature subject to '
       || 'valid existing rights.',
       NULL, TIMESTAMPTZ '2026-07-13T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11043","frCitation":"91 FR 45169","frDocumentNumber":"2026-14548"}'::jsonb)
    RETURNING id INTO m_11043;
    RAISE NOTICE 'created vr_measures Proclamation 11043 as id %', m_11043;
  END IF;

  IF m_11043 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11043, 'energy_production', 65, true, 'yea_supports',
       'Among the findings recited before the operative clause is that the '
       || 'need to reduce the Nation''s reliance on foreign sources of several '
       || 'resources vital to economic and national security, including '
       || 'resources located within the historic and current boundaries of the '
       || 'Monument, is greater than it was in 2017, and that this further '
       || 'necessitates the exclusion of lands retained within the Monument by '
       || 'Proclamation 9681. The operative clause then excludes approximately '
       || '1,238,904 acres and leaves reserved federal lands of approximately '
       || '121,096 acres in the Indian Creek Unit and the Shash Jaa Unit.', u),
      (m_11043, 'lands_energy', 60, false, 'yea_supports',
       'The proclamation acts under section 320301 of title 54, United States '
       || 'Code, to modify the boundaries of the Bears Ears National Monument, '
       || 'and provides that any lands reserved by Proclamations 9558, 9681 or '
       || '10285 that fall outside the boundaries on the accompanying map are '
       || 'excluded from the Monument, with the exclusion taking effect at 9:00 '
       || 'a.m. eastern daylight time on the date 60 days after the '
       || 'proclamation, subject to valid existing rights and the provisions of '
       || 'existing withdrawals.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11043, 'trump', 'issued', true, TIMESTAMPTZ '2026-07-13T00:00:00Z', u,
       'Signed Proclamation 11043 on 2026-07-13. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11043 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-07-17T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11043 document record, 91 FR 45169',
             u,
             'The register''s disposition record for this proclamation '
             || 'carries no revocation, amendment or supersession, so it stands '
             || 'as published. The exclusion takes effect by the proclamation''s '
             || 'own terms 60 days after July 13, 2026, subject to valid '
             || 'existing rights, the provisions of existing withdrawals and the '
             || 'requirements of applicable law. This is not a statement about '
             || 'any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-07-17T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Executive Order 14418 — Continuing To Protect the Meaning and Value of American Citizenship
  --
  --    WAVE 8 — THE UNLOCK, AND THE NEWEST DOCUMENT ON FILE. immigration_reform
  --    is a stated position on this profile — birthright citizenship and the
  --    courts — and until this wave it had NO formal action mapped to it at
  --    all. The position was written from EO 14160 and Trump v. CASA, so
  --    neither of those could have unlocked it even if seeded. This is a
  --    different document, signed thirteen months later, responding to a
  --    different Supreme Court decision, and it is what makes the position
  --    testable for the first time.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/08/11/2026-16403/continuing-to-protect-the-meaning-and-value-of-american-citizenship';

  SELECT id INTO m_14418
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14418'
   LIMIT 1;

  IF m_14418 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14418',
       'Continuing To Protect the Meaning and Value of American Citizenship',
       'Citizenship documents after Trump v. Barbara',
       'Signed 2026-08-06 and published at 91 FR 51991 on 2026-08-11. Section '
       || '2 directs that no agency issue or accept documents recognizing United '
       || 'States citizenship for persons neither of whose parents is a citizen '
       || 'where a parent is an alien enemy or a foreign government employee as '
       || 'defined in the order, where a parent engaged in a commercial '
       || 'transaction to purchase or access birthright citizenship, or where '
       || 'the person is born in a territory where citizenship is not conferred '
       || 'by statute. Recites Trump v. Barbara, 146 S. Ct. 2438 (2026).',
       NULL, TIMESTAMPTZ '2026-08-06T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14418","frCitation":"91 FR 51991","frDocumentNumber":"2026-16403"}'::jsonb)
    RETURNING id INTO m_14418;
    RAISE NOTICE 'created vr_measures Executive Order 14418 as id %', m_14418;
  END IF;

  IF m_14418 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14418, 'immigration_reform', 90, true, 'yea_supports',
       'Section 2 sets the policy that no executive department or agency '
       || 'shall issue documents recognizing United States citizenship to, or '
       || 'accept documents purporting to recognize it regarding, persons '
       || 'neither of whose parents is a citizen where any of four conditions '
       || 'applies: a parent is an alien enemy as defined in the order; a parent '
       || 'is a foreign government employee as defined in the order; a parent '
       || 'engaged in a commercial transaction to purchase or access birthright '
       || 'citizenship, including a transaction to ensure the mother is present '
       || 'in the United States to give birth or a transaction with a surrogate '
       || 'so present; or the person is born in a territory or territorial '
       || 'waters where citizenship is not conferred by federal statute. Section '
       || '3(a) directs the Secretary of State, the Attorney General, the '
       || 'Secretary of Homeland Security and the Commissioner of Social '
       || 'Security to ensure their regulations and policies align with the '
       || 'order, and section 3(b) directs all agency heads to issue public '
       || 'implementation guidance within 30 days.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14418, 'trump', 'issued', true, TIMESTAMPTZ '2026-08-06T00:00:00Z', u,
       'Signed Executive Order 14418 on 2026-08-06. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14418 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-08-11T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14418 document record, 91 FR 51991',
             u,
             'The register''s disposition record for this order carries no '
             || 'revocation, amendment or supersession, so it stands as '
             || 'published. Published August 11, 2026, five days after '
             || 'signature. This is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-08-11T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H. Executive Order 14419 — Ending Birth Tourism
  --
  --    WAVE 8 — THE SECOND DIFFERENT DOCUMENT ON THE UNLOCKED POSITION, AND THE
  --    RECENCY ANCHOR. EO 14418 makes immigration_reform testable; this one,
  --    signed the same day under a separate order number and a separate
  --    authority, keeps that read from resting on a single document. It is also
  --    the newest presidential document of any kind in this pass, so it is what
  --    the profile's latest-action date now points at.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/08/11/2026-16404/ending-birth-tourism';

  SELECT id INTO m_14419
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14419'
   LIMIT 1;

  IF m_14419 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14419',
       'Ending Birth Tourism',
       'Birth tourism and nonimmigrant visas',
       'Signed 2026-08-06 and published at 91 FR 51993 on 2026-08-11. Section '
       || '2 delegates the President''s authority under 8 U.S.C. 1185(a) to the '
       || 'Secretary of State and the Secretary of Homeland Security; section 3 '
       || 'defines birth tourism; section 4(a) authorizes denial of entry, visa '
       || 'revocation, permanent bars, removal and action against facilitators; '
       || 'section 5 preserves humanitarian and national-interest exemptions.',
       NULL, TIMESTAMPTZ '2026-08-06T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14419","frCitation":"91 FR 51993","frDocumentNumber":"2026-16404"}'::jsonb)
    RETURNING id INTO m_14419;
    RAISE NOTICE 'created vr_measures Executive Order 14419 as id %', m_14419;
  END IF;

  IF m_14419 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14419, 'immigration_reform', 80, true, 'yea_supports',
       'Section 3 defines birth tourism as the entry of a foreign national '
       || 'into the United States via a nonimmigrant visa for the purpose of '
       || 'giving birth on American soil, or any effort by a foreign national to '
       || 'facilitate such entry. Section 1 states the policy of preventing the '
       || 'exploitation of nonimmigrant visa classifications by persons engaging '
       || 'in birth tourism, on the ground that it enables foreign nationals to '
       || 'exploit temporary admission to obtain permanent immigration-related '
       || 'benefits.', u),
      (m_14419, 'border_security', 70, false, 'yea_supports',
       'Section 2 delegates to the Secretary of State and the Secretary of '
       || 'Homeland Security the President''s authority under section 215(a) of '
       || 'the Immigration and Nationality Act, 8 U.S.C. 1185(a), to the extent '
       || 'necessary to implement the order. Section 4(a) provides that action '
       || 'may include preventing entry or the granting of any visa or travel '
       || 'authorization to an alien entering or attempting to enter for the '
       || 'purpose of engaging in birth tourism, revoking the visa or travel '
       || 'authorization and permanently barring entry of such an alien, denial '
       || 'of entry to or removal of an alien who previously engaged or plans to '
       || 'engage in birth tourism, and action against entities or individuals '
       || 'inside or outside the United States responsible for facilitating it.', u),
      (m_14419, 'deportations', 65, false, 'yea_supports',
       'Section 4(a) names removal among the actions the Secretaries may take '
       || 'within their respective discretion and authority, applying it to any '
       || 'alien who previously engaged or plans to engage in birth tourism. '
       || 'Section 5 provides that the Secretary of State or the Secretary of '
       || 'Homeland Security may exempt a foreign national from actions taken '
       || 'pursuant to the order on humanitarian grounds or where entry is in '
       || 'the national interest.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14419, 'trump', 'issued', true, TIMESTAMPTZ '2026-08-06T00:00:00Z', u,
       'Signed Executive Order 14419 on 2026-08-06. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14419 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-08-11T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14419 document record, 91 FR 51993',
             u,
             'The register''s disposition record for this order carries no '
             || 'revocation, amendment or supersession, so it stands as '
             || 'published. Published August 11, 2026, five days after '
             || 'signature; it is the newest presidential document this pass '
             || 'placed on file. This is not a statement about any challenge to '
             || 'it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-08-11T00:00:00Z');
    END IF;
  END IF;

END $$;
