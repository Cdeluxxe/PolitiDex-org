#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — PROFILES-seed directory backfill for prior federal waves.
// ---------------------------------------------------------------------------
// The public directory / global search / Your Ballot are built from PROFILES.
// A federal official with no live database record only enters PROFILES via the
// in-page seed allow-list (index.html, the "In-file officeholders" forEach).
// That list was hand-maintained for the early "National 7-10" batch, so figures
// added by later waves reached the comparison tool and Spotlights (via CMP_DATA)
// but never the public directory or search.
//
// This backfill closes that gap: it re-derives the federal-wave figures from
// the CMP_DATA roster's own "// National … wave N" comment blocks, keeps only
// those that (a) carry ISSUE_STANCE_DATA and (b) are not already seeded, and
// appends them to the allow-list. The in-page loop is guarded on
// (!PROFILES[id]), so any future live record still wins. Idempotent.
//   node scripts/backfill-federal-profiles-seed-jul2026.mjs            # dry run
//   node scripts/backfill-federal-profiles-seed-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

function stanceKeys() {
  const set = new Set();
  for (const f of ['politician-stances-core.js', 'politician-stances-ext.js']) {
    const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const w = {}; new Function('window', c + ';return 0;')(w);
    Object.keys(w.ISSUE_STANCE_DATA || {}).forEach((k) => set.add(k));
  }
  return set;
}

const html = fs.readFileSync(INDEX, 'utf8');

// 1. Derive federal-wave ids from CMP_DATA "// National … wave N" comment blocks.
const rosterStart = html.indexOf('CMP_DATA = {');
const region = html.slice(rosterStart, html.indexOf('\n  };', rosterStart));
const federal = [];
let inFederal = false;
for (const ln of region.split('\n')) {
  if (/\/\/\s*National\b.*wave\s*\d+/i.test(ln)) { inFederal = true; continue; }
  if (/^\s*\/\//.test(ln)) { if (!/National/i.test(ln)) inFederal = false; continue; }
  const m = ln.match(/^\s+([a-z_0-9]+)\s*:\s*\{ name:/);
  if (m && inFederal) federal.push(m[1]);
}
const federalIds = [...new Set(federal)];

// 2. Current seed ids (from the allow-list array only).
const seedStart = html.indexOf("'lorene_kamalu'");
const seedEnd = html.indexOf('].forEach(function (id) {', seedStart);
if (seedStart < 0 || seedEnd < 0) { console.error('✗ PROFILES seed array not found'); process.exit(1); }
const seedArr = html.slice(seedStart, seedEnd);
const seeded = new Set([...seedArr.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]));

// 3. Keep federal ids that have stance data and are not already seeded.
const keys = stanceKeys();
const toAdd = federalIds.filter((id) => keys.has(id) && !seeded.has(id));
const noStance = federalIds.filter((id) => !keys.has(id));

console.log(`Federal-wave roster ids: ${federalIds.length}`);
console.log(`  already seeded: ${federalIds.filter((id) => seeded.has(id)).length}`);
console.log(`  to backfill (have stance, unseeded): ${toAdd.length}`);
if (noStance.length) console.log(`  (skipped — no stance data: ${noStance.length}) ${noStance.join(', ')}`);
console.log('');
console.log(toAdd.join(', '));

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }
if (!toAdd.length) { console.log('\nNothing to backfill.'); process.exit(0); }

// 4. Insert a backfill block just before the seed array's closing `]`.
const marker = '// Federal-wave directory backfill (waves 2-17)';
if (html.includes(marker)) { console.log('· backfill block already present — skipped'); process.exit(0); }
const lines = [];
for (let i = 0; i < toAdd.length; i += 6) lines.push('        ' + toAdd.slice(i, i + 6).map((id) => `'${id}'`).join(', ') + ',');
const block = `        // ${marker}: federal figures added to CMP_DATA by earlier waves\n` +
              `        // that were never seeded into the public directory. Guarded by !PROFILES[id].\n` +
              lines.join('\n') + '\n';
const insertAt = html.lastIndexOf('\n', seedEnd) + 1; // start of the "      ].forEach" line
const out = html.slice(0, insertAt) + block + html.slice(insertAt);
fs.writeFileSync(INDEX, out);
console.log(`\n✎ backfilled ${toAdd.length} federal id(s) into the PROFILES seed allow-list`);
