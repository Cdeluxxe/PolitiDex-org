-- ─────────────────────────────────────────────────────────────────────────────
-- Current bills, full lens — the anchor H.R. 8352 and the October 2026 sweep
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 9 vr_measures rows and 17 vr_measure_issues rows:
--   · H.R. 8352 (119th), the Criminal History Access Act of 2026 — passed both
--     chambers (Senate by unanimous consent, 2026-09-30), awaiting presentment,
--     so its status is passed_senate.
--   · The six public laws signed in October 2026, per GovInfo BILLSTATUS:
--     H.R. 5345 (119-119), S. 766 (119-120), S. 195 (119-121), S. 240 (119-122),
--     S. 283 (119-123), S. 2403 (119-124).
--   · Utah 2026GS H.B. 76 (Data Center Water Transparency Amendments) and H.B. 507
--     (State Coordination of Regional and Local Economic Development Projects
--     Amendments), both signed. They are the only 2026GS data-center bills with
--     enrolled text; H.B. 585, S.B. 282 and S.B. 318 were filed and never passed.
--
-- FULL LENS. Every issue a measure's enrolled text touches gets its own row,
-- secondary rows beside the primary, each with its weight and polarity; exactly
-- one row per measure carries is_primary for surfacing. S. 283, S. 195 and S. 2403
-- get no issue row because no key in the vocabulary fits their text, and
-- db/vr-current-bills.json says why for each. Every row's rationale quotes the
-- enrolled text; the ledger pins each to verbatim quotes and to the issue's words.
--
-- WHAT IT DOES NOT DO. No roll call, member vote or position (presidential or
-- gubernatorial) is created, so no member's file, score or Direction Match moves.
-- S. 2403's House roll call 119/2/314 exists and is not seeded here. No existing
-- row is touched; no weight, polarity or primary flag on any other measure moves.
--
-- Idempotent: each block selects its measure first and creates it only when
-- missing, and every mapping is guarded by NOT EXISTS.
--
-- pack-generation: derived — up to 17 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.

-- H.R. 8352 · 119th · Criminal History Access Act of 2026 — justice_balance, privacy_rights
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 8352'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'house', 'H.R. 8352', 'Criminal History Access Act of 2026',
      'Criminal History Access Act of 2026', 'Amends 28 U.S.C. 534 so the Attorney General exchanges criminal history records with state peace officer standards and training agencies — state agencies that set standards for hiring, training, ethical conduct and retention of law enforcement officers — and directs the Attorney General to amend 28 CFR part 20 within 180 days. Passed both chambers (Senate by unanimous consent on 2026-09-30); awaiting presentment.', 'passed_senate',
      'https://www.congress.gov/bill/119th-congress/house-bill/8352', 'Congress.gov',
      jsonb_build_object('billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr8352.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119hr8352enr/html/BILLS-119hr8352enr.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'justice_balance') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'justice_balance', 100, true,
      'yea_supports', 'The act adds state peace officer standards and training agencies — agencies with authority "to set standards for the hiring, training, ethical conduct, and retention of the law enforcement officers of the State" — to those the FBI exchanges criminal history records with, so the agencies that certify officers can check the records behind those standards. Training and accountability for officers is this key''s own pairing.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr8352enr/html/BILLS-119hr8352enr.htm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'privacy_rights') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'privacy_rights', 40, false,
      'yea_opposes', 'The same clause widens the set of agencies the federal government transfers criminal history records to — a government''s transfer of records about a person, which is inside this key''s scope — so a yea widens that sharing rather than narrowing it.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr8352enr/html/BILLS-119hr8352enr.htm');
  END IF;
END $$;

-- S. 240 · 119th · Crow Tribe Water Rights Settlement Amendments Act of 2025 — water_storage, infrastructure, enviro_energy
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 240'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 240', 'Crow Tribe Water Rights Settlement Amendments Act of 2025',
      'Crow Tribe Water Rights Settlement Amendments Act of 2025', 'Amends the Crow Tribe Water Rights Settlement Act of 2010: repeals the MR&I System section, creates an MR&I Projects Account the Tribe must use first for water production, treatment or delivery infrastructure, keeps title to those projects in the Tribe with no federal operation and maintenance obligation, and extends from 15 to 20 years the deadline in section 412(b)(1) for the Tribe’s exclusive right to develop power at Yellowtail Afterbay Dam. Public Law 119-122, signed 2026-10-15.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/senate-bill/240', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-122', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s240.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s240enr/html/BILLS-119s240enr.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water_storage') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water_storage', 100, true,
      'yea_supports', 'The new MR&I Projects Account must be used first "to plan, permit, design, engineer, construct, reconstruct, replace, rehabilitate, operate, or repair water production, treatment, or delivery infrastructure" — building the supply side of water, which is this key.', 'https://www.govinfo.gov/content/pkg/BILLS-119s240enr/html/BILLS-119s240enr.htm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'infrastructure') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'infrastructure', 50, false,
      'yea_supports', 'The same account funds water production, treatment, delivery and wastewater infrastructure, which this key names as "water systems".', 'https://www.govinfo.gov/content/pkg/BILLS-119s240enr/html/BILLS-119s240enr.htm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'enviro_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'enviro_energy', 35, false,
      'yea_supports', 'Section 412(b)(1) gives the Tribe "the exclusive right to develop and market power generation on the Yellowtail Afterbay Dam", lost if construction is not substantially complete within the period; the act lengthens that period from 15 to 20 years, keeping a hydropower project open.', 'https://www.govinfo.gov/content/pkg/BILLS-119s240enr/html/BILLS-119s240enr.htm');
  END IF;
