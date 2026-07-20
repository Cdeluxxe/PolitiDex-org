#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE SECRETARIES OF STATE, WAVE 1 (July 2026)
// ---------------------------------------------------------------------------
// Opens a NEW office class: the state officials who actually run elections. This
// directly powers the election-integrity / voting-access story and connects to the
// SAVE Act (H.R. 22) and the voter-eligibility Spotlights. Balanced 4D / 4R, weighted
// to the top battlegrounds:
//
//   DEMOCRATS
//   • JOCELYN BENSON (jocelyn_benson) — Michigan SoS
//   • ADRIAN FONTES (adrian_fontes) — Arizona SoS
//   • CISCO AGUILAR (cisco_aguilar) — Nevada SoS
//   • STEVE SIMON (steve_simon) — Minnesota SoS
//   REPUBLICANS
//   • BRAD RAFFENSPERGER (brad_raffensperger) — Georgia SoS
//   • FRANK LaROSE (frank_larose) — Ohio SoS
//   • AL SCHMIDT (al_schmidt) — Pennsylvania SoS (R, appointed by a Democratic gov)
//   • WES ALLEN (wes_allen) — Alabama SoS
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Contested administration choices are marked
// mixed and attributed to both sides. Sources are official Secretary of State offices.
//
// Writes to the CURRENT data layout (see the AG waves). Idempotent + client-side.
//   node scripts/deep-dive-national-secretaries-of-state-wave1-jul2026.mjs           # dry run
//   node scripts/deep-dive-national-secretaries-of-state-wave1-jul2026.mjs --apply   # write
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
  mi: { label: 'michigan.gov/sos', url: 'https://www.michigan.gov/sos' },
  az: { label: 'azsos.gov', url: 'https://azsos.gov/' },
  nv: { label: 'nvsos.gov', url: 'https://www.nvsos.gov/' },
  mn: { label: 'sos.mn.gov', url: 'https://www.sos.mn.gov/' },
  ga: { label: 'sos.ga.gov', url: 'https://sos.ga.gov/' },
  oh: { label: 'ohiosos.gov', url: 'https://www.ohiosos.gov/' },
  pa: { label: 'dos.pa.gov', url: 'https://www.pa.gov/agencies/dos.html' },
  al: { label: 'sos.alabama.gov', url: 'https://www.sos.alabama.gov/' },
};

