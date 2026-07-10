#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah County deep dive, BATCH 1 (June 2026)
//
// A DELIBERATELY SCOPED accountability pass on Utah County, modeled on the
// Box Elder County deep dive (deep-dive-box-elder-county-batch1). This is NOT a
// blanket pass over every city council and small-town mayor. It targets only the
// SITTING officials tied to the county's highest-attention, highest-impact
// current fights, where the public interest and the sourcing are both strongest:
//
//   • DATA CENTERS & WATER  — Eagle Mountain's data-center buildout (Meta, Google,
//                             the ~$6B QTS campus) and the water-transparency fight.
//   • GROWTH & DEVELOPMENT  — Vineyard's "Utah City" mega-development on the former
//                             Geneva Steel site and the spending/oversight scandal
//                             that reshaped the city's leadership.
//   • PROPERTY TAX & BUDGET — the Utah County Commission's ~48% property-tax
//                             increase for the 2025 budget and the backlash to it.
//   • PUBLIC SAFETY         — the County Attorney's prosecution of the 2025 UVU /
//                             Charlie Kirk shooting and the security review it spurred.
//
// This batch is COMPLEMENTARY to the existing Utah County 2026-candidate stance
// data already in index.html (mike_smith_sheriff, michelle_kaufusi, david_spencer_utco,
// etc.). Those records cover the CHALLENGERS; this batch covers the SITTING officials
// who actually CAST the controversial votes and made the contested decisions — the
// accountability core that was missing.
//
// A roster audit of index.html confirmed NONE of the eight officials below already
// exist (Mike McKell already has a profile and is intentionally EXCLUDED; the Utah
// Lake "islands" fight is also largely resolved 2022–2024 and is tracked, not built).
// Every entry is therefore a CREATE.
//
// CURRENT-STATUS VERIFICATION (research-confirmed June 2026; primary/local sourcing):
//   • jared_gray            — Mayor of Eagle Mountain; took office Jan 2026, term
//                             through 2029 (nonpartisan office). NOT on 2026 ballot. → CREATE
//   • julie_fullmer         — Mayor of Vineyard ~2018–Jan 2026; did NOT seek
//                             reelection; left office early Jan 2026.               → CREATE
//   • jacob_holdaway        — Vineyard City Councilmember (elected 2023, seated
//                             2024); the lone holdover into the 2026 council.       → CREATE
//   • zack_stratton         — Mayor of Vineyard; won Nov 2025 (~58%), sworn in
//                             Jan 6, 2026 (nonpartisan office).                     → CREATE
//   • skyler_beltran        — Utah County Commission CHAIR (2026); appointed Sept
//                             2024 to fill Tom Sakievich's seat.                    → CREATE
//   • amelia_powers_gardner — Utah County Commissioner (Seat A) & 2026 Vice-Chair;
//                             former Clerk/Auditor. NOT seeking reelection 2026.    → CREATE
//   • brandon_gordon        — Utah County Commissioner. NOT seeking reelection 2026. → CREATE
//   • jeff_gray             — Utah County Attorney (elected 2022); leads the UVU /
//                             Kirk prosecution.                                     → CREATE
//
// For each official this pass builds the same two sourced layers as the model:
//   • Spotlight / Accountability — 3–5 sourced integrity receipts (impact:
//     positive = words match actions / principled stand; negative = inconsistency,
//     controversy, or a contested action; neutral = factual context such as a
//     documented decision, vote, or external event), each carrying a real
//     {label,url} `source` that was HTTP-verified during research, plus a one-line
//     spotlight theme.
//   • Issue positions — `stances` (topic → text) and mirror `stanceCards` grounded
//     in a real vote, budget action, audit finding, or documented public position.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt is primary/local where possible (county/city
//     .gov, Utah State Auditor, KUER, KSL, Salt Lake Tribune, Daily Herald,
//     Lehi Free Press, KUTV, PBS NewsHour, Utah News Dispatch, Grist/SLTrib).
//   • Individual lens, not party. Vote tallies/outcomes are stated as plain facts.
//   • Municipal mayors/council are NONPARTISAN offices and are marked Nonpartisan;
//     county commission and county attorney are partisan offices (Republican,
//     confirmed via the GOP-primary that decides them in this heavily-R county).
//   • Pledge vs. record is labeled: new mayor Stratton's record is mostly early
//     action on a campaign platform; the commissioners' and Fullmer's records are
//     governing actions already taken.
//   • The UVU/Kirk material is written soberly: charges are stated AS charges, the
//     defendant is described as presumed innocent unless proven guilty, and the
//     focus stays on the prosecutor's official conduct — not the crime's details.
//   • Idempotent & non-destructive: re-fetches each live doc and only CREATEs where
//     nothing exists; never clobbers a profile that already exists.
//
//   node scripts/deep-dive-utah-county-batch1-jun2026.mjs            # dry run
//   node scripts/deep-dive-utah-county-batch1-jun2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-utah-county-batch1-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════════ Jared Gray — Mayor, Eagle Mountain (data centers & water) ══════════════
  jared_gray: {
    create: true,
    name: 'Jared Gray',
    office: '🏛 Eagle Mountain (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 52,
    keyIssues: ['Data Centers & Water Use', 'Water, Great Salt Lake & Environment', 'Growth, Housing & Land Use', 'Property Taxes & County Budget'],
    bio: "Jared Gray is the mayor of Eagle Mountain, a fast-growing city in northwest Utah County that has become Utah's busiest data-center hub — home to Meta's campus, a Google site, and the roughly $6 billion QTS campus topped out in April 2026. Gray took office in January 2026 for a four-year term running through 2029; Eagle Mountain's mayor is a nonpartisan office, and he is not on the 2026 ballot. His defining challenge is balancing the data-center revenue the city budget leans on against mounting public concern over how much water and power those facilities draw in a desert.",
    acctSummary: "A new mayor who openly frames data centers as the financial engine of Eagle Mountain — 'It's literally what funds our general fund' — while publicly downplaying their water draw. He was unaware of a 2018 city agreement to keep Meta's monthly water use confidential and to alert the company to records requests, and he praised the $6B QTS campus even as Meta's disclosed footprint (35M+ gallons of water and 1M+ MWh of power in 2024) and a new state reporting law that exempts existing facilities kept water transparency a live issue.",
    theme: "Eagle Mountain's new mayor calls data centers 'literally what funds our general fund,' but was unaware the city had agreed to keep Meta's water use secret — putting him at the center of Utah County's data-center-and-water fight.",
    spotlight: [
      { impact: 'negative', category: 'transparency', date: '2026', tags: ['Public Statements', 'Red Flags'], issueKey: 'gov_transparency',
        headline: "Was unaware the city had agreed to keep Meta's water use confidential",
        facts: "A 2018 agreement committed Eagle Mountain to keep the Meta data-center campus's monthly water use confidential and to alert Meta whenever someone requested those records. Per the reporting, Mayor Gray was not aware of the deal and played down the campus's draw, saying 'It's safe to say it's a lot less than they own' — though state water regulators note Meta buys water through the city rather than owning local water rights.",
        why: "Water is the central public concern around Eagle Mountain's data centers, and the city's chief executive did not know of an arrangement specifically designed to keep that water use out of public view.",
        source: { label: 'Grist / Salt Lake Tribune', url: 'https://grist.org/technology/utah-data-center-water-supply-meta-novva/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_services',
        headline: "Calls data centers 'literally what funds our general fund'",
        facts: "Gray has described data centers like Meta as a core revenue source, saying that even with large tax incentives the city collects property tax and sales tax on the facilities' energy use: 'It's literally what funds our general fund.' The framing is candid about the city's fiscal reliance on an industry it is simultaneously being asked to regulate on water.",
        why: "Establishes, in the mayor's own words, why the city is structurally motivated to welcome data centers — useful context for weighing how it polices their water and power use.",
        source: { label: 'Grist / Salt Lake Tribune', url: 'https://grist.org/technology/utah-data-center-water-supply-meta-novva/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'infrastructure',
        headline: "Praised the $6 billion QTS campus at its April 2026 topping-out",
        facts: "At the QTS data-center campus topping-out (final beam placed April 17, 2026, with about 2,000 construction workers on site), Gray said the 193-acre, roughly $6 billion campus 'represents major investments in Eagle Mountain,' already supporting construction jobs and bringing 'long-term, high-quality benefits.' The project is projected to add about 100 permanent jobs.",
        why: "Documents the mayor's continued, public embrace of data-center expansion even as the water questions around it intensify.",
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/apr/20/eagle-mountain-193-acre-data-center-campus-is-set-to-be-done-this-year-with-big-water-promises/' } },
      { impact: 'negative', category: 'redflags', date: '2025', tags: ['Red Flags'], issueKey: 'water',
        headline: "Eagle Mountain's data-center water and power use is climbing sharply",
        facts: "Meta's environmental disclosures show its Eagle Mountain campus withdrew more than 35 million gallons of water in 2024 — more than double its 2021 figure — and used more than 1 million MWh of electricity, nearly five times its level three years earlier. The city has approved roughly five more data centers, including a ~300-acre Google site, even as residents and scientists question the long-term water draw near the Great Salt Lake basin.",
        why: "The governing reality the mayor presides over and tends to minimize: the footprint of the city's marquee industry is rising fast in a water-stressed region.",
        source: { label: 'Grist / Salt Lake Tribune', url: 'https://grist.org/technology/utah-data-center-water-supply-meta-novva/' } },
    ],
    stances: {
      'Data Centers & Water Use': "Frames data centers as essential to Eagle Mountain's budget — 'literally what funds our general fund' — while downplaying their water draw; was unaware of the city's 2018 deal to keep Meta's water use confidential.",
      'Water, Great Salt Lake & Environment': "Plays down the Meta campus's water use even as disclosures show 35M+ gallons withdrawn in 2024; a new state reporting law (HB 76) exempts the city's existing data center from its requirements.",
      'Growth, Housing & Land Use': "Welcomes continued data-center expansion (QTS, Google, and roughly five more approvals) as investment and jobs in one of Utah County's fastest-growing cities.",
      'Property Taxes & County Budget': "Relies on data-center property tax and energy sales-tax revenue to fund Eagle Mountain's services and general fund.",
    },
    stanceCards: [
      { topic: 'Data Centers & Water', icon: '💧', pos: 'mixed', issueKey: 'water', issueStance: 'mixed', text: "Calls data centers 'literally what funds our general fund' but was unaware Eagle Mountain agreed to keep Meta's water use secret and to tip the company to records requests.", source: { label: 'Grist / Salt Lake Tribune', url: 'https://grist.org/technology/utah-data-center-water-supply-meta-novva/' } },
      { topic: 'Data-Center Revenue', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Frames data-center property and energy sales-tax revenue as the core of the city budget, even with the large tax incentives the projects receive.", source: { label: 'Grist / Salt Lake Tribune', url: 'https://grist.org/technology/utah-data-center-water-supply-meta-novva/' } },
      { topic: 'QTS Campus', icon: '🏗', pos: 'support', issueKey: 'infrastructure', issueStance: 'support', text: "Praised the 193-acre, ~$6B QTS campus at its April 2026 topping-out as 'major investments in Eagle Mountain' supporting jobs and long-term benefits.", source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/apr/20/eagle-mountain-193-acre-data-center-campus-is-set-to-be-done-this-year-with-big-water-promises/' } },
      { topic: 'Water Transparency', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "A new state law (HB 76, 2026) requires new data centers to report water use but exempts Eagle Mountain's existing Meta campus, leaving the original transparency concern unaddressed.", source: { label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/business-economy/water-reporting-data-centers/2287583/' } },
    ],
  },

  // ══════════════ Julie Fullmer — former Mayor, Vineyard (growth & spending) ══════════════
  julie_fullmer: {
    create: true,
    name: 'Julie Fullmer',
    office: '🏛 Vineyard (former Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'not_seeking',
    score: 43,
    keyIssues: ['Growth, Housing & Land Use', 'Local Government Transparency & Accountability', 'Property Taxes & County Budget'],
    bio: "Julie Fullmer served on the Vineyard City Council from 2013 and as mayor of Vineyard from about 2018 until early January 2026, presiding over the explosive growth of the former Geneva Steel town — from a few hundred residents to well over 14,000 — and the launch of the roughly 700-acre 'Utah City' mega-development. A booster of that growth, she declined to seek reelection in 2025 amid sustained backlash over city spending, transparency, and her relationship with developers. Vineyard's mayor is a nonpartisan office.",
    acctSummary: "An eight-year mayor whose pro-growth tenure ended under a cloud of accountability findings. A Utah State Auditor review found Vineyard failed to report more than $35 million in transactions over four years; a later independent audit flagged purchase-card misuse and missing spending policies; residents petitioned over her international trade-mission travel; and about 74% of voters approved a measure (Prop 10) stripping power from the mayor's office. She defended the city's record, saying reviewers found 'no evidence of misuse or mismanagement of public funds.'",
    theme: "The eight-year Vineyard mayor who championed the Utah City boom left office under State Auditor findings of $35M+ in unreported transactions, an audit flagging purchase-card misuse, and a 74% vote to curb her own office.",
    spotlight: [
      { impact: 'negative', category: 'transparency', date: '2025', tags: ['Red Flags', 'Notable Actions'], issueKey: 'gov_transparency',
        headline: "State Auditor: Vineyard failed to report more than $35M in transactions",
        facts: "A review by the Utah State Auditor found Vineyard failed to report transactions totaling more than $35 million over four years, with discrepancies between the state's Transparent Utah portal and the city's general ledger. The redevelopment-agency review covered January 2018 to March 2025 — almost the entirety of Fullmer's mayoralty.",
        why: "The central, official finding behind the loss of public trust: tens of millions in city money moving without the disclosure state law requires, on her watch.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51333098/vineyard-failed-to-report-substantial-transactions-state-auditor-finds' } },
      { impact: 'negative', category: 'transparency', date: '2024', tags: ['Public Behavior', 'Red Flags'], issueKey: 'gov_transparency',
        headline: "Residents turned on the mayor over secrecy and trade-mission spending",
        facts: "By December 2024, residents were circulating petitions tied to Fullmer's leadership, citing spending on trade-mission memberships and international trips and a multi-year World Trade Center Utah membership entered without full council or public disclosure. Reporting characterized her as secretive and overly deferential to developers building out Utah City.",
        why: "Documents the grassroots accountability pressure — focused on disclosure and developer ties — that built through her final years in office.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2024/12/13/growing-utah-city-residents-are/' } },
      { impact: 'negative', category: 'transparency', date: '2025', tags: ['Red Flags'], issueKey: 'gov_transparency',
        headline: "Independent audit flagged purchase-card misuse",
        facts: "A December 2025 independent audit of fiscal years 2023–2024 found improper purchase-card use, including shared cards, transactions split to bypass spending limits, and missing receipts, along with missing travel and spending policies. A sitting councilman called the findings 'damning.'",
        why: "An outside review corroborating the State Auditor's concerns with specific internal-control failures during her administration.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/12/23/vineyard-audit-finds-gaps-citys/' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Voters approved Prop 10, curbing the mayor's power",
        facts: "About 74% of Vineyard voters approved Proposition 10, expanding the city council from four members to five and limiting the mayor's voting role to ties and critical matters, effective 2026 — a structural rebuke delivered during Fullmer's final year in office.",
        why: "A direct verdict from voters: rather than just replacing her, they reduced the powers of the office she held.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51185478/vineyard-residents-vote-to-expand-city-council' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'housing_build',
        headline: "Presided over the Utah City build-out on the Geneva Steel site",
        facts: "Fullmer championed Vineyard's transformation from a farm town of a few hundred into a city of more than 14,000 anchored by the roughly 700-acre 'Utah City' urban-core development on the former Geneva Steel land. She defended her transparency record throughout, saying reviewers found 'no evidence of misuse or mismanagement of public funds.'",
        why: "The growth legacy she ran on — and her own framing of the financial controversy — set side by side so voters can weigh both.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2024/12/13/growing-utah-city-residents-are/' } },
    ],
    stances: {
      'Growth, Housing & Land Use': "Championed Vineyard's rapid growth and the ~700-acre Utah City mega-development on the former Geneva Steel site; critics characterized her as overly deferential to developers.",
      'Local Government Transparency & Accountability': "Defended the city's transparency even as a State Auditor review found $35M+ in unreported transactions and an independent audit flagged purchase-card misuse; voters curbed the mayor's power via Prop 10.",
      'Property Taxes & County Budget': "Oversaw city and redevelopment-agency spending later found to be poorly reported and weakly controlled.",
    },
    stanceCards: [
      { topic: 'City Spending & Transparency', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Defended the city's transparency, but a State Auditor review found Vineyard failed to report $35M+ over four years and an independent audit flagged purchase-card misuse.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51333098/vineyard-failed-to-report-substantial-transactions-state-auditor-finds' } },
      { topic: 'Utah City & Growth', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Championed Vineyard's transformation from a few hundred residents to 14,000+ and the ~700-acre Utah City development on the former Geneva Steel site.", source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2024/12/13/growing-utah-city-residents-are/' } },
      { topic: 'Trade-Mission Spending', icon: '✈️', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Backed World Trade Center Utah membership and international trade-mission travel that residents petitioned against as undisclosed.", source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2024/12/13/growing-utah-city-residents-are/' } },
      { topic: 'Voter Rebuke (Prop 10)', icon: '🗳', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "~74% of voters approved Prop 10 curbing the mayor's power and expanding the council during her final year in office.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51185478/vineyard-residents-vote-to-expand-city-council' } },
    ],
  },

  // ══════════════ Jacob Holdaway — Vineyard City Council (transparency hawk) ══════════════
  jacob_holdaway: {
    create: true,
    name: 'Jacob Holdaway',
    office: '🏛 Vineyard City Council',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 67,
    keyIssues: ['Local Government Transparency & Accountability', 'Growth, Housing & Land Use', 'Property Taxes & County Budget'],
    bio: "Jacob Holdaway is a Vineyard City Councilmember, elected in 2023 and seated in 2024, who became the city's leading voice for financial transparency during the Utah City growth boom. He pressed publicly for disclosure of city spending, helped trigger a Utah State Auditor review that found tens of millions of dollars in unreported transactions, and backed the reform slate that won the 2025 city elections. He is the sole councilmember carried over into the new council. The seat is nonpartisan.",
    acctSummary: "A first-term councilman who made oversight his signature: he publicly pressed for the city's general ledger and questioned trade-mission spending, drove the State Auditor review that exposed $35M+ in unreported Vineyard transactions, and called a later independent audit's findings 'damning.' His record is one of words matching actions on transparency — though as a single member he could not by himself change city practice.",
    theme: "The Vineyard councilman who forced the city's books into the open — pressing for records, triggering the State Auditor review that found $35M+ unreported, and helping power the 2025 reform wave.",
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2024', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_transparency',
        headline: "Pressed for city financial records and questioned trade-mission spending",
        facts: "After being seated in 2024, Holdaway said he struggled to obtain basic financial documents, including the general ledger, and publicly questioned costly World Trade Center Utah memberships and roughly $15,000 in European trade-mission travel for two city employees.",
        why: "An elected official using his seat to force disclosure — the early, concrete action that opened up the city's finances.",
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/mar/27/vineyard-city-councilman-raises-questions-on-city-spending-financial-transparency/' } },
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Drove the State Auditor review that exposed $35M+ in unreported transactions",
        facts: "Holdaway was the main proponent behind the Utah State Auditor review that found Vineyard failed to report more than $35 million in transactions over four years. The State Auditor described it as the office's most-requested audit in the state.",
        why: "Words matched actions: his push produced an official, statewide-notable finding rather than just rhetoric.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51333098/vineyard-failed-to-report-substantial-transactions-state-auditor-finds' } },
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Called the independent audit's findings 'damning'",
        facts: "When a December 2025 independent audit found purchase-card misuse, split transactions, and missing receipts, Holdaway characterized the results as 'damning,' continuing to press for accountability over Utah City-era spending as the new council took shape.",
        why: "Sustained follow-through on the same issue across years, not a one-off.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/12/23/vineyard-audit-finds-gaps-citys/' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Backed the reform slate that won the 2025 city elections",
        facts: "Holdaway supported the reform candidates who swept Vineyard's 2025 races, including new mayor Zack Stratton. He is the sole councilmember continuing from the prior council into the 2026 council that is implementing new financial controls.",
        why: "Context on how the accountability push translated into a change of city leadership.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
    ],
    stances: {
      'Local Government Transparency & Accountability': "Made financial transparency his signature issue — pressing for the city ledger, triggering the State Auditor review that found $35M+ unreported, and calling the later independent audit 'damning.'",
      'Growth, Housing & Land Use': "Focused his oversight on developer-related (redevelopment-agency) spending tied to the Utah City build-out.",
      'Property Taxes & County Budget': "Pushed for tighter financial controls and public disclosure of city and RDA spending.",
    },
    stanceCards: [
      { topic: 'Financial Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Pressed for Vineyard's general ledger and questioned trade-mission spending, then drove the State Auditor review that found $35M+ in unreported transactions.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51333098/vineyard-failed-to-report-substantial-transactions-state-auditor-finds' } },
      { topic: 'Spending Accountability', icon: '💵', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Called a December 2025 independent audit's findings of purchase-card misuse 'damning' and kept pressing on Utah City-era spending.", source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/12/23/vineyard-audit-finds-gaps-citys/' } },
      { topic: 'Reform Wave', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Backed the reform slate that swept Vineyard's 2025 elections; the sole councilmember carried over into the new council.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
    ],
  },

  // ══════════════ Zack Stratton — Mayor, Vineyard (reform mandate) ══════════════
  zack_stratton: {
    create: true,
    name: 'Zack Stratton',
    office: '🏛 Vineyard (Mayor)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 61,
    keyIssues: ['Local Government Transparency & Accountability', 'Growth, Housing & Land Use', 'Property Taxes & County Budget'],
    bio: "Zack Stratton is the mayor of Vineyard, sworn in January 6, 2026 after winning the November 2025 election with about 58% of the vote against a sitting councilwoman. An entrepreneur backed by the city's transparency-focused reformers, he ran on cleaning up Vineyard's finances and reforming oversight of the Redevelopment Agency that steers the Utah City development. The mayor's office is nonpartisan.",
    acctSummary: "A reform-slate mayor elected to clean up after the spending controversies of the prior administration. He took office naming Redevelopment Agency reform his top priority and, alongside the new council, moved to engage independent auditors and form an audit committee — early follow-through on the platform he ran on, though his governing record is just beginning.",
    theme: "Vineyard's new reform mayor won on cleaning up city finances and took office naming Redevelopment Agency reform his top priority — early action on the oversight failures that sank his predecessor's standing.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Won the open Vineyard mayor's race on a reform platform",
        facts: "Stratton won the November 2025 mayoral election with about 58% to a sitting councilwoman's roughly 41%; results were certified November 18, 2025. He ran as the accountability candidate after the prior administration's spending controversies and the State Auditor's findings.",
        why: "Establishes the mandate: voters chose the reform message in a race defined by the city's finances.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51400386/political-shake-up-check-out-the-results-for-these-utah-county-mayoral-races' } },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_transparency',
        headline: "Named Redevelopment Agency reform his top priority on taking office",
        facts: "Sworn in January 6, 2026, Stratton and the new council took office amid implementation of new financial controls, naming reform of the Redevelopment Agency — which steers the Utah City development — as the top priority and moving to engage independent auditors and an audit committee.",
        why: "Early evidence of a campaign promise being acted on rather than shelved.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Inherits oversight of the Utah City mega-development",
        facts: "Stratton leads a city still building out the roughly 700-acre Utah City project on the former Geneva Steel site — the growth engine and the focus of the spending scrutiny that defined the 2025 election. His record on how that oversight plays out is only beginning.",
        why: "Sets expectations honestly: the hard part — governing the developer relationship he criticized — is still ahead.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
    ],
    stances: {
      'Local Government Transparency & Accountability': "Ran and took office on cleaning up city finances, naming Redevelopment Agency reform his top priority and moving to engage independent auditors and an audit committee.",
      'Growth, Housing & Land Use': "Inherits the Utah City build-out and the developer-oversight questions tied to it.",
      'Property Taxes & County Budget': "Campaigned on financial controls and accountability after the prior administration's reporting failures.",
    },
    stanceCards: [
      { topic: 'Redevelopment Agency Reform', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Took office Jan 2026 naming Redevelopment Agency reform his top priority and moving to engage independent auditors and an audit committee.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
      { topic: 'Reform Mandate', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Won the open mayor's race (~58%) as the accountability candidate after the prior administration's spending controversies.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51400386/political-shake-up-check-out-the-results-for-these-utah-county-mayoral-races' } },
      { topic: 'Utah City Oversight', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Inherits oversight of the ~700-acre Utah City development on the former Geneva Steel site, the focus of the 2025 election — a record still to be written.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51431074/vineyard-implementing-financial-change-while-welcoming-new-city-council' } },
    ],
  },

  // ══════════════ Skyler Beltran — Utah County Commission Chair (property tax) ══════════════
  skyler_beltran: {
    create: true,
    name: 'Skyler Beltran',
    office: '🏛 Utah County Commission (Chair)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 55,
    keyIssues: ['Property Taxes & County Budget', 'Public Safety', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Skyler Beltran, of Lehi, is chair of the three-member Utah County Commission for 2026. He was appointed in September 2024 to fill the seat vacated by Tom Sakievich's resignation and was elected chair by his colleagues in January 2026. He governs a fast-growing county wrestling with a large 2025 property-tax increase, west-side representation concerns, and rising public-safety costs. Utah County commission seats are partisan; the Republican primary effectively decides them in this heavily Republican county.",
    acctSummary: "A commissioner who joined just before the county's most contentious budget and abstained on the December 2024 vote for a roughly 48% county property-tax increase, citing too little time to review it — while still calling a tax increase 'absolutely necessary this year.' Now commission chair, he sits at the center of the budget, growth, and west-side-representation debates driving the 2026 county races.",
    theme: "The Lehi commissioner who abstained on Utah County's ~48% property-tax hike — saying he couldn't do a 'deep dive' yet calling an increase 'absolutely necessary' — now chairs the commission as those budget fights define the 2026 races.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_tax',
        headline: "Abstained on the ~48% county property-tax increase",
        facts: "On the December 2024 vote for the 2025 budget, which raised the county's property-tax portion by about 48%, Beltran abstained, explaining he had joined the commission only in September 2024 and could not do a full budget 'deep dive' — though he said a tax increase was 'absolutely necessary this year,' citing public safety and the Children's Justice Center.",
        why: "His central recorded action on the county's most consequential vote: present, but neither a yes nor a no, with a stated rationale voters can weigh.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Elected chair of the Utah County Commission for 2026",
        facts: "Beltran's colleagues elected the Lehi commissioner chair of the Utah County Commission for 2026, with Amelia Powers Gardner as vice-chair. As the senior member heading into 2027, he will preside over the budgets that follow the 2025 increase.",
        why: "Establishes his current authority and responsibility over the county's finances going forward.",
        source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/22/lehis-skyler-beltran-elected-chair-of-utah-county-commission-for-2026/' } },
      { impact: 'neutral', category: 'transparency', date: '2024', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Joined the commission mid-term, just before its biggest budget fight",
        facts: "Beltran was appointed in September 2024 to replace Tom Sakievich, who resigned, and inherited the contentious 2025 budget debate within weeks — the basis he cited for abstaining on the tax vote rather than voting on a budget he said he hadn't had time to fully examine.",
        why: "Context for the abstention, and for why the seats up in 2026 (not his) became the venue for the tax-vote reckoning.",
        source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/22/lehis-skyler-beltran-elected-chair-of-utah-county-commission-for-2026/' } },
    ],
    stances: {
      'Property Taxes & County Budget': "Abstained on the December 2024 vote for a ~48% county property-tax increase, citing too little time to review the budget, while saying an increase was 'absolutely necessary' for public safety.",
      'Public Safety': "Frames the bulk of the county budget — and the 2025 tax increase — as driven by public-safety and Children's Justice Center costs.",
      'Growth, Housing & Land Use': "Represents and lives in fast-growing Lehi and chairs a commission facing west-side growth and representation pressures.",
      'Local Government Transparency & Accountability': "Cited needing more time for a budget 'deep dive' as his reason to abstain rather than vote on the tax increase.",
    },
    stanceCards: [
      { topic: 'County Property-Tax Hike', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Abstained on the Dec 2024 vote for the ~48% county tax increase, saying he couldn't do a budget 'deep dive,' but called an increase 'absolutely necessary this year.'", source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { topic: 'Commission Chair', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: "Elected by colleagues as chair of the Utah County Commission for 2026 after joining the board in September 2024.", source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/22/lehis-skyler-beltran-elected-chair-of-utah-county-commission-for-2026/' } },
      { topic: 'Public Safety Budget', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Ties the county budget and the 2025 tax increase to public-safety and Children's Justice Center costs.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
    ],
  },

  // ══════════════ Amelia Powers Gardner — Utah County Commissioner (property tax) ══════════════
  amelia_powers_gardner: {
    create: true,
    name: 'Amelia Powers Gardner',
    office: '🏛 Utah County Commission (Seat A)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'not_seeking',
    score: 54,
    keyIssues: ['Property Taxes & County Budget', 'Public Safety', 'Local Government Transparency & Accountability', 'Growth, Housing & Land Use'],
    bio: "Amelia Powers Gardner is a Utah County Commissioner (Seat A) and the commission's vice-chair for 2026, and previously served as Utah County Clerk/Auditor. She voted for the December 2024 budget that raised the county's property-tax portion by about 48% — the county's first increase since 2020 — defending it as unavoidable and public-safety-driven. In January 2026 she announced she would not seek reelection, leaving her seat open in the 2026 races.",
    acctSummary: "A former county clerk/auditor turned commissioner who cast a yes vote for the roughly 48% county property-tax increase and defended it head-on — 'I would not vote for this budget if it wasn't absolutely necessary,' saying over 80% of it funds public safety. She drew sharp resident backlash at the Truth-in-Taxation hearing and is now leaving office rather than facing voters on the record in 2026.",
    theme: "The Utah County commissioner who voted for a ~48% property-tax hike and defended it as 'absolutely necessary' for public safety — then announced she would not seek reelection, leaving the vote to define an open 2026 seat.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Voted for the ~48% county property-tax increase",
        facts: "Powers Gardner voted yes on the December 18, 2024 budget that raised the county's property-tax portion by about 48% (the assessing-and-collecting portion rose 10%) — the county's first increase since 2020. On an average $532,000 home, the county's share rose from $190.78 to $282.33.",
        why: "The signature governing decision of her term, and a recorded yes vote she owns directly.",
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/dec/19/utah-county-commission-approves-2025-budget-that-includes-property-tax-hike/' } },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Public Statements'], issueKey: 'back_police',
        headline: "Defended the hike as 'absolutely necessary' and public-safety-driven",
        facts: "She said, 'I would not vote for this budget if it wasn't absolutely necessary,' and that over 80% of the increase goes directly to public safety, calling prosecuting crime 'necessary.' She tied the need to years of cost growth without a corresponding revenue increase.",
        why: "Her own justification for the vote, stated plainly — the case she asks voters to judge her on.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { impact: 'negative', category: 'redflags', date: '2024', tags: ['Public Behavior', 'Red Flags'], issueKey: 'gov_transparency',
        headline: "Faced sharp resident backlash at the Truth-in-Taxation hearing",
        facts: "At the August 15, 2024 Truth-in-Taxation hearing, more than 40 residents spoke against the proposed increase, several criticizing rising commissioner pay (around $140,000 in 2023, against a county median household income near $95,000) while the county ran a deficit.",
        why: "Documents the public's objection — and the specific accountability flashpoint of commissioner compensation — around the vote she supported.",
        source: { label: 'KUER', url: 'https://www.kuer.org/business-economy/2024-08-16/skeptical-residents-give-utah-county-an-earful-over-proposed-property-tax-hike' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_services',
        headline: "Announced she will not seek reelection in 2026",
        facts: "In January 2026, Powers Gardner said, 'After careful consideration, I have decided not to run for reelection at the end of my term,' leaving Seat A open in a crowded field; she was named commission vice-chair for 2026.",
        why: "A factual accountability note: the commissioner who cast and defended the tax vote will not stand before voters on it.",
        source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/01/utah-county-commissioner-amelia-powers-gardner-announces-she-will-not-seek-reelection/' } },
    ],
    stances: {
      'Property Taxes & County Budget': "Voted for the ~48% county property-tax increase and defended it as 'absolutely necessary,' saying over 80% funds public safety.",
      'Public Safety': "Frames public safety and crime prosecution as the non-negotiable core of the county budget.",
      'Local Government Transparency & Accountability': "As a former clerk/auditor casts herself as a budgeting reformer; faced backlash over commissioner pay amid the tax vote.",
      'Growth, Housing & Land Use': "Governs a fast-growing county where budget pressures track rapid population growth.",
    },
    stanceCards: [
      { topic: 'County Property-Tax Hike', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Voted yes on the ~48% county property-tax increase (Dec 2024), saying 'I would not vote for this budget if it wasn't absolutely necessary' and that 80%+ funds public safety.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { topic: 'Public Safety Funding', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Defends crime prosecution and public safety as the core of county spending and the main driver of the 2025 increase.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { topic: 'Not Seeking Reelection', icon: '🗳', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Announced in Jan 2026 she will not seek reelection, leaving Seat A open as the tax vote defines the race; serves as 2026 vice-chair.", source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/01/utah-county-commissioner-amelia-powers-gardner-announces-she-will-not-seek-reelection/' } },
      { topic: 'Budget Backlash', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Drew 40+ residents speaking against the hike at the Truth-in-Taxation hearing, some citing commissioner pay near $140K amid a deficit.", source: { label: 'KUER', url: 'https://www.kuer.org/business-economy/2024-08-16/skeptical-residents-give-utah-county-an-earful-over-proposed-property-tax-hike' } },
    ],
  },

  // ══════════════ Brandon Gordon — Utah County Commissioner (property tax) ══════════════
  brandon_gordon: {
    create: true,
    name: 'Brandon Gordon',
    office: '🏛 Utah County Commission (Seat B)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'not_seeking',
    score: 53,
    keyIssues: ['Property Taxes & County Budget', 'Public Safety', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Brandon Gordon is a Utah County Commissioner who voted for the December 2024 budget that raised the county's property-tax portion by about 48%, the county's first increase since 2020. He is not seeking reelection in 2026, leaving his seat (Seat B) open in a crowded Republican-primary field centered on taxes and growth.",
    acctSummary: "A commissioner who joined Amelia Powers Gardner in voting yes on the roughly 48% county property-tax increase, defending it as a public-safety necessity after years without an increase. Like his colleague, he is leaving office rather than standing on the vote in 2026, making the tax increase the central issue of the open race to replace him.",
    theme: "One of the two Utah County commissioners who voted for the ~48% property-tax hike — and, like his colleague, is leaving office in 2026 rather than facing voters on it.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Voted for the ~48% county property-tax increase",
        facts: "Gordon voted yes, with Amelia Powers Gardner, on the December 18, 2024 budget that raised the county's property-tax portion by about 48% — the county's first increase since 2020 — adding roughly $25 million in revenue. Skyler Beltran abstained.",
        why: "A recorded yes vote on the county's most consequential and contested fiscal decision in years.",
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/dec/19/utah-county-commission-approves-2025-budget-that-includes-property-tax-hike/' } },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Public Statements'], issueKey: 'back_police',
        headline: "Backed a budget the commission framed as overwhelmingly public-safety spending",
        facts: "Gordon joined the commission majority that defended the increase as a public-safety necessity, with the commission characterizing more than 80% of the new revenue as going to public safety after years of cost growth without an increase.",
        why: "The shared justification he signed onto, kept distinct from the specific quotes attributable to his colleague.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: "Is not seeking reelection in 2026",
        facts: "Gordon is not seeking reelection; his Seat B drew a crowded Republican-primary field — including a former Provo deputy mayor and a former Eagle Mountain mayor — with taxes, growth, and transportation as the central issues.",
        why: "Like his colleague, he leaves the tax vote to be litigated in an open race rather than defending it on the ballot himself.",
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/jan/14/whos-running-for-utah-county-commissions-two-open-seats-in-2026/' } },
    ],
    stances: {
      'Property Taxes & County Budget': "Voted for the ~48% county property-tax increase, the county's first since 2020, as part of the commission majority.",
      'Public Safety': "Backed a budget the commission framed as overwhelmingly public-safety spending.",
      'Growth, Housing & Land Use': "Governs a fast-growing county facing mounting infrastructure and service pressures.",
      'Local Government Transparency & Accountability': "Leaves office in 2026 rather than seeking reelection on the tax record.",
    },
    stanceCards: [
      { topic: 'County Property-Tax Hike', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Voted yes (with Powers Gardner) on the ~48% county property-tax increase in Dec 2024, the county's first since 2020; Beltran abstained.", source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/dec/19/utah-county-commission-approves-2025-budget-that-includes-property-tax-hike/' } },
      { topic: 'Public Safety Budget', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Backed a budget the commission framed as more than 80% public-safety spending.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget' } },
      { topic: 'Not Seeking Reelection', icon: '🗳', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Is not seeking reelection in 2026; Seat B drew a crowded GOP-primary field centered on taxes and growth.", source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/jan/14/whos-running-for-utah-county-commissions-two-open-seats-in-2026/' } },
    ],
  },

  // ══════════════ Jeff Gray — Utah County Attorney (public safety / UVU prosecution) ══════════════
  jeff_gray: {
    create: true,
    name: 'Jeff Gray',
    office: '⚖️ Utah County Attorney',
    party: 'Republican', state: 'Utah', icon: '⚖️',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Public Safety', 'Local Government Transparency & Accountability', 'Growth, Housing & Land Use'],
    bio: "Jeff Gray is the Utah County Attorney, elected in 2022 after defeating incumbent David Leavitt in the Republican primary. His office leads major criminal prosecutions in the county, most prominently the capital case against Tyler Robinson, the man charged in the September 10, 2025 fatal shooting of Charlie Kirk at Utah Valley University in Orem.",
    acctSummary: "The county's chief prosecutor, whose tenure is now defined by the highest-profile case in the county's history — the prosecution of the man charged in the 2025 shooting of Charlie Kirk at UVU. He filed aggravated-murder and related charges with enhancements and signaled the death penalty was under consideration; the case is proceeding through the courts, with the defendant presumed innocent unless proven guilty. The killing also triggered a still-pending independent review of UVU's event-security failures.",
    theme: "Utah County's chief prosecutor is leading the capital case against the man charged in the 2025 UVU shooting of Charlie Kirk — the highest-profile prosecution in the county's history.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'justice_balance',
        headline: "Charged the suspect in the UVU shooting of Charlie Kirk",
        facts: "Gray's office charged Tyler Robinson, 22, with aggravated murder, felony discharge of a firearm, and obstruction of justice in the September 10, 2025 fatal shooting of Charlie Kirk during a Turning Point USA event at Utah Valley University in Orem, adding enhancements including for committing the offense near a child and for targeting the victim's beliefs. The defendant is presumed innocent unless proven guilty.",
        why: "The defining prosecutorial action of his tenure, drawing national attention to how the county's chief prosecutor handles a case of this magnitude.",
        source: { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics/watch-utah-officials-announce-charges-including-murder-against-alleged-charlie-kirk-shooter' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'justice_balance',
        headline: "Signaled the death penalty was under consideration",
        facts: "In announcing the charges, Gray indicated his office could seek the death penalty in the case. A multi-day preliminary hearing was later set to begin in mid-May 2026, advancing the prosecution toward trial.",
        why: "A consequential prosecutorial judgment — pursuing a potential capital case — that will be scrutinized regardless of the eventual verdict.",
        source: { label: 'CNN', url: 'https://www.cnn.com/2025/12/11/us/tyler-robinson-hearing-charlie-kirk-shooting' } },
      { impact: 'neutral', category: 'redflags', date: '2025', tags: ['Red Flags'], issueKey: 'back_police',
        headline: "The killing prompted an independent review of UVU security gaps",
        facts: "The assassination spurred a third-party review of UVU's event security, with reporting noting the event lacked rooftop monitoring, drones, and screening, and that the campus had only about six officers on duty. The Utah County Sheriff's Office and Orem Police said they were not involved in the event's security. The review was expected to run into 2026.",
        why: "Context on the broader public-safety accountability questions the shooting raised across county and campus agencies, beyond the prosecution itself.",
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/12/01/review-of-charlie-kirk-shooting-uvu-campus-security-expected-to-start-in-2026/' } },
      { impact: 'neutral', category: 'voting', date: '2022', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Won office in a contested 2022 primary against the incumbent",
        facts: "Gray became County Attorney by defeating incumbent David Leavitt in the 2022 Republican primary, a race that unfolded amid a public feud between Leavitt and Utah County Sheriff Mike Smith; Smith had endorsed Gray. He has since led the office's major prosecutions.",
        why: "Establishes how he came to the office and the political context of the county's law-enforcement leadership.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2022/06/01/utah-county-attorney/' } },
    ],
    stances: {
      'Public Safety': "Leads the county's major prosecutions, most prominently the capital case in the 2025 UVU shooting of Charlie Kirk.",
      'Local Government Transparency & Accountability': "Won office in a contested 2022 primary; his handling of the county's highest-profile case is under intense public scrutiny.",
      'Growth, Housing & Land Use': "Oversees prosecution and justice resources in one of the nation's fastest-growing counties, where caseloads track population growth.",
    },
    stanceCards: [
      { topic: 'UVU / Kirk Prosecution', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: "Charged Tyler Robinson with aggravated murder and related counts in the Sept 2025 UVU shooting of Charlie Kirk, with enhancements, and signaled a possible death-penalty case. Defendant presumed innocent.", source: { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics/watch-utah-officials-announce-charges-including-murder-against-alleged-charlie-kirk-shooter' } },
      { topic: 'Public-Safety Review', icon: '🛡', pos: 'mixed', issueKey: 'back_police', issueStance: 'mixed', text: "The killing prompted an independent review of UVU security gaps (no rooftop monitoring, drones, or screening; ~6 campus officers); the Sheriff's Office and Orem PD said they weren't involved in event security.", source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/12/01/review-of-charlie-kirk-shooting-uvu-campus-security-expected-to-start-in-2026/' } },
      { topic: 'Election & Office', icon: '🗳', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Won the County Attorney's office by defeating incumbent David Leavitt in the 2022 GOP primary, amid a Leavitt–Sheriff feud.", source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2022/06/01/utah-county-attorney/' } },
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

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Utah County sitting officials · Batch 1 (June 2026) ───────────────────────');
  out.push('    // Deliberately scoped Utah County pass: the SITTING officials tied to the county\'s');
  out.push('    // highest-attention current fights — Eagle Mountain\'s data-center/water buildout');
  out.push('    // (Mayor Jared Gray), Vineyard\'s Utah City growth + spending scandal (Fullmer,');
  out.push('    // Holdaway, Stratton), the Utah County Commission\'s ~48% property-tax increase');
  out.push('    // (Beltran, Powers Gardner, Gordon), and the County Attorney\'s UVU/Kirk prosecution');
  out.push('    // (Jeff Gray). Complements the existing Utah County 2026-candidate stance data.');
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
  console.log(`PolitiDex — Utah County deep dive (batch 1: sitting officials in active controversies)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
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
    const f = '/tmp/utah-county-batch1-stance-block.txt';
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
