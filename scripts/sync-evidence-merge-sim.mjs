#!/usr/bin/env node
/**
 * Multi-device simulation for the PolitiDex "evidence" collection sync merge.
 *
 * The Evidence Locker's saved collections now use the SAME tombstone-aware,
 * watermark-GC'd, field-level-merge sync that "saved" and "team" already run on.
 * Like team, evidence is a THIN WRAPPER over the shared core (scripts/sync/core.mjs,
 * mirrored by window.PDXSyncCore in index.html): it supplies a small config and a
 * STORAGE ADAPTER that projects the Locker's NESTED store onto the core's flat
 * "list of items" shape. This file drives the REAL shared core (imported, not
 * re-declared) through a faithful copy of that projection — so what it verifies is
 * exactly the production merge logic, plus the evidence-specific nested projection.
 *
 * WHAT'S THE SAME AS SAVED / TEAM
 *   • Every tombstone / watermark / field-merge / GC decision is the imported
 *     core's. Zero merge logic is re-declared here.
 *
 * WHAT DIFFERS FROM SAVED / TEAM (evidence-specific)
 *   • The Locker persists a NESTED object, not a flat list:
 *       { collId → { id, name, order, items: { itemKey → snapshot } } }
 *     Two things there are deletion-prone — a whole collection (folder) can be
 *     deleted, and a receipt can be removed from a folder — so both are projected
 *     into one tombstone-tracked item list:
 *       folder  → { type:'evcoll', key: collId, name, order, savedAt }
 *       receipt → { type:'evitem', key: collId␟itemKey, coll, ik, snap, note?, tags? }
 *     Deleting a folder makes its evcoll AND every child evitem disappear at once,
 *     so the projection tombstones them all — a cascade that falls out for free.
 *   • The independently-mergeable fields are a folder's `name` (users rename them)
 *     and a receipt's per-item `note` / `tags` (carried inside its snapshot, so they
 *     round-trip through the existing store with no schema change). A record that
 *     lacks a field falls through to whole-item LWW for it (like team's 'pol').
 *   • No singletons.
 *
 * Run:  node scripts/sync-evidence-merge-sim.mjs
 * Exits non-zero if any assertion fails.
 */
import * as core from './sync/core.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓ ' + name); }
  else { failures++; console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── The evidence collection config — the ENTIRE onboarding cost ──────────────
const SEP = '␟';
const idOf = (type, key) => String(type == null ? '' : type) + '::' + String(key == null ? '' : key);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const FIELDS = [
  { field: 'name', tsField: 'nameUpdatedAt' },   // folder display name (evcoll)
  { field: 'note', tsField: 'noteUpdatedAt' },   // receipt note        (evitem)
  { field: 'tags', tsField: 'tagsUpdatedAt' }    // receipt tags        (evitem)
];
const FIELDS_TS = {}; FIELDS.forEach((f) => { FIELDS_TS[f.field] = f.tsField; });
const TYPE_FIELDS = { evcoll: ['name'], evitem: ['note', 'tags'] };
const col = core.createCollection({ idOf, fields: FIELDS });

const normTags = (t) => Array.isArray(t) ? t.filter(Boolean) : (t == null ? [] : [t]);
const sameJSON = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return a === b; } };
const fieldOf = (rec, f) => f === 'name' ? (rec.name != null ? rec.name : '')
  : (f === 'note' ? (rec.note != null ? rec.note : '') : (rec.tags || []));

// ── The Locker's nested store ⇄ flat item projection (mirrors index.html) ────
function legacyItems(colls) {
  const out = [];
  for (const cid in colls) {
    if (!hasOwn(colls, cid)) continue;
    const c = colls[cid] || {};
    out.push({ type: 'evcoll', key: String(cid), name: c.name, order: c.order });
    const items = (c.items && typeof c.items === 'object') ? c.items : {};
    for (const ik in items) {
      if (!hasOwn(items, ik)) continue;
      const snap = items[ik] || {};
      const baseSnap = {};
      for (const sk in snap) { if (hasOwn(snap, sk) && sk !== 'note' && sk !== 'tags') baseSnap[sk] = snap[sk]; }
      const rec = { type: 'evitem', key: String(cid) + SEP + String(ik), coll: String(cid), ik: String(ik), snap: baseSnap };
      if (snap.note != null && snap.note !== '') rec.note = snap.note;
      const tg = normTags(snap.tags); if (tg.length) rec.tags = tg;
      out.push(rec);
    }
  }
  return out;
}

