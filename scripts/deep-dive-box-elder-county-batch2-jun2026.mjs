#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Box Elder County deep dive, BATCH 2 (June 2026)
//
// Batch 1 (deep-dive-box-elder-county-batch1) authored the CURRENT SITTING
// county officials — including the three who were just defeated (commissioners
// Lee Perry and Boyd Bingham, and Sheriff Kevin Potter). This Batch 2 pass
// builds the records for the INCOMING winners who actually advance to the
// November 3, 2026 general election: the people who will govern Box Elder next.
//
// 2026-STATUS VERIFICATION (Box Elder County official Election Candidates page +
// June 23, 2026 primary results; canvass set for July 7, 2026 so totals are
// unofficial-but-decisive in this heavily Republican county):
//   • nathan_tueller — WON the GOP primary for Commission Seat B over incumbent
//                      Lee Perry, 4,280–3,753 (53.3%–46.7%). His only non-GOP
//                      filer (a Constitution candidate) WITHDREW, so he is
//                      UNOPPOSED in November.                          → CREATE (active)
//   • vance_smith    — WON the GOP primary for Commission Seat A over incumbent
//                      Boyd Bingham, 4,165–3,849 (52%–48%, the county's closest
//                      race). He faces UNAFFILIATED candidate Alan Williams in
//                      November — a CONTESTED general.                 → CREATE (active)
//   • mike_allred    — WON the GOP primary for Sheriff over incumbent Kevin
//                      Potter, 4,991–2,976 (~63%–36%, the widest county margin).
//                      The official candidate list shows THREE unaffiliated
//                      filers (Chad Hayman, Douglas Christensen, Allan L. Shinney),
//                      so his November race is CONTESTED, though he is heavily
//                      favored.                                        → CREATE (active)
//
// CORRECTION TO THE BATCH BRIEF: the brief assumed all three winners were
// "unopposed or won outright." Only Tueller is unopposed. Smith and Allred each
// face unaffiliated November opponents per the county's official candidate roster;
// this batch records that accurately rather than overstating their path.
//
// SKIPPED (verified against the official candidate roster):
//   • Lee Perry / Boyd Bingham / Kevin Potter — LOST the June 23 primary; already
//     authored in Batch 1 as sitting officials and eliminated from the 2026 cycle.
//     Not improved here (the brief excludes anyone eliminated from 2026).
//   • Marla Young (County Clerk) — already a full Batch 1 profile; confirmed
//     UNOPPOSED and active in 2026, so no new record is needed.
//   • Stephen Hadfield (County Attorney) — the SITTING attorney (Batch 1), but
//     the 2026 attorney NOMINEE is Blair T. Wardle (R, unopposed). Wardle has no
//     verifiable public governing or campaign record found in this pass, so he is
//     left as an honest gap rather than a thin, padded profile.
//   • County Auditor (Shirlene Larsen, R, unopposed) and the state-legislative
//     candidates whose districts touch Box Elder (Sen. Scott Sandall, Reps.
//     Thomas Peterson and Rob Bishop) — out of scope for a county-tier batch and
//     left for a dedicated legislative pass.
//
// HONESTY FRAMING — these are CHALLENGERS / INCOMING officials, so most of the
// record is CAMPAIGN PLEDGE, not governing action. Every pledge is described as
// such in its facts/why text and tagged 'Public Statements'; the few ACTUAL
// records (Allred's conduct in the Aug 2025 Tremonton ambush and his law-
// enforcement background; Tueller's Perry City Council service) are tagged
// 'Notable Actions' and called out as record, not promise. Nothing is invented;
// every receipt carries a real {label,url} source verified during research,
// prioritising primary/local outlets (Box Elder County .gov, KSL, KUER, UPR,
// Cache Valley Daily, Salt Lake Tribune, HJ News/Tremonton Leader, Box Elder
// News Journal). Vote tallies are stated as plain facts (CONTENT_STYLE.md).
//
//   node scripts/deep-dive-box-elder-county-batch2-jun2026.mjs            # dry run
//   node scripts/deep-dive-box-elder-county-batch2-jun2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-box-elder-county-batch2-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Verified sources (HTTP-checked during research, June 2026) ───────────────
const SRC = {
  ksl_reelect: { label: 'KSL', url: 'https://www.ksl.com/article/51507458/box-elder-county-commissioners-face-data-center-questions-in-their-reelection-bids' },
  ksl_primary: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' },
  cvd_primary: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/commissioners-sheriff-unseated-in-box-elder-county-primary/article_4a2aff66-5179-46e7-b260-ca57d1e2b2aa.html' },
  hj_primary:  { label: 'HJ News / Tremonton Leader', url: 'https://www.hjnews.com/tremonton/candidates/updated-box-elder-primary-allred-smith-tueller-lead-in-second-wave-of-election-results/article_9660491b-dd41-4f49-95e7-83938656502d.html' },
  bec_cand:    { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/597/Election-Candidates' },
  upr_comm:    { label: 'Utah Public Radio', url: 'https://www.upr.org/politics/2026-06-24/box-elder-data-center-campus-claims-two-casualties-a-pair-of-incumbent-commissioners' },
  upr_allred:  { label: 'Utah Public Radio', url: 'https://www.upr.org/utah-news/2026-06-29/mike-allred-tremonton-shooting-box-elder-county-sheriff' },
  sltrib_allred:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2026/06/29/tremonton-shooting-victim-mike/' },
  ksltv_allred:{ label: 'KSLTV', url: 'https://ksltv.com/local-news/box-elder-county-sheriff/862824/' },
  kutv_ambush: { label: 'KUTV', url: 'https://kutv.com/news/local/box-elder-county-deputy-injured-in-tremonton-shooting-announces-candidacy-for-sheriff' },
  benews_uta:  { label: 'Box Elder News Journal', url: 'https://www.benewsjournal.com/articles/perry-council-enthusiastically-puts-uta-tax-question-to-voters/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════════════ Nathan Tueller — Commissioner-elect, Seat B ══════════════════
  nathan_tueller: {
    create: true,
    name: 'Nathan Tueller',
    office: '🏛 Box Elder County Commission, Seat B',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 58,
    keyIssues: ['Growth, Housing & Land Use', 'Local Government Transparency & Accountability', 'Property Taxes & Fiscal Policy', 'Transportation & Infrastructure'],
    bio: "Nathan Tueller is the Republican nominee for Box Elder County Commission Seat B, having defeated incumbent Lee Perry in the June 23, 2026 GOP primary 4,280–3,753 (about 53.3%–46.7%). He has served roughly ten years on the Perry City Council and operates a full-service landscape company. He says he decided to run months before the Stratos data-center controversy erupted, citing a decade of city-council experience and a desire to help the county manage growth. His campaign centers on practical, transparent and fiscally responsible county government. The lone non-Republican who had filed for the seat (a Constitution Party candidate) withdrew, so Tueller is unopposed on the November 3, 2026 ballot.",
    acctSummary: "An incoming commissioner with a real but modest local-government record — about a decade on the Perry City Council — running on transparency and fiscal responsibility. His most-watched position is a measured one on the Stratos data center: he is openly pro-business and pro-growth (an opponent called him 'extremely pro-development'), yet he defends the sitting commission's decision to 'stay at the table' while faulting the county for not sharing more information. Because he ran unopposed-in-effect (no November opponent), almost his entire county record so far is campaign pledge rather than governing action; his prior council votes are the only hard record to judge him on.",
    theme: "A ten-year Perry City councilman heading to the county commission unopposed — pro-growth and pro-business, but campaigning on transparency, and notably defending rather than repudiating the data-center vote that sank the incumbent he beat.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Won the GOP primary for Seat B and is unopposed in November',
        facts: "Tueller defeated incumbent Commissioner Lee Perry in the June 23, 2026 Republican primary, 4,280 votes to 3,753 (about 53.3%–46.7%). The county's official candidate roster shows no other party's nominee remaining for Seat B — the lone Constitution Party filer withdrew — so Tueller is unopposed on the November 3, 2026 ballot, effectively making the primary decisive. Results were unofficial pending the July 7, 2026 canvass.",
        why: "Establishes his confirmed 2026 status: a primary winner advancing unopposed to the general, i.e. the incoming Seat B commissioner.",
        source: SRC.cvd_primary },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_rights',
        headline: "Defended the data-center decision while running as the change candidate",
        facts: "Unlike the residents' group that helped unseat the incumbents, Tueller did not run against the Stratos vote itself. He described himself as pro-business and in favor of growth, and said that while the county 'could have been better' about sharing information on the project, he still believes the commission made the right call to 'stay at the table.' An opponent of the project, BEAR's Brenna Williams, characterized him as 'extremely pro-development.' This is a campaign position, not a governing vote — he had not yet taken office.",
        why: "His own framing of the issue that defined the race is unusually pro-development for a challenger who benefited from the backlash — a stance voters should weigh against the anti-data-center mood that elected him.",
        source: SRC.ksl_reelect },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: 'Campaign pledge: practical, transparent, fiscally responsible county government',
        facts: "Tueller's campaign centers on county government being 'practical, transparent, and fiscally responsible,' with a promise to listen carefully and make 'thoughtful decisions.' Applied to Stratos, he said the county should have shared more information with the public. These are campaign commitments from a first-term county candidate; he has no county governing record yet against which to test them.",
        why: "Records the transparency-and-fiscal-discipline standard he is asking voters to hold him to — useful as a future yardstick once he is in office.",
        source: SRC.upr_comm },
      { impact: 'neutral', category: 'voting', date: '2023', tags: ['Notable Actions'], issueKey: 'infrastructure',
        headline: 'Has an actual record on a Perry City transit-tax ballot question',
        facts: "As a Perry City Councilmember, Tueller was an active voice on transportation-tax policy: in 2023 the Perry City Council voted to put a question on the November ballot about a tax tied to a potential FrontRunner commuter-rail extension into the county, with Tueller a clear and vocal participant in that decision. This is part of his actual municipal record, distinct from his county campaign pledges.",
        why: "His council service is the only hard governing record he brings to the commission, and it touches transportation funding — a real Box Elder growth-and-infrastructure issue.",
        source: SRC.benews_uta },
    ],
    stances: {
      'Growth, Housing & Land Use': "Runs as openly pro-business and pro-growth (an opponent called him 'extremely pro-development') and, unlike the residents' movement that unseated the incumbents, defends the commission's decision to engage with the Stratos data center rather than opposing it. (Campaign position.)",
      'Local Government Transparency & Accountability': "Campaigns on 'practical, transparent, and fiscally responsible' county government and says the county should have shared more information about the Stratos project with the public. (Campaign pledge — no county governing record yet.)",
      'Property Taxes & Fiscal Policy': "Makes fiscal responsibility a core campaign theme; the Stratos package he inherits includes a reduced energy tax (0.5% rather than MIDA's usual 6%) projected to still bring the county roughly $30M/year rising toward $108M at full build-out. (Campaign framing of an inherited deal.)",
      'Transportation & Infrastructure': "Has an actual municipal record on transportation funding from the Perry City Council, including a 2023 ballot question on a tax tied to a potential FrontRunner rail extension.",
    },
    stanceCards: [
      { topic: 'Stratos Data Center', icon: '🏗', pos: 'mixed', issueKey: 'property_rights', issueStance: 'mixed', text: "Campaign position: pro-business and pro-growth ('extremely pro-development,' an opponent said), but defends the commission's decision to 'stay at the table' on Stratos while faulting the county's communication.", source: SRC.ksl_reelect },
      { topic: 'Transparency Pledge', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Campaign pledge of 'practical, transparent, and fiscally responsible' county government; said the county should have shared more about Stratos. No county governing record yet.", source: SRC.upr_comm },
      { topic: 'Transit-Tax Record', icon: '🚆', pos: 'mixed', issueKey: 'infrastructure', issueStance: 'mixed', text: "Actual record: as a Perry City Councilmember, a vocal participant in the 2023 decision to put a FrontRunner-related transit tax question to voters.", source: SRC.benews_uta },
      { topic: 'Primary & November Status', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Won the Seat B primary over incumbent Lee Perry (53.3%–46.7%) and is unopposed in November — the incoming commissioner.", source: SRC.cvd_primary },
    ],
  },

  // ══════════════════ Vance Smith — Commissioner nominee, Seat A ══════════════════
  vance_smith: {
    create: true,
    name: 'Vance Smith',
    office: '🏛 Box Elder County Commission, Seat A',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 57,
    keyIssues: ['Growth, Housing & Land Use', 'Property Taxes & Fiscal Policy', 'Local Government Transparency & Accountability', 'Agriculture & Rural Economic Development'],
    bio: "Vance Smith is the Republican nominee for Box Elder County Commission Seat A, having defeated incumbent Boyd Bingham in the June 23, 2026 GOP primary 4,165–3,849 (about 52%–48%) — the closest of the county's contested races. He has served on Box Elder County's Planning & Zoning committee and says he announced his candidacy in January 2026, before the Stratos data-center backlash peaked, framing his run as a response to a preexisting desire for 'stronger leadership.' His campaign emphasizes economic growth paired with protecting the county's 'unique identity,' fiscal responsibility and low taxes. He faces unaffiliated candidate Alan Williams in the November 3, 2026 general election.",
    acctSummary: "An incoming-or-aspiring commissioner whose strongest credential is real land-use experience — service on the county Planning & Zoning committee — and a 'business-minded leadership' pitch. On the data center he stakes out a middle position: he says local leaders 'could not stop this particular project' but 'could set clear expectations to protect our surrounding community,' a more critical posture than fellow winner Nathan Tueller. Because he still faces a November opponent and has not governed as a commissioner, his record here is campaign pledge plus committee experience, not commission action.",
    theme: "A county Planning & Zoning veteran who narrowly beat the incumbent on a 'business-minded leadership' message — arguing the county couldn't stop the data center but should have set firmer guardrails, and still facing an unaffiliated challenger in November.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Won the county's closest primary; faces an unaffiliated opponent in November",
        facts: "Smith defeated incumbent Commissioner Boyd Bingham in the June 23, 2026 Republican primary, 4,165 votes to 3,849 (about 52%–48%) — a 316-vote margin, the closest of Box Elder's contested races. Per the county's official candidate roster he advances to the November 3, 2026 general election against unaffiliated candidate Alan Williams, so unlike fellow winner Nathan Tueller his race is still contested. Results were unofficial pending the July 7, 2026 canvass.",
        why: "Confirms his 2026 status — a primary winner heading to a genuinely contested general — and the narrowness of his mandate.",
        source: SRC.cvd_primary },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_rights',
        headline: "Took a middle line on the data center: couldn't stop it, but should set 'clear expectations'",
        facts: "On Stratos, Smith said: 'While local leadership could not stop this particular project, they could set clear expectations to protect our surrounding community,' and argued the county needs 'business-minded leaders who will understand, evaluate, negotiate or disallow future projects coming our way.' This is a campaign position staked out before taking office — more critical of the handling than Tueller, without rejecting development outright.",
        why: "His own framing on the defining county issue — accepting the project's legal inevitability while promising firmer guardrails on the next one.",
        source: SRC.ksl_reelect },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: 'Brings actual land-use experience from the county Planning & Zoning committee',
        facts: "Smith has served on Box Elder County's Planning & Zoning committee, giving him direct, hands-on experience with the growth, zoning and land-use decisions that sit at the center of the county's data-center and agricultural-land debates. This is a genuine record of service, distinct from his campaign promises.",
        why: "Land-use is the issue that defined the 2026 cycle, and committee service is concrete, checkable experience he carries into the race.",
        source: SRC.bec_cand },
      { impact: 'neutral', category: 'promise', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: 'Campaign pledge: fiscal responsibility, low taxes and protecting the county’s identity',
        facts: "Smith's campaign centers on building economic growth while protecting Box Elder's 'unique identity,' and on 'fiscal responsibility, low taxes, and growing families.' He framed his win as reflecting a preexisting appetite for change: 'There's just a handful of folks that are ready for the change … like I did when I announced my candidacy back in January.' These are campaign commitments; he has no commission voting record yet.",
        why: "Sets the fiscal-and-growth standard he is asking voters to measure him by, and dates his run to before the data-center backlash peaked.",
        source: SRC.upr_comm },
    ],
    stances: {
      'Growth, Housing & Land Use': "Pro economic growth while pledging to protect the county's 'unique identity'; says local leaders couldn't stop the Stratos project but 'could set clear expectations to protect our surrounding community.' Brings county Planning & Zoning committee experience. (Campaign positions + committee record.)",
      'Property Taxes & Fiscal Policy': "Campaigns on 'fiscal responsibility, low taxes, and growing families' and 'business-minded' leadership that will 'evaluate, negotiate or disallow' future projects. (Campaign pledge — no commission record yet.)",
      'Local Government Transparency & Accountability': "Frames his narrow primary win as a mandate for 'stronger leadership,' noting he announced in January 2026 before the data-center backlash peaked. (Campaign framing.)",
      'Agriculture & Rural Economic Development': "Ran on protecting Box Elder's 'unique identity' — a rural, agricultural county — while pursuing economic growth, the central tension in the data-center and ag-land debates. (Campaign pledge.)",
    },
    stanceCards: [
      { topic: 'Stratos Data Center', icon: '🏗', pos: 'mixed', issueKey: 'property_rights', issueStance: 'mixed', text: "Campaign position: local leaders 'could not stop this particular project' but 'could set clear expectations to protect our surrounding community'; wants leaders who can 'evaluate, negotiate or disallow' future projects.", source: SRC.ksl_reelect },
      { topic: 'Land-Use Experience', icon: '🗺', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Actual record: has served on Box Elder County's Planning & Zoning committee — hands-on experience with the growth and zoning decisions at the heart of the 2026 cycle.", source: SRC.bec_cand },
      { topic: 'Fiscal Pledge', icon: '💵', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Campaign pledge of 'fiscal responsibility, low taxes, and growing families' and 'business-minded' leadership. No commission voting record yet.", source: SRC.upr_comm },
      { topic: 'Primary & November Status', icon: '🗳', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Won the county's closest primary over incumbent Boyd Bingham (52%–48%); faces unaffiliated candidate Alan Williams in a contested November race.", source: SRC.cvd_primary },
    ],
  },

  // ══════════════════ Mike Allred — Sheriff nominee ══════════════════
  mike_allred: {
    create: true,
    name: 'Mike Allred',
    office: '🚔 Box Elder County Sheriff',
    party: 'Republican', state: 'Utah', icon: '🚔',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 61,
    keyIssues: ['Public Safety', 'Local Government Transparency & Accountability', 'Emergency Dispatch & 911', 'County Budget & Appropriations'],
    bio: "Mike Allred is the Republican nominee for Box Elder County Sheriff, having defeated 11-year incumbent Kevin Potter in the June 23, 2026 GOP primary 4,991–2,976 (about 63%–36%) — the widest margin of any county race. A Brigham City native and Box Elder High School graduate, he volunteered with county Search and Rescue for six years, put himself through the police academy, and rose through the Sheriff's Office from corrections deputy to senior patrol deputy, field-training officer and K-9 handler. He was wounded in the August 17, 2025 Tremonton ambush that killed two area officers; his K-9, Azula, was also hit. He announced his run on January 2, 2026 on a platform of visible, hands-on leadership and stronger training and communication. He faces three unaffiliated candidates — Chad Hayman, Douglas Christensen and Allan L. Shinney — in the November 3, 2026 general election.",
    acctSummary: "The incoming sheriff brings the batch's strongest actual record: a documented law-enforcement career and decorated conduct in the deadliest event in recent county history — the August 2025 Tremonton ambush, in which he was shot while relaying information to dispatch. He won his primary nearly 2-to-1 against an incumbent weakened by a dispatch revolt, and his platform — rebuilding training, internal communication and ties to neighboring agencies — reads as a direct answer to that revolt. Those are pledges, not yet results; he has not run the office. He also publicly faulted the current administration for never debriefing the fatal ambush, a pointed but unverified-by-outside-audit accountability claim.",
    theme: "A patrol deputy shot in the 2025 Tremonton ambush who beat the incumbent sheriff nearly 2-to-1 — running on visible leadership and the training, communication and interagency repair that the dispatch revolt against his predecessor made the central issue.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: "Won the sheriff's race by the county's widest margin; November is contested",
        facts: "Allred defeated incumbent Sheriff Kevin Potter in the June 23, 2026 Republican primary 4,991 votes to 2,976 (about 63%–36%), the largest margin of any Box Elder County contest. The county's official candidate roster shows three unaffiliated challengers for November — Chad Hayman, Douglas Christensen and Allan L. Shinney — so the general election is contested, though he is heavily favored in a deeply Republican county. Results were unofficial pending the July 7, 2026 canvass.",
        why: "Confirms his 2026 status — decisive primary winner advancing to a contested-but-favorable general — and the scale of the rebuke to the incumbent.",
        source: SRC.cvd_primary },
      { impact: 'positive', category: 'promise', date: '2025', tags: ['Notable Actions', 'Positive Leadership'], issueKey: 'back_police',
        headline: 'Wounded in the line of duty in the 2025 Tremonton ambush — an actual record, not a pledge',
        facts: "On August 17, 2025, Allred was shot while responding to the Tremonton ambush that killed Tremonton-Garland Sgt. Lee Sorensen and Officer Eric Estrada; his K-9, Azula, was struck by shrapnel. He recalled being hit while relaying information to dispatch — 'I was dazed for a second, and then I looked down, and I just — my vest is covered in blood' — and said Azula returned to work afterward: 'She's a fighter.' His conduct in the deadliest county event in recent memory is documented record, not a campaign promise.",
        why: "The clearest hard fact on his record: he was at the center of a mass-casualty crisis and performed under fire, which is the foundation of his candidacy.",
        source: SRC.upr_allred },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements', 'Rhetoric vs Reality'], issueKey: 'gov_transparency',
        headline: 'Says the office never debriefed the fatal ambush, and faults the incumbent',
        facts: "Allred said part of why he ran was friction with Sheriff Potter over the shooting investigation — 'Well, he doesn't have my back anymore' — and faulted the office for never reviewing the event: 'Still, to this day, we haven't had a debrief, which is bothersome to me.' These are his characterizations as a candidate and a participant; they are pointed accountability claims that an outside audit has not independently confirmed.",
        why: "A specific, checkable transparency-and-training critique of how the current office handled its worst day — central to his case for change, but his account.",
        source: SRC.upr_allred },
      { impact: 'neutral', category: 'promise', date: '2026', tags: ['Public Statements'], issueKey: 'gov_services',
        headline: 'Campaign pledge: visible leadership and rebuilt training, communication and interagency ties',
        facts: "Announcing on January 2, 2026, Allred pledged to be a visible, engaged sheriff working alongside deputies on patrol and in the jail, and to strengthen deputy training, internal communication, crime prevention and rapid response. He specifically promised to rebuild relationships and communication with neighboring agencies such as the Tremonton-Garland Police Department — a direct answer to the dispatch split in which the county's largest departments left the sheriff's communications center for Weber County's. These are campaign commitments, not yet governing results.",
        why: "His platform maps almost exactly onto the interagency and dispatch breakdown that helped sink the incumbent — the standard to hold him to once in office.",
        source: SRC.ksltv_allred },
      { impact: 'neutral', category: 'promise', date: '2026', tags: ['Public Statements'], issueKey: 'justice_balance',
        headline: 'Campaign pledge: aggressive drug enforcement paired with support for recovery',
        facts: "Allred's platform pairs a hard line on drug dealers with expanded support for people in recovery, and he has warned that the county's growth and sprawl bring new types of crime Box Elder has not historically seen. These are campaign positions from a candidate who has not yet set office policy or a budget.",
        why: "Signals how he would balance enforcement and treatment — a forward-looking pledge voters can later check against his actual policing and jail decisions.",
        source: SRC.ksltv_allred },
    ],
    stances: {
      'Public Safety': "Runs on visible, hands-on leadership — a sheriff working alongside deputies on patrol and in the jail — backed by an actual record: a decorated patrol deputy, K-9 handler and field-training officer wounded in the August 2025 Tremonton ambush. (Pledge + real record.)",
      'Emergency Dispatch & 911': "Pledges to rebuild communication and relationships with neighboring agencies such as Tremonton-Garland — a direct response to the 2026 dispatch split that moved the county's largest departments to Weber County's center and helped unseat the incumbent. (Campaign pledge.)",
      'Local Government Transparency & Accountability': "Publicly faulted the current office for never debriefing the fatal 2025 ambush ('we haven't had a debrief, which is bothersome to me') and cited a loss of trust in the incumbent as a reason he ran. (Candidate's account.)",
      'County Budget & Appropriations': "Pledges fiscal responsibility and clearer expectations for deputies, but has set no office budget or staffing policy yet. (Campaign pledge.)",
    },
    stanceCards: [
      { topic: 'Public Safety Leadership', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Actual record + pledge: a K-9 handler and field-training officer wounded in the 2025 Tremonton ambush, running on visible, hands-on leadership working alongside deputies.", source: SRC.upr_allred },
      { topic: 'Dispatch & Interagency Repair', icon: '📟', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Campaign pledge to rebuild communication and ties with neighboring agencies (e.g. Tremonton-Garland) — a direct answer to the dispatch split that helped sink the incumbent.", source: SRC.ksltv_allred },
      { topic: 'Accountability Critique', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Says the office never debriefed the fatal 2025 ambush ('we haven't had a debrief') and that he lost trust in the incumbent — pointed claims from his own account.", source: SRC.upr_allred },
      { topic: 'Drugs & Recovery', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: "Campaign pledge pairing a hard line on drug dealers with expanded recovery support; warns county growth brings new crime. No office policy set yet.", source: SRC.ksltv_allred },
      { topic: 'Primary & November Status', icon: '🗳', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Beat the incumbent sheriff by the county's widest margin (~63%–36%); faces three unaffiliated challengers in a contested-but-favorable November race.", source: SRC.cvd_primary },
    ],
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

// Build a full document body for a brand-new incoming-official profile.
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
  out.push('    // ── Box Elder County incoming officials · Batch 2 (June 2026) ─────────────────');
  out.push('    // The 2026 WINNERS heading to the Nov. 3 general: commissioners-to-be Nathan');
  out.push('    // Tueller (Seat B, unopposed) and Vance Smith (Seat A, vs an unaffiliated), and');
  out.push('    // Sheriff nominee Mike Allred. Records are mostly campaign pledges, clearly');
  out.push('    // marked, with the few actual records (Allred\'s 2025 ambush conduct and law-');
  out.push('    // enforcement career, Tueller\'s Perry City Council service) flagged as record.');
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
  console.log(`PolitiDex — Box Elder County deep dive (batch 2: incoming 2026 winners)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
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
    const f = '/tmp/box-elder-county-batch2-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this batch only CREATEs)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
