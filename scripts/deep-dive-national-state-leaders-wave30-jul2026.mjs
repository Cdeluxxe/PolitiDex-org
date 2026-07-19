#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE LEGISLATIVE LEADERS (TIER 2), WAVE 30
// (July 2026) — after waves 1-29.
// ---------------------------------------------------------------------------
// Wave 27 began the state-legislative-leader front with the four biggest states
// (TX, CA, FL, NY). This wave extends it into the next tier of major and
// battleground states — the leaders who actually control what reaches the floor
// in Pennsylvania, Michigan, Illinois, Nevada, North Carolina, Wisconsin, and
// Arizona. Balanced 5D / 5R.
//
//   DEMOCRATS
//   • JOANNA McCLINTON (joanna_mcclinton) — Pennsylvania House Speaker: public-
//     school funding, abortion rights, gun safety, minimum wage.
//   • WINNIE BRINKS (winnie_brinks) — Michigan Senate Majority Leader: led the
//     repeal of the 1931 abortion ban, a post-MSU-shooting gun package, and the
//     repeal of right-to-work.
//   • DON HARMON (don_harmon) — Illinois Senate President: abortion rights, the
//     assault-weapons ban, state budgets, workers.
//   • CHRIS WELCH (chris_welch) — Illinois House Speaker: the first Black speaker
//     of the Illinois House — ethics reform, abortion rights, labor, schools.
//   • NICOLE CANNIZZARO (nicole_cannizzaro) — Nevada Senate Majority Leader:
//     abortion rights, workers, public education, gun safety.
//
//   REPUBLICANS
//   • KIM WARD (kim_ward) — Pennsylvania Senate President pro Tempore: the first
//     woman to lead the chamber — natural gas, fiscal restraint, election law,
//     school choice.
//   • MATT HALL (matt_hall) — Michigan House Speaker: took the gavel after the GOP
//     flipped the House in 2024 — road funding, tax relief, spending oversight.
//   • PHIL BERGER (phil_berger) — North Carolina Senate President pro Tempore: the
//     state's flat income tax, the 12-week abortion law, and school-choice
//     scholarships.
//   • ROBIN VOS (robin_vos) — Wisconsin Assembly Speaker: the longest-serving
//     Assembly speaker — tax cuts, the Act 10 legacy, school choice, elections.
//   • WARREN PETERSEN (warren_petersen) — Arizona Senate President: the Prop 314
//     border referral, a flat tax, universal school-choice accounts, elections.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Records constrained
// by a divided government or the courts are attributed and marked mixed where
// warranted. Sources are official state-legislature pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-leaders-wave30-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-leaders-wave30-jul2026.mjs --apply    # write
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
  pa: { label: 'legis.state.pa.us', url: 'https://www.legis.state.pa.us/' },
  mi: { label: 'legislature.mi.gov', url: 'https://www.legislature.mi.gov/' },
  il: { label: 'ilga.gov', url: 'https://www.ilga.gov/' },
  nv: { label: 'leg.state.nv.us', url: 'https://www.leg.state.nv.us/' },
  nc: { label: 'ncleg.gov', url: 'https://www.ncleg.gov/' },
  wi: { label: 'legis.wisconsin.gov', url: 'https://legis.wisconsin.gov/' },
  az: { label: 'azleg.gov', url: 'https://www.azleg.gov/' },
};

