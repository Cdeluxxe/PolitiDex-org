#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — fiscal & enforcement vote seed
//   H.R. 1 (P.L. 119-21) · H.R. 4 (P.L. 119-28) · S. 331 (P.L. 119-26) · H.R. 3486
// ---------------------------------------------------------------------------
// Builds db/vr-fiscal-enforcement-vote-seed.json from the two chambers' OWN roll-call
// XML: clerk.house.gov/evs/<year>/roll<NNN>.xml and senate.gov's
// roll_call_votes/vote<C><S>/vote_<C>_<S>_<NNNNN>.xml. Nothing here is typed in from a
// news account or a secondary tracker; every roll is re-verified against the chamber's
// own citation fields before it is admitted, and a selection that fails verification is
// DROPPED with a note rather than corrected by hand.
//
// WHY THIS PASS LOOKS DIFFERENT FROM THE EARLIER LANDMARK PASSES
//
// The coverage report's largest rankability deficits are not missing bills. They are
// missing PEOPLE on bills the record already describes well. Three of the 119th
// Congress's most consequential laws are in the database with full, careful issue
// mappings and almost no attributed voters, because their rolls were hand-curated from
// documented patterns before the fail-closed Clerk/LIS builders existed:
//
//   H.R. 1  → P.L. 119-21, the 2025 reconciliation act. FOURTEEN mapped issue keys,
//             four of them yea_opposes — by far the widest issue surface of any measure
//             in the record (see 20260720000000_hr1_omnibus_component_issues.sql and
//             20260807000000_seed_exec_actions_wave1.sql). Its decisive House roll
//             119/1/190 carries 39 hand-listed members out of 432 cast, and the FIRST
//             House passage roll 119/1/145 — the 215-214 one-vote passage of 2025-05-22
//             — is not in the record at all. Each attributed member gains up to fourteen
//             mapped axes at once, so this is the single largest rankability multiplier
//             available anywhere in the dataset.
//
//   H.R. 4  → P.L. 119-28, the Rescissions Act of 2025. House roll 119/1/168 carries 9
//             members, Senate roll 119/1/411 carries a hand-curated handful. The measure
//             is the record's cleanest cut_spending vote and the ONLY rescission roll in
//             it, which matters because checks_balances' own keyword list names
//             'rescission' and 'impoundment'.
//
//   S. 331  → P.L. 119-26, the HALT Fentanyl Act. Senate roll 119/1/127 carries EIGHT of
//             100 senators, and the House's 321-104 passage roll 119/1/166 is absent.
//             immig_fentanyl has 2 stance-holders on the roster and tough_on_crime 8, so
//             this is thin ground on the stated-position side — but a 321-104 roll is one
//             of the few fentanyl votes that actually separates members, and the record
//             cannot test what it has not attributed.
//
// One genuinely new measure is added, chosen because it is single-subject enough to map
// honestly without a Secure-America-scale text read:
//
//   H.R. 3486 → Stop Illegal Entry Act of 2025. Passed the House 226-197 on 2025-09-11
//             (roll 119/1/264), received in the Senate 2025-09-15 and went no further, so
//             it is filed passed_house and NOT as law. Two sections, both sentencing: it
//             raises the INA §275 improper-entry maximum from 2 to 5 years, adds a
//             5-year mandatory minimum for an unlawful entrant later convicted of any
//             crime punishable by more than a year, rewrites §276 reentry penalties to a
//             10-year base and 15 years for three or more drug/person misdemeanours, and
//             sets a 10-year mandatory minimum for reentry after an aggravated-felony or
//             felony conviction. Read from the engrossed text, not from a summary.
//
// Attribution is fail-closed and identical to scripts/vr-build-landmark-vote-seed.mjs:
// the House XML carries a bioguide in @name-id so a member resolves directly through
// db/vr-member-map.json; the Senate XML carries no bioguide, so a senator resolves on
// (surname, state) and ONLY a unique hit is accepted. isParty is computed over the full
// chamber before roster filtering, and `totals` is always the full chamber tally.
//
// Read-only apart from the seed file it writes. No database.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};
const ROSTER = memberMap.members || [];

const CG = (c, kind, n) => `https://www.congress.gov/bill/${c}th-congress/${kind}/${n}`;

