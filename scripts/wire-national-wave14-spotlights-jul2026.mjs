#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-14 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
// (Takano and Bobby Scott connect via their veterans/education issue keys — no
//  matching flagship spotlight panel — so they are not wired here.)
//   node scripts/wire-national-wave14-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave14-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'mcclain', name: 'Lisa McClain', office: 'House Republican Conference Chair · Michigan', icon: '🐘', topic: 'Strict Enforcement', stance: 'supported' },
    { id: 'schmitt', name: 'Eric Schmitt', office: 'U.S. Senator · Missouri', icon: '⚖️', topic: 'Enforcement', stance: 'supported' },
    { id: 'luna', name: 'Anna Paulina Luna', office: 'U.S. Representative · Florida', icon: '🦅', topic: 'Enforcement', stance: 'supported' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'mcclain', name: 'Lisa McClain', office: 'House Republican Conference Chair · Michigan', icon: '🐘', topic: 'Spending Restraint', stance: 'supported' },
    { id: 'luna', name: 'Anna Paulina Luna', office: 'U.S. Representative · Florida', icon: '🦅', topic: 'Cuts & Sound Money', stance: 'supported' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'mullin', name: 'Markwayne Mullin', office: 'U.S. Senator · Oklahoma', icon: '🔧', topic: 'Oil & Gas Production', stance: 'supported' },
    { id: 'hudson', name: 'Richard Hudson', office: 'NRCC Chair · North Carolina', icon: '🐘', topic: 'Production & Permitting', stance: 'supported' },
    { id: 'blunt_rochester', name: 'Lisa Blunt Rochester', office: 'U.S. Senator · Delaware', icon: '🌱', topic: 'Clean Energy & Offshore Wind', stance: 'opposed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'schmitt', name: 'Eric Schmitt', office: 'U.S. Senator · Missouri', icon: '⚖️', topic: 'Innovation-First, Anti-China', stance: 'opposed' },
    { id: 'alsobrooks', name: 'Angela Alsobrooks', office: 'U.S. Senator · Maryland', icon: '🏛', topic: 'Guardrails & Workforce', stance: 'supported' },
  ],
  // Crypto: Supports = clearer digital-asset rules / anti-CBDC; Opposes = stricter safeguards / keep CBDC; Mixed = splits.
  'cryptocurrency-regulation-cbdc-debate-2026': [
    { id: 'luna', name: 'Anna Paulina Luna', office: 'U.S. Representative · Florida', icon: '🦅', topic: 'Digital Assets, Anti-CBDC', stance: 'supported' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'schmitt', name: 'Eric Schmitt', office: 'U.S. Senator · Missouri', icon: '⚖️', topic: 'Tech & Defense Competition', stance: 'supported' },
  ],
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'mcclain', name: 'Lisa McClain', office: 'House Republican Conference Chair · Michigan', icon: '🐘', topic: 'Aid & the Alliance', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'neguse', name: 'Joe Neguse', office: 'Assistant House Democratic Leader · Colorado', icon: '🏔', topic: 'Rule of Law & Oversight', stance: 'supported' },
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
  const newContent = trimmed + '\n            // remaining leadership, ranking members & new senators — federal wave 14 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
