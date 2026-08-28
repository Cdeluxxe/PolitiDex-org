#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal formal-depth vote seed (wave F1)
//   H.R. 5408 · H.J.Res. 131 (P.L. 119-52) · S.Amdt. 3535 · H.R. 1069
// ---------------------------------------------------------------------------
// Builds db/vr-federal-depth-vote-seed.json from the two chambers' OWN roll-call XML:
// clerk.house.gov/evs/<year>/roll<NNN>.xml and senate.gov's
// roll_call_votes/vote<C><S>/vote_<C>_<S>_<NNNNN>.xml. Nothing is typed in from a news
// account or a secondary tracker; every roll is re-verified against the chamber's own
// citation fields before it is admitted, and a selection that fails verification is
// DROPPED with a note rather than corrected by hand.
//
// WHY THESE FOUR, AND WHY THEY ARE NOT INTERCHANGEABLE
//
// This pass is aimed at a measured deficit, not at a coverage number. The formal pattern
// index (PDXConsistency.formalPatternIndex in consistency.js) reports, per member and per
// issue key, whether the record can read a pattern out of that member's votes. Running
// scripts/vr-federal-fpi.mjs --why over the Utah federal delegation returns 27 unread
// rows across ten issue keys, and every single one carries the same reason id:
// `vehicle_only` — "every mapped instrument on this key was a package". A member who has
// only ever met an issue inside an omnibus has not been tested on it, and the index
// refuses to pretend otherwise. The fix is not more attribution on the packages. It is a
// STANDALONE, CONTESTED, single-subject instrument on the key itself, in the chamber the
// member actually sits in. That last clause is what makes these four specific:
//
//   H.R. 5408   Faster Labor Contracts Act. econ_workers was vehicle_only for the Utah
//               House members because the record's only econ_workers instruments were
//               H.R. 1319 (the 2021 rescue package) and H.R. 1 — both packages. This is a
//               one-subject labour bill: mandatory first-contract bargaining deadlines,
//               FMCS mediation at 90 days, referral to binding arbitration. It passed the
//               House 230-193 on 2026-06-09 with the parties inverted from the usual
//               pattern — Democrats 210-0 for, Republicans 192-20 against — so the roll
//               separates members WITHIN the majority as well as between the parties.
//               Received in the Senate 2026-06-10 and no further; NOT law.
//
//   H.J.Res. 131  Congressional Review Act disapproval of the Bureau of Land Management's
//               December 2024 Coastal Plain Oil and Gas Leasing Program Record of
//               Decision, nullifying the ROD that had put roughly 1.2 million of the
//               Arctic National Wildlife Refuge's 1.6-million-acre programme area
//               off-limits to leasing. lands_energy was vehicle_only for BOTH Utah
//               senators, whose only lands_energy instrument was H.R. 1. This one carries
//               a decisive roll in EACH chamber — House 217-209 on 2025-11-18, Senate
//               49-45 on 2025-12-04 — which is why it, and not a House-only energy bill,
//               is the instrument that reaches the Senate side of the delegation. Became
//               P.L. 119-52 on 2025-12-11.
//
//   S.Amdt. 3535  Scott (FL) amendment to the FY2026 NDAA (S. 2296), requiring
//               Presidential appointment and Senate confirmation of the Inspector General
//               of the Federal Reserve Board of Governors and of the Consumer Financial
//               Protection Bureau. congress_oversight was vehicle_only for five of the
//               seven Utah federal members, its only instrument being H.R. 7888 (the FISA
//               reauthorisation package). This is the ONLY standalone, contested Senate
//               instrument on the key in the 119th: rejected 53-43 under a 3/5 threshold,
//               so a 53-vote majority position is on the record as a defeat. Admitted
//               under runbook rule 12's amendment shape exception, and it ships a
//               decisiveWhy for exactly that reason.
//
//   H.R. 1069   PROTECT Our Kids Act. In the record, attributed on House roll 119/1/313
//               (On Passage, 247-164, 2025-12-04), and carrying ZERO issue mappings. It
//               entered this pass as a mapping candidate and LEAVES it still unmapped, on
//               purpose. db/vr-ingest-runbook.md follow-up 0c already refuses it in
//               writing — "no key for foreign influence in domestic institutions… the
//               bill stays unmapped until the vocabulary question is decided on its own;
//               do not invent a key for one measure." Runbook rule 27 says a refusal
//               written before the taxonomy moved must be re-read rather than inherited,
//               so it was re-read here. The re-read REINFORCES it: alignment-tool.js's
//               August 2026 narrowing of america_first states in terms that "countering
//               China" is now OUT of that key, having previously swallowed seven cards the
//               chip never mentioned. So the one key a hurried pass would have reached for
//               is the key the vocabulary just disowned. What this measure contributes
//               instead is two things worth having: a verification result — the Clerk's
//               XML agrees with all 109 live member votes on position AND party flag, so
//               the attribution needs no top-up — and one field correction, status
//               'pending' → 'passed_house'.
//
// Attribution is fail-closed and identical to scripts/vr-build-fiscal-enforcement-vote-seed.mjs:
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
// `mustExist` marks a measure the record already holds: the migration looks it up and
// refuses to invent it, so a `create` block would be a second, competing description of
// a row another migration owns. `create` appears on the three genuinely new rows.
const SELECTIONS = [
  {
    number: "H.R. 5408", measureType: "bill", congress: 119, chamber: "house",
    rolls: [
      // 2026-06-09, 230-193 (D 210-0, R 20-192, I 0-1), 5 not voting.
      { chamber: "house", session: 2, roll: 216, actionType: "passage" },
    ],
    create: {
      title:
        "To amend the National Labor Relations Act to establish an efficient process for "
        + "reaching a first collective bargaining agreement, and for other purposes.",
      shortTitle: "Faster Labor Contracts Act",
      summary:
        "A single-subject labour bill setting mandatory deadlines for the negotiation of an "
        + "INITIAL collective bargaining agreement and providing mediation and binding arbitration "
        + "to finish one. Negotiations must begin within 10 days of an employer receiving a written "
        + "request from a newly recognised or certified bargaining representative, and the parties "
        + "must make every reasonable effort to conclude and sign an agreement. If no agreement has "
        + "been reached after 90 days either party may request mediation by the Federal Mediation "
        + "and Conciliation Service, which must use its best efforts to secure one. If mediation "
        + "produces no agreement within 30 days (or a longer period both parties agree to), FMCS "
        + "must refer the dispute to an arbitration panel, which renders a decision settling it "
        + "after considering specified factors including the employer's financial prospects and the "
        + "employees' cost of living. The resulting agreement binds the parties for two years, "
        + "amendable by mutual agreement inside that window. The bill also requires an employer to "
        + "maintain current wages, hours, terms and conditions of employment during negotiations, "
        + "and continues the duty to bargain even where a representative has been decertified. The "
        + "Government Accountability Office must report to Congress on the average number of days "
        + "between certification or recognition of a representative and execution of the initial "
        + "agreement. Sponsored by Rep. Donald Norcross (D-NJ-1) with 110 cosponsors; policy area "
        + "Labor and Employment. Passed the House 230-193 on 2026-06-09 (roll 119/2/216) and was "
        + "received in the Senate on 2026-06-10, where it has had no further action: this is a "
        + "House-passed bill, NOT law.",
      introducedAt: "2025-09-16", status: "passed_house",
      sourceUrl: CG(119, "house-bill", 5408),
      sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr5408-119" },
    },
  },
  {
    number: "H.J.Res. 131", measureType: "resolution", congress: 119, chamber: "house",
    rolls: [
      // 2025-11-18, 217-209 (R 214-1, D 3-208), 7 not voting.
      { chamber: "house", session: 1, roll: 295, actionType: "passage" },
      // 2025-12-04, 49-45, 6 absent. "On the Joint Resolution H.J.Res. 131".
      { chamber: "senate", session: 1, roll: 632, actionType: "passage" },
    ],
    create: {
      title:
        "Providing for congressional disapproval under chapter 8 of title 5, United States Code, "
        + "of the rule submitted by the Bureau of Land Management relating to “Coastal Plain Oil "
        + "and Gas Leasing Program Record of Decision”.",
      shortTitle: "ANWR Coastal Plain leasing ROD disapproval",
      summary:
        "A Congressional Review Act resolution of disapproval nullifying the Record of Decision "
        + "issued by the Bureau of Land Management on 2024-12-09 for the programme that leases, "
        + "develops, produces and transports oil and gas in and from the Coastal Plain programme "
        + "area of the Arctic National Wildlife Refuge. The 2024 ROD had replaced the 2020 ROD, "
        + "which made all of the roughly 1.6 million acres of the programme area available for oil "
        + "and gas leasing; the 2024 ROD made roughly 1.2 million of those acres unavailable for "
        + "leasing or exploration in order to protect and conserve resources and certain uses, "
        + "while still requiring the statutory minimum of 400,000 acres — located, under current "
        + "law, in the areas with the highest hydrocarbon potential — to be offered in a specified "
        + "lease sale. Striking the 2024 ROD therefore reopens the withdrawn acreage to leasing. "
        + "Sponsored by Rep. Nicholas J. Begich (R-AK-At Large), introduced 2025-10-10, passed the "
        + "House 217-209 on 2025-11-18 (roll 119/1/295) and the Senate 49-45 on 2025-12-04 (roll "
        + "119/1/632), and became Public Law 119-52 on 2025-12-11.",
      introducedAt: "2025-10-10", status: "enacted",
      sourceUrl: CG(119, "house-joint-resolution", 131),
      sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hjres131-119", publicLaw: "119-52" },
    },
  },
  {
    number: "S.Amdt. 3535", measureType: "amendment", congress: 119, chamber: "senate",
    rolls: [
      // 2025-10-09, 53-43 with a 3/5 threshold — a majority position recorded as a defeat.
      {
        chamber: "senate", session: 1, roll: 563, actionType: "amendment",
        admittedAs: "amendment_exception",
        decisiveWhy:
          "An amendment never receives a passage vote: agreeing to it, or refusing to, IS its "
          + "disposition, and \"On the Amendment\" is the Senate clerk's caption for that single "
          + "act. Runbook rule 12 admits the caption ONLY on an S.Amdt./H.Amdt. measure, which "
          + "this is, and the shape gate is what keeps the caption from admitting anything else. "
          + "There is nothing procedural about the vote: the amendment's whole text is the "
          + "appointment mechanism for two inspectors general, the Senate divided 53-43 on it, and "
          + "the 3/5 threshold means the majority position is on the record as a defeat. Declining "
          + "it would leave the record with no standalone Senate instrument on congressional "
          + "oversight in the 119th Congress at all.",
      },
    ],
    create: {
      // Identity from the chamber's own <amendment_purpose>, per runbook rule 6.
      title:
        "S.Amdt. 3535 (Scott, FL) to S. 2296 — require Presidential appointment and Senate "
        + "confirmation of the Inspector General of the Board of Governors of the Federal Reserve "
        + "System and the Bureau of Consumer Financial Protection",
      shortTitle: "Scott (FL) Amdt. No. 3535 — Fed/CFPB inspector general confirmation",
      summary:
        "Second-degree amendment offered during Senate consideration of the National Defense "
        + "Authorization Act for Fiscal Year 2026: S.Amdt. 3535 to S.Amdt. 3748 to S. 2296. Its "
        + "stated purpose, taken verbatim from the Senate's own <amendment_purpose> field, is \"To "
        + "require Presidential appointment and Senate confirmation of the Inspector General of the "
        + "Board of Governors of the Federal Reserve System and the Bureau of Consumer Financial "
        + "Protection.\" Under current law that inspector general is designated by the Chair of the "
        + "Federal Reserve Board rather than nominated and confirmed, so the amendment would move "
        + "the watchdog of both the Federal Reserve and the CFPB out of agency appointment and into "
        + "the advice-and-consent process. Rejected 53-43 on 2025-10-09 (roll 119/1/563) against a "
        + "3/5 threshold: a majority of senators voting were recorded in favour and the amendment "
        + "still fell. The parent measure S. 2296 passed the Senate on 2025-10-10.",
      introducedAt: "2025-10-09", status: "failed",
      parent: { measureType: "bill", congress: 119, chamber: "senate", number: "S. 2296" },
      sourceUrl: "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00563.htm",
      sourceLabel: "U.S. Senate",
      externalIds: { senateAmendment: "S.Amdt. 3535", parentMeasure: "S. 2296", degree: 2 },
    },
  },
  {
    number: "H.R. 1069", measureType: "bill", congress: 119, chamber: "house",
    rolls: [
      // 2025-12-04, 247-164 (R 214-0, D 33-164), 22 not voting. Already live with 109
      // attributed members out of 411 recorded; re-fetched to reach the full roster.
      { chamber: "house", session: 1, roll: 313, actionType: "passage" },
    ],
    mappingRefused:
      "This measure ships NO issue mappings, and that is the decision rather than an omission. "
      + "db/vr-ingest-runbook.md follow-up 0c refuses it on a vocabulary gap: there is no key for "
      + "foreign influence in domestic institutions. Re-read here under rule 27 and reinforced — "
      + "america_first's scope note now names countering China as OUT, tariffs_china is a tariff "
      + "chip, econ_trade is manufacturing and trade rules, strong_defense is force posture, and "
      + "the education keys read the same yea two ways. Every one of those is written up in "
      + "declinedFacets. The vocabulary question is decided on its own or not at all.",
    mustExist:
      "Live in vr_measures as measure_type 'bill', congress 119, chamber 'house', number "
      + "'H.R. 1069', title 'PROTECT Our Kids Act', with the Congress.gov summary of the "
      + "federal-funding prohibition already written. House roll 119/1/313 is live too, with 109 "
      + "attributed member votes, and this pass re-fetched the Clerk's XML to check them: all 109 "
      + "agree on position AND on the party flag, and the Clerk names no rostered member the "
      + "record is missing. So there is no attribution top-up to make either. The migration "
      + "therefore does not rewrite the title, summary or source and adds no mapping. It corrects "
      + "exactly one field — status reads 'pending' while the bill passed the House 247-164 on "
      + "2025-12-04 and was received in the Senate and referred to the HELP Committee the same "
      + "day, which this record spells 'passed_house' (H.R. 1048 is filed that way for the same "
      + "posture). The correction is stated in the migration and asserted in its verification "
      + "block rather than made silently.",
  },
  // ── The primary wall — two enacted CRA disapprovals whose decisive rolls were
  //    never attributed on the Senate side. NO new mappings; both already mapped.
  {
    number: "H.J.Res. 25", measureType: "resolution", congress: 119, chamber: "house",
    rolls: [
      // 2025-03-11, 292-132 with 1 Present.
      { chamber: "house", session: 1, roll: 71, actionType: "passage" },
      // 2025-03-26, 70-28, 2 absent. "On the Joint Resolution H.J.Res. 25".
      { chamber: "senate", session: 1, roll: 151, actionType: "passage" },
    ],
    mustExist:
      "Live in vr_measures as measure_type 'resolution', congress 119, chamber 'house', number "
      + "'H.J.Res. 25', status 'enacted', external_ids publicLaw 119-5 — and carrying NO ROLL CALL "
      + "AT ALL. An enacted law with no attributed vote is a hole in the record on its face. This "
      + "entry adds NO mapping: gov_regulation w100 PRIMARY and tech_innovation w60 are already "
      + "live on it with written rationales, and they are right. What it adds is the two decisive "
      + "rolls the record was missing, House 119/1/71 and Senate 119/1/151. "
      + "WHY IT IS IN THIS WAVE: adding H.J.Res. 131's gov_regulation w60 secondary row is "
      + "measurably ADVERSE on its own. Before this entry, scripts/vr-federal-fpi.mjs --set all "
      + "reported 76 members whose gov_regulation shape moves thin -> unread with reason id "
      + "`incidental` — \"Not about this issue\". The mechanism is in stance-helpers.js: at three "
      + "non-primary acts a member sits on the thinEnough branch of _recordDirectionIndex, where "
      + "the primary wall is deliberately absent and the run still reads; a fourth non-primary act "
      + "crosses _RD_MIN_JUDGED = 4 onto the deepEnough branch, where out.primary < "
      + "_RD_MIN_PRIMARY returns stop('record_thin', 'no_primary'). Every one of the 76 is a "
      + "SENATOR, and the reason no senator clears the wall is an ATTRIBUTION gap rather than a "
      + "mapping error: gov_regulation's three PRIMARY instruments in the 119th are H.R. 2965 "
      + "(House roll only, correctly — it is a House bill the Senate never voted on), this "
      + "resolution (no roll at all) and S.J.Res. 18 (a SENATE joint resolution carrying only a "
      + "House roll). Fix the attribution and the wall is cleared by a real act rather than by "
      + "lowering anything. The alternative — dropping the H.J.Res. 131 secondary — would be "
      + "tuning a mapping to protect an index number, which runbook rule 25 forbids: the "
      + "instrument's operative mechanism IS a CRA disapproval and the w60 matches the two live "
      + "CRA precedents H.J.Res. 88 and H.J.Res. 89 exactly.",
  },
  {
    number: "S.J.Res. 18", measureType: "resolution", congress: 119, chamber: "senate",
    rolls: [
      // 2025-03-27, 52-48. "On the Joint Resolution S.J.Res. 18".
      { chamber: "senate", session: 1, roll: 153, actionType: "passage" },
    ],
    mustExist:
      "Live in vr_measures as measure_type 'resolution', congress 119, chamber 'senate', number "
      + "'S.J.Res. 18', carrying gov_regulation w100 PRIMARY and econ_corp_account w75 PRIMARY, "
      + "both with written rationales. This entry adds NO mapping. It closes a chamber asymmetry "
      + "that reads as an error the moment it is said aloud: a SENATE joint resolution whose only "
      + "attributed roll in the record is the HOUSE passage vote, House 119/1/96. The Senate "
      + "passed it 52-48 on 2025-03-27 (roll 119/1/153) and it became P.L. 119-10 on 2025-05-09; "
      + "the sponsoring chamber's own decisive vote was simply never ingested. Together with "
      + "H.J.Res. 25's Senate roll this is what gives a senator a gov_regulation PRIMARY act for "
      + "the first time, which is the documented remedy for the primary wall described in the "
      + "H.J.Res. 25 entry above. The migration also corrects exactly one field: status reads "
      + "'pending' while external_ids on the same row already records laws ['Public Law 119-10'] "
      + "and Congress.gov's latest action is 'Became Public Law No: 119-10.' — the row contradicts "
      + "itself, and this record spells that posture 'enacted' (H.J.Res. 25 and H.J.Res. 131 are "
      + "both filed that way). The correction is stated in the migration and asserted in its "
      + "verification block rather than made silently. Nothing else on the measure is rewritten.",
  },
];

