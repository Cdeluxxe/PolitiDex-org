#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: TRADE/POLICY PRINCIPALS, PARTY
// LEADERS & INFLUENTIAL MEMBERS, WAVE 8 (July 2026) — continuing the top-down
// push after waves 1-7.
// ---------------------------------------------------------------------------
// Waves 1-7 built the President/VP, the floor leaders, the committee chairs and
// ranking members, the senior Cabinet, two national-security agency heads, and
// much of the Democratic congressional leadership. This wave adds the
// highest-leverage figures still missing — the administration's chief trade and
// immigration-policy principals, two more party leaders, and influential
// senators and representatives from both parties (and one independent) — each
// mapped to the recent Issue Spotlights (Israel aid, border, tariffs, spending,
// energy, AI, and trust in institutions):
//
//   • JAMIESON GREER (greer) — U.S. Trade Representative: the administration's
//     lead trade negotiator and a principal architect of its tariff strategy.
//   • STEPHEN MILLER (stephen_miller) — White House Deputy Chief of Staff for
//     Policy & Homeland Security Advisor: the chief architect of the border and
//     immigration-enforcement agenda (contested; attributed to both sides).
//   • MARSHA BLACKBURN (blackburn) — U.S. Senator (R-TN): kids-online-safety and
//     AI guardrails, the border, spending, and data privacy.
//   • RICK SCOTT (rick_scott) — U.S. Senator (R-FL): spending and the debt,
//     health-care fraud and transparency, the border, and China.
//   • VIRGINIA FOXX (foxx) — U.S. Rep. (R-NC), Rules Committee chair: higher-ed
//     reform, workforce and apprenticeships, spending, and House floor process.
//   • GREG CASAR (casar) — U.S. Rep. (D-TX), Progressive Caucus chair: workers
//     and wages, AI and automation, immigration, and healthcare.
//   • TED LIEU (ted_lieu) — U.S. Rep. (D-CA), Democratic Caucus vice chair: AI
//     regulation, oversight, foreign policy, and data privacy.
//   • ANGUS KING (angus_king) — U.S. Senator (I-ME): energy and the grid,
//     intelligence, Israel and Ukraine aid, and institutions.
//   • BRIAN SCHATZ (schatz) — U.S. Senator (D-HI), Chief Deputy Whip: climate
//     and clean energy, tech and AI, foreign aid, and housing supply.
//   • ROBERT GARCIA (robert_garcia) — U.S. Rep. (D-CA), Oversight ranking
//     member: oversight and accountability, immigration, democracy, LGBTQ rights.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never "his party." Contested and
// two-sided records (mass deportation, executive power, Rick Scott's sunset
// proposal, conditions on Israel aid) are marked mixed and attributed to both
// sides. Positions are the documented public record; quotes only where genuinely
// on the record, otherwise paraphrased. Sources are official member/agency
// pages, committees, and reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-trade-leaders-wave8-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-trade-leaders-wave8-jul2026.mjs --apply    # write
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
  ustr:      { label: 'Office of the U.S. Trade Representative', url: 'https://ustr.gov/' },
  wh:        { label: 'The White House', url: 'https://www.whitehouse.gov/administration/' },
  blackburn: { label: 'blackburn.senate.gov', url: 'https://www.blackburn.senate.gov/news/press-releases' },
  rickscott: { label: 'rickscott.senate.gov', url: 'https://www.rickscott.senate.gov/newsroom/press-releases' },
  foxx:      { label: 'foxx.house.gov', url: 'https://foxx.house.gov/news/' },
  casar:     { label: 'casar.house.gov', url: 'https://casar.house.gov/media/press-releases' },
  lieu:      { label: 'lieu.house.gov', url: 'https://lieu.house.gov/media-center/press-releases' },
  king:      { label: 'king.senate.gov', url: 'https://www.king.senate.gov/newsroom/press-releases' },
  schatz:    { label: 'schatz.senate.gov', url: 'https://www.schatz.senate.gov/news/press-releases' },
  garcia:    { label: 'robertgarcia.house.gov', url: 'https://robertgarcia.house.gov/media/press-releases' },
  oversight: { label: 'House Oversight Committee Democrats', url: 'https://oversightdemocrats.house.gov/' },
  sintel:    { label: 'Senate Select Committee on Intelligence', url: 'https://www.intelligence.senate.gov/' },
  crs_israel:{ label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
};

