#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: BATTLEGROUND-STATE ATTORNEYS GENERAL, WAVE 29
// (July 2026) — after waves 1-28.
// ---------------------------------------------------------------------------
// Wave 26 opened the state attorney-general front with ten high-impact offices.
// This wave DEEPENS that front into the battleground and other major states whose
// AGs are central to the national legal wars our Issue Spotlights track
// (immigration, abortion, guns, energy, Big Tech, fentanyl). Balanced 4D / 4R.
// (Texas is intentionally excluded — Ken Paxton is already in the dataset as a
// 2026 U.S. Senate candidate.)
//
//   DEMOCRATS
//   • DANA NESSEL (dana_nessel) — Michigan: the Enbridge Line 5 shutdown fight,
//     abortion access after Proposal 3, LGBTQ civil rights, consumer protection.
//   • JOSH KAUL (josh_kaul) — Wisconsin: the challenge to the 1849 abortion ban,
//     defending election administration, opioid settlements, gun safety.
//   • JEFF JACKSON (jeff_jackson) — North Carolina: an anti-scam / anti-fentanyl
//     consumer-protection focus, abortion access, defending state interests.
//   • AARON FORD (aaron_ford) — Nevada: abortion access, consumer and Big-Tech
//     enforcement, immigration coalitions, fentanyl.
//
//   REPUBLICANS
//   • DAVE SUNDAY (dave_sunday) — Pennsylvania: a former DA who centers fentanyl
//     and violent crime, consumer/elder protection, and a less partisan posture.
//   • JAMES UTHMEIER (james_uthmeier) — Florida: aggressive state immigration
//     enforcement, defending the six-week abortion law, Big-Tech/child-safety
//     actions, public safety.
//   • JONATHAN SKRMETTI (jonathan_skrmetti) — Tennessee: the youth gender-care ban
//     upheld in United States v. Skrmetti, Big-Tech/consumer suits, abortion,
//     federal overreach.
//   • KRIS KOBACH (kris_kobach) — Kansas: a national leader on immigration
//     enforcement, abortion (court-limited by voters), multistate challenges to
//     federal rules, election integrity.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own litigation, enforcement act, or words — never their party.
// Records constrained by voters or courts are attributed and marked mixed
// (Kobach and Jackson, where the states' abortion politics cut against a simple
// verdict). Sources are official state attorney-general offices.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-ags-wave29-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-ags-wave29-jul2026.mjs --apply    # write
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
  nessel: { label: 'michigan.gov/ag', url: 'https://www.michigan.gov/ag/news' },
  kaul: { label: 'doj.state.wi.us', url: 'https://www.doj.state.wi.us/news-releases' },
  jackson: { label: 'ncdoj.gov', url: 'https://ncdoj.gov/news/' },
  ford: { label: 'ag.nv.gov', url: 'https://ag.nv.gov/News/Press_Releases/' },
  sunday: { label: 'attorneygeneral.gov', url: 'https://www.attorneygeneral.gov/taking-action/' },
  uthmeier: { label: 'myfloridalegal.com', url: 'https://www.myfloridalegal.com/newsreleases' },
  skrmetti: { label: 'tn.gov/attorneygeneral', url: 'https://www.tn.gov/attorneygeneral/news.html' },
  kobach: { label: 'ag.ks.gov', url: 'https://www.ag.ks.gov/media-center/news-releases' },
};

