#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-build-gun-vote-seed.mjs — roll calls for the two firearms facets
// ---------------------------------------------------------------------------
// `gun_rights` and `gun_safety` have existed in ISSUE_MAP since the Alignment tool
// shipped, and they already ARE the two facets a firearms vertical needs (see the
// key-decision block above them in alignment-tool.js). What they did not have was a
// floor record: before this pass the whole of firearms policy rested on three curated
// mappings and four roll calls, none of them in the 117th or 118th Congress. A facet
// with no votes behind it ranks nobody, so this script fetches the record.
//
//   node scripts/vr-build-gun-vote-seed.mjs        # writes db/vr-gun-vote-seed.json
//
// THE TWO FACETS, AND WHAT COUNTS AS EACH
// ---------------------------------------
//   gun_rights  — the scope of the individual right to acquire, keep and carry:
//     carry and self-defence rights, Second Amendment protections against registry,
//     purchase-tracking and licensing burdens, and opposition to broad category bans
//     on commonly-owned firearms or magazines.
//     yea_supports = the vote widens, or refuses to narrow, that right.
//   gun_safety  — screening, removal and storage rules aimed at misuse: background
//     checks, red-flag / extreme-risk orders, assault-style and high-capacity
//     restrictions, safe storage, and trafficking / straw-purchase enforcement.
//     yea_supports = the vote tightens those rules.
//
// The two are read independently and are NOT mirror images. Suppressor deregulation and
// ATF-rule repeal touch gun_rights alone; trafficking-enforcement funding and
// safe-storage grants touch gun_safety alone. Where a measure genuinely does both in
// opposite directions it is mapped to both facets with opposite supportMeaning rather
// than forced into one verdict — which is what db/vr-issue-seed.json already does for
// S. 2938, the Bipartisan Safer Communities Act: gun_safety yea_supports for the
// expanded checks, gun_rights yea_opposes for the same text's purchaser records, with
// its statutory no-registry guarantee acknowledged in the rationale.
//
// WHERE A FACET IS DECLINED ON A MEASURE THAT LOOKS LIKE IT TOUCHES IT
// -------------------------------------------------------------------
// Two of the seven new House measures are mapped to ONE facet even though the floor
// debate ranged over both, and the reason is recorded in `declinedFacets` rather than
// left to read as an oversight. A background-check TIMING rule (H.R. 1446) and an
// individualized court order against a person a judge has found dangerous (H.R. 2377)
// do not change who may own what: no new prohibited category, no registry, no carry
// restriction. The objections raised against them on the floor — "de facto waiting
// period", "ex parte due process" — are contested characterisations and procedural
// questions, not operative changes to the scope of the right. Mapping them to
// gun_rights would score members on a question the text does not ask.
//
// PROVISION-LEVEL, NOT HEADLINE-LEVEL
// -----------------------------------
// Weights below 100 on the secondary facet are provision arithmetic, not hedging.
// H.R. 7910 is gun_rights yea_opposes at 80 and not 100 because two of its six
// operative titles — trafficking enforcement and safe storage — take nothing away from
// an eligible adult, while three (under-21 sales, bump stocks, magazines) plainly do.
//
// EVERY ROLL VERIFIED AGAINST THE CHAMBER'S OWN RECORD
// ---------------------------------------------------
// Candidates were read off the Clerk's yearly grouped roll-call indexes for 2021-2026
// (2,916 index rows) and the Senate's vote_menu_{congress}_{session}.xml for all six
// sessions, then each selection is RE-FETCHED and dropped, loudly, unless the fetched
// document's own citation matches the measure claimed and its question is an admitted
// decisive form. The House citation check is case-insensitive on purpose: the Clerk
// writes <legis-num>H J RES 44</legis-num> in caps, and a case-sensitive compare would
// have dropped the one measure in this seed that both chambers voted.
//
// ATTRIBUTION IS FAIL-CLOSED
// -------------------------
// House XML carries a bioguide id per legislator, so attribution is a direct
// db/vr-member-map.json lookup; an unmapped member is skipped and counted, never
// guessed. Senate XML carries no bioguide id, so a senator resolves on (surname, state)
// against the roster and only a UNIQUE hit is accepted — an ambiguous match is counted
// in rosterAmbiguous and skipped. `isParty` is computed from the FULL chamber list
// before the roster filter, so a roster subset can never invent a party crossover, and
// `totals` is always the full chamber tally.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};
const ROSTER = memberMap.members || [];

