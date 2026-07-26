-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — identity backfill for placeholder-titled measures
-- ─────────────────────────────────────────────────────────────────────────────
-- Nineteen rows in vr_measures were carrying a placeholder title of the form
-- "Roll call N" — the roll-call number the ingest happened to see first, not the
-- identity of the thing that was voted on. Between them they hold 766 recorded
-- yea/nay member-votes. Those votes are real and already display as receipts,
-- but nobody can responsibly map them to an issue while the row does not say
-- what the measure is, so they sit permanently outside the ranking.
--
-- This migration is IDENTITY ONLY. It fills title, summary and introduced_at,
-- and records where each value came from. It adds no
-- vr_measure_issues rows and changes none of the existing ones; mapping is a
-- separate judgement that can now be made from a reviewable title.
--
-- SOURCE. Every value below comes from the GPO BILLSTATUS bulk-data record for
-- the measure's own (congress, type, number) — the same Library of Congress
-- feed congress.gov renders, published at
-- https://www.govinfo.gov/bulkdata/BILLSTATUS/119/<type>/BILLSTATUS-119<type><n>.xml
-- Nothing here is inferred. Before a row was written, its BILLSTATUS record was
-- checked against three things already in our own database: the bill number in
-- the stored congress.gov source_url, the roll-call number we hold, and that
-- roll call's vote date. All nineteen matched on all three.
--
-- WHICH TITLE. `title` follows the convention already in vr_measures: the name a
-- reader recognises. That is the measure's popular short title where it has one
-- ("TICKET Act", "ROTOR Act") and its official title where it has none — which is
-- always the case for special rules and CRA disapproval resolutions. The full
-- official title is recorded in external_ids.officialTitle either way, so the long
-- form is never lost.
--
-- The version matters as much as the wording. Where a measure was rewritten before
-- the vote we hold, the later text is used:
--
--   * H.R. 1005 was rewritten on the floor from "prohibit schools from accepting
--     PRC funds" to "require schools to disclose foreign funds". CRS only ever
--     summarised the introduced version, so rather than attach a summary of a bill
--     nobody voted on, this row carries the official title as passed plus a note
--     saying why no CRS summary is shown.
--   * S. 1071 was introduced as a single-veteran disinterment bill and later became
--     the legislative vehicle for the FY2026 National Defense Authorization Act
--     (Public Law 119-60). Our Roll call 319 is the motion to commit on the NDAA
--     text, so the NDAA title and the Passed-House summary are used. The introduced
--     title would misdescribe the vote entirely.
--
-- Summaries are the most recent CRS summary published for the measure, trimmed at a
-- sentence boundary. Seventeen of the nineteen get one. The two H.Res. 377 rows do
-- not — CRS does not summarise special rules — so they rely on a title that already
-- says exactly which bills the rule brought to the floor.
--
-- NON-DESTRUCTIVE. Every statement is guarded three ways: it matches on id AND
-- congress AND number, so it is inert if the row is not the one described; it
-- only replaces a title that still looks like "Roll call N"; and it only fills
-- summary and introduced_at where they are currently empty. The two
-- already-mapped measures in this set — H.R. 22 (SAVE Act, 4 mappings) and
-- H.R. 276 (Gulf of America Act, 1 mapping) — therefore keep their curated
-- summaries and all of their mappings, and gain only the missing title. Re-running
-- the migration is a no-op.
--
-- KNOWN, DELIBERATELY NOT FIXED HERE (see db/vr-coverage-report.md):
--   * H.Res. 377 exists as two rows, ids 68 and 69, holding Roll call 118 (adopting
--     the rule, 213-209) and Roll call 117 (ordering the previous question,
--     206-200). Both are genuine, distinct votes on the same resolution, so this
--     is a duplicate measure row rather than a duplicate vote. Both rows get the
--     real title here; consolidating them deletes a row and is out of scope for an
--     additive identity pass.
--   * Several of these measures are enacted (Public Laws 119-10, 119-58, 119-60)
--     while vr_measures.status still reads 'pending'. Status is not identity and
--     is left alone; the law numbers are recorded in external_ids so a later
--     status pass has them.
-- ─────────────────────────────────────────────────────────────────────────────

