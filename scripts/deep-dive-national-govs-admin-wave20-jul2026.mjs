#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: REMAINING FEDERAL ADMIN LEADERS + THE
// HIGHEST-LEVERAGE GOVERNORS, WAVE 20 (July 2026) — after waves 1-19.
// ---------------------------------------------------------------------------
// After 19 waves the federal officeholder bench (Cabinet, congressional
// leadership, committee chairs, senators, high-profile reps) is essentially
// saturated. The genuinely-absent, highest-leverage figures left are (a) a few
// federal agency/administration leaders not tied to a Cabinet department, and
// (b) the nation's most consequential GOVERNORS — the shadow-2028 field who
// drive the national debates our Spotlights cover (border, energy, abortion,
// spending, tech). This wave adds both, balanced across parties:
//
//   FEDERAL ADMIN / AGENCY LEADERS
//   • JEROME POWELL (jerome_powell) — Federal Reserve Chair (I): inflation and
//     interest rates, full employment, tariffs and prices, and a digital dollar.
//   • DAN BONGINO (dan_bongino) — FBI Deputy Director (R): crime, backing police,
//     the border and fentanyl, and transparency.
//   • KELLY LOEFFLER (kelly_loeffler) — SBA Administrator, Cabinet rank (R):
//     small business, taxes, spending, and energy.
//   • ANDREW FERGUSON (andrew_ferguson) — FTC Chair (R): Big Tech and antitrust,
//     free speech, AI competition, and consumer protection.
//
//   GOVERNORS (3R / 3D)
//   • RON DeSANTIS (ron_desantis) — Governor of Florida (R): immigration,
//     education and parental rights, abortion, and spending.
//   • GREG ABBOTT (greg_abbott) — Governor of Texas (R): border security
//     (Operation Lone Star), energy, abortion, and business.
//   • GAVIN NEWSOM (gavin_newsom) — Governor of California (D): climate and
//     energy, immigration, abortion rights, and clean cars.
//   • GRETCHEN WHITMER (gretchen_whitmer) — Governor of Michigan (D): auto and
//     manufacturing, abortion rights, infrastructure, and the EV transition.
//   • JOSH SHAPIRO (josh_shapiro) — Governor of Pennsylvania (D): energy,
//     bipartisan governing, public education, and abortion rights.
//   • JB PRITZKER (jb_pritzker) — Governor of Illinois (D): abortion rights,
//     immigration, taxes and spending, and infrastructure.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Powell's data-driven,
// independent posture and cross-pressured records (Shapiro on gas + climate,
// Whitmer on the auto/EV transition) are marked mixed and attributed. Sources
// are official agency or office pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-govs-admin-wave20-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-govs-admin-wave20-jul2026.mjs --apply    # write
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
  fed:      { label: 'federalreserve.gov', url: 'https://www.federalreserve.gov/newsevents.htm' },
  fbi:      { label: 'fbi.gov', url: 'https://www.fbi.gov/news' },
  sba:      { label: 'sba.gov', url: 'https://www.sba.gov/about-sba/organization/sba-leadership' },
  ftc:      { label: 'ftc.gov', url: 'https://www.ftc.gov/news-events' },
  desantis: { label: 'flgov.com', url: 'https://www.flgov.com/eog/news' },
  abbott:   { label: 'gov.texas.gov', url: 'https://gov.texas.gov/news' },
  newsom:   { label: 'gov.ca.gov', url: 'https://www.gov.ca.gov/newsroom/' },
  whitmer:  { label: 'michigan.gov/whitmer', url: 'https://www.michigan.gov/whitmer/news' },
  shapiro:  { label: 'pa.gov', url: 'https://www.pa.gov/governor/newsroom.html' },
  pritzker: { label: 'illinois.gov', url: 'https://www.illinois.gov/news.html' },
};

