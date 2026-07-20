#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE LEGISLATIVE LEADERS IN NEW STATES,
// WAVE 36 (July 2026) — after waves 1-35.
// ---------------------------------------------------------------------------
// Prior waves covered the legislatures of ~20 states. This wave opens SEVEN more —
// New Jersey, Massachusetts, Maryland, Tennessee, Kentucky, Iowa, and Indiana —
// with their chamber leaders. Balanced 4D / 4R.
//
//   DEMOCRATS
//   • NICHOLAS SCUTARI (nicholas_scutari) — New Jersey Senate President: architect
//     of the state's legal-cannabis law, gun safety, affordability; will work with
//     Gov.-elect Sherrill.
//   • RON MARIANO (ron_mariano) — Massachusetts House Speaker: the 2024 gun-law
//     overhaul, health-system oversight after the Steward collapse, housing.
//   • KAREN SPILKA (karen_spilka) — Massachusetts Senate President: mental-health
//     parity, free community college, reproductive-rights shield laws.
//   • BILL FERGUSON (bill_ferguson) — Maryland Senate President: the structural
//     deficit and 2025 tax package, the Blueprint education reform, energy.
//
//   REPUBLICANS
//   • CAMERON SEXTON (cameron_sexton) — Tennessee House Speaker: the 2025-26 mid-
//     decade redistricting fight (splitting the Memphis district, removing Democrats
//     from committees), universal school vouchers, immigration.
//   • ROBERT STIVERS (robert_stivers) — Kentucky Senate President: the longest-
//     serving in state history; abortion, tax cuts, overriding Gov. Beshear's
//     vetoes — and a possible post-McConnell center of Kentucky GOP power.
//   • PAT GRASSLEY (pat_grassley) — Iowa House Speaker: property-tax overhaul,
//     school-choice accounts, biofuels; grandson of U.S. Senator Chuck Grassley.
//   • TODD HUSTON (todd_huston) — Indiana House Speaker: property-tax relief, cost
//     of living, universal vouchers, deregulation.
//
// FEDERAL DOTS (per the round's guidance): Pat Grassley's grandfather is U.S.
// Senator Chuck Grassley (noted in-card as evidence); Stivers is discussed as a
// successor power center to retiring U.S. Senator Mitch McConnell in Kentucky
// (noted in-card). No federal roll-call votes are attributed to these state figures.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured or
// divided-government records are marked mixed and attributed. Sources are official
// state-legislature pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-legislators-wave36-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-legislators-wave36-jul2026.mjs --apply    # write
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
  nj: { label: 'njleg.state.nj.us', url: 'https://www.njleg.state.nj.us/' },
  ma: { label: 'malegislature.gov', url: 'https://malegislature.gov/' },
  md: { label: 'mgaleg.maryland.gov', url: 'https://mgaleg.maryland.gov/' },
  tn: { label: 'capitol.tn.gov', url: 'https://www.capitol.tn.gov/house/' },
  ky: { label: 'legislature.ky.gov', url: 'https://legislature.ky.gov/' },
  ia: { label: 'legis.iowa.gov', url: 'https://www.legis.iowa.gov/' },
  in: { label: 'iga.in.gov', url: 'https://iga.in.gov/' },
};

