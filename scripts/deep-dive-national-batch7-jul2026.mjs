#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive, BATCH 7 (July 2026)
//
// A targeted national push expanding coverage of the highest-profile federal
// players and connecting sourced evidence to priority-issue stances. It ENRICHES
// the existing Trump record with his signature 2025 law and two landmark second-
// term actions, and CREATES the top congressional leaders who had roster-level
// entries but no curated issue stances. Every card carries a verifiable
// {evidence, source}; the facet style is used where a record is genuinely
// two-sided.
//
//   • DONALD TRUMP (ENRICH `trump`) — adds the "One Big Beautiful Bill" (H.R.1,
//     signed July 4, 2025) as a THREE-AXIS FACET FAMILY (tax cuts / deficit /
//     Medicaid-SNAP), plus the birthright-citizenship order and the Supreme
//     Court's Trump v. CASA ruling on nationwide injunctions, and the push to
//     end the war in Ukraine. Non-destructive: appends, never clobbers.
//   • J.D. VANCE (CREATE `vance`) — Vice President: the tie-breaking H.R.1 vote
//     (his 5th), the Feb. 2025 Munich Security Conference speech, the Feb. 28,
//     2025 Oval Office clash with Zelensky, and immigration enforcement.
//   • JOHN THUNE (CREATE `thune`) — Senate Majority Leader (R-SD): shepherding
//     H.R.1 + the first rescissions package in 30 years, a judicial-confirmation
//     blitz, and — notably — RESISTING Trump's pressure to end the filibuster.
//   • HAKEEM JEFFRIES (CREATE `jeffries`) — House Minority Leader (D-NY): the
//     record 8h44m "magic minute" speech against H.R.1 and his budgets-are-moral
//     opposition to the Trump domestic agenda.
//   • CHUCK SCHUMER (CREATE `schumer`) — Senate Minority Leader (D-NY): the
//     March 2025 vote to let a GOP funding bill clear the filibuster (then voting
//     no on final passage) that drew fury from his own party, and his harder line
//     in the fall 2025 shutdown.
//
// BALANCE & TREATMENT: the set spans the current power structure — President and
// VP, the Senate Majority and Minority Leaders, and the House Minority Leader
// (3 Republicans, 2 Democrats). Per CONTENT_STYLE.md every card is written to the
// INDIVIDUAL's own recorded act or words; vote tallies are stated as plain facts
// (Senate 51-50 with the VP breaking the tie; House 218-214), never as party-line
// characterizations. Contested effects (CBO's deficit and coverage estimates) are
// attributed to the CBO, not asserted as editorial.
//
// COMPLEMENTARY, non-duplicative:
//   • `trump` ALREADY EXISTS (17 cards incl. a tariffs facet family) → ENRICH.
//   • `lee` and `curtis` ALREADY have deep records (incl. Lee's public-lands
//     saga) → intentionally NOT touched here to avoid duplication.
//   • vance / thune / jeffries / schumer had NO stance arrays → CREATE.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • Speaker Mike Johnson, and other high-profile members (e.g., committee
//     chairs, prominent backbenchers) are named for a later wave, not stubbed.
//   • WIRING: newly created federal figures are added to ISSUE_STANCE_DATA
//     (stance cards) and, via --apply, to Firestore; confirm they are also added
//     to the bundled CMP_DATA roster so they surface in search/compare (the
//     roster-wiring gap flagged in the coverage audit applies here too).
//
// SOURCING (verified July 2026; primary + major outlets):
//   • H.R.1 / OBBBA: Congress.gov, Ballotpedia; CBO estimates via CBS/Time.
//   • Trump v. CASA (6-3, June 27, 2025): Congress.gov CRS; EO 14160 WhiteHouse.
//   • Ukraine Oval Office (Feb 28, 2025): PBS NewsHour.
//   • Vance tie-breaker (July 1, 2025): PBS; Munich (Feb 14, 2025): Foreign Policy.
//   • Thune: The Hill (H.R.1), thune.senate.gov (confirmations rules change).
//   • Jeffries magic minute (July 3, 2025): CBS News.
//   • Schumer March 2025 funding vote: The Hill; fall 2025 shutdown: CNN.
//
//   node scripts/deep-dive-national-batch7-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-batch7-jul2026.mjs --emit     # write stance block to /tmp
//   node scripts/deep-dive-national-batch7-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-10T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  h1_law:       { label: 'Congress.gov', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' },
  h1_ballot:    { label: 'Ballotpedia', url: 'https://ballotpedia.org/One_Big_Beautiful_Bill_Act' },
  cbo_cbs:      { label: 'CBS News', url: 'https://www.cbsnews.com/news/hakeem-jeffries-speech-house-floor-record/' },
  casa_crs:     { label: 'Congress.gov (CRS)', url: 'https://www.congress.gov/crs-product/LSB11331' },
  eo14160:      { label: 'WhiteHouse.gov', url: 'https://www.whitehouse.gov/presidential-actions/2025/01/protecting-the-meaning-and-value-of-american-citizenship/' },
  pbs_oval:     { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics/what-trump-and-zelenskyy-said-during-their-heated-argument-in-the-oval-office' },
  pbs_vance:    { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics/senate-passes-trumps-reconciliation-bill-with-vance-casting-tie-breaking-vote' },
  fp_munich:    { label: 'Foreign Policy', url: 'https://foreignpolicy.com/2025/02/18/vance-speech-munich-full-text-read-transcript-europe/' },
  cnn_vance:    { label: 'CNN', url: 'https://www.cnn.com/2025/02/28/politics/trump-zelensky-vance-oval-office' },
  hill_h1:      { label: 'The Hill', url: 'https://thehill.com/homenews/senate/5379224-senate-passes-trump-gop-megabill/' },
  hill_fili:    { label: 'The Hill', url: 'https://thehill.com/homenews/senate/5599623-schumer-shutdown-progressive-anger/' },
  thune_conf:   { label: 'thune.senate.gov', url: 'https://www.thune.senate.gov/public/index.cfm/2025/9/thune-republicans-protect-decades-of-senate-precedent-on-confirmations' },
  cbs_jeffries: { label: 'CBS News', url: 'https://www.cbsnews.com/news/hakeem-jeffries-speech-house-floor-record/' },
  time_jeffries:{ label: 'TIME', url: 'https://time.com/7299967/hakeem-jeffries-record-house-speech-trump-big-beautiful-bill/' },
  cnn_schumer:  { label: 'CNN', url: 'https://www.cnn.com/2025/11/11/politics/schumer-senate-shutdown-democrats' },
};

// ── Curated, sourced data (keyed by Firestore doc id) ────────────────────────
const DATA = {
  // ══════════ Donald Trump — ENRICH: signature 2025 law + landmark actions ══════════
  trump: {
    enrich: true,
    name: 'Donald Trump',
    // Spotlight receipts appended to the Firestore doc; stanceCards mirrored into
    // the existing `trump` ISSUE_STANCE_DATA array by hand.
    addSpotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: "Signed the One Big Beautiful Bill Act (H.R.1) into law",
        facts: "On July 4, 2025, Trump signed H.R.1 — the 'One Big Beautiful Bill Act' — his signature second-term law, which makes permanent and extends the 2017 individual tax rates, adds new deductions, and funds border security, defense, and energy. The Senate passed it 51-50 (with VP Vance breaking the tie) on July 1 and the House 218-214 on July 3.",
        why: "The central legislative achievement of his second term, enacted through budget reconciliation.",
        source: SRC.h1_law },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'national_debt',
        headline: "The same law adds an estimated $3.4 trillion to deficits (CBO)",
        facts: "The Congressional Budget Office estimated H.R.1 would increase federal deficits by about $3.4 trillion through 2034 and raised the debt limit. Fiscal conservatives including Sen. Rand Paul voted against it over the debt impact.",
        why: "The cost side of his signature law — its tax cuts are paired with a large projected deficit increase.",
        source: SRC.cbo_cbs },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'healthcare',
        headline: "The law pairs tax cuts with Medicaid and SNAP reductions",
        facts: "H.R.1 offsets part of its cost with reductions to federal Medicaid and SNAP spending; the CBO estimated roughly 12 million more people would be without health insurance by 2034 as a result. Supporters framed the changes as work requirements and program integrity.",
        why: "The trade-off inside the law — tax relief financed in part by cuts to safety-net programs.",
        source: SRC.cbo_cbs },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'immigration_reform',
        headline: "Birthright-citizenship order and the Trump v. CASA ruling",
        facts: "Trump signed Executive Order 14160 seeking to deny citizenship to children born to unauthorized immigrants or temporary visa holders. In Trump v. CASA (June 27, 2025), the Supreme Court ruled 6-3 to curb nationwide 'universal' injunctions that had blocked the order — without deciding whether the order itself is constitutional, a merits question left for later litigation.",
        why: "A signature immigration action and a landmark ruling reshaping how executive policies can be challenged in court.",
        source: SRC.casa_crs },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'restraint',
        headline: "Pressed to end the war in Ukraine, clashing with Zelensky",
        facts: "Pursuing a rapid negotiated end to the Russia-Ukraine war, Trump — with VP Vance — clashed with Ukrainian President Zelensky in a televised Oval Office meeting on Feb. 28, 2025, pressing him to show more gratitude and to accept diplomacy; a planned minerals agreement went unsigned and Trump said Zelensky was not welcome back until 'ready for peace.'",
        why: "Crystallizes his America First approach to Ukraine — pushing a deal and conditioning U.S. support.",
        source: SRC.pbs_oval },
    ],
    addStances: {
      'Signature 2025 Law (H.R.1)': "Signed the 'One Big Beautiful Bill Act' (July 4, 2025) extending the 2017 tax cuts and funding border and defense — which the CBO estimated adds ~$3.4T to deficits and, via Medicaid/SNAP cuts, leaves ~12M more uninsured by 2034.",
      'Birthright Citizenship & Courts': "Signed EO 14160 to end birthright citizenship for children of unauthorized immigrants; the Supreme Court's Trump v. CASA (6-3) curbed nationwide injunctions blocking it without ruling on the merits.",
    },
    stanceCards: [
      { topic: 'H.R.1: Tax Cuts', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support', text: "Signed the One Big Beautiful Bill Act (July 4, 2025), making the 2017 individual tax rates permanent, adding new deductions, and funding border and defense — passed 51-50 in the Senate (VP tie-breaker) and 218-214 in the House.", source: SRC.h1_law },
      { topic: 'H.R.1: Deficit & Debt', icon: '📈', pos: 'oppose', issueKey: 'national_debt', issueStance: 'oppose', text: "The same law adds an estimated $3.4 trillion to federal deficits through 2034 (CBO) and raised the debt limit — the fiscal cost of pairing tax cuts with new spending.", source: SRC.cbo_cbs },
      { topic: 'H.R.1: Medicaid & SNAP', icon: '🏥', pos: 'mixed', issueKey: 'healthcare', issueStance: 'mixed', text: "Offsets part of its cost with Medicaid and SNAP reductions the CBO estimates leave ~12M more people uninsured by 2034; supporters call them work requirements and program integrity.", source: SRC.cbo_cbs },
      { topic: 'Birthright Citizenship & Courts', icon: '⚖️', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support', text: "Signed EO 14160 to end birthright citizenship for children of unauthorized immigrants; in Trump v. CASA (6-3, June 2025) the Supreme Court curbed nationwide injunctions blocking it — without ruling on the order's constitutionality.", source: SRC.casa_crs },
      { topic: 'Ending the Ukraine War', icon: '🕊', pos: 'mixed', issueKey: 'restraint', issueStance: 'mixed', text: "Pushed a rapid negotiated end to the Russia-Ukraine war and clashed with President Zelensky in a Feb. 28, 2025 Oval Office meeting, pressing for gratitude and diplomacy; a planned minerals deal went unsigned.", source: SRC.pbs_oval },
    ],
  },

  // ══════════ J.D. Vance — Vice President (CREATE) ══════════
  vance: {
    create: true,
    name: 'J.D. Vance',
    office: '🇺🇸 Vice President of the United States',
    party: 'Republican', state: 'Ohio', icon: '🇺🇸',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Economy, Inflation & Cost of Living', 'Immigration & Border Security', 'Foreign Policy & National Security', 'Civil Rights, Culture & Free Speech'],
    bio: "J.D. Vance is the Vice President of the United States, elected in 2024 alongside Donald Trump after one term as a U.S. senator from Ohio. As VP he presides over the Senate and has become the administration's decisive tie-breaking vote and a leading voice on immigration, trade, and a restraint-minded 'America First' foreign policy — including a pointed 2025 Munich Security Conference speech and a televised Oval Office clash with Ukraine's president.",
    acctSummary: "The Vice President and the administration's key Senate closer. Vance cast the tie-breaking vote to pass the One Big Beautiful Bill Act (H.R.1) on July 1, 2025 — his fifth tie-breaker — after working senators one-by-one to hold the 51-50 margin. On the world stage he delivered a February 2025 Munich Security Conference speech arguing Europe's greatest threat is internal — censorship and the exclusion of populist voices — and warning U.S. support would hinge on free-speech and democratic norms; two weeks later he was central to a heated Oval Office exchange pressing Ukraine's Zelensky toward a negotiated peace. He is a consistent immigration hawk. His record blends institutional tie-breaking power with a distinctly nationalist, restraint-minded foreign policy.",
    theme: "The Vice President is the administration's decisive Senate tie-breaker and the sharpest voice of its nationalist, restraint-minded foreign policy — from the Munich stage to the Oval Office.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: "Cast the tie-breaking vote to pass the One Big Beautiful Bill Act",
        facts: "On July 1, 2025, Vance cast the tie-breaking vote as the Senate passed H.R.1 51-50 — his fifth tie-breaking vote as VP. Three Republicans (Tillis, Collins, Paul) joined all Democrats against it; Vance spent the marathon session meeting holdout senators one-by-one to hold the majority.",
        why: "His most consequential institutional act — the vote that enacted the administration's signature law.",
        source: SRC.pbs_vance },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'free_speech',
        headline: "Munich speech: Europe's threat is 'from within'",
        facts: "At the Munich Security Conference on Feb. 14, 2025, Vance argued Europe's principal danger comes from an internal retreat from free speech and democratic norms — citing annulled elections and 'misinformation' laws — rather than from Russia or China, and warned U.S. support would be conditioned on those norms. European leaders pushed back sharply; some on the European right agreed.",
        why: "A defining statement of his worldview that reframed the transatlantic debate around free speech and democracy.",
        source: SRC.fp_munich },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'restraint',
        headline: "Central to the Oval Office clash with Zelensky",
        facts: "In a televised Feb. 28, 2025 Oval Office meeting, Vance told Zelensky it was 'disrespectful' to 'litigate this in front of the American media' and pressed him on gratitude and diplomacy to 'end the destruction of your country.' The meeting collapsed without a planned minerals agreement.",
        why: "Put his skepticism of open-ended Ukraine aid at the center of U.S. foreign policy in a single, public confrontation.",
        source: SRC.cnn_vance },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'border_security',
        headline: "A consistent immigration hawk",
        facts: "As senator and now VP, Vance has been a leading advocate of large-scale interior enforcement and deportations and of tighter asylum and border limits, framing immigration levels as a driver of housing and wage pressure on American workers.",
        why: "Anchors one of the administration's top priorities to the VP's long-stated position.",
        source: SRC.fp_munich },
    ],
    stances: {
      'Economy, Inflation & Cost of Living': "Cast the tie-breaking Senate vote to pass H.R.1, the administration's signature tax-and-spending law.",
      'Immigration & Border Security': "A consistent hawk on interior enforcement, deportations, and tighter border and asylum limits.",
      'Foreign Policy & National Security': "A restraint-minded 'America First' voice — skeptical of open-ended Ukraine aid and pressing a negotiated peace.",
      'Civil Rights, Culture & Free Speech': "Argues (Munich, 2025) that free speech and democratic norms, not external rivals, are the West's central test.",
    },
    stanceCards: [
      { topic: 'Tie-Breaking H.R.1 Vote', icon: '⚖️', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support', text: "Cast the tie-breaking vote (51-50) to pass the One Big Beautiful Bill Act on July 1, 2025 — his fifth tie-breaker — after working GOP holdouts one-by-one.", source: SRC.pbs_vance },
      { topic: 'Munich Speech: Free Speech', icon: '🗣', pos: 'support', issueKey: 'free_speech', issueStance: 'support', text: "At Munich (Feb. 2025) argued Europe's threat is internal — censorship and excluding populists — and warned U.S. support hinges on free-speech and democratic norms.", source: SRC.fp_munich },
      { topic: 'Ukraine: Push for Peace', icon: '🕊', pos: 'mixed', issueKey: 'restraint', issueStance: 'mixed', text: "Central to the Feb. 28, 2025 Oval Office clash with Zelensky, pressing gratitude and diplomacy to 'end the destruction'; skeptical of open-ended aid.", source: SRC.cnn_vance },
      { topic: 'Immigration Enforcement', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support', text: "A consistent hawk on interior enforcement, deportations, and tighter border/asylum limits, tying immigration levels to worker wages and housing costs.", source: SRC.fp_munich },
    ],
  },

  // ══════════ John Thune — Senate Majority Leader (CREATE) ══════════
  thune: {
    create: true,
    name: 'John Thune',
    office: '🏛 U.S. Senate Majority Leader (R-SD)',
    party: 'Republican', state: 'South Dakota', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Government Spending, Debt & Waste', 'Economy, Inflation & Cost of Living', 'Election Integrity & Institutions'],
    bio: "John Thune is the U.S. Senate Majority Leader, a South Dakota Republican in the Senate since 2005 who won the leadership election in November 2024 to succeed the retiring Mitch McConnell. He runs a narrow 53-47 majority, and his tenure has centered on enacting the administration's agenda through reconciliation while defending Senate institutions — most notably resisting pressure to eliminate the legislative filibuster.",
    acctSummary: "The Senate Majority Leader steering a slim 53-47 majority. Thune shepherded the One Big Beautiful Bill Act (H.R.1) to a 51-50 passage on July 1, 2025, along with the first rescissions package in three decades and a heavy run of 'vote-a-ramas,' and has driven judicial confirmations at a record early-term pace, initiating a September 2025 rules change to speed nominations while keeping the blue-slip custom. His most consequential stand has been institutional: he has repeatedly resisted President Trump's public demand to abolish the legislative filibuster, warning it would 'haunt' Republicans when they are next in the minority. A record of delivering the agenda while defending Senate norms.",
    theme: "The Senate Majority Leader has delivered the administration's agenda through a razor-thin majority — while drawing a hard line against Trump's demand to end the filibuster.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: "Shepherded H.R.1 through the Senate 51-50",
        facts: "As Majority Leader, Thune guided the One Big Beautiful Bill Act to passage on July 1, 2025 — a 51-50 vote with VP Vance breaking the tie — holding all but three Republicans together through an overnight vote-a-rama. He also delivered the first rescissions package signed into law in about 30 years.",
        why: "The core test of his leadership — enacting the signature law on the narrowest possible margin.",
        source: SRC.hill_h1 },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'democracy_balance',
        headline: "Resisted Trump's push to abolish the filibuster",
        facts: "Thune has repeatedly declined President Trump's public demand to eliminate the legislative filibuster, warning it would 'haunt' Republicans when Democrats next hold power and noting there are not the votes to do it. Trump called out Thune by name and labeled filibuster defenders 'fools'; Thune held his position.",
        why: "His defining institutional stand — protecting a Senate norm against pressure from his own party's president.",
        source: SRC.hill_fili },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'democracy_balance',
        headline: "Drove a record-pace judicial-confirmation blitz",
        facts: "Thune has confirmed circuit and district judges at a pace exceeding the first Trump term, and in September 2025 initiated a rules change he framed as restoring 'Senate precedent' to expedite presidential nominees — while joining Sen. Grassley in keeping the blue-slip policy that gives home-state senators a say, resisting Trump's call to end it.",
        why: "A major, lasting output of his majority — and another place he balanced the president's demands against Senate custom.",
        source: SRC.thune_conf },
    ],
    stances: {
      'Government Spending, Debt & Waste': "Delivered the first rescissions package in ~30 years and ran repeated vote-a-ramas to enact spending changes through reconciliation.",
      'Economy, Inflation & Cost of Living': "Shepherded the One Big Beautiful Bill Act (H.R.1) to a 51-50 Senate passage as Majority Leader.",
      'Election Integrity & Institutions': "Resisted Trump's demand to abolish the filibuster and kept the blue-slip custom while speeding judicial confirmations — defending Senate norms under pressure.",
    },
    stanceCards: [
      { topic: 'Shepherded H.R.1', icon: '🏛', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support', text: "As Majority Leader, guided the One Big Beautiful Bill Act to a 51-50 Senate passage (July 1, 2025) and delivered the first rescissions package in ~30 years.", source: SRC.hill_h1 },
      { topic: 'Defended the Filibuster', icon: '🛡', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support', text: "Repeatedly resisted Trump's demand to abolish the legislative filibuster, warning it would 'haunt' Republicans in the minority — even as Trump called filibuster defenders 'fools.'", source: SRC.hill_fili },
      { topic: 'Judicial Confirmation Blitz', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed', text: "Confirmed judges at a record early-term pace and changed Senate rules (Sept. 2025) to speed nominations, while keeping the blue-slip custom against Trump's wishes.", source: SRC.thune_conf },
    ],
  },

  // ══════════ Hakeem Jeffries — House Minority Leader (CREATE) ══════════
  jeffries: {
    create: true,
    name: 'Hakeem Jeffries',
    office: '🏛 U.S. House Minority Leader (D-NY)',
    party: 'Democrat', state: 'New York', icon: '🏛',
    candidacyStatus: 'office',
    score: 61,
    keyIssues: ['Healthcare Costs & Access', 'Government Spending, Debt & Waste', 'Economy, Inflation & Cost of Living'],
    bio: "Hakeem Jeffries is the U.S. House Minority Leader, a New York Democrat who has led House Democrats since 2023 as the first Black leader of a party in Congress. In the minority during the second Trump term, he has centered his leadership on opposing the administration's domestic agenda — most memorably delivering the longest speech in House history against the 2025 reconciliation law.",
    acctSummary: "The House Democratic leader and the party's chief opponent of the Trump domestic agenda in the chamber. On July 3, 2025, Jeffries used the leader's unlimited 'magic minute' to speak for 8 hours and 44 minutes — the longest speech in House history — against the One Big Beautiful Bill Act, calling it 'an immoral document' and reading constituents' stories to argue its Medicaid and SNAP cuts would 'tear people down,' partly to force a daytime vote. The bill passed hours later. He frames budgets as 'moral documents' and has anchored his opposition in the CBO's finding that the law adds $3.4 trillion to deficits and leaves ~12 million more uninsured. His record is defined by high-profile, procedural-and-moral opposition from the minority.",
    theme: "The House Minority Leader made his stand against the Trump agenda literal — the longest floor speech in House history — framing budgets as moral documents.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'healthcare',
        headline: "Gave the longest speech in House history against H.R.1",
        facts: "On July 3, 2025, Jeffries used the leader's 'magic minute' to speak for 8 hours and 44 minutes — breaking Kevin McCarthy's 2021 record — against the One Big Beautiful Bill Act. He called it 'an immoral document,' read constituent stories about its Medicaid and SNAP cuts, and aimed to push the vote into daylight. The bill passed later that day 218-214.",
        why: "His signature act of opposition — a record-setting stand that framed the fight in moral terms even as the bill passed.",
        source: SRC.cbs_jeffries },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'national_debt',
        headline: "'Budgets are moral documents'",
        facts: "Jeffries anchored his opposition in the CBO's estimates that H.R.1 adds about $3.4 trillion to deficits and leaves roughly 12 million more people uninsured by 2034, arguing 'budgets should be designed to lift people up' and that the law 'tears people down.'",
        why: "States the fiscal-and-values case at the center of his leadership of the minority.",
        source: SRC.time_jeffries },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'healthcare',
        headline: "Led unified House Democratic opposition to the agenda",
        facts: "As leader, Jeffries held House Democrats together against the reconciliation law and the broader Trump domestic agenda; every Democrat opposed H.R.1, which passed 218-214 only after several Republican holdouts flipped overnight.",
        why: "Shows the cohesion of the opposition he leads, and the narrow margins he forced.",
        source: SRC.cbs_jeffries },
    ],
    stances: {
      'Healthcare Costs & Access': "Led House Democrats against H.R.1's Medicaid and SNAP cuts, citing the CBO's estimate of ~12M more uninsured by 2034.",
      'Government Spending, Debt & Waste': "Opposed the reconciliation law over the CBO's ~$3.4T deficit estimate, arguing 'budgets are moral documents.'",
      'Economy, Inflation & Cost of Living': "Frames the Trump domestic agenda as tearing people down rather than lifting them up.",
    },
    stanceCards: [
      { topic: 'Record Speech vs. H.R.1', icon: '🗣', pos: 'oppose', issueKey: 'healthcare', issueStance: 'oppose', text: "Gave the longest speech in House history — 8h44m on July 3, 2025 — against the One Big Beautiful Bill Act, calling it 'an immoral document' and reading stories of its Medicaid/SNAP cuts.", source: SRC.cbs_jeffries },
      { topic: "'Budgets Are Moral Documents'", icon: '📊', pos: 'oppose', issueKey: 'national_debt', issueStance: 'oppose', text: "Anchored his opposition in the CBO's ~$3.4T deficit and ~12M-more-uninsured estimates: 'budgets should be designed to lift people up,' not 'tear people down.'", source: SRC.time_jeffries },
      { topic: 'Unified Democratic Opposition', icon: '🏛', pos: 'oppose', issueKey: 'healthcare', issueStance: 'oppose', text: "Held every House Democrat against H.R.1, which passed 218-214 only after GOP holdouts flipped overnight — the cohesion of the minority he leads.", source: SRC.cbs_jeffries },
    ],
  },

  // ══════════ Chuck Schumer — Senate Minority Leader (CREATE) ══════════
  schumer: {
    create: true,
    name: 'Chuck Schumer',
    office: '🏛 U.S. Senate Minority Leader (D-NY)',
    party: 'Democrat', state: 'New York', icon: '🏛',
    candidacyStatus: 'office',
    score: 55,
    keyIssues: ['Government Spending, Debt & Waste', 'Economy, Inflation & Cost of Living', 'Election Integrity & Institutions'],
    bio: "Chuck Schumer is the U.S. Senate Minority Leader, a New York Democrat who has led Senate Democrats since 2017. In the minority during the second Trump term, his tenure has been defined by hard choices over government-funding fights — including a March 2025 decision to help a Republican funding bill clear the filibuster that drew fury from his own party, and a harder line in the record fall 2025 shutdown.",
    acctSummary: "The Senate Democratic leader navigating the minority against a unified Republican government. In March 2025 Schumer broke with most of his caucus to help a GOP stopgap funding bill overcome the 60-vote filibuster — then voted against final passage — arguing a shutdown would give President Trump 'free rein' to gut agencies and fire workers; the move infuriated many Democrats and drew talk of a leadership challenge. He reversed posture in the fall 2025 funding fight, embodying his base's anger through a record 40-day shutdown. His record is a study in the minority leader's dilemma: when to deny the majority votes it needs and when doing so hands the other side more power.",
    theme: "The Senate Minority Leader's defining fights are over government funding — a March 2025 vote to avoid a shutdown that enraged his own party, then a hard-line reversal in the fall.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'democracy_balance',
        headline: "Helped a GOP funding bill clear the filibuster, then voted no",
        facts: "In March 2025, Schumer and nine Democrats joined Republicans to provide the votes needed to overcome the 60-vote filibuster on a GOP stopgap funding bill — while Schumer himself then voted against final passage. He argued a shutdown would let Trump 'fire government employees at will' and dismantle agencies. The move drew fury from House and Senate Democrats and rumblings of a leadership challenge.",
        why: "The defining, and most contested, decision of his minority leadership — averting a shutdown at the cost of his own base's trust.",
        source: SRC.hill_fili },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_balance',
        headline: "Took a hard line in the record fall 2025 shutdown",
        facts: "In the fall 2025 funding showdown, Schumer reversed his March posture and channeled his base's anger through a record 40-day government shutdown before it ended — an intentional turnaround from the deal that had made him a target within his party earlier in the year.",
        why: "Shows the strategic whiplash of the minority leader's dilemma — and his response to the March backlash.",
        source: SRC.cnn_schumer },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'healthcare',
        headline: "Led Senate Democratic opposition to the Trump agenda",
        facts: "Schumer marshaled unified Senate Democratic opposition to the One Big Beautiful Bill Act and other administration priorities; all Democrats voted against H.R.1, which passed 51-50 only with the Vice President's tie-breaking vote.",
        why: "Establishes the opposition he leads and the narrow margins that decided the year's biggest votes.",
        source: SRC.hill_h1 },
    ],
    stances: {
      'Government Spending, Debt & Waste': "Made the year's hardest funding calls — helping a GOP stopgap clear the filibuster in March 2025 to avoid a shutdown, then backing a record 40-day shutdown in the fall.",
      'Economy, Inflation & Cost of Living': "Led unified Senate Democratic opposition to H.R.1, which passed only on the VP's tie-breaking vote.",
      'Election Integrity & Institutions': "Argued averting the March 2025 shutdown was necessary to keep Trump from gutting agencies 'at will' — a contested institutional judgment.",
    },
    stanceCards: [
      { topic: 'March 2025 Funding Vote', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed', text: "Helped a GOP stopgap clear the 60-vote filibuster (then voted no on passage), arguing a shutdown would let Trump gut agencies 'at will' — enraging his own party.", source: SRC.hill_fili },
      { topic: 'Fall 2025 Shutdown Reversal', icon: '🔁', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed', text: "Reversed course in the fall, channeling base anger through a record 40-day shutdown — a deliberate turnaround from the March deal that made him a target.", source: SRC.cnn_schumer },
      { topic: 'Opposition to H.R.1', icon: '🏛', pos: 'oppose', issueKey: 'healthcare', issueStance: 'oppose', text: "Led unified Senate Democratic opposition to the One Big Beautiful Bill Act, which passed 51-50 only on the Vice President's tie-breaking vote.", source: SRC.hill_h1 },
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
  out.push('    // ── National / federal figures · Batch 7 (July 2026) ──────────────────────────');
  out.push('    // High-profile federal players with sourced, priority-issue stances. Trump\'s new');
  out.push('    // cards (H.R.1 facet family, birthright/CASA, Ukraine) are appended to his existing');
  out.push('    // array; the leaders below are new. Vote tallies stated as plain facts; contested');
  out.push('    // effects (CBO deficit/coverage estimates) attributed to the CBO.');
  for (const [id, plan] of Object.entries(DATA)) {
    if (plan.enrich) continue; // trump cards appended to the existing array by hand
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
  console.log(`PolitiDex — National deep dive (batch 7: Trump enrich + Vance/Thune/Jeffries/Schumer)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

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
    const f = '/tmp/national-batch7-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, enriched = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

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

    if (doc) { console.log(`  · ${id} (${plan.name}): already exists — skipping create`); existed++; continue; }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.office} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created, ${enriched} enriched (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the stance block, --apply to write Firestore.');
})();
