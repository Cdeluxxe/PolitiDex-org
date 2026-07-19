#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE LEGISLATIVE LEADERS IN NEW STATES,
// WAVE 37 (July 2026) — after waves 1-36.
// ---------------------------------------------------------------------------
// Prior waves covered ~26 state legislatures. This wave opens seven more — Oregon,
// Connecticut, Maine, Missouri, South Carolina, Kansas, and Louisiana — plus the
// Colorado Senate President to complete Colorado's chamber leadership alongside the
// House Speaker already in the dataset. Balanced 4D / 4R.
//
//   DEMOCRATS
//   • JULIE FAHEY (julie_fahey) — Oregon House Speaker: transportation funding,
//     housing, defending Medicaid against federal cuts, gun safety.
//   • MATT RITTER (matt_ritter) — Connecticut House Speaker: housing, abortion
//     rights, the state's fiscal "guardrails," gun safety.
//   • RYAN FECTEAU (ryan_fecteau) — Maine House Speaker: a signature housing/zoning
//     reform, abortion rights, labor, the state budget.
//   • JAMES COLEMAN (james_coleman) — Colorado Senate President: education, housing,
//     affordability, and a stated check on federal policy.
//
//   REPUBLICANS
//   • JON PATTERSON (jon_patterson) — Missouri House Speaker: income-tax phase-out,
//     a 2026 abortion ballot measure, a pragmatic tone; a physician.
//   • MURRELL SMITH (murrell_smith) — South Carolina House Speaker: the income-tax
//     cut signed into law, tort/insurance reform, juvenile crime, roads.
//   • TY MASTERSON (ty_masterson) — Kansas Senate President: tax relief, abortion,
//     overriding Gov. Kelly's vetoes, and a 2026 run for governor; the Kansas
//     legislature did NOT pass a mid-decade congressional redraw despite pressure.
//   • PHILLIP DeVILLIER (phillip_devillier) — Louisiana House Speaker: the 2024 flat-
//     tax overhaul, the tough-on-crime special session, insurance, energy.
//
// FEDERAL DOTS (per the round's guidance): Masterson's Kansas is part of the
// national mid-decade redistricting story (noted in-card as a case where the
// redraw did NOT happen), connecting to Texas, California, Ohio, and Tennessee.
// No federal roll-call votes are attributed to these state figures.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Voter- or court-constrained and divided-
// government records are marked mixed and attributed. Sources are official state-
// legislature pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-legislators-wave37-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-legislators-wave37-jul2026.mjs --apply    # write
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
  or: { label: 'oregonlegislature.gov', url: 'https://www.oregonlegislature.gov/' },
  ct: { label: 'cga.ct.gov', url: 'https://www.cga.ct.gov/' },
  me: { label: 'legislature.maine.gov', url: 'https://legislature.maine.gov/house/' },
  co: { label: 'leg.colorado.gov', url: 'https://leg.colorado.gov/' },
  mo: { label: 'house.mo.gov', url: 'https://house.mo.gov/' },
  sc: { label: 'scstatehouse.gov', url: 'https://www.scstatehouse.gov/' },
  ks: { label: 'kslegislature.gov', url: 'https://www.kslegislature.gov/' },
  la: { label: 'house.louisiana.gov', url: 'https://house.louisiana.gov/' },
};