// ── The four measures, and the rolls each contributes ───────────────────────
// `rolls` is an ordered list rather than the landmark builder's house/senate pair,
// because three of these four measures contributed TWO decisive rolls in the same
// chamber-pair and one contributed two in the House alone (H.R. 1's original passage
// and its motion to concur in the Senate amendment).
//
// `mustExist` marks a measure the record already holds: the migration looks it up and
// refuses to invent it, so a `create` block would be a second, competing description of
// a row another migration owns. `create` appears only on the row this pass introduces.
const SELECTIONS = [
  {
    number: "H.R. 1", measureType: "bill", congress: 119, chamber: "house",
    rolls: [
      // 2025-05-22, 215-214 with one voting present. The narrowest passage of the
      // Congress; not in the record before this pass.
      { chamber: "house", session: 1, roll: 145, actionType: "passage" },
      // 2025-07-01, 50-50 with the Vice President breaking the tie. The XML records the
      // 100 senators only, which is why totals read 50-50 and the result reads passed.
      { chamber: "senate", session: 1, roll: 372, actionType: "passage" },
      // 2025-07-03, 218-214. The final House action on the enacted text.
      { chamber: "house", session: 1, roll: 190, actionType: "passage" },
    ],
    mustExist:
      "Live since migration 20260724120000_seed_senate_voting_record.sql created it as measure_type "
      + "'bill', congress 119, chamber 'house', number 'H.R. 1', status 'enacted'. Resolution must key "
      + "on all four columns: the record ALSO holds a 117th-Congress H.R. 1 (For the People Act, "
      + "created by 20260816000000_vr_election_facet_rollcalls.sql), so a lookup on number alone "
      + "would score reconciliation votes against a voting-rights bill. Its fourteen curated mappings "
      + "were written by 20260720000000_hr1_omnibus_component_issues.sql and re-asserted by "
      + "20260807000000_seed_exec_actions_wave1.sql; the mappings this pass re-emits from "
      + "db/vr-issue-seed.json are byte-identical to those live rows and so are no-ops. Trump's "
      + "'signed' vr_positions row and the CBO distributional impacts are owned by other migrations "
      + "and are not touched. This pass adds member votes and one new roll call (145) only.",
  },
  {
    number: "H.R. 4", measureType: "bill", congress: 119, chamber: "house",
    rolls: [
      // 2025-06-12, 214-212. Already in the record with 9 attributed members.
      { chamber: "house", session: 1, roll: 168, actionType: "passage" },
      // 2025-07-17 02:18 ET, 51-48. Already in the record, hand-curated.
      { chamber: "senate", session: 1, roll: 411, actionType: "passage" },
    ],
    mustExist:
      "Live since migration 20260719150000_seed_rescissions_voting_record.sql created it as "
      + "measure_type 'bill', congress 119, chamber 'house', number 'H.R. 4', status 'enacted', with "
      + "mappings cut_spending 100 primary / gov_waste 70 / national_debt 40. As with H.R. 1 the "
      + "record also holds a 117th-Congress H.R. 4 (John R. Lewis Voting Rights Advancement Act), so "
      + "resolution keys on congress and chamber too. That migration is guarded by a sentinel on the "
      + "existence of house roll 168, so it can never re-run and can never widen its own attribution "
      + "— topping the roll up has to happen in a new migration, which is this one. This pass adds "
      + "member votes and ONE new mapping (america_first_fp), and re-describes nothing.",
  },
  {
    number: "S. 331", measureType: "bill", congress: 119, chamber: "senate",
    rolls: [
      // 2025-03-14, 84-16. Already in the record with 8 attributed senators.
      { chamber: "senate", session: 1, roll: 127, actionType: "passage" },
      // 2025-06-12, 321-104 with 7 not voting. Absent from the record before this pass.
      { chamber: "house", session: 1, roll: 166, actionType: "passage" },
    ],
    mustExist:
      "Live since migration 20260721170000_seed_legislation_expansion.sql created it as measure_type "
      + "'bill', congress 119, chamber 'senate', number 'S. 331', status 'enacted', publicLaw 119-26, "
      + "with three mappings (immig_fentanyl 100 primary, tough_on_crime 75, health_mental 45 "
      + "yea_opposes), three provisions, three actions, senate roll 127 and Grassley's cosponsor row. "
      + "That whole block sits inside an IF m_id IS NULL guard, so it cannot re-run to add the "
      + "remaining 92 senators either. The mappings this pass re-emits are byte-identical to the live "
      + "rows. This pass adds member votes and the House roll only.",
  },
  {
    number: "H.R. 3486", measureType: "bill", congress: 119, chamber: "house",
    rolls: [
      { chamber: "house", session: 1, roll: 264, actionType: "passage" },
    ],
    create: {
      title:
        "To amend the Immigration and Nationality Act to increase penalties for individuals who "
        + "illegally enter and reenter the United States after being removed, and for other purposes.",
      shortTitle: "Stop Illegal Entry Act of 2025",
      summary:
        "A two-section sentencing bill amending the criminal provisions of the Immigration and "
        + "Nationality Act. Section 2 raises the maximum term for improper entry under INA section 275 "
        + "(8 U.S.C. 1325) from 2 years to 5 years, and adds a new subsection (e) imposing a mandatory "
        + "minimum of 5 years — with a maximum of any term of years or life — on a person who entered "
        + "unlawfully, eluded inspection or entered by willful misrepresentation and is thereafter "
        + "convicted of any crime punishable by more than 1 year of imprisonment. Section 3 rewrites "
        + "the reentry penalties of INA section 276 (8 U.S.C. 1326): a 10-year maximum in general; 15 "
        + "years for a person removed after 3 or more misdemeanours involving drugs or crimes against "
        + "the person; 10 years, not to run concurrently, for reentry after removal on terrorism "
        + "grounds; 10 years for a person removed 3 or more times; and a mandatory minimum of 10 years "
        + "for reentry after conviction of an aggravated felony, any felony, or any crime punishable "
        + "by more than 1 year. It also transfers the section's consent authority from the Attorney "
        + "General to the Secretary of Homeland Security. Sponsored by Rep. Stephanie Bice (R-OK-5) "
        + "with 5 cosponsors, reported amended by the Judiciary Committee as H. Rept. 119-200, and "
        + "passed the House 226-197 on 2025-09-11 (roll 119/1/264) under the rule provided by H. Res. "
        + "682. Received in the Senate 2025-09-15, where it has had no further action: this is a "
        + "House-passed bill, NOT law. Summary written from the engrossed text (BILLS-119hr3486eh), "
        + "not from a secondary description.",
      introducedAt: "2025-05-19", status: "passed_house",
      sourceUrl: CG(119, "house-bill", 3486),
      sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr3486-119" },
      textUrl: "https://www.govinfo.gov/content/pkg/BILLS-119hr3486eh/xml/BILLS-119hr3486eh.xml",
    },
    // Sponsorship is a position, not a vote, and it distinguishes members that a
    // 226-197 party-line roll does not. Only roster members are carried.
    positions: [
      {
        politicianId: "luna", bioguideId: "L000596", actionType: "cosponsor", supports: true,
        actedAt: "2025-05-19",
        note:
          "Original cosponsor on introduction, 2025-05-19, alongside Reps. Knott, Zinke, Schmidt and "
          + "Gill. Sponsor Rep. Stephanie Bice (R-OK-5) is not on the PolitiDex roster, so her "
          + "sponsorship is recorded here in prose and not as a row — a position cannot be attributed "
          + "to a profile that does not exist.",
        sourceUrl: CG(119, "house-bill", 3486),
      },
    ],
  },
];

