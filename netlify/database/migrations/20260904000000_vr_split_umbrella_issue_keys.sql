-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — split the four umbrella issue keys
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM
-- Four keys were held out of public receipt cards by WAVE1_HOLD_ISSUE_KEYS
-- (receipt-cards.js) because "Supports" did not mean one thing under any of
-- them. The hold list is the symptom; the cause is in this table. A key whose
-- said side carries two claims cannot be adjudicated by one measure mapping,
-- so the verdict a member gets is an accident of which claim they filed:
--
--   gov_regulation       — 16 mapping rows, all yea_supports on a chip that
--                          reads "cut regulations". Four of them are on statutes
--                          that CREATE a regulatory regime (H.R. 22's new duties
--                          on election officials, S. 1582's stablecoin licensing
--                          framework, S. 146's FTC takedown enforcement,
--                          H.R. 3633's CFTC/SEC registration rules). On those
--                          four the sign is inverted: a yea adds rules, and the
--                          row scored it as cutting them. 280 member-votes.
--   america_first_fp     — carried three claims under one "Supports": cut or
--                          condition foreign aid; end the wars / Congress must
--                          authorize them; counter China. AOC and Boebert are
--                          both filed Supports here and voted opposite ways on
--                          H.Amdt. 235 and again on H.Amdt. 252.
--   states_federal_power — the direction was declared; WHICH federal–state
--                          boundary was not. Three unrelated boundaries were
--                          averaged together: may a state set its own rule
--                          (preemption), may a state sue Washington (standing),
--                          and who commands the National Guard.
--   checks_balances      — direction coherent, topic not. War powers, nationwide
--                          injunctions, the power of the purse, congressional
--                          oversight and emergency tariff authority all scored
--                          as one number. Simpson, Womack and Cole hold
--                          power-of-the-purse positions and were judged 100% by
--                          war-powers and injunction roll calls.
--
-- THE FIX
-- Seven narrower keys were added to the shared ISSUE_MAP vocabulary
-- (alignment-tool.js, regenerated into db/issue-keys.json by
-- scripts/gen-issue-keys.mjs — every key below MUST be in that allow-list or
-- voting-record.mts silently drops the row at assembleRecordItems), and the
-- four umbrella chips were narrowed in place:
--
--   permitting_reform   "⏱ Faster Permits & Reviews"
--   war_powers          "⚔️ Congress and War Powers"
--   judicial_check      "🧑‍⚖️ Court Orders on the Executive"
--   power_of_purse      "🧮 Power of the Purse"
--   congress_oversight  "🕵 Congressional Oversight"
--   state_standing      "🗽 States Suing Washington"
--   guard_authority     "🪖 Who Commands the National Guard"
--
-- WEIGHT AND is_primary ARE PRESERVED EXACTLY on every re-pointed row, for the
-- reason 20260725010000_vr_offlabel_issue_key_correction.sql gives: weight
-- decides which record wins the ⚖ net-verdict label in stance-helpers.js, so
-- changing one here would be a scoring change disguised as a relabel. Only
-- issue_key and the rationale move. support_meaning is unchanged on every row.
--
-- Ten rows are DELETED rather than re-pointed. Deletion is not a schema or
-- logic change and this migration still rolls forward and never edits an
-- applied migration, but each deletion is justified individually below. Nothing
-- is deleted that is the only mapping on its measure: every affected measure
-- keeps at least two other issue rows and keeps exactly one primary.
--
-- WHAT THIS DOES NOT DO
-- It does not relax publicShareBlock(). The narrower keys have to qualify for
-- public cards on their own merits — several of them (power_of_purse,
-- congress_oversight) end this migration with zero roll calls, which means the
-- members who hold positions there read honestly as "said it, nothing in the
-- record tests it" instead of being scored by a vote about something else.
-- checks_balances stays on the hold list: it keeps exactly one mapping, a
-- litigation row with no roll calls, and it is retained on purpose as the
-- general institutional-posture chip rather than unblocked.
--
-- CURATED SEED PARITY
-- Six of the rows below are also carried in db/vr-issue-seed.json, which
-- applyCuratedIssueSeed() (netlify/lib/vr-ingest.ts) upserts with
-- onConflictDoUpdate on every POST /seed-issues. That file is updated in the
-- same pass and its text is byte-identical to the text here, or the next ingest
-- would put the umbrella keys back: H.R. 3746, S.J.Res. 59, H.R. 29, S. 5,
-- S.Amdt. 23 and S. 1071.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1. gov_regulation → permitting_reform ═══════════════════════════════════
-- Project review is not rulebook size. These three are about how long a federal
-- permit or environmental review takes, and the coalition behind them is
-- cross-party (Westerman, Sam Graves, Golden, Fedorchak) in a way no
-- cut-red-tape vote is — which is the tell that it is a separate axis rather
-- than a softer version of the same one.

UPDATE vr_measure_issues
   SET issue_key = 'permitting_reform',
       rationale = 'Division C, Title III is a permitting-reform title: it narrows the scope of National Environmental Policy Act administrative review, sets page and time limits on environmental reviews, and designates a lead agency. A yea speeds federal project review. Re-keyed from gov_regulation in the August 2026 taxonomy split — the row was always about how long a federal review takes, not about the size of the federal rulebook. Weight 70 and primary status preserved: the NEPA title is what this mapping was always reading.'
 WHERE issue_key = 'gov_regulation'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 3746' AND congress = 118);

UPDATE vr_measure_issues
   SET issue_key = 'permitting_reform',
       rationale = 'Expedites NEPA environmental review and streamlines permitting for qualifying forest-management projects. Re-keyed from gov_regulation in the August 2026 taxonomy split: the measure shortens project review rather than reducing the number of federal rules. Weight 55 preserved.'
 WHERE issue_key = 'gov_regulation'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 471' AND congress = 119);

UPDATE vr_measure_issues
   SET issue_key = 'permitting_reform',
       rationale = 'Eliminates the Energy Department''s separate approval step and consolidates permitting at FERC. Re-keyed from gov_regulation in the August 2026 taxonomy split: removing an approval stage from a project''s path is permitting speed, not rulebook size. Weight 70 preserved.'
 WHERE issue_key = 'gov_regulation'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1949' AND congress = 119);

UPDATE vr_measure_provisions
   SET issue_key = 'permitting_reform'
 WHERE issue_key = 'gov_regulation'
   AND label IN ('End DOE approval for gas import/export',
                 'Expedited environmental review for forest projects');

-- ═══ 2. gov_regulation — the four sign-inverted rows ════════════════════════
-- Each of these four is a statute that CREATES a regulatory regime, mapped
-- yea_supports on a chip whose own content is cutting the number and cost of
-- federal regulations. Their own rationales say so: "imposes new duties and
-- potential penalties", "creates the first comprehensive federal regulatory
-- framework", "directs the Federal Trade Commission to enforce", "assigns
-- jurisdiction and registration rules". A yea adds rules, so the row scored
-- every deregulatory stance-holder as consistent for doing the opposite of what
-- they said. There is no direction to flip to: yea_opposes would make each of
-- these read as a vote against regulation, which is also false. The mapping is
-- the error, so it goes. All four measures keep three to five other issue rows
-- including their primary, so no roll call is orphaned.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'gov_regulation'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE (number, congress) IN (('H.R. 22', 119), ('S. 1582', 119),
                                                    ('S. 146', 119), ('H.R. 3633', 119)));

