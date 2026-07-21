-- ─────────────────────────────────────────────────────────────────────────────
-- Distributional Impact Ledger — seed wave 2 (additive)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds sourced "Who It Affects" rows for three more major measures already in the
-- voting record, alongside the H.R. 1 seed from
-- 20260721210000_create_vr_distributional_impacts.sql:
--   • S. 129  — No Tax on Tips Act                 (tax)
--   • H.R. 82 — Social Security Fairness Act        (benefits / Social Security)
--   • H.R. 6703 — Lower Health Care Premiums Act    (healthcare)
--
-- Fully additive and idempotent:
--   • No schema change — inserts into the existing vr_distributional_impacts table.
--   • Every measure's inserts are guarded by a per-measure sentinel (NOT EXISTS), so
--     the data is written at most once and re-running is a no-op.
--   • Never edits an applied migration; rolls forward only.
--
-- NEUTRALITY / VERIFIABILITY (see DISTRIBUTIONAL_IMPACT.md): every row names a
-- nonpartisan scorekeeper (the Congressional Budget Office / Joint Committee on
-- Taxation, and the independent Budget Lab at Yale), links to it, and is graded for
-- evidence strength. Both benefit AND cost rows are seeded so no measure reads
-- one-sided. Figures are quoted as those bodies published them.

DO $$
DECLARE
  m_tips integer;  -- S. 129  — No Tax on Tips Act
  m_ssf  integer;  -- H.R. 82 — Social Security Fairness Act
  m_lhc  integer;  -- H.R. 6703 — Lower Health Care Premiums for All Americans Act
  p_wep  integer;  -- SSFA: Repeal the Windfall Elimination Provision (WEP)
  p_def  integer;  -- SSFA: Adds to the federal deficit
  p_csr  integer;  -- LHCP: Cost-sharing reduction (CSR) funding
  p_ahp  integer;  -- LHCP: Association Health Plans expansion
  YALE text := 'https://budgetlab.yale.edu/sites/default/files/2024-09/The%20Budget%20Lab%20No%20Tax%20on%20Tips%20Report%202024.pdf';
  CBO_SSF text := 'https://www.cbo.gov/publication/60690';   -- CBO cost estimate, H.R. 82
  CBO_LHC text := 'https://www.cbo.gov/publication/61959';   -- CBO/JCT estimate, H.R. 6703
BEGIN
  -- ── S. 129 — No Tax on Tips Act ─────────────────────────────────────────────
  SELECT id INTO m_tips FROM vr_measures WHERE number = 'S. 129' AND congress = 119 LIMIT 1;
  IF m_tips IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_tips) THEN
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_tips, NULL, 'working_middle', 'benefit', NULL, NULL,
       'middle-income tipped workers gain most',
       'Who benefits from the tips deduction',
       'The Budget Lab at Yale', YALE,
       'The Budget Lab at Yale: the benefit concentrates in the middle income quintiles. About 37% of tipped workers owe no federal income tax and so receive nothing, and tipped work is only about 2.5% of employment (~4 million workers).',
       'moderate', '2024-09-01T00:00:00Z', 10),

      (m_tips, NULL, 'high_income_wealth', 'benefit', NULL, NULL,
       'worth more at higher tax rates',
       'Value of the deduction by tax bracket',
       'The Budget Lab at Yale', YALE,
       'Because a deduction is worth more at higher marginal tax rates, higher-income filers with tip income receive a larger benefit per dollar of tips than the lowest-paid tipped workers.',
       'limited', '2024-09-01T00:00:00Z', 20);
  END IF;

  -- ── H.R. 82 — Social Security Fairness Act ──────────────────────────────────
  SELECT id INTO m_ssf FROM vr_measures WHERE number = 'H.R. 82' AND congress = 118 LIMIT 1;
  IF m_ssf IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_ssf) THEN
    SELECT id INTO p_wep FROM vr_measure_provisions WHERE measure_id = m_ssf AND label = 'Repeal the Windfall Elimination Provision (WEP)' LIMIT 1;
    SELECT id INTO p_def FROM vr_measure_provisions WHERE measure_id = m_ssf AND label = 'Adds to the federal deficit' LIMIT 1;
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_ssf, p_wep, 'working_middle', 'benefit', NULL, NULL,
       'about +$360 to +$1,190 per month for ~2.8M retirees',
       'Monthly Social Security benefit change for affected public-sector retirees',
       'Congressional Budget Office', CBO_SSF,
       'CBO: repealing the WEP raises affected workers'' benefits by about $360/month on average; repealing the GPO raises spousal benefits about $700/month and surviving-spouse benefits about $1,190/month. About 2.8 million public-sector retirees (e.g., teachers, firefighters, police) are affected.',
       'strong', '2024-09-09T00:00:00Z', 10),

      (m_ssf, p_def, 'working_middle', 'cost', NULL, NULL,
       'trust-fund insolvency about 6 months earlier',
       'Effect on the Social Security trust fund for future beneficiaries',
       'Congressional Budget Office', CBO_SSF,
       'CBO: the law adds about $196 billion to direct spending over 2024–2034 and moves the combined Social Security trust-fund exhaustion date roughly half a year earlier, slightly lowering the share of scheduled benefits payable after exhaustion (77.7% vs 78.3%). That cost falls on the broad pool of current and future beneficiaries.',
       'moderate', '2024-09-09T00:00:00Z', 20);
  END IF;

  -- ── H.R. 6703 — Lower Health Care Premiums for All Americans Act ────────────
  SELECT id INTO m_lhc FROM vr_measures WHERE number = 'H.R. 6703' AND congress = 119 LIMIT 1;
  IF m_lhc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_lhc) THEN
    SELECT id INTO p_csr FROM vr_measure_provisions WHERE measure_id = m_lhc AND label = 'Cost-sharing reduction (CSR) funding' LIMIT 1;
    SELECT id INTO p_ahp FROM vr_measure_provisions WHERE measure_id = m_lhc AND label = 'Association Health Plans expansion' LIMIT 1;
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_lhc, p_csr, 'working_middle', 'benefit', NULL, NULL,
       'gross benchmark premiums about 11% lower on average',
       'Change in gross benchmark ACA premiums, through 2035',
       'CBO / Joint Committee on Taxation', CBO_LHC,
       'CBO and JCT estimate the bill reduces gross benchmark premiums by about 11% on average through 2035 and reduces the deficit by $35.6 billion over 2026–2035.',
       'strong', '2025-12-01T00:00:00Z', 10),

      (m_lhc, p_csr, 'working_middle', 'cost', NULL, NULL,
       'about 100,000 fewer insured on average',
       'Change in the number of people with health insurance, 2027–2035',
       'CBO / Joint Committee on Taxation', CBO_LHC,
       'CBO and JCT estimate the bill decreases the number of insured people by about 100,000 on average over 2027–2035; it does not extend the enhanced ACA premium tax credits (a $131.1 billion reduction) while funding cost-sharing reductions.',
       'strong', '2025-12-01T00:00:00Z', 20),

      (m_lhc, p_ahp, 'small_biz_contractors', 'benefit', NULL, NULL,
       'about 700,000 more in association health plans per year',
       'Coverage for self-employed and small groups via association health plans',
       'CBO / Joint Committee on Taxation', CBO_LHC,
       'CBO and JCT estimate association-health-plan enrollment rises by about 700,000 per year on average over 2027–2035, driven largely by self-employed people taking up coverage (about 200,000 of them previously uninsured).',
       'moderate', '2025-12-01T00:00:00Z', 30);
  END IF;
END $$;
