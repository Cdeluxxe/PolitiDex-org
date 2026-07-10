/* ═══════════════════════════════════════════════════════════════════════════
   STANCE LIBRARY  ·  browse PolitiDex by ISSUE
   ────────────────────────────────────────────────────────────────────────────
   A dedicated, issue-first surface that "connects the dots" between the three
   things the rest of the site keeps in separate places:

       • WHERE POLITICIANS STAND — every documented stance on an issue, grouped
         by the canonical four-state vocabulary (Supported / Opposed / Mixed /
         No Clear Position), read straight from window.ISSUE_STANCE_DATA.
       • THE EVIDENCE — each stance carries its own sourced citation, and every
         card deep-links into the Evidence Locker's per-issue / per-politician
         view (window._pdxOpenEvidenceLocker) so the receipts stay one click away.
       • THE COMMUNITY — the Open Discussion threads linked to the issue, plus a
         one-tap "Discuss this issue" that opens the forum composer pre-tied to
         it (window.PDXForum), so conversation and reform ideas gather per topic.

   IT OWNS NO DATA OF ITS OWN. It is a lens built entirely from globals that
   already exist:
       window.ISSUE_MAP            (issue vocabulary: label, cat, stanceKeys, keywords)
       window.ISSUE_STANCE_DATA    (politician id → [sourced stance cards])
       window.CORE_NATIONAL_ISSUES (curated bundles of issueKeys — the primary filter)
       window.PROFILES             (id → {name, office, party, photo} — display only)
       window.PDXStance            (canonical stance resolve + pill)
       window._pdxIssueCategories / _pdxIssueCategory  (the 19 topic categories)
       window.coreIssueForKey      (issueKey → its core national issue)
       window.openModal            (open a politician profile)
       window._pdxOpenEvidenceLocker / window.PDXForum  (deep-links out)

   Because ISSUE_STANCE_DATA is static (shipped in politician-stances.js) the
   issue index is always available immediately; PROFILES streams in from the
   backend, so the view re-renders once names/photos land. Everything degrades
   gracefully when a global is missing.
   Prefix: `sl` / `_sl`.  Mounts into #stance-library.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MOUNT = 'stance-library';
  var initialized = false;
  var _index = null;          // built lazily: { issueKey: {…aggregate…} }
  var _profilesSig = 0;       // how many PROFILES keys we last rendered with
  var _community = {};        // issueKey → { threads, loaded } cache

  // Single-select filter + free-text query.
  var state = { fkind: 'all', fkey: '', query: '', view: 'browse', issueKey: '' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function G(name) { try { return window[name]; } catch (e) { return null; } }

  // "gage_froerer" → "Gage Froerer" — a safe last resort before PROFILES lands.
  function prettyId(id) {
    return String(id || '').split(/[_\-]/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function polName(id) {
    var f = G('_pdxPoliticianName');
    if (typeof f === 'function') { var n = f(id); if (n && n !== id) return n; }
    var P = G('PROFILES'); if (P && P[id] && P[id].name) return P[id].name;
    return prettyId(id);
  }
  function polMeta(id) {
    var P = G('PROFILES'); return (P && P[id]) ? P[id] : {};
  }

  // Split the leading emoji off an ISSUE_MAP label ("🖥 Data Centers") so we can
  // show a big glyph + clean title. ISSUE_MAP labels are uniformly "<emoji> <text>";
  // if the first space-delimited token carries any non-ASCII char we treat it as
  // the icon, else we fall back to a neutral target glyph.
  function splitLabel(label) {
    label = String(label || '').trim();
    var sp = label.indexOf(' ');
    if (sp > 0) {
      var head = label.slice(0, sp);
      if (/[^\x00-\x7F]/.test(head)) return { icon: head, text: label.slice(sp + 1).trim() };
    }
    return { icon: '🎯', text: label };
  }

  var STANCE_ORDER = [
    { key: 'supported', label: 'Supported',         cls: 'is-support' },
    { key: 'opposed',   label: 'Opposed',           cls: 'is-oppose'  },
    { key: 'mixed',     label: 'Mixed / Nuanced',   cls: 'is-mixed'   },
    { key: 'none',      label: 'No Clear Position',  cls: 'is-none'    }
  ];

  // Resolve one politician's overall stance on an issue from their cards, using
  // the shared PDXStance vocabulary. Multiple cards → if they conflict we say
  // "mixed"; a single clear read wins; sourced-but-unclassifiable ⇒ mixed.
  function combineStance(cards) {
    var PS = G('PDXStance');
    var set = {};
    for (var i = 0; i < cards.length; i++) {
      var s = PS && typeof PS.resolveStance === 'function' ? PS.resolveStance(cards[i]) : 'none';
      if (s && s !== 'none') set[s] = 1;
    }
    var keys = Object.keys(set);
    if (!keys.length) return 'none';
    if (keys.length > 1 || set.mixed) return 'mixed';
    return keys[0];
  }

  // ── Hot Topics (facets) ──────────────────────────────────────────────────
  // The marquee, high-salience clusters. Each is a predicate over the shared
  // ISSUE_MAP entry — matching on the same `cat`, `stanceKeys` and `keywords`
  // fields the Alignment Tool uses — so membership can never drift from the data.
  var HOT_TOPICS = [
    { key: 'dataCenters', label: '🖥 Data Centers & AI', test: function (k, d) { return d.cat === 'dc' || (d.stanceKeys || []).indexOf('dataCenters') !== -1; } },
    { key: 'tariffs',     label: '🏭 Tariffs & Trade',   test: function (k, d) { return /tariff/.test(k) || /tariff|trade deficit|reshor/i.test((d.keywords || []).join(' ')); } },
    { key: 'housing',     label: '🏠 Housing & Costs',   test: function (k, d) { return d.cat === 'housing'; } },
    { key: 'border',      label: '🛡 Immigration',       test: function (k, d) { return d.cat === 'immig' || (d.stanceKeys || []).indexOf('border') !== -1; } },
    { key: 'guns',        label: '⚖️ Guns',              test: function (k, d) { return d.cat === 'guns'; } },
    { key: 'repro',       label: '🕊 Abortion',          test: function (k, d) { return d.cat === 'repro'; } },
    { key: 'healthcare',  label: '🏥 Healthcare Costs',  test: function (k, d) { return d.cat === 'health' || (d.stanceKeys || []).indexOf('healthcare') !== -1; } },
    { key: 'energy',      label: '💧 Energy & Water',    test: function (k, d) { return d.cat === 'enviro' || d.cat === 'land'; } },
    { key: 'elections',   label: '🗳 Elections',         test: function (k, d) { return d.cat === 'democracy' || (d.stanceKeys || []).indexOf('campaign') !== -1; } }
  ];
  function hotTopicsFor(issueKey) {
    var MAP = G('ISSUE_MAP'); var d = (MAP && MAP[issueKey]) || {};
    return HOT_TOPICS.filter(function (h) { try { return h.test(issueKey, d); } catch (e) { return false; } });
  }

  // ── Build the issue index (once, from static stance data) ─────────────────
  // One pass over ISSUE_STANCE_DATA rolls every sourced card up under its
  // issueKey and per politician. The result is pure aggregation — no display
  // strings — so it survives PROFILES arriving later.
  function buildIndex() {
    var MAP = G('ISSUE_MAP'); var DATA = G('ISSUE_STANCE_DATA');
    if (!MAP || !DATA) return null;
    var out = Object.create(null);

    Object.keys(DATA).forEach(function (polId) {
      var cards = DATA[polId]; if (!cards || !cards.length) return;
      cards.forEach(function (card) {
        var k = card && card.issueKey;
        if (!k || !MAP[k]) return;                    // only real ISSUE_MAP issues
        var bucket = out[k] || (out[k] = { key: k, pols: Object.create(null), order: [] });
        var p = bucket.pols[polId];
        if (!p) { p = bucket.pols[polId] = { id: polId, cards: [] }; bucket.order.push(polId); }
        p.cards.push(card);
      });
    });

    // Resolve each politician's overall stance + tally per-issue buckets.
    Object.keys(out).forEach(function (k) {
      var b = out[k]; b.counts = { supported: 0, opposed: 0, mixed: 0, none: 0 };
      b.order.forEach(function (id) {
        var p = b.pols[id]; p.stance = combineStance(p.cards); b.counts[p.stance]++;
      });
      b.total = b.order.length;
    });
    return out;
  }

  function issueMeta(issueKey) {
    var MAP = G('ISSUE_MAP'); var d = (MAP && MAP[issueKey]) || {};
    var sl = splitLabel(d.label || issueKey);
    var catFn = G('_pdxIssueCategory');
    var cat = (typeof catFn === 'function' && d.cat) ? catFn(d.cat) : null;
    var coreFn = G('coreIssueForKey');
    var core = (typeof coreFn === 'function') ? coreFn(issueKey) : null;
    return {
      key: issueKey, icon: sl.icon, title: sl.text,
      catLabel: cat ? cat.label : '', catIcon: cat ? cat.icon : '',
      core: core, keywords: d.keywords || [], lean: d.lean || ''
    };
  }

  // ── Filtering ──────────────────────────────────────────────────────────
  function coreKeysFor(coreKey) {
    var CORE = G('CORE_NATIONAL_ISSUES') || [];
    for (var i = 0; i < CORE.length; i++) if (CORE[i].key === coreKey) return CORE[i].keys || [];
    return [];
  }
  function passesFilter(issueKey) {
    if (state.fkind === 'all') return true;
    if (state.fkind === 'core') return coreKeysFor(state.fkey).indexOf(issueKey) !== -1;
    if (state.fkind === 'cat') { var MAP = G('ISSUE_MAP'); return MAP && MAP[issueKey] && MAP[issueKey].cat === state.fkey; }
    if (state.fkind === 'hot') {
      var h = HOT_TOPICS.filter(function (x) { return x.key === state.fkey; })[0];
      var MAP2 = G('ISSUE_MAP'); var d = (MAP2 && MAP2[issueKey]) || {};
      try { return h ? h.test(issueKey, d) : true; } catch (e) { return false; }
    }
    return true;
  }
  function passesQuery(meta) {
    var q = state.query; if (!q) return true;
    var hay = (meta.title + ' ' + meta.catLabel + ' ' + (meta.core ? meta.core.label : '') + ' ' + meta.keywords.join(' ')).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  // Issues that have at least one politician on record, filtered + searched,
  // sorted by how many politicians are documented (most-covered first).
  function visibleIssues() {
    if (!_index) return [];
    return Object.keys(_index)
      .filter(function (k) { return _index[k].total > 0; })
      .map(function (k) { return { key: k, meta: issueMeta(k), agg: _index[k] }; })
      .filter(function (o) { return passesFilter(o.key) && passesQuery(o.meta); })
      .sort(function (a, b) {
        if (b.agg.total !== a.agg.total) return b.agg.total - a.agg.total;
        return a.meta.title.localeCompare(b.meta.title);
      });
  }

  // ── Toolbar (search + filter chip groups) ────────────────────────────────
  function chipCount(kind, key) {
    // Live count of issues-on-record inside a filter, so chips advertise depth.
    if (!_index) return 0;
    var n = 0;
    Object.keys(_index).forEach(function (k) {
      if (_index[k].total <= 0) return;
      var save = { fkind: state.fkind, fkey: state.fkey };
      state.fkind = kind; state.fkey = key;
      if (passesFilter(k)) n++;
      state.fkind = save.fkind; state.fkey = save.fkey;
    });
    return n;
  }
  function chip(kind, key, label, hot) {
    var active = state.fkind === kind && (kind === 'all' || state.fkey === key);
    var n = kind === 'all' ? 0 : chipCount(kind, key);
    return '<button type="button" class="sl-chip' + (hot ? ' sl-chip--hot' : '') + (active ? ' is-active' : '') +
      '" data-fkind="' + esc(kind) + '" data-fkey="' + esc(key) + '">' + esc(label) +
      (n ? '<span class="sl-chip-n">' + n + '</span>' : '') + '</button>';
  }
  function toolbarHtml() {
    var CORE = G('CORE_NATIONAL_ISSUES') || [];
    var cats = (typeof G('_pdxIssueCategories') === 'function') ? G('_pdxIssueCategories')() : [];
    var hot = HOT_TOPICS.map(function (h) { return chip('hot', h.key, h.label, true); }).join('');
    var core = [chip('all', '', 'All issues')].concat(
      CORE.map(function (c) { return chip('core', c.key, c.label); })).join('');
    var cat = cats.map(function (c) { return chip('cat', c.key, (c.icon ? c.icon + ' ' : '') + c.label); }).join('');
    var qval = esc(state.query);
    return '' +
      '<div class="sl-searchbar">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M21 21l-5-5"/></svg>' +
        '<input type="search" class="sl-search" id="sl-search" placeholder="Search issues — e.g. data centers, tariffs, water…" aria-label="Search issues" value="' + qval + '">' +
        (qval ? '<button type="button" class="sl-search-clear" id="sl-search-clear" aria-label="Clear search">×</button>' : '') +
      '</div>' +
      '<div class="sl-fgroup"><div class="sl-fgroup-label">🔥 Hot Topics</div><div class="sl-chips">' + hot + '</div></div>' +
      '<div class="sl-fgroup"><div class="sl-fgroup-label">🎯 Core National Issues</div><div class="sl-chips">' + core + '</div></div>' +
      '<div class="sl-fgroup"><div class="sl-fgroup-label">🗂 All Topics</div><div class="sl-chips">' + cat + '</div></div>';
  }

  // ── Browse cards ─────────────────────────────────────────────────────────
  function miniBar(c) {
    var total = c.supported + c.opposed + c.mixed; if (!total) return '';
    function seg(cls, n) { return n ? '<span class="sl-bar-seg ' + cls + '" style="width:' + (n / total * 100) + '%"></span>' : ''; }
    return '<div class="sl-bar" role="img" aria-label="' + c.supported + ' supported, ' + c.opposed + ' opposed, ' + c.mixed + ' mixed">' +
      seg('sl-bar-sup', c.supported) + seg('sl-bar-opp', c.opposed) + seg('sl-bar-mix', c.mixed) + '</div>';
  }
  function cardHtml(o) {
    var m = o.meta, c = o.agg.counts, hot = hotTopicsFor(o.key).length;
    return '<button type="button" class="sl-card" data-issue="' + esc(o.key) + '" aria-label="Open ' + esc(m.title) + '">' +
      '<div class="sl-card-top">' +
        '<span class="sl-card-ico" aria-hidden="true">' + esc(m.icon) + '</span>' +
        '<div class="sl-card-titles">' +
          '<div class="sl-card-title">' + esc(m.title) + '</div>' +
          (m.catLabel ? '<div class="sl-card-cat">' + esc((m.catIcon ? m.catIcon + ' ' : '') + m.catLabel) + '</div>' : '') +
        '</div>' +
        (hot ? '<span class="sl-card-hot">🔥 Hot</span>' : '') +
      '</div>' +
      (m.core ? '<span class="sl-card-core">' + esc(m.core.label) + '</span>' : '') +
      miniBar(c) +
      '<div class="sl-card-foot">' +
        '<span class="sl-card-count"><b>' + o.agg.total + '</b> politician' + (o.agg.total === 1 ? '' : 's') + ' on record</span>' +
        '<span class="sl-card-go" aria-hidden="true">View stances →</span>' +
      '</div>' +
    '</button>';
  }

  function renderBrowse() {
    var host = el('sl-body'); if (!host) return;
    if (!_index) { host.innerHTML = '<div class="sl-status">Loading issue data…</div>'; return; }
    host.innerHTML =
      '<div id="sl-toolbar" class="sl-toolbar">' + toolbarHtml() + '</div>' +
      '<div id="sl-results"></div>';
    renderResults();
    wireToolbar();
  }

  // Only the grid re-renders on a query keystroke — the toolbar (and the focused
  // search box inside it) stays put, so typing never loses focus or caret.
  function renderResults() {
    var host = el('sl-results'); if (!host) return;
    var list = visibleIssues();
    if (!list.length) {
      host.innerHTML = '<div class="sl-empty"><div class="sl-empty-ico">🔍</div>' +
        '<div class="sl-empty-title">No issues match that filter</div>' +
        '<div>Try “All issues” or a different search.</div></div>';
      return;
    }
    host.innerHTML =
      '<div class="sl-status" style="padding:0 0 0.9rem;text-align:left;">Showing <b style="color:#eaf1ff">' + list.length +
      '</b> issue' + (list.length === 1 ? '' : 's') + ' with documented stances.</div>' +
      '<div class="sl-grid">' + list.map(cardHtml).join('') + '</div>';
  }

  // ── Detail view ────────────────────────────────────────────────────────
  function partyTag(party) {
    if (!party) return '';
    var p = String(party).charAt(0).toUpperCase();
    return '<span class="sl-pol-party ' + esc(p) + '">' + esc(p) + '</span>';
  }
  function polPhoto(id, meta) {
    if (meta.photo) return '<img class="sl-pol-photo" src="' + esc(meta.photo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
    return '<span class="sl-pol-ph-fallback" aria-hidden="true">' + esc(meta.icon || '🏛') + '</span>';
  }
  function polCardHtml(p, issueKey) {
    var meta = polMeta(p.id);
    var name = polName(p.id);
    var office = [meta.office, meta.district].filter(Boolean).join(' · ');
    var PS = G('PDXStance');
    var pill = (PS && typeof PS.stancePill === 'function') ? PS.stancePill(p.stance) : '';
    var texts = p.cards.map(function (card) {
      var src = card.source && card.source.url
        ? '<span class="sl-pol-src">📎 <a href="' + esc(card.source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(card.source.label || 'Source') + '</a></span>'
        : (card.source && card.source.label ? '<span class="sl-pol-src">📎 ' + esc(card.source.label) + '</span>' : '');
      var topic = card.topic ? '<strong>' + esc(card.topic) + '.</strong> ' : '';
      return '<div class="sl-pol-text">' + topic + esc(card.text || '') + src + '</div>';
    }).join('');
    var jid = esc(p.id).replace(/'/g, ''); var jk = esc(issueKey).replace(/'/g, '');
    return '<div class="sl-pol">' +
      '<div class="sl-pol-top">' + polPhoto(p.id, meta) +
        '<div class="sl-pol-id">' +
          '<div class="sl-pol-name">' + esc(name) + partyTag(meta.party) + '</div>' +
          (office ? '<div class="sl-pol-office">' + esc(office) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="sl-pol-sig">' + pill + '</div>' +
      texts +
      '<div class="sl-pol-acts">' +
        '<button type="button" class="sl-pol-act" data-sl-profile="' + jid + '">👤 Profile</button>' +
        '<button type="button" class="sl-pol-act" data-sl-evidence="' + jid + '" data-sl-ik="' + jk + '">📚 Evidence</button>' +
      '</div>' +
    '</div>';
  }

  function detailHtml(issueKey) {
    var b = _index[issueKey]; var m = issueMeta(issueKey);
    var c = b.counts;
    var buckets = {}; STANCE_ORDER.forEach(function (s) { buckets[s.key] = []; });
    b.order.forEach(function (id) { buckets[b.pols[id].stance].push(b.pols[id]); });
    Object.keys(buckets).forEach(function (bk) {
      buckets[bk].sort(function (a, b2) {
        if (b2.cards.length !== a.cards.length) return b2.cards.length - a.cards.length;
        return polName(a.id).localeCompare(polName(b2.id));
      });
    });

    var jnav = STANCE_ORDER.map(function (s) {
      var n = buckets[s.key].length;
      return '<button type="button" class="sl-jchip ' + s.cls + (n ? '' : ' is-empty') + '" ' +
        (n ? 'data-sl-jump="' + s.key + '"' : 'aria-disabled="true" tabindex="-1"') + '>' +
        esc(s.label) + '<span class="sl-jn">' + n + '</span></button>';
    }).join('');

    var sections = STANCE_ORDER.map(function (s) {
      var list = buckets[s.key]; if (!list.length) return '';
      return '<section class="sl-sec ' + s.cls + '" id="sl-sec-' + s.key + '">' +
        '<div class="sl-sec-head"><span class="sl-sec-dot" aria-hidden="true">●</span>' +
          '<span class="sl-sec-title">' + esc(s.label) + '</span>' +
          '<span class="sl-sec-n">' + list.length + '</span></div>' +
        '<div class="sl-polgrid">' + list.map(function (p) { return polCardHtml(p, issueKey); }).join('') + '</div>' +
      '</section>';
    }).join('');

    var summary = '<strong>' + b.total + '</strong> politician' + (b.total === 1 ? '' : 's') + ' on record' +
      (c.supported ? ' · <strong>' + c.supported + '</strong> supported' : '') +
      (c.opposed ? ' · <strong>' + c.opposed + '</strong> opposed' : '') +
      (c.mixed ? ' · <strong>' + c.mixed + '</strong> mixed' : '');

    var hasLocker = typeof G('_pdxOpenEvidenceLocker') === 'function';
    return '' +
      '<button type="button" class="sl-back" id="sl-back">← All issues</button>' +
      '<div class="sl-dhead">' +
        '<div class="sl-dhead-main">' +
          '<span class="sl-dhead-ico" aria-hidden="true">' + esc(m.icon) + '</span>' +
          '<div>' +
            '<div class="sl-dhead-eyebrow">Where they stand' + (m.core ? ' · ' + esc(m.core.label) : (m.catLabel ? ' · ' + esc(m.catLabel) : '')) + '</div>' +
            '<div class="sl-dhead-title">' + esc(m.title) + '</div>' +
            '<div class="sl-dhead-sub">' + summary + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sl-dactions">' +
          (hasLocker ? '<button type="button" class="sl-btn sl-btn--gold" data-sl-evidence-all="' + esc(issueKey) + '">📚 Evidence Library</button>' : '') +
          '<button type="button" class="sl-btn" id="sl-discuss">💬 Discuss this issue</button>' +
        '</div>' +
      '</div>' +
      '<div class="sl-jnav">' + jnav + '</div>' +
      (sections || '<div class="sl-empty"><div class="sl-empty-ico">🎯</div><div class="sl-empty-title">No documented stances yet</div></div>') +
      '<div class="sl-block" id="sl-community">' +
        '<div class="sl-block-title">🗣 Community activity</div>' +
        '<div class="sl-block-note" id="sl-community-body">Loading discussions on this issue…</div>' +
        '<div class="sl-block-acts">' +
          '<button type="button" class="sl-btn" id="sl-discuss-2">💬 Start a discussion</button>' +
          '<a class="sl-btn" href="#agenda" style="text-decoration:none;display:inline-block;">📜 Propose a reform</a>' +
        '</div>' +
      '</div>';
  }

  function renderDetail(issueKey) {
    var host = el('sl-body'); if (!host || !_index || !_index[issueKey]) { renderBrowse(); return; }
    state.view = 'detail'; state.issueKey = issueKey;
    host.innerHTML = '<div class="sl-detail">' + detailHtml(issueKey) + '</div>';
    loadCommunity(issueKey);
    try { el(MOUNT).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }

  // ── Community activity (Open Discussion threads linked to this issue) ─────
  // Read-only GET, no auth required. New threads started via the "Discuss"
  // button below are tied to the issue with linkRef `issue:<issueKey>`, so they
  // flow back into this same list — the canonical bridge between the Stance
  // Library and the forum.
  function issueLinkRef(issueKey) { return 'issue:' + issueKey; }

  function loadCommunity(issueKey) {
    var body = el('sl-community-body'); if (!body) return;
    var cached = _community[issueKey];
    if (cached && cached.loaded) { renderCommunity(issueKey, cached.threads); return; }
    var url = '/api/forum/threads?sort=hot&link=' + encodeURIComponent(issueLinkRef(issueKey));
    fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { threads: [] }; })
      .then(function (data) {
        var threads = (data && data.threads) || [];
        _community[issueKey] = { loaded: true, threads: threads };
        if (state.view === 'detail' && state.issueKey === issueKey) renderCommunity(issueKey, threads);
      })
      .catch(function () {
        if (state.view === 'detail' && state.issueKey === issueKey) renderCommunity(issueKey, []);
      });
  }
  function ago(iso) {
    try {
      var s = (Date.now() - new Date(iso).getTime()) / 1000;
      if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
      return new Date(iso).toLocaleDateString();
    } catch (e) { return ''; }
  }
  function renderCommunity(issueKey, threads) {
    var body = el('sl-community-body'); if (!body) return;
    if (!threads.length) {
      body.innerHTML = 'No discussions on this issue yet — be the first to weigh in. Conversations you start here stay tied to this topic.';
      return;
    }
    var list = threads.slice(0, 4).map(function (t) {
      return '<button type="button" class="sl-thread" data-sl-thread="' + esc(t.id) + '">' +
        '<div class="sl-thread-title">' + esc(t.title || 'Discussion') + '</div>' +
        '<div class="sl-thread-meta">by ' + esc(t.authorName || 'Community') + ' · ' + esc(ago(t.createdAt)) +
          ' · 💬 ' + (t.replyCount || 0) + ' · ▲ ' + (t.score || 0) + '</div>' +
      '</button>';
    }).join('');
    var more = threads.length > 4 ? '<div class="sl-block-note" style="margin:0.3rem 0 0;">+ ' + (threads.length - 4) + ' more in the Open Discussion board.</div>' : '';
    body.innerHTML = '<div style="color:#cfe0fb;margin-bottom:0.6rem;">' + threads.length + ' discussion' + (threads.length === 1 ? '' : 's') + ' tied to this issue:</div>' + list + more;
  }

  function discuss(issueKey) {
    var m = issueMeta(issueKey);
    var F = G('PDXForum');
    if (F && typeof F.startThreadFor === 'function') {
      F.startThreadFor('issue', m.title, issueLinkRef(issueKey), 'stances');
    } else {
      try { location.hash = '#open-forum'; } catch (e) {}
    }
  }

  // ── Event wiring (delegated on the stable mount) ──────────────────────────
  function wireToolbar() {
    var s = el('sl-search');
    if (s && !s._slWired) {
      s._slWired = true;
      var t = null;
      s.addEventListener('input', function () {
        clearTimeout(t);
        var hadValue = !!state.query;
        t = setTimeout(function () {
          state.query = s.value.trim().toLowerCase();
          renderResults();
          // Toggle the clear (×) button in/out without stealing focus.
          if (!!state.query !== hadValue) syncClearBtn();
        }, 130);
      });
    }
  }
  // Show/hide the search clear button to match whether there's a query, keeping
  // the input element (and its focus) untouched.
  function syncClearBtn() {
    var bar = el('sl-search') && el('sl-search').parentNode; if (!bar) return;
    var existing = el('sl-search-clear');
    if (state.query && !existing) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sl-search-clear'; b.id = 'sl-search-clear';
      b.setAttribute('aria-label', 'Clear search'); b.textContent = '×';
      bar.appendChild(b);
    } else if (!state.query && existing) {
      existing.parentNode.removeChild(existing);
    }
  }

  function wireOnce() {
    var mount = el(MOUNT); if (!mount || mount._slWired) return; mount._slWired = true;
    mount.addEventListener('click', function (e) {
      var t = e.target;
      var clr = t.closest && t.closest('#sl-search-clear');
      if (clr) {
        state.query = ''; var si = el('sl-search'); if (si) { si.value = ''; try { si.focus(); } catch (e) {} }
        renderResults(); syncClearBtn(); return;
      }
      var chip = t.closest && t.closest('.sl-chip');
      if (chip) {
        state.fkind = chip.getAttribute('data-fkind'); state.fkey = chip.getAttribute('data-fkey') || '';
        renderBrowse(); return;
      }
      var card = t.closest && t.closest('.sl-card');
      if (card) { renderDetail(card.getAttribute('data-issue')); return; }
      if (t.closest && t.closest('#sl-back')) { state.view = 'browse'; renderBrowse(); return; }
      var jump = t.closest && t.closest('[data-sl-jump]');
      if (jump) { var sec = el('sl-sec-' + jump.getAttribute('data-sl-jump')); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var prof = t.closest && t.closest('[data-sl-profile]');
      if (prof) { var f = G('openModal'); if (typeof f === 'function') f(prof.getAttribute('data-sl-profile')); return; }
      var ev = t.closest && t.closest('[data-sl-evidence]');
      if (ev) { var o = G('_pdxOpenEvidenceLocker'); if (typeof o === 'function') o({ pol: ev.getAttribute('data-sl-evidence'), issue: ev.getAttribute('data-sl-ik') }); return; }
      var evAll = t.closest && t.closest('[data-sl-evidence-all]');
      if (evAll) { var o2 = G('_pdxOpenEvidenceLocker'); if (typeof o2 === 'function') o2({ issue: evAll.getAttribute('data-sl-evidence-all') }); return; }
      if ((t.closest && (t.closest('#sl-discuss') || t.closest('#sl-discuss-2')))) { discuss(state.issueKey); return; }
      var th = t.closest && t.closest('[data-sl-thread]');
      if (th) { var F = G('PDXForum'); if (F && typeof F.openForTopic === 'function') F.openForTopic('stances'); else { try { location.hash = '#open-forum'; } catch (e2) {} } return; }
    });
  }

  // ── Init / lifecycle ──────────────────────────────────────────────────────
  function ensureIndex() {
    if (!_index) _index = buildIndex();
    return !!_index;
  }
  function profilesSig() { var P = G('PROFILES'); return P ? Object.keys(P).length : 0; }

  function render() {
    if (!ensureIndex()) { var h = el('sl-body'); if (h) h.innerHTML = '<div class="sl-status">Loading issue data…</div>'; return; }
    _profilesSig = profilesSig();
    if (state.view === 'detail' && state.issueKey && _index[state.issueKey]) renderDetail(state.issueKey);
    else renderBrowse();
  }

  function init() {
    if (initialized) return; initialized = true;
    wireOnce();
    render();
    // PROFILES streams in from the backend AFTER first paint. Only the DETAIL
    // view shows politician names/offices/photos, so we re-render just that (and
    // only while it's open) once fresh profiles land — browsing/search is never
    // disturbed.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var sig = profilesSig();
      if (sig && sig !== _profilesSig) {
        _profilesSig = sig;
        if (state.view === 'detail' && state.issueKey && _index && _index[state.issueKey]) renderDetail(state.issueKey);
      }
      if (tries > 40 || sig > 50) clearInterval(iv);   // ~20s cap; stop once populated
    }, 500);
  }

  // Mount when the section scrolls into view (cheap) or on direct hash deep-link.
  function setup() {
    var section = el(MOUNT); if (!section) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { init(); io.disconnect(); }
      }, { rootMargin: '400px' });
      io.observe(section);
    } else { init(); }
    if (location.hash === '#' + MOUNT) init();
    window.addEventListener('hashchange', function () { if (location.hash === '#' + MOUNT) init(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();

  // Small public hook so other surfaces can deep-link into a specific issue.
  window.PDXStanceLibrary = {
    open: function (issueKey) {
      init();
      try { el(MOUNT).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      if (issueKey && ensureIndex() && _index[issueKey]) renderDetail(issueKey);
    }
  };
})();
