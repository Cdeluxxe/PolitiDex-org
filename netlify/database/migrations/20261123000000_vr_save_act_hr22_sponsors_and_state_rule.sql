-- ────────────────────────────────────────────────────────────────────────────
-- SAVE Act — H.R. 22 (119th): its sponsors on file, and the state-or-federal
-- row its text carries
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. One vr_measure_issues row and 110 vr_positions rows on the
-- existing H.R. 22 measure. Nothing is created around it: a branch with no
-- H.R. 22 (119, house) row RAISEs, because the measure, its roll calls and its
-- four issue rows were filed by earlier waves and must not be re-invented.
--
-- THE FOUR ROWS ALREADY ON FILE ARE NOT TOUCHED. election_integrity (100,
-- primary), election_security (100), voter_id (70) and voting_access (60,
-- yea_opposes) keep their weight, primary flag, polarity, rationale and source.
-- The verification block below RAISEs if any of them reads differently.
--
-- STATUS, READ 2026-10-18. The Congress.gov API lists H.R. 22 as introduced
-- 2025-01-03 by Rep. Chip Roy, passed by the House 220-208 on 2025-04-10 (roll
-- no. 102), and received in the Senate the same day; no later action. Not law.
--
-- THE SPONSORS ARE THE RECORD'S. Congress.gov (read 2026-10-18) lists Rep. Roy
-- as sponsor and 110 co-sponsors, none withdrawn, 53 of them original. 109 of
-- the 110 are roster files and get a row; Rep. Mark E. Green (R-TN-7) is not a
-- roster file, so he gets none — the bill page counts him among "others" and
-- names nobody it cannot link. Each row's date is the record's sponsorshipDate.
--
-- THE OTHER ISSUE. The engrossed text (BILLS-119hr22eh) was read section by
-- section against the vocabulary. It is word for word the engrossed text of
-- H.R. 8281 (118th) — only the Congress, session, bill number and passage date
-- differ — and 20260915000000_vr_formal_densification_save_risaa_isasa read
-- that text the same way (runbook rule 29). One key it touches carries no row:
--   · states_federal_power, weight 45, secondary, yea_opposes. New NVRA
--     sections 4(b) and 8(j) tell every State it may not register a federal-
--     election applicant without documentary proof "[u]nder any method of voter
--     registration in a State"; sec. 2(k) narrows the section 4(c) exemption;
--     secs. 2(i), 2(j) and 3 make enforcement federal. A yea substitutes a
--     federal rule for the State's own procedure. Secs. 2(f)(1), 2(g) and 7 are
--     the state-side counterweights and are named in the rationale.
-- Read and NOT filed:
--   immig_balance — a pairing chip; the text has neither a border measure nor a
--     pathway. border_security and deportations — nothing in the bill builds at
--     the border or removes anyone; sec. 2(f)'s new 8(j)(5)(D) is a duty to
--     investigate whether to start proceedings. (Both as H.R. 8281.)
--   tough_on_crime — sec. 2(j)'s penalty enforces the registration rule against
--     election officials and executive employees; it is not policing or
--     sentencing, and the elections rows already hold it.
--   privacy_rights — sec. 2(f)'s new 8(j)(5) is agency-to-State citizenship
--     verification, not personal-data or Big Tech duties.
--   state_standing — sec. 2(i)'s private right of action runs against election
--     officials, not a State suing the federal government.
-- No new issue key.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, pole, score input or new key.
-- S. 1383 (the SAVE America Act) and H.R. 8281 are not touched. The corpus copy
-- of the new row is db/vr-issue-seed.json; its effect line is
-- _DOS_EFFECT['H.R. 22|119|states_federal_power'] and its did/why
-- _DOS_MECH['H.R. 22|119|states_federal_power'] in consistency.js. Pinned by
-- scripts/test-save-act-hr22.mjs.
--
-- Idempotent: the mapping is guarded by NOT EXISTS, the sponsorship rows by
-- ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING.
--
-- pack-generation: derived — the fingerprint moves with these rows;
--   confirm with scripts/test-vr-pack-key-version.mjs after the wave lands.

