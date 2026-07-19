#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-29 battleground attorneys general into the "How
// Politicians Stand" panels of the relevant Issue Spotlights (July 2026). Each
// stance follows the panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave29-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave29-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const A = {
  dana_nessel: { name: 'Dana Nessel', office: 'Attorney General · Michigan', icon: '⚖️' },
  josh_kaul: { name: 'Josh Kaul', office: 'Attorney General · Wisconsin', icon: '⚖️' },
  jeff_jackson: { name: 'Jeff Jackson', office: 'Attorney General · North Carolina', icon: '⚖️' },
  aaron_ford: { name: 'Aaron Ford', office: 'Attorney General · Nevada', icon: '⚖️' },
  dave_sunday: { name: 'Dave Sunday', office: 'Attorney General · Pennsylvania', icon: '⚖️' },
  james_uthmeier: { name: 'James Uthmeier', office: 'Attorney General · Florida', icon: '⚖️' },
  jonathan_skrmetti: { name: 'Jonathan Skrmetti', office: 'Attorney General · Tennessee', icon: '⚖️' },
  kris_kobach: { name: 'Kris Kobach', office: 'Attorney General · Kansas', icon: '⚖️' },
};
const row = (id, topic, stance) => ({ id, ...A[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('dana_nessel', 'Enforces Prop 3 Access', 'supported'),
    row('josh_kaul', 'Challenged 1849 Ban', 'supported'),
    row('aaron_ford', 'Protect Access', 'supported'),
    row('jeff_jackson', '12-Week Law · Supports Access', 'mixed'),
    row('james_uthmeier', 'Defends Six-Week Law', 'opposed'),
    row('jonathan_skrmetti', 'Defends Ban', 'opposed'),
    row('kris_kobach', 'Restrictions Curbed by Voters', 'mixed'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('james_uthmeier', 'State Enforcement', 'supported'),
    row('kris_kobach', 'Enforcement Coalition', 'supported'),
    row('dave_sunday', 'Enforcement Cooperation', 'supported'),
    row('aaron_ford', 'Challenges Enforcement', 'opposed'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('dana_nessel', 'Line 5 Shutdown Suit', 'opposed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('josh_kaul', 'Background Checks & Red Flag', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('jeff_jackson', 'Fentanyl & Scams', 'supported'),
    row('aaron_ford', 'Fentanyl & Violent Crime', 'supported'),
    row('dave_sunday', 'Fentanyl & Violent Crime', 'supported'),
    row('james_uthmeier', 'Fentanyl & Violent Crime', 'supported'),
  ],
  // Transgender: Supports = rights/inclusion/care; Opposes = restrictions.
  'transgender-rights-sports-youth-care-2026': [
    row('jonathan_skrmetti', 'Youth Gender-Care Ban (Skrmetti)', 'opposed'),
    row('dana_nessel', 'Defends Civil-Rights Protections', 'supported'),
  ],
  // Voter ID / election integrity: Supports = stricter ID/citizenship; Opposes = broader access.
  'voter-id-election-integrity-2026': [
    row('kris_kobach', 'Stricter Eligibility Rules', 'supported'),
    row('josh_kaul', 'Defends Election Administration', 'opposed'),
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
  const newContent = trimmed + '\n            // Battleground-state attorneys general — litigation front tier 2, state wave 29 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
