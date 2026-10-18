-- ────────────────────────────────────────────────────────────────────────────
-- One Big Beautiful Bill Act — H.R. 1 (119th), Public Law 119-21: its sponsor
-- on file, and every other topic its enacted text touches
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. Eleven vr_measure_issues rows, eleven vr_measure_provisions
-- rows (one per new topic, so every topic on the bill face rests on a named
-- section — the standard 20260923000000_vr_hr1_citation_integrity set) and one
-- vr_positions row, all on the existing H.R. 1 measure. Nothing is created
-- around it: a branch with no H.R. 1 (119, house) row RAISEs, because the
-- measure, its three roll calls and its fourteen issue rows were filed by
-- earlier passes and must not be re-invented.
--
-- THE FOURTEEN ROWS ALREADY ON FILE ARE NOT TOUCHED. lower_taxes (100,
-- primary) and its thirteen secondaries keep their weight, primary flag,
-- polarity, rationale and source, and no existing provision row is edited or
-- renumbered (the new rows take sort_order 120-220). The verification block
-- below RAISEs if any of the fourteen reads differently. Each of the fourteen
-- already prints an effect line on a member's file — eleven stored in
-- _DOS_EFFECT, and border_security, healthcare and lands_energy from their own
-- one-sentence did — so none is added for them.
--
-- STATUS, READ 2026-10-18. The Congress.gov API lists H.R. 1 as reported by
-- the House Budget Committee as an original measure on 2025-05-20 (H. Rept.
-- 119-106, Mr. Arrington), passed by the House 215-214 on 2025-05-22 (roll
-- 145), passed by the Senate with an amendment 51-50 on 2025-07-01 (record
-- vote 372, the Vice President breaking the tie), agreed to by the House
-- 218-214 on 2025-07-03 (roll 190) and signed 2025-07-04: Public Law 119-21.
--
-- THE SPONSOR IS THE RECORD'S. Congress.gov (read 2026-10-18) lists Rep. Jodey
-- C. Arrington (R-TX-19) as sponsor and no co-sponsors — an original measure
-- reported by a committee carries none. One row; nobody else is added.
--
-- THE TEXT, READ TITLE BY TITLE (PLAW-119publ21) against the vocabulary. Filed,
-- each secondary, each with its own effect line in consistency.js and its own
-- provision row naming the section:
--   gov_services 50 yea_opposes (Secs. 71119, 71107, 71115-16, 10102, 10105-06
--     against Sec. 70101) · rural_ag 40 (Title I, Subtitles C-E) ·
--   lands_preserve 30 yea_opposes (Secs. 50104, 50105, 50304) · child_care 30
--     (Secs. 70401, 70404, 70405) · health_drug_prices 25 yea_opposes
--     (Sec. 71203) · pro_life 25 (Sec. 71113) · housing_support 25
--     (Sec. 70422) · econ_corp_account 20 yea_opposes (Sec. 30001) ·
--   econ_smallbiz 20 (Secs. 70432, 70433) · permitting_reform 20 (Sec. 60026) ·
--   water_storage 15 (Sec. 50501).
-- Read and NOT filed:
--   health_rural — the act runs both ways on it. Sec. 71401 appropriates
--     $10,000,000,000 a year for fiscal years 2026-2030 to a Rural Health
--     Transformation Program, and Secs. 71115 and 71116 phase down the provider
--     taxes and State directed payments that finance the same hospitals. The
--     text does not say which is larger, and one support_meaning cannot hold
--     both, so no row; the Medicaid side is on healthcare and gov_services.
--   social_security — no section amends a Social Security or Medicare benefit
--     formula. The deduction for seniors in Sec. 70103 is an income-tax
--     deduction (lower_taxes, tax_middle_class); Sec. 71201's limit on
--     Medicare for certain lawfully present non-citizens is an eligibility rule
--     for a class of immigrants, not the program-wide benefit cut this chip
--     asks about, and reading it backwards would score a yea as cutting
--     seniors' Medicare.
--   immig_legal — Title X, Part I prices immigration filings (the Sec. 100007
--     visa integrity fee, the Sec. 100003 work-authorization fees, the Sec.
--     100013 adjustment fees) but changes no visa number, category or
--     processing time, which is the chip's subject.
--   healthcare_costs and healthcare_market — the premium-credit changes
--     (Secs. 71301-71305) raise some households' costs and the HSA changes
--     (Secs. 71306-71308) lower others'; eligibility is the healthcare row's
--     subject, and tax-favoured accounts are neither competition nor price
--     transparency.
--   tax_middle_class — already on file (60); the tips and overtime deductions
--     (Secs. 70201, 70202) are what it reads.
--   econ_growth — expensing (Secs. 70301, 70302) is the business-side tax cut
--     the lower_taxes row already names; the same conviction, one row.
--   paid_leave — Sec. 70304 makes an employer credit permanent; it guarantees
--     no one leave, which is the chip.
--   infrastructure — Sec. 40003 funds air traffic control, but Secs. 60019 and
--     60024 rescind neighborhood-access and low-carbon transportation money:
--     both ways, no row.
--   dev_district_finance (Sec. 70421 opportunity zones are a federal tax
--     incentive, not a district that captures revenue), property_tax and
--     prop_tax (Sec. 70120 raises the federal SALT deduction cap; it caps no
--     property tax), econ_workers (no wage or worker-protection rule), and the
--     tariff keys (Sec. 70531 ends a customs exemption; it sets no tariff).
-- No new issue key.
--
-- WHAT IT COSTS, MEASURED BEFORE IT SHIPS (runbook rule 30). Projected with
-- scripts/vr-federal-fpi.mjs --set all over the live mapping: no member row
-- goes from read to unread on any key; rows newly on file are characterised
-- where the engine's own floors allow; and eleven issue rows across five
-- members move from a clear direction to split, because this act now runs
-- against their other acts on the key — fitzpatrick (econ_corp_account,
-- econ_smallbiz, lands_preserve), greg_landsman (gov_services, econ_smallbiz),
-- hawley (gov_services), marie_gluesenkamp_perez (permitting_reform,
-- gov_services) and massie (lands_preserve, gov_services, econ_corp_account).
-- That is a truer reading of their records, published here rather than netted.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, pole, score input or new key.
-- No weight or primary flag moves. Like this Act's other nine secondaries
-- (20260720000000_hr1_omnibus_component_issues), the new rows live in this
-- migration only: db/vr-issue-seed.json keeps H.R. 1 at the five rows it has
-- always carried. Pinned by scripts/test-obbba-hr1.mjs.
--
-- Idempotent: the mappings are ON CONFLICT (measure_id, issue_key) DO NOTHING,
-- each provision is guarded by NOT EXISTS on its label, and the sponsorship row
-- by ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING.
--
-- pack-generation: derived — the fingerprint moves with these rows;
--   confirm with scripts/test-vr-pack-key-version.mjs after the wave lands.

