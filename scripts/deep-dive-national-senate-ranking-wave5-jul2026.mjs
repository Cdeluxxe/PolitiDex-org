#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: SENATE RANKING MEMBERS, WAVE 5
// (July 2026) — continuing the top-down push after waves 1-4.
// ---------------------------------------------------------------------------
// Wave 4 added the House committee RANKING MEMBERS to balance the House chairs.
// This wave does the same on the SENATE side — adding the top Democrats on the
// major Senate committees, each the counterpart to a Republican chair already in
// the app — plus three marquee members, all mapped to the recent Issue
// Spotlights (Israel aid, border, tariffs, government spending, energy, AI, crypto):
//
//   • JACK REED (reed) — Ranking Member, Senate Armed Services (D-RI): defense
//     with Pentagon oversight, Israel aid, Ukraine — counterpart to Wicker.
//   • JEANNE SHAHEEN (shaheen) — Ranking Member, Senate Foreign Relations (D-NH):
//     Israel and Ukraine aid, diplomacy and foreign aid — counterpart to Risch.
//   • PATTY MURRAY (murray) — Vice Chair, Senate Appropriations (D-WA): defends
//     domestic spending against cuts — counterpart to Collins.
//   • SHELDON WHITEHOUSE (whitehouse) — Ranking Member, Senate Environment & Public
//     Works (D-RI): a climate hawk on energy and campaign finance — vs. Capito.
//   • MARIA CANTWELL (cantwell) — Ranking Member, Senate Commerce (D-WA): AI and
//     tech, aviation, trade, semiconductors — counterpart to Cruz.
//   • GARY PETERS (peters) — Ranking Member, Senate Homeland Security (D-MI): the
//     border and DHS, AI in government, cybersecurity — counterpart to Rand Paul.
//   • MARTIN HEINRICH (heinrich) — Ranking Member, Senate Energy & Natural
//     Resources (D-NM): clean energy, the grid, and public lands — vs. the
//     fossil-forward "abundance" push.
//   • BERNIE MORENO (moreno) — U.S. Senator (R-OH): tariffs and autos, the border,
//     digital assets, and Ohio energy.
//   • TIM SHEEHY (sheehy) — U.S. Senator (R-MT): a Navy SEAL veteran on defense
//     and Israel, Montana energy and wildfire, and the border.
//   • CHIP ROY (chip_roy) — U.S. Representative (R-TX): a Freedom Caucus fiscal
//     hardliner on spending and the debt, and a border hawk.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided records are marked mixed and attributed. Positions are the
// documented public record; quotes only where genuinely on the record, otherwise
// paraphrased. Sources are official member/committee pages, congress.gov, and
// reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-senate-ranking-wave5-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-senate-ranking-wave5-jul2026.mjs --apply    # write
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
  sasc:      { label: 'Senate Armed Services Committee', url: 'https://www.armed-services.senate.gov/' },
  reed:      { label: 'reed.senate.gov', url: 'https://www.reed.senate.gov/news/releases' },
  sfrc:      { label: 'Senate Foreign Relations Committee', url: 'https://www.foreign.senate.gov/' },
  shaheen:   { label: 'shaheen.senate.gov', url: 'https://www.shaheen.senate.gov/news/press' },
  approps:   { label: 'Senate Appropriations Committee', url: 'https://www.appropriations.senate.gov/' },
  murray:    { label: 'murray.senate.gov', url: 'https://www.murray.senate.gov/category/press-releases/' },
  epw:       { label: 'Senate Environment & Public Works Committee', url: 'https://www.epw.senate.gov/public/' },
  whitehouse:{ label: 'whitehouse.senate.gov', url: 'https://www.whitehouse.senate.gov/news/release/' },
  commerce:  { label: 'Senate Commerce, Science & Transportation Committee', url: 'https://www.commerce.senate.gov/' },
  cantwell:  { label: 'cantwell.senate.gov', url: 'https://www.cantwell.senate.gov/news/press-releases' },
  hsgac:     { label: 'Senate Homeland Security & Governmental Affairs Committee', url: 'https://www.hsgac.senate.gov/' },
  peters:    { label: 'peters.senate.gov', url: 'https://www.peters.senate.gov/newsroom/press-releases' },
  enr:       { label: 'Senate Energy & Natural Resources Committee', url: 'https://www.energy.senate.gov/' },
  heinrich:  { label: 'heinrich.senate.gov', url: 'https://www.heinrich.senate.gov/press-releases' },
  moreno:    { label: 'moreno.senate.gov', url: 'https://www.moreno.senate.gov/press-releases/' },
  sheehy:    { label: 'sheehy.senate.gov', url: 'https://www.sheehy.senate.gov/press-releases/' },
  chiproy:   { label: 'roy.house.gov', url: 'https://roy.house.gov/media/press-releases' },
  crs_israel:{ label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
};

