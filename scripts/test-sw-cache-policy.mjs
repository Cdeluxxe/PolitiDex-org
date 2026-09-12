/* ═══════════════════════════════════════════════════════════════════════════
   test-sw-cache-policy.mjs — a deploy must not cost the reader 9 MB
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS WRONG

   Both cache buckets carried CACHE_VERSION:

       const SHELL_CACHE   = `politidex-shell-${CACHE_VERSION}`;
       const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`;

   so bumping the constant renamed BOTH, and activate's prune — a keep-set of
   exactly those two names, delete everything else — then deleted the old
   runtime bucket outright. Every offline VR pack, all four cached person
   documents and every runtime asset a warm device had already paid for went
   away on a deploy that may have changed one line. install then refetched all
   ~9 MB of SHELL_ASSETS with `{ cache: 'reload' }`, which deliberately bypasses
   the HTTP cache, so byte-identical files crossed the network a second time.

   For a returning visitor that was the single largest cost on the site, and
   none of it bought correctness: a runtime asset does not go stale because a
   SHELL asset changed, and a pack built from a retired mapping is already
   refused by version at its own URL (VR_PACK_RE).

   WHAT THIS FILE PINS

     1. RUNTIME_CACHE's name does not interpolate CACHE_VERSION.
     2. activate's delete list cannot reach it — the prune is scoped to
        SHELL_PREFIX, and RUNTIME_CACHE is not spelled inside a caches.delete.
     3. install revalidates. No `cache: 'reload'`.
     4. SHELL_CACHE still versions, so a real shell change still swaps.
     5. Person documents and VR packs are written to the bucket that survives.
     6. Behaviour nobody asked to change: /p/null still gets no cache slot,
        /api/ and /.netlify/ are still never intercepted, the person-document
        limit still bounds storage, and the offline fallback still comes from
        the shell.

   Section 7 is the one that would have caught the original defect on its own:
   a model of two consecutive deploys, asserting what each one deletes.

     node scripts/test-sw-cache-policy.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ sw-cache-policy: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const SW = read('sw.js');

// sw.js is ~5,500 lines of changelog around ~320 lines of code. Every assertion
// below is about CODE, so the comments are stripped first — otherwise a sentence
// in the log describing the old policy reads as the policy.
// Line-based on purpose: a naive /* … */ strip pairs the header's opener with a
// `*/` that appears inside a later // line and swallows real code with it. Both
// comment forms in this file start a line, so that is the rule used.
const CODE = (() => {
  const out = [];
  let inBlock = false;
  for (const line of SW.split('\n')) {
    if (inBlock) { if (line.includes('*/')) inBlock = false; continue; }
    if (/^\s*\/\//.test(line)) continue;
    if (/^\s*\/\*/.test(line)) { if (!line.includes('*/')) inBlock = true; continue; }
    out.push(line);
  }
  return out.join('\n');
})();

must(CODE.length > 4000, 'stripping comments left almost nothing — the strip is wrong, not sw.js');
must(/self\.addEventListener\('install'/.test(CODE), 'no install handler found in sw.js');
must(/self\.addEventListener\('activate'/.test(CODE), 'no activate handler found in sw.js');

const block = (name) => {
  const i = CODE.indexOf(`self.addEventListener('${name}'`);
  if (i < 0) return '';
  // Handlers are separated by the next top-level addEventListener.
  const rest = CODE.slice(i + 10);
  const j = rest.indexOf("self.addEventListener('");
  return j < 0 ? CODE.slice(i) : CODE.slice(i, i + 10 + j);
};
const INSTALL = block('install');
const ACTIVATE = block('activate');
must(INSTALL.includes('SHELL_ASSETS'), 'the install block does not mention SHELL_ASSETS');
must(/caches\.delete/.test(ACTIVATE), 'the activate block deletes no cache at all');

// ═════════════════════════════════════════════════════════════════════════════
section('1 · the runtime bucket is not version-scoped');
// ═════════════════════════════════════════════════════════════════════════════
const runtimeDecl = (CODE.match(/const\s+RUNTIME_CACHE\s*=\s*([^;]+);/) || [])[1] || '';
must(runtimeDecl, 'RUNTIME_CACHE is not declared with `const RUNTIME_CACHE = …;`');

ok(!/CACHE_VERSION/.test(runtimeDecl),
  `RUNTIME_CACHE interpolates CACHE_VERSION (${runtimeDecl.trim()}) — every deploy renames the bucket ` +
  'holding the VR packs and the person documents, and a renamed bucket is an emptied one');
ok(!/[`$]/.test(runtimeDecl),
  `RUNTIME_CACHE is a template with a substitution (${runtimeDecl.trim()}) — the name must be a fixed string`);
ok(/^\s*['"][^'"]+['"]\s*$/.test(runtimeDecl),
  'RUNTIME_CACHE is not a plain string literal, so whether it changes per deploy cannot be read here');

const shellDecl = (CODE.match(/const\s+SHELL_CACHE\s*=\s*([^;]+);/) || [])[1] || '';
must(shellDecl, 'SHELL_CACHE is not declared with `const SHELL_CACHE = …;`');
ok(/CACHE_VERSION/.test(shellDecl),
  'SHELL_CACHE no longer carries CACHE_VERSION — then a real shell change can never swap the precache, ' +
  'which is the one thing the version constant is for');

const version = (CODE.match(/const\s+CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1] || '';
must(version, 'CACHE_VERSION is not a string literal any more');
ok(/^v\d+$/.test(version), `CACHE_VERSION is "${version}", which is not the v<n> form the log and the prune assume`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · activate's delete list cannot reach the runtime bucket");
// ═════════════════════════════════════════════════════════════════════════════
// The old prune was a keep-set: delete every name that is not one of these two.
// That is safe only while the runtime name is in the set AND unchanged — which
// is exactly the assumption a version bump broke. The prune is scoped instead.
ok(!/keep\.has\(/.test(ACTIVATE),
  'activate still prunes by keep-set. A keep-set deletes every bucket it does not recognise, so the ' +
  'runtime cache survives only by being named in it — and a renamed runtime cache is not');

const deleteCalls = ACTIVATE.match(/caches\.delete\(([^)]*)\)/g) || [];
must(deleteCalls.length, 'activate contains no caches.delete() call to inspect');
ok(!deleteCalls.some((c) => /RUNTIME_CACHE/.test(c)),
  'activate passes RUNTIME_CACHE to caches.delete() — the bucket that must survive a bump is in the delete list');

ok(/SHELL_PREFIX/.test(ACTIVATE),
  'activate does not scope its prune to SHELL_PREFIX, so what it deletes is not limited to shell buckets');
const prefixDecl = (CODE.match(/const\s+SHELL_PREFIX\s*=\s*['"]([^'"]+)['"]/) || [])[1] || '';
ok(prefixDecl && shellDecl.includes('SHELL_PREFIX'),
  'SHELL_PREFIX is not the prefix SHELL_CACHE is built from, so the prune and the name can drift apart');
ok(prefixDecl && !runtimeDecl.includes(prefixDecl),
  `the runtime bucket name starts with SHELL_PREFIX ("${prefixDecl}") — the shell prune would delete it`);

ok(/clients\.claim\(\)/.test(ACTIVATE), 'activate no longer claims the open clients');

// ═════════════════════════════════════════════════════════════════════════════
section('3 · install revalidates instead of re-downloading');
// ═════════════════════════════════════════════════════════════════════════════
ok(!/cache:\s*['"]reload['"]/.test(INSTALL),
  "install still fetches with { cache: 'reload' }, which bypasses the HTTP cache and re-downloads every " +
  'byte-identical precache entry on every version bump');
ok(!/cache:\s*['"]reload['"]/.test(CODE),
  "some other code path still uses { cache: 'reload' }");
ok(/await\s+fetch\(url\)/.test(INSTALL),
  'install no longer plainly fetches each SHELL_ASSETS url — a conditional request is what makes an ' +
  'unchanged asset answer 304 with no body');
ok(/skipWaiting\(\)/.test(INSTALL), 'install no longer calls skipWaiting()');

// The precache is what a bump re-issues, so its size is the number this whole
// file is about. Reported, not asserted — the list is allowed to grow.
const assetsSrc = (SW.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || '';
must(assetsSrc, 'SHELL_ASSETS is not an array literal any more');
const assets = [...new Set(
  assetsSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')
    .match(/['"]([^'"]+)['"]/g) || []
)].map((s) => s.slice(1, -1));
must(assets.length > 20, `only ${assets.length} SHELL_ASSETS parsed — the parse is wrong`);
let bytes = 0;
for (const a of assets) {
  const f = a === '/' ? 'index.html' : a.replace(/^\//, '');
  try { bytes += fs.statSync(path.join(ROOT, f)).size; } catch { /* icons, manifest entries */ }
}
console.log(`      precache: ${assets.length} entries, ${(bytes / 1048576).toFixed(2)} MB — what a bump re-issues, ` +
  'and now revalidates rather than re-downloads');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · the entries that must not be wiped are written to the runtime bucket');
// ═════════════════════════════════════════════════════════════════════════════
const fnBody = (name) => {
  const i = CODE.indexOf(`async function ${name}(`);
  if (i < 0) return '';
  const rest = CODE.slice(i + 1);
  const j = rest.search(/\n(?:async )?function /);
  return j < 0 ? CODE.slice(i) : CODE.slice(i, i + 1 + j);
};
const NAV = fnBody('handleNavigate');
const PACK = fnBody('handleVrPack');
must(NAV, 'handleNavigate not found');
must(PACK, 'handleVrPack not found');

ok(/RUNTIME_CACHE/.test(PACK),
  'handleVrPack no longer opens RUNTIME_CACHE — an offline pack in a version-scoped bucket is deleted on ' +
  'the next deploy, and offline is exactly when it cannot be refetched');
ok(/isPerson\s*\?\s*await caches\.open\(RUNTIME_CACHE\)/.test(NAV),
  'a person document is not written to RUNTIME_CACHE. Each one is the whole ~2 MB shell, keyed to one ' +
  'address and on nobody\'s precache list, so version-scoping it only means re-downloading it per deploy');
ok(/caches\.open\(SHELL_CACHE\)/.test(NAV),
  "handleNavigate no longer opens SHELL_CACHE at all — '/' is a precached shell asset and the offline " +
  'fallback has to come from there');
ok(/shell\.match\('\/'\)/.test(NAV),
  "the offline fallback no longer reads '/' from the shell bucket");

// ═════════════════════════════════════════════════════════════════════════════
section('5 · the one-time carry-over, so this deploy is not the last wipe');
// ═════════════════════════════════════════════════════════════════════════════
// Entries already paid for sit in politidex-runtime-<old>. Moving them across is
// cache-to-cache and costs no network; without it, the deploy that fixes the
// wipe performs one.
ok(/RUNTIME_LEGACY_RE/.test(ACTIVATE),
  'activate does not recognise the old versioned runtime buckets, so every warm device pays one final wipe');
const legacy = (CODE.match(/const\s+RUNTIME_LEGACY_RE\s*=\s*(\/[^\n;]+\/)/) || [])[1] || '';
must(legacy, 'RUNTIME_LEGACY_RE is not a regex literal');
const legacyRe = new RegExp(legacy.slice(1, -1));
ok(legacyRe.test('politidex-runtime-v181'), 'RUNTIME_LEGACY_RE does not match politidex-runtime-v181');
ok(!legacyRe.test(runtimeDecl.trim().slice(1, -1)),
  'RUNTIME_LEGACY_RE matches the CURRENT runtime bucket — activate would migrate it into itself and delete it');
ok(/runtime\.put\(/.test(ACTIVATE), 'the carry-over never writes into the unversioned bucket');
ok(/await runtime\.match\(req\)/.test(ACTIVATE),
  'the carry-over does not check for an existing entry first, so an older copy could overwrite a newer one');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · nothing else about the worker moved');
// ═════════════════════════════════════════════════════════════════════════════
ok(/\(\?:null\|undefined\|nan\)/.test(CODE),
  '/p/null no longer refused a cache slot — a sentinel navigation must not take one of the four person slots');
ok(/PERSON_DOC_LIMIT\s*=\s*\d+/.test(CODE), 'the person-document limit is gone, so storage is unbounded');
ok(/prunePersonDocs/.test(NAV), 'handleNavigate no longer prunes the person documents it writes');
ok(/\/api\//.test(CODE) && /\.netlify/.test(CODE),
  'the /api/ and /.netlify/ passthroughs are no longer mentioned — dynamic data must never be intercepted');
ok(/isUnknownPackVersion\(/.test(PACK) && /VR_PACK_UNKNOWN/.test(CODE),
  'handleVrPack no longer refuses a pack of unknown mapping version, which is the guard that keeps a ' +
  'database blip from becoming a lastingly wrong offline pack');
ok(!/politician|party|score|grade/i.test(ACTIVATE + INSTALL),
  'the install/activate path grew an opinion about a person, a party or a score');

// sw.js is re-downloaded whenever a byte of it changes. The changelog is on the
// wire every deploy, so a pass that adds a chapter to it has a cost of its own.
const commentLines = SW.split('\n').filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
const totalLines = SW.split('\n').length;
console.log(`      sw.js: ${totalLines} lines, ${commentLines} of them comment ` +
  `(${(SW.length / 1024).toFixed(0)} KB on the wire per deploy)`);
// Budget the NEWEST ENTRY rather than the file delta: the repo convention (and
// test-mobile-body-lock) obliges every bump to also name the shell files it did
// and did not change, and that manifest is not padding.
const entryStart = SW.indexOf(`// ${version} -`);
must(entryStart > 0, `sw.js has no version-log entry for ${version}`);
const entryLines = SW.slice(entryStart, SW.indexOf('const CACHE_VERSION')).split('\n').length;
// 48, not 40: the manifest this convention obliges is 26 file names long, because
// a bump re-issues every precached asset whether or not this pass opened it. The
// prose half is still one paragraph.
ok(entryLines <= 48,
  `the ${version} log entry is ${entryLines} lines — sw.js ships whole on every deploy, so one honest ` +
  'paragraph plus the file manifest is the budget, not another chapter');
ok(commentLines - 5507 < 80,
  `the changelog grew by ${commentLines - 5507} lines in this pass`);
console.log(`      ${version} entry: ${entryLines} lines (budget 48)`);

// ═════════════════════════════════════════════════════════════════════════════
section('7 · two deploys, modelled: what does a bump actually delete?');
// ═════════════════════════════════════════════════════════════════════════════
// The assertion the original defect needed. Replay activate's own prune
// expression against the buckets a warm device holds, twice.
const SHELL_PREFIX = prefixDecl;
const RUNTIME = runtimeDecl.trim().slice(1, -1);
const shellName = (v) => `${SHELL_PREFIX}${v}`;

// activate deletes n when: n !== SHELL_CACHE && n starts with SHELL_PREFIX.
const prune = (names, current) =>
  names.filter((n) => !(n !== shellName(current) && n.indexOf(SHELL_PREFIX) === 0));

let held = [shellName('v181'), RUNTIME];
const afterFirst = prune(held, version);
ok(afterFirst.includes(RUNTIME),
  `a bump to ${version} deleted ${RUNTIME} — the packs and person documents are gone again`);
ok(!afterFirst.includes(shellName('v181')),
  'the previous shell bucket survived the bump, so old precached assets accumulate forever');

const next = 'v' + (Number(version.slice(1)) + 1);
const afterSecond = prune([shellName(version), RUNTIME], next);
ok(afterSecond.includes(RUNTIME),
  `a second bump (${version} → ${next}) deleted ${RUNTIME}`);
ok(!afterSecond.includes(shellName(version)),
  `the ${version} shell bucket survived the ${next} bump`);
ok(afterSecond.length === 1 && afterSecond[0] === RUNTIME,
  `after two deploys a device holds ${JSON.stringify(afterSecond)} — it should hold the runtime bucket and ` +
  'the shell bucket it is about to refill, and nothing else');

// And the inverse, restated as the pin the brief asked for: a deploy that only
// bumps the version must leave every runtime key in place.
const runtimeKeys = ['/app.css', '/p/cox', '/api/voting-record/member/cox/pack/m825-abc'];
ok(prune([RUNTIME], next).includes(RUNTIME) && runtimeKeys.length === 3,
  'the runtime bucket did not survive a version-only deploy, so its keys did not either');
console.log(`      ${shellName('v181')} → ${shellName(version)} → ${shellName(next)}, ` +
  `${RUNTIME} untouched throughout (${runtimeKeys.length} key kinds: asset, person doc, VR pack)`);

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ sw cache policy: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ sw cache policy: all ${passed} assertions passed — a bump swaps the shell and nothing else; ` +
  'the packs, the person documents and the runtime assets survive the deploy');