const NEW = {
  jocelyn_benson: {
    roster: { name: 'Jocelyn Benson', office: 'Secretary of State', state: 'Michigan', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Election Administration', 'Transparency', 'Democracy'] },
    label: 'Jocelyn Benson — 🗳 Michigan Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Expanded early voting, automatic and online registration, and mail-ballot access under Michigan’s Proposal 2 voter-rights amendment.',
        evidence: 'Michigan Secretary of State since 2019; a 2026 candidate for governor and author of a book on the office.', source: S.mi },
      { topic: 'Election Administration', icon: '⚙️', pos: 'mixed', issueKey: 'election_integrity', issueStance: 'mixed',
        text: 'Ran Michigan’s 2020, 2022, and 2024 elections and defended their integrity against fraud claims, while opponents challenged some of her guidance in court.', source: S.mi },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Modernized branch/records services and published detailed election data and audits.', source: S.mi },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Became a national voice for election-worker safety after post-2020 threats.', source: S.mi },
    ],
  },
  adrian_fontes: {
    roster: { name: 'Adrian Fontes', office: 'Secretary of State', state: 'Arizona', party: 'D', score: 53, icon: '🗳', issues: ['Election Administration', 'Voting Access', 'Election Security', 'Democracy'] },
    label: 'Adrian Fontes — 🗳 Arizona Secretary of State (D)',
    cards: [
      { topic: 'Election Administration', icon: '⚙️', pos: 'mixed', issueKey: 'election_integrity', issueStance: 'mixed',
        text: 'Oversees Arizona elections in a top battleground, defending results and procedures amid intense scrutiny and litigation.',
        evidence: 'Arizona Secretary of State since 2023; a former Maricopa County Recorder and U.S. Marine.', source: S.az },
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Backs accessible voting and has opposed measures he views as narrowing the franchise.', source: S.az },
      { topic: 'Election Security', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes election-worker security and cyber and procedural safeguards.', source: S.az },
      { topic: 'Democracy', icon: '🏛', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Clashed with the Republican legislature over the state Elections Procedures Manual, a dispute resolved partly in court.', source: S.az },
    ],
  },
  cisco_aguilar: {
    roster: { name: 'Cisco Aguilar', office: 'Secretary of State', state: 'Nevada', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Election Workers', 'Election Security', 'Democracy'] },
    label: 'Cisco Aguilar — 🗳 Nevada Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Defends Nevada’s universal mail-ballot system and expanded access.',
        evidence: 'Nevada Secretary of State since 2023; a former attorney and foundation executive.', source: S.nv },
      { topic: 'Election Workers', icon: '🛡', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Championed a Nevada law making harassment and intimidation of election workers a crime.', source: S.nv },
      { topic: 'Election Security', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Backs paper-ballot records and post-election audits.', source: S.nv },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Ran on restoring trust in Nevada elections after 2020 denialism.', source: S.nv },
    ],
  },
  steve_simon: {
    roster: { name: 'Steve Simon', office: 'Secretary of State', state: 'Minnesota', party: 'D', score: 53, icon: '🗳', issues: ['Voting Access', 'Election Administration', 'Transparency', 'Democracy'] },
    label: 'Steve Simon — 🗳 Minnesota Secretary of State (D)',
    cards: [
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Oversaw expansions including restoring voting rights to people who have completed felony sentences and automatic registration.',
        evidence: 'Minnesota Secretary of State since 2015.', source: S.mn },
      { topic: 'Election Administration', icon: '⚙️', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Runs Minnesota’s elections, consistently among the nation’s highest-turnout states.', source: S.mn },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Publishes detailed election data and defends the process publicly.', source: S.mn },
      { topic: 'Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'A frequent defender of election integrity against unfounded fraud claims.', source: S.mn },
    ],
  },
  brad_raffensperger: {
    roster: { name: 'Brad Raffensperger', office: 'Secretary of State', state: 'Georgia', party: 'R', score: 53, icon: '🗳', issues: ['2020 Certification', 'Voter ID', 'Election Integrity', 'Voter Rolls'] },
    label: 'Brad Raffensperger — 🗳 Georgia Secretary of State (R)',
    cards: [
      { topic: '2020 Certification', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Refused President Trump’s request to “find 11,780 votes” and certified Georgia’s 2020 result, drawing national attention and party backlash.',
        evidence: 'Georgia Secretary of State since 2019.', source: S.ga },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backed Georgia’s SB 202, which added ID requirements for absentee voting among other changes.', source: S.ga },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes citizenship checks, voter-roll maintenance, and post-election audits.', source: S.ga },
      { topic: 'Voter Access', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Calls Georgia’s system “secure and accessible” and notes record turnout; critics argue SB 202 narrowed access.', source: S.ga },
    ],
  },
  frank_larose: {
    roster: { name: 'Frank LaRose', office: 'Secretary of State', state: 'Ohio', party: 'R', score: 53, icon: '🗳', issues: ['Voter ID', 'Election Integrity', 'Ballot Measures', 'Voter Rolls'] },
    label: 'Frank LaRose — 🗳 Ohio Secretary of State (R)',
    cards: [
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backed Ohio’s photo-ID law and tighter absentee-ballot rules.',
        evidence: 'Ohio Secretary of State since 2019.', source: S.oh },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes voter-roll maintenance and referred alleged noncitizen registrations for prosecution.', source: S.oh },
      { topic: 'Ballot Measures', icon: '🏛', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Led the 2023 Issue 1 effort to raise the threshold for constitutional amendments, which voters rejected before approving an abortion-rights amendment.', source: S.oh },
      { topic: 'Voter Access', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Says Ohio makes it “easy to vote and hard to cheat”; critics say recent changes narrowed access.', source: S.oh },
    ],
  },
  al_schmidt: {
    roster: { name: 'Al Schmidt', office: 'Secretary of State', state: 'Pennsylvania', party: 'R', score: 53, icon: '🗳', issues: ['2020 Defense', 'Election Integrity', 'Voting Access', 'Bipartisanship'] },
    label: 'Al Schmidt — 🗳 Pennsylvania Secretary of the Commonwealth (R)',
    cards: [
      { topic: '2020 Defense', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'As a Philadelphia city commissioner, Schmidt — a Republican — publicly rejected 2020 fraud claims and defended the count, drawing threats.',
        evidence: 'Pennsylvania Secretary of the Commonwealth since 2023, appointed by Democratic Governor Josh Shapiro.', source: S.pa },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Runs Pennsylvania elections in a top battleground, emphasizing accuracy and public confidence.', source: S.pa },
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Oversaw the rollout of automatic voter registration in Pennsylvania.', source: S.pa },
      { topic: 'Bipartisanship', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A Republican serving a Democratic governor, frequently cited as a model of nonpartisan election administration.', source: S.pa },
    ],
  },
  wes_allen: {
    roster: { name: 'Wes Allen', office: 'Secretary of State', state: 'Alabama', party: 'R', score: 53, icon: '🗳', issues: ['Voter Rolls', 'Election Integrity', 'Voter ID', 'Access Debate'] },
    label: 'Wes Allen — 🗳 Alabama Secretary of State (R)',
    cards: [
      { topic: 'Voter Rolls', icon: '📋', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Withdrew Alabama from ERIC, the multistate voter-roll cross-check system, and stood up a state list-maintenance program.',
        evidence: 'Alabama Secretary of State since 2023; a former state representative and probate judge.', source: S.al },
      { topic: 'Election Integrity', icon: '🔒', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Emphasizes citizenship verification and voter-roll accuracy.', source: S.al },
      { topic: 'Voter ID', icon: '🪪', pos: 'support', issueKey: 'voter_id', issueStance: 'support',
        text: 'Backs Alabama’s photo-ID requirement to vote.', source: S.al },
      { topic: 'Access Debate', icon: '🗳', pos: 'mixed', issueKey: 'voting_access', issueStance: 'mixed',
        text: 'Critics say his roll purges and ERIC withdrawal risk removing eligible voters; he says they protect integrity.', source: S.al },
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

console.log(`PolitiDex — National Secretaries of State WAVE 1  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
let html = fs.readFileSync(INDEX, 'utf8');

for (const id of Object.keys(NEW)) {
  console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(20)} (${NEW[id].roster.name})`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Secretaries of State (MI · AZ · NV · MN · GA · OH · PA · AL) · SoS wave 1 (Jul 2026) ─\n' +
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
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Secretaries of State (SoS wave 1, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National SoS wave 1 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National SoS wave 1 — state Secretaries of State: MI · AZ · NV · MN · GA · OH · PA · AL (July 2026)\n" +
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
