#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: LAST CABINET GAP, A CAUCUS CHAIR &
// INFLUENTIAL MEMBERS, WAVE 12 (July 2026) — continuing after waves 1-11.
// ---------------------------------------------------------------------------
// Waves 1-11 covered the President/VP, leadership and whips, the Cabinet and
// major agency chairs, the committee chairs and ranking members, and much of
// both parties' membership. The top of the federal org chart is now largely
// built; this wave adds the highest-leverage figures still missing — the last
// housing Cabinet secretary, the chair of the largest House conservative caucus,
// and influential senators and representatives from both parties (a moderate,
// a progressive, and pragmatic dealmakers) — each mapped to the recent Issue
// Spotlights (Israel aid, border, tariffs, spending, energy, AI, etc.):
//
//   • SCOTT TURNER (scott_turner) — U.S. Secretary of Housing & Urban Development:
//     housing supply, homelessness, Opportunity Zones, and deregulation.
//   • AUGUST PFLUGER (pfluger) — Republican Study Committee Chair (R-TX): the
//     RSC budget, energy, the border, and national security.
//   • DAN SULLIVAN (dan_sullivan) — U.S. Senator (R-AK): defense and the Arctic,
//     Alaska energy, China, and veterans.
//   • ROGER MARSHALL (roger_marshall) — U.S. Senator (R-KS), a physician:
//     healthcare, agriculture, the border, and spending.
//   • MIKE LAWLER (mike_lawler) — U.S. Rep. (R-NY): bipartisanship, Israel, the
//     SALT deduction, and the border.
//   • SUMMER LEE (summer_lee) — U.S. Rep. (D-PA): a critic of Israel aid, plus
//     workers, environmental justice, and healthcare.
//   • JOHN HICKENLOOPER (hickenlooper) — U.S. Senator (D-CO): all-of-the-above
//     energy, AI and innovation, small business, and immigration.
//   • PETER WELCH (welch) — U.S. Senator (D-VT): drug prices, consumer and
//     antitrust, agriculture, and climate.
//   • TINA SMITH (tina_smith) — U.S. Senator (D-MN): health and mental health,
//     housing, clean energy, and agriculture.
//   • MAXWELL FROST (maxwell_frost) — U.S. Rep. (D-FL): gun safety, climate,
//     youth and democracy, and healthcare.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Contested and
// two-sided records (housing-first vs. accountability, the SALT deduction,
// conditions on Israel aid, all-of-the-above energy) are marked mixed and
// attributed. Positions are the documented public record; quotes only where
// genuinely on the record, otherwise paraphrased. Sources are official
// agency/member/committee pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-members-wave12-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-members-wave12-jul2026.mjs --apply    # write
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
  hud:        { label: 'U.S. Department of Housing & Urban Development', url: 'https://www.hud.gov/' },
  pfluger:    { label: 'pfluger.house.gov', url: 'https://pfluger.house.gov/media/press-releases' },
  dsullivan:  { label: 'sullivan.senate.gov', url: 'https://www.sullivan.senate.gov/newsroom/press-releases' },
  rmarshall:  { label: 'marshall.senate.gov', url: 'https://www.marshall.senate.gov/newsroom/press-releases/' },
  lawler:     { label: 'lawler.house.gov', url: 'https://lawler.house.gov/media/press-releases' },
  summerlee:  { label: 'summerlee.house.gov', url: 'https://summerlee.house.gov/media/press-releases' },
  hick:       { label: 'hickenlooper.senate.gov', url: 'https://www.hickenlooper.senate.gov/press_releases/' },
  welch:      { label: 'welch.senate.gov', url: 'https://www.welch.senate.gov/newsroom/press-releases/' },
  tsmith:     { label: 'smith.senate.gov', url: 'https://www.smith.senate.gov/category/press-releases/' },
  frost:      { label: 'frost.house.gov', url: 'https://frost.house.gov/media/press-releases' },
};

