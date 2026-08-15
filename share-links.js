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

  // The one "that link didn't resolve" notice. Extracted from voteFallback because
  // /vote/ is not the only address that can arrive unresolvable: a ?p= or ?record=
  // link naming somebody the roster no longer carries lands on the front page just
  // as silently, and the reader has no way to tell a dead link from a slow one. Any
  // arrival handler can call this and get the same honest, dismissible answer.
  // Idempotent by id, never throws, and self-defers until there is a body to
  // attach to.
  function notice(id, kicker, message) {
    try {
      if (!id || document.getElementById(id)) return false;
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', function () { notice(id, kicker, message); });
        return false;
      }
      var el = document.createElement('div');
      el.id = id;
      el.setAttribute('role', 'status');
      el.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
        'z-index:99999', 'max-width:min(560px,calc(100vw - 24px))',
        'background:#141c2e', 'border:1px solid #2a3550', 'border-radius:12px',
        'box-shadow:0 12px 34px rgba(0,0,0,.45)', 'padding:14px 16px',
        'color:#eef4ff', 'font:14px/1.5 Barlow,system-ui,-apple-system,sans-serif'
      ].join(';');
      el.innerHTML =
        '<strong style="display:block;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#f59e0b;margin-bottom:6px">' +
          esc(kicker) + '</strong>' +
        '<span>' + esc(message) + '</span> ' +
        '<button type="button" style="background:none;border:0;color:#9fb4d4;cursor:pointer;font:inherit;text-decoration:underline">Dismiss</button>';
      var btn = el.querySelector('button');
      if (btn) btn.addEventListener('click', function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.body.appendChild(el);
      return true;
    } catch (e) { return false; /* nothing to say, and nothing worth breaking over */ }
  }

  function voteFallback() {
    // Wrapped whole: a notice that a link failed must never itself be the thing
    // that breaks the page it is apologising on.
    try {
      var m = VOTE_PATH.exec(location.pathname || '');
      if (!m) return;
      var chamber = /^senate$/i.test(m[2]) ? 'Senate' : /^house$/i.test(m[2]) ? 'House' : m[2];
      notice('pdx-vote-unresolved', 'Roll-call vote',
        'We couldn’t open ' + chamber + ' roll call ' + m[3] +
        ' of the ' + m[1] + 'th Congress. Rather than quietly show you the front page, ' +
        'here’s the plain answer: that link didn’t resolve to a record we could load.');
    } catch (e) { /* nothing to say, and nothing worth breaking over */ }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Canonical share URLs ────────────────────────────────────────────────────
  // The single place that knows how to write a link worth pasting. Share buttons
  // call these so every surface emits the same, previewable form.
  //
  // Every builder here anchors on origin() + '/' and NEVER on location.pathname.
  // That is not a style choice. The app is served from several addresses that all
  // rewrite to the same document — '/', '/vote/<congress>/<chamber>/<roll>', and
  // whatever else netlify.toml grows — so a link built by pasting a query onto
  // "wherever the reader happens to be" inherits an address that means something
  // else. A profile shared from a /vote/ page came out as
  // /vote/119/house/12?p=scalise: the profile did open, and then voteFallback()
  // above put a "we couldn't open that roll call" notice on top of it, because the
  // path still claimed to be a roll call nobody had resolved. Rooting the builder
  // removes the whole class.
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
    // A politician profile. Root-anchored on purpose — see the note above.
    profile: function (pid) {
      if (!pid) return '';
      return origin() + '/?p=' + encodeURIComponent(pid);
    },
    // ── The one answer to "what URL opens what this reader is looking at?" ─────
    // Share controls live on two kinds of surface and used to emit one kind of
    // link. A button inside an issue dossier — Scalise / Secure & Accessible
    // Voting — sent /?p=scalise, and the reader who followed it landed on the
    // profile shell with no idea which of nineteen issues had been shared. The
    // dossier already HAS an address: #record=<pid>~<issue>, which record() puts
    // in server-visible form and which receipt-cards.js opens straight onto the
    // Official Record gap view. This picks the most specific address that is true
    // for the target, and returns '' when there is nothing addressable — a caller
    // that gets '' must say so rather than shipping a link to the front page.
    forTarget: function (t) {
      t = t || {};
      var pid = t.pid ? String(t.pid) : '';
      if (!pid) return '';
      var iss = t.issueKey ? String(t.issueKey) : '';
      if (iss) return API.record(pid, iss);
      return API.profile(pid);
    },
    // What that link will open, in the words a share sheet can print. Kept beside
    // the builder so the promise and the destination can never drift apart.
    targetLabel: function (t) {
      t = t || {};
      if (!t.pid) return '';
      return t.issueKey ? 'the Official Record for this issue' : 'their profile';
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ARTIFACT GUARD  ·  nothing empty may leave the app
    // ──────────────────────────────────────────────────────────────────────────
    // Every image share in this app ends at one of two emitters: a Blob handed to
    // navigator.share({files}), or a data: URL handed to an <a download>. Neither
    // emitter validates what it is given, and neither browser API complains: a
    // canvas that failed to draw encodes to a zero-byte Blob, `new File([blob])`
    // wraps it without objection, and the receiving app — the iOS share sheet,
    // Files, "Print to PDF" — writes exactly what it was handed. Zero bytes. The
    // reader sees a share that reported success and a file that will not open.
    //
    // A PNG cannot be shorter than its 8-byte signature plus an IHDR chunk, so
    // anything under the floor below is not a truncated image, it is not an image.
    // Both guards return a boolean rather than throwing: the caller's job is to
    // say "could not build the card on this device", not to crash the page.
    // ══════════════════════════════════════════════════════════════════════════
    MIN_ARTIFACT_BYTES: 64,
    blobOk: function (blob) {
      if (!blob) return false;
      var n = blob.size;
      if (typeof n !== 'number' || !isFinite(n)) return false;
      return n >= API.MIN_ARTIFACT_BYTES;
    },
    // The data: URL form of the same question. Measured on the payload after the
    // comma, because "data:image/png;base64," is 22 characters of pure nothing and
    // downloads as a zero-length file.
    dataUrlOk: function (s) {
      if (!s || typeof s !== 'string') return false;
      if (s.slice(0, 5) !== 'data:') return false;
      var i = s.indexOf(',');
      if (i < 0) return false;
      var payload = s.slice(i + 1);
      if (!payload) return false;
      // base64 packs 3 bytes into 4 characters; anything else is already bytes.
      var bytes = /;base64/i.test(s.slice(0, i)) ? Math.floor(payload.length * 3 / 4) : payload.length;
      return bytes >= API.MIN_ARTIFACT_BYTES;
    },

    // ══════════════════════════════════════════════════════════════════════════
    // NATIVE SHARE  ·  one call, and it always reports what happened
    // ──────────────────────────────────────────────────────────────────────────
    // Six surfaces called navigator.share() directly and all six ended the same
    // way: .catch(function () {}). That swallows the user cancelling — correct —
    // and it also swallows NotAllowedError (no transient activation), a payload
    // the platform refuses, and a share target that failed mid-flight. Those are
    // indistinguishable from success at the call site, so the button did nothing
    // and said nothing.
    //
    // This resolves — never rejects — to one of four outcomes, so every caller can
    // fall back honestly:
    //   'shared'      handed off to the platform
    //   'cancelled'   the reader dismissed the sheet; do nothing, say nothing
    //   'unsupported' no navigator.share here; caller should copy the link
    //   'invalid'     the payload had no url and no files; caller must not pretend
    //   'failed'      the platform refused or threw; caller should copy the link
    //
    // Only AbortError is a cancellation. The old call sites also treated
    // NotAllowedError as one — but that is the platform saying the gesture had no
    // transient activation, i.e. the share never opened at all. Filed under
    // "cancelled" it looked like the reader had changed their mind; it is in fact
    // the exact case where a fallback is owed.
    //
    // It also enforces the payload contract: a share with neither a url nor a file
    // is a share of nothing, and a title is what the receiving app puts in its
    // subject line. Callers that hand over a file get the url kept alongside it,
    // so the image always travels with a way back to the record behind it.
    // ══════════════════════════════════════════════════════════════════════════
    native: function (payload) {
      var p = payload || {};
      var out = { ok: false, outcome: 'invalid' };
      var hasFiles = !!(p.files && p.files.length);
      if (!p.url && !hasFiles) return Promise.resolve(out);
      var nav = null;
      try { nav = navigator; } catch (e) { nav = null; }
      if (!nav || typeof nav.share !== 'function') {
        return Promise.resolve({ ok: false, outcome: 'unsupported' });
      }
      // Files are the strictest branch: a platform that cannot take THIS file must
      // be asked before the sheet opens, or it throws mid-gesture and the reader
      // is left with an aborted share instead of a link.
      if (hasFiles) {
        var can = false;
        try { can = !!(nav.canShare && nav.canShare({ files: p.files })); } catch (e) { can = false; }
        if (!can) return Promise.resolve({ ok: false, outcome: 'unsupported' });
      }
      var send = {};
      if (p.title) send.title = String(p.title);
      if (p.text) send.text = String(p.text);
      if (p.url) send.url = String(p.url);
      if (hasFiles) send.files = p.files;
      try {
        return Promise.resolve(nav.share(send)).then(
          function () { return { ok: true, outcome: 'shared' }; },
          function (e) {
            var name = (e && e.name) || '';
            if (name === 'AbortError') return { ok: false, outcome: 'cancelled' };
            return { ok: false, outcome: 'failed', error: name || 'share failed' };
          }
        );
      } catch (e) {
        return Promise.resolve({ ok: false, outcome: 'failed', error: (e && e.name) || 'share threw' });
      }
    },
    _hashFor: hashFor,
    notice: notice,
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
