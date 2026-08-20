#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — landmark enacted-law vote seed (Laken Riley · Epstein Files · FY2026 NDAA)
// ---------------------------------------------------------------------------
// Builds db/vr-landmark-vote-seed.json from the two chambers' OWN roll-call XML:
// clerk.house.gov/evs/<year>/roll<NNN>.xml and senate.gov's
// roll_call_votes/vote<C><S>/vote_<C>_<S>_<NNNNN>.xml. Nothing here is typed in from
// a news account or a secondary tracker; every roll is re-verified against the
// chamber's own citation fields before it is admitted, and a selection that fails
// verification is DROPPED with a note rather than corrected by hand.
//
// Three enacted laws, chosen because each is a high-salience vote that the record
// either mis-files or under-attributes today:
//
//   S. 5   → P.L. 119-1  Laken Riley Act (signed 2025-01-29)
//            The record already holds senate 119/1/7 and house 119/1/23 on S. 5 (see
//            migration 20260804000000_vr_repair_laken_riley_measure_identity.sql, which
//            moved them off H.R. 29), but house roll 23 carries only FOUR attributed
//            member votes out of 419 cast. Re-fetching it from the Clerk and topping it
//            up through the roster map is the single largest testable-position gain in
//            this pass. The three Senate amendment rolls are added because each is a
//            one-sentence, single-purpose test of a live dispute inside the bill —
//            which offences trigger mandatory detention (rolls 3 and 6), and whether
//            State attorneys general may sue the federal government over it (roll 4).
//
//   H.R. 4405 → P.L. 119-38  Epstein Files Transparency Act (signed 2025-11-19)
//            One recorded vote in the whole legislative history: house 119/1/289, under
//            suspension of the rules, 427-1. The Senate passed it the next day by
//            unanimous consent, so there is no Senate roll to find. A 427-1 roll barely
//            separates members — see the requiredMajority/margin caveat recorded in
//            marginCaveats — so the sponsorship record is what actually distinguishes
//            positions here, and it is carried in vr_positions by the migration.
//
//   S. 1071 → P.L. 119-60  National Defense Authorization Act for FY2026 (signed 2025-12-18)
//            The FY2026 NDAA is easy to mis-identify. S. 1071 was introduced 2025-03-14
//            as a VA-disinterment bill and passed the Senate by unanimous consent; the
//            House struck its text, substituted the NDAA, and passed it 312-112 (house
//            119/1/320). The Senate then agreed to the House amendment 77-20 (senate
//            119/1/648). Neither S. 2296 (the Senate's own FY2026 NDAA, passed 77-20 on
//            2025-10-09) nor H.R. 3838 (the House vehicle) is the enacted law, and the
//            H.R. 8800 already in the record is the FY2027 NDAA. Note that the Clerk's
//            <vote-desc> for rolls 319 and 320 still prints the ORIGINAL disinterment
//            title, which is why verification here keys on <legis-num> and not the
//            description.
//
// Attribution is fail-closed and identical to scripts/vr-build-gun-vote-seed.mjs:
// the House XML carries a bioguide in @name-id so a member resolves directly through
// db/vr-member-map.json; the Senate XML carries no bioguide, so a senator resolves on
// (surname, state) and ONLY a unique hit is accepted. isParty is computed over the
// full chamber before roster filtering, and `totals` is always the full chamber tally.
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
const BS = (c, t, n) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${t}/BILLSTATUS-${c}${t}${n}.xml`;

// ── The three bills, and the rolls each contributes ─────────────────────────
// `mustExist` marks a measure the record already holds: the migration looks it up and
// refuses to invent it, so a `create` block would be a second, competing description of
// a row that is already correct. `create` appears only on rows this pass introduces.
const SELECTIONS = [
  {
    number: "S. 5", measureType: "bill", congress: 119, chamber: "senate",
    // house roll 23 (263-156) and senate roll 7 (64-35) are already in the record on
    // this measure. They are re-fetched to top up attribution, not to re-file the roll.
    house: [1, 23],
    senate: [1, 7],
    mustExist:
      "Created and re-pointed by migration 20260804000000_vr_repair_laken_riley_measure_identity.sql, "
      + "which established that S. 5 and not H.R. 29 is Public Law 119-1. Live as row id 144, status "
      + "'enacted', publicLaw 119-1, carrying senate roll 119/1/7 and house roll 119/1/23 and all four "
      + "curated mappings (deportations primary, border_security, tough_on_crime, states_federal_power). "
      + "This pass adds member votes only; the mappings it re-emits from the curated seed are identical "
      + "to the live rows and so are no-ops.",
  },
  {
    number: "H.R. 29", measureType: "bill", congress: 119, chamber: "house",
    // The House's own Laken Riley bill. Passed the House 264-159 and went no further —
    // the Senate took up S. 5 instead. Included because roll 6 holds only 22 of the 423
    // votes cast, and a member's vote on the House companion is a real, separate record.
    house: [1, 6],
    mustExist:
      "Live as row id 2, status 'passed_house', carrying roll 119/1/6 and all four mappings "
      + "(deportations primary, border_security, tough_on_crime, states_federal_power) — the last two "
      + "of which were live in the database but absent from db/vr-issue-seed.json until this pass added "
      + "them, so the ingest endpoint had nothing to re-assert them from. This pass adds member votes "
      + "and closes that seed gap; it re-describes nothing.",
  },
  {
    number: "H.R. 4405", measureType: "bill", congress: 119, chamber: "house",
    house: [1, 289],
    create: {
      title:
        "To require the Attorney General to release all documents and records in possession of the "
        + "Department of Justice relating to Jeffrey Epstein, and for other purposes.",
      shortTitle: "Epstein Files Transparency Act",
      summary:
        "Requires the Department of Justice to publish, in a searchable and downloadable format, all "
        + "unclassified records, documents, communications and investigative materials in its "
        + "possession relating to the investigation and prosecution of Jeffrey Epstein — including "
        + "materials relating to Ghislaine Maxwell, flight logs and travel records, and individuals "
        + "named or referenced in connection with the investigation, government officials among them. "
        + "DOJ may withhold victims' personal information and material whose release would jeopardize "
        + "an active federal investigation. Within 15 days of publication DOJ must report to Congress "
        + "the categories of information released and withheld, a summary of any redactions, and a "
        + "list of all government officials and politically exposed individuals named in the published "
        + "materials. Sponsored by Rep. Ro Khanna with Rep. Thomas Massie as original cosponsor; 24 "
        + "cosponsors in all. Passed the House 427-1 under suspension of the rules on 2025-11-18 "
        + "(roll 119/1/289), passed the Senate without amendment by unanimous consent on 2025-11-19 "
        + "with no recorded vote, and signed the same day as Public Law 119-38.",
      introducedAt: "2025-07-15", status: "enacted",
      sourceUrl: CG(119, "house-bill", 4405), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr4405-119", publicLaw: "119-38", billStatus: BS(119, "hr", 4405) },
    },
  },
  {
    number: "S. 1071", measureType: "bill", congress: 119, chamber: "senate",
    house: [1, 320],
    senateConcur: [1, 648],
    mustExist:
      "Live as row id 75, title already correct ('National Defense Authorization Act for Fiscal Year "
      + "2026') but status still 'pending' with no publicLaw recorded, carrying house roll 119/1/319 "
      + "only (On Motion to Commit, failed 209-216, correctly typed 'motion' by migration "
      + "20260809000000_vr_map_substantive_remainder.sql, which deliberately left the measure unmapped "
      + "because a commit motion was then its only roll). This pass adds the two decisive rolls and the "
      + "mapping, and brings status and external_ids up to Public Law 119-60 without touching the title. "
      + "vr_measures has no unique index on (congress, number), so the migration resolves the "
      + "roll-bearing row from roll 119/1/319 rather than assuming, and applies the mapping to every row "
      + "carrying the number — one row today.",
  },
];

// ── The three Senate amendment rolls, and their parent ──────────────────────
// Each is admitted under the vote-seed test's `amendment` exception, which requires the
// measure to be an S.Amdt./H.Amdt. and requires the vote to carry its own decisiveWhy.
// The parent is S. 5, which already exists — no parentCreate here.
const AMENDMENTS = [
  {
    number: "S.Amdt. 14", congress: 119, session: 1, roll: 3, chamber: "senate",
    amendmentTo: "S.Amdt. 8", vehicle: "S. 5", actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its question is single-purpose — "
      + "\"To expand the list of criminal offenses that subject inadmissible aliens to mandatory "
      + "detention\" — so a yea carries one meaning and only one. Agreeing to it IS its disposition; "
      + "an amendment never receives a passage vote, and the text it added is in Public Law 119-1.",
    create: {
      title: "Cornyn amendment expanding the offences that trigger mandatory detention (S.Amdt. 14)",
      shortTitle: "Cornyn Laken Riley Amendment (S.Amdt. 14)",
      summary:
        "Second-degree amendment to S.Amdt. 8 to S. 5, offered by Senator John Cornyn: \"To expand the "
        + "list of criminal offenses that subject inadmissible aliens to mandatory detention.\" Agreed "
        + "to 70-25 on 2025-01-15 and carried into the text enacted as Public Law 119-1, the Laken "
        + "Riley Act. The Senate's recorded vote is roll call 119/1/3.",
      introducedAt: "2025-01-15", status: "enacted",
      sourceUrl:
        "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00003.htm",
      sourceLabel: "U.S. Senate — roll call 119/1/3",
      externalIds: { senateVote: "119-1-3", publicLaw: "119-1" },
    },
  },
  {
    number: "S.Amdt. 23", congress: 119, session: 1, roll: 4, chamber: "senate",
    amendmentTo: null, vehicle: "S. 5", actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its question is single-purpose — \"To "
      + "strike the section that authorizes State attorneys general to sue Federal immigration "
      + "authorities for alleged violations relating to the detention of aliens\" — so a yea carries "
      + "one meaning and only one, and it is the only recorded Senate vote isolating that section from "
      + "the rest of the bill. Rejected 46-49, so the section stayed in the enacted law.",
    create: {
      title:
        "Coons amendment striking the State attorney general cause of action (S.Amdt. 23)",
      shortTitle: "Coons Laken Riley Amendment (S.Amdt. 23)",
      summary:
        "Amendment to S. 5 offered by Senator Chris Coons: \"To strike the section that authorizes "
        + "State attorneys general to sue Federal immigration authorities for alleged violations "
        + "relating to the detention of aliens.\" REJECTED 46-49 on 2025-01-15 (roll call 119/1/4), so "
        + "the cause of action survived into Public Law 119-1. A yea would have removed it; a nay kept "
        + "it. This is the record's only roll call isolating that provision.",
      introducedAt: "2025-01-15", status: "failed",
      sourceUrl:
        "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00004.htm",
      sourceLabel: "U.S. Senate — roll call 119/1/4",
      externalIds: { senateVote: "119-1-4" },
    },
  },
  {
    number: "S.Amdt. 8", congress: 119, session: 1, roll: 6, chamber: "senate",
    amendmentTo: null, vehicle: "S. 5", actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its question is single-purpose — \"To "
      + "include crimes resulting in death or serious bodily injury to the list of offenses that, if "
      + "committed by an inadmissible alien, require mandatory detention\" — so a yea carries one "
      + "meaning and only one. This is the substitute the Senate adopted, as amended by S.Amdt. 14, "
      + "immediately before passing S. 5; its text is in Public Law 119-1.",
    create: {
      title:
        "Ernst amendment adding crimes causing death or serious bodily injury to the mandatory-detention "
        + "list (S.Amdt. 8)",
      shortTitle: "Ernst Laken Riley Amendment (S.Amdt. 8)",
      summary:
        "Amendment to S. 5 offered by Senator Joni Ernst: \"To include crimes resulting in death or "
        + "serious bodily injury to the list of offenses that, if committed by an inadmissible alien, "
        + "require mandatory detention.\" Agreed to AS AMENDED (by Senator Cornyn's S.Amdt. 14) 75-24 "
        + "on 2025-01-20, roll call 119/1/6, minutes before the Senate passed S. 5 64-35 on roll "
        + "119/1/7. Its text is in Public Law 119-1. This is the amendment the descriptive row "
        + "'Senate Amendment to S. 5' was standing in for; that row carries no roll call and this one "
        + "does.",
      introducedAt: "2025-01-09", status: "enacted",
      sourceUrl:
        "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00006.htm",
      sourceLabel: "U.S. Senate — roll call 119/1/6",
      externalIds: { senateVote: "119-1-6", publicLaw: "119-1" },
    },
  },
];

// ── Issue axes deliberately NOT mapped, and why ─────────────────────────────
// The FY2026 NDAA folds in fourteen separately titled Acts. That is exactly the
// condition under which "map the distinct policy axes" turns into forcing: a member's
// yea on a must-pass defence authorisation is not a position on each rider it carries,
// and netlify/lib/vr-ingest.ts attaches a mapping to the MEASURE, so every axis added
// here is applied at full strength to both decisive rolls. Three axes survived that
// test and are mapped in db/vr-issue-seed.json — strong_defense (80, primary),
// immig_fentanyl (40) and states_federal_power (25), each weighted for how much of the
// bill it actually represents. The rest are recorded here with the provision that
// tempted them, so the skip reads as a judgement and not as an oversight, and so a later
// pass can revisit any of them with provision-level rolls.
// A facet that was declined here and has since been mapped anyway. Kept, rather than deleted,
// because the reason it was declined was doctrine that has since been retired — runbook rule 22's
// "section inside a vehicle" bar — and a reader who finds the old refusal quoted in an applied
// migration needs to be able to see what happened to it.
const REVERSED_FACETS = [
  {
    measure: "S. 1071 (119th, FY2026 NDAA)", facet: "israel_support",
    declinedWhy:
      "The enacted text carries six Israel provisions — Sec. 864 (US-Israel Defense Industrial Base "
      + "Working Group), Secs. 1231 and 1232 (extending anti-tunnel and counter-unmanned-systems "
      + "cooperation), Sec. 1235 (report on joint exercises), Sec. 1657 (Iron Dome and cooperative "
      + "missile defence co-development and co-production) and Sec. 1706 (assessment of arms embargoes "
      + "on Israel). All are extensions of long-standing, uncontested cooperation programmes, and none "
      + "was the subject of a recorded vote. Mapping the bill to israel_support would score every one "
      + "of the 112 members who voted against the NDAA as opposing Israel aid, which is a verdict the "
      + "roll call does not support. The record already tests this axis directly through amendment "
      + "rolls (H.Amdt. 235, H.Amdt. 478), which is the right instrument for it.",
    reversedBy: "20260911000000_vr_ndaa_israel_keys_and_rule22.sql",
    reversedWhy:
      "Mapped, secondary, weight 35, yea_supports. The provisions were never in doubt; the bar was. "
      + "The product rule now in runbook rule 22 is that a provision in the primary text counts even "
      + "when it travelled inside a larger bill: a yea advances the package as written and a nay "
      + "blocks it, and the weight — not the refusal — is where the share of the vehicle is "
      + "recorded. \"None of it was separately voted\" was the vehicle argument, not the duplicate "
      + "argument; no separately-voted Israel rider exists on this bill, so nothing is counted twice. "
      + "H.R. 8800 (FY2027 NDAA) and S. 1605 (FY2022 NDAA) were mapped in the same pass so the three "
      + "NDAAs read alike.",
  },
];

const DECLINED_FACETS = [
  {
    measure: "S. 1071 (119th, FY2026 NDAA)", facet: "econ_trade",
    why:
      "Sec. 351 (Army organic industrial base), Sec. 865 (domestic textile and industrial base), Sec. "
      + "867 (defense industrial base fund) and Sec. 1019 (maritime industrial base) all concern "
      + "domestic sourcing, but they set defence procurement and production capacity, not trade policy. "
      + "A yea is a vote for military readiness through domestic manufacture; reading it as a position "
      + "on tariffs or trade agreements would be a category error.",
  },
  {
    measure: "S. 1071 (119th, FY2026 NDAA)", facet: "veterans",
    why:
      "Tempting only because of the vehicle's ORIGINAL text — S. 1071 was introduced as a bill to "
      + "disinter the remains of Fernando V. Cota from Fort Sam Houston National Cemetery, and the "
      + "Clerk's vote-desc for rolls 319 and 320 still prints that title. The House struck the entire "
      + "text and substituted the NDAA, so nothing a member voted on relates to that subject. This is "
      + "the exact trap the vote-desc would set for a mapping written from the roll-call page.",
  },
  {
    measure: "S. 1071 (119th, FY2026 NDAA)", facet: "privacy_rights",
    why:
      "Checked against the enacted text and NOT present: zero occurrences of 'section 702' and zero of "
      + "'FISA'. The FY2026 NDAA carries no surveillance-authority provision, so there is nothing to "
      + "map, in either direction.",
  },
  {
    measure: "S. 1071 (119th, FY2026 NDAA)", facet: "national_debt / cut_spending",
    why:
      "An authorisation is not an appropriation, and a defence authorisation's topline is the "
      + "substance of the bill rather than a fiscal-restraint choice made within it. Members voting "
      + "both ways did so on defence grounds; scoring the roll as a spending position would read the "
      + "same yea as pro-spending and the same nay as fiscally conservative regardless of the stated "
      + "reason. Left to the appropriations rolls, which do test it.",
  },
  {
    measure: "H.R. 4405 (119th, Epstein Files Transparency Act)", facet: "tough_on_crime",
    why:
      "The Act compels DISCLOSURE of records from a closed investigation and prosecution. It creates "
      + "no offence, changes no penalty and adds no enforcement authority, so there is nothing for a "
      + "criminal-justice-posture mapping to attach to. gov_transparency alone carries the whole "
      + "substance of the vote.",
  },
  {
    measure: "S.Amdt. 23 (119th, Coons)", facet: "deportations",
    why:
      "The amendment strikes the State attorney general cause of action and nothing else. It does not "
      + "narrow the offence list, shorten detention or change who is removable, so a yea is not a vote "
      + "against deportation — it is a vote against a particular litigation mechanism. Mapping it to "
      + "deportations would score 46 senators as softening an enforcement standard the amendment does "
      + "not touch. states_federal_power carries it, in the yea_opposes direction.",
  },
];

// ── Roll calls considered and declined, with the reason ─────────────────────
const DECLINED = [
  {
    number: "S. 5", chamber: "senate", congress: 119, session: 1, roll: 1,
    totals: "84-9",
    why:
      "On the Cloture Motion on the motion to proceed. Runbook rule 8: cloture is a vote on whether to "
      + "debate, and a senator who votes to proceed and then votes against passage has taken one "
      + "position, not two.",
  },
  {
    number: "S. 5", chamber: "senate", congress: 119, session: 1, roll: 2,
    totals: "82-10",
    why: "On the Motion to Proceed — floor process, not the substance of the bill.",
  },
  {
    number: "S. 5", chamber: "senate", congress: 119, session: 1, roll: 5,
    totals: "61-35",
    why: "On the Cloture Motion on the bill. Declined for the same reason as roll 1.",
  },
  {
    number: "S. 1071", chamber: "house", congress: 119, session: 1, roll: 319,
    totals: "209-216",
    why:
      "On Motion to Commit — already in the record, correctly typed 'motion', and left there. It is a "
      + "procedural roll whose yea BLOCKS the measure (yeaBlocksMeasure() in netlify/lib/vr-pack.ts "
      + "matches the bare 'to commit' form on exactly this roll), so it is scored at 0.25 weight with "
      + "an inverted advance direction. Not re-fetched: this pass adds the decisive roll 320 that "
      + "followed it 13 minutes later.",
  },
  {
    number: "S. 1071", chamber: "senate", congress: 119, session: 1, roll: 646,
    totals: "75-22",
    why: "On the Motion to Proceed to the message on S. 1071 — floor process.",
  },
  {
    number: "S. 1071", chamber: "senate", congress: 119, session: 1, roll: 647,
    totals: "76-20",
    why: "On the Cloture Motion on the motion to concur. Declined for the same reason as S. 5 roll 1.",
  },
  {
    number: "S. 2296", chamber: "senate", congress: 119, session: 1, roll: 570,
    totals: "77-20",
    why:
      "On Passage of the Senate's own FY2026 NDAA, 2025-10-09. A real vote on a real bill, but S. 2296 "
      + "is NOT the enacted law: the FY2026 NDAA became law as S. 1071 (P.L. 119-60) after the House "
      + "substituted its text into that vehicle. Ingesting both would weight one policy twice and "
      + "would leave two measures each claiming to be the FY2026 NDAA. Recorded here so the omission "
      + "is legible; a later pass may add S. 2296 as the Senate's separate position on its own bill.",
  },
  {
    number: "S. 2", chamber: "senate", congress: 119, session: 2, roll: 163,
    totals: "52-47",
    why:
      "On Passage of the Bill S. 2 (Secure America Act, P.L. 119-98), 2026-06-05, with the House "
      + "companion roll 119/2/214 (On Passage, 214-212) and roll 119/2/213 (On Motion to Commit, "
      + "failed 211-215). VERIFIED against senate.gov and clerk.house.gov and deliberately deferred, "
      + "not missed: S. 2 is a reconciliation bill under title II of S. Con. Res. 33 spanning many "
      + "titles, and the runbook's strict rule for a new measure requires a single clear policy nexus "
      + "with a correct supportMeaning before any roll of it is ingested. Mapping it needs a reading "
      + "of the enacted text on the scale this pass gave the NDAA, and the roll numbers and totals are "
      + "recorded here so that pass starts from verified facts rather than from a search.",
  },
];

// ── What was scanned, so a gap is a finding and not an assumption ───────────
const SCAN_COVERAGE =
  "This is a targeted pass, not a sweep: the three measures were named, and for each one the FULL "
  + "legislative history was read from the chamber records rather than the roll calls being searched "
  + "for. For S. 5 that is Senate rolls 119/1/1 through 119/1/7 (the complete floor consideration: two "
  + "cloture motions, a motion to proceed, three amendment rolls and passage) plus the House's roll "
  + "119/1/23, and H.R. 29's roll 119/1/6. For H.R. 4405 the BILLSTATUS action list was read end to "
  + "end and confirms exactly one recorded vote in either chamber — house 119/1/289 — with the Senate "
  + "disposing of it 'without amendment by Unanimous Consent' on 2025-11-19, so the absence of a "
  + "Senate roll is a fact about the record and not a gap in this seed. For S. 1071 the enacted "
  + "identity was established from the BILLSTATUS action list and the enrolled text before any roll "
  + "was fetched, which is what ruled out S. 2296 and H.R. 3838; its House rolls 319 and 320 and "
  + "Senate rolls 646, 647 and 648 are the complete set. Every roll in each of those histories is "
  + "either in this seed, already in the record, or in declinedRollCalls with a reason.";

// ── The enacted-law tier ────────────────────────────────────────────────────
const ENACTED_LAW_FINDING =
  "All three measures are enacted law, which is the point of the pass: P.L. 119-1 (S. 5, Laken Riley "
  + "Act, 2025-01-29), P.L. 119-38 (H.R. 4405, Epstein Files Transparency Act, 2025-11-19) and P.L. "
  + "119-60 (S. 1071, National Defense Authorization Act for Fiscal Year 2026, 2025-12-18). Two of "
  + "the three had to be identified rather than looked up. The Laken Riley Act is S. 5 and not the "
  + "House's H.R. 29, which passed the House and died there — the record filed both S. 5 rolls under "
  + "H.R. 29 until migration 20260804000000 corrected it. The FY2026 NDAA is S. 1071 and not S. 2296 "
  + "or H.R. 3838; S. 1071 was a VA-disinterment bill whose text the House struck and replaced, and "
  + "the Clerk's vote description still shows the original title. Both traps are recorded in "
  + "declinedFacets and declinedRollCalls so neither can be re-entered by a later pass.";

// ── Margin caveats: where a roll's own arithmetic limits what it can test ───
const MARGIN_CAVEATS = [
  {
    roll: "house 119/1/289 (H.R. 4405)",
    caveat:
      "427-1 with 5 not voting, under suspension of the rules (two-thirds required). The vote is a "
      + "genuine, citable gov_transparency record for every member who cast it, but it separates almost "
      + "nobody: a member matching a stated transparency position against this roll gains a "
      + "confirmation, not a distinction. That is why the migration also writes the sponsorship record "
      + "to vr_positions — sponsoring or originally cosponsoring the bill in July 2025, four months "
      + "before the floor caught up, is the part of this history that actually differentiates.",
  },
  {
    roll: "senate 119/1/6 (S.Amdt. 8)",
    caveat:
      "Agreed to 75-24 as amended. Broad, but not unanimous, and the 24 nays are a real signal: the "
      + "amendment is the substitute that broadened the offence list, so a nay here from a senator who "
      + "went on to vote for passage read the breadth, not the bill.",
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
// this pass needs is already in it: "On Passage" (House rolls 6, 23, 320), "On Passage of
// the Bill" (Senate roll 7), "On Motion to Suspend the Rules and Pass" (House roll 289),
// "On the Motion (Motion to Concur in the House Amendment to S. 1071)" (Senate roll 648)
// and "On the Amendment" (Senate rolls 3, 4, 6 — each carrying its own decisiveWhy).
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
// "H.R. 4405" → "H R 4405"; "S. 1071" → "S 1071". The Clerk replaces periods with spaces.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel, measure, session, roll, actionType) {
  const year = houseYear(sel.congress, session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${roll} (${sel.number})`;

  // Verification keys on legis-num, NEVER on vote-desc: for S. 1071 the Clerk's
  // description is still the original VA-disinterment title, so a description check would
  // reject the correct roll and a description-driven mapping would map the wrong subject.
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
// chamber/state because they have since left Congress. Keyed by bioguide so that a roster
// row later gaining a state again cannot make the same person match twice and be dropped
// as ambiguous — the failure mode that once cost Marco Rubio every Phase A Senate roll.
// Rubio matters here: he was a sitting senator for S. 5 rolls 3, 4, 6 and 7 in January
// 2025 and was confirmed Secretary of State on 2025-01-20, the day of rolls 6 and 7.
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

