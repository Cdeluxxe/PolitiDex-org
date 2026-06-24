#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — first national expansion beyond Utah (June 2026)
//
// Adds clean, individually-researched profiles for the 2026 U.S. SENATE general-
// election matchups and a set of competitive U.S. HOUSE races from states whose
// 2026 primaries have ALREADY CONCLUDED as of June 24, 2026. Every record is
// authored to the same bar as the Utah roster:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated against the live 87-key vocabulary in index.html) so
//     the profile lights up Stance at a Glance, the Evidence Locker issue
//     labels, the People's Mandate bridge, and the Alignment Tool;
//   • the new candidate-status system: active general-election nominees carry
//     candidacyStatus 'active'; the one notable beaten incumbent (Cornyn) carries
//     'eliminated_primary' so the "Lost Primary" banner tells the honest story.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • Sitting members seeking RE-ELECTION to the same seat are officeholders
//     (office text → 'office', green "In Office" badge) and carry
//     nextElection '2026-11-03' so they read as on the 2026 ballot.
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (rank 'nominee', office text contains "Nominee" → 'candidate' badge).
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action (a signed/enacted law,
// a recorded vote, a finished executive achievement) with a citation — never a
// campaign aspiration. Scores reflect record DEPTH for the office being sought,
// not approval, and accountability summaries say so.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts.
//
//   node scripts/add-federal-2026-races-jun2026.mjs            # dry run
//   node scripts/add-federal-2026-races-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-federal-2026-races-jun2026.mjs --apply    # create docs in Firestore
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

  // ══════════════════ U.S. SENATE ══════════════════

  // ---- Georgia: Jon Ossoff (D, incumbent) vs Mike Collins (R) ----
  {
    id: 'jon_ossoff', name: 'Jon Ossoff', party: 'Democratic', state: 'Georgia',
    district: 'Georgia — U.S. Senate', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 72,
    office: '🏛 U.S. Senator — Georgia',
    bio: "Jon Ossoff is the junior U.S. Senator from Georgia, elected in a January 2021 runoff that " +
      "helped flip control of the Senate. A former investigative-journalism executive who ran a documentary " +
      "production company and earlier worked as a congressional aide, he became the youngest sitting U.S. " +
      "senator. He is the only Democratic senator seeking re-election in 2026 in a state Donald Trump carried " +
      "in 2024, making Georgia central to the fight for the majority. He advanced unopposed as the Democratic " +
      "nominee and faces Republican U.S. Rep. Mike Collins in November, campaigning on lowering costs, " +
      "protecting health care, economic development, and government accountability.",
    keyIssues: ['Lowering costs for families', 'Health care access', 'Government accountability & anti-corruption', 'Economic development & jobs', 'Voting rights'],
    accountability: { overallScore: 72, summary:
      "A first-term U.S. senator with a substantive legislative and oversight record. The score reflects a " +
      "documented Senate tenure — including votes on prescription-drug pricing and a sustained anti-corruption " +
      "push — while his 2026 campaign pledges are marked pending until a second term." },
    promises: [
      { title: 'Lower prescription-drug and insulin costs', verdict: 'kept', issueKey: 'health_drug_prices',
        detail: 'Voted for the 2022 law empowering Medicare to negotiate drug prices and capping insulin costs for seniors.', sources: ['https://www.congress.gov'] },
      { title: 'Ban members of Congress from trading individual stocks', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Introduced legislation to bar senators and representatives from trading individual stocks; the bill has not yet become law.', sources: ['https://www.congress.gov'] },
      { title: 'Bring manufacturing and clean-energy jobs to Georgia', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Promotes federal investment in Georgia manufacturing and energy production.', sources: ['https://www.ossoff.senate.gov'] },
      { title: 'Protect and expand access to health care', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Campaigns on defending coverage and lowering out-of-pocket costs.', sources: ['https://www.ossoff.senate.gov'] },
    ],
    positions: [
      { topic: 'Lowering Everyday Costs', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Has made lowering the cost of health care, housing, and prescriptions the center of his re-election message.' },
      { topic: 'Prescription Drug Prices', icon: '💉', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Backed letting Medicare negotiate drug prices and capping insulin costs for seniors.',
        evidence: 'Voted for the 2022 Inflation Reduction Act drug-pricing provisions.', source: cong() },
      { topic: 'Anti-Corruption & Stock Trading', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Introduced a bill to ban members of Congress from trading individual stocks and has pressed ethics and oversight measures.', source: cong() },
      { topic: 'Georgia Jobs & Industry', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Promotes federal investment in Georgia manufacturing, clean energy, and economic development.' },
      { topic: 'Voting Access', icon: '📩', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Supports federal voting-rights protections and expanded ballot access.' },
    ],
  },

  {
    id: 'mike_collins', name: 'Mike Collins', party: 'Republican', state: 'Georgia',
    district: 'Georgia — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 66,
    office: 'U.S. Senate — 2026 Republican Nominee (Georgia)',
    bio: "Mike Collins is the Republican nominee for U.S. Senate in Georgia and, since 2023, the U.S. " +
      "Representative for Georgia's 10th District. A trucking-company owner from Jackson, Georgia, and the son " +
      "of former Rep. Mac Collins, he won the 2026 GOP Senate nomination by defeating former University of " +
      "Tennessee football coach Derek Dooley in a June 16 runoff after a late endorsement from President Trump. " +
      "A staunch Trump ally, he authored the Laken Riley Act — the first bill the president signed in his " +
      "second term — and campaigns on border security, immigration enforcement, and cutting federal spending. " +
      "He faces Democratic Sen. Jon Ossoff in one of the country's marquee 2026 contests.",
    keyIssues: ['Border security & immigration enforcement', 'Cutting federal spending', 'Energy & the economy', 'Public safety', 'Supporting the Trump agenda'],
    accountability: { overallScore: 66, summary:
      "A sitting U.S. Representative with a documented House record — including authorship of an enacted " +
      "immigration-detention law — now running for the Senate. The score reflects that record; his statewide " +
      "Senate pledges are marked pending." },
    promises: [
      { title: 'Require detention of unauthorized immigrants charged with crimes', verdict: 'kept', issueKey: 'border_security',
        detail: 'Authored the Laken Riley Act, which was enacted as the first law signed in Trump\'s second term.', sources: ['https://www.congress.gov'] },
      { title: 'Crack down on cartels and fentanyl trafficking', verdict: 'pending', issueKey: 'immig_fentanyl',
        detail: 'Campaigns on stronger interdiction of fentanyl and the cartels behind it.', sources: ['https://www.collinsforsenate.com'] },
      { title: 'Cut federal spending and waste', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Runs on reducing federal spending and rooting out government waste.', sources: ['https://www.collinsforsenate.com'] },
    ],
    positions: [
      { topic: 'Border Security & Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Authored the Laken Riley Act requiring detention of unauthorized immigrants charged with certain crimes.',
        evidence: 'Laken Riley Act enacted (2025).', source: cong() },
      { topic: 'Fentanyl & Cartels', icon: '🚫', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'Campaigns on cracking down on cross-border fentanyl trafficking and the cartels behind it.' },
      { topic: 'Federal Spending', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Runs on cutting federal spending and government waste.' },
      { topic: 'Energy Production', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs expanding domestic oil, gas, and nuclear energy production.' },
      { topic: 'Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'Pledges to fund law enforcement and toughen penalties for violent crime.' },
    ],
  },

  // ---- North Carolina (open seat, Tillis retiring): Roy Cooper (D) vs Michael Whatley (R) ----
  {
    id: 'roy_cooper', name: 'Roy Cooper', party: 'Democratic', state: 'North Carolina',
    district: 'North Carolina — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 75,
    office: 'U.S. Senate — 2026 Democratic Nominee (North Carolina)',
    bio: "Roy Cooper is the Democratic nominee for North Carolina's open U.S. Senate seat and the state's " +
      "former two-term governor (2017–2025). Before the governorship he served 16 years as North Carolina " +
      "Attorney General and earlier spent years in the state legislature. Known for pragmatic, centrist " +
      "politics, he twice won statewide in a state Trump carried, including a 2020 re-election by about 4.5 " +
      "points. He won the March 2026 Democratic primary with roughly 92% after former Rep. Wiley Nickel " +
      "withdrew and endorsed him. He faces Republican Michael Whatley for the seat being vacated by retiring " +
      "Sen. Thom Tillis, in one of the nation's most expensive and closely watched races.",
    keyIssues: ['Lowering costs & the economy', 'Health care & Medicaid expansion', 'Public education', 'Reproductive rights', 'Pragmatic, bipartisan governance'],
    accountability: { overallScore: 75, summary:
      "A former two-term governor and four-term attorney general with an extensive executive record, including " +
      "expanding Medicaid and vetoing measures he viewed as overreach. The score reflects that documented " +
      "record; his federal pledges are marked pending until he takes office." },
    promises: [
      { title: 'Expand and protect health coverage', verdict: 'kept', issueKey: 'healthcare',
        detail: 'As governor secured North Carolina\'s Medicaid expansion in 2023, extending coverage to roughly 600,000 people.', sources: ['https://www.ncdhhs.gov'] },
      { title: 'Protect reproductive rights', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'Vetoed Republican abortion restrictions as governor and campaigns to protect reproductive rights.', sources: ['https://www.congress.gov'] },
      { title: 'Lower costs for working families', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Centers his Senate campaign on the cost of living for North Carolina families.', sources: ['https://www.roycooper.com'] },
      { title: 'Invest in public schools and teacher pay', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Made teacher pay and public-school funding a defining priority as governor.', sources: ['https://www.roycooper.com'] },
    ],
    positions: [
      { topic: 'Medicaid Expansion & Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Secured North Carolina\'s Medicaid expansion in 2023, extending coverage to roughly 600,000 people.',
        evidence: 'Signed the state\'s Medicaid expansion into law (2023).' },
      { topic: 'Public Schools & Teacher Pay', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Repeatedly pressed the legislature for higher teacher pay and public-school funding as governor.' },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers his Senate campaign on lowering costs for working families.' },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Vetoed Republican abortion restrictions as governor and campaigns to protect reproductive rights.',
        evidence: 'Vetoed Senate Bill 20 (2023).' },
      { topic: 'Pragmatic Governance', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Built a brand of centrist, bipartisan governance, winning statewide in a state that voted for Trump.' },
    ],
  },

  {
    id: 'michael_whatley', name: 'Michael Whatley', party: 'Republican', state: 'North Carolina',
    district: 'North Carolina — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: 'U.S. Senate — 2026 Republican Nominee (North Carolina)',
    bio: "Michael Whatley is the Republican nominee for North Carolina's open U.S. Senate seat. A North " +
      "Carolina native with a Ph.D. and a law degree, he chaired the Republican National Committee during the " +
      "2024 election and previously led the North Carolina Republican Party. Earlier in his career he worked " +
      "as an energy-industry advocate and served as chief of staff to former U.S. Sen. Elizabeth Dole. After " +
      "Sen. Thom Tillis declined to seek re-election, Whatley entered the race with President Trump's immediate " +
      "endorsement and won the March 2026 primary with about 65%. Making his first run for public office, he " +
      "faces former Gov. Roy Cooper, campaigning on energy, the economy, border security, and the Trump agenda.",
    keyIssues: ['Energy & domestic production', 'Border security', 'Economy & taxes', 'Election integrity', 'Supporting the Trump agenda'],
    accountability: { overallScore: 60, summary:
      "A first-time candidate for elected office with a long party-leadership and energy-policy background but " +
      "no legislative voting record. His positions are campaign pledges and are marked pending." },
    promises: [
      { title: 'Expand American energy production', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'A former energy-industry advocate who campaigns on expanding oil, gas, and nuclear power.', sources: ['https://www.whatleyforsenate.com'] },
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs finishing border barriers and stronger immigration enforcement.', sources: ['https://www.whatleyforsenate.com'] },
      { title: 'Extend the 2017 tax cuts', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Supports making the 2017 individual and business tax cuts permanent.', sources: ['https://www.whatleyforsenate.com'] },
    ],
    positions: [
      { topic: 'Energy & Domestic Production', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'A former energy-industry advocate who campaigns on expanding American oil, gas, and nuclear production.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs finishing border barriers and stronger immigration enforcement.' },
      { topic: 'Taxes & Business', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supports extending the 2017 tax cuts and pro-business tax policy.' },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'As Republican National Committee chair he made election-integrity operations a central focus of the 2024 campaign.' },
      { topic: 'Pro-Growth Economy', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Runs on deregulation and pro-growth economic policy.' },
    ],
  },

  // ---- Texas: Ken Paxton (R) vs James Talarico (D); John Cornyn (R) lost primary ----
  {
    id: 'ken_paxton', name: 'Ken Paxton', party: 'Republican', state: 'Texas',
    district: 'Texas — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: 'U.S. Senate — 2026 Republican Nominee (Texas)',
    bio: "Ken Paxton is the Republican nominee for U.S. Senate in Texas and the state's Attorney General " +
      "since 2015. He won the 2026 nomination by defeating three-term incumbent Sen. John Cornyn in a May 26 " +
      "primary runoff by more than 25 points after President Trump's endorsement — the first time a sitting " +
      "Texas senator lost renomination since 1970. As Attorney General he built a national profile filing " +
      "lawsuits against Democratic administrations, defending the state's abortion and gun laws, and " +
      "aggressively litigating immigration and election issues; he was impeached by the Texas House in 2023 " +
      "over corruption allegations and acquitted by the Texas Senate. He faces Democratic state Rep. James " +
      "Talarico in November.",
    keyIssues: ['Border security & immigration', 'Challenging federal regulation', 'Gun rights', 'Pro-life policy', 'Election integrity'],
    accountability: { overallScore: 62, summary:
      "A long-serving state Attorney General with an extensive litigation record but no legislative voting " +
      "record. His Senate platform is forward-looking and marked pending; his record as a candidate and " +
      "officeholder, including a 2023 impeachment and acquittal, is noted in his biography." },
    promises: [
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'As Attorney General repeatedly sued the federal government over border and immigration policy; pledges continued enforcement in the Senate.', sources: ['https://www.texasattorneygeneral.gov'] },
      { title: 'Roll back federal regulations', verdict: 'pending', issueKey: 'gov_regulation',
        detail: 'Built his AG tenure on lawsuits challenging federal rules; campaigns to cut regulation in Congress.', sources: ['https://www.texasattorneygeneral.gov'] },
      { title: 'Defend gun rights', verdict: 'pending', issueKey: 'gun_rights',
        detail: 'A vocal Second Amendment advocate.', sources: ['https://www.paxtonforsenate.com'] },
    ],
    positions: [
      { topic: 'Border & Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'As Attorney General repeatedly sued the federal government over border and immigration policy and backed aggressive state border enforcement.' },
      { topic: 'Federal Regulation', icon: '✂️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Built his AG record on lawsuits challenging federal regulations and administration policies.' },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defended and enforced Texas\'s near-total abortion ban as Attorney General.' },
      { topic: 'Gun Rights', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'A vocal Second Amendment advocate who has defended Texas firearms laws.' },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Filed the 2020 Texas v. Pennsylvania suit seeking to challenge presidential results in four states, which the Supreme Court declined to hear.' },
    ],
  },

  {
    id: 'james_talarico', name: 'James Talarico', party: 'Democratic', state: 'Texas',
    district: 'Texas — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 70,
    office: 'U.S. Senate — 2026 Democratic Nominee (Texas)',
    bio: "James Talarico is the Democratic nominee for U.S. Senate in Texas, a state representative from the " +
      "Austin area first elected in 2018 and a former public-school teacher. He taught middle-school English " +
      "through Teach For America and earned a master's in education from Harvard before entering politics. In " +
      "the Texas House he became a leading voice against private-school vouchers, helped write a major 2019 " +
      "school-finance overhaul, and passed the state's first cap on pre-K class sizes. He won the 2026 " +
      "Democratic Senate primary with about 52% over U.S. Rep. Jasmine Crockett and faces Republican Attorney " +
      "General Ken Paxton in November, building his campaign around public education and the cost of living.",
    keyIssues: ['Public education & teacher pay', 'Health care & costs', 'Protecting democracy', 'Gun safety', 'Reproductive rights'],
    accountability: { overallScore: 70, summary:
      "A four-term state legislator with a documented education record, including a pre-K class-size cap and " +
      "work on school finance. The score reflects that record; his statewide federal pledges are marked pending." },
    promises: [
      { title: 'Cap pre-K class sizes to help young students', verdict: 'kept', issueKey: 'public_schools',
        detail: 'Passed the first-ever cap on Texas pre-K class sizes to reduce student-to-teacher ratios.', sources: ['https://ballotpedia.org/James_Talarico'] },
      { title: 'Protect public schools from voucher diversion', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Led the Texas House fight against private-school vouchers; a voucher program ultimately passed in 2025, and he continues to oppose diverting funds from public schools.', sources: ['https://jamestalarico.com/issue/public-education/'] },
      { title: 'Lower health-care costs and expand coverage', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Campaigns on expanding coverage in a state with the nation\'s highest uninsured rate.', sources: ['https://jamestalarico.com'] },
    ],
    positions: [
      { topic: 'Public Schools & Teacher Pay', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Championed teacher pay and public-school funding, helping write a 2019 school-finance overhaul and capping pre-K class sizes.',
        evidence: 'Passed the first cap on Texas pre-K class sizes.', source: bp('James_Talarico') },
      { topic: 'Private-School Vouchers', icon: '🎓', pos: 'oppose', issueKey: 'school_choice', issueStance: 'oppose',
        text: 'Led the Texas House fight against private-school vouchers and tried to put the program to a statewide vote.',
        evidence: 'Authored a 2025 floor amendment to send vouchers to a referendum (tabled).', source: { label: 'Texas Tribune', url: 'https://www.texastribune.org/2026/01/16/james-talarico-texas-senate-democrat-teacher-election-2026/' } },
      { topic: 'Health Care & Costs', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on expanding health coverage and lowering costs in a state with the nation\'s highest uninsured rate.' },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs stronger gun-safety measures.' },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports restoring reproductive rights.' },
    ],
  },

  {
    id: 'john_cornyn', name: 'John Cornyn', party: 'Republican', state: 'Texas',
    district: 'Texas — U.S. Senate', status: 'candidate', candidacyStatus: 'eliminated_primary',
    candidacyOutcome: 'Lost the May 26, 2026 Republican primary runoff to Ken Paxton by more than 25 points.',
    rank: 'candidate', nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: 'U.S. Senate — 2026 Republican Candidate (Texas)',
    bio: "John Cornyn is Texas's senior U.S. Senator, first elected in 2002 and previously the state's " +
      "Attorney General and a Texas Supreme Court justice. A former member of Senate Republican leadership " +
      "(Majority Whip, 2013–2019), he is known for work on judicial nominations, border-security funding, and " +
      "the 2022 bipartisan gun-safety law he helped negotiate after the Uvalde school shooting. Seeking a fifth " +
      "term in 2026, he lost the Republican primary runoff to Attorney General Ken Paxton on May 26 by more " +
      "than 25 points after President Trump endorsed Paxton — becoming the first Texas senator to lose " +
      "renomination since 1970. His term ends in January 2027.",
    keyIssues: ['Judicial nominations', 'Border security', 'National defense', 'Gun policy', 'Fiscal policy'],
    accountability: { overallScore: 64, summary:
      "A four-term senator and former Majority Whip with an extensive record, including the 2022 bipartisan " +
      "gun-safety law he co-negotiated. He lost the 2026 Republican primary runoff and is not advancing to the " +
      "general election; his record is preserved here." },
    promises: [
      { title: 'Negotiate bipartisan gun-safety reforms', verdict: 'kept', issueKey: 'gun_balance',
        detail: 'Co-negotiated the 2022 Bipartisan Safer Communities Act after the Uvalde shooting.', sources: ['https://www.congress.gov'] },
      { title: 'Secure border-security funding for Texas', verdict: 'pending', issueKey: 'border_security',
        detail: 'A longtime advocate for federal border-security appropriations.', sources: ['https://www.congress.gov'] },
    ],
    positions: [
      { topic: 'Gun Policy', icon: '⚖️', pos: 'support', issueKey: 'gun_balance', issueStance: 'support',
        text: 'Co-negotiated the 2022 Bipartisan Safer Communities Act after the Uvalde school shooting.',
        evidence: 'Bipartisan Safer Communities Act enacted (2022).', source: cong() },
      { topic: 'National Defense', icon: '🦅', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A senior appropriator and defense hawk focused on military readiness.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Long focused on federal border-security funding for Texas.' },
      { topic: 'Judicial Nominations', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support',
        text: 'A central player in confirming federal judges during his time in Senate leadership.' },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed the 2017 Trump tax cuts.' },
    ],
  },

  // ---- Maine: Susan Collins (R, incumbent) vs Graham Platner (D) ----
  {
    id: 'susan_collins', name: 'Susan Collins', party: 'Republican', state: 'Maine',
    district: 'Maine — U.S. Senate', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 70,
    office: '🏛 U.S. Senator — Maine',
    bio: "Susan Collins is the senior U.S. Senator from Maine, first elected in 1996 and now seeking a sixth " +
      "term. The only Republican senator left from New England and one of the chamber's few remaining " +
      "centrists, she chairs the Senate Appropriations Committee. She is known for occasionally breaking with " +
      "her party — she cast a decisive 2017 vote against repealing the Affordable Care Act, helped negotiate " +
      "the 2021 bipartisan infrastructure law, and has at times supported abortion-rights protections — while " +
      "backing much of her party's agenda. As the only Republican senator up for re-election in a state Trump " +
      "lost in 2024, she is among the cycle's most-targeted incumbents and faces Democrat Graham Platner in November.",
    keyIssues: ['Federal appropriations & Maine priorities', 'Bipartisan dealmaking', 'Health care', 'Reproductive rights', 'Fiscal responsibility'],
    accountability: { overallScore: 70, summary:
      "A long-serving senator and current Appropriations chair with an extensive record of bipartisan " +
      "dealmaking and occasional, documented breaks with her party. The score reflects that record; her 2026 " +
      "campaign commitments are marked pending." },
    promises: [
      { title: 'Block repeal of the Affordable Care Act', verdict: 'kept', issueKey: 'healthcare',
        detail: 'Cast a decisive 2017 vote against repealing the Affordable Care Act.', sources: ['https://www.congress.gov'] },
      { title: 'Deliver bipartisan infrastructure investment', verdict: 'kept', issueKey: 'infrastructure',
        detail: 'Helped negotiate and voted for the 2021 bipartisan infrastructure law.', sources: ['https://www.congress.gov'] },
      { title: 'Direct federal funding to Maine priorities', verdict: 'pending', issueKey: 'gov_services',
        detail: 'As Appropriations chair, pledges continued federal investment in Maine.', sources: ['https://www.collins.senate.gov'] },
    ],
    positions: [
      { topic: 'Appropriations & Maine Priorities', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Chairs the Senate Appropriations Committee and directs federal funding to Maine priorities.' },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Cast a decisive 2017 vote against repealing the Affordable Care Act.',
        evidence: 'Voted against ACA repeal (2017).', source: cong() },
      { topic: 'Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Helped negotiate the 2021 bipartisan infrastructure law.',
        evidence: 'Voted for the Infrastructure Investment and Jobs Act (2021).', source: cong() },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'support',
        text: 'Has supported abortion-rights protections, at times breaking with many in her party.' },
      { topic: 'Bipartisan Dealmaking', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Brands herself as a centrist dealmaker willing to work across the aisle.' },
    ],
  },

  {
    id: 'graham_platner', name: 'Graham Platner', party: 'Democratic', state: 'Maine',
    district: 'Maine — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. Senate — 2026 Democratic Nominee (Maine)',
    bio: "Graham Platner is the Democratic nominee for U.S. Senate in Maine, a first-time candidate, oyster " +
      "farmer, and Marine Corps combat veteran. Raised in coastal Maine, he served eight years in the military " +
      "with multiple combat tours in Iraq and Afghanistan, later worked as a security contractor, and now runs " +
      "an oyster farm on Frenchman Bay and serves as harbormaster in Sullivan. Running as a populist " +
      "progressive with early backing from Sen. Bernie Sanders, he won the June 2026 Democratic primary with " +
      "72% — a record turnout for a Maine Senate primary — after Gov. Janet Mills suspended her campaign. His " +
      "candidacy drew national attention and some controversy over past online posts, which he apologized for " +
      "and attributed to struggles with PTSD. He faces five-term Republican Sen. Susan Collins, campaigning on " +
      "economic inequality, universal health care, higher wages, and getting money out of politics.",
    keyIssues: ['Cost of living & economic inequality', 'Universal health care', 'Higher wages & labor unions', 'Getting money out of politics', 'Veterans'],
    accountability: { overallScore: 58, summary:
      "A first-time candidate and Marine combat veteran running a populist campaign. He has no legislative " +
      "record, so all positions are campaign pledges and are marked pending." },
    promises: [
      { title: 'Fight for universal health care', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Supports moving toward universal coverage / Medicare for All.', sources: ['https://www.grahamforsenate.com'] },
      { title: 'Raise wages and protect unions', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Backs raising the minimum wage and strengthening labor unions.', sources: ['https://www.grahamforsenate.com'] },
      { title: 'Get money out of politics', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Runs on limiting big-money influence and rejecting corporate PAC money.', sources: ['https://www.grahamforsenate.com'] },
    ],
    positions: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers his campaign on the high costs squeezing the middle class and on income inequality.' },
      { topic: 'Universal Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports moving toward universal health care.' },
      { topic: 'Wages & Unions', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backs raising the minimum wage and strengthening labor unions.' },
      { topic: 'Money in Politics', icon: '💸', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Runs on getting big money out of politics and rejecting corporate PAC contributions.' },
      { topic: 'Foreign Policy & War', icon: '🕊', pos: 'support', issueKey: 'restraint', issueStance: 'support',
        text: 'A combat veteran who has come out against "endless" wars and open-ended foreign intervention.' },
    ],
  },

  // ---- Ohio (special election): Jon Husted (R, appointed incumbent) vs Sherrod Brown (D) ----
  {
    id: 'jon_husted', name: 'Jon Husted', party: 'Republican', state: 'Ohio',
    district: 'Ohio — U.S. Senate (Special)', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 66,
    office: '🏛 U.S. Senator — Ohio (Appointed 2025)',
    bio: "Jon Husted is the appointed Republican U.S. Senator from Ohio, named in 2025 by Gov. Mike DeWine to " +
      "fill the seat vacated when JD Vance became Vice President. Before the Senate he served two terms as " +
      "Ohio's Lieutenant Governor, eight years as Ohio Secretary of State, and earlier as Speaker of the Ohio " +
      "House and a state senator. As Lieutenant Governor he led Ohio's workforce, technology, and " +
      "regulatory-reform initiatives. He ran unopposed in the 2026 special-election primary and faces former " +
      "Democratic Sen. Sherrod Brown in November; the winner completes the term through 2028. He campaigns on " +
      "the economy, workforce development, technology, border security, and supporting the Trump agenda.",
    keyIssues: ['Economy & jobs', 'Workforce development', 'Border security', 'Technology & innovation', 'Lower taxes'],
    accountability: { overallScore: 66, summary:
      "An appointed first-term senator with a long Ohio executive record — Lieutenant Governor, Secretary of " +
      "State, and House Speaker — including a documented regulatory-reduction effort. The score reflects that " +
      "record; his Senate pledges are marked pending." },
    promises: [
      { title: 'Cut red tape and regulation', verdict: 'kept', issueKey: 'gov_regulation',
        detail: 'As Lieutenant Governor led Ohio\'s Common Sense Initiative to review and reduce state regulations.', sources: ['https://lsc.ohio.gov'] },
      { title: 'Grow jobs and the economy', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Campaigns on workforce development and economic growth.', sources: ['https://www.husted.senate.gov'] },
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs stronger border security and immigration enforcement.', sources: ['https://www.husted.senate.gov'] },
    ],
    positions: [
      { topic: 'Jobs & Economy', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Led Ohio workforce and economic-development initiatives as Lieutenant Governor; campaigns on jobs and growth.' },
      { topic: 'Cutting Regulation', icon: '✂️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Led Ohio\'s Common Sense Initiative to reduce state regulations.' },
      { topic: 'Technology & Innovation', icon: '🚀', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Championed technology and innovation policy as Lieutenant Governor.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stronger border security and immigration enforcement.' },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supports lower taxes and reduced regulation.' },
    ],
  },

  {
    id: 'sherrod_brown', name: 'Sherrod Brown', party: 'Democratic', state: 'Ohio',
    district: 'Ohio — U.S. Senate (Special)', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 72,
    office: 'U.S. Senate — 2026 Democratic Nominee (Ohio Special Election)',
    bio: "Sherrod Brown is the Democratic nominee in Ohio's 2026 U.S. Senate special election, seeking a " +
      "return to the chamber after three terms (2007–2025) and a narrow 2024 loss to Republican Bernie Moreno. " +
      "A populist economic progressive long associated with manufacturing, trade, and labor issues, he earlier " +
      "served as Ohio Secretary of State and in the U.S. House. He won the May 2026 Democratic primary with " +
      "about 89% and faces appointed Republican Sen. Jon Husted for the seat JD Vance vacated to become Vice " +
      "President; the winner serves the remainder of the term through 2028. His campaign centers on workers, " +
      "manufacturing, trade, and lowering costs.",
    keyIssues: ['Workers & manufacturing jobs', 'Trade & American industry', 'Lowering costs', 'Health care', 'Protecting Social Security & Medicare'],
    accountability: { overallScore: 72, summary:
      "A three-term former U.S. senator with an extensive legislative record on labor, trade, and consumer " +
      "protection. The score reflects that documented record; his 2026 campaign pledges are marked pending." },
    promises: [
      { title: 'Lower prescription-drug costs', verdict: 'kept', issueKey: 'health_drug_prices',
        detail: 'Voted for the 2022 law letting Medicare negotiate drug prices and capping insulin costs.', sources: ['https://www.congress.gov'] },
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Campaigns on protecting earned benefits from cuts.', sources: ['https://www.sherrodbrown.com'] },
      { title: 'Fight for American manufacturing jobs', verdict: 'pending', issueKey: 'econ_trade',
        detail: 'A longtime critic of trade deals he says cost manufacturing jobs; backs Buy American policy.', sources: ['https://www.sherrodbrown.com'] },
    ],
    positions: [
      { topic: 'Workers & the Dignity of Work', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Built his career championing workers, unions, and the "dignity of work."' },
      { topic: 'Trade & American Industry', icon: '🏭', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: 'A longtime critic of trade deals he says cost American manufacturing jobs; backs Buy American policy.' },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Campaigns on protecting Social Security and Medicare from cuts.' },
      { topic: 'Prescription Drug Prices', icon: '💉', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Backed Medicare drug-price negotiation and capping insulin costs.',
        evidence: 'Voted for the 2022 Inflation Reduction Act drug-pricing provisions.', source: cong() },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Focuses on lowering costs for working families.' },
    ],
  },

  // ══════════════════ U.S. HOUSE (competitive) ══════════════════

  // ---- PA-07: Ryan Mackenzie (R, incumbent) vs Bob Brooks (D) ----
  {
    id: 'ryan_mackenzie', name: 'Ryan Mackenzie', party: 'Republican', state: 'Pennsylvania',
    district: 'PA-07', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Pennsylvania (PA-07)',
    bio: "Ryan Mackenzie is the U.S. Representative for Pennsylvania's 7th District, in the Lehigh Valley, " +
      "first elected in 2024 when he unseated Democratic Rep. Susan Wild by about 4,000 votes. He previously " +
      "served in the Pennsylvania House from 2012 to 2024, where he chaired the Labor and Industry Committee, " +
      "and now sits on the U.S. House Education and Workforce, Foreign Affairs, and Homeland Security " +
      "committees, chairing the Workforce Protections Subcommittee. He made a 'no new taxes' pledge, supported " +
      "the 2025 budget-and-tax law, and campaigns on jobs, taxes, education, and government reform. He faces " +
      "Democratic firefighter-union leader Bob Brooks in one of the nation's most competitive districts.",
    keyIssues: ['Jobs & the economy', 'Taxes', 'Immigration & border security', 'Education & workforce', 'Government reform'],
    accountability: { overallScore: 64, summary:
      "A first-term congressman and former state legislator who chaired Pennsylvania's Labor and Industry " +
      "Committee. The score reflects an early federal record in a top-tier swing district; his 2026 pledges " +
      "are marked pending." },
    promises: [
      { title: 'Oppose new taxes and extend the 2017 tax cuts', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Made a "no new taxes" pledge and backs extending the 2017 tax cuts.', sources: ['https://mackenzie.house.gov'] },
      { title: 'Create jobs and lower costs', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Campaigns on affordability and economic growth in the Lehigh Valley.', sources: ['https://mackenzie.house.gov'] },
      { title: 'Strengthen border security', verdict: 'pending', issueKey: 'border_security',
        detail: 'Calls immigration enforcement a top priority.', sources: ['https://mackenzie.house.gov'] },
    ],
    positions: [
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Made a "no new taxes" pledge and backs extending the 2017 tax cuts.' },
      { topic: 'Jobs & Affordability', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Campaigns on jobs, affordability, and economic growth in the Lehigh Valley.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Calls immigration enforcement a top priority.' },
      { topic: 'Workforce & Education', icon: '⚖️', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: 'Chairs the Workforce Protections Subcommittee and focuses on workforce training and education.' },
      { topic: 'Foreign Aid', icon: '🇺🇸', pos: 'support', issueKey: 'america_first', issueStance: 'support',
        text: 'Has voiced an America-first posture on foreign aid, including opposition to further Ukraine aid.' },
    ],
  },

  {
    id: 'bob_brooks', name: 'Bob Brooks', party: 'Democratic', state: 'Pennsylvania',
    district: 'PA-07', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Democratic Nominee (Pennsylvania PA-07)',
    bio: "Bob Brooks is the Democratic nominee for Pennsylvania's 7th District, a retired Bethlehem " +
      "firefighter who served from 2005 to 2025 and was elected president of the Pennsylvania Professional " +
      "Fire Fighters Association in 2021, representing about 8,000 firefighters statewide. Running on a " +
      "blue-collar, pro-union platform, he won a competitive four-way June 2026 primary with about 42% and " +
      "earned endorsements ranging from Sen. Bernie Sanders to Gov. Josh Shapiro, plus a place on the DCCC's " +
      "Red to Blue list. As a union leader he championed workers'-compensation coverage for first responders " +
      "with post-traumatic stress injury. He faces Republican Rep. Ryan Mackenzie, campaigning on protecting " +
      "Medicare, union rights, and lowering costs.",
    keyIssues: ['Workers & unions', 'Health care', 'First responders & mental health', 'Lowering costs', 'Social Security & Medicare'],
    accountability: { overallScore: 58, summary:
      "A longtime firefighter and state firefighters'-union president making his first run for elected office. " +
      "He has no legislative voting record, so his positions are campaign pledges marked pending." },
    promises: [
      { title: 'Protect and strengthen Medicare', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Has campaigned on protecting Medicare and expanding access to coverage.', sources: ['https://www.bobbrooksforcongress.com'] },
      { title: 'Stand up for workers and unions', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'A firefighter-union president running on pro-union, pro-worker policy.', sources: ['https://www.bobbrooksforcongress.com'] },
      { title: 'Support first responders’ mental-health benefits', verdict: 'pending', issueKey: 'health_mental',
        detail: 'As a union leader, championed Pennsylvania workers’-comp coverage for first responders with PTSD; pledges to carry that work to Congress.', sources: ['https://penncapital-star.com/campaigns-elections/firefighter-bob-brooks-wins-democratic-nomination-to-challenge-u-s-rep-ryan-mackenzie/'] },
    ],
    positions: [
      { topic: 'Workers & Unions', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A firefighter-union president running on pro-union, pro-worker policy.' },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Has campaigned on protecting Medicare and expanding access to coverage.' },
      { topic: 'First Responders & Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'As a union leader, championed Pennsylvania workers’-comp coverage for first responders with post-traumatic stress injury.',
        source: { label: 'Pennsylvania Capital-Star', url: 'https://penncapital-star.com/campaigns-elections/firefighter-bob-brooks-wins-democratic-nomination-to-challenge-u-s-rep-ryan-mackenzie/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Focuses on lowering costs for working families.' },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Pledges to protect Social Security and Medicare.' },
    ],
  },

  // ---- PA-08: Rob Bresnahan (R, incumbent) vs Paige Cognetti (D) ----
  {
    id: 'rob_bresnahan', name: 'Rob Bresnahan', party: 'Republican', state: 'Pennsylvania',
    district: 'PA-08', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: '🏛 U.S. Representative — Pennsylvania (PA-08)',
    bio: "Rob Bresnahan is the U.S. Representative for Pennsylvania's 8th District, covering the " +
      "Scranton/Wilkes-Barre area and the Poconos, first elected in 2024 when he defeated longtime Democratic " +
      "Rep. Matt Cartwright by about 6,200 votes. A former executive of his family's electrical-contracting " +
      "business, he ran as a political outsider and flipped a district that has trended toward Trump. He " +
      "campaigned on banning congressional stock trading — a pledge Democrats note he has since drawn scrutiny " +
      "over — and runs on the economy, energy, and lowering costs. He faces Scranton Mayor Paige Cognetti in a " +
      "race rated a toss-up.",
    keyIssues: ['Economy & jobs', 'Energy', 'Lowering costs', 'Government reform', 'Infrastructure'],
    accountability: { overallScore: 62, summary:
      "A first-term congressman and former business executive in a top-tier swing district. The score reflects " +
      "an early federal record; his 2026 pledges, including a stated commitment to ban congressional stock " +
      "trading, are marked pending." },
    promises: [
      { title: 'Ban congressional stock trading', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Pledged during his 2024 campaign to ban members of Congress from trading individual stocks; the proposal has not become law.', sources: ['https://bresnahan.house.gov'] },
      { title: 'Lower costs and grow jobs', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Campaigns on the economy and affordability for northeastern Pennsylvania.', sources: ['https://bresnahan.house.gov'] },
      { title: 'Expand domestic energy production', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'Backs expanding American energy production.', sources: ['https://bresnahan.house.gov'] },
    ],
    positions: [
      { topic: 'Jobs & Economy', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'A former contracting-business executive who campaigns on jobs and the economy.' },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs expanding domestic energy production.' },
      { topic: 'Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Focuses on infrastructure and local economic development.' },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Runs on lowering everyday costs.' },
      { topic: 'Stock Trading Ban', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Pledged to ban members of Congress from trading individual stocks, a commitment Democrats have since scrutinized.' },
    ],
  },

  {
    id: 'paige_cognetti', name: 'Paige Cognetti', party: 'Democratic', state: 'Pennsylvania',
    district: 'PA-08', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 66,
    quote: "When I first ran for Mayor, I took on the machine to clean up City Hall. Now I'm bringing that fight to Congress.",
    office: 'U.S. House — 2026 Democratic Nominee (Pennsylvania PA-08)',
    bio: "Paige Cognetti is the Democratic nominee for Pennsylvania's 8th District and has been mayor of " +
      "Scranton since 2020 — the first woman to hold that office. A Harvard MBA who worked as an advisor at the " +
      "U.S. Treasury in the Obama administration and earlier on a state auditor's school-oversight work, she " +
      "first won City Hall as an independent on an anti-corruption 'Paige Against the Machine' platform. As " +
      "mayor she led Scranton out of Pennsylvania's Act 47 financial-distress program and improved the city's " +
      "bond rating. She won the May 2026 Democratic primary, earned Gov. Josh Shapiro's endorsement and that of " +
      "former Rep. Matt Cartwright, and campaigns on fighting corruption, lowering costs, and health care " +
      "against Republican Rep. Rob Bresnahan.",
    keyIssues: ['Fighting corruption & government reform', 'Lowering costs', 'Health care', 'Fiscal management', 'Local economic development'],
    accountability: { overallScore: 66, summary:
      "A three-term Scranton mayor with a documented municipal turnaround record, including exiting the state's " +
      "Act 47 distress program. The score reflects that executive record; her federal pledges are marked pending." },
    promises: [
      { title: 'Restore fiscal stability', verdict: 'kept', issueKey: 'gov_balance',
        detail: 'As mayor led Scranton out of Pennsylvania’s Act 47 financial-distress program and improved its bond rating.', sources: ['https://en.wikipedia.org/wiki/Paige_Cognetti'] },
      { title: 'Fight corruption and special interests in Washington', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Built her career rooting out waste, fraud, and corruption; pledges to bring that to Congress.', sources: ['https://paigeforpa.com'] },
      { title: 'Lower costs for working families', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Makes the cost-of-living crisis a centerpiece of her campaign.', sources: ['https://paigeforpa.com'] },
    ],
    positions: [
      { topic: 'Anti-Corruption & Reform', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Built her career rooting out waste, fraud, and corruption, from the Scranton school board to City Hall.' },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Makes the cost-of-living crisis the center of her campaign.' },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on protecting and expanding access to health care.' },
      { topic: 'Fiscal Management', icon: '⚖️', pos: 'support', issueKey: 'gov_balance', issueStance: 'support',
        text: 'Led Scranton out of state financial distress (Act 47) and improved its bond rating.',
        evidence: 'Scranton exited Act 47 distemper status under her administration.', source: wiki('Paige_Cognetti') },
      { topic: 'Stock Trading Ban', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Backs banning members of Congress from trading individual stocks.' },
    ],
  },

  // ---- PA-10: Scott Perry (R, incumbent) vs Janelle Stelson (D) ----
  {
    id: 'scott_perry', name: 'Scott Perry', party: 'Republican', state: 'Pennsylvania',
    district: 'PA-10', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: '🏛 U.S. Representative — Pennsylvania (PA-10)',
    bio: "Scott Perry is the U.S. Representative for Pennsylvania's 10th District, in the Harrisburg and York " +
      "area, first elected in 2012 and a former chair of the House Freedom Caucus. An Army National Guard " +
      "veteran who rose to brigadier general, he is a staunch conservative and Trump ally who has faced " +
      "increasingly competitive races since redistricting placed him in the 10th. He won re-election in 2024 " +
      "by about 5,100 votes over Democrat Janelle Stelson and faces her in a 2026 rematch rated a toss-up. He " +
      "campaigns on limited government, spending restraint, border security, and gun rights.",
    keyIssues: ['Limited government & spending', 'Border security', 'Gun rights', 'National defense', 'Energy'],
    accountability: { overallScore: 62, summary:
      "A seven-term congressman, Army National Guard general, and former Freedom Caucus chair with an " +
      "extensive House record in a perennial swing district. The score reflects that record; his 2026 pledges " +
      "are marked pending." },
    promises: [
      { title: 'Cut federal spending and the debt', verdict: 'pending', issueKey: 'national_debt',
        detail: 'A fiscal hawk who pushes deep spending cuts to address the national debt.', sources: ['https://perry.house.gov'] },
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs strong border enforcement.', sources: ['https://perry.house.gov'] },
      { title: 'Defend gun rights', verdict: 'pending', issueKey: 'gun_rights',
        detail: 'A Second Amendment advocate who opposes new firearms restrictions.', sources: ['https://perry.house.gov'] },
    ],
    positions: [
      { topic: 'Spending & the Debt', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal hawk and former Freedom Caucus chair who pushes deep federal spending cuts.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strong border enforcement.' },
      { topic: 'Gun Rights', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'A Second Amendment advocate who opposes new firearms restrictions.' },
      { topic: 'National Defense', icon: '🦅', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Army National Guard general focused on national defense.' },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Supports expanding domestic energy production.' },
    ],
  },

  {
    id: 'janelle_stelson', name: 'Janelle Stelson', party: 'Democratic', state: 'Pennsylvania',
    district: 'PA-10', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Democratic Nominee (Pennsylvania PA-10)',
    bio: "Janelle Stelson is the Democratic nominee for Pennsylvania's 10th District, a former longtime " +
      "central-Pennsylvania television news anchor at WGAL who entered politics in 2024. In that race she came " +
      "within about 5,100 votes of unseating Republican Rep. Scott Perry, running several points ahead of the " +
      "top of the ticket in the district. She won the May 2026 Democratic primary with about 69% and secured a " +
      "rematch with Perry, backed by Gov. Josh Shapiro and a range of labor unions. A former registered " +
      "Republican who switched parties before her first run, she campaigns on affordability, protecting Social " +
      "Security and Medicare, and reproductive rights.",
    keyIssues: ['Cost of living & affordability', 'Social Security & Medicare', 'Reproductive rights', 'Health care', 'Pragmatic representation'],
    accountability: { overallScore: 58, summary:
      "A former television news anchor making her second run for the seat. She has no legislative record, so " +
      "her positions are campaign pledges and are marked pending." },
    promises: [
      { title: 'Lower costs for families', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Makes affordability the centerpiece of her campaign, criticizing tariffs and rising prices.', sources: ['https://janellestelson.com'] },
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Pledges to protect earned benefits from cuts.', sources: ['https://janellestelson.com'] },
      { title: 'Protect reproductive freedom', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'Supports protecting reproductive rights.', sources: ['https://janellestelson.com'] },
    ],
    positions: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Makes affordability the centerpiece of her campaign, criticizing tariffs and rising prices.' },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Pledges to protect Social Security and Medicare.' },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports protecting reproductive rights.' },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on lowering health-care costs.' },
      { topic: 'Constituent-First Approach', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Pitches a pragmatic, constituent-first approach to representation.' },
    ],
  },

  // ---- NC-01: Don Davis (D, incumbent) vs Laurie Buckhout (R) ----
  {
    id: 'don_davis', name: 'Don Davis', party: 'Democratic', state: 'North Carolina',
    district: 'NC-01', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — North Carolina (NC-01)',
    bio: "Don Davis is the U.S. Representative for North Carolina's 1st District, first elected in 2022. A " +
      "U.S. Air Force veteran, former mayor of Snow Hill, and former state senator, he is a centrist Democrat " +
      "in one of the country's most competitive districts. After Republicans redrew his district in late 2025 " +
      "to be roughly 12 points more Republican, he advanced unopposed in the March 2026 Democratic primary and " +
      "faces a rematch with Republican Laurie Buckhout, whom he narrowly beat in 2024. Widely rated one of the " +
      "most vulnerable House Democrats, he campaigns on agriculture, veterans, lowering costs, and bipartisanship.",
    keyIssues: ['Agriculture & rural communities', 'Veterans & military', 'Lowering costs', 'Bipartisanship', 'Social Security & Medicare'],
    accountability: { overallScore: 64, summary:
      "A second-term congressman and Air Force veteran with a centrist record in a redrawn, Republican-leaning " +
      "district. The score reflects that record; his 2026 pledges are marked pending." },
    promises: [
      { title: 'Stand up for farmers and rural North Carolina', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Sits on the House Agriculture Committee and prioritizes farmers and rural eastern North Carolina.', sources: ['https://davis.house.gov'] },
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Pledges to protect earned benefits from cuts.', sources: ['https://davis.house.gov'] },
      { title: 'Support veterans and military families', verdict: 'pending', issueKey: 'veterans',
        detail: 'An Air Force veteran focused on veterans’ services.', sources: ['https://davis.house.gov'] },
    ],
    positions: [
      { topic: 'Agriculture & Rural Communities', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Sits on the House Agriculture Committee and prioritizes farmers and rural eastern North Carolina.' },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'An Air Force veteran focused on veterans’ services.' },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Campaigns on lowering everyday costs for working families.' },
      { topic: 'Bipartisanship', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Brands himself as an independent-minded, bipartisan legislator.' },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Pledges to protect Social Security and Medicare.' },
    ],
  },

  {
    id: 'laurie_buckhout', name: 'Laurie Buckhout', party: 'Republican', state: 'North Carolina',
    district: 'NC-01', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Republican Nominee (North Carolina NC-01)',
    bio: "Laurie Buckhout is the Republican nominee for North Carolina's 1st District, a retired U.S. Army " +
      "colonel with 28 years of service who later founded a defense-consulting firm. She most recently served " +
      "in the Trump administration as a White House assistant national cyber director and as acting assistant " +
      "secretary for cyber policy. She narrowly lost the 2024 race to Democratic Rep. Don Davis and won the " +
      "March 2026 GOP primary to set up a rematch in a district Republicans redrew to lean about 12 points more " +
      "Republican. She campaigns on national defense and cybersecurity, border security, the economy, and the " +
      "Trump agenda.",
    keyIssues: ['National defense & cybersecurity', 'Border security', 'Economy & taxes', 'Veterans', 'Supporting the Trump agenda'],
    accountability: { overallScore: 58, summary:
      "A retired Army colonel and former Trump-administration cyber official making her second run for the " +
      "seat. She has no legislative voting record, so her positions are campaign pledges marked pending." },
    promises: [
      { title: 'Strengthen national defense and cybersecurity', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'A retired Army colonel and cyber-policy official who centers national security.', sources: ['https://www.buckhoutforcongress.com'] },
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs strong border enforcement.', sources: ['https://www.buckhoutforcongress.com'] },
      { title: 'Cut taxes and regulation', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Supports lower taxes and pro-growth economic policy.', sources: ['https://www.buckhoutforcongress.com'] },
    ],
    positions: [
      { topic: 'National Defense & Cybersecurity', icon: '🦅', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A retired Army colonel and former cyber-policy official who centers national security and defense.' },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strong border enforcement.' },
      { topic: 'Taxes & Economy', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supports lower taxes and pro-growth economic policy.' },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A military veteran focused on veterans’ issues.' },
      { topic: 'Technology & Innovation', icon: '🚀', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Brings a cybersecurity background to technology and innovation policy.' },
    ],
  },

  // ---- IA-01: Mariannette Miller-Meeks (R, incumbent) vs Christina Bohannan (D) ----
  {
    id: 'mariannette_miller_meeks', name: 'Mariannette Miller-Meeks', party: 'Republican', state: 'Iowa',
    district: 'IA-01', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: '🏛 U.S. Representative — Iowa (IA-01)',
    bio: "Mariannette Miller-Meeks is the U.S. Representative for Iowa's 1st District, first elected in 2020 " +
      "by just six votes — one of the closest House races in U.S. history. A physician (ophthalmologist), U.S. " +
      "Army veteran, and former director of the Iowa Department of Public Health and state senator, she sits on " +
      "the Energy and Commerce Committee. She won her 2024 re-election over Democrat Christina Bohannan by fewer " +
      "than 800 votes and faces Bohannan in a third matchup in 2026, rated a toss-up. She campaigns on health " +
      "care, energy and biofuels, agriculture, and fiscal responsibility.",
    keyIssues: ['Health care', 'Energy & biofuels', 'Agriculture', 'Veterans', 'Fiscal responsibility'],
    accountability: { overallScore: 64, summary:
      "A three-term congresswoman, physician, and Army veteran in one of the nation's closest districts. The " +
      "score reflects that House record; her 2026 pledges are marked pending." },
    promises: [
      { title: 'Support Iowa farmers and biofuels', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Champions Iowa farmers and the Renewable Fuel Standard.', sources: ['https://millermeeks.house.gov'] },
      { title: 'Improve rural health-care access', verdict: 'pending', issueKey: 'health_rural',
        detail: 'A physician focused on rural health care and provider access.', sources: ['https://millermeeks.house.gov'] },
      { title: 'Support veterans', verdict: 'pending', issueKey: 'veterans',
        detail: 'An Army veteran focused on veterans’ care.', sources: ['https://millermeeks.house.gov'] },
    ],
    positions: [
      { topic: 'Rural Health Care', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'A physician focused on rural health care and provider access.' },
      { topic: 'Energy & Biofuels', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs an all-of-the-above energy approach, including Iowa biofuels.' },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Champions Iowa farmers and the Renewable Fuel Standard.' },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'An Army veteran focused on veterans’ care.' },
      { topic: 'Fiscal Responsibility', icon: '⚖️', pos: 'support', issueKey: 'gov_balance', issueStance: 'support',
        text: 'Campaigns on fiscal responsibility and balanced budgets.' },
    ],
  },

  {
    id: 'christina_bohannan', name: 'Christina Bohannan', party: 'Democratic', state: 'Iowa',
    district: 'IA-01', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Democratic Nominee (Iowa IA-01)',
    bio: "Christina Bohannan is the Democratic nominee for Iowa's 1st District, a University of Iowa " +
      "constitutional-law professor and former state representative making her third run for the seat. The " +
      "first in her working-class family to attend college, she trained as an engineer before becoming a " +
      "lawyer. She lost to Republican Rep. Mariannette Miller-Meeks by about 800 votes in 2024 and won the June " +
      "2026 Democratic primary with roughly 82% to set up another rematch in a toss-up district. She campaigns " +
      "on lowering costs, protecting health care and Medicaid, reproductive rights, and Social Security.",
    keyIssues: ['Lowering costs', 'Health care & protecting Medicaid', 'Reproductive rights', 'Social Security & Medicare', 'Public education'],
    accountability: { overallScore: 58, summary:
      "A law professor and former state legislator making her third run for the seat. She has no current " +
      "federal record, so her positions are campaign pledges and are marked pending." },
    promises: [
      { title: 'Lower costs for working families', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Centers her campaign on the cost of living for Iowa families.', sources: ['https://www.bohannanforcongress.com'] },
      { title: 'Protect health care and Medicaid', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Opposes Medicaid cuts and campaigns on protecting and expanding coverage.', sources: ['https://www.bohannanforcongress.com'] },
      { title: 'Defend reproductive rights', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'Supports protecting reproductive rights.', sources: ['https://www.bohannanforcongress.com'] },
    ],
    positions: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers her campaign on lowering costs for working families.' },
      { topic: 'Health Care & Medicaid', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Opposes Medicaid cuts and campaigns on protecting and expanding coverage.' },
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports protecting reproductive rights.' },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Pledges to protect Social Security and Medicare.' },
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A professor who backs public education and college affordability.' },
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
  out.push('    // ── National 2026 expansion · Senate & competitive House (June 2026) ─────────');
  out.push('    // Active general-election nominees and one beaten incumbent (Cornyn). Each card is');
  out.push('    // keyed to an ISSUE_MAP issue so the profile is comparable in the Alignment Tool and');
  out.push("    // joins Stance at a Glance, the Evidence Locker, and the People's Mandate bridge.");
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
  console.log(`PolitiDex — national 2026 expansion  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
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
    const f = '/tmp/national-2026-stance-block.txt';
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
