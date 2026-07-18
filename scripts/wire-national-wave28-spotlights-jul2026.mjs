#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-28 big-city mayors into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Each stance follows the
// panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave28-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave28-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const M = {
  zohran_mamdani: { name: 'Zohran Mamdani', office: 'Mayor of New York City', icon: '🗽' },
  karen_bass: { name: 'Karen Bass', office: 'Mayor of Los Angeles', icon: '🌴' },
  brandon_johnson: { name: 'Brandon Johnson', office: 'Mayor of Chicago', icon: '🌆' },
  john_whitmire: { name: 'John Whitmire', office: 'Mayor of Houston', icon: '🤠' },
  daniel_lurie: { name: 'Daniel Lurie', office: 'Mayor of San Francisco', icon: '🌉' },
  cherelle_parker: { name: 'Cherelle Parker', office: 'Mayor of Philadelphia', icon: '🔔' },
  mike_johnston: { name: 'Mike Johnston', office: 'Mayor of Denver', icon: '🏔' },
  kate_gallego: { name: 'Kate Gallego', office: 'Mayor of Phoenix', icon: '🌵' },
  mattie_parker: { name: 'Mattie Parker', office: 'Mayor of Fort Worth', icon: '⭐' },
  eric_johnson_dallas: { name: 'Eric Johnson', office: 'Mayor of Dallas', icon: '🐴' },
};
const row = (id, topic, stance) => ({ id, ...M[id], topic, stance });

const WIRE = {
  // Crime: Supports = enforcement-first (more policing/tougher); Opposes = reform/alternatives; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('john_whitmire', 'More Police & Fast 911', 'supported'),
    row('daniel_lurie', 'Police + Drug-Market Crackdown', 'supported'),
    row('cherelle_parker', 'Add Police / “Safest Big City”', 'supported'),
    row('mattie_parker', 'Back the Police', 'supported'),
    row('eric_johnson_dallas', 'More Police, Less Crime', 'supported'),
    row('karen_bass', 'Police + Intervention', 'mixed'),
    row('mike_johnston', 'Police + Youth Intervention', 'mixed'),
    row('zohran_mamdani', 'Community Safety Dept.', 'mixed'),
    row('brandon_johnson', 'Prevention Over Policing', 'opposed'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = broader access/pathways/sanctuary; Mixed.
  'border-security-asylum-reform-2026': [
    row('zohran_mamdani', 'Sanctuary Protections', 'opposed'),
    row('karen_bass', 'Opposed 2025 Raids', 'opposed'),
    row('brandon_johnson', 'Sanctuary City', 'opposed'),
    row('mike_johnston', 'Welcoming City', 'opposed'),
    row('john_whitmire', 'Pragmatic Tone', 'mixed'),
    row('kate_gallego', 'Border-State Pragmatism', 'mixed'),
  ],
  // Housing: Supports = build-more/supply-side; Opposes = resists supply-side (rent control/demand).
  'housing-affordability-crisis-2026': [
    row('daniel_lurie', 'Build to Meet Mandates', 'supported'),
    row('cherelle_parker', 'Build & Preserve Units', 'supported'),
    row('kate_gallego', 'Build More Housing', 'supported'),
    row('zohran_mamdani', 'Rent Freeze & Subsidized Build', 'opposed'),
  ],
  // Water (West): Supports = conservation/reallocation; Opposes = new supply/rights.
  'water-security-western-scarcity-2026': [
    row('kate_gallego', 'Desert-City Water & Heat', 'supported'),
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
  const newContent = trimmed + '\n            // Big-city mayors — municipal-executive tier, wave 28 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