// The Senate's document check, shared by the passage roll and the motion-to-concur roll.
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
  };
  let got = 0;
  if (sel.house) {
    const v = await fetchHouse(sel, measure, sel.house[0], sel.house[1], "passage");
    if (v) { votes.push(v); got++; }
  }
  if (sel.senate) {
    const v = await fetchSenate(sel.number, measure, sel.congress, sel.senate[0], sel.senate[1], {
      actionType: "passage", verify: senateDocCheck(sel.number),
    });
    if (v) { votes.push(v); got++; }
  }
  if (sel.senateConcur) {
    // "On the Motion (Motion to Concur in the House Amendment to S. 1071)". mapActionType()
    // in netlify/lib/vr-normalize.ts returns 'passage' for any question containing "concur",
    // and rightly: concurring in the House amendment IS the Senate's vote on the NDAA text.
    const v = await fetchSenate(sel.number, measure, sel.congress, sel.senateConcur[0], sel.senateConcur[1], {
      actionType: "passage", verify: senateDocCheck(sel.number),
    });
    if (v) { votes.push(v); got++; }
  }
  const want = (sel.house ? 1 : 0) + (sel.senate ? 1 : 0) + (sel.senateConcur ? 1 : 0);
  if (got !== want) notes.push(`!! ${sel.number} contributed ${got} of ${want} rolls — a selection did not verify`);
}

