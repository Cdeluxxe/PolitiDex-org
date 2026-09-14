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

   IT OPENS AS A DESK, NOT AS A WALL. The browse view used to be every ISSUE_MAP
   key with a documented stance in one grid — a hundred-plus cards under three
   rails of filters (eleven hot facets, thirteen core bundles, nineteen broad
   categories). First paint is now: the search box, ONE chip row (Shelves · All
   issues · the thirteen Core National Issues · Hot), and shelves — a Hot shelf
   open, then one folded <details> per core bundle carrying its heading, its
   issue count and four preview cards over "Show all N in this bundle". The flat
   list of every key on record is still there, behind the "All issues" chip: a
   choice rather than a landing. A search always answers flat, across everything.
   Sorting is by COVERAGE only — how many people are on record — never by party,
   lean or any match figure, and every count on the surface is coverage too.

   IT OWNS NO DATA OF ITS OWN. It is a lens built entirely from globals that
   already exist:
       window.ISSUE_MAP            (issue vocabulary: label, cat, stanceKeys, keywords)
       window.ISSUE_STANCE_DATA    (politician id → [sourced stance cards])
       window.CORE_NATIONAL_ISSUES (curated bundles of issueKeys — the primary filter)
       window.PROFILES             (id → {name, office, party, photo} — display only)
       window.PDXStance            (canonical stance resolve + pill)
       window._pdxIssueCategory    (a leaf's topic category, printed on its card)
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

  // Single-select filter + free-text query. `fkind: 'shelf'` is the DEFAULT and
  // is not a filter at all — it is the desk: a Hot shelf plus one folded bundle
  // per Core National Issue. 'all' is the flat list of every issue on record,
  // which is now something the reader chooses rather than what they land on.
  // `shown` holds the bundles whose "Show all N" has been pressed this session.
  var state = { fkind: 'shelf', fkey: '', query: '', view: 'browse', issueKey: '', shown: {} };

  // Preview cards per shelf before "Show all N in this bundle".
  var SHELF_PREVIEW = 4;

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
    { key: 'elections',   label: '🗳 Elections',         test: function (k, d) { return d.cat === 'democracy' || (d.stanceKeys || []).indexOf('campaign') !== -1; } },
    // The two-axis elections vertical, promoted to its own chip. 'elections'
    // above is the whole democracy category (campaign finance, term limits, the
    // legacy election_integrity / voter_id keys); this one narrows to exactly the
    // two facets that are scored independently — 🔐 safeguards and 📩 access — so
    // a reader can reach both halves of the pair in one tap instead of finding
    // them scattered through the wider category. Membership comes from
    // PDXBallotAxes so the chip and the model can never disagree; the literal
    // key test is the fallback when that module has not loaded.
    { key: 'ballot',      label: '🗳 Security + Access', test: function (k) {
        var BA = G('PDXBallotAxes');
        if (BA && typeof BA.isAxisKey === 'function') { try { return BA.isAxisKey(k); } catch (e) {} }
        return k === 'election_security' || k === 'voting_access';
      } },
    // Institutional power. `cat` is 'reform' for these, which it shares with term
    // limits / ethics / court-reform issues, so the predicate matches on the two
    // keywords only the institutional keys carry ('separation of powers' for
    // checks_balances, 'federalism' for states_federal_power) rather than on cat.
    // No stanceKeys tag: those resolve against the legacy per-politician `stances`
    // object, which has no institutional field, so a tag here would be dead wiring.
    { key: 'checks',      label: '⚖️ Checks & Balances',  test: function (k, d) { return /separation of powers|federalism/.test((d.keywords || []).join(' ')); } }
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
    if (state.fkind === 'all' || state.fkind === 'shelf') return true;
    if (state.fkind === 'core') return coreKeysFor(state.fkey).indexOf(issueKey) !== -1;
    // No chip emits 'cat' any more — the nineteen-category rail is gone — but the
    // predicate stays so an existing caller that sets one still filters.
    if (state.fkind === 'cat') { var MAP = G('ISSUE_MAP'); return MAP && MAP[issueKey] && MAP[issueKey].cat === state.fkey; }
    if (state.fkind === 'hot') {
      // The rail now carries ONE Hot chip rather than eleven facet chips, so an
      // empty fkey means "in any hot facet". A named facet still resolves, which
      // is what keeps the detail view's cross-links and any deep link working.
      if (!state.fkey) return hotTopicsFor(issueKey).length > 0;
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

  // EVERY issue with at least one politician on record, sorted by how many are
  // documented — coverage, most-covered first. Never by party, never by lean,
  // never by a match: the order is how much there is to read, and nothing else.
  // Both views build on this one list, so the shelves and "All issues" can never
  // disagree about which keys exist.
  function allIssueRows() {
    if (!_index) return [];
    return Object.keys(_index)
      .filter(function (k) { return _index[k].total > 0; })
      .map(function (k) { return { key: k, meta: issueMeta(k), agg: _index[k] }; })
      .sort(function (a, b) {
        if (b.agg.total !== a.agg.total) return b.agg.total - a.agg.total;
        return a.meta.title.localeCompare(b.meta.title);
      });
  }

  // The flat list: allIssueRows() through the current chip and search box.
  function visibleIssues() {
    return allIssueRows().filter(function (o) { return passesFilter(o.key) && passesQuery(o.meta); });
  }

  // ── Shelves ──────────────────────────────────────────────────────────────
  // The desk. A Hot shelf (any issue in any hot facet) followed by one shelf per
  // Core National Issue, in the taxonomy's own order, and a catch-all for any
  // on-record key the taxonomy has not filed — so the shelves cover every key
  // "All issues" can show and nothing becomes unreachable by being unparented.
  function shelves() {
    var rows = allIssueRows();
    var CORE = G('CORE_NATIONAL_ISSUES') || [];
    var out = [];
    var hot = rows.filter(function (o) { return hotTopicsFor(o.key).length > 0; });
    if (hot.length) out.push({ key: 'hot', kind: 'hot', label: '🔥 Hot right now', rows: hot, open: true });
    var byCore = Object.create(null);
    rows.forEach(function (o) {
      var ck = (o.meta.core && o.meta.core.key) || '';
      (byCore[ck] || (byCore[ck] = [])).push(o);
    });
    CORE.forEach(function (ci) {
      var list = byCore[ci.key];
      if (list && list.length) out.push({ key: ci.key, kind: 'core', label: ci.label, rows: list, open: false });
    });
    if (byCore[''] && byCore[''].length) {
      out.push({ key: '_other', kind: 'other', label: '🗂 Other tracked issues', rows: byCore[''], open: false });
    }
    return out;
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
  function chip(kind, key, label, hot, title) {
    var active = state.fkind === kind && (kind === 'all' || kind === 'shelf' || state.fkey === key);
    var n = (kind === 'all' || kind === 'shelf') ? 0 : chipCount(kind, key);
    // Core National Issue chips wear their issue's colour, so the filter rail is
    // the legend for every issue-coloured surface underneath it: tap the amber
    // chip, get the amber cards. Hot Topics and broad category chips are NOT
    // issues and keep their existing treatment — colouring them would say
    // "same issue" about two things that are not the same issue.
    var IC = G('PDXIssueColors');
    var ic = (kind === 'core' && IC && typeof IC.styleFor === 'function') ? IC.styleFor(key) : '';
    return '<button type="button" class="sl-chip' + (hot ? ' sl-chip--hot' : '') +
      (ic ? ' sl-chip--core' : '') + (active ? ' is-active' : '') +
      '" data-fkind="' + esc(kind) + '" data-fkey="' + esc(key) + '"' +
      (title ? ' title="' + esc(title) + '"' : '') +
      (ic ? ' style="' + esc(ic) + '"' : '') + '>' + esc(label) +
      (n ? '<span class="sl-chip-n">' + n + '</span>' : '') + '</button>';
  }
  // A bundle's own label, shortened for a chip. The taxonomy writes them long on
  // purpose — "💵 Economy, Cost of Living & Infrastructure" — because a core
  // cannot deny what is filed under it; a rail of thirteen of those is unusable.
  // The clause before the first comma is the bundle's name, the full label is the
  // title attribute and the shelf heading, and no label is written twice here.
  function shortCoreLabel(label) {
    var t = String(label || '');
    var cut = t.indexOf(',');
    return cut > 0 ? t.slice(0, cut) : t;
  }

  // ONE CHIP ROW. Three rails stood here: eleven hot facets, the thirteen core
  // bundles, and nineteen broad categories — sixty-odd filters above a grid of
  // every leaf. The rail is now All issues, the bundles, and Hot.
  function toolbarHtml() {
    var CORE = G('CORE_NATIONAL_ISSUES') || [];
    var row = [chip('shelf', '', '🗂 Shelves'), chip('all', '', 'All issues')]
      .concat(CORE.map(function (c) { return chip('core', c.key, shortCoreLabel(c.label), false, c.label); }))
      .concat([chip('hot', '', '🔥 Hot', true)])
      .join('');
    var qval = esc(state.query);
    return '' +
      '<div class="sl-searchbar">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M21 21l-5-5"/></svg>' +
        '<input type="search" class="sl-search" id="sl-search" placeholder="Search issues — e.g. data centers, tariffs, water…" aria-label="Search issues" value="' + qval + '">' +
        (qval ? '<button type="button" class="sl-search-clear" id="sl-search-clear" aria-label="Clear search">×</button>' : '') +
      '</div>' +
      '<div class="sl-chips" role="group" aria-label="Filter issues">' + row + '</div>';
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
    // One issue, one colour, everywhere (issue-colors.js). The card is keyed by
    // its leaf ISSUE_MAP key and the module resolves that to its Core National
    // Issue, so 'health_rural' and 'health_drug_prices' both read as healthcare
    // blue — the same blue their Word vs Action rows and coverage gaps carry.
    var IC = G('PDXIssueColors');
    var ic = (IC && typeof IC.styleFor === 'function') ? IC.styleFor(o.key) : '';
    return '<button type="button" class="sl-card" data-issue="' + esc(o.key) + '"' +
        (ic ? ' style="' + esc(ic) + '"' : '') + ' aria-label="Open ' + esc(m.title) + '">' +
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

  // ── One shelf ────────────────────────────────────────────────────────────
  // A <details>: heading, issue count, four preview cards, and — when the bundle
  // has more — "Show all N in this bundle". The colour is the bundle's own, from
  // PDXIssueColors, resolved by the same table (and the same ROLLUP_PARENT road)
  // the cards and every bill letterhead use; a shelf that is not a Core National
  // Issue gets no treatment rather than a guessed one.
  function shelfHtml(sh) {
    var IC = G('PDXIssueColors');
    var ic = (sh.kind === 'core' && IC && typeof IC.styleFor === 'function') ? IC.styleFor(sh.key) : '';
    var n = sh.rows.length;
    var full = !!state.shown[sh.key];
    var rows = full ? sh.rows : sh.rows.slice(0, SHELF_PREVIEW);
    var hidden = n - rows.length;
    return '<details class="sl-shelf" data-sl-shelf="' + esc(sh.key) + '"' +
        (sh.open ? ' open' : '') + (ic ? ' style="' + esc(ic) + '"' : '') + '>' +
      '<summary class="sl-shelf-sum">' +
        '<span class="sl-shelf-title">' + esc(sh.label) + '</span>' +
        '<span class="sl-shelf-n">' + n + ' issue' + (n === 1 ? '' : 's') + '</span>' +
      '</summary>' +
      '<div class="sl-shelf-body">' +
        '<div class="sl-grid">' + rows.map(cardHtml).join('') + '</div>' +
        (hidden > 0
          ? '<button type="button" class="sl-shelf-more" data-sl-more="' + esc(sh.key) + '">' +
              'Show all ' + n + ' in this bundle</button>'
          : '') +
      '</div>' +
    '</details>';
  }

  function renderShelves() {
    var host = el('sl-results'); if (!host) return;
    var list = shelves();
    if (!list.length) { host.innerHTML = '<div class="sl-status">No documented stances yet.</div>'; return; }
    host.innerHTML =
      '<div class="sl-shelf-note">Open a bundle to see the issues inside it, or pick <b>All issues</b> ' +
      'above for the flat list. Every count is <b>coverage</b> — how many people are on record — not a grade.</div>' +
      list.map(shelfHtml).join('');
  }

  // Only the results re-render on a query keystroke — the toolbar (and the
  // focused search box inside it) stays put, so typing never loses focus or
  // caret. A query always produces the flat list: a reader searching "water"
  // wants the matches, not fourteen shelves with one card behind some of them.
  function renderResults() {
    var host = el('sl-results'); if (!host) return;
    if (state.fkind === 'shelf' && !state.query) { renderShelves(); return; }
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
      // Where this member lands on the OTHER elections axis. Only ever non-empty
      // on 🔐 election_security / 📩 voting_access, so it reads as a split flag
      // exactly where a split can exist and adds nothing to any other issue.
      axesCompanionHtml(p.id, issueKey) +
      // Voting-record rollup — filled in asynchronously by fillRecordCards once the
      // per-issue record fetch resolves. Stays empty (and invisible) for anyone with
      // no votes on record, so the card is unchanged when there's nothing to show.
      '<div class="sl-pol-record" id="sl-rec-' + recSafeId(p.id) + '"></div>' +
      '<div class="sl-pol-acts">' +
        '<button type="button" class="sl-pol-act" data-sl-profile="' + jid + '">👤 Profile</button>' +
        '<button type="button" class="sl-pol-act" data-sl-evidence="' + jid + '" data-sl-ik="' + jk + '">📚 Evidence</button>' +
      '</div>' +
    '</div>';
  }

  // ── "Adopt this stance" — quick-add into My Stances ──────────────────────
  // The Stance Library is issue-first, so each issue maps 1:1 to an ISSUE_MAP key
  // — exactly what My Stances stores. This lets a reader turn "here's where THEY
  // stand" into "here's where I stand" in one tap, without leaving the page.
  // Purely additive: it only appears when My Stances is present and the issue is a
  // known ISSUE_MAP key, and it stays neutral (it offers all three directions and
  // never preselects one).
  var ADOPT_OPTS = [
    { key: 'support', ic: '👍', label: 'Support', cls: 'is-support' },
    { key: 'oppose', ic: '👎', label: 'Oppose', cls: 'is-oppose' },
    { key: 'mixed', ic: '⚖️', label: 'Mixed', cls: 'is-mixed' }
  ];
  function adoptPosition(issueKey) {
    try {
      var PS = G('PDXStances');
      if (PS && typeof PS.get === 'function') { var r = PS.get(issueKey); return r ? r.position : null; }
    } catch (e) {}
    return null;
  }
  function adoptHtml(issueKey) {
    var PS = G('PDXStances');
    if (!PS || typeof PS.set !== 'function') return '';   // My Stances not available
    var MAP = G('ISSUE_MAP');
    if (!MAP || !MAP[issueKey]) return '';                // only real ISSUE_MAP issues
    var cur = adoptPosition(issueKey);
    var btns = ADOPT_OPTS.map(function (o) {
      var on = cur === o.key;
      return '<button type="button" class="sl-adopt-btn ' + o.cls + (on ? ' is-on' : '') + '" ' +
        'data-sl-adopt="' + o.key + '" data-sl-ik="' + esc(issueKey) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        o.ic + ' ' + o.label + '</button>';
    }).join('');
    var status = cur
      ? '<span class="sl-adopt-status is-set">✓ Saved to <button type="button" class="sl-adopt-link" data-sl-adopt-open="' + esc(issueKey) + '">My Stances</button> · tap your pick again to remove</span>'
      : '<span class="sl-adopt-status">One tap saves it to your <button type="button" class="sl-adopt-link" data-sl-adopt-open="' + esc(issueKey) + '">My Stances</button> and scores every politician against it.</span>';
    return '<div class="sl-adopt' + (cur ? ' is-set' : '') + '" data-sl-adoptwrap="' + esc(issueKey) + '">' +
      '<div class="sl-adopt-lead"><span class="sl-adopt-eyebrow">🎯 Adopt this stance</span>' +
      '<span class="sl-adopt-q">Where do <em>you</em> stand?</span></div>' +
      '<div class="sl-adopt-btns">' + btns + '</div>' + status +
      '</div>';
  }
  // Replace just the widget in place after a change, so the page never jumps.
  function refreshAdopt(issueKey) {
    if (!issueKey) return;
    var wrap = document.querySelector('[data-sl-adoptwrap="' + issueKey + '"]');
    if (wrap) {
      var tmp = document.createElement('div');
      tmp.innerHTML = adoptHtml(issueKey);
      if (tmp.firstChild) wrap.parentNode.replaceChild(tmp.firstChild, wrap);
    }
  }
  function adoptStance(issueKey, pos) {
    var PS = G('PDXStances');
    if (!PS) return;
    var cur = adoptPosition(issueKey);
    try {
      if (cur === pos && typeof PS.remove === 'function') PS.remove(issueKey);      // tap the active pick → remove
      else if (typeof PS.set === 'function') PS.set(issueKey, pos, 'medium');       // adopt / switch
    } catch (e) {}
    refreshAdopt(issueKey);   // immediate feedback (pdx-stances-change also refreshes)
  }

  // ── Two-axis elections vertical (ballot-axes.js) ─────────────────────────
  // 🔐 election_security and 📩 voting_access are separate ISSUE_MAP keys by
  // design, so the Library — which shows one key at a time — is where the pair
  // is easiest to miss. Both helpers below are guarded and return '' when
  // ballot-axes.js is absent or the open issue is not one of the two facets.
  function axesExplainerHtml(issueKey) {
    var BA = G('PDXBallotAxes');
    if (!BA || typeof BA.explainerHtml !== 'function' || typeof BA.isAxisKey !== 'function') return '';
    try {
      if (!BA.isAxisKey(issueKey)) return '';
      // The cross-link opens the other axis inside the Library itself, so the
      // reader stays in the surface they are already browsing.
      return BA.explainerHtml({ activeKey: issueKey, onKey: 'data-sl-axis="%KEY%"' });
    } catch (e) { return ''; }
  }
  // The "other axis" line under one member's card: where they land on the facet
  // that is NOT currently on screen, flagged when the two point different ways.
  function axesCompanionHtml(pid, issueKey) {
    var BA = G('PDXBallotAxes');
    if (!BA || typeof BA.companionHtml !== 'function') return '';
    try { return BA.companionHtml(pid, issueKey, { record: polMeta(pid) }) || ''; }
    catch (e) { return ''; }
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
    // Reverse "connecting the dots" link: if an Issue Spotlight covers this issue,
    // offer a jump into it (library → spotlight).
    var spot = null;
    try {
      var SA = G('PDXSpotlight');
      if (SA && typeof SA.forIssueKey === 'function') spot = (SA.forIssueKey(issueKey) || [])[0] || null;
    } catch (e) { spot = null; }
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
          (spot ? '<button type="button" class="sl-btn sl-btn--gold" data-sl-spotlight="' + esc(spot.slug) + '">🔦 Read the Spotlight</button>' : '') +
          (hasLocker ? '<button type="button" class="sl-btn" data-sl-evidence-all="' + esc(issueKey) + '">📚 Evidence Library</button>' : '') +
          '<button type="button" class="sl-btn" id="sl-discuss">💬 Discuss this issue</button>' +
        '</div>' +
      '</div>' +
      adoptHtml(issueKey) +
      // Two-axis explainer — shown only on 🔐 election_security and 📩
      // voting_access. Those two keys are scored independently and read in
      // OPPOSITE directions ("supports" = pro-safeguard on one, pro-access on the
      // other), which is exactly the thing an issue-first surface hides: a reader
      // lands on one key and never learns the other exists. This states the model
      // and cross-links the paired axis in one tap. Additive — '' everywhere else.
      axesExplainerHtml(issueKey) +
      '<div class="sl-jnav">' + jnav + '</div>' +
      // Issue-level distributional summary ("who this issue's measures affect").
      // Self-hydrating placeholder; hidden until data lands, so issues with no
      // ledger-scored measures show nothing. Additive — degrades to '' if absent.
      (typeof G('_pdxIssueImpactsPlaceholder') === 'function' ? G('_pdxIssueImpactsPlaceholder')(issueKey) : '') +
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
    loadRecordRollup(issueKey);
    try { el(MOUNT).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }

  // ── Voting-record rollup ("what they actually DID" per issue) ─────────────
  // For the open issue we make ONE batched call to /api/voting-record/issue/:key
  // (every member's votes on this issue), group the returned records by member,
  // and run the shared Phase-2 engine (window._issueRecordSummary) to derive each
  // member's verdict + counts — the SAME logic the profile Voting Record section
  // uses, so the two never disagree. The result fills the per-card placeholder;
  // members with no record simply get nothing. Read-only GET, no auth, and fully
  // additive: any failure just leaves the cards as they were.
  var _recordRollup = {};   // issueKey → { loaded, byPol: { pid: summary } }

  function recSafeId(id) { return String(id == null ? '' : id).replace(/[^a-zA-Z0-9_-]/g, '_'); }

  // Map the Library's stance vocabulary (supported/opposed/mixed/none) to the
  // engine's (support/oppose/mixed/null).
  function engineStance(libStance) {
    return libStance === 'supported' ? 'support'
      : libStance === 'opposed' ? 'oppose'
      : libStance === 'mixed' ? 'mixed' : null;
  }

  function loadRecordRollup(issueKey) {
    if (!issueKey) return;
    // The engine + issue vocabulary must be present for verdicts to mean anything.
    if (typeof G('_issueRecordSummary') !== 'function' || !G('ISSUE_MAP')) return;
    var cached = _recordRollup[issueKey];
    if (cached && cached.loaded) { fillRecordCards(issueKey); return; }
    var url = '/api/voting-record/issue/' + encodeURIComponent(issueKey) + '?pageSize=100';
    fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var byPol = {};
        var summarize = G('_issueRecordSummary');
        var b = _index && _index[issueKey];
        if (data && Array.isArray(data.items) && typeof summarize === 'function') {
          var groups = {};
          data.items.forEach(function (it) {
            var pid = it && it.politicianId; if (!pid) return;
            (groups[pid] = groups[pid] || []).push(it);
          });
          Object.keys(groups).forEach(function (pid) {
            var libStance = (b && b.pols[pid]) ? b.pols[pid].stance : null;
            byPol[pid] = summarize(issueKey, engineStance(libStance), groups[pid]);
          });
        }
        _recordRollup[issueKey] = { loaded: true, byPol: byPol };
        if (state.view === 'detail' && state.issueKey === issueKey) fillRecordCards(issueKey);
      })
      .catch(function () { _recordRollup[issueKey] = { loaded: true, byPol: {} }; });
  }

  // Build the small rollup block (counts + contradiction flag + "View votes") for
  // one member. Returns '' when they have no records touching this issue.
  function rollupHtml(pid, summary, issueKey) {
    if (!summary || !summary.total) return '';
    var parts = [];
    if (summary.consistent) parts.push('<b>' + summary.consistent + '</b> back it up');
    if (summary.contradicts) parts.push('<b>' + summary.contradicts + '</b> contradict');
    if (summary.mixed) parts.push('<b>' + summary.mixed + '</b> mixed');
    var counts = parts.length ? ' · ' + parts.join(' · ') : '';
    var flag = summary.hasContradiction
      ? '<span class="sl-rec-flag" title="Votes run against the stated stance">⚠️ Contradiction</span>'
      : '';
    var vpid = esc(pid).replace(/'/g, ''); var vk = esc(issueKey).replace(/'/g, '');
    return '<div class="sl-rec-line">🗳️ <b>' + summary.total + '</b> vote' +
        (summary.total === 1 ? '' : 's') + ' on record' + counts + flag + '</div>' +
      '<button type="button" class="sl-pol-act sl-rec-btn" data-sl-votes="' + vpid +
        '" data-sl-vk="' + vk + '">🗳️ View votes</button>';
  }

  function fillRecordCards(issueKey) {
    var cached = _recordRollup[issueKey]; if (!cached) return;
    var byPol = cached.byPol || {};
    Object.keys(byPol).forEach(function (pid) {
      var host = el('sl-rec-' + recSafeId(pid)); if (!host) return;
      host.innerHTML = rollupHtml(pid, byPol[pid], issueKey);
    });
  }

  // Open a member's profile with the Voting Record section pre-filtered to this
  // issue. voting-record.js reads window.__pdxVotingInitialIssue on init, applies
  // the filter, and scrolls to the section — the shareable equivalent of
  // ?p=<id>#pdxsec-voting?issue=<key>.
  function openProfileVotes(pid, issueKey) {
    var f = G('openModal'); if (typeof f !== 'function') return;
    try { window.__pdxVotingInitialIssue = issueKey || ''; } catch (e) {}
    f(pid);
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
      var more = t.closest && t.closest('[data-sl-more]');
      if (more) {
        state.shown[more.getAttribute('data-sl-more')] = true;
        renderResults(); return;
      }
      var chip = t.closest && t.closest('.sl-chip');
      if (chip) {
        state.fkind = chip.getAttribute('data-fkind'); state.fkey = chip.getAttribute('data-fkey') || '';
        renderBrowse(); return;
      }
      var card = t.closest && t.closest('.sl-card');
      if (card) { renderDetail(card.getAttribute('data-issue')); return; }
      var adopt = t.closest && t.closest('[data-sl-adopt]');
      if (adopt) { adoptStance(adopt.getAttribute('data-sl-ik'), adopt.getAttribute('data-sl-adopt')); return; }
      var adoptOpen = t.closest && t.closest('[data-sl-adopt-open]');
      if (adoptOpen) {
        var PS = G('PDXStances');
        if (PS && typeof PS.open === 'function') PS.open(adoptOpen.getAttribute('data-sl-adopt-open'));
        else { try { location.hash = '#my-stances'; } catch (e3) {} }
        return;
      }
      if (t.closest && t.closest('#sl-back')) { state.view = 'browse'; renderBrowse(); return; }
      var jump = t.closest && t.closest('[data-sl-jump]');
      if (jump) { var sec = el('sl-sec-' + jump.getAttribute('data-sl-jump')); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      // Two-axis cross-link: swap the detail view to the paired elections facet.
      // Guarded on the index so a key with no cards can never open an empty detail.
      var axis = t.closest && t.closest('[data-sl-axis]');
      if (axis) {
        var ak = axis.getAttribute('data-sl-axis');
        if (_index && _index[ak]) renderDetail(ak);
        return;
      }
      var votes = t.closest && t.closest('[data-sl-votes]');
      if (votes) { openProfileVotes(votes.getAttribute('data-sl-votes'), votes.getAttribute('data-sl-vk')); return; }
      var prof = t.closest && t.closest('[data-sl-profile]');
      if (prof) { var f = G('openModal'); if (typeof f === 'function') f(prof.getAttribute('data-sl-profile')); return; }
      var ev = t.closest && t.closest('[data-sl-evidence]');
      if (ev) { var o = G('_pdxOpenEvidenceLocker'); if (typeof o === 'function') o({ pol: ev.getAttribute('data-sl-evidence'), issue: ev.getAttribute('data-sl-ik') }); return; }
      var evAll = t.closest && t.closest('[data-sl-evidence-all]');
      if (evAll) { var o2 = G('_pdxOpenEvidenceLocker'); if (typeof o2 === 'function') o2({ issue: evAll.getAttribute('data-sl-evidence-all') }); return; }
      var spot = t.closest && t.closest('[data-sl-spotlight]');
      if (spot) { var SP = G('PDXSpotlight'); if (SP && typeof SP.open === 'function') SP.open(spot.getAttribute('data-sl-spotlight')); return; }
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
    // Keep the "Adopt this stance" widget in step with My Stances even when a
    // change happens elsewhere (e.g. the reader removes it from the My Stances
    // section, or a stance syncs in from another device) while a detail is open.
    try {
      window.addEventListener('pdx-stances-change', function () {
        if (state.view === 'detail' && state.issueKey) refreshAdopt(state.issueKey);
      });
    } catch (e) {}
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
  // _view() is for the test harness: the two lists the desk is built from, in a
  // sandbox with no document, so a suite can assert that the default paint is a
  // set of folded bundles rather than every leaf — and that the shelves between
  // them still cover every key "All issues" lists.
  window.PDXStanceLibrary = {
    open: function (issueKey) {
      init();
      try { el(MOUNT).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      if (issueKey && ensureIndex() && _index[issueKey]) renderDetail(issueKey);
    },
    _view: function () {
      if (!ensureIndex()) return null;
      var save = { fkind: state.fkind, fkey: state.fkey, query: state.query };
      state.fkind = 'all'; state.fkey = ''; state.query = '';
      var all = visibleIssues().map(function (o) { return o.key; });
      state.fkind = save.fkind; state.fkey = save.fkey; state.query = save.query;
      return {
        preview: SHELF_PREVIEW,
        defaultKind: 'shelf',
        all: all,
        shelves: shelves().map(function (sh) {
          return {
            key: sh.key, kind: sh.kind, label: sh.label, open: !!sh.open,
            keys: sh.rows.map(function (o) { return o.key; }),
            previewKeys: sh.rows.slice(0, SHELF_PREVIEW).map(function (o) { return o.key; })
          };
        })
      };
    }
  };
})();
