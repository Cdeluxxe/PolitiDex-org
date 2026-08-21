-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — formal densification over the single-key high-traffic measures
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS PASS IS FOR
-- `db/vr-coverage-report.md` Gap 1b lists the measures that carry the most
-- member-votes and exactly one issue key. A single key is not a defect — a
-- single-axis bill should have one — but on a heavily-voted measure it means
-- every recorded vote on it reaches exactly one issue ledger and is invisible on
-- every other. This pass re-read the seven heaviest entries in that list against
-- their own enacted or reported text and asked one question per candidate key:
-- does the TEXT support it, and would the mapping still be true read backwards,
-- from the nays?
--
-- The second half of that question is the one that did the work. A mapping is
-- bidirectional by construction: `support_meaning = 'yea_supports'` tells
-- `_voteEffectiveSupport` that a yea advances the issue AND that a nay cuts
-- against it. Runbook rule 5 already says a headline key is unreadable where the
-- nays came from two flanks wanting opposite things. The same test applied one
-- level down — to a provision-level key — refused most of what this pass looked
-- at, which is why three rows ship and nine candidates are written down as
-- declined instead.
--
-- Nothing here touches a score formula, a floor, a weight guard or a stance. It
-- adds curated (measure, issue) rows and corrects one published rationale that
-- was factually wrong.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPED (3 rows, 2 measures)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. H.R. 6955 (119th), Main Street Capital Access Act — 216 member-votes,
--    mapped `econ_smallbiz` only since 20260726120000, whose note reads
--    "Nothing in what we hold supports a second key, so it gets one." What we
--    hold has changed: the CRS summary now on file in BILLSTATUS states the
--    bill's operative purpose in its first line — "This bill lessens and
--    otherwise modifies banking regulations, including those regarding
--    institution formation, supervision by federal financial regulators, and
--    bank merger requirements."
--
--    → `gov_regulation` (85, secondary, yea_supports). This clears runbook rule
--      3, which reserves the key for measures whose PRIMARY OPERATIVE PURPOSE is
--      regulation itself and refuses it for any bill that merely directs an
--      agency to write a rule. Regulatory relief is not a side effect of this
--      bill, it is the bill: a three-year capital phase-in for new banks, a
--      reduced leverage ratio for certain rural community banks, a duty on
--      regulators to tailor actions to an institution's risk profile, more
--      frequent and wider regulatory review, and higher asset thresholds that
--      exempt more institutions from fees, reporting requirements and the
--      shorter examination cycle.
--
--    → `econ_corp_account` (60, secondary, yea_opposes). The summary names the
--      merger provision without hedging: the bill eases bank-merger requirements
--      "by allowing financial regulators to approve certain bank mergers without
--      considering if the merger is noncompetitive or monopolistic", and raises
--      the asset threshold above which a financial holding company needs Federal
--      Reserve Board approval to acquire a company, "thereby allowing for more
--      acquisitions without board approval". `econ_corp_account` carries
--      antitrust and fair competition in its own vocabulary. Direction is
--      inverted relative to the other two keys on this measure, which is the
--      point: the same yea widens capital access and narrows competition review,
--      and a ledger that shows only the first is not the record.
--
--    Read backwards, both hold. The nays on this bill are a single coherent
--    bloc — members who declined to deregulate banks — and neither key scores
--    them as wanting the opposite of what they voted for.
--
-- 2. H.R. 2670 (118th), National Defense Authorization Act for FY2024
--    (P.L. 118-31) — 197 member-votes, House roll 723/2023 (310-118 under
--    suspension), Senate roll 343 (87-13).
--
--    → `privacy_rights` (45, secondary, yea_opposes). Section 7902 of the
--      enacted act reauthorizes Title VII of the Foreign Intelligence
--      Surveillance Act — the authority under which section 702 collection runs
--      — through April 19, 2024. The existing `privacy_rights` convention for
--      FISA is already set by H.R. 7888 in 20260810000000, mapped
--      `privacy_rights` 85 at `yea_opposes` with `strong_defense` 65 secondary,
--      and this row follows it in direction and differs only in weight, because
--      here the surveillance extension is one section of a whole defense
--      authorization rather than the bill itself.
--
--      Rule 5 says a bill whose nays came from two flanks cannot carry its
--      headline key honestly. The FY24 conference report is exactly such a bill
--      — its nays run from members objecting to the topline and to Ukraine
--      funding through to members objecting that the House's social riders were
--      dropped — and rule 5's remedy is to map the provisions instead. On THIS
--      provision the two flanks point the same way: the objection to extending
--      Title VII came from privacy-minded members of both, and the Senate
--      recorded it separately, raising a Rule XXVIII point of order against
--      section 7902 and waiving it 65-35 on roll 342. That roll is not ingested
--      here — runbook rule 8 excludes point-of-order waivers from the decisive
--      set — but it is why this section is readable as a question members
--      actually answered.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- CORRECTED (1 published rationale)
-- ─────────────────────────────────────────────────────────────────────────────
-- The live `strong_defense` rationale on H.R. 2670, written by 20260810000000
-- and mirrored byte-for-byte in `db/vr-issue-seed.json`, reads:
--
--   "Annual defense authorization. Mapped to a single key: the enacted summary
--    contains no Foreign Intelligence Surveillance Act section 702 provision (a
--    search of the Public Law summary returns zero hits), so no privacy_rights
--    slice is asserted."
--
-- That is false, and it is published — the dossier prints the rationale one fold
-- under the roll call as "What the document actually says". The enacted summary
-- does contain the provision; it is the last entry in it: "(Sec. 7902) This
-- section reauthorizes Title VII of the Foreign Intelligence Surveillance Act of
-- 1978 (FISA) through April 19, 2024." The earlier search missed it because it
-- looked for the string "702", and the summary names the title rather than the
-- section. The sentence is replaced with one that states what the yea
-- authorizes; the mapping's key, weight, direction and source are untouched.
--
-- Runbook rule 21 — the live rationale is the first writer's, because
-- re-assertions use ON CONFLICT DO NOTHING — is why this has to be an UPDATE and
-- not another INSERT. The UPDATE is guarded on the exact prior text, so it is
-- idempotent and cannot overwrite a rationale someone else has since rewritten.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DELIBERATELY NOT MAPPED (9 candidates, each read in full first)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- · H.R. 8404 (117th), Respect for Marriage Act → `religious_liberty`. The text
--   supports the row and the vote does not. Section 6(b) of the enacted act is
--   not a savings clause: nonprofit religious organizations "shall not be
--   required to provide services, accommodations, advantages, facilities, goods,
--   or privileges for the solemnization or celebration of a marriage", and any
--   such refusal "shall not create any civil claim or cause of action" — a
--   statutory exemption plus a litigation shield that did not exist in federal
--   law before, with section 7(a) protecting tax-exempt status, funding, grants
--   and accreditation alongside it. So a yea really does enact religious-liberty
--   protections. But the nays on this bill were members who opposed codifying
--   the marriage recognition and argued the religious-liberty protections were
--   too WEAK — the Lee amendment was the whole fight. `yea_supports` would score
--   that bloc as opposing religious liberty, which is precisely inverted. A
--   mapping has to be true in both directions or it is not a mapping. Note this
--   is not a reversal of 20260810000000's refusal of a `religious_liberty`
--   CONTRADICTION row, which was refused for a different and still-correct
--   reason; it is the same refusal reached from the other side.
--
-- · H.R. 8800 (119th), FY2027 NDAA → `israel_support`. Subtitle C of title XII
--   is headed "Matters relating to Israel" and carries section 1221 (extension
--   of war reserve stockpile authority for Israel), 1222 (subterranean
--   cooperation) and 1223 (countering unmanned systems), with section 219
--   establishing a United States–Israel Defense Technology Cooperation
--   Initiative. Every existing `israel_support` mapping sits on a vehicle whose
--   whole question was Israel — H.R. 5323, H.R. 6126, H.R. 7217, H.R. 8034,
--   H.R. 8369, H.Amdt. 478. Three sections inside a defense authorization are
--   not that vehicle, and a nay on the FY27 NDAA is not a recorded decision
--   about the war reserve stockpile. The honest instrument for this signal is an
--   amendment roll on those sections, if one exists; the measure-level row is
--   not it.
--
-- · H.R. 8034 and H.R. 7217 (118th), Israel Security Supplemental
--   Appropriations → `cut_spending`. Both summaries state that the bill
--   "designates the funding as emergency spending, which is exempt from
--   discretionary spending limits", so the text supports the row. The nays do
--   not: this ledger's own runbook (rule 11) records the 58 nays on H.R. 8034 as
--   "the members who declined to fund Israel's missile defence on a bill that
--   asked nothing else of them", and the 180 nays on H.R. 7217 objected to
--   splitting Israel from the rest of the supplemental. Scoring either bloc as
--   fiscal hawks who wanted spending cut is a verdict none of them cast.
--
-- · H.R. 8034 and H.R. 7217 → `strong_defense`. Same failure, one step milder.
--   The funds do replace U.S. defense articles and support current U.S.
--   operations in the region, but the conviction the nays recorded is already
--   carried, correctly, by `israel_support`. Re-filing it under a key that
--   describes it wrongly does not add a second data point; it adds the same one
--   under a wrong name.
--
-- · H.Con.Res. 113 (119th), FY2027 budget resolution → `cut_spending`. The
--   reasoning is sound — the reconciliation instructions run to the Agriculture,
--   Armed Services, Intelligence and House Administration Committees, none of
--   which holds revenue jurisdiction, so the deficit increase they are told to
--   report has to come through spending. It is also redundant: the measure
--   already carries `national_debt` at `yea_opposes` for that identical
--   reasoning, and the two keys share "deficit", "spending", "fiscal
--   responsibility" and "overspending" in their vocabularies. Two names for one
--   finding is how a taxonomy stops meaning anything.
--
-- · H.R. 2670 → `end_dei`. The provisions are real and specific: section 529B
--   bars DOD from creating or filling diversity, equity and inclusion positions
--   until GAO reports, and section 364 bars the military departments from
--   employing anyone above GS-10 in DEI duties and requires reassignment within
--   180 days. But part of the FY24 nay bloc voted no BECAUSE the conference
--   dropped the House's broader anti-DEI riders. `yea_supports` would score
--   those members as defending DEI. Same inversion as H.R. 8404, same refusal.
--
-- · H.R. 2670 → `veterans`. Division E title L is headed "Veterans Affairs
--   Matters" and is three sections: 5001 raises the threshold at which a VA
--   medical facility project needs its own authorizing law from $20 million to
--   $30 million, 5002 repeals a flat-grave-marker authority and orders a report,
--   5003 requires the VA to analyze claims-processor training needs for PTSD
--   claims annually. That is administrative, and 5001 points away from
--   congressional oversight rather than toward veterans' benefits. The direction
--   is not clean enough to score a nay against, which is the same standard
--   runbook rule 4 applied to H.Amdt. 245.
--
-- · S. 1605 (117th), FY2022 NDAA → any second key. Re-read and re-declined. The
--   enacted BILLSTATUS summary is a short illustrative list rather than a
--   section-by-section, and the P.L. 117-81 table of contents offers no
--   section-level hook a second key could rest on. Left at `strong_defense`
--   alone until someone reads the enrolled text.
--
-- · H.R. 1069 (119th), PROTECT Our Kids Act → any key. 99 member-votes at
--   247-164, the only genuinely contested measure left in Gap 1, and still
--   unmappable. It bars federal education funding to any K-12 school receiving
--   direct or indirect support from the Chinese government. `public_schools` is
--   labelled "Invest in Public Schools" and would score a vote about foreign
--   government ties as a vote against school funding; `tariffs_china` is
--   tariff-scoped; there is no key for foreign influence in the classroom. The
--   shipped vocabulary cannot express it, so it stays unmapped rather than
--   mis-keyed — and it does not justify a new key on one measure.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES, all fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
--   H.R. 6955   govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr6955.xml
--   H.R. 2670   govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr2670.xml
--   H.R. 8800   govinfo.gov/content/pkg/BILLS-119hr8800rh/xml/BILLS-119hr8800rh.xml
--   H.R. 8404   govinfo.gov/content/pkg/PLAW-117publ228/html/PLAW-117publ228.htm
--   H.R. 8034   govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr8034.xml
--   H.R. 7217   govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr7217.xml
--   H.Con.Res. 113
--               govinfo.gov/bulkdata/BILLSTATUS/119/hconres/BILLSTATUS-119hconres113.xml
--   H.R. 1069   govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr1069.xml
-- congress.gov still returns HTTP 403 to this environment, as recorded in
-- 20260804000000's header, so every fact above was taken from GPO.
--
-- `db/vr-issue-seed.json` is updated in the same change with the same three rows
-- and the same corrected rationale, byte for byte, per runbook rule 20.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m record;
  n_rows integer := 0;
  n_fixed integer := 0;
