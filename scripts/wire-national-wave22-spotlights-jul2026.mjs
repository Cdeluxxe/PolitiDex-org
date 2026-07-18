#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-22 governors into the "How Politicians Stand" panels
// of the relevant Issue Spotlights (July 2026). Stances follow each panel's axis
// (verified against existing rows). Idempotent.
//   node scripts/wire-national-wave22-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave22-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Energy: Supported = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'kevin_stitt', name: 'Kevin Stitt', office: 'Governor · Oklahoma', icon: '🛢', topic: 'Oil & Gas', stance: 'supported' },
    { id: 'patrick_morrisey', name: 'Patrick Morrisey', office: 'Governor · West Virginia', icon: '⛏', topic: 'Coal & Gas', stance: 'supported' },
    { id: 'greg_gianforte', name: 'Greg Gianforte', office: 'Governor · Montana', icon: '🏔', topic: 'Oil, Gas & Coal', stance: 'supported' },
    { id: 'michelle_lujan_grisham', name: 'Michelle Lujan Grisham', office: 'Governor · New Mexico', icon: '🏜', topic: 'Gas Revenue + Clean-Energy Rules', stance: 'mixed' },
    { id: 'josh_green', name: 'Josh Green', office: 'Governor · Hawaii', icon: '🌺', topic: 'Clean Energy', stance: 'opposed' },
  ],
  // School choice: Supported = choice/reform/parental rights; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    { id: 'kevin_stitt', name: 'Kevin Stitt', office: 'Governor · Oklahoma', icon: '🛢', topic: 'Choice Tax Credit', stance: 'supported' },
    { id: 'kim_reynolds', name: 'Kim Reynolds', office: 'Governor · Iowa', icon: '🌽', topic: 'Universal ESAs', stance: 'supported' },
  ],
  // Abortion: Supported = pro-choice; Opposed = anti-abortion; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    { id: 'katie_hobbs', name: 'Katie Hobbs', office: 'Governor · Arizona', icon: '🌵', topic: 'Protect Access', stance: 'supported' },
    { id: 'bob_ferguson', name: 'Bob Ferguson', office: 'Governor · Washington', icon: '🌲', topic: 'Protect Access', stance: 'supported' },
    { id: 'michelle_lujan_grisham', name: 'Michelle Lujan Grisham', office: 'Governor · New Mexico', icon: '🏜', topic: 'Regional Refuge', stance: 'supported' },
    { id: 'janet_mills', name: 'Janet Mills', office: 'Governor · Maine', icon: '🦞', topic: 'Expanded Access', stance: 'supported' },
    { id: 'kim_reynolds', name: 'Kim Reynolds', office: 'Governor · Iowa', icon: '🌽', topic: 'Six-Week Limit', stance: 'opposed' },
  ],
  // Border: Supported = strict enforcement; Opposed = access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'kevin_stitt', name: 'Kevin Stitt', office: 'Governor · Oklahoma', icon: '🛢', topic: 'State Enforcement', stance: 'supported' },
    { id: 'greg_gianforte', name: 'Greg Gianforte', office: 'Governor · Montana', icon: '🏔', topic: 'Guard Support', stance: 'supported' },
    { id: 'patrick_morrisey', name: 'Patrick Morrisey', office: 'Governor · West Virginia', icon: '⛏', topic: 'Enforcement', stance: 'supported' },
    { id: 'katie_hobbs', name: 'Katie Hobbs', office: 'Governor · Arizona', icon: '🌵', topic: 'Security + Processing', stance: 'mixed' },
    { id: 'michelle_lujan_grisham', name: 'Michelle Lujan Grisham', office: 'Governor · New Mexico', icon: '🏜', topic: 'Guard + Criticism', stance: 'mixed' },
  ],
  // Guns: Supported = prevention/safety; Opposed = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    { id: 'bob_ferguson', name: 'Bob Ferguson', office: 'Governor · Washington', icon: '🌲', topic: 'Assault-Weapons Limits', stance: 'supported' },
    { id: 'michelle_lujan_grisham', name: 'Michelle Lujan Grisham', office: 'Governor · New Mexico', icon: '🏜', topic: 'Gun Restrictions', stance: 'supported' },
  ],
  // Transgender: Supported = trans-inclusive; Opposed = restrictive; Mixed.
  'transgender-rights-sports-youth-care-2026': [
    { id: 'janet_mills', name: 'Janet Mills', office: 'Governor · Maine', icon: '🦞', topic: 'Anti-Discrimination Law', stance: 'supported' },
  ],
  // Water security: Supported = active management/storage/conservation action.
  'water-security-western-scarcity-2026': [
    { id: 'katie_hobbs', name: 'Katie Hobbs', office: 'Governor · Arizona', icon: '🌵', topic: 'Colorado River & Groundwater', stance: 'supported' },
  ],
  // Spending: Supported = cuts/restraint; Opposed = defend spending; Mixed.
  'government-spending-debt-entitlement-reform': [
    { id: 'mike_braun', name: 'Mike Braun', office: 'Governor · Indiana', icon: '🏭', topic: 'Restraint & Tax Relief', stance: 'supported' },
    { id: 'greg_gianforte', name: 'Greg Gianforte', office: 'Governor · Montana', icon: '🏔', topic: 'Tax Cuts & Restraint', stance: 'supported' },
  ],
  // Drug prices: Supported = negotiation/caps/transparency; Opposed = market/pharma; Mixed.
  'prescription-drug-prices-pharmaceutical-reform-2026': [
    { id: 'mike_braun', name: 'Mike Braun', office: 'Governor · Indiana', icon: '🏭', topic: 'Price Transparency', stance: 'mixed' },
  ],
  // Rural healthcare: Supported = protect/fund rural hospitals & access.
  'rural-healthcare-hospital-closures-2026': [
    { id: 'josh_green', name: 'Josh Green', office: 'Governor · Hawaii', icon: '🌺', topic: 'Access & Provider Shortages', stance: 'supported' },
    { id: 'janet_mills', name: 'Janet Mills', office: 'Governor · Maine', icon: '🦞', topic: 'Medicaid Expansion', stance: 'supported' },
  ],
  // Food security / agriculture: Supported = strong farm safety net.
  'food-security-farming-future-2026': [
    { id: 'kim_reynolds', name: 'Kim Reynolds', office: 'Governor · Iowa', icon: '🌽', topic: 'Farmers & Biofuels', stance: 'supported' },
  ],
  // Housing affordability: Supported = build-more supply-side; Mixed = build + protections.
  'housing-affordability-crisis-2026': [
    { id: 'josh_green', name: 'Josh Green', office: 'Governor · Hawaii', icon: '🌺', topic: 'Housing Emergency & Build', stance: 'supported' },
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
  const newContent = trimmed + '\n            // More high-leverage governors — federal wave 22 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
