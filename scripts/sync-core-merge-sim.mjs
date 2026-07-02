#!/usr/bin/env node
/**
 * GENERIC, collection-agnostic sync simulation.
 *
 * The per-collection sims (sync-saved-merge-sim.mjs, sync-team-merge-sim.mjs) each
 * re-declare and prove the merge logic for ONE collection. This sim instead drives
 * the SHARED core (scripts/sync/core.mjs) through the generic harness
 * (scripts/sync/harness.mjs) and asserts the SAME invariants for THREE collections
 * from nothing but a config each:
 *
 *   • saved     — fields: note, tags                         (today's collection)
 *   • team      — fields: name, slots  + singletons          (today's collection)
 *   • evidence  — fields: strength, labels                   (a HYPOTHETICAL third
 *                                                              collection, added below
 *                                                              in ~4 lines of config)
 *
 * The point: adding "evidence" required only a { fields } config object — no new
 * merge code, no new device model, no copied GC logic. Every tombstone / watermark /
 * field-merge / resurrection / offline-straggler / retirement / grace-window
 * guarantee comes for free from the core.
 *
 * Run:  node scripts/sync-core-merge-sim.mjs
 * Exits non-zero if any assertion fails.
 */
import * as core from './sync/core.mjs';
import { makeHarness } from './sync/harness.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓ ' + name); }
  else { failures++; console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── The three collection configs ─────────────────────────────────────────────
// Two are today's real collections; "evidence" is a brand-new one defined purely
// as configuration to demonstrate how little a new collection needs.
const COLLECTIONS = [
  {
    name: 'saved',
    harness: { snapshotKey: 'saved', fields: [
      { field: 'note', tsField: 'noteUpdatedAt' },
      { field: 'tags', tsField: 'tagsUpdatedAt' }
    ] },
    // A sample item + field values used to drive the shared scenarios.
    sample: { type: 'receipt', key: 42, seed: { title: 'HB 100' },
      fieldA: 'note',  a1: 'follow this one', a2: 'updated note',
      fieldB: 'tags',  b1: ['housing', 'watch'] }
  },
  {
    name: 'team',
    harness: { snapshotKey: 'team', fields: [
      { field: 'name',  tsField: 'nameUpdatedAt'  },
      { field: 'slots', tsField: 'slotsUpdatedAt' }
    ], singletons: { ballot: {}, homeBase: null, mode: 'research', activeTeam: null } },
    sample: { type: 'team', key: 'saved_x', seed: { createdAt: 1000 },
      fieldA: 'name',  a1: 'Reform Slate', a2: 'Renamed Slate',
      fieldB: 'slots', b1: { senate: 'p1', house: 'p2' } }
  },
  {
    // ─────────────────────────────────────────────────────────────────────────
    // The Evidence Locker's saved collections — now a REAL synced collection
    // (see PDXEvidenceSync in index.html and scripts/sync-evidence-merge-sim.mjs
    // for the full nested-store projection). Here it is driven purely as a config
    // to prove it earns every core guarantee for free: its independently-mergeable
    // fields are a saved receipt's `note` / `tags` (the analog of saved's) plus a
    // collection's `name`. Tombstoned like the others; no singletons. That config
    // is the entire onboarding cost for full tombstone-aware, watermark-GC'd,
    // field-level-merge cross-device sync.
    // ─────────────────────────────────────────────────────────────────────────
    name: 'evidence',
    harness: { snapshotKey: 'evidence', fields: [
      { field: 'name', tsField: 'nameUpdatedAt' },
      { field: 'note', tsField: 'noteUpdatedAt' },
      { field: 'tags', tsField: 'tagsUpdatedAt' }
    ] },
    sample: { type: 'evitem', key: 'pol_42␟receipt-x', seed: { snap: { headline: 'HB 100 vote' } },
      fieldA: 'note', a1: 'follow this receipt', a2: 'updated note',
      fieldB: 'tags', b1: ['primary-source', 'video'] }
  }
];

// ── The shared invariants, run for every collection above ────────────────────
function runInvariants(C) {
  const { name, sample } = C;
  const { Device, Server, idOf, col } = makeHarness(C.harness);
  const tsA = (C.harness.fields.find((f) => f.field === sample.fieldA) || {}).tsField;
  console.log('\n=== Collection: ' + name + ' ===');

  // 1. Field-level merge — an edit to fieldA on A and to fieldB on B both survive.
  {
    const srv = new Server();
    const A = new Device('A', { minRetainMs: 0 });
    const B = new Device('B', { minRetainMs: 0 });
    A.save(Object.assign({ type: sample.type, key: sample.key }, sample.seed), 1000);
    A.sync(srv, 1000); B.sync(srv, 1000);                 // both hold the seed
    A.editField(sample.type, sample.key, sample.fieldA, sample.a1, 1100);
    B.editField(sample.type, sample.key, sample.fieldB, sample.b1, 1200);
    A.sync(srv, 1300, true);   // A pushes its fieldA edit
    B.sync(srv, 1400, true);   // B merges A's fieldA edit and pushes its fieldB edit
    A.sync(srv, 1500);         // A converges
    const ra = A.get(sample.type, sample.key), rb = B.get(sample.type, sample.key);
    check('[' + name + '] fieldA edit survives', eq(ra[sample.fieldA], sample.a1), JSON.stringify(ra));
    check('[' + name + '] fieldB edit survives', eq(ra[sample.fieldB], sample.b1), JSON.stringify(ra));
    check('[' + name + '] both devices converge', eq(ra, rb));
  }

  // 2. Delete beats a concurrent field edit; a strictly-later edit resurrects.
  //    This is a pure-merge invariant (tombstone precedence), so it is checked
  //    directly through the collection's field merger — exactly as the per-
  //    collection sims verify it with reconcile().
  {
    const id = idOf(sample.type, sample.key);
    const edited = Object.assign(
      { type: sample.type, key: sample.key, savedAt: 2100 }, sample.seed,
      { [sample.fieldA]: sample.a2 }, tsA ? { [tsA]: 2100 } : {});
    const tombs = { [id]: 2200 };   // deletion strictly newer than the edit
    const dropped = col.mergeItems([edited], [], { dirty: true, tombstones: tombs });
    check('[' + name + '] delete newer than edit wins', !dropped.some((x) => idOf(x.type, x.key) === id));
    const later = Object.assign({}, edited, { savedAt: 2300 }, tsA ? { [tsA]: 2300 } : {});
    const survives = col.mergeItems([later], [], { dirty: true, tombstones: tombs });
    check('[' + name + '] edit strictly newer than delete survives', survives.some((x) => idOf(x.type, x.key) === id));

    // A full re-save (fresh savedAt, tombstone cleared locally) resurrects on purpose.
    const srv = new Server();
    const A = new Device('A', { minRetainMs: 0 });
    const B = new Device('B', { minRetainMs: 0 });
    A.save({ type: sample.type, key: sample.key }, 100);
    A.sync(srv, 100); B.sync(srv, 100);
    B.remove(sample.type, sample.key, 200); B.sync(srv, 250, true);
    A.sync(srv, 300);
    check('[' + name + '] deletion propagated to A', A.has(sample.type, sample.key) === false);
    A.save(Object.assign({ type: sample.type, key: sample.key }, sample.seed), 400);
    A.sync(srv, 450, true); B.sync(srv, 500);
    check('[' + name + '] re-save after delete resurrects', B.has(sample.type, sample.key) === true);
  }

  // 3. Two-device tombstone GC — kept until BOTH pass it, then collected, no resurrection.
  {
    const srv = new Server();
    const A = new Device('A', { minRetainMs: 0 });
    const B = new Device('B', { minRetainMs: 0 });
    const id = idOf(sample.type, sample.key);
    A.save({ type: sample.type, key: sample.key }, 100);
    A.sync(srv, 150); B.sync(srv, 200);                    // both hold it
    A.remove(sample.type, sample.key, 500);
    A.sync(srv, 600, true);
    check('[' + name + '] tombstone kept while B is behind', srv.snap.tombstones[id] === 500);
    B.sync(srv, 700);                                      // B returns → must see deletion
    check('[' + name + '] straggler applies deletion on return', B.has(sample.type, sample.key) === false);
    check('[' + name + '] tombstone GC\'d once both synced past it', srv.snap.tombstones[id] === undefined);
    A.sync(srv, 800);
    check('[' + name + '] no resurrection on server after GC',
      !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === id));
  }

  // 4. Long-offline device (within the horizon) still receives an old deletion.
  {
    const srv = new Server();
    const A = new Device('A', { minRetainMs: 0 });
    const B = new Device('B', { minRetainMs: 0 });
    const id = idOf(sample.type, sample.key);
    A.save({ type: sample.type, key: sample.key }, 1000);
    A.sync(srv, 1000); B.sync(srv, 1000);
    A.remove(sample.type, sample.key, 5000);
    A.sync(srv, 5000, true);
    for (const t of [10000, 20000, 50000, 100000]) A.sync(srv, t);   // A keeps syncing; B offline
    check('[' + name + '] tombstone survives while straggler behind', srv.snap.tombstones[id] === 5000);
    B.sync(srv, 120000);                                             // still within WM_STALE_MS
    check('[' + name + '] long-offline device receives the deletion', B.has(sample.type, sample.key) === false);
    check('[' + name + '] tombstone GC\'d only after straggler caught up', srv.snap.tombstones[id] === undefined);
  }

  // 5. Legacy interop + grace window protects an untracked OLD client.
  {
    const srv = new Server();
    const GRACE = 1000;
    const oldC = new Device('OLD', { old: true });
    const newC = new Device('NEW', { minRetainMs: GRACE });
    const id = idOf(sample.type, sample.key);
    newC.save({ type: sample.type, key: sample.key }, 100);
    newC.sync(srv, 100);
    oldC.sync(srv, 120);                                   // OLD pulls (ignores wm), pushes v1 → wipes wm
    check('[' + name + '] old client received the new item', oldC.has(sample.type, sample.key));
    check('[' + name + '] old push wipes watermarks (safe direction)', srv.snap.watermarks === undefined);
    newC.remove(sample.type, sample.key, 200);             // NEW deletes; only KNOWN device
    newC.sync(srv, 250, true);
    check('[' + name + '] grace window keeps a fresh tombstone despite full known coverage',
      srv.snap.tombstones[id] === 200);
    oldC.sync(srv, 400);                                   // OLD syncs inside the grace window
    check('[' + name + '] old client applies deletion inside grace window',
      oldC.has(sample.type, sample.key) === false);
    check('[' + name + '] no resurrection of the old client\'s view',
      !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === id));
  }

  // 6. Singletons (only for collections that declare them, e.g. team).
  if (C.harness.singletons) {
    const srv = new Server();
    const A = new Device('A', { minRetainMs: 0 });
    const B = new Device('B', { minRetainMs: 0 });
    A.setSingletons({ mode: 'home' });
    A.sync(srv, 100);
    B.sync(srv, 200);                                      // clean B adopts A's singletons
    check('[' + name + '] clean device adopts server singleton', B.singletons.mode === 'home');
    B.setSingletons({ mode: 'ballot' });                  // local edit
    B.pull(srv.snap, 300, true);                           // dirty pull with a stale server copy
    check('[' + name + '] dirty device keeps its own singleton edit', B.singletons.mode === 'ballot');
    B.sync(srv, 350, true);
    A.sync(srv, 400);
    check('[' + name + '] other device converges to the newer singleton', A.singletons.mode === 'ballot');
  }
}

