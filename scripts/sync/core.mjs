/**
 * PDXSyncCore — the collection-agnostic sync foundation (importable ES module).
 *
 * This is the SINGLE, reusable core every PolitiDex synced collection builds on:
 * tombstone-aware, watermark-GC'd, field-level-merge sync that is entirely
 * independent of what a collection stores. "saved" (note/tags), "team"
 * (name/slots + singletons) and any future collection (Evidence, Spotlight, …)
 * are thin wrappers that supply a small config + a storage adapter and delegate
 * every merge/reconcile decision here.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM index.html
 *   The production core is an inline classic <script> in index.html (window.
 *   PDXSyncCore) because the collections that use it are also inline scripts that
 *   run at parse time. A browser inline script can't be `import`-ed by the Node
 *   simulations, so this module is a byte-for-byte-equivalent MIRROR of that inline
 *   core — keep the two in sync. The simulations (scripts/sync-*-merge-sim.mjs and
 *   the generic harness) import THIS file so the exact same logic is what gets
 *   verified.
 *
 * THE COLLECTION-CONFIG CONTRACT — what a new collection provides:
 *   createCollection({
 *     idOf:   (type, key) => string,   // stable identity; defaults to `${type}::${key}`
 *     fields: [                         // independently-mergeable fields (may be [])
 *       { field: 'note', tsField: 'noteUpdatedAt' },
 *       …
 *     ],
 *   })
 *   → a bound collection object exposing idOf, mergeOne, mergeItems, reconcile,
 *     sameItems, plus every pure core helper. That + a storage adapter + (optionally)
 *     a set of singletons is ALL a collection needs for full cross-device sync.
 */

export const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Default stable identity for an item: its type + key. A collection may override
// this (see createCollection) to preserve a pre-existing identity convention.
export const idOf = (type, key) =>
  String(type == null ? '' : type) + '::' + String(key == null ? '' : key);

// A device silent longer than this is RETIRED (its watermark dropped) so a dead
// device can't block tombstone GC forever. Far beyond any realistic offline stretch.
export const WM_STALE_MS = 1000 * 60 * 60 * 24 * 180;      // 180 days
// A tombstone younger than this is never pruned regardless of watermarks — a grace
// window so any device that syncs at least this often (including an OLD client that
// reports no watermark) reliably applies the deletion before it can be collected.
export const TOMB_MIN_RETAIN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// ── Tombstones ──────────────────────────────────────────────────────────────
// Normalize whatever `tombstones` shape we find into a clean `{ id: deletedAt }`
// map. Tolerates absent/null (legacy → {}), a map { id:number }, or a defensive
// array [{id,deletedAt}]. Non-finite deletedAt dropped; newest (max) per id.
export function readTombs(raw) {
  const out = {};
  if (!raw) return out;
  const add = (id, d) => {
    if (id == null) return;
    const n = Number(d);
    if (!isFinite(n)) return;
    id = String(id);
    if (!hasOwn(out, id) || n > out[id]) out[id] = n;
  };
  if (Array.isArray(raw)) { for (const t of raw) { if (t) add(t.id, t.deletedAt); } }
  else if (typeof raw === 'object') { for (const k in raw) { if (hasOwn(raw, k)) add(k, raw[k]); } }
  return out;
}

// Newest-per-key union, used for BOTH tombstone maps ({id:deletedAt}) and
// watermark maps ({deviceId:ms}) — last-write-wins on a plain number map.
export function mergeMap(a, b) {
  const out = {};
  for (const ka in a) { if (hasOwn(a, ka)) out[ka] = a[ka]; }
  for (const kb in b) {
    if (!hasOwn(b, kb)) continue;
    if (!hasOwn(out, kb) || b[kb] > out[kb]) out[kb] = b[kb];
  }
  return out;
}
export const mergeTombstones = mergeMap;
export const mergeWatermarks = mergeMap;

