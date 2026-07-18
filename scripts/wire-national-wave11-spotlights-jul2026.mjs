#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-11 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave11-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave11-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Crypto: Supports = clearer digital-asset rules / anti-CBDC; Opposes = stricter safeguards / keep CBDC; Mixed = splits.
  'cryptocurrency-regulation-cbdc-debate-2026': [
    { id: 'paul_atkins', name: 'Paul Atkins', office: 'SEC Chair', icon: '📊', topic: 'Clearer Digital-Asset Rules', stance: 'supported' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'brendan_carr', name: 'Brendan Carr', office: 'FCC Chair', icon: '📡', topic: 'Light-Touch, Pro-Investment', stance: 'opposed' },
    { id: 'delbene', name: 'Suzan DelBene', office: 'DCCC Chair · Washington', icon: '💻', topic: 'AI Policy & Data Privacy', stance: 'supported' },
    { id: 'rosen', name: 'Jacky Rosen', office: 'U.S. Senator · Nevada', icon: '💻', topic: 'Guardrails & Workforce', stance: 'supported' },
  ],
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'rosen', name: 'Jacky Rosen', office: 'U.S. Senator · Nevada', icon: '💻', topic: 'Aid & the Alliance', stance: 'supported' },
    { id: 'dan_goldman', name: 'Dan Goldman', office: 'U.S. Representative · New York', icon: '🔎', topic: 'Aid + Humanitarian', stance: 'supported' },
    { id: 'andy_kim', name: 'Andy Kim', office: 'U.S. Senator · New Jersey', icon: '🕊', topic: 'Aid with Conditions', stance: 'mixed' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'garbarino', name: 'Andrew Garbarino', office: 'House Homeland Security Chair · New York', icon: '🛡', topic: 'Homeland Enforcement', stance: 'supported' },
    { id: 'hirono', name: 'Mazie Hirono', office: 'U.S. Senator · Hawaii', icon: '⚖️', topic: 'Reform & Pathways', stance: 'opposed' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'daines', name: 'Steve Daines', office: 'U.S. Senator · Montana', icon: '🏔', topic: 'Production & Mining', stance: 'supported' },
    { id: 'rosen', name: 'Jacky Rosen', office: 'U.S. Senator · Nevada', icon: '💻', topic: 'Clean Energy + Grid', stance: 'mixed' },
  ],
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted.
  'tariffs-cost-of-living-inflation': [
    { id: 'daines', name: 'Steve Daines', office: 'U.S. Senator · Montana', icon: '🏔', topic: 'China, but Watch Retaliation', stance: 'mixed' },
    { id: 'delbene', name: 'Suzan DelBene', office: 'DCCC Chair · Washington', icon: '💻', topic: 'Tariffs Raise Costs', stance: 'opposed' },
  ],
  // Trade policy: Supports = protection/security-first; Opposes = open markets; Mixed = targeted.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'delbene', name: 'Suzan DelBene', office: 'DCCC Chair · Washington', icon: '💻', topic: 'Open, Rules-Based Trade', stance: 'opposed' },
    { id: 'daines', name: 'Steve Daines', office: 'U.S. Senator · Montana', icon: '🏔', topic: 'Targeted on China', stance: 'mixed' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'daines', name: 'Steve Daines', office: 'U.S. Senator · Montana', icon: '🏔', topic: 'Spending Restraint', stance: 'supported' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary of overcommitment.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'daines', name: 'Steve Daines', office: 'U.S. Senator · Montana', icon: '🏔', topic: 'Tough on China, Trade Ties', stance: 'mixed' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'dan_goldman', name: 'Dan Goldman', office: 'U.S. Representative · New York', icon: '🔎', topic: 'Oversight & Rule of Law', stance: 'supported' },
    { id: 'hirono', name: 'Mazie Hirono', office: 'U.S. Senator · Hawaii', icon: '⚖️', topic: 'Courts & Nominee Scrutiny', stance: 'supported' },
    { id: 'andy_kim', name: 'Andy Kim', office: 'U.S. Senator · New Jersey', icon: '🕊', topic: 'Government Reform', stance: 'supported' },
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
  const newContent = trimmed + '\n            // remaining chairs, regulatory-agency chairs, campaign leaders & members — top-down federal wave 11 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
