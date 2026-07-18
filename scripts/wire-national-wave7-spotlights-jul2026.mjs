#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-7 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave7-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave7-spotlights-jul2026.mjs --apply    # write
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
    { id: 'van_hollen', name: 'Chris Van Hollen', office: 'U.S. Senator · Maryland', icon: '🌐', topic: 'Aid with Conditions', stance: 'mixed' },
    { id: 'jayapal', name: 'Pramila Jayapal', office: 'U.S. Representative · Washington', icon: '✊', topic: 'Conditions on Aid', stance: 'opposed' },
    { id: 'warnock', name: 'Raphael Warnock', office: 'U.S. Senator · Georgia', icon: '⛪', topic: 'Israel Aid', stance: 'supported' },
    { id: 'duckworth', name: 'Tammy Duckworth', office: 'U.S. Senator · Illinois', icon: '🎖', topic: 'Israel & Ukraine Aid', stance: 'supported' },
    { id: 'ratcliffe', name: 'John Ratcliffe', office: 'CIA Director', icon: '🕵', topic: 'Intelligence Cooperation', stance: 'supported' },
    { id: 'stefanik', name: 'Elise Stefanik', office: 'U.S. Representative · New York', icon: '🍎', topic: 'Israel & Antisemitism', stance: 'supported' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'padilla', name: 'Alex Padilla', office: 'U.S. Senator · California', icon: '🌉', topic: 'Security + Pathways', stance: 'mixed' },
    { id: 'jayapal', name: 'Pramila Jayapal', office: 'U.S. Representative · Washington', icon: '✊', topic: 'Immigrant Rights', stance: 'opposed' },
    { id: 'aguilar', name: 'Pete Aguilar', office: 'House Democratic Caucus Chair · California', icon: '🏛', topic: 'Comprehensive Reform', stance: 'mixed' },
    { id: 'donalds', name: 'Byron Donalds', office: 'U.S. Representative · Florida', icon: '🐊', topic: 'Enforcement', stance: 'supported' },
    { id: 'patel', name: 'Kash Patel', office: 'FBI Director', icon: '🔍', topic: 'Fentanyl & Cartels', stance: 'supported' },
    { id: 'stefanik', name: 'Elise Stefanik', office: 'U.S. Representative · New York', icon: '🍎', topic: 'Enforcement', stance: 'supported' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'aguilar', name: 'Pete Aguilar', office: 'House Democratic Caucus Chair · California', icon: '🏛', topic: 'Appropriations', stance: 'opposed' },
    { id: 'van_hollen', name: 'Chris Van Hollen', office: 'U.S. Senator · Maryland', icon: '🌐', topic: 'Domestic Spending', stance: 'opposed' },
    { id: 'donalds', name: 'Byron Donalds', office: 'U.S. Representative · Florida', icon: '🐊', topic: 'Debt & Spending Cuts', stance: 'supported' },
    { id: 'stefanik', name: 'Elise Stefanik', office: 'U.S. Representative · New York', icon: '🍎', topic: 'Spending Restraint', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'aguilar', name: 'Pete Aguilar', office: 'House Democratic Caucus Chair · California', icon: '🏛', topic: 'Democracy & Jan. 6', stance: 'supported' },
    { id: 'warnock', name: 'Raphael Warnock', office: 'U.S. Senator · Georgia', icon: '⛪', topic: 'Voting Rights', stance: 'supported' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'jayapal', name: 'Pramila Jayapal', office: 'U.S. Representative · Washington', icon: '✊', topic: 'Workers & AI', stance: 'supported' },
    { id: 'padilla', name: 'Alex Padilla', office: 'U.S. Senator · California', icon: '🌉', topic: 'Guardrails & Privacy', stance: 'supported' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'donalds', name: 'Byron Donalds', office: 'U.S. Representative · Florida', icon: '🐊', topic: 'Production & Nuclear', stance: 'supported' },
    { id: 'padilla', name: 'Alex Padilla', office: 'U.S. Senator · California', icon: '🌉', topic: 'Clean Energy', stance: 'opposed' },
    { id: 'stefanik', name: 'Elise Stefanik', office: 'U.S. Representative · New York', icon: '🍎', topic: 'Domestic Energy', stance: 'supported' },
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
  const newContent = trimmed + '\n            // cabinet heads, Democratic leadership & influential members — top-down federal wave 7 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
