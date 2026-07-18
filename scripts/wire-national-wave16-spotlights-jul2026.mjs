#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-16 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026), including the new PFAS
// "Forever Chemicals" guide. Stances follow each panel's axis note. Idempotent.
//   node scripts/wire-national-wave16-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave16-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // PFAS: Supports = strict limits/cleanup/liability; Opposes = cost realism/rollback; Mixed = targeted.
  'pfas-forever-chemicals-2026': [
    { id: 'gillibrand', name: 'Kirsten Gillibrand', office: 'U.S. Senator · New York', icon: '💧', topic: 'Military-Base Cleanup', stance: 'supported' },
    { id: 'debbie_dingell', name: 'Debbie Dingell', office: 'U.S. Representative · Michigan', icon: '🚗', topic: 'PFAS Task Force', stance: 'supported' },
    { id: 'maggie_hassan', name: 'Maggie Hassan', office: 'U.S. Senator · New Hampshire', icon: '💧', topic: 'Clean Water & Accountability', stance: 'supported' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'jim_justice', name: 'Jim Justice', office: 'U.S. Senator · West Virginia', icon: '⛏', topic: 'Coal & Gas', stance: 'supported' },
    { id: 'hoeven', name: 'John Hoeven', office: 'U.S. Senator · North Dakota', icon: '🛢', topic: 'Bakken Oil & Pipelines', stance: 'supported' },
    { id: 'debbie_dingell', name: 'Debbie Dingell', office: 'U.S. Representative · Michigan', icon: '🚗', topic: 'Autos & EV Transition', stance: 'mixed' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'ashley_moody', name: 'Ashley Moody', office: 'U.S. Senator · Florida', icon: '⚖️', topic: 'Enforcement & Litigation', stance: 'supported' },
    { id: 'jim_justice', name: 'Jim Justice', office: 'U.S. Senator · West Virginia', icon: '⛏', topic: 'Enforcement', stance: 'supported' },
    { id: 'maggie_hassan', name: 'Maggie Hassan', office: 'U.S. Senator · New Hampshire', icon: '💧', topic: 'Security + Pathways', stance: 'mixed' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'ricketts', name: 'Pete Ricketts', office: 'U.S. Senator · Nebraska', icon: '🌐', topic: 'Spending Cuts', stance: 'supported' },
    { id: 'steny_hoyer', name: 'Steny Hoyer', office: 'U.S. Representative · Maryland', icon: '🏛', topic: 'Defend Appropriations', stance: 'opposed' },
  ],
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'steny_hoyer', name: 'Steny Hoyer', office: 'U.S. Representative · Maryland', icon: '🏛', topic: 'Aid & the Alliance', stance: 'supported' },
    { id: 'ricketts', name: 'Pete Ricketts', office: 'U.S. Senator · Nebraska', icon: '🌐', topic: 'Aid & Defense', stance: 'supported' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'ricketts', name: 'Pete Ricketts', office: 'U.S. Senator · Nebraska', icon: '🌐', topic: 'Counter China & Taiwan Aid', stance: 'supported' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'bennet', name: 'Michael Bennet', office: 'U.S. Senator · Colorado', icon: '🏔', topic: 'A Federal AI Agency', stance: 'supported' },
    { id: 'gillibrand', name: 'Kirsten Gillibrand', office: 'U.S. Senator · New York', icon: '💧', topic: 'Guardrails & Child Safety', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'steny_hoyer', name: 'Steny Hoyer', office: 'U.S. Representative · Maryland', icon: '🏛', topic: 'Democracy & Regular Order', stance: 'supported' },
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
  const newContent = trimmed + '\n            // PFAS/env-health leaders, a senior leader & new senators — federal wave 16 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
