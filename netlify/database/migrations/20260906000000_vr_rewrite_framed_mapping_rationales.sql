-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — re-cut the mapping rationales that printed a framing
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM
-- A curated mapping row answers one question: what does this measure do on this
-- issue, such that a recorded yea or nay is evidence of a position on it. The
-- `rationale` column is the answer, and it is not an internal note — it is what
-- the dossier prints one fold down from the roll call ("What the document
-- actually says", consistency.js) and what bill-detail.js prints as the
-- why-line under the bundled-issues list.
--
-- 27 rows were not answering that question. They were recording who said what
-- ABOUT the measure:
--
--   "Framed by supporters as clawing back wasteful or low-priority spending."
--   "Opponents held that constraining the commander-in-chief would weaken
--    deterrence; a yea cuts against that view."
--   "Recorded neutrally: some public-health advocates argue permanent
--    scheduling and mandatory minimums emphasize enforcement over treatment."
--
-- None of those state an effect. The first is an argument, attributed. The
-- second gives a member a verdict for disagreeing with an unnamed opponent. The
-- third openly declines to say what the bill does at all. Share-card guard 16
-- (blockFramedMapping in receipt-cards.js) already refused to publish any card
-- resting on one of these, correctly — but the guard only covers the off-app
-- card. On the site itself these sentences printed as the explanation, which is
-- the worse surface, because that is where a reader goes to check the work.
--
-- The 27 sat on 24 measures carrying 2,103 member-votes and blocked 53
-- otherwise-rankable (member, issue) pairs.
--
-- THE FIX, IN TWO PARTS
-- 18 rows are rewritten from the measure's own text — the title, the summary on
-- file in vr_measures, and the enacted-law citation where there is one. Each new
-- rationale states the operative change and then, in one clause, what a yea
-- therefore does. No guard was relaxed and no weight, support_meaning or issue
-- key was touched: the same votes count the same way, they are now explained by
-- the statute instead of by a spokesman.
--
-- 9 rows are deleted, because there was no effect under the framing to recover:
--
--   · The three Cabinet confirmations (Bondi/gov_transparency,
--     Patel/gov_transparency, McMahon/public_schools). A confirmation vote
--     installs a person; it enacts no transparency or schools provision. The
--     mapping existed only to carry what opponents warned the nominee would do
--     in office. BLOCKED_MEASURE_TYPES in receipt-cards.js already says a
--     confirmation cannot carry a policy claim off-app; this says the same thing
--     one level down, in the data. Each measure keeps its primary mapping
--     (tough_on_crime, tough_on_crime, school_choice) — the office itself is a
--     defensible mapping, the second-order policy prediction was not.
--
--   · The three National Guard federalization suits (Newsom, Illinois, Oregon →
--     immig_balance). Their own rationales said it plainly: "the immigration
--     context is recorded neutrally". Context is not effect. The dispute is over
--     10 U.S.C. 12406 and the Posse Comitatus Act, and each case keeps
--     guard_authority at weight 100, which is what it is actually about. Zero
--     member-votes attach to these rows, so nothing is lost but a wrong label.
--
--   · S. 1582 (GENIUS Act) → econ_corp_account at yea_opposes. The statute
--     creates reserve-backing, disclosure and licensing duties for stablecoin
--     issuers. Read from the text, that is a yea ADDING corporate obligations;
--     the row scored it as cutting against corporate accountability, and the
--     only thing supporting that sign was the sentence "Opponents argued the
--     framework was too light". A rationale written from the text would have
--     contradicted the row's own direction. The measure already carries
--     tech_balance ("Balances digital-asset innovation against reserve,
--     disclosure…"), which holds the same ground with the sign the text
--     supports, so the row is redundant as well as inverted.
--
--   · H.R. 1048 (DETERRENT Act) → free_speech. The Act lowers foreign-gift
--     reporting thresholds and adds a disclosure database and fines. That is a
--     disclosure mandate; the free-speech link was a predicted chilling effect
--     ("could chill academic exchange"), not a provision. gov_transparency
--     (primary, 100), edu_balance and america_first survive and carry the bill.
--
--   · H.R. 6703 → pro_life. The row rested on a specific claim — that the
--     cost-sharing-reduction funding it appropriates carries abortion-funding
--     restrictions — that nothing else in the record supports: the measure
--     summary on file describes association health plans and PBM transparency,
--     and there is no vr_measure_provisions row for it. Rewriting the sentence
--     would have promoted an unverified provision claim from "blocked" to
--     "publishable on a share card", which is the wrong direction to move an
--     unsourced assertion. Dropped rather than dressed up.
--
-- WHAT THIS MIGRATION DOES NOT DO
-- No scoring formula, weight, support_meaning or issue key changes. No guard
-- regex is touched. Nothing is re-keyed: a rationale that could not be written
-- from the text was removed, not moved to a friendlier key.
--
-- SEED PARITY
-- Eight of the rewritten rows are also authored in db/vr-issue-seed.json, which
-- applyCuratedIssueSeed() re-upserts over this table on every live ingest with
-- ON CONFLICT DO UPDATE SET rationale. Those eight are updated in the seed in
-- the same commit; without that, the next ingest would silently restore the
-- framings. The other ten rewrites and all nine deletions are DB-only rows —
-- the seed carries neither nominations nor litigation nor those numbers, and
-- applyCuratedIssueSeed never deletes, so the drops stay dropped.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1. Rewritten from the measure text ═════════════════════════════════════

-- H.R. 4 (119th) — Rescissions Act of 2025. Two rows; the c117 H.R. 4 (John R.
-- Lewis Voting Rights Advancement Act) is a different measure and is untouched,
-- which is why every H.R. 4 clause below pins congress = 119.
UPDATE vr_measure_issues
   SET rationale = 'Cancels roughly $9 billion in budget authority Congress had already enacted, rescinding it from foreign-assistance accounts and from the Corporation for Public Broadcasting. A yea returns appropriated money to the Treasury unspent.'
 WHERE issue_key = 'gov_waste'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Rescinds the enacted appropriation for the Corporation for Public Broadcasting, ending federal funding for NPR and PBS member stations. A yea withdraws public money from independent broadcast outlets.'
 WHERE issue_key = 'free_speech'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119);

-- H.J.Res. 25 — CRA resolution nullifying the IRS DeFi broker rule (PL 119-5).
UPDATE vr_measure_issues
   SET rationale = 'Nullifies the IRS rule that extended broker tax-reporting duties to decentralized-finance platforms, so those platforms are not required to collect and report user transaction data. A yea removes that reporting duty from decentralized software. Enacted as Public Law 119-5.'
 WHERE issue_key = 'tech_innovation'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.J.Res. 25' AND congress = 119);

-- H.J.Res. 88 — CRA revoking the Advanced Clean Cars II waiver. The two rows say
-- different things because they are keyed to different issues: what the waiver
-- revocation does to the vehicle market (energy_production) and what it does to
-- the choice set a buyer faces (cost_living). Neither asserts a price movement,
-- which is not in the record.
UPDATE vr_measure_issues
   SET rationale = 'Revokes the Clean Air Act waiver behind California''s Advanced Clean Cars II rule, ending the requirement that a rising share of new vehicles sold be zero-emission in California and in the dozen states that adopted it. A yea keeps internal-combustion vehicles saleable in those markets.'
 WHERE issue_key = 'energy_production'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.J.Res. 88' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Removes the requirement that a rising share of new vehicle sales be zero-emission in the states that adopted the California rule, so the mix of new vehicles offered for sale there is set by the market rather than by the mandate schedule. A yea lifts that constraint on what a buyer can choose from.'
 WHERE issue_key = 'cost_living'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.J.Res. 88' AND congress = 119);

-- H.J.Res. 89 — CRA revoking the Advanced Clean Trucks waiver.
UPDATE vr_measure_issues
   SET rationale = 'Revokes the Clean Air Act waiver behind California''s Advanced Clean Trucks rule, ending the requirement that a rising share of new medium- and heavy-duty truck sales be zero-emission. A yea removes that limit on conventional truck sales.'
 WHERE issue_key = 'energy_production'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.J.Res. 89' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Ends the requirement that a rising share of new medium- and heavy-duty trucks sold in the adopting states be zero-emission, leaving fleet purchasers free to buy conventional trucks. A yea removes that purchase requirement from the freight chain.'
 WHERE issue_key = 'cost_living'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.J.Res. 89' AND congress = 119);

-- H.R. 22 — SAVE Act.
UPDATE vr_measure_issues
   SET rationale = 'Requires documentary proof of U.S. citizenship to register to vote in federal elections. A yea adds a documentary precondition to federal voter registration.'
 WHERE issue_key = 'voting_access'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 22' AND congress = 119);

-- H.R. 471 — Fix Our Forests Act. The permitting_reform row on this measure was
-- already rewritten in 20260904000000; this is the enviro_balance row, which was
-- still carrying a conservation-group warning instead of the review provisions.
UPDATE vr_measure_issues
   SET rationale = 'Expedites environmental review of forest-thinning and hazardous-fuels projects inside designated fireshed management areas, and tightens the timelines and standards for court challenges to those projects. A yea shortens both the review and the window to contest it.'
 WHERE issue_key = 'enviro_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 471' AND congress = 119);

