#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-8 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave8-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave8-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted with limits.
  'tariffs-cost-of-living-inflation': [
    { id: 'greer', name: 'Jamieson Greer', office: 'U.S. Trade Representative', icon: '📦', topic: 'Tariff Strategy', stance: 'supported' },
    { id: 'rick_scott', name: 'Rick Scott', office: 'U.S. Senator · Florida', icon: '📉', topic: 'China & Trade', stance: 'supported' },
  ],
  // Trade policy: Supports = protection/security-first; Opposes = open markets; Mixed = targeted.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'greer', name: 'Jamieson Greer', office: 'U.S. Trade Representative', icon: '📦', topic: 'Tariffs & Reshoring', stance: 'supported' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'stephen_miller', name: 'Stephen Miller', office: 'White House Deputy Chief of Staff', icon: '🛂', topic: 'Enforcement Architect', stance: 'supported' },
    { id: 'blackburn', name: 'Marsha Blackburn', office: 'U.S. Senator · Tennessee', icon: '🎸', topic: 'Enforcement', stance: 'supported' },
    { id: 'rick_scott', name: 'Rick Scott', office: 'U.S. Senator · Florida', icon: '📉', topic: 'Enforcement', stance: 'supported' },
    { id: 'casar', name: 'Greg Casar', office: 'Progressive Caucus Chair · Texas', icon: '✊', topic: 'Reform over Deportation', stance: 'opposed' },
    { id: 'robert_garcia', name: 'Robert Garcia', office: 'House Oversight Ranking Member · California', icon: '🔎', topic: 'Path to Citizenship', stance: 'opposed' },
  ],
  // Mass deportations: Supports = supports mass deportation/strict enforcement; Opposes = opposes.
  'mass-deportations-immigration-enforcement-2026': [
    { id: 'stephen_miller', name: 'Stephen Miller', office: 'White House Deputy Chief of Staff', icon: '🛂', topic: 'Policy Architect', stance: 'supported' },
    { id: 'casar', name: 'Greg Casar', office: 'Progressive Caucus Chair · Texas', icon: '✊', topic: 'Immigrant Rights', stance: 'opposed' },
    { id: 'robert_garcia', name: 'Robert Garcia', office: 'House Oversight Ranking Member · California', icon: '🔎', topic: 'Oversight & Due Process', stance: 'opposed' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'rick_scott', name: 'Rick Scott', office: 'U.S. Senator · Florida', icon: '📉', topic: 'Deep Spending Cuts', stance: 'supported' },
    { id: 'foxx', name: 'Virginia Foxx', office: 'House Rules Chair · North Carolina', icon: '📜', topic: 'Spending Restraint', stance: 'supported' },
    { id: 'casar', name: 'Greg Casar', office: 'Progressive Caucus Chair · Texas', icon: '✊', topic: 'Protect the Safety Net', stance: 'opposed' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'schatz', name: 'Brian Schatz', office: 'U.S. Senator · Hawaii', icon: '🌊', topic: 'Clean Energy & Climate', stance: 'opposed' },
    { id: 'angus_king', name: 'Angus King', office: 'U.S. Senator (I) · Maine', icon: '🧭', topic: 'Grid & All-of-the-Above', stance: 'mixed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'ted_lieu', name: 'Ted Lieu', office: 'House Democratic Caucus Vice Chair · California', icon: '💻', topic: 'Federal AI Framework', stance: 'supported' },
    { id: 'blackburn', name: 'Marsha Blackburn', office: 'U.S. Senator · Tennessee', icon: '🎸', topic: 'Kids Online Safety', stance: 'supported' },
    { id: 'casar', name: 'Greg Casar', office: 'Progressive Caucus Chair · Texas', icon: '✊', topic: 'Workers & Automation', stance: 'supported' },
    { id: 'schatz', name: 'Brian Schatz', office: 'U.S. Senator · Hawaii', icon: '🌊', topic: 'Guardrails & Online Safety', stance: 'supported' },
  ],
  // Israel aid: Supports = robust aid/alliance; Opposes = reduce/condition; Mixed = support + conditions.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'angus_king', name: 'Angus King', office: 'U.S. Senator (I) · Maine', icon: '🧭', topic: 'Israel & Ukraine Aid', stance: 'supported' },
    { id: 'ted_lieu', name: 'Ted Lieu', office: 'House Democratic Caucus Vice Chair · California', icon: '💻', topic: 'Aid with Conditions', stance: 'mixed' },
    { id: 'schatz', name: 'Brian Schatz', office: 'U.S. Senator · Hawaii', icon: '🌊', topic: 'Aid with Conditions', stance: 'mixed' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'robert_garcia', name: 'Robert Garcia', office: 'House Oversight Ranking Member · California', icon: '🔎', topic: 'Oversight & Accountability', stance: 'supported' },
    { id: 'angus_king', name: 'Angus King', office: 'U.S. Senator (I) · Maine', icon: '🧭', topic: 'Institutional Norms', stance: 'supported' },
    { id: 'ted_lieu', name: 'Ted Lieu', office: 'House Democratic Caucus Vice Chair · California', icon: '💻', topic: 'Rule of Law', stance: 'supported' },
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
  const newContent = trimmed + '\n            // trade/policy principals, party leaders & influential members — top-down federal wave 8 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