// ── Issue facets considered and DECLINED, with the reason ───────────────────
// A declined facet is a finding: it records that the axis was read and rejected, so a
// later pass cannot add it as though nobody had looked.
const DECLINED_FACETS = [
  {
    measure: "H.R. 3486 (119th, Stop Illegal Entry Act)", facet: "deportations",
    why:
      "Read against the engrossed text and rejected. The bill changes what happens to someone AFTER a "
      + "criminal conviction — it lengthens sentences under INA sections 275 and 276. It does not "
      + "expand removal authority, does not create a detention mandate, does not change who is "
      + "removable, and adds no removal funding. Mapping it to deportations would score 226 members as "
      + "voting for mass removal on a bill that removes nobody, and would double-count the same "
      + "enforcement posture the tough_on_crime and border_security mappings already carry honestly.",
  },
  {
    measure: "H.R. 3486 (119th, Stop Illegal Entry Act)", facet: "gov_transparency",
    why:
      "No reporting, disclosure or oversight provision anywhere in the two sections. Nothing to map.",
  },
  {
    measure: "H.R. 4 (119th, Rescissions Act of 2025)", facet: "foreign_balance",
    why:
      "The rescinded accounts are State Department and USAID global-health, development-assistance and "
      + "international-organisation funds. That reads as 'rethink foreign aid commitments' to one "
      + "member — which is why america_first_fp IS mapped — and as abandoning allied diplomacy to "
      + "another. foreign_balance's chip is 'Keep a strong military but lead through NATO and allied "
      + "diplomacy, not solo action', and this bill touches neither the military topline nor NATO. A "
      + "key that two members would read in opposite directions from the same yea cannot be scored, "
      + "so it is declined rather than weighted low.",
  },
  {
    measure: "H.R. 4 (119th, Rescissions Act of 2025)", facet: "america_first_fp (the one key ADDED — stated with what it sits beside)",
    why:
      "Added at 65 yea_supports, and the reader should know it is not the first foreign-policy key on "
      + "this measure: 20260721140000 already carries america_first 60 yea_supports for the same "
      + "$7.9 billion of rescinded State/USAID balances. The two are separate ISSUE_MAP chips — "
      + "america_first is 'Put U.S. interests first and avoid foreign entanglements', america_first_fp "
      + "is 'Put U.S. interests first, end endless wars and rethink foreign aid commitments' — and it "
      + "is the second that names foreign aid and the second that people actually hold stances on: 22 "
      + "rostered members carry an america_first_fp position against 4 for america_first, so the key "
      + "already mapped scores almost nobody. Both directions agree (yea_supports), so they cannot "
      + "contradict each other, and the precedent runs explicitly the other way: H.R. 815, the 118th "
      + "Congress's foreign-aid supplemental, is mapped america_first_fp 70 yea_OPPOSES by migration "
      + "20260810000000. Appropriating foreign aid cuts against that chip; rescinding it supports it. "
      + "Rationale written from the enrolled text (BILLS-119hr4enr), where 19 of the 20 rescission "
      + "paragraphs are foreign assistance.",
  },
  {
    measure: "H.R. 4 (119th, Rescissions Act of 2025)", facet: "gov_services (ALREADY LIVE — not added, not removed)",
    why:
      "Stated as a disagreement, not a decline, because the key is already mapped: migration "
      + "20260721140000_seed_legislation_deepdive.sql carries gov_services 45 yea_opposes on this "
      + "measure, along with america_first 60, audit_spending 55 and free_speech 30 — so H.R. 4 holds "
      + "SEVEN live mappings, not the three the curated seed mirrors. This pass would not have added "
      + "gov_services: the domestic half of the rescission is the Corporation for Public Broadcasting's "
      + "advance appropriation, gov_services' chip is 'Protect Social Security, Medicaid and public "
      + "services — even if it means higher taxes on top earners', and public broadcasting is not the "
      + "social safety net that chip describes. But it is NOT removed either. Reversing another pass's "
      + "published judgement needs its own migration and its own argument, not a silent omission, and "
      + "leaving the key out of db/vr-issue-seed.json leaves the live row untouched because "
      + "applyCuratedIssueSeed() only upserts the keys the seed carries. Recorded here so the "
      + "disagreement is visible rather than buried.",
  },
  {
    measure: "H.R. 4 (119th, Rescissions Act of 2025)", facet: "checks_balances",
    why:
      "Genuinely arguable and still declined. A rescissions bill under the Impoundment Control Act is "
      + "Congress ratifying a presidential proposal to not spend money it appropriated, and "
      + "checks_balances' keyword list names both 'rescission' and 'impoundment'. But the direction is "
      + "not stable: a yea can be read as Congress ASSERTING its power by voting on the request rather "
      + "than letting the funds be withheld unilaterally, and equally as Congress DEFERRING to the "
      + "executive's spending priorities. Twenty roster members hold a checks_balances stance — enough "
      + "that a wrong direction would misjudge a lot of people — so the axis is left off until a "
      + "measure tests it unambiguously.",
  },
  {
    measure: "H.R. 1 (119th, P.L. 119-21)", facet: "any new mapping",
    why:
      "Deliberately none. The fourteen live mappings are the product of a dedicated omnibus-split "
      + "migration and this pass has no new reading to add; its contribution is the 180 attributed "
      + "member votes those mappings can finally score. Nor does the curated seed mirror all "
      + "fourteen: db/vr-issue-seed.json carries the FIVE first written by "
      + "20260724120000_seed_senate_voting_record.sql and not the nine first written by "
      + "20260720000000_hr1_omnibus_component_issues.sql, because applyCuratedIssueSeed() upserts "
      + "with onConflictDoUpdate and the later 20260807000000 re-asserts those nine with different "
      + "wording under ON CONFLICT DO NOTHING. Mirroring the wrong one of two candidate texts would "
      + "silently overwrite nine good rationales to gain nothing, since the rows already exist. No "
      + "weight, direction or rationale is changed anywhere on this measure.",
  },
  {
    measure: "S. 331 (119th, HALT Fentanyl Act)", facet: "healthcare",
    why:
      "Already carried, more precisely, by the live health_mental 45 yea_opposes mapping, which records "
      + "the public-health objection that permanent scheduling and mandatory minimums emphasise "
      + "enforcement over treatment. Adding healthcare on top would score the same objection twice on "
      + "a key whose chip ('Expand healthcare access and coverage for everyone') is about coverage, "
      + "not drug policy.",
  },
];

