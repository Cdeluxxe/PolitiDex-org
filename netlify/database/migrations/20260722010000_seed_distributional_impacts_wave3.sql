-- ─────────────────────────────────────────────────────────────────────────────
-- Distributional Impact Ledger — seed wave 3 (additive)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds sourced "Who It Affects" rows for four more measures already in the voting
-- record, alongside waves 1–2:
--   • H.R. 4     — Rescissions Act of 2025        (public media / foreign aid)
--   • H.R. 7567  — 2026 Farm Bill (House)         (nutrition / farm supports)
--   • H.R. 3838  — FY2026 NDAA                     (defense / compensation)
--   • S.J.Res. 37 — Terminate the Canada tariff emergency (trade / tariffs)
--
-- Fully additive and idempotent:
--   • No schema change — inserts into the existing vr_distributional_impacts table.
--   • Every measure's inserts are guarded by a per-measure sentinel (NOT EXISTS), so
--     the data is written at most once and re-running is a no-op.
--   • Never edits an applied migration; rolls forward only.
--
-- NEUTRALITY / VERIFIABILITY (see DISTRIBUTIONAL_IMPACT.md): every row names a
-- scorekeeper (CBO; the Congressional Research Service; the Center on Budget and
-- Policy Priorities; the independent Budget Lab at Yale), links to it, and is graded
-- for evidence strength. Figures are quoted as those bodies published them; fiscal
-- trade-offs are stated in the methodology note. Where a measure is genuinely a cut
-- or genuinely relief, the rows reflect that rather than forcing a false balance.

DO $$
DECLARE
  m_resc integer;  -- H.R. 4     — Rescissions Act of 2025
  m_farm integer;  -- H.R. 7567  — 2026 Farm Bill (House)
  m_ndaa integer;  -- H.R. 3838  — FY2026 NDAA
  m_tar  integer;  -- S.J.Res. 37 — Terminate the Canada tariff emergency
  p_cpb  integer;  -- Rescissions: Public-broadcasting rescission (CPB)
  p_snap integer;  -- Farm Bill: Nutrition / SNAP title
  p_comm integer;  -- Farm Bill: Commodity & crop-insurance support
  p_pay  integer;  -- NDAA: 3.8% military pay raise
  p_top  integer;  -- NDAA: national-defense topline
  CBO_RESC text := 'https://www.cbo.gov/publication/61473';   -- CBO cost estimate, H.R. 4
  CBO_NDAA text := 'https://www.cbo.gov/publication/61655';   -- CBO cost estimate, H.R. 3838
  CBPP_FARM text := 'https://www.cbpp.org/press/statements/house-agriculture-committee-farm-bills-30-billion-cut-to-future-snap-benefits-and';
  CRS_FARM text := 'https://www.congress.gov/crs-product/R48918'; -- CRS: 2026 Farm Bill comparison
  YALE_TAR text := 'https://budgetlab.yale.edu/research/state-us-tariffs-september-4-2025';
