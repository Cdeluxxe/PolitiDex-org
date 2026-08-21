-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — formal densification under the product rule: nine second keys
-- on six measures that were already carrying real votes
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS IS
--
-- 20260911000000 retired the "section inside a vehicle" bar and wrote the
-- product rule in its place:
--
--   If the measure's primary text contains a provision that clearly implicates
--   issue key K, map it. A yea advances the package as written, including that
--   provision; a nay blocks it. Refuse only where the measure is procedural,
--   where the text contains no real provision for K, or where the same
--   conviction is already carried by another mapping ON THAT SAME MEASURE.
--   Weight the row for the share of the bill the provision represents and name
--   the sections in the rationale. Direction is what the instrument does on K,
--   not what motivated any bloc.
--
-- That pass applied the rule to one family of bills. This one applies it to the
-- rest of the heavy single-key measures in the record. Every row below was read
-- out of the primary document — enrolled text where the measure was enacted,
-- the engrossed text the chamber actually voted where it was not. Nothing here
-- was mapped from a title, a summary or a vote margin.
--
-- Six measures, 777 member-votes between them, all previously carrying exactly
-- one issue key each.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPED (9 rows, 6 measures)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. H.R. 2670 (118th), FY2024 NDAA → `israel_support` (40, secondary).
--    Closes the cross-NDAA trail 20260911000000 opened. Four defense
--    authorizations now carry the key at 40 / 35 / 35 / 40 — H.R. 8800 and
--    H.R. 2670 at 40 for the widest Israel subtitles, S. 1071 and S. 1605 at 35
--    where the same subtitle is a smaller share of a much broader enacted act.
--    Subtitle D runs eight sections; Sec. 1665 carries $200,000,000 of missile
--    defense co-production.
--
-- 2-4. H.R. 1 (117th), For the People Act → `campaign_finance` (70),
--    `gov_transparency` (55), `scotus_reform` (25), all secondary,
--    all `yea_supports`. The bill has three divisions and was carrying one key,
--    `voting_access`, for Division A. Division B is campaign finance —
--    disclosure, internet ads, coordination, small-dollar matching. Division C
--    is ethics — Member board service, conflict-of-interest rules, presidential
--    divestiture, ten years of candidate tax returns, lobbying registration.
--    Sec. 7001, inside Division C, requires the Judicial Conference to issue a
--    code of conduct reaching every justice, which is the ethics half of
--    `scotus_reform` and is priced at the floor because it is one section.
--    The three keys are deliberately disjoint: campaign money is not counted
--    again under transparency, and the court section is not counted again under
--    either.
--
-- 5. H.R. 4 (117th), John R. Lewis Voting Rights Advancement Act →
--    `states_federal_power` (55, secondary, `yea_opposes`). Secs. 4-6 restore
--    preclearance and Sec. 6's new section 4A applies it nationwide: a State may
--    not implement a newly enacted covered practice until it has been cleared
--    federally. That is the preemption question this key asks, answered on the
--    federal side. FIRST `yea_opposes` ROW ON THIS KEY — every existing mapping
--    (H.J.Res. 88/89, H.R. 26, H.Amdt. 249/250) runs the other way, which is a
--    property of which votes had been mapped, not a property of the key. The
--    chip is directional and the schema is bidirectional; a vote that overrides
--    the State's rule belongs on the ledger just as much as one that protects it.
--
-- 6-7. H.R. 1181 (119th), Protecting Privacy in Purchases Act →
--    `privacy_rights` (55, `yea_supports`) and `states_federal_power` (40,
--    `yea_opposes`). The bill was carrying `gun_rights` alone. Its own short
--    title is the privacy claim, and Sec. 2(a) is a limit on what payment
--    processors may record about a purchase; Sec. 2(c)(1) is an express
--    preemption of State and local law on the same subject. Same section read
--    on two axes is exactly what the omnibus doctrine permits — the duplicate
--    bar is about a rider that was separately voted, not about a provision that
--    genuinely answers two chips.
--
-- 8. H.R. 8404 (117th), Respect for Marriage Act → `states_federal_power`
--    (40, secondary, `yea_opposes`). Sec. 4's new 28 U.S.C. 1738C forbids a
--    State to deny full faith and credit to another State's marriage record and
--    adds federal and private enforcement against State officials. The merits
--    stay on `lgbtq_rights`; this row is the override question only.
--
-- 9. H.R. 36 (119th), MEGOBARI Act → `foreign_balance` (100, PRIMARY). The
--    measure had no mapping at all. Mandatory IEEPA property-blocking and visa
--    sanctions on Georgian officials who blocked Euro-Atlantic integration, a
--    statement of policy backing NATO and EU accession, and conditional
--    expansion of military cooperation against Russian aggression. It sits on
--    the same trail as H.R. 815 and H.R. 8035, both `foreign_balance` at 100
--    for allied-commitment votes. 349-42, so rule 2 does not reach it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DECLINED, with the reason each time
-- ─────────────────────────────────────────────────────────────────────────────
--
-- · H.R. 1 (117th) → `stock_trading_ban`. NO PROVISION. The chip is a ban on
--   Members trading individual stocks; the bill has none. Sec. 8012 is
--   presidential divestiture and Sec. 9102 is a conflict-of-interest rule, and
--   neither bars a Member from trading. Grepped the engrossed text for it
--   before declining rather than reasoning from the bill's reputation.
--
-- · H.R. 1 (117th) → `election_security`. Already refused on the record, in the
--   live `voting_access` rationale, and the refusal still holds: the same yea
--   mandates durable paper ballots and risk-limiting audits while permitting a
--   sworn statement in lieu of documentary ID, so it points both ways at once.
--
-- · H.R. 4 (117th) → `gov_transparency`. NO PROVISION, on the key's own scope.
--   Sec. 7 is headed "Promoting Transparency to Enforce the Voting Rights Act"
--   and requires States to publish voting changes within 180 days of a federal
--   election — real, sourced, and not this key, which is scoped in
--   alignment-tool.js to disclosure BY Members: financial disclosure, stock
--   trading, ethics rules. A notice duty on State election administrators is a
--   different subject wearing the same word.
--
-- · H.R. 2670 (118th) → `guard_authority`. NO PROVISION. Searched the enrolled
--   text for 32 U.S.C. 328a and for Active Guard and Reserve duty performed for
--   a State; the FY2024 act has neither.
--
-- · H.R. 36 (119th) → `america_first_fp`. DIRECTION UNRESOLVED. Sec. 7 both
--   conditions assistance on a certification (the chip's direction) and says
--   the President should expand military cooperation and security equipment
--   (against it), in the same section. Rule 5 keeps a key off when the text
--   points two ways; it applies to a provision that points two ways as well.
--
-- · H.R. 8404 (117th) → `religious_liberty`. DUPLICATE of a refusal already
--   published in the live `lgbtq_rights` rationale, which explains that the
--   enacted text expressly protects religious organizations. Left as written.
--
-- · H.R. 973 (Setting Consumer Standards for Lithium-Ion Batteries Act) and
--   S. 2503 (ROTOR Act) → `gov_regulation`. NO PROVISION, by runbook rule 3,
--   which names both of these bills by name as the reason the rule exists. A
--   safety mandate is not a vote on the regulatory question. Re-read both and
--   left them where rule 3 put them. 105 and 98 member-votes stay dark on
--   purpose.
--
-- · H.R. 139 (Sunshine Protection Act) → nothing. NO PROVISION and a vocabulary
--   gap: permanent daylight saving time has no key, and the record should not
--   grow one for a single bill. Sec. 2(b)(2) preserves the existing State
--   exemption rather than overriding it, so it is not a `states_federal_power`
--   vote either — a savings clause is the opposite of preemption.
--
-- · H.R. 1069 (PROTECT Our Kids Act) → nothing. NO PROVISION and a vocabulary
--   gap. The bill cuts federal education funds from any K-12 school partnered
--   with a PRC-funded institute. There is no key for foreign influence in
--   domestic institutions; `tariffs_china` is trade, `america_first_fp` is
--   foreign aid, and `public_schools` is a funding-level chip about teacher pay
--   and classrooms, not about conditioning eligibility. Named here so the gap
--   is visible; no key invented for it.
--
-- · The 32-to-37 member-vote suspension group (H.R. 7401, H.R. 1118, H.R. 915,
--   H.R. 2478, H.R. 3106, H.R. 8897, H.R. 5362, H.R. 4541, H.R. 8823,
--   H.R. 7128) and H.R. 1402 at 96.5 percent → rule 2. A near-unanimous vote
--   carries no signal about the member, whatever the bill says.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES, all fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
--   H.R. 2670 enrolled  govinfo.gov/content/pkg/BILLS-118hr2670enr/html/...
--   H.R. 1   engrossed  govinfo.gov/content/pkg/BILLS-117hr1eh/html/...
--   H.R. 4   engrossed  govinfo.gov/content/pkg/BILLS-117hr4eh/html/...
--   H.R. 1181 engrossed govinfo.gov/content/pkg/BILLS-119hr1181eh/html/...
--   H.R. 8404 as enacted govinfo.gov/content/pkg/PLAW-117publ228/html/...
--   H.R. 36  engrossed  govinfo.gov/content/pkg/BILLS-119hr36eh/html/...
--   H.R. 973, H.R. 139, H.R. 1069 engrossed — read, then declined.
-- congress.gov still returns HTTP 403 to this environment; every fact above
-- came from GPO. Full URLs are on the rows themselves.
--
-- `db/vr-issue-seed.json` carries the same nine rows byte for byte, per runbook
-- rule 20. Nothing here touches a score formula, a floor, a weight guard, a
-- stance or a roll call.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN

  -- ── H.R. 2670 (118th) — FY2024 National Defense Authorization Act, P.L. 118-31 ───
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 2670' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'israel_support', 40, false, 'yea_supports',
        'Title XII, Subtitle D of the enacted act is headed "Matters Relating to Israel" and runs eight sections: Sec. 1252 extends United States-Israel anti-tunnel cooperation, Sec. 1253 improves cooperation to counter unmanned aerial systems, Sec. 1254 modifies the authority for cooperation on directed energy capabilities, Sec. 1256 authorizes assistance to Israel for aerial refueling and Sec. 1257 sets the rules governing transfer of aerial refueling tankers to Israel. Sec. 1665 makes available not more than $80,000,000 to the Government of Israel to procure Iron Dome components, not more than $40,000,000 for the David''s Sling Weapon System and not more than $80,000,000 for the Arrow 3 Upper Tier Interceptor Program, each through co-production in the United States. A yea enacts all of it and keeps the security aid and the joint weapons programs running; a nay blocks the bill that carries them. Weighted 40 rather than the 35 carried by the FY2022 and FY2026 NDAAs: this is the widest Israel subtitle of the three, eight sections plus a $200,000,000 co-production section.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hr2670enr/html/BILLS-118hr2670enr.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1 (117th) — For the People Act of 2021 ─────────────────────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1' AND congress = 117 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'campaign_finance', 70, false, 'yea_supports',
        'Division B of the bill is titled "Campaign Finance" and is the largest of its three divisions. Sec. 4111 requires any organization making campaign-related disbursements aggregating more than $10,000 to report the donors behind them, the Honest Ads provisions beginning at Sec. 4201 extend the broadcast disclaimer and public-file rules to paid internet political advertising, and Sec. 4401 restricts the exchange of campaign information between candidates and outside spending groups so that a coordinating super PAC is treated as making a contribution. Sec. 5111 sets up a voluntary public financing system for House candidates paying 600 percent of each qualified small contribution out of a Freedom From Influence Fund. A yea enacts that whole structure; a nay leaves current law. Weighted 70 for share of the bill: an entire division of a three-division act.',
        'https://www.govinfo.gov/content/pkg/BILLS-117hr1eh/html/BILLS-117hr1eh.htm'),
      (m.id, 'gov_transparency', 55, false, 'yea_supports',
        'Division C is titled "Ethics" and is about disclosure by and conduct of officeholders. Sec. 9101 bars Members of the House from serving on the board of a for-profit entity, Sec. 9102 writes conflict-of-interest rules for Members and senior staff, Sec. 8012 requires the President and Vice President to divest personal financial interests that pose a conflict, Sec. 10001 requires presidential and vice-presidential candidates to file their income tax returns for the 10 most recent taxable years, and Sec. 7201 expands the range of individuals and activities that have to register and report under the lobbying disclosure laws. A yea enacts all five. Weighted 55 for share of the bill: one division of three, and the campaign-money titles are carried separately by the campaign_finance row rather than counted twice here.',
        'https://www.govinfo.gov/content/pkg/BILLS-117hr1eh/html/BILLS-117hr1eh.htm'),
      (m.id, 'scotus_reform', 25, false, 'yea_supports',
        'Sec. 7001 requires the Judicial Conference of the United States to issue a code of conduct that applies to each justice and judge of the United States — the Supreme Court included, which no statute has ever reached. A yea enacts that requirement. It is the ethics half of this issue and none of the tenure half: the bill says nothing about term limits for justices. Weighted 25, the floor of this record, for one section of a three-division act.',
        'https://www.govinfo.gov/content/pkg/BILLS-117hr1eh/html/BILLS-117hr1eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 3;
  END LOOP;

  -- ── H.R. 4 (117th) — John R. Lewis Voting Rights Advancement Act of 2021 ───
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 117 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'states_federal_power', 55, false, 'yea_opposes',
        'Secs. 4 through 6 restore Voting Rights Act preclearance. Sec. 5 rewrites the coverage formula in 52 U.S.C. 10303(b) so that a State is covered for a calendar year when fifteen or more voting rights violations occurred there during the previous 25 calendar years, on a rolling basis. Sec. 6 inserts a new section 4A applying nationwide: every State and political subdivision must identify any newly enacted law, regulation or policy that is a covered practice and may not implement it until it has been cleared federally. A yea puts a State''s own enacted election law behind federal approval before it can take effect; a nay leaves the State''s rule governing on its own. Coded against this issue''s direction on that preemption question only — the merits of the Voting Rights Act are the voting_access row, not this one. Weighted 55 for the three sections that carry the preclearance machinery.',
        'https://www.govinfo.gov/content/pkg/BILLS-117hr4eh/html/BILLS-117hr4eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1181 (119th) — Protecting Privacy in Purchases Act ─────────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1181' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'privacy_rights', 55, false, 'yea_supports',
        'Sec. 2(a) bars a payment card network from requiring, and a covered entity from assigning, any merchant category code used only or primarily for firearms retailers or identifying a retailer as selling firearms, and Sec. 2(b) makes the Attorney General enforce it through a public complaint process, investigations and injunctions. The effect on the data question is direct: card networks and processors may not build a transaction record that flags a customer as having bought at a gun store. A yea imposes that limit on what payment processors may record about a purchase. Weighted 55: the same prohibition the gun_rights row reads from the firearms side, read here on the purchase-data side.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr1181eh/html/BILLS-119hr1181eh.htm'),
      (m.id, 'states_federal_power', 40, false, 'yea_opposes',
        'Sec. 2(c)(1) expressly preempts any law of a State or local government regulating the assignment, use or disclosure of merchant category codes for firearms retailers. A yea replaces whatever a State has enacted on that subject — in either direction — with the federal rule; a nay leaves each State''s own choice standing. Weighted 40: one subsection of a one-section Act, but an express preemption clause is the whole of the question this issue asks.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr1181eh/html/BILLS-119hr1181eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  -- ── H.R. 8404 (117th) — Respect for Marriage Act, P.L. 117-228 ──────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 8404' AND congress = 117 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'states_federal_power', 40, false, 'yea_opposes',
        'Sec. 4 inserts a new 28 U.S.C. 1738C providing that no person acting under color of State law may deny full faith and credit to another State''s marriage record on the basis of the sex, race, ethnicity or national origin of the spouses, or deny a right or claim arising from such a marriage on the ground that the State would not itself recognize it, and it backs that with Attorney General enforcement and a private right of action. A yea overrides a State''s own marriage-recognition rule with a federal one; a nay leaves each State''s rule governing. Coded on the preemption question only — the merits are the lgbtq_rights row. Weighted 40 for the one section that does the overriding.',
        'https://www.govinfo.gov/content/pkg/PLAW-117publ228/html/PLAW-117publ228.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 36 (119th) — MEGOBARI Act ──────────────────────────────────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 36' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'foreign_balance', 100, true, 'yea_supports',
        'Sec. 6 requires the President to determine, within 90 days, whether Georgian parliamentarians, senior party officials, leadership figures in the security and judicial services and their benefiting family members have knowingly engaged in significant corruption or in violence or intimidation connected to blocking Georgia''s Euro-Atlantic integration, and to impose property-blocking sanctions under the International Emergency Economic Powers Act and visa ineligibility on each person identified. Sec. 4 states a policy of backing Georgia''s integration with NATO and the European Union, and Sec. 7 conditions expanded exchanges and expanded military cooperation, including equipment suited to territorial defense against Russian aggression, on a presidential certification that Georgia has made sustained progress back toward that track. A yea puts United States sanctions and security cooperation behind an allied integration effort run with European partners; a nay leaves the tools unused. Sec. 8 sunsets the whole Act after five years.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr36eh/html/BILLS-119hr36eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;
  RAISE NOTICE 'formal densification pass: % curated mapping row(s) asserted', n_rows;
END $$;

-- ── Sanity counters ──────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
  v_sfp integer;
BEGIN
  FOR r IN
    SELECT vm.number, vm.congress, count(*) AS n
      FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
     WHERE (vm.number, vm.congress) IN
           (('H.R. 2670', 118), ('H.R. 1', 117), ('H.R. 4', 117),
            ('H.R. 1181', 119), ('H.R. 8404', 117), ('H.R. 36', 119))
     GROUP BY vm.number, vm.congress
     ORDER BY vm.number
  LOOP
    RAISE NOTICE 'issue rows now: % (%) = %', r.number, r.congress, r.n;
  END LOOP;

  SELECT count(*) INTO v_sfp
    FROM vr_measure_issues WHERE issue_key = 'states_federal_power'
     AND support_meaning = 'yea_opposes';
  RAISE NOTICE 'states_federal_power rows coded yea_opposes: %', v_sfp;
END $$;
