#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Michigan 2026 U.S. Senate + federal deepening pass (June 2026)
//
// Two jobs, both authored to the same bar as the Utah roster and the first
// national wave (scripts/add-federal-2026-races-jun2026.mjs):
//
//   1. ADD Michigan's open 2026 U.S. Senate race (Sen. Gary Peters retiring),
//      with its August 4, 2026 Democratic primary still UPCOMING. Three active
//      Democratic contenders (Abdul El-Sayed, Mallory McMorrow, Haley Stevens)
//      and the leading Republican (Mike Rogers). Each is a clean, individually
//      researched profile: a sourced biography, keyIssues + structured issue
//      stances keyed to ISSUE_MAP issueKeys, the candidate-status system, and
//      initial Connected-Evidence (spotlight) connections.
//
//   2. DEEPEN the five newly added sitting U.S. House incumbents with REAL,
//      verifiable legislative evidence — floor votes, bill sponsorships and
//      committee work — folded into their promise ledger, accountability
//      summary and stance mirror:
//        • Ryan Mackenzie  (PA-07) — H.R. 1 votes; Workforce Protections gavel.
//        • Rob Bresnahan   (PA-08) — TRUST Act (H.R. 3182) + trading scrutiny.
//        • Scott Perry     (PA-10) — Freedom Caucus chair (2022–24); H.R. 1.
//        • Don Davis       (NC-01) — Laken Riley YES (only NC Dem); H.R. 1 NO.
//        • Mariannette Miller-Meeks (IA-01) — E15/H.R. 1346; H.R. 1; E&C seat.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • The three Democrats and Mike Rogers are running for a seat none currently
//     holds → 2026 nominees/candidates (rank 'nominee', candidacyStatus 'active',
//     office text contains "Candidate"). The Democratic primary is Aug 4, 2026,
//     so all three remain ACTIVE; none is marked eliminated. If a contender
//     exits before the primary, flip candidacyStatus to 'eliminated_primary'
//     and add a candidacyOutcome line (see the Cornyn precedent).
//   • The five House members are sitting officeholders seeking re-election →
//     status 'office', nextElection '2026-11-03'. This script only PATCHES their
//     promises/accountability/stances (field-masked) and never clobbers bio.
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action (a signed/enacted law,
// a recorded vote, a finished achievement) WITH a citation — never an aspiration.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts.
// Items the research could not verify (e.g. Stevens' exact IRA/CHIPS roll calls)
// are deliberately left as forward-looking pledges rather than asserted votes.
//
//   node scripts/add-michigan-senate-and-deepen-federal-jun2026.mjs            # dry run
//   node scripts/add-michigan-senate-and-deepen-federal-jun2026.mjs --emit     # write index.html blocks to /tmp
//   node scripts/add-michigan-senate-and-deepen-federal-jun2026.mjs --apply    # create/patch Firestore
//
// Idempotent: new Michigan records that already exist are skipped unless --force.
// The five House DEEPEN patches are field-masked, so re-running is safe.
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
const cong = (url, label) => ({ label: label || 'Congress.gov', url: url || 'https://www.congress.gov' });

// ── New Michigan Senate roster ───────────────────────────────────────────────
// status: 'candidate' (running for a seat they do not hold). positions[] become
// both the ISSUE_STANCE_DATA cards and the Firestore `stances` mirror; promises[]
// drive kept/broken/pending + the Promise Score; spotlight[] are the curated
// Connected-Evidence drivers (mirrored into index.html ACCT_SPOTLIGHT).
const MICHIGAN = [

  {
    id: 'abdul_el_sayed', name: 'Abdul El-Sayed', party: 'Democratic', state: 'Michigan',
    district: 'Michigan — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: 'U.S. Senate — 2026 Democratic Candidate (Michigan)',
    bio: "Abdul El-Sayed is a Democratic candidate for Michigan's open U.S. Senate seat, a physician and " +
      "epidemiologist who led the Detroit Health Department and most recently served as Wayne County's health " +
      "director, resigning that post to run for the Senate. He ran for governor in 2018, losing the Democratic " +
      "primary to Gretchen Whitmer, and has remained one of the state's most prominent progressive voices. " +
      "Running on Medicare for All, a clean-energy transition, and getting corporate money out of politics, he " +
      "was endorsed by Sen. Bernie Sanders within hours of announcing — as Sanders did in 2018 — along with the " +
      "UAW and National Nurses United. He is competing in the August 4, 2026 Democratic primary for the seat " +
      "being vacated by retiring Sen. Gary Peters.",
    keyIssues: ['Medicare for All', 'Clean energy & clean water', 'Immigration & ICE', 'Getting money out of politics', 'Workers & unions'],
    accountability: { overallScore: 62, summary:
      "A physician and former public-health official with a substantial executive record but no legislative " +
      "voting record. The score reflects that executive background and a prior statewide campaign; his 2026 " +
      "Senate positions are campaign pledges and are marked pending." },
    promises: [
      { title: 'Fight for Medicare for All', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Has centered single-payer Medicare for All since his 2018 campaign and co-authored a 2020 book arguing for it.', sources: ['https://ballotpedia.org/Abdul_El-Sayed'] },
      { title: 'Reject corporate PAC money', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Pledges to refuse corporate PAC contributions, as he did in his 2018 governor run.', sources: ['https://michiganadvance.com/'] },
      { title: 'Transition Michigan to clean energy and protect clean water', verdict: 'pending', issueKey: 'climate_action',
        detail: 'Campaigns on a renewable-energy transition and clean water, a focus shaped by the Flint crisis.', sources: ['https://ballotpedia.org/Abdul_El-Sayed'] },
      { title: 'Overhaul immigration enforcement and abolish ICE', verdict: 'pending', issueKey: 'immigration_reform',
        detail: 'Calls for abolishing ICE, saying the agency "can\'t be reformed or retrained."', sources: ['https://www.pbs.org/newshour/politics'] },
    ],
    positions: [
      { topic: 'Medicare for All', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A longtime single-payer advocate who has built his campaigns around Medicare for All.',
        evidence: 'Co-authored a 2020 book making the case for Medicare for All; carried the position from his 2018 governor run into the 2026 Senate race.', source: bp('Abdul_El-Sayed') },
      { topic: 'Immigration & ICE', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Calls for abolishing ICE and overhauling immigration enforcement, saying the agency "can\'t be reformed."',
        source: { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics' } },
      { topic: 'Climate & Clean Water', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'A former public-health official who ties clean water and a renewable-energy transition to his Flint-shaped record.' },
      { topic: 'Money in Politics', icon: '💸', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Rejects corporate PAC money and argues Democratic leadership has lost touch with its voters.',
        evidence: 'Pledged to refuse corporate PAC contributions in both his 2018 and 2026 campaigns.', source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
      { topic: 'Workers & Unions', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Runs as a labor populist; backed by the UAW and National Nurses United.' },
      { topic: 'Foreign Military Aid', icon: '🕊', pos: 'support', issueKey: 'restraint', issueStance: 'support',
        text: 'A vocal critic of U.S. foreign military aid, including aid to Israel.' },
    ],
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2018–2026', tags: ['Consistency', 'Public Behavior'], issueKey: 'campaign_finance',
        headline: 'Refused corporate PAC money across two campaigns',
        facts: 'El-Sayed pledged to reject corporate PAC contributions in his 2018 run for governor and again in his 2026 Senate campaign.',
        why: 'A funding rule he has held consistently across cycles is a transparency signal in his own record.',
        source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
      { impact: 'positive', category: 'rhetoric', date: '2018–2026', tags: ['Consistency'], issueKey: 'healthcare',
        headline: 'Carried Medicare for All from 2018 into the Senate race',
        facts: 'El-Sayed has centered Medicare for All since his 2018 governor campaign and co-authored a 2020 book arguing for it; Sen. Bernie Sanders endorsed him in both 2018 and 2026.',
        why: 'A signature position held steady across two statewide campaigns is a consistency signal.',
        source: bp('Abdul_El-Sayed') },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Rhetoric vs Reality', 'Public Statements'], issueKey: 'healthcare',
        headline: 'Softened his Medicare for All framing while courting unions',
        facts: 'While still backing Medicare for All in 2026, El-Sayed shifted his messaging and stepped back from the "progressive" label as he sought union support, preferring to let policy proposals "speak for themselves."',
        why: 'A change in how he frames a core position is worth seeing alongside the position itself.',
        source: { label: 'The Detroit News', url: 'https://www.detroitnews.com/' } },
    ],
  },

  {
    id: 'mallory_mcmorrow', name: 'Mallory McMorrow', party: 'Democratic', state: 'Michigan',
    district: 'Michigan — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 66,
    office: 'U.S. Senate — 2026 Democratic Candidate (Michigan)',
    bio: "Mallory McMorrow is a Democratic candidate for Michigan's open U.S. Senate seat and a state senator " +
      "from Oakland County, first elected in 2018 and serving as Senate majority whip. She drew national " +
      "attention in April 2022 for a Michigan Senate floor speech rebutting a colleague's fundraising email " +
      "that had accused her of wanting to \"groom\" children — a defense of teaching history and inclusion that " +
      "was viewed more than a million times. After Democrats won the chamber in 2022, she helped pass the repeal " +
      "of Michigan's 1931 abortion ban, a \"red flag\" gun law, and a clean-energy law. Running for the seat being " +
      "vacated by retiring Sen. Gary Peters, she backs a health-care public option rather than Medicare for All " +
      "and has said she would not support Chuck Schumer as Senate Democratic leader. She is competing in the " +
      "August 4, 2026 Democratic primary.",
    keyIssues: ['Reproductive rights', 'Gun safety', 'Clean energy', 'Health-care public option', 'New party leadership'],
    accountability: { overallScore: 66, summary:
      "A state senator with a documented legislative record, including the 2023 repeal of Michigan's abortion " +
      "ban, a red-flag gun law, and a clean-energy law. The score reflects that record; her federal Senate " +
      "pledges are marked pending." },
    promises: [
      { title: 'Protect and codify reproductive rights', verdict: 'kept', issueKey: 'pro_choice',
        detail: 'Backed the 2023 repeal of Michigan\'s 1931 abortion ban as a state senator and campaigns to codify reproductive rights federally.', sources: ['https://ballotpedia.org/Mallory_McMorrow'] },
      { title: 'Pass stronger gun-safety laws', verdict: 'kept', issueKey: 'gun_safety',
        detail: 'Supported Michigan\'s 2023 "red flag" extreme-risk protection-order law allowing courts to remove firearms from a person in crisis.', sources: ['https://ballotpedia.org/Mallory_McMorrow'] },
      { title: 'Expand coverage through a public option', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Backs a public option to expand coverage while keeping private insurance, and rejects Medicare for All.', sources: ['https://ballotpedia.org/Mallory_McMorrow'] },
      { title: 'Push for new Democratic leadership in the Senate', verdict: 'pending', issueKey: 'reform_balance',
        detail: 'Says she would not support Chuck Schumer as Senate Democratic leader, calling for a new generation of leadership.', sources: ['https://thehill.com/'] },
    ],
    positions: [
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Helped repeal Michigan\'s dormant abortion ban as a state senator and campaigns to codify reproductive rights federally.',
        evidence: 'Backed the 2023 repeal of Michigan\'s 1931 abortion ban after Democrats won the state Senate.', source: bp('Mallory_McMorrow') },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Helped pass Michigan\'s "red flag" extreme-risk protection-order law.',
        evidence: 'Supported 2023 Michigan legislation allowing courts to remove firearms from a person in crisis.', source: bp('Mallory_McMorrow') },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Backs a public option to expand coverage while keeping private insurance, and explicitly rejects Medicare for All.' },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Helped pass Michigan\'s clean-energy law targeting 100% clean power, with a near-perfect League of Conservation Voters score.' },
      { topic: 'Party Leadership Reform', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Says she would not support Chuck Schumer as Senate Democratic leader, calling for a new generation of leadership.',
        evidence: 'Publicly broke with Schumer in 2025 after he advanced a Republican-backed stopgap spending bill.', source: { label: 'The Hill', url: 'https://thehill.com/' } },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2022', tags: ['Notable Actions', 'Public Statements'], issueKey: 'lgbtq_rights',
        headline: 'Viral floor speech rebutting a "groomer" attack',
        facts: 'In April 2022, McMorrow delivered a widely viewed Michigan Senate floor speech rebutting a colleague\'s fundraising email that accused her of wanting to "groom and sexualize" children, defending the teaching of history and inclusion.',
        why: 'A high-profile public stand under personal attack is a direct read on how she handles pressure.',
        source: bp('Mallory_McMorrow') },
      { impact: 'positive', category: 'voting', date: '2023', tags: ['Consistency', 'Notable Actions'], issueKey: 'gun_safety',
        headline: 'Helped pass a red-flag gun law and abortion-ban repeal',
        facts: 'After Democrats won the Michigan Senate in 2022, McMorrow backed legislation enacting extreme-risk firearm protection orders and repealing the state\'s 1931 abortion ban — both core to her campaign platform.',
        why: 'State-level votes that match her stated priorities are a words-match-record signal.',
        source: bp('Mallory_McMorrow') },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Public Statements', 'Leadership Style'], issueKey: 'reform_balance',
        headline: 'Publicly broke with Schumer as Senate Democratic leader',
        facts: 'McMorrow said she would not support Chuck Schumer as Senate Democratic leader, criticizing him after he advanced a Republican-backed stopgap spending bill — a stance she stated more definitively than her primary rivals.',
        why: 'Naming a break with her own party\'s leadership is a candor and independence signal.',
        source: { label: 'The Hill', url: 'https://thehill.com/' } },
      { impact: 'negative', category: 'rhetoric', date: '2025', tags: ['Rhetoric vs Reality', 'Public Statements'], issueKey: 'foreign_balance',
        headline: 'Walked back a "genocide" answer on Gaza',
        facts: 'Asked in 2025 whether the Gaza war met the definition of genocide, McMorrow answered affirmatively, then later distanced herself from the framing, calling the question a "political purity test" while reaffirming the U.S.–Israel alliance.',
        why: 'Shifting on a high-salience answer is a consistency question voters can weigh.',
        source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
    ],
  },

  {
    id: 'haley_stevens', name: 'Haley Stevens', party: 'Democratic', state: 'Michigan',
    district: 'Michigan — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 68,
    office: 'U.S. Senate — 2026 Democratic Candidate (Michigan)',
    bio: "Haley Stevens is a Democratic candidate for Michigan's open U.S. Senate seat and the U.S. " +
      "Representative for Michigan's 11th District, in the Oakland County suburbs, first elected in 2018. Before " +
      "Congress she served as chief of staff to the Obama administration's federal Auto Task Force during the " +
      "auto-industry rescue, and she has built her House tenure and Senate campaign around manufacturing and " +
      "the auto industry. A self-described \"proud pro-Israel Democrat,\" she is backed by pro-Israel groups and " +
      "has defended Senate Democratic leadership, a contrast with her primary rivals. She is running for the " +
      "seat being vacated by retiring Sen. Gary Peters and competing in the August 4, 2026 Democratic primary.",
    keyIssues: ['Manufacturing & auto jobs', 'Israel & foreign policy', 'Health care', 'Lower drug costs', 'Workforce & innovation'],
    accountability: { overallScore: 68, summary:
      "A multi-term U.S. Representative with a federal record centered on manufacturing and the auto industry, " +
      "rooted in her work on the Obama Auto Task Force. The score reflects that record; her statewide Senate " +
      "pledges are marked pending." },
    promises: [
      { title: 'Champion manufacturing and auto jobs', verdict: 'pending', issueKey: 'econ_trade',
        detail: 'Centers her campaign on manufacturing and the auto industry, crediting the CHIPS and Science Act with billions in Michigan investment.', sources: ['https://ballotpedia.org/Haley_Stevens'] },
      { title: 'Stand with Israel as a strong ally', verdict: 'pending', issueKey: 'foreign_balance',
        detail: 'Describes herself as a "proud pro-Israel Democrat" who opposes BDS and calls Israel a strong ally.', sources: ['https://ballotpedia.org/Haley_Stevens'] },
      { title: 'Expand the ACA and lower drug costs', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Campaigns on expanding the Affordable Care Act and capping costs such as insulin, rather than moving to Medicare for All.', sources: ['https://ballotpedia.org/Haley_Stevens'] },
    ],
    positions: [
      { topic: 'Manufacturing & Auto Jobs', icon: '🏭', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: 'Centers her campaign on manufacturing and the auto industry, crediting the CHIPS and Science Act with billions in Michigan investment.',
        evidence: 'Served as chief of staff to the Obama administration\'s federal Auto Task Force before entering Congress.', source: bp('Haley_Stevens') },
      { topic: 'Israel & Foreign Policy', icon: '⚖️', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Describes herself as a "proud pro-Israel Democrat" who calls Israel a strong ally; backed by pro-Israel groups.' },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on expanding the Affordable Care Act rather than moving to Medicare for All.' },
      { topic: 'Prescription Drug Prices', icon: '💉', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Campaigns on capping insulin costs and protecting Medicare.' },
      { topic: 'Party Leadership', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Defends Senate Democratic leadership as effective, calling Chuck Schumer "a great leader" who delivered Michigan investments — a contrast with her primary rivals.',
        source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2019–2026', tags: ['Consistency'], issueKey: 'econ_trade',
        headline: 'Manufacturing brand grounded in her Auto Task Force role',
        facts: 'Stevens served as chief of staff to the Obama administration\'s federal Auto Task Force before Congress and has built her House tenure and Senate campaign around manufacturing and the auto industry.',
        why: 'A signature issue rooted in genuine prior experience is a credibility signal.',
        source: bp('Haley_Stevens') },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements', 'Rhetoric vs Reality'], issueKey: 'foreign_balance',
        headline: 'Deflected when pressed on pro-Israel super-PAC money',
        facts: 'Asked about heavy spending on her behalf by a pro-Israel super PAC, Stevens did not directly address the money, calling her campaign "a love letter to our state"; she was booed at the 2026 state party convention over her Israel stance.',
        why: 'How a candidate answers questions about outside money funding her race is a transparency read.',
        source: { label: 'The Detroit News', url: 'https://www.detroitnews.com/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements', 'Leadership Style'], issueKey: 'reform_balance',
        headline: 'Defended Schumer as "a great leader"',
        facts: 'Stevens praised Chuck Schumer\'s leadership and credited him with delivering Michigan investments through the CHIPS and Science Act, a contrast with primary rivals who broke with him.',
        why: 'A clear, on-the-record stance on party leadership lets voters place her in the field.',
        source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
    ],
  },

  {
    id: 'mike_rogers', name: 'Mike Rogers', party: 'Republican', state: 'Michigan',
    district: 'Michigan — U.S. Senate', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 64,
    office: 'U.S. Senate — 2026 Republican Candidate (Michigan)',
    bio: "Mike Rogers is the leading Republican candidate for Michigan's open U.S. Senate seat. A former FBI " +
      "agent, he represented Michigan's 8th District in the U.S. House from 2001 to 2015 and chaired the House " +
      "Permanent Select Committee on Intelligence, where he built a national-security profile. He was the 2024 " +
      "Republican Senate nominee, losing to Democrat Elissa Slotkin by about three-tenths of a point in one of " +
      "the closest races of that cycle. Running again in 2026 with President Trump's endorsement — which " +
      "effectively cleared the Republican field — he campaigns on border security, national security, and the " +
      "Trump agenda for the seat being vacated by retiring Sen. Gary Peters.",
    keyIssues: ['Border security', 'National security & China', 'Supporting the Trump agenda', 'Taxes & the economy', 'Energy'],
    accountability: { overallScore: 64, summary:
      "A former U.S. Representative and House Intelligence Committee chairman with a documented federal record, " +
      "and the 2024 Senate nominee who narrowly lost. The score reflects that record; his current Senate " +
      "pledges are marked pending, and his shift on abortion is noted." },
    promises: [
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Supports a border wall and tougher enforcement, making border security a centerpiece of his campaign.', sources: ['https://ballotpedia.org/Mike_Rogers_(Michigan)'] },
      { title: 'Confront national-security threats from China', verdict: 'kept', issueKey: 'strong_defense',
        detail: 'As House Intelligence chairman, oversaw the 2012 investigation that labeled Chinese firms Huawei and ZTE national-security threats.', sources: ['https://www.congress.gov/member/mike-rogers/R000572'] },
      { title: 'Support the Trump agenda', verdict: 'pending', issueKey: 'america_first',
        detail: 'Pledges to "stand with President Trump" and backs his tariff agenda; carries Trump\'s endorsement.', sources: ['https://ballotpedia.org/Mike_Rogers_(Michigan)'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports a border wall and tougher enforcement, making border security a centerpiece of his campaign.' },
      { topic: 'National Security & China', icon: '🦅', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A former FBI agent who chaired the House Intelligence Committee and built his brand on national-security policy.',
        evidence: 'As Intelligence chairman, oversaw the 2012 investigation that labeled Huawei and ZTE national-security threats.', source: cong('https://www.congress.gov/member/mike-rogers/R000572') },
      { topic: 'Supporting the Trump Agenda', icon: '🇺🇸', pos: 'support', issueKey: 'america_first', issueStance: 'support',
        text: 'Pledges to "stand with President Trump" and backs his tariff agenda; carries Trump\'s endorsement.',
        evidence: 'Trump re-endorsed Rogers for 2026, effectively clearing the Republican primary field.', source: bp('Mike_Rogers_(Michigan)') },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'Now says abortion should be left to the states and that he would not try to undo Michigan\'s 2022 constitutional amendment — a shift from earlier support for federal restrictions.',
        evidence: 'Previously co-sponsored fetal-personhood and 20-week-ban legislation in the U.S. House.', source: { label: 'Bridge Michigan', url: 'https://www.bridgemi.com/' } },
      { topic: 'Prescription Drug Prices', icon: '💉', pos: 'oppose', issueKey: 'health_drug_prices', issueStance: 'oppose',
        text: 'Opposes letting Medicare negotiate prescription-drug prices.',
        evidence: 'Supported the 2003 Medicare law that barred Medicare from negotiating drug prices.', source: { label: 'PolitiFact', url: 'https://www.politifact.com/' } },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2012', tags: ['Notable Actions', 'Consistency'], issueKey: 'strong_defense',
        headline: 'Led the Intel probe that flagged Huawei and ZTE',
        facts: 'As House Intelligence Committee chairman, Rogers oversaw a 2012 investigation that labeled Chinese firms Huawei and ZTE national-security threats — a record consistent with the national-security brand he runs on.',
        why: 'A concrete chairmanship achievement that matches his stated focus is a credibility signal.',
        source: cong('https://www.congress.gov/member/mike-rogers/R000572') },
      { impact: 'negative', category: 'rhetoric', date: '2003–2026', tags: ['Rhetoric vs Reality', 'Public Statements'], issueKey: 'repro_balance',
        headline: 'Reversed long-held anti-abortion positions for the Senate run',
        facts: 'Rogers previously co-sponsored fetal-personhood and 20-week-ban legislation in the U.S. House; as a Senate candidate he now says abortion should be left to the states and that he would not try to undo Michigan\'s 2022 abortion-rights amendment.',
        why: 'A shift away from a long-standing position is a consistency question voters can weigh.',
        source: { label: 'Bridge Michigan', url: 'https://www.bridgemi.com/' } },
      { impact: 'negative', category: 'transparency', date: '2020–2024', tags: ['Rhetoric vs Reality', 'Public Statements'], issueKey: 'america_first',
        headline: 'Criticized, then reconciled with, Trump over 2020',
        facts: 'Rogers earlier criticized efforts to overturn the 2020 election result, then reconciled with Donald Trump, accepted his endorsement in 2024 and 2026, and now pledges to "stand with" him.',
        why: 'A documented reversal on a high-profile relationship speaks to consistency.',
        source: { label: 'Michigan Advance', url: 'https://michiganadvance.com/' } },
      { impact: 'neutral', category: 'voting', date: '2003–2026', tags: ['Consistency'], issueKey: 'health_drug_prices',
        headline: 'Long opposed Medicare drug-price negotiation',
        facts: 'Rogers supported the 2003 Medicare law that barred Medicare from negotiating drug prices and has continued to oppose such negotiation as a Senate candidate.',
        why: 'A position held steadily over two decades is a consistency data point on his record.',
        source: { label: 'PolitiFact', url: 'https://www.politifact.com/' } },
    ],
  },

];

// ── Federal House DEEPEN patches (field-masked; never clobber bio) ────────────
// Each entry refreshes the existing officeholder's promise ledger, accountability
// summary, and stance mirror with the verified evidence now reflected in
// index.html. Promise verdicts stay 'pending' unless a signed/enacted law or a
// recorded vote justifies otherwise (Mackenzie's tax pledge → kept via H.R. 1).
const DEEPEN = [
  {
    id: 'ryan_mackenzie',
    accountabilitySummary:
      "A first-term congressman and former state legislator who chaired Pennsylvania's Labor and Industry " +
      "Committee. He now chairs the Education & Workforce Subcommittee on Workforce Protections and voted for " +
      "the 2025 reconciliation/tax law; the score reflects that early federal record.",
    promises: [
      { title: 'Oppose new taxes and extend the 2017 tax cuts', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted for H.R. 1, the 2025 budget-and-tax reconciliation law, which extended the 2017 individual tax cuts.', sources: ['https://www.congress.gov/member/ryan-mackenzie/M001230'] },
      { title: 'Strengthen workforce training and protections', verdict: 'pending', issueKey: 'edu_balance',
        detail: 'Chairs the Education & Workforce Subcommittee on Workforce Protections and has sponsored federal workers\'-compensation reform bills.', sources: ['https://mackenzie.house.gov/media/press-releases/congressman-ryan-mackenzie-named-chairman-workforce-protections-subcommittee'] },
      { title: 'Create jobs and lower costs', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Campaigns on affordability and economic growth in the Lehigh Valley.', sources: ['https://mackenzie.house.gov'] },
      { title: 'Strengthen border security', verdict: 'pending', issueKey: 'border_security',
        detail: 'Calls immigration enforcement a top priority.', sources: ['https://mackenzie.house.gov'] },
    ],
  },
  {
    id: 'rob_bresnahan',
    accountabilitySummary:
      "A first-term congressman and former business executive in a top-tier swing district. He introduced the " +
      "TRUST Act to ban congressional stock trading, delivering on a campaign pledge, though his own active " +
      "trading has since drawn scrutiny; the score reflects that early federal record.",
    promises: [
      { title: 'Ban congressional stock trading', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Introduced the TRUST Act (H.R. 3182) in May 2025 and signed the discharge petition for the End Congressional Stock Trading Act; the proposal has not become law, and reporting found he continued trading heavily through 2025.', sources: ['https://bresnahan.house.gov/media/press-releases/bresnahan-introduces-legislation-ban-stock-trades-announces-plan-form-blind'] },
      { title: 'Lower costs and grow jobs', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Campaigns on the economy and affordability for northeastern Pennsylvania.', sources: ['https://bresnahan.house.gov'] },
      { title: 'Deliver for infrastructure and transportation', verdict: 'pending', issueKey: 'infrastructure',
        detail: 'Serves as Vice Chair of the Transportation & Infrastructure Subcommittee on Highways and Transit.', sources: ['https://bresnahan.house.gov/about/committees-and-caucuses'] },
    ],
  },
  {
    id: 'scott_perry',
    accountabilitySummary:
      "A seven-term congressman, Army National Guard general, and former House Freedom Caucus chair (2022–2024) " +
      "with an extensive House record in a perennial swing district. The score reflects that record, including " +
      "his vote for H.R. 1 despite stated deficit objections; his 2026 pledges are marked pending.",
    promises: [
      { title: 'Cut federal spending and the debt', verdict: 'pending', issueKey: 'national_debt',
        detail: 'A fiscal hawk and former Freedom Caucus chair who pushes deep spending cuts; voted for H.R. 1 in 2025 while publicly criticizing its projected deficit increase.', sources: ['https://thehill.com/homenews/house/581679-house-freedom-caucus-elects-rep-scott-perry-new-chairman/'] },
      { title: 'Secure the border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs strong border enforcement.', sources: ['https://perry.house.gov'] },
      { title: 'Defend gun rights', verdict: 'pending', issueKey: 'gun_rights',
        detail: 'A Second Amendment advocate who opposes new firearms restrictions.', sources: ['https://perry.house.gov'] },
    ],
  },
  {
    id: 'don_davis',
    accountabilitySummary:
      "A second-term congressman and Air Force veteran with a centrist record in a redrawn, Republican-leaning " +
      "district. He voted for the Laken Riley Act — the only North Carolina Democrat to do so — and against " +
      "H.R. 1, and is independently ranked among the most bipartisan House members; the score reflects that record.",
    promises: [
      { title: 'Stand up for farmers and rural North Carolina', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Sits on the House Agriculture Committee and prioritizes farmers and rural eastern North Carolina.', sources: ['https://davis.house.gov'] },
      { title: 'Vote independently of party when the district demands', verdict: 'kept', issueKey: 'reform_balance',
        detail: 'Voted for the Laken Riley Act in 2025, the only North Carolina Democrat to do so, and against H.R. 1, calling it fiscally irresponsible.', sources: ['https://dondavis.house.gov/media/press-releases/congressman-don-davis-votes-again-laken-riley-act'] },
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Pledges to protect earned benefits from cuts.', sources: ['https://davis.house.gov'] },
      { title: 'Support veterans and military families', verdict: 'pending', issueKey: 'veterans',
        detail: 'An Air Force veteran focused on veterans’ services.', sources: ['https://davis.house.gov'] },
    ],
  },
  {
    id: 'mariannette_miller_meeks',
    accountabilitySummary:
      "A three-term congresswoman, physician, and Army veteran in one of the nation's closest districts. She " +
      "co-led year-round E15 biofuel legislation and voted for H.R. 1, declining to sign a letter opposing its " +
      "Medicaid reductions; the score reflects that House record, and her 2026 pledges are marked pending.",
    promises: [
      { title: 'Support Iowa farmers and biofuels', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Co-led H.R. 1346 to permanently allow year-round nationwide E15 sales and voted for it on House passage; champions the Renewable Fuel Standard.', sources: ['https://millermeeks.house.gov/media/press-releases/miller-meeks-votes-deliver-year-round-e15'] },
      { title: 'Improve rural health-care access', verdict: 'pending', issueKey: 'health_rural',
        detail: 'A physician on the Energy and Commerce Committee who has promoted her own legislation she says targets the "root causes" of high health-insurance premiums.', sources: ['https://iowacapitaldispatch.com/2025/12/15/miller-meeks-says-her-health-care-bill-would-address-root-causes-of-high-premiums/'] },
      { title: 'Support veterans', verdict: 'pending', issueKey: 'veterans',
        detail: 'An Army veteran focused on veterans’ care.', sources: ['https://millermeeks.house.gov'] },
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
function counts(promises) {
  return {
    kept: promises.filter(x => x.verdict === 'kept').length,
    broken: promises.filter(x => x.verdict === 'broken').length,
    pending: promises.filter(x => x.verdict === 'pending').length,
  };
}
function promisesDoc(promises) {
  return promises.map(pr => ({
    title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));
}

// Build the full Firestore document body for one NEW Michigan person.
function buildDoc(p) {
  const { kept, broken, pending } = counts(p.promises);
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;
  const fields = {
    name: p.name, office: p.office, party: p.party, state: p.state, icon: p.icon, bio: p.bio,
    keyIssues: p.keyIssues, promises: promisesDoc(p.promises), stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending, score: p.score, tier: tierForScore(p.score),
    profileStatus: 'full', candidacyStatus: p.candidacyStatus, nextElection: p.nextElection, updatedAt: STAMP,
  };
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.spotlight) fields.spotlight = p.spotlight;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}

// Build a field-masked PATCH for a House DEEPEN (touch only the listed fields).
function buildDeepen(d) {
  const { kept, broken, pending } = counts(d.promises);
  const stances = d.stances || undefined;
  const fields = {
    promises: promisesDoc(d.promises),
    kept, broken, pending,
    accountability: { summary: d.accountabilitySummary, kept, broken, pending },
    updatedAt: STAMP,
  };
  if (stances) fields.stances = stances;
  return fields;
}

async function exists(id) { const r = await fetch(`${BASE}/${id}`); return r.ok; }

async function createDoc(id, fields) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// Field-masked PATCH — only the named top-level fields are written.
async function patchDoc(id, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html blocks (parity with the hand-applied edits) ───────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitStanceBlock() {
  const out = ['    // ── Michigan 2026 U.S. Senate (open seat — Peters retiring) · primary Aug 4, 2026 ──'];
  for (const p of MICHIGAN) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}
function emitSpotlightBlock() {
  const out = [];
  for (const p of MICHIGAN) {
    out.push(`      ${p.id}: [`);
    for (const s of p.spotlight) {
      const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(', ');
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`);
      out.push(`          headline:'${esc(s.headline)}',`);
      out.push(`          facts:'${esc(s.facts)}',`);
      out.push(`          why:'${esc(s.why)}',`);
      out.push(`          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`);
    }
    out.push('      ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Michigan Senate + federal deepening  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  let validKeys = null;
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    validKeys = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    const check = (id, key, where) => { if (!validKeys.has(key)) { console.log(`  ⚠ ${id}: unknown ${where} issueKey '${key}'`); bad++; } };
    for (const p of MICHIGAN) {
      for (const c of p.positions) check(p.id, c.issueKey, 'stance');
      for (const pr of p.promises) check(p.id, pr.issueKey, 'promise');
      for (const s of (p.spotlight || [])) check(p.id, s.issueKey, 'spotlight');
    }
    for (const d of DEEPEN) for (const pr of d.promises) check(d.id, pr.issueKey, 'promise');
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${validKeys.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    writeFileSync('/tmp/michigan-stance-block.txt', emitStanceBlock());
    writeFileSync('/tmp/michigan-spotlight-block.txt', emitSpotlightBlock());
    console.log('Wrote ISSUE_STANCE_DATA block → /tmp/michigan-stance-block.txt');
    console.log('Wrote ACCT_SPOTLIGHT block   → /tmp/michigan-spotlight-block.txt\n');
  }

  // 1) New Michigan records.
  console.log('Michigan U.S. Senate — new candidate profiles:');
  for (const p of MICHIGAN) {
    const fields = buildDoc(p);
    const { kept, broken, pending } = counts(p.promises);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${kept}K/${broken}B/${pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else { console.log(`  → ${tag}`); }
  }

  // 2) Federal House deepening patches (field-masked).
  console.log('\nFederal House incumbents — deepening patches (promises / accountability):');
  for (const d of DEEPEN) {
    const fields = buildDeepen(d);
    const { kept, broken, pending } = counts(d.promises);
    const tag = `${d.id} · ${kept}K/${broken}B/${pending}P promises · field-masked PATCH`;
    if (APPLY) {
      if (!await exists(d.id)) { console.log(`  · ${tag}: target missing — skipped (run the federal wave first)`); continue; }
      await patchDoc(d.id, fields);
      console.log(`  ✎ ${tag}`);
    } else { console.log(`  → ${tag}`); }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${MICHIGAN.length} new Michigan records, ${DEEPEN.length} House deepening patches.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html blocks, --apply to write Firestore.');
})();