const NEW = {
  dana_nessel: {
    roster: { name: 'Dana Nessel', office: 'Attorney General', state: 'Michigan', party: 'D', score: 54, icon: '⚖️', issues: ['Line 5 & Environment', 'Abortion Rights', 'LGBTQ Rights', 'Consumer Protection'] },
    label: 'Dana Nessel — ⚖️ Attorney General of Michigan (D)',
    cards: [
      { topic: 'Line 5 & Environment', icon: '🛢', pos: 'oppose', issueKey: 'enviro_energy', issueStance: 'oppose',
        text: 'Sued to shut down Enbridge’s Line 5 oil-and-gas pipeline where it crosses the Straits of Mackinac, calling it a spill risk to the Great Lakes — a years-long legal fight over the aging line.',
        evidence: 'Attorney General of Michigan since 2019; the first openly gay person elected to statewide office in Michigan.', source: S.nessel },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Declined to enforce Michigan’s dormant 1931 abortion ban and, after voters passed Proposal 3 in 2022 enshrining reproductive rights, has moved to defend and implement that access.', source: S.nessel },
      { topic: 'LGBTQ Rights', icon: '🏳️‍🌈', pos: 'support', issueKey: 'lgbtq_rights', issueStance: 'support',
        text: 'Defends Michigan’s expanded civil-rights protections covering sexual orientation and gender identity.', source: S.nessel },
      { topic: 'Consumer Protection', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Runs an active consumer-protection and corporate-oversight docket, from robocall and price-gouging actions to a dedicated unit for public-corruption and elder-fraud cases.', source: S.nessel },
    ],
  },
  josh_kaul: {
    roster: { name: 'Josh Kaul', office: 'Attorney General', state: 'Wisconsin', party: 'D', score: 54, icon: '⚖️', issues: ['Abortion', 'Election Administration', 'Opioid Settlements', 'Gun Safety'] },
    label: 'Josh Kaul — ⚖️ Attorney General of Wisconsin (D)',
    cards: [
      { topic: 'Abortion', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Sued to challenge Wisconsin’s 1849 criminal abortion statute; after litigation and a state Supreme Court ruling, abortion services resumed in the state.',
        evidence: 'Attorney General of Wisconsin since 2019.', source: S.kaul },
      { topic: 'Election Administration', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Defends Wisconsin’s election administration and certified results in court, declining to pursue unsubstantiated fraud claims in a closely divided swing state.', source: S.kaul },
      { topic: 'Opioid Settlements', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Secured hundreds of millions of dollars in opioid settlements for Wisconsin and pursues consumer-protection cases.', source: S.kaul },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs stronger gun-safety measures such as universal background checks and a red-flag law.', source: S.kaul },
    ],
  },
  jeff_jackson: {
    roster: { name: 'Jeff Jackson', office: 'Attorney General', state: 'North Carolina', party: 'D', score: 53, icon: '⚖️', issues: ['Fentanyl & Scams', 'Consumer Protection', 'Abortion', 'Defending State Interests'] },
    label: 'Jeff Jackson — ⚖️ Attorney General of North Carolina (D)',
    cards: [
      { topic: 'Fentanyl & Scams', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made fighting fentanyl trafficking, scams, and robocalls the centerpiece of his tenure, casting the office as a consumer-facing public-safety role.',
        evidence: 'Attorney General of North Carolina since 2025; former U.S. Representative (NC-14) and state senator.', source: S.jackson },
      { topic: 'Consumer Protection', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Prioritizes consumer protection, price gouging, and utility-rate scrutiny on behalf of North Carolina residents.', source: S.jackson },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'Supports abortion access but operates under North Carolina’s 12-week law enacted by the legislature over the governor’s veto, limiting what the office can change.', source: S.jackson },
      { topic: 'Defending State Interests', icon: '🏛', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Has said he will defend North Carolina’s interests in federal disputes on the merits rather than as reflexive partisan litigation.', source: S.jackson },
    ],
  },
  aaron_ford: {
    roster: { name: 'Aaron Ford', office: 'Attorney General', state: 'Nevada', party: 'D', score: 53, icon: '⚖️', issues: ['Abortion Rights', 'Consumer & Big Tech', 'Immigration', 'Fentanyl'] },
    label: 'Aaron Ford — ⚖️ Attorney General of Nevada (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends abortion access in Nevada, where the procedure’s legality through 24 weeks was affirmed by voters decades ago and reinforced at the ballot in 2024.',
        evidence: 'Attorney General of Nevada since 2019; former state Senate Majority Leader.', source: S.ford },
      { topic: 'Consumer & Big Tech', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Pursues consumer-protection and privacy cases, joining multistate actions against large technology and social-media platforms.', source: S.ford },
      { topic: 'Immigration', icon: '🏛', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Joined multistate coalitions challenging federal immigration enforcement actions and defending state protections.', source: S.ford },
      { topic: 'Fentanyl & Crime', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes fentanyl trafficking and violent-crime enforcement alongside consumer work.', source: S.ford },
    ],
  },
  dave_sunday: {
    roster: { name: 'Dave Sunday', office: 'Attorney General', state: 'Pennsylvania', party: 'R', score: 54, icon: '⚖️', issues: ['Fentanyl & Public Safety', 'Consumer Protection', 'Working Across the Aisle', 'Immigration'] },
    label: 'Dave Sunday — ⚖️ Attorney General of Pennsylvania (R)',
    cards: [
      { topic: 'Fentanyl & Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A former York County district attorney who built his campaign and tenure around combating the opioid and fentanyl crisis and violent crime.',
        evidence: 'Attorney General of Pennsylvania since 2025; former York County District Attorney.', source: S.sunday },
      { topic: 'Consumer Protection', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Continues the office’s consumer-protection, elder-fraud, and scam-prevention work in a large swing state.', source: S.sunday },
      { topic: 'Working Across the Aisle', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Won statewide as a Republican in a state with a Democratic governor and has framed the office as a prosecutorial, less overtly partisan role than some peers.', source: S.sunday },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports cooperation with federal authorities on immigration enforcement and drug-trafficking interdiction.', source: S.sunday },
    ],
  },
  james_uthmeier: {
    roster: { name: 'James Uthmeier', office: 'Attorney General', state: 'Florida', party: 'R', score: 54, icon: '⚖️', issues: ['Immigration Enforcement', 'Abortion', 'Big Tech & Kids', 'Public Safety'] },
    label: 'James Uthmeier — ⚖️ Attorney General of Florida (R)',
    cards: [
      { topic: 'Immigration Enforcement', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'A close ally of Governor DeSantis, Uthmeier has aggressively backed state immigration enforcement and Florida’s cooperation with the federal deportation push, including the Everglades detention facility.',
        evidence: 'Attorney General of Florida since 2025 (appointed after Ashley Moody joined the U.S. Senate); former DeSantis chief of staff.', source: S.uthmeier },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Florida’s six-week abortion law in litigation.', source: S.uthmeier },
      { topic: 'Big Tech & Kids', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Defends and enforces Florida’s law restricting social-media accounts for minors and pursues consumer-protection actions against large platforms.', source: S.uthmeier },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes fentanyl trafficking and violent-crime enforcement across the state.', source: S.uthmeier },
    ],
  },
  jonathan_skrmetti: {
    roster: { name: 'Jonathan Skrmetti', office: 'Attorney General', state: 'Tennessee', party: 'R', score: 54, icon: '⚖️', issues: ['Youth Gender Care', 'Big Tech & Consumer', 'Abortion', 'Federal Overreach'] },
    label: 'Jonathan Skrmetti — ⚖️ Attorney General of Tennessee (R)',
    cards: [
      { topic: 'Youth Gender Care', icon: '🏳️‍🌈', pos: 'oppose', issueKey: 'lgbtq_rights', issueStance: 'oppose',
        text: 'Defended Tennessee’s ban on gender-affirming care for minors before the U.S. Supreme Court, which upheld the law in United States v. Skrmetti (2025).',
        evidence: 'Attorney General of Tennessee since 2022; the case bears his name as the state’s chief legal officer.', source: S.skrmetti },
      { topic: 'Big Tech & Consumer', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Brought antitrust and consumer-protection actions against large technology platforms and sued social-media companies over alleged harms to minors.', source: S.skrmetti },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Tennessee’s near-total abortion ban, enacted after Dobbs.', source: S.skrmetti },
      { topic: 'Federal Overreach', icon: '🏛', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Challenges federal regulations he argues exceed statutory authority, joining multistate suits over environmental and financial rules.', source: S.skrmetti },
    ],
  },
  kris_kobach: {
    roster: { name: 'Kris Kobach', office: 'Attorney General', state: 'Kansas', party: 'R', score: 54, icon: '⚖️', issues: ['Immigration Enforcement', 'Abortion', 'Federal Overreach', 'Election Integrity'] },
    label: 'Kris Kobach — ⚖️ Attorney General of Kansas (R)',
    cards: [
      { topic: 'Immigration Enforcement', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'A national figure on immigration enforcement long before taking office, Kobach has led and joined multistate coalitions challenging federal immigration policy.',
        evidence: 'Attorney General of Kansas since 2023; former Kansas Secretary of State.', source: S.kobach },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Defends Kansas abortion restrictions, but Kansas voters rejected a 2022 constitutional amendment that would have allowed the legislature to ban abortion, constraining how far restrictions can go.', source: S.kobach },
      { topic: 'Federal Overreach', icon: '🏛', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Leads and joins multistate lawsuits against federal environmental, energy, and student-loan rules he argues exceed federal authority.', source: S.kobach },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'A long-time advocate of stricter voter-eligibility and election-administration rules, a defining theme of his public career.', source: S.kobach },
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

console.log(`PolitiDex — National battleground attorneys general WAVE 29  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — battleground-state attorneys general (litigation front, tier 2) · state wave 29 (Jul 2026) ─\n' +
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
  const block = '\n    // National — battleground-state attorneys general (litigation front, tier 2), wave 29 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 29 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 29 — battleground-state attorneys general, litigation front tier 2 (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave29-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
