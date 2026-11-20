/* ═══════════════════════════════════════════════════════════════════════════
   person-coverage.js — four more sections on a person's file
   ────────────────────────────────────────────────────────────────────────────
   One read, GET /api/person-coverage?pid=<pid> (netlify/functions/
   person-coverage.mts), and up to four sections, each drawn only when the
   data covers this person — never an empty section, never "none":

     #pdx-attendance       Roll-call attendance: how many of this person's
                           PUBLISHED roll calls list them as not voting. A count
                           of the roll calls on this site, labelled as such —
                           not an official attendance score. Each roll call
                           counted as not voting is listed and linked to its
                           /vote/<congress>/<chamber>/<session>/<roll> page.
     #pdx-committees       Committee memberships, as the House Clerk's and the
                           Senate's own membership files list them, each
                           linked to its /committee/<code> page.

   Committees, Bills co-sponsored and Committee money each print the date their
   source file was read ("Data as of …"), from the generator's own record.
     #pdx-cosponsorships   Bills co-sponsored in the current Congress, as
                           Congress.gov lists them. Its own section, separate
                           from "Bills sponsored" (#pdx-sponsored), which it
                           does not read or change.
     #pdx-committee-money  Committee money (FEC): direct contributions from
                           PACs, party and candidate committees, by kind, with
                           the largest. Separate from the AIPAC chip, which it
                           does not read or change.

   WHERE THEY GO. The first three, in one wrapper, in the Official record stage
   (.pdxsp-stage-record) after "Recorded votes" (or "Bills sponsored" when that
   is the last one there). Committee money goes in the Money stage
   (.pdxsp-stage-money) when the file has one, else into the same wrapper.
   No line of the profile template changes, and nothing it reads is touched.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPersonCoverage) return;

  var SRC = '/api/person-coverage?pid=';
  var WRAP = 'pdx-coverage-record';
  var MONEY = 'pdx-committee-money';
  var FIRST_BILLS = 10;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function httpUrl(u) { return /^https?:\/\//.test(String(u || '')) ? String(u) : ''; }
  function money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  // "Data as of <date>": the day the section's source file was read, as the
  // generator recorded it. Drawn only when the data carries one.
  function asOfHtml(d) {
    var v = String(d || '').trim();
    return v ? '<p class="pdx-cov-asof">Data as of <span data-pdx-asof>' + esc(v) + '</span></p>' : '';
  }
  function cmtePage(code) {
    return /^[A-Z]{2,6}[0-9]{2}$/.test(String(code || '')) ? '/committee/' + encodeURIComponent(code) : '';
  }
  var MISSED_FIRST = 10;

  var _cache = {};
  function load(pid) {
    if (!_cache[pid]) {
      _cache[pid] = fetch(SRC + encodeURIComponent(pid), { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return _cache[pid];
  }

  // ── the four sections ────────────────────────────────────────────────────
  function attendanceHtml(a) {
    if (!a || !a.rolls) return '';
    var pct = a.missedPct == null ? '' : ' (' + a.missedPct + '%)';
    var span = a.first && a.last ? (a.first === a.last ? ' on ' + a.first : ' from ' + a.first + ' to ' + a.last) : '';
    return '<div class="modal-section" id="pdx-attendance" data-pdx-att-rolls="' + a.rolls + '">' +
      '<div class="modal-section-title">Roll-call attendance</div>' +
      '<p class="pdx-cov-figure" data-pdx-att-line>Not voting on <strong>' + a.notVoting + '</strong> of ' + plural(a.rolls, 'published roll call') + pct + '</p>' +
      '<p class="modal-section-sub" data-pdx-att-label>This is a count of the roll calls published on PolitiDex' + esc(span) + ', not an official attendance score. ' +
      'It covers only the roll calls that have passed PolitiDex’s automatic publish checks, so it can differ from the chamber’s own record. ' +
      'Voted on ' + a.voted + (a.present ? ' (including ' + a.present + ' “present”)' : '') + '.</p>' +
      missedHtml(a.missed) +
      '</div>';
  }

  // The specific roll calls the count is made of, newest first, each linked to
  // its own roll-call page. Only rolls the API sent with a page address.
  function missedRow(m) {
    var ch = m.chamber === 'senate' ? 'Senate' : 'House';
    var label = esc(ch + ' roll ' + m.roll);
    var page = /^\/vote\/\d+\/(house|senate)\/\d+\/\d+$/.test(String(m.page || '')) ? m.page : '';
    return '<li data-pdx-att-missed="' + esc(m.chamber + '|' + m.congress + '|' + m.session + '|' + m.roll) + '">' +
      (page ? '<a href="' + esc(page) + '">' + label + '</a>' : label) +
      (m.bill ? ' · ' + esc(m.bill) : '') + (m.date ? ' · ' + esc(m.date) : '') +
      (m.question ? '<span class="pdx-cov-meta">' + esc(m.question) + '</span>' : '') + '</li>';
  }
  function missedHtml(list) {
    list = (list || []).filter(function (m) { return m && m.roll != null; });
    if (!list.length) return '';
    var first = list.slice(0, MISSED_FIRST).map(missedRow).join('');
    var rest = list.slice(MISSED_FIRST);
    return '<div class="pdx-cov-h">Roll calls listed as not voting</div>' +
      '<ul class="pdx-cov-list" data-pdx-att-missed-list="' + list.length + '">' + first + '</ul>' +
      (rest.length ? '<details class="pdx-cov-more"><summary>Show all ' + list.length + '</summary><ul class="pdx-cov-list">' + rest.map(missedRow).join('') + '</ul></details>' : '');
  }

  function committeesHtml(c) {
    if (!c || !c.committees || !c.committees.length) return '';
    var s = c.sources || {};
    var srcs = [];
    var chambers = {};
    c.committees.forEach(function (x) { chambers[x.chamber] = 1; });
    if ((chambers.house || chambers.joint) && s.house) srcs.push('<a href="' + esc(httpUrl(s.house.url)) + '" target="_blank" rel="noopener">House Clerk member data</a>' + (s.house.asOf ? ' (' + esc(s.house.asOf) + ')' : ''));
    if ((chambers.senate || chambers.joint) && s.senate) srcs.push('<a href="' + esc(httpUrl(s.senate.url)) + '" target="_blank" rel="noopener">Senate committee assignments</a>' + (s.senate.asOf ? ' (' + esc(s.senate.asOf) + ')' : ''));
    function nameLink(x, cls) {
      var href = cmtePage(x.code);
      return href
        ? '<a href="' + esc(href) + '"' + (cls ? ' class="' + cls + '"' : '') + ' data-pdx-cmte-link>' + esc(x.name) + '</a>'
        : (cls ? '<span class="' + cls + '">' + esc(x.name) + '</span>' : esc(x.name));
    }
    var rows = c.committees.map(function (x) {
      return '<li data-pdx-cmte="' + esc(x.code) + '">' + nameLink(x, 'pdx-cov-name') +
        (x.title ? ' <span class="pdx-cov-tag">' + esc(x.title) + '</span>' : '') +
        (x.subcommittees && x.subcommittees.length
          ? '<ul class="pdx-cov-sub">' + x.subcommittees.map(function (y) {
              return '<li data-pdx-cmte="' + esc(y.code) + '">' + nameLink(y, '') + (y.title ? ' <span class="pdx-cov-tag">' + esc(y.title) + '</span>' : '') + '</li>';
            }).join('') + '</ul>'
          : '') + '</li>';
    }).join('');
    return '<div class="modal-section" id="pdx-committees">' +
      '<div class="modal-section-title">Committees</div>' +
      '<ul class="pdx-cov-list">' + rows + '</ul>' +
      '<p class="modal-section-sub pdx-cov-src">From the official membership files: ' + srcs.join(' · ') + '. Only assignments those files list are shown.</p>' +
      asOfHtml(c.asOf || s.fetchedOn) +
      '</div>';
  }

  function billRow(b) {
    var head = b.page
      ? '<a href="' + esc(b.page) + '">' + esc(b.number) + '</a>'
      : '<a href="' + esc(httpUrl(b.url)) + '" target="_blank" rel="noopener">' + esc(b.number) + '</a>';
    return '<li data-pdx-cosp="' + esc(b.number) + '">' + head + ' <span class="pdx-cov-t">' + esc(b.title) + '</span>' +
      '<span class="pdx-cov-meta">' + (b.introduced ? 'Introduced ' + esc(b.introduced) : '') + (b.policyArea ? ' · ' + esc(b.policyArea) : '') + '</span></li>';
  }
  function cosponsorshipsHtml(c) {
    if (!c || !c.bills || !c.bills.length) return '';
    var first = c.bills.slice(0, FIRST_BILLS).map(billRow).join('');
    var rest = c.bills.slice(FIRST_BILLS);
    return '<div class="modal-section" id="pdx-cosponsorships" data-pdx-cosp-count="' + c.bills.length + '">' +
      '<div class="modal-section-title">Bills co-sponsored</div>' +
      '<p class="modal-section-sub">The measures Congress.gov lists this member as a co-sponsor of in the ' + esc(ord(Number(c.congress) || 0)) + ' Congress' + (c.fetchedOn ? ' (read ' + esc(c.fetchedOn) + ')' : '') + '. ' +
      'Co-sponsoring is signing on to a bill; it is not a vote. This list is separate from “Bills sponsored”.</p>' +
      '<p class="pdx-cov-count">' + plural(c.bills.length, 'measure') + '</p>' +
      '<ul class="pdx-cov-list">' + first + '</ul>' +
      (rest.length ? '<details class="pdx-cov-more"><summary>Show all ' + c.bills.length + '</summary><ul class="pdx-cov-list">' + rest.map(billRow).join('') + '</ul></details>' : '') +
      asOfHtml(c.asOf || c.fetchedOn) +
      '</div>';
  }

  function fundingHtml(f) {
    if (!f || !f.top || !f.top.length) return '';
    var cycles = (f.cycles || []).join(' and ');
    var kinds = (f.kinds || []).map(function (k) {
      return '<li data-pdx-fund-kind="' + esc(k.kind) + '">' + esc(k.label) + ' <strong>' + esc(money(k.total)) + '</strong></li>';
    }).join('');
    var top = f.top.map(function (t) {
      return '<li data-pdx-fund-cmte="' + esc(t.id) + '"><span class="pdx-cov-name">' + esc(t.name) + '</span> <strong>' + esc(money(t.total)) + '</strong>' +
        '<span class="pdx-cov-meta">' + esc(t.label) + ' · <a href="https://www.fec.gov/data/committee/' + esc(encodeURIComponent(t.id)) + '/" target="_blank" rel="noopener">FEC ' + esc(t.id) + '</a></span></li>';
    }).join('');
    return '<div class="modal-section" id="' + MONEY + '">' +
      '<div class="modal-section-title">Committee money (FEC)</div>' +
      '<p class="pdx-cov-figure" data-pdx-fund-total>' + esc(money(f.total)) + ' from ' + plural(Number(f.committees) || 0, 'committee') + ', ' + esc(cycles) + ' cycles</p>' +
      '<p class="modal-section-sub">Direct contributions to this person’s campaign from PACs, party committees and other candidates’ committees, as reported to the FEC, net of refunds. ' +
      'Not individual donors and not outside spending. Separate from the AIPAC chip.' +
      (f.fec ? ' <a href="https://www.fec.gov/data/candidate/' + esc(encodeURIComponent(f.fec)) + '/" target="_blank" rel="noopener">FEC candidate ' + esc(f.fec) + '</a>.' : '') + '</p>' +
      '<div class="pdx-cov-h">By kind of committee</div><ul class="pdx-cov-list">' + kinds + '</ul>' +
      '<div class="pdx-cov-h">Largest committees</div><ul class="pdx-cov-list">' + top + '</ul>' +
      asOfHtml(f.asOf) +
      '</div>';
  }

  var STYLE_ID = 'pdx-cov-style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.pdx-cov-figure{font-size:0.95rem;color:#eef4ff;margin:0 0 0.35rem;}' +
      '.pdx-cov-count,.pdx-cov-h{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;color:#9fb4d4;margin:0.5rem 0 0.4rem;}' +
      '.pdx-cov-list{margin:0;padding:0;list-style:none;}' +
      '.pdx-cov-list>li{margin:0 0 0.4rem;padding:0.4rem 0.6rem;border:1px solid rgba(159,180,212,0.16);border-radius:0.55rem;background:rgba(10,15,30,0.45);font-size:0.84rem;color:#dbe6f7;line-height:1.35;}' +
      '.pdx-cov-list a{color:#9fdbff;font-weight:700;text-decoration:none;}' +
      '.pdx-cov-list a:hover,.pdx-cov-list a:focus-visible{text-decoration:underline;}' +
      '.pdx-cov-meta{display:block;color:#9fb4d4;font-size:0.74rem;}' +
      '.pdx-cov-meta a{font-weight:400;}' +
      '.pdx-cov-tag{font-family:"Barlow Condensed",sans-serif;font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;border:1px solid rgba(245,200,66,0.45);color:#f5c842;border-radius:999px;padding:0 0.45rem;}' +
      '.pdx-cov-sub{margin:0.3rem 0 0 0.8rem;padding:0;list-style:disc;color:#c9d8f2;font-size:0.8rem;}' +
      '.pdx-cov-src a{color:#9fdbff;}' +
      '.pdx-cov-asof{color:#9fb4d4;font-size:0.74rem;margin:0.35rem 0 0;}' +
      '.pdx-cov-sub a{color:#c9d8f2;text-decoration:underline;text-decoration-color:rgba(159,219,255,0.45);}' +
      '.pdx-cov-more summary{cursor:pointer;color:#9fdbff;font-size:0.82rem;margin:0.2rem 0 0.5rem;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ── placement ────────────────────────────────────────────────────────────
  // The stages after `record` in the spine (receipts now sits ABOVE record).
  var LATER = ['signature', 'tension', 'money', 'you', 'drawers'];
  function placeWrap(body, host) {
    var stage = body.querySelector('.pdxsp-stage-record');
    if (stage) {
      var anchor = stage.querySelector('#pdx-recorded-votes') || stage.querySelector('#pdx-sponsored');
      if (anchor && anchor.parentNode === stage) {
        if (anchor.nextSibling !== host) stage.insertBefore(host, anchor.nextSibling);
      } else if (host.parentNode !== stage) stage.appendChild(host);
      return true;
    }
    if (host.parentNode) return true;
    for (var i = 0; i < LATER.length; i++) {
      var next = body.querySelector('.pdxsp-stage-' + LATER[i]);
      if (next && next.parentNode) { next.parentNode.insertBefore(host, next); return true; }
    }
    return false;
  }

  function mount(pid) {
    var body = document.getElementById('modal-body') || document;
    var host = body.querySelector('#' + WRAP);
    if (host && host.getAttribute('data-pdx-cov-pid') !== pid) {
      host.parentNode.removeChild(host);
      var oldMoney = body.querySelector('#' + MONEY);
      if (oldMoney && oldMoney.parentNode) oldMoney.parentNode.removeChild(oldMoney);
      host = null;
    }
    if (!host) {
      host = document.createElement('div');
      host.id = WRAP;
      host.hidden = true;
      host.setAttribute('data-pdx-cov-pid', pid);
    }
    return placeWrap(body, host) ? host : null;
  }

  function placeMoney(host, html) {
    var body = document.getElementById('modal-body') || document;
    var old = body.querySelector('#' + MONEY);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!html) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var node = tmp.firstChild;
    var stage = body.querySelector('.pdxsp-stage-money');
    if (stage) stage.appendChild(node);
    else host.appendChild(node);
  }

  function fill(host) {
    var pid = host.getAttribute('data-pdx-cov-pid') || '';
    if (!pid || host.getAttribute('data-pdx-cov-for') === pid) return;
    host.setAttribute('data-pdx-cov-for', pid);
    load(pid).then(function (data) {
      if (host.getAttribute('data-pdx-cov-pid') !== pid) return;
      var inner = data ? attendanceHtml(data.attendance) + committeesHtml(data.committees) + cosponsorshipsHtml(data.cosponsorships) : '';
      var fund = data ? fundingHtml(data.funding) : '';
      if (!inner && !fund) { host.hidden = true; host.innerHTML = ''; return; }
      style();
      host.innerHTML = inner;
      host._pdxFund = fund;
      placeMoney(host, fund);
      host.hidden = !host.firstChild;
    });
  }

  function scan() {
    var pid = String(window._pdxCurrentProfileId || '');
    if (!/^[a-z0-9_]{1,80}$/.test(pid)) return;
    if (typeof fetch !== 'function') return;
    var host = mount(pid);
    if (!host) return;
    fill(host);
    // A re-rendered Money stage drops the section; put it back.
    var body = document.getElementById('modal-body') || document;
    if (host._pdxFund && !body.querySelector('#' + MONEY)) placeMoney(host, host._pdxFund);
  }

  window.PDXPersonCoverage = {
    scan: scan, load: load,
    attendanceHtml: attendanceHtml, committeesHtml: committeesHtml, cosponsorshipsHtml: cosponsorshipsHtml, fundingHtml: fundingHtml,
    missedHtml: missedHtml
  };

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
