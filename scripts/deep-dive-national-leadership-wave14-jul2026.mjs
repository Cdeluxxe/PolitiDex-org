#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: REMAINING LEADERSHIP, RANKING
// MEMBERS & NEW SENATORS, WAVE 14 (July 2026) — continuing after waves 1-13.
// ---------------------------------------------------------------------------
// Waves 1-13 built and connected the top of the federal org chart. This wave
// closes the remaining leadership gaps — the House Republican Conference chair,
// the Assistant House Democratic leader, and the NRCC chair — plus two more
// committee ranking members and two of the newest senators, balanced across
// both parties and mapped to the recent Issue Spotlights:
//
//   • LISA McCLAIN (mcclain) — House Republican Conference Chair (R-MI):
//     spending, the border, energy, and defense.
//   • RICHARD HUDSON (hudson) — NRCC Chair (R-NC): energy, gun rights, the
//     border, and health/drug-supply security.
//   • MARKWAYNE MULLIN (mullin) — U.S. Senator (R-OK), whip team: energy, labor,
//     the border, and defense.
//   • ERIC SCHMITT (schmitt) — U.S. Senator (R-MO): China and AI, Big Tech, the
//     border, and defense.
//   • ANNA PAULINA LUNA (luna) — U.S. Rep. (R-FL): spending and sound money,
//     digital assets, the border, and the Second Amendment.
//   • JOE NEGUSE (neguse) — Assistant House Democratic Leader (D-CO): climate and
//     wildfire, democracy and the rule of law, public lands, and small business.
//   • MARK TAKANO (takano) — House Veterans' Affairs Ranking Member (D-CA):
//     veterans, labor and the workweek, education, and healthcare.
//   • BOBBY SCOTT (bobby_scott) — House Education & Workforce Ranking Member
//     (D-VA): education, labor and wages, child care, and healthcare.
//   • LISA BLUNT ROCHESTER (blunt_rochester) — U.S. Senator (D-DE): clean energy,
//     healthcare, workers, and the federal workforce.
//   • ANGELA ALSOBROOKS (alsobrooks) — U.S. Senator (D-MD): AI and tech, housing,
//     the federal workforce, and healthcare.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Two-sided records
// (Mullin on labor, Schmitt on AI) are marked mixed and attributed. Positions
// are the documented public record; quotes only where genuinely on the record,
// otherwise paraphrased. Sources are official member/committee pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-leadership-wave14-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-leadership-wave14-jul2026.mjs --apply    # write
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
  mcclain:   { label: 'mcclain.house.gov', url: 'https://mcclain.house.gov/media/press-releases' },
  hudson:    { label: 'hudson.house.gov', url: 'https://hudson.house.gov/media/press-releases' },
  mullin:    { label: 'mullin.senate.gov', url: 'https://www.mullin.senate.gov/press-releases/' },
  schmitt:   { label: 'schmitt.senate.gov', url: 'https://www.schmitt.senate.gov/media/press-releases/' },
  luna:      { label: 'luna.house.gov', url: 'https://luna.house.gov/media/press-releases' },
  neguse:    { label: 'neguse.house.gov', url: 'https://neguse.house.gov/media/press-releases' },
  takano:    { label: 'takano.house.gov', url: 'https://takano.house.gov/newsroom/press-releases' },
  bobbyscott:{ label: 'bobbyscott.house.gov', url: 'https://bobbyscott.house.gov/media-center/press-releases' },
  rochester: { label: 'bluntrochester.senate.gov', url: 'https://www.bluntrochester.senate.gov/news/press-releases' },
  alsobrooks:{ label: 'alsobrooks.senate.gov', url: 'https://www.alsobrooks.senate.gov/news/press-releases' },
};

