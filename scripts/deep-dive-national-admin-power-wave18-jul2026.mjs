#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: ADMINISTRATION POWER PLAYERS &
// INFLUENTIAL MEMBERS, WAVE 18 (July 2026) — after waves 1-17.
// ---------------------------------------------------------------------------
// The highest-leverage federal figures still missing were the administration's
// non-secretary power players who drive the very Spotlights we've built — the
// Border Czar, the trade/tariff architects, the Ukraine peace envoy — paired
// with influential members from both parties on China, Israel, defense, and
// the working class. Balanced 5R / 5D (one deepened):
//
//   • TOM HOMAN (tom_homan) — White House Border Czar (R): border security,
//     mass deportations, fentanyl and cartels, and enforcement.
//   • PETER NAVARRO (peter_navarro) — Sr. Counselor for Trade & Manufacturing
//     (R): tariffs, reshoring, China trade, and trade deficits.
//   • STEPHEN MIRAN (stephen_miran) — Chair, Council of Economic Advisers (R):
//     tariffs and trade rebalancing, the dollar, deregulation, and tax cuts.
//   • KEITH KELLOGG (keith_kellogg) — Special Envoy for Ukraine & Russia (R):
//     a negotiated settlement, defense and deterrence, Israel, and NATO.
//   • DAN CRENSHAW (dan_crenshaw) — U.S. Rep. (R-TX): national defense and
//     Ukraine aid, energy, the border, and veterans.
//   • RAJA KRISHNAMOORTHI (raja_krishnamoorthi) — U.S. Rep. (D-IL), CCP Select
//     ranking member: countering China, AI and tech, high-skilled immigration,
//     and workers.
//   • JOSH GOTTHEIMER (josh_gottheimer) — U.S. Rep. (D-NJ), Problem Solvers:
//     Israel and the alliance, bipartisan fiscal deals, SALT/taxes, and Iran.
//   • SETH MOULTON (seth_moulton) — U.S. Rep. (D-MA), veteran: defense and
//     readiness, veterans and mental health, Ukraine aid, and AI.
//   • MARIE GLUESENKAMP PEREZ (marie_gluesenkamp_perez) — U.S. Rep. (D-WA):
//     the working class and manufacturing, right to repair, fiscal moderation,
//     and border security.
//   • JON OSSOFF (jon_ossoff) — U.S. Senator (D-GA): DEEPENED — already carried
//     curated stances and Spotlight rows but was missing from the static roster
//     and the public directory. This adds his CMP_DATA row and PROFILES seed so
//     he is browsable/searchable like any other profile.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured
// records (Kellogg on a settlement, Gottheimer/Perez on fiscal deals, Homan on
// legal vs. illegal immigration) are marked mixed and attributed. Sources are
// official White House, agency, or member pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-admin-power-wave18-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-admin-power-wave18-jul2026.mjs --apply    # write
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
  wh:       { label: 'whitehouse.gov', url: 'https://www.whitehouse.gov/' },
  cea:      { label: 'whitehouse.gov/cea', url: 'https://www.whitehouse.gov/cea/' },
  state:    { label: 'state.gov', url: 'https://www.state.gov/' },
  crenshaw: { label: 'crenshaw.house.gov', url: 'https://crenshaw.house.gov/news/' },
  raja:     { label: 'krishnamoorthi.house.gov', url: 'https://krishnamoorthi.house.gov/media/press-releases' },
  gottheimer:{ label: 'gottheimer.house.gov', url: 'https://gottheimer.house.gov/news/' },
  moulton:  { label: 'moulton.house.gov', url: 'https://moulton.house.gov/media-center/press-releases' },
  mgp:      { label: 'gluesenkampperez.house.gov', url: 'https://gluesenkampperez.house.gov/media/press-releases' },
};

