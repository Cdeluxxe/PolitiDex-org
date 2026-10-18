-- ────────────────────────────────────────────────────────────────────────────
-- Laken Riley Act — H.R. 29 and S. 5 (119th): the House companion's identity
-- and its four rows, re-asserted so the record can address it
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS ON THE LIVE BRANCH. Nothing. Every statement below is guarded:
-- the H.R. 29 measure row is created only if absent, its four issue rows are
-- ON CONFLICT (measure_id, issue_key) DO NOTHING, and S. 5 is only read. On a
-- branch built from the applied migrations every guard finds its row and the
-- file is a no-op, so no score, weight, direction or rationale on either
-- vehicle moves.
--
-- WHY IT EXISTS. H.R. 29 was created by the very first voting-record migration
-- (20260710184027_create_voting_record_tables), which is a directory, not a
-- top-level .sql file. scripts/vr-measure-addresses.mjs — the offline
-- projection the bill pages, the sitemap, the eye's bill index and the person
-- drawer's /b/ doors are built from — reads top-level files only, so H.R. 29
-- had a measure, a House roll call (119/1/6, 264-159), four issue rows and
-- member votes, and no /b/ page. Teaching the projection to read that
-- directory would also publish H.R. 9311, a stale "Senate Amendments to H.R.
-- 29" identity and two issue keys later migrations re-keyed, so the identity
-- is re-asserted here instead, in the form 20260804000000 used to create S. 5
-- and 20260807000000 used to re-assert S. 5's four rows.
--
-- THE IDENTITY, FROM THE RECORD ALREADY ON FILE. 20260804000000 established
-- from GPO BILLSTATUS-119hr29 and the Clerk's roll 6 that H.R. 29 (Rep. Mike
-- Collins, R-GA-10, introduced 2025-01-03) passed the House 264-159 on
-- 2025-01-07, was placed on the Senate calendar and went no further; S. 5 is
-- Public Law 119-1. Status here is that repair's 'passed_house'; external_ids
-- carry no public law.
--
-- THE FOUR ROWS, SHARED BY BOTH VEHICLES (read, not changed):
--   deportations      100 primary   yea_supports
--   border_security    70 secondary yea_supports
--   tough_on_crime     55 secondary yea_supports
--   state_standing     40 secondary yea_supports
-- (state_standing is the 20260904000000 re-key of states_federal_power on both
-- vehicles.) The rationales below are H.R. 29's as db/vr-issue-seed.json holds
-- them. The verification block RAISEs unless both vehicles carry exactly these
-- four keys at these weights, flags and directions.
--
-- READ AND NOT FILED, on either vehicle:
--   immig_balance — a pairing chip ("Pair strong border security with earned
--     legal pathways"); pairing chips need both halves (runbook, "Two scope
--     answers"). The Act is enforcement only: no visa, status or pathway.
--   justice_balance — a pairing chip (police funding with accountability) and
--     a _balance key no instrument may be parked on (F6/F7). The Act funds no
--     police and adds no accountability rule.
--   back_police — the detainer in Sec. 2 asks state and local police to hand
--     over custody; it funds and backs no law enforcement.
--   immig_fentanyl — no drug or cartel provision.
--   immigration_reform — no earned status for anyone.
--   states_federal_power — Sec. 3 lets a State sue; whose rule governs a
--     shared subject is not changed. That question was re-keyed to
--     state_standing for exactly this reason.
-- No new issue key.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, sponsorship row, provision
-- or action row; no UPDATE and no DELETE. The two short lines H.R. 29 lacked
-- (deportations, state_standing) are _DOS_EFFECT entries in consistency.js.
-- Pinned by scripts/test-laken-riley-full-lens.mjs.
--
-- pack-generation: derived — up to 4 vr_measure_issues rows below, each
--   ON CONFLICT DO NOTHING, so on any branch that already holds them nothing
--   lands and mappingVersion() in netlify/lib/vr-pack.ts does not move.

DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 29'
   LIMIT 1;

  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 29', 'Laken Riley Act', 'Laken Riley Act',
       'Requires federal detention of unauthorized immigrants charged with theft-related '
       || 'and certain other crimes. Passed the House 264-159 on 2025-01-07 and was placed '
       || 'on the Senate calendar; the Senate vehicle, S. 5, became Public Law 119-1.',
       NULL, TIMESTAMPTZ '2025-01-03T00:00:00Z', NULL, 'passed_house',
       'https://www.congress.gov/bill/119th-congress/house-bill/29',
       'Congress.gov',
       '{"congressGovId":"hr29-119"}'::jsonb)
    RETURNING id INTO m_id;
    RAISE NOTICE 'created vr_measures H.R. 29 as id %', m_id;
  END IF;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
    (m_id, 'deportations', 100, true, 'yea_supports',
      'Mandates detention and removal proceedings for covered unauthorized immigrants.',
      'https://www.congress.gov/bill/119th-congress/house-bill/29'),
    (m_id, 'border_security', 70, false, 'yea_supports',
      'Section 2 requires the Department of Homeland Security to detain an inadmissible alien charged with, arrested for, convicted of or admitting burglary, theft, larceny or shoplifting, to issue a detainer and take custody from state or local police, and to place them in removal proceedings. Detaining and removing people already found inadmissible is interior enforcement of the same immigration line this chip measures at the border, so a yea tightens it. Weighted 70 rather than at the primary because the bill adds no border infrastructure, personnel or asylum change of its own.',
      'https://www.congress.gov/bill/119th-congress/house-bill/29'),
    (m_id, 'tough_on_crime', 55, false, 'yea_supports',
      'Section 2 of the bill as passed the House adds a new INA 236(c)(1)(E) requiring the Secretary of Homeland Security to detain an inadmissible alien charged with, arrested for, convicted of, or who admits having committed burglary, theft, larceny or shoplifting, and to issue a detainer and take custody. A yea attaches a mandatory custodial consequence to those offences. Weighted 55, identical to S. 5''s mapping, so the two Laken Riley vehicles score the same axis at the same strength. Note the House bill reaches ONLY those four property offences: assault of a law enforcement officer and crimes resulting in death or serious bodily injury entered the statute later, through the Senate''s S.Amdt. 14 and S.Amdt. 8.',
      'https://www.congress.gov/bill/119th-congress/house-bill/29'),
    (m_id, 'state_standing', 40, false, 'yea_supports',
      'Section 3, ''Enforcement by attorney general of a State'', amends INA 235(b) (8 U.S.C. 1225(b)) to give the attorney general of a State, or another authorised State officer, standing to sue the Secretary of Homeland Security in federal district court over alleged violations of the detention and removal requirements that harm the State or its residents. A yea creates a state cause of action against the federal government. Weighted 40, identical to S. 5''s mapping. The same section is what the Senate''s S.Amdt. 23 tried and failed to strike. Re-keyed from states_federal_power in the August 2026 taxonomy split: a cause of action against the federal government now has its own key.',
      'https://www.congress.gov/bill/119th-congress/house-bill/29')
  ON CONFLICT (measure_id, issue_key) DO NOTHING;