END $$;

-- S. 766 · 119th · Billion Dollar Boondoggle Act of 2025 — gov_waste, audit_spending
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 766'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 766', 'Billion Dollar Boondoggle Act of 2025',
      'Billion Dollar Boondoggle Act of 2025', 'Requires the OMB Director to issue guidance under which executive and independent regulatory agencies report each year on every project more than 5 years behind schedule or at least $1 billion over its original cost estimate (projects funded through direct spending excluded), and to submit and post an annual report. Public Law 119-120, signed 2026-10-07.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/senate-bill/766', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-120', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s766.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s766enr/html/BILLS-119s766enr.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_waste') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_waste', 100, true,
      'yea_supports', 'The act requires an annual public report of "taxpayer-funded projects that are over budget and behind schedule" — cost overruns and delays named project by project, with the explanation for each — which is the waste-and-accountability work this key describes.', 'https://www.govinfo.gov/content/pkg/BILLS-119s766enr/html/BILLS-119s766enr.htm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'audit_spending') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'audit_spending', 60, false,
      'yea_supports', 'Each covered agency must submit, every year, the original and current cost estimate, the federal share, each contractor and grant recipient, and the amount of and rationale for any award or bonus on the project — an audit of agency spending by project.', 'https://www.govinfo.gov/content/pkg/BILLS-119s766enr/html/BILLS-119s766enr.htm');
  END IF;
END $$;

-- H.R. 5345 · 119th · Improving Social Security’s Service to Victims of Identity Theft Act — social_security, gov_services
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 5345'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'house', 'H.R. 5345', 'Improving Social Security’s Service to Victims of Identity Theft Act',
      'Improving Social Security’s Service to Victims of Identity Theft Act', 'Adds section 714 to the Social Security Act: the Commissioner must give any individual whose Social Security number has been misused, or whose card was lost in transmission, a single point of contact — a team of specially trained employees accountable for the case until it is resolved. Takes effect 180 days after enactment. Public Law 119-119, signed 2026-10-07.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/house-bill/5345', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-119', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr5345.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119hr5345enr/html/BILLS-119hr5345enr.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'social_security') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'social_security', 100, true,
      'yea_supports', 'The act changes how the Social Security Administration handles beneficiaries and card holders whose numbers were misused, including "to fraudulently obtain benefits": one accountable contact until the case is resolved. It protects the program''s beneficiaries and their records, which is this key.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr5345enr/html/BILLS-119hr5345enr.htm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_services') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_services', 50, false,
      'yea_supports', 'The single point of contact is a public service the Social Security Administration must now provide to identity-theft victims.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr5345enr/html/BILLS-119hr5345enr.htm');
  END IF;
END $$;

-- S. 283 · 119th · Illegal Red Snapper and Tuna Enforcement Act — no issue row (see db/vr-current-bills.json)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 283'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 283', 'Illegal Red Snapper and Tuna Enforcement Act',
      'Illegal Red Snapper and Tuna Enforcement Act', 'Directs NIST and NOAA, consulting CBP and the Coast Guard, to develop a chemical-analysis method and portable field kit for identifying the country of origin of seafood to support enforcement against illegal, unreported and unregulated fishing and seafood fraud, with pilot studies on red snapper and tuna and a report within 2 years. Public Law 119-123, signed 2026-10-15.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/senate-bill/283', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-123', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s283.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s283enr/html/BILLS-119s283enr.htm'))
    RETURNING id INTO m_id;
  END IF;
END $$;

-- S. 195 · 119th · American Music Tourism Act of 2025 — no issue row (see db/vr-current-bills.json)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 195'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 195', 'American Music Tourism Act of 2025',
      'American Music Tourism Act of 2025', 'Adds music tourism to the Assistant Secretary of Commerce for Travel and Tourism’s duties to promote domestic and international travel, rewrites the international travel facilitation subsection, defines music tourism, and adds a biennial report. Public Law 119-121, signed 2026-10-09.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/senate-bill/195', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-121', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s195.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s195enr/html/BILLS-119s195enr.htm'))
    RETURNING id INTO m_id;
  END IF;
END $$;