-- H.R. 1919 — Anti-CBDC Surveillance State Act.
UPDATE vr_measure_issues
   SET rationale = 'Bars the Federal Reserve from issuing a central bank digital currency, from holding accounts directly for individuals, and from offering retail financial products, in each case absent express authorization from Congress. A yea forecloses a class of payments technology by statute until Congress acts.'
 WHERE issue_key = 'tech_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1919' AND congress = 119);

-- H.R. 1949 — Unlocking Domestic LNG Potential Act.
UPDATE vr_measure_issues
   SET rationale = 'Removes the Department of Energy''s separate approval requirement for natural-gas imports and exports, gives FERC sole authority over the siting and construction of LNG terminals, and directs by statute that exports be deemed consistent with the public interest. A yea eliminates the review stage at which the emissions and price effects of an export were weighed.'
 WHERE issue_key = 'climate_action'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1949' AND congress = 119);

-- S. 146 — TAKE IT DOWN Act.
UPDATE vr_measure_issues
   SET rationale = 'Imposes a federal notice-and-takedown duty on covered online platforms: reported nonconsensual intimate imagery must be removed within 48 hours of notice, enforced by the FTC, with a liability shield for good-faith removals. A yea creates a statutory removal obligation over already-published content.'
 WHERE issue_key = 'free_speech'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 146' AND congress = 119);

