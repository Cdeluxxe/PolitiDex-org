#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-34 state legislative leaders (new states) into the
// "How Politicians Stand" panels of the relevant Issue Spotlights (July 2026).
// Each stance follows the panel's own axis, verified against existing rows.
// Idempotent.
//   node scripts/wire-national-wave34-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave34-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const L = {
  don_scott: { name: 'Don Scott', office: 'House Speaker · Virginia', icon: '🏛' },
  erin_murphy: { name: 'Erin Murphy', office: 'Senate Majority Leader · Minnesota', icon: '🏛' },
  julie_mccluskie: { name: 'Julie McCluskie', office: 'House Speaker · Colorado', icon: '🏛' },
  laurie_jinkins: { name: 'Laurie Jinkins', office: 'House Speaker · Washington', icon: '🏛' },
  matt_huffman: { name: 'Matt Huffman', office: 'House Speaker · Ohio', icon: '🏛' },
  rob_mccolley: { name: 'Rob McColley', office: 'Senate President · Ohio', icon: '🏛' },
  lisa_demuth: { name: 'Lisa Demuth', office: 'House Speaker · Minnesota', icon: '🏛' },
  sharon_carson: { name: 'Sharon Carson', office: 'Senate President · New Hampshire', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...L[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('don_scott', 'Constitutional Amendment', 'supported'),
    row('erin_murphy', 'Codified Access', 'supported'),
    row('laurie_jinkins', 'Protect Access', 'supported'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('don_scott', 'Gun-Safety Package', 'supported'),
    row('erin_murphy', 'Violence-Prevention Package', 'supported'),
  ],
  // School choice: Supports = choice/vouchers; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('matt_huffman', 'EdChoice Vouchers', 'supported'),
    row('sharon_carson', 'Education Freedom Accounts', 'supported'),
    row('lisa_demuth', 'Parental Rights', 'supported'),
    row('julie_mccluskie', 'Public-School Funding', 'opposed'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('sharon_carson', 'Public Safety & Bail', 'supported'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('rob_mccolley', 'Gas & Nuclear for Demand', 'supported'),
    row('laurie_jinkins', 'Climate Commitment Act', 'opposed'),
    row('julie_mccluskie', 'Clean-Energy Goals', 'opposed'),
  ],
  // Housing: Supports = build more / deregulate supply; Opposed = restrict.
  'housing-affordability-crisis-2026': [
    row('julie_mccluskie', 'Expand Supply', 'supported'),
    row('laurie_jinkins', 'Middle Housing', 'supported'),
    row('don_scott', 'Affordability Agenda', 'supported'),
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
  const newContent = trimmed + '\n            // State legislative leaders in new states (VA · OH · MN · CO · WA · NH), state wave 34 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
