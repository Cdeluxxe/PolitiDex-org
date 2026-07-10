#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Cache County deep dive, BATCH 2 (July 2026)
//
// A DELIBERATELY SCOPED continuation of the Cache County accountability pass
// (see scripts/CACHE-COUNTY-CONTROVERSY-TRACKER.md, "Batch 1"). The unit is the
// FIGHT, not the politician.
//
// WHAT BATCH 1 LEFT UNDONE (the reason this batch exists):
//   Batch 1 mapped Cache County's STATE-LEGISLATIVE tier (Snider, Wilson,
//   Sandall, Draxler, Moore — all already built) onto the water / USU /
//   behavioral-health fights. It never touched the COUNTY and CITY tier, and
//   research for this batch confirmed that tier is where the highest-attention
//   local fight of the last two years actually lives — and that NONE of these
//   officials had a record in the roster (verified: 0 hits in index.html for
//   george_daines / erickson / mark_anderson / goodlander / zook).
//
// THE HIGHEST-SIGNAL CACHE COUNTY CONTROVERSIES (research-confirmed, July 2026):
//   1. THE COUNTY PROPERTY-TAX ESCALATION (2024 → 2026). Cache County is run by
//      a COUNCIL + EXECUTIVE (not commissioners). In Nov. 2024 a proposed 20%
//      hike drew ~100 residents overflowing the chambers; it was trimmed to 12%
//      + a 0.3% sales tax. Executive David Zook resigned Sept. 8, 2025; N. George
//      Daines won the Sept. 11 GOP special election on a "protect taxpayers"
//      pledge — then, weeks in, the council UNANIMOUSLY approved an 18% increase
//      for 2026 (~$3.7M). This is the county's defining fight.
//   2. LOGAN GROWTH / HOUSING / LAND USE. Logan (~50,000, projected to double by
//      2060) turned its 2025 mayoral race into a growth referendum; new mayor
//      Mark Anderson (sworn Jan. 6, 2026) centers housing supply and regional
//      infrastructure. A Sept. 2025 density rezone near the rec complex was
//      denied over infrastructure concerns.
//
// BUILT THIS BATCH — 3 SITTING OFFICIALS, all CREATE (none existed):
//   • george_daines        — Cache County Executive (R). The pledge-vs-record
//                            arc: ran to "protect taxpayers," inherited a $7.6M
//                            shortfall, proposed ~$2.8M in cuts (incl. the
//                            library), and the council still passed an 18% hike.
//   • david_erickson_cache — Cache County Council, North District (R). The blunt
//                            public face of the 2024 tax fight ("if you don't
//                            like it, then please vote us out"). Since 2015.
//   • mark_anderson_logan  — Logan Mayor (Nonpartisan). Supply-first housing and
//                            regional-infrastructure record on the growth fight.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • Council Chair Sandi Goodlander presided over the unanimous 18% vote, but
//     no substantive statement could be VERIFIED to her by name in an accessible
//     source (search-engine summaries attributed a mill-levy explanation and a
//     "lowest revenue per capita" line to her, but neither survived a direct
//     read of the cited articles). Per the honesty standard she is TRACKED, not
//     stubbed. Same for members Nolan Gunnell, Barbara Tidwell (verified: backs
//     defunding the Logan library over "double taxation" — one receipt, below
//     the 3-5 bar) and Keegan Garrity.
//   • David Zook (former Executive, resigned Sept. 8, 2025) has a clear,
//     documentable role, but he is a FORMER official and holds no office and is
//     not a 2026 candidate. His verified role is captured as CONTEXT inside the
//     Daines and Erickson receipts and in the tracker, not as a standalone stub.
//   • NO Cache Valley data center / industrial-water controversy exists. The
//     data-center water fights in the news are Imperial Valley, CALIFORNIA — not
//     Cache Valley, Utah. That priority focus area does NOT apply here and is
//     honestly recorded as "no such controversy," not invented.
//   • 2026 challenger fields (County Executive full term, council seats) are not
//     yet sourced — tracked, not stubbed, exactly as Batch 1 handled them.
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • george_daines        — Cache County Executive; won Sept. 11, 2025 GOP
//                            special election (54%, 3rd round); sworn in Sept. 16;
//                            fills term through Dec. 2026; former county attorney
//                            (2002-09).                                     → CREATE
//   • david_erickson_cache — Cache County Council, North District, since 2015;
//                            chaired the council during the 2024 tax fight;
//                            re-elected unopposed 2024; lost the 2021 executive
//                            race to Zook.                                   → CREATE
//   • mark_anderson_logan  — Logan Mayor; former Logan Municipal Council member;
//                            won the 2025 race; sworn in Jan. 6, 2026.       → CREATE
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source that was
//     HTTP-verified during research (Cache Valley Daily, HJ News, KSL, Utah
//     Public Radio, KVNU). Quotes used are ONLY those confirmed against a direct
//     read of the cited article — attributions that appeared only in search
//     summaries but failed a direct read were DROPPED (e.g. the "unfunded SRO
//     mandate" line, which actually belongs to Zook, not Gunnell).
//   • Individual lens, not party. Vote outcomes are stated as plain facts (the
//     18% increase passed UNANIMOUSLY).
//   • Pledge vs. record labeled: Daines's "protect taxpayers" pledge is set
//     against the 18% increase passed on his watch; the tension is stated, not
//     smoothed over.
//   • Municipal offices are NONPARTISAN (Anderson).
//   • Idempotent & non-destructive: re-fetches each doc; CREATE only where
//     nothing exists; never clobbers an existing record.
//
//   node scripts/deep-dive-cache-county-batch2-jul2026.mjs            # dry run
//   node scripts/deep-dive-cache-county-batch2-jul2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-cache-county-batch2-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-01T00:00:00.000Z';

