#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: REMAINING COMMITTEE CHAIRS &
// MARQUEE MEMBERS, WAVE 6 (July 2026) — continuing the top-down push after
// waves 1-5.
// ---------------------------------------------------------------------------
// Waves 1-5 built the President/VP, the four floor leaders, and the chairs and
// ranking members of the highest-profile Senate and House committees. This wave
// adds the last of the domain-owning committee chairs, a key ranking member, and
// marquee senators from both parties — each mapped to the recent Issue Spotlights
// (Israel aid, border security, tariffs, government spending, energy, AI, crypto,
// and trust in institutions):
//
//   • JOHN BOOZMAN (boozman) — Chair, Senate Agriculture (R-AR): the Farm Bill,
//     SNAP, agricultural trade and tariffs, biofuels, and the border.
//   • BILL CASSIDY (cassidy) — Chair, Senate HELP (R-LA), a physician: a
//     bipartisan Social Security solvency plan, market-based healthcare, drug
//     prices, and energy.
//   • SAM GRAVES (sam_graves) — Chair, House Transportation & Infrastructure
//     (R-MO): infrastructure, permitting reform, aviation safety, and waterways.
//   • GLENN THOMPSON (glenn_thompson) — Chair, House Agriculture (R-PA): the Farm
//     Bill, SNAP, rural broadband, and biofuels.
//   • JERRY MORAN (jerry_moran) — Chair, Senate Veterans' Affairs (R-KS):
//     veterans, appropriations, rural healthcare, and foreign policy.
//   • ANGIE CRAIG (angie_craig) — Ranking Member, House Agriculture (D-MN): the
//     Democratic counterpart on the Farm Bill, biofuels, ag trade, and SNAP.
//   • TAMMY BALDWIN (tammy_baldwin) — U.S. Senator (D-WI): Buy America and
//     manufacturing, trade, healthcare, and drug prices.
//   • CATHERINE CORTEZ MASTO (cortez_masto) — U.S. Senator (D-NV): the border,
//     digital assets and banking, housing, and Nevada clean energy.
//
// Bruce Westerman (House Natural Resources chair) and Jon Ossoff (D-GA) already
// carry full sourced records in the app and are intentionally NOT rebuilt here
// (CONTENT_STYLE.md non-duplication); they are only wired into the spotlights.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided records are marked mixed and attributed. Positions are the
// documented public record; quotes only where genuinely on the record, otherwise
// paraphrased. Sources are official member/committee pages, congress.gov, and
// reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-chairs-marquee-wave6-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-chairs-marquee-wave6-jul2026.mjs --apply    # write
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
  senAg:     { label: 'Senate Agriculture, Nutrition & Forestry Committee', url: 'https://www.agriculture.senate.gov/' },
  boozman:   { label: 'boozman.senate.gov', url: 'https://www.boozman.senate.gov/public/index.cfm/press-releases' },
  help:      { label: 'Senate Health, Education, Labor & Pensions Committee', url: 'https://www.help.senate.gov/' },
  cassidy:   { label: 'cassidy.senate.gov', url: 'https://www.cassidy.senate.gov/newsroom/press-releases' },
  houseTI:   { label: 'House Transportation & Infrastructure Committee', url: 'https://transportation.house.gov/' },
  graves:    { label: 'graves.house.gov', url: 'https://graves.house.gov/news/documentquery.aspx?DocumentTypeID=2657' },
  houseAg:   { label: 'House Agriculture Committee', url: 'https://agriculture.house.gov/' },
  gtthompson:{ label: 'thompson.house.gov', url: 'https://thompson.house.gov/media/press-releases' },
  svac:      { label: "Senate Veterans' Affairs Committee", url: 'https://www.veterans.senate.gov/' },
  moran:     { label: 'moran.senate.gov', url: 'https://www.moran.senate.gov/public/index.cfm/news-releases' },
  houseAgDem:{ label: 'House Agriculture Committee Democrats', url: 'https://agriculture-democrats.house.gov/' },
  craig:     { label: 'craig.house.gov', url: 'https://craig.house.gov/media/press-releases' },
  baldwin:   { label: 'baldwin.senate.gov', url: 'https://www.baldwin.senate.gov/news/press-releases' },
  cortez:    { label: 'cortezmasto.senate.gov', url: 'https://www.cortezmasto.senate.gov/news/press-releases/' },
};