// Fold the nested store's local edits/deletions into the canonical list + tombstones.
function refresh(dev, now) {
  const prev = dev.canon, prevById = {};
  for (const p of prev) prevById[idOf(p.type, p.key)] = p;
  const tombs = dev.tombs;
  const legacy = legacyItems(dev.colls);
  const next = [], seen = {};

  for (const it of legacy) {
    const id = idOf(it.type, it.key); seen[id] = 1;
    const old = prevById[id] || null;
    const rec = { type: it.type, key: it.key };
    if (it.type === 'evcoll') { if (it.name != null && it.name !== '') rec.name = it.name; if (it.order != null) rec.order = it.order; }
    else { rec.coll = it.coll; rec.ik = it.ik; rec.snap = it.snap; if (it.note != null && it.note !== '') rec.note = it.note; if (it.tags && it.tags.length) rec.tags = it.tags; }
    const fs = TYPE_FIELDS[it.type] || [];
    if (!old) {
      rec.savedAt = now;
      for (const f of fs) { if (!core.isEmptyField(fieldOf(rec, f))) rec[FIELDS_TS[f]] = now; }
    } else {
      rec.savedAt = old.savedAt || now;
      for (const f of fs) {
        const tsf = FIELDS_TS[f];
        if (old[tsf] != null) rec[tsf] = old[tsf];
        if (!sameJSON(fieldOf(old, f), fieldOf(rec, f))) { rec[tsf] = now; rec.savedAt = now; }
      }
      if (it.type === 'evitem' && !sameJSON(old.snap || null, rec.snap || null)) rec.savedAt = now;
    }
    next.push(rec);
    if (hasOwn(tombs, id)) delete tombs[id];
  }
  for (const oid in prevById) {
    if (!hasOwn(prevById, oid) || seen[oid]) continue;
    if (!hasOwn(tombs, oid)) tombs[oid] = now;
  }
  dev.canon = next;
  return next;
}

function refreshShape(merged) {
  return merged.map((m) => {
    const rec = { type: m.type, key: m.key };
    if (m.type === 'evcoll') {
      if (m.name != null && m.name !== '') rec.name = m.name;
      if (m.order != null) rec.order = m.order;
      if (m.nameUpdatedAt != null) rec.nameUpdatedAt = m.nameUpdatedAt;
    } else {
      rec.coll = m.coll; rec.ik = m.ik; if (m.snap != null) rec.snap = m.snap;
      if (m.note != null && m.note !== '') rec.note = m.note;
      if (m.tags && m.tags.length) rec.tags = m.tags;
      if (m.noteUpdatedAt != null) rec.noteUpdatedAt = m.noteUpdatedAt;
      if (m.tagsUpdatedAt != null) rec.tagsUpdatedAt = m.tagsUpdatedAt;
    }
    rec.savedAt = m.savedAt || 0;
    return rec;
  });
}

// Rebuild the nested Locker store from the merged flat list (note/tags → snapshot).
function project(dev, merged) {
  const colls = {};
  for (const m of merged) {
    if (m.type !== 'evcoll') continue;
    const c = colls[m.key] || (colls[m.key] = { id: m.key, items: {} });
    c.name = (m.name != null) ? m.name : '';
    c.order = (m.order != null) ? m.order : 0;
  }
  for (const m of merged) {
    if (m.type !== 'evitem') continue;
    const cid = m.coll || String(m.key).split(SEP)[0];
    const c = colls[cid] || (colls[cid] = { id: cid, name: '', order: 0, items: {} });
    if (!c.items) c.items = {};
    const snap = (m.snap && typeof m.snap === 'object') ? clone(m.snap) : {};
    if (m.note != null && m.note !== '') snap.note = m.note; else delete snap.note;
    if (m.tags && m.tags.length) snap.tags = m.tags; else delete snap.tags;
    c.items[m.ik] = snap;
  }
  dev.colls = colls;
  dev.canon = refreshShape(merged);
}

// ── A faithful Device / Server model over the projection above ───────────────
class Server { constructor() { this.snap = null; } }

