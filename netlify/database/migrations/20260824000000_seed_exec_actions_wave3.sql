-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 3: the eleven actions the audit was missing
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql and
-- 20260808000000_seed_exec_actions_wave2.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1, 2 and 3 together and asserts that every citation, date and issue
-- key in that file appears in one of them, so the client data and the database rows
-- cannot drift apart without the suite failing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- The executive-lane audit found the same failure eleven times: a stated position
-- with real formal action behind it and no document on file to test it against, so
-- the lane reported "no action on file yet" about the best-documented parts of this
-- presidency. The tariff program was the largest instance — five stated positions,
-- one of which names the order by number, and not one document in the record.
--
--   A. Executive Order 14257 — the reciprocal-tariff order. Five mappings, two of
--      them in the opposing direction because two of the tariff issues are written
--      in the protective direction. TWO standings: valid on publication, then held
--      unauthorized by the Supreme Court ten months later.
--   B. Executive Order 14273 and Executive Order 14297 — drug pricing, five weeks
--      apart, as two rows. Not interchangeable: the stance card was written from the
--      second and cites it, so that pair is circular and held; the first is a
--      different document the card does not cite, and is the only reason the issue
--      is testable at all.
--   C. Executive Order 14233 and Executive Order 14178 — digital assets.
--   D. Executive Order 14221 — healthcare price transparency. exec-record.js's own
--      REJECT_SRC comment names this issue's stance card as a live example of a bad
--      citation: it cites a fact sheet about the order rather than the order. This
--      row is the order.
--   E. Executive Order 14165 and Executive Order 14159 — the two day-one
--      immigration orders.
--   F. Public Law 119-26, Public Law 119-27 and Public Law 119-28 — fentanyl
--      scheduling, payment stablecoins, rescissions.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Federal Register API document records, queried one order at a time for title,
-- signing date, publication date, citation, document number and disposition notes:
--   EO 14257  signed 2025-04-02, published 2025-04-07, 90 FR 15041, doc 2025-06063
--   EO 14273  signed 2025-04-15, published 2025-04-18, 90 FR 16441, doc 2025-06837
--   EO 14297  signed 2025-05-12, published 2025-05-15, 90 FR 20749, doc 2025-08876
--   EO 14233  signed 2025-03-06, published 2025-03-11, 90 FR 11789, doc 2025-03992
--   EO 14221  signed 2025-02-25, published 2025-02-28, 90 FR 11005, doc 2025-03440
--   EO 14165  signed 2025-01-20, published 2025-01-30, 90 FR  8467, doc 2025-02015
--   EO 14159  signed 2025-01-20, published 2025-01-29, 90 FR  8443, doc 2025-02006
--   EO 14178  signed 2025-01-23, published 2025-01-31, 90 FR  8647, doc 2025-02123
-- Disposition notes were read for each: none of the eight carries an entry revoking
-- or superseding it. EO 14273 and EO 14297 cross-reference each other; EO 14159
-- revokes EO 13993, 14010, 14011 and 14012; EO 14178 revokes EO 14067; EO 14233 and
-- EO 14165 carry no disposition note at all. A cross-reference is not a repeal, and
-- the in_force rows below claim only what the register establishes.
--
-- Court document, downloaded from supremecourt.gov and read in full:
--   Learning Resources, Inc. v. Trump, No. 24-1287, decided February 20, 2026.
--   Held: the International Emergency Economic Powers Act does not authorize the
--   President to impose tariffs. The opinion names Executive Order 14257 among the
--   challenged actions, by number and by Federal Register citation. The judgment of
--   the Federal Circuit in No. 25-250 was affirmed; the judgment in No. 24-1287 was
--   vacated and remanded with instructions to dismiss for want of jurisdiction. The
--   Court decided nothing about refunds of duties already collected, and the status
--   row below asserts nothing about them.
--   The prior pass could not open this PDF, which is why EO 14257 had no standing
--   on file. That mattered more than it looks: consistency.js#execRecordsFor holds
--   every mapping of a standing-less action back as no_standing, so without this
--   reading the largest action in the file would have entered as coverage and
--   scored nothing.
--
-- Public law facts come from GPO's published PLAW packages, read in this pass:
--   PLAW-119publ26  Public Law 119-26, approved July 16, 2025, [S. 331],
--                   139 Stat. 409, "Halt All Lethal Trafficking of Fentanyl Act"
--   PLAW-119publ27  Public Law 119-27, approved July 18, 2025, [S. 1582],
--                   139 Stat. 419, "Guiding and Establishing National Innovation
--                   for U.S. Stablecoins Act"
--   PLAW-119publ28  Public Law 119-28, approved July 24, 2025, [H.R. 4],
--                   139 Stat. 467, "Rescissions Act of 2025"
-- The measure rows are cited to congress.gov because db/exec-action-types.json
-- names it the source of record for enacted legislation and every existing law row
-- in this lane follows that rule. congress.gov still returns HTTP 403 to this
-- environment, exactly as it did in wave 1, so the facts were verified against GPO
-- instead and the standing rows cite the GPO package that was actually read.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- TWO MAPPINGS DELIBERATELY NOT WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14257 is NOT mapped to cost_living. Whether a tariff raises household prices
-- in the aggregate is a contested economic claim, not something the order's text
-- establishes, and this lane carries what a document does.
--
-- H.R. 4 is NOT mapped to national_debt here, although 20260719150000 wrote such a
-- row for the congressional lane at weight 40. On this president's record the other
-- national_debt action on file is Public Law 119-21, whose section 72001 raised the
-- statutory debt limit by five trillion dollars. Setting a rescission of roughly
-- nine billion dollars beside that at comparable weight would render an issue row
-- as though the two pulled against each other with comparable force. The
-- cut_spending mapping is the true one and is written at full weight.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE THREE LAWS ALREADY EXIST AS MEASURES
-- ─────────────────────────────────────────────────────────────────────────────
-- S. 331, S. 1582 and H.R. 4 were seeded by the congressional lane long before this
-- one existed, so this file resolves them by natural key and adds only the exec
-- pieces: the missing issue pairs, the act of signing, and the standing. Where a
-- pair already exists the weight is read straight across from that migration rather
-- than re-chosen — S. 331 at immig_fentanyl 100 and tough_on_crime 75, H.R. 4 at
-- cut_spending 100 — so the two lanes cannot disagree about what a law does. Where
-- no pair exists, one is added: S. 1582's existing rows use tech_innovation, crypto
-- and econ_corp_account, a vocabulary chosen before crypto_cbdc was a key, and
-- crypto_cbdc is the key the president's own stated position is filed under.
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
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14257 integer;
  m_14273 integer;
  m_14297 integer;
  m_14233 integer;
  m_14178 integer;
  m_14221 integer;
  m_14165 integer;
  m_14159 integer;
  m_s331  integer;
  m_s1582 integer;
  m_hr4   integer;
  pos     integer;
  u       text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14257 — reciprocal tariffs
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/04/07/2025-06063/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and';

  SELECT id INTO m_14257
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14257'
   LIMIT 1;

  IF m_14257 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14257',
       'Regulating Imports With a Reciprocal Tariff To Rectify Trade Practices That '
       || 'Contribute to Large and Persistent Annual United States Goods Trade Deficits',
       'Reciprocal tariff order',
       'Signed 2025-04-02 and published at 90 FR 15041 on 2025-04-07. Invokes the '
       || 'International Emergency Economic Powers Act to impose a baseline ad valorem '
       || 'duty on imports from nearly all trading partners, plus higher '
       || 'country-specific rates set out in an annexed schedule, on the stated ground '
       || 'that large and persistent goods trade deficits have hollowed out the '
       || 'domestic manufacturing base and undermined critical supply chains. Held '
       || 'unauthorized by the Supreme Court on 2026-02-20 in Learning Resources, Inc. '
       || 'v. Trump.',
       NULL, TIMESTAMPTZ '2025-04-02T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14257","frCitation":"90 FR 15041","frDocumentNumber":"2025-06063"}'::jsonb)
    RETURNING id INTO m_14257;
    RAISE NOTICE 'created vr_measures Executive Order 14257 as id %', m_14257;
  END IF;

  IF m_14257 IS NOT NULL THEN
    -- Five mappings, two of them 'yea_opposes'. The opposing pair is not a judgement
    -- about tariffs: alignment-tool.js writes tariffs_prices and tariffs_authority in
    -- the PROTECTIVE direction — shield households from tariff-driven price increases,
    -- keep Congress's role over tariff rates — so an order that imposes duties across
    -- the import base without offsetting relief, under an emergency statute rather
    -- than an enacted rate schedule, cuts against both as they are defined.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14257, 'tariffs_growth', 100, true, 'yea_supports',
       'Imposes a baseline ad valorem duty on imports from nearly all trading partners '
       || 'plus higher country-specific rates, on the stated ground that persistent '
       || 'goods trade deficits have hollowed out the domestic manufacturing base.', u),
      (m_14257, 'tariffs_authority', 75, false, 'yea_opposes',
       'Sets tariff rates by executive order under the International Emergency '
       || 'Economic Powers Act rather than under a rate schedule enacted by Congress.', u),
      (m_14257, 'tariffs_prices', 70, false, 'yea_opposes',
       'The duties apply across nearly the whole import base and the order pairs them '
       || 'with no offsetting relief for household purchasers.', u),
      (m_14257, 'tariffs_china', 60, false, 'yea_supports',
       'Assigns China one of the higher country-specific rates in the annexed '
       || 'schedule, on the stated ground of non-reciprocal trade practices.', u),
      (m_14257, 'econ_trade', 55, false, 'yea_supports',
       'Uses import duties as the instrument for reshoring domestic manufacturing and '
       || 'rebuilding supply chains.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14257, 'trump', 'issued', true, TIMESTAMPTZ '2025-04-02T00:00:00Z', u,
       'Signed Executive Order 14257 on 2025-04-02. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14257 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- A.1 — publication. Two rows exist because an order can be validly issued,
      -- operate for ten months, and then be held unauthorized. One word for the whole
      -- sequence would either hide the ruling or hide the period the duties were
      -- actually collected under.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-04-07T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14257 document record, 90 FR 15041',
             u,
             'Issued 2025-04-02 and published 2025-04-07. The register''s disposition '
             || 'record for this order carries cross-references to a long series of '
             || 'later tariff actions but no entry revoking or superseding it, so it '
             || 'stood as published by later presidential action. That is the whole of '
             || 'the claim: it is NOT a statement about any challenge to the order. '
             || 'The row below is.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-04-07T00:00:00Z');

      -- A.2 — the ruling.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'struck_down', TIMESTAMPTZ '2026-02-20T00:00:00Z',
             'Supreme Court of the United States (opinion of the Court delivered by the Chief Justice)',
             'U.S. Supreme Court — Learning Resources, Inc. v. Trump, No. 24-1287, slip opinion of Feb. 20, 2026',
             'https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf',
             'Held: the International Emergency Economic Powers Act does not authorize '
             || 'the President to impose tariffs. The opinion names this order among the '
             || 'challenged actions by number and citation. The Court affirmed the '
             || 'judgment of the Federal Circuit in No. 25-250, which had concluded that '
             || 'IEEPA''s grant of authority to regulate importation did not authorize '
             || 'the challenged duties, and vacated the judgment in No. 24-1287 with '
             || 'instructions to dismiss for want of jurisdiction. Read from the '
             || 'Court''s own syllabus holding and judgment paragraph. The Court decided '
             || 'nothing about refunds of duties already collected, and this row asserts '
             || 'nothing about them.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'struck_down'
                            AND effective_at = TIMESTAMPTZ '2026-02-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14273 — Lowering Drug Prices by Once Again Putting
  --    Americans First
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/04/18/2025-06837/lowering-drug-prices-by-once-again-putting-americans-first';

  SELECT id INTO m_14273
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14273'
   LIMIT 1;

  IF m_14273 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14273',
       'Lowering Drug Prices by Once Again Putting Americans First',
       'Lowering drug prices',
       'Signed 2025-04-15 and published at 90 FR 16441 on 2025-04-18. Directs the '
       || 'Secretary of Health and Human Services to improve the Medicare drug-price '
       || 'negotiation program, align payment for prescription medicines more closely '
       || 'with acquisition cost, and pursue measures aimed at lowering what patients '
       || 'pay at the pharmacy counter.',
       NULL, TIMESTAMPTZ '2025-04-15T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14273","frCitation":"90 FR 16441","frDocumentNumber":"2025-06837"}'::jsonb)
    RETURNING id INTO m_14273;
    RAISE NOTICE 'created vr_measures Executive Order 14273 as id %', m_14273;
  END IF;

  IF m_14273 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14273, 'health_drug_prices', 100, true, 'yea_supports',
       'Directs the Secretary of Health and Human Services to improve the Medicare '
       || 'drug-price negotiation program, to align payment for prescription medicines '
       || 'more closely with acquisition cost, and to pursue measures aimed at lowering '
       || 'what patients pay at the pharmacy counter.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14273, 'trump', 'issued', true, TIMESTAMPTZ '2025-04-15T00:00:00Z', u,
       'Signed Executive Order 14273 on 2025-04-15. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14273 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-04-18T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14273 document record, 90 FR 16441',
             u,
             'Issued 2025-04-15 and published 2025-04-18. The register''s disposition '
             || 'record carries a single cross-reference to Executive Order 14297 and no '
             || 'revocation or supersession entry, so it stands as published. A '
             || 'cross-reference is not a repeal. This says nothing about any challenge '
             || 'to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-04-18T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14297 — most-favoured-nation prescription drug pricing
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/05/15/2025-08876/delivering-most-favored-nation-prescription-drug-pricing-to-american-patients';

  SELECT id INTO m_14297
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14297'
   LIMIT 1;

  IF m_14297 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14297',
       'Delivering Most-Favored-Nation Prescription Drug Pricing to American Patients',
       'Most-favoured-nation drug pricing',
       'Signed 2025-05-12 and published at 90 FR 20749 on 2025-05-15. Directs the '
       || 'Secretary of Health and Human Services to set price targets for prescription '
       || 'medicines benchmarked to the lower prices paid by comparably developed '
       || 'nations, and to open a direct-to-patient purchasing channel at those prices. '
       || 'Its per-issue mapping is held as circular in db/exec-action-seed.json: this '
       || 'order is the source the stance card on the issue cites.',
       NULL, TIMESTAMPTZ '2025-05-12T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14297","frCitation":"90 FR 20749","frDocumentNumber":"2025-08876"}'::jsonb)
    RETURNING id INTO m_14297;
    RAISE NOTICE 'created vr_measures Executive Order 14297 as id %', m_14297;
  END IF;

  IF m_14297 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14297, 'health_drug_prices', 90, true, 'yea_supports',
       'Directs the Secretary of Health and Human Services to set price targets for '
       || 'prescription medicines benchmarked to the lower prices paid by comparably '
       || 'developed nations, and to open a direct-to-patient purchasing channel at '
       || 'those prices.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14297, 'trump', 'issued', true, TIMESTAMPTZ '2025-05-12T00:00:00Z', u,
       'Signed Executive Order 14297 on 2025-05-12. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14297 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-05-15T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14297 document record, 90 FR 20749',
             u,
             'Issued 2025-05-12 and published 2025-05-15. The register''s disposition '
             || 'record carries a single cross-reference to Executive Order 14273 and no '
             || 'revocation or supersession entry, so it stands as published. This says '
             || 'nothing about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-05-15T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14233 — Strategic Bitcoin Reserve and Digital Asset Stockpile
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/03/11/2025-03992/establishment-of-the-strategic-bitcoin-reserve-and-united-states-digital-asset-stockpile';

  SELECT id INTO m_14233
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14233'
   LIMIT 1;

  IF m_14233 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14233',
       'Establishment of the Strategic Bitcoin Reserve and United States Digital Asset Stockpile',
       'Strategic Bitcoin Reserve',
       'Signed 2025-03-06 and published at 90 FR 11789 on 2025-03-11. Establishes a '
       || 'Strategic Bitcoin Reserve and a United States Digital Asset Stockpile under '
       || 'Treasury custody, and sets rules for how digital assets already held by the '
       || 'government are accounted for and disposed of.',
       NULL, TIMESTAMPTZ '2025-03-06T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14233","frCitation":"90 FR 11789","frDocumentNumber":"2025-03992"}'::jsonb)
    RETURNING id INTO m_14233;
    RAISE NOTICE 'created vr_measures Executive Order 14233 as id %', m_14233;
  END IF;

  IF m_14233 IS NOT NULL THEN
    -- Weight 60, below the two documents that regulate the asset class itself.
    -- Custody policy for government holdings answers part of what this issue asks
    -- and not the whole of it, and the weight is where that is recorded.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14233, 'crypto_cbdc', 60, true, 'yea_supports',
       'Establishes a federal framework for digital assets already held by the '
       || 'government — a Strategic Bitcoin Reserve and a United States Digital Asset '
       || 'Stockpile under Treasury custody — and sets rules for how those holdings are '
       || 'accounted for and disposed of.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14233, 'trump', 'issued', true, TIMESTAMPTZ '2025-03-06T00:00:00Z', u,
       'Signed Executive Order 14233 on 2025-03-06. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14233 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-03-11T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14233 document record, 90 FR 11789',
             u,
             'Issued 2025-03-06 and published 2025-03-11. The register''s disposition '
             || 'record for this order is empty — no revocation, supersession or '
             || 'cross-reference entry of any kind — so it stands as published by later '
             || 'presidential action. This says nothing about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-03-11T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Executive Order 14178 — digital financial technology
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/31/2025-02123/strengthening-american-leadership-in-digital-financial-technology';

  SELECT id INTO m_14178
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14178'
   LIMIT 1;

  IF m_14178 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14178',
       'Strengthening American Leadership in Digital Financial Technology',
       'Digital financial technology',
       'Signed 2025-01-23 and published at 90 FR 8647 on 2025-01-31. Directs agencies '
       || 'to protect access to public blockchain networks and to develop a federal '
       || 'regulatory framework for digital assets, and prohibits agencies from '
       || 'establishing, issuing or promoting a United States central bank digital '
       || 'currency. Revokes Executive Order 14067 of March 9, 2022.',
       NULL, TIMESTAMPTZ '2025-01-23T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14178","frCitation":"90 FR 8647","frDocumentNumber":"2025-02123"}'::jsonb)
    RETURNING id INTO m_14178;
    RAISE NOTICE 'created vr_measures Executive Order 14178 as id %', m_14178;
  END IF;

  IF m_14178 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14178, 'crypto_cbdc', 100, true, 'yea_supports',
       'Directs agencies to protect access to public blockchain networks and to develop '
       || 'a federal regulatory framework for digital assets, and prohibits agencies '
       || 'from establishing, issuing or promoting a United States central bank digital '
       || 'currency.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14178, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-23T00:00:00Z', u,
       'Signed Executive Order 14178 on 2025-01-23. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14178 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-31T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14178 document record, 90 FR 8647',
             u,
             'Issued 2025-01-23 and published 2025-01-31. The register''s disposition '
             || 'record shows this order revoking Executive Order 14067 of March 9, '
             || '2022, and carries no entry revoking or superseding this order in turn, '
             || 'so it stands as published. This says nothing about any challenge to the '
             || 'order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-31T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Executive Order 14221 — healthcare price transparency
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/02/28/2025-03440/making-america-healthy-again-by-empowering-patients-with-clear-accurate-and-actionable-healthcare';

  SELECT id INTO m_14221
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14221'
   LIMIT 1;

  IF m_14221 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14221',
       'Making America Healthy Again by Empowering Patients With Clear, Accurate, and '
       || 'Actionable Healthcare Pricing Information',
       'Healthcare price transparency',
       'Signed 2025-02-25 and published at 90 FR 11005 on 2025-02-28. Directs the '
       || 'Departments of the Treasury, Labor and Health and Human Services to enforce '
       || 'the hospital and health-plan price-disclosure requirements, to require '
       || 'disclosure of actual prices rather than estimates, and to standardize '
       || 'pricing data so it can be compared across providers. This is the document '
       || 'the healthcare_costs stance card was written from; that card cites a fact '
       || 'sheet about it rather than the order, which exec-record.js#REJECT_SRC names '
       || 'as one of its live examples of a citation the lane refuses.',
       NULL, TIMESTAMPTZ '2025-02-25T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14221","frCitation":"90 FR 11005","frDocumentNumber":"2025-03440"}'::jsonb)
    RETURNING id INTO m_14221;
    RAISE NOTICE 'created vr_measures Executive Order 14221 as id %', m_14221;
  END IF;

  IF m_14221 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14221, 'healthcare_costs', 100, true, 'yea_supports',
       'Directs the Departments of the Treasury, Labor and Health and Human Services '
       || 'to enforce the hospital and health-plan price-disclosure requirements, to '
       || 'require disclosure of actual prices rather than estimates, and to '
       || 'standardize pricing data so it can be compared across providers.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14221, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-25T00:00:00Z', u,
       'Signed Executive Order 14221 on 2025-02-25. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14221 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-28T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14221 document record, 90 FR 11005',
             u,
             'Issued 2025-02-25 and published 2025-02-28. The register''s disposition '
             || 'record carries a single cross-reference to Executive Order 14158 and no '
             || 'revocation or supersession entry, so it stands as published. This says '
             || 'nothing about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-28T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Executive Order 14165 — Securing Our Borders
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/30/2025-02015/securing-our-borders';

  SELECT id INTO m_14165
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14165'
   LIMIT 1;

  IF m_14165 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14165',
       'Securing Our Borders', 'Securing Our Borders',
       'Signed 2025-01-20 and published at 90 FR 8467 on 2025-01-30. Directs '
       || 'resumption of physical barrier construction along the southern border, '
       || 'deployment of personnel and detection technology to maintain operational '
       || 'control of it, and detention rather than release of those apprehended '
       || 'crossing it.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14165","frCitation":"90 FR 8467","frDocumentNumber":"2025-02015"}'::jsonb)
    RETURNING id INTO m_14165;
    RAISE NOTICE 'created vr_measures Executive Order 14165 as id %', m_14165;
  END IF;

  IF m_14165 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14165, 'border_security', 100, true, 'yea_supports',
       'Directs resumption of physical barrier construction along the southern border, '
       || 'deployment of personnel and detection technology to maintain operational '
       || 'control of it, and detention rather than release of those apprehended '
       || 'crossing it.', u),
      (m_14165, 'deportations', 60, false, 'yea_supports',
       'Directs removal of apprehended entrants and termination of practices that '
       || 'released them into the interior pending proceedings.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14165, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14165 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14165 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-30T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14165 document record, 90 FR 8467',
             u,
             'Issued 2025-01-20 and published 2025-01-30. The register''s disposition '
             || 'record for this order is empty — no revocation, supersession or '
             || 'cross-reference entry of any kind — so it stands as published by later '
             || 'presidential action. This says nothing about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-30T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H. Executive Order 14159 — Protecting the American People Against Invasion
  -- ═══════════════════════════════════════════════════════════════════════════
  -- DELIBERATELY NOT MAPPED to immigration_reform. alignment-tool.js defines that
  -- issue as "Pathways to Citizenship" with a D lean, so an interior-enforcement
  -- order opposes it — but this president's card on that issue is recorded as
  -- SUPPORT while its text describes ending birthright citizenship, which is the
  -- opposite of the issue as defined. Writing the true opposing mapping here would
  -- have produced a contradiction against a stance whose polarity is mis-signed,
  -- which is manufacturing a result rather than measuring one. The mapping is left
  -- out and the stance is flagged for re-authoring instead.
  u := 'https://www.federalregister.gov/documents/2025/01/29/2025-02006/protecting-the-american-people-against-invasion';

  SELECT id INTO m_14159
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14159'
   LIMIT 1;

  IF m_14159 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14159',
       'Protecting the American People Against Invasion', 'Interior immigration enforcement',
       'Signed 2025-01-20 and published at 90 FR 8443 on 2025-01-29. Directs the '
       || 'Department of Homeland Security to prioritize removal of those present '
       || 'without authorization, to restore programs enlisting State and local '
       || 'officers in interior enforcement, and to expand detention capacity pending '
       || 'removal. Revokes Executive Orders 13993, 14010, 14011 and 14012.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14159","frCitation":"90 FR 8443","frDocumentNumber":"2025-02006"}'::jsonb)
    RETURNING id INTO m_14159;
    RAISE NOTICE 'created vr_measures Executive Order 14159 as id %', m_14159;
  END IF;

  IF m_14159 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14159, 'deportations', 100, true, 'yea_supports',
       'Directs the Department of Homeland Security to prioritize removal of those '
       || 'present without authorization, to restore programs enlisting State and local '
       || 'officers in interior enforcement, and to expand detention capacity pending '
       || 'removal.', u),
      (m_14159, 'border_security', 70, false, 'yea_supports',
       'Directs the enforcement machinery behind the border regime, including expanded '
       || 'detention and the use of expedited removal to the extent the statute '
       || 'allows.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14159, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14159 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14159 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-29T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14159 document record, 90 FR 8443',
             u,
             'Issued 2025-01-20 and published 2025-01-29. The register''s disposition '
             || 'record shows this order revoking Executive Orders 13993, 14010, 14011 '
             || 'and 14012, and carries cross-references to two later orders but no '
             || 'entry revoking or superseding this one, so it stands as published. This '
             || 'says nothing about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-29T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- I. Public Law 119-26 — S. 331, HALT Fentanyl Act (signed_law)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Resolved by natural key: 20260721170000_seed_legislation_expansion.sql seeded
  -- this bill for the congressional lane. The two issue weights below are read
  -- straight across from that migration so the lanes cannot disagree.
  u := 'https://www.congress.gov/bill/119th-congress/senate-bill/331';

  SELECT id INTO m_s331
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'senate' AND number = 'S. 331'
   LIMIT 1;

  IF m_s331 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s331, 'immig_fentanyl', 100, true, 'yea_supports',
       'Section 2 amends section 202(c) of the Controlled Substances Act to place '
       || 'fentanyl-related substances, including their salts and isomers, on schedule I '
       || 'as a class rather than one compound at a time.', u),
      (m_s331, 'tough_on_crime', 75, false, 'yea_supports',
       'Class scheduling brings the offences and penalties attached to schedule I to '
       || 'bear on a whole family of related substances.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_s331, 'trump', 'signed', true, TIMESTAMPTZ '2025-07-16T00:00:00Z', u,
       'Signed into law as Public Law 119-26 on 2025-07-16. Shared authorship: '
       || 'Congress wrote and passed the bill and the signature enacted it, so the '
       || 'per-issue directions carry the claim, not the signature alone.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_s331 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-16T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-26, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ26/html/PLAW-119publ26.htm',
             'Enacted and published as Public Law 119-26, approved July 16, 2025, at '
             || '139 Stat. 409. Nothing on file repeals or amends it. This states that '
             || 'the law exists and stands as published; it is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-16T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- J. Public Law 119-27 — S. 1582, GENIUS Act (signed_law)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The crypto_cbdc pair is NEW. 20260719210000 filed this bill under
  -- tech_innovation, crypto and econ_corp_account, a vocabulary chosen before
  -- crypto_cbdc existed as a key; crypto_cbdc is the key the president's own stated
  -- position is filed under, and therefore the only one that can test it. The three
  -- older rows are untouched.
  u := 'https://www.congress.gov/bill/119th-congress/senate-bill/1582';

  SELECT id INTO m_s1582
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'senate' AND number = 'S. 1582'
   LIMIT 1;

  IF m_s1582 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s1582, 'crypto_cbdc', 100, true, 'yea_supports',
       'Creates the federal regulatory regime for payment stablecoins — who may issue '
       || 'them, which federal banking agency supervises each class of issuer, and what '
       || 'reserve and disclosure obligations attach.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_s1582, 'trump', 'signed', true, TIMESTAMPTZ '2025-07-18T00:00:00Z', u,
       'Signed into law as Public Law 119-27 on 2025-07-18. Shared authorship: '
       || 'Congress wrote and passed the bill and the signature enacted it.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_s1582 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-18T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-27, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm',
             'Enacted and published as Public Law 119-27, approved July 18, 2025, at '
             || '139 Stat. 419. Nothing on file repeals or amends it. This states that '
             || 'the law exists and stands as published; it is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-18T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- K. Public Law 119-28 — H.R. 4, Rescissions Act of 2025 (signed_law)
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.congress.gov/bill/119th-congress/house-bill/4';

  SELECT id INTO m_hr4
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 4'
   LIMIT 1;

  IF m_hr4 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_hr4, 'cut_spending', 100, true, 'yea_supports',
       'Cancels unobligated balances of budget authority already appropriated, item by '
       || 'item, on the President''s own rescission request — foreign assistance and '
       || 'public-broadcasting accounts among them.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_hr4, 'trump', 'signed', true, TIMESTAMPTZ '2025-07-24T00:00:00Z', u,
       'Signed into law as Public Law 119-28 on 2025-07-24. Shared authorship, with '
       || 'the rescissions themselves originating in the special message the President '
       || 'transmitted on 2025-06-03 under section 1012 of the Congressional Budget and '
       || 'Impoundment Control Act of 1974.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_hr4 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-24T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-28, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ28/html/PLAW-119publ28.htm',
             'Enacted and published as Public Law 119-28, approved July 24, 2025, at '
             || '139 Stat. 467. Nothing on file repeals or amends it. This states that '
             || 'the law exists and stands as published; it is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-24T00:00:00Z');
    END IF;
  END IF;

END $$;
