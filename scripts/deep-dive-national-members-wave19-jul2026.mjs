#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: HIGH-PROFILE SENATORS & INFLUENTIAL
// HOUSE MEMBERS (BOTH PARTIES), WAVE 19 (July 2026) — after waves 1-18.
// ---------------------------------------------------------------------------
// After 18 waves the Cabinet, leadership, and chair layers are deep; this wave
// adds high-profile, high-salience members still missing who anchor the social,
// fiscal, and foreign-policy Spotlights — balanced 5R / 5D (one deepened):
//
//   • TED BUDD (ted_budd) — U.S. Senator (R-NC): gun rights, energy, the
//     border, and defense.
//   • KEVIN HERN (kevin_hern) — U.S. Rep. (R-OK), Republican Study Committee
//     chair: spending and debt, taxes, energy, and market healthcare.
//   • NANCY MACE (nancy_mace) — U.S. Rep. (R-SC): women's sports and single-sex
//     spaces, government oversight, the border, and defense.
//   • TOMMY TUBERVILLE (tommy_tuberville) — U.S. Senator (R-AL): the military,
//     agriculture, the border, and abortion.
//   • AYANNA PRESSLEY (ayanna_pressley) — U.S. Rep. (D-MA): healthcare, criminal
//     -justice reform, student debt, and housing.
//   • DELIA RAMIREZ (delia_ramirez) — U.S. Rep. (D-IL): immigration, healthcare,
//     housing, and workers.
//   • SARAH McBRIDE (sarah_mcbride) — U.S. Rep. (D-DE), first openly transgender
//     member of Congress: LGBTQ rights, paid leave, abortion rights, and workers.
//   • JAKE AUCHINCLOSS (jake_auchincloss) — U.S. Rep. (D-MA): AI and tech,
//     Israel, defense and Ukraine, and housing supply.
//   • GREG LANDSMAN (greg_landsman) — U.S. Rep. (D-OH): Israel, public education,
//     bipartisan governing, and seniors.
//   • JOHN CORNYN (john_cornyn) — U.S. Senator (R-TX): DEEPENED — already carried
//     curated stances and Spotlight rows but was missing from the static roster
//     and the public directory. Adds his CMP_DATA row and PROFILES seed so he is
//     browsable/searchable like any other profile.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured or
// nuanced records (Auchincloss on AI, Landsman on bipartisan fiscal deals) are
// marked mixed and attributed. Sources are official member pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-members-wave19-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-members-wave19-jul2026.mjs --apply    # write
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
  budd:        { label: 'budd.senate.gov', url: 'https://www.budd.senate.gov/press-releases/' },
  hern:        { label: 'hern.house.gov', url: 'https://hern.house.gov/press/' },
  mace:        { label: 'mace.house.gov', url: 'https://mace.house.gov/media/press-releases' },
  tuberville:  { label: 'tuberville.senate.gov', url: 'https://www.tuberville.senate.gov/newsroom/press-releases/' },
  pressley:    { label: 'pressley.house.gov', url: 'https://pressley.house.gov/media/press-releases/' },
  ramirez:     { label: 'ramirez.house.gov', url: 'https://ramirez.house.gov/media/press-releases' },
  mcbride:     { label: 'mcbride.house.gov', url: 'https://mcbride.house.gov/media/press-releases' },
  auchincloss: { label: 'auchincloss.house.gov', url: 'https://auchincloss.house.gov/media/press-releases' },
  landsman:    { label: 'landsman.house.gov', url: 'https://landsman.house.gov/media/press-releases' },
};

