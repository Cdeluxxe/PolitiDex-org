#!/usr/bin/env node
/**
 * Harness fidelity fix — July 2026
 * ─────────────────────────────────────────────────────────────────────────────
 * scripts/test-identity-integrity.mjs loads `politician-stances.js` and its own
 * comment says that is "how the page loads them". That stopped being true when
 * the 1.7MB monolith was split: index.html loads politician-stances-core.js,
 * politician-stances-ext.js and the 16 state-senate-stances*.js shards, and does
 * NOT load the monolith at all. So the harness has been asserting against a
 * stale 882-key table while the browser resolves against a live 1058-key one.
 *
 * Every section that reads STANCES inherits that blind spot, and it is why the
 * 18 slug-recoverable dead stance keys stayed green: the keys the surfaces
 * actually hand to openModal() were never in the table under test.
 *
 * This makes the harness read the same files the page reads, in the page's own
 * order, derived FROM index.html's script tags so the two can no longer drift.
 *
 * Idempotent, dry-run by default. `--apply` to write.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APPLY = process.argv.includes('--apply');
const rel = 'scripts/test-identity-integrity.mjs';
const abs = path.join(ROOT, rel);
let src = fs.readFileSync(abs, 'utf8');

const FROM = `  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  const sandbox = vm.createContext(ctx);
  vm.runInContext(read("politician-stances.js"), sandbox,
    { filename: "politician-stances.js" });
  vm.runInContext(read("stance-helpers.js"), sandbox,
    { filename: "stance-helpers.js" });
  return ctx.window;
}`;

const TO = `  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.navigator = { userAgent: "node" };
  ctx.location = { href: "", search: "", hash: "" };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  const sandbox = vm.createContext(ctx);
  // Load the stance shards the PAGE loads, in the page's own order, derived from
  // its <script> tags. politician-stances.js is the pre-split 1.7MB monolith and
  // index.html no longer references it, so loading that instead left this file
  // asserting against a stale 882-key table while the browser resolved against a
  // live 1058-key one — which is how 18 dead stance keys stayed green. Deriving
  // the list here means the harness and the page cannot drift again.
  // my-stances.js is excluded on purpose: it holds the VISITOR's own saved
  // positions, not curated politician stances.
  const stanceFiles = [];
  const tagRe = /<script[^>]*\\bsrc="([^"]*stances[^"]*\\.js)"/g;
  let tag;
  const indexSrc = read("index.html");
  while ((tag = tagRe.exec(indexSrc))) {
    const f = tag[1].replace(/^\//, "");   // srcs are root-absolute in the document
    if (f === "my-stances.js" || stanceFiles.includes(f)) continue;
    try { readFileSync(join(ROOT, f)); } catch (e) { continue; }  // not shipped
    stanceFiles.push(f);
  }
  if (!stanceFiles.length) throw new Error("no stance shards found in index.html script tags");
  for (const f of stanceFiles) vm.runInContext(read(f), sandbox, { filename: f });
  vm.runInContext(read("stance-helpers.js"), sandbox,
    { filename: "stance-helpers.js" });
  ctx.__stanceFiles = stanceFiles;
  return ctx.window;
}`;

const already = src.includes('ctx.__stanceFiles = stanceFiles;');
if (!already) {
  const n = src.split(FROM).length - 1;
  if (n !== 1) throw new Error(`anchor matched ${n}× (need exactly 1)`);
  src = src.replace(FROM, TO);
}

// The fallback must stop naming the monolith too, or a load failure would
// silently reinstate the stale table.
const F2 = `const STANCES = win.ISSUE_STANCE_DATA || loadGlobal("politician-stances.js", "ISSUE_STANCE_DATA");`;
const T2 = `const STANCES = win.ISSUE_STANCE_DATA;`;
const already2 = src.includes(T2);
if (!already2) {
  const n = src.split(F2).length - 1;
  if (n !== 1) throw new Error(`STANCES anchor matched ${n}× (need exactly 1)`);
  src = src.replace(F2, T2);
}

// Report the shard count so a future split/rename is visible in the output.
const F3 = `console.log(\`  \${RETIRED.size} retired id(s)`;
const T3 = `console.log(\`  stance table read from \${(win.__stanceFiles || []).length} shard(s) the page loads\`);
console.log(\`  \${RETIRED.size} retired id(s)`;
const already3 = src.includes('stance table read from');
if (!already3) {
  const n = src.split(F3).length - 1;
  if (n !== 1) throw new Error(`report anchor matched ${n}× (need exactly 1)`);
  src = src.replace(F3, T3);
}

// Post-conditions, proved before writing.
const problems = [];
if (/read\("politician-stances\.js"\)/.test(src)) problems.push('still loads the unused monolith');
if (!src.includes('ctx.__stanceFiles = stanceFiles;')) problems.push('shard loader not installed');
if (!src.includes('const STANCES = win.ISSUE_STANCE_DATA;')) problems.push('STANCES fallback still names the monolith');
if (!src.includes('...Object.keys(STANCES || {}),')) problems.push('section 11 vocabulary lost its stance keys');
if (!src.includes('stance table read from')) problems.push('shard count not reported');

console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — harness-stance-fidelity-jul2026`);
console.log(`  ${already ? '·' : '✎'} shard loader derived from index.html script tags${already ? ' (already applied)' : ''}`);
console.log(`  ${already2 ? '·' : '✎'} STANCES fallback no longer names the monolith${already2 ? ' (already applied)' : ''}`);
console.log(`  ${already3 ? '·' : '✎'} shard count added to the report line${already3 ? ' (already applied)' : ''}`);

if (problems.length) {
  console.error('\n✗ post-conditions failed — nothing written:');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log('✓ post-conditions pass');
if (APPLY) { fs.writeFileSync(abs, src); console.log('✓ written'); }
else console.log('(dry run — pass --apply to write)');
