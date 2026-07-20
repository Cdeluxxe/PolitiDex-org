-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 17: the 2026 Farm Bill (H.R. 7567, House) + pesticide fight
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the House farm-bill reauthorization as a full Legislation-library entry, with
-- a balanced, sourced account of the fight over the pesticide-liability provisions
-- (Secs. 10205–10207) that a bipartisan amendment struck before passage. Data-only,
-- additive, idempotent: the measure is inserted only when absent; provisions/actions
-- are guarded by NOT EXISTS; positions use ON CONFLICT DO NOTHING. Every issue key is
-- from db/issue-keys.json; sources are canonical Congress.gov pages. Rolls forward
-- from the applied migrations; never edits one.
--
-- NEUTRAL FRAMING: the contested provisions are recorded as named provisions clearly
-- marked "removed by bipartisan amendment," so the panel shows what was proposed and
-- what happened, without taking a side. Status is kept conservative ("introduced")
-- pending confirmation of final-chamber passage; the timeline carries the markup and
-- amendment detail.
--
-- Key facts (as provided, neutral):
--   • The House bill included Secs. 10205–10207, which would have given pesticide
--     makers broad liability protection (esp. failure-to-warn claims), limited state
--     authority over labels/usage, and preempted local rules.
--   • A bipartisan amendment led by Reps. Chellie Pingree (D-ME), Anna Paulina Luna
--     (R-FL), and Thomas Massie (R-KY) struck those provisions.
--   • The underlying bill is a major farm-bill reauthorization (commodity supports,
--     crop insurance, SNAP/nutrition, conservation).

DO $$
DECLARE
  m_farm integer;
  BILL text := 'https://www.congress.gov/bill/119th-congress/house-bill/7567';
  ACTS text := 'https://www.congress.gov/bill/119th-congress/house-bill/7567/all-actions';
BEGIN
  SELECT id INTO m_farm FROM vr_measures WHERE number = 'H.R. 7567' AND congress = 119 LIMIT 1;
  IF m_farm IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 7567',
       'Farm, Food, and National Security Act (2026 Farm Bill, House)',
       '2026 Farm Bill (House)',
       'The House farm-bill reauthorization — commodity supports, crop insurance, SNAP/nutrition, and conservation. Its most contested provisions, Secs. 10205–10207, would have shielded pesticide makers from many lawsuits and limited state and local authority over pesticides; a bipartisan amendment struck them before passage.',
       'introduced', BILL, 'Congress.gov', '{}')
    RETURNING id INTO m_farm;

    -- Issue tags: core farm-bill topics plus the consumer / states'-rights angles the
    -- pesticide fight raised (low-weighted, with rationale noting the provisions were
    -- struck) so the bill also surfaces under those Spotlights.
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_farm, 'rural_ag',          100, true,  'yea_supports', 'A major farm-bill reauthorization: commodity programs, crop insurance, and reference prices for producers.'),
      (m_farm, 'family_support',     70, false, 'yea_supports', 'Reauthorizes SNAP and nutrition programs, the largest share of farm-bill spending.'),
      (m_farm, 'enviro_balance',     60, false, 'yea_supports', 'Continues working-lands conservation programs; the pesticide provisions also drew environmental scrutiny.'),
      (m_farm, 'econ_corp_account',  45, false, 'yea_opposes',  'The bill''s Sec. 10205 would have shielded pesticide makers from failure-to-warn suits; a bipartisan amendment struck it, so the enacted text does not include the shield.'),
      (m_farm, 'property_rights',    40, false, 'yea_opposes',  'Secs. 10206–10207 would have limited state label authority and preempted local pesticide rules; both were struck by the same bipartisan amendment.');

    -- Legislative-action timeline (dates left null where not asserted; text carries the
    -- narrative). Sourced to the bill's Congress.gov pages.
    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_farm, 'introduced', 'house', NULL, 'Introduced in the House as the chamber''s farm-bill reauthorization.', BILL, 'Congress.gov', 10),
      (m_farm, 'reported_committee', 'house', NULL, 'Advanced through House Agriculture Committee consideration; the bill as written included the pesticide-liability provisions (Secs. 10205–10207).', ACTS, 'Congress.gov', 20),
      (m_farm, 'other', 'house', NULL, 'A bipartisan amendment led by Reps. Chellie Pingree (D-ME), Anna Paulina Luna (R-FL), and Thomas Massie (R-KY) struck Secs. 10205–10207, removing the pesticide-liability shield and the state/local preemption language.', ACTS, 'Congress.gov', 40);

    -- Named provisions — the omnibus breakdown, including the CONTESTED (removed) ones.
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_farm, 'Commodity & crop-insurance support', 'Reauthorizes farm commodity programs, crop insurance, and reference prices for producers — the traditional core of the farm bill.', 'rural_ag', 'yea_supports', BILL, 10),
      (m_farm, 'Nutrition / SNAP title', 'Reauthorizes SNAP and other nutrition programs, historically the largest share of farm-bill spending.', 'family_support', 'yea_supports', BILL, 20),
      (m_farm, 'Conservation programs', 'Continues working-lands and land-retirement conservation programs for farmers.', 'enviro_balance', 'yea_supports', BILL, 30),
      (m_farm, 'Pesticide liability shield — Sec. 10205 (removed)', 'Would have given pesticide manufacturers broad protection from lawsuits, especially failure-to-warn claims. Struck by a bipartisan amendment (Pingree–Luna–Massie) before passage, so it is not in the final text.', 'econ_corp_account', 'yea_opposes', BILL, 40),
      (m_farm, 'State label/usage limits — Sec. 10206 (removed)', 'Would have limited state authority over pesticide labeling and usage requirements. Struck by the same bipartisan amendment.', 'property_rights', 'yea_opposes', BILL, 50),
      (m_farm, 'Local preemption — Sec. 10207 (removed)', 'Would have preempted local governments from setting their own pesticide rules. Struck by the same bipartisan amendment.', 'property_rights', 'yea_opposes', BILL, 60);

    -- Connect the amendment's bipartisan authors (on-record actions). actedAt is left
    -- null (exact date not asserted); each carries the bill as its source.
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, source_url, note) VALUES
      (m_farm, 'chellie_pingree', 'statement', true, BILL, 'Co-led the bipartisan amendment (adopted) striking the pesticide-liability provisions (Secs. 10205–10207).'),
      (m_farm, 'luna',            'statement', true, BILL, 'Co-led the bipartisan amendment (adopted) striking the pesticide-liability provisions (Secs. 10205–10207).'),
      (m_farm, 'massie',          'statement', true, BILL, 'Co-led the bipartisan amendment (adopted) striking the pesticide-liability provisions (Secs. 10205–10207).')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;
END $$;
