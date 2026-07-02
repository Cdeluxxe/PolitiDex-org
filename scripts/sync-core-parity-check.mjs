#!/usr/bin/env node
/**
 * Inline-core ⇄ mirror parity guard for the PolitiDex sync foundation.
 *
 * The reusable sync core exists in TWO places that must stay behaviorally identical:
 *   1. The production copy — an inline classic <script> in index.html that defines
 *      `window.PDXSyncCore`. The synced collections (PDXSaved, PDXTeamSync) run at
 *      parse time and consume it directly, so it has to be inline.
 *   2. The importable mirror — scripts/sync/core.mjs — which the Node simulations
 *      (sync-saved / sync-team / sync-core merge sims) and the generic harness load,
 *      because a browser inline script can't be `import`-ed.
 *
 * Those two copies are kept "byte-for-byte equivalent" BY HAND. This check makes that
 * promise enforceable instead of aspirational: it extracts the inline IIFE straight
 * out of index.html, evaluates it in a tiny sandbox, and asserts it produces the exact
 * same output as the mirror for thousands of randomized inputs across every public
 * entry point (createCollection → reconcile / mergeItems / sameItems, plus the pure
 * tombstone / watermark / singleton helpers and the two horizon constants). If anyone
 * edits one copy and forgets the other, this fails loudly and points at the drift.
 *
 * It changes NO behavior and touches NO on-disk / payload format — it only reads the
 * two existing sources and compares them.
 *
 * Run:  node scripts/sync-core-parity-check.mjs
 * Exits non-zero (and prints the first mismatches) if the copies have diverged.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as mirror from './sync/core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(HERE, '..', 'index.html');

// ── Load the production inline core out of index.html ────────────────────────
// Slice the `window.PDXSyncCore = (function () { … })();` IIFE and evaluate just the
// expression, handing it stub `window` / `localStorage` (the only browser globals it
// touches, and only inside deviceId(), which the sims never call).
function loadInlineCore() {
  const html = readFileSync(INDEX_HTML, 'utf8');
  const startAssign = 'window.PDXSyncCore = (function () {';
  const s = html.indexOf(startAssign);
  if (s < 0) throw new Error('could not find `window.PDXSyncCore = (function () {` in index.html');
  const e = html.indexOf('})();', s);
  if (e < 0) throw new Error('could not find the IIFE terminator `})();` after PDXSyncCore');
  const expr = html.slice(s + 'window.PDXSyncCore = '.length, e + '})()'.length);
  const memLocalStorage = { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = String(v); } };
  // eslint-disable-next-line no-new-func
  return new Function('window', 'localStorage', 'return (' + expr + ');')({}, memLocalStorage);
}

const prod = loadInlineCore();

let fails = 0;
const J = (x) => JSON.stringify(x);
function eq(name, a, b) {
  if (J(a) === J(b)) return;
  fails++;
  if (fails <= 12) console.error('  ✗ MISMATCH ' + name + '\n      inline = ' + J(a) + '\n      mirror = ' + J(b));
}

// ── Deterministic input generator (no Math.random reliance for reproducibility) ─
let seed = 0x2545f491;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// The field specs the real collections use, plus the empty (roster-only) spec.
const FIELDSETS = [
  [],
  [{ field: 'note', tsField: 'noteUpdatedAt' }, { field: 'tags', tsField: 'tagsUpdatedAt' }],
  [{ field: 'name', tsField: 'nameUpdatedAt' }, { field: 'slots', tsField: 'slotsUpdatedAt' }],
  [{ field: 'strength', tsField: 'strengthUpdatedAt' }, { field: 'labels', tsField: 'labelsUpdatedAt' }]
];
function randItem() {
  const it = { type: pick(['a', 'b', 'pol', 'team']), key: Math.floor(rnd() * 4), savedAt: Math.floor(rnd() * 5000) };
  if (rnd() < 0.6) { it.note = 'n' + Math.floor(rnd() * 3); if (rnd() < 0.7) it.noteUpdatedAt = Math.floor(rnd() * 5000); }
  if (rnd() < 0.6) { it.tags = ['t' + Math.floor(rnd() * 3)]; if (rnd() < 0.7) it.tagsUpdatedAt = Math.floor(rnd() * 5000); }
  if (rnd() < 0.4) { it.name = 'x' + Math.floor(rnd() * 3); if (rnd() < 0.7) it.nameUpdatedAt = Math.floor(rnd() * 5000); }
  if (rnd() < 0.4) { it.slots = { s: Math.floor(rnd() * 3) }; if (rnd() < 0.7) it.slotsUpdatedAt = Math.floor(rnd() * 5000); }
  return it;
}
const randList = () => { const n = Math.floor(rnd() * 4); const a = []; for (let i = 0; i < n; i++) a.push(randItem()); return a; };
const randMap = (keys) => { const m = {}; for (const k of keys) { if (rnd() < 0.5) m[k] = Math.floor(rnd() * 5000); } return m; };

const ITEM_IDS = ['a::0', 'a::1', 'b::0', 'pol::2', 'team::3'];
const DEVICES = ['A', 'B', 'C'];
const ITERATIONS = 8000;

console.log('Comparing inline window.PDXSyncCore (index.html) against scripts/sync/core.mjs …');
for (let i = 0; i < ITERATIONS; i++) {
  const fields = pick(FIELDSETS);
  const pc = prod.createCollection({ fields });
  const mc = mirror.createCollection({ fields });
  const localItems = randList(), serverItems = randList();
  const input = {
    localItems, serverItems,
    localTombs: randMap(ITEM_IDS), serverTombs: randMap(ITEM_IDS),
    localWm: randMap(DEVICES), serverWm: randMap([...DEVICES, 'D']),
    dirty: rnd() < 0.5, now: Math.floor(rnd() * 10000), deviceId: pick(DEVICES),
    staleMs: pick([1000, undefined]), minRetainMs: pick([0, 1000, undefined])
  };
  // Whole pull-side reconcile — the flow both collections actually run.
  eq('reconcile#' + i, pc.reconcile(JSON.parse(J(input))), mc.reconcile(JSON.parse(J(input))));
  // The pure sub-steps, exercised independently with identical arguments.
  const mOpts = { dirty: input.dirty, tombstones: input.localTombs };
  eq('mergeItems#' + i, pc.mergeItems(localItems, serverItems, mOpts), mc.mergeItems(localItems, serverItems, mOpts));
  eq('sameItems#' + i, pc.sameItems(localItems, serverItems), mc.sameItems(localItems, serverItems));
  const ptOpts = { now: input.now, minRetainMs: input.minRetainMs };
  eq('pruneTombstones#' + i, prod.pruneTombstones(input.localTombs, input.localWm, ptOpts), mirror.pruneTombstones(input.localTombs, input.localWm, ptOpts));
  eq('pruneWatermarks#' + i, prod.pruneWatermarks(input.localWm, input.now, input.staleMs), mirror.pruneWatermarks(input.localWm, input.now, input.staleMs));
  eq('mergeSingletons#' + i, prod.mergeSingletons({ mode: 'a' }, { mode: 'b' }, input.dirty), mirror.mergeSingletons({ mode: 'a' }, { mode: 'b' }, input.dirty));
}

// Constants + normalization/backward-compat parity (absent/legacy/array/non-finite).
eq('WM_STALE_MS', prod.WM_STALE_MS, mirror.WM_STALE_MS);
eq('TOMB_MIN_RETAIN_MS', prod.TOMB_MIN_RETAIN_MS, mirror.TOMB_MIN_RETAIN_MS);
eq('readTombs(undefined)', prod.readTombs(undefined), mirror.readTombs(undefined));
eq('readTombs(array)', prod.readTombs([{ id: 'a::1', deletedAt: 7 }]), mirror.readTombs([{ id: 'a::1', deletedAt: 7 }]));
eq('readWatermarks(nan/finite)', prod.readWatermarks({ A: 'nan', B: 5, C: 3 }), mirror.readWatermarks({ A: 'nan', B: 5, C: 3 }));

console.log('');
if (fails) { console.error(fails + ' parity mismatch(es) — the inline core and scripts/sync/core.mjs have DIVERGED.'); process.exit(1); }
console.log('Parity OK: inline window.PDXSyncCore is behaviorally identical to scripts/sync/core.mjs across ' + ITERATIONS + ' randomized scenarios + all pure helpers.');
