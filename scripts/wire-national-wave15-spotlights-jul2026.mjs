#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-15 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
// (Bost/veterans, Williams/small-business, Harris/agriculture, Clarke/broadband
//  connect via their issue keys where no flagship panel exists.)
//   node scripts/wire-national-wave15-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave15-spotlights-jul2026.mjs --apply    # write
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
    { id: 'maxine_waters', name: 'Maxine Waters', office: 'House Financial Services Ranking Member · California', icon: '🏦', topic: 'Rules with Strong Safeguards', stance: 'mixed' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'andy_harris', name: 'Andy Harris', office: 'House Freedom Caucus Chair · Maryland', icon: '🚩', topic: 'Strict Enforcement', stance: 'supported' },
    { id: 'mike_bost', name: 'Mike Bost', office: "House Veterans' Affairs Chair · Illinois", icon: '🎖', topic: 'Enforcement', stance: 'supported' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'andy_harris', name: 'Andy Harris', office: 'House Freedom Caucus Chair · Maryland', icon: '🚩', topic: 'Freedom Caucus Cuts', stance: 'supported' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'mike_bost', name: 'Mike Bost', office: "House Veterans' Affairs Chair · Illinois", icon: '🎖', topic: 'Coal, Oil & Gas', stance: 'supported' },
    { id: 'jared_huffman', name: 'Jared Huffman', office: 'House Natural Resources Ranking Member · California', icon: '🌲', topic: 'Public Lands & Clean Energy', stance: 'opposed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'zoe_lofgren', name: 'Zoe Lofgren', office: 'House Science Committee Ranking Member · California', icon: '🔬', topic: 'Research & Guardrails', stance: 'supported' },
    { id: 'yvette_clarke', name: 'Yvette Clarke', office: 'Congressional Black Caucus Chair · New York', icon: '✊', topic: 'AI Bias & Deepfakes', stance: 'supported' },
    { id: 'brian_babin', name: 'Brian Babin', office: 'House Science, Space & Tech Chair · Texas', icon: '🚀', topic: 'Innovation-First Research', stance: 'opposed' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'jim_himes', name: 'Jim Himes', office: 'House Intelligence Ranking Member · Connecticut', icon: '🕵', topic: 'Deterrence & Oversight', stance: 'supported' },
  ],
  // Ukraine: Supports = continued aid + hard line; Opposes = cut/limit or quick settlement; Mixed = negotiated end.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'jim_himes', name: 'Jim Himes', office: 'House Intelligence Ranking Member · Connecticut', icon: '🕵', topic: 'Continued Aid', stance: 'supported' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'jim_himes', name: 'Jim Himes', office: 'House Intelligence Ranking Member · Connecticut', icon: '🕵', topic: 'Intelligence Oversight', stance: 'supported' },
    { id: 'zoe_lofgren', name: 'Zoe Lofgren', office: 'House Science Committee Ranking Member · California', icon: '🔬', topic: 'Elections & Democracy', stance: 'supported' },
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
  const newContent = trimmed + '\n            // remaining committee chairs, ranking members & caucus chairs — federal wave 15 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
