#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: MORE CABINET, THE UN AMBASSADOR &
// INFLUENTIAL MEMBERS, WAVE 10 (July 2026) — continuing the top-down push
// after waves 1-9.
// ---------------------------------------------------------------------------
// Waves 1-9 built the President/VP, the leadership and whips, the committee
// chairs and ranking members, most of the Cabinet, the diplomacy and economic
// principals, and much of both parties' membership. This wave adds the
// highest-leverage figures still missing — three more Cabinet-level officials
// (Labor, Veterans Affairs, and the U.N. ambassador) and influential senators
// and representatives from both parties — each mapped to the recent Issue
// Spotlights (Israel aid, Ukraine, China/Taiwan, border, tariffs, spending,
// energy, AI, and trust in institutions):
//
//   • LORI CHAVEZ-DeREMER (chavez_deremer) — U.S. Secretary of Labor: workers
//     and unions, apprenticeships, trade and manufacturing jobs, workplace rules.
//   • DOUG COLLINS (doug_collins) — U.S. Secretary of Veterans Affairs: VA health,
//     a contested VA restructuring, community care, and veteran mental health.
//   • MIKE WALTZ (mike_waltz) — U.S. Ambassador to the U.N.: foreign policy and
//     U.N. reform, Israel, Ukraine/Russia, and China.
//   • RON JOHNSON (ron_johnson) — U.S. Senator (R-WI): deep spending cuts,
//     oversight, medical freedom, and the border.
//   • TODD YOUNG (todd_young) — U.S. Senator (R-IN): AI and innovation, China,
//     semiconductors/supply chains, and foreign policy.
//   • RICHARD BLUMENTHAL (blumenthal) — U.S. Senator (D-CT): AI regulation, kids'
//     online safety, consumer protection/antitrust, and gun safety.
//   • JEFF MERKLEY (merkley) — U.S. Senator (D-OR): climate and clean energy,
//     campaign finance, Senate reform, and housing supply.
//   • RASHIDA TLAIB (tlaib) — U.S. Rep. (D-MI): a leading critic of Israel aid,
//     plus auto workers, poverty/cost of living, and civil liberties.
//   • JERRY NADLER (nadler) — U.S. Rep. (D-NY), former Judiciary chair: the rule
//     of law, civil liberties, oversight, and gun safety.
//   • JARED GOLDEN (jared_golden) — U.S. Rep. (D-ME), a Marine veteran: a
//     Democrat who backs tariffs, plus manufacturing, fiscal restraint, defense.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Contested and
// two-sided records (the VA restructuring, oversight inquiries, tariffs, the
// filibuster, conditions on Israel aid) are marked mixed and attributed to both
// sides. Positions are the documented public record; quotes only where genuinely
// on the record, otherwise paraphrased. Sources are official agency/member pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-cabinet-members-wave10-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-cabinet-members-wave10-jul2026.mjs --apply    # write
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
  dol:       { label: 'U.S. Department of Labor', url: 'https://www.dol.gov/' },
  va:        { label: 'U.S. Department of Veterans Affairs', url: 'https://www.va.gov/' },
  usun:      { label: 'U.S. Mission to the United Nations', url: 'https://usun.usmission.gov/' },
  ronjohnson:{ label: 'ronjohnson.senate.gov', url: 'https://www.ronjohnson.senate.gov/press-releases' },
  young:     { label: 'young.senate.gov', url: 'https://www.young.senate.gov/newsroom/press-releases/' },
  blumenthal:{ label: 'blumenthal.senate.gov', url: 'https://www.blumenthal.senate.gov/newsroom/press' },
  merkley:   { label: 'merkley.senate.gov', url: 'https://www.merkley.senate.gov/news/press-releases/' },
  tlaib:     { label: 'tlaib.house.gov', url: 'https://tlaib.house.gov/media/press-releases' },
  nadler:    { label: 'nadler.house.gov', url: 'https://nadler.house.gov/news/documentquery.aspx?DocumentTypeID=27' },
  golden:    { label: 'golden.house.gov', url: 'https://golden.house.gov/media/press-releases' },
};

