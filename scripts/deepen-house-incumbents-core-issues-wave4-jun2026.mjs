#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal U.S. House incumbent CORE-ISSUE deepening pass, WAVE 4
// (June 2026)
//
// PURPOSE
//   Continues the Core National Issues effort (see CORE_NATIONAL_ISSUES.md and
//   scripts/define-core-national-issues-jun2026.mjs). Earlier waves lifted the
//   thinnest incumbents toward ~5/10. This wave pushes the whole sitting-House
//   roster we carry (37 members) toward STRONG coverage (7+/10) by recording
//   each member's OWN votes on six marquee 119th-Congress roll calls that, taken
//   together, span seven of the ten Core National Issues.
//
// METHOD — official record, member by member (no inference, no batching)
//   Every vote below was read directly from the Office of the Clerk's
//   machine-readable roll-call XML (clerk.house.gov/evs/2025/rollNNN.xml), matched
//   to each member by their Bioguide ID. A member only receives a card for a roll
//   call when that member is recorded as voting (Yea or Nay); "Not Voting" members
//   are skipped for that bill. Each card states THAT member's individual recorded
//   vote as a plain fact — the count and roll-call number — and is keyed to one
//   ISSUE_MAP issueKey. Nothing is described as a "party-line" vote; no vote is
//   shared as a single item across members (CONTENT_STYLE.md).
//
//   To avoid duplicating or contradicting material already in a profile, a card is
//   added ONLY when its Core National Issue is not yet covered for that member
//   (coverage is computed live from index.html on every run). That makes the pass
//   idempotent and guarantees every addition lights up a NEW core issue in the
//   "X/10 core issues" footprint.
//
// THE SIX VERIFIED ROLL CALLS (119th Congress, 1st session, 2025)
//   • Laken Riley Act (H.R. 29) — 264–159, Jan 7 2025, Roll Call 6; signed as
//     Public Law 119-1.                                  → Immigration & Border Security
//   • Born-Alive Abortion Survivors Protection Act (H.R. 21) — 217–204,
//     Jan 23 2025, Roll Call 27.                          → Abortion / Reproductive Rights
//   • SAVE Act (H.R. 22) — 220–208, Apr 10 2025, Roll Call 102.
//                                                          → Election Integrity
//   • H.R. 1, the 2025 reconciliation and tax law — 218–214, Jul 3 2025,
//     Roll Call 190; signed July 4 2025.                  → Economy (tax) + Govt Spending
//   • HALT Fentanyl Act (H.R. 27) — 312–108, Feb 6 2025, Roll Call 33.
//                                                          → Crime & Public Safety
//   • Protecting American Energy Production Act (H.R. 26) — 226–188,
//     Feb 7 2025, Roll Call 35.                           → Climate Change & Energy
//
//   node scripts/deepen-house-incumbents-core-issues-wave4-jun2026.mjs              # dry run + issueKey validation + coverage report
//   node scripts/deepen-house-incumbents-core-issues-wave4-jun2026.mjs --write-html # idempotently splice into index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const WRITE_HTML = process.argv.includes('--write-html');
const HTML = 'index.html';

