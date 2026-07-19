#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — DEEPEN marquee / battleground GOVERNORS with recent 2025-26 acts,
// WAVE 31 (July 2026).
// ---------------------------------------------------------------------------
// All 50 governors already carry curated stance cards (waves 20-25). This pass
// does NOT create anyone new — it APPENDS new, individually-sourced Stance-at-a-
// Glance cards on specific 2025-2026 actions to the six most-covered marquee /
// battleground governors, and wires the new say-vs-do angles into the relevant
// Issue Spotlights. Each new card is an act the individual personally took or a
// position they personally stated, keyed to an ISSUE_MAP issue.
//
//   • GAVIN NEWSOM (gavin_newsom, CA-D): the 2025 National Guard / LA lawsuit
//     against the federal government; the CEQA rollback to speed housing.
//   • GREG ABBOTT (greg_abbott, TX-R): record property-tax relief; Texas's first
//     private-school voucher program (2025).
//   • RON DeSANTIS (ron_desantis, FL-R): the property-insurance overhaul; a state
//     "DOGE" spending-audit initiative (2025).
//   • GRETCHEN WHITMER (gretchen_whitmer, MI-D): free community college / universal
//     pre-K (2025); a cross-pressured stance on tariffs and auto jobs.
//   • JOSH SHAPIRO (josh_shapiro, PA-D): redirecting funds to save SEPTA transit;
//     his cross-party support-then-veto on private-school vouchers.
//   • KATHY HOCHUL (kathy_hochul, NY-D): National Guard on the subways / public
//     safety; the 2025 bell-to-bell school cellphone ban.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): cross-pressured records are
// marked mixed and attributed — Newsom (climate champion who rolled back CEQA
// review), Whitmer (tariffs), Shapiro (vouchers). Sources are official governor's-
// office pages, matching each governor's existing cards.
//
// CLIENT-side and idempotent (guarded per-card by topic sentinel; re-runnable).
//   node scripts/deepen-national-governors-wave31-jul2026.mjs            # dry run
//   node scripts/deepen-national-governors-wave31-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const SRC = {
  ca: { label: 'gov.ca.gov', url: 'https://www.gov.ca.gov/newsroom/' },
  tx: { label: 'gov.texas.gov', url: 'https://gov.texas.gov/news' },
  fl: { label: 'flgov.com', url: 'https://www.flgov.com/eog/news' },
  mi: { label: 'michigan.gov/whitmer', url: 'https://www.michigan.gov/whitmer/news' },
  pa: { label: 'pa.gov', url: 'https://www.pa.gov/governor/newsroom.html' },
  ny: { label: 'governor.ny.gov', url: 'https://www.governor.ny.gov/news' },
};

// New cards to APPEND to each existing stance array.
const ADD = {
  gavin_newsom: [
    { topic: 'National Guard & Federal Power', icon: '🛡', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose',
      text: 'Sued the federal government over its 2025 deployment of the National Guard and Marines to Los Angeles during immigration protests, calling it an unlawful overreach into state authority.', source: SRC.ca },
    { topic: 'Housing & CEQA Reform', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
      text: 'Signed a 2025 overhaul rolling back California’s landmark environmental-review law (CEQA) for most housing, aiming to speed construction — a notable break from his climate-first record in the name of affordability.', source: SRC.ca },
  ],
  greg_abbott: [
    { topic: 'Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support',
      text: 'Signed record property-tax relief, including a 2025 package raising the homestead exemption, touting what he calls the largest cut in Texas history.', source: SRC.tx },
    { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
      text: 'Signed Texas’s first private-school voucher program in 2025 — a roughly $1 billion education-savings-account plan — after years of pushing school choice against rural resistance within his own party.', source: SRC.tx },
  ],
  ron_desantis: [
    { topic: 'Property Insurance', icon: '🏠', pos: 'mixed', issueKey: 'cost_living', issueStance: 'mixed',
      text: 'Signed property-insurance overhauls he credits with stabilizing Florida’s troubled market and slowing rate increases, though premiums remain among the highest in the nation.', source: SRC.fl },
    { topic: 'State Spending Audits ("DOGE")', icon: '🔍', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
      text: 'Launched a Florida "DOGE" initiative in 2025 to audit state universities and local-government spending for waste, mirroring the federal effort.', source: SRC.fl },
  ],
  gretchen_whitmer: [
    { topic: 'Free Community College & Pre-K', icon: '🎓', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
      text: 'Backed making community college tuition-free for recent Michigan high-school graduates and expanding pre-K toward universal access for four-year-olds.', source: SRC.mi },
    { topic: 'Tariffs & Auto Jobs', icon: '🏭', pos: 'mixed', issueKey: 'econ_workers', issueStance: 'mixed',
      text: 'Warned that broad 2025 tariffs could raise costs for Michigan’s auto industry and consumers, while saying she supports targeted efforts to protect domestic manufacturing — a careful line in a trade-exposed state.', source: SRC.mi },
  ],
  josh_shapiro: [
    { topic: 'Transit Funding (SEPTA)', icon: '🚆', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
      text: 'Redirected state highway funds in 2025 to head off deep service cuts to SEPTA, Philadelphia’s transit system, amid a standoff with the legislature over dedicated transit funding.', source: SRC.pa },
    { topic: 'School Vouchers', icon: '🎓', pos: 'mixed', issueKey: 'school_choice', issueStance: 'mixed',
      text: 'Endorsed private-school "Lifeline Scholarship" vouchers — a break with many in his party — but then line-item vetoed the funding to close a budget deal, drawing criticism from both supporters and opponents.', source: SRC.pa },
  ],
  kathy_hochul: [
    { topic: 'Subway & Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
      text: 'Deployed National Guard troops and state police to New York City’s subways to address high-profile crime and moved to expand standards for involuntary commitment of people with severe mental illness.', source: SRC.ny },
    { topic: 'Phone-Free Schools', icon: '📵', pos: 'support', issueKey: 'edu_parental', issueStance: 'support',
      text: 'Signed a 2025 law making New York the largest state to bar smartphones in schools bell-to-bell, citing student mental health and classroom focus.', source: SRC.ny },
  ],
};