const NEW = {
  mcclain: {
    roster: { name: 'Lisa McClain', office: 'House Republican Conference Chair', state: 'Michigan', party: 'R', score: 56, icon: '🐘', issues: ['Spending', 'Border', 'Energy', 'Defense'] },
    label: 'Lisa McClain — 🐘 House Republican Conference Chair (R-MI)',
    cards: [
      { topic: 'Party Messaging & Spending', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "Chair of the House Republican Conference — the party's No. 4 House leadership post — McClain drives GOP messaging and backs spending restraint and reducing the debt.",
        evidence: 'Chair of the House Republican Conference.', source: S.mcclain },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement, more barriers and agents, and tighter asylum rules.", source: S.mcclain },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Backs expanded domestic oil, gas, and nuclear production and opposes what she calls costly energy mandates.", source: S.mcclain },
      { topic: 'Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Supports a strong military and aid to Israel.", source: S.mcclain },
    ],
  },
  hudson: {
    roster: { name: 'Richard Hudson', office: 'NRCC Chair', state: 'North Carolina', party: 'R', score: 56, icon: '🐘', issues: ['Energy & Commerce', 'Gun Rights', 'Border', 'Healthcare'] },
    label: 'Richard Hudson — 🐘 NRCC Chair (R-NC)',
    cards: [
      { topic: 'Energy & Commerce', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Chair of the House Republicans' campaign arm and a senior Energy & Commerce member, Hudson backs expanded energy production and permitting reform.",
        evidence: 'Chair of the NRCC; member of the Energy & Commerce Committee.', source: S.hudson },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: "The lead author of national concealed-carry reciprocity legislation and a strong gun-rights advocate.", source: S.hudson },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement and tighter asylum limits.", source: S.hudson },
      { topic: 'Drug Supply & Healthcare', icon: '💊', pos: 'support', issueKey: 'healthcare_market', issueStance: 'support',
        text: "On Energy & Commerce, focuses on drug-supply-chain security and market-based health reforms.", source: S.hudson },
    ],
  },
  mullin: {
    roster: { name: 'Markwayne Mullin', office: 'U.S. Senator', state: 'Oklahoma', party: 'R', score: 55, icon: '🔧', issues: ['Energy', 'Labor', 'Border', 'Defense'] },
    label: 'Markwayne Mullin — 🔧 U.S. Senator (R-OK)',
    cards: [
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "A member of the Senate GOP whip team and a former business owner from Oklahoma, Mullin backs expanded oil and gas production and permitting reform.",
        evidence: 'Member of the Senate Republican whip team; EPW and Armed Services committees.', source: S.mullin },
      { topic: 'Labor & Unions', icon: '🧰', pos: 'mixed', issueKey: 'econ_workers', issueStance: 'mixed',
        text: "A former business owner on the HELP Committee, Mullin opposes the PRO Act and heavy labor mandates while engaging directly with unions on some worker issues.", source: S.mullin },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs strict border enforcement and fentanyl interdiction.", source: S.mullin },
      { topic: 'Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "On Armed Services, supports a strong military and aid to Israel.", source: S.mullin },
    ],
  },
  schmitt: {
    roster: { name: 'Eric Schmitt', office: 'U.S. Senator', state: 'Missouri', party: 'R', score: 56, icon: '⚖️', issues: ['China & AI', 'Big Tech', 'Border', 'Defense'] },
    label: 'Eric Schmitt — ⚖️ U.S. Senator (R-MO)',
    cards: [
      { topic: 'China & Technology', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: "A former Missouri attorney general on Armed Services and Commerce, Schmitt is a China hawk focused on competition in AI, chips, and defense.",
        evidence: 'Former Missouri Attorney General; Armed Services and Commerce committees.', source: S.schmitt },
      { topic: 'AI & Big Tech', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: "Pushes to counter Big Tech content moderation and Chinese AI while favoring a light-touch, innovation-first approach to domestic AI rules.", source: S.schmitt },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Sued over immigration policy as attorney general and backs strict border enforcement.", source: S.schmitt },
      { topic: 'Defense', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Supports a strong military, aid to Israel, and countering adversaries.", source: S.schmitt },
    ],
  },
  luna: {
    roster: { name: 'Anna Paulina Luna', office: 'U.S. Representative', state: 'Florida', party: 'R', score: 54, icon: '🦅', issues: ['Spending & Sound Money', 'Digital Assets', 'Border', 'Second Amendment'] },
    label: 'Anna Paulina Luna — 🦅 U.S. Representative (R-FL)',
    cards: [
      { topic: 'Spending & Sound Money', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "An Air Force veteran and Freedom Caucus member, Luna pushes spending cuts, auditing the Federal Reserve and gold reserves, and reducing the debt.",
        evidence: 'Member of the House Freedom Caucus and Oversight Committee.', source: S.luna },
      { topic: 'Digital Assets & Crypto', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: "A crypto advocate, Luna backs clear digital-asset rules and opposes a central-bank digital currency.", source: S.luna },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement and tighter asylum rules.", source: S.luna },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: "A strong gun-rights advocate.", source: S.luna },
    ],
  },
  neguse: {
    roster: { name: 'Joe Neguse', office: 'Assistant House Democratic Leader', state: 'Colorado', party: 'D', score: 58, icon: '🏔', issues: ['Climate & Wildfire', 'Democracy', 'Public Lands', 'Small Business'] },
    label: 'Joe Neguse — 🏔 Assistant House Democratic Leader (D-CO)',
    cards: [
      { topic: 'Climate & Wildfire', icon: '🔥', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "The Assistant House Democratic Leader, Neguse is a leading voice on climate, wildfire resilience, and clean energy from Colorado.",
        evidence: 'Assistant House Democratic Leader.', source: S.neguse },
      { topic: 'Democracy & Rule of Law', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A former impeachment manager on the Judiciary Committee, Neguse focuses on the rule of law, oversight, and democratic institutions.", source: S.neguse },
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: "Champions protecting public lands and expanding outdoor recreation and conservation.", source: S.neguse },
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: "Backs small business, workers, and lowering costs for Colorado families.", source: S.neguse },
    ],
  },
  takano: {
    roster: { name: 'Mark Takano', office: "House Veterans' Affairs Ranking Member", state: 'California', party: 'D', score: 57, icon: '🎖', issues: ['Veterans', 'Labor & Workweek', 'Education', 'Healthcare'] },
    label: "Mark Takano — 🎖 House Veterans' Affairs Ranking Member (D-CA)",
    cards: [
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "The top Democrat on the House Veterans' Affairs Committee, Takano defends VA health care and benefits and has opposed cuts and privatization he argues would harm veterans.",
        evidence: "Ranking Member of the House Committee on Veterans' Affairs.", source: S.takano },
      { topic: 'Labor & the Workweek', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "A former teacher, Takano authored legislation to establish a 32-hour workweek and backs union rights and higher wages.", source: S.takano },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: "Supports public education, community colleges, and student-debt relief.", source: S.takano },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Backs expanding coverage and protecting Medicaid and the ACA.", source: S.takano },
    ],
  },
  bobby_scott: {
    roster: { name: 'Bobby Scott', office: 'House Education & Workforce Ranking Member', state: 'Virginia', party: 'D', score: 57, icon: '🎓', issues: ['Education', 'Labor & Wages', 'Child Care', 'Healthcare'] },
    label: 'Bobby Scott — 🎓 House Education & Workforce Ranking Member (D-VA)',
    cards: [
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: "The top Democrat on the House Education & the Workforce Committee, Scott defends public-school funding, Title I, and student aid and opposes diverting funds to private-school vouchers.",
        evidence: 'Ranking Member of the House Committee on Education & the Workforce.', source: S.bobbyscott },
      { topic: 'Labor & Minimum Wage', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "A lead sponsor of raising the federal minimum wage and of strengthening union and worker protections.", source: S.bobbyscott },
      { topic: 'Child Care & Families', icon: '👶', pos: 'support', issueKey: 'child_care', issueStance: 'support',
        text: "Backs expanding child care, pre-K, and paid family leave.", source: S.bobbyscott },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports the ACA, Medicaid, and lowering health-care costs.", source: S.bobbyscott },
    ],
  },
  blunt_rochester: {
    roster: { name: 'Lisa Blunt Rochester', office: 'U.S. Senator', state: 'Delaware', party: 'D', score: 57, icon: '🌱', issues: ['Clean Energy', 'Healthcare', 'Workers', 'Federal Workforce'] },
    label: 'Lisa Blunt Rochester — 🌱 U.S. Senator (D-DE)',
    cards: [
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Delaware's first woman and first Black senator, Blunt Rochester backs clean-energy jobs, offshore wind, and climate resilience on the Environment Committee.",
        evidence: 'Member of the Senate Environment & Public Works and Commerce committees.', source: S.rochester },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Focuses on lowering health and drug costs, maternal health, and protecting the ACA and Medicaid.", source: S.rochester },
      { topic: 'Workers & Jobs', icon: '🧰', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "A former state labor secretary, backs workforce training, union rights, and manufacturing jobs.", source: S.rochester },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: "Representing many federal workers, defends the federal workforce against deep cuts.", source: S.rochester },
    ],
  },
  alsobrooks: {
    roster: { name: 'Angela Alsobrooks', office: 'U.S. Senator', state: 'Maryland', party: 'D', score: 57, icon: '🏛', issues: ['AI & Tech', 'Housing', 'Federal Workforce', 'Healthcare'] },
    label: 'Angela Alsobrooks — 🏛 U.S. Senator (D-MD)',
    cards: [
      { topic: 'AI & Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Maryland's first Black senator and a former county executive, Alsobrooks backs AI guardrails, tech workforce development, and data privacy.",
        evidence: 'Member of the Senate Banking and Armed Services committees.', source: S.alsobrooks },
      { topic: 'Housing', icon: '🏘', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: "Focuses on expanding affordable-housing supply and homeownership.", source: S.alsobrooks },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: "Representing many federal employees, defends the federal workforce and opposes deep cuts.", source: S.alsobrooks },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Backs lowering health and drug costs and protecting Medicaid and the ACA.", source: S.alsobrooks },
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

console.log(`PolitiDex — National leadership, ranking members & new senators WAVE 14  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National remaining leadership, ranking members & new senators · top-down federal wave 14 (Jul 2026) ─\n' +
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
  const block = '\n    // National — remaining leadership, ranking members + new senators, wave 14 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
