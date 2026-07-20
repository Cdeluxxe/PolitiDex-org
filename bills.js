// PolitiDex — Bills/Legislation client module (Phase 1) · window.PDXBills
//
// A thin, additive client over the Voting Record Function's browse route
// (GET /api/voting-record/measures) and per-measure detail (GET .../measure/:id).
// It is the data source the Digital Library's "Legislation" tab renders from, and
// the seam every later phase (a bill detail panel, cross-links, follow-a-bill) will
// build on without changing callers.
//
// Loading model (mirrors cmp-data.js + pdx-lazy-data.js): this module is tiny and
// ships deferred so PDXBills always exists; the light inline index (bills-index.js)
// and the live list are fetched on demand the first time the Legislation tab opens.
//
// API:
//   PDXBills.listSync()        → { items } from the inline index (instant, no network)
//   PDXBills.list(filters)     → Promise<{ items, total, page, … }> from the live route
//   PDXBills.get(id)           → Promise<measure detail> (cached) from /measure/:id
//   PDXBills.open(idOrNumber)  → open the measure's canonical source; emits pdx:bill:open
//   PDXBills.ensureIndex()     → Promise that resolves once the inline index is present
(function () {
  if (window.PDXBills) return;

  var BASE = '/api/voting-record';
  var _listCache = {};   // query-string → response
  var _detail = {};      // measure id → detail response

  // Build a stable, sorted query string from a filters object (blank values dropped).
  function qs(filters) {
    filters = filters || {};
    var keys = ['congress', 'chamber', 'type', 'status', 'issue', 'q', 'sort', 'page', 'pageSize'];
    var parts = [];
    keys.forEach(function (k) {
      var v = filters[k];
      if (v === undefined || v === null || v === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    });
    return parts.join('&');
  }

  // Ensure the inline light index (bills-index.js) is loaded, via the shared lazy
  // loader when available, so the tab can paint instantly before the live fetch.
  function ensureIndex() {
    if (Array.isArray(window.PDX_BILLS_INDEX)) return Promise.resolve(window.PDX_BILLS_INDEX);
    if (window.PDXLazyData && typeof window.PDXLazyData.ensure === 'function') {
      return window.PDXLazyData.ensure('bills').then(function () { return window.PDX_BILLS_INDEX || []; });
    }
    return Promise.resolve([]);
  }

  function listSync() {
    return { items: Array.isArray(window.PDX_BILLS_INDEX) ? window.PDX_BILLS_INDEX.slice() : [], _inline: true };
  }

  function list(filters) {
    var key = qs(filters);
    if (_listCache[key]) return Promise.resolve(_listCache[key]);
    return fetch(BASE + '/measures' + (key ? ('?' + key) : ''), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.items)) { _listCache[key] = d; return d; }
        // Fall back to the inline index so the tab is never empty on a transient error.
        return listSync();
      })
      .catch(function () { return listSync(); });
  }

  function get(id) {
    var n = parseInt(id, 10);
    if (!Number.isFinite(n)) return Promise.resolve(null);
    if (_detail[n]) return Promise.resolve(_detail[n]);
    return fetch(BASE + '/measure/' + n, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) _detail[n] = d; return d; })
      .catch(function () { return null; });
  }

  // Find a card we already know about (live list caches first, then the inline
  // index) by numeric id or by bill number.
  function findCard(ref) {
    var byNum = String(ref);
    var isId = /^\d+$/.test(byNum);
    var pools = [];
    Object.keys(_listCache).forEach(function (k) { if (_listCache[k] && _listCache[k].items) pools.push(_listCache[k].items); });
    if (Array.isArray(window.PDX_BILLS_INDEX)) pools.push(window.PDX_BILLS_INDEX);
    for (var p = 0; p < pools.length; p++) {
      var items = pools[p];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (isId && it.id != null && String(it.id) === byNum) return it;
        if (it.number && it.number === ref) return it;
      }
    }
    return null;
  }

  // Open a bill. Phase 2: prefer the rich in-app detail panel (PDXBillDetail) when
  // it's loaded; fall back to the Phase-1 behavior (open the canonical source in a
  // new tab) when it isn't. Always emits pdx:bill:open for any other listener.
  function open(ref) {
    var card = findCard(ref);
    try { document.dispatchEvent(new CustomEvent('pdx:bill:open', { detail: { ref: ref, card: card } })); } catch (e) {}
    if (window.PDXBillDetail && typeof window.PDXBillDetail.open === 'function') {
      return window.PDXBillDetail.open(ref);
    }
    if (card && card.source && card.source.url) { window.open(card.source.url, '_blank', 'noopener'); return true; }
    if (/^\d+$/.test(String(ref))) {
      get(ref).then(function (d) {
        var url = d && d.measure && d.measure.source && d.measure.source.url;
        if (url) window.open(url, '_blank', 'noopener');
      });
      return true;
    }
    return false;
  }

  // ── Follow / unfollow (Phase 3) ─────────────────────────────────────────────
  // Local-first, additive. Followed bills persist through PDXStore's `bills`
  // collection when available (which gives free account sync for signed-in users
  // via the same machinery My Team uses) and fall back to plain localStorage
  // otherwise. Bills are keyed by their stable natural key (congress + number), not
  // the DB serial id, so a follow survives across environments and reseeds. Each
  // stored entry keeps enough to render the Followed view without a fetch.
  var FOLLOW_KEY = 'politidex_followed_bills';

  function followKeyOf(cardOrRef) {
    if (cardOrRef && typeof cardOrRef === 'object') {
      return String(cardOrRef.congress || '') + '|' + String(cardOrRef.number || cardOrRef.id || '');
    }
    return '|' + String(cardOrRef); // bare ref (id or number) — best effort
  }

  function readFollowed() {
    try {
      if (window.PDXStore && typeof window.PDXStore.read === 'function') {
        var v = window.PDXStore.read(FOLLOW_KEY, []);
        if (Array.isArray(v)) return v;
      }
    } catch (e) {}
    try { var a = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeFollowed(arr) {
    var ok = false;
    try {
      if (window.PDXStore && typeof window.PDXStore.write === 'function') {
        window.PDXStore.write(FOLLOW_KEY, arr); // marks dirty → syncs when signed in
        ok = true;
      }
    } catch (e) {}
    if (!ok) { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(arr)); } catch (e) {} }
    try { document.dispatchEvent(new CustomEvent('pdx:bills:followed-changed')); } catch (e) {}
  }

  function followed() { return readFollowed(); }
  function isFollowed(cardOrRef) {
    var k = followKeyOf(cardOrRef);
    return readFollowed().some(function (b) { return b.key === k; });
  }
  // Toggle follow for a card (needs number/congress/title). Returns the new state.
  function toggleFollow(card) {
    var k = followKeyOf(card);
    var arr = readFollowed();
    var i = -1;
    for (var j = 0; j < arr.length; j++) { if (arr[j].key === k) { i = j; break; } }
    if (i >= 0) { arr.splice(i, 1); writeFollowed(arr); return false; }
    arr.push({
      key: k,
      id: (card && card.id != null) ? card.id : null,
      number: (card && card.number) || '',
      congress: (card && card.congress) || '',
      title: (card && (card.shortTitle || card.title)) || (card && card.number) || 'Bill',
      status: (card && card.status) || '',
      chamber: (card && card.chamber) || '',
      followedAt: null
    });
    writeFollowed(arr);
    return true;
  }

  window.PDXBills = {
    listSync: listSync,
    list: list,
    get: get,
    open: open,
    ensureIndex: ensureIndex,
    // follow
    followed: followed,
    isFollowed: isFollowed,
    toggleFollow: toggleFollow,
    followKeyOf: followKeyOf
  };
})();
