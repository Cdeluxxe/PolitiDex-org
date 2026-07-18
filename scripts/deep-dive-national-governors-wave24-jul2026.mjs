#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: HIGH-IMPACT STATE GOVERNORS, WAVE 24
// (July 2026) — after waves 1-23.
// ---------------------------------------------------------------------------
// The marquee governors (Newsom, Abbott, DeSantis, Whitmer, Shapiro, Pritzker,
// Hochul, and the wave 20-22 tiers) are already covered. This wave fills the
// biggest remaining STATE gaps — consequential swing-state and large-state
// governors who anchor the national debates our Spotlights track — balanced
// 5D / 5R:
//
//   DEMOCRATS
//   • TONY EVERS (evers) — Wisconsin: public schools, abortion, healthcare, guns.
//   • JOSH STEIN (josh_stein) — North Carolina: abortion, Helene recovery,
//     public schools, Medicaid.
//   • MAURA HEALEY (maura_healey) — Massachusetts: abortion, housing, the migrant
//     shelter squeeze, climate, free community college.
//   • TINA KOTEK (tina_kotek) — Oregon: housing & homelessness, drug-law course
//     correction, abortion, climate, LGBTQ+.
//   • MIKIE SHERRILL (mikie_sherrill) — New Jersey: affordability, energy costs,
//     abortion, gun safety.
//
//   REPUBLICANS
//   • JOE LOMBARDO (joe_lombardo) — Nevada: school choice, crime, border, taxes,
//     a cross-pressured abortion stance.
//   • BILL LEE (bill_lee) — Tennessee: universal vouchers, abortion, immigration,
//     taxes, energy.
//   • HENRY McMASTER (henry_mcmaster) — South Carolina: abortion, school choice,
//     energy, taxes, immigration.
//   • MIKE KEHOE (mike_kehoe) — Missouri: crime, abortion, taxes, immigration,
//     school choice.
//   • KAY IVEY (kay_ivey) — Alabama: abortion, IVF, school choice, taxes, energy.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Genuinely
// cross-pressured records (Lombardo declining to roll back Nevada's abortion law;
// Healey capping the shelter program; Kotek's drug-law reversal; Ivey restarting
// IVF; Kehoe opposing a voter-approved amendment) are marked mixed or attributed.
// Sources are official governor's-office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-governors-wave24-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-governors-wave24-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const S = {
  evers: { label: 'governor.wi.gov', url: 'https://evers.wi.gov/Pages/Newsroom/Press-Releases.aspx' },
  stein: { label: 'governor.nc.gov', url: 'https://governor.nc.gov/news/press-releases' },
  healey: { label: 'mass.gov/governor', url: 'https://www.mass.gov/orgs/office-of-governor-maura-healey-and-lt-governor-kim-driscoll' },
  kotek: { label: 'oregon.gov/gov', url: 'https://www.oregon.gov/gov/pages/newsroom.aspx' },
  sherrill: { label: 'nj.gov/governor', url: 'https://www.nj.gov/governor/news/' },
  lombardo: { label: 'gov.nv.gov', url: 'https://gov.nv.gov/Newsroom/' },
  lee: { label: 'tn.gov/governor', url: 'https://www.tn.gov/governor/news.html' },
  mcmaster: { label: 'governor.sc.gov', url: 'https://governor.sc.gov/news' },
  kehoe: { label: 'governor.mo.gov', url: 'https://governor.mo.gov/press-releases' },
  ivey: { label: 'governor.alabama.gov', url: 'https://governor.alabama.gov/newsroom/' },
};