// ── Issue facets considered and DECLINED, with the reason ───────────────────
// A declined facet is a finding: it records that the axis was read and rejected, so a
// later pass cannot add it as though nobody had looked.
const DECLINED_FACETS = [
  {
    measure: "H.R. 5408 (119th, Faster Labor Contracts Act)", facet: "econ_smallbiz",
    why:
      "Read and rejected. The bill's obligations fall on any employer whose workforce has just "
      + "certified a representative, small ones included, so there is a real burden argument here — "
      + "but econ_smallbiz's chip is 'Cut the licensing fees, permits and paperwork that fall "
      + "hardest on small businesses', and this bill imposes no fee, no permit and no filing. It "
      + "sets a bargaining timetable. Mapping it would let the same nay be scored both as opposition "
      + "to worker protection and as support for small-business relief, which is two readings of one "
      + "vote — precisely what the doctrine refuses.",
  },
  {
    measure: "H.R. 5408 (119th, Faster Labor Contracts Act)", facet: "econ_growth",
    why:
      "Arguable and still declined. A yea adds a federal mandate on employers, so a nay could be "
      + "read as deregulatory. But econ_growth's chip is 'Roll back federal business regulations and "
      + "keep taxes low to spur hiring and investment', and voting against a NEW mandate is not the "
      + "same act as rolling an existing one back. Declining the axis costs the record nothing: "
      + "econ_workers already carries the whole of what this roll tests, in the direction the floor "
      + "actually divided on.",
  },
  {
    measure: "H.R. 5408 (119th, Faster Labor Contracts Act)", facet: "econ_balance",
    why:
      "Declined. econ_balance is the moderate chip — 'Support business growth but keep worker "
      + "protections, overtime and benefit rules in place' — and it is about PRESERVING existing "
      + "protections. This bill creates a new one. A key whose text describes the status quo cannot "
      + "be scored by a vote to change it.",
  },
  {
    measure: "H.J.Res. 131 (119th, P.L. 119-52)", facet: "climate_action",
    why:
      "Read against the two live CRA precedents and declined. H.J.Res. 88 and H.J.Res. 89 both "
      + "carry climate_action 100 primary yea_opposes, and they earn it: the rules they nullified "
      + "were the Clean Air Act waivers behind California's zero-emission vehicle mandates, so "
      + "greenhouse gases were the whole subject of the regulation being struck. The rule struck "
      + "here is a Record of Decision about which acres of a leasing programme area are available "
      + "for leasing. Emissions appear nowhere in it. Mapping climate_action would score a "
      + "217-209 acreage vote as a vote on climate policy, and it would score it in a direction "
      + "many of the 217 would reject — they would describe the same yea as an Alaska development "
      + "vote. energy_production already carries the fossil-expansion reading honestly and in a "
      + "direction nobody disputes.",
  },
  {
    measure: "H.J.Res. 131 (119th, P.L. 119-52)", facet: "states_federal_power",
    why:
      "No. The Coastal Plain is federal land inside a federal refuge and the ROD is a federal "
      + "agency decision; no state authority is expanded or contracted anywhere in the resolution. "
      + "Alaska's revenue interest in leasing is a motive, not an operative provision.",
  },
  {
    measure: "S.Amdt. 3535 (119th, Scott (FL) Amdt. to S. 2296)", facet: "checks_balances",
    why:
      "Genuinely arguable and declined for a reason worth stating precisely, because the amendment "
      + "moves an appointment in two directions at once. It takes the inspector general of the "
      + "Federal Reserve and the CFPB out of the hands of the Fed Chair — that is the Senate "
      + "gaining a hold on a watchdog it currently has none over, which reads as Congress checking "
      + "the executive. But it does so by making the post PRESIDENTIALLY appointed, and the same "
      + "yea can therefore be read as handing the White House a nomination it does not have today "
      + "over the watchdog of a deliberately independent central bank. checks_balances' chip is "
      + "'Keep Congress and the courts as a real check on executive power, whoever is president', "
      + "and twenty rostered members hold a stance on it, so a wrong direction would misjudge a lot "
      + "of people. congress_oversight and audit_spending both read the amendment in one stable "
      + "direction and are mapped; checks_balances does not and is not.",
  },
  {
    measure: "S.Amdt. 3535 (119th, Scott (FL) Amdt. to S. 2296)", facet: "gov_transparency",
    why:
      "Declined. The chip is 'Force more disclosure, ban member stock trading and toughen ethics "
      + "rules', and this amendment contains no disclosure requirement, no reporting mandate and no "
      + "ethics provision. It changes who appoints an officer. The precedent runs the other way and "
      + "is instructive: H.R. 1048 carries gov_transparency at the PRIMARY because its operative "
      + "text is a set of reporting thresholds. There is no counterpart here.",
  },
  {
    measure: "S.Amdt. 3535 (119th, Scott (FL) Amdt. to S. 2296)", facet: "strong_defense",
    why:
      "Refused on principle, not on the merits. The amendment was offered to the FY2026 NDAA "
      + "because vote-a-rama is where floor time exists, and its text has nothing to do with "
      + "defence. Mapping the vehicle's subject onto an amendment's own vote is the stowaway error "
      + "the runbook's omnibus disclosure rules exist to prevent, and it would score 96 senators on "
      + "defence policy for a vote about an inspector general.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "america_first",
    why:
      "The key a hurried pass reaches for, and the one the vocabulary has just disowned. H.R. 1048 "
      + "(the DETERRENT Act) does carry america_first 70 yea_supports, with a rationale about "
      + "foreign influence on U.S. campuses as a national-security matter — but that row was "
      + "written before August 2026, and alignment-tool.js's scope note for the key now says in "
      + "terms that it was narrowed BECAUSE 'a further seven cards under support were about "
      + "countering China, which the chip never mentioned', and lists 'countering China and "
      + "military posture toward adversaries' in its OUT column. Copying H.R. 1048's row across "
      + "would re-import the exact confusion the narrowing removed. Runbook rule 26 governs: when "
      + "a chip's scope note carves a subject out to another key, the row rests only on what is "
      + "left — and what is left of america_first here is nothing at all.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "tariffs_china",
    why:
      "Proposed by keyword evidence and refused. tariffs_china is 'Use tariffs to counter China "
      + "and unfair trade practices and protect American workers', and its own scope note calls it "
      + "a TARIFF chip. This bill levies no duty, sets no rate and touches no import. It conditions "
      + "a domestic education grant.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "econ_trade",
    why:
      "Also proposed by keyword evidence, on the word 'China' alone, and refused for the same kind "
      + "of reason. econ_trade is 'Use tariffs and trade rules to defend American manufacturing'; "
      + "there is no manufacturing, offshoring or supply-chain provision in the bill. This is what "
      + "the drafting bench is for. scripts/vr-mapping-draft.mjs was run on this measure and "
      + "proposed exactly three candidates — econ_trade, strong_defense and tariffs_china — none "
      + "of which a human accepted, and not one of the keys a human would have reached for. That "
      + "is why every candidate it emits carries decision:'UNDECIDED' and null in all three "
      + "judgement fields.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "strong_defense",
    why:
      "The scope note that removed countering-China from america_first hands the subject to "
      + "'strong_defense, tariffs_china', so this is the one candidate with a written claim on it — "
      + "and it is still refused, on rule 22's backwards read. strong_defense is 'Maintain the "
      + "strongest military and stand firm abroad'. A nay on H.R. 1069 cannot honestly be described "
      + "as opposition to that: the 164 nays argued the prohibition was overbroad and would strip "
      + "federal money from schools over a language programme, which is an argument about domestic "
      + "education funding. Neither the bill's operative text nor its opposition is about military "
      + "posture. The subject is real; the key is not the subject.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "edu_balance",
    why:
      "Refused as two-way. edu_balance is 'Fully fund public schools while letting some funding "
      + "follow students to other options'. A yea withholds federal funds from a public school, "
      + "which reads as yea_opposes; the 247 members who voted yea would say they were protecting "
      + "the students in it, which reads the other way. Unlike H.R. 1048 — where the operative act "
      + "is a disclosure threshold and edu_balance sits at a modest 55 behind a clear primary — "
      + "there is no third key here to carry the weight. A two-way direction on a measure's ONLY "
      + "key is the worst case for the index: 411 recorded members scored on a direction half of "
      + "them dispute.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "public_schools",
    why:
      "Refused, and follow-up 0c in db/vr-ingest-runbook.md already refused it in the same words: "
      + "'public_schools is a funding-level chip.' Its chip is 'Raise teacher pay and fund public "
      + "schools and classrooms' — about how much money schools get, not about conditions attached "
      + "to it. Mapping it would put 247 members on the record as voting to defund public schools, "
      + "on a bill whose sponsors describe it as protecting the students in them.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "school_choice",
    why:
      "No. The bill withholds funds from schools meeting a condition; it creates no voucher, no "
      + "education savings account, no charter authority and no mechanism by which a family "
      + "chooses differently.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "gov_transparency",
    why:
      "Refused, and the contrast with H.R. 1048 is the finding rather than an aside. Both bills "
      + "target Chinese government money in American education, and H.R. 1048 is mapped "
      + "gov_transparency 100 PRIMARY — because its operative text is a set of disclosure "
      + "thresholds, a searchable database and reporting obligations. H.R. 1069 has no disclosure "
      + "title at all; its operative act is a funding prohibition. Runbook rule 25: two bills on "
      + "the same subject may honestly carry different key sets, and the difference is the finding.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "free_speech",
    why:
      "Refused, and this is a deliberate departure from the H.R. 1048 precedent, which carries "
      + "free_speech 35 yea_opposes 'recorded neutrally' for the chilling-academic-exchange "
      + "objection. free_speech is 'Protect free speech and limit government and Big Tech "
      + "censorship'. Conditioning a federal K-12 grant on not hosting a foreign government's "
      + "language institute restricts nobody's speech — the school may keep the institute and "
      + "forgo the money. A mapping 'recorded neutrally' is still a mapping that scores people, "
      + "and it is not repeated here.",
  },
  {
    measure: "H.R. 1069 (119th, PROTECT Our Kids Act)", facet: "(net result)",
    why:
      "Nine candidates read, nine refused, measure ships unmapped — the same disposition follow-up "
      + "0c gave it and, under rule 27, re-argued rather than inherited. The gap it rests on is the "
      + "one the runbook named: this vocabulary has no key for foreign influence in domestic "
      + "institutions. It should get one on its own merits, in a pass whose subject IS the "
      + "vocabulary, weighed against the other measures that would fall under it — S. 2296's "
      + "export-control and investment-screening titles, named in follow-up 0d, are the obvious "
      + "second. It must not get one as a side effect of a pass that needed a number to move.",
  },];