-- H.R. 22 · 119th · SAVE Act — states_federal_power, sponsors
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 22'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'SAVE Act: H.R. 22 (119, house) is not in vr_measures. This pass adds to an existing measure and creates none.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'states_federal_power') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'states_federal_power', 45, false,
      'yea_opposes', 'Section 2(b) inserts a new National Voter Registration Act section 4(b) reading "Under any method of voter registration in a State, the State shall not accept and process an application to register to vote in an election for Federal office unless the applicant presents documentary proof of United States citizenship", and section 2(f)(3)''s new section 8(j) repeats the command "[n]otwithstanding any other provision of this Act". Section 2(a) fixes the list of acceptable documents in federal law rather than leaving it to the State, and section 2(c) subordinates the State motor-vehicle registration channel to the same section 8(j). Section 2(k) reaches the States that had been outside the Act entirely: it narrows the section 4(c) exemption so the new section 8(i) and (j) requirements apply to them, and new section 4(d) lets such a State escape only by adopting requirements "identical to" the federal ones within 60 days of its next federal election. Enforcement is federal too: section 2(i) opens a private right of action against an election official who registers an applicant without the proof, section 2(j) makes that act a federal crime, and section 3 has the Election Assistance Commission transmit implementing guidance to every chief State election official within 10 days. Coded yea_opposes because a yea substitutes a uniform federal rule for the State''s own registration procedure. The provisions running the other way were read and weighed rather than ignored: section 2(f)(1) adds non-compliance with "applicable State law" as a removal ground, section 2(g) clarifies State authority to remove noncitizens, and section 7 preserves State exemptions from federal laws other than the NVRA. Each accommodates the federal mandate rather than leaving the State''s choice standing, which is why the row is directional and why it is weighted at 45 rather than at the level of the citizenship purpose itself. The engrossed text is word for word the text of H.R. 8281 (118th), which carries the same row.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr22eh/html/BILLS-119hr22eh.htm');
  END IF;

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Rep. Roy, Chip (R-TX-21)
    (m_id, 'chip_roy', 'sponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Lead sponsor. Introduced H.R. 22 on 2025-01-03.'),
    -- Rep. Garbarino, Andrew R. (R-NY-2)
    (m_id, 'garbarino', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Malliotakis, Nicole (R-NY-11)
    (m_id, 'nicole_malliotakis', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Finstad, Brad (R-MN-1)
    (m_id, 'brad_finstad', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Clyde, Andrew S. (R-GA-9)
    (m_id, 'andrew_clyde', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Higgins, Clay (R-LA-3)
    (m_id, 'clay_higgins', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Harshbarger, Diana (R-TN-1)
    (m_id, 'diana_harshbarger', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Mace, Nancy (R-SC-1)
    (m_id, 'nancy_mace', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Cammack, Kat (R-FL-3)
    (m_id, 'kat_cammack', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Burlison, Eric (R-MO-7)
    (m_id, 'eric_burlison', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Ogles, Andrew (R-TN-5)
    (m_id, 'andrew_ogles', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Hageman, Harriet M. (R-WY-At Large)
    (m_id, 'harriet_hageman', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Fulcher, Russ (R-ID-1)
    (m_id, 'russ_fulcher', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Nehls, Troy E. (R-TX-22)
    (m_id, 'troy_nehls', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Self, Keith (R-TX-3)
    (m_id, 'keith_self', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Palmer, Gary J. (R-AL-6)
    (m_id, 'gary_palmer', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Crane, Elijah (R-AZ-2)
    (m_id, 'eli_crane', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Hunt, Wesley (R-TX-38)
    (m_id, 'wesley_hunt', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Biggs, Andy (R-AZ-5)
    (m_id, 'andy_biggs', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Cline, Ben (R-VA-6)
    (m_id, 'ben_cline', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Norman, Ralph (R-SC-5)
    (m_id, 'ralph_norman', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Cloud, Michael (R-TX-27)
    (m_id, 'michael_cloud', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Brecheen, Josh (R-OK-2)
    (m_id, 'josh_brecheen', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Crenshaw, Dan (R-TX-2)
    (m_id, 'dan_crenshaw', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Pfluger, August (R-TX-11)
    (m_id, 'pfluger', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Ellzey, Jake (R-TX-6)
    (m_id, 'jake_ellzey', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Allen, Rick W. (R-GA-12)
    (m_id, 'rick_allen', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Dunn, Neal P. (R-FL-2)
    (m_id, 'neal_dunn', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Bilirakis, Gus M. (R-FL-12)
    (m_id, 'gus_bilirakis', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Estes, Ron (R-KS-4)
    (m_id, 'ron_estes', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Arrington, Jodey C. (R-TX-19)
    (m_id, 'arrington', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. McCaul, Michael T. (R-TX-10)
    (m_id, 'michael_mccaul', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Tenney, Claudia (R-NY-24)
    (m_id, 'claudia_tenney', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Harris, Andy (R-MD-1)
    (m_id, 'andy_harris', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Owens, Burgess (R-UT-4)
    (m_id, 'owens', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Bost, Mike (R-IL-12)
    (m_id, 'mike_bost', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Feenstra, Randy (R-IA-4)
    (m_id, 'randy_feenstra', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. McClintock, Tom (R-CA-5)
    (m_id, 'tom_mcclintock', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Edwards, Chuck (R-NC-11)
    (m_id, 'charles_chuck_edwards', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Biggs, Sheri (R-SC-3)
    (m_id, 'sheri_biggs', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Timmons, William R. (R-SC-4)
    (m_id, 'william_timmons', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Moran, Nathaniel (R-TX-1)
    (m_id, 'nathaniel_moran', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Perry, Scott (R-PA-10)
    (m_id, 'scott_perry', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Houchin, Erin (R-IN-9)
    (m_id, 'erin_houchin', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Gosar, Paul A. (R-AZ-9)
    (m_id, 'paul_gosar', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Babin, Brian (R-TX-36)
    (m_id, 'brian_babin', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Miller, Mary E. (R-IL-15)
    (m_id, 'mary_miller', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Weber, Randy K. Sr. (R-TX-14)
    (m_id, 'randy_weber', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Luna, Anna Paulina (R-FL-13)
    (m_id, 'luna', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Moore, Barry (R-AL-1)
    (m_id, 'barry_moore', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Lawler, Michael (R-NY-17)
    (m_id, 'mike_lawler', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Van Drew, Jefferson (R-NJ-2)
    (m_id, 'jefferson_van_drew', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Tiffany, Thomas P. (R-WI-7)
    (m_id, 'thomas_tiffany', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Moolenaar, John R. (R-MI-2)
    (m_id, 'john_moolenaar', 'cosponsor', true, TIMESTAMPTZ '2025-01-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2025-01-03.'),
    -- Rep. Williams, Roger (R-TX-25)
    (m_id, 'roger_williams', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Fischbach, Michelle (R-MN-7)
    (m_id, 'michelle_fischbach', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Emmer, Tom (R-MN-6)
    (m_id, 'emmer', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Langworthy, Nicholas A. (R-NY-23)
    (m_id, 'nicholas_langworthy', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Sessions, Pete (R-TX-17)
    (m_id, 'pete_sessions', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Taylor, David (R-OH-2)
    (m_id, 'david_taylor', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Collins, Mike (R-GA-10)
    (m_id, 'mike_collins', 'cosponsor', true, TIMESTAMPTZ '2025-01-07T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-07.'),
    -- Rep. Lee, Laurel M. (R-FL-15)
    (m_id, 'laurel_lee', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Haridopolos, Mike (R-FL-8)
    (m_id, 'mike_haridopolos', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Van Duyne, Beth (R-TX-24)
    (m_id, 'beth_van_duyne', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Bice, Stephanie I. (R-OK-5)
    (m_id, 'stephanie_bice', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. McCormick, Richard (R-GA-7)
    (m_id, 'rich_mccormick', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Hamadeh, Abraham (R-AZ-8)
    (m_id, 'abraham_hamadeh', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Gooden, Lance (R-TX-5)
    (m_id, 'lance_gooden', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Hinson, Ashley (R-IA-2)
    (m_id, 'ashley_hinson', 'cosponsor', true, TIMESTAMPTZ '2025-01-09T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-09.'),
    -- Rep. Downing, Troy (R-MT-2)
    (m_id, 'troy_downing', 'cosponsor', true, TIMESTAMPTZ '2025-01-22T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-22.'),
    -- Rep. Murphy, Gregory F. (R-NC-3)
    (m_id, 'gregory_murphy', 'cosponsor', true, TIMESTAMPTZ '2025-01-22T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-22.'),
    -- Rep. Goldman, Craig (R-TX-12)
    (m_id, 'craig_goldman', 'cosponsor', true, TIMESTAMPTZ '2025-01-28T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-28.'),
    -- Rep. Webster, Daniel (R-FL-11)
    (m_id, 'daniel_webster', 'cosponsor', true, TIMESTAMPTZ '2025-01-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-31.'),
    -- Rep. Meuser, Daniel (R-PA-9)
    (m_id, 'daniel_meuser', 'cosponsor', true, TIMESTAMPTZ '2025-01-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-31.'),
    -- Rep. Strong, Dale W. (R-AL-5)
    (m_id, 'dale_strong', 'cosponsor', true, TIMESTAMPTZ '2025-01-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-01-31.'),
    -- Rep. Reschenthaler, Guy (R-PA-14)
    (m_id, 'guy_reschenthaler', 'cosponsor', true, TIMESTAMPTZ '2025-02-04T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-04.'),
    -- Rep. Loudermilk, Barry (R-GA-11)
    (m_id, 'barry_loudermilk', 'cosponsor', true, TIMESTAMPTZ '2025-02-04T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-04.'),
    -- Rep. Mills, Cory (R-FL-7)
    (m_id, 'cory_mills', 'cosponsor', true, TIMESTAMPTZ '2025-02-05T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-05.'),
    -- Rep. Thompson, Glenn (R-PA-15)
    (m_id, 'glenn_thompson', 'cosponsor', true, TIMESTAMPTZ '2025-02-06T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-06.'),
    -- Rep. Huizenga, Bill (R-MI-4)
    (m_id, 'bill_huizenga', 'cosponsor', true, TIMESTAMPTZ '2025-02-13T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-13.'),
    -- Rep. McGuire, John (R-VA-5)
    (m_id, 'john_mcguire', 'cosponsor', true, TIMESTAMPTZ '2025-02-14T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-14.'),
    -- Rep. Harris, Mark (R-NC-8)
    (m_id, 'mark_harris', 'cosponsor', true, TIMESTAMPTZ '2025-02-21T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-21.'),
    -- Rep. LaHood, Darin (R-IL-16)
    (m_id, 'darin_lahood', 'cosponsor', true, TIMESTAMPTZ '2025-02-21T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-21.'),
    -- Rep. Moore, Tim (R-NC-14)
    (m_id, 'tim_moore', 'cosponsor', true, TIMESTAMPTZ '2025-02-24T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-02-24.'),
    -- Rep. Rose, John W. (R-TN-6)
    (m_id, 'john_rose', 'cosponsor', true, TIMESTAMPTZ '2025-03-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-03.'),
    -- Rep. Stauber, Pete (R-MN-8)
    (m_id, 'pete_stauber', 'cosponsor', true, TIMESTAMPTZ '2025-03-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-03.'),
    -- Rep. Jack, Brian (R-GA-3)
    (m_id, 'brian_jack', 'cosponsor', true, TIMESTAMPTZ '2025-03-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-03.'),
    -- Rep. Stutzman, Marlin A. (R-IN-3)
    (m_id, 'marlin_stutzman', 'cosponsor', true, TIMESTAMPTZ '2025-03-05T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-05.'),
    -- Rep. Rouzer, David (R-NC-7)
    (m_id, 'david_rouzer', 'cosponsor', true, TIMESTAMPTZ '2025-03-05T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-05.'),
    -- Rep. Fallon, Pat (R-TX-4)
    (m_id, 'pat_fallon', 'cosponsor', true, TIMESTAMPTZ '2025-03-10T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-10.'),
    -- Rep. Jackson, Ronny (R-TX-13)
    (m_id, 'ronny_jackson', 'cosponsor', true, TIMESTAMPTZ '2025-03-10T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-10.'),
    -- Rep. Miller-Meeks, Mariannette (R-IA-1)
    (m_id, 'mariannette_miller_meeks', 'cosponsor', true, TIMESTAMPTZ '2025-03-21T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-21.'),
    -- Rep. Womack, Steve (R-AR-3)
    (m_id, 'steve_womack', 'cosponsor', true, TIMESTAMPTZ '2025-03-21T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-21.'),
    -- Rep. McDowell, Addison (R-NC-6)
    (m_id, 'addison_mcdowell', 'cosponsor', true, TIMESTAMPTZ '2025-03-21T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-21.'),
    -- Rep. LaLota, Nick (R-NY-1)
    (m_id, 'nicolas_lalota', 'cosponsor', true, TIMESTAMPTZ '2025-03-24T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-24.'),
    -- Rep. Joyce, John (R-PA-13)
    (m_id, 'john_joyce', 'cosponsor', true, TIMESTAMPTZ '2025-03-25T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-25.'),
    -- Rep. Crank, Jeff (R-CO-5)
    (m_id, 'jeff_crank', 'cosponsor', true, TIMESTAMPTZ '2025-03-27T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-27.'),
    -- Rep. Donalds, Byron (R-FL-19)
    (m_id, 'donalds', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Knott, Brad (R-NC-13)
    (m_id, 'brad_knott', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Baird, James R. (R-IN-4)
    (m_id, 'james_baird', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Stefanik, Elise M. (R-NY-21)
    (m_id, 'stefanik', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Messmer, Mark (R-IN-8)
    (m_id, 'mark_messmer', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Boebert, Lauren (R-CO-4)
    (m_id, 'boebert', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Moore, Riley (R-WV-2)
    (m_id, 'riley_moore', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Wilson, Joe (R-SC-2)
    (m_id, 'joe_wilson', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Kelly, Mike (R-PA-16)
    (m_id, 'mike_kelly', 'cosponsor', true, TIMESTAMPTZ '2025-03-31T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-03-31.'),
    -- Rep. Westerman, Bruce (R-AR-4)
    (m_id, 'bruce_westerman', 'cosponsor', true, TIMESTAMPTZ '2025-04-03T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-04-03.'),
    -- Rep. Kiley, Kevin (R-CA-3)
    (m_id, 'kevin_kiley', 'cosponsor', true, TIMESTAMPTZ '2025-04-08T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-04-08.'),
    -- Rep. Patronis, Jimmy (R-FL-1)
    (m_id, 'jimmy_patronis', 'cosponsor', true, TIMESTAMPTZ '2025-04-10T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-04-10.'),
    -- Rep. Fine, Randy (R-FL-6)
    (m_id, 'rfine', 'cosponsor', true, TIMESTAMPTZ '2025-04-10T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/22/cosponsors', 'Cosponsor, joined 2025-04-10.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- VERIFICATION — the four rows already on file read exactly as they did.
DO $$
DECLARE m_id integer; n integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 22' LIMIT 1;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'election_integrity'
     AND weight = 100 AND is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'SAVE Act: the election_integrity row on H.R. 22 no longer reads weight 100, primary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'election_security'
     AND weight = 100 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'SAVE Act: the election_security row on H.R. 22 no longer reads weight 100, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'voter_id'
     AND weight = 70 AND NOT is_primary AND support_meaning = 'yea_supports';
  IF n <> 1 THEN
    RAISE EXCEPTION 'SAVE Act: the voter_id row on H.R. 22 no longer reads weight 70, secondary, yea_supports (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'voting_access'
     AND weight = 60 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'SAVE Act: the voting_access row on H.R. 22 no longer reads weight 60, secondary, yea_opposes (found % matching row(s)).', n;
  END IF;
  SELECT count(*) INTO n FROM vr_measure_issues
   WHERE measure_id = m_id AND issue_key = 'states_federal_power'
     AND weight = 45 AND NOT is_primary AND support_meaning = 'yea_opposes';
  IF n <> 1 THEN
    RAISE EXCEPTION 'SAVE Act: expected one secondary states_federal_power row on H.R. 22 (45, yea_opposes), found %.', n;
  END IF;
  SELECT count(*) INTO n FROM vr_positions
   WHERE measure_id = m_id AND action_type IN ('sponsor', 'cosponsor');
  RAISE NOTICE 'SAVE Act: % sponsorship row(s) on H.R. 22.', n;
END $$;
