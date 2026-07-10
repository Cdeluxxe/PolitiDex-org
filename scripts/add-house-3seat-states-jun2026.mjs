#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// THIRD pass of the smallest-delegation strategy. Pass one added the single-seat
// states (North Dakota, South Dakota); pass two added the two-seat states whose
// primaries had closed (Montana, Idaho, Maine). This pass moves up one rung to the
// THREE-seat states — and under the 2020 census apportionment there are exactly
// two of them, BOTH of which have already held their primaries:
//
//   • Nebraska   (primary May 12, 2026) — NE-01, NE-02, NE-03
//   • New Mexico (primary June 2, 2026) — NM-01, NM-02, NM-03
//
// Because Nebraska and New Mexico are the only two three-seat states, this wave
// completes the entire three-seat tier. In all six districts both major-party
// general-election nominees are confirmed as of June 24, 2026 (no recounts, no
// open primaries, a Democrat and a Republican on every ballot), so each of the
// twelve nominees below is included.
//
// THE SIX CONFIRMED MATCHUPS (12 nominees):
//   NE-01  Mike Flood (R, incumbent) vs Chris Backemeyer (D)
//   NE-02  OPEN (Don Bacon retiring): Brinker Harding (R) vs Denise Powell (D)
//   NE-03  Adrian Smith (R, incumbent) vs Becky Stille (D)
//   NM-01  Melanie Stansbury (D, incumbent) vs Didi Okpareke (R)
//   NM-02  Gabe Vasquez (D, incumbent) vs Greg Cunningham (R)
//   NM-03  Teresa Leger Fernández (D, incumbent) vs Martin Zamora (R)
//
// Every record is authored to the same bar as the Utah roster and the first two
// House waves:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in index.html)
//     so the profile lights up Stance at a Glance, the Evidence Locker issue
//     labels, the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general,
//     so each carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection
//     '2026-11-03' so the profile reads as on the 2026 ballot.
//       → Flood (NE-01), Smith (NE-03), Stansbury (NM-01), Vasquez (NM-02),
//         Leger Fernández (NM-03)
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//       → Backemeyer, Harding, Powell, Stille, Okpareke, Cunningham, Zamora
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action with a citation — never
// a campaign aspiration. Following the conservative standard set by the first two
// House waves, every promise here is recorded pending: each names a specific
// future legislative OUTCOME not yet achieved. Scores reflect record DEPTH for the
// office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts;
// a candidate's own break from, or alignment with, a position is theirs alone.
// Where a candidate has published no documented stance on an issue, none is
// invented — the research that backs this file flagged those gaps deliberately.
//
//   node scripts/add-house-3seat-states-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-3seat-states-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-3seat-states-jun2026.mjs --apply    # create docs in Firestore
//
// Idempotent: a record that already exists is skipped (never clobbered) unless
// --force is passed.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-24T00:00:00.000Z';

