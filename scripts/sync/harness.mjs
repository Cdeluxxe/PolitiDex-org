/**
 * A generic, collection-agnostic multi-device sync harness.
 *
 * Extracted from the per-collection simulations so any collection — existing or
 * hypothetical — can be exercised through the SAME faithful Device/Server model
 * without re-deriving it. It drives scripts/sync/core.mjs end-to-end exactly like
 * the production reconcileFromServer does: union tombstones + watermarks,
 * field-merge items against them, advance the device's own watermark, retire stale
 * devices, GC tombstones, and (optionally) merge singletons.
 *
 * makeHarness(config) → { Device, Server, idOf, col }
 *   config = {
 *     fields:     [{ field, tsField }, …],   // independently-mergeable fields (may be [])
 *     idOf?:      (type, key) => string,      // identity override (defaults to type::key)
 *     singletons?: object | null,             // initial singleton state, or null if none
 *     snapshotKey?: string,                   // cosmetic snapshot.key
 *   }
 *
 * A NEW collection needs only to hand this function a config — no new device logic.
 */
import * as core from './core.mjs';

const clone = (x) => JSON.parse(JSON.stringify(x));

export function makeHarness(config) {
  config = config || {};
  const col = core.createCollection({ idOf: config.idOf, fields: config.fields || [] });
  const idOf = col.idOf;
  const hasSingletons = config.singletons != null;
  const singletonSeed = config.singletons || null;
  const snapshotKey = config.snapshotKey || 'collection';

  class Server { constructor() { this.snap = null; } }

  class Device {
    constructor(id, opts) {
      this.id = id;
      this.items = [];
      this.tombs = {};
      this.wm = {};
      this.singletons = hasSingletons ? clone(singletonSeed) : null;
      this.old = !!(opts && opts.old);
      this.staleMs = (opts && opts.staleMs != null) ? opts.staleMs : core.WM_STALE_MS;
      this.minRetainMs = (opts && opts.minRetainMs != null) ? opts.minRetainMs : core.TOMB_MIN_RETAIN_MS;
    }
    _find(type, key) { const id = idOf(type, key); return this.items.findIndex((x) => idOf(x.type, x.key) === id); }
    // Add/refresh an item, merging in `data` and stamping savedAt.
    save(item, t) {
      const id = idOf(item.type, item.key);
      const i = this._find(item.type, item.key);
      const rec = Object.assign({}, i === -1 ? {} : this.items[i], item, { savedAt: t });
      if (i === -1) this.items.push(rec); else this.items[i] = rec;
      if (core.hasOwn(this.tombs, id)) delete this.tombs[id];   // re-save clears tombstone
      return this;
    }
    // Edit one independently-mergeable field: set it, stamp its tsField, bump savedAt.
    editField(type, key, field, value, t) {
      const i = this._find(type, key); if (i === -1) return this;
      const spec = (config.fields || []).find((f) => f.field === field);
      if (!core.isEmptyField(value)) this.items[i][field] = value; else delete this.items[i][field];
      if (spec) this.items[i][spec.tsField] = t;
      this.items[i].savedAt = t;
      return this;
    }
    remove(type, key, t) {
      const id = idOf(type, key);
      this.items = this.items.filter((x) => idOf(x.type, x.key) !== id);
      this.tombs[id] = t;
      return this;
    }
    setSingletons(s) { if (hasSingletons) this.singletons = Object.assign({}, this.singletons, s); return this; }
    has(type, key) { return this.items.some((x) => x.type === type && x.key === key); }
    get(type, key) { const i = this._find(type, key); return i === -1 ? null : this.items[i]; }
    snapshot() {
      // An OLD client carries NO watermarks (and no singletons) — a push is a full-
      // snapshot overwrite, so an old client pushing wipes watermarks; new clients
      // re-establish them (the safe, conservative direction).
      if (this.old) return { key: snapshotKey, version: 1, items: clone(this.items), tombstones: clone(this.tombs) };
      const snap = { key: snapshotKey, version: 2, items: clone(this.items), tombstones: clone(this.tombs), watermarks: clone(this.wm) };
      if (hasSingletons) snap.singletons = clone(this.singletons);
      return snap;
    }
    pull(serverSnap, now, dirty) {
      const serverItems = (serverSnap && Array.isArray(serverSnap.items)) ? serverSnap.items : [];
      const serverTombs = core.readTombs(serverSnap && serverSnap.tombstones);

      // Singletons: adopt the server's when this device has no un-pushed edits.
      if (hasSingletons && serverSnap && serverSnap.singletons) {
        this.singletons = core.mergeSingletons(this.singletons, serverSnap.singletons, !!dirty);
      }

      if (this.old) {
        // OLD client: no watermark handling, only live-id pruning (pre-watermark
        // behavior). Must still crash-free consume a NEW snapshot with watermarks.
        const tombs = core.mergeTombstones(this.tombs, serverTombs);
        const merged = col.mergeItems(this.items, serverItems, { dirty: !!dirty, tombstones: tombs });
        merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        const liveIds = {};
        for (const m of merged) liveIds[idOf(m.type, m.key)] = 1;
        const afterLive = {};
        for (const id in tombs) { if (core.hasOwn(tombs, id) && !liveIds[id]) afterLive[id] = tombs[id]; }
        this.items = merged;
        this.tombs = afterLive;
        return this;
      }

      // NEW client: the whole item/tombstone/watermark reconcile is the core's.
      const result = col.reconcile({
        localItems: this.items, serverItems,
        localTombs: this.tombs, serverTombs,
        localWm: this.wm, serverWm: core.readWatermarks(serverSnap && serverSnap.watermarks),
        dirty: !!dirty, now, deviceId: this.id,
        staleMs: this.staleMs, minRetainMs: this.minRetainMs
      });
      this.items = result.items;
      this.tombs = result.tombstones;
      this.wm = result.watermarks;
      return this;
    }
    sync(server, now, dirty) {
      this.pull(server.snap, now, dirty);
      server.snap = this.snapshot();
      return this;
    }
  }

  return { Device, Server, idOf, col };
}
