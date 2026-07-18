#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: PFAS/ENVIRONMENTAL-HEALTH LEADERS,
// A SENIOR LEADER & NEW SENATORS, WAVE 16 (July 2026) — after waves 1-15.
// ---------------------------------------------------------------------------
// This wave adds high-leverage figures still missing — including three leading
// PFAS voices who slot directly into the new "Forever Chemicals" Spotlight — a
// former House Majority Leader, and several newer senators, balanced across
// both parties and mapped to the recent Spotlights:
//
//   • KIRSTEN GILLIBRAND (gillibrand) — U.S. Senator (D-NY): PFAS and military
//     contamination, defense and military-justice reform, 9/11 health, tech/AI.
//   • DEBBIE DINGELL (debbie_dingell) — U.S. Rep. (D-MI): PFAS, autos and EVs,
//     healthcare, and manufacturing.
//   • MAGGIE HASSAN (maggie_hassan) — U.S. Senator (D-NH): PFAS and clean water,
//     fiscal moderation, drug prices, and the border.
//   • MICHAEL BENNET (bennet) — U.S. Senator (D-CO): education, immigration,
//     AI and tech, and agriculture.
//   • STENY HOYER (steny_hoyer) — U.S. Rep. (D-MD), former Majority Leader:
//     appropriations, the federal workforce, Israel aid, and democracy.
//   • DEB FISCHER (deb_fischer) — U.S. Senator (R-NE): defense, agriculture,
//     transportation, and spending.
//   • JIM JUSTICE (jim_justice) — U.S. Senator (R-WV): coal and energy, the
//     border, spending, and manufacturing.
//   • ASHLEY MOODY (ashley_moody) — U.S. Senator (R-FL): the border and law
//     enforcement, crime, China, and spending.
//   • PETE RICKETTS (ricketts) — U.S. Senator (R-NE): foreign policy, China,
//     agriculture, and spending.
//   • JOHN HOEVEN (hoeven) — U.S. Senator (R-ND): energy, agriculture, Indian
//     Affairs, and spending.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Two-sided records
// (Gillibrand on defense, Hassan on fiscal/border, Justice/Hoeven on jobs) are
// marked mixed and attributed. Positions are the documented public record;
// quotes only where genuinely on the record. Sources are official member pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-pfas-members-wave16-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-pfas-members-wave16-jul2026.mjs --apply    # write
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
  gillibrand: { label: 'gillibrand.senate.gov', url: 'https://www.gillibrand.senate.gov/news/press/' },
  dingell:    { label: 'debbiedingell.house.gov', url: 'https://debbiedingell.house.gov/news/' },
  hassan:     { label: 'hassan.senate.gov', url: 'https://www.hassan.senate.gov/news/press-releases' },
  bennet:     { label: 'bennet.senate.gov', url: 'https://www.bennet.senate.gov/public/index.cfm/press-releases' },
  hoyer:      { label: 'hoyer.house.gov', url: 'https://hoyer.house.gov/press-releases' },
  fischer:    { label: 'fischer.senate.gov', url: 'https://www.fischer.senate.gov/public/index.cfm/press-releases' },
  justice:    { label: 'justice.senate.gov', url: 'https://www.justice.senate.gov/press-releases/' },
  moody:      { label: 'moody.senate.gov', url: 'https://www.moody.senate.gov/press-releases/' },
  ricketts:   { label: 'ricketts.senate.gov', url: 'https://www.ricketts.senate.gov/news/press-releases/' },
  hoeven:     { label: 'hoeven.senate.gov', url: 'https://www.hoeven.senate.gov/news/news-releases' },
};