-- The provision-level rows behind two of them. vr_measure_provisions.issue_key
-- is read at getIssueImpacts() AHEAD of the measure's primary, so leaving these
-- on gov_regulation would keep routing the impacts of a new federal duty to the
-- cut-red-tape chip. An explicit NULL is the documented "no key of its own"
-- state (the H.R. 1 SNAP provision precedent) and falls the provision back to
-- its measure's primary — election_integrity for H.R. 22, privacy_rights for
-- S. 146 — which is where both belong.
UPDATE vr_measure_provisions
   SET issue_key = NULL
 WHERE issue_key = 'gov_regulation'
   AND label IN ('Duties & penalties for election officials', 'FTC enforcement');

-- The digital-asset jurisdiction and licensing provisions are about who
-- regulates digital assets, which is crypto_cbdc's own subject and is already
-- S. 1582's second-strongest mapping at weight 90.
UPDATE vr_measure_provisions
   SET issue_key = 'crypto_cbdc'
 WHERE issue_key = 'gov_regulation'
   AND label IN ('CFTC jurisdiction over digital commodities',
                 'SEC jurisdiction over investment-contract assets',
                 'Issuer licensing regime',
                 'Anti-money-laundering & sanctions compliance');

-- H.R. 26's measure-level gov_regulation row STAYS: barring the executive from
-- imposing a federal fracking ban does prevent a federal rule, which is the
-- narrowed chip's own content, and removing a directionally correct mapping to
-- make the key look tidier would be excusing the key rather than fixing it. Its
-- provision, though, is labelled state primacy, and that is preemption.
UPDATE vr_measure_provisions
   SET issue_key = 'states_federal_power'
 WHERE issue_key = 'gov_regulation'
   AND label = 'State primacy over fracking';

