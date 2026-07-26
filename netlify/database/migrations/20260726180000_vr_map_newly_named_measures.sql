-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — map the newly named measures (identity backfill follow-up)
-- ─────────────────────────────────────────────────────────────────────────────
-- The previous migration (20260726160000) gave real titles to nineteen measures
-- that the roll-call feeds could only label "Roll call N". Naming them made them
-- reviewable; this migration reviews them and maps the ones that survive.
--
-- Four measures are mapped, all of them CONTESTED passage votes where the policy
-- meaning and the direction of a yea are both unarguable from the measure's own
-- operative text. Every question below was verified against the House Clerk's
-- roll-call XML (clerk.house.gov/evs/{year}/roll{nnn}.xml) before mapping, and
-- the Clerk's yea/nay totals match the totals already stored on our rollcall row
-- in every case.
--
--   S.J.Res. 18  roll 096  On Passage  217-211   gov_regulation, econ_corp_account
--   H.J.Res. 78  roll 113  On Passage  216-195   lands_preserve, gov_regulation
--   H.R. 1005    roll 312  On Passage  242-176   gov_transparency
--   H.R. 1049    roll 314  On Passage  247-166   edu_parental, gov_transparency
--
-- Impact, measured against the live tables before applying: 147 member-votes move
-- onto mapped measures (3,844 → 3,991), 32 vote/key pairs become rankable
-- (1,587 → 1,619) and 22 (member, issue) pairs become judgeable (577 → 599). No
-- member crosses from zero rankable records to one — every one of the 22 belongs
-- to a member who was already rankable on something else. The other 115 newly
-- mapped member-votes are now blocked on a STANCE, not on a mapping.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- CONSIDERED AND DELIBERATELY LEFT UNMAPPED, so a later wave does not re-litigate
-- ─────────────────────────────────────────────────────────────────────────────
-- Three rules from db/vr-ingest-runbook.md decided every one of these. They are
-- the project's standing curation rules, not new judgements invented here.
--
-- (a) "Skip unanimous / near-unanimous measures: they differentiate nobody, so
--     they add attribution without adding signal."
--
--       H.R. 1402  TICKET Act                     409-15   96.5% yea
--       H.R. 530   ACES Act                       376-5    98.7% yea
--       S. 356     Secure Rural Schools           399-5    98.8% yea
--       H.R. 1676  Make SWAPs Efficient Act       400-0     100% yea
--
--     Each has a clean subject fit — econ_corp_account, veterans, rural_ag and
--     lands_preserve respectively — and each is honest as a receipt today. What
--     they cannot do is separate one member from another, which is the only thing
--     a mapping is for. H.R. 1402 and H.R. 530 were named as priority targets for
--     this pass; they are skipped on this rule alone, not on any doubt about what
--     they mean.
--
-- (b) "Never stretch a bill onto an issue the shipped vocabulary can't express."
--
--       H.R. 1503  Stop Forced Organ Harvesting Act (406-1). Sanctions and visa
--                  revocation for organ trafficking. There is no human_rights,
--                  foreign_aid or sanctions key; america_first_fp and
--                  foreign_balance are postures about wars and alliances, and
--                  keying a trafficking-sanctions vote to either would invent a
--                  verdict. Same treatment the runbook already gives H.R. 36 and
--                  H.R. 4423. (Also near-unanimous, so rule (a) applies too.)
--       H.R. 1069  PROTECT Our Kids Act (247-164). Contested, and the only
--                  contested measure here left unmapped. It bars federal K-12
--                  funds to schools tied to the PRC government. The operative
--                  subject is foreign-adversary influence in schools, which no key
--                  covers. america_first is a foreign-policy posture key about
--                  foreign aid and entanglement — a member who opposes that
--                  posture and still votes to bar PRC funding of grade schools is
--                  not contradicting themselves, so mapping it there would
--                  manufacture contradictions at full weight.
--       H.R. 973   Setting Consumer Standards for Lithium-Ion Batteries Act
--                  (365-42). Directs the CPSC to issue a mandatory safety rule for
--                  e-bike and e-scooter batteries. There is no product-safety key.
--                  econ_corp_account carries 'consumer protection' in its keyword
--                  list, but the chip members actually answered reads "use
--                  antitrust and anti-price-gouging enforcement to check large
--                  corporations" — battery certification is neither.
--       S. 2503    ROTOR Act (264-133, failed under suspension). Mandates ADS-B In
--                  for aviation safety. infrastructure is roads, bridges and the
--                  grid; transit is public transit. Neither is aviation safety.
--
-- (c) "Rules are not policy." H.Res. 377, both rows (ids 68 and 69, roll 118
--     adopting the rule and roll 117 ordering the previous question, 71 member-
--     votes between them). Excluded by the brief for this pass and by the standing
--     rule for every pass before it.
--
-- S. 1071 (FY2026 NDAA) is a fourth case and gets its own fix below.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — correct roll 319, which is not the passage vote it is stored as
-- ─────────────────────────────────────────────────────────────────────────────
-- The only S. 1071 roll call we hold is roll 319, and it arrived with an empty
-- question. mapActionType() defaults an empty question to 'passage', so the row
-- claims to be a passage vote. The Clerk's record for roll 319 says
-- "On Motion to Commit" — a yea there sends the bill back to committee, i.e. votes
-- AGAINST it. Left alone, any future mapping of S. 1071 would read 209 yea votes
-- to block the NDAA as 209 votes for it, at full weight.
--
-- Filling in the real question fixes both halves at once: mapActionType() reads
-- "motion" from it (so the 0.25 procedural down-weight applies), and
-- yeaBlocksMeasure() — extended in this same change to recognise the bare "to
-- commit" form the House uses for a Senate bill it has not previously committed —
-- flips the direction. S. 1071 is still NOT mapped to an issue: the House passed
-- the bill 312-112 the following day, so most members who voted to commit also
-- voted for passage, and reading their commit vote as opposition to defense
-- authorization would be wrong in either direction. This only makes the stored
-- record honest about what the vote was.
UPDATE vr_rollcalls SET
  question = 'On Motion to Commit',
  action_type = 'motion',
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND roll_number = 319
  AND (question IS NULL OR question = '');

