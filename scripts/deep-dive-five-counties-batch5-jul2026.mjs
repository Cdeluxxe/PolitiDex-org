#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah high-salience counties deep dive, BATCH 5 (July 2026)
//
// Extends the county-by-county accountability push (see the Utah County batches
// 1–4, plus the Cache / Box Elder / Davis / Weber passes) to five more
// high-population / high-salience counties that had only STATE-LEGISLATIVE
// coverage and no county/city tier. Controversy-first: the unit is the FIGHT,
// and every record is a CURRENTLY SEATED, ELECTED official tied to that county's
// single defining, well-sourced controversy.
//
//   • WASHINGTON COUNTY / ST. GEORGE — growth, water, and a public-safety
//     property-tax debate. CREATE Jimmie Hughes (Mayor; won the 2025 race over
//     incumbent Michele Randall, took office Jan 2026), inheriting one of the
//     nation's fastest-growing cities where water is the #1 issue and housing now
//     rivals it.
//   • SUMMIT COUNTY — the Dakota Pacific / Kimball Junction fight, a landmark
//     local-control-vs-state clash. CREATE Roger Armstrong (Council Vice Chair)
//     and Canice Harte (Council Chair), the seated councilmembers whose county
//     sued the state, then had the project routed through an administrative
//     process by state law (a Dec. 2025 vote members described as cast "under
//     duress").
//   • TOOELE COUNTY — the yearslong Grantsville "Six Mile" annexation battle vs.
//     Erda, litigated to the Utah Supreme Court and now a suit against the Lt.
//     Governor. CREATE Heidi Hammond (Grantsville Mayor).
//   • IRON COUNTY / CEDAR CITY — the Pine Valley Water Supply Project (a 66-mile
//     pipeline to import West Desert groundwater), federally approved in early
//     2026 amid ranch/tribal/Beaver-County opposition. CREATE Paul Cozzens (Iron
//     County Commissioner and longtime water-district liaison), its leading
//     elected champion.
//   • WASATCH COUNTY / HEBER — the Heber Valley bypass through the North Fields
//     wetlands and a wave of developer-driven "new town" incorporations. CREATE
//     Heidi Franco (Heber City Mayor; re-elected 2025), leading the open-space
//     opposition to UDOT's preferred route.
//
// FACET / NUANCE MODELING: genuinely two-sided positions are marked pos:'mixed'
// (e.g., growth as "a blessing and a curse"; Cozzens' water-supply-vs-cost /
// aquifer tradeoff; Franco's open-space-vs-conservation-cost math; Hammond's
// personal conflict candor). Clear support/oppose stays support/oppose.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • Sheriff tier: no county here had a *defining, sourced* sheriff controversy
//     the way Utah County's 287(g) fight did — Tooele Sheriff Paul Wimmer's only
//     sourced 2026 remarks were budget-process concerns, too thin for a record.
//     Named, not stubbed. (The water/growth/annexation fights are the real
//     controversies in these counties.)
//   • Michele Randall (outgoing St. George mayor) has a sourced "that was not my
//     idea" line on the public-safety tax, but she LEFT office in Jan 2026; her
//     position is captured as context inside Hughes' record rather than as a
//     stale former-officeholder profile.
//   • Water-district GM Paul Monroe (Iron) and county managers Shayne Scott
//     (Summit) / Dustin Grabau (Wasatch) are APPOINTED staff, not elected — their
//     roles are described as context, but PolitiDex profiles track elected
//     officials, so no profile is created for them.
//   • Washington County commissioners (Almquist/Snow/Iverson) and the 2026 GOP
//     primary (Almquist vs. Hoster) are real but the sourced individual quotes
//     were thinner than the St. George mayoral record; tracked for a later pass.
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • jimmie_hughes_stg      — St. George Mayor (nonpartisan); won Nov 2025.        → CREATE
//   • roger_armstrong_summit — Summit County Council, Vice Chair 2026 (D).          → CREATE
//   • canice_harte_summit    — Summit County Council, Chair 2026 (D).               → CREATE
//   • heidi_hammond_grantsville — Grantsville Mayor (nonpartisan); first female.    → CREATE
//   • paul_cozzens_iron      — Iron County Commissioner (R); water-district liaison. → CREATE
//   • heidi_franco_heber     — Heber City Mayor (nonpartisan); re-elected 2025.     → CREATE
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source that was
//     HTTP-verified during research (KUER, KPCW, Park Record, KSL, KSL-TV, ABC4,
//     Salt Lake Tribune, St. George News, TownLift).
//   • Individual lens, not party. County-council seats here are partisan (both
//     Armstrong and Harte are Democrats) and are labeled as such as plain
//     metadata; municipal (St. George, Grantsville, Heber) and the description of
//     each official focus on what THAT person said or did, never a party bloc.
//   • Attribution discipline: opposition to Pine Valley (ranchers, the Indian
//     Peaks Band of Paiute, Beaver County) and the ~$260M+ cost are attributed to
//     those critics, not to Cozzens; the "under duress" phrase is the reporting's
//     paraphrase of the councilmembers, quoted as such.
//   • Idempotent & non-destructive: re-fetches each live doc; CREATE only where
//     nothing exists (all six were audited absent before writing).
//
//   node scripts/deep-dive-five-counties-batch5-jul2026.mjs            # dry run
//   node scripts/deep-dive-five-counties-batch5-jul2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-five-counties-batch5-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-10T00:00:00.000Z';