// ── Roll calls considered and declined, with the reason ─────────────────────
const DECLINED = [
  {
    number: "H. Res. 436", chamber: "house", congress: 119, session: 1, roll: 142,
    totals: "217-212",
    why:
      "On Agreeing to the Resolution — the rule providing for consideration of H.R. 1, together with "
      + "the three rolls that preceded it (139 and 140 On Consideration of the Resolution, 141 On "
      + "Ordering the Previous Question). Runbook rule 8: a member who votes for the rule and against "
      + "the bill has taken one position on the bill, not two, and a previous-question motion is a "
      + "vote about ending debate. Same class as the seven H. Res. rows heading Gap 1 of "
      + "db/vr-coverage-report.md, all of which stay declined.",
  },
  {
    number: "H.R. 1", chamber: "house", congress: 119, session: 1, roll: 144,
    totals: "212-216",
    why:
      "On Motion to Recommit, failed, cast eleven minutes before the passage roll 145 this seed "
      + "carries. yeaBlocksMeasure() in netlify/lib/vr-pack.ts treats the bare recommit form as "
      + "blocking, so admitting it would score the same members twice on the same fourteen axes, once "
      + "with the direction inverted.",
  },
  {
    number: "H. Res. 566", chamber: "house", congress: 119, session: 1, roll: 189,
    totals: "219-213",
    why:
      "On Agreeing to the Resolution, as Amended — the rule for the Senate amendment to H.R. 1, with "
      + "rolls 186 (On Consideration), 187 (Previous Question) and 188 (Foxx amendment to the rule) "
      + "declined alongside it. Procedure, on the same reasoning as H. Res. 436.",
  },
  {
    number: "H.R. 1", chamber: "senate", congress: 119, session: 1, roll: 329,
    totals: "51-49",
    why:
      "On the Motion to Proceed to H.R. 1, 2025-06-28 — the roll that opened the reconciliation "
      + "debate. Famous, and still a vote about whether to take the bill up rather than about its "
      + "content.",
  },
  {
    number: "H.R. 1", chamber: "senate", congress: 119, session: 1, roll: "330-357, 359, 371",
    totals: "various",
    why:
      "The Senate's procedural apparatus around H.R. 1, declined as a class after each was read from "
      + "the chamber's own vote menu: two 'Does the Decision of the Chair Stand' appeals (330, 331, "
      + "both sustained 53-47), roughly a dozen motions to commit to the Finance and other committees "
      + "(332, 333, 335-338, 340, 346-351, 353, 354, 357, 359), and eight Byrd-rule waiver motions "
      + "under sections 302(f), 313(b)(1)(A) and 313(b)(1)(D) (334, 339, 341-345, 352, 355, 356). "
      + "Waivers are votes about what a reconciliation bill may CONTAIN under the Congressional Budget "
      + "Act, not about whether its policy is right, and the commit motions are blocking-direction "
      + "rolls on the vr-pack side. Roll 371 is declined for a different reason: it is S.Amdt. 2360 "
      + "as amended, the substitute carrying the entire Senate text, agreed to 50-50 with the Vice "
      + "President voting yea seven minutes before passage. Its content IS the bill, so ingesting it "
      + "alongside roll 372 would weight the same senators twice on all fourteen mapped axes.",
  },
  {
    number: "H.R. 1", chamber: "senate", congress: 119, session: 1, roll: "358, 360-370",
    totals: "various",
    why:
      "Twelve substantive, single-subject amendment rolls on H.R. 1: Lee Amdt. 2745 to terminate wind "
      + "and solar credits (21-79), Sanders Amdt. 2435 on prescription-drug prices (47-53), Rosen "
      + "Amdt. 2717 on wind and solar parity (47-53), Shaheen Amdt. 2564 (49-51), Hickenlooper Amdt. "
      + "2719 (48-52), Van Hollen Amdt. 2585 (50-50), Klobuchar Amdt. 2849 (45-55), Blackburn Amdt. "
      + "2814 (99-1), Warner Amdt. 2847, Hirono Amdt. 2382, Kim Amdt. 2817 and Graham Amdt. 2848. "
      + "These are the highest-value rolls left anywhere in the 119th: each is a one-subject test of a "
      + "single axis inside the omnibus, which is exactly what the Laken Riley amendment rolls gave "
      + "the record. They are DEFERRED rather than dismissed, because each needs its own amendment "
      + "measure row, its own parent link and its own individually-argued mapping and decisiveWhy — a "
      + "pass of its own scale. Roll numbers and totals are recorded here so that pass starts from "
      + "verified facts.",
  },
  {
    number: "H.R. 4", chamber: "senate", congress: 119, session: 1, roll: "391-410",
    totals: "various",
    why:
      "The Senate's twenty rolls on H.R. 4 before passage, all declined. Procedure: 391 Motion to "
      + "Discharge (50-50), 392 Motion to Proceed (50-50), 405 Motion to Table Amdt. 2893 (51-47), "
      + "and seven Democratic motions to recommit (394-396, 398, 399, 401, 403), which vr-pack reads "
      + "in the blocking direction. Amendments: 393, 397, 400, 402, 404, 406-409 are strike-the-"
      + "rescission and reduce-the-amount amendments, every one rejected 46-52 to 49-50; each would "
      + "need its own measure row and mapping, and a rejected amendment adds a second, weaker "
      + "cut_spending signal for senators already scored on the passage roll. Roll 410 is Schmitt "
      + "Amdt. 2853, the substitute in the nature of the whole bill, agreed to 52-47 — declined on the "
      + "same double-counting ground as H.R. 1's roll 371.",
  },
  {
    number: "S. 331", chamber: "senate", congress: 119, session: 1, roll: "110, 124",
    totals: "82-12 and 84-15",
    why:
      "Cloture on the motion to proceed (110, 2025-03-06) and cloture on the bill (124, 2025-03-13). "
      + "Cloture is a vote on whether to debate, and both are within a vote or two of the 84-16 "
      + "passage roll this seed carries, so they add nothing a member has not already said.",
  },
  {
    number: "H. Res. 682", chamber: "house", congress: 119, session: 1, roll: 243,
    totals: "210-207",
    why:
      "On Agreeing to the Resolution — the rule providing for consideration of BOTH H.R. 3838 and "
      + "H.R. 3486, with roll 242 (Previous Question) declined alongside it. A rule that bundles two "
      + "unrelated bills cannot be attributed to either one's policy.",
  },
  {
    number: "H.R. 7744", chamber: "house", congress: 119, session: 2, roll: 87,
    totals: "217-210",
    why:
      "On Passage of the Department of Homeland Security Appropriations Act, 2026 (2026-03-05) — "
      + "VERIFIED against the Clerk's own XML and deliberately declined, not missed. Two disqualifying "
      + "facts, either sufficient. First, it is not law: BILLSTATUS shows it received in the Senate "
      + "2026-03-09 with no further action. Second and worse for mapping, the bill carries a second "
      + "division titled 'Further Additional Continuing Appropriations Act, 2026', so a nay is a vote "
      + "against a DHS bill, against a continuing resolution, or against both — and border_security is "
      + "the highest-yield key on the roster at 50 stance-holders, which makes a wrong reading here "
      + "expensive rather than harmless. Roll 86 (On Motion to Recommit, failed) is declined with it.",
  },
  {
    number: "H.R. 5371", chamber: "house", congress: 119, session: 1, roll: "281, 285",
    totals: "217-212 and the 2025-11-12 concurrence",
    why:
      "The Continuing Appropriations and Extensions Act, 2026 — the CR that opened the autumn 2025 "
      + "shutdown and the concurrence that ended it, plus the Senate cloture rolls between them and "
      + "roll 280 (On Motion to Recommit). Declined for want of an honest axis: a member voting nay on "
      + "a CR may be opposing the spending level, opposing a rider, or withholding a vote for leverage "
      + "on something not in the bill at all. cut_spending would read every nay as fiscally "
      + "conservative, including the nays cast in order to spend more.",
  },
  {
    number: "H.R. 7148", chamber: "house", congress: 119, session: 2, roll: "45, 53",
    totals: "341-88 and the 2026-02-03 concurrence",
    why:
      "Consolidated Appropriations Act, 2026 — the FY2026 omnibus. Real, decisive, and heavily "
      + "attended, and the strongest single candidate left after this pass. Deferred because "
      + "separating its axes honestly needs a division-by-division read of the enacted text on the "
      + "scale this project gave the Secure America Act; mapping a twelve-division omnibus from its "
      + "topline would be exactly the weak mapping the runbook forbids. The 341-88 margin also means "
      + "it separates far fewer members than its size suggests. Amendment rolls 43 (Massie) and 44 "
      + "(Norman), both failed, are declined with it.",
  },
  {
    number: "H. Res. 499", chamber: "house", congress: 119, session: 1, roll: 165,
    totals: "not fetched — rule resolution, declined on class",
    why:
      "On Agreeing to the Resolution — the rule for consideration of H.R. 4, with roll 164 (Previous "
      + "Question) declined alongside it. Procedure, on the same reasoning as H. Res. 436.",
  },
  {
    number: "H.R. 4", chamber: "house", congress: 119, session: 1, roll: 167,
    totals: "208-218",
    why:
      "On Motion to Recommit, failed, cast minutes before the passage roll 168 this seed tops up. "
      + "Declined on the same double-counting-with-inverted-direction ground as H.R. 1's roll 144.",
  },
  {
    number: "S. 146", chamber: "house", congress: 119, session: 1, roll: 104,
    totals: "409-2, 22 not voting",
    why:
      "TAKE IT DOWN Act, passed the House 2025-04-28 under suspension of the rules; the Senate had "
      + "passed it by unanimous consent, so this is its only roll. Enacted and cleanly single-subject, "
      + "and still declined: a roll that separates two members out of 411 produces confirmations, not "
      + "distinctions, and this pass is spending its effort where attribution changes verdicts.",
  },
  {
    number: "H.R. 2056 / 5103 / 5125 / 5140 / 5143 / 5214", chamber: "house", congress: 119,
    session: 1, roll: "171, 271, 274, 275, 298 and 2026/101",
    totals: "various",
    why:
      "The District of Columbia crime and policing package, verified from the Clerk's index: H.R. 2056 "
      + "District of Columbia Federal Immigration Compliance Act (roll 171), H.R. 5140 lowering the "
      + "age at which a minor may be tried as an adult (271), H.R. 5125 Judicial Nominations Reform Act "
      + "(274), H.R. 5143 Policing Protection Act (275), H.R. 5214 Cash Bail Reform Act (298) and H.R. "
      + "5103 Make the District of Columbia Safe and Beautiful Act (2026 roll 101). Six passage rolls "
      + "touching back_police (26 roster stance-holders) and tough_on_crime (8) — the thinnest "
      + "well-populated keys left. Deferred as a coherent pass of its own rather than half-ingested "
      + "here: the bills differ in whether they amend DC law, federal law or the Home Rule Act, so "
      + "states_federal_power applies to some and not others, and H.R. 2056 is an immigration measure "
      + "wearing a DC label. Roll numbers recorded so that pass starts from verified facts.",
  },
];