// Governor display info for spotlight wiring of the NEW say-vs-do angles.
const G = {
  greg_abbott: { name: 'Greg Abbott', office: 'Governor · Texas', icon: '🤠' },
  josh_shapiro: { name: 'Josh Shapiro', office: 'Governor · Pennsylvania', icon: '🔔' },
  gavin_newsom: { name: 'Gavin Newsom', office: 'Governor · California', icon: '🐻' },
  kathy_hochul: { name: 'Kathy Hochul', office: 'Governor · New York', icon: '🗽' },
};
const wrow = (id, topic, stance) => ({ id, ...G[id], topic, stance });
const WIRE = {
  // School choice: Supports = choice/vouchers; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    wrow('greg_abbott', 'First Texas Vouchers (2025)', 'supported'),
    wrow('josh_shapiro', 'Backed Then Vetoed Vouchers', 'mixed'),
  ],
  // Housing: Supports = build more / deregulate supply; Opposed = restrict.
  'housing-affordability-crisis-2026': [
    wrow('gavin_newsom', 'CEQA Rollback for Housing', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    wrow('kathy_hochul', 'Guard on the Subways', 'supported'),
  ],
};

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
const allCards = Object.values(ADD).flat();
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

console.log(`PolitiDex — DEEPEN marquee governors WAVE 31  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

// ── 1) Append new stance cards into each existing array (idempotent) ─────────
let stances = fs.readFileSync(STANCES, 'utf8');
let appended = 0;
for (const [id, cards] of Object.entries(ADD)) {
  const open = stances.indexOf(`\n    ${id}: [`);
  if (open < 0) { console.log(`  ✗ ${id}: stance array not found — skipped`); continue; }
  const close = stances.indexOf('\n    ],', open);
  if (close < 0) { console.log(`  ✗ ${id}: array close not found — skipped`); continue; }
  const slice = stances.slice(open, close);
  const fresh = cards.filter((c) => !slice.includes(`topic:'${esc(c.topic)}'`));
  console.log(`  ${fresh.length ? '→' : '·'} ${id}: +${fresh.length} card(s)${fresh.length ? '' : ' (present — skipped)'}`);
  if (!fresh.length || !APPLY) continue;
  const insertion = '\n' + fresh.map(cardStr).join('\n');
  stances = stances.slice(0, close) + insertion + stances.slice(close);
  appended += fresh.length;
}
if (APPLY && appended) { fs.writeFileSync(STANCES, stances); console.log(`  ✎ appended ${appended} governor card(s) to politician-stances.js`); }

// ── 2) Wire the new say-vs-do angles into Issue Spotlights (idempotent) ──────
let html = fs.readFileSync(INDEX, 'utf8');
let wired = 0;
for (const [slug, adds] of Object.entries(WIRE)) {
  const start = html.indexOf(`'${slug}': {`);
  if (start < 0) { console.log(`  ✗ slug not found: ${slug}`); continue; }
  const sIdx = html.indexOf('standsOnIssue', start);
  const pIdx = html.indexOf('people:', sIdx);
  const arrOpen = html.indexOf('[', pIdx);
  const closeIdx = html.indexOf('\n          ]', arrOpen);
  if (sIdx < 0 || pIdx < 0 || arrOpen < 0 || closeIdx < 0) { console.log(`  ✗ people array not found: ${slug}`); continue; }
  const content = html.slice(arrOpen + 1, closeIdx);
  const present = new Set([...content.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
  const fresh = adds.filter((e) => !present.has(e.id));
  if (!fresh.length) { console.log(`  · ${slug}: all present — skipped`); continue; }
  let trimmed = content.replace(/\s+$/, '');
  if (!trimmed.endsWith(',')) trimmed += ',';
  let addStr = fresh
    .map((e) => `\n            { id: '${e.id}', name: '${esc(e.name)}', office: '${esc(e.office)}', icon: '${e.icon}', topic: '${esc(e.topic)}', stance: '${e.stance}' },`)
    .join('');
  addStr = addStr.replace(/,$/, '');
  const newContent = trimmed + '\n            // Governor deepening — new 2025-26 acts, state wave 31 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  wired += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}
if (APPLY && wired) { fs.writeFileSync(INDEX, html); console.log(`  ✎ wired ${wired} governor row(s) into Issue Spotlights`); }

if (!APPLY) console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs');
else console.log('\nApplied. NEXT: node scripts/split-stances.mjs');