// Shared sources (HTTP-verified during research; quotes confirmed by direct read).
const SRC = {
  cvd_18approve:  { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/cache-county-council-approves-18-percent-property-tax-increase-for-residents/article_f6a7ee75-ba64-44a9-9afd-08c9e4dc74a0.html' },
  hjnews_18approve:{ label: 'HJ News', url: 'https://www.hjnews.com/news/government/county-approves-18-property-tax-increase-vows-to-bring-revenues-and-expenditures-in-line/article_13d02168-74e4-46cf-b756-1438b3d9755c.html' },
  ksl_2024hearing:{ label: 'KSL', url: 'https://www.ksl.com/article/51189338/proposed-tax-hike-in-cache-county-draws-ire-from-residents-at-packed-hearing' },
  upr_2024oppose: { label: 'Utah Public Radio', url: 'https://www.upr.org/utah-news/2024-11-14/dozens-of-cache-county-residents-oppose-proposed-20-tax-hike' },
  cvd_daines_win: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/cache-republicans-select-n-george-daines-to-succeed-former-county-executive-david-zook/article_1233cf2d-bebc-492c-826a-28988748ae36.html' },
  cvd_zook_resign:{ label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/david-zook-to-resign-as-cache-county-executive-effective-monday-sept-8/article_8aeaba59-c6c2-40b7-8f29-538dfc17629d.html' },
  upr_anderson:   { label: 'Utah Public Radio', url: 'https://www.upr.org/utah-news/2026-01-09/heres-what-logans-new-mayor-says-about-managing-growth-housing-affordability' },
};

// ── Curated, sourced deep-dive data (keyed by intended Firestore doc id) ─────
const DATA = {
  // ══════════ N. George Daines — Cache County Executive (CREATE) ══════════
  // The pledge-vs-record arc at the center of the county's defining fight.
  george_daines: {
    create: true,
    name: 'N. George Daines',
    office: '🏛 Cache County Executive',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 58,
    keyIssues: ['Property Taxes & County Budget', 'Local Government Transparency & Accountability', 'Growth, Housing & Land Use'],
    bio: "N. George Daines is the Cache County Executive, chosen in a Sept. 11, 2025 Republican special election to finish the term (through December 2026) of David Zook, who resigned to enter the private sector. A former Cache County attorney (2002-2009) and chairman of Cache Valley Bank, Daines campaigned on protecting taxpayers and restoring fiscal discipline — then, weeks into office, inherited a budget shortfall he put at $7.6 million and a Truth-in-Taxation process that ended with the County Council unanimously approving an 18% property-tax increase for 2026.",
    acctSummary: "Cache County's executive is the clearest pledge-vs-record case in the county's defining fight. Daines won a one-week special-election campaign on a promise to 'protect taxpayers' and restore fiscal discipline after years of council-executive budget friction. In office he acted on part of that pledge — recommending roughly $2.8 million in cuts, including defunding the county's library contribution — but the structural gap he inherited ($7.6M, which he called a 'five to ten year' problem) was closed with an 18% property-tax increase the council passed unanimously. His record is honest about the trade-off rather than either a broken promise or a clean win.",
    theme: "Won on a 'protect taxpayers' pledge, then inherited a $7.6M shortfall — and the council closed it with an 18% property-tax hike weeks into his term.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Campaign Promises', 'Public Statements'], issueKey: 'property_tax',
        headline: "Won a special election on a promise to 'protect taxpayers'",
        facts: "In the Sept. 11, 2025 Cache County Republican special election to replace the resigning David Zook, Daines emerged from a multi-candidate field to win a 54% majority in the third round of balloting. He pledged to 'deliver leadership, protect taxpayers and ensure that Cache County's best days are ahead,' and named fiscal accountability, transparency and a return to county 'core functions' as his focus.",
        why: "Establishes the fiscal-restraint pledge his record as executive is measured against.",
        source: SRC.cvd_daines_win },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Sworn in to finish Zook's term after a private-sector resignation",
        facts: "The County Council unanimously appointed Daines on Sept. 16, 2025 to serve the unexpired term through December 2026. Daines is a former Cache County attorney (2002-2009), chairman of Cache Valley Bank and a partner at the law firm Daines & Jenkins — stepping into a budget already midstream.",
        why: "Establishes his authority and the short, high-pressure window in which his budget choices play out.",
        source: SRC.cvd_daines_win },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_waste',
        headline: "Inherited a $7.6M shortfall and proposed ~$2.8M in cuts — including the library",
        facts: "Taking office mid-budget, Daines said the county faced a $7.6 million shortfall and warned that catching up with the tax base would be 'a five to ten year effort.' He recommended about $2.8 million in cuts — including defunding the county's contribution to the library — and said the remaining gap would be covered from reserve accounts.",
        why: "Shows how he tried to honor the taxpayer-protection pledge against the county's structural gap — the cuts side of the ledger.",
        source: SRC.cvd_18approve },
      { impact: 'mixed', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Council unanimously approved an 18% property-tax increase in his first budget",
        facts: "Despite the proposed cuts, the Cache County Council voted unanimously to approve an 18% property-tax increase for 2026, raising more than $3.7 million in new revenue. The once-contentious issue drew only five speakers at the November hearing — a sharp drop from the packed 2024 hearing — even as a more-than-$1 million gap was left to close over time.",
        why: "The record against the pledge: the taxpayer-protection candidate presided over the county's largest recent tax increase, framed as closing an inherited structural gap.",
        source: SRC.hjnews_18approve },
    ],
    stances: {
      'Property Taxes & County Budget': "Campaigned to 'protect taxpayers,' then inherited a $7.6M shortfall and recommended ~$2.8M in cuts (including the library) — but the council still unanimously approved an 18% property-tax increase for 2026. A clear pledge-vs-record tension, stated honestly.",
      'Local Government Transparency & Accountability': "Ran on fiscal accountability, transparency and a return to county 'core functions'; a former county attorney now steering the budget through December 2026.",
      'Growth, Housing & Land Use': "Frames the county's budget squeeze as growth outrunning revenue — 'we hope to get taxes so that taxes match inflation plus growth in people.'",
    },
    stanceCards: [
      { topic: 'Ran to "Protect Taxpayers"', icon: '🗳', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Won the Sept. 2025 special election (54%, third round) pledging to 'deliver leadership, protect taxpayers' and restore fiscal discipline after years of council-executive budget friction.", source: SRC.cvd_daines_win },
      { topic: '18% Tax Hike on His Watch', icon: '🧾', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "Inherited a $7.6M shortfall and proposed ~$2.8M in cuts, but the council unanimously approved an 18% property-tax increase for 2026 (~$3.7M) — the pledge-vs-record tension at the center of the fight.", source: SRC.hjnews_18approve },
      { topic: 'Defund the Library?', icon: '🧹', pos: 'mixed', issueKey: 'gov_waste', issueStance: 'mixed', text: "Recommended ~$2.8M in cuts including defunding the county's library contribution to shrink the shortfall before turning to a tax increase.", source: SRC.cvd_18approve },
      { topic: 'Back to "Core Functions"', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Names fiscal accountability, transparency and a return to county 'core functions' as his focus; a former county attorney (2002-09) finishing Zook's term through Dec. 2026.", source: SRC.cvd_daines_win },
    ],
  },

  // ══════════ David L. Erickson — Cache County Council, North District (CREATE) ══════════
  // The blunt public face of the 2024 tax fight. Quotes verified by direct read.
  david_erickson_cache: {
    create: true,
    name: 'David L. Erickson',
    office: '🏛 Cache County Council (North District)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 57,
    keyIssues: ['Property Taxes & County Budget', 'Local Government Transparency & Accountability'],
    bio: "David L. Erickson has represented the North District on the Cache County Council since 2015, and chaired the council during the county's contentious 2024 budget fight. A fiscal conservative who has openly wrestled with the county's structural need for revenue, Erickson became the blunt public face of the 2024 proposal to raise property taxes 20% — telling opponents at a packed hearing that the council was 'doing the best that we can' and, if they disagreed, to 'vote us out.' He earlier sought the top job, losing the January 2021 Republican special election for County Executive to David Zook.",
    acctSummary: "Erickson is the councilman most identified with Cache County's defining tax fight. As chair during the 2024 budget cycle he defended a proposed 20% property-tax increase in front of roughly 100 opposing residents, telling them plainly to 'vote us out' if they disagreed — while also voicing genuine fiscal-restraint instincts, warning of 'hard pills to swallow' in cuts and questioning whether the county funds things 'outside of what we as a county should even be involved in.' A decade on the council (re-elected unopposed in 2024) makes him a durable, accountable figure in the fight rather than a passing one.",
    theme: "The council chair who told 2024 tax-hike opponents to 'vote us out' — and still warned his own county spends on things it shouldn't.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Told tax-hike opponents to 'vote us out'",
        facts: "As council chair at the packed November 2024 hearing on a proposed 20% property-tax increase — where nearly 100 residents overflowed the chambers and speaker after speaker opposed it — Erickson said, 'We are doing the best that we can,' and, 'Again, if you don't like it, then please vote us out.' He noted the county had explored other funding to avoid the full increase.",
        why: "The sharpest, most-quoted moment of the county's defining tax fight, in the chair's own words.",
        source: SRC.upr_2024oppose },
      { impact: 'neutral', category: 'rhetoric', date: '2024', tags: ['Public Statements'], issueKey: 'gov_waste',
        headline: "Warned of 'hard pills to swallow' and questioned the county's scope",
        facts: "Searching for cuts before the 2024 vote, Erickson said 'there'll probably be some hard pills to swallow,' and voiced concern that the county funds things 'outside of what we as a county should even be involved in.'",
        why: "Shows the fiscal-restraint side of a chair who still defended a large increase — the exact tension at the center of the fight.",
        source: SRC.ksl_2024hearing },
      { impact: 'neutral', category: 'voting', date: '2015–2024', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_transparency',
        headline: "A decade on the council, re-elected unopposed",
        facts: "Erickson has represented the council's North District since 2015 and was re-elected unopposed in 2024, keeping him at the center of the county's budget decisions across the entire tax-escalation arc.",
        why: "Establishes his tenure and standing — and that voters returned him without a challenger even amid the tax fight.",
        source: SRC.upr_2024oppose },
      { impact: 'neutral', category: 'voting', date: '2021', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Lost the 2021 County Executive race to David Zook",
        facts: "In the January 2021 Republican special election to replace outgoing Executive Craig Buttars, Erickson — a veteran councilman — lost to David Zook, whose subsequent tenure was marked by a rocky relationship with the very council Erickson sat on before Zook's own 2025 resignation.",
        why: "Context for the council-executive dynamic that shaped Cache County's budget disputes through 2025.",
        source: SRC.cvd_zook_resign },
    ],
    stances: {
      'Property Taxes & County Budget': "As 2024 council chair, defended the proposed 20% property-tax increase — 'we are doing the best that we can' — and told opponents to 'vote us out,' while also warning of 'hard pills to swallow' in cuts.",
      'Local Government Transparency & Accountability': "A North District councilman since 2015, re-elected unopposed in 2024; questioned whether the county funds things 'outside of what we as a county should even be involved in.'",
    },
    stanceCards: [
      { topic: '"Vote Us Out"', icon: '🗳', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed', text: "As 2024 council chair, defended the proposed 20% hike — 'We are doing the best that we can' — and told opponents at a packed hearing, 'if you don't like it, then please vote us out.'", source: SRC.upr_2024oppose },
      { topic: '"Hard Pills to Swallow"', icon: '🧹', pos: 'mixed', issueKey: 'gov_waste', issueStance: 'mixed', text: "Warned of 'hard pills to swallow' in cuts and said the county funds things 'outside of what we as a county should even be involved in' — a restraint instinct alongside a vote for higher taxes.", source: SRC.ksl_2024hearing },
      { topic: 'Decade on the Council', icon: '🏛', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Represents the North District since 2015, re-elected unopposed in 2024; earlier lost the 2021 County Executive race to David Zook.", source: SRC.upr_2024oppose },
    ],
  },

  // ══════════ Mark Anderson — Logan Mayor (CREATE) ══════════
  // Municipal office → NONPARTISAN. Supply-first housing record on the growth fight.
  mark_anderson_logan: {
    create: true,
    name: 'Mark Anderson',
    office: '🏛 Logan Mayor',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Growth, Housing & Land Use', 'Water & Infrastructure', 'Local Government Transparency & Accountability'],
    bio: "Mark Anderson is the mayor of Logan, Cache County's largest city, sworn in Jan. 6, 2026 after serving on the Logan Municipal Council. He won the 2025 election to succeed three-term mayor Holly Daines, who did not seek re-election, inheriting a city of roughly 50,000 that is projected to more than double — to about 117,700 — by 2060. Anderson has centered his term on managing that growth 'without erasing the city's charm,' expanding housing supply, and coordinating water and infrastructure with fast-growing neighboring towns.",
    acctSummary: "Logan's new mayor takes office as the commercial center of a valley growing fast on every side, and he has put a specific, supply-first housing position on the record: 'the more supply we can create, the better the pricing,' backing walkable student housing near Utah State University to free up single-family homes for first-time buyers, plus workforce housing and the deed-restricted River Crossing project. He casts regional growth as an infrastructure problem for Logan — prioritizing a new water tank and Canyon Road waterline — and has pledged more open communication, a promise tested early when he apologized for removing neighbors' protest signs. A clear, early, checkable record on the growth fight.",
    theme: "Logan's new mayor bets on housing supply and regional-infrastructure coordination to manage growth 'without erasing the city's charm.'",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Bets on housing supply to ease Logan's prices",
        facts: "Anderson calls housing a top resident concern — especially for young families, students and recent graduates in a university town — and argues 'the more supply we can create, the better the pricing.' He backs walkable student housing near Utah State University to free up single-family homes for first-time buyers, wants more workforce housing for median-income residents, and praised the deed-restricted River Crossing townhome community for income-qualified workers.",
        why: "A concrete, supply-first housing position — not a platitude — that voters can hold him to as Logan grows.",
        source: SRC.upr_anderson },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'infrastructure',
        headline: "Frames regional growth as an infrastructure strain on Logan",
        facts: "Anderson says growth in surrounding Cache Valley cities pressures Logan, the county's commercial hub: 'as our neighbors get bigger and they start to have pressure on their infrastructure, it affects ours.' He prioritizes a new water tank and a Canyon Road waterline to support future growth, and closer coordination with neighboring municipalities.",
        why: "Ties Logan's growth debate to specific, buildable infrastructure commitments rather than slogans.",
        source: SRC.upr_anderson },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Elected Logan mayor as growth topped the 2025 race",
        facts: "A former Logan Municipal Council member, Anderson won the 2025 mayoral election — in which growth and housing were the central issues — and was sworn in Jan. 6, 2026, succeeding Holly Daines. Logan's roughly 50,000 population is projected to reach about 117,700 by 2060.",
        why: "Establishes his mandate on the very issue that defined the race that put him in office.",
        source: SRC.upr_anderson },
      { impact: 'mixed', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Promises more public communication — after a rocky first month",
        facts: "Anderson pledged to improve city communication through a public-information group and monthly neighborhood committee meetings. Early in his term, he drew criticism for removing neighbors' tree-removal protest signs and issued a public apology.",
        why: "A transparency commitment paired with an honest early stumble — both worth tracking as his term unfolds.",
        source: SRC.upr_anderson },
    ],
    stances: {
      'Growth, Housing & Land Use': "Supply-first on housing — 'the more supply we can create, the better the pricing' — backing walkable student housing near USU to free up starter homes, plus workforce housing and the deed-restricted River Crossing project.",
      'Water & Infrastructure': "Casts neighboring cities' growth as a strain on Logan and prioritizes a new water tank and Canyon Road waterline to keep capacity ahead of demand.",
      'Local Government Transparency & Accountability': "Pledged a public-information group and monthly neighborhood meetings; apologized early in his term for removing neighbors' tree-removal protest signs.",
    },
    stanceCards: [
      { topic: 'Supply-First Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "'The more supply we can create, the better the pricing' — backs walkable student housing near USU to free up starter homes, plus workforce housing and the deed-restricted River Crossing project.", source: SRC.upr_anderson },
      { topic: 'Growth Strains Infrastructure', icon: '🚰', pos: 'mixed', issueKey: 'infrastructure', issueStance: 'mixed', text: "Says neighboring cities' growth pressures Logan — 'as our neighbors get bigger ... it affects ours' — and prioritizes a new water tank and Canyon Road waterline.", source: SRC.upr_anderson },
      { topic: 'Elected on Growth', icon: '🗳', pos: 'support', issueKey: 'housing_build', issueStance: 'support', text: "Former councilman elected Logan mayor in 2025 as growth topped the race; sworn in Jan. 6, 2026, succeeding Holly Daines. Logan is projected to more than double by 2060.", source: SRC.upr_anderson },
      { topic: 'Communication Pledge', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Pledged a public-information group and monthly neighborhood meetings — after apologizing for removing neighbors' tree-removal protest signs early in his term.", source: SRC.upr_anderson },
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
  out.push('    // ── Cache County sitting officials · Batch 2 (July 2026) ──────────────────────');
  out.push('    // First structured pass on Cache County\'s COUNTY + CITY tier (Batch 1 covered only');
  out.push('    // the state-legislative tier). All three are tied to the county\'s two defining');
  out.push('    // fights — the 2024→2026 property-tax escalation and the Logan growth/housing');
  out.push('    // debate. Every quote was verified against a direct read of the cited article.');
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
  console.log(`PolitiDex — Cache County deep dive (batch 2: county property-tax fight + Logan growth)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

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
    const f = '/tmp/cache-county-batch2-stance-block.txt';
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
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
