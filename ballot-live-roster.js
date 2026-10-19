/* ═══════════════════════════════════════════════════════════════════════════
   ballot-live-roster.js — the live candidate profiles, on /ballot
   ────────────────────────────────────────────────────────────────────────────
   The homepage reads the live Firestore profiles (firebase-boot.js) and merges
   them into the bundled roster (index.html's _checkAndTrigger), so its race
   cards list the non-incumbent candidates those profiles hold. /ballot carries
   only the bundled roster, so the same seat showed a full field there and only
   the sitting member here.

   This reads the SAME live source — the Firestore `politicians` collection,
   over the same REST list call firebase-boot.js makes — without the Firebase
   SDK, and merges it into window.CMP_DATA by the homepage's rule (a live field
   wins only when it carries a value; a blank never deletes a bundled one).
   Every reader on this page — the seat field, the resolver, the desk — then
   sees the roster the homepage sees.

   TWO DIFFERENCES FROM THE HOMEPAGE'S READ, BOTH NARROWER:
     · the field mask is only what a race list needs, plus `candidacyStatus`
       (where a concluded race is recorded: lost a primary, eliminated at
       convention, withdrew) and the stored election date. The homepage's light
       mask leaves candidacyStatus out, which is how a candidate who lost in
       June can still read as running.
     · a live document filed under a different key for someone the bundled
       roster already holds (a display-name slug of a roster id, e.g.
       `scott_chew` for `chew_h68`) is merged into that roster record instead of
       added as a second person on the same seat.

   WHEN IT LOADS. Once, after the page knows where the reader votes — the seats
   come from the location, and this only fills in who is on file for them. No
   location, no request. Residency and membership are not read.

   THE KEY. Read from /firebase-config.js (window.__FIREBASE_API_KEY__), the
   same public client identifier the homepage uses, injected at request time.
   No key, no request: the page keeps the bundled roster and says so.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBallotLiveRoster) return;

  var PROJECT = 'politidex-979bd';
  var FIELDS = ['name', 'office', 'district', 'state', 'party', 'rank', 'status', 'candidate',
    'incumbent', 'candidacyStatus', 'nextElection', 'electionLabel', 'photo', 'termStart', 'termEnd', 'icon'];
  var PAGE = 300, MAX_PAGES = 40;
  var CACHE_KEY = 'pdx_ballot_live_roster_v1';
  var CACHE_MS = 10 * 60 * 1000;

  // 'idle' → 'loading' → 'live' | 'failed' | 'nokey'
  var _state = 'idle';
  var _count = 0;
  var _promise = null;

  function restVal(v) {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) { var n = parseInt(v.integerValue, 10); return isNaN(n) ? v.integerValue : n; }
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('mapValue' in v) {
      var o = {}, f = (v.mapValue && v.mapValue.fields) || {};
      for (var k in f) o[k] = restVal(f[k]);
      return o;
    }
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(restVal);
    return null;
  }
  function blank(v) { return v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length); }
  // The homepage's _pdxMergeRosterRecord rule.
  function mergeInto(dst, src) {
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (blank(v) && !blank(dst[k])) return;
      dst[k] = v;
    });
    return dst;
  }
  function slug(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  // The canonical state, by the roster's own normaliser ("Utah · District 2",
  // "UT" and "Utah" are one state), so the same-person check is not fooled by
  // how a record spells it.
  function stateKey(s) {
    try {
      if (typeof window._pdxNormalizeState === 'function') return String(window._pdxNormalizeState(s) || '').toLowerCase();
    } catch (e) {}
    var t = String(s == null ? '' : s).trim().toLowerCase();
    return t === 'ut' ? 'utah' : t;
  }

  // Where a live document belongs in the bundled roster: its own key, the
  // canonical id the app's alias table gives it, or the one roster record with
  // the same name in the same state. '' means it is a person the bundle lacks.
  function homeOf(id, doc, byName) {
    var C = window.CMP_DATA || {};
    if (C[id]) return id;
    try {
      var PL = window.PDXPersonLink;
      var c = (PL && typeof PL.pid === 'function') ? PL.pid(id) : '';
      if (c && c !== id && C[c]) return c;
    } catch (e) {}
    var hits = byName[slug(doc.name) + '|' + stateKey(doc.state)] || [];
    return hits.length === 1 ? hits[0] : '';
  }

  function apply(docs) {
    var C = window.CMP_DATA = window.CMP_DATA || {};
    var P = window.PROFILES;
    var byName = {};
    Object.keys(C).forEach(function (k) {
      var r = C[k];
      if (!r || !r.name) return;
      var key = slug(r.name) + '|' + stateKey(r.state);
      (byName[key] = byName[key] || []).push(k);
    });
    var n = 0;
    Object.keys(docs).forEach(function (id) {
      var doc = docs[id];
      if (!doc || !doc.name) return;
      var home = homeOf(id, doc, byName);
      if (home) mergeInto(C[home], doc);
      else {
        C[id] = doc;
        if (P && typeof P === 'object' && P !== C && !P[id]) P[id] = doc;
      }
      n++;
    });
    _count = n;
    // Memoised reads over the roster are now stale.
    try { window._pdxVoterBallotCache = null; } catch (e) {}
    try { if (window.PDXBallotWorkspace && typeof window.PDXBallotWorkspace.sync === 'function') window.PDXBallotWorkspace.sync(); } catch (e) {}
  }

  function readCache() {
    try {
      var raw = window.sessionStorage && window.sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || !c.at || Date.now() - c.at > CACHE_MS || !c.docs) return null;
      return c.docs;
    } catch (e) { return null; }
  }
  function writeCache(docs) {
    try { window.sessionStorage && window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), docs: docs })); } catch (e) {}
  }

  function url(key, token) {
    var q = ['pageSize=' + PAGE, 'key=' + encodeURIComponent(key)];
    FIELDS.forEach(function (f) { q.push('mask.fieldPaths=' + encodeURIComponent(f)); });
    if (token) q.push('pageToken=' + encodeURIComponent(token));
    return 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/politicians?' + q.join('&');
  }

  function load() {
    if (_promise) return _promise;
    var cached = readCache();
    if (cached) { _state = 'live'; apply(cached); return (_promise = Promise.resolve(_state)); }
    var key = window.__FIREBASE_API_KEY__;
    if (!key || typeof fetch !== 'function') { _state = 'nokey'; return (_promise = Promise.resolve(_state)); }
    _state = 'loading';
    var docs = {}, pages = 0;
    function page(token) {
      return fetch(url(key, token), { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status)); return r.json(); })
        .then(function (d) {
          (d.documents || []).forEach(function (doc) {
            var id = String(doc.name || '').split('/').pop();
            if (!id) return;
            var o = {}, f = doc.fields || {};
            for (var k in f) o[k] = restVal(f[k]);
            docs[id] = o;
          });
          if (d.nextPageToken && ++pages < MAX_PAGES) return page(d.nextPageToken);
        });
    }
    _promise = page(null)
      .then(function () {
        if (!Object.keys(docs).length) throw new Error('empty');
        writeCache(docs);
        _state = 'live';
        apply(docs);
        return _state;
      })
      .catch(function () {
        _state = 'failed';
        try { if (window.PDXBallotWorkspace) window.PDXBallotWorkspace.sync(); } catch (e) {}
        return _state;
      });
    return _promise;
  }

  // The desk asks on every paint; the first located paint starts the load.
  function ensure() {
    if (_state === 'idle' && window._hasUserLocation) load();
    return _state;
  }

  window.PDXBallotLiveRoster = {
    ensure: ensure,
    state: function () { return _state; },
    count: function () { return _count; },
    ready: function () { return _promise || Promise.resolve(_state); },
    _apply: apply
  };
})();
