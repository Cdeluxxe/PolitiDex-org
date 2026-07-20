#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: INFLUENTIAL STATE LEGISLATORS (opposition
// leaders & marquee members), WAVE 32 (July 2026) — after waves 1-31.
// ---------------------------------------------------------------------------
// Waves 27 and 30 covered the PRESIDING officers (speakers / senate presidents)
// of the major and battleground states. This wave adds the OTHER side of those
// chambers — the opposition floor leaders — plus two marquee individual members
// whose own bills drive national debates. Balanced 4D / 4R. This deliberately
// pairs figures against the leaders already in the dataset so a state's Say-vs-Do
// contrast is visible (e.g., Texas's Burrows/Patrick vs. Wu; Michigan's Hall vs.
// Puri; Wisconsin's Vos vs. Neubauer).
//
//   DEMOCRATS
//   • GENE WU (gene_wu) — Texas House Democratic Caucus Chair: led the 2025 quorum
//     break against mid-decade congressional redistricting (a fight over FEDERAL
//     U.S. House seats); Abbott and Paxton sought his removal and the Texas Supreme
//     Court declined. Public education, gun safety, immigrant communities.
//   • JAY COSTA (jay_costa) — Pennsylvania Senate Democratic Leader: budgets in a
//     divided legislature, public-school funding, gun safety, minimum wage.
//   • RANJEEV PURI (ranjeev_puri) — Michigan House Democratic Leader: gun reform,
//     labor, reproductive rights, opposition to the new Republican House majority.
//   • GRETA NEUBAUER (greta_neubauer) — Wisconsin Assembly Minority Leader: the
//     2024 "fair maps," reproductive rights, climate, public schools.
//
//   REPUBLICANS
//   • HEATH FLORA (heath_flora) — California Assembly Republican Leader (since July
//     2025): cost of living, public safety (Prop 36), water storage, small business.
//   • DESTIN HALL (destin_hall) — North Carolina House Speaker: Hurricane Helene
//     recovery, tax cuts, redistricting, school choice.
//   • JON BURNS (jon_burns) — Georgia House Speaker: tort reform, tax cuts, school
//     safety after the Apalachee shooting, school-choice vouchers.
//   • BRYAN HUGHES (bryan_hughes) — Texas State Senator: author of the 2021 Heartbeat
//     Act (SB 8) and the SB 1 election law — a marquee individual member whose bills
//     reshaped national fights (SB 8 fed directly into the post-Dobbs landscape).
//
// FEDERAL DOTS (per the round's guidance): where a state figure's record connects
// to the federal arena it is noted in-card — Wu's quorum break was over U.S. House
// maps, and Hughes's SB 8 reshaped the national abortion landscape. No federal
// roll-call votes are attributed to these state figures, because none exist (they
// have not served in Congress).
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured or
// court-contested records are marked mixed and attributed. Sources are official
// state-legislature pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-legislators-wave32-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-legislators-wave32-jul2026.mjs --apply    # write
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
  txh: { label: 'house.texas.gov', url: 'https://house.texas.gov/' },
  txs: { label: 'senate.texas.gov', url: 'https://senate.texas.gov/' },
  pa: { label: 'legis.state.pa.us', url: 'https://www.legis.state.pa.us/' },
  mi: { label: 'legislature.mi.gov', url: 'https://www.legislature.mi.gov/' },
  wi: { label: 'legis.wisconsin.gov', url: 'https://legis.wisconsin.gov/' },
  ca: { label: 'assembly.ca.gov', url: 'https://www.assembly.ca.gov/' },
  nc: { label: 'ncleg.gov', url: 'https://www.ncleg.gov/' },
  ga: { label: 'legis.ga.gov', url: 'https://www.legis.ga.gov/' },
};