// ── Pure-helper invariants (identical across all collections) ────────────────
function runPureHelperInvariants() {
  console.log('\n=== Core pure helpers (collection-agnostic) ===');
  const id = 'x::1';
  // pruneTombstones: refuse while any known device behind; drop only once all pass.
  check('GC refuses while a known device is behind',
    core.pruneTombstones({ [id]: 5000 }, { A: 9000, B: 1000 }, { now: 9000, minRetainMs: 0 })[id] === 5000);
  check('GC drops once every device passed it',
    core.pruneTombstones({ [id]: 5000 }, { A: 9000, B: 6000 }, { now: 9000, minRetainMs: 0 })[id] === undefined);
  check('empty watermark set keeps tombstones (nothing proven)',
    core.pruneTombstones({ [id]: 5000 }, {}, { now: 9000, minRetainMs: 0 })[id] === 5000);
  // pruneWatermarks: retire the long-dead, retain the recently-seen.
  const retired = core.pruneWatermarks({ A: 90000, C: 1000 }, 100000, 50000);
  check('a long-dead device is retired', retired.C === undefined && retired.A === 90000);
  const fresh = core.pruneWatermarks({ A: 90000, C: 70000 }, 100000, 50000);
  check('a recently-seen device is retained', fresh.C === 70000);
  check('a retained-but-behind device still blocks GC',
    core.pruneTombstones({ [id]: 75000 }, fresh, { now: 100000, minRetainMs: 0 })[id] === 75000);
  // Normalization / backward compatibility.
  check('missing watermarks normalize to {}', eq(core.readWatermarks(undefined), {}));
  const w = core.readWatermarks({ A: 'nan', B: 5, C: 3 });
  check('non-finite watermark entries dropped', w.A === undefined && w.B === 5 && w.C === 3);
  check('array-form tombstones normalize', core.readTombs([{ id: 'a::1', deletedAt: 7 }])['a::1'] === 7);
}

// ── Run ──────────────────────────────────────────────────────────────────────
runPureHelperInvariants();
for (const C of COLLECTIONS) runInvariants(C);

console.log('');
if (failures) { console.error(failures + ' assertion(s) FAILED'); process.exit(1); }
console.log('All generic core simulations passed (saved, team, evidence).');
