/* ═══════════════════════════════════════════════════════════════════════════
   district-composer.js — THE ONE BOARD THAT TAKES A VOICE (/district/ut-sd-3)
   ───────────────────────────────────────────────────────────────────────────
   Loaded by district-ut-sd-3.html and by no other document. It mounts only on
   a #pdx-district-composer host whose data-pdxdc-seat is on COMPOSER_SEATS, and
   that host is in SD-3's markup only — every other board stays a reader and
   keeps district-board.js's disabled "Posting ships next" seam.

   THE BOX IS OFF UNTIL THE SERVER SAYS OTHERWISE. The served markup is a
   disabled field with the locked line. This module turns it on only when
   GET /api/district-board-voice answers `voice.canPost: true` for the signed-in
   caller — which needs a vendor-verified residency row for this seat (Stripe
   Identity / Veriff). That vendor is not connected, so today nobody gets it,
   and nothing here can fake it: there is no local flag, no typed zip, no
   location claim. A failed read keeps the box off.

   Posts are read from the same endpoint, newest first, with no name, email or
   address on the wire. After a post lands, band 2 is re-read from the store
   through PDXDistrictBoard.refresh(), so the count the reader moved is the
   count they see.

   No money copy, no poll, no replies, no score.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/district-board-voice';
  var COMPOSER_SEATS = { 'ut-sd-3': 1 };
  var POST_MAX = 280;
  var LOCKED_LINE = 'Only verified residents of this seat get a voice that counts.';
  var COPY = {
    label: 'Say something to this district',
    issue: 'Issue',
    issuePick: 'Choose an issue',
    placeholder: 'Only verified residents of this seat can post here.',
    send: 'Post',
    sending: 'Posting…',
    sent: 'Posted.',
    feedHd: 'What residents have said',
    feedWait: 'Reading posts…',
    feedEmpty: 'No posts on hand for this seat.',
    feedUnread: 'We could not read this board’s posts just now. This is not an empty board — it is a read that failed.',
    unreadNote: 'Posting stays off until this board can confirm who you are.',
    failed: 'That post did not go through.',
    mine: 'You'
  };

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── THE CALLER ────────────────────────────────────────────────────────────
  // Firebase's own handle, never an anonymous one.
  function tokenUser() {
    try {
      var cu = window.auth && window.auth.currentUser;
      if (!cu || cu.isAnonymous === true || !fn(cu.getIdToken)) return null;
      return cu;
    } catch (e) { return null; }
  }
  function bearer() {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken()).then(function (t) { return t || null; }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function call(method, query, body) {
    return bearer().then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (query || ''), {
        method: method,
        headers: headers,
        cache: 'no-store',
        body: body ? JSON.stringify(body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // ── THE ISSUES A POST CAN BE FILED UNDER ─────────────────────────────────
  // This seat's own table first — what band 3 printed — and the whole shipped
  // vocabulary only when the table has nothing. The server checks the key
  // against dd_issue_keys either way.
  function issueLabel(key) {
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issueLabel)) return B.issueLabel(key) || '';
    } catch (e) {}
    return '';
  }
  function issueKeys() {
    var out = [];
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issues)) out = B.issues() || [];
    } catch (e) {}
    if (!out.length) {
      try {
        var M = window.ISSUE_MAP;
        if (M && typeof M === 'object') out = Object.keys(M);
      } catch (e) {}
    }
    var keep = [];
    for (var i = 0; i < out.length; i++) {
      if (out[i] && issueLabel(out[i])) keep.push(out[i]);
    }
    return keep;
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _host = null;
  var _seat = '';
  var _read = null;      // null = in flight, false = failed, else the payload
  var _posts = [];
  var _status = '';
  var _draft = '';
  var _issue = '';
  var _busy = false;

  function canPost() {
    return !!(_read && _read.voice && _read.voice.canPost === true);
  }

  function optionsHtml() {
    var keys = issueKeys();
    var h = '<option value="">' + esc(COPY.issuePick) + '</option>';
    for (var i = 0; i < keys.length; i++) {
      h += '<option value="' + esc(keys[i]) + '"' + (keys[i] === _issue ? ' selected' : '') + '>' +
        esc(issueLabel(keys[i])) + '</option>';
    }
    return h;
  }

  function when(v) {
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  function feedHtml() {
    if (_read === null) return '<p class="pdxdb-wait" role="status">' + esc(COPY.feedWait) + '</p>';
    if (_read === false) return '<p class="pdxdb-unread">' + esc(COPY.feedUnread) + '</p>';
    if (!_posts.length) return '<p class="pdxdb-none">' + esc(_read.postsEmpty || COPY.feedEmpty) + '</p>';
    var h = '<ol class="pdxdc-feed">';
    for (var i = 0; i < _posts.length; i++) {
      var p = _posts[i] || {};
      var lb = issueLabel(p.issueKey);
      h += '<li class="pdxdc-post">' +
        '<p class="pdxdc-post-meta">' +
          (lb ? '<span class="pdxdc-post-issue">' + esc(lb) + '</span>' : '') +
          (when(p.createdAt) ? '<span>' + esc(when(p.createdAt)) + '</span>' : '') +
          (p.mine === true ? '<span class="pdxdc-post-mine">' + esc(COPY.mine) + '</span>' : '') +
        '</p>' +
        '<p class="pdxdc-post-body">' + esc(p.body) + '</p>' +
      '</li>';
    }
    return h + '</ol>';
  }

  function render() {
    if (!_host) return;
    var open = canPost() && !_busy;
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var v = (_read && _read.voice) || {};
    var line = canPost() ? '' : (v.line || LOCKED_LINE);
    var note = _read === false ? COPY.unreadNote : (v.note || '');
    var len = [...String(_draft)].length;

    _host.setAttribute('data-pdxdc-state', canPost() ? 'open' : 'locked');
    _host.innerHTML =
      '<section class="pdxdb-band pdxdb-band--compose" data-pdxdb-band="compose">' +
        '<h2 class="pdxdb-h2">' + esc(COPY.label) + '</h2>' +
        (line ? '<p class="pdxdc-locked" data-pdxdc-locked="1">' + esc(line) + '</p>' : '') +
        '<form class="pdxdc-form" novalidate>' +
          '<label class="pdxdc-l" for="pdxdc-issue">' + esc(COPY.issue) + '</label>' +
          '<select class="pdxdc-sel" id="pdxdc-issue" name="issueKey"' + dis + '>' + optionsHtml() + '</select>' +
          '<label class="pdxdc-l" for="pdxdc-body">' + esc(COPY.label) + '</label>' +
          '<textarea class="pdxdc-ta" id="pdxdc-body" name="body" rows="3" maxlength="' + POST_MAX + '"' +
            ' placeholder="' + esc(COPY.placeholder) + '"' + dis + '>' + esc(_draft) + '</textarea>' +
          '<div class="pdxdc-row">' +
            '<span class="pdxdc-len" aria-live="polite">' + len + ' / ' + POST_MAX + '</span>' +
            '<button class="pdxdc-btn" type="submit"' + dis + '>' + esc(_busy ? COPY.sending : COPY.send) + '</button>' +
          '</div>' +
          (_status ? '<p class="pdxdc-status" role="status">' + esc(_status) + '</p>' : '') +
        '</form>' +
        (note ? '<p class="pdxdb-foot">' + esc(note) + '</p>' : '') +
      '</section>' +
      '<section class="pdxdb-band pdxdb-band--posts" data-pdxdb-band="posts">' +
        '<h2 class="pdxdb-h2">' + esc(COPY.feedHd) + '</h2>' +
        '<p class="pdxdb-note">Posts carry no name, email or address.</p>' +
        feedHtml() +
      '</section>';
    wireForm();
  }

  function wireForm() {
    var form = _host.querySelector('form');
    if (!form) return;
    var ta = form.querySelector('textarea');
    var sel = form.querySelector('select');
    var len = form.querySelector('.pdxdc-len');
    if (ta) ta.addEventListener('input', function () {
      _draft = ta.value;
      if (len) len.textContent = [...String(_draft)].length + ' / ' + POST_MAX;
    });
    if (sel) sel.addEventListener('change', function () { _issue = sel.value; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      submit();
    });
  }

  function load() {
    return call('GET', '?seat=' + encodeURIComponent(_seat)).then(function (res) {
      if (!res.ok || !res.data || !Array.isArray(res.data.posts)) {
        _read = false;
        _posts = [];
      } else {
        _read = res.data;
        _posts = res.data.posts;
      }
      render();
    });
  }

  function submit() {
    if (_busy || !canPost()) return;
    _busy = true;
    _status = '';
    render();
    call('POST', '', { seat: _seat, issueKey: _issue, body: _draft }).then(function (res) {
      _busy = false;
      if (res.status === 201 && res.data && res.data.post) {
        _posts = [res.data.post].concat(_posts);
        _draft = '';
        _status = COPY.sent;
        try {
          var B = window.PDXDistrictBoard;
          if (B && fn(B.refresh)) B.refresh();
        } catch (e) {}
        render();
        return;
      }
      if (res.status === 403) {
        // The server closed the gate: say so and turn the box off.
        _read = _read || {};
        _read.voice = { canPost: false, line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
        _status = '';
      } else {
        _status = (res.data && res.data.error) || COPY.failed;
      }
      render();
    });
  }

  function mount(host) {
    var el = host || document.getElementById('pdx-district-composer');
    if (!el) return false;
    var seat = String(el.getAttribute('data-pdxdc-seat') || '').toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, seat)) return false;
    _host = el;
    _seat = seat;
    render();
    load();
    // Re-ask whenever the account changes — signing in can only ever turn the
    // box on if the SERVER then says this account is verified for this seat.
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) {
        window.auth.onAuthStateChanged(function () { load(); });
      }
    } catch (e) {}
    // The issue list is band 3's; repaint the select when the board repaints.
    try {
      document.addEventListener('pdxdb:paint', function () {
        var sel = _host && _host.querySelector('select');
        if (sel) sel.innerHTML = optionsHtml();
      });
    } catch (e) {}
    return true;
  }

  window.PDXDistrictComposer = {
    API: API,
    COMPOSER_SEATS: COMPOSER_SEATS,
    LOCKED_LINE: LOCKED_LINE,
    COPY: COPY,
    mount: mount,
    canPost: canPost
  };

  function go() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