// ── What was scanned, so a gap is a finding and not an assumption ───────────
const SCAN_COVERAGE =
  "A targeted pass, not a sweep. Candidates were chosen from db/vr-coverage-report.md by asking which "
  + "measures already carry curated issue mappings but few attributed voters, since a mapped measure "
  + "with no voters ranks nobody. For each of the four selections the FULL floor history was then read "
  + "from the chambers' own indexes — clerk.house.gov's annual roll-call index for 2025 and 2026 (645 "
  + "rows) and senate.gov's vote_menu_119_1.xml — rather than the rolls being searched for one at a "
  + "time. H.R. 1: House rolls 119/1/139-142 (H. Res. 436, the rule), 144 (recommit) and 145 "
  + "(passage), then 186-189 (H. Res. 566, the rule for the Senate amendment) and 190 (motion to "
  + "concur); Senate rolls 119/1/329 through 372 — forty-four rolls comprising one motion to proceed, "
  + "two appeals of the chair's decision, roughly a dozen motions to commit, eight Byrd-rule waivers, "
  + "twelve substantive amendments, the substitute (371) and passage (372). H.R. 4: House rolls "
  + "119/1/164-165 (H. Res. 499), 167 (recommit) and 168 (passage); Senate rolls 119/1/391 through "
  + "411 — discharge, motion to proceed, seven motions to recommit, a motion to table, nine "
  + "amendments, the substitute (410) and passage (411). S. 331: Senate rolls 119/1/110 (cloture on "
  + "the motion to proceed), 124 (cloture) and 127 (passage), and House roll 119/1/166; the Senate "
  + "later cleared the House amendment by unanimous consent, so the absence of a fourth roll is a "
  + "fact about the record and not a gap in this seed. H.R. 3486: the BILLSTATUS action list was read "
  + "end to end — rolls 119/1/242 and 243 (H. Res. 682, the rule) and 264 (passage) are the only "
  + "recorded votes, and the substitute amendment was agreed to without objection, so there is no "
  + "amendment roll. Every roll in those four histories is in this seed, already in the record, or in "
  + "declinedRollCalls with a reason — the large classes are declined as classes, with their roll "
  + "ranges and the reasoning stated once. The wider candidate field (H.R. 7744, H.R. 5371, H.R. "
  + "7148, S. 146 and the six-bill District of Columbia package) was verified far enough to decline it "
  + "on the facts, and each decline names what would have to be done to admit it.";

