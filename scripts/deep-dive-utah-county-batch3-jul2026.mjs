#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah County deep dive, BATCH 3 (July 2026)
//
// A DELIBERATELY SCOPED continuation of the Utah County accountability pass
// (see deep-dive-utah-county-batch1-jun2026.mjs, batch2, and
// scripts/UTAH-COUNTY-CONTROVERSY-TRACKER.md). The unit is the FIGHT, not the
// politician. Batch 3 executes the remaining carried-over recommendations from
// Batches 1–2, staying on controversies rather than doing a broad sweep:
//
//   • UTAH LAKE "ISLANDS" REPEAL ARC (ENRICH mike_mckell) — the tracker's
//     standing recommendation was to ENRICH, not duplicate, McKell with the
//     Utah Lake / Lake Restoration Solutions story. He authored the 2018 law
//     (HB272) that created the legal framework for the dredge-and-build-islands
//     plan, and — after that plan collapsed under legal and public pushback —
//     sponsored the 2024 repeal (SB242) for a "clean canvas." A full, owned arc.
//   • 2026 COMMISSION CANDIDATES → TAX-HIKE FIGHT (ENRICH david_spencer_utco) —
//     Seat B GOP nominee David Spencer is the one 2026 commission candidate who,
//     on the record, ties himself directly to the Batch 1 controversy: the
//     county's 2019 (~67%) and 2024 (~48%) property-tax increases and the rise
//     in commissioner pay. This enrichment makes that linkage explicit.
//   • ALPINE SPLIT SUCCESSOR BOARDS (CREATE julie_king, jennifer_lyman) — the
//     two new-district board PRESIDENTS with clear, quoted, sourced positions on
//     the split's live fiscal aftermath. King (Lake Mountain) advocates a
//     specific school-funding fix (schools can't charge impact fees) for the
//     fastest-growing successor district that inherits the $238M bond; Lyman
//     (Timpanogos) leads the successor district staring at a documented ~$20M
//     projected deficit / ~17% potential tax increase.
//
// COMPLEMENTARY, non-duplicative:
//   • mike_mckell and david_spencer_utco ALREADY EXIST → ENRICH (append
//     spotlight receipts + merge stance keys; never clobber existing fields).
//   • julie_king and jennifer_lyman were audited against index.html and do NOT
//     exist → CREATE.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • Michelle Kaufusi (Seat A GOP nominee) already exists, but her fiscal
//     messaging is a GENERAL Provo-mayor record ("look at my record"), NOT a
//     position on the county commission's specific ~48% hike. Sourcing does not
//     support attributing an anti-48%-hike stance to her, so she is NOT enriched
//     with one.
//   • The November 2026 general-election field includes Democratic and
//     third-party candidates (Seat A: Jeanne Marie Bowen (D), Jacob D. Oaks
//     (IAP); Seat B: J. Allen (D), David Hinkley (Forward)). None has any
//     publicly sourced position on taxes/growth yet → named in the tracker, not
//     built. No positions invented.
//   • The other ~18 new-district board members and the three superintendent
//     hires are procedural/unanimous with only ceremonial quotes → not built.
//   • Asset/debt/$238M-bond division among the three districts was ratified
//     UNANIMOUSLY (June 26, 2026) and every named official calls it cooperative
//     — there is no active dispute to build a record around.
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • mike_mckell         — Utah Senate (R-Spanish Fork); chief House sponsor of
//                           HB272 (2018) and chief Senate sponsor of the SB242
//                           (2024) repeal.                                       → ENRICH
//   • david_spencer_utco  — Utah County Commission Seat B; 2026 GOP nominee;
//                           former Orem councilman.                              → ENRICH
//   • julie_king          — Lake Mountain School District Board PRESIDENT (new
//                           successor district; sworn in Nov 2025). Nonpartisan.  → CREATE
//   • jennifer_lyman      — Timpanogos School District Board PRESIDENT (new
//                           successor district; sworn in Nov 2025). Nonpartisan.  → CREATE
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source that was
//     HTTP-verified during research (le.utah.gov bill pages, Daily Herald,
//     Salt Lake Tribune, Deseret News, KUER, Fox13, Lehi Free Press).
//   • Individual lens, not party. Vote tallies/outcomes are stated as plain
//     facts (Senate 22-0; House 66-2). School-board seats are NONPARTISAN.
//   • Attribution discipline: the ~17% Timpanogos tax figure is stated as a
//     DISTRICT projection (per the district's own video), not as a Lyman quote;
//     Lyman's own words are her framing ("a lot of lemons ... delicious
//     lemonade"). LRS's $3M defamation suit is attributed to LRS, not to McKell.
//   • Pledge vs. record labeled: Lyman's record is honestly an EMERGING posture
//     (no tax vote has been cast) — mirroring how Batch 2 labeled Carn's
//     "proposal in process."
//   • Idempotent & non-destructive: re-fetches each live doc. CREATE only where
//     nothing exists; ENRICH appends receipts + merges stance keys without
//     clobbering existing fields.
//
//   node scripts/deep-dive-utah-county-batch3-jul2026.mjs            # dry run
//   node scripts/deep-dive-utah-county-batch3-jul2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-utah-county-batch3-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-01T00:00:00.000Z';