-- ═══ 3. america_first_fp / checks_balances → war_powers ═════════════════════
-- Five war-powers instruments. Three of them (S.J.Res. 59, H.Con.Res. 89,
-- H.Con.Res. 108) carried BOTH an america_first_fp row and a checks_balances
-- row, which is the umbrella defect in its clearest form: the same yea was
-- being counted twice, once as a foreign-policy posture and once as an
-- institutional one. war_powers takes one row per measure — the heavier of the
-- two, unchanged in weight — and the lighter duplicate is deleted. No weight is
-- edited to make a row win.

-- S.J.Res. 59: america_first_fp w70 is the heavier of the pair, so it moves.
UPDATE vr_measure_issues
   SET issue_key = 'war_powers',
       rationale = 'A privileged joint resolution under section 5(c) of the War Powers Resolution directing removal of U.S. forces from hostilities with Iran absent congressional authorization; a yea asserts that the authorization decision belongs to Congress. Re-keyed from america_first_fp in the August 2026 taxonomy split, which narrowed that key to foreign aid and open-ended commitments; who authorizes the use of force now has its own key. Weight 70 preserved. The resolution''s controlling axis is still the posture toward the conflict, which the restraint row carries at 100.'
 WHERE issue_key = 'america_first_fp'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S.J.Res. 59' AND congress = 119);

-- and its lighter checks_balances duplicate goes.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S.J.Res. 59' AND congress = 119);

-- H.Con.Res. 89 / 108: checks_balances w75 is the heavier of the pair.
UPDATE vr_measure_issues
   SET issue_key = 'war_powers',
       rationale = 'A privileged resolution under section 5(c) of the War Powers Resolution directing the removal of U.S. forces from hostilities with Iran absent congressional authorization; a yea asserts Congress''s constitutional war-powers role against unilateral executive military action. Same instrument, and same direction, as the Senate''s S.J.Res. 59. Re-keyed from checks_balances in the August 2026 taxonomy split: war powers, injunctions, the purse and oversight were being scored as one number, and a member who holds a war-powers position is entitled to be judged by war-powers votes. Weight 75 preserved.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 89' AND congress = 119);

UPDATE vr_measure_issues
   SET issue_key = 'war_powers',
       rationale = 'A privileged resolution under section 5(c) of the War Powers Resolution directing the removal of U.S. forces from hostilities in Lebanon absent congressional authorization; a yea asserts Congress''s war-powers role against unilateral executive military action. Re-keyed from checks_balances in the August 2026 taxonomy split, on the same reasoning as H.Con.Res. 89. Weight 75 preserved.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 108' AND congress = 119);

DELETE FROM vr_measure_issues
 WHERE issue_key = 'america_first_fp'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE number IN ('H.Con.Res. 89', 'H.Con.Res. 108') AND congress = 119);

-- The two vetoed 116th-Congress resolutions. These come from
-- db/exec-action-seed.json, whose issue rows were re-keyed in the same pass, so
-- the seed and the table still cannot disagree. No roll calls attach to either.
UPDATE vr_measure_issues
   SET issue_key = 'war_powers',
       rationale = 'A joint resolution directing the removal of United States forces from hostilities that Congress had not authorized; a yea asserts that the authorization decision belongs to Congress, and the veto is read against it. Re-keyed from america_first_fp in the August 2026 taxonomy split: this row was always about who authorizes the use of force, not about what the United States funds abroad. Weight 75 preserved.'
 WHERE issue_key = 'america_first_fp'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE number IN ('S.J. Res. 7', 'S.J. Res. 68') AND congress = 116);

-- ═══ 4. america_first_fp — the confirmation-vote row ════════════════════════
-- The DNI confirmation was mapped america_first_fp at weight 100 primary on the
-- rationale "Gabbard has argued for a more restrained U.S. posture abroad" —
-- a fact about the nominee's views, not a direction readable from the text of
-- the vote, which is "shall the Senate advise and consent". This repo's own
-- curation rule (20260725000000_vr_multi_issue_mappings_wave2.sql) is to skip
-- any mapping whose direction cannot be read from the text, and
-- 20260725010000 already deleted eight cabinet-confirmation rows on exactly
-- this ground. Under the narrowed key — cut, condition or wind down foreign aid
-- and commitments — this vote adjudicates nothing, yet it was the ONLY
-- on-mechanism vote several China-focused stance-holders had. Its 84 votes were
-- deciding their verdicts. Deleted, and foreign_balance (the honest headline for
-- a DNI confirmation) is promoted to primary in its place so the measure keeps
-- exactly one.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'america_first_fp'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE measure_type = 'nomination' AND number = 'Gabbard — DNI');

