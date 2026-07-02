#!/usr/bin/env node
/**
 * Multi-device simulation for the PolitiDex "team" collection sync merge.
 *
 * The team collection now uses the SAME tombstone-aware, watermark-GC'd sync the
 * "saved" collection proved out (see scripts/sync-saved-merge-sim.mjs). This is a
 * runnable verification harness that MIRRORS the implementation inside the
 * PDXTeamSync IIFE in index.html (it can't be imported from that inlined module) —
 * keep them in sync with that source of truth.
 *
 * WHAT'S THE SAME AS SAVED
 *   • The watermark / tombstone GC core (readTombs, readWatermarks, the merge and
 *     prune helpers) is COLLECTION-AGNOSTIC — it operates on `{ id: deletedAt }` and
 *     `{ deviceId: ms }` maps and is byte-for-byte the saved logic. The real app
 *     REUSES the exact same helpers PDXSaved already exposes, rather than copying
 *     them; this file re-declares them only because a sim can't import the inlined
 *     module.
 *   • Field-level last-write-wins is the same shape as saved's note/tags merge,
 *     generalised over a FIELD SPEC so the one merge core serves both collections.
 *
 * WHAT DIFFERS FROM SAVED (team-specific)
 *   • Team unifies its two deletion-prone datasets into one item list:
 *       - roster politician  → { type:'pol',  key:pid, savedAt }              (no editable fields)
 *       - saved team         → { type:'team', key:id, name, slots, savedAt,
 *                                nameUpdatedAt, slotsUpdatedAt, createdAt }    (name + slots are the editable fields)
 *     So the field-level merge is over `name` (free-text, the note analog) and
 *     `slots` (a keyed map, the tags analog) instead of note/tags.
 *   • Team also carries ancillary SINGLETON state (the ballot map, Home Base
 *     snapshot, team mode, active-team pointer). Singletons are NOT tombstoned —
 *     a scalar/whole-map has no "resurrection" hazard — so they merge with a
 *     simple, safe dirty-aware last-write-wins (Scenario 13).
 *
 * Run:  node scripts/sync-team-merge-sim.mjs
 * Exits non-zero if any assertion fails.
 */

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ── Field-level merge core (generalised note/tags → any field spec) ─────────
// The team collection's editable fields. Each entry pairs a value field with its
// independent edit-time stamp, exactly like saved's { note, noteUpdatedAt } and
// { tags, tagsUpdatedAt }. A roster 'pol' item carries none of these, so the same
// merge falls through to plain whole-item last-write-wins for it (see mergeOne).
const TEAM_FIELDS = [
  { field: 'name',  tsField: 'nameUpdatedAt'  },  // free-text name  (the "note" analog)
  { field: 'slots', tsField: 'slotsUpdatedAt' },  // keyed pick map  (the "tags" analog)
];

const idOf = (type, key) => String(type) + '::' + String(key);

// Effective per-field edit time: the field's own stamp when present, else the
// item's savedAt (so a legacy stamp-free item behaves exactly as before).
function fieldTime(x, tsField) { return x[tsField] != null ? x[tsField] : (x.savedAt || 0); }

