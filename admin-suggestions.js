/* ═══════════════════════════════════════════════════════════
   admin-suggestions.js — /admin/suggestions, the raw-ingest suggestions log.
   ───────────────────────────────────────────────────────────
   Waits for the existing Firebase login (the same `auth` the /admin page
   gates on), and for the curator account only asks
   /api/admin/raw-ingest-suggestions for the entries, sending the Firebase ID
   token. The server re-checks that token and the email, so the client check
   here only decides what to say; it guards nothing. Entries arrive newest
   first and are listed as they come, with a type filter.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ADMIN_EMAILS = ['cdeluxxe@gmail.com']; // same account as admin.html's gate
  var API = '/api/admin/raw-ingest-suggestions';
  var TYPE_LABEL = { url: 'New URL', score: 'Cross-topic score', key: 'New issue key', fail: 'Keeps failing' };
  var state = { entries: [], filter: '' };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function link(u) {
    var s = String(u || '');
    return /^https?:\/\//.test(s) ? '<a href="' + esc(s) + '" target="_blank" rel="noopener noreferrer">' + esc(s) + '</a>' : esc(s);
  }
  function when(ts) {
    var d = new Date(ts);
    if (isNaN(d)) return esc(ts);
    return esc(d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
  }
  function isAdmin(user) {
    return !!(user && typeof user.email === 'string' && ADMIN_EMAILS.indexOf(user.email.toLowerCase()) >= 0);
  }

  /** One entry → its <li> markup. */
  function renderEntry(e) {
    var d = e.details || {};
    var body = '';
    if (e.type === 'url') {
      body = '<div class="sg-line"><b>' + esc(d.politician_id) + '</b> · ' + esc(d.topic) + '</div>' +
        '<div class="sg-sub">' + esc(d.source_type) + '</div><div>' + link(d.url) + '</div>';
    } else if (e.type === 'score') {
      var pos = d.position === 'oppose' ? 'oppose' : 'support';
      body = '<div class="sg-line"><b>' + esc(d.politician_id) + '</b> · ' + esc(d.topic) + ' · <span class="sg-pos-' + pos + '">' + esc(d.position) + '</span> ' + esc(d.confidence) + '</div>' +
        (d.page_topic ? '<div class="sg-sub">from a ' + esc(d.page_topic) + ' page' + (d.previous_position ? ' · was ' + esc(d.previous_position) : '') + '</div>' : '') +
        '<div>' + link(d.url) + '</div>';
    } else if (e.type === 'key') {
      body = '<div class="sg-line"><b>' + esc(d.key) + '</b></div><div class="sg-sub">' + esc(d.note) + '</div>';
    } else if (e.type === 'fail') {
      body = '<div class="sg-line"><b>' + esc(d.consecutive_failures) + '</b> failed pulls in a row · since ' + when(d.first_failed_at) + '</div>' +
        '<div class="sg-sub">' + esc(d.last_error) + '</div><div>' + link(d.url) + '</div>';
    }
    return '<li class="sg-item" data-type="' + esc(e.type) + '"><div class="sg-head"><span class="sg-type">' + esc(TYPE_LABEL[e.type] || e.type) + '</span><time>' + when(e.ts) + '</time></div>' + body + '</li>';
  }

  function render() {
    var list = state.filter ? state.entries.filter(function (e) { return e.type === state.filter; }) : state.entries;
    $('sg-list').innerHTML = list.map(renderEntry).join('');
    $('sg-note').textContent = list.length ? '' : (state.entries.length ? 'No entries of this type.' : 'No suggestions yet. Entries appear here after the next raw-ingest run finds something new.');
    $('sg-note').hidden = !!list.length;
  }

  function setNote(msg) { $('sg-note').hidden = false; $('sg-note').textContent = msg; $('sg-list').innerHTML = ''; }

  function load(user) {
    return Promise.resolve(user.getIdToken()).then(function (token) {
      return fetch(API, { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' });
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) { setNote('This page is for the curator account only.'); return null; }
      if (!res.ok) { setNote('Could not load the suggestions log (HTTP ' + res.status + ').'); return null; }
      return res.json();
    }).then(function (data) {
      if (!data) return;
      state.entries = Array.isArray(data.entries) ? data.entries : [];
      $('sg-meta').textContent = state.entries.length + ' of up to ' + (data.max || 250) + ' kept · newest first' + (data.updated_at ? ' · last run ' + new Date(data.updated_at).toLocaleString() : '');
      $('sg-filters').hidden = false;
      render();
    }).catch(function (err) { setNote('Could not load the suggestions log — ' + (err && err.message || err)); });
  }

  function wireFilters() {
    var buttons = $('sg-filters').querySelectorAll('button[data-filter]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (ev) {
        state.filter = ev.currentTarget.getAttribute('data-filter') || '';
        for (var j = 0; j < buttons.length; j++) buttons[j].setAttribute('aria-pressed', String(buttons[j] === ev.currentTarget));
        render();
      });
    }
  }

  function onAuth(user) {
    if (!user) { $('sg-meta').textContent = 'Not signed in'; setNote('Sign in with the curator account on PolitiDex (the same login as the curator tools), then reload this page.'); return; }
    if (!isAdmin(user)) { $('sg-meta').textContent = 'Signed in'; setNote('This page is for the curator account only.'); return; }
    $('sg-meta').textContent = 'Loading…';
    load(user);
  }

  function start() {
    wireFilters();
    window.auth.onAuthStateChanged(onAuth);
  }

  window.PDXAdminSuggestions = { renderEntry: renderEntry, onAuth: onAuth, isAdmin: isAdmin, state: state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
