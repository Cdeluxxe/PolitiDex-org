#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: DIPLOMACY & ECONOMIC PRINCIPALS,
// MORE CABINET, AND INFLUENTIAL MEMBERS, WAVE 9 (July 2026) — continuing the
// top-down push after waves 1-8.
// ---------------------------------------------------------------------------
// Waves 1-8 built the President/VP, the floor leaders and whips, the committee
// chairs and ranking members, most of the Cabinet, the trade and immigration
// policy principals, and much of both parties' leadership. This wave adds the
// highest-leverage figures still missing — the chief Middle East envoy and the
// top White House economist, another Cabinet secretary, and influential
// senators and representatives from both parties — each mapped to the recent
// Issue Spotlights (Israel aid, Ukraine, border, tariffs, spending, energy, AI,
// crypto, and trust in institutions):
//
//   • STEVE WITKOFF (witkoff) — U.S. Special Envoy to the Middle East: the
//     administration's lead negotiator on Gaza ceasefire/hostage talks, Iran,
//     and Russia-Ukraine diplomacy.
//   • KEVIN HASSETT (hassett) — Director, National Economic Council: growth,
//     tariffs, taxes, and interest rates / the Fed.
//   • LINDA McMAHON (mcmahon) — U.S. Secretary of Education: the department's
//     future, school choice, student loans, and parental rights.
//   • THOM TILLIS (tillis) — U.S. Senator (R-NC): an independent streak on
//     nominees and Medicaid, defense and alliances, immigration, and spending.
//   • BRIAN FITZPATRICK (fitzpatrick) — U.S. Rep. (R-PA), Problem Solvers
//     co-chair: bipartisanship, Ukraine aid, border, and energy/environment.
//   • BEN RAY LUJAN (lujan) — Assistant Senate Democratic Leader (D-NM):
//     broadband, healthcare, clean energy, and the border.
//   • RITCHIE TORRES (torres) — U.S. Rep. (D-NY): a staunch pro-Israel Democrat
//     on aid, plus housing, crypto, and anti-poverty.
//   • ILHAN OMAR (omar) — U.S. Rep. (D-MN): a leading critic of unconditional
//     Israel aid, plus immigration, workers, and healthcare.
//   • ED MARKEY (markey) — U.S. Senator (D-MA): climate and the Green New Deal,
//     clean energy, tech and AI, and telecom/privacy.
//   • JIM CLYBURN (clyburn) — U.S. Rep. (D-SC), former Majority Whip: voting
//     rights, rural infrastructure and broadband, healthcare, and HBCUs.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Contested and
// two-sided records (Middle East and Iran diplomacy, tariffs and inflation, the
// Education Department's future, conditions on Israel aid) are marked mixed and
// attributed to both sides. Positions are the documented public record; quotes
// only where genuinely on the record, otherwise paraphrased. Sources are
// official agency/member/committee pages and reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-diplomacy-members-wave9-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-diplomacy-members-wave9-jul2026.mjs --apply    # write
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
  wh:        { label: 'The White House', url: 'https://www.whitehouse.gov/administration/' },
  state:     { label: 'U.S. Department of State', url: 'https://www.state.gov/' },
  ed:        { label: 'U.S. Department of Education', url: 'https://www.ed.gov/' },
  tillis:    { label: 'tillis.senate.gov', url: 'https://www.tillis.senate.gov/press-releases' },
  fitz:      { label: 'fitzpatrick.house.gov', url: 'https://fitzpatrick.house.gov/media/press-releases' },
  lujan:     { label: 'lujan.senate.gov', url: 'https://www.lujan.senate.gov/newsroom/press-releases/' },
  torres:    { label: 'ritchietorres.house.gov', url: 'https://ritchietorres.house.gov/media/press-releases' },
  omar:      { label: 'omar.house.gov', url: 'https://omar.house.gov/media/press-releases' },
  markey:    { label: 'markey.senate.gov', url: 'https://www.markey.senate.gov/news/press-releases' },
  clyburn:   { label: 'clyburn.house.gov', url: 'https://clyburn.house.gov/press-releases' },
  crs_israel:{ label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
};