// Is a merged field value "empty" (and therefore dropped from the output)? Covers
// the string name ('' → cleared) and the slots map ({} → cleared).
function isEmptyField(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

// Choose the winning copy for ONE field between two versions of the same item.
//   • If exactly ONE side carries an explicit stamp, that side genuinely edited
//     the field and wins — the crucial guard that stops the OTHER field's edit
//     (which also bumped savedAt) from masquerading as a newer edit of THIS field.
//   • Otherwise higher time wins; a tie keeps the LOCAL edit while dirty.
function pickField(local, server, tsField, dirty) {
  const lHas = local[tsField] != null, sHas = server[tsField] != null;
  if (lHas && !sHas) return local;
  if (sHas && !lHas) return server;
  const lt = fieldTime(local, tsField), st = fieldTime(server, tsField);
  if (lt > st) return local;
  if (st > lt) return server;
  return dirty ? local : server;
}

// Merge two copies of the SAME item id into one, resolving each spec'd field
// independently. All non-field data comes from the overall newer copy;
// savedAt becomes the newest chosen field time (keeps tombstone precedence exact).
function mergeOne(local, server, dirty, spec) {
  spec = spec || TEAM_FIELDS;
  const ls = local.savedAt || 0, ss = server.savedAt || 0;
  const base = (ss > ls || (ss === ls && !dirty)) ? server : local;
  const out = {};
  for (const k in base) { if (hasOwn(base, k)) out[k] = base[k]; }

  let maxT = 0;
  for (let i = 0; i < spec.length; i++) {
    const field = spec[i].field, tsField = spec[i].tsField;
    const src = pickField(local, server, tsField, dirty);
    if (!isEmptyField(src[field])) out[field] = src[field]; else delete out[field];
    if (src[tsField] != null) out[tsField] = src[tsField]; else delete out[tsField];
    const t = fieldTime(src, tsField);
    if (t > maxT) maxT = t;
  }
  // For an item with no spec'd fields (a 'pol' roster entry) maxT collapses to the
  // savedAt fallback, so out.savedAt is just the newer copy's savedAt.
  out.savedAt = Math.max(maxT, 0);
  return out;
}

function mergeItems(localItems, serverItems, opts) {
  opts = opts || {};
  const dirty = !!opts.dirty;
  const tombs = opts.tombstones || {};
  const spec = opts.spec || TEAM_FIELDS;
  localItems = Array.isArray(localItems) ? localItems : [];
  serverItems = Array.isArray(serverItems) ? serverItems : [];

  const byId = {}, order = [];
  function put(rec) {
    const id = idOf(rec.type, rec.key);
    if (!hasOwn(byId, id)) order.push(id);
    byId[id] = rec;
  }
  for (const l of localItems) { if (l && l.type != null && l.key != null) put(l); }
  for (const s of serverItems) {
    if (!s || s.type == null || s.key == null) continue;
    const sid = idOf(s.type, s.key);
    const local = hasOwn(byId, sid) ? byId[sid] : null;
    if (!local) { put(s); continue; }
    put(mergeOne(local, s, dirty, spec));
  }

  const merged = [];
  for (const id of order) {
    const rec = byId[id];
    if (hasOwn(tombs, id)) {
      if (!((rec.savedAt || 0) > tombs[id])) continue;   // tombstone wins ties + older
    }
    merged.push(rec);
  }
  return merged;
}

// ── Collection-agnostic tombstone / watermark GC (IDENTICAL to saved) ───────
// The real app reuses PDXSaved's exposed helpers for these; re-declared here only
// because a sim can't import the inlined module. Keep byte-for-byte equivalent.
const WM_STALE_MS = 1000 * 60 * 60 * 24 * 180;      // 180 days
const TOMB_MIN_RETAIN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function readTombs(raw) {
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
function readWatermarks(raw) {
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
function mergeMap(a, b) {   // newest-per-key union (used for tombstones + watermarks)
  const out = {};
  for (const ka in a) { if (hasOwn(a, ka)) out[ka] = a[ka]; }
  for (const kb in b) {
    if (!hasOwn(b, kb)) continue;
    if (!hasOwn(out, kb) || b[kb] > out[kb]) out[kb] = b[kb];
  }
  return out;
}
const mergeTombstones = mergeMap;
const mergeWatermarks = mergeMap;
function pruneWatermarks(watermarks, now, staleMs) {
  if (staleMs == null) staleMs = WM_STALE_MS;
  const out = {};
  for (const id in watermarks) {
    if (!hasOwn(watermarks, id)) continue;
    if (now != null && (now - watermarks[id]) > staleMs) continue;   // retired
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

// ── Singletons: ancillary team state (ballot / home base / mode / active) ───
// Not tombstoned: a scalar or whole-map replacement can't "resurrect" a deleted
// list item, so a simple dirty-aware last-write-wins is safe and needs no stamps.
//   • dirty (un-pushed local edits present) → keep LOCAL (freshest local intent)
//   • clean → adopt the SERVER's singletons if it has any (brings another device's
//     ballot/mode/home down), else keep local.
function mergeSingletons(local, server, dirty) {
  if (dirty) return local;
  return (server && typeof server === 'object') ? server : local;
}

// A full two-way reconcile of two devices' state — matches reconcileFromServer():
// union tombstones + watermarks, field-merge items against them, advance own
// watermark, retire stale devices, then GC tombstones.
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Device / Server model ────────────────────────────────────────────────────
class Server { constructor() { this.snap = null; } }

class Device {
  constructor(id, opts) {
    this.id = id;
    this.items = [];
    this.tombs = {};
    this.wm = {};
    this.singletons = { ballot: {}, homeBase: null, mode: 'research', activeTeam: null };
    this.old = !!(opts && opts.old);
    this.staleMs = (opts && opts.staleMs != null) ? opts.staleMs : WM_STALE_MS;
    this.minRetainMs = (opts && opts.minRetainMs != null) ? opts.minRetainMs : TOMB_MIN_RETAIN_MS;
  }
  _find(type, key) { const id = idOf(type, key); return this.items.findIndex((x) => idOf(x.type, x.key) === id); }
  // Add/refresh a roster politician (no editable fields).
  addPol(pid, t) { return this._upsert({ type: 'pol', key: pid }, t); }
  // Add/refresh a saved team, optionally stamping a field edit.
  addTeam(id, data, t) { return this._upsert(Object.assign({ type: 'team', key: id }, data), t); }
  _upsert(item, t) {
    const id = idOf(item.type, item.key);
    const i = this._find(item.type, item.key);
    const rec = Object.assign({}, i === -1 ? {} : this.items[i], item, { savedAt: t });
    if (i === -1) this.items.push(rec); else this.items[i] = rec;
    if (hasOwn(this.tombs, id)) delete this.tombs[id];    // re-save clears tombstone
    return this;
  }
  editName(id, name, t) {
    const i = this._find('team', id); if (i === -1) return this;
    if (name) this.items[i].name = name; else delete this.items[i].name;
    this.items[i].nameUpdatedAt = t; this.items[i].savedAt = t; return this;
  }
  editSlots(id, slots, t) {
    const i = this._find('team', id); if (i === -1) return this;
    if (slots && Object.keys(slots).length) this.items[i].slots = slots; else delete this.items[i].slots;
    this.items[i].slotsUpdatedAt = t; this.items[i].savedAt = t; return this;
  }
  remove(type, key, t) {
    const id = idOf(type, key);
    this.items = this.items.filter((x) => idOf(x.type, x.key) !== id);
    this.tombs[id] = t;
    return this;
  }
  setSingletons(s) { this.singletons = Object.assign({}, this.singletons, s); return this; }
  has(type, key) { return this.items.some((x) => x.type === type && x.key === key); }
  get(type, key) { const i = this._find(type, key); return i === -1 ? null : this.items[i]; }
  snapshot() {
    // An OLD client carries NO watermarks (and no singletons block) — a push is a
    // full-snapshot overwrite, so an old client pushing wipes watermarks from the
    // server; new clients then re-establish them (the safe, conservative direction).
    return this.old
      ? { key: 'team', version: 1, items: clone(this.items), tombstones: clone(this.tombs) }
      : { key: 'team', version: 2, items: clone(this.items), tombstones: clone(this.tombs),
          watermarks: clone(this.wm), singletons: clone(this.singletons) };
  }
  pull(serverSnap, now, dirty) {
    const serverItems = (serverSnap && Array.isArray(serverSnap.items)) ? serverSnap.items : [];
    const serverTombs = readTombs(serverSnap && serverSnap.tombstones);
    const tombs = mergeTombstones(this.tombs, serverTombs);
    const merged = mergeItems(this.items, serverItems, { dirty: !!dirty, tombstones: tombs });
    merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    const liveIds = {};
    for (const m of merged) liveIds[idOf(m.type, m.key)] = 1;
    const afterLive = {};
    for (const id in tombs) { if (hasOwn(tombs, id) && !liveIds[id]) afterLive[id] = tombs[id]; }

    // Singletons: adopt the server's when this device has no un-pushed edits.
    if (serverSnap && serverSnap.singletons) {
      this.singletons = mergeSingletons(this.singletons, serverSnap.singletons, !!dirty);
    }

    if (this.old) {
      // OLD client: no watermark handling, only live-id pruning (pre-watermark
      // behavior). Must still crash-free consume a NEW snapshot carrying watermarks.
      this.items = merged;
      this.tombs = afterLive;
      return this;
    }

    const serverWm = readWatermarks(serverSnap && serverSnap.watermarks);
    let wm = mergeWatermarks(this.wm, serverWm);
    let highestDeleted = 0;
    for (const tid in tombs) { if (hasOwn(tombs, tid) && tombs[tid] > highestDeleted) highestDeleted = tombs[tid]; }
    wm[this.id] = Math.max(wm[this.id] || 0, now, highestDeleted);
    wm = pruneWatermarks(wm, now, this.staleMs);

    this.items = merged;
    this.tombs = pruneTombstones(afterLive, wm, { now, minRetainMs: this.minRetainMs });
    this.wm = wm;
    return this;
  }
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

// A stand-alone reconcile of two raw states (items + tombs) for the field-merge
// scenarios, mirroring the item half of pull() without the device bookkeeping.
function reconcile(local, server, dirty) {
  const tombs = mergeTombstones(local.tombs || {}, server.tombs || {});
  const merged = mergeItems(local.items || [], server.items || [], { dirty, tombstones: tombs });
  merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const live = {};
  for (const m of merged) live[idOf(m.type, m.key)] = 1;
  const prunedTombs = {};
  for (const id in tombs) { if (hasOwn(tombs, id) && !live[id]) prunedTombs[id] = tombs[id]; }
  return { items: merged, tombs: prunedTombs };
}
const get1 = (arr, type, key) => arr.find((x) => x.type === type && x.key === key) || null;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Scenarios ───────────────────────────────────────────────────────────────
console.log('Scenario 1: A edits a saved team\'s NAME only, B edits its SLOTS only → combined result');
{
  const T0 = 1000;
  const seed = { type: 'team', key: 'saved_x', name: 'My Slate', slots: { senate: 'p1' }, createdAt: T0, savedAt: T0 };
  const A = { ...seed, name: 'Reform Slate', nameUpdatedAt: 1100, savedAt: 1100 };
  const B = { ...seed, slots: { senate: 'p1', house: 'p2' }, slotsUpdatedAt: 1200, savedAt: 1200 };

  const onA = reconcile({ items: [A] }, { items: [B] }, true);
  const onB = reconcile({ items: [B] }, { items: [A] }, true);
  const ra = get1(onA.items, 'team', 'saved_x');
  const rb = get1(onB.items, 'team', 'saved_x');

  check('A keeps its renamed name', ra.name === 'Reform Slate', JSON.stringify(ra));
  check('A gains B\'s slots', eq(ra.slots, { senate: 'p1', house: 'p2' }));
  check('B keeps its slots', eq(rb.slots, { senate: 'p1', house: 'p2' }));
  check('B gains A\'s name', rb.name === 'Reform Slate', JSON.stringify(rb));
  check('both devices converge', eq(ra, rb));
  check('savedAt is the newer field edit', ra.savedAt === 1200, 'got ' + ra.savedAt);
  check('field stamps preserved', ra.nameUpdatedAt === 1100 && ra.slotsUpdatedAt === 1200);
  check('createdAt carried through', ra.createdAt === T0);
}

console.log('Scenario 2: delete beats a concurrent field edit → tombstone wins; a later edit resurrects');
{
  const seed = { type: 'team', key: 's1', name: 'Slate', slots: { a: 'x' }, savedAt: 2000 };
  const A = { ...seed, name: 'Renamed', nameUpdatedAt: 2100, savedAt: 2100 };
  const Btombs = { [idOf('team', 's1')]: 2200 };

  const onA = reconcile({ items: [A] }, { items: [], tombs: Btombs }, true);
  check('saved team is deleted', get1(onA.items, 'team', 's1') === null);
  check('tombstone retained (no live item)', onA.tombs[idOf('team', 's1')] === 2200);

  const Alater = { ...seed, name: 'Renamed', nameUpdatedAt: 2300, savedAt: 2300 };
  const onA2 = reconcile({ items: [Alater] }, { items: [], tombs: Btombs }, true);
  check('edit strictly newer than delete survives', get1(onA2.items, 'team', 's1') !== null);
}

console.log('Scenario 3: re-adding a previously deleted politician clears its tombstone');
{
  const id = idOf('pol', 'pol-42');
  const Btombs = { [id]: 3000 };
  const A = { type: 'pol', key: 'pol-42', savedAt: 3500 };   // re-added fresh
  const onA = reconcile({ items: [A], tombs: {} }, { items: [], tombs: Btombs }, true);
  check('resurrected politician is present', get1(onA.items, 'pol', 'pol-42') !== null);
  check('stale tombstone pruned', onA.tombs[id] === undefined);
}

console.log('Scenario 4: backward compatibility with legacy (stamp-free) saved teams');
{
  const legacyOld = { type: 'team', key: 't1', name: 'old', slots: { a: 'x' }, savedAt: 5000 };
  const legacyNew = { type: 'team', key: 't1', name: 'new', slots: { b: 'y' }, savedAt: 5500 };
  const clean = reconcile({ items: [legacyOld] }, { items: [legacyNew] }, false);
  const r = get1(clean.items, 'team', 't1');
  check('newer legacy copy wins whole item', r.name === 'new' && eq(r.slots, { b: 'y' }));
  check('no phantom stamps added', r.nameUpdatedAt === undefined && r.slotsUpdatedAt === undefined);

  // Legacy name + a new-format slots-only edit: both survive.
  const legacyA = { type: 'team', key: 't2', name: 'keepme', savedAt: 6000 };
  const newB = { type: 'team', key: 't2', name: 'keepme', slots: { z: 'q' }, slotsUpdatedAt: 6100, savedAt: 6100 };
  const mix = reconcile({ items: [legacyA] }, { items: [newB] }, true);
  const r2 = get1(mix.items, 'team', 't2');
  check('legacy name preserved through a slots-only edit', r2.name === 'keepme' && eq(r2.slots, { z: 'q' }));
}

console.log('Scenario 5: same-field edits still race (later stamp wins)');
{
  const A = { type: 'team', key: 'ed', name: 'first', nameUpdatedAt: 7000, savedAt: 7000 };
  const B = { type: 'team', key: 'ed', name: 'second', nameUpdatedAt: 7100, savedAt: 7100 };
  const r = get1(reconcile({ items: [A] }, { items: [B] }, true).items, 'team', 'ed');
  check('later name edit wins', r.name === 'second' && r.nameUpdatedAt === 7100);
}

console.log('Scenario 6: a device records its watermark and GCs its own acknowledged tombstone');
{
  const A = new Device('A', { minRetainMs: 0 });
  A.addPol('p1', 100);
  A.remove('pol', 'p1', 200);
  const srv = new Server();
  A.sync(srv, 1000);
  check('device records its own watermark on pull', A.wm['A'] === 1000);
  check('single device GCs a tombstone it has synced past', A.tombs[idOf('pol', 'p1')] === undefined);
  check('the deleted politician stays gone after GC', A.has('pol', 'p1') === false);
  check('pushed snapshot carries watermarks', !!srv.snap.watermarks && srv.snap.watermarks['A'] === 1000);
  check('pushed snapshot carries singletons', !!srv.snap.singletons);
}

console.log('Scenario 7: a tombstone is kept until BOTH devices sync past it, then GCd — no resurrection');
{
  const srv = new Server();
  const A = new Device('A', { minRetainMs: 0 });
  const B = new Device('B', { minRetainMs: 0 });
  const qid = idOf('team', 'q');

  A.addTeam('q', { name: 'Q', slots: { a: 'x' } }, 100);
  A.sync(srv, 150);
  B.sync(srv, 200);
  check('B received the shared saved team', B.has('team', 'q'));

  A.remove('team', 'q', 500);
  A.sync(srv, 600, true);
  check('tombstone kept while B is behind', srv.snap.tombstones[qid] === 500);
  check('A dropped the item', A.has('team', 'q') === false);
  check('B still holds the soon-to-be-deleted item', B.has('team', 'q'));

  B.sync(srv, 700);
  check('B applies the deletion on return (no resurrection)', B.has('team', 'q') === false);
  check('tombstone GCd once both devices synced past it', srv.snap.tombstones[qid] === undefined);

  A.sync(srv, 800);
  check('no resurrection on A after GC', A.has('team', 'q') === false);
  check('no resurrection on server after GC', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === qid));
}

console.log('Scenario 8: a long-offline device (within the horizon) still receives an old deletion');
{
  const srv = new Server();
  const A = new Device('A', { minRetainMs: 0 });
  const B = new Device('B', { minRetainMs: 0 });
  const rid = idOf('pol', 'p9');

  A.addPol('p9', 1000);
  A.sync(srv, 1000);
  B.sync(srv, 1000);

  A.remove('pol', 'p9', 5000);
  A.sync(srv, 5000, true);
  for (const t of [10000, 20000, 50000, 100000]) A.sync(srv, t);
  check('tombstone survives many A-only syncs while B is behind', srv.snap.tombstones[rid] === 5000);
  check('offline B still holds the politician', B.has('pol', 'p9'));

  B.sync(srv, 120000);
  check('long-offline B receives the deletion (no resurrection)', B.has('pol', 'p9') === false);
  check('tombstone GCd only after the straggler caught up', srv.snap.tombstones[rid] === undefined);
}

console.log('Scenario 9: pruneTombstones must never drop a tombstone a lagging device has not seen');
{
  const rid = idOf('pol', 'p42');
  const tombs = { [rid]: 5000 };
  const kept = pruneTombstones(tombs, { A: 9000, B: 1000 }, { now: 9000, minRetainMs: 0 });
  check('GC refuses while any known device is behind', kept[rid] === 5000);
  const dropped = pruneTombstones(tombs, { A: 9000, B: 6000 }, { now: 9000, minRetainMs: 0 });
  check('GC drops only once every device passed it', dropped[rid] === undefined);
  const none = pruneTombstones(tombs, {}, { now: 9000, minRetainMs: 0 });
  check('empty watermark set keeps tombstones (nothing proven yet)', none[rid] === 5000);
}

console.log('Scenario 10: stale devices are retired so a dead device cannot block GC forever');
{
  const rid = idOf('team', 'x');
  const now = 100000, staleMs = 50000;
  const retired = pruneWatermarks({ A: 90000, C: 1000 }, now, staleMs);
  check('a long-dead device is dropped from the watermark map', retired.C === undefined && retired.A === 90000);
  check('tombstone becomes GC-able once only live devices remain',
    pruneTombstones({ [rid]: 5000 }, retired, { now, minRetainMs: 0 })[rid] === undefined);

  const fresh = pruneWatermarks({ A: 90000, C: 70000 }, now, staleMs);
  check('a recently-seen device is retained', fresh.C === 70000);
  check('a retained-but-behind device still blocks GC',
    pruneTombstones({ [rid]: 75000 }, fresh, { now, minRetainMs: 0 })[rid] === 75000);
}

console.log('Scenario 11: backward compatibility — legacy snapshots and watermark normalization');
{
  check('missing watermarks normalize to {}', eq(readWatermarks(undefined), {}));
  check('null watermarks normalize to {}', eq(readWatermarks(null), {}));
  const w = readWatermarks({ A: 'not-a-number', B: 5, C: 3 });
  check('non-finite watermark entries are dropped', w.A === undefined && w.B === 5 && w.C === 3);

  // A NEW client consumes an OLD (v1, watermark-free, singleton-free) team snapshot
  // without crashing, still applies its tombstones, and initialises its watermark.
  const legacy = {
    key: 'team', version: 1,
    items: [{ type: 'pol', key: 'p3', savedAt: 100 }],
    tombstones: { [idOf('pol', 'p5')]: 400 },
  };
  const N = new Device('N', { minRetainMs: 0 });
  N.addPol('p5', 100);
  N.pull(legacy, 500, true);
  check('new client adopts items from a legacy snapshot', N.has('pol', 'p3') === true);
  check('legacy tombstone still deletes on the new client', N.has('pol', 'p5') === false);
  check('new client initialises its watermark from a legacy pull', N.wm['N'] === 500);
  check('new client survives a snapshot with no singletons block', N.singletons.mode === 'research');
}

console.log('Scenario 12: mixed old + new clients interoperate; the grace window protects the untracked old client');
{
  const srv = new Server();
  const oldC = new Device('OLD', { old: true });
  const newC = new Device('NEW', { minRetainMs: 0 });
  const kid = idOf('team', 'k');

  newC.addTeam('k', { name: 'K' }, 1000);
  newC.sync(srv, 1000);
  oldC.sync(srv, 1200);
  check('old client received the new saved team', oldC.has('team', 'k'));
  check("old client's full-snapshot push wipes watermarks (safe direction)", srv.snap.watermarks === undefined);

  oldC.remove('team', 'k', 2000);
  oldC.sync(srv, 2200);
  newC.sync(srv, 2500);
  check("new client applies an old client's deletion", newC.has('team', 'k') === false);
  check('new client re-establishes its own watermark after a wipe', !!srv.snap.watermarks && srv.snap.watermarks['NEW'] === 2500);
  check('no resurrection of the old client\'s deletion', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === kid));

  // Grace window keeps a fresh tombstone alive even when every KNOWN (new) device
  // has passed it, giving an untracked old client time to apply the deletion.
  const srv2 = new Server();
  const GRACE = 1000;
  const oldD = new Device('OLD2', { old: true });
  const newD = new Device('NEW2', { minRetainMs: GRACE });
  const mid = idOf('pol', 'm');

  newD.addPol('m', 100);
  newD.sync(srv2, 100);
  oldD.sync(srv2, 120);
  check('both clients hold the shared politician', newD.has('pol', 'm') && oldD.has('pol', 'm'));

  newD.remove('pol', 'm', 200);
  newD.sync(srv2, 250, true);
  check('grace window keeps a fresh tombstone despite full known-device coverage', srv2.snap.tombstones[mid] === 200);

  oldD.sync(srv2, 400);
  check('old client applies the deletion inside the grace window', oldD.has('pol', 'm') === false);
  check('no resurrection: the shared politician is gone from the server', !(srv2.snap.items || []).some((x) => idOf(x.type, x.key) === mid));
}

console.log('Scenario 13: singletons (ballot / mode) propagate by dirty-aware last-write-wins');
{
  const srv = new Server();
  const A = new Device('A', { minRetainMs: 0 });
  const B = new Device('B', { minRetainMs: 0 });

  A.setSingletons({ ballot: { senate: 'p1' }, mode: 'home' });
  A.sync(srv, 100);
  // B is CLEAN (no un-pushed team edits) → adopts A's singletons on pull.
  B.sync(srv, 200);
  check('clean device adopts the server ballot', eq(B.singletons.ballot, { senate: 'p1' }));
  check('clean device adopts the server mode', B.singletons.mode === 'home');

  // B now makes a LOCAL ballot edit (dirty) and must NOT lose it to an older server copy.
  B.setSingletons({ ballot: { senate: 'p1', house: 'p2' } });
  B.pull(srv.snap, 300, true);   // dirty pull with the stale server snapshot
  check('dirty device keeps its own local ballot edit', eq(B.singletons.ballot, { senate: 'p1', house: 'p2' }));
  // After B pushes, a clean A converges to B's ballot.
  B.sync(srv, 350, true);
  A.sync(srv, 400);
  check('the other device then converges to the newer ballot', eq(A.singletons.ballot, { senate: 'p1', house: 'p2' }));
}

console.log('Scenario 14: roster + saved-teams coexist; independent deletes propagate without cross-resurrection');
{
  // A large grace window is deliberately kept ON here (unlike the GC-focused
  // scenarios 6-12 which zero it out). With two devices deleting DIFFERENT items
  // concurrently and syncing in an interleaved order, the grace window is what
  // guarantees a fresh tombstone survives long enough to reach every device before
  // it can be GC'd — the same protection the 7-day TOMB_MIN_RETAIN_MS gives in
  // production. This scenario tests propagation + no-cross-resurrection, not GC.
  const GRACE = 1e9;
  const srv = new Server();
  const A = new Device('A', { minRetainMs: GRACE });
  const B = new Device('B', { minRetainMs: GRACE });

  A.addPol('p1', 100);
  A.addTeam('t1', { name: 'Slate One', slots: { a: 'p1' } }, 110);
  A.sync(srv, 120);
  B.sync(srv, 130);
  check('B has both the politician and the saved team', B.has('pol', 'p1') && B.has('team', 't1'));

  // A deletes the politician; B deletes the saved team — concurrent, different ids.
  A.remove('pol', 'p1', 200);
  B.remove('team', 't1', 210);
  A.sync(srv, 220, true);
  B.sync(srv, 230, true);   // B learns pol delete; server learns team delete
  A.sync(srv, 240);          // A learns team delete
  B.sync(srv, 250);          // both converge

  check('politician deletion propagated to B', B.has('pol', 'p1') === false);
  check('saved-team deletion propagated to A', A.has('team', 't1') === false);
  check('A converged: politician gone', A.has('pol', 'p1') === false);
  check('B converged: saved team gone', B.has('team', 't1') === false);

  // Re-adding the politician on A must NOT drag the (separately) deleted team back.
  A.addPol('p1', 300);
  A.sync(srv, 310, true);
  B.sync(srv, 320);
  check('re-added politician reappears on B', B.has('pol', 'p1') === true);
  check('the independently-deleted saved team is NOT resurrected', B.has('team', 't1') === false);
}

console.log('');
if (failures) { console.error(failures + ' assertion(s) FAILED'); process.exit(1); }
console.log('All team merge simulations passed.');
