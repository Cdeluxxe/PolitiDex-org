#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — ENRICH pass, wave 13 (July 2026): deepen a top-tier profile and
// fix a data-quality bug. Secretary of Defense Pete Hegseth had no foreign-
// policy stance cards despite the role, and carried a duplicate DEI card with a
// missing (undefined) issueKey. This adds Israel, Ukraine, and China/Indo-
// Pacific cards and removes the broken duplicate. Idempotent. (politician-stances.js)
//   node scripts/enrich-hegseth-foreign-wave13-jul2026.mjs            # dry run
//   node scripts/enrich-hegseth-foreign-wave13-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// The broken duplicate card to remove (missing issueKey/issueStance -> renders as undefined).
const BROKEN = `      { topic:'DEI in the Military', icon:'🪖', pos:'oppose',
        text:'Moved to eliminate diversity, equity, and inclusion programs, offices, and training across the armed forces, calling them a distraction from warfighting.',
        evidence:'Ordered the military to end DEI programs and offices (2025).' },
`;

const S = { dod: { label: 'defense.gov', url: 'https://www.defense.gov' } };
const NEWCARDS = [
  { topic: 'Israel & Iran', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
    text: "As Defense secretary, Hegseth has directed strong U.S. military support for Israel — weapons deliveries and regional force posture — and a hard line against Iran and its proxies.", source: S.dod },
  { topic: 'Ukraine & Russia', icon: '🕊', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
    text: "Backs pressure on Russia and greater burden-sharing by European allies while supporting the administration's push for a negotiated end to the war and scrutinizing open-ended U.S. aid.", source: S.dod },
  { topic: 'China & the Indo-Pacific', icon: '🇨🇳', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
    text: "Frames China as the primary threat and has moved to shift military focus, posture, and resources toward deterring it in the Indo-Pacific.", source: S.dod },
];

// validate keys
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
for (const c of NEWCARDS) if (!valid.has(c.issueKey)) { console.error('✗ invalid issueKey', c.issueKey); process.exit(1); }
console.log(`  ✓ ${NEWCARDS.length} new issueKeys valid`);

function cardStr(c) {
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}', source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },`;
}

let src = fs.readFileSync(STANCES, 'utf8');
const start = src.indexOf('\n    hegseth: [');
if (start < 0) { console.error('✗ hegseth array not found'); process.exit(1); }
const close = src.indexOf('\n    ],', start);
let block = src.slice(start, close);

const hadBroken = block.includes(BROKEN);
const hasNew = block.includes("topic:'Israel & Iran'");
console.log(`  broken duplicate card present: ${hadBroken}`);
console.log(`  foreign-policy cards already present: ${hasNew}`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

if (hadBroken) block = block.replace(BROKEN, '');
if (!hasNew) block = block + '\n' + NEWCARDS.map(cardStr).join('\n');
src = src.slice(0, start) + block + src.slice(close);
fs.writeFileSync(STANCES, src);
console.log(`  ✎ hegseth: ${hadBroken ? 'removed broken card; ' : ''}${hasNew ? 'cards already present' : 'added ' + NEWCARDS.length + ' foreign-policy cards'}`);
console.log('\nApplied. NEXT: node scripts/split-stances.mjs');