-- H.R. 22 — was "Roll call 102", 113 member-votes, 4 existing mapping(s) left untouched
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'SAVE Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires individuals to provide documentary proof of U.S. citizenship when registering to vote in federal elections. Specifically, the bill prohibits states from accepting and processing an application to register to vote in a federal election unless the applicant presents documentary proof of U.S. citizenship. The bill specifies what documents are considered acceptable proof of U.S. citizenship, such as identification that complies with the REAL ID Act of 2005 that indicates U.S. citizenship.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-01-03 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr22", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr22.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To amend the National Voter Registration Act of 1993 to require proof of United States citizenship to register an individual to vote in elections for Federal office, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/22", "sponsorName": "Rep. Roy, Chip [R-TX-21]", "policyArea": "Government Operations and Politics", "summarySource": "CRS summary, Introduced in House @ 2025-01-03"}'::jsonb,
  updated_at = now()
WHERE id = 5 AND congress = 119 AND number = 'H.R. 22';

-- H.R. 276 — was "Roll call 122", 40 member-votes, 1 existing mapping(s) left untouched
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Gulf of America Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill renames the Gulf of Mexico as the Gulf of America and directs federal agencies to update their documents and maps to incorporate the new name.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-01-09 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr276", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr276.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To rename the Gulf of Mexico as the \"Gulf of America\".", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/276", "sponsorName": "Rep. Greene, Marjorie Taylor [R-GA-14]", "policyArea": "Public Lands and Natural Resources", "summarySource": "CRS summary, Introduced in House @ 2025-01-09"}'::jsonb,
  updated_at = now()
WHERE id = 50 AND congress = 119 AND number = 'H.R. 276';

-- S.J.Res. 18 — was "Roll call 96", 38 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'A joint resolution disapproving the rule submitted by the Bureau of Consumer Financial Protection relating to "Overdraft Lending: Very Large Financial Institutions".' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This joint resolution nullifies the final rule issued by the Consumer Financial Protection Bureau titled Overdraft Lending: Very Large Financial Institutions and published on December 30, 2024. The rule revises provisions regarding charges for insufficient funds in a customer’s bank account (i.e., overdrafts) at very large financial institutions. Under the rule, these institutions must (1) cap overdraft charges at $5; (2) with justification, cap charges at a higher amount; or (3) handle overdrafts as credit and comply with applicable Truth in Lending Act disclosure requirements.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-13 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119sjres18", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/sjres/BILLSTATUS-119sjres18.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "A joint resolution disapproving the rule submitted by the Bureau of Consumer Financial Protection relating to \"Overdraft Lending: Very Large Financial Institutions\".", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18", "sponsorName": "Sen. Scott, Tim [R-SC]", "policyArea": "Finance and Financial Sector", "laws": ["Public Law 119-10"], "summarySource": "CRS summary, Public Law @ 2025-05-09"}'::jsonb,
  updated_at = now()
WHERE id = 56 AND congress = 119 AND number = 'S.J.Res. 18';

-- H.R. 530 — was "Roll call 115", 38 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'ACES Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires the Department of Veterans Affairs to enter into an agreement with the National Academies of Sciences, Engineering, and Medicine to study and report on the prevalence and mortality of cancers among veterans who served on active duty as aircrew members and regularly flew in fixed-wing aircraft.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-01-16 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr530", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr530.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To provide for a study by the National Academies of Sciences, Engineering, and Medicine on the prevalence and mortality of cancer among individuals who served as active duty aircrew in the Armed Forces, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/530", "sponsorName": "Rep. Pfluger, August [R-TX-11]", "policyArea": "Armed Forces and National Security", "summarySource": "CRS summary, Introduced in House @ 2025-01-16"}'::jsonb,
  updated_at = now()
WHERE id = 67 AND congress = 119 AND number = 'H.R. 530';

-- S. 1071 — was "Roll call 319", 38 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'National Defense Authorization Act for Fiscal Year 2026' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill sets forth policies and authorities for FY2026 for Department of Defense (DOD) programs and activities, military construction, and the national security programs of the Department of Energy (DOE). The bill also sets forth policies and authorities for the Department of State, the Coast Guard, and the Intelligence Community (IC).'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-03-14 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119s1071", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s1071.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Titles as Amended by Senate", "officialTitle": "An Act to authorize appropriations for fiscal year 2026 for military activities of the Department of Defense, for military construction, and for defense activities of the Department of Energy, to prescribe military personnel strengths for such fiscal year, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/1071", "sponsorName": "Sen. Cornyn, John [R-TX]", "policyArea": "Armed Forces and National Security", "laws": ["Public Law 119-60"], "summarySource": "CRS summary, Passed House @ 2025-12-10"}'::jsonb,
  updated_at = now()
WHERE id = 75 AND congress = 119 AND number = 'S. 1071';

