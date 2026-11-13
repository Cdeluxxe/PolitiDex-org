// ─────────────────────────────────────────────────────────────────────────────
// ⚖️ COMPARISON BAR — window.PDXCompareTray
// ─────────────────────────────────────────────────────────────────────────────
// A short comparison set the reader builds from any politician card, and one
// place to jump into it from. This is NOT a second comparison system: the set
// IS the existing compare selection (window._cmpSelected, owned by
// compare-table.js), the 2-person view IS the existing side-by-side
// (openCompare), and every number it prints comes from the readers that already
// publish it — _calcAlignmentScore for match %, _calcAlignmentBreakdown for the
// per-issue marks, PDXWordAction.read for the Word vs Action line. Nothing here
// scores, ranks or re-derives anything.
//
// WHAT IT ADDS
//   · A sticky bar that appears only after the first person is added: chips
//     (name + remove), a count, "Jump to comparison" and a close X. Closing the
//     bar clears the set and hides it.
//   · A short confirmation on every add from a card ("Added — 2 of 4").
//   · A cap of four. A fifth add from a card is refused with "remove one first"
//     rather than silently dropping somebody the reader chose.
//   · Jump opens the right view for the size of the set: 2 → the existing
//     side-by-side; 3 or 4 → a condensed summary, each row of which can drop
//     into the deeper 2-person view with one other person from the set.
//
// WHAT IT NEVER DOES
//   · Surface anyone the reader did not add. The bar and both views read the
//     selection and nothing else — no race peers, no suggestions.
//   · Touch the compare table, the match maths, Word vs Action or the drawers.
//
// Loaded deferred on index.html after compare-table.js and compare-hub.js, so
// every entry point it guards already exists. Every outside read is guarded.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var MAX = 4;
  var set = window._cmpSelected;
  if (!set || typeof set.add !== 'function') return;

  var isFn = function (f) { return typeof f === 'function'; };
  var CMP = function () { return window.CMP_DATA || {}; };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nameOf(pid) { var d = CMP()[pid]; return (d && d.name) || String(pid); }

  // ── STATE ──────────────────────────────────────────────────────────────────
  // `_pair` is set only while the deeper 2-person view is open from the summary:
  // the live selection is narrowed to the pair so the existing table renders
  // exactly those two, and the reader's full set waits in `stash` until the
  // table closes. The bar keeps showing the full set the whole time.
  var _pair = null;          // { pids:[a,b], stash:[...], seenOpen:bool, fromSummary:bool }
  var _quiet = 0;            // >0 while we mutate the set ourselves (no toasts)
  var _renderQueued = false;

  function members() { return _pair ? _pair.stash.slice() : Array.from(set); }

  // ── OBSERVE THE SELECTION ──────────────────────────────────────────────────
  // A dozen surfaces write _cmpSelected directly. Rather than teach each of them
  // about the bar, the bar listens to the set itself: any add, delete or clear
  // schedules one repaint. Return values are passed through untouched.
  ['add', 'delete', 'clear'].forEach(function (m) {
    var orig = set[m];
    if (!isFn(orig) || orig._pdxTray) return;
    var wrapped = function () {
      var r = orig.apply(set, arguments);
      schedule();
      return r;
    };
    wrapped._pdxTray = true;
    wrapped._orig = orig;
    set[m] = wrapped;
  });
  function rawAdd(p) { (set.add._orig || set.add).call(set, p); }
  function rawDelete(p) { (set.delete._orig || set.delete).call(set, p); }

  function schedule() {
    if (_renderQueued) return;
    _renderQueued = true;
    var run = function () { _renderQueued = false; render(); };
    if (isFn(window.requestAnimationFrame)) window.requestAnimationFrame(run); else setTimeout(run, 0);
  }

  // ── UI SYNC FOR ONE PERSON ─────────────────────────────────────────────────
  // Mirrors the label bookkeeping the existing toggles do, for the paths where
  // the bar itself changes the set (chip remove, close, pair restore).
  function syncPid(pid) {
    var sel = set.has(pid) || (_pair && _pair.stash.indexOf(pid) >= 0);
    try {
      document.querySelectorAll('.compare-cb[data-pid="' + pid + '"]').forEach(function (c) { c.checked = sel; });
      document.querySelectorAll('.bp-compare-btn[data-pid="' + pid + '"]').forEach(function (b) {
        b.classList.toggle('added', sel);
        var inBrowse = b.closest && b.closest('#myteam-browse-grid');
        b.textContent = sel ? (inBrowse ? '✓ COMPARING' : '✓ Comparing') : (inBrowse ? '+ COMPARE' : '⚖️ Compare');
        var card = b.closest && b.closest('.card-holo');
        if (card) card.classList.toggle('cmp-highlight', sel);
      });
      var pm = document.getElementById('pmc-' + pid);
      if (pm) { pm.textContent = sel ? '✓ Added' : '+ Compare'; pm.classList.toggle('added', sel); }
      document.querySelectorAll('.chub-card[data-pid="' + pid + '"]').forEach(function (card) {
        card.classList.toggle('chub-selected', sel);
        var b = card.querySelector('.chub-add-btn');
        if (b) { b.textContent = sel ? '✓ Added' : '+ Compare'; b.classList.toggle('chub-added', sel); }
      });
      if (isFn(window._medSyncCmpBtn) && window._pdxMediumId === pid) window._medSyncCmpBtn(pid);
      if (isFn(window._updateCmpFloat)) window._updateCmpFloat();
      if (isFn(window._pmUpdateTray)) window._pmUpdateTray();
    } catch (e) {}
  }

  // ── NOTICE ─────────────────────────────────────────────────────────────────
  var _noteTimer = null;
  function notice(msg) {
    ensureDom();
    var n = document.getElementById('pdx-cmp-tray-note');
    if (!n) return;
    n.textContent = msg;
    n.classList.add('is-on');
    clearTimeout(_noteTimer);
    _noteTimer = setTimeout(function () { n.classList.remove('is-on'); }, 2200);
  }
  function addedNotice() {
    var n = members().length;
    notice('Added — ' + n + ' of ' + MAX);
  }
  function fullNotice() {
    notice('Your comparison holds ' + MAX + ' — remove one first');
  }

  // ── GUARD THE EXISTING CARD BUTTONS ────────────────────────────────────────
  // Every ⚖️ Compare button on a card already adds to the set through one of
  // these toggles. Each keeps doing exactly what it did; the guard only refuses
  // a fifth person and confirms an add.
  function guardToggle(name, pidOf, onRefuse) {
    var orig = window[name];
    if (!isFn(orig) || orig._pdxTray) return;
    var wrapped = function () {
      var pid = pidOf.apply(null, arguments);
      if (pid == null || pid === '') return orig.apply(this, arguments);
      pid = String(pid);
      var had = members().indexOf(pid) >= 0;
      if (!had && members().length >= MAX) {
        fullNotice();
        if (onRefuse) { try { onRefuse.apply(null, arguments); } catch (e) {} }
        return;
      }
      var r = orig.apply(this, arguments);
      if (!had && set.has(pid) && !_quiet) addedNotice();
      return r;
    };
    wrapped._pdxTray = true;
    window[name] = wrapped;
  }
  function installGuards() {
    guardToggle('chubToggle', function (pid) { return pid; });
    guardToggle('bpAddCompare', function (pid) { return pid; });
    guardToggle('pmAddCompare', function (pid) { return pid; });
    guardToggle('handleCompareCheck',
      function (cb) { return (cb && cb.checked && cb.dataset) ? cb.dataset.pid : null; },
      function (cb) { if (cb) cb.checked = false; });
  }
  installGuards();

  // ── PUBLIC ACTIONS ─────────────────────────────────────────────────────────
  function add(pid) {
    if (!pid) return false;
    pid = String(pid);
    if (members().indexOf(pid) >= 0) { notice(nameOf(pid) + ' is already in your comparison'); return true; }
    if (members().length >= MAX) { fullNotice(); return false; }
    installGuards();
    if (isFn(window.chubToggle)) {
      window.chubToggle(pid);           // full UI sync + toast via the guard
    } else {
      set.add(pid);
      syncPid(pid);
      addedNotice();
    }
    return set.has(pid);
  }

  function remove(pid) {
    pid = String(pid);
    if (_pair) {
      _pair.stash = _pair.stash.filter(function (p) { return p !== pid; });
    }
    if (!set.has(pid)) { syncPid(pid); render(); return; }
    _quiet++;
    try {
      if (isFn(window.chubToggle)) window.chubToggle(pid);
      else { set.delete(pid); syncPid(pid); }
    } finally { _quiet--; }
    if (set.has(pid)) { set.delete(pid); syncPid(pid); }
    render();
    if (isSummaryOpen()) { if (members().length >= 3) openSummary(); else closeSummary(); }
  }

  function clear() {
    var pids = members();
    _pair = null;
    closeSummary();
    _quiet++;
    try {
      pids.forEach(function (p) {
        if (set.has(p) && isFn(window.chubToggle)) window.chubToggle(p);
      });
      if (set.size && isFn(window.clearAllCompare)) window.clearAllCompare();
      if (set.size) set.clear();
    } finally { _quiet--; }
    pids.forEach(syncPid);
    render();
  }

  function jump() {
    var n = members().length;
    if (n < 1) return;
    if (n === 1) { notice('Add one more person to compare'); return; }
    if (n === 2) { openPair(); return; }
    openSummary();
  }

  // ── 2-PERSON VIEW: THE EXISTING SIDE-BY-SIDE ───────────────────────────────
  function openPair() {
    if (isFn(window.openCompare)) window.openCompare();
  }

  // Narrow the live selection to two people from the set, open the existing
  // table, and put the full set back the moment it closes. Anything the reader
  // did inside the table (dropping one of the two, adding a rival) carries over.
  function viewWith(a, b) {
    a = String(a); b = String(b);
    var all = members();
    if (all.indexOf(a) < 0 || all.indexOf(b) < 0 || a === b) return;
    var fromSummary = isSummaryOpen();
    closeSummary();
    _pair = { pids: [a, b], stash: all, seenOpen: false, fromSummary: fromSummary };
    all.forEach(function (p) { if (p !== a && p !== b) rawDelete(p); });
    if (!set.has(a)) rawAdd(a);
    if (!set.has(b)) rawAdd(b);
    watchOverlay();
    openPair();
  }

  function restorePair() {
    if (!_pair) return;
    var pr = _pair; _pair = null;
    var now = Array.from(set);
    var dropped = pr.pids.filter(function (p) { return now.indexOf(p) < 0; });
    var next = pr.stash.filter(function (p) { return dropped.indexOf(p) < 0; });
    now.forEach(function (p) { if (next.indexOf(p) < 0) next.push(p); });
    Array.from(set).forEach(function (p) { rawDelete(p); });
    next.forEach(function (p) { rawAdd(p); });
    pr.stash.concat(now).forEach(syncPid);
    render();
    if (pr.fromSummary && members().length >= 3) openSummary();
  }

  var _ovObserver = null;
  function watchOverlay() {
    var ov = document.getElementById('compare-overlay');
    if (!ov || _ovObserver || !isFn(window.MutationObserver)) return;
    _ovObserver = new MutationObserver(function () {
      if (!_pair) return;
      var open = ov.classList.contains('cmp-open') && ov.style.display !== 'none';
      if (open) { _pair.seenOpen = true; return; }
      if (_pair.seenOpen) restorePair();
    });
    _ovObserver.observe(ov, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // ── 3–4 PERSON VIEW: CONDENSED SUMMARY ─────────────────────────────────────
  function matchOf(pid) {
    try {
      var on = window._alignIssues && window._alignIssues.size > 0;
      if (!on || !isFn(window._calcAlignmentScore)) return null;
      var s = window._calcAlignmentScore(pid);
      return (s === null || s === undefined || isNaN(s)) ? null : Math.round(s);
    } catch (e) { return null; }
  }

  // Top issue alignments: the reader's own picked issues, read through the same
  // breakdown the match % is built from. Thresholds mirror the "why this match"
  // line (≥55 lines up, <50 differs, between is mixed). Strongly-weighted issues
  // lead; nothing without evidence is marked.
  function alignmentsOf(pid) {
    try {
      if (!(window._alignIssues && window._alignIssues.size > 0)) return null;
      if (!isFn(window._calcAlignmentBreakdown)) return null;
      var bd = window._calcAlignmentBreakdown(pid);
      if (!bd || !bd.issues) return [];
      var strong = function (i) { return /strongly/.test(String(i.intensity || '')) ? 1 : 0; };
      return bd.issues.filter(function (i) { return i && i.hasEvidence; })
        .sort(function (x, y) { return strong(y) - strong(x); })
        .slice(0, 4)
        .map(function (i) {
          var mark = i.score >= 55 ? 'yes' : i.score < 50 ? 'no' : 'mixed';
          return { label: i.label || i.key, mark: mark };
        });
    } catch (e) { return []; }
  }

  // One line of Word vs Action, in the exact words the cards already use.
  function waLineOf(pid) {
    var d = CMP()[pid];
    if (!d) return 'No record yet';
    var r = null;
    try {
      var wa = window.PDXWordAction;
      if (wa && isFn(wa.read)) r = wa.read(pid, d);
    } catch (e) {}
    if (r && r.publishable && r.verdict && r.verdict.label) return r.verdict.label;
    if (r && r.coverage && r.coverage.word > 0) return 'Not enough record to check yet';
    return 'No stated positions on file yet';
  }

  function seatOf(d) {
    if (!d) return '';
    var party = d.party ? String(d.party) : '';
    var seat = [d.office, d.district || d.state].filter(Boolean).join(', ');
    return [party, seat].filter(Boolean).join(' · ');
  }

  var MARK = { yes: { ico: '✓', word: 'lines up with you' },
               no: { ico: '✗', word: 'differs from you' },
               mixed: { ico: '~', word: 'mixed' } };

  function summaryHtml() {
    var pids = members();
    var anyStances = !!(window._alignIssues && window._alignIssues.size > 0);
    var rows = pids.map(function (pid) {
      var d = CMP()[pid] || {};
      var m = matchOf(pid);
      var al = alignmentsOf(pid);
      var alHtml;
      if (al === null) alHtml = '<span class="pdx-cs-muted">Set your stances to see issue alignments</span>';
      else if (!al.length) alHtml = '<span class="pdx-cs-muted">Nothing on file for your issues yet</span>';
      else alHtml = al.map(function (a) {
        var mk = MARK[a.mark];
        return '<span class="pdx-cs-al is-' + a.mark + '" title="' + esc(a.label + ' — ' + mk.word) + '">' +
          '<b aria-hidden="true">' + mk.ico + '</b>' + esc(a.label) +
          '<span class="pdx-sr"> — ' + mk.word + '</span></span>';
      }).join('');
      var others = pids.filter(function (p) { return p !== pid; });
      var withMenu = others.map(function (o) {
        return '<button type="button" class="pdx-cs-with-opt" data-cs-pair="' + esc(pid) + '|' + esc(o) + '">' +
          esc(nameOf(pid)) + ' vs ' + esc(nameOf(o)) + '</button>';
      }).join('');
      return '<div class="pdx-cs-row" role="row" data-pid="' + esc(pid) + '">' +
        '<div class="pdx-cs-cell pdx-cs-who" role="cell">' +
          '<span class="pdx-cs-name">' + esc(d.name || pid) + '</span>' +
          '<span class="pdx-cs-seat">' + esc(seatOf(d)) + '</span>' +
        '</div>' +
        '<div class="pdx-cs-cell pdx-cs-match" role="cell"><span class="pdx-cs-lbl">Match</span>' +
          (m === null ? '<span class="pdx-cs-muted">—</span>' : '<b>' + m + '%</b>') + '</div>' +
        '<div class="pdx-cs-cell pdx-cs-als" role="cell"><span class="pdx-cs-lbl">Your issues</span>' + alHtml + '</div>' +
        '<div class="pdx-cs-cell pdx-cs-wa" role="cell"><span class="pdx-cs-lbl">⚖️ Word vs Action</span>' + esc(waLineOf(pid)) + '</div>' +
        '<div class="pdx-cs-cell pdx-cs-act" role="cell">' +
          '<button type="button" class="pdx-cs-with" aria-expanded="false" data-cs-with="' + esc(pid) + '">View with…</button>' +
          '<div class="pdx-cs-with-menu" hidden>' + withMenu + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="pdx-cs-card" role="document">' +
      '<div class="pdx-cs-hd">' +
        '<div><div class="pdx-cs-title">⚖️ Comparing ' + pids.length + '</div>' +
        '<div class="pdx-cs-sub">A quick read of everyone you added. Pick “View with…” to open any two side by side.' +
          (anyStances ? '' : ' Match and issue marks appear once you set your stances.') + '</div></div>' +
        '<button type="button" class="pdx-cs-x" data-cs-close aria-label="Close summary">✕</button>' +
      '</div>' +
      '<div class="pdx-cs-head" role="row" aria-hidden="true">' +
        '<span>Who</span><span>Match</span><span>Your issues</span><span>Word vs Action</span><span></span>' +
      '</div>' +
      '<div class="pdx-cs-rows" role="table" aria-label="Comparison summary">' + rows + '</div>' +
    '</div>';
  }

  function isSummaryOpen() {
    var s = document.getElementById('pdx-cmp-sum');
    return !!(s && !s.hidden);
  }
  function openSummary() {
    ensureDom();
    var s = document.getElementById('pdx-cmp-sum');
    s.innerHTML = summaryHtml();
    s.hidden = false;
    document.body.classList.add('pdx-cmp-sum-open');
    var x = s.querySelector('[data-cs-close]');
    if (x) { try { x.focus({ preventScroll: true }); } catch (e) {} }
  }
  function closeSummary() {
    var s = document.getElementById('pdx-cmp-sum');
    if (!s || s.hidden) return;
    s.hidden = true;
    s.innerHTML = '';
    document.body.classList.remove('pdx-cmp-sum-open');
  }

  // ── DOM ────────────────────────────────────────────────────────────────────
  function ensureDom() {
    if (document.getElementById('pdx-cmp-tray')) return;
    if (!document.body) return;
    var bar = document.createElement('div');
    bar.id = 'pdx-cmp-tray';
    bar.className = 'pdx-cmp-tray';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Your comparison');
    bar.hidden = true;
    bar.innerHTML =
      '<div class="pdx-cmp-tray__in">' +
        '<span class="pdx-cmp-tray__count" id="pdx-cmp-tray-count"></span>' +
        '<div class="pdx-cmp-tray__chips" id="pdx-cmp-tray-chips" role="list"></div>' +
        '<button type="button" class="pdx-cmp-tray__jump" id="pdx-cmp-tray-jump">Jump to comparison</button>' +
        '<button type="button" class="pdx-cmp-tray__close" id="pdx-cmp-tray-close" aria-label="Close and clear your comparison">✕</button>' +
      '</div>' +
      '<div class="pdx-cmp-tray__note" id="pdx-cmp-tray-note" role="status" aria-live="polite"></div>';
    document.body.appendChild(bar);

    var sum = document.createElement('div');
    sum.id = 'pdx-cmp-sum';
    sum.className = 'pdx-cmp-sum';
    sum.setAttribute('role', 'dialog');
    sum.setAttribute('aria-modal', 'true');
    sum.setAttribute('aria-label', 'Comparison summary');
    sum.hidden = true;
    document.body.appendChild(sum);

    bar.addEventListener('click', function (e) {
      var t = e.target;
      var rm = t.closest && t.closest('[data-cmp-rm]');
      if (rm) { e.preventDefault(); remove(rm.getAttribute('data-cmp-rm')); return; }
      if (t.closest && t.closest('#pdx-cmp-tray-jump')) { e.preventDefault(); jump(); return; }
      if (t.closest && t.closest('#pdx-cmp-tray-close')) { e.preventDefault(); clear(); return; }
    });
    sum.addEventListener('click', function (e) {
      var t = e.target;
      if (t === sum || (t.closest && t.closest('[data-cs-close]'))) { closeSummary(); return; }
      var pair = t.closest && t.closest('[data-cs-pair]');
      if (pair) {
        var ab = pair.getAttribute('data-cs-pair').split('|');
        viewWith(ab[0], ab[1]);
        return;
      }
      var w = t.closest && t.closest('[data-cs-with]');
      if (w) {
        var menu = w.parentNode.querySelector('.pdx-cs-with-menu');
        if (!menu) return;
        var open = menu.hidden;
        sum.querySelectorAll('.pdx-cs-with-menu').forEach(function (m) { m.hidden = true; });
        sum.querySelectorAll('[data-cs-with]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        menu.hidden = !open;
        w.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isSummaryOpen()) { closeSummary(); e.stopPropagation(); }
    }, true);

    var place = function () { placeBar(); };
    window.addEventListener('resize', place, { passive: true });
    window.addEventListener('scroll', function () {
      if (bar.hidden) return;
      if (isFn(window.requestAnimationFrame)) window.requestAnimationFrame(place); else place();
    }, { passive: true });
    var nav = document.getElementById('pdx-topnav');
    if (nav && isFn(window.ResizeObserver)) { try { new ResizeObserver(place).observe(nav); } catch (e) {} }
  }

  // Sits directly under the fixed top nav on every width (the nav is the page
  // header on phones too), and follows it if the nav moves.
  function placeBar() {
    var bar = document.getElementById('pdx-cmp-tray');
    if (!bar) return;
    var top = 0;
    try {
      var nav = document.getElementById('pdx-topnav');
      if (nav) {
        var r = nav.getBoundingClientRect();
        top = Math.max(0, Math.round(r.bottom));
      }
    } catch (e) {}
    bar.style.top = top + 'px';
  }

  function render() {
    ensureDom();
    var bar = document.getElementById('pdx-cmp-tray');
    if (!bar) return;
    var pids = members();
    var n = pids.length;
    if (n < 1) {
      bar.hidden = true;
      document.body.classList.remove('pdx-cmp-tray-on');
      closeSummary();
      return;
    }
    document.getElementById('pdx-cmp-tray-count').textContent = n + ' of ' + MAX;
    document.getElementById('pdx-cmp-tray-chips').innerHTML = pids.map(function (pid) {
      var nm = nameOf(pid);
      return '<span class="pdx-cmp-chip" role="listitem">' +
        '<span class="pdx-cmp-chip__nm">' + esc(nm) + '</span>' +
        '<button type="button" class="pdx-cmp-chip__x" data-cmp-rm="' + esc(pid) + '" aria-label="Remove ' + esc(nm) + ' from comparison">✕</button>' +
      '</span>';
    }).join('');
    var jumpBtn = document.getElementById('pdx-cmp-tray-jump');
    jumpBtn.textContent = n < 2 ? 'Add 1 more to compare' : 'Jump to comparison';
    jumpBtn.classList.toggle('is-waiting', n < 2);
    jumpBtn.setAttribute('aria-disabled', n < 2 ? 'true' : 'false');
    bar.hidden = false;
    document.body.classList.add('pdx-cmp-tray-on');
    placeBar();
  }

  window.PDXCompareTray = {
    MAX: MAX,
    add: add,
    remove: remove,
    clear: clear,
    jump: jump,
    viewWith: viewWith,
    openSummary: openSummary,
    closeSummary: closeSummary,
    members: members,
    render: render,
    installGuards: installGuards
  };

  function boot() { installGuards(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', installGuards);
})();
