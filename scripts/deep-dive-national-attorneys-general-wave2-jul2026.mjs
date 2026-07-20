#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE ATTORNEYS GENERAL, WAVE 2 (July 2026)
// ---------------------------------------------------------------------------
// After AG wave 1 (CT · CO · WA · MA · IN · AR · MT · SC), this opens eight more
// states — balanced 4D / 4R — deepening the multistate-litigation story that ties
// AGs to the Legislation library and the abortion, guns, energy, consumer, and
// federal-power Spotlights:
//
//   REPUBLICANS
//   • STEVE MARSHALL (steve_marshall) — Alabama AG
//   • GENTNER DRUMMOND (gentner_drummond) — Oklahoma AG
//   • DREW WRIGLEY (drew_wrigley) — North Dakota AG
//   • LYNN FITCH (lynn_fitch) — Mississippi AG
//   DEMOCRATS
//   • ANTHONY BROWN (anthony_brown) — Maryland AG
//   • DAN RAYFIELD (dan_rayfield) — Oregon AG
//   • RAÚL TORREZ (raul_torrez) — New Mexico AG
//   • KATHY JENNINGS (kathy_jennings) — Delaware AG
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Court- or voter-constrained records are
// marked mixed and attributed. Sources are official state AG offices.
//
// Writes to the CURRENT data layout (see AG wave 1):
//   • cmp-data.js            — roster/search index entry (JSON)
//   • politician-stances.js  — issue stance cards (monolith source)
//   • politician-stances-ext.js — the shipped long-tail chunk (splitter is stale)
//   • index.html             — PROFILES seed allow-list
// Idempotent + client-side.
//   node scripts/deep-dive-national-attorneys-general-wave2-jul2026.mjs           # dry run
//   node scripts/deep-dive-national-attorneys-general-wave2-jul2026.mjs --apply   # write
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
  al: { label: 'alabamaag.gov', url: 'https://www.alabamaag.gov/' },
  ok: { label: 'oag.ok.gov', url: 'https://www.oag.ok.gov/' },
  nd: { label: 'attorneygeneral.nd.gov', url: 'https://attorneygeneral.nd.gov/' },
  ms: { label: 'ago.ms.gov', url: 'https://www.ago.ms.gov/' },
  md: { label: 'marylandattorneygeneral.gov', url: 'https://www.marylandattorneygeneral.gov/' },
  or: { label: 'doj.oregon.gov', url: 'https://www.doj.state.or.us/' },
  nm: { label: 'nmag.gov', url: 'https://nmag.gov/' },
  de: { label: 'attorneygeneral.delaware.gov', url: 'https://attorneygeneral.delaware.gov/' },
};