// Shared sources (HTTP-verified during research).
const SRC = {
  // Utah Lake "islands" arc
  leg_hb272:    { label: 'le.utah.gov', url: 'https://le.utah.gov/~2018/bills/static/HB0272.html' },
  leg_sb242:    { label: 'le.utah.gov', url: 'https://le.utah.gov/~2024/bills/static/SB0242.html' },
  herald_repeal:{ label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2024/feb/16/lawmakers-move-forward-to-repeal-legislation-that-would-have-allowed-utah-lake-island-development/' },
  sltrib_reject:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2022/10/27/utah-lake-dredging-project/' },
  deseret_abbott:{ label: 'Deseret News', url: 'https://www.deseret.com/utah/2022/1/20/22889663/utah-lake-island-developers-sue-byu-professor-over-twitter-and-blog-remarks-abbott-uvu/' },
  deseret_end:  { label: 'Deseret News', url: 'https://www.deseret.com/utah/2023/6/14/23760789/utah-lake-island-project-what-happened-lake-restoration-solutions/' },
  // Spencer / county commission tax fight
  lehi_debate:  { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/06/03/county-commission-candidates-clash-over-taxes-transportation/' },
  // Alpine successor boards
  fox13_king:   { label: 'FOX13', url: 'https://www.fox13now.com/news/politics/could-this-idea-help-schools-in-some-of-utahs-fastest-growing-areas' },
  kuer_boards:  { label: 'KUER', url: 'https://www.kuer.org/education/2025-11-28/with-3-new-boards-sworn-in-the-work-to-split-the-alpine-district-is-just-beginning' },
  herald_bond:  { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2025/apr/28/alpine-school-board-oks-238m-bond-to-build-new-schools-in-saratoga-springs-eagle-mountain/' },
  herald_timp:  { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/may/15/building-blocks-inside-timpanogos-school-districts-preparations-for-2027-launch/' },
  herald_timp_sworn:{ label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2025/nov/27/breaking-in-a-new-board-timpanogos-school-board-sworn-in-holds-first-meeting/' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Mike McKell — Utah Senate (ENRICH: Utah Lake "islands" repeal arc) ══════════
  // mike_mckell ALREADY EXISTS. Non-destructive ENRICHMENT: appends two Utah
  // Lake spotlight receipts and merges one stance key. Individual lens — the
  // receipts describe McKell's OWN actions (sponsoring the 2018 enabling law and
  // the 2024 repeal); the LRS defamation suit against Ben Abbott is attributed to
  // LRS, not to McKell.
  //
  // NOTE ON DOC ID: McKell's canonical Firestore doc is `mmckell` (the richer
  // record kept after a duplicate cleanup; index.html aliases mmckell -> mike_mckell).
  // So the ENRICH targets `mmckell`, while the mirrored stance card is appended by
  // hand to the `mike_mckell` ISSUE_STANCE_DATA array in index.html (the display key).
  mmckell: {
    enrich: true,
    name: 'Mike McKell',
    addSpotlight: [
      { impact: 'neutral', category: 'voting', date: '2018', tags: ['Notable Actions'], issueKey: 'water',
        headline: "Sponsored the 2018 law that opened the door to the Utah Lake 'islands' plan",
        facts: "As a state representative, McKell was chief House sponsor of HB272 (2018, 'Utah Lake Amendments'), which created the Utah Lake Restoration Act — a legal framework allowing the state to transfer sovereign lakebed land to a private entity in exchange for a comprehensive 'restoration' of the lake. Lake Restoration Solutions used that framework to propose dredging roughly a billion cubic yards of sediment and building man-made islands (a multi-billion-dollar plan spanning up to ~18,000 acres). The proposal drew fierce opposition; the state rejected the application in October 2022, and the company dissolved and filed for bankruptcy in 2023.",
        why: "Establishes McKell's authorship of the enabling law at the root of one of Utah County's most contentious environmental fights — the origin half of an arc he later closed himself.",
        source: SRC.sltrib_reject },
      { impact: 'positive', category: 'voting', date: '2024', tags: ['Notable Actions', 'Public Statements'], issueKey: 'water',
        headline: "Sponsored the 2024 repeal of the Utah Lake Restoration Act for a 'clean canvas'",
        facts: "In the 2024 session, now a senator, McKell was chief Senate sponsor of SB242 ('Utah Lake Modifications'), which repealed the Utah Lake Restoration Act (and the related diking-project provisions) outright. It passed the Senate 22-0 and the House 66-2 and was signed into law March 13, 2024. McKell said the goal was 'a clean slate in Utah County, a clean canvas as we move forward with Utah Lake,' and to 'go back to the drawing board' on lake improvement after the islands plan collapsed.",
        why: "He owns both ends of the arc: the legislator who wrote the framework also wrote its repeal once the project failed legal and public tests — a full, on-record accountability loop.",
        source: SRC.herald_repeal },
    ],
    addStances: {
      'Water, Great Salt Lake & Environment': "Authored the 2018 law (HB272) that enabled the Lake Restoration Solutions plan to dredge Utah Lake and build islands, then — after the project was rejected by the state and collapsed — sponsored the 2024 repeal (SB242) of that law for a 'clean canvas.'",
    },
    stanceCards: [
      { topic: "Utah Lake 'Islands'", icon: '🏝', pos: 'mixed', issueKey: 'water', issueStance: 'mixed', text: "Sponsored the 2018 law (HB272) that created the framework for the Lake Restoration Solutions dredge-and-build-islands plan, then — after the state rejected it and the company dissolved — sponsored the 2024 repeal (SB242) for a 'clean canvas.'", source: SRC.herald_repeal },
    ],
  },

  // ══════════ David Spencer — Utah County Commission Seat B (ENRICH: tie to ~48%/67% tax hikes) ══════════
  // david_spencer_utco ALREADY EXISTS (2026 Seat B GOP nominee). Non-destructive
  // ENRICHMENT: appends one spotlight receipt + merges one stance key that ties
  // his candidacy DIRECTLY to the Batch 1 county property-tax controversy.
  david_spencer_utco: {
    enrich: true,
    name: 'David Spencer',
    addSpotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Ran directly against the county's 2019 (67%) and 2024 (48%) property-tax hikes",
        facts: "At a June 2026 candidate debate, Spencer named the commission's own record — 'a 67% property tax increase in 2019' and 'another 48% hike in 2024' — calling it 'killing the citizens and the homeowners and the businesses.' He pledged not to raise his own pay ('I will not raise my salary. I want to decrease it') after commissioner salaries rose from roughly $117,000 to about $170,000, and cited about 26,000 permitted-but-unbuilt homes in Eagle Mountain as evidence of looming '100% gridlock.'",
        why: "Ties the Seat B race directly to the Batch 1 controversy: the specific commission tax votes cast by the retiring incumbents are the record Spencer is campaigning to reverse.",
        source: SRC.lehi_debate },
    ],
    addStances: {
      'Property Taxes & County Budget': "Campaigned directly against the county commission's 2019 (~67%) and 2024 (~48%) property-tax increases — 'killing the citizens' — and pledged not to raise his own commissioner salary after pay rose from ~$117K to ~$170K.",
    },
    stanceCards: [
      { topic: 'County Tax Hikes (67% + 48%)', icon: '🏡', pos: 'oppose', issueKey: 'property_tax', issueStance: 'oppose', text: "Ran against the commission's 2019 (~67%) and 2024 (~48%) property-tax increases — 'killing the citizens and the homeowners and the businesses' — and pledged not to raise his own salary after commissioner pay rose from ~$117K to ~$170K.", source: SRC.lehi_debate },
    ],
  },

  // ══════════ Julie King — Lake Mountain School District Board President (growth funding) ══════════
  julie_king: {
    create: true,
    name: 'Julie King',
    office: '🏛 Lake Mountain School District Board (President)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 61,
    keyIssues: ['Public Schools & Education', 'Growth, Housing & Land Use', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "Julie King is the president of the Lake Mountain School District Board of Education, one of the three new nonpartisan boards created by the split of Alpine — Utah's largest school district — and sworn in November 2025. Lake Mountain (the 'West' district) covers Saratoga Springs, Eagle Mountain, Cedar Fort, and Fairfield, the fastest-growing corner of Utah County. Previously the sitting Alpine board president, King now leads the successor district that inherits the $238 million bond Alpine issued to build new west-side schools, and she has become a public advocate for changing how explosive-growth districts fund school construction.",
    acctSummary: "The president of the new Lake Mountain board, leading the successor district that absorbs Utah County's fastest growth and the $238M bond Alpine floated for Saratoga Springs and Eagle Mountain schools. King has put a specific, checkable position on the record: because school districts — unlike cities — cannot charge developer impact fees, the district faces a widening gap between the schools growth demands and the money available to build them, which she calls 'a statewide issue' deserving 'statewide support.' Her posture is constructive and transparent about the math rather than a partisan pitch.",
    theme: "Lake Mountain's board president leads the fastest-growing Alpine successor district — and argues that because schools can't charge impact fees, the state has to rethink how booming districts pay to build.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Frames explosive west-side growth as an 'unprecedented' school-funding problem",
        facts: "King says Saratoga Springs and Eagle Mountain are anticipating between 230% and 250% growth over a 30-year period — 'really unprecedented' — and that the schools needed to serve it cannot be funded the way cities fund roads and utilities. Lake Mountain is the successor district built for exactly that growth.",
        why: "Sets the concrete scale of the problem she is elected to manage, in her own words, for the fastest-growing successor district.",
        source: SRC.fox13_king },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'public_schools',
        headline: "Argues schools can't charge impact fees, leaving a funding gap she wants the state to fix",
        facts: "King notes that because school districts cannot charge developer impact fees — even though 'schools are infrastructure' — the district sees 'a significant gap' between what growth requires and what it can raise to build. She casts it as 'a statewide issue' that 'deserves statewide support,' pointing past property-tax increases alone toward a policy fix.",
        why: "A specific, sourced policy position — not a platitude — that voters and lawmakers can hold her to as the funding debate plays out.",
        source: SRC.fox13_king },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Sworn in as president of the new Lake Mountain board",
        facts: "King was among the members of the three new Alpine successor boards (Aspen Peaks, Lake Mountain, Timpanogos) sworn in in late November 2025 to steer the transition before Alpine dissolves in July 2027. She leads Lake Mountain, the west-side district serving Saratoga Springs, Eagle Mountain, Cedar Fort, and Fairfield.",
        why: "Establishes her authority and the district she governs — the growth engine of the split.",
        source: SRC.kuer_boards },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Inherits the $238M bond Alpine floated for west-side schools",
        facts: "Before the split, the Alpine board issued $238 million in lease-revenue bonds to build a new high school in Saratoga Springs and an elementary in Eagle Mountain — the exact area now inside King's Lake Mountain district. The successor district carries that construction commitment even as King argues the funding model for future schools needs to change.",
        why: "Context for why her funding argument carries weight: the district she leads is the one absorbing both the growth and the debt taken on for it.",
        source: SRC.herald_bond },
    ],
    stances: {
      'Public Schools & Education': "Leads the new Lake Mountain successor district and argues the state must rethink school-construction funding because districts, unlike cities, cannot charge developer impact fees.",
      'Growth, Housing & Land Use': "Manages the fastest-growing corner of Utah County (Saratoga Springs / Eagle Mountain), projecting 230-250% growth over 30 years — 'really unprecedented.'",
      'Property Taxes & County Budget': "Inherits Alpine's $238M west-side school bond and points past property-tax increases toward a statewide funding fix for growth districts.",
      'Local Government Transparency & Accountability': "Transparent about the structural math — the gap between what growth requires and what a school district can raise — rather than pitching a single quick fix.",
    },
    stanceCards: [
      { topic: 'Schools Can\'t Charge Impact Fees', icon: '🏫', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Argues that because school districts can't charge developer impact fees even though 'schools are infrastructure,' growth districts face a funding gap — 'a statewide issue' that 'deserves statewide support.'", source: SRC.fox13_king },
      { topic: 'Unprecedented West-Side Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Leads the Lake Mountain district serving Saratoga Springs and Eagle Mountain, which she says face 230-250% growth over 30 years — 'really unprecedented.'", source: SRC.fox13_king },
      { topic: '$238M West-Side School Bond', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Her successor district inherits the $238M lease-revenue bond Alpine issued for new Saratoga Springs and Eagle Mountain schools, even as she pushes to change how future growth is funded.", source: SRC.herald_bond },
      { topic: 'New Lake Mountain Board', icon: '🗳', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Sworn in Nov. 2025 as president of the new Lake Mountain board, one of three successor districts steering the Alpine split before it dissolves in July 2027.", source: SRC.kuer_boards },
    ],
  },

  // ══════════ Jennifer Lyman — Timpanogos School District Board President (inherited deficit) ══════════
  // Honestly labeled: Lyman's record is an EMERGING posture — no tax vote has
  // been cast. The ~$20M deficit / ~17% figures are the DISTRICT's own
  // projection (per its video), not a Lyman quote; her words are her framing.
  jennifer_lyman: {
    create: true,
    name: 'Jennifer Lyman',
    office: '🏛 Timpanogos School District Board (President)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 55,
    keyIssues: ['Public Schools & Education', 'Property Taxes & County Budget', 'Local Government Transparency & Accountability', 'Growth, Housing & Land Use'],
    bio: "Jennifer Lyman is the president of the Timpanogos School District Board of Education, one of the three new nonpartisan boards created by the split of Alpine and sworn in November 2025. Timpanogos serves Orem, Lindon, Vineyard, and Pleasant Grove — about 23,000 students, the smallest enrollment of the three successor districts. Lyman, who had been skeptical of the split, now leads the district that faces the toughest fiscal math coming out of it: a projected structural deficit before Timpanogos even formally launches in July 2027.",
    acctSummary: "The president of the new Timpanogos board, leading the smallest successor district as it confronts a documented ~$20 million projected annual deficit — which the district's own analysis says would take roughly a 17% property-tax increase, program cuts, or a mix to close, plus about $300 more per student just to run a smaller district. Lyman's posture so far is candor and process rather than a committed tax path: she frames the challenge as making 'delicious lemonade' from 'a lot of lemons' and promises community 'input at every point along the line.' Her governing record on the actual money decisions is still ahead — no tax vote has been cast.",
    theme: "Timpanogos' board president inherited the split's hardest budget — a projected ~$20M deficit — and leads with candor and community input while the real tax-and-cut decisions still lie ahead.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Leads the successor district facing a projected ~$20M deficit",
        facts: "The new Timpanogos district projects a roughly $20 million annual deficit if schools and services stay the same — which its own analysis says would require about a 17% property-tax increase, program and service cuts, or a combination to close. Operating a smaller district is estimated to add about $300 per student per year, and Timpanogos has the lowest enrollment (~23,000) of the three successor districts.",
        why: "The defining fiscal reality of the district Lyman leads — a concrete projection voters can measure future board decisions against.",
        source: SRC.herald_timp },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'public_schools',
        headline: "Frames the inherited shortfall as 'lemons' to turn into 'lemonade'",
        facts: "Lyman, who had been among those skeptical of the split, has publicly accepted the task of standing up the district despite the budget gap: 'We were handed a lot of lemons; we're going to make some really delicious lemonade.' She has not committed to a specific tax-or-cut path; the board's money decisions are still ahead.",
        why: "Her own framing of a hard inheritance — honest about the difficulty, and a marker to weigh against what the board actually decides.",
        source: SRC.herald_timp },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Pledged community 'input at every point along the line'",
        facts: "As the district ran a boundary study and planned community meetings at each high school, Lyman said the goal was 'to have touch points with our community, so they are not only aware, but they're having input at every point along the line' — casting the deficit and boundary decisions as an open process rather than a closed one.",
        why: "A transparency commitment on decisions that will reshape schools and taxes — one she can be held to as those decisions arrive.",
        source: SRC.herald_timp },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Elected president as the new Timpanogos board was sworn in",
        facts: "Lyman was unanimously elected board president when the new Timpanogos board was sworn in and held its first meeting in late November 2025, representing the Lindon / part-of-Pleasant-Grove seat. The board must divide resources and set boundaries before Timpanogos formally launches in July 2027.",
        why: "Establishes her authority and the timeline over which her fiscal choices will be judged.",
        source: SRC.herald_timp_sworn },
    ],
    stances: {
      'Public Schools & Education': "Leads the new Timpanogos successor district (~23,000 students, the smallest of the three) through a difficult startup before its July 2027 launch.",
      'Property Taxes & County Budget': "Governs a district facing a projected ~$20M deficit that the district says would take roughly a 17% property-tax increase or cuts to close — but has not committed to a specific path (no tax vote cast).",
      'Local Government Transparency & Accountability': "Pledges community 'input at every point along the line' on boundary and budget decisions.",
      'Growth, Housing & Land Use': "Manages boundary and facility decisions for the Orem / Lindon / Vineyard / Pleasant Grove area amid the split.",
    },
    stanceCards: [
      { topic: 'Inherited ~$20M Deficit', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Leads the successor district projecting a ~$20M annual deficit — which the district says would take roughly a 17% property-tax increase, cuts, or a mix to close. No tax vote has been cast; her path is still emerging.", source: SRC.herald_timp },
      { topic: "'Lemons' Into 'Lemonade'", icon: '🍋', pos: 'mixed', issueKey: 'public_schools', issueStance: 'mixed', text: "A onetime split skeptic now standing up the district: 'We were handed a lot of lemons; we're going to make some really delicious lemonade.'", source: SRC.herald_timp },
      { topic: 'Community Input', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Pledges 'touch points with our community, so they are not only aware, but they're having input at every point along the line' on boundary and budget decisions.", source: SRC.herald_timp },
      { topic: 'New Timpanogos Board', icon: '🗳', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Unanimously elected president as the new Timpanogos board (Orem / Lindon / Vineyard / Pleasant Grove, ~23,000 students) was sworn in Nov. 2025.", source: SRC.herald_timp_sworn },
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

// ── Emit the index.html ISSUE_STANCE_DATA block (CREATE records only) ─────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Utah County sitting officials · Batch 3 (July 2026) ───────────────────────');
  out.push('    // Alpine School District successor-board PRESIDENTS with sourced positions on the');
  out.push('    // split\'s fiscal aftermath: Julie King (Lake Mountain — fastest-growth district,');
  out.push('    // the $238M west-side bond, schools-can\'t-charge-impact-fees funding gap) and Jennifer');
  out.push('    // Lyman (Timpanogos — the inherited ~$20M projected deficit, framed with candor).');
  out.push('    // (mike_mckell\'s Utah Lake and david_spencer_utco\'s tax-hike cards are appended to');
  out.push('    // their existing arrays, not here.)');
  for (const [id, plan] of Object.entries(DATA)) {
    if (plan.enrich) continue; // mckell + spencer cards are added to their existing arrays by hand
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
  console.log(`PolitiDex — Utah County deep dive (batch 3: Utah Lake repeal + commission tax-fight tie + Alpine successor boards)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map((m) => m[1]));
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
    const f = '/tmp/utah-county-batch3-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, enriched = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    // ── ENRICH path (mckell, spencer): append spotlight receipts + merge stances ──
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

    // ── CREATE path ──
    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this batch CREATEs new officials only)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created, ${enriched} enriched (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
