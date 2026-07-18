#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: MORE HIGH-LEVERAGE GOVERNORS, WAVE 22
// (July 2026) — after waves 1-21.
// ---------------------------------------------------------------------------
// Continuing down the governor bench (the federal officeholder bench is
// saturated). Ten more consequential state executives who drive the national
// debates our Spotlights track — balanced 5R / 5D:
//
//   REPUBLICANS
//   • KEVIN STITT (kevin_stitt) — Governor of Oklahoma: energy, school choice,
//     taxes, and the border.
//   • KIM REYNOLDS (kim_reynolds) — Governor of Iowa: school choice, agriculture,
//     abortion, and taxes.
//   • PATRICK MORRISEY (patrick_morrisey) — Governor of West Virginia: energy and
//     coal, deregulation, the border, and spending.
//   • GREG GIANFORTE (greg_gianforte) — Governor of Montana: taxes, energy,
//     public lands, and the border.
//   • MIKE BRAUN (mike_braun) — Governor of Indiana: taxes and spending, the
//     economy, healthcare prices, and the border.
//
//   DEMOCRATS
//   • KATIE HOBBS (katie_hobbs) — Governor of Arizona: the border, abortion
//     rights, water, and bipartisan budgets.
//   • BOB FERGUSON (bob_ferguson) — Governor of Washington: challenging federal
//     actions in court, abortion rights, gun safety, and climate.
//   • MICHELLE LUJAN GRISHAM (michelle_lujan_grisham) — Governor of New Mexico:
//     abortion rights, energy, the border, and gun safety.
//   • JANET MILLS (janet_mills) — Governor of Maine: abortion rights, a high-
//     profile clash with the White House over transgender athletes, energy,
//     and healthcare.
//   • JOSH GREEN (josh_green) — Governor of Hawaii, a physician: healthcare,
//     homelessness and housing, climate, and cost of living.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured or
// bipartisan records (Hobbs and Braun on budgets, red/blue-state governors
// working across the aisle) are marked mixed and attributed. Sources are
// official governor's-office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-governors-wave22-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-governors-wave22-jul2026.mjs --apply    # write
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
  stitt:    { label: 'oklahoma.gov/governor', url: 'https://oklahoma.gov/governor/newsroom.html' },
  reynolds: { label: 'governor.iowa.gov', url: 'https://governor.iowa.gov/press-releases' },
  morrisey: { label: 'governor.wv.gov', url: 'https://governor.wv.gov/News' },
  gianforte:{ label: 'governor.mt.gov', url: 'https://governor.mt.gov/News' },
  braun:    { label: 'in.gov/gov', url: 'https://www.in.gov/gov/newsroom/' },
  hobbs:    { label: 'azgovernor.gov', url: 'https://azgovernor.gov/office-arizona-governor/newsroom' },
  ferguson: { label: 'governor.wa.gov', url: 'https://governor.wa.gov/news' },
  grisham:  { label: 'governor.nm.gov', url: 'https://www.governor.state.nm.us/category/press-releases/' },
  mills:    { label: 'maine.gov/governor', url: 'https://www.maine.gov/governor/mills/news' },
  green:    { label: 'governor.hawaii.gov', url: 'https://governor.hawaii.gov/newsroom/' },
};