const CG = (c, kind, n) => `https://www.congress.gov/bill/${c}th-congress/${kind}/${n}`;
const BS = (c, t, n) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${t}/BILLSTATUS-${c}${t}${n}.xml`;

// ── The nine roll calls ─────────────────────────────────────────────────────
// Priority order per the mission: enacted laws first, then contested passage votes,
// then major directional amendments.
//
// The enacted tier is NOT empty here, unlike the elections pass. S. 2938 became P.L.
// 117-159 and its two rolls are already ingested by db/vr-phase-a-vote-seed.json. The
// window's second enacted firearms provision is Section 413 of Division A of P.L.
// 118-42 (138 Stat. 65), whose only clean standalone recorded vote is the Senate
// amendment at the end of this list — see enactedLawFinding.
//
// `house` / `senate` are [session, roll] or null where that chamber never voted the
// vehicle. H.J.Res. 44 is one measure with a roll in each chamber.
const SELECTIONS = [
  {
    number: "H.R. 8", measureType: "bill", congress: 117, chamber: "house",
    house: [1, 75], senate: null,
    create: {
      title: "Bipartisan Background Checks Act of 2021",
      shortTitle: "Bipartisan Background Checks Act",
      summary:
        "Section 3 adds a new subsection (aa) to 18 U.S.C. 922 making it unlawful for any person who "
        + "is not a licensed dealer to transfer a firearm to another unlicensed person unless a "
        + "licensed importer, manufacturer or dealer first takes possession of the firearm, runs the "
        + "922(t) background check as if transferring from its own inventory, and records the transfer. "
        + "Exceptions cover gifts between close family members, transfers by operation of law, "
        + "temporary transfers to prevent imminent death or great bodily harm, and temporary transfers "
        + "while hunting or at a shooting range. Passed the House 227-203 on 2021-03-11 with eight "
        + "Republicans voting yea and one Democrat voting nay; the Senate never voted on it.",
      introducedAt: "2021-03-01", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 8), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr8-117", billStatus: BS(117, "hr", 8) },
    },
  },
  {
    number: "H.R. 1446", measureType: "bill", congress: 117, chamber: "house",
    house: [1, 77], senate: null,
    create: {
      title: "Enhanced Background Checks Act of 2021",
      shortTitle: "Enhanced Background Checks Act",
      summary:
        "Replaces the three-business-day default-proceed period in 18 U.S.C. "
        + "922(t)(1)(B)(ii) — under which a dealer may complete a sale when the NICS check has "
        + "returned no answer — with a minimum of ten business days, after which the prospective "
        + "purchaser may petition for an expedited review that gives the system a further ten days "
        + "before the transfer may proceed. Changes no eligibility category and creates no record or "
        + "registry: it is a timing rule on an incomplete check. Passed the House 219-210 on "
        + "2021-03-11 with two Republicans voting yea and two Democrats voting nay; the Senate never "
        + "voted on it.",
      introducedAt: "2021-03-01", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 1446), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr1446-117", billStatus: BS(117, "hr", 1446) },
    },
  },
  {
    number: "H.R. 7910", measureType: "bill", congress: 117, chamber: "house",
    house: [2, 245], senate: null,
    create: {
      title: "Protecting Our Kids Act",
      shortTitle: "Protecting Our Kids Act",
      summary:
        "A six-title firearms package assembled after the Uvalde and Buffalo shootings. Title I "
        + "(Raise the Age) bars a licensed dealer from selling a semiautomatic centerfire rifle or "
        + "shotgun capable of accepting a detachable magazine to anyone under 21, with exceptions for "
        + "law enforcement and the armed forces. Title II (Prevent Gun Trafficking) creates federal "
        + "straw-purchase and trafficking offences with penalties and forfeiture. Title III "
        + "(Untraceable Firearms) defines a \"ghost gun\" and brings assembling, molding, machining or "
        + "3D-printing a frame or receiver within \"manufacturing firearms\", with carve-outs for "
        + "permanently inoperable firearms, those serialized under state law within thirty months, and "
        + "pre-1968 firearms; it also tightens the undetectable-firearms ban. Title IV (Safe Storage) "
        + "adds Ethan's Law, a new 18 U.S.C. 922(z)(4) offence for storing a firearm in a residence "
        + "where the person knows or reasonably should know a minor is likely to gain access without "
        + "permission or a resident is ineligible to possess it, with an express exception where the "
        + "firearm is carried on or within immediate control of the person. Title V adds a bump stock "
        + "to the National Firearms Act's definition of a machinegun part at 26 U.S.C. 5845(a)(9). "
        + "Title VI (Keep Americans Safe) adds a new 18 U.S.C. 922(v) banning the import, sale, "
        + "manufacture, transfer and possession of large-capacity ammunition feeding devices, "
        + "grandfathering devices lawfully possessed on or before enactment, and funds buy-back grants. "
        + "Passed the House 223-204 on 2022-06-08 with five Republicans voting yea and two Democrats "
        + "voting nay; the Senate never voted on it, and the narrower S. 2938 became law instead.",
      introducedAt: "2022-05-31", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 7910), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr7910-117", billStatus: BS(117, "hr", 7910) },
    },
  },
  {
    number: "H.R. 2377", measureType: "bill", congress: 117, chamber: "house",
    house: [2, 255], senate: null,
    create: {
      title: "Federal Extreme Risk Protection Order Act of 2021",
      shortTitle: "Federal Extreme Risk Protection Order Act",
      summary:
        "Creates a new 18 U.S.C. 932 authorising a United States district court to issue a federal "
        + "extreme-risk protection order barring a person from possessing, receiving, shipping or "
        + "transporting a firearm or ammunition, on petition by a family or household member or by a "
        + "law-enforcement officer, where the court finds the person poses a significant danger of "
        + "causing personal injury to self or others. Provides an ex parte track with a prompt "
        + "follow-on hearing, requires surrender to a designated law-enforcement officer, and sets "
        + "penalties for a knowingly false petition. Changes no eligibility category applicable to any "
        + "class of person and creates no registry: the order runs against one named individual after a "
        + "judicial finding of dangerousness. Passed the House 224-202 on 2022-06-09 with two "
        + "Republicans voting yea and two Democrats voting nay; the Senate never voted on it.",
      introducedAt: "2021-04-06", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 2377), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr2377-117", billStatus: BS(117, "hr", 2377) },
    },
  },
  {
    number: "H.R. 1808", measureType: "bill", congress: 117, chamber: "house",
    house: [2, 410], senate: null,
    create: {
      title: "Assault Weapons Ban of 2022",
      shortTitle: "Assault Weapons Ban of 2022",
      summary:
        "Bans the import, sale, manufacture, transfer and possession of a \"semiautomatic assault "
        + "weapon\", defined by a one-feature test: a semiautomatic rifle able to accept a detachable "
        + "magazine plus any one of a pistol grip, a forward grip, a folding, telescoping or "
        + "detachable stock, a barrel shroud or a threaded barrel, with parallel definitions for "
        + "pistols and shotguns and an enumerated list of named models. Grandfathers firearms lawfully "
        + "possessed on the date of enactment, requires secure storage of a grandfathered firearm when "
        + "transferred, and exempts law enforcement and the armed forces. Passed the House 217-213 on "
        + "2022-07-29 with two Republicans voting yea and five Democrats voting nay; the Senate never "
        + "voted on it. The first House passage of an assault-weapons ban since 1994.",
      introducedAt: "2021-03-11", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 1808), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr1808-117", billStatus: BS(117, "hr", 1808) },
    },
  },
  {
    // The one measure in this seed that BOTH chambers voted, and the reason the House
    // citation check is case-insensitive: the Clerk writes "H J RES 44".
    number: "H.J.Res. 44", measureType: "resolution", congress: 118, chamber: "house",
    house: [1, 252], senate: [1, 171],
    create: {
      title: "Providing for congressional disapproval of the ATF rule relating to \"Factoring Criteria for Firearms with Attached 'Stabilizing Braces'\"",
      shortTitle: "Stabilizing Braces CRA Resolution",
      summary:
        "A Congressional Review Act joint resolution of disapproval voiding ATF final rule 2021R-08F, "
        + "which reclassified a large share of pistols fitted with a stabilizing brace as "
        + "short-barreled rifles subject to National Firearms Act registration and taxation, requiring "
        + "owners to register, permanently alter or surrender them. Disapproval restores the "
        + "pre-rule treatment and, under 5 U.S.C. 801(b)(2), bars a substantially similar rule without "
        + "new statutory authority. Passed the House 219-210 on 2023-06-13 with two Democrats voting "
        + "yea and one Republican voting nay; DEFEATED in the Senate 49-50 on 2023-06-22, with two "
        + "Democrats voting yea. Not law.",
      // 'failed', not 'passed_house': the vocabulary in db/schema.ts is introduced |
      // passed_house | passed_senate | enacted | failed | vetoed | pending, and the
      // resolution is dead — the Senate defeated it 49-50, so the House passage is the
      // roll call's story rather than the measure's final state.
      introducedAt: "2023-02-09", status: "failed",
      sourceUrl: CG(118, "house-joint-resolution", 44), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hjres44-118", billStatus: BS(118, "hjres", 44) },
    },
  },
  {
    number: "H.R. 1041", measureType: "bill", congress: 119, chamber: "house",
    house: [2, 190], senate: null,
    create: {
      title: "Veterans 2nd Amendment Protection Act",
      shortTitle: "Veterans 2nd Amendment Protection Act",
      summary:
        "Adds a new 38 U.S.C. 5501B barring the Department of Veterans Affairs from transmitting a "
        + "beneficiary's personally identifiable information to the Department of Justice for inclusion "
        + "in the National Instant Criminal Background Check System on the basis of a determination "
        + "under 38 U.S.C. 5502 that the beneficiary is unable to manage their own benefit payments and "
        + "requires a fiduciary, unless a judge, magistrate or other judicial authority has found that "
        + "the beneficiary is a danger to themselves or others. Passed the House 216-201 on 2026-05-21; "
        + "the Senate has not taken it up. Codifies as permanent law the same policy that Section 413 "
        + "of Division A of P.L. 118-42 imposed for one fiscal year as an appropriations restriction.",
      introducedAt: "2025-02-05", status: "passed_house",
      sourceUrl: CG(119, "house-bill", 1041), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr1041-119", billStatus: BS(119, "hr", 1041) },
    },
  },
];

// ── The one amendment roll, and its parent ──────────────────────────────────
// The mission's third priority is major directional amendments, and exactly one in this
// window qualifies: the only clean standalone recorded vote on a firearms provision that
// BECAME LAW in the 117th-119th Congress apart from S. 2938. Its parent vehicle, H.R.
// 4366, is created because the amendment has to hang off something — but the parent gets
// NO issue mapping, because a vote on a 2024 appropriations omnibus is not a firearms
// position. See declinedRollCalls.
const AMENDMENTS = [
  {
    number: "S.Amdt. 1354", congress: 118, session: 1, roll: 268, chamber: "senate",
    amendmentTo: "S.Amdt. 1092", vehicle: "H.R. 4366",
    actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its question is single-purpose — one "
      + "sentence prohibiting the use of Veterans Affairs funds to report a 38 U.S.C. 5502 fiduciary "
      + "determination to the Department of Justice for NICS — so a yea carries one meaning and only "
      + "one, unlike the omnibus it rode. It is also the ONLY recorded vote in the window on a "
      + "firearms provision that became law other than S. 2938: the language was enacted as Section "
      + "413 of Division A of the Consolidated Appropriations Act, 2024 (P.L. 118-42, 138 Stat. 65). "
      + "Declining it would mean reporting an enacted-law tier of one when the record holds two.",
    create: {
      title: "Kennedy amendment prohibiting VA reporting of fiduciary determinations to NICS",
      shortTitle: "Kennedy VA/NICS Amendment (S.Amdt. 1354)",
      summary:
        "Second-degree amendment to the Military Construction, Veterans Affairs, and Related Agencies "
        + "appropriations division of H.R. 4366, offered by Senator John Kennedy: \"To prohibit the "
        + "availability of funds for the Secretary of Veterans Affairs to report certain information to "
        + "the Department of Justice for use by the National Instant Criminal Background Check "
        + "System.\" Agreed to 53-45 on 2023-10-25 with eleven Democrats voting yea. Enacted as "
        + "Section 413 of Division A of the Consolidated Appropriations Act, 2024 (P.L. 118-42, 138 "
        + "Stat. 65), which bars the use of Division A funds to report to the Attorney General, for "
        + "NICS purposes, that a person deemed mentally incapacitated, mentally incompetent or "
        + "experiencing an extended loss of consciousness has been adjudicated a mental defective "
        + "under 18 U.S.C. 922(d)(4) and (g)(4), unless a judicial authority has found that the person "
        + "is a danger to themselves or others.",
      introducedAt: "2023-10-25", status: "enacted",
      sourceUrl: "https://www.govinfo.gov/content/pkg/PLAW-118publ42/html/PLAW-118publ42.htm",
      sourceLabel: "GovInfo — P.L. 118-42",
      externalIds: { senateVote: "118-1-268", publicLaw: "118-42" },
    },
    parentCreate: {
      number: "H.R. 4366", measureType: "bill", congress: 118, chamber: "house",
      title: "Consolidated Appropriations Act, 2024",
      shortTitle: "Consolidated Appropriations Act, 2024",
      summary:
        "The first of the two fiscal-year-2024 appropriations packages, enacted 2024-03-09 as P.L. "
        + "118-42. Division A is the Military Construction, Veterans Affairs, and Related Agencies "
        + "Appropriations Act, 2024, whose Section 413 (138 Stat. 65) carries the enacted text of "
        + "S.Amdt. 1354. Created here only as the parent vehicle for that amendment; it carries NO "
        + "firearms issue mapping, because a vote on a multi-division appropriations act is not a "
        + "firearms position.",
      introducedAt: "2023-06-29", status: "enacted",
      sourceUrl: "https://www.govinfo.gov/content/pkg/PLAW-118publ42/html/PLAW-118publ42.htm",
      sourceLabel: "GovInfo — P.L. 118-42",
      externalIds: { congressGovId: "hr4366-118", publicLaw: "118-42", billStatus: BS(118, "hr", 4366) },
    },
  },
];

// ── Facets deliberately NOT mapped on a measure that looks like it touches them ──
// Recorded so a one-facet mapping on a firearms bill never reads as an oversight.
const DECLINED_FACETS = [
  {
    measure: "H.R. 1446 (117th)", facet: "gun_rights",
    why:
      "A timing rule and nothing else. It lengthens the default-proceed window on a check that has "
      + "not come back, and creates no prohibited category, no record of an approved purchaser, no "
      + "registry and no restriction on carrying. The floor objection — that a ten-business-day "
      + "window is a de facto waiting period — is a contested characterisation of an administrative "
      + "delay, not an operative change to the scope of the right, and scoring it as one would put "
      + "210 members on record against a provision the bill does not contain.",
  },
  {
    measure: "H.R. 2377 (117th)", facet: "gun_rights",
    why:
      "An individualized court order, not a rule about who may own what. It runs against one named "
      + "person after a judge finds them a significant danger, and every class of eligible person is "
      + "eligible before and after. The objection raised against it on the floor was the ex parte "
      + "track's due-process protections — a procedural question about how the order issues, which is "
      + "real but is not the scope of the right. Mapping it to gun_rights would score members on a "
      + "question the text does not ask.",
  },
  {
    measure: "H.R. 1181 (119th)", facet: "gun_safety",
    why:
      "Already mapped to gun_rights only, and reviewed in this pass rather than re-mapped. It bars "
      + "payment networks from assigning a firearms-specific merchant category code — it restricts a "
      + "PRIVATE-SECTOR purchase-tracking mechanism, and changes no government screening, storage or "
      + "trafficking rule. gun_safety covers screening and misuse rules; a card-network coding "
      + "practice is neither.",
  },
  {
    measure: "H.Amdt. 253 (119th)", facet: "gun_safety",
    why:
      "Already mapped to gun_rights only, and reviewed in this pass rather than re-mapped. It permits "
      + "carrying a personally-owned firearm on a military installation and changes no background "
      + "check, storage requirement, removal process or trafficking rule. A carry-location change "
      + "sits on one facet.",
  },
  {
    measure: "S. 2938 (117th)", facet: null,
    why:
      "Both facets are ALREADY mapped, in opposite directions, and were reviewed rather than "
      + "changed: gun_safety yea_supports at weight 100 for expanded background checks, the boyfriend "
      + "loophole and the juvenile-record requirement, and gun_rights yea_opposes at weight 60 for "
      + "the same text's purchaser-record provisions. Weight 60 and not 100 on the rights facet is "
      + "the honest slice: the Act also writes an explicit prohibition on a federal firearms registry "
      + "into law, so a yea is not straightforwardly a vote to narrow the right. This is the existing "
      + "precedent the rest of this pass follows.",
  },
];

// ── Roll calls considered and declined, with the reason ──────────────────────
// A ledger, not a formality. Every tally below was read from the chamber's own document.
const DECLINED = [
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 237, totals: "228-199", why: "on retaining Title I (Raise the Age) — the best provision-level evidence in the whole window, and still declined: netlify/lib/vr-ingest.ts attaches a curated mapping to a MEASURE, matching on (congress, chamber, number) across every roll of that measure, so a title roll cannot carry its own facet direction. Ingesting all six would give each the bill's composite direction, misscoring the trafficking and safe-storage titles, and would weight one bill day six times over. Roll 245 is the passage vote" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 238, totals: "226-197", why: "on retaining Title II (Prevent Gun Trafficking) — same reason as roll 237" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 239, totals: "226-194", why: "on retaining Title III (Untraceable Firearms) — same reason as roll 237" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 240, totals: "220-205", why: "on retaining Title IV (Safe Storage) — same reason as roll 237" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 241, totals: "233-194", why: "on retaining Title V (bump stocks) — same reason as roll 237" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 242, totals: "220-207", why: "on retaining Title VI (Keep Americans Safe, large-capacity magazines) — same reason as roll 237" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 243, totals: "380-47", why: "on retaining Title VII — a NICS reporting study, and near-automatic besides. No distinguishing signal on either facet" },
  { number: "H.R. 8", chamber: "house", congress: 117, session: 1, roll: 74, totals: "191-233", why: "motion to recommit; roll 75 is the passage vote" },
  { number: "H.R. 1446", chamber: "house", congress: 117, session: 1, roll: 76, totals: "196-224", why: "motion to recommit; roll 77 is the passage vote" },
  { number: "H.R. 7910", chamber: "house", congress: 117, session: 2, roll: 244, totals: "202-224", why: "motion to recommit; roll 245 is the passage vote" },
  { number: "H.R. 1808", chamber: "house", congress: 117, session: 2, roll: 409, totals: "207-217", why: "motion to recommit; roll 410 is the passage vote" },
  { number: "H.R. 1041", chamber: "house", congress: 119, session: 2, roll: 189, totals: "203-214", why: "motion to recommit; roll 190 is the passage vote" },
  { number: "H.R. 1181", chamber: "house", congress: 119, session: 2, roll: 239, totals: "—", why: "motion to recommit on a measure this pass does not re-ingest; its passage roll 240 is already live" },
  { number: "H.Res. 188 / 1153 / 1302 / 398 / 405 / 1300 / 1423", chamber: "house", congress: null, session: null, roll: null, totals: "—", why: "the rules providing for consideration of H.R. 8 and H.R. 1446, H.R. 7910, H.R. 1808, H.J.Res. 44, H.R. 2377 and H.R. 1041, plus their previous-question votes. Rules are not policy, and scripts/test-mapping-discipline.mjs refuses to let one be mapped at all; several also package unrelated measures, so no single position is readable" },
  { number: "H.R. 6538", chamber: "house", congress: 117, session: 2, roll: 307, totals: "260-169", why: "Active Shooter Alert Act — creates a notification network for an active-shooter event through the Department of Justice. It touches neither facet: no screening, storage, removal or trafficking rule, and no change to who may acquire or carry. (Its earlier suspension attempt failed at roll 289)" },
  { number: "H.R. 3091", chamber: "house", congress: 118, session: 1, roll: 222, totals: "—", why: "Federal Law Enforcement Officer Service Weapon Purchase Act — lets a retiring federal officer buy their service weapon. Employment administration for one federal workforce, not a facet question" },
  { number: "H.R. 2255", chamber: "house", congress: 119, session: 1, roll: 130, totals: "—", why: "the 119th's reintroduction of the same service-weapon bill — same reason" },
  { number: "H.R. 5110", chamber: "house", congress: 118, session: 1, roll: 407, totals: "—", why: "Protecting Hunting Heritage and Education Act — bars reading federal education funds as prohibiting archery and hunter-education programs. Passed under suspension near-unanimously; no distinguishing signal" },
  { number: "S.Amdt. 3447", chamber: "senate", congress: 119, session: 1, roll: 473, totals: "44-51", why: "Murphy amendment requiring a report on firearms deaths. A reporting requirement changes no rule on either facet, and it failed besides" },
  { number: "S. 2938", chamber: "senate", congress: 117, session: 2, roll: 235, totals: "64-34", why: "motion to proceed to the Bipartisan Safer Communities Act. A motion to proceed records whether a member will let the chamber take the bill up, not whether they support what it does; senate roll 242 is the decisive vote and is already ingested" },
  { number: "S. 2938", chamber: "senate", congress: 117, session: 2, roll: 240, totals: "65-34", why: "cloture on the motion to concur. The runbook's standing rule excludes cloture" },
  { number: "S. 2938", chamber: "senate", congress: 117, session: 2, roll: 241, totals: "—", why: "motion to table — a procedural disposition, not a vote on what the text does" },
  { number: "ATF director nominations", chamber: "senate", congress: null, session: null, roll: null, totals: "—", why: "senate rolls 117-2/233, /245 and /246 (Dettelbach) and 119-2/106 and /109 (Cekada). A nomination vote is about a person, not a measure, and vr_measure_issues maps measures. Confirmation votes on an agency head also mix agency-management views with firearms policy" },
  { number: "H.R. 1 (119th) — One Big Beautiful Bill Act", chamber: null, congress: 119, session: 1, roll: null, totals: "—", why: "P.L. 119-21 removed suppressors and short-barreled rifles from the National Firearms Act's $200 transfer tax — a real gun_rights change, and the only enacted one in the 119th. It rode inside a reconciliation package covering taxes, Medicaid, immigration and energy, so no member's vote on it is separable from the whole bill. The same rule that keeps H.R. 4366's passage vote out keeps this one out; unlike H.R. 4366 there was no standalone amendment roll on the firearms title to ingest instead" },
  { number: "H.R. 4366", chamber: "senate", congress: 118, session: 1, roll: 271, totals: "82-15", why: "passage of the three-division appropriations package carrying S.Amdt. 1354. An omnibus appropriations vote is not a firearms position, which is why the parent measure is created with NO issue mapping and only the amendment roll is ingested" },
];

// ── What was scanned, so a gap is a finding and not an assumption ────────────
const SCAN_COVERAGE =
  "The Clerk's grouped yearly roll-call indexes (ROLL_000 = rolls 1-99, ROLL_100 = 100-199, and so "
  + "on) were read in full for 2021, 2022, 2023, 2024, 2025 and 2026 — 2,916 index rows, the whole "
  + "117th, 118th and 119th Congresses through the last roll the Clerk had published when this seed "
  + "was built — and every row matching a firearms term was opened and judged. The Senate's "
  + "vote_menu_{congress}_{session}.xml was read the same way for all six sessions (528, 421, 352, "
  + "339, 659 and 217 votes). Two limits of that method are recorded because they nearly cost this "
  + "seed three of its nine rolls. First, a keyword scan cannot see a VEHICLE: the Clerk captions "
  + "S. 2938 as \"To designate the United States Courthouse ... Joseph Woodrow Hatchett\" and "
  + "H.R. 7910 as \"Protecting Our Kids Act\", and neither caption contains a firearms word. Both "
  + "were found by a second pass on substantive phrases (\"safer communities\", \"protecting our "
  + "kids\", \"extreme risk\") and by explicit citation grep, then confirmed against the chamber's "
  + "own document. Second, HOUSE AMENDMENT ROLLS ARE NOT KEYWORD-SCANNABLE AT ALL: the Clerk's "
  + "<vote-desc> for an amendment roll is empty and the index row reads only \"Sponsor of State Part "
  + "A Amendment No. N\", so House amendment content is invisible to any index scan and House "
  + "amendment coverage in this seed rests on following the amendment series of measures already "
  + "identified. The Senate index does carry amendment_purpose, so Senate amendments are fully "
  + "covered — which is how S.Amdt. 1354 and S.Amdt. 3447 were found.";

// ── The enacted-law tier, which is NOT empty ────────────────────────────────
const ENACTED_LAW_FINDING =
  "The mission's first priority is enacted laws, and unlike the elections pass the firearms window "
  + "has two. The first is the Bipartisan Safer Communities Act, S. 2938, P.L. 117-159 — the only "
  + "significant federal gun statute in three decades. Its two decisive rolls (senate 117-2/242 and "
  + "house 117-2/299) are already ingested by db/vr-phase-a-vote-seed.json and it is already mapped "
  + "to BOTH facets in opposite directions, so this pass reviewed that mapping and left it alone "
  + "rather than duplicating it. The second is easy to miss and is why this seed contains an "
  + "amendment roll: Section 413 of Division A of the Consolidated Appropriations Act, 2024 (P.L. "
  + "118-42, 138 Stat. 65) bars the use of Veterans Affairs funds to report to the Attorney General, "
  + "for National Instant Criminal Background Check System purposes, that a person deemed mentally "
  + "incapacitated or incompetent has been adjudicated a mental defective, absent a judicial finding "
  + "of danger. An earlier draft of this pass nearly recorded that the provision died in conference, "
  + "because a search of the enacted text for \"instant criminal\" returns only an unrelated "
  + "Fast-and-Furious rider; the provision was found alive by searching for \"mentally incompetent\" "
  + "and \"fiduciary\" instead. Its only clean standalone recorded vote is S.Amdt. 1354, agreed to "
  + "53-45, so that amendment is ingested and the omnibus passage vote is not. A third enacted "
  + "change — P.L. 119-21 removing suppressors and short-barreled rifles from the National Firearms "
  + "Act transfer tax — has NO separable vote at all and is declined for that reason.";

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

// The standing decisive set, plus two forms this pass needs. "On the Joint Resolution" is
// the Senate's question on a CRA disapproval — the same disposition "On Passage" is in the
// House, and H.J.Res. 44 is disposed of by it. "On the Amendment" is admitted ONLY for the
// single roll that carries an explicit decisiveWhy; nothing else in this seed uses it.
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
// "H.R. 1041" → "H R 1041"; "H.J.Res. 44" → "H J RES 44". The Clerk replaces periods with
// spaces and writes the resolution word in caps, so the compare is case-insensitive.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel, measure, session, roll, actionType) {
  const year = houseYear(sel.congress, session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${roll} (${sel.number})`;

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
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to" : /rejected|defeated/i.test(raw) ? "rejected" : "failed";
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
// chamber/state because they have since left Congress. Keyed by bioguide so that a roster
// row later gaining a state again cannot make the same person match twice and be dropped
// as ambiguous — the failure mode that once cost Marco Rubio every Phase A Senate roll.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", name: "Marco Rubio" }];
const senateLookup = [];
for (const r of [...senateRoster, ...SENATE_ALUMNI]) {
  if (!senateLookup.some((x) => x.bioguide === r.bioguide)) senateLookup.push(r);
}

