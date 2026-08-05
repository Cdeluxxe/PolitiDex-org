#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Secure America Act vote seed (S. 2 → Public Law 119-98)
// ---------------------------------------------------------------------------
// Builds db/vr-secure-america-vote-seed.json from the two chambers' OWN roll-call XML:
// clerk.house.gov/evs/2026/roll214.xml and senate.gov's
// roll_call_votes/vote1192/vote_119_2_00<NNN>.xml. Nothing is typed in from a news
// account or a secondary tracker; every roll is re-verified against the chamber's own
// citation fields before it is admitted, and a selection that fails verification is
// DROPPED with a note rather than corrected by hand.
//
// This pass discharges a debt the previous one recorded. db/vr-landmark-vote-seed.json
// lists senate 119/2/163 in declinedRollCalls with the reason "deliberately deferred, not
// missed … Mapping it needs a reading of the enacted text on the scale this pass gave the
// NDAA". That reading is now done, against the enrolled text
// (govinfo BILLS-119s2enr) rather than against a summary, and it is what fixes the axes
// below.
//
//   S. 2 → P.L. 119-98  Secure America Act (signed 2026-06-10)
//          A reconciliation bill under title II of S. Con. Res. 33, reported as an
//          original measure by Senator Graham for the Committee on the Budget on
//          2026-05-20. Passed the Senate 52-47 on 2026-06-05 after a 28-roll vote-a-rama
//          (rolls 136-163) and the House 214-212 on 2026-06-09. Seven operative sections
//          across two titles, appropriating $69.545 billion:
//            Title I  (Homeland Security & Governmental Affairs)
//              Sec. 101  $9.550B  Border Patrol agents and support personnel
//              Sec. 102  $7.450B  Homeland Security Investigations, of which $108.5M for
//                                 child-exploitation investigators and forensics analysts
//              Sec. 103  $3.450B  border security, technology and screening
//              Sec. 104  $2.500B  additional DHS, for the purposes of the title
//            Title II (Judiciary)
//              Sec. 201 $13.020B  CBP, "in order to carry out immigration enforcement"
//              Sec. 202 $31.075B  ICE enforcement and removal operations, nine purposes
//              Sec. 203  $2.500B  additional DHS
//
// THE TITLE I / TITLE II SPLIT IS NOT COSMETIC and it is the trap this seed exists to
// avoid. Every Title I appropriation carries an express carve-out — Secs. 101, 102 and
// 103(a)(6) each fund "functions other than … immigration enforcement and customs"
// functions — because Title I is HSGAC's reconciliation jurisdiction and cannot reach
// immigration enforcement. Title II, the Judiciary Committee's, is where the immigration
// enforcement money lives and says so in terms. A mapping written from the bill's short
// title alone would score all $69.5B as one undifferentiated enforcement vote; a mapping
// written from the enrolled text splits it, which is why tough_on_crime is mapped here at
// all (Sec. 102's $7.45B of explicitly NON-immigration criminal-investigation funding)
// and why it is weighted at 40 rather than alongside the enforcement axes.
//
// Four rolls of thirty-two — 28 Senate, 4 House — are admitted and 28 are declined with
// reasons. The largest declined class is worth stating up front: SEVENTEEN of the Senate's
// S. 2 rolls are captioned "On the Motion S.Amdt. NNNN" and are motions to waive all
// applicable budgetary discipline — Byrd-rule points of order needing SIXTY votes. Seven
// of the seventeen are recorded as "Rejected" while having MORE yeas than nays: rolls 139
// (53-46), 145 (51-47), 151 (50-49), 158 (54-45), 159 (52-47), 161 (53-46) and 162
// (51-48). Reading that caption as a policy verdict would invert the record on seven
// votes and misread the other ten, so the class is excluded as procedure and every roll
// is listed in declinedRollCalls with its tally.
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