UPDATE vr_measure_issues
   SET is_primary = TRUE
 WHERE issue_key = 'foreign_balance'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Gabbard — DNI')
   AND NOT EXISTS (SELECT 1 FROM vr_measure_issues p
                    WHERE p.measure_id = vr_measure_issues.measure_id AND p.is_primary);

-- ═══ 5. checks_balances → judicial_check ═══════════════════════════════════
-- Both rows are about whether a court may halt executive action. They were the
-- two heaviest mappings on the umbrella key, so on the old filing a member who
-- had said nothing about injunctions and everything about the purse still got
-- most of their verdict from these two roll calls.

UPDATE vr_measure_issues
   SET issue_key = 'judicial_check',
       rationale = 'Bars a district court from granting injunctive relief broader than the parties before it, ending the nationwide injunction — the principal judicial remedy for halting federal action while it is challenged. Recorded as a yea cutting against judicial checks on the executive; supporters make the opposite case, that one district judge should not set national policy. Re-keyed from checks_balances in the August 2026 taxonomy split so that only members who took a position on court orders are judged by it. Weight 100 and primary status preserved.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1526' AND congress = 119);

UPDATE vr_measure_issues
   SET issue_key = 'judicial_check',
       rationale = 'Bars any court from issuing an injunction that impairs military readiness, military fuel supply, or defense-related logistical support. Recorded as a yea removing a judicial check on executive action, the same reading the corpus applies to H.R. 1526''s bar on nationwide injunctions; supporters make the opposite case, that litigation should not be able to halt military operations. Re-keyed from checks_balances in the August 2026 taxonomy split. Weight 100 and primary status preserved: this amendment is the only roll call in the record isolating the question.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.Amdt. 247' AND congress = 119);

UPDATE vr_measure_provisions
   SET issue_key = 'judicial_check'
 WHERE issue_key = 'checks_balances'
   AND label = 'Bar on universal (nationwide) injunctions';

-- ═══ 6. checks_balances → power_of_purse ═══════════════════════════════════
-- One litigation row, no roll calls. That is the point: Simpson, Womack and
-- Cole hold appropriations positions and were previously scored 100% by war
-- powers and injunctions. On the narrow key their record reads "stated, and
-- nothing in the roll-call record tests it", which is true.
UPDATE vr_measure_issues
   SET issue_key = 'power_of_purse',
       rationale = 'The suit challenges a unilateral freeze of funds Congress had already appropriated — the power of the purse — and seeks relief under the Administrative Procedure Act; joining it asserts that the executive cannot impound appropriated money on its own. Re-keyed from checks_balances in the August 2026 taxonomy split: appropriations enforcement is its own mechanism, and the members who hold positions on it had been judged entirely by war-powers and injunction roll calls. Weight 75 preserved.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'New York v. Trump (D.R.I. 1:25-cv-00039)');

-- ═══ 7. checks_balances → crypto_cbdc ══════════════════════════════════════
-- The Anti-CBDC Surveillance State Act's institutional framing is real, but the
-- claim a member is filing when they support it is about a central bank digital
-- currency. Emmer's CBDC position was being scored as contradicted by the
-- nationwide-injunction bill and the military-injunction amendment.
UPDATE vr_measure_issues
   SET issue_key = 'crypto_cbdc',
       rationale = 'Reserves to Congress the decision on whether the United States ever issues a central bank digital currency, barring the Federal Reserve from acting without explicit statutory authorization; a yea blocks a CBDC absent an act of Congress. Re-keyed from checks_balances in the August 2026 taxonomy split: the subject a member commits to here is the digital dollar, and the measure''s privacy_rights primary at 100 already carries the surveillance axis. Weight 65 preserved.'
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1919' AND congress = 119);

UPDATE vr_measure_provisions
   SET issue_key = 'crypto_cbdc'
 WHERE issue_key = 'checks_balances'
   AND label = 'Congressional authorization required';