const NEW = {
  ted_budd: {
    roster: { name: 'Ted Budd', office: 'U.S. Senator', state: 'North Carolina', party: 'R', score: 55, icon: '🔫', issues: ['Gun Rights', 'Energy', 'Border', 'Defense'] },
    label: 'Ted Budd — 🔫 U.S. Senator (R-NC)',
    cards: [
      { topic: 'Gun Rights', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'A former gun-store owner, Budd is a strong Second Amendment advocate who opposes new firearm restrictions and backs concealed-carry reciprocity.',
        evidence: 'Member of the Senate Armed Services, Banking, and HELP committees; former firearms retailer.', source: S.budd },
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs expanding oil, gas, and nuclear energy and cutting regulations he says raise energy costs.', source: S.budd },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports strict border enforcement, finishing the wall, and stopping fentanyl trafficking.', source: S.budd },
      { topic: 'National Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'On Armed Services, backs a strong military, servicemember pay, and aid to Israel.', source: S.budd },
    ],
  },
  kevin_hern: {
    roster: { name: 'Kevin Hern', office: 'U.S. Representative', state: 'Oklahoma', party: 'R', score: 55, icon: '🧾', issues: ['Spending & Debt', 'Taxes', 'Energy', 'Healthcare'] },
    label: 'Kevin Hern — 🧾 U.S. Representative (R-OK)',
    cards: [
      { topic: 'Government Spending & Debt', icon: '🧾', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'As chair of the Republican Study Committee — the largest conservative House caucus — Hern authors budget blueprints built around deep spending cuts and balancing the budget.',
        evidence: 'Chair of the Republican Study Committee; member of the House Ways & Means Committee.', source: S.hern },
      { topic: 'Taxes & Business', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'A former small-business owner on Ways & Means, backs extending the 2017 tax cuts and pro-business tax policy.', source: S.hern },
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'From Oklahoma, strongly backs oil and gas production and opposes limits he says raise costs.', source: S.hern },
      { topic: 'Market Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: 'Favors market-based healthcare and entitlement reforms aimed at long-term solvency over new federal programs.', source: S.hern },
    ],
  },
  nancy_mace: {
    roster: { name: 'Nancy Mace', office: 'U.S. Representative', state: 'South Carolina', party: 'R', score: 55, icon: '⚖️', issues: ["Women's Sports", 'Oversight', 'Border', 'Defense'] },
    label: 'Nancy Mace — ⚖️ U.S. Representative (R-SC)',
    cards: [
      { topic: "Women's Sports & Single-Sex Spaces", icon: '🚺', pos: 'oppose', issueKey: 'rights_balance', issueStance: 'oppose',
        text: 'Mace has become a leading House voice for restricting transgender women from women’s sports and single-sex spaces, framing it as protecting women’s spaces.',
        evidence: 'Member of the House Oversight and Armed Services committees.', source: S.mace },
      { topic: 'Government Oversight', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'On the Oversight Committee, presses government accountability, transparency, and spending investigations.', source: S.mace },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stronger border enforcement and stopping fentanyl trafficking.', source: S.mace },
      { topic: 'National Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Armed Services member, backs a strong military and support for servicemembers.', source: S.mace },
    ],
  },
  tommy_tuberville: {
    roster: { name: 'Tommy Tuberville', office: 'U.S. Senator', state: 'Alabama', party: 'R', score: 54, icon: '🏈', issues: ['Military', 'Agriculture', 'Border', 'Abortion'] },
    label: 'Tommy Tuberville — 🏈 U.S. Senator (R-AL)',
    cards: [
      { topic: 'Military & Armed Services', icon: '🎖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'On Armed Services, Tuberville backs a strong military; he drew national attention holding up hundreds of military promotions in a protest over a Pentagon abortion-travel policy.',
        evidence: 'Member of the Senate Armed Services and Agriculture committees.', source: S.tuberville },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From Alabama, backs the farm safety net, producers, and rural agriculture.', source: S.tuberville },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Supports strict border enforcement and finishing the border wall.', source: S.tuberville },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'A strong abortion opponent who backs federal and state limits on abortion.', source: S.tuberville },
    ],
  },
  ayanna_pressley: {
    roster: { name: 'Ayanna Pressley', office: 'U.S. Representative', state: 'Massachusetts', party: 'D', score: 57, icon: '✊', issues: ['Healthcare', 'Justice Reform', 'Student Debt', 'Housing'] },
    label: 'Ayanna Pressley — ✊ U.S. Representative (D-MA)',
    cards: [
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A progressive "Squad" member, Pressley backs Medicare for All and expanding access to care.',
        evidence: 'Member of the House Financial Services and Oversight committees.', source: S.pressley },
      { topic: 'Criminal-Justice Reform', icon: '⚖️', pos: 'support', issueKey: 'justice_reform', issueStance: 'support',
        text: 'A leading advocate for criminal-justice reform, ending cash bail, and reducing incarceration.', source: S.pressley },
      { topic: 'Student Debt', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: 'A lead champion of broad student-loan debt cancellation and lowering college costs.', source: S.pressley },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Backs major federal investment in affordable housing and tenant protections.', source: S.pressley },
    ],
  },
  delia_ramirez: {
    roster: { name: 'Delia Ramirez', office: 'U.S. Representative', state: 'Illinois', party: 'D', score: 57, icon: '🏠', issues: ['Immigration', 'Healthcare', 'Housing', 'Workers'] },
    label: 'Delia Ramirez — 🏠 U.S. Representative (D-IL)',
    cards: [
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'A daughter of Guatemalan immigrants, Ramirez is a leading progressive voice for immigrant rights, a path to citizenship, and against mass deportations.',
        evidence: 'Member of the House Homeland Security and Veterans’ Affairs committees.', source: S.ramirez },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Backs Medicare for All and expanding access to care regardless of immigration status.', source: S.ramirez },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Champions affordable housing, tenant protections, and funding to prevent homelessness.', source: S.ramirez },
      { topic: 'Workers & Labor', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'A strong labor ally who backs unions, higher wages, and worker protections.', source: S.ramirez },
    ],
  },
  sarah_mcbride: {
    roster: { name: 'Sarah McBride', office: 'U.S. Representative', state: 'Delaware', party: 'D', score: 57, icon: '🏳️‍⚧️', issues: ['LGBTQ Rights', 'Paid Leave', 'Abortion Rights', 'Workers'] },
    label: 'Sarah McBride — 🏳️‍⚧️ U.S. Representative (D-DE)',
    cards: [
      { topic: 'LGBTQ & Transgender Rights', icon: '🏳️‍⚧️', pos: 'support', issueKey: 'lgbtq_rights', issueStance: 'support',
        text: 'The first openly transgender member of Congress, McBride is a leading advocate for LGBTQ and transgender rights and anti-discrimination protections.',
        evidence: 'First openly transgender member of Congress; former Delaware state senator.', source: S.mcbride },
      { topic: 'Paid Leave & Care', icon: '👶', pos: 'support', issueKey: 'paid_leave', issueStance: 'support',
        text: 'A longtime champion of paid family and medical leave, which she enacted as a state senator.', source: S.mcbride },
      { topic: 'Reproductive Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs protecting abortion access and reproductive rights.', source: S.mcbride },
      { topic: 'Workers & Economy', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Focuses on lowering costs, jobs, and protections for working families.', source: S.mcbride },
    ],
  },
  jake_auchincloss: {
    roster: { name: 'Jake Auchincloss', office: 'U.S. Representative', state: 'Massachusetts', party: 'D', score: 57, icon: '💻', issues: ['AI & Tech', 'Israel', 'Defense', 'Housing'] },
    label: 'Jake Auchincloss — 💻 U.S. Representative (D-MA)',
    cards: [
      { topic: 'AI & Emerging Tech', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'A leading Democratic voice on AI, Auchincloss backs U.S. innovation and competitiveness while calling for targeted guardrails on the highest-risk uses.',
        evidence: 'Marine Corps veteran; member of the House Financial Services and Transportation committees.', source: S.auchincloss },
      { topic: 'Israel & the Alliance', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A Marine veteran and pro-Israel Democrat, backs U.S. security aid and the U.S.-Israel alliance.', source: S.auchincloss },
      { topic: 'National Defense & Ukraine', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Backs a strong military and continued military aid to Ukraine against Russian aggression.', source: S.auchincloss },
      { topic: 'Housing Supply', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'A "build more housing" advocate who backs zoning reform and boosting supply to lower costs.', source: S.auchincloss },
    ],
  },
  greg_landsman: {
    roster: { name: 'Greg Landsman', office: 'U.S. Representative', state: 'Ohio', party: 'D', score: 57, icon: '🤝', issues: ['Israel', 'Education', 'Bipartisan', 'Seniors'] },
    label: 'Greg Landsman — 🤝 U.S. Representative (D-OH)',
    cards: [
      { topic: 'Israel & the Alliance', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A pro-Israel Democrat, Landsman backs U.S. security aid and the U.S.-Israel alliance.',
        evidence: 'Member of the House Small Business and Veterans’ Affairs committees; former school-board member.', source: S.landsman },
      { topic: 'Public Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former teacher and school-board member, focuses on public-school funding and student achievement.', source: S.landsman },
      { topic: 'Bipartisan Governing & Fiscal', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A swing-district moderate, Landsman stresses bipartisan problem-solving and fiscal responsibility.', source: S.landsman },
      { topic: 'Social Security & Seniors', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Backs protecting Social Security and Medicare benefits for seniors.', source: S.landsman },
    ],
  },
  // DEEPENED — existing stances/Spotlight rows; add roster + PROFILES seed only.
  john_cornyn: {
    roster: { name: 'John Cornyn', office: 'U.S. Senator', state: 'Texas', party: 'R', score: 55, icon: '⚖️', issues: ['Defense', 'Border', 'Guns', 'Taxes'] },
    label: 'John Cornyn — ⚖️ U.S. Senator (R-TX) [deepened]',
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

console.log(`PolitiDex — National high-profile senators & influential members WAVE 19  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
  const block = '\n    // ── National high-profile senators & influential House members (both parties) · top-down federal wave 19 (Jul 2026) ─\n' +
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
  const block = '\n    // National — high-profile senators + influential House members (both parties), wave 19 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── 2. PROFILES seed allow-list (directory / search / Your Ballot) ─────────
const seedAnchor = "        'raja_krishnamoorthi', 'josh_gottheimer', 'seth_moulton', 'marie_gluesenkamp_perez', 'jon_ossoff',\n";
if (html.includes(seedAnchor) && !html.includes("// National wave 19 —")) {
  const seedIds = Object.keys(NEW);
  const seedBlock =
    "        // National wave 19 — high-profile senators & influential members (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",\n";
  html = html.replace(seedAnchor, seedAnchor + seedBlock);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