class Device {
  constructor(id, opts) {
    this.id = id;
    this.colls = {};          // the nested Locker store (source of truth for the UI)
    this.canon = [];          // the canonical stamped flat list
    this.tombs = {};
    this.wm = {};
    this.old = !!(opts && opts.old);
    this.minRetainMs = (opts && opts.minRetainMs != null) ? opts.minRetainMs : 0;
    this.staleMs = (opts && opts.staleMs != null) ? opts.staleMs : core.WM_STALE_MS;
  }
  // ── Locker-style mutations (exactly what the UI closures do) ──
  createColl(cid, name, order) { this.colls[cid] = { id: cid, name, order: order || 0, items: {} }; return this; }
  renameColl(cid, name) { if (this.colls[cid]) this.colls[cid].name = name; return this; }
  addItem(cid, ik, snap) { const c = this.colls[cid]; if (c) { if (!c.items) c.items = {}; c.items[ik] = snap || {}; } return this; }
  setNote(cid, ik, note) { const c = this.colls[cid]; if (c && c.items && c.items[ik]) c.items[ik].note = note; return this; }
  setTags(cid, ik, tags) { const c = this.colls[cid]; if (c && c.items && c.items[ik]) c.items[ik].tags = tags; return this; }
  removeItem(cid, ik) { const c = this.colls[cid]; if (c && c.items) delete c.items[ik]; return this; }
  deleteColl(cid) { delete this.colls[cid]; return this; }        // cascade handled by refresh()
  // ── Introspection ──
  hasColl(cid) { return !!this.colls[cid]; }
  hasItem(cid, ik) { return !!(this.colls[cid] && this.colls[cid].items && this.colls[cid].items[ik]); }
  item(cid, ik) { return (this.colls[cid] && this.colls[cid].items && this.colls[cid].items[ik]) || null; }
  collName(cid) { return this.colls[cid] ? this.colls[cid].name : null; }

  snapshot() {
    const items = refresh(this, this._now);
    if (this.old) return { key: 'evidence', version: 1, items: clone(items), tombstones: clone(this.tombs) };
    return { key: 'evidence', version: 2, items: clone(items), tombstones: clone(this.tombs), watermarks: clone(this.wm) };
  }
  pull(serverSnap, now, dirty) {
    this._now = now;
    refresh(this, now);
    const serverItems = (serverSnap && Array.isArray(serverSnap.items)) ? serverSnap.items : [];
    const serverTombs = core.readTombs(serverSnap && serverSnap.tombstones);

    if (this.old) {
      // Pre-sync client: no watermark handling, only live-id pruning.
      const tombs = core.mergeTombstones(this.tombs, serverTombs);
      const merged = col.mergeItems(this.canon, serverItems, { dirty: !!dirty, tombstones: tombs });
      merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      const liveIds = {}; for (const m of merged) liveIds[idOf(m.type, m.key)] = 1;
      const afterLive = {}; for (const id in tombs) { if (hasOwn(tombs, id) && !liveIds[id]) afterLive[id] = tombs[id]; }
      this.tombs = afterLive;
      project(this, merged);
      return this;
    }

    const result = col.reconcile({
      localItems: this.canon, serverItems,
      localTombs: this.tombs, serverTombs,
      localWm: this.wm, serverWm: core.readWatermarks(serverSnap && serverSnap.watermarks),
      dirty: !!dirty, now, deviceId: this.id, staleMs: this.staleMs, minRetainMs: this.minRetainMs
    });
    this.tombs = result.tombstones;
    this.wm = result.watermarks;
    project(this, result.items);
    return this;
  }
  sync(server, now, dirty) { this._now = now; this.pull(server.snap, now, dirty); server.snap = this.snapshot(); return this; }
}

const ID = (type, key) => idOf(type, key);
const EVI = (cid, ik) => 'evitem::' + cid + SEP + ik;
const EVC = (cid) => 'evcoll::' + cid;

console.log('=== Evidence Locker collections — cross-device sync (via shared core) ===');

// 1. Field-level merge — a note edit on A and a tags edit on B both survive.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  A.createColl('col_1', 'Water Issues', 10).addItem('col_1', 'pol_a|hb100', { headline: 'HB 100 vote' });
  A.sync(srv, 1000); B.sync(srv, 1000);                 // both hold the folder + receipt
  A.setNote('col_1', 'pol_a|hb100', 'follow this one');
  B.setTags('col_1', 'pol_a|hb100', ['primary-source', 'video']);
  A.sync(srv, 1100, true);   // A pushes its note edit
  B.sync(srv, 1200, true);   // B merges A's note, pushes its tags edit
  A.sync(srv, 1300);         // A converges
  const ia = A.item('col_1', 'pol_a|hb100'), ib = B.item('col_1', 'pol_a|hb100');
  check('note edit survives', ia && ia.note === 'follow this one', JSON.stringify(ia));
  check('tags edit survives', ia && eq(ia.tags, ['primary-source', 'video']), JSON.stringify(ia));
  check('both devices converge on the receipt', eq(ia, ib));
}

