/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Spotlight Hub  ·  the "browse every Issue Spotlight" directory
   ────────────────────────────────────────────────────────────────────────────
   The home page has a curated handful of hand-picked Hot Topic cards, but the
   full Issue Spotlight collection (40+ sourced guides) was only reachable by
   deep-link, geolocated Local Issues, or search — so newly authored Spotlights
   quietly failed to surface anywhere a visitor could browse. This module fixes
   that: it renders EVERY Spotlight in window.PDXSpotlight's registry into a
   filterable, searchable grid, so the moment a Spotlight is added to the
   registry it appears here automatically. No registry edits, no per-card HTML.

   NO NEW DATA. Everything is read from globals the app already ships:
     • window.PDXSpotlight.list() / .strengthFor() / .open() / .match()
     • window._pdxCategoryOf(issueKey) → broad category key   (alignment-tool.js)
     • window._pdxEvidenceCategory(key) → { key, icon, label }
     • window._issueLabel(issueKey)     → friendly issue label

   Mounts into the markup in #all-spotlights (see index.html #hot-topics):
     #shub-scope-chips   scope filter chips (All / National / Utah & Local)
     #shub-cat-chips     category filter chips (built from the registry)
     #sh-search        text filter input
     #shub-grid          the card grid
     #shub-count         "Showing N of M" live count
     #shub-empty         empty state

   Exposes window.PDXSpotlightHub.render() so other surfaces can force a rebuild.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXSpotlightHub) return; // idempotent

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Filter state — scope (all|national|local), category key ('' = all), and the
  // free-text query. Cards are rendered once with data-* attributes; filtering
  // just toggles visibility, so switching filters is instant even at 40+ cards.
  var _state = { scope: 'all', cat: '', q: '' };
  var _built = false;

  // A Spotlight's place tells us national vs local: the national guides all lead
  // with "National…", the local ones name a Utah place ("Southern Utah", "Box
  // Elder County", "Statewide · Utah"). Anything not explicitly national is
  // treated as local so a new local Spotlight is never mis-bucketed as national.
  function scopeOf(sp) {
    var place = String(sp.place || '').toLowerCase();
    return /^national/.test(place) ? 'national' : 'local';
  }

  // Broad category key for a Spotlight, via its primary issue. Falls back to
  // 'other' so every Spotlight lands under some chip.
  function catOf(sp) {
    try {
      if (sp.primaryIssueKey && typeof window._pdxCategoryOf === 'function') {
        return window._pdxCategoryOf(sp.primaryIssueKey) || 'other';
      }
    } catch (e) {}
    return 'other';
  }

  function catMeta(key) {
    try {
      if (typeof window._pdxEvidenceCategory === 'function') {
        var m = window._pdxEvidenceCategory(key);
        if (m) return m;
      }
    } catch (e) {}
    return { key: key, icon: '🏷️', label: key === 'other' ? 'Other' : key };
  }

  // Per-category accent color. Deliberately reuses the Legislation library's
  // ISSUE_CAT palette (see digital-library.js) so a topic reads the same across the
  // whole Digital Library: economy=green, education=blue, health=pink, etc. Keyed by
  // the broad Evidence Category key (_pdxEvidenceCategory), with a safe blue fallback
  // so a brand-new category still gets a spine and colored chip.
  var CAT_COLOR = {
    taxes_economy:   '#4ade80',
    education:       '#60a5fa',
    health_human:    '#f472b6',
    housing:         '#fbbf24',
    safety_justice:  '#fca5a5',
    immigration:     '#fb923c',
    enviro_land:     '#22d3ee',
    gov_elections:   '#a78bfa',
    transport_infra: '#38bdf8',
    other:           '#9ec8ff'
  };
  function catColor(key) { return CAT_COLOR[key] || '#9ec8ff'; }

  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function tagsFor(sp) {
    var keys = (sp.communityIssueKeys && sp.communityIssueKeys.length)
      ? sp.communityIssueKeys : (sp.primaryIssueKey ? [sp.primaryIssueKey] : []);
    var seen = {}, out = [];
    keys.forEach(function (k) { if (k && !seen[k]) { seen[k] = 1; out.push(k); } });
    return out.slice(0, 3);
  }

  function cardHtml(sp, api) {
    var s = (typeof api.strengthFor === 'function') ? api.strengthFor(sp)
      : { level: 'moderate', label: 'Documented', sources: 0, receipts: 0 };
    var blurb = sp.blurb || sp.metaDescription || sp.summary || '';
    var scope = scopeOf(sp);
    var cat = catOf(sp);
    var cm = catMeta(cat);
    var col = catColor(cat);
    var tags = tagsFor(sp).map(function (k) {
      return '<span class="shub-tag">' + esc(issueLabel(k)) + '</span>';
    }).join('');
    var hay = (sp.title + ' ' + sp.place + ' ' + (sp.searchKeywords || '') + ' ' +
      blurb + ' ' + cm.label).toLowerCase();
    var scopeChip = scope === 'national'
      ? '<span class="shub-scope shub-scope-national">🇺🇸 National</span>'
      : '<span class="shub-scope shub-scope-local">📍 Local</span>';
    return '<button type="button" class="shub-card" data-slug="' + esc(sp.slug) + '" ' +
        'data-scope="' + scope + '" data-cat="' + esc(cat) + '" data-hay="' + esc(hay) + '" ' +
        'style="--cat:' + col + '" ' +
        'aria-label="Open the ' + esc(sp.title) + ' Issue Spotlight">' +
      '<span class="shub-card-top">' + scopeChip +
        '<span class="shub-doc shub-doc-' + esc(s.level) + '" title="' +
          esc((s.sources || 0) + ' sourced events · ' + (s.receipts || 0) + ' receipts') + '">📑 ' + esc(s.label) + '</span>' +
      '</span>' +
      '<span class="shub-title">' + esc(sp.title) + '</span>' +
      (sp.place ? '<span class="shub-place">📍 ' + esc(sp.place) + '</span>' : '') +
      (blurb ? '<span class="shub-blurb">' + esc(blurb) + '</span>' : '') +
      (tags ? '<span class="shub-tags">' + tags + '</span>' : '') +
      '<span class="shub-foot">' +
        '<span class="shub-cat"><span aria-hidden="true">' + esc(cm.icon) + '</span> ' + esc(cm.label) + '</span>' +
        '<span class="shub-cta">View Spotlight →</span>' +
      '</span>' +
    '</button>';
  }

  // Build the scope + category chip rows from the registry, so the categories
  // shown always match what's actually present (a new category appears the
  // moment a Spotlight uses it).
  function buildChips(list) {
    var scopeWrap = document.getElementById('shub-scope-chips');
    var catWrap = document.getElementById('shub-cat-chips');
    if (!scopeWrap || !catWrap) return;

    var nNat = 0, nLoc = 0;
    var catCounts = {};
    list.forEach(function (sp) {
      if (scopeOf(sp) === 'national') nNat++; else nLoc++;
      var c = catOf(sp);
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    var scopeChips = [
      { key: 'all', label: 'All Spotlights', n: list.length },
      { key: 'national', label: '🇺🇸 National', n: nNat },
      { key: 'local', label: '📍 Utah & Local', n: nLoc }
    ];
    scopeWrap.innerHTML = scopeChips.filter(function (c) { return c.n > 0; }).map(function (c) {
      return '<button type="button" class="shub-chip' + (_state.scope === c.key ? ' is-active' : '') +
        '" data-scope="' + c.key + '">' + esc(c.label) +
        ' <span class="shub-chip-n">' + c.n + '</span></button>';
    }).join('');

    // Categories ordered by count (most-covered first), capped so the row stays
    // scannable; an "All topics" reset leads.
    var catKeys = Object.keys(catCounts).sort(function (a, b) { return catCounts[b] - catCounts[a]; });
    var catHtml = '<button type="button" class="shub-chip shub-chip-cat' + (_state.cat === '' ? ' is-active' : '') +
      '" data-cat="">All topics</button>';
    catHtml += catKeys.map(function (k) {
      var cm = catMeta(k);
      return '<button type="button" class="shub-chip shub-chip-cat' + (_state.cat === k ? ' is-active' : '') +
        '" data-cat="' + esc(k) + '" style="--cat:' + catColor(k) + '"><span aria-hidden="true">' + esc(cm.icon) + '</span> ' +
        esc(cm.label) + ' <span class="shub-chip-n">' + catCounts[k] + '</span></button>';
    }).join('');
    catWrap.innerHTML = catHtml;

    scopeWrap.querySelectorAll('[data-scope]').forEach(function (b) {
      b.addEventListener('click', function () { _state.scope = b.getAttribute('data-scope') || 'all'; syncChips(); applyFilter(); scrollToResults(); });
    });
    catWrap.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { _state.cat = b.getAttribute('data-cat') || ''; syncChips(); applyFilter(); scrollToResults(); });
    });
  }

  // Nudge the freshly filtered results into view after a chip tap. block:'nearest'
  // keeps it gentle — no jump when the grid is already on screen (desktop), but on a
  // long mobile page it brings the new set up so the filter feels like a real jump.
  function scrollToResults() {
    var count = document.getElementById('shub-count');
    if (count && count.scrollIntoView) { try { count.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }
  }

  // Reset every filter (scope, topic, search) back to "show everything".
  function clearFilters() {
    _state.scope = 'all'; _state.cat = ''; _state.q = '';
    var input = document.getElementById('sh-search');
    if (input) input.value = '';
    syncChips(); applyFilter();
  }

  function syncChips() {
    var scopeWrap = document.getElementById('shub-scope-chips');
    var catWrap = document.getElementById('shub-cat-chips');
    if (scopeWrap) scopeWrap.querySelectorAll('[data-scope]').forEach(function (b) {
      b.classList.toggle('is-active', (b.getAttribute('data-scope') || 'all') === _state.scope);
    });
    if (catWrap) catWrap.querySelectorAll('[data-cat]').forEach(function (b) {
      b.classList.toggle('is-active', (b.getAttribute('data-cat') || '') === _state.cat);
    });
  }

  function applyFilter() {
    var grid = document.getElementById('shub-grid');
    var empty = document.getElementById('shub-empty');
    var count = document.getElementById('shub-count');
    if (!grid) return;
    var terms = _state.q ? _state.q.toLowerCase().split(/\s+/).filter(Boolean) : [];
    var cards = grid.querySelectorAll('.shub-card');
    var shown = 0, total = cards.length;
    cards.forEach(function (c) {
      var okScope = _state.scope === 'all' || c.getAttribute('data-scope') === _state.scope;
      var okCat = !_state.cat || c.getAttribute('data-cat') === _state.cat;
      var hay = c.getAttribute('data-hay') || '';
      var okQ = !terms.length || terms.every(function (t) { return hay.indexOf(t) !== -1; });
      var ok = okScope && okCat && okQ;
      c.classList.toggle('shub-hidden', !ok);
      if (ok) shown++;
    });
    if (count) count.textContent = shown === total
      ? ('Showing all ' + total + ' spotlights')
      : ('Showing ' + shown + ' of ' + total + ' spotlights');
    if (empty) empty.classList.toggle('is-on', shown === 0);
  }

  function injectCss() {
    if (document.getElementById('sh-css')) return;
    var css =
      '#all-spotlights{margin-top:2.6rem;}' +
      '.shub-head{text-align:center;margin-bottom:1.1rem;}' +
      '.shub-head-eyebrow{display:inline-flex;align-items:center;gap:.45rem;font:700 .7rem/1 "Barlow Condensed",sans-serif;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#f5c842;background:rgba(245,200,66,.1);' +
        'border:1px solid rgba(245,200,66,.28);border-radius:999px;padding:.35rem .8rem;margin-bottom:.7rem;}' +
      '.shub-head-title{font:800 1.5rem/1.1 "Barlow Condensed",sans-serif;letter-spacing:.02em;color:#fff;margin:0 0 .3rem;text-transform:uppercase;}' +
      '.shub-head-sub{font:500 .86rem/1.5 "Barlow",sans-serif;color:#9fb4d4;max-width:38rem;margin:0 auto;}' +
      '.shub-controls{display:flex;flex-direction:column;gap:.65rem;margin:1.1rem 0 .5rem;}' +
      '.shub-chips{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;}' +
      '.shub-chip{display:inline-flex;align-items:center;gap:.32rem;cursor:pointer;' +
        'font:700 .72rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#a9bbd6;' +
        'background:rgba(159,180,212,.07);border:1px solid rgba(159,180,212,.2);border-radius:999px;' +
        'padding:.4rem .7rem;transition:background .15s,border-color .15s,color .15s,transform .1s;}' +
      '.shub-chip:hover{background:rgba(159,180,212,.14);border-color:rgba(159,180,212,.4);color:#e6eefc;}' +
      '.shub-chip:active{transform:scale(.97);}' +
      '.shub-chip.is-active{background:rgba(245,200,66,.16);border-color:rgba(245,200,66,.55);color:#f5d77a;}' +
      // Category chips wear their topic color — a light tint at rest, a solid fill
      // when active — so the topic rail scans the same way the Legislation topics do.
      '.shub-chip-cat{color:var(--cat,#a9bbd6);background:rgba(159,180,212,.06);border-color:var(--cat,rgba(159,180,212,.22));}' +
      '.shub-chip-cat:hover{filter:brightness(1.12);color:var(--cat,#e6eefc);border-color:var(--cat,rgba(159,180,212,.4));}' +
      '.shub-chip-cat.is-active{background:var(--cat,#7fb4ff);border-color:var(--cat,#7fb4ff);color:#0a0f1e;}' +
      '.shub-chip-cat.is-active .shub-chip-n{opacity:.85;}' +
      '.shub-chip-n{font-size:.62rem;opacity:.7;font-weight:800;}' +
      '.shub-searchbar{display:flex;align-items:center;gap:.5rem;max-width:30rem;margin:0 auto;width:100%;' +
        'background:rgba(10,15,30,.6);border:1px solid rgba(159,180,212,.24);border-radius:.8rem;padding:.55rem .85rem;}' +
      '.shub-searchbar:focus-within{border-color:rgba(245,200,66,.5);}' +
      '.shub-searchbar input{flex:1;background:transparent;border:0;outline:0;color:#e6eefc;font:500 .9rem/1.2 "Barlow",sans-serif;min-width:0;}' +
      '.shub-searchbar input::placeholder{color:#6d84a8;}' +
      '.shub-search-ico{color:#6d84a8;flex-shrink:0;}' +
      '.shub-count{text-align:center;font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;' +
        'text-transform:uppercase;color:#7d97bd;margin:.2rem 0 1rem;}' +
      '.shub-grid{display:grid;gap:.85rem;grid-template-columns:repeat(auto-fill,minmax(16.5rem,1fr));}' +
      '.shub-card{display:flex;flex-direction:column;gap:.4rem;text-align:left;width:100%;cursor:pointer;height:100%;' +
        'background:linear-gradient(160deg,rgba(19,29,52,.85),rgba(13,21,38,.9));border:1px solid rgba(159,180,212,.16);' +
        'border-left:4px solid var(--cat,rgba(245,200,66,.5));' +
        'border-radius:.9rem;padding:.95rem 1rem;color:inherit;' +
        'transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}' +
      '.shub-card:hover{transform:translateY(-3px);border-color:var(--cat,rgba(245,200,66,.45));box-shadow:0 10px 28px rgba(0,0,0,.35);}' +
      '.shub-card:focus-visible{outline:2px solid #f5c842;outline-offset:2px;}' +
      '.shub-card.shub-hidden{display:none;}' +
      '.shub-card-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;}' +
      '.shub-scope{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.1em;text-transform:uppercase;' +
        'border-radius:999px;padding:.22rem .5rem;}' +
      '.shub-scope-national{color:#9ec8ff;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);}' +
      '.shub-scope-local{color:#7ee2a8;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);}' +
      '.shub-doc{font:700 .56rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;' +
        'border-radius:999px;padding:.22rem .48rem;border:1px solid transparent;white-space:nowrap;}' +
      '.shub-doc-strong{color:#7ee2a8;background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.3);}' +
      '.shub-doc-moderate{color:#f5d77a;background:rgba(245,200,66,.1);border-color:rgba(245,200,66,.3);}' +
      '.shub-doc-limited{color:#a9bbd6;background:rgba(159,180,212,.08);border-color:rgba(159,180,212,.24);}' +
      '.shub-title{font:700 1.02rem/1.2 "Barlow Condensed",sans-serif;color:#fff;margin-top:.15rem;}' +
      '.shub-place{font:600 .68rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '.shub-blurb{font:500 .8rem/1.45 "Barlow",sans-serif;color:#9fb4d4;' +
        'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.shub-tags{display:flex;flex-wrap:wrap;gap:.3rem;}' +
      '.shub-tag{font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;' +
        'color:#8aa0c4;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.16);border-radius:999px;padding:.2rem .45rem;}' +
      '.shub-foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding-top:.5rem;}' +
      '.shub-cat{display:inline-flex;align-items:center;gap:.28rem;font:700 .58rem/1.1 "Barlow Condensed",sans-serif;letter-spacing:.04em;' +
        'text-transform:uppercase;color:var(--cat,#7d97bd);background:rgba(159,180,212,.06);' +
        'border:1px solid var(--cat,rgba(159,180,212,.28));border-radius:999px;padding:.24rem .55rem;}' +
      '.shub-cta{font:700 .66rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#f5d77a;white-space:nowrap;}' +
      '.shub-empty{display:none;text-align:center;color:#8aa0c4;font:500 .9rem/1.5 "Barlow",sans-serif;padding:2rem 1rem;}' +
      '.shub-empty.is-on{display:flex;flex-direction:column;align-items:center;gap:.9rem;}' +
      '.shub-empty-reset{cursor:pointer;font:700 .72rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;' +
        'color:#f5d77a;background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.4);border-radius:999px;padding:.5rem 1.1rem;' +
        'transition:background .15s,border-color .15s;}' +
      '.shub-empty-reset:hover{background:rgba(245,200,66,.22);border-color:rgba(245,200,66,.65);}' +
      '.shub-crossnav{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;justify-content:center;margin-top:1.6rem;' +
        'padding-top:1.2rem;border-top:1px dashed rgba(159,180,212,.18);}' +
      '.shub-crossnav-lab{font:700 .66rem/1 "Barlow Condensed",sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#7d97bd;}' +
      '.shub-crossnav-link{font:700 .74rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#9ec8ff;' +
        'background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.28);border-radius:999px;padding:.4rem .75rem;' +
        'text-decoration:none;transition:background .15s,border-color .15s,transform .1s;}' +
      '.shub-crossnav-link:hover{background:rgba(96,165,250,.2);border-color:rgba(96,165,250,.55);transform:translateY(-1px);}' +
      '@media (max-width:640px){.shub-grid{grid-template-columns:1fr;}.shub-head-title{font-size:1.3rem;}}';
    var st = document.createElement('style');
    st.id = 'sh-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function render() {
    var host = document.getElementById('all-spotlights');
    var grid = document.getElementById('shub-grid');
    if (!host || !grid) return false;
    var api = window.PDXSpotlight;
    if (!api || typeof api.list !== 'function') return false;

    var list = api.list() || [];
    if (!list.length) return false;

    injectCss();
    grid.innerHTML = list.map(function (sp) { return cardHtml(sp, api); }).join('');
    grid.querySelectorAll('[data-slug]').forEach(function (b) {
      b.addEventListener('click', function () {
        var slug = b.getAttribute('data-slug');
        if (window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') window.PDXSpotlight.open(slug);
      });
    });

    buildChips(list);

    var input = document.getElementById('sh-search');
    if (input && !input._shWired) {
      input._shWired = true;
      input.addEventListener('input', function () { _state.q = input.value || ''; applyFilter(); });
    }
    // Give the empty state a one-tap way back to the full collection.
    var empty = document.getElementById('shub-empty');
    if (empty && !empty._shEnhanced) {
      empty._shEnhanced = true;
      empty.innerHTML = '<div class="shub-empty-msg">No spotlights match that filter yet. Try a broader topic or clear the search.</div>' +
        '<button type="button" class="shub-empty-reset" id="shub-empty-reset">↺ Reset filters</button>';
      var rb = document.getElementById('shub-empty-reset');
      if (rb) rb.addEventListener('click', clearFilters);
    }
    applyFilter();
    _built = true;
    return true;
  }

  function boot(tries) {
    if (render()) return;
    if (tries > 40) return;
    setTimeout(function () { boot((tries || 0) + 1); }, 200);
  }

  window.PDXSpotlightHub = {
    render: render,
    // Focus the hub: scroll it into view and, optionally, preset a scope/search.
    focus: function (opts) {
      opts = opts || {};
      if (!_built) render();
      if (opts.scope) { _state.scope = opts.scope; syncChips(); applyFilter(); }
      if (typeof opts.q === 'string') {
        _state.q = opts.q;
        var input = document.getElementById('sh-search');
        if (input) input.value = opts.q;
        applyFilter();
      }
      var host = document.getElementById('all-spotlights');
      if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else { boot(0); }
})();
