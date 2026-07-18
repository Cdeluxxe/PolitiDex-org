#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-6 federal figures into the "How Politicians Stand"
// panels of the eight Issue Spotlights named in the run (July 2026).
// Idempotent: skips any id already present in a panel. CLIENT-side (index.html).
//   node scripts/wire-national-wave6-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave6-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  'tariffs-cost-of-living-inflation': [
    { id: 'boozman', name: 'John Boozman', office: 'Senate Agriculture Chair · Arkansas', icon: '🌾', topic: 'Farm Exports & Tariffs', stance: 'mixed' },
    { id: 'glenn_thompson', name: 'Glenn Thompson', office: 'House Agriculture Chair · Pennsylvania', icon: '🌾', topic: 'Farm Exports & Trade', stance: 'mixed' },
    { id: 'angie_craig', name: 'Angie Craig', office: 'House Agriculture Ranking Member · Minnesota', icon: '🌽', topic: 'Ag Trade & Retaliation', stance: 'mixed' },
    { id: 'tammy_baldwin', name: 'Tammy Baldwin', office: 'U.S. Senator · Wisconsin', icon: '🏭', topic: 'Buy America & Manufacturing', stance: 'mixed' },
  ],
  'government-spending-debt-entitlement-reform': [
    { id: 'cassidy', name: 'Bill Cassidy', office: 'Senate HELP Chair · Louisiana', icon: '⚕️', topic: 'Social Security Solvency', stance: 'mixed' },
    { id: 'jerry_moran', name: 'Jerry Moran', office: "Senate Veterans' Affairs Chair · Kansas", icon: '🎖', topic: 'Appropriations', stance: 'mixed' },
    { id: 'boozman', name: 'John Boozman', office: 'Senate Agriculture Chair · Arkansas', icon: '🌾', topic: 'SNAP & Farm Spending', stance: 'mixed' },
    { id: 'tammy_baldwin', name: 'Tammy Baldwin', office: 'U.S. Senator · Wisconsin', icon: '🏭', topic: 'Domestic Spending', stance: 'opposed' },
  ],
  'energy-abundance-grid-reliability-2026': [
    { id: 'bruce_westerman', name: 'Bruce Westerman', office: 'House Natural Resources Chair · Arkansas', icon: '🌲', topic: 'Public Lands & Production', stance: 'supported' },
    { id: 'sam_graves', name: 'Sam Graves', office: 'House Transportation & Infrastructure Chair · Missouri', icon: '🚧', topic: 'Permitting & Infrastructure', stance: 'supported' },
    { id: 'angie_craig', name: 'Angie Craig', office: 'House Agriculture Ranking Member · Minnesota', icon: '🌽', topic: 'Biofuels & Clean Energy', stance: 'mixed' },
    { id: 'cortez_masto', name: 'Catherine Cortez Masto', office: 'U.S. Senator · Nevada', icon: '⚡', topic: 'Nevada Clean Energy', stance: 'mixed' },
  ],
  'border-security-asylum-reform-2026': [
    { id: 'cortez_masto', name: 'Catherine Cortez Masto', office: 'U.S. Senator · Nevada', icon: '⚖️', topic: 'Border-State Pragmatism', stance: 'mixed' },
    { id: 'boozman', name: 'John Boozman', office: 'Senate Agriculture Chair · Arkansas', icon: '🌾', topic: 'Enforcement & Fentanyl', stance: 'supported' },
  ],
  'ai-regulation-job-displacement-2026': [
    { id: 'jon_ossoff', name: 'Jon Ossoff', office: 'U.S. Senator · Georgia', icon: '💻', topic: 'Tech Guardrails & Oversight', stance: 'supported' },
  ],
  'trust-institutions-social-capital-2026': [
    { id: 'jon_ossoff', name: 'Jon Ossoff', office: 'U.S. Senator · Georgia', icon: '💻', topic: 'Oversight & Accountability', stance: 'supported' },
  ],
  'cryptocurrency-regulation-cbdc-debate-2026': [
    { id: 'cortez_masto', name: 'Catherine Cortez Masto', office: 'U.S. Senator · Nevada', icon: '🪙', topic: 'Digital-Asset Rules & Safeguards', stance: 'mixed' },
  ],
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'jerry_moran', name: 'Jerry Moran', office: "Senate Veterans' Affairs Chair · Kansas", icon: '🎖', topic: 'Israel Aid', stance: 'supported' },
    { id: 'jon_ossoff', name: 'Jon Ossoff', office: 'U.S. Senator · Georgia', icon: '💻', topic: 'Israel Aid with Conditions', stance: 'mixed' },
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
  const newContent = trimmed + '\n            // remaining chairs & marquee members — top-down federal wave 6 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
