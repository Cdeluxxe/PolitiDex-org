-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 12: the instruments that point the other way
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql,
-- 20260829000000_seed_exec_actions_wave6.sql,
-- 20260830000000_seed_exec_actions_wave7.sql,
-- 20260831000000_seed_exec_actions_wave8.sql,
-- 20260901000000_seed_exec_actions_wave9.sql,
-- 20260902000000_seed_exec_actions_wave10.sql and
-- 20260903000000_seed_exec_actions_wave11.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 12 together and asserts that every citation, date and
-- issue key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- An audit of the presidential profile found two clusters of rows reading in a
-- single direction, and in both cases the reason was the record, not the formula.
--
--   The war cluster. restraint held exactly two documents and war_powers held the
--   same two — S.J. Res. 7 and S.J. Res. 68, both term-45 vetoes. Neither issue
--   carried one instrument from the second term. A profile that says nothing about
--   the current term on the question of who commits the country to armed action is
--   not neutral; it is silent, and silence on this record reads as absence.
--
--   The affordability cluster. cost_living held three advancing relief instruments
--   and nothing pointing the other way, in a file that already contained three
--   instruments raising the price of imported goods. Those three were on file for
--   their tariff readings; the reading against the day-one affordability directive
--   was simply never written down.
--
-- Three documents are added here and three secondary mappings are written onto
-- documents that were already on file. Every one was read from its own primary text
-- in this pass: the Federal Register API document record for each of the three new
-- documents, plus the full published text of each from the register's own raw-text
-- URLs, before any direction was assigned.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT
-- ─────────────────────────────────────────────────────────────────────────────
-- Three documents, all term 47, none of which was on file before this wave:
--   EO 14353 (2025-09-29)  Assuring the Security of the State of Qatar. A standing
--                          commitment to defend another state, including by military
--                          means, resting on no treaty, statute or authorization for
--                          the use of force. war_powers primary, restraint and
--                          america_first_fp secondary.
--   EO 14373 (2026-01-09)  Custody of Venezuelan oil revenue. Declares a NEW
--                          national emergency and names another country's economic
--                          and political stability among the major foreign policy
--                          objectives of the United States. america_first_fp only.
--   Proc 11015 (2026-03-07) Commitment to Countering Cartel Criminal Activity. A
--                          hemisphere-wide commitment to armed action and to
--                          mobilizing partner militaries, by proclamation.
--                          war_powers primary, restraint secondary.
--
-- Three secondary mappings on measures waves 1-11 already wrote, all of them the
-- cost_living reading those waves did not carry:
--   EO 14257   (weight 65) the reciprocal-tariff duty.
--   Proc 11012 (weight 70) the section 122 import surcharge.
--   Proc 11020 (weight 70) the pharmaceutical border charge.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- COVERAGE OVER SELECTION — WHICH CUTS BOTH WAYS HERE
-- ─────────────────────────────────────────────────────────────────────────────
-- Every previous wave had to defend against filing only the documents that agreed
-- with the stated position. This one has to defend against the opposite temptation,
-- because it was commissioned to add counter-evidence. The discipline is the same
-- rule read in both directions: file the instruments that bear on the row, whichever
-- way they point, and let the arithmetic land where it lands.
--
-- Two mappings that WOULD have moved a bucket further were deliberately not filed:
--   america_first_fp on Proclamation 11015. Its partner-military language asks other
--   countries to carry part of the campaign, which runs WITH the burden-sharing
--   doctrine, not against it. Filing it would have been reading a direction the text
--   does not support.
--   healthcare_costs on Proclamation 11020. A border charge on imported medicines
--   does not cut against hospital price transparency, which is what that chip is
--   about. Two different subjects.
-- Both refusals are recorded in the _issuesNote fields of db/exec-action-seed.json.
--
-- Nothing was added on the spending and debt chips, and that is a finding rather
-- than an omission. cut_spending already carried two appropriations instruments
-- running against the stated position and national_debt already carried one; the
-- broader public record already carried two Government Accountability Office
-- findings, the Congressional Budget Office score of the 2025 reconciliation law
-- and the debt-milestone item. A fourth marginal instrument there would have been
-- volume, not evidence.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- CIRCULARITY
-- ─────────────────────────────────────────────────────────────────────────────
-- The three cost_living mappings were checked against the stance text they are
-- filed to test. That text names a day-one memorandum and no order number and no
-- title, which is why the Presidential Memorandum at 90 FR 8245 is already held
-- circular on this chip. None of the three documents added here is named by it, so
-- none of the three mappings is circular, and the held row stays held.
--
-- The restraint and america_first_fp stance texts name no document at all, and
-- war_powers carries no stated presidential position, so there is nothing for the
-- new war-lane rows to be circular with.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY
-- ─────────────────────────────────────────────────────────────────────────────
-- No UPDATE, no DELETE, no ALTER. Every measure lookup is a guarded SELECT, every
-- issue and position insert carries ON CONFLICT DO NOTHING, and every standing row
-- is guarded by a NOT EXISTS. A rate, a weight or a rationale that needs to change
-- gets a NEW forward migration, not an edit here.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_eo14353      integer;
  m_eo14373      integer;
  m_pc11015      integer;
  m_eo14257      integer;
  m_pc11012      integer;
  m_pc11020      integer;
  pos            integer;
  u              text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14353 — Assuring the Security of the State of Qatar
  --
  --    The first second-term instrument on the war_powers and restraint chips.
  --    Section 2(b) puts American military means behind a guarantee to another
  --    state; the order names no treaty, statute or authorization for the use of
  --    military force anywhere in its text.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/10/06/2025-19483/assuring-the-security-of-the-state-of-qatar';

  SELECT id INTO m_eo14353
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14353'
   LIMIT 1;

  IF m_eo14353 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14353',
       'Assuring the Security of the State of Qatar',
       'Qatar security guarantee',
       'Signed 2025-09-29 and published at 90 FR 48143 on 2025-10-06. Section 1 makes '
       || 'it the policy of the United States to guarantee the security and territorial '
       || 'integrity of the State of Qatar against external attack. Section 2(a) '
       || 'provides that the United States shall regard any armed attack on the '
       || 'territory, sovereignty or critical infrastructure of Qatar as a threat to '
       || 'the peace and security of the United States, and section 2(b) that the '
       || 'United States shall then take all lawful and appropriate measures — '
       || 'diplomatic, economic and, if necessary, military — to defend the interests '
       || 'of both states and to restore peace and stability. Section 2(c) directs the '
       || 'Secretary of War, with the Secretary of State and the Director of National '
       || 'Intelligence, to maintain joint contingency planning with Qatar. The order '
       || 'rests on the authority vested in the President by the Constitution and the '
       || 'laws of the United States and identifies no treaty, statute or authorization '
       || 'for the use of military force.',
       NULL, TIMESTAMPTZ '2025-09-29T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14353","frCitation":"90 FR 48143","frDocumentNumber":"2025-19483"}'::jsonb)
    RETURNING id INTO m_eo14353;
    RAISE NOTICE 'created vr_measures Executive Order 14353 as id %', m_eo14353;
  END IF;

  IF m_eo14353 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14353, 'war_powers', 85, true, 'yea_opposes',
       'Section 1 makes it the policy of the United States to guarantee the '
       || 'security and territorial integrity of another state against external '
       || 'attack. Section 2(a) treats any armed attack on that state as a threat '
       || 'to the peace and security of the United States and section 2(b) commits '
       || 'the United States to take all lawful and appropriate measures — '
       || 'including, if necessary, military ones — in response. Section 2(c) makes '
       || 'the joint contingency planning continuous. The order identifies no '
       || 'treaty, statute or authorization for the use of military force. Mapped '
       || 'opposes on the congressional war-power chip because the instrument is '
       || 'itself the whole authorization for what it promises. The mapping records '
       || 'what the order commits the country to do and makes no claim about '
       || 'whether the commitment was wise.', u),
      (m_eo14353, 'restraint', 75, false, 'yea_opposes',
       'The commitment created by sections 1 and 2 carries no end date, no sunset '
       || 'and no triggering condition narrower than any armed attack on the '
       || 'covered state''s territory, sovereignty or critical infrastructure, and '
       || 'section 2(c) makes the planning for it continuous rather than contingent '
       || 'on a later decision. Mapped opposes on the restraint chip because a '
       || 'standing promise to fight for another country if it is attacked is a new '
       || 'open-ended military commitment rather than the winding down of one.', u),
      (m_eo14353, 'america_first_fp', 70, false, 'yea_opposes',
       'The stated position on this chip is a doctrine of pressing allies to fund '
       || 'their own defense and of questioning open-ended commitments abroad. '
       || 'Section 1 runs the other way for one ally by making the guarantee of '
       || 'that state''s security the policy of the United States, and section 2(b) '
       || 'puts American military means behind the guarantee. The order asks '
       || 'nothing of the covered state in return and sets no cost-sharing '
       || 'condition. Filed below the war_powers weight because the stated doctrine '
       || 'is written about aid and burden-sharing rather than about defense '
       || 'guarantees, so the tension is real but secondary.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14353, 'trump', 'issued', true, TIMESTAMPTZ '2025-09-29T00:00:00Z', u,
       'Signed Executive Order 14353 on 2025-09-29. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m_eo14353 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-10-06T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14353 document record, 90 FR 48143',
             u,
             'Signed September 29, 2025 and published October 6, 2025 at 90 FR 48143. '
             || 'The register''s document record for this order carries no disposition '
             || 'note and there is no later presidential document revoking, amending '
             || 'or superseding it, so it stands as published. This describes the '
             || 'register''s record of presidential action and is not a statement '
             || 'about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-10-06T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14373 — Safeguarding Venezuelan Oil Revenue for the Good
  --    of the American and Venezuelan People
  --
  --    Filed for its own section 1 findings, which name another country's
  --    economic and political stability among the major foreign policy objectives
  --    of the United States and declare a NEW national emergency to protect the
  --    custody arrangement that serves it.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/01/15/2026-00831/safeguarding-venezuelan-oil-revenue-for-the-good-of-the-american-and-venezuelan-people';

  SELECT id INTO m_eo14373
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14373'
   LIMIT 1;

  IF m_eo14373 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14373',
       'Safeguarding Venezuelan Oil Revenue for the Good of the American and Venezuelan People',
       'Custody of Venezuelan oil revenue',
       'Signed 2026-01-09 and published at 91 FR 2045 on 2026-01-15. Declares a new '
       || 'national emergency under the International Emergency Economic Powers Act '
       || 'and the National Emergencies Act. Section 1 finds that attachment or other '
       || 'judicial process against the covered funds would substantially interfere '
       || 'with efforts to ensure economic and political stability in Venezuela, and '
       || 'that the failure of those efforts would jeopardize major foreign policy '
       || 'objectives of the United States — ending illegal immigration and illicit '
       || 'narcotics flows, protecting American interests against malign actors, and '
       || 'bringing peace, prosperity and stability to the Venezuelan people and the '
       || 'Western Hemisphere. Section 2 defines Foreign Government Deposit Funds as '
       || 'Treasury-held funds of Venezuela, its central bank and its state oil '
       || 'company derived from natural-resource or diluent sales. Section 3 renders '
       || 'any attachment, judgment, lien, execution or garnishment against them null '
       || 'and void and bars transfer except under licence. Section 4 finds the funds '
       || 'are property of that government, held by the United States solely in a '
       || 'custodial and governmental capacity, pending sovereign disposition '
       || 'determined by the Secretary of State on that government''s behalf.',
       NULL, TIMESTAMPTZ '2026-01-09T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14373","frCitation":"91 FR 2045","frDocumentNumber":"2026-00831"}'::jsonb)
    RETURNING id INTO m_eo14373;
    RAISE NOTICE 'created vr_measures Executive Order 14373 as id %', m_eo14373;
  END IF;

  IF m_eo14373 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14373, 'america_first_fp', 75, true, 'yea_opposes',
       'Section 1 finds that judicial process against the covered funds would '
       || 'substantially interfere with efforts to ensure economic and political '
       || 'stability in Venezuela and that the failure of those efforts would '
       || 'jeopardize major foreign policy objectives of the United States, among '
       || 'which the section lists bringing peace, prosperity and stability to the '
       || 'Venezuelan people and to the Western Hemisphere more generally. On that '
       || 'finding the order declares a national emergency. Section 3 voids '
       || 'attachment and bars transfer of the funds, and section 4 holds them in a '
       || 'custodial capacity pending sovereign disposition determined by the '
       || 'Secretary of State on behalf of that government. Mapped opposes because '
       || 'the America-First chip is written around questioning open-ended '
       || 'commitments abroad, and this order takes one on: another country''s '
       || 'stabilization becomes a named United States objective and the Treasury '
       || 'becomes custodian of that country''s resource revenue for a period the '
       || 'order does not bound.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14373, 'trump', 'issued', true, TIMESTAMPTZ '2026-01-09T00:00:00Z', u,
       'Signed Executive Order 14373 on 2026-01-09. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m_eo14373 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-01-15T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14373 document record, 91 FR 2045',
             u,
             'Signed January 9, 2026 and published January 15, 2026 at 91 FR 2045. '
             || 'The register''s document record carries no disposition note and no '
             || 'later presidential document revokes, amends or supersedes it; the '
             || 'later register entries that refer to it are notices of Treasury '
             || 'general licences issued under its own authority, which leave the '
             || 'order in place. This describes the register''s record of presidential '
             || 'action and is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-01-15T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Proclamation 11015 — Commitment to Countering Cartel Criminal Activity
  --
  --    The broadest second-term statement of commitment to armed action in the
  --    file. Numbered paragraph (1) proclaims that the covered organizations
  --    should be demolished to the fullest extent possible; paragraph (3) that the
  --    United States will train and mobilize partner nation militaries. No
  --    authorization for the use of military force is named.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/03/12/2026-04924/commitment-to-countering-cartel-criminal-activity';

  SELECT id INTO m_pc11015
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11015'
   LIMIT 1;

  IF m_pc11015 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11015',
       'Commitment to Countering Cartel Criminal Activity',
       'Hemisphere cartel campaign commitment',
       'Signed 2026-03-07 and published at 91 FR 12285 on 2026-03-12. The preamble '
       || 'recites that the Secretary of War convened a coalition of military leaders '
       || 'and representatives from seventeen countries demonstrating that the region '
       || 'is ready to operationalize hard power against these threats, and states '
       || 'that the United States will address them by use of any necessary resources '
       || 'and legally available authorities together with partner nations. Numbered '
       || 'paragraph (1) proclaims that the covered organizations should be demolished '
       || 'to the fullest extent possible under applicable law; paragraph (2) that '
       || 'allies coordinate to deprive them of territory and financing; paragraph (3) '
       || 'that the United States will train and mobilize partner nation militaries to '
       || 'dismantle them; paragraph (4) that the United States and its allies should '
       || 'keep external threats at bay. It issues by virtue of the authority vested '
       || 'in the President by the Constitution and the laws of the United States and '
       || 'names no authorization for the use of military force.',
       NULL, TIMESTAMPTZ '2026-03-07T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11015","frCitation":"91 FR 12285","frDocumentNumber":"2026-04924"}'::jsonb)
    RETURNING id INTO m_pc11015;
    RAISE NOTICE 'created vr_measures Proclamation 11015 as id %', m_pc11015;
  END IF;

  IF m_pc11015 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pc11015, 'war_powers', 80, true, 'yea_opposes',
       'The preamble states that the United States will address the covered '
       || 'threats by use of any necessary resources and legally available '
       || 'authorities together with partner nations. Numbered paragraph (1) '
       || 'proclaims that the covered organizations should be demolished to the '
       || 'fullest extent possible under applicable law and paragraph (3) that the '
       || 'United States will train and mobilize partner nation militaries to '
       || 'dismantle them. The proclamation issues on the authority vested in the '
       || 'President by the Constitution and the laws of the United States and '
       || 'identifies no authorization for the use of military force. Mapped '
       || 'opposes on the congressional war-power chip because a hemisphere-wide '
       || 'commitment to armed action is asserted here as an executive act on its '
       || 'own authority.', u),
      (m_pc11015, 'restraint', 75, false, 'yea_opposes',
       'The commitment the document makes is open-ended in every dimension it '
       || 'addresses: no end date, no theatre narrower than the Western Hemisphere, '
       || 'no ceiling on means beyond any necessary resources and legally available '
       || 'authorities, and an objective — demolition of the covered organizations '
       || 'to the fullest extent possible — that the document does not treat as '
       || 'achieved. Mapped opposes on the restraint chip because a proclamation '
       || 'committing the country to demolishing armed organizations abroad opens a '
       || 'campaign rather than ending one. The mapping records the commitment the '
       || 'document makes and asserts nothing about the campaign''s results.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_pc11015, 'trump', 'issued', true, TIMESTAMPTZ '2026-03-07T00:00:00Z', u,
       'Signed Proclamation 11015 on 2026-03-07. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m_pc11015 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-03-12T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11015 document record, 91 FR 12285',
             u,
             'Signed March 7, 2026 and published March 12, 2026 at 91 FR 12285. The '
             || 'register''s document record carries no disposition note and no later '
             || 'presidential document revoking or superseding it, so it stands as '
             || 'published. This describes the register''s record of presidential '
             || 'action and is not a statement about any challenge to the '
             || 'proclamation.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-03-12T00:00:00Z');
    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14257 — SECOND MAPPING ONLY, on a measure waves 1-11 wrote
  --
  -- No vr_measures row, no vr_positions row and no standing row is written
  -- here: the document is already on file and its standing history, including
  -- the struck_down row, is already logged. This is one vr_measure_issues row,
  -- guarded the same way, carrying the 'cost_living' reading the earlier waves
  -- did not.
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/04/07/2025-06063/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and';

  SELECT id INTO m_eo14257
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14257'
   LIMIT 1;

  IF m_eo14257 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14257, 'cost_living', 65, false, 'yea_opposes',
       'The stated position on this chip is the day-one directive telling every '
       || 'agency to pursue emergency measures lowering the cost of housing, '
       || 'health care, energy and consumer goods. This order runs the other way '
       || 'on the last of those: it imposes an additional ad valorem duty on '
       || 'articles from nearly every trading partner, with higher '
       || 'country-specific rates in its annex, and contains no offsetting '
       || 'measure for household purchasers. Added in wave 12 as a secondary '
       || 'mapping at reduced weight because the order is a trade instrument '
       || 'whose stated subject is the goods trade deficit rather than consumer '
       || 'prices; the tariffs_prices mapping already on this row carries the '
       || 'narrow tariffs-and-prices reading, and this one carries the separate '
       || 'tension with the affordability directive. Note the struck_down '
       || 'standing row already on this document: this mapping records what the '
       || 'order imposed, and the standing rows record what survived.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- =========================================================================
  -- Proclamation 11012 — SECOND MAPPING ONLY, on a measure waves 1-11 wrote
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2026/02/25/2026-03824/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems';

  SELECT id INTO m_pc11012
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11012'
   LIMIT 1;

  IF m_pc11012 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pc11012, 'cost_living', 70, false, 'yea_opposes',
       'The stated position on this chip is the day-one directive to lower the '
       || 'cost of housing, health care, energy and consumer goods. This '
       || 'proclamation imposes an additional 10 percent ad valorem surcharge on '
       || 'articles imported into the United States under section 122 of the '
       || 'Trade Act of 1974. Its paragraph 14 carve-out list — critical '
       || 'minerals, bullion, energy, fertilizers, certain agricultural '
       || 'products, pharmaceuticals, certain electronics — removes several of '
       || 'the named categories from the charge, which is why this is filed '
       || 'below the weight of the primary mapping; the surcharge still reaches '
       || 'imported consumer goods generally, and it issued more than a year '
       || 'into the directive it sits against. Added in wave 12.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- =========================================================================
  -- Proclamation 11020 — SECOND MAPPING ONLY, on a measure waves 1-11 wrote
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2026/04/09/2026-06956/adjusting-imports-of-pharmaceuticals-and-pharmaceutical-ingredients-into-the-united-states';

  SELECT id INTO m_pc11020
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11020'
   LIMIT 1;

  IF m_pc11020 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pc11020, 'cost_living', 70, false, 'yea_opposes',
       'The stated position on this chip is the day-one directive to lower the '
       || 'cost of housing, health care, energy and consumer goods. This '
       || 'proclamation imposes a duty of one hundred percent on imported '
       || 'patented and branded medicines and their listed ingredients, with '
       || 'lower rates for named countries and for firms whose onshoring plans '
       || 'are approved, and its own findings place the bulk of covered supply '
       || 'outside the country. Generics, biosimilars and a list of specialty '
       || 'therapies are exempt, which is one reason it is filed below the '
       || 'weight of the primary mapping. Added in wave 12 as a secondary '
       || 'mapping because the primary reading of this document is the '
       || 'drug-pricing one already on this row; the cost_living mapping records '
       || 'the separate tension with the broader affordability directive, which '
       || 'names health care by name.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;
