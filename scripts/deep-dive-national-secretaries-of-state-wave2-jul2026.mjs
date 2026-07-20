#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE SECRETARIES OF STATE, WAVE 2 (July 2026)
// ---------------------------------------------------------------------------
// Extends the election-officials class (SoS wave 1: MI·AZ·NV·MN·GA·OH·PA·AL) to
// eight more states, balanced 4D / 4R. IMPORTANT accuracy note: only states where
// the Secretary of State is actually the chief election officer are included here —
// states that run elections through a separate board (e.g., Wisconsin, North
// Carolina) are intentionally left out so no card overstates the office's role.
//
//   DEMOCRATS (chief election officers)
//   • SHIRLEY WEBER (shirley_weber) — California SoS
//   • JENA GRISWOLD (jena_griswold) — Colorado SoS
//   • STEVE HOBBS (steve_hobbs) — Washington SoS
//   • MAGGIE TOULOUSE OLIVER (maggie_toulouse_oliver) — New Mexico SoS
//   REPUBLICANS (chief election officers)
//   • JANE NELSON (jane_nelson_tx) — Texas SoS
//   • DIEGO MORALES (diego_morales) — Indiana SoS
//   • MICHAEL WATSON (michael_watson_ms) — Mississippi SoS
//   • MICHAEL ADAMS (michael_adams_ky) — Kentucky SoS
//
// Ties to the election-integrity / voting-access / voter-ID Spotlights and the SAVE
// Act (H.R. 22). Contested administration choices are marked mixed and attributed.
// Sources are official Secretary of State offices.
//
// Writes to the CURRENT data layout. Idempotent + client-side.
//   node scripts/deep-dive-national-secretaries-of-state-wave2-jul2026.mjs --apply
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
  ca: { label: 'sos.ca.gov', url: 'https://www.sos.ca.gov/' },
  co: { label: 'coloradosos.gov', url: 'https://www.coloradosos.gov/' },
  wa: { label: 'sos.wa.gov', url: 'https://www.sos.wa.gov/' },
  nm: { label: 'sos.nm.gov', url: 'https://www.sos.nm.gov/' },
  tx: { label: 'sos.texas.gov', url: 'https://www.sos.texas.gov/' },
  in: { label: 'sos.in.gov', url: 'https://www.in.gov/sos/' },
  ms: { label: 'sos.ms.gov', url: 'https://www.sos.ms.gov/' },
  ky: { label: 'sos.ky.gov', url: 'https://www.sos.ky.gov/' },
};

