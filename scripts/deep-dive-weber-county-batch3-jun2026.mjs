#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Weber County deep dive, BATCH 3 (June 2026)
//
// Batches 1 & 2 built Weber County's sitting officials and the two contested
// 2026 County Commission candidates. Batch 2 EXPLICITLY DEFERRED the active
// Weber-area STATE-LEGISLATIVE challengers ("each needs its own verified
// per-candidate sourcing pass; queued for a follow-up batch rather than padded
// here"). THIS is that follow-up. It brings Weber's legislative coverage up to
// the parity Davis County reached in its candidate batches: honest, sourced
// accountability records for the active 2026 legislative challengers and the
// one open-seat candidate, with non-incumbent challengers prioritised.
//
// 2026 STATUS — VERIFIED FIRST (Weber County clerk candidate list +
// Standard-Examiner June 23, 2026 primary reporting). All six below are
// CONFIRMED active for the November 3, 2026 general election:
//
//   • christina_cj_hernandez — CJ Hernandez (D), SENATE DISTRICT 5 (open; Sen.
//       Ann Millner retiring). WON the June 23, 2026 Democratic primary 58.71%
//       (1,824) to 41.29% (1,283) over Dakota Wurth. Faces Republican nominee
//       Jill Koford in November.                                       ✓ active
//       → ALREADY in Firestore (stances + promises) but ZERO Spotlight
//         receipts. DEEPENED here (receipts + candidacy outcome).
//   • angela_choberka  — Angela Choberka (D), HOUSE DISTRICT 9 (Ogden). Advanced
//       to November from convention (no D primary contest); 2024 rematch with
//       Republican incumbent Jake Sawyer. Former Ogden City Council member
//       (2018–2025, incl. chair/vice-chair) — has a real MUNICIPAL record.
//   • rosemary_lesser  — Rosemary T. Lesser (D), HOUSE DISTRICT 10 (Ogden).
//       Advanced to November (no D primary contest); faces Republican Jim Alvey.
//       FORMER incumbent (2021–2025); lost the seat to Jill Koford in 2024 and
//       is running to reclaim it (open because Koford is now running for SD5).
//       Has a real LEGISLATIVE record.
//   • bianca_mittendorf — Bianca Mittendorf (D), HOUSE DISTRICT 7 (North Ogden).
//       Advanced to November (no D primary contest); challenges Republican
//       incumbent Ryan D. Wilcox. First-time candidate.
//   • anna_graff       — Anna Graff (D), HOUSE DISTRICT 12 (Hooper/Roy/West
//       Haven). Advanced to November (intra-party rivals withdrew/lost at
//       convention); challenges Republican incumbent and House Speaker Mike
//       Schultz. VERY THIN public record — documented honestly, not inflated.
//   • dave_calder      — Dave Calder (D), HOUSE DISTRICT 11 (Roy). Advanced
//       UNOPPOSED within his party (Democrat Josh Koskan withdrew); challenges
//       Republican incumbent Katy Hall. First-time candidate.
//
// SKIPPED / REPORTED-NOT-AUTHORED (documented in the batch summary):
//   • Dakota Wurth (D, SD5) — LOST the June 23, 2026 primary to Hernandez;
//     eliminated from the 2026 cycle.
//   • Jake Sawyer (R, HD9) & Ryan D. Wilcox (R, HD7) — listed as optional
//     incumbent adds ONLY if "very thin." Both already carry sourced records
//     (Sawyer: 10 stances; Wilcox: 7 Spotlight items incl. enacted bills with
//     floor video). Neither is thin, so neither is re-authored — the priority
//     is the non-incumbent challengers.
//
// HONESTY RULES APPLIED (CONTENT_STYLE.md / EVIDENCE_STRENGTH.md):
//   • Every URL below returned HTTP 200 during research.
//   • CAMPAIGN PLEDGE vs GOVERNING/WORK RECORD is kept explicit per receipt.
//     Hernandez, Mittendorf, Graff and Calder have NO elected record — their
//     policy items are pledges (impact:'neutral'). Choberka's Ogden City Council
//     actions and Lesser's legislative work are tagged as real records
//     (impact:'positive'); their forward-looking 2026 statements stay pledges.
//   • NO position is invented. Where research found no verifiable stance on a
//     priority issue (e.g. Hernandez on taxes/budget/transportation/public
//     safety; most challengers on transportation/UTA/WFRC), NO stance is added —
//     those remain honest gaps, listed in the summary.
//   • Graff is the thinnest record in the batch; her doc is built to the
//     evidence available (a Utah Stonewall Democrats endorsement description and
//     her confirmed ballot status) and says so plainly rather than padding.
//   • The unconfirmed "Anna Graff" 2025 Roy City Council run surfaced in
//     research is NOT asserted here (identity not verified).
//   • Idempotent & non-destructive: existing docs are deepened, never clobbered
//     (Spotlight added only if the doc has no impact-tagged drivers; stances /
//     candidacy outcome added only when missing). New docs are created only if
//     absent (unless --force). Re-running is safe.
//
//   node scripts/deep-dive-weber-county-batch3-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-weber-county-batch3-jun2026.mjs --emit     # write index.html stance block → /tmp
//   node scripts/deep-dive-weber-county-batch3-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Sources (each fetched & HTTP-200-confirmed during research) ──────────────
const SRC = {
  se_hernandez: { label: 'Standard-Examiner — CJ Hernandez prioritizes people over party in Senate District 5 bid (May 26, 2026)', url: 'https://www.standard.net/news/2026/may/26/cj-hernandez-prioritizes-people-over-party-in-senate-district-5-bid/' },
  se_primary: { label: 'Standard-Examiner — June 23, 2026 election results', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' },
  weber_candidates: { label: 'Weber County Elections — 2026 list of candidates', url: 'https://www.weberelections.gov/listofcandidates' },
  weber_dems: { label: 'Weber County Democrats — current 2026 candidates', url: 'https://www.weberdemocrats.org/post/current-weber-county-democratic-candidates' },
  ksl_running: { label: 'KSL — Here’s who’s running for the Utah Legislature in 2026', url: 'https://www.ksl.com/article/51428770/heres-whos-running-for-the-utah-legislature-in-2026' },
  se_hd9_2024: { label: 'Standard-Examiner — District 9 Utah House candidates cite housing affordability, cost of living (Oct. 16, 2024)', url: 'https://www.standard.net/news/2024/oct/16/district-9-utah-house-candidates-cite-housing-affordability-cost-of-living-as-key-issues/' },
  slt_choberka_2024: { label: 'Salt Lake Tribune — Utah House District 9: Angela Choberka (Oct. 17, 2024)', url: 'https://www.sltrib.com/news/politics/2024/10/17/utah-house-district-9-choberka/' },
  choberka_about: { label: 'Angela Choberka campaign — About', url: 'https://www.angelachoberka.com/about' },
  ogden_choberka: { label: 'Ogden City — Council Member Angela Choberka', url: 'https://www.ogdencity.gov/1367/Angela-Choberka' },
  lesser_priorities: { label: 'Rosemary Lesser campaign — Priorities', url: 'https://www.rosemarylesser.com/priorities' },
  lesser_better: { label: 'Better Utah Progress Report — Rep. Rosemary T. Lesser', url: 'https://progressreport.betterutah.org/legislators/rep-rosemary-t-lesser/' },
  cms_postpartum: { label: 'CMS — Utah Medicaid and CHIP postpartum coverage expansion', url: 'https://www.cms.gov/newsroom/press-releases/biden-harris-administration-announces-utahs-medicaid-and-chip-postpartum-coverage-expansion-45' },
  utahpta_hb220: { label: 'Utah PTA — HB0220 Pregnancy and Postpartum Medicaid Coverage Amendments (2022)', url: 'https://www.utahpta.org/bill/2022/hb0220' },
  bianca_home: { label: 'Bianca Mittendorf campaign — home', url: 'https://www.electbianca.com/' },
  bianca_about: { label: 'Bianca Mittendorf campaign — About', url: 'https://www.electbianca.com/about' },
  bianca_platform: { label: 'Bianca Mittendorf campaign — Platform', url: 'https://www.electbianca.com/platform' },
  qsaltlake_stonewall: { label: 'QSaltLake — Utah Stonewall Democrats 2026 endorsements', url: 'https://www.qsaltlake.com/news/2026/04/20/utah-stonewall-democrats-endorsements/' },
  calder_home: { label: 'Dave Calder campaign — home', url: 'https://www.votedavecalder.com/' },
  calder_issues: { label: 'Dave Calder campaign — Issues', url: 'https://www.votedavecalder.com/issues' },
};

// ════════════════════════════════════════════════════════════════════════════
// PART A — NEW candidate documents (created if absent). status 'candidate'.
//   positions[] become BOTH the index.html ISSUE_STANCE_DATA cards (via --emit)
//   AND the Firestore `stances` mirror. spotlight[] are the Evidence Locker
//   receipts. promises[] drive kept/broken/pending.
// ════════════════════════════════════════════════════════════════════════════
const PEOPLE = [

  // ══════════════ HOUSE DISTRICT 9 (Ogden) — Angela Choberka (D) ══════════════
  {
    id: 'angela_choberka',
    name: 'Angela Choberka',
    rank: 'nominee',
    office: '🏛 Utah House of Representatives, District 9 (Ogden) · 2026 Democratic Nominee',
    icon: '🏛',
    party: 'Democrat',
    state: 'Utah',
    district: '9',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 54,
    why: 'A former two-term Ogden City Council member, longtime teacher and Weber State adjunct now in a 2024 rematch with Republican incumbent Jake Sawyer, running on housing affordability, public education and rebuilding trust between residents and their government.',
    quote: 'Building trust between constituents and their government representatives is essential.',
    bio: 'Angela Choberka is the 2026 Democratic nominee for Utah House District 9 in Ogden, in a rematch with Republican incumbent Jake Sawyer, who defeated her for the open seat in 2024. She advanced to the November 3, 2026 general election from the Democratic side without a primary contest. A career educator — roughly a decade as an elementary school teacher and more than a decade as an adjunct English professor at Weber State University — she now works in legal operations at Intermountain Health. She served on the Ogden City Council from 2018 through 2025, including terms as chair and vice chair, with board service on the Weber-Morgan Health Department, the Ogden Nature Center, the Community Renewable Energy Agency Board and Ogden United Promise Neighborhood.',
    keyIssues: ['Housing Affordability', 'Public Education', 'Government Trust & Transparency', 'Cost of Living', 'Clean Environment'],
    candidacyOutcome:
      'Advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 9 without a Democratic primary contest. Faces Republican incumbent Jake Sawyer in a rematch of the 2024 race, which Sawyer won for the then-open seat. (Weber County Elections candidate list; Standard-Examiner/Salt Lake Tribune 2024 coverage.)',
    positions: [
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: 'Frames her run around residents being able to "afford to live in their current communities"; on the Ogden City Council she questioned a city subsidy for a downtown development she warned would produce units "the most unaffordable in all of Ogden."', source: SRC.se_hd9_2024 },
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: 'A former elementary teacher and Weber State adjunct who lists access to high-quality education among her central priorities and calls public education a critical issue for the district.', source: SRC.se_hd9_2024 },
      { topic: 'Government Trust & Transparency', icon: '🤝', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Calls building trust between constituents and their representatives "essential," pledges to host regular town halls and create "opportunities for dialogue," and casts herself as an advocate for a government rooted in trust.', source: SRC.choberka_about },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support', text: 'Names cost of living a defining pressure for District 9 families, tying affordable housing and accessible economic opportunity together as core campaign themes.', source: SRC.se_hd9_2024 },
      { topic: 'Clean Environment', icon: '🌱', pos: 'support', issueKey: 'enviro_balance', issueStance: 'support', text: 'Lists a cleaner environment among her priorities and served on the Community Renewable Energy Agency Board while on the Ogden City Council.', source: SRC.choberka_about },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Advanced to the November ballot for HD9 in a 2024 rematch with the incumbent',
        facts: 'Choberka advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 9 without a Democratic primary contest. She faces Republican incumbent Jake Sawyer, who defeated her for the then-open seat in 2024 (when Calvin Musselman left it to run for the Senate). This is a rematch of that 2024 race.',
        why: 'Her path to the November ballot and the rematch framing are the central facts of the race, shown as neutral context rather than a governing record.',
        source: SRC.weber_candidates },
      { impact: 'positive', category: 'leadership', date: '2024', tags: ['Notable Actions', 'Consistency'],
        headline: 'Questioned an Ogden housing subsidy as producing the city’s least-affordable units (City Council record)',
        facts: 'As an Ogden City Council member, Choberka challenged a city subsidy for a downtown housing development, asking why the city would help build units that she said "would be the most unaffordable in all of Ogden." This is an actual municipal governing record from her 2018–2025 Council service, not a state legislative vote.',
        why: 'It is a documented instance of her acting on housing affordability in office — a real record voters can weigh against her campaign message, tagged as a municipal action rather than a state record.',
        source: SRC.se_hd9_2024 },
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Notable Actions'],
        headline: 'Served two terms on the Ogden City Council, including as chair and vice chair (record)',
        facts: 'Choberka served on the Ogden City Council from 2018 through 2025, including terms as chair and vice chair, with board service on the Weber-Morgan Health Department, the Ogden Nature Center, the Community Renewable Energy Agency Board and Ogden United Promise Neighborhood. She also worked as a teacher and Weber State adjunct and now works in legal operations at Intermountain Health.',
        why: 'It documents an actual record of local public service and the experience she brings to a state-legislative bid, sourced to the city’s own roster.',
        source: SRC.ogden_choberka },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Pledges town halls and "opportunities for dialogue" to rebuild government trust',
        facts: 'Choberka calls her ability to "bring people together and listen" her greatest attribute, pledges to host regular town halls and create "opportunities for dialogue," and says building trust between constituents and their representatives is "essential," citing the harm she sees from political polarization. Campaign positions; she has no state legislative record.',
        why: 'It documents the transparency-and-engagement standard at the center of her campaign, clearly marked as a forward-looking pledge.',
        source: SRC.choberka_about },
    ],
    promises: [
      { title: 'Host regular town halls and rebuild constituent trust', detail: 'Pledges to hold regular town halls and create "opportunities for dialogue," casting trust between residents and their representatives as essential. Campaign pledge; no state legislative record yet.', verdict: 'pending', issueKey: 'gov_transparency', sources: [SRC.choberka_about.url] },
      { title: 'Keep District 9 residents able to afford their communities', detail: 'Pledges to focus on housing affordability and cost of living so residents can afford to live in their current communities. Campaign pledge informed by her Ogden City Council work on housing.', verdict: 'pending', issueKey: 'housing_build', sources: [SRC.se_hd9_2024.url] },
      { title: 'Champion access to high-quality public education', detail: 'A former teacher who pledges to prioritise access to high-quality education for the district. Campaign pledge; no state legislative record yet.', verdict: 'pending', issueKey: 'public_schools', sources: [SRC.se_hd9_2024.url] },
    ],
    accountability: { overallScore: 54, summary: 'A two-term Ogden City Council member (chair/vice chair) with a real municipal record on housing and local service, now seeking state office for the first time. Her state-issue positions are forward-looking campaign pledges and are pending; the score reflects a clear platform plus documented local experience, with no state legislative voting record to judge yet.' },
  },

  // ══════════════ HOUSE DISTRICT 10 (Ogden) — Rosemary T. Lesser (D) ══════════════
  {
    id: 'rosemary_lesser',
    name: 'Rosemary T. Lesser',
    rank: 'nominee',
    office: '🏛 Utah House of Representatives, District 10 (Ogden) · 2026 Democratic Nominee',
    icon: '🏛',
    party: 'Democrat',
    state: 'Utah',
    district: '10',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 60,
    why: 'A retired Air Force officer and longtime Ogden OB/GYN running to reclaim the House seat she held from 2021 to 2025, with a documented legislative record on postpartum Medicaid, veterans and the food tax.',
    quote: 'We must balance growth with affordability.',
    bio: 'Rosemary T. Lesser is the 2026 Democratic nominee for Utah House District 10 in Ogden, running to reclaim the seat she held from 2021 to 2025. She advanced to the November 3, 2026 general election without a Democratic primary contest and faces Republican Jim Alvey; the seat is open because the Republican who beat her in 2024, Jill Koford, is now running for Senate District 5. A retired U.S. Air Force officer (15 years active duty) and an Ogden OB/GYN for roughly three decades, she first won the seat in a 2021 special election following Rep. Lou Shurtliff’s death, then narrowly lost re-election to Koford in 2024. In office she was the only Democrat on the Legislature’s Veterans Caucus, a member of the bipartisan Clean Air Caucus, and served on the Public Education Appropriations Committee.',
    keyIssues: ['Public Education Funding', 'Food Tax & Affordability', 'Great Salt Lake & Clean Air', 'Healthcare', 'Housing'],
    candidacyOutcome:
      'Advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 10 without a Democratic primary contest, against Republican Jim Alvey. A former representative (2021–2025), she is running to reclaim the seat after losing it to Jill Koford in 2024; it is open in 2026 because Koford is running for Senate District 5. (Weber County Elections candidate list; Better Utah Progress Report.)',
    positions: [
      { topic: 'Public Education Funding', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: 'Served on the Public Education Appropriations Committee and advocates increased, stable public-school funding paired with oversight focused on accountability, transparency and student outcomes.', source: SRC.lesser_priorities },
      { topic: 'Food Tax & Affordability', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support', text: 'Says she opposed a plan that would have raised the state sales tax on food and now advocates eliminating the state sales tax on groceries entirely to ease cost-of-living pressure.', source: SRC.lesser_priorities },
      { topic: 'Great Salt Lake & Clean Air', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support', text: 'A member of the bipartisan Clean Air Caucus who argues Utah "must plan boldly and responsibly" so future generations have clean, reliable water, backing conservation, water infrastructure and protecting the Great Salt Lake.', source: SRC.lesser_priorities },
      { topic: 'Healthcare', icon: '🩺', pos: 'support', issueKey: 'healthcare', issueStance: 'support', text: 'An OB/GYN who sponsored the extension of postpartum Medicaid coverage and a bipartisan pharmacy prescription-transfer law, framing maternal and patient access to care as a legislative priority.', source: SRC.lesser_priorities },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: 'Argues the state "must balance growth with affordability," supporting increased housing supply, renter protections and pathways to homeownership; in office she co-sponsored expanded rental-expense disclosure.', source: SRC.lesser_priorities },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2022', tags: ['Notable Actions', 'Consistency'],
        headline: 'Sponsored the extension of postpartum Medicaid coverage from 60 days to 12 months',
        facts: 'As an OB/GYN legislator, Lesser sponsored legislation (the 2022-session Pregnancy and Postpartum Medicaid Coverage Amendments) to extend Utah’s postpartum Medicaid coverage from 60 days to a full year. Utah implemented the 12-month extension, with the federal Centers for Medicare & Medicaid Services announcing approval in March 2024. This is an enacted legislative/governing record.',
        why: 'A documented, enacted result tied directly to her medical expertise — concrete follow-through that voters can verify through the federal CMS announcement and the bill record.',
        source: SRC.cms_postpartum },
      { impact: 'positive', category: 'voting', date: '2021', tags: ['Notable Actions'],
        headline: 'Cites a record of bipartisan bills: pharmacy prescription transfers, veterans pension tax relief, renter disclosure',
        facts: 'Lesser’s campaign cites a 2021–2022 legislative record that includes a bipartisan law allowing prescriptions (including controlled substances) to be transferred between pharmacies, co-sponsoring elimination of the state income tax on military-retirement pensions as the only Democrat on the Veterans Caucus, and co-sponsoring expanded rental-expense disclosure. These are records she cites on her campaign site; the postpartum Medicaid item above is independently confirmed by CMS.',
        why: 'It captures the breadth of her stated legislative record while being explicit that these specific items rest on her own campaign account, with the postpartum item separately verified.',
        source: SRC.lesser_priorities },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'],
        headline: 'Lost the seat narrowly in 2024; now running to reclaim an open HD10',
        facts: 'Lesser represented House District 10 from 2021 to 2025 before losing re-election to Republican Jill Koford in a close 2024 race. She is running in 2026 to reclaim the seat, which is open because Koford is running for Senate District 5. She advanced to the November general without a Democratic primary contest and faces Republican Jim Alvey.',
        why: 'The 2024 loss and 2026 comeback are central to understanding her candidacy, shown as neutral fact.',
        source: SRC.lesser_better },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaigns to eliminate the state sales tax on groceries',
        facts: 'Lesser says she opposed a plan that would have increased the state sales tax on food and now advocates eliminating the state sales tax on groceries entirely. This is a forward-looking campaign position for 2026.',
        why: 'It documents a specific, sourced fiscal pledge on a cost-of-living issue, clearly marked as a campaign position.',
        source: SRC.lesser_priorities },
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Notable Actions'],
        headline: 'Recognized as a "Purple Champion" for Weber County overdose-reduction work',
        facts: 'Lesser was named a "Purple Champion for Weber County in 2025" for overdose-reduction work through the Ogden CAN Opioid Committee, alongside her Clean Air Caucus membership and her service as the only Democrat on the Legislature’s Veterans Caucus. (Reported on her campaign site.)',
        why: 'It documents continued public-health engagement between terms, framed as her campaign’s account of community work rather than an enacted vote.',
        source: SRC.lesser_priorities },
    ],
    promises: [
      { title: 'Eliminate the state sales tax on groceries', detail: 'Pledges to eliminate the state sales tax on food entirely, after opposing a plan she says would have raised it. Forward-looking 2026 campaign pledge.', verdict: 'pending', issueKey: 'cost_living', sources: [SRC.lesser_priorities.url] },
      { title: 'Increase and stabilise public-education funding', detail: 'Pledges increased, stable public-school funding with oversight on accountability, transparency and student outcomes, drawing on her Public Education Appropriations Committee experience.', verdict: 'pending', issueKey: 'public_schools', sources: [SRC.lesser_priorities.url] },
      { title: 'Plan "boldly and responsibly" for water and the Great Salt Lake', detail: 'Pledges conservation, water infrastructure and protection of the Great Salt Lake so future generations have clean, reliable water. Campaign pledge tied to her Clean Air Caucus work.', verdict: 'pending', issueKey: 'water', sources: [SRC.lesser_priorities.url] },
    ],
    accountability: { overallScore: 60, summary: 'A former representative (2021–2025) with a documented legislative record — including the CMS-confirmed postpartum Medicaid extension — running to reclaim her seat. Her enacted work is counted as a real record; her 2026 platform items are forward-looking pledges. The score reflects genuine record depth, tempered by the fact that several cited bills rest primarily on her own campaign account.' },
  },

  // ══════════════ HOUSE DISTRICT 7 (North Ogden) — Bianca Mittendorf (D) ══════════════
  {
    id: 'bianca_mittendorf',
    name: 'Bianca Mittendorf',
    rank: 'nominee',
    office: '🏛 Utah House of Representatives, District 7 (North Ogden) · 2026 Democratic Nominee',
    icon: '🏛',
    party: 'Democrat',
    state: 'Utah',
    district: '7',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 49,
    why: 'A first-time candidate, public-education professional and civil-rights advocate challenging Republican incumbent Ryan Wilcox on a platform of affordable housing, fully funded public schools and accessible childcare.',
    quote: 'People Powered. Utah Proud.',
    bio: 'Bianca Mittendorf is the 2026 Democratic nominee for Utah House District 7 in the North Ogden area, challenging Republican incumbent Ryan D. Wilcox. She advanced to the November 3, 2026 general election without a Democratic primary contest. A first-time legislative candidate, she describes herself as a public-education professional and civil-rights advocate, a working mother and the spouse of a veteran. Her campaign, themed "People Powered. Utah Proud.", centers on three priorities: affordable housing, fully funded public schools, and accessible childcare.',
    keyIssues: ['Affordable Housing', 'Public Schools', 'Childcare Affordability', 'Local Voice in Growth'],
    candidacyOutcome:
      'Advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 7 (North Ogden area) without a Democratic primary contest, challenging Republican incumbent Ryan D. Wilcox. (Weber County Elections candidate list; KSL 2026 legislative roundup.)',
    positions: [
      { topic: 'Affordable Housing', icon: '🏠', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: 'Supports "collaborative housing policy solutions that respect local voices" and is skeptical of state mandates that require cities to build homes "without ensuring adequate infrastructure is in place."', source: SRC.bianca_platform },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: 'Calls funding schools and teachers "non-negotiable" and pledges to pursue a "responsive, fully funded public education system."', source: SRC.bianca_platform },
      { topic: 'Childcare Affordability', icon: '🧸', pos: 'support', issueKey: 'child_care', issueStance: 'support', text: 'Says "skyrocketing childcare costs have pushed quality care out of reach" and pledges to work to lower childcare costs for parents.', source: SRC.bianca_platform },
      { topic: 'Local Voice in Growth', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Frames housing and growth policy around respecting "local voices," arguing communities should not be subject to state building mandates that outpace local infrastructure.', source: SRC.bianca_platform },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Advanced to the November ballot to challenge the HD7 incumbent',
        facts: 'Mittendorf advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 7 in the North Ogden area without a Democratic primary contest. She challenges Republican incumbent Ryan D. Wilcox.',
        why: 'Her path to the November ballot and the matchup are the central facts of the race, shown as neutral context.',
        source: SRC.weber_candidates },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Runs on three priorities: affordable housing, public schools, accessible childcare',
        facts: 'Mittendorf’s campaign, themed "People Powered. Utah Proud.", names three priorities — affordable housing, strong fully funded public schools, and accessible childcare. She describes herself as a public-education professional and civil-rights advocate, a working mother and the spouse of a veteran. Campaign positions; as a first-time candidate she has no governing record.',
        why: 'It documents the platform at the center of her campaign, clearly marked as pledges.',
        source: SRC.bianca_home },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Housing pledge: "respect local voices," oppose unfunded state building mandates',
        facts: 'On housing, Mittendorf criticizes state mandates that require cities to build homes "without ensuring adequate infrastructure is in place" and pledges "collaborative housing policy solutions that respect local voices." Campaign position; no governing record.',
        why: 'A specific, sourced growth-and-housing position on an issue central to fast-growing Weber County, marked as a pledge.',
        source: SRC.bianca_platform },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Calls public-school funding "non-negotiable" and childcare costs out of reach',
        facts: 'Mittendorf calls funding schools and teachers "non-negotiable," pledging a "responsive, fully funded public education system," and says "skyrocketing childcare costs have pushed quality care out of reach," pledging to lower costs for parents. Campaign positions; no governing record.',
        why: 'It documents her education and childcare pledges in her own words, clearly marked as forward-looking commitments.',
        source: SRC.bianca_platform },
    ],
    promises: [
      { title: 'Pursue a fully funded public education system', detail: 'Pledges that funding schools and teachers is "non-negotiable" and to work toward a responsive, fully funded public education system. Campaign pledge; first-time candidate with no governing record.', verdict: 'pending', issueKey: 'public_schools', sources: [SRC.bianca_platform.url] },
      { title: 'Lower childcare costs for parents', detail: 'Pledges to address "skyrocketing childcare costs" and lower costs for parents. Campaign pledge.', verdict: 'pending', issueKey: 'child_care', sources: [SRC.bianca_platform.url] },
      { title: 'Pursue housing solutions that "respect local voices"', detail: 'Pledges collaborative housing policy that respects local control and pairs growth with adequate infrastructure. Campaign pledge.', verdict: 'pending', issueKey: 'housing_build', sources: [SRC.bianca_platform.url] },
    ],
    accountability: { overallScore: 49, summary: 'A first-time legislative candidate with a clear, three-issue platform but no elected or governing record. Every policy item is a forward-looking campaign pledge and is pending; the score reflects a defined platform without a record to judge yet.' },
  },

  // ══════════════ HOUSE DISTRICT 12 (Hooper) — Anna Graff (D) — THINNEST ══════════════
  {
    id: 'anna_graff',
    name: 'Anna Graff',
    rank: 'nominee',
    office: '🏛 Utah House of Representatives, District 12 (Hooper) · 2026 Democratic Nominee',
    icon: '🏛',
    party: 'Democrat',
    state: 'Utah',
    district: '12',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 42,
    why: 'The Democratic nominee challenging House Speaker Mike Schultz in HD12. Verifiable public information about her platform is limited; her record is documented honestly to the evidence available rather than padded.',
    bio: 'Anna Graff is the 2026 Democratic nominee for Utah House District 12 in the Hooper/Roy/West Haven area, challenging Republican incumbent and Utah House Speaker Mike Schultz. She advanced to the November 3, 2026 general election after intra-party rivals withdrew or were eliminated at convention. Verifiable public information about her candidacy is limited: in endorsing her, the Utah Stonewall Democrats described her as a community leader and advocate with a background in public service who focuses on education, economic development and inclusive policymaking. A detailed campaign platform was not publicly available in the sources reviewed as of mid-2026.',
    keyIssues: ['Education', 'Economic Development', 'Inclusive Policymaking'],
    candidacyOutcome:
      'Advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 12 (Hooper/Roy/West Haven) after intra-party rivals withdrew or were eliminated at convention. Challenges Republican incumbent and Utah House Speaker Mike Schultz. (Weber County Elections candidate list.)',
    positions: [
      { topic: 'Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: 'In endorsing her, the Utah Stonewall Democrats described her as focused on strengthening local communities through education. No detailed first-person education platform was located in the sources reviewed.', source: SRC.qsaltlake_stonewall },
      { topic: 'Economic Development', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support', text: 'The Utah Stonewall Democrats endorsement describes her as focused on economic development and inclusive policymaking. No detailed first-person economic platform was located in the sources reviewed.', source: SRC.qsaltlake_stonewall },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Advanced to the November ballot to challenge House Speaker Mike Schultz',
        facts: 'Graff advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 12 in the Hooper/Roy/West Haven area after intra-party rivals withdrew or were eliminated at convention. She challenges Republican incumbent and Utah House Speaker Mike Schultz.',
        why: 'Her ballot status and the prominence of her opponent are the central verifiable facts of the race, shown as neutral context.',
        source: SRC.weber_candidates },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Endorsed by Utah Stonewall Democrats as a community advocate focused on education and inclusion',
        facts: 'In endorsing her, the Utah Stonewall Democrats described Graff as a community leader and advocate with a background in public service who focuses on strengthening local communities through education, economic development and inclusive policymaking. This is a third-party endorsement description, not a first-person policy statement; a detailed campaign platform was not publicly available in the sources reviewed.',
        why: 'It is the only substantive description of her priorities found in the sources reviewed — surfaced honestly, and flagged as an endorsement’s framing rather than her own published platform.',
        source: SRC.qsaltlake_stonewall },
    ],
    promises: [],
    accountability: { overallScore: 42, summary: 'The thinnest record in this batch. Graff is a confirmed active 2026 nominee challenging the House Speaker, but no detailed first-person platform was publicly available in the sources reviewed; the available description comes from a Utah Stonewall Democrats endorsement. Her record is documented to that evidence and not inflated — substantial gaps remain and are noted honestly.' },
  },

  // ══════════════ HOUSE DISTRICT 11 (Roy) — Dave Calder (D) ══════════════
  {
    id: 'dave_calder',
    name: 'Dave Calder',
    rank: 'nominee',
    office: '🏛 Utah House of Representatives, District 11 (Roy) · 2026 Democratic Nominee',
    icon: '🏛',
    party: 'Democrat',
    state: 'Utah',
    district: '11',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 51,
    why: 'A first-time candidate who advanced unopposed within his party to challenge Republican incumbent Katy Hall, running on eliminating the grocery tax, affordable housing and protecting Medicaid and higher-education funding.',
    quote: 'Strengthening Communities by Lowering Costs for Working Families.',
    bio: 'Dave Calder is the 2026 Democratic nominee for Utah House District 11 in the Roy area, challenging Republican incumbent Katy Hall. He advanced to the November 3, 2026 general election unopposed within his party after fellow Democrat Josh Koskan withdrew. His campaign, themed "Strengthening Communities by Lowering Costs for Working Families," centers on eliminating the state sales tax on groceries, affordable housing, and protecting Medicaid and higher-education funding. His campaign materials provide limited biographical detail beyond a tagline of service.',
    keyIssues: ['Eliminate the Food Tax', 'Affordable Housing', 'Higher-Education Funding', 'Healthcare & Medicaid', 'Voter Access'],
    candidacyOutcome:
      'Advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 11 (Roy area) unopposed within his party after fellow Democrat Josh Koskan withdrew. Challenges Republican incumbent Katy Hall. (Weber County Elections candidate list; Weber County Democrats candidate page.)',
    positions: [
      { topic: 'Eliminate the Food Tax', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support', text: 'Pledges to "work to eliminate the food tax," calling for no state sales tax on groceries as a cost-of-living measure for working families.', source: SRC.calder_issues },
      { topic: 'Affordable Housing', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: 'Supports creating affordable housing for working families, noting that median home prices along the Wasatch Front have more than doubled since 2015.', source: SRC.calder_issues },
      { topic: 'Higher-Education Funding', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support', text: 'Pledges to "stand against dangerous budget cuts" to colleges and universities and against what he calls "unscientific mandates."', source: SRC.calder_issues },
      { topic: 'Healthcare & Medicaid', icon: '🩺', pos: 'support', issueKey: 'healthcare', issueStance: 'support', text: 'Supports Medicaid expansion to cover gaps he attributes to cuts to the Affordable Care Act.', source: SRC.calder_issues },
      { topic: 'Voter Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support', text: 'Calls vote-by-mail "vital to voter accessibility," cites Proposition 4’s prohibition on congressional gerrymandering, and pledges to oppose efforts to "reverse the will of the people."', source: SRC.calder_issues },
      { topic: 'Local Police & Immigration', icon: '⚖️', pos: 'oppose', issueKey: 'immig_balance', issueStance: 'oppose', text: 'Pledges to "fight against mandates for law enforcement officers to support ICE" and opposes efforts to place an ICE detention center in Utah.', source: SRC.calder_issues },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Advanced unopposed within his party to challenge the HD11 incumbent',
        facts: 'Calder advanced to the November 3, 2026 general election as the Democratic nominee for Utah House District 11 in the Roy area unopposed within his party after fellow Democrat Josh Koskan withdrew. He challenges Republican incumbent Katy Hall.',
        why: 'His uncontested path to the November ballot and the matchup are the central facts of the race, shown as neutral context.',
        source: SRC.weber_dems },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Top pledge: eliminate the state sales tax on groceries',
        facts: 'Calder’s campaign, themed "Strengthening Communities by Lowering Costs for Working Families," pledges to "work to eliminate the food tax" — no state sales tax on groceries — as its central cost-of-living measure. Campaign position; as a first-time candidate he has no governing record.',
        why: 'It documents the central fiscal pledge of his campaign, clearly marked as forward-looking.',
        source: SRC.calder_issues },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Pledges to protect higher-education budgets and expand Medicaid',
        facts: 'Calder pledges to "stand against dangerous budget cuts" to colleges and universities and against "unscientific mandates," and supports Medicaid expansion to cover gaps he attributes to cuts to the Affordable Care Act. Campaign positions; no governing record.',
        why: 'It documents his higher-education and healthcare pledges in his own words, marked as forward-looking commitments.',
        source: SRC.calder_issues },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Opposes mandates for local police to assist ICE and a Utah ICE detention center',
        facts: 'Calder pledges to "fight against mandates for law enforcement officers to support ICE" and opposes efforts to place an ICE detention center in Utah. Campaign position; no governing record.',
        why: 'A specific, sourced public-safety/immigration position, clearly marked as a campaign pledge.',
        source: SRC.calder_issues },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Backs vote-by-mail and cites Proposition 4 against gerrymandering',
        facts: 'Calder calls vote-by-mail "vital to voter accessibility," cites that Proposition 4 prohibits the Legislature from gerrymandering congressional districts, and pledges to oppose attempts to "reverse the will of the people." Campaign positions; no governing record.',
        why: 'It documents his elections-and-democracy pledges, drawn from his own campaign and marked as forward-looking.',
        source: SRC.calder_issues },
    ],
    promises: [
      { title: 'Eliminate the state sales tax on groceries', detail: 'Pledges to work to eliminate the food tax as the central cost-of-living plank of his campaign. Campaign pledge; first-time candidate with no governing record.', verdict: 'pending', issueKey: 'cost_living', sources: [SRC.calder_issues.url] },
      { title: 'Protect higher-education funding and expand Medicaid', detail: 'Pledges to oppose budget cuts to colleges and universities and to support Medicaid expansion to cover ACA-related gaps. Campaign pledge.', verdict: 'pending', issueKey: 'edu_college_cost', sources: [SRC.calder_issues.url] },
      { title: 'Create affordable housing for working families', detail: 'Pledges to support creation of affordable housing, citing that Wasatch Front median home prices have more than doubled since 2015. Campaign pledge.', verdict: 'pending', issueKey: 'housing_build', sources: [SRC.calder_issues.url] },
    ],
    accountability: { overallScore: 51, summary: 'A first-time legislative candidate with a detailed issues platform but no elected or governing record. Every policy item is a forward-looking campaign pledge and is pending; the score reflects a well-defined platform without a record to judge yet.' },
  },

];

