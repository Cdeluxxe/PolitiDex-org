#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-36 state legislative leaders (new states) into the
// "How Politicians Stand" panels of the relevant Issue Spotlights (July 2026).
// Each stance follows the panel's own axis, verified against existing rows.
// Idempotent.
//   node scripts/wire-national-wave36-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave36-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const L = {
  nicholas_scutari: { name: 'Nicholas Scutari', office: 'Senate President · New Jersey', icon: '🏛' },
  ron_mariano: { name: 'Ron Mariano', office: 'House Speaker · Massachusetts', icon: '🏛' },
  karen_spilka: { name: 'Karen Spilka', office: 'Senate President · Massachusetts', icon: '🏛' },
  bill_ferguson: { name: 'Bill Ferguson', office: 'Senate President · Maryland', icon: '🏛' },
  cameron_sexton: { name: 'Cameron Sexton', office: 'House Speaker · Tennessee', icon: '🏛' },
  robert_stivers: { name: 'Robert Stivers', office: 'Senate President · Kentucky', icon: '🏛' },
  pat_grassley: { name: 'Pat Grassley', office: 'House Speaker · Iowa', icon: '🏛' },
  todd_huston: { name: 'Todd Huston', office: 'House Speaker · Indiana', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...L[id], topic, stance });

const WIRE = {
  // School choice: Supports = choice/vouchers; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('cameron_sexton', 'Universal Vouchers', 'supported'),
    row('pat_grassley', 'Education Savings Accounts', 'supported'),
    row('todd_huston', 'Near-Universal Vouchers', 'supported'),
    row('karen_spilka', 'Free Community College', 'opposed'),
    row('bill_ferguson', 'Education Blueprint', 'opposed'),
  ],
  // Guns / mental health: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('nicholas_scutari', 'Strict Gun Laws', 'supported'),
    row('ron_mariano', '2024 Gun-Law Overhaul', 'supported'),
    row('karen_spilka', 'Mental-Health Parity', 'supported'),
  ],
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('karen_spilka', 'Shield Laws', 'supported'),
    row('robert_stivers', 'Near-Total Ban', 'opposed'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('cameron_sexton', 'Tougher Penalties', 'supported'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('cameron_sexton', 'State Enforcement', 'supported'),
  ],
  // Housing: Supports = build more / deregulate supply; Opposed = restrict.
  'housing-affordability-crisis-2026': [
    row('ron_mariano', 'Housing Bond Bill', 'supported'),
    row('todd_huston', 'Housing Agenda', 'supported'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('bill_ferguson', 'Gas & Nuclear Buildout', 'supported'),
    row('pat_grassley', 'Biofuels', 'supported'),
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
  const newContent = trimmed + '\n            // State legislative leaders in new states (NJ · MA · MD · TN · KY · IA · IN), state wave 36 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
