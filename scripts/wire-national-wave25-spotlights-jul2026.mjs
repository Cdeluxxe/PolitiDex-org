#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-25 governors (the final 13 states) into the "How
// Politicians Stand" panels of the relevant Issue Spotlights (July 2026). Each
// stance follows the panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave25-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave25-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const G = {
  dunleavy: { name: 'Mike Dunleavy', office: 'Governor · Alaska', icon: '🐻' },
  ned_lamont: { name: 'Ned Lamont', office: 'Governor · Connecticut', icon: '⛵' },
  matt_meyer: { name: 'Matt Meyer', office: 'Governor · Delaware', icon: '🐔' },
  brad_little: { name: 'Brad Little', office: 'Governor · Idaho', icon: '🥔' },
  laura_kelly: { name: 'Laura Kelly', office: 'Governor · Kansas', icon: '🌻' },
  tate_reeves: { name: 'Tate Reeves', office: 'Governor · Mississippi', icon: '🌸' },
  jim_pillen: { name: 'Jim Pillen', office: 'Governor · Nebraska', icon: '🌽' },
  kelly_ayotte: { name: 'Kelly Ayotte', office: 'Governor · New Hampshire', icon: '🍁' },
  kelly_armstrong: { name: 'Kelly Armstrong', office: 'Governor · North Dakota', icon: '🦬' },
  dan_mckee: { name: 'Dan McKee', office: 'Governor · Rhode Island', icon: '🌊' },
  larry_rhoden: { name: 'Larry Rhoden', office: 'Governor · South Dakota', icon: '🗻' },
  phil_scott: { name: 'Phil Scott', office: 'Governor · Vermont', icon: '⛷' },
  mark_gordon: { name: 'Mark Gordon', office: 'Governor · Wyoming', icon: '🤠' },
};
const row = (id, topic, stance) => ({ id, ...G[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('ned_lamont', 'Protect Access', 'supported'),
    row('matt_meyer', 'Protect Access', 'supported'),
    row('laura_kelly', 'Protect Access', 'supported'),
    row('dan_mckee', 'Protect Access', 'supported'),
    row('phil_scott', 'Reproductive Liberty (Prop 5)', 'supported'),
    row('kelly_ayotte', 'Keep Current 24-Week Law', 'mixed'),
    row('dunleavy', 'Pro-Life (Courts Limit)', 'opposed'),
    row('brad_little', 'Near-Total Ban', 'opposed'),
    row('tate_reeves', 'Dobbs Ban', 'opposed'),
    row('jim_pillen', '12-Week Ban', 'opposed'),
    row('kelly_armstrong', 'Restrictions', 'opposed'),
    row('larry_rhoden', 'Near-Total Ban', 'opposed'),
    row('mark_gordon', 'Bans (Court-Blocked)', 'opposed'),
  ],
  // School choice: Supports = choice/vouchers; Opposes = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('dunleavy', 'Homeschool Allotments', 'supported'),
    row('brad_little', 'Tax-Credit Scholarships', 'supported'),
    row('tate_reeves', 'School Choice', 'supported'),
    row('jim_pillen', 'Private-School Scholarships', 'supported'),
    row('kelly_ayotte', 'Education Freedom Accounts', 'supported'),
    row('laura_kelly', 'Public-School Funding', 'opposed'),
    row('matt_meyer', 'Public-School Investment', 'opposed'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('dunleavy', 'Arctic Oil & Gas', 'supported'),
    row('tate_reeves', 'Domestic Energy', 'supported'),
    row('kelly_armstrong', 'Oil, Gas & Coal', 'supported'),
    row('mark_gordon', 'Coal + Carbon Capture', 'supported'),
    row('dan_mckee', 'Offshore Wind & Clean Energy', 'opposed'),
    row('phil_scott', 'Clean Energy, Cost-Wary', 'mixed'),
  ],
  // Border: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('kelly_ayotte', 'Enforcement', 'supported'),
    row('larry_rhoden', 'Enforcement', 'supported'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('ned_lamont', 'Assault-Weapons Ban', 'supported'),
    row('matt_meyer', 'Gun-Safety Laws', 'supported'),
    row('phil_scott', 'Background Checks & Red Flag', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('dunleavy', 'Repealed SB 91 Reforms', 'supported'),
    row('kelly_ayotte', 'Public Safety (Ex-AG)', 'supported'),
  ],
  // Housing: Supports = build-more/supply-side; Opposes = resists supply-side.
  'housing-affordability-crisis-2026': [
    row('matt_meyer', 'Expand Supply', 'supported'),
    row('dan_mckee', 'Housing Production Targets', 'supported'),
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
  const newContent = trimmed + '\n            // Final-13 state governors — state wave 25 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