const ENR = "https://www.govinfo.gov/content/pkg/BILLS-119s2enr/html/BILLS-119s2enr.htm";
const BILLSTATUS = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s2.xml";
const SEN_ROLL = (roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_${String(roll).padStart(5, "0")}`;

// ── The bill, and the two decisive passage rolls ────────────────────────────
// S. 2 does not exist in the record at all — no measure row, no roll call in either
// chamber's 119/2 range, no issue mapping. So this is a `create`, and the migration's
// insert is SELECT-guarded rather than relying on a unique index vr_measures does not
// have on (congress, number).
const BILL = {
  number: "S. 2", measureType: "bill", congress: 119, chamber: "senate",
  house: [2, 214],
  senate: [2, 163],
  create: {
    title: "Secure America Act",
    shortTitle: "Secure America Act",
    summary:
      "Reconciliation bill under title II of S. Con. Res. 33, official title \"An original bill to "
      + "provide for reconciliation pursuant to title II of S. Con. Res. 33\", reported as an original "
      + "measure to the Senate by Senator Lindsey Graham for the Committee on the Budget on 2026-05-20 "
      + "without written report. Appropriates $69.545 billion to the Department of Homeland Security "
      + "for fiscal year 2026, available until 2029-09-30, across two titles reflecting the two "
      + "committees' reconciliation jurisdictions. Title I (Homeland Security and Governmental "
      + "Affairs): Sec. 101, $9.550B to hire, pay, train and equip Border Patrol agents and support "
      + "personnel, barred after 2028-10-31 from recruiting processing coordinators; Sec. 102, $7.450B "
      + "for Homeland Security Investigations, of which $108,500,000 for child-exploitation "
      + "investigators and forensics analysts at the Victim Identification Laboratory and the Cyber "
      + "Crimes Center; Sec. 103, $3.450B for nonintrusive inspection equipment using artificial "
      + "intelligence and machine learning, Air and Marine platforms, border surveillance technology, "
      + "the biometric entry-exit system under 8 U.S.C. 1365b, and combating drug trafficking "
      + "including fentanyl and its precursor chemicals, with untested autonomous surveillance towers "
      + "excluded; Sec. 104, $2.500B additional DHS. Each Title I appropriation is expressly limited "
      + "to functions OTHER than immigration enforcement and customs functions. Title II (Judiciary): "
      + "Sec. 201, $13.020B for CBP agents and support staff \"in order to carry out immigration "
      + "enforcement activities\"; Sec. 202, $31.075B for ICE across nine purposes — hiring and "
      + "training, removal transportation, information technology including body-worn cameras, "
      + "facility and fleet sustainment, expanding 287(g) agreements with State and local authorities, "
      + "Office of the Principal Legal Advisor attorneys for removal proceedings, operations and "
      + "maintenance, and not less than $350,000,000 for arrests of \"covered unlawful aliens\" "
      + "encountered in jurisdictions that are not \"qualified cooperating jurisdictions\", which those "
      + "funds may not be used to release, parole or place on alternatives to detention; Sec. 203, "
      + "$2.500B additional DHS. Passed the Senate 52-47 on 2026-06-05 (roll 119/2/163) after a "
      + "28-roll vote-a-rama, passed the House 214-212 on 2026-06-09 (roll 119/2/214), signed "
      + "2026-06-10 as Public Law 119-98.",
    introducedAt: "2026-05-20", status: "enacted",
    sourceUrl: ENR, sourceLabel: "GPO — enrolled text of S. 2 (119th)",
    externalIds: { congressGovId: "s2-119", publicLaw: "119-98", billStatus: BILLSTATUS },
  },
};

// ── The two admitted amendment rolls ───────────────────────────────────────
// Five of the Senate's 28 S. 2 rolls are true up-or-down amendment votes (rolls 154, 155,
// 156, 157 and 160); the rest are motions to proceed, motions to commit, or budget-
// discipline waivers. Two of the five are admitted. The test in
// scripts/test-vr-vote-seed.mjs admits "On the Amendment" on an S.Amdt./H.Amdt. measure
// under its `amendment` exception, and requires each such vote to carry its own
// decisiveWhy — so the bar each one has to clear is that its stated purpose is
// single-subject and reads the same way to every senator who voted on it.
//
// The other three failed that bar and are in declinedRollCalls: roll 157 (Padilla, "To
// make appropriations for transparency and accountability") names no object at all, roll
// 155 (Peters, "To rescind unobligated balances under the One Big Beautiful Bill Act")
// names no account or subject, and roll 154 (Hirono, youth mentoring transfer) names no
// offset. congress.gov returns 403 to every client this pass can use, so the amendment
// TEXTS are not obtainable from an official source here, and the purpose line is all
// there is. Mapping an axis from a purpose line that does not state its own scope would
// be the guess the runbook forbids.
const AMENDMENTS = [
  {
    number: "S.Amdt. 5463", congress: 119, session: 2, roll: 160, chamber: "senate",
    amendmentTo: "S.Amdt. 5453", vehicle: "S. 2", actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its stated purpose is single-subject — "
      + "\"To appropriate amounts for local law enforcement hiring programs\" — so a yea carries one "
      + "meaning and only one: money for State and local police staffing. Agreeing to it IS its "
      + "disposition; an amendment never receives a passage vote. Rejected 45-53, so the Secure "
      + "America Act's $69.545 billion went to federal border and immigration enforcement with no "
      + "local law-enforcement hiring line. This is the record's only roll call isolating that "
      + "question, and it splits the chamber the OPPOSITE way from passage — which is precisely what "
      + "makes it worth having.",
    create: {
      title: "Cortez Masto amendment appropriating funds for local law enforcement hiring (S.Amdt. 5463)",
      shortTitle: "Cortez Masto Local Police Hiring Amendment (S.Amdt. 5463)",
      summary:
        "Amendment to S.Amdt. 5453 to S. 2 (Secure America Act) offered by Senator Catherine Cortez "
        + "Masto: \"To appropriate amounts for local law enforcement hiring programs.\" REJECTED 45-53 "
        + "on 2026-06-05, roll call 119/2/160, one of five true amendment votes in the bill's 28-roll "
        + "vote-a-rama. A yea would have added funding for State and local police hiring to a bill "
        + "whose $69.545 billion goes to federal Customs and Border Protection and Immigration and "
        + "Customs Enforcement; a nay left it out. Not enacted.",
      introducedAt: "2026-06-05", status: "failed",
      sourceUrl: `${SEN_ROLL(160)}.htm`, sourceLabel: "U.S. Senate — roll call 119/2/160",
      externalIds: { senateVote: "119-2-160" },
    },
  },
  {
    number: "S.Amdt. 5813", congress: 119, session: 2, roll: 156, chamber: "senate",
    amendmentTo: "S.Amdt. 5453", vehicle: "S. 2", actionType: "amendment",
    decisiveWhy:
      "An amendment roll, admitted as decisive by exception. Its stated purpose is single-subject — "
      + "\"To make funds available for the timely adjudication of DACA renewal applications\" — so a "
      + "yea carries one meaning and only one: money to process renewals under the existing Deferred "
      + "Action for Childhood Arrivals policy. Agreeing to it IS its disposition; an amendment never "
      + "receives a passage vote. Rejected 47-52, so no renewal-adjudication funding is in Public Law "
      + "119-98. This is the record's only roll call isolating DACA from the enforcement bill it was "
      + "offered to.",
    create: {
      title: "Gallego amendment funding timely adjudication of DACA renewal applications (S.Amdt. 5813)",
      shortTitle: "Gallego DACA Renewal Adjudication Amendment (S.Amdt. 5813)",
      summary:
        "Amendment to S.Amdt. 5453 to S. 2 (Secure America Act) offered by Senator Ruben Gallego: "
        + "\"To make funds available for the timely adjudication of DACA renewal applications.\" "
        + "REJECTED 47-52 on 2026-06-05, roll call 119/2/156. A yea would have funded processing of "
        + "renewal applications under the existing Deferred Action for Childhood Arrivals policy, "
        + "whose recipients lose work authorisation and protection from removal when a renewal lapses "
        + "in the backlog; a nay left the bill's $69.545 billion entirely with border and immigration "
        + "enforcement. Not enacted.",
      introducedAt: "2026-06-05", status: "failed",
      sourceUrl: `${SEN_ROLL(156)}.htm`, sourceLabel: "U.S. Senate — roll call 119/2/156",
      externalIds: { senateVote: "119-2-156" },
    },
  },
];

// ── Issue axes deliberately NOT mapped, and why ─────────────────────────────
// Four axes are mapped in db/vr-issue-seed.json — deportations (100, primary),
// border_security (90), immig_fentanyl (50) and tough_on_crime (40) — and six are
// declined below. The user instruction for this pass was to "map the meaningful axes
// rather than forcing everything onto one key … prefer precision over breadth", and the
// enrolled text turns out to make that easy in one direction and hard in the other: S. 2
// is two titles but ONE subject, so the honest answer to "how many axes" is few, not
// many. Each declined axis names the provision that tempted it, so the skip reads as a
// judgement and not as an oversight.
const DECLINED_FACETS = [
  {
    measure: "S. 2 (119th, Secure America Act)",
    facet: "states_federal_power",
    why:
      "Sec. 202 contains both directions of this axis inside one section, so no single "
      + "supportMeaning is honest. Paragraph (6) funds \"expanding, facilitating, and implementing\" "
      + "agreements under section 287(g) of the Immigration and Nationality Act — a voluntary "
      + "State and local opt-in that hands local officers federal immigration authority, which "
      + "reads as ENLARGING the State role. Paragraph (9) then directs not less than $350,000,000 "
      + "specifically at detainer management and arrests of covered unlawful aliens \"encountered in "
      + "jurisdictions that are NOT qualified cooperating jurisdictions\", defined in (9)(B) as those "
      + "without a 287(g) agreement or a filed certification of compliance with 8 U.S.C. 1373 and "
      + "1644, and forbids those funds from being used to release anyone encountered — federal money "
      + "deployed precisely to work around a local non-cooperation policy, which reads as OVERRIDING "
      + "the State role. A yea does both. Left unmapped rather than resolved by picking the half "
      + "that scores more members.",
  },
  {
    measure: "S. 2 (119th, Secure America Act)",
    facet: "privacy_rights",
    why:
      "Sec. 103(a) funds artificial-intelligence and machine-learning inspection systems (paragraph "
      + "1), border surveillance technology upgrades (paragraph 3) and the biometric entry and exit "
      + "system under 8 U.S.C. 1365b (paragraph 4), and Sec. 202(3) funds body-worn cameras. Real "
      + "surveillance capability, and still the wrong axis: the collection is perimeter screening of "
      + "people crossing an international border, not a change to domestic data practice, and the "
      + "section moves the other way where it acts at all — Sec. 103(b) BARS funds from procuring or "
      + "deploying autonomous surveillance towers CBP has not tested and accepted, and body-worn "
      + "cameras cut toward accountability. The enrolled text creates no surveillance authority: it "
      + "contains no FISA provision and no section 702 provision, and 8 U.S.C. 1365b was enacted in "
      + "2004. Mapping it would score the 212 House members who voted no as pro-privacy on a bill "
      + "that expands no domestic collection.",
  },
  {
    measure: "S. 2 (119th, Secure America Act)",
    facet: "national_debt / cut_spending",
    why:
      "$69.545 billion in new budget authority is the largest single fact about this Act, and it is "
      + "still not a fiscal-restraint signal. S. 2 is a reconciliation measure under title II of S. "
      + "Con. Res. 33: its deficit effect is set against that resolution's instructions and against "
      + "offsets that live outside this text, and no CBO score was obtained in this pass. Scoring the "
      + "roll on a spending axis without the score would be an inference, and it would read every yea "
      + "as pro-spending and every nay as fiscally conservative regardless of the reason either was "
      + "given — the same test that kept the FY2026 NDAA off this axis. Left to the appropriations "
      + "rolls, which do test it.",
  },
  {
    measure: "S. 2 (119th, Secure America Act)",
    facet: "back_police",
    why:
      "Sec. 202(6) reimburses State and local agencies through 287(g) agreements and Sec. 102 funds "
      + "training of State and local officers to identify victims of child sexual exploitation, so "
      + "some money does reach local departments. But both are federal immigration and investigative "
      + "programmes that local agencies participate in, not support for general policing, and the "
      + "record already tests this axis directly and in isolation through S.Amdt. 5463 (roll "
      + "119/2/160), where the question was nothing but local law enforcement hiring. Mapping the "
      + "bill too would put the same member on both sides of one key for reasons the two texts do not "
      + "share.",
  },
  {
    measure: "S. 2 (119th, Secure America Act)",
    facet: "gov_transparency",
    why:
      "Tempting only through roll 157, where Senator Padilla's S.Amdt. 5808 was captioned \"To make "
      + "appropriations for transparency and accountability\" and was rejected 46-53. The caption "
      + "names no object — transparency of what, accountable to whom — and the amendment text is not "
      + "retrievable from an official source in this pass. Guessing that it meant ICE oversight would "
      + "be exactly the fabrication the quality bar forbids. The enrolled text itself imposes no "
      + "disclosure or reporting requirement of any kind, so the bill has nothing to map either.",
  },
  {
    measure: "S.Amdt. 5463 (119th, Cortez Masto)",
    facet: "tough_on_crime",
    why:
      "The amendment appropriates money for local law enforcement hiring programmes and does nothing "
      + "else: it creates no offence, changes no penalty and alters no sentence. back_police names its "
      + "entire substance — \"Fund police\" — and carries it alone at weight 100. Adding "
      + "tough_on_crime would double-count one appropriation across two keys, and it would collide "
      + "with the tough_on_crime mapping S. 2 itself carries for Sec. 102's non-immigration criminal "
      + "investigations, putting members on both sides of one key within a single night's voting on "
      + "grounds the two texts do not share.",
  },
  {
    measure: "S.Amdt. 5813 (119th, Gallego)",
    facet: "deportations",
    why:
      "A DACA recipient whose renewal lapses in the backlog loses protection from removal, so funding "
      + "timely adjudication does reduce removals in practice. It is still one step removed from what "
      + "the amendment says: it appropriates processing money and changes no removal standard, no "
      + "detention rule and nobody's removability. This is the same test that kept S.Amdt. 23 (Coons) "
      + "off deportations in the previous pass — an amendment that does not change who is removable is "
      + "not a vote on removals. immigration_reform carries it, in the yea_supports direction.",
  },
];

// ── Roll calls considered and declined, with the reason ─────────────────────
// All 28 Senate rolls on S. 2 (119/2/136-163) and all four House rolls touching it are
// accounted for: four are in this seed, 24 Senate rolls and 3 House rolls are below.
// Totals are the Senate's own vote_menu_119_2.xml tallies and the Clerk's
// <totals-by-vote> blocks, not recollections.
const WAIVERS = [
  [138, "15-84", "Tillis S.Amdt. 5452"],
  [139, "53-46", "Merkley S.Amdt. 5512"],
  [140, "46-53", "Reed S.Amdt. 5514"],
  [142, "46-52", "Hassan S.Amdt. 5535"],
  [143, "49-49", "Warner S.Amdt. 5556"],
  [144, "48-50", "Graham S.Amdt. 5779"],
  [145, "51-47", "Hickenlooper S.Amdt. 5501"],
  [146, "46-53", "Kim S.Amdt. 5545"],
  [148, "45-53", "Sanders S.Amdt. 5451"],
  [149, "46-53", "Baldwin S.Amdt. 5485"],
  [150, "46-53", "Booker S.Amdt. 5803"],
  [151, "50-49", "Lee S.Amdt. 5804"],
  [152, "48-51", "Durbin S.Amdt. 5806"],
  [158, "54-45", "Coons S.Amdt. 5457"],
  [159, "52-47", "Cassidy S.Amdt. 5812"],
  [161, "53-46", "Van Hollen S.Amdt. 5632"],
  [162, "51-48", "Schiff S.Amdt. 5740"],
];
const COMMITS = [[137, "49-50", "Schumer"], [141, "47-50", "Ossoff"], [147, "46-52", "Warnock"], [153, "48-51", "Wyden"]];

const DECLINED = [
  {
    number: "S. 2", chamber: "senate", congress: 119, session: 2, roll: 136,
    totals: "53-46",
    why: "On the Motion to Proceed — floor process, not the substance of the bill. Runbook rule 8.",
  },
  ...COMMITS.map(([roll, totals, who]) => ({
    number: "S. 2", chamber: "senate", congress: 119, session: 2, roll, totals,
    why:
      `On the Motion (${who}'s motion to commit S. 2 to the Committee on the Judiciary with `
      + "instructions), rejected. A recommittal motion is procedure whose yea BLOCKS the measure — "
      + "yeaBlocksMeasure() in netlify/lib/vr-pack.ts matches the bare 'to commit' form and would "
      + "invert it to a 0.25-weight procedural record. Four near-identical minority motions on one "
      + "bill, all rejected on party lines, would add four inverted procedural rows without isolating "
      + "any provision, so none is ingested.",
  })),
  ...WAIVERS.map(([roll, totals, who]) => ({
    number: "S. 2", chamber: "senate", congress: 119, session: 2, roll, totals,
    why:
      `On the Motion to Waive All Applicable Budgetary Discipline Re: ${who}, rejected ${totals}. `
      + "THE THRESHOLD IS SIXTY VOTES, not a majority: this is a motion to waive a Byrd-rule point of "
      + "order under the Congressional Budget Act, so 'Rejected' records that the amendment fell "
      + "short of 60 and not that a majority opposed it. Seven of the seventeen rolls in this class "
      + "had MORE yeas than nays and are all recorded as rejected — 139 (53-46), 145 (51-47), 151 "
      + "(50-49), 158 (54-45), 159 (52-47), 161 (53-46) and 162 (51-48) — and roll 143 was a 49-49 "
      + "tie. Ingesting the class would invert the record on those seven and misstate the other ten. "
      + "Excluded as procedure, which is also what runbook rule 8 already says about "
      + "budget-point-of-order waivers.",
  })),
  {
    number: "S.Amdt. 5763", chamber: "senate", congress: 119, session: 2, roll: 155,
    totals: "46-53",
    why:
      "On the Amendment S.Amdt. 5763 (Peters), \"To rescind unobligated balances under the One Big "
      + "Beautiful Bill Act\", rejected 46-53. A true amendment vote that would clear the exception "
      + "gate, and declined anyway on evidence: the purpose line names no account, no section and no "
      + "subject, so which unobligated balances it reaches is unknown, and congress.gov returns 403 "
      + "to every client available in this pass, so the amendment text cannot be read from an "
      + "official source. Mapping cut_spending from the caption alone would credit 46 senators with a "
      + "fiscal-restraint record and mark 53 as opposing a spending cut, on a vote whose actual "
      + "target is unverified — and if the balances are P.L. 119-21's immigration-enforcement "
      + "accounts, the honest axis is deportations in the opposite direction. Recorded with its "
      + "verified tally so a later pass that can read the text starts from facts.",
  },
  {
    number: "S.Amdt. 5808", chamber: "senate", congress: 119, session: 2, roll: 157,
    totals: "46-53",
    why:
      "On the Amendment S.Amdt. 5808 (Padilla), \"To make appropriations for transparency and "
      + "accountability\", rejected 46-53. A true amendment vote, declined because the caption names "
      + "no object: transparency of what, accountable to whom. In the context of an ICE and CBP "
      + "appropriation the likely subject is enforcement oversight, but 'likely' is a guess, the "
      + "amendment text is not retrievable (congress.gov 403), and gov_transparency in this record is "
      + "the disclosure-and-ethics axis rather than an agency-oversight one. Fail closed.",
  },
  {
    number: "S.Amdt. 5506", chamber: "senate", congress: 119, session: 2, roll: 154,
    totals: "46-53",
    why:
      "On the Amendment S.Amdt. 5506 (Hirono), \"To transfer amounts for youth mentoring programs of "
      + "the Department of Justice\", rejected 46-53. A true amendment vote, declined on two counts: "
      + "it is a TRANSFER and the caption does not say what it transfers FROM, so half the substance "
      + "of the vote is unstated; and no key in the 110-key allow-list names juvenile crime "
      + "prevention — family_support is the child-tax-credit axis and justice_reform is the "
      + "sentencing-and-incarceration axis, so either would be a category error. Left unmapped rather "
      + "than approximated.",
  },
  {
    number: "S. 2", chamber: "house", congress: 119, session: 2, roll: 213,
    totals: "211-215",
    why:
      "On Motion to Commit (Boyle, to the Committee on the Budget), failed 211-215 at 5:10 PM on "
      + "2026-06-09, thirteen minutes before passage. Procedural, and its yea BLOCKS the measure, so "
      + "it would enter as an inverted 0.25-weight record of the same party-line split the passage "
      + "roll captures at full weight. Declined for the same reason the previous pass left the NDAA's "
      + "house 119/1/319 where it was.",
  },
  {
    number: "H.Res. 1345", chamber: "house", congress: 119, session: 2, roll: 210,
    totals: "214-211",
    why:
      "On Ordering the Previous Question on the rule H. Res. 1345. Previous-question motions are "
      + "explicitly outside the decisive set in scripts/test-vr-vote-seed.mjs and say nothing about "
      + "what any of the four measures the rule carried actually does.",
  },
  {
    number: "H.Res. 1345", chamber: "house", congress: 119, session: 2, roll: 211,
    totals: "213-211",
    why:
      "On Agreeing to the Resolution — the rule itself, \"Providing for consideration of the bills "
      + "H.R. 8312, H.R. 8464, and S. 2 and providing for consideration of the resolution H. Res. "
      + "1335\" under a closed rule with one hour of general debate on each. A special rule is floor "
      + "process on four unrelated measures at once, and it is a different measure (H. Res. 1345) from "
      + "S. 2, so a member's vote on it is not a position on the Secure America Act.",
  },
];

