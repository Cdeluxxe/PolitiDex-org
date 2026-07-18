#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: BIG-CITY MAYORS, WAVE 28 (July 2026)
// — after waves 1-27.
// ---------------------------------------------------------------------------
// All 50 governors, the top state attorneys general, and the major-state
// legislative leaders are covered. This wave opens the municipal-executive tier:
// the mayors of the largest U.S. cities, who drive the national debates our
// Spotlights track — immigration and sanctuary policy, crime and policing,
// homelessness and housing, and cost of living. Big-city mayoralties skew
// heavily Democratic, which the set reflects; two prominent Republican mayors of
// large Texas cities are included.
//
//   • ZOHRAN MAMDANI (zohran_mamdani) — New York City (D): affordability, rent
//     freeze, city services, immigration, policing.
//   • KAREN BASS (karen_bass) — Los Angeles (D): homelessness, immigration raids,
//     wildfire recovery, policing.
//   • BRANDON JOHNSON (brandon_johnson) — Chicago (D): sanctuary city, policing
//     reform, public schools, taxes.
//   • JOHN WHITMIRE (john_whitmire) — Houston (D): public safety, the budget,
//     services, a pragmatic immigration tone.
//   • DANIEL LURIE (daniel_lurie) — San Francisco (D): the fentanyl crisis,
//     public safety, downtown recovery, housing.
//   • CHERELLE PARKER (cherelle_parker) — Philadelphia (D): public safety,
//     Kensington drug market, housing, schools.
//   • MIKE JOHNSTON (mike_johnston) — Denver (D): homelessness, the migrant
//     influx, public safety, the budget.
//   • KATE GALLEGO (kate_gallego) — Phoenix (D): water and extreme heat, housing,
//     a border-state economy.
//   • MATTIE PARKER (mattie_parker) — Fort Worth (R): public safety, low taxes,
//     education, managing rapid growth.
//   • ERIC JOHNSON (eric_johnson_dallas) — Dallas (R): public safety, tax cuts,
//     growth, leaner government (switched parties to Republican in 2023).
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Genuinely mixed or
// contested records (Bass on the wildfire response; Whitmire's budget deficit;
// Johnston's migrant fiscal strain; Mamdani's rent-freeze vs. supply approach)
// are marked mixed and attributed. Foreign-policy positions taken by a mayor are
// framed as their own words, not wired into federal Spotlights they do not
// control. Sources are official mayoral-office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-mayors-wave28-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-mayors-wave28-jul2026.mjs --apply    # write
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
  mamdani: { label: 'nyc.gov', url: 'https://www.nyc.gov/office-of-the-mayor/news.page' },
  bass: { label: 'lacity.gov', url: 'https://mayor.lacity.gov/news' },
  bjohnson: { label: 'chicago.gov', url: 'https://www.chicago.gov/city/en/depts/mayor/press_room.html' },
  whitmire: { label: 'houstontx.gov', url: 'https://www.houstontx.gov/mayor/press-releases.html' },
  lurie: { label: 'sf.gov', url: 'https://www.sf.gov/mayor' },
  cparker: { label: 'phila.gov', url: 'https://www.phila.gov/departments/office-of-the-mayor/' },
  johnston: { label: 'denvergov.org', url: 'https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Mayors-Office' },
  gallego: { label: 'phoenix.gov', url: 'https://www.phoenix.gov/mayor' },
  mparker: { label: 'fortworthtexas.gov', url: 'https://www.fortworthtexas.gov/government/mayor' },
  ejohnson: { label: 'dallascityhall.com', url: 'https://dallascityhall.com/government/citymayor/Pages/default.aspx' },
};