END $$;

-- VERIFICATION — both vehicles carry the same four rows and no _balance row.
DO $$
DECLARE
  v record;
  n integer;
BEGIN
  FOR v IN SELECT id, number FROM vr_measures
            WHERE congress = 119 AND measure_type = 'bill'
              AND ((chamber = 'house' AND number = 'H.R. 29') OR (chamber = 'senate' AND number = 'S. 5'))
  LOOP
    SELECT count(*) INTO n FROM vr_measure_issues
     WHERE measure_id = v.id AND (
           (issue_key = 'deportations'    AND weight = 100 AND is_primary     AND support_meaning = 'yea_supports')
        OR (issue_key = 'border_security' AND weight = 70  AND NOT is_primary AND support_meaning = 'yea_supports')
        OR (issue_key = 'tough_on_crime'  AND weight = 55  AND NOT is_primary AND support_meaning = 'yea_supports')
        OR (issue_key = 'state_standing'  AND weight = 40  AND NOT is_primary AND support_meaning = 'yea_supports'));
    IF n <> 4 THEN
      RAISE EXCEPTION 'Laken Riley: % no longer carries the four shared rows as filed (found % matching).', v.number, n;
    END IF;
    SELECT count(*) INTO n FROM vr_measure_issues WHERE measure_id = v.id;
    RAISE NOTICE 'Laken Riley: % carries % issue row(s).', v.number, n;
    SELECT count(*) INTO n FROM vr_measure_issues
     WHERE measure_id = v.id AND issue_key LIKE '%\_balance' ESCAPE '\';
    IF n <> 0 THEN
      RAISE EXCEPTION 'Laken Riley: % carries a _balance row; pairing chips need both halves.', v.number;
    END IF;
  END LOOP;
END $$;
