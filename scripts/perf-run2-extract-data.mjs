#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Run 2 perf pass: extract the large inline DATA object literals out
// of index.html into deferred external modules (same idea as the stance split).
//
// For each global we replace the inline literal with a tiny synchronous STUB that
// guarantees the global exists (empty) at parse time — so any parse-time code that
// merely CAPTURES the object reference (e.g. `window.PDX_ISSUE_SPOTLIGHTS =
// SPOTLIGHTS`) keeps a live reference — and move the real data into a deferred
// external file that MERGES it in with Object.assign into that same object. Because
// deferred scripts run after parsing but before DOMContentLoaded, and every real
// consumer of this data runs on the DOMContentLoaded/gate/on-open paths (verified:
// no parse-time reads), behavior is identical — the data just no longer lives in,
// or is parsed with, the 6.4 MB document.
//
//   node scripts/perf-run2-extract-data.mjs            # dry run (reports only)
//   node scripts/perf-run2-extract-data.mjs --apply    # write *-data.js + edit index.html
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

// String/comment/template-aware matcher: given the index of a '{', return the index
// of its matching '}'.
function matchBrace(str, open) {
  let d = 0, i = open, q = null, esc = false, lc = false, bc = false;
  for (; i < str.length; i++) {
    const c = str[i], n = str[i + 1];
    if (lc) { if (c === '\n') lc = false; continue; }
    if (bc) { if (c === '*' && n === '/') { bc = false; i++; } continue; }
    if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '/' && n === '/') { lc = true; i++; continue; }
    if (c === '/' && n === '*') { bc = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return i; }
  }
  return -1;
}

// target: { global, file, prefixRe (matches everything up to and incl. the char
//   before the literal '{'), stub (inline replacement for prefix+literal) }
const TARGETS = [
  { global: 'CMP_DATA', file: 'cmp-data.js',
    prefixRe: /\bconst\s+CMP_DATA\s*=\s*/,
    stub: 'var CMP_DATA = window.CMP_DATA || {}; window.CMP_DATA = CMP_DATA;' },
  { global: 'SPOTLIGHTS', file: 'spotlights-data.js',
    prefixRe: /\bvar\s+SPOTLIGHTS\s*=\s*/,
    stub: 'var SPOTLIGHTS = window.SPOTLIGHTS || {}; window.SPOTLIGHTS = SPOTLIGHTS;' },
  { global: 'ACCT_SPOTLIGHT', file: 'acct-spotlight-data.js',
    prefixRe: /window\.ACCT_SPOTLIGHT\s*=\s*window\.ACCT_SPOTLIGHT\s*\|\|\s*/,
    stub: 'window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {};' },
  { global: 'SPOTLIGHT_DATA', file: 'spotlight-cards-data.js',
    prefixRe: /window\.SPOTLIGHT_DATA\s*=\s*window\.SPOTLIGHT_DATA\s*\|\|\s*/,
    stub: 'window.SPOTLIGHT_DATA = window.SPOTLIGHT_DATA || {};' },
];

let html = fs.readFileSync(INDEX, 'utf8');
if (fs.existsSync(path.join(ROOT, 'cmp-data.js'))) { console.log('cmp-data.js already exists — data appears already extracted. Aborting.'); process.exit(0); }
const lineAt = (i) => html.slice(0, i).split('\n').length;

const plans = [];
for (const t of TARGETS) {
  const m = t.prefixRe.exec(html);
  if (!m) { console.error(`✗ ${t.global}: declaration not found`); process.exit(1); }
  const braceOpen = html.indexOf('{', m.index + m[0].length - 1);
  if (braceOpen < 0 || html.slice(m.index + m[0].length, braceOpen + 1).trim() !== '{') {
    // ensure the '{' is immediately after the prefix (allowing only whitespace)
  }
  const close = matchBrace(html, braceOpen);
  if (close < 0) { console.error(`✗ ${t.global}: no matching brace`); process.exit(1); }
  const literal = html.slice(braceOpen, close + 1);
  const fullDecl = html.slice(m.index, close + 1);
  if (!literal.startsWith('{') || !literal.endsWith('}')) { console.error(`✗ ${t.global}: literal not brace-delimited`); process.exit(1); }
  if (html.indexOf(fullDecl) !== html.lastIndexOf(fullDecl)) { console.error(`✗ ${t.global}: fullDecl not unique`); process.exit(1); }
  plans.push({ ...t, m, braceOpen, close, literal, fullDecl,
    startLine: lineAt(m.index), endLine: lineAt(close), kb: literal.length / 1024 });
}

console.log('Extraction plan:');
for (const p of plans) console.log(`  ${p.global.padEnd(15)} lines ${p.startLine}-${p.endLine}  ${p.kb.toFixed(0)} KB  → ${p.file}`);
const totalKb = plans.reduce((s, p) => s + p.kb, 0);
console.log(`  TOTAL: ${totalKb.toFixed(0)} KB (${(totalKb/1024).toFixed(2)} MB) of inline data`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

// Write the deferred data modules, then replace the inline literals with stubs.
let out = html;
for (const p of plans) {
  const content =
`// PolitiDex data module (Run 2 perf): ${p.global} was extracted out of index.html
// so it no longer bloats the document parse. Loaded with <script defer>, it merges
// into the same window global the inline stub creates, before DOMContentLoaded.
Object.assign((window.${p.global} = window.${p.global} || {}),
${p.literal}
);
`;
  fs.writeFileSync(path.join(ROOT, p.file), content);
  const before = out.length;
  out = out.replace(p.fullDecl, p.stub);
  if (out.length !== before - p.fullDecl.length + p.stub.length) { console.error(`✗ ${p.global}: replace failed`); process.exit(1); }
  console.log(`  ✎ ${p.file}: wrote ${(fs.statSync(path.join(ROOT, p.file)).size/1024).toFixed(0)} KB; replaced inline literal with ${p.stub.length}-char stub`);
}

// Inject the four deferred <script> tags right after the app.css preload in <head>
const anchor = '<link rel="preload" as="style" href="/app.css">';
const tags = '\n' + plans.map((p) => `<script defer src="/${p.file}"></script>`).join('\n') +
  '\n<!-- ^ Run 2 perf: large curated data (roster, Spotlights, accountability) extracted from index.html; deferred + cached. -->';
if (!out.includes(anchor)) { console.error('✗ preload anchor not found for script injection'); process.exit(1); }
out = out.replace(anchor, anchor + tags);
console.log('  ✎ added 4 <script defer> data tags in <head>');

fs.writeFileSync(INDEX, out);
console.log(`\nApplied. index.html: ${(html.length/1048576).toFixed(2)} MB → ${(out.length/1048576).toFixed(2)} MB`);
