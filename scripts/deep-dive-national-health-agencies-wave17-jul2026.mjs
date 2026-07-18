#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: HEALTH-AGENCY HEADS + AI/ENERGY
// SENATORS + DEMOCRATIC COMMITTEE RANKING MEMBERS, WAVE 17 (July 2026).
// ---------------------------------------------------------------------------
// Building on the food/health Spotlights (MAHA food system, obesity/chronic
// disease, drug prices), this wave adds the health-agency heads who run the
// very policies those guides cover — including the FDA Commissioner behind the
// MAHA food agenda — paired with committee ranking members from the other side,
// including the anti-hunger and drug-pricing leaders. Balanced 5R / 5D:
//
//   • MEHMET OZ (mehmet_oz) — CMS Administrator (R): Medicare & Medicaid, drug
//     prices, chronic-disease prevention, and Medicaid reform.
//   • MARTY MAKARY (marty_makary) — FDA Commissioner (R): food additives (MAHA),
//     drug/device approval, nutrition, and medical transparency.
//   • JAY BHATTACHARYA (jay_bhattacharya) — NIH Director (R): research reform,
//     medical freedom, chronic-disease science, and public-health reform.
//   • MIKE ROUNDS (mike_rounds) — U.S. Senator (R-SD): AI & emerging tech,
//     defense & cyber, agriculture, and spending.
//   • KEVIN CRAMER (kevin_cramer) — U.S. Senator (R-ND): energy, infrastructure
//     & permitting, environmental regulation, and spending.
//   • JIM McGOVERN (jim_mcgovern) — U.S. Rep. (D-MA), Rules ranking member:
//     anti-hunger & nutrition, food as medicine, democracy, and human rights.
//   • BRENDAN BOYLE (brendan_boyle) — U.S. Rep. (D-PA), Budget ranking member:
//     the federal budget, Social Security & Medicare, taxes, and workers.
//   • RICK LARSEN (rick_larsen) — U.S. Rep. (D-WA), Transportation ranking
//     member: surface transportation, transit & rail, clean energy, and China.
//   • JAN SCHAKOWSKY (jan_schakowsky) — U.S. Rep. (D-IL): drug prices, consumer
//     protection & AI, healthcare, and Social Security.
//   • DIANA DeGETTE (diana_degette) — U.S. Rep. (D-CO): biomedical research,
//     abortion rights, drug prices, and gun safety.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Two-sided records
// (Oz/Makary on drug approval and prices, Rounds on AI, McGovern on foreign
// policy) are marked mixed and attributed. Positions are the documented public
// record; sources are official agency or member pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-health-agencies-wave17-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-health-agencies-wave17-jul2026.mjs --apply    # write
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
  cms:        { label: 'cms.gov', url: 'https://www.cms.gov/newsroom' },
  fda:        { label: 'fda.gov', url: 'https://www.fda.gov/news-events/fda-newsroom' },
  nih:        { label: 'nih.gov', url: 'https://www.nih.gov/news-events' },
  rounds:     { label: 'rounds.senate.gov', url: 'https://www.rounds.senate.gov/newsroom/press-releases' },
  cramer:     { label: 'cramer.senate.gov', url: 'https://www.cramer.senate.gov/news/press-releases' },
  mcgovern:   { label: 'mcgovern.house.gov', url: 'https://mcgovern.house.gov/news/' },
  boyle:      { label: 'boyle.house.gov', url: 'https://boyle.house.gov/media-center/press-releases' },
  larsen:     { label: 'larsen.house.gov', url: 'https://larsen.house.gov/media/press-releases' },
  schakowsky: { label: 'schakowsky.house.gov', url: 'https://schakowsky.house.gov/media/press-releases' },
  degette:    { label: 'degette.house.gov', url: 'https://degette.house.gov/media-center/press-releases' },
};