const NEW = {
  steve_marshall: {
    roster: { name: 'Steve Marshall', office: 'State Attorney General', state: 'Alabama', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Abortion', 'Public Safety', 'Energy'] },
    label: 'Steve Marshall — ⚖️ Alabama Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A leader among Republican attorneys general, Marshall has organized and joined multistate suits against federal rules and backed Trump-administration legal positions.',
        evidence: 'Alabama Attorney General since 2017; a former chair of the Republican Attorneys General Association.', source: S.al },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Alabama’s near-total abortion ban enacted after the Dobbs decision.', source: S.al },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Emphasizes violent-crime and fentanyl prosecution and defends the state’s death penalty.', source: S.al },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Challenges federal environmental and energy rules affecting Alabama industry.', source: S.al },
    ],
  },
  gentner_drummond: {
    roster: { name: 'Gentner Drummond', office: 'State Attorney General', state: 'Oklahoma', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Energy', 'Criminal Justice', 'Public Safety'] },
    label: 'Gentner Drummond — ⚖️ Oklahoma Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal rules while at times breaking with the party’s right flank on individual cases.',
        evidence: 'Oklahoma Attorney General since 2023; a 2026 candidate for governor.', source: S.ok },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Defends Oklahoma oil and gas against federal limits.', source: S.ok },
      { topic: 'Criminal Justice', icon: '⚖️', pos: 'mixed', issueKey: 'justice_reform', issueStance: 'mixed',
        text: 'Drew national attention by urging courts to vacate Richard Glossip’s murder conviction over prosecutorial errors — an unusual move for a Republican AG.', source: S.ok },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes violent-crime and drug-trafficking enforcement.', source: S.ok },
    ],
  },
  drew_wrigley: {
    roster: { name: 'Drew Wrigley', office: 'State Attorney General', state: 'North Dakota', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Energy', 'Public Safety', 'Abortion'] },
    label: 'Drew Wrigley — ⚖️ North Dakota Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal environmental and energy rules.',
        evidence: 'North Dakota Attorney General since 2022; a former U.S. Attorney and lieutenant governor.', source: S.nd },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Defends North Dakota oil, gas, and coal against federal restrictions.', source: S.nd },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Has pushed for tougher sentencing, including for fentanyl-related deaths.', source: S.nd },
      { topic: 'Abortion', icon: '🕊', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Enforced North Dakota’s abortion restrictions, though a state court struck down the near-total ban in 2025.', source: S.nd },
    ],
  },
  lynn_fitch: {
    roster: { name: 'Lynn Fitch', office: 'State Attorney General', state: 'Mississippi', party: 'R', score: 53, icon: '⚖️', issues: ['Abortion', 'Federal Pushback', 'Consumer Protection', 'Human Trafficking'] },
    label: 'Lynn Fitch — ⚖️ Mississippi Attorney General (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Brought and defended Mississippi’s 15-week abortion ban in Dobbs v. Jackson Women’s Health Organization — the case in which the Supreme Court overturned Roe v. Wade.',
        evidence: 'Mississippi Attorney General since 2020; the first woman elected to the office.', source: S.ms },
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal rules.', source: S.ms },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Continues Mississippi’s opioid and consumer-protection enforcement.', source: S.ms },
      { topic: 'Human Trafficking', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made human-trafficking and child-protection prosecution a signature priority.', source: S.ms },
    ],
  },
  anthony_brown: {
    roster: { name: 'Anthony Brown', office: 'State Attorney General', state: 'Maryland', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Civil Rights', 'Gun Safety', 'Consumer Protection'] },
    label: 'Anthony Brown — ⚖️ Maryland Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined multistate suits challenging Trump-administration actions on federal funding and immigration.',
        evidence: 'Maryland Attorney General since 2023; a former U.S. Representative and lieutenant governor, and the first Black person elected Maryland AG.', source: S.md },
      { topic: 'Civil Rights', icon: '⚖️', pos: 'support', issueKey: 'justice_reform', issueStance: 'support',
        text: 'Built out a civil-rights unit and pursued police-accountability and equity cases.', source: S.md },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Maryland’s firearm laws in court.', source: S.md },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection and environmental enforcement.', source: S.md },
    ],
  },
  dan_rayfield: {
    roster: { name: 'Dan Rayfield', office: 'State Attorney General', state: 'Oregon', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Abortion Rights', 'Environment'] },
    label: 'Dan Rayfield — ⚖️ Oregon Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Since taking office in 2025 has joined numerous multistate suits challenging Trump-administration funding freezes and policy changes.',
        evidence: 'Oregon Attorney General since 2025; a former Speaker of the Oregon House.', source: S.or },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Continues Oregon’s consumer-protection and antitrust work.', source: S.or },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends Oregon’s abortion-access protections.', source: S.or },
      { topic: 'Environment', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs Oregon’s environmental and climate enforcement.', source: S.or },
    ],
  },
  raul_torrez: {
    roster: { name: 'Raúl Torrez', office: 'State Attorney General', state: 'New Mexico', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Public Safety', 'Child Safety', 'Abortion Rights'] },
    label: 'Raúl Torrez — ⚖️ New Mexico Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined multistate suits over federal funding and immigration actions affecting New Mexico.',
        evidence: 'New Mexico Attorney General since 2023; a former Bernalillo County district attorney.', source: S.nm },
      { topic: 'Public Safety', icon: '🚔', pos: 'mixed', issueKey: 'tough_on_crime', issueStance: 'mixed',
        text: 'Balances violent-crime and cartel/fentanyl enforcement with juvenile-justice reform in a state with high crime rates.', source: S.nm },
      { topic: 'Child Safety', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Sued major social-media companies over child-safety and addictive-design harms.', source: S.nm },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends New Mexico’s abortion-access protections, including against local ordinances.', source: S.nm },
    ],
  },
  kathy_jennings: {
    roster: { name: 'Kathy Jennings', office: 'State Attorney General', state: 'Delaware', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Gun Safety', 'Criminal Justice'] },
    label: 'Kathy Jennings — ⚖️ Delaware Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins multistate suits challenging federal actions and defends Delaware statutes in court.',
        evidence: 'Delaware Attorney General since 2019.', source: S.de },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Uses Delaware’s corporate-law prominence to pursue consumer-protection and fraud cases.', source: S.de },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Delaware’s gun-safety laws, including its ban on assault-style weapons.', source: S.de },
      { topic: 'Criminal Justice', icon: '⚖️', pos: 'mixed', issueKey: 'justice_reform', issueStance: 'mixed',
        text: 'Backs some criminal-justice reforms while maintaining violent-crime enforcement.', source: S.de },
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

console.log(`PolitiDex — National state Attorneys General WAVE 2  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');

for (const id of Object.keys(NEW)) {
  console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(20)} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

// 1) stance cards → monolith
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Attorneys General (AL · OK · ND · MS · MD · OR · NM · DE) · AG wave 2 (Jul 2026) ─\n' +
    stanceToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${stanceToAdd.length} stance array(s) → politician-stances.js`);
} else console.log('  · stance arrays present — skipped');

// 2) roster rows → cmp-data.js
if (cmpToAdd.length) {
  const cmpAnchor = 'window.CMP_DATA = window.CMP_DATA || {}),\n{\n';
  if (!cmpRaw.includes(cmpAnchor)) { console.error('✗ cmp-data anchor missing'); process.exit(1); }
  const rows = cmpToAdd.map((id) => {
    const r = NEW[id].roster;
    return ` "${id}": {\n  "name": "${r.name.replace(/"/g, '\\"')}",\n  "office": "${r.office}",\n  "state": "${r.state}",\n  "party": "${r.party}",\n  "score": ${r.score},\n  "kept": 0,\n  "broken": 0,\n  "pending": 0,\n  "icon": "${r.icon}",\n  "issues": [\n${r.issues.map((i) => `   "${i.replace(/"/g, '\\"')}"`).join(',\n')}\n  ]\n },`;
  }).join('\n');
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Attorneys General (AG wave 2, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

// 3) PROFILES seed allow-list → index.html
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National AG wave 2 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National AG wave 2 — state Attorneys General: AL · OK · ND · MS · MD · OR · NM · DE (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list → index.html`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

// 4) mirror into the shipped long-tail chunk (politician-stances-ext.js)
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
