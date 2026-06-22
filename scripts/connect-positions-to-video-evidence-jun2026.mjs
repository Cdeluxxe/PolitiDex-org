#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 connection pass: wire NEW video evidence to curated
// Issue Positions for sitting Utah State Legislators.
//
// CONTEXT
//   The two most recent passes added floor- and committee-video Spotlight items
//   to several sitting Utah legislators (the "zero-video" pass and committee
//   video wave 5). An audit of the live `politicians` collection found that a
//   handful of those new video items carry an `issueKey` for which the
//   legislator has NO curated stance in ISSUE_STANCE_DATA — so the recording is
//   real evidence, but it never lights up under "Stance at a Glance" (which only
//   renders a row for a documented position) and the per-row "All-Seeing Eye"
//   video link has nothing to attach to.
//
//   This pass closes that gap the honest way: for each "dangling" video issue,
//   it adds ONE curated Issue Position authored directly from the bill the
//   legislator personally chief-sponsored — the same official le.utah.gov record
//   the Spotlight video already cites. Nothing here is invented: every position
//   restates what the member's own bill does, with the bill record as the
//   source and the bill's real fate stated plainly.
//
//   SCOPE (chosen by audit — only dangling keys backed by a sponsored bill whose
//   subject is an unambiguous fit for the issue; one-off procedural items and
//   bills whose stance could not be characterized honestly were left alone):
//     • nate_blouin   → gov_services  (SB244 2025, separate rate on income >$1M)
//     • nate_blouin   → housing_build (SB152 2025, no-garage-mandate land use)
//     • tiara_auxier  → justice_reform(HB297 2025, expungement modernization — law)
//     • verona_mauga  → transit       (HB290 2025, bicycle-lane safety — law)
//     • kathleen_riebe→ edu_balance   (SB56 2026, 10th-grade legal-awareness ed.)
//
//   The companion Firestore pass (connect-evidence-consistency-jun2026.mjs) fixes
//   the three Spotlight issueKey MISMATCHES that connect to positions the member
//   already holds, and backfills missing promise/Spotlight issueKeys.
//
//   node scripts/connect-positions-to-video-evidence-jun2026.mjs          # dry run
//   node scripts/connect-positions-to-video-evidence-jun2026.mjs --apply  # patch index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const FILE = 'index.html';
const le = (n, label) => ({ label: label || 'le.utah.gov', url: `https://le.utah.gov/~${n}` });

// stanceKey (the ISSUE_STANCE_DATA key the site resolves the member to) → the
// position(s) to ADD. Each is authored from the member's own sponsored bill.
const DATA = {
  // ── Sen. Nate Blouin (Senate Dist. 13) ───────────────────────────────────
  nate_blouin: [
    { topic:'Taxes on Top Earners', icon:'🏛', pos:'support', issueKey:'gov_services', issueStance:'support',
      text:'Chief-sponsored a separate, higher income-tax rate on individual, estate, and trust income above $1 million, raising revenue from the highest earners.',
      evidence:'Sponsored S.B. 244 (2025); heard in the Senate Revenue and Taxation Committee but did not receive final passage.',
      source:le('2025/bills/static/SB0244.html') },
    { topic:'Fewer Local Building Mandates', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Chief-sponsored a measure barring a designated housing-restricted community from requiring a garage on a one- or two-family home, removing a cost barrier to building.',
      evidence:'Sponsored S.B. 152 (2025).',
      source:le('2025/bills/static/SB0152.html') },
  ],
  // ── Rep. Tiara Auxier (House Dist. 53) ────────────────────────────────────
  tiara_auxier: [
    { topic:'Criminal-Record Expungement', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support',
      text:'Chief-sponsored a measure modernizing how expungement orders are processed and revising which offenses qualify for automatic expungement.',
      evidence:'Sponsored H.B. 297 (2025), signed into law.',
      source:le('2025/bills/static/HB0297.html') },
  ],
  // ── Rep. Verona Mauga (House Dist. 30) ────────────────────────────────────
  verona_mauga: [
    { topic:'Bicycle-Lane Safety', icon:'🚲', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Chief-sponsored a measure clarifying when motor vehicles may enter a bicycle lane and restricting obstruction of bike lanes.',
      evidence:'Sponsored H.B. 290 (2025), signed into law.',
      source:le('2025/bills/static/HB0290.html') },
  ],
  // ── Sen. Kathleen Riebe (Senate Dist. 15) ────────────────────────────────
  kathleen_riebe: [
    { topic:'Civics & Legal-Awareness Education', icon:'📚', pos:'support', issueKey:'edu_balance', issueStance:'support',
      text:'Chief-sponsored a measure requiring schools to provide legal-awareness information to 10th-grade students while allowing flexibility in how it is delivered.',
      evidence:'Sponsored S.B. 56 (2026).',
      source:le('2026/bills/static/SB0056.html') },
  ],
};