// ── The enacted-law tier ────────────────────────────────────────────────────
const ENACTED_LAW_FINDING =
  "Three of the four measures are enacted law: P.L. 119-21 (H.R. 1, signed 2025-07-04), P.L. 119-28 "
  + "(H.R. 4, Rescissions Act of 2025, signed 2025-07-24) and P.L. 119-26 (S. 331, HALT Fentanyl Act, "
  + "signed 2025-07-16). The fourth, H.R. 3486, is NOT law and is filed status 'passed_house': it "
  + "passed the House 226-197 on 2025-09-11 and was received in the Senate on 2025-09-15 with no "
  + "further action. That distinction is load-bearing rather than cosmetic — a member's vote on a bill "
  + "that died in the Senate is still a real position and still scoreable, but describing it as law "
  + "would be false, and the House-passed tier is exactly where H.R. 29 sits for the same reason. "
  + "H.R. 1 carries one further identity trap: the record holds a 117th-Congress H.R. 1 (For the "
  + "People Act) and a 117th-Congress H.R. 4 (John R. Lewis Voting Rights Advancement Act), so both "
  + "lookups in the generated migration key on measure_type, congress, chamber AND number. A lookup on "
  + "number alone would attribute reconciliation and rescission votes to voting-rights bills.";

// ── Margin caveats: where a roll's own arithmetic limits what it can test ───
const MARGIN_CAVEATS = [
  {
    roll: "house 119/1/145 (H.R. 1)",
    caveat:
      "215-214 with one member voting present and two not voting — the narrowest recorded passage of "
      + "the 119th Congress. Nothing about the margin weakens the vote as evidence; it is noted because "
      + "the single 'present' is a real, third position the schema records and is not a nay, and "
      + "because every one of the 214 nays and 215 yeas is individually decisive on all fourteen mapped "
      + "axes. This is the highest-information roll in the pass.",
  },
  {
    roll: "senate 119/1/372 (H.R. 1)",
    caveat:
      "50-50, resolved by the Vice President's tie-breaking vote. The Senate XML records the 100 "
      + "senators only, so totals read 50-50 while vote_result reads 'Bill Passed' — a discrepancy that "
      + "is correct rather than an error. The tie-breaker is not a member vote and is not attributed to "
      + "anyone: the Vice President is not a senator and holds no roster row on this roll.",
  },
  {
    roll: "house 119/1/166 (S. 331)",
    caveat:
      "321-104 with 7 not voting. Broad, but not near-unanimous, and the 104 nays are the signal: they "
      + "are the members who read permanent class-wide scheduling with mandatory minimums as the "
      + "enforcement-over-treatment choice the live health_mental yea_opposes mapping describes. This "
      + "roll separates the Democratic caucus, which is precisely what makes it worth attributing.",
  },
  {
    roll: "house 119/1/264 (H.R. 3486)",
    caveat:
      "226-197, close to party lines. A party-line roll separates the two parties well and separates "
      + "members WITHIN a party poorly, so the crossovers carry most of the distinguishing information "
      + "— which is what the isParty flag on each member vote records. The bill also died in the "
      + "Senate, so this roll is the whole of its recorded history.",
  },
];

// ── XML helpers ─────────────────────────────────────────────────────────────
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};
const attr = (frag, name) => {
  const m = frag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting" };
const MON_SHORT = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const MON_LONG = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

function etOffset(y, mo, d) {
  const nth = (month, dow, n) => {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(Date.UTC(y, month - 1, day));
      if (dt.getUTCMonth() !== month - 1) break;
      if (dt.getUTCDay() === dow && ++count === n) return day;
    }
    return null;
  };
  const dstStart = { mo: 3, d: nth(3, 0, 2) };
  const dstEnd = { mo: 11, d: nth(11, 0, 1) };
  const onOrAfter = (a, b) => a.mo > b.mo || (a.mo === b.mo && a.d >= b.d);
  const before = (a, b) => a.mo < b.mo || (a.mo === b.mo && a.d < b.d);
  return onOrAfter({ mo, d }, dstStart) && before({ mo, d }, dstEnd) ? "-04:00" : "-05:00";
}

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

