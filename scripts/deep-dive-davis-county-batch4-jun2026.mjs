#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Davis County deep dive, BATCH 4 (June 2026)
//
// Batch 3 deepened the active 2026 Davis legislative challengers (Bitner, Young,
// Taylor, Stevenson) but DEFERRED two races whose stance records were then too
// thin to source receipts: House District 13 (Craythorne / Anderson) and the two
// Davis-area state-Senate seats. This batch closes that gap — the remaining
// MAJOR 2026 legislative candidates who are CONFIRMED active for the November 3,
// 2026 general election, so Davis County voters have an honest, sourced record on
// everyone who will actually appear on their ballots.
//
// Roster (2026 status verified against June 23, 2026 primary results FIRST):
//
//   • erik_r_craythorne — Erik R. Craythorne, HD13 (R). West Point mayor since
//                         2007. His only GOP rival, Roxayn Elmer, WITHDREW; he
//                         advanced from the April 18 convention as the open-seat
//                         nominee. Faces Jeffrey Anderson (D) and Tony De Mille
//                         (Forward) in November.                          ✓ active
//   • jeffrey_anderson  — Jeffrey Anderson, HD13 (D). Advanced UNOPPOSED from the
//                         April 25 Democratic convention; faces Craythorne.  ✓ active
//   • tami_tran         — Tami Tran, SD6 (R). WON the June 23 primary over Robert
//                         Wanlass 71.04%–28.96%; sitting Kaysville mayor; faces
//                         Jared Neal (D) and Josh Smith (Forward).         ✓ active
//   • stephanie_hollist — Stephanie Hollist, SD7 (R). WON the June 23 primary,
//                         UNSEATING Senate President J. Stuart Adams 43.32%–34.57%
//                         (Braden Hess 22.11%); faces Garret Rushforth (D) and
//                         Jeffrey Ostler (Constitution). NO PRIOR PROFILE — this
//                         pass CREATES her record.                         ✓ active
//
// VERIFIED ACTIVE — NONE SKIPPED. Every one of the four named for this batch won
// their primary or advanced unopposed and is on the November ballot. (Their
// defeated 2026 rivals — Wanlass, Adams, Hess, Elmer — are out of scope here.)
//
// Honesty rules (CONTENT_STYLE.md + the Batch 1/2/3 deep dives):
//   • Nothing invented. Every receipt carries a real {label,url} `source`
//     confirmed during research: Standard-Examiner, Salt Lake Tribune, Deseret
//     News, KSL/KUTV, Utah News Dispatch, the Utah Lt. Governor's candidate
//     filings, official West Point City budget docs / Utah Public Notice, and
//     each candidate's own campaign site.
//   • GOVERNING RECORD vs CAMPAIGN PLEDGE is kept explicit:
//       – Craythorne (4-term West Point mayor) and Tran (5th-year Kaysville mayor)
//         have real municipal records, so their record receipts ARE impact-tagged
//         — including the honest counterweights: Craythorne's 2024 Truth-in-
//         Taxation 9.49% property-tax increase weighed against his fiscal-
//         conservative message, balanced by West Point's growth-and-impact-fee
//         budgeting.
//       – Anderson and Hollist have NO elected/legislative record. Their receipts
//         are campaign positions and electoral facts, tagged impact:'neutral' and
//         explicitly labeled "campaign position / no voting record yet."
//   • Idempotent & non-destructive: re-fetches each live doc; only ADDS stance
//     topics that aren't already present; prepends spotlight receipts only when a
//     doc has no impact-tagged drivers yet; sets candidacyStatus/Outcome only when
//     missing; and CREATES Hollist only if she does not already exist (never
//     clobbers). Re-running is safe.
//
//   node scripts/deep-dive-davis-county-batch4-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-davis-county-batch4-jun2026.mjs --apply    # write to Firestore
//   node scripts/deep-dive-davis-county-batch4-jun2026.mjs --force    # (with --apply) overwrite Hollist if present
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Sources (re-used across receipts) ───────────────────────────────────────
const SRC = {
  ksl_running: { label: 'KSL — who’s running for the Utah Legislature in 2026', url: 'https://www.ksl.com/article/51428770/heres-whos-running-for-the-utah-legislature-in-2026' },
  lg_filings: { label: 'Utah Lt. Governor — 2026 candidate filings', url: 'https://vote.utah.gov/2026-candidate-filings/' },
  wp_budget: { label: 'West Point City — FY2026 budget document', url: 'https://www.westpointutah.gov/DocumentCenter/View/2271/Budget-Document-FY2026' },
  wp_tnt: { label: 'Utah Public Notice — West Point proposed tax increase', url: 'https://www.utah.gov/pmn/sitemap/notice/927853.html' },
  craythorne_site: { label: 'Erik Craythorne campaign — About', url: 'https://erikcraythorne.com/about/' },
  anderson_site: { label: 'Jeff Anderson for Utah House', url: 'https://jeffandersonforutahhouse.com/' },
  wdc: { label: 'Women’s Democratic Club of Utah — 2026 endorsements', url: 'https://wdcutah.org/content.aspx?page_id=22&club_id=576336&module_id=773336' },
  se_results: { label: 'Standard-Examiner — June 23, 2026 primary results', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' },
  se_tran: { label: 'Standard-Examiner — Tami Tran, Senate District 6', url: 'https://www.standard.net/news/2026/may/25/tami-tran-highlights-experience-in-bid-for-senate-district-6-seat/' },
  tran_site: { label: 'Vote Tami Tran — Issues', url: 'https://vote4tami.com/issues/' },
  hollist_site: { label: 'Stephanie Hollist for State Senate', url: 'https://votestephaniehollist.com/' },
  und_adams: { label: 'Utah News Dispatch — Adams concedes to Hollist', url: 'https://utahnewsdispatch.com/2026/06/23/utah-senate-president-stuart-adams-republican-primary-election-results/' },
  kutv_hollist: { label: 'KUTV — Hollist not a ‘hard no’ on Stratos project', url: 'https://kutv.com/news/local/mother-of-four-who-beat-stuart-adams-is-not-hard-no-on-stratos-project' },
  sltrib_sd7: { label: 'Salt Lake Tribune — Senate District 7 primary', url: 'https://www.sltrib.com/news/politics/2026/06/04/utah-senate-president-j-stuart/' },
};

// ── DEEPEN existing docs (merge; keyed by Firestore id) ─────────────────────
const DEEPEN = {

  // ===== Erik Craythorne — HD13 (R) — West Point mayor (GOVERNING RECORD) =====
  erik_r_craythorne: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Advanced as the Republican nominee for the open Utah House District 13 seat (Clearfield–Clinton–West Point). His only Republican rival, Roxayn Elmer, withdrew, and he advanced from the April 18, 2026 Davis County Republican convention. He faces Democrat Jeffrey Anderson and the Forward Party’s Tony De Mille in the November 3, 2026 general election.',
    theme:
      'A four-term mayor of West Point (in office since 2007) and family-construction-business owner who advanced as the open-seat HD13 Republican nominee. Unlike the first-time candidates on this year’s Davis ballot, he brings a real local-government record — running a fast-growing city’s budget, infrastructure, waste and fire-district work — including a 2024 Truth-in-Taxation property-tax increase that voters can weigh against his fiscally conservative message.',
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Advanced as the open-seat HD13 Republican nominee for the November ballot',
        facts: "Craythorne filed for the open House District 13 seat (Clearfield, Clinton and West Point). After his only Republican rival, Roxayn Elmer, withdrew, he advanced from the April 18, 2026 Davis County Republican convention as the nominee, with no contested GOP primary. He faces Democrat Jeffrey Anderson and the Forward Party’s Tony De Mille in the November 3, 2026 general election.",
        why: 'His advance to the general election as the Republican nominee is the central fact of his path to the Legislature, shown here as neutral context rather than a governing record.',
        source: SRC.ksl_running },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Runs West Point on a growth-and-impact-fee budget so new development "pays its way"',
        facts: "As mayor of one of Davis County’s fastest-growing cities (about 12,700 residents heading toward a roughly 26,500 build-out), Craythorne oversees a budget the city says is funded mainly by growth rather than tax hikes: the city’s budget documents state that most new revenue comes from new growth, and that each new home or business pays impact fees ‘carefully calculated to make sure new residents and businesses are paying their way and not burdening the City.’ West Point collects only about $300,000 a year in property tax, most of a resident’s bill going to the school district, county and special districts.",
        why: 'It documents an actual governing approach — leaning on growth and impact fees instead of broad tax increases — consistent with the fiscal-responsibility message of his House campaign.',
        source: SRC.wp_budget },
      { impact: 'negative', category: 'voting', date: '2024', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: 'Oversaw a 2024 Truth-in-Taxation property-tax increase as West Point mayor',
        facts: "In 2024 West Point went through the Truth-in-Taxation process to raise its property-tax budgeted revenue 9.49% above the prior year (excluding new growth) — about $18.52 more a year on a $518,000 home, from $196.58 to $215.10 — with a public hearing on Aug. 20, 2024. For the FY2027 budget the City Council again declared its intent to go through Truth-in-Taxation. The increases are modest in dollar terms and West Point’s slice of the total bill is small, but they are real tax increases adopted under his leadership.",
        why: 'His city’s property-tax increases are concrete fiscal actions voters can weigh against the ‘fiscally responsible local government’ message of his House campaign — the kind of record-vs-rhetoric check the project applies to every officeholder.',
        source: SRC.wp_tnt },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'],
        headline: 'Brings a decade-plus of Davis County local-government and regional-board experience',
        facts: "Craythorne served seven years on the West Point City Council before being elected mayor in 2007, and runs the family business Craythorne Construction. He represents West Point on the Davis Council of Governments and sits on the North Davis Fire District board and the Wasatch Integrated Waste Management board — the local-government, public-safety and infrastructure roles his campaign points to as preparation for the Legislature.",
        why: 'It documents the actual local-government and regional-infrastructure experience at the center of his candidacy, drawn from his own campaign record.',
        source: SRC.craythorne_site },
    ],
    stances: {
      'Local Budgets & Property Tax (Record)':
        "Governing record: as West Point mayor, Craythorne runs a budget the city says is funded mainly by new growth and impact fees rather than tax hikes, but he also oversaw a 2024 Truth-in-Taxation property-tax increase of 9.49% above the prior year (about $18.52/yr on a $518,000 home), and the council declared intent to go through Truth-in-Taxation again for FY2027 (West Point City; Utah Public Notice).",
      'Growth & Housing':
        "Campaign position drawn from his record: runs on managing responsible growth and development in fast-growing West Point, using impact fees so new residents and businesses ‘pay their way’ rather than burdening existing taxpayers (West Point City budget).",
      'Transportation, Infrastructure & Waste (Record)':
        "Governing record: centers infrastructure, water and waste management, building on his seat on the Wasatch Integrated Waste Management board and his role representing West Point on the Davis Council of Governments (Craythorne campaign).",
    },
  },

  // ===== Jeffrey Anderson — HD13 (D) — first-time candidate (NO record) =====
  jeffrey_anderson: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Advanced unopposed as the Democratic nominee for the open Utah House District 13 seat (Clearfield–Clinton–West Point) from the April 25, 2026 Democratic convention; faces Republican nominee Erik Craythorne and the Forward Party’s Tony De Mille in the November 3, 2026 general election.',
    theme:
      'The Democratic nominee for the open HD13 seat and a first-time candidate — a U.S. Department of State and Veterans Affairs careerist (a supervisory medical technologist) and small-business owner — running on an accountable public-school system, clean air and water, and ‘responsible growth that balances economic development with conservation.’ With no legislative voting record, his positions so far are campaign pledges.',
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'On the November ballot as the HD13 Democratic nominee for an open seat',
        facts: "Anderson is the filed Democratic candidate for the open House District 13 seat (Clearfield, Clinton and West Point), advancing unopposed from the April 25, 2026 Democratic convention. Per the Utah Lt. Governor’s 2026 candidate filings he advances to the November 3, 2026 general election, where he faces Republican nominee Erik Craythorne and the Forward Party’s Tony De Mille.",
        why: 'It documents his confirmed place on the general-election ballot — the precondition for any future record — shown here as neutral context.',
        source: SRC.lg_filings },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaign platform: a "strong, accountable public education system that serves all students"',
        facts: "Anderson’s ‘What I Stand For’ page lists support for ‘a strong, accountable public education system that serves all students’ and for policies that strengthen ‘families, workforce readiness, and economic opportunity,’ favoring ‘practical, evidence-based approaches.’ He points to a career managing labs, budgets and teams. These are campaign positions; he has no legislative voting record.",
        why: 'It documents the K-12 and workforce focus at the center of his candidacy, drawn directly from his own platform and clearly marked as a pledge.',
        source: SRC.anderson_site },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Pledges to "protect clean air and water" with "data-driven" environmental solutions',
        facts: "On natural resources, Anderson’s platform pledges to ‘protect clean air and water for current and future generations,’ to support ‘responsible growth that balances economic development with conservation,’ and to ‘encourage data-driven solutions to Utah’s water and environmental challenges.’ Campaign positions; no voting record yet.",
        why: 'A specific air-, water- and growth-balance framing on issues central to Davis County, which voters can weigh against his eventual votes if elected.',
        source: SRC.anderson_site },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Public Statements'],
        headline: 'Federal-service and small-business background; endorsed by the Women’s Democratic Club of Utah',
        facts: "Anderson served with the U.S. Department of State and as a supervisory medical technologist with the Department of Veterans Affairs, and is a small-business owner in the Clinton–Clearfield–West Point area. The Women’s Democratic Club of Utah endorsed him, framing his focus as ‘jobs, housing, healthcare access, and environmental stewardship.’ He names housing and healthcare access as priorities but has not published detailed policy on either; this is background and endorsement context, not a governing record.",
        why: 'It documents his professional standing and the priorities his endorsement cites, while honestly flagging where he has not yet spelled out policy.',
        source: SRC.wdc },
    ],
    stances: {
      'K-12 Education':
        "Campaign position: advocates ‘a strong, accountable public education system that serves all students’ and policies strengthening ‘families, workforce readiness, and economic opportunity,’ citing his career managing labs, budgets and teams. No legislative voting record yet (Jeff Anderson campaign).",
      'Air, Water & Environment':
        "Campaign position: pledges to ‘protect clean air and water for current and future generations,’ support ‘responsible growth that balances economic development with conservation,’ and back ‘data-driven solutions to Utah’s water and environmental challenges.’ No voting record yet (Jeff Anderson campaign).",
      'Housing & Healthcare (named priorities)':
        "The Women’s Democratic Club of Utah, which endorsed him, lists housing and healthcare access among his priorities, but Anderson has not published a detailed plan on either — honestly a named priority rather than a developed policy. No voting record yet.",
    },
  },

  // ===== Tami Tran — SD6 (R) — Kaysville mayor (GOVERNING RECORD) =====
  tami_tran: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Won the June 23, 2026 Republican primary for the open Utah State Senate District 6 seat over Robert Wanlass, 71.04% (7,027 votes) to 28.96% (2,864); advances to the November 3, 2026 general election against Democrat Jared Neal and the Forward Party’s Josh Smith.',
    theme:
      'The sitting Kaysville mayor (in her fifth year) who won the open SD6 primary decisively to succeed retiring Sen. Jerry Stevenson. She pairs a real municipal record — including amending a state microschool law to protect a residential neighborhood — with a campaign for low taxes, market-led housing, parental choice, public safety and the Second Amendment.',
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the open Senate District 6 Republican primary decisively',
        facts: "Tran won the June 23, 2026 Republican primary for the open Senate District 6 seat over Robert Wanlass, 71.04% (7,027 votes) to 28.96% (2,864), for the seat being vacated by retiring Sen. Jerry Stevenson; pre-election polling had shown her up by roughly 36 points. She advances to face Democrat Jared Neal and the Forward Party’s Josh Smith in November.",
        why: 'Her decisive open-seat primary win is the central fact of her path to the Senate, shown here as neutral context.',
        source: SRC.se_results },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'As Kaysville mayor, got a state microschool law amended to protect a residential street',
        facts: "Tran has described a Kaysville situation where a passed state law allowed microschools of up to 100 students in any zone, and a proposal threatened to put up to 200 cars a day onto a dead-end residential street. She called the bill sponsor, worked with Rep. Ariel Defay to ‘clean up the bill,’ and went to the Capitol to get it ‘uncircled’ after a senator agreed to carry it — arguing lawmakers often don’t ‘realize the impact of the decisions that they make.’",
        why: 'It documents an actual governing action — fixing a state law to protect a neighborhood — and the local-impact lens she says she would bring to the Legislature.',
        source: SRC.se_tran },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Housing: government should "get out of the way" and let the market lower costs',
        facts: "Tran calls housing affordability ‘huge’ and says government’s role is to ‘get out of the way as much as possible’ so ‘local private industry [can] drive the market.’ She would also open remodeling grants — a ‘$25,000, $30,000, $50,000 grant to remodel’ — to homeowners improving existing homes, not just developers building new construction. Campaign positions; her state-level pledges are not yet a governing record.",
        why: 'A specific, market-oriented housing approach, paired with a concrete idea (remodel grants) that voters can weigh against her eventual votes.',
        source: SRC.se_tran },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaign pledge: "live within our means," fund only core services, keep taxes low',
        facts: "Tran’s campaign centers fiscal discipline — ‘living within our means,’ funding only core public services, balanced budgets, government transparency, and keeping taxes ‘simple and stable’ for families and small businesses — pointing to five years overseeing Kaysville’s municipal budget. These are campaign pledges marked pending until she takes state office.",
        why: 'It documents the budget-and-tax message at the center of her Senate bid, drawn from her own campaign and clearly labeled a pledge.',
        source: SRC.tran_site },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Backs parental choice in education, police and first responders, and the Second Amendment',
        facts: "Tran supports parental choice across public, private, charter and home-school options paired with ‘high standards’ and stronger civics; pledges to back law enforcement, firefighters and first responders and to prioritize victims’ rights; supports the right of law-abiding citizens to keep and bear arms; and is pro-life. Campaign positions; no state voting record yet.",
        why: 'It gathers her core education, public-safety and rights pledges in one place, drawn from her campaign and clearly marked as positions rather than enacted policy.',
        source: SRC.tran_site },
    ],
    stances: {
      'State Budget & Appropriations':
        "Campaign position: pledges to ‘live within our means,’ fund only core public services and keep budgets balanced, citing five years running Kaysville’s municipal budget as mayor. Marked pending until she takes state office (Tami Tran campaign).",
      'Growth & Local Infrastructure':
        "Campaign position: names economy, growth and local infrastructure a core priority, drawing on her Kaysville mayoral, City Council and Planning Commission experience managing a growing city. No state voting record yet (Tami Tran campaign).",
    },
  },
};

