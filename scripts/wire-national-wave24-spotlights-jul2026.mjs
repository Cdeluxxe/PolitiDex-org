#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-24 high-impact governors into the "How Politicians
// Stand" panels of the relevant Issue Spotlights (July 2026). Each stance follows
// the panel's own axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave24-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave24-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// governor display meta (office string + icon match the CMP_DATA roster)
const G = {
  evers: { name: 'Tony Evers', office: 'Governor · Wisconsin', icon: '🦡' },
  josh_stein: { name: 'Josh Stein', office: 'Governor · North Carolina', icon: '🌲' },
  maura_healey: { name: 'Maura Healey', office: 'Governor · Massachusetts', icon: '⚓' },
  tina_kotek: { name: 'Tina Kotek', office: 'Governor · Oregon', icon: '🦫' },
  mikie_sherrill: { name: 'Mikie Sherrill', office: 'Governor · New Jersey', icon: '✈️' },
  joe_lombardo: { name: 'Joe Lombardo', office: 'Governor · Nevada', icon: '🎰' },
  bill_lee: { name: 'Bill Lee', office: 'Governor · Tennessee', icon: '🎸' },
  henry_mcmaster: { name: 'Henry McMaster', office: 'Governor · South Carolina', icon: '🌴' },
  mike_kehoe: { name: 'Mike Kehoe', office: 'Governor · Missouri', icon: '🌉' },
  kay_ivey: { name: 'Kay Ivey', office: 'Governor · Alabama', icon: '🐘' },
};
const row = (id, topic, stance) => ({ id, ...G[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('evers', 'Restore Access', 'supported'),
    row('josh_stein', 'Protect Access', 'supported'),
    row('maura_healey', 'Shield-Law Protections', 'supported'),
    row('tina_kotek', 'Protect Access', 'supported'),
    row('mikie_sherrill', 'Protect Access', 'supported'),
    row('joe_lombardo', 'Pro-Life, Won’t Roll Back', 'mixed'),
    row('bill_lee', 'Human Life Protection Act', 'opposed'),
    row('henry_mcmaster', 'Heartbeat Law', 'opposed'),
    row('mike_kehoe', 'Opposes Amendment 3', 'opposed'),
    row('kay_ivey', 'Near-Total Ban', 'opposed'),
  ],
  // School choice: Supports = choice/vouchers; Opposes = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('joe_lombardo', 'Opportunity Scholarships', 'supported'),
    row('bill_lee', 'Education Freedom Act', 'supported'),
    row('henry_mcmaster', 'Scholarship Accounts', 'supported'),
    row('mike_kehoe', 'MOScholars & Charters', 'supported'),
    row('kay_ivey', 'CHOOSE Act', 'supported'),
    row('evers', 'Public-School Funding', 'opposed'),
    row('josh_stein', 'Opposes Voucher Expansion', 'opposed'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('bill_lee', 'All-of-the-Above + Nuclear', 'supported'),
    row('henry_mcmaster', 'Nuclear & Gas', 'supported'),
    row('kay_ivey', 'Domestic Energy', 'supported'),
    row('maura_healey', 'Clean Energy & Offshore Wind', 'opposed'),
    row('tina_kotek', 'Clean-Energy Transition', 'opposed'),
    row('mikie_sherrill', 'Clean Energy, Cost-Conscious', 'mixed'),
  ],
  // Border: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('joe_lombardo', 'Enforcement', 'supported'),
    row('bill_lee', 'Enforcement', 'supported'),
    row('henry_mcmaster', 'Enforcement', 'supported'),
    row('mike_kehoe', 'Enforcement', 'supported'),
    row('maura_healey', 'Shelter Limits + Work Permits', 'mixed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('evers', 'Background Checks & Red Flag', 'supported'),
    row('mikie_sherrill', 'Gun-Safety Laws', 'supported'),
  ],
  // Transgender: Supports = rights/inclusion/care; Opposes = restrictions.
  'transgender-rights-sports-youth-care-2026': [
    row('tina_kotek', 'Gender-Affirming Care Access', 'supported'),
    row('maura_healey', 'Shield-Law Protections', 'supported'),
  ],
  // Housing: Supports = build-more/supply-side; Opposes = resists supply-side.
  'housing-affordability-crisis-2026': [
    row('maura_healey', 'Affordable Homes Act', 'supported'),
    row('tina_kotek', 'Housing Production Targets', 'supported'),
  ],
  // Crime: Supports = tough-on-crime; Opposes = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    row('joe_lombardo', 'Public Safety (Ex-Sheriff)', 'supported'),
    row('mike_kehoe', 'Crime Crackdown', 'supported'),
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
  const newContent = trimmed + '\n            // High-impact governors — top-down state wave 24 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