const NEW = {
  scott_turner: {
    roster: { name: 'Scott Turner', office: 'U.S. Secretary of Housing & Urban Development', state: 'Texas', party: 'R', score: 55, icon: '🏠', issues: ['Housing', 'Homelessness', 'Opportunity Zones', 'Deregulation'] },
    label: 'Scott Turner — 🏠 U.S. Secretary of Housing & Urban Development',
    cards: [
      { topic: 'Housing Supply & HUD', icon: '🏠', pos: 'mixed', issueKey: 'housing', issueStance: 'mixed',
        text: "As HUD secretary and a former NFL player and Texas legislator, Turner emphasizes cutting regulations to spur housing construction and shifting toward state and local control — supporters call it efficiency, while critics warn about reduced federal assistance.",
        evidence: 'U.S. Secretary of Housing & Urban Development.', source: S.hud },
      { topic: 'Opportunity Zones', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: "Led the first-term White House Opportunity Zones council and champions private investment in distressed communities.", source: S.hud },
      { topic: 'Homelessness', icon: '🏚', pos: 'mixed', issueKey: 'homeless', issueStance: 'mixed',
        text: "Backs a shift toward treatment, work, and accountability in homelessness policy over housing-first-only approaches.", source: S.hud },
      { topic: 'Deregulation', icon: '✂️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: "Favors cutting federal housing regulations he argues raise the cost of building.", source: S.hud },
    ],
  },
  pfluger: {
    roster: { name: 'August Pfluger', office: 'Republican Study Committee Chair', state: 'Texas', party: 'R', score: 56, icon: '🐘', issues: ['Spending', 'Energy', 'Border', 'National Security'] },
    label: 'August Pfluger — 🐘 Republican Study Committee Chair (R-TX)',
    cards: [
      { topic: 'Spending & Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: "Chair of the Republican Study Committee — the largest House conservative caucus — Pfluger drives its budget blueprint of deep spending cuts and balanced-budget goals.",
        evidence: 'Chair of the Republican Study Committee.', source: S.pfluger },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "A former Air Force fighter pilot from the Permian Basin, Pfluger backs expanded oil and gas production and opposes drilling and LNG-export restrictions.", source: S.pfluger },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement, more barriers and agents, and tighter asylum limits.", source: S.pfluger },
      { topic: 'National Security', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Backs a strong military, aid to Israel, and countering China and Iran.", source: S.pfluger },
    ],
  },
  dan_sullivan: {
    roster: { name: 'Dan Sullivan', office: 'U.S. Senator', state: 'Alaska', party: 'R', score: 56, icon: '🎖', issues: ['Defense & Arctic', 'Alaska Energy', 'China', 'Veterans'] },
    label: 'Dan Sullivan — 🎖 U.S. Senator (R-AK)',
    cards: [
      { topic: 'Defense & the Arctic', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "A Marine Corps reserve officer on Armed Services, Sullivan pushes a larger Navy and Arctic security to counter Russia and China.",
        evidence: 'Member of the Senate Armed Services Committee; Marine officer.', source: S.dsullivan },
      { topic: 'Alaska Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Champions expanded oil, gas, and mineral development — including ANWR and Alaska LNG — and opposes federal land-use limits.", source: S.dsullivan },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: "A China hawk on trade, security, and fisheries, focused on countering Beijing in the Indo-Pacific.", source: S.dsullivan },
      { topic: 'Veterans & Fisheries', icon: '🎣', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "Focuses on veterans, the military community, and Alaska's fishing industry.", source: S.dsullivan },
    ],
  },
  roger_marshall: {
    roster: { name: 'Roger Marshall', office: 'U.S. Senator', state: 'Kansas', party: 'R', score: 55, icon: '🩺', issues: ['Healthcare', 'Agriculture', 'Border', 'Spending'] },
    label: 'Roger Marshall — 🩺 U.S. Senator (R-KS)',
    cards: [
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: "A physician, Marshall focuses on rural health care, price transparency, and market-based reforms over government-run coverage, and on reducing medical-supply dependence on China.",
        evidence: 'A physician (OB-GYN) in the U.S. Senate.', source: S.rmarshall },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From a leading farm state, backs the farm safety net, crop insurance, and agricultural exports on the Agriculture Committee.", source: S.rmarshall },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement, fentanyl interdiction, and tighter asylum limits.", source: S.rmarshall },
      { topic: 'Spending & Debt', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "A fiscal conservative who backs spending cuts and reducing the federal debt.", source: S.rmarshall },
    ],
  },
  mike_lawler: {
    roster: { name: 'Mike Lawler', office: 'U.S. Representative', state: 'New York', party: 'R', score: 58, icon: '🤝', issues: ['Bipartisanship', 'Israel', 'SALT', 'Border'] },
    label: 'Mike Lawler — 🤝 U.S. Representative (R-NY)',
    cards: [
      { topic: 'Bipartisanship', icon: '🤝', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: "A moderate from a swing district and a Problem Solvers Caucus member, Lawler emphasizes bipartisan governing and has at times broken with his party on votes.",
        evidence: 'Member of the bipartisan Problem Solvers Caucus.', source: S.lawler },
      { topic: 'Israel', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "A strong supporter of Israel and U.S. aid, and a lead sponsor of antisemitism-awareness legislation.", source: S.lawler },
      { topic: 'SALT Deduction', icon: '🏠', pos: 'mixed', issueKey: 'lower_taxes', issueStance: 'mixed',
        text: "A leading advocate for restoring the state-and-local-tax (SALT) deduction, at times withholding support for tax bills that lack it.", source: S.lawler },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs stronger border enforcement paired with support for legal immigration.", source: S.lawler },
    ],
  },
  summer_lee: {
    roster: { name: 'Summer Lee', office: 'U.S. Representative', state: 'Pennsylvania', party: 'D', score: 54, icon: '🌿', issues: ['Israel & Gaza', 'Workers', 'Environmental Justice', 'Healthcare'] },
    label: 'Summer Lee — 🌿 U.S. Representative (D-PA)',
    cards: [
      { topic: 'Israel Aid & Gaza', icon: '🕊', pos: 'oppose', issueKey: 'foreign_balance', issueStance: 'oppose',
        text: "A progressive critic of unconditional U.S. military aid to Israel, Lee has pushed to condition arms and backed ceasefire resolutions during the Gaza war.",
        evidence: 'Member of the Congressional Progressive Caucus.', source: S.summerlee },
      { topic: 'Workers & Unions', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "From western Pennsylvania, backs union rights, higher wages, and a worker-centered economy.", source: S.summerlee },
      { topic: 'Environmental Justice', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "Focuses on environmental justice, clean air, and climate action in industrial communities.", source: S.summerlee },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports Medicare for All and expanding coverage.", source: S.summerlee },
    ],
  },
  hickenlooper: {
    roster: { name: 'John Hickenlooper', office: 'U.S. Senator', state: 'Colorado', party: 'D', score: 57, icon: '🍺', issues: ['Energy', 'AI & Innovation', 'Small Business', 'Immigration'] },
    label: 'John Hickenlooper — 🍺 U.S. Senator (D-CO)',
    cards: [
      { topic: 'Energy', icon: '⚡', pos: 'mixed', issueKey: 'energy_production', issueStance: 'mixed',
        text: "A former geologist and governor, Hickenlooper backs an all-of-the-above approach — Colorado oil and gas alongside a clean-energy transition and methane controls.",
        evidence: 'Former Governor of Colorado; member of the Energy Committee.', source: S.hick },
      { topic: 'AI & Innovation', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Leads a subcommittee on innovation and pushes workforce training and guardrails for AI while supporting U.S. tech leadership.", source: S.hick },
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: "A former brewery founder, focuses on small business, entrepreneurship, and cutting red tape.", source: S.hick },
      { topic: 'Immigration', icon: '🛂', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: "Supports border security paired with immigration reform and a path to citizenship.", source: S.hick },
    ],
  },
  welch: {
    roster: { name: 'Peter Welch', office: 'U.S. Senator', state: 'Vermont', party: 'D', score: 57, icon: '🧾', issues: ['Drug Prices', 'Consumer & Antitrust', 'Agriculture', 'Climate'] },
    label: 'Peter Welch — 🧾 U.S. Senator (D-VT)',
    cards: [
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: "A longtime crusader on drug prices, Welch pushes Medicare negotiation, importation, and reining in pharmacy middlemen.",
        evidence: 'Member of the Senate Judiciary and Agriculture Committees.', source: S.welch },
      { topic: 'Consumer Protection & Antitrust', icon: '🏦', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: "On Judiciary, focuses on antitrust, Big Tech accountability, and consumer protection.", source: S.welch },
      { topic: 'Agriculture & Dairy', icon: '🧀', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From Vermont, backs dairy, small farms, and rural development.", source: S.welch },
      { topic: 'Climate & Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "Supports aggressive climate action and clean-energy investment.", source: S.welch },
    ],
  },
  tina_smith: {
    roster: { name: 'Tina Smith', office: 'U.S. Senator', state: 'Minnesota', party: 'D', score: 57, icon: '🌾', issues: ['Health & Mental Health', 'Housing', 'Clean Energy', 'Agriculture'] },
    label: 'Tina Smith — 🌾 U.S. Senator (D-MN)',
    cards: [
      { topic: 'Health & Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: "On the HELP Committee, Smith is a leading advocate for mental-health and maternal-health care and for protecting Medicaid and the ACA.",
        evidence: 'Member of the Senate HELP and Agriculture Committees.', source: S.tsmith },
      { topic: 'Housing', icon: '🏘', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: "On Banking, pushes federal investment to expand affordable-housing supply.", source: S.tsmith },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Backs clean-energy tax credits, transmission, and a transition to lower emissions.", source: S.tsmith },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From Minnesota, works on the Farm Bill, biofuels, and rural communities.", source: S.tsmith },
    ],
  },
  maxwell_frost: {
    roster: { name: 'Maxwell Frost', office: 'U.S. Representative', state: 'Florida', party: 'D', score: 55, icon: '🎸', issues: ['Gun Safety', 'Climate', 'Youth & Democracy', 'Healthcare'] },
    label: 'Maxwell Frost — 🎸 U.S. Representative (D-FL)',
    cards: [
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: "The first Gen Z member of Congress and a former gun-violence-prevention organizer, Frost is a leading advocate for gun-safety laws.",
        evidence: 'Former organizing director for a gun-violence-prevention group.', source: S.frost },
      { topic: 'Climate', icon: '🌡', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "Pushes aggressive climate action and a just transition for young and frontline communities.", source: S.frost },
      { topic: 'Youth & Democracy', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "Focuses on youth civic engagement, voting access, and democratic participation.", source: S.frost },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports expanding health coverage and affordable housing for young people.", source: S.frost },
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

console.log(`PolitiDex — National members WAVE 12  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National influential members (top largely built) · top-down federal wave 12 (Jul 2026) ─\n' +
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
  const block = '\n    // National — influential members, wave 12 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
