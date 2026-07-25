#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Albrecht identity merge + duplicate-topic collapse (July 2026)
// ---------------------------------------------------------------------------
// Two stance-data repairs the identity harness has been reporting as notes,
// done in one pass because both edit the same source of truth
// (`politician-stances.js`, i.e. window.ISSUE_STANCE_DATA).
//
// 1. MERGE `calbrecht` → `carl_albrecht`  (one person, two ids)
//
//    Carl Albrecht (R, House District 70, Richfield/Sevier County) exists twice.
//    The two ids own DIFFERENT halves of him:
//
//      carl_albrecht   roster record (cmp-data.js), browse-directory profile,
//                      _UTAH_HOUSE_INFO d:70, KR_STATE_HOUSE_INCUMBENTS[70],
//                      Spotlight card — plus 3 UNSOURCED stance cards
//      calbrecht       6 bill-SOURCED stance cards, an ACCT_SPOTLIGHT evidence
//                      group, an ACCT_THEME blurb, a consistency.js mapping, and
//                      a dead Power-Map META row tagged 'STATE SENATE'
//
//    Canonical is `carl_albrecht`: it is the roster id, and STANCE_ALIASES'
//    standing advice is to keep the stance-card key equal to the roster id so no
//    alias is needed at all. `calbrecht` is the id with no roster record, so
//    making IT canonical would mean re-pointing the roster, the browse node and
//    both Utah maps at a key that names nobody in cmp-data.js — the opposite of
//    the repair. Every one of its cards is sourced, so this is a UNION, not a
//    drop: all 6 move across and nothing is lost.
//
//    The grafted cards are inserted at the TOP of the canonical block, not the
//    bottom. findStance(id, topic, issueKeys) falls back to the first card whose
//    issueKey is in the group, and the canonical block's own `enviro_energy` and
//    `rural_ag` cards are the unsourced ones — appending would leave an
//    issueKey-only lookup resolving the weaker card while the bill-sourced one
//    sat behind it.
//
// 2. COLLAPSE 10 duplicate topic strings (harness section 7's reported notes)
//
//    findStance() returns the FIRST topic match, so a block that repeats a topic
//    string makes the later card unreachable. Every one of these ten is the same
//    underlying action written twice by two different passes under two different
//    issueKeys — not two positions. The keeper is the card with the stronger,
//    more specific text (all pairs are sourced except one, where only the keeper
//    is). The dropped card's issueKey is recorded in
//    scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md, together with the handful of unique
//    details that went with it, so nothing disappears silently.
//
// Nothing here is authored: no card text is edited, no stance, score or source is
// invented. Cards move verbatim or are removed.
//
// Idempotent: re-running reports "already done" for every step and writes
// nothing. Dry run by default. After --apply, regenerate the shipped chunks:
//
//   node scripts/merge-albrecht-dedupe-topics-jul2026.mjs            # dry run
//   node scripts/merge-albrecht-dedupe-topics-jul2026.mjs --apply    # write
//   node scripts/split-stances.mjs                                   # regenerate
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const APPLY = process.argv.includes('--apply');

const MERGE = { retired: 'calbrecht', canonical: 'carl_albrecht' };

