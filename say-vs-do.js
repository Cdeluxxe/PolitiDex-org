/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Say vs. Do  ·  window.PDXReceipts
   ────────────────────────────────────────────────────────────────────────────
   Bet 1: make the contradiction the hero. A "receipt" is one checkable claim —
   what a politician SAID lined up against what they actually DID — stamped with
   a plain-language verdict and always carrying its source + date.

   NO NEW DATA. Every receipt is assembled from capabilities the app already
   ships, entirely client-side:

     • window.ACCT_SPOTLIGHT   the curated, sourced accountability layer. Each
                               item is a real, dated public-record event with an
                               `impact` ('negative' = reversal / inconsistency /
                               rhetoric-vs-reality, 'positive' = words matched
                               actions), a `category`, `tags`, `headline`,
                               `facts`, `why`, `date` and a `source {label,url}`.
                               This is the DID side (and the verdict).
     • window.ISSUE_STANCE_DATA the stated-position layer, keyed by the SAME
                               ISSUE_MAP issueKey. When a politician has a stated
                               stance on the very issue an accountability item
                               touches, we surface it as the SAID side — making
                               the contradiction explicit and undeniable.
     • window.ACCT_ALIAS / PROFILES / CMP_DATA / _getPhotoUrl / ISSUE_MAP
                               identity, photo and issue-label resolution — all
                               already global.

   The module exposes:
     PDXReceipts.collect()        → ranked array of receipt objects (cached)
     PDXReceipts.cardHTML(r,opts) → the full receipt card markup
     PDXReceipts.forPolitician(id)→ strongest receipt for one id (or null)
     PDXReceipts.rowBadge(id)     → tiny verdict chip for a search row
     PDXReceipts.mount()          → render + rotate the homepage hero band
     PDXReceipts.refresh()        → rebuild + re-render (roster grew, etc.)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXReceipts) return; // idempotent

  // ── escape helpers ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  // ── identity / issue resolution (all sources may load async) ────────────────
  function alias(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function polRec(id) {
    var p = null;
    try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
    if (!p) { try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) p = CMP_DATA[id]; } catch (e) {} }
    return p;
  }
  function prettyName(id) {
    return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function photoFor(id) {
    try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
    return '';
  }
  function partyChip(raw) {
    var p = String(raw || '').trim().toUpperCase();
    if (!p) return null;
    var c = p.charAt(0);
    if (c === 'R') return { label: 'R', color: '#f87171' };
    if (c === 'D') return { label: 'D', color: '#60a5fa' };
    if (c === 'I') return { label: 'IND', color: '#a78bfa' };
    return { label: p.slice(0, 3), color: '#94a3b8' };
  }
  function issueMeta(key) {
    var im = (window.ISSUE_MAP) || {};
    var def = key && im[key];
    if (!def || !def.label) return null;
    var m = String(def.label).match(/^\s*(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
    return m ? { icon: m[1], label: m[2] || def.label } : { icon: '🎯', label: def.label };
  }
  // First stated stance a politician has on `issueKey` (the SAID side).
  function stanceFor(id, issueKey) {
    if (!issueKey) return null;
    var SD = window.ISSUE_STANCE_DATA || {};
    var pick = function (pid) {
      var list = SD[pid];
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (s && s.issueKey === issueKey && (s.text || s.topic)) return s;
      }
      return null;
    };
    return pick(id) || pick(alias(id)) || null;
  }
  function stanceWord(s) {
    var v = (s && (s.issueStance || s.pos)) || '';
    if (v === 'support') return 'Supports';
    if (v === 'oppose') return 'Opposes';
    if (v === 'mixed') return 'Mixed on';
    return 'On';
  }
  function yearOf(date) {
    var m = String(date || '').match(/(19|20)\d{2}/g);
    return m ? parseInt(m[m.length - 1], 10) : 0; // latest year mentioned
  }

  // ── verdict stamp (honest — never overclaims a contradiction) ───────────────
  //   positive + stance   → words matched actions
  //   positive            → backed it up
  //   negative + rhetoric  → says one thing, does another (the contradiction)
  //   negative transparency/legal/other → a red flag, framed precisely
  function verdictOf(item, hasStance) {
    var tags = item.tags || [];
    var isRhetoric = item.category === 'rhetoric' ||
      (tags.indexOf && tags.indexOf('Rhetoric vs Reality') !== -1);
    if (item.impact === 'positive') {
      return hasStance
        ? { key: 'consistent', cls: 'v-consistent', ico: '✓', label: 'Words Match Actions', rank: 2 }
        : { key: 'consistent', cls: 'v-consistent', ico: '✓', label: 'Backed It Up', rank: 2 };
    }
    // negative
    if (item.category === 'legal') {
      return { key: 'flag', cls: 'v-flag', ico: '⚖', label: 'Legal Red Flag', rank: 3 };
    }
    if (hasStance || isRhetoric) {
      return { key: 'contradicts', cls: 'v-contradicts', ico: '⚠', label: 'Says One Thing · Does Another', rank: 5 };
    }
    if (item.category === 'transparency') {
      return { key: 'flag', cls: 'v-flag', ico: '🔍', label: 'Transparency Red Flag', rank: 3 };
    }
    return { key: 'flag', cls: 'v-flag', ico: '⚑', label: 'Red Flag On Record', rank: 3 };
  }

  // ── build the receipt set ───────────────────────────────────────────────────
  var _cache = null, _cacheKey = '';
  function buildKey() {
    var acct = 0;
    try { acct = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) {}
    var prof = 0;
    try { prof = window.PROFILES ? Object.keys(window.PROFILES).length : 0; } catch (e) {}
    var sd = 0;
    try { sd = window.ISSUE_STANCE_DATA ? Object.keys(window.ISSUE_STANCE_DATA).length : 0; } catch (e) {}
    return acct + ':' + prof + ':' + sd;
  }

  function collect() {
    var key = buildKey();
    if (_cache && key === _cacheKey) return _cache;
    _cacheKey = key;

    var ACCT = window.ACCT_SPOTLIGHT || {};
    var out = [];
    Object.keys(ACCT).forEach(function (pid) {
      var items = ACCT[pid];
      if (!Array.isArray(items)) return;
      var d = polRec(pid) || polRec(alias(pid));
      var name = (d && d.name) || prettyName(pid);
      var hasOffice = !!(d && (d.office || d.district));
      var sub = d
        ? [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
            .filter(Boolean).join(' · ')
        : '';
      var party = d ? partyChip(d.party) : null;
      var photo = photoFor(pid) || photoFor(alias(pid));

      items.forEach(function (it) {
        if (!it || (it.impact !== 'negative' && it.impact !== 'positive')) return;
        if (!it.headline || !it.source || !it.source.url) return; // must be checkable
        var st = stanceFor(pid, it.issueKey);
        var verdict = verdictOf(it, !!st);
        var im = issueMeta(it.issueKey);

        // Ranking: contradictions first, prefer explicit say/do pairs, known
        // officeholders and recent, sourced events.
        var score = verdict.rank * 100;
        if (st) score += 120;                    // explicit SAID + DID
        if (hasOffice) score += 30;
        if (it.facts) score += 8;
        score += Math.max(0, yearOf(it.date) - 2000); // recency nudge

        out.push({
          pid: pid, name: name, sub: sub, party: party, photo: photo, hasOffice: hasOffice,
          issueKey: it.issueKey || '', issue: im,
          said: st ? { text: st.text || st.topic, word: stanceWord(st) } : null,
          headline: it.headline, facts: it.facts || it.body || '', why: it.why || '',
          date: it.date || '', source: it.source, category: it.category || '',
          impact: it.impact, verdict: verdict, score: score
        });
      });
    });

    out.sort(function (a, b) { return b.score - a.score; });
    _cache = out;
    return out;
  }

  // Only one strongest receipt per politician (used for the hero + search so the
  // same person doesn't dominate the rotation).
  function collectDistinct(filterFn) {
    var seen = {}, list = [];
    collect().forEach(function (r) {
      if (filterFn && !filterFn(r)) return;
      if (seen[r.pid]) return;
      seen[r.pid] = 1; list.push(r);
    });
    return list;
  }

  function forPolitician(id) {
    if (!id) return null;
    var all = collect(), best = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].pid === id || all[i].pid === alias(id) || alias(all[i].pid) === id) {
        if (!best || all[i].score > best.score) best = all[i];
      }
    }
    return best;
  }

  // ── card renderers ──────────────────────────────────────────────────────────
  function srcHTML(r) {
    var label = (r.source && r.source.label) || 'Source';
    return '<a class="svd-rc-src" href="' + escAttr(r.source.url) + '" target="_blank" rel="noopener" ' +
      'onclick="event.stopPropagation()" title="Open the source ↗">' +
      '<span aria-hidden="true">📎</span><span class="svd-src-label">' + esc(label) + '</span>' +
      '<span aria-hidden="true">↗</span></a>';
  }
  function photoHTML(r, cls) {
    if (r.photo) {
      return '<span class="' + cls + '"><img src="' + escAttr(r.photo) + '" alt="" loading="lazy" ' +
        'onerror="this.style.display=\'none\';this.parentNode.textContent=\'🏛\'"></span>';
    }
    return '<span class="' + cls + '">🏛</span>';
  }

  function cardHTML(r, opts) {
    opts = opts || {};
    var v = r.verdict;
    var party = r.party
      ? '<span class="svd-rc-party" style="color:' + r.party.color + ';background:' + r.party.color +
        '22;border:1px solid ' + r.party.color + '55;">' + esc(r.party.label) + '</span>'
      : '';
    var issue = r.issue
      ? '<div class="svd-rc-issue">' + esc(r.issue.icon) + ' ' + esc(r.issue.label) + '</div>'
      : '';

    var said = r.said
      ? '<div class="svd-line svd-said">' +
          '<span class="svd-line-tag" aria-hidden="true">💬</span>' +
          '<div class="svd-line-label">They said</div>' +
          '<div class="svd-line-text">' + esc(r.said.word) + ': "' + esc(r.said.text) + '"</div>' +
        '</div>'
      : '';

    var didLabel = r.impact === 'positive' ? 'And the record shows' : 'But the record shows';
    var detail = r.facts
      ? '<div class="svd-line-detail">' + esc(r.facts) + '</div>'
      : (r.why ? '<div class="svd-line-detail">' + esc(r.why) + '</div>' : '');
    var did =
      '<div class="svd-line svd-did">' +
        '<span class="svd-line-tag" aria-hidden="true">⚖</span>' +
        '<div class="svd-line-label">' + esc(didLabel) + '</div>' +
        '<div class="svd-line-text svd-line-headline">' + esc(r.headline) + '</div>' +
        detail +
      '</div>';

    return '<div class="svd-receipt ' + v.cls + '" role="button" tabindex="0" ' +
        'data-pid="' + escAttr(r.pid) + '" aria-label="' + escAttr(r.name + ' — ' + v.label) + '. Open profile.">' +
        '<div class="svd-rc-head">' +
          photoHTML(r, 'svd-rc-photo') +
          '<div class="svd-rc-id">' +
            '<div class="svd-rc-name">' + esc(r.name) + party + '</div>' +
            (r.sub ? '<div class="svd-rc-sub">' + esc(r.sub) + '</div>' : '') +
          '</div>' +
          '<div class="svd-stamp"><div class="svd-stamp-ico" aria-hidden="true">' + v.ico + '</div>' +
            '<div class="svd-stamp-v">' + esc(v.label) + '</div></div>' +
        '</div>' +
        issue + said + did +
        '<div class="svd-rc-foot">' + srcHTML(r) +
          (r.date ? '<span class="svd-rc-date">' + esc(r.date) + '</span>' : '') +
          '<span class="svd-rc-more">See full profile →</span>' +
        '</div>' +
      '</div>';
  }

  function miniHTML(r) {
    return '<div class="svd-mini ' + r.verdict.cls + '" role="button" tabindex="0" ' +
        'data-pid="' + escAttr(r.pid) + '" aria-label="' + escAttr(r.name + ' — ' + r.verdict.label) + '. Open profile.">' +
        '<div class="svd-mini-top">' + photoHTML(r, 'svd-mini-photo') +
          '<div><div class="svd-mini-name">' + esc(r.name) + '</div>' +
          '<div class="svd-mini-verd">' + r.verdict.ico + ' ' + esc(r.verdict.label) + '</div></div>' +
        '</div>' +
        '<div class="svd-mini-head">' + esc(r.headline) + '</div>' +
        '<div class="svd-mini-foot"><span class="svd-mini-src">📎 ' +
          esc((r.source && r.source.label) || 'Source') + '</span>' +
          (r.date ? '<span>· ' + esc(r.date) + '</span>' : '') + '</div>' +
      '</div>';
  }

  // Tiny verdict chip for the All-Seeing Eye politician rows.
  function rowBadge(id) {
    var r = forPolitician(id);
    if (!r) return '';
    return '<span class="svd-eye-badge ' + r.verdict.cls + '" title="' + escAttr('Say vs. Do: ' + r.verdict.label) + '">' +
      r.verdict.ico + ' ' + esc(r.verdict.label) + '</span>';
  }

  // ── homepage hero band ──────────────────────────────────────────────────────
  var _rot = null, _idx = 0, _featured = [];
  function stopRotation() { if (_rot) { clearInterval(_rot); _rot = null; } }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function paintFeatured() {
    var stage = document.getElementById('svd-stage');
    if (!stage || !_featured.length) return;
    _idx = ((_idx % _featured.length) + _featured.length) % _featured.length;
    stage.innerHTML = cardHTML(_featured[_idx]);
    var dots = document.querySelectorAll('#say-vs-do .svd-dot');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-active', i === _idx);
    var cnt = document.getElementById('svd-count');
    if (cnt) cnt.textContent = (_idx + 1) + ' / ' + _featured.length;
  }
  function go(delta) { _idx += delta; paintFeatured(); }

  function mount() {
    var host = document.getElementById('say-vs-do');
    if (!host) return;

    // Featured = strongest contradictions, one per politician. Strip = a wider
    // mix (contradictions + a couple of "backed it up" for a fair, nonpartisan
    // read). Hide the whole band if there is genuinely nothing to show.
    var contradictions = collectDistinct(function (r) { return r.verdict.key === 'contradicts'; });
    var backed = collectDistinct(function (r) { return r.verdict.key === 'consistent'; });

    if (!contradictions.length && !backed.length) { host.hidden = true; return; }
    host.hidden = false;

    _featured = (contradictions.length ? contradictions : backed).slice(0, 8);

    // Strip: the next contradictions, plus up to 2 "backed it up" receipts so the
    // hero can't read as one-sided. Exclude whoever is already featured first.
    var featuredPids = {};
    _featured.forEach(function (r) { featuredPids[r.pid] = 1; });
    var stripPool = contradictions.filter(function (r) { return !featuredPids[r.pid]; });
    var strip = stripPool.slice(0, 4).concat(backed.filter(function (r) { return !featuredPids[r.pid]; }).slice(0, 2));
    strip = strip.slice(0, 6);

    var total = collectDistinct().length;
    var stampCount = contradictions.length;

    var stripHTML = strip.length
      ? '<div class="svd-strip-h">More receipts — every claim links to its source</div>' +
        '<div class="svd-strip">' + strip.map(miniHTML).join('') + '</div>'
      : '';

    host.innerHTML =
      '<div class="svd-inner">' +
        '<div class="svd-head">' +
          '<div class="svd-eyebrow">🧾 The Receipts</div>' +
          '<h2 class="svd-title"><span class="svd-say">Say</span><span class="svd-vs">vs.</span>' +
            '<span class="svd-do">Do</span></h2>' +
          '<p class="svd-lead">The fastest way to know a politician: put <strong>what they said</strong> ' +
            'next to <strong>what they actually did</strong>. Every card below is a real, dated, ' +
            'sourced receipt — verdict stamped. This is the difference.</p>' +
        '</div>' +
        '<div class="svd-stage" id="svd-stage"></div>' +
        (_featured.length > 1
          ? '<div class="svd-controls">' +
              '<button type="button" class="svd-nav" id="svd-prev" aria-label="Previous receipt">‹</button>' +
              '<div class="svd-dots" id="svd-dots">' +
                _featured.map(function (_, i) {
                  return '<button type="button" class="svd-dot' + (i === 0 ? ' is-active' : '') +
                    '" data-i="' + i + '" aria-label="Receipt ' + (i + 1) + '"></button>';
                }).join('') +
              '</div>' +
              '<span class="svd-count" id="svd-count">1 / ' + _featured.length + '</span>' +
              '<button type="button" class="svd-nav" id="svd-next" aria-label="Next receipt">›</button>' +
            '</div>'
          : '') +
        stripHTML +
        '<div class="svd-cta">' +
          '<a class="svd-cta-btn" href="#myteam-browse-panel">🔎 Check anyone on your ballot</a>' +
          '<div class="svd-cta-note">' + (stampCount ? stampCount + ' contradictions on record · ' : '') +
            total + ' sourced receipts and counting · nonpartisan</div>' +
        '</div>' +
      '</div>';

    _idx = 0;
    paintFeatured();

    // ── interactions ─────────────────────────────────────────────────────────
    var prev = document.getElementById('svd-prev');
    var next = document.getElementById('svd-next');
    if (prev) prev.addEventListener('click', function () { go(-1); restart(); });
    if (next) next.addEventListener('click', function () { go(1); restart(); });
    var dots = document.getElementById('svd-dots');
    if (dots) dots.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.svd-dot');
      if (!b) return; _idx = parseInt(b.getAttribute('data-i'), 10) || 0; paintFeatured(); restart();
    });

    // Open a profile from any receipt (featured card or a strip mini). Bound
    // once per host element so repeated refresh()/mount() calls (e.g. when the
    // live roster loads) can't stack duplicate handlers.
    if (!host._svdBound) {
      host._svdBound = true;
      host.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('[data-pid]');
        if (!el || (e.target.closest && e.target.closest('a'))) return;
        var pid = el.getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
      });
      host.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var el = e.target.closest && e.target.closest('[data-pid]');
        if (!el) return;
        e.preventDefault();
        var pid = el.getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
      });
    }

    // Auto-rotate the featured receipt (paused on hover / when off-screen).
    restart();
    var stage = document.getElementById('svd-stage');
    if (stage) {
      stage.addEventListener('mouseenter', stopRotation);
      stage.addEventListener('mouseleave', restart);
    }
  }

  function restart() {
    stopRotation();
    if (reducedMotion() || _featured.length < 2) return;
    _rot = setInterval(function () { go(1); }, 7000);
  }

  function refresh() { _cache = null; _cacheKey = ''; mount(); }

  window.PDXReceipts = {
    collect: collect,
    forPolitician: forPolitician,
    cardHTML: cardHTML,
    rowBadge: rowBadge,
    mount: mount,
    refresh: refresh
  };

  // Initial mount + one delayed refresh so names/photos fill in once the live
  // roster (PROFILES) resolves. Cheap and idempotent.
  function boot() {
    try { mount(); } catch (e) {}
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var k = buildKey();
      if (k !== _cacheKey) { try { refresh(); } catch (e) {} }
      if (tries >= 8) clearInterval(t);
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