// The standing decisive set from scripts/test-vr-vote-seed.mjs, unmodified. Every form
// this pass needs is already in it: "On Passage" (House rolls 145, 166, 168, 264),
// "On Passage of the Bill" (Senate rolls 127, 372, 411) and "On Motion to Concur in the
// Senate Amendment" (House roll 190). No exception is claimed anywhere in this seed, so
// no vote carries a decisiveWhy.
const DECISIVE = /^(on passage|on the joint resolution|on the amendment|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;

function crossoverFlagger(all) {
  const byParty = {};
  for (const m of all) {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) continue;
    byParty[m.party] = byParty[m.party] || { yea: 0, nay: 0 };
    byParty[m.party][m.position]++;
  }
  const majority = {};
  for (const p of Object.keys(byParty)) majority[p] = byParty[p].yea >= byParty[p].nay ? "yea" : "nay";
  return (m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) return null;
    return m.position === majority[m.party] ? "with_party" : "against_party";
  };
}
function partyTotals(all) {
  const out = {};
  for (const m of all) {
    if (m.position !== "yea" && m.position !== "nay") continue;
    const p = m.party || "?";
    out[p] = out[p] || { yea: 0, nay: 0 };
    out[p][m.position]++;
  }
  return out;
}

const notes = [];
const votes = [];

