#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — audit which FEDERAL profiles still render the icon placeholder
//
// Headshots resolve through `_getPhotoUrl(id)` in index.html, in priority order:
//   1. the live Firestore `photo` field (an edited/imported profile), then
//   2. the curated `BROWSE_PHOTOS` fallback map embedded in index.html.
// A profile shows the generic 🏛 icon only when BOTH are empty.
//
// This script reconciles the two sources so maintainers can find the gaps after
// each expansion wave (it is READ-ONLY — it never writes anything):
//
//   node scripts/audit-federal-photos-jun2026.mjs
//
// Workflow for adding a photo going forward:
//   • Sitting member of Congress  → add `id: '<congress-url>/<BIOGUIDE>.jpg'`
//     to BROWSE_PHOTOS. Look the Bioguide ID up in the authoritative dataset:
//     https://unitedstates.github.io/congress-legislators/legislators-current.json
//     Portrait base: https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/
//   • Non-incumbent with a public portrait → a Wikimedia Commons 500px thumb.
//   • No reliable public photo yet → leave it on the icon and re-run this audit
//     after the candidate's campaign or office publishes one.
// Always confirm the URL returns HTTP 200 image/* before committing.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KEY = 'AIzaSyDNkLuB8wmLuz38dfL8ZP6rvnv-efZvnyU'; // public Firebase web key
const BASE = 'https://firestore.googleapis.com/v1/projects/politidex-979bd/databases/(default)/documents/politicians';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Pull the curated BROWSE_PHOTOS keys straight out of index.html ───────────
function browsePhotoKeys() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const open = html.indexOf('var BROWSE_PHOTOS = {');
  if (open === -1) throw new Error('BROWSE_PHOTOS map not found in index.html');
  const close = html.indexOf('\n    };', open);
  const body = html.slice(open, close);
  const keys = new Set();
  for (const m of body.matchAll(/^\s*([a-z0-9_]+)\s*:\s*'/gim)) keys.add(m[1]);
  return keys;
}

// ── Walk the full live roster ────────────────────────────────────────────────
async function roster() {
  const docs = [];
  let token = '';
  do {
    const url = `${BASE}?pageSize=300&key=${KEY}` + (token ? `&pageToken=${token}` : '');
    const r = await fetch(url);
    if (!r.ok) throw new Error(`roster fetch: HTTP ${r.status}`);
    const j = await r.json();
    (j.documents || []).forEach((d) => docs.push(d));
    token = j.nextPageToken || '';
  } while (token);
  return docs;
}

const isFederal = (office, district) =>
  /U\.S\.\s+(House|Representative|Senate|Senator)/i.test(office) ||
  /U\.S\.\s+Senate/i.test(district) ||
  /—\s*(?:[A-Z]{2}-\d+|\d+(?:st|nd|rd|th)\s+District|IA-\d+)/.test(district);

(async () => {
  const keys = browsePhotoKeys();
  const docs = await roster();
  const missing = [];
  for (const d of docs) {
    const id = d.name.split('/').pop();
    const f = d.fields || {};
    const office = f.office?.stringValue || '';
    const district = f.district?.stringValue || '';
    const state = f.state?.stringValue || '';
    if (!isFederal(office, district)) continue;
    const hasFirestorePhoto = !!(f.photo?.stringValue || '').trim();
    const hasFallback = keys.has(id);
    if (!hasFirestorePhoto && !hasFallback) {
      missing.push({ id, state, label: office || district });
    }
  }
  missing.sort((a, b) => (a.state + a.id).localeCompare(b.state + b.id));
  console.log(`Federal profiles still on the icon placeholder: ${missing.length}\n`);
  for (const m of missing) {
    console.log(`  ${m.id.padEnd(28)} ${(m.state || '').padEnd(16)} ${m.label}`);
  }
  if (!missing.length) console.log('  (none — every federal profile resolves a photo)');
})();
