#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — add reciprocal relatedIssues links from existing spotlights to the
// two new chemical/food spotlights (July 2026), so discovery flows both ways.
// Idempotent; inserts each link once, right after the target's relatedIssues [.
//   node scripts/link-maha-chemical-reciprocal-jul2026.mjs            # dry run
//   node scripts/link-maha-chemical-reciprocal-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

// target spotlight slug -> links to add (label + slug of a new spotlight)
const LINKS = {
  'obesity-chronic-disease-healthcare-costs-2026': [
    { label: 'MAHA & the Food System', slug: 'maha-food-system-additives-2026' },
  ],
  'food-security-farming-future-2026': [
    { label: 'MAHA & the Food System', slug: 'maha-food-system-additives-2026' },
    { label: 'Pesticides, PFAS & Chemical Safety', slug: 'pesticides-pfas-chemical-safety-2026' },
  ],
  'water-security-western-scarcity-2026': [
    { label: 'Pesticides, PFAS & Chemical Safety', slug: 'pesticides-pfas-chemical-safety-2026' },
  ],
};

let html = fs.readFileSync(INDEX, 'utf8');
let added = 0;

for (const [slug, links] of Object.entries(LINKS)) {
  const start = html.indexOf(`'${slug}': {`);
  if (start < 0) { console.log(`  ✗ slug not found: ${slug}`); continue; }
  const riIdx = html.indexOf('relatedIssues: [', start);
  if (riIdx < 0) { console.log(`  ✗ relatedIssues not found: ${slug}`); continue; }
  const insertAt = riIdx + 'relatedIssues: ['.length;
  // dedupe against the existing relatedIssues array for this spotlight
  const arrEnd = html.indexOf('\n        ]', insertAt);
  const existing = html.slice(insertAt, arrEnd);
  const fresh = links.filter((l) => !existing.includes(`slug: '${l.slug}'`));
  if (!fresh.length) { console.log(`  · ${slug}: links present — skipped`); continue; }
  const ins = fresh.map((l) => `\n          { label: '${l.label}', slug: '${l.slug}' },`).join('');
  html = html.slice(0, insertAt) + ins + html.slice(insertAt);
  added += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.slug).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${added} reciprocal link(s)`);
if (APPLY && added) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
