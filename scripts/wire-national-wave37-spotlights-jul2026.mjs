#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-37 state legislative leaders (new states) into the
// "How Politicians Stand" panels of the relevant Issue Spotlights (July 2026).
// Each stance follows the panel's own axis, verified against existing rows.
// Idempotent.
//   node scripts/wire-national-wave37-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave37-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const L = {
  julie_fahey: { name: 'Julie Fahey', office: 'House Speaker · Oregon', icon: '🏛' },
  matt_ritter: { name: 'Matt Ritter', office: 'House Speaker · Connecticut', icon: '🏛' },
  ryan_fecteau: { name: 'Ryan Fecteau', office: 'House Speaker · Maine', icon: '🏛' },
  james_coleman: { name: 'James Coleman', office: 'Senate President · Colorado', icon: '🏛' },
  jon_patterson: { name: 'Jon Patterson', office: 'House Speaker · Missouri', icon: '🏛' },
  murrell_smith: { name: 'Murrell Smith', office: 'House Speaker · South Carolina', icon: '🏛' },
  ty_masterson: { name: 'Ty Masterson', office: 'Senate President · Kansas', icon: '🏛' },
  phillip_devillier: { name: 'Phillip DeVillier', office: 'House Speaker · Louisiana', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...L[id], topic, stance });

const WIRE = {
  // Housing: Supports = build more / deregulate supply; Opposed = restrict.
  'housing-affordability-crisis-2026': [
    row('julie_fahey', 'Boost Production', 'supported'),
    row('matt_ritter', 'Zoning & Supply', 'supported'),
    row('ryan_fecteau', 'Zoning Reform Author', 'supported'),
    row('james_coleman', 'Affordable Housing', 'supported'),
  ],
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('matt_ritter', 'Protect Access', 'supported'),
    row('ryan_fecteau', 'Protect Access', 'supported'),
    row('jon_patterson', '2026 Ballot Re-Restriction', 'opposed'),
    row('ty_masterson', 'Restrictions', 'opposed'),
  ],
  // Guns / mental health: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('julie_fahey', 'Permit-to-Purchase', 'supported'),
    row('matt_ritter', 'Strict Gun Laws', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('murrell_smith', 'Juvenile Crime', 'supported'),
    row('phillip_devillier', '2024 Crime Package', 'supported'),
    row('jon_patterson', 'Public Safety', 'supported'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('phillip_devillier', 'Oil, Gas & LNG', 'supported'),
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
  const newContent = trimmed + '\n            // State legislative leaders in new states (OR · CT · ME · CO · MO · SC · KS · LA), state wave 37 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