// Shared sources (HTTP-verified during research).
const SRC = {
  // Washington County / St. George
  kuer_debate:  { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-10-13/st-georges-growth-leads-a-debate-of-similar-visions-between-randall-and-hughes' },
  kuer_result:  { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-11-04/jimmie-hughes-leads-michele-randall-in-the-race-for-st-george-mayor' },
  stg_address:  { label: 'St. George News', url: 'https://www.stgeorgeutah.com/news/housing-now-rivals-water-as-top-concern-washington-county-leaders-say-at-annual-address/article_7a36e7e8-4052-4740-a3e2-5482a89d8350.html' },
  // Summit County / Dakota Pacific
  kpcw_shadow:  { label: 'KPCW', url: 'https://www.kpcw.org/summit-county/2026-03-19/dakota-pacific-project-dogs-future-kimball-junction-development-decisions' },
  kpcw_approve: { label: 'KPCW', url: 'https://www.kpcw.org/summit-county/2025-07-28/summit-county-approves-dakota-pacific-development-for-second-time' },
  kpcw_sb26:    { label: 'KPCW', url: 'https://www.kpcw.org/summit-county/2025-03-10/utah-lawmakers-pass-bill-promoting-kimball-junction-development' },
  pr_harte_chair:{ label: 'Park Record', url: 'https://www.parkrecord.com/2026/01/09/canice-harte-to-chair-the-summit-county-council-in-2026/' },
  // Tooele County / Grantsville annexation
  ksl_grants:   { label: 'KSL', url: 'https://www.ksl.com/article/51443638/after-years-of-disputes-grantsville-files-lawsuit-against-lieutenant-governor-to-finalize-annexation' },
  // Iron County / Pine Valley
  abc4_blm:     { label: 'ABC4', url: 'https://www.abc4.com/news/southern-utah/bureau-land-management-pipeline-project-reactions/' },
  sltrib_pause: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/environment/2025/06/09/southern-utah-water-agency-takes/' },
  ksl_slam:     { label: 'KSL', url: 'https://www.ksl.com/article/50364770/clearly-a-litany-of-impacts-groups-slam-proposed-iron-county-water-pipeline' },
  // Wasatch County / Heber bypass
  pr_northfields:{ label: 'Park Record', url: 'https://www.parkrecord.com/2026/04/10/wasatch-county-heber-city-negotiate-north-fields-protections-ahead-of-bypass-construction/' },
  ksltv_bypass: { label: 'KSL-TV', url: 'https://ksltv.com/traffic-roads/udot-defends-heber-valley-bypass-plan-despite-community-concerns/885864/' },
  pr_franco_win:{ label: 'Park Record', url: 'https://www.parkrecord.com/2025/11/07/heidi-franco-talks-mayoral-win-how-heber-city-can-emulate-midways-protection-culture/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Jimmie Hughes — St. George Mayor (Washington County: growth, water, public-safety tax) ══════════
  jimmie_hughes_stg: {
    create: true,
    name: 'Jimmie Hughes',
    office: '🏛 St. George (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Water, Great Salt Lake & Environment', 'Local Government Transparency & Accountability'],
    bio: "Jimmie Hughes is the mayor of St. George, elected in November 2025 after serving on the city council since 2011, and took office in January 2026. He leads one of the fastest-growing cities in one of the fastest-growing counties in the nation — St. George is projected to add more than 175,000 residents over 25 years and Washington County's population is expected to double past 400,000 by 2050. His tenure opens against the region's two defining pressures: a chronic water shortage (2025 was the county's second-driest year on record) and a housing squeeze that county leaders now say rivals water as the top concern. St. George's mayor is a nonpartisan office.",
    acctSummary: "St. George's mayor, elected in 2025 to lead a booming city where water and housing are the central fights. Hughes campaigned on measured growth — calling the boom 'both a blessing and a curse' and urging the city not to 'bow to every pressure to go do something bigger and better' — and on accountability, telling a debate that 'leadership starts at the top' during an exchange over a proposed public-safety property-tax increase. He inherits a city that leans heavily on sales tax and a county that has held its property-tax rate flat for 16 years, so how he balances service demands against that low-tax posture — and how he secures water for the growth he manages — is the core of his early record. Positions are documented from the 2025 race; his governing votes as mayor are still being written.",
    theme: "St. George's new mayor leads a national-fastest-growth city where water and housing are the defining fights — running on measured growth ('a blessing and a curse') and accountability on a contested public-safety tax.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Elected mayor of one of the nation's fastest-growing cities",
        facts: "Hughes, a St. George city councilor since 2011, won the November 2025 mayoral race over incumbent Michele Randall and took office in January 2026. He leads a city projected to add more than 175,000 residents over the next 25 years, within a county expected to double past 400,000 by 2050.",
        why: "Establishes the office and the scale of the growth pressures his decisions will be judged against.",
        source: SRC.kuer_result },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Frames the boom as 'a blessing and a curse' and urges restraint",
        facts: "During the 2025 campaign Hughes described St. George's explosive growth as 'both a blessing and a curse' and argued for restraint: 'Let's not bow to every pressure to go do something bigger and better.' He and Randall largely shared a vision of managing rather than halting growth.",
        why: "His own framing of the central tension of the job — how fast a fast-growing city should let itself grow.",
        source: SRC.kuer_debate },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Pressed accountability on a proposed public-safety property-tax increase",
        facts: "At an October 2025 debate, a proposed property-tax increase to fund public safety became the race's sharpest divide. When Randall said the increase 'was brought to us by our budget team and our city manager … That was not my idea,' Hughes countered that 'leadership starts at the top,' pinning responsibility for the city's budget choices on its top elected official.",
        why: "Marks where he drew a line on fiscal accountability — a standard voters can hold him to now that the budget is his.",
        source: SRC.kuer_debate },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'water',
        headline: "Inherits a low-tax city where water is the No. 1 issue and housing now rivals it",
        facts: "St. George relies heavily on sales-tax revenue, and Washington County leaders tout 16 consecutive years without raising the county property-tax rate. At the 2026 State of the County, officials said housing has become a top concern rivaling water — the perennial No. 1 issue in a county coming off its second-driest year on record.",
        why: "Context for the squeeze Hughes must manage: sustaining services and securing water without abandoning the region's low-tax identity.",
        source: SRC.stg_address },
    ],
    stances: {
      'Growth, Housing & Land Use': "Elected to lead a national-fastest-growth city; favors managing growth with restraint — 'a blessing and a curse' — rather than chasing every 'bigger and better' pressure.",
      'Property Taxes & County Budget': "Pressed accountability on a proposed public-safety property-tax increase ('leadership starts at the top') in a city that leans on sales tax and a county with 16 years of a flat property-tax rate.",
      'Water, Great Salt Lake & Environment': "Inherits water as the region's No. 1 issue after the county's second-driest year on record, with housing now rivaling it as a top concern.",
      'Local Government Transparency & Accountability': "Ran on placing responsibility for the city's budget and growth choices squarely on its top elected leadership.",
    },
    stanceCards: [
      { topic: 'Managed Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Leads one of the nation's fastest-growing cities and calls the boom 'both a blessing and a curse,' urging St. George not to 'bow to every pressure to go do something bigger and better.'", source: SRC.kuer_debate },
      { topic: 'Public-Safety Tax Accountability', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "On a proposed public-safety property-tax increase, argued 'leadership starts at the top' — pinning budget responsibility on the mayor's office in a city that relies mostly on sales tax.", source: SRC.kuer_debate },
      { topic: 'Water Security', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support', text: "Inherits water as Washington County's No. 1 issue after its second-driest year on record, with housing now rivaling it as a top concern.", source: SRC.stg_address },
      { topic: '2025 Mayoral Win', icon: '🗳', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "A city councilor since 2011, elected St. George mayor in Nov. 2025 over the incumbent and took office Jan. 2026 to lead a county expected to double past 400,000 by 2050.", source: SRC.kuer_result },
    ],
  },

  // ══════════ Roger Armstrong — Summit County Council (Dakota Pacific / local control) ══════════
  roger_armstrong_summit: {
    create: true,
    name: 'Roger Armstrong',
    office: '🏛 Summit County Council (Vice Chair)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 63,
    keyIssues: ['Growth, Housing & Land Use', 'Local Government Transparency & Accountability', 'Property Taxes & County Budget'],
    bio: "Roger Armstrong is a member of the Summit County Council, first elected in 2013 and serving as vice chair in 2026 — the council's second-longest-serving member. He has been a central voice in the county's multi-year fight over the Dakota Pacific development at Kimball Junction, a clash that became a statewide test of local control after the Legislature intervened to force a project Summit County had resisted. Summit County Council seats are partisan; Armstrong is a Democrat.",
    acctSummary: "One of Summit County's longest-serving councilmembers and a lead voice in the Dakota Pacific / Kimball Junction saga. Summit County first sued the state over an earlier law and won an early ruling, but in 2025 the Legislature passed a new law routing Dakota Pacific's 885-unit project through an administrative process that bypassed a voter referendum, and the county manager signed the agreement in July 2025 — a December 2025 council vote members said was cast 'under duress.' Armstrong's documented position is that the project's merits were overshadowed by how it was imposed: he has said that but for the Legislature forcing it, he would be 'very, very excited' about the associated redevelopment. His record here is about local-control accountability under state pressure, stated in his own words.",
    theme: "A long-serving Summit County councilman at the center of the Dakota Pacific fight — supportive of good development, but pointed that the Legislature 'forced' the project over the county's objections and a voter referendum.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_balance',
        headline: "Says the Legislature 'forced' the Dakota Pacific project on the county",
        facts: "Discussing a neighboring Kimball Junction redevelopment in March 2026, Armstrong said, 'If the Legislature had not forced the Dakota Pacific project, which is essentially what happened, I would be actually, very, very excited about this' — separating his enthusiasm for good development from his objection to how the state overrode local decision-making.",
        why: "His clearest statement that the grievance is process and local control, not development itself — the through-line of the whole fight.",
        source: SRC.kpcw_shadow },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Part of a council that approved Dakota Pacific 'under duress' after losing local control",
        facts: "Summit County sued the state and the developer over an earlier law and won an early ruling that it didn't apply to Kimball Junction. But a 2025 state law then routed the 885-unit project through an administrative process — approved by the county manager, not the elected council, and shielded from a voter referendum — and the manager signed the development agreement in July 2025. The council's December 2025 vote was described as cast 'under duress from state legislators.'",
        why: "Documents the mechanism by which the county lost control of a project it had fought — the backdrop against which Armstrong's votes and statements are measured.",
        source: SRC.kpcw_approve },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Separates good planning from imposed development",
        facts: "Even while objecting to the state's role, Armstrong praised the design of the adjacent Junction Commons redevelopment as 'a great vision … a good plan,' and criticized existing big-box parking lots nearby as a 'design disaster' — showing his opposition was to the imposition of Dakota Pacific, not to density or redevelopment as such.",
        why: "Guards against caricature: his record supports well-planned growth while resisting state preemption of local review.",
        source: SRC.kpcw_shadow },
    ],
    stances: {
      'Local Government Transparency & Accountability': "Says the Legislature 'forced' the Dakota Pacific project on Summit County — routing it around the elected council and a voter referendum — and centers the fight on local control, not the development itself.",
      'Growth, Housing & Land Use': "Supports well-planned redevelopment (calling nearby plans 'a great vision') while opposing state preemption of local land-use review.",
      'Property Taxes & County Budget': "A long-serving councilmember (since 2013) helping steer county finances through a period of state-driven growth pressure.",
    },
    stanceCards: [
      { topic: "Legislature 'Forced' Dakota Pacific", icon: '⚖️', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose', text: "'If the Legislature had not forced the Dakota Pacific project, which is essentially what happened, I would be actually, very, very excited' — objects to the state overriding local land-use control.", source: SRC.kpcw_shadow },
      { topic: 'Approved Under Duress', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Sat on a council that approved the 885-unit project 'under duress' after a 2025 state law routed it around the elected council and a voter referendum; the manager signed it July 2025.", source: SRC.kpcw_approve },
      { topic: 'Good Planning, Not Preemption', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Praised adjacent redevelopment as 'a great vision … a good plan' while opposing how Dakota Pacific was imposed — supports density done through local review, not state mandate.", source: SRC.kpcw_shadow },
    ],
  },

  // ══════════ Canice Harte — Summit County Council Chair (Dakota Pacific / traffic) ══════════
  canice_harte_summit: {
    create: true,
    name: 'Canice Harte',
    office: '🏛 Summit County Council (Chair)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Canice Harte is the chair of the Summit County Council for 2026, representing District 5 (Jeremy Ranch and Pinebrook) after the county moved to district-based elections. First elected in 2022, he has focused on growth, traffic, and open space in the Snyderville Basin — the area at the center of the Dakota Pacific / Kimball Junction development that state law forced through over local objections. Summit County Council seats are partisan; Harte is a Democrat.",
    acctSummary: "The 2026 chair of the Summit County Council, representing the fast-growing Kimball Junction side of the county. Harte's documented emphasis is traffic: as new projects stack up next to the state-forced Dakota Pacific development, he has said plainly that 'for the life of me, I can't figure out how we're going to deal with all the traffic and the cars' — putting congestion and infrastructure ahead of adding housing units the area can't yet move. He leads a council still absorbing the loss of local control over Dakota Pacific. His record as chair is early; the position captured here is his stated infrastructure-first caution on further Kimball Junction growth.",
    theme: "Summit County's 2026 council chair leads the Kimball Junction area with an infrastructure-first caution — pressing that traffic be solved before more housing is stacked onto the state-forced Dakota Pacific project.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'infrastructure',
        headline: "Puts traffic ahead of more Kimball Junction housing",
        facts: "As a redevelopment project (Junction Commons) advanced next to the Dakota Pacific site, Harte said on KPCW in March 2026, 'This would be another project on top of that, and for the life of me, I can't figure out how we're going to deal with all the traffic and the cars' — echoing residents whose top concern at hearings has been congestion before any new housing.",
        why: "His central, sourced position: infrastructure capacity — especially traffic — must come before more density in the basin.",
        source: SRC.kpcw_shadow },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Elected 2026 chair of the Summit County Council",
        facts: "The council unanimously named Harte its chair for 2026 (with Armstrong as vice chair). He represents the newly drawn District 5 — Jeremy Ranch and Pinebrook — after the county replaced two decades of at-large seats with five geographic districts.",
        why: "Establishes his leadership role and the district he answers to as the county navigates the Dakota Pacific aftermath.",
        source: SRC.pr_harte_chair },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_balance',
        headline: "Serves on a council whose Dakota Pacific control was overridden by the state",
        facts: "The council Harte now chairs saw the 885-unit Dakota Pacific project routed through an administrative process by a 2025 state law that bypassed both the elected council and a voter referendum; the county manager signed the agreement in July 2025 after Summit County had sued to stop it.",
        why: "Context for his caution on further growth: the basin's biggest project was imposed from the state, not chosen locally.",
        source: SRC.kpcw_approve },
    ],
    stances: {
      'Growth, Housing & Land Use': "Presses an infrastructure-first line on Kimball Junction — traffic must be solved before more housing is added on top of the state-forced Dakota Pacific project.",
      'Local Government Transparency & Accountability': "Chairs a council whose control over its largest development was overridden by state law; represents District 5 under the county's new district-based system.",
    },
    stanceCards: [
      { topic: 'Traffic Before More Housing', icon: '🚗', pos: 'mixed', issueKey: 'infrastructure', issueStance: 'mixed', text: "'For the life of me, I can't figure out how we're going to deal with all the traffic and the cars' — puts congestion and infrastructure ahead of stacking more housing onto Kimball Junction.", source: SRC.kpcw_shadow },
      { topic: '2026 Council Chair', icon: '🗳', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Unanimously elected 2026 chair of the Summit County Council, representing new District 5 (Jeremy Ranch / Pinebrook) after the county moved to district-based seats.", source: SRC.pr_harte_chair },
      { topic: 'Dakota Pacific Overridden', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed', text: "Chairs a council whose Dakota Pacific control was overridden by a 2025 state law that bypassed the elected board and a voter referendum; the manager signed the deal in July 2025.", source: SRC.kpcw_approve },
    ],
  },

  // ══════════ Heidi Hammond — Grantsville Mayor (Tooele County: Six Mile annexation) ══════════
  heidi_hammond_grantsville: {
    create: true,
    name: 'Heidi Hammond',
    office: '🏛 Grantsville (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "Heidi Hammond is the mayor of Grantsville, the first woman to hold the office, who took office in January 2026 after serving on the city council. She leads a fast-growing Tooele County city defined by a yearslong fight to annex roughly 7,800 acres known as the Six Mile Ranch area near the I-80 and Midvalley Highway corridors — a battle opposed by the neighboring young city of Erda, litigated to the Utah Supreme Court, and now the subject of a Grantsville lawsuit against the Lieutenant Governor. Grantsville's mayor is a nonpartisan office.",
    acctSummary: "Grantsville's first female mayor, inheriting and continuing the city's central controversy: the Six Mile annexation. Grantsville accepted the ~7,800-acre petition in 2021 and approved it in 2022, betting the land's proximity to I-80 and the Midvalley Highway will bring commercial growth and tax revenue; Erda's community association and city fought it as a threat to their rural identity. The Utah Supreme Court affirmed dismissal of the challenge in November 2025, and weeks after Hammond took office Grantsville sued Lt. Gov. Deidre Henderson over the delayed certification. Hammond has been candid about a personal wrinkle — the land is owned by three brothers, one of them her father — saying 'this is very complicated for me' and that she does not stand to gain personally, while maintaining the annexation benefits the city.",
    theme: "Grantsville's first female mayor is pressing a contested ~7,800-acre annexation to the Utah Supreme Court and beyond — betting on growth and tax revenue while being openly candid about a family conflict of interest.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_balance',
        headline: "Continues Grantsville's fight to annex the Six Mile area",
        facts: "Grantsville accepted the petition to annex roughly 7,800 acres — including Six Mile Ranch, near state routes 112 and 138 — in 2021 and passed an approving ordinance in 2022. Hammond, taking office in January 2026, has kept the city on that course: 'The city has previously concluded, and still believes, that the Six Mile annexation is a benefit for the city and its inhabitants.'",
        why: "States her governing position on the defining Grantsville controversy in her own words.",
        source: SRC.ksl_grants },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Bets on growth and tax revenue from the I-80 / Midvalley corridor",
        facts: "Though the land is rural today, Hammond points to its proximity to the I-80 corridor and the adjacent Midvalley Highway, saying 'we can obviously tell that there will be opportunities at some point that would be good for Grantsville city' — commercial development that could expand the city's tax base as Tooele County booms.",
        why: "The economic rationale voters can weigh: near-term rural land annexed for long-term commercial tax revenue.",
        source: SRC.ksl_grants },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Candid about a family conflict of interest in the annexation",
        facts: "Hammond has acknowledged that the land at issue is owned by three brothers, one of them her father, calling it 'very complicated for me' and stating she does not stand to gain personally from the annexation even as she defends it as good for the city.",
        why: "A voluntary disclosure of a personal stake on a decision she is advancing — a transparency marker to hold her to.",
        source: SRC.ksl_grants },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_balance',
        headline: "Grantsville sued the Lt. Governor to finalize the annexation",
        facts: "After the Utah Supreme Court affirmed dismissal of the challenge on Nov. 20, 2025, Grantsville filed suit against Lt. Gov. Deidre Henderson over a delay in certifying the annexation — weeks after Hammond took office. Erda's community association and city council have continued to oppose the annexation, with Erda voting in January to join related litigation.",
        why: "Shows how far the city is willing to litigate the annexation, and that the fight with Erda remains active on Hammond's watch.",
        source: SRC.ksl_grants },
    ],
    stances: {
      'Growth, Housing & Land Use': "Defends and continues Grantsville's contested ~7,800-acre Six Mile annexation as a benefit to the city, over sustained opposition from neighboring Erda.",
      'Property Taxes & County Budget': "Bets the annexed land's proximity to I-80 and the Midvalley Highway will bring commercial development and tax revenue as Tooele County grows.",
      'Local Government Transparency & Accountability': "Publicly disclosed a family conflict of interest in the annexation ('this is very complicated for me') and backed suing the Lt. Governor to finalize it.",
    },
    stanceCards: [
      { topic: 'Six Mile Annexation', icon: '🏗', pos: 'support', issueKey: 'gov_balance', issueStance: 'support', text: "Continues Grantsville's fight for the ~7,800-acre Six Mile annexation — 'a benefit for the city and its inhabitants' — over Erda's opposition, now litigated past the Utah Supreme Court.", source: SRC.ksl_grants },
      { topic: 'Growth & Tax Revenue', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Bets rural land near the I-80 / Midvalley corridor will bring commercial 'opportunities … good for Grantsville city' and a bigger tax base as Tooele County booms.", source: SRC.ksl_grants },
      { topic: 'Conflict-of-Interest Candor', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Disclosed that the annexed land is owned by three brothers, one her father — 'this is very complicated for me' — and says she does not stand to gain personally.", source: SRC.ksl_grants },
      { topic: 'Suit vs. Lt. Governor', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed', text: "After the Utah Supreme Court sided with Grantsville (Nov. 2025), the city sued Lt. Gov. Henderson over delayed certification — weeks into Hammond's term.", source: SRC.ksl_grants },
    ],
  },

  // ══════════ Paul Cozzens — Iron County Commission (Pine Valley water) ══════════
  paul_cozzens_iron: {
    create: true,
    name: 'Paul Cozzens',
    office: '🏛 Iron County Commission',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 57,
    keyIssues: ['Water, Great Salt Lake & Environment', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Paul Cozzens is an Iron County commissioner and the county's leading elected champion of the Pine Valley Water Supply Project. A Cedar City councilman from 2011 to 2019 and longtime liaison to the Central Iron County Water Conservancy District (now Cedar Valley Water), he has worked for years to secure imported groundwater for Cedar Valley, which has no major rivers and depends entirely on a declining aquifer. He calls water 'the most important issue in Iron County.'",
    acctSummary: "Iron County's most persistent elected advocate for the Pine Valley Water Supply Project — a 66-mile pipeline, 15 wells and a 200-acre solar field to import West Desert groundwater to Cedar Valley, where communities pump about 7,000 acre-feet a year more than the aquifer recharges and face up to 75% cuts in groundwater rights by 2070. When the Bureau of Land Management approved the project in early 2026, Cozzens called it a 'massive milestone' and 'a critical investment in the long-term future of Iron County,' while noting 'there is still work ahead.' The project is genuinely contested: ranchers, the Indian Peaks Band of Paiute, environmental groups and Beaver County oppose it over aquifer and senior-water-rights impacts, and critics warn its ~$260 million-plus cost could sharply raise water rates. Cozzens' record is a clear, sourced pro-supply position on a real tradeoff.",
    theme: "Iron County's leading water advocate secured federal approval for the Pine Valley pipeline he's championed for years — a 'massive milestone' for Cedar Valley's supply that ranchers, tribes and Beaver County fight over aquifer impacts and cost.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'water',
        headline: "Hailed federal approval of the Pine Valley pipeline as a 'massive milestone'",
        facts: "After the BLM approved the Pine Valley Water Supply Project in early 2026, Cozzens called it a 'massive milestone' for Iron County: 'We often take for granted that when we turn on the faucet, water comes out. But that reliability doesn't happen by accident.' He added, 'There is still work ahead before we see this resource physically delivered to our basin. However, this decision represents a huge step forward and a critical investment in the long-term future of Iron County.'",
        why: "His clearest on-record endorsement of the project and its rationale at the moment it cleared federal review.",
        source: SRC.abc4_blm },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'water',
        headline: "Frames water as Iron County's most important issue",
        facts: "Cedar Valley — Cedar City, Enoch and Kanarraville — has no major rivers and relies entirely on wells, and its aquifer has been over-pumped for decades (about 7,000 acre-feet a year beyond recharge). Under a state groundwater management plan, valley water-right holders face up to a 75% reduction by 2070. Cozzens, a longtime water-district liaison, has said water is 'the most important issue in Iron County' and worked for years to secure West Desert water rights for the valley.",
        why: "Establishes the supply crisis driving his advocacy and his long personal involvement in it.",
        source: SRC.sltrib_pause },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'enviro_balance',
        headline: "Advances a project ranchers, tribes and Beaver County strongly oppose",
        facts: "The Pine Valley plan — 15 wells, a 66-mile pipeline and a 200-acre solar farm to pump Basin 14 groundwater to Cedar Valley — is opposed by local ranchers with senior water rights, the Indian Peaks Band of Paiute, environmental groups, and Beaver, Millard, Juab and Tooele county interests worried about far-reaching aquifer effects. Critics also warn its projected cost (about $260 million and rising) could drive steep water-rate increases for Iron County ratepayers.",
        why: "Records the real tradeoff Cozzens is choosing: Cedar Valley supply security against downstream water-rights, environmental, and cost objections.",
        source: SRC.ksl_slam },
    ],
    stances: {
      'Water, Great Salt Lake & Environment': "Iron County's leading advocate for the Pine Valley pipeline to import West Desert groundwater — calling its 2026 federal approval a 'massive milestone' for a valley that over-pumps its only aquifer.",
      'Growth, Housing & Land Use': "Backs securing new water supply as the precondition for Cedar Valley's continued growth, given up to 75% groundwater-right cuts looming by 2070.",
      'Local Government Transparency & Accountability': "Advances the project through the water district and county despite opposition from ranchers, the Indian Peaks Band of Paiute, and Beaver County over aquifer impacts and cost.",
    },
    stanceCards: [
      { topic: 'Pine Valley Pipeline', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support', text: "Iron County's leading champion of the 66-mile Pine Valley pipeline; called its 2026 federal approval a 'massive milestone' and 'a critical investment in the long-term future of Iron County.'", source: SRC.abc4_blm },
      { topic: 'Water = Top Priority', icon: '🚰', pos: 'support', issueKey: 'water_storage', issueStance: 'support', text: "Calls water 'the most important issue in Iron County' — Cedar Valley has no major rivers, over-pumps its aquifer ~7,000 acre-feet/yr, and faces up to 75% groundwater-right cuts by 2070.", source: SRC.sltrib_pause },
      { topic: 'Supply vs. Impact Tradeoff', icon: '⚖️', pos: 'mixed', issueKey: 'enviro_balance', issueStance: 'mixed', text: "Advances the wells-and-pipeline plan over opposition from ranchers, the Indian Peaks Band of Paiute and Beaver County, and critics' warnings of ~$260M+ cost and steep rate hikes.", source: SRC.ksl_slam },
    ],
  },

  // ══════════ Heidi Franco — Heber City Mayor (Wasatch County: bypass / North Fields) ══════════
  heidi_franco_heber: {
    create: true,
    name: 'Heidi Franco',
    office: '🏛 Heber City (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 62,
    keyIssues: ['Growth, Housing & Land Use', 'Water, Great Salt Lake & Environment', 'Local Government Transparency & Accountability', 'Property Taxes & County Budget'],
    bio: "Heidi Franco is the mayor of Heber City, re-elected to a second term in November 2025. She leads a valley that has quadrupled in population since 1990 to more than 19,000 residents, and she has made open-space protection and responsible growth the center of her tenure — most visibly in opposing the Utah Department of Transportation's preferred route for the Heber Valley bypass, which would cut through the North Fields wetlands that have been farmed for generations. Heber City's mayor is a nonpartisan office.",
    acctSummary: "Heber City's mayor, re-elected in 2025, whose defining fight is the Heber Valley bypass. UDOT's preferred 'Alternative B' would run the new highway through the North Fields — freshwater wetlands and generational farmland — and Franco has consistently backed 'Alternative A' to keep the road nearer U.S. 40 and preserve open space, tying it to a campaign promise. She has also challenged UDOT's process directly, disputing the state's cost and environmental claims. Beyond the route, she is working with Wasatch County to write North Fields protections into annexation policy to prevent the highway from unleashing new development, while being candid that conserving the land could approach a $100 million valuation. Her record is a clear, sourced, open-space-first line on the county's biggest infrastructure decision.",
    theme: "Heber City's re-elected mayor has made open-space protection her defining fight — opposing UDOT's North Fields bypass route, challenging the state's cost claims, and writing wetland protections into growth policy.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'lands_preserve',
        headline: "Backs the bypass route that spares the North Fields open space",
        facts: "After UDOT named 'Alternative B' — cutting through the North Fields wetlands — its preferred bypass route in January 2026, Franco backed 'Alternative A,' which keeps traffic on U.S. 40 longer before diverting west of downtown. 'There's many reasons I support that, but please remember, I keep my campaign promises to protect open space, and that is a major thing,' she said. 'Route A will protect that open space.'",
        why: "Her core, sourced position on Wasatch County's biggest infrastructure decision, tied to an explicit campaign promise.",
        source: SRC.ksltv_bypass },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Challenges UDOT's cost and environmental-study claims",
        facts: "Franco has criticized the state's review of the bypass directly: 'As mayor of Heber City, I've always been concerned about Route B. UDOT promised that it would be less expensive. It's not,' she said, adding, 'I've been after UDOT for years to make sure that they did the environmental studies they needed to.' Local leaders argued the water studies were inadequate and didn't use local data.",
        why: "Documents her willingness to contest the state agency's factual case, not just its preferred route.",
        source: SRC.ksltv_bypass },
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'lands_local',
        headline: "Works to write North Fields protections into growth policy",
        facts: "Franco has worked with Wasatch County to strengthen protections against annexation and development in the North Fields ahead of bypass construction, seeking to firm up a 2019 memorandum that such changes 'should be avoided.' 'I'm excited for that to be put into our annexation policy,' she said. 'I think it will show tremendous good faith with all of the open space advocates as well as the private property owners in the North Fields.'",
        why: "Shows she is trying to prevent the highway from triggering the very sprawl residents fear — a concrete, checkable policy step.",
        source: SRC.pr_northfields },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Candid about the steep cost of conserving the land",
        facts: "Franco has been frank that permanently protecting the North Fields is expensive, estimating the land between existing U.S. 40 and the bypass route could be valued near $100 million, with conservation easements 'usually half the value of that' — a 'ginormous project.' She has framed conservation as worth pursuing while acknowledging the price.",
        why: "A nuanced marker: she wants preservation but is honest that it carries a large public cost, not a free win.",
        source: SRC.pr_northfields },
    ],
    stances: {
      'Growth, Housing & Land Use': "Opposes UDOT's North Fields bypass route and works to bar annexation/development in the wetlands, favoring responsible growth that protects open space and builds roads to match.",
      'Water, Great Salt Lake & Environment': "Champions protecting the North Fields freshwater wetlands and challenged the adequacy of UDOT's environmental and water studies.",
      'Local Government Transparency & Accountability': "Publicly contests UDOT's cost and study claims and pushes to codify North Fields protections in annexation policy.",
      'Property Taxes & County Budget': "Candid that conserving the North Fields could approach a $100M valuation — pursuing preservation while acknowledging its public cost.",
    },
    stanceCards: [
      { topic: 'North Fields Bypass Route', icon: '🌾', pos: 'oppose', issueKey: 'lands_preserve', issueStance: 'oppose', text: "Backs 'Alternative A' over UDOT's preferred North Fields route — 'I keep my campaign promises to protect open space … Route A will protect that open space.'", source: SRC.ksltv_bypass },
      { topic: 'Challenges UDOT', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Disputes the state's case: 'UDOT promised that it would be less expensive. It's not,' and says she's pushed UDOT 'for years' to do adequate environmental studies.", source: SRC.ksltv_bypass },
      { topic: 'Codify Wetland Protections', icon: '🏗', pos: 'support', issueKey: 'lands_local', issueStance: 'support', text: "Working with Wasatch County to bar annexation/development in the North Fields — 'tremendous good faith with … open space advocates as well as the private property owners.'", source: SRC.pr_northfields },
      { topic: 'Cost of Conservation', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Candid that protecting the North Fields is a 'ginormous project' — land valued near $100M, easements 'usually half' that — worth pursuing but not free.", source: SRC.pr_northfields },
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
  out.push('    // ── Utah high-salience counties · Batch 5 (July 2026) ─────────────────────────');
  out.push('    // Extends the county-by-county pass to Washington (St. George), Summit, Tooele,');
  out.push('    // Iron (Cedar City), and Wasatch (Heber) — the defining, sourced controversy in');
  out.push('    // each: St. George growth/water/public-safety tax (Hughes); the Dakota Pacific');
  out.push('    // local-control fight (Armstrong, Harte); the Grantsville Six Mile annexation');
  out.push('    // (Hammond); the Pine Valley water pipeline (Cozzens); and the Heber North Fields');
  out.push('    // bypass (Franco). All currently seated, elected officials.');
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
  console.log(`PolitiDex — Utah high-salience counties deep dive (batch 5: Washington/Summit/Tooele/Iron/Wasatch)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  // ISSUE_MAP was extracted from index.html into alignment-tool.js — read it there.
  try {
    const js = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = js.slice(js.indexOf('var ISSUE_MAP = {'), js.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
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
    const f = '/tmp/five-counties-batch5-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, enriched = 0, existed = 0, totSpot = 0, totStance = 0;

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
