#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah launch cleanup: MERGE duplicate stance-card records
// ---------------------------------------------------------------------------
// The Utah coverage audit found five people carrying TWO stance-card arrays
// each in the source-of-truth `politician-stances.js` (window.ISSUE_STANCE_DATA).
// Every duplicate is the same real official under two ids: a canonical curated
// key and a second, superseded key (either a newer controversy pass that was
// filed under its own id, or an older Power-Map short pid that predates the full
// record). Two ids for one person fragments the profile — the client resolves
// SD[pid] || SD[alias(pid)], so whichever id a surface uses, it sees only half
// the cards — and, for the legacy short pids, ships UNSOURCED placeholder cards
// next to a clean sourced record.
//
// This pass consolidates each person to ONE array and one alias, following the
// established ACCT_ALIAS pattern (short/duplicate pid → canonical curated key):
//
//   RETIRED key          CANONICAL key            disposition
//   ------------------   ----------------------   ------------------------------
//   rosie_rivera_slco    rosie_rivera             UNION (both sourced; 3 → 9)
//   mike_smith_utco      mike_smith_sheriff       UNION (both sourced; 4 → 9)
//   mhogan               michelle_kaufusi         DROP  (4 UNSOURCED dup cards)
//   dwatts               monica_zoltanski_sandy   DROP  (3 UNSOURCED dup cards)
//   rwood                troy_walker_draper       DROP  (3 UNSOURCED dup cards)
//
// POLICY (launch-quality, no fabrication):
//   • UNION merges keep every SOURCED card, de-duplicated by stance text; a
//     retired card is copied verbatim (formatting/escaping preserved) only if it
//     carries a {source} AND no canonical card already states the same thing.
//   • The three legacy short pids hold only UNSOURCED, generic cards that
//     duplicate a person who already has a clean sourced record. Rather than
//     dilute the sourced profile (and drop the 95.9% county sourced-card rate),
//     their cards are DROPPED, the array removed, and an alias added so the
//     browse/roster id still resolves to the canonical record. The dropped
//     (real but unsourced) facts are listed in the honest-gaps tracker for a
//     future sourced re-add — nothing is invented, and no sourced card is lost.
//
// The script edits the SOURCE OF TRUTH only. After --apply, regenerate the two
// shipped chunks:  node scripts/split-stances.mjs  (it re-derives core/ext from
// politician-stances.js and verifies round-trip integrity).
//
// Idempotent: once merged, the retired keys are gone, so a re-run reports
// "already merged" and changes nothing. Dry run by default.
//
//   node scripts/cleanup-utah-duplicate-records-jul2026.mjs            # dry run
//   node scripts/cleanup-utah-duplicate-records-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