BEGIN

  -- ── H.R. 6955 (119th) — Main Street Capital Access Act ─────────────────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 6955' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_regulation', 85, false, 'yea_supports',
        'Lessens and modifies Federal banking regulation as its operative purpose: new banks get a three-year phase-in to meet certain capital requirements, certain rural community banks get a reduced leverage ratio, financial regulators must tailor regulatory actions to an institution''s risk profile and business model and review their regulations more often and more widely, and higher asset thresholds exempt more financial companies and banks from various fees and reporting requirements while letting more small banks qualify for a longer examination cycle. A yea enacts that relief.',
        'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr6955.xml'),
      (m.id, 'econ_corp_account', 60, false, 'yea_opposes',
        'Eases the competition review that bank mergers currently pass through: it allows financial regulators to approve certain bank mergers without considering whether the merger is noncompetitive or monopolistic, and raises the asset threshold above which a financial holding company needs Federal Reserve Board approval to acquire a company, so more acquisitions close without that approval. A yea removes those checks.',
        'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr6955.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  -- ── H.R. 2670 (118th) — National Defense Authorization Act for FY2024 ──────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 2670' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'privacy_rights', 45, false, 'yea_opposes',
        'Section 7902 of the enacted act reauthorizes Title VII of the Foreign Intelligence Surveillance Act of 1978, the authority under which section 702 collection against targets outside the United States runs, through April 19, 2024. A yea extends that authority. Weighted as a provision-level slice rather than as the bill''s headline: this is one section of a whole defense authorization.',
        'https://www.govinfo.gov/bulkdata/BILLSTATUS/118/hr/BILLSTATUS-118hr2670.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── Correction: the H.R. 2670 strong_defense rationale ─────────────────────
  -- Guarded on the exact prior text so a re-run, or a later rewrite by someone
  -- else, is a no-op rather than a clobber.
  UPDATE vr_measure_issues mi
     SET rationale = 'Annual defense authorization. A yea authorizes the fiscal year 2024 defense topline and the personnel, procurement, research, military-construction and Department of Energy national-security programs under it.'
    FROM vr_measures vm
   WHERE mi.measure_id = vm.id
     AND vm.number = 'H.R. 2670'
     AND vm.congress = 118
     AND mi.issue_key = 'strong_defense'
     AND mi.rationale = 'Annual defense authorization. Mapped to a single key: the enacted summary contains no Foreign Intelligence Surveillance Act section 702 provision (a search of the Public Law summary returns zero hits), so no privacy_rights slice is asserted.';
  GET DIAGNOSTICS n_fixed = ROW_COUNT;

  RAISE NOTICE 'densification pass: % curated mapping row(s) asserted, % rationale(s) corrected', n_rows, n_fixed;
END $$;

-- ── Sanity counters ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_6955 integer;
  v_2670 integer;
  v_stale integer;
BEGIN
  SELECT count(*) INTO v_6955
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'H.R. 6955' AND vm.congress = 119;
  SELECT count(*) INTO v_2670
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'H.R. 2670' AND vm.congress = 118;
  SELECT count(*) INTO v_stale
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'H.R. 2670' AND vm.congress = 118
     AND mi.rationale LIKE '%returns zero hits%';

  RAISE NOTICE 'H.R. 6955 now carries % issue key(s); H.R. 2670 now carries % issue key(s)', v_6955, v_2670;
  IF v_stale > 0 THEN
    RAISE NOTICE 'WARNING: % H.R. 2670 rationale(s) still assert the FISA claim that is not true', v_stale;
  END IF;
END $$;