const NEW = {
  julie_fahey: {
    roster: { name: 'Julie Fahey', office: 'State House Speaker', state: 'Oregon', party: 'D', score: 53, icon: '🏛', issues: ['Transportation', 'Housing', 'Medicaid', 'Gun Safety'] },
    label: 'Julie Fahey — 🏛 Oregon State House Speaker (D)',
    cards: [
      { topic: 'Transportation Funding', icon: '🚧', pos: 'mixed', issueKey: 'infrastructure', issueStance: 'mixed',
        text: 'Pushed a transportation-funding package, including a fuel-tax increase, to head off layoffs at the state transportation department; a last-ditch 2025 effort failed when House Republicans blocked a vote.',
        evidence: 'Speaker of the Oregon House since 2023.', source: S.or },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Prioritizes boosting housing production and lowering costs across Oregon.', source: S.or },
      { topic: 'Medicaid', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Framed a central 2026 challenge as responding to federal cuts to Medicaid funding that threaten Oregon coverage.', source: S.or },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs Oregon’s gun-safety laws, including permit-to-purchase and storage measures.', source: S.or },
    ],
  },
  matt_ritter: {
    roster: { name: 'Matt Ritter', office: 'State House Speaker', state: 'Connecticut', party: 'D', score: 53, icon: '🏛', issues: ['Housing', 'Abortion Rights', 'Fiscal Guardrails', 'Gun Safety'] },
    label: 'Matt Ritter — 🏛 Connecticut State House Speaker (D)',
    cards: [
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Made expanding housing supply a priority in a high-cost state, pushing zoning and production measures through the House.',
        evidence: 'Speaker of the Connecticut House since 2021; seeking an unprecedented fourth term.', source: S.ct },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backed Connecticut’s protections for abortion access and shield laws for providers.', source: S.ct },
      { topic: 'Fiscal Guardrails', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has largely defended Connecticut’s bipartisan "fiscal guardrails" that have produced surpluses and paid down pension debt, while facing pressure from his caucus to loosen them for new spending.', source: S.ct },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs Connecticut’s strict gun laws, among the toughest in the nation after Sandy Hook.', source: S.ct },
    ],
  },
  ryan_fecteau: {
    roster: { name: 'Ryan Fecteau', office: 'State House Speaker', state: 'Maine', party: 'D', score: 53, icon: '🏛', issues: ['Housing', 'Abortion Rights', 'Labor', 'State Budget'] },
    label: 'Ryan Fecteau — 🏛 Maine State House Speaker (D)',
    cards: [
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'The lead sponsor of Maine’s landmark housing law easing local zoning to allow more units (including accessory dwelling units), his signature issue.',
        evidence: 'Speaker of the Maine House; the first openly gay Speaker in state history and the first to serve nonconsecutive terms since 1966.', source: S.me },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backed Maine’s laws protecting and expanding abortion access.', source: S.me },
      { topic: 'Labor', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Supports collective-bargaining and worker-protection measures.', source: S.me },
      { topic: 'State Budget', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Negotiates Maine’s budgets with Governor Mills and a closely divided legislature, balancing new spending against revenue limits.', source: S.me },
    ],
  },
  james_coleman: {
    roster: { name: 'James Coleman', office: 'State Senate President', state: 'Colorado', party: 'D', score: 53, icon: '🏛', issues: ['Education', 'Housing', 'Affordability', 'Check on D.C.'] },
    label: 'James Coleman — 🏛 Colorado State Senate President (D)',
    cards: [
      { topic: 'Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former educator, Coleman has centered public-school effectiveness and funding, pursuing an education task force in 2026 after an earlier bill stalled.',
        evidence: 'President of the Colorado Senate since January 2025; term-limited in 2028.', source: S.co },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Backs expanding Colorado’s affordable-housing supply and land-use reform.', source: S.co },
      { topic: 'Affordability', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Prioritizes cost-of-living relief, from health-insurance premiums to everyday costs.', source: S.co },
      { topic: 'Check on D.C.', icon: '🏛', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Cast the 2026 Democratic agenda as protecting Coloradans from Trump-administration policies while governing a large majority.', source: S.co },
    ],
  },
  jon_patterson: {
    roster: { name: 'Jon Patterson', office: 'State House Speaker', state: 'Missouri', party: 'R', score: 53, icon: '🏛', issues: ['Income-Tax Phase-Out', 'Abortion', 'Pragmatic Tone', 'Public Safety'] },
    label: 'Jon Patterson — 🏛 Missouri State House Speaker (R)',
    cards: [
      { topic: 'Income-Tax Phase-Out', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Has made phasing out Missouri’s individual income tax a central goal of his speakership.',
        evidence: 'Speaker of the Missouri House since 2025 — the first Asian American to hold the post; a physician who won the gavel over a further-right challenger.', source: S.mo },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Backed referring a 2026 ballot measure to re-restrict abortion after Missouri voters approved an abortion-rights amendment in 2024 — a voter-contested fight he has defended while acknowledging more ballot votes are likely.', source: S.mo },
      { topic: 'Pragmatic Tone', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has cultivated a more pragmatic, less combustible tone than some in his caucus, emphasizing governing over intra-party fights.', source: S.mo },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backs tougher crime and public-safety measures, including for the St. Louis and Kansas City areas.', source: S.mo },
    ],
  },
  murrell_smith: {
    roster: { name: 'Murrell Smith', office: 'State House Speaker', state: 'South Carolina', party: 'R', score: 53, icon: '🏛', issues: ['Tax Cuts', 'Tort & Insurance', 'Juvenile Crime', 'Roads'] },
    label: 'Murrell Smith — 🏛 South Carolina State House Speaker (R)',
    cards: [
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Drove the income-tax overhaul that lowered South Carolina’s rate and set a path for further cuts, signed into law by Governor McMaster.',
        evidence: 'Speaker of the South Carolina House since 2022.', source: S.sc },
      { topic: 'Tort & Insurance', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Pushed liquor-liability and broader tort/insurance reform aimed at lowering premiums for businesses.', source: S.sc },
      { topic: 'Juvenile Crime', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made addressing juvenile crime and public safety a 2026 session priority.', source: S.sc },
      { topic: 'Roads', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Prioritizes road repair and infrastructure investment across the state.', source: S.sc },
    ],
  },
  ty_masterson: {
    roster: { name: 'Ty Masterson', office: 'State Senate President', state: 'Kansas', party: 'R', score: 53, icon: '🏛', issues: ['Tax Relief', 'Abortion', 'Redistricting', 'Overriding the Governor'] },
    label: 'Ty Masterson — 🏛 Kansas State Senate President (R)',
    cards: [
      { topic: 'Tax Relief', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs Kansas income- and property-tax relief, a recurring priority he has pressed against the Democratic governor.',
        evidence: 'President of the Kansas Senate since 2021; a 2026 candidate for governor with President Trump’s endorsement.', source: S.ks },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Backs abortion restrictions, though Kansas voters rejected a 2022 amendment that would have allowed the legislature to ban abortion, constraining how far restrictions can go.', source: S.ks },
      { topic: 'Redistricting', icon: '🗺', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'In 2026 the Republican legislature was unable to pass a mid-decade congressional redraw sought to add a GOP-leaning U.S. House seat — a Kansas chapter of the national redistricting fight that, unlike Texas or Ohio, did not succeed.', source: S.ks },
      { topic: 'Overriding the Governor', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Uses the Republican supermajority to override many of Democratic Governor Laura Kelly’s vetoes.', source: S.ks },
    ],
  },
  phillip_devillier: {
    roster: { name: 'Phillip DeVillier', office: 'State House Speaker', state: 'Louisiana', party: 'R', score: 53, icon: '🏛', issues: ['Flat Tax', 'Tough on Crime', 'Insurance', 'Energy'] },
    label: 'Phillip DeVillier — 🏛 Louisiana State House Speaker (R)',
    cards: [
      { topic: 'Flat Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Helped pass Governor Landry’s 2024 tax overhaul moving Louisiana to a flat individual income tax while raising the sales tax.',
        evidence: 'Speaker of the Louisiana House since 2024.', source: S.la },
      { topic: 'Tough on Crime', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backed the 2024 special-session crime package expanding penalties, limiting parole, and adding execution methods.', source: S.la },
      { topic: 'Insurance', icon: '🏠', pos: 'mixed', issueKey: 'reform_balance', issueStance: 'mixed',
        text: 'Backed changes aimed at Louisiana’s property-insurance crisis, a contested balance between insurer incentives and consumer protections.', source: S.la },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions Louisiana’s oil, gas, and LNG industry and opposes federal limits on production and exports.', source: S.la },
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

console.log(`PolitiDex — National state legislators (new states) WAVE 37  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — state legislative leaders in new states (OR · CT · ME · CO · MO · SC · KS · LA) · state wave 37 (Jul 2026) ─\n' +
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
  const block = '\n    // National — state legislative leaders in new states (OR · CT · ME · CO · MO · SC · KS · LA), wave 37 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 37 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 37 — state legislative leaders in new states: OR · CT · ME · CO · MO · SC · KS · LA (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave37-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
