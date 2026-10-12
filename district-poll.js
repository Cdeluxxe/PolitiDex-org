/* ═══════════════════════════════════════════════════════════════════════════
   district-poll.js — ONE POLL PER ISSUE GROUP, on every composer board
   ───────────────────────────────────────────────────────────────────────────
   Loaded by every district board document, beside district-composer.js. It
   mounts only on a #pdx-district-poll host whose data-pdxdp-seat is on
   POLL_SEATS (named rows, the composer's own, no pattern — the generated rows
   are written by scripts/gen-district-boards.mjs).

   WHAT IT PAINTS. district-board.js owns band 3 ("On the table") and prints one
   <details> group per issue. After every board paint (the pdxdb:paint event)
   this module adds, to each issue group:

     · on the header, always: the count — "n votes". A CLOSED group shows that
       and nothing else; no widget is in its markup.
     · inside the group, only while it is OPEN: one poll — Support / Oppose /
       Not sure for that issue on this seat — with each option's count.

   THE BUTTONS ARE OFF UNTIL THE SERVER SAYS OTHERWISE. They are enabled only
   when GET /api/district-board-poll answers `voice.canVote: true`, which is the
   composer's gate: signed in AND a vendor-verified residency flag for THIS
   seat, which only the signed Didit decision writes. Without it the buttons
   are disabled and the locked line is printed. Nothing here can fake it — no
   local flag, no typed zip, no location claim. A failed read keeps them off
   and prints no count rather than a zero.

   Counts are integers off the wire; nothing here computes a proportion, a majority
   or a mood, and nothing is kept on the device. After a vote lands, band 2 is
   re-read through PDXDistrictBoard.refresh().
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/district-board-poll';
  var POLL_SEATS = {
    'ut-sd-3': 1, 'ut-hd-16': 1, 'ut-sd-7': 1, 'ut-hd-15': 1, 'ut-cd-2': 1, 'ut-sd-6': 1,
    // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
    'ut-hd-4': 1,
    'ut-hd-5': 1,
    'ut-hd-6': 1,
    'ut-hd-9': 1,
    'ut-hd-10': 1,
    'ut-hd-11': 1,
    'ut-hd-12': 1,
    'ut-hd-14': 1,
    'ut-hd-19': 1,
    'ut-hd-21': 1,
    'ut-hd-22': 1,
    'ut-hd-23': 1,
    'ut-hd-24': 1,
    'ut-hd-25': 1,
    'ut-hd-28': 1,
    'ut-hd-29': 1,
    'ut-hd-30': 1,
    'ut-hd-31': 1,
    'ut-hd-33': 1,
    'ut-hd-34': 1,
    'ut-hd-36': 1,
    'ut-hd-37': 1,
    'ut-hd-39': 1,
    'ut-hd-41': 1,
    'ut-hd-42': 1,
    'ut-hd-43': 1,
    'ut-hd-44': 1,
    'ut-hd-45': 1,
    'ut-hd-46': 1,
    'ut-hd-49': 1,
    'ut-hd-50': 1,
    'ut-hd-51': 1,
    'ut-hd-52': 1,
    'ut-hd-53': 1,
    'ut-hd-55': 1,
    'ut-hd-56': 1,
    'ut-hd-59': 1,
    'ut-hd-60': 1,
    'ut-hd-61': 1,
    'ut-hd-63': 1,
    'ut-hd-64': 1,
    'ut-hd-65': 1,
    'ut-hd-66': 1,
    'ut-hd-67': 1,
    'ut-hd-68': 1,
    'ut-hd-69': 1,
    'ut-hd-70': 1,
    'ut-hd-71': 1,
    'ut-hd-73': 1,
    'ut-hd-75': 1,
    'ut-sd-1': 1,
    'ut-sd-2': 1,
    'ut-sd-4': 1,
    'ut-sd-5': 1,
    'ut-sd-8': 1,
    'ut-sd-9': 1,
    'ut-sd-10': 1,
    'ut-sd-11': 1,
    'ut-sd-12': 1,
    'ut-sd-13': 1,
    'ut-sd-14': 1,
    'ut-sd-15': 1,
    'ut-sd-16': 1,
    'ut-sd-17': 1,
    'ut-sd-18': 1,
    'ut-sd-19': 1,
    'ut-sd-20': 1,
    'ut-sd-21': 1,
    'ut-sd-22': 1,
    'ut-sd-23': 1,
    'ut-sd-24': 1,
    'ut-sd-25': 1,
    'ut-sd-26': 1,
    'ut-sd-27': 1,
    'ut-sd-28': 1,
    'ut-sd-29': 1,
    'ut-cd-1': 1,
    'ut-cd-3': 1,
    'ut-cd-4': 1,
    'ut-gov': 1,
    'ut-us-senate-curtis': 1,
    'ut-us-senate-lee': 1,
    // @generated district-boards end
  };
  var CHOICES = [
    { key: 'support', label: 'Support' },
    { key: 'oppose', label: 'Oppose' },
    { key: 'not_sure', label: 'Not sure' }
  ];
  // ONE ISSUE ASKS WHICH WAY. Get Money Out of Politics carries its own question
  // and seven named options; the server's ISSUE_CHOICES (district-board-poll-core)
  // is the list it accepts, and every other issue keeps the three poles above.
  var ISSUE_POLLS = {
    campaign_finance: {
      legend: 'What is the best way to get money out of politics?',
      choices: [
        { key: 'cap_individual', label: 'Cap individual donations' },
        { key: 'cap_total', label: 'Cap the total a campaign can raise' },
        { key: 'public_match', label: 'Public financing or small-donor matching' },
        { key: 'cooling_off', label: 'A longer cooling-off before lobbying' },
        { key: 'ban_stock_buys', label: 'Ban members’ personal trading while in office' },
        { key: 'dark_money', label: 'Stronger dark-money disclosure' },
        { key: 'none', label: 'None of these' }
      ]
    }
  };
  function choicesFor(key) {
    return Object.prototype.hasOwnProperty.call(ISSUE_POLLS, key) ? ISSUE_POLLS[key].choices : CHOICES;
  }
  function legendFor(key) {
    if (Object.prototype.hasOwnProperty.call(ISSUE_POLLS, key)) return ISSUE_POLLS[key].legend;
    return COPY.legend + issueLabel(key) + COPY.legendTail;
  }
  var LOCKED_LINE = 'Only verified residents of this seat get a voice that counts.';
  var COPY = {
    legend: 'On this seat, where do you stand on ',
    legendTail: '?',
    wait: 'Reading votes…',
    unread: 'We could not read this poll’s votes just now. This is not an empty poll — it is a read that failed.',
    unreadNote: 'Voting stays off until this board can confirm who you are.',
    failed: 'That vote did not go through.',
    // A monthly-cap refusal (429 monthly_cap), said without the server's
    // membership wording.
    notTaken: 'That vote did not go through. This seat is not taking another vote from this account right now.',
    saved: 'Vote saved. You can change it.',
    mine: 'Your vote',
    foot: 'Votes carry no name. Counts only.'
  };

  var CSS =
    '.pdxdp-n{margin-left:.6rem;font-size:.76rem;color:#93a8c6;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.pdxdp-poll{margin:.2rem 0 .7rem;padding:.6rem .7rem;border:1px solid #1d2b45;border-radius:8px;background:#0c1526}' +
    '.pdxdp-fs{margin:0;padding:0;border:0;display:grid;gap:.45rem}' +
    '.pdxdp-lg{padding:0;font-size:.86rem;color:#dbe6f7}' +
    '.pdxdp-opts{display:flex;flex-wrap:wrap;gap:.4rem}' +
    '.pdxdp-opt{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .7rem;border:1px solid #2a3c5e;border-radius:999px;background:#101c33;color:#dbe6f7;font:inherit;font-size:.84rem;cursor:pointer}' +
    '.pdxdp-opt[aria-pressed="true"]{border-color:#7fb2ff;background:#16284a}' +
    '.pdxdp-opt:disabled{opacity:.55;cursor:not-allowed}' +
    '.pdxdp-opt:focus-visible{outline:2px solid #7fb2ff;outline-offset:2px}' +
    '.pdxdp-c{font-size:.76rem;color:#93a8c6;font-variant-numeric:tabular-nums}' +
    '.pdxdp-locked,.pdxdp-note,.pdxdp-status{margin:0;font-size:.78rem;color:#93a8c6}' +
    '.pdxdp-locked{color:#c4b58a}';

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function votesWord(n) { return n === 1 ? '1 vote' : n + ' votes'; }

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

  function issueLabel(key) {
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issueLabel)) return B.issueLabel(key) || '';
    } catch (e) {}
    return '';
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _seat = '';
  var _read = null;      // null = in flight, false = failed, else the payload
  var _polls = {};       // issueKey → { support, oppose, not_sure, total }
  var _mine = {};        // issueKey → the caller's own choice
  var _busy = {};
  var _status = {};

  function canVote() {
    return !!(_read && _read.voice && _read.voice.canVote === true);
  }
  function tally(key) {
    return _polls[key] || { support: 0, oppose: 0, not_sure: 0, total: 0 };
  }

  function boardEl() {
    try { return document.getElementById('pdx-district-board'); } catch (e) { return null; }
  }

  // THE WIDGET, for one OPEN issue group.
  function pollHtml(key) {
    var h = '<div class="pdxdp-poll" data-pdxdp-poll="' + esc(key) + '">' +
      '<fieldset class="pdxdp-fs">' +
        '<legend class="pdxdp-lg">' + esc(legendFor(key)) + '</legend>';
    if (_read === null) {
      h += '<p class="pdxdp-status" role="status">' + esc(COPY.wait) + '</p>';
    } else if (_read === false) {
      h += '<p class="pdxdp-status">' + esc(COPY.unread) + '</p>';
    }
    var open = canVote() && !_busy[key];
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var t = tally(key);
    h += '<div class="pdxdp-opts">';
    var opts = choicesFor(key);
    for (var i = 0; i < opts.length; i++) {
      var c = opts[i];
      var pressed = _mine[key] === c.key;
      h += '<button type="button" class="pdxdp-opt" data-pdxdp-choice="' + c.key + '"' +
        ' data-pdxdp-issue="' + esc(key) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '"' + dis + '>' +
        esc(c.label) +
        (_read ? '<span class="pdxdp-c">' + (t[c.key] || 0) + '</span>' : '') +
      '</button>';
    }
    h += '</div>';
    if (!canVote()) {
      var v = (_read && _read.voice) || {};
      h += '<p class="pdxdp-locked" data-pdxdp-locked="1">' + esc(v.line || LOCKED_LINE) + '</p>';
      var note = _read === false ? COPY.unreadNote : (v.note || '');
      if (note) h += '<p class="pdxdp-note">' + esc(note) + '</p>';
    }
    if (_status[key]) h += '<p class="pdxdp-status" role="status">' + esc(_status[key]) + '</p>';
    h += '<p class="pdxdp-note">' + esc(COPY.foot) + '</p>';
    return h + '</fieldset></div>';
  }

  // One group: the header count always; the widget only while it is open.
  function decorateGroup(d) {
    var key = (d.getAttribute && d.getAttribute('data-pdxdb-group')) || '';
    if (!key) return;                       // the unfiled rows are not an issue
    var sum = d.querySelector('.pdxdb-group-h');
    if (sum) {
      var n = sum.querySelector('[data-pdxdp-count]');
      if (!n) {
        sum.insertAdjacentHTML('beforeend', '<span class="pdxdp-n" data-pdxdp-count=""></span>');
        n = sum.querySelector('[data-pdxdp-count]');
      }
      var text = _read ? votesWord(tally(key).total) : '';
      n.textContent = text;
      n.setAttribute('data-pdxdp-count', _read ? String(tally(key).total) : '');
    }
    var w = d.querySelector('[data-pdxdp-poll]');
    if (w && w.parentNode) w.parentNode.removeChild(w);
    if (d.open && sum) sum.insertAdjacentHTML('afterend', pollHtml(key));
  }

  function decorate() {
    var el = boardEl();
    if (!el || !fn(el.querySelectorAll)) return;
    var groups = el.querySelectorAll('details[data-pdxdb-group]');
    for (var i = 0; i < groups.length; i++) decorateGroup(groups[i]);
  }

  function load() {
    return call('GET', '?seat=' + encodeURIComponent(_seat)).then(function (res) {
      if (!res.ok || !res.data || !Array.isArray(res.data.polls)) {
        _read = false;
        _polls = {};
        _mine = {};
      } else {
        _read = res.data;
        _polls = {};
        for (var i = 0; i < res.data.polls.length; i++) {
          var p = res.data.polls[i];
          if (p && p.issueKey) _polls[p.issueKey] = p;
        }
        _mine = (res.data.mine && typeof res.data.mine === 'object') ? res.data.mine : {};
      }
      decorate();
    });
  }

  function vote(key, choice) {
    if (!key || _busy[key] || !canVote()) return;
    _busy[key] = true;
    _status[key] = '';
    decorate();
    call('POST', '', { seat: _seat, issueKey: key, choice: choice }).then(function (res) {
      _busy[key] = false;
      if (res.ok && res.data && res.data.poll) {
        _polls[key] = res.data.poll;
        _mine[key] = res.data.mine || choice;
        _status[key] = COPY.saved;
        try {
          var B = window.PDXDistrictBoard;
          if (B && fn(B.refresh)) B.refresh();
        } catch (e) {}
      } else if (res.status === 403) {
        _read = _read || {};
        _read.voice = { canVote: false, reason: res.data.code || '', line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
        _status[key] = '';
      } else if (res.status === 429 || (res.data && res.data.code === 'monthly_cap')) {
        _status[key] = COPY.notTaken;
      } else {
        _status[key] = (res.data && res.data.error) || COPY.failed;
      }
      decorate();
    });
  }

  var _wired = null;
  function wireBoard() {
    var el = boardEl();
    if (!el || _wired === el || !fn(el.addEventListener)) return;
    _wired = el;
    // `toggle` does not bubble, so it is caught on the way down.
    el.addEventListener('toggle', function (ev) {
      var d = ev && ev.target;
      if (d && d.getAttribute && d.hasAttribute && d.hasAttribute('data-pdxdb-group')) decorateGroup(d);
    }, true);
    el.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      var b = t && fn(t.closest) ? t.closest('[data-pdxdp-choice]') : null;
      if (!b || b.disabled) return;
      vote(b.getAttribute('data-pdxdp-issue') || '', b.getAttribute('data-pdxdp-choice') || '');
    });
  }

  function injectCss() {
    try {
      if (document.getElementById('pdxdp-css')) return;
      var s = document.createElement('style');
      s.id = 'pdxdp-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function mount(host) {
    var el = host || document.getElementById('pdx-district-poll');
    if (!el) return false;
    var seat = String(el.getAttribute('data-pdxdp-seat') || '').toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(POLL_SEATS, seat)) return false;
    _seat = seat;
    injectCss();
    wireBoard();
    decorate();
    load();
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) {
        window.auth.onAuthStateChanged(function () { load(); });
      }
    } catch (e) {}
    // The board rebuilds band 3 on every paint; decorate the fresh groups.
    try {
      document.addEventListener('pdxdb:paint', function () { wireBoard(); decorate(); });
    } catch (e) {}
    return true;
  }

  window.PDXDistrictPoll = {
    API: API,
    POLL_SEATS: POLL_SEATS,
    CHOICES: CHOICES,
    ISSUE_POLLS: ISSUE_POLLS,
    choicesFor: choicesFor,
    LOCKED_LINE: LOCKED_LINE,
    COPY: COPY,
    mount: mount,
    canVote: canVote,
    pollHtml: pollHtml,
    refresh: function () { if (_seat) load(); }
  };

  function go() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