// ── Watermarks ──────────────────────────────────────────────────────────────
// Normalize a `watermarks` shape into a clean `{ deviceId: ms }` map. Absent/null/
// legacy → {}. Non-finite dropped; newest (max) per id.
export function readWatermarks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k in raw) {
    if (!hasOwn(raw, k)) continue;
    const n = Number(raw[k]);
    if (!isFinite(n)) continue;
    const id = String(k);
    if (!hasOwn(out, id) || n > out[id]) out[id] = n;
  }
  return out;
}
// Retire devices silent past the horizon so a dead device can't block GC forever
// and the map stays bounded. Conservative: the horizon dwarfs any realistic
// offline period, so a merely long-offline device is retained (still protected).
export function pruneWatermarks(watermarks, now, staleMs) {
  if (staleMs == null) staleMs = WM_STALE_MS;
  const out = {};
  for (const id in watermarks) {
    if (!hasOwn(watermarks, id)) continue;
    if (now != null && (now - watermarks[id]) > staleMs) continue;   // forgotten
    out[id] = watermarks[id];
  }
  return out;
}
// Safe, watermark-based tombstone GC. Drops a tombstone ONLY when every known
// device has synced strictly past it (non-empty watermarks, all > deletedAt). If
// any known device is behind, or there are none, the tombstone is KEPT — so an
// offline device still receives the deletion on return and never resurrects. A
// tombstone younger than minRetainMs is always kept (grace window).
export function pruneTombstones(tombs, watermarks, opts) {
  opts = opts || {};
  const now = opts.now;
  const minRetainMs = opts.minRetainMs != null ? opts.minRetainMs : TOMB_MIN_RETAIN_MS;
  const devices = Object.keys(watermarks || {});
  const kept = {};
  for (const id in tombs) {
    if (!hasOwn(tombs, id)) continue;
    const d = tombs[id];
    if (now != null && (now - d) < minRetainMs) { kept[id] = d; continue; }   // grace window
    let allPast = devices.length > 0;   // zero known devices → cannot prove → keep
    for (let i = 0; i < devices.length; i++) {
      if (!(watermarks[devices[i]] > d)) { allPast = false; break; }
    }
    if (!allPast) kept[id] = d;
  }
  return kept;
}

// ── Cheap no-op detectors ────────────────────────────────────────────────────
export function sameMap(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) { if (a[ka[i]] !== b[ka[i]]) return false; }
  return true;
}
// Order-independent deep equality on two item lists, parameterized by idOf.
export function makeSameItems(id) {
  return function (a, b) {
    if (a.length !== b.length) return false;
    const canon = (items) => {
      const arr = items.slice().sort((x, y) => {
        const ix = id(x.type, x.key), iy = id(y.type, y.key);
        return ix < iy ? -1 : (ix > iy ? 1 : 0);
      });
      try { return JSON.stringify(arr); } catch (e) { return null; }
    };
    const ca = canon(a), cb = canon(b);
    return ca !== null && ca === cb;
  };
}

// ── Field-level merge, generalized over a field spec ─────────────────────────
// Effective per-field edit time: the field's own stamp when present, else savedAt.
export function fieldTime(x, tsField) { return x[tsField] != null ? x[tsField] : (x.savedAt || 0); }
// Is a merged field value "empty" (and therefore dropped)? Covers cleared string,
// empty array, and empty object/map.
export function isEmptyField(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}
// Choose the winning copy for ONE field between two versions of the same item.
//   • If exactly ONE side carries an explicit stamp, that side edited the field
//     and wins — the guard that stops the OTHER field's edit (which also bumped
//     savedAt) from masquerading as a newer edit of THIS field.
//   • Otherwise higher time wins; a tie keeps the LOCAL edit while dirty.
export function pickField(local, server, tsField, dirty) {
  const lHas = local[tsField] != null, sHas = server[tsField] != null;
  if (lHas && !sHas) return local;
  if (sHas && !lHas) return server;
  const lt = fieldTime(local, tsField), st = fieldTime(server, tsField);
  if (lt > st) return local;
  if (st > lt) return server;
  return dirty ? local : server;
}
// Build the { mergeOne, mergeItems } pair for a given field spec + idOf. An empty
// spec collapses to plain whole-item last-write-wins.
export function makeFieldMerger(fields, id) {
  const spec = fields || [];
  id = id || idOf;
  // Merge two copies of the SAME item id, resolving each spec'd field independently.
  function mergeOne(local, server, dirty) {
    const ls = local.savedAt || 0, ss = server.savedAt || 0;
    const base = (ss > ls || (ss === ls && !dirty)) ? server : local;
    const out = {};
    for (const k in base) { if (hasOwn(base, k)) out[k] = base[k]; }
    let maxT = 0;
    for (let i = 0; i < spec.length; i++) {
      const f = spec[i].field, ts = spec[i].tsField;
      const src = pickField(local, server, ts, dirty);
      if (!isEmptyField(src[f])) out[f] = src[f]; else delete out[f];
      if (src[ts] != null) out[ts] = src[ts]; else delete out[ts];
      const t = fieldTime(src, ts);
      if (t > maxT) maxT = t;
    }
    out.savedAt = maxT || 0;
    return out;
  }
  // Union two item lists by identity (local first), field-merging shared ids, then
  // drop any id whose tombstone is at-or-newer than the item's savedAt.
  function mergeItems(localItems, serverItems, opts) {
    opts = opts || {};
    const dirty = !!opts.dirty;
    const tombs = opts.tombstones || {};
    localItems = Array.isArray(localItems) ? localItems : [];
    serverItems = Array.isArray(serverItems) ? serverItems : [];
    const byId = {}, order = [];
    const put = (rec) => { const i = id(rec.type, rec.key); if (!hasOwn(byId, i)) order.push(i); byId[i] = rec; };
    for (const l of localItems) { if (l && l.type != null && l.key != null) put(l); }
    for (const s of serverItems) {
      if (!s || s.type == null || s.key == null) continue;
      const sid = id(s.type, s.key);
      const loc = hasOwn(byId, sid) ? byId[sid] : null;
      if (!loc) { put(s); continue; }
      put(mergeOne(loc, s, dirty));
    }
    const merged = [];
    for (const i of order) {
      const rec = byId[i];
      if (hasOwn(tombs, i)) { if (!((rec.savedAt || 0) > tombs[i])) continue; }
      merged.push(rec);
    }
    return merged;
  }
  return { mergeOne, mergeItems };
}