const NEW = {
  tom_homan: {
    roster: { name: 'Tom Homan', office: 'White House Border Czar', state: 'Federal', party: 'R', score: 54, icon: '🛂', issues: ['Border Security', 'Deportations', 'Fentanyl & Cartels', 'Enforcement'] },
    label: 'Tom Homan — 🛂 White House Border Czar (R)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'As the White House "Border Czar," Homan directs the administration’s border crackdown, championing strict enforcement, more agents, and an end to catch-and-release.',
        evidence: 'White House Border Czar; former Acting Director of ICE.', source: S.wh },
      { topic: 'Mass Deportations & ICE', icon: '🚨', pos: 'support', issueKey: 'deportations', issueStance: 'support',
        text: 'The public face of the mass-deportation effort, Homan backs large-scale interior enforcement, worksite raids, and removing those in the country illegally.', source: S.wh },
      { topic: 'Fentanyl & Cartels', icon: '💊', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'Ties border enforcement to stopping fentanyl and dismantling smuggling cartels, backing designating cartels as terrorist organizations.', source: S.wh },
      { topic: 'Legal vs. Illegal Immigration', icon: '⚖️', pos: 'mixed', issueKey: 'immig_legal', issueStance: 'mixed',
        text: 'Says he targets illegal immigration and public-safety threats first while stating he is not against legal, lawful immigration — a distinction critics dispute in practice.', source: S.wh },
    ],
  },
  peter_navarro: {
    roster: { name: 'Peter Navarro', office: 'Senior Counselor for Trade & Manufacturing', state: 'Federal', party: 'R', score: 54, icon: '🏭', issues: ['Tariffs', 'Reshoring', 'China Trade', 'Trade Deficits'] },
    label: 'Peter Navarro — 🏭 Senior Counselor for Trade & Manufacturing (R)',
    cards: [
      { topic: 'Tariffs & China Trade', icon: '🇨🇳', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: 'A chief architect of the tariff agenda, Navarro backs steep tariffs on China and other trading partners to counter what he calls unfair trade and protect U.S. industry.',
        evidence: 'Senior Counselor to the President for Trade and Manufacturing.', source: S.wh },
      { topic: 'Reshoring & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: 'Argues tariffs and industrial policy will bring factories and supply chains back to the United States.', source: S.wh },
      { topic: 'Executive Tariff Authority', icon: '⚖️', pos: 'support', issueKey: 'tariffs_authority', issueStance: 'support',
        text: 'Defends broad presidential authority to impose tariffs quickly without waiting on Congress.', source: S.wh },
      { topic: 'Trade Deficits & Growth', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Frames trade deficits as a core economic threat and argues the tariff strategy will boost growth and revenue.', source: S.wh },
    ],
  },
  stephen_miran: {
    roster: { name: 'Stephen Miran', office: 'Chair, Council of Economic Advisers', state: 'Federal', party: 'R', score: 55, icon: '📈', issues: ['Tariffs & Trade', 'The Dollar', 'Deregulation', 'Tax Cuts'] },
    label: 'Stephen Miran — 📈 Chair, Council of Economic Advisers (R)',
    cards: [
      { topic: 'Tariffs & Trade Rebalancing', icon: '⚖️', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: 'As CEA Chair, Miran defends tariffs as a tool to rebalance trade and argues, in his writing, that they need not drive lasting inflation.',
        evidence: 'Chair of the White House Council of Economic Advisers.', source: S.cea },
      { topic: 'The Dollar & Trade Strategy', icon: '💵', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Author of a widely-discussed essay on restructuring global trade and the dollar’s role to favor U.S. manufacturing and growth.', source: S.cea },
      { topic: 'Deregulation & Growth', icon: '📉', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Backs cutting federal regulation to lift investment, energy output, and economic growth.', source: S.cea },
      { topic: 'Tax Cuts & Investment', icon: '🧾', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supports extending the 2017 tax cuts and pro-investment tax policy as central to the growth agenda.', source: S.cea },
    ],
  },
  keith_kellogg: {
    roster: { name: 'Keith Kellogg', office: 'Special Envoy for Ukraine & Russia', state: 'Federal', party: 'R', score: 55, icon: '🎖', issues: ['Ukraine-Russia', 'Defense', 'Israel', 'NATO'] },
    label: 'Keith Kellogg — 🎖 Special Envoy for Ukraine & Russia (R)',
    cards: [
      { topic: 'Ukraine-Russia Settlement', icon: '🕊', pos: 'mixed', issueKey: 'america_first_fp', issueStance: 'mixed',
        text: 'As special envoy, the retired general presses a negotiated end to the war — using aid and pressure as leverage on both sides rather than open-ended support or abandonment.',
        evidence: 'Special Presidential Envoy for Ukraine and Russia; retired U.S. Army lieutenant general.', source: S.state },
      { topic: 'Defense & Deterrence', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A "peace through strength" advocate, Kellogg backs a strong U.S. military and credible deterrence.', source: S.state },
      { topic: 'Israel & the Middle East', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Supports Israel and the U.S. alliance and a hard line on Iran.', source: S.state },
      { topic: 'NATO & Burden-Sharing', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Backs the NATO alliance while pushing European allies to spend far more on their own defense.', source: S.state },
    ],
  },
  dan_crenshaw: {
    roster: { name: 'Dan Crenshaw', office: 'U.S. Representative', state: 'Texas', party: 'R', score: 55, icon: '🎖', issues: ['Defense', 'Energy', 'Border', 'Veterans'] },
    label: 'Dan Crenshaw — 🎖 U.S. Representative (R-TX)',
    cards: [
      { topic: 'National Defense & Ukraine', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A former Navy SEAL, Crenshaw backs a strong military and has been an outspoken Republican defender of continued military aid to Ukraine.',
        evidence: 'Member of the House Ways & Means and Intelligence committees; former Navy SEAL.', source: S.crenshaw },
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'From Houston, strongly backs oil and gas, nuclear, and expanding American energy production.', source: S.crenshaw },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement, more agents and technology, and stopping fentanyl trafficking.', source: S.crenshaw },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A wounded combat veteran, Crenshaw focuses on veterans’ care, mental health, and readiness.', source: S.crenshaw },
    ],
  },
  raja_krishnamoorthi: {
    roster: { name: 'Raja Krishnamoorthi', office: 'U.S. Representative', state: 'Illinois', party: 'D', score: 57, icon: '🇨🇳', issues: ['China & CCP', 'AI & Tech', 'Immigration', 'Workers'] },
    label: 'Raja Krishnamoorthi — 🇨🇳 U.S. Representative (D-IL)',
    cards: [
      { topic: 'Countering China & the CCP', icon: '🇨🇳', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'As ranking member of the Select Committee on the Chinese Communist Party, Krishnamoorthi backs firm competition with China, defending Taiwan, and curbing CCP influence and tech theft.',
        evidence: 'Ranking member of the House Select Committee on the CCP.', source: S.raja },
      { topic: 'AI & Emerging Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Backs U.S. leadership in AI and semiconductors alongside guardrails, export controls, and protections against misuse.', source: S.raja },
      { topic: 'High-Skilled Immigration', icon: '🛂', pos: 'support', issueKey: 'immig_legal', issueStance: 'support',
        text: 'An immigrant himself, Krishnamoorthi backs high-skilled immigration and legal pathways to keep U.S. talent competitive.', source: S.raja },
      { topic: 'Manufacturing & Workers', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Champions domestic manufacturing, small business, and rebuilding U.S. supply chains.', source: S.raja },
    ],
  },
  josh_gottheimer: {
    roster: { name: 'Josh Gottheimer', office: 'U.S. Representative', state: 'New Jersey', party: 'D', score: 57, icon: '🤝', issues: ['Israel', 'Bipartisan Fiscal', 'SALT & Taxes', 'National Security'] },
    label: 'Josh Gottheimer — 🤝 U.S. Representative (D-NJ)',
    cards: [
      { topic: 'Israel & the Alliance', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A leading pro-Israel Democrat, Gottheimer is a staunch backer of U.S. security aid and the U.S.-Israel alliance.',
        evidence: 'Co-chair of the bipartisan Problem Solvers Caucus.', source: S.gottheimer },
      { topic: 'Bipartisan Fiscal Deals', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A Problem Solvers co-chair and self-styled fiscal moderate, he brokers bipartisan spending deals and resists both deep cuts and unrestrained spending.', source: S.gottheimer },
      { topic: 'SALT & Middle-Class Taxes', icon: '🧾', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'The leading champion of restoring the state-and-local-tax (SALT) deduction for his high-tax district.', source: S.gottheimer },
      { topic: 'Iran & National Security', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A national-security hawk, Gottheimer backs a hard line on Iran and strong counterterrorism.', source: S.gottheimer },
    ],
  },
  seth_moulton: {
    roster: { name: 'Seth Moulton', office: 'U.S. Representative', state: 'Massachusetts', party: 'D', score: 57, icon: '🎖', issues: ['Defense', 'Veterans', 'Ukraine', 'AI & Tech'] },
    label: 'Seth Moulton — 🎖 U.S. Representative (D-MA)',
    cards: [
      { topic: 'National Defense & Readiness', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A Marine veteran of Iraq on Armed Services, Moulton backs a strong, modernized military and clear-eyed national-security strategy.',
        evidence: 'Member of the House Armed Services Committee; Marine Corps veteran.', source: S.moulton },
      { topic: 'Veterans & Mental Health', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A veterans’ advocate who has spoken openly about his own PTSD, Moulton champions veterans’ care and mental health.', source: S.moulton },
      { topic: 'Ukraine Aid', icon: '🇺🇦', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Backs robust military aid to Ukraine and standing with NATO allies against Russian aggression.', source: S.moulton },
      { topic: 'AI & Emerging Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Focuses on AI, autonomous systems, and their national-security implications, backing guardrails and U.S. leadership.', source: S.moulton },
    ],
  },
  marie_gluesenkamp_perez: {
    roster: { name: 'Marie Gluesenkamp Perez', office: 'U.S. Representative', state: 'Washington', party: 'D', score: 57, icon: '🔧', issues: ['Working Class', 'Right to Repair', 'Fiscal Moderate', 'Border'] },
    label: 'Marie Gluesenkamp Perez — 🔧 U.S. Representative (D-WA)',
    cards: [
      { topic: 'Working Class & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A rural auto-shop owner, Gluesenkamp Perez centers working-class jobs, trades, and domestic manufacturing.',
        evidence: 'Member of the House Agriculture and Small Business committees; small-business owner.', source: S.mgp },
      { topic: 'Right to Repair', icon: '🔧', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'A signature cause: backing "right to repair" so people and small shops can fix their own cars, electronics, and equipment.', source: S.mgp },
      { topic: 'Fiscal Moderation', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'One of the most independent House Democrats, she stresses fiscal responsibility and often breaks with her party on spending.', source: S.mgp },
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'From a swing district, backs stronger border security and enforcement alongside orderly, legal immigration.', source: S.mgp },
    ],
  },
  // DEEPENED — existing stances/Spotlight rows; add roster + PROFILES seed only.
  jon_ossoff: {
    roster: { name: 'Jon Ossoff', office: 'U.S. Senator', state: 'Georgia', party: 'D', score: 57, icon: '💻', issues: ['Lowering Costs', 'Drug Prices', 'Anti-Corruption', 'Voting Access'] },
    label: 'Jon Ossoff — 💻 U.S. Senator (D-GA) [deepened]',
    cards: [],
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

console.log(`PolitiDex — National administration power players & influential members WAVE 18  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) {
  const has = new RegExp(`\\n    ${id}: \\[`).test(stancesRaw);
  const tag = NEW[id].cards.length === 0 ? '· roster/seed only' : (newToAdd.includes(id) ? '→ CREATE ' : '· stance exists');
  console.log(`  ${tag} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)${has ? ' [stance present]' : ''}`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National administration power players (Border Czar, trade architects, Ukraine envoy) & influential members · top-down federal wave 18 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');

// ── 1. CMP_DATA roster rows ────────────────────────────────────────────────
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — administration power players (Border Czar, trade/tariff architects, Ukraine envoy) + influential members, wave 18 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── 2. PROFILES seed allow-list (directory / search / Your Ballot) ─────────
// New officials have no Firestore document; without this seed they reach the
// comparison tool and Spotlights (via CMP_DATA) but never the public directory
// or global search. Guarded on (!PROFILES[id]) in-page, so Firestore always wins.
const seedAnchor = "        'booker', 'crockett', 'khanna',\n";
if (html.includes(seedAnchor) && !html.includes("// National wave 18 —")) {
  const seedIds = Object.keys(NEW);
  const seedBlock =
    "        // National wave 18 — administration power players & influential members (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",\n";
  html = html.replace(seedAnchor, seedAnchor + seedBlock);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