-- The four roll calls mapped below also arrived with empty questions, which makes
-- their receipts render without saying what was voted on. Their stored action_type
-- ('passage') is already correct — mapActionType() maps both "On Passage" and
-- "On Motion to Suspend the Rules and Pass" to 'passage' — so this is purely
-- filling in Clerk-verified text over an empty field.
UPDATE vr_rollcalls SET question = 'On Passage', updated_at = now()
 WHERE chamber = 'house' AND congress = 119 AND roll_number IN (96, 113, 312, 314)
   AND (question IS NULL OR question = '');

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — the mappings
-- ─────────────────────────────────────────────────────────────────────────────
-- Matched on (congress, number) across EVERY matching row rather than with
-- LIMIT 1: H.Res. 377 proved the same number can exist twice, and a mapping that
-- silently lands on only one of two rows is the defect fixed in the ingest path
-- last pass. ON CONFLICT DO NOTHING keeps this idempotent and stops it from
-- overwriting a mapping someone has since curated by hand.
DO $$
DECLARE
  m record;
  n_rows int := 0;
BEGIN
  -- ── S.J.Res. 18 — CRA disapproval of the CFPB overdraft rule (38 votes) ─────
  -- Nullifies the CFPB rule capping overdraft charges at $5 for banks over $10B.
  -- Two things are true about a yea at once and both are mapped: it strikes a
  -- federal rule (gov_regulation), and it removes a consumer-cost cap on the
  -- largest banks (econ_corp_account, whose chip is checking large corporations).
  -- 217-211 on a near-party-line — the most discriminating vote in this batch.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'S.J.Res. 18' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_regulation', 100, true, 'yea_supports',
        'A Congressional Review Act resolution whose entire operative effect is to nullify a federal rule; a yea strikes the CFPB overdraft regulation off the books.',
        'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18'),
      (m.id, 'econ_corp_account', 75, false, 'yea_opposes',
        'The nullified rule required very large financial institutions to cap overdraft charges at $5, justify a higher cap, or treat overdrafts as credit subject to Truth in Lending Act disclosure; a yea removes that constraint on what the largest banks may charge.',
        'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.J.Res. 78 — CRA disapproval of the longfin smelt listing (37 votes) ───
  -- Nullifies the Fish and Wildlife Service rule listing the San Francisco
  -- Bay-Delta longfin smelt as endangered, removing the species' Endangered
  -- Species Act protection. lands_preserve is the conservation key in the shipped
  -- vocabulary — there is no dedicated wildlife or ESA key — and it is used here
  -- for the habitat/species-protection axis it represents rather than for public
  -- land as such; the rationale says so plainly so the choice is reviewable. The
  -- direction is not arguable: the resolution's own text removes protection.
  -- gov_regulation follows for the same reason it does on S.J.Res. 18.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.J.Res. 78' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'lands_preserve', 90, true, 'yea_opposes',
        'Removes Endangered Species Act protection from the San Francisco Bay-Delta longfin smelt by nullifying its listing; a yea strips a federal conservation protection. Mapped to the conservation key because the vocabulary has no dedicated wildlife or endangered-species key.',
        'https://www.congress.gov/bill/119th-congress/house-joint-resolution/78'),
      (m.id, 'gov_regulation', 70, false, 'yea_supports',
        'A Congressional Review Act resolution striking a federal agency rule; a yea removes the Fish and Wildlife Service regulation.',
        'https://www.congress.gov/bill/119th-congress/house-joint-resolution/78')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1005 — foreign-source funding disclosure by schools (36 votes) ─────
  -- Title as passed by the House: "To require public elementary and secondary
  -- schools to disclose certain funds received from, or contracts with, a foreign
  -- source." The operative requirement is a disclosure mandate, which is the
  -- gov_transparency key almost verbatim ("force more disclosure"), and the
  -- direction is not arguable — a yea compels the disclosure. Deliberately NOT
  -- mapped to a China or foreign-policy key: the bill's text is source-neutral,
  -- and mapping the floor debate rather than the text is how false verdicts start.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1005' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_transparency', 90, true, 'yea_supports',
        'Requires public elementary and secondary schools to disclose funds received from, or contracts with, a foreign source; a yea compels disclosure that is currently not required.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1005')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1049 — parental notification of foreign influence (36 votes) ───────
  -- Requires every local educational agency, as a condition of federal funding, to
  -- ensure its schools notify parents of their right to request and receive
  -- information about foreign influence. "Parental notification" is a literal term
  -- in the edu_parental key's own vocabulary, so that is the primary; the
  -- underlying regime is a disclosure-on-request one, so gov_transparency follows
  -- as a secondary at reduced weight.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1049' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'edu_parental', 100, true, 'yea_supports',
        'Requires schools to notify parents of their right to request and receive information about foreign influence in their child''s school; a yea creates a parental notification right that does not exist today.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1049'),
      (m.id, 'gov_transparency', 65, false, 'yea_supports',
        'Establishes a disclosure-on-request regime for foreign influence in schools as a condition of federal education funding; a yea widens what schools must reveal.',
        'https://www.congress.gov/bill/119th-congress/house-bill/1049')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  RAISE NOTICE 'coverage pass: matched % measure row(s) for mapping', n_rows;
END $$;

-- Sanity notice: how many of the nineteen newly named measures still carry votes
-- with no mapping. Expected to stay above zero — the skips above are deliberate.
DO $$
DECLARE unmapped int;
BEGIN
  SELECT count(*) INTO unmapped
    FROM vr_measures m
   WHERE m.congress = 119
     AND EXISTS (SELECT 1 FROM vr_rollcalls r JOIN vr_member_votes v ON v.rollcall_id = r.id WHERE r.measure_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = m.id);
  RAISE NOTICE 'measures with votes and still no issue mapping: %', unmapped;
END $$;
