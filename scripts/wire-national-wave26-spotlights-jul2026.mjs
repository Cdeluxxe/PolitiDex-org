#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-26 state attorneys general into the "How Politicians
// Stand" panels of the relevant Issue Spotlights (July 2026). Each stance follows
// the panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave26-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave26-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const A = {
  rob_bonta: { name: 'Rob Bonta', office: 'Attorney General · California', icon: '⚖️' },
  letitia_james: { name: 'Letitia James', office: 'Attorney General · New York', icon: '⚖️' },
  keith_ellison: { name: 'Keith Ellison', office: 'Attorney General · Minnesota', icon: '⚖️' },
  kwame_raoul: { name: 'Kwame Raoul', office: 'Attorney General · Illinois', icon: '⚖️' },
  kris_mayes: { name: 'Kris Mayes', office: 'Attorney General · Arizona', icon: '⚖️' },
  raul_labrador: { name: 'Raúl Labrador', office: 'Attorney General · Idaho', icon: '⚖️' },
  liz_murrill: { name: 'Liz Murrill', office: 'Attorney General · Louisiana', icon: '⚖️' },
  chris_carr: { name: 'Chris Carr', office: 'Attorney General · Georgia', icon: '⚖️' },
  brenna_bird: { name: 'Brenna Bird', office: 'Attorney General · Iowa', icon: '⚖️' },
  dave_yost: { name: 'Dave Yost', office: 'Attorney General · Ohio', icon: '⚖️' },
};
const row = (id, topic, stance) => ({ id, ...A[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('rob_bonta', 'Defend Access & Mifepristone', 'supported'),
    row('letitia_james', 'Protect Access', 'supported'),
    row('keith_ellison', 'Protect Access', 'supported'),
    row('kwame_raoul', 'Reproductive-Rights Coalition', 'supported'),
    row('kris_mayes', 'Declined to Enforce 1864 Ban', 'supported'),
    row('raul_labrador', 'EMTALA / Near-Total Ban', 'opposed'),
    row('liz_murrill', 'Ban + Abortion-Pill Limits', 'opposed'),
    row('chris_carr', 'Six-Week LIFE Act', 'opposed'),
    row('brenna_bird', 'Heartbeat Law', 'opposed'),
    row('dave_yost', 'Restrictions Curbed by Voters', 'mixed'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('raul_labrador', 'Enforcement Coalition', 'supported'),
    row('liz_murrill', 'Enforcement Coalition', 'supported'),
    row('chris_carr', 'Enforcement Coalition', 'supported'),
    row('brenna_bird', 'State Enforcement Law', 'supported'),
    row('rob_bonta', 'Challenges Enforcement', 'opposed'),
    row('letitia_james', 'Challenges Enforcement', 'opposed'),
    row('kwame_raoul', 'Challenges Enforcement', 'opposed'),
    row('kris_mayes', 'Border-State Middle Ground', 'mixed'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('liz_murrill', 'Oil, Gas & LNG', 'supported'),
    row('brenna_bird', 'Biofuels & Federal Rules', 'supported'),
    row('rob_bonta', 'Climate Litigation', 'opposed'),
    row('kwame_raoul', 'Environmental Enforcement', 'opposed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('letitia_james', 'Sued Gun Makers & NRA', 'supported'),
    row('kwame_raoul', 'Defends Assault-Weapons Ban', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('chris_carr', 'Gang & Trafficking Unit', 'supported'),
    row('brenna_bird', 'Fentanyl & Violent Crime', 'supported'),
  ],
  // Transgender: Supports = rights/inclusion/care; Opposes = restrictions.
  'transgender-rights-sports-youth-care-2026': [
    row('raul_labrador', 'Youth Gender-Care Ban', 'opposed'),
  ],
  // Water (West): Supports = conservation/reallocation; Opposes = new supply/rights.
  'water-security-western-scarcity-2026': [
    row('kris_mayes', 'Groundwater Accountability', 'supported'),
  ],
  // Voter ID / election integrity: Supports = stricter ID/citizenship; Opposes = broader access.
  'voter-id-election-integrity-2026': [
    row('chris_carr', 'Defends SB 202', 'supported'),
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
  const newContent = trimmed + '\n            // State attorneys general — litigation front, state wave 26 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
