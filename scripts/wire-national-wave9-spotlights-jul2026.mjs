#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-9 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave9-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave9-spotlights-jul2026.mjs --apply    # write
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
    { id: 'witkoff', name: 'Steve Witkoff', office: 'U.S. Special Envoy to the Middle East', icon: '🕊', topic: 'Ceasefire Diplomacy', stance: 'supported' },
    { id: 'torres', name: 'Ritchie Torres', office: 'U.S. Representative · New York', icon: '🗽', topic: 'Aid & Alliance', stance: 'supported' },
    { id: 'omar', name: 'Ilhan Omar', office: 'U.S. Representative · Minnesota', icon: '🌍', topic: 'Condition/Restrict Aid', stance: 'opposed' },
    { id: 'markey', name: 'Ed Markey', office: 'U.S. Senator · Massachusetts', icon: '🌎', topic: 'Aid with Conditions', stance: 'mixed' },
  ],
  // Ukraine: Supports = continued aid + hard line; Opposes = cut/limit or quick settlement; Mixed = pushing a negotiated end.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'witkoff', name: 'Steve Witkoff', office: 'U.S. Special Envoy to the Middle East', icon: '🕊', topic: 'Negotiated End', stance: 'mixed' },
    { id: 'fitzpatrick', name: 'Brian Fitzpatrick', office: 'U.S. Representative · Pennsylvania', icon: '🤝', topic: 'Ukraine Aid', stance: 'supported' },
    { id: 'tillis', name: 'Thom Tillis', office: 'U.S. Senator · North Carolina', icon: '🏛', topic: 'Aid & Alliances', stance: 'supported' },
  ],
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted.
  'tariffs-cost-of-living-inflation': [
    { id: 'hassett', name: 'Kevin Hassett', office: 'Director, National Economic Council', icon: '📈', topic: 'Defends Tariff Strategy', stance: 'supported' },
  ],
  // Trade policy: Supports = protection/security-first; Opposes = open markets; Mixed = targeted.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'hassett', name: 'Kevin Hassett', office: 'Director, National Economic Council', icon: '📈', topic: 'Growth & Reshoring', stance: 'supported' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'fitzpatrick', name: 'Brian Fitzpatrick', office: 'U.S. Representative · Pennsylvania', icon: '🤝', topic: 'Bipartisan Fix', stance: 'mixed' },
    { id: 'tillis', name: 'Thom Tillis', office: 'U.S. Senator · North Carolina', icon: '🏛', topic: 'Enforcement + Pathways', stance: 'mixed' },
    { id: 'lujan', name: 'Ben Ray Luján', office: 'Assistant Senate Democratic Leader · New Mexico', icon: '📶', topic: 'Security + Reform', stance: 'mixed' },
    { id: 'omar', name: 'Ilhan Omar', office: 'U.S. Representative · Minnesota', icon: '🌍', topic: 'Immigrant & Refugee Rights', stance: 'opposed' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'tillis', name: 'Thom Tillis', office: 'U.S. Senator · North Carolina', icon: '🏛', topic: 'Restraint, but Protect Medicaid', stance: 'mixed' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'markey', name: 'Ed Markey', office: 'U.S. Senator · Massachusetts', icon: '🌎', topic: 'Climate & Clean Energy', stance: 'opposed' },
    { id: 'lujan', name: 'Ben Ray Luján', office: 'Assistant Senate Democratic Leader · New Mexico', icon: '📶', topic: 'Clean Energy + Oil & Gas', stance: 'mixed' },
    { id: 'fitzpatrick', name: 'Brian Fitzpatrick', office: 'U.S. Representative · Pennsylvania', icon: '🤝', topic: 'All-of-the-Above', stance: 'mixed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'markey', name: 'Ed Markey', office: 'U.S. Senator · Massachusetts', icon: '🌎', topic: 'Guardrails & Kids Privacy', stance: 'supported' },
  ],
  // Crypto: Supports = clearer digital-asset rules / anti-CBDC; Opposes = stricter safeguards / keep CBDC option; Mixed = splits.
  'cryptocurrency-regulation-cbdc-debate-2026': [
    { id: 'torres', name: 'Ritchie Torres', office: 'U.S. Representative · New York', icon: '🗽', topic: 'Clear Crypto Rules', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'tillis', name: 'Thom Tillis', office: 'U.S. Senator · North Carolina', icon: '🏛', topic: 'Independent Institutional Streak', stance: 'supported' },
    { id: 'clyburn', name: 'Jim Clyburn', office: 'U.S. Representative · South Carolina', icon: '🗳', topic: 'Voting Rights', stance: 'supported' },
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
  const newContent = trimmed + '\n            // diplomacy/economic principals & influential members — top-down federal wave 9 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
