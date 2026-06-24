#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// FIFTH pass of the smallest-delegation strategy, and the one that CLOSES OUT
// the four-seat tier. Earlier passes added the single-seat states (North Dakota,
// South Dakota), the eligible two-seat states (Montana, Idaho, Maine), the entire
// three-seat tier (Nebraska, New Mexico), and the four-seat states whose primaries
// closed in May/June (Iowa, Nevada). Utah's four-seat delegation is the project's
// anchor roster and was already covered.
//
// Under the 2020 census apportionment there are exactly six four-seat states:
//   Arkansas, Iowa, Kansas, Mississippi, Nevada, Utah.
//
// The prior four-seat wave (add-house-4seat-states-jun2026.mjs) explicitly QUEUED
// Arkansas and Mississippi for "the next four-seat wave": their primaries closed in
// MARCH 2026, eligible but outside that file's May/June priority window. This file is
// that next wave. It adds BOTH remaining four-seat states, leaving only Kansas — whose
// primary is Aug 4, 2026 and whose nominees are NOT yet set — to finish the tier.
//
//   • Arkansas      (primary March 3, 2026)  — AR-01, AR-02, AR-03, AR-04
//   • Mississippi   (primary March 10, 2026) — MS-01, MS-02, MS-03, MS-04
//
// Excluded by the bottom-up rule (NOT in this pass):
//   • Kansas — primary Aug 4, 2026; nominees not yet set.
//   • Any 5+ seat state; all Senate and gubernatorial races.
//
// THE EIGHT CONFIRMED MATCHUPS COVERED HERE (16 nominees):
//   AR-01  Rick Crawford (R, incumbent) vs Terri Yarbrough Green (D)
//   AR-02  French Hill (R, incumbent) vs Chris Jones (D)
//   AR-03  Steve Womack (R, incumbent) vs Robb Ryerse (D)
//   AR-04  Bruce Westerman (R, incumbent) vs James "Rus" Russell (D)
//   MS-01  Trent Kelly (R, incumbent) vs Cliff Johnson (D)
//   MS-02  Bennie Thompson (D, incumbent) vs Ron Eller (R)
//   MS-03  Michael Guest (R, incumbent) vs Michael Chiaradio (D)
//   MS-04  Mike Ezell (R, incumbent) vs Jeffrey Hulum III (D)
//
// Every district above has BOTH major-party nominees confirmed for November as of
// June 24, 2026. Arkansas's March 3 primaries (with March 31 runoffs available) and
// Mississippi's March 10 primaries (with April 7 runoffs available) are concluded;
// no district here is awaiting a runoff. Some districts also carry minor-party or
// independent candidates on the November ballot (e.g. Libertarians in several Arkansas
// districts, independents Bennie Foster in MS-02 and Carl Boyanton in MS-04); per the
// project rule only the two major-party nominees are authored here.
//
// Every record is authored to the same bar as the Utah roster and the prior House waves:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP issueKey
//     (validated below against the live 86-key vocabulary in index.html) so the profile
//     lights up Stance at a Glance, the Evidence Locker issue labels, the People's
//     Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general, so each
//     carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection '2026-11-03'.
//       → Crawford, Hill, Womack, Westerman, Kelly, Thompson, Guest, Ezell
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//       → Green, Jones, Ryerse, Russell, Johnson, Eller, Chiaradio, Hulum
//   Note: in Mississippi's 2nd District the incumbent (Thompson) is the Democrat and the
//   challenger (Eller) is the Republican — the only district in this wave where the
//   incumbent is not a Republican.
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when it maps
// to an unambiguous, documented, completed action with a citation — never a campaign
// aspiration. Following the conservative standard set by the prior House waves, every
// promise here is recorded pending: each names a specific future legislative OUTCOME not
// yet achieved. Documented incumbent achievements (enacted bills, committee chairmanships)
// are reflected in the bio, the issue positions, and the record-depth score instead.
// Scores reflect record DEPTH for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or pledges —
// never their party. Vote tallies/outcomes are stated as plain facts; a candidate's own
// break from, or alignment with, a position is theirs alone. Where a candidate has
// published no documented stance on an issue, none is invented.
//
//   node scripts/add-house-4seat-states-arkansas-mississippi-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-4seat-states-arkansas-mississippi-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-4seat-states-arkansas-mississippi-jun2026.mjs --apply    # create docs in Firestore
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

  // ══════════════════ ARKANSAS — 1st District (incumbent re-election) ══════════════════

  // ---- Rick Crawford (R, incumbent) vs Terri Yarbrough Green (D) ----
  {
    id: 'rick_crawford', name: 'Rick Crawford', party: 'Republican', state: 'Arkansas',
    district: 'Arkansas — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Arkansas (1st District)',
    bio: "Rick Crawford is the U.S. Representative for Arkansas's 1st Congressional District, the largely rural " +
      "northeastern district anchored by Jonesboro, in office since 2011. A former U.S. Army explosive ordnance " +
      "disposal technician and a farm broadcaster who built the AgWatch agricultural radio network, he chairs the " +
      "House Permanent Select Committee on Intelligence and sits on the House Agriculture Committee. He ran " +
      "unopposed in the March 3, 2026 Republican primary and faces Democrat Terri Yarbrough Green in November, " +
      "centering farm policy, national security, and border enforcement.",
    keyIssues: ['Agriculture', 'National security', 'Border security', 'Tax relief', 'Second Amendment'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman, Army EOD veteran, and former farm broadcaster who chairs the House Intelligence " +
      "Committee and sits on Agriculture. The score reflects that legislative and committee depth; his forward-looking " +
      "pledges are marked pending until acted on." },
    promises: [
      { title: 'Sustain strong southern-border enforcement', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs continued funding to complete border barriers and add Border Patrol agents.', sources: ['https://crawford.house.gov/posts/crawford-votes-to-deliver-historic-tax-cuts-for-middle-class-working-americans'] },
      { title: 'Advance farm-credit and risk-management priorities', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Uses his Agriculture Committee seat to advance commodity, crop-insurance, and farm-credit policy for Arkansas growers.', sources: ['https://en.wikipedia.org/wiki/Rick_Crawford_(politician)'] },
    ],
    positions: [
      { topic: 'Tax Relief', icon: '💸', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Voted for the 2025 tax law, saying he "proudly voted to preserve the largest tax cut in history for working and middle-class Americans."', source: { label: 'House.gov', url: 'https://crawford.house.gov/posts/crawford-votes-to-deliver-historic-tax-cuts-for-middle-class-working-americans' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Voted for H.R. 2, the Secure the Border Act of 2023, to strengthen enforcement at the southern border.', source: { label: 'House.gov', url: 'https://crawford.house.gov/posts/rep-crawford-votes-to-defend-our-southern-border-as-title-42-lapse-causes-chaos' } },
      { topic: 'National Security', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'As chairman of the House Intelligence Committee, issued a statement supporting U.S. legal strikes on narco-terrorists following a December 2025 briefing.',
        evidence: 'An Army explosive ordnance disposal veteran who served 1985–1989.', source: { label: 'House Intelligence Committee', url: 'https://intelligence.house.gov/2025/12/04/chairman-crawford-statement-following-briefing-on-legal-strikes-on-narco-terrorists/' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Voted against the Bipartisan Background Checks Act (H.R. 8) in 2019 and 2021, opposing expanded firearm background-check requirements.', source: { label: 'OnTheIssues', url: 'https://www.ontheissues.org/House/Rick_Crawford_Gun_Control.htm' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Serves on the House Agriculture Committee, focusing on farm commodities, risk management, and credit for crop producers.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Rick_Crawford_(politician)' } },
    ],
  },

  {
    id: 'terri_green', name: 'Terri Yarbrough Green', party: 'Democratic', state: 'Arkansas',
    district: 'Arkansas — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Arkansas 1st District)',
    bio: "Terri Yarbrough Green is the Democratic nominee for Arkansas's 1st Congressional District, the rural " +
      "northeastern seat anchored by Jonesboro. A retired, board-certified pathologist and former laboratory " +
      "medical director from Paragould who served rural hospitals, she earned a bachelor's degree from Baylor " +
      "University. She advanced from the March 3, 2026 Democratic primary unopposed after being the only Democrat " +
      "to file, saying voters \"deserve a voice and a choice.\" She faces Rep. Rick Crawford in November, centering " +
      "affordable health care, the cost of living, and reducing the influence of money in politics.",
    keyIssues: ['Affordable health care', 'Cost of living', 'Campaign finance', 'Family farms'],
    accountability: { overallScore: 48, summary:
      "A retired pathologist and first-time candidate for federal office. She has no legislative voting record, so " +
      "her positions are campaign pledges and are marked pending; the score reflects that thinner record for the " +
      "office sought." },
    promises: [
      { title: 'Make health care affordable and accessible', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Pledges to work toward accessible, affordable care so illness does not bankrupt families and rural patients have nearer maternity care.', sources: ['https://www.terrigreenforarkansas.com/'] },
      { title: 'Get dark money out of politics', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Pledges to push for campaign-finance reform and "free, fair, transparent elections where every vote counts."', sources: ['https://www.terrigreenforarkansas.com/'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Calls for accessible, affordable health care, warning that getting sick should not mean "going broke" and that women should not have to travel hours for maternity care.', source: { label: 'Campaign', url: 'https://www.terrigreenforarkansas.com/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Supports raising the minimum wage "so work actually pays," arguing families should not work themselves to exhaustion just to survive.', source: { label: 'Campaign', url: 'https://www.terrigreenforarkansas.com/' } },
      { topic: 'Campaign Finance', icon: '💵', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Pledges to "get dark money out of politics," arguing that when billionaires and special interests can buy influence, regular people lose their voice.', source: { label: 'Campaign', url: 'https://www.terrigreenforarkansas.com/' } },
      { topic: 'Family Farms', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Says she supports family farms while pushing back on big agricultural monopolies.', source: { label: 'Campaign', url: 'https://www.terrigreenforarkansas.com/' } },
    ],
  },

  // ══════════════════ ARKANSAS — 2nd District (incumbent re-election) ══════════════════

  // ---- French Hill (R, incumbent) vs Chris Jones (D) ----
  {
    id: 'french_hill', name: 'French Hill', party: 'Republican', state: 'Arkansas',
    district: 'Arkansas — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Arkansas (2nd District)',
    bio: "French Hill is the U.S. Representative for Arkansas's 2nd Congressional District, the central seat " +
      "including most of Little Rock, in office since 2015. A former banker who founded and chaired Delta Trust & " +
      "Bank and served as a deputy assistant secretary of the U.S. Treasury, he became chairman of the House " +
      "Financial Services Committee in January 2025. He won the March 3, 2026 Republican primary with about 77% " +
      "over Chase McDowell and faces Democrat Chris Jones in November, centering banking and financial policy, " +
      "tax relief, and border security.",
    keyIssues: ['Financial services', 'Tax relief', 'Border security', 'Pro-life policy', 'Deregulation'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman and former bank founder who chairs the House Financial Services Committee. The score " +
      "reflects that legislative and committee depth; his forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Lead a deregulatory Financial Services agenda', verdict: 'pending', issueKey: 'gov_regulation',
        detail: 'As committee chairman, has pursued rolling back financial regulations, including repealing Corporate Transparency Act shell-company disclosure requirements.', sources: ['https://en.wikipedia.org/wiki/French_Hill_(politician)'] },
      { title: 'Continue strengthening border security', verdict: 'pending', issueKey: 'border_security',
        detail: 'Frames his border votes as securing the southwest border and backs continued border-enforcement legislation.', sources: ['https://www.govtrack.us/congress/votes/118-2023/h209'] },
    ],
    positions: [
      { topic: 'Tax Relief', icon: '💸', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the Tax Cuts and Jobs Act of 2017.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/French_Hill_(politician)' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Voted for H.R. 2, the Secure the Border Act of 2023, which passed the House 219-213 on May 11, 2023.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/votes/118-2023/h209' } },
      { topic: 'Financial Regulation', icon: '🏦', pos: 'oppose', issueKey: 'gov_regulation', issueStance: 'oppose',
        text: 'In 2025 sponsored legislation to rescind a CFPB rule capping bank overdraft fees at $5.',
        evidence: 'Chairs the House Financial Services Committee.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/French_Hill_(politician)' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Identifies as pro-life, voted for the Pain-Capable Unborn Child Protection Act, and supported overturning Roe v. Wade in 2022.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/French_Hill_(politician)' } },
      { topic: 'Health Care', icon: '🏥', pos: 'oppose', issueKey: 'healthcare_market', issueStance: 'oppose',
        text: 'On May 4, 2017, voted to repeal the Affordable Care Act and pass the American Health Care Act.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/French_Hill_(politician)' } },
    ],
  },

  {
    id: 'chris_jones', name: 'Chris Jones', party: 'Democratic', state: 'Arkansas',
    district: 'Arkansas — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Democratic Nominee (Arkansas 2nd District)',
    bio: "Chris Jones is the Democratic nominee for Arkansas's 2nd Congressional District, the central seat " +
      "including most of Little Rock. A nuclear engineer and physicist who holds a Ph.D. from MIT and an ordained " +
      "minister, he previously led the Arkansas Regional Innovation Hub and was the 2022 Democratic nominee for " +
      "governor of Arkansas. He won the March 3, 2026 Democratic primary with about 92% over Zack Huffman and " +
      "faces Rep. French Hill in November, centering the cost of living, health care and rural hospitals, jobs, " +
      "and early education.",
    keyIssues: ['Cost of living', 'Health care', 'Rural hospitals', 'Schools & training', 'Democracy'],
    accountability: { overallScore: 52, summary:
      "A nuclear engineer, nonprofit leader, and former statewide nominee making his first run for federal office. " +
      "He has no congressional voting record, so his positions are campaign pledges and are marked pending; the " +
      "score reflects that record depth for the office sought." },
    promises: [
      { title: 'Protect the ACA and keep rural hospitals open', verdict: 'pending', issueKey: 'health_rural',
        detail: 'Pledges to defend the Affordable Care Act and its subsidies and to fight to keep rural Arkansas hospitals from closing.', sources: ['https://arkansasadvocate.com/2026/02/19/arkansas-u-s-house-primary-challengers-focus-on-education-health-care-cost-of-living/'] },
      { title: 'Build an economy that lifts every community', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Pledges to pursue good jobs, fair wages, small-business growth, and expanded internet access so Arkansas gets its share of federal dollars.', sources: ['https://chrisjonesforcongress.com/'] },
      { title: 'Expand opportunity through schools and apprenticeships', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Pledges to invest in early childhood education, hands-on apprenticeships, and trade and technology training.', sources: ['https://chrisjonesforcongress.com/'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Says he supports the Affordable Care Act and the ACA subsidies that Congress did not extend at the end of 2025.', source: { label: 'Arkansas Advocate', url: 'https://arkansasadvocate.com/2026/02/19/arkansas-u-s-house-primary-challengers-focus-on-education-health-care-cost-of-living/' } },
      { topic: 'Rural Hospitals', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Makes keeping rural hospitals open a central plank, criticizing votes that "would close rural hospitals."', source: { label: 'Arkansas Advocate', url: 'https://arkansasadvocate.com/2026/02/19/arkansas-u-s-house-primary-challengers-focus-on-education-health-care-cost-of-living/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers his campaign on affordability, arguing the prices of housing, health care, groceries, and utilities are too high for average Arkansans.', source: { label: 'Arkansas Advocate', url: 'https://arkansasadvocate.com/2026/02/19/arkansas-u-s-house-primary-challengers-focus-on-education-health-care-cost-of-living/' } },
      { topic: 'Early Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Platform calls for investing in early childhood education, apprenticeships, and training in technology and the trades.', source: { label: 'Campaign', url: 'https://chrisjonesforcongress.com/' } },
      { topic: 'Democracy', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Supports "fair maps, secure and accessible elections, a government you can trust, and leaders who listen."', source: { label: 'Campaign', url: 'https://chrisjonesforcongress.com/' } },
    ],
  },

  // ══════════════════ ARKANSAS — 3rd District (incumbent re-election) ══════════════════

  // ---- Steve Womack (R, incumbent) vs Robb Ryerse (D) ----
  {
    id: 'steve_womack', name: 'Steve Womack', party: 'Republican', state: 'Arkansas',
    district: 'Arkansas — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Arkansas (3rd District)',
    bio: "Steve Womack is the U.S. Representative for Arkansas's 3rd Congressional District, the northwest seat " +
      "covering Benton, Washington, and Sebastian counties, in office since 2011. A 30-year Arkansas Army National " +
      "Guard officer who retired as a colonel and the former mayor of Rogers, he is a senior member of the House " +
      "Appropriations Committee and previously chaired the House Budget Committee. His Republican primary was " +
      "canceled and he advanced unopposed; he faces Democrat Robb Ryerse in November, centering the federal budget, " +
      "national defense, and border security.",
    keyIssues: ['Federal budget', 'Appropriations', 'Border security', 'Tax relief', 'Pro-life policy'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman, retired National Guard colonel, and former mayor with a senior Appropriations " +
      "seat and a past Budget Committee chairmanship. The score reflects that legislative and committee depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Advance fiscal restraint in appropriations', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Pledges to use his Appropriations seat to restrain wasteful spending while funding national defense.', sources: ['https://womack.house.gov/news/documentsingle.aspx?DocumentID=405302'] },
      { title: 'Strengthen border security', verdict: 'pending', issueKey: 'border_security',
        detail: 'Pledges to continue securing the southern border and funding enforcement.', sources: ['https://womack.house.gov/news/documentsingle.aspx?DocumentID=399906'] },
      { title: 'Secure funding for 3rd District priorities', verdict: 'pending', issueKey: 'infrastructure',
        detail: 'Pledges to direct federal appropriations toward northwest Arkansas district priorities.', sources: ['https://womack.house.gov/news/documentsingle.aspx?DocumentID=405302'] },
    ],
    positions: [
      { topic: 'Federal Budget', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Has proposed a balanced-budget amendment and favored spending restraint, opposing increases to the debt limit.',
        evidence: 'Previously chaired the House Budget Committee.', source: { label: 'OnTheIssues', url: 'https://ontheissues.org/House/Steve_Womack.htm' } },
      { topic: 'Tax Relief', icon: '💸', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the 2017 Tax Cuts and Jobs Act and signed the Taxpayer Protection Pledge, favoring spending cuts over tax increases.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Steve_Womack' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports continued border-barrier construction and has voted for appropriations funding border security and enforcement.', source: { label: 'House.gov', url: 'https://womack.house.gov/news/documentsingle.aspx?DocumentID=399906' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Opposes new restrictions on firearm purchase and possession and voted against expanded background checks for private transfers.', source: { label: 'OnTheIssues', url: 'https://ontheissues.org/House/Steve_Womack.htm' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Has a pro-life voting record, supports the Hyde Amendment barring federal abortion funding, and backed protections for infants who survive abortion.', source: { label: 'OnTheIssues', url: 'https://ontheissues.org/House/Steve_Womack.htm' } },
    ],
  },

  {
    id: 'robb_ryerse', name: 'Robb Ryerse', party: 'Democratic', state: 'Arkansas',
    district: 'Arkansas — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Arkansas 3rd District)',
    bio: "Robb Ryerse is the Democratic nominee for Arkansas's 3rd Congressional District, the northwest seat " +
      "anchored by Fayetteville, Bentonville, and Fort Smith. A pastor and nonprofit leader from Springdale who " +
      "co-founded Vintage Fellowship church, he first ran for this seat in 2018 as a Republican before later " +
      "working with the faith-and-politics group Vote Common Good. His 2026 Democratic primary was canceled and he " +
      "advanced as the party's nominee; he faces Rep. Steve Womack in November, centering health care, working-family " +
      "economics, reproductive freedom, and voting rights.",
    keyIssues: ['Health care', 'Working families', 'Reproductive freedom', 'Voting rights', 'Public schools'],
    accountability: { overallScore: 48, summary:
      "A pastor and nonprofit leader making his first run for federal office as a Democrat. He has no legislative " +
      "voting record, so his positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought." },
    promises: [
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Pledges to protect Social Security, strengthen Medicare and Medicaid, and guarantee paid leave.', sources: ['https://www.robbforcongress.com/our-values'] },
      { title: 'Lower the cost of living', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Pledges to lower housing costs and ease everyday expenses for working families.', sources: ['https://www.robbforcongress.com/our-values'] },
      { title: 'Defend separation of church and state', verdict: 'pending', issueKey: 'religious_liberty',
        detail: 'Pledges to protect the freedom to believe — or not — without government pressure.', sources: ['https://www.robbforcongress.com/meet-robb'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Calls health care a human right and supports Medicare for All so no one is denied care because of cost.', source: { label: 'Campaign', url: 'https://www.robbforcongress.com/our-values' } },
      { topic: 'Working Families', icon: '⚖️', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Argues working families should not pay more while the wealthy get the biggest tax breaks.', source: { label: 'Campaign', url: 'https://www.robbforcongress.com/our-values' } },
      { topic: 'Reproductive Rights', icon: '🤰', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports keeping politicians out of people\'s choices about their bodies, their health, and their lives.', source: { label: 'Campaign', url: 'https://www.robbforcongress.com/our-values' } },
      { topic: 'Voting Rights', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Pledges to end gerrymandering, protect voting rights, and ensure every eligible Arkansan can vote freely and fairly.', source: { label: 'Campaign', url: 'https://www.robbforcongress.com/our-values' } },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Says a child\'s future should not depend on their ZIP code and wants to strengthen public schools and support teachers.', source: { label: 'Campaign', url: 'https://www.robbforcongress.com/our-values' } },
    ],
  },

  // ══════════════════ ARKANSAS — 4th District (incumbent re-election) ══════════════════

  // ---- Bruce Westerman (R, incumbent) vs James "Rus" Russell (D) ----
  {
    id: 'bruce_westerman', name: 'Bruce Westerman', party: 'Republican', state: 'Arkansas',
    district: 'Arkansas — 4th District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Arkansas (4th District)',
    bio: "Bruce Westerman is the U.S. Representative for Arkansas's 4th Congressional District, the sprawling " +
      "southern and southwestern seat, in office since 2015. An engineer and the only licensed forester in the " +
      "House — he holds a master's in forestry from Yale — he chairs the House Committee on Natural Resources. His " +
      "Republican primary was canceled and he advanced automatically; he faces Democrat James \"Rus\" Russell in " +
      "November, centering forest management and wildfire prevention, public-lands and energy policy, and tax relief.",
    keyIssues: ['Forest management', 'Public lands', 'Energy', 'Tax relief', 'Gun rights'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman, engineer, and licensed forester who chairs the House Natural Resources Committee " +
      "and authored major forestry legislation. The score reflects that legislative and committee depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Advance forest-management reform to cut wildfire risk', verdict: 'pending', issueKey: 'lands_balance',
        detail: 'Continues to push the Fix Our Forests Act toward enactment after shepherding its bipartisan House passage in January 2025.', sources: ['https://www.congress.gov/bill/119th-congress/house-bill/471'] },
      { title: 'Direct public-lands and energy policy from Natural Resources', verdict: 'pending', issueKey: 'lands_energy',
        detail: 'As committee chairman, pledges to keep directing federal lands, forestry, and energy-production policy.', sources: ['https://en.wikipedia.org/wiki/Bruce_Westerman'] },
    ],
    positions: [
      { topic: 'Forest Management', icon: '🌲', pos: 'support', issueKey: 'lands_balance', issueStance: 'support',
        text: 'Authored the Fix Our Forests Act (H.R. 471), which passed the House 279-141 on January 23, 2025, to expand active forest management and reduce wildfire risk on federal lands.',
        evidence: 'A licensed forester with a master\'s in forestry from Yale.', source: { label: 'House Natural Resources Committee', url: 'https://naturalresources.house.gov/news/documentsingle.aspx?DocumentID=416884' } },
      { topic: 'Tax Relief', icon: '💸', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the Tax Cuts and Jobs Act of 2017.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bruce_Westerman' } },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'lands_energy', issueStance: 'support',
        text: 'As Natural Resources chairman, has advanced expanded domestic energy production on federal lands.', source: { label: 'House Natural Resources Committee', url: 'https://naturalresources.house.gov/news/documentsingle.aspx?DocumentID=416884' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Has received consistent "A" grades from the NRA Political Victory Fund and voted against the Enhanced Background Checks Act in 2021.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bruce_Westerman' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Has stated "Life is a right. Abortion is not," and supported the June 2022 overturning of Roe v. Wade.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bruce_Westerman' } },
    ],
  },

  {
    id: 'james_russell', name: 'James "Rus" Russell', party: 'Democratic', state: 'Arkansas',
    district: 'Arkansas — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Arkansas 4th District)',
    bio: "James \"Rus\" Russell is the Democratic nominee for Arkansas's 4th Congressional District, the southern " +
      "and southwestern seat. From the Little Rock area, he has owned and operated an outpatient mental-health " +
      "clinic since 2014, served in the Arkansas National Guard, and graduated from the University of Central " +
      "Arkansas. He previously ran for the Democratic gubernatorial nomination in 2022, finishing fourth, and " +
      "describes himself as \"unapologetically progressive while also being a fiscal realist.\" He won the March 3, " +
      "2026 Democratic primary over Steven O'Donnell and faces Rep. Bruce Westerman in November, centering money in " +
      "politics, health care, and housing affordability.",
    keyIssues: ['Money in politics', 'Health care', 'Housing', 'Economic fairness', 'Education'],
    accountability: { overallScore: 48, summary:
      "A small-business owner and National Guard veteran making his first run for federal office. He has no " +
      "legislative voting record, so his positions are campaign pledges and are marked pending; the score reflects " +
      "that thinner record for the office sought." },
    promises: [
      { title: 'Fight the influence of money in politics', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Pledges to confront corporate and ultra-wealthy influence over government and restore trust through transparency and accountability.', sources: ['https://russellforar.com/about-james'] },
      { title: 'Move toward health care for everyone', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Pledges to expand Medicare and work toward universal coverage with lower prescription costs.', sources: ['https://russellforar.com/on-the-issues'] },
    ],
    positions: [
      { topic: 'Money in Politics', icon: '💵', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Makes fighting "the influence of corporations and the ultra-wealthy over our politicians and institutions" a central plank.', source: { label: 'Campaign', url: 'https://russellforar.com/about-james' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports "expanding Medicare and moving toward healthcare for everyone" to lower costs and improve outcomes.', source: { label: 'Campaign', url: 'https://russellforar.com/on-the-issues' } },
      { topic: 'Economic Fairness', icon: '🏢', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Calls for closing tax loopholes so the wealthy and large corporations "pay their fair share."', source: { label: 'Campaign', url: 'https://russellforar.com/on-the-issues' } },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Wants to stop big companies from buying up homes and raising rents too high, and to let renters count rent toward mortgage applications.', source: { label: 'Campaign', url: 'https://russellforar.com/on-the-issues' } },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: 'Calls for universal access to "a good, free education," including college or job training.', source: { label: 'Campaign', url: 'https://russellforar.com/on-the-issues' } },
    ],
  },

  // ══════════════════ MISSISSIPPI — 1st District (incumbent re-election) ══════════════════

  // ---- Trent Kelly (R, incumbent) vs Cliff Johnson (D) ----
  {
    id: 'trent_kelly', name: 'Trent Kelly', party: 'Republican', state: 'Mississippi',
    district: 'Mississippi — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Mississippi (1st District)',
    bio: "Trent Kelly is the U.S. Representative for Mississippi's 1st Congressional District, the northeastern seat " +
      "taking in Tupelo, Oxford, Southaven, and Columbus, in office since a 2015 special election. A retired " +
      "Mississippi Army National Guard major general and combat veteran who deployed to Iraq, and a former district " +
      "attorney, he serves on the House Armed Services Committee — chairing its Seapower and Projection Forces " +
      "Subcommittee — as well as Agriculture and the House Intelligence Committee. He ran unopposed in the March 10, " +
      "2026 Republican primary and faces Democrat Cliff Johnson in November, centering national defense, veterans " +
      "and the National Guard, and farm policy.",
    keyIssues: ['National defense', 'Veterans', 'Agriculture', 'Gun rights', 'Border security'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman, retired National Guard major general, and former district attorney with a " +
      "defense-focused record and seats on Armed Services, Agriculture, and Intelligence. The score reflects that " +
      "depth; his forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Deliver emergency relief to farmers', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Authored the Farmer Assistance and Revenue Mitigation Act to bridge the gap for producers hit by disasters and inflation; continues to press farm-relief priorities.', sources: ['https://trentkelly.house.gov/newsroom/documentsingle.aspx?DocumentID=7467'] },
      { title: 'Sustain a strong national defense', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'Continues to advance shipbuilding and seapower priorities as chairman of the Armed Services Seapower and Projection Forces Subcommittee.', sources: ['https://ballotpedia.org/Trent_Kelly'] },
    ],
    positions: [
      { topic: 'National Defense', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Chairs the Armed Services Seapower and Projection Forces Subcommittee and serves on the House Intelligence Committee, with a consistently defense-focused record.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Trent_Kelly' } },
      { topic: 'Veterans & National Guard', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A retired major general who served in the Mississippi Army National Guard, he co-chairs the congressional National Guard caucus and centers military and veterans\' issues.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Trent_Kelly' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Introduced the bipartisan Farmer Assistance and Revenue Mitigation Act of 2024 to provide emergency payments to struggling crop producers.', source: { label: 'House.gov', url: 'https://trentkelly.house.gov/newsroom/documentsingle.aspx?DocumentID=7467' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Voted against the 2019 Bipartisan Background Checks Act (H.R. 8) and has co-sponsored national concealed-carry reciprocity legislation.', source: { label: 'OnTheIssues', url: 'https://ontheissues.org/house/Trent_Kelly_Gun_Control.htm' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Has campaigned on stronger border security and immigration enforcement.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Trent_Kelly' } },
    ],
  },

  {
    id: 'cliff_johnson', name: 'Cliff Johnson', party: 'Democratic', state: 'Mississippi',
    district: 'Mississippi — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Democratic Nominee (Mississippi 1st District)',
    bio: "Cliff Johnson is the Democratic nominee for Mississippi's 1st Congressional District, the northeastern " +
      "seat anchored by Tupelo and Oxford. A trial lawyer who directs the MacArthur Justice Center at the " +
      "University of Mississippi School of Law, he earlier served about five years as an assistant U.S. attorney; " +
      "his litigation has worked to close debtors' prisons and to end the jailing of Mississippians without a " +
      "lawyer. He won the March 10, 2026 Democratic primary over former state Rep. Kelvin Buck and faces Rep. " +
      "Trent Kelly in November, centering criminal-justice and civil-rights issues, health care, and wages.",
    keyIssues: ['Criminal justice', 'Health care', 'Wages', 'Government accountability', 'Mental health'],
    accountability: { overallScore: 52, summary:
      "A civil-rights litigator and law-school director making his first run for federal office. He has no " +
      "congressional voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that record depth for the office sought." },
    promises: [
      { title: 'Represent the most vulnerable Mississippians', verdict: 'pending', issueKey: 'justice_reform',
        detail: 'Pledges to be "committed, first and foremost, to representing those among us who are suffering the most."', sources: ['https://www.mississippifreepress.org/democrat-cliff-johnson-vows-to-fight-for-vulnerable-mississippians-in-run-for-congress-against-trent-kelly/'] },
      { title: 'Raise the minimum wage to $15', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Promises to push to raise Mississippi\'s minimum wage from $7.25 to $15 an hour.', sources: ['https://thedmonline.com/cliff-johnson-campaigns-for-transparency-and-accountability/'] },
    ],
    positions: [
      { topic: 'Criminal Justice', icon: '🔓', pos: 'support', issueKey: 'justice_reform', issueStance: 'support',
        text: 'As MacArthur Justice Center director, litigated to shut down debtors\' prisons and to end Mississippi\'s practice of jailing people for long periods without a lawyer.', source: { label: 'Mississippi Free Press', url: 'https://www.mississippifreepress.org/democrat-cliff-johnson-vows-to-fight-for-vulnerable-mississippians-in-run-for-congress-against-trent-kelly/' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Criticized cutting health coverage for low-income people, saying policy should not "strip health care from the poor to fund tax cuts for the wealthy."', source: { label: 'Mississippi Free Press', url: 'https://www.mississippifreepress.org/democrat-cliff-johnson-vows-to-fight-for-vulnerable-mississippians-in-run-for-congress-against-trent-kelly/' } },
      { topic: 'Wages', icon: '👷', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Supports raising Mississippi\'s minimum wage from $7.25 to $15 an hour.', source: { label: 'Daily Mississippian', url: 'https://thedmonline.com/cliff-johnson-campaigns-for-transparency-and-accountability/' } },
      { topic: 'Government Accountability', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Built his campaign around transparency and accountability, framing his civil-rights work as preparation to be an answerable member of Congress.', source: { label: 'Daily Mississippian', url: 'https://thedmonline.com/cliff-johnson-campaigns-for-transparency-and-accountability/' } },
      { topic: 'Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'Says he wants to improve addiction and mental-health services and lift people out of chronic poverty.', source: { label: 'Mississippi Free Press', url: 'https://www.mississippifreepress.org/democrat-cliff-johnson-vows-to-fight-for-vulnerable-mississippians-in-run-for-congress-against-trent-kelly/' } },
    ],
  },

  // ══════════════════ MISSISSIPPI — 2nd District (incumbent re-election) ══════════════════

  // ---- Bennie Thompson (D, incumbent) vs Ron Eller (R) ----
  {
    id: 'bennie_thompson', name: 'Bennie Thompson', party: 'Democratic', state: 'Mississippi',
    district: 'Mississippi — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Mississippi (2nd District)',
    bio: "Bennie Thompson is the U.S. Representative for Mississippi's 2nd Congressional District, the Delta seat " +
      "that includes part of Jackson, in office since a 1993 special election and the longest-serving member of " +
      "Mississippi's congressional delegation. He chaired the House Homeland Security Committee — the first " +
      "African American to lead it — and is now its ranking member, and he chaired the January 6 Select Committee. " +
      "He won the March 10, 2026 Democratic primary over Evan Turnage and faces Republican Ron Eller in November, " +
      "centering rural broadband and infrastructure, health care, and disaster recovery for the Delta.",
    keyIssues: ['Rural broadband', 'Infrastructure', 'Health care', 'Homeland security', 'Disaster recovery'],
    accountability: { overallScore: 64, summary:
      "The longest-serving member of Mississippi's delegation, a former Homeland Security Committee chairman, with a " +
      "decades-long record on infrastructure, broadband, and health-care access. The score reflects that depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Deliver broadband to the "last mile"', verdict: 'pending', issueKey: 'broadband',
        detail: 'Expects the final BEAD broadband rollout to reach the rural Mississippians who need it most.', sources: ['https://benniethompson.house.gov/media/press-releases/congressman-thompson-announces-12-billion-allocated-mississippi-broadband'] },
      { title: 'Continue securing federal investment for the Delta', verdict: 'pending', issueKey: 'infrastructure',
        detail: 'Pledges to keep directing federal community-project and disaster-recovery funding to Delta municipalities.', sources: ['https://benniethompson.house.gov/media/press-releases/congressman-thompson-gives-brief-description-community-projects-mississippi'] },
    ],
    positions: [
      { topic: 'Rural Broadband', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: 'Voted for the bipartisan infrastructure law and has touted the resulting $1.2 billion BEAD broadband allocation to connect rural Mississippi to high-speed internet.', source: { label: 'House.gov', url: 'https://benniethompson.house.gov/media/press-releases/congressman-thompson-announces-12-billion-allocated-mississippi-broadband' } },
      { topic: 'Infrastructure', icon: '🛣', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Has secured federal community-project funding for water, sewer, and infrastructure needs across Delta towns such as Shaw, Shelby, Mound Bayou, and Duncan.', source: { label: 'House.gov', url: 'https://benniethompson.house.gov/media/press-releases/congressman-thompson-gives-brief-description-community-projects-mississippi' } },
      { topic: 'Disaster Recovery', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Announced nearly $10 million in federal disaster-recovery investments for Delta regional communities.', source: { label: 'House.gov', url: 'https://benniethompson.house.gov/media/press-releases/congressman-bennie-thompson-announces-nearly-10-million-disaster-recovery' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Authored 2000 legislation that created the National Center for Minority Health and Health Care Disparities.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bennie_Thompson' } },
      { topic: 'Homeland Security', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'As Homeland Security Committee chair, introduced H.R. 1, the Implementing the 9/11 Commission Recommendations Act of 2007.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bennie_Thompson' } },
    ],
  },

  {
    id: 'ron_eller', name: 'Ron Eller', party: 'Republican', state: 'Mississippi',
    district: 'Mississippi — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Republican Nominee (Mississippi 2nd District)',
    bio: "Ron Eller is the Republican nominee for Mississippi's 2nd Congressional District, the Delta seat that " +
      "includes part of Jackson. A retired U.S. Army captain and a cardiothoracic-surgery physician assistant who " +
      "has worked in Mississippi for more than two decades, he also runs a small business manufacturing hunting " +
      "products. He was this district's Republican nominee in 2024 and ran again in 2026, narrowly winning the " +
      "March 10, 2026 Republican primary over Adams County supervisor Kevin Wilson. He faces longtime Rep. Bennie " +
      "Thompson in November, centering border security, an all-of-the-above energy mix, and completing the Yazoo " +
      "Backwater Pumps flood project.",
    keyIssues: ['Border security', 'Energy', 'Second Amendment', 'Pro-life policy', 'Flood control'],
    accountability: { overallScore: 50, summary:
      "A physician assistant, Army veteran, and small-business owner making a repeat run for this seat. He has no " +
      "legislative voting record, so his positions are campaign pledges and are marked pending; the score reflects " +
      "that thinner record for the office sought." },
    promises: [
      { title: 'Complete the Yazoo Backwater Pumps', verdict: 'pending', issueKey: 'water_storage',
        detail: 'Pledges to work to complete the long-stalled Yazoo pump project to end routine flooding of Delta households and farmland.', sources: ['https://www.wlbt.com/2026/03/06/ron-eller-makes-third-bid-mississippis-2nd-congressional-district-seat/'] },
      { title: 'Lower taxes and grow the Delta economy', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Pledges leadership focused on economic growth, secure borders, and lower taxes for the district.', sources: ['https://magnoliatribune.com/2026/03/13/eller-declares-victory-in-mississippis-2nd-congressional-district-gop-primary/'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Calls for strong enforcement — "build the wall now" — and would deny federal funding to sanctuary jurisdictions.', source: { label: 'Campaign', url: 'https://www.voteroneller.com/issues' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Opposes public funding of abortion providers and backs Mississippi\'s law allowing abortion only to save the life of the mother.', source: { label: 'Campaign', url: 'https://www.voteroneller.com/issues' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'States "the Second Amendment must be defended," supports cross-jurisdiction concealed carry, and identifies as an NRA member.', source: { label: 'Campaign', url: 'https://www.voteroneller.com/issues' } },
      { topic: 'Flood Control', icon: '💧', pos: 'support', issueKey: 'water_storage', issueStance: 'support',
        text: 'Wants the Yazoo Backwater Pumps completed, arguing repeated flooding damages homes, lowers property values, and shortens growing seasons in the Delta.', source: { label: 'Mississippi Free Press', url: 'https://www.mississippifreepress.org/ron-eller-2024-republican-candidate-for-mississippis-2nd-congressional-district-the-mfp-interview/' } },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs an all-of-the-above energy mix — "clean coal, oil, natural gas, nuclear, hydroelectric, hydrogen, wind, and solar."', source: { label: 'Campaign', url: 'https://www.voteroneller.com/issues' } },
    ],
  },

  // ══════════════════ MISSISSIPPI — 3rd District (incumbent re-election) ══════════════════

  // ---- Michael Guest (R, incumbent) vs Michael Chiaradio (D) ----
  {
    id: 'michael_guest', name: 'Michael Guest', party: 'Republican', state: 'Mississippi',
    district: 'Mississippi — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: '🏛 U.S. Representative — Mississippi (3rd District)',
    bio: "Michael Guest is the U.S. Representative for Mississippi's 3rd Congressional District, the central seat " +
      "running through the Jackson suburbs to Meridian and Starkville, in office since 2019. A former elected " +
      "district attorney for Madison and Rankin counties, he chairs the House Committee on Ethics and serves on " +
      "Appropriations and Homeland Security, where he chaired the Subcommittee on Border Security and Enforcement. " +
      "He advanced from the March 10, 2026 Republican primary and faces Democrat Michael Chiaradio in November, " +
      "centering border security, House ethics oversight, and support for law enforcement.",
    keyIssues: ['Border security', 'Government ethics', 'Law enforcement', 'Pro-life policy'],
    accountability: { overallScore: 58, summary:
      "A multi-term congressman and former district attorney who chairs the House Ethics Committee and has led " +
      "border-security oversight on Homeland Security. The score reflects that legislative and committee depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Sustain border-security funding and enforcement', verdict: 'pending', issueKey: 'border_security',
        detail: 'Pledges to keep working to secure the border and "undo the consequences" of prior border policies.', sources: ['https://homeland.house.gov/2025/07/03/chairmen-green-guest-celebrate-house-passage-of-generational-one-big-beautiful-bill-act-to-fund-border-security-and-enforcement-for-years/'] },
      { title: 'Uphold the integrity of the House', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'As Ethics Committee chairman, has committed to the committee\'s mission of ensuring the integrity of the institution.', sources: ['https://guest.house.gov/media/press-releases/statement-chairman-michael-guest-regarding-ethics-committees-release-report'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'As chairman of the Homeland Security Subcommittee on Border Security and Enforcement, voted for and promoted the Secure the Border Act of 2023 (H.R. 2).', source: { label: 'House.gov', url: 'https://guest.house.gov/media/press-releases/congressman-guest-supports-critical-legislation-address-border-crisis' } },
      { topic: 'Border Strategy', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Co-introduced the Comprehensive Southern Border Strategy Act requiring DHS to submit a border strategy to Congress to "gain operational control of every mile."', source: { label: 'House.gov', url: 'https://guest.house.gov/media/press-releases/guest-joins-kim-introduction-comprehensive-southern-border-strategy-act' } },
      { topic: 'Government Ethics', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Chairs the House Committee on Ethics, the panel charged with ensuring the integrity of the House, and has issued public statements in that role.', source: { label: 'House.gov', url: 'https://guest.house.gov/media/press-releases/statement-chairman-michael-guest-regarding-ethics-committees-release-report' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Is a member of the congressional Pro-Life Caucus.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Michael_Guest_(politician)' } },
      { topic: 'Law Enforcement', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'A former district attorney, he is a member of the congressional Law Enforcement Caucus and has publicly honored fallen police officers.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Michael_Guest_(politician)' } },
    ],
  },

  {
    id: 'michael_chiaradio', name: 'Michael Chiaradio', party: 'Democratic', state: 'Mississippi',
    district: 'Mississippi — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Mississippi 3rd District)',
    bio: "Michael Chiaradio is the Democratic nominee for Mississippi's 3rd Congressional District, the central " +
      "seat running through the Jackson suburbs to Meridian and Starkville. A farmer and entrepreneur originally " +
      "from New Jersey, he played professional baseball and earned an MBA from Felician University before moving to " +
      "Shubuta, Mississippi, in 2023, where he raises sheep, pigs, and cattle. He ran unopposed in the March 10, " +
      "2026 Democratic primary and faces Rep. Michael Guest in November, centering small-farm and rural economic " +
      "investment, health-care access, and the cost of living.",
    keyIssues: ['Rural agriculture', 'Health care', 'Cost of living', 'Rebuilding trust', 'Border security'],
    accountability: { overallScore: 48, summary:
      "A farmer and small-business owner making his first run for federal office. He has no legislative voting " +
      "record, so his positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought." },
    promises: [
      { title: 'Invest in rural economic competitiveness', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Pledges "intelligent public investment" to drive competitiveness in rural economies and revitalize rural towns via expanded USDA homebuilding.', sources: ['https://michaelachiaradio.com/about-me/'] },
      { title: 'Broaden the health-care safety net', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Pledges to expand low-cost health-care access and ensure Americans can age "with dignity, security, and access to the care they deserve."', sources: ['https://michaelachiaradio.com/issues/'] },
    ],
    positions: [
      { topic: 'Small Farmers', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Platform aims to "free the small farmer" by lowering capital barriers and offering favorable loans, qualified debt forgiveness, and expanded rental programs.', source: { label: 'Campaign', url: 'https://michaelachiaradio.com/issues/' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Calls for expanding low-cost access to health care, reducing out-of-pocket costs and premiums, and building modern facilities.', source: { label: 'Campaign', url: 'https://michaelachiaradio.com/issues/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Favors federal investment in factories, farms, and infrastructure to grow production and stabilize prices rather than "simply raising taxes or cutting spending."', source: { label: 'Campaign', url: 'https://michaelachiaradio.com/issues/' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports "robust border security to protect our communities" alongside a "sustainable, orderly immigration system."', source: { label: 'Campaign', url: 'https://michaelachiaradio.com/issues/' } },
      { topic: 'Trust in Government', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Calls to protect judicial independence, keep the Federal Reserve free from politics, limit special interests, and make emergency powers reviewable by Congress.', source: { label: 'Campaign', url: 'https://michaelachiaradio.com/issues/' } },
    ],
  },

  // ══════════════════ MISSISSIPPI — 4th District (incumbent re-election) ══════════════════

  // ---- Mike Ezell (R, incumbent) vs Jeffrey Hulum III (D) ----
  {
    id: 'mike_ezell', name: 'Mike Ezell', party: 'Republican', state: 'Mississippi',
    district: 'Mississippi — 4th District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 56,
    office: '🏛 U.S. Representative — Mississippi (4th District)',
    bio: "Mike Ezell is the U.S. Representative for Mississippi's 4th Congressional District, the Gulf Coast seat " +
      "taking in Gulfport, Biloxi, Hattiesburg, and Pascagoula, in office since 2023. A former Jackson County " +
      "sheriff with more than 35 years in law enforcement, he serves on the House Natural Resources Committee and " +
      "the Transportation and Infrastructure Committee, where he chairs the Subcommittee on Coast Guard and " +
      "Maritime Transportation. He won the March 10, 2026 Republican primary over Sawyer Walters and faces Democrat " +
      "Jeffrey Hulum III in November, centering law enforcement, coastal and maritime infrastructure, and disaster " +
      "recovery.",
    keyIssues: ['Law enforcement', 'Border security', 'Maritime infrastructure', 'Disaster recovery', 'Pro-life policy'],
    accountability: { overallScore: 56, summary:
      "A first-term congressman and former sheriff with a maritime-infrastructure subcommittee gavel and a record " +
      "on disaster recovery for the Gulf Coast. The score reflects that record depth; his forward-looking pledges " +
      "are marked pending until acted on." },
    promises: [
      { title: 'Keep bringing federal resources to South Mississippi', verdict: 'pending', issueKey: 'infrastructure',
        detail: 'Says he is seeking another term to continue securing federal infrastructure and disaster funding for the Gulf Coast and Pine Belt.', sources: ['https://www.wdam.com/2026/02/28/mississippi-4th-district-republican-primary-what-ezell-walters-are-promising-voters/'] },
      { title: 'Support a conservative, America First agenda', verdict: 'pending', issueKey: 'america_first',
        detail: 'Frames his re-election bid around his conservative record and support for President Trump\'s policies.', sources: ['https://magnoliatribune.com/2025/09/29/ezell-draws-gop-challenger-in-4th-congressional-district/'] },
    ],
    positions: [
      { topic: 'Law Enforcement', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'A former Jackson County sheriff, he sponsored House Resolution 106 condemning efforts to defund the police, which passed the House.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Mike_Ezell' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Has focused his congressional work on stronger border security and increased military support.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/mike_ezell/456911' } },
      { topic: 'Maritime Infrastructure', icon: '🛳', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Chairs the Transportation Subcommittee on Coast Guard and Maritime Transportation and sponsored disaster-assistance accountability bills that passed the House.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/mike_ezell/456911' } },
      { topic: 'Disaster Recovery', icon: '💧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Touts directing federal resources to South Mississippi, including flood-insurance reform and infrastructure funding for Hattiesburg and Petal.', source: { label: 'WDAM', url: 'https://www.wdam.com/2026/02/28/mississippi-4th-district-republican-primary-what-ezell-walters-are-promising-voters/' } },
      { topic: 'Abortion', icon: '🤰', pos: 'oppose', issueKey: 'pro_life', issueStance: 'oppose',
        text: 'Supports anti-abortion policies and is a member of the House Pro-Life Caucus.', source: { label: 'Magnolia Tribune', url: 'https://magnoliatribune.com/2025/09/29/ezell-draws-gop-challenger-in-4th-congressional-district/' } },
    ],
  },

  {
    id: 'jeffrey_hulum', name: 'Jeffrey Hulum III', party: 'Democratic', state: 'Mississippi',
    district: 'Mississippi — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Democratic Nominee (Mississippi 4th District)',
    bio: "Jeffrey Hulum III is the Democratic nominee for Mississippi's 4th Congressional District, the Gulf Coast " +
      "seat anchored by Gulfport and Biloxi. A retired U.S. Army sergeant major who served more than two decades, " +
      "he has represented District 119 in the Mississippi House of Representatives since 2022 and founded the " +
      "nonprofit Extend A Hand, Help A Friend, which distributes food across the Gulf Coast. He won the March 10, " +
      "2026 Democratic primary over Paul Blackman and D. Ryan Grover and faces Rep. Mike Ezell in November, " +
      "centering health-care access, veterans' benefits, public-school funding, and the cost of living.",
    keyIssues: ['Health care', 'Veterans', 'Public schools', 'Cost of living', 'Infrastructure'],
    accountability: { overallScore: 52, summary:
      "A sitting state representative and retired Army sergeant major running for federal office. He has a " +
      "state-legislative record but no congressional voting record, so his federal positions are campaign pledges " +
      "and are marked pending; the score reflects that record depth for the office sought." },
    promises: [
      { title: 'Codify veterans\' benefits', verdict: 'pending', issueKey: 'veterans',
        detail: 'Pledges to push for veterans\' benefits to be protected in law so they cannot be cut.', sources: ['https://www.wlox.com/2026/02/08/state-rep-hulum-emphasizes-veterans-care-healthcare-congressional-bid/'] },
      { title: 'Fight for affordable, permanent health care', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Says he will work for permanent, affordable health-care solutions and protect Mississippi\'s fragile rural health system.', sources: ['https://www.wlox.com/2026/02/08/state-rep-hulum-emphasizes-veterans-care-healthcare-congressional-bid/'] },
      { title: 'Work across the aisle for the district', verdict: 'pending', issueKey: 'gov_balance',
        detail: 'Pledges to continue a bipartisan approach, "working on both sides of the aisle to get common-sense, realistic policies done for the people."', sources: ['https://www.wlox.com/2026/03/11/jeffrey-hulum-ii-wins-democratic-primary-mississippis-4th-congressional-district/'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Says no family should go broke to see a doctor and calls for permanent, affordable health care, citing rural hospital closures.', source: { label: 'WLOX', url: 'https://www.wlox.com/2026/02/08/state-rep-hulum-emphasizes-veterans-care-healthcare-congressional-bid/' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A retired Army sergeant major, he says veterans\' benefits should be codified into law so they are not left "dangling over their head like a carrot."', source: { label: 'WLOX', url: 'https://www.wlox.com/2026/02/08/state-rep-hulum-emphasizes-veterans-care-healthcare-congressional-bid/' } },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Says every child deserves a quality education regardless of ZIP code and pledges to fully fund public schools.', source: { label: 'WLOX', url: 'https://www.wlox.com/2026/03/11/jeffrey-hulum-ii-wins-democratic-primary-mississippis-4th-congressional-district/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Says he wants an economy that works for working people, with affordable grocery prices and a living wage.', source: { label: 'WLOX', url: 'https://www.wlox.com/2026/02/25/vote-2026-meet-your-us-senate-house-candidates-mississippis-primaries/' } },
      { topic: 'Infrastructure', icon: '🛣', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: 'Lists reliable infrastructure and broadband and intentional investment in rural communities among his core priorities.', source: { label: 'WLOX', url: 'https://www.wlox.com/2026/02/25/vote-2026-meet-your-us-senate-house-candidates-mississippis-primaries/' } },
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
  out.push('    // ── U.S. House expansion · four-seat tier closeout: Arkansas + Mississippi (June 2026) ──');
  out.push('    // Bottom-up by delegation size, pass five — the four-seat states whose primaries closed in');
  out.push('    // MARCH 2026: Arkansas (AR-01..04, primary Mar 3) and Mississippi (MS-01..04, primary Mar 10).');
  out.push('    // Both major-party nominees are confirmed in every district. This completes the four-seat tier');
  out.push('    // except Kansas (Aug 4 primary, nominees not yet set). Each card is keyed to an ISSUE_MAP issue');
  out.push("    // so the profile joins Stance at a Glance, the Evidence Locker, the People's Mandate, and the Alignment Tool.");
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
  console.log(`PolitiDex — U.S. House four-seat closeout (Arkansas + Mississippi)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
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
    const f = '/tmp/house-4seat-arkansas-mississippi-stance-block.txt';
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
