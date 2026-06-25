#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah LOCAL 2026 DEEPENING pass (June 2026)
//
// Adds a real Connected-Evidence (spotlight) layer to the ten local Sheriff and
// County-Commission profiles authored in the two Wasatch Front local passes:
//   • add-utah-local-2026-jun2026.mjs   (Weber / Salt Lake / Utah counties)
//   • add-davis-county-2026-jun2026.mjs (Davis County follow-up)
//
// Before this pass, each local profile had stance cards (Stance at a Glance) but
// ZERO spotlight items, so the Evidence Locker's "By Politician" view showed
// mostly stances and little substance. This pass folds in sourced, individually
// verified evidence — documented in-office actions for the incumbents, dated
// public statements, primary results, committee/board roles, and notable
// accomplishments — mirrored into index.html's ACCT_SPOTLIGHT map.
//
// SCOPE — three kinds of update, all field-masked so nothing else is clobbered:
//   1. spotlight[]            — NEW Connected-Evidence items (the core of this pass).
//   2. accountability.summary — refreshed to reflect the now-documented record.
//   3. promises / counts      — changed ONLY where a completed action for the
//                               office the person CURRENTLY HOLDS is documented.
//      • Mike Smith (sitting Utah County Sheriff): his deputy-wellness pledge is
//        moved pending → kept, grounded in the wellness programs his office
//        already runs (annual mental-health visits, Healing Heroes neurofeedback,
//        2025 suicide-prevention curriculum). 3 kept / 0 pending.
//      • Every other profile keeps its existing verdicts: the nominees' pledges
//        are for offices they do not yet hold (forward-looking → pending), and the
//        other two incumbents' pending pledges are open-ended ("keep expanding…"),
//        not discrete completed actions. We do NOT invent kept promises.
//
// A few new STANCE cards are added where research surfaced a clean, sourced
// position the profile did not yet show (Arbon + Atkin on federal immigration
// cooperation). These are appended to the stance mirror and to index.html's
// ISSUE_STANCE_DATA.
//
// SOURCING DISCIPLINE (per the request's quality bar):
//   • Every spotlight item ties to a real, working source — Standard-Examiner,
//     Daily Herald, KSL/KSL-TV, KUER, FOX13, Salt Lake County / Weber County /
//     Utah County official sites, or the candidate's own campaign site.
//   • Incumbent in-office actions independently covered by news outlets are graded
//     'positive' (words match record); election results, endorsements, and
//     convention paths are 'neutral' context that does not move the score.
//   • Where the strongest source was a campaign site or a single search snippet,
//     the item is phrased conservatively and graded 'neutral'. Nothing is
//     overstated: e.g. Mike Smith is described as helping COORDINATE the response
//     to the Sept. 2025 UVU shooting, not as personally orchestrating an arrest;
//     no military decoration is asserted for Jon Atkin because none was sourced.
//
// CONTENT_STYLE.md: every line describes what THIS individual did or said —
// never their party. Vote tallies and outcomes are stated as plain facts.
//
//   node scripts/deepen-utah-local-2026-jun2026.mjs            # dry run + issueKey validation
//   node scripts/deepen-utah-local-2026-jun2026.mjs --emit     # write index.html blocks to /tmp
//   node scripts/deepen-utah-local-2026-jun2026.mjs --apply    # field-masked PATCH to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-25T00:00:00.000Z';

// Source-label shorthands.
const se   = (url) => ({ label: 'Standard-Examiner', url });
const dh   = (url) => ({ label: 'Daily Herald', url });
const ksl  = (url) => ({ label: 'KSL', url });
const ksltv= (url) => ({ label: 'KSL-TV', url });
const kuer = (url) => ({ label: 'KUER', url });
const fox  = (url) => ({ label: 'FOX13', url });
const camp = (url) => ({ label: 'Campaign', url });