// retired → canonical, with the intended disposition.
const MERGES = [
  { retired: 'rosie_rivera_slco',  canonical: 'rosie_rivera',           mode: 'union', aliasExists: true  },
  { retired: 'mike_smith_utco',    canonical: 'mike_smith_sheriff',     mode: 'union', aliasExists: false },
  { retired: 'mhogan',             canonical: 'michelle_kaufusi',       mode: 'drop',  aliasExists: false },
  { retired: 'dwatts',             canonical: 'monica_zoltanski_sandy', mode: 'drop',  aliasExists: false },
  { retired: 'rwood',              canonical: 'troy_walker_draper',     mode: 'drop',  aliasExists: false },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function loadStanceData(code) {
  const prev = globalThis.window;
  const window = (globalThis.window = {});
  try { (0, eval)(code); return window.ISSUE_STANCE_DATA; }
  finally { globalThis.window = prev; }
}
// pull the text:'...' payload of a single-line card, for de-dup comparison
function cardText(line) {
  const m = line.match(/text:'((?:\\.|[^'\\])*)'/);
  return m ? m[1].replace(/\s+/g, ' ').trim().toLowerCase() : line.trim().toLowerCase();
}
const isSourced = (line) => /source:\s*\{/.test(line);

// Locate a top-level key's array as an inclusive [start,end] line-index range.
// start = the `    KEY: [ ...` line; end = its terminating `    ],` line.
function findBlock(lines, key) {
  const startRe = new RegExp('^    ' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': \\[');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '    ],') return { start, end: i };
  }
  return null;
}
// card lines inside a block are the ones indented six spaces starting with `{`
function cardLines(lines, blk) {
  const out = [];
  for (let i = blk.start + 1; i < blk.end; i++) if (/^      \{/.test(lines[i])) out.push(i);
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log(`PolitiDex — Utah duplicate-record merge  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const raw = fs.readFileSync(STANCES, 'utf8');
const SD = loadStanceData(raw);
let lines = raw.split('\n');

// Plan: gather the retired-block ranges to delete and, for unions, the exact card
// lines to graft into the canonical block (before its closing `],`).
const toDelete = [];                 // [{start,end}]
const insertAt = new Map();          // canonicalEndLineIdx -> [cardLine, ...]
let planned = 0, alreadyDone = 0;

for (const m of MERGES) {
  const rBlk = findBlock(lines, m.retired);
  const cBlk = findBlock(lines, m.canonical);

  if (!rBlk) {
    if (cBlk) { console.log(`  ✓ ${m.retired} → ${m.canonical}: already merged (retired key absent).`); alreadyDone++; }
    else console.log(`  ⚠ ${m.retired} → ${m.canonical}: NEITHER key found — nothing to do.`);
    continue;
  }
  if (!cBlk) { console.log(`  ✗ ${m.retired} → ${m.canonical}: canonical key MISSING — refusing to drop data.`); continue; }

  // sanity: canonical should be fully sourced (these are curated controversy records)
  const cCards = cardLines(lines, cBlk);
  const cUnsourced = cCards.filter((i) => !isSourced(lines[i])).length;
  if (cUnsourced) console.log(`  · note: canonical ${m.canonical} has ${cUnsourced} unsourced card(s).`);

  toDelete.push(rBlk);

  if (m.mode === 'union') {
    const existing = new Set(cCards.map((i) => cardText(lines[i])));
    const grafts = [];
    let dropUnsourced = 0, dropDup = 0;
    for (const i of cardLines(lines, rBlk)) {
      const line = lines[i];
      if (!isSourced(line)) { dropUnsourced++; continue; }
      if (existing.has(cardText(line))) { dropDup++; continue; }
      grafts.push(line);
    }
    if (grafts.length) {
      const provenance = `      // ── merged from ${m.retired} (dedup ${'jul2026'}); one record per person ──`;
      insertAt.set(cBlk.end, [provenance, ...grafts]);
    }
    console.log(`  → UNION  ${m.retired} (${SD[m.retired].length}) → ${m.canonical} (${SD[m.canonical].length}): ` +
      `+${grafts.length} sourced card(s)` + (dropDup ? `, ${dropDup} dup skipped` : '') + (dropUnsourced ? `, ${dropUnsourced} unsourced skipped` : '') +
      ` → ${SD[m.canonical].length + grafts.length} total.`);
  } else {
    const dropped = cardLines(lines, rBlk).map((i) => cardText(lines[i]));
    console.log(`  → DROP   ${m.retired} (${SD[m.retired].length} unsourced): removed; ${m.canonical} stays ${SD[m.canonical].length}. Alias added.`);
    console.log(`           retired facts (for later sourced re-add): ${dropped.map((t) => '“' + t.slice(0, 48) + '…”').join('; ')}`);
  }
  planned++;
}

// Rebuild the file in one pass: skip deleted ranges, graft union cards before the
// canonical block's `],`.
const del = (idx) => toDelete.some((b) => idx >= b.start && idx <= b.end);
if (planned) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (insertAt.has(i)) out.push(...insertAt.get(i));   // graft, then emit the `],`
    if (del(i)) continue;
    out.push(lines[i]);
  }
  const next = out.join('\n');

  // ── ACCT_ALIAS: add the new short-pid → canonical bridges in index.html ──────
  const aliasesToAdd = MERGES.filter((m) => !m.aliasExists).map((m) => ({ from: m.retired, to: m.canonical }));
  let html = fs.readFileSync(INDEX, 'utf8');
  const anchor = "      rosie_rivera_slco: 'rosie_rivera'\n    };";
  let htmlChanged = false;
  if (html.includes(anchor)) {
    const missing = aliasesToAdd.filter((a) => !new RegExp(`\\n\\s+${a.from}:\\s*'`).test(html));
    if (missing.length) {
      const block =
        "      rosie_rivera_slco: 'rosie_rivera',\n" +
        "      // July 2026 launch cleanup — collapse duplicate person records to one\n" +
        "      // curated key each (see scripts/cleanup-utah-duplicate-records-jul2026.mjs).\n" +
        missing.map((a) => `      ${a.from}: '${a.to}',`).join('\n') + '\n    };';
      html = html.replace(anchor, block);
      htmlChanged = true;
      console.log(`\n  → ACCT_ALIAS: adding ${missing.map((a) => `${a.from}→${a.to}`).join(', ')}`);
    } else console.log('\n  ✓ ACCT_ALIAS: all bridges already present.');
  } else {
    console.log('\n  ⚠ ACCT_ALIAS anchor not found in index.html — add these bridges by hand:');
    aliasesToAdd.forEach((a) => console.log(`      ${a.from}: '${a.to}',`));
  }

  if (APPLY) {
    fs.writeFileSync(STANCES, next);
    if (htmlChanged) fs.writeFileSync(INDEX, html);
    console.log(`\nApplied: merged ${planned} record(s) in politician-stances.js${htmlChanged ? ' + updated ACCT_ALIAS' : ''}.`);
    console.log('NEXT: run  node scripts/split-stances.mjs  to regenerate the shipped core/ext chunks.');
  } else {
    console.log(`\nWould merge ${planned} record(s) (${alreadyDone} already done). Re-run with --apply to write.`);
  }
} else {
  console.log(`\nNothing to merge (${alreadyDone} already done). No changes.`);
}