-- S. 2403 · 119th · Retire through Ownership Act — no issue row (see db/vr-current-bills.json)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 2403'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 2403', 'Retire through Ownership Act',
      'Retire through Ownership Act', 'Amends ERISA section 3(18) so a fiduciary of an employee ownership plan may rely in good faith on an independent appraiser’s valuation that follows IRS Revenue Ruling 59-60 when determining the fair market value of closely held shares, without expanding the Labor Secretary’s authority or modifying fiduciary duties under section 404. Public Law 119-124, signed 2026-10-15.', 'enacted',
      'https://www.congress.gov/bill/119th-congress/senate-bill/2403', 'Congress.gov',
      jsonb_build_object('publicLaw', '119-124', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s2403.xml', 'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s2403enr/html/BILLS-119s2403enr.htm'))
    RETURNING id INTO m_id;
  END IF;
END $$;

-- H.B. 76 · 2026GS · Data Center Water Transparency Amendments — datacenter_water, water
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 76' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2026GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 76', 'Data Center Water Transparency Amendments',
      'Data Center Water Transparency Amendments', 'This bill addresses reporting related to water use and large data centers.', 'enacted',
      'https://le.utah.gov/~2026/bills/static/HB0076.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2026GS', 'utahBill', 'HB0076',
        'primeSponsor', 'Rep. Koford, Jill', 'floorSponsor', 'Sen. Sandall, Scott D.',
        'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0076.xml'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'datacenter_water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'datacenter_water', 100, true,
      'yea_supports', 'Enacted 73-5-8.3 makes the operator of a new large data center (annual water withdrawal of 75 acre feet or more) report its estimated withdrawals before construction and its actual withdrawals every year, and the Division of Water Rights must publish each center''s withdrawal data, "and not in the aggregate", with a fine of up to $100 a day for a missing report. Requiring data centers to account for the water they draw is this key''s protective position.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0076.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'water') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'water', 60, false,
      'yea_supports', 'Before construction, the operator must tell the water provider the new center''s "anticipated water consumption needs" so the provider can judge whether that consumption "is compatible with the location" — measuring water demand at the point of siting, which is inside this key''s demand-side scope.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0076.xml');
  END IF;
END $$;

-- H.B. 507 · 2026GS · State Coordination of Regional and Local Economic Development Projects Amendments — dev_district_finance, datacenter_growth, datacenter_power, gov_transparency, enviro_energy, lower_taxes
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 507' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2026GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 507', 'State Coordination of Regional and Local Economic Development Projects Amendments',
      'State Coordination of Regional and Local Economic Development Projects Amendments', 'This bill addresses local and regional economic development projects and related provisions.', 'enacted',
      'https://le.utah.gov/~2026/bills/static/HB0507.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2026GS', 'utahBill', 'HB0507',
        'primeSponsor', 'Rep. Roberts, Calvin', 'floorSponsor', 'Sen. Cullimore, Kirk A.',
        'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'dev_district_finance') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'dev_district_finance', 90, true,
      'yea_supports', 'The larger operative change creates a new capture district: a county may distribute to the agency "the percentage of property tax increment established by the committee... not to exceed: (A)70%" and the agency "may issue bonds". Counter-provision: after January 1, 2028 the committee "may not approve a proposal for a housing and transit reinvestment zone, a first home investment zone, or a convention center reinvestment zone" unless pending, and new home ownership promotion zones end.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'datacenter_growth') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'datacenter_growth', 75, false,
      'yea_opposes', '"Beginning on May 6, 2027, except as provided in Subsections (2) and (3), a political subdivision may not provide an incentive to a large load data center" cuts against welcoming data-center investment with local incentives. Counter-provision: incentives remain allowed inside a regionally significant development zone and from up to 80% of county energy excise tax revenue, and pre-May 6, 2027 agreements continue.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'datacenter_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'datacenter_power', 50, false,
      'yea_supports', 'A county "may levy an excise tax for the delivered value of energy upon a high-impact consumer" at "a maximum rate of 6%", and the banned "incentive" includes public funds for infrastructure "that wholly or primarily support a large load customer", making these users pay for their own energy footprint. Counter-provision: a levying county "may provide up to 80% of the revenue generated by the county energy excise tax as an incentive to a large load data center".', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 55, false,
      'yea_opposes', 'New 63G-2-305(2)(b) protects "confidential economic development information" including a record "that takes the form of a nondisclosure agreement between a person and a governmental entity exploring an economic development opportunity", reducing public access. Counter-provisions: new PID cost disclosure at closing and zone reporting and audit duties, which are smaller.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'enviro_energy') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'enviro_energy', 35, false,
      'yea_supports', 'The outside-zone incentive prohibition gains a new exception for "(C)an electrical energy project that is not a nuclear energy project", freeing localities to incentivize non-nuclear baseload generation, an all-sources posture. The State Reinvestment Restricted Account may also be used for "development of energy resources".', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'lower_taxes') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'lower_taxes', 40, false,
      'yea_opposes', 'The bill creates a new tax rather than cutting one: "A county may levy an excise tax for the delivered value of energy upon a high-impact consumer" that "is in addition to any sales and use tax imposed by the county". Counter-provision: the new account lists "income tax relief" as a use, subject to appropriation, with no rate change.', 'https://le.utah.gov/Session/2026/bills/enrolled/HB0507.xml');
  END IF;
END $$;