const NEW = {
  boozman: {
    roster: { name: 'John Boozman', office: 'Senate Agriculture Chair', state: 'Arkansas', party: 'R', score: 57, icon: '🌾', issues: ['Farm Bill', 'Agriculture & Trade', 'SNAP', 'Biofuels'] },
    label: 'John Boozman — 🌾 Senate Agriculture Chair (R-AR)',
    cards: [
      { topic: 'Farm Bill & Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "Chair of the Senate Agriculture Committee, Boozman has led work to reauthorize the Farm Bill, prioritizing the farm safety net, crop insurance, and support for the row-crop producers of Arkansas and the Delta.",
        evidence: 'Chairman of the Senate Committee on Agriculture, Nutrition & Forestry.', source: S.senAg },
      { topic: 'Agricultural Trade & Tariffs', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: "Backs opening export markets for U.S. farm goods and has warned that retaliatory tariffs can hit farmers, while supporting a tougher line against practices he calls unfair trade.", source: S.boozman },
      { topic: 'SNAP & Nutrition', icon: '🍎', pos: 'mixed', issueKey: 'family_support', issueStance: 'mixed',
        text: "As Agriculture chair he oversees SNAP, backing its nutrition role while pressing for stronger work requirements and program integrity that supporters call accountability and critics warn could cut enrollment.", source: S.senAg },
      { topic: 'Biofuels & Homegrown Energy', icon: '🌽', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Supports biofuels such as ethanol and biodiesel and year-round E15 sales, framing them as a boost for farm income and domestic energy.", source: S.boozman },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports stronger border enforcement — more agents and barriers — and curbing illegal crossings and fentanyl trafficking.", source: S.boozman },
    ],
  },
  cassidy: {
    roster: { name: 'Bill Cassidy', office: 'Senate HELP Committee Chair', state: 'Louisiana', party: 'R', score: 58, icon: '⚕️', issues: ['Social Security', 'Healthcare', 'Drug Prices', 'Energy'] },
    label: 'Bill Cassidy — ⚕️ Senate HELP Committee Chair (R-LA)',
    cards: [
      { topic: 'Social Security Solvency', icon: '🧾', pos: 'mixed', issueKey: 'social_security', issueStance: 'mixed',
        text: "A physician who chairs the HELP Committee, Cassidy has floated a bipartisan idea — developed with Senator Angus King — to shore up Social Security through a separate investment fund, an approach he argues avoids benefit cuts while skeptics question the market risk.",
        evidence: 'Chairman of the Senate Health, Education, Labor & Pensions Committee.', source: S.cassidy },
      { topic: 'Market-Based Healthcare', icon: '🏥', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: "Backs price transparency, competition, and site-neutral payments to lower health-care costs rather than expanding a single-payer system.", source: S.cassidy },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'mixed', issueKey: 'health_drug_prices', issueStance: 'mixed',
        text: "Has pushed to rein in pharmacy-benefit managers and increase transparency in drug pricing, while opposing approaches he says would chill medical innovation.", source: S.cassidy },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "From Louisiana, supports expanded oil, gas, and LNG exports and a permitting overhaul, framing domestic energy as jobs and security.", source: S.cassidy },
      { topic: 'An Independent Vote', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: "In 2021 Cassidy was one of seven Republican senators who voted to convict President Trump at his second impeachment trial, a break with most of his colleagues that he defended on the constitutional record.", source: S.cassidy },
    ],
  },
  sam_graves: {
    roster: { name: 'Sam Graves', office: 'House Transportation & Infrastructure Chair', state: 'Missouri', party: 'R', score: 57, icon: '🚧', issues: ['Infrastructure', 'Permitting', 'Aviation', 'Waterways'] },
    label: 'Sam Graves — 🚧 House Transportation & Infrastructure Chair (R-MO)',
    cards: [
      { topic: 'Infrastructure & Highways', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: "Chair of the House Transportation & Infrastructure Committee, Graves focuses on roads, bridges, and surface-transportation reauthorization funded through the Highway Trust Fund, favoring formula dollars to states over new federal mandates.",
        evidence: 'Chairman of the House Committee on Transportation & Infrastructure.', source: S.houseTI },
      { topic: 'Permitting Reform', icon: '📋', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: "Pushes to speed environmental reviews and cut the permitting delays he argues stall roads, bridges, and energy projects.", source: S.graves },
      { topic: 'Aviation Safety & the FAA', icon: '✈️', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: "A licensed pilot, Graves led FAA reauthorization work on air-traffic-controller staffing, modernization, and aviation safety.", source: S.houseTI },
      { topic: 'Inland Waterways', icon: '🚢', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: "Champions locks, dams, and inland waterways critical to moving Missouri and Midwest farm goods to market.", source: S.graves },
    ],
  },
  glenn_thompson: {
    roster: { name: 'Glenn Thompson', office: 'House Agriculture Committee Chair', state: 'Pennsylvania', party: 'R', score: 57, icon: '🌾', issues: ['Farm Bill', 'SNAP', 'Rural Broadband', 'Biofuels'] },
    label: 'Glenn Thompson — 🌾 House Agriculture Committee Chair (R-PA)',
    cards: [
      { topic: 'Farm Bill & Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "Known as 'GT,' Thompson chairs the House Agriculture Committee and has led its Farm Bill reauthorization, emphasizing the farm safety net, crop insurance, and forestry.",
        evidence: 'Chairman of the House Committee on Agriculture.', source: S.houseAg },
      { topic: 'SNAP & Nutrition', icon: '🍎', pos: 'mixed', issueKey: 'family_support', issueStance: 'mixed',
        text: "Oversees SNAP as part of the Farm Bill, backing nutrition aid while supporting work requirements and program-integrity changes that critics say could reduce enrollment.", source: S.houseAg },
      { topic: 'Rural Broadband', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: "Champions expanding rural broadband and precision-agriculture connectivity across farm country.", source: S.gtthompson },
      { topic: 'Biofuels', icon: '🌽', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Supports biofuels and higher ethanol blends as support for farm income and domestic energy.", source: S.gtthompson },
      { topic: 'Career & Technical Education', icon: '🛠', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: "A longtime advocate for career and technical education and workforce training as a path to good jobs.", source: S.gtthompson },
    ],
  },
  jerry_moran: {
    roster: { name: 'Jerry Moran', office: "Senate Veterans' Affairs Chair", state: 'Kansas', party: 'R', score: 58, icon: '🎖', issues: ['Veterans', 'Appropriations', 'Rural Healthcare', 'Agriculture'] },
    label: "Jerry Moran — 🎖 Senate Veterans' Affairs Chair (R-KS)",
    cards: [
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "Chair of the Senate Veterans' Affairs Committee, Moran focuses on VA health-care access, implementing the PACT Act for toxic-exposure benefits, and veteran suicide prevention.",
        evidence: "Chairman of the Senate Committee on Veterans' Affairs.", source: S.svac },
      { topic: 'Appropriations & Spending', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: "A senior appropriator, Moran backs funding for defense, veterans, and rural priorities while supporting restraint on overall spending and the debt.", source: S.moran },
      { topic: 'Rural Healthcare', icon: '🏥', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: "Focuses on keeping rural hospitals open, expanding telehealth, and health-care access across rural Kansas.", source: S.moran },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From a leading farm state, supports the farm safety net, crop insurance, and agricultural exports.", source: S.moran },
      { topic: 'Foreign Policy & Defense', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "Supports a strong national defense and aid to Israel, and weighs broader foreign commitments case by case.", source: S.moran },
    ],
  },
  angie_craig: {
    roster: { name: 'Angie Craig', office: 'House Agriculture Ranking Member', state: 'Minnesota', party: 'D', score: 57, icon: '🌾', issues: ['Farm Bill', 'Biofuels', 'Ag Trade', 'SNAP'] },
    label: 'Angie Craig — 🌾 House Agriculture Ranking Member (D-MN)',
    cards: [
      { topic: 'Farm Bill & Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "The top Democrat on the House Agriculture Committee, Craig works toward a bipartisan Farm Bill that protects crop insurance and the farm safety net alongside nutrition programs.",
        evidence: 'Ranking Member of the House Committee on Agriculture.', source: S.houseAgDem },
      { topic: 'Biofuels & Ethanol', icon: '🌽', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "From Minnesota, Craig champions biofuels, year-round E15, and homegrown energy as a boost for farmers and lower fuel costs.", source: S.craig },
      { topic: 'Agricultural Trade', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: "Backs expanding export markets for Minnesota farm and food products and has warned that tariff retaliation can hurt growers.", source: S.craig },
      { topic: 'SNAP & Nutrition', icon: '🍎', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: "Defends SNAP nutrition assistance against deep cuts, arguing it keeps food on the table for working families and children.", source: S.houseAgDem },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: "Has pushed to lower prescription-drug and insulin costs for consumers.", source: S.craig },
    ],
  },
  tammy_baldwin: {
    roster: { name: 'Tammy Baldwin', office: 'U.S. Senator', state: 'Wisconsin', party: 'D', score: 58, icon: '🏭', issues: ['Buy America', 'Manufacturing', 'Healthcare', 'Drug Prices'] },
    label: 'Tammy Baldwin — 🏭 U.S. Senator (D-WI)',
    cards: [
      { topic: 'Buy America & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "An author of Buy America(n) provisions, Baldwin pushes to require U.S.-made materials in federally funded projects and to support Wisconsin manufacturing.", source: S.baldwin },
      { topic: 'Trade', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: "Favors a worker-focused trade policy — skeptical of deals she argues cost manufacturing jobs, while backing enforcement and export markets for Wisconsin goods.", source: S.baldwin },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Defends the ACA and Medicaid and works to expand coverage and mental-health and rural care.", source: S.baldwin },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: "A supporter of Medicare drug-price negotiation and of capping insulin and out-of-pocket costs.", source: S.baldwin },
      { topic: 'Dairy & Agriculture', icon: '🧀', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "Champions Wisconsin dairy and farm interests, including exports and fair pricing for producers.", source: S.baldwin },
    ],
  },
  cortez_masto: {
    roster: { name: 'Catherine Cortez Masto', office: 'U.S. Senator', state: 'Nevada', party: 'D', score: 58, icon: '⚖️', issues: ['Border', 'Digital Assets', 'Housing', 'Clean Energy'] },
    label: 'Catherine Cortez Masto — ⚖️ U.S. Senator (D-NV)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: "A former Nevada attorney general, Cortez Masto backs more border technology, agents, and fentanyl interdiction alongside orderly asylum processing and comprehensive immigration reform.", source: S.cortez },
      { topic: 'Digital Assets & Banking', icon: '🪙', pos: 'mixed', issueKey: 'crypto_cbdc', issueStance: 'mixed',
        text: "On the Banking Committee, she supports clear rules for digital assets paired with strong consumer and anti-money-laundering safeguards, wary of frameworks she views as too light-touch.", source: S.cortez },
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing', issueStance: 'support',
        text: "Pushes to expand housing supply and affordability — a top concern in fast-growing Nevada — including releasing some federal land for housing.", source: S.cortez },
      { topic: 'Nevada Clean Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Backs Nevada's geothermal, solar, and lithium development and the clean-energy jobs they bring, while supporting grid reliability.", source: S.cortez },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: "As a former attorney general, focuses on consumer protection, fraud, and holding financial institutions accountable.", source: S.cortez },
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

console.log(`PolitiDex — National remaining chairs & marquee members WAVE 6  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National remaining committee chairs & marquee members · top-down federal wave 6 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — remaining committee chairs + marquee members, wave 6 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
