#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — DEEPEN existing state legislative leaders with recent 2025-26
// actions, WAVE 33 (July 2026).
// ---------------------------------------------------------------------------
// Waves 27 and 30 created the presiding officers of the major/battleground state
// legislatures. This pass does NOT create anyone new — it APPENDS one new,
// individually-sourced card on a specific 2025-2026 action to five of them, with
// an emphasis on connecting the dots to figures already in the dataset:
//
//   • DUSTIN BURROWS (dustin_burrows, TX House Speaker): the 2025 quorum-break
//     standoff — authorized civil arrest warrants to compel absent Democrats and
//     shepherded the new congressional map. (Direct Say-vs-Do counterpart to Gene
//     Wu, added this round, and to Abbott's redistricting card.)
//   • ROBERT RIVAS (robert_rivas, CA Assembly Speaker): steered the 2025 mid-decade
//     congressional map (Proposition 50) through the Assembly to counter Texas.
//     (Connects to Newsom's Prop 50 card and the Abbott/Wu redistricting fight.)
//   • CARL HEASTIE (carl_heastie, NY Assembly Speaker): agreed in the 2025 budget
//     to tighten the criminal-discovery law and involuntary-commitment standards.
//   • BEN ALBRITTON (ben_albritton, FL Senate President): a cautious response to the
//     2025 push to slash property taxes.
//   • DANIEL PEREZ (daniel_perez_fl, FL House Speaker): House investigations into the
//     Hope Florida charity tied to the governor's office — an intra-party clash.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): cross-pressured records are
// marked mixed and attributed. Sources are official state-legislature pages.
//
// CLIENT-side and idempotent (guarded per-card by topic sentinel; re-runnable).
//   node scripts/deepen-national-state-leaders-wave33-jul2026.mjs            # dry run
//   node scripts/deepen-national-state-leaders-wave33-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const APPLY = process.argv.includes('--apply');

const SRC = {
  txh: { label: 'house.texas.gov', url: 'https://house.texas.gov/' },
  ca: { label: 'assembly.ca.gov', url: 'https://www.assembly.ca.gov/' },
  ny: { label: 'nyassembly.gov', url: 'https://nyassembly.gov/' },
  fls: { label: 'flsenate.gov', url: 'https://www.flsenate.gov/' },
  flh: { label: 'myfloridahouse.gov', url: 'https://www.myfloridahouse.gov/' },
};

const ADD = {
  dustin_burrows: [
    { topic: 'Redistricting & Quorum', icon: '🗺', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
      text: 'As Speaker during the 2025 special sessions, authorized civil arrest warrants to compel quorum-breaking Democrats to return and shepherded the new congressional map — drawn to add Republican-leaning U.S. House seats — through the House.', source: SRC.txh },
  ],
  robert_rivas: [
    { topic: 'Mid-Decade Redistricting (Prop 50)', icon: '🗺', pos: 'support', issueKey: 'democracy_balance', issueStance: 'mixed',
      text: 'Steered the 2025 mid-decade congressional map through the Assembly and onto the ballot as Proposition 50, which voters approved to add Democratic-leaning seats in direct response to Texas’s redraw.', source: SRC.ca },
  ],
  carl_heastie: [
    { topic: 'Criminal Justice & Discovery', icon: '⚖️', pos: 'mixed', issueKey: 'tough_on_crime', issueStance: 'mixed',
      text: 'Agreed in the 2025 state budget to changes tightening New York’s criminal-discovery law and expanding involuntary-commitment standards, after initially resisting rollbacks of earlier reforms.', source: SRC.ny },
  ],
  ben_albritton: [
    { topic: 'Property Taxes', icon: '🏡', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed',
      text: 'Responded cautiously to the 2025 push to slash or eliminate Florida property taxes, ordering study of the idea while warning about the effect on funding for local services.', source: SRC.fls },
  ],
  daniel_perez_fl: [
    { topic: 'Spending Oversight (Hope Florida)', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
      text: 'Led House investigations in 2025 into the Hope Florida charity tied to the governor’s office over a $10 million Medicaid-settlement diversion — an unusual clash with a governor of his own party.', source: SRC.flh },
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

console.log(`PolitiDex — DEEPEN state legislative leaders WAVE 33  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
if (APPLY && appended) { fs.writeFileSync(STANCES, stances); console.log(`  ✎ appended ${appended} card(s) to politician-stances.js`); }
if (!APPLY) console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs');
else console.log('\nApplied. NEXT: node scripts/split-stances.mjs');
