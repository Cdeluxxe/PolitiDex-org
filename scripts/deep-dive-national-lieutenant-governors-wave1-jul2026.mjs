#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: LIEUTENANT GOVERNORS, WAVE 1 (July 2026)
// ---------------------------------------------------------------------------
// Opens a new state-executive class: Lieutenant Governors — often next-in-line,
// frequently presiding over the state senate, and frequently the next candidates
// for governor (several here are running in 2026). Balanced 4D / 4R, weighted to
// battleground and high-population states. (Texas's Dan Patrick is already in the
// roster and is not duplicated here.)
//
//   DEMOCRATS
//   • GARLIN GILCHRIST (garlin_gilchrist) — Michigan Lt. Gov. (running for governor)
//   • AUSTIN DAVIS (austin_davis) — Pennsylvania Lt. Gov.
//   • ELENI KOUNALAKIS (eleni_kounalakis) — California Lt. Gov. (running for governor)
//   • PEGGY FLANAGAN (peggy_flanagan) — Minnesota Lt. Gov.
//   REPUBLICANS
//   • BURT JONES (burt_jones) — Georgia Lt. Gov. (running for governor)
//   • DELBERT HOSEMANN (delbert_hosemann) — Mississippi Lt. Gov.
//   • MATT PINNELL (matt_pinnell) — Oklahoma Lt. Gov.
//   • JIM TRESSEL (jim_tressel) — Ohio Lt. Gov. (former championship football coach)
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Divided-government or constrained records are
// marked mixed and attributed. Sources are official state offices.
//
// Writes to the CURRENT data layout. Idempotent + client-side.
//   node scripts/deep-dive-national-lieutenant-governors-wave1-jul2026.mjs --apply
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const CMP = path.join(ROOT, 'cmp-data.js');
const INDEX = path.join(ROOT, 'index.html');
const EXT = path.join(ROOT, 'politician-stances-ext.js');
const APPLY = process.argv.includes('--apply');

const S = {
  mi: { label: 'michigan.gov/ltgov', url: 'https://www.michigan.gov/ltgov' },
  pa: { label: 'pa.gov/governor/lt-governor', url: 'https://www.pa.gov/agencies/ltgov.html' },
  ca: { label: 'ltg.ca.gov', url: 'https://ltg.ca.gov/' },
  mn: { label: 'mn.gov/governor', url: 'https://mn.gov/governor/' },
  ga: { label: 'ltgov.georgia.gov', url: 'https://ltgov.georgia.gov/' },
  ms: { label: 'ltgovhosemann.ms.gov', url: 'https://ltgovhosemann.ms.gov/' },
  ok: { label: 'oklahoma.gov/ltgov', url: 'https://oklahoma.gov/ltgovernor.html' },
  oh: { label: 'ltgovernor.ohio.gov', url: 'https://ltgovernor.ohio.gov/' },
};