// ════════════════════════════════════════════════════════════════════════════
// PART B — DEEPEN existing docs (non-destructive merge; keyed by Firestore id)
// ════════════════════════════════════════════════════════════════════════════
const DEEPEN = {

  // ===== CJ Hernandez — Senate District 5 (D) — open seat, primary WINNER =====
  christina_cj_hernandez: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Won the June 23, 2026 Democratic primary for the open Utah Senate District 5 (Sen. Ann Millner retiring) 58.71% (1,824 votes) to 41.29% (1,283) over Dakota Wurth, after neither candidate secured the nomination outright at the April 2026 Democratic convention. Advances to the November 3, 2026 general election against Republican nominee Jill Koford, a sitting state representative.',
    // theme only set if missing; she already has stances/promises.
    theme:
      'A first-time candidate and 20-year U.S. Foreign Service diplomat who won an open-seat Senate primary on a "people over party" message centered on the Great Salt Lake and clean air, housing affordability and public-school funding. With no prior elected office, her platform is campaign pledges — measured here against a real professional record, not a voting record.',
    // Add a dedicated Housing stance (priority issue) not already present; her
    // existing "Cost of Living" stance bundles housing/childcare/healthcare.
    stances: {
      'Housing Affordability':
        "Campaign pledge: proposes 'out-of-the-box' approaches to housing affordability, including equity-share models that let renters build equity and partnerships with banks, unions and employers to ease cost-of-living pressure. No voting record yet (Standard-Examiner).",
    },
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the open-seat Democratic primary for Senate District 5',
        facts: 'Hernandez won the June 23, 2026 Democratic primary for the open Utah Senate District 5 (Sen. Ann Millner retiring) 58.71% (1,824 votes) to 41.29% (1,283) over Dakota Wurth, after neither candidate clinched the nomination at the April 2026 convention. She advances to the November 3, 2026 general election against Republican nominee Jill Koford, a sitting state representative.',
        why: 'Her primary win and the November matchup are the central facts of her path to the Senate, shown as neutral context rather than a governing record.',
        source: SRC.se_primary },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Runs "people over party" on the Great Salt Lake, clean air and affordability',
        facts: 'Hernandez frames herself as a moderate running on the Great Salt Lake and clean air, housing affordability and public education, saying "I’m not here to represent a party; I’m here to represent people." On the lake and air she warns that "if we are breathing toxic dust, all the rest doesn’t matter too much," and proposes working with groups such as the Utah Rivers Council to refill the lake "without simply hoping it rains." Campaign positions; she has no voting record.',
        why: 'It documents the central message and signature environmental position of her campaign in her own words, clearly marked as pledges.',
        source: SRC.se_hernandez },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'On schools: "public money should be for public schools, period"',
        facts: 'Hernandez, who says she was raised by a public-school teacher, calls public education a top priority and says she would revisit voucher programs, arguing "public money should be for public schools, period," while adding she is not opposed to private school or homeschooling. Campaign position; no voting record.',
        why: 'A specific, sourced education-funding position central to her platform, marked as a forward-looking pledge.',
        source: SRC.se_hernandez },
      { impact: 'positive', category: 'leadership', date: '2026', tags: ['Notable Actions'],
        headline: 'Brings a 20-year diplomatic career to the race (professional record)',
        facts: 'Before running, Hernandez spent roughly two decades as a U.S. Foreign Service diplomat — conducting tens of thousands of visa interviews, doing human-rights reporting, serving as an election observer abroad, and overseeing training for diplomats from many nations — and an Ogden native who later worked at Hill Air Force Base and as a community-affairs coordinator for Ogden City. This is a professional record, not an elected or voting record.',
        why: 'It documents the real-world experience she brings to a first run for office, clearly distinguished from a governing record.',
        source: SRC.se_hernandez },
      { impact: 'neutral', category: 'statement', date: '2026', tags: ['Public Statements'],
        headline: 'Endorsed by the Democratic Veterans Caucus',
        facts: 'Hernandez received the endorsement of the Democratic Veterans Caucus, drawing on her diplomatic service alongside the military: "I’ve served side by side with veterans... Diplomats and generals aren’t that different." Reported endorsement and statement.',
        why: 'A sourced endorsement and her framing of it, shown as a neutral campaign fact.',
        source: SRC.se_hernandez },
    ],
  },

};

