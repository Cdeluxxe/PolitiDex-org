/* ═══════════════════════════════════════════════════════════════════════════
   bill-cosponsors.js — roster co-sponsors on a federal /b/ bill page
   ────────────────────────────────────────────────────────────────────────────
   For /b/<congress>/<number>, the roster members Congress.gov lists as
   co-sponsors of the bill (GET /api/bill-cosponsors?bill=<congress>|<number>,
   from db/cosponsorships.json — scripts/gen-cosponsorships.mjs), each linked to
   their /p/ file.

   ONLY WHAT THE PAGE DOES NOT ALREADY SAY. The page's own Sponsors block (the
   edge writes it from the bill's official record) may already name co-sponsors.
   A member it names is not repeated; when it names every one, no section is
   drawn. A state sitting (2025GS) is not covered, and a bill no roster member
   co-sponsored gets nothing. Nothing the edge wrote is read beyond those links,
   or moved, or changed: the section is added after the Sponsors block.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBillCosponsors) return;

  var SRC = '/api/bill-cosponsors?bill=';
  var ID = 'pdx-bill-cosponsors';
  var PATH = /^\/b\/(\d{1,3})\/(.+?)\/?$/;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function keyFromPath(pathname) {
    var m = PATH.exec(String(pathname || ''));
    if (!m) return '';
    var number;
    try { number = decodeURIComponent(m[2]); } catch (e) { return ''; }
    number = number.replace(/\s+/g, ' ').trim();
    return /^[A-Za-z.]{1,12} \d{1,6}$/.test(number) ? m[1] + '|' + number : '';
  }

  // The roster ids the page's Sponsors block already links as co-sponsors.
  function shown(doc) {
    var out = {};
    var links = doc.querySelectorAll('[data-pdx-bill-sponsor][data-role="cosponsor"]');
    for (var i = 0; i < links.length; i++) out[links[i].getAttribute('data-pdx-bill-sponsor')] = 1;
    return out;
  }

  function html(data, already) {
    var list = (data && data.cosponsors) || [];
    var fresh = list.filter(function (c) { return !already[c.pid]; });
    if (!fresh.length) return '';
    var some = fresh.length < list.length;
    return '<h2>' + (some ? 'More co-sponsors on PolitiDex' : 'Co-sponsors on PolitiDex') + '</h2>' +
      '<p class="pdx-bill-cosp-sub">Members with a PolitiDex file whom Congress.gov lists as co-sponsors of this bill' +
      (data.fetchedOn ? ' (read ' + esc(data.fetchedOn) + ')' : '') + '.' +
      (some ? ' Co-sponsors already named above are not repeated.' : '') +
      (data.url ? ' <a href="' + esc(data.url) + '" target="_blank" rel="noopener">Full list on Congress.gov</a>.' : '') + '</p>' +
      '<ul>' + fresh.map(function (c) {
        return '<li><a href="/p/' + esc(encodeURIComponent(c.pid)) + '" data-pdx-bill-cosp="' + esc(c.pid) + '">' + esc(c.name) + '</a></li>';
      }).join('') + '</ul>';
  }

  function run() {
    var key = keyFromPath(location.pathname);
    if (!key || typeof fetch !== 'function' || document.getElementById(ID)) return;
    fetch(SRC + encodeURIComponent(key), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        if (!data || !data.cosponsors || document.getElementById(ID)) return;
        var body = html(data, shown(document));
        if (!body) return;
        var sec = document.createElement('section');
        sec.id = ID;
        sec.className = 'pdx-bill-sponsors pdx-bill-cosponsors';
        sec.innerHTML = body;
        var after = document.querySelector('[data-pdx-bill-sponsors]');
        if (after && after.parentNode) after.parentNode.insertBefore(sec, after.nextSibling);
        else (document.querySelector('main') || document.body).appendChild(sec);
      });
  }

  window.PDXBillCosponsors = { keyFromPath: keyFromPath, html: html, run: run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