// ── CREATE new doc: Stephanie Hollist (SD7) ─────────────────────────────────
const HOLLIST = {
  id: 'stephanie_hollist',
  fields: {
    name: 'Stephanie Hollist',
    office: '🏛 Utah State Senate — 2026 Republican Nominee (Senate District 7)',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    district: 'District 7',
    rank: 'nominee',
    candidacyStatus: 'active',
    candidacyOutcome:
      'Won the June 23, 2026 Republican primary for Utah Senate District 7, unseating Senate President J. Stuart Adams 43.32% (6,552 votes) to 34.57% (5,228), with Braden Hess at 22.11% (3,343); advances to the November 3, 2026 general election against Democrat Garret Rushforth and the Constitution Party’s Jeffrey Ostler.',
    nextElection: '2026-11-03',
    quote: 'When leaders hold immense power, the standard should be higher, not lower.',
    quoteSource: 'From her 2026 campaign website',
    why: 'A Fruit Heights attorney and 18-year Weber State University general counsel who unseated Senate President Stuart Adams in the Republican primary on a platform of transparency and accountability, pledging not to ‘support bad policy just because lobbyists or leadership tell me to.’',
    bio:
      'Stephanie Hollist is the Republican nominee for Utah State Senate District 7 (the Layton–Kaysville–Fruit Heights area of Davis County) after defeating Senate President J. Stuart Adams in the June 23, 2026 Republican primary — 43.32% to 34.57%, with Braden Hess at 22.11% — ending the tenure of one of the Legislature’s most powerful leaders, who conceded within two hours of polls closing. A lifelong Utahn and Fruit Heights attorney who has lived in Davis County for more than 35 years, she most recently served 18 years as general counsel for Weber State University. She and her husband, who works at Davis High School, have raised four children in the Davis County School District. She ran on transparency, accountability and ‘leading with collaboration,’ criticizing how a proposed Box Elder County data center was advanced and calling for independent, verifiable data on its water use, while saying she has never taken funding from lobbyists or PACs. She advances to the November 3, 2026 general election against Democrat Garret Rushforth and the Constitution Party’s Jeffrey Ostler.',
    keyIssues: [
      'Transparency & accountability',
      'Term limits & limiting overreach',
      'K-12 education & parental input',
      'Water & responsible data-center growth',
      'Fiscal conservatism & lower taxes',
      'Attainable housing',
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Unseated Senate President Stuart Adams in the SD7 Republican primary',
        facts: "Hollist won the June 23, 2026 Republican primary for Senate District 7, defeating 20-year incumbent and Senate President J. Stuart Adams 43.32% (6,552 votes) to 34.57% (5,228), with former legislative attorney Braden Hess third at 22.11% (3,343). Adams conceded within about two hours of polls closing. ‘WE DID IT!’ Hollist said, pledging she would ‘not support bad policy just because lobbyists or leadership tell me to do so.’ She advances to face Democrat Garret Rushforth and the Constitution Party’s Jeffrey Ostler in November.",
        why: 'Defeating the sitting Senate president is the consequential fact of her candidacy and the clearest signal of the transparency-and-accountability message that powered it.',
        source: SRC.se_results },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Made transparency and accountability the cornerstone of her campaign',
        facts: "Hollist ran on ‘honesty, transparency, and accountability,’ arguing that ‘when leaders hold immense power, the standard should be higher, not lower — transparency protects institutions and the people who lead them,’ and calling for ‘more transparency in bills being passed, term limits, and leaders who do not overreach.’ She says she has ‘never taken funding from lobbyists or PACs.’ These are campaign positions; she has no legislative voting record.",
        why: 'It documents the central, on-the-record theme of her run — a standard voters can hold her to if she takes office.',
        source: SRC.hollist_site },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'On the Box Elder data center: "not a hard no," but demands independent water data',
        facts: "A central issue in the race was the proposed Stratos data center in Box Elder County, which Adams — a board member of the Military Installation Development Authority — supported. Hollist criticized how it was advanced: ‘I really think this was not well planned, not well carried out,’ and ‘I’m against the way this was rolled out, and I do believe we need more answers.’ Asked if her stance was a hard ‘no,’ she said ‘It’s not a hard no,’ but wants ‘truly independent, verifiable data that proves the proposal will not suck water from our current resources,’ citing water, air quality and ‘where the money in this deal is going.’ Campaign positions; no voting record yet.",
        why: 'A nuanced, sourced position on the data-center-and-water fight that defined her primary — conditional support tied to transparency rather than outright opposition.',
        source: SRC.kutv_hollist },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Backs local control and "parents at the table" in education',
        facts: "With a husband who works at Davis High School and four children in the Davis County School District, Hollist says ‘the best solutions come from local decision-making, with parents at the table’ and that ‘parents have the final say in their child’s education,’ emphasizing a stronger partnership between parents, teachers and communities and real-world skills for students. She also backs term limits and limited government. Campaign positions; no voting record yet.",
        why: 'It documents her K-12 and limited-government positions and the family ties to Davis County public schools she campaigns on.',
        source: SRC.hollist_site },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Runs on fiscal conservatism, lower taxes, and attainable housing',
        facts: "Hollist describes herself as focused on ‘fiscal conservatism, lower taxes, limited government, and local government.’ On housing she says ‘housing should be attainable for the people who make our communities work,’ with the state’s role being to ‘support cities in decision-making and help them find resources, independent data, and solutions’ rather than impose from above. Campaign positions; no voting record yet.",
        why: 'It documents her tax-and-housing positions, drawn from her own campaign and clearly marked as pledges rather than enacted policy.',
        source: SRC.hollist_site },
    ],
    stances: {
      'Transparency & Accountability':
        "Campaign cornerstone: ‘when leaders hold immense power, the standard should be higher, not lower.’ Wants leaders who ‘listen, disclose, and deliver results,’ more transparency in bills, and pledges not to ‘support bad policy just because lobbyists or leadership tell me to’; says she has never taken lobbyist or PAC money. No voting record yet (Hollist campaign; Standard-Examiner).",
      'Term Limits & Limited Government':
        "Campaign position: supports term limits and ‘leaders who do not overreach,’ framed within fiscal conservatism, limited government and local control. No voting record yet (Hollist campaign).",
      'Data Centers, Water & the Great Salt Lake':
        "Campaign position: opposed how the proposed Box Elder (Stratos) data center was advanced — ‘not well planned, not well carried out’ — but is ‘not a hard no’; wants ‘truly independent, verifiable data’ that big developments will not ‘suck water from our current resources,’ citing water, air quality and financing concerns (KUTV; Salt Lake Tribune).",
      'K-12 Education & Parental Input':
        "Campaign position: ‘the best solutions come from local decision-making, with parents at the table,’ and ‘parents have the final say in their child’s education’; emphasizes parent-teacher-community partnership and real-world skills. Family ties: husband works at Davis High, children in Davis County schools. No voting record yet (Hollist campaign).",
      'Taxes & Fiscal Conservatism':
        "Campaign position: describes herself as focused on ‘fiscal conservatism, lower taxes, limited government.’ No voting record yet (Hollist campaign).",
      'Housing':
        "Campaign position: ‘housing should be attainable for the people who make our communities work,’ with the state supporting cities through ‘resources, independent data, and solutions’ rather than top-down mandates. No voting record yet (Hollist campaign).",
    },
    promises: [
      { title: 'Bring transparency and accountability to the Senate', detail: "Pledges to push for more transparency in bills, to back term limits and limits on leadership overreach, and not to ‘support bad policy just because lobbyists or leadership tell me to.’", verdict: 'pending', issueKey: 'gov_transparency', sources: ['https://votestephaniehollist.com/'] },
      { title: 'Demand independent, verifiable water data before big developments', detail: "Pledges to require ‘truly independent, verifiable data’ that projects such as the proposed Box Elder data center will not draw down Utah’s water before they proceed.", verdict: 'pending', issueKey: 'water', sources: ['https://kutv.com/news/local/mother-of-four-who-beat-stuart-adams-is-not-hard-no-on-stratos-project'] },
      { title: 'Put parents at the table on education', detail: "Pledges local decision-making with ‘parents at the table’ and parents having ‘the final say’ in their child’s education, with a stronger parent-teacher-community partnership.", verdict: 'pending', issueKey: 'edu_parental', sources: ['https://votestephaniehollist.com/'] },
      { title: 'Hold the line on taxes and limited government', detail: 'Campaigns on fiscal conservatism, lower taxes and limited government, and on keeping housing attainable by supporting cities rather than mandating from above.', verdict: 'pending', issueKey: 'lower_taxes', sources: ['https://votestephaniehollist.com/'] },
    ],
    score: 56,
    accountability: {
      overallScore: 56,
      summary:
        'A first-time legislative candidate with a deep professional and legal record (18 years as Weber State University general counsel) but no elected or voting record yet; every campaign pledge is forward-looking and pending. She won the SD7 Republican primary by unseating the sitting Senate president, a decisive result on a transparency-and-accountability message.',
    },
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

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}
async function createDoc(id, fields) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }
function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
}
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

