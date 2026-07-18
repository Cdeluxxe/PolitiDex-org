#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: MAJOR-STATE LEGISLATIVE LEADERS + FEDERAL
// SWING-DISTRICT MEMBERS, WAVE 27 (July 2026) — after waves 1-26.
// ---------------------------------------------------------------------------
// All 50 governors and the top tier of state attorneys general are covered. This
// wave adds the officials who actually write and pass the laws driving national
// debates — the legislative leaders of the four biggest states — plus two of the
// most consequential remaining federal swing-district members. Balanced 5D / 5R.
//
//   STATE LEGISLATIVE LEADERS
//   • DAN PATRICK (dan_patrick) — Texas Lieutenant Governor (R): border, abortion,
//     school choice, property tax, energy — arguably the most powerful official
//     in Texas government.
//   • DUSTIN BURROWS (dustin_burrows) — Texas House Speaker (R): school choice,
//     property tax, border, water.
//   • MIKE McGUIRE (mike_mcguire) — California Senate President pro Tem (D):
//     climate, abortion, housing, guns.
//   • ROBERT RIVAS (robert_rivas) — California Assembly Speaker (D): housing,
//     climate, abortion, immigration.
//   • BEN ALBRITTON (ben_albritton) — Florida Senate President (R): immigration,
//     taxes, a rural-investment agenda, school choice.
//   • DANIEL PEREZ (daniel_perez_fl) — Florida House Speaker (R): tax cuts and a
//     public clash with the governor over spending and the Hope Florida charity.
//   • ANDREA STEWART-COUSINS (stewart_cousins) — New York Senate Majority Leader
//     (D): abortion, guns, housing, climate.
//   • CARL HEASTIE (carl_heastie) — New York Assembly Speaker (D): taxes, criminal
//     justice, abortion, housing.
//
//   FEDERAL SWING-DISTRICT MEMBERS
//   • DON BACON (don_bacon) — U.S. Representative (NE-02, R): a retired Air Force
//     general and Ukraine hawk, moderate swing-district dealmaker.
//   • TOM SUOZZI (tom_suozzi) — U.S. Representative (NY-03, D): won a marquee 2024
//     special election on border security, SALT champion, Israel supporter.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured
// records are marked mixed and attributed: Perez's clash with his own party's
// governor, Bacon's bipartisan deals and pro-life-with-exceptions stance,
// Suozzi's break with his party's left on the border. Sources are official
// legislative or congressional pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-state-leaders-wave27-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-state-leaders-wave27-jul2026.mjs --apply    # write
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
  patrick: { label: 'ltgov.texas.gov', url: 'https://www.ltgov.texas.gov/category/press-release/' },
  burrows: { label: 'house.texas.gov', url: 'https://house.texas.gov/members/member-page/?district=83' },
  mcguire: { label: 'sd02.senate.ca.gov', url: 'https://sd02.senate.ca.gov/news' },
  rivas: { label: 'a29.asmdc.org', url: 'https://a29.asmdc.org/news' },
  albritton: { label: 'flsenate.gov', url: 'https://www.flsenate.gov/Senators/S26' },
  perez: { label: 'myfloridahouse.gov', url: 'https://www.myfloridahouse.gov/Sections/Representatives/details.aspx?MemberId=4801' },
  cousins: { label: 'nysenate.gov', url: 'https://www.nysenate.gov/senators/andrea-stewart-cousins' },
  heastie: { label: 'nyassembly.gov', url: 'https://nyassembly.gov/mem/Carl-E-Heastie' },
  bacon: { label: 'bacon.house.gov', url: 'https://bacon.house.gov/news/' },
  suozzi: { label: 'suozzi.house.gov', url: 'https://suozzi.house.gov/media' },
};