const NEW = {
  nicholas_scutari: {
    roster: { name: 'Nicholas Scutari', office: 'State Senate President', state: 'New Jersey', party: 'D', score: 53, icon: '🏛', issues: ['Legal Cannabis', 'Gun Safety', 'Affordability', 'Working With the Governor'] },
    label: 'Nicholas Scutari — 🏛 New Jersey State Senate President (D)',
    cards: [
      { topic: 'Legal Cannabis', icon: '🌿', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'The longtime legislative architect of New Jersey’s move to legalize and regulate adult-use cannabis, which he pursued for over a decade before it became law.',
        evidence: 'President of the New Jersey Senate since 2022, re-elected to a third term for the 2026-27 session.', source: S.nj },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs New Jersey’s strict gun laws, among the toughest in the nation.', source: S.nj },
      { topic: 'Affordability', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Prioritizes property-tax relief and cost-of-living measures in a high-cost state.', source: S.nj },
      { topic: 'Working With the Governor', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Said he will work with Governor-elect Sherrill and the Democratic majorities to advance the state’s agenda after the 2025 election.', source: S.nj },
    ],
  },
  ron_mariano: {
    roster: { name: 'Ron Mariano', office: 'State House Speaker', state: 'Massachusetts', party: 'D', score: 53, icon: '🏛', issues: ['Gun Safety', 'Health-System Oversight', 'Housing', 'Economy'] },
    label: 'Ron Mariano — 🏛 Massachusetts State House Speaker (D)',
    cards: [
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Presided over the House’s 2024 overhaul of Massachusetts gun laws, tightening rules on untraceable "ghost guns" and carrying.',
        evidence: 'Speaker of the Massachusetts House since 2020.', source: S.ma },
      { topic: 'Health-System Oversight', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Pushed hospital and health-system oversight legislation after the collapse of the for-profit Steward Health Care chain disrupted Massachusetts hospitals.', source: S.ma },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Advanced a multibillion-dollar housing bond bill to boost construction and lower costs.', source: S.ma },
      { topic: 'Economy & Taxes', icon: '📈', pos: 'mixed', issueKey: 'cost_living', issueStance: 'mixed',
        text: 'Backed a bipartisan tax-relief package while defending revenue from the voter-approved "millionaire’s tax" for schools and transportation.', source: S.ma },
    ],
  },
  karen_spilka: {
    roster: { name: 'Karen Spilka', office: 'State Senate President', state: 'Massachusetts', party: 'D', score: 53, icon: '🏛', issues: ['Mental Health', 'Free Community College', 'Reproductive Rights', 'Migrant Shelter'] },
    label: 'Karen Spilka — 🏛 Massachusetts State Senate President (D)',
    cards: [
      { topic: 'Mental Health', icon: '💚', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'Made mental-health parity her signature cause, steering a law requiring insurers to cover mental health like physical health.',
        evidence: 'President of the Massachusetts Senate since 2018.', source: S.ma },
      { topic: 'Free Community College', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Championed MassEducate, making community college tuition-free for Massachusetts residents.', source: S.ma },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backed shield laws protecting abortion and gender-affirming-care providers from out-of-state prosecution.', source: S.ma },
      { topic: 'Migrant Shelter', icon: '🛂', pos: 'mixed', issueKey: 'immigration_reform', issueStance: 'mixed',
        text: 'Supported the state’s right-to-shelter obligations while agreeing to new limits and cost controls as the emergency-shelter system strained.', source: S.ma },
    ],
  },
  bill_ferguson: {
    roster: { name: 'Bill Ferguson', office: 'State Senate President', state: 'Maryland', party: 'D', score: 53, icon: '🏛', issues: ['Budget & Deficit', 'Education Blueprint', 'Tax the Wealthy', 'Energy'] },
    label: 'Bill Ferguson — 🏛 Maryland State Senate President (D)',
    cards: [
      { topic: 'Budget & Deficit', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Steered Maryland’s 2025 budget through a large structural deficit, pairing spending cuts with targeted tax and fee increases alongside Governor Moore.',
        evidence: 'President of the Maryland Senate since 2020 — the youngest to hold the post.', source: S.md },
      { topic: 'Education Blueprint', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former teacher, defends the Blueprint for Maryland’s Future — the multiyear public-school funding and reform plan — while negotiating its pace amid budget pressure.', source: S.md },
      { topic: 'Tax the Wealthy', icon: '💰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backed new higher-income tax brackets in 2025 to help close the deficit while shielding middle-income earners.', source: S.md },
      { topic: 'Energy', icon: '⚡', pos: 'mixed', issueKey: 'energy_production', issueStance: 'mixed',
        text: 'Backed a 2025 energy package adding in-state generation, including natural gas and nuclear, to address rising electricity costs and demand.', source: S.md },
    ],
  },
  cameron_sexton: {
    roster: { name: 'Cameron Sexton', office: 'State House Speaker', state: 'Tennessee', party: 'R', score: 53, icon: '🏛', issues: ['Redistricting', 'School Choice', 'Immigration', 'Public Safety'] },
    label: 'Cameron Sexton — 🏛 Tennessee State House Speaker (R)',
    cards: [
      { topic: 'Redistricting', icon: '🗺', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Drove the 2025-26 mid-decade redistricting that split the Memphis-area majority-Black congressional district to add a Republican-leaning U.S. House seat, and removed protesting Democrats from committee assignments.',
        evidence: 'Speaker of the Tennessee House since 2019.', source: S.tn },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backed Tennessee’s 2025 statewide Education Freedom Scholarship program creating universal private-school vouchers.', source: S.tn },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports stricter state immigration-enforcement measures and cooperation with federal authorities.', source: S.tn },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backs tougher criminal penalties and expanded law-enforcement funding.', source: S.tn },
    ],
  },
  robert_stivers: {
    roster: { name: 'Robert Stivers', office: 'State Senate President', state: 'Kentucky', party: 'R', score: 53, icon: '🏛', issues: ['Abortion', 'Tax Cuts', 'Overriding the Governor', 'Kentucky GOP'] },
    label: 'Robert Stivers — 🏛 Kentucky State Senate President (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Kentucky’s near-total abortion ban, enacted through trigger and heartbeat laws the Republican supermajority passed.',
        evidence: 'President of the Kentucky Senate since 2013 — the longest-serving in state history.', source: S.ky },
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs the phased reduction of Kentucky’s individual income tax toward elimination.', source: S.ky },
      { topic: 'Overriding the Governor', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Uses the Republican supermajority to override many of Democratic Governor Andy Beshear’s vetoes, a recurring feature of divided Kentucky government.', source: S.ky },
      { topic: 'Kentucky GOP', icon: '🏛', pos: 'mixed', issueKey: 'reform_balance', issueStance: 'mixed',
        text: 'Discussed as a possible new center of Kentucky Republican power as U.S. Senator Mitch McConnell prepares to retire in 2026.', source: S.ky },
    ],
  },
  pat_grassley: {
    roster: { name: 'Pat Grassley', office: 'State House Speaker', state: 'Iowa', party: 'R', score: 53, icon: '🏛', issues: ['Property Taxes', 'School Choice', 'Biofuels', 'Flat Tax'] },
    label: 'Pat Grassley — 🏛 Iowa State House Speaker (R)',
    cards: [
      { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Led a 2025 overhaul of Iowa’s property-tax system aimed at slowing the growth of local tax bills.',
        evidence: 'Speaker of the Iowa House since 2020; grandson of U.S. Senator Chuck Grassley.', source: S.ia },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backed Iowa’s Education Savings Accounts, which became available to all students in 2025.', source: S.ia },
      { topic: 'Biofuels', icon: '🌽', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions Iowa ethanol and biofuels, including expanded year-round E15 sales.', source: S.ia },
      { topic: 'Flat Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed Iowa’s move to a low flat individual income tax.', source: S.ia },
    ],
  },
  todd_huston: {
    roster: { name: 'Todd Huston', office: 'State House Speaker', state: 'Indiana', party: 'R', score: 53, icon: '🏛', issues: ['Property Taxes', 'Cost of Living', 'School Choice', 'Deregulation'] },
    label: 'Todd Huston — 🏛 Indiana State House Speaker (R)',
    cards: [
      { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Backed Indiana’s 2025 property-tax relief law cutting bills for homeowners while phasing in changes for local governments.',
        evidence: 'Speaker of the Indiana House since 2020.', source: S.in },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Made housing, energy costs, and affordability the centerpiece of the House Republican 2026 agenda.', source: S.in },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backed expanding Indiana’s private-school voucher program to near-universal eligibility.', source: S.in },
      { topic: 'Deregulation', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Pushes to cut what he calls government bureaucracy and red tape on business and development.', source: S.in },
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

console.log(`PolitiDex — National state legislators (new states) WAVE 36  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — state legislative leaders in new states (NJ · MA · MD · TN · KY · IA · IN) · state wave 36 (Jul 2026) ─\n' +
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
  const block = '\n    // National — state legislative leaders in new states (NJ · MA · MD · TN · KY · IA · IN), wave 36 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 36 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 36 — state legislative leaders in new states: NJ · MA · MD · TN · KY · IA · IN (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave36-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