-- H.R. 1 · 119th · One Big Beautiful Bill Act — eleven topics, their sections, its sponsor
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 1'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'OBBBA: H.R. 1 (119, house) is not in vr_measures. This pass adds to an existing measure and creates none.';
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'gov_services', 50, false, 'yea_opposes',
      'Title VII, Subtitle B, Chapter 1 reduces federal Medicaid spending through operative eligibility and financing rules: Sec. 71119 requires States to condition expansion-adult coverage on community engagement ("works not less than 80 hours" a month, or the equivalent in service, a work program or school), Sec. 71107 moves expansion adults to redeterminations every 6 months, and Secs. 71115 and 71116 phase down provider taxes and State directed payments. Title I does the same for SNAP: Sec. 10102 widens the able-bodied-adult work requirement, Sec. 10105 makes a State pay a share of benefit costs from fiscal year 2028 according to its payment error rate, and Sec. 10106 cuts the federal share of State administrative costs from 50 to 25 percent from fiscal year 2027. In the same act Sec. 70101 strikes the "and before January 1, 2026" end date from the section 1(j) rate schedule, making the 2017 rates, including their 37 percent top rate, permanent. This chip is the safety net read as a spending question against taxes on top earners, so a yea opposes it. Read for two flanks as rule 23 requires: the Republican nays (two in the House, three in the Senate) split between objecting to the Medicaid reductions and to the deficit, a scatter rather than a bloc, the same reading cut_spending and national_debt already carry on this act. Weighted 50, secondary: the Medicaid and SNAP titles are large, but the act''s subject is its tax title.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'rural_ag', 40, false, 'yea_supports',
      'Title I, Subtitle C (Commodities) is the operating economics of farming this key''s scope note names as IN: Sec. 10301 raises the effective reference price from 85 to 88 percent of the Olympic average and resets statutory reference prices ("For wheat, $6.35 per bushel", "For corn, $4.10 per bushel"); Sec. 10302 allocates "not more than an additional 30,000,000 base acres"; Secs. 10304 and 10305 extend price loss and agriculture risk coverage through 2031; Sec. 10309 raises marketing loan rates (wheat to $3.72, corn to $2.42 per bushel). Subtitle E raises crop insurance premium support (Sec. 10504 strikes 64 and inserts 69, and so on down the coverage table) and adds a beginning-farmer benefit (Sec. 10501); Subtitle D funds supplemental agricultural disaster assistance. Each funds the working farm or cuts a cost it carries, so a yea supports the key, the same reading as the 2026 farm bill (H.R. 7567). Not the SNAP changes in Subtitle A, which are nutrition, not farm economics. Weighted 40, secondary.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'lands_preserve', 30, false, 'yea_opposes',
      'Sec. 50104 requires the Secretary of the Interior to "conduct not fewer than 4 lease sales area-wide" under the Arctic National Wildlife Refuge Coastal Plain oil and gas program within 10 years, in addition to the sales Public Law 115-97 already required, and Sec. 50105 requires lease sales in the National Petroleum Reserve-Alaska. Sec. 50304 rescinds unobligated National Park Service and Bureau of Land Management conservation balances from Public Law 117-169. Opening protected federal acreage to leasing and withdrawing conservation money is what a yea does on this key, so it is coded yea_opposes, the mirror of this act''s lands_energy row and the same reading H.J.Res. 131 carries on the Coastal Plain (lands_preserve 90, against its lands_energy 100). Weighted 30, secondary: a slice of the energy title.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'child_care', 30, false, 'yea_supports',
      'Three sections of the tax title lower what families and employers pay for child care: Sec. 70404 raises the dependent care assistance exclusion by striking "$5,000 ($2,500" and inserting "$7,500 ($3,750"; Sec. 70405 raises the child and dependent care credit''s applicable percentage to 50 percent, phasing down to 35 and then 20 percent with income; Sec. 70401 raises the employer-provided child care credit from 25 percent to "40 percent (50 percent in the case of an eligible small business)" and its cap to $500,000 ($600,000 for a small business). Cutting child-care costs is the chip''s subject, so a yea supports it. Weighted 30, secondary. Distinct from family_support, which this act already carries on the child tax credit.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'health_drug_prices', 25, false, 'yea_opposes',
      'Sec. 71203, "Expanding and clarifying the exclusion for orphan drugs under the drug price negotiation program", amends Social Security Act section 1192(e) so a drug designated "for one or more rare diseases or conditions" (previously "only one rare disease or condition") is excluded from Medicare drug price negotiation, and adds a paragraph (4) that delays when a former orphan drug''s negotiation clock starts. Fewer drugs subject to negotiation is the opposite of this chip''s "cap and negotiate", so a yea opposes it. Weighted 25, secondary: one section.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'pro_life', 25, false, 'yea_supports',
      'Sec. 71113, "Federal payments to prohibited entities", provides that "No Federal funds that are considered direct spending and provided to carry out a State plan under title XIX of the Social Security Act ... shall be used to make payments to a prohibited entity" for one year from enactment. A prohibited entity is a section 501(c)(3) essential community provider "primarily engaged in family planning services, reproductive health, and related medical care" that provides abortions other than for rape, incest or a life-endangering condition, and whose Medicaid receipts in fiscal year 2023 exceeded $800,000. Withholding public money from abortion providers is this key''s subject, so a yea supports it. Weighted 25, secondary: one section, one year.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'housing_support', 25, false, 'yea_supports',
      'Sec. 70422, "Permanent enhancement of low-income housing tax credit", makes the State housing credit ceiling increase permanent for calendar years after 2025 (section 42(h)(3)(I), at 1.12) and lowers the share of a project''s costs that tax-exempt bonds must finance before it qualifies for the 4 percent credit without an allocation (section 42(h)(4)(B)). Public money for below-market housing, including the low-income housing tax credit, is what this key''s scope note names, so a yea supports it. Weighted 25, secondary. Sec. 30002''s rescission of the Green and Resilient Retrofit Program balances was read too; it withdraws unobligated retrofit money rather than any below-market unit, and does not change the direction.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'econ_corp_account', 20, false, 'yea_opposes',
      'Sec. 30001, "Funding cap for the Bureau of Consumer Financial Protection", amends section 1017(a)(2)(A)(iii) of the Consumer Financial Protection Act of 2010 "by striking ''12'' and inserting ''6.5''", cutting the ceiling on what the Bureau may draw from the Federal Reserve''s operating expenses by nearly half. The gov_regulation scope note sends consumer finance to this key by name. Shrinking the agency that holds large financial firms to account is the opposite of this chip, so a yea opposes it. Weighted 20, secondary: one section.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'econ_smallbiz', 20, false, 'yea_supports',
      'Two sections lower the paperwork a small business carries: Sec. 70433 raises the information-reporting threshold for payments to a payee (Forms 1099-NEC and 1099-MISC) by striking "$600" and inserting "$2,000", indexed after 2026, and Sec. 70432 reinstates the pre-2021 de minimis rule so a third party settlement organization reports a payee only if payments exceed "$20,000" and "200" transactions. Lowering the paperwork cost of being small is this key''s scope, so a yea supports it. The qualified business income deduction (Sec. 70105) and the small business stock exclusion (Sec. 70431) were read and left to lower_taxes: business tax rates are on this key''s OUT list. Weighted 20, secondary.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'permitting_reform', 20, false, 'yea_supports',
      'Sec. 60026 adds a NEPA section 112, "Project sponsor opt-in fees for environmental reviews": a sponsor that pays a fee of 125 percent of the anticipated cost has its environmental assessment "completed not later than 180 days after the date on which the fee is paid" and its environmental impact statement "not later than 1 year after" the notice of intent. Firm deadlines on federal environmental review are this key''s support pole, so a yea supports it. Weighted 20, secondary: one section of the environment title.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm'),
    (m_id, 'water_storage', 15, false, 'yea_supports',
      'Sec. 50501, "Water conveyance and surface water storage enhancement", appropriates "$1,000,000,000, to remain available through September 30, 2034, for construction and associated activities that restore or increase the capacity or use of existing conveyance facilities constructed by the Bureau of Reclamation or ... increase the capacity of existing Bureau of Reclamation surface water storage facilities". Building reservoir and pipeline capacity is this chip''s subject, so a yea supports it. Weighted 15, secondary: one appropriation, at the narrow-link floor.',
      'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'SNAP cost shift to States') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'SNAP cost shift to States', 'Sec. 10105 makes a State pay up to 15 percent of its SNAP benefit costs from fiscal year 2028, set by its payment error rate (0 percent below a 6 percent error rate), and Sec. 10106 cuts the federal share of State SNAP administrative costs from 50 to 25 percent from fiscal year 2027.', 'gov_services', 'yea_opposes', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Farm safety net and crop insurance') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Farm safety net and crop insurance', 'Sec. 10301 raises statutory reference prices for covered commodities (wheat to $6.35, corn to $4.10 per bushel); Sec. 10302 adds up to 30,000,000 base acres; Sec. 10504 raises federal crop-insurance premium support at every coverage level.', 'rural_ag', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 130);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Arctic refuge and NPR-A lease sales') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Arctic refuge and NPR-A lease sales', 'Sec. 50104 requires at least four more area-wide oil and gas lease sales on the Arctic National Wildlife Refuge Coastal Plain within 10 years; Sec. 50105 requires lease sales in the National Petroleum Reserve-Alaska; Sec. 50304 rescinds unobligated Park Service and BLM conservation funds.', 'lands_preserve', 'yea_opposes', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 140);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Child care credits') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Child care credits', 'Sec. 70404 raises the dependent care assistance exclusion from $5,000 to $7,500; Sec. 70405 raises the child and dependent care credit rate to as much as 50 percent; Sec. 70401 raises the employer-provided child care credit to 40 percent (50 percent for small businesses), up to $500,000.', 'child_care', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 150);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Orphan drug negotiation exclusion') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Orphan drug negotiation exclusion', 'Sec. 71203 widens the exclusion from Medicare drug price negotiation to drugs designated for one or more rare diseases (previously only one) and delays the negotiation clock for a former orphan drug.', 'health_drug_prices', 'yea_opposes', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 160);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Medicaid funds to abortion providers') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Medicaid funds to abortion providers', 'Sec. 71113 bars federal Medicaid payments for one year to a prohibited entity: a nonprofit essential community provider primarily engaged in family planning that provides abortions beyond rape, incest or life endangerment and received more than $800,000 in Medicaid in fiscal year 2023.', 'pro_life', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 170);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Low-income housing tax credit') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Low-income housing tax credit', 'Sec. 70422 permanently raises State low-income housing tax credit ceilings (by 12 percent from 2026) and lowers the tax-exempt bond financing threshold a project must meet for the 4 percent credit.', 'housing_support', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'CFPB funding cap') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'CFPB funding cap', 'Sec. 30001 cuts the cap on the Consumer Financial Protection Bureau''s funding draw from 12 to 6.5 percent of the Federal Reserve System''s operating expenses.', 'econ_corp_account', 'yea_opposes', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 190);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = '1099 reporting thresholds') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, '1099 reporting thresholds', 'Sec. 70433 raises the 1099 information-reporting threshold for payments to a payee from $600 to $2,000; Sec. 70432 restores the $20,000 and 200-transaction floor before a payment app must report a payee.', 'econ_smallbiz', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Paid environmental review deadlines') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Paid environmental review deadlines', 'Sec. 60026 lets a project sponsor pay 125 percent of the anticipated cost of a NEPA review in exchange for an environmental assessment within 180 days or an environmental impact statement within one year.', 'permitting_reform', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 210);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_id AND label = 'Reclamation water storage') THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    VALUES (m_id, 'Reclamation water storage', 'Sec. 50501 appropriates $1 billion through fiscal year 2034 to restore or increase the capacity of existing Bureau of Reclamation conveyance and surface water storage facilities.', 'water_storage', 'yea_supports', 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 220);
  END IF;

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Rep. Arrington, Jodey C. (R-TX-19)
    (m_id, 'arrington', 'sponsor', true, TIMESTAMPTZ '2025-05-20T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/1/cosponsors', 'Lead sponsor. Reported H.R. 1 from the House Budget Committee as an original measure on 2025-05-20 (H. Rept. 119-106).')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- VERIFICATION — the fourteen rows already on file read exactly as they did,