// pid → topic string repeated in that block, with the issueKey of the card to
// KEEP and the issueKey of the unreachable duplicate to DROP. Both keys are
// required so a mis-specified row can never delete the wrong card.
const COLLAPSE = [
  { pid: 'michael_guest',    topic: 'Taxes & Cost of Living',            keep: 'tax_middle_class', drop: 'lower_taxes' },
  { pid: 'mike_ezell',       topic: 'Taxes & Cost of Living',            keep: 'tax_middle_class', drop: 'lower_taxes' },
  { pid: 'lee',              topic: 'Tariffs & Trade Authority',         keep: 'tariffs_authority', drop: 'econ_trade' },
  { pid: 'candice_pierucci', topic: 'Maternal & Infant Health',          keep: 'healthcare',       drop: 'family_support' },
  { pid: 'ashlee_matthews',  topic: 'Pollinator Habitat',                keep: 'lands_preserve',   drop: 'enviro_balance' },
  { pid: 'doug_welton',      topic: 'Glass Recycling',                   keep: 'enviro_balance',   drop: 'enviro_energy' },
  { pid: 'hoang_nguyen',     topic: 'Emergency Medical Services',        keep: 'healthcare',       drop: 'health_rural' },
  { pid: 'leah_hansen',      topic: 'Limiting DEI Programs',             keep: 'end_dei',          drop: 'gov_balance' },
  { pid: 'mballard',         topic: 'Government Efficiency',             keep: 'gov_waste',        drop: 'reform_balance' },
  { pid: 'sam_barlow',       topic: 'Limited Government & Free Markets', keep: 'gov_waste',        drop: 'econ_growth' },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function loadStanceData(code) {
  const prev = globalThis.window;
  const window = (globalThis.window = {});
  try { (0, eval)(code); return window.ISSUE_STANCE_DATA; }
  finally { globalThis.window = prev; }
}
// Locate a top-level key's array as an inclusive [start,end] line-index range.
function findBlock(lines, key) {
  const startRe = new RegExp('^    ' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': \\[');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  for (let i = start + 1; i < lines.length; i++) if (lines[i] === '    ],') return { start, end: i };
  return null;
}
// Cards are not all one line — several carry `text:`/`detail:` on continuation
// lines — so spans are found by brace depth with string literals masked out.
const mask = (l) => l.replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
function cardSpans(lines, blk) {
  const spans = [];
  for (let i = blk.start + 1; i < blk.end; i++) {
    if (!/^      \{/.test(lines[i])) continue;
    let depth = 0, j = i;
    for (; j < blk.end; j++) {
      for (const ch of mask(lines[j])) { if (ch === '{') depth++; else if (ch === '}') depth--; }
      if (depth === 0) break;
    }
    spans.push({ start: i, end: j });
    i = j;
  }
  return spans;
}
const spanText = (lines, s) => lines.slice(s.start, s.end + 1).join('\n');
const field = (txt, name) => {
  const m = txt.match(new RegExp(name + ":\\s*'((?:\\\\.|[^'\\\\])*)'"));
  return m ? m[1] : null;
};
// stance text, normalized, for union de-duplication
const cardKey = (txt) => (field(txt, 'text') || txt).replace(/\s+/g, ' ').trim().toLowerCase();
const isSourced = (txt) => /source:\s*\{/.test(txt);
const unesc = (s) => (s || '').replace(/\\'/g, "'");

// ── main ─────────────────────────────────────────────────────────────────────
console.log(`PolitiDex — Albrecht merge + duplicate-topic collapse  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const raw = fs.readFileSync(STANCES, 'utf8');
const SD = loadStanceData(raw);
const lines = raw.split('\n');

const toDelete = [];            // [{start,end}] line ranges to remove
const insertAfter = new Map();  // lineIdx -> [line, ...] emitted after that line
let planned = 0, alreadyDone = 0;

// ── 1. Albrecht union merge ───────────────────────────────────────────────────
console.log('1. Albrecht identity merge');
{
  const rBlk = findBlock(lines, MERGE.retired);
  const cBlk = findBlock(lines, MERGE.canonical);
  if (!cBlk) {
    console.log(`   ✗ canonical '${MERGE.canonical}' block MISSING — refusing to drop data.`);
  } else if (!rBlk) {
    console.log(`   ✓ ${MERGE.retired} → ${MERGE.canonical}: already merged (retired key absent).`);
    alreadyDone++;
  } else {
    const cSpans = cardSpans(lines, cBlk);
    const existing = new Set(cSpans.map((s) => cardKey(spanText(lines, s))));
    const grafts = [];
    let dropUnsourced = 0, dropDup = 0;
    for (const s of cardSpans(lines, rBlk)) {
      const txt = spanText(lines, s);
      if (!isSourced(txt)) { dropUnsourced++; continue; }
      if (existing.has(cardKey(txt))) { dropDup++; continue; }
      grafts.push(...lines.slice(s.start, s.end + 1));
    }
    toDelete.push(rBlk);
    if (grafts.length) {
      insertAfter.set(cBlk.start, [
        `      // ── merged from '${MERGE.retired}' (July 2026): one record per person. These`,
        `      // are the bill-sourced cards; the three below them are the older unsourced`,
        `      // ones this record already carried. Sourced first so an issueKey-only`,
        `      // findStance() lookup resolves the sourced card, not the general one.`,
        ...grafts,
      ]);
    }
    const cCount = SD[MERGE.canonical].length, rCount = SD[MERGE.retired].length;
    console.log(`   → UNION  ${MERGE.retired} (${rCount}) → ${MERGE.canonical} (${cCount}): ` +
      `+${grafts.length} sourced card(s)` + (dropDup ? `, ${dropDup} dup skipped` : '') +
      (dropUnsourced ? `, ${dropUnsourced} unsourced skipped` : '') + ` → ${cCount + grafts.length} total.`);
    const cUnsourced = cSpans.filter((s) => !isSourced(spanText(lines, s))).length;
    if (cUnsourced) console.log(`   · note: canonical keeps ${cUnsourced} unsourced card(s) of its own (tracked).`);
    planned++;
  }
}

