#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: THE FINAL STATE GOVERNORS, WAVE 25
// (July 2026) — after waves 1-24. Completes all-50-state gubernatorial coverage.
// ---------------------------------------------------------------------------
// Waves 20-24 covered every large and swing state (Newsom, Abbott, DeSantis,
// Whitmer, Shapiro, Pritzker, Hochul, Evers, Stein, Healey, Kotek, Sherrill,
// Lombardo, Lee, McMaster, Kehoe, Ivey, and more). This wave fills the LAST 13
// states so PolitiDex covers all 50 sitting governors:
//
//   • MIKE DUNLEAVY (dunleavy) — Alaska (R): Arctic energy, the PFD, school
//     choice, public safety, abortion.
//   • NED LAMONT (ned_lamont) — Connecticut (D): fiscal guardrails, abortion,
//     gun safety, middle-class taxes.
//   • MATT MEYER (matt_meyer) — Delaware (D): public schools, abortion, gun
//     safety, housing.
//   • BRAD LITTLE (brad_little) — Idaho (R): school choice, abortion, taxes,
//     deregulation, workforce.
//   • LAURA KELLY (laura_kelly) — Kansas (D): Medicaid expansion, abortion,
//     tax relief, public schools.
//   • TATE REEVES (tate_reeves) — Mississippi (R): abortion (Dobbs), income-tax
//     elimination, Medicaid, school choice, energy.
//   • JIM PILLEN (jim_pillen) — Nebraska (R): property taxes, abortion, taxes,
//     school choice.
//   • KELLY AYOTTE (kelly_ayotte) — New Hampshire (R): no income/sales tax,
//     school choice, crime, immigration, a moderate abortion stance.
//   • KELLY ARMSTRONG (kelly_armstrong) — North Dakota (R): energy, property
//     taxes, taxes, abortion, carbon capture.
//   • DAN McKEE (dan_mckee) — Rhode Island (D): education, housing, abortion,
//     clean energy.
//   • LARRY RHODEN (larry_rhoden) — South Dakota (R): abortion, property taxes,
//     taxes, immigration.
//   • PHIL SCOTT (phil_scott) — Vermont (R): a cross-pressured moderate —
//     abortion rights, gun safety, affordability vetoes, climate.
//   • MARK GORDON (mark_gordon) — Wyoming (R): coal & energy, carbon capture,
//     abortion, taxes, public lands.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Genuinely
// cross-pressured or two-sided records (Ayotte declining a further abortion ban;
// Scott's breaks with his party on guns, abortion and Trump; Gordon's
// net-negative-carbon goal; Dunleavy's PFD fights) are marked mixed and
// attributed. Records constrained or blocked by state courts (Alaska, North
// Dakota, Wyoming abortion litigation) are noted rather than overstated. Sources
// are official governor's-office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-governors-wave25-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-governors-wave25-jul2026.mjs --apply    # write
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
  dunleavy: { label: 'gov.alaska.gov', url: 'https://gov.alaska.gov/newsroom/' },
  lamont: { label: 'portal.ct.gov/governor', url: 'https://portal.ct.gov/governor/news' },
  meyer: { label: 'governor.delaware.gov', url: 'https://governor.delaware.gov/press-releases/' },
  little: { label: 'gov.idaho.gov', url: 'https://gov.idaho.gov/pressreleases/' },
  kelly: { label: 'governor.kansas.gov', url: 'https://governor.kansas.gov/newsroom/' },
  reeves: { label: 'governorreeves.ms.gov', url: 'https://governorreeves.ms.gov/newsroom/' },
  pillen: { label: 'governor.nebraska.gov', url: 'https://governor.nebraska.gov/press-releases' },
  ayotte: { label: 'governor.nh.gov', url: 'https://www.governor.nh.gov/news-and-media/press-releases' },
  armstrong: { label: 'governor.nd.gov', url: 'https://www.governor.nd.gov/news' },
  mckee: { label: 'governor.ri.gov', url: 'https://governor.ri.gov/press-releases' },
  rhoden: { label: 'governor.sd.gov', url: 'https://governor.sd.gov/news/' },
  scott: { label: 'governor.vermont.gov', url: 'https://governor.vermont.gov/press-releases' },
  gordon: { label: 'governor.wyo.gov', url: 'https://governor.wyo.gov/media/news-releases' },
};