// `verify` is a per-selection predicate over the fetched XML, because the Senate cites a
// bill and an amendment differently: a bill or joint resolution fills <document_type> and
// <document_number>, while an amendment vote leaves document_number EMPTY and puts the
// citation in <amendment_number> / <amendment_to_document_number>. Checking only the
// document fields would silently accept any amendment roll on any vehicle.
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
    admittedAs: o.decisiveWhy ? "decisive_by_exception" : "decisive",
    decisiveWhy: o.decisiveWhy || null,
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

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
  };
  let got = 0;
  if (sel.house) {
    const v = await fetchHouse(sel, measure, sel.house[0], sel.house[1], "passage");
    if (v) { votes.push(v); got++; }
  }
  if (sel.senate) {
    const cite = sel.number;
    const v = await fetchSenate(sel.number, measure, sel.congress, sel.senate[0], sel.senate[1], {
      actionType: "passage",
      verify: (xml) => {
        const doc = tag(xml, "document") || "";
        const dt = clean(tag(doc, "document_type"));
        const dn = clean(tag(doc, "document_number"));
        const cited = `${dt.endsWith(".") ? dt : dt + "."} ${dn}`.replace(/\s+/g, " ").trim();
        return cited === cite ? null : `document "${cited}" is not ${cite}`;
      },
    });
    if (v) { votes.push(v); got++; }
  }
  if (!got) notes.push(`!! ${sel.number} contributed NO roll call — the selection did not verify`);
}

