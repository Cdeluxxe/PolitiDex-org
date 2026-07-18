#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: THE NEXT TIER OF HIGH-LEVERAGE GOVERNORS,
// WAVE 21 (July 2026) — after waves 1-20.
// ---------------------------------------------------------------------------
// The federal officeholder bench is saturated and wave 20 added the top four
// federal admin leaders plus the six biggest governors. This wave continues
// down the governor bench — the consequential state executives (and shadow-2028
// figures) who drive the national debates our Spotlights track — balanced 5R/5D:
//
//   REPUBLICANS
//   • GLENN YOUNGKIN (glenn_youngkin) — Governor of Virginia: education and
//     parental rights, the economy and taxes, abortion, and energy.
//   • BRIAN KEMP (brian_kemp) — Governor of Georgia: the economy and jobs, the
//     border, abortion, and election law.
//   • SARAH HUCKABEE SANDERS (sarah_huckabee_sanders) — Governor of Arkansas:
//     school choice, taxes, the border, and abortion.
//   • JEFF LANDRY (jeff_landry) — Governor of Louisiana: crime, energy, the
//     border, and education.
//   • MIKE DeWINE (mike_dewine) — Governor of Ohio: guns and public safety,
//     fentanyl and addiction, manufacturing, and education.
//
//   DEMOCRATS
//   • TIM WALZ (tim_walz) — Governor of Minnesota, 2024 VP nominee: public
//     education, healthcare and paid leave, abortion rights, and gun safety.
//   • WES MOORE (wes_moore) — Governor of Maryland: economic opportunity,
//     veterans, public education, and public safety.
//   • KATHY HOCHUL (kathy_hochul) — Governor of New York: abortion rights, gun
//     safety, immigration and migrants, and affordability.
//   • JARED POLIS (jared_polis) — Governor of Colorado: the economy and taxes,
//     healthcare costs, energy, and immigration.
//   • ANDY BESHEAR (andy_beshear) — Governor of Kentucky: the economy and jobs,
//     healthcare, abortion rights, and bipartisan governing.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Cross-pressured
// records (Youngkin's 15-week "consensus," DeWine on guns and addiction, Polis's
// pro-market streak, Hochul on migrants) are marked mixed and attributed.
// Sources are official governor's-office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-governors-wave21-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-governors-wave21-jul2026.mjs --apply    # write
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
  youngkin: { label: 'governor.virginia.gov', url: 'https://www.governor.virginia.gov/newsroom/' },
  kemp:     { label: 'gov.georgia.gov', url: 'https://gov.georgia.gov/press-releases' },
  sanders:  { label: 'governor.arkansas.gov', url: 'https://governor.arkansas.gov/news-media/' },
  landry:   { label: 'gov.louisiana.gov', url: 'https://gov.louisiana.gov/news' },
  dewine:   { label: 'governor.ohio.gov', url: 'https://governor.ohio.gov/media/news-and-media' },
  walz:     { label: 'mn.gov/governor', url: 'https://mn.gov/governor/newsroom/' },
  moore:    { label: 'governor.maryland.gov', url: 'https://governor.maryland.gov/news/' },
  hochul:   { label: 'governor.ny.gov', url: 'https://www.governor.ny.gov/news' },
  polis:    { label: 'governor.colorado.gov', url: 'https://governor.colorado.gov/press-releases' },
  beshear:  { label: 'governor.ky.gov', url: 'https://www.kentucky.gov/Pages/Activity-stream.aspx' },
};