// ── Roll calls considered and declined, with the reason ─────────────────────
const DECLINED = [
  {
    number: "H.R. 5408", chamber: "house", congress: 119, session: 2, roll: 215,
    totals: "211-212",
    why:
      "On Motion to Recommit, failed, immediately before the passage roll 216 this seed carries. "
      + "yeaBlocksMeasure() in netlify/lib/vr-pack.ts treats the bare recommit form as blocking, so "
      + "admitting it would score the same members twice on econ_workers with the direction "
      + "inverted. Runbook rule 8: one decisive vote per chamber per measure.",
  },
  {
    number: "H. Res. 1379 (rule for H.R. 5408)", chamber: "house", congress: 119, session: 2,
    roll: "213-214", totals: "various",
    why:
      "The rule providing for consideration of H.R. 5408, with its previous-question roll. "
      + "'Providing for consideration' resolutions are floor scheduling whipped on party lines and "
      + "are never mapped — scripts/test-mapping-discipline.mjs enforces that mechanically, and a "
      + "member who votes for the rule and against the bill has taken one position on the bill, not "
      + "two.",
  },
  {
    number: "H.R. 6644 (housing supply)", chamber: "senate", congress: 119, session: 2,
    roll: "44, 45, 52, 53, 175, 180, 182", totals: "89-10 on passage (roll 53)",
    why:
      "The finding this pass most wants to admit and does not. housing_build is vehicle_only for "
      + "both Utah senators, H.R. 6644 is the record's only standalone housing-supply instrument, "
      + "and its Senate rolls are missing — so admitting roll 119/2/53 would close a blocked row "
      + "outright. It is declined because the vote was 89-10. The runbook's near-unanimity rule is "
      + "not a formality: a roll where 90 percent of the chamber votes the same way tells the index "
      + "almost nothing about the 89, and reading a pattern out of it would be reading a pattern "
      + "out of consensus. Rule 11 does allow near-unanimity to be reassessed RELATIVE to the key "
      + "being scored, and that door is open here in principle — the ten nays are the whole "
      + "universe of senators willing to break a housing-supply consensus. It is not walked through "
      + "in this pass, because doing it to close a row this pass is measured on is the definition of "
      + "a lowered floor. What would admit it: a separate, argued rule-11 reversal written into the "
      + "runbook and into a reversals block, on its own merits, not as a means to a number. The "
      + "other six rolls (motions to proceed, two cloture motions, and the motion to concur in the "
      + "House amendment) are procedural or duplicative in any case.",
  },
  {
    number: "S.Amdt. 2126 (Sanders, $17 minimum wage)", chamber: "senate", congress: 119,
    session: 1, roll: 184, totals: "47-52",
    why:
      "Contested, on the exact subject econ_workers describes, in the exact chamber where "
      + "econ_workers is still blocked for both Utah senators — and refused, because it is not an "
      + "act. The amendment was offered to H.Con.Res. 14, the FY2025 budget resolution, and its "
      + "stated purpose is 'To make sure the Senate can increase the Federal minimum wage to $17 an "
      + "hour': a reserve-fund/point-of-order device that creates no authority, appropriates "
      + "nothing and changes no law. A budget resolution is not presented to the President. Scoring "
      + "it would tell a reader that 47 senators voted to raise the minimum wage when what they "
      + "voted for was permission to consider raising it later. Three sibling rolls are declined "
      + "with it on identical grounds — 175 (Alsobrooks Amdt. 1466), 183 (Kim Amdt. 1644) and 186 "
      + "(Baldwin Amdt. 1693), all 'To establish a deficit-neutral reserve fund relating to…' — as "
      + "is roll 65 in the S.Con.Res. 7 vote-a-rama. This is written up as a new numbered rule in "
      + "db/vr-ingest-runbook.md so the next pass does not have to rediscover it.",
  },
  {
    number: "Senate nominations (class decline)", chamber: "senate", congress: 119, session: 1,
    roll: "35, 59, 111, 119, 121, 303, 380, 469, 483, 486 and their cloture pairs",
    totals: "various",
    why:
      "Ten confirmation rolls touching Labor, Housing and Urban Development, the Small Business "
      + "Administration and the Federal Housing Finance Agency turned up in the scan for the "
      + "still-blocked keys, and the whole class is declined. 'On the Nomination' is not in the "
      + "decisive set and should not be: a vote on a person is a vote about that person's fitness "
      + "and the President's prerogative, not about the policy the agency will make, and the "
      + "record already models the executive lane separately (the formal index's own exec_lane "
      + "reason id exists for this). The paired 'On the Cloture Motion' rolls are procedural twice "
      + "over.",
  },
  {
    number: "H.R. 6398 RED Tape Act", chamber: "house", congress: 119, session: 2, roll: 118,
    totals: "On Passage, passed",
    why:
      "Verified from the Clerk's own 2026 index and deliberately left for a later pass. It is a "
      + "clean standalone econ_smallbiz/gov_regulation instrument and the record should have it. It "
      + "is not admitted HERE because it closes no row this wave is aimed at: econ_smallbiz is "
      + "blocked for cstewart, curtis and lee — cstewart does not serve in the 119th, and curtis "
      + "and lee are senators, so a 2026 House roll reaches none of the three. Admitting it would "
      + "be coverage for its own sake. Roll number recorded so that pass starts from a verified "
      + "fact. Its recommit roll 117 would be declined alongside it.",
  },
  {
    number: "H.R. 1069", chamber: "house", congress: 119, session: 1, roll: "311, 312",
    totals: "various",
    why:
      "The rolls immediately preceding H.R. 1069's passage belong to H.R. 4305 (DUMP Red Tape Act) "
      + "and H.R. 2965 (Small Business Regulatory Reduction Act), both already in the record, and "
      + "are listed here only to record that the neighbourhood was read rather than assumed. "
      + "H.R. 1069's own passage roll 313 is the single decisive vote on it in either chamber; the "
      + "Senate referred the bill to the HELP Committee without a vote.",
  },
];

