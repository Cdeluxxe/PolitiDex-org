#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire MITCH McCONNELL into the "How Politicians Stand" panels of the
// relevant Issue Spotlights (top-down federal wave 23, July 2026). Each stance
// follows the panel's own axis, verified against the existing rows:
//
//   • Ukraine (supported = backs continued aid / hard line on Russia) → supported
//   • U.S.–Israel aid (supported = strong support for Israel & aid)   → supported
//   • China–Taiwan / defense (supported = tough line / defense hawk)  → supported
//   • Trade policy (supported = pro-tariff / reshoring)               → opposed (free-trader)
//   • Government spending (supported = cut-spending / DOGE hawk)      → mixed (defense appropriator)
//
// Idempotent — only adds McConnell where he is not already present.
//   node scripts/wire-national-wave23-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave23-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const M = { id: 'mcconnell', name: 'Mitch McConnell', office: 'U.S. Senator · Kentucky', icon: '🏛' };

const WIRE = {
  'ukraine-russia-war-us-aid-peace-2026': [
    { ...M, topic: 'Continued Ukraine Aid', stance: 'supported' },
  ],
  'us-israel-relations-foreign-aid-partnership-2026': [
    { ...M, topic: 'Support for Israel & Aid', stance: 'supported' },
  ],
  'china-taiwan-tensions-us-defense-2026': [
    { ...M, topic: 'Defense Hawk', stance: 'supported' },
  ],
  'trade-policy-reshoring-supply-chain-2026': [
    { ...M, topic: 'Free Trade / Tariff Skeptic', stance: 'opposed' },
  ],
  'government-spending-debt-entitlement-reform': [
    { ...M, topic: 'Debt vs. Defense Funding', stance: 'mixed' },
  ],
};

let html = fs.readFileSync(INDEX, 'utf8');
let totalAdded = 0;

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
  const newContent = trimmed + '\n            // Mitch McConnell — top-down federal wave 23 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.stance).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