-- ═══ 8. checks_balances — the two emergency-tariff rows ════════════════════
-- Both are already mapped tariffs_authority at weight 100 primary, which is the
-- on-point key and says the same thing more precisely. Keeping the umbrella
-- copy double-counted one act across two keys and put 84 Senate votes on
-- checks_balances for a member who had said nothing about anything else on it.
-- Deleted rather than re-pointed because the destination row already exists.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE number IN ('S.J.Res. 37', 'Oregon v. Trump (1:25-cv-00077)'));

-- ═══ 9. states_federal_power → state_standing ══════════════════════════════
-- Whether a state may sue Washington is a different question from whose rule
-- governs a shared subject. Mike Collins is the only member with a filed
-- position on it, and on the old key his verdict was an average of that
-- position and the California waiver repeals.

UPDATE vr_measure_issues
   SET issue_key = 'state_standing',
       rationale = 'Section 3, ''Enforcement by attorney general of a State'', amends INA 235(b) (8 U.S.C. 1225(b)) to give the attorney general of a State, or another authorised State officer, standing to sue the Secretary of Homeland Security in federal district court over alleged violations of the detention and removal requirements that harm the State or its residents. A yea creates a state cause of action against the federal government. Weighted 40, identical to S. 5''s mapping. The same section is what the Senate''s S.Amdt. 23 tried and failed to strike. Re-keyed from states_federal_power in the August 2026 taxonomy split: a cause of action against the federal government now has its own key.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119);

UPDATE vr_measure_issues
   SET issue_key = 'state_standing',
       rationale = 'Gives state attorneys general standing to sue the federal government over certain immigration-detention and enforcement decisions; a yea expands state authority to contest federal enforcement choices in court. Re-keyed from states_federal_power in the August 2026 taxonomy split: a cause of action against the federal government now has its own key.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 5' AND congress = 119);

UPDATE vr_measure_issues
   SET issue_key = 'state_standing',
       rationale = 'Amendment to S. 5 (Laken Riley Act) whose stated purpose is ''To strike the section that authorizes State attorneys general to sue Federal immigration authorities for alleged violations relating to the detention of aliens.'' A YEA REMOVES a state cause of action against the federal government, so a yea cuts against letting states take Washington to court — the mirror of S. 5''s own mapping, which is yea_supports because passing the bill is what created the standing. Rejected 46-49, so the section survived into Public Law 119-1. Re-keyed from states_federal_power in the August 2026 taxonomy split. Weight 100 and primary status preserved: this is the record''s only roll call isolating the provision.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S.Amdt. 23' AND congress = 119);

UPDATE vr_measure_provisions
   SET issue_key = 'state_standing'
 WHERE issue_key = 'states_federal_power'
   AND label = 'State standing to sue the federal government';

-- ═══ 10. states_federal_power → guard_authority ════════════════════════════
-- Who commands the National Guard is the third boundary the umbrella averaged.
-- Newsom, Bonta and Jayapal hold positions on it; on the old key they were
-- pooled with the hemp, state-AI and Clean Air Act waiver rows. All five moved
-- rows keep their weight and their primary status.

UPDATE vr_measure_issues
   SET issue_key = 'guard_authority',
       rationale = 'A dispute over whether the federal government may command a state''s National Guard without the governor''s consent; joining the suit asserts state authority over its own Guard. Re-keyed from states_federal_power in the August 2026 taxonomy split, which narrowed that key to whose rule governs a shared subject. Weight and primary status preserved.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE number IN ('Newsom v. Trump (N.D. Cal. 3:25-cv-04870)',
                                        'Illinois v. Trump (N.D. Ill., 2025)',
                                        'Oregon v. Trump (D. Or., 2025)'));

UPDATE vr_measure_issues
   SET issue_key = 'guard_authority',
       rationale = 'States sending their own Guard to the capital at federal request, amid federal control of District policing; recorded as the exercise of state discretion over state forces. Re-keyed from states_federal_power in the August 2026 taxonomy split: command of the Guard is its own question. Weight and primary status preserved.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'D.C. Guard deployment (2025)');

UPDATE vr_measure_issues
   SET issue_key = 'guard_authority',
       rationale = 'Section 512 inserts a new 32 U.S.C. 328a: the chief executive of a State that has declared an emergency due to a disaster may order a member of that State''s National Guard who is serving on Active Guard and Reserve duty to perform State disaster-response duty. A yea hands a governor direct authority over federally paid Guard personnel. Weighted 25 — the lowest mapping in that pass — because the authority is gated on the Secretary of Defense''s consent, is reimbursable by the State, and is capped at 14 days per member per calendar year (extendable by 7 days, or by 46 for a catastrophic incident). It is a real Title 32 shift toward the states, but it is one narrow section of a 312-112 defence authorisation and must not be read as a referendum on who commands the Guard. Re-keyed from states_federal_power in the August 2026 taxonomy split.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 1071');

