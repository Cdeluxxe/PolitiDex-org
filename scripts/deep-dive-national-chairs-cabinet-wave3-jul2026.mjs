#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: CHAIRS & CABINET, WAVE 3
// (July 2026) — continuing the top-down push after waves 1 and 2.
// ---------------------------------------------------------------------------
// Waves 1-2 built the Senate committee chairs (Foreign Relations, Finance,
// Intelligence, Appropriations, Banking, Armed Services), several House chairs,
// Cabinet officials, and marquee senators. This wave adds the remaining
// domain-owning chairs and high-profile members most tied to the recent Issue
// Spotlights (Israel aid, border, tariffs, government spending, energy, AI,
// crypto), balanced across both parties:
//
//   • JODEY ARRINGTON (arrington) — Chair, House Budget (R-TX): budget
//     resolutions, the reconciliation vehicle, deficits, and a fiscal commission.
//   • BRETT GUTHRIE (guthrie) — Chair, House Energy & Commerce (R-KY): energy and
//     the grid, tech/AI and data privacy, and drug-pricing/PBM reform.
//   • SHELLEY MOORE CAPITO (capito) — Chair, Senate Environment & Public Works
//     (R-WV): energy and coal, EPA deregulation, and infrastructure/permitting.
//   • JAMES LANKFORD (lankford) — U.S. Senator (R-OK): lead GOP author of the
//     2024 bipartisan border bill, a fiscal hawk, and an Israel supporter.
//   • JONI ERNST (ernst) — U.S. Senator (R-IA): the DOGE Caucus chair on waste
//     and spending, an Army veteran on defense with conditions on Ukraine aid.
//   • CYNTHIA LUMMIS (lummis) — U.S. Senator (R-WY): the Senate's leading Bitcoin
//     and digital-assets voice, plus Wyoming energy and public lands.
//   • RUBEN GALLEGO (gallego) — U.S. Senator (D-AZ): a Marine combat veteran and
//     border-state Democrat on enforcement-plus-pathway, workers, and housing.
//   • TIM KAINE (kaine) — U.S. Senator (D-VA): war-powers and aid-conditions
//     leadership on Israel/Iran and Ukraine, plus healthcare and federal workers.
//   • ADAM SCHIFF (schiff) — U.S. Senator (D-CA): AI/tech guardrails, oversight
//     and democracy, Israel aid with humanitarian conditions, and housing.
//   • MARK WARNER (warner) — U.S. Senator (D-VA), Intelligence Vice Chair: AI and
//     national security, semiconductors/China, and crypto regulation.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided records are marked mixed and attributed. Positions are the
// documented public record; quotes only where genuinely on the record, otherwise
// paraphrased. Sources are official member/committee pages, congress.gov, and
// reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-chairs-cabinet-wave3-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-chairs-cabinet-wave3-jul2026.mjs --apply    # write
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
  budget:      { label: 'House Budget Committee', url: 'https://budget.house.gov/' },
  arrington:   { label: 'arrington.house.gov', url: 'https://arrington.house.gov/news/documentquery.aspx?DocumentTypeID=2402' },
  cbo:         { label: 'Congressional Budget Office', url: 'https://www.cbo.gov/' },
  ec:          { label: 'House Energy & Commerce Committee', url: 'https://energycommerce.house.gov/' },
  guthrie:     { label: 'guthrie.house.gov', url: 'https://guthrie.house.gov/news/documentquery.aspx?DocumentTypeID=1341' },
  epw:         { label: 'Senate Environment & Public Works Committee', url: 'https://www.epw.senate.gov/public/' },
  capito:      { label: 'capito.senate.gov', url: 'https://www.capito.senate.gov/news/press-releases' },
  lankford:    { label: 'lankford.senate.gov', url: 'https://www.lankford.senate.gov/news/press-releases/' },
  border_bill: { label: 'Congress.gov — 2024 border/national-security bill (S.4361)', url: 'https://www.congress.gov/bill/118th-congress/senate-bill/4361' },
  crs_israel:  { label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
  ernst:       { label: 'ernst.senate.gov', url: 'https://www.ernst.senate.gov/news/press-releases' },
  lummis:      { label: 'lummis.senate.gov', url: 'https://www.lummis.senate.gov/press-releases/' },
  bitcoin_act: { label: 'Congress.gov — BITCOIN Act (S.954, 119th)', url: 'https://www.congress.gov/bill/119th-congress/senate-bill/954' },
  gallego:     { label: 'gallego.senate.gov', url: 'https://www.gallego.senate.gov/news/press-releases/' },
  kaine:       { label: 'kaine.senate.gov', url: 'https://www.kaine.senate.gov/press-releases' },
  schiff:      { label: 'schiff.senate.gov', url: 'https://www.schiff.senate.gov/news/press-releases/' },
  warner:      { label: 'warner.senate.gov', url: 'https://www.warner.senate.gov/public/index.cfm/pressreleases' },
  intel:       { label: 'Senate Select Committee on Intelligence', url: 'https://www.intelligence.senate.gov/' },
};