// ── What was scanned, so a gap is a finding and not an assumption ───────────
const SCAN_COVERAGE =
  "Candidate selection ran backwards from a measurement rather than forwards from a bill list. "
  + "scripts/vr-federal-fpi.mjs --set utah --why was run first; it returned 27 unread formal-index "
  + "rows over the seven rostered Utah federal members, spanning ten issue keys, every one of them "
  + "with reason id `vehicle_only`. Ranked by how many members each key blocks: congress_oversight "
  + "5, econ_workers 5, scotus_reform 4, econ_smallbiz 3, then free_speech, health_rural, "
  + "housing_build and lands_energy at 2 each. Instruments were then looked for IN THE CHAMBERS' "
  + "OWN INDEXES, not from recall: senate.gov's vote_menu_119_1.xml and vote_menu_119_2.xml (890 "
  + "rows) and clerk.house.gov's ROLL_000 through ROLL_800 pages for 2025 and 2026 (645 rows), "
  + "filtered on the vocabulary of each blocked key. Findings, stated as findings: the 119th "
  + "Congress's floor record contains NO standalone instrument on Supreme Court ethics or term "
  + "limits (scotus_reform), none on rural hospital or maternity-care funding (health_rural), and "
  + "none on government or platform censorship (free_speech) in either chamber — those three rows "
  + "cannot be closed by better selection and are reported as blocked on the corpus, not on this "
  + "pass. housing_build has exactly one instrument, H.R. 6644, whose Senate passage roll is "
  + "89-10 and is declined on near-unanimity. econ_smallbiz has House instruments only (H.R. 6398 "
  + "among them) and its three blocked members are two senators and a member who does not serve in "
  + "the 119th. That leaves congress_oversight, econ_workers and lands_energy as the keys a "
  + "standalone contested instrument can actually reach, and the three new measures here are those "
  + "instruments, chosen for the chamber their blocked members sit in. The full roll neighbourhood "
  + "of each admitted measure was read: H.R. 5408's rule and recommit rolls (119/2/213-215), "
  + "H.J.Res. 131's House and Senate histories, S.Amdt. 3535's place in the S. 2296 vote-a-rama, "
  + "and H.R. 1069's neighbours 311 and 312. Every roll in those histories is admitted here, "
  + "already in the record, or in declinedRollCalls with a reason.";