-- ═══ 11. checks_balances — the four Guard rows ═════════════════════════════
-- Each of these four documents carried a states_federal_power row (now
-- guard_authority, above) AND a checks_balances row saying the same thing at a
-- lower weight. The narrow key now holds the claim; the umbrella copy would
-- only put Guard litigation back into the number a war-powers or oversight
-- stance-holder is judged by. Deleted rather than re-pointed because the
-- destination row already exists on each.
DELETE FROM vr_measure_issues
 WHERE issue_key = 'checks_balances'
   AND measure_id IN (SELECT id FROM vr_measures
                       WHERE number IN ('Newsom v. Trump (N.D. Cal. 3:25-cv-04870)',
                                        'Illinois v. Trump (N.D. Ill., 2025)',
                                        'Oregon v. Trump (D. Or., 2025)',
                                        'D.C. Guard deployment (2025)'));

-- ═══ 12. the two rationales that quoted a chip that no longer exists ═══════
-- Both mappings are correct and stay where they are; the prose quoted the old
-- chip text verbatim as its justification, so it had to move with the chip.
UPDATE vr_measure_issues
   SET rationale = 'Nineteen of the enrolled Act''s twenty rescission paragraphs strike unobligated foreign-assistance balances, roughly $7.9 billion in all: Development Assistance $2.5B, Economic Support Fund $1.65B, Migration and Refugee Assistance $800M, International Disaster Assistance $496M, Assistance for Europe, Eurasia and Central Asia $460M, International Organizations and Programs $436.9M, Global Health Programs $500M, the Clean Technology Fund $125M, USAID Operating Expenses $125M and the United States Institute of Peace $15M, among others. The america_first_fp chip now reads "cut, condition or wind down U.S. foreign aid and open-ended commitments abroad" — rescinding appropriated foreign aid is that chip''s own stated content, so a yea supports it. Weighted 65 and not primary because the measure''s controlling axis is still spending, not foreign policy. This mapping is why the narrowed key kept its name: aid is what it was always mostly reading.'
 WHERE issue_key = 'america_first_fp'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'The order directs the Election Assistance Commission to condition federal funds on state adoption of the national mail voter registration form as amended by the order, and directs the Attorney General to enforce against states that count absentee or mail ballots received after election day. Mapped opposes on the narrowed chip "when federal and state rules cover the same subject, let the state''s choice stand unless there''s a clear national reason to override it," which the order overrides by directing state election administration from Washington. Note the standing rows already on this document: a federal court has permanently enjoined parts of it. This mapping records what the order directed, and the standing rows record what survived.'
 WHERE issue_key = 'states_federal_power'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'Executive Order 14248');

-- ═══ What is left on each key ══════════════════════════════════════════════
--   gov_regulation       — 8 measure rows, every one a Congressional Review Act
--                          disapproval or a red-tape bill, every one
--                          yea_supports on "cut the rules". Coherent.
--   america_first_fp     — 13 rows, every one about aid, rescissions or funding
--                          for commitments abroad. Coherent.
--   states_federal_power — 8 rows, all preemption: Clean Air Act waivers, state
--                          AI law, stablecoin dual oversight, fracking primacy,
--                          election administration, the Arizona amicus.
--   checks_balances      — 1 row, State of Washington v. Trump, no roll calls.
--                          Retained deliberately as the general
--                          institutional-posture chip and kept on the receipt-
--                          card hold list; it is not expected to gain roll-call
--                          mappings, because every mechanism it used to cover
--                          now has its own key.
DO $$
DECLARE n_umb INT; n_new INT;
BEGIN
  SELECT count(*) INTO n_umb FROM vr_measure_issues
   WHERE issue_key IN ('gov_regulation', 'america_first_fp', 'states_federal_power', 'checks_balances');
  SELECT count(*) INTO n_new FROM vr_measure_issues
   WHERE issue_key IN ('permitting_reform', 'war_powers', 'judicial_check', 'power_of_purse',
                       'congress_oversight', 'state_standing', 'guard_authority');
  RAISE NOTICE 'umbrella split: % rows remain on the four narrowed keys, % rows on the seven new keys', n_umb, n_new;
END $$;
