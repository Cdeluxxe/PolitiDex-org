#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE ATTORNEYS GENERAL, WAVE 5 (July 2026)
// ---------------------------------------------------------------------------
// Completes all-50-state Attorney General coverage with the last two offices:
//   • MARTY JACKLEY (marty_jackley) — South Dakota AG (R) — completes an existing
//     partial profile: stance cards already shipped; this adds the roster entry.
//   • JAY JONES (jay_jones) — Virginia AG (D) — new; took office in January 2026.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. For a newly seated AG, cards state only
// verifiable facts (election, prior role, stated priorities) and are marked mixed
// where forward-looking. Sources are official state AG offices.
//
// Writes to the CURRENT data layout (see AG waves 1-4). Idempotent + client-side.
//   node scripts/deep-dive-national-attorneys-general-wave5-jul2026.mjs --apply
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
  sd: { label: 'atg.sd.gov', url: 'https://atg.sd.gov/' },
  va: { label: 'oag.state.va.us', url: 'https://www.oag.state.va.us/' },
};

const NEW = {
  marty_jackley: {
    roster: { name: 'Marty Jackley', office: 'State Attorney General', state: 'South Dakota', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Public Safety', 'Consumer Protection', 'Abortion'] },
    label: 'Marty Jackley — ⚖️ South Dakota Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joins Republican-led multistate suits against federal rules.',
        evidence: 'South Dakota Attorney General (2023–present; also served 2009–2019); a former U.S. Attorney.', source: S.sd },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes violent-crime, drug-trafficking, and cold-case enforcement.', source: S.sd },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Runs South Dakota’s consumer-protection and opioid-settlement efforts.', source: S.sd },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends South Dakota’s near-total abortion ban; state voters rejected a 2024 abortion-rights amendment.', source: S.sd },
    ],
  },
  jay_jones: {
    roster: { name: 'Jay Jones', office: 'State Attorney General', state: 'Virginia', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Abortion Rights', 'Criminal Justice'] },
    label: 'Jay Jones — ⚖️ Virginia Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Took office in 2026 and signaled Virginia would rejoin Democratic-led multistate suits challenging federal actions.',
        evidence: 'Virginia Attorney General since January 2026; a former member of the Virginia House of Delegates who defeated incumbent Jason Miyares in 2025.', source: S.va },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pledged to prioritize consumer- and worker-protection enforcement.', source: S.va },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs protecting abortion access in Virginia.', source: S.va },
      { topic: 'Criminal Justice', icon: '⚖️', pos: 'mixed', issueKey: 'justice_reform', issueStance: 'mixed',
        text: 'As a delegate he worked on criminal-justice measures; as AG he balances reform with public-safety enforcement.', source: S.va },
    ],
  },
};

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
const allCards = Object.values(NEW).flatMap((p) => p.cards);
for (const c of allCards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ invalid issueKey '${c.issueKey}'`); bad++; }
console.log(bad ? `  ✗ ${bad} invalid\n` : `  ✓ all ${allCards.length} issueKeys valid (${valid.size} keys)\n`);
if (bad) process.exit(1);

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function cardStr(c) {
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

console.log(`PolitiDex — AG WAVE 5 (complete the map)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');
for (const id of Object.keys(NEW)) console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· stances exist'} ${id} (${NEW[id].roster.name})`);
if (!APPLY) { console.log('\nDry run.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Attorneys General (SD · VA) · AG wave 5, completes all 50 (Jul 2026) ─\n' +
    stanceToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${stanceToAdd.length} stance array(s)`);
}
if (cmpToAdd.length) {
  const cmpAnchor = 'window.CMP_DATA = window.CMP_DATA || {}),\n{\n';
  const rows = cmpToAdd.map((id) => {
    const r = NEW[id].roster;
    return ` "${id}": {\n  "name": "${r.name}",\n  "office": "${r.office}",\n  "state": "${r.state}",\n  "party": "${r.party}",\n  "score": ${r.score},\n  "kept": 0,\n  "broken": 0,\n  "pending": 0,\n  "icon": "${r.icon}",\n  "issues": [\n${r.issues.map((i) => `   "${i}"`).join(',\n')}\n  ]\n },`;
  }).join('\n');
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Attorneys General (AG wave 5, completes all 50, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s)`);
}
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National AG wave 5 —')) {
  const seedBlock = '\n        // National AG wave 5 — completes all-50 AG coverage: SD · VA (July 2026)\n        ' +
    Object.keys(NEW).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ seeded ${Object.keys(NEW).length} id(s) into PROFILES`);
}
let ext = fs.readFileSync(EXT, 'utf8');
const extAnchor = 'var d = {';
const extToAdd = Object.keys(NEW).filter((id) => !ext.includes(`"${id}":[`));
if (extToAdd.length) {
  const json = extToAdd.map((id) => JSON.stringify(id) + ':' + JSON.stringify(NEW[id].cards)).join(',') + ',';
  ext = ext.replace(extAnchor, extAnchor + json);
  fs.writeFileSync(EXT, ext);
  console.log(`  ✎ mirrored ${extToAdd.length} entry(ies) → ext`);
}
console.log('\nApplied.');
