#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — restructure the Housing Affordability Spotlight's "How Politicians
// Stand" panel into the standard format (July 2026).
// ---------------------------------------------------------------------------
// The `housing-affordability-crisis-2026` guide carried a legacy standsOnIssue
// block: it listed nine officials with a `topic` but no `stance`, and had no
// `note` axis explainer. Without an explicit stance the renderer's
// resolveStance() falls through to "No Clear Position" for everyone, so the
// comparison conveyed nothing. This upgrades it to match the other 58 guides:
//
//   1. adds a `note` defining the axis on the guide's own libraryKey
//      (housing_build → build-more / supply-side reform);
//   2. assigns each of the nine existing people a sourced `stance`;
//   3. enriches the panel with three members who already carry housing stance
//      cards, giving a real spread (supply-side builders vs. build-plus-
//      protections Democrats).
//
// Axis (neutral, anchored on housing_build): "Supports" = supply-side build-more
// reform; "Mixed" = building paired with tenant protections/subsidies or a
// local-control caveat. No one is marked "Opposes": on a build-more axis the
// real divide is HOW (deregulation vs. public investment), which is the
// supported-vs-mixed split — not whether to build at all.
//
// CLIENT-side and idempotent.
//   node scripts/restructure-housing-spotlight-jul2026.mjs            # dry run
//   node scripts/restructure-housing-spotlight-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const SLUG = 'housing-affordability-crisis-2026';

// Axis explainer (matches the style/length of the other guides' `note`).
const NOTE =
  'Stance chips read on housing affordability: “Supports” = build-more, supply-side reform — ' +
  'loosen zoning and permitting, free up land, and cut the cost to build; “Opposes” = resists ' +
  'supply-side deregulation, favoring local control or demand-side aid (subsidies, rent limits) over new ' +
  'construction; “Mixed” = building paired with tenant protections or subsidies, or supported with ' +
  'local-control caveats. Positions and the say-vs-do verdict come from each official’s record; the ' +
  'Stance Library has the full spread.';

// Stance for each existing person (by id).
const STANCE = {
  trump: 'mixed',            // frames it on cost of living; opens federal land + deregulation, not zoning reform
  lee: 'supported',          // HOUSES Act — sell federal land to build
  cox: 'supported',          // Utah build-more / starter-home agenda
  mike_schultz: 'supported', // Utah housing-supply legislation
  sadams: 'supported',       // Utah First Home / housing-supply push
  mike_kohler: 'mixed',      // supports affordability but insists on local control
  jeffries: 'mixed',         // backs building plus a subsidy/cost blend
  aoc: 'mixed',              // public/social housing + tenant protections over deregulation
  mike_flood: 'supported',   // supply-focused (former mayor)
};

// Enrichment — members who already carry housing stance cards in their profiles.
const ADD = [
  { id: 'jake_auchincloss', name: 'Jake Auchincloss', office: 'U.S. Representative · Massachusetts', icon: '💻', topic: 'Build More Housing', stance: 'supported' },
  { id: 'ayanna_pressley', name: 'Ayanna Pressley', office: 'U.S. Representative · Massachusetts', icon: '✊', topic: 'Affordable Housing & Renters', stance: 'mixed' },
  { id: 'delia_ramirez', name: 'Delia Ramirez', office: 'U.S. Representative · Illinois', icon: '🏠', topic: 'Affordable Housing & Tenants', stance: 'mixed' },
];

let html = fs.readFileSync(INDEX, 'utf8');

// Isolate the housing standsOnIssue { ... } object.
const gStart = html.indexOf(`'${SLUG}': {`);
if (gStart < 0) { console.error('✗ housing guide not found'); process.exit(1); }
const sIdx = html.indexOf('standsOnIssue', gStart);
const braceOpen = html.indexOf('{', sIdx);
let depth = 0, braceEnd = braceOpen;
for (let p = braceOpen; p < html.length; p++) { const c = html[p]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { braceEnd = p; break; } } }
let block = html.slice(braceOpen, braceEnd + 1);
const before = block;

// 1. Insert `note:` after the matchIssueKeys line (idempotent).
if (!/\bnote:\s*'/.test(block)) {
  block = block.replace(/(matchIssueKeys:\s*\[[^\]]*\],\n)/, `$1          note: '${esc(NOTE)}',\n`);
  console.log('  ✎ note: added');
} else console.log('  · note already present');

// 2. Add `stance:` to each existing person that lacks one (idempotent).
let stanceAdds = 0;
for (const [id, val] of Object.entries(STANCE)) {
  const re = new RegExp(`(\\{ id: '${id}',[^}]*?topic: '[^']*')( \\})`);
  const m = block.match(re);
  if (m && !/stance:/.test(m[0])) {
    block = block.replace(re, `$1, stance: '${val}'$2`);
    stanceAdds++;
  }
}
console.log(`  ✎ stance: added to ${stanceAdds} existing person(s)`);

// 3. Add enrichment people before the closing `]` of the people array (idempotent).
const fresh = ADD.filter((e) => !new RegExp(`id: '${e.id}'`).test(block));
if (fresh.length) {
  // Each row carries a trailing comma (a trailing comma before `]` is valid JS).
  const rows = fresh
    .map((e) => `            { id: '${e.id}', name: '${esc(e.name)}', office: '${esc(e.office)}', icon: '${e.icon}', topic: '${esc(e.topic)}', stance: '${e.stance}' },`)
    .join('\n');
  // The people array closes at the last "\n          ]" inside this block.
  const peopleClose = block.lastIndexOf('\n          ]');
  if (peopleClose < 0) { console.error('✗ people array close not found'); process.exit(1); }
  const head = block.slice(0, peopleClose).replace(/\}\s*$/, '},'); // give the prior last entry a comma
  const tail = block.slice(peopleClose);
  block = head + '\n            // Members with housing stance cards — panel enrichment (July 2026)\n' + rows + tail;
  console.log(`  ✎ added ${fresh.length} enrichment person(s): ${fresh.map((f) => f.id).join(', ')}`);
} else console.log('  · enrichment people already present');

if (block === before) { console.log('\nNo changes needed (already standard).'); process.exit(0); }

html = html.slice(0, braceOpen) + block + html.slice(braceEnd + 1);

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — housing standsOnIssue restructured`);
if (APPLY) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else { console.log('  Re-run with --apply to write.\n\n--- preview ---'); const gi = html.indexOf(`'${SLUG}': {`); const si = html.indexOf('standsOnIssue', gi); console.log(html.slice(si, si + 1900)); }
