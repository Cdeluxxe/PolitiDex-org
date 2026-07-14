#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Salt Lake County deep dive, BATCH 7 (July 2026)
//
// Follow-up to Batch 6, which built Salt Lake County's executive/sheriff/city-mayor
// tier (Wilson, Rivera, Mendenhall + Sandy/West Valley/Herriman mayors). Batch 6's
// own top open recommendation was "a Salt Lake County COUNCIL pass … around the same
// tax/jail/homelessness cluster." This batch executes exactly that: it builds the
// COUNCIL members who actually cast the vote on Mayor Wilson's tax increase, plus the
// one large suburb still missing a record, all tied back to the interlocking
// homelessness <-> jail <-> taxes fight already established in Batch 6.
//
// THE CLUSTER, FROM THE COUNCIL'S SIDE: on Dec. 9, 2025, after ~3.5 hours of public
// comment, the County Council voted 8-1 to trim Mayor Wilson's proposed ~19.63%
// property-tax increase to 14.65% (~$36.5M; about $64.92/yr on a $638k home) — the
// county's first hike since 2019, driven by criminal-justice costs (74% of the general
// fund) a year after voters rejected the 2024 $507M jail bond. A resident referendum
// then failed to reach the ~45,000-signature threshold. This batch captures that vote
// from four distinct, individually-sourced council lenses, so the SAME decision Batch 6
// recorded through the county mayor is now visible through the legislative body too.
//
//   • aimee_winder_newton_slco — Council CHAIR 2026 (R, District 3). Defended the
//     trimmed hike as unavoidable after "working our tails off" to find cuts (froze
//     elected-official salaries, reduced mayor's-office positions); "work horses, not
//     show horses."                                                       → CREATE
//   • carlos_moreno_slco       — (R, District 2). The lone 8-1 dissenter; said the
//     county "didn't do enough to make cuts." The both-sides counterpart to the chair
//     on the very same vote.                                              → CREATE
//   • laurie_stringham_slco    — At-Large A (R), GOP caucus leader, former chair.
//     Voted yes but pushed spending cuts and warned fixed-income seniors are hit
//     hardest; frames the jail as "the largest mental health facility in the state"
//     and backs the justice/homelessness "step-down" bond.               → CREATE
//   • natalie_pinkney_slco     — At-Large C (D); first Black person elected countywide
//     in SL County. A homelessness/housing/criminal-justice-reform lens; backed the
//     bipartisan Justice & Accountability bond and a "compassionate approach."→ CREATE
//   • dawn_ramsey_sjordan      — South Jordan Mayor (nonpartisan); the largest SL
//     County suburb still missing a record. Growth from ~60k to ~100k, the Daybreak
//     HRTZ tax-reinvestment/affordable-housing bet, "economic development that will
//     keep taxes low."                                                    → CREATE
//
// FACET / NUANCE MODELING (pos:'mixed' where genuinely two-sided): Winder Newton's
// raise-but-only-after-cuts posture; Stringham's yes-vote-with-a-cuts-crusade and
// senior-impact worry; Pinkney's compassion-plus-accountability framing; Ramsey's
// grow-to-keep-taxes-low bet that leans on tax-increment financing.
//
// COMPLEMENTARY, non-duplicative — verified against the live roster and the shipped
// politician-stances.js BEFORE writing:
//   • County COUNCIL records suzanne_harrison and rosalba_dominguez already exist and
//     are NOT touched. (Harrison is a sitting At-Large member; Dominguez is a prior
//     District 2 member — Moreno now holds that seat and is built fresh here.)
//   • Suburb mayors West Jordan (dirk_burton_wjordan), Draper (troy_walker_draper),
//     Murray (brett_hales_murray), and Riverton (tish_buroker_riverton) were ALREADY
//     built in Batch 13 — they are deliberately NOT rebuilt here. The task named West
//     Jordan/Burton, but he exists; re-creating him would add volume, not truth.
//     South Jordan (Ramsey) is the genuine remaining large-suburb gap, so it is what
//     this batch adds.
//
// HONEST GAPS (tracked here, NOT built — no fabrication):
//   • Council members Dea Theodore (R, D6), Sheldon Stewart (R, D5), Ross Romero
//     (D, D4), and Jiro Johnson (D, D1) were all part of the 8-1 majority, but no
//     individual, sourced quote distinguishing each member's own reasoning was found
//     for this pass. Named, not stubbed — build each once a fall 2026 debate/voter
//     guide sources them (four of the council seats are on the Nov. 2026 ballot).
//   • MILLCREEK is intentionally a gap, not a build: founding mayor Jeff Silvestrini
//     RETIRED for health reasons in Nov. 2025, and the council selected sitting member
//     Cheri Jackson to finish his term. Silvestrini is a former official (out of the
//     current-officeholder scope); Jackson is new with no defining, individually-
//     sourced controversy yet. Tracked for a later pass rather than building a former
//     mayor or a thin successor.
//   • Cottonwood Heights, Holladay, Taylorsville, Midvale, Bluffdale, and South Salt
//     Lake remain unbuilt suburbs — named for follow-ups, not stubbed here.
//   • The 2026 referendum outcome (failed to qualify) and the four 2026 council races
//     are live items to record as outcomes later.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source surfaced
//     during research (KSL, ABC4, KUER, Salt Lake Tribune, KSL NewsRadio, The Daily
//     Utah Chronicle, South Jordan Journal, Building Salt Lake, Salt Lake County .gov).
//   • Individual lens, not party bloc. County council district/at-large seats are
//     partisan (Winder Newton/Moreno/Stringham are Republicans; Pinkney is a Democrat)
//     and labeled as plain metadata; South Jordan mayor is nonpartisan. Each record is
//     written to the individual's own conduct.
//   • Attribution discipline: the 8-1 vote, 14.65%, $36.5M and $64.92/home figures are
//     plain facts; the 74%-of-budget and $507M-bond context is carried over from the
//     county's own framing; the referendum was residents', not any council member's.
//   • Idempotent & non-destructive: re-fetches each live doc; CREATE only where nothing
//     exists (skips any id already present).
//
//   node scripts/deep-dive-salt-lake-county-batch7-jul2026.mjs            # dry run
//   node scripts/deep-dive-salt-lake-county-batch7-jul2026.mjs --emit     # write stance block to /tmp
//   node scripts/deep-dive-salt-lake-county-batch7-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-14T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  // The Dec. 9, 2025 county-council tax vote
  ksl_vote:     { label: 'KSL', url: 'https://www.ksl.com/article/51417043/salt-lake-county-council-approves-property-tax-increase-of-roughly-14' },
  abc4_vote:    { label: 'ABC4', url: 'https://www.abc4.com/news/wasatch-front/salt-lake-county-council-votes-property-tax-increase/' },
  kuer_tax:     { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-12-31/salt-lake-county-property-tax-increase-touches-on-angst-over-rising-costs' },
  ksl_reffail:  { label: 'KSL', url: 'https://www.ksl.com/article/51447748/effort-to-repeal-salt-lake-county-tax-hike-fails-to-gather-enough-signatures' },
  // Council-member records
  slco_pinkney: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/council/contact/natalie-pinkney/' },
  kslnr_pinkney:{ label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/elections-politics-government/elections/natalie-pinkney-salt-lake-county-council/2146059/' },
  ksl_reform:   { label: 'KSL', url: 'https://www.ksl.com/article/51073815/salt-lake-county-unveils-game-changing-criminal-justice-homelessness-reform-plan' },
  abc4_senior:  { label: 'ABC4', url: 'https://www.abc4.com/news/wasatch-front/salt-lake-county-council-close-slc-senior-center/' },
  chron_string: { label: 'The Daily Utah Chronicle', url: 'https://dailyutahchronicle.com/2024/10/25/salt-lake-county-mayors-budget-proposal-expands-projects/' },
  slco_council: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/council/districts/' },
  // South Jordan
  sjj_sotc:     { label: 'South Jordan Journal', url: 'https://www.southjordanjournal.com/2025/02/03/522081/south-jordan-state-of-the-city-exciting-and-transformative-time-' },
  sjj_growth:   { label: 'South Jordan Journal', url: 'https://www.southjordanjournal.com/2025/06/05/534949/south-jordan-growth-and-development-excites-mayor-dawn-ramsey' },
  bsl_daybreak: { label: 'Building Salt Lake', url: 'https://buildingsaltlake.com/new-megaplex-cinema-entertainment-center-becomes-a-first-for-lhm-company/' },
  sltrib_sj:    { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/10/14/dawn-ramsey-faces-noah-barrett/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Aimee Winder Newton — SL County Council Chair 2026 (R, District 3) ══════════
  aimee_winder_newton_slco: {
    create: true,
    name: 'Aimee Winder Newton',
    office: '🏛 Salt Lake County Council (Chair, District 3)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Property Taxes & County Budget', 'Crime & Public Safety', 'Local Government Transparency & Accountability'],
    bio: "Aimee Winder Newton represents District 3 (Taylorsville, most of Murray, and parts of West Valley City, South Salt Lake, Millcreek and West Jordan) on the Salt Lake County Council and was chosen by her colleagues to chair the council for 2026. A Republican first elected in 2014 and a 2020 candidate for governor, she led the council through the December 2025 fight over Mayor Jenny Wilson's proposed property-tax increase — the county's first since 2019. County council seats are partisan.",
    acctSummary: "As 2026 council chair, Winder Newton was the public face of the Republican-led council's decision to trim Mayor Wilson's proposed ~19.63% property-tax increase to 14.65% (about $36.5M; roughly $64.92 a year on a $638,000 home) in an 8-1 December 2025 vote. She defended the smaller hike as the responsible outcome of hard work rather than a rubber stamp — 'We've been working our tails off trying to find those cuts,' pointing to a $12.4M reduction in structural costs, frozen salaries for elected officials, limited pay raises, and fewer positions in the mayor's office. When the lone dissenter said the county hadn't cut enough, she pushed back sharply, asking why he hadn't proposed 'a single' cut during negotiations and saying the county needs 'work horses, not show horses.' Her record on this fight is a raise-taxes-only-after-cuts posture, tied to a criminal-justice budget (74% of the general fund) she does not dispute.",
    theme: "Salt Lake County's 2026 council chair steered an 8-1 vote trimming the mayor's tax hike to 14.65% after 'working our tails off' for cuts — defending a smaller-but-real increase as the responsible middle in the county's tax/jail/homelessness squeeze.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Led the 8-1 vote trimming the tax hike to 14.65%",
        facts: "On Dec. 9, 2025, after about 3.5 hours of public comment, the council Winder Newton chairs voted 8-1 to cut Mayor Wilson's proposed 19.63% property-tax increase to 14.65% — roughly $36.5 million, or about $64.92 a year on a $638,000 home (down from ~$87). Members said they identified a $12.4 million reduction in structural costs; it is the county's first property-tax increase since 2019.",
        why: "The central fiscal decision of her chairmanship — a reduced but real increase she brokered and defended.",
        source: SRC.ksl_vote },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_services',
        headline: "'Working our tails off' to find cuts before raising taxes",
        facts: "Winder Newton defended the increase as a last resort after real reductions: 'We've been working our tails off trying to find those cuts,' citing frozen salaries for elected officials, limited pay raises, and reduced positions in the mayor's office as examples of where the council trimmed before landing on the smaller hike.",
        why: "Her core framing — that the council cut first and raised second — the standard voters can measure her against.",
        source: SRC.ksl_vote },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "'Work horses, not show horses' clash with the lone dissenter",
        facts: "When District 2's Carlos Moreno cast the only no vote and said the county hadn't done enough to cut costs, Winder Newton took exception, asking why he hadn't brought up 'a single proposed cut' during budget negotiations and saying the county needs 'work horses, not show horses' as she thanked her other colleagues.",
        why: "Puts the intra-council accountability fight on the record — chair versus dissenter on who actually did the budget work.",
        source: SRC.abc4_vote },
    ],
    stances: {
      'Property Taxes & County Budget': "As 2026 chair, led the 8-1 vote trimming Mayor Wilson's ~19.63% proposal to a 14.65% increase (~$36.5M) — the county's first since 2019 — after finding a $12.4M structural-cost reduction.",
      'Crime & Public Safety': "Accepts that criminal justice drives ~74% of the county general fund and did not dispute the need for the revenue, while insisting the council cut before it raised.",
      'Local Government Transparency & Accountability': "Defended the process as cuts-first ('working our tails off'), and clashed with the lone dissenter over who proposed real reductions — 'work horses, not show horses.'",
    },
    stanceCards: [
      { topic: 'Trimmed Tax Hike to 14.65%', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "As 2026 chair, led the 8-1 vote cutting Mayor Wilson's ~19.63% proposal to a 14.65% increase (~$36.5M; ~$64.92/yr on a $638k home) — the county's first hike since 2019.", source: SRC.ksl_vote },
      { topic: "'Working Our Tails Off' on Cuts", icon: '✂️', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Defended the hike as a last resort after a $12.4M structural-cost cut — frozen elected-official salaries, limited raises, fewer mayor's-office positions: 'working our tails off trying to find those cuts.'", source: SRC.ksl_vote },
      { topic: "'Work Horses, Not Show Horses'", icon: '🐴', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Clashed with the lone dissenter, asking why he never proposed 'a single' cut in negotiations and saying the county needs 'work horses, not show horses.'", source: SRC.abc4_vote },
    ],
  },

  // ══════════ Carlos Moreno — SL County Council (R, District 2), lone dissenter ══════════
  carlos_moreno_slco: {
    create: true,
    name: 'Carlos Moreno',
    office: '🏛 Salt Lake County Council (District 2)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Property Taxes & County Budget', 'Local Government Transparency & Accountability', 'Crime & Public Safety'],
    bio: "Carlos Moreno represents District 2 — West Valley City and South Jordan west of Bangerter, plus Kearns and Magna and slivers of West Jordan, Riverton and Herriman — on the Salt Lake County Council. A Republican, he was the lone vote against the county's 14.65% property-tax increase in December 2025, arguing the county had not cut enough first. County council seats are partisan.",
    acctSummary: "Moreno was the single dissenting voice on the December 2025 budget, casting the only no vote in the 8-1 decision to raise Salt Lake County property taxes 14.65%. He said the county 'didn't do enough to make cuts to combat the rising costs' before turning to taxpayers — the fiscal-restraint counterpoint to a Republican-led council that ultimately backed the mayor's revenue after trimming it. His stance drew a public rebuke from the chair, who said he had not offered 'a single proposed cut' during negotiations, a characterization Moreno's no vote implicitly contested. His record on this fight is a clean, if contested, no-new-taxes-until-you-cut-more position, cast in the same tax/jail/homelessness squeeze the rest of the council navigated.",
    theme: "The lone no vote on Salt Lake County's 14.65% tax hike, Moreno argued the county 'didn't do enough to make cuts' before raising taxes — the fiscal-restraint dissent on a budget driven by criminal-justice costs.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Cast the only vote against the 14.65% tax increase",
        facts: "In the council's 8-1 vote on Dec. 9, 2025 to raise property taxes 14.65% (about $36.5 million), Moreno was the lone dissenter. He said the county 'didn't do enough to make cuts to combat the rising costs,' objecting that the increase came before the county had exhausted spending reductions.",
        why: "The defining vote of his tenure so far — the sole recorded no on the county's first tax hike since 2019.",
        source: SRC.ksl_vote },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Faulted the county for raising taxes before cutting enough",
        facts: "Moreno framed his opposition as a matter of sequencing — that the council should have found deeper savings before asking residents to pay more amid inflation. His position put him at odds with the council chair, who publicly questioned why he had not proposed specific cuts during budget negotiations.",
        why: "Records his stated rationale and the accountability dispute it triggered, without endorsing either side.",
        source: SRC.abc4_vote },
    ],
    stances: {
      'Property Taxes & County Budget': "The lone no vote on the county's 14.65% property-tax increase, arguing the county 'didn't do enough to make cuts to combat the rising costs' before raising taxes.",
      'Local Government Transparency & Accountability': "Framed his dissent as a sequencing objection — cut deeper first — putting him publicly at odds with the council chair over who proposed real reductions.",
      'Crime & Public Safety': "Did not contest the county's criminal-justice-heavy budget directly, but opposed funding it through a property-tax increase this cycle.",
    },
    stanceCards: [
      { topic: 'Lone No on the Tax Hike', icon: '🚫', pos: 'oppose', issueKey: 'property_tax', issueStance: 'oppose', text: "Cast the only vote against the county's 8-1, 14.65% property-tax increase (~$36.5M), saying the county 'didn't do enough to make cuts to combat the rising costs.'", source: SRC.ksl_vote },
      { topic: 'Cut Deeper Before Taxing', icon: '✂️', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Argued the council should have found deeper savings before asking residents to pay more amid inflation — a stance that drew a public rebuke from the chair.", source: SRC.abc4_vote },
    ],
  },

  // ══════════ Laurie Stringham — SL County Council At-Large A (R) ══════════
  laurie_stringham_slco: {
    create: true,
    name: 'Laurie Stringham',
    office: '🏛 Salt Lake County Council (At-Large A)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 59,
    keyIssues: ['Property Taxes & County Budget', 'Crime & Public Safety', 'Local Government Transparency & Accountability'],
    bio: "Laurie Stringham holds an At-Large seat on the Salt Lake County Council, where she is the Republican caucus leader and a former council chair. She voted for the county's 14.65% property-tax increase in December 2025 while pressing for deeper spending cuts and warning that fixed-income seniors would be hit hardest, and she has been an outspoken advocate for the county's criminal-justice-and-homelessness 'step-down' reform bond. County council seats are partisan.",
    acctSummary: "Stringham's record on the 2025-26 budget is a yes-vote-with-a-cuts-crusade. She backed the 14.65% property-tax increase but pushed the council to reduce spending first — including cutting positions from the mayor's office — and repeatedly flagged that seniors on fixed incomes are the most exposed to a hike, in a county whose senior population rose 19% in five years and is projected to grow another 28% by 2035. She has tied the county's budget pressure directly to the homelessness/criminal-justice cluster, describing the Salt Lake County jail as 'the largest mental health facility in the state' and backing a 'step-down approach' bond meant to cut recidivism by helping people reintegrate after release. During the same budget cycle she supported closing an underused Salt Lake City senior center, arguing its members had care nearby and the renovation funds were better spent maintaining other facilities. A fiscally hawkish record that still engages the reform side of the jail-and-homelessness fight.",
    theme: "A Republican council leader who backed the 14.65% hike but crusaded for cuts and warned fixed-income seniors are hit hardest — while tying the budget to a jail she calls 'the largest mental health facility in the state.'",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Voted for the 14.65% hike while pushing for cuts",
        facts: "Stringham supported the 14.65% property-tax increase but pressed for spending reductions first, and warned during budget deliberations that seniors — many on fixed incomes — would be most affected by higher taxes. County analysis noted the senior population rose 19% over five years and is projected to grow 28% more by 2035, concentrated in southwestern Salt Lake County.",
        why: "Captures her actual posture — a yes vote paired with a running push for cuts and a specific worry about fixed-income residents.",
        source: SRC.abc4_senior },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Backed closing an underused SLC senior center",
        facts: "During a November 2025 budget workshop, Stringham supported closing the Tenth East Senior Center in Salt Lake City, arguing its seniors had found care at nearby centers and that the renovation funds should instead maintain other facilities — a targeted cut she defended even as she flagged seniors' broader tax exposure.",
        why: "A concrete spending decision that shows how she applied her cut-first principle in practice.",
        source: SRC.abc4_senior },
      { impact: 'positive', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'justice_reform',
        headline: "Champions a 'step-down' justice-and-homelessness bond",
        facts: "Stringham has argued the county's justice bond will build a 'step-down approach' to help people reintegrate into society and drive recidivism down, emphasizing that the Salt Lake County jail is 'the largest mental health facility in the state' — linking the county's budget pressure directly to the homelessness and behavioral-health crisis.",
        why: "Shows she engages the reform side of the jail/homelessness cluster, not just the tax-cutting side.",
        source: SRC.chron_string },
    ],
    stances: {
      'Property Taxes & County Budget': "Voted for the 14.65% increase but pushed to cut spending first and warned that fixed-income seniors — a fast-growing share of the county — are hit hardest by tax hikes.",
      'Crime & Public Safety': "Ties the budget to the jail-and-homelessness crisis, calling the county jail 'the largest mental health facility in the state' and backing a recidivism-cutting 'step-down' bond.",
      'Local Government Transparency & Accountability': "Applied her cut-first stance concretely — supporting closure of an underused senior center to redirect funds to maintaining other facilities.",
    },
    stanceCards: [
      { topic: 'Yes on Hike, But Cut First', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Backed the 14.65% property-tax increase but pushed for spending cuts first and warned fixed-income seniors — a fast-growing share of the county — are hit hardest.", source: SRC.abc4_senior },
      { topic: 'Jail as Mental-Health Fallback', icon: '⚖️', pos: 'support', issueKey: 'justice_reform', issueStance: 'support', text: "Calls the county jail 'the largest mental health facility in the state' and champions a justice-bond 'step-down approach' to cut recidivism — engaging the reform side of the cluster.", source: SRC.chron_string },
      { topic: 'Closed a Senior Center to Save', icon: '✂️', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Supported closing an underused SLC senior center, saying its members had care nearby and the funds should maintain other facilities — a cut applied in practice.", source: SRC.abc4_senior },
    ],
  },

  // ══════════ Natalie Pinkney — SL County Council At-Large C (D) ══════════
  natalie_pinkney_slco: {
    create: true,
    name: 'Natalie Pinkney',
    office: '🏛 Salt Lake County Council (At-Large C)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Homelessness & Housing', 'Crime & Public Safety', 'Property Taxes & County Budget'],
    bio: "Natalie Pinkney holds an At-Large seat on the Salt Lake County Council, where she is the first Black person elected countywide in Salt Lake County. She began her term in January 2025 after five years on the South Salt Lake City Council, including as vice chair. Her focus centers on housing, homelessness, childcare and criminal-justice reform, and she backed the county's bipartisan Justice & Accountability bond. County council seats are partisan.",
    acctSummary: "Pinkney brings the homelessness-and-reform lens to the county's tax/jail/homelessness cluster. She campaigned on and voted for the county's Justice & Accountability bond — a plan tied to Mayor Wilson's five-year initiative to curb homelessness and reform criminal justice, including a 'justice and accountability center' for people leaving jail or prison. She framed the bond's rare bipartisanship as its strength: it had 'support from eight out of the nine County Council members … both Republican and Democrat support, and those are people who want a compassionate approach to homelessness and to criminal justice.' She approaches housing as opportunity — a path to build family wealth and stability — and points to county- and city-owned land, and partnerships with cities, as ways to add supply. Her record pairs a compassion frame with the accountability language the bond's name carries, on the same crisis the county mayor and sheriff records already document.",
    theme: "The first Black person elected countywide in Salt Lake County, Pinkney brings a housing-and-homelessness lens to the county's budget crisis — backing a bipartisan Justice & Accountability bond and a 'compassionate approach to homelessness and to criminal justice.'",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'justice_reform',
        headline: "Backed the bipartisan Justice & Accountability bond",
        facts: "Pinkney said she would vote for the county's Justice and Accountability bond, highlighting its rare cross-party backing: '[It] has support from eight out of the nine County Council members … both Republican and Democrat support, and those are people who want a compassionate approach to homelessness and to criminal justice.' The bond ties to the county's plan for a 'justice and accountability center' serving people facing housing instability after release from jail or prison.",
        why: "Her signature position on the cluster — a reform-and-accountability bond she frames as bipartisan common ground.",
        source: SRC.kslnr_pinkney },
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'housing_support',
        headline: "Frames housing as opportunity and wealth-building",
        facts: "Pinkney describes housing as part of the American dream — a way for families to build wealth and have stable shelter — and argues the county can add supply using county- and city-owned land and partnerships with cities to revitalize underused parcels for housing.",
        why: "Her core housing approach — supply through public land and city partnerships, tied to economic mobility.",
        source: SRC.kslnr_pinkney },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "First Black person elected countywide in Salt Lake County",
        facts: "Pinkney began her At-Large council term in January 2025 as the first Black person elected countywide in Salt Lake County, after five years on the South Salt Lake City Council (including as vice chair), centering families, housing, homelessness, childcare and financial empowerment.",
        why: "Establishes who she is and the priorities she brought to the county's most consequential budget fight.",
        source: SRC.slco_pinkney },
    ],
    stances: {
      'Homelessness & Housing': "Centers housing as opportunity and wealth-building, backing added supply via county/city-owned land and city partnerships alongside the county's homelessness reform plan.",
      'Crime & Public Safety': "Backed the bipartisan Justice & Accountability bond and a 'compassionate approach to homelessness and to criminal justice,' tied to a re-entry 'justice and accountability center.'",
      'Property Taxes & County Budget': "Approaches the county's budget through the homelessness/justice-reform investments it funds, framing the bond's cross-party support as its strength.",
    },
    stanceCards: [
      { topic: 'Justice & Accountability Bond', icon: '🔄', pos: 'support', issueKey: 'justice_reform', issueStance: 'support', text: "Backed the county's bipartisan Justice & Accountability bond (8 of 9 council members): 'a compassionate approach to homelessness and to criminal justice,' tied to a re-entry center.", source: SRC.kslnr_pinkney },
      { topic: 'Housing as Opportunity', icon: '🏚', pos: 'support', issueKey: 'housing_support', issueStance: 'support', text: "Frames housing as wealth-building and shelter, and would add supply using county- and city-owned land and city partnerships to revitalize underused parcels.", source: SRC.kslnr_pinkney },
      { topic: 'First Black Countywide Official', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Began her At-Large term in Jan. 2025 as the first Black person elected countywide in SL County, after five years on the South Salt Lake City Council, centering housing, homelessness and childcare.", source: SRC.slco_pinkney },
    ],
  },

  // ══════════ Dawn Ramsey — South Jordan Mayor (growth / taxes / Daybreak) ══════════
  dawn_ramsey_sjordan: {
    create: true,
    name: 'Dawn Ramsey',
    office: '🏛 South Jordan (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "Dawn Ramsey has been mayor of South Jordan since 2018 and was on the ballot again in the 2025 municipal race. Under her tenure the city has grown from about 60,000 residents to more than 100,000, anchored by the Larry H. Miller Company's Downtown Daybreak build-out and a state-designated Housing and Transit Reinvestment Zone. She frames aggressive economic development as the way to hold residential taxes down. South Jordan's mayor is a nonpartisan office.",
    acctSummary: "Ramsey is the growth-and-taxes mayor of one of Salt Lake County's fastest-expanding suburbs — from roughly 60,000 residents to over 100,000 in about seven years. Her governing thesis is that a strong 'micro-economy' and a 'business-friendly' posture let the city keep taxes low while maintaining service levels: economic development, she argues, 'will keep taxes low as we maintain our high service levels and ensure our continued quality of life.' The centerpiece is Downtown Daybreak, whose place inside a state Housing and Transit Reinvestment Zone (HRTZ) lets South Jordan redirect a share of incremental property, sales and use-tax growth into the district — funding affordable housing (a proposal for 4,724 multifamily units, 500 at 60-80% AMI), density, and structured parking — alongside marquee additions like the Salt Lake Bees' new ballpark and a Megaplex. 'This is not just a development, but a destination,' she said at one opening. Her record is a pro-growth, tax-increment bet: fast development meant to expand the base rather than the rate, with the tradeoff that it leans on tax-increment financing and rising density.",
    theme: "South Jordan's mayor bets that fast growth — 60k to 100k residents and the Daybreak HRTZ tax-reinvestment district — expands the tax base so rates stay low, pairing a ballpark-and-density boom with an affordable-housing set-aside.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Casts economic development as a way to 'keep taxes low'",
        facts: "At her 2025 State of the City, Ramsey said South Jordan's 'micro-economy is strong and we are committed to our promise of being a business-friendly city, allowing for economic development that will keep taxes low as we maintain our high service levels and ensure our continued quality of life,' calling it 'an exciting and transformative time in South Jordan's history.'",
        why: "Her core fiscal thesis — grow the base, not the rate — the standard her budgets can be measured against.",
        source: SRC.sjj_sotc },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Anchors growth on the Daybreak HRTZ tax-reinvestment zone",
        facts: "Downtown Daybreak sits inside a state Housing and Transit Reinvestment Zone awarded by the Governor's Office of Economic Opportunity, letting South Jordan redirect a share of incremental property, sales and use-tax growth into the district for affordable housing, density, and structured parking. The South Jordan/LHM proposal calls for 4,724 multifamily units, about 500 of them at 60-80% of area median income — a large density increase over a market-only plan.",
        why: "The concrete mechanism behind her growth model — tax-increment financing tied to an affordable-housing set-aside.",
        source: SRC.bsl_daybreak },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Presides over growth from ~60k to over 100k residents",
        facts: "Since Ramsey became mayor in 2018, South Jordan's population has grown from about 60,000 to more than 100,000, with the Larry H. Miller Company building out Downtown Daybreak — including the Salt Lake Bees' new ballpark and a Megaplex entertainment center. At one opening she said, 'This is not just a development, but a destination.'",
        why: "The scale of the growth her policies are managing — and the marquee investments she points to as proof of the model.",
        source: SRC.sjj_growth },
    ],
    stances: {
      'Growth, Housing & Land Use': "Anchors South Jordan's growth (60k to 100k residents) on the Daybreak HRTZ, redirecting incremental tax growth into affordable housing (500 units at 60-80% AMI), density and parking.",
      'Property Taxes & County Budget': "Argues 'business-friendly' economic development 'will keep taxes low' by expanding the base rather than the rate, while maintaining service levels.",
      'Local Government Transparency & Accountability': "Casts Daybreak's ballpark-and-density boom as a 'destination' that pays for itself — a pro-growth bet that leans on tax-increment financing.",
    },
    stanceCards: [
      { topic: 'Grow the Base, Not the Rate', icon: '📈', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Says 'business-friendly' economic development 'will keep taxes low' while maintaining service levels — betting fast growth expands the tax base rather than the rate.", source: SRC.sjj_sotc },
      { topic: 'Daybreak HRTZ Tax Reinvestment', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Anchors growth on the Daybreak Housing & Transit Reinvestment Zone — redirecting incremental tax growth into affordable housing (500 units at 60-80% AMI), density and parking.", source: SRC.bsl_daybreak },
      { topic: '60k → 100k Growth Boom', icon: '🏟', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Presided over growth from ~60k to 100k+ residents anchored by Daybreak's new Bees ballpark and Megaplex: 'not just a development, but a destination.'", source: SRC.sjj_growth },
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
  out.push('    // ── Salt Lake County Council + South Jordan · Batch 7 (July 2026) ──────────────');
  out.push('    // Follows Batch 6 (county mayor/sheriff/city mayors) with the COUNCIL that voted on');
  out.push('    // the tax hike, tied to the same tax<->jail<->homelessness cluster: the 8-1 Dec. 2025');
  out.push('    // vote trimming Mayor Wilson\'s proposal to 14.65% — chair Winder Newton (defended,');
  out.push('    // cuts-first), Moreno (lone no), Stringham (yes-but-cut + jail-as-mental-health), and');
  out.push('    // Pinkney (homelessness/justice-reform lens) — plus South Jordan\'s Ramsey (growth/');
  out.push('    // Daybreak HRTZ). (Council records suzanne_harrison / rosalba_dominguez, and suburb');
  out.push('    // mayors Burton/Walker/Hales/Buroker, already exist and are NOT rebuilt.)');
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
  console.log(`PolitiDex — Salt Lake County deep dive (batch 7: county council + South Jordan)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

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
    const f = '/tmp/salt-lake-county-batch7-stance-block.txt';
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
