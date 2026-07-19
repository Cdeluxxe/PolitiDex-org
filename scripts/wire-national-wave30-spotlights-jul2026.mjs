#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-30 state legislative leaders (tier 2) into the "How
// Politicians Stand" panels of the relevant Issue Spotlights (July 2026). Each
// stance follows the panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave30-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave30-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const L = {
  joanna_mcclinton: { name: 'Joanna McClinton', office: 'House Speaker · Pennsylvania', icon: '🏛' },
  winnie_brinks: { name: 'Winnie Brinks', office: 'Senate Majority Leader · Michigan', icon: '🏛' },
  don_harmon: { name: 'Don Harmon', office: 'Senate President · Illinois', icon: '🏛' },
  chris_welch: { name: 'Chris Welch', office: 'House Speaker · Illinois', icon: '🏛' },
  nicole_cannizzaro: { name: 'Nicole Cannizzaro', office: 'Senate Majority Leader · Nevada', icon: '🏛' },
  kim_ward: { name: 'Kim Ward', office: 'Senate President pro Tem · Pennsylvania', icon: '🏛' },
  matt_hall: { name: 'Matt Hall', office: 'House Speaker · Michigan', icon: '🏛' },
  phil_berger: { name: 'Phil Berger', office: 'Senate President pro Tem · North Carolina', icon: '🏛' },
  robin_vos: { name: 'Robin Vos', office: 'Assembly Speaker · Wisconsin', icon: '🏛' },
  warren_petersen: { name: 'Warren Petersen', office: 'Senate President · Arizona', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...L[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('joanna_mcclinton', 'Protect Access', 'supported'),
    row('winnie_brinks', 'Repealed 1931 Ban', 'supported'),
    row('don_harmon', 'Refuge for Access', 'supported'),
    row('chris_welch', 'Protect Access', 'supported'),
    row('nicole_cannizzaro', 'Ballot-Enshrined Rights', 'supported'),
    row('phil_berger', '12-Week Limit', 'opposed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('winnie_brinks', 'Post-MSU Gun Package', 'supported'),
    row('don_harmon', 'Assault-Weapons Ban', 'supported'),
    row('nicole_cannizzaro', 'Background Checks', 'supported'),
    row('joanna_mcclinton', 'Background Checks & Red Flag', 'supported'),
  ],
  // School choice: Supports = choice/vouchers; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('kim_ward', 'Scholarship Tax Credits', 'supported'),
    row('phil_berger', 'Opportunity Scholarships', 'supported'),
    row('robin_vos', 'Vouchers & Charters', 'supported'),
    row('warren_petersen', 'Universal ESAs', 'supported'),
    row('chris_welch', 'Public-School Funding', 'opposed'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('warren_petersen', 'Prop 314 Border Act', 'supported'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('kim_ward', 'Natural Gas', 'supported'),
    row('matt_hall', 'All-of-the-Above', 'mixed'),
    row('winnie_brinks', '100% Carbon-Free by 2040', 'opposed'),
  ],
  // Voter ID / election integrity: Supports = stricter ID/citizenship; Opposes = broader access.
  'voter-id-election-integrity-2026': [
    row('kim_ward', 'Stricter Voter ID', 'supported'),
    row('warren_petersen', 'Tighter Rules & Deadlines', 'supported'),
    row('phil_berger', 'Voter ID & Maps', 'supported'),
    row('robin_vos', '2020 Review · Results Stand', 'mixed'),
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
  const newContent = trimmed + '\n            // State legislative leaders — tier 2 (PA · MI · IL · NV · NC · WI · AZ), state wave 30 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