// ── What was scanned, so a gap is a finding and not an assumption ───────────
const SCAN_COVERAGE =
  "One named measure, and its COMPLETE floor history in both chambers rather than a search for its "
  + "roll calls. On the Senate side vote_menu_119_2.xml was read end to end: of the session's 218 "
  + "recorded votes, S. 2 occupies exactly rolls 136 through 163, and all 28 are accounted for here "
  + "— 3 in this seed, 25 in declinedRollCalls with their tallies. On the House side rolls 200 "
  + "through 230 of clerk.house.gov/evs/2026 were each fetched and their <legis-num> read, which is "
  + "what establishes that only rolls 213 and 214 are votes on S. 2 and that rolls 210 and 211 are "
  + "the rule H. Res. 1345 that carried it; the BILLSTATUS action list agrees, recording one "
  + "recorded vote in each chamber on the bill itself. The enrolled text (govinfo BILLS-119s2enr) "
  + "was read in full — all seven operative sections — BEFORE any axis was chosen, which is what "
  + "surfaced the Title I \"functions other than immigration enforcement\" carve-outs that the short "
  + "title hides. Nothing in this pass rests on a description field: the Senate rolls are verified "
  + "on amendment_number and amendment_to_document_number, the House roll on <legis-num>.";

const ENACTED_LAW_FINDING =
  "S. 2 is Public Law 119-98, signed 2026-06-10, confirmed from the <laws> block of "
  + "BILLSTATUS-119s2.xml and from two Library of Congress actions dated 2026-06-10 ('Signed by "
  + "President', 'Became Public Law No: 119-98'). Its policy area is Immigration and its short title, "
  + "carried on the enrolled text, is the Secure America Act. One identity trap worth recording: the "
  + "first <title> element in BILLSTATUS-119s2.xml belongs to H. Res. 1345, the House rule, and runs "
  + "to 700 characters about H.R. 8312, H.R. 8464 and H. Res. 1335 — a naive first-match parse "
  + "produces that as the bill's title. The official title as introduced is \"An original bill to "
  + "provide for reconciliation pursuant to title II of S. Con. Res. 33\", and the measure row uses "
  + "the enrolled short title instead, which is what a reader will recognise.";

