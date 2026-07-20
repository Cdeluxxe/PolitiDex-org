-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — omnibus bills broken down into component issues (data-only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Major omnibus bills bundle many unrelated policies into a single vote, so one
-- roll call should light up under MANY issues at once — and, because a "yea" can
-- ADVANCE one bundled policy while CUTTING AGAINST another, a single vote can be
-- "consistent" with a member's stated stance on some issues and "contradicts" it on
-- others. The data model already supports this: vr_measure_issues is a weighted
-- many-to-many bridge whose support_meaning column records, per issue, whether a
-- yea advances (yea_supports) or opposes (yea_opposes) that issue. This migration
-- simply enriches the mapping for the two biggest omnibus measures already in the
-- record so their per-issue say-vs-do breakdown is complete.
--
-- Changes NO schema. INSERTs into vr_measure_issues ONLY, and every insert uses
-- ON CONFLICT (measure_id, issue_key) DO NOTHING against the existing unique index,
-- so it is fully additive and idempotent: the component issues already seeded for
-- H.R. 1 (lower_taxes, cut_spending, healthcare, border_security, lands_energy) are
-- left untouched, and re-applying this migration is a no-op. Rolls forward from the
-- applied voting-record migrations; never edits one.
--
-- Every issue_key below is a valid ISSUE_MAP key (db/issue-keys.json), and every
-- mapping carries a rationale and a canonical source. Directional claims (what a
-- yea advances or opposes) reflect the enacted bill text on Congress.gov; the
-- deficit figure matches the CBO cost estimate already cited in the H.R. 1
-- Showcase. Measures are resolved by their natural keys (number + congress), never
-- by hard-coded serials.
DO $$
DECLARE
  m_hr1    integer;
  m_hr1968 integer;
BEGIN
  -- ── H.R. 1 — One Big Beautiful Bill Act (flagship omnibus) ──────────────────
  SELECT id INTO m_hr1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  IF m_hr1 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr1, 'tax_middle_class', 60, false, 'yea_supports',
        'Makes the 2017 individual income-tax rates permanent and adds temporary deductions for tips and overtime pay.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'national_debt', 65, false, 'yea_opposes',
        'Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal deficits over ten years; a yea vote increases the national debt.',
        'https://www.cbo.gov/publication/61461'),
      (m_hr1, 'family_support', 45, false, 'yea_supports',
        'Raises the child tax credit to $2,200 per child and makes it permanent.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'climate_action', 55, false, 'yea_opposes',
        'Phases out and repeals clean-energy and electric-vehicle tax credits enacted in 2022; a yea vote cuts against climate-action goals.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'energy_production', 45, false, 'yea_supports',
        'Expands onshore and offshore oil, gas, and coal leasing and speeds fossil-fuel permitting.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'deportations', 50, false, 'yea_supports',
        'Appropriates tens of billions of dollars for immigration detention and removal operations.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'strong_defense', 45, false, 'yea_supports',
        'Adds a large increase in defense and military spending.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'school_choice', 35, false, 'yea_supports',
        'Creates a federal tax credit for donations to K-12 private-school scholarship organizations.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1'),
      (m_hr1, 'edu_college_cost', 40, false, 'yea_opposes',
        'Eliminates several income-driven student-loan repayment plans and caps graduate borrowing; a yea vote cuts against reducing college costs.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 1968 — Full-Year Continuing Appropriations and Extensions Act, 2025 ─
  -- The full-year funding bill is itself an omnibus: it keeps the government open
  -- while raising defense and trimming some non-defense spending, and it continues
  -- deficit-level spending for the year. Kept directional (no unverified dollar
  -- figures) and sourced to the bill page.
  SELECT id INTO m_hr1968 FROM vr_measures WHERE number = 'H.R. 1968' AND congress = 119 LIMIT 1;
  IF m_hr1968 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr1968, 'gov_services', 70, false, 'yea_supports',
        'Funds the federal government through the end of the 2025 fiscal year, averting a shutdown.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1968'),
      (m_hr1968, 'strong_defense', 55, false, 'yea_supports',
        'Increases defense appropriations over the prior year.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1968'),
      (m_hr1968, 'cut_spending', 45, false, 'yea_supports',
        'Reduces some non-defense discretionary spending from the prior year.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1968'),
      (m_hr1968, 'national_debt', 50, false, 'yea_opposes',
        'Continues deficit-level federal spending for the full fiscal year; a yea vote adds to the national debt.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1968')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;