// 2. Collection rename (field-level) vs a concurrent add — both survive.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  A.createColl('col_2', 'Draft', 5).addItem('col_2', 'pol_a|r1', { headline: 'R1' });
  A.sync(srv, 2000); B.sync(srv, 2000);
  A.renameColl('col_2', 'Housing Watch');               // A renames the folder
  B.addItem('col_2', 'pol_b|r2', { headline: 'R2' });   // B adds a receipt to it
  A.sync(srv, 2100, true); B.sync(srv, 2200, true); A.sync(srv, 2300);
  check('folder rename survives a concurrent add', A.collName('col_2') === 'Housing Watch', A.collName('col_2'));
  check('concurrently-added receipt survives the rename', A.hasItem('col_2', 'pol_b|r2'));
  check('devices converge on the folder', eq(A.colls, B.colls));
}

// 3. Removing a receipt propagates as a tombstone (never resurrects).
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  A.createColl('col_3', 'Sources', 1).addItem('col_3', 'pol_a|x', { headline: 'X' }).addItem('col_3', 'pol_a|y', { headline: 'Y' });
  A.sync(srv, 3000); B.sync(srv, 3000);
  B.removeItem('col_3', 'pol_a|x');                      // B removes one receipt
  B.sync(srv, 3100, true);
  check('tombstone recorded for the removed receipt', srv.snap.tombstones[EVI('col_3', 'pol_a|x')] === 3100);
  A.sync(srv, 3200);                                     // A receives the deletion
  check('receipt deletion propagates to A', A.hasItem('col_3', 'pol_a|x') === false);
  check('sibling receipt untouched', A.hasItem('col_3', 'pol_a|y') === true);
  A.sync(srv, 3300); B.sync(srv, 3400);
  check('removed receipt never resurrects', A.hasItem('col_3', 'pol_a|x') === false && B.hasItem('col_3', 'pol_a|x') === false);
}

// 4. Deleting a whole folder cascades to tombstones for it AND its receipts.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  A.createColl('col_4', 'Temp', 2).addItem('col_4', 'pol_a|a', { headline: 'A' }).addItem('col_4', 'pol_a|b', { headline: 'B' });
  A.sync(srv, 4000); B.sync(srv, 4000);
  A.deleteColl('col_4');                                 // A deletes the whole folder
  A.sync(srv, 4100, true);
  check('folder tombstoned', srv.snap.tombstones[EVC('col_4')] === 4100);
  check('child receipts cascade-tombstoned', srv.snap.tombstones[EVI('col_4', 'pol_a|a')] === 4100 && srv.snap.tombstones[EVI('col_4', 'pol_a|b')] === 4100);
  B.sync(srv, 4200);                                     // B receives the whole cascade
  check('folder deletion propagates to B', B.hasColl('col_4') === false);
  check('all child receipts gone on B', !B.hasItem('col_4', 'pol_a|a') && !B.hasItem('col_4', 'pol_a|b'));
}

// 5. Delete beats a concurrent field edit; a strictly-later edit resurrects.
//    Pure-merge invariant checked directly through the collection's merger.
{
  const id = EVI('col_5', 'k');
  const edited = { type: 'evitem', key: 'col_5' + SEP + 'k', coll: 'col_5', ik: 'k', snap: {}, note: 'edited', noteUpdatedAt: 5100, savedAt: 5100 };
  const tombs = { [id]: 5200 };                          // deletion strictly newer than the edit
  const dropped = col.mergeItems([edited], [], { dirty: true, tombstones: tombs });
  check('delete newer than edit wins', !dropped.some((x) => idOf(x.type, x.key) === id));
  const later = Object.assign({}, edited, { savedAt: 5300, noteUpdatedAt: 5300 });
  const survives = col.mergeItems([later], [], { dirty: true, tombstones: tombs });
  check('edit strictly newer than delete survives', survives.some((x) => idOf(x.type, x.key) === id));
}

// 6. Two-device watermark GC — tombstone kept until BOTH pass it, then collected.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  const id = EVI('col_6', 'k');
  A.createColl('col_6', 'GC', 1).addItem('col_6', 'k', { headline: 'K' });
  A.sync(srv, 100); B.sync(srv, 200);                    // both hold it
  A.removeItem('col_6', 'k'); A.sync(srv, 500, true);
  check('tombstone kept while B is behind', srv.snap.tombstones[id] === 500);
  A.sync(srv, 600);                                     // A advances its own watermark past the delete
  B.sync(srv, 700);                                      // B returns → sees deletion
  check('straggler applies deletion on return', B.hasItem('col_6', 'k') === false);
  check('tombstone GC\'d once both synced past it', srv.snap.tombstones[id] === undefined);
  A.sync(srv, 800);
  check('no resurrection on server after GC', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === id));
}

