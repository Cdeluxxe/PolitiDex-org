#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: CHAIRS & CABINET, WAVE 2
// (July 2026) — continuing the top-down push after the first chairs/cabinet wave.
// ---------------------------------------------------------------------------
// The first chairs/cabinet wave built the Foreign Relations/Finance/Intelligence/
// Appropriations/Oversight chairs plus HHS, and three influential senators. This
// wave continues down the org chart to the next tier of gavel-holders and
// marquee members, again mapped to the recent Issue Spotlights (Israel aid,
// border, tariffs, government spending, energy, AI, crypto) using the same
// ISSUE_MAP keys so each card lights up "How Politicians Stand," the Stance
// Library, Connected Evidence, and Alignment automatically:
//
//   • SEAN DUFFY (duffy) — Secretary of Transportation (and acting NASA
//     Administrator): air-traffic-control modernization and infrastructure, the
//     rollback of EV/fuel-economy mandates, and grant conditions/spending.
//   • ROGER WICKER (wicker) — Chair, Senate Armed Services (R-MS): a defense
//     buildup toward ~5% of GDP, aid to Israel and Ukraine, Navy shipbuilding,
//     and China deterrence.
//   • TIM SCOTT (tim_scott) — Chair, Senate Banking (R-SC): the GENIUS Act
//     stablecoin framework and anti-CBDC stance, housing supply, bank
//     deregulation, and Opportunity Zones.
//   • BRIAN MAST (brian_mast) — Chair, House Foreign Affairs (R-FL): an Army
//     combat veteran and among Congress's most vocal Israel supporters, skeptical
//     of open-ended foreign aid elsewhere, and strong on the border.
//   • CHRIS MURPHY (chris_murphy) — U.S. Senator (D-CT): a leading voice for
//     conditioning offensive-weapons aid while backing Israel's defense, lead
//     author of the 2022 gun-safety law, and an anti-corruption message.
//   • MARK KELLY (mark_kelly) — U.S. Senator (D-AZ): a Navy combat veteran and
//     astronaut on border-state enforcement, semiconductors/CHIPS, defense, and
//     Western water.
//   • RON WYDEN (wyden) — Ranking Member, Senate Finance (D-OR): the Democratic
//     counterweight on tariffs and trade authority, Medicare drug-price
//     negotiation, digital privacy, and AI accountability.
//   • JOHN KENNEDY (kennedy_john) — U.S. Senator (R-LA): a fiscal hawk on debt and
//     spending, Louisiana energy and LNG, the border, and tariff cost concerns.
//
// It also closes two ROSTER-WIRING gaps: FRENCH HILL (french_hill, House
// Financial Services Chair) and TOM COLE (tom_cole, House Appropriations Chair)
// already have deep stance records but no CMP_DATA profile, so they don't surface
// in search/compare — this adds their roster rows (no new stance data needed).
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided records are marked mixed and attributed. Positions are the
// documented public record; quotes are used only where genuinely on the record,
// otherwise paraphrased. Sources are official member/committee pages,
// congress.gov, and reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-chairs-cabinet-wave2-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-chairs-cabinet-wave2-jul2026.mjs --apply    # write
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
  dot:        { label: 'U.S. Department of Transportation', url: 'https://www.transportation.gov/briefing-room' },
  dot_atc:    { label: 'U.S. DOT — air traffic control modernization', url: 'https://www.transportation.gov/briefing-room' },
  nhtsa_cafe: { label: 'NHTSA — fuel economy standards', url: 'https://www.nhtsa.gov/laws-regulations/corporate-average-fuel-economy' },
  wicker_sasc:{ label: 'Senate Armed Services Committee', url: 'https://www.armed-services.senate.gov/' },
  wicker_site:{ label: 'wicker.senate.gov', url: 'https://www.wicker.senate.gov/news/press-releases' },
  crs_israel: { label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
  scott_bank: { label: 'Senate Banking, Housing & Urban Affairs Committee', url: 'https://www.banking.senate.gov/' },
  scott_site: { label: 'timscott.senate.gov', url: 'https://www.scott.senate.gov/media-center/press-releases' },
  genius:     { label: 'Congress.gov — GENIUS Act (S.1582, 119th)', url: 'https://www.congress.gov/bill/119th-congress/senate-bill/1582' },
  mast_hfac:  { label: 'House Foreign Affairs Committee', url: 'https://foreignaffairs.house.gov/' },
  mast_site:  { label: 'mast.house.gov', url: 'https://mast.house.gov/media/press-releases' },
  murphy_site:{ label: 'murphy.senate.gov', url: 'https://www.murphy.senate.gov/newsroom/press-releases' },
  bsca:       { label: 'Congress.gov — Bipartisan Safer Communities Act (2022)', url: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938' },
  kelly_site: { label: 'kelly.senate.gov', url: 'https://www.kelly.senate.gov/news/press-releases/' },
  wyden_fin:  { label: 'Senate Finance Committee (Ranking Member)', url: 'https://www.finance.senate.gov/' },
  wyden_site: { label: 'wyden.senate.gov', url: 'https://www.wyden.senate.gov/news/press-releases' },
  kennedy_site:{ label: 'johnkennedy.senate.gov', url: 'https://www.kennedy.senate.gov/public/press-releases' },
  cbo:        { label: 'Congressional Budget Office', url: 'https://www.cbo.gov/' },
};

const NEW = {
  duffy: {
    roster: { name: 'Sean Duffy', office: 'U.S. Secretary of Transportation', state: 'Wisconsin', party: 'R', score: 57, icon: '🚦', issues: ['Infrastructure', 'Air Travel Safety', 'EV & Fuel Rules', 'Government Spending'] },
    label: 'Sean Duffy — 🚦 Secretary of Transportation',
    cards: [
      { topic: 'Air Traffic Control & Safety', icon: '🛫', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'After a series of 2025 aviation incidents, Duffy made overhauling the aging air-traffic-control system his signature push — seeking new radar, telecom, and facilities and faster controller hiring.',
        evidence: 'Confirmed Secretary of Transportation in early 2025; also named acting NASA Administrator in July 2025.', source: S.dot_atc },
      { topic: 'Fuel-Economy & EV Mandates', icon: '🚗', pos: 'oppose', issueKey: 'enviro_energy', issueStance: 'oppose',
        text: 'Directed a reset of federal fuel-economy standards and moved to unwind rules he argues functioned as an EV mandate, framing it as consumer choice and lower vehicle costs; critics say it raises emissions and fuel use.', source: S.nhtsa_cafe },
      { topic: 'Infrastructure Grants & Spending', icon: '🧾', pos: 'mixed', issueKey: 'gov_waste', issueStance: 'mixed',
        text: 'Reviewed and reprioritized discretionary DOT grants — trimming or attaching conditions to some awards — arguing for cost discipline and merit; recipients and some states disputed the changes.', source: S.dot },
      { topic: 'Highways & Transit', icon: '🛣', pos: 'mixed', issueKey: 'infrastructure', issueStance: 'mixed',
        text: 'Oversees implementation of the 2021 infrastructure law\'s highway and transit dollars while pressing to speed permitting and cut what he calls red tape in project delivery.', source: S.dot },
    ],
  },
  wicker: {
    roster: { name: 'Roger Wicker', office: 'Senate Armed Services Committee Chair', state: 'Mississippi', party: 'R', score: 60, icon: '⚓', issues: ['National Defense', 'Israel & Ukraine', 'Shipbuilding', 'China'] },
    label: 'Roger Wicker — ⚓ Senate Armed Services Chair (R-MS)',
    cards: [
      { topic: 'Defense Buildup', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'As Armed Services chair, Wicker released a multiyear plan to raise defense spending toward about 5% of GDP, arguing the U.S. must rebuild capacity to deter China, Russia, and Iran simultaneously.',
        evidence: 'Chairs the Senate committee that authorizes defense policy and the NDAA.', source: S.wicker_sasc },
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A consistent supporter of military aid to both Israel and Ukraine, Wicker backed the 2024 national-security supplemental and frames sustained allied support as cheaper than the wars deterrence prevents.', source: S.crs_israel },
      { topic: 'Navy & Shipbuilding', icon: '🚢', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Champions rebuilding the Navy and the domestic shipbuilding base — a priority tied to Mississippi\'s shipyards — pushing legislation to expand the fleet and fix procurement.', source: S.wicker_site },
      { topic: 'China Deterrence', icon: '🐉', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: 'Treats China as the pacing threat, backing tighter export controls on advanced technology, Taiwan arms sales, and a stronger Indo-Pacific force posture.', source: S.wicker_site },
      { topic: 'Defense Spending vs. the Debt', icon: '🧾', pos: 'mixed', issueKey: 'national_debt', issueStance: 'mixed',
        text: 'Supports broad spending restraint but would grow the defense budget, arguing security is the government\'s first duty even as the roughly $37 trillion debt constrains other priorities.', source: S.cbo },
    ],
  },
  tim_scott: {
    roster: { name: 'Tim Scott', office: 'Senate Banking Committee Chair', state: 'South Carolina', party: 'R', score: 60, icon: '🏦', issues: ['Digital Assets', 'Housing', 'Financial Regulation', 'Taxes'] },
    label: 'Tim Scott — 🏦 Senate Banking Chair (R-SC)',
    cards: [
      { topic: 'Digital Assets', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: 'As Banking chair, Scott shepherded the GENIUS Act stablecoin framework into law and is advancing broader crypto market-structure rules, while opposing a government retail digital dollar (CBDC) on privacy grounds.',
        evidence: 'Chairs the committee with jurisdiction over banking and securities; the GENIUS Act was enacted in 2025.', source: S.genius },
      { topic: 'Housing Supply', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Authored a bipartisan housing package aimed at boosting supply and cutting local barriers, framing affordability as a supply problem rather than a subsidy one.', source: S.scott_bank },
      { topic: 'Financial Regulation', icon: '🏛', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Favors easing bank capital and supervisory rules he calls excessive, and has pressed regulators over "debanking" of lawful businesses, arguing regulation should not choke credit or speech.', source: S.scott_site },
      { topic: 'Taxes & Opportunity Zones', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'The author of the Opportunity Zones incentive in the 2017 tax law, Scott backed making the individual tax cuts permanent in the 2025 law as pro-growth for working families.', source: S.scott_site },
      { topic: 'Support for Israel', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A vocal supporter of Israel and its U.S. security aid, framing the alliance as a moral and strategic commitment and backing post-Oct. 7 assistance.', source: S.scott_site },
    ],
  },
  brian_mast: {
    roster: { name: 'Brian Mast', office: 'House Foreign Affairs Committee Chair', state: 'Florida', party: 'R', score: 57, icon: '🎖', issues: ['Israel & Foreign Aid', 'National Security', 'Veterans', 'Border Security'] },
    label: 'Brian Mast — 🎖 House Foreign Affairs Chair (R-FL)',
    cards: [
      { topic: 'Support for Israel', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Army combat veteran who lost both legs in Afghanistan, Mast is among Congress\'s most outspoken supporters of Israel and its U.S. aid, and as Foreign Affairs chair prioritizes weapons transfers and backing after Oct. 7.',
        evidence: 'Chairs the House committee with jurisdiction over foreign aid and arms exports.', source: S.mast_hfac },
      { topic: 'Foreign Aid Scrutiny', icon: '🌐', pos: 'mixed', issueKey: 'america_first_fp', issueStance: 'mixed',
        text: 'Pairs strong support for Israel with skepticism of open-ended foreign aid elsewhere, pushing audits and conditions on other assistance under an "America First" framework.', source: S.mast_site },
      { topic: 'Ukraine Aid Conditions', icon: '🇺🇦', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'More cautious on Ukraine than on Israel, Mast has emphasized oversight, accountability, and a defined end-state as conditions for continued U.S. support.', source: S.mast_site },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter border enforcement, more agents and technology, and tying interdiction to the fentanyl fight.', source: S.mast_site },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Draws on his own combat-wounded experience to press for veterans\' health care, benefits, and mental-health resources.', source: S.mast_site },
    ],
  },
  chris_murphy: {
    roster: { name: 'Chris Murphy', office: 'U.S. Senator', state: 'Connecticut', party: 'D', score: 60, icon: '🕊', issues: ['Foreign Policy', 'Gun Safety', 'Healthcare', 'Anti-Corruption'] },
    label: 'Chris Murphy — 🕊 U.S. Senator (D-CT)',
    cards: [
      { topic: 'Israel Aid & Conditions', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s defense and its missile-defense funding but became a leading Democratic voice for conditioning offensive-weapons transfers on humanitarian access and compliance with U.S. law during the Gaza war.', source: S.murphy_site },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'The lead Senate negotiator of the 2022 Bipartisan Safer Communities Act — the first major federal gun-safety law in decades — after representing Newtown in the House during Sandy Hook.',
        evidence: 'Primary author of the BSCA (Public Law 117-159).', source: S.bsca },
      { topic: 'Foreign-Policy Restraint', icon: '🕊', pos: 'mixed', issueKey: 'restraint', issueStance: 'mixed',
        text: 'Has pushed to reclaim Congress\'s war powers and to limit arms sales to some partners, arguing for diplomacy-first engagement and fewer open-ended commitments.', source: S.murphy_site },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A defender of the Affordable Care Act and its subsidies who backs expanding coverage and lowering premiums as a cost-of-living priority.', source: S.murphy_site },
      { topic: 'Corruption & Democracy', icon: '🏛', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Centers an anti-corruption and pro-democracy message, backing ethics, money-in-politics, and transparency reforms he argues restore public trust.', source: S.murphy_site },
    ],
  },
  mark_kelly: {
    roster: { name: 'Mark Kelly', office: 'U.S. Senator', state: 'Arizona', party: 'D', score: 60, icon: '🚀', issues: ['Border Security', 'Semiconductors', 'National Defense', 'Western Water'] },
    label: 'Mark Kelly — 🚀 U.S. Senator (D-AZ)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'A border-state senator who has faulted both parties on immigration, Kelly backs more Border Patrol agents, technology, and fentanyl interdiction alongside a legal pathway, and supported the bipartisan 2024 border deal.', source: S.kelly_site },
      { topic: 'Israel & National Security', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A Navy combat veteran who supports Israel\'s security and U.S. missile-defense aid, and generally backs assistance to allies paired with oversight.', source: S.kelly_site },
      { topic: 'Semiconductors & Manufacturing', icon: '💽', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Champions the CHIPS-driven semiconductor build-out in Arizona (including TSMC\'s Phoenix fabs) as jobs and supply-chain security against China.', source: S.kelly_site },
      { topic: 'Western Water', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Works on Colorado River drought funding and water infrastructure for Arizona, treating long-term water supply as an economic and security issue for the Southwest.', source: S.kelly_site },
      { topic: 'Veterans & Defense', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A retired Navy captain and astronaut who prioritizes veterans\' care and a strong, well-resourced military.', source: S.kelly_site },
    ],
  },
  wyden: {
    roster: { name: 'Ron Wyden', office: 'Senate Finance Committee Ranking Member', state: 'Oregon', party: 'D', score: 60, icon: '🧾', issues: ['Trade & Tariffs', 'Drug Prices', 'Digital Privacy', 'AI & Tech'] },
    label: 'Ron Wyden — 🧾 Senate Finance Ranking Member (D-OR)',
    cards: [
      { topic: 'Tariffs & Trade Authority', icon: '📦', pos: 'oppose', issueKey: 'tariffs_authority', issueStance: 'oppose',
        text: 'As Finance\'s ranking member, Wyden argues broad tariffs act as a regressive tax that raises consumer prices, and has pressed to reclaim Congress\'s constitutional authority over tariffs from emergency executive action.', source: S.wyden_fin },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'A principal architect of Medicare\'s drug-price negotiation and the insulin and out-of-pocket caps in the 2022 law, framing them as core cost-of-living relief for seniors.', source: S.wyden_site },
      { topic: 'Digital Privacy & Surveillance', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: 'One of the Senate\'s longest-standing privacy hawks, Wyden has fought warrantless surveillance under Section 702 and the sale of Americans\' data by brokers.', source: S.wyden_site },
      { topic: 'AI & Algorithmic Accountability', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Backs AI transparency and accountability rules — from algorithmic-impact assessments to limits on deepfakes and data misuse — while guarding against surveillance overreach.', source: S.wyden_site },
      { topic: 'Taxing Extreme Wealth', icon: '💰', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Has proposed taxing the unrealized gains of billionaires and closing corporate loopholes, arguing the wealthiest should pay on par with wage earners.', source: S.wyden_site },
    ],
  },
  kennedy_john: {
    roster: { name: 'John Kennedy', office: 'U.S. Senator', state: 'Louisiana', party: 'R', score: 58, icon: '🧾', issues: ['National Debt', 'Energy & LNG', 'Border Security', 'Judiciary'] },
    label: 'John Kennedy — 🧾 U.S. Senator (R-LA)',
    cards: [
      { topic: 'Debt & Deficits', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'A self-styled fiscal hawk on the Appropriations and Budget committees, Kennedy is a frequent, folksy critic of federal borrowing, warning the roughly $37 trillion debt threatens the country\'s finances.', source: S.kennedy_site },
      { topic: 'Cutting Wasteful Spending', icon: '🧹', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Backs rescissions and line-by-line spending cuts, arguing appropriators should justify programs rather than grow them automatically each year.', source: S.kennedy_site },
      { topic: 'Louisiana Energy & LNG', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions expanded oil, gas, and LNG export capacity anchored in Louisiana, opposing drilling and export limits he says raise costs and cede markets to rivals.', source: S.kennedy_site },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports stricter enforcement, more detention and removal capacity, and tighter asylum rules, tying the border to drug and crime concerns.', source: S.kennedy_site },
      { topic: 'Tariffs & Consumer Prices', icon: '🛒', pos: 'mixed', issueKey: 'tariffs_prices', issueStance: 'mixed',
        text: 'Supports getting tough on China but has publicly warned that broad tariffs can be passed on to American consumers, a caution he balances against the case for reshoring.', source: S.kennedy_site },
    ],
  },
};

// roster-only wiring fixes (stance data already exists)
const ROSTER_ONLY = {
  french_hill: { name: 'French Hill', office: 'House Financial Services Committee Chair', state: 'Arkansas', party: 'R', score: 59, icon: '🏦', issues: ['Digital Assets', 'Financial Regulation', 'Economy', 'Taxes'] },
  tom_cole: { name: 'Tom Cole', office: 'House Appropriations Committee Chair', state: 'Oklahoma', party: 'R', score: 60, icon: '🧾', issues: ['Federal Appropriations', 'National Defense', 'Agriculture', 'Tribal Affairs'] },
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

console.log(`PolitiDex — National chairs & cabinet WAVE 2  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);
for (const id of Object.keys(ROSTER_ONLY)) console.log(`  → ROSTER  ${id} (${ROSTER_ONLY[id].name}) · profile row only`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

// 1) append new stance arrays
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National chairs & cabinet · top-down federal wave 2 (July 2026) ───────────\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

// 2) CMP_DATA roster rows (new figures + roster-only fixes)
let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    slotkin                 : { name:'Elissa Slotkin', office:'U.S. Senator', state:'Michigan', party:'D', score:59, kept:0, broken:0, pending:0, icon:'🛡', issues:['National Security','Border','Manufacturing & Trade','Israel'] },";
const rosterRows = Object.entries(NEW).map(([id, p]) => [id, p.roster])
  .concat(Object.entries(ROSTER_ONLY))
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, r]) => `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`);
if (rosterRows.length && html.includes(rosterAnchor)) {
  const block = '\n    // National 12 — chairs/cabinet wave 2 + roster-wiring fixes (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or anchor missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
