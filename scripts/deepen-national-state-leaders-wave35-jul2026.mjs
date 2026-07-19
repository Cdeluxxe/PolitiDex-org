#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — DEEPEN existing state legislative leaders, WAVE 35 (July 2026).
// ---------------------------------------------------------------------------
// Appends one new, individually-sourced card on a 2025 divided-government budget
// role to two leaders already in the dataset — reinforcing the "governing across
// the aisle in a narrow/divided legislature" theme this round surfaces.
//
//   • ROBIN VOS (robin_vos, WI Assembly Speaker): the 2025 bipartisan biennial
//     budget deal with Democratic Gov. Evers.
//   • KIM WARD (kim_ward, PA Senate President pro Tempore): negotiating the end of
//     the long 2025-26 budget impasse in a split legislature under Gov. Shapiro.
//
// CLIENT-side and idempotent (guarded per-card by topic sentinel; re-runnable).
//   node scripts/deepen-national-state-leaders-wave35-jul2026.mjs            # dry run
//   node scripts/deepen-national-state-leaders-wave35-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const APPLY = process.argv.includes('--apply');

const SRC = {
  wi: { label: 'legis.wisconsin.gov', url: 'https://legis.wisconsin.gov/' },
  pa: { label: 'legis.state.pa.us', url: 'https://www.legis.state.pa.us/' },
};

const ADD = {
  robin_vos: [
    { topic: 'Bipartisan Budget Deal', icon: '🤝', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
      text: 'Struck a 2025 bipartisan biennial budget with Democratic Governor Evers, pairing income-tax cuts with new funding for child care and the University of Wisconsin — a compromise shaped by his narrowed majority after the 2024 "fair maps" elections.', source: SRC.wi },
  ],
  kim_ward: [
    { topic: '2025-26 Budget Impasse', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
      text: 'Was a central Republican negotiator in ending the months-long 2025-26 state budget impasse among Pennsylvania’s Republican Senate, Democratic House, and Democratic Governor Shapiro.', source: SRC.pa },
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

console.log(`PolitiDex — DEEPEN state legislative leaders WAVE 35  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
