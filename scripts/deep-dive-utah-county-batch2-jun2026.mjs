#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah County deep dive, BATCH 2 (June 2026)
//
// A DELIBERATELY SCOPED continuation of the Utah County accountability pass
// (see deep-dive-utah-county-batch1-jun2026.mjs and
// scripts/UTAH-COUNTY-CONTROVERSY-TRACKER.md). The unit is the FIGHT, not the
// politician. Batch 1 built the data-center/water, Utah City spending, county
// property-tax, and UVU/Kirk clusters. Batch 2 builds the next tier of
// high-attention controversies the tracker flagged as "next batch":
//
//   • ALPINE SCHOOL DISTRICT SPLIT — the dissolution of Utah's largest school
//     district into three new districts (Aspen Peaks, Lake Mountain/"West",
//     Timpanogos), and the contested money decisions made by the SITTING Alpine
//     board on the way out: an Aug 5, 2025 property-tax increase passed 5-2, and
//     a unanimous $238M lease-revenue bond (Apr 2025) for new schools in
//     Saratoga Springs and Eagle Mountain. The board dissolves in July 2027.
//   • SARATOGA SPRINGS GROWTH-DRIVEN TAX — Mayor Chris Carn's April 2026
//     proposal for the city's first property-tax increase since 2008, to close a
//     public-safety (police/fire) funding gap. This resolves the Batch 1 "honest
//     gap": Batch 1 tracked the Saratoga fight but found no attributable
//     individual stance; Carn is now on record.
//
// This batch is COMPLEMENTARY to existing records:
//   • The LEGISLATIVE side of the Alpine split is partly covered already
//     (keith_grover). Rep. Brady Brammer (brady_brammer) ALSO already has a
//     profile, so he is ENRICHED here (HB3003, the 2024 bill that blocked the
//     board's own split and routed it through the cities' interlocal measures) —
//     NOT duplicated. Every other entry is a CREATE.
//   • A roster audit of index.html confirmed stacy_bateman, sarah_beeson,
//     ada_wilson, and chris_carn do NOT already exist.
//
// HONEST GAPS (tracked, NOT built — no fabrication):
//   • Emily Peterson — the second Aug-2025 tax-hike dissenter. Her NO vote is a
//     recorded fact, but no coverage quotes her individual reasoning, so no
//     stand-alone profile is built. She is named in the tracker as a dissenter.
//   • The other two (unnamed) Aug-2025 "yes" votes are not individually
//     identified in the sourcing and are NOT invented.
//
// CURRENT-STATUS VERIFICATION (research-confirmed June 2026; primary/local sourcing):
//   • stacy_bateman  — Alpine School District Board VICE PRESIDENT; voted YES on
//                      the Aug 5, 2025 tax increase and was its lead public
//                      defender. Nonpartisan office; board dissolves Jul 2027. → CREATE
//   • sarah_beeson   — Alpine School District Board; voted NO on the Aug 5, 2025
//                      tax increase (fiscal-restraint dissent), but joined the
//                      unanimous $238M bond. Nonpartisan.                        → CREATE
//   • ada_wilson     — Alpine School District Board; voted YES on the tax
//                      increase while framing it around a "$22 million deficit"
//                      and demanding cost cuts. Nonpartisan.                     → CREATE
//   • chris_carn     — Mayor of Saratoga Springs (took office Jan 2026,
//                      nonpartisan); proposing the city's first property-tax
//                      increase since 2008 for public safety.                    → CREATE
//   • brady_brammer  — Utah House (R-Highland/Pleasant Grove); chief sponsor of
//                      HB3003 (2024 special session).                            → ENRICH
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt is primary/local where possible (Daily
//     Herald, KSL, Lehi Free Press, KUER, Salt Lake Tribune, Deseret News,
//     Fox13, KUTV, ABC4, utahcounty.gov).
//   • Individual lens, not party. Vote tallies/outcomes are stated as plain
//     facts (5-2; unanimous). Utah school-board and municipal mayor seats are
//     NONPARTISAN and are marked Nonpartisan.
//   • The Alpine tax figure is reported HONESTLY in both forms: the county
//     Truth-in-Taxation notice / headline figure (~11.5%) AND the net effect
//     after the offsetting debt-service decrease (~1.76%, about $28.60/yr on the
//     ~$520k median home). Neither is omitted.
//   • Pledge vs. record is labeled: Carn's tax increase is a PROPOSAL still in
//     the Truth-in-Taxation process (no council vote yet); the board votes are
//     governing actions already taken.
//   • Idempotent & non-destructive: re-fetches each live doc. CREATE only where
//     nothing exists; ENRICH appends spotlight receipts + merges stance keys for
//     brady_brammer without clobbering existing fields.
//
//   node scripts/deep-dive-utah-county-batch2-jun2026.mjs            # dry run
//   node scripts/deep-dive-utah-county-batch2-jun2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-utah-county-batch2-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-30T00:00:00.000Z';

// Shared sources (HTTP-verified during research).
const SRC = {
  herald_tax:  { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2025/aug/06/alpine-school-district-approves-property-tax-hike-amid-emerging-dissolution/' },
  ksl_tax:     { label: 'KSL', url: 'https://www.ksl.com/article/51357792/alpine-school-district-adopts-115-property-tax-increase-despite-citizen-dissent' },
  lehi_tax:    { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2025/08/07/asd-approves-1-7-net-property-tax-increase-despite-pushback/' },
  herald_bond: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2025/apr/28/alpine-school-board-oks-238m-bond-to-build-new-schools-in-saratoga-springs-eagle-mountain/' },
  sltrib_split:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2024/11/07/alpine-school-district-likely/' },
  kuer_boards: { label: 'KUER', url: 'https://www.kuer.org/education/2025-11-28/with-3-new-boards-sworn-in-the-work-to-split-the-alpine-district-is-just-beginning' },
  herald_hb3003:{ label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/jun/20/legislature-passes-bill-to-prevent-local-school-boards-from-initiating-school-redistricting/' },
  sltrib_hb3003:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/education/2024/06/21/why-alpine-school-districts/' },
  lehi_saratoga:{ label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/04/13/saratoga-springs-to-ask-for-property-tax-increase-to-address-public-safety-budget-shortfall/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Stacy Bateman — Alpine School District Board VP (split / tax hike) ══════════
  stacy_bateman: {
    create: true,
    name: 'Stacy Bateman',
    office: '🏛 Alpine School District Board (Vice President)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 52,
    keyIssues: ['Public Schools & Education', 'Property Taxes & County Budget', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Stacy Bateman is vice president of the Alpine School District Board of Education, the elected board governing what is still Utah's largest school district as it dissolves into three new districts (Aspen Peaks, Lake Mountain/\"West,\" and Timpanogos) by July 2027. The Alpine board seat is a nonpartisan office. Bateman became the board's most visible defender of the contested money decisions made on the way out — an Aug. 5, 2025 property-tax increase and a $238 million bond — arguing both were needed to set the three successor districts on stable footing.",
    acctSummary: "The board vice president who publicly led the case for raising taxes during the split, voting yes on the Aug. 5, 2025 increase that passed 5-2 over heavy public opposition. She framed it as a one-time chance to hand each new district 'a strong starting position, instead of them needing to raise taxes sharply in two years,' and noted the board 'rarely give[s] what is being asked for.' She also backed the unanimous $238M bond for new schools in the fast-growing west-side cities. Her record is consistent — she owns and defends the votes in her own words — and voters can weigh that case directly.",
    theme: "Alpine's board vice president became the public face of taxing-and-bonding during the district's breakup — voting for the 2025 increase and $238M bond to give the three new districts, in her words, 'a strong starting position.'",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Voted for the Aug. 2025 Alpine tax increase and led its public defense",
        facts: "Bateman voted yes on the August 5, 2025 property-tax increase, which the Alpine board passed 5-2 after nearly two hours of public comment that ran heavily against it. The county Truth-in-Taxation notice showed about an 11.5% increase, but the board's mechanics — raising the capital levy while cutting the debt-service levy — netted roughly 1.76%, about $28.60 a year on the district's ~$520,000 median home. As vice president she argued the timing was a rare opportunity to fund the coming split.",
        why: "Her signature recorded action on the district's most contested fiscal decision — owned and defended, not deflected.",
        source: SRC.lehi_tax },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'public_schools',
        headline: "Framed the increase as a 'strong starting position' for the new districts",
        facts: "Bateman said the increase would give each new board 'a strong starting position, instead of them needing to raise taxes sharply in two years,' and that the board 'rarely give[s] what is being asked for.' District leaders described the goal as building a reserve — likened by the business administrator to 'saving for a down payment' — that would follow the three new districts after the 2027 split.",
        why: "Her own rationale for the vote, stated plainly — the case she asks taxpayers to judge her on.",
        source: SRC.herald_tax },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Backed the unanimous $238M bond for new west-side schools",
        facts: "In April 2025 the Alpine board voted unanimously to issue $238 million in lease-revenue bonds — enabled by the 2025 Legislature's SB 188 — to build a new high school in Saratoga Springs and a new elementary in Eagle Mountain (plus 83 acres of land) for the future West District. The board said the lease-revenue structure added no new tax impact because Alpine had already raised property taxes in 2023 and 2024.",
        why: "A major capital commitment, made for the fastest-growing corner of the district just before it splits away, that the successor district will inherit.",
        source: SRC.herald_bond },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Governs the dissolution of Utah's largest school district",
        facts: "Bateman sits on the board steering the breakup of Alpine — Utah's largest district at 84,000+ students — after Utah County voters approved the split in November 2024 (Prop 11 / Aspen Peaks ~57.6%; Prop 14 / Lake Mountain ~60%; Timpanogos created automatically). The board must divide assets, debt, and boundaries before dissolving in July 2027.",
        why: "Context for why the 2025 money votes carry unusual weight: the board is provisioning three districts at once while winding itself down.",
        source: SRC.sltrib_split },
    ],
    stances: {
      'Public Schools & Education': "As board vice president, leads the case that the Alpine split must be funded now — through the 2025 tax increase and the $238M bond — to set the three successor districts on stable footing.",
      'Property Taxes & County Budget': "Voted for the Aug. 2025 property-tax increase (passed 5-2; ~11.5% on the county notice, ~1.76% net / about $28.60 on the median home), calling it a rare chance to spare new districts a sharper hike later.",
      'Growth, Housing & Land Use': "Backed the unanimous $238M bond to build new schools in fast-growing Saratoga Springs and Eagle Mountain.",
      'Local Government Transparency & Accountability': "Defends the contested votes in her own words rather than deflecting, while critics question the pace of Alpine's repeated increases.",
    },
    stanceCards: [
      { topic: 'Alpine Split Tax Hike', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Voted yes on the Aug. 2025 Alpine tax increase (passed 5-2) and led its defense — the county notice showed ~11.5%, but the net effect after a debt-service cut was ~1.76%, about $28.60/yr on the median home.", source: SRC.lehi_tax },
      { topic: 'Funding the Split', icon: '🏫', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Argued the increase gives each new district 'a strong starting position, instead of them needing to raise taxes sharply in two years.'", source: SRC.herald_tax },
      { topic: '$238M School Bond', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Backed the unanimous $238M lease-revenue bond (SB 188) for a new high school in Saratoga Springs and an elementary in Eagle Mountain; the board said it added no new tax.", source: SRC.herald_bond },
      { topic: 'Dissolving Alpine', icon: '🗳', pos: 'mixed', issueKey: 'public_schools', issueStance: 'mixed', text: "Sits on the board dividing Utah's largest district (84,000+ students) into three by July 2027 after voters approved the split in Nov. 2024.", source: SRC.sltrib_split },
    ],
  },

  // ══════════ Sarah Beeson — Alpine School District Board (tax-hike dissenter) ══════════
  sarah_beeson: {
    create: true,
    name: 'Sarah Beeson',
    office: '🏛 Alpine School District Board',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 63,
    keyIssues: ['Public Schools & Education', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability', 'Growth, Housing & Land Use'],
    bio: "Sarah Beeson is a member of the Alpine School District Board of Education, the nonpartisan board overseeing the dissolution of Utah's largest school district into three new districts by July 2027. Beeson became one of the two recorded dissenters on the board's Aug. 5, 2025 property-tax increase, arguing the district could prepare for the split 'within our current means' and that future districts should be left to make their own tax choices.",
    acctSummary: "A board member whose words and votes line up: she voted no on the Aug. 5, 2025 tax increase (one of two dissenters in a 5-2 vote), publicly arguing that 'raising taxes shouldn't be a routine — it should be a last resort,' that Alpine already sat at the 20 funding-qualification increments the state asks for, and that the three new districts should 'decide what's best for their own communities.' She did, however, join the board's unanimous $238M bond — a nuance kept on the record rather than smoothed over.",
    theme: "The Alpine board member who voted no on the 2025 tax hike during the split — 'raising taxes shouldn't be a routine, it should be a last resort' — arguing the new districts should set their own course.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Cast a recorded NO vote on the Aug. 2025 Alpine tax increase",
        facts: "Beeson was one of two board members to vote against the August 5, 2025 property-tax increase, which passed 5-2. She said, 'I believe that we can prepare for this transition responsibly by living within our current means,' and argued the board should 'allow these future districts to decide what's best for their own communities and for their own future' rather than raising taxes on their behalf before the split.",
        why: "A clear, on-record dissent with a stated principle — fiscal restraint and deference to the successor districts — that voters can hold her to.",
        source: SRC.herald_tax },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_waste',
        headline: "Argued a tax increase should be 'a last resort,' not 'a routine'",
        facts: "Explaining her opposition, Beeson said, 'Raising taxes shouldn't be a routine. It should be a last resort,' and noted the district was 'already at the 20 increments the state asks districts to maintain to qualify for full guaranteed funding' — pushing back on the rationale that the increase was needed to protect state funding.",
        why: "Ties her vote to a concrete, checkable claim about the district's funding status rather than to generic anti-tax rhetoric.",
        source: SRC.lehi_tax },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Joined the unanimous $238M bond for new west-side schools",
        facts: "Despite dissenting on the tax increase, Beeson was part of the board's unanimous April 2025 vote to issue $238 million in lease-revenue bonds for a new high school in Saratoga Springs and an elementary in Eagle Mountain. The board said the structure added no new tax impact because Alpine had already raised taxes in 2023 and 2024.",
        why: "Records the distinction honestly: her restraint was specific to a new tax increase, not to capital investment for growth that carried no new levy.",
        source: SRC.herald_bond },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Serves on the board winding down Utah's largest district",
        facts: "Beeson sits on the Alpine board steering the dissolution of an 84,000+-student district into three new ones (Aspen Peaks, Lake Mountain, Timpanogos) after Utah County voters approved the split in November 2024. Residents repeatedly criticized the pace of Alpine's tax increases — one noting the board had voted to raise taxes multiple times in recent years — context that framed her dissent.",
        why: "Establishes the high-stakes, high-scrutiny setting in which her fiscal-restraint position was taken.",
        source: SRC.sltrib_split },
    ],
    stances: {
      'Public Schools & Education': "Supports respecting the voters' 2024 split decision but argues the existing Alpine board should not lock in new taxes for districts that don't yet exist — leaving those choices to the successor boards.",
      'Property Taxes & County Budget': "Voted no on the Aug. 2025 increase, calling a tax hike a 'last resort,' not a 'routine,' and saying the district could fund the transition 'within our current means.'",
      'Local Government Transparency & Accountability': "Pressed back publicly on the district's stated funding rationale, citing the 20-increment threshold the district already met.",
      'Growth, Housing & Land Use': "Joined the unanimous $238M bond for new schools in Saratoga Springs and Eagle Mountain, distinguishing growth-driven construction (no new tax) from a general tax increase.",
    },
    stanceCards: [
      { topic: 'Alpine Split Tax Hike', icon: '🏡', pos: 'oppose', issueKey: 'property_tax', issueStance: 'oppose', text: "One of two NO votes on the Aug. 2025 Alpine tax increase (5-2): 'we can prepare for this transition responsibly by living within our current means.'", source: SRC.herald_tax },
      { topic: 'Taxes as Last Resort', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: "'Raising taxes shouldn't be a routine. It should be a last resort' — noted Alpine already met the 20 increments needed for full state funding.", source: SRC.lehi_tax },
      { topic: 'Defer to New Districts', icon: '🏫', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Argued the board should 'allow these future districts to decide what's best for their own communities' rather than raise taxes for them before the split.", source: SRC.herald_tax },
      { topic: '$238M School Bond', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Joined the board's unanimous $238M bond for new Saratoga Springs / Eagle Mountain schools — a no-new-tax capital vote, distinct from the tax increase she opposed.", source: SRC.herald_bond },
    ],
  },

  // ══════════ Ada Wilson — Alpine School District Board (yes vote, fiscal framing) ══════════
  ada_wilson: {
    create: true,
    name: 'Ada Wilson',
    office: '🏛 Alpine School District Board',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 54,
    keyIssues: ['Public Schools & Education', 'Property Taxes & County Budget', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Ada Wilson is a member of the Alpine School District Board of Education, the nonpartisan board governing Utah's largest district through its split into three new districts by July 2027. Wilson voted for the board's Aug. 5, 2025 property-tax increase, but framed her support around a budget gap — 'We have a $22 million deficit' — and an insistence that the district also cut costs, giving her a more conditional posture than a straightforward yes.",
    acctSummary: "A board member who voted yes on the Aug. 5, 2025 tax increase (passed 5-2) but coupled that vote with blunt pressure to economize — 'We need to cut costs. We must cut costs,' citing a '$22 million deficit.' She also backed the unanimous $238M bond, describing it as a 'self bond … we're not raising taxes with this LRB bond.' Her record pairs a willingness to raise revenue with public demands for restraint — a mix voters can weigh against how the new districts actually spend.",
    theme: "An Alpine board member who voted for the 2025 tax increase while warning 'we must cut costs,' citing a '$22 million deficit' — backing both new revenue and a no-new-tax $238M bond as the district splits.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Voted for the 2025 tax increase while citing a '$22 million deficit'",
        facts: "Wilson voted yes on the August 5, 2025 property-tax increase, which passed 5-2. She justified it by pointing to the district's finances — 'We have a $22 million deficit' — and the cost of standing up three new districts at once. The county notice listed about an 11.5% increase; the net effect after an offsetting debt-service cut was roughly 1.76%, about $28.60 a year on the median home.",
        why: "Documents the fiscal case she gave for a contested yes vote, tied to a specific figure voters can track.",
        source: SRC.lehi_tax },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_waste',
        headline: "Paired her yes vote with a demand to cut costs",
        facts: "Even in supporting the increase, Wilson pressed the district to economize: 'We need to cut costs. We must cut costs.' The framing set an expectation that the new revenue come alongside spending discipline rather than instead of it.",
        why: "A yes-but-restrain posture that gives a concrete standard to hold her and the successor districts to.",
        source: SRC.lehi_tax },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'housing_build',
        headline: "Backed the $238M bond as a 'self bond' with no new tax",
        facts: "Wilson supported the board's unanimous April 2025 vote for $238 million in lease-revenue bonds to build a new high school in Saratoga Springs and an elementary in Eagle Mountain, describing it as a 'self bond, meaning that we're not raising taxes with this LRB bond.' The bonds were enabled by the 2025 Legislature's SB 188.",
        why: "Her own characterization of how the district financed growth-driven construction without a new levy — a claim the successor districts' books will test.",
        source: SRC.herald_bond },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Serves on the board dividing Utah's largest district in three",
        facts: "Wilson sits on the Alpine board overseeing the split of an 84,000+-student district into Aspen Peaks, Lake Mountain, and Timpanogos by July 2027, following Utah County voters' approval in November 2024. The board's task is to divide assets, debt, and boundaries before it dissolves.",
        why: "Context for why her money votes — and her cost-cutting demands — carry weight across three future districts.",
        source: SRC.kuer_boards },
    ],
    stances: {
      'Public Schools & Education': "Supports funding the Alpine split now but publicly insists the district pair new revenue with cost-cutting as it provisions three successor districts.",
      'Property Taxes & County Budget': "Voted for the Aug. 2025 tax increase, citing a '$22 million deficit,' while demanding 'we must cut costs.'",
      'Growth, Housing & Land Use': "Backed the unanimous $238M bond for new Saratoga Springs and Eagle Mountain schools, calling it a no-new-tax 'self bond.'",
      'Local Government Transparency & Accountability': "Frames her support conditionally on spending discipline rather than treating revenue as the only lever.",
    },
    stanceCards: [
      { topic: 'Alpine Split Tax Hike', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Voted yes on the Aug. 2025 tax increase (5-2), citing 'a $22 million deficit'; county notice ~11.5%, net ~1.76% / about $28.60 on the median home.", source: SRC.lehi_tax },
      { topic: 'Cut Costs Too', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: "Paired her yes vote with a demand for restraint: 'We need to cut costs. We must cut costs.'", source: SRC.lehi_tax },
      { topic: '$238M School Bond', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Backed the unanimous $238M bond for new west-side schools as a 'self bond … we're not raising taxes with this LRB bond.'", source: SRC.herald_bond },
      { topic: 'Dissolving Alpine', icon: '🗳', pos: 'mixed', issueKey: 'public_schools', issueStance: 'mixed', text: "Sits on the board dividing Utah's largest district (84,000+ students) into three by July 2027 after the Nov. 2024 vote.", source: SRC.kuer_boards },
    ],
  },

  // ══════════ Chris Carn — Mayor, Saratoga Springs (growth-driven public-safety tax) ══════════
  chris_carn: {
    create: true,
    name: 'Chris Carn',
    office: '🏛 Saratoga Springs (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Property Taxes & County Budget', 'Public Safety', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Chris Carn is the mayor of Saratoga Springs, one of Utah County's fastest-growing cities on the west side of Utah Lake. Sworn in in January 2026 (the mayor's office is nonpartisan), Carn's first major fiscal test is a proposal for the city's first property-tax increase since 2008 — about $3.1 million, roughly $200 a year per household — to close a widening gap between public-safety costs and revenue as the city's population climbs.",
    acctSummary: "A new mayor making the case, in his own name, for Saratoga Springs' first property-tax increase since 2008 — about $200 a year per household — to fund police and fire as growth outpaces revenue. The city says property taxes once covered ~56% of public-safety costs and now cover ~42%, with the increase restoring roughly 52%; the money would help staff a new fire station opening in 2028. Carn has tied the ask to transparency and resident input — 'As we continue to grow, this is a conversation worth having together' — and the proposal is still moving through the Truth-in-Taxation process, with no council vote yet.",
    theme: "Saratoga Springs' new mayor is asking residents to approve the city's first property-tax increase since 2008 — about $200 a year — to keep police and fire funded as one of Utah County's fastest-growing cities outgrows its budget.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Proposing Saratoga Springs' first property-tax increase since 2008",
        facts: "In April 2026, Carn's city began the Truth-in-Taxation process for a proposed $3.1 million property-tax increase — about $200 a year per household — its first since 2008, a year in which the city has also twice lowered the rate. The city portion is only about 12% of a resident's total property-tax bill (the school district takes ~71%, Utah County ~11%, the water district ~5%).",
        why: "The defining fiscal decision of his early tenure, and one he is putting his name to rather than leaving to staff.",
        source: SRC.lehi_saratoga },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'back_police',
        headline: "Frames the increase as closing a public-safety funding gap",
        facts: "The city says property taxes covered about 56% of public-safety costs after the 2008 increase but have slipped to roughly 42%, and that the proposed increase would restore coverage to about 52%. The revenue targets police and fire staffing — including new EMS personnel and firefighters — and helps staff a new fire station planned to open in 2028 to improve response times in the central and eastern parts of the city.",
        why: "Establishes the concrete service rationale behind the ask, with figures residents can weigh.",
        source: SRC.lehi_saratoga },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Tied the tax ask to transparency and resident input",
        facts: "Announcing the proposal, Carn wrote, 'As we continue to grow, this is a conversation worth having together,' and stressed being 'transparent about where your tax dollars go.' Rather than adopting the increase outright, the city entered the state's Truth-in-Taxation process, which requires public notices and hearings before any vote.",
        why: "How he is choosing to make the case — openly and before a vote — which voters can judge against how the process actually plays out.",
        source: SRC.lehi_saratoga },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "A growth-driven budget squeeze in a fast-expanding city",
        facts: "Saratoga Springs' tax question is a direct product of rapid growth: a city that held its property-tax rate flat (and cut it twice) since 2008 now says population-driven public-safety demand has outrun that revenue. The proposal — still a proposal, not an adopted increase — sits at the intersection of the city's growth and its first tax hike in 18 years.",
        why: "Honest framing that the increase is a pledge/proposal in process, not yet a record, and that growth is the underlying driver.",
        source: SRC.lehi_saratoga },
    ],
    stances: {
      'Property Taxes & County Budget': "Proposing Saratoga Springs' first property-tax increase since 2008 — about $3.1M, ~$200/household/year — and making the case for it publicly while it moves through Truth-in-Taxation.",
      'Public Safety': "Frames the increase as closing a public-safety funding gap (property taxes covering ~42% of public-safety costs, down from ~56%), funding police, fire, and a new 2028 fire station.",
      'Growth, Housing & Land Use': "Ties the budget squeeze to the city's rapid growth, which he says has outrun a tax rate held flat or cut since 2008.",
      'Local Government Transparency & Accountability': "Pledges transparency on 'where your tax dollars go' and is using the Truth-in-Taxation process rather than an outright adoption.",
    },
    stanceCards: [
      { topic: 'First Tax Hike Since 2008', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Proposing Saratoga Springs' first property-tax increase since 2008 — ~$3.1M, about $200/household/yr — still in the Truth-in-Taxation process (no council vote yet). City keeps only ~12% of a tax bill.", source: SRC.lehi_saratoga },
      { topic: 'Public-Safety Funding', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Frames the increase as restoring public-safety funding (property taxes covering ~42% of those costs, down from ~56%, up to ~52%), staffing police, fire, and a new 2028 fire station.", source: SRC.lehi_saratoga },
      { topic: 'Transparency on the Ask', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "'As we continue to grow, this is a conversation worth having together' — pledged transparency on where tax dollars go and used Truth-in-Taxation rather than adopting outright.", source: SRC.lehi_saratoga },
      { topic: 'Growth-Driven Budget', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Ties the squeeze to rapid growth outrunning a tax rate held flat (and cut twice) since 2008 — a proposal still in process, not yet a record.", source: SRC.lehi_saratoga },
    ],
  },

  // ══════════ Brady Brammer — Utah House (ENRICH: HB3003 / Alpine split) ══════════
  // brady_brammer ALREADY EXISTS. This is a non-destructive ENRICHMENT: it appends
  // two Alpine-split spotlight receipts and merges two stance keys; it never
  // clobbers his existing record (redistricting standards, social-media liability,
  // regulatory reform, etc.). The framing follows his stated intent: HB3003 was a
  // ballot-clarity/procedure bill, not a pro- or anti-split stance.
  brady_brammer: {
    enrich: true,
    name: 'Brady Brammer',
    addSpotlight: [
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions', 'Public Statements'], issueKey: 'public_schools',
        headline: "Chief-sponsored HB3003, which blocked Alpine's board from initiating its own split",
        facts: "In the June 2024 special session, Brammer was chief sponsor of HB3003 ('School District Amendments'), which removed a local school board's ability to initiate the process of dividing a district — applied retroactively, blocking the Alpine board's own split proposal and leaving the cities' interlocal ballot measures (the future Props 11 and 14) as the path forward. He cast it as a procedure-and-clarity bill, not a position on the split: 'There's a lot of fighting as to whether the split should happen or not. That is not this bill.'",
        why: "A consequential legislative action that shaped how Utah's largest school district was broken up — by which mechanism, and on whose terms, the question reached voters.",
        source: SRC.herald_hb3003 },
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'public_schools',
        headline: "Framed HB3003 as preventing 'confusion on the ballot'",
        facts: "Brammer said HB3003 was meant to avoid multiple competing split measures landing on the same ballot — 'If there are multiple measures on the ballot and they all pass, what happens? Nobody knows' — by letting the first-submitted (interlocal) proposal proceed. Lawmakers described the change as temporary, pending a statewide prioritization system.",
        why: "His own rationale for steering the split through the cities' measures rather than the district's, in a fight that reorganized schooling for 84,000+ students.",
        source: SRC.sltrib_hb3003 },
    ],
    addStances: {
      'Public Schools & Education': "Chief-sponsored HB3003 (2024 special session), which barred local school boards from initiating a district split — routing the Alpine breakup through the cities' interlocal measures; he framed it as a ballot-clarity procedure, not a pro/anti-split stance.",
    },
    stanceCards: [
      { topic: 'Alpine Split (HB3003)', icon: '🏫', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Chief-sponsored HB3003 (2024), blocking Alpine's board from initiating its own split so the cities' interlocal measures (Props 11/14) decided it. Called it a clarity bill: 'That is not this bill' on whether to split.", source: SRC.herald_hb3003 },
    ],
  },
};

