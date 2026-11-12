/* ═══════════════════════════════════════════════════════════════════════════
   person-directional-keys.js — bill matches and scorer reads on the
   directional issue keys with a bill pattern, on the person's file
   ────────────────────────────────────────────────────────────────────────────
   WHAT IT SHOWS. For a person listed in person-directional-keys.json (written
   by scripts/gen-person-directional-keys.mjs), one section with up to two
   lists, on the keys that have a bill mapping pattern — the table's `keys`
   (seventeen in bill-key-patterns-v7: the Israel, Ukraine and Iran keys, China
   tariffs, the border, energy, school choice, health care, spending, climate,
   gun safety, abortion, voting rules, housing, trade, wages and unions, and
   criminal justice) — and no other key. The heading counts and names them
   from the table, so it never says more or fewer than the table holds:
     · Bills matched to a key: each bill the bill finder matched to one of those
       keys in the person's sources — the bill (linked to its bill page when
       there is one), the key, the match confidence (high / medium / low), a
       short quote of the text that justified it, and the source it was found
       in (bill text, roll call, floor speech, press release …), linked.
       A descriptive phrase that names no number ("these resolutions") lists
       the bills it can be; a bill named only by its title shows the title.
     · Stance scorer reads: the automated scorer's read on each of those keys
       that has a record — the position, its confidence, and the sources read.
   Nothing is computed here; the rows are the table's.

   WHAT IT DOES NOT. No score, rank, grade or Direction Match. A person with no
   row in the table gets no section at all — not an empty one, and no "none".

   WHERE IT GOES. At the end of the file's Explore by topic stage — the
   .pdxsp-stage-explore block profile-spine.js assembles — as its own
   #pdx-dirkeys section, put there after the file renders, so no line of the
   profile template (shared with the homepage) changes. A file with no Explore
   stage gets it in Stances & connections, or ahead of the Official record.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPersonDirectionalKeys) return;

  var SRC = '/person-directional-keys.json';
  var POSITION = { support: 'Supports', oppose: 'Opposes', mixed: 'Mixed', 'no clear position': 'No clear position' };
  var CONF = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };
  var NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function congressText(n) {
    n = Number(n);
    if (!n) return '';
    var t = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return n + t + ' Congress';
  }
  function safeHref(u) { u = String(u || ''); return /^(?:https:\/\/|\/b\/)/.test(u) ? u : ''; }
  function sourceHtml(s) {
    if (!s) return '';
    var label = cap(s.type) + (s.date ? ', ' + s.date : '');
    var href = safeHref(s.link);
    return href ? '<a href="' + esc(href) + '" rel="noopener" target="_blank" data-pdx-dirkeys-source>' + esc(label) + '</a>' : esc(label);
  }
  function billHtml(b) {
    var href = safeHref(b.page);
    var txt = esc(b.bill) + (b.congress ? ' <span class="pdx-dk-sit">' + esc(congressText(b.congress)) + '</span>' : '');
    return href ? '<a href="' + esc(href) + '" data-pdx-dirkeys-bill="' + esc(b.congress + '|' + b.bill) + '">' + txt + '</a>' : '<span data-pdx-dirkeys-bill="' + esc(b.congress + '|' + b.bill) + '">' + txt + '</span>';
  }

  var _data = null;
  function load() {
    if (!_data) {
      _data = fetch(SRC, { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return _data;
  }

  function entryFor(data, pid) {
    if (!data || !data.people) return null;
    var e = data.people[pid];
    if (!e && typeof window.PDXProfilePid === 'function') {
      try { e = data.people[window.PDXProfilePid(pid)]; } catch (x) { e = null; }
    }
    if (!e) return null;
    var keys = data.keys || {};
    // Only keys the table names as having a pattern.
    var mappings = (e.mappings || []).filter(function (m) { return keys[m.key]; });
    var stances = (e.stances || []).filter(function (s) { return keys[s.key]; });
    return mappings.length || stances.length ? { mappings: mappings, stances: stances, keys: keys } : null;
  }

  function mappingHtml(m, keys) {
    var head = m.bill
      ? billHtml(m)
      : m.name
      ? '<span data-pdx-dirkeys-bill-name>' + esc(m.name) + '</span> <span class="pdx-dk-note">(named by title; no bill number in the source)</span>'
      : 'One of ' + (m.one_of || []).map(billHtml).join(', ') +
        (m.best_fit ? ' <span class="pdx-dk-note">(official title closest: ' + esc(m.best_fit) + ')</span>' : '');
    var also = (m.also_found_in || []).map(sourceHtml).join('; ');
    return '<li data-pdx-dirkeys-mapping data-key="' + esc(m.key) + '" data-confidence="' + esc(m.confidence) + '">' +
      '<div class="pdx-dk-line">' + head +
      ' <span class="pdx-dk-key">' + esc(keys[m.key].label) + '</span>' +
      ' <span class="pdx-dk-conf" data-confidence="' + esc(m.confidence) + '">' + esc(CONF[m.confidence] || m.confidence) + '</span>' +
      '</div>' +
      (m.title ? '<div class="pdx-dk-t">' + esc(m.title) + '</div>' : '') +
      (m.justification ? '<blockquote class="pdx-dk-q" data-pdx-dirkeys-justification>' + esc(m.justification) + '</blockquote>' : '') +
      '<div class="pdx-dk-src">Found in: ' + sourceHtml(m.source) + (also ? '. Also in: ' + also : '') + '</div>' +
    '</li>';
  }

  function stanceHtml(s, keys) {
    var srcs = (s.sources || []).map(sourceHtml).join('; ');
    return '<li data-pdx-dirkeys-stance data-key="' + esc(s.key) + '" data-position="' + esc(s.position) + '">' +
      '<div class="pdx-dk-line"><span class="pdx-dk-keyname">' + esc(keys[s.key].label) + '</span>' +
      ' <span class="pdx-dk-pos" data-position="' + esc(s.position) + '">' + esc(POSITION[s.position] || s.position) + '</span>' +
      ' <span class="pdx-dk-conf">Confidence ' + esc(Number(s.confidence).toFixed(2)) + '</span></div>' +
      '<div class="pdx-dk-t">' + esc(keys[s.key].pos) + '</div>' +
      (s.quote ? '<blockquote class="pdx-dk-q">' + esc(s.quote) + '</blockquote>' : '') +
      (srcs ? '<div class="pdx-dk-src">Sources read: ' + srcs + '</div>' : '') +
    '</li>';
  }

  function html(entry) {
    if (!entry) return '';
    var labels = Object.keys(entry.keys).map(function (k) { return entry.keys[k].label; });
    var count = NUMBER_WORDS[labels.length] || String(labels.length);
    var list = labels.length > 1 ? labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1] : labels.join('');
    var parts = ['<div class="modal-section-title">\u{1F9ED} Bills and stances on ' + esc(count) + ' directional issues</div>',
      '<p class="modal-section-sub">Bill matches made by the bill finder in this person’s sources, and the automated stance scorer’s read, on ' + esc(count) + ' issues only: ' + esc(list) + '.</p>'];
    if (entry.mappings.length) {
      parts.push('<div class="pdx-dk-group" data-pdx-dirkeys-group="mappings"><div class="pdx-dk-gh">Bills matched to an issue <span>' + entry.mappings.length + '</span></div>' +
        '<ul>' + entry.mappings.map(function (m) { return mappingHtml(m, entry.keys); }).join('') + '</ul></div>');
    }
    if (entry.stances.length) {
      parts.push('<div class="pdx-dk-group" data-pdx-dirkeys-group="stances"><div class="pdx-dk-gh">Stance scorer reads <span>' + entry.stances.length + '</span></div>' +
        '<ul>' + entry.stances.map(function (s) { return stanceHtml(s, entry.keys); }).join('') + '</ul></div>');
    }
    return parts.join('');
  }

  var STYLE_ID = 'pdx-dk-style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '#pdx-dirkeys .pdx-dk-group{margin:0 0 0.8rem;}' +
      '#pdx-dirkeys .pdx-dk-gh{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.74rem;letter-spacing:0.12em;text-transform:uppercase;color:#9fb4d4;margin:0 0 0.35rem;}' +
      '#pdx-dirkeys .pdx-dk-gh span{color:#7596c0;margin-left:0.25rem;}' +
      '#pdx-dirkeys ul{margin:0;padding:0;list-style:none;}' +
      '#pdx-dirkeys li{margin:0 0 0.4rem;padding:0.5rem 0.65rem;border:1px solid rgba(159,180,212,0.16);border-radius:0.6rem;background:rgba(10,15,30,0.45);}' +
      '#pdx-dirkeys a{color:#9fdbff;text-decoration:none;}' +
      '#pdx-dirkeys a:hover,#pdx-dirkeys a:focus-visible{text-decoration:underline;}' +
      '#pdx-dirkeys .pdx-dk-line{display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem 0.4rem;font-weight:700;color:#dbe6f7;}' +
      '#pdx-dirkeys .pdx-dk-sit,#pdx-dirkeys .pdx-dk-key,#pdx-dirkeys .pdx-dk-conf,#pdx-dirkeys .pdx-dk-pos{display:inline-flex;align-items:center;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.08em;text-transform:uppercase;line-height:1.15;border-radius:999px;padding:0.14rem 0.5rem;white-space:nowrap;border:1px solid rgba(159,180,212,0.24);color:#c9d8f2;}' +
      '#pdx-dirkeys .pdx-dk-sit{border-color:transparent;padding-left:0.2rem;color:#9fb4d4;}' +
      '#pdx-dirkeys .pdx-dk-key{background:rgba(96,165,250,0.1);}' +
      '#pdx-dirkeys .pdx-dk-t{color:#c9d8f2;font-size:0.82rem;line-height:1.4;margin-top:0.2rem;}' +
      '#pdx-dirkeys .pdx-dk-note{font-weight:400;font-size:0.78rem;color:#9fb4d4;}' +
      '#pdx-dirkeys .pdx-dk-q{margin:0.35rem 0 0;padding:0.1rem 0 0.1rem 0.6rem;border-left:2px solid rgba(159,180,212,0.35);color:#dbe6f7;font-size:0.82rem;line-height:1.45;font-style:italic;overflow-wrap:anywhere;}' +
      '#pdx-dirkeys .pdx-dk-src{font-size:0.76rem;margin-top:0.3rem;color:#9fb4d4;overflow-wrap:anywhere;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function fill(host) {
    var pid = host.getAttribute('data-pdx-dirkeys-pid') || '';
    if (!pid || host.getAttribute('data-pdx-dirkeys-for') === pid) return;
    host.setAttribute('data-pdx-dirkeys-for', pid);
    load().then(function (data) {
      if (host.getAttribute('data-pdx-dirkeys-pid') !== pid) return;
      var entry = entryFor(data, pid);
      if (!entry) { host.hidden = true; host.innerHTML = ''; return; }
      style();
      host.innerHTML = html(entry);
      host.hidden = false;
    });
  }

  var STAGES = ['explore', 'signature'];
  function mount(pid) {
    var body = document.getElementById('modal-body') || document;
    var host = body.querySelector('#pdx-dirkeys');
    if (host && host.getAttribute('data-pdx-dirkeys-pid') === pid && host.isConnected) return host;
    if (host) host.parentNode.removeChild(host);
    host = document.createElement('div');
    host.className = 'modal-section';
    host.id = 'pdx-dirkeys';
    host.hidden = true;
    host.setAttribute('data-pdx-dirkeys-pid', pid);
    for (var i = 0; i < STAGES.length; i++) {
      var stage = body.querySelector('.pdxsp-stage-' + STAGES[i]);
      if (stage) { stage.appendChild(host); return host; }
    }
    var rec = body.querySelector('.pdxsp-stage-record');
    if (rec && rec.parentNode) { rec.parentNode.insertBefore(host, rec); return host; }
    return null;
  }

  function scan() {
    var pid = String(window._pdxCurrentProfileId || '');
    if (!/^[a-z0-9_]{1,80}$/.test(pid)) return;
    var host = mount(pid);
    if (host) fill(host);
  }

  window.PDXPersonDirectionalKeys = { scan: scan, entryFor: entryFor, html: html, load: load };

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
