-- ────────────────────────────────────────────────────────────────────────────
-- Get Money Out of Politics — H.R. 5746 (117th) filed as a secondary row
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. One vr_measure_issues row, is_primary = false: H.R. 5746 (117th),
-- the Freedom to Vote: John R. Lewis Act text the House concurred in on roll 9,
-- onto campaign_finance at weight 55. Its primary row stays voting_access.
-- Titles VI (Campaign Finance Transparency: the DISCLOSE Act and Honest Ads) and
-- VII (Campaign Finance Oversight: stopping super PAC-candidate coordination)
-- are the campaign-money half of the act. The rationale quotes their headings.
--
-- WHAT IT DOES NOT DO. No new measure, no roll call, no vote cell, no primary
-- row moved, no other issue touched. H.R. 1 (117th) already carries its
-- campaign_finance row (20260912000000_vr_formal_densification_multi_issue).
-- The corpus copy of this row is db/vr-issue-seed.json; the effect line is
-- _DOS_EFFECT['H.R. 5746|117|campaign_finance'] in consistency.js. Pinned by
-- scripts/test-money-out-voice.mjs.
--
-- Idempotent: ON CONFLICT (measure_id, issue_key) DO NOTHING, and a branch with
-- no H.R. 5746 (117th) row inserts nothing.
--
-- pack-generation: derived — up to 1 vr_measure_issues row below, guarded
-- by ON CONFLICT DO NOTHING, so mappingVersion() in
-- netlify/functions/voting-record.mts moves with it and every cached pack is
-- rebuilt on its next read; nothing is purged.

DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 5746' AND congress = 117 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'campaign_finance', 55, false, 'yea_supports',
        'Title VI of the Freedom to Vote: John R. Lewis Act text the House concurred in is headed "Campaign Finance Transparency": its Subtitle A, the DISCLOSE Act, includes Sec. 6011 on reporting of campaign-related disbursements and applies the foreign-money ban to covered transfers, and its Subtitle B, Honest Ads, requires online platforms to display notices identifying the sponsors of political advertisements. Title VII, Campaign Finance Oversight, opens with Subtitle A, Stopping Super PAC-Candidate Coordination. A yea enacts those titles; a nay leaves current law. Weighted 55, secondary: two titles of a voting-access act whose primary row is voting_access.',
        'https://www.govinfo.gov/content/pkg/BILLS-117hr5746eah/html/BILLS-117hr5746eah.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;
  RAISE NOTICE 'campaign_finance secondary rows asserted: %', n_rows;
END $$;