// ── issueKey validation against the live ISSUE_MAP vocabulary ───────────────
function validIssueKeys() {
  try {
    const html = readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    return new Set([...mapSlice.matchAll(/^\s{6}([a-z_0-9]+):\s+\{ label:/gm)].map((m) => m[1]));
  } catch { return null; }
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Davis County deep dive (batch 4: remaining active 2026 legislative candidates)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  // Validate every promise/receipt issueKey on the new Hollist doc.
  const valid = validIssueKeys();
  if (valid) {
    let bad = 0;
    for (const pr of HOLLIST.fields.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ hollist promise unknown issueKey '${pr.issueKey}'`); bad++; }
    console.log(bad ? `  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ Hollist issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  }

  let touched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0, totStatus = 0;

  // 1) Deepen the three existing docs (non-destructive merge).
  for (const [id, plan] of Object.entries(DEEPEN)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = { updatedAt: STAMP };

    let addedSpot = 0;
    if (hasDrivers(doc)) {
      console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
      skippedDrivers++;
    } else if (plan.spotlight && plan.spotlight.length) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      const seen = new Set(existing.map((s) => hk(s.headline || s.title)));
      const toAdd = plan.spotlight.filter((it) => !seen.has(hk(it.headline)));
      if (toAdd.length) {
        fields.spotlight = toAdd.concat(existing);
        addedSpot = toAdd.length;
      }
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

    let setStatus = 0;
    if (plan.candidacyStatus && doc.candidacyStatus !== 'active') { fields.candidacyStatus = plan.candidacyStatus; setStatus = 1; }
    if (plan.candidacyOutcome && !(typeof doc.candidacyOutcome === 'string' && doc.candidacyOutcome.trim())) { fields.candidacyOutcome = plan.candidacyOutcome; setStatus = 1; }

    totSpot += addedSpot; totStance += addedStance; totStatus += setStatus;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} receipt(s), +${addedStance} stance(s)${setStatus ? ', candidacy status/outcome set' : ''}`);

    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  // 2) Create Stephanie Hollist (only if missing, unless --force).
  const existing = await getDoc(HOLLIST.id).catch(() => null);
  if (existing && !FORCE) {
    console.log(`  • ${HOLLIST.id} (Stephanie Hollist): already exists — skipped (use --force to overwrite)`);
  } else {
    const f = HOLLIST.fields;
    const kept = f.promises.filter((x) => x.verdict === 'kept').length;
    const broken = f.promises.filter((x) => x.verdict === 'broken').length;
    const pending = f.promises.filter((x) => x.verdict === 'pending').length;
    const promises = f.promises.map((pr) => ({ title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey, sources: (pr.sources || []).map((u) => ({ label: 'Source', url: u })) }));
    const doc = {
      ...f,
      promises,
      kept, broken, pending,
      accountability: { overallScore: f.accountability.overallScore, summary: f.accountability.summary, kept, broken, pending },
      tier: tierForScore(f.score),
      profileStatus: 'full',
      spotlightTheme: f.why,
      updatedAt: STAMP,
    };
    console.log(`  ${APPLY ? '✎' : '→'} ${HOLLIST.id} (Stephanie Hollist): CREATE full profile — ${f.spotlight.length} receipt(s), ${Object.keys(f.stances).length} stance(s), ${promises.length} promise(s)`);
    if (APPLY) await createDoc(HOLLIST.id, doc);
    totSpot += f.spotlight.length; totStance += Object.keys(f.stances).length; totStatus += 1; touched++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} to ${touched} profile(s): ${totSpot} receipt(s), ${totStance} stance(s), ${totStatus} candidacy field-set(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