BEGIN
  -- ── H.R. 4 — Rescissions Act of 2025 ────────────────────────────────────────
  SELECT id INTO m_resc FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119 LIMIT 1;
  IF m_resc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_resc) THEN
    SELECT id INTO p_cpb FROM vr_measure_provisions WHERE measure_id = m_resc AND label = 'Public-broadcasting rescission (CPB)' LIMIT 1;
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_resc, p_cpb, 'working_middle', 'cost', NULL, NULL,
       'eliminates $1.1B in CPB funding; rural and tribal stations most at risk',
       'Local public-broadcasting access for rural and underserved communities',
       'Congressional Budget Office', CBO_RESC,
       'CBO scores the Act as reducing outlays by $8.9 billion over 2025–2035 ($7.9B foreign aid, $1.1B public media). CPB funds roughly 1,500 local stations; small rural and tribal stations are the most dependent on that support and the most at risk of closing. The cut equals about 1% of the annual deficit.',
       'moderate', '2025-06-09T00:00:00Z', 10);
  END IF;

  -- ── H.R. 7567 — 2026 Farm Bill (House) ──────────────────────────────────────
  SELECT id INTO m_farm FROM vr_measures WHERE number = 'H.R. 7567' AND congress = 119 LIMIT 1;
  IF m_farm IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_farm) THEN
    SELECT id INTO p_snap FROM vr_measure_provisions WHERE measure_id = m_farm AND label = 'Nutrition / SNAP title' LIMIT 1;
    SELECT id INTO p_comm FROM vr_measure_provisions WHERE measure_id = m_farm AND label = 'Commodity & crop-insurance support' LIMIT 1;
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_farm, p_snap, 'working_middle', 'cost', NULL, NULL,
       'reduces SNAP food assistance for low-income households',
       'Nutrition title — SNAP benefits for low-income households',
       'Center on Budget and Policy Priorities', CBPP_FARM,
       'The nutrition title reduces federal SNAP spending. CBPP analysis of the CBO-scored House Agriculture bill found every SNAP participant would receive less in future years — the largest SNAP cut since the 1996 welfare law. Low-income households are the entire SNAP population.',
       'moderate', '2026-04-24T00:00:00Z', 10),

      (m_farm, p_comm, 'small_biz_contractors', 'benefit', NULL, NULL,
       'commodity supports and crop insurance (skewed to larger operations)',
       'Farm commodity supports and crop insurance',
       'Congressional Research Service', CRS_FARM,
       'The farm-support titles fund Price Loss Coverage, Agriculture Risk Coverage and federal crop insurance (CBO baseline: $60B+ and $23B+ respectively). Payments flow to farm operations; USDA Economic Research Service finds commodity support concentrates among larger operations.',
       'moderate', '2026-04-24T00:00:00Z', 20);
  END IF;

  -- ── H.R. 3838 — FY2026 NDAA ─────────────────────────────────────────────────
  SELECT id INTO m_ndaa FROM vr_measures WHERE number = 'H.R. 3838' AND congress = 119 LIMIT 1;
  IF m_ndaa IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_ndaa) THEN
    SELECT id INTO p_pay FROM vr_measure_provisions WHERE measure_id = m_ndaa AND label = '3.8% military pay raise' LIMIT 1;
    SELECT id INTO p_top FROM vr_measure_provisions WHERE measure_id = m_ndaa AND label = '$900.6B national-defense topline' LIMIT 1;
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_ndaa, p_pay, 'working_middle', 'benefit', NULL, NULL,
       '3.8% pay raise for all service members',
       'Compensation for service-member households',
       'Congressional Budget Office', CBO_NDAA,
       'The Act carries the statutory 3.8% basic-pay raise for all service members (effective January 1, 2026), a 60% increase in the Family Separation Allowance, and $1.5B for barracks, housing and child-care construction. Military personnel authorizations rise about $11.5 billion (6%).',
       'strong', '2025-09-01T00:00:00Z', 10),

      (m_ndaa, p_top, 'large_corporations', 'benefit', NULL, NULL,
       'about $884B FY2026 defense authorization; multiyear weapons procurement',
       'Defense procurement and contracts',
       'Congressional Budget Office', CBO_NDAA,
       'CBO estimates the Act increases outlays by about $868 billion over 2026–2035, including multiyear procurement of weapons systems executed largely through defense contractors. Per-contractor distribution is not scored, so this is graded Limited.',
       'limited', '2025-09-01T00:00:00Z', 20);
  END IF;

  -- ── S.J.Res. 37 — Terminate the Canada tariff emergency ─────────────────────
  SELECT id INTO m_tar FROM vr_measures WHERE number = 'S.J.Res. 37' AND congress = 119 LIMIT 1;
  IF m_tar IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_tar) THEN
    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      (m_tar, NULL, 'working_middle', 'benefit', NULL, NULL,
       'removes a regressive consumer cost (heaviest on lowest incomes)',
       'Relief from tariff costs, as a share of income',
       'The Budget Lab at Yale', YALE_TAR,
       'The Budget Lab finds the 2025 tariffs (which include the Canada IEEPA tariffs this resolution would end) are regressive: the lowest income tenth bears a burden about three times the top tenth as a share of income. Ending the tariff relieves that burden, most as a share of income for lower earners. The Canada-specific magnitude is not separately published (graded Limited), and ending the tariff also reduces federal tariff revenue.',
       'limited', '2025-09-04T00:00:00Z', 10),

      (m_tar, NULL, 'high_income_wealth', 'benefit', NULL, NULL,
       'relief too, but a far smaller share of income',
       'Relief from tariff costs, as a share of income',
       'The Budget Lab at Yale', YALE_TAR,
       'By the Budget Lab estimates, the top income tenth also gains from ending the tariff but loses only about one-third as much as the bottom tenth as a share of income (a larger absolute dollar amount).',
       'limited', '2025-09-04T00:00:00Z', 20);
  END IF;
END $$;
