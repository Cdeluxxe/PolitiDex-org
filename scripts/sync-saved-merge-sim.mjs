#!/usr/bin/env node
/**
 * Multi-device simulation for the PolitiDex "saved" collection sync merge.
 *
 * This is a runnable verification harness for two things that MIRROR the
 * implementation inside the PDXSaved IIFE in index.html (they can't be imported
 * from that inlined module) — keep them in sync with that source of truth:
 *   1. FIELD-LEVEL merge (Scenarios 1-5): a note edit on one device and a tag
 *      edit on another no longer overwrite each other; tombstones win deletes.
 *   2. WATERMARK-based tombstone GC (Scenarios 6-12): tombstones are pruned only
 *      once every known device has synced strictly past them, so a device that
 *      was offline for a long time still receives old deletions and never
 *      resurrects them — with a stale-device retirement policy and a fresh-
 *      tombstone grace window that keeps old (watermark-free) clients safe.
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

// ── Mirror of the WATERMARK / tombstone-GC internals (index.html) ───────────
// Keep these byte-for-byte equivalent to the PDXSaved watermark block.
const WM_STALE_MS = 1000 * 60 * 60 * 24 * 180;      // 180 days
const TOMB_MIN_RETAIN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Normalize a tombstones payload (map or defensive array) into { id: deletedAt }.
function readTombs(raw) {
  const out = {};
  if (!raw) return out;
  const add = (id, d) => {
    if (id == null) return;
    const n = Number(d);
    if (!isFinite(n)) return;
    id = String(id);
    if (!Object.prototype.hasOwnProperty.call(out, id) || n > out[id]) out[id] = n;
  };
  if (Array.isArray(raw)) { for (const t of raw) { if (t) add(t.id, t.deletedAt); } }
  else if (typeof raw === 'object') { for (const k in raw) { if (Object.prototype.hasOwnProperty.call(raw, k)) add(k, raw[k]); } }
  return out;
}

function readWatermarks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    const n = Number(raw[k]);
    if (!isFinite(n)) continue;
    const id = String(k);
    if (!Object.prototype.hasOwnProperty.call(out, id) || n > out[id]) out[id] = n;
  }
  return out;
}
function mergeWatermarks(a, b) {
  const out = {};
  for (const ka in a) { if (Object.prototype.hasOwnProperty.call(a, ka)) out[ka] = a[ka]; }
  for (const kb in b) {
    if (!Object.prototype.hasOwnProperty.call(b, kb)) continue;
    if (!Object.prototype.hasOwnProperty.call(out, kb) || b[kb] > out[kb]) out[kb] = b[kb];
  }
  return out;
}
function pruneWatermarks(watermarks, now, staleMs) {
  if (staleMs == null) staleMs = WM_STALE_MS;
  const out = {};
  for (const id in watermarks) {
    if (!Object.prototype.hasOwnProperty.call(watermarks, id)) continue;
    if (now != null && (now - watermarks[id]) > staleMs) continue;   // forgotten
    out[id] = watermarks[id];
  }
  return out;
}
function pruneTombstones(tombs, watermarks, opts) {
  opts = opts || {};
  const now = opts.now;
  const minRetainMs = opts.minRetainMs != null ? opts.minRetainMs : TOMB_MIN_RETAIN_MS;
  const devices = Object.keys(watermarks || {});
  const kept = {};
  for (const id in tombs) {
    if (!Object.prototype.hasOwnProperty.call(tombs, id)) continue;
    const d = tombs[id];
    if (now != null && (now - d) < minRetainMs) { kept[id] = d; continue; }
    let allPast = devices.length > 0;
    for (let i = 0; i < devices.length; i++) {
      if (!(watermarks[devices[i]] > d)) { allPast = false; break; }
    }
    if (!allPast) kept[id] = d;
  }
  return kept;
}

// ── Device / Server model: a faithful, deterministic sync harness ───────────
// Mirrors reconcileFromServer end-to-end (watermark union + own-mark advance +
// stale-device retirement + tombstone GC), plus a full-snapshot-overwrite push.
// `staleMs`/`minRetainMs` are configurable so scenarios can exercise the GC
// logic on small, readable timestamps instead of real 180-day gaps.
const clone = (x) => JSON.parse(JSON.stringify(x));

class Server {
  constructor() { this.snap = null; }   // null = server has no snapshot yet
}

class Device {
  constructor(id, opts) {
    this.id = id;
    this.items = [];
    this.tombs = {};
    this.wm = {};
    this.old = !!(opts && opts.old);         // an OLD client: no watermark support
    this.staleMs = (opts && opts.staleMs != null) ? opts.staleMs : WM_STALE_MS;
    this.minRetainMs = (opts && opts.minRetainMs != null) ? opts.minRetainMs : TOMB_MIN_RETAIN_MS;
  }
  save(item, t) {
    const id = idOf(item.type, item.key);
    const i = this.items.findIndex((x) => idOf(x.type, x.key) === id);
    const rec = { ...item, savedAt: t };
    if (i === -1) this.items.push(rec); else this.items[i] = rec;
    if (Object.prototype.hasOwnProperty.call(this.tombs, id)) delete this.tombs[id]; // re-save clears tombstone
    return this;
  }
  remove(type, key, t) {
    const id = idOf(type, key);
    this.items = this.items.filter((x) => idOf(x.type, x.key) !== id);
    this.tombs[id] = t;
    return this;
  }
  has(type, key) { return this.items.some((x) => x.type === type && x.key === key); }
  snapshot() {
    // An OLD client's snapshot carries NO watermarks field — and because a push is
    // a full-snapshot overwrite, an old client pushing wipes watermarks from the
    // server. New clients then re-establish them (the safe, conservative direction).
    return this.old
      ? { key: 'saved', version: 2, items: clone(this.items), tombstones: clone(this.tombs) }
      : { key: 'saved', version: 3, items: clone(this.items), tombstones: clone(this.tombs), watermarks: clone(this.wm) };
  }
  // Merge a server snapshot into local state. `dirty` marks un-pushed local edits.
  pull(serverSnap, now, dirty) {
    const serverItems = (serverSnap && Array.isArray(serverSnap.items)) ? serverSnap.items : [];
    const serverTombs = readTombs(serverSnap && serverSnap.tombstones);
    const tombs = mergeTombstones(this.tombs, serverTombs);
    const merged = mergeItems(this.items, serverItems, { dirty: !!dirty, tombstones: tombs });
    merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    const liveIds = {};
    for (const m of merged) liveIds[idOf(m.type, m.key)] = 1;
    const afterLive = {};
    for (const id in tombs) { if (Object.prototype.hasOwnProperty.call(tombs, id) && !liveIds[id]) afterLive[id] = tombs[id]; }

    if (this.old) {
      // OLD client: no watermark handling, no watermark-based GC (only live-id
      // pruning) — exactly the pre-watermark behavior. It must still crash-free
      // consume a NEW snapshot that carries a watermarks field.
      this.items = merged;
      this.tombs = afterLive;
      return this;
    }

    // NEW client: union watermarks, advance own mark, retire stale devices, GC.
    const serverWm = readWatermarks(serverSnap && serverSnap.watermarks);
    let wm = mergeWatermarks(this.wm, serverWm);
    let highestDeleted = 0;
    for (const tid in tombs) { if (Object.prototype.hasOwnProperty.call(tombs, tid) && tombs[tid] > highestDeleted) highestDeleted = tombs[tid]; }
    wm[this.id] = Math.max(wm[this.id] || 0, now, highestDeleted);
    wm = pruneWatermarks(wm, now, this.staleMs);

    this.items = merged;
    this.tombs = pruneTombstones(afterLive, wm, { now, minRetainMs: this.minRetainMs });
    this.wm = wm;
    return this;
  }
  // A real sync: pull-then-push (push is a full-snapshot overwrite of the server).
  sync(server, now, dirty) {
    this.pull(server.snap, now, dirty);
    server.snap = this.snapshot();
    return this;
  }
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

console.log('Scenario 6: a device records its watermark and GCs its own acknowledged tombstone');
{
  // minRetainMs:0 isolates the watermark rule from the fresh-tombstone grace window.
  const A = new Device('A', { minRetainMs: 0 });
  A.save({ type: 'receipt', key: 1, title: 'x' }, 100);
  A.remove('receipt', 1, 200);          // tombstone deletedAt=200
  const srv = new Server();
  A.sync(srv, 1000);                     // pull(empty) + push
  check('device records its own watermark on pull', A.wm['A'] === 1000);
  check('single device GCs a tombstone it has synced past', A.tombs[idOf('receipt', 1)] === undefined);
  check('the deleted item stays gone after GC', A.has('receipt', 1) === false);
  check('pushed snapshot carries watermarks', !!srv.snap.watermarks && srv.snap.watermarks['A'] === 1000);
}

console.log('Scenario 7: a tombstone is kept until BOTH devices sync past it, then GCd — no resurrection');
{
  const srv = new Server();
  const A = new Device('A', { minRetainMs: 0 });
  const B = new Device('B', { minRetainMs: 0 });
  const qid = idOf('issue', 'q');

  A.save({ type: 'issue', key: 'q', title: 'Q' }, 100);
  A.sync(srv, 150);                      // server: items[q], wm{A:150}
  B.sync(srv, 200);                      // B pulls q; wm{A:150,B:200}
  check('B received the shared item', B.has('issue', 'q'));

  A.remove('issue', 'q', 500);           // A deletes at 500
  A.sync(srv, 600, true);
  check('tombstone kept while B is behind', srv.snap.tombstones[qid] === 500);
  check('A dropped the item', A.has('issue', 'q') === false);
  check('B still holds the soon-to-be-deleted item', B.has('issue', 'q'));

  B.sync(srv, 700);                      // B comes back — must SEE the deletion
  check('B applies the deletion on return (no resurrection)', B.has('issue', 'q') === false);
  check('tombstone GCd once both devices synced past it', srv.snap.tombstones[qid] === undefined);

  A.sync(srv, 800);                      // server now has neither item nor tombstone
  check('no resurrection on A after GC', A.has('issue', 'q') === false);
  check('no resurrection on server after GC', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === qid));
}

console.log('Scenario 8: a long-offline device (within the horizon) still receives an old deletion');
{
  const srv = new Server();
  const A = new Device('A', { minRetainMs: 0 });
  const B = new Device('B', { minRetainMs: 0 });
  const rid = idOf('receipt', 9);

  A.save({ type: 'receipt', key: 9, title: 'HB9' }, 1000);
  A.sync(srv, 1000);
  B.sync(srv, 1000);                     // both hold it; wm{A:1000,B:1000}

  A.remove('receipt', 9, 5000);
  A.sync(srv, 5000, true);               // tombstone deletedAt=5000
  // A keeps syncing for a long time while B stays offline.
  for (const t of [10000, 20000, 50000, 100000]) A.sync(srv, t);
  check('tombstone survives many A-only syncs while B is behind', srv.snap.tombstones[rid] === 5000);
  check('offline B still holds the item', B.has('receipt', 9));

  B.sync(srv, 120000);                   // B returns, still within WM_STALE_MS
  check('long-offline B receives the deletion (no resurrection)', B.has('receipt', 9) === false);
  check('tombstone GCd only after the straggler caught up', srv.snap.tombstones[rid] === undefined);
}

console.log('Scenario 9: pruneTombstones must never drop a tombstone a lagging device has not seen');
{
  const rid = idOf('receipt', 42);
  const tombs = { [rid]: 5000 };
  // B is behind (1000 < 5000) and still holds the item — dropping now would let B
  // resurrect it. GC must refuse.
  const kept = pruneTombstones(tombs, { A: 9000, B: 1000 }, { now: 9000, minRetainMs: 0 });
  check('GC refuses while any known device is behind', kept[rid] === 5000);
  const dropped = pruneTombstones(tombs, { A: 9000, B: 6000 }, { now: 9000, minRetainMs: 0 });
  check('GC drops only once every device passed it', dropped[rid] === undefined);
  // A brand-new device has no watermark entry, but also no items → cannot
  // resurrect. With zero known devices GC still refuses (nothing proven), which
  // is the safe default for a first-ever sync.
  const none = pruneTombstones(tombs, {}, { now: 9000, minRetainMs: 0 });
  check('empty watermark set keeps tombstones (nothing proven yet)', none[rid] === 5000);
}

console.log('Scenario 10: stale devices are retired so a dead device cannot block GC forever');
{
  const rid = idOf('issue', 'x');
  const now = 100000, staleMs = 50000;

  // C last synced at 1000 → silent 99000 > 50000 → retired; A is active.
  const retired = pruneWatermarks({ A: 90000, C: 1000 }, now, staleMs);
  check('a long-dead device is dropped from the watermark map', retired.C === undefined && retired.A === 90000);
  check('tombstone becomes GC-able once only live devices remain',
    pruneTombstones({ [rid]: 5000 }, retired, { now, minRetainMs: 0 })[rid] === undefined);

  // A device silent LESS than the horizon is retained — and if it is behind a
  // deletion, it still blocks GC (this is exactly what protects Scenario 8's straggler).
  const fresh = pruneWatermarks({ A: 90000, C: 70000 }, now, staleMs);   // C silent 30000 < 50000
  check('a recently-seen device is retained', fresh.C === 70000);
  check('a retained-but-behind device still blocks GC',
    pruneTombstones({ [rid]: 75000 }, fresh, { now, minRetainMs: 0 })[rid] === 75000);
}

console.log('Scenario 11: backward compatibility — legacy snapshots and watermark normalization');
{
  check('missing watermarks normalize to {}', JSON.stringify(readWatermarks(undefined)) === '{}');
  check('null watermarks normalize to {}', JSON.stringify(readWatermarks(null)) === '{}');
  const w = readWatermarks({ A: 'not-a-number', B: 5, C: 3 });
  check('non-finite watermark entries are dropped', w.A === undefined && w.B === 5 && w.C === 3);

  // A NEW client consumes an OLD (v2, watermark-free) snapshot without crashing,
  // still applies its tombstones, and initialises its own watermark.
  const legacy = {
    key: 'saved', version: 2,
    items: [{ type: 'receipt', key: 3, title: 'old', savedAt: 100 }],
    tombstones: { [idOf('receipt', 5)]: 400 },
  };
  const N = new Device('N', { minRetainMs: 0 });
  N.save({ type: 'receipt', key: 5, title: 'doomed' }, 100);   // N still holds a legacy-tombstoned item
  N.pull(legacy, 500, true);
  check('new client adopts items from a legacy snapshot', N.has('receipt', 3) === true);
  check('legacy tombstone still deletes on the new client', N.has('receipt', 5) === false);
  check('new client initialises its watermark from a legacy pull', N.wm['N'] === 500);
}

console.log('Scenario 12: mixed old + new clients interoperate; the grace window protects the untracked old client');
{
  const srv = new Server();
  const oldC = new Device('OLD', { old: true });
  const newC = new Device('NEW', { minRetainMs: 0 });
  const kid = idOf('issue', 'k');

  newC.save({ type: 'issue', key: 'k', title: 'K' }, 1000);
  newC.sync(srv, 1000);                  // server v3, wm{NEW:1000}
  oldC.sync(srv, 1200);                  // OLD pulls (ignores wm), pushes v2 → wipes wm
  check('old client received the new item', oldC.has('issue', 'k'));
  check("old client's full-snapshot push wipes watermarks (safe direction)", srv.snap.watermarks === undefined);

  oldC.remove('issue', 'k', 2000);       // OLD deletes
  oldC.sync(srv, 2200);
  newC.sync(srv, 2500);                  // NEW must still learn the deletion
  check("new client applies an old client's deletion", newC.has('issue', 'k') === false);
  check('new client re-establishes its own watermark after a wipe', !!srv.snap.watermarks && srv.snap.watermarks['NEW'] === 2500);
  check('no resurrection of the old client\'s deletion', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === kid));

  // The grace window is what keeps an UNTRACKED old client safe: a fresh tombstone
  // is retained even when every KNOWN (new) device has already passed it, giving
  // an old client that syncs at least once per window time to apply the deletion
  // before GC can collect it.
  const srv2 = new Server();
  const GRACE = 1000;                    // small stand-in for TOMB_MIN_RETAIN_MS
  const oldD = new Device('OLD2', { old: true });
  const newD = new Device('NEW2', { minRetainMs: GRACE });
  const mid = idOf('receipt', 'm');

  newD.save({ type: 'receipt', key: 'm', title: 'M' }, 100);
  newD.sync(srv2, 100);
  oldD.sync(srv2, 120);                  // OLD2 now also holds m
  check('both clients hold the shared item', newD.has('receipt', 'm') && oldD.has('receipt', 'm'));

  newD.remove('receipt', 'm', 200);      // NEW deletes; NEW is the only KNOWN device
  newD.sync(srv2, 250, true);
  check('grace window keeps a fresh tombstone despite full known-device coverage', srv2.snap.tombstones[mid] === 200);

  oldD.sync(srv2, 400);                  // OLD2 syncs inside the grace window
  check('old client applies the deletion inside the grace window', oldD.has('receipt', 'm') === false);
  check('no resurrection: the shared item is gone from the server', !(srv2.snap.items || []).some((x) => idOf(x.type, x.key) === mid));
}

console.log('');
if (failures) { console.error(failures + ' assertion(s) FAILED'); process.exit(1); }
console.log('All merge simulations passed.');