const NEW = {
  greer: {
    roster: { name: 'Jamieson Greer', office: 'U.S. Trade Representative', state: 'Federal', party: 'R', score: 55, icon: '📦', issues: ['Tariffs & Trade', 'China', 'Reshoring', 'Trade Deals'] },
    label: 'Jamieson Greer — 📦 U.S. Trade Representative',
    cards: [
      { topic: 'Tariffs & Trade Strategy', icon: '📦', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: "As U.S. Trade Representative, Greer is the administration's lead trade negotiator and a principal architect of its tariff strategy, framing tariffs and tougher terms as tools to rebuild U.S. industry and rebalance trade.",
        evidence: 'U.S. Trade Representative.', source: S.ustr },
      { topic: 'China Trade', icon: '🇨🇳', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: "A veteran of the first-term China trade fights as chief of staff to the prior USTR, Greer pushes to counter what he calls China's unfair practices through tariffs and enforcement.", source: S.ustr },
      { topic: 'Trade Deals & Market Access', icon: '🤝', pos: 'support', issueKey: 'econ_trade', issueStance: 'support',
        text: "Leads renegotiation of trade agreements and market-opening deals, arguing reciprocal terms protect American workers and farmers.", source: S.ustr },
      { topic: 'Reshoring & Supply Chains', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "Frames trade policy around reshoring critical supply chains and rebuilding domestic manufacturing capacity.", source: S.ustr },
    ],
  },
  stephen_miller: {
    roster: { name: 'Stephen Miller', office: 'White House Deputy Chief of Staff', state: 'California', party: 'R', score: 53, icon: '🛂', issues: ['Immigration', 'Border', 'Deportations', 'Executive Power'] },
    label: 'Stephen Miller — 🛂 White House Deputy Chief of Staff (Policy)',
    cards: [
      { topic: 'Border & Immigration Enforcement', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "The White House deputy chief of staff for policy and homeland security adviser, Miller is the chief architect of the administration's border and immigration-enforcement agenda — maximal enforcement, expanded detention, and reduced asylum access.",
        evidence: 'White House Deputy Chief of Staff for Policy; Homeland Security Advisor.', source: S.wh },
      { topic: 'Mass Deportations', icon: '✈️', pos: 'support', issueKey: 'deportations', issueStance: 'support',
        text: "Drives the administration's mass-deportation effort, including expanded expedited removal — an approach supporters call overdue enforcement and critics warn raises due-process and civil-liberties concerns.", source: S.wh },
      { topic: 'Legal Immigration Levels', icon: '📋', pos: 'oppose', issueKey: 'immig_legal', issueStance: 'oppose',
        text: "Favors sharp reductions in legal-immigration levels alongside enforcement, a long-held position from his years shaping immigration policy.", source: S.wh },
      { topic: 'Executive Power', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: "A proponent of aggressive use of executive authority to carry out the agenda — praised by supporters as decisive and criticized by others as straining the balance of power.", source: S.wh },
    ],
  },
  blackburn: {
    roster: { name: 'Marsha Blackburn', office: 'U.S. Senator', state: 'Tennessee', party: 'R', score: 55, icon: '🎸', issues: ['Kids Online Safety & AI', 'Border', 'Spending', 'Data Privacy'] },
    label: 'Marsha Blackburn — 🎸 U.S. Senator (R-TN)',
    cards: [
      { topic: 'Kids Online Safety & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "A lead sponsor of the Kids Online Safety Act, Blackburn backs guardrails on Big Tech and AI to protect children and consumers online, while favoring continued U.S. tech leadership.",
        evidence: 'Lead sponsor of the Kids Online Safety Act.', source: S.blackburn },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs strict border enforcement, more barriers and agents, and curbing fentanyl trafficking.", source: S.blackburn },
      { topic: 'Spending & Debt', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "Supports spending restraint and reducing the federal debt.", source: S.blackburn },
      { topic: 'Data Privacy', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "Pushes federal data-privacy protections and transparency from technology platforms.", source: S.blackburn },
    ],
  },
  rick_scott: {
    roster: { name: 'Rick Scott', office: 'U.S. Senator', state: 'Florida', party: 'R', score: 55, icon: '📉', issues: ['Spending & Debt', 'Healthcare', 'Border', 'China'] },
    label: 'Rick Scott — 📉 U.S. Senator (R-FL)',
    cards: [
      { topic: 'Spending & the Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: "A former governor and businessman, Scott is a fiscal hawk who pushes deep spending cuts and a balanced budget; his proposal to sunset federal programs unless reauthorized drew criticism that it could threaten Social Security and Medicare, which Scott says he would exempt.",
        evidence: 'Former Governor of Florida.', source: S.rickscott },
      { topic: 'Healthcare Costs & Fraud', icon: '⚕️', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: "From a health-care business background, Scott focuses on price transparency and rooting out Medicare and Medicaid fraud, and opposes expansions he calls government-run care.", source: S.rickscott },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs strict border enforcement, more agents and barriers, and tighter asylum rules.", source: S.rickscott },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: "A China hawk on trade, security, and investment, backing tariffs and restrictions on Chinese firms.", source: S.rickscott },
    ],
  },
  foxx: {
    roster: { name: 'Virginia Foxx', office: 'House Rules Committee Chair', state: 'North Carolina', party: 'R', score: 56, icon: '📜', issues: ['Higher-Ed Reform', 'Workforce', 'Spending', 'House Rules'] },
    label: 'Virginia Foxx — 📜 House Rules Committee Chair (R-NC)',
    cards: [
      { topic: 'Higher-Education Reform', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: "A former community-college president and Education & Workforce chair, Foxx pushes college price transparency, accountability for student outcomes, and reining in federal student-loan costs.",
        evidence: 'Former Chair of the House Education & the Workforce Committee.', source: S.foxx },
      { topic: 'Workforce & Apprenticeships', icon: '🛠', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: "Champions career and technical education, apprenticeships, and workforce training over a college-for-all model.", source: S.foxx },
      { topic: 'Spending & Debt', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "A fiscal conservative who backs spending restraint and reducing the federal debt.", source: S.foxx },
      { topic: 'House Rules & Floor Process', icon: '📜', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: "As chair of the Rules Committee, oversees the terms under which legislation reaches the House floor.",
        evidence: 'Chair of the House Committee on Rules.', source: S.foxx },
    ],
  },
  casar: {
    roster: { name: 'Greg Casar', office: 'Congressional Progressive Caucus Chair', state: 'Texas', party: 'D', score: 57, icon: '✊', issues: ['Workers & Wages', 'AI & Automation', 'Immigration', 'Healthcare'] },
    label: 'Greg Casar — ✊ Congressional Progressive Caucus Chair (D-TX)',
    cards: [
      { topic: 'Workers & Wages', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "Chair of the Congressional Progressive Caucus and a former labor organizer, Casar champions higher wages, union rights, worker heat-safety rules, and anti-price-gouging measures.",
        evidence: 'Chair of the Congressional Progressive Caucus.', source: S.casar },
      { topic: 'AI & Automation', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Pushes worker protections and guardrails as AI and automation reshape the labor market.", source: S.casar },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "From Texas, backs a path to citizenship and humane border policy over mass deportation.", source: S.casar },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports expanding coverage and lowering costs, including protecting Medicaid and cutting drug prices.", source: S.casar },
    ],
  },
  ted_lieu: {
    roster: { name: 'Ted Lieu', office: 'House Democratic Caucus Vice Chair', state: 'California', party: 'D', score: 58, icon: '💻', issues: ['AI & Tech', 'Oversight', 'Foreign Policy', 'Data Privacy'] },
    label: 'Ted Lieu — 💻 House Democratic Caucus Vice Chair (D-CA)',
    cards: [
      { topic: 'AI Regulation', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "The House Democratic Caucus vice chair and one of the few members with a computer-science degree, Lieu is a leading voice for AI regulation, calling for a federal framework and guardrails on high-risk uses.",
        evidence: 'Vice Chair of the House Democratic Caucus; holds a computer-science degree.', source: S.lieu },
      { topic: 'Oversight & Rule of Law', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A former Air Force JAG officer, Lieu focuses on oversight, the rule of law, and checks on executive power.", source: S.lieu },
      { topic: 'Foreign Policy', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "On Foreign Affairs, supports Israel's security and Ukraine aid while backing diplomacy and attention to humanitarian conditions.", source: S.lieu },
      { topic: 'Data Privacy', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "Pushes consumer data-privacy protections and limits on government and commercial surveillance.", source: S.lieu },
    ],
  },
  angus_king: {
    roster: { name: 'Angus King', office: 'U.S. Senator (Independent)', state: 'Maine', party: 'I', score: 60, icon: '🧭', issues: ['Energy & Grid', 'Intelligence', 'Israel & Ukraine', 'Institutions'] },
    label: 'Angus King — 🧭 U.S. Senator (I-ME)',
    cards: [
      { topic: 'Energy & the Grid', icon: '⚡', pos: 'mixed', issueKey: 'energy_production', issueStance: 'mixed',
        text: "An independent who caucuses with Democrats, King works on grid reliability, transmission, and an all-of-the-above energy mix with a clean-energy tilt for Maine.",
        evidence: 'Independent U.S. Senator; member of the Energy and Intelligence Committees.', source: S.king },
      { topic: 'Intelligence & Security', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "On the Intelligence Committee, focuses on cybersecurity, election security, and oversight of the intelligence agencies.", source: S.sintel },
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Supports aid to Israel and Ukraine and strong U.S. alliances, with attention to humanitarian concerns.", source: S.crs_israel },
      { topic: 'Institutions & Bipartisanship', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A former governor who prizes institutional norms, bipartisanship, and Senate reform over hardball tactics.", source: S.king },
    ],
  },
  schatz: {
    roster: { name: 'Brian Schatz', office: 'U.S. Senator', state: 'Hawaii', party: 'D', score: 58, icon: '🌊', issues: ['Climate & Energy', 'Tech & AI', 'Foreign Aid', 'Housing'] },
    label: 'Brian Schatz — 🌊 U.S. Senator (D-HI)',
    cards: [
      { topic: 'Climate & Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "The Senate Democrats' chief deputy whip and a leading climate voice, Schatz pushes clean energy, emissions cuts, and climate resilience.",
        evidence: 'Senate Democratic Chief Deputy Whip.', source: S.schatz },
      { topic: 'Tech & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Backs AI guardrails, online-safety and platform-accountability rules, and consumer protections.", source: S.schatz },
      { topic: 'Foreign Aid & Diplomacy', icon: '🕊', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Defends foreign assistance and diplomacy; supports Israel's security while calling for humanitarian aid and conditions on how force is used.", source: S.schatz },
      { topic: 'Housing Supply', icon: '🏘', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: "A proponent of building far more housing, Schatz backs federal action to boost supply and affordability.", source: S.schatz },
    ],
  },
  robert_garcia: {
    roster: { name: 'Robert Garcia', office: 'House Oversight Ranking Member', state: 'California', party: 'D', score: 57, icon: '🔎', issues: ['Oversight', 'Immigration', 'Democracy', 'LGBTQ Rights'] },
    label: 'Robert Garcia — 🔎 House Oversight Ranking Member (D-CA)',
    cards: [
      { topic: 'Oversight & Accountability', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: "The top Democrat on the House Oversight Committee, Garcia leads investigations and oversight of the administration, focusing on transparency, ethics, and waste.",
        evidence: 'Ranking Member of the House Committee on Oversight & Government Reform.', source: S.oversight },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "An immigrant himself and former mayor of Long Beach, Garcia backs a path to citizenship and opposes mass deportation.", source: S.garcia },
      { topic: 'Democracy & Institutions', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "Focuses on checks on executive power and defending democratic institutions and the civil service.", source: S.garcia },
      { topic: 'LGBTQ Rights', icon: '🏳️‍🌈', pos: 'support', issueKey: 'lgbtq_rights', issueStance: 'support',
        text: "An advocate for LGBTQ rights and anti-discrimination protections.", source: S.garcia },
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

console.log(`PolitiDex — National trade/policy principals, party leaders & members WAVE 8  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National trade/policy principals, party leaders & influential members · top-down federal wave 8 (Jul 2026) ─\n' +
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
  const block = '\n    // National — trade/policy principals, party leaders + influential members, wave 8 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
