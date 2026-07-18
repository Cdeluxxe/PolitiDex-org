#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: RANKING MEMBERS & SENATORS, WAVE 4
// (July 2026) — continuing the top-down push after waves 1-3.
// ---------------------------------------------------------------------------
// Waves 1-3 built the Republican committee chairs, Cabinet officials, and many
// senators. This wave restores partisan balance by adding the top DEMOCRATS on
// the major House committees (the ranking members who counter the chairs already
// in the app) plus four more senators from both parties, all mapped to the
// recent Issue Spotlights (Israel aid, border, tariffs, government spending,
// energy, AI, crypto):
//
//   • ROSA DeLAURO (delauro) — Ranking Member, House Appropriations (D-CT):
//     defends domestic spending against cuts — the counterpart to chair Tom Cole.
//   • GREGORY MEEKS (meeks) — Ranking Member, House Foreign Affairs (D-NY):
//     Israel and Ukraine aid, diplomacy and soft power — counterpart to Brian Mast.
//   • JAMIE RASKIN (raskin) — Ranking Member, House Judiciary (D-MD): immigration
//     and due process, oversight, AI/tech — counterpart to Jim Jordan.
//   • RICHARD NEAL (neal) — Ranking Member, House Ways & Means (D-MA): trade and
//     tariffs, taxes, Social Security — counterpart to Jason Smith.
//   • FRANK PALLONE (pallone) — Ranking Member, House Energy & Commerce (D-NJ):
//     clean energy, AI and data privacy, drug prices — counterpart to Guthrie.
//   • ADAM SMITH (adam_smith) — Ranking Member, House Armed Services (D-WA):
//     defense with Pentagon reform, Israel aid with conditions — vs. Rogers/Wicker.
//   • BILL HAGERTY (hagerty) — U.S. Senator (R-TN): tariffs and reshoring, Israel
//     and foreign policy (former ambassador), the border, and digital assets.
//   • KATIE BRITT (britt) — U.S. Senator (R-AL): appropriations and spending, the
//     border, Alabama energy, and child care.
//   • JIM BANKS (banks) — U.S. Senator (R-IN): a China and defense hawk on trade,
//     reshoring, the border, and AI/China.
//   • CHRIS COONS (coons) — U.S. Senator (D-DE): Israel and Ukraine aid, foreign
//     aid and diplomacy, clean-energy R&D, and bipartisan dealmaking.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided records are marked mixed and attributed. Positions are the
// documented public record; quotes only where genuinely on the record, otherwise
// paraphrased. Sources are official member/committee pages, congress.gov, and
// reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-ranking-members-wave4-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-ranking-members-wave4-jul2026.mjs --apply    # write
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
  approps_dem: { label: 'House Appropriations Committee (Democrats)', url: 'https://democrats-appropriations.house.gov/' },
  delauro:     { label: 'delauro.house.gov', url: 'https://delauro.house.gov/media-center/press-releases' },
  hfac_dem:    { label: 'House Foreign Affairs Committee (Democrats)', url: 'https://democrats-foreignaffairs.house.gov/' },
  meeks:       { label: 'meeks.house.gov', url: 'https://meeks.house.gov/media/press-releases' },
  judiciary_dem:{ label: 'House Judiciary Committee (Democrats)', url: 'https://democrats-judiciary.house.gov/' },
  raskin:      { label: 'raskin.house.gov', url: 'https://raskin.house.gov/press-releases' },
  waysmeans_dem:{ label: 'House Ways & Means Committee (Democrats)', url: 'https://democrats-waysandmeans.house.gov/' },
  neal:        { label: 'neal.house.gov', url: 'https://neal.house.gov/media-center/press-releases' },
  ec_dem:      { label: 'House Energy & Commerce Committee (Democrats)', url: 'https://democrats-energycommerce.house.gov/' },
  pallone:     { label: 'pallone.house.gov', url: 'https://pallone.house.gov/media/press-releases' },
  hasc_dem:    { label: 'House Armed Services Committee (Democrats)', url: 'https://democrats-armedservices.house.gov/' },
  adam_smith:  { label: 'adamsmith.house.gov', url: 'https://adamsmith.house.gov/press-releases' },
  hagerty:     { label: 'hagerty.senate.gov', url: 'https://www.hagerty.senate.gov/press-releases/' },
  britt:       { label: 'britt.senate.gov', url: 'https://www.britt.senate.gov/news/' },
  banks:       { label: 'banks.senate.gov', url: 'https://www.banks.senate.gov/news/press-releases' },
  coons:       { label: 'coons.senate.gov', url: 'https://www.coons.senate.gov/news/press-releases' },
  crs_israel:  { label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
  cbo:         { label: 'Congressional Budget Office', url: 'https://www.cbo.gov/' },
};

