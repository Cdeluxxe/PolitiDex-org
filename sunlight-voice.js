/* ═══════════════════════════════════════════════════════════════════════════
   sunlight-voice.js — Sunlight Governance, Phase 3: the rate-case entry inside
   District Voice (Utah district boards)
   ───────────────────────────────────────────────────────────────────────────
   Lazy-loaded by district-composer.js on a Utah board only. Paints one panel
   under the board's composer for the live Sunlight Governance entry (Rocky
   Mountain Power's rate case, Utah PSC Docket No. 24-035-04):

     · "Filed vs. Ordered": the utility's application and the PSC's order,
       each by title, date and public link (Phase 4)
     · a light update note when a new public PSC filing has been flagged
     · "Support this ask" — one signal per verified resident of this seat
     · "Ask your representative" — a request that the seat's sitting member
       state a public position (yes / no / abstain) on the narrow ask
       "Publish one confidential contract"
     · comments from verified residents of this seat
     · the district engagement view: which Utah seats have the most actions

   EVERY CONTROL IS OFF UNTIL THE SERVER SAYS OTHERWISE. GET /api/sunlight-voice
   answers `voice.canPost` with District Voice's own gate (a vendor-verified
   residency row for THIS seat). Nothing here can fake it. Reading stays open.

   NEUTRAL. Counts only — never a percentage, a share or a claim about what a
   district believes. The entry itself and its wording live in
   sunlight-entries.js and /sunlight; this file does not restate or change it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXSunlightVoice) return;

  var API = '/api/sunlight-voice';
  var HOST_ID = 'pdx-sunlight-voice';
  var STYLE_ID = 'pdx-sunlight-voice-style';

  var COPY = {
    kick: 'Sunlight Governance',
    hd: 'Rate case: residents of this seat',
    frame: 'Verified residents of this seat. Counts are actions taken, not a measure of opinion.',
    readEntry: 'Read the entry',
    foHd: 'Filed vs. Ordered',
    filingsHd: 'Public filings since the order',
    supportBtn: 'Support this ask',
    supportOn: 'You support this ask · Withdraw',
    supportCount: function (n) { return n === 1 ? '1 resident of this seat supports this ask.' : n + ' residents of this seat support this ask.'; },
    askHd: 'Ask your representative',
    askLead: function (name, q) { return 'Ask ' + name + ' to state a public position on “' + q + '”: yes, no or abstain.'; },
    askBtn: function (name) { return 'Ask ' + name + ' for a position'; },
    askDone: 'You asked. Your request is recorded.',
    askCount: function (n) { return n === 1 ? '1 resident has asked.' : n + ' residents have asked.'; },
    positionOn: function (p) { return 'Public position on record: ' + p + '.'; },
    commentsHd: 'Comments on this entry',
    commentLabel: 'Comment on the rate case',
    commentBtn: 'Post comment',
    sentimentHd: 'Where residents are engaging',
    sentimentCols: ['District', 'Comments', 'Support', 'Rep asks'],
    failed: 'That did not go through. Try again.',
    notTaken: 'That was not posted. Try again tomorrow.',
    loading: 'Loading…'
  };

  var _host = null, _seat = '', _read = null, _status = '', _busy = false;

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function bearer() {
    try {
      var u = window.auth && window.auth.currentUser;
      if (!u || u.isAnonymous === true || !fn(u.getIdToken)) return Promise.resolve(null);
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

  function canPost() { return !!(_read && _read.voice && _read.voice.canPost === true); }

  function dateLine(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }

  // ── PIECES ────────────────────────────────────────────────────────────────
  // Filed vs. Ordered: the utility's request and the PSC's order, each by the
  // public document's title and date, as the entry carries them.
  function filedOrderedHtml(rows) {
    if (!rows || !rows.length) return '';
    var li = rows.map(function (r) {
      return '<li data-sv-fo="' + esc(r.step) + '"><span class="pdxsv-fo-l">' + esc(r.label) + '</span> · ' +
        '<time datetime="' + esc(r.date) + '">' + esc(r.dateLabel || r.date) + '</time> · ' +
        '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a></li>';
    }).join('');
    return '<div class="pdxsv-fo" data-sv-filed-ordered="1">' +
      '<h4 class="pdxsv-h4">' + esc(COPY.foHd) + '</h4><ul>' + li + '</ul></div>';
  }

  function filingsHtml(f) {
    if (!f) return '';
    var items = (f.updates || []).map(function (u) {
      return '<li><a href="' + esc(u.url) + '" target="_blank" rel="noopener">' + esc(u.title) + '</a> <span class="pdxsv-dim">' + esc(u.date) + '</span></li>';
    }).join('');
    return '<div class="pdxsv-filings' + (f.hasUpdates ? ' is-new' : '') + '" data-sv-filings="' + (f.hasUpdates ? 'new' : 'none') + '">' +
      '<h4 class="pdxsv-h4">' + esc(COPY.filingsHd) + '</h4>' +
      '<p>' + (f.hasUpdates ? '<strong>Update:</strong> ' : '') + esc(f.note) + '</p>' +
      (items ? '<ul>' + items + '</ul>' : '') + '</div>';
  }

  function supportHtml(s, open) {
    var n = (s && s.count) || 0;
    var mine = !!(s && s.mine);
    return '<div class="pdxsv-row" data-sv-support="1">' +
      '<button type="button" class="pdxsv-btn' + (mine ? ' is-on' : '') + '" data-sv-act="support"' +
      (open && !_busy ? '' : ' disabled aria-disabled="true"') + ' aria-pressed="' + (mine ? 'true' : 'false') + '">' +
      esc(mine ? COPY.supportOn : COPY.supportBtn) + '</button>' +
      '<span class="pdxsv-dim" data-sv-support-count="' + n + '">' + esc(COPY.supportCount(n)) + '</span></div>';
  }

  function askHtml(a, open, q) {
    if (!a) return '';
    if (!a.available) return '<div class="pdxsv-ask" data-sv-ask="none"><h4 class="pdxsv-h4">' + esc(COPY.askHd) + '</h4><p class="pdxsv-dim">' + esc(a.note || '') + '</p></div>';
    var name = (a.holder && a.holder.name) || 'your representative';
    var opts = (a.options || []).map(function (o) { return '<span class="pdxsv-opt">' + esc(o) + '</span>'; }).join('');
    var pos = a.position ? COPY.positionOn(a.position.position) : (a.positionNote || '');
    var btn = a.mine
      ? '<p class="pdxsv-done" data-sv-ask-mine="1">' + esc(COPY.askDone) + '</p>'
      : '<button type="button" class="pdxsv-btn" data-sv-act="ask"' + (open && !_busy ? '' : ' disabled aria-disabled="true"') + '>' + esc(COPY.askBtn(name)) + '</button>';
    return '<div class="pdxsv-ask" data-sv-ask="' + esc(a.holder ? a.holder.pid : '') + '">' +
      '<h4 class="pdxsv-h4">' + esc(COPY.askHd) + '</h4>' +
      '<p>' + esc(COPY.askLead(name, a.question || q)) + '</p>' +
      '<div class="pdxsv-opts" aria-label="Answers requested">' + opts + '</div>' +
      btn +
      '<p class="pdxsv-dim"><span data-sv-ask-count="' + (a.requests || 0) + '">' + esc(COPY.askCount(a.requests || 0)) + '</span> ' +
      (a.position && a.position.source ? '<a href="' + esc(a.position.source) + '" target="_blank" rel="noopener">' + esc(pos) + '</a>' : esc(pos)) + '</p></div>';
  }

  function commentsHtml(r, open) {
    var max = (r.limits && r.limits.postMax) || 280;
    var list = (r.comments || []).map(function (c) {
      return '<li class="pdxsv-c"><p>' + esc(c.body) + '</p><span class="pdxsv-dim">' + esc(dateLine(c.createdAt)) + (c.mine ? ' · yours' : '') + '</span></li>';
    }).join('');
    return '<div class="pdxsv-comments">' +
      '<h4 class="pdxsv-h4">' + esc(COPY.commentsHd) + '</h4>' +
      '<label class="pdxsv-l" for="pdxsv-body">' + esc(COPY.commentLabel) + '</label>' +
      '<textarea id="pdxsv-body" class="pdxdc-ta pdxsv-ta" rows="2" maxlength="' + max + '"' +
      (open ? '' : ' disabled aria-disabled="true"') + '></textarea>' +
      '<button type="button" class="pdxsv-btn" data-sv-act="comment"' + (open && !_busy ? '' : ' disabled aria-disabled="true"') + '>' + esc(COPY.commentBtn) + '</button>' +
      (list ? '<ul class="pdxsv-list">' + list + '</ul>' : '<p class="pdxsv-dim">' + esc(r.commentsEmpty || '') + '</p>') +
      '</div>';
  }

  function sentimentHtml(r) {
    var rows = (r.sentiment || []).map(function (l) {
      var here = l.seat === _seat;
      return '<tr' + (here ? ' class="is-here"' : '') + ' data-sv-district="' + esc(l.seat) + '" data-sv-total="' + l.total + '">' +
        '<th scope="row">' + (l.href ? '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>' : esc(l.label)) + '</th>' +
        '<td>' + l.comments + '</td><td>' + l.support + '</td><td>' + l.asks + '</td></tr>';
    }).join('');
    return '<div class="pdxsv-sentiment" data-sv-sentiment="1">' +
      '<h4 class="pdxsv-h4">' + esc(COPY.sentimentHd) + '</h4>' +
      (rows
        ? '<table class="pdxsv-table"><thead><tr>' + COPY.sentimentCols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="pdxsv-dim">' + esc(r.sentimentEmpty || '') + '</p>') +
      '<p class="pdxsv-dim">' + esc(r.sentimentNote || '') + '</p></div>';
  }

  function html() {
    var r = _read;
    var head = '<section class="pdxdb-band pdxsv" data-pdxdb-band="sunlight" data-sv-entry="UT-PSC-24-035-04">' +
      '<p class="pdxsv-kick">☀️ ' + esc(COPY.kick) + '</p>' +
      '<h2 class="pdxdb-h2">' + esc(COPY.hd) + '</h2>';
    if (!r) return head + '<p class="pdxsv-dim">' + esc(COPY.loading) + '</p></section>';
    var e = r.entry || {};
    var open = canPost();
    var v = r.voice || {};
    return head +
      '<p class="pdxsv-entry"><strong>' + esc(e.title) + '</strong> · <a href="' + esc(e.href) + '">' + esc(COPY.readEntry) + '</a></p>' +
      '<p class="pdxsv-ask-label">The ask: <strong>' + esc(e.askLabel) + '</strong></p>' +
      '<p class="pdxsv-dim">' + esc(COPY.frame) + '</p>' +
      filedOrderedHtml(r.filedVsOrdered) +
      filingsHtml(r.filings) +
      (open ? '' : '<p class="pdxdc-locked" data-sv-locked="1">' + esc(v.line || '') + (v.note ? ' <span class="pdxsv-dim">' + esc(v.note) + '</span>' : '') + '</p>') +
      supportHtml(r.support, open) +
      askHtml(r.ask, open, e.askLabel) +
      commentsHtml(r, open) +
      sentimentHtml(r) +
      (_status ? '<p class="pdxsv-status" role="status">' + esc(_status) + '</p>' : '') +
      '</section>';
  }

  function render() {
    if (!_host) return;
    var ta = _host.querySelector && _host.querySelector('#pdxsv-body');
    var draft = ta ? ta.value : '';
    _host.innerHTML = html();
    var nta = _host.querySelector && _host.querySelector('#pdxsv-body');
    if (nta && draft) nta.value = draft;
  }

  function load() {
    return call('GET', '?seat=' + encodeURIComponent(_seat)).then(function (res) {
      if (res.ok) _read = res.data;
      else if (!_read) _read = { entry: {}, voice: { canPost: false }, comments: [], sentiment: [] };
      render();
      return _read;
    });
  }

  function act(kind) {
    if (_busy || !canPost()) return Promise.resolve(null);
    var body = { seat: _seat, action: kind };
    if (kind === 'support') body.on = !(_read.support && _read.support.mine);
    if (kind === 'comment') {
      var ta = _host.querySelector('#pdxsv-body');
      body.body = ta ? ta.value : '';
    }
    _busy = true; _status = ''; render();
    return call('POST', '', body).then(function (res) {
      _busy = false;
      if (res.ok) {
        if (kind === 'comment') { var t = _host.querySelector('#pdxsv-body'); if (t) t.value = ''; }
        return load();
      }
      if (res.status === 429 || (res.data && res.data.code === 'daily_cap')) _status = COPY.notTaken;
      else _status = (res.data && res.data.error) || COPY.failed;
      render();
      return null;
    });
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.pdxsv{border-left:3px solid #f5c542}' +
      '.pdxsv-kick{font:600 .75rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#f5c542;margin:0 0 .25rem}' +
      '.pdxsv p{margin:.35rem 0}.pdxsv-dim{color:rgba(226,232,240,.68);font-size:.85rem}' +
      '.pdxsv-h4{font:600 1rem/1.3 "Barlow Condensed",sans-serif;margin:1rem 0 .35rem;letter-spacing:.02em}' +
      '.pdxsv-btn{display:inline-block;margin:.35rem .5rem .35rem 0;padding:.45rem .85rem;border-radius:8px;border:1px solid rgba(245,197,66,.6);background:transparent;color:inherit;font-weight:600;cursor:pointer}' +
      '.pdxsv-btn.is-on{background:rgba(245,197,66,.18)}.pdxsv-btn[disabled]{opacity:.5;cursor:not-allowed}' +
      '.pdxsv-fo{margin:.6rem 0;font-size:.9rem}.pdxsv-fo ul{margin:.25rem 0 0 1rem;padding:0}.pdxsv-fo li+li{margin-top:.2rem}.pdxsv-fo-l{font-weight:600}' +
      '.pdxsv-filings .pdxsv-h4{margin:0 0 .2rem}' +
      '.pdxsv-filings{margin:.6rem 0;padding:.5rem .75rem;border-radius:8px;background:rgba(148,163,184,.1);font-size:.9rem}' +
      '.pdxsv-filings.is-new{background:rgba(245,197,66,.14)}.pdxsv-filings ul{margin:.25rem 0 0 1rem}' +
      '.pdxsv-opts{display:flex;gap:.4rem;margin:.25rem 0}.pdxsv-opt{padding:.1rem .5rem;border:1px solid rgba(148,163,184,.4);border-radius:999px;font-size:.8rem;text-transform:capitalize}' +
      '.pdxsv-l{display:block;font-size:.85rem;margin:.25rem 0}.pdxsv-ta{width:100%}' +
      '.pdxsv-list{list-style:none;margin:.5rem 0 0;padding:0}.pdxsv-c{padding:.5rem 0;border-top:1px solid rgba(148,163,184,.2)}' +
      '.pdxsv-table{width:100%;border-collapse:collapse;font-size:.9rem}.pdxsv-table th,.pdxsv-table td{padding:.3rem .4rem;border-bottom:1px solid rgba(148,163,184,.2);text-align:left}' +
      '.pdxsv-table td{text-align:right;font-variant-numeric:tabular-nums}.pdxsv-table tr.is-here th{font-weight:700}' +
      '.pdxsv-status{font-weight:600}';
    (document.head || document.body).appendChild(s);
  }

  function place() {
    var existing = document.getElementById(HOST_ID);
    if (existing) { _host = existing; return existing; }
    var comp = document.getElementById('pdx-district-composer');
    if (!comp) return null;
    var wrap = (comp.closest && comp.closest('.pdxdb-wrap')) || comp;
    var el = document.createElement('div');
    el.className = 'pdxdb-wrap pdxdb-wrap--sunlight';
    el.id = HOST_ID;
    if (wrap.parentNode) wrap.parentNode.insertBefore(el, wrap.nextSibling);
    _host = el;
    return el;
  }

  function delegate() {
    if (!_host || _host.__pdxsv) return;
    _host.__pdxsv = true;
    _host.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('[data-sv-act]') : null;
      if (!t || t.disabled) return;
      ev.preventDefault();
      act(t.getAttribute('data-sv-act'));
    });
  }

  function mount(seat) {
    var s = String(seat || '').toLowerCase();
    if (!s) {
      var comp = document.getElementById('pdx-district-composer');
      s = comp ? String(comp.getAttribute('data-pdxdc-seat') || '').toLowerCase() : '';
    }
    if (!/^ut-/.test(s)) return false;
    _seat = s;
    if (!place()) return false;
    ensureStyle();
    delegate();
    render();
    load();
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) window.auth.onAuthStateChanged(function () { load(); });
    } catch (e) {}
    // The board can rebuild its frame; put the panel back if it went missing.
    try {
      document.addEventListener('pdxdb:paint', function () {
        if (!document.getElementById(HOST_ID)) { _host = null; if (place()) { delegate(); render(); } }
      });
    } catch (e) {}
    return true;
  }

  window.PDXSunlightVoice = {
    API: API, COPY: COPY, mount: mount, load: load, act: act, canPost: canPost,
    read: function () { return _read; }, _html: html
  };

  function go() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
