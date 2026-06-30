#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Weber County deep dive, BATCH 1 (June 2026)
//
// The first structured accountability pass on Weber County, modeled on the
// successful Davis County county/municipal tier (deep-dive-davis-county-batch2).
// Scope: CURRENT SITTING county & municipal officials only — the people who most
// directly decide the county budget, property-tax rate, growth and local
// services. No 2026 candidates and no former officials are authored here.
//
// A roster audit of the live Firestore `politicians` collection found only ONE
// of the six target officials already had a profile (ryan_arbon, the sheriff —
// and he carried biographical/campaign stances but ZERO documented governing
// receipts). The 2026 nominees (duane_kearsley, jon_beesley) and the FORMER
// Ogden mayor (mwhalen / Mike Caldwell) already exist and are out of scope.
//
// CURRENT-STATUS VERIFICATION (all confirmed serving as of June 2026):
//   • gage_froerer  — Commissioner, Seat A; chairs the 2026 commission. Term
//                     through end of 2026; NOT seeking re-election (Kearsley won
//                     the GOP primary for the open seat).            → CREATE
//   • sharon_bolos  — Commissioner, Seat B; serving since Jan 2023, term through
//                     end of 2026. LOST the June 2026 GOP primary to Jon Beesley
//                     (~55.6%–44.4%); finishing her term.            → CREATE
//   • jim_harvey    — Commissioner, Seat C; vice chair. Re-elected Nov 2024
//                     (56%), term through Jan 2029; NOT on the 2026 ballot. → CREATE
//   • ben_nadolski  — Mayor of Ogden; sworn in Jan 2, 2024, term through Jan
//                     2028 (next election Nov 2027).                 → CREATE
//   • ryan_arbon    — Sheriff since 2019; running unopposed for a 3rd term in
//                     2026. Profile exists.                          → PATCH
//   • ricky_hatch   — Clerk/Auditor since 2010; running unopposed in 2026. → CREATE
//
// For each, this pass builds the same two sourced layers as the Davis model:
//   • Spotlight / Accountability — 3–5 sourced integrity receipts per official
//     (impact: positive = words match actions / principled stand; negative =
//     inconsistency, controversy, or a CONTESTED action; neutral = factual
//     context such as a documented policy decision or external recognition),
//     each carrying a real {label,url} `source` that was fetched and HTTP-200
//     verified during research, plus a one-line spotlight theme.
//   • Issue positions — `stances` (topic → text) grounded in a real vote, budget
//     action, or documented public position, skipping any topic already present.
//
// New profiles are created with a full document body (bio, office, party, key
// issues, accountability read, score/tier) so they read as first-class sitting
// officials — never as broken or 2026 candidates (candidacyStatus is set from
// the verified label vocabulary: 'office' for sitting, 'not_seeking' for the
// retiring chair, 'lost_primary' for the defeated incumbent, 'incumbent' for the
// uncontested re-election). The companion ISSUE_STANCE_DATA block (run with
// --emit) lights up Stance at a Glance, the Alignment Tool and the issue bridge.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt is primary/local where possible (Weber
//     County Commission minutes & budget docs, Ogden City, Utah PMN,
//     Standard-Examiner, KSL, KUER, Governing, docs.house.gov).
//   • Individual lens, not party. Vote tallies/outcomes stated as plain facts.
//   • Balanced where the record supports it: tax increases, a conflict-of-
//     interest episode, a jail in-custody death and a primary loss are all
//     included alongside efficiency wins, no-increase budgets and crime drops.
//   • Campaign-style claims (e.g. "$370k saved", a challenger's "$20M sewer"
//     figure) are explicitly attributed, never stated as audited fact.
//   • Idempotent & non-destructive: re-fetches each live doc, only adds stances
//     not already present, only writes the theme when an editor hasn't set one,
//     never clobbers a profile that already carries impact-tagged drivers, and
//     never overwrites an existing doc's bio/office/score on PATCH.
//
//   node scripts/deep-dive-weber-county-batch1-jun2026.mjs            # dry run
//   node scripts/deep-dive-weber-county-batch1-jun2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-weber-county-batch1-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
// `create:true` builds a full new document; otherwise the doc is PATCHed
// (spotlight added only if it has no impact-tagged drivers yet; stances merged).
const DATA = {
  // ══════════════════ Gage Froerer — Commissioner, Seat A (chair) ══════════════════
  gage_froerer: {
    create: true,
    name: 'Gage Froerer',
    office: '🏛 Weber County Commission, Seat A',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'not_seeking',
    score: 66,
    keyIssues: ['County Budget & Appropriations', 'Property Taxes & Fiscal Policy', 'Growth, Housing & Land Use', 'Government Transparency'],
    bio: "Gage Froerer is a Weber County Commissioner (Seat A) and currently chairs the commission. First elected to the commission in 2018 and re-elected in 2022, his four-year term runs through the end of 2026; he chose not to seek re-election, and Duane Kearsley won the June 2026 Republican primary for the open seat. A longtime Ogden-area real-estate broker, Froerer earlier served in the Utah House of Representatives from 2007 to 2018. On the commission he has focused on the county budget, tax structure, and western Weber County growth.",
    acctSummary: "A commission chair and former state legislator with a substantive fiscal and growth record — he favors funding county services through sales tax rather than property tax and backs aggressive western-county housing — though his family's stake in the Nordic Valley ski-village development drew conflict-of-interest scrutiny that he addressed through disclosure and recusal.",
    theme: "A commission chair who would rather fund county services with sales tax than property tax and pushes hard for western-Weber housing growth — a record that also includes a disclosed-and-recused conflict over the Nordic Valley ski-village land.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: 'Championed a 0.2% county sales-tax increase as an alternative to taxing property owners',
        facts: "In June 2026 the Weber County Commission approved a 0.2% local sales-tax increase — raising the rate in most county cities (including Ogden, Roy, West Haven and North Ogden) from 7.25% to 7.45% effective Oct. 1, projected to raise roughly $8–12 million a year, of which about $2–3 million goes to the county and the rest to 16 local governments by population. Froerer, the commission chair, was a leading voice for it, arguing it spreads cost to out-of-state visitors rather than putting it entirely on local real-property owners.",
        why: "A concrete, checkable fiscal action that reflects Froerer's stated preference for sales over property taxes — though it is still a tax residents pay at the register.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51536635/as-many-cities-mull-property-tax-hikes-weber-county-oks-02-sales-tax-increase' } },
      { impact: 'negative', category: 'redflags', date: '2022', tags: ['Public Behavior', 'Red Flags'], issueKey: 'gov_transparency',
        headline: "His family's stake in the Nordic Valley ski-village land drew conflict-of-interest scrutiny",
        facts: "As the Nordic Valley ski-village development advanced, scrutiny fell on Froerer because a family trust held a 16% stake in Nordic Valley Land Associates, giving him a personal interest of about 3.3%. He filed a written disclosure on Nov. 20, 2022 and recused himself from related commission votes. A retired attorney objected that his involvement created 'the appearance of bias, favoritism and backroom dealing,' while the county attorney said the law required disclosure, not recusal.",
        why: "A sitting commissioner's financial stake in a project before his own board is a documented governance concern, even though he disclosed it and stepped back from the votes.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/business/2022/dec/19/as-nordic-valley-ski-village-plans-edge-ahead-froerers-involvement-scrutinized/' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'housing_build',
        headline: 'Cast the lone vote to advance the 1,400-acre Westbridge Meadows development',
        facts: "On Aug. 5, 2025 the commission voted 2-1 to table the rezone ordinance and development agreement for Westbridge Meadows, a roughly 1,400-acre master-planned community in western Weber County. Froerer was the lone vote to move it forward, calling the proposal 'fairly aggressive' but supporting it as a long-term housing solution; Commissioner Jim Harvey cited density, traffic, water-supply and taxpayer-cost concerns.",
        why: "His dissent documents a consistent pro-growth, pro-housing posture even when colleagues hesitate — a clear, on-the-record stance voters can weigh.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/aug/05/weber-county-commission-tables-ordinance-development-agreement-for-westbridge-meadows-community/' } },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_services',
        headline: 'Defended director compensation and take-home vehicles in 2025 budget amendments',
        facts: "In July 2025 the commission approved amendments to the 2025 operating and capital budget, including a $2 million adjustment from a countywide compensation study and $3.8 million in state grant funding for the Weber County Ice Sheet renovation. Froerer defended executive-compensation adjustments tied to take-home vehicles for division directors, describing the arrangement as a 'passthrough' and a 'trade off' and saying it was in the public's interest for directors to have their vehicles ready for service.",
        why: "Shows how he weighs employee compensation and county operations against cost — useful context on his budget priorities.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/jul/30/weber-county-commission-approves-2025-budget-amendments-presents-county-awards/' } },
    ],
    stances: {
      'Property Taxes & Fiscal Policy': "Prefers funding county services through sales tax rather than property tax — he championed a 0.2% county sales-tax increase (effective Oct. 2026) on the argument that it spreads cost to out-of-state visitors instead of falling entirely on local property owners.",
      'Growth, Housing & Land Use': "Backs aggressive western Weber County residential growth as a long-term housing solution; he cast the lone vote to advance the ~1,400-acre Westbridge Meadows community when colleagues tabled it over density, traffic and water concerns.",
      'County Budget & Appropriations': "Approved the county's roughly $318M 2025 budget and defended director compensation and take-home vehicles as a cost 'trade off,' while urging the public to scrutinize how the budget is built.",
      'Government Transparency & Accountability': "Says he meets transparency duties through financial-interest disclosure and recusal, as he did on the Nordic Valley ski-village development in which a family trust held a stake.",
    },
    stanceCards: [
      { topic: 'Sales Tax Over Property Tax', icon: '💵', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Prefers raising sales tax over property tax, arguing it spreads cost to out-of-state visitors; championed the county's 0.2% sales-tax increase effective Oct. 2026.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51536635/as-many-cities-mull-property-tax-hikes-weber-county-oks-02-sales-tax-increase' } },
      { topic: 'Western-County Growth', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: 'Backs aggressive western Weber County residential development as a long-term housing solution — the lone vote to advance the ~1,400-acre Westbridge Meadows project.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/aug/05/weber-county-commission-tables-ordinance-development-agreement-for-westbridge-meadows-community/' } },
      { topic: 'County Budget', icon: '🏛', pos: 'mixed', issueKey: 'gov_services', issueStance: 'support', text: "Approved the ~$318M 2025 budget and defended director take-home vehicles as a cost 'trade off,' while urging public scrutiny of the budget process.", source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/jul/30/weber-county-commission-approves-2025-budget-amendments-presents-county-awards/' } },
      { topic: 'Disclosure & Recusal', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: 'Says he meets transparency duties via financial-interest disclosure and recusal, as on the Nordic Valley development in which a family trust held a stake.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/business/2022/dec/19/as-nordic-valley-ski-village-plans-edge-ahead-froerers-involvement-scrutinized/' } },
    ],
  },

  // ══════════════════ Sharon Bolos — Commissioner, Seat B ══════════════════
  sharon_bolos: {
    create: true,
    name: 'Sharon Bolos',
    office: '🏛 Weber County Commission, Seat B',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'lost_primary',
    score: 64,
    keyIssues: ['County Budget & Appropriations', 'Property Taxes & Fiscal Policy', 'Growth, Housing & Land Use', 'Government Transparency'],
    bio: "Sharon Bolos is a Weber County Commissioner (Seat B), serving since January 2023; her four-year term runs through the end of 2026. She lost the June 2026 Republican primary for the seat to former Plain City mayor Jon Beesley (about 55.6% to 44.4% in the updated count) and has said she will finish her term. On the commission she has emphasized growth and housing planning, government efficiency, and a pay-as-you-go, debt-free approach to county finances.",
    acctSummary: "A first-term commissioner with a real efficiency record — she brought county public relations in-house and eliminated a redundant department — and a debt-averse, pay-as-you-go approach to capital projects, but she also defended the county's 7.25% property-tax increase and lost her 2026 primary amid criticism that the commission was disconnected from county cities.",
    theme: "A first-term commissioner who cut outside contracts and redundant overhead and favored saving over borrowing for capital projects, but defended the county's 7.25% tax hike and then lost her 2026 primary to a 'taxpayers-first' challenger.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2023', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Backed and defended the county's 7.25% property-tax increase",
        facts: "As one of three commissioners, Bolos supported a 7.25% increase to the county's property-tax portion adopted for the 2024 budget — about $35 a year on an average home and roughly $3.9 million in new revenue, largely for employee pay amid inflation and sheriff's-office vacancies. At the Nov. 28, 2023 truth-in-taxation hearing, where most of the roughly 20 speakers opposed it, she defended the process, noting directors had already found 'over $2M in savings' before the commission proposed the hike.",
        why: "A tax increase over public opposition is a consequential, checkable fiscal vote — she has since campaigned on holding the line with no increase after 2023.",
        source: { label: 'Weber County Commission Minutes, Nov. 28, 2023 (official)', url: 'https://webercountyutah.gov/commission/documents/minutes/min_11282023.pdf' } },
      { impact: 'positive', category: 'voting', date: '2024', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_balance',
        headline: 'Funded a scaled-back jail medical/mental-health wing without borrowing',
        facts: "After Weber voters rejected a $98 million jail bond in November 2023, the commission pursued a smaller medical and mental-health expansion paid for from the capital-projects fund rather than debt; the 2025 budget set aside $1.8 million to design it. Bolos championed the pay-as-you-go approach, contrasting it with new borrowing.",
        why: "Documents a consistent debt-averse, save-first fiscal philosophy carried into a real capital decision.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2024-12-17/weber-countys-2025-budget-has-1-8m-to-design-jail-medical-improvements' } },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Positive Leadership', 'Notable Actions'], issueKey: 'gov_waste',
        headline: 'Brought county PR in-house and eliminated a redundant department',
        facts: "Bolos's signature first-term moves were ending a longstanding out-of-state public-relations contract by bringing PR in-house, and eliminating a county department that duplicated health-department functions — cutting a manager and assistant-manager position and shifting frontline staff and grant money to the health department. Her campaign estimated the changes saved more than $370,000 a year.",
        why: "Concrete restructuring to cut outside contracts and overlap, though the dollar-savings figure is her campaign's own estimate rather than an audited number.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/weber-county-commissioner-sharon-bolos-discusses-time-on-commission-reelection-campaign/' } },
      { impact: 'negative', category: 'rhetoric', date: '2026', tags: ['Public Behavior', 'Rhetoric vs Reality'], issueKey: 'gov_services',
        headline: 'Lost her 2026 primary amid criticism the commission was disconnected from county cities',
        facts: "Bolos lost the June 23, 2026 Republican primary for Seat B to Jon Beesley (about 55.6%–44.4% in the updated count). Her challenger argued the commission was disconnected from the county's cities and faulted growth-related spending — including roughly '$20 million' on sewer infrastructure he said benefited developers — and said decisions were made 'behind closed doors.' Bolos defended her responsiveness and pointed to her work on a countywide housing master plan.",
        why: "The defeat and the critique that drove it are central, checkable facts about how voters judged her tenure; the specific spending figure is the challenger's claim, not an audited county number.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' } },
    ],
    stances: {
      'Property Taxes & Fiscal Policy': "Supported the county's 7.25% property-tax increase in 2023 to fund employee compensation, but favors small, incremental adjustments and has emphasized no further increases since.",
      'County Budget & Appropriations': "Advocates a pay-as-you-go, debt-free model — saving for projects rather than borrowing — as with funding the scaled-back jail medical wing from the capital-projects fund after voters rejected a $98M bond.",
      'Government Transparency & Accountability': "Prioritized cutting outside contracts and redundant positions, bringing county public relations in-house to communicate more directly with residents.",
      'Growth, Housing & Land Use': "Calls growth and housing the county's top challenge and served on a regional (WACOG) housing subcommittee developing a countywide master plan, while supporting an update to the county general plan.",
    },
    stanceCards: [
      { topic: 'Property Taxes', icon: '💵', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Supported the county's 7.25% property-tax increase in 2023 for employee pay, but favors small incremental adjustments and no further increases since.", source: { label: 'Weber County Minutes, Nov. 28, 2023', url: 'https://webercountyutah.gov/commission/documents/minutes/min_11282023.pdf' } },
      { topic: 'Pay-As-You-Go Budgeting', icon: '🏛', pos: 'support', issueKey: 'gov_balance', issueStance: 'support', text: 'Favors saving for capital projects over borrowing — funded the scaled-back jail medical wing from the capital-projects fund after voters rejected a $98M bond.', source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2024-12-17/weber-countys-2025-budget-has-1-8m-to-design-jail-medical-improvements' } },
      { topic: 'Government Efficiency', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Brought county PR in-house and eliminated a department that duplicated health-department functions, citing direct communication with residents.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/weber-county-commissioner-sharon-bolos-discusses-time-on-commission-reelection-campaign/' } },
      { topic: 'Growth & Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: 'Calls growth and housing the county’s top challenge; served on a regional housing subcommittee building a countywide master plan and backs updating the general plan.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/weber-county-commissioner-sharon-bolos-discusses-time-on-commission-reelection-campaign/' } },
    ],
  },

  // ══════════════════ Jim Harvey — Commissioner, Seat C (vice chair) ══════════════════
  jim_harvey: {
    create: true,
    name: 'James "Jim" Harvey',
    office: '🏛 Weber County Commission, Seat C',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    nextElection: '2028-11-07',
    score: 66,
    keyIssues: ['County Budget & Appropriations', 'Property Taxes & Fiscal Policy', 'Growth, Housing & Land Use', 'Government Transparency'],
    bio: "James “Jim” Harvey is a Weber County Commissioner, holding Seat C, and serves as the commission's 2026 vice chair. First elected in 2016 and sworn in January 2017, he won re-election in November 2024 with 56% of the vote, so his current term runs through January 2029; his seat is not on the 2026 ballot. He is the county's longest-serving sitting commissioner and emphasizes housing attainability, diversifying county revenue, and communication and transparency.",
    acctSummary: "The county's longest-serving commissioner, with a substantial fiscal record: he has repeatedly voted to raise property taxes when he judged services required it (a unanimous 4.5% hike in 2021 and a contested 7.25% hike for 2024) while later steering the county toward sales-tax and growth revenue and a no-increase 2026 budget, and he makes communication and transparency a signature theme.",
    theme: "The longest-serving commissioner — willing to raise property taxes when he says services demand it (4.5% in 2021, a contested 7.25% for 2024), now leaning on sales tax and growth instead, with a no-increase 2026 budget and a transparency-first brand.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2023', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: 'Voted for the contested 7.25% property-tax increase for the 2024 budget',
        facts: "Harvey supported the 7.25% Weber County property-tax increase adopted for the 2024 budget — about $35 a year on an average $486,000 home and roughly $3.9 million in new revenue, part of a $348.59 million spending plan — over opposition at the Nov. 2023 truth-in-taxation hearing where one resident called it 'death by cuts.' The county cited no general-operations rate increase since 2016 and a 22% sheriff's-deputy vacancy rate; Harvey said the vote was not 'an easy button.'",
        why: "A tax increase over public backlash is a consequential, checkable vote that defines part of his fiscal record.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2023/nov/30/weber-county-tax-hike-proposal-generates-backlash-death-by-cuts/' } },
      { impact: 'neutral', category: 'voting', date: '2021', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: 'Joined a unanimous 4.5% property-tax increase for libraries and flood control',
        facts: "In December 2021 Harvey voted with a unanimous commission for a 4.5% property-tax increase effective 2022, generating about $2.16 million a year — roughly $1.16 million for the five-branch county library system and about $1 million for flood-control upgrades — adding just under $20 a year on a $366,000 home. He noted the commission had rebalanced the tax stream in 2019, slightly lowering taxes for the ~94% of owners in incorporated areas.",
        why: "Part of a documented pattern of voting to raise property taxes for targeted services, here unanimously and with earmarked uses.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2021/dec/14/weber-county-commissioners-ok-4-5-property-tax-hike/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_balance',
        headline: 'Adopted a no-tax-increase 2026 county budget with first-responder raises',
        facts: "On Dec. 16, 2025 the commission — with Harvey as vice chair — adopted Weber County's final 2026 operating and capital budget with no property-tax increase, while funding a countywide compensation-study adjustment that raised employee and sheriff's-office pay. The county notes Fitch rates it among the top 3% of counties nationally for general-obligation bond strength.",
        why: "After backing earlier increases, he supported holding the property-tax rate flat for 2026 while still funding pay — a concrete, checkable fiscal action.",
        source: { label: 'Weber County Final 2026 Budget (official)', url: 'https://www3.webercountyutah.gov/Transparency/budget/2026-final-budget.pdf' } },
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements', 'Consistency'], issueKey: 'housing_build',
        headline: 'Names housing attainability his top issue, balanced with farm property rights',
        facts: "In his 2024 re-election interview, Harvey identified housing attainability as his number-one issue, citing young families near Hill Air Force Base who can't afford a first home, and called for smart growth balanced against protecting the property rights of longtime agricultural landowners. He has also pointed to recreation and tourism growth as a way to fund the county without leaning on property taxes.",
        why: "Documents his stated priorities, consistent with the later move to fund the county through sales tax and growth.",
        source: { label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/elections-politics-government/elections/jim-harvey-running-for-weber-county-commission-seat-c/2150477/' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'water',
        headline: 'Voted to table the 1,400-acre Westbridge Meadows development over density and water concerns',
        facts: "On Aug. 5, 2025 Harvey was part of the 2-1 majority that tabled the rezone and development agreement for Westbridge Meadows, a roughly 1,400-acre master-planned community in western Weber County, citing concerns about density, traffic, water supply and taxpayer burden — over the dissent of Commissioner Gage Froerer, who wanted it to advance.",
        why: "Documents a more cautious growth posture and concern for water and infrastructure costs — a clear contrast within the commission.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/aug/05/weber-county-commission-tables-ordinance-development-agreement-for-westbridge-meadows-community/' } },
    ],
    stances: {
      'Property Taxes & Fiscal Policy': "Has voted to raise county property taxes when he judged services required it — a unanimous 4.5% hike in 2021 (libraries and flood control) and a contested 7.25% hike for 2024 — while framing such votes as difficult and not taken lightly.",
      'County Budget & Appropriations': "Supported a no-property-tax-increase 2026 budget that still funded compensation-study raises, and favors diversifying county revenue through sales tax, tourism and growth rather than relying on property taxpayers.",
      'Growth, Housing & Land Use': "Calls housing attainability his top issue and backs 'smart growth' for young families, but joined the majority to table the 1,400-acre Westbridge Meadows project over density, traffic and water concerns.",
      'Government Transparency & Accountability': "Makes communication and transparency a signature theme, crediting himself with county public-outreach campaigns.",
    },
    stanceCards: [
      { topic: 'Property Tax Votes', icon: '💵', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: 'Has voted to raise county property taxes when he judged services required it (4.5% in 2021, a contested 7.25% for 2024), framing such votes as difficult.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2023/nov/30/weber-county-tax-hike-proposal-generates-backlash-death-by-cuts/' } },
      { topic: 'Revenue Diversification', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Favors funding the county through sales tax, tourism and growth rather than property taxpayers; backed a no-increase 2026 budget that still funded raises.', source: { label: 'Weber County Final 2026 Budget', url: 'https://www3.webercountyutah.gov/Transparency/budget/2026-final-budget.pdf' } },
      { topic: 'Housing & Smart Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: 'Calls housing attainability his top issue but joined the majority to table the 1,400-acre Westbridge Meadows project over density, traffic and water concerns.', source: { label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/elections-politics-government/elections/jim-harvey-running-for-weber-county-commission-seat-c/2150477/' } },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Makes communication and transparency a signature theme, crediting himself with county public-outreach campaigns.', source: { label: 'Weber County (official bio)', url: 'https://www.webercountyutah.gov/County_Commission/harvey.php' } },
    ],
  },

  // ══════════════════ Ben Nadolski — Mayor of Ogden ══════════════════
  ben_nadolski: {
    create: true,
    name: 'Ben Nadolski',
    office: '🏙 Mayor of Ogden, Utah',
    party: 'Nonpartisan', state: 'Utah', icon: '🏙',
    candidacyStatus: 'office',
    nextElection: '2027-11-02',
    score: 70,
    keyIssues: ['City Budget & Appropriations', 'Economic Development', 'Public Safety', 'Water, Great Salt Lake & Environment'],
    bio: "Ben Nadolski is the Mayor of Ogden, Utah, sworn in as the city's 39th mayor on January 2, 2024 after winning the November 2023 election; his four-year term runs through January 2028. He previously served two terms on the Ogden City Council and spent more than two decades with the Utah Division of Wildlife Resources, latterly as northern-region supervisor. As mayor he has emphasized fiscal discipline, downtown and Union Station economic development, public-safety results, and the Great Salt Lake.",
    acctSummary: "A first-term Ogden mayor with a mostly positive, checkable record: after a roughly 1% property-tax increase in his first budget, he proposed and the council adopted no-increase budgets for FY2026 (and proposed FY2027), oversaw an administration that posted double-digit crime drops and record-low use of force, and has pushed Union Station restoration and the Great Salt Lake as priorities.",
    theme: "A first-term Ogden mayor whose receipts run mostly positive — no-increase budgets after a modest first-year hike, record-low police use of force amid falling crime, and a ~$9M Union Station restoration — anchored by a career conservationist's focus on the Great Salt Lake.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2024', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: 'His first budget proposed a ~1% property-tax increase',
        facts: "In his first budget as mayor — a proposed FY2025 plan of about $291 million, over $20 million above the prior year — Nadolski proposed maintaining the certified tax rate, which he estimated as 'a modest 1% increase in property taxes' (roughly $183,000), partly to fund a first-responder mental-health contract after a grant expired.",
        why: "A documented tax increase in his first budget, useful to weigh against his later no-increase budgets.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2024/may/09/ogden-mayor-nadolski-presents-budget-proposal-with-property-tax-hike/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'property_tax',
        headline: 'Council adopted his $289.8M FY2026 budget with no property-tax increase',
        facts: "The Ogden City Council adopted Mayor Nadolski's proposed FY2026 budget of $289.8 million on June 17, 2025 with no property-tax increase, funding a 2.97% cost-of-living raise for employees, step increases for sworn police and fire, and 42 capital projects including a rebuilt Marshall N. White Community Center. He proposed another no-increase budget for FY2027.",
        why: "After a first-year increase, he held the property-tax rate flat — a concrete, repeated fiscal action.",
        source: { label: 'Ogden City (official)', url: 'https://www.ogdencity.gov/CivicAlerts.aspx?AID=893&ARC=1841' } },
      { impact: 'positive', category: 'promise', date: '2026', tags: ['Positive Leadership', 'Notable Actions'], issueKey: 'back_police',
        headline: 'Ogden PD posted double-digit crime drops and record-low use of force',
        facts: "In March 2026, tied to state recognition of Ogden's police chief, the city reported a 14% drop in Part I crime, a 10% drop in property crime, a 4% drop in crimes against persons, and a 22% decline in use-of-force incidents — the lowest annual total on record — along with about $680,000 in savings. Nadolski has emphasized recruiting experienced 'lateral' officers.",
        why: "Measurable public-safety results under his administration; the chief runs the department while the mayor sets priorities and the budget.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/mar/24/ogden-chief-of-police-detective-recognized-by-utah-chiefs-of-police-association/' } },
      { impact: 'positive', category: 'promise', date: '2026', tags: ['Notable Actions', 'Positive Leadership'], issueKey: 'infrastructure',
        headline: 'Announced ~$9M to restore Ogden Union Station as a transportation hub',
        facts: "At his January 2026 State of the City address, Nadolski announced a plan to restore the ~101-year-old Union Station ahead of the 2034 Olympics, citing a $600,000 gift from the Union Station Foundation to hire a preservationist, $5 million in previously set-aside city funds for the council to consider, and roughly $9 million total in planned investment to leverage additional grants.",
        why: "A concrete capital and economic-development initiative with specific figures and a timeline.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jan/10/mayor-nadolski-uses-state-of-the-city-stage-to-announce-union-station-initiatives-amidst-celebrating-a-big-2025/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'econ_smallbiz',
        headline: 'Ogden-Clearfield ranked No. 2 nationally among best-performing cities',
        facts: "In January 2025 the Ogden-Clearfield metro ranked second nationally (behind Raleigh, N.C.) in the Milken Institute's Best-Performing Cities report and first in income equality. Nadolski credited a 'Utah Way' culture of collaboration, citing jointly run airport operations with Roy City and Weber County and ties to Hill Air Force Base.",
        why: "External recognition that documents the local economy's standing during his tenure — a regional metric, not solely a mayoral achievement.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2025/jan/24/mayor-nadolski-utah-way-driving-ogden-clearfields-economic-success/' } },
    ],
    stances: {
      'City Budget & Property Taxes': "After a ~1% property-tax increase in his first (FY2025) budget, he proposed and the council adopted no-increase budgets for FY2026, and he proposed no increase for FY2027, framing fiscal discipline as a core commitment.",
      'Water, Great Salt Lake & Environment': "As a career wildlife-resources official, Nadolski has called the Great Salt Lake a top priority, advocating replacing leaking century-old water lines and leasing conserved water to the lake (a position he set out as a 2023 candidate).",
      'Public Safety': "Prioritizes recruiting experienced 'lateral' police officers and credits his administration with a 22% drop in use-of-force incidents to a record low alongside falling crime.",
      'Economic Development': "Centers downtown and Union Station revitalization and a regional, collaborative 'Utah Way' approach to economic growth ahead of the 2034 Olympics.",
      'Government Transparency & Accountability': "Made transparency and public trust a central theme of his administration from his inauguration.",
    },
    stanceCards: [
      { topic: 'Fiscal Discipline', icon: '💵', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'After a ~1% increase in his first budget, proposed and the council adopted no-property-tax-increase budgets for FY2026, and he proposed no increase for FY2027.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/05/ogden-city-not-seeking-additional-tax-burden-as-preliminary-budget-is-introduced/' } },
      { topic: 'Great Salt Lake', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support', text: 'A career wildlife-resources official who calls the Great Salt Lake a top priority — replacing leaking century-old water lines and leasing conserved water to the lake.', source: { label: 'Great Salt Lake Collaborative', url: 'https://greatsaltlakenews.org/latest-news/great-salt-lake-collaborative/ogden-mayoral-candidate-ben-nadolski-answers-10-questions-about-great-salt-lake' } },
      { topic: 'Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Prioritizes recruiting experienced 'lateral' officers; credits his administration with a 22% drop in use-of-force incidents to a record low amid falling crime.", source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/mar/24/ogden-chief-of-police-detective-recognized-by-utah-chiefs-of-police-association/' } },
      { topic: 'Economic Development', icon: '📈', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support', text: "Centers downtown and Union Station revitalization and a regional, collaborative 'Utah Way' approach to growth ahead of the 2034 Olympics.", source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jan/10/mayor-nadolski-uses-state-of-the-city-stage-to-announce-union-station-initiatives-amidst-celebrating-a-big-2025/' } },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Made transparency and public trust a central theme of his administration from his inauguration.', source: { label: 'KSL', url: 'https://www.ksl.com/article/50831115/ben-nadolski-inaugurated-as-ogdens-new-mayor-transparency-and-trust-will-be-key-focuses' } },
    ],
  },

  // ══════════════════ Ricky Hatch — Clerk/Auditor ══════════════════
  ricky_hatch: {
    create: true,
    name: 'Ricky Hatch',
    office: '🗳 Weber County Clerk/Auditor',
    party: 'Republican', state: 'Utah', icon: '🗳',
    candidacyStatus: 'incumbent',
    nextElection: '2026-11-03',
    score: 74,
    keyIssues: ['Local Government Transparency & Accountability', 'Election Administration', 'County Budget & Appropriations'],
    bio: "Ricky Hatch is the Weber County Clerk/Auditor, first elected in 2010 and running unopposed for re-election in 2026. A CPA by training, he runs the county's elections, budget and audit oversight, and public records, and is a nationally recognized elections administrator — a former vice chair of the U.S. Election Assistance Commission's Board of Advisors and a National Association of Counties elections leader. He has been named Utah County Auditor of the Year and Clerk of the Year multiple times.",
    acctSummary: "A nationally recognized, multiple-award-winning elections administrator and CPA with a strong transparency record — he runs public equipment-accuracy tests and reconciliations, testified to Congress against unfunded federal election mandates, and administers the county's truth-in-taxation process. No record of adverse audits or misconduct was found; the lone 2026 controversy was an admitted clerical error by his office in a candidate-filing dispute.",
    theme: "A CPA and nationally recognized elections administrator who runs audits and reconciliations in public, defends vote-by-mail with layered safeguards, and fronts the county's truth-in-taxation process — candid even when his own office errs.",
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Positive Leadership', 'Transparency'], issueKey: 'election_integrity',
        headline: 'Runs public election audits and reconciliations amid election-denial pressure',
        facts: "Profiled by Governing in 2026, Hatch leads public tours of the county's Logic and Accuracy testing — a pre-election audit of voting equipment — and supports conducting reconciliations publicly. He has faced political threats, a thrown brick and a threatening voicemail but has continued the work, saying 'reconciliations are important, and I think they should be done publicly.'",
        why: "Documents transparency leadership maintained under direct personal pressure.",
        source: { label: 'Governing', url: 'https://www.governing.com/politics/a-utah-county-clerk-grapples-with-election-denial' } },
      { impact: 'neutral', category: 'rhetoric', date: '2021', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: 'Testified to Congress against unfunded federal election mandates',
        facts: "In Feb. 2021 written testimony to the U.S. House Committee on House Administration on the For the People Act (H.R. 1), Hatch argued a return-postage mandate would be an unfunded cost, noting 86% of Weber County voters used drop boxes in 2020 and the requirement could add $31,000–$73,000 per election; he urged Congress to preserve local control and include working election officials in policy.",
        why: "Documents his local-control position with specific, checkable figures.",
        source: { label: 'U.S. House Committee on House Administration (docs.house.gov)', url: 'https://docs.house.gov/meetings/HA/HA00/20210225/111246/HHRG-117-HA00-Wstate-HatchCPAR-20210225.pdf' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements', 'Transparency'], issueKey: 'election_integrity',
        headline: 'Explained new 2026 ballot-ID rules and 24/7 drop-box chain of custody',
        facts: "Ahead of the 2026 primary, Hatch explained Utah's new rules requiring voters to write the last four digits of their Social Security number or driver's license on the return envelope, and that ballots must be in the clerk's possession by 8 p.m. on election night; he noted drop boxes are under 24/7 video surveillance 'so we have full chain of custody.'",
        why: "Proactive voter education and transparency about how ballots are secured and counted.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/19/hatch-discusses-new-rules-for-weber-county-ballots-ahead-of-primary-election/' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Transparency'], issueKey: 'gov_transparency',
        headline: 'Acknowledged his office erred in a 2026 candidate-filing dispute',
        facts: "When three commission candidates sued to disqualify rival James Ebert over a conflict-of-interest filing, Hatch publicly acknowledged his office made a mistake — failing to attach Ebert's electronic conflict-of-interest form — but argued the legal standard of 'substantial compliance' favored keeping Ebert on the ballot. He also disclosed and addressed the appearance issue that Ebert's wife is the county comptroller, saying she has no access to the elections office.",
        why: "A documented administrative error, candidly acknowledged — an honest negative on an otherwise strong transparency record.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/03/weber-county-clerk-auditor-discusses-lawsuit-to-remove-county-commission-candidate-from-ballot/' } },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Transparency'], issueKey: 'property_tax',
        headline: "Administers the county's truth-in-taxation and certified-tax-rate process",
        facts: "As Clerk/Auditor, Hatch's office mails the annual Notice of Property Valuation and Tax Change to every Weber County property owner each July, disclosing proposed taxes for 90-plus taxing entities and the public-hearing dates for any proposed increase, and enforces the certified-tax-rate rule requiring entities that exceed it to advertise and hold truth-in-taxation hearings.",
        why: "His office is the transparency backstop on property taxes — directly relevant given the county's repeated tax debates.",
        source: { label: 'Weber County Clerk/Auditor (official)', url: 'https://www.webercountyutah.gov/Clerk_Auditor/appeal_notice.php' } },
    ],
    stances: {
      'Local Government Transparency & Accountability': "Advocates conducting election reconciliations and voting-equipment accuracy tests in public, leading public tours of the county's Logic and Accuracy testing.",
      'Election Administration': "Defends Utah's vote-by-mail system while emphasizing layered safeguards — 24/7 video-surveilled drop boxes, an 8 p.m. ballot-receipt deadline, and a new envelope-ID requirement.",
      'Local Control of Elections': "Opposes federalizing election administration through unfunded mandates, testifying to Congress that counties should keep ownership of locally administered best practices.",
      'Property-Tax Transparency': "Through his office, enforces Utah's truth-in-taxation framework, requiring any taxing entity that wants to exceed its certified rate to advertise and hold public hearings.",
    },
    stanceCards: [
      { topic: 'Public Election Audits', icon: '🔍', pos: 'support', issueKey: 'election_integrity', issueStance: 'support', text: "Advocates conducting reconciliations and voting-equipment accuracy tests in public; leads public tours of the county's Logic and Accuracy testing.", source: { label: 'Governing', url: 'https://www.governing.com/politics/a-utah-county-clerk-grapples-with-election-denial' } },
      { topic: 'Vote-by-Mail Security', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support', text: 'Defends Utah vote-by-mail with layered safeguards — 24/7 video-surveilled drop boxes, an 8 p.m. receipt deadline, and a new envelope-ID requirement.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/19/hatch-discusses-new-rules-for-weber-county-ballots-ahead-of-primary-election/' } },
      { topic: 'Local Election Control', icon: '🤠', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Opposes federalizing elections through unfunded mandates; testified to Congress that counties should keep ownership of locally administered best practices.', source: { label: 'docs.house.gov', url: 'https://docs.house.gov/meetings/HA/HA00/20210225/111246/HHRG-117-HA00-Wstate-HatchCPAR-20210225.pdf' } },
      { topic: 'Truth in Taxation', icon: '🧾', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Enforces Utah truth-in-taxation: any taxing entity exceeding its certified rate must advertise and hold public hearings before raising taxes.', source: { label: 'Weber County Clerk/Auditor', url: 'https://www.webercountyutah.gov/Clerk_Auditor/appeal_notice.php' } },
    ],
  },

  // ══════════════════ Ryan Arbon — Sheriff (PATCH existing) ══════════════════
  ryan_arbon: {
    create: false,
    theme: "A two-term sheriff whose documented record now centers on signing Weber County into ICE's 287(g) immigration-enforcement program and a years-long fight for deputy pay and staffing — a record that also includes an open investigation into an April 2026 in-custody jail death.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'immig_balance',
        headline: "Signed Weber County into ICE's 287(g) immigration-enforcement program",
        facts: "In June 2025, with commission approval, Arbon's office entered ICE's 287(g) program — making Weber County one of Utah's largest law-enforcement agencies (by population served) to formalize such an agreement. Two deputies, trained by ICE, gained authority to make immigration arrests. Arbon framed it as targeting criminals, not sweeps: 'There are some criminals here that need to be removed, and that's what we're going to do,' adding 'we're not out there looking for people that are aliens.'",
        why: "A consequential, documented policy decision with real operational scope, not a campaign promise.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51337850/weber-county-oks-accord-with-feds-to-help-in-the-fight-against-illegal-immigration' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Behavior'], issueKey: 'immig_balance',
        headline: 'Under 287(g), deputies transferred 34 of 72 immigrants encountered to ICE',
        facts: "KUER reported in March 2026 that two trained Weber deputies make immigration arrests under the Task Force Model; between late November and late January they encountered 72 immigrants without legal status and transferred 34 to ICE, with the rest warned or cited and released — most contacts during traffic stops. Arbon said speaking publicly reflected a transparency goal, though reporting noted the county's ICE contract requires coordinating media releases with ICE and shields some records from Utah's public-records law.",
        why: "Gives the public concrete numbers and a transparency caveat on a high-profile program.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-03-27/what-to-know-about-how-weber-countys-partnership-with-ice-works' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Red Flags', 'Public Behavior'], issueKey: 'justice_balance',
        headline: 'An in-custody death at the Weber County Jail in April 2026 is under investigation',
        facts: "On April 6, 2026, a person in the custody of the Weber County Jail was found unresponsive during a security check and later pronounced dead. The Sheriff's Office said an initial investigation indicated a medical event that was not self-inflicted, and the case is proceeding under the county's Critical Incident Protocol, led by the County Attorney's Office. No cause-of-death finding or lawsuit had been reported as of June 2026.",
        why: "A death in the jail he runs is a serious accountability matter; fault is not established and the investigation was open.",
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/apr/06/in-custody-death-reported-at-weber-county-jail/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'gov_services',
        headline: "Backed deputies' warning of critical understaffing and uncompetitive pay",
        facts: "In November 2024, a group of 'Concerned Weber County Deputies' warned that staffing had reached critical levels, with patrol shifts often below minimum. Arbon confirmed 'the letter is correct,' said he had pushed for higher pay for years, and noted his request to restore previously cut positions was left out of the tentative budget; at the budget hearing he said Ogden City officers start about $6,000 higher annually and the Utah Highway Patrol pays $8–$9 more per hour.",
        why: "Candor about his own office's shortfalls and a specific, checkable pay gap.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51178503/understaffed-and-underpaid-weber-county-deputies-plea-for-help' } },
    ],
    stances: {
      'Immigration & ICE Cooperation': "Actively supports cooperating with ICE under the 287(g) program, which his office joined in June 2025, publicly defending it as targeting criminals rather than immigration sweeps.",
      'Deputy Pay & Staffing': "Says he has fought for higher deputy pay for years and publicly endorsed deputies' warnings of critical understaffing, citing specific pay gaps versus Ogden police and the Utah Highway Patrol.",
      'Jail Operations & Accountability': "Oversees the Weber County Jail, where an April 2026 in-custody death is under independent review through the county's Critical Incident Protocol.",
    },
    // ryan_arbon already has an ISSUE_STANCE_DATA entry; no stanceCards emitted.
    stanceCards: [],
  },
};

// ── Firestore value encoder / decoder ───────────────────────────────────────
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
// PATCH with an updateMask updates only the listed fields; PATCH with no mask
// creates the document with the provided fields.
async function patch(id, fields, { mask = true } = {}) {
  const qs = mask ? '?' + Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : '';
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
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
  out.push('    // ── Weber County sitting officials · Batch 1 (June 2026) ──────────────────────');
  out.push('    // First structured Weber County pass: current county commissioners, the Ogden');
  out.push("    // mayor, and the clerk/auditor. Each card keys to an ISSUE_MAP issue so the");
  out.push("    // profile joins Stance at a Glance, the Evidence Locker and the Alignment Tool.");
  for (const [id, plan] of Object.entries(DATA)) {
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
  console.log(`PolitiDex — Weber County deep dive (batch 1: sitting county & municipal officials)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every stanceCard issueKey against the live ISSUE_MAP vocabulary.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.spotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/weber-county-batch1-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, patched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }

    // ── CREATE path: brand-new sitting-official profile ──────────────────────
    if (plan.create) {
      if (doc) {
        console.log(`  · ${id} (${plan.name}): already exists — skipping create (re-run logic only patches)`);
      } else {
        totSpot += plan.spotlight.length;
        totStance += Object.keys(plan.stances).length;
        console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
        if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
        created++;
        continue;
      }
    }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    // ── PATCH path: existing profile (e.g. ryan_arbon) ───────────────────────
    const fields = { updatedAt: STAMP };

    let addedSpot = 0;
    if (hasDrivers(doc)) {
      console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
      skippedDrivers++;
    } else if (plan.spotlight && plan.spotlight.length) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      fields.spotlight = plan.spotlight.concat(existing);
      addedSpot = plan.spotlight.length;
      if (plan.theme && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) {
        fields.spotlightTheme = plan.theme;
      }
    }

    let addedStance = 0;
    const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? { ...doc.stances } : {};
    for (const [topic, text] of Object.entries(plan.stances || {})) {
      if (!(topic in stances)) { stances[topic] = text; addedStance++; }
    }
    if (addedStance) fields.stances = stances;

    totSpot += addedSpot; totStance += addedStance;
    console.log(`  ${APPLY ? '✎' : '→'} PATCH ${id} (${doc.name}): +${addedSpot} receipt(s), +${addedStance} stance(s)`);

    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      patched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created, ${patched} patched · ${totSpot} receipt(s), ${totStance} stance(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