const NEW = {
  shirley_weber: {
    roster: { name: 'Shirley Weber', office: 'Secretary of State', state: 'California', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Election Administration', 'Transparency', 'Democracy'] },
    label: 'Shirley Weber — 🗳 California Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Oversees California’s all-mail-ballot elections and broad voter-access rules for the nation’s largest electorate.',
        evidence: 'California Secretary of State since 2021; a former assemblymember who authored the state’s reparations study task force.', source: S.ca },
      { topic: 'Election Administration', icon: '⚙️', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Runs elections for the most populous state and defends their integrity against fraud claims.', source: S.ca },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Oversees campaign-finance disclosure (Cal-Access) and business filings.', source: S.ca },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Defends election workers and the process against intimidation and disinformation.', source: S.ca },
    ],
  },
  jena_griswold: {
    roster: { name: 'Jena Griswold', office: 'Secretary of State', state: 'Colorado', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Election Security', 'Election Workers', 'Democracy'] },
    label: 'Jena Griswold — 🗳 Colorado Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Defends Colorado’s mail-ballot model, often cited as a national gold standard for access.',
        evidence: 'Colorado Secretary of State since 2019.', source: S.co },
      { topic: 'Election Security', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Backs risk-limiting audits and acted against a county clerk over a voting-system breach.', source: S.co },
      { topic: 'Election Workers', icon: '🛡', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'A national voice on election-worker safety and countering threats after 2020.', source: S.co },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Publishes detailed election and campaign-finance data.', source: S.co },
    ],
  },
  steve_hobbs: {
    roster: { name: 'Steve Hobbs', office: 'Secretary of State', state: 'Washington', party: 'D', score: 53, icon: '🗳', issues: ['Election Administration', 'Election Security', 'Voting Access', 'Disinformation'] },
    label: 'Steve Hobbs — 🗳 Washington Secretary of State (D)',
    cards: [
      { topic: 'Election Administration', icon: '⚙️', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Runs Washington’s all-mail elections and defends their accuracy.',
        evidence: 'Washington Secretary of State since 2021 (appointed, then elected); a National Guard officer.', source: S.wa },
      { topic: 'Election Security', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Created a state office to counter election-related disinformation and cyber threats.', source: S.wa },
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Maintains Washington’s automatic registration and universal mail-ballot access.', source: S.wa },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Defends the process publicly against fraud claims.', source: S.wa },
    ],
  },
  maggie_toulouse_oliver: {
    roster: { name: 'Maggie Toulouse Oliver', office: 'Secretary of State', state: 'New Mexico', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Transparency', 'Election Security', 'Democracy'] },
    label: 'Maggie Toulouse Oliver — 🗳 New Mexico Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Championed New Mexico’s Voting Rights Act expanding automatic registration and access.',
        evidence: 'New Mexico Secretary of State since 2016.', source: S.nm },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Modernized campaign-finance disclosure and lobbying-transparency systems.', source: S.nm },
      { topic: 'Election Security', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Backs paper-ballot audits and election-security funding.', source: S.nm },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'A national voice for election administration and defending results.', source: S.nm },
    ],
  },
  jane_nelson_tx: {
    roster: { name: 'Jane Nelson', office: 'Secretary of State', state: 'Texas', party: 'R', score: 53, icon: '🗳', issues: ['Election Administration', 'Voter Rolls', 'Election Integrity', 'Business'] },
    label: 'Jane Nelson — 🗳 Texas Secretary of State (R)',
    cards: [
      { topic: 'Election Administration', icon: '⚙️', pos: 'mixed', issueKey: 'election_integrity', issueStance: 'mixed',
        text: 'Serves as Texas’s chief election officer, implementing the state’s election laws and defending results in the nation’s second-largest state.',
        evidence: 'Texas Secretary of State since 2023, appointed by Governor Greg Abbott; a former long-serving state senator and Finance Committee chair.', source: S.tx },
      { topic: 'Voter Rolls', icon: '📋', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Oversees Texas’s voter-roll maintenance and citizenship-verification efforts.', source: S.tx },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Administers Texas’s photo-ID voting requirement.', source: S.tx },
      { topic: 'Access Debate', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Texas’s tightened voting rules (SB 1) are defended by the state as securing elections and criticized by opponents as narrowing access.', source: S.tx },
    ],
  },
  diego_morales: {
    roster: { name: 'Diego Morales', office: 'Secretary of State', state: 'Indiana', party: 'R', score: 53, icon: '🗳', issues: ['Voter Rolls', 'Election Integrity', 'Voter ID', 'Business'] },
    label: 'Diego Morales — 🗳 Indiana Secretary of State (R)',
    cards: [
      { topic: 'Voter Rolls', icon: '📋', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Prioritizes voter-roll maintenance and citizenship checks as Indiana’s chief election officer.',
        evidence: 'Indiana Secretary of State since 2023.', source: S.in },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backs Indiana’s photo-ID requirement, among the earliest in the nation.', source: S.in },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes election-security measures and public confidence.', source: S.in },
      { topic: 'Access Debate', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Indiana’s ID and registration rules are defended as securing elections and criticized as limiting access.', source: S.in },
    ],
  },
  michael_watson_ms: {
    roster: { name: 'Michael Watson', office: 'Secretary of State', state: 'Mississippi', party: 'R', score: 53, icon: '🗳', issues: ['Voter Rolls', 'Voter ID', 'Election Integrity', 'Access Debate'] },
    label: 'Michael Watson — 🗳 Mississippi Secretary of State (R)',
    cards: [
      { topic: 'Voter Rolls', icon: '📋', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Runs Mississippi’s voter-roll maintenance and election administration.',
        evidence: 'Mississippi Secretary of State since 2020; a former state senator.', source: S.ms },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backs Mississippi’s photo-ID requirement to vote.', source: S.ms },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes election-security and citizenship-verification measures.', source: S.ms },
      { topic: 'Access Debate', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Drew criticism for comments opposing broader mail voting; defends Mississippi’s in-person-focused rules as secure.', source: S.ms },
    ],
  },
  michael_adams_ky: {
    roster: { name: 'Michael Adams', office: 'Secretary of State', state: 'Kentucky', party: 'R', score: 54, icon: '🗳', issues: ['Bipartisan Access', 'Voter Rolls', 'Election Integrity', 'Voter ID'] },
    label: 'Michael Adams — 🗳 Kentucky Secretary of State (R)',
    cards: [
      { topic: 'Bipartisan Access', icon: '🤝', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Won bipartisan praise for expanding early voting in Kentucky while adding an ID requirement — a rare access-and-integrity compromise, backed by both parties.',
        evidence: 'Kentucky Secretary of State since 2020; re-elected in 2023 with the widest margin of any statewide candidate.', source: S.ky },
      { topic: 'Voter Rolls', icon: '📋', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Ran a major voter-roll cleanup, removing hundreds of thousands of outdated registrations.', source: S.ky },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Defends Kentucky’s elections and pushed back on fraud claims within his own party.', source: S.ky },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backed Kentucky’s photo-ID law, paired with free IDs and expanded early voting.', source: S.ky },
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

console.log(`PolitiDex — National Secretaries of State WAVE 2  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');
for (const id of Object.keys(NEW)) console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(24)} (${NEW[id].roster.name})`);
if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Secretaries of State (CA · CO · WA · NM · TX · IN · MS · KY) · SoS wave 2 (Jul 2026) ─\n' +
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
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Secretaries of State (SoS wave 2, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National SoS wave 2 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National SoS wave 2 — state Secretaries of State: CA · CO · WA · NM · TX · IN · MS · KY (July 2026)\n" +
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
