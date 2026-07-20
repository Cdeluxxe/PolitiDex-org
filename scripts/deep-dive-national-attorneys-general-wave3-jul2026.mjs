#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE ATTORNEYS GENERAL, WAVE 3 (July 2026)
// ---------------------------------------------------------------------------
// After AG waves 1-2 (16 states), this opens eight more — balanced 4D / 4R —
// widening the national AG map and the multistate-litigation story that ties AGs
// to the Legislation library and the abortion, guns, energy, consumer, and
// federal-power Spotlights:
//
//   REPUBLICANS
//   • RUSSELL COLEMAN (russell_coleman) — Kentucky AG
//   • MIKE HILGERS (mike_hilgers) — Nebraska AG
//   • JOHN FORMELLA (john_formella) — New Hampshire AG
//   • JB McCUSKEY (jb_mccuskey) — West Virginia AG
//   DEMOCRATS
//   • PETER NERONHA (peter_neronha) — Rhode Island AG
//   • CHARITY CLARK (charity_clark) — Vermont AG
//   • AARON FREY (aaron_frey) — Maine AG
//   • ANNE LOPEZ (anne_lopez) — Hawaii AG
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Court- or voter-constrained records are
// marked mixed and attributed. Sources are official state AG offices.
//
// Writes to the CURRENT data layout (see AG waves 1-2):
//   • cmp-data.js · politician-stances.js · politician-stances-ext.js · index.html
// Idempotent + client-side.
//   node scripts/deep-dive-national-attorneys-general-wave3-jul2026.mjs           # dry run
//   node scripts/deep-dive-national-attorneys-general-wave3-jul2026.mjs --apply   # write
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
  ky: { label: 'ag.ky.gov', url: 'https://www.ag.ky.gov/' },
  ne: { label: 'ago.nebraska.gov', url: 'https://ago.nebraska.gov/' },
  nh: { label: 'doj.nh.gov', url: 'https://www.doj.nh.gov/' },
  wv: { label: 'ago.wv.gov', url: 'https://ago.wv.gov/' },
  ri: { label: 'riag.ri.gov', url: 'https://riag.ri.gov/' },
  vt: { label: 'ago.vermont.gov', url: 'https://ago.vermont.gov/' },
  me: { label: 'maine.gov/ag', url: 'https://www.maine.gov/ag/' },
  hi: { label: 'ag.hawaii.gov', url: 'https://ag.hawaii.gov/' },
};