const NEW = {
  glenn_youngkin: {
    roster: { name: 'Glenn Youngkin', office: 'Governor', state: 'Virginia', party: 'R', score: 55, icon: '🏔', issues: ['Education', 'Economy & Taxes', 'Abortion', 'Energy'] },
    label: 'Glenn Youngkin — 🏔 Governor of Virginia (R)',
    cards: [
      { topic: 'Education & Parental Rights', icon: '🎓', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'Governor of Virginia, Youngkin rode parental rights in schools to office and backs curriculum transparency, school choice, and limits on classroom policies he opposes.',
        evidence: 'Governor of Virginia; former private-equity executive.', source: S.youngkin },
      { topic: 'Economy & Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'A former business executive, Youngkin has pushed tax cuts, business recruitment, and job growth.', source: S.youngkin },
      { topic: 'Abortion', icon: '🍼', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Sought a 15-week limit he framed as a "consensus," short of a total ban — a middle position that stalled in a divided legislature.', source: S.youngkin },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Pulled Virginia out of a regional carbon market and backs an "all of the above" energy mix favoring reliability and lower costs.', source: S.youngkin },
    ],
  },
  brian_kemp: {
    roster: { name: 'Brian Kemp', office: 'Governor', state: 'Georgia', party: 'R', score: 55, icon: '🍑', issues: ['Economy', 'Border', 'Abortion', 'Election Law'] },
    label: 'Brian Kemp — 🍑 Governor of Georgia (R)',
    cards: [
      { topic: 'Economy & Jobs', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Governor of Georgia, Kemp touts record business investment, tax rebates, and job growth as a low-tax, business-friendly model.',
        evidence: 'Governor of Georgia; former Georgia Secretary of State.', source: S.kemp },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict immigration enforcement and signed a law requiring jails to check immigration status.', source: S.kemp },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed Georgia’s "heartbeat" law banning most abortions after roughly six weeks.', source: S.kemp },
      { topic: 'Election Law', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Signed Georgia’s SB 202 election-law overhaul (voter ID for mail ballots), while notably refusing to overturn the 2020 result.', source: S.kemp },
    ],
  },
  sarah_huckabee_sanders: {
    roster: { name: 'Sarah Huckabee Sanders', office: 'Governor', state: 'Arkansas', party: 'R', score: 54, icon: '🎀', issues: ['School Choice', 'Taxes', 'Border', 'Abortion'] },
    label: 'Sarah Huckabee Sanders — 🎀 Governor of Arkansas (R)',
    cards: [
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Governor of Arkansas and a former White House press secretary, Sanders enacted the LEARNS Act creating universal school-choice vouchers.',
        evidence: 'Governor of Arkansas; former White House Press Secretary.', source: S.sanders },
      { topic: 'Taxes & Spending', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Has cut the state income tax and champions phasing it out along with spending restraint.', source: S.sanders },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict border enforcement and sent Arkansas National Guard troops to the southern border.', source: S.sanders },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'A strong abortion opponent who backs Arkansas’s near-total ban.', source: S.sanders },
    ],
  },
  jeff_landry: {
    roster: { name: 'Jeff Landry', office: 'Governor', state: 'Louisiana', party: 'R', score: 54, icon: '⚜️', issues: ['Crime', 'Energy', 'Border', 'Education'] },
    label: 'Jeff Landry — ⚜️ Governor of Louisiana (R)',
    cards: [
      { topic: 'Crime & Law Enforcement', icon: '🚓', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Governor of Louisiana and a former attorney general, Landry called a special session for tough-on-crime laws — harsher sentences, limiting parole, and trying more teens as adults.',
        evidence: 'Governor of Louisiana; former Louisiana Attorney General.', source: S.landry },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A strong backer of Louisiana oil, gas, and LNG export terminals, opposing federal limits.', source: S.landry },
      { topic: 'Border & Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs strict immigration enforcement and state cooperation with federal deportations.', source: S.landry },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Expanded school-choice vouchers and backs parental rights in education.', source: S.landry },
    ],
  },
  mike_dewine: {
    roster: { name: 'Mike DeWine', office: 'Governor', state: 'Ohio', party: 'R', score: 55, icon: '🌰', issues: ['Guns & Safety', 'Fentanyl', 'Manufacturing', 'Education'] },
    label: 'Mike DeWine — 🌰 Governor of Ohio (R)',
    cards: [
      { topic: 'Guns & Public Safety', icon: '🔫', pos: 'mixed', issueKey: 'gun_balance', issueStance: 'mixed',
        text: 'After the 2019 Dayton mass shooting, DeWine pushed background-check and "red flag" measures — unusual for his party — but also later signed gun-rights expansions.',
        evidence: 'Governor of Ohio; former U.S. Senator and Ohio Attorney General.', source: S.dewine },
      { topic: 'Fentanyl & Addiction', icon: '💊', pos: 'mixed', issueKey: 'immig_fentanyl', issueStance: 'mixed',
        text: 'A longtime addiction-crisis voice, DeWine pairs interdiction with treatment, recovery, and prevention funding.', source: S.dewine },
      { topic: 'Manufacturing & Jobs', icon: '🏭', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Courted major investment including Intel’s semiconductor plants and touts Ohio jobs and workforce training.', source: S.dewine },
      { topic: 'Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs public-school funding, literacy, and children’s programs alongside expanded school choice.', source: S.dewine },
    ],
  },
  tim_walz: {
    roster: { name: 'Tim Walz', office: 'Governor', state: 'Minnesota', party: 'D', score: 56, icon: '⭐', issues: ['Education', 'Healthcare', 'Abortion Rights', 'Gun Safety'] },
    label: 'Tim Walz — ⭐ Governor of Minnesota (D)',
    cards: [
      { topic: 'Public Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Governor of Minnesota, the 2024 Democratic VP nominee and a former public-school teacher, Walz enacted free school meals and boosted public-education funding.',
        evidence: 'Governor of Minnesota; 2024 Democratic vice-presidential nominee; former teacher and U.S. Representative.', source: S.walz },
      { topic: 'Healthcare & Paid Leave', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Signed paid family and medical leave and moves to expand healthcare access and lower drug costs.', source: S.walz },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Signed a law protecting abortion access and made Minnesota a regional refuge for care.', source: S.walz },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Signed universal background checks and a "red flag" law after years of shifting toward gun-safety measures.', source: S.walz },
    ],
  },
  wes_moore: {
    roster: { name: 'Wes Moore', office: 'Governor', state: 'Maryland', party: 'D', score: 56, icon: '🦀', issues: ['Opportunity', 'Veterans', 'Education', 'Public Safety'] },
    label: 'Wes Moore — 🦀 Governor of Maryland (D)',
    cards: [
      { topic: 'Economic Opportunity', icon: '💼', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Governor of Maryland, Moore centers ending child poverty, a state service year for graduates, and jobs and wage growth.',
        evidence: 'Governor of Maryland; Army combat veteran and former nonprofit CEO.', source: S.moore },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'An Army combat veteran, Moore prioritizes veterans’ services, jobs, and benefits.', source: S.moore },
      { topic: 'Public Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Backs the state’s public-school investment plan and workforce and apprenticeship pathways.', source: S.moore },
      { topic: 'Public Safety', icon: '🚓', pos: 'mixed', issueKey: 'justice_balance', issueStance: 'mixed',
        text: 'Pairs tougher action on violent crime and illegal guns with reentry and prevention investments.', source: S.moore },
    ],
  },
  kathy_hochul: {
    roster: { name: 'Kathy Hochul', office: 'Governor', state: 'New York', party: 'D', score: 55, icon: '🗽', issues: ['Abortion Rights', 'Gun Safety', 'Immigration', 'Affordability'] },
    label: 'Kathy Hochul — 🗽 Governor of New York (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Governor of New York, Hochul is a strong abortion-rights supporter who has moved to protect and fund access.',
        evidence: 'Governor of New York; former Lieutenant Governor and U.S. Representative.', source: S.hochul },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Signed sweeping gun laws after the Buffalo shooting and the Supreme Court’s concealed-carry ruling.', source: S.hochul },
      { topic: 'Immigration & Migrants', icon: '🛂', pos: 'mixed', issueKey: 'immigration_reform', issueStance: 'mixed',
        text: 'Backs immigrant protections but, amid strain on New York City, has pressed Washington for help and work authorization and urged limits.', source: S.hochul },
      { topic: 'Affordability', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers cost-of-living relief — tax rebates, child credits, and housing — as a top priority.', source: S.hochul },
    ],
  },
  jared_polis: {
    roster: { name: 'Jared Polis', office: 'Governor', state: 'Colorado', party: 'D', score: 56, icon: '🏔', issues: ['Economy & Taxes', 'Healthcare Costs', 'Energy', 'Immigration'] },
    label: 'Jared Polis — 🏔 Governor of Colorado (D)',
    cards: [
      { topic: 'Economy & Taxes', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Governor of Colorado, Polis is a pro-market Democrat and former tech entrepreneur who has cut income-tax rates and champions economic freedom.',
        evidence: 'Governor of Colorado; former U.S. Representative and tech entrepreneur.', source: S.polis },
      { topic: 'Healthcare Costs', icon: '⚕️', pos: 'support', issueKey: 'healthcare_costs', issueStance: 'support',
        text: 'Created a state public-option plan and reinsurance program aimed at lowering premiums and drug costs.', source: S.polis },
      { topic: 'Energy', icon: '🌿', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Set a 100% renewable-electricity goal while touting consumer savings and an all-of-the-above pragmatism.', source: S.polis },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs immigrant protections and legal pathways.', source: S.polis },
    ],
  },
  andy_beshear: {
    roster: { name: 'Andy Beshear', office: 'Governor', state: 'Kentucky', party: 'D', score: 56, icon: '🔵', issues: ['Economy & Jobs', 'Healthcare', 'Abortion Rights', 'Bipartisan'] },
    label: 'Andy Beshear — 🔵 Governor of Kentucky (D)',
    cards: [
      { topic: 'Economy & Jobs', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'A Democrat twice elected in deep-red Kentucky, Beshear touts record job and investment announcements, including major EV-battery plants.',
        evidence: 'Governor of Kentucky; former Kentucky Attorney General.', source: S.beshear },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'A defender of Medicaid expansion and expanding healthcare access in Kentucky.', source: S.beshear },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Has criticized Kentucky’s near-total abortion ban for lacking exceptions and backs restoring access.', source: S.beshear },
      { topic: 'Bipartisan Governing', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Popular across party lines for disaster response and a pragmatic, bipartisan style in a Republican state.', source: S.beshear },
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

console.log(`PolitiDex — National next-tier governors WAVE 21  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — the next tier of high-leverage governors (both parties) · top-down federal wave 21 (Jul 2026) ─\n' +
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
  const block = '\n    // National — the next tier of high-leverage governors (both parties), wave 21 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── 2. PROFILES seed allow-list (anchor on the array's `].forEach` close) ──
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 21 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 21 — the next tier of high-leverage governors (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
