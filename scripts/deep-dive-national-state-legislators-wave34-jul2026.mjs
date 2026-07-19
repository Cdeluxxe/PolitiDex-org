#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE LEGISLATIVE LEADERS IN NEW STATES,
// WAVE 34 (July 2026) — after waves 1-33.
// ---------------------------------------------------------------------------
// Prior waves covered the legislatures of TX, CA, FL, NY, PA, MI, IL, NV, NC, WI,
// AZ, and GA. This wave opens SIX MORE major and battleground states — Virginia,
// Ohio, Minnesota, Colorado, Washington, and New Hampshire — with their chamber
// leaders. Balanced 4D / 4R. Minnesota and Ohio each get a pair (a Republican and
// a Democrat / both chambers) so a state's Say-vs-Do contrast is visible.
//
//   DEMOCRATS
//   • DON SCOTT (don_scott) — Virginia House Speaker: the first Black Speaker in
//     Virginia history, re-elected in 2026 after the Democrats' 2025 sweep;
//     affordability with Gov. Spanberger, abortion rights, gun safety.
//   • ERIN MURPHY (erin_murphy) — Minnesota Senate Majority Leader: a nurse who
//     leads on gun-violence prevention, government-fraud oversight, reproductive
//     rights, and rural hospitals.
//   • JULIE McCLUSKIE (julie_mccluskie) — Colorado House Speaker: school-finance
//     reform, housing, health-care costs, climate.
//   • LAURIE JINKINS (laurie_jinkins) — Washington House Speaker: housing supply,
//     the capital-gains tax on the wealthy, the Climate Commitment Act.
//
//   REPUBLICANS
//   • MATT HUFFMAN (matt_huffman) — Ohio House Speaker: the flat income tax,
//     property-tax reform, universal school vouchers; the rare figure who has led
//     BOTH Ohio chambers.
//   • ROB McCOLLEY (rob_mccolley) — Ohio Senate President: the flat-tax budget,
//     property-tax relief, marijuana/hemp limits; picked in 2026 as Vivek
//     Ramaswamy's running mate for governor.
//   • LISA DEMUTH (lisa_demuth) — Minnesota House Speaker: the first Black and first
//     Republican woman Speaker; fraud oversight, tax restraint, and a 2026 run for
//     governor; led through a tied House.
//   • SHARON CARSON (sharon_carson) — New Hampshire Senate President: the no-income/
//     sales-tax "New Hampshire Advantage," school choice, public safety.
//
// FEDERAL DOTS (per the round's guidance): these are state officials with no
// federal roll-call record; federal-adjacent context is noted in-card where real
// (Scott governing alongside former U.S. Rep. Spanberger; McColley's 2026 statewide
// ticket). No federal votes are invented.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured or
// divided-government records are marked mixed and attributed. Sources are official
// state-legislature pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-legislators-wave34-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-legislators-wave34-jul2026.mjs --apply    # write
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
  vah: { label: 'house.virginia.gov', url: 'https://house.virginia.gov/' },
  mns: { label: 'senate.mn', url: 'https://www.senate.mn/' },
  mnh: { label: 'house.mn.gov', url: 'https://www.house.mn.gov/' },
  co: { label: 'leg.colorado.gov', url: 'https://leg.colorado.gov/' },
  wa: { label: 'leg.wa.gov', url: 'https://leg.wa.gov/' },
  ohh: { label: 'ohiohouse.gov', url: 'https://ohiohouse.gov/' },
  ohs: { label: 'ohiosenate.gov', url: 'https://ohiosenate.gov/' },
  nh: { label: 'gc.nh.gov', url: 'https://gc.nh.gov/senate/' },
};

