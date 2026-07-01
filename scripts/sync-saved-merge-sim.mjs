#!/usr/bin/env node
/**
 * Two-device simulation for the PolitiDex "saved" collection sync merge.
 *
 * This is a runnable verification harness for the FIELD-LEVEL merge added so a
 * note edit on one device and a tag edit on another no longer overwrite each
 * other. The merge/tombstone functions below MIRROR the implementation inside
 * the PDXSaved IIFE in index.html (they can't be imported from that inlined
 * module) — keep them in sync with that source of truth.
 *
 * Run:  node scripts/sync-saved-merge-sim.mjs
 * Exits non-zero if any assertion fails.
 */

// ── Mirror of index.html merge internals ──────────────────────────────────
const idOf = (type, key) => String(type) + '::' + String(key);

function noteTime(x) { return x.noteUpdatedAt != null ? x.noteUpdatedAt : (x.savedAt || 0); }
function tagsTime(x) { return x.tagsUpdatedAt != null ? x.tagsUpdatedAt : (x.savedAt || 0); }

function pickField(local, server, tsField, lt, st, dirty) {
  const lHas = local[tsField] != null, sHas = server[tsField] != null;
  if (lHas && !sHas) return local;
  if (sHas && !lHas) return server;
  if (lt > st) return local;
  if (st > lt) return server;
  return dirty ? local : server;
}

function mergeOne(local, server, dirty) {
  const ls = local.savedAt || 0, ss = server.savedAt || 0;
  const base = (ss > ls || (ss === ls && !dirty)) ? server : local;
  const out = {};
  for (const k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k]; }

  const noteSrc = pickField(local, server, 'noteUpdatedAt', noteTime(local), noteTime(server), dirty);
  if (noteSrc.note != null && noteSrc.note !== '') out.note = noteSrc.note; else delete out.note;
  if (noteSrc.noteUpdatedAt != null) out.noteUpdatedAt = noteSrc.noteUpdatedAt; else delete out.noteUpdatedAt;

  const tagsSrc = pickField(local, server, 'tagsUpdatedAt', tagsTime(local), tagsTime(server), dirty);
  if (tagsSrc.tags && tagsSrc.tags.length) out.tags = tagsSrc.tags; else delete out.tags;
  if (tagsSrc.tagsUpdatedAt != null) out.tagsUpdatedAt = tagsSrc.tagsUpdatedAt; else delete out.tagsUpdatedAt;

  out.savedAt = Math.max(noteTime(noteSrc), tagsTime(tagsSrc));
  return out;
}

function mergeItems(localItems, serverItems, opts) {
  opts = opts || {};
  const dirty = !!opts.dirty;
  const tombs = opts.tombstones || {};
  localItems = Array.isArray(localItems) ? localItems : [];
  serverItems = Array.isArray(serverItems) ? serverItems : [];

  const byId = {}, order = [];
  function put(rec) {
    const id = idOf(rec.type, rec.key);
    if (!Object.prototype.hasOwnProperty.call(byId, id)) order.push(id);
    byId[id] = rec;
  }
  for (const l of localItems) { if (l && l.type != null && l.key != null) put(l); }
  for (const s of serverItems) {
    if (!s || s.type == null || s.key == null) continue;
    const sid = idOf(s.type, s.key);
    const local = Object.prototype.hasOwnProperty.call(byId, sid) ? byId[sid] : null;
    if (!local) { put(s); continue; }
    put(mergeOne(local, s, dirty));
  }

  const merged = [];
  for (const id of order) {
    const rec = byId[id];
    if (Object.prototype.hasOwnProperty.call(tombs, id)) {
      if (!((rec.savedAt || 0) > tombs[id])) continue;
    }
    merged.push(rec);
  }
  return merged;
}

function mergeTombstones(a, b) {
  const out = {};
  for (const ka in a) { if (Object.prototype.hasOwnProperty.call(a, ka)) out[ka] = a[ka]; }
  for (const kb in b) {
    if (!Object.prototype.hasOwnProperty.call(b, kb)) continue;
    if (!Object.prototype.hasOwnProperty.call(out, kb) || b[kb] > out[kb]) out[kb] = b[kb];
  }
  return out;
}

// A full two-way reconcile of two devices' state (items + tombstones), matching
// reconcileFromServer(): union tombstones, field-merge items against them, then
// prune tombstones whose id survived as a live item.
function reconcile(local, server, dirty) {
  const tombs = mergeTombstones(local.tombs || {}, server.tombs || {});
  const merged = mergeItems(local.items || [], server.items || [], { dirty, tombstones: tombs });
  merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const live = {};
  for (const m of merged) live[idOf(m.type, m.key)] = 1;
  const prunedTombs = {};
  for (const id in tombs) { if (Object.prototype.hasOwnProperty.call(tombs, id) && !live[id]) prunedTombs[id] = tombs[id]; }
  return { items: merged, tombs: prunedTombs };
}