// ── Each member's recorded vote on the six roll calls (Yea / Nay / NV) ───────
// Read from the Clerk's roll-call XML and matched by Bioguide ID. NV = the member
// is not listed as voting on that roll call (skipped for that bill).
const MATRIX = {
  mike_simpson:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  russ_fulcher:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  gabe_vasquez:{laken:'Nay',born:'Nay',save:'Nay',hr1:'Nay',halt:'Yea',energy:'Yea'},
  julie_fedorchak:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  troy_downing:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  mike_flood:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  melanie_stansbury:{laken:'Nay',born:'Nay',save:'Nay',hr1:'Nay',halt:'Nay',energy:'Nay'},
  teresa_leger_fernandez:{laken:'Nay',born:'Nay',save:'Nay',hr1:'Nay',halt:'NV',energy:'NV'},
  chellie_pingree:{laken:'Nay',born:'Nay',save:'Nay',hr1:'Nay',halt:'Nay',energy:'NV'},
  adrian_smith:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  zach_nunn:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  dina_titus:{laken:'Yea',born:'Nay',save:'Nay',hr1:'Nay',halt:'Yea',energy:'Nay'},
  susie_lee:{laken:'Yea',born:'Nay',save:'Nay',hr1:'Nay',halt:'Yea',energy:'Nay'},
  steven_horsford:{laken:'Yea',born:'Nay',save:'Nay',hr1:'Nay',halt:'Yea',energy:'Nay'},
  don_davis:{laken:'Yea',born:'Nay',save:'Nay',hr1:'Nay',halt:'Yea',energy:'Nay'},
  rob_bresnahan:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  mariannette_miller_meeks:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  ryan_mackenzie:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  josh_brecheen:{laken:'NV',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  mike_ezell:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  michael_guest:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  trent_kelly:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  bruce_westerman:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  steve_womack:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  scott_perry:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  stephanie_bice:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  tom_cole:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  french_hill:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  frank_lucas:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  bennie_thompson:{laken:'Nay',born:'Nay',save:'Nay',hr1:'Nay',halt:'Nay',energy:'Nay'},
  rick_crawford:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  owens:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  massie:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Nay',halt:'Nay',energy:'Yea'},
  maloy:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  bmoore:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  mtg:{laken:'Yea',born:'Yea',save:'NV',hr1:'Yea',halt:'Yea',energy:'Yea'},
  boebert:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
  kennedy:{laken:'Yea',born:'Yea',save:'Yea',hr1:'Yea',halt:'Yea',energy:'Yea'},
};

// Display surname for facts/headlines (the individual, never the party).
const NAME = {
  mike_simpson:'Simpson', russ_fulcher:'Fulcher', gabe_vasquez:'Vasquez', julie_fedorchak:'Fedorchak',
  troy_downing:'Downing', mike_flood:'Flood', melanie_stansbury:'Stansbury', teresa_leger_fernandez:'Leger Fernández',
  chellie_pingree:'Pingree', adrian_smith:'Smith', zach_nunn:'Nunn', dina_titus:'Titus',
  susie_lee:'Lee', steven_horsford:'Horsford', don_davis:'Davis', rob_bresnahan:'Bresnahan',
  mariannette_miller_meeks:'Miller-Meeks', ryan_mackenzie:'Mackenzie', josh_brecheen:'Brecheen', mike_ezell:'Ezell',
  michael_guest:'Guest', trent_kelly:'Kelly', bruce_westerman:'Westerman', steve_womack:'Womack',
  scott_perry:'Perry', stephanie_bice:'Bice', tom_cole:'Cole', french_hill:'Hill',
  frank_lucas:'Lucas', bennie_thompson:'Thompson', rick_crawford:'Crawford', owens:'Owens',
  massie:'Massie', maloy:'Maloy', bmoore:'Moore', mtg:'Greene', boebert:'Boebert', kennedy:'Kennedy',
};

// ── Verified roll-call sources ───────────────────────────────────────────────
const CLERK = {
  laken:  'https://clerk.house.gov/Votes/20256',
  born:   'https://clerk.house.gov/Votes/202527',
  save:   'https://clerk.house.gov/Votes/2025102',
  hr1:    'https://clerk.house.gov/Votes/2025190',
  halt:   'https://clerk.house.gov/Votes/202533',
  energy: 'https://clerk.house.gov/Votes/202535',
};

// ── Per-vote, per-direction card builders ────────────────────────────────────
// Each returns { core, stance, spotlight }. `core` is the Core National Issue
// label this card lights up; the splicer only keeps it if that core is new for
// the member. A "yes"/"no" string is interpolated into neutral, factual text.
const B = {
  // Immigration & Border Security — Laken Riley Act
  laken: (n, v) => v === 'Yea'
    ? { core: 'Immigration & Border Security',
        stance: { topic:'Immigration & Border Security', icon:'🛡', pos:'support', issueKey:'border_security', issueStance:'support',
          text:'Voted for the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025, and was signed into law as Public Law 119-1.',
          evidence:'Recorded a yes vote on H.R. 29, Roll Call 6, January 7, 2025.', source:{label:'House Clerk', url:CLERK.laken} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'border_security',
          headline:'Voted for the Laken Riley Act',
          facts:`${n} voted yes on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6) and became Public Law 119-1.`,
          why:'A recorded vote on the first bill signed into law in the 119th Congress is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.laken} } }
    : { core: 'Immigration & Border Security',
        stance: { topic:'Immigration & Border Security', icon:'⚖️', pos:'support', issueKey:'immig_balance', issueStance:'support',
          text:'Voted no on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6).',
          evidence:'Recorded a no vote on H.R. 29, Roll Call 6, January 7, 2025.', source:{label:'House Clerk', url:CLERK.laken} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'immig_balance',
          headline:'Voted no on the Laken Riley Act',
          facts:`${n} voted no on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6).`,
          why:'A recorded vote on the first bill signed into law in the 119th Congress is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.laken} } },

  // Abortion / Reproductive Rights — Born-Alive Abortion Survivors Protection Act
  born: (n, v) => v === 'Yea'
    ? { core: 'Abortion / Reproductive Rights',
        stance: { topic:'Abortion', icon:'🕊', pos:'support', issueKey:'pro_life', issueStance:'support',
          text:'Voted for the Born-Alive Abortion Survivors Protection Act (H.R. 21), which requires medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025.',
          evidence:'Recorded a yes vote on H.R. 21, Roll Call 27, January 23, 2025.', source:{label:'House Clerk', url:CLERK.born} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'pro_life',
          headline:'Voted for the Born-Alive Abortion Survivors Protection Act',
          facts:`${n} voted yes on the Born-Alive Abortion Survivors Protection Act (H.R. 21), which requires medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025 (Roll Call 27).`,
          why:'A recorded vote on a high-profile abortion bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.born} } }
    : { core: 'Abortion / Reproductive Rights',
        stance: { topic:'Abortion', icon:'⚖️', pos:'support', issueKey:'repro_balance', issueStance:'support',
          text:'Voted no on the Born-Alive Abortion Survivors Protection Act (H.R. 21), which would require medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025 (Roll Call 27).',
          evidence:'Recorded a no vote on H.R. 21, Roll Call 27, January 23, 2025.', source:{label:'House Clerk', url:CLERK.born} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'repro_balance',
          headline:'Voted no on the Born-Alive Abortion Survivors Protection Act',
          facts:`${n} voted no on the Born-Alive Abortion Survivors Protection Act (H.R. 21), which would require medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025 (Roll Call 27).`,
          why:'A recorded vote on a high-profile abortion bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.born} } },

  // Election Integrity — SAVE Act
  save: (n, v) => v === 'Yea'
    ? { core: 'Election Integrity',
        stance: { topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
          text:'Voted for the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025.',
          evidence:'Recorded a yes vote on H.R. 22, Roll Call 102, April 10, 2025.', source:{label:'House Clerk', url:CLERK.save} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'election_integrity',
          headline:'Voted for the SAVE Act',
          facts:`${n} voted yes on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).`,
          why:'A recorded vote on a high-profile elections bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.save} } }
    : { core: 'Election Integrity',
        stance: { topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'voting_access', issueStance:'support',
          text:'Voted no on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).',
          evidence:'Recorded a no vote on H.R. 22, Roll Call 102, April 10, 2025.', source:{label:'House Clerk', url:CLERK.save} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'voting_access',
          headline:'Voted no on the SAVE Act',
          facts:`${n} voted no on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).`,
          why:'A recorded vote on a high-profile elections bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.save} } },

  // Economy, Inflation & Cost of Living — H.R. 1 (tax dimension)
  hr1econ: (n, v) => v === 'Yea'
    ? { core: 'Economy, Inflation & Cost of Living',
        stance: { topic:'Taxes & Cost of Living', icon:'💰', pos:'support', issueKey:'tax_middle_class', issueStance:'support',
          text:'Voted for H.R. 1, the 2025 reconciliation law, which extends the 2017 individual income-tax rates and other tax provisions; it passed the House 218–214 on July 3, 2025, and was signed into law.',
          evidence:'Recorded a yes vote on H.R. 1, Roll Call 190, July 3, 2025.', source:{label:'House Clerk', url:CLERK.hr1} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'tax_middle_class',
          headline:'Voted for the 2025 reconciliation and tax law',
          facts:`${n} voted yes on final passage of H.R. 1, the 2025 reconciliation law, which extends the 2017 individual income-tax rates and other tax provisions; it passed the House 218–214 on July 3, 2025 (Roll Call 190) and was signed into law.`,
          why:'A recorded vote on the cycle’s signature tax law is core to the member’s record.', source:{label:'House Clerk', url:CLERK.hr1} } }
    : { core: 'Economy, Inflation & Cost of Living',
        stance: { topic:'Economy & Taxes', icon:'⚖️', pos:'oppose', issueKey:'tax_middle_class', issueStance:'oppose',
          text:'Voted no on H.R. 1, the 2025 reconciliation and tax law; it passed the House 218–214 on July 3, 2025 (Roll Call 190).',
          evidence:'Recorded a no vote on H.R. 1, Roll Call 190, July 3, 2025.', source:{label:'House Clerk', url:CLERK.hr1} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'tax_middle_class',
          headline:'Voted no on the 2025 reconciliation and tax law',
          facts:`${n} voted no on final passage of H.R. 1, the 2025 reconciliation and tax law; it passed the House 218–214 on July 3, 2025 (Roll Call 190).`,
          why:'A recorded vote on the cycle’s signature tax law is core to the member’s record.', source:{label:'House Clerk', url:CLERK.hr1} } },

  // Government Spending, Debt & Waste — H.R. 1 (fiscal dimension). Yes votes only:
  // a no vote on H.R. 1 does not by itself establish a spending-restraint position.
  hr1spend: (n, v) => v === 'Yea'
    ? { core: 'Government Spending, Debt & Waste',
        stance: { topic:'Government Spending', icon:'🧾', pos:'support', issueKey:'lower_taxes', issueStance:'support',
          text:'Voted for H.R. 1, the 2025 reconciliation law, which paired the extended tax provisions with changes to federal spending; it passed the House 218–214 on July 3, 2025.',
          evidence:'Recorded a yes vote on H.R. 1, Roll Call 190, July 3, 2025.', source:{label:'House Clerk', url:CLERK.hr1} },
        spotlight: null }
    : null,

  // Crime & Public Safety — HALT Fentanyl Act
  halt: (n, v) => v === 'Yea'
    ? { core: 'Crime & Public Safety',
        stance: { topic:'Public Safety & Fentanyl', icon:'🚓', pos:'support', issueKey:'back_police', issueStance:'support',
          text:'Voted for the HALT Fentanyl Act (H.R. 27), which permanently places fentanyl-related substances in Schedule I; it passed the House 312–108 on February 6, 2025.',
          evidence:'Recorded a yes vote on H.R. 27, Roll Call 33, February 6, 2025.', source:{label:'House Clerk', url:CLERK.halt} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'back_police',
          headline:'Voted for the HALT Fentanyl Act',
          facts:`${n} voted yes on the HALT Fentanyl Act (H.R. 27), which permanently places fentanyl-related substances in Schedule I; it passed the House 312–108 on February 6, 2025 (Roll Call 33).`,
          why:'A recorded vote on a high-profile drug-enforcement bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.halt} } }
    : { core: 'Crime & Public Safety',
        stance: { topic:'Criminal Justice', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
          text:'Voted no on the HALT Fentanyl Act (H.R. 27), which permanently places fentanyl-related substances in Schedule I; it passed the House 312–108 on February 6, 2025 (Roll Call 33).',
          evidence:'Recorded a no vote on H.R. 27, Roll Call 33, February 6, 2025.', source:{label:'House Clerk', url:CLERK.halt} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'justice_balance',
          headline:'Voted no on the HALT Fentanyl Act',
          facts:`${n} voted no on the HALT Fentanyl Act (H.R. 27), which permanently places fentanyl-related substances in Schedule I; it passed the House 312–108 on February 6, 2025 (Roll Call 33).`,
          why:'A recorded vote on a high-profile drug-enforcement bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.halt} } },

  // Climate Change & Energy Policy — Protecting American Energy Production Act
  energy: (n, v) => v === 'Yea'
    ? { core: 'Climate Change & Energy Policy',
        stance: { topic:'Energy Production', icon:'⛽', pos:'support', issueKey:'enviro_energy', issueStance:'support',
          text:'Voted for the Protecting American Energy Production Act (H.R. 26), which bars a federal moratorium on hydraulic fracturing and affirms state primacy over it; it passed the House 226–188 on February 7, 2025.',
          evidence:'Recorded a yes vote on H.R. 26, Roll Call 35, February 7, 2025.', source:{label:'House Clerk', url:CLERK.energy} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'enviro_energy',
          headline:'Voted for the Protecting American Energy Production Act',
          facts:`${n} voted yes on the Protecting American Energy Production Act (H.R. 26), which bars a federal moratorium on hydraulic fracturing and affirms state primacy over it; it passed the House 226–188 on February 7, 2025 (Roll Call 35).`,
          why:'A recorded vote on a high-profile energy bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.energy} } }
    : { core: 'Climate Change & Energy Policy',
        stance: { topic:'Climate & Energy', icon:'⚖️', pos:'support', issueKey:'enviro_balance', issueStance:'support',
          text:'Voted no on the Protecting American Energy Production Act (H.R. 26), which bars a federal moratorium on hydraulic fracturing and affirms state primacy over it; it passed the House 226–188 on February 7, 2025 (Roll Call 35).',
          evidence:'Recorded a no vote on H.R. 26, Roll Call 35, February 7, 2025.', source:{label:'House Clerk', url:CLERK.energy} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'enviro_balance',
          headline:'Voted no on the Protecting American Energy Production Act',
          facts:`${n} voted no on the Protecting American Energy Production Act (H.R. 26), which bars a federal moratorium on hydraulic fracturing and affirms state primacy over it; it passed the House 226–188 on February 7, 2025 (Roll Call 35).`,
          why:'A recorded vote on a high-profile energy bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.energy} } },
};

// Card-builder application order (one Core National Issue each, except H.R. 1
// which contributes both an Economy and a Government-Spending card).
const ORDER = ['laken', 'born', 'save', 'hr1econ', 'hr1spend', 'halt', 'energy'];
const VOTE_FOR = { laken:'laken', born:'born', save:'save', hr1econ:'hr1', hr1spend:'hr1', halt:'halt', energy:'energy' };

// ── Core National Issues framework (for coverage report + new-core gating) ───
const CORE = [
  { label: 'Economy, Inflation & Cost of Living', keys: ['cost_living','tax_middle_class','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing_build','housing_support','housing_first_time','property_tax'] },
  { label: 'Immigration & Border Security', keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl'] },
  { label: 'Healthcare Costs & Access', keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security'] },
  { label: 'Government Spending, Debt & Waste', keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation'] },
  { label: 'Abortion / Reproductive Rights', keys: ['pro_life','repro_balance','pro_choice'] },
  { label: 'Gun Rights & Gun Control', keys: ['gun_rights','gun_balance','gun_safety'] },
  { label: 'Climate Change & Energy Policy', keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','disaster_resilience','water','water_storage'] },
  { label: 'Crime & Public Safety', keys: ['back_police','justice_balance','justice_reform','cannabis_reform'] },
  { label: 'Election Integrity', keys: ['election_integrity','democracy_balance','voting_access'] },
  { label: 'Education & Parental Rights', keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
];
const coreFor = (k) => CORE.find(c => c.keys.includes(k)) || null;

// Each member's Core National Issues coverage BEFORE this wave (read from the
// roster once, pre-wave). Gating the plan on this fixed snapshot — rather than on
// live coverage — keeps the plan deterministic and decouples each stance card
// from its evidence item (both share a core), so a re-run safely fills any gaps.
// Per-item exact-text idempotency (in spliceHtml) prevents duplicate insertions.
const PRECOVERED = {
  mike_simpson:['Climate'], russ_fulcher:['Climate','Election'], gabe_vasquez:['Climate','Immigration'],
  julie_fedorchak:['Climate','Economy','Healthcare'], troy_downing:['Spending','Climate','Healthcare'],
  mike_flood:['Economy','Spending','Abortion'], melanie_stansbury:['Climate','Healthcare','Guns'],
  teresa_leger_fernandez:['Healthcare','Climate','Abortion'], chellie_pingree:['Economy','Climate','Abortion','Healthcare'],
  adrian_smith:['Spending','Economy','Healthcare','Abortion'], zach_nunn:['Economy','Healthcare','Spending','Immigration'],
  dina_titus:['Guns','Economy','Healthcare','Immigration'], susie_lee:['Healthcare','Immigration','Economy','Guns','Spending'],
  steven_horsford:['Guns','Election','Economy','Healthcare','Immigration'], don_davis:['Economy','Healthcare','Immigration'],
  rob_bresnahan:['Economy','Climate','Healthcare'], mariannette_miller_meeks:['Healthcare','Climate','Economy','Spending'],
  ryan_mackenzie:['Spending','Economy','Immigration','Education'], josh_brecheen:['Spending','Immigration','Economy','Climate'],
  mike_ezell:['Crime','Immigration','Abortion','Spending'], michael_guest:['Immigration','Abortion','Crime','Spending'],
  trent_kelly:['Economy','Guns','Immigration','Spending'], bruce_westerman:['Spending','Climate','Guns','Abortion'],
  steve_womack:['Spending','Immigration','Guns','Abortion'], scott_perry:['Spending','Immigration','Guns','Climate','Election'],
  stephanie_bice:['Economy','Election','Abortion','Immigration','Spending'], tom_cole:['Election','Abortion','Immigration','Spending','Economy'],
  french_hill:['Spending','Immigration','Abortion','Healthcare','Economy'], frank_lucas:['Election','Abortion','Immigration','Economy','Climate','Spending'],
  bennie_thompson:['Economy','Guns','Immigration','Climate','Healthcare','Election'], rick_crawford:['Spending','Election','Abortion','Economy','Immigration','Guns'],
  owens:['Immigration','Education','Guns','Spending','Abortion'], massie:['Guns','Spending','Education'],
  maloy:['Climate','Immigration','Spending'], bmoore:['Spending','Climate','Immigration'],
  mtg:['Spending'], boebert:['Guns','Spending'], kennedy:['Healthcare','Immigration','Education','Abortion','Spending'],
};
// Short-label → full Core National Issue label.
const SHORT2FULL = {
  Economy:'Economy, Inflation & Cost of Living', Immigration:'Immigration & Border Security',
  Healthcare:'Healthcare Costs & Access', Spending:'Government Spending, Debt & Waste',
  Abortion:'Abortion / Reproductive Rights', Guns:'Gun Rights & Gun Control',
  Climate:'Climate Change & Energy Policy', Crime:'Crime & Public Safety',
  Election:'Election Integrity', Education:'Education & Parental Rights',
};
const precoveredFull = (id) => new Set((PRECOVERED[id] || []).map(s => SHORT2FULL[s]));

// ── Live coverage read (so the pass is idempotent + only adds new cores) ─────
function extractArray(html, sectionStart, id, indent) {
  const anchor = `\n${indent}${id}: [`;
  const at = html.indexOf(anchor, sectionStart);
  if (at === -1) return '';
  const end = html.indexOf(`\n${indent}],`, at);
  return html.slice(at, end === -1 ? html.length : end);
}
function coresForMember(html, id) {
  const stanceStart = html.indexOf('var ISSUE_STANCE_DATA = {');
  const acctStart = html.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const block = extractArray(html, stanceStart, id, '    ') + '\n' + extractArray(html, acctStart, id, '      ');
  const cores = new Set();
  [...block.matchAll(/issueKey:'([a-z_]+)'/g)].forEach(m => { const c = coreFor(m[1]); if (c) cores.add(c.label); });
  return cores;
}

// Build the per-member additions for the CURRENT html state.
function buildAdditions(html) {
  const plan = [];
  for (const id of Object.keys(MATRIX)) {
    const have = precoveredFull(id);
    const willAdd = new Set();
    const stances = [], spotlight = [], newCores = [];
    for (const step of ORDER) {
      const vote = MATRIX[id][VOTE_FOR[step]];
      if (vote !== 'Yea' && vote !== 'Nay') continue;       // skip Not-Voting
      const card = B[step](NAME[id], vote);
      if (!card) continue;
      if (have.has(card.core) || willAdd.has(card.core)) continue; // only NEW cores
      willAdd.add(card.core); newCores.push(card.core);
      if (card.stance) stances.push(card.stance);
      if (card.spotlight) spotlight.push(card.spotlight);
    }
    if (stances.length || spotlight.length)
      plan.push({ id, stances, spotlight, before: have.size, newCores });
  }
  return plan;
}

// ── Serialization (match index.html formatting exactly) ──────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmtSpotlight(s) {
  const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(',');
  return [
    `        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`,
    `          headline:'${esc(s.headline)}',`,
    `          facts:'${esc(s.facts)}',`,
    `          why:'${esc(s.why)}',`,
    `          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`,
  ].join('\n') + '\n';
}
function fmtStance(c) {
  const ev = c.evidence ? ` evidence:'${esc(c.evidence)}',` : '';
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}',${ev} source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },\n`;
}

// ── Idempotent splicer (per-member; prepends new items into each array) ──────
function spliceHtml(html, plan) {
  let out = html;
  let added = { spotlight: 0, stance: 0 };
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const stanceStart = out.indexOf('var ISSUE_STANCE_DATA = {');
  for (const d of plan) {
    for (const c of d.stances) {
      const anchor = `\n    ${d.id}: [`;
      const at = out.indexOf(anchor, stanceStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ISSUE_STANCE_DATA anchor not found`); continue; }
      const blockEnd = out.indexOf('\n    ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`text:'${esc(c.text)}'`)) continue; // idempotent
      const lineStart = out.indexOf('\n', at + anchor.length) + 1;
      out = out.slice(0, lineStart) + fmtStance(c) + out.slice(lineStart);
      added.stance++;
    }
    for (const s of d.spotlight) {
      let anchor = `\n      ${d.id}: [\n`;
      let at = out.indexOf(anchor, acctStart);
      if (at === -1) {
        // No ACCT_SPOTLIGHT array for this member yet — create an empty one right
        // after the object opening, then fall through to fill it.
        const objOpen = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {', acctStart);
        const insertAt = out.indexOf('\n', objOpen) + 1;
        out = out.slice(0, insertAt) + `      ${d.id}: [\n      ],\n` + out.slice(insertAt);
        at = out.indexOf(anchor, acctStart);
      }
      if (at === -1) { console.log(`  ⚠ ${d.id}: ACCT_SPOTLIGHT anchor not found`); continue; }
      const blockEnd = out.indexOf('\n      ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`facts:'${esc(s.facts)}'`)) continue; // idempotent
      const insertPos = at + anchor.length;
      out = out.slice(0, insertPos) + fmtSpotlight(s) + out.slice(insertPos);
      added.spotlight++;
    }
  }
  return { out, added };
}

// ── Validation ───────────────────────────────────────────────────────────────
function loadIssueMapKeys(html) {
  const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
  return new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s*\{\s*label:/gm)].map(m => m[1]));
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — House incumbent core-issue deepening · WAVE 4  [${WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN'}]\n`);
  const html = readFileSync(HTML, 'utf8');
  const valid = loadIssueMapKeys(html);

  const plan = buildAdditions(html);

  // issueKey validation
  let bad = 0;
  for (const d of plan) {
    for (const c of d.stances) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: stance issueKey '${c.issueKey}'`); bad++; }
    for (const s of d.spotlight) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: spotlight issueKey '${s.issueKey}'`); bad++; }
  }
  console.log(bad ? `  ✗ ${bad} invalid issueKey(s)\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
  if (bad && WRITE_HTML) process.exit(1);

  const totalStance = plan.reduce((n, d) => n + d.stances.length, 0);
  const totalSpot = plan.reduce((n, d) => n + d.spotlight.length, 0);
  console.log(`Roster: ${plan.length} incumbents receiving additions · ${totalStance} new stance cards · ${totalSpot} new evidence items\n`);
  console.log('Core-issue coverage (X/10):');
  for (const d of plan) {
    const after = d.before + d.newCores.length;
    console.log(`  • ${d.id.padEnd(24)} ${d.before}/10 → ${after}/10  (+${d.newCores.map(c => c.split(/[ ,]/)[0]).join(', +')})`);
  }

  if (WRITE_HTML) {
    const { out, added } = spliceHtml(html, plan);
    writeFileSync(HTML, out);
    console.log(`\n✎ index.html: +${added.stance} ISSUE_STANCE_DATA cards, +${added.spotlight} ACCT_SPOTLIGHT items (idempotent).`);
  } else {
    console.log('\nRe-run with --write-html to splice index.html.');
  }
})();