// 7. Long-offline device (within the horizon) still receives an old deletion.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  const id = EVI('col_7', 'k');
  A.createColl('col_7', 'Off', 1).addItem('col_7', 'k', { headline: 'K' });
  A.sync(srv, 1000); B.sync(srv, 1000);
  A.removeItem('col_7', 'k'); A.sync(srv, 5000, true);
  for (const t of [10000, 20000, 50000, 100000]) A.sync(srv, t);   // A keeps syncing; B offline
  check('tombstone survives while straggler behind', srv.snap.tombstones[id] === 5000);
  B.sync(srv, 120000);                                             // still within WM_STALE_MS
  check('long-offline device receives the deletion', B.hasItem('col_7', 'k') === false);
  check('tombstone GC\'d only after straggler caught up', srv.snap.tombstones[id] === undefined);
}

// 8. Backward compat — a pre-sync client (v1, no watermarks) still interoperates,
//    and pre-existing local evidence seeded at age 0 is superseded by a deletion.
{
  const srv = new Server();
  const GRACE = 1000;
  const oldC = new Device('OLD', { old: true });
  const newC = new Device('NEW', { minRetainMs: GRACE });
  const id = EVI('col_8', 'k');
  newC.createColl('col_8', 'Compat', 1).addItem('col_8', 'k', { headline: 'K' });
  newC.sync(srv, 100);
  oldC.sync(srv, 120);                                   // OLD pulls (ignores wm), pushes v1 → wipes wm
  check('old client received the new receipt', oldC.hasItem('col_8', 'k'));
  check('old push omits watermarks (safe direction)', srv.snap.watermarks === undefined);
  newC.removeItem('col_8', 'k'); newC.sync(srv, 200, true);
  check('grace window keeps a fresh tombstone despite full known coverage', srv.snap.tombstones[id] === 200);
  oldC.sync(srv, 400);                                   // OLD syncs inside the grace window
  check('old client applies deletion inside grace window', oldC.hasItem('col_8', 'k') === false);
  check('no resurrection of the old client\'s view', !(srv.snap.items || []).some((x) => idOf(x.type, x.key) === id));
}

// 9. Pre-existing (never-synced) local data seeded at age 0 loses to an older delete.
{
  // Device B pre-holds a receipt from before sync existed (seeded savedAt=0). A
  // deletes the same id at a real time; B must ADOPT the deletion, not resurrect.
  const id = EVI('col_9', 'k');
  const seeded = [{ type: 'evcoll', key: 'col_9', name: 'Seed', order: 1, savedAt: 0 },
                  { type: 'evitem', key: 'col_9' + SEP + 'k', coll: 'col_9', ik: 'k', snap: { headline: 'K' }, savedAt: 0 }];
  const tombs = { [id]: 50 };                            // a deletion newer than the age-0 seed
  const merged = col.mergeItems(seeded, [], { dirty: false, tombstones: tombs });
  check('age-0 pre-sync data is superseded by any recorded deletion', !merged.some((x) => idOf(x.type, x.key) === id));
  check('the seeded folder (untombstoned) is retained', merged.some((x) => idOf(x.type, x.key) === EVC('col_9')));
}

// 10. Idempotency — after a note edit converges, idle re-syncs must not churn the
//     canonical list (note/tags are lifted from and written back into the snapshot,
//     so the round-trip has to be stable) and must never re-create tombstones.
{
  const srv = new Server();
  const A = new Device('A'), B = new Device('B');
  A.createColl('col_10', 'Stable', 1).addItem('col_10', 'k', { headline: 'K' });
  A.sync(srv, 1000); B.sync(srv, 1000);
  A.setNote('col_10', 'k', 'annotate'); A.setTags('col_10', 'k', ['x']);
  A.sync(srv, 1100, true); B.sync(srv, 1200); A.sync(srv, 1300);
  const beforeColls = clone(A.colls), beforeCanon = clone(A.canon);
  A.sync(srv, 1400); A.sync(srv, 1500); B.sync(srv, 1600);   // idle re-syncs
  check('nested store is stable across idle re-syncs', eq(A.colls, beforeColls), JSON.stringify(A.colls));
  check('canonical list is stable across idle re-syncs', eq(A.canon, beforeCanon));
  check('no tombstones created for live items', Object.keys(A.tombs).length === 0);
  check('devices stay converged', eq(A.colls, B.colls));
}

console.log('');
if (failures) { console.error(failures + ' assertion(s) FAILED'); process.exit(1); }
console.log('All evidence sync simulations passed.');