const NEW = {
  russell_coleman: {
    roster: { name: 'Russell Coleman', office: 'State Attorney General', state: 'Kentucky', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Public Safety', 'Abortion', 'Consumer Protection'] },
    label: 'Russell Coleman — ⚖️ Kentucky Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal rules.',
        evidence: 'Kentucky Attorney General since 2024; a former U.S. Attorney for the Western District of Kentucky.', source: S.ky },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made fentanyl, drug trafficking, and violent crime a central focus.', source: S.ky },
      { topic: 'Abortion', icon: '🕊', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Defends Kentucky’s abortion restrictions, though state voters rejected a 2022 anti-abortion constitutional amendment, constraining how far the law can go.', source: S.ky },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Directs opioid-settlement funds and pursues consumer-protection cases.', source: S.ky },
    ],
  },
  mike_hilgers: {
    roster: { name: 'Mike Hilgers', office: 'State Attorney General', state: 'Nebraska', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Abortion', 'Energy & Ag', 'Public Safety'] },
    label: 'Mike Hilgers — ⚖️ Nebraska Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal environmental and regulatory actions.',
        evidence: 'Nebraska Attorney General since 2023; a former Speaker of the Nebraska Legislature.', source: S.ne },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Nebraska’s 12-week abortion ban.', source: S.ne },
      { topic: 'Energy & Agriculture', icon: '🌽', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs Nebraska agriculture and energy interests against federal limits.', source: S.ne },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Emphasizes fentanyl and violent-crime enforcement.', source: S.ne },
    ],
  },
  john_formella: {
    roster: { name: 'John Formella', office: 'State Attorney General', state: 'New Hampshire', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Public Safety', 'Consumer Protection', 'Elections'] },
    label: 'John Formella — ⚖️ New Hampshire Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins multistate suits selectively, reflecting New Hampshire’s independent streak.',
        evidence: 'New Hampshire Attorney General since 2021.', source: S.nh },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes the state’s fentanyl and drug-trafficking response.', source: S.nh },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection and antitrust enforcement.', source: S.nh },
      { topic: 'Elections', icon: '🗳', pos: 'mixed', issueKey: 'election_integrity', issueStance: 'mixed',
        text: 'Oversees enforcement of New Hampshire’s election laws and defends them in court.', source: S.nh },
    ],
  },
  jb_mccuskey: {
    roster: { name: 'JB McCuskey', office: 'State Attorney General', state: 'West Virginia', party: 'R', score: 53, icon: '⚖️', issues: ['Energy', 'Federal Pushback', 'Public Safety', 'Consumer Protection'] },
    label: 'JB McCuskey — ⚖️ West Virginia Attorney General (R)',
    cards: [
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A vocal defender of West Virginia coal and gas, backing challenges to federal energy and environmental rules.',
        evidence: 'West Virginia Attorney General since 2025; a former state auditor.', source: S.wv },
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Continues West Virginia’s tradition of leading multistate suits against federal regulations.', source: S.wv },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Focuses on the opioid crisis and fentanyl enforcement.', source: S.wv },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Directs opioid-settlement funds toward treatment and recovery.', source: S.wv },
    ],
  },
  peter_neronha: {
    roster: { name: 'Peter Neronha', office: 'State Attorney General', state: 'Rhode Island', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Health Care', 'Gun Safety', 'Environment'] },
    label: 'Peter Neronha — ⚖️ Rhode Island Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'An outspoken litigator, Neronha has joined dozens of multistate suits challenging Trump-administration actions on funding, health, and the environment.',
        evidence: 'Rhode Island Attorney General since 2019; a former U.S. Attorney.', source: S.ri },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Pushed hospital-oversight and health-care-access enforcement, including scrutiny of hospital mergers and financial distress.', source: S.ri },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs and defends Rhode Island’s gun-safety laws.', source: S.ri },
      { topic: 'Environment', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Pursued climate and environmental enforcement, including litigation against fossil-fuel companies.', source: S.ri },
    ],
  },
  charity_clark: {
    roster: { name: 'Charity Clark', office: 'State Attorney General', state: 'Vermont', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Gun Safety', 'Abortion Rights'] },
    label: 'Charity Clark — ⚖️ Vermont Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined multistate suits challenging federal funding cuts and policy changes.',
        evidence: 'Vermont Attorney General since 2023; the first woman elected Vermont AG.', source: S.vt },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Emphasizes consumer-protection and data-privacy enforcement.', source: S.vt },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Vermont’s gun-safety measures.', source: S.vt },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends Vermont’s abortion-access protections.', source: S.vt },
    ],
  },
  aaron_frey: {
    roster: { name: 'Aaron Frey', office: 'State Attorney General', state: 'Maine', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Gun Safety', 'Abortion Rights'] },
    label: 'Aaron Frey — ⚖️ Maine Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined multistate suits over federal funding and policy affecting Maine.',
        evidence: 'Maine Attorney General since 2019.', source: S.me },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection and antitrust cases.', source: S.me },
      { topic: 'Gun Safety', icon: '🦺', pos: 'mixed', issueKey: 'gun_safety', issueStance: 'mixed',
        text: 'Enforces Maine’s gun laws; after the 2023 Lewiston shooting, backed new safety measures in a traditionally gun-friendly state.', source: S.me },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends Maine’s abortion-access protections.', source: S.me },
    ],
  },
  anne_lopez: {
    roster: { name: 'Anne Lopez', office: 'State Attorney General', state: 'Hawaii', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Gun Safety', 'Consumer Protection', 'Environment'] },
    label: 'Anne Lopez — ⚖️ Hawaii Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined multistate suits challenging federal actions affecting Hawaii.',
        evidence: 'Hawaii Attorney General since 2023.', source: S.hi },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Hawaii’s firearm laws, among the nation’s strictest, in post-Bruen litigation.', source: S.hi },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection enforcement.', source: S.hi },
      { topic: 'Environment', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs Hawaii’s climate litigation and environmental protections.', source: S.hi },
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

console.log(`PolitiDex — National state Attorneys General WAVE 3  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');

for (const id of Object.keys(NEW)) {
  console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(18)} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Attorneys General (KY · NE · NH · WV · RI · VT · ME · HI) · AG wave 3 (Jul 2026) ─\n' +
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
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Attorneys General (AG wave 3, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National AG wave 3 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National AG wave 3 — state Attorneys General: KY · NE · NH · WV · RI · VT · ME · HI (July 2026)\n" +
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