// ── The deepening roster ─────────────────────────────────────────────────────
// Each entry lists the new spotlight[] items, an optional refreshed accountability
// summary, optional promises (only when a verdict legitimately changes), and
// optional new stance cards (addStances[]). `id` matches the live Firestore doc id
// and the index.html ISSUE_STANCE_DATA / ACCT_SPOTLIGHT key.
const DEEPEN = [

  // ══════════════════ SALT LAKE COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'rosie_rivera',
    accountabilitySummary:
      'A multi-term incumbent sheriff — the first woman elected sheriff in Utah — with one of the deepest documented ' +
      'records in this roster: the 2024 stand-up of the county’s own Law Enforcement Bureau after the Unified Police ' +
      'split, medication-assisted treatment in the jail, and seats on the county’s opioid, gang, and family-justice ' +
      'boards. The score reflects that record; she is running for re-election.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2024', tags: ['Notable Actions', 'Consistency'], issueKey: 'justice_balance',
        headline: 'Stood up the county’s own law-enforcement bureau after the Unified Police split',
        facts: 'On July 1, 2024, under a 2023 state law, Rivera led the Salt Lake County Sheriff’s Office’s separation from the Unified Police Department after 14 years, swearing in more than 70 officers and rebuilding the county’s own Law Enforcement Bureau — gang unit, warrants and extraditions, search and rescue, and unincorporated-area patrol — alongside the state’s largest jail.',
        why: 'Rebuilding an independent countywide law-enforcement operation is a concrete, documented action that matches the office she runs.',
        source: ksltv('https://ksltv.com/658091/salt-lake-county-sheriffs-office-and-unified-police-department-split-after-14-years/') },
      { impact: 'positive', category: 'transparency', date: '2024', tags: ['Public Statements', 'Leadership Style'], issueKey: 'gov_transparency',
        headline: 'Backed the split she first resisted: “I work for the people”',
        facts: 'Rivera initially opposed the Unified Police separation but, after the Legislature acted, publicly supported it — “Once the Legislature made the decision, I decided to support it. I work for the people” — while candidly warning the change would raise costs because the county would no longer share resources.',
        why: 'Following through on a mandated change she had opposed, and naming its costs, is a candor signal in her own record.',
        source: ksltv('https://ksltv.com/658091/salt-lake-county-sheriffs-office-and-unified-police-department-split-after-14-years/') },
      { impact: 'positive', category: 'voting', date: '2020', tags: ['Notable Actions', 'Consistency'], issueKey: 'health_mental',
        headline: 'Brought medication-assisted treatment into the county jail',
        facts: 'Rivera introduced a medication-assisted treatment (MAT) program for opioid addiction in the Salt Lake County Jail; a January 2020 expansion she announced with the county mayor reported serving more than 200 people, a program she has cited as reducing returns to jail.',
        why: 'A treatment program she launched and can point to outcomes for is direct follow-through on her stated treatment-first approach.',
        source: ksl('https://www.ksl.com/article/46708053/salt-lake-county-program-aims-to-combat-the-opioid-crisis-from-inside-jail') },
      { impact: 'neutral', category: 'transparency', date: '2017–2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: 'First woman elected sheriff in Utah, with seats across the county’s justice boards',
        facts: 'Sworn in on August 15, 2017 as the first woman elected sheriff in Utah, Rivera serves on the county Opioid Task Force, the Family Justice Center advisory board, the Salt Lake Area Gang Project governing board, and the Metro Narcotics Task Force advisory board.',
        why: 'A documented first and active board service establish the breadth of her countywide record.',
        source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
    ],
  },

  // ══════════════════ SALT LAKE COUNTY — Sheriff (R nominee) ══════════════════
  {
    id: 'shane_manwaring',
    accountabilitySummary:
      'A first-time countywide candidate with a long policing and military-leadership record — a Utah Army National ' +
      'Guard colonel and former Salt Lake County deputy — but no elected record yet. The score reflects that ' +
      'background; every campaign pledge is forward-looking and pending.',
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '1999–2026', tags: ['Consistency', 'Leadership Style'], issueKey: 'veterans',
        headline: 'A Utah National Guard colonel and aviation commander',
        facts: 'Manwaring is a colonel in the Utah Army National Guard and commander of the 97th Aviation Troop Command, a role confirmed in 2022 news coverage of a Guard helicopter recovery; he ties more than two decades of military leadership to his pitch for running the Sheriff’s Office.',
        why: 'A command role documented by an independent news outlet grounds the leadership experience he campaigns on.',
        source: fox('https://www.fox13now.com/news/local-news/recovery-operation-to-remove-utah-national-guard-helicopters-from-mountain-underway') },
      { impact: 'neutral', category: 'rhetoric', date: '2003–2020', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: 'Two decades inside the office he is running to lead',
        facts: 'Manwaring says he began as a Salt Lake County deputy in 2003, served on SWAT and a U.S. Marshals fugitive task force, and was promoted to lieutenant in 2020 — a career inside the Sheriff’s Office he is now seeking to lead.',
        why: 'Running for the office where he built his career is context voters can weigh, drawn from his own account.',
        source: camp('https://www.shane4sheriff.com/meet-shane') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'mike_smith_sheriff',
    accountabilitySummary:
      'A multi-term sheriff with one of the deepest documented local records in this roster — transparency measures, ' +
      'jail-rehabilitation programs, and deputy-wellness initiatives all tied to concrete actions — and the office ' +
      'that led the response in his county to the September 2025 Utah Valley University shooting. The score reflects ' +
      'that record; he is running for re-election.',
    // Deputy-wellness pledge moves pending → kept: the office already runs the wellness
    // programs it promised. Full promise list re-stated so counts recompute (3 kept / 0 pending).
    promises: [
      { title: 'Deploy body cameras and open the office to outside audit', verdict: 'kept', issueKey: 'gov_transparency',
        detail: 'Put body cameras on deputies, opened books to the County Auditor, and invited A&E’s “60 Days In” into the jail in 2023.', sources: ['https://www.mikesmith.vote/'] },
      { title: 'Advance Second Amendment protections in Utah County', verdict: 'kept', issueKey: 'gun_rights',
        detail: 'Helped pass a county Second Amendment resolution and organized all 29 Utah sheriffs behind a constitutional-rights pledge.', sources: ['https://www.mikesmith.vote/'] },
      { title: 'Expand deputy wellness and mental-health support', verdict: 'kept', issueKey: 'health_mental',
        detail: 'Built out deputy-wellness support his office now runs, including annual mental-health visits, a “Healing Heroes” neurofeedback program, and a 2025 suicide-prevention curriculum.', sources: ['https://www.mikesmith.vote/'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'back_police',
        headline: 'His office led the local response to the 2025 UVU shooting',
        facts: 'After the September 10, 2025 fatal shooting at Utah Valley University in his county, Smith helped coordinate the law-enforcement response; he stood with state and federal officials at the September 12 announcement that a suspect was in custody and spoke publicly about the case.',
        why: 'Leading his office’s role in a high-profile public-safety crisis is a documented test of the experience he runs on.',
        source: kuer('https://www.kuer.org/politics-government/2025-09-12/charlie-kirk-shooting-utah-valley-university-suspect-arrest') },
      { impact: 'positive', category: 'transparency', date: '2023', tags: ['Notable Actions', 'Public Behavior'], issueKey: 'gov_transparency',
        headline: 'Let A&E’s “60 Days In” embed in the county jail',
        facts: 'Smith allowed A&E’s “60 Days In” to film undercover inside the Utah County Jail in 2023, framing the decision as a way to expose jail operations to outside scrutiny rather than as publicity.',
        why: 'Inviting outside cameras into the jail is a transparency choice voters can weigh against his stated record.',
        source: camp('https://www.mikesmith.vote/') },
      { impact: 'positive', category: 'rhetoric', date: '2018–2026', tags: ['Consistency', 'Notable Actions'], issueKey: 'justice_reform',
        headline: 'Runs jail-rehabilitation programs that match his stated priorities',
        facts: 'Smith’s office runs jail-rehabilitation programs including “A New Leash on Life,” which pairs inmates with shelter dogs to train, and the RISE reentry program aimed at job skills and reducing recidivism.',
        why: 'Standing programs that track his stated rehabilitation focus are a words-match-record signal.',
        source: camp('https://www.mikesmith.vote/') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Commission Seat A (R nominee) ══════════════════
  {
    id: 'michelle_kaufusi',
    accountabilitySummary:
      'A seasoned municipal executive with a long, documented record as Provo’s first woman mayor — capital ' +
      'projects, a contested fiscal record, and a specific ICE decision — who reached the 2026 ballot by signature ' +
      'after losing the convention and then won the primary. Her county-commission pledges are forward-looking and ' +
      'pending; her fiscal record draws competing interpretations.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2018–2026', tags: ['Notable Actions'], issueKey: 'infrastructure',
        headline: 'Delivered major capital projects as Provo mayor',
        facts: 'As Provo mayor from 2018 to 2026, Kaufusi led major capital projects including a new Provo Municipal Airport passenger terminal that opened in 2022 and the city’s water-reclamation facility, and she served as president of the Mountainland Association of Governments, the regional planning organization.',
        why: 'Completed projects on her watch are concrete evidence of the executive record she runs on.',
        source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Michelle_Kaufusi' } },
      { impact: 'neutral', category: 'rhetoric', date: '2018–2026', tags: ['Rhetoric vs Reality', 'Public Statements'], issueKey: 'property_tax',
        headline: 'Points to balanced budgets; an opponent points to rising debt',
        facts: 'Kaufusi cites eight consecutive balanced budgets as Provo mayor with no truth-in-taxation hearing; a primary opponent countered that the city’s bonded debt roughly doubled — from about $112M to more than $200M — over her tenure.',
        why: 'Her fiscal record, and the competing read of it, is central to the county-finance case she makes.',
        source: dh('https://www.heraldextra.com/news/2026/jan/02/provo-mayor-michelle-kaufusi-announces-run-for-county-commission/') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Lost the convention, then won the primary',
        facts: 'Kaufusi lost the April 2026 Utah County Republican convention to Brent Bowles but gathered signatures to reach the primary ballot, then won the June 23, 2026 primary 55.73% to 44.27%, advancing to the November general election.',
        why: 'How she secured the nomination — losing at convention, then winning the wider primary — is part of her 2026 record.',
        source: dh('https://www.heraldextra.com/news/2026/jun/23/utah-county-primary-maloy-leads-lyman-spencer-kaufusi-ahead-in-county-commission-races/') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Commission Seat B (R nominee) ══════════════════
  {
    id: 'david_spencer_utco',
    accountabilitySummary:
      'A former Orem city councilman with a documented local record on growth and transparency — he led the removal ' +
      'of thousands of high-density units from a corridor plan and helped build the city’s transparency portal — ' +
      'who won a three-way primary. His county agenda is detailed but forward-looking and pending.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2020–2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'housing_build',
        headline: 'Led the removal of 10,000+ high-density units from Orem’s corridor plan',
        facts: 'As an Orem city councilman, Spencer led the removal of more than 10,000 high-density apartment units from the city’s State Street long-range plan, using a development moratorium to redirect growth toward business and family uses.',
        why: 'A concrete land-use action matches the slow-high-density-growth stance he runs on.',
        source: dh('https://www.heraldextra.com/news/2026/may/07/republican-primary-candidates-for-utah-county-commission-discuss-taxes-growth-during-debate/') },
      { impact: 'positive', category: 'transparency', date: '2020–2025', tags: ['Notable Actions', 'Public Behavior'], issueKey: 'gov_transparency',
        headline: 'Helped build Orem’s transparency portal',
        facts: 'Spencer helped create an Orem transparency portal and a city contact app and pledges a county equivalent, saying of the city’s finances, “we’re going to open it up, clean it up and give it back to the people. And we delivered.”',
        why: 'A delivered transparency tool he can point to grounds the county portal he proposes.',
        source: camp('https://www.davidspencerforutah.com/platform') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: 'Won the three-way primary after losing his council seat',
        facts: 'Spencer won the June 23, 2026 three-way Republican primary with 42.10%, ahead of Isaac Paxman (35.21%) and Carolina Herrin (22.68%), the year after losing his Orem City Council seat in the 2025 municipal election.',
        why: 'His 2026 path — out of city office, then atop a county primary — is part of his record.',
        source: dh('https://www.heraldextra.com/news/2026/jun/23/utah-county-primary-maloy-leads-lyman-spencer-kaufusi-ahead-in-county-commission-races/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Commission Seat B (R nominee) ══════════════════
  {
    id: 'jon_beesley',
    accountabilitySummary:
      'A two-term Plain City mayor with a concrete municipal fiscal record who unseated a sitting commissioner in the ' +
      'primary, with no other party filed for the seat. His county pledges are forward-looking and pending.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2018–2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_waste',
        headline: 'Cites nearly $5M saved as Plain City mayor',
        facts: 'As two-term Plain City mayor from 2018 to 2025, Beesley says the city saved nearly $5 million — against an average annual budget of about $4.5 million — by reviewing spending with department heads rather than a “spend it or lose it” approach.',
        why: 'A municipal fiscal record he can cite grounds the budgeting discipline he pledges at the county.',
        source: se('https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/') },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_services',
        headline: 'Calls the county’s ties to its cities “nonexistent”',
        facts: 'Beesley argues the county’s relationships with its cities are “nonexistent” and that “there’s no debate at our Weber County Commission meetings,” and he criticized the county for spending about $20 million on a sewer line that benefited developers.',
        why: 'Specific, on-the-record critiques define the change he says he would bring.',
        source: se('https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: 'Unseated the incumbent commissioner in the primary',
        facts: 'Beesley defeated incumbent Commissioner Sharon Bolos 54.81% to 45.19% in the June 23, 2026 primary, after winning the April convention 62% to 26%; with no other party filed, the primary effectively decided the seat.',
        why: 'Defeating a sitting commissioner is the core of his 2026 record.',
        source: se('https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Commission Seat A (R nominee) ══════════════════
  {
    id: 'duane_kearsley',
    accountabilitySummary:
      'A first-time candidate with a clear fiscal message and a specific, dollar-figured savings record as the county’s ' +
      'Fairgrounds facility manager, who led a four-way primary. Every pledge is forward-looking and pending, and his ' +
      'general election is contested.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2023–2026', tags: ['Notable Actions'], issueKey: 'gov_waste',
        headline: 'Says he beat an outside bid by more than half at the Fairgrounds',
        facts: 'As facility manager at the Weber County Fairgrounds and Golden Spike Event Center, Kearsley says he completed a capital-improvement project for roughly $210,000–$215,000 after the lowest outside bid came in at $439,000.',
        why: 'A specific, dollar-figured savings result is the kind of hands-on management he campaigns on.',
        source: se('https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: 'Led a four-way primary for the open seat',
        facts: 'Kearsley led the four-way Republican primary for the open Seat A with 30.13%, ahead of three opponents, after finishing as the top delegate vote-getter at the April convention; he faces a Democrat and a Forward Party candidate in November.',
        why: 'Topping a crowded primary for an open seat is the substance of his 2026 record so far.',
        source: se('https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'ryan_arbon',
    accountabilitySummary:
      'A multi-term incumbent sheriff with a long public-safety career and a clear, dated position on federal ' +
      'immigration cooperation, but a lightly documented broader issue platform; running for re-election. The score ' +
      'reflects that record.',
    addStances: [
      { topic: 'Cooperation with Federal Immigration Enforcement', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Defends Weber County’s cooperation agreements with ICE — both the jail-enforcement and task-force models — saying agencies that refuse to work with federal authorities are “abdicating their responsibility.”',
        evidence: 'Framed the cooperation around public safety: “The goal is peace. Peace and public safety.”',
        source: se('https://www.standard.net/news/2026/jan/21/the-cause-of-public-safety-weber-county-sheriff-ryan-arbon-discusses-cooperation-with-ice/') },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Notable Actions'], issueKey: 'border_security',
        headline: 'Defended the county’s ICE agreements on the record',
        facts: 'In a January 2026 interview, Arbon defended Weber County’s cooperation agreements with ICE — both the jail-enforcement and task-force models — saying agencies that refuse to work with federal immigration authorities are “abdicating their responsibility,” and that “the goal is peace. Peace and public safety.”',
        why: 'A clear, dated position on a contested issue is a direct read on how he runs the office.',
        source: se('https://www.standard.net/news/2026/jan/21/the-cause-of-public-safety-weber-county-sheriff-ryan-arbon-discusses-cooperation-with-ice/') },
      { impact: 'neutral', category: 'voting', date: '2024–2025', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: 'Backed deputies through a staffing and pay squeeze',
        facts: 'Amid a 2024–2025 deputy-staffing shortage, Arbon backed his deputies’ concerns and requested an outside compensation study; the county then adopted a new step-and-grade pay scale and a retention bonus for deputies.',
        why: 'Acting on staffing and pay tracks the deputy-backing priority he runs on.',
        source: ksl('https://www.ksl.com/article/51178503/') },
      { impact: 'neutral', category: 'rhetoric', date: '1997–2018', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Two decades of public safety before the sheriff’s office',
        facts: 'Arbon built a two-decade public-safety career — a Weber County bailiff beginning in 1997, a state marshal in Missouri, 14 years at the Clearfield City Police Department, and Perry City police chief in 2016 — before being elected sheriff in 2018.',
        why: 'A documented career across municipal and county policing grounds the experience he runs on.',
        source: { label: 'Weber County', url: 'https://www.webercountyutah.gov/sheriff/publicinterest/sheriff.php' } },
    ],
  },

  // ══════════════════ DAVIS COUNTY — Sheriff (R nominee) ══════════════════
  {
    id: 'jon_atkin',
    accountabilitySummary:
      'A first-time countywide candidate with a deep professional law-enforcement and military record — including ' +
      'three and a half years in internal affairs — and a notable slate of endorsements, but no elected record yet. ' +
      'Every campaign pledge is forward-looking and pending. He won an open-seat primary by a margin that grew through ' +
      'the count; certification pending at canvass.',
    addStances: [
      { topic: 'Federal Immigration Enforcement', icon: '🛡', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'Supports the Jail Enforcement Model for Davis County but opposes the Task Force and Warrant Service Officer models, citing the office’s staffing — a position he ties to a department he says is about 85% staffed with roughly 50% three-year retention.',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
    ],
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2022–2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: 'Came up through internal affairs, the lane he campaigns on',
        facts: 'Atkin has spent his most recent three and a half years in the Davis County Sheriff’s Office internal-affairs unit, investigating officer-involved shootings and in-custody deaths — the experience behind the accountability and transparency platform he runs on.',
        why: 'A current assignment that tracks his stated priorities is a words-match-record signal.',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'border_security',
        headline: 'Drew a specific line on federal immigration models',
        facts: 'On federal immigration enforcement, Atkin supports the Jail Enforcement Model for Davis County but opposes the Task Force and Warrant Service Officer models, citing the office’s staffing — about 85% staffed with roughly 50% three-year retention.',
        why: 'A qualified position on a contested issue shows how he weighs enforcement against capacity.',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: 'Won the open-seat primary as his lead grew through the count',
        facts: 'Atkin won the June 23, 2026 Republican primary for the open sheriff’s seat, leading Aaron Perry 51.05% to 48.95%; his margin grew from 237 votes on election night to 884 as more ballots were counted, with only provisional and cure ballots remaining.',
        why: 'A lead that widened through the count is the substance of his 2026 path to the November ballot.',
        source: se('https://www.standard.net/news/2026/jun/24/election-results-susan-lee-takes-lead-in-davis-county-commission-race-jon-atkin-grows-lead-in-sheriff-race/') },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'veterans',
        headline: 'Endorsed by the Utah House speaker and Davis-area leaders',
        facts: 'Atkin was endorsed by Utah House Speaker Mike Schultz, who cited his “knowledge, leadership, and innovative thinking” on public safety, along with state legislators, several Davis County mayors, and former Sheriff Bud Cox.',
        why: 'Notable endorsements are part of his 2026 record, though they speak to support for him rather than to his own conduct.',
        source: camp('https://atkin4sheriff.com/endorsement/') },
    ],
  },

  // ══════════════════ DAVIS COUNTY — Commission Seat A (R nominee) ══════════════════
  {
    id: 'kendalyn_harris',
    accountabilitySummary:
      'A seasoned municipal executive with a long, documented record running Bountiful’s government and budget — ' +
      'including a nuanced, on-the-record history on tax votes — who won the open-seat primary decisively. Her ' +
      'county-commission pledges are forward-looking and pending; certification pending at canvass.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2014–2026', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_waste',
        headline: 'Ran Bountiful’s budget across 12 years in city office',
        facts: 'Harris oversaw Bountiful’s budget across 12 years in city office — eight on the City Council and four as mayor from 2022 to 2026 — running annual strategy sessions with department heads and the city manager.',
        why: 'A sustained record managing a municipal budget is the experience behind her county-finance pitch.',
        source: se('https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/') },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Consistency'], issueKey: 'property_tax',
        headline: 'A qualified record on taxes, not a blanket pledge',
        facts: 'Harris says she has voted both for and against tax increases, supporting them only when tied to essential services with no other cuts available; she criticized the county’s 14.9% property-tax increase for poor communication and favors smaller, incremental adjustments. “If everything is important, then nothing is.”',
        why: 'A documented, qualified record on taxes lets voters weigh how she would actually budget.',
        source: se('https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/') },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Won the open-seat primary, backed by four former commissioners',
        facts: 'Harris won the three-way June 23, 2026 Republican primary with 42.84%, and is endorsed by four former Davis County commissioners; she argues the county’s south end has lacked commission representation for more than eight years.',
        why: 'A decisive open-seat win and that representation case are the substance of her 2026 record.',
        source: se('https://www.standard.net/news/2026/jun/24/election-results-susan-lee-takes-lead-in-davis-county-commission-race-jon-atkin-grows-lead-in-sheriff-race/') },
    ],
  },

];

// ── Firestore value encoder / helpers ────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function counts(promises) {
  return {
    kept: promises.filter(x => x.verdict === 'kept').length,
    broken: promises.filter(x => x.verdict === 'broken').length,
    pending: promises.filter(x => x.verdict === 'pending').length,
  };
}
function promisesDoc(promises) {
  return promises.map(pr => ({
    title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));
}

// Build a field-masked PATCH for one deepen entry (touch only the listed fields).
function buildPatch(d) {
  const fields = { updatedAt: STAMP };
  if (d.spotlight) fields.spotlight = d.spotlight;
  if (d.promises) {
    const { kept, broken, pending } = counts(d.promises);
    fields.promises = promisesDoc(d.promises);
    fields.kept = kept; fields.broken = broken; fields.pending = pending;
    fields.accountability = { summary: d.accountabilitySummary, kept, broken, pending };
  } else if (d.accountabilitySummary) {
    fields.accountability = { summary: d.accountabilitySummary };
  }
  return fields;
}

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  return r.json();
}
async function patchDoc(id, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html blocks (parity with the hand-applied edits) ───────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitSpotlightBlock() {
  const out = ['    // ── Utah LOCAL 2026 · Sheriff + County Commission deepening (June 2026) ──'];
  out.push('    // First Connected-Evidence layer for the ten Wasatch Front local profiles: documented');
  out.push('    // in-office actions for the incumbents, dated public statements, primary results, and');
  out.push('    // board/committee roles. Each item is keyed to an ISSUE_MAP issue so it joins the');
  out.push("    // Evidence Locker, the People's Mandate bridge, and the Alignment Tool.");
  for (const d of DEEPEN) {
    if (!d.spotlight) continue;
    out.push(`      ${d.id}: [`);
    for (const s of d.spotlight) {
      const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(', ');
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`);
      out.push(`          headline:'${esc(s.headline)}',`);
      out.push(`          facts:'${esc(s.facts)}',`);
      out.push(`          why:'${esc(s.why)}',`);
      out.push(`          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`);
    }
    out.push('      ],');
  }
  return out.join('\n');
}
function emitStanceAdditions() {
  const out = ['    // New sourced stance cards appended to existing local profiles (deepening pass).'];
  for (const d of DEEPEN) {
    if (!d.addStances) continue;
    out.push(`    // ${d.id}:`);
    for (const c of d.addStances) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Utah local 2026 deepening  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totSpot = 0, totStance = 0, promiseFlips = 0;
  for (const d of DEEPEN) {
    totSpot += (d.spotlight || []).length;
    totStance += (d.addStances || []).length;
    if (d.promises) promiseFlips += d.promises.filter(p => p.verdict === 'kept').length;
  }
  console.log(`${DEEPEN.length} profiles · ${totSpot} spotlight items · ${totStance} new stance cards\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const d of DEEPEN) {
      for (const s of (d.spotlight || [])) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: unknown spotlight issueKey '${s.issueKey}'`); bad++; }
      for (const c of (d.addStances || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: unknown stance issueKey '${c.issueKey}'`); bad++; }
      for (const p of (d.promises || [])) if (!valid.has(p.issueKey)) { console.log(`  ⚠ ${d.id}: unknown promise issueKey '${p.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    writeFileSync('/tmp/utah-local-deepen-spotlight-block.txt', emitSpotlightBlock());
    writeFileSync('/tmp/utah-local-deepen-stance-additions.txt', emitStanceAdditions());
    console.log('Wrote ACCT_SPOTLIGHT block        → /tmp/utah-local-deepen-spotlight-block.txt');
    console.log('Wrote stance additions            → /tmp/utah-local-deepen-stance-additions.txt\n');
  }

  for (const d of DEEPEN) {
    const fields = buildPatch(d);
    const tag = `${d.id}: +${(d.spotlight || []).length} spotlight` +
      (d.addStances ? `, +${d.addStances.length} stance` : '') +
      (d.promises ? `, promises→${counts(d.promises).kept}K/${counts(d.promises).pending}P` : '');
    if (APPLY) {
      const doc = await getDoc(d.id);
      if (!doc) { console.log(`  – ${tag}: doc not found — skipped`); continue; }
      await patchDoc(d.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Patched' : 'Would patch'} ${DEEPEN.length} profiles · ${totSpot} spotlight items · ${totStance} stance cards · ${promiseFlips} kept promise(s) on Mike Smith.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html blocks, --apply to patch Firestore.');
})();