const NEW = {
  garlin_gilchrist: {
    roster: { name: 'Garlin Gilchrist', office: 'Lieutenant Governor', state: 'Michigan', party: 'D', score: 53, icon: '🏛', issues: ['Economic Mobility', 'Infrastructure', 'Housing', 'Check on D.C.'] },
    label: 'Garlin Gilchrist — 🏛 Michigan Lieutenant Governor (D)',
    cards: [
      { topic: 'Economic Mobility', icon: '📈', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A former engineer, Gilchrist has focused on economic-mobility, small-business, and workforce initiatives as part of the Whitmer administration.',
        evidence: 'Michigan Lieutenant Governor since 2019; a 2026 candidate for governor.', source: S.mi },
      { topic: 'Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Backed Michigan’s road-and-water infrastructure investments, including lead-pipe replacement.', source: S.mi },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Supports expanding housing supply and affordability across Michigan.', source: S.mi },
      { topic: 'Check on D.C.', icon: '🏛', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Frames his 2026 gubernatorial run around defending Michigan from federal cuts while continuing the administration’s agenda.', source: S.mi },
    ],
  },
  austin_davis: {
    roster: { name: 'Austin Davis', office: 'Lieutenant Governor', state: 'Pennsylvania', party: 'D', score: 53, icon: '🏛', issues: ['Labor', 'Gun Safety', 'Transit', 'Community Safety'] },
    label: 'Austin Davis — 🏛 Pennsylvania Lieutenant Governor (D)',
    cards: [
      { topic: 'Labor', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A former transit worker’s ally and state representative, Davis backs union and worker-protection priorities in the Shapiro administration.',
        evidence: 'Pennsylvania Lieutenant Governor since 2023; the first Black person to hold the office; presides over the state Senate.', source: S.pa },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Advocates for background-check and safe-storage measures after gun violence in his home region.', source: S.pa },
      { topic: 'Transit', icon: '🚌', pos: 'support', issueKey: 'transit', issueStance: 'support',
        text: 'Champions public-transit funding, a priority tied to his Allegheny County roots.', source: S.pa },
      { topic: 'Community Safety', icon: '🚔', pos: 'mixed', issueKey: 'justice_reform', issueStance: 'mixed',
        text: 'Backs a mix of violence-prevention funding and public-safety measures.', source: S.pa },
    ],
  },
  eleni_kounalakis: {
    roster: { name: 'Eleni Kounalakis', office: 'Lieutenant Governor', state: 'California', party: 'D', score: 53, icon: '🏛', issues: ['Climate', 'Housing', 'Higher Education', 'Trade'] },
    label: 'Eleni Kounalakis — 🏛 California Lieutenant Governor (D)',
    cards: [
      { topic: 'Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'A lead voice on California climate policy and international climate diplomacy; the first woman elected California Lt. Governor.',
        evidence: 'California Lieutenant Governor since 2019; a former U.S. Ambassador to Hungary and a 2026 candidate for governor.', source: S.ca },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Backs expanding California housing production to address affordability.', source: S.ca },
      { topic: 'Higher Education', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: 'Serves on the UC and CSU governing boards and backs college-affordability measures.', source: S.ca },
      { topic: 'Trade', icon: '🌐', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: 'Leads California trade and investment missions as part of the office’s economic role.', source: S.ca },
    ],
  },
  peggy_flanagan: {
    roster: { name: 'Peggy Flanagan', office: 'Lieutenant Governor', state: 'Minnesota', party: 'D', score: 53, icon: '🏛', issues: ['Children & Families', 'Tribal Affairs', 'Paid Leave', 'Health Care'] },
    label: 'Peggy Flanagan — 🏛 Minnesota Lieutenant Governor (D)',
    cards: [
      { topic: 'Children & Families', icon: '👶', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'A former child-advocacy leader, Flanagan championed Minnesota’s child tax credit and free school meals.',
        evidence: 'Minnesota Lieutenant Governor since 2019; one of the highest-ranking Native American women elected in the U.S.', source: S.mn },
      { topic: 'Tribal Affairs', icon: '🪶', pos: 'support', issueKey: 'justice_reform', issueStance: 'support',
        text: 'A member of the White Earth Band of Ojibwe, she has centered tribal consultation and Native issues in state policy.', source: S.mn },
      { topic: 'Paid Leave', icon: '🗓', pos: 'support', issueKey: 'paid_leave', issueStance: 'support',
        text: 'Backed Minnesota’s paid family and medical leave law.', source: S.mn },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports expanding health coverage and defending it against federal cuts.', source: S.mn },
    ],
  },
  burt_jones: {
    roster: { name: 'Burt Jones', office: 'Lieutenant Governor', state: 'Georgia', party: 'R', score: 53, icon: '🏛', issues: ['Tax Cuts', 'Public Safety', 'School Choice', 'Elections'] },
    label: 'Burt Jones — 🏛 Georgia Lieutenant Governor (R)',
    cards: [
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'As president of the Georgia Senate, Jones has pushed income-tax cuts and rebates, including moving Georgia toward a flat tax.',
        evidence: 'Georgia Lieutenant Governor since 2023; a 2026 candidate for governor with President Trump’s endorsement.', source: S.ga },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backs tougher penalties and funding for law enforcement.', source: S.ga },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Championed Georgia’s private-school voucher program through the Senate.', source: S.ga },
      { topic: 'Elections', icon: '🗳', pos: 'mixed', issueKey: 'election_integrity', issueStance: 'mixed',
        text: 'A 2020 Trump elector in Georgia, Jones has backed tighter election rules — a stance central to the state’s contested election debates.', source: S.ga },
    ],
  },
  delbert_hosemann: {
    roster: { name: 'Delbert Hosemann', office: 'Lieutenant Governor', state: 'Mississippi', party: 'R', score: 54, icon: '🏛', issues: ['Education Funding', 'Fiscal Restraint', 'Health Care', 'Infrastructure'] },
    label: 'Delbert Hosemann — 🏛 Mississippi Lieutenant Governor (R)',
    cards: [
      { topic: 'Education Funding', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Led a rewrite of Mississippi’s school-funding formula to send more money to public schools, working across a GOP intraparty divide.',
        evidence: 'Mississippi Lieutenant Governor since 2020; a former Secretary of State; presides over the state Senate.', source: S.ms },
      { topic: 'Fiscal Restraint', icon: '🧾', pos: 'mixed', issueKey: 'lower_taxes', issueStance: 'mixed',
        text: 'Backed cutting the income tax but urged a more cautious phase-out than the House, a notable Senate-vs-House tension.', source: S.ms },
      { topic: 'Health Care', icon: '🏥', pos: 'mixed', issueKey: 'healthcare', issueStance: 'mixed',
        text: 'Signaled more openness than many in his party to a Medicaid-expansion-style plan for working Mississippians, though it did not become law.', source: S.ms },
      { topic: 'Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Prioritized water-system and road investment, including after the Jackson water crisis.', source: S.ms },
    ],
  },
  matt_pinnell: {
    roster: { name: 'Matt Pinnell', office: 'Lieutenant Governor', state: 'Oklahoma', party: 'R', score: 53, icon: '🏛', issues: ['Tourism & Small Business', 'School Choice', 'Taxes', 'Workforce'] },
    label: 'Matt Pinnell — 🏛 Oklahoma Lieutenant Governor (R)',
    cards: [
      { topic: 'Tourism & Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: 'Doubles as Oklahoma’s Secretary of Tourism, promoting small business and tourism-driven economic development.',
        evidence: 'Oklahoma Lieutenant Governor since 2019; a 2026 candidate for governor.', source: S.ok },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs Oklahoma’s school-choice and tax-credit-scholarship programs.', source: S.ok },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supports cutting or eliminating Oklahoma’s income tax.', source: S.ok },
      { topic: 'Workforce', icon: '🛠', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backs workforce-training and career-tech initiatives.', source: S.ok },
    ],
  },
  jim_tressel: {
    roster: { name: 'Jim Tressel', office: 'Lieutenant Governor', state: 'Ohio', party: 'R', score: 53, icon: '🏛', issues: ['Workforce & Education', 'Economic Development', 'Public Service', 'Higher Education'] },
    label: 'Jim Tressel — 🏛 Ohio Lieutenant Governor (R)',
    cards: [
      { topic: 'Workforce & Education', icon: '🎓', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: 'A former national-championship football coach and university president, Tressel has centered workforce development and career readiness.',
        evidence: 'Ohio Lieutenant Governor since 2025, appointed by Governor Mike DeWine after Jon Husted joined the U.S. Senate.', source: S.oh },
      { topic: 'Economic Development', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Backs Ohio’s workforce and economic-development push, including advanced manufacturing.', source: S.oh },
      { topic: 'Higher Education', icon: '🏫', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: 'Draws on his tenure as Youngstown State University president to focus on college access and affordability.', source: S.oh },
      { topic: 'Public Service', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A political newcomer to elected office, cast as a unifying, service-focused figure rather than a partisan warrior.', source: S.oh },
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

console.log(`PolitiDex — National Lieutenant Governors WAVE 1  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');
for (const id of Object.keys(NEW)) console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(20)} (${NEW[id].roster.name})`);
if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — Lieutenant Governors (MI · PA · CA · MN · GA · MS · OK · OH) · Lt. Gov wave 1 (Jul 2026) ─\n' +
    stanceToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${stanceToAdd.length} stance array(s) → politician-stances.js`);
} else console.log('  · stance arrays present — skipped');

if (cmpToAdd.length) {
  const cmpAnchor = 'window.CMP_DATA = window.CMP_DATA || {}),\n{\n';
  if (!cmpRaw.includes(cmpAnchor)) { console.error('✗ cmp-data anchor missing'); process.exit(1); }
  const rows = cmpToAdd.map((id) => {
    const r = NEW[id].roster;
    return ` "${id}": {\n  "name": "${r.name.replace(/"/g, '\\"')}",\n  "office": "${r.office}",\n  "state": "${r.state}",\n  "party": "${r.party}",\n  "score": ${r.score},\n  "kept": 0,\n  "broken": 0,\n  "pending": 0,\n  "icon": "${r.icon}",\n  "issues": [\n${r.issues.map((i) => `   "${i.replace(/"/g, '\\"')}"`).join(',\n')}\n  ]\n },`;
  }).join('\n');
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — Lieutenant Governors (Lt. Gov wave 1, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National Lt. Gov wave 1 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National Lt. Gov wave 1 — Lieutenant Governors: MI · PA · CA · MN · GA · MS · OK · OH (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list → index.html`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

let ext = fs.readFileSync(EXT, 'utf8');
const extAnchor = 'var d = {';
const extToAdd = Object.keys(NEW).filter((id) => !ext.includes(`"${id}":[`));
if (extToAdd.length && ext.includes(extAnchor)) {
  const json = extToAdd.map((id) => JSON.stringify(id) + ':' + JSON.stringify(NEW[id].cards)).join(',') + ',';
  ext = ext.replace(extAnchor, extAnchor + json);
  fs.writeFileSync(EXT, ext);
  console.log(`  ✎ mirrored ${extToAdd.length} entry(ies) → politician-stances-ext.js`);
} else console.log('  · ext entries present or anchor missing — skipped');

console.log('\nApplied.');
