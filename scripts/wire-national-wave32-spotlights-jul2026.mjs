#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-32 influential state legislators into the "How
// Politicians Stand" panels of the relevant Issue Spotlights (July 2026). Each
// stance follows the panel's own axis, verified against existing rows. Idempotent.
// (Redistricting stances stay in the figures' own stance cards — there is no
// dedicated redistricting panel, and forcing them onto the voter-ID axis would
// misrepresent them.)
//   node scripts/wire-national-wave32-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave32-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const L = {
  gene_wu: { name: 'Gene Wu', office: 'House Dem. Caucus Chair · Texas', icon: '🏛' },
  jay_costa: { name: 'Jay Costa', office: 'Senate Democratic Leader · Pennsylvania', icon: '🏛' },
  ranjeev_puri: { name: 'Ranjeev Puri', office: 'House Democratic Leader · Michigan', icon: '🏛' },
  greta_neubauer: { name: 'Greta Neubauer', office: 'Assembly Minority Leader · Wisconsin', icon: '🏛' },
  heath_flora: { name: 'Heath Flora', office: 'Assembly Republican Leader · California', icon: '🏛' },
  destin_hall: { name: 'Destin Hall', office: 'House Speaker · North Carolina', icon: '🏛' },
  jon_burns: { name: 'Jon Burns', office: 'House Speaker · Georgia', icon: '🏛' },
  bryan_hughes: { name: 'Bryan Hughes', office: 'State Senator · Texas', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...L[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('ranjeev_puri', 'Protect Access', 'supported'),
    row('greta_neubauer', 'Restore Access', 'supported'),
    row('bryan_hughes', 'Heartbeat Act (SB 8) Author', 'opposed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('gene_wu', 'Post-Uvalde Safety Push', 'supported'),
    row('jay_costa', 'Background Checks', 'supported'),
    row('ranjeev_puri', 'Gun-Reform Advocate', 'supported'),
  ],
  // School choice: Supports = choice/vouchers; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('destin_hall', 'Opportunity Scholarships', 'supported'),
    row('jon_burns', 'Promise Scholarships', 'supported'),
    row('bryan_hughes', 'Parental Rights & Choice', 'supported'),
    row('gene_wu', 'Public-School Funding', 'opposed'),
    row('greta_neubauer', 'Public-School Funding', 'opposed'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('heath_flora', 'Prop 36', 'supported'),
    row('jon_burns', 'School-Safety Laws', 'supported'),
  ],
  // Voter ID / election integrity: Supports = stricter ID/citizenship; Opposes = broader access.
  'voter-id-election-integrity-2026': [
    row('bryan_hughes', 'SB 1 Election Law Author', 'supported'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('heath_flora', 'Affordability & Reliability', 'supported'),
  ],
  // Water (West): Supports = conservation/reallocation; Opposes = new supply/rights.
  'water-security-western-scarcity-2026': [
    row('heath_flora', 'Build Water Storage', 'opposed'),
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
  const newContent = trimmed + '\n            // Influential state legislators — opposition leaders & marquee members, state wave 32 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
