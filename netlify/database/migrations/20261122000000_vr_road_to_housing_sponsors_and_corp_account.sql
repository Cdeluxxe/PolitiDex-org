-- ────────────────────────────────────────────────────────────────────────────
-- 21st Century ROAD to Housing Act — H.R. 6644 (119th, Public Law 119-101):
-- its sponsors on file, and Title X on econ_corp_account
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. One vr_measure_issues row and 31 vr_positions rows on the
-- existing H.R. 6644 measure. Nothing is created around it: a branch with no
-- H.R. 6644 (119, house) row RAISEs, because the measure, its roll calls and
-- its five issue rows were filed by earlier waves and must not be re-invented.
--
-- THE HOUSING AFFORDABILITY ROW IS NOT TOUCHED. `housing` stays exactly as
-- 20261018000000_vr_federal_wave_f4 left it — weight 80, primary, yea_supports,
-- its rationale and its source — and so do housing_build, housing_support,
-- crypto_cbdc and permitting_reform. No weight, primary flag or polarity moves.
-- The verification block below RAISEs if housing or housing_build (weight 100,
-- primary beside it) reads differently.
--
-- THE SPONSORS ARE THE RECORD'S. Congress.gov (read 2026-10-18) lists Rep.
-- J. French Hill as sponsor and 31 co-sponsors. 30 of them are roster files and
-- get a row; Rep. David Scott (D-GA-13) is not a roster file, so he gets none —
-- the bill page counts him among "others" and names nobody it cannot link.
--
-- THE OTHER ISSUE. The enacted text was read title by title against the
-- vocabulary. One key it touches carries no row yet:
--   · econ_corp_account, from Title X ("Home-Ownership for Main Street
--     America"), Sec. 1001 "Homes are for people, not corporations": "No large
--     institutional investor may purchase, or enter into a contract to directly
--     or indirectly purchase, any single-family home", a large institutional
--     investor being a for-profit entity with investment control of "not less
--     than 350 single-family homes". A federal restriction on what large
--     corporations may do in a consumer market is how this key has been used
--     (the IRA's corporate minimum tax, solar-retailer and payday-lender duties).
--     A whole title, as crypto_cbdc on this Act is Title XI. Weight 55, secondary.
-- Read and NOT filed, each for a reason already written on this Act:
--   veterans and homeless (20260918000000: Sec. 602 is a housing-eligibility
--   rule the housing row holds; Sec. 503 is one waiver, below floor);
--   disaster_resilience (20261018000000: Sec. 504 is one section of twelve
--   titles); rural_ag (its written scope is farm and ranch economics; the Rural
--   Housing Service is housing). Title IX's community-bank provisions fit no
--   key in the vocabulary. No new issue key.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, pole or new key. The permitting
-- reform bill (S. 5653) is not touched. Like this Act's housing_support,
-- crypto_cbdc and permitting_reform rows, the new row lives in this migration
-- only: db/vr-issue-seed.json keeps H.R. 6644 at its two housing axes, which
-- the pack fixtures pin. Its effect line is
-- _DOS_EFFECT['H.R. 6644|119|econ_corp_account'] in consistency.js. Pinned by
-- scripts/test-road-to-housing.mjs.
--
-- Idempotent: the mapping is guarded by NOT EXISTS, the sponsorship rows by
-- ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING.
--
-- pack-generation: derived — up to 1 vr_measure_issues row below, guarded by
--   NOT EXISTS so a re-run is a no-op. The row that lands moves mappingVersion()
--   in netlify/lib/vr-pack.ts, so every member pack built on the old mapping is
--   retired by its key.

-- H.R. 6644 · 119th · 21st Century ROAD to Housing Act — econ_corp_account, sponsors
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 6644'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'ROAD to Housing: H.R. 6644 (119, house) is not in vr_measures. This pass adds to an existing measure and creates none.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'econ_corp_account') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'econ_corp_account', 55, false,
      'yea_supports', 'Title X, Sec. 1001 ("Homes are for people, not corporations") provides that "No large institutional investor may purchase, or enter into a contract to directly or indirectly purchase, any single-family home", a large institutional investor being a for-profit entity with investment control of "not less than 350 single-family homes", and has HUD set up a renter outreach resource for renters of homes such investors own. Restricting what large corporations may do in a consumer market is this key''s subject, so a yea supports it. Counter-provisions: excepted purchases include build-to-rent, renovate-to-rent and rent-to-own programs, and no investor must sell a home it already owns. Weighted 55, secondary: one title of a housing act whose primary row is housing.', 'https://www.govinfo.gov/content/pkg/PLAW-119publ101/html/PLAW-119publ101.htm');
  END IF;

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Rep. Hill, J. French (R-AR-2)
    (m_id, 'french_hill', 'sponsor', true, TIMESTAMPTZ '2025-12-11T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Lead sponsor. Introduced H.R. 6644 on 2025-12-11.'),
    -- Rep. Waters, Maxine (D-CA-43)
    (m_id, 'maxine_waters', 'cosponsor', true, TIMESTAMPTZ '2025-12-11T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-12-11.'),
    -- Rep. Flood, Mike (R-NE-1)
    (m_id, 'mike_flood', 'cosponsor', true, TIMESTAMPTZ '2025-12-11T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-12-11.'),
    -- Rep. Cleaver, Emanuel (D-MO-5)
    (m_id, 'emanuel_cleaver', 'cosponsor', true, TIMESTAMPTZ '2025-12-11T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-12-11.'),
    -- Rep. Green, Al (D-TX-9)
    (m_id, 'al_green', 'cosponsor', true, TIMESTAMPTZ '2025-12-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2025-12-15.'),
    -- Rep. Sessions, Pete (R-TX-17)
    (m_id, 'pete_sessions', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Velázquez, Nydia M. (D-NY-7)
    (m_id, 'nydia_velazquez', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Rose, John W. (R-TN-6)
    (m_id, 'john_rose', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Sherman, Brad (D-CA-32)
    (m_id, 'brad_sherman', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Steil, Bryan (R-WI-1)
    (m_id, 'bryan_steil', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Stutzman, Marlin A. (R-IN-3)
    (m_id, 'marlin_stutzman', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Beatty, Joyce (D-OH-3)
    (m_id, 'joyce_beatty', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Meuser, Daniel (R-PA-9)
    (m_id, 'daniel_meuser', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Pressley, Ayanna (D-MA-7)
    (m_id, 'ayanna_pressley', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Kim, Young (R-CA-40)
    (m_id, 'young_kim', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Tlaib, Rashida (D-MI-12)
    (m_id, 'tlaib', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Garbarino, Andrew R. (R-NY-2)
    (m_id, 'garbarino', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Torres, Ritchie (D-NY-15)
    (m_id, 'torres', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Lawler, Michael (R-NY-17)
    (m_id, 'mike_lawler', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Garcia, Sylvia R. (D-TX-29)
    (m_id, 'sylvia_garcia', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. De La Cruz, Monica (R-TX-15)
    (m_id, 'monica_de_la_cruz', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Pettersen, Brittany (D-CO-7)
    (m_id, 'brittany_pettersen', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Nunn, Zachary (R-IA-3)
    (m_id, 'zach_nunn', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Fields, Cleo (D-LA-6)
    (m_id, 'cleo_fields', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Salazar, Maria Elvira (R-FL-27)
    (m_id, 'maria_salazar', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Bynum, Janelle S. (D-OR-5)
    (m_id, 'janelle_bynum', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Downing, Troy (R-MT-2)
    (m_id, 'troy_downing', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Liccardo, Sam T. (D-CA-16)
    (m_id, 'sam_liccardo', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Haridopolos, Mike (R-FL-8)
    (m_id, 'mike_haridopolos', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Moskowitz, Jared (D-FL-23)
    (m_id, 'jared_moskowitz', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.'),
    -- Rep. Moore, Tim (R-NC-14)
    (m_id, 'tim_moore', 'cosponsor', true, TIMESTAMPTZ '2026-01-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/6644/cosponsors', 'Cosponsor, joined 2026-01-15.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- VERIFICATION — the five rows already on file read exactly as they did.
DO $$
DECLARE m_id integer; n integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 6644' LIMIT 1;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'housing'
     AND weight = 80 AND is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'ROAD to Housing: the housing row on H.R. 6644 no longer reads weight 80, primary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'housing_build'
     AND weight = 100 AND is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'ROAD to Housing: the housing_build row on H.R. 6644 no longer reads weight 100, primary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'econ_corp_account' AND NOT is_primary;
  IF n <> 1 THEN
    RAISE EXCEPTION 'ROAD to Housing: expected one secondary econ_corp_account row on H.R. 6644, found %.', n;
  END IF;
  SELECT count(*) INTO n FROM vr_positions
   WHERE measure_id = m_id AND action_type IN ('sponsor', 'cosponsor');
  RAISE NOTICE 'ROAD to Housing: % sponsorship row(s) on H.R. 6644.', n;
END $$;
