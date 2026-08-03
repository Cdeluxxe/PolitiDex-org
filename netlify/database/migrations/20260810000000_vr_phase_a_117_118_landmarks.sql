-- Phase A: 117th–118th Congress enacted landmarks — identity rows + issue slices.
--
-- WHY THIS MIGRATION EXISTS
--
-- The Official Record currently holds 128 measures in the 119th Congress, exactly one
-- in the 118th (H.R. 82, the Social Security Fairness Act) and none at all in the 117th.
-- The last-six-years window the product claims to cover is therefore, in the data, a
-- one-Congress window. Every prior mapping pass has worked inside the 119th because
-- applyCuratedIssueSeed() matches existing rows and never creates a measure — so a seed
-- entry for a 117th-Congress bill matches nothing and is a silent no-op. The only way to
-- extend the window backwards is a migration that creates the measure rows first.
--
-- This is Phase A of that work: the enacted landmarks, prioritised as
--   1. became-law measures
--   2. major packages (NDAA, reconciliation, supplementals, signature acts)
--   3. (deferred to a later phase) broader recorded votes
--
-- WHAT THIS MIGRATION DOES *NOT* DO
--
-- It moves the rankable-coverage numbers by exactly zero. There are no 117th- or
-- 118th-Congress member votes in vr_member_votes, so none of the 51 issue rows below can
-- be scored against anybody today. Stating that plainly up front, because the honest
-- value here is different in kind: identity, topic-tagging, sponsorship attribution via
-- vr_positions, and a mapping surface that is already correct on the day roll calls for
-- these congresses land. The same standard applied to H.Amdt. 87 in migration
-- 20260809000000 applies here — a sourced, true mapping earns its place in the record
-- whether or not it improves a delta this week.
--
-- PRIMARY SOURCES
--
-- Identity (public law number, display title, short title as enacted, official title as
-- introduced, sponsor, introduced date, policy area) and every summary quoted in a
-- rationale below come from GPO BILLSTATUS bulk data:
--   https://www.govinfo.gov/bulkdata/BILLSTATUS/117/{hr,s}/BILLSTATUS-117{hr,s}<num>.xml
--   https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr<num>.xml
-- Vote margins and party splits come from the House Clerk's electronic vote records:
--   https://clerk.house.gov/evs/<year>/roll<nnn>.xml
--
-- THE VEHICLE-REUSE PROBLEM
--
-- For most of these measures the "Official Title as Introduced" names a completely
-- different bill, because the enacted text was hung on an unrelated shell late in the
-- process. Taking the introduced title as the measure's identity would put nonsense in
-- the record. Observed here:
--   H.R. 4346 (CHIPS)      introduced as Legislative Branch appropriations for FY2022
--   S. 1605  (FY22 NDAA)   introduced as the National Pulse Memorial designation
--   S. 2938  (BSCA)        introduced as a Tallahassee courthouse naming
--   S. 3373  (PACT)        introduced as Iraq/Afghanistan Service Grant improvements
--   H.R. 7776 (FY23 NDAA)  introduced as rivers and harbors improvements
--   H.R. 5009 (FY25 NDAA)  introduced as wildlife habitat reauthorization
--   H.R. 815  (Nat. Sec.)  introduced as title 38 veterans reimbursement eligibility
-- Every row below therefore takes its title from "Display Title" or "Short Titles as
-- Enacted", and records which one in db/vr-measure-identity.json.
--
-- The PACT Act needed the same correction one step further back: H.R. 3967 is the bill
-- the Act is usually named for, but it has no <laws> entry and its last summary stops at
-- "Passed Senate @ 2022-06-16". The enacted vehicle is S. 3373 (P.L. 117-168), and that
-- is what this migration creates.
--
-- INVENTORY — 15 measures created and mapped, 51 issue rows
--
--   #   measure      public law   enacted      House vote (Clerk roll)        issue rows
--   --  -----------  -----------  -----------  -----------------------------  ----------
--    1  H.R. 1319    117-2        2021-03-11   220-211  roll 72/2021                   8
--    2  H.R. 3684    117-58       2021-11-15   228-206  roll 369/2021                  7
--    3  H.R. 4346    117-167      2022-08-09   243-187  roll 404/2022                  4
--    4  H.R. 5376    117-169      2022-08-16   220-207  roll 420/2022                  7
--    5  S. 2938      117-159      2022-06-25   234-193  roll 299/2022                  4
--    6  S. 3373      117-168      2022-08-10   342-88   roll 309/2022                  2
--    7  H.R. 8404    117-228      2022-12-13   258-169  roll 513/2022                  1
--    8  H.R. 3076    117-108      2022-04-06   342-92   roll 38/2022                   2
--    9  S. 1605      117-81       2021-12-27   363-70   roll 405/2021                  1
--   10  H.R. 7776    117-263      2022-12-23   (see note)                              1
--   11  H.R. 3746    118-5        2023-06-03   314-117  roll 243/2023                  4
--   12  H.R. 2670    118-31       2023-12-22   310-118  roll 723/2023                  1
--   13  H.R. 5009    118-159      2024-12-23   281-140  roll 500/2024                  2
--   14  H.R. 7888    118-49       2024-04-20   273-147  roll 120/2024                  2
--   15  H.R. 815     118-50       2024-04-24   none on the vehicle (see note)          5
--
-- Note on H.R. 7776: the only House recorded vote BILLSTATUS attaches to this vehicle is
-- roll 253/2022, which is the suspension vote on the *rivers and harbors* bill before the
-- NDAA text replaced it. The NDAA itself came back from conference as a Senate amendment.
-- The measure is created and mapped on its enacted content; no House roll is claimed.
--
-- Note on H.R. 815: BILLSTATUS records no House recorded vote on this vehicle at all. The
-- House did not vote the package as a package — it assembled it from separate votes on
-- four division-level amendments under a special rule, which the Clerk attributes to the
-- amendments rather than to H.R. 815. The only chamber-level vote on the whole thing is
-- Senate roll 154 (79-18, 2024-04-23). Division-level House votes are queued for the
-- phase that ingests roll calls; see the coverage notes.
--
-- WEIGHTS
--
-- House style, unchanged from prior passes: one primary at or near 100, secondaries
-- descending, both directions represented where a package genuinely cuts both ways.

