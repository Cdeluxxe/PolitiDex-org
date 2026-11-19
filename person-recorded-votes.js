/* ═══════════════════════════════════════════════════════════════════════════
   person-recorded-votes.js — "Recorded votes", the raw record on a person's file
   ────────────────────────────────────────────────────────────────────────────
   The roll calls this person voted in, as the official House or Senate record
   lists them: the bill, the question put, and the vote cast. Nothing else.
   Each roll call links to its own page, /vote/<congress>/<chamber>/<session>/<roll>.

   THE RAW RECORD, AND ONLY THAT. No verdict, no score, no tally of sides, no
   comparison with a stated position, no Direction Match. Each row is one cast
   vote with a link to the official record it came from. The curated formal
   record, the stances and the evidence are drawn elsewhere on the file and this
   module does not read or change any of them.

   WHERE THE ROWS COME FROM. GET /api/vote-actions/published?pid=<pid>, the same
   public read the issue drawer's "also in the raw vote feed" note uses. It sends
   only roll calls that pass the automatic publish gate
   (netlify/lib/vote-actions-publish.ts, judged per roll call): a tagged bill
   that is not a nomination, every member on the roll identified, every vote kind
   classified, every row's source payload stored. A held roll call never reaches
   this page.

   WHERE IT GOES. In the file's Official record stage (.pdxsp-stage-record),
   after the sponsored-bills section when there is one, as its own
   #pdx-recorded-votes section. A file with no record stage gets it ahead of the
   first later stage. No line of the profile template changes. A person with no
   published roll call gets no section at all — not an empty one, and no "none".

   LOADED BY person-bills.js (loadCompanion), so no document gains a tag.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRecordedVotes) return;

  var SRC = '/api/vote-actions/published?pid=';
  var TARGET = 'pdx-recorded-votes';
  var FIRST = 8; // bills shown before "Show all"
  var VOTE_WORD = { yes: 'Yea', no: 'Nay', present: 'Present', not_voting: 'Not voting' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function day(d) { return d ? String(d).slice(0, 10) : ''; }
  function httpUrl(u) { return /^https?:\/\//.test(String(u || '')) ? String(u) : ''; }
  // The roll call's own page, /vote/<congress>/<chamber>/<session>/<roll> — the
  // same address rollPagePath (netlify/lib/vote-actions-publish.ts) gives it and
  // netlify/functions/vote-page.mts serves. Every roll call in this list has
  // passed the publish gate, so every one has a page. '' for a row that does not
  // carry the four parts.
  function rollPage(r) {
    if (!r || !/^(house|senate)$/.test(String(r.chamber)) || !/^\d+$/.test(String(r.congress)) ||
      !/^\d+$/.test(String(r.session)) || !/^\d+$/.test(String(r.roll))) return '';
    return '/vote/' + encodeURIComponent(String(r.congress)) + '/' + encodeURIComponent(String(r.chamber)) + '/' +
      encodeURIComponent(String(r.session)) + '/' + encodeURIComponent(String(r.roll));
  }

  var _cache = {};
  function load(pid) {
    if (!_cache[pid]) {
      _cache[pid] = fetch(SRC + encodeURIComponent(pid), { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return _cache[pid];
  }

  // The response → one entry per bill, newest vote first, each with its rolls
  // oldest first (the order they happened in).
  function billsFrom(data) {
    if (!data || !data.billKeys || typeof data.billKeys !== 'object') return [];
    var info = data.info || {};
    var out = [];
    for (var k in data.billKeys) {
      if (!Object.prototype.hasOwnProperty.call(data.billKeys, k)) continue;
      var rolls = (data.billKeys[k] || []).filter(function (r) { return r && r.vote; }).slice();
      if (!rolls.length) continue;
      rolls.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')) || (+a.roll - +b.roll); });
      var inf = info[k] || {};
      out.push({ key: k, number: inf.number || '', title: inf.title || '', page: inf.page || '', rolls: rolls,
        last: String(rolls[rolls.length - 1].date || '') });
    }
    out.sort(function (a, b) { return b.last.localeCompare(a.last) || a.key.localeCompare(b.key); });
    return out;
  }

  function rollHtml(r) {
    var ch = r.chamber === 'senate' ? 'Senate' : 'House';
    var word = r.voteRaw || VOTE_WORD[r.vote] || r.vote;
    var src = httpUrl(r.sourceUrl);
    var page = rollPage(r);
    var label = esc(ch + ' roll ' + r.roll);
    return '<li data-pdx-rv-roll="' + esc(r.chamber + '|' + r.congress + '|' + r.session + '|' + r.roll) + '">' +
      '<span class="pdx-rv-vote" data-vote="' + esc(r.vote) + '">' + esc(word) + '</span>' +
      '<span class="pdx-rv-what">' +
        (r.question ? esc(r.question) : esc(ch + ' roll call')) +
        '<span class="pdx-rv-meta">' + (page ? '<a href="' + esc(page) + '" data-pdx-rv-page>' + label + '</a>' : label) + (r.date ? ' · ' + esc(day(r.date)) : '') +
        (r.procedural ? ' · procedural' : '') +
        (src ? ' · <a href="' + esc(src) + '" target="_blank" rel="noopener">official record</a>' : '') +
        '</span>' +
      '</span></li>';
  }

  function billHtml(b) {
    var label = b.number || b.key;
    var head = b.page
      ? '<a href="' + esc(b.page) + '" data-pdx-rv-bill="' + esc(b.key) + '">' + esc(label) + '</a>'
      : '<span data-pdx-rv-bill="' + esc(b.key) + '">' + esc(label) + '</span>';
    return '<div class="pdx-rv-bill" data-pdx-rv-key="' + esc(b.key) + '">' +
      '<div class="pdx-rv-bh">' + head + (b.title ? ' <span class="pdx-rv-t">' + esc(b.title) + '</span>' : '') + '</div>' +
      '<ul>' + b.rolls.map(rollHtml).join('') + '</ul></div>';
  }

  function html(bills) {
    var n = 0;
    for (var i = 0; i < bills.length; i++) n += bills[i].rolls.length;
    var first = bills.slice(0, FIRST).map(billHtml).join('');
    var rest = bills.slice(FIRST);
    return '<div class="modal-section-title">\u{1F5F3}️ Recorded votes</div>' +
      '<p class="modal-section-sub" data-pdx-rv-label>The raw record: how this person voted on each roll call, as the official House or Senate record lists it. ' +
      'This is not a verdict and is not compared with anything they have said. A roll call is listed only after it passes PolitiDex’s automatic publish checks.</p>' +
      '<p class="pdx-rv-count" data-pdx-rv-count="' + n + '">' + n + ' roll call' + (n === 1 ? '' : 's') + ' on ' + bills.length + ' measure' + (bills.length === 1 ? '' : 's') + '</p>' +
      first +
      (rest.length ? '<details class="pdx-rv-more"><summary>Show all ' + bills.length + ' measures</summary>' + rest.map(billHtml).join('') + '</details>' : '');
  }

  var STYLE_ID = 'pdx-rv-style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '#pdx-recorded-votes .pdx-rv-count{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;color:#9fb4d4;margin:0 0 0.6rem;}' +
      '#pdx-recorded-votes .pdx-rv-bill{margin:0 0 0.5rem;padding:0.5rem 0.65rem;border:1px solid rgba(159,180,212,0.16);border-radius:0.6rem;background:rgba(10,15,30,0.45);}' +
      '#pdx-recorded-votes .pdx-rv-bh a,#pdx-recorded-votes .pdx-rv-bh>span:first-child{color:#9fdbff;font-weight:700;text-decoration:none;}' +
      '#pdx-recorded-votes .pdx-rv-bh a:hover,#pdx-recorded-votes .pdx-rv-bh a:focus-visible{text-decoration:underline;}' +
      '#pdx-recorded-votes .pdx-rv-t{color:#dbe6f7;font-size:0.84rem;}' +
      '#pdx-recorded-votes ul{margin:0.35rem 0 0;padding:0;list-style:none;}' +
      '#pdx-recorded-votes li{display:flex;gap:0.5rem;align-items:baseline;margin:0.25rem 0 0;font-size:0.82rem;color:#dbe6f7;line-height:1.35;}' +
      '#pdx-recorded-votes .pdx-rv-vote{flex:none;min-width:4.6rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#c9d8f2;border:1px solid rgba(159,180,212,0.28);border-radius:999px;padding:0.08rem 0.5rem;text-align:center;}' +
      '#pdx-recorded-votes .pdx-rv-what{min-width:0;}' +
      '#pdx-recorded-votes .pdx-rv-meta{display:block;color:#9fb4d4;font-size:0.74rem;}' +
      '#pdx-recorded-votes .pdx-rv-meta a{color:#9fdbff;}' +
      '#pdx-recorded-votes .pdx-rv-more summary{cursor:pointer;color:#9fdbff;font-size:0.82rem;margin:0.2rem 0 0.5rem;}';
    (document.head || document.documentElement).appendChild(st);
  }

  var LATER = ['tension', 'receipts', 'money', 'you', 'drawers'];
  function mount(pid) {
    var body = document.getElementById('modal-body') || document;
    var host = body.querySelector('#' + TARGET);
    if (host && host.getAttribute('data-pdx-rv-pid') === pid && host.isConnected) {
      // Keep it after the sponsored-bills section, which may arrive later.
      var sp = body.querySelector('#pdx-sponsored');
      if (sp && sp.parentNode === host.parentNode && sp.nextSibling !== host) sp.parentNode.insertBefore(host, sp.nextSibling);
      return host;
    }
    if (host) host.parentNode.removeChild(host);
    host = document.createElement('div');
    host.className = 'modal-section';
    host.id = TARGET;
    host.hidden = true;
    host.setAttribute('data-pdx-rv-pid', pid);
    var stage = body.querySelector('.pdxsp-stage-record');
    if (stage) {
      var after = stage.querySelector('#pdx-sponsored');
      if (after && after.parentNode === stage) stage.insertBefore(host, after.nextSibling);
      else stage.appendChild(host);
      return host;
    }
    for (var i = 0; i < LATER.length; i++) {
      var next = body.querySelector('.pdxsp-stage-' + LATER[i]);
      if (next && next.parentNode) { next.parentNode.insertBefore(host, next); return host; }
    }
    return null;
  }

  function fill(host) {
    var pid = host.getAttribute('data-pdx-rv-pid') || '';
    if (!pid || host.getAttribute('data-pdx-rv-for') === pid) return;
    host.setAttribute('data-pdx-rv-for', pid);
    load(pid).then(function (data) {
      if (host.getAttribute('data-pdx-rv-pid') !== pid) return;
      var bills = billsFrom(data);
      if (!bills.length) { host.hidden = true; host.innerHTML = ''; return; }
      style();
      host.innerHTML = html(bills);
      host.hidden = false;
    });
  }

  function scan() {
    var pid = String(window._pdxCurrentProfileId || '');
    if (!/^[a-z0-9_]{1,80}$/.test(pid)) return;
    if (typeof fetch !== 'function') return;
    var host = mount(pid);
    if (host) fill(host);
  }

  window.PDXRecordedVotes = { scan: scan, billsFrom: billsFrom, html: html, load: load, rollPage: rollPage };

  function boot() {
    scan();
    if (typeof MutationObserver === 'function' && document.body) {
      var queued = false;
      new MutationObserver(function () {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(function () { queued = false; scan(); });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