const NEW = {
  mehmet_oz: {
    roster: { name: 'Mehmet Oz', office: 'CMS Administrator', state: 'Federal', party: 'R', score: 55, icon: '💊', issues: ['Medicare & Medicaid', 'Drug Prices', 'Chronic Disease', 'Medicaid Reform'] },
    label: 'Mehmet Oz — 💊 CMS Administrator (R)',
    cards: [
      { topic: 'Medicare & Medicaid', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'As Administrator of the Centers for Medicare & Medicaid Services, Oz runs the programs covering Medicare, Medicaid, and the ACA marketplaces for tens of millions of Americans.',
        evidence: 'Administrator, Centers for Medicare & Medicaid Services (CMS).', source: S.cms },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'mixed', issueKey: 'health_drug_prices', issueStance: 'mixed',
        text: 'Backs lowering drug prices through transparency and "most-favored-nation" international reference pricing rather than the standard negotiation framework, drawing support and criticism from different sides.', source: S.cms },
      { topic: 'Chronic Disease & Prevention', icon: '🥗', pos: 'support', issueKey: 'health_balance', issueStance: 'support',
        text: 'A longtime wellness advocate, Oz emphasizes prevention, nutrition, and chronic-disease management as central to the "Make America Healthy Again" agenda.', source: S.cms },
      { topic: 'Medicaid Integrity & Work Requirements', icon: '🧾', pos: 'mixed', issueKey: 'healthcare_costs', issueStance: 'mixed',
        text: 'Backs Medicaid work requirements and eligibility and payment-integrity checks he says curb waste, which supporters call reform and critics warn could cut coverage.', source: S.cms },
    ],
  },
  marty_makary: {
    roster: { name: 'Marty Makary', office: 'FDA Commissioner', state: 'Federal', party: 'R', score: 56, icon: '🔬', issues: ['Food Additives', 'Drug Approval', 'Nutrition', 'Medical Freedom'] },
    label: 'Marty Makary — 🔬 FDA Commissioner (R)',
    cards: [
      { topic: 'Food Additives & Dyes (MAHA)', icon: '🍎', pos: 'support', issueKey: 'health_balance', issueStance: 'support',
        text: 'As FDA Commissioner, Makary is the regulator behind the "Make America Healthy Again" food agenda — moving to phase out petroleum-based synthetic food dyes and scrutinize additives.',
        evidence: 'Commissioner, U.S. Food and Drug Administration (FDA).', source: S.fda },
      { topic: 'Drug & Device Approval', icon: '💊', pos: 'mixed', issueKey: 'healthcare', issueStance: 'mixed',
        text: 'A surgeon and researcher, Makary pushes faster, more flexible approval pathways while stressing safety and rebuilding public trust in the agency.', source: S.fda },
      { topic: 'Nutrition & Chronic Disease', icon: '🥗', pos: 'support', issueKey: 'healthcare_costs', issueStance: 'support',
        text: 'Frames diet-driven chronic disease as a leading cost driver and champions nutrition and prevention over treating illness after the fact.', source: S.fda },
      { topic: 'Medical Transparency', icon: '🔎', pos: 'support', issueKey: 'medical_freedom', issueStance: 'support',
        text: 'A prominent critic of parts of the COVID-era response, Makary emphasizes transparency, open scientific debate, and skepticism of one-size-fits-all mandates.', source: S.fda },
    ],
  },
  jay_bhattacharya: {
    roster: { name: 'Jay Bhattacharya', office: 'NIH Director', state: 'Federal', party: 'R', score: 56, icon: '🧬', issues: ['NIH Research', 'Medical Freedom', 'Chronic Disease', 'Public Health'] },
    label: 'Jay Bhattacharya — 🧬 NIH Director (R)',
    cards: [
      { topic: 'NIH Research Reform', icon: '🔬', pos: 'mixed', issueKey: 'healthcare', issueStance: 'mixed',
        text: 'As Director of the National Institutes of Health, Bhattacharya is reshaping the agency’s research priorities and grant and overhead-cost policies — changes backers call reform and researchers warn could disrupt science.',
        evidence: 'Director, National Institutes of Health (NIH).', source: S.nih },
      { topic: 'Medical Freedom & Dissent', icon: '🗣', pos: 'support', issueKey: 'medical_freedom', issueStance: 'support',
        text: 'A co-author of the Great Barrington Declaration, Bhattacharya champions dissent in science and opposes what he calls the suppression of minority scientific views.', source: S.nih },
      { topic: 'Chronic-Disease Science (MAHA)', icon: '🥗', pos: 'support', issueKey: 'health_balance', issueStance: 'support',
        text: 'Backs redirecting research toward chronic disease, nutrition, and the drivers of long-term health central to the "Make America Healthy Again" agenda.', source: S.nih },
      { topic: 'Public-Health Reform', icon: '🏥', pos: 'mixed', issueKey: 'gov_regulation', issueStance: 'mixed',
        text: 'A critic of pandemic-era lockdowns and mandates, Bhattacharya argues for rebuilding public trust and a narrower, more cautious public-health role.', source: S.nih },
    ],
  },
  mike_rounds: {
    roster: { name: 'Mike Rounds', office: 'U.S. Senator', state: 'South Dakota', party: 'R', score: 56, icon: '🤖', issues: ['AI & Tech', 'Defense', 'Agriculture', 'Spending'] },
    label: 'Mike Rounds — 🤖 U.S. Senator (R-SD)',
    cards: [
      { topic: 'AI & Emerging Tech', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'A leader of the Senate’s bipartisan AI working group, Rounds backs U.S. AI leadership and investment while weighing targeted guardrails and national-security safeguards.',
        evidence: 'Member of the bipartisan Senate AI working group; Armed Services Committee.', source: S.rounds },
      { topic: 'Defense & Cyber', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A former governor on Armed Services, Rounds backs a strong military, nuclear modernization, and cyber and space defense.', source: S.rounds },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From South Dakota, backs the farm safety net, cattle producers, and agricultural exports.', source: S.rounds },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal conservative who backs spending restraint and the 2017 tax cuts.', source: S.rounds },
    ],
  },
  kevin_cramer: {
    roster: { name: 'Kevin Cramer', office: 'U.S. Senator', state: 'North Dakota', party: 'R', score: 55, icon: '🛢', issues: ['Energy', 'Infrastructure', 'Regulation', 'Spending'] },
    label: 'Kevin Cramer — 🛢 U.S. Senator (R-ND)',
    cards: [
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'On Environment & Public Works, Cramer strongly backs oil, gas, and coal production, pipelines, and North Dakota energy jobs.',
        evidence: 'Member of the Senate Environment & Public Works and Armed Services committees.', source: S.cramer },
      { topic: 'Infrastructure & Permitting', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'A lead voice for permitting reform, Cramer backs faster approvals for roads, bridges, pipelines, and transmission.', source: S.cramer },
      { topic: 'Environmental Regulation', icon: '📉', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Backs rolling back federal environmental rules he argues raise energy costs and slow projects.', source: S.cramer },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A fiscal conservative who backs spending restraint and the 2017 tax cuts.', source: S.cramer },
    ],
  },
  jim_mcgovern: {
    roster: { name: 'Jim McGovern', office: 'U.S. Representative', state: 'Massachusetts', party: 'D', score: 57, icon: '🍎', issues: ['Anti-Hunger', 'Nutrition', 'Democracy', 'Human Rights'] },
    label: 'Jim McGovern — 🍎 U.S. Representative (D-MA)',
    cards: [
      { topic: 'Anti-Hunger & Nutrition (SNAP)', icon: '🍎', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'The House’s leading anti-hunger voice, McGovern defends SNAP and food and nutrition assistance and works to end hunger.',
        evidence: 'Ranking member of the House Rules Committee; longtime anti-hunger leader.', source: S.mcgovern },
      { topic: 'Food as Medicine', icon: '🥗', pos: 'support', issueKey: 'health_balance', issueStance: 'support',
        text: 'Champions "food as medicine" — connecting nutrition to health outcomes and lower long-term costs.', source: S.mcgovern },
      { topic: 'House Rules & Democracy', icon: '🏛', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: 'As Rules ranking member, McGovern defends regular order, floor debate, and democratic institutions.', source: S.mcgovern },
      { topic: 'Human Rights & Foreign Policy', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Co-chair of the Tom Lantos Human Rights Commission, he presses human rights abroad and conditions on some military aid.', source: S.mcgovern },
    ],
  },
  brendan_boyle: {
    roster: { name: 'Brendan Boyle', office: 'U.S. Representative', state: 'Pennsylvania', party: 'D', score: 57, icon: '🧾', issues: ['Federal Budget', 'Social Security', 'Taxes', 'Workers'] },
    label: 'Brendan Boyle — 🧾 U.S. Representative (D-PA)',
    cards: [
      { topic: 'Federal Budget & Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: 'As Budget Committee ranking member, Boyle defends domestic and safety-net spending and opposes deep discretionary cuts.',
        evidence: 'Ranking member of the House Budget Committee; Ways & Means Committee.', source: S.boyle },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Opposes benefit cuts and backs protecting and strengthening Social Security and Medicare.', source: S.boyle },
      { topic: 'Taxes & Fairness', icon: '💵', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'On Ways & Means, backs middle-class tax relief and higher taxes on top earners and corporations.', source: S.boyle },
      { topic: 'Manufacturing & Workers', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'From Philadelphia, champions union workers, manufacturing, and Buy America.', source: S.boyle },
    ],
  },
  rick_larsen: {
    roster: { name: 'Rick Larsen', office: 'U.S. Representative', state: 'Washington', party: 'D', score: 57, icon: '🚧', issues: ['Transportation', 'Transit & Rail', 'Clean Energy', 'China'] },
    label: 'Rick Larsen — 🚧 U.S. Representative (D-WA)',
    cards: [
      { topic: 'Surface Transportation & Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'As ranking member of Transportation & Infrastructure, Larsen backs robust funding for roads, bridges, aviation, and ports.',
        evidence: 'Ranking member of the House Transportation & Infrastructure Committee.', source: S.larsen },
      { topic: 'Public Transit & Rail', icon: '🚆', pos: 'support', issueKey: 'transit', issueStance: 'support',
        text: 'Backs strong federal investment in public transit, passenger rail, and ferries.', source: S.larsen },
      { topic: 'Clean Energy & Climate', icon: '🌿', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'From Washington State, backs clean energy, aviation decarbonization, and climate action.', source: S.larsen },
      { topic: 'U.S.-China Relations', icon: '🇨🇳', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'A co-chair of the U.S.-China Working Group, Larsen backs firm competition alongside dialogue and trade ties.', source: S.larsen },
    ],
  },
  jan_schakowsky: {
    roster: { name: 'Jan Schakowsky', office: 'U.S. Representative', state: 'Illinois', party: 'D', score: 57, icon: '💊', issues: ['Drug Prices', 'Consumer Protection', 'Healthcare', 'Social Security'] },
    label: 'Jan Schakowsky — 💊 U.S. Representative (D-IL)',
    cards: [
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'A leading consumer advocate, Schakowsky pushes to lower prescription-drug prices, expand Medicare negotiation, and cap out-of-pocket costs.',
        evidence: 'Member of the House Energy & Commerce Committee.', source: S.schakowsky },
      { topic: 'Consumer Protection & AI', icon: '🛡', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Chairs consumer-protection efforts and backs data privacy, online safety, and guardrails on AI and Big Tech.', source: S.schakowsky },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A supporter of a public option and Medicare expansion and of protecting the ACA.', source: S.schakowsky },
      { topic: 'Social Security', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Backs expanding, not cutting, Social Security benefits.', source: S.schakowsky },
    ],
  },
  diana_degette: {
    roster: { name: 'Diana DeGette', office: 'U.S. Representative', state: 'Colorado', party: 'D', score: 57, icon: '⚕️', issues: ['Biomedical Research', 'Abortion Rights', 'Drug Prices', 'Gun Safety'] },
    label: 'Diana DeGette — ⚕️ U.S. Representative (D-CO)',
    cards: [
      { topic: 'Biomedical Research & Cures', icon: '🔬', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A lead author of the 21st Century Cures Act, DeGette champions biomedical research, NIH funding, and speeding treatments to patients.',
        evidence: 'Senior member of the House Energy & Commerce Committee.', source: S.degette },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Co-chair of the Pro-Choice Caucus, DeGette leads efforts to protect abortion access and reproductive rights.', source: S.degette },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Backs lowering prescription-drug costs and Medicare drug-price negotiation.', source: S.degette },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'A longtime gun-safety advocate, DeGette backs universal background checks and limits on high-capacity magazines.', source: S.degette },
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

console.log(`PolitiDex — National health-agency heads, AI/energy senators & Democratic ranking members WAVE 17  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National health-agency heads (CMS/FDA/NIH), AI/energy senators & Democratic committee ranking members · top-down federal wave 17 (Jul 2026) ─\n' +
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
  const block = '\n    // National — health-agency heads (CMS/FDA/NIH), AI/energy senators + Democratic ranking members, wave 17 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
