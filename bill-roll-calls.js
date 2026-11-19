/* ═══════════════════════════════════════════════════════════════════════════
   bill-roll-calls.js — "Roll calls on the record" on a /b/ bill page
   ────────────────────────────────────────────────────────────────────────────
   For a bill page at /b/<congress>/<number>, the roll calls the vote-actions job
   recorded on that bill, each with how every member with a PolitiDex file voted.

   ONLY WHERE A PUBLISHED ROLL CALL EXISTS. The rows come from
   GET /api/vote-actions/bill?key=<bill key>, which sends only roll calls that
   pass the automatic publish gate (netlify/lib/vote-actions-publish.ts, judged
   per roll call — a held roll call is left out and the bill's other roll calls
   still come). No published roll call → no section, and the page is exactly as
   it was. Nothing the edge wrote into the page is read, moved or changed: the
   section is added after it, as its own <section>.

   THE RAW RECORD. The question put, the result the record states, the totals
   and each listed member's vote, with a link to the official record and to the
   roll call's own page (/vote/<congress>/<chamber>/<session>/<roll>). No verdict
   and no comparison with any stated position. Totals count every recorded vote;
   a member with no PolitiDex file (a delegate, a member the roster does not
   carry) is counted there and not named, and the section says how many.

   THE BILL KEY. Congress + the citation's letters + its number, the shared key
   the job stores ("us-119-hr-5000"), read the same way as the drawer's
   _xlBillKey in consistency.js. A state sitting (2025GS) has no such key.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBillRollCalls) return;

  var SRC = '/api/vote-actions/bill?key=';
  var ID = 'pdx-bill-rolls';
  var CODES = { hr: 1, s: 1, hres: 1, sres: 1, hjres: 1, sjres: 1, hconres: 1, sconres: 1, hamdt: 1, samdt: 1, suamdt: 1 };
  var GROUPS = [
    { v: 'yes', t: 'Yea' }, { v: 'no', t: 'Nay' }, { v: 'present', t: 'Present' }, { v: 'not_voting', t: 'Not voting' }
  ];
  var PATH = /^\/b\/([A-Za-z0-9]{1,12})\/(.+?)\/?$/;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
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

  function billKey(sitting, number) {
    var c = parseInt(String(sitting || ''), 10);
    if (!(c >= 1) || !/^\d+$/.test(String(sitting))) return null;
    var m = /^([A-Za-z.\s]+?)\s*([0-9]+)$/.exec(String(number || '').trim());
    if (!m) return null;
    var code = m[1].toLowerCase().replace(/[^a-z]/g, '');
    if (!CODES[code]) return null;
    return 'us-' + c + '-' + code + '-' + m[2].replace(/^0+(?=\d)/, '');
  }
  function keyFromPath(pathname) {
    var m = PATH.exec(pathname || '');
    if (!m) return null;
    try { return billKey(decodeURIComponent(m[1]), decodeURIComponent(m[2])); } catch (e) { return null; }
  }

  function memberHtml(x) {
    var bits = [x.party, x.state].filter(Boolean).join('-');
    var name = esc(x.name || x.pid);
    return '<li><a href="/p/' + encodeURIComponent(x.pid) + '" data-pdx-bill-roll-member="' + esc(x.pid) + '">' + name + '</a>' +
      (bits ? ' <span class="pdx-bill-rolls-pm">' + esc(bits) + '</span>' : '') + '</li>';
  }

  function rollHtml(r) {
    var ch = r.chamber === 'senate' ? 'Senate' : 'House';
    var t = r.totals || {};
    var tally = GROUPS.filter(function (g) { return (t[g.v] || 0) > 0 || g.v === 'yes' || g.v === 'no'; })
      .map(function (g) { return g.t + ' ' + (t[g.v] || 0); }).join(' · ');
    var src = httpUrl(r.sourceUrl);
    var page = rollPage(r);
    var members = r.members || [];
    var groups = GROUPS.map(function (g) {
      var list = members.filter(function (x) { return x.vote === g.v; });
      if (!list.length) return '';
      return '<div class="pdx-bill-rolls-g" data-pdx-bill-roll-group="' + g.v + '"><h3>' + esc(g.t) + ' <span>' + list.length + '</span></h3>' +
        '<ul>' + list.map(memberHtml).join('') + '</ul></div>';
    }).join('');
    return '<li class="pdx-bill-rolls-r" data-pdx-bill-roll="' + esc(r.chamber + '|' + r.congress + '|' + r.session + '|' + r.roll) + '">' +
      '<time>' + esc(String(r.date || '').slice(0, 10)) + ' · ' +
        (page ? '<a href="' + esc(page) + '" data-pdx-bill-roll-page>' + esc(ch) + ' roll ' + esc(r.roll) + '</a>' : esc(ch) + ' roll ' + esc(r.roll)) +
        (r.procedural ? ' · procedural' : '') + '</time>' +
      (r.question ? '<span class="pdx-bill-rolls-q">' + esc(r.question) + '</span>' : '') +
      '<span class="pdx-bill-rolls-t">' + (r.result ? esc(r.result) + ' · ' : '') + esc(tally) + '</span>' +
      (members.length ? '<details><summary>How members voted</summary>' + groups +
        (r.unlisted ? '<p class="pdx-bill-rolls-u">' + esc(r.unlisted) + ' recorded vote' + (r.unlisted === 1 ? '' : 's') +
          ' from members with no PolitiDex file ' + (r.unlisted === 1 ? 'is' : 'are') + ' counted above and not listed.</p>' : '') +
        '</details>' : '') +
      (page || src ? '<span class="pdx-bill-rolls-src">' +
        (page ? '<a href="' + esc(page) + '">Roll-call page</a>' : '') + (page && src ? ' · ' : '') +
        (src ? '<a href="' + esc(src) + '" target="_blank" rel="noopener">Official record</a>' : '') + '</span>' : '') +
      '</li>';
  }

  function html(data) {
    var rolls = (data && data.rolls) || [];
    return '<h2>Roll calls on the record</h2>' +
      '<p class="pdx-bill-rolls-lab" data-pdx-bill-rolls-label>The raw record of each recorded vote on this measure, as the official House or Senate record lists it. ' +
      'No verdict and no comparison with anything a member has said. A roll call appears here only after it passes PolitiDex’s automatic publish checks.</p>' +
      '<ol>' + rolls.map(rollHtml).join('') + '</ol>';
  }

  var STYLE_ID = 'pdx-bill-rolls-style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.pdx-bill-rolls{max-width:44rem;margin:-1.5rem auto 3rem;padding:0 1.1rem;}' +
      '.pdx-bill-rolls h2{margin:1.4rem 0 0.5rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;}' +
      '.pdx-bill-rolls p{color:#9fb4d4;line-height:1.6;}' +
      '.pdx-bill-rolls ol{margin:0;padding:0;list-style:none;}' +
      '.pdx-bill-rolls-r{margin:0 0 0.6rem;padding:0.6rem 0.75rem;border:1px solid rgba(159,180,212,0.16);border-radius:10px;background:rgba(127,180,255,0.04);color:#dbe6f7;line-height:1.5;}' +
      '.pdx-bill-rolls-r time a{color:inherit;text-decoration:underline;text-decoration-color:rgba(159,219,255,0.5);}' +
      '.pdx-bill-rolls-r time{display:block;font-family:"Barlow Condensed",sans-serif;font-size:0.75rem;letter-spacing:0.06em;text-transform:uppercase;color:#9fb4d4;}' +
      '.pdx-bill-rolls-q{display:block;}' +
      '.pdx-bill-rolls-t{display:block;color:#c9d8f2;font-size:0.88rem;}' +
      '.pdx-bill-rolls-r details summary{cursor:pointer;color:#c9d8f2;margin-top:0.35rem;}' +
      '.pdx-bill-rolls-g h3{margin:0.6rem 0 0.25rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;}' +
      '.pdx-bill-rolls-g h3 span{color:#9fb4d4;margin-left:0.25rem;}' +
      '.pdx-bill-rolls-g ul{margin:0;padding:0;list-style:none;columns:2 12rem;column-gap:1rem;}' +
      '.pdx-bill-rolls-g li{font-size:0.86rem;break-inside:avoid;}' +
      '.pdx-bill-rolls a{color:#9fdbff;}' +
      '.pdx-bill-rolls-pm{color:#7596c0;font-size:0.78rem;}' +
      '.pdx-bill-rolls-u{font-size:0.84rem;margin:0.4rem 0 0;}' +
      '.pdx-bill-rolls-src{display:block;font-size:0.84rem;margin-top:0.3rem;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function place(data) {
    var doc = document.getElementById('pdx-bill-doc');
    if (!doc || !doc.parentNode) return;
    var cur = document.getElementById(ID);
    if (cur) cur.parentNode.removeChild(cur);
    if (doc.hasAttribute('data-pdx-bill-empty')) return;
    style();
    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'pdx-bill-rolls';
    sec.setAttribute('data-pdx-bill-rolls', (data && data.billKey) || '');
    sec.innerHTML = html(data);
    doc.parentNode.insertBefore(sec, doc.nextSibling);
  }

  function boot() {
    var key = keyFromPath(location.pathname);
    if (!key || typeof fetch !== 'function') return;
    fetch(SRC + encodeURIComponent(key), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.rolls || !d.rolls.length) return;
        place(d);
        // The page's own guard may replace the document under it once; keep the
        // section after whichever <main> is on screen.
        if (typeof MutationObserver === 'function' && document.body) {
          new MutationObserver(function () {
            var doc = document.getElementById('pdx-bill-doc');
            var sec = document.getElementById(ID);
            if (doc && (!sec || doc.nextSibling !== sec)) place(d);
          }).observe(document.body, { childList: true });
        }
      })
      .catch(function () { /* no section: the page is as it was */ });
  }

  window.PDXBillRollCalls = { billKey: billKey, keyFromPath: keyFromPath, html: html, rollPage: rollPage };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
