-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — backfill the two institutional-power issue keys
-- ─────────────────────────────────────────────────────────────────────────────
-- 20260725010000_vr_offlabel_issue_key_correction.sql moved eighteen rows off
-- two mislabeled keys and onto two new honest ones:
--
--   checks_balances      = "⚖️ Congressional Checks & Balances"
--   states_federal_power = "🗺 State vs. Federal Power"
--
-- That left both keys correct but THIN — 11 and 7 rows — and the composition
-- indicator added in the same wave now says so out loud beside every percentage
-- built on them. This migration thickens them with votes that genuinely belong,
-- and nothing else.
--
-- Eight rows are added. Every one clears the same four bars the previous waves
-- used, and each is argued individually below:
--   1. the nexus is in the measure's OPERATIVE TEXT, not its subject matter;
--   2. the roll call differentiates members (no near-unanimous votes);
--   3. no pure rule resolutions;
--   4. the direction is readable from the text, so support_meaning is honest.
--
-- DIRECTION CONVENTIONS, inherited from the correction and not re-litigated here
--   checks_balances      yea_supports = the vote asserts a legislative or
--                        judicial check on the executive. yea_opposes = it
--                        removes or narrows one.
--   states_federal_power yea_supports = the vote favours STATE authority.
--                        yea_opposes = it favours federal authority over the
--                        states. (H.J.Res. 88/89, repealing California's Clean
--                        Air Act waiver, are the existing yea_opposes anchors.)
--
-- ═══ WHAT IS ADDED, AND WHY EACH ONE EARNS IT ═══════════════════════════════
--
-- onto checks_balances (+3 → 14)
--
--   H.Amdt. 247 (Hunt) to H.R. 8800 — PRIMARY, weight 100, yea_opposes.
--     Operative text: "no court may issue injunctions that impair military
--     readiness, military fuel supply, or defense-related logistical support."
--     This is the H.R. 1526 shape exactly — a statutory bar on a judicial
--     remedy — so it takes the same direction the correction settled on for
--     H.R. 1526: stripping the injunction is recorded as cutting against
--     judicial checks, with the counterargument stated in the rationale.
--     Failed 208-219 (roll 259) — as differentiating as a vote gets. The
--     amendment currently carries NO issue mapping at all, so it also gets the
--     is_primary flag: getIssueImpacts() routes whole-measure Distributional
--     Impact rows by `primaryByMeasure.get(measureId) === issueKey`, and a
--     measure with no primary attributes its impacts to nothing.
--     NOTE this is a rider on the FY2027 NDAA, and the NDAA's own subject is
--     defense. The mapping is not about defense: the operative sentence is
--     addressed to courts, not to the Pentagon. That distinction is the whole
--     line this wave is trying not to cross.
--
--   H.Con.Res. 89 — secondary, weight 75, yea_supports.
--   H.Con.Res. 108 — secondary, weight 75, yea_supports.
--     Both are section 5(c) War Powers Resolution measures directing the
--     withdrawal of U.S. forces (Iran; Lebanon) absent congressional
--     authorization. The corpus ALREADY treats this exact instrument as a
--     checks_balances measure: S.J.Res. 59, the Senate Iran war-powers vote,
--     sits on the key with the rationale "asserts Congress's constitutional
--     war-powers role against unilateral executive military action." Leaving
--     the two House companions off was an inconsistency, not a judgment.
--     Weight 75 keeps them below `restraint` (100, primary) — the foreign-policy
--     question is the bigger half of these votes — while being high enough to
--     matter to the ⚖ net verdict. H.Con.Res. 89 passed 214-208, H.Con.Res. 108
--     failed 189-235; 37 recorded member votes each.
--     Their primary stays `restraint`; is_primary is NOT set here.
--
-- onto states_federal_power (+5 → 12)
--
--   H.Amdt. 250 (Carter) to H.R. 8800 — PRIMARY, weight 100, yea_opposes.
--     Operative text: "preempt state and local laws that impose requirements
--     different from federal standards" on defense-related scrap-metal
--     processing and materials recovery. Federal preemption of state law IS the
--     operative mechanism, not a side effect — so the nexus is primary even
--     though the materials being regulated are defense articles. A yea narrows
--     state authority → yea_opposes, the H.J.Res. 88/89 direction. Failed
--     201-224 (roll 262). Previously unmapped, hence is_primary.
--
--   H.Amdt. 249 (Gallagher) to H.R. 8800 — PRIMARY, weight 70, yea_opposes.
--     Operative text: "conduct a study to explore mechanisms by which federal
--     authority can preempt or otherwise mitigate state actions that
--     effectively undermine domestic refining capacity critical to national
--     defense." Same direction as H.Amdt. 250 and the same key, but the
--     amendment DIRECTS A STUDY rather than preempting anything, so it gets
--     weight 70 rather than 100. weight and is_primary are independent in this
--     schema (stance-helpers.js uses weight for the net verdict; getIssueImpacts
--     uses is_primary for impact routing), so this row is primary — it is the
--     amendment's only mapping — while still being scored as the lesser act it
--     is. Failed 212-216 (roll 261).
--
--   H.R. 26 — secondary, weight 65, yea_supports.
--     The Protecting American Energy Production Act bars a federal moratorium on
--     hydraulic fracturing and, in the summary's own words, "affirms state
--     primacy over it." State primacy over a regulated activity is a federalism
--     holding in the operative text. Direction is the mirror of the existing
--     rows: a yea favours state authority. Passed 226-188. Its primary stays
--     enviro_energy (100).
--     This is deliberately the FIRST yea_supports legislative row on the key —
--     until now every yea_supports row was a state AG joining litigation, and
--     every legislative row was yea_opposes. A key whose only "pro-state" votes
--     are lawsuits reads as a partisan key even though it is not coded with a
--     lean. See the note on under-specification at the foot of this file.
--
--   S. 1582 (GENIUS Act) — secondary, weight 50, yea_supports.
--     Closes a real inconsistency the correction left behind. That migration
--     re-keyed this bill's PROVISION row "Dual federal–state oversight" onto
--     states_federal_power, but the bill has no measure-level row on the key.
--     vr_measure_provisions.issue_key is read at getIssueImpacts() ahead of the
--     measure's primary, so the provision already routes under the key while the
--     member's percentage on the key ignores the vote entirely. The provision's
--     operative text is the nexus: issuers with $10 billion or less in
--     outstanding stablecoins may opt into a state regime deemed substantially
--     similar to the federal one. A yea preserves that state option →
--     yea_supports, matching the provision's own support_meaning. Weight 50
--     matches the provision's weight; the federalism carve-out is one clause of
--     a federal framework, and tech_innovation (100) stays primary.
--     Best coverage in this wave by a wide margin: 86 recorded member votes
--     across both chambers (Senate 68-30, House 308-122 — lopsided, but 122
--     nays is not near-unanimity).
--
--   Kansas-led amicus (Arizona election-law cases) — secondary, weight 60,
--   yea_supports.
--     The measure's own summary states the nexus: "The brief supports the
--     states' authority to set such requirements." The live legal question in
--     the Arizona cases is whether federal registration law displaces a state
--     documentary-proof-of-citizenship rule — preemption, squarely. Joining the
--     brief asserts state authority → yea_supports. Its primary stays
--     election_integrity (100); this is the federalism half of a measure whose
--     substance is election law, at a weight that says so.
--     Brings 25+ state attorneys general onto a key that was otherwise almost
--     entirely a House-and-Senate story.
--
-- ═══ CONSIDERED AND DELIBERATELY SKIPPED ════════════════════════════════════
-- Recorded so a later reader does not think these were missed.
--
--   H.J.Res. 25 (CRA — repeal of the IRS DeFi broker rule). A Congressional
--     Review Act resolution is Congress overriding an agency rule, which is
--     tempting. But the corpus's existing CRA rows (H.J.Res. 88/89) are on
--     states_federal_power for their SUBSTANCE — the California waiver — and
--     carry no checks_balances row for their CRA mechanics. Mapping H.J.Res. 25
--     on mechanics alone would contradict that and would logically put every
--     future CRA resolution on the key, turning a key about institutional
--     conflict into a procedural tag. It also has 0 recorded member votes, so
--     it differentiates nobody today. Substance stays on gov_regulation.
--   H.R. 4 (Rescissions Act of 2025). Impoundment and the power of the purse
--     are checks_balances vocabulary, and this was the closest call in the wave.
--     Skipped on DIRECTION, not on subject: passing a rescissions bill is
--     Congress exercising the power of the purse by statute, and the content of
--     what it passes is an executive request to cancel appropriated money. A yea
--     is simultaneously the legislature acting and the legislature deferring,
--     and support_meaning has no neutral value. New York v. Trump stays on the
--     key precisely because there the executive impounded funds UNILATERALLY,
--     which does have a readable direction.
--   H.R. 276 (Gulf of America Act). Codifies an executive order by statute.
--     Same unreadable direction as H.R. 4, and the substance is symbolic.
--   H.Con.Res. 113 (FY2027 budget resolution) — a budget resolution; belongs on
--     fiscal keys, and re-mapping it here would be the off-label pattern again.
--   H.R. 1949, H.R. 3633 (DOE↔FERC, SEC↔CFTC jurisdiction). INTER-AGENCY
--     boundary fights inside the executive branch, not inter-branch ones.
--   H.R. 471 (Fix Our Forests) — litigation timelines are incidental to a
--     wildfire-management bill.
--   H.R. 7567 (Farm Bill) — its preemption provisions were struck before
--     passage, so the enacted text carries no nexus.
--   H.Amdt. 259 (Issa, DoD investment-program discretion), H.Amdt. 248 (Santa
--     Ynez pipeline), H.Amdt. 243 (foreign nationals at the service academies),
--     H.Amdt. 97 (ESA critical habitat on military lands), S.Amdt. 3428,
--     H.R. 1048 — department-specific policy, no institutional operative text.
--   H.Res. 1399 (420-0) — near-unanimous, differentiates nobody.
--   H.Res. 1398 / 1423 / 1438 — pure rule resolutions.
--   H.R. 8800 (the NDAA itself) — per 20260725000000's rule, the riders carry
--     the mappings and the parent bill is not re-mapped from them.
--   All eight cabinet confirmations — the correction deleted these for having no
--     readable direction (both a yea and a nay ARE advice and consent). Not
--     re-introduced.
--   Meta youth-safety litigation (multistate) — a federal-preemption defence
--     exists in that litigation, but it is not in this measure's operative
--     description, and the rule is that the nexus must be.
--
-- ═══ ONE FINDING TO ACT ON SEPARATELY ═══════════════════════════════════════
-- No SQL here, but it belongs next to this data: NO politician in
-- ISSUE_STANCE_DATA holds a stance on either key, and both carry stanceKeys: []
-- in ISSUE_MAP. _polPositionMap() (stance-helpers.js) builds the "say" side
-- purely from curated issueKey rows, so these eight mappings thicken the
-- Official Record percentage and CANNOT produce a Say-vs-Do comparison until
-- curated stances exist. That is a content gap, not a bug, and it is reported
-- rather than papered over.
--
-- Additive and idempotent: measures are resolved by natural key (congress is
-- NULL for litigation), every block is guarded on the lookup, and every insert
-- uses ON CONFLICT (measure_id, issue_key) DO NOTHING — so a re-run inserts
-- nothing and, critically, cannot overwrite a mapping a later wave has revised.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r      record;
  mid    integer;
  n_add  integer := 0;
  n_prim integer := 0;
  n_miss integer := 0;
  hit    integer;
  got    boolean;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- ── checks_balances ─────────────────────────────────────────────────
      ('H.Amdt. 247', 119, 'checks_balances', 100, true, 'yea_opposes',
       'Bars any court from issuing an injunction that impairs military readiness, military fuel supply, or defense-related logistical support. Recorded as a yea removing a judicial check on executive action, the same reading the corpus applies to H.R. 1526''s bar on nationwide injunctions; supporters make the opposite case, that litigation should not be able to halt military operations.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/247'),

      ('H.Con.Res. 89', 119, 'checks_balances', 75, false, 'yea_supports',
       'A privileged resolution under section 5(c) of the War Powers Resolution directing the removal of U.S. forces from hostilities with Iran absent congressional authorization; a yea asserts Congress''s constitutional war-powers role against unilateral executive military action. Same instrument, and same direction, as the Senate''s S.J.Res. 59.',
       'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89'),

      ('H.Con.Res. 108', 119, 'checks_balances', 75, false, 'yea_supports',
       'A privileged resolution under section 5(c) of the War Powers Resolution directing the removal of U.S. forces from hostilities in Lebanon absent congressional authorization; a yea asserts Congress''s war-powers role against unilateral executive military action.',
       'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/108'),

      -- ── states_federal_power ────────────────────────────────────────────
      ('H.Amdt. 250', 119, 'states_federal_power', 100, true, 'yea_opposes',
       'Preempts state and local laws that impose requirements different from federal standards on defense-related scrap-metal processing, materials recovery, and the disposal of defense articles. Federal preemption of state law is the operative mechanism, so a yea narrows state authority and is recorded as cutting against state power.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/250'),

      ('H.Amdt. 249', 119, 'states_federal_power', 70, true, 'yea_opposes',
       'Directs a study of mechanisms by which federal authority could preempt or mitigate state actions that undermine domestic refining capacity, and of how the federal government may intervene in state fuel policy. A yea points federal authority at state policy, so it is recorded as cutting against state power — at a lower weight than an operative preemption, because the amendment commissions a study rather than preempting anything.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/249'),

      ('H.R. 26', 119, 'states_federal_power', 65, false, 'yea_supports',
       'Bars a federal moratorium on hydraulic fracturing and affirms state primacy over its regulation; a yea keeps the decision with the states rather than Washington, so it is recorded as supporting state authority.',
       'https://www.congress.gov/bill/119th-congress/house-bill/26'),

      ('S. 1582', 119, 'states_federal_power', 50, false, 'yea_supports',
       'Lets stablecoin issuers holding $10 billion or less opt into a state regulatory regime deemed substantially similar to the federal one, rather than folding every issuer into federal supervision; a yea preserves that state option. Matches the direction already carried by this bill''s "Dual federal–state oversight" provision row, which had no measure-level counterpart.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/1582'),

      ('Kansas-led amicus (Arizona election-law cases)', NULL::integer, 'states_federal_power', 60, false, 'yea_supports',
       'The brief argues that setting documentary proof-of-citizenship requirements for voter registration is the states'' own authority, against the claim that federal registration law displaces it; joining it asserts state authority in a preemption dispute. The election-law substance stays on election_integrity, which remains this measure''s primary.',
       'https://law.georgia.gov/press-releases/2026-04-07/carr-joins-25-state-coalition-amicus-brief-against-noncitizen-voting')
    ) AS t(num, cg, k, w, prim, meaning, why, src)
  LOOP
    SELECT id INTO mid FROM vr_measures
     WHERE number = r.num AND (r.cg IS NULL OR congress = r.cg) LIMIT 1;

    IF mid IS NULL THEN
      n_miss := n_miss + 1;
      RAISE NOTICE 'institutional backfill: measure % not present, skipped', r.num;
      CONTINUE;
    END IF;

    -- is_primary is only ever GRANTED here, and only to a measure that has no
    -- primary at all — the three amendments below, each of which had no issue
    -- mapping whatsoever. It is never taken away from an existing primary, so a
    -- measure whose primary a previous wave chose keeps it.
    got := r.prim AND NOT EXISTS (
      SELECT 1 FROM vr_measure_issues WHERE measure_id = mid AND is_primary);

    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (mid, r.k, r.w, got, r.meaning, r.why, r.src)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    GET DIAGNOSTICS hit = ROW_COUNT;
    n_add := n_add + hit;
    -- Counts primaries actually written, not primaries asked for: on a re-run
    -- the insert is a no-op and this must not claim otherwise.
    IF hit > 0 AND got THEN n_prim := n_prim + 1; END IF;
  END LOOP;

  RAISE NOTICE 'institutional backfill: % rows added (% as primary), % measures absent', n_add, n_prim, n_miss;
END $$;
