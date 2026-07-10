#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// FIFTH rung of the smallest-delegation strategy. Earlier passes added the
// single-seat states (North Dakota, South Dakota), the two-seat states whose
// primaries had closed (Montana, Idaho, Maine), the entire three-seat tier
// (Nebraska, New Mexico), and the four-seat states whose primaries had
// concluded (Iowa, Nevada; Arkansas/Mississippi queued). This pass moves up to
// the FIVE-seat states.
//
// Under the 2020 census apportionment there are exactly TWO five-seat states:
//   Connecticut and Oklahoma.
//
// Per the bottom-up rule we take the five-seat states whose primaries have
// already CONCLUDED in May or June 2026 and where BOTH general-election
// nominees are confirmed:
//   • Oklahoma (primary June 16, 2026) — eligible districts below.
//
// Deferred to a later wave (NOT in this pass):
//   • Connecticut — primary is Aug 11, 2026; nominees not yet set. Excluded
//     for the same reason Kansas (Aug 4 primary) is excluded.
//   • Oklahoma 1st District — OPEN (Kevin Hern ran for U.S. Senate). The
//     11-candidate June 16 Republican primary produced NO majority winner and
//     advanced to the Aug 25, 2026 runoff (Tedford ~32% / Lahmeyer ~26%);
//     the second-place finisher then withdrew, but the Republican nominee is
//     not yet officially settled. Under the project's "confirmed nominees only"
//     rule, OK-01 is held for the next wave until the runoff/withdrawal is
//     formally resolved.
//
// THE FOUR CONFIRMED MATCHUPS COVERED HERE (8 major-party nominees):
//   OK-02  Josh Brecheen (R, incumbent)   vs Brandon Wade (D)
//   OK-03  Frank Lucas (R, incumbent)     vs Suzie Byrd (D)
//   OK-04  Tom Cole (R, incumbent)        vs Mitchell Jacob (D)
//   OK-05  Stephanie Bice (R, incumbent)  vs Jena Nelson (D)
//
// Every district above had its Republican AND Democratic primary resolve
// OUTRIGHT on June 16, 2026 (each incumbent and each Democratic nominee cleared
// 50%, so none of these four races advances to the Aug 25 runoff). Bice was
// unopposed in the Republican primary; the other three incumbents won theirs
// with ~70–79%. The Democratic nominees won contested head-to-head primaries
// (Wade, Byrd) or a two-way race (Jacob), and Nelson won a competitive CD-5
// primary 56.7%–43.3%.
//
// Every record is authored to the same bar as the Utah roster and the prior
// House waves:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in
//     index.html) so the profile lights up Stance at a Glance, the Evidence
//     Locker issue labels, the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general,
//     so each carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection
//     '2026-11-03'.  → Brecheen, Lucas, Cole, Bice
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//       → Wade, Byrd, Jacob, Nelson
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action with a citation —
// never a campaign aspiration. Following the conservative standard set by the
// prior House waves, every promise here is recorded pending: each names a
// specific future legislative OUTCOME not yet achieved. Documented past actions
// (a Farm Bill authorship, an Appropriations chairmanship, a recorded floor
// vote) appear as position EVIDENCE rather than as "kept" promises. Scores
// reflect record DEPTH for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts;
// a candidate's own break from, or alignment with, a position is theirs alone.
// Where a candidate has published no documented stance on an issue, none is
// invented.
//
//   node scripts/add-house-5seat-states-oklahoma-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-5seat-states-oklahoma-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-5seat-states-oklahoma-jun2026.mjs --apply    # create docs in Firestore
//
// Idempotent: a record that already exists is skipped (never clobbered) unless --force.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-24T00:00:00.000Z';

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ OKLAHOMA — 2nd District (incumbent re-election) ══════════════════

  // ---- Josh Brecheen (R, incumbent) vs Brandon Wade (D) ----
  {
    id: 'josh_brecheen', name: 'Josh Brecheen', party: 'Republican', state: 'Oklahoma',
    district: 'Oklahoma — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 56,
    office: '🏛 U.S. Representative — Oklahoma (2nd District)',
    bio: "Josh Brecheen is the U.S. Representative for Oklahoma's 2nd Congressional District, the rural eastern " +
      "Oklahoma seat, in office since 2023. A cattleman from Coalgate, he served in the Oklahoma Senate from 2010 to " +
      "2018, where he was term-limited, and worked as a ranch and agribusiness consultant before his election to " +
      "Congress. He sits on the House Budget Committee and the Homeland Security Committee, where he serves on the " +
      "Border Security and Enforcement Subcommittee, and is a member of the House Freedom Caucus. He won the June 16, " +
      "2026 Republican primary with about 79% and faces Democrat Brandon Wade in November, centering federal " +
      "spending cuts, the national debt, and border security.",
    keyIssues: ['Federal spending', 'National debt', 'Border security', 'Agriculture', 'Taxes'],
    accountability: { overallScore: 56, summary:
      "A second-term congressman, former two-term state senator, and cattleman with a record on the Budget and " +
      "Homeland Security committees centered on spending restraint and border enforcement. The score reflects that " +
      "record and tenure; his forward-looking 2026 pledges are marked pending until acted on." },
    promises: [
      { title: 'Cut federal spending and move toward a balanced budget', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Sits on the House Budget Committee and campaigns on deep cuts to federal spending and a path to a balanced budget.', sources: ['https://brecheen.house.gov/'] },
      { title: 'Reduce the national debt', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Names the national debt a top concern and pledges to press for structural spending reductions.', sources: ['https://www.govtrack.us/congress/members/josh_brecheen/456931'] },
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Serves on the Homeland Security Border Security and Enforcement Subcommittee and campaigns on stronger border enforcement.', sources: ['https://clerk.house.gov/members/B001317'] },
    ],
    positions: [
      { topic: 'Federal Spending', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Sits on the House Budget Committee and campaigns on deep cuts to federal spending.',
        evidence: 'Serves on the House Budget and Homeland Security committees and is a member of the House Freedom Caucus.', source: { label: 'House.gov', url: 'https://brecheen.house.gov/' } },
      { topic: 'National Debt', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Names the national debt a top concern and presses for structural spending reductions.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/josh_brecheen/456931' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Serves on the Homeland Security Border Security and Enforcement Subcommittee and backs stronger border enforcement.', source: { label: 'House Clerk', url: 'https://clerk.house.gov/members/B001317' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'A cattleman from Coalgate who campaigns on agriculture and the rural economy of eastern Oklahoma.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Josh_Brecheen' } },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs lower taxes and a smaller federal footprint as part of his fiscal agenda.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/josh-brecheen/B001317' } },
    ],
  },

  {
    id: 'brandon_wade', name: 'Brandon Wade', party: 'Democratic', state: 'Oklahoma',
    district: 'Oklahoma — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 51,
    office: 'U.S. House — 2026 Democratic Nominee (Oklahoma 2nd District)',
    bio: "Brandon Wade is the Democratic nominee for Oklahoma's 2nd Congressional District, the rural eastern " +
      "Oklahoma seat. A third-generation union worker from Bartlesville, he has spent 26 years with the " +
      "International Union of Operating Engineers Local 351, serving as committee chairman and vice president, and " +
      "is secretary of the Oklahoma Democratic Party Veterans Federation; the son of a Vietnam-era Army veteran, he " +
      "worked as a laborer in the oil industry. He previously ran for this seat in 2024, and won the June 16, 2026 " +
      "Democratic primary with about 74% over Erik Terwey. He faces Rep. Josh Brecheen in November, centering fair " +
      "wages, public schools, and mental-health care.",
    keyIssues: ['Workers & wages', 'Public schools', 'Mental health', 'Immigration reform', 'Veterans'],
    accountability: { overallScore: 51, summary:
      "A longtime union leader and second-time congressional candidate with deep labor-organizing experience but no " +
      "elected record. The score reflects that record depth for the office sought; his congressional pledges are " +
      "marked pending." },
    promises: [
      { title: 'Raise the federal minimum wage', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Advocates raising the minimum wage to $16.00 an hour with annual increases, drawing on his union background.', sources: ['https://brandon4congress.com/'] },
      { title: 'Keep tax dollars in public schools', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Pledges to keep public funding in public schools and to support rural school districts.', sources: ['https://www.cairoklahoma.com/candidates/brandon-wade-2/'] },
      { title: 'Expand mental-health care', verdict: 'pending', issueKey: 'health_mental',
        detail: 'Campaigns on increasing funding for and access to mental-health treatment and support programs.', sources: ['https://ballotpedia.org/Brandon_Wade'] },
    ],
    positions: [
      { topic: 'Workers & Wages', icon: '👷', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A 26-year union leader who backs fair wages, safe workplaces, and raising the minimum wage to $16.00 an hour.',
        evidence: 'Serves as committee chairman and vice president of IUOE Local 351.', source: { label: 'Campaign', url: 'https://brandon4congress.com/' } },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Pledges to keep public funding in public schools and to support rural school districts.', source: { label: 'CAIR Oklahoma', url: 'https://www.cairoklahoma.com/candidates/brandon-wade-2/' } },
      { topic: 'Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'Campaigns on increasing funding for and access to mental-health treatment and support programs.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Brandon_Wade' } },
      { topic: 'Immigration Reform', icon: '🌐', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs comprehensive immigration reform he describes as a more efficient and humane system, emphasizing practical solutions.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Brandon_Wade' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'The son of a Vietnam-era Army veteran and secretary of the Oklahoma Democratic Party Veterans Federation who campaigns on supporting veterans.', source: { label: 'Campaign', url: 'https://brandon4congress.com/' } },
    ],
  },

  // ══════════════════ OKLAHOMA — 3rd District (incumbent re-election) ══════════════════

  // ---- Frank Lucas (R, incumbent) vs Suzie Byrd (D) ----
  {
    id: 'frank_lucas', name: 'Frank Lucas', party: 'Republican', state: 'Oklahoma',
    district: 'Oklahoma — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Oklahoma (3rd District)',
    bio: "Frank Lucas is the U.S. Representative for Oklahoma's 3rd Congressional District, the vast western seat " +
      "covering the panhandle and much of northwestern Oklahoma, in office since a 1994 special election and the " +
      "dean of Oklahoma's congressional delegation. A farmer and rancher from Roger Mills County, he is the most " +
      "senior Republican on the House Agriculture Committee, where he chairs the Subcommittee on Conservation, " +
      "Research, and Biotechnology, and also serves on the House Financial Services Committee; he previously chaired " +
      "the Agriculture Committee — writing the 2014 Farm Bill — and the Science, Space, and Technology Committee. He " +
      "won the June 16, 2026 Republican primary with about 71% and faces Democrat Suzie Byrd in November, centering " +
      "agriculture, rural communities, and scientific research.",
    keyIssues: ['Agriculture', 'Rural communities', 'Scientific research', 'Energy', 'Financial markets'],
    accountability: { overallScore: 64, summary:
      "A long-serving congressman, farmer, and former chairman of both the Agriculture and Science committees with a " +
      "deep legislative record centered on farm policy, rural research, and conservation. The score reflects that " +
      "tenure and record; his forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Support a strong farm safety net and the next Farm Bill', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'The most senior Republican on the Agriculture Committee and author of the 2014 Farm Bill, he campaigns on commodity programs, crop insurance, and conservation for Oklahoma farmers.', sources: ['https://lucas.house.gov/'] },
      { title: 'Advance agricultural research and biotechnology', verdict: 'pending', issueKey: 'tech_innovation',
        detail: 'Chairs the Agriculture Subcommittee on Conservation, Research, and Biotechnology and a former Science Committee chairman who backs federal research investment.', sources: ['https://lucas.house.gov/posts/lucas-to-chair-conservation-subcommittee'] },
      { title: 'Defend rural water and conservation programs', verdict: 'pending', issueKey: 'water',
        detail: 'Campaigns on water infrastructure and conservation for the dry western Oklahoma districts he represents.', sources: ['https://ballotpedia.org/Frank_Lucas'] },
    ],
    positions: [
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'The most senior Republican on the House Agriculture Committee and author of the 2014 Farm Bill, centering commodity programs, crop insurance, and conservation.',
        evidence: 'Wrote the 2014 Farm Bill as Agriculture Committee chairman and chairs the Conservation, Research, and Biotechnology Subcommittee.', source: { label: 'House.gov', url: 'https://lucas.house.gov/' } },
      { topic: 'Scientific Research', icon: '🔬', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'A former chairman of the House Science, Space, and Technology Committee who backs federal investment in agricultural and scientific research.',
        evidence: 'Chaired the Science, Space, and Technology Committee from 2023 before moving to lead an Agriculture research subcommittee.', source: { label: 'House.gov', url: 'https://lucas.house.gov/posts/lucas-to-chair-conservation-subcommittee' } },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs expanded domestic energy production for the oil-, gas-, and wind-rich western Oklahoma district.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Frank_Lucas' } },
      { topic: 'Water & Conservation', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Campaigns on water infrastructure and conservation for the dry western Oklahoma districts he represents.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Frank_Lucas' } },
      { topic: 'Financial Markets', icon: '🏦', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Serves on the House Financial Services Committee and its Capital Markets Subcommittee, focusing on capital formation and markets.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/frank-lucas/L000491' } },
    ],
  },

  {
    id: 'suzie_byrd', name: 'Suzie Byrd', party: 'Democratic', state: 'Oklahoma',
    district: 'Oklahoma — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Democratic Nominee (Oklahoma 3rd District)',
    bio: "Suzie Byrd is the Democratic nominee for Oklahoma's 3rd Congressional District, the vast western seat " +
      "covering the panhandle and northwestern Oklahoma. Raised in Hennessey and a graduate of Oklahoma State " +
      "University, she has owned or been a partner in more than a dozen businesses in Oklahoma and Florida and " +
      "worked as a news reporter for the Enid News & Eagle; she lives in Enid. She won the June 16, 2026 Democratic " +
      "primary with about 67% over Jules Roberson and faces Rep. Frank Lucas in November, running what she calls a " +
      "\"Purple Campaign\" of bipartisanship and centering health care, affordable housing, and government " +
      "accountability.",
    keyIssues: ['Health care', 'Affordable housing', 'Immigration reform', 'Education', 'Government accountability'],
    accountability: { overallScore: 50, summary:
      "A small-business owner and former journalist making her first run for federal office with no elected record. " +
      "The score reflects that record depth for the office sought; her congressional pledges are marked pending." },
    promises: [
      { title: 'Expand access to affordable health care', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Makes broader, more affordable health-care access a central plank of her campaign.', sources: ['https://www.ballotready.org/people/suzie-byrd'] },
      { title: 'Expand affordable housing', verdict: 'pending', issueKey: 'housing_support',
        detail: 'Campaigns on increasing the supply of affordable housing across the rural district.', sources: ['https://www.ballotready.org/people/suzie-byrd'] },
      { title: 'Increase government accountability and bipartisanship', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Frames a "Purple Campaign" centered on working across the aisle and increasing government accountability.', sources: ['https://nondoc.com/2026/06/01/cheat-sheet-democrats-go-head-to-head-in-2nd-3rd-4th-congressional-district-primaries/'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Makes broader, more affordable health-care access a central plank of her campaign.', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/suzie-byrd' } },
      { topic: 'Affordable Housing', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Campaigns on increasing the supply of affordable housing across the rural district.', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/suzie-byrd' } },
      { topic: 'Immigration Reform', icon: '🌐', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs immigration reform as one of her stated priorities.', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/suzie-byrd' } },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Names education reform among her priorities and backs investment in public schools.', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/suzie-byrd' } },
      { topic: 'Government Accountability', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Frames a "Purple Campaign" centered on bipartisanship and increasing government accountability — "people over party."',
        evidence: 'Ran on a bipartisan platform as a businesswoman and former Enid News & Eagle reporter.', source: { label: 'NonDoc', url: 'https://nondoc.com/2026/06/01/cheat-sheet-democrats-go-head-to-head-in-2nd-3rd-4th-congressional-district-primaries/' } },
    ],
  },

  // ══════════════════ OKLAHOMA — 4th District (incumbent re-election) ══════════════════

  // ---- Tom Cole (R, incumbent) vs Mitchell Jacob (D) ----
  {
    id: 'tom_cole', name: 'Tom Cole', party: 'Republican', state: 'Oklahoma',
    district: 'Oklahoma — 4th District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Oklahoma (4th District)',
    bio: "Tom Cole is the U.S. Representative for Oklahoma's 4th Congressional District, the south-central seat " +
      "anchored by Norman, Moore, and Lawton, in office since 2003. Chairman of the House Appropriations Committee " +
      "since April 2024, he is an enrolled member of the Chickasaw Nation, the longest-serving Native American in " +
      "the history of Congress, and the first Native American to chair Appropriations. A former Oklahoma state " +
      "senator, secretary of state, and National Republican Congressional Committee chairman, he has long been " +
      "Republican co-chair of the Congressional Native American Caucus. He won the June 16, 2026 Republican primary " +
      "with about 71% and faces Democrat Mitchell Jacob in November, centering federal appropriations, national " +
      "defense, and tribal and rural priorities.",
    keyIssues: ['Federal appropriations', 'National defense', 'Veterans', 'Agriculture', 'Tribal priorities'],
    accountability: { overallScore: 64, summary:
      "A long-serving congressman and chairman of the House Appropriations Committee with one of the deepest " +
      "legislative and institutional records in the delegation, centered on appropriations, defense, and tribal " +
      "policy. The score reflects that tenure and record; his forward-looking pledges are marked pending until " +
      "acted on." },
    promises: [
      { title: 'Fund the government through regular appropriations', verdict: 'pending', issueKey: 'national_debt',
        detail: 'As Appropriations Committee chairman he campaigns on restoring a regular, on-time appropriations process and fiscal discipline.', sources: ['https://appropriations.house.gov/about/chairman-tom-cole'] },
      { title: 'Sustain a strong national defense', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'A defense hawk whose district includes Fort Sill; he campaigns on robust military funding and readiness.', sources: ['https://cole.house.gov/about/full-biography'] },
      { title: 'Support veterans and military families', verdict: 'pending', issueKey: 'veterans',
        detail: 'Pledges to support veterans and the military community concentrated around Fort Sill in his district.', sources: ['https://cole.house.gov/'] },
    ],
    positions: [
      { topic: 'Federal Appropriations', icon: '📊', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'As chairman of the House Appropriations Committee he campaigns on restoring a regular, on-time appropriations process and fiscal discipline.',
        evidence: 'Elected chairman of the House Appropriations Committee in April 2024 — the first Native American to hold the post.', source: { label: 'Appropriations Committee', url: 'https://appropriations.house.gov/about/chairman-tom-cole' } },
      { topic: 'National Defense', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A defense hawk whose district includes Fort Sill; he campaigns on robust military funding and readiness.', source: { label: 'House.gov', url: 'https://cole.house.gov/about/full-biography' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Pledges to support veterans and the military community concentrated around Fort Sill in his district.', source: { label: 'House.gov', url: 'https://cole.house.gov/' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Backs farm and rural programs for the agricultural communities across south-central Oklahoma.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Tom_Cole_(Oklahoma)' } },
      { topic: 'Tribal Priorities', icon: '🪶', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'An enrolled Chickasaw Nation citizen and Republican co-chair of the Congressional Native American Caucus who advocates for tribal programs and services.',
        evidence: 'The longest-serving Native American in the history of Congress and co-chair of the Native American Caucus since 2009.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tom_Cole' } },
    ],
  },

  {
    id: 'mitchell_jacob', name: 'Mitchell Jacob', party: 'Democratic', state: 'Oklahoma',
    district: 'Oklahoma — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 51,
    office: 'U.S. House — 2026 Democratic Nominee (Oklahoma 4th District)',
    bio: "Mitchell Jacob is the Democratic nominee for Oklahoma's 4th Congressional District, the south-central seat " +
      "anchored by Norman, Moore, and Lawton. A fourth-generation Oklahoman, he served in the U.S. Army from 2017 " +
      "to 2022 as a cryptologic linguist, reaching the rank of sergeant and deploying to southern Syria in support " +
      "of Operation Inherent Resolve. He earned a law degree from the University of Oklahoma in 2025 and works as a " +
      "public defender in Cleveland County through the Oklahoma Indigent Defense System. He ran for the Oklahoma " +
      "House in 2024 and won the June 16, 2026 Democratic primary with about 54% over Jeff Pixley. He faces Rep. Tom " +
      "Cole in November, centering the national debt, education, health care, and a refusal of PAC money.",
    keyIssues: ['National debt', 'Education', 'Health care', 'Immigration reform', 'Campaign finance'],
    accountability: { overallScore: 51, summary:
      "An Army veteran, public defender, and first-time congressional candidate with prior campaign experience but " +
      "no elected record. The score reflects that record depth for the office sought; his congressional pledges are " +
      "marked pending." },
    promises: [
      { title: 'Address the national debt', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Frames the rising national debt as the biggest long-term threat and campaigns on fiscally responsible solutions.', sources: ['https://www.mitchelljacob.com/'] },
      { title: 'Refuse PAC money', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Runs a grassroots campaign and pledges not to accept PAC money, relying on individual donors and volunteers.', sources: ['https://www.mitchelljacob.com/'] },
      { title: 'Invest in quality public education', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Names quality education a top priority and pledges to invest in public schools.', sources: ['https://ballotpedia.org/Mitchell_Jacob'] },
    ],
    positions: [
      { topic: 'National Debt', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Frames the rising national debt as the biggest long-term threat and campaigns on fiscally responsible solutions.',
        evidence: 'An Army veteran and Cleveland County public defender making the debt the centerpiece of his platform.', source: { label: 'Campaign', url: 'https://www.mitchelljacob.com/' } },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Names quality education a top priority and pledges to invest in public schools.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Mitchell_Jacob' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on expanding access to health care.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Mitchell_Jacob' } },
      { topic: 'Immigration Reform', icon: '🌐', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs what he calls cruelty-free, humane immigration reform.', source: { label: 'Campaign', url: 'https://www.mitchelljacob.com/' } },
      { topic: 'Campaign Finance', icon: '🚫', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Pledges not to accept PAC money, running a grassroots campaign of individual donors and volunteers.', source: { label: 'Campaign', url: 'https://www.mitchelljacob.com/' } },
    ],
  },

  // ══════════════════ OKLAHOMA — 5th District (incumbent re-election) ══════════════════

  // ---- Stephanie Bice (R, incumbent) vs Jena Nelson (D) ----
  {
    id: 'stephanie_bice', name: 'Stephanie Bice', party: 'Republican', state: 'Oklahoma',
    district: 'Oklahoma — 5th District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Oklahoma (5th District)',
    bio: "Stephanie Bice is the U.S. Representative for Oklahoma's 5th Congressional District, the Oklahoma City-area " +
      "seat, in office since 2021 and the first American of Iranian descent elected to Congress. A former Oklahoma " +
      "state senator from 2014 to 2020 and a small-business background in her family's technology company, she " +
      "serves on the House Appropriations Committee — as vice chair of its Transportation, Housing and Urban " +
      "Development Subcommittee and on the Military Construction–Veterans Affairs and Labor-HHS subcommittees — and " +
      "on the Committee on House Administration, where she chairs the Modernization and Innovation Subcommittee. A " +
      "member of the Republican Main Street Caucus, she considered a 2026 U.S. Senate bid before announcing on March " +
      "13, 2026 that she would seek re-election. Unopposed in the June 16, 2026 Republican primary, she faces " +
      "Democrat Jena Nelson in November, centering taxes, transportation and military funding, and modernizing " +
      "Congress.",
    keyIssues: ['Taxes', 'Veterans & military construction', 'Infrastructure', 'Government modernization', 'National defense'],
    accountability: { overallScore: 60, summary:
      "A multi-term congresswoman and former state senator with a record on the Appropriations and House " +
      "Administration committees centered on transportation, military construction, and modernizing House " +
      "operations. The score reflects that legislative depth; her forward-looking pledges are marked pending until " +
      "acted on." },
    promises: [
      { title: 'Extend and protect tax relief', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Voted for the 2025 tax-and-budget reconciliation law and campaigns on extending tax relief.', sources: ['https://bice.house.gov/'] },
      { title: 'Fund military construction and veterans programs', verdict: 'pending', issueKey: 'veterans',
        detail: 'Sits on the Appropriations Military Construction–Veterans Affairs Subcommittee and pledges to fund veterans and military facilities.', sources: ['https://bice.house.gov/about/committees'] },
      { title: 'Modernize how Congress operates', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Chairs the House Administration Modernization and Innovation Subcommittee and campaigns on making Congress more efficient and transparent.', sources: ['https://bice.house.gov/about/committees'] },
    ],
    positions: [
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the 2025 tax-and-budget reconciliation law and campaigns on extending tax relief.',
        evidence: 'Recorded a yes vote on the 2025 reconciliation package, which passed the House 215-214.', source: { label: 'House.gov', url: 'https://bice.house.gov/' } },
      { topic: 'Veterans & Military Construction', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Sits on the Appropriations Military Construction–Veterans Affairs Subcommittee and pledges to fund veterans and military facilities.', source: { label: 'House.gov', url: 'https://bice.house.gov/about/committees' } },
      { topic: 'Infrastructure & Transportation', icon: '🛣', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Serves as vice chair of the Appropriations Transportation, Housing and Urban Development Subcommittee, focusing on transportation and infrastructure funding.', source: { label: 'House.gov', url: 'https://bice.house.gov/about/committees' } },
      { topic: 'Government Modernization', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Chairs the House Administration Modernization and Innovation Subcommittee and campaigns on making Congress more efficient.', source: { label: 'House.gov', url: 'https://bice.house.gov/about/committees' } },
      { topic: 'National Defense', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Backs a strong national defense and funding for the armed forces.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Stephanie_Bice' } },
    ],
  },

  {
    id: 'jena_nelson', name: 'Jena Nelson', party: 'Democratic', state: 'Oklahoma',
    district: 'Oklahoma — 5th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 54,
    office: 'U.S. House — 2026 Democratic Nominee (Oklahoma 5th District)',
    bio: "Jena Nelson is the Democratic nominee for Oklahoma's 5th Congressional District, the Oklahoma City-area " +
      "seat that stretches north to Guthrie and southeast to Shawnee and Seminole. An educator for more than 16 " +
      "years, she was named Oklahoma Teacher of the Year in 2020 and ran statewide for State Superintendent of " +
      "Public Instruction in 2022, earning 43% — the highest share of any Democrat on the statewide ballot that " +
      "year. She won the June 16, 2026 Democratic primary with about 57% over union president Trey Martin and faces " +
      "Rep. Stephanie Bice in November, centering public education, Social Security and Medicare, and strengthening " +
      "the middle class.",
    keyIssues: ['Public education', 'Social Security & Medicare', 'Middle class', 'Health care', 'Good government'],
    accountability: { overallScore: 54, summary:
      "A longtime educator and former statewide candidate with significant campaign experience and public profile " +
      "but no elected record. The score reflects that record depth for the office sought; her congressional pledges " +
      "are marked pending." },
    promises: [
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Names protecting Social Security and Medicare a top priority and pledges to oppose cuts to them and to Medicaid.', sources: ['https://jenanelson.com/about/'] },
      { title: 'Invest in public schools and teachers', verdict: 'pending', issueKey: 'public_schools',
        detail: 'A former Oklahoma Teacher of the Year who pledges to invest in public schools and support teachers.', sources: ['https://jenanelson.com/about/'] },
      { title: 'Strengthen the middle class', verdict: 'pending', issueKey: 'tax_middle_class',
        detail: 'Lists strengthening the middle class among her top campaign priorities.', sources: ['https://nondoc.com/2026/06/17/jena-nelson-wins-cd-5-dems-nomination-incumbents-sweep-oklahoma-congressional-primaries/'] },
    ],
    positions: [
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former Oklahoma Teacher of the Year who centers investment in public schools and respect for teachers — "if you want to see better outcomes in your classroom, invest in your teachers."',
        evidence: 'Named Oklahoma Teacher of the Year in 2020 and ran statewide for State Superintendent in 2022.', source: { label: 'Campaign', url: 'https://jenanelson.com/about/' } },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Names protecting Social Security and Medicare a top priority and pledges to oppose cuts to them and to Medicaid.', source: { label: 'Campaign', url: 'https://jenanelson.com/about/' } },
      { topic: 'Middle Class', icon: '🛒', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Lists strengthening the middle class among her top campaign priorities.', source: { label: 'NonDoc', url: 'https://nondoc.com/2026/06/17/jena-nelson-wins-cd-5-dems-nomination-incumbents-sweep-oklahoma-congressional-primaries/' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Points to personal experience with the health-care system and opposes cuts to Medicaid coverage.', source: { label: 'NonDoc', url: 'https://nondoc.com/2026/06/04/cd-5-democratic-primary-trey-martin-jena-nelson-fight-for-right-to-face-bice/' } },
      { topic: 'Good Government', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Lists "restoring good government" among her core campaign priorities.', source: { label: 'Campaign', url: 'https://jenanelson.com/about/' } },
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

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build the full Firestore document body for one person.
function buildDoc(p) {
  const kept = p.promises.filter(x => x.verdict === 'kept').length;
  const broken = p.promises.filter(x => x.verdict === 'broken').length;
  const pending = p.promises.filter(x => x.verdict === 'pending').length;

  // stances map (topic → text) mirrors the ISSUE_STANCE_DATA cards.
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;

  const promises = p.promises.map(pr => ({
    title: pr.title,
    detail: pr.detail,
    verdict: pr.verdict,
    issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));

  const fields = {
    name: p.name,
    office: p.office,
    party: p.party,
    state: p.state,
    icon: p.icon,
    bio: p.bio,
    keyIssues: p.keyIssues,
    promises,
    stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending,
    score: p.score,
    tier: tierForScore(p.score),
    profileStatus: 'full',
    candidacyStatus: p.candidacyStatus,
    nextElection: p.nextElection,
    updatedAt: STAMP,
  };
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}

async function exists(id) {
  const r = await fetch(`${BASE}/${id}`);
  return r.ok;
}
async function createDoc(id, fields) {
  // PATCH with no updateMask creates the document with the provided fields.
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── U.S. House expansion · five-seat states, both nominees set (June 2026) ────');
  out.push('    // Bottom-up by delegation size, pass five (five-seat tier): Oklahoma, whose');
  out.push('    // primary CLOSED June 16, 2026. Covers the four districts whose Republican AND');
  out.push('    // Democratic primaries resolved outright — OK-02, OK-03, OK-04, OK-05. OK-01 is');
  out.push('    // open (Hern → Senate) and its GOP primary went to the Aug 25 runoff, so it is');
  out.push('    // held for a later wave; Connecticut (Aug 11 primary) is likewise deferred.');
  out.push("    // Each card is keyed to an ISSUE_MAP issue so the profile is comparable in the");
  out.push("    // Alignment Tool and joins Stance at a Glance, the Evidence Locker, and the People's Mandate.");
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.detail) parts.push(`detail:'${esc(c.detail)}'`);
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — U.S. House five-seat-states expansion (Oklahoma)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/house-5seat-oklahoma-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${fields.kept}K/${fields.broken}B/${fields.pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Created/updated' : 'Would create'} ${PEOPLE.length} records.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html block, --apply to write Firestore.');
})();