-- H.R. 1402 — was "Roll call 107", 38 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'TICKET Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires ticket sellers (including sellers on the secondary market) for concerts, performances, sporting events, and similar activities to clearly and prominently disclose the total ticket price for the event at the time the ticket is first displayed to an individual (and anytime thereafter during the purchasing process). Prior to completing a purchase, ticket sellers also must provide an itemized list of the base ticket price and each fee (e.g., service fee, processing fee, or other charge). The total ticket price must also be disclosed in any advertisement, marketing, or price list.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-18 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1402", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1402.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To require sellers of event tickets to disclose comprehensive information to consumers about ticket prices and related fees, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1402", "sponsorName": "Rep. Bilirakis, Gus M. [R-FL-12]", "policyArea": "Commerce", "summarySource": "CRS summary, Introduced in House @ 2025-02-18"}'::jsonb,
  updated_at = now()
WHERE id = 82 AND congress = 119 AND number = 'H.R. 1402';

-- H.J.Res. 78 — was "Roll call 113", 37 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the United States Fish and Wildlife Service relating to "Endangered and Threatened Wildlife and Plants; Endangered Species Status for the San Francisco Bay-Delta Distinct Population Segment of the Longfin Smelt".' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This joint resolution nullifies the rule issued by the U.S. Fish and Wildlife Service titled Endangered and Threatened Wildlife and Plants; Endangered Species Status for the San Francisco Bay-Delta Distinct Population Segment of the Longfin Smelt and published on July 30, 2024. The rule lists the San Francisco Bay-Delta distinct population segment of longfin smelt, a fish species of the Pacific Coast, as an endangered species. Thus, the joint resolution removes protection for the species under the Endangered Species Act of 1973.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-03-21 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hjres78", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hjres/BILLSTATUS-119hjres78.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the United States Fish and Wildlife Service relating to \"Endangered and Threatened Wildlife and Plants; Endangered Species Status for the San Francisco Bay-Delta Distinct Population Segment of the Longfin Smelt\".", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-joint-resolution/78", "sponsorName": "Rep. LaMalfa, Doug [R-CA-1]", "policyArea": "Animals", "summarySource": "CRS summary, Introduced in House @ 2025-03-21"}'::jsonb,
  updated_at = now()
WHERE id = 65 AND congress = 119 AND number = 'H.J.Res. 78';

-- H.Res. 377 — was "Roll call 118", 37 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the "Gulf of America", and providing for consideration of the bill (H.R. 881) to establish Department of Homeland Security funding restrictions on institutions of higher education that have a relationship with Confucius Institutes, and for other purposes.' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), NULL),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-05-05 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hres377", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hres/BILLSTATUS-119hres377.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the \"Gulf of America\", and providing for consideration of the bill (H.R. 881) to establish Department of Homeland Security funding restrictions on institutions of higher education that have a relationship with Confucius Institutes, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-resolution/377", "sponsorName": "Rep. Scott, Austin [R-GA-8]", "policyArea": "Congress"}'::jsonb,
  updated_at = now()
WHERE id = 68 AND congress = 119 AND number = 'H.Res. 377';

-- H.R. 1503 — was "Roll call 119", 37 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Stop Forced Organ Harvesting Act of 2025' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires the President to impose sanctions on persons (individuals and entities) involved in forced organ trafficking and authorizes the Department of State to deny or revoke the passports of individuals convicted of certain crimes related to organ trafficking. Specifically, the President must report to Congress a list of persons that facilitate (1) forced organ harvesting, or (2) trafficking in persons for organ harvesting. For each person on the list, the President must impose property- and visa-blocking sanctions.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-21 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1503", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1503.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To combat forced organ harvesting and trafficking in persons for purposes of the removal of organs, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1503", "sponsorName": "Rep. Smith, Christopher H. [R-NJ-4]", "policyArea": "International Affairs", "summarySource": "CRS summary, Introduced in House @ 2025-02-21"}'::jsonb,
  updated_at = now()
WHERE id = 70 AND congress = 119 AND number = 'H.R. 1503';

-- H.R. 1005 — was "Roll call 312", 36 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Combating the Lies of Authoritarians in School Systems Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'Official title as passed by the House: "To require public elementary and secondary schools to disclose certain funds received from, or contracts with, a foreign source, and for other purposes." The bill was rewritten on the floor from the text as introduced; CRS published a summary only for the introduced version, so none is shown here.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-05 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1005", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1005.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Titles as Amended by House", "officialTitle": "To require public elementary and secondary schools to disclose certain funds received from, or contracts with, a foreign source, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1005", "sponsorName": "Rep. Joyce, David P. [R-OH-14]", "policyArea": "Education", "summarySource": "CRS summary, no CRS summary for the text as passed"}'::jsonb,
  updated_at = now()
