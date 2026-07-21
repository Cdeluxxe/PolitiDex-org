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
  var LEG_PAGE = 12;                   // Legislation mode: lazy-load in smaller batches
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
    push('🏛️', 'Major Bills', 'Every bill & omnibus package, vote by vote.', null,
      function () { if (typeof window._pdxDlibSetMode === 'function') { window._pdxDlibSetMode('legislation'); var h = document.getElementById('digital-library'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else if (window.PDXHR1 && window.PDXHR1.open) { window.PDXHR1.open(); } else { location.hash = '#hr1-showcase'; } });
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
    _state.shown = (_state.mode === 'legislation') ? LEG_PAGE : PAGE;
    var clear = document.getElementById('dlib-search-clear');
    if (clear) clear.hidden = !_state.q;
    if (_state.mode === 'legislation') {
      var jump = document.getElementById('dlib-jump');
      if (jump) { jump.hidden = true; jump.innerHTML = ''; }
      applyBills();
      return;
    }
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
      '.dlib-empty:not([hidden]){display:flex;flex-direction:column;align-items:center;gap:.9rem;}' +
      '.dlib-clear-filters{cursor:pointer;font:700 .72rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;' +
        'color:#9ec8ff;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.35);border-radius:999px;padding:.55rem 1.1rem;transition:background .15s,border-color .15s;}' +
      '.dlib-clear-filters:hover{background:rgba(96,165,250,.2);border-color:rgba(96,165,250,.6);}' +
      // Loading skeleton for the Legislation grid (shown before the bill set resolves).
      '.dlib-skel{border:1px solid rgba(159,180,212,.12);border-left:3px solid rgba(74,222,128,.35);border-radius:.7rem;padding:.85rem .9rem;background:rgba(10,15,30,.35);display:flex;flex-direction:column;gap:.55rem;overflow:hidden;}' +
      '.dlib-skel-bar{height:.7rem;border-radius:.35rem;background:linear-gradient(90deg,rgba(159,180,212,.08),rgba(159,180,212,.18),rgba(159,180,212,.08));background-size:200% 100%;animation:dlib-shimmer 1.3s ease-in-out infinite;}' +
      '.dlib-skel-bar.w40{width:40%;}.dlib-skel-bar.w60{width:60%;}.dlib-skel-bar.w85{width:85%;height:1rem;}' +
      '@keyframes dlib-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}' +
      '@media (prefers-reduced-motion:reduce){.dlib-skel-bar{animation:none;}}' +
      '.dlib-more-wrap{text-align:center;margin-top:1.2rem;}' +
      '.dlib-more{cursor:pointer;font:700 .8rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;' +
        'color:#9ec8ff;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.35);border-radius:999px;padding:.65rem 1.4rem;transition:background .15s,border-color .15s;}' +
      '.dlib-more:hover{background:rgba(96,165,250,.2);border-color:rgba(96,165,250,.6);}' +
      // Legislation mode (Phase 1): mode tabs, bill facet bar, bill card chrome.
      '.dlib-modes{display:flex;gap:.4rem;justify-content:center;margin:.2rem auto 1.4rem;flex-wrap:wrap;}' +
      '.dlib-mode{cursor:pointer;font:700 .78rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;' +
        'color:#a9bbd6;background:rgba(159,180,212,.07);border:1px solid rgba(159,180,212,.2);border-radius:999px;padding:.55rem 1.1rem;' +
        'transition:background .15s,border-color .15s,color .15s;}' +
      '.dlib-mode:hover{background:rgba(159,180,212,.14);color:#e6eefc;}' +
      '.dlib-mode.is-active{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.5);color:#9ff0bd;}' +
      '.dlib-billfacets{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.6rem;}' +
      '.dlib-billfacets label{font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8aa0c4;display:inline-flex;align-items:center;gap:.45rem;}' +
      '.dlib-billfacets select{background:rgba(10,15,30,.7);color:#e6eefc;border:1px solid rgba(159,180,212,.24);border-radius:.55rem;padding:.4rem .6rem;font:500 .82rem/1 "Barlow",sans-serif;}' +
      // Quick-jump pills row + the facet/sort row below it.
      '.dlib-jumps{display:flex;flex-wrap:wrap;gap:.4rem;width:100%;margin-bottom:.55rem;}' +
      '.dlib-facet-row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;width:100%;}' +
      '.dlib-jump{cursor:pointer;font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;' +
        'color:#cbd9ec;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.42rem .8rem;' +
        'display:inline-flex;align-items:center;gap:.35rem;transition:background .15s,border-color .15s,color .15s;}' +
      '.dlib-jump:hover{background:rgba(159,180,212,.16);color:#fff;}' +
      '.dlib-jump.is-on{color:#9ff0bd;background:rgba(74,222,128,.16);border-color:rgba(74,222,128,.5);}' +
      '.dlib-jump-n{font-size:.9em;opacity:.8;background:rgba(0,0,0,.2);border-radius:999px;padding:.05rem .35rem;}' +
      '.dlib-sortsel select{background:rgba(10,15,30,.7);color:#e6eefc;border:1px solid rgba(159,180,212,.24);border-radius:.55rem;padding:.4rem .6rem;font:500 .82rem/1 "Barlow",sans-serif;}' +
      // Section-breakdown chips on bill cards (each links to an Issue Spotlight).
      '.dlib-sec-head{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-top:auto;padding-top:.4rem;font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7d97bd;}' +
      '.dlib-sec-chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem;}' +
      '.dlib-sec-chip{cursor:pointer;font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#9ec8ff;' +
        'background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.28);border-radius:.4rem;padding:.24rem .5rem;transition:background .15s,border-color .15s;}' +
      '.dlib-sec-chip:hover{background:rgba(96,165,250,.22);border-color:rgba(96,165,250,.6);}' +
      '.dlib-sec-chip.is-primary{color:#0a0f1e;background:#7fb4ff;border-color:#7fb4ff;}' +
      '.dlib-sec-more{font:600 .58rem/1 "Barlow Condensed",sans-serif;color:#8aa0c4;align-self:center;}' +
      '.dlib-billcard{border-left-color:rgba(74,222,128,.7);}' +
      '.dlib-bill-meta{font:600 .66rem/1.25 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '.dlib-bill-status{font:800 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;border-radius:.4rem;' +
        'padding:.22rem .45rem;white-space:nowrap;color:#9ff0bd;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);}' +
      '.dlib-bs-failed,.dlib-bs-vetoed{color:#fca5a5;background:rgba(248,113,113,.14);border-color:rgba(248,113,113,.4);}' +
      '.dlib-bs-introduced,.dlib-bs-pending{color:#cbd9ec;background:rgba(159,180,212,.12);border-color:rgba(159,180,212,.3);}' +
      '.dlib-bill-omni{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#f6d873;' +
        'background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.35);border-radius:999px;padding:.2rem .45rem;}' +
      // Category label + omnibus / megabill tier badges + tiered card accents.
      '.dlib-bill-tagrow{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;}' +
      '.dlib-bill-cat{display:inline-flex;align-items:center;gap:.25rem;font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--cat,#9ec8ff);background:rgba(159,180,212,.06);border:1px solid var(--cat,rgba(159,180,212,.3));border-radius:999px;padding:.22rem .55rem;}' +
      '.dlib-bill-tier{font:800 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;border-radius:.4rem;padding:.24rem .5rem;white-space:nowrap;}' +
      '.dlib-tier-omni{color:#f6d873;background:rgba(245,200,66,.14);border:1px solid rgba(245,200,66,.4);}' +
      '.dlib-tier-mega{color:#0a0f1e;background:linear-gradient(90deg,#fbbf24,#f6d873);border:1px solid rgba(245,200,66,.65);box-shadow:0 0 10px rgba(245,200,66,.3);}' +
      '.dlib-billcard--omni{border-left-color:#f6d873;}' +
      '.dlib-billcard--mega{border-left-color:#fbbf24;background:linear-gradient(160deg,rgba(46,37,12,.55),rgba(11,18,33,.92));box-shadow:inset 0 0 0 1px rgba(245,200,66,.18),0 10px 26px rgba(0,0,0,.3);}' +
      '.dlib-billcard--mega:hover{border-color:rgba(245,200,66,.5);}' +
      // Topic quick-filter chips (facet bar).
      '.dlib-topics{display:flex;flex-wrap:wrap;gap:.4rem;width:100%;margin-bottom:.55rem;}' +
      '.dlib-topic{cursor:pointer;font:700 .66rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbd9ec;background:rgba(159,180,212,.07);border:1px solid rgba(159,180,212,.2);border-radius:999px;padding:.4rem .75rem;display:inline-flex;align-items:center;gap:.3rem;transition:background .15s,border-color .15s,color .15s;}' +
      '.dlib-topic:hover{background:rgba(159,180,212,.15);color:#fff;}' +
      '.dlib-topic.is-on{color:#0a0f1e;background:var(--cat,#7fb4ff);border-color:var(--cat,#7fb4ff);}' +
      '.dlib-topic-n{font-size:.85em;opacity:.75;background:rgba(0,0,0,.15);border-radius:999px;padding:.03rem .32rem;}' +
      // Follow star on bill cards + the "Followed" facet toggle.
      '.dlib-bill-follow{margin-left:auto;cursor:pointer;font-size:1.05rem;line-height:1;color:#8aa0c4;padding:0 .1rem;user-select:none;transition:color .15s,transform .12s;}' +
      '.dlib-bill-follow:hover{color:#f6d873;transform:scale(1.15);}' +
      '.dlib-bill-follow.is-on{color:#f6d873;}' +
      '.dlib-bf-follow{cursor:pointer;}' +
      '.dlib-bf-follow input{vertical-align:-1px;margin-right:.2rem;}' +
      // In Legislation mode, hide the Explore-only chrome; the facet bar shows instead.
      '.dlib-mode-legislation #dlib-head-collections,.dlib-mode-legislation #dlib-collections,' +
        '.dlib-mode-legislation #dlib-type-chips,.dlib-mode-legislation .dlib-filters,' +
        '.dlib-mode-legislation #dlib-jump{display:none !important;}' +
      '@media (max-width:640px){.dlib-grid{grid-template-columns:1fr;}.dlib-collections{grid-template-columns:1fr;}' +
        '.dlib-billfacets{gap:.5rem;}.dlib-billfacets label{width:100%;justify-content:space-between;}' +
        '.dlib-billfacets select{flex:1;min-width:0;max-width:60%;}.dlib-bf-follow{width:auto !important;}}';
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

  // ═══ Legislation mode (Phase 1) ═══════════════════════════════════════════
  // A second browse mode over window.PDXBills (the Voting Record /measures route).
  // Reuses the shared search box, grid, count, empty state and "show more"; adds a
  // bill-specific card and a congress/chamber/status/issue facet bar. The whole
  // library is unchanged while mode === 'library'.
  var BILL_STATUS = {
    introduced: 'Introduced', passed_house: 'Passed House', passed_senate: 'Passed Senate',
    enacted: 'Enacted', failed: 'Failed', vetoed: 'Vetoed', pending: 'Pending'
  };
  var _billFilters = { congress: '', chamber: '', status: '', issue: '', category: '', followed: false, phase: '' };
  var _billSort = 'recent';   // recent | oldest | number | status
  var _bills = null;          // full loaded bill set (filtered client-side for snap)
  var _billsLoading = false;

  // Quick-jump presets over the same set: "phase" of a bill's life. Active = still
  // moving; Upcoming = introduced/pending (not yet through a chamber); Enacted = law.
  var BILL_MOVING = { introduced: 1, passed_house: 1, passed_senate: 1, pending: 1 };
  var BILL_UPCOMING = { introduced: 1, pending: 1 };
  function billInPhase(b, phase) {
    if (phase === 'active') return !!BILL_MOVING[b.status];
    if (phase === 'upcoming') return !!BILL_UPCOMING[b.status];
    if (phase === 'enacted') return b.status === 'enacted';
    return true;
  }
  // Sort helpers. `introducedAt` (ISO) arrives on the live list; fall back to congress.
  function billDateVal(b) {
    var t = b.introducedAt ? Date.parse(b.introducedAt) : NaN;
    if (!isNaN(t)) return t;
    return (Number(b.congress) || 0) * 1e10; // coarse fallback keeps newer congresses first
  }
  function billNumberVal(b) {
    var m = String(b.number || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  }
  // Progress rank for the "Status" sort — furthest-along first.
  var BILL_PROGRESS = { enacted: 6, passed_senate: 5, passed_house: 4, pending: 3, introduced: 2, failed: 1, vetoed: 1 };
  function billSortCmp(a, b) {
    if (_billSort === 'number') {
      return billNumberVal(a) - billNumberVal(b) || String(a.number || '').localeCompare(String(b.number || ''));
    }
    if (_billSort === 'status') {
      return (BILL_PROGRESS[b.status] || 0) - (BILL_PROGRESS[a.status] || 0) || billDateVal(b) - billDateVal(a);
    }
    var d = billDateVal(b) - billDateVal(a); // recent (newest first) by default
    if (_billSort === 'oldest') d = -d;
    return d || String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
  }

  function billStatusLabel(s) { return BILL_STATUS[s] || (s ? String(s).replace(/_/g, ' ') : ''); }
  function billChamberLabel(c) {
    return c === 'house' ? 'House' : c === 'senate' ? 'Senate' : c === 'joint' ? 'Joint' : c === 'court' ? 'Court' : (c || '');
  }

  // ── Topic categories ────────────────────────────────────────────────────────
  // Group the fine-grained issue keys into a handful of scannable topics, each with
  // an icon + accent color. Powers the card category label and the one-tap topic
  // filter. Additive: a key not listed here simply has no category (no chip shown).
  var ISSUE_CAT = {
    economy:    { label: 'Economy & Taxes', icon: '💰', color: '#4ade80', keys: ['lower_taxes', 'tax_middle_class', 'cost_living', 'econ_workers', 'econ_corp_account', 'econ_trade', 'econ_balance', 'econ_growth', 'econ_smallbiz', 'tariffs_authority', 'tariffs_prices', 'tariffs_china', 'tariffs_growth', 'prop_tax', 'property_tax'] },
    spending:   { label: 'Spending & Debt', icon: '🏛️', color: '#f6d873', keys: ['national_debt', 'cut_spending', 'gov_services', 'gov_waste', 'audit_spending'] },
    health:     { label: 'Health Care', icon: '🩺', color: '#f472b6', keys: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_drug_prices', 'health_mental', 'health_balance', 'health_rural', 'medical_freedom'] },
    immigration:{ label: 'Immigration', icon: '🛂', color: '#fb923c', keys: ['border_security', 'deportations', 'immigration_reform', 'immig_fentanyl', 'immig_balance', 'immig_legal'] },
    energy:     { label: 'Energy & Environment', icon: '⚡', color: '#22d3ee', keys: ['energy_production', 'enviro_energy', 'climate_action', 'enviro_balance', 'lands_energy', 'lands_balance', 'lands_keep_public', 'lands_local', 'lands_preserve', 'water', 'water_storage', 'disaster_resilience'] },
    defense:    { label: 'Defense & Foreign', icon: '🛡️', color: '#93b4d6', keys: ['strong_defense', 'restraint', 'foreign_balance', 'america_first', 'america_first_fp', 'veterans'] },
    elections:  { label: 'Elections & Democracy', icon: '🗳️', color: '#a78bfa', keys: ['election_integrity', 'voter_id', 'voting_access', 'democracy_balance', 'gov_balance', 'campaign_finance', 'term_limits'] },
    government: { label: 'Government & Reform', icon: '⚖️', color: '#9ec8ff', keys: ['gov_regulation', 'reform_balance', 'end_dei', 'stock_trading_ban', 'scotus_reform', 'gov_transparency'] },
    education:  { label: 'Education', icon: '🎓', color: '#60a5fa', keys: ['public_schools', 'edu_balance', 'edu_college_cost', 'school_choice', 'edu_parental'] },
    tech:       { label: 'Technology', icon: '💻', color: '#5eead4', keys: ['tech_balance', 'tech_innovation', 'privacy_rights', 'free_speech', 'broadband', 'datacenter_growth', 'datacenter_power', 'datacenter_water'] },
    justice:    { label: 'Justice & Crime', icon: '🚔', color: '#fca5a5', keys: ['tough_on_crime', 'back_police', 'justice_reform', 'justice_balance', 'gun_rights', 'gun_safety', 'gun_balance', 'cannabis_reform'] },
    social:     { label: 'Family & Rights', icon: '👪', color: '#fbbf24', keys: ['family_support', 'child_care', 'paid_leave', 'housing', 'housing_build', 'housing_first_time', 'housing_support', 'homeless', 'pro_life', 'pro_choice', 'repro_balance', 'lgbtq_rights', 'religious_liberty', 'rights_balance', 'property_rights'] },
    rural:      { label: 'Agriculture & Rural', icon: '🌾', color: '#a3e635', keys: ['rural_ag'] }
  };
  var ISSUE_CAT_ORDER = ['economy', 'spending', 'health', 'immigration', 'energy', 'defense', 'elections', 'government', 'education', 'tech', 'justice', 'social', 'rural'];
  var _issueCatIndex = null;
  function issueCatOf(key) {
    if (!key) return null;
    if (!_issueCatIndex) {
      _issueCatIndex = {};
      ISSUE_CAT_ORDER.forEach(function (c) { ISSUE_CAT[c].keys.forEach(function (k) { if (!_issueCatIndex[k]) _issueCatIndex[k] = c; }); });
    }
    return _issueCatIndex[key] || null;
  }
  // The bill's headline category (from its primary issue), for the card label.
  function billCategory(b) {
    var keys = (b.issueKeys || []).filter(Boolean);
    var c = issueCatOf(b.primaryIssue || keys[0] || '');
    for (var i = 0; i < keys.length && !c; i++) c = issueCatOf(keys[i]);
    return c ? { key: c, label: ISSUE_CAT[c].label, icon: ISSUE_CAT[c].icon, color: ISSUE_CAT[c].color } : null;
  }
  // Every category a bill touches — for the topic filter.
  function billCatSet(b) {
    var s = {};
    (b.issueKeys || []).forEach(function (k) { var c = issueCatOf(k); if (c) s[c] = 1; });
    var p = issueCatOf(b.primaryIssue); if (p) s[p] = 1;
    return s;
  }
  // Omnibus / flagship classification for special styling. 'mega' = flagship megabill
  // (H.R. 1) or a bill bundling 6+ issues; 'omni' = any multi-issue bill; '' = focused.
  function billTier(b) {
    var n = (b.issueKeys || []).filter(Boolean).length;
    var isFlagship = /^h\.?\s*r\.?\s*1$/i.test(String(b.number || '').trim()) || b.flagship === true;
    if (isFlagship || n >= 6) return 'mega';
    if (b.isOmnibus || n >= 2) return 'omni';
    return '';
  }

  // Load the bill set once — inline light index for instant paint, then the live
  // list (which replaces it). Facet/search changes filter this set client-side.
  function loadBills() {
    var bills = G('PDXBills');
    if (!bills) { _bills = _bills || []; renderBillFacets(); applyBills(); return; }
    if (!_bills) {
      bills.ensureIndex().then(function () {
        if (_state.mode !== 'legislation' || _bills) return;
        _bills = (bills.listSync().items) || [];
        renderBillFacets(); applyBills();
      });
    }
    if (!_billsLoading) {
      _billsLoading = true;
      bills.list({ pageSize: 100, sort: 'recent' }).then(function (d) {
        _billsLoading = false;
        _bills = (d && d.items) ? d.items : (_bills || []);
        if (_state.mode === 'legislation') { renderBillFacets(); applyBills(); }
      });
    } else {
      applyBills();
    }
  }

  function billIsFollowed(b) {
    try { var api = G('PDXBills'); return !!(api && api.isFollowed && api.isFollowed(b)); } catch (e) { return false; }
  }
  function billMatches(b) {
    if (_billFilters.followed && !billIsFollowed(b)) return false;
    if (_billFilters.phase && !billInPhase(b, _billFilters.phase)) return false;
    if (_billFilters.congress && String(b.congress) !== String(_billFilters.congress)) return false;
    if (_billFilters.chamber && b.chamber !== _billFilters.chamber) return false;
    if (_billFilters.status && b.status !== _billFilters.status) return false;
    if (_billFilters.issue && (b.issueKeys || []).indexOf(_billFilters.issue) < 0) return false;
    if (_billFilters.category && !billCatSet(b)[_billFilters.category]) return false;
    if (_state.q) {
      var hay = ((b.number || '') + ' ' + (b.title || '') + ' ' + (b.shortTitle || '') + ' ' +
        (b.summary || '') + ' ' + (b.issueKeys || []).map(issueLabel).join(' ')).toLowerCase();
      var terms = _state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }

  function billCardHtml(b) {
    var ref = (b.id != null) ? b.id : b.number;
    var followed = billIsFollowed(b);
    var star = '<span class="dlib-bill-follow' + (followed ? ' is-on' : '') + '" data-follow="' + esc(String(ref)) + '" role="button" tabindex="0" ' +
      'aria-pressed="' + followed + '" aria-label="' + (followed ? 'Unfollow' : 'Follow') + ' this bill" title="' + (followed ? 'Following — click to unfollow' : 'Follow this bill') + '">' + (followed ? '★' : '☆') + '</span>';
    var status = b.status ? '<span class="dlib-bill-status dlib-bs-' + esc(b.status) + '">' + esc(billStatusLabel(b.status)) + '</span>' : '';
    var meta = [billChamberLabel(b.chamber), b.congress ? (b.congress + 'th Congress') : '',
      b.voteCount ? (b.voteCount + ' recorded votes') : ''].filter(Boolean).join(' · ');

    // Section breakdown: each of the bill's issue categories becomes a chip that jumps
    // to that Issue Spotlight. For a true omnibus we lead with a count so the bundled
    // nature reads at a glance.
    var keys = (b.issueKeys || []).filter(Boolean);
    var primary = b.primaryIssue || keys[0] || '';
    // Primary issue first, then the rest, de-duplicated.
    var ordered = [];
    (primary ? [primary] : []).concat(keys).forEach(function (k) { if (k && ordered.indexOf(k) < 0) ordered.push(k); });
    var shownKeys = ordered.slice(0, 5);
    var extra = ordered.length - shownKeys.length;
    var chips = shownKeys.map(function (k, i) {
      var ic = issueCatOf(k);
      var cico = ic ? ISSUE_CAT[ic].icon + ' ' : '';
      return '<button type="button" class="dlib-sec-chip' + (i === 0 && k === primary ? ' is-primary' : '') +
        '" data-issue="' + escAttr(k) + '" title="See the ' + escAttr(issueLabel(k)) + ' spotlight">' +
        cico + esc(issueLabel(k)) + '</button>';
    }).join('') + (extra > 0 ? '<span class="dlib-sec-more">+' + extra + ' more</span>' : '');

    // Omnibus / flagship badge — makes the bundled, high-stakes bills read at a glance.
    var tier = billTier(b);
    var tierBadge = tier === 'mega'
      ? '<span class="dlib-bill-tier dlib-tier-mega" title="A flagship megabill bundling many issues into a single vote">★ MEGABILL</span>'
      : tier === 'omni'
        ? '<span class="dlib-bill-tier dlib-tier-omni" title="An omnibus bill bundling ' + ordered.length + ' issues into one vote">📦 OMNIBUS · ' + ordered.length + '</span>'
        : '';
    // Headline topic category (icon + label), for instant visual grouping.
    var cat = billCategory(b);
    var catChip = cat ? '<span class="dlib-bill-cat" style="--cat:' + cat.color + '">' + cat.icon + ' ' + esc(cat.label) + '</span>' : '';
    var tagrow = (catChip || tierBadge) ? '<span class="dlib-bill-tagrow">' + catChip + tierBadge + '</span>' : '';

    var breakdown = ordered.length
      ? '<span class="dlib-sec-head">' + (ordered.length >= 2 ? 'Breaks into' : 'Focus') + '</span>' +
        '<span class="dlib-sec-chips">' + chips + '</span>'
      : '';

    return '<div class="dlib-card dlib-billcard' + (tier ? ' dlib-billcard--' + tier : '') + '" data-bill="' + esc(String(ref)) + '" role="button" tabindex="0" aria-label="Open bill: ' + esc(b.title) + '">' +
      '<span class="dlib-card-top"><span class="dlib-badge dlib-b-bill">🏛️ ' + esc(b.number || 'Bill') + '</span>' + status + star + '</span>' +
      tagrow +
      '<span class="dlib-card-title">' + esc(b.shortTitle || b.title) + '</span>' +
      (meta ? '<span class="dlib-bill-meta">' + esc(meta) + '</span>' : '') +
      (b.summary ? '<span class="dlib-card-blurb">' + esc(b.summary) + '</span>' : '') +
      breakdown +
    '</div>';
  }

  function renderBillFacets() {
    var wrap = document.getElementById('dlib-bill-facets');
    if (!wrap) return;
    var bills = _bills || [];
    function distinct(fn) { var s = {}; bills.forEach(function (b) { var v = fn(b); if (v != null && v !== '') s[v] = 1; }); return Object.keys(s); }
    var congresses = distinct(function (b) { return b.congress; }).sort(function (a, b) { return b - a; });
    var chambers = distinct(function (b) { return b.chamber; }).sort();
    var statuses = distinct(function (b) { return b.status; }).sort();
    var issues = {}; bills.forEach(function (b) { (b.issueKeys || []).forEach(function (k) { if (k) issues[k] = (issues[k] || 0) + 1; }); });
    var issueKeys = Object.keys(issues).sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
    var followN = 0; try { var api = G('PDXBills'); followN = (api && api.followed) ? (api.followed() || []).length : 0; } catch (e) {}
    function opts(list, cur, labelFn) {
      return '<option value="">All</option>' + list.map(function (v) {
        return '<option value="' + esc(String(v)) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(labelFn(v)) + '</option>';
      }).join('');
    }
    // Quick-jump pills: phase presets + Followed, plus a live count on each.
    var counts = { active: 0, upcoming: 0, enacted: 0 };
    bills.forEach(function (b) {
      if (billInPhase(b, 'active')) counts.active++;
      if (billInPhase(b, 'upcoming')) counts.upcoming++;
      if (b.status === 'enacted') counts.enacted++;
    });
    var isAll = !_billFilters.phase && !_billFilters.followed;
    function jump(key, label, on, n) {
      return '<button type="button" class="dlib-jump' + (on ? ' is-on' : '') + '" data-jump="' + key + '">' +
        label + (n != null ? ' <span class="dlib-jump-n">' + n + '</span>' : '') + '</button>';
    }
    var jumps = '<div class="dlib-jumps" role="group" aria-label="Quick jumps">' +
      jump('all', 'All', isAll) +
      jump('active', '🟢 Currently Active', _billFilters.phase === 'active', counts.active) +
      jump('upcoming', '🔜 Upcoming', _billFilters.phase === 'upcoming', counts.upcoming) +
      jump('enacted', '✅ Enacted', _billFilters.phase === 'enacted', counts.enacted) +
      jump('followed', '★ Followed', _billFilters.followed, followN) +
    '</div>';
    // Topic chips — one-tap filter by broad issue category (scannable + mobile-friendly),
    // complementing the precise Issue dropdown below. A bill matches a topic if any of
    // its issues falls under it, so "Immigration" surfaces every immigration-touching bill.
    var catCounts = {};
    bills.forEach(function (b) { var s = billCatSet(b); Object.keys(s).forEach(function (c) { catCounts[c] = (catCounts[c] || 0) + 1; }); });
    var catList = ISSUE_CAT_ORDER.filter(function (c) { return catCounts[c]; });
    var topics = catList.length
      ? '<div class="dlib-topics" role="group" aria-label="Filter by topic">' +
          '<button type="button" class="dlib-topic dlib-topic-all' + (!_billFilters.category ? ' is-on' : '') + '" data-topic="">🧭 All topics</button>' +
          catList.map(function (c) {
            return '<button type="button" class="dlib-topic' + (_billFilters.category === c ? ' is-on' : '') + '" data-topic="' + c + '" style="--cat:' + ISSUE_CAT[c].color + '">' +
              ISSUE_CAT[c].icon + ' ' + esc(ISSUE_CAT[c].label) + ' <span class="dlib-topic-n">' + catCounts[c] + '</span></button>';
          }).join('') +
        '</div>'
      : '';
    var sortSel = '<label class="dlib-sortsel">Sort <select data-bill-sort>' +
      [['recent', 'Most recent → oldest'], ['oldest', 'Oldest → most recent'], ['number', 'Bill number'], ['status', 'Furthest along']]
        .map(function (o) { return '<option value="' + o[0] + '"' + (_billSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label>';
    wrap.innerHTML =
      jumps +
      topics +
      '<div class="dlib-facet-row">' +
        '<label>Congress <select data-bf="congress">' + opts(congresses, _billFilters.congress, function (v) { return v + 'th'; }) + '</select></label>' +
        '<label>Chamber <select data-bf="chamber">' + opts(chambers, _billFilters.chamber, billChamberLabel) + '</select></label>' +
        '<label>Status <select data-bf="status">' + opts(statuses, _billFilters.status, billStatusLabel) + '</select></label>' +
        '<label>Issue <select data-bf="issue">' + opts(issueKeys, _billFilters.issue, function (k) { return issueLabel(k) + ' (' + issues[k] + ')'; }) + '</select></label>' +
        sortSel +
      '</div>';
    // Delegated facet interactions — attached ONCE to the persistent facet-bar
    // container so they keep working across every innerHTML rebuild. (Re-binding a
    // listener to each freshly-rendered chip is what left topic clicks doing nothing;
    // delegation on the stable parent never misses a click.)
    if (!wrap._dlibFacetWired) {
      wrap._dlibFacetWired = true;
      wrap.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-topic]') : null;
        if (t) {
          var c = t.getAttribute('data-topic') || '';
          _billFilters.category = (_billFilters.category === c) ? '' : c;
          _state.shown = LEG_PAGE; renderBillFacets(); applyBills();
          return;
        }
        var j = e.target.closest ? e.target.closest('[data-jump]') : null;
        if (j) {
          var jk = j.getAttribute('data-jump');
          if (jk === 'all') { _billFilters.phase = ''; _billFilters.followed = false; }
          else if (jk === 'followed') { _billFilters.followed = !_billFilters.followed; }
          else { _billFilters.phase = (_billFilters.phase === jk) ? '' : jk; }
          _state.shown = LEG_PAGE; renderBillFacets(); applyBills();
          return;
        }
      });
      wrap.addEventListener('change', function (e) {
        var bf = e.target.closest ? e.target.closest('[data-bf]') : null;
        if (bf) { _billFilters[bf.getAttribute('data-bf')] = bf.value || ''; _state.shown = LEG_PAGE; applyBills(); return; }
        var sr = e.target.closest ? e.target.closest('[data-bill-sort]') : null;
        if (sr) { _billSort = sr.value || 'recent'; _state.shown = LEG_PAGE; applyBills(); return; }
      });
    }
  }

  // A shimmer skeleton grid shown while the bill set is still resolving, so the tab
  // never flashes an empty or bare "loading" line on open.
  function billSkeletonHtml(n) {
    var one = '<div class="dlib-skel" aria-hidden="true">' +
      '<span class="dlib-skel-bar w40"></span><span class="dlib-skel-bar w85"></span>' +
      '<span class="dlib-skel-bar w60"></span><span class="dlib-skel-bar w40"></span></div>';
    var out = ''; for (var i = 0; i < (n || 6); i++) out += one; return out;
  }

  // Cross-navigation: open the Issue Spotlight / Issue View for a key. Falls back to
  // filtering the Legislation list by that issue so a click always does something.
  function openIssueSpotlight(key) {
    if (!key) return;
    try {
      if (window.PDXIssueView && typeof window.PDXIssueView.open === 'function') {
        window.PDXIssueView.open(key); return;
      }
    } catch (e) {}
    _billFilters.issue = key; _state.shown = LEG_PAGE;
    renderBillFacets(); applyBills();
  }

  // Reset every bill facet + the search box back to the default view.
  function clearBillFilters() {
    _billFilters = { congress: '', chamber: '', status: '', issue: '', category: '', followed: false, phase: '' };
    _billSort = 'recent';
    _state.q = '';
    var input = document.getElementById('dlib-search');
    if (input) input.value = '';
    _state.shown = LEG_PAGE;
    renderBillFacets();
    applyBills();
  }

  function applyBills() {
    var grid = document.getElementById('dlib-grid');
    var count = document.getElementById('dlib-count');
    var empty = document.getElementById('dlib-empty');
    var more = document.getElementById('dlib-more');
    if (!grid) return;
    if (!_bills) {
      grid.innerHTML = billSkeletonHtml(6);
      if (count) count.textContent = 'Loading legislation…';
      if (empty) empty.hidden = true;
      if (more) more.hidden = true;
      return;
    }
    var list = _bills.filter(billMatches).sort(billSortCmp);
    var slice = list.slice(0, _state.shown);
    grid.innerHTML = slice.map(billCardHtml).join('');
    grid.querySelectorAll('[data-bill]').forEach(function (b) {
      var go = function () { var api = G('PDXBills'); if (api && api.open) api.open(b.getAttribute('data-bill')); };
      b.addEventListener('click', function (e) {
        // Clicks on the follow star or a section chip are handled separately; ignore here.
        if (e.target && e.target.closest && (e.target.closest('[data-follow]') || e.target.closest('[data-issue]'))) return;
        go();
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    // Section chips → jump to that Issue Spotlight (falls back to filtering the list).
    grid.querySelectorAll('[data-issue]').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        openIssueSpotlight(chip.getAttribute('data-issue'));
      });
    });
    grid.querySelectorAll('[data-follow]').forEach(function (star) {
      var toggle = function (e) {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        var api = G('PDXBills'); if (!api || !api.toggleFollow) return;
        var ref = star.getAttribute('data-follow');
        // Find the full card object so the stored entry has number/congress/title.
        var card = null; for (var i = 0; i < _bills.length; i++) { var bb = _bills[i]; if (String(bb.id) === ref || bb.number === ref) { card = bb; break; } }
        if (!card) return;
        var on = api.toggleFollow(card);
        star.classList.toggle('is-on', on); star.textContent = on ? '★' : '☆'; star.setAttribute('aria-pressed', String(on));
        if (_billFilters.followed) applyBills(); // fell out of / into the filtered set
      };
      star.addEventListener('click', toggle);
      star.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') toggle(e); });
    });
    if (count) count.textContent = list.length
      ? ('Showing ' + slice.length + ' of ' + list.length + ' bill' + (list.length !== 1 ? 's' : '') + (_billsLoading ? ' · updating…' : ''))
      : '';
    if (empty) {
      empty.hidden = list.length !== 0;
      if (!list.length) {
        var hasFilter = !!(_billFilters.congress || _billFilters.chamber || _billFilters.status ||
          _billFilters.issue || _billFilters.category || _billFilters.followed || _billFilters.phase || _state.q);
        var msg = _billFilters.followed
          ? 'You’re not following any bills yet. Open a bill and tap ☆ Follow to save it here.'
          : 'No legislation matches those filters yet. Clear a facet or broaden your search.';
        empty.innerHTML = '<div>' + msg + '</div>' +
          (hasFilter ? '<button type="button" class="dlib-clear-filters" data-clear-bills>Clear filters</button>' : '');
        var cb = empty.querySelector('[data-clear-bills]');
        if (cb) cb.addEventListener('click', clearBillFilters);
      }
    }
    if (more) more.hidden = list.length <= _state.shown;
  }

  function renderModes() {
    var wrap = document.getElementById('dlib-modes');
    if (!wrap) return;
    var modes = [{ k: 'library', label: '📚 Explore' }, { k: 'legislation', label: '🏛️ Legislation' }];
    wrap.innerHTML = modes.map(function (m) {
      return '<button type="button" role="tab" class="dlib-mode' + (_state.mode === m.k ? ' is-active' : '') +
        '" data-mode="' + m.k + '" aria-selected="' + (_state.mode === m.k) + '">' + m.label + '</button>';
    }).join('');
    wrap.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
  }

  function setMode(mode) {
    if (mode !== 'legislation') mode = 'library';
    if (_state.mode === mode && (mode !== 'legislation' || _bills)) { /* still refresh chrome below */ }
    _state.mode = mode;
    _state.shown = (mode === 'legislation') ? LEG_PAGE : PAGE;
    var host = document.getElementById('digital-library');
    if (host) host.classList.toggle('dlib-mode-legislation', mode === 'legislation');
    var facets = document.getElementById('dlib-bill-facets');
    if (facets) facets.hidden = (mode !== 'legislation');
    renderModes();
    var browseHead = document.getElementById('dlib-head-browse');
    if (browseHead) {
      var h3 = browseHead.querySelector('h3'), sp = browseHead.querySelector('span');
      if (mode === 'legislation') { if (h3) h3.textContent = 'Legislation'; if (sp) sp.textContent = 'Bills & measures — filter by congress, chamber, status or issue'; }
      else { if (h3) h3.textContent = 'Browse the archive'; if (sp) sp.textContent = 'Filter by type or issue'; }
    }
    if (mode === 'legislation') loadBills();
    else applyBrowse();
  }
  window._pdxDlibSetMode = setMode; // small hook for the collection tile + focus()

  function render() {
    var host = document.getElementById('digital-library');
    if (!host) return false;
    // Require at least the spotlight registry to be present so the archive isn't empty.
    var sp = G('PDXSpotlight');
    if (!sp || typeof sp.list !== 'function' || !(sp.list() || []).length) return false;

    injectCss();
    _index = buildIndex();
    renderCollections();
    renderModes();
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
      more.addEventListener('click', function () { _state.shown += (_state.mode === 'legislation' ? LEG_PAGE : PAGE); if (_state.mode === 'legislation') applyBills(); else applyBrowse(); });
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
      if (opts.mode) { setMode(opts.mode); }
      // Legislation-mode deep link: filter the bill hub by issue / phase / sort.
      if (opts.mode === 'legislation') {
        if (typeof opts.issue === 'string') _billFilters.issue = opts.issue;
        if (typeof opts.category === 'string') _billFilters.category = opts.category;
        if (typeof opts.phase === 'string') _billFilters.phase = opts.phase;
        if (typeof opts.sort === 'string') _billSort = opts.sort;
        if (opts.followed === true) _billFilters.followed = true;
        _state.shown = LEG_PAGE;
        loadBills();
        var lhost = document.getElementById('digital-library');
        if (lhost && lhost.scrollIntoView) lhost.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
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

  // Phase 3: when a bill is followed/unfollowed anywhere (e.g. from the detail
  // panel), refresh the Legislation view so stars + the Followed facet stay in sync.
  document.addEventListener('pdx:bills:followed-changed', function () {
    if (_state.mode === 'legislation') { try { renderBillFacets(); applyBills(); } catch (e) {} }
  });
})();