-- S. 331 — HALT Fentanyl Act (PL 119-26).
UPDATE vr_measure_issues
   SET rationale = 'Permanently places fentanyl-related substances as a class in Schedule I and applies to them the quantity thresholds and mandatory-minimum prison terms that attach to fentanyl analogues, while adding a registration pathway for Schedule I research. A yea sets the federal response to this class of substances in criminal-penalty terms.'
 WHERE issue_key = 'health_mental'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 331' AND congress = 119);

-- S.J.Res. 37 — terminate the Canada tariff emergency.
UPDATE vr_measure_issues
   SET rationale = 'Terminates the national emergency declaration that is the legal basis for the tariffs on Canadian imports; a yea ends those duties. Passed the Senate 51-48 and did not advance in the House.'
 WHERE issue_key = 'tariffs_prices'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S.J.Res. 37' AND congress = 119);

-- S.J.Res. 59 / H.Con.Res. 89 / H.Con.Res. 108 — the war-powers instruments. The
-- war_powers rows on these three were rewritten in 20260904000000; these are the
-- strong_defense rows, which still explained a yea by what its opponents thought
-- of it. The instrument is the same, so the sentences are parallel by design.
UPDATE vr_measure_issues
   SET rationale = 'Requires congressional authorization before continued U.S. hostilities against Iran and directs the removal of forces from hostilities Congress has not authorized. A yea withdraws U.S. forces from an ongoing engagement absent a vote of Congress.'
 WHERE issue_key = 'strong_defense'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S.J.Res. 59' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Directs the President under section 5(c) of the War Powers Resolution to remove U.S. Armed Forces from hostilities with Iran absent congressional authorization. A yea ends an ongoing military engagement by concurrent resolution.'
 WHERE issue_key = 'strong_defense'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 89' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Directs the President under section 5(c) of the War Powers Resolution to remove U.S. Armed Forces from hostilities in Lebanon. A yea ends that deployment by concurrent resolution.'
 WHERE issue_key = 'strong_defense'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 108' AND congress = 119);

-- H.Amdt. 252 (Crane) to H.R. 8800 — the Ukraine Security Assistance funding bar.
-- The old sentence also cross-referenced S.J.Res. 59 as "same framing", which was
-- true and was the problem; the amendment has its own effect and now states it.
UPDATE vr_measure_issues
   SET rationale = 'Prohibits the use of appropriated funds for the Ukraine Security Assistance Initiative, with an exception only for U.S. embassy security in Ukraine. A yea ends U.S. military assistance to a partner already at war.'
 WHERE issue_key = 'strong_defense'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Amdt. 252' AND congress = 119);

-- ═══ 2. Deleted — no effect to recover under the framing ════════════════════

-- One statement per row, each addressing exactly one mapping. The predicate shape
-- is identical to the UPDATEs above — issue_key plus a measure resolved by number
-- and congress — so scripts/vr-pending-mapping-overlay.mjs can read this file and
-- report what the migration will do before the platform applies it. Litigation
-- measures carry congress = NULL and are pinned by their full case number, which
-- matters here: there are two "Oregon v. Trump" rows and only one of them is the
-- 2025 National Guard suit.

-- The three Cabinet confirmations. Primary mappings (tough_on_crime,
-- tough_on_crime, school_choice) are deliberately left in place.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'gov_transparency'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Bondi — AG' AND congress = 119);

DELETE FROM vr_measure_issues
 WHERE issue_key = 'gov_transparency'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Patel — FBI' AND congress = 119);

DELETE FROM vr_measure_issues
 WHERE issue_key = 'public_schools'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'McMahon — ED' AND congress = 119);

-- The three National Guard federalization suits. guard_authority (weight 100,
-- primary) survives on each and is what the litigation is about.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'immig_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Newsom v. Trump (N.D. Cal. 3:25-cv-04870)' AND congress IS NULL);

DELETE FROM vr_measure_issues
 WHERE issue_key = 'immig_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Illinois v. Trump (N.D. Ill., 2025)' AND congress IS NULL);

DELETE FROM vr_measure_issues
 WHERE issue_key = 'immig_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Oregon v. Trump (D. Or., 2025)' AND congress IS NULL);

-- S. 1582 (GENIUS Act) — sign-inverted against its own text and duplicated by the
-- tech_balance row.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'econ_corp_account'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 1582' AND congress = 119);

-- H.R. 1048 (DETERRENT Act) — a predicted chilling effect, not a provision.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'free_speech'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1048' AND congress = 119);

-- H.R. 6703 — rested on a provision claim the record does not carry.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'pro_life'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 6703' AND congress = 119);
