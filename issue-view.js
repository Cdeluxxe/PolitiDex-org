/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Issue View  ·  window.PDXIssueView
   ────────────────────────────────────────────────────────────────────────────
   Move 2: the issue-first ranked view. A "question-first" voter doesn't start
   with a name — they start with a question ("Who's actually consistent on guns?
   Who says one thing on taxes and does another?"). This is the front door for
   that voter: pick an issue, and every tracked politician is ranked on THAT
   issue by consistency — did they back up their words, or contradict them — with
   the exact say-vs-do receipt one tap away.

   NO NEW DATA. Every ranking is assembled client-side from globals the app
   already ships:

     • window.CORE_NATIONAL_ISSUES  the curated set of front-door issues, each a
                                    bundle of ISSUE_MAP issueKeys (the shared
                                    vocabulary). This is the issue list.
     • window.PDXReceipts.collect() the say-vs-do layer — every sourced receipt
                                    with a verdict (consistent / contradicts /
                                    flag) and its issueKey. This is the DID side
                                    and the consistency signal.
     • window.ISSUE_STANCE_DATA     the stated-position layer, keyed by issueKey.
                                    This is the SAID side (surfaces people who
                                    have staked out a position but haven't yet
                                    been checked).
     • window.PROFILES / CMP_DATA / ACCT_ALIAS / _getPhotoUrl
                                    identity, photo and alias resolution.

   Exposes:
     PDXIssueView.open(coreKeyOrIssueKey)  → open the ranked overlay for an issue
     PDXIssueView.close()                  → close it
     PDXIssueView.mountFrontDoor()         → render the #issue-front-door grid
     PDXIssueView.searchIssues(q)          → matching issues for the global search
     PDXIssueView.refresh()                → drop caches + re-render (roster grew)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueView) return; // idempotent

  // ── escape / dom helpers ────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }
  function G(name) { try { return window[name]; } catch (e) { return null; } }
  function el(id) { return document.getElementById(id); }

  // ── identity resolution (mirrors say-vs-do.js so the two never drift) ────────
  function canon(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function polRec(id) {
    var P = G('PROFILES'); if (P && P[id]) return P[id];
    var C = G('CMP_DATA'); if (C && C[id]) return C[id];
    return null;
  }
  function prettyName(id) {
    return String(id || '').split(/[_\-]/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function polName(id) {
    var f = G('_pdxPoliticianName');
    if (typeof f === 'function') { var n = f(id); if (n && n !== id) return n; }
    var d = polRec(id); if (d && d.name) return d.name;
    return prettyName(id);
  }
  function photoFor(id) {
    try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
    return '';
  }
  function partyChip(raw) {
    var p = String(raw || '').trim().toUpperCase();
    if (!p) return null;
    var c = p.charAt(0);
    if (c === 'R') return { key: 'R', label: 'R', color: '#f87171' };
    if (c === 'D') return { key: 'D', label: 'D', color: '#60a5fa' };
    if (c === 'I') return { key: 'I', label: 'IND', color: '#a78bfa' };
    return { key: 'I', label: p.slice(0, 3), color: '#94a3b8' };
  }
  function subFor(d) {
    if (!d) return '';
    return [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
      .filter(Boolean).join(' · ');
  }

  // ── issue vocabulary ────────────────────────────────────────────────────────
  function coreIssues() { return G('CORE_NATIONAL_ISSUES') || []; }
  function coreByKey(key) {
    var list = coreIssues();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  // Accept either a core-issue key ("guns") or a raw ISSUE_MAP key ("gun_rights")
  // and resolve to the core issue it belongs to, so search / deep-links are lenient.
  function resolveCore(k) {
    if (!k) return null;
    var direct = coreByKey(k);
    if (direct) return direct;
    var f = G('coreIssueForKey');
    if (typeof f === 'function') { var c = f(k); if (c) return c; }
    return null;
  }
  function splitLabel(label) {
    label = String(label || '').trim();
    var sp = label.indexOf(' ');
    if (sp > 0) {
      var head = label.slice(0, sp);
      if (/[^\x00-\x7F]/.test(head)) return { icon: head, text: label.slice(sp + 1).trim() };
    }
    return { icon: '🎯', text: label };
  }

  // ── verdict → consistency tier ───────────────────────────────────────────────
  var TIERS = {
    consistent:    { cls: 'iv-consistent',    ico: '✓', label: 'Backs it up' },
    mixed:         { cls: 'iv-mixed',         ico: '≈', label: 'Mixed record' },
    flag:          { cls: 'iv-flag',          ico: '⚑', label: 'Red flag on record' },
    contradiction: { cls: 'iv-contradiction', ico: '⚠', label: 'Says one thing · does another' },
    stated:        { cls: 'iv-stated',        ico: '💬', label: 'Stated — not yet checked' }
  };

  // ── data cache, keyed like PDXReceipts so it rebuilds exactly when data grows ─
  var _key = '';
  var _rankCache = {};   // coreKey → ranked rows
  var _counts = null;    // coreKey → { documented, receipts, total }

  function dataKey() {
    var acct = 0, prof = 0, sd = 0;
    try { acct = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) {}
    try { prof = window.PROFILES ? Object.keys(window.PROFILES).length : 0; } catch (e) {}
    try { sd = window.ISSUE_STANCE_DATA ? Object.keys(window.ISSUE_STANCE_DATA).length : 0; } catch (e) {}
    return acct + ':' + prof + ':' + sd;
  }
  function ensureFresh() {
    var k = dataKey();
    if (k !== _key) { _key = k; _rankCache = {}; _counts = null; }
  }

  // Receipts grouped by canonical politician id, once per data version.
  var _byPid = null;
  function receiptsByPid() {
    ensureFresh();
    if (_byPid && _byPidKey === _key) return _byPid;
    _byPid = {}; _byPidKey = _key;
    var R = G('PDXReceipts');
    if (!R || typeof R.collect !== 'function') return _byPid;
    var all = [];
    try { all = R.collect() || []; } catch (e) { all = []; }
    all.forEach(function (r) {
      var id = canon(r.pid);
      (_byPid[id] || (_byPid[id] = [])).push(r);
    });
    return _byPid;
  }
  var _byPidKey = '';

  // Stances grouped by canonical politician id.
  var _stanceByPid = null, _stanceKey = '';
  function stancesByPid() {
    ensureFresh();
    if (_stanceByPid && _stanceKey === _key) return _stanceByPid;
    _stanceByPid = {}; _stanceKey = _key;
    var SD = G('ISSUE_STANCE_DATA') || {};
    Object.keys(SD).forEach(function (pid) {
      var list = SD[pid];
      if (!Array.isArray(list)) return;
      _stanceByPid[canon(pid)] = list;
    });
    return _stanceByPid;
  }

  function stanceWordOf(s) {
    var v = (s && (s.issueStance || s.pos)) || '';
    if (v === 'support') return 'Supports';
    if (v === 'oppose') return 'Opposes';
    if (v === 'mixed') return 'Mixed on';
    return 'On';
  }

  // ── the ranking ───────────────────────────────────────────────────────────────
  // For a core issue (a bundle of issueKeys), rank every politician who has ANY
  // signal on it — a receipt or a stated position — by a consistency value:
  //   base 50 (neutral / unchecked)
  //   + 20 per receipt where words matched actions
  //   − 30 per documented contradiction
  //   − 12 per red flag
  // clamped to 0–100. Higher = more consistent, so the sort is "who backs up
  // their words → who contradicts them". Ties break toward the more-documented
  // record, then alphabetically.
  function buildRanking(core) {
    ensureFresh();
    if (_rankCache[core.key]) return _rankCache[core.key];

    var keySet = Object.create(null);
    (core.keys || []).forEach(function (k) { keySet[k] = 1; });

    var byR = receiptsByPid();
    var byS = stancesByPid();
    var ids = {};
    Object.keys(byR).forEach(function (id) { ids[id] = 1; });
    Object.keys(byS).forEach(function (id) { ids[id] = 1; });

    var rows = [];
    Object.keys(ids).forEach(function (id) {
      // Receipts on this issue, strongest first (collect() is pre-sorted by score).
      var receipts = (byR[id] || []).filter(function (r) { return keySet[r.issueKey]; });
      // Stances on this issue.
      var stances = (byS[id] || []).filter(function (s) { return s && keySet[s.issueKey] && (s.text || s.topic); });
      if (!receipts.length && !stances.length) return; // no signal → not ranked

      var consistent = 0, contradicts = 0, flags = 0;
      receipts.forEach(function (r) {
        var kk = r.verdict && r.verdict.key;
        if (kk === 'consistent') consistent++;
        else if (kk === 'contradicts') contradicts++;
        else flags++;
      });

      var tierKey;
      if (contradicts > 0 && consistent > 0) tierKey = 'mixed';
      else if (contradicts > 0) tierKey = 'contradiction';
      else if (consistent > 0) tierKey = 'consistent';
      else if (flags > 0) tierKey = 'flag';
      else tierKey = 'stated';

      var value = 50 + consistent * 20 - contradicts * 30 - flags * 12;
      if (value < 0) value = 0; if (value > 100) value = 100;

      var top = receipts[0] || null;
      var stance = stances[0] || null;

      // Display identity — prefer the receipt's already-resolved fields.
      var d = polRec(id);
      var name = (top && top.name) || (d && d.name) || polName(id);
      var party = (top && top.party) || partyChip(d && d.party);
      var photo = (top && top.photo) || photoFor(id);
      var sub = (top && top.sub) || subFor(d);

      rows.push({
        id: id, name: name, party: party, photo: photo, sub: sub,
        consistent: consistent, contradicts: contradicts, flags: flags,
        receiptCount: receipts.length,
        tier: TIERS[tierKey], tierKey: tierKey, value: value,
        topReceiptPid: top ? top.pid : '', topReceiptIssue: top ? (top.issueKey || '') : '',
        topHeadline: top ? top.headline : '',
        stanceWord: stance ? stanceWordOf(stance) : '',
        stanceText: stance ? (stance.text || stance.topic || '') : '',
        stanceIssue: stance ? stance.issueKey : ''
      });
    });

    rows.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      if (b.receiptCount !== a.receiptCount) return b.receiptCount - a.receiptCount;
      return (a.name || '').localeCompare(b.name || '');
    });

    _rankCache[core.key] = rows;
    return rows;
  }

  // Per-issue coverage counts for the front door, in one pass.
  function counts() {
    ensureFresh();
    if (_counts) return _counts;
    var out = {};
    coreIssues().forEach(function (c) { out[c.key] = { documented: 0, receipts: 0 }; });
    coreIssues().forEach(function (c) {
      var rows = buildRanking(c);
      var recPeople = 0;
      rows.forEach(function (r) { if (r.receiptCount > 0) recPeople++; });
      out[c.key] = { documented: rows.length, receipts: recPeople };
    });
    _counts = out;
    return out;
  }

  function totalTracked() {
    var P = G('PROFILES'), C = G('CMP_DATA');
    var n = 0;
    try { if (P) n = Math.max(n, Object.keys(P).length); } catch (e) {}
    try { if (C) n = Math.max(n, Object.keys(C).length); } catch (e) {}
    return n;
  }

  // ── overlay state ─────────────────────────────────────────────────────────────
  var _open = false, _coreKey = '', _fMode = 'all', _fParty = '', _lastFocus = null;

  function meterHTML(r) {
    return '<div class="iv-meter" aria-hidden="true"><span class="iv-meter-fill ' +
      r.tier.cls + '" style="width:' + r.value + '%;"></span></div>';
  }

  function countsLine(r) {
    var parts = [];
    if (r.consistent) parts.push(r.consistent + ' kept');
    if (r.contradicts) parts.push(r.contradicts + ' broken');
    if (r.flags) parts.push(r.flags + ' flag' + (r.flags === 1 ? '' : 's'));
    if (!parts.length && r.stanceWord) parts.push('position stated');
    return parts.join(' · ');
  }

  function rowHTML(r, rank) {
    var party = r.party
      ? '<span class="iv-row-party" style="color:' + r.party.color + ';background:' + r.party.color +
        '22;border:1px solid ' + r.party.color + '55;">' + esc(r.party.label) + '</span>'
      : '';
    var photo = r.photo
      ? '<span class="iv-row-photo"><img src="' + escAttr(r.photo) + '" alt="" loading="lazy" ' +
        'onerror="this.style.display=\'none\';this.parentNode.textContent=\'🏛\'"></span>'
      : '<span class="iv-row-photo">🏛</span>';

    var stance = r.stanceText
      ? '<div class="iv-row-stance"><span class="iv-row-stance-w">' + esc(r.stanceWord) +
        ':</span> “' + esc(r.stanceText.length > 150 ? r.stanceText.slice(0, 148) + '…' : r.stanceText) + '”</div>'
      : '';

    // The payoff: the receipt one tap away. When there's a receipt we open the
    // exact say-vs-do card; otherwise the row just leads to the profile.
    var receiptBtn = r.topReceiptPid
      ? '<button type="button" class="iv-receipt-btn" data-receipt="1" ' +
          'data-pid="' + escAttr(r.topReceiptPid) + '" data-issue="' + escAttr(r.topReceiptIssue) + '">' +
          '🧾 See the receipt</button>'
      : '<button type="button" class="iv-receipt-btn iv-receipt-btn--ghost" data-profile="1" ' +
          'data-pid="' + escAttr(r.id) + '">View profile →</button>';

    return '<li class="iv-row ' + r.tier.cls + '" data-pid="' + escAttr(r.id) + '">' +
        '<span class="iv-rank">' + rank + '</span>' +
        photo +
        '<div class="iv-row-main">' +
          '<div class="iv-row-id"><span class="iv-row-name">' + esc(r.name) + '</span>' + party +
            (r.sub ? '<span class="iv-row-sub">' + esc(r.sub) + '</span>' : '') + '</div>' +
          stance +
          '<div class="iv-row-verdict"><span class="iv-badge ' + r.tier.cls + '">' +
            r.tier.ico + ' ' + esc(r.tier.label) + '</span>' +
            '<span class="iv-row-counts">' + esc(countsLine(r)) + '</span></div>' +
          meterHTML(r) +
        '</div>' +
        '<div class="iv-row-actions">' + receiptBtn + '</div>' +
      '</li>';
  }

  function switcherHTML(activeKey) {
    var c = counts();
    return coreIssues().map(function (ci) {
      var lab = splitLabel(ci.label);
      var n = (c[ci.key] && c[ci.key].documented) || 0;
      return '<button type="button" class="iv-chip' + (ci.key === activeKey ? ' is-active' : '') +
        '" data-core="' + escAttr(ci.key) + '" aria-pressed="' + (ci.key === activeKey) + '">' +
        '<span class="iv-chip-ico" aria-hidden="true">' + lab.icon + '</span>' +
        '<span class="iv-chip-txt">' + esc(lab.text) + '</span>' +
        '<span class="iv-chip-n">' + n + '</span></button>';
    }).join('');
  }

  function applyFilter(rows) {
    return rows.filter(function (r) {
      if (_fParty && (!r.party || r.party.key !== _fParty)) return false;
      if (_fMode === 'consistent') return r.tierKey === 'consistent' || r.tierKey === 'mixed';
      if (_fMode === 'contradiction') return r.tierKey === 'contradiction' || r.tierKey === 'flag';
      return true;
    });
  }

  function renderBody() {
    var core = coreByKey(_coreKey);
    var host = el('iv-body');
    if (!core || !host) return;
    var all = buildRanking(core);
    var rows = applyFilter(all);

    var listHTML = rows.length
      ? '<ol class="iv-list">' + rows.map(function (r, i) { return rowHTML(r, i + 1); }).join('') + '</ol>'
      : '<div class="iv-empty">No politicians match this filter yet on ' +
          esc(splitLabel(core.label).text) + '. Try “All”.</div>';

    var total = totalTracked();
    var undocumented = Math.max(0, total - all.length);
    var coverage = '<div class="iv-coverage">Ranking <strong>' + all.length + '</strong> documented on this issue' +
      (undocumented > 0 ? ' · <span class="iv-cov-thin">' + undocumented +
        ' more tracked, not yet documented here</span>' : '') +
      ' · consistency is measured from sourced say-vs-do receipts.</div>';

    host.innerHTML = coverage + listHTML;
  }

  function renderChrome() {
    var core = coreByKey(_coreKey);
    var ov = el('pdx-issue-overlay');
    if (!core || !ov) return;
    var lab = splitLabel(core.label);
    ov.querySelector('.iv-panel').innerHTML =
      '<div class="iv-topbar">' +
        '<div class="iv-eyebrow">🏛 Issue · ranked by consistency</div>' +
        '<button type="button" class="iv-close" aria-label="Close issue view">✕</button>' +
      '</div>' +
      '<header class="iv-head">' +
        '<div class="iv-head-ico" aria-hidden="true">' + lab.icon + '</div>' +
        '<div class="iv-head-txt">' +
          '<h2 class="iv-title">' + esc(lab.text) + '</h2>' +
          '<p class="iv-blurb">Where every tracked politician stands — ranked by who <strong>backs up their words</strong> ' +
            'and who <strong>says one thing and does another</strong>. ' + esc(core.blurb || '') + '</p>' +
        '</div>' +
      '</header>' +
      '<div class="iv-switcher-wrap"><div class="iv-switcher" role="tablist" aria-label="Choose an issue">' +
        switcherHTML(_coreKey) + '</div></div>' +
      '<div class="iv-filters" role="group" aria-label="Filter the ranking">' +
        '<div class="iv-filter-set">' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'all' ? ' is-on' : '') + '" data-fmode="all">All</button>' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'consistent' ? ' is-on' : '') + '" data-fmode="consistent">✓ Backs it up</button>' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'contradiction' ? ' is-on' : '') + '" data-fmode="contradiction">⚠ Contradictions</button>' +
        '</div>' +
        '<div class="iv-filter-set">' +
          '<button type="button" class="iv-fbtn' + (_fParty === '' ? ' is-on' : '') + '" data-fparty="">Any party</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--R' + (_fParty === 'R' ? ' is-on' : '') + '" data-fparty="R">R</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--D' + (_fParty === 'D' ? ' is-on' : '') + '" data-fparty="D">D</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--I' + (_fParty === 'I' ? ' is-on' : '') + '" data-fparty="I">Ind</button>' +
        '</div>' +
      '</div>' +
      '<div class="iv-body" id="iv-body"></div>';
    renderBody();
  }

  function ensureOverlay() {
    var ov = el('pdx-issue-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'pdx-issue-overlay';
    ov.className = 'iv-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Issue ranking');
    ov.innerHTML = '<div class="iv-panel" role="document"></div>';
    document.body.appendChild(ov);

    // One delegated handler for the whole overlay.
    ov.addEventListener('click', function (e) {
      var t = e.target;
      if (t === ov || (t.closest && t.closest('.iv-close'))) { close(); return; }
      var chip = t.closest && t.closest('.iv-chip');
      if (chip) { _coreKey = chip.getAttribute('data-core'); _syncHash(); renderChrome(); scrollTop(); return; }
      var fm = t.closest && t.closest('[data-fmode]');
      if (fm) { _fMode = fm.getAttribute('data-fmode'); renderChrome(); return; }
      var fp = t.closest && t.closest('[data-fparty]');
      if (fp) { _fParty = fp.getAttribute('data-fparty'); renderChrome(); return; }
      var rc = t.closest && t.closest('[data-receipt]');
      if (rc) {
        e.stopPropagation();
        var R = G('PDXReceipts');
        if (R && typeof R.open === 'function') R.open(rc.getAttribute('data-pid'), rc.getAttribute('data-issue'));
        return;
      }
      var row = t.closest && t.closest('.iv-row, [data-profile]');
      if (row) {
        var pid = (t.closest('[data-profile]') || row).getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') { close(); window.showProfile(pid); }
      }
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    return ov;
  }

  function scrollTop() { var b = el('iv-body'); if (b) { try { b.scrollTo({ top: 0 }); } catch (x) { b.scrollTop = 0; } } }

  function open(keyOrIssueKey) {
    var core = resolveCore(keyOrIssueKey) || coreIssues()[0];
    if (!core) return;
    _coreKey = core.key; _fMode = 'all'; _fParty = '';
    _lastFocus = document.activeElement;
    // Record this stop on the guided spine.
    try {
      if (window.PDXJourney && typeof window.PDXJourney.record === 'function') {
        var lab = splitLabel(core.label);
        window.PDXJourney.record('issue', { label: lab.text, icon: lab.icon,
          nav: { type: 'issue', key: core.key } });
      }
    } catch (e) {}
    var ov = ensureOverlay();
    renderChrome();
    ov.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _open = true;
    _syncHash();
    var cb = ov.querySelector('.iv-close'); if (cb) { try { cb.focus(); } catch (e) {} }
  }

  function close() {
    var ov = el('pdx-issue-overlay');
    if (ov) ov.classList.remove('is-open');
    document.body.style.overflow = '';
    _open = false;
    // Clear our own hash marker without disturbing other navigation.
    if (/^#issue(s|=)/.test(location.hash)) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    }
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
    _lastFocus = null;
  }

  function _syncHash() {
    try { history.replaceState(null, '', '#issue=' + encodeURIComponent(_coreKey)); } catch (e) {}
  }

  // ── search bridge (feeds the global search box — Move 1) ─────────────────────
  // Return the core issues whose label / blurb / bundled ISSUE_MAP keywords match
  // the query, so typing "guns" or "cost of living" offers an "issue ranking".
  function searchIssues(q, limit) {
    q = String(q || '').toLowerCase().trim();
    if (q.length < 2) return [];
    var IM = G('ISSUE_MAP') || {};
    var out = [];
    coreIssues().forEach(function (ci) {
      var lab = splitLabel(ci.label);
      var hay = (lab.text + ' ' + (ci.blurb || '')).toLowerCase();
      var hit = hay.indexOf(q) !== -1;
      if (!hit) {
        for (var i = 0; i < (ci.keys || []).length && !hit; i++) {
          var def = IM[ci.keys[i]];
          if (!def) continue;
          if (String(def.label || '').toLowerCase().indexOf(q) !== -1) { hit = true; break; }
          var kw = def.keywords || [];
          for (var j = 0; j < kw.length; j++) { if (String(kw[j]).toLowerCase().indexOf(q) !== -1) { hit = true; break; } }
        }
      }
      if (hit) out.push({ key: ci.key, icon: lab.icon, label: lab.text, blurb: ci.blurb || '' });
    });
    return out.slice(0, limit || 4);
  }

  // ── front door ────────────────────────────────────────────────────────────────
  function mountFrontDoor() {
    var host = el('issue-front-door');
    if (!host) return;
    var list = coreIssues();
    if (!list.length) { host.hidden = true; return; }
    var c = counts();
    var total = totalTracked();

    var cards = list.map(function (ci) {
      var lab = splitLabel(ci.label);
      var n = (c[ci.key] && c[ci.key].documented) || 0;
      var rec = (c[ci.key] && c[ci.key].receipts) || 0;
      return '<button type="button" class="ifd-card" data-core="' + escAttr(ci.key) + '">' +
        '<span class="ifd-ico" aria-hidden="true">' + lab.icon + '</span>' +
        '<span class="ifd-txt">' +
          '<span class="ifd-label">' + esc(lab.text) + '</span>' +
          '<span class="ifd-blurb">' + esc(ci.blurb || '') + '</span>' +
          '<span class="ifd-meta">' + n + ' ranked' + (rec ? ' · ' + rec + ' with receipts' : '') + '</span>' +
        '</span>' +
        '<span class="ifd-go" aria-hidden="true">→</span>' +
      '</button>';
    }).join('');

    host.innerHTML =
      '<div class="ifd-inner">' +
        '<div class="ifd-head">' +
          '<div class="ifd-eyebrow">🧭 Start with an issue</div>' +
          '<h2 class="ifd-title">Where does <em>everyone</em> stand?</h2>' +
          '<p class="ifd-lead">Pick an issue and see every tracked politician ranked by <strong>consistency</strong> — ' +
            'who backs up their words, and who says one thing and does another. The receipt is one tap away.</p>' +
        '</div>' +
        '<div class="ifd-grid">' + cards + '</div>' +
        '<p class="ifd-foot">' + total + ' politicians tracked · rankings are built from sourced say-vs-do receipts and stated positions · nonpartisan.</p>' +
      '</div>';
    host.hidden = false;

    if (!host._ifdBound) {
      host._ifdBound = true;
      host.addEventListener('click', function (e) {
        var card = e.target.closest && e.target.closest('.ifd-card');
        if (card) open(card.getAttribute('data-core'));
      });
    }
  }

  function refresh() {
    _key = ''; ensureFresh();
    if (el('issue-front-door')) { try { mountFrontDoor(); } catch (e) {} }
    if (_open) renderChrome();
  }

  // ── deep-link support ────────────────────────────────────────────────────────
  function handleHash() {
    var h = location.hash || '';
    var m = h.match(/^#issue=([^&]+)/);
    if (m) { open(decodeURIComponent(m[1])); return; }
    if (/^#issues?$/.test(h)) {
      var fd = el('issue-front-door');
      if (fd && typeof fd.scrollIntoView === 'function') fd.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.PDXIssueView = {
    open: open,
    close: close,
    mountFrontDoor: mountFrontDoor,
    searchIssues: searchIssues,
    buildRanking: buildRanking,
    refresh: refresh
  };

  // ── boot ───────────────────────────────────────────────────────────────────────
  function boot() {
    try { mountFrontDoor(); } catch (e) {}
    try { handleHash(); } catch (e) {}
    window.addEventListener('hashchange', function () { try { handleHash(); } catch (e) {} });
    // Re-render once the live roster + receipts resolve (names, photos, counts).
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var k = dataKey();
      if (k !== _key) { try { refresh(); } catch (e) {} }
      if (tries >= 8) clearInterval(t);
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
