#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: CABINET AGENCY HEADS, DEMOCRATIC
// LEADERSHIP & INFLUENTIAL MEMBERS, WAVE 7 (July 2026) — continuing the
// top-down push after waves 1-6.
// ---------------------------------------------------------------------------
// Waves 1-6 built the President/VP, the floor leaders, the committee chairs and
// ranking members, and the senior Cabinet. The Republican administration and
// leadership are now well covered, so this wave restores balance and depth by
// adding the highest-leverage figures still missing — Democratic congressional
// leadership and influential members from both parties, plus two national
// security agency heads — each mapped to the recent Issue Spotlights (Israel aid,
// border security, tariffs, government spending, energy, AI, and trust in
// institutions):
//
//   • PETE AGUILAR (aguilar) — House Democratic Caucus Chair (D-CA): the #3 House
//     Democrat; appropriations, democracy/Jan. 6 accountability, immigration.
//   • PRAMILA JAYAPAL (jayapal) — U.S. Rep. (D-WA), Progressive Caucus founder:
//     Medicare for All, immigrant rights, conditions on Israel aid, workers & AI.
//   • CHRIS VAN HOLLEN (van_hollen) — U.S. Senator (D-MD): conditions on Israel
//     aid, foreign aid and diplomacy, the federal workforce, and spending.
//   • ALEX PADILLA (padilla) — U.S. Senator (D-CA): immigration reform, the
//     border, AI and tech, clean energy, and voting access.
//   • RAPHAEL WARNOCK (warnock) — U.S. Senator (D-GA), a pastor: healthcare and
//     Medicaid, voting rights, insulin/drug prices, Israel aid, and agriculture.
//   • TAMMY DUCKWORTH (duckworth) — U.S. Senator (D-IL), a combat veteran:
//     defense and veterans, Israel & Ukraine aid, aviation, and manufacturing.
//   • KASH PATEL (patel) — FBI Director: violent-crime and cartel enforcement,
//     a contested restructuring of the bureau, and fentanyl and the border.
//   • JOHN RATCLIFFE (ratcliffe) — CIA Director: intelligence and national
//     security, China, Iran and Israel, and cartels/fentanyl.
//   • BYRON DONALDS (donalds) — U.S. Rep. (R-FL): spending and the debt, energy,
//     the border, school choice, and taxes.
//   • ELISE STEFANIK (stefanik) — U.S. Rep. (R-NY): Israel and campus
//     antisemitism, the border, spending, dairy/agriculture, and energy.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, vote, or words — never "his party." Vote counts are plain
// facts. Two-sided and contested records are marked mixed and attributed to both
// sides. Positions are the documented public record; quotes only where genuinely
// on the record, otherwise paraphrased. Sources are official member/agency pages,
// congress.gov, and reputable outlets.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-cabinet-leaders-wave7-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-cabinet-leaders-wave7-jul2026.mjs --apply    # write
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
  aguilar:   { label: 'aguilar.house.gov', url: 'https://aguilar.house.gov/media-center/press-releases' },
  jayapal:   { label: 'jayapal.house.gov', url: 'https://jayapal.house.gov/category/press-releases/' },
  vanhollen: { label: 'vanhollen.senate.gov', url: 'https://www.vanhollen.senate.gov/news/press-releases' },
  padilla:   { label: 'padilla.senate.gov', url: 'https://www.padilla.senate.gov/newsroom/press-releases/' },
  warnock:   { label: 'warnock.senate.gov', url: 'https://www.warnock.senate.gov/newsroom/press-releases/' },
  duckworth: { label: 'duckworth.senate.gov', url: 'https://www.duckworth.senate.gov/news/press-releases' },
  fbi:       { label: 'FBI — News', url: 'https://www.fbi.gov/news' },
  judiciary: { label: 'Senate Judiciary Committee', url: 'https://www.judiciary.senate.gov/' },
  cia:       { label: 'Central Intelligence Agency', url: 'https://www.cia.gov/' },
  donalds:   { label: 'donalds.house.gov', url: 'https://donalds.house.gov/media/press-releases' },
  stefanik:  { label: 'stefanik.house.gov', url: 'https://stefanik.house.gov/media/press-releases' },
  sasc:      { label: 'Senate Armed Services Committee', url: 'https://www.armed-services.senate.gov/' },
  crs_israel:{ label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
};

