-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 6: the first wave that exists to make the
--    record disagree with itself where the documents actually disagree
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql and
-- 20260828000000_seed_exec_actions_wave5.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 6 together and asserts that every citation, date and issue
-- key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Waves 3 through 5 densified the record, and the density made a defect visible
-- that thinness had been hiding. Before this migration, of the 32 issue keys in the
-- lane, 31 held mappings that all pointed the same way — only healthcare carried
-- documents in both directions — and 20 of the 21 issues the audit could test read
-- exactly 100. That is not a finding about a presidency. It is a finding about a
-- collection: the file contained the documents that agreed with the stated
-- positions because those are the documents a coverage-driven pass goes looking
-- for, and a percentage computed over a set assembled that way measures the
-- assembler.
--
-- The trade cluster was the worst of it. econ_trade, tariffs_china and
-- tariffs_growth held nothing but instruments that raise barriers; tariffs_prices,
-- whose chip states the PROTECTIVE position, held nothing but instruments that push
-- against it; cut_spending held the reconciliation law, the Rescissions Act and the
-- DOGE order and not one dollar of the spending the same President signed.
--
-- So this wave adds documents chosen for one property: that they can move an issue
-- off a one-direction reading. It adds no document merely because the document is
-- real and missing, and it declines several that are real, missing, and would only
-- have made an agreeing row agree harder.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Federal Register API document records, queried one document at a time for title,
-- signing date, publication date, citation, document number and disposition notes,
-- and then the full text read from the register's own raw-text URL:
--   EO 14360     signed 2025-11-14, published 2025-11-25, 90 FR 54091, doc 2025-21203
--   Proc. 11012  signed 2026-02-20, published 2026-02-25, 91 FR  9339, doc 2026-03824
--   Proc. 11038  signed 2026-06-29, published 2026-07-02, 91 FR 40855, doc 2026-13588
--
-- Disposition notes:
--   · EO 14360 carries three cross-references — back to EO 14257 of April 2, 2025 and
--     EO 14346 of September 5, 2025, whose annexes it updates, and forward to the
--     notice of March 24, 2026 (91 FR 15517). That notice was opened and read: it
--     continues the national emergency declared in EO 14257 and revokes nothing.
--   · Proclamations 11012 and 11038 carry no cross-references at all.
-- A cross-reference is not a repeal, and the in_force rows below claim only what the
-- register establishes.
--
-- For the law: GPO's PLAW-119publ37 package was downloaded and read. Public Law
-- 119-37, approved November 12, 2025, vehicle [H.R. 5371], 139 Stat. 495, short
-- title 'Continuing Appropriations, Agriculture, Legislative Branch, Military
-- Construction and Veterans Affairs, and Extensions Act, 2026'. Section 120 and
-- section 106(3) were read verbatim and are quoted below. The full listing of all
-- 102 public laws of the 119th Congress was enumerated from GPO bulkdata first, so
-- the spending vehicle here was chosen from the field rather than being the first
-- one found.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14389 IS STILL NOT AN ACTION, AND THAT WAS RE-EXAMINED HERE
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 5 filed Executive Order 14389, Ending Certain Tariff Actions, only as the
-- authority for a `superseded` standing on EO 14195. This pass re-read the order in
-- full to decide whether it should also carry issue mappings, and kept wave 5's
-- answer. The order ends the ad valorem duties imposed under the emergency statute
-- by NINE orders — 14193, 14194, 14195, 14245, 14257, 14323, 14329, 14380 and
-- 14382 — while section 1 preserves every underlying national emergency and every
-- non-duty action taken under them. It was signed on February 20, 2026, the day the
-- Supreme Court held in Learning Resources, Inc. v. Trump that the emergency statute
-- does not authorize tariffs at all, and the same day the President imposed a new
-- 10 percent surcharge under a different statute. Filing it as `opposes` on the
-- tariff issues would tell a reader that the President acted against his own stated
-- position. What the record shows is that a court removed the authority and the
-- program continued under another one. Axis B is where an outcome imposed on an
-- action belongs. Axis A is for what the figure chose — which is why the two
-- barrier-lowering documents that ARE filed here were chosen: nothing compelled
-- either of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ONE SAME-DIRECTION ROW IS HERE ON PURPOSE
-- ─────────────────────────────────────────────────────────────────────────────
-- Proclamation 11012 advances tariffs_growth and econ_trade, which were already
-- one-directional, and it is filed anyway. Omitting it would have let this wave
-- publish the opposite falsehood: with EO 14257 struck down, EO 14195 superseded and
-- two barrier-lowering documents newly on file, a reader would conclude the tariff
-- program ended in February 2026. It did not — the statutory vehicle changed and the
-- surcharge went on the same week. The weight this row adds to the consistent side
-- of the trade cluster is a real cost and it was accepted rather than hidden.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPINGS DELIBERATELY NOT WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLIC LAW 119-98, THE SECURE AMERICA ACT, IS NOT IN THIS MIGRATION, AND THE
-- REASON IS STRUCTURAL RATHER THAN EVIDENTIARY. GPO's PLAW-119publ98 package was
-- read end to end: two titles, seven appropriating sections, $69,545,000,000 out of
-- the Treasury, no rescission, offset or revenue provision anywhere in the text, and
-- the largest lines fund the hiring and permanent staffing of two federal agencies.
-- As executive-lane evidence against cut_spending that is strong, quotable and was
-- drafted ready to file. It is not filed because vr_measure_issues is keyed on
-- (measure_id, issue_key) and the two lanes SHARE it: S. 2 already exists in
-- vr_measures with four roll calls and hundreds of attributed member votes, written
-- by 20260821000000_vr_secure_america_act_rollcalls.sql, which declined cut_spending
-- and national_debt on that measure deliberately and in writing —
--   'Scoring the roll on a spending axis without the score would be an inference, and
--    it would read every yea as pro-spending and every nay as fiscally conservative
--    regardless of the reason either was given.'
-- Writing the executive mapping onto that row would silently re-score every one of
-- those members on an axis the roll-call pass refused. The executive-lane case is
-- genuinely stronger than the roll-call case — one signer, not five hundred voters —
-- but a shared row cannot hold two lanes' answers, and minting a second S. 2 measure
-- to dodge it would put a duplicate bill in the spine. Filing this honestly needs a
-- per-lane issue mapping, which is a schema change and not this wave's job.
--
-- tariffs_authority IS LEFT ONE-DIRECTIONAL, and this is the closest call in the
-- wave. Proclamation 11012 acts under section 122 of the Trade Act of 1974, which
-- caps the rate at 15 percent, caps the term at 150 days, and lets only an Act of
-- Congress extend it — so moving to it from an open-ended emergency claim moves
-- toward the congressional-role position that chip states. Rejected: the move was
-- made on the day the previous authority was held not to exist, and it kept the
-- decision, the rate and the scope entirely with the President. Filing a change of
-- statutory vehicle as deference to Congress would read intent the record does not
-- contain. The issue stays one-directional and the reason is recorded here rather
-- than papered over with an inferred row.
--
-- tariffs_china IS LEFT ONE-DIRECTIONAL. Neither barrier-lowering document is
-- country-specific and the surcharge is not either. Nothing read in this pass cuts
-- the other way on that key.
--
-- PL 119-74, PL 119-75 AND PL 119-86 — the three fiscal-year appropriations Acts —
-- were read and not filed. Their counter-directional content would have to be an
-- aggregate spending level characterized from thousands of pages, and characterizing
-- a total is not the same as quoting a provision. Section 120 of PL 119-37 does the
-- same work with text that can be quoted, which is why it was chosen over all three.
--
-- national_debt KEEPS ITS SINGLE ROW. An appropriation's deficit effect depends on
-- offsets and outlay timing that are in no enrolled text read here, and this lane
-- does not carry contested economic inference — the same rule that keeps EO 14257
-- off cost_living and the Rescissions Act off national_debt.
--
-- EO 14345, EO 14346, EO 14358 and Proclamation 10999 — the trade-agreement
-- implementation documents — were seen in the register listing and not pursued. Each
-- lowers rates pursuant to a negotiated arrangement, which is the tariff being used
-- as leverage rather than abandoned. Named here so the next pass knows they were seen.
--
-- EO 14360 IS NOT MAPPED TO econ_trade. That chip is about defending American
-- manufacturing, and the order's own stated ground for the carve-out is domestic
-- capacity to produce the goods. NOT mapped to cost_living either: that issue already
-- holds three same-direction documents and a fourth would add weight without adding a
-- test, which is the thing this wave exists to avoid.
--
-- Proclamation 11038 IS NOT MAPPED TO cost_living or family_support. It concerns an
-- agricultural input in a planting season; whether it reaches a household grocery
-- bill is a chain of inference the document does not make. NOT mapped to
-- tariffs_authority: section 318 of the Tariff Act of 1930 is a delegation Congress
-- enacted, so using it is no more evidence about Congress's role than the section 232
-- proclamations wave 5 kept off that issue for the same reason.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT SECTION F DOES TO AN EARLIER DECISION
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 5 refused to map Proclamation 11010 to any tariffs_* issue, and said why:
--   'filing it under a tariff issue would make the trade record read as though it
--    pointed both ways on the strength of one grocery measure.'
-- Section F adds that mapping. The refusal is not being overridden — its stated
-- condition is being met. Sections A and B put two further barrier-lowering documents
-- on file, so the direction no longer rests on one measure. Had those two documents
-- not existed, the refusal would have stood. It is still not mapped to econ_trade or
-- tariffs_growth: those chips name manufacturing and reshoring, and cattle ranching
-- is neither.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- FIRST `expired` STANDING IN THE LANE
-- ─────────────────────────────────────────────────────────────────────────────
-- db/exec-summary-keys.json has carried the `expired` token since Phase 1 with
-- nothing in it, so the record could not show the ordinary case of a time-limited
-- action running out. Section D files one, from the Act's own section 106(3).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE + IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Measure rows are guarded by an existence check on their natural identity
-- (vr_measures has no unique constraint, so ON CONFLICT is unavailable there).
-- Issue rows use vr_measure_issues_unique, position rows use vr_positions_unique on
-- (measure_id, politician_id, action_type), and status rows are guarded per
-- (position_id, status, effective_at). Nothing is updated and nothing is deleted:
-- there is no UPDATE, DELETE, DROP, ALTER or TRUNCATE statement in this file.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14360 integer;
  m_11038 integer;
  m_11012 integer;
  m_5371  integer;
  m_11010 integer;
  pos     integer;
  u       text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14360 — Modifying the Scope of the Reciprocal Tariffs With
  --    Respect to Certain Agricultural Products
  --
  --    Counter-directional #1, and the cleanest kind: the President narrowing his
  --    own signature tariff, four months before the Supreme Court reached the
  --    statute, with refunds of duties already collected. Nothing compelled it.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/11/25/2025-21203/modifying-the-scope-of-the-reciprocal-tariffs-with-respect-to-certain-agricultural-products';

  SELECT id INTO m_14360
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14360'
   LIMIT 1;

  IF m_14360 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14360',
       'Modifying the Scope of the Reciprocal Tariffs With Respect to Certain Agricultural Products',
       'Agricultural carve-out from the reciprocal tariff',
       'Signed 2025-11-14 and published at 90 FR 54091 on 2025-11-25. Determines that '
       || 'certain agricultural products shall not be subject to the reciprocal tariff '
       || 'imposed under Executive Order 14257, as amended, issues updated versions of '
       || 'that order''s Annex II and of the Annex to Executive Order 14346, modifies '
       || 'the Harmonized Tariff Schedule accordingly effective for goods entered on or '
       || 'after 12:01 a.m. eastern standard time on November 13, 2025 — a day before '
       || 'signature — and provides for refunds of duties already collected.',
       NULL, TIMESTAMPTZ '2025-11-14T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14360","frCitation":"90 FR 54091","frDocumentNumber":"2025-21203"}'::jsonb)
    RETURNING id INTO m_14360;
    RAISE NOTICE 'created vr_measures Executive Order 14360 as id %', m_14360;
  END IF;

  IF m_14360 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14360, 'tariffs_prices', 100, true, 'yea_supports',
       'Section 1 determines that certain agricultural products shall not be subject '
       || 'to the reciprocal tariff imposed under Executive Order 14257, as amended, '
       || 'and issues updated versions of that order''s Annex II; section 2 modifies '
       || 'the Harmonized Tariff Schedule accordingly effective for goods entered on '
       || 'or after 12:01 a.m. eastern standard time on November 13, 2025 — a day '
       || 'before signature — and provides that to the extent implementation requires '
       || 'a refund of duties collected, refunds shall be processed through U.S. '
       || 'Customs and Border Protection''s standard procedures.', u),
      (m_14360, 'tariffs_growth', 65, false, 'yea_opposes',
       'Removes a class of goods from the reciprocal tariff''s coverage, and gives as '
       || 'the grounds for doing so the President''s consideration of "current '
       || 'domestic demand for certain products, and current domestic capacity to '
       || 'produce certain products" alongside the status of negotiations — a '
       || 'narrowing of the instrument driven in part by domestic supply conditions '
       || 'rather than by anything a trading partner conceded.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14360, 'trump', 'issued', true, TIMESTAMPTZ '2025-11-14T00:00:00Z', u,
       'Signed Executive Order 14360 on 2025-11-14. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14360 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-11-25T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14360 document record, 90 FR 54091',
             u,
             'The register''s disposition record for this order carries three '
             || 'cross-references — back to Executive Order 14257 of April 2, 2025 and '
             || 'Executive Order 14346 of September 5, 2025, the orders whose annexes '
             || 'it updates, and forward to the notice of March 24, 2026 at 91 FR '
             || '15517, which continued the national emergency declared in Executive '
             || 'Order 14257 — and no entry revoking or superseding it, so it stands '
             || 'as published. Read the limit of that carefully: the duties this order '
             || 'carved products out of were themselves ended on February 20, 2026 by '
             || 'Executive Order 14389, and the order that imposed them was held '
             || 'unauthorized the same day. This row does not assert a standing beyond '
             || 'what the register shows, and it is not a statement about any '
             || 'challenge to this order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-11-25T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Proclamation 11038 — Declaration of Emergency and Authorization for
  --    Temporary Duty-Free Importation of Phosphate Fertilizer From Morocco
  --
  --    Counter-directional #2, and the strongest document in the file on this
  --    axis. Section A narrows a tariff the President imposed. This stands down the
  --    countervailing-duty machinery — the instrument a trade barrier is made of —
  --    against a foreign competitor, on the ground that United States production is
  --    insufficient.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/07/02/2026-13588/declaration-of-emergency-and-authorization-for-temporary-duty-free-importation-of-phosphate';

  SELECT id INTO m_11038
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11038'
   LIMIT 1;

  IF m_11038 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11038',
       'Declaration of Emergency and Authorization for Temporary Duty-Free Importation of Phosphate Fertilizer From Morocco',
       'Duty-free Moroccan phosphate fertilizer',
       'Signed 2026-06-29 and published at 91 FR 40855 on 2026-07-02. Declares an '
       || 'emergency under section 318 of the Tariff Act of 1930 (19 U.S.C. 1318(a)) '
       || 'with respect to threats to the availability of sufficient fertilizer '
       || 'supplies, and directs the Secretary of the Treasury and the Secretary of '
       || 'Commerce to permit importation of phosphate fertilizers of the Kingdom of '
       || 'Morocco free of the collection of duties and deposits of estimated duties '
       || 'under sections 1671, 1675 and 1677j of title 19, for up to eight months or '
       || 'until the emergency terminates.',
       NULL, TIMESTAMPTZ '2026-06-29T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11038","frCitation":"91 FR 40855","frDocumentNumber":"2026-13588"}'::jsonb)
    RETURNING id INTO m_11038;
    RAISE NOTICE 'created vr_measures Proclamation 11038 as id %', m_11038;
  END IF;

  IF m_11038 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11038, 'econ_trade', 85, true, 'yea_opposes',
       'Directs the Secretary of the Treasury and the Secretary of Commerce, under '
       || 'section 318 of the Tariff Act of 1930 (19 U.S.C. 1318(a)), to permit '
       || 'importation of phosphate fertilizers of the Kingdom of Morocco free of the '
       || 'collection of duties and of deposits of estimated duties under sections '
       || '1671, 1675 and 1677j of title 19 — the countervailing-duty provisions — '
       || 'for up to eight months or until the declared emergency terminates.', u),
      (m_11038, 'tariffs_growth', 70, false, 'yea_opposes',
       'Paragraph 4 states that United States production of phosphate fertilizer is '
       || 'insufficient to support domestic agricultural food production after '
       || 'accounting for exports, and that although the Federal Government is working '
       || 'with the private sector to expand domestic fertilizer manufacturing '
       || 'capacity, "those efforts will take time to increase the supply materially" '
       || '— so the interim answer chosen is duty-free foreign supply rather than the '
       || 'tariff.', u),
      (m_11038, 'tariffs_prices', 70, false, 'yea_supports',
       'Paragraph 3 gives as the reason for the action persistent threats to the '
       || 'global fertilizer supply chain "which create rapid price increases and '
       || 'procurement challenges", and paragraph 2 ties the timing to the spring '
       || 'and summer application window, when the year''s phosphate fertilizer goes '
       || 'onto the fields — relief from a duty, granted to keep an input cost '
       || 'down.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11038, 'trump', 'issued', true, TIMESTAMPTZ '2026-06-29T00:00:00Z', u,
       'Signed Proclamation 11038 on 2026-06-29. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11038 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-07-02T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11038 document record, 91 FR 40855',
             u,
             'The register''s disposition record for this proclamation carries no '
             || 'cross-references at all, so nothing has revoked, amended or '
             || 'superseded it and it stands as published. It is time-limited by its '
             || 'own paragraph (2), which runs the authorization until the earlier of '
             || 'eight months after June 29, 2026 or termination of the emergency it '
             || 'declares; that window had not closed when this row was written, and '
             || 'this row asserts nothing about what happens at its end. This is not a '
             || 'statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-07-02T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Proclamation 11012 — Imposing a Temporary Import Surcharge To Address
  --    Fundamental International Payments Problems
  --
  --    The same-direction row, filed on purpose. See the header: without it, the
  --    struck_down and superseded rows plus sections A and B would publish a tariff
  --    retreat that did not happen.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/02/25/2026-03824/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems';

  SELECT id INTO m_11012
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11012'
   LIMIT 1;

  IF m_11012 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('proclamation', NULL, 'executive', 'Proclamation 11012',
       'Imposing a Temporary Import Surcharge To Address Fundamental International Payments Problems',
       'Section 122 import surcharge',
       'Signed 2026-02-20 and published at 91 FR 9339 on 2026-02-25. Imposes an '
       || 'additional 10 percent ad valorem surcharge on articles imported into the '
       || 'United States, effective for goods entered on or after 12:01 a.m. eastern '
       || 'standard time on February 24, 2026, under section 122 of the Trade Act of '
       || '1974 (19 U.S.C. 2132), which permits a surcharge of up to 15 percent for up '
       || 'to 150 days. Paragraph 14 exempts critical minerals, bullion, energy, '
       || 'fertilizers, certain agricultural products, pharmaceuticals, certain '
       || 'electronics, vehicles, aerospace articles, goods already covered by section '
       || '232 actions, USMCA-qualifying duty-free Canadian and Mexican goods and '
       || 'CAFTA-DR textiles. Signed the same day as Executive Order 14389 and the '
       || 'Supreme Court''s decision in Learning Resources, Inc. v. Trump.',
       NULL, TIMESTAMPTZ '2026-02-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"proclamation":"11012","frCitation":"91 FR 9339","frDocumentNumber":"2026-03824"}'::jsonb)
    RETURNING id INTO m_11012;
    RAISE NOTICE 'created vr_measures Proclamation 11012 as id %', m_11012;
  END IF;

  IF m_11012 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11012, 'tariffs_growth', 90, true, 'yea_supports',
       'Imposes an additional 10 percent ad valorem surcharge on articles imported '
       || 'into the United States, effective for goods entered on or after 12:01 a.m. '
       || 'eastern standard time on February 24, 2026, under section 122 of the Trade '
       || 'Act of 1974 (19 U.S.C. 2132), which permits an import surcharge of up to 15 '
       || 'percent for up to 150 days to deal with large and serious United States '
       || 'balance-of-payments deficits.', u),
      (m_11012, 'econ_trade', 85, false, 'yea_supports',
       'Re-imposes broad-based import duties across nearly the whole tariff schedule '
       || 'on the day the previous, differently-authorized program ended, so the '
       || 'trade-barrier posture continues without interruption under a statute the '
       || 'President selected for that purpose.', u),
      (m_11012, 'tariffs_prices', 75, false, 'yea_opposes',
       'Applies a surcharge to nearly all imported articles. Paragraph 14 exempts a '
       || 'list of goods — critical minerals, bullion, energy, fertilizers, certain '
       || 'agricultural products, pharmaceuticals, certain electronics, vehicles, '
       || 'aerospace articles, goods already covered by section 232 actions, '
       || 'USMCA-qualifying duty-free Canadian and Mexican goods and CAFTA-DR textiles '
       || '— and those carve-outs are recorded here rather than filed as relief, '
       || 'because a broad surcharge with a list of exceptions raises import costs on '
       || 'net and the chip on this issue is about everyday costs not rising.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_11012, 'trump', 'issued', true, TIMESTAMPTZ '2026-02-20T00:00:00Z', u,
       'Signed Proclamation 11012 on 2026-02-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_11012 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-25T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Proclamation 11012 document record, 91 FR 9339',
             u,
             'The register''s disposition record for this proclamation carries no '
             || 'cross-references at all, so nothing on the register has revoked, '
             || 'amended or superseded it and it stands as published. It is '
             || 'time-limited on its own face: section 122 of the Trade Act of 1974 '
             || 'permits a surcharge for a period of no more than 150 days from '
             || 'February 24, 2026 unless that period is extended by Act of Congress. '
             || 'NO STANDING IS ASSERTED FOR WHAT HAPPENED AT THE END OF THAT PERIOD. '
             || 'Nothing on the register discloses it, and no public law of the 119th '
             || 'Congress read in this pass extends the surcharge — but the absence of '
             || 'an extension among the laws published so far is not a citable '
             || 'disposition, and this lane files no standing it cannot cite. This is '
             || 'not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-25T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Public Law 119-37 — H.R. 5371, Continuing Appropriations, Agriculture,
  --    Legislative Branch, Military Construction and Veterans Affairs, and
  --    Extensions Act, 2026 (signed_law)
  --
  --    Counter-directional #3, and the only one on the spending axis that could be
  --    filed. cut_spending held three documents and all three advanced it: the
  --    reconciliation law, the Rescissions Act and the DOGE cost-efficiency order.
  --    The issue read clean because the file held the cuts he signed and none of the
  --    spending he signed. Section 120 of this Act is a signed statutory prohibition
  --    on the workforce reductions his own executive order pursued, and — unlike an
  --    appropriations topline — it can be quoted rather than characterized.
  --
  --    ON THE MEASURE ROW: 20260823000000_vr_fiscal_enforcement_rollcalls.sql
  --    declined H.R. 5371's roll calls, so no bill row exists for it and this
  --    migration creates one. That decline was about MEMBER votes — 'cut_spending
  --    would read every nay as fiscally conservative, including the nays cast in
  --    order to spend more' — and it was right about a topline axis. The mapping
  --    written below is not a topline axis: it is anchored to section 120, whose
  --    direction does not depend on why a member disliked the spending level, and it
  --    is written yea_opposes. If a later pass adds this bill's roll calls, it
  --    inherits this row; that is intended and the reasoning is here to be checked.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.congress.gov/bill/119th-congress/house-bill/5371';

  SELECT id INTO m_5371
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 5371'
   LIMIT 1;

  IF m_5371 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 5371',
       'Continuing Appropriations, Agriculture, Legislative Branch, Military Construction and Veterans Affairs, and Extensions Act, 2026',
       'Continuing Appropriations and Extensions Act, 2026',
       'Enacted as Public Law 119-37 on 2025-11-12 at 139 Stat. 495, ending the autumn '
       || '2025 funding lapse. Division A makes continuing appropriations for fiscal '
       || 'year 2026 available until the first of the three events in section 106, the '
       || 'last of which is January 30, 2026; divisions B, C and D enact full-year '
       || 'Agriculture, Legislative Branch and Military Construction-VA appropriations; '
       || 'divisions E and F extend agricultural programs and health extenders. Section '
       || '120 bars the use of federal funds for reductions in force and voids those '
       || 'noticed between October 1, 2025 and enactment.',
       NULL, TIMESTAMPTZ '2025-11-12T00:00:00Z', NULL, 'enacted',
       u, 'Congress.gov',
       '{"publicLaw":"119-37","statute":"139 Stat. 495"}'::jsonb)
    RETURNING id INTO m_5371;
    RAISE NOTICE 'created vr_measures H.R. 5371 as id %', m_5371;
  END IF;

  IF m_5371 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_5371, 'cut_spending', 90, true, 'yea_opposes',
       'Section 120(a) provides that no federal funds may be used to initiate, carry '
       || 'out, implement or otherwise notice a reduction in force to reduce the '
       || 'number of employees within any department, agency or office of the Federal '
       || 'Government, and section 120(b) applies that to all civilian positions '
       || 'without regard to the source of their funding. Section 120(e) provides that '
       || 'any reduction in force taken by an Executive Agency between October 1, 2025 '
       || 'and enactment "shall have no force or effect", requires each notice to be '
       || 'rescinded, returns the employee to employment status as of September 30, '
       || '2025 without interruption, and directs back pay.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_5371, 'trump', 'signed', true, TIMESTAMPTZ '2025-11-12T00:00:00Z', u,
       'Signed into law as Public Law 119-37 on 2025-11-12. Shared authorship: the Act '
       || 'was written by Congress and the reduction-in-force provisions in section 120 '
       || 'run against the executive branch, so the signature is the formal act on file '
       || 'and not the authorship of the provision.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_5371 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-11-12T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 119-37, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ37/html/PLAW-119publ37.htm',
             'Enacted and published as Public Law 119-37, approved November 12, 2025, '
             || 'at 139 Stat. 495. This states that the law exists and stands as '
             || 'published; it is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-11-12T00:00:00Z');

      -- The lane's first `expired` standing, from the Act's own section 106(3).
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'expired', TIMESTAMPTZ '2026-01-30T00:00:00Z',
             'By the terms of the Act itself',
             'GovInfo — Public Law 119-37, section 106(3), enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-119publ37/html/PLAW-119publ37.htm',
             'Section 106 of division A provides that the appropriations, funds and '
             || 'authority granted by the Act are available until the first of three '
             || 'events, the last of which is the expiration date of January 30, 2026; '
             || 'section 120(a)''s prohibition on reductions in force runs "during the '
             || 'period between the date of enactment of this Act and the date '
             || 'specified in section 106(3)", so it lapsed on that date. Section '
             || '120(e) is different in kind and is not what expired: it voided the '
             || 'reductions in force already taken, rescinded the notices and directed '
             || 'back pay, and it had done so before the date above. This row is read '
             || 'from the Act''s own text and is not a statement about any challenge '
             || 'to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'expired'
                            AND effective_at = TIMESTAMPTZ '2026-01-30T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Proclamation 11010 — the mapping wave 5 declined to write
  --
  --    Measure, position and standing already exist from wave 5; only the new
  --    issue row is added here. See the header for why the earlier refusal is
  --    satisfied rather than overridden.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/02/13/2026-03050/ensuring-affordable-beef-for-the-american-consumer';

  SELECT id INTO m_11010
    FROM vr_measures
   WHERE measure_type = 'proclamation' AND chamber = 'executive'
     AND number = 'Proclamation 11010'
   LIMIT 1;

  IF m_11010 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_11010, 'tariffs_prices', 85, false, 'yea_supports',
       'Lowers a tariff barrier for the stated purpose of holding a consumer price '
       || 'down: the proclamation enlarges the in-quota quantity so that beef entering '
       || 'under the quota pays the low in-quota rate rather than the over-quota rate, '
       || 'on the President''s determination that domestic supply would otherwise be '
       || 'inadequate to meet domestic demand at reasonable prices.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

END $$;
