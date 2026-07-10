#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Rural / small counties deep dive, BATCH 8 (July 2026)
//
// Continues the county-by-county push into rural Utah — the last major coverage
// gap flagged in the audit — finishing the high-salience small counties with a
// controversy-first pass anchored on the fights that actually define them:
// energy, federal lands, water, and the coal transition. Every record is a
// CURRENTLY SEATED, ELECTED official (here, county commissioners — the natural
// locus of these resource fights) with a sourced, quoted position.
//
//   • BEAVER COUNTY — the Pine Valley water fight, from the OTHER side. CREATE
//     Tammy Pearson (Commission): Beaver opposes Iron County's ~$260M pipeline to
//     pump West Desert groundwater to Cedar City — the direct counterpart to Iron
//     County's Paul Cozzens (Batch 5). "It robs future generations of the ability
//     to farm, ranch, hunt, fish and recreate in the West Desert."
//   • DUCHESNE COUNTY — the Uinta Basin Railway. CREATE Greg Miles (Commission),
//     who sits on the Seven County Infrastructure Coalition board and hailed the
//     May 2025 Supreme Court win for the $1.5B crude-by-rail line as "a win for
//     the United States."
//   • EMERY COUNTY — the coal-to-nuclear transition. CREATE Jordan Leonard
//     (Commission): the Hunter/Huntington plants are ~60% of county property-tax
//     revenue, and Emery is now a candidate for new nuclear (Valar Atomics at the
//     San Rafael Energy Research Center); Leonard cited a ~63% resident survey in
//     favor at a June 2025 public hearing.
//   • GRAND COUNTY (MOAB) — tourism economics vs. housing/livability. CREATE
//     Mary McGann (Commission): amid a state-driven restructuring that fenced off
//     tourism (transient-room-tax) dollars from housing and roads, she pushed to
//     earmark affordable-housing money — "setting aside money for a goal pushes
//     things forward."
//   • MILLARD COUNTY — the IPP energy transition. CREATE Dean Draper
//     (Commission): the Intermountain Power Project's coal-to-hydrogen "IPP
//     Renewed" (new units online July 2025) is a generational local economic
//     engine; Draper called it "a boon for Millard County."
//
// FACET / NUANCE MODELING: two-sided records are pos:'mixed' — Miles' economic-
// development-vs-environmental-review railway; Leonard's coal-legacy-vs-nuclear-
// future; McGann's tourism-economy-vs-housing tension; Draper's transition-boon-
// vs-coal-unit-uncertainty. Clear positions (Pearson opposing the pipeline) stay
// oppose/support.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • SAN JUAN COUNTY — the highest-profile rural controversy (the Native-
//     majority commission + Bears Ears + a 2025 Trump boundary review), but this
//     pass found NO current, individually-sourced quote from a sitting
//     commissioner (Stubbs/Maughan/Harvey) on it. The historic representation
//     record belongs to former commissioners (Maryboy/Grayeyes). Named and
//     tracked; NOT built on invented current positions.
//   • Carbon County shares the coal-transition story (and is a Seven County
//     Coalition member) but its most-quoted commissioner (Lynn Sitterud) is
//     RETIRED; tracked, not stubbed on a former official.
//   • Sanpete, Sevier, Juab, Kane, Garfield, Daggett, Wayne, Piute, Rich, Morgan
//     — smaller populations without a defining, individually-sourced current
//     controversy in this pass. Named for later waves.
//   • Sheriff / mayor / school-board tiers: in these counties the defining fights
//     are resource/land/energy matters that run through the COMMISSION; no
//     sourced sheriff/mayor/school-board controversy surfaced, so none is
//     fabricated to fill the office list.
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • tammy_pearson_beaver   — Beaver County Commission (R). Opposes Pine Valley.  → CREATE
//   • greg_miles_duchesne    — Duchesne County Commission (R); 7-County Coalition.  → CREATE
//   • jordan_leonard_emery   — Emery County Commission (R). Coal→nuclear.           → CREATE
//   • mary_mcgann_grand      — Grand County Commission (D, Moab). Housing/tourism.   → CREATE
//   • dean_draper_millard    — Millard County Commission (R). IPP Renewed.          → CREATE
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source verified
//     during research (KSL, Salt Lake Tribune, Utah News Dispatch, Deseret News,
//     ETV News, Moab Sun News / Times-Independent, KUER, ABC4).
//   • Individual lens, not party. County-commission seats are partisan and labeled
//     as plain metadata (four R, one D); each card is written to the individual's
//     own words/actions. The 8-0 SCOTUS railway ruling and the ~63% Emery survey
//     are stated as plain facts.
//   • Attribution discipline: the coal-plant retirement-date reversals are
//     PacifiCorp's; the ~$260M pipeline cost and aquifer-impact claims are the
//     opposition coalition's; Draper's "boon" quote is honestly dated to 2022 with
//     the 2025 IPP-Renewed status attributed to the project/state.
//   • Idempotent & non-destructive: CREATE only where nothing exists (all five
//     audited absent before writing).
//
//   node scripts/deep-dive-rural-counties-batch8-jul2026.mjs            # dry run
//   node scripts/deep-dive-rural-counties-batch8-jul2026.mjs --emit     # write stance block to /tmp
//   node scripts/deep-dive-rural-counties-batch8-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-10T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  // Beaver — Pine Valley water
  ksl_pinevalley: { label: 'KSL', url: 'https://www.ksl.com/article/50364770/clearly-a-litany-of-impacts-groups-slam-proposed-iron-county-water-pipeline' },
  stg_appeal:     { label: 'St. George News', url: 'https://www.stgeorgeutah.com/news/coalition-files-appeal-opposing-blms-approval-of-pine-valley-water-project-pipeline-to-cedar-city/article_3cb5b4dc-115d-4681-82e1-2e5a1011f538.html' },
  ksl_waterwar:   { label: 'KSL', url: 'https://www.ksl.com/article/50361114/the-new-water-war-of-the-west-has-utah-counties-in-bitter-fight' },
  // Duchesne — Uinta Basin Railway
  sltrib_ubr:     { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/environment/2025/05/29/uinta-basin-railway-supreme-court/' },
  und_ubr:        { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/06/13/uinta-basin-railway-funding/' },
  // Emery — coal to nuclear
  etv_nuclear:    { label: 'ETV News', url: 'https://etvnews.com/articles/featured/emery-county-hosts-nuclear-public-hearing/' },
  deseret_nuke:   { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/06/18/nuclear-power-utah-energy/' },
  und_coal:       { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/01/21/pacificorp-extends-the-life-of-utah-coal-powered-plants-indefinitely/' },
  // Grand — Moab housing/tourism
  moab_housing:   { label: 'Moab Sun News', url: 'https://moabsunnews.com/2025/02/07/meeting-at-a-glance-grand-county-commission-february-4-2025/' },
  moab_restruct:  { label: 'The Times-Independent', url: 'https://www.moabtimes.com/articles/grand-county-faces-challenging-year-for-economic-development-after-restructuring/' },
  // Millard — IPP
  sltrib_ipp:     { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2022/04/29/plan-fill-giant-utah/' },
  ipp_renewed:    { label: 'IPP Renewed', url: 'https://ipprenewed.com/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Tammy Pearson — Beaver County Commission (Pine Valley water opposition) ══════════
  tammy_pearson_beaver: {
    create: true,
    name: 'Tammy Pearson',
    office: '🏛 Beaver County Commission',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Water, Great Salt Lake & Environment', 'Rural Utah & Agriculture', 'Local Government Transparency & Accountability'],
    bio: "Tammy Pearson is a Beaver County commissioner and one of the county's leading voices against the Pine Valley Water Supply Project — Iron County's roughly $260 million plan to pump West Desert groundwater 70-plus miles to Cedar City. Beaver County argues the water Iron County wants is already spoken for and that draining the aquifer would gut its ranching, wildlife, and future. She represents the opposing side of the same fight Iron County commissioner Paul Cozzens champions.",
    acctSummary: "A Beaver County commissioner fighting the Pine Valley pipeline that neighboring Iron County (and its Cedar Valley Water district) won federal approval to build in 2026. Beaver County joined a coalition — with the Indian Peaks Band of Paiute, ranchers, environmental groups, and other West Desert counties — that appealed the BLM's March 2026 record of decision, arguing the ~15,000-acre-foot withdrawal would harm senior water rights, the West Desert, and connected systems from the Great Salt Lake to Nevada. Pearson frames it as defending a finite rural resource: the project 'robs future generations of the ability to farm, ranch, hunt, fish and recreate in the West Desert.' Her record is a clear, sourced defense of local water against an exporting neighbor — the direct counterpart to Cozzens' pro-supply case.",
    theme: "A Beaver County commissioner leads the fight against Iron County's Pine Valley pipeline, defending West Desert water for ranching and wildlife against a neighbor's plan to pump it to Cedar City.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'water',
        headline: "Opposes the Pine Valley pipeline as a threat to the West Desert",
        facts: "Pearson has argued the Pine Valley Water Supply Project — Iron County's plan to pump groundwater from Beaver County's West Desert to Cedar City — 'doesn't just harm our residents, it robs future generations of the ability to farm, ranch, hunt, fish and recreate in the West Desert.' Beaver County contends the water simply is not sustainably available to export.",
        why: "Her core, sourced position defending a finite rural resource against an exporting neighbor.",
        source: SRC.stg_appeal },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'rural_ag',
        headline: "Backed the appeal of the BLM's pipeline approval",
        facts: "After the BLM issued a March 2026 record of decision approving the ~$260 million, 70-plus-mile pipeline, Beaver County joined a coalition — with the Indian Peaks Band of Paiute, ranchers, and environmental groups — that filed a 528-page appeal to the Interior Board of Land Appeals seeking to halt it, citing harm to senior water rights and far-reaching aquifer effects.",
        why: "Ties her stated opposition to a concrete legal action on behalf of the county's ranchers and future users.",
        source: SRC.stg_appeal },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'enviro_balance',
        headline: "Argues the impacts reach far beyond Beaver County",
        facts: "Beaver County officials, echoing the coalition, warn the pumping would affect 'the whole west desert of the state of Utah, including the Great Salt Lake and also parts of Nevada,' framing it as a regional water-sustainability problem, not a local dispute — and disputing Iron County's population and demand projections.",
        why: "Situates her opposition in the broader Western water-sustainability argument, not just county rivalry.",
        source: SRC.ksl_pinevalley },
    ],
    stances: {
      'Water, Great Salt Lake & Environment': "Leads Beaver County's opposition to Iron County's Pine Valley pipeline, arguing the West Desert groundwater is not sustainably available to export and that pumping would harm the region and the Great Salt Lake system.",
      'Rural Utah & Agriculture': "Defends West Desert water for ranching, wildlife, and 'future generations,' backing the coalition appeal of the BLM's 2026 approval.",
      'Local Government Transparency & Accountability': "Casts the fight as protecting a finite public resource against an exporting neighbor and contested demand projections.",
    },
    stanceCards: [
      { topic: 'Opposes Pine Valley Pipeline', icon: '💧', pos: 'oppose', issueKey: 'water', issueStance: 'oppose', text: "Fights Iron County's ~$260M Pine Valley pipeline: it 'robs future generations of the ability to farm, ranch, hunt, fish and recreate in the West Desert' — the water 'doesn't exist now and it won't exist in the future.'", source: SRC.stg_appeal },
      { topic: 'Backed the BLM Appeal', icon: '⚖️', pos: 'oppose', issueKey: 'rural_ag', issueStance: 'oppose', text: "Beaver County joined the Paiute Band, ranchers, and green groups in a 528-page appeal of the BLM's March 2026 pipeline approval, citing senior water rights and aquifer harm.", source: SRC.stg_appeal },
      { topic: 'Regional Water Sustainability', icon: '🏜', pos: 'mixed', issueKey: 'enviro_balance', issueStance: 'mixed', text: "Argues the pumping would hit 'the whole west desert … including the Great Salt Lake and also parts of Nevada,' disputing Iron County's demand projections.", source: SRC.ksl_pinevalley },
    ],
  },

  // ══════════ Greg Miles — Duchesne County Commission (Uinta Basin Railway) ══════════
  greg_miles_duchesne: {
    create: true,
    name: 'Greg Miles',
    office: '🏛 Duchesne County Commission',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Energy & Domestic Production', 'Rural Utah & Agriculture', 'Growth, Housing & Land Use'],
    bio: "Greg Miles is a Duchesne County commissioner and a member of the Seven County Infrastructure Coalition board, one of the elected champions of the Uinta Basin Railway — a $1.5 billion, 88-mile line to move the basin's waxy crude oil to national rail and Gulf Coast refineries. He has framed the long-contested project as an economic lifeline for rural northeastern Utah.",
    acctSummary: "A Duchesne County commissioner and Seven County Infrastructure Coalition board member at the center of the Uinta Basin Railway fight. The coalition (Daggett, Carbon, Duchesne, Emery, San Juan, Sevier, and Uintah counties) has pushed for years to build the 88-mile line that could carry up to ~350,000 barrels a day; it survived a Colorado-led legal challenge when the U.S. Supreme Court ruled 8-0 in May 2025 (Seven County Infrastructure Coalition v. Eagle County) that federal reviewers needn't weigh distant upstream/downstream effects. Miles hailed it as 'a win for the United States' and, as a host-county official, has emphasized hearing from residents; the coalition has since moved to seek $2.4 billion in private-activity bonds. His record is a clear, sourced case for energy-export infrastructure as rural economic development — balanced against the environmental-review questions the litigation raised.",
    theme: "A Duchesne County commissioner is among the elected drivers of the Uinta Basin Railway — a crude-by-rail lifeline for the basin's economy that cleared the Supreme Court in 2025 over environmental objections.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'energy_production',
        headline: "Hailed the Supreme Court win for the Uinta Basin Railway",
        facts: "After the U.S. Supreme Court ruled 8-0 on May 29, 2025 to uphold the railway's federal approval, Miles — who sits on the Seven County Infrastructure Coalition board — said it 'was not only a win for the Seven County Infrastructure Coalition and counties in the state of Utah, but a win for the United States in being able to move forward with a major infrastructure project.'",
        why: "His clearest on-record endorsement of the basin's signature energy-infrastructure project at the moment it cleared its biggest legal hurdle.",
        source: SRC.sltrib_ubr },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'econ_growth',
        headline: "Backs the railway as a rural economic lifeline",
        facts: "The $1.5 billion, 88-mile line would connect the oil-rich Uinta Basin to national rail, potentially moving up to ~350,000 barrels of waxy crude a day; Utah's oil output hit a record 65.1 million barrels in 2024. The coalition Miles serves on has moved to seek $2.4 billion in private-activity bonds to fund construction.",
        why: "Establishes the economic scale and stakes his advocacy rests on for a basin heavily dependent on oil and gas.",
        source: SRC.und_ubr },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'enviro_balance',
        headline: "Emphasizes hearing from host-county residents",
        facts: "As a commissioner in a host county for the line, Miles has said public meetings on the railway were important 'to hear from the citizens,' acknowledging the project runs through communities that live with both its benefits and its risks — the same environmental-review questions (wildfire, water) that drove the Colorado-led lawsuit.",
        why: "Shows he frames the project as needing local input, not just coalition boosterism — the nuance in a contested build.",
        source: SRC.und_ubr },
    ],
    stances: {
      'Energy & Domestic Production': "A leading elected backer of the Uinta Basin Railway, calling its 2025 Supreme Court win 'a win for the United States' for moving the basin's crude to market.",
      'Rural Utah & Agriculture': "Frames the railway as an economic lifeline for a northeastern-Utah basin dependent on oil and gas, backing the coalition's $2.4B bond push.",
      'Growth, Housing & Land Use': "Says host-county residents must be heard on a line that runs through their communities, acknowledging its environmental-review questions.",
    },
    stanceCards: [
      { topic: 'Uinta Basin Railway', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support', text: "A Seven County Coalition board member who hailed the 8-0 2025 Supreme Court win for the $1.5B crude-by-rail line as 'a win for the United States … to move forward with a major infrastructure project.'", source: SRC.sltrib_ubr },
      { topic: 'Rural Economic Lifeline', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support', text: "Backs the 88-mile line (up to ~350,000 barrels/day) and the coalition's $2.4B bond push as economic development for an oil-and-gas-dependent basin.", source: SRC.und_ubr },
      { topic: 'Host-County Input', icon: '🔍', pos: 'mixed', issueKey: 'enviro_balance', issueStance: 'mixed', text: "Says public meetings matter 'to hear from the citizens' in communities the railway runs through — the environmental-review questions (wildfire, water) that drove the lawsuit.", source: SRC.und_ubr },
    ],
  },

  // ══════════ Jordan Leonard — Emery County Commission (coal to nuclear) ══════════
  jordan_leonard_emery: {
    create: true,
    name: 'Jordan Leonard',
    office: '🏛 Emery County Commission',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 59,
    keyIssues: ['Energy & Domestic Production', 'Rural Utah & Agriculture', 'Property Taxes & County Budget'],
    bio: "Jordan Leonard is an Emery County commissioner steering a county whose economy is built on coal at a moment of transition. The Hunter and Huntington coal plants and related infrastructure make up nearly 60% of Emery County's property-tax revenue and support hundreds of jobs; as those plants' future clouds, Emery has become a leading candidate for Utah's nuclear push, including a Valar Atomics demonstration reactor at the San Rafael Energy Research Center.",
    acctSummary: "An Emery County commissioner managing the state's sharpest coal-transition question. The county's two big coal plants (Hunter, Huntington) are about 60% of its property-tax base and employ 400-plus people, and while PacifiCorp's 2025 plan erased their retirement dates — pushing any closure past 2045 — the long-term shift is real, and both sites have been eyed for future nuclear. Emery is now central to Utah's 'Operation Gigawatt' energy build-out: the state inked a deal for a Valar Atomics demonstration reactor at the San Rafael Energy Research Center. Leonard has run the process through public input, noting a June 2025 survey found about 63% of residents favor bringing nuclear to the county and hosting a public hearing that drew similar support. His record is a pragmatic, community-tested bet on a nuclear future to replace a coal tax base — coal legacy and nuclear future held together.",
    theme: "An Emery County commissioner is steering a coal-dependent county toward a nuclear future — a Valar Atomics reactor and ~63% resident support — while its coal plants, ~60% of the tax base, live on borrowed time.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'energy_production',
        headline: "Reports strong resident support for nuclear power",
        facts: "At a June 2025 public hearing the Emery County Commission held on bringing nuclear power to the county, Leonard said a resident survey found about 63% in favor, and that the hearing showed roughly the same result. Utah has signed a deal for a Valar Atomics demonstration reactor at the San Rafael Energy Research Center, targeting operation as soon as the following year.",
        why: "His central, sourced read of where his constituents stand as the county weighs a nuclear future.",
        source: SRC.etv_nuclear },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Governs a county ~60% dependent on coal-plant tax revenue",
        facts: "The Hunter and Huntington plants and related utility infrastructure make up nearly 60% of Emery County's property-tax revenue and, with associated mining and transport, support hundreds of jobs — the economic reality behind every energy-transition decision the commission makes.",
        why: "The fiscal stakes that make the transition existential for the county Leonard governs.",
        source: SRC.und_coal },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'enviro_energy',
        headline: "Positions coal sites as future nuclear locations",
        facts: "PacifiCorp's 2025 resource plan removed retirement dates for Hunter and Huntington (pushing any closure past 2045), while both sites have been identified as candidates for future nuclear plants that could reuse existing transmission — a bridge strategy Emery County is actively courting under Utah's Operation Gigawatt.",
        why: "Documents the county's concrete plan to convert a coal legacy into a nuclear tax base rather than simply lose it.",
        source: SRC.deseret_nuke },
    ],
    stances: {
      'Energy & Domestic Production': "Backs bringing nuclear power to Emery County (a Valar Atomics demo reactor at the San Rafael center), citing ~63% resident survey support, as a replacement for a declining coal base.",
      'Rural Utah & Agriculture': "Steers a coal-built county through transition, courting new energy industry to preserve jobs and the tax base.",
      'Property Taxes & County Budget': "Governs a county where coal plants are ~60% of property-tax revenue, making the energy transition a fiscal necessity.",
    },
    stanceCards: [
      { topic: 'Coal → Nuclear Transition', icon: '⚛️', pos: 'support', issueKey: 'energy_production', issueStance: 'support', text: "Backs bringing nuclear to Emery County (a Valar Atomics demo reactor at the San Rafael center), citing a ~63% resident survey in favor at a June 2025 public hearing.", source: SRC.etv_nuclear },
      { topic: 'Coal = ~60% of Tax Base', icon: '🏭', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Governs a county where the Hunter/Huntington coal plants are ~60% of property-tax revenue and hundreds of jobs — making transition a fiscal necessity, not a choice.", source: SRC.und_coal },
      { topic: 'Reuse Coal Sites for Nuclear', icon: '⚡', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed', text: "Courts new nuclear at the Hunter/Huntington sites (retirement dates now pushed past 2045) to reuse transmission and preserve the tax base under Operation Gigawatt.", source: SRC.deseret_nuke },
    ],
  },

  // ══════════ Mary McGann — Grand County Commission (Moab housing / tourism) ══════════
  mary_mcgann_grand: {
    create: true,
    name: 'Mary McGann',
    office: '🏛 Grand County Commission',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 61,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "Mary McGann is a Grand County commissioner in Moab, where a tourism-driven economy collides with an acute housing shortage. Grand County — which the Legislature forced through a form-of-government restructuring — must balance a budget squeezed by tourism-tax rules that legally can't fund housing or roads, and McGann has pushed to carve out dedicated money for affordable housing anyway.",
    acctSummary: "A Grand County commissioner navigating Moab's central bind: the tourism that drives the economy is taxed under state rules that wall those dollars off from the housing and roads locals need. After a 2024 state audit, the county had to rename its economic-development department the Moab Office of Tourism and strip non-tourism duties, and it leaned on ~$2M in reserves to balance the 2025 budget amid falling transient-room-tax revenue. Against that, McGann championed earmarking $100,000 for affordable housing — 'setting aside money for a goal pushes things forward in a way that just saying we want it doesn't' — and the commission advanced deed-restricted workforce housing and a review of its high-density housing overlay. Her record is a pragmatic push to make a tourism economy work for the people who staff it.",
    theme: "A Grand County commissioner fights to turn Moab's tourism economy toward local housing — earmarking money and easing workforce-housing rules even as state law fences tourism dollars off from the county's real needs.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'housing_support',
        headline: "Pushed to earmark money for affordable housing",
        facts: "In the 2025 budget, the commission set aside $100,000 for affordable-housing initiatives. McGann argued for the dedicated line: 'Setting aside money for a goal pushes things forward in a way that just saying we want it doesn't.' The commission also approved a deed-restricted workforce-housing plat and took up reforms to its high-density housing overlay.",
        why: "Her concrete, sourced move to prioritize housing for the workers a tourism economy depends on.",
        source: SRC.moab_housing },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Balanced a squeezed budget as tourism revenue fell",
        facts: "Grand County leaned on nearly $2 million in general-fund reserves to balance its 2025 budget amid falling tax revenue and new limits on tourism spending; a mid-year amendment also cut about $200,000 from an active-transportation program.",
        why: "The fiscal reality behind the housing fight — a budget under pressure with limited flexible revenue.",
        source: SRC.moab_restruct },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Absorbed a state-driven tourism restructuring",
        facts: "Following a 2024 state audit tied to transient-room-tax use, the commission renamed its Economic Development Department the Moab Office of Tourism and removed non-tourism duties in February 2025 — dollars that, by state law, cannot be redirected to roads, housing, or other community needs.",
        why: "Shows the structural constraint McGann works within: the biggest revenue stream is legally walled off from the county's top needs.",
        source: SRC.moab_restruct },
    ],
    stances: {
      'Growth, Housing & Land Use': "Champions dedicated affordable-housing funding and workforce-housing reforms so Moab's tourism economy works for the people who staff it.",
      'Property Taxes & County Budget': "Balanced a 2025 budget squeezed by falling tourism revenue and reserves draws, while protecting a housing earmark.",
      'Local Government Transparency & Accountability': "Works within a state-forced restructuring that legally fences tourism-tax dollars off from housing and roads.",
    },
    stanceCards: [
      { topic: 'Earmark for Housing', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support', text: "Pushed a dedicated $100K affordable-housing line and workforce-housing reforms: 'setting aside money for a goal pushes things forward in a way that just saying we want it doesn't.'", source: SRC.moab_housing },
      { topic: 'Tourism Revenue Squeeze', icon: '🏜', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Balanced the 2025 budget with ~$2M in reserves as transient-room-tax revenue fell and a mid-year cut hit active transportation by ~$200K.", source: SRC.moab_restruct },
      { topic: 'Tourism Dollars Walled Off', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Works within a state-forced 2025 restructuring (post-audit) that renamed the dept. the Moab Office of Tourism — dollars that by law can't fund housing or roads.", source: SRC.moab_restruct },
    ],
  },

  // ══════════ Dean Draper — Millard County Commission (IPP coal-to-hydrogen) ══════════
  dean_draper_millard: {
    create: true,
    name: 'Dean Draper',
    office: '🏛 Millard County Commission',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 59,
    keyIssues: ['Energy & Domestic Production', 'Rural Utah & Agriculture', 'Property Taxes & County Budget'],
    bio: "Dean Draper is a Millard County commissioner in Delta, home to the Intermountain Power Project — one of the West's largest energy hubs, now converting from coal to hydrogen-capable natural gas. The multibillion-dollar 'IPP Renewed' rebuild, paired with a massive underground hydrogen-storage project, is a generational economic engine for the rural county, and Draper has been among its boosters.",
    acctSummary: "A Millard County commissioner whose county hosts the Intermountain Power Project as it undertakes one of the nation's most ambitious energy transitions. 'IPP Renewed' replaced the old coal plant with an 840 MW gas plant designed to start on 30% hydrogen and reach 100% by 2045, with a federally backed underground hydrogen-storage project alongside it (new units began commercial operation in July 2025). Draper has framed the build-out as a lasting boon: 'It will be a boon for Millard County. After the buildout of the Intermountain Power Plant, there will be other projects,' pointing to the storage caverns' long-term potential. The picture is not simple — a 2025 state law created a Utah Energy Council exploring keeping IPP's coal units running, and the coal units were mothballed by late 2025 — but the county's bet on being a clean-energy hub is real and locally consequential. A pragmatic, sourced case for the transition as rural economic development.",
    theme: "A Millard County commissioner backs the Intermountain Power Project's coal-to-hydrogen rebuild as a generational boon for a rural county — a bet on Delta as a Western clean-energy hub.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2022', tags: ['Public Statements'], issueKey: 'energy_production',
        headline: "Calls the IPP hydrogen build-out 'a boon for Millard County'",
        facts: "As the Advanced Clean Energy Storage project won a $504 million federal loan guarantee, Draper said, 'It will be a boon for Millard County. After the buildout of the Intermountain Power Plant, there will be other projects. … It takes a year at least to carve out a cavern, but it will hold hundreds of caverns,' and described 'great stability' in the project's outlook.",
        why: "His clearest on-record endorsement of the county's signature energy-transition project and its long-term economic promise.",
        source: SRC.sltrib_ipp },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'enviro_energy',
        headline: "Hosts one of the world's most ambitious energy transitions",
        facts: "'IPP Renewed' replaced the coal plant with an 840 MW gas turbine plant designed to run on 30% hydrogen at startup and transition to 100% hydrogen by 2045; new generating units began commercial operation in July 2025, paired with a large underground hydrogen-storage project — positioning Delta as a Western clean-energy hub.",
        why: "The concrete scale of the transition Draper's county is hosting and betting its future on.",
        source: SRC.ipp_renewed },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Navigates uncertainty over IPP's coal units",
        facts: "The transition is not linear: a 2025 state law (HB70) created a Utah Energy Council exploring keeping IPP's coal units operating, the state signed a two-year option to explore acquiring them, and by late 2025 the coal units were mothballed — leaving the county's largest taxpayer's exact future in play even as the hydrogen plant comes online.",
        why: "The honest complication behind the optimism — the county's biggest asset is mid-transition with real open questions.",
        source: SRC.ipp_renewed },
    ],
    stances: {
      'Energy & Domestic Production': "Backs the Intermountain Power Project's coal-to-hydrogen 'IPP Renewed' rebuild and hydrogen storage as a 'boon' and a lasting economic engine for Millard County.",
      'Rural Utah & Agriculture': "Sees Delta as an emerging Western clean-energy hub that can draw further projects to a rural county.",
      'Property Taxes & County Budget': "Governs around the county's largest taxpayer as it transitions — hydrogen plant online while the coal units' future stays in play.",
    },
    stanceCards: [
      { topic: 'IPP Coal-to-Hydrogen', icon: '⚡', pos: 'support', issueKey: 'energy_production', issueStance: 'support', text: "Calls the IPP hydrogen build-out 'a boon for Millard County … there will be other projects' — betting on Delta as a Western clean-energy hub (2022).", source: SRC.sltrib_ipp },
      { topic: 'Hydrogen Hub', icon: '🔋', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed', text: "Hosts 'IPP Renewed' — an 840 MW plant running 30% hydrogen at startup toward 100% by 2045, with underground hydrogen storage; new units online July 2025.", source: SRC.ipp_renewed },
      { topic: 'Coal-Unit Uncertainty', icon: '🏭', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Navigates open questions on IPP's coal units — a 2025 state council and option agreement explore keeping them, but they were mothballed by late 2025.", source: SRC.ipp_renewed },
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

function buildNewDoc(plan) {
  const fields = {
    name: plan.name, office: plan.office, party: plan.party, state: plan.state, icon: plan.icon,
    bio: plan.bio, keyIssues: plan.keyIssues, promises: [], stances: plan.stances,
    spotlight: plan.spotlight, spotlightTheme: plan.theme,
    accountability: { overallScore: plan.score, summary: plan.acctSummary, kept: 0, broken: 0, pending: 0 },
    kept: 0, broken: 0, pending: 0, score: plan.score, tier: tierForScore(plan.score),
    profileStatus: 'full', candidacyStatus: plan.candidacyStatus, updatedAt: STAMP,
  };
  if (plan.nextElection) fields.nextElection = plan.nextElection;
  return fields;
}

// ── Emit the politician-stances.js ISSUE_STANCE_DATA block ────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Rural / small counties · Batch 8 (July 2026) ──────────────────────────────');
  out.push('    // Finishes the high-salience rural counties, controversy-first on the fights that');
  out.push('    // define them: Beaver (Pine Valley water, the other side of Iron County\'s Cozzens),');
  out.push('    // Duchesne (Uinta Basin Railway), Emery (coal→nuclear), Grand/Moab (tourism vs.');
  out.push('    // housing), and Millard (IPP coal→hydrogen). All sitting, elected commissioners.');
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
  console.log(`PolitiDex — Rural counties deep dive (batch 8: Beaver/Duchesne/Emery/Grand/Millard)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

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
    const f = '/tmp/rural-counties-batch8-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    if (doc) { console.log(`  · ${id} (${plan.name}): already exists — skipping create`); existed++; continue; }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.office} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the stance block, --apply to write Firestore.');
})();