const NEW = {
  jerome_powell: {
    roster: { name: 'Jerome Powell', office: 'Federal Reserve Chair', state: 'Federal', party: 'I', score: 55, icon: '🏦', issues: ['Inflation & Rates', 'Full Employment', 'Tariffs & Prices', 'Digital Dollar'] },
    label: 'Jerome Powell — 🏦 Federal Reserve Chair (I)',
    cards: [
      { topic: 'Inflation & Interest Rates', icon: '📉', pos: 'mixed', issueKey: 'cost_living', issueStance: 'mixed',
        text: 'As Federal Reserve Chair, Powell steers a data-driven path back to the Fed’s 2% inflation target, resisting political pressure to cut rates faster and holding policy where he judges the data warrants.',
        evidence: 'Chair of the Board of Governors of the Federal Reserve System.', source: S.fed },
      { topic: 'Full Employment', icon: '💼', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Under the Fed’s dual mandate, Powell weighs maximum employment alongside price stability in setting rates.', source: S.fed },
      { topic: 'Tariffs & Prices', icon: '🏷', pos: 'mixed', issueKey: 'tariffs_prices', issueStance: 'mixed',
        text: 'Has cautioned that broad tariffs can raise consumer prices and complicate the inflation fight, while stressing the Fed reacts to data rather than to trade politics.', source: S.fed },
      { topic: 'Digital Dollar (CBDC)', icon: '💵', pos: 'mixed', issueKey: 'crypto_cbdc', issueStance: 'mixed',
        text: 'Says the Fed would not launch a central-bank digital currency without clear authorization from Congress, and favors a cautious approach.', source: S.fed },
    ],
  },
  dan_bongino: {
    roster: { name: 'Dan Bongino', office: 'FBI Deputy Director', state: 'Federal', party: 'R', score: 53, icon: '🚔', issues: ['Crime', 'Back the Police', 'Border & Fentanyl', 'Transparency'] },
    label: 'Dan Bongino — 🚔 FBI Deputy Director (R)',
    cards: [
      { topic: 'Crime & Law Enforcement', icon: '🚓', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'A former Secret Service agent and NYPD officer now serving as FBI Deputy Director, Bongino emphasizes aggressive enforcement against violent crime.',
        evidence: 'Deputy Director of the FBI; former Secret Service agent and NYPD officer.', source: S.fbi },
      { topic: 'Backing the Police', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'A vocal supporter of police, he opposes efforts to defund or curtail law enforcement.', source: S.fbi },
      { topic: 'Border & Fentanyl', icon: '💊', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'Backs strict border enforcement and going after fentanyl trafficking and the cartels behind it.', source: S.fbi },
      { topic: 'FBI Transparency', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Has pledged to increase transparency and rebuild public trust in the FBI.', source: S.fbi },
    ],
  },
  kelly_loeffler: {
    roster: { name: 'Kelly Loeffler', office: 'SBA Administrator', state: 'Federal', party: 'R', score: 54, icon: '🏢', issues: ['Small Business', 'Taxes', 'Spending', 'Energy'] },
    label: 'Kelly Loeffler — 🏢 SBA Administrator (R)',
    cards: [
      { topic: 'Small Business', icon: '🏢', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: 'A former U.S. senator and business executive now leading the Small Business Administration, Loeffler focuses on cutting red tape and capital access for small firms.',
        evidence: 'Administrator of the U.S. Small Business Administration (Cabinet rank); former U.S. Senator (GA).', source: S.sba },
      { topic: 'Taxes & Deregulation', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Backs extending the 2017 tax cuts and cutting regulations she says burden small business.', source: S.sba },
      { topic: 'Government Spending', icon: '🧾', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'A fiscal conservative who backs spending restraint and rooting out waste and fraud.', source: S.sba },
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Supports expanding American energy production and lower energy costs for businesses.', source: S.sba },
    ],
  },
  andrew_ferguson: {
    roster: { name: 'Andrew Ferguson', office: 'FTC Chair', state: 'Federal', party: 'R', score: 55, icon: '⚖️', issues: ['Big Tech & Antitrust', 'Free Speech', 'AI Competition', 'Consumers'] },
    label: 'Andrew Ferguson — ⚖️ FTC Chair (R)',
    cards: [
      { topic: 'Big Tech & Antitrust', icon: '🏛', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'As Federal Trade Commission Chair, Ferguson pursues aggressive antitrust scrutiny of dominant technology platforms.',
        evidence: 'Chair of the Federal Trade Commission (FTC).', source: S.ftc },
      { topic: 'Free Speech & Censorship', icon: '🗣', pos: 'support', issueKey: 'free_speech', issueStance: 'support',
        text: 'Has made policing Big Tech "censorship" of lawful speech a priority of his FTC.', source: S.ftc },
      { topic: 'AI Competition', icon: '🤖', pos: 'mixed', issueKey: 'tech_innovation', issueStance: 'mixed',
        text: 'Backs U.S. AI innovation while watching for anticompetitive conduct by the largest AI and cloud firms.', source: S.ftc },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues enforcement against fraud, data-privacy abuses, and deceptive business practices.', source: S.ftc },
    ],
  },
  ron_desantis: {
    roster: { name: 'Ron DeSantis', office: 'Governor', state: 'Florida', party: 'R', score: 55, icon: '🌴', issues: ['Immigration', 'Education', 'Abortion', 'Spending'] },
    label: 'Ron DeSantis — 🌴 Governor of Florida (R)',
    cards: [
      { topic: 'Immigration & Border', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Governor of Florida, DeSantis backs strict immigration enforcement, state cooperation with deportations, and cracking down on illegal immigration.',
        evidence: 'Governor of Florida; former U.S. Representative.', source: S.desantis },
      { topic: 'Education & Parental Rights', icon: '🎓', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
        text: 'A national leader on parental rights, school choice, and curriculum limits in public schools and universities.', source: S.desantis },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed a six-week abortion limit in Florida and backs strong restrictions on abortion.', source: S.desantis },
      { topic: 'Government Spending', icon: '🧾', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Champions state spending restraint, tax cuts, and rooting out what he calls government waste and "woke" programs.', source: S.desantis },
    ],
  },
  greg_abbott: {
    roster: { name: 'Greg Abbott', office: 'Governor', state: 'Texas', party: 'R', score: 55, icon: '🤠', issues: ['Border', 'Energy', 'Abortion', 'Business'] },
    label: 'Greg Abbott — 🤠 Governor of Texas (R)',
    cards: [
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Governor of Texas, Abbott launched Operation Lone Star — state troops, razor wire, and busing — making him a national face of aggressive border enforcement.',
        evidence: 'Governor of Texas; former Texas Attorney General.', source: S.abbott },
      { topic: 'Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'From the nation’s top oil-and-gas state, strongly backs fossil-fuel production and opposes federal limits.', source: S.abbott },
      { topic: 'Abortion', icon: '🍼', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Signed Texas’s near-total abortion ban and backs strong restrictions on abortion.', source: S.abbott },
      { topic: 'Business & Taxes', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Touts low taxes, light regulation, and business relocation to Texas as an economic model.', source: S.abbott },
    ],
  },
  gavin_newsom: {
    roster: { name: 'Gavin Newsom', office: 'Governor', state: 'California', party: 'D', score: 56, icon: '🐻', issues: ['Climate & Energy', 'Immigration', 'Abortion Rights', 'Clean Cars'] },
    label: 'Gavin Newsom — 🐻 Governor of California (D)',
    cards: [
      { topic: 'Climate & Energy', icon: '🌿', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Governor of California, Newsom pushes aggressive climate action, clean energy, and emissions targets, positioning himself as a national counterweight to fossil-first policy.',
        evidence: 'Governor of California; former Lieutenant Governor and Mayor of San Francisco.', source: S.newsom },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs immigrant protections and has clashed with federal mass-deportation efforts in California.', source: S.newsom },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A national champion of abortion rights who has moved to make California a refuge for reproductive care.', source: S.newsom },
      { topic: 'Clean Cars & EVs', icon: '🔋', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Set California’s rule phasing out new gas-car sales, a policy Republicans have moved to block.', source: S.newsom },
    ],
  },
  gretchen_whitmer: {
    roster: { name: 'Gretchen Whitmer', office: 'Governor', state: 'Michigan', party: 'D', score: 56, icon: '🚗', issues: ['Auto & Manufacturing', 'Abortion Rights', 'Infrastructure', 'EV Transition'] },
    label: 'Gretchen Whitmer — 🚗 Governor of Michigan (D)',
    cards: [
      { topic: 'Auto & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Governor of Michigan, Whitmer centers auto jobs, manufacturing, and union workers, courting factory investment to the state.',
        evidence: 'Governor of Michigan; former state Senate Democratic leader.', source: S.whitmer },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A national voice for abortion rights who backed enshrining reproductive freedom in Michigan’s constitution.', source: S.whitmer },
      { topic: 'Infrastructure', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Ran on "fix the damn roads" and has prioritized infrastructure and road funding.', source: S.whitmer },
      { topic: 'EV Transition', icon: '🔋', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Backs a managed shift to electric vehicles and clean energy while protecting Michigan auto jobs and supply chains.', source: S.whitmer },
    ],
  },
  josh_shapiro: {
    roster: { name: 'Josh Shapiro', office: 'Governor', state: 'Pennsylvania', party: 'D', score: 56, icon: '🔔', issues: ['Energy', 'Bipartisan', 'Education', 'Abortion Rights'] },
    label: 'Josh Shapiro — 🔔 Governor of Pennsylvania (D)',
    cards: [
      { topic: 'Energy', icon: '🛢', pos: 'mixed', issueKey: 'enviro_energy', issueStance: 'mixed',
        text: 'Governor of Pennsylvania, Shapiro backs the state’s natural-gas industry and jobs while pursuing emissions limits — a balance-minded stance in a major energy state.',
        evidence: 'Governor of Pennsylvania; former Pennsylvania Attorney General.', source: S.shapiro },
      { topic: 'Bipartisan Governing', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A results-focused governor who touts bipartisan deals with a divided legislature.', source: S.shapiro },
      { topic: 'Public Education', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Prioritizes public-school funding and closing school-funding gaps.', source: S.shapiro },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A supporter of abortion rights who has pledged to protect access in Pennsylvania.', source: S.shapiro },
    ],
  },
  jb_pritzker: {
    roster: { name: 'JB Pritzker', office: 'Governor', state: 'Illinois', party: 'D', score: 56, icon: '🏛', issues: ['Abortion Rights', 'Immigration', 'Taxes', 'Infrastructure'] },
    label: 'JB Pritzker — 🏛 Governor of Illinois (D)',
    cards: [
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Governor of Illinois, Pritzker has made the state a Midwestern haven for abortion access and is a national voice for reproductive rights.',
        evidence: 'Governor of Illinois; businessman and philanthropist.', source: S.pritzker },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: 'Backs immigrant protections and has resisted and criticized federal mass-deportation efforts.', source: S.pritzker },
      { topic: 'Taxes & Spending', icon: '🧾', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Pushed a graduated income tax and backs funding public services and the social safety net.', source: S.pritzker },
      { topic: 'Infrastructure & Jobs', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Enacted a large state capital plan for roads, transit, and infrastructure.', source: S.pritzker },
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

console.log(`PolitiDex — National federal admin leaders + top governors WAVE 20  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National federal admin/agency leaders (Fed, FBI, SBA, FTC) + the highest-leverage governors · top-down federal wave 20 (Jul 2026) ─\n' +
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
  const block = '\n    // National — federal admin/agency leaders (Fed, FBI, SBA, FTC) + top governors, wave 20 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

// ── 2. PROFILES seed allow-list (directory / search / Your Ballot) ─────────
// Anchor on the array's `].forEach` close so this survives earlier waves'
// backfill blocks being appended ahead of it.
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 20 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National wave 20 — federal admin/agency leaders + top governors (July 2026)\n" +
    "        " + seedIds.slice(0, 5).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(5).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
