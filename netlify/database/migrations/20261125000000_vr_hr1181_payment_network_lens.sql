-- ────────────────────────────────────────────────────────────────────────────
-- Protecting Privacy in Purchases Act — H.R. 1181 (119th): the payment-network
-- row its text carries
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. One vr_measure_issues row on the existing H.R. 1181 measure.
-- Nothing is created around it: a branch with no H.R. 1181 (119, house) row
-- RAISEs, because the measure, its two roll calls (house 119/2 rolls 239 and
-- 240) and its three issue rows were filed by earlier passes and must not be
-- re-invented.
--
-- THE THREE ROWS ALREADY ON FILE ARE NOT TOUCHED. gun_rights (100, primary,
-- yea_supports; 20260724140000), privacy_rights (secondary, yea_supports;
-- 20260725000000 at 85 — the 55 that 20260912000000 offered for the same pair
-- met ON CONFLICT DO NOTHING) and states_federal_power (40, secondary,
-- yea_opposes; 20260912000000) keep their weight, primary flag, polarity,
-- rationale and source. The verification block below RAISEs if any of them
-- reads differently. Each already prints an effect line, stored in
-- _DOS_EFFECT, so none is added for them.
--
-- STATUS, FROM THE RECORD ON FILE (db/bill-record.json). Introduced
-- 2025-02-11 by Rep. Riley M. Moore (R-WV-2); reported, amended, by the House
-- Financial Services Committee 2026-02-25 (H. Rept. 119-522); passed by the
-- House 221-201 on 2026-07-14 (roll no. 240). Not law.
--
-- THE TEXT, READ AGAINST THE VOCABULARY. The engrossed text (BILLS-119hr1181eh)
-- is one operative section, already read by 20260912000000:
--   · econ_corp_account, weight 30, secondary, yea_supports. Sec. 2(a) bars a
--     payment card network from requiring, and a covered entity from
--     assigning, any merchant category code used only or primarily for
--     firearms retailers; Sec. 2(b) has the Attorney General enforce that
--     against the networks and entities through a public complaint process,
--     investigations and injunctions. A federal restriction on what large
--     corporations may do in a consumer market is how this key has been used
--     (H.R. 5376 (117th)'s corporate minimum tax, H.R. 6644 (119th)'s Title
--     X). The rule is aimed at one coding practice, not at prices or market
--     power, so the weight is held low.
-- Read and NOT filed:
--   gun_safety — reviewed by 20260818000000 and declined again here. The
--     facet covers screening, removal, storage and trafficking rules; the Act
--     changes none of them, and the purchase-tracking question it does answer
--     is the gun_rights row's.
--   gov_regulation — its written scope excludes what a particular rule should
--     say; a sector's rule belongs to the sector's key, which is this one.
--   tech_balance — tech-platform data, online-safety and age-verification
--     duties; the purchase-data side is already the privacy_rights row.
--   econ_smallbiz — the Act changes no licence, permit, paperwork or capital
--     cost a small business carries.
--   gun_balance — not a facet; its chip asks for background checks and
--     red-flag laws, which the Act does not touch.
-- No new issue key.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, sponsorship row, pole or new
-- key, and no other measure is touched. The record on file names the sponsor
-- and co-sponsors but stores no co-sponsorship dates, so no sponsorship row is
-- filed here. Like H.R. 6644's and H.R. 1's later secondary rows, the new row
-- lives in this migration only: db/vr-issue-seed.json keeps H.R. 1181 at its
-- three rows. Its effect line is _DOS_EFFECT['H.R. 1181|119|econ_corp_account']
-- in consistency.js. Pinned by scripts/test-hr1181-full-lens.mjs.
--
-- Idempotent: the mapping is guarded by NOT EXISTS.
--
-- pack-generation: derived — up to 1 vr_measure_issues row below, guarded by
--   NOT EXISTS so a re-run is a no-op. The row that lands moves mappingVersion()
--   in netlify/lib/vr-pack.ts, so every member pack built on the old mapping is
--   retired by its key.

-- H.R. 1181 · 119th · Protecting Privacy in Purchases Act — econ_corp_account
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 1181'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'H.R. 1181: H.R. 1181 (119, house) is not in vr_measures. This pass adds to an existing measure and creates none.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_corp_account') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_corp_account', 30, false,
      'yea_supports', 'Sec. 2(a) bars a payment card network from requiring, and a covered entity from assigning, any merchant category code used only or primarily for firearms retailers or identifying a retailer as selling firearms, and Sec. 2(b) makes the Attorney General enforce it against those networks and entities through a public complaint process, investigations and injunctions. A federal rule on what payment card networks may require of the merchants that take their cards, enforced by the Justice Department, restricts what large corporations may do in a consumer market, which is this key''s subject, so a yea supports it. Counter-reading: the rule is aimed at one coding practice, not at prices, competition or market power. Weighted 30, secondary: the same prohibition the gun_rights row reads from the firearms side and the privacy_rights row from the purchase-data side, read here on the payment-network side.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr1181eh/html/BILLS-119hr1181eh.htm');
  END IF;
END $$;

-- VERIFICATION — the three rows already on file read exactly as they did.
DO $$
DECLARE m_id integer; n integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 1181' LIMIT 1;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'gun_rights'
     AND weight = 100 AND is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'H.R. 1181: the gun_rights row no longer reads weight 100, primary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'privacy_rights'
     AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'H.R. 1181: the privacy_rights row no longer reads secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'states_federal_power'
     AND weight = 40 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'H.R. 1181: the states_federal_power row no longer reads weight 40, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND is_primary;
  IF n <> 1 THEN
    RAISE EXCEPTION 'H.R. 1181: expected gun_rights to be the one primary row, found % primary row(s).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'econ_corp_account'
     AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'H.R. 1181: expected one secondary yea_supports econ_corp_account row, found %.', n;
  END IF;
END $$;