const MARGIN_CAVEATS = [
  {
    roll: "house 119/2/214 (S. 2)",
    caveat:
      "214-212 with 4 not voting — a two-vote margin, and the most separating roll this record has "
      + "on immigration enforcement. The party split is total: R 214-0 with 3 not voting, D 0-211 "
      + "with 1 not voting, I 0-1. Because not one member crossed, the roll is a perfect party proxy "
      + "on this axis and a weak instrument for distinguishing members WITHIN a party — the four who "
      + "did not vote are the only intra-party variation there is.",
  },
  {
    roll: "senate 119/2/163 (S. 2)",
    caveat:
      "52-47 with 1 absent. Also close, and also near-total party discipline. The Senate rolls that "
      + "actually separate members on this bill are the amendment votes, which is the argument for "
      + "admitting rolls 160 and 156: roll 160 was rejected 45-53 with a PRESENT vote recorded, and "
      + "roll 156's 47-52 does not line up with passage's 52-47.",
  },
  {
    roll: "senate 119/2/160 (S.Amdt. 5463)",
    caveat:
      "Rejected 45-53 with 1 present and 1 absent. The 'present' position is preserved as-is rather "
      + "than being read as a nay: vr_member_votes stores it, and scripts/vr-coverage-report.mjs "
      + "counts only yea and nay toward a rankable pair, so a present vote correctly contributes "
      + "evidence of participation and no directional signal.",
  },
];