for (const a of AMENDMENTS) {
  const measure = {
    measureType: "amendment", congress: a.congress, chamber: a.chamber, number: a.number,
    title: a.create.title, create: a.create,
    // The parent already exists (S. 5, created by migration 20260804000000), so there is
    // no parentCreate: the migration looks it up and fails loudly if it is gone.
    parentNumber: a.vehicle, parentChamber: "senate", parentCongress: a.congress,
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
    "Roll calls for three enacted laws of the 119th Congress — the Laken Riley Act (S. 5, P.L. 119-1), "
    + "the Epstein Files Transparency Act (H.R. 4405, P.L. 119-38) and the National Defense "
    + "Authorization Act for Fiscal Year 2026 (S. 1071, P.L. 119-60). Built by "
    + "scripts/vr-build-landmark-vote-seed.mjs from clerk.house.gov/evs and senate.gov "
    + "roll_call_votes XML. Each selection is re-verified against the chamber's own citation fields "
    + "before inclusion: legis-num plus question for the House, document_type/document_number plus "
    + "question for a Senate bill, and amendment_number plus amendment_to_document_number for the "
    + "three Senate amendment rolls. House verification deliberately IGNORES vote-desc, because the "
    + "Clerk's description for S. 1071 rolls 319 and 320 is still the original VA-disinterment title "
    + "the House struck. Two of the three measures and one parent already exist in the record and are "
    + "marked mustExist, so this pass adds member votes and mappings without re-describing rows other "
    + "migrations own. memberVotes is already filtered to db/vr-member-map.json; unmapped members are "
    + "counted in rosterSkipped, ambiguous Senate surname matches in rosterAmbiguous, and neither is "
    + "ever guessed. isParty is computed from the full chamber tally, and totals is the full chamber "
    + "tally, not the roster subset.",
  builtBy: "scripts/vr-build-landmark-vote-seed.mjs",
  issueKeys: [
    "deportations", "border_security", "tough_on_crime", "states_federal_power",
    "gov_transparency", "strong_defense", "immig_fentanyl",
  ],
  congresses: [119],
  parents: ["S. 5"],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  marginCaveats: MARGIN_CAVEATS,
  declinedFacets: DECLINED_FACETS,
  reversedFacets: REVERSED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-landmark-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected =
  SELECTIONS.reduce((n, s) => n + (s.house ? 1 : 0) + (s.senate ? 1 : 0) + (s.senateConcur ? 1 : 0), 0)
  + AMENDMENTS.length;
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
