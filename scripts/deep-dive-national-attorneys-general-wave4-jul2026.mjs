#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE ATTORNEYS GENERAL, WAVE 4 (July 2026)
// ---------------------------------------------------------------------------
// After AG waves 1-3 (24 states), this nearly completes the national AG map by
// adding six more, including the two largest still-missing offices:
//
//   REPUBLICANS
//   • KEN PAXTON (ken_paxton) — Texas AG  [completes an existing partial profile:
//     stance cards already shipped; this adds the roster + search entry]
//   • TREG TAYLOR (treg_taylor) — Alaska AG
//   • DEREK BROWN (derek_brown_ut) — Utah AG
//   • CATHERINE HANAWAY (catherine_hanaway) — Missouri AG
//   • BRIDGET HILL (bridget_hill) — Wyoming AG
//   DEMOCRATS
//   • MATTHEW PLATKIN (matthew_platkin) — New Jersey AG
//
// The remaining count skews Republican because the still-uncovered AG offices are
// mostly in red states — a geographic fact, not an editorial choice; the cards
// themselves are factual and balanced.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Voter-/court-constrained records are marked
// mixed and attributed. Sources are official state AG offices.
//
// Writes to the CURRENT data layout (see AG waves 1-3). Idempotent + client-side.
//   node scripts/deep-dive-national-attorneys-general-wave4-jul2026.mjs           # dry run
//   node scripts/deep-dive-national-attorneys-general-wave4-jul2026.mjs --apply   # write
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
  tx: { label: 'texasattorneygeneral.gov', url: 'https://www.texasattorneygeneral.gov/' },
  ak: { label: 'law.alaska.gov', url: 'https://law.alaska.gov/' },
  ut: { label: 'attorneygeneral.utah.gov', url: 'https://attorneygeneral.utah.gov/' },
  mo: { label: 'ago.mo.gov', url: 'https://ago.mo.gov/' },
  wy: { label: 'attorneygeneral.wyo.gov', url: 'https://attorneygeneral.wyo.gov/' },
  nj: { label: 'njoag.gov', url: 'https://www.njoag.gov/' },
};