const NEW = {
  zohran_mamdani: {
    roster: { name: 'Zohran Mamdani', office: 'Mayor of New York City', state: 'New York', party: 'D', score: 53, icon: '🗽', issues: ['Affordability', 'Housing & Rent', 'Immigration', 'Public Safety'] },
    label: 'Zohran Mamdani — 🗽 Mayor of New York City (D)',
    cards: [
      { topic: 'Affordability Agenda', icon: '🛒', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Won the 2025 mayoralty on an affordability platform, promising free city buses, universal childcare, and city-run grocery stores funded by higher taxes on corporations and top earners.',
        evidence: 'A democratic socialist and former state assemblymember; inaugurated January 2026.', source: S.mamdani },
      { topic: 'Rent & Housing', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Centers tenants, pledging to freeze the rent on New York’s roughly one million rent-stabilized apartments and to build publicly subsidized housing.', source: S.mamdani },
      { topic: 'Immigration', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'A vocal defender of immigrants and New York’s sanctuary protections, opposing federal deportation operations in the city.', source: S.mamdani },
      { topic: 'Policing', icon: '🚔', pos: 'mixed', issueKey: 'tough_on_crime', issueStance: 'mixed',
        text: 'Favors a new Department of Community Safety and mental-health first responders over expanded policing, while pledging to keep the NYPD’s headcount rather than defund it.', source: S.mamdani },
      { topic: 'Israel & Gaza', icon: '🕊', pos: 'support', issueKey: 'restraint', issueStance: 'support',
        text: 'Broke with convention for a New York mayor by sharply criticizing Israel’s conduct in Gaza and voicing strong pro-Palestinian views — a stance that drew national attention during the campaign.', source: S.mamdani },
    ],
  },
  karen_bass: {
    roster: { name: 'Karen Bass', office: 'Mayor of Los Angeles', state: 'California', party: 'D', score: 54, icon: '🌴', issues: ['Homelessness', 'Immigration', 'Wildfire Recovery', 'Public Safety'] },
    label: 'Karen Bass — 🌴 Mayor of Los Angeles (D)',
    cards: [
      { topic: 'Homelessness', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Made homelessness her signature issue, launching the “Inside Safe” program to move people from encampments into interim and permanent housing.',
        evidence: 'Former U.S. Representative (CA-37); Mayor of Los Angeles since 2022.', source: S.bass },
      { topic: 'Immigration Raids', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Opposed the 2025 federal immigration raids and the deployment of the National Guard and Marines to Los Angeles, defending immigrant communities.', source: S.bass },
      { topic: 'Wildfire Recovery', icon: '🔥', pos: 'mixed', issueKey: 'disaster_resilience', issueStance: 'mixed',
        text: 'Faced sharp criticism over preparedness for the January 2025 Palisades fire and has led the rebuilding and permitting-fast-track effort since.', source: S.bass },
      { topic: 'Public Safety', icon: '🚔', pos: 'mixed', issueKey: 'tough_on_crime', issueStance: 'mixed',
        text: 'Backs a mix of police hiring and community intervention to address crime.', source: S.bass },
    ],
  },
  brandon_johnson: {
    roster: { name: 'Brandon Johnson', office: 'Mayor of Chicago', state: 'Illinois', party: 'D', score: 52, icon: '🌆', issues: ['Sanctuary City', 'Policing Reform', 'Public Schools', 'Taxes'] },
    label: 'Brandon Johnson — 🌆 Mayor of Chicago (D)',
    cards: [
      { topic: 'Sanctuary City', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'A defender of Chicago’s sanctuary status, Johnson resisted federal deportation operations while managing the strain of a large migrant influx on the city.',
        evidence: 'A former teacher and union organizer; Mayor of Chicago since 2023.', source: S.bjohnson },
      { topic: 'Policing & Crime', icon: '🚔', pos: 'oppose', issueKey: 'tough_on_crime', issueStance: 'oppose',
        text: 'Backed by the teachers’ union, Johnson prioritizes violence-prevention and social investment over expanded policing.', source: S.bjohnson },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Closely allied with the Chicago Teachers Union, he backs increased public-school funding and a fully elected school board.', source: S.bjohnson },
      { topic: 'Taxes & Budget', icon: '💵', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed',
        text: 'Pushed to raise taxes on business and property to fund city services, facing pushback from the City Council amid budget shortfalls.', source: S.bjohnson },
    ],
  },
  john_whitmire: {
    roster: { name: 'John Whitmire', office: 'Mayor of Houston', state: 'Texas', party: 'D', score: 53, icon: '🤠', issues: ['Public Safety', 'Budget', 'City Services', 'Immigration'] },
    label: 'John Whitmire — 🤠 Mayor of Houston (D)',
    cards: [
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A longtime state senator turned mayor, Whitmire made public safety his priority, boosting police staffing and cutting 911 response times.',
        evidence: 'Former dean of the Texas Senate; Mayor of Houston since January 2024.', source: S.whitmire },
      { topic: 'Budget', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Confronted a large structural budget deficit, ordering spending cuts and efficiency reviews across city departments.', source: S.whitmire },
      { topic: 'City Services', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Prioritized street repair, drainage, and basic city services after years of deferred maintenance.', source: S.whitmire },
      { topic: 'Immigration', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'A pragmatic Democrat in a Republican state, Whitmire has taken a more measured tone on immigration than many big-city peers.', source: S.whitmire },
    ],
  },
  daniel_lurie: {
    roster: { name: 'Daniel Lurie', office: 'Mayor of San Francisco', state: 'California', party: 'D', score: 53, icon: '🌉', issues: ['Fentanyl Crisis', 'Public Safety', 'Downtown Recovery', 'Housing'] },
    label: 'Daniel Lurie — 🌉 Mayor of San Francisco (D)',
    cards: [
      { topic: 'Fentanyl Crisis', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'Elected on a promise to clean up street conditions, Lurie declared a fentanyl state of emergency and moved to expand treatment, shelter, and accountability.',
        evidence: 'A nonprofit founder and first-time officeholder; Mayor of San Francisco since January 2025.', source: S.lurie },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Backed more police hiring and a crackdown on open-air drug markets in the Tenderloin and downtown.', source: S.lurie },
      { topic: 'Downtown Recovery', icon: '🏙', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Focused on reviving San Francisco’s struggling downtown and cutting city bureaucracy and permitting delays.', source: S.lurie },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Supports building more housing to meet the state’s production mandates.', source: S.lurie },
    ],
  },
  cherelle_parker: {
    roster: { name: 'Cherelle Parker', office: 'Mayor of Philadelphia', state: 'Pennsylvania', party: 'D', score: 53, icon: '🔔', issues: ['Public Safety', 'Addiction', 'Housing', 'Public Schools'] },
    label: 'Cherelle Parker — 🔔 Mayor of Philadelphia (D)',
    cards: [
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Ran and governs on public safety, adding police officers and pledging community policing to make Philadelphia “the safest, cleanest, greenest big city.”',
        evidence: 'Former city councilmember and state representative; Mayor of Philadelphia since January 2024.', source: S.cparker },
      { topic: 'Kensington & Addiction', icon: '🧠', pos: 'mixed', issueKey: 'health_mental', issueStance: 'mixed',
        text: 'Prioritized shutting down the open-air drug market in Kensington through a mix of enforcement and treatment.', source: S.cparker },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Launched a large housing initiative to build and preserve tens of thousands of units.', source: S.cparker },
      { topic: 'Public Schools', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs year-round schooling options and investment in Philadelphia’s public schools.', source: S.cparker },
    ],
  },
  mike_johnston: {
    roster: { name: 'Mike Johnston', office: 'Mayor of Denver', state: 'Colorado', party: 'D', score: 53, icon: '🏔', issues: ['Homelessness', 'Migrant Influx', 'Public Safety', 'Budget'] },
    label: 'Mike Johnston — 🏔 Mayor of Denver (D)',
    cards: [
      { topic: 'Homelessness', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Set a goal to end unsheltered homelessness, moving thousands of people from encampments into housing through his “House1000” and successor programs.',
        evidence: 'Former state senator; Mayor of Denver since 2023.', source: S.johnston },
      { topic: 'Migrant Influx', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Managed one of the largest per-capita migrant arrivals in the country and defended Denver’s welcoming approach, saying he would risk arrest to protect it.', source: S.johnston },
      { topic: 'Public Safety', icon: '🚔', pos: 'mixed', issueKey: 'tough_on_crime', issueStance: 'mixed',
        text: 'Balances police staffing with youth-violence intervention programs.', source: S.johnston },
      { topic: 'Budget', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Ordered budget cuts across city government amid the fiscal strain of the migrant response.', source: S.johnston },
    ],
  },
  kate_gallego: {
    roster: { name: 'Kate Gallego', office: 'Mayor of Phoenix', state: 'Arizona', party: 'D', score: 53, icon: '🌵', issues: ['Water & Heat', 'Housing', 'Immigration', 'Economy'] },
    label: 'Kate Gallego — 🌵 Mayor of Phoenix (D)',
    cards: [
      { topic: 'Water & Extreme Heat', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Leads the largest U.S. desert city on water security and extreme-heat response, creating a first-in-the-nation publicly funded heat-response office.',
        evidence: 'Mayor of Phoenix since 2019, one of the largest cities in the U.S.', source: S.gallego },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Backs building more housing to address affordability in a fast-growing metro.', source: S.gallego },
      { topic: 'Immigration', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'In a border state, takes a pragmatic approach to immigration and cross-border economic ties.', source: S.gallego },
      { topic: 'Economy', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Touts major semiconductor and manufacturing investment (TSMC) and transit expansion.', source: S.gallego },
    ],
  },
  mattie_parker: {
    roster: { name: 'Mattie Parker', office: 'Mayor of Fort Worth', state: 'Texas', party: 'R', score: 54, icon: '⭐', issues: ['Public Safety', 'Low Taxes', 'Education', 'Growth'] },
    label: 'Mattie Parker — ⭐ Mayor of Fort Worth (R)',
    cards: [
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A rising Republican figure, Parker emphasizes public safety and police support in one of the nation’s fastest-growing large cities.',
        evidence: 'Mayor of Fort Worth since 2021, re-elected in 2025.', source: S.mparker },
      { topic: 'Low Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Touts Fort Worth’s low-tax, business-friendly growth and has backed property-tax-rate reductions.', source: S.mparker },
      { topic: 'Education & Workforce', icon: '🎓', pos: 'support', issueKey: 'edu_balance', issueStance: 'support',
        text: 'Champions education and workforce partnerships aimed at literacy and career readiness.', source: S.mparker },
      { topic: 'Managing Growth', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Manages rapid population growth with infrastructure, development, and downtown investment.', source: S.mparker },
    ],
  },
  eric_johnson_dallas: {
    roster: { name: 'Eric Johnson', office: 'Mayor of Dallas', state: 'Texas', party: 'R', score: 53, icon: '🐴', issues: ['Public Safety', 'Tax Cuts', 'Growth', 'Leaner Government'] },
    label: 'Eric Johnson — 🐴 Mayor of Dallas (R)',
    cards: [
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'After switching to the Republican Party in 2023, Johnson has centered his tenure on hiring more police and driving down violent crime.',
        evidence: 'Former state representative; Mayor of Dallas since 2019, became a Republican in 2023.', source: S.ejohnson },
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Advocates cutting the city property-tax rate and a business-friendly, low-tax model.', source: S.ejohnson },
      { topic: 'Growth', icon: '🏙', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Focuses on downtown development and economic growth as the region booms.', source: S.ejohnson },
      { topic: 'Leaner Government', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Pushed for a leaner, more efficient city government and greater fiscal discipline.', source: S.ejohnson },
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

console.log(`PolitiDex — National big-city mayors WAVE 28  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — big-city mayors (municipal-executive tier) · state/local wave 28 (Jul 2026) ─\n' +
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
  const block = '\n    // National — big-city mayors (municipal-executive tier), wave 28 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 28 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 28 — big-city mayors, the municipal-executive tier (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave28-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