const NEW = {
  kevin_stitt: {
    roster: { name: 'Kevin Stitt', office: 'Governor', state: 'Oklahoma', party: 'R', score: 54, icon: '🛢', issues: ['Energy', 'School Choice', 'Taxes', 'Border'] },
    label: 'Kevin Stitt — 🛢 Governor of Oklahoma (R)',
    cards: [
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Governor of Oklahoma, Stitt strongly backs oil and gas production and opposes federal limits he says raise energy costs.',
        evidence: 'Governor of Oklahoma; former business owner.', source: S.stitt },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Signed a refundable school-choice tax credit and backs parental rights and charter expansion.', source: S.stitt },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Champions cutting and phasing out the state income tax and restraining spending.', source: S.stitt },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict immigration enforcement and state cooperation with federal efforts.', source: S.stitt },
    ],
  },
  kim_reynolds: {
    roster: { name: 'Kim Reynolds', office: 'Governor', state: 'Iowa', party: 'R', score: 54, icon: '🌽', issues: ['School Choice', 'Agriculture', 'Abortion', 'Taxes'] },
    label: 'Kim Reynolds — 🌽 Governor of Iowa (R)',
    cards: [
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Governor of Iowa, Reynolds enacted universal education savings accounts (school-choice vouchers) for every family.',
        evidence: 'Governor of Iowa; former lieutenant governor.', source: S.reynolds },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From the nation’s top corn state, backs farmers, ethanol/biofuels, and agricultural exports.', source: S.reynolds },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed a six-week abortion limit and backs strong restrictions on abortion.', source: S.reynolds },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Cut Iowa to a flat income tax and champions further reductions.', source: S.reynolds },
    ],
  },
  patrick_morrisey: {
    roster: { name: 'Patrick Morrisey', office: 'Governor', state: 'West Virginia', party: 'R', score: 54, icon: '⛏', issues: ['Energy & Coal', 'Deregulation', 'Border', 'Spending'] },
    label: 'Patrick Morrisey — ⛏ Governor of West Virginia (R)',
    cards: [
      { topic: 'Energy & Coal', icon: '⛏', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Governor of West Virginia and a former attorney general who fought EPA rules, Morrisey strongly backs coal, natural gas, and energy jobs.',
        evidence: 'Governor of West Virginia; former West Virginia Attorney General.', source: S.morrisey },
      { topic: 'Deregulation', icon: '📉', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Built a record challenging federal environmental and administrative rules he argues exceed agency authority.', source: S.morrisey },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement and stopping fentanyl trafficking.', source: S.morrisey },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'A fiscal conservative who backs tax cuts and spending restraint.', source: S.morrisey },
    ],
  },
  greg_gianforte: {
    roster: { name: 'Greg Gianforte', office: 'Governor', state: 'Montana', party: 'R', score: 54, icon: '🏔', issues: ['Taxes', 'Energy', 'Public Lands', 'Border'] },
    label: 'Greg Gianforte — 🏔 Governor of Montana (R)',
    cards: [
      { topic: 'Taxes & Economy', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Governor of Montana and a former tech entrepreneur, Gianforte has cut income and property taxes and courts business investment.',
        evidence: 'Governor of Montana; former software entrepreneur and U.S. Representative.', source: S.gianforte },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs oil, gas, and coal production and opposes federal energy limits.', source: S.gianforte },
      { topic: 'Public Lands', icon: '🏔', pos: 'mixed', issueKey: 'lands_balance', issueStance: 'mixed',
        text: 'Supports access, logging, and active management on public lands while navigating Montana’s strong hunting and access traditions.', source: S.gianforte },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement and sent Montana National Guard support to the border.', source: S.gianforte },
    ],
  },
  mike_braun: {
    roster: { name: 'Mike Braun', office: 'Governor', state: 'Indiana', party: 'R', score: 54, icon: '🏭', issues: ['Taxes & Spending', 'Economy', 'Healthcare Prices', 'Border'] },
    label: 'Mike Braun — 🏭 Governor of Indiana (R)',
    cards: [
      { topic: 'Taxes & Spending', icon: '🧾', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Governor of Indiana and a former U.S. senator and businessman, Braun ran on property-tax relief and spending restraint.',
        evidence: 'Governor of Indiana; former U.S. Senator and business owner.', source: S.braun },
      { topic: 'Economy & Business', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Touts a low-tax, light-regulation model and manufacturing investment.', source: S.braun },
      { topic: 'Healthcare Prices', icon: '⚕️', pos: 'support', issueKey: 'healthcare_costs', issueStance: 'support',
        text: 'A longtime advocate for healthcare price transparency and lowering costs for employers and patients.', source: S.braun },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement and state cooperation with federal efforts.', source: S.braun },
    ],
  },
  katie_hobbs: {
    roster: { name: 'Katie Hobbs', office: 'Governor', state: 'Arizona', party: 'D', score: 55, icon: '🌵', issues: ['Border', 'Abortion Rights', 'Water', 'Bipartisan Budgets'] },
    label: 'Katie Hobbs — 🌵 Governor of Arizona (D)',
    cards: [
      { topic: 'Border', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'Governor of a major border state, Hobbs backs more border security funding and National Guard support while opposing what she calls federal failures — pairing enforcement with legal processing.',
        evidence: 'Governor of Arizona; former Arizona Secretary of State.', source: S.hobbs },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A supporter of abortion rights who backed repealing Arizona’s territorial-era ban.', source: S.hobbs },
      { topic: 'Water Security', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Centers Colorado River and groundwater management amid the West’s water scarcity.', source: S.hobbs },
      { topic: 'Bipartisan Budgets', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Governs with a Republican legislature and touts bipartisan budget deals.', source: S.hobbs },
    ],
  },
  bob_ferguson: {
    roster: { name: 'Bob Ferguson', office: 'Governor', state: 'Washington', party: 'D', score: 55, icon: '🌲', issues: ['Challenging Federal Actions', 'Abortion Rights', 'Gun Safety', 'Climate'] },
    label: 'Bob Ferguson — 🌲 Governor of Washington (D)',
    cards: [
      { topic: 'Challenging Federal Actions', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Governor of Washington and a former attorney general who repeatedly sued the first Trump administration, Ferguson has continued challenging federal actions he views as unlawful.',
        evidence: 'Governor of Washington; former Washington Attorney General.', source: S.ferguson },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A strong supporter of abortion rights who backs protecting access in Washington.', source: S.ferguson },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Championed assault-weapons and other gun restrictions as attorney general and governor.', source: S.ferguson },
      { topic: 'Climate & Energy', icon: '🌿', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs Washington’s cap-and-invest climate program and clean-energy goals.', source: S.ferguson },
    ],
  },
  michelle_lujan_grisham: {
    roster: { name: 'Michelle Lujan Grisham', office: 'Governor', state: 'New Mexico', party: 'D', score: 55, icon: '🏜', issues: ['Abortion Rights', 'Energy', 'Border', 'Gun Safety'] },
    label: 'Michelle Lujan Grisham — 🏜 Governor of New Mexico (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Governor of New Mexico, Lujan Grisham has made the state a regional refuge for abortion access.',
        evidence: 'Governor of New Mexico; former U.S. Representative.', source: S.grisham },
      { topic: 'Energy', icon: '🛢', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Balances New Mexico’s major oil-and-gas revenue with aggressive clean-energy and methane rules.', source: S.grisham },
      { topic: 'Border', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'From a border state, has sent National Guard support to the border while criticizing broad enforcement approaches.', source: S.grisham },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'A gun-safety advocate who has pushed restrictions, at times drawing legal challenges.', source: S.grisham },
    ],
  },
  janet_mills: {
    roster: { name: 'Janet Mills', office: 'Governor', state: 'Maine', party: 'D', score: 55, icon: '🦞', issues: ['Abortion Rights', 'Transgender Rights', 'Energy', 'Healthcare'] },
    label: 'Janet Mills — 🦞 Governor of Maine (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Governor of Maine and a former attorney general, Mills is a supporter of abortion rights who expanded access in the state.',
        evidence: 'Governor of Maine; former Maine Attorney General.', source: S.mills },
      { topic: 'Transgender Rights', icon: '🏳️‍⚧️', pos: 'support', issueKey: 'lgbtq_rights', issueStance: 'support',
        text: 'Drew national attention in a public clash with the White House over transgender athletes, defending Maine’s anti-discrimination law.', source: S.mills },
      { topic: 'Energy', icon: '🌿', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Backs offshore wind, heat pumps, and clean-energy goals to cut Maine’s heating costs and emissions.', source: S.mills },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Expanded Medicaid in Maine and backs protecting access to care.', source: S.mills },
    ],
  },
  josh_green: {
    roster: { name: 'Josh Green', office: 'Governor', state: 'Hawaii', party: 'D', score: 55, icon: '🌺', issues: ['Healthcare', 'Homelessness & Housing', 'Climate', 'Cost of Living'] },
    label: 'Josh Green — 🌺 Governor of Hawaii (D)',
    cards: [
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Governor of Hawaii and an emergency physician, Green centers expanding healthcare access and addressing provider shortages.',
        evidence: 'Governor of Hawaii; emergency-room physician and former lieutenant governor.', source: S.green },
      { topic: 'Homelessness & Housing', icon: '🏠', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Declared homelessness and housing emergencies and pushes to build more housing and expand shelter and services.', source: S.green },
      { topic: 'Climate', icon: '🌿', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'After the Maui wildfires, backs climate resilience, clean energy, and disaster recovery.', source: S.green },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Signed large income-tax cuts aimed at easing Hawaii’s high cost of living.', source: S.green },
    ],
  },
};

// ── validate issueKeys ───────────────────────────────────────────────────────
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

console.log(`PolitiDex — National governors WAVE 22  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — more high-leverage governors (both parties) · top-down federal wave 22 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');

// ── 1. CMP_DATA roster rows ────────────────────────────────────────────────
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — more high-leverage governors (both parties), wave 22 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── 2. PROFILES seed allow-list (anchor on the array's `].forEach` close) ──
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 22 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 22 — more high-leverage governors (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