// ── Firestore value encoder / decoder ────────────────────────────────────────
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
async function exists(id) { const r = await fetch(`${BASE}/${id}`); return r.ok; }
async function createDoc(id, fields) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }
function hasDrivers(doc) { const sl = Array.isArray(doc.spotlight) ? doc.spotlight : []; return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative')); }
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

// Build the full Firestore document body for one NEW person.
function buildDoc(p) {
  const kept = p.promises.filter((x) => x.verdict === 'kept').length;
  const broken = p.promises.filter((x) => x.verdict === 'broken').length;
  const pending = p.promises.filter((x) => x.verdict === 'pending').length;

  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;

  const promises = p.promises.map((pr) => ({
    title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey,
    sources: (pr.sources || []).map((u) => ({ label: 'Source', url: u })),
  }));

  // Spotlight receipts: flatten source object to {label,url}.
  const spotlight = (p.spotlight || []).map((s) => ({
    impact: s.impact, category: s.category, date: s.date, tags: s.tags || [],
    headline: s.headline, facts: s.facts, why: s.why,
    source: { label: s.source.label, url: s.source.url },
    ...(s.issueKey ? { issueKey: s.issueKey } : {}),
  }));

  const fields = {
    name: p.name, office: p.office, party: p.party, state: p.state, icon: p.icon,
    bio: p.bio, keyIssues: p.keyIssues, promises, stances, spotlight,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending, score: p.score, tier: tierForScore(p.score),
    profileStatus: 'full', candidacyStatus: p.candidacyStatus, nextElection: p.nextElection,
    reviewStatus: 'verified', updatedAt: STAMP,
  };
  if (p.why) fields.why = p.why;
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}

// ── index.html ISSUE_STANCE_DATA emit (new candidates) ───────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Weber County legislative challengers · 2026 (Batch 3) ────────────────────');
  out.push('    // Active 2026 Weber-area state-legislative candidates confirmed for the November');
  out.push('    // ballot. Each card is keyed to an ISSUE_MAP issue so the profile joins Stance at');
  out.push("    // a Glance, the Evidence Locker issue labels, the People's Mandate bridge and the");
  out.push('    // Alignment Tool. Pledge-vs-record framing lives in the Firestore Spotlight.');
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Weber County deep dive (batch 3: active 2026 legislative candidates)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s+\{ label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (pr.issueKey && !valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
    }
    for (const [, plan] of Object.entries(DEEPEN)) {
      for (const s of (plan.spotlight || [])) if (s.issueKey && !valid.has(s.issueKey)) { console.log(`  ⚠ deepen: unknown spotlight issueKey '${s.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/weber-county-batch3-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  // PART A — create new candidate docs
  let created = 0, skippedExisting = 0;
  let newSpot = 0, newStance = 0, newProm = 0;
  console.log('NEW candidate documents:');
  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const tag = `${p.id} (${p.name}) · ${p.party} HD${p.district} · ${fields.spotlight.length} receipt(s), ${Object.keys(fields.stances).length} stance(s), ${fields.pending}P`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); skippedExisting++; continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      const ex = await exists(p.id);
      console.log(`  ${ex ? '·' : '→'} ${tag}${ex ? ' (exists — would skip)' : ''}`);
    }
    newSpot += fields.spotlight.length; newStance += Object.keys(fields.stances).length; newProm += fields.pending;
    created++;
  }

  // PART B — deepen existing docs
  console.log('\nDEEPEN existing documents:');
  let touched = 0, missing = 0, skippedDrivers = 0, dSpot = 0, dStance = 0, dStatus = 0;
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
      const toAdd = plan.spotlight
        .filter((it) => !seen.has(hk(it.headline)))
        .map((s) => ({ impact: s.impact, category: s.category, date: s.date, tags: s.tags || [], headline: s.headline, facts: s.facts, why: s.why, source: { label: s.source.label, url: s.source.url }, ...(s.issueKey ? { issueKey: s.issueKey } : {}) }));
      if (toAdd.length) { fields.spotlight = toAdd.concat(existing); addedSpot = toAdd.length; }
      if (plan.theme && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) fields.spotlightTheme = plan.theme;
    }

    let addedStance = 0;
    const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? { ...doc.stances } : {};
    for (const [topic, text] of Object.entries(plan.stances || {})) if (!(topic in stances)) { stances[topic] = text; addedStance++; }
    if (addedStance) fields.stances = stances;

    let setStatus = 0;
    if (plan.candidacyOutcome && !(typeof doc.candidacyOutcome === 'string' && doc.candidacyOutcome.trim())) { fields.candidacyOutcome = plan.candidacyOutcome; setStatus = 1; }
    if (plan.candidacyStatus && !(typeof doc.candidacyStatus === 'string' && doc.candidacyStatus.trim())) { fields.candidacyStatus = plan.candidacyStatus; }

    dSpot += addedSpot; dStance += addedStance; dStatus += setStatus;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} receipt(s), +${addedStance} stance(s)${setStatus ? ', candidacy outcome set' : ''}`);
    if (Object.keys(fields).length > 1) { if (APPLY) await patch(id, fields); touched++; }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}:`);
  console.log(`  • NEW: ${created} candidate doc(s) — ${newSpot} receipt(s), ${newStance} stance(s), ${newProm} pending promise(s). (${skippedExisting} already existed.)`);
  console.log(`  • DEEPEN: ${touched} doc(s) — ${dSpot} receipt(s), ${dStance} stance(s), ${dStatus} candidacy outcome(s). (${skippedDrivers} already had drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html stance block, --apply to write Firestore.');
})();