const NEW = {
  ken_paxton: {
    roster: { name: 'Ken Paxton', office: 'State Attorney General', state: 'Texas', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Immigration', 'Abortion', 'Energy'] },
    label: 'Ken Paxton — ⚖️ Texas Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'The most prolific Republican multistate litigant, Paxton filed dozens of suits against the Biden administration and defends Trump-administration positions in court.',
        evidence: 'Texas Attorney General since 2015; a 2026 candidate for the U.S. Senate.', source: S.tx },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Sued the federal government repeatedly over border and immigration policy and defended Texas’s own border-enforcement measures.', source: S.tx },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Texas’s near-total abortion ban and its enforcement.', source: S.tx },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Challenges federal energy and environmental rules affecting Texas oil and gas.', source: S.tx },
    ],
  },
  matthew_platkin: {
    roster: { name: 'Matthew Platkin', office: 'State Attorney General', state: 'New Jersey', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Gun Safety', 'Consumer Protection', 'Civil Rights'] },
    label: 'Matthew Platkin — ⚖️ New Jersey Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined or led numerous multistate suits challenging Trump-administration actions on federal funding, immigration, and health.',
        evidence: 'New Jersey Attorney General since 2022.', source: S.nj },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Aggressively defends New Jersey’s strict gun laws and has sued firearms manufacturers and sellers.', source: S.nj },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursued consumer-protection, environmental, and corporate-accountability cases.', source: S.nj },
      { topic: 'Civil Rights', icon: '⚖️', pos: 'support', issueKey: 'justice_reform', issueStance: 'support',
        text: 'Expanded police-accountability and civil-rights enforcement statewide.', source: S.nj },
    ],
  },
  treg_taylor: {
    roster: { name: 'Treg Taylor', office: 'State Attorney General', state: 'Alaska', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Energy & Lands', 'Public Safety', 'Consumer Protection'] },
    label: 'Treg Taylor — ⚖️ Alaska Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits and fights federal restrictions on Alaska resource development.',
        evidence: 'Alaska Attorney General since 2021.', source: S.ak },
      { topic: 'Energy & Public Lands', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Central to Alaska’s legal fights over ANWR drilling, oil and gas, and federal land-management rules.', source: S.ak },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes rural public safety and combating drug trafficking.', source: S.ak },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection enforcement across the state.', source: S.ak },
    ],
  },
  derek_brown_ut: {
    roster: { name: 'Derek Brown', office: 'State Attorney General', state: 'Utah', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Public Lands', 'Public Safety', 'Tech & Kids'] },
    label: 'Derek Brown — ⚖️ Utah Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal rules.',
        evidence: 'Utah Attorney General since 2025; a former Utah legislator and state Republican Party chair.', source: S.ut },
      { topic: 'Public Lands', icon: '🏔', pos: 'support', issueKey: 'lands_local', issueStance: 'support',
        text: 'Backs Utah’s effort to assert state control over federal public lands, including a challenge over unappropriated lands.', source: S.ut },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Emphasizes fentanyl and violent-crime enforcement.', source: S.ut },
      { topic: 'Tech & Kids', icon: '💻', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Continues Utah’s prominent push to regulate social media and protect minors online.', source: S.ut },
    ],
  },
  catherine_hanaway: {
    roster: { name: 'Catherine Hanaway', office: 'State Attorney General', state: 'Missouri', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Public Safety', 'Abortion', 'Consumer Protection'] },
    label: 'Catherine Hanaway — ⚖️ Missouri Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Continues Missouri’s tradition of leading Republican multistate suits against federal rules.',
        evidence: 'Missouri Attorney General since 2025; a former U.S. Attorney and the first woman to serve as Speaker of the Missouri House.', source: S.mo },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes violent-crime and fentanyl enforcement, including in St. Louis and Kansas City.', source: S.mo },
      { topic: 'Abortion', icon: '🕊', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Defends Missouri’s abortion restrictions, though Missouri voters approved an abortion-rights amendment in 2024, constraining the law.', source: S.mo },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection enforcement.', source: S.mo },
    ],
  },
  bridget_hill: {
    roster: { name: 'Bridget Hill', office: 'State Attorney General', state: 'Wyoming', party: 'R', score: 53, icon: '⚖️', issues: ['Energy & Lands', 'Federal Pushback', 'Public Safety', 'Consumer Protection'] },
    label: 'Bridget Hill — ⚖️ Wyoming Attorney General (R)',
    cards: [
      { topic: 'Energy & Public Lands', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Leads Wyoming’s legal defense of coal, oil, gas, and federal-lands access against federal restrictions.',
        evidence: 'Wyoming Attorney General since 2019, appointed by Governor Mark Gordon.', source: S.wy },
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal environmental and regulatory actions.', source: S.wy },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Oversees Wyoming’s public-safety and drug-enforcement efforts.', source: S.wy },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection enforcement.', source: S.wy },
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

console.log(`PolitiDex — National state Attorneys General WAVE 4  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');

for (const id of Object.keys(NEW)) {
  const note = stanceToAdd.includes(id) ? '→ CREATE' : '· stances exist (complete roster)';
  console.log(`  ${note.padEnd(30)} ${id.padEnd(18)} (${NEW[id].roster.name})`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Attorneys General (TX · NJ · AK · UT · MO · WY) · AG wave 4 (Jul 2026) ─\n' +
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
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Attorneys General (AG wave 4, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National AG wave 4 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National AG wave 4 — state Attorneys General: TX · NJ · AK · UT · MO · WY (July 2026)\n" +
    "        " + seedIds.map((id) => `'${id}'`).join(', ') + ",";
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
