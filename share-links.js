// ─────────────────────────────────────────────────────────────────────────────
// share-links.js — make a server-visible share link open the record it names
// ─────────────────────────────────────────────────────────────────────────────
// A hash never reaches a server. That is why #bill/119/H.R. 1, #receipt=…,
// #record=… and #issue=… — the app's existing deep links — have always unfurled
// as the generic homepage card no matter what they pointed at: the scraper asks
// for "/", and "/" is all it is told.
//
// So the share buttons now emit the same destination in a form the edge can read:
//
//   #bill/119/H.R. 1        →  /?bill=119/H.R.%201
//   #receipt=pid~issue      →  /?receipt=pid~issue
//   #record=pid~issue       →  /?record=pid~issue
//   #issue=guns&key=…       →  /?rank=guns&key=…
//
// This file is the other half of that trade: on arrival it converts the query
// form straight back into the hash the app already understands, and then gets out
// of the way. No existing hash handler changed, and every hash link anyone has
// already shared or bookmarked keeps working exactly as before — those links
// simply skip this file entirely, because their hash is already in place.
//
// It also honours window.__PDX_SHARE_TARGET__, which share-preview.ts injects at
// the edge for URLs whose meaning only the server could resolve — chiefly
// /vote/<congress>/<chamber>/<roll>, which the edge turns into the bill the roll
// call belongs to. When the edge did not run (local dev, an error, a fail-open),
// the query parsing below still covers every case except /vote/, so a share link
// degrades to "works, without the pretty card" rather than to "does nothing".
(function () {
  'use strict';
  if (window.PDXShareLinks) return;

  // Params this module consumes. Deliberately NOT here: `p` (profiles) and
  // `issue` (Issue Spotlights), which are already server-visible and already have
  // their own boot handlers — this file must not race them.
  var PARAMS = ['bill', 'receipt', 'record', 'rank'];

  function param(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (e) { return ''; }
  }

  // Build the in-app hash for a share param. Returns '' when the value is not a
  // shape the app can open — a bad link should do nothing rather than open the
  // wrong thing.
  function hashFor(name, value) {
    if (!value) return '';
    if (name === 'bill') {
      var m = String(value).match(/^([^/]*)\/(.+)$/);
      if (!m) return '';
      return '#bill/' + encodeURIComponent(m[1]) + '/' + encodeURIComponent(m[2]);
    }
    if (name === 'receipt' || name === 'record') {
      var parts = String(value).split('~');
      if (!parts[0]) return '';
      return '#' + name + '=' + encodeURIComponent(parts[0]) +
        (parts[1] ? '~' + encodeURIComponent(parts[1]) : '');
    }
    if (name === 'rank') {
      // The ranking view keeps its extra state (sub-issue, lens, scope) in the
      // same hash it always used; only the issue itself moved to the query.
      var h = '#issue=' + encodeURIComponent(value);
      ['key', 'mode', 'scope'].forEach(function (k) {
        var v = param(k);
        if (v) h += '&' + k + '=' + encodeURIComponent(v);
      });
      return h;
    }
    return '';
  }

  // Strip the params we just consumed, so the URL settles into the canonical hash
  // form the rest of the app writes and reads. The path is left alone: a /vote/…
  // address stays a /vote/… address, which keeps its (more specific) social card
  // if the reader copies the URL back out of the address bar.
  function cleanedSearch() {
    try {
      var sp = new URLSearchParams(location.search);
      var touched = false;
      PARAMS.concat(['key', 'mode', 'scope']).forEach(function (k) {
        if (sp.has(k)) { sp.delete(k); touched = true; }
      });
      if (!touched) return null;
      var s = sp.toString();
      return s ? '?' + s : '';
    } catch (e) { return null; }
  }

  // Put the hash in place WITHOUT adding a history entry, then announce it.
  // Modules that boot later read location.hash themselves; modules already booted
  // are listening for hashchange. Between the two, every deep-link handler in the
  // app is covered regardless of script order.
  function applyHash(hash) {
    if (!hash || location.hash === hash) return false;
    var oldURL = location.href;
    var search = cleanedSearch();
    var next = location.pathname + (search === null ? location.search : search) + hash;
    try { history.replaceState(history.state, '', next); }
    catch (e) { try { location.hash = hash; } catch (e2) {} return true; }
    try {
      window.dispatchEvent(
        typeof HashChangeEvent === 'function'
          ? new HashChangeEvent('hashchange', { oldURL: oldURL, newURL: location.href })
          : new Event('hashchange')
      );
    } catch (e) {
      try { window.dispatchEvent(new Event('hashchange')); } catch (e2) {}
    }
    return true;
  }

  function resolve() {
    // An existing hash always wins: the reader asked for something specific and
    // this module's whole job is to be invisible when it is not needed.
    if (location.hash) return false;

    // 1. What the edge resolved for us (today: /vote/… → the bill it belongs to).
    var edge = window.__PDX_SHARE_TARGET__;
    if (edge && typeof edge.hash === 'string' && edge.hash.charAt(0) === '#') {
      if (applyHash(edge.hash)) return true;
    }

    // 2. What the URL says on its own — the path that still works when the edge
    //    function did not run.
    for (var i = 0; i < PARAMS.length; i++) {
      var name = PARAMS[i];
      var h = hashFor(name, param(name));
      if (h && applyHash(h)) return true;
    }

    // 3. Nothing opened. If this was a roll-call address, say so out loud.
    voteFallback();
    return false;
  }

  // ── The /vote/ safety net ───────────────────────────────────────────────────
  // A /vote/ link is resolved at the edge (share-preview.ts), which answers an
  // address it can DISPROVE with a real 404. But the edge is not always in the
  // picture: netlify dev serves the netlify.toml rewrite without it, and a
  // database timeout deliberately fails OPEN rather than accusing a good link of
  // being dead. Either way the reader lands on the front page having followed
  // what looked like a citation — the exact silent lie this whole feature exists
  // to remove. So when a /vote/ address opened nothing, the page says nothing
  // opened. It claims only what it knows: we could not open it, not that it does
  // not exist.
  var VOTE_PATH = /^\/vote\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;

  function voteFallback() {
    // Wrapped whole: a notice that a link failed must never itself be the thing
    // that breaks the page it is apologising on.
    try {
      var m = VOTE_PATH.exec(location.pathname || '');
      if (!m) return;
      if (document.getElementById('pdx-vote-unresolved')) return;
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', voteFallback);
        return;
      }
      var chamber = /^senate$/i.test(m[2]) ? 'Senate' : /^house$/i.test(m[2]) ? 'House' : m[2];
      var el = document.createElement('div');
      el.id = 'pdx-vote-unresolved';
      el.setAttribute('role', 'status');
      el.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
        'z-index:99999', 'max-width:min(560px,calc(100vw - 24px))',
        'background:#141c2e', 'border:1px solid #2a3550', 'border-radius:12px',
        'box-shadow:0 12px 34px rgba(0,0,0,.45)', 'padding:14px 16px',
        'color:#eef4ff', 'font:14px/1.5 Barlow,system-ui,-apple-system,sans-serif'
      ].join(';');
      el.innerHTML =
        '<strong style="display:block;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#f59e0b;margin-bottom:6px">Roll-call vote</strong>' +
        '<span>We couldn’t open ' + esc(chamber) + ' roll call ' + esc(m[3]) +
        ' of the ' + esc(m[1]) + 'th Congress. Rather than quietly show you the front page, ' +
        'here’s the plain answer: that link didn’t resolve to a record we could load.</span> ' +
        '<button type="button" style="background:none;border:0;color:#9fb4d4;cursor:pointer;font:inherit;text-decoration:underline">Dismiss</button>';
      var btn = el.querySelector('button');
      if (btn) btn.addEventListener('click', function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.body.appendChild(el);
    } catch (e) { /* nothing to say, and nothing worth breaking over */ }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Canonical share URLs ────────────────────────────────────────────────────
  // The single place that knows how to write a link worth pasting. Share buttons
  // call these so every surface emits the same, previewable form.
  function origin() {
    try { return location.origin; } catch (e) { return ''; }
  }
  var API = {
    bill: function (congress, number) {
      if (!number) return origin() + '/';
      return origin() + '/?bill=' + encodeURIComponent(String(congress || '') + '/' + String(number));
    },
    receipt: function (pid, issueKey) {
      if (!pid) return origin() + '/';
      return origin() + '/?receipt=' + encodeURIComponent(pid + (issueKey ? '~' + issueKey : ''));
    },
    record: function (pid, issueKey) {
      if (!pid) return origin() + '/';
      return origin() + '/?record=' + encodeURIComponent(pid + (issueKey ? '~' + issueKey : ''));
    },
    rank: function (coreKey, opts) {
      if (!coreKey) return origin() + '/';
      opts = opts || {};
      var u = origin() + '/?rank=' + encodeURIComponent(coreKey);
      ['key', 'mode', 'scope'].forEach(function (k) {
        var v = opts[k];
        if (v && !(k === 'mode' && v === 'all') && !(k === 'scope' && v === 'all')) {
          u += '&' + k + '=' + encodeURIComponent(v);
        }
      });
      return u;
    },
    // Same links, on the public share domain — for anything leaving the device.
    on: function (base, url) {
      try {
        var u = new URL(url);
        return String(base).replace(/\/$/, '') + u.pathname + u.search + u.hash;
      } catch (e) { return url; }
    },
    _hashFor: hashFor,
    resolve: resolve
  };

  window.PDXShareLinks = API;

  // Run as early as possible so later modules find the hash already set, and once
  // more at DOMContentLoaded to cover a late-injected __PDX_SHARE_TARGET__.
  resolve();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { resolve(); });
  }
})();