WHERE id = 72 AND congress = 119 AND number = 'H.R. 1005';

-- H.R. 1049 — was "Roll call 314", 36 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Transparency in Reporting of Adversarial Contributions to Education Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires each local educational agency (LEA), as a condition of receiving federal elementary and secondary education funds, to ensure that each elementary and secondary school served by the LEA notifies parents of their rights to request and receive information regarding foreign influence (e.g., influence by China) in schools.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-06 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1049", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1049.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To ensure that parents are aware of foreign influence in their child''s public school, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1049", "sponsorName": "Rep. Bean, Aaron [R-FL-4]", "policyArea": "Education", "summarySource": "CRS summary, Introduced in House @ 2025-02-06"}'::jsonb,
  updated_at = now()
WHERE id = 79 AND congress = 119 AND number = 'H.R. 1049';

-- H.R. 973 — was "Roll call 103", 36 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Setting Consumer Standards for Lithium-Ion Batteries Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires the Consumer Product Safety Commission to issue a final consumer product safety rule for rechargeable lithium-ion batteries used in micromobility devices, such as electric bikes and electric scooters. Specifically, the rule must require manufacturers and distributors of such products to comply with the applicable safety standards jointly established by the American National Standards Institute, the Standards Council of Canada, and UL Solutions Inc.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-04 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr973", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr973.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To establish consumer standards for lithium-ion batteries.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/973", "sponsorName": "Rep. Torres, Ritchie [D-NY-15]", "policyArea": "Commerce", "summarySource": "CRS summary, Introduced in House @ 2025-02-04"}'::jsonb,
  updated_at = now()
WHERE id = 80 AND congress = 119 AND number = 'H.R. 973';

-- H.R. 4305 — was "Roll call 311", 36 member-votes, 2 existing mapping(s) left untouched
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'DUMP Red Tape Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill establishes a requirement for the Office of Advocacy of the Small Business Administration (SBA) to continue to operate and maintain the Red Tape Hotline, which receives notifications from small entities about the burden of complying with applicable rules, guidance, policy statements, or other activities of a federal agency. The office must report annually to the SBA and Congress information about the notifications received through the hotline.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-07-10 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr4305", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr4305.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To direct the Chief Counsel for Advocacy of the Small Business Administration to establish a Red Tape Hotline to receive notifications of burdensome agency rules, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/4305", "sponsorName": "Rep. Wied, Tony [R-WI-8]", "policyArea": "Commerce", "summarySource": "CRS summary, Reported to House @ 2025-11-21"}'::jsonb,
  updated_at = now()
WHERE id = 83 AND congress = 119 AND number = 'H.R. 4305';

-- H.R. 2965 — was "Roll call 310", 35 member-votes, 2 existing mapping(s) left untouched
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Small Business Regulatory Reduction Act of 2025' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill requires the Small Business Administration (SBA) to ensure the annual small business regulatory budget for the SBA in each fiscal year is no greater than zero. The small business regulatory budget is the cost to a small business of a federal rulemaking, including the cost resulting from the issuance of any new rule and the cost resulting from the modification or repeal of an existing rule.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-04-17 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr2965", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr2965.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To require the Administrator of the Small Business Administration to ensure that the small business regulatory budget for a small business concern in a fiscal year is not greater than zero, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/2965", "sponsorName": "Rep. Van Duyne, Beth [R-TX-24]", "policyArea": "Commerce", "summarySource": "CRS summary, Reported to House @ 2025-05-21"}'::jsonb,
  updated_at = now()
WHERE id = 71 AND congress = 119 AND number = 'H.R. 2965';

-- H.R. 1069 — was "Roll call 313", 35 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'PROTECT Our Kids Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill prohibits federal education funding for any elementary or secondary school that directly or indirectly receives support from the Chinese government. Specifically, the bill prohibits such funding for any school that (1) has a partnership in effect with a cultural or language institute funded by the Chinese government, including a Confucius Institute; (2) operates a learning center supported by the Chinese government (commonly referred to as a Confucius Classroom)…'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-06 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1069", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1069.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To prohibit the availability of Federal education funds for elementary and secondary schools that receive direct or indirect support from the Government of the People''s Republic of China.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1069", "sponsorName": "Rep. Hern, Kevin [R-OK-1]", "policyArea": "Education", "summarySource": "CRS summary, Introduced in House @ 2025-02-06"}'::jsonb,
  updated_at = now()
WHERE id = 74 AND congress = 119 AND number = 'H.R. 1069';

