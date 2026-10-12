/* ═══════════════════════════════════════════════════════════════════════════
   issue-poll.js — ONE POLL ON AN ISSUE FILE, AND THE DOOR TO ITS COMMENTS
   ───────────────────────────────────────────────────────────────────────────
   Painted on the issue file's letterhead (issue-file.js, after the district
   room) for the issues on ISSUES below and no other. It is the district board
   poll — the same Support / Oppose / Not sure, the same store, the same gate —
   read and cast from the issue file, so the formal record above it and the
   local voice it points to sit next to each other.

   THE STORE AND THE GATE ARE THE BOARD'S. Every read and write goes to
   /api/district-board-poll, the endpoint district-poll.js already uses on the
   boards. Counts are open to everyone. A vote is written only when the server
   says `voice.canVote: true` — signed in AND a vendor-verified residency row
   for THAT seat — and an unverified POST is answered 403 by the server and
   writes nothing. Nothing in this file can open the buttons on its own: no
   local flag, no typed zip, no location claim.

   WHICH SEAT. The question is a congressional one, so the seat is one of
   Utah's federal boards. A reader whose saved location names their U.S. House
   or U.S. Senate seats (PDXVoice.seatsForMe) is shown those, House first; a
   reader with no saved location picks from the six. Counts appear only once a
   seat is chosen — a count is always a count on ONE seat, never a sum.

   THE JUMP. "See the district's voice" opens that seat's board on this issue's
   comments: /district/<seat>?topic=<issueKey>#pdx-topic-comments, which
   district-composer.js reads. No new board and no address pattern — every
   seat here is a named row the boards already serve.

   Counts are integers off the wire. Nothing here computes a proportion, a
   majority or a mood, and nothing is kept on the device.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/district-board-poll';
  // The issues that carry this poll. One row each; nothing composes a key.
  var ISSUES = { stock_trading_ban: 1 };
  // Utah's federal boards, House first. Named rows the boards already serve.
  var BOARDS = [
    { seat: 'ut-cd-1', label: 'Utah’s 1st Congressional District' },
    { seat: 'ut-cd-2', label: 'Utah’s 2nd Congressional District' },
    { seat: 'ut-cd-3', label: 'Utah’s 3rd Congressional District' },
    { seat: 'ut-cd-4', label: 'Utah’s 4th Congressional District' },
    { seat: 'ut-us-senate-lee', label: 'U.S. Senate · Mike Lee' },
    { seat: 'ut-us-senate-curtis', label: 'U.S. Senate · John Curtis' }
  ];
  var CHOICES = [
    { key: 'support', label: 'Support' },
    { key: 'oppose', label: 'Oppose' },
    { key: 'not_sure', label: 'Not sure' }
  ];
  var TOPIC_ANCHOR = 'pdx-topic-comments';
  var LOCKED_LINE = 'Only verified residents of this seat get a voice that counts.';
  var COPY = {
    hd: 'The district’s voice',
    pick: 'Choose a Utah seat to read its votes.',
    yours: 'Your seats',
    all: 'Utah’s federal seats',
    legend: 'On this seat, where do you stand on this issue?',
    wait: 'Reading votes…',
    unread: 'We could not read this poll’s votes just now. This is not an empty poll — it is a read that failed.',
    failed: 'That vote did not go through.',
    notTaken: 'That vote did not go through. This seat is not taking another vote from this account right now.',
    saved: 'Vote saved. You can change it.',
    jump: 'See the district’s voice',
    jumpTail: ' — this issue’s comments on the board',
    foot: 'Votes carry no name. Counts only.'
  };

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function boardOf(seat) {
    for (var i = 0; i < BOARDS.length; i++) if (BOARDS[i].seat === seat) return BOARDS[i];
    return null;
  }

  // ── THE CALLER ────────────────────────────────────────────────────────────
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
        method: method, headers: headers, cache: 'no-store',
        body: body ? JSON.stringify(body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // The reader's own federal seats, from the one hallway resolver, House first.
  function mySeats() {
    var out = [];
    try {
      var V = window.PDXVoice;
      var rows = (V && fn(V.seatsForMe)) ? (V.seatsForMe() || []) : [];
      for (var i = 0; i < rows.length; i++) {
        var m = /^\/district\/([a-z0-9-]+)$/.exec(String((rows[i] && rows[i].board) || ''));
        if (m && boardOf(m[1]) && out.indexOf(m[1]) < 0) out.push(m[1]);
      }
    } catch (e) { out = []; }
    out.sort(function (a, b) {
      return BOARDS.indexOf(boardOf(a)) - BOARDS.indexOf(boardOf(b));
    });
    return out;
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _seat = '';         // the seat being read; '' until one is known or picked
  var _picked = false;    // the reader chose it, so a later resolver does not move it
  var _read = {};         // seat → null (in flight) | false (failed) | payload
  var _busy = false;
  var _status = '';

  function readOf(seat) { return has(_read, seat) ? _read[seat] : undefined; }
  function canVote() {
    var r = readOf(_seat);
    return !!(r && r.voice && r.voice.canVote === true);
  }
  function tally(key) {
    var r = readOf(_seat);
    var list = (r && Array.isArray(r.polls)) ? r.polls : [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].issueKey === key) return list[i];
    return { support: 0, oppose: 0, not_sure: 0, total: 0 };
  }
  function mineOf(key) {
    var r = readOf(_seat);
    return (r && r.mine && typeof r.mine === 'object' && r.mine[key]) || '';
  }

  function jumpHref(seat, key) {
    return '/district/' + seat + '?topic=' + encodeURIComponent(key) + '#' + TOPIC_ANCHOR;
  }

  function chooseSeat() {
    if (_picked) return;
    var mine = mySeats();
    if (mine.length && mine.indexOf(_seat) < 0) _seat = mine[0];
  }

  // ── THE MARKUP ────────────────────────────────────────────────────────────
  function innerHtml(key) {
    var mine = mySeats();
    var list = mine.length ? mine : BOARDS.map(function (b) { return b.seat; });
    var h = '<h3 class="pdxip-h">' + esc(COPY.hd) + '</h3>' +
      '<p class="pdxip-k">' + esc(mine.length ? COPY.yours : COPY.all) + '</p>' +
      '<div class="pdxip-seats" role="group" aria-label="' + esc(COPY.all) + '">';
    for (var i = 0; i < list.length; i++) {
      var b = boardOf(list[i]);
      h += '<button type="button" class="pdxip-seat" data-pdxip-seat="' + esc(b.seat) + '"' +
        ' aria-pressed="' + (b.seat === _seat ? 'true' : 'false') + '">' + esc(b.label) + '</button>';
    }
    h += '</div>';
    if (!_seat) return h + '<p class="pdxip-note">' + esc(COPY.pick) + '</p>';

    var r = readOf(_seat);
    var open = canVote() && !_busy;
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var t = tally(key);
    h += '<fieldset class="pdxip-fs"><legend class="pdxip-lg">' + esc(COPY.legend) + '</legend>';
    if (r === null || r === undefined) h += '<p class="pdxip-note" role="status">' + esc(COPY.wait) + '</p>';
    else if (r === false) h += '<p class="pdxip-note">' + esc(COPY.unread) + '</p>';
    h += '<div class="pdxip-opts">';
    for (var j = 0; j < CHOICES.length; j++) {
      var c = CHOICES[j];
      h += '<button type="button" class="pdxip-opt" data-pdxip-choice="' + c.key + '"' +
        ' data-pdxip-issue="' + esc(key) + '" aria-pressed="' + (mineOf(key) === c.key ? 'true' : 'false') + '"' + dis + '>' +
        esc(c.label) +
        (r ? '<span class="pdxip-c" data-pdxip-count="' + c.key + '">' + (t[c.key] || 0) + '</span>' : '') +
      '</button>';
    }
    h += '</div>';
    if (!canVote()) {
      var v = (r && r.voice) || {};
      h += '<p class="pdxip-locked" data-pdxip-locked="1">' + esc(v.line || LOCKED_LINE) + '</p>';
      if (v.note) h += '<p class="pdxip-note">' + esc(v.note) + '</p>';
    }
    if (_status) h += '<p class="pdxip-note" role="status">' + esc(_status) + '</p>';
    h += '</fieldset>' +
      '<p class="pdxip-jumpp"><a class="pdxip-jump" data-pdxip-jump="1" href="' + esc(jumpHref(_seat, key)) + '">' +
        esc(COPY.jump) + '<span class="pdxip-jump-h">' + esc(COPY.jumpTail) + '</span></a></p>' +
      '<p class="pdxip-note">' + esc(COPY.foot) + '</p>';
    return h;
  }

  // The letterhead's slot. '' for every issue not on ISSUES, so every other
  // issue file is byte-identical to what it was.
  function html(key) {
    var k = String(key == null ? '' : key);
    if (!has(ISSUES, k)) return '';
    injectCss();
    wire();
    chooseSeat();
    if (_seat && readOf(_seat) === undefined) load(_seat);
    return '<section class="pdxip" data-pdxip-host="' + esc(k) + '">' + innerHtml(k) + '</section>';
  }

  function repaint() {
    var hosts = [];
    try { hosts = document.querySelectorAll('[data-pdxip-host]') || []; } catch (e) { hosts = []; }
    for (var i = 0; i < hosts.length; i++) {
      var k = hosts[i].getAttribute('data-pdxip-host') || '';
      if (has(ISSUES, k)) hosts[i].innerHTML = innerHtml(k);
    }
  }

  function load(seat) {
    if (!seat) return Promise.resolve();
    _read[seat] = null;
    return call('GET', '?seat=' + encodeURIComponent(seat)).then(function (res) {
      _read[seat] = (res.ok && res.data && Array.isArray(res.data.polls)) ? res.data : false;
      repaint();
    });
  }

  function vote(key, choice) {
    if (!key || _busy || !canVote() || !has(ISSUES, key)) return;
    var seat = _seat;
    _busy = true;
    _status = '';
    repaint();
    call('POST', '', { seat: seat, issueKey: key, choice: choice }).then(function (res) {
      _busy = false;
      var r = readOf(seat) || {};
      if (res.ok && res.data && res.data.poll) {
        var polls = (Array.isArray(r.polls) ? r.polls : []).filter(function (p) { return p && p.issueKey !== key; });
        polls.push(res.data.poll);
        r.polls = polls;
        r.mine = r.mine && typeof r.mine === 'object' ? r.mine : {};
        r.mine[key] = res.data.mine || choice;
        _status = COPY.saved;
      } else if (res.status === 403) {
        r.voice = { canVote: false, reason: res.data.code || '', line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
      } else if (res.status === 429 || (res.data && res.data.code === 'monthly_cap')) {
        _status = COPY.notTaken;
      } else {
        _status = (res.data && res.data.error) || COPY.failed;
      }
      _read[seat] = r;
      repaint();
    });
  }

  function pick(seat) {
    if (!boardOf(seat)) return;
    _picked = true;
    _status = '';
    if (seat !== _seat) {
      _seat = seat;
      if (readOf(seat) === undefined) load(seat);
    }
    repaint();
  }

  var _wired = false;
  function wire() {
    if (_wired) return;
    _wired = true;
    try {
      document.addEventListener('click', function (ev) {
        var t = ev && ev.target;
        if (!t || !fn(t.closest)) return;
        var s = t.closest('[data-pdxip-seat]');
        if (s) { pick(s.getAttribute('data-pdxip-seat') || ''); return; }
        var b = t.closest('[data-pdxip-choice]');
        if (b && !b.disabled) vote(b.getAttribute('data-pdxip-issue') || '', b.getAttribute('data-pdxip-choice') || '');
      });
    } catch (e) {}
    // Signing in can only ever open the buttons if the server then says so.
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) {
        window.auth.onAuthStateChanged(function () { _read = {}; if (_seat) load(_seat); });
      }
    } catch (e) {}
  }

  var CSS =
    '.pdxip{margin:.9rem 0 .2rem;padding:.7rem .8rem;border:1px solid #1d2b45;border-radius:10px;background:#0c1526}' +
    '.pdxip-h{margin:0 0 .3rem;font-size:.92rem;color:#e7eefb}' +
    '.pdxip-k{margin:.1rem 0 .35rem;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;color:#93a8c6}' +
    '.pdxip-seats,.pdxip-opts{display:flex;flex-wrap:wrap;gap:.4rem}' +
    '.pdxip-seat,.pdxip-opt{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .7rem;border:1px solid #2a3c5e;border-radius:999px;background:#101c33;color:#dbe6f7;font:inherit;font-size:.82rem;cursor:pointer}' +
    '.pdxip-seat[aria-pressed="true"],.pdxip-opt[aria-pressed="true"]{border-color:#7fb2ff;background:#16284a}' +
    '.pdxip-opt:disabled{opacity:.55;cursor:not-allowed}' +
    '.pdxip-fs{margin:.6rem 0 0;padding:0;border:0;display:grid;gap:.45rem}' +
    '.pdxip-lg{padding:0;font-size:.86rem;color:#dbe6f7}' +
    '.pdxip-c{font-size:.76rem;color:#93a8c6;font-variant-numeric:tabular-nums}' +
    '.pdxip-note,.pdxip-locked{margin:.35rem 0 0;font-size:.78rem;color:#93a8c6}' +
    '.pdxip-locked{color:#c4b58a}' +
    '.pdxip-jumpp{margin:.55rem 0 0}' +
    '.pdxip-jump{color:#9ec8ff;font-size:.86rem;font-weight:600;text-decoration:none}' +
    '.pdxip-jump:hover{text-decoration:underline}' +
    '.pdxip-jump-h{font-weight:400;color:#93a8c6}' +
    '.pdxip-seat:focus-visible,.pdxip-opt:focus-visible,.pdxip-jump:focus-visible{outline:2px solid #7fb2ff;outline-offset:2px}';
  function injectCss() {
    try {
      if (document.getElementById('pdxip-css')) return;
      var s = document.createElement('style');
      s.id = 'pdxip-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  window.PDXIssuePoll = {
    API: API,
    ISSUES: ISSUES,
    BOARDS: BOARDS,
    CHOICES: CHOICES,
    COPY: COPY,
    LOCKED_LINE: LOCKED_LINE,
    TOPIC_ANCHOR: TOPIC_ANCHOR,
    html: html,
    jumpHref: jumpHref,
    pick: pick,
    seat: function () { return _seat; },
    canVote: canVote,
    refresh: function () { _read = {}; if (_seat) load(_seat); }
  };
})();