// ── XML helpers ─────────────────────────────────────────────────────────────
// Lifted unchanged from scripts/vr-build-landmark-vote-seed.mjs. Kept as a copy rather
// than factored into a shared module on purpose: a builder is the audit trail for the
// migration it feeds, and a later edit to a shared helper would silently change what a
// past seed claims to have parsed.
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

// The standing decisive set from scripts/test-vr-vote-seed.mjs, unmodified. Two forms are
// needed here: "On Passage" (House roll 214), "On Passage of the Bill" (Senate roll 163),
// and "On the Amendment" (Senate rolls 160 and 156, each carrying its own decisiveWhy).
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
// "S. 2" → "S 2". The Clerk replaces periods with spaces.
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

  // <totals-by-party> blocks each carry their OWN <yea-total>, so a first-match parse
  // returns the majority party's sub-total and reports a 214-212 vote as 214-0. The
  // chamber tally lives only in <totals-by-vote>.
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
// Senate writes <last_name>Van Hollen</last_name> and <last_name>Cortez Masto</last_name>,
// so a last-word split yields "Hollen" and "Masto" and both senators silently receive
// nothing. Cortez Masto is the sponsor of one of the two admitted amendments here, so the
// tail-anchored comparison is load-bearing in this pass and not just defensive.
const senateRoster = ROSTER
  .filter((r) => r.chamber === "senate" && r.name && r.state)
  .map((r) => ({ bioguide: r.bioguide, state: r.state, name: r.name }));
