-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — second wave of honest multi-issue mappings (data-only)
-- ─────────────────────────────────────────────────────────────────────────────
-- Only a handful of measures in the record qualified as multi-issue, so the
-- per-issue split machinery (vr_measure_issues.support_meaning, the component
-- breakdown on Voting Record cards, the omnibus provenance chip on Official
-- Record) had very little real data to work with. This migration audits the
-- measures already in the voting-record tables and adds SECOND and THIRD issue
-- mappings where the measure's own text genuinely and primarily touches more
-- than one key in the existing ISSUE_MAP vocabulary.
--
-- Changes NO schema and adds NO scoring logic. INSERTs into vr_measure_issues
-- ONLY, every insert with ON CONFLICT (measure_id, issue_key) DO NOTHING against
-- the existing unique index, so it is fully additive and idempotent: existing
-- primary mappings are left untouched and re-applying this migration is a no-op.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
-- Curation rules applied (same rules as the H.R. 1 component-issue wave):
--   * Only map when the nexus is REAL and PRIMARY — the measure's operative text,
--     not a single line item or a rhetorical association.
--   * Every mapping carries a short rationale and a canonical Congress.gov source.
--   * Directional claims (support_meaning) are read off the measure's own text.
--   * SKIPPED: rule resolutions (H.Res. 1398 / 1423 / 1438 — "providing for
--     consideration of"), which differentiate nobody on policy; near-unanimous
--     votes (H.R. 6329 passed 362-1 under suspension); commemorative/naming
--     bills; and any mapping whose direction could not be read from the text.
--   * Deliberately NOT mapped, and why, so a later wave does not re-litigate:
--       - H.Con.Res. 113 (FY2027 budget resolution): a budget resolution's
--         direction on cut_spending / gov_balance depends on the budgetary levels
--         it sets, which are not in our record. No honest direction to assert.
--       - H.R. 8800 (NDAA FY2027): its adopted riders are ALREADY seeded as their
--         own measures with their own mappings (H.Amdt. 253 → gun_rights,
--         H.Amdt. 254/255/256 → lgbtq_rights, H.Amdt. 257 → school_choice).
--         Re-mapping the parent bill to the same keys would double-count one
--         member on one policy. The rider votes are the honest representation.
--       - S. 2296 (NDAA FY2026): the House counterpart (H.R. 3838) carries a
--         `veterans` mapping citing a specific pay-raise provision; we have no
--         evidence of that provision in the Senate text, so it is not mirrored.
--       - foreign_balance ("keep a strong military but lead through NATO and
--         allied diplomacy") is mapped ONLY onto the two amendments that are
--         unambiguously about ALLIED MILITARY cooperation (Ukraine security
--         assistance, funding foreign personnel in joint exercises). It is NOT
--         mapped onto the soft-power defund amendments (Fulbright, UN funding)
--         or the war-powers resolutions: that key bundles military posture with
--         diplomacy, so using it there would manufacture contradictions for
--         members who back diplomacy while opposing military entanglement.
--
-- Measures are resolved by their natural keys (number + congress) — each of the
-- eleven below is unique on that pair — never by hard-coded serials, and every
-- block is guarded by IF m_x IS NOT NULL so the migration is safe on a database
-- where a given measure has not been ingested.
DO $$
DECLARE
  m_hr1181   integer;
  m_hr8595   integer;
  m_hr9770   integer;
  m_ha232    integer;
  m_ha234    integer;
  m_ha237    integer;
  m_ha251    integer;
  m_ha252    integer;
  m_ha255    integer;
  m_hcr89    integer;
  m_hcr108   integer;
BEGIN
  -- ── H.R. 1181 — Protecting Privacy in Purchases Act ────────────────────────
  -- Already mapped: gun_rights (primary). The bill's operative mechanism is a
  -- restriction on payment-card data, which is a financial-privacy measure in its
  -- own right — the bill's own title says so.
  SELECT id INTO m_hr1181 FROM vr_measures WHERE number = 'H.R. 1181' AND congress = 119 LIMIT 1;
  IF m_hr1181 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr1181, 'privacy_rights', 85, false, 'yea_supports',
        'Bars payment-card networks from assigning firearms retailers a distinct merchant category code, so lawful purchases are not singled out in payment data; a yea advances financial-purchase privacy.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1181')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 8595 — National Security, Dept of State and Related Programs
  --    Appropriations Act, 2027 (previously UNMAPPED) ─────────────────────────
  -- A full-year appropriations bill is multi-issue by construction. Both keys are
  -- read directly off the title: what it funds, and that it funds it.
  SELECT id INTO m_hr8595 FROM vr_measures WHERE number = 'H.R. 8595' AND congress = 119 LIMIT 1;
  IF m_hr8595 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr8595, 'gov_services', 100, true, 'yea_supports',
        'Full-year appropriations bill funding the Department of State and related international programs; a yea keeps those federal operations and programs funded for FY2027.',
        'https://www.congress.gov/bill/119th-congress/house-bill/8595'),
      (m_hr8595, 'strong_defense', 60, false, 'yea_supports',
        'The same Act makes the FY2027 appropriations for national security programs; a yea funds them.',
        'https://www.congress.gov/bill/119th-congress/house-bill/8595')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.R. 9770 — Continuing appropriations for FY2027 (previously UNMAPPED) ──
  -- Mirrors the treatment already applied to H.R. 1968 (the FY2025 CR): a CR both
  -- keeps programs funded and continues deficit-level spending. The national_debt
  -- weight is deliberately low and the rationale states the counterfactual, since
  -- the alternative to a CR is a lapse in appropriations, not savings.
  SELECT id INTO m_hr9770 FROM vr_measures WHERE number = 'H.R. 9770' AND congress = 119 LIMIT 1;
  IF m_hr9770 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hr9770, 'gov_services', 100, true, 'yea_supports',
        'Continuing resolution funding federal operations into FY2027; a yea keeps the government open and existing programs running.',
        'https://www.congress.gov/bill/119th-congress/house-bill/9770'),
      (m_hr9770, 'national_debt', 35, false, 'yea_opposes',
        'Continues federal spending at existing levels without offsets while the budget runs a deficit, so a yea is tagged as cutting against debt reduction. Weighted low on purpose: the alternative on the floor was a lapse in appropriations, not spending cuts.',
        'https://www.congress.gov/bill/119th-congress/house-bill/9770')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 232 (Boebert) — eliminate Fulbright Program funding
  --    (previously UNMAPPED) ───────────────────────────────────────────────────
  SELECT id INTO m_ha232 FROM vr_measures WHERE number = 'H.Amdt. 232' AND congress = 119 LIMIT 1;
  IF m_ha232 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha232, 'cut_spending', 100, true, 'yea_supports',
        'The amendment''s operative effect is to zero out an existing federal appropriation; a yea cuts that spending.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/232'),
      (m_ha232, 'america_first_fp', 70, false, 'yea_supports',
        'Ends U.S. funding for an international exchange program, squarely within rethinking foreign-aid and cultural-diplomacy commitments.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/232')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 234 (Fine) — strike $139,575,000 for the Global Environment
  --    Facility. Already mapped: climate_action (primary, yea_opposes) ─────────
  SELECT id INTO m_ha234 FROM vr_measures WHERE number = 'H.Amdt. 234' AND congress = 119 LIMIT 1;
  IF m_ha234 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha234, 'cut_spending', 65, false, 'yea_supports',
        'Strikes a named $139,575,000 appropriation from the bill; a yea reduces federal spending by that amount.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/234'),
      (m_ha234, 'america_first_fp', 55, false, 'yea_supports',
        'Ends a U.S. contribution to a multilateral fund, part of rethinking foreign-aid commitments.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/234')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 237 (Roy) — prohibit any funds to the United Nations
  --    (previously UNMAPPED) ───────────────────────────────────────────────────
  SELECT id INTO m_ha237 FROM vr_measures WHERE number = 'H.Amdt. 237' AND congress = 119 LIMIT 1;
  IF m_ha237 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha237, 'america_first_fp', 100, true, 'yea_supports',
        'Prohibits any funds in the bill from going to the United Nations — a direct vote on U.S. participation in and funding of a multilateral body.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/237'),
      (m_ha237, 'cut_spending', 55, false, 'yea_supports',
        'Removes U.S. contributions to the U.N. from the appropriation; a yea cuts that spending.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/237')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 251 (Crane) — bar DoD from covering the costs of foreign military
  --    personnel in bilateral/multilateral exercises (previously UNMAPPED) ─────
  SELECT id INTO m_ha251 FROM vr_measures WHERE number = 'H.Amdt. 251' AND congress = 119 LIMIT 1;
  IF m_ha251 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha251, 'america_first_fp', 100, true, 'yea_supports',
        'Stops U.S. taxpayers from paying allied nations'' costs to take part in joint exercises; a yea puts that U.S. cost first.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/251'),
      (m_ha251, 'foreign_balance', 70, false, 'yea_opposes',
        'Joint bilateral and multilateral exercises are the working mechanics of allied interoperability; a yea makes them harder to run with partners.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/251'),
      (m_ha251, 'cut_spending', 50, false, 'yea_supports',
        'Bars a category of Department of Defense expenditure; a yea reduces that spending.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/251')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 252 (Crane) — prohibit funds for Ukraine Security Assistance
  --    except U.S. embassy security (previously UNMAPPED) ─────────────────────
  SELECT id INTO m_ha252 FROM vr_measures WHERE number = 'H.Amdt. 252' AND congress = 119 LIMIT 1;
  IF m_ha252 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha252, 'america_first_fp', 100, true, 'yea_supports',
        'Cuts off U.S. security assistance to Ukraine, the clearest floor test of rethinking overseas commitments.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/252'),
      (m_ha252, 'restraint', 80, false, 'yea_supports',
        'Ends U.S. military assistance to an ongoing foreign conflict; a yea limits U.S. involvement in it.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/252'),
      (m_ha252, 'foreign_balance', 60, false, 'yea_opposes',
        'Withdraws the security assistance the United States coordinates with NATO partners; a yea cuts against leading through allied commitments.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/252'),
      (m_ha252, 'strong_defense', 50, false, 'yea_opposes',
        'Opponents held that ending security assistance weakens deterrence against a hostile power; a yea cuts against that view. Same framing as the S.J.Res. 59 mapping already in the record.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/252')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Amdt. 255 (Mace) — prohibit gender-related medical care under TRICARE.
  --    Already mapped: lgbtq_rights (primary, yea_opposes) ────────────────────
  SELECT id INTO m_ha255 FROM vr_measures WHERE number = 'H.Amdt. 255' AND congress = 119 LIMIT 1;
  IF m_ha255 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha255, 'healthcare', 55, false, 'yea_opposes',
        'Removes a category of care from what the military health plan will cover; a yea narrows TRICARE coverage rather than expanding access.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/255')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Con.Res. 89 — Iran war powers. Already mapped: restraint (primary).
  --    Mirrors the mapping already carried by its Senate sibling S.J.Res. 59,
  --    minus democracy_balance (that key is "Secure & Accessible Voting" in
  --    ISSUE_MAP, not congressional checks and balances — see notes below). ────
  SELECT id INTO m_hcr89 FROM vr_measures WHERE number = 'H.Con.Res. 89' AND congress = 119 LIMIT 1;
  IF m_hcr89 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hcr89, 'america_first_fp', 70, false, 'yea_supports',
        'A yea presses against open-ended U.S. involvement in a new Middle East conflict.',
        'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89'),
      (m_hcr89, 'strong_defense', 55, false, 'yea_opposes',
        'Opponents held that constraining the commander-in-chief would weaken deterrence; a yea cuts against that view.',
        'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ── H.Con.Res. 108 — Lebanon war powers. Already mapped: restraint (primary) ─
  SELECT id INTO m_hcr108 FROM vr_measures WHERE number = 'H.Con.Res. 108' AND congress = 119 LIMIT 1;
  IF m_hcr108 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_hcr108, 'america_first_fp', 70, false, 'yea_supports',
        'A yea presses against continued U.S. military involvement abroad without congressional authorization.',
        'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/108'),
      (m_hcr108, 'strong_defense', 55, false, 'yea_opposes',
        'Opponents held that ordering a withdrawal would weaken deterrence and U.S. posture in the region; a yea cuts against that view.',
        'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/108')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 23 mappings across 11 measures. Six measures (H.R. 8595, H.R. 9770,
-- H.Amdt. 232, 237, 251, 252) had NO issue mapping at all and were therefore
-- invisible to the Official Record engine; five more (H.R. 1181, H.Amdt. 234,
-- H.Amdt. 255, H.Con.Res. 89, H.Con.Res. 108) go from single-issue to multi-issue
-- and will now render the component breakdown on their Voting Record cards.
-- ─────────────────────────────────────────────────────────────────────────────