// ── Firestore value encode/decode ────────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields, { mask = true } = {}) {
  const qs = mask ? '?' + Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : '';
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build a full document body for a brand-new sitting-official profile.
function buildNewDoc(plan) {
  const fields = {
    name: plan.name,
    office: plan.office,
    party: plan.party,
    state: plan.state,
    icon: plan.icon,
    bio: plan.bio,
    keyIssues: plan.keyIssues,
    promises: [],
    stances: plan.stances,
    spotlight: plan.spotlight,
    spotlightTheme: plan.theme,
    accountability: { overallScore: plan.score, summary: plan.acctSummary, kept: 0, broken: 0, pending: 0 },
    kept: 0, broken: 0, pending: 0,
    score: plan.score,
    tier: tierForScore(plan.score),
    profileStatus: 'full',
    candidacyStatus: plan.candidacyStatus,
    updatedAt: STAMP,
  };
  if (plan.nextElection) fields.nextElection = plan.nextElection;
  return fields;
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Utah County sitting officials · Batch 2 (June 2026) ───────────────────────');
  out.push('    // Continuation of the scoped Utah County pass: the Alpine School District split');
  out.push('    // and its contested money votes — the Aug 2025 tax increase (Bateman for, Beeson');
  out.push('    // against, Wilson for-with-conditions) and the unanimous $238M bond — plus Saratoga');
  out.push('    // Springs Mayor Chris Carn\'s first-since-2008 public-safety property-tax proposal.');
  out.push('    // (Brady Brammer\'s HB3003 cards are appended to his existing array, not here.)');
  for (const [id, plan] of Object.entries(DATA)) {
    if (plan.enrich) continue; // brammer cards are added to his existing array by hand
    if (!plan.create || !plan.stanceCards || !plan.stanceCards.length) continue;
    out.push(`    ${id}: [ // ${plan.name} — ${plan.office}`);
    for (const c of plan.stanceCards) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Utah County deep dive (batch 2: Alpine split + Saratoga Springs)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.spotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
      for (const it of (plan.addSpotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown addSpotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/utah-county-batch2-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, enriched = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    // ── ENRICH path (brady_brammer): append spotlight receipts + merge stances ──
    if (plan.enrich) {
      if (!doc) { console.log(`  ⚠ ${id} (${plan.name}): expected to exist for enrichment but not found — skipping`); continue; }
      const existingSpot = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      const haveHeadlines = new Set(existingSpot.map((s) => s && s.headline));
      const toAdd = (plan.addSpotlight || []).filter((s) => !haveHeadlines.has(s.headline));
      const mergedStances = { ...(doc.stances || {}) };
      let stanceAdds = 0;
      for (const [k, v] of Object.entries(plan.addStances || {})) if (!(k in mergedStances)) { mergedStances[k] = v; stanceAdds++; }
      totSpot += toAdd.length; totStance += stanceAdds;
      console.log(`  ${APPLY ? '✎' : '→'} ENRICH ${id} (${plan.name}) · +${toAdd.length} receipt(s), +${stanceAdds} stance(s) [non-destructive]`);
      if (APPLY && (toAdd.length || stanceAdds)) {
        await patch(id, { spotlight: existingSpot.concat(toAdd), stances: mergedStances, updatedAt: STAMP });
      }
      enriched++;
      continue;
    }

    // ── CREATE path ──
    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this batch CREATEs new officials only)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created, ${enriched} enriched (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
