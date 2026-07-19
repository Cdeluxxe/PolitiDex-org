#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Run 1 perf pass: stop Firebase from blocking first paint.
//
// Today the three gstatic Firebase compat SDKs are render-blocking in <head> and
// the inline bootstrap calls firebase.initializeApp()/firestore()/auth() at PARSE
// time. This script:
//   1. adds `defer` to the 3 gstatic SDK tags + /firebase-config.js, and
//   2. moves the self-contained bootstrap <script> (config + init + the FAST-FIRST-
//      LOAD directory loader) into an external `firebase-boot.js` loaded with
//      `defer`, so it runs AFTER the SDK but BEFORE DOMContentLoaded — the exact
//      point the app already expects Firebase to be ready.
//
// Behavior is preserved because (verified by static analysis) the bootstrap block
// is self-contained: it defines all its own _pdx* functions and kicks off the load
// at its end, and NOTHING outside it references db/auth/PROFILES/_pdx* at parse
// time (all consumers run on the _firestoreLoaded gate / DOMContentLoaded / modal
// open — i.e. after the deferred boot). A tiny synchronous stub keeps db/auth/
// PROFILES/setDoc defined at parse time as belt-and-suspenders, matching the
// bootstrap's own no-Firebase fallback stubs.
//
//   node scripts/perf-run1-defer-firebase.mjs            # dry run
//   node scripts/perf-run1-defer-firebase.mjs --apply    # write firebase-boot.js + edit index.html
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

let html = fs.readFileSync(INDEX, 'utf8');

if (html.includes('src="/firebase-boot.js"')) { console.log('Already deferred (firebase-boot.js present). Nothing to do.'); process.exit(0); }

// 1) Locate the bootstrap <script>…</script> — the first <script> AFTER the
//    firebase-config.js include. It has no src and begins with the known comment.
const configTag = '<script src="/firebase-config.js"></script>';
const cfgIdx = html.indexOf(configTag);
if (cfgIdx < 0) { console.error('✗ firebase-config.js tag not found'); process.exit(1); }
const openIdx = html.indexOf('<script>', cfgIdx);
const closeIdx = html.indexOf('</script>', openIdx);
if (openIdx < 0 || closeIdx < 0) { console.error('✗ bootstrap <script> boundaries not found'); process.exit(1); }
const bootFull = html.slice(openIdx, closeIdx + '</script>'.length);
const bootInner = html.slice(openIdx + '<script>'.length, closeIdx);

// Sanity: the bootstrap must contain the init + loader we expect.
const ok = bootInner.includes('firebase.initializeApp(firebaseConfig)') &&
           bootInner.includes('_pdxLoadDirectoryIndex') &&
           bootInner.includes('var PROFILES');
if (!ok) { console.error('✗ bootstrap content did not match expected init/loader — aborting'); process.exit(1); }
console.log(`Bootstrap block: lines ${html.slice(0,openIdx).split('\n').length}–${html.slice(0,closeIdx).split('\n').length}, ${(bootFull.length/1024).toFixed(0)} KB`);

// The replacement: a tiny synchronous stub (globals safe at parse time) + the
// deferred external boot.
const replacement =
`<script>
  // Run 1 perf: the Firebase SDKs and the bootstrap below are DEFERRED so they no
  // longer block first paint. This tiny synchronous stub guarantees the globals
  // that other inline code could touch at parse time exist; firebase-boot.js
  // (deferred → runs after the SDK, before DOMContentLoaded) then replaces them
  // with the live Firebase objects and starts the lightweight roster load. Net
  // effect: identical behavior, but the ~800 KB compat SDK no longer gates paint.
  var app, db, firestore, auth;
  var PROFILES = window.PROFILES || {}; window.PROFILES = PROFILES;
  window._pdxFullIds = window._pdxFullIds || new Set();
  window._pdxFullPending = window._pdxFullPending || {};
  function setDoc(docRef, data, options) { return docRef.set(data, options); }
  db = { collection: null }; firestore = db;
  auth = { currentUser: null, onAuthStateChanged: function (cb) { try { cb(null); } catch (e) {} return function () {}; }, signInAnonymously: function () { return Promise.reject(new Error('auth pending')); }, signOut: function () { return Promise.resolve(); } };
</script>
<script src="/firebase-boot.js" defer></script>`;

// 2) Add defer to the three gstatic SDK tags + firebase-config.js.
const deferRepls = [
  ['<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>',
   '<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>'],
  ['<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>',
   '<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>'],
  ['<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>',
   '<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>'],
  [configTag, '<script defer src="/firebase-config.js"></script>'],
];
for (const [a] of deferRepls) if (!html.includes(a)) { console.error('✗ expected tag not found: ' + a.slice(0, 60)); process.exit(1); }

if (!APPLY) {
  console.log('\nWould: write firebase-boot.js (' + (bootInner.length/1024).toFixed(0) + ' KB), replace inline bootstrap with stub+deferred include, add defer to 4 firebase tags.');
  console.log('Dry run. Re-run with --apply.');
  process.exit(0);
}

let out = html.replace(bootFull, replacement);
for (const [a, b] of deferRepls) out = out.replace(a, b);
fs.writeFileSync(path.join(ROOT, 'firebase-boot.js'), bootInner);
fs.writeFileSync(INDEX, out);
console.log('  ✎ wrote firebase-boot.js (' + (bootInner.length/1024).toFixed(0) + ' KB)');
console.log('  ✎ replaced inline bootstrap with stub + <script defer src="/firebase-boot.js">');
console.log('  ✎ added defer to the 3 gstatic SDK tags + firebase-config.js');
console.log(`\nApplied. index.html: ${(html.length/1048576).toFixed(2)} MB → ${(out.length/1048576).toFixed(2)} MB`);