const NEW = {
  reed: {
    roster: { name: 'Jack Reed', office: 'Senate Armed Services Ranking Member', state: 'Rhode Island', party: 'D', score: 59, icon: '🛡', issues: ['Defense', 'Israel & Ukraine', 'Pentagon Oversight', 'Veterans'] },
    label: 'Jack Reed — 🛡 Senate Armed Services Ranking Member (D-RI)',
    cards: [
      { topic: 'Defense Budget & Oversight', icon: '🛡', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: 'A West Point graduate and the top Democrat on Armed Services, Reed supports a strong, well-resourced military while pressing for rigorous oversight of Pentagon spending and acquisition.',
        evidence: 'Ranking Member of the Senate Armed Services Committee.', source: S.sasc },
      { topic: 'Israel Aid', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s security and missile-defense funding while backing humanitarian access and compliance with U.S. law on civilian harm.', source: S.reed },
      { topic: 'Ukraine Aid', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A firm supporter of sustained military and economic aid to Ukraine to deter Russian aggression.', source: S.reed },
      { topic: 'Defense Modernization', icon: '🛰', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Prioritizes modernizing the force around AI, shipbuilding, and munitions capacity, and reforming procurement to field capability faster.', source: S.reed },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A former Army Ranger who champions veterans\' health care and benefits.', source: S.reed },
    ],
  },
  shaheen: {
    roster: { name: 'Jeanne Shaheen', office: 'Senate Foreign Relations Ranking Member', state: 'New Hampshire', party: 'D', score: 59, icon: '🌐', issues: ['Foreign Policy', 'Israel & Ukraine', 'Diplomacy', 'Drug Prices'] },
    label: 'Jeanne Shaheen — 🌐 Senate Foreign Relations Ranking Member (D-NH)',
    cards: [
      { topic: 'Israel Aid', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'The top Democrat on Foreign Relations, Shaheen supports Israel\'s security and its U.S. aid while pressing for humanitarian access and a diplomatic path.',
        evidence: 'Ranking Member of the Senate Foreign Relations Committee.', source: S.sfrc },
      { topic: 'Ukraine & NATO', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A leading supporter of aid to Ukraine and of NATO, Shaheen frames a strong alliance as central to deterring Russia.', source: S.shaheen },
      { topic: 'Diplomacy & Foreign Aid', icon: '🕊', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Defends State Department, development, and foreign-assistance funding against deep cuts, arguing diplomacy protects U.S. interests.', source: S.shaheen },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Backs Medicare drug-price negotiation and capping out-of-pocket and insulin costs.', source: S.shaheen },
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: 'A former governor who focuses on small-business access to capital and lowering costs for New Hampshire employers.', source: S.shaheen },
    ],
  },
  murray: {
    roster: { name: 'Patty Murray', office: 'Senate Appropriations Vice Chair', state: 'Washington', party: 'D', score: 59, icon: '🧾', issues: ['Appropriations', 'Child Care', 'Healthcare', 'Reproductive Rights'] },
    label: 'Patty Murray — 🧾 Senate Appropriations Vice Chair (D-WA)',
    cards: [
      { topic: 'Appropriations & Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: 'As Appropriations vice chair and a former chair, Murray defends domestic and safety-net funding and has been a leading opponent of the administration\'s rescissions and deep discretionary cuts.',
        evidence: 'Vice Chair (top Democrat) of the Senate Appropriations Committee.', source: S.approps },
      { topic: 'Child Care & Families', icon: '👶', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'A longtime champion of federal child-care and early-learning investment, framing it as essential economic infrastructure for working parents.', source: S.murray },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Defends the ACA and Medicaid and opposes coverage cuts, and works on drug costs and public-health funding.', source: S.murray },
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Backed the 2024 national-security supplemental funding Israel, Ukraine, and the Indo-Pacific.', source: S.crs_israel },
      { topic: 'Reproductive Rights', icon: '⚕️', pos: 'support', issueKey: 'repro_balance', issueStance: 'support',
        text: 'A leading advocate for codifying abortion rights and protecting contraception and IVF access.', source: S.murray },
    ],
  },
  whitehouse: {
    roster: { name: 'Sheldon Whitehouse', office: 'Senate Environment & Public Works Ranking Member', state: 'Rhode Island', party: 'D', score: 58, icon: '🌊', issues: ['Climate & Energy', 'Campaign Finance', 'Corporate Accountability', 'Infrastructure'] },
    label: 'Sheldon Whitehouse — 🌊 Senate EPW Ranking Member (D-RI)',
    cards: [
      { topic: 'Climate & Energy', icon: '🌱', pos: 'oppose', issueKey: 'enviro_energy', issueStance: 'oppose',
        text: 'The Senate\'s most persistent climate hawk and the top Democrat on Environment & Public Works, Whitehouse pushes carbon pricing and clean energy and opposes rollbacks of emissions rules and fossil-fuel expansion.',
        evidence: 'Ranking Member of the Senate Environment & Public Works Committee.', source: S.epw },
      { topic: 'Dark Money & Campaign Finance', icon: '💸', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Best known for his campaign against undisclosed "dark money," Whitehouse pushes the DISCLOSE Act and transparency in political and judicial influence.', source: S.whitehouse },
      { topic: 'Corporate Accountability', icon: '🏦', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Targets what he calls corporate capture of regulators and courts, backing stronger disclosure and enforcement.', source: S.whitehouse },
      { topic: 'Infrastructure & Coasts', icon: '🌉', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Works on resilient infrastructure, coastal and ocean protection, and water systems for Rhode Island.', source: S.whitehouse },
      { topic: 'Judicial Ethics', icon: '⚖️', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'A leading advocate for Supreme Court ethics rules and transparency around gifts and recusals.', source: S.whitehouse },
    ],
  },
  cantwell: {
    roster: { name: 'Maria Cantwell', office: 'Senate Commerce Committee Ranking Member', state: 'Washington', party: 'D', score: 59, icon: '📡', issues: ['AI & Tech', 'Trade', 'Semiconductors', 'Aviation'] },
    label: 'Maria Cantwell — 📡 Senate Commerce Ranking Member (D-WA)',
    cards: [
      { topic: 'AI & Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'The top Democrat on Commerce, Cantwell backs federal AI guardrails, data-privacy protections, and platform accountability while promoting U.S. tech leadership.',
        evidence: 'Ranking Member of the Senate Commerce, Science & Transportation Committee.', source: S.commerce },
      { topic: 'Trade', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'From a trade-dependent state, Cantwell generally favors open, rules-based trade and warns broad tariffs can raise costs and hit exporters, while backing enforcement against unfair practices.', source: S.cantwell },
      { topic: 'Semiconductors & Innovation', icon: '💽', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'A principal force behind the CHIPS and Science Act, she champions domestic semiconductor manufacturing and research funding.', source: S.cantwell },
      { topic: 'Aviation & Safety', icon: '✈️', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Leads aviation-safety and FAA oversight — a priority sharpened by Boeing\'s home-state footprint and recent safety incidents.', source: S.cantwell },
      { topic: 'Energy', icon: '⚡', pos: 'mixed', issueKey: 'energy_production', issueStance: 'mixed',
        text: 'Supports an all-of-the-above mix with a strong clean-energy and hydropower component for the Pacific Northwest.', source: S.cantwell },
    ],
  },
  peters: {
    roster: { name: 'Gary Peters', office: 'Senate Homeland Security Ranking Member', state: 'Michigan', party: 'D', score: 58, icon: '🛡', issues: ['Border & Homeland Security', 'AI in Government', 'Manufacturing', 'Cybersecurity'] },
    label: 'Gary Peters — 🛡 Senate Homeland Security Ranking Member (D-MI)',
    cards: [
      { topic: 'Border & Homeland Security', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'The top Democrat on Homeland Security, Peters backs more border technology, agents, and fentanyl interdiction alongside orderly asylum processing, and conducts oversight of DHS operations.',
        evidence: 'Ranking Member of the Senate Homeland Security & Governmental Affairs Committee.', source: S.hsgac },
      { topic: 'AI in Government', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'A leader on federal AI and IT policy, Peters backs rules for safe, transparent government use of AI and stronger cybersecurity.', source: S.peters },
      { topic: 'Manufacturing & Autos', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'From Michigan, focuses on the auto industry, supply chains, and manufacturing jobs.', source: S.peters },
      { topic: 'Cybersecurity', icon: '🔐', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Authored major cyber-incident reporting requirements for critical infrastructure and pushes federal cyber defenses.', source: S.peters },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A Navy Reserve veteran who prioritizes veterans\' services and benefits.', source: S.peters },
    ],
  },
  heinrich: {
    roster: { name: 'Martin Heinrich', office: 'Senate Energy & Natural Resources Ranking Member', state: 'New Mexico', party: 'D', score: 58, icon: '⚡', issues: ['Clean Energy', 'Public Lands', 'Grid', 'Data Centers'] },
    label: 'Martin Heinrich — ⚡ Senate Energy & Natural Resources Ranking Member (D-NM)',
    cards: [
      { topic: 'Clean Energy & Grid', icon: '🌱', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'The top Democrat on Energy & Natural Resources, Heinrich champions clean energy, electrification, and transmission build-out — an all-of-the-above push that leans toward renewables and advanced nuclear over new fossil expansion.',
        evidence: 'Ranking Member of the Senate Energy & Natural Resources Committee.', source: S.enr },
      { topic: 'Public Lands', icon: '🏔', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'A conservation advocate who opposes selling off or transferring federal public lands and backs protecting them for recreation and habitat.', source: S.heinrich },
      { topic: 'Grid & Transmission', icon: '🔌', pos: 'mixed', issueKey: 'energy_production', issueStance: 'mixed',
        text: 'Pushes to expand generation and long-distance transmission to meet demand, favoring clean sources while supporting reliability.', source: S.heinrich },
      { topic: 'Data Centers & Power', icon: '🏭', pos: 'mixed', issueKey: 'datacenter_power', issueStance: 'mixed',
        text: 'Frames surging AI data-center demand as a reason to accelerate clean generation and grid upgrades rather than lock in new fossil capacity.', source: S.heinrich },
      { topic: 'Outdoor Economy', icon: '🎣', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Works on water, wildfire, and the outdoor-recreation economy central to New Mexico.', source: S.heinrich },
    ],
  },
  moreno: {
    roster: { name: 'Bernie Moreno', office: 'U.S. Senator', state: 'Ohio', party: 'R', score: 56, icon: '🚗', issues: ['Trade & Autos', 'Border Security', 'Digital Assets', 'Energy'] },
    label: 'Bernie Moreno — 🚗 U.S. Senator (R-OH)',
    cards: [
      { topic: 'Trade & Autos', icon: '📦', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: 'A former auto-dealership owner, Moreno supports tariffs and tougher trade terms to protect Ohio manufacturing and autoworkers and to reshore supply chains.', source: S.moreno },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement, more removals, and tighter asylum rules tied to the fentanyl fight.', source: S.moreno },
      { topic: 'Digital Assets', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: 'With a background in blockchain-based business, Moreno backs clear crypto rules and the GENIUS Act framework and opposes a government-run CBDC.', source: S.moreno },
      { topic: 'Debt & Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Campaigned as a fiscal conservative, backing spending cuts and warning about the national debt.', source: S.moreno },
      { topic: 'Ohio Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Supports expanded oil, gas, and nuclear production and opposes rules he says raise energy costs for Ohio.', source: S.moreno },
    ],
  },
  sheehy: {
    roster: { name: 'Tim Sheehy', office: 'U.S. Senator', state: 'Montana', party: 'R', score: 56, icon: '🎖', issues: ['Defense', 'Energy & Wildfire', 'Border Security', 'Spending'] },
    label: 'Tim Sheehy — 🎖 U.S. Senator (R-MT)',
    cards: [
      { topic: 'Defense & Israel', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A former Navy SEAL, Sheehy supports a strong military, robust aid to Israel, and a hard line on adversaries.', source: S.sheehy },
      { topic: 'Montana Energy', icon: '⛏', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs expanded domestic energy, mining, and timber production and opposes federal rules he argues hurt Montana\'s resource economy.', source: S.sheehy },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports stricter enforcement, more agents and barriers, and fentanyl interdiction.', source: S.sheehy },
      { topic: 'Wildfire & Forestry', icon: '🔥', pos: 'support', issueKey: 'disaster_resilience', issueStance: 'support',
        text: 'Founder of an aerial-firefighting company, Sheehy focuses on wildfire prevention, active forest management, and disaster response.', source: S.sheehy },
      { topic: 'Cutting Spending', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Backs spending cuts and fiscal restraint, framing the debt as a threat to national strength.', source: S.sheehy },
    ],
  },
  chip_roy: {
    roster: { name: 'Chip Roy', office: 'U.S. Representative', state: 'Texas', party: 'R', score: 55, icon: '🐍', issues: ['Government Spending', 'Border Security', 'National Debt', 'Deregulation'] },
    label: 'Chip Roy — 🐍 U.S. Representative (R-TX)',
    cards: [
      { topic: 'Cutting Spending', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'A House Freedom Caucus fiscal hardliner, Roy repeatedly voted against spending deals he considered insufficiently austere and demands deeper cuts and process reforms as the price of his vote.', source: S.chiproy },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'One of the House\'s most aggressive border hawks, Roy pushes hardline asylum limits, detention, and enforcement and has opposed deals he views as too weak.', source: S.chiproy },
      { topic: 'Debt & Deficits', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Warns the national debt is an existential threat and ties his votes to structural spending and debt-limit reforms.', source: S.chiproy },
      { topic: 'Regulation & Liberty', icon: '⚖️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'A former federal prosecutor and Senate aide, Roy pushes to curb the administrative state and roll back regulations he views as overreach.', source: S.chiproy },
      { topic: 'Texas Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs expanded oil and gas production and opposes federal limits he argues raise costs and threaten Texas jobs.', source: S.chiproy },
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

console.log(`PolitiDex — National Senate ranking members WAVE 5  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National Senate ranking members & members · top-down federal wave 5 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    coons                   : { name:'Chris Coons', office:'U.S. Senator', state:'Delaware', party:'D', score:60, kept:0, broken:0, pending:0, icon:'🕊', issues:['Foreign Aid','Israel & Ukraine','Clean Energy','Bipartisanship'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterAnchor)) {
  const block = '\n    // National 15 — Senate ranking members + members, wave 5 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or anchor missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
