#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: HIGH-IMPACT STATE ATTORNEYS GENERAL, WAVE 26
// (July 2026) — after waves 1-25.
// ---------------------------------------------------------------------------
// All 50 sitting GOVERNORS are now covered (waves 20-25). This wave opens the
// next state-level tier — the "key state-level battles" front — with the ten
// most consequential state ATTORNEYS GENERAL, the officials driving the national
// legal wars our Issue Spotlights track (abortion, immigration, energy, guns,
// election law, big-tech). Balanced 5D / 5R. (Ken Paxton is intentionally
// excluded — he is already in the dataset as a 2026 U.S. Senate candidate.)
//
//   DEMOCRATS
//   • ROB BONTA (rob_bonta) — California: leads the multistate legal resistance —
//     immigration, abortion access, climate, big-tech.
//   • LETITIA JAMES (letitia_james) — New York: the Trump civil-fraud judgment,
//     the gun industry, abortion, consumer protection.
//   • KEITH ELLISON (keith_ellison) — Minnesota: the George Floyd prosecution,
//     drug-pricing suits, abortion, immigration.
//   • KWAME RAOUL (kwame_raoul) — Illinois: leads the reproductive-rights AG
//     coalition, the assault-weapons ban, environment, immigration.
//   • KRIS MAYES (kris_mayes) — Arizona: the 1864 abortion ban, the fake-electors
//     case, water security.
//
//   REPUBLICANS
//   • RAÚL LABRADOR (raul_labrador) — Idaho: the EMTALA abortion case, immigration
//     coalitions, federal land rules, youth gender-care ban.
//   • LIZ MURRILL (liz_murrill) — Louisiana: abortion, the Ten Commandments law,
//     oil & gas, immigration.
//   • CHRIS CARR (chris_carr) — Georgia: election law, gang prosecution, the
//     six-week abortion law, immigration.
//   • BRENNA BIRD (brenna_bird) — Iowa: state immigration enforcement, the
//     heartbeat law, biofuels/federal rules, crime.
//   • DAVE YOST (dave_yost) — Ohio: opioid settlements, a court-limited abortion
//     stance, challenging federal rules, regulating Big Tech.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own litigation, enforcement act, or words — never their party.
// Records constrained by voters or courts are attributed and marked mixed
// (Yost, where Ohio voters enshrined abortion rights in 2023; Mayes on a border
// state). Sources are official state attorney-general offices.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-ags-wave26-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-ags-wave26-jul2026.mjs --apply    # write
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
  bonta: { label: 'oag.ca.gov', url: 'https://oag.ca.gov/news/press-releases' },
  james: { label: 'ag.ny.gov', url: 'https://ag.ny.gov/press-releases' },
  ellison: { label: 'ag.state.mn.us', url: 'https://www.ag.state.mn.us/Office/Communications/' },
  raoul: { label: 'illinoisattorneygeneral.gov', url: 'https://illinoisattorneygeneral.gov/news/' },
  mayes: { label: 'azag.gov', url: 'https://www.azag.gov/press-releases' },
  labrador: { label: 'ag.idaho.gov', url: 'https://www.ag.idaho.gov/media-center/press-releases/' },
  murrill: { label: 'ag.state.la.us', url: 'https://www.ag.state.la.us/Article' },
  carr: { label: 'law.georgia.gov', url: 'https://law.georgia.gov/press-releases' },
  bird: { label: 'iowaattorneygeneral.gov', url: 'https://www.iowaattorneygeneral.gov/newsroom' },
  yost: { label: 'ohioattorneygeneral.gov', url: 'https://www.ohioattorneygeneral.gov/Media/News-Releases' },
};