// ── The enacted-law tier ────────────────────────────────────────────────────
const ENACTED_LAW_FINDING =
  "Exactly one of the four is law: H.J.Res. 131 became Public Law 119-52 on 2025-12-11 and is "
  + "filed status 'enacted' with publicLaw in external_ids. The other three are not, and each is "
  + "filed at the tier its own record supports. H.R. 5408 passed the House 230-193 on 2026-06-09 "
  + "and was received in the Senate on 2026-06-10 with no further action: status 'passed_house'. "
  + "H.R. 1069 passed the House 247-164 on 2025-12-04 and was received in the Senate and referred "
  + "to the HELP Committee the same day: also 'passed_house', which is a CORRECTION — the live row "
  + "reads 'pending'. S.Amdt. 3535 was rejected 53-43 against a 3/5 threshold: status 'failed'. "
  + "That last tier is load-bearing rather than cosmetic. A rejected amendment is still a real, "
  + "fully attributed position for all 96 senators who voted on it, and it is the only standalone "
  + "Senate instrument on congressional oversight in the 119th — but describing it as an enacted "
  + "requirement would be false, and 53 senators voting yes did not make it law.";

// ── Margin caveats: where a roll's own arithmetic limits what it can test ───
const PRIMARY_WALL_FINDING =
  "A depth pass can make a member's record read WORSE, and this one did before it was finished. "
  + "H.J.Res. 131 carries a gov_regulation w60 secondary — correct on the merits and identical in "
  + "weight to the two live CRA precedents H.J.Res. 88 and 89. Adding it gave 76 senators a FOURTH "
  + "non-primary gov_regulation act, and four is exactly where _recordDirectionIndex in "
  + "stance-helpers.js changes branch: _RD_MIN_JUDGED = 4 moves the member off the thinEnough "
  + "branch, whose comment says in the source that the primary wall is DELIBERATELY not on it, and "
  + "onto the deepEnough branch, where out.primary < _RD_MIN_PRIMARY stops the read with "
  + "'record_thin'/'no_primary'. The formal pattern index then prints the row as unread with reason "
  + "`incidental` — \"Not about this issue\" — for a member who has voted the same way four times on "
  + "four CRA disapprovals. The engine is not wrong: deep, one-sided and entirely incidental is a "
  + "fair description of four secondaries and no primary, and it is a truer sentence than a "
  + "confident direction would have been. The wall is a floor, so the fix is never to lower it and "
  + "never to weaken the mapping that tripped it. The fix is a PRIMARY act, and the census of the "
  + "key showed the Senate had been denied one by attribution alone: H.J.Res. 25 was enacted as "
  + "P.L. 119-5 with no roll call in the record at all, and S.J.Res. 18 — a Senate joint resolution "
  + "— had only its House passage roll. Both are already mapped gov_regulation w100 PRIMARY. "
  + "Attributing three rolls the chambers had published all along is what clears the wall, and it "
  + "clears it upward.";