const surnameMatches = (rosterName, xmlLast) => {
  const a = String(rosterName).toLowerCase().replace(/\s+(jr|sr|ii|iii|iv)\.?$/, "");
  const b = String(xmlLast).toLowerCase();
  return a === b || a.endsWith(" " + b);
};
// No SENATE_ALUMNI entry is needed for this pass: every roll here is from June 2026 and
// the roster's Senate rows are current as of the 119th's second session. Marco Rubio, the
// alumnus the landmark pass had to carry, left the Senate on 2025-01-20 and is not in any
// of these four roll calls — verified by his absence from the 100 <member> blocks.
const senateLookup = [];
for (const r of senateRoster) {
  if (!senateLookup.some((x) => x.bioguide === r.bioguide)) senateLookup.push(r);
}

async function fetchSenate(number, measure, congress, session, roll, opts) {
  const o = opts || {};
  const base = SEN_ROLL(roll);
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

const senateDocCheck = (cite) => (xml) => {
  const doc = tag(xml, "document") || "";
  const dt = clean(tag(doc, "document_type"));
  const dn = clean(tag(doc, "document_number"));
  const cited = `${dt.endsWith(".") ? dt : dt + "."} ${dn}`.replace(/\s+/g, " ").trim();
  return cited === cite ? null : `document "${cited}" is not ${cite}`;
};

// ── Run ─────────────────────────────────────────────────────────────────────
const billMeasure = {
  measureType: BILL.measureType, congress: BILL.congress, chamber: BILL.chamber, number: BILL.number,
  parent: null, title: BILL.create.title, create: BILL.create,
};
let got = 0;
{
  const v = await fetchSenate(BILL.number, billMeasure, BILL.congress, BILL.senate[0], BILL.senate[1], {
    actionType: "passage", verify: senateDocCheck(BILL.number),
  });
  if (v) { votes.push(v); got++; }
}
{
  const v = await fetchHouse(BILL, billMeasure, BILL.house[0], BILL.house[1], "passage");
  if (v) { votes.push(v); got++; }
}
if (got !== 2) notes.push(`!! ${BILL.number} contributed ${got} of 2 rolls — a selection did not verify`);

for (const a of AMENDMENTS) {
  const measure = {
    measureType: "amendment", congress: a.congress, chamber: a.chamber, number: a.number,
    title: a.create.title, create: a.create,
    // The parent is S. 2, created by this same pass. The migration orders the measure
    // block so the bill's insert runs before either amendment's, and each amendment's
    // parent_id is resolved from that variable rather than re-queried.
    parentNumber: a.vehicle, parentChamber: "senate", parentCongress: a.congress,
    parentCreatedByThisPass: true,
  };
  const v = await fetchSenate(a.number, measure, a.congress, a.session, a.roll, {
    actionType: a.actionType, decisiveWhy: a.decisiveWhy,
    // An amendment vote leaves <document_number> empty and puts the citation in the
    // <amendment> block, so that is what has to be checked — the amendment's own number,
    // the first-degree amendment it modifies, and the vehicle underneath both.
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
    "Roll calls for the Secure America Act — S. 2, 119th Congress, Public Law 119-98, signed "
    + "2026-06-10. Built by scripts/vr-build-secure-america-vote-seed.mjs from clerk.house.gov/evs "
    + "and senate.gov roll_call_votes XML, with the axes chosen from the enrolled text (govinfo "
    + "BILLS-119s2enr) read in full before any mapping was written. Discharges the deferral recorded "
    + "in db/vr-landmark-vote-seed.json, whose declinedRollCalls entry for senate 119/2/163 said the "
    + "bill needed a reading of its text on the scale that pass gave the FY2026 NDAA. Each selection "
    + "is re-verified against the chamber's own citation fields: document_type plus document_number "
    + "and question for the Senate bill roll, amendment_number plus amendment_to_amendment_number "
    + "plus amendment_to_document_number for the two Senate amendment rolls, and <legis-num> plus "
    + "<vote-question> for the House roll. All four measures and their parent link are NEW — S. 2 "
    + "appears nowhere in the record today — so every row here is a create and none re-describes a "
    + "row another migration owns. Four of the bill's 32 roll calls across both chambers are "
    + "admitted and 28 are declined with their verified tallies in declinedRollCalls; the largest "
    + "declined class is the seventeen 'Motion to Waive All Applicable Budgetary Discipline' rolls, "
    + "which need SIXTY votes, so seven of them are recorded as rejected despite having more yeas "
    + "than nays. memberVotes is already filtered to db/vr-member-map.json; unmapped members are "
    + "counted in rosterSkipped, ambiguous Senate surname matches in rosterAmbiguous, and neither is "
    + "ever guessed. isParty is computed from the full chamber tally, and totals is the full chamber "
    + "tally, not the roster subset.",
  builtBy: "scripts/vr-build-secure-america-vote-seed.mjs",
  issueKeys: ["deportations", "border_security", "immig_fentanyl", "tough_on_crime", "back_police", "immigration_reform"],
  congresses: [119],
  parents: ["S. 2"],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  marginCaveats: MARGIN_CAVEATS,
  declinedFacets: DECLINED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-secure-america-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected = 2 + AMENDMENTS.length;
for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes`);
console.log(`${DECLINED.length} roll calls declined, ${DECLINED_FACETS.length} issue axes declined\n`);
console.log("chamber  c/s  roll  measure         margin     req        attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(15)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 46)}`
  );
}
if (votes.length !== expected) {
  console.error(`\n! ${expected - votes.length} of ${expected} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