const NEW = {
  arrington: {
    roster: { name: 'Jodey Arrington', office: 'House Budget Committee Chair', state: 'Texas', party: 'R', score: 58, icon: '🧾', issues: ['Government Spending', 'National Debt', 'Taxes', 'Entitlement Reform'] },
    label: 'Jodey Arrington — 🧾 House Budget Chair (R-TX)',
    cards: [
      { topic: 'Balancing the Budget', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'As House Budget chair, Arrington writes the budget resolution and has pushed plans to balance the budget within a decade, calling the roughly $37 trillion debt the nation\'s top fiscal threat.',
        evidence: 'Chairs the committee that drafts the budget resolution and reconciliation instructions.', source: S.budget },
      { topic: 'Cutting Federal Spending', icon: '🧹', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Backs deep discretionary cuts, mandatory-spending reforms, and rescissions, and provided the reconciliation framework that carried the 2025 tax-and-spending law.', source: S.arrington },
      { topic: 'Fiscal Commission & Entitlements', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Proposed a bipartisan fiscal commission to address Social Security and Medicare solvency — a politically fraught idea he frames as math, while critics warn it could mean benefit cuts.', source: S.arrington },
      { topic: 'Extending the Tax Cuts', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supported making the 2017 individual tax rates permanent in the 2025 law, arguing lower taxes drive growth; the CBO projects the package widens deficits without offsetting cuts.', source: S.cbo },
      { topic: 'Domestic Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'From West Texas, backs expanded oil and gas production and faster permitting as an economic and energy-security priority.', source: S.arrington },
    ],
  },
  guthrie: {
    roster: { name: 'Brett Guthrie', office: 'House Energy & Commerce Committee Chair', state: 'Kentucky', party: 'R', score: 58, icon: '⚡', issues: ['Energy & Grid', 'Tech & AI', 'Drug Prices', 'Healthcare'] },
    label: 'Brett Guthrie — ⚡ House Energy & Commerce Chair (R-KY)',
    cards: [
      { topic: 'Energy Production', icon: '🔌', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'As Energy & Commerce chair, Guthrie prioritizes expanding domestic energy and grid capacity — including natural gas, nuclear, and faster permitting — to meet rising demand.',
        evidence: 'Chairs the House committee with jurisdiction over energy, telecom, and health.', source: S.ec },
      { topic: 'AI & Tech Oversight', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'Steering the committee\'s work on AI and a national data-privacy standard, Guthrie favors a light-touch, innovation-friendly federal framework over a patchwork of state rules, while weighing consumer and child-safety protections.', source: S.guthrie },
      { topic: 'Data-Center Power Demand', icon: '🏭', pos: 'support', issueKey: 'datacenter_power', issueStance: 'support',
        text: 'Frames surging electricity demand from AI data centers as a reason to build more generation and modernize the grid rather than constrain it.', source: S.ec },
      { topic: 'Drug Prices & PBMs', icon: '💊', pos: 'mixed', issueKey: 'health_drug_prices', issueStance: 'mixed',
        text: 'Backs pharmacy-benefit-manager transparency and site-neutral payment changes to lower costs, while opposing broad government price-setting he says could deter innovation.', source: S.guthrie },
      { topic: 'Medicaid & Coverage', icon: '⚕️', pos: 'mixed', issueKey: 'healthcare_market', issueStance: 'mixed',
        text: 'Supported the 2025 law\'s Medicaid work requirements and eligibility changes as program integrity; critics and the CBO project coverage losses, a contested effect.', source: S.cbo },
    ],
  },
  capito: {
    roster: { name: 'Shelley Moore Capito', office: 'Senate Environment & Public Works Chair', state: 'West Virginia', party: 'R', score: 60, icon: '🏗', issues: ['Energy & Coal', 'Infrastructure', 'EPA & Deregulation', 'Permitting'] },
    label: 'Shelley Moore Capito — 🏗 Senate EPW Chair (R-WV)',
    cards: [
      { topic: 'Energy & Coal', icon: '⚡', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'As EPW chair from a coal state, Capito champions fossil-fuel and all-of-the-above energy production and opposes rules she argues shut down reliable baseload power.',
        evidence: 'Chairs the Senate committee overseeing the EPA, highways, and public works.', source: S.epw },
      { topic: 'EPA Deregulation', icon: '🏭', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Leads oversight rolling back EPA power-plant, vehicle, and emissions rules she views as regulatory overreach, prioritizing cost and reliability over stricter standards.', source: S.capito },
      { topic: 'Infrastructure', icon: '🛣', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'A lead Republican negotiator of the 2021 infrastructure law, Capito focuses on roads, bridges, water systems, and rural broadband for West Virginia.', source: S.capito },
      { topic: 'Permitting Reform', icon: '📋', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Pushes bipartisan permitting reform to speed approvals for energy, transmission, and construction projects, arguing the current process blocks build-out.', source: S.epw },
    ],
  },
  lankford: {
    roster: { name: 'James Lankford', office: 'U.S. Senator', state: 'Oklahoma', party: 'R', score: 59, icon: '🛂', issues: ['Border Security', 'Government Spending', 'Energy', 'Israel'] },
    label: 'James Lankford — 🛂 U.S. Senator (R-OK)',
    cards: [
      { topic: 'The 2024 Border Deal', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'Lankford was the lead Republican author of the 2024 bipartisan border bill — tighter asylum limits and an emergency shutdown authority — that collapsed after opposition; he continues to back strict enforcement paired with legislative fixes.',
        evidence: 'Lead GOP negotiator of the February 2024 Senate border/national-security package.', source: S.border_bill },
      { topic: 'Immigration Enforcement', icon: '📋', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Supports more detention and removal capacity, tighter asylum standards, and stronger interior enforcement, framing an orderly legal system as the goal.', source: S.lankford },
      { topic: 'Debt & Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal conservative who publishes an annual "Federal Fumbles" waste report, Lankford backs spending cuts and warns the debt is unsustainable.', source: S.lankford },
      { topic: 'Domestic Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'From an oil-and-gas state, backs expanded domestic production and exports and opposes drilling limits he says raise costs.', source: S.lankford },
      { topic: 'Support for Israel', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A consistent supporter of Israel and its U.S. security aid, tying the alliance to shared interests and post-Oct. 7 assistance.', source: S.lankford },
    ],
  },
  ernst: {
    roster: { name: 'Joni Ernst', office: 'U.S. Senator', state: 'Iowa', party: 'R', score: 58, icon: '🐷', issues: ['Government Waste', 'Defense', 'Agriculture', 'Veterans'] },
    label: 'Joni Ernst — 🐷 U.S. Senator (R-IA)',
    cards: [
      { topic: 'Cutting Waste (DOGE)', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Chair of the Senate DOGE Caucus, Ernst built her brand on rooting out federal waste — issuing regular waste reports and her "Squeal Award" — and partnering with the government-efficiency drive.', source: S.ernst },
      { topic: 'Cutting Spending', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Backs rescissions and spending cuts and has pressed agencies over improper payments, telework, and duplicative programs.', source: S.ernst },
      { topic: 'Defense & Allies', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Army combat veteran on Armed Services, Ernst supports a strong military and aid to Israel, and backed post-Oct. 7 assistance.', source: S.ernst },
      { topic: 'Ukraine Aid Conditions', icon: '🇺🇦', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports helping Ukraine but has increasingly pressed for oversight, allied burden-sharing, and a defined strategy rather than open-ended funding.', source: S.ernst },
      { topic: 'Agriculture & Biofuels', icon: '🌽', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From Iowa, defends the Renewable Fuel Standard and year-round E15, and works farm-bill and trade issues affecting corn and soybean growers.', source: S.ernst },
    ],
  },
  lummis: {
    roster: { name: 'Cynthia Lummis', office: 'U.S. Senator', state: 'Wyoming', party: 'R', score: 58, icon: '🪙', issues: ['Digital Assets', 'Energy', 'Public Lands', 'National Debt'] },
    label: 'Cynthia Lummis — 🪙 U.S. Senator (R-WY)',
    cards: [
      { topic: 'Bitcoin & Digital Assets', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: 'The Senate\'s foremost Bitcoin advocate and chair of the Banking digital-assets subcommittee, Lummis wrote the BITCOIN Act proposing a strategic bitcoin reserve and backs clear crypto rules while opposing a government-run CBDC.',
        evidence: 'Chairs the Senate Banking Subcommittee on Digital Assets; sponsor of the BITCOIN Act.', source: S.bitcoin_act },
      { topic: 'Wyoming Energy', icon: '⚡', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions Wyoming coal, oil, gas, and uranium production and advanced nuclear, opposing federal rules she says target the state\'s energy economy.', source: S.lummis },
      { topic: 'Federal Lands', icon: '🏔', pos: 'support', issueKey: 'lands_energy', issueStance: 'support',
        text: 'Backs more state and local control of federal lands and expanded grazing, mining, and energy leasing across Wyoming\'s large federal acreage.', source: S.lummis },
      { topic: 'Debt & Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal hawk who warns about the national debt and backs spending cuts and balanced-budget efforts.', source: S.lummis },
    ],
  },
  gallego: {
    roster: { name: 'Ruben Gallego', office: 'U.S. Senator', state: 'Arizona', party: 'D', score: 59, icon: '🎖', issues: ['Border Security', 'Workers & Wages', 'Veterans', 'Housing'] },
    label: 'Ruben Gallego — 🎖 U.S. Senator (D-AZ)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'A border-state Marine combat veteran, Gallego backs more Border Patrol agents, technology, and fentanyl interdiction alongside a legal pathway and asylum fixes, criticizing both parties for inaction.', source: S.gallego },
      { topic: 'Workers & Wages', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Centers a working-class economic message — manufacturing, wages, and unions — arguing Democrats must deliver on cost of living.', source: S.gallego },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'An Iraq War veteran who prioritizes veterans\' health care, benefits, and toxic-exposure claims.', source: S.gallego },
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Backs boosting housing supply and cutting costs as a central affordability fight for Arizona families.', source: S.gallego },
      { topic: 'Support for Israel', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s security and its U.S. aid while backing humanitarian assistance and calling for civilian protection during the Gaza war.', source: S.gallego },
    ],
  },
  kaine: {
    roster: { name: 'Tim Kaine', office: 'U.S. Senator', state: 'Virginia', party: 'D', score: 60, icon: '🕊', issues: ['War Powers', 'Foreign Aid', 'Healthcare', 'Federal Workforce'] },
    label: 'Tim Kaine — 🕊 U.S. Senator (D-VA)',
    cards: [
      { topic: 'Israel Aid & War Powers', icon: '🕊', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'On Foreign Relations and Armed Services, Kaine supports Israel\'s defense but has pushed war-powers resolutions requiring congressional sign-off for wider Middle East conflict and pressed for conditions and humanitarian access.', source: S.kaine },
      { topic: 'Reclaiming War Powers', icon: '⚖️', pos: 'support', issueKey: 'restraint', issueStance: 'support',
        text: 'A leading advocate for reasserting Congress\'s constitutional authority over war, Kaine has forced votes to limit unauthorized military action against Iran and others.', source: S.kaine },
      { topic: 'Ukraine Aid', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Supports sustained military and economic aid to Ukraine as a check on Russian aggression, paired with oversight.', source: S.kaine },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A longtime advocate of a public insurance option and defending Affordable Care Act subsidies to lower premiums.', source: S.kaine },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Represents a large federal-worker state and has fought layoffs, return-to-office mandates, and cuts he argues harm services and Virginia\'s economy.', source: S.kaine },
    ],
  },
  schiff: {
    roster: { name: 'Adam Schiff', office: 'U.S. Senator', state: 'California', party: 'D', score: 58, icon: '🔎', issues: ['AI & Tech', 'Oversight', 'Foreign Policy', 'Housing'] },
    label: 'Adam Schiff — 🔎 U.S. Senator (D-CA)',
    cards: [
      { topic: 'AI & Tech Guardrails', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Schiff backs federal AI rules focused on transparency, deepfakes, and protecting workers and creators (a priority for California\'s entertainment industry), favoring guardrails over a hands-off approach.', source: S.schiff },
      { topic: 'Oversight & Democracy', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'A former House Intelligence chair, Schiff centers government accountability, ethics, and checks on executive power.', source: S.schiff },
      { topic: 'Israel Aid & Conditions', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s security and U.S. aid while backing humanitarian access and adherence to U.S. law on civilian harm during the Gaza war.', source: S.schiff },
      { topic: 'Healthcare Costs', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Backs expanding coverage and lowering premiums and drug costs as core affordability issues.', source: S.schiff },
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Pushes federal support to boost housing supply and address California\'s affordability and homelessness crisis.', source: S.schiff },
    ],
  },
  warner: {
    roster: { name: 'Mark Warner', office: 'Senate Intelligence Committee Vice Chair', state: 'Virginia', party: 'D', score: 60, icon: '🛰', issues: ['AI & Tech', 'Semiconductors', 'Digital Assets', 'National Security'] },
    label: 'Mark Warner — 🛰 Senate Intelligence Vice Chair (D-VA)',
    cards: [
      { topic: 'AI & National Security', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'A former tech entrepreneur and Intelligence vice chair, Warner backs AI and platform accountability — security testing, transparency, and child-safety rules — while warning about foreign-controlled apps.',
        evidence: 'Vice Chair of the Senate Select Committee on Intelligence.', source: S.intel },
      { topic: 'Semiconductors & China', icon: '💽', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'A principal author of the CHIPS and Science Act, Warner champions domestic semiconductor manufacturing and export controls to counter China.', source: S.warner },
      { topic: 'Crypto Regulation', icon: '🪙', pos: 'mixed', issueKey: 'crypto_cbdc', issueStance: 'mixed',
        text: 'Open to a regulated digital-asset framework but insistent on anti-money-laundering, sanctions, and consumer safeguards, taking a more cautious line than crypto\'s strongest boosters.', source: S.warner },
      { topic: 'National Security', icon: '🛰', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Supports robust intelligence capabilities and aid to allies including Ukraine, paired with oversight of surveillance authorities.', source: S.warner },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'From a large federal-employee state, has opposed abrupt workforce cuts and return-to-office mandates he argues disrupt government services.', source: S.warner },
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

console.log(`PolitiDex — National chairs & cabinet WAVE 3  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National chairs & cabinet · top-down federal wave 3 (July 2026) ───────────\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    tom_cole                : { name:'Tom Cole', office:'House Appropriations Committee Chair', state:'Oklahoma', party:'R', score:60, kept:0, broken:0, pending:0, icon:'🧾', issues:['Federal Appropriations','National Defense','Agriculture','Tribal Affairs'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterAnchor)) {
  const block = '\n    // National 13 — chairs/cabinet wave 3 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or anchor missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