const NEW = {
  chavez_deremer: {
    roster: { name: 'Lori Chavez-DeRemer', office: 'U.S. Secretary of Labor', state: 'Oregon', party: 'R', score: 55, icon: '🧰', issues: ['Workers & Unions', 'Apprenticeships', 'Trade & Jobs', 'Workplace Rules'] },
    label: 'Lori Chavez-DeRemer — 🧰 U.S. Secretary of Labor',
    cards: [
      { topic: 'Workers & Unions', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "As Labor secretary and a former mayor and congresswoman, Chavez-DeRemer leads workforce and labor policy; unusually for a Republican she backed pro-union measures such as the PRO Act before joining the Cabinet.",
        evidence: 'U.S. Secretary of Labor.', source: S.dol },
      { topic: 'Apprenticeships & Job Training', icon: '🛠', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: "Promotes apprenticeships, skills training, and career pathways as alternatives to a four-year degree.", source: S.dol },
      { topic: 'Trade & Manufacturing Jobs', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: "Frames trade and reshoring around protecting American manufacturing jobs and worker wages.", source: S.dol },
      { topic: 'Workplace Rules', icon: '📋', pos: 'mixed', issueKey: 'gov_regulation', issueStance: 'mixed',
        text: "Oversees workplace rules and enforcement, balancing worker protections with employer flexibility.", source: S.dol },
    ],
  },
  doug_collins: {
    roster: { name: 'Doug Collins', office: 'U.S. Secretary of Veterans Affairs', state: 'Georgia', party: 'R', score: 55, icon: '🎖', issues: ['Veterans & VA Health', 'VA Reform', 'Community Care', 'Mental Health'] },
    label: 'Doug Collins — 🎖 U.S. Secretary of Veterans Affairs',
    cards: [
      { topic: 'Veterans & VA Health', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "Secretary of Veterans Affairs and an Air Force Reserve chaplain, Collins leads the VA, prioritizing health-care access, PACT Act toxic-exposure benefits, and shorter wait times.",
        evidence: 'U.S. Secretary of Veterans Affairs.', source: S.va },
      { topic: 'VA Restructuring', icon: '🏛', pos: 'mixed', issueKey: 'gov_waste', issueStance: 'mixed',
        text: "Has moved to restructure the department and reduce staffing — supporters call it efficiency, while some veterans' groups warn it could disrupt services.", source: S.va },
      { topic: 'Community Care', icon: '🏥', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: "Backs expanding veterans' access to private community care alongside VA facilities.", source: S.va },
      { topic: 'Veteran Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: "Prioritizes veteran mental health and suicide prevention.", source: S.va },
    ],
  },
  mike_waltz: {
    roster: { name: 'Mike Waltz', office: 'U.S. Ambassador to the United Nations', state: 'Florida', party: 'R', score: 55, icon: '🌐', issues: ['Foreign Policy', 'Israel', 'Ukraine & Russia', 'China'] },
    label: 'Mike Waltz — 🌐 U.S. Ambassador to the United Nations',
    cards: [
      { topic: 'Foreign Policy & the U.N.', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "A former Green Beret and congressman confirmed as U.N. ambassador, Waltz pushes a hawkish, America-first line at the U.N., pressing for reform and countering the influence of China and Russia.",
        evidence: 'U.S. Ambassador to the United Nations.', source: S.usun },
      { topic: 'Israel', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "A strong supporter of Israel and its U.S. aid, and a critic of U.N. bodies he views as biased against Israel.", source: S.usun },
      { topic: 'Ukraine & Russia', icon: '🕊', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: "Backs pressure on Russia while supporting the administration's push for a negotiated settlement in Ukraine.", source: S.usun },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: "Frames China as the primary strategic threat and works to counter its influence in international institutions.", source: S.usun },
    ],
  },
  ron_johnson: {
    roster: { name: 'Ron Johnson', office: 'U.S. Senator', state: 'Wisconsin', party: 'R', score: 54, icon: '📉', issues: ['Spending & Debt', 'Oversight', 'Medical Freedom', 'Border'] },
    label: 'Ron Johnson — 📉 U.S. Senator (R-WI)',
    cards: [
      { topic: 'Spending & the Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: "A fiscal hawk, Johnson pushes deep spending cuts and has called for returning the budget toward pre-pandemic levels, at times withholding support for deals he considers insufficient.",
        evidence: 'Member of the Senate Homeland Security and Budget Committees.', source: S.ronjohnson },
      { topic: 'Oversight & Institutions', icon: '🔍', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed',
        text: "A senior member of Homeland Security & Governmental Affairs, Johnson has probed federal agencies and pandemic policy — inquiries supporters call accountability and critics call politicized.", source: S.ronjohnson },
      { topic: 'Medical Freedom', icon: '💉', pos: 'support', issueKey: 'medical_freedom', issueStance: 'support',
        text: "A skeptic of federal COVID mandates, Johnson emphasizes medical freedom and scrutiny of public-health authorities.", source: S.ronjohnson },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs strict border enforcement and tighter asylum limits.", source: S.ronjohnson },
    ],
  },
  todd_young: {
    roster: { name: 'Todd Young', office: 'U.S. Senator', state: 'Indiana', party: 'R', score: 57, icon: '💡', issues: ['AI & Innovation', 'China', 'Semiconductors', 'Foreign Policy'] },
    label: 'Todd Young — 💡 U.S. Senator (R-IN)',
    cards: [
      { topic: 'AI & Innovation', icon: '💡', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: "A co-author of the CHIPS and Science Act, Young champions U.S. leadership in AI, semiconductors, and advanced technology and has worked on bipartisan AI-policy frameworks.",
        evidence: 'Co-author of the CHIPS and Science Act.', source: S.young },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: "A China hawk focused on economic and technological competition and countering Beijing.", source: S.young },
      { topic: 'Semiconductors & Supply Chains', icon: '💽', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: "Pushes domestic semiconductor manufacturing and resilient supply chains for critical goods.", source: S.young },
      { topic: 'Foreign Policy', icon: '🌐', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Supports strong alliances, aid to Ukraine and Israel, and a robust national defense.", source: S.young },
    ],
  },
  blumenthal: {
    roster: { name: 'Richard Blumenthal', office: 'U.S. Senator', state: 'Connecticut', party: 'D', score: 57, icon: '⚖️', issues: ['AI Regulation', 'Kids Online Safety', 'Consumer & Antitrust', 'Gun Safety'] },
    label: 'Richard Blumenthal — ⚖️ U.S. Senator (D-CT)',
    cards: [
      { topic: 'AI Regulation', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Blumenthal co-authored a bipartisan framework for AI legislation with Senator Hawley, calling for licensing, transparency, and liability for high-risk AI.",
        evidence: 'Co-author of a bipartisan AI-regulation framework.', source: S.blumenthal },
      { topic: 'Kids Online Safety', icon: '🛡', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "A lead sponsor of the Kids Online Safety Act, targeting social-media harms to children.", source: S.blumenthal },
      { topic: 'Consumer Protection & Antitrust', icon: '🏦', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: "A former state attorney general, Blumenthal focuses on consumer protection, antitrust, and corporate accountability.", source: S.blumenthal },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: "A leading advocate for gun-safety measures, including expanded background checks.", source: S.blumenthal },
    ],
  },
  merkley: {
    roster: { name: 'Jeff Merkley', office: 'U.S. Senator', state: 'Oregon', party: 'D', score: 57, icon: '🌎', issues: ['Climate & Energy', 'Campaign Finance', 'Senate Reform', 'Housing'] },
    label: 'Jeff Merkley — 🌎 U.S. Senator (D-OR)',
    cards: [
      { topic: 'Climate & Clean Energy', icon: '🌡', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "One of the Senate's most aggressive climate advocates, Merkley pushes rapid decarbonization, clean energy, and ending fossil-fuel subsidies.",
        evidence: 'Member of the Senate Appropriations and Budget Committees.', source: S.merkley },
      { topic: 'Campaign Finance', icon: '💸', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: "Champions overturning Citizens United, dark-money disclosure, and democracy reforms.", source: S.merkley },
      { topic: 'Senate Reform', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "Has led efforts to reform the filibuster to pass voting-rights and other priority legislation.", source: S.merkley },
      { topic: 'Housing Supply', icon: '🏘', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: "Backs major federal investment to expand affordable-housing supply.", source: S.merkley },
    ],
  },
  tlaib: {
    roster: { name: 'Rashida Tlaib', office: 'U.S. Representative', state: 'Michigan', party: 'D', score: 55, icon: '🌿', issues: ['Israel & Gaza', 'Auto Workers', 'Cost of Living', 'Civil Liberties'] },
    label: 'Rashida Tlaib — 🌿 U.S. Representative (D-MI)',
    cards: [
      { topic: 'Israel Aid & Gaza', icon: '🕊', pos: 'oppose', issueKey: 'foreign_balance', issueStance: 'oppose',
        text: "The only Palestinian-American in Congress, Tlaib is among the most outspoken critics of U.S. military aid to Israel, calling for conditioning or halting arms over the conduct of the Gaza war.",
        evidence: 'Member of the Congressional Progressive Caucus.', source: S.tlaib },
      { topic: 'Auto Workers & Manufacturing', icon: '🚗', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "From Detroit, backs auto workers, the UAW, and a worker-centered transition for manufacturing jobs.", source: S.tlaib },
      { topic: 'Cost of Living & Poverty', icon: '📊', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: "Focuses on poverty, utility shutoffs, and cost-of-living relief for working families.", source: S.tlaib },
      { topic: 'Civil Liberties', icon: '⚖️', pos: 'support', issueKey: 'rights_balance', issueStance: 'support',
        text: "Advocates for civil liberties, immigrant rights, and limits on government surveillance.", source: S.tlaib },
    ],
  },
  nadler: {
    roster: { name: 'Jerry Nadler', office: 'U.S. Representative', state: 'New York', party: 'D', score: 57, icon: '⚖️', issues: ['Rule of Law', 'Civil Liberties', 'Oversight', 'Gun Safety'] },
    label: 'Jerry Nadler — ⚖️ U.S. Representative (D-NY)',
    cards: [
      { topic: 'Rule of Law', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A former House Judiciary chair, Nadler is a senior voice on the rule of law, checks on executive power, and constitutional oversight.",
        evidence: 'Former Chair of the House Judiciary Committee.', source: S.nadler },
      { topic: 'Civil Liberties & Rights', icon: '🗽', pos: 'support', issueKey: 'rights_balance', issueStance: 'support',
        text: "A longtime advocate for civil liberties, free expression, and LGBTQ and reproductive rights.", source: S.nadler },
      { topic: 'Oversight & Accountability', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: "Led impeachment and oversight efforts and pushes transparency and accountability in government.", source: S.nadler },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: "Supports assault-weapons restrictions and expanded background checks.", source: S.nadler },
    ],
  },
  jared_golden: {
    roster: { name: 'Jared Golden', office: 'U.S. Representative', state: 'Maine', party: 'D', score: 57, icon: '⚓', issues: ['Tariffs & Trade', 'Manufacturing', 'Fiscal Restraint', 'Defense'] },
    label: 'Jared Golden — ⚓ U.S. Representative (D-ME)',
    cards: [
      { topic: 'Tariffs & Trade', icon: '📦', pos: 'support', issueKey: 'tariffs_growth', issueStance: 'support',
        text: "A moderate Democrat and Marine combat veteran, Golden breaks with many in his party by backing tariffs to protect American manufacturing, including supporting across-the-board tariff measures.",
        evidence: 'Member of the Blue Dog Coalition; Marine combat veteran.', source: S.golden },
      { topic: 'Manufacturing & Workers', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "Focuses on manufacturing, shipbuilding, and working-class jobs in Maine.", source: S.golden },
      { topic: 'Fiscal Restraint', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: "A fiscal moderate who has bucked his party on spending and backed balanced-budget efforts.", source: S.golden },
      { topic: 'Defense & Veterans', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "On Armed Services, supports a strong defense, shipbuilding, and Ukraine aid.", source: S.golden },
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

console.log(`PolitiDex — National more Cabinet, UN ambassador & members WAVE 10  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National more Cabinet, the UN ambassador & influential members · top-down federal wave 10 (Jul 2026) ─\n' +
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
  const block = '\n    // National — more Cabinet, the UN ambassador + influential members, wave 10 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