-- ---------------------------------------------------------------------------
-- 1. H.R. 1319 — American Rescue Plan Act of 2021 (P.L. 117-2)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 1319';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 1319', 'American Rescue Plan Act of 2021', 'American Rescue Plan Act of 2021',
      'Provides additional relief to address the continued impact of COVID-19 on the economy, public health, state and local governments, individuals, and businesses. Includes direct payments, an expanded child tax credit, extended unemployment compensation, emergency rental and homeowner assistance, child care and Head Start funding, elementary and secondary school emergency relief, expanded Affordable Care Act premium tax credits, and the Restaurant Revitalization Fund.',
      '2021-02-24', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/1319', 'Congress.gov', '{"congressGovId":"hr1319-117","publicLaw":"117-2"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'family_support', 100, true, 'yea_supports', 'Title IX expands the child tax credit to $3,000 per child ($3,600 under age six), makes it fully refundable and advanceable, and provides the $1,400-per-person recovery rebates. Direct household support for families is the largest single line of the act.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'cost_living', 70, false, 'yea_supports', 'Recovery rebates, expanded earned income and child tax credits, and emergency rental and utility assistance are all directed at household costs during the pandemic.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'healthcare_costs', 60, false, 'yea_supports', 'Title IX subtitle F expands Affordable Care Act premium tax credits for 2021 and 2022, removing the 400%-of-poverty eligibility cliff and subsidising COBRA continuation coverage.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'national_debt', 55, false, 'yea_opposes', 'The act was enacted through budget reconciliation as unoffset emergency spending; a yea adds to the deficit rather than reducing it. Weighted below the primary because the fiscal effect is a consequence of the relief, not its stated purpose.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'child_care', 55, false, 'yea_supports', 'Title II provides child care stabilization funding, supplemental Child Care and Development Block Grant appropriations, and Head Start funding.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'public_schools', 50, false, 'yea_supports', 'Title II establishes the Elementary and Secondary School Emergency Relief Fund for reopening and learning-loss mitigation, the largest federal appropriation to K-12 schools in the period.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'econ_workers', 45, false, 'yea_supports', 'Title IX extends pandemic unemployment compensation programs and exempts a portion of 2020 unemployment benefits from income tax.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml'),
    (mid, 'econ_smallbiz', 40, false, 'yea_supports', 'Title V funds the Restaurant Revitalization Fund, additional Paycheck Protection Program and Economic Injury Disaster Loan support, and the Shuttered Venue Operators Grant program.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr1319.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 2. H.R. 3684 — Infrastructure Investment and Jobs Act (P.L. 117-58)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 3684';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 3684', 'Infrastructure Investment and Jobs Act', 'Infrastructure Investment and Jobs Act',
      'Authorises and appropriates funds for roads and bridges, rail, public transit, broadband deployment, ports and waterways, airports, drinking water and wastewater infrastructure, the electric grid, coastal resiliency, weatherization, clean school buses, electric vehicle charging, legacy pollution remediation, and Western water infrastructure.',
      '2021-06-04', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/3684', 'Congress.gov', '{"congressGovId":"hr3684-117","publicLaw":"117-58"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'infrastructure', 100, true, 'yea_supports', 'The act''s opening paragraph enumerates roads, bridges, ports, airports, the electric grid and water systems as its subject; surface transportation reauthorization is Division A.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'transit', 70, false, 'yea_supports', 'Division B reauthorizes federal public transportation programs and Division C funds passenger and freight rail, including the largest Amtrak investment since its creation.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'broadband', 65, false, 'yea_supports', 'Division F establishes the Broadband Equity, Access, and Deployment program and the Affordable Connectivity Program to extend service to unserved and underserved areas.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'water', 60, false, 'yea_supports', 'Division E funds drinking water and wastewater infrastructure, lead service line replacement, and Western water infrastructure including storage and drought resilience.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'disaster_resilience', 50, false, 'yea_supports', 'Division D and Division J fund coastal resiliency, wildfire risk reduction, and grid hardening against extreme weather.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'climate_action', 45, false, 'yea_supports', 'The act funds clean school buses, electric vehicle charging networks, weatherization, and legacy pollution remediation. Weighted as a secondary because these are components of an infrastructure package rather than its organising purpose.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml'),
    (mid, 'national_debt', 45, false, 'yea_opposes', 'The act''s new spending was only partially offset; a yea increases the deficit. Weighted low for the same reason as the climate slice — it is a consequence, not the stated purpose.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3684.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 3. H.R. 4346 — CHIPS and Science Act (P.L. 117-167)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 4346';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 4346', 'Chips and Science Act', 'CHIPS Act of 2022',
      'Provides funds to support the domestic production of semiconductors and authorises programs and activities of the federal science agencies. Division A establishes the CHIPS for America Fund, Defense Fund, International Technology Security and Innovation Fund, and Workforce and Education Fund, and expands federal financial assistance for semiconductor fabrication, assembly, testing and packaging. Division B authorises research and innovation programs across NSF, NIST, DOE and NASA.',
      '2021-07-01', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/4346', 'Congress.gov', '{"congressGovId":"hr4346-117","publicLaw":"117-167"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'tech_innovation', 100, true, 'yea_supports', 'Division A funds domestic semiconductor fabrication and Division B authorises the federal science agencies'' research and innovation programs. Semiconductor competitiveness is the act''s named subject.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr4346.xml'),
    (mid, 'econ_growth', 65, false, 'yea_supports', 'Sec. 103 expands financial assistance to incentivise investment in U.S. facilities and equipment for semiconductor production, including a dedicated program for mature technology nodes.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr4346.xml'),
    (mid, 'strong_defense', 45, false, 'yea_supports', 'Sec. 102 establishes the CHIPS for America Defense Fund for the National Network for Microelectronics Research and Development, and the International Technology Security and Innovation Fund for secure semiconductor supply chains.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr4346.xml'),
    (mid, 'national_debt', 45, false, 'yea_opposes', 'The act appropriates new unoffset funding for the CHIPS funds; a yea increases the deficit.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr4346.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 4. H.R. 5376 — Inflation Reduction Act of 2022 (P.L. 117-169)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 5376';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 5376', 'Inflation Reduction Act of 2022', 'Inflation Reduction Act of 2022',
      'Reconciliation act imposing a 15% corporate alternative minimum tax and a 1% excise tax on stock repurchases, funding the Internal Revenue Service, requiring Medicare to negotiate prescription drug prices, capping insulin and out-of-pocket costs, extending expanded Affordable Care Act premium tax credits through 2025, and providing clean energy tax credits alongside mandatory offshore oil and gas lease sales.',
      '2021-09-27', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/5376', 'Congress.gov', '{"congressGovId":"hr5376-117","publicLaw":"117-169"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'climate_action', 100, true, 'yea_supports', 'Subtitle D, Part 1 modifies and extends the production and investment tax credits for wind, solar, geothermal, biomass and hydropower, and the act''s energy security title is its largest spending component.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'health_drug_prices', 90, false, 'yea_supports', 'Sec. 11001 requires CMS to negotiate maximum prices for high-spend brand-name Medicare drugs beginning in 2026, scaling from 10 drugs to 20 by 2029. The act also caps insulin cost sharing and Medicare Part D out-of-pocket spending.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'healthcare_costs', 70, false, 'yea_supports', 'Sec. 12001 extends through 2025 the expanded premium tax credit, including eligibility for taxpayers above 400% of the federal poverty line.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'econ_corp_account', 60, false, 'yea_supports', 'Sec. 10101 imposes a 15% minimum tax on the adjusted financial statement income of corporations above $1 billion, and Sec. 10201 a 1% excise tax on publicly traded corporations'' stock buybacks.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'lower_taxes', 55, false, 'yea_opposes', 'The same two sections are, on their face, corporate tax increases. Mapping both directions is deliberate: a corporate minimum tax is simultaneously an accountability measure and a tax increase, and the record should show both rather than pick the flattering one.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'energy_production', 45, false, 'yea_supports', 'Part 6 raises offshore royalty rates but also directs Interior to accept the highest bid for Gulf of Mexico Lease Sale 257 and to hold Lease Sales 258, 259 and 261, and Sec. 50265 conditions new wind and solar rights-of-way on holding oil and gas lease sales.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml'),
    (mid, 'national_debt', 45, false, 'yea_supports', 'Title I, Subtitle A is captioned "Deficit Reduction" and contains the corporate minimum tax, the buyback excise tax and IRS enforcement funding. Weighted low because the act''s net fiscal effect is contested, but the subtitle heading and its contents are what the enacted text says.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr5376.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 5. S. 2938 — Bipartisan Safer Communities Act (P.L. 117-159)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'S. 2938';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'senate', 'S. 2938', 'Bipartisan Safer Communities Act', 'Bipartisan Safer Communities Act',
      'Division A, Title I funds children and family mental health services, extends the Certified Community Behavioral Health Clinic demonstration, issues guidance on Medicaid telehealth and school-based Medicaid services, and funds pediatric mental health care access grants. Title II enhances National Instant Criminal Background Check System reviews for purchasers aged 18 to 20, creates federal straw purchasing and firearms trafficking offenses, and extends the domestic violence prohibitor to dating partners.',
      '2021-10-05', 'enacted', 'https://www.congress.gov/bill/117th-congress/senate-bill/2938', 'Congress.gov', '{"congressGovId":"s2938-117","publicLaw":"117-159"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'gun_safety', 100, true, 'yea_supports', 'Title II requires enhanced background check review for purchasers under 21, creates federal straw purchasing and trafficking offenses, and closes the dating-partner gap in the domestic violence prohibitor.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s2938.xml'),
    (mid, 'health_mental', 70, false, 'yea_supports', 'Division A, Title I is a children and family mental health title: CCBHC demonstration extension, pediatric mental health care access grants, and Medicaid telehealth and school-based services guidance.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s2938.xml'),
    (mid, 'gun_rights', 60, false, 'yea_opposes', 'The same Title II provisions restrict firearms acquisition for 18-to-20-year-old purchasers and extend a possession prohibitor to a new class of persons; a yea narrows firearms access.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s2938.xml'),
    (mid, 'public_schools', 45, false, 'yea_supports', 'The act funds school safety programs and school-based mental health service capacity, including Medicaid guidance directed specifically at services delivered in schools.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s2938.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 6. S. 3373 — Honoring our PACT Act of 2022 (P.L. 117-168)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'S. 3373';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'senate', 'S. 3373', 'Sergeant First Class Heath Robinson Honoring our Promise to Address Comprehensive Toxics Act of 2022', 'Honoring our PACT Act of 2022',
      'Expands Department of Veterans Affairs health care eligibility and benefits for veterans exposed to toxic substances, establishes presumptions of service connection for conditions associated with burn pit and Agent Orange exposure, and directs improvements to VA toxic exposure screening, research and claims processing.',
      '2021-12-09', 'enacted', 'https://www.congress.gov/bill/117th-congress/senate-bill/3373', 'Congress.gov', '{"congressGovId":"s3373-117","publicLaw":"117-168"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'veterans', 100, true, 'yea_supports', 'The entire act expands VA eligibility, presumptions of service connection and benefits for toxic-exposed veterans. Named subject, no ambiguity.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s3373.xml'),
    (mid, 'healthcare', 50, false, 'yea_supports', 'The mechanism is an expansion of VA health care enrolment and treatment eligibility, not only cash benefits.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s3373.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 7. H.R. 8404 — Respect for Marriage Act (P.L. 117-228)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 8404';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 8404', 'Respect for Marriage Act', 'Respect for Marriage Act',
      'Repeals the Defense of Marriage Act provisions defining marriage as between one man and one woman and spouse as a person of the opposite sex, and requires states to give full faith and credit to out-of-state marriages regardless of the sex, race, ethnicity or national origin of the individuals. The act expressly provides that it does not affect religious liberties or conscience protections and does not require religious organizations to provide goods or services for the solemnization or celebration of a marriage.',
      '2022-07-18', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/8404', 'Congress.gov', '{"congressGovId":"hr8404-117","publicLaw":"117-228"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'lgbtq_rights', 100, true, 'yea_supports', 'The act repeals DOMA''s man/woman definitions and requires interstate recognition of same-sex marriages. Mapped as a single key deliberately: a religious_liberty contradiction row would be false, because the enacted text expressly states it does not affect religious liberties and does not require religious organizations to provide goods or services for a marriage.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr8404.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 8. H.R. 3076 — Postal Service Reform Act of 2022 (P.L. 117-108)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 3076';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 3076', 'Postal Service Reform Act of 2022', 'Postal Service Reform Act of 2022',
      'Establishes the Postal Service Health Benefits Program within the Federal Employees Health Benefits Program with Medicare coordination, repeals the requirement that the Postal Service annually prepay future retiree health benefits, authorises nonpostal service agreements with state and local governments, and requires a public performance dashboard for service standards.',
      '2021-05-11', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/3076', 'Congress.gov', '{"congressGovId":"hr3076-117","publicLaw":"117-108"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'gov_services', 100, true, 'yea_supports', 'The act''s purpose is to stabilise a universal public service: it removes the prepayment obligation that drove reported Postal Service losses, integrates postal retiree health coverage with Medicare, and requires six-day delivery.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3076.xml'),
    (mid, 'gov_transparency', 45, false, 'yea_supports', 'The act requires the Postal Service to publish an online public dashboard of service-performance data by delivery unit.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr3076.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 9. S. 1605 — National Defense Authorization Act for FY2022 (P.L. 117-81)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'S. 1605';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'senate', 'S. 1605', 'National Defense Authorization Act for Fiscal Year 2022', 'National Defense Authorization Act for Fiscal Year 2022',
      'Authorises appropriations and sets policy for Department of Defense programs and activities, military construction, Department of Energy national security programs, and intelligence activities for FY2022.',
      '2021-05-13', 'enacted', 'https://www.congress.gov/bill/117th-congress/senate-bill/1605', 'Congress.gov', '{"congressGovId":"s1605-117","publicLaw":"117-81"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'strong_defense', 100, true, 'yea_supports', 'Annual defense authorization: end strengths, procurement, military construction and DOE national security programs. No national_debt row, because the BILLSTATUS summary lists programs without a topline figure and asserting one would be unsourced — the same reason H.R. 3838 carries a debt slice (its summary cites a topline) and this one does not.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s1605.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 10. H.R. 7776 — James M. Inhofe NDAA for FY2023 (P.L. 117-263)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 117 AND number = 'H.R. 7776';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 117, 'house', 'H.R. 7776', 'James M. Inhofe National Defense Authorization Act for Fiscal Year 2023', 'James M. Inhofe National Defense Authorization Act for Fiscal Year 2023',
      'Authorises defense-related activities for FY2023. Division A establishes end strengths for the Armed Forces and authorises procurement, operation and maintenance, military personnel and other defense programs.',
      '2022-05-16', 'enacted', 'https://www.congress.gov/bill/117th-congress/house-bill/7776', 'Congress.gov', '{"congressGovId":"hr7776-117","publicLaw":"117-263"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'strong_defense', 100, true, 'yea_supports', 'Annual defense authorization. Mapped on the enacted content only; the sole House roll BILLSTATUS attaches to this vehicle (roll 253/2022) is the suspension vote on the rivers-and-harbors bill the NDAA text later replaced, so no House margin is claimed for it.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/hr/BILLSTATUS-117hr7776.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 11. H.R. 3746 — Fiscal Responsibility Act of 2023 (P.L. 118-5)
--
-- The headline fiscal keys are deliberately NOT mapped here. House roll 243/2023 passed
-- 314-117, and the Clerk's party split is Republican 149-71 and Democratic 165-46 — the
-- nays came from both flanks, for opposite reasons. Fiscal hawks voted no because the caps
-- were too loose; progressives voted no because of the work requirements and the pipeline
-- ratification. A national_debt or cut_spending row set to yea_supports would score the
-- most debt-focused members in the chamber as contradicting themselves, which is the
-- opposite of what their vote meant. The provision-level slices below are unambiguous, so
-- those are what the record gets. See db/vr-ingest-runbook.md for the rule this produced.
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 118 AND number = 'H.R. 3746';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 118, 'house', 'H.R. 3746', 'Fiscal Responsibility Act of 2023', 'Fiscal Responsibility Act of 2023',
      'Division A sets discretionary spending caps for FY2024 and FY2025 enforced by sequestration. Division B rescinds unobligated balances including Internal Revenue Service funding and terminates the suspension of student loan payments and interest accrual. Division C modifies Temporary Assistance for Needy Families work requirements, raises the Supplemental Nutrition Assistance Program able-bodied-adults-without-dependents age limit to 54 while exempting homeless individuals, veterans and former foster youth, and enacts permitting reform limiting the scope of National Environmental Policy Act administrative review, with Sec. 324 ratifying all Mountain Valley Pipeline authorizations and exempting them from judicial review. Division D suspends the debt limit through January 1, 2025.',
      '2023-05-29', 'enacted', 'https://www.congress.gov/bill/118th-congress/house-bill/3746', 'Congress.gov', '{"congressGovId":"hr3746-118","publicLaw":"118-5"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'gov_regulation', 70, true, 'yea_supports', 'Division C, Title III is a permitting-reform title: it narrows the scope of National Environmental Policy Act administrative review, sets page and time limits on environmental reviews, and designates a lead agency. A yea reduces the regulatory review burden.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr3746.xml'),
    (mid, 'energy_production', 60, false, 'yea_supports', 'Sec. 324 ratifies every existing federal authorization for the Mountain Valley Pipeline, directs the issuance of any remaining ones, and removes them from judicial review.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr3746.xml'),
    (mid, 'gov_services', 50, false, 'yea_opposes', 'Division C tightens Temporary Assistance for Needy Families work requirements and raises the SNAP able-bodied-adults-without-dependents work-requirement age to 54 while reducing the discretionary exemption pool from 12% to 8%. A yea narrows safety-net eligibility, notwithstanding the new exemptions for homeless individuals, veterans and former foster youth.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr3746.xml'),
    (mid, 'edu_college_cost', 50, false, 'yea_opposes', 'Division B terminates the suspension of federal student loan payments and resumes interest accrual, and bars the Secretary from extending it further absent new statutory authority.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr3746.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 12. H.R. 2670 — National Defense Authorization Act for FY2024 (P.L. 118-31)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 118 AND number = 'H.R. 2670';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 118, 'house', 'H.R. 2670', 'National Defense Authorization Act for Fiscal Year 2024', 'National Defense Authorization Act for Fiscal Year 2024',
      'Authorises appropriations and sets policy for Department of Defense procurement, research and development, operation and maintenance, military personnel, military construction, and Department of Energy national security programs for FY2024.',
      '2023-04-18', 'enacted', 'https://www.congress.gov/bill/118th-congress/house-bill/2670', 'Congress.gov', '{"congressGovId":"hr2670-118","publicLaw":"118-31"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'strong_defense', 100, true, 'yea_supports', 'Annual defense authorization. Mapped to a single key: the enacted summary contains no Foreign Intelligence Surveillance Act section 702 provision (a search of the Public Law summary returns zero hits), so no privacy_rights slice is asserted.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr2670.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 13. H.R. 5009 — Servicemember Quality of Life Improvement and NDAA for FY2025
--     (P.L. 118-159)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 118 AND number = 'H.R. 5009';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 118, 'house', 'H.R. 5009', 'Servicemember Quality of Life Improvement and National Defense Authorization Act for Fiscal Year 2025', 'Servicemember Quality of Life Improvement and National Defense Authorization Act for Fiscal Year 2025',
      'Authorises FY2025 appropriations and sets policy for Department of Defense programs, military construction, Department of Energy national security programs, the Maritime Administration and intelligence activities, with a servicemember quality-of-life title covering pay, housing, health care and family support. Sec. 708 prohibits TRICARE coverage of medical interventions for the treatment of gender dysphoria that could result in sterilization for a child under 18.',
      '2023-07-27', 'enacted', 'https://www.congress.gov/bill/118th-congress/house-bill/5009', 'Congress.gov', '{"congressGovId":"hr5009-118","publicLaw":"118-159"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'strong_defense', 100, true, 'yea_supports', 'Annual defense authorization with an added servicemember quality-of-life title covering pay, housing and family support.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr5009.xml'),
    (mid, 'lgbtq_rights', 65, false, 'yea_opposes', 'Sec. 708 bars TRICARE from covering treatment for gender dysphoria that could result in sterilization for dependents under 18. This is the provision behind the vote''s party inversion — Clerk roll 500/2024 split Republican 200-16 in favour and Democratic 81-124 against, the only NDAA in this window a majority of one party opposed.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr5009.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 14. H.R. 7888 — Reforming Intelligence and Securing America Act (P.L. 118-49)
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 118 AND number = 'H.R. 7888';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 118, 'house', 'H.R. 7888', 'Reforming Intelligence and Securing America Act', 'Reforming Intelligence and Securing America Act',
      'Reauthorises title VII of the Foreign Intelligence Surveillance Act, including section 702, for two years and expands the definition of electronic communications service provider. Also repeals authority for "abouts" collection, requires Federal Bureau of Investigation supervisory and attorney approval for U.S.-person queries, bars political appointees from approving sensitive queries, adds criminal and administrative penalties for query misuse, requires 180-day Department of Justice audits, and establishes a commission on FISA reform.',
      '2024-04-09', 'enacted', 'https://www.congress.gov/bill/118th-congress/house-bill/7888', 'Congress.gov', '{"congressGovId":"hr7888-118","publicLaw":"118-49"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'privacy_rights', 85, true, 'yea_opposes', 'The act extends warrantless section 702 collection for two years and broadens the electronic communications service provider definition. Held at 85 rather than 100 because the same act repeals "abouts" collection authority, imposes supervisory and attorney approval for U.S.-person queries, bars political appointees from sensitive-query approval, adds penalties and requires 180-day audits — the direction is a net extension of surveillance authority, but calling it unmixed would misstate the text.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr7888.xml'),
    (mid, 'strong_defense', 65, false, 'yea_supports', 'The act preserves a foreign intelligence collection authority the intelligence community identifies as a core counterterrorism and counterintelligence tool; a yea sustains it.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr7888.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 15. H.R. 815 — National security supplemental appropriations (P.L. 118-50)
--
-- Mapped at measure level from the five division short titles, which are the most
-- specific sourceable statement of what a vote on the package meant. The caveat is
-- recorded above and repeated here: there is no House vote on this vehicle to attach
-- these rows to. The Senate agreed to the House amendment 79-18 (roll 154, 2024-04-23),
-- and that is the only chamber-level vote on the assembled package.
-- ---------------------------------------------------------------------------
DO $$
DECLARE mid integer;
BEGIN
  SELECT id INTO mid FROM vr_measures WHERE congress = 118 AND number = 'H.R. 815';
  IF mid IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)
    VALUES ('bill', 118, 'house', 'H.R. 815', 'Making emergency supplemental appropriations for the fiscal year ending September 30, 2024, and for other purposes.', NULL,
      'Emergency supplemental appropriations in five divisions: Division A, Israel Security Supplemental Appropriations Act, 2024; Division B, Ukraine Security Supplemental Appropriations Act, 2024; Division C, Indo-Pacific Security Supplemental Appropriations Act, 2024; Division D, 21st Century Peace through Strength Act, including the Protecting Americans from Foreign Adversary Controlled Applications Act divest-or-ban requirement and Iran-related sanctions; and Division E, Fentanyl Eradication and Narcotics Deterrence Off Fentanyl Act, imposing sanctions and anti-money-laundering measures on fentanyl trafficking organizations.',
      '2023-02-02', 'enacted', 'https://www.congress.gov/bill/118th-congress/house-bill/815', 'Congress.gov', '{"congressGovId":"hr815-118","publicLaw":"118-50"}'::jsonb)
    RETURNING id INTO mid;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (mid, 'foreign_balance', 100, true, 'yea_supports', 'Divisions A, B and C are security assistance appropriations for Israel, Ukraine and the Indo-Pacific respectively. A yea funds alliance commitments across three theatres.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr815.xml'),
    (mid, 'america_first_fp', 70, false, 'yea_opposes', 'The package is the largest single foreign-aid appropriation of the 118th Congress, and Division B is Ukraine security assistance specifically. A yea is a vote against the position that resources should be redirected from foreign aid to domestic priorities.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr815.xml'),
    (mid, 'restraint', 65, false, 'yea_opposes', 'The same three security-assistance divisions deepen U.S. involvement in two active conflicts and one deterrence posture; a yea is a vote against military restraint.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr815.xml'),
    (mid, 'tech_balance', 50, false, 'yea_supports', 'Division D carries the Protecting Americans from Foreign Adversary Controlled Applications Act, requiring divestiture of foreign-adversary-controlled applications or prohibiting their distribution in the United States.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr815.xml'),
    (mid, 'immig_fentanyl', 45, false, 'yea_supports', 'Division E is the Fentanyl Eradication and Narcotics Deterrence Off Fentanyl Act: sanctions in response to the national emergency relating to fentanyl trafficking, plus anti-money-laundering measures against the transnational organizations involved.', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr815.xml')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- DELIBERATE EXCLUSIONS — enacted 117th/118th measures examined and not mapped here
-- ---------------------------------------------------------------------------
--
-- (a) The four appropriations omnibuses. Queued for Phase B, not declined on merit.
--       H.R. 2471  Consolidated Appropriations Act, 2022        P.L. 117-103
--       H.R. 2617  Consolidated Appropriations Act, 2023        P.L. 117-328
--       H.R. 4366  Consolidated Appropriations Act, 2024        P.L. 118-42
--       H.R. 2882  Further Consolidated Appropriations Act, 2024 P.L. 118-47
--     Each bundles twelve appropriations divisions with a long tail of authorizing
--     divisions — the 2023 act alone carries the Electoral Count Reform Act, the Pregnant
--     Workers Fairness Act, the PUMP Act and SECURE 2.0, and its Public Law summary runs
--     to 611,000 characters. Slicing these honestly means a division-by-division read, and
--     mapping them from the bills' reputations instead would be exactly the failure the
--     truncated-purpose rule exists to prevent. H.R. 1968, the 119th full-year continuing
--     resolution, was mapped to four keys because its summary is short enough to read
--     whole; that precedent supports slicing these, not skipping them, once the reading is
--     done.
--
--     Worth recording for that pass: the House did not vote CAA 2022 as one measure
--     either. Clerk rolls 65 and 66 of 2022 are separate votes on separate groups of
--     divisions, the same structure as H.R. 815. Division-level mapping is the right shape
--     for both.
--
-- (b) H.R. 3935, FAA Reauthorization Act of 2024 (P.L. 118-63). Declined on vocabulary,
--     not on margin — House roll 364/2023 passed 351-69, which clears the near-unanimity
--     threshold comfortably. The act is aviation programs: air traffic controller staffing,
--     certification, airport improvement, consumer protections. No ISSUE_MAP key expresses
--     aviation policy, and the nearest candidate, infrastructure, would attach a 269,000-
--     character programs bill to a key whose keywords are roads, bridges, grid and water
--     systems. Same reasoning as the S. 2503 ROTOR Act decline.
--
-- (c) H.R. 3967, Honoring our PACT Act. Not the enacted vehicle — see the note above. Its
--     BILLSTATUS has no <laws> entry and its last summary is "Passed Senate @ 2022-06-16".
--     S. 3373 carries the enacted text and is what this migration creates.
--
-- (d) H.R. 82, Social Security Fairness Act (P.L. 118-273). Already present and mapped;
--     it is the one 118th-Congress row that predates this migration.
--
-- COVERAGE EFFECT — measured against live before this migration runs
--
--   vr_measures rows                        142 → 157   (+15)
--   vr_measures rows in the 117th             0 →  10   (+10; the first ever)
--   vr_measures rows in the 118th             1 →   6   (+5)
--   vr_measure_issues rows                  267 → 318   (+51)
--   vr_measure_issues rows in 117th/118th     3 →  54   (+51)
--   measures carrying at least one mapping  102 → 117   (+15)
--   curated rows in db/vr-issue-seed.json    84 → 135   (+51)
--
--   recorded yea/nay on a mapped measure  4,209 → 4,209   (+0)
--   rankable member-votes                 2,286 → 2,286   (+0)
--   rankable (member, issue) pairs          666 →   666   (+0)
--   people with at least one rankable record  182 → 182   (+0)
--
-- The zeros are the point of the paragraph at the top of this file, not an oversight.
-- The only pre-existing 117th/118th mappings are H.R. 82's three rows.

-- ---------------------------------------------------------------------------
-- Read-only sanity report
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_117 integer; n_118 integer; n_rows integer; n_missing integer;
BEGIN
  SELECT count(*) INTO n_117 FROM vr_measures WHERE congress = 117;
  SELECT count(*) INTO n_118 FROM vr_measures WHERE congress = 118;
  SELECT count(*) INTO n_rows
    FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id
    WHERE m.congress IN (117, 118);
  SELECT count(*) INTO n_missing
    FROM (VALUES ('H.R. 1319'),('H.R. 3684'),('H.R. 4346'),('H.R. 5376'),('S. 2938'),
                 ('S. 3373'),('H.R. 8404'),('H.R. 3076'),('S. 1605'),('H.R. 7776'),
                 ('H.R. 3746'),('H.R. 2670'),('H.R. 5009'),('H.R. 7888'),('H.R. 815')) AS t(num)
    WHERE NOT EXISTS (SELECT 1 FROM vr_measures m WHERE m.number = t.num AND m.congress IN (117, 118));

  RAISE NOTICE 'Phase A: % measures in the 117th, % in the 118th, % issue rows across both', n_117, n_118, n_rows;
  IF n_missing > 0 THEN
    RAISE EXCEPTION 'Phase A: % expected measure(s) missing after migration', n_missing;
  END IF;
END $$;
