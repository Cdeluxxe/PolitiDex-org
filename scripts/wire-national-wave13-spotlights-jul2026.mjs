#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wave-13 CONNECT-THE-DOTS pass (July 2026): wire top-tier figures
// (Cabinet secretaries, agency heads, and leadership) into the recent Issue
// Spotlight "How Politicians Stand" panels where they were absent despite
// holding well-documented positions. Stances follow each panel's axis note.
// Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave13-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave13-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'hegseth', name: 'Pete Hegseth', office: 'U.S. Secretary of Defense', icon: '🎖', topic: 'Military Support & Iran', stance: 'supported' },
  ],
  // Ukraine: Supports = continued aid + hard line; Opposes = cut/limit or quick settlement; Mixed = negotiated end.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'hegseth', name: 'Pete Hegseth', office: 'U.S. Secretary of Defense', icon: '🎖', topic: 'Burden-Sharing + Negotiated End', stance: 'mixed' },
    { id: 'rubio', name: 'Marco Rubio', office: 'U.S. Secretary of State', icon: '🌐', topic: 'Diplomacy & Settlement', stance: 'mixed' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'hegseth', name: 'Pete Hegseth', office: 'U.S. Secretary of Defense', icon: '🎖', topic: 'Indo-Pacific Deterrence', stance: 'supported' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'noem', name: 'Kristi Noem', office: 'U.S. Secretary of Homeland Security', icon: '🛂', topic: 'DHS Enforcement', stance: 'supported' },
    { id: 'bondi', name: 'Pam Bondi', office: 'U.S. Attorney General', icon: '⚖️', topic: 'Immigration Enforcement', stance: 'supported' },
    { id: 'jim_jordan', name: 'Jim Jordan', office: 'House Judiciary Chair · Ohio', icon: '📕', topic: 'Enforcement & Asylum Limits', stance: 'supported' },
    { id: 'scalise', name: 'Steve Scalise', office: 'House Majority Leader · Louisiana', icon: '🐊', topic: 'Border Enforcement', stance: 'supported' },
  ],
  // Mass deportations: Supports = supports mass deportation/strict enforcement; Opposes = opposes.
  'mass-deportations-immigration-enforcement-2026': [
    { id: 'noem', name: 'Kristi Noem', office: 'U.S. Secretary of Homeland Security', icon: '🛂', topic: 'Interior Enforcement', stance: 'supported' },
    { id: 'bondi', name: 'Pam Bondi', office: 'U.S. Attorney General', icon: '⚖️', topic: 'Prosecution & Cartels', stance: 'supported' },
    { id: 'jim_jordan', name: 'Jim Jordan', office: 'House Judiciary Chair · Ohio', icon: '📕', topic: 'Enforcement', stance: 'supported' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'vought', name: 'Russ Vought', office: 'OMB Director', icon: '✂️', topic: 'Rescissions & Deep Cuts', stance: 'supported' },
    { id: 'scalise', name: 'Steve Scalise', office: 'House Majority Leader · Louisiana', icon: '🐊', topic: 'Spending Restraint', stance: 'supported' },
    { id: 'bessent', name: 'Scott Bessent', office: 'U.S. Secretary of the Treasury', icon: '💵', topic: 'Deficits & the 3-3-3 Plan', stance: 'mixed' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'zeldin', name: 'Lee Zeldin', office: 'EPA Administrator', icon: '🌫', topic: 'Deregulation & Production', stance: 'supported' },
    { id: 'burgum', name: 'Doug Burgum', office: 'U.S. Secretary of the Interior', icon: '🛢', topic: 'Energy Dominance', stance: 'supported' },
    { id: 'scalise', name: 'Steve Scalise', office: 'House Majority Leader · Louisiana', icon: '🐊', topic: 'Domestic Production', stance: 'supported' },
  ],
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted.
  'tariffs-cost-of-living-inflation': [
    { id: 'rollins', name: 'Brooke Rollins', office: 'U.S. Secretary of Agriculture', icon: '🌾', topic: 'Farm Exports & Tariffs', stance: 'mixed' },
  ],
  // Trade policy: Supports = protection/security-first; Opposes = open markets; Mixed = targeted.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'rollins', name: 'Brooke Rollins', office: 'U.S. Secretary of Agriculture', icon: '🌾', topic: 'Agriculture & Trade', stance: 'mixed' },
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
  const newContent = trimmed + '\n            // top-tier Cabinet/leadership connect-the-dots — federal wave 13 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
