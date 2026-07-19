#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Run 1 perf pass: externalize the largest inline <style> blocks
// out of index.html into cached stylesheets, IN PLACE (each <style>…</style> is
// replaced by a <link rel="stylesheet"> at the exact same position, so the CSS
// cascade order is preserved byte-for-byte and the page renders identically).
//
// Only blocks larger than THRESHOLD are moved (the two big ones); the many small
// scattered blocks are left inline to avoid extra requests and cascade risk.
//
//   node scripts/perf-run1-extract-css.mjs            # dry run (reports only)
//   node scripts/perf-run1-extract-css.mjs --apply    # write app-*.css + edit index.html
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const THRESHOLD = 50 * 1024; // only externalize style blocks bigger than 50 KB

let html = fs.readFileSync(INDEX, 'utf8');

if (html.includes('href="/app.css"')) {
  console.log('app.css link already present — CSS already externalized. Nothing to do.');
  process.exit(0);
}

// Blank out HTML comments (preserving length so indices still map 1:1 onto the
// original) BEFORE matching, so a literal "<style>" written inside a comment can
// never be mistaken for a real tag.
const commentless = html.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));

// Find every <style …>…</style> block (CSS can't legally contain "</style>", so
// a non-greedy match is exact). Match against the comment-blanked copy but slice
// the real content from `html` using the same indices.
const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
const blocks = [];
let m;
while ((m = re.exec(commentless)) !== null) {
  const full = html.slice(m.index, m.index + m[0].length);
  const inner = full.replace(/^<style\b[^>]*>/, '').replace(/<\/style>$/, '');
  blocks.push({ full, inner, index: m.index, size: full.length,
    line: html.slice(0, m.index).split('\n').length });
}
blocks.sort((a, b) => b.size - a.size);

const big = blocks.filter((b) => b.size >= THRESHOLD);
console.log(`Found ${blocks.length} <style> blocks; ${big.length} over ${Math.round(THRESHOLD/1024)} KB:`);
big.forEach((b, i) => console.log(`  #${i + 1}  ${(b.size/1024).toFixed(0)} KB  @ line ${b.line}`));
const smallBytes = blocks.filter((b) => b.size < THRESHOLD).reduce((s, b) => s + b.size, 0);
console.log(`  (leaving ${blocks.length - big.length} smaller blocks inline, ${(smallBytes/1024).toFixed(0)} KB total)`);

if (!big.length) { console.log('No large blocks to externalize.'); process.exit(0); }

// Assign stable filenames in DOCUMENT order (top block = app.css) so the primary
// sheet is app.css and can be preloaded.
const inDocOrder = [...big].sort((a, b) => a.index - b.index);
const files = inDocOrder.map((b, i) => ({ ...b, file: i === 0 ? 'app.css' : `app-${i + 1}.css` }));

if (!APPLY) {
  console.log('\nWould write:');
  files.forEach((f) => console.log(`  ${f.file}  (${(f.inner.length/1024).toFixed(0)} KB)  replacing block @ line ${f.line}`));
  console.log('\nDry run. Re-run with --apply.');
  process.exit(0);
}

// Replace each block with a same-position <link>. Do it via split/join on the
// exact full-block string (unique) so positions of untouched blocks are unaffected.
let out = html;
for (const f of files) {
  fs.writeFileSync(path.join(ROOT, f.file), f.inner);
  const link = `<link rel="stylesheet" href="/${f.file}">`;
  const before = out.length;
  out = out.replace(f.full, link);
  if (out.length === before - f.full.length + link.length) {
    console.log(`  ✎ ${f.file}: wrote ${(f.inner.length/1024).toFixed(0)} KB, replaced inline block with <link>`);
  } else {
    console.error(`  ✗ ${f.file}: replacement did not apply cleanly — aborting`); process.exit(1);
  }
}

// Preload the primary sheet early (right after the existing gstatic preconnect).
const preconnect = '<link rel="dns-prefetch" href="https://www.gstatic.com">';
if (out.includes(preconnect) && !out.includes('preload" as="style" href="/app.css"')) {
  out = out.replace(preconnect, preconnect + '\n<link rel="preload" as="style" href="/app.css">');
  console.log('  ✎ added <link rel="preload" as="style" href="/app.css"> in <head>');
}

fs.writeFileSync(INDEX, out);
console.log(`\nApplied. index.html: ${(html.length/1048576).toFixed(2)} MB → ${(out.length/1048576).toFixed(2)} MB`);