const NEW = {
  gillibrand: {
    roster: { name: 'Kirsten Gillibrand', office: 'U.S. Senator', state: 'New York', party: 'D', score: 57, icon: '💧', issues: ['PFAS & Military', 'Defense', '9/11 Health', 'Tech & AI'] },
    label: 'Kirsten Gillibrand — 💧 U.S. Senator (D-NY)',
    cards: [
      { topic: 'PFAS & Military Contamination', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'On Armed Services, Gillibrand is a leading champion for cleaning up PFAS "forever chemical" contamination at military bases and for testing, treatment, and accountability for affected communities.',
        evidence: 'Member of the Senate Armed Services Committee.', source: S.gillibrand },
      { topic: 'Defense & Military Justice', icon: '🎖', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: 'Backs a strong military while leading reform — she moved prosecution of serious military crimes to independent prosecutors, outside the chain of command.', source: S.gillibrand },
      { topic: '9/11 & Toxic-Exposure Health', icon: '🚒', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A lead force behind extending the 9/11 first-responder health program and toxic-exposure (PACT Act) benefits for veterans.', source: S.gillibrand },
      { topic: 'Tech & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Backs guardrails on AI and social media, data privacy, and online child-safety protections.', source: S.gillibrand },
    ],
  },
  debbie_dingell: {
    roster: { name: 'Debbie Dingell', office: 'U.S. Representative', state: 'Michigan', party: 'D', score: 57, icon: '🚗', issues: ['PFAS', 'Autos & EVs', 'Healthcare', 'Manufacturing'] },
    label: 'Debbie Dingell — 🚗 U.S. Representative (D-MI)',
    cards: [
      { topic: 'PFAS', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'A co-chair of the House PFAS Task Force, Dingell is a leading House voice for regulating and cleaning up PFAS "forever chemicals" and setting enforceable drinking-water limits.',
        evidence: 'Co-chair of the Congressional PFAS Task Force; Energy & Commerce Committee.', source: S.dingell },
      { topic: 'Autos & EVs', icon: '🔋', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'From Michigan, backs the auto industry and a managed transition to electric vehicles while protecting auto jobs and supply chains.', source: S.dingell },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A supporter of Medicare for All and of lowering prescription-drug costs.', source: S.dingell },
      { topic: 'Manufacturing & Workers', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Champions manufacturing, union workers, and Buy America.', source: S.dingell },
    ],
  },
  maggie_hassan: {
    roster: { name: 'Maggie Hassan', office: 'U.S. Senator', state: 'New Hampshire', party: 'D', score: 57, icon: '💧', issues: ['PFAS & Water', 'Fiscal Moderate', 'Drug Prices', 'Border'] },
    label: 'Maggie Hassan — 💧 U.S. Senator (D-NH)',
    cards: [
      { topic: 'PFAS & Clean Water', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'A former governor from a PFAS-affected state, Hassan backs cleaning up "forever chemicals," enforceable drinking-water limits, and holding polluters accountable.',
        evidence: 'Member of the Senate Finance and Homeland Security committees.', source: S.hassan },
      { topic: 'Fiscal Moderate', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A self-styled fiscal moderate, Hassan backs bipartisan spending deals and some deficit reduction while defending core programs.', source: S.hassan },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Champions lowering prescription-drug and insulin costs for consumers.', source: S.hassan },
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'Backs more border technology, agents, and fentanyl interdiction alongside orderly processing and legal pathways.', source: S.hassan },
    ],
  },
  bennet: {
    roster: { name: 'Michael Bennet', office: 'U.S. Senator', state: 'Colorado', party: 'D', score: 57, icon: '🏔', issues: ['Education', 'Immigration', 'AI & Tech', 'Agriculture'] },
    label: 'Michael Bennet — 🏔 U.S. Senator (D-CO)',
    cards: [
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former Denver schools superintendent, Bennet focuses on public education, teacher pay, and school funding.',
        evidence: 'Member of the Senate Finance, Agriculture, and Intelligence committees.', source: S.bennet },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'A member of the 2013 "Gang of 8," Bennet backs comprehensive immigration reform pairing border security with a path to citizenship.', source: S.bennet },
      { topic: 'AI & Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Has proposed a new federal agency to oversee AI and digital platforms and backs guardrails and competition.', source: S.bennet },
      { topic: 'Agriculture & Child Tax Credit', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'On Agriculture and Finance, works on rural Colorado, water, and expanding the child tax credit.', source: S.bennet },
    ],
  },
  steny_hoyer: {
    roster: { name: 'Steny Hoyer', office: 'U.S. Representative', state: 'Maryland', party: 'D', score: 57, icon: '🏛', issues: ['Appropriations', 'Federal Workforce', 'Israel Aid', 'Democracy'] },
    label: 'Steny Hoyer — 🏛 U.S. Representative (D-MD)',
    cards: [
      { topic: 'Appropriations & Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: 'A former House Majority Leader and senior appropriator, Hoyer defends domestic and safety-net funding and opposes deep discretionary cuts.',
        evidence: 'Former House Majority Leader; member of the Appropriations Committee.', source: S.hoyer },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Representing many federal employees, Hoyer defends the federal workforce, pay, and agencies against cuts.', source: S.hoyer },
      { topic: 'Israel Aid', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A longtime strong supporter of Israel and U.S. security aid and the alliance.', source: S.hoyer },
      { topic: 'Democracy & Institutions', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'A defender of democratic institutions, voting rights, and regular-order governing.', source: S.hoyer },
    ],
  },
  deb_fischer: {
    roster: { name: 'Deb Fischer', office: 'U.S. Senator', state: 'Nebraska', party: 'R', score: 56, icon: '🌾', issues: ['Defense', 'Agriculture', 'Transportation', 'Spending'] },
    label: 'Deb Fischer — 🌾 U.S. Senator (R-NE)',
    cards: [
      { topic: 'Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'On Armed Services, Fischer backs a strong military, nuclear modernization, and aid to Israel.',
        evidence: 'Member of the Senate Armed Services, Commerce, and Agriculture committees.', source: S.fischer },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From Nebraska ranching, backs the farm safety net, cattle producers, and agricultural exports.', source: S.fischer },
      { topic: 'Transportation & Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'On Commerce, focuses on highways, freight, and rural broadband.', source: S.fischer },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal conservative who backs spending restraint and the 2017 tax cuts.', source: S.fischer },
    ],
  },
  jim_justice: {
    roster: { name: 'Jim Justice', office: 'U.S. Senator', state: 'West Virginia', party: 'R', score: 55, icon: '⛏', issues: ['Coal & Energy', 'Border', 'Spending', 'Manufacturing'] },
    label: 'Jim Justice — ⛏ U.S. Senator (R-WV)',
    cards: [
      { topic: 'Coal & Energy', icon: '⛏', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A former governor and coal businessman, Justice strongly backs coal, natural gas, and West Virginia energy jobs and opposes rules he says threaten them.',
        evidence: 'Former Governor of West Virginia.', source: S.justice },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement and fentanyl interdiction.', source: S.justice },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Supports spending restraint, the 2017 tax cuts, and the administration’s agenda.', source: S.justice },
      { topic: 'Manufacturing & Jobs', icon: '🏭', pos: 'mixed', issueKey: 'econ_workers', issueStance: 'mixed',
        text: 'Focuses on West Virginia jobs, manufacturing, and economic development.', source: S.justice },
    ],
  },
  ashley_moody: {
    roster: { name: 'Ashley Moody', office: 'U.S. Senator', state: 'Florida', party: 'R', score: 55, icon: '⚖️', issues: ['Border & Law Enforcement', 'Crime', 'China', 'Spending'] },
    label: 'Ashley Moody — ⚖️ U.S. Senator (R-FL)',
    cards: [
      { topic: 'Border & Immigration Enforcement', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'A former Florida attorney general appointed to the Senate, Moody built a record suing over immigration policy and backs strict border enforcement and deportations.',
        evidence: 'Former Florida Attorney General.', source: S.moody },
      { topic: 'Crime & Law Enforcement', icon: '🚓', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A former judge and prosecutor, Moody emphasizes tough-on-crime policy, backing police, and fentanyl enforcement.', source: S.moody },
      { topic: 'China & National Security', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: 'Focuses on countering China, including foreign land purchases and fentanyl precursors.', source: S.moody },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Backs spending restraint and the administration’s fiscal agenda.', source: S.moody },
    ],
  },
  ricketts: {
    roster: { name: 'Pete Ricketts', office: 'U.S. Senator', state: 'Nebraska', party: 'R', score: 56, icon: '🌐', issues: ['Foreign Policy', 'China', 'Agriculture', 'Spending'] },
    label: 'Pete Ricketts — 🌐 U.S. Senator (R-NE)',
    cards: [
      { topic: 'Foreign Policy', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A former governor on the Foreign Relations Committee, Ricketts backs a strong national defense, aid to Israel and Taiwan, and countering China.',
        evidence: 'Member of the Senate Foreign Relations Committee.', source: S.ricketts },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: 'A China hawk focused on trade, security, and countering Chinese influence and land purchases.', source: S.ricketts },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From Nebraska, backs the farm safety net, cattle and ag exports, and market access.', source: S.ricketts },
      { topic: 'Spending & Taxes', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'A fiscal conservative and businessman who backs spending cuts and lower taxes.', source: S.ricketts },
    ],
  },
  hoeven: {
    roster: { name: 'John Hoeven', office: 'U.S. Senator', state: 'North Dakota', party: 'R', score: 56, icon: '🛢', issues: ['Energy', 'Agriculture', 'Indian Affairs', 'Spending'] },
    label: 'John Hoeven — 🛢 U.S. Senator (R-ND)',
    cards: [
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A former governor from the Bakken oil patch and a senior appropriator, Hoeven strongly backs oil, gas, coal, and pipeline infrastructure.',
        evidence: 'Chair of the Senate Indian Affairs Committee; Appropriations and Agriculture committees.', source: S.hoeven },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'A leading farm-state voice, Hoeven works on the Farm Bill, crop insurance, and ag exports.', source: S.hoeven },
      { topic: 'Indian Affairs', icon: '🪶', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed',
        text: 'Chair of the Indian Affairs Committee, focuses on tribal health, public safety, and economic development.', source: S.hoeven },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal conservative who backs the 2017 tax cuts and energy-driven growth.', source: S.hoeven },
    ],
  },
};

// ── validate issueKeys ───────────────────────────────────────────────────────
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

console.log(`PolitiDex — National PFAS/env-health leaders, a senior leader & new senators WAVE 16  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National PFAS/environmental-health leaders, a senior leader & new senators · top-down federal wave 16 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — PFAS/env-health leaders, a senior leader + new senators, wave 16 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
