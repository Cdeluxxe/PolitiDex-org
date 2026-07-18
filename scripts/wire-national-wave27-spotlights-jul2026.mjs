#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-27 officials (major-state legislative leaders +
// federal swing-district members) into the "How Politicians Stand" panels of the
// relevant Issue Spotlights (July 2026). Each stance follows the panel's own
// axis, verified against existing rows. Idempotent.
//   node scripts/wire-national-wave27-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave27-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const P = {
  dan_patrick: { name: 'Dan Patrick', office: 'Lieutenant Governor · Texas', icon: '⭐' },
  dustin_burrows: { name: 'Dustin Burrows', office: 'House Speaker · Texas', icon: '🤠' },
  mike_mcguire: { name: 'Mike McGuire', office: 'Senate Pro Tem · California', icon: '🐻' },
  robert_rivas: { name: 'Robert Rivas', office: 'Assembly Speaker · California', icon: '🌾' },
  ben_albritton: { name: 'Ben Albritton', office: 'Senate President · Florida', icon: '🍊' },
  daniel_perez_fl: { name: 'Daniel Perez', office: 'House Speaker · Florida', icon: '🐊' },
  stewart_cousins: { name: 'Andrea Stewart-Cousins', office: 'Senate Majority Leader · New York', icon: '🗽' },
  carl_heastie: { name: 'Carl Heastie', office: 'Assembly Speaker · New York', icon: '🏙' },
  don_bacon: { name: 'Don Bacon', office: 'U.S. Representative · Nebraska', icon: '🎖' },
  tom_suozzi: { name: 'Tom Suozzi', office: 'U.S. Representative · New York', icon: '🏛' },
};
const row = (id, topic, stance) => ({ id, ...P[id], topic, stance });

const WIRE = {
  // Abortion: Supports = access; Opposes = restrictions; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    row('mike_mcguire', 'Protect Access', 'supported'),
    row('robert_rivas', 'Protect Access', 'supported'),
    row('stewart_cousins', 'Codify Rights / ERA', 'supported'),
    row('carl_heastie', 'Protect Access', 'supported'),
    row('tom_suozzi', 'Protect Access', 'supported'),
    row('dan_patrick', 'Near-Total Ban', 'opposed'),
    row('don_bacon', 'Pro-Life With Exceptions', 'mixed'),
  ],
  // School choice: Supports = choice/vouchers; Opposes = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    row('dan_patrick', 'Education Savings Accounts', 'supported'),
    row('dustin_burrows', 'Passed School Choice', 'supported'),
    row('ben_albritton', 'Universal Choice', 'supported'),
    row('daniel_perez_fl', 'Universal Choice', 'supported'),
  ],
  // Border/asylum: Supports = strict enforcement; Opposes = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    row('dan_patrick', 'Operation Lone Star', 'supported'),
    row('dustin_burrows', 'State Enforcement', 'supported'),
    row('ben_albritton', '2025 Enforcement Law', 'supported'),
    row('daniel_perez_fl', '2025 Enforcement Law', 'supported'),
    row('don_bacon', 'Enforcement + Bipartisan Deal', 'mixed'),
    row('tom_suozzi', 'Enforcement + Pathways', 'mixed'),
    row('robert_rivas', 'Immigrant Protections', 'opposed'),
  ],
  // Energy: Supports = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    row('dan_patrick', 'Oil, Gas & Dispatchable Power', 'supported'),
    row('mike_mcguire', 'Clean-Energy Agenda', 'opposed'),
    row('robert_rivas', 'Clean-Energy Agenda', 'opposed'),
    row('stewart_cousins', 'CLCPA Climate Law', 'opposed'),
  ],
  // Guns: Supports = prevention/safety; Opposes = gun rights; Mixed.
  'mental-health-gun-violence-prevention-2026': [
    row('mike_mcguire', 'Strict Gun-Safety Laws', 'supported'),
    row('stewart_cousins', 'Post-Buffalo Gun Laws', 'supported'),
  ],
  // Housing: Supports = build-more/supply-side; Opposes = resists supply-side.
  'housing-affordability-crisis-2026': [
    row('mike_mcguire', 'Production & Streamlining', 'supported'),
    row('robert_rivas', 'Housing Production', 'supported'),
    row('stewart_cousins', 'Build + Tenant Protections', 'supported'),
    row('carl_heastie', 'Build + Tenant Protections', 'supported'),
  ],
  // Ukraine: Supports = continued aid / hard line on Russia; Opposes = cut aid; Mixed = negotiated end.
  'ukraine-russia-war-us-aid-peace-2026': [
    row('don_bacon', 'Continued Military Aid', 'supported'),
  ],
  // U.S.–Israel: Supports = strong support for Israel & aid.
  'us-israel-relations-foreign-aid-partnership-2026': [
    row('don_bacon', 'Support for Israel', 'supported'),
    row('tom_suozzi', 'Support for Israel', 'supported'),
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
  const newContent = trimmed + '\n            // Major-state leaders + swing-district members — wave 27 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
