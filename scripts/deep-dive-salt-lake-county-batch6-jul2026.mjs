#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Salt Lake County deep dive, BATCH 6 (July 2026)
//
// Closes the biggest remaining Utah gap identified in the coverage audit: Salt
// Lake County — roughly a third of the state's population — had no county/city
// controversy tier (only two county-council stance records existed). This batch
// builds the top of that tier, controversy-first, around three tightly
// INTERLOCKING fights plus the largest suburbs:
//
//   • SALT LAKE CITY — homelessness, public safety, and the downtown Sports,
//     Entertainment, Culture & Convention District. CREATE Erin Mendenhall
//     (Mayor): the 2024 Smith Entertainment Group (SEG) deal (up to $900M in
//     bonds repaid via a 0.5% citywide sales-tax increase; ~$1.2B over 30 years),
//     her homelessness strategy (~$25M/yr from the general fund; "high utilizer"
//     focus), and a 2026 entertainment-tax proposal aimed at non-resident event
//     attendees.
//   • SALT LAKE COUNTY — the ~20% property-tax increase (first since 2019),
//     trimmed to 14.6%, driven by criminal-justice costs (74% of the general
//     fund) after voters rejected a $507M jail bond in 2024. CREATE Jenny Wilson
//     (County Mayor): "no responsible alternative," reform work with Judge
//     Leifman, and the resulting referendum push.
//   • SALT LAKE COUNTY JAIL — overcrowding "early releases" (100,000+ since 2007;
//     a Dec. 2025 legislative audit found a 38.4% 90-day recidivism rate),
//     HB312's release limits, and ~200+ new Oxbow beds that ended overcrowding
//     releases in June 2025. CREATE Rosie Rivera (County Sheriff; a 2026
//     candidate): agreed with the audit and reports zero overcrowding releases
//     since.
//   • KEY SUBURBS — CREATE Monica Zoltanski (Sandy Mayor: a 32% city-line
//     property-tax proposal, gondola opposition, sports-entertainment growth),
//     Karen Lang (West Valley City Mayor: public-safety funding and a stance that
//     "local government is not an arm of federal immigration enforcement"), and
//     Lorin Palmer (Herriman Mayor: growth that "pays its fair share" as the city
//     tripled to ~64,000 in 15 years).
//
// FACET / NUANCE MODELING: two-sided positions are pos:'mixed' — Mendenhall's
// tax-for-a-private-arena tradeoff and her cooperate-but-pay-more stance toward
// the state; Wilson's raise-taxes-to-reform-not-just-jail posture; Rivera's
// end-releases-but-jail-still-full reality; Zoltanski's rare-but-real tax hike;
// Lang's fund-police-yet-limit-immigration-enforcement line.
//
// COMPLEMENTARY, non-duplicative: Salt Lake County COUNCIL already has records
// (suzanne_harrison, rosalba_dominguez) — this batch adds the county MAYOR,
// SHERIFF, and CITY mayors, not council seats, and does not touch those docs.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • Council tier beyond the two existing records, and additional suburbs
//     (West Jordan/Dirk Burton, South Jordan, Draper, Murray, Millcreek,
//     Riverton) — named for a follow-up pass, not stubbed here.
//   • The 2026 referendum on Wilson's tax hike and the 2026 sheriff race are live
//     outcomes to record later, not yet resolved.
//   • District Attorney Sim Gill's diversion role is real but is a separate
//     office; described as context, not built in this county-executive batch.
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • erin_mendenhall_slc     — Salt Lake City Mayor (D); re-elected 2023.        → CREATE
//   • jenny_wilson_slco       — Salt Lake County Mayor (D).                        → CREATE
//   • rosie_rivera_slco       — Salt Lake County Sheriff (D); 2026 candidate.      → CREATE
//   • monica_zoltanski_sandy  — Sandy Mayor (nonpartisan); re-elected 2025.        → CREATE
//   • karen_lang_wvc          — West Valley City Mayor (nonpartisan); 2nd term.    → CREATE
//   • lorin_palmer_herriman   — Herriman Mayor (nonpartisan); re-elected 2025.     → CREATE
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source that was
//     verified during research (KSL, KUER, Deseret News, Salt Lake Tribune, ABC4,
//     Fox13, Utah News Dispatch, KSL NewsRadio, KUTV, and local city journals).
//   • Individual lens, not party. County mayor/sheriff are partisan offices (both
//     Wilson and Rivera are Democrats) labeled as plain metadata; Salt Lake City
//     is officially nonpartisan but Mendenhall is carried as Democrat consistent
//     with the existing roster; suburb mayors are nonpartisan. Vote/audit figures
//     are stated as plain facts (council trimmed 19.63% → 14.6%; 38.4% recidivism).
//   • Attribution discipline: the 38.4% recidivism figure and "twice as likely to
//     reoffend" are the legislative auditor's findings, not Rivera's words; the
//     $900M/0.5%-tax figures are the SEG agreement's terms; the referendum is
//     residents', not Wilson's.
//   • Idempotent & non-destructive: re-fetches each live doc; CREATE only where
//     nothing exists (all six audited absent before writing).
//
//   node scripts/deep-dive-salt-lake-county-batch6-jul2026.mjs            # dry run
//   node scripts/deep-dive-salt-lake-county-batch6-jul2026.mjs --emit     # write stance block to /tmp
//   node scripts/deep-dive-salt-lake-county-batch6-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-10T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  // Salt Lake City — SEG district + homelessness
  ksl_seg:      { label: 'KSL', url: 'https://www.ksl.com/article/51131049/utah-committee-approves-salt-lake-city-smith-entertainment-group-deal-for-delta-center-district' },
  abc4_slctax:  { label: 'ABC4', url: 'https://www.abc4.com/news/wasatch-front/slc-council-decision-tax-adjustment-downtown/' },
  deseret_mend: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/01/28/salt-lake-city-mayor-erin-mendenhall-housing-homelessness-safety-crime/' },
  und_home:     { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2026/03/11/salt-lake-city-mayor-encouraged-by-legislature-homeless-funding/' },
  deseret_enttax:{ label: 'Deseret News', url: 'https://www.deseret.com/utah/2026/05/06/salt-lake-city-mayor-erin-mendenhall-2026-budget-proposal-tax-increase-revenue-demand/' },
  // Salt Lake County — property tax + criminal justice
  ksl_wilson:   { label: 'KSL', url: 'https://www.ksl.com/article/51393254/salt-lake-county-mayor-proposes-nearly-20-property-tax-increase' },
  kuer_wilson:  { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-12-31/salt-lake-county-property-tax-increase-touches-on-angst-over-rising-costs' },
  fox13_wilson: { label: 'FOX13', url: 'https://www.fox13now.com/news/politics/slco-mayor-proposes-tax-increase-criminal-justice-focus' },
  sltrib_wilson:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/10/22/what-could-salt-lake-countys/' },
  // Salt Lake County Jail — overcrowding / audit / HB312
  ksl_audit:    { label: 'KSL', url: 'https://www.ksl.com/article/51416794/audit-finds-overcrowding-at-salt-lake-county-jail-increases-recidivism' },
  deseret_jail: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/12/09/salt-lake-city-audit-report-of-county-criminal-justice-system/' },
  kslnr_jail:   { label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/utah/salt-lake-co-jail-expansion/2292291/' },
  // Suburbs
  kutv_sandy:   { label: 'KUTV', url: 'https://kutv.com/news/local/sandy-mayor-clarifies-misunderstood-costs-of-proposed-tax-increase-for-residents' },
  sandyj:       { label: 'Sandy Journal', url: 'https://www.sandyjournal.com/2025/10/07/549404/voters-guide-for-mayoral-race' },
  sltrib_wvc:   { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/10/14/karen-lang-faces-june-hesleph-2025/' },
  wvcj:         { label: 'West Valley Journal', url: 'https://www.wvcjournal.com/2025/10/07/549443/voters-guide-for-mayoral-race' },
  herrimanj:    { label: 'Herriman Journal', url: 'https://www.herrimanjournal.com/2025/10/07/549354/mayoral-race-voters-guide' },
  sltrib_burbs: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/11/04/utah-2025-election-results-salt/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Erin Mendenhall — Salt Lake City Mayor (district / sales tax / homelessness) ══════════
  erin_mendenhall_slc: {
    create: true,
    name: 'Erin Mendenhall',
    office: '🏛 Salt Lake City (Mayor)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 64,
    keyIssues: ['Homelessness & Housing', 'Crime & Public Safety', 'Property Taxes & County Budget', 'Growth, Housing & Land Use'],
    bio: "Erin Mendenhall is the mayor of Salt Lake City, first elected in 2019 and re-elected in 2023. Her second term is defined by two intertwined fights: a chronic homelessness and downtown public-safety crisis, and the 2024 deal with Smith Entertainment Group (SEG) to build a downtown Sports, Entertainment, Culture & Convention District around a renovated Delta Center — financed by a 0.5% citywide sales-tax increase. Salt Lake City's mayor is officially a nonpartisan office; Mendenhall is a Democrat.",
    acctSummary: "Salt Lake City's mayor, steering the capital through the SEG downtown-district deal and a persistent homelessness crisis. The 2024 agreement lets SEG collect up to $900 million in bonds to remodel the Delta Center for the Jazz and the new hockey club, repaid over 30 years through a 0.5% citywide sales-tax increase Mendenhall championed as a 'transformative' district that also funds homelessness mitigation, public safety, affordable housing and Japantown via a Public Benefit Fund. On homelessness she has spent 'north of $25 million a year' from the general fund, said she was 'fed up' with a system that 'does not work for the highest need' individuals, and shifted to targeting 'high utilizers' — later calling 2026 one of the most productive sessions for the city's relationship with the Legislature. In 2026 she floated an entertainment tax on events, arguing most attendees don't live in the city. Her record pairs big-bet downtown investment with an honest ledger of what services cost.",
    theme: "Salt Lake City's mayor is betting on a downtown sports-and-entertainment district funded by a citywide sales tax while carrying a $25M-a-year homelessness burden — pairing transformative investment with candor about who pays.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Struck the SEG downtown-district deal funded by a 0.5% sales tax",
        facts: "Under the 2024 participation agreement Mendenhall negotiated, Smith Entertainment Group can collect up to $900 million in bonds to renovate the Delta Center and build a downtown Sports, Entertainment, Culture & Convention District, repaid over 30 years through a 0.5% citywide sales-tax increase the City Council adopted in October 2024 (effective January 2025). Her office projected roughly $1.2 billion in revenue over the agreement's life.",
        why: "The defining fiscal bet of her tenure — a generational downtown investment financed by a broad-based tax on every city purchase.",
        source: SRC.ksl_seg },
      { impact: 'positive', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'housing_support',
        headline: "Tied the district to a Public Benefit Fund for homelessness and safety",
        facts: "Mendenhall said the deal 'not only creates a path for a transformative downtown … district, but also benefits Japantown, public art and every city resident,' and it established a Public Benefit Fund supporting homelessness mitigation, public safety, affordable housing, and Japantown revitalization, alongside enforcement provisions like citations for illegal camping when shelter is available.",
        why: "Shows how she framed a private-arena subsidy as a public-good vehicle — a claim voters can measure against what the fund delivers.",
        source: SRC.ksl_seg },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'housing_support',
        headline: "'Fed up' with the homelessness system; targets 'high utilizers'",
        facts: "In early 2025 Mendenhall pushed more police presence, expanded shelter and treatment, and tougher prosecution of repeat offenders, saying 'the system does not work for the highest need and highest impact individuals … and more must be done to control the cartels and the fentanyl crisis that's on our streets.' She noted the city spends 'north of $25 million a year out of our general fund' on homelessness impacts, and by 2026 called it one of the most productive legislative sessions for the city's relationship with the state.",
        why: "Her core homelessness posture — enforcement plus services, and a running tab of the city's disproportionate cost.",
        source: SRC.deseret_mend },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Floated an entertainment tax on non-resident event-goers",
        facts: "In May 2026 budget discussions, Mendenhall floated an entertainment tax tied to the new district, arguing that most people attending a Jazz game or Delta Center concert don't live in the city yet use its infrastructure and security. She did not include it in that year's budget, saying the legal agreements around government-owned venues made it too complex to implement on a short timeline.",
        why: "A revenue idea that tests her 'those who benefit should pay' logic — and an honest acknowledgment of its legal limits.",
        source: SRC.deseret_enttax },
    ],
    stances: {
      'Homelessness & Housing': "Spends 'north of $25M a year' of the general fund on homelessness; pairs expanded shelter/treatment with enforcement and a 'high utilizer' focus, saying the old system 'does not work for the highest need.'",
      'Crime & Public Safety': "Backs more police presence and tougher prosecution of repeat offenders alongside a Public Benefit Fund for downtown safety in the SEG district.",
      'Property Taxes & County Budget': "Championed a 0.5% citywide sales tax to finance the SEG downtown district (~$1.2B/30 yrs), and floated an entertainment tax so non-resident event-goers help pay for city services.",
      'Growth, Housing & Land Use': "Negotiated the SEG deal enabling a downtown district with towers up to 600 feet, framed as transformative for the whole city.",
    },
    stanceCards: [
      { topic: 'SEG Downtown District', icon: '🏟', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Negotiated the 2024 SEG deal — up to $900M in bonds to remodel the Delta Center and build a downtown district, repaid via a 0.5% citywide sales tax (~$1.2B over 30 years).", source: SRC.ksl_seg },
      { topic: 'Homelessness: Services + Enforcement', icon: '🏚', pos: 'mixed', issueKey: 'housing_support', issueStance: 'mixed', text: "'Fed up' with a system that 'does not work for the highest need'; spends '$25M a year' from the general fund, targeting 'high utilizers' with shelter, treatment, and tougher prosecution.", source: SRC.deseret_mend },
      { topic: 'Downtown Public Safety Fund', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Tied the district to a Public Benefit Fund for homelessness mitigation, public safety, and affordable housing, with citations for illegal camping when shelter is available.", source: SRC.ksl_seg },
      { topic: 'Entertainment Tax Idea', icon: '🎟', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Floated a 2026 entertainment tax so the many non-residents at Jazz games and concerts help fund the infrastructure and security they use — shelved for now over legal complexity.", source: SRC.deseret_enttax },
    ],
  },

  // ══════════ Jenny Wilson — Salt Lake County Mayor (property tax / criminal justice) ══════════
  jenny_wilson_slco: {
    create: true,
    name: 'Jenny Wilson',
    office: '🏛 Salt Lake County (Mayor)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 61,
    keyIssues: ['Property Taxes & County Budget', 'Crime & Public Safety', 'Local Government Transparency & Accountability'],
    bio: "Jenny Wilson is the mayor of Salt Lake County, Utah's most populous county. Her defining 2025–2026 fight was the county's first property-tax increase since 2019 — proposed at 19.63% and trimmed by the County Council to 14.6% — driven by criminal-justice costs that consume about 74% of the county general fund, a year after voters rejected a $507 million jail bond. County mayor is a partisan office; Wilson is a Democrat.",
    acctSummary: "Salt Lake County's mayor, who staked her 2026 budget on a property-tax increase she called unavoidable. Wilson proposed a 19.63% hike — about $7.28 a month on a $638,000 home — saying that after 'exhausting every other option' there was 'no responsible alternative,' with roughly 74% of the general fund going to criminal justice and pandemic aid gone. The County Council trimmed it to 14.6% (about $36.5M), and residents launched a referendum to block it. Rather than pure incarceration, Wilson paired the money with reform — partnering with Miami-Dade Judge Steven Leifman (whose diversion model cut felony recidivism from 75% to 6%) and a DA push to divert ~10% of case screenings — while conceding the county 'still need[s] capital investment in our jail' after the failed 2024 bond. Her record is a candid raise-taxes-to-reform-and-maintain posture under real public backlash.",
    theme: "Salt Lake County's mayor pressed the county's first tax hike since 2019 — 'no responsible alternative' — to fund a criminal-justice system eating 74% of the budget, betting on reform over incarceration amid a voter referendum.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Proposed a ~20% property-tax increase, the first since 2019",
        facts: "In her 2026 budget, Wilson proposed a 19.63% property-tax increase — about $7.28 a month on a $638,000 home, ~$48.9M total — the county's first hike since 2019. She said that after 'exhausting every other option, a property tax increase of 19.63% is necessary this year' and that there was 'no responsible alternative' amid inflation and the end of pandemic-era federal funds.",
        why: "The central fiscal decision of her tenure, in her own words — a large increase she framed as a last resort.",
        source: SRC.ksl_wilson },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'justice_balance',
        headline: "Tied the hike to criminal justice — 74% of the general fund",
        facts: "Wilson said a 'staggering' 74% of the county general fund goes to criminal-justice costs, and the increase came a year after county voters rejected a $507 million public-safety bond to expand jail capacity and build a new justice center. 'We still need capital investment in our jail so we're looking at that right now,' she told Fox 13.",
        why: "Explains what the money is for and ties the tax fight directly to the failed jail bond and the jail-capacity crisis.",
        source: SRC.fox13_wilson },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'justice_reform',
        headline: "Bet on reform over incarceration with a national model",
        facts: "Wilson emphasized reform: 'Some individuals must face jail time … but we also know through evidence, not theory, that we can improve outcomes and cut costs.' The county partnered with Miami-Dade Judge Steven Leifman — whose program cut felony recidivism for graduates from 75% to 6% — and the DA aimed to divert about 10% of case screenings (as many as ~2,000 low-level cases a year) toward treatment for people with mental illness and homelessness.",
        why: "Shows the policy theory behind the spending — diversion and treatment, not just more jail beds.",
        source: SRC.sltrib_wilson },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Council trimmed the hike to 14.6% as residents launched a referendum",
        facts: "After public backlash, the County Council trimmed the increase to 14.6% (about $36.5M) in the final 2026 budget. Residents almost immediately filed a referendum petition to block it — needing roughly 45,000 signatures — with one critic faulting the growth of the mayor's office (three deputy mayors and three associate deputy mayors), though analysts noted staff cuts couldn't close a gap of tens of millions.",
        why: "Records the accountability check on her decision — a trimmed hike and an active referendum — without overstating either side.",
        source: SRC.kuer_wilson },
    ],
    stances: {
      'Property Taxes & County Budget': "Proposed the county's first property-tax hike since 2019 (19.63%, trimmed to 14.6%) as 'no responsible alternative' after pandemic aid ended — now facing a resident referendum.",
      'Crime & Public Safety': "Ties county finances to criminal justice (74% of the general fund) and the need for jail capital investment after voters rejected the 2024 $507M bond.",
      'Local Government Transparency & Accountability': "Bet on evidence-based reform (Leifman model, DA diversion) over incarceration, and defended the increase through public backlash and a referendum push.",
    },
    stanceCards: [
      { topic: 'First Tax Hike Since 2019', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Proposed a 19.63% property-tax increase — 'no responsible alternative' after pandemic aid ended — trimmed by the council to 14.6% (~$36.5M) amid a resident referendum.", source: SRC.ksl_wilson },
      { topic: 'Criminal Justice = 74% of Budget', icon: '⚖️', pos: 'mixed', issueKey: 'justice_balance', issueStance: 'mixed', text: "Ties the hike to criminal-justice costs (a 'staggering' 74% of the general fund) and the need for jail capital investment after voters rejected the 2024 $507M bond.", source: SRC.fox13_wilson },
      { topic: 'Reform Over Incarceration', icon: '🔄', pos: 'support', issueKey: 'justice_reform', issueStance: 'support', text: "Partners with Miami-Dade Judge Leifman (recidivism cut 75%→6%) and a DA diversion push (~2,000 cases/yr): 'improve outcomes and cut costs' through evidence, not just jail time.", source: SRC.sltrib_wilson },
      { topic: 'Failed 2024 Jail Bond', icon: '🏢', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Governs after voters rejected a $507M public-safety bond to expand the jail — 'we still need capital investment in our jail' — leaving capacity funding unresolved.", source: SRC.fox13_wilson },
    ],
  },

  // ══════════ Rosie Rivera — Salt Lake County Sheriff (jail overcrowding / HB312) ══════════
  rosie_rivera_slco: {
    create: true,
    name: 'Rosie Rivera',
    office: '👮 Salt Lake County Sheriff',
    party: 'Democrat', state: 'Utah', icon: '👮',
    candidacyStatus: 'office',
    nextElection: 'November 2026 (on the ballot)',
    score: 57,
    keyIssues: ['Crime & Public Safety', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "Rosie Rivera is the sheriff of Salt Lake County, first appointed in 2017 and the office running the state's largest jail. Her defining challenge is chronic jail overcrowding: for years the jail released inmates early to stay within capacity — a practice a December 2025 legislative audit tied to sharply higher reoffending — until state law (HB312) and new Oxbow Jail beds ended overcrowding releases in mid-2025. Sheriff is a partisan office; Rivera, a Democrat, is on the 2026 ballot.",
    acctSummary: "Salt Lake County's sheriff, at the center of a decades-old jail-capacity crisis. The jail logged more than 100,000 overcrowding releases since 2007; a December 2025 legislative audit found 1,785 early releases in the first five months of 2025 alone and a 38.4% 90-day recidivism rate — inmates freed for overcrowding were more than twice as likely to reoffend as those released other ways, and more likely to miss court. In 2025 the Legislature passed HB312 barring overcrowding releases for many violent, drug, fentanyl, and DUI offenses and prompted a sales-tax-funded reopening of Oxbow beds (200+); Rivera told lawmakers there have been zero overcrowding releases since June 2025. She agreed with the audit's recommendations and is working with the council and mayor on longer-term capacity — but auditors warn the fix is temporary, with the jail 'functionally full' (about 2,247 inmates in early 2026). A public-safety record defined by managing a system stretched past its limits.",
    theme: "Salt Lake County's sheriff ended years of jail overcrowding releases in 2025 with new beds and a state mandate — but runs a 'functionally full' jail that a legislative audit tied to sharply higher reoffending, with capacity funding still unresolved.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: "Ended overcrowding 'early releases' after new beds and a state law",
        facts: "For years the Salt Lake County Jail released inmates early to stay within capacity — more than 100,000 such releases since 2007. In 2025 the Legislature passed HB312, barring overcrowding releases for many violent, felony-drug, fentanyl, and serious-DUI offenses, and prompted a sales-tax-funded reopening of 200-plus beds at the old Oxbow Jail. Rivera told lawmakers the county has had zero overcrowding releases since those beds opened in June 2025.",
        why: "The central operational turnaround of her tenure — ending a practice that had persisted for nearly two decades.",
        source: SRC.kslnr_jail },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Notable Actions'], issueKey: 'justice_balance',
        headline: "A legislative audit tied overcrowding releases to higher reoffending",
        facts: "A December 2025 legislative audit found the jail released 1,785 inmates early for overcrowding between January and May 2025, with a 38.4% recidivism rate within 90 days — inmates released for overcrowding were more than twice as likely to reoffend as those released other ways, and the county had a higher failure-to-appear rate the auditors linked in part to the releases.",
        why: "The documented harm that made the fix urgent — the accountability baseline against which the 2025 changes are measured.",
        source: SRC.ksl_audit },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Agreed with the audit and backed working with county leaders on capacity",
        facts: "In response to the audit, Rivera agreed with its recommendations and said her office would work with the County Council and mayor to find additional funding, stating she is pursuing expanded jail capacity and long-term needs while maintaining zero overcrowding releases.",
        why: "Shows her stated posture toward oversight — accepting the findings rather than disputing them.",
        source: SRC.ksl_audit },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Runs a 'functionally full' jail with capacity funding unresolved",
        facts: "Auditors caution the Oxbow reopening is temporary — the jail is 'functionally full,' aging, and the county keeps growing, with about 2,247 inmates housed in early 2026. After voters rejected the $507M bond in 2024, the county is weighing options such as a lease-revenue bond and a possible 2026 referendum to fund expansion. Rivera is on the 2026 ballot.",
        why: "The unresolved problem her next term inherits — beds bought time, not a permanent fix.",
        source: SRC.deseret_jail },
    ],
    stances: {
      'Crime & Public Safety': "Ended years of jail overcrowding 'early releases' in 2025 via new Oxbow beds and HB312's release limits, reporting zero overcrowding releases since June 2025.",
      'Property Taxes & County Budget': "Runs a 'functionally full' jail with capacity funding unresolved after the failed 2024 $507M bond; weighing a lease-revenue bond and a possible 2026 referendum.",
      'Local Government Transparency & Accountability': "Agreed with the December 2025 legislative audit that tied overcrowding releases to a 38.4% reoffending rate, and is working with county leaders on long-term fixes.",
    },
    stanceCards: [
      { topic: 'Ended Overcrowding Releases', icon: '🔓', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Ended a nearly two-decade practice of early releases (100,000+ since 2007): after HB312 and 200+ new Oxbow beds, reports zero overcrowding releases since June 2025.", source: SRC.kslnr_jail },
      { topic: 'Audit: Releases Raised Reoffending', icon: '📊', pos: 'mixed', issueKey: 'justice_balance', issueStance: 'mixed', text: "A Dec. 2025 legislative audit found 1,785 overcrowding releases in five months and a 38.4% 90-day recidivism rate — 'twice as likely to reoffend'; Rivera agreed with the recommendations.", source: SRC.ksl_audit },
      { topic: "'Functionally Full' Jail", icon: '🏢', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Runs a jail auditors call 'functionally full' (~2,247 inmates in early 2026); capacity funding is unresolved after the failed 2024 $507M bond, with a lease-revenue bond and 2026 referendum in play.", source: SRC.deseret_jail },
    ],
  },

  // ══════════ Monica Zoltanski — Sandy Mayor (property tax / gondola / growth) ══════════
  monica_zoltanski_sandy: {
    create: true,
    name: 'Monica Zoltanski',
    office: '🏛 Sandy (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Property Taxes & County Budget', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Monica Zoltanski is the mayor of Sandy, a former Sandy city prosecutor re-elected in 2025. Her tenure centers on managing rapid economic growth — she touts about $1 billion in private sports-and-entertainment investment as the region readies for the 2034 Olympics — while defending a proposed property-tax increase and opposing the Little Cottonwood Canyon gondola. Sandy's mayor is a nonpartisan office.",
    acctSummary: "Sandy's mayor, re-elected in 2025 after a term marked by a contested property-tax proposal and big growth bets. She proposed raising the Sandy city line item on residents' tax bills by 32% — about $9 a month, or $108 a year, on the average home — pushing back on 'misinformation' and noting Sandy has raised taxes only twice in 30 years (2019 and 2015) and that the City Council, not the mayor, sets the rate. She positions Sandy as a growth engine (roughly $1B in private sports/entertainment investment, plus outside road and recreation funding) while standing 'firm with the people of Sandy' against the Little Cottonwood Canyon gondola. Her record blends pro-growth development with a hard-to-sell tax ask and a marquee land/transportation fight.",
    theme: "Sandy's mayor pairs big growth bets — ~$1B in sports-and-entertainment investment before the 2034 Games — with a hard-sell 32% city-line tax proposal and firm opposition to the Little Cottonwood gondola.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Proposed a 32% Sandy city-line property-tax increase",
        facts: "Zoltanski proposed increasing the Sandy city portion of residents' property-tax bills by 32% — which she said amounts to about $9 a month, or $108 a year, on the average home — clarifying 'misinformation' that she had raised her own pay or made preferential zoning calls. She noted Sandy has raised taxes only twice in 30 years (2019 and 2015) and that setting the rate is the City Council's role, not the mayor's.",
        why: "Her defining fiscal decision and how she defended it — a large percentage on a small base, framed against a long no-increase history.",
        source: SRC.kutv_sandy },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Positions Sandy as a growth and sports-investment hub",
        facts: "Her 2025 campaign highlighted record economic growth — about $1 billion in private funds toward a pro-hockey, pro-basketball, and pro-soccer sports-and-entertainment hub, plus roughly $35 million in outside funding for roads, bridges, and recreation not paid by taxpayers — positioning Sandy prominently as Utah prepares for the 2034 Olympics.",
        why: "The growth record she ran on — large private investment she casts as expanding the tax base rather than burdening residents.",
        source: SRC.sandyj },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'lands_local',
        headline: "Opposes the Little Cottonwood Canyon gondola",
        facts: "On the long-running canyon-transportation fight, Zoltanski said she 'stands firm with the people of Sandy in opposing the gondola,' while a challenger argued for a phased approach of expanded parking, busing, and tolling to meet UDOT's goal of 30% fewer cars in Little Cottonwood Canyon.",
        why: "A clear local-control/land-use position on a marquee regional fight at Sandy's doorstep.",
        source: SRC.sandyj },
    ],
    stances: {
      'Property Taxes & County Budget': "Proposed a 32% increase to the Sandy city line item (~$9/month on the average home), defending it as rare (only 2019 and 2015 before) and noting the council, not the mayor, sets the rate.",
      'Growth, Housing & Land Use': "Positions Sandy as a growth hub — ~$1B in private sports/entertainment investment and outside infrastructure funding ahead of the 2034 Olympics.",
      'Local Government Transparency & Accountability': "Pushed back on tax 'misinformation' and opposes the Little Cottonwood Canyon gondola, 'firm with the people of Sandy.'",
    },
    stanceCards: [
      { topic: '32% City-Line Tax Proposal', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Proposed a 32% increase to Sandy's line item (~$9/month on the average home), defending it as rare — only 2019 and 2015 before — and noting the council sets the rate.", source: SRC.kutv_sandy },
      { topic: 'Sports & Growth Hub', icon: '🏟', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Touts ~$1B in private sports/entertainment investment and ~$35M in outside road/recreation funding, positioning Sandy for the 2034 Olympics.", source: SRC.sandyj },
      { topic: 'Opposes LCC Gondola', icon: '🚠', pos: 'oppose', issueKey: 'lands_local', issueStance: 'oppose', text: "'Stands firm with the people of Sandy in opposing' the Little Cottonwood Canyon gondola in the long-running canyon-transportation fight.", source: SRC.sandyj },
    ],
  },

  // ══════════ Karen Lang — West Valley City Mayor (public safety / immigration) ══════════
  karen_lang_wvc: {
    create: true,
    name: 'Karen Lang',
    office: '🏛 West Valley City (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 59,
    keyIssues: ['Crime & Public Safety', 'Immigration & Border Security', 'Local Government Transparency & Accountability'],
    bio: "Karen Lang is the mayor of West Valley City, Utah's second-largest city and its most diverse, and the first woman to hold the office. Serving her second term, she centers public-safety funding and community trust — including a stated position that local government 'is not an arm of federal immigration enforcement' — in a city that also saw the Utah Grizzlies hockey team depart in 2025. West Valley City's mayor is a nonpartisan office.",
    acctSummary: "West Valley City's mayor — the city's first female mayor, now in a second term — leading Utah's most diverse large city with a public-safety-first, trust-building agenda. She makes funding police and fire to adequate staffing and equipment her top priority ('first and foremost is funding to ensure the safety of residents'), paired with transparency and accountability to build community trust. On immigration she draws a clear line: local government 'is not an arm of federal immigration enforcement,' and its job is to keep neighborhoods safe so families feel comfortable reporting crimes and using city services — a notably different posture from counties that expanded ICE cooperation. She also handled the emotional 2025 departure of the Utah Grizzlies. A steady public-safety-and-inclusion record for a diverse, working-class city.",
    theme: "West Valley City's first female mayor leads Utah's most diverse large city with a public-safety-first agenda and a clear line that local government 'is not an arm of federal immigration enforcement.'",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'back_police',
        headline: "Makes police and fire funding her top priority",
        facts: "In a 2025 candidate voters guide, Lang said 'first and foremost is funding to ensure the safety of residents,' with police and fire funded to have updated equipment and enough personnel, and named community safety, education, and resources among her highest priorities — emphasizing training, tools, and building trust 'through transparency and accountability.'",
        why: "Her core governing priority for a large, working-class city, stated plainly.",
        source: SRC.wvcj },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'immigration_reform',
        headline: "Says the city 'is not an arm of federal immigration enforcement'",
        facts: "Asked about cooperation with federal immigration enforcement, Lang said public safety and trust 'must always come first,' that West Valley City works to build relationships with all residents regardless of origin, and that 'local government is not an arm of federal immigration enforcement — it is there to provide essential services, keep neighborhoods safe, and ensure families feel comfortable calling police, reporting crimes, and accessing city resources.'",
        why: "A clear, sourced immigration posture for Utah's most diverse large city — a deliberate contrast with counties expanding ICE cooperation.",
        source: SRC.sltrib_wvc },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Navigated the Utah Grizzlies' departure",
        facts: "During 2025 the City Council, in a matter Lang presented, consented to the sale of the Utah Grizzlies hockey club, and the team's departure from West Valley City — a longtime tenant of the city-tied arena — was called a sad if not unexpected loss for the community.",
        why: "A concrete civic-asset decision on her watch affecting a city venue and identity.",
        source: SRC.sltrib_burbs },
    ],
    stances: {
      'Crime & Public Safety': "Makes funding police and fire to adequate staffing and equipment her top priority, paired with community trust 'through transparency and accountability.'",
      'Immigration & Border Security': "Says local government 'is not an arm of federal immigration enforcement,' prioritizing public safety and trust so residents feel safe reporting crimes.",
      'Local Government Transparency & Accountability': "Centers transparency and accountability in policing and led the city through the Utah Grizzlies' 2025 departure.",
    },
    stanceCards: [
      { topic: 'Fund Police & Fire First', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "'First and foremost is funding to ensure the safety of residents' — fund police and fire to adequate staffing and equipment, with trust built 'through transparency and accountability.'", source: SRC.wvcj },
      { topic: 'Not an Immigration Arm', icon: '🛂', pos: 'mixed', issueKey: 'immigration_reform', issueStance: 'mixed', text: "'Local government is not an arm of federal immigration enforcement' — prioritizes public safety and trust so families feel safe reporting crimes and using city services.", source: SRC.sltrib_wvc },
      { topic: 'Grizzlies Departure', icon: '🏒', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Led West Valley City through the emotional 2025 departure of the Utah Grizzlies, presenting the council's consent to the team's sale.", source: SRC.sltrib_burbs },
    ],
  },

  // ══════════ Lorin Palmer — Herriman Mayor (growth pays its own way) ══════════
  lorin_palmer_herriman: {
    create: true,
    name: 'Lorin Palmer',
    office: '🏛 Herriman (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Public Schools & Education'],
    bio: "Lorin Palmer is the mayor of Herriman, one of the fastest-growing cities in Salt Lake County — from about 20,000 to 64,000 residents in 15 years. Re-elected decisively in 2025, he centers his record on making growth 'pay its fair share' by requiring developers to build infrastructure before new housing proceeds, as the city races to keep up with school and public-safety demand. Herriman's mayor is a nonpartisan office.",
    acctSummary: "Herriman's mayor, re-elected in 2025 with about 74% of the vote, governing one of the county's fastest-growing cities. Palmer's central position is that 'new growth pays its fair share' — requiring developers to complete infrastructure before new housing moves forward — as Herriman tripled to roughly 64,000 residents in 15 years and added eight new schools in a decade (18 total). He framed the biggest challenge as 'misinformation' about the city's economy and growth, against a challenger who wanted to boost the commercial tax base. A growth-management record focused on making development fund the roads, schools, and safety it demands.",
    theme: "Herriman's mayor governs one of the county's fastest-growing cities on a simple rule — new growth 'pays its fair share,' with developers building infrastructure before housing — as the city tripled to ~64,000 in 15 years.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Requires growth to 'pay its fair share'",
        facts: "Palmer says he has worked to ensure new growth 'pays its fair share' by requiring developers to complete infrastructure before new housing moves forward — a response to Herriman's explosion from about 20,000 to 64,000 residents over 15 years, which has driven sharp increases in school and public-safety demand.",
        why: "His core growth-management principle, tying new development to the infrastructure it requires.",
        source: SRC.herrimanj },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Manages breakneck school and safety demand",
        facts: "Herriman notes it 'isn't a small farming town anymore,' having added eight new schools in the last decade (18 total) as it grew, with rapid growth straining both schools and public-safety services — the backdrop for Palmer's infrastructure-first approach.",
        why: "The concrete scale of the growth pressure his policies are meant to manage.",
        source: SRC.herrimanj },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Re-elected decisively on the growth debate",
        facts: "Palmer won a second term in 2025 with about 73.9% of the vote over challenger Ty Brady, who wanted to boost the suburb's commercial tax base. Palmer said the biggest challenge facing Herriman was 'misinformation,' particularly around the city's economy and growth.",
        why: "A strong mandate on the central issue — how a fast-growing suburb should manage and pay for its growth.",
        source: SRC.sltrib_burbs },
    ],
    stances: {
      'Growth, Housing & Land Use': "Requires new growth to 'pay its fair share' — developers must complete infrastructure before housing proceeds — in a city that tripled to ~64,000 in 15 years.",
      'Property Taxes & County Budget': "Frames growth management as protecting residents from footing the bill for development's infrastructure demands.",
      'Public Schools & Education': "Governs breakneck school demand (eight new schools in a decade) driven by rapid residential growth.",
    },
    stanceCards: [
      { topic: "Growth 'Pays Its Fair Share'", icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Requires developers to complete infrastructure before new housing proceeds, so 'new growth pays its fair share' as Herriman tripled to ~64,000 residents in 15 years.", source: SRC.herrimanj },
      { topic: 'Schools & Safety Strain', icon: '🍎', pos: 'mixed', issueKey: 'public_schools', issueStance: 'mixed', text: "Manages breakneck demand — eight new schools in a decade (18 total) — as rapid growth strains schools and public safety.", source: SRC.herrimanj },
      { topic: 'Re-elected on Growth', icon: '🗳', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Won a second term in 2025 with ~73.9% over a challenger focused on the commercial tax base; called 'misinformation' about growth the city's biggest challenge.", source: SRC.sltrib_burbs },
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

// ── Emit the politician-stances.js ISSUE_STANCE_DATA block (CREATE records only) ─
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Salt Lake County sitting officials · Batch 6 (July 2026) ───────────────────');
  out.push('    // Closes the biggest Utah gap: Salt Lake County\'s county/city tier. Three');
  out.push('    // interlocking fights — the SLC downtown SEG district + 0.5% sales tax +');
  out.push('    // homelessness (Mendenhall); the county\'s ~20%→14.6% property-tax hike driven by');
  out.push('    // criminal justice (Wilson); and jail overcrowding / HB312 (Sheriff Rivera) —');
  out.push('    // plus the largest suburbs (Zoltanski/Sandy, Lang/West Valley, Palmer/Herriman).');
  out.push('    // (County COUNCIL records suzanne_harrison / rosalba_dominguez already exist.)');
  for (const [id, plan] of Object.entries(DATA)) {
    if (plan.enrich) continue;
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
  console.log(`PolitiDex — Salt Lake County deep dive (batch 6: county mayor + sheriff + SLC mayor + key suburbs)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary (now in alignment-tool.js).
  try {
    const js = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = js.slice(js.indexOf('var ISSUE_MAP = {'), js.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.spotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/salt-lake-county-batch6-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this batch CREATEs new officials only)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.office} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the stance block, --apply to write Firestore.');
})();