const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);
// "H.R. 3486" → "H R 3486"; "S. 331" → "S 331". The Clerk replaces periods with spaces.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel, measure, session, roll, actionType) {
  const year = houseYear(sel.congress, session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${roll} (${sel.number})`;

  // Verification keys on legis-num, NEVER on vote-desc. The landmark pass learned this
  // on S. 1071, whose description still prints the title the House struck; here it also
  // matters that "H R 1" and "H R 4" are one and two characters long, so a substring
  // check against a description would match H.R. 10, H.R. 145 and so on.
  const legis = clean(tag(xml, "legis-num"));
  if (legis.toUpperCase() !== houseCitation(sel.number)) {
    notes.push(`DROPPED ${at}: legis-num "${legis}" is not ${sel.number}`);
    return null;
  }
  const question = clean(tag(xml, "vote-question"));
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted decisive form`);
    return null;
  }

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;

  const tv = tag(xml, "totals-by-vote") || "";
  const totals = {
    yea: +(tag(tv, "yea-total") || tag(tv, "aye-total") || 0),
    nay: +(tag(tv, "nay-total") || tag(tv, "no-total") || 0),
    present: +(tag(tv, "present-total") || 0),
    notVoting: +(tag(tv, "not-voting-total") || 0),
  };

  const all = [];
  for (const m of xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)) {
    const legFrag = (m[1].match(/<legislator[^>]*>/) || [""])[0];
    all.push({
      bioguideId: attr(legFrag, "name-id"),
      party: attr(legFrag, "party"),
      state: attr(legFrag, "state"),
      position: POS[clean(tag(m[1], "vote"))] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED ${at} ${m.bioguideId}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const raw = clean(tag(xml, "vote-result"));
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to"
    : /rejected|defeated/i.test(raw) ? "rejected" : "failed";
  return {
    chamber: "house", congress: sel.congress, session, rollNumber: roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure, chamberVoting: all.length, rosterSkipped: unmapped,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Senate ──────────────────────────────────────────────────────────────────
// No bioguide id in the Senate XML, so a senator resolves on (surname, state) and only a
// UNIQUE hit is accepted. The surname cannot be "the last word of the roster name": the
// Senate writes <last_name>Van Hollen</last_name>, so a last-word split yields "Hollen"
// and Chris Van Hollen silently receives nothing. The comparison anchors on the tail of
// the roster's full name instead, so a multi-word surname matches whole.
const senateRoster = ROSTER
  .filter((r) => r.chamber === "senate" && r.name && r.state)
  .map((r) => ({ bioguide: r.bioguide, state: r.state, name: r.name }));
const surnameMatches = (rosterName, xmlLast) => {
  const a = String(rosterName).toLowerCase().replace(/\s+(jr|sr|ii|iii|iv)\.?$/, "");
  const b = String(xmlLast).toLowerCase();
  return a === b || a.endsWith(" " + b);
};
// Roster entries who sat in the Senate during the window but whose row carries no
// chamber/state because they have since left Congress. Keyed by bioguide so a roster row
// later gaining a state again cannot make the same person match twice and be dropped as
// ambiguous. Rubio is carried by scripts/vr-build-landmark-vote-seed.mjs for the January
// 2025 rolls and is kept here for symmetry, though he had already been confirmed
// Secretary of State before the earliest Senate roll in this pass (127, 2025-03-14) and
// so appears on none of them.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", name: "Marco Rubio" }];
const senateLookup = [];
for (const r of [...senateRoster, ...SENATE_ALUMNI]) {
  if (!senateLookup.some((x) => x.bioguide === r.bioguide)) senateLookup.push(r);
}

async function fetchSenate(number, measure, congress, session, roll, opts) {
  const o = opts || {};
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(roll).padStart(5, "0")}`;
  const xml = await get(`${base}.xml`);
  const at = `senate ${congress}/${session}/${roll} (${number})`;

  const bad = o.verify ? o.verify(xml) : null;
  if (bad) {
    notes.push(`DROPPED ${at}: ${bad}`);
    return null;
  }
  const question = clean(tag(xml, "vote_question_text") || tag(xml, "question"));
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted decisive form`);
    return null;
  }
  const dm = clean(tag(xml, "vote_date")).match(/^(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s*(AM|PM)$/);
  if (!dm) {
    notes.push(`DROPPED ${at}: unparsed vote_date "${clean(tag(xml, "vote_date"))}"`);
    return null;
  }
  const mo = MON_LONG[dm[1]];
  const hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(+dm[2]).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, +dm[2])}`;

  const all = [];
  let ambiguous = 0;
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const f = m[1];
    const last = clean(tag(f, "last_name"));
    const state = clean(tag(f, "state"));
    const hits = senateLookup.filter((r) => surnameMatches(r.name, last) && r.state === state);
    const people = [...new Set(hits.map((r) => r.bioguide))];
    if (people.length > 1) {
      ambiguous++;
      notes.push(`AMBIGUOUS ${at}: ${last} (${state}) matches ${people.length} roster members — skipped`);
    }
    all.push({
      bioguideId: people.length === 1 ? people[0] : null,
      party: clean(tag(f, "party")), state,
      position: POS[clean(tag(f, "vote_cast"))] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED ${at}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const cnt = tag(xml, "count") || "";
  const rr = clean(tag(xml, "vote_result"));
  const req = clean(tag(xml, "majority_requirement"));
  return {
    chamber: "senate", congress, session, rollNumber: roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote_title")),
    actionType: o.actionType || "passage",
    result: /passed/i.test(rr) ? "passed" : /agreed/i.test(rr) ? "agreed_to"
      : /defeated|rejected/i.test(rr) ? "rejected" : "failed",
    requiredMajority: req === "3/5" ? "three_fifths" : req === "2/3" ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    totals: {
      yea: +(tag(cnt, "yeas") || 0), nay: +(tag(cnt, "nays") || 0),
      present: +(tag(cnt, "present") || 0), notVoting: +(tag(cnt, "absent") || 0),
    },
    partyTotals: partyTotals(all),
    sourceUrl: `${base}.htm`, xmlUrl: `${base}.xml`, sourceLabel: "U.S. Senate",
    measure, chamberVoting: all.length, rosterSkipped: unmapped, rosterAmbiguous: ambiguous,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// The Senate's document check. Every Senate roll in this pass is a bill-passage roll, so
// <document_type> and <document_number> are both filled and the citation can be
// reassembled and compared whole — "H.R." + "1" must equal "H.R. 1", which is what rules
// out roll 372 having been, say, a vote on H.R. 10.
const senateDocCheck = (cite) => (xml) => {
  const doc = tag(xml, "document") || "";
  const dt = clean(tag(doc, "document_type"));
  const dn = clean(tag(doc, "document_number"));
  const cited = `${dt.endsWith(".") ? dt : dt + "."} ${dn}`.replace(/\s+/g, " ").trim();
  return cited === cite ? null : `document "${cited}" is not ${cite}`;
};

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
    ...(sel.positions ? { positions: sel.positions } : {}),
  };
  let got = 0;
  for (const r of sel.rolls) {
    const v = r.chamber === "house"
      ? await fetchHouse(sel, measure, r.session, r.roll, r.actionType)
      : await fetchSenate(sel.number, measure, sel.congress, r.session, r.roll, {
        actionType: r.actionType, verify: senateDocCheck(sel.number),
      });
    if (v) { votes.push(v); got++; }
  }
  if (got !== sel.rolls.length) {
    notes.push(`!! ${sel.number} contributed ${got} of ${sel.rolls.length} rolls — a selection did not verify`);
  }
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the 119th Congress's decisive money-and-enforcement votes: the 2025 reconciliation "
    + "act (H.R. 1, P.L. 119-21), the Rescissions Act of 2025 (H.R. 4, P.L. 119-28), the HALT Fentanyl "
    + "Act (S. 331, P.L. 119-26) and the House-passed Stop Illegal Entry Act of 2025 (H.R. 3486, not "
    + "law). Built by scripts/vr-build-fiscal-enforcement-vote-seed.mjs from clerk.house.gov/evs and "
    + "senate.gov roll_call_votes XML. The pass exists because these measures were already mapped and "
    + "barely attributed: H.R. 1 carries fourteen curated issue keys and 39 hand-listed voters on its "
    + "decisive roll, H.R. 4 nine, S. 331 eight of 100 senators — so a mapped measure was ranking "
    + "almost nobody. Each selection is re-verified against the chamber's own citation fields before "
    + "inclusion: legis-num plus question for the House, document_type/document_number plus question "
    + "for the Senate. House verification deliberately ignores vote-desc. Three of the four measures "
    + "already exist in the record and are marked mustExist, so this pass adds member votes, three new "
    + "roll calls and exactly one new mapping without re-describing rows other migrations own. All "
    + "measure lookups key on measure_type, congress, chamber AND number, because the record also "
    + "holds a 117th-Congress H.R. 1 and H.R. 4 on unrelated subjects. memberVotes is already "
    + "filtered to db/vr-member-map.json; unmapped members are counted in rosterSkipped, ambiguous "
    + "Senate surname matches in rosterAmbiguous, and neither is ever guessed. isParty is computed "
    + "from the full chamber tally, and totals is the full chamber tally, not the roster subset.",
  builtBy: "scripts/vr-build-fiscal-enforcement-vote-seed.mjs",
  issueKeys: [
    "lower_taxes", "cut_spending", "national_debt", "tax_middle_class", "healthcare",
    "border_security", "climate_action", "deportations", "family_support", "energy_production",
    "strong_defense", "lands_energy", "edu_college_cost", "school_choice",
    "gov_waste", "america_first_fp", "immig_fentanyl", "tough_on_crime", "health_mental",
  ],
  congresses: [119],
  parents: [],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  marginCaveats: MARGIN_CAVEATS,
  declinedFacets: DECLINED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-fiscal-enforcement-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected = SELECTIONS.reduce((n, s) => n + s.rolls.length, 0);
for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure     margin     req        attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(11)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 44)}`
  );
}
if (votes.length !== expected) {
  console.error(`\n! ${expected - votes.length} of ${expected} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