const NEW = {
  rob_bonta: {
    roster: { name: 'Rob Bonta', office: 'Attorney General', state: 'California', party: 'D', score: 55, icon: '⚖️', issues: ['Challenging Federal Actions', 'Abortion Rights', 'Climate', 'Big Tech'] },
    label: 'Rob Bonta — ⚖️ Attorney General of California (D)',
    cards: [
      { topic: 'Challenging Federal Actions', icon: '🏛', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Has filed or joined dozens of multistate lawsuits against federal immigration actions, defending sanctuary policies and birthright citizenship and coordinating the Democratic attorneys general’s legal response.',
        evidence: 'Attorney General of California since 2021; leads one of the most active multistate litigation dockets in the country.', source: S.bonta },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends and expands abortion access, joining suits to preserve nationwide availability of the medication mifepristone.', source: S.bonta },
      { topic: 'Climate & Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Sued major oil companies alleging they deceived the public on climate change and defends California’s vehicle-emissions authority.', source: S.bonta },
      { topic: 'Big Tech Accountability', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Pursues antitrust and consumer-privacy cases against large technology platforms and enforces California’s consumer-privacy law.', source: S.bonta },
    ],
  },
  letitia_james: {
    roster: { name: 'Letitia James', office: 'Attorney General', state: 'New York', party: 'D', score: 55, icon: '⚖️', issues: ['Corporate Accountability', 'Abortion Rights', 'Gun Industry', 'Consumer Protection'] },
    label: 'Letitia James — ⚖️ Attorney General of New York (D)',
    cards: [
      { topic: 'Corporate Accountability', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Won a civil-fraud judgment against the Trump Organization over inflated asset values and pursues major financial and consumer-protection cases.',
        evidence: 'Attorney General of New York since 2019.', source: S.james },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends abortion access and clinic-protection laws in New York and joined multistate efforts to preserve medication abortion.', source: S.james },
      { topic: 'Gun Industry', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Sued gun manufacturers and moved to dissolve the National Rifle Association over alleged financial misconduct.', source: S.james },
      { topic: 'Immigration', icon: '🏛', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Joined multistate suits challenging federal immigration enforcement actions and funding conditions.', source: S.james },
    ],
  },
  keith_ellison: {
    roster: { name: 'Keith Ellison', office: 'Attorney General', state: 'Minnesota', party: 'D', score: 54, icon: '⚖️', issues: ['Police Accountability', 'Drug Prices', 'Abortion Rights', 'Consumer Protection'] },
    label: 'Keith Ellison — ⚖️ Attorney General of Minnesota (D)',
    cards: [
      { topic: 'Police Accountability', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Led the prosecution that convicted the officers in George Floyd’s death and pursues consumer, worker, and corporate-accountability cases.',
        evidence: 'Attorney General of Minnesota since 2019; former U.S. Representative (MN-05).', source: S.ellison },
      { topic: 'Drug Prices', icon: '💉', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Sued insulin manufacturers and pharmacy middlemen over drug pricing on behalf of Minnesota consumers.', source: S.ellison },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends Minnesota’s protections for abortion access, including for patients traveling from other states.', source: S.ellison },
      { topic: 'Immigration', icon: '🏛', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Joined multistate challenges to federal immigration enforcement actions.', source: S.ellison },
    ],
  },
  kwame_raoul: {
    roster: { name: 'Kwame Raoul', office: 'Attorney General', state: 'Illinois', party: 'D', score: 54, icon: '⚖️', issues: ['Reproductive Rights', 'Gun Safety', 'Environment', 'Immigration'] },
    label: 'Kwame Raoul — ⚖️ Attorney General of Illinois (D)',
    cards: [
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Leads a national coalition of attorneys general defending reproductive rights and access to medication abortion.',
        evidence: 'Attorney General of Illinois since 2019.', source: S.raoul },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Illinois’s assault-weapons ban in court and pursues gun-industry accountability.', source: S.raoul },
      { topic: 'Environment', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Sues polluters and defends environmental protections, joining multistate climate and clean-air litigation.', source: S.raoul },
      { topic: 'Immigration', icon: '🏛', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Joined suits challenging federal immigration enforcement and defending state protections.', source: S.raoul },
    ],
  },
  kris_mayes: {
    roster: { name: 'Kris Mayes', office: 'Attorney General', state: 'Arizona', party: 'D', score: 53, icon: '⚖️', issues: ['Abortion Rights', 'Election Integrity', 'Water Security', 'Immigration'] },
    label: 'Kris Mayes — ⚖️ Attorney General of Arizona (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Declined to enforce Arizona’s 1864 near-total abortion ban and supported its repeal, defending current access.',
        evidence: 'Attorney General of Arizona since 2023, elected by a margin of about 280 votes.', source: S.mayes },
      { topic: 'Election Cases', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Brought the criminal “fake electors” case over the 2020 election and defends election administration against threats.', source: S.mayes },
      { topic: 'Water Security', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Made groundwater protection and holding large water users accountable a priority in a drought-stressed state.', source: S.mayes },
      { topic: 'Immigration', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'From a border state, has challenged the harshest enforcement measures while acknowledging border-security pressures — a more cross-pressured stance than coastal Democrats.', source: S.mayes },
    ],
  },
  raul_labrador: {
    roster: { name: 'Raúl Labrador', office: 'Attorney General', state: 'Idaho', party: 'R', score: 54, icon: '⚖️', issues: ['Abortion', 'Immigration', 'Federal Land Rules', 'Youth Gender Care'] },
    label: 'Raúl Labrador — ⚖️ Attorney General of Idaho (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Idaho’s near-total abortion ban, including before the U.S. Supreme Court in the EMTALA emergency-care case (Moyle v. United States).',
        evidence: 'Attorney General of Idaho since 2023; former U.S. Representative (ID-01).', source: S.labrador },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Joined multistate coalitions backing stricter federal immigration enforcement.', source: S.labrador },
      { topic: 'Federal Land Rules', icon: '🤠', pos: 'support', issueKey: 'lands_local', issueStance: 'support',
        text: 'Challenges federal land-management and environmental rules he argues harm Idaho’s access to its own lands.', source: S.labrador },
      { topic: 'Youth Gender Care', icon: '🏳️‍🌈', pos: 'oppose', issueKey: 'lgbtq_rights', issueStance: 'oppose',
        text: 'Defended Idaho’s ban on gender-affirming care for minors, which the Supreme Court allowed to take effect in Labrador v. Poe.', source: S.labrador },
    ],
  },
  liz_murrill: {
    roster: { name: 'Liz Murrill', office: 'Attorney General', state: 'Louisiana', party: 'R', score: 54, icon: '⚖️', issues: ['Abortion', 'Religion in Schools', 'Oil & Gas', 'Immigration'] },
    label: 'Liz Murrill — ⚖️ Attorney General of Louisiana (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Louisiana’s abortion ban and its first-in-the-nation law classifying the abortion pills mifepristone and misoprostol as controlled substances.',
        evidence: 'Attorney General of Louisiana since 2024.', source: S.murrill },
      { topic: 'Religion in Schools', icon: '🏛', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'Defends Louisiana’s law requiring the Ten Commandments to be displayed in public-school classrooms against constitutional challenge.', source: S.murrill },
      { topic: 'Oil & Gas', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs Louisiana’s oil-and-gas industry and challenges federal limits on LNG exports and offshore drilling.', source: S.murrill },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Joined multistate coalitions supporting stricter immigration enforcement.', source: S.murrill },
    ],
  },
  chris_carr: {
    roster: { name: 'Chris Carr', office: 'Attorney General', state: 'Georgia', party: 'R', score: 54, icon: '⚖️', issues: ['Election Law', 'Gang Prosecution', 'Abortion', 'Immigration'] },
    label: 'Chris Carr — ⚖️ Attorney General of Georgia (R)',
    cards: [
      { topic: 'Election Law', icon: '🗳', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Defends Georgia’s election-integrity law (SB 202) in court, while having publicly affirmed the state’s certified 2020 results — a stance that drew primary criticism.',
        evidence: 'Attorney General of Georgia since 2016.', source: S.carr },
      { topic: 'Gang & Trafficking Prosecution', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Created a statewide gang-prosecution unit and prioritizes anti-gang and human-trafficking enforcement.', source: S.carr },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Georgia’s six-week abortion law (the LIFE Act) in ongoing litigation.', source: S.carr },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Joined multistate coalitions backing stricter immigration enforcement.', source: S.carr },
    ],
  },
  brenna_bird: {
    roster: { name: 'Brenna Bird', office: 'Attorney General', state: 'Iowa', party: 'R', score: 54, icon: '⚖️', issues: ['Immigration', 'Abortion', 'Biofuels & Federal Rules', 'Crime'] },
    label: 'Brenna Bird — ⚖️ Attorney General of Iowa (R)',
    cards: [
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'An early, vocal backer of state immigration enforcement, Bird defended Iowa’s law empowering local police to arrest people who re-entered the country illegally.',
        evidence: 'Attorney General of Iowa since 2023.', source: S.bird },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Iowa’s six-week “fetal heartbeat” abortion law, which took effect after litigation.', source: S.bird },
      { topic: 'Biofuels & Federal Rules', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Challenges federal energy and emissions rules she argues threaten Iowa agriculture and biofuels.', source: S.bird },
      { topic: 'Crime & Fentanyl', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes fentanyl trafficking and violent-crime enforcement, expanding victim-support programs.', source: S.bird },
    ],
  },
  dave_yost: {
    roster: { name: 'Dave Yost', office: 'Attorney General', state: 'Ohio', party: 'R', score: 54, icon: '⚖️', issues: ['Opioid Settlements', 'Abortion', 'Federal Overreach', 'Big Tech'] },
    label: 'Dave Yost — ⚖️ Attorney General of Ohio (R)',
    cards: [
      { topic: 'Opioid Settlements', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Secured billions of dollars in opioid settlements for Ohio and pursues consumer-protection cases.',
        evidence: 'Attorney General of Ohio since 2019.', source: S.yost },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Has defended Ohio abortion restrictions, but Ohio voters enshrined abortion rights in the state constitution in 2023, sharply limiting what he can enforce.', source: S.yost },
      { topic: 'Federal Overreach', icon: '🏛', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Challenges federal regulations and joined multistate suits over student-loan forgiveness and environmental rules.', source: S.yost },
      { topic: 'Big Tech', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Sued Google seeking to have it declared a public utility subject to common-carrier regulation.', source: S.yost },
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

console.log(`PolitiDex — National high-impact attorneys general WAVE 26  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — high-impact state attorneys general (the litigation front) · state wave 26 (Jul 2026) ─\n' +
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
  const block = '\n    // National — high-impact state attorneys general (litigation front), wave 26 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 26 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 26 — high-impact state attorneys general, the litigation front (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave26-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