// Convenience source builders.
const wiki = (slug, label) => ({ label: label || 'Wikipedia', url: `https://en.wikipedia.org/wiki/${slug}` });
const bp   = (slug, label) => ({ label: label || 'Ballotpedia', url: `https://ballotpedia.org/${slug}` });
const cong = () => ({ label: 'Congress.gov', url: 'https://www.congress.gov' });

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ NEBRASKA — 1st District (incumbent re-election) ══════════════════

  // ---- Mike Flood (R, incumbent) vs Chris Backemeyer (D) ----
  {
    id: 'mike_flood', name: 'Mike Flood', party: 'Republican', state: 'Nebraska',
    district: 'Nebraska — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Nebraska (1st District)',
    bio: "Mike Flood is the U.S. Representative for Nebraska's 1st Congressional District, the eastern seat " +
      "anchored by Lincoln, in office since a June 2022 special election. A Lincoln attorney and broadcaster, he " +
      "built Flood Communications — a group of radio and television stations and News Channel Nebraska — and " +
      "served in the Nebraska Legislature from 2005 to 2013 and again from 2021 to 2022, including six years as " +
      "Speaker. In the U.S. House he chairs the Financial Services Subcommittee on Housing and Insurance, where he " +
      "has made housing supply a signature issue. He was unopposed in the May 12, 2026 Republican primary and " +
      "faces Democrat Chris Backemeyer in November.",
    keyIssues: ['Housing supply', 'Federal spending', 'Biofuels & agriculture', 'Veterans', 'Abortion'],
    accountability: { overallScore: 60, summary:
      "A second-term congressman, former Speaker of the Nebraska Legislature, and subcommittee chairman with an " +
      "early House record centered on housing, biofuels, and veterans. The score reflects that record and tenure; " +
      "his forward-looking 2026 pledges are marked pending until acted on." },
    promises: [
      { title: 'Increase the supply of affordable housing', verdict: 'pending', issueKey: 'housing_build',
        detail: 'Chairs the Housing and Insurance Subcommittee and introduced the Build Housing Affordably Act (H.R. 9311) to expand housing supply.', sources: ['https://www.congress.gov/member/mike-flood/F000474'] },
      { title: 'Expand biofuels to support rural jobs', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Sponsored the Securing America\'s Fuels Act and backs biofuel expansion as a source of rural Nebraska jobs.', sources: ['https://flood.house.gov/'] },
      { title: 'Reduce federal spending and the cost of living', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Campaigns on the position that "Washington is still spending too much" and pledges to cut federal spending.', sources: ['https://mikefloodfornebraska.com/'] },
    ],
    positions: [
      { topic: 'Housing Supply', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Chairs the Housing and Insurance Subcommittee and introduced the Build Housing Affordably Act (H.R. 9311) to expand the housing supply.',
        evidence: 'Authored housing measures folded into the 21st Century ROAD to Housing Act and introduced H.R. 9311 in June 2026.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/mike-flood/F000474' } },
      { topic: 'Federal Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Campaigns on cutting federal spending, saying "Washington is still spending too much."', source: { label: 'Campaign', url: 'https://mikefloodfornebraska.com/' } },
      { topic: 'Biofuels & Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Sponsored the Securing America\'s Fuels Act and backs biofuel expansion as a source of rural jobs.', source: { label: 'House.gov', url: 'https://flood.house.gov/' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Sponsored the VA TRUST Act (H.R. 6740) and the Stamp Out Veterans Medical Debt Act (H.R. 5946).', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/mike_flood/456868' } },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Holds an anti-abortion record; as a state senator he authored Nebraska\'s 20-week abortion ban (the Pain-Capable Unborn Child Protection Act).', source: wiki('Mike_Flood_(politician)') },
    ],
  },

  {
    id: 'chris_backemeyer', name: 'Chris Backemeyer', party: 'Democratic', state: 'Nebraska',
    district: 'Nebraska — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Democratic Nominee (Nebraska 1st District)',
    bio: "Chris Backemeyer is the Democratic nominee for Nebraska's 1st Congressional District, a Lincoln native " +
      "and former career diplomat. He spent roughly two decades at the U.S. State Department in non-partisan " +
      "roles under both Republican and Democratic administrations, rising to deputy assistant secretary of state " +
      "with portfolios in counterterrorism, economic policy, and the Middle East, and was a senior negotiator on " +
      "the 2015 Iran nuclear agreement. He returned to Nebraska in 2025 and won the May 12, 2026 Democratic " +
      "primary with about 58%, defeating renewable-energy developer Eric Moyer. He runs as a centrist focused on " +
      "the cost of living, trade, veterans, and agriculture.",
    keyIssues: ['Cost of living', 'Trade & tariffs', 'Reproductive rights', 'Veterans', 'Agriculture'],
    accountability: { overallScore: 50, summary:
      "A former career diplomat making his first run for elected office. He has no legislative voting record, so " +
      "his positions are campaign pledges and are marked pending; the score reflects that thinner record for the " +
      "office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Lower the cost of living and rein in the national debt', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Centers his campaign on affordability and reducing the national debt.', sources: ['https://backnebraska.com/chris-backemeyer-for-nebraska/'] },
      { title: 'Restore veterans\' health care and benefits', verdict: 'pending', issueKey: 'veterans',
        detail: 'Pledges to reverse VA cuts so veterans receive disability, mental-health care, and timely claims processing.', sources: ['https://backnebraska.com/chris-backemeyer-for-nebraska/'] },
      { title: 'Protect reproductive rights', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'Pledges to protect "a woman\'s right to choose in Nebraska and nationwide."', sources: ['https://backnebraska.com/chris-backemeyer-for-nebraska/'] },
    ],
    positions: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers his campaign on affordability and reducing the national debt.', source: { label: 'Campaign', url: 'https://backnebraska.com/chris-backemeyer-for-nebraska/' } },
      { topic: 'Trade & Tariffs', icon: '🏭', pos: 'oppose', issueKey: 'econ_trade', issueStance: 'oppose',
        text: 'Wants Congress to reassert its authority over tariffs, calling for an end to "the tariff chaos that harms farmers."', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/2025/11/06/chris-backemeyer-runs-in-nebraskas-1st-district-democratic-u-s-house-primary/' } },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Pledges to protect "a woman\'s right to choose in Nebraska and nationwide."', source: { label: 'Campaign', url: 'https://backnebraska.com/chris-backemeyer-for-nebraska/' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Wants to reverse VA cuts so veterans receive disability, mental-health care, and timely claims.', source: { label: 'Campaign', url: 'https://backnebraska.com/chris-backemeyer-for-nebraska/' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Supports "breaking up agribusiness monopolies that squeeze family farms."', source: { label: 'Campaign', url: 'https://backnebraska.com/chris-backemeyer-for-nebraska/' } },
    ],
  },

  // ══════════════════ NEBRASKA — 2nd District (OPEN: Bacon retiring) ══════════════════

  // ---- Brinker Harding (R) vs Denise Powell (D) ----
  {
    id: 'brinker_harding', name: 'Brinker Harding', party: 'Republican', state: 'Nebraska',
    district: 'Nebraska — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (Nebraska 2nd District)',
    bio: "Brinker Harding is the Republican nominee for Nebraska's 2nd Congressional District, the Omaha-area seat " +
      "left open by retiring Rep. Don Bacon. A fourth-generation Omahan, he has served on the Omaha City Council " +
      "for District 6 since 2017 and is currently the council's vice president; he works in commercial real estate " +
      "and earlier was chief of staff to former Omaha Mayor Hal Daub. He was unopposed in the May 12, 2026 " +
      "Republican primary after a rival withdrew, and faces Democrat Denise Powell in November in what is rated " +
      "one of the nation's most competitive House races. He campaigns on border enforcement, taxes, energy, and " +
      "public safety.",
    keyIssues: ['Border security', 'Taxes & cost of living', 'Energy production', 'Public safety', 'Technology & defense'],
    accountability: { overallScore: 52, summary:
      "An Omaha City Council vice president with a municipal governing record but no federal legislative record. " +
      "His congressional positions are campaign pledges and are marked pending; the score reflects that record " +
      "depth for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Secure the border and deport criminal offenders', verdict: 'pending', issueKey: 'border_security',
        detail: 'Pledges to "keep our border secure" and to deport people in the country illegally who commit crimes.', sources: ['https://www.brinkerharding.com/vision'] },
      { title: 'Cut taxes and lower everyday costs', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Pledges to "cut your taxes" and bring down gas, grocery, and interest costs, citing balanced Omaha budgets and property-tax-levy cuts.', sources: ['https://www.brinkerharding.com/vision'] },
      { title: 'Expand American energy production', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'Supports expanding domestic energy production to reduce dependence on foreign countries.', sources: ['https://www.brinkerharding.com/vision'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Pledges to keep the border secure and to deport people in the country illegally who commit crimes.', source: { label: 'Campaign', url: 'https://www.brinkerharding.com/vision' } },
      { topic: 'Taxes & Cost of Living', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Pledges to cut taxes and lower gas, grocery, and interest costs, citing balanced Omaha budgets and property-tax-levy cuts.',
        evidence: 'Points to his record on the Omaha City Council, where he cites balanced budgets and three property-tax-levy reductions.', source: { label: 'Campaign', url: 'https://www.brinkerharding.com/vision' } },
      { topic: 'Energy Production', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Supports expanding domestic energy production to reduce dependence on foreign countries.', source: { label: 'Campaign', url: 'https://www.brinkerharding.com/vision' } },
      { topic: 'Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'Opposes defunding police and points to Omaha officer pay raises and lower violent crime during his council tenure.', source: { label: 'Campaign', url: 'https://www.brinkerharding.com/vision' } },
      { topic: 'Technology & Defense', icon: '🚀', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Wants U.S. leadership in cryptocurrency and artificial intelligence ahead of China.', source: { label: 'Campaign', url: 'https://www.brinkerharding.com/vision' } },
    ],
  },

  {
    id: 'denise_powell', name: 'Denise Powell', party: 'Democratic', state: 'Nebraska',
    district: 'Nebraska — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Democratic Nominee (Nebraska 2nd District)',
    bio: "Denise Powell is the Democratic nominee for Nebraska's 2nd Congressional District, the Omaha-area seat " +
      "left open by retiring Rep. Don Bacon. A small-business owner and former corporate executive, she is the " +
      "daughter of Chilean and Cuban immigrants and would be the first Latina to represent Nebraska in Congress. " +
      "After 2016 she founded an organizing group that recruited local candidates and worked against state " +
      "abortion bans. In her first run for office she won the May 12, 2026 Democratic primary with about 39%, " +
      "narrowly defeating State Sen. John Cavanaugh, and faces Republican Brinker Harding in November. She " +
      "campaigns on health care, Social Security, public education, and reproductive rights.",
    keyIssues: ['Health care & Medicaid', 'Social Security & seniors', 'Public education', 'Reproductive rights', 'Middle-class taxes'],
    accountability: { overallScore: 50, summary:
      "A small-business owner and community organizer making her first run for office. She has no legislative " +
      "voting record, so her positions are campaign pledges and are marked pending; the score reflects that " +
      "thinner record for the office sought, not the strength of her candidacy." },
    promises: [
      { title: 'Protect Medicaid and health-care access', verdict: 'pending', issueKey: 'healthcare',
        detail: 'A self-described health-care advocate who opposes "dismantling Medicaid."', sources: ['https://deniseforcongress.org/'] },
      { title: 'Protect Social Security and Medicare for seniors', verdict: 'pending', issueKey: 'social_security',
        detail: 'Opposes making it harder for seniors to receive their earned benefits.', sources: ['https://deniseforcongress.org/'] },
      { title: 'Defend public schools and the University of Nebraska', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Describes herself as a "public school champion" and opposes cuts to public schools and the University of Nebraska.', sources: ['https://deniseforcongress.org/'] },
    ],
    positions: [
      { topic: 'Health Care & Medicaid', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A health-care advocate who opposes "dismantling Medicaid" and campaigns on protecting access.', source: { label: 'Campaign', url: 'https://deniseforcongress.org/' } },
      { topic: 'Social Security & Seniors', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Opposes making it harder for seniors to receive their earned Social Security and Medicare benefits.', source: { label: 'Campaign', url: 'https://deniseforcongress.org/' } },
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Describes herself as a "public school champion" and opposes cuts to public schools and the University of Nebraska.', source: { label: 'Campaign', url: 'https://deniseforcongress.org/' } },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Built an organizing record opposing state abortion bans and pledges to protect reproductive rights.', source: bp('Denise_Powell') },
      { topic: 'Middle-Class Taxes', icon: '💵', pos: 'oppose', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Opposes "tax breaks for billionaires" and argues tariffs and trade wars raise the cost of living for working families.', source: { label: 'Campaign', url: 'https://deniseforcongress.org/' } },
    ],
  },

  // ══════════════════ NEBRASKA — 3rd District (incumbent re-election) ══════════════════

  // ---- Adrian Smith (R, incumbent) vs Becky Stille (D) ----
  {
    id: 'adrian_smith', name: 'Adrian Smith', party: 'Republican', state: 'Nebraska',
    district: 'Nebraska — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Nebraska (3rd District)',
    bio: "Adrian Smith is the U.S. Representative for Nebraska's 3rd Congressional District, the largely rural " +
      "western and central seat that spans about 65,000 square miles and 80 counties, in office since 2007. A " +
      "former small-town economic-development director and state legislator from Gering, he is a senior member of " +
      "the House Ways and Means Committee, where he chairs the Subcommittee on Trade, and he chairs the " +
      "Congressional Biofuels, Modern Agriculture, and Agriculture Trade caucuses. He helped write the 2017 tax " +
      "law and the 2025 tax-and-spending law. He won the May 12, 2026 Republican primary with about 65% and faces " +
      "Democrat Becky Stille in November.",
    keyIssues: ['Taxes', 'Agriculture & biofuels', 'Trade', 'Rural health care', 'Abortion'],
    accountability: { overallScore: 64, summary:
      "A long-serving member of the Ways and Means Committee who chairs its Trade Subcommittee, with a deep record " +
      "on taxes, agriculture, and trade. The score reflects that legislative depth; his forward-looking 2026 " +
      "pledges are marked pending until acted on." },
    promises: [
      { title: 'Keep income and small-business taxes low', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Helped author the 2017 and 2025 tax laws and pledges to keep income and small-business taxes low; signed the Americans for Tax Reform pledge.', sources: ['https://joinadrian.com/issues/'] },
      { title: 'Expand farm exports and support producers', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Champions the Farm Bill, ag exports, and biofuels as chair of the Trade, Biofuels, and Modern Agriculture caucuses.', sources: ['https://www.congress.gov/member/adrian-smith/S001172'] },
      { title: 'Strengthen agricultural trade agreements', verdict: 'pending', issueKey: 'econ_trade',
        detail: 'As chair of the Ways and Means Trade Subcommittee, advocates for agricultural trade access and agreements such as USMCA.', sources: ['https://joinadrian.com/issues/'] },
    ],
    positions: [
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Helped write the 2017 and 2025 tax laws and signed the Americans for Tax Reform pledge to keep income and small-business taxes low.',
        evidence: 'Serves on the Ways and Means Committee and was a co-author of the 2017 Tax Cuts and Jobs Act.', source: { label: 'Campaign', url: 'https://joinadrian.com/issues/' } },
      { topic: 'Agriculture & Biofuels', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Champions the Farm Bill, farm exports, and biofuels, chairing the Biofuels and Modern Agriculture caucuses; sponsored the Ethanol for America Act (H.R. 4864).', source: cong() },
      { topic: 'Trade', icon: '🏭', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: 'Chairs the Ways and Means Trade Subcommittee and advocates for agricultural trade access and agreements such as USMCA.', source: { label: 'House.gov', url: 'https://adriansmith.house.gov/' } },
      { topic: 'Rural Health Care', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Sponsors rural and outpatient health bills, including the SOS: Sustaining Outpatient Services Act (H.R. 7666).', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/adrian_smith/412217' } },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'A member of the Congressional Pro-Life Caucus.', source: bp('Adrian_Smith_(Nebraska)') },
    ],
  },

  {
    id: 'becky_stille', name: 'Becky Stille', party: 'Democratic', state: 'Nebraska',
    district: 'Nebraska — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Nebraska 3rd District)',
    bio: "Becky Stille is the Democratic nominee for Nebraska's 3rd Congressional District, the largely rural " +
      "western and central seat. A resident of South Sioux City with an accounting degree, she works in the " +
      "biofuels industry and has a background in the agricultural sector. A self-described moderate and political " +
      "outsider in her first run for office, she ran unopposed in the May 12, 2026 Democratic primary and faces " +
      "longtime Rep. Adrian Smith in November. She says she entered the race out of concern for family farms and " +
      "the effects of the 2025 tax-and-budget law, and campaigns on agriculture, rural health care, and labor.",
    keyIssues: ['Family farms', 'Rural health care', 'Reproductive rights', 'Labor & wages', 'Gun rights'],
    accountability: { overallScore: 48, summary:
      "A biofuels-industry professional making her first run for office. She has no legislative voting record, so " +
      "her positions are campaign pledges and are marked pending; the score reflects that thinner record for the " +
      "office sought, not the strength of her candidacy." },
    promises: [
      { title: 'Restore federal farm funding and save family farms', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Names saving family farms her top priority and pledges to restore approved federal farm and rural funding.', sources: ['https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/'] },
      { title: 'Protect rural hospitals and lower drug costs', verdict: 'pending', issueKey: 'health_rural',
        detail: 'Pledges to expand rural health care, fund rural hospitals, lower prescription-drug costs, and preserve the Affordable Care Act.', sources: ['https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/'] },
      { title: 'Support unions and prevailing wage', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Supports labor unions, prevailing wage, and project labor agreements on federal construction.', sources: ['https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/'] },
    ],
    positions: [
      { topic: 'Family Farms', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Names saving family farms her top priority and pledges to restore approved federal farm and rural funding.', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/' } },
      { topic: 'Rural Health Care', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Pledges to expand rural health care, fund rural hospitals, lower drug costs, and preserve the Affordable Care Act.', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/' } },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports abortion access.', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/' } },
      { topic: 'Labor & Wages', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Supports labor unions, prevailing wage, and project labor agreements on federal construction.', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/' } },
      { topic: 'Gun Rights', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Opposes new gun restrictions — a position she holds as a self-described moderate in a rural district.', source: { label: 'Nebraska Examiner', url: 'https://nebraskaexaminer.com/voter-guides/contests/2026-primary-u-s-house-district-3/' } },
    ],
  },

  // ══════════════════ NEW MEXICO — 1st District (incumbent re-election) ══════════════════

  // ---- Melanie Stansbury (D, incumbent) vs Didi Okpareke (R) ----
  {
    id: 'melanie_stansbury', name: 'Melanie Stansbury', party: 'Democratic', state: 'New Mexico',
    district: 'New Mexico — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — New Mexico (1st District)',
    bio: "Melanie Stansbury is the U.S. Representative for New Mexico's 1st Congressional District, anchored by " +
      "Albuquerque, in office since a June 2021 special election. A former New Mexico state representative and " +
      "U.S. Senate Energy Committee staffer with a background in water and natural-resource policy, she sits on " +
      "the House Natural Resources Committee — including its Federal Lands and Water, Wildlife and Fisheries " +
      "subcommittees — and is the ranking member of an Oversight subcommittee. She was unopposed in the June 2, " +
      "2026 Democratic primary and faces Republican Didi Okpareke in November. She centers water, public lands, " +
      "health care, and gun safety.",
    keyIssues: ['Water & natural resources', 'Public lands', 'Health care', 'Gun safety', 'Climate & clean energy'],
    accountability: { overallScore: 60, summary:
      "A multi-term congresswoman and former water-policy specialist with a record on the Natural Resources and " +
      "Oversight committees. The score reflects that legislative depth; her forward-looking pledges are marked " +
      "pending until acted on." },
    promises: [
      { title: 'Protect public lands from sell-offs', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Serves on the Natural Resources Federal Lands Subcommittee and pledges to keep public lands public.', sources: ['https://en.wikipedia.org/wiki/Melanie_Stansbury'] },
      { title: 'Defend New Mexico\'s water resources', verdict: 'pending', issueKey: 'water',
        detail: 'A former water-policy staffer who pledges to protect the state\'s water and natural resources.', sources: ['https://en.wikipedia.org/wiki/Melanie_Stansbury'] },
      { title: 'Expand health-care access and lower costs', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Has supported expanding health-care access, including a 2021 endorsement of Medicare for All.', sources: ['https://en.wikipedia.org/wiki/Melanie_Stansbury'] },
    ],
    positions: [
      { topic: 'Water & Natural Resources', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'A former water-policy staffer who pledges to protect New Mexico\'s water and natural resources.',
        evidence: 'Worked on the U.S. Senate Energy and Natural Resources Committee and sits on the House Natural Resources Water, Wildlife and Fisheries Subcommittee.', source: wiki('Melanie_Stansbury') },
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Serves on the Natural Resources Federal Lands Subcommittee and supports keeping public lands public.', source: bp('Melanie_Ann_Stansbury') },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Has supported expanding health-care access, including a 2021 endorsement of Medicare for All.', source: wiki('Melanie_Stansbury') },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Supports a federal assault-weapons ban.', source: wiki('Melanie_Stansbury') },
      { topic: 'Climate & Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Voted to pass the Inflation Reduction Act of 2022, which funds clean-energy and climate programs.', source: wiki('Melanie_Stansbury') },
    ],
  },

  {
    id: 'didi_okpareke', name: 'Didi Okpareke', party: 'Republican', state: 'New Mexico',
    district: 'New Mexico — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Republican Nominee (New Mexico 1st District)',
    bio: "Didi Okpareke is the Republican nominee for New Mexico's 1st Congressional District, anchored by " +
      "Albuquerque and Rio Rancho. A Rio Rancho pharmacist and small-business owner, she is a first-generation " +
      "Nigerian American whose parents immigrated after the Biafran war; she moved to New Mexico in 1997, " +
      "graduated with honors from the University of New Mexico College of Pharmacy in 2008, and founded a " +
      "compounding pharmacy in 2017. In her first run for office she secured the Republican nomination through the " +
      "pre-primary convention and was unopposed in the June 2, 2026 primary. She faces Rep. Melanie Stansbury in " +
      "November and centers health-care access, federal spending, and economic growth.",
    keyIssues: ['Health-care workforce', 'Federal spending', 'Economic growth', 'Government waste'],
    accountability: { overallScore: 50, summary:
      "A pharmacist and small-business owner making her first run for office. She has no legislative voting " +
      "record, so her positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought, not the strength of her candidacy." },
    promises: [
      { title: 'Recruit and retain health-care workers in New Mexico', verdict: 'pending', issueKey: 'healthcare_market',
        detail: 'Says her first piece of legislation would aim to recruit and retain health-care workers, citing provider shortages and the cost of practicing in the state.', sources: ['https://www.abqjournal.com/news/rio-rancho-pharmacist-running-for-congress/371792'] },
      { title: 'Rein in federal spending', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Lists reducing federal spending among her top priorities.', sources: ['https://www.didiforcongress.com/'] },
      { title: 'Cut waste and abuse in government', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Campaigns on cutting waste and abuse while promoting economic growth and opportunity.', sources: ['https://www.didiforcongress.com/'] },
    ],
    positions: [
      { topic: 'Health-Care Workforce', icon: '💊', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: 'A pharmacist who would prioritize recruiting and retaining providers, including malpractice-liability reform to lower the cost of practicing medicine.',
        evidence: 'Founded a compounding pharmacy in 2017 and graduated from the University of New Mexico College of Pharmacy.', source: { label: 'Albuquerque Journal', url: 'https://www.abqjournal.com/news/rio-rancho-pharmacist-running-for-congress/371792' } },
      { topic: 'Federal Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Lists reducing federal spending among her top priorities.', source: { label: 'Campaign', url: 'https://www.didiforcongress.com/' } },
      { topic: 'Economic Growth', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Campaigns on economic growth and opportunity for New Mexico families and businesses.', source: { label: 'Campaign', url: 'https://www.didiforcongress.com/' } },
      { topic: 'Government Waste', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Pledges to cut waste and abuse in federal spending.', source: { label: 'Campaign', url: 'https://www.didiforcongress.com/' } },
    ],
  },

  // ══════════════════ NEW MEXICO — 2nd District (incumbent re-election) ══════════════════

  // ---- Gabe Vasquez (D, incumbent) vs Greg Cunningham (R) ----
  {
    id: 'gabe_vasquez', name: 'Gabe Vasquez', party: 'Democratic', state: 'New Mexico',
    district: 'New Mexico — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: '🏛 U.S. Representative — New Mexico (2nd District)',
    bio: "Gabe Vasquez is the U.S. Representative for New Mexico's 2nd Congressional District, the large southern " +
      "seat that includes Las Cruces, Carlsbad, and part of Albuquerque's west side, in office since 2023. A " +
      "former Las Cruces city councilor, in 2024 he won a second term in a district long regarded as one of the " +
      "most competitive in the Southwest. He sits on the House Natural Resources and Agriculture committees and has built a " +
      "record on public lands, an all-of-the-above energy approach, Rio Grande water, and border legislation. He " +
      "was unopposed in the June 2, 2026 Democratic primary and faces Republican Greg Cunningham in November in " +
      "the state's only competitive House race.",
    keyIssues: ['Public lands', 'Energy', 'Water & drought', 'Border & immigration', 'Conservation'],
    accountability: { overallScore: 58, summary:
      "A second-term congressman with a documented record on public lands, energy, water, and border policy, " +
      "ranked among the more bipartisan House members by Roll Call. The score reflects that record; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Block backdoor sales of public lands', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Introduced the bipartisan Public Lands Integrity Act to stop "backdoor" public-land sell-offs and pressed to keep leasing protections around Chaco Culture National Historical Park.', sources: ['https://vasquez.house.gov/media/press-releases'] },
      { title: 'Address Rio Grande drought and fund water infrastructure', verdict: 'pending', issueKey: 'water',
        detail: 'Passed legislation requiring the Bureau of Reclamation to brief Congress on Rio Grande drought and secured millions in federal funding for water and safety infrastructure.', sources: ['https://vasquez.house.gov/media/press-releases/rep-gabe-vasquez-secures-48-million-federal-funding-better-public-safety-and'] },
      { title: 'Secure the border while expanding legal pathways', verdict: 'pending', issueKey: 'immig_balance',
        detail: 'Introduced the Careworker Visa Act and promotes border bills targeting cartels and inspection technology, while opposing an additional $70 billion for ICE.', sources: ['https://vasquez.house.gov/issues/congress'] },
    ],
    positions: [
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Introduced the bipartisan Public Lands Integrity Act to block "backdoor" public-land sell-offs and pressed to keep oil-and-gas leasing protections around Chaco Culture National Historical Park.', source: { label: 'House.gov', url: 'https://vasquez.house.gov/media/press-releases' } },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Takes an all-of-the-above energy approach, backing southeastern New Mexico as "an American energy powerhouse" and condemning federal cuts to oil-and-gas modernization in his district.', source: { label: 'House.gov', url: 'https://vasquez.house.gov/media/press-releases' } },
      { topic: 'Water & Drought', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Passed legislation requiring the Bureau of Reclamation to brief Congress on Rio Grande drought and secured millions for water and safety infrastructure.',
        evidence: 'Secured $4.8M (Jan. 8, 2026) and $9.9M (Jan. 26, 2026) in federal funding for water and public-safety infrastructure in the district.', source: { label: 'House.gov', url: 'https://vasquez.house.gov/media/press-releases/rep-gabe-vasquez-secures-48-million-federal-funding-better-public-safety-and' } },
      { topic: 'Border & Immigration', icon: '⚖️', pos: 'support', issueKey: 'immig_balance', issueStance: 'support',
        text: 'Introduced the Careworker Visa Act and promotes border bills targeting cartels and inspection technology, while opposing an additional $70 billion for ICE.', source: { label: 'House.gov', url: 'https://vasquez.house.gov/issues/congress' } },
      { topic: 'Conservation', icon: '🌲', pos: 'support', issueKey: 'enviro_balance', issueStance: 'support',
        text: 'Urged the Department of Agriculture to exclude New Mexico from rescinding the 2001 Roadless Rule.', source: { label: 'House.gov', url: 'https://vasquez.house.gov/issues/environment' } },
    ],
  },

  {
    id: 'greg_cunningham_nm', name: 'Greg Cunningham', party: 'Republican', state: 'New Mexico',
    district: 'New Mexico — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (New Mexico 2nd District)',
    bio: "Greg Cunningham is the Republican nominee for New Mexico's 2nd Congressional District, the competitive " +
      "southern seat. A Marine Corps reconnaissance combat veteran, he spent more than 20 years with the " +
      "Albuquerque Police Department in patrol and narcotics, served as a DEA task-force officer on cartel cases, " +
      "and later worked in private security. He ran for the state House in 2022 and 2024 before entering the " +
      "congressional race, and won the June 2, 2026 Republican primary with about 85% after his nearest rival " +
      "withdrew and endorsed him. He faces Rep. Gabe Vasquez in November and centers his campaign on crime, " +
      "cartels and fentanyl, the border, and small business.",
    keyIssues: ['Crime & cartels', 'Border security', 'Law enforcement', 'Small business'],
    accountability: { overallScore: 52, summary:
      "A Marine combat veteran and former narcotics detective making his first run for federal office. He has no " +
      "legislative voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that thinner record for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Crack down on cartels and fentanyl trafficking', verdict: 'pending', issueKey: 'immig_fentanyl',
        detail: 'A former DEA task-force officer who argues narcotics and human trafficking remain the district\'s core problems and pledges to target the cartels behind them.', sources: ['https://nmpoliticalreport.com/2025/10/03/greg-cunningham-enters-race-for-congress-in-cd2-covering-southern-nm-and-abqs-westside/'] },
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Frames border enforcement against trafficking and cartels as a central priority.', sources: ['https://www.foxnews.com/politics/marine-combat-veteran-bets-big-hispanic-outreach-bid-flip-dem-held-house-seat'] },
      { title: 'Back law enforcement and lock up violent offenders', verdict: 'pending', issueKey: 'back_police',
        detail: 'Pledges to "lock up violent criminals" and stand with law enforcement, drawing on his policing career.', sources: ['https://www.foxnews.com/politics/marine-combat-veteran-bets-big-hispanic-outreach-bid-flip-dem-held-house-seat'] },
    ],
    positions: [
      { topic: 'Crime & Cartels', icon: '🚫', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'A former DEA task-force officer who argues narcotics and human trafficking remain the district\'s core problems and pledges to target the cartels behind them.',
        evidence: 'Served more than 20 years with the Albuquerque Police Department, including narcotics, and as a DEA task-force officer on cartel cases.', source: { label: 'NM Political Report', url: 'https://nmpoliticalreport.com/2025/10/03/greg-cunningham-enters-race-for-congress-in-cd2-covering-southern-nm-and-abqs-westside/' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Frames border enforcement against trafficking and cartels as a central priority.', source: { label: 'Fox News', url: 'https://www.foxnews.com/politics/marine-combat-veteran-bets-big-hispanic-outreach-bid-flip-dem-held-house-seat' } },
      { topic: 'Law Enforcement', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'Pledges to "lock up violent criminals" and stand with law enforcement, drawing on his policing career.', source: { label: 'Fox News', url: 'https://www.foxnews.com/politics/marine-combat-veteran-bets-big-hispanic-outreach-bid-flip-dem-held-house-seat' } },
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: 'Campaigns on "easing the burdens on our small businesses" and helping families find good-paying jobs.', source: { label: 'NM Political Report', url: 'https://nmpoliticalreport.com/2025/10/03/greg-cunningham-enters-race-for-congress-in-cd2-covering-southern-nm-and-abqs-westside/' } },
    ],
  },

  // ══════════════════ NEW MEXICO — 3rd District (incumbent re-election) ══════════════════

  // ---- Teresa Leger Fernández (D, incumbent) vs Martin Zamora (R) ----
  {
    id: 'teresa_leger_fernandez', name: 'Teresa Leger Fernández', party: 'Democratic', state: 'New Mexico',
    district: 'New Mexico — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: '🏛 U.S. Representative — New Mexico (3rd District)',
    bio: "Teresa Leger Fernández is the U.S. Representative for New Mexico's 3rd Congressional District, the " +
      "northern and northeastern seat that includes Santa Fe, in office since 2021. A Harvard- and Stanford-" +
      "trained attorney, she built a career in tribal advocacy and community development and once served as a HUD " +
      "liaison. She sits on the House Natural Resources Committee — including its Federal Lands and Indian and " +
      "Insular Affairs subcommittees — and belongs to the Native American and Pro-Choice caucuses. She was " +
      "unopposed in the June 2, 2026 Democratic primary and faces Republican Martin Zamora in November. She " +
      "centers tribal and public lands, health care, clean energy, and reproductive rights.",
    keyIssues: ['Tribal communities', 'Public lands', 'Health care', 'Clean energy', 'Reproductive rights'],
    accountability: { overallScore: 62, summary:
      "A multi-term congresswoman and longtime tribal-advocacy attorney with a record on the Natural Resources " +
      "Committee. The score reflects that legislative depth; her forward-looking pledges are marked pending until " +
      "acted on." },
    promises: [
      { title: 'Protect public and tribal lands', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Serves on the Natural Resources Federal Lands and Indian and Insular Affairs subcommittees and pledges to protect public and tribal lands.', sources: ['https://en.wikipedia.org/wiki/Teresa_Leger_Fern%C3%A1ndez'] },
      { title: 'Advance comprehensive immigration reform', verdict: 'pending', issueKey: 'immigration_reform',
        detail: 'Supports comprehensive immigration reform and the DREAM Act.', sources: ['https://en.wikipedia.org/wiki/Teresa_Leger_Fern%C3%A1ndez'] },
      { title: 'Protect reproductive rights', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'A member of the Pro-Choice Caucus who pledges to protect abortion rights.', sources: ['https://ballotpedia.org/Teresa_Leger_Fernandez'] },
    ],
    positions: [
      { topic: 'Tribal Communities', icon: '🪶', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'A longtime tribal-advocacy attorney who serves on the Indian and Insular Affairs Subcommittee and works to protect tribal and ancestral lands.',
        evidence: 'Built a legal career in tribal advocacy and community development before Congress and sits on the Natural Resources Indian and Insular Affairs Subcommittee.', source: bp('Teresa_Leger_Fernandez') },
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Serves on the Natural Resources Federal Lands Subcommittee and co-founded the National Heritage Area Caucus.', source: wiki('Teresa_Leger_Fern%C3%A1ndez') },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports expanding health-care access, including Medicare for All.', source: wiki('Teresa_Leger_Fern%C3%A1ndez') },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs a "New Mexico Green New Deal" and a transition from fracking toward green energy.', source: wiki('Teresa_Leger_Fern%C3%A1ndez') },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A member of the Pro-Choice Caucus who supports abortion rights.', source: bp('Teresa_Leger_Fernandez') },
    ],
  },

  {
    id: 'martin_zamora', name: 'Martin Zamora', party: 'Republican', state: 'New Mexico',
    district: 'New Mexico — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 54,
    office: 'U.S. House — 2026 Republican Nominee (New Mexico 3rd District)',
    bio: "Martin Zamora is the Republican nominee for New Mexico's 3rd Congressional District, the northern and " +
      "northeastern seat. A farmer and rancher from Clovis, he owns a farm in Clovis and a ranch in Torrance " +
      "County and has served in the New Mexico House of Representatives since 2019, representing House District " +
      "63, where he is the ranking member of the Agriculture, Acequias and Water Resources Committee. He was " +
      "unopposed in the June 2, 2026 Republican primary and was the best-funded New Mexico Republican House " +
      "candidate. He faces Rep. Teresa Leger Fernández in November and campaigns on agriculture and property " +
      "rights, taxes, water, the border, and public safety.",
    keyIssues: ['Agriculture & property rights', 'Taxes & small business', 'Water', 'Border', 'Fentanyl & crime'],
    accountability: { overallScore: 54, summary:
      "A farmer, rancher, and state representative since 2019 with a state-legislative record on agriculture and " +
      "water, but no federal voting record. The score reflects that state-level depth for the office sought; his " +
      "congressional pledges are marked pending." },
    promises: [
      { title: 'Defend agriculture and private property rights', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Pledges to "protect our agricultural heritage by defending private property rights" and reducing burdensome federal regulations.', sources: ['https://zamorafornewmexico.com/'] },
      { title: 'Lower taxes and cut regulation for small business', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Campaigns on "pro-growth policies that lower taxes, cut red tape, and support small businesses."', sources: ['https://zamorafornewmexico.com/'] },
      { title: 'Stand with law enforcement against fentanyl and crime', verdict: 'pending', issueKey: 'immig_fentanyl',
        detail: 'Says communities have been "devastated by crime and deadly drugs like fentanyl" and pledges to stand with law enforcement to restore order.', sources: ['https://zamorafornewmexico.com/'] },
    ],
    positions: [
      { topic: 'Agriculture & Property Rights', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'A farmer and rancher who pledges to "protect our agricultural heritage by defending private property rights" and cutting federal regulations.',
        evidence: 'Owns a farm in Clovis and a ranch in Torrance County and serves on the New Mexico House Agriculture, Acequias and Water Resources Committee.', source: { label: 'Campaign', url: 'https://zamorafornewmexico.com/' } },
      { topic: 'Taxes & Small Business', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Campaigns on "pro-growth policies that lower taxes, cut red tape, and support small businesses."', source: { label: 'Campaign', url: 'https://zamorafornewmexico.com/' } },
      { topic: 'Water', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Serves as ranking member of the New Mexico House Agriculture, Acequias and Water Resources Committee, centering water and acequia policy.', source: { label: 'NM Legislature', url: 'https://www.nmlegis.gov/members/Legislator?SponCode=HZAMO' } },
      { topic: 'Border', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Calls the southern border a national-security crisis, saying "a nation without borders is not a nation."', source: { label: 'Campaign', url: 'https://zamorafornewmexico.com/' } },
      { topic: 'Fentanyl & Crime', icon: '🚫', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'Says communities have been "devastated by crime and deadly drugs like fentanyl" and pledges to stand with law enforcement.', source: { label: 'Campaign', url: 'https://zamorafornewmexico.com/' } },
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
  out.push('    // ── U.S. House expansion · three-seat states, both nominees set (June 2026) ───');
  out.push('    // Bottom-up by delegation size, pass three: the two three-seat states whose');
  out.push('    // primaries have CONCLUDED — Nebraska (NE-01/02/03) and New Mexico (NM-01/02/03).');
  out.push('    // Nebraska and New Mexico are the only two three-seat states, so this completes the');
  out.push('    // tier. Each card is keyed to an ISSUE_MAP issue so the profile is comparable in the');
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
  console.log(`PolitiDex — U.S. House three-seat-states expansion  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
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
    const f = '/tmp/house-3seat-states-stance-block.txt';
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