const NEW = {
  dan_patrick: {
    roster: { name: 'Dan Patrick', office: 'Lieutenant Governor', state: 'Texas', party: 'R', score: 54, icon: '⭐', issues: ['Border', 'Abortion', 'School Choice', 'Property Tax'] },
    label: 'Dan Patrick — ⭐ Lieutenant Governor of Texas (R)',
    cards: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'As lieutenant governor and presiding officer of the Texas Senate, Patrick has made border security a top priority, driving funding for Operation Lone Star and border-barrier construction.',
        evidence: 'Lieutenant Governor of Texas since 2015; controls the flow of legislation in the Texas Senate.', source: S.patrick },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Shepherded Texas’s near-total abortion ban and the earlier six-week “heartbeat” law through the Senate he presides over.', source: S.patrick },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Made private-school education savings accounts his signature cause, pressing for years until Texas enacted a roughly $1 billion school-choice program in 2025.', source: S.patrick },
      { topic: 'Property Tax', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'Drove record property-tax relief through the Senate, tying budget surpluses to larger homestead exemptions.', source: S.patrick },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A champion of the oil-and-gas industry who pushed to build more dispatchable natural-gas power after the state’s grid failures.', source: S.patrick },
    ],
  },
  dustin_burrows: {
    roster: { name: 'Dustin Burrows', office: 'State House Speaker', state: 'Texas', party: 'R', score: 53, icon: '🤠', issues: ['School Choice', 'Property Tax', 'Border', 'Water'] },
    label: 'Dustin Burrows — 🤠 Texas House Speaker (R)',
    cards: [
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'As Speaker, Burrows delivered the House votes to pass Texas’s 2025 school-choice program after years of rural-Republican resistance.',
        evidence: 'Elected Speaker of the Texas House in January 2025.', source: S.burrows },
      { topic: 'Property Tax', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
        text: 'A longtime author of property-tax legislation, he helped design the tax-cut packages central to the House agenda.', source: S.burrows },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backed continued border-security funding and state enforcement measures.', source: S.burrows },
      { topic: 'Water Supply', icon: '💧', pos: 'support', issueKey: 'water_storage', issueStance: 'support',
        text: 'Prioritized a multibillion-dollar water-supply investment to address Texas’s rapid growth and drought.', source: S.burrows },
    ],
  },
  mike_mcguire: {
    roster: { name: 'Mike McGuire', office: 'State Senate President pro Tem', state: 'California', party: 'D', score: 55, icon: '🐻', issues: ['Climate', 'Abortion Rights', 'Housing', 'Gun Safety'] },
    label: 'Mike McGuire — 🐻 California Senate President pro Tem (D)',
    cards: [
      { topic: 'Climate & Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Leads a Senate that has advanced aggressive climate and clean-energy laws; representing the wildfire-prone North Coast, he has pushed utility-accountability and wildfire measures.',
        evidence: 'California Senate President pro Tempore since February 2024.', source: S.mcguire },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs California’s constitutional protection of abortion access and expanded reproductive-rights funding.', source: S.mcguire },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Has advanced housing-production and permitting-streamlining bills to address California’s affordability crisis.', source: S.mcguire },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Supports California’s strict gun-safety laws.', source: S.mcguire },
    ],
  },
  robert_rivas: {
    roster: { name: 'Robert Rivas', office: 'State Assembly Speaker', state: 'California', party: 'D', score: 54, icon: '🌾', issues: ['Housing', 'Climate', 'Abortion Rights', 'Immigration'] },
    label: 'Robert Rivas — 🌾 California Assembly Speaker (D)',
    cards: [
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'As Speaker, Rivas — the grandson of a farmworker, from an agricultural district — has made housing affordability and production a central priority.',
        evidence: 'Speaker of the California State Assembly since 2023.', source: S.rivas },
      { topic: 'Climate & Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs California’s clean-energy and climate agenda.', source: S.rivas },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports California’s protections for abortion access.', source: S.rivas },
      { topic: 'Immigration', icon: '🤝', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Supports protections for immigrants and farmworkers.', source: S.rivas },
    ],
  },
  ben_albritton: {
    roster: { name: 'Ben Albritton', office: 'State Senate President', state: 'Florida', party: 'R', score: 53, icon: '🍊', issues: ['Immigration', 'Taxes', 'Rural Investment', 'School Choice'] },
    label: 'Ben Albritton — 🍊 Florida Senate President (R)',
    cards: [
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Helped negotiate Florida’s 2025 immigration-enforcement package with the governor and House.',
        evidence: 'President of the Florida Senate since November 2024; a citrus grower from rural Florida.', source: S.albritton },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backed sales- and property-tax relief in the Senate budget during the 2025 tax-cut debate.', source: S.albritton },
      { topic: 'Rural Investment', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Made a “Rural Renaissance” investment in rural health care, infrastructure, and schools his signature initiative.', source: S.albritton },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports Florida’s universal school-choice framework.', source: S.albritton },
    ],
  },
  daniel_perez_fl: {
    roster: { name: 'Daniel Perez', office: 'State House Speaker', state: 'Florida', party: 'R', score: 54, icon: '🐊', issues: ['Tax Cuts', 'Government Oversight', 'Immigration', 'School Choice'] },
    label: 'Daniel Perez — 🐊 Florida House Speaker (R)',
    cards: [
      { topic: 'Tax Cuts', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'As Speaker, Perez pushed a large permanent sales-tax cut and clashed publicly with Governor DeSantis over the size and shape of tax relief and state spending.',
        evidence: 'Speaker of the Florida House since November 2024.', source: S.perez },
      { topic: 'Government Oversight', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Launched House scrutiny of state spending and of the Hope Florida charity tied to the governor’s office — an unusual investigation of his own party’s administration.', source: S.perez },
      { topic: 'Immigration', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backed Florida’s 2025 immigration-enforcement laws.', source: S.perez },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports Florida’s universal school-choice program.', source: S.perez },
    ],
  },
  stewart_cousins: {
    roster: { name: 'Andrea Stewart-Cousins', office: 'State Senate Majority Leader', state: 'New York', party: 'D', score: 55, icon: '🗽', issues: ['Abortion Rights', 'Gun Safety', 'Housing', 'Climate'] },
    label: 'Andrea Stewart-Cousins — 🗽 New York Senate Majority Leader (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'The first woman to lead a New York legislative chamber, she championed codifying abortion rights and placing the Equal Rights Amendment on the 2024 ballot.',
        evidence: 'New York Senate Majority Leader since 2019.', source: S.cousins },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Led passage of New York’s expanded gun-safety laws after the 2022 Buffalo shooting.', source: S.cousins },
      { topic: 'Housing', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed',
        text: 'Negotiated New York’s housing-production and tenant-protection deals, balancing build-more incentives with renter protections.', source: S.cousins },
      { topic: 'Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs New York’s climate law (the CLCPA) and its clean-energy mandates.', source: S.cousins },
    ],
  },
  carl_heastie: {
    roster: { name: 'Carl Heastie', office: 'State Assembly Speaker', state: 'New York', party: 'D', score: 54, icon: '🏙', issues: ['Taxes', 'Criminal Justice', 'Abortion Rights', 'Housing'] },
    label: 'Carl Heastie — 🏙 New York Assembly Speaker (D)',
    cards: [
      { topic: 'Taxes', icon: '💵', pos: 'mixed', issueKey: 'tax_middle_class', issueStance: 'mixed',
        text: 'As Speaker, Heastie has pushed to raise taxes on high earners to fund services, clashing at times with the governor over how far to go.',
        evidence: 'Speaker of the New York State Assembly since 2015.', source: S.heastie },
      { topic: 'Criminal Justice', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support',
        text: 'A key architect of New York’s bail-reform and criminal-justice changes, he has defended them against pressure to roll them back.', source: S.heastie },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs New York’s protections for abortion access.', source: S.heastie },
      { topic: 'Housing', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed',
        text: 'Negotiated New York’s housing and tenant-protection packages in the Assembly.', source: S.heastie },
    ],
  },
  don_bacon: {
    roster: { name: 'Don Bacon', office: 'U.S. Representative', state: 'Nebraska', party: 'R', score: 56, icon: '🎖', issues: ['Ukraine & Defense', 'Bipartisan Deals', 'Israel', 'Border'] },
    label: 'Don Bacon — 🎖 U.S. Representative (NE-02, R)',
    cards: [
      { topic: 'Ukraine & Defense', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A retired Air Force brigadier general, Bacon is one of the House’s most vocal Republican supporters of arming Ukraine and taking a hard line on Russia and China.',
        evidence: 'Retired U.S. Air Force brigadier general; represents a swing district (NE-02) that has split its presidential and House votes.', source: S.bacon },
      { topic: 'Bipartisan Deals', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A swing-district moderate, Bacon has backed bipartisan deals — the infrastructure law and debt-ceiling agreements — and publicly criticized the extremes in both parties.', source: S.bacon },
      { topic: 'Israel', icon: '🤝', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A strong supporter of Israel and of robust U.S. alliances abroad.', source: S.bacon },
      { topic: 'Border', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'Backs stronger border enforcement paired with legal-immigration fixes, and supported the 2024 bipartisan border-security deal that many in his party rejected.', source: S.bacon },
      { topic: 'Abortion', icon: '⚖️', pos: 'mixed', issueKey: 'repro_balance', issueStance: 'mixed',
        text: 'Describes himself as pro-life with exceptions for rape, incest, and the life of the mother — a more moderate stance for his swing district.', source: S.bacon },
    ],
  },
  tom_suozzi: {
    roster: { name: 'Tom Suozzi', office: 'U.S. Representative', state: 'New York', party: 'D', score: 55, icon: '🏛', issues: ['Border', 'Israel', 'SALT & Taxes', 'Abortion Rights'] },
    label: 'Tom Suozzi — 🏛 U.S. Representative (NY-03, D)',
    cards: [
      { topic: 'Border', icon: '⚖️', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'Won a nationally watched 2024 special election running as a Democrat on border security, calling for more enforcement alongside legal pathways — a deliberate break with his party’s left.',
        evidence: 'Won the February 2024 NY-03 special election after George Santos’s expulsion.', source: S.suozzi },
      { topic: 'Israel', icon: '🤝', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A vocal supporter of Israel and of the U.S.-Israel security relationship.', source: S.suozzi },
      { topic: 'SALT & Taxes', icon: '💵', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Made restoring the full state-and-local-tax (SALT) deduction a signature cause for his high-tax suburban district.', source: S.suozzi },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Supports abortion rights and codifying Roe-era protections.', source: S.suozzi },
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

console.log(`PolitiDex — National state leaders + swing-district WAVE 27  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — major-state legislative leaders + federal swing-district members · wave 27 (Jul 2026) ─\n' +
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
  const block = '\n    // National — major-state legislative leaders + federal swing-district members, wave 27 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── PROFILES seed allow-list ─────────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 27 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 27 — major-state legislative leaders + federal swing-district members (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave27-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