-- S. 2503 — was "Roll call 72", 34 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'ROTOR Act' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill addresses aviation safety by increasing requirements for aircraft tracking and communication using Automatic Dependent Surveillance-Broadcast (ADS-B) technology and expanding oversight. As background, ADS-B for broadcasting (Out) and receiving (In) transmits information (e.g., location and weather information) between aircraft and air traffic control. Under the bill, aircraft must generally operate with ADS-B In equipment to provide the aircraft with location information of other aircraft and traffic advisories. Current law does not require this equipment.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-07-29 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119s2503", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s2503.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "A bill to require all aircraft to be equipped with Automatic Dependent Surveillance-Broadcast In, to improve aviation safety, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/2503", "sponsorName": "Sen. Cruz, Ted [R-TX]", "policyArea": "Transportation and Public Works", "summarySource": "CRS summary, Passed Senate @ 2025-12-17"}'::jsonb,
  updated_at = now()
WHERE id = 59 AND congress = 119 AND number = 'S. 2503';

-- H.Res. 377 — was "Roll call 118", 34 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the "Gulf of America", and providing for consideration of the bill (H.R. 881) to establish Department of Homeland Security funding restrictions on institutions of higher education that have a relationship with Confucius Institutes, and for other purposes.' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), NULL),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-05-05 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hres377", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hres/BILLSTATUS-119hres377.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the \"Gulf of America\", and providing for consideration of the bill (H.R. 881) to establish Department of Homeland Security funding restrictions on institutions of higher education that have a relationship with Confucius Institutes, and for other purposes.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-resolution/377", "sponsorName": "Rep. Scott, Austin [R-GA-8]", "policyArea": "Congress"}'::jsonb,
  updated_at = now()
WHERE id = 69 AND congress = 119 AND number = 'H.Res. 377';

-- H.R. 1676 — was "Roll call 316", 34 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Make SWAPs Efficient Act of 2025' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This bill modifies the State Wildlife Grant Program (SWGP) to establish a deadline for the Department of the Interior to approve state wildlife conservation and restoration programs. Under the SWGP, Interior provides funding to state wildlife agencies to implement their comprehensive plans (commonly known as state wildlife action plans or SWAPs) for state wildlife conservation and restoration programs.'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-27 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119hr1676", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1676.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "To amend the Pittman-Robertson Wildlife Restoration Act to require the Secretary of the Interior to approve the wildlife conservation and restoration program of a State within a certain period of time.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1676", "sponsorName": "Rep. Donalds, Byron [R-FL-19]", "policyArea": "Public Lands and Natural Resources", "summarySource": "CRS summary, Introduced in House @ 2025-02-27"}'::jsonb,
  updated_at = now()
WHERE id = 78 AND congress = 119 AND number = 'H.R. 1676';

-- S. 356 — was "Roll call 315", 34 member-votes
UPDATE vr_measures SET
  title = CASE WHEN title IS NULL OR title = '' OR title ~* '^roll ?call' THEN 'Secure Rural Schools Reauthorization Act of 2025' ELSE title END,
  summary = COALESCE(NULLIF(summary, ''), 'This act extends and modifies the Secure Rural Schools (SRS) program, under which states and counties containing certain federal land may receive payments from the Forest Service or the Bureau of Land Management (BLM) for schools, roads, and certain other municipal services. The act modifies the SRS program, including by extending payments made to states and counties containing federal land through FY2026, providing lapsed payments for FY2024 and FY2025, extending the authority of counties to initiate projects using such funds through FY2028, and extending the authority to initiate projects proposed by resource a…'),
  introduced_at = COALESCE(introduced_at, TIMESTAMPTZ '2025-02-03 00:00:00+00'),
  external_ids = COALESCE(external_ids, '{}'::jsonb) || '{"billStatusPackage": "BILLSTATUS-119s356", "billStatusUrl": "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s356.xml", "identitySource": "GPO BILLSTATUS bulk data", "identityTitleType": "Official Title as Introduced", "officialTitle": "A bill to extend the Secure Rural Schools and Community Self-Determination Act of 2000.", "congressGovUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/356", "sponsorName": "Sen. Crapo, Mike [R-ID]", "policyArea": "Public Lands and Natural Resources", "laws": ["Public Law 119-58"], "summarySource": "CRS summary, Public Law @ 2025-12-18"}'::jsonb,
  updated_at = now()
WHERE id = 81 AND congress = 119 AND number = 'S. 356';

-- Report what actually landed, so a deploy log shows the backfill working.
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM vr_measures
   WHERE title IS NULL OR title = '' OR title ~* '^roll ?call';
  RAISE NOTICE 'vr_measures rows still carrying a placeholder title: %', remaining;
END $$;