const NEW = {
  aguilar: {
    roster: { name: 'Pete Aguilar', office: 'House Democratic Caucus Chair', state: 'California', party: 'D', score: 58, icon: '🏛', issues: ['Appropriations', 'Democracy', 'Immigration', 'Healthcare'] },
    label: 'Pete Aguilar — 🏛 House Democratic Caucus Chair (D-CA)',
    cards: [
      { topic: 'Government Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: "The House Democratic Caucus chair and an appropriator, Aguilar defends domestic and safety-net funding against deep cuts while negotiating bipartisan spending deals to keep the government open.",
        evidence: 'Chair of the House Democratic Caucus; member of the Appropriations Committee.', source: S.aguilar },
      { topic: 'Democracy & Accountability', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A member of the House select committee that investigated January 6, Aguilar emphasizes the peaceful transfer of power, election administration, and institutional accountability.", source: S.aguilar },
      { topic: 'Immigration', icon: '🛂', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: "From California, backs comprehensive immigration reform — pairing border security with a path for Dreamers and farmworkers — over enforcement-only approaches.", source: S.aguilar },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports protecting the ACA and Medicaid and lowering prescription-drug costs.", source: S.aguilar },
    ],
  },
  jayapal: {
    roster: { name: 'Pramila Jayapal', office: 'U.S. Representative', state: 'Washington', party: 'D', score: 57, icon: '✊', issues: ['Healthcare', 'Immigration', 'Israel & Gaza', 'Workers & AI'] },
    label: 'Pramila Jayapal — ✊ U.S. Representative (D-WA)',
    cards: [
      { topic: 'Medicare for All', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "The founder and former chair of the Congressional Progressive Caucus, Jayapal is the longtime lead sponsor of Medicare for All and pushes for universal coverage and lower drug costs.",
        evidence: 'Founder and former chair of the Congressional Progressive Caucus.', source: S.jayapal },
      { topic: 'Immigrant Rights', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "A former immigrant-rights organizer, Jayapal backs a path to citizenship and protections for Dreamers and opposes mass-deportation policies and family separation.", source: S.jayapal },
      { topic: 'Israel Aid & Gaza', icon: '🕊', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "A prominent critic of unconditional military aid during the Gaza war, Jayapal has pushed to condition U.S. arms on humanitarian access and civilian protection.", source: S.jayapal },
      { topic: 'Workers & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Focuses on worker protections and labor rights as AI and automation expand, and on guardrails for the technology.", source: S.jayapal },
    ],
  },
  van_hollen: {
    roster: { name: 'Chris Van Hollen', office: 'U.S. Senator', state: 'Maryland', party: 'D', score: 58, icon: '🌐', issues: ['Israel Aid & Conditions', 'Foreign Aid', 'Federal Workforce', 'Spending'] },
    label: 'Chris Van Hollen — 🌐 U.S. Senator (D-MD)',
    cards: [
      { topic: 'Israel Aid & Conditions', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "On the Foreign Relations and Appropriations Committees, Van Hollen supports Israel's security but has led efforts to condition U.S. military aid on humanitarian access to Gaza and compliance with U.S. law.",
        evidence: 'Member of the Senate Foreign Relations and Appropriations Committees.', source: S.vanhollen },
      { topic: 'Foreign Aid & Diplomacy', icon: '🕊', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Defends foreign assistance and development funding, arguing diplomacy and aid advance U.S. interests more cheaply than conflict.", source: S.vanhollen },
      { topic: 'Federal Workforce', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: "Representing many federal employees, Van Hollen opposes deep cuts to the federal workforce and agencies and defends civil-service protections.", source: S.vanhollen },
      { topic: 'Government Spending', icon: '🧾', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
        text: "On the Budget and Appropriations Committees, opposes large cuts to domestic programs and the safety net.", source: S.vanhollen },
    ],
  },
  padilla: {
    roster: { name: 'Alex Padilla', office: 'U.S. Senator', state: 'California', party: 'D', score: 58, icon: '🌉', issues: ['Immigration', 'Border', 'AI & Tech', 'Clean Energy'] },
    label: 'Alex Padilla — 🌉 U.S. Senator (D-CA)',
    cards: [
      { topic: 'Immigration Reform', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "A son of immigrants and former California secretary of state, Padilla is a leading advocate for a path to citizenship and protections for Dreamers and farmworkers.",
        evidence: 'Member of the Senate Judiciary Committee; former California Secretary of State.', source: S.padilla },
      { topic: 'Border Security', icon: '🚧', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: "Backs border investments — technology, ports of entry, and fentanyl interdiction — while opposing mass deportations and family separation.", source: S.padilla },
      { topic: 'AI & Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "From California, works on AI guardrails, data privacy, and oversight of the technology industry.", source: S.padilla },
      { topic: 'Clean Energy & Climate', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Supports clean-energy deployment, wildfire resilience, and climate action.", source: S.padilla },
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "As a former chief elections officer, champions voting access and sound election administration.", source: S.padilla },
    ],
  },
  warnock: {
    roster: { name: 'Raphael Warnock', office: 'U.S. Senator', state: 'Georgia', party: 'D', score: 58, icon: '⛪', issues: ['Healthcare', 'Voting Rights', 'Drug Prices', 'Israel Aid'] },
    label: 'Raphael Warnock — ⛪ U.S. Senator (D-GA)',
    cards: [
      { topic: 'Healthcare & Medicaid', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "A senator and senior pastor, Warnock focuses on closing the Medicaid coverage gap in states that did not expand and on making care affordable.",
        evidence: 'U.S. Senator for Georgia; member of the Senate Agriculture Committee.', source: S.warnock },
      { topic: 'Voting Rights', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "A leading advocate for federal voting-rights protections and expanded ballot access.", source: S.warnock },
      { topic: 'Insulin & Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: "Championed capping the cost of insulin for consumers and lowering prescription-drug prices.", source: S.warnock },
      { topic: 'Israel Aid', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Supports Israel's security and U.S. aid alongside humanitarian assistance and a two-state path.", source: S.crs_israel },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "On the Agriculture Committee, works on the Farm Bill, farm credit, and rural Georgia.", source: S.warnock },
    ],
  },
  duckworth: {
    roster: { name: 'Tammy Duckworth', office: 'U.S. Senator', state: 'Illinois', party: 'D', score: 58, icon: '🎖', issues: ['Defense & Veterans', 'Israel & Ukraine', 'Aviation', 'Manufacturing'] },
    label: 'Tammy Duckworth — 🎖 U.S. Senator (D-IL)',
    cards: [
      { topic: 'Defense & Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "An Army combat veteran who lost both legs in Iraq, Duckworth serves on Armed Services and champions veterans, military families, and a strong, well-resourced defense.",
        evidence: 'Member of the Senate Armed Services and Commerce Committees; Army combat veteran.', source: S.sasc },
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Backed the 2024 national-security supplemental and supports military aid to Israel and Ukraine and robust U.S. alliances.", source: S.crs_israel },
      { topic: 'Aviation & Safety', icon: '✈️', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: "On the Commerce Committee, leads on aviation safety, air-traffic modernization, and air-travel consumer protections.", source: S.duckworth },
      { topic: 'Manufacturing & Jobs', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "From Illinois, focuses on manufacturing, infrastructure jobs, and Buy America.", source: S.duckworth },
      { topic: 'Child Care & Families', icon: '👶', pos: 'support', issueKey: 'child_care', issueStance: 'support',
        text: "Champions child care and paid family leave, and pushed to let senators care for infants on the floor.", source: S.duckworth },
    ],
  },
  patel: {
    roster: { name: 'Kash Patel', office: 'FBI Director', state: 'New York', party: 'R', score: 54, icon: '🔍', issues: ['Law Enforcement', 'FBI Reform', 'Fentanyl & Cartels', 'Transparency'] },
    label: 'Kash Patel — 🔍 FBI Director',
    cards: [
      { topic: 'Violent Crime & Enforcement', icon: '🚓', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: "Confirmed as FBI Director in 2025, Patel has emphasized violent-crime, cartel, and fentanyl enforcement and refocusing agents on traditional law-enforcement casework.",
        evidence: 'Director of the Federal Bureau of Investigation.', source: S.fbi },
      { topic: 'Restructuring the FBI', icon: '🏛', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: "Has moved to restructure the bureau and reduce what he calls politicization — an agenda supporters describe as accountability and reform and critics warn could weaken the FBI's independence.", source: S.judiciary },
      { topic: 'Fentanyl & the Border', icon: '💊', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: "Prioritizes cartel, trafficking, and fentanyl investigations tied to the southern border.", source: S.fbi },
      { topic: 'Transparency & Declassification', icon: '📂', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed',
        text: "Pledged more transparency and declassification, while critics have questioned the handling and release of sensitive material.", source: S.fbi },
    ],
  },
  ratcliffe: {
    roster: { name: 'John Ratcliffe', office: 'CIA Director', state: 'Texas', party: 'R', score: 55, icon: '🕵', issues: ['Intelligence', 'China', 'Iran & Israel', 'National Security'] },
    label: 'John Ratcliffe — 🕵 CIA Director',
    cards: [
      { topic: 'Intelligence & National Security', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "A former Director of National Intelligence and now CIA Director, Ratcliffe emphasizes rebuilding human intelligence and countering foreign threats.",
        evidence: 'Director of the Central Intelligence Agency; former Director of National Intelligence.', source: S.cia },
      { topic: 'China', icon: '🇨🇳', pos: 'support', issueKey: 'america_first_fp', issueStance: 'support',
        text: "Frames China as the top long-term threat — economic, technological, and military — and prioritizes countering its espionage and influence operations.", source: S.cia },
      { topic: 'Iran & Israel', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "Supports a hard line on Iran and close intelligence cooperation with Israel.", source: S.cia },
      { topic: 'Fentanyl & Cartels', icon: '💊', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: "Directs intelligence resources at cartels and fentanyl-trafficking networks.", source: S.cia },
    ],
  },
  donalds: {
    roster: { name: 'Byron Donalds', office: 'U.S. Representative', state: 'Florida', party: 'R', score: 55, icon: '🐊', issues: ['Spending & Debt', 'Energy', 'Border', 'School Choice'] },
    label: 'Byron Donalds — 🐊 U.S. Representative (R-FL)',
    cards: [
      { topic: 'Spending & the Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: "A House Freedom Caucus fiscal conservative, Donalds pushes spending cuts, balanced budgets, and reducing the national debt.",
        evidence: 'Member of the House Freedom Caucus.', source: S.donalds },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Backs expanded oil, gas, and nuclear production and opposes what he calls costly climate mandates.", source: S.donalds },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement — more barriers and agents — and tighter asylum rules.", source: S.donalds },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: "A strong advocate for school choice and parental rights in education.", source: S.donalds },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: "Supports making the 2017 tax cuts permanent and further tax relief.", source: S.donalds },
    ],
  },
  stefanik: {
    roster: { name: 'Elise Stefanik', office: 'U.S. Representative', state: 'New York', party: 'R', score: 55, icon: '🍎', issues: ['Israel', 'Border', 'Spending', 'Agriculture'] },
    label: 'Elise Stefanik — 🍎 U.S. Representative (R-NY)',
    cards: [
      { topic: 'Israel & Campus Antisemitism', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "A strong supporter of Israel and U.S. aid, Stefanik drew national attention chairing hearings that pressed university presidents on campus antisemitism.",
        evidence: 'U.S. Representative for New York (NY-21).', source: S.stefanik },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Backs strict border enforcement — more agents and barriers — and curbing illegal crossings.", source: S.stefanik },
      { topic: 'Government Spending', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "Supports spending restraint and reducing the national debt.", source: S.stefanik },
      { topic: 'Dairy & Agriculture', icon: '🐄', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From upstate New York, works on dairy, farm credit, and the Farm Bill for her district.", source: S.stefanik },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "Backs domestic energy production, including upstate hydropower and nuclear.", source: S.stefanik },
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

console.log(`PolitiDex — National cabinet heads, Democratic leadership & members WAVE 7  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National cabinet heads, Democratic leadership & influential members · top-down federal wave 7 (Jul 2026) ─\n' +
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
  const block = '\n    // National — cabinet heads, Democratic leadership + influential members, wave 7 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