const NEW = {
  evers: {
    roster: { name: 'Tony Evers', office: 'Governor', state: 'Wisconsin', party: 'D', score: 55, icon: '🦡', issues: ['Public Schools', 'Abortion Rights', 'Healthcare', 'Gun Safety'] },
    label: 'Tony Evers — 🦡 Governor of Wisconsin (D)',
    cards: [
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former state superintendent, Evers has made public-school funding his signature cause, using a 2023 partial veto to lock in a school-revenue increase for four centuries and repeatedly proposing large K-12 boosts.',
        evidence: 'Wisconsin Superintendent of Public Instruction (2009–2019) before election as governor; the partial veto was upheld by the Wisconsin Supreme Court in 2025.', source: S.evers },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Campaigned to restore abortion access, calling the state’s 1849 criminal ban unacceptable, and backed litigation and repeal efforts after the Dobbs decision.', source: S.evers },
      { topic: 'Medicaid & Healthcare', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Has repeatedly urged the Republican legislature to accept full federal Medicaid (BadgerCare) expansion, which it has declined.', source: S.evers },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Called special sessions urging universal background checks and a red-flag law, which the legislature gaveled out without acting.', source: S.evers },
      { topic: 'Middle-Class Taxes', icon: '💵', pos: 'mixed', issueKey: 'tax_middle_class', issueStance: 'mixed',
        text: 'Pushed targeted middle-class income-tax cuts and child-care investment while resisting broader Republican tax cuts he argues favor the wealthy.', source: S.evers },
    ],
  },
  josh_stein: {
    roster: { name: 'Josh Stein', office: 'Governor', state: 'North Carolina', party: 'D', score: 55, icon: '🌲', issues: ['Abortion Rights', 'Disaster Recovery', 'Public Schools', 'Healthcare'] },
    label: 'Josh Stein — 🌲 Governor of North Carolina (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Has vowed to protect North Carolina’s current abortion access and opposes further restrictions, an issue he campaigned on as the state’s former attorney general.',
        evidence: 'North Carolina Attorney General (2017–2025) before election as governor.', source: S.stein },
      { topic: 'Hurricane Helene Recovery', icon: '🔥', pos: 'support', issueKey: 'disaster_resilience', issueStance: 'support',
        text: 'Made western North Carolina’s recovery from Hurricane Helene an early priority, pressing for state and federal rebuilding funds and faster aid.', source: S.stein },
      { topic: 'Public Schools & Vouchers', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Opposes further expansion of private-school voucher funding, arguing it diverts money from public schools.', source: S.stein },
      { topic: 'Medicaid', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports North Carolina’s recent Medicaid expansion and its continued funding.', source: S.stein },
      { topic: 'Budget & Taxes', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has warned that scheduled Republican income-tax cuts could threaten funding for schools and services, favoring a more cautious fiscal path.', source: S.stein },
    ],
  },
  maura_healey: {
    roster: { name: 'Maura Healey', office: 'Governor', state: 'Massachusetts', party: 'D', score: 55, icon: '⚓', issues: ['Abortion Rights', 'Housing', 'Immigration & Shelter', 'Climate'] },
    label: 'Maura Healey — ⚓ Governor of Massachusetts (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A former attorney general, Healey moved after Dobbs to stockpile the medication abortion drug mifepristone and to protect abortion and gender-affirming-care providers under state shield laws.',
        evidence: 'Massachusetts Attorney General (2015–2023) before election as governor.', source: S.healey },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Signed a roughly $5 billion Affordable Homes Act to spur housing production and backs zoning reform to build more homes.', source: S.healey },
      { topic: 'Migrant Shelter Squeeze', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'Facing a strained right-to-shelter system, Healey imposed new caps and length-of-stay limits on the emergency family shelter program while calling on Washington for faster work authorization — a cost-pressured middle course.', source: S.healey },
      { topic: 'Climate & Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs aggressive clean-energy and climate goals, including offshore wind and emissions targets.', source: S.healey },
      { topic: 'Free Community College', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Made community college tuition-free for state residents and expanded early-education funding.', source: S.healey },
    ],
  },
  tina_kotek: {
    roster: { name: 'Tina Kotek', office: 'Governor', state: 'Oregon', party: 'D', score: 54, icon: '🦫', issues: ['Housing & Homelessness', 'Addiction & Drugs', 'Abortion Rights', 'LGBTQ+ Rights'] },
    label: 'Tina Kotek — 🦫 Governor of Oregon (D)',
    cards: [
      { topic: 'Housing & Homelessness', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Declared a homelessness state of emergency and set aggressive housing-production targets, pushing to build tens of thousands of new homes a year.', source: S.kotek },
      { topic: 'Drug Policy Course-Correction', icon: '🧠', pos: 'mixed', issueKey: 'health_mental', issueStance: 'mixed',
        text: 'After Measure 110’s drug decriminalization drew backlash, Kotek signed 2024 legislation recriminalizing possession of hard drugs while funding treatment — a reversal of the earlier approach.', source: S.kotek },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A strong supporter of abortion and reproductive rights, protecting access in Oregon.', source: S.kotek },
      { topic: 'LGBTQ+ Rights', icon: '🏳️‍🌈', pos: 'support', issueKey: 'lgbtq_rights', issueStance: 'support',
        text: 'One of the nation’s first openly lesbian governors, Kotek supports LGBTQ+ protections and access to gender-affirming care.', source: S.kotek },
      { topic: 'Climate & Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs Oregon’s clean-energy transition and climate goals.', source: S.kotek },
    ],
  },
  mikie_sherrill: {
    roster: { name: 'Mikie Sherrill', office: 'Governor', state: 'New Jersey', party: 'D', score: 55, icon: '✈️', issues: ['Affordability', 'Energy Costs', 'Abortion Rights', 'Gun Safety'] },
    label: 'Mikie Sherrill — ✈️ Governor of New Jersey (D)',
    cards: [
      { topic: 'Affordability & Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'A former Navy helicopter pilot and federal prosecutor, Sherrill centered her 2025 campaign and early term on affordability, pledging to lower property taxes and everyday costs.',
        evidence: 'Former U.S. Representative (NJ-11); inaugurated January 2026.', source: S.sherrill },
      { topic: 'Energy Costs', icon: '⚡', pos: 'mixed', issueKey: 'climate_action', issueStance: 'mixed',
        text: 'Backs clean energy and offshore wind but has emphasized reining in electricity bills, calling to reassess ratepayer costs and utility rate increases.', source: S.sherrill },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A supporter of abortion rights who has pledged to protect and strengthen access in New Jersey.', source: S.sherrill },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs strict gun-safety laws, consistent with New Jersey’s existing framework.', source: S.sherrill },
    ],
  },
  joe_lombardo: {
    roster: { name: 'Joe Lombardo', office: 'Governor', state: 'Nevada', party: 'R', score: 54, icon: '🎰', issues: ['School Choice', 'Public Safety', 'Border', 'Taxes'] },
    label: 'Joe Lombardo — 🎰 Governor of Nevada (R)',
    cards: [
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'A champion of Opportunity Scholarships and expanded school choice, Lombardo has pushed to grow private-school scholarship funding over legislative resistance.', source: S.lombardo },
      { topic: 'Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'A former Clark County sheriff, Lombardo centers public safety and tougher penalties, tying his agenda to law enforcement.',
        evidence: 'Sheriff of the Las Vegas Metropolitan Police Department before election as governor.', source: S.lombardo },
      { topic: 'Border & Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter border enforcement and cooperation with federal immigration authorities.', source: S.lombardo },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Opposes new taxes and vetoed Democratic revenue measures, favoring holding the line on taxes.', source: S.lombardo },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'Describes himself as pro-life but has said he would not seek to change Nevada’s voter-protected abortion access — a cross-pressured stance in a state where access is codified.', source: S.lombardo },
    ],
  },
  bill_lee: {
    roster: { name: 'Bill Lee', office: 'Governor', state: 'Tennessee', party: 'R', score: 54, icon: '🎸', issues: ['School Vouchers', 'Abortion', 'Immigration', 'Energy'] },
    label: 'Bill Lee — 🎸 Governor of Tennessee (R)',
    cards: [
      { topic: 'Universal School Vouchers', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Made universal school vouchers his signature win, signing the 2025 Education Freedom Act to offer education savings accounts to families statewide.', source: S.lee },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed and defends Tennessee’s Human Life Protection Act, one of the nation’s strictest abortion bans, which took effect after Dobbs.', source: S.lee },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter immigration enforcement, signing laws to increase state cooperation with federal authorities.', source: S.lee },
      { topic: 'Taxes & Business', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Touts Tennessee’s lack of an income tax and a business-friendly climate, and signed franchise-tax relief.', source: S.lee },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs an all-of-the-above, reliability-first energy build-out, including new nuclear (small modular reactors) and natural gas.', source: S.lee },
    ],
  },
  henry_mcmaster: {
    roster: { name: 'Henry McMaster', office: 'Governor', state: 'South Carolina', party: 'R', score: 54, icon: '🌴', issues: ['Abortion', 'School Choice', 'Energy', 'Taxes'] },
    label: 'Henry McMaster — 🌴 Governor of South Carolina (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed South Carolina’s Fetal Heartbeat Act banning most abortions at about six weeks and has defended it through court challenges.', source: S.mcmaster },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'A persistent champion of private-school scholarships, McMaster has pushed to revive and expand education scholarship accounts after state-court setbacks.', source: S.mcmaster },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs expanding energy generation — including reviving nuclear capacity and adding natural gas — to meet the state’s growth.', source: S.mcmaster },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Champions cutting the state income tax and has signed accelerated income-tax reductions.', source: S.mcmaster },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports strict immigration enforcement and state cooperation with federal authorities.', source: S.mcmaster },
    ],
  },
  mike_kehoe: {
    roster: { name: 'Mike Kehoe', office: 'Governor', state: 'Missouri', party: 'R', score: 54, icon: '🌉', issues: ['Crime', 'Abortion', 'Taxes', 'Immigration'] },
    label: 'Mike Kehoe — 🌉 Governor of Missouri (R)',
    cards: [
      { topic: 'Crime & Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made fighting crime his top priority, backing more funding and state-oversight measures for police in St. Louis and Kansas City.',
        evidence: 'Former Missouri lieutenant governor; inaugurated January 2025.', source: S.kehoe },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Opposes the abortion-rights amendment (Amendment 3) voters narrowly approved in 2024 and backs efforts to return abortion restrictions to the ballot.', source: S.kehoe },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Champions phasing out the state income tax and cutting taxes to spur growth.', source: S.kehoe },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter immigration enforcement and cooperation with federal authorities.', source: S.kehoe },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports expanding charter schools and the state’s MOScholars school-choice program.', source: S.kehoe },
    ],
  },
  kay_ivey: {
    roster: { name: 'Kay Ivey', office: 'Governor', state: 'Alabama', party: 'R', score: 54, icon: '🐘', issues: ['Abortion', 'IVF', 'School Choice', 'Taxes'] },
    label: 'Kay Ivey — 🐘 Governor of Alabama (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed the Human Life Protection Act, a near-total abortion ban that took effect after Dobbs.', source: S.ivey },
      { topic: 'IVF Access', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'After the Alabama Supreme Court’s 2024 ruling that frozen embryos are children halted IVF services, Ivey signed a law extending civil and criminal immunity to restart IVF treatment.', source: S.ivey },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Signed the CHOOSE Act creating refundable education savings accounts for private-school and homeschool expenses.', source: S.ivey },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Signed cuts to the state grocery tax and one-time income-tax rebates while touting a business-friendly climate.', source: S.ivey },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs expanding domestic energy production and recruiting manufacturing to the state.', source: S.ivey },
    ],
  },
};

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
const allCards = Object.values(NEW).flatMap((p) => p.cards);
for (const c of allCards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ invalid issueKey '${c.issueKey}' (topic: ${c.topic})`); bad++; }
console.log(bad ? `  ✗ ${bad} invalid issueKey(s).\n` : `  ✓ all ${allCards.length} issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
if (bad) process.exit(1);

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function cardStr(c) {
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

console.log(`PolitiDex — National high-impact governors WAVE 24  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — high-impact swing/large-state governors · top-down state wave 24 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
} else console.log('  · stance arrays present — skipped');

let html = fs.readFileSync(INDEX, 'utf8');

// ── CMP_DATA roster rows ─────────────────────────────────────────────────────
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — high-impact swing/large-state governors, wave 24 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 24 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 24 — high-impact swing/large-state governors (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave24-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