const NEW = {
  witkoff: {
    roster: { name: 'Steve Witkoff', office: 'U.S. Special Envoy to the Middle East', state: 'New York', party: 'R', score: 55, icon: '🕊', issues: ['Middle East Diplomacy', 'Israel & Gaza', 'Iran', 'Ukraine Talks'] },
    label: 'Steve Witkoff — 🕊 U.S. Special Envoy to the Middle East',
    cards: [
      { topic: 'Middle East Diplomacy', icon: '🕊', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "As special envoy, Witkoff is the administration's lead Middle East negotiator, brokering Gaza ceasefire and hostage talks and conducting shuttle diplomacy across the region.",
        evidence: 'U.S. Special Envoy to the Middle East.', source: S.wh },
      { topic: 'Israel & Gaza', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Works closely with Israel on hostage releases and ceasefire terms while pressing for arrangements to wind down the Gaza war.", source: S.state },
      { topic: 'Iran', icon: '☢️', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: "Has led direct and back-channel diplomacy with Iran over its nuclear program, pairing pressure with negotiation.", source: S.state },
      { topic: 'Ukraine-Russia Talks', icon: '🕊', pos: 'mixed', issueKey: 'restraint', issueStance: 'mixed',
        text: "Also tapped for Russia-Ukraine diplomacy, Witkoff has met with Moscow to push a negotiated end to the war.", source: S.wh },
    ],
  },
  hassett: {
    roster: { name: 'Kevin Hassett', office: 'Director, National Economic Council', state: 'Massachusetts', party: 'R', score: 55, icon: '📈', issues: ['Economy & Growth', 'Tariffs', 'Taxes', 'The Fed'] },
    label: 'Kevin Hassett — 📈 Director, National Economic Council',
    cards: [
      { topic: 'Economy & Growth', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: "Director of the National Economic Council and a longtime economist, Hassett coordinates economic policy around growth, deregulation, and extending the 2017 tax cuts.",
        evidence: 'Director of the National Economic Council.', source: S.wh },
      { topic: 'Tariffs', icon: '📦', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: "Defends the administration's tariff strategy as leverage to rebalance trade and revive manufacturing, arguing the inflation impact is modest — a view many economists dispute.", source: S.wh },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: "A principal advocate for making the 2017 tax cuts permanent and for further pro-growth tax relief.", source: S.wh },
      { topic: 'Interest Rates & the Fed', icon: '🏦', pos: 'mixed', issueKey: 'econ_balance', issueStance: 'mixed',
        text: "Has argued for lower interest rates and been floated as a possible Federal Reserve chair, raising debate over the central bank's independence.", source: S.wh },
    ],
  },
  mcmahon: {
    roster: { name: 'Linda McMahon', office: 'U.S. Secretary of Education', state: 'Connecticut', party: 'R', score: 54, icon: '🎓', issues: ['Dept. of Education', 'School Choice', 'Student Loans', 'Parental Rights'] },
    label: 'Linda McMahon — 🎓 U.S. Secretary of Education',
    cards: [
      { topic: "The Department's Future", icon: '🏛', pos: 'mixed', issueKey: 'edu_balance', issueStance: 'mixed',
        text: "As Education secretary, McMahon has moved to shrink the department and shift authority to states, in line with the goal of dismantling it — supporters call it returning control to states, while critics warn about civil-rights enforcement and funding.",
        evidence: 'U.S. Secretary of Education.', source: S.ed },
      { topic: 'School Choice', icon: '🎒', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: "Backs school choice, charter schools, and expanded education options for families.", source: S.ed },
      { topic: 'Student Loans', icon: '🎓', pos: 'mixed', issueKey: 'edu_college_cost', issueStance: 'mixed',
        text: "Oversees federal student-loan policy, favoring tighter limits and accountability over broad loan forgiveness.", source: S.ed },
      { topic: 'Parental Rights & Curriculum', icon: '📚', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: "Supports parental rights in schooling and curriculum transparency.", source: S.ed },
    ],
  },
  tillis: {
    roster: { name: 'Thom Tillis', office: 'U.S. Senator', state: 'North Carolina', party: 'R', score: 57, icon: '🏛', issues: ['Independent Streak', 'Defense', 'Immigration', 'Spending'] },
    label: 'Thom Tillis — 🏛 U.S. Senator (R-NC)',
    cards: [
      { topic: 'An Independent Streak', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: "On Judiciary and Armed Services, Tillis has at times broken with his party — objecting to Medicaid cuts in the 2025 budget law before announcing he would not seek reelection.",
        evidence: 'Member of the Senate Judiciary and Armed Services Committees.', source: S.tillis },
      { topic: 'Defense & Alliances', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Supports a strong military, NATO, and continued aid to Ukraine.", source: S.tillis },
      { topic: 'Immigration', icon: '🛂', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: "Has worked on bipartisan border and immigration frameworks that pair enforcement with legal pathways.", source: S.tillis },
      { topic: 'Spending & Medicaid', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: "A fiscal conservative who nonetheless opposed deep Medicaid cuts he said would hurt North Carolina hospitals and patients.", source: S.tillis },
    ],
  },
  fitzpatrick: {
    roster: { name: 'Brian Fitzpatrick', office: 'U.S. Representative', state: 'Pennsylvania', party: 'R', score: 59, icon: '🤝', issues: ['Bipartisanship', 'Ukraine', 'Border', 'Energy'] },
    label: 'Brian Fitzpatrick — 🤝 U.S. Representative (R-PA)',
    cards: [
      { topic: 'Bipartisanship', icon: '🤝', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: "Co-chair of the bipartisan Problem Solvers Caucus and a former FBI agent, Fitzpatrick has one of the House's most cross-partisan records, backing bipartisan infrastructure and gun-safety deals.",
        evidence: 'Co-chair of the bipartisan Problem Solvers Caucus.', source: S.fitz },
      { topic: 'Ukraine Aid', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "A strong supporter of military and economic aid to Ukraine against Russia.", source: S.fitz },
      { topic: 'Border Security', icon: '🛂', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: "Backs border security paired with legal pathways and a bipartisan immigration fix.", source: S.fitz },
      { topic: 'Energy & Environment', icon: '🌱', pos: 'mixed', issueKey: 'enviro_balance', issueStance: 'mixed',
        text: "Supports an all-of-the-above energy mix and conservation, and co-chairs the bipartisan Climate Solutions Caucus.", source: S.fitz },
    ],
  },
  lujan: {
    roster: { name: 'Ben Ray Luján', office: 'Assistant Senate Democratic Leader', state: 'New Mexico', party: 'D', score: 58, icon: '📶', issues: ['Broadband', 'Healthcare', 'Clean Energy', 'Border'] },
    label: 'Ben Ray Luján — 📶 Assistant Senate Democratic Leader (D-NM)',
    cards: [
      { topic: 'Broadband & Connectivity', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: "The Assistant Senate Democratic Leader, Luján champions rural broadband and closing the digital divide from his Commerce Committee seat.",
        evidence: 'Assistant Senate Democratic Leader; member of the Commerce Committee.', source: S.lujan },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Focuses on rural health care, protecting the ACA and Medicaid, and lowering drug costs.", source: S.lujan },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "From New Mexico, backs clean-energy jobs and the grid alongside the state's oil-and-gas economy.", source: S.lujan },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: "From a border state, supports border security paired with immigration reform and a path to citizenship.", source: S.lujan },
    ],
  },
  torres: {
    roster: { name: 'Ritchie Torres', office: 'U.S. Representative', state: 'New York', party: 'D', score: 58, icon: '🗽', issues: ['Israel Aid', 'Housing', 'Crypto', 'Anti-Poverty'] },
    label: 'Ritchie Torres — 🗽 U.S. Representative (D-NY)',
    cards: [
      { topic: 'Israel Aid', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "One of the most vocal pro-Israel Democrats, Torres strongly supports U.S. military aid and the alliance and has been an outspoken critic of efforts to condition or cut it.",
        evidence: 'Member of the House Financial Services Committee.', source: S.torres },
      { topic: 'Housing & Affordability', icon: '🏠', pos: 'support', issueKey: 'housing', issueStance: 'support',
        text: "A former public-housing resident who oversaw NYCHA, Torres focuses on affordable housing, Section 8, and expanding supply.", source: S.torres },
      { topic: 'Digital Assets & Crypto', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: "On Financial Services, Torres backs clear crypto regulation and is among the more crypto-friendly Democrats.", source: S.torres },
      { topic: 'Anti-Poverty & Cost of Living', icon: '📊', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: "Focuses on lifting people out of poverty through the earned-income and child tax credits and cost-of-living relief.", source: S.torres },
    ],
  },
  omar: {
    roster: { name: 'Ilhan Omar', office: 'U.S. Representative', state: 'Minnesota', party: 'D', score: 55, icon: '🌍', issues: ['Israel & Gaza', 'Immigration', 'Workers', 'Healthcare'] },
    label: 'Ilhan Omar — 🌍 U.S. Representative (D-MN)',
    cards: [
      { topic: 'Israel Aid & Gaza', icon: '🕊', pos: 'oppose', issueKey: 'foreign_balance', issueStance: 'oppose',
        text: "A leading progressive critic of unconditional U.S. military aid to Israel, Omar has pushed to condition or restrict arms over the conduct of the Gaza war and civilian harm.",
        evidence: 'Member of the Congressional Progressive Caucus.', source: S.omar },
      { topic: 'Immigration & Refugees', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "A former refugee, Omar advocates for a path to citizenship and refugee resettlement and opposes mass deportation.", source: S.omar },
      { topic: 'Workers & Wages', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "Backs a higher minimum wage, union rights, and expanded social programs.", source: S.omar },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports Medicare for All and expanding coverage and lowering costs.", source: S.omar },
    ],
  },
  markey: {
    roster: { name: 'Ed Markey', office: 'U.S. Senator', state: 'Massachusetts', party: 'D', score: 58, icon: '🌎', issues: ['Climate', 'Clean Energy', 'Tech & AI', 'Privacy'] },
    label: 'Ed Markey — 🌎 U.S. Senator (D-MA)',
    cards: [
      { topic: 'Climate', icon: '🌡', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "A co-author of the Green New Deal resolution, Markey is one of the Senate's most aggressive climate advocates, pushing rapid decarbonization and clean-energy investment.",
        evidence: 'Co-author of the Green New Deal resolution.', source: S.markey },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Backs offshore wind, solar, and clean-energy manufacturing and opposes new fossil-fuel expansion.", source: S.markey },
      { topic: 'Tech & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "A longtime telecom and tech legislator, Markey pushes AI guardrails, children's online privacy, and net neutrality.", source: S.markey },
      { topic: 'Privacy & Telecom', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "Champions consumer privacy, children's online protection, and universal broadband access.", source: S.markey },
    ],
  },
  clyburn: {
    roster: { name: 'Jim Clyburn', office: 'U.S. Representative', state: 'South Carolina', party: 'D', score: 59, icon: '🗳', issues: ['Voting Rights', 'Rural Infrastructure', 'Healthcare', 'HBCUs'] },
    label: 'Jim Clyburn — 🗳 U.S. Representative (D-SC)',
    cards: [
      { topic: 'Voting Rights', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "A senior House Democrat and former majority whip, Clyburn is a leading advocate for restoring the Voting Rights Act and expanding ballot access.",
        evidence: 'Former House Majority Whip.', source: S.clyburn },
      { topic: 'Rural Infrastructure & Broadband', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: "Author of a rural-broadband initiative, Clyburn focuses on high-speed internet, water, and infrastructure for rural and underserved communities.", source: S.clyburn },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Defends the ACA and Medicaid and rural-hospital funding.", source: S.clyburn },
      { topic: 'HBCUs & College Access', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: "A champion of funding for historically Black colleges and universities and college affordability.", source: S.clyburn },
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

console.log(`PolitiDex — National diplomacy/economic principals & members WAVE 9  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National diplomacy/economic principals, more Cabinet & influential members · top-down federal wave 9 (Jul 2026) ─\n' +
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
  const block = '\n    // National — diplomacy/economic principals, more Cabinet + influential members, wave 9 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
