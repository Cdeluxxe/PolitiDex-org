#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-17 federal figures (health-agency heads + AI/energy
// senators + Democratic committee ranking members) into the "How Politicians
// Stand" panels of the relevant Issue Spotlights (July 2026), including the
// MAHA food-system and obesity/chronic-disease guides the agency heads run.
// Stances follow each panel's axis note. Idempotent.
//   node scripts/wire-national-wave17-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave17-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Drug prices: Supported = negotiation/price controls; Opposed = market/pharma; Mixed = targeted.
  'prescription-drug-prices-pharmaceutical-reform-2026': [
    { id: 'jan_schakowsky', name: 'Jan Schakowsky', office: 'U.S. Representative · Illinois', icon: '💊', topic: 'Negotiation & Caps', stance: 'supported' },
    { id: 'mehmet_oz', name: 'Mehmet Oz', office: 'CMS Administrator', icon: '💊', topic: 'Most-Favored-Nation Pricing', stance: 'mixed' },
  ],
  // MAHA food: Supported = restrict additives/reform food system; Opposed = deregulation/skeptical; Mixed = targeted.
  'maha-food-system-additives-2026': [
    { id: 'marty_makary', name: 'Marty Makary', office: 'FDA Commissioner', icon: '🔬', topic: 'Phasing Out Food Dyes', stance: 'supported' },
    { id: 'jim_mcgovern', name: 'Jim McGovern', office: 'U.S. Representative · Massachusetts', icon: '🍎', topic: 'Nutrition & Access', stance: 'mixed' },
  ],
  // Obesity/chronic disease: Supported = prevention/food priority; Opposed = skeptical; Mixed = partial.
  'obesity-chronic-disease-healthcare-costs-2026': [
    { id: 'mehmet_oz', name: 'Mehmet Oz', office: 'CMS Administrator', icon: '💊', topic: 'Prevention & Wellness', stance: 'supported' },
    { id: 'marty_makary', name: 'Marty Makary', office: 'FDA Commissioner', icon: '🔬', topic: 'Diet & Chronic Disease', stance: 'supported' },
    { id: 'jay_bhattacharya', name: 'Jay Bhattacharya', office: 'NIH Director', icon: '🧬', topic: 'Chronic-Disease Research', stance: 'supported' },
    { id: 'diana_degette', name: 'Diana DeGette', office: 'U.S. Representative · Colorado', icon: '⚕️', topic: 'Research & Treatment', stance: 'mixed' },
  ],
  // AI: Supported = stronger guardrails; Opposed = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'jan_schakowsky', name: 'Jan Schakowsky', office: 'U.S. Representative · Illinois', icon: '💊', topic: 'Consumer & AI Guardrails', stance: 'supported' },
    { id: 'mike_rounds', name: 'Mike Rounds', office: 'U.S. Senator · South Dakota', icon: '🤖', topic: 'AI Working Group', stance: 'mixed' },
  ],
  // Infrastructure: Supported = fund/maintain; Opposed = restraint; Mixed = targeted.
  'infrastructure-maintenance-crisis-2026': [
    { id: 'rick_larsen', name: 'Rick Larsen', office: 'U.S. Representative · Washington', icon: '🚧', topic: 'Transportation Funding', stance: 'supported' },
    { id: 'kevin_cramer', name: 'Kevin Cramer', office: 'U.S. Senator · North Dakota', icon: '🛢', topic: 'Permitting & Roads', stance: 'supported' },
  ],
  // Energy: Supported = reliability-first abundance; Opposed = clean-led limiting fossil; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'kevin_cramer', name: 'Kevin Cramer', office: 'U.S. Senator · North Dakota', icon: '🛢', topic: 'Oil, Gas & Coal', stance: 'supported' },
  ],
  // Food security: Supported = strong safety net/food security; Opposed = cuts; Mixed = targeted.
  'food-security-farming-future-2026': [
    { id: 'jim_mcgovern', name: 'Jim McGovern', office: 'U.S. Representative · Massachusetts', icon: '🍎', topic: 'Anti-Hunger & SNAP', stance: 'supported' },
    { id: 'mike_rounds', name: 'Mike Rounds', office: 'U.S. Senator · South Dakota', icon: '🤖', topic: 'Farm Safety Net', stance: 'supported' },
  ],
  // SS/Medicare solvency: Supported = act to protect/strengthen; Opposed = inaction; Mixed = between.
  'social-security-medicare-solvency-2026': [
    { id: 'brendan_boyle', name: 'Brendan Boyle', office: 'U.S. Representative · Pennsylvania', icon: '🧾', topic: 'Protect Benefits', stance: 'supported' },
  ],
  // Spending: Supported = cuts/restraint; Opposed = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'brendan_boyle', name: 'Brendan Boyle', office: 'U.S. Representative · Pennsylvania', icon: '🧾', topic: 'Defend Appropriations', stance: 'opposed' },
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
  const newContent = trimmed + '\n            // Health-agency heads, AI/energy senators & Democratic ranking members — federal wave 17 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