-- and the eleven new ones are secondary at the weight and polarity above.
DO $$
DECLARE m_id integer; n integer; r record;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 1' LIMIT 1;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'lower_taxes'
     AND weight = 100 AND is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the lower_taxes row on H.R. 1 no longer reads weight 100, primary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'cut_spending'
     AND weight = 70 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the cut_spending row on H.R. 1 no longer reads weight 70, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'national_debt'
     AND weight = 65 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the national_debt row on H.R. 1 no longer reads weight 65, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'tax_middle_class'
     AND weight = 60 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the tax_middle_class row on H.R. 1 no longer reads weight 60, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'healthcare'
     AND weight = 60 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the healthcare row on H.R. 1 no longer reads weight 60, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'border_security'
     AND weight = 55 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the border_security row on H.R. 1 no longer reads weight 55, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'climate_action'
     AND weight = 55 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the climate_action row on H.R. 1 no longer reads weight 55, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'deportations'
     AND weight = 50 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the deportations row on H.R. 1 no longer reads weight 50, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'energy_production'
     AND weight = 45 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the energy_production row on H.R. 1 no longer reads weight 45, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'strong_defense'
     AND weight = 45 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the strong_defense row on H.R. 1 no longer reads weight 45, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'family_support'
     AND weight = 45 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the family_support row on H.R. 1 no longer reads weight 45, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'edu_college_cost'
     AND weight = 40 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the edu_college_cost row on H.R. 1 no longer reads weight 40, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'lands_energy'
     AND weight = 40 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the lands_energy row on H.R. 1 no longer reads weight 40, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'school_choice'
     AND weight = 35 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: the school_choice row on H.R. 1 no longer reads weight 35, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  FOR r IN SELECT * FROM (VALUES
      ('gov_services', 50, 'yea_opposes'),
      ('rural_ag', 40, 'yea_supports'),
      ('lands_preserve', 30, 'yea_opposes'),
      ('child_care', 30, 'yea_supports'),
      ('health_drug_prices', 25, 'yea_opposes'),
      ('pro_life', 25, 'yea_supports'),
      ('housing_support', 25, 'yea_supports'),
      ('econ_corp_account', 20, 'yea_opposes'),
      ('econ_smallbiz', 20, 'yea_supports'),
      ('permitting_reform', 20, 'yea_supports'),
      ('water_storage', 15, 'yea_supports')
    ) AS t(k, w, s) LOOP
    SELECT count(*) INTO n FROM vr_measure_issues
     WHERE measure_id = m_id AND issue_key = r.k AND weight = r.w AND NOT is_primary AND support_meaning = r.s;
    IF n <> 1 THEN
      RAISE EXCEPTION 'OBBBA: expected one secondary % row on H.R. 1 (%, %), found %.', r.k, r.w, r.s, n;
    END IF;
    SELECT count(*) INTO n FROM vr_measure_provisions WHERE measure_id = m_id AND issue_key = r.k;
    IF n < 1 THEN
      RAISE EXCEPTION 'OBBBA: the % row on H.R. 1 has no provision row naming its section.', r.k;
    END IF;
  END LOOP;
  SELECT count(*) INTO n FROM vr_measure_issues WHERE measure_id = m_id AND is_primary;
  IF n <> 1 THEN
    RAISE EXCEPTION 'OBBBA: H.R. 1 should carry exactly one primary label (lower_taxes), found %.', n;
  END IF;
  SELECT count(*) INTO n FROM vr_positions WHERE measure_id = m_id AND action_type IN ('sponsor', 'cosponsor');
  RAISE NOTICE 'OBBBA: % sponsorship row(s) on H.R. 1.', n;
END $$;