const NEW = {
  don_scott: {
    roster: { name: 'Don Scott', office: 'State House Speaker', state: 'Virginia', party: 'D', score: 54, icon: '🏛', issues: ['Affordability', 'Abortion Rights', 'Gun Safety', 'Standing Up to D.C.'] },
    label: 'Don Scott — 🏛 Virginia State House Speaker (D)',
    cards: [
      { topic: 'Affordability', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Made cost of living the House agenda alongside Governor Spanberger, pushing measures on housing, utility bills, and everyday costs after the Democrats’ 2025 sweep.',
        evidence: 'Speaker of the Virginia House of Delegates since 2024 — the first Black Speaker in Virginia history — re-elected to a second term in 2026.', source: S.vah },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Advanced a proposed constitutional amendment to protect abortion access in Virginia, moving it through the House toward a voter referendum.', source: S.vah },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs stronger gun-safety laws, advancing storage, purchasing, and assault-weapons measures through the House.', source: S.vah },
      { topic: 'Standing Up to D.C.', icon: '🏛', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Framed the Democratic majority as a check on Trump-administration policies affecting Virginia’s large federal workforce, while pursuing bipartisan budget deals.', source: S.vah },
    ],
  },
  erin_murphy: {
    roster: { name: 'Erin Murphy', office: 'State Senate Majority Leader', state: 'Minnesota', party: 'D', score: 53, icon: '🏛', issues: ['Gun Violence Prevention', 'Government Oversight', 'Reproductive Rights', 'Rural Hospitals'] },
    label: 'Erin Murphy — 🏛 Minnesota State Senate Majority Leader (D)',
    cards: [
      { topic: 'Gun Violence Prevention', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Led a comprehensive gun-violence-prevention package through the Senate, a priority sharpened by the 2025 killing of former House Speaker Melissa Hortman.',
        evidence: 'Majority Leader of the Minnesota Senate since 2024; a registered nurse and former Minnesota House Majority Leader.', source: S.mns },
      { topic: 'Government Oversight', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Backed creating an Office of the Inspector General and funding new Medicaid-fraud investigators after a series of state fraud scandals.', source: S.mns },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supported codifying abortion rights in Minnesota law and protecting access for out-of-state patients.', source: S.mns },
      { topic: 'Rural Hospitals', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Pushed bills to stabilize rural and critical-access hospitals facing closure.', source: S.mns },
    ],
  },
  julie_mccluskie: {
    roster: { name: 'Julie McCluskie', office: 'State House Speaker', state: 'Colorado', party: 'D', score: 53, icon: '🏛', issues: ['Public Schools', 'Housing', 'Health-Care Costs', 'Climate'] },
    label: 'Julie McCluskie — 🏛 Colorado State House Speaker (D)',
    cards: [
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former school-district official, McCluskie led the overhaul of Colorado’s school-finance formula to direct more money to under-resourced districts.',
        evidence: 'Speaker of the Colorado House since 2023 — the first woman from the Western Slope to hold the post; term-limited in 2027.', source: S.co },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Backs expanding Colorado’s affordable-housing supply and land-use reforms to allow more construction.', source: S.co },
      { topic: 'Health-Care Costs', icon: '💊', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Prioritizes stabilizing health-insurance premiums and lowering care costs for Coloradans.', source: S.co },
      { topic: 'Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Supports Colorado’s greenhouse-gas reduction goals and clean-energy transition.', source: S.co },
    ],
  },
  laurie_jinkins: {
    roster: { name: 'Laurie Jinkins', office: 'State House Speaker', state: 'Washington', party: 'D', score: 53, icon: '🏛', issues: ['Housing', 'Tax the Wealthy', 'Climate', 'Public Health'] },
    label: 'Laurie Jinkins — 🏛 Washington State House Speaker (D)',
    cards: [
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Drove a multi-year push to boost housing supply, including laws allowing denser "middle housing" near transit and job centers.',
        evidence: 'Speaker of the Washington House since 2020 — the first woman and first lesbian to hold the post; a public-health official and attorney.', source: S.wa },
      { topic: 'Tax the Wealthy', icon: '💰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backed Washington’s capital-gains tax on high earners and defended it in court, using the revenue for schools and child care.', source: S.wa },
      { topic: 'Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Supported the Climate Commitment Act, Washington’s cap-and-invest carbon program, which voters upheld at the ballot in 2024.', source: S.wa },
      { topic: 'Public Health', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A former public-health official who backs expanding access to care and reproductive and gender-affirming health services.', source: S.wa },
    ],
  },
  matt_huffman: {
    roster: { name: 'Matt Huffman', office: 'State House Speaker', state: 'Ohio', party: 'R', score: 53, icon: '🏛', issues: ['Flat Tax', 'Property Tax', 'School Choice', 'Redistricting'] },
    label: 'Matt Huffman — 🏛 Ohio State House Speaker (R)',
    cards: [
      { topic: 'Flat Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed moving Ohio to a single flat income-tax bracket in the 2025 budget, a long-sought conservative goal.',
        evidence: 'Speaker of the Ohio House since 2025; previously Ohio Senate President — the first person to preside over both Ohio chambers, a move made under term limits.', source: S.ohh },
      { topic: 'Property Tax', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Pushed property-tax relief measures and, with the Senate, criticized Governor DeWine for vetoing the legislature’s property-tax reforms.', source: S.ohh },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'A long-time architect of Ohio’s EdChoice voucher expansion to near-universal eligibility.', source: S.ohh },
      { topic: 'Redistricting', icon: '🗺', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Helped lead Ohio’s congressional map-drawing, a repeated subject of litigation and a 2026 redistricting commission fight.', source: S.ohh },
    ],
  },
  rob_mccolley: {
    roster: { name: 'Rob McColley', office: 'State Senate President', state: 'Ohio', party: 'R', score: 53, icon: '🏛', issues: ['Flat-Tax Budget', 'Property Tax', 'Marijuana & Hemp', 'Energy'] },
    label: 'Rob McColley — 🏛 Ohio State Senate President (R)',
    cards: [
      { topic: 'Flat-Tax Budget', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Presided over passage of the biennial budget moving Ohio to a single flat income-tax bracket.',
        evidence: 'President of the Ohio Senate since 2025; selected in 2026 as Vivek Ramaswamy’s running mate for governor.', source: S.ohs },
      { topic: 'Property Tax', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Championed property-tax reforms and publicly faulted Governor DeWine for vetoing them amid rising tax bills.', source: S.ohs },
      { topic: 'Marijuana & Hemp', icon: '⚖️', pos: 'mixed', issueKey: 'reform_balance', issueStance: 'mixed',
        text: 'Led Senate changes tightening the voter-approved recreational-marijuana law and restricting sales of intoxicating hemp products.', source: S.ohs },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backed legislation to expand natural-gas and nuclear generation and speed new power supply for data centers and manufacturing.', source: S.ohs },
    ],
  },
  lisa_demuth: {
    roster: { name: 'Lisa Demuth', office: 'State House Speaker', state: 'Minnesota', party: 'R', score: 53, icon: '🏛', issues: ['Fraud Oversight', 'Tax Restraint', 'Parental Rights', 'Divided Government'] },
    label: 'Lisa Demuth — 🏛 Minnesota State House Speaker (R)',
    cards: [
      { topic: 'Fraud Oversight', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Made rooting out state fraud a signature theme after the Feeding Our Future and related scandals, pressing for tighter oversight of public grants.',
        evidence: 'Speaker of the Minnesota House since 2025 — the first Black and first Republican woman to hold the post; a 2026 candidate for governor.', source: S.mnh },
      { topic: 'Tax Restraint', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Opposes the DFL’s tax increases and argues Minnesota’s large surpluses should return to taxpayers.', source: S.mnh },
      { topic: 'Parental Rights', icon: '🎓', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'Backs parental-rights and curriculum-transparency measures in Minnesota schools.', source: S.mnh },
      { topic: 'Divided Government', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Led House Republicans through a rare tied chamber and a power-sharing arrangement in 2025, forcing bipartisan negotiation on the budget.', source: S.mnh },
    ],
  },
  sharon_carson: {
    roster: { name: 'Sharon Carson', office: 'State Senate President', state: 'New Hampshire', party: 'R', score: 53, icon: '🏛', issues: ['No Income/Sales Tax', 'School Choice', 'Public Safety', 'Parental Rights'] },
    label: 'Sharon Carson — 🏛 New Hampshire State Senate President (R)',
    cards: [
      { topic: 'No Income or Sales Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Defends the "New Hampshire Advantage" — the state’s lack of a general income or sales tax — as the core of its fiscal model.',
        evidence: 'President of the New Hampshire Senate for the 2025-2026 session; in the state Senate since 2008.', source: S.nh },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backed expanding New Hampshire’s Education Freedom Account program toward universal eligibility.', source: S.nh },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes public safety and bail and sentencing measures, drawing on a long record on the judiciary committee.', source: S.nh },
      { topic: 'Parental Rights', icon: '🎓', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'Supports parental-rights measures and curriculum transparency in schools.', source: S.nh },
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

console.log(`PolitiDex — National state legislators (new states) WAVE 34  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — state legislative leaders in new states (VA · OH · MN · CO · WA · NH) · state wave 34 (Jul 2026) ─\n' +
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
  const block = '\n    // National — state legislative leaders in new states (VA · OH · MN · CO · WA · NH), wave 34 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 34 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 34 — state legislative leaders in new states: VA · OH · MN · CO · WA · NH (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave34-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