const MARGIN_CAVEATS = [
  {
    roll: "house 119/2/216 (H.R. 5408)",
    caveat:
      "230-193 with 5 not voting, and the party split is inverted from the chamber's usual "
      + "pattern: Democrats 210-0 in favour, Republicans 20-192 against, one Independent nay. The "
      + "twenty Republican yeas are the highest-information votes on this roll — a party-line roll "
      + "separates the parties well and separates members within a party poorly, so the crossovers "
      + "carry most of what distinguishes people, which is exactly what the isParty flag records. "
      + "The bill died in the Senate, so this roll is the whole of its recorded history.",
  },
  {
    roll: "house 119/1/295 and senate 119/1/632 (H.J.Res. 131)",
    caveat:
      "217-209 and 49-45. Both are close and both are near-party-line — House Republicans 214-1, "
      + "House Democrats 3-208 — which is what makes a CRA disapproval useful evidence: nobody can "
      + "claim the chamber was unanimous, and the handful of crossovers in each direction are "
      + "identified individually. The Senate roll records 94 of 100 senators; six absences are "
      + "recorded as such and are not read as either position.",
  },
  {
    roll: "senate 119/1/563 (S.Amdt. 3535)",
    caveat:
      "53-43 with a 3/5 majority required, so the amendment was REJECTED while a majority of "
      + "senators voting supported it. Nothing about that weakens the roll as evidence of where "
      + "each senator stood — it is a recorded, contested, 96-senator division on a single "
      + "sentence of text — but the result field reads 'rejected' and the required_majority field "
      + "reads 'three_fifths', and a reader who sees 53 yeas beside 'rejected' should find the "
      + "threshold there rather than assume an error.",
  },
  {
    roll: "house 119/1/313 (H.R. 1069)",
    caveat:
      "247-164 with 22 not voting. Republicans 214-0; Democrats 33-164. Stated precisely because "
      + "it is the strongest argument FOR eventually mapping this measure, and the argument does "
      + "not win here: a unanimous Republican column separates nobody on the majority side, while "
      + "a caucus splitting 33-164 separates 197 people on the minority side, which is a lot of "
      + "information going unused. It stays unused, because the only thing worse than an unread "
      + "roll is a roll read on the wrong axis. See declinedFacets — nine candidates, nine "
      + "refusals — and the vocabulary gap in db/vr-ingest-runbook.md follow-up 0c."
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

// ── The decisive gate, mirrored from scripts/test-vr-vote-seed.mjs ──────────
// DECISIVE is the caption set for a bill. PASSAGE_FORMS adds the Senate's spelling for a
// joint resolution, gated on the measure shape. EXCEPTIONS is the rule-12 door: a caption
// admitted for ONE measure shape and only with a written decisiveWhy. The builder applies
// the same three tests the test harness will, so a roll that would fail review is dropped
// here rather than shipped and caught later.
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const PASSAGE_FORMS = [
  { name: "joint resolution", question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i },
];
const EXCEPTIONS = [
  { name: "amendment", question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: "discharge", question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];
// Returns null when the roll may be admitted, or a string saying why it may not.
function gate(question, number, roll) {
  if (DECISIVE.test(question)) return null;
  if (PASSAGE_FORMS.some((p) => p.question.test(question) && p.number.test(number))) return null;
  const ex = EXCEPTIONS.find((e) => e.question.test(question) && e.number.test(number));
  if (!ex) return `question "${question}" is not an admitted decisive form for ${number}`;
  const why = roll.decisiveWhy;
  if (typeof why !== "string" || why.trim().length < 24) {
    return `admitted under the ${ex.name} exception but the selection carries no decisiveWhy`;
  }
  return null;
}

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
// "H.R. 5408" → "H R 5408"; "H.J.Res. 131" → "H J RES 131". The Clerk replaces periods
// with spaces and upper-cases. Verification keys on legis-num, NEVER on vote-desc.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel, measure, roll) {
  const year = houseYear(sel.congress, roll.session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll.roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${roll.roll} (${sel.number})`;

  const legis = clean(tag(xml, "legis-num"));
  if (legis.toUpperCase() !== houseCitation(sel.number)) {
    notes.push(`DROPPED ${at}: legis-num "${legis}" is not ${sel.number}`);
    return null;
  }
  const question = clean(tag(xml, "vote-question"));
  const bad = gate(question, sel.number, roll);
  if (bad) {
    notes.push(`DROPPED ${at}: ${bad}`);
    return null;
  }

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;
  if (+yyyy !== year) {
    notes.push(`DROPPED ${at}: action-date year ${yyyy} does not match session ${roll.session}`);
    return null;
  }

  // The Clerk emits one <totals-by-vote> per party plus a grand total; the grand total is
  // the LAST one, so a match on the first would report a single party's tally as the
  // chamber's. Take the final block.
  const tvAll = [...xml.matchAll(/<totals-by-vote>([\s\S]*?)<\/totals-by-vote>/g)].map((m) => m[1]);
  const tv = tvAll.length ? tvAll[tvAll.length - 1] : "";
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
  if (totals.yea + totals.nay > all.length) {
    notes.push(`DROPPED ${at}: totals ${totals.yea}-${totals.nay} exceed the ${all.length} recorded votes`);
    return null;
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
    chamber: "house", congress: sel.congress, session: roll.session, rollNumber: roll.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType: roll.actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: roll.admittedAs || "decisive", decisiveWhy: roll.decisiveWhy || null,
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
// ambiguous. Rubio is carried by the landmark and fiscal builders for the January 2025
// rolls and is kept here for symmetry; he had long since been confirmed Secretary of
// State before the earliest Senate roll in this pass (563, 2025-10-09) and appears on
// neither of them.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", name: "Marco Rubio" }];
const senateLookup = [];
for (const r of [...senateRoster, ...SENATE_ALUMNI]) {
  if (!senateLookup.some((x) => x.bioguide === r.bioguide)) senateLookup.push(r);
}

async function fetchSenate(sel, measure, roll, verify) {
  const congress = sel.congress;
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${roll.session}/vote_${congress}_${roll.session}_${String(roll.roll).padStart(5, "0")}`;
  const xml = await get(`${base}.xml`);
  const at = `senate ${congress}/${roll.session}/${roll.roll} (${sel.number})`;

  const bad = verify ? verify(xml) : null;
  if (bad) {
    notes.push(`DROPPED ${at}: ${bad}`);
    return null;
  }
  const question = clean(tag(xml, "vote_question_text") || tag(xml, "question"));
  const gated = gate(question, sel.number, roll);
  if (gated) {
    notes.push(`DROPPED ${at}: ${gated}`);
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
    chamber: "senate", congress, session: roll.session, rollNumber: roll.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote_title")),
    actionType: roll.actionType,
    result: /passed/i.test(rr) ? "passed" : /agreed/i.test(rr) ? "agreed_to"
      : /defeated|rejected/i.test(rr) ? "rejected" : "failed",
    requiredMajority: req === "3/5" ? "three_fifths" : req === "2/3" ? "two_thirds" : "simple",
    admittedAs: roll.admittedAs || "decisive", decisiveWhy: roll.decisiveWhy || null,
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

// The Senate's document check, in two shapes. For a bill or joint resolution
// <document_type> and <document_number> are both filled and the citation can be
// reassembled and compared whole. For an AMENDMENT roll the Senate leaves
// <document_number> empty and puts the citation in <amendment_number> instead, so
// checking document_number would silently pass anything. The amendment form therefore
// compares amendment_number AND asserts the parent the selection claims, which is what
// rules out roll 563 having been an amendment to some other bill.
const senateDocCheck = (cite) => (xml) => {
  const doc = tag(xml, "document") || "";
  const dt = clean(tag(doc, "document_type"));
  const dn = clean(tag(doc, "document_number"));
  const cited = `${dt.endsWith(".") ? dt : dt + "."} ${dn}`.replace(/\s+/g, " ").trim();
  return cited === cite ? null : `document "${cited}" is not ${cite}`;
};
const senateAmdtCheck = (cite, parentNumber) => (xml) => {
  const amd = tag(xml, "amendment") || "";
  const num = clean(tag(amd, "amendment_number"));
  if (num !== cite) return `amendment_number "${num}" is not ${cite}`;
  const parent = clean(tag(amd, "amendment_to_document_number"));
  if (parent !== parentNumber) return `amendment is to "${parent}", not ${parentNumber}`;
  const purpose = clean(tag(amd, "amendment_purpose"));
  if (!purpose || /^no statement of purpose/i.test(purpose)) {
    return "amendment carries no stated purpose, so its identity cannot be verified from the chamber's own record";
  }
  return null;
};

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: (sel.create && sel.create.parent) || null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
    ...(sel.positions ? { positions: sel.positions } : {}),
  };
  let got = 0;
  for (const r of sel.rolls) {
    const verify = sel.measureType === "amendment"
      ? senateAmdtCheck(sel.number, (sel.create.parent || {}).number)
      : senateDocCheck(sel.number);
    const v = r.chamber === "house"
      ? await fetchHouse(sel, measure, r)
      : await fetchSenate(sel, measure, r, verify);
    if (v) { votes.push(v); got++; }
  }
  if (got !== sel.rolls.length) {
    notes.push(`!! ${sel.number} contributed ${got} of ${sel.rolls.length} rolls — a selection did not verify`);
  }
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the 119th Congress's standalone instruments on three issue keys the formal "
    + "pattern index could not read for Utah's federal delegation: the Faster Labor Contracts Act "
    + "(H.R. 5408, House-passed, not law), the Congressional Review Act disapproval of the Bureau "
    + "of Land Management's ANWR Coastal Plain leasing Record of Decision (H.J.Res. 131, P.L. "
    + "119-52), the Scott (FL) amendment requiring Senate confirmation of the Federal Reserve and "
    + "CFPB inspector general (S.Amdt. 3535, rejected 53-43 under a 3/5 threshold) and the PROTECT "
    + "Our Kids Act (H.R. 1069, House-passed, already attributed and previously unmapped). Built by "
    + "scripts/vr-build-federal-depth-vote-seed.mjs from clerk.house.gov/evs and senate.gov "
    + "roll_call_votes XML. The pass exists because scripts/vr-federal-fpi.mjs --why reported 27 "
    + "unread formal-index rows across the seven rostered Utah federal members, every one of them "
    + "with reason id `vehicle_only` — the member had met the issue only inside a package. The "
    + "answer to vehicle_only is a standalone contested instrument in the chamber the member sits "
    + "in, which is why one of these is a Senate amendment and not a fourth House bill. Each "
    + "selection is re-verified against the chamber's own citation fields before inclusion: "
    + "legis-num plus question for the House, document_type/document_number plus question for a "
    + "Senate bill or joint resolution, and amendment_number plus amendment_to_document_number plus "
    + "a non-empty amendment_purpose for a Senate amendment roll. House verification deliberately "
    + "ignores vote-desc, and the House grand total is read from the LAST totals-by-vote block "
    + "because the Clerk emits one per party first. The decisive gate mirrors "
    + "scripts/test-vr-vote-seed.mjs exactly, including rule 12's shape-gated amendment exception, "
    + "so a roll that would fail review is dropped at build time. memberVotes is already filtered "
    + "to db/vr-member-map.json; unmapped members are counted in rosterSkipped, ambiguous Senate "
    + "surname matches in rosterAmbiguous, and neither is ever guessed. isParty is computed from "
    + "the full chamber tally, and totals is the full chamber tally, not the roster subset.",
  builtBy: "scripts/vr-build-federal-depth-vote-seed.mjs",
  issueKeys: [
    "econ_workers", "lands_energy", "lands_preserve", "energy_production", "gov_regulation",
    "congress_oversight", "audit_spending",
    // Not newly mapped — already live on H.J.Res. 25 / S.J.Res. 18 and reached for the
    // first time by attributing those two measures' missing decisive rolls.
    "tech_innovation", "econ_corp_account",
  ],
  primaryWallFinding: PRIMARY_WALL_FINDING,
  measuresDeliberatelyUnmapped: ["H.R. 1069 (119th) — see declinedFacets and mappingRefused"],
  congresses: [119],
  parents: ["S. 2296 (119th, senate) — parent of S.Amdt. 3535"],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  marginCaveats: MARGIN_CAVEATS,
  declinedFacets: DECLINED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-federal-depth-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected = SELECTIONS.reduce((n, s) => n + s.rolls.length, 0);
for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure        margin     req          attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(14)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(12)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 40)}`
  );
}
if (votes.length !== expected) {
  console.error(`\n! ${expected - votes.length} of ${expected} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
