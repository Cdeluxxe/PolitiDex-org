/* ═══════════════════════════════════════════════════════════════════════════
   person-bills.js — the bills a person sponsored or co-sponsored, on their file
   ────────────────────────────────────────────────────────────────────────────
   Every bill page (/b/<sitting>/<number>) names its sponsors and co-sponsors,
   each a link to that person's file. This is the other direction: on the file,
   the same bills, each a link back to the bill page.

   ONE TABLE, BOTH WAYS. The rows come from person-bills.json, which
   scripts/gen-bill-docs.mjs writes from the SAME sponsor resolution it writes
   the bill pages' sponsor blocks from. A bill is listed here exactly when its
   page links to this person, with the role the page gives them and the status
   label the page prints. Nothing is computed here.

   WHAT IT SHOWS. Four groups, in this order, each only if it has a row:
   Enacted, Passed (one or both chambers, an adopted resolution or amendment, a
   confirmed nomination), Failed (died, failed on the floor, vetoed), and
   Pending (still before the 119th Congress). A failed bill is in Failed and
   nowhere else, and its row carries the page's own "Failed — …" label.

   WHERE IT GOES. At the end of the file's Official record stage — the
   .pdxsp-stage-record block profile-spine.js assembles — as its own
   #pdx-sponsored section, put there by this module after the file renders, so
   no line of the profile template (shared with the homepage) changes. A file
   with no Official record stage gets the section ahead of the first later
   stage instead.

   WHAT IT DOES NOT. No count of anything as a score, no rate, no ranking, no
   Direction Match. A person with no sponsored bill on file gets no section at
   all — not an empty one, and no "none".
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPersonBills) return;

  var SRC = '/person-bills.json';
  var GROUPS = [
    { key: 'enacted', title: 'Enacted' },
    { key: 'passed', title: 'Passed' },
    { key: 'failed', title: 'Failed' },
    { key: 'pending', title: 'Pending' }
  ];
  var ROLE = { s: 'Sponsor', f: 'Floor sponsor', c: 'Co-sponsor' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function sittingText(s) {
    s = String(s || '');
    return /^\d+$/.test(s) ? s + 'th Congress' : (/^\d{4}GS$/i.test(s) ? s.slice(0, 4) + ' General Session' : s);
  }
  // The bill page's address: the form share-links.js and the sitemap write.
  function billHref(s, n) { return '/b/' + encodeURIComponent(s) + '/' + encodeURIComponent(n); }

  var _data = null;
  function load() {
    if (!_data) {
      _data = fetch(SRC, { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return _data;
  }

  function rowsFor(data, pid) {
    if (!data || !data.people || !data.bills) return [];
    var refs = data.people[pid];
    if (!refs && typeof window.PDXProfilePid === 'function') {
      try { refs = data.people[window.PDXProfilePid(pid)]; } catch (e) { refs = null; }
    }
    var out = [];
    for (var i = 0; refs && i < refs.length; i++) {
      var b = data.bills[refs[i][0]];
      if (!b) continue;
      out.push({ s: b[0], n: b[1], t: b[2], st: b[3], g: b[4], sl: b[5], r: refs[i][1] });
    }
    return out;
  }

  function html(rows) {
    var parts = [];
    for (var g = 0; g < GROUPS.length; g++) {
      var grp = GROUPS[g];
      var list = rows.filter(function (x) { return x.g === grp.key; });
      if (!list.length) continue;
      parts.push(
        '<div class="pdx-spb-group" data-pdx-sponsored-group="' + grp.key + '">' +
        '<div class="pdx-spb-gh">' + esc(grp.title) + ' <span>' + list.length + '</span></div>' +
        '<ul>' + list.map(function (x) {
          return '<li data-pdx-sponsored-row data-status="' + esc(x.st) + '">' +
            '<a href="' + esc(billHref(x.s, x.n)) + '" data-pdx-sponsored-bill="' + esc(x.s + '|' + x.n) + '">' + esc(x.n) + '</a>' +
            ' <span class="pdx-spb-sit">' + esc(sittingText(x.s)) + '</span>' +
            ' <span class="pdx-spb-role">' + esc(ROLE[x.r] || '') + '</span>' +
            (x.t ? '<div class="pdx-spb-t">' + esc(x.t) + '</div>' : '') +
            '<div class="pdx-spb-st" data-group="' + esc(x.g) + '">' + esc(x.sl) + '</div>' +
          '</li>';
        }).join('') + '</ul></div>'
      );
    }
    return '<div class="modal-section-title">\u{1F4DC} Bills sponsored and co-sponsored</div>' +
      '<p class="modal-section-sub">The bills on file that name this person as a sponsor or co-sponsor on the official record, by what happened to them. Each opens the bill’s page, which links back here.</p>' +
      parts.join('');
  }

  var STYLE_ID = 'pdx-spb-style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '#pdx-sponsored .pdx-spb-group{margin:0 0 0.8rem;}' +
      '#pdx-sponsored .pdx-spb-gh{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.74rem;letter-spacing:0.12em;text-transform:uppercase;color:#9fb4d4;margin:0 0 0.35rem;}' +
      '#pdx-sponsored .pdx-spb-gh span{color:#7596c0;margin-left:0.25rem;}' +
      '#pdx-sponsored ul{margin:0;padding:0;list-style:none;}' +
      '#pdx-sponsored li{margin:0 0 0.4rem;padding:0.5rem 0.65rem;border:1px solid rgba(159,180,212,0.16);border-radius:0.6rem;background:rgba(10,15,30,0.45);}' +
      '#pdx-sponsored li a{color:#9fdbff;font-weight:700;text-decoration:none;}' +
      '#pdx-sponsored li a:hover,#pdx-sponsored li a:focus-visible{text-decoration:underline;}' +
      '#pdx-sponsored .pdx-spb-sit,#pdx-sponsored .pdx-spb-role{font-size:0.75rem;color:#7596c0;margin-left:0.35rem;}' +
      '#pdx-sponsored .pdx-spb-t{color:#dbe6f7;font-size:0.84rem;line-height:1.4;margin-top:0.15rem;}' +
      '#pdx-sponsored .pdx-spb-st{font-size:0.78rem;margin-top:0.2rem;color:#c9d8f2;}' +
      '#pdx-sponsored .pdx-spb-st[data-group="failed"]{color:#fca5a5;}' +
      '#pdx-sponsored .pdx-spb-st[data-group="enacted"]{color:#86efac;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function fill(host) {
    var pid = host.getAttribute('data-pdx-sponsored-pid') || '';
    if (!pid || host.getAttribute('data-pdx-sponsored-for') === pid) return;
    host.setAttribute('data-pdx-sponsored-for', pid);
    load().then(function (data) {
      // The file may have moved on to another person while this loaded.
      if (host.getAttribute('data-pdx-sponsored-pid') !== pid) return;
      var rows = rowsFor(data, pid);
      if (!rows.length) { host.hidden = true; host.innerHTML = ''; return; }
      style();
      host.innerHTML = html(rows);
      host.hidden = false;
    });
  }

  var LATER = ['tension', 'receipts', 'money', 'you', 'drawers'];
  function mount(pid) {
    var body = document.getElementById('modal-body') || document;
    var host = body.querySelector('#pdx-sponsored');
    if (host && host.getAttribute('data-pdx-sponsored-pid') === pid && host.isConnected) return host;
    if (host) host.parentNode.removeChild(host);
    host = document.createElement('div');
    host.className = 'modal-section';
    host.id = 'pdx-sponsored';
    host.hidden = true;
    host.setAttribute('data-pdx-sponsored-pid', pid);
    var stage = body.querySelector('.pdxsp-stage-record');
    if (stage) { stage.appendChild(host); return host; }
    for (var i = 0; i < LATER.length; i++) {
      var next = body.querySelector('.pdxsp-stage-' + LATER[i]);
      if (next && next.parentNode) { next.parentNode.insertBefore(host, next); return host; }
    }
    return null;
  }

  function scan() {
    var pid = String(window._pdxCurrentProfileId || '');
    if (!/^[a-z0-9_]{1,80}$/.test(pid)) return;
    var host = mount(pid);
    if (host) fill(host);
  }

  window.PDXPersonBills = { scan: scan, rowsFor: rowsFor, html: html, load: load };

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