for (const a of AMENDMENTS) {
  const measure = {
    measureType: "amendment", congress: a.congress, chamber: a.chamber, number: a.number,
    title: a.create.title, create: a.create,
    parentNumber: a.parentCreate.number, parentChamber: a.parentCreate.chamber,
    parentCongress: a.parentCreate.congress, parentCreate: a.parentCreate,
  };
  const v = await fetchSenate(a.number, measure, a.congress, a.session, a.roll, {
    actionType: a.actionType, decisiveWhy: a.decisiveWhy,
    // An amendment vote leaves <document_number> empty, so the amendment block is what
    // has to be checked — both the amendment's own number and the vehicle it amends.
    verify: (xml) => {
      const am = tag(xml, "amendment") || "";
      const n = clean(tag(am, "amendment_number"));
      const to = clean(tag(am, "amendment_to_amendment_number"));
      const veh = clean(tag(am, "amendment_to_document_number"));
      if (n !== a.number) return `amendment_number "${n}" is not ${a.number}`;
      if (a.amendmentTo && to !== a.amendmentTo) return `amendment_to_amendment_number "${to}" is not ${a.amendmentTo}`;
      if (veh !== a.vehicle) return `amendment_to_document_number "${veh}" is not ${a.vehicle}`;
      return null;
    },
  });
  if (v) votes.push(v);
  else notes.push(`!! ${a.number} contributed NO roll call — the selection did not verify`);
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the two firearms facets (issue keys gun_rights and gun_safety), 117th-119th "
    + "Congress. Built by scripts/vr-build-gun-vote-seed.mjs from clerk.house.gov/evs and "
    + "senate.gov roll_call_votes XML; candidates were found by reading the Clerk's yearly "
    + "roll-call indexes and the Senate's session vote menus in full, and each selection is "
    + "re-verified against the chamber's own document before inclusion — legis-num plus question "
    + "for the House, document_type/document_number plus question for a Senate bill or joint "
    + "resolution, and amendment_number plus amendment_to_document_number for the one amendment "
    + "roll. gun_rights covers carry and self-defence rights, Second Amendment protections "
    + "against registry and licensing burdens, and opposition to broad category bans; gun_safety "
    + "covers background checks, red-flag orders, assault-style and high-capacity restrictions, "
    + "safe storage and trafficking enforcement. The two are read independently: a measure may "
    + "test one facet, both with opposite directions, or neither. Where a firearms bill plainly "
    + "touches a facet but its text does not actually change that facet, the facet is declined "
    + "rather than forced — see declinedFacets. memberVotes is already filtered to "
    + "db/vr-member-map.json; unmapped members are counted in rosterSkipped, ambiguous Senate "
    + "surname matches in rosterAmbiguous, and neither is ever guessed. isParty is computed from "
    + "the full chamber tally, and totals is the full chamber tally, not the roster subset.",
  builtBy: "scripts/vr-build-gun-vote-seed.mjs",
  issueKeys: ["gun_rights", "gun_safety"],
  congresses: [117, 118, 119],
  parents: AMENDMENTS.map((a) => a.parentCreate.number),
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  declinedFacets: DECLINED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-gun-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected = SELECTIONS.reduce((n, s) => n + (s.house ? 1 : 0) + (s.senate ? 1 : 0), 0) + AMENDMENTS.length;
for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure        margin     req        attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(14)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 46)}`
  );
}
if (votes.length !== expected) {
  console.error(`\n! ${expected - votes.length} of ${expected} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