const NEW = {
  joanna_mcclinton: {
    roster: { name: 'Joanna McClinton', office: 'State House Speaker', state: 'Pennsylvania', party: 'D', score: 54, icon: '🏛', issues: ['Public Schools', 'Abortion Rights', 'Gun Safety', 'Minimum Wage'] },
    label: 'Joanna McClinton — 🏛 Pennsylvania State House Speaker (D)',
    cards: [
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'As Speaker of a narrowly divided House, has prioritized increased public-school funding in response to a court ruling that found Pennsylvania’s school-funding system unconstitutional.',
        evidence: 'Speaker of the Pennsylvania House since 2023 — the first woman and first Black woman to hold the post; former public defender.', source: S.pa },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports protecting abortion access in Pennsylvania and has used the House majority to block proposed constitutional restrictions.', source: S.pa },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs gun-safety measures such as expanded background checks and extreme-risk protection orders, advancing them through the House.', source: S.pa },
      { topic: 'Minimum Wage', icon: '💵', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Champions raising Pennsylvania’s minimum wage, which remains at the federal floor while every neighboring state is higher.', source: S.pa },
    ],
  },
  winnie_brinks: {
    roster: { name: 'Winnie Brinks', office: 'State Senate Majority Leader', state: 'Michigan', party: 'D', score: 54, icon: '🏛', issues: ['Abortion Rights', 'Gun Safety', 'Labor', 'Clean Energy'] },
    label: 'Winnie Brinks — 🏛 Michigan State Senate Majority Leader (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Led the Senate that repealed Michigan’s dormant 1931 abortion ban and passed the Reproductive Health Act after voters enshrined abortion rights in 2022.',
        evidence: 'Majority Leader of the Michigan Senate since 2023 — the first woman to lead the chamber.', source: S.mi },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Advanced a package of gun-safety laws — universal background checks, safe-storage rules, and a red-flag law — after the mass shooting at Michigan State University.', source: S.mi },
      { topic: 'Labor', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Steered the repeal of Michigan’s right-to-work law and the restoration of prevailing-wage requirements.', source: S.mi },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Passed a clean-energy standard committing Michigan to 100% carbon-free electricity by 2040.', source: S.mi },
    ],
  },
  don_harmon: {
    roster: { name: 'Don Harmon', office: 'State Senate President', state: 'Illinois', party: 'D', score: 53, icon: '🏛', issues: ['Abortion Rights', 'Gun Safety', 'State Budget', 'Workers'] },
    label: 'Don Harmon — 🏛 Illinois State Senate President (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Leads a Senate that has made Illinois a regional refuge for abortion access, protecting patients and providers who travel from restrictive states.',
        evidence: 'President of the Illinois Senate since 2020.', source: S.il },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backed Illinois’s ban on assault-style weapons and high-capacity magazines, now defended in court.', source: S.il },
      { topic: 'State Budget', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Negotiates the state’s annual budgets, balancing new spending and pension obligations against Illinois’s long-strained finances.', source: S.il },
      { topic: 'Workers', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backed the Workers’ Rights Amendment enshrining collective bargaining in the Illinois constitution.', source: S.il },
    ],
  },
  chris_welch: {
    roster: { name: 'Emanuel "Chris" Welch', office: 'State House Speaker', state: 'Illinois', party: 'D', score: 53, icon: '🏛', issues: ['Ethics Reform', 'Abortion Rights', 'Labor', 'Public Schools'] },
    label: 'Chris Welch — 🏛 Illinois State House Speaker (D)',
    cards: [
      { topic: 'Ethics Reform', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Took the gavel pledging ethics changes after his predecessor’s corruption scandal, and has pointed to lobbying and disclosure reforms since.',
        evidence: 'Speaker of the Illinois House since 2021 — the first Black speaker in the chamber’s history.', source: S.il },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports Illinois’s protections for abortion access, including for out-of-state patients.', source: S.il },
      { topic: 'Labor', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A reliable ally of organized labor who backed the constitutional Workers’ Rights Amendment.', source: S.il },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs increased public-school funding and opposed extending Illinois’s private-school scholarship tax-credit program, which lapsed.', source: S.il },
    ],
  },
  nicole_cannizzaro: {
    roster: { name: 'Nicole Cannizzaro', office: 'State Senate Majority Leader', state: 'Nevada', party: 'D', score: 53, icon: '🏛', issues: ['Abortion Rights', 'Workers', 'Public Education', 'Gun Safety'] },
    label: 'Nicole Cannizzaro — 🏛 Nevada State Senate Majority Leader (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs protecting abortion access in Nevada, where voters approved a 2024 measure to enshrine reproductive rights in the constitution.',
        evidence: 'Majority Leader of the Nevada Senate since 2019; a Clark County prosecutor.', source: S.nv },
      { topic: 'Workers', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Champions minimum-wage increases and worker protections in a heavily unionized, hospitality-driven state.', source: S.nv },
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Prioritizes record public-education funding and teacher pay in a state long ranked near the bottom for per-pupil spending.', source: S.nv },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backed background-check and other gun-safety measures following the 2017 Las Vegas shooting.', source: S.nv },
    ],
  },
  kim_ward: {
    roster: { name: 'Kim Ward', office: 'State Senate President pro Tempore', state: 'Pennsylvania', party: 'R', score: 53, icon: '🏛', issues: ['Natural Gas & Energy', 'Fiscal Restraint', 'Election Law', 'School Choice'] },
    label: 'Kim Ward — 🏛 Pennsylvania State Senate President pro Tempore (R)',
    cards: [
      { topic: 'Natural Gas & Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions Pennsylvania’s natural-gas industry and has resisted the state’s entry into a regional carbon-pricing program she argues would raise energy costs.',
        evidence: 'President pro Tempore of the Pennsylvania Senate since 2023 — the first woman to lead the chamber.', source: S.pa },
      { topic: 'Fiscal Restraint', icon: '🧾', pos: 'support', issueKey: 'gov_balance', issueStance: 'support',
        text: 'Uses the Senate majority to press for spending limits and against broad tax increases in budget negotiations with the Democratic governor.', source: S.pa },
      { topic: 'Election Law', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Backs stricter voter-identification requirements and other changes to Pennsylvania’s election procedures.', source: S.pa },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports expanding private-school scholarship tax credits and creating vouchers for students in low-performing schools.', source: S.pa },
    ],
  },
  matt_hall: {
    roster: { name: 'Matt Hall', office: 'State House Speaker', state: 'Michigan', party: 'R', score: 53, icon: '🏛', issues: ['Road Funding', 'Tax Relief', 'Spending Oversight', 'Energy'] },
    label: 'Matt Hall — 🏛 Michigan State House Speaker (R)',
    cards: [
      { topic: 'Road Funding', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Made a long-term road-funding plan his central priority as Speaker, proposing to redirect existing revenue to fix Michigan roads without a broad tax increase.',
        evidence: 'Speaker of the Michigan House since January 2025, after Republicans flipped the chamber in 2024.', source: S.mi },
      { topic: 'Tax Relief', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Pushes to lock in a lower state income-tax rate, arguing a 2023 rate cut should have been permanent.', source: S.mi },
      { topic: 'Spending Oversight', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Has used the House’s oversight power to scrutinize state grants and spending, withholding action pending stricter accountability.', source: S.mi },
      { topic: 'Energy', icon: '🛢', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Criticizes the state’s 2040 clean-energy mandate as a threat to reliability and cost, favoring an all-of-the-above approach that keeps natural gas.', source: S.mi },
    ],
  },
  phil_berger: {
    roster: { name: 'Phil Berger', office: 'State Senate President pro Tempore', state: 'North Carolina', party: 'R', score: 54, icon: '🏛', issues: ['Flat Tax', 'Abortion', 'School Choice', 'Redistricting'] },
    label: 'Phil Berger — 🏛 North Carolina State Senate President pro Tempore (R)',
    cards: [
      { topic: 'Flat Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Architect of North Carolina’s move to a low flat income tax with scheduled further reductions, a defining piece of his long tenure.',
        evidence: 'President pro Tempore of the North Carolina Senate since 2011 — one of the longest-serving legislative leaders in the country.', source: S.nc },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Led passage of North Carolina’s 12-week abortion limit in 2023, enacted by overriding the governor’s veto.', source: S.nc },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Championed the major expansion of the state’s Opportunity Scholarship private-school vouchers to universal eligibility.', source: S.nc },
      { topic: 'Redistricting', icon: '🗺', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Oversaw congressional and legislative maps drawn to favor Republicans after a state Supreme Court shift, a repeated subject of litigation.', source: S.nc },
    ],
  },
  robin_vos: {
    roster: { name: 'Robin Vos', office: 'State Assembly Speaker', state: 'Wisconsin', party: 'R', score: 53, icon: '🏛', issues: ['Tax Cuts', 'Act 10 & Labor', 'School Choice', 'Elections'] },
    label: 'Robin Vos — 🏛 Wisconsin State Assembly Speaker (R)',
    cards: [
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Pushes income-tax cuts and has used the Assembly to press tax relief in budget fights with the Democratic governor.',
        evidence: 'Speaker of the Wisconsin State Assembly since 2013 — the longest-serving Assembly speaker in state history.', source: S.wi },
      { topic: 'Act 10 & Labor', icon: '🔧', pos: 'oppose', issueKey: 'econ_workers', issueStance: 'oppose',
        text: 'A defender of Act 10, the 2011 law that sharply curtailed public-sector collective bargaining, which faces renewed court challenges.', source: S.wi },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs expanding Wisconsin’s private-school voucher and charter programs, among the oldest in the nation.', source: S.wi },
      { topic: 'Elections', icon: '🗳', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'Ordered a review of the 2020 election under pressure from his base but ultimately said the results should stand, drawing attacks from both sides.', source: S.wi },
    ],
  },
  warren_petersen: {
    roster: { name: 'Warren Petersen', office: 'State Senate President', state: 'Arizona', party: 'R', score: 53, icon: '🏛', issues: ['Border', 'Flat Tax', 'School Choice', 'Election Integrity'] },
    label: 'Warren Petersen — 🏛 Arizona State Senate President (R)',
    cards: [
      { topic: 'Border', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Referred the Secure the Border Act (Proposition 314) to the 2024 ballot, where voters approved it, letting state and local police arrest people who cross illegally.',
        evidence: 'President of the Arizona Senate since 2023.', source: S.az },
      { topic: 'Flat Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed Arizona’s move to a 2.5% flat income tax, one of the lowest in the nation.', source: S.az },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Defends Arizona’s universal Empowerment Scholarship Account program, the broadest school-voucher system in the country.', source: S.az },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'Backs stricter voter-eligibility and ballot-handling rules and tighter deadlines for counting Arizona’s votes.', source: S.az },
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

console.log(`PolitiDex — National state legislative leaders (tier 2) WAVE 30  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — state legislative leaders, tier 2 (PA · MI · IL · NV · NC · WI · AZ) · state wave 30 (Jul 2026) ─\n' +
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
  const block = '\n    // National — state legislative leaders, tier 2 (PA · MI · IL · NV · NC · WI · AZ), wave 30 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 30 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 30 — state legislative leaders, tier 2: PA · MI · IL · NV · NC · WI · AZ (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave30-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
