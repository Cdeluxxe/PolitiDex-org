#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-12 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave12-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave12-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'pfluger', name: 'August Pfluger', office: 'Republican Study Committee Chair · Texas', icon: '🐘', topic: 'RSC Budget & Deep Cuts', stance: 'supported' },
    { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas', icon: '🩺', topic: 'Spending Restraint', stance: 'supported' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'pfluger', name: 'August Pfluger', office: 'Republican Study Committee Chair · Texas', icon: '🐘', topic: 'Oil & Gas Production', stance: 'supported' },
    { id: 'dan_sullivan', name: 'Dan Sullivan', office: 'U.S. Senator · Alaska', icon: '🎖', topic: 'Alaska Energy & ANWR', stance: 'supported' },
    { id: 'hickenlooper', name: 'John Hickenlooper', office: 'U.S. Senator · Colorado', icon: '🍺', topic: 'All-of-the-Above', stance: 'mixed' },
    { id: 'tina_smith', name: 'Tina Smith', office: 'U.S. Senator · Minnesota', icon: '🌾', topic: 'Clean Energy Transition', stance: 'mixed' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'pfluger', name: 'August Pfluger', office: 'Republican Study Committee Chair · Texas', icon: '🐘', topic: 'Strict Enforcement', stance: 'supported' },
    { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas', icon: '🩺', topic: 'Enforcement & Fentanyl', stance: 'supported' },
    { id: 'mike_lawler', name: 'Mike Lawler', office: 'U.S. Representative · New York', icon: '🤝', topic: 'Enforcement + Legal Paths', stance: 'mixed' },
  ],
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'mike_lawler', name: 'Mike Lawler', office: 'U.S. Representative · New York', icon: '🤝', topic: 'Aid & the Alliance', stance: 'supported' },
    { id: 'dan_sullivan', name: 'Dan Sullivan', office: 'U.S. Senator · Alaska', icon: '🎖', topic: 'Aid & Defense', stance: 'supported' },
    { id: 'summer_lee', name: 'Summer Lee', office: 'U.S. Representative · Pennsylvania', icon: '🌿', topic: 'Condition/Halt Aid', stance: 'opposed' },
  ],
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted.
  'tariffs-cost-of-living-inflation': [
    { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas', icon: '🩺', topic: 'Ag Exports & Retaliation', stance: 'mixed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'hickenlooper', name: 'John Hickenlooper', office: 'U.S. Senator · Colorado', icon: '🍺', topic: 'Guardrails & Workforce', stance: 'supported' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'dan_sullivan', name: 'Dan Sullivan', office: 'U.S. Senator · Alaska', icon: '🎖', topic: 'Indo-Pacific Deterrence', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'maxwell_frost', name: 'Maxwell Frost', office: 'U.S. Representative · Florida', icon: '🎸', topic: 'Youth Voting & Democracy', stance: 'supported' },
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
  const newContent = trimmed + '\n            // influential members — top-down federal wave 12 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
