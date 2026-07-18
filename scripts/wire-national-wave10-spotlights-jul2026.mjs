#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-10 federal figures into the "How Politicians Stand"
// panels of the relevant Issue Spotlights (July 2026). Stances follow each
// panel's own axis note. Idempotent; skips ids already present. (index.html)
//   node scripts/wire-national-wave10-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave10-spotlights-jul2026.mjs --apply    # write
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
    { id: 'mike_waltz', name: 'Mike Waltz', office: 'U.S. Ambassador to the United Nations', icon: '🌐', topic: 'Aid & the Alliance', stance: 'supported' },
    { id: 'tlaib', name: 'Rashida Tlaib', office: 'U.S. Representative · Michigan', icon: '🌿', topic: 'Condition/Halt Aid', stance: 'opposed' },
  ],
  // Ukraine: Supports = continued aid + hard line; Opposes = cut/limit or quick settlement; Mixed = negotiated end.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'mike_waltz', name: 'Mike Waltz', office: 'U.S. Ambassador to the United Nations', icon: '🌐', topic: 'Pressure + Negotiated End', stance: 'mixed' },
    { id: 'jared_golden', name: 'Jared Golden', office: 'U.S. Representative · Maine', icon: '⚓', topic: 'Ukraine Aid', stance: 'supported' },
  ],
  // China/Taiwan: Supports = robust deterrent; Opposes = restraint/burden-shifting; Mixed = tough but wary of overcommitment.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'mike_waltz', name: 'Mike Waltz', office: 'U.S. Ambassador to the United Nations', icon: '🌐', topic: 'Counter China', stance: 'supported' },
    { id: 'todd_young', name: 'Todd Young', office: 'U.S. Senator · Indiana', icon: '💡', topic: 'Tech & China Competition', stance: 'supported' },
  ],
  // Tariffs: Supports = tariffs as leverage/industrial policy; Opposes = a tax/overreach; Mixed = targeted.
  'tariffs-cost-of-living-inflation': [
    { id: 'jared_golden', name: 'Jared Golden', office: 'U.S. Representative · Maine', icon: '⚓', topic: 'Protect Manufacturing', stance: 'supported' },
    { id: 'chavez_deremer', name: 'Lori Chavez-DeRemer', office: 'U.S. Secretary of Labor', icon: '🧰', topic: 'Trade & Jobs', stance: 'mixed' },
  ],
  // Trade policy: Supports = protection/security-first; Opposes = open markets; Mixed = targeted.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'jared_golden', name: 'Jared Golden', office: 'U.S. Representative · Maine', icon: '⚓', topic: 'Reshoring & Manufacturing', stance: 'supported' },
    { id: 'chavez_deremer', name: 'Lori Chavez-DeRemer', office: 'U.S. Secretary of Labor', icon: '🧰', topic: 'Manufacturing Jobs', stance: 'mixed' },
  ],
  // Spending: Supports = cuts/restraint; Opposes = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'ron_johnson', name: 'Ron Johnson', office: 'U.S. Senator · Wisconsin', icon: '📉', topic: 'Deep Spending Cuts', stance: 'supported' },
    { id: 'jared_golden', name: 'Jared Golden', office: 'U.S. Representative · Maine', icon: '⚓', topic: 'Fiscal Restraint', stance: 'mixed' },
  ],
  // Energy: Supports = reliability-first abundance; Opposes = clean-led limiting fossil; Mixed = clean-first pragmatic.
  'energy-abundance-grid-reliability-2026': [
    { id: 'merkley', name: 'Jeff Merkley', office: 'U.S. Senator · Oregon', icon: '🌎', topic: 'Climate & Clean Energy', stance: 'opposed' },
  ],
  // AI: Supports = stronger guardrails; Opposes = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'blumenthal', name: 'Richard Blumenthal', office: 'U.S. Senator · Connecticut', icon: '⚖️', topic: 'AI Framework & Kids Safety', stance: 'supported' },
    { id: 'todd_young', name: 'Todd Young', office: 'U.S. Senator · Indiana', icon: '💡', topic: 'Innovation + Frameworks', stance: 'mixed' },
  ],
  // Border: Supports = strict enforcement; Opposes = broader access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'ron_johnson', name: 'Ron Johnson', office: 'U.S. Senator · Wisconsin', icon: '📉', topic: 'Strict Enforcement', stance: 'supported' },
    { id: 'tlaib', name: 'Rashida Tlaib', office: 'U.S. Representative · Michigan', icon: '🌿', topic: 'Immigrant Rights', stance: 'opposed' },
  ],
  // Trust: Supports = institutional reform/accountability; Opposes = cultural/communal; Mixed = both.
  'trust-institutions-social-capital-2026': [
    { id: 'nadler', name: 'Jerry Nadler', office: 'U.S. Representative · New York', icon: '⚖️', topic: 'Rule of Law & Oversight', stance: 'supported' },
    { id: 'merkley', name: 'Jeff Merkley', office: 'U.S. Senator · Oregon', icon: '🌎', topic: 'Democracy Reform', stance: 'supported' },
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
  const newContent = trimmed + '\n            // more Cabinet, the UN ambassador & influential members — top-down federal wave 10 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