// ── 2. Duplicate-topic collapse ───────────────────────────────────────────────
console.log('\n2. Duplicate topic strings (findStance() reaches only the first)');
for (const c of COLLAPSE) {
  const blk = findBlock(lines, c.pid);
  if (!blk) { console.log(`   ⚠ ${c.pid}: block not found — skipped.`); continue; }
  const spans = cardSpans(lines, blk).map((s) => ({ ...s, txt: spanText(lines, s) }));
  const sameTopic = spans.filter((s) => unesc(field(s.txt, 'topic')) === c.topic);
  const keeper = sameTopic.filter((s) => field(s.txt, 'issueKey') === c.keep);
  const loser = sameTopic.filter((s) => field(s.txt, 'issueKey') === c.drop);

  if (sameTopic.length < 2 && keeper.length === 1 && !loser.length) {
    console.log(`   ✓ ${c.pid} · "${c.topic}": already collapsed.`);
    alreadyDone++;
    continue;
  }
  if (keeper.length !== 1 || loser.length !== 1) {
    console.log(`   ⚠ ${c.pid} · "${c.topic}": expected exactly one keep:${c.keep} and one ` +
      `drop:${c.drop}, found ${keeper.length}/${loser.length} — left alone, verify by hand.`);
    continue;
  }
  toDelete.push(loser[0]);
  console.log(`   → ${c.pid} · "${c.topic}": drop issueKey '${c.drop}', keep '${c.keep}' ` +
    `(${sameTopic.length} → 1 card on this topic; block ${SD[c.pid].length} → ${SD[c.pid].length - 1}).`);
  planned++;
}

if (!planned) {
  console.log(`\nNothing to do (${alreadyDone} step(s) already done). No changes.`);
  process.exit(0);
}

// ── rewrite ───────────────────────────────────────────────────────────────────
const del = (idx) => toDelete.some((b) => idx >= b.start && idx <= b.end);
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (del(i)) { if (insertAfter.has(i)) console.log('   ! insert point inside a deletion — aborting.'), process.exit(1); continue; }
  out.push(lines[i]);
  if (insertAfter.has(i)) out.push(...insertAfter.get(i));
}
const next = out.join('\n');

// ── verify before writing: the file still parses, the retired key is gone, the
// canonical block gained every sourced card, and no block repeats a topic. ─────
const SD2 = loadStanceData(next);
const problems = [];
if (SD2[MERGE.retired]) problems.push(`'${MERGE.retired}' still present after merge`);
const expected = SD[MERGE.canonical].length + SD[MERGE.retired].length;
if (SD2[MERGE.canonical] && SD2[MERGE.canonical].length !== expected)
  problems.push(`'${MERGE.canonical}' has ${SD2[MERGE.canonical].length} cards, expected ${expected}`);
for (const c of COLLAPSE) {
  const block = SD2[c.pid] || [];
  const hits = block.filter((s) => s && s.topic === c.topic);
  if (hits.length !== 1) problems.push(`${c.pid} has ${hits.length} cards on "${c.topic}", expected 1`);
  else if (hits[0].issueKey !== c.keep) problems.push(`${c.pid} kept issueKey '${hits[0].issueKey}', expected '${c.keep}'`);
}
for (const [pid, block] of Object.entries(SD2)) {
  if (!Array.isArray(block)) continue;
  const t = block.map((s) => s && s.topic).filter(Boolean);
  const d = [...new Set(t.filter((x, i) => t.indexOf(x) !== i))];
  if (d.length) problems.push(`${pid} still repeats topic ${JSON.stringify(d)}`);
}
// every card that existed before must still exist somewhere, except the ten dropped
const before = Object.values(SD).flatMap((b) => (Array.isArray(b) ? b : [])).length;
const after = Object.values(SD2).flatMap((b) => (Array.isArray(b) ? b : [])).length;
if (before - after !== COLLAPSE.length) problems.push(`card count fell by ${before - after}, expected ${COLLAPSE.length}`);

console.log(`\nverify: ${Object.keys(SD2).length} blocks, ${after} cards (was ${Object.keys(SD).length}/${before}).`);
if (problems.length) {
  console.error('✗ refusing to write:');
  for (const p of problems) console.error('   ✗ ' + p);
  process.exit(1);
}
console.log('✓ all post-conditions hold.');

if (APPLY) {
  fs.writeFileSync(STANCES, next);
  console.log(`\nApplied ${planned} change(s) to politician-stances.js (${alreadyDone} already done).`);
  console.log('NEXT: node scripts/split-stances.mjs   (regenerate the shipped core/ext chunks)');
} else {
  console.log(`\nWould apply ${planned} change(s) (${alreadyDone} already done). Re-run with --apply to write.`);
}
