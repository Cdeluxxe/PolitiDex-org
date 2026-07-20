/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Digital Library  ·  window.PDXDigitalLibrary
   ────────────────────────────────────────────────────────────────────────────
   The central, searchable archive. PolitiDex spreads its record across many
   surfaces — the Evidence Locker, Issue Spotlights, stances, voting records,
   the People's Mandate, major bills and the community boards. The Digital
   Library is the one front door over all of it: search across everything from
   a single box, or browse a well-organized set of collections without endless
   scrolling.

   NO NEW DATA. Everything is read from globals the app already ships:
     • window.PDXSpotlight.list()            issue spotlights
     • window._pdxMandateItems               People's Mandate reforms
     • window.PDXReceipts.collect()/search() say-vs-do receipts (record vs. word)
     • window.PDXHR1                          the H.R.1 / omnibus showcase
     • window.CMP_DATA / window.PROFILES      politicians (→ stances + votes)
     • window.PDXIssueView.searchIssues()     issue rankings
     • window._pdxOpenEvidenceLocker()        deep-links a query into the Locker
     • window._issueLabel / _pdxCategoryOf    labels

   The unified BROWSE grid aggregates the bounded, client-side collections
   (spotlights + mandates + bills + top receipts) into one filterable list —
   filter by type or issue, search by keyword, paginated so it never runs long.
   The unbounded/lazy sources (all evidence, every stance, every vote, community
   posts) are reached through the collection tiles and the cross-source search,
   which jump straight into their own rich browse surfaces.

   Mounts into #digital-library (see index.html). Exposes:
     PDXDigitalLibrary.render()            (re)build everything
     PDXDigitalLibrary.focus(opts)         scroll in; opts {q, type, issue}
     PDXDigitalLibrary.search(q)           preset the search box
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXDigitalLibrary) return; // idempotent

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function G(name) { try { return window[name]; } catch (e) { return null; } }
  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  var PAGE = 18;                       // grid items per page
  var RECEIPT_CAP = 60;                // top receipts folded into the archive
  var _state = { q: '', type: 'all', issue: '', shown: PAGE };
  var _index = null;                   // built archive items
  var _openMap = {};                   // id → open() handler
  var _built = false;

  // Type metadata — icon + label + the accent used on badges/chips.
  var TYPES = {
    spotlight: { icon: '📌', label: 'Spotlight', plural: 'Spotlights' },
    receipt:   { icon: '🧾', label: 'Say vs. Do', plural: 'Say vs. Do' },
    mandate:   { icon: '✊', label: 'Mandate', plural: 'Mandates' },
    bill:      { icon: '🏛️', label: 'Bill', plural: 'Bills' },
    contract:  { icon: '💰', label: 'Contract', plural: 'Contracts' }
  };

  // ── Build the unified archive index from the client-side collections ────────
  function buildIndex() {
    var items = [];
    _openMap = {};

    // Issue Spotlights
    try {
      var api = G('PDXSpotlight');
      if (api && typeof api.list === 'function') {
        api.list().forEach(function (sp, i) {
          if (!sp || !sp.slug) return;
          var keys = [];
          if (sp.primaryIssueKey) keys.push(sp.primaryIssueKey);
          (sp.communityIssueKeys || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
          var blurb = sp.blurb || sp.metaDescription || sp.summary || '';
          var isBill = /\bhr-?1\b|omnibus|big beautiful bill|\bbill\b|\bact\b/i.test((sp.slug || '') + ' ' + (sp.title || ''));
          var id = 'sp:' + sp.slug;
          items.push({
            id: id, type: isBill ? 'bill' : 'spotlight', title: sp.title || sp.slug,
            sub: sp.place || '', blurb: blurb, issueKeys: keys,
            hay: ((sp.title || '') + ' ' + (sp.place || '') + ' ' + (sp.searchKeywords || '') + ' ' + blurb).toLowerCase()
          });
          _openMap[id] = (function (slug) { return function () { api.open(slug); }; })(sp.slug);
        });
      }
    } catch (e) {}

    // People's Mandate reforms
    try {
      var mand = G('_pdxMandateItems');
      var focus = G('_pdxMandateFocus');
      if (Array.isArray(mand)) {
        mand.forEach(function (m) {
          if (!m || !m.agendaId) return;
          var keys = (m.issueKeys && m.issueKeys.length) ? m.issueKeys.slice() : (m.issueKey ? [m.issueKey] : []);
          var id = 'md:' + m.agendaId;
          items.push({
            id: id, type: 'mandate', title: m.name || m.title || m.agendaId,
            sub: 'People’s Mandate reform', blurb: '', issueKeys: keys, icon: m.icon,
            hay: ((m.name || '') + ' ' + (m.title || '') + ' ' + keys.map(issueLabel).join(' ')).toLowerCase()
          });
          _openMap[id] = (function (k) {
            return function () { if (typeof focus === 'function') focus(k); else location.hash = '#agenda'; };
          })(m.issueKey || keys[0] || '');
        });
      }
    } catch (e) {}

    // Major bill — the H.R.1 / omnibus showcase (flagship). Spotlights already
    // contribute any other bill-shaped guides above (type coerced to 'bill').
    try {
      var hr1 = G('PDXHR1');
      if (hr1 && typeof hr1.open === 'function') {
        var id = 'bill:hr1';
        if (!_openMap[id]) {
          items.push({
            id: id, type: 'bill', title: 'H.R. 1 — The One Big Beautiful Bill Act',
            sub: 'Flagship omnibus showcase', blurb: 'Track how every member voted on the sprawling 2025 reconciliation package — and what it means issue by issue.',
            issueKeys: ['national_debt', 'lower_taxes', 'healthcare'],
            hay: 'hr1 h.r.1 one big beautiful bill act omnibus reconciliation taxes spending showcase'
          });
          _openMap[id] = function () { hr1.open(); };
        }
      }
    } catch (e) {}

    // Say-vs-Do receipts — the record-vs-word artifacts. Bounded to the top set
    // (collect() returns them ranked) so the archive stays balanced.
    try {
      var rc = G('PDXReceipts');
      if (rc && typeof rc.collect === 'function') {
        rc.collect().slice(0, RECEIPT_CAP).forEach(function (r, i) {
          if (!r || !r.headline) return;
          var id = 'rc:' + (r.pid || '') + '|' + (r.issueKey || '') + '|' + i;
          items.push({
            id: id, type: 'receipt', title: r.headline,
            sub: r.name || '', blurb: (r.said && r.said.text) ? ('Said: “' + r.said.text + '”') : '',
            issueKeys: r.issueKey ? [r.issueKey] : [], verdict: r.verdict,
            hay: ((r.headline || '') + ' ' + (r.name || '') + ' ' + issueLabel(r.issueKey)).toLowerCase()
          });
          _openMap[id] = (function (pid, ik) {
            return function () { if (typeof rc.open === 'function') rc.open(pid, ik); };
          })(r.pid, r.issueKey);
        });
      }
    } catch (e) {}

    // Government contracts — the Federal Spending Tracker records (window.PDXContracts).
    // Curated, sourced federal awards, folded into the archive so a search for a
    // company, agency or program surfaces the money alongside the spotlights and
    // votes. Each card opens the tracker focused on that recipient.
    try {
      var gc = G('PDXContracts');
      if (gc && typeof gc.list === 'function') {
        gc.list().forEach(function (c) {
          if (!c || !c.id) return;
          var id = 'gc:' + c.id;
          items.push({
            id: id, type: 'contract', title: c.recipient,
            sub: (c.agencyShort || c.agency || '') + (c.stateLabel ? ' · ' + c.stateLabel : ''),
            blurb: c.description || '', issueKeys: (c.issueKeys || []).slice(),
            hay: ((c.recipient || '') + ' ' + (c.agency || '') + ' ' + (c.stateLabel || '') + ' ' +
              (c.description || '') + ' ' + (c.issueKeys || []).map(issueLabel).join(' ') + ' government contract federal spending').toLowerCase()
          });
          _openMap[id] = (function (rec) { return function () { gc.open({ recipient: rec }); }; })(c.recipient);
        });
      }
    } catch (e) {}

    return items;
  }

  // ── Collection tiles — the front doors to every source, bounded or not ──────
  function collections() {
    var out = [];
    function push(icon, label, desc, count, go) { out.push({ icon: icon, label: label, desc: desc, count: count, go: go }); }

    var spN = 0; try { spN = (G('PDXSpotlight').list() || []).length; } catch (e) {}
    var mdN = 0; try { mdN = (G('_pdxMandateItems') || []).length; } catch (e) {}
    var rcN = 0; try { rcN = (G('PDXReceipts').collect() || []).length; } catch (e) {}
    var stN = 0; try { stN = Object.keys(G('ISSUE_STANCE_DATA') || {}).length; } catch (e) {}
    var gcN = 0; try { gcN = (G('PDXContracts').list() || []).length; } catch (e) {}

    push('📂', 'Evidence Locker', 'Every sourced receipt — video, records & posts.', null,
      function () { if (typeof window._pdxOpenEvidenceLocker === 'function') window._pdxOpenEvidenceLocker({}); else location.hash = '#evidence-locker'; });
    push('📌', 'Issue Spotlights', 'Neutral, sourced deep-dives on the big fights.', spN,
      function () { if (window.PDXSpotlightHub && window.PDXSpotlightHub.focus) window.PDXSpotlightHub.focus(); else location.hash = '#all-spotlights'; });
    push('🎯', 'Stances & Positions', 'Where every politician stands, issue by issue.', stN,
      function () { if (window.PDXStanceLibrary && window.PDXStanceLibrary.open) window.PDXStanceLibrary.open(); else location.hash = '#stance-library'; });
    push('🗳️', 'Voting Records', 'What they actually did — ranked by consistency.', null,
      function () { if (window.PDXIssueView && window.PDXIssueView.open) location.hash = '#issue-front-door'; else location.hash = '#issue-front-door'; });
    push('💰', 'Federal Spending Tracker', 'Government contracts by agency, company & state.', gcN,
      function () { if (window.PDXContracts && window.PDXContracts.open) window.PDXContracts.open(); else location.hash = '#digital-library'; });
    push('🧾', 'Say vs. Do', 'Receipts where the record met the rhetoric.', rcN,
      function () { location.hash = '#say-vs-do'; });
    push('✊', 'Mandates & Reforms', 'The citizen-backed reform agenda.', mdN,
      function () { location.hash = '#agenda'; });
    push('🏛️', 'Major Bills', 'H.R.1 and the omnibus packages, vote by vote.', null,
      function () { if (window.PDXHR1 && window.PDXHR1.open) window.PDXHR1.open(); else location.hash = '#hr1-showcase'; });
    push('❤️', 'Community', 'Leads, evidence and debate from the community.', null,
      function () { location.hash = '#community-exchange'; });
    return out;
  }

  function renderCollections() {
    var wrap = document.getElementById('dlib-collections');
    if (!wrap) return;
    var cols = collections();
    wrap.innerHTML = cols.map(function (c, i) {
      var badge = (c.count != null && c.count > 0) ? '<span class="dlib-col-n">' + c.count + '</span>' : '';
      return '<button type="button" class="dlib-col" data-col="' + i + '" aria-label="' + esc(c.label) + '">' +
        '<span class="dlib-col-ico" aria-hidden="true">' + c.icon + '</span>' +
        '<span class="dlib-col-body">' +
          '<span class="dlib-col-top"><span class="dlib-col-label">' + esc(c.label) + '</span>' + badge + '</span>' +
          '<span class="dlib-col-desc">' + esc(c.desc) + '</span>' +
        '</span>' +
        '<span class="dlib-col-go" aria-hidden="true">→</span>' +
      '</button>';
    }).join('');
    wrap.querySelectorAll('[data-col]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = cols[+b.getAttribute('data-col')];
        if (c && typeof c.go === 'function') c.go();
      });
    });
  }

  // ── Type filter chips ───────────────────────────────────────────────────────
  function renderTypeChips() {
    var wrap = document.getElementById('dlib-type-chips');
    if (!wrap || !_index) return;
    var counts = {}; _index.forEach(function (it) { counts[it.type] = (counts[it.type] || 0) + 1; });
    var chips = [{ key: 'all', label: 'Everything', n: _index.length }];
    ['spotlight', 'receipt', 'mandate', 'bill', 'contract'].forEach(function (t) {
      if (counts[t]) chips.push({ key: t, label: TYPES[t].icon + ' ' + TYPES[t].plural, n: counts[t] });
    });
    wrap.innerHTML = chips.map(function (c) {
      return '<button type="button" class="dlib-chip' + (_state.type === c.key ? ' is-active' : '') +
        '" data-type="' + c.key + '">' + esc(c.label) + ' <span class="dlib-chip-n">' + c.n + '</span></button>';
    }).join('');
    wrap.querySelectorAll('[data-type]').forEach(function (b) {
      b.addEventListener('click', function () {
        _state.type = b.getAttribute('data-type') || 'all'; _state.shown = PAGE;
        syncChips(); applyBrowse();
      });
    });
  }
  function syncChips() {
    var wrap = document.getElementById('dlib-type-chips');
    if (wrap) wrap.querySelectorAll('[data-type]').forEach(function (b) {
      b.classList.toggle('is-active', (b.getAttribute('data-type') || 'all') === _state.type);
    });
  }

  // ── Issue filter <select> ─────────────────────────────────────────────────────
  function renderIssueFilter() {
    var sel = document.getElementById('dlib-issue-filter');
    if (!sel || !_index) return;
    var counts = {};
    _index.forEach(function (it) { (it.issueKeys || []).forEach(function (k) { if (k) counts[k] = (counts[k] || 0) + 1; }); });
    var keys = Object.keys(counts).sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
    sel.innerHTML = '<option value="">All issues</option>' + keys.map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(issueLabel(k)) + ' (' + counts[k] + ')</option>';
    }).join('');
    if (!sel._dlibWired) {
      sel._dlibWired = true;
      sel.addEventListener('change', function () { _state.issue = sel.value || ''; _state.shown = PAGE; applyBrowse(); });
    }
  }

  // ── The archive card ──────────────────────────────────────────────────────────
  function cardHtml(it) {
    var tm = TYPES[it.type] || { icon: '📄', label: it.type };
    var badge = '<span class="dlib-badge dlib-b-' + it.type + '">' + tm.icon + ' ' + esc(tm.label) + '</span>';
    var verdict = '';
    if (it.type === 'receipt' && it.verdict) {
      try {
        var rc = G('PDXReceipts');
        // Reuse the receipt verdict wording if available; otherwise a plain chip.
      } catch (e) {}
    }
    var tags = (it.issueKeys || []).slice(0, 2).map(function (k) {
      return '<span class="dlib-tag">' + esc(issueLabel(k)) + '</span>';
    }).join('');
    return '<button type="button" class="dlib-card" data-id="' + esc(it.id) + '" aria-label="Open: ' + esc(it.title) + '">' +
      '<span class="dlib-card-top">' + badge + (it.sub ? '<span class="dlib-card-sub">' + esc(it.sub) + '</span>' : '') + '</span>' +
      '<span class="dlib-card-title">' + esc(it.title) + '</span>' +
      (it.blurb ? '<span class="dlib-card-blurb">' + esc(it.blurb) + '</span>' : '') +
      (tags ? '<span class="dlib-card-tags">' + tags + '</span>' : '') +
    '</button>';
  }

  function matches(it) {
    if (_state.type !== 'all' && it.type !== _state.type) return false;
    if (_state.issue && (it.issueKeys || []).indexOf(_state.issue) < 0) return false;
    if (_state.q) {
      var terms = _state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (it.hay.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }

  function applyBrowse() {
    var grid = document.getElementById('dlib-grid');
    var count = document.getElementById('dlib-count');
    var empty = document.getElementById('dlib-empty');
    var more = document.getElementById('dlib-more');
    if (!grid || !_index) return;
    var list = _index.filter(matches);
    var slice = list.slice(0, _state.shown);
    grid.innerHTML = slice.map(cardHtml).join('');
    grid.querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { var fn = _openMap[b.getAttribute('data-id')]; if (fn) fn(); });
    });
    if (count) count.textContent = list.length
      ? ('Showing ' + slice.length + ' of ' + list.length + ' archive items')
      : '';
    if (empty) empty.hidden = list.length !== 0;
    if (more) more.hidden = list.length <= _state.shown;
    tagCardTypes();
  }

  // ── Cross-source "jump to" search (politicians, issues, evidence) ────────────
  function runJump(q) {
    var wrap = document.getElementById('dlib-jump');
    if (!wrap) return;
    q = String(q || '').trim();
    if (q.length < 2) { wrap.hidden = true; wrap.innerHTML = ''; return; }
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var groups = [];

    // Politicians → their profile carries stances + voting record.
    try {
      var data = G('CMP_DATA') || G('PROFILES') || {};
      var pols = [];
      Object.keys(data).forEach(function (id) {
        if (pols.length >= 6) return;
        var d = data[id]; if (!d || !d.name) return;
        var hay = (d.name + ' ' + (d.office || '') + ' ' + (d.state || '') + ' ' + (d.district || '')).toLowerCase();
        if (terms.every(function (t) { return hay.indexOf(t) !== -1; })) pols.push({ id: id, d: d });
      });
      if (pols.length) groups.push({ head: '🏛 Politicians', items: pols.map(function (p) {
        var sub = [p.d.office, p.d.state].filter(Boolean).join(' · ');
        return { label: p.d.name, sub: sub, go: function () { if (typeof window.showProfile === 'function') window.showProfile(p.id); } };
      }) });
    } catch (e) {}

    // Issues → the ranked issue view.
    try {
      var iv = G('PDXIssueView');
      if (iv && typeof iv.searchIssues === 'function') {
        var iss = iv.searchIssues(q, 4) || [];
        if (iss.length) groups.push({ head: '🧭 Issues', items: iss.map(function (o) {
          var key = o.key || o.issueKey || o;
          var label = o.label || issueLabel(key);
          return { label: label, sub: 'See who’s consistent', go: function () { iv.open(key); } };
        }) });
      }
    } catch (e) {}

    // Evidence Locker → run the exact query in the Locker's own search.
    groups.push({ head: '📂 Evidence Locker', items: [{
      label: 'Search the Locker for “' + q + '”', sub: 'Every matching receipt',
      go: function () { if (typeof window._pdxOpenEvidenceLocker === 'function') window._pdxOpenEvidenceLocker({ search: q }); else location.hash = '#evidence-locker'; }
    }] });

    var html = groups.map(function (g, gi) {
      return '<div class="dlib-jump-group"><div class="dlib-jump-head">' + esc(g.head) + '</div>' +
        g.items.map(function (it, ii) {
          return '<button type="button" class="dlib-jump-item" data-g="' + gi + '" data-i="' + ii + '">' +
            '<span class="dlib-jump-lb">' + esc(it.label) + '</span>' +
            (it.sub ? '<span class="dlib-jump-sub">' + esc(it.sub) + '</span>' : '') + '</button>';
        }).join('') + '</div>';
    }).join('');
    wrap.innerHTML = '<div class="dlib-jump-inner">' + html + '</div>';
    wrap.hidden = false;
    wrap.querySelectorAll('[data-g]').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = groups[+b.getAttribute('data-g')]; if (!g) return;
        var it = g.items[+b.getAttribute('data-i')]; if (it && typeof it.go === 'function') it.go();
      });
    });
  }

  function onSearch(q) {
    _state.q = String(q || '').trim();
    _state.shown = PAGE;
    var clear = document.getElementById('dlib-search-clear');
    if (clear) clear.hidden = !_state.q;
    runJump(_state.q);
    applyBrowse();
  }

  function injectCss() {
    if (document.getElementById('dlib-css')) return;
    var css =
      '#digital-library{scroll-margin-top:80px;}' +
      '.dlib-shell{max-width:75rem;margin:0 auto;padding:0 1rem;}' +
      '.dlib-head{text-align:center;margin-bottom:1.4rem;}' +
      '.dlib-eyebrow{display:inline-flex;align-items:center;gap:.45rem;font:700 .7rem/1 "Barlow Condensed",sans-serif;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#7fb4ff;background:rgba(96,165,250,.1);' +
        'border:1px solid rgba(96,165,250,.28);border-radius:999px;padding:.35rem .85rem;margin-bottom:.75rem;}' +
      '.dlib-title{font:800 clamp(1.9rem,5vw,3rem)/1 "Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.03em;color:#fff;margin:0 0 .4rem;}' +
      '.dlib-sub{font:500 .95rem/1.55 "Barlow",sans-serif;color:#9fb4d4;max-width:42rem;margin:0 auto;}' +
      '.dlib-searchbar{display:flex;align-items:center;gap:.55rem;max-width:40rem;margin:1.3rem auto .4rem;' +
        'background:rgba(10,15,30,.7);border:1px solid rgba(159,180,212,.28);border-radius:.9rem;padding:.7rem 1rem;}' +
      '.dlib-searchbar:focus-within{border-color:rgba(96,165,250,.55);box-shadow:0 0 0 3px rgba(96,165,250,.12);}' +
      '.dlib-search-ico{color:#6d84a8;flex-shrink:0;font-size:1rem;}' +
      '.dlib-searchbar input{flex:1;background:transparent;border:0;outline:0;color:#e6eefc;font:500 1rem/1.2 "Barlow",sans-serif;min-width:0;}' +
      '.dlib-searchbar input::placeholder{color:#6d84a8;}' +
      '.dlib-search-clear{flex-shrink:0;background:none;border:0;color:#8aa0c4;font-size:1.2rem;cursor:pointer;line-height:1;padding:0 .2rem;}' +
      '.dlib-search-clear:hover{color:#fff;}' +
      '.dlib-jump{max-width:40rem;margin:0 auto 1rem;}' +
      '.dlib-jump-inner{background:rgba(13,21,38,.92);border:1px solid rgba(159,180,212,.2);border-radius:.9rem;padding:.6rem;box-shadow:0 14px 40px rgba(0,0,0,.4);}' +
      '.dlib-jump-group{padding:.25rem;}' +
      '.dlib-jump-head{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#7d97bd;padding:.35rem .5rem;}' +
      '.dlib-jump-item{display:flex;flex-direction:column;gap:.1rem;width:100%;text-align:left;cursor:pointer;' +
        'background:none;border:0;border-radius:.55rem;padding:.5rem .6rem;transition:background .12s;}' +
      '.dlib-jump-item:hover{background:rgba(96,165,250,.14);}' +
      '.dlib-jump-lb{font:600 .88rem/1.2 "Barlow",sans-serif;color:#eaf1fd;}' +
      '.dlib-jump-sub{font:500 .7rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '.dlib-section-head{display:flex;align-items:baseline;gap:.6rem;margin:2rem 0 .9rem;}' +
      '.dlib-section-head h3{font:700 1.15rem/1 "Barlow Condensed",sans-serif;letter-spacing:.02em;color:#fff;margin:0;text-transform:uppercase;}' +
      '.dlib-section-head span{font:500 .82rem/1.3 "Barlow",sans-serif;color:#8aa0c4;}' +
      '.dlib-collections{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(15.5rem,1fr));}' +
      '.dlib-col{display:flex;align-items:center;gap:.75rem;text-align:left;width:100%;cursor:pointer;' +
        'background:linear-gradient(150deg,rgba(19,29,52,.9),rgba(13,21,38,.92));border:1px solid rgba(159,180,212,.16);' +
        'border-radius:.85rem;padding:.85rem .9rem;transition:transform .15s,border-color .15s,box-shadow .15s;}' +
      '.dlib-col:hover{transform:translateY(-2px);border-color:rgba(96,165,250,.45);box-shadow:0 10px 26px rgba(0,0,0,.32);}' +
      '.dlib-col:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;}' +
      '.dlib-col-ico{font-size:1.5rem;line-height:1;flex-shrink:0;}' +
      '.dlib-col-body{flex:1;min-width:0;}' +
      '.dlib-col-top{display:flex;align-items:center;gap:.45rem;}' +
      '.dlib-col-label{font:700 .95rem/1.1 "Barlow Condensed",sans-serif;letter-spacing:.02em;color:#fff;}' +
      '.dlib-col-n{font:800 .6rem/1 "Barlow Condensed",sans-serif;color:#0a0f1e;background:#7fb4ff;border-radius:999px;padding:.15rem .4rem;}' +
      '.dlib-col-desc{display:block;font:500 .76rem/1.35 "Barlow",sans-serif;color:#9fb4d4;margin-top:.15rem;}' +
      '.dlib-col-go{color:#5f7da6;font-size:1.1rem;flex-shrink:0;transition:transform .15s,color .15s;}' +
      '.dlib-col:hover .dlib-col-go{color:#7fb4ff;transform:translateX(3px);}' +
      '.dlib-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem;}' +
      '.dlib-chip{display:inline-flex;align-items:center;gap:.32rem;cursor:pointer;font:700 .72rem/1 "Barlow Condensed",sans-serif;' +
        'letter-spacing:.03em;color:#a9bbd6;background:rgba(159,180,212,.07);border:1px solid rgba(159,180,212,.2);' +
        'border-radius:999px;padding:.4rem .7rem;transition:background .15s,border-color .15s,color .15s;}' +
      '.dlib-chip:hover{background:rgba(159,180,212,.14);color:#e6eefc;}' +
      '.dlib-chip.is-active{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.55);color:#9ec8ff;}' +
      '.dlib-chip-n{font-size:.62rem;opacity:.7;font-weight:800;}' +
      '.dlib-filters{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.6rem;}' +
      '.dlib-filters label{font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8aa0c4;display:inline-flex;align-items:center;gap:.45rem;}' +
      '.dlib-filters select{background:rgba(10,15,30,.7);color:#e6eefc;border:1px solid rgba(159,180,212,.24);border-radius:.55rem;padding:.4rem .6rem;font:500 .82rem/1 "Barlow",sans-serif;max-width:100%;}' +
      '.dlib-count{font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7d97bd;margin:.1rem 0 .8rem;}' +
      '.dlib-grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));}' +
      '.dlib-card{display:flex;flex-direction:column;gap:.4rem;text-align:left;width:100%;height:100%;cursor:pointer;' +
        'background:linear-gradient(160deg,rgba(18,28,48,.85),rgba(11,18,33,.92));border:1px solid rgba(159,180,212,.14);' +
        'border-left:3px solid rgba(96,165,250,.5);border-radius:.8rem;padding:.85rem .9rem;transition:transform .15s,border-color .15s,box-shadow .15s;}' +
      '.dlib-card:hover{transform:translateY(-2px);border-color:rgba(96,165,250,.4);box-shadow:0 10px 26px rgba(0,0,0,.32);}' +
      '.dlib-card:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;}' +
      '.dlib-card.dlib-t-receipt{border-left-color:rgba(245,200,66,.7);}' +
      '.dlib-card.dlib-t-mandate{border-left-color:rgba(192,132,252,.7);}' +
      '.dlib-card.dlib-t-bill{border-left-color:rgba(74,222,128,.7);}' +
      '.dlib-card.dlib-t-contract{border-left-color:rgba(126,224,192,.7);}' +
      '.dlib-card-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;}' +
      '.dlib-badge{font:800 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;' +
        'border-radius:.4rem;padding:.22rem .45rem;color:#bcd0f0;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.3);white-space:nowrap;}' +
      '.dlib-b-receipt{color:#f6d873;background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.4);}' +
      '.dlib-b-mandate{color:#dcc3fb;background:rgba(192,132,252,.14);border-color:rgba(192,132,252,.4);}' +
      '.dlib-b-bill{color:#9ff0bd;background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.35);}' +
      '.dlib-b-contract{color:#a5ecd6;background:rgba(126,224,192,.12);border-color:rgba(126,224,192,.35);}' +
      '.dlib-card-sub{font:600 .64rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.dlib-card-title{font:700 .98rem/1.22 "Barlow Condensed",sans-serif;color:#fff;}' +
      '.dlib-card-blurb{font:500 .78rem/1.42 "Barlow",sans-serif;color:#9fb4d4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.dlib-card-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:auto;padding-top:.15rem;}' +
      '.dlib-tag{font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;' +
        'background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.16);border-radius:999px;padding:.2rem .45rem;}' +
      '.dlib-empty{text-align:center;color:#8aa0c4;font:500 .9rem/1.5 "Barlow",sans-serif;padding:2rem 1rem;}' +
      '.dlib-more-wrap{text-align:center;margin-top:1.2rem;}' +
      '.dlib-more{cursor:pointer;font:700 .8rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;' +
        'color:#9ec8ff;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.35);border-radius:999px;padding:.65rem 1.4rem;transition:background .15s,border-color .15s;}' +
      '.dlib-more:hover{background:rgba(96,165,250,.2);border-color:rgba(96,165,250,.6);}' +
      '@media (max-width:640px){.dlib-grid{grid-template-columns:1fr;}.dlib-collections{grid-template-columns:1fr;}}';
    var st = document.createElement('style');
    st.id = 'dlib-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // Add the type class to each card after render (kept out of the template string
  // so the class list stays readable).
  function tagCardTypes() {
    var grid = document.getElementById('dlib-grid');
    if (!grid) return;
    grid.querySelectorAll('.dlib-card[data-id]').forEach(function (b) {
      var id = b.getAttribute('data-id') || '';
      var pfx = id.split(':')[0];
      var t = pfx === 'sp' ? 'spotlight' : pfx === 'rc' ? 'receipt' : pfx === 'md' ? 'mandate' : pfx === 'bill' ? 'bill' : pfx === 'gc' ? 'contract' : '';
      if (t) b.classList.add('dlib-t-' + t);
    });
  }

  function render() {
    var host = document.getElementById('digital-library');
    if (!host) return false;
    // Require at least the spotlight registry to be present so the archive isn't empty.
    var sp = G('PDXSpotlight');
    if (!sp || typeof sp.list !== 'function' || !(sp.list() || []).length) return false;

    injectCss();
    _index = buildIndex();
    renderCollections();
    renderTypeChips();
    renderIssueFilter();

    var input = document.getElementById('dlib-search');
    if (input && !input._dlibWired) {
      input._dlibWired = true;
      input.addEventListener('input', function () { onSearch(input.value); });
    }
    var clear = document.getElementById('dlib-search-clear');
    if (clear && !clear._dlibWired) {
      clear._dlibWired = true;
      clear.addEventListener('click', function () {
        if (input) input.value = '';
        onSearch('');
        if (input) input.focus();
      });
    }
    var more = document.getElementById('dlib-more');
    if (more && !more._dlibWired) {
      more._dlibWired = true;
      more.addEventListener('click', function () { _state.shown += PAGE; applyBrowse(); });
    }
    applyBrowse();
    _built = true;
    return true;
  }

  function boot(tries) {
    if (render()) return;
    if (tries > 50) return;
    setTimeout(function () { boot((tries || 0) + 1); }, 250);
  }

  window.PDXDigitalLibrary = {
    render: render,
    search: function (q) {
      if (!_built) render();
      var input = document.getElementById('dlib-search');
      if (input) input.value = q || '';
      onSearch(q || '');
    },
    focus: function (opts) {
      opts = opts || {};
      if (!_built) render();
      if (opts.type) { _state.type = opts.type; syncChips(); }
      if (typeof opts.issue === 'string') { _state.issue = opts.issue; var sel = document.getElementById('dlib-issue-filter'); if (sel) sel.value = opts.issue; }
      if (typeof opts.q === 'string') { var input = document.getElementById('dlib-search'); if (input) input.value = opts.q; onSearch(opts.q); }
      else applyBrowse();
      var host = document.getElementById('digital-library');
      if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else { boot(0); }

  // Run 3 perf: the Spotlight registry now loads on demand (pdx-lazy-data.js).
  // Rebuild the archive the moment it arrives, in case the visitor scrolled the
  // Digital Library into view after the boot() retry window closed.
  document.addEventListener('pdx:data:spotlights', function () {
    try { _built = false; render(); } catch (e) {}
  });
})();
