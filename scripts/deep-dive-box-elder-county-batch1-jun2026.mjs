#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Box Elder County deep dive, BATCH 1 (June 2026)
//
// The first structured accountability pass on Box Elder County, modeled on the
// Weber County county/municipal tier (deep-dive-weber-county-batch1). Scope:
// CURRENT SITTING county officials only — the people who most directly decide
// the county budget, property-tax rate, growth/land use, water and public
// safety. No 2026 challengers and no former officials are authored here.
//
// A roster audit of the live Firestore `politicians` collection found NONE of
// the target officials already had a profile, so every entry below is a CREATE.
//
// CURRENT-STATUS VERIFICATION (Box Elder County official elected-officials page,
// confirmed serving as of June 2026 — note several names on the original batch
// brief were OUT OF DATE and are corrected here):
//   • tyler_vincent  — Commissioner & Commission Chair; former Brigham City
//                      mayor. Took county office Jan 2025, term through end of
//                      2028; NOT on the 2026 ballot.                  → CREATE
//   • lee_perry      — Commissioner, Seat B; former Utah House member (Dist. 29)
//                      and 31-year Utah Highway Patrol trooper. Term through end
//                      of 2026. LOST the June 23, 2026 GOP primary to Nathan
//                      Tueller (53.3%–46.7%); says he is done with office. → CREATE
//   • boyd_bingham   — Commissioner, Seat A; rancher and former Honeyville
//                      mayor. Term through end of 2026. LOST the June 23, 2026
//                      GOP primary to Vance Smith (52%–48%).          → CREATE
//   • kevin_potter   — Sheriff since January 2015. LOST the June 23, 2026 GOP
//                      primary to deputy Mike Allred (≈63%–36%), the widest
//                      county-race margin; finishing his term.        → CREATE
//   • marla_young    — County Clerk; runs county elections. On the 2026 ballot.
//                                                                     → CREATE
//   • stephen_hadfield — County Attorney; the commission's legal adviser and the
//                      county's chief prosecutor.                     → CREATE
//
// SKIPPED from the original batch brief, with reasons (verified June 2026):
//   • Stan Summers / Jeff Scott — NO LONGER sitting commissioners (the current
//     commission is Vincent, Perry, Bingham). Out of scope for a sitting-only batch.
//   • Kevin Jensen — NOT the sheriff; Kevin Potter holds the office. Skipped.
//   • Brigham City mayor — Tyler Vincent vacated that seat to join the commission;
//     his successor was not researched in this batch and is left for a later pass.
//
// THE DEFINING STORY of this batch is the Stratos Project — a hyperscale data
// center + on-site power campus in rural northwest Box Elder County, advanced
// through the state's Military Installation Development Authority (MIDA). On
// May 4, 2026 the three commissioners voted UNANIMOUSLY (3–0) to let MIDA create
// the project area; the decision drove a residents' backlash, death threats,
// referendum attempts and the June 23 primary defeats of two commissioners and
// the sheriff. Each commissioner's vote is documented as a plain fact, with both
// the commissioners' "our hands were tied / property rights" defense and the
// public's water, transparency and process objections represented.
//
// For each official this pass builds the same two sourced layers as the model:
//   • Spotlight / Accountability — 3–5 sourced integrity receipts (impact:
//     positive = words match actions / principled stand; negative =
//     inconsistency, controversy or a contested action; neutral = factual
//     context such as a documented decision or external event), each carrying a
//     real {label,url} `source` HTTP-200 verified during research, plus a
//     one-line spotlight theme.
//   • Issue positions — `stances` (topic → text) grounded in a real vote, budget
//     action or documented public position.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt is primary/local where possible (Box Elder
//     County .gov, KUER, KSL, Cache Valley Daily, Salt Lake Tribune, Deseret
//     News, KUTV, HJ News / Tremonton Leader).
//   • Individual lens, not party. Vote tallies/outcomes stated as plain facts.
//   • Balanced: the unanimous data-center vote, the primary defeats, the dispatch
//     no-confidence and the referendum rejection sit alongside the commissioners'
//     property-rights/legal-risk defense, the clerk's transparent ballot
//     accounting and the sheriff's praised 2025 crisis response.
//   • Campaign-style or contested claims (revenue projections, the outside-PAC ad
//     spend, the patrols-at-homes attribution) are explicitly attributed, never
//     stated as audited fact.
//   • Idempotent & non-destructive: re-fetches each live doc and only CREATEs
//     where nothing exists; never clobbers a profile that already exists.
//
//   node scripts/deep-dive-box-elder-county-batch1-jun2026.mjs            # dry run
//   node scripts/deep-dive-box-elder-county-batch1-jun2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-box-elder-county-batch1-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════════════ Tyler Vincent — Commissioner & Chair ══════════════════
  tyler_vincent: {
    create: true,
    name: 'Tyler Vincent',
    office: '🏛 Box Elder County Commission (Chair)',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    nextElection: '2028-11-07',
    score: 56,
    keyIssues: ['Growth, Housing & Land Use', 'County Budget & Appropriations', 'Water, Great Salt Lake & Environment', 'Government Transparency'],
    bio: "Tyler Vincent is a Box Elder County Commissioner and the commission's chair. Born and raised in Brigham City, he served on the Brigham City Council and then as mayor of Brigham City before winning a seat on the county commission; he took county office in January 2025, and his four-year term runs through the end of 2028, so he was not on the 2026 ballot. As Brigham City mayor he made economic development his signature theme; as a commissioner, his defining decision so far is the unanimous May 2026 approval of the Stratos data-center project.",
    acctSummary: "A former Brigham City mayor turned commission chair whose tenure is defined by chairing and casting one of the three unanimous votes for the Stratos data-center project — a decision he and his colleagues defend as forced by private-property rights and state (MIDA) leverage, but which triggered a residents' backlash, death threats and the primary defeat of his two colleagues. Insulated from the 2026 ballot, he was the only one of the three to escape an immediate electoral test.",
    theme: "The commission chair who presided over — and voted for — the unanimous Stratos data-center approval, then watched a residents' revolt unseat his two colleagues while he, not on the 2026 ballot, kept his seat.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_rights',
        headline: 'Chaired and voted for the unanimous approval of the Stratos data-center project',
        facts: "On May 4, 2026, with Vincent presiding as chair, the three-member Box Elder County Commission voted 3–0 to approve resolutions letting Utah's Military Installation Development Authority (MIDA) create the 'Stratos' project area — a hyperscale data center and on-site power campus in rural northwest Box Elder County backed by an O'Leary-tied developer. Facing a crowd of hundreds, the commissioners finished the meeting and vote remotely. They argued the land was privately owned, under contract, water-righted and unzoned, so partnering with MIDA was the only way to attach 'guardrails' such as fire/EMS service and tax revenue.",
        why: "The most consequential land-use decision in recent county history, and Vincent shares full governing responsibility for it as both chair and a yes vote.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Red Flags'], issueKey: 'water',
        headline: 'Approved a project whose water plan drew more than 1,500 formal protests',
        facts: "The Stratos project sits near the northern tip of the Great Salt Lake, and the developer's move to change a water right from agricultural to industrial use drew more than 1,500 protests filed with Utah's Division of Water Rights. Developers cited a closed-loop air-cooling design and plans to buy roughly 2,800 acre-feet of water, but an outside engineering expert called 100% air cooling 'pretty rare,' leaving residents skeptical about long-term water draw in a basin already under stress.",
        why: "Water is the central environmental risk Box Elder voters raised, and the commission approved the project over a record number of water-rights protests.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Behavior'], issueKey: 'gov_transparency',
        headline: 'Was not on the 2026 ballot as the backlash unseated his two colleagues',
        facts: "Vincent cast the same yes vote on Stratos as Commissioners Lee Perry and Boyd Bingham, but unlike them his seat was not up in 2026, so he faced no primary test as voters defeated both of his colleagues on June 23. All three commissioners were placed under police protection after the vote following threats against them.",
        why: "A factual note on accountability: the chair who shared the decision was the one official spared an immediate vote of the people on it.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
    ],
    stances: {
      'Growth, Housing & Land Use': "Voted to approve the Stratos data-center project area through MIDA, arguing that because the land was private, contracted and unzoned, partnering with the state was the only way to impose any guardrails on development the county could not otherwise stop.",
      'Water, Great Salt Lake & Environment': "Backed a data center near the Great Salt Lake whose agricultural-to-industrial water-right change drew more than 1,500 protests; the commission accepted the developer's closed-loop cooling and limited-water-purchase assurances.",
      'County Budget & Appropriations': "Frames the MIDA data-center partnership as a revenue and services win for the county — additional business-tax revenue plus developer-funded fire/EMS and build-out costs.",
      'Government Transparency & Accountability': "Chaired the May 4 meeting that moved to a remote vote amid a large, hostile crowd; defended the process as legally constrained rather than chosen.",
    },
    stanceCards: [
      { topic: 'Stratos Data Center', icon: '🏗', pos: 'support', issueKey: 'property_rights', issueStance: 'support', text: "Voted yes (3–0) and chaired the approval of the Stratos data-center project area via MIDA, arguing private-property rights and unzoned land left the county no way to block it outright.", source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { topic: 'Great Salt Lake Water', icon: '💧', pos: 'mixed', issueKey: 'water', issueStance: 'mixed', text: "Approved a data center near the Great Salt Lake whose ag-to-industrial water-right change drew 1,500+ protests; accepted the developer's closed-loop cooling assurances.", source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { topic: 'County Revenue', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Frames the MIDA data-center partnership as bringing the county new business-tax revenue plus developer-funded fire/EMS and build-out costs.', source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
    ],
  },

  // ══════════════════ Lee Perry — Commissioner, Seat B (lost primary) ══════════════════
  lee_perry: {
    create: true,
    name: 'Lee Perry',
    office: '🏛 Box Elder County Commission, Seat B',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'lost_primary',
    score: 57,
    keyIssues: ['Growth, Housing & Land Use', 'Property Rights', 'Public Safety', 'Government Transparency'],
    bio: "Lee Perry is a Box Elder County Commissioner holding Seat B, with a four-year term running through the end of 2026. Before the commission he served in the Utah House of Representatives for District 29 (2011–2020) and spent 31 years as a Utah Highway Patrol trooper, retiring as a lieutenant. He lost the June 23, 2026 Republican primary to challenger Nathan Tueller (about 53.3%–46.7%) and has said he will finish his term and then step away from elected office.",
    acctSummary: "A veteran legislator-and-trooper turned commissioner whose record is dominated by his yes vote on the Stratos data center — which he candidly says cost him his seat. He defends it as a property-rights vote forced by the state and private water rights, and he has publicly criticized the rushed process and the way Utah treats counties as 'subsidiaries,' giving him an unusually frank read on his own most controversial decision.",
    theme: "A former lawmaker and 31-year trooper who voted yes on the Stratos data center, openly admits it cost him the 2026 primary, and frames it as a property-rights vote he was powerless to stop rather than one he sought.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_services',
        headline: 'Lost the 2026 GOP primary and tied the defeat directly to the data-center vote',
        facts: "Perry lost the June 23, 2026 Republican primary for Seat B to challenger Nathan Tueller, 4,280 to 3,753 (about 53.3%–46.7%); Tueller is unopposed in November. Asked whether the data-center vote cost him the election, Perry said plainly, 'Do I think that the data center vote cost me the election? Yes I do,' and added that come January he would 'spend a lot more time with my family.'",
        why: "A sitting commissioner repudiated in his own party's primary, who himself attributes the loss to a specific governing vote — a clear, checkable accountability signal.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_rights',
        headline: "Voted yes on Stratos, framing it as 'about personal property rights'",
        facts: "Perry was one of the three unanimous May 4, 2026 votes to let MIDA create the Stratos project area. He cast it as a property-rights decision, saying the vote was 'about personal property rights and whether we can put any guardrails on this issue,' and 'not a vote for or against the data center' itself — arguing the privately owned, water-righted, unzoned land could be developed regardless of what the county wanted.",
        why: "His own framing of the central vote of his tenure, stating the legal logic he says constrained the commission.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements', 'Consistency'], issueKey: 'gov_transparency',
        headline: "Criticized the 'rushed' state process and counties' lack of leverage",
        facts: "After the vote, Perry said his hands were tied — the land was private, under contract, carried its own water rights and was unzoned, so 'I can do nothing to stop it.' He called the process 'rushed,' noting landowners were approached before commissioners even knew, and complained that the state treats counties as 'subsidiaries' with little say when a quasi-government authority like MIDA steps in.",
        why: "A candid transparency critique aimed at the state and the process, from the official who had to cast the vote — useful context on where he says the real decision was made.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-07/utah-project-stratos-box-elder-data-center-county-commissioner-lee-perry' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Red Flags'], issueKey: 'justice_balance',
        headline: 'Placed under police protection at his home after the vote',
        facts: "Amid roughly 600-person protests against the data center, the county increased security at commissioners' homes in early May 2026, with the county attorney's office citing a Utah 'targeted residential picketing' law. Perry said, 'I literally have police officers in front of my house, and that's not fair to me … not fair to my family.' Threats against the three commissioners followed the vote.",
        why: "Documents the climate around the decision and the security response, while raising the question of police resources being used to shield officials during a public-policy dispute.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2026/05/06/utah-data-center-sheriff-boosts/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Behavior'], issueKey: 'campaign_finance',
        headline: "Targeted by an outside, Democrat-funded 'Republican' ad campaign before the primary",
        facts: "In June 2026, Fulcrum Campaigns — run by former Utah Democratic Party staff — spent roughly $11,000 through the Majorities Matter PAC on 'Republicans Against the Stratos Project' mailers targeting Perry and Bingham. Perry called the ads deceptive, and Utah House Speaker Mike Schultz called them 'lies.'",
        why: "Shows outside money helped shape the primary that unseated him, complicating any simple 'pure local grassroots' read of the result.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2026/06/05/utah-democrat-group-funds-republican-ads-to-remove-box-elder-county-commisioners-over-data-center-vote/' } },
    ],
    stances: {
      'Growth, Housing & Land Use': "Voted to approve the Stratos data center, arguing the privately owned, water-righted, unzoned land could be developed regardless of county wishes and that partnering with MIDA was the only way to attach guardrails.",
      'Property Rights': "Frames the data-center vote as fundamentally about personal property rights — the owner's right to develop contracted land — rather than an endorsement of the project itself.",
      'Government Transparency & Accountability': "Publicly criticized the 'rushed' process and the state's treatment of counties as 'subsidiaries,' saying landowners were approached before commissioners knew.",
      'Public Safety': "A 31-year Utah Highway Patrol trooper and former legislator with a long public-safety background informing his work on the commission.",
    },
    stanceCards: [
      { topic: 'Stratos Data Center', icon: '🏗', pos: 'support', issueKey: 'property_rights', issueStance: 'support', text: "Voted yes on the Stratos data center, framing it as 'about personal property rights' and a project the county was powerless to stop, not an endorsement.", source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-04/box-elder-signs-off-on-contentious-data-center-citing-property-rights-and-zoning' } },
      { topic: 'State vs. County Power', icon: '🔍', pos: 'oppose', issueKey: 'gov_transparency', issueStance: 'support', text: "Criticized the 'rushed' MIDA process and said the state treats counties as 'subsidiaries,' with landowners approached before commissioners even knew.", source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-07/utah-project-stratos-box-elder-data-center-county-commissioner-lee-perry' } },
      { topic: 'Accountability for the Vote', icon: '🗳', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: "Lost his 2026 primary to Nathan Tueller and openly conceded the data-center vote cost him the seat: 'Yes I do.'", source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { topic: 'Public Safety Background', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'A 31-year Utah Highway Patrol trooper and former Utah House member (Dist. 29) who brings a public-safety background to the commission.', source: { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/602/Box-Elder-County-Elected-Officials' } },
    ],
  },

  // ══════════════════ Boyd Bingham — Commissioner, Seat A (lost primary) ══════════════════
  boyd_bingham: {
    create: true,
    name: 'Boyd Bingham',
    office: '🏛 Box Elder County Commission, Seat A',
    party: 'Republican', state: 'Utah', icon: '🏛',
    candidacyStatus: 'lost_primary',
    score: 54,
    keyIssues: ['Growth, Housing & Land Use', 'Agriculture & Rural Economy', 'Property Rights', 'Government Transparency'],
    bio: "Boyd Bingham is a Box Elder County Commissioner holding Seat A, with a four-year term running through the end of 2026. A rancher and former Honeyville mayor, he won the seat in 2022. He lost the June 23, 2026 Republican primary to challenger Vance Smith (about 52%–48%); Smith faces an unaffiliated candidate in November.",
    acctSummary: "A rancher-commissioner whose tenure is defined by his yes vote on the Stratos data center, which he defends as legally forced — a 'no' vote, he argued, would only have invited developer lawsuits the county would lose at taxpayer expense. He lost his 2026 primary in the backlash, was placed under police protection after threats, and was also targeted by an outside Democrat-funded ad campaign, leaving a record that is genuinely contested rather than clearly good or bad.",
    theme: "A rancher and former Honeyville mayor who voted yes on the Stratos data center as the least-bad legal option, then lost his 2026 primary in the residents' backlash over it.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Lost the 2026 GOP primary in the data-center backlash',
        facts: "Bingham lost the June 23, 2026 Republican primary for Seat A to challenger Vance Smith, 4,165 to 3,849 (about 52%–48%); Smith advances to face an unaffiliated candidate in November. Bingham conceded graciously, saying, 'I would like to congratulate the incoming leadership … My hope always is for the well-being of Box Elder County.'",
        why: "A sitting commissioner unseated in his party's primary after the county's most divisive vote — a direct accountability outcome.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'property_rights',
        headline: "Voted yes on Stratos, calling a 'no' vote a losing lawsuit",
        facts: "Bingham was one of the three unanimous May 4, 2026 votes to let MIDA create the Stratos project area. He defended it on legal-risk grounds, arguing that a 'no' vote would have invited the developer to sue to force the project through anyway — costing taxpayers — and that MIDA had already blessed the project, leaving the county little real choice.",
        why: "His central justification for the defining vote of his term, framed as protecting taxpayers from litigation rather than endorsing the project.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Red Flags'], issueKey: 'justice_balance',
        headline: 'Placed under police protection after threats against the commissioners',
        facts: "After the May 4 vote, a county employee received a call stating the three commissioners — Bingham, Perry and Vincent — 'should be shot,' and another message said 'all three of you can die.' All three were placed under police protection, and the county increased patrols at their homes amid roughly 600-person protests.",
        why: "Documents the threat climate around the decision; the threats are serious and were directed at him, while the security response itself became part of the controversy.",
        source: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/box-elder-county-commissioners-face-threats-following-vote-on-proposed-ai-data-center/article_405d5388-0f15-44e1-82fc-c48bdac652bf.html' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Behavior'], issueKey: 'campaign_finance',
        headline: "Targeted by an outside, Democrat-funded 'Republican' ad campaign",
        facts: "In June 2026, Fulcrum Campaigns — run by former Utah Democratic Party staff — spent roughly $11,000 through the Majorities Matter PAC on 'Republicans Against the Stratos Project' mailers targeting Bingham (described as 'a rancher') and Perry. Utah House Speaker Mike Schultz called the ads 'lies.'",
        why: "Shows outside money helped shape the primary that unseated him, a fact voters weighing the result should know.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2026/06/05/utah-democrat-group-funds-republican-ads-to-remove-box-elder-county-commisioners-over-data-center-vote/' } },
    ],
    stances: {
      'Growth, Housing & Land Use': "Voted to approve the Stratos data center, arguing a 'no' vote would simply have invited a developer lawsuit the county would lose at taxpayer expense, since MIDA had already approved the project.",
      'Property Rights': "Treats the data-center decision as constrained by the landowner's private property and water rights rather than a discretionary endorsement.",
      'Agriculture & Rural Economy': "A working rancher and former Honeyville mayor whose background is rooted in Box Elder's agricultural, small-town economy.",
      'Government Transparency & Accountability': "Conceded his primary loss graciously and wished the incoming leadership well, but the rushed data-center process drew broad transparency criticism he shared in.",
    },
    stanceCards: [
      { topic: 'Stratos Data Center', icon: '🏗', pos: 'support', issueKey: 'property_rights', issueStance: 'support', text: "Voted yes on the Stratos data center, arguing a 'no' vote would have invited a losing, taxpayer-funded lawsuit since MIDA had already approved it.", source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { topic: 'Primary Accountability', icon: '🗳', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: 'Lost his 2026 primary to Vance Smith in the data-center backlash and conceded graciously, wishing the incoming leadership well.', source: { label: 'KSL', url: 'https://www.ksl.com/article/51538424/box-elder-county-commissioners-who-voted-for-data-center-project-trailing-in-primary-voting' } },
      { topic: 'Rural & Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support', text: "A working rancher and former Honeyville mayor rooted in Box Elder's agricultural, small-town economy.", source: { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/602/Box-Elder-County-Elected-Officials' } },
    ],
  },

  // ══════════════════ Kevin Potter — Sheriff (lost primary) ══════════════════
  kevin_potter: {
    create: true,
    name: 'Kevin Potter',
    office: '🚔 Box Elder County Sheriff',
    party: 'Republican', state: 'Utah', icon: '🚔',
    candidacyStatus: 'lost_primary',
    score: 50,
    keyIssues: ['Public Safety', 'Emergency Dispatch & 911', 'County Budget & Appropriations', 'Government Transparency'],
    bio: "Kevin Potter is the Box Elder County Sheriff, in office since January 2015 and finishing his current term through the end of 2026. He lost the June 23, 2026 Republican primary to one of his own deputies, Mike Allred — by the widest margin of any county race (about 63%–36%) — and is not on the November ballot. His final year in office was dominated by a public fight over emergency dispatch, after the county's three largest police departments moved their 911 dispatch to neighboring Weber County.",
    acctSummary: "A long-tenured sheriff decisively rejected by primary voters amid a no-confidence revolt over emergency dispatch, in which his county's three largest police departments left his communications center for Weber County's and a police chief called his public warnings 'fear-mongering.' His record also includes a genuinely praised crisis response in the August 2025 ambush that killed two Tremonton-Garland officers and wounded the deputy who would go on to defeat him.",
    theme: "A sheriff since 2015 whose final year turned on a dispatch revolt by his own county's largest police forces — and who was then beaten nearly 2-to-1 in his primary by the deputy he'd praised for heroism in the 2025 Tremonton ambush.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: "Lost his primary nearly 2-to-1 — the county's widest margin",
        facts: "Potter lost the June 23, 2026 Republican primary to deputy Mike Allred by the largest margin of any Box Elder County contest: Allred 4,991 votes (about 63%) to Potter 2,976 (about 36%). Overall turnout was 29.23% (8,847 of 30,270 registered); roughly 1,000 ballots remained outstanding, with certification set for July 7, 2026.",
        why: "A sitting sheriff repudiated by nearly two to one in his own party's primary is the clearest accountability signal on his record.",
        source: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/commissioners-sheriff-unseated-in-box-elder-county-primary/article_4a2aff66-5179-46e7-b260-ca57d1e2b2aa.html' } },
      { impact: 'negative', category: 'rhetoric', date: '2026', tags: ['Public Behavior', 'Rhetoric vs Reality'], issueKey: 'gov_services',
        headline: "Police chiefs called his dispatch warnings 'fear-mongering'",
        facts: "In January 2026 the county's largest agencies — led by Brigham City, Tremonton-Garland and Perry — moved their police/fire/EMS dispatch to Weber County, leaving Potter's unified Box Elder Communications Center. Potter posted a lengthy Facebook statement (with comments disabled) warning the split would fracture interoperability, invoking Uvalde, Columbine and 9/11. Tremonton-Garland Chief Chad Reyes called the comparisons 'fear-mongering' and lacking context, and said a data breach had left the county's dispatch running on 'pen and paper for nearly two weeks.'",
        why: "The county's largest police forces publicly declared they trusted Weber County's dispatch over his — a direct vote of no confidence in his operations.",
        source: { label: 'KSLTV', url: 'https://ksltv.com/local-news/box-elder-public-safety/867041/' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: 'Laid out his own case against the dispatch split in an official statement',
        facts: "In a January 13, 2026 message posted by the county, Potter argued the dispatch split would slow response times by adding a 'middleman' relay, erode radio interoperability and create 'resource silos.' He addressed the August 17, 2025 deaths of Sgt. Lee Sorensen and Officer Eric Estrada, insisting dispatch 'did not determine the outcome of that tragedy' and calling blame on dispatchers a 'redirection of responsibility,' and noted other county agencies voted to remain.",
        why: "His own words — the primary record of his governing position on the central public-safety fight of his final year.",
        source: { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/m/newsflash/Home/Detail/65' } },
      { impact: 'positive', category: 'promise', date: '2025', tags: ['Positive Leadership', 'Notable Actions'], issueKey: 'back_police',
        headline: "Office's response to the 2025 Tremonton ambush was widely praised",
        facts: "On August 17, 2025, Tremonton-Garland Sgt. Lee Sorensen and Officer Eric Estrada were killed and Potter's deputy Mike Allred and K-9 Azula were wounded in an ambush at a domestic-violence call. Though shot, Allred took cover and redirected incoming officers away from the line of fire; Potter and his command staff publicly credited the deputy's actions with helping save lives in the deadliest event in recent county history.",
        why: "A genuine positive: his office was at the center of a mass-casualty crisis, and the conduct of his deputies was credited with preventing further deaths.",
        source: { label: 'KUTV', url: 'https://kutv.com/news/local/box-elder-county-deputy-injured-in-tremonton-shooting-announces-candidacy-for-sheriff' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Red Flags'], issueKey: 'justice_balance',
        headline: "County boosted patrols at commissioners' homes during data-center protests",
        facts: "In early May 2026, amid roughly 600-person protests against the Stratos data center, the county increased patrols and security at commissioners' homes, with the county attorney's office citing a pandemic-era Utah 'targeted residential picketing' law. Critics framed it as using law enforcement to shield officials who had just approved an unpopular project; reporting attributed the action to 'the county' and the attorney's office rather than naming the sheriff personally.",
        why: "Deploying patrol resources to protect officials during a property-rights and free-speech flashpoint raises a real line-drawing question, though the attribution to the sheriff specifically is not firmly established.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2026/05/06/utah-data-center-sheriff-boosts/' } },
    ],
    stances: {
      'Public Safety': "Opposed splitting the county's emergency dispatch, warning that routing the three largest agencies through Weber County would slow response times, fracture radio interoperability and create 'resource silos.'",
      'Emergency Dispatch & 911': "Defended the unified Box Elder Communications Center as safer than a 'middleman' relay, but the county's largest police, fire and EMS agencies left it for Weber County's dispatch in 2026.",
      'Government Transparency & Accountability': "Made his case in an official county statement but disabled comments on his Facebook posts, and police chiefs accused him of overstating the risks of the dispatch change.",
      'Crisis Response': "Led the office through the August 2025 Tremonton ambush that killed two area officers and wounded one of his deputies, publicly crediting his deputies' conduct under fire.",
    },
    stanceCards: [
      { topic: 'Emergency Dispatch', icon: '📟', pos: 'oppose', issueKey: 'gov_services', issueStance: 'oppose', text: "Fought the dispatch split, warning it would slow response and break radio interoperability — but the county's three largest agencies left his center for Weber County's.", source: { label: 'KSLTV', url: 'https://ksltv.com/local-news/box-elder-public-safety/867041/' } },
      { topic: 'Primary Accountability', icon: '🗳', pos: 'oppose', issueKey: 'back_police', issueStance: 'mixed', text: "Lost his primary to his own deputy, Mike Allred, by the county's widest margin (about 63%–36%) amid the dispatch revolt.", source: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/commissioners-sheriff-unseated-in-box-elder-county-primary/article_4a2aff66-5179-46e7-b260-ca57d1e2b2aa.html' } },
      { topic: '2025 Tremonton Ambush', icon: '🚔', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Led the office through the deadly August 2025 Tremonton ambush; credited his wounded deputy with redirecting officers away from fire and helping save lives.", source: { label: 'KUTV', url: 'https://kutv.com/news/local/box-elder-county-deputy-injured-in-tremonton-shooting-announces-candidacy-for-sheriff' } },
    ],
  },

  // ══════════════════ Marla Young — County Clerk (elections) ══════════════════
  marla_young: {
    create: true,
    name: 'Marla Young',
    office: '🗳 Box Elder County Clerk',
    party: 'Republican', state: 'Utah', icon: '🗳',
    candidacyStatus: 'incumbent',
    nextElection: '2026-11-03',
    score: 67,
    keyIssues: ['Election Administration', 'Local Government Transparency & Accountability', 'Voter Access'],
    bio: "Marla Young is the Box Elder County Clerk, the official who administers the county's elections, voter registration and public records. She ran the county's high-profile June 2026 primary — the contest that unseated two commissioners and the sheriff — and is herself on the 2026 ballot. Her public role this cycle has centered on reporting results, accounting for outstanding ballots, and urging residents to vote in local races that are often decided in the primary.",
    acctSummary: "A county clerk with a clean, transparency-forward record this cycle: she reported granular ballot accounting (turnout, ballots needing voter cure, provisional ballots and the canvass date) during a charged primary and publicly pressed residents not to sit out local races decided before November. As an elected clerk she administers elections in which she is also a candidate — a structural feature common to the office, not evidence of any wrongdoing found.",
    theme: "The clerk who ran Box Elder's most consequential primary in years — publishing cure and provisional-ballot counts and a canvass date, and reminding voters that local races are often decided in June, not November.",
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Positive Leadership', 'Transparency'], issueKey: 'election_integrity',
        headline: 'Published granular, auditable ballot accounting during a charged primary',
        facts: "For the June 23, 2026 primary, Young's office reported 8,847 ballots cast of 30,270 registered voters (29.23% overall turnout; 37.36% among Republicans), with roughly 1,000 ballots still outstanding — including about 130 that needed voter cure and 23 provisional ballots — and set the official canvass for July 7, 2026. The detail let the public follow how close races (two commission seats and the sheriff) would be finalized.",
        why: "Publishing cure, provisional and canvass detail rather than just topline numbers is concrete election transparency, especially in a contest decided by a few hundred votes.",
        source: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/commissioners-sheriff-unseated-in-box-elder-county-primary/article_4a2aff66-5179-46e7-b260-ca57d1e2b2aa.html' } },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'voting_access',
        headline: 'Urged residents not to skip local races decided in the primary',
        facts: "As results came in, Young reported turnout of about 30% and called it 'pretty typical' for a primary, but said she was surprised it wasn't higher given the stakes: 'This race really determines who their commissioners could be, and their sheriff,' adding that voters 'can't wait just until November' because the closed Republican primaries effectively decided several offices.",
        why: "Active voter education from the official running the election — accurate guidance that local races were being decided then and there.",
        source: { label: 'ABC4 / Yahoo News', url: 'https://www.yahoo.com/news/politics/articles/box-elder-county-commissioners-center-023917933.html' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'], issueKey: 'election_integrity',
        headline: 'Communicated that closed primaries would decide the sheriff and commission seats',
        facts: "Because the contested 2026 sheriff and commission races featured only Republican candidates at the primary stage, Young's office accurately conveyed that those seats would effectively be decided on June 23, with the November ballot a formality in the unopposed contests — matching her public message that voters 'can't wait until November.'",
        why: "Accurately communicating a consequential procedural reality — that a closed primary, not the general election, would pick the officeholders — is a basic but real transparency function.",
        source: { label: 'HJ News / Tremonton Leader', url: 'https://www.hjnews.com/tremonton/news/deputy-allred-running-for-box-elder-county-sheriff/article_a6bab290-336e-418b-a002-eb81d25564e4.html' } },
    ],
    stances: {
      'Election Administration': "Ran the county's high-profile 2026 primary with public, granular ballot accounting — turnout, ballots needing voter cure, provisional ballots and a posted canvass date.",
      'Voter Access': "Publicly urged residents not to sit out local races, noting that closed primaries effectively decided the sheriff and commission seats before the November ballot.",
      'Local Government Transparency & Accountability': "Communicated procedural realities of the election clearly, including which offices would be decided in the primary stage.",
    },
    stanceCards: [
      { topic: 'Transparent Ballot Accounting', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support', text: 'Published turnout, voter-cure and provisional-ballot counts and a posted canvass date during the close, high-profile 2026 primary.', source: { label: 'Cache Valley Daily', url: 'https://www.cachevalleydaily.com/news/commissioners-sheriff-unseated-in-box-elder-county-primary/article_4a2aff66-5179-46e7-b260-ca57d1e2b2aa.html' } },
      { topic: 'Voter Turnout', icon: '📣', pos: 'support', issueKey: 'voting_access', issueStance: 'support', text: "Urged residents not to skip local races, noting the primary — not November — would decide the commissioners and sheriff.", source: { label: 'ABC4 / Yahoo News', url: 'https://www.yahoo.com/news/politics/articles/box-elder-county-commissioners-center-023917933.html' } },
    ],
  },

  // ══════════════════ Stephen Hadfield — County Attorney ══════════════════
  stephen_hadfield: {
    create: true,
    name: 'Stephen Hadfield',
    office: '⚖️ Box Elder County Attorney',
    party: 'Republican', state: 'Utah', icon: '⚖️',
    candidacyStatus: 'office',
    score: 60,
    keyIssues: ['Public Safety & Prosecution', 'Local Government Transparency & Accountability', 'Land Use & Legal Process'],
    bio: "Stephen Hadfield is the Box Elder County Attorney — the county's chief prosecutor and the commission's legal adviser. His tenure this cycle has been shaped by two high-stakes calls: pursuing the death penalty against the man accused of killing two Tremonton-Garland officers in 2025, and rejecting the citizen referendums aimed at overturning the commission's Stratos data-center approval, a decision opponents have sued to challenge.",
    acctSummary: "A county attorney whose record turns on two consequential decisions — a broadly supported capital prosecution in the 2025 officer killings, and a legally grounded but contested rejection of the data-center referendums that critics say he could not impartially decide as the commission's own lawyer. The first reads as competent, deadline-driven prosecution; the second sits at the center of the county's accountability fight and is headed to the courts.",
    theme: "The county's lawyer-prosecutor at the center of two defining calls: seeking the death penalty for the accused Tremonton cop-killer, and rejecting the Stratos referendums as legally non-referable — a decision opponents are suing to overturn.",
    spotlight: [
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_transparency',
        headline: 'Rejected the data-center referendums, inviting the courts to settle it',
        facts: "On May 28, 2026, Hadfield rejected two citizen referendum applications seeking to overturn the Stratos data-center approval, ruling the underlying commission measures were 'administrative actions' — not new legislation — and therefore not legally referable to voters. He wrote that he was 'legally bound to reject' them but welcomed an appeal 'to the state courts for further guidance and resolution.' The county cited revenue projections (from $5.4 million up to $108 million a year) and a roughly $55,000 special-election cost.",
        why: "A county-employed attorney decided whether the public could vote on his own employer's marquee project — opponents who later sued argue he could not impartially decide it, making this the core accountability tension of his tenure.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-28/box-elder-county-rejects-data-center-referendums-but-opponents-arent-giving-up' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'justice_balance',
        headline: 'Filed a capital case in the 2025 killing of two Tremonton-Garland officers',
        facts: "In August 2025, Hadfield's office filed 20 charges against Ryan Michael Bate — including two counts of aggravated murder (capital offenses) for killing Sgt. Lee Sorensen and Officer Eric Estrada and wounding deputy Mike Allred — and filed a notice of intent to seek the death penalty within the statutory window. The office offered condolences and cited Utah's professional-conduct rules in limiting pretrial comment; Gov. Spencer Cox called the death-penalty decision 'very appropriate.'",
        why: "The most consequential prosecutorial decision of his term — a capital case from the killing of two officers — handled within statutory deadlines and with stated restraint on pretrial publicity.",
        source: { label: 'HJ News / Tremonton Leader', url: 'https://www.hjnews.com/tremonton/news/local/prosecution-to-seek-death-penalty-for-alleged-tremonton-shooter-ryan-bate-20-total-charges-filed/article_aac29f1f-88da-40c1-be62-db82aaa422f3.html' } },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Behavior'], issueKey: 'gov_transparency',
        headline: 'Confirmed as the sitting county attorney on the official county roster',
        facts: "The Box Elder County elected-officials roster confirms Stephen Hadfield currently holds the office of County Attorney, anchoring his role as both the commission's legal adviser and the county's chief prosecutor during the 2025–2026 events above.",
        why: "Primary-source confirmation that he is the sitting official making these calls.",
        source: { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/602/Box-Elder-County-Elected-Officials' } },
    ],
    stances: {
      'Local Government Transparency & Accountability': "Rejected the Stratos data-center referendums as 'administrative actions' not subject to voter referendum, saying he was legally bound to do so while inviting the courts to resolve the dispute.",
      'Public Safety & Prosecution': "Pursued a capital case against the man accused of killing two Tremonton-Garland officers in 2025, filing the death-penalty notice within the statutory window.",
      'Land Use & Legal Process': "Advises the commission that the Stratos approval was a legally constrained administrative matter rather than a discretionary policy choice voters could undo.",
    },
    stanceCards: [
      { topic: 'Data-Center Referendums', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "Rejected the Stratos referendums as non-referable 'administrative actions,' saying he was legally bound but inviting a court appeal; opponents sued, questioning his impartiality.", source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-05-28/box-elder-county-rejects-data-center-referendums-but-opponents-arent-giving-up' } },
      { topic: 'Officer-Killing Prosecution', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: 'Filed 20 charges including two capital counts and a death-penalty notice against the accused 2025 Tremonton cop-killer, within the statutory window.', source: { label: 'HJ News / Tremonton Leader', url: 'https://www.hjnews.com/tremonton/news/local/prosecution-to-seek-death-penalty-for-alleged-tremonton-shooter-ryan-bate-20-total-charges-filed/article_aac29f1f-88da-40c1-be62-db82aaa422f3.html' } },
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
  out.push('    // ── Box Elder County sitting officials · Batch 1 (June 2026) ──────────────────');
  out.push('    // First structured Box Elder County pass: the three current commissioners, the');
  out.push('    // sheriff, the clerk and the county attorney. The defining thread is the May 2026');
  out.push('    // unanimous Stratos data-center approval and the primary backlash it triggered.');
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
  console.log(`PolitiDex — Box Elder County deep dive (batch 1: sitting county officials)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

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
    const f = '/tmp/box-elder-county-batch1-stance-block.txt';
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