const NEW = {
  dunleavy: {
    roster: { name: 'Mike Dunleavy', office: 'Governor', state: 'Alaska', party: 'R', score: 54, icon: '🐻', issues: ['Energy & Oil', 'Permanent Fund Dividend', 'School Choice', 'Public Safety'] },
    label: 'Mike Dunleavy — 🐻 Governor of Alaska (R)',
    cards: [
      { topic: 'Energy & Oil', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions Arctic oil-and-gas development, including ANWR leasing and the Willow project, framing resource extraction as the backbone of Alaska’s economy.', source: S.dunleavy },
      { topic: 'Permanent Fund Dividend', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A champion of paying residents a full statutory Permanent Fund Dividend, Dunleavy has clashed repeatedly with the legislature over the size of the payout and its strain on the budget.', source: S.dunleavy },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs homeschool allotments and school-choice options, defending correspondence-program payments challenged in state court.', source: S.dunleavy },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Made reducing Alaska’s high crime rate an early priority, championing the repeal of the SB 91 criminal-justice reforms.', source: S.dunleavy },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Describes himself as pro-life, though the Alaska Supreme Court has held the state constitution protects abortion access, limiting what restrictions can take effect.', source: S.dunleavy },
    ],
  },
  ned_lamont: {
    roster: { name: 'Ned Lamont', office: 'Governor', state: 'Connecticut', party: 'D', score: 55, icon: '⛵', issues: ['Fiscal Guardrails', 'Abortion Rights', 'Gun Safety', 'Middle-Class Taxes'] },
    label: 'Ned Lamont — ⛵ Governor of Connecticut (D)',
    cards: [
      { topic: 'Fiscal Guardrails', icon: '⚖️', pos: 'support', issueKey: 'gov_balance', issueStance: 'support',
        text: 'A businessman who has defended Connecticut’s bipartisan “fiscal guardrails,” using recurring surpluses to pay down long-standing pension debt while resisting broad tax increases.', source: S.lamont },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Signed legislation protecting abortion access and shielding providers from out-of-state prosecution after Dobbs.', source: S.lamont },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Strengthened Connecticut’s already-strict gun laws, expanding the assault-weapons ban and other safety measures.', source: S.lamont },
      { topic: 'Middle-Class Taxes', icon: '💵', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Signed the state’s largest income-tax cut in decades aimed at middle-income earners while holding the line on broad tax hikes.', source: S.lamont },
    ],
  },
  matt_meyer: {
    roster: { name: 'Matt Meyer', office: 'Governor', state: 'Delaware', party: 'D', score: 54, icon: '🐔', issues: ['Public Schools', 'Abortion Rights', 'Gun Safety', 'Housing'] },
    label: 'Matt Meyer — 🐔 Governor of Delaware (D)',
    cards: [
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'A former public-school teacher and county executive, Meyer has prioritized raising teacher pay and boosting investment in public education.',
        evidence: 'Former New Castle County Executive; inaugurated January 2025.', source: S.meyer },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports protecting and expanding abortion access in Delaware.', source: S.meyer },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs stronger gun-safety laws, building on Delaware’s recent permit-to-purchase and assault-weapons measures.', source: S.meyer },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Has made housing affordability a priority, pushing to expand supply and lower costs.', source: S.meyer },
    ],
  },
  brad_little: {
    roster: { name: 'Brad Little', office: 'Governor', state: 'Idaho', party: 'R', score: 54, icon: '🥔', issues: ['School Choice', 'Abortion', 'Taxes', 'Deregulation'] },
    label: 'Brad Little — 🥔 Governor of Idaho (R)',
    cards: [
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Signed a 2025 refundable tax credit for private-school and homeschool expenses, expanding school choice after earlier caution.', source: S.little },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Idaho’s near-total abortion ban, among the strictest in the nation, enacted after Dobbs.', source: S.little },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Signed repeated income-tax cuts and rebates, touting record budget surpluses.', source: S.little },
      { topic: 'Deregulation', icon: '⚖️', pos: 'support', issueKey: 'reform_balance', issueStance: 'support',
        text: 'Launched a “Zero-Based Regulation” initiative that he says has cut or simplified the majority of the state’s administrative rules.', source: S.little },
      { topic: 'Workforce Training', icon: '🏛', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: 'Created the “Idaho Launch” grant program to help high-school graduates train for in-demand careers.', source: S.little },
    ],
  },
  laura_kelly: {
    roster: { name: 'Laura Kelly', office: 'Governor', state: 'Kansas', party: 'D', score: 55, icon: '🌻', issues: ['Medicaid Expansion', 'Abortion Rights', 'Tax Relief', 'Public Schools'] },
    label: 'Laura Kelly — 🌻 Governor of Kansas (D)',
    cards: [
      { topic: 'Medicaid Expansion', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Has made Medicaid expansion her signature cause, repeatedly proposing it only to be blocked by the Republican legislature.', source: S.kelly },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Vetoed multiple abortion restrictions; Kansas voters rejected a constitutional amendment to allow bans in 2022.', source: S.kelly },
      { topic: 'Tax Relief', icon: '💵', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Signed the elimination of the state sales tax on groceries and targeted tax relief while warning against flat-tax plans she says favor the wealthy.', source: S.kelly },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs fully funding public schools, ending a long-running court fight over Kansas school finance.', source: S.kelly },
    ],
  },
  tate_reeves: {
    roster: { name: 'Tate Reeves', office: 'Governor', state: 'Mississippi', party: 'R', score: 54, icon: '🌸', issues: ['Abortion', 'Income-Tax Repeal', 'Medicaid', 'School Choice'] },
    label: 'Tate Reeves — 🌸 Governor of Mississippi (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Mississippi’s near-total abortion ban; the state’s 15-week law produced the Supreme Court’s Dobbs decision that overturned Roe.', source: S.reeves },
      { topic: 'Income-Tax Repeal', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Signed a 2025 law phasing out Mississippi’s individual income tax entirely, a long-sought goal.', source: S.reeves },
      { topic: 'Medicaid Expansion', icon: '🏥', pos: 'oppose', issueKey: 'healthcare', issueStance: 'oppose',
        text: 'Opposes Medicaid expansion, arguing it grows government dependency, keeping Mississippi among the states that have not expanded.', source: S.reeves },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs expanding school choice and charter options within the state.', source: S.reeves },
      { topic: 'Energy & Jobs', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Touts domestic energy and major industrial recruitment, including a large aluminum plant and battery investment.', source: S.reeves },
    ],
  },
  jim_pillen: {
    roster: { name: 'Jim Pillen', office: 'Governor', state: 'Nebraska', party: 'R', score: 54, icon: '🌽', issues: ['Property Taxes', 'Abortion', 'Taxes', 'School Choice'] },
    label: 'Jim Pillen — 🌽 Governor of Nebraska (R)',
    cards: [
      { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Made property-tax relief his central cause, calling a 2024 special session to cap and shift local property taxes.', source: S.pillen },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed a 12-week abortion ban and has said he would support further restrictions.', source: S.pillen },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs continued income-tax cuts alongside his property-tax push.', source: S.pillen },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Championed private-school scholarships, though Nebraska voters repealed the funding program at the ballot in 2024.', source: S.pillen },
    ],
  },
  kelly_ayotte: {
    roster: { name: 'Kelly Ayotte', office: 'Governor', state: 'New Hampshire', party: 'R', score: 54, icon: '🍁', issues: ['No Income/Sales Tax', 'School Choice', 'Public Safety', 'Immigration'] },
    label: 'Kelly Ayotte — 🍁 Governor of New Hampshire (R)',
    cards: [
      { topic: 'No Income or Sales Tax', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Campaigned and governs on keeping New Hampshire free of an income or sales tax, warning against becoming like neighboring high-tax states.',
        evidence: 'Former U.S. Senator (2011–2017); inaugurated January 2025.', source: S.ayotte },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Backs expanding the state’s Education Freedom Accounts toward universal eligibility.', source: S.ayotte },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A former state attorney general, Ayotte emphasizes public safety and tougher penalties, including on fentanyl trafficking.', source: S.ayotte },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stronger immigration enforcement and cooperation with federal authorities.', source: S.ayotte },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'Says she supports New Hampshire’s existing law, which allows abortion up to 24 weeks, and does not seek a further ban — a more moderate position than many in her party.', source: S.ayotte },
    ],
  },
  kelly_armstrong: {
    roster: { name: 'Kelly Armstrong', office: 'Governor', state: 'North Dakota', party: 'R', score: 54, icon: '🦬', issues: ['Energy', 'Property Taxes', 'Taxes', 'Carbon Capture'] },
    label: 'Kelly Armstrong — 🦬 Governor of North Dakota (R)',
    cards: [
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A strong advocate for North Dakota’s oil, gas, and coal, Armstrong backs expanded production and pipeline infrastructure.',
        evidence: 'Former U.S. Representative (North Dakota At-Large); inaugurated December 2024.', source: S.armstrong },
      { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Signed a major 2025 property-tax relief package expanding the primary-residence credit.', source: S.armstrong },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs income-tax reductions alongside his property-tax relief agenda.', source: S.armstrong },
      { topic: 'Carbon Capture', icon: '⚡', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Backs carbon-capture and CO2 pipelines as a way to keep coal viable and boost oil recovery — a stance that has divided landowners and some conservatives over eminent domain.', source: S.armstrong },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Supports abortion restrictions, though a state court struck down North Dakota’s near-total ban in 2025.', source: S.armstrong },
    ],
  },
  dan_mckee: {
    roster: { name: 'Dan McKee', office: 'Governor', state: 'Rhode Island', party: 'D', score: 53, icon: '🌊', issues: ['Education', 'Housing', 'Abortion Rights', 'Clean Energy'] },
    label: 'Dan McKee — 🌊 Governor of Rhode Island (D)',
    cards: [
      { topic: 'Education', icon: '🏛', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: 'A founder of public charter “mayoral academies,” McKee backs expanding high-performing public-school options and post-pandemic learning recovery.', source: S.mckee },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Created a dedicated state housing department and set targets to boost housing production and lower costs.', source: S.mckee },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports protecting abortion access in Rhode Island, including state coverage for the procedure.', source: S.mckee },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs offshore wind (Revolution Wind) and Rhode Island’s clean-energy and emissions goals.', source: S.mckee },
    ],
  },
  larry_rhoden: {
    roster: { name: 'Larry Rhoden', office: 'Governor', state: 'South Dakota', party: 'R', score: 54, icon: '🗻', issues: ['Abortion', 'Property Taxes', 'Taxes', 'Immigration'] },
    label: 'Larry Rhoden — 🗻 Governor of South Dakota (R)',
    cards: [
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Supports South Dakota’s near-total abortion ban, which took effect after Dobbs; voters rejected an abortion-rights amendment in 2024.',
        evidence: 'Rancher and former lieutenant governor; became governor in January 2025 when Kristi Noem joined the federal Cabinet.', source: S.rhoden },
      { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Made property-tax relief an early priority as rising agricultural and home values pushed up bills.', source: S.rhoden },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs South Dakota’s no-income-tax model and restrained state spending.', source: S.rhoden },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter immigration enforcement and cooperation with federal authorities.', source: S.rhoden },
    ],
  },
  phil_scott: {
    roster: { name: 'Phil Scott', office: 'Governor', state: 'Vermont', party: 'R', score: 57, icon: '⛷', issues: ['Abortion Rights', 'Gun Safety', 'Affordability', 'Climate'] },
    label: 'Phil Scott — ⛷ Governor of Vermont (R)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A Republican who supports abortion rights, Scott backed Vermont’s constitutional amendment (Proposal 5) protecting reproductive liberty.', source: S.scott },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Broke with many in his party to sign gun-safety laws — expanded background checks, magazine limits, and a red-flag law — after a thwarted school-shooting plot.', source: S.scott },
      { topic: 'Affordability & Spending', icon: '💵', pos: 'mixed', issueKey: 'tax_middle_class', issueStance: 'mixed',
        text: 'Centers affordability, repeatedly using his veto against Democratic tax and spending increases — including a large property-tax rise for schools — though the legislature often overrides him.', source: S.scott },
      { topic: 'Climate & Energy', icon: '🌱', pos: 'mixed', issueKey: 'climate_action', issueStance: 'mixed',
        text: 'Backs Vermont’s clean-energy goals in general but vetoed the Clean Heat Standard and the Global Warming Solutions Act over cost concerns.', source: S.scott },
    ],
  },
  mark_gordon: {
    roster: { name: 'Mark Gordon', office: 'Governor', state: 'Wyoming', party: 'R', score: 54, icon: '🤠', issues: ['Coal & Energy', 'Carbon Capture', 'Abortion', 'Public Lands'] },
    label: 'Mark Gordon — 🤠 Governor of Wyoming (R)',
    cards: [
      { topic: 'Coal & Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A staunch defender of Wyoming coal, oil, and gas, Gordon has fought federal limits and sued over rules he says threaten the state’s energy economy.', source: S.gordon },
      { topic: 'Carbon Capture', icon: '⚡', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Set a goal for Wyoming to become “net-negative” in CO2 through carbon capture — a stance that drew criticism from some conservatives even as he defends fossil fuels.', source: S.gordon },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed abortion bans, including a first-in-the-nation ban on abortion pills, though state courts have blocked the laws from taking effect.', source: S.gordon },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs Wyoming’s no-income-tax, low-tax model and cautious use of mineral revenue.', source: S.gordon },
      { topic: 'Public Lands', icon: '🤠', pos: 'support', issueKey: 'lands_local', issueStance: 'support',
        text: 'Pushes back on federal land-management rules, asserting state and local priorities over Wyoming’s vast public lands.', source: S.gordon },
    ],
  },
};

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
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

console.log(`PolitiDex — National final-13 governors WAVE 25  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — the final 13 state governors, completing all-50 coverage · state wave 25 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
} else console.log('  · stance arrays present — skipped');

let html = fs.readFileSync(INDEX, 'utf8');

// ── CMP_DATA roster rows ─────────────────────────────────────────────────────
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — the final 13 state governors, completing all-50 coverage, wave 25 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 25 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 25 — the final 13 state governors, completing all-50 coverage (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5, 10).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(10).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave25-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