// ── Tiny assert harness ────────────────────────────────────────────────────
let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓ ' + name); }
  else { failures++; console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
const get1 = (arr, type, key) => arr.find((x) => x.type === type && x.key === key) || null;

// ── Scenarios ───────────────────────────────────────────────────────────────
console.log('Scenario 1: A edits note only, B edits tags only → combined result');
{
  const T0 = 1000; // both devices share an item saved at T0
  const seed = { type: 'receipt', key: 42, title: 'HB 100', savedAt: T0 };
  // Device A edits the note at T1.
  const A = { ...seed, note: 'follow this one', noteUpdatedAt: 1100, savedAt: 1100 };
  // Device B edits the tags at T2 (later than A's note edit).
  const B = { ...seed, tags: ['housing', 'watch'], tagsUpdatedAt: 1200, savedAt: 1200 };

  // Merge on device A (local = A, server = B) and on device B (local = B, server = A).
  const onA = reconcile({ items: [A] }, { items: [B] }, true);
  const onB = reconcile({ items: [B] }, { items: [A] }, true);
  const ra = get1(onA.items, 'receipt', 42);
  const rb = get1(onB.items, 'receipt', 42);

  check('A keeps its note', ra.note === 'follow this one', JSON.stringify(ra));
  check('A gains B\'s tags', JSON.stringify(ra.tags) === JSON.stringify(['housing', 'watch']));
  check('B keeps its tags', JSON.stringify(rb.tags) === JSON.stringify(['housing', 'watch']));
  check('B gains A\'s note', rb.note === 'follow this one', JSON.stringify(rb));
  check('both devices converge', JSON.stringify(ra) === JSON.stringify(rb));
  check('savedAt is the newer field edit', ra.savedAt === 1200, 'got ' + ra.savedAt);
  check('field stamps preserved', ra.noteUpdatedAt === 1100 && ra.tagsUpdatedAt === 1200);
}

console.log('Scenario 2: delete on one device beats a concurrent field edit → tombstone wins');
{
  const seed = { type: 'issue', key: 'imm', title: 'Immigration', savedAt: 2000 };
  // Device A edits the note at T=2100.
  const A = { ...seed, note: 'important', noteUpdatedAt: 2100, savedAt: 2100 };
  // Device B deletes the item at T=2200 (newer than A's edit) → tombstone.
  const Btombs = { [idOf('issue', 'imm')]: 2200 };

  const onA = reconcile({ items: [A] }, { items: [], tombs: Btombs }, true);
  check('item is deleted', get1(onA.items, 'issue', 'imm') === null);
  check('tombstone retained (no live item)', onA.tombs[idOf('issue', 'imm')] === 2200);

  // Symmetric guard: an edit STRICTLY AFTER the delete should resurrect it.
  const Alater = { ...seed, note: 'important', noteUpdatedAt: 2300, savedAt: 2300 };
  const onA2 = reconcile({ items: [Alater] }, { items: [], tombs: Btombs }, true);
  check('edit newer than delete survives', get1(onA2.items, 'issue', 'imm') !== null);
}

console.log('Scenario 3: re-saving a previously deleted item clears its tombstone');
{
  const id = idOf('receipt', 7);
  // Device B still carries a tombstone from an earlier delete at T=3000.
  const Btombs = { [id]: 3000 };
  // Device A re-added the item fresh at T=3500 (add() stamps savedAt and clears
  // A's own tombstone; here we verify the merge doesn't re-kill the resurrection).
  const A = { type: 'receipt', key: 7, title: 'SB 20', savedAt: 3500 };

  const onA = reconcile({ items: [A], tombs: {} }, { items: [], tombs: Btombs }, true);
  check('resurrected item is present', get1(onA.items, 'receipt', 7) !== null);
  check('stale tombstone pruned', onA.tombs[id] === undefined);
}

console.log('Scenario 4: backward compatibility with legacy (stamp-free) items');
{
  // Neither side has noteUpdatedAt/tagsUpdatedAt → must behave like old
  // whole-item last-write-wins on savedAt.
  const legacyOld = { type: 'receipt', key: 1, title: 'old', note: 'a', tags: ['x'], savedAt: 5000 };
  const legacyNew = { type: 'receipt', key: 1, title: 'new', note: 'b', tags: ['y'], savedAt: 5500 };

  const clean = reconcile({ items: [legacyOld] }, { items: [legacyNew] }, false);
  const r = get1(clean.items, 'receipt', 1);
  check('newer legacy copy wins whole item', r.note === 'b' && JSON.stringify(r.tags) === JSON.stringify(['y']) && r.title === 'new');
  check('no phantom stamps added', r.noteUpdatedAt === undefined && r.tagsUpdatedAt === undefined);

  // Legacy vs a new-format edit: A (legacy) has an old note; B edited only tags.
  const legacyA = { type: 'receipt', key: 2, note: 'keepme', savedAt: 6000 };
  const newB = { type: 'receipt', key: 2, note: 'keepme', tags: ['z'], tagsUpdatedAt: 6100, savedAt: 6100 };
  const mix = reconcile({ items: [legacyA] }, { items: [newB] }, true);
  const r2 = get1(mix.items, 'receipt', 2);
  check('legacy note preserved through a tag-only edit', r2.note === 'keepme' && JSON.stringify(r2.tags) === JSON.stringify(['z']));
}

console.log('Scenario 5: same-field edits still race (later stamp wins)');
{
  const A = { type: 'issue', key: 'ed', note: 'first', noteUpdatedAt: 7000, savedAt: 7000 };
  const B = { type: 'issue', key: 'ed', note: 'second', noteUpdatedAt: 7100, savedAt: 7100 };
  const r = get1(reconcile({ items: [A] }, { items: [B] }, true).items, 'issue', 'ed');
  check('later note edit wins', r.note === 'second' && r.noteUpdatedAt === 7100);
}

console.log('');
if (failures) { console.error(failures + ' assertion(s) FAILED'); process.exit(1); }
console.log('All merge simulations passed.');