// ── index.html literal emitter ───────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmt(c) {
  const parts = [
    `topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`,
  ];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

// Find the ISSUE_STANCE_DATA object bounds so key matching stays scoped to it.
function stanceBounds(src) {
  const marker = 'var ISSUE_STANCE_DATA = {';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('ISSUE_STANCE_DATA not found');
  let i = start + marker.length - 1, depth = 0, inStr = false, q = '', escd = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return [start, i]; }
  }
  throw new Error('ISSUE_STANCE_DATA end not found');
}

// Locate `<key>: [` at 4-space indent and return the index of its closing `]`.
function arrayClose(src, lo, hi, key) {
  const needle = `\n    ${key}: [`;
  const at = src.indexOf(needle, lo);
  if (at < 0 || at > hi) return -1;
  let i = at + needle.length - 1, depth = 0, inStr = false, q = '', escd = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Idempotence guard: does the array already carry a position with this issueKey?
function arrayHasKey(src, lo, hi, key, issueKey) {
  const close = arrayClose(src, lo, hi, key);
  if (close < 0) return false;
  const open = src.indexOf(`\n    ${key}: [`, lo);
  return src.slice(open, close).includes(`issueKey:'${issueKey}'`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
let profiles = 0, positions = 0;
for (const cards of Object.values(DATA)) { profiles++; positions += cards.length; }
console.log(`Authored ${positions} positions across ${profiles} legislators (all bill-backed, all with a source link).`);

let html = readFileSync(FILE, 'utf8');
const [lo, hi] = stanceBounds(html);

// Drop any position whose key already exists in the target array (idempotent).
const targets = Object.entries(DATA)
  .map(([key, cards]) => ({
    key, close: arrayClose(html, lo, hi, key),
    cards: cards.filter(c => !arrayHasKey(html, lo, hi, key, c.issueKey)),
  }))
  .filter(t => t.cards.length)
  .sort((a, b) => b.close - a.close); // insert bottom-up so offsets stay valid

if (!targets.length) { console.log('Nothing to add — every position already present.'); process.exit(0); }
targets.forEach(t => console.log(`  ${t.close < 0 ? '✗ (array not found)' : '✎'} ${t.key}: +${t.cards.length}`));

if (APPLY) {
  let addedPos = 0, applied = 0;
  for (const t of targets) {
    if (t.close < 0) continue;
    let lineStart = t.close;
    while (lineStart > 0 && html[lineStart - 1] !== '\n') lineStart--;
    const block = t.cards.map(fmt).join('\n') + '\n';
    html = html.slice(0, lineStart) + block + html.slice(lineStart);
    applied++; addedPos += t.cards.length;
  }
  writeFileSync(FILE, html);
  console.log(`\nApplied ${addedPos} positions to ${applied} legislators in ${FILE}.`);
} else {
  console.log('\nDry run. Re-run with --apply to patch index.html.');
}
