#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Complete the Chellie Pingree profile (July 2026)
// ---------------------------------------------------------------------------
// Chellie Pingree (D-ME-01) already has a rich stance array in politician-stances.js
// but no roster/search entry and is missing from the shipped long-tail chunk — so she
// does not appear as a browsable profile. She is named in the 2026 Farm Bill entry
// (co-led the bipartisan amendment striking the pesticide-liability provisions), so
// this completes her profile:
//   • cmp-data.js            — roster/search index entry (JSON)
//   • politician-stances-ext.js — mirror her EXISTING monolith stance array verbatim
//   • index.html             — PROFILES seed allow-list
// Does NOT touch her existing monolith stance array. Idempotent + client-side.
//   node scripts/complete-chellie-pingree-jul2026.mjs --apply
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const CMP = path.join(ROOT, 'cmp-data.js');
const INDEX = path.join(ROOT, 'index.html');
const EXT = path.join(ROOT, 'politician-stances-ext.js');
const APPLY = process.argv.includes('--apply');
const ID = 'chellie_pingree';

const roster = { name: 'Chellie Pingree', office: 'U.S. Representative', state: 'Maine', party: 'D', score: 53, icon: '🌾', issues: ['Agriculture', 'Environment', 'Appropriations', 'Organic Farming'] };

// Pull her existing stance array out of the monolith (verbatim) so the shipped chunk
// matches exactly — no divergence, no hand-authored duplicate.
function evalGlobal(code, pick) {
  const prev = globalThis.window; const window = globalThis.window = {};
  try { (0, eval)(code); return pick(window); } finally { globalThis.window = prev; }
}
const monolith = fs.readFileSync(STANCES, 'utf8');
const cards = evalGlobal(monolith, (w) => (w.ISSUE_STANCE_DATA || {})[ID]);
if (!Array.isArray(cards) || !cards.length) { console.error(`✗ ${ID} stance array not found in the monolith`); process.exit(1); }
console.log(`PolitiDex — complete ${ID} (${cards.length} existing cards)  [${APPLY ? 'APPLY' : 'DRY RUN'}]`);

const cmpRaw = fs.readFileSync(CMP, 'utf8');
const extRaw = fs.readFileSync(EXT, 'utf8');
let html = fs.readFileSync(INDEX, 'utf8');
const needCmp = !new RegExp(`"${ID}"\\s*:`).test(cmpRaw);
const needExt = !extRaw.includes(`"${ID}":[`);
const needSeed = !html.includes(`'${ID}'`);
console.log(`  cmp-data: ${needCmp ? 'ADD' : 'present'} · ext: ${needExt ? 'MIRROR' : 'present'} · seed: ${needSeed ? 'ADD' : 'present'}`);
if (!APPLY) { console.log('\nDry run.'); process.exit(0); }

if (needCmp) {
  const cmpAnchor = 'window.CMP_DATA = window.CMP_DATA || {}),\n{\n';
  const row = ` "${ID}": {\n  "name": "${roster.name}",\n  "office": "${roster.office}",\n  "state": "${roster.state}",\n  "party": "${roster.party}",\n  "score": ${roster.score},\n  "kept": 0,\n  "broken": 0,\n  "pending": 0,\n  "icon": "${roster.icon}",\n  "issues": [\n${roster.issues.map((i) => `   "${i}"`).join(',\n')}\n  ]\n },`;
  fs.writeFileSync(CMP, cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — complete Chellie Pingree (July 2026)\n' + row + '\n'));
  console.log('  ✎ added roster row → cmp-data.js');
}
if (needExt) {
  const json = JSON.stringify(ID) + ':' + JSON.stringify(cards) + ',';
  fs.writeFileSync(EXT, extRaw.replace('var d = {', 'var d = {' + json));
  console.log('  ✎ mirrored stance array → politician-stances-ext.js');
}
if (needSeed) {
  const seedClose = '\n      ].forEach(function (id) {';
  const seedBlock = `\n        // Complete Chellie Pingree — farm-bill amendment author (July 2026)\n        '${ID}',`;
  fs.writeFileSync(INDEX, html.replace(seedClose, seedBlock + seedClose));
  console.log('  ✎ seeded id into PROFILES allow-list → index.html');
}
console.log('\nApplied.');
