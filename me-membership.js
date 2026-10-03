/* ─────────────────────────────────────────────────────────────────────────────
   /me — MEMBERSHIP, ONE CONTROL
   ─────────────────────────────────────────────────────────────────────────────
   The block's four lines are static in me.html (#pdx-me-membership): reading is
   free, a verified resident gets one comment and one poll vote a day on that
   seat, $20 a year removes the cap, and only a verified resident of that seat
   has a voice that counts. This file paints the one control under
   them, and nothing else:

     signed out      the sign-in line, no button
     signed in       "Become a member — $20 a year" → POST /api/membership →
                     Stripe Checkout, which returns to /me
     member          the active line, no button

   ?membership=returned|cancelled is Stripe's return; it prints one line and
   then asks the server again, because only the signed webhook turns the flag
   on and that can land a few seconds after the reader does.

   It never writes a flag, never claims residency, and is not on any board —
   boards do not grow a pay button in this pass.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var API = '/api/membership';
  var COPY = {
    signedOut: 'Sign in to become a member.',
    join: 'Become a member — $20 a year',
    joining: 'Opening checkout…',
    active: 'You are a member. The daily cap is off on every seat you are verified for.',
    returned: 'Thanks. Your membership turns on as soon as Stripe confirms the payment.',
    cancelled: 'Checkout was cancelled. Nothing was charged.',
    unavailable: 'Membership checkout is not available right now.'
  };

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function authObj() {
    try {
      return (typeof auth !== 'undefined' && auth) ? auth
        : (window.firebase && fn(window.firebase.auth) ? window.firebase.auth() : null);
    } catch (e) { return null; }
  }
  function tokenUser() {
    try {
      var a = authObj();
      var u = a && a.currentUser;
      return (u && u.isAnonymous !== true && fn(u.getIdToken)) ? u : null;
    } catch (e) { return null; }
  }
  function bearer() {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken()).then(function (t) { return t || null; }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function call(method) {
    return bearer().then(function (t) {
      if (!t) return { ok: false, status: 403, data: { signedIn: false } };
      return fetch(API, {
        method: method,
        headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + t },
        cache: 'no-store'
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          return { ok: res.ok, status: res.status, data: d || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  var _host = null;
  var _state = { signedIn: false, member: false };
  var _busy = false;
  var _status = '';
  var _returned = '';

  function paint() {
    if (!_host) return;
    var html = '';
    if (_returned === 'returned' && !_state.member) html += '<p class="pdxmm-status" role="status">' + esc(COPY.returned) + '</p>';
    if (_returned === 'cancelled') html += '<p class="pdxmm-status" role="status">' + esc(COPY.cancelled) + '</p>';
    if (_state.member) {
      html += '<p class="pdxmm-active">' + esc(COPY.active) + '</p>';
    } else if (!_state.signedIn) {
      html += '<p class="pdxmm-note">' + esc(COPY.signedOut) + '</p>';
    } else {
      html += '<button type="button" class="pdxmm-join" data-pdxmm-join="1"' + (_busy ? ' disabled' : '') + '>' +
        esc(_busy ? COPY.joining : COPY.join) + '</button>';
    }
    if (_status) html += '<p class="pdxmm-status" role="status">' + esc(_status) + '</p>';
    _host.innerHTML = html;
  }

  function load() {
    return call('GET').then(function (res) {
      var d = res.data || {};
      _state = { signedIn: !!(res.ok && d.signedIn), member: !!(res.ok && d.member) };
      paint();
      return _state;
    });
  }

  function join() {
    if (_busy) return;
    _busy = true; _status = ''; paint();
    call('POST').then(function (res) {
      _busy = false;
      var url = res.ok && res.data && typeof res.data.url === 'string' ? res.data.url : '';
      if (/^https:\/\/checkout\.stripe\.com\//.test(url)) { window.location.assign(url); return; }
      if (res.ok && res.data && res.data.member) { _state.member = true; paint(); return; }
      _status = (res.data && res.data.error) || COPY.unavailable;
      paint();
    });
  }

  function boot() {
    _host = document.getElementById('pdx-me-membership-act');
    if (!_host) return;
    try {
      var q = new URLSearchParams(window.location.search).get('membership');
      if (q === 'returned' || q === 'cancelled') _returned = q;
    } catch (e) {}
    _host.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-pdxmm-join]') : null;
      if (t) join();
    });
    paint();
    load();
    if (_returned === 'returned') {
      [5000, 15000, 40000].forEach(function (ms) {
        setTimeout(function () { if (!_state.member) load(); }, ms);
      });
    }
    try {
      var a = authObj();
      if (a && fn(a.onAuthStateChanged)) a.onAuthStateChanged(function () { load(); });
    } catch (e) {}
  }

  window.PDXMembership = { COPY: COPY, load: load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