const NEW = {
  delauro: {
    roster: { name: 'Rosa DeLauro', office: 'House Appropriations Ranking Member', state: 'Connecticut', party: 'D', score: 58, icon: '🧾', issues: ['Appropriations', 'Families & Child Tax Credit', 'Drug Prices', 'Trade'] },
    label: 'Rosa DeLauro — 🧾 House Appropriations Ranking Member (D-CT)',
    cards: [
      { topic: 'Appropriations & Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: 'As the top Democrat on House Appropriations, DeLauro defends domestic and safety-net funding and has been among the sharpest critics of the administration\'s rescissions and deep discretionary cuts, calling them an unlawful end-run around Congress\'s power of the purse.',
        evidence: 'Ranking Member of the House Appropriations Committee.', source: S.approps_dem },
      { topic: 'Child Tax Credit & Families', icon: '👨‍👩‍👧', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'The longtime champion of an expanded, monthly Child Tax Credit, DeLauro frames it as the most effective tool to cut child poverty.', source: S.delauro },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Backs Medicare drug-price negotiation and capping out-of-pocket costs, and has fought to protect that authority in appropriations fights.', source: S.delauro },
      { topic: 'Trade & Workers', icon: '🏭', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'A longtime skeptic of free-trade deals on labor and wage grounds, DeLauro favors trade enforcement that protects American workers over broad liberalization.', source: S.delauro },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Defends the Affordable Care Act and its subsidies and opposes Medicaid cuts, framing coverage as a cost-of-living issue.', source: S.delauro },
    ],
  },
  meeks: {
    roster: { name: 'Gregory Meeks', office: 'House Foreign Affairs Ranking Member', state: 'New York', party: 'D', score: 58, icon: '🌐', issues: ['Foreign Policy', 'Israel & Ukraine', 'Diplomacy', 'Trade'] },
    label: 'Gregory Meeks — 🌐 House Foreign Affairs Ranking Member (D-NY)',
    cards: [
      { topic: 'Israel Aid & Two-State', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'The top Democrat on Foreign Affairs, Meeks supports Israel\'s security and its U.S. aid while backing humanitarian assistance and a two-state framework, positioning himself between unconditional support and conditioning aid.',
        evidence: 'Ranking Member of the House Foreign Affairs Committee.', source: S.hfac_dem },
      { topic: 'Ukraine & Alliances', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A strong supporter of aid to Ukraine and of NATO and U.S. alliances, Meeks frames them as cheaper than the conflicts they deter.', source: S.meeks },
      { topic: 'Diplomacy & Foreign Aid', icon: '🕊', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Defends diplomacy, development, and foreign assistance against deep cuts, arguing soft power protects U.S. interests and cedes less ground to China.', source: S.meeks },
      { topic: 'Trade', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'Generally favors engagement and market-opening trade with labor and environmental standards, and warns broad tariffs can raise costs and strain allies.', source: S.meeks },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs comprehensive immigration reform with a pathway to citizenship alongside orderly border management.', source: S.meeks },
    ],
  },
  raskin: {
    roster: { name: 'Jamie Raskin', office: 'House Judiciary Ranking Member', state: 'Maryland', party: 'D', score: 59, icon: '⚖️', issues: ['Judiciary & Oversight', 'Immigration', 'AI & Tech', 'Democracy'] },
    label: 'Jamie Raskin — ⚖️ House Judiciary Ranking Member (D-MD)',
    cards: [
      { topic: 'Immigration & Due Process', icon: '🛂', pos: 'oppose', issueKey: 'immigration_reform', issueStance: 'oppose',
        text: 'A constitutional-law professor and the top Democrat on Judiciary, Raskin opposes mass-deportation tactics he argues bypass due process, pressing for judicial review and legal protections while supporting orderly reform.',
        evidence: 'Ranking Member of the House Judiciary Committee.', source: S.judiciary_dem },
      { topic: 'Oversight & Democracy', icon: '🏛', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Centers checks on executive power, government ethics, and the rule of law, and leads Democratic oversight of the Justice Department and the courts.', source: S.raskin },
      { topic: 'AI & Tech Accountability', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Backs guardrails for AI — transparency, protections against deepfakes and discrimination, and competition enforcement — through the committee\'s jurisdiction over the courts and antitrust.', source: S.raskin },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Supports universal background checks and an assault-weapons ban, drawing on his committee\'s jurisdiction over firearms law.', source: S.raskin },
      { topic: 'Voting Rights', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Champions expanded voting access and federal voting-rights legislation, opposing measures he argues restrict the franchise.', source: S.raskin },
    ],
  },
  neal: {
    roster: { name: 'Richard Neal', office: 'House Ways & Means Ranking Member', state: 'Massachusetts', party: 'D', score: 58, icon: '💵', issues: ['Trade & Tariffs', 'Taxes', 'Social Security', 'Healthcare'] },
    label: 'Richard Neal — 💵 House Ways & Means Ranking Member (D-MA)',
    cards: [
      { topic: 'Trade & Tariffs', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'The top Democrat on Ways & Means, which holds trade jurisdiction, Neal supports enforceable trade agreements and worker protections but warns broad, across-the-board tariffs act as a tax that raises consumer prices.',
        evidence: 'Ranking Member of the House Ways & Means Committee.', source: S.waysmeans_dem },
      { topic: 'Taxes & Working Families', icon: '🧾', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Opposed the 2025 tax law\'s tilt toward high earners and corporations and favors expanding middle-class and family tax credits.', source: S.neal },
      { topic: 'Trade Authority', icon: '⚖️', pos: 'mixed', issueKey: 'tariffs_authority', issueStance: 'mixed',
        text: 'Argues Congress — not unilateral emergency action — should set tariff policy, and has pressed for consultation and votes on major trade measures.', source: S.neal },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Defends Social Security and Medicare against benefit cuts and has pushed to repeal provisions that reduced benefits for some public workers.', source: S.neal },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Backs protecting and expanding ACA coverage and lowering premiums and drug costs.', source: S.neal },
    ],
  },
  pallone: {
    roster: { name: 'Frank Pallone', office: 'House Energy & Commerce Ranking Member', state: 'New Jersey', party: 'D', score: 58, icon: '⚡', issues: ['Clean Energy', 'AI & Privacy', 'Drug Prices', 'Healthcare'] },
    label: 'Frank Pallone — ⚡ House Energy & Commerce Ranking Member (D-NJ)',
    cards: [
      { topic: 'Clean Energy & Climate', icon: '🌱', pos: 'oppose', issueKey: 'enviro_energy', issueStance: 'oppose',
        text: 'The top Democrat on Energy & Commerce, Pallone backs clean-energy deployment and emissions limits and opposes rollbacks of power-plant and vehicle rules he argues protect public health — a contrast with the panel\'s fossil-forward "abundance" push.',
        evidence: 'Ranking Member of the House Energy & Commerce Committee.', source: S.ec_dem },
      { topic: 'AI & Data Privacy', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'A longtime advocate for a national data-privacy law, Pallone backs AI transparency and consumer protections and a federal standard with real enforcement.', source: S.pallone },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'A principal author of Medicare drug-price negotiation, Pallone defends it and pushes to expand the number of drugs covered.', source: S.pallone },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Defends the ACA and Medicaid and opposes coverage cuts, treating access as a core committee priority.', source: S.pallone },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Supports consumer-protection and safety rules across telecom, product safety, and online platforms, resisting broad deregulation.', source: S.pallone },
    ],
  },
  adam_smith: {
    roster: { name: 'Adam Smith', office: 'House Armed Services Ranking Member', state: 'Washington', party: 'D', score: 58, icon: '🛡', issues: ['Defense', 'Pentagon Reform', 'Israel & Ukraine', 'Defense Tech'] },
    label: 'Adam Smith — 🛡 House Armed Services Ranking Member (D-WA)',
    cards: [
      { topic: 'Defense Budget & Reform', icon: '🛡', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: 'The top Democrat on Armed Services, Smith supports a strong, capable military but is a persistent critic of Pentagon waste, pushing for a clean audit and smarter procurement rather than automatic budget growth.',
        evidence: 'Ranking Member of the House Armed Services Committee.', source: S.hasc_dem },
      { topic: 'Israel Aid & Conditions', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s defense and its missile-defense funding while backing humanitarian access and compliance with U.S. law on civilian harm.', source: S.adam_smith },
      { topic: 'Ukraine Aid', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A firm supporter of sustained military aid to Ukraine as a check on Russian aggression.', source: S.adam_smith },
      { topic: 'Defense Technology & AI', icon: '🛰', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Prioritizes modernizing the military around AI, autonomy, and cyber, and reforming acquisition to field new technology faster.', source: S.adam_smith },
      { topic: 'Aerospace & Jobs', icon: '✈️', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Represents a major aerospace state and works on Boeing, shipbuilding, and the defense-industrial workforce.', source: S.adam_smith },
    ],
  },
  hagerty: {
    roster: { name: 'Bill Hagerty', office: 'U.S. Senator', state: 'Tennessee', party: 'R', score: 58, icon: '🌐', issues: ['Trade & Tariffs', 'Foreign Policy', 'Border Security', 'Digital Assets'] },
    label: 'Bill Hagerty — 🌐 U.S. Senator (R-TN)',
    cards: [
      { topic: 'Trade & Tariffs', icon: '📦', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: 'A former ambassador and business executive, Hagerty supports tariffs and tougher trade terms as leverage to reshore manufacturing and counter China.', source: S.hagerty },
      { topic: 'Foreign Policy & Israel', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'The former U.S. Ambassador to Japan is a strong supporter of Israel and its security aid and of a hard line toward Iran, framing alliances as core to deterrence.', source: S.hagerty },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter enforcement, more detention and removal capacity, and tighter asylum rules.', source: S.hagerty },
      { topic: 'Digital Assets', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: 'On the Banking Committee, Hagerty backed the GENIUS Act stablecoin framework and clear crypto rules to keep the industry in the U.S., while opposing a government-run CBDC.', source: S.hagerty },
      { topic: 'Taxes & Economy', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Supported making the 2017 tax cuts permanent and favors deregulation to spur growth and investment.', source: S.hagerty },
    ],
  },
  britt: {
    roster: { name: 'Katie Britt', office: 'U.S. Senator', state: 'Alabama', party: 'R', score: 58, icon: '🏛', issues: ['Appropriations', 'Border Security', 'Energy', 'Families'] },
    label: 'Katie Britt — 🏛 U.S. Senator (R-AL)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Britt made border security a signature issue — including in her 2024 national address — backing more agents and barriers, tighter asylum rules, and fentanyl interdiction.', source: S.britt },
      { topic: 'Spending & Appropriations', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'On the Appropriations Committee, Britt backs spending restraint and stronger oversight while working to fund defense, border, and Alabama priorities through regular order.', source: S.britt },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Supports expanded domestic energy — oil, gas, and nuclear — and opposes rules she argues raise costs and threaten reliability.', source: S.britt },
      { topic: 'Families & Child Care', icon: '👨‍👩‍👧', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'Champions child-care access and pro-family tax policy, framing affordability for working parents as an economic priority.', source: S.britt },
      { topic: 'Support for Israel', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A consistent supporter of Israel and its U.S. security aid and of a strong national defense.', source: S.britt },
    ],
  },
  banks: {
    roster: { name: 'Jim Banks', office: 'U.S. Senator', state: 'Indiana', party: 'R', score: 57, icon: '🦅', issues: ['China & Trade', 'Defense', 'Border Security', 'Manufacturing'] },
    label: 'Jim Banks — 🦅 U.S. Senator (R-IN)',
    cards: [
      { topic: 'China & Trade', icon: '🐉', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: 'A leading China hawk, Banks backs tariffs, investment limits, and decoupling from Beijing in critical sectors, framing economic pressure as national security.', source: S.banks },
      { topic: 'Defense & Israel', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A Navy veteran, Banks supports higher defense spending and robust aid to Israel, and a hard line on Iran.', source: S.banks },
      { topic: 'Reshoring & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: 'Ties trade and tariff policy to rebuilding Indiana manufacturing and industrial jobs, favoring domestic production over cheaper imports.', source: S.banks },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement, more removals, and tighter asylum rules tied to the fentanyl fight.', source: S.banks },
      { topic: 'AI & China', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'Frames AI mainly through competition with China — favoring export controls on advanced chips and a light domestic touch to keep the U.S. ahead.', source: S.banks },
    ],
  },
  coons: {
    roster: { name: 'Chris Coons', office: 'U.S. Senator', state: 'Delaware', party: 'D', score: 60, icon: '🕊', issues: ['Foreign Aid', 'Israel & Ukraine', 'Clean Energy', 'Bipartisanship'] },
    label: 'Chris Coons — 🕊 U.S. Senator (D-DE)',
    cards: [
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'On Foreign Relations and Appropriations, Coons supports military aid to Israel and Ukraine and a robust U.S. role abroad, backing the 2024 national-security supplemental.', source: S.crs_israel },
      { topic: 'Foreign Aid & Diplomacy', icon: '🕊', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A leading defender of development and diplomacy funding, Coons argues foreign aid and soft power advance U.S. interests and counter China at a fraction of military costs.', source: S.coons },
      { topic: 'Clean Energy', icon: '🌱', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Champions clean-energy research and an innovation-driven climate approach, working across the aisle on nuclear, hydrogen, and carbon-capture R&D.', source: S.coons },
      { topic: 'Bipartisan Dealmaking', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Known for cross-party negotiation on spending and foreign policy, Coons often brokers compromises, which supporters call pragmatism and critics call caution.', source: S.coons },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Backs protecting ACA coverage and lowering prescription and premium costs.', source: S.coons },
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

console.log(`PolitiDex — National ranking members & senators WAVE 4  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National ranking members & senators · top-down federal wave 4 (July 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    warner                  : { name:'Mark Warner', office:'Senate Intelligence Committee Vice Chair', state:'Virginia', party:'D', score:60, kept:0, broken:0, pending:0, icon:'🛰', issues:['AI & Tech','Semiconductors','Digital Assets','National Security'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterAnchor)) {
  const block = '\n    // National 14 — House ranking members + senators, wave 4 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or anchor missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