// ── Singletons: scalar / whole-map state with no resurrection hazard ─────────
// Not tombstoned. dirty (un-pushed local edits) → keep LOCAL; clean → adopt the
// server's if it has any, else keep local.
export function mergeSingletons(local, server, dirty) {
  if (dirty) return local;
  return (server && typeof server === 'object') ? server : local;
}

// ── The generic pull-side reconcile (pure — touches no storage) ──────────────
// Runs the whole flow both collections share and returns the new state:
//   1. union both sides' tombstones (newest per id) and watermarks (forward-only)
//   2. field-merge items against the unioned tombstones, newest-first
//   3. advance THIS device's own watermark to now (and past the newest deletion
//      seen — a clock-skew guard), then retire stale devices
//   4. drop tombstones that survived as live items AND those every known device
//      has synced strictly past (watermark GC)
export function reconcile(input) {
  input = input || {};
  const now = input.now;
  const myDevice = input.deviceId;
  const id = input.idOf || idOf;
  const mergeItems = input.mergeItems;
  const localItems = Array.isArray(input.localItems) ? input.localItems : [];
  const serverItems = Array.isArray(input.serverItems) ? input.serverItems : [];

  const tombs = mergeMap(input.localTombs || {}, input.serverTombs || {});
  const merged = mergeItems(localItems, serverItems, { dirty: input.dirty, tombstones: tombs });
  merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

  let wm = mergeMap(input.localWm || {}, input.serverWm || {});
  let highestDeleted = 0;
  for (const tid in tombs) { if (hasOwn(tombs, tid) && tombs[tid] > highestDeleted) highestDeleted = tombs[tid]; }
  wm[myDevice] = Math.max(wm[myDevice] || 0, now, highestDeleted);
  wm = pruneWatermarks(wm, now, input.staleMs);

  const liveIds = {};
  for (const m of merged) liveIds[id(m.type, m.key)] = 1;
  const afterLive = {};
  for (const tid in tombs) { if (hasOwn(tombs, tid) && !liveIds[tid]) afterLive[tid] = tombs[tid]; }
  const prunedTombs = pruneTombstones(afterLive, wm, { now: now, minRetainMs: input.minRetainMs });

  return { items: merged, tombstones: prunedTombs, watermarks: wm };
}

// ── The collection factory — bind a config to the shared primitives ──────────
// Returns a ready-to-use collection object: the field merger + reconcile bound to
// this collection's idOf and field spec, plus every pure core helper.
export function createCollection(config) {
  config = config || {};
  const id = config.idOf || idOf;
  const merger = makeFieldMerger(config.fields || [], id);
  const sameItems = makeSameItems(id);
  return {
    idOf: id,
    fields: config.fields || [],
    mergeOne: merger.mergeOne,
    mergeItems: merger.mergeItems,
    sameItems,
    reconcile(input) {
      input = input || {};
      input.idOf = id;
      input.mergeItems = merger.mergeItems;
      return reconcile(input);
    },
    readTombs, mergeTombstones: mergeMap, pruneTombstones,
    readWatermarks, mergeWatermarks: mergeMap, pruneWatermarks,
    mergeSingletons, sameMap,
    WM_STALE_MS, TOMB_MIN_RETAIN_MS
  };
}

export default {
  hasOwn, idOf, WM_STALE_MS, TOMB_MIN_RETAIN_MS,
  readTombs, mergeMap, mergeTombstones, mergeWatermarks,
  readWatermarks, pruneWatermarks, pruneTombstones,
  sameMap, makeSameItems, fieldTime, isEmptyField, pickField,
  makeFieldMerger, mergeSingletons, reconcile, createCollection
};