const NEW = {
  gene_wu: {
    roster: { name: 'Gene Wu', office: 'State House Democratic Caucus Chair', state: 'Texas', party: 'D', score: 53, icon: '🏛', issues: ['Redistricting', 'Public Schools', 'Gun Safety', 'Immigration'] },
    label: 'Gene Wu — 🏛 Texas State House Democratic Caucus Chair (D)',
    cards: [
      { topic: 'Redistricting', icon: '🗺', pos: 'oppose', issueKey: 'democracy_balance', issueStance: 'oppose',
        text: 'Led the 2025 quorum break that denied the Texas House a quorum during the special session on mid-decade congressional redistricting, delaying a new map drawn to add Republican-leaning U.S. House seats; Governor Abbott and Attorney General Paxton sought his removal and the Texas Supreme Court declined.',
        evidence: 'Chair of the Texas House Democratic Caucus since 2025; the Texas Supreme Court refused to remove him over the quorum break.', source: S.txh },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Opposes diverting public funds to private-school vouchers and backs increased funding for Texas public schools and teacher pay.', source: S.txh },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs gun-safety measures such as raising the purchase age for certain rifles, pressing the issue after the Uvalde school shooting.', source: S.txh },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'A former prosecutor and the son of immigrants, defends immigrant communities in Houston and opposes state measures he views as overreaching enforcement.', source: S.txh },
    ],
  },
  jay_costa: {
    roster: { name: 'Jay Costa', office: 'State Senate Democratic Leader', state: 'Pennsylvania', party: 'D', score: 53, icon: '🏛', issues: ['State Budget', 'Public Schools', 'Gun Safety', 'Minimum Wage'] },
    label: 'Jay Costa — 🏛 Pennsylvania State Senate Democratic Leader (D)',
    cards: [
      { topic: 'State Budget', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'As Democratic leader in a Republican-majority Senate, negotiates Pennsylvania’s budgets with the GOP majority and the Democratic governor, championing what he calls affordability-focused spending.',
        evidence: 'Pennsylvania Senate Democratic Leader since 2011; in the chamber since 1996.', source: S.pa },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs increased public-school funding in response to the court ruling that found Pennsylvania’s school-funding system unconstitutional.', source: S.pa },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'A long-time backer of expanded background checks and state violence-intervention and prevention funding.', source: S.pa },
      { topic: 'Minimum Wage', icon: '💵', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Pushes to raise Pennsylvania’s minimum wage, which sits at the federal floor while neighboring states are higher.', source: S.pa },
    ],
  },
  ranjeev_puri: {
    roster: { name: 'Ranjeev Puri', office: 'State House Democratic Leader', state: 'Michigan', party: 'D', score: 53, icon: '🏛', issues: ['Gun Safety', 'Labor', 'Reproductive Rights', 'Budget Oversight'] },
    label: 'Ranjeev Puri — 🏛 Michigan State House Democratic Leader (D)',
    cards: [
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'A vocal advocate for gun-reform laws, invoking the Michigan State University shooting and the 2012 Oak Creek Sikh temple shooting in pressing for stronger measures.',
        evidence: 'Michigan House Democratic (Minority) Leader since January 2025; the highest-ranking Sikh-American state legislative leader in the country.', source: S.mi },
      { topic: 'Labor', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backed the repeal of Michigan’s right-to-work law and the restoration of prevailing-wage requirements.', source: S.mi },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports Michigan’s post-2022 reproductive-rights protections.', source: S.mi },
      { topic: 'Budget & Oversight', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'As minority leader opposite Republican Speaker Matt Hall, has argued that divided government requires compromise and criticized what he calls the majority’s hardball budget tactics.', source: S.mi },
    ],
  },
  greta_neubauer: {
    roster: { name: 'Greta Neubauer', office: 'State Assembly Minority Leader', state: 'Wisconsin', party: 'D', score: 53, icon: '🏛', issues: ['Fair Maps', 'Reproductive Rights', 'Climate', 'Public Schools'] },
    label: 'Greta Neubauer — 🏛 Wisconsin State Assembly Minority Leader (D)',
    cards: [
      { topic: 'Fair Maps', icon: '🗺', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Leads Assembly Democrats after the 2024 court-ordered redistricting replaced maps a new state Supreme Court majority found to be an unconstitutional gerrymander, narrowing the Republican advantage.',
        evidence: 'Wisconsin Assembly Minority Leader since 2021; reelected leader for the 2025 session.', source: S.wi },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backed restoring abortion access after the litigation over Wisconsin’s 1849 statute.', source: S.wi },
      { topic: 'Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'A climate advocate before entering office, she pushes clean-energy and conservation measures.', source: S.wi },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Opposes expanding Wisconsin’s private-school voucher program and backs increased public-school funding.', source: S.wi },
    ],
  },
  heath_flora: {
    roster: { name: 'Heath Flora', office: 'State Assembly Republican Leader', state: 'California', party: 'R', score: 53, icon: '🏛', issues: ['Cost of Living', 'Public Safety', 'Water Storage', 'Small Business'] },
    label: 'Heath Flora — 🏛 California State Assembly Republican Leader (R)',
    cards: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers affordability — gas prices, energy costs, and housing — arguing Democratic supermajority policies drive up the cost of living for working Californians.',
        evidence: 'Elected California Assembly Republican Leader in July 2025; a Central Valley farmer and former firefighter.', source: S.ca },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backed Proposition 36, the 2024 measure toughening penalties for repeat theft and certain drug crimes, which voters approved.', source: S.ca },
      { topic: 'Water Storage', icon: '💧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'A Central Valley leader who prioritizes building water storage and conveyance and opposes cutbacks to agricultural water deliveries.', source: S.ca },
      { topic: 'Small Business & Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Advocates tax and regulatory relief for small businesses and farms.', source: S.ca },
    ],
  },
  destin_hall: {
    roster: { name: 'Destin Hall', office: 'State House Speaker', state: 'North Carolina', party: 'R', score: 53, icon: '🏛', issues: ['Helene Recovery', 'Tax Cuts', 'Redistricting', 'School Choice'] },
    label: 'Destin Hall — 🏛 North Carolina State House Speaker (R)',
    cards: [
      { topic: 'Hurricane Helene Recovery', icon: '🌀', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Made rebuilding western North Carolina after Hurricane Helene the House’s first priority, standing up a select committee on recovery.',
        evidence: 'Speaker of the North Carolina House since January 2025, succeeding Tim Moore (who was elected to Congress); at 37, one of the youngest speakers in state history.', source: S.nc },
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs continuing North Carolina’s scheduled income-tax reductions toward a lower flat rate.', source: S.nc },
      { topic: 'Redistricting', icon: '🗺', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'As former rules chairman and now Speaker, oversaw congressional and legislative maps drawn to favor Republicans, a repeated subject of litigation.', source: S.nc },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs expanding North Carolina’s Opportunity Scholarship private-school vouchers.', source: S.nc },
    ],
  },
  jon_burns: {
    roster: { name: 'Jon Burns', office: 'State House Speaker', state: 'Georgia', party: 'R', score: 53, icon: '🏛', issues: ['Tort Reform', 'Tax Cuts', 'School Safety', 'School Choice'] },
    label: 'Jon Burns — 🏛 Georgia State House Speaker (R)',
    cards: [
      { topic: 'Tort Reform', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Shepherded Governor Kemp’s 2025 lawsuit / tort-reform overhaul through the Georgia House, a priority aimed at curbing large civil damage awards.',
        evidence: 'Speaker of the Georgia House since 2023, succeeding the late David Ralston.', source: S.ga },
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed accelerating Georgia’s move to a lower flat income tax and one-time taxpayer rebates.', source: S.ga },
      { topic: 'School Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Led school-safety legislation after the 2024 shooting at Apalachee High School, including alert systems and record-sharing.', source: S.ga },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backed Georgia’s 2024 Promise Scholarship program creating private-school vouchers for students in low-performing schools.', source: S.ga },
    ],
  },
  bryan_hughes: {
    roster: { name: 'Bryan Hughes', office: 'State Senator', state: 'Texas', party: 'R', score: 53, icon: '🏛', issues: ['Abortion', 'Election Law', 'Big Tech & Speech', 'Parental Rights'] },
    label: 'Bryan Hughes — 🏛 Texas State Senator (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Author of the 2021 Texas Heartbeat Act (Senate Bill 8), the six-week abortion ban enforced through private civil lawsuits that became a national model and fed directly into the post-Dobbs legal landscape.',
        evidence: 'Texas state senator since 2017 (District 1); a prolific author of high-profile legislation.', source: S.txs },
      { topic: 'Election Law', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Author of Senate Bill 1 (2021), Texas’s sweeping election-law overhaul tightening mail voting, drop boxes, and voting hours.', source: S.txs },
      { topic: 'Big Tech & Speech', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'Author of House Bill 20, Texas’s social-media law barring large platforms from removing content based on viewpoint, litigated up to the U.S. Supreme Court in the NetChoice cases.', source: S.txs },
      { topic: 'Parental Rights', icon: '🎓', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'Backs parental-rights and curriculum-transparency measures in Texas schools.', source: S.txs },
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

console.log(`PolitiDex — National influential state legislators WAVE 32  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — influential state legislators: opposition leaders & marquee members · state wave 32 (Jul 2026) ─\n' +
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
  const block = '\n    // National — influential state legislators (opposition leaders & marquee members), wave 32 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 32 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 32 — influential state legislators: opposition leaders & marquee members (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave32-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
