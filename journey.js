/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Journey  ·  window.PDXJourney
   ────────────────────────────────────────────────────────────────────────────
   Move 3: the guided spine + a clear "next action" on every receipt.

   Two jobs, one small module:

     1) THE SPINE — a lightweight, sticky breadcrumb that shows where the voter
        is in their investigation ("🏠 Home › 🔫 Guns › 🧾 Mike Lee"). Every step
        is a live link back, so the trail is a map they can walk in either
        direction. It appears only once they've started moving and can be
        dismissed; a new step brings it back.

     2) NEXT ACTIONS — one shared, consistent action rail rendered on every
        receipt (in the receipt lightbox and on the hero cards): Share · Compare ·
        Track · Full profile · and a self-propelling "keep going" nudge ("see who
        else is (in)consistent on this issue"). The point is that a receipt is
        never a dead end — there is always an obvious next move.

   NO NEW DATA and NO NEW NAVIGATION SURFACES. Every action reuses primitives the
   app already ships:
     window.PDXReceipts (share / open / find)   window.PDXIssueView (open)
     window._cmpSelected + window.openCompare    window.mypolToggle / _pdxIsOnTeam
     window.PDXSaved (track a receipt)           window.showProfile (full profile)

   The trail is kept in memory and mirrored to sessionStorage so a mid-session
   reload doesn't lose the voter's place. Everything is guarded so load order
   never matters.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXJourney) return; // idempotent

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }
  function el(id) { return document.getElementById(id); }
  function G(n) { try { return window[n]; } catch (e) { return null; } }
  function toast(msg) {
    try { if (typeof window._showToast === 'function') return window._showToast(msg); } catch (e) {}
    try { if (typeof window._pdxToast === 'function') return window._pdxToast(msg); } catch (e) {}
  }

  // ── trail model ───────────────────────────────────────────────────────────────
  // A step: { kind, label, icon, nav }. `nav` is a small, serializable descriptor
  // the spine replays to walk back to that step. Kinds: home | search | issue |
  // receipt | profile | compare.
  var STORE_KEY = 'pdx_journey_v1';
  var MAX_STEPS = 6;      // keep the spine short; older middle steps collapse
  var steps = [];
  var dismissed = false;

  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(steps)); } catch (e) {}
  }
  function restore() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) steps = a; }
    } catch (e) { steps = []; }
  }

  function seedHome() {
    if (!steps.length) steps.push({ kind: 'home', label: 'Home', icon: '🏠', nav: { type: 'home' } });
  }

  // Identity of a step for de-duping — so re-opening the same receipt or issue
  // updates in place instead of stacking.
  function idOf(s) {
    var n = s.nav || {};
    return s.kind + ':' + (n.key || n.pid || n.slug || n.q || n.type || '');
  }

  // Record a step. If it matches the current head, no-op. If it exists earlier in
  // the trail, walk back to it (truncate forward). Otherwise append (collapsing to
  // MAX_STEPS from the tail, always keeping Home at the root).
  function record(kind, opts) {
    opts = opts || {};
    restore.done || (restore(), restore.done = true);
    seedHome();
    var step = { kind: kind, label: opts.label || kind, icon: opts.icon || '•', nav: opts.nav || {} };
    var id = idOf(step);

    if (steps.length && idOf(steps[steps.length - 1]) === id) {
      steps[steps.length - 1] = step; // refresh label
    } else {
      var at = -1;
      for (var i = 0; i < steps.length; i++) { if (idOf(steps[i]) === id) { at = i; break; } }
      if (at !== -1) {
        steps = steps.slice(0, at + 1);
        steps[at] = step;
      } else {
        steps.push(step);
        if (steps.length > MAX_STEPS) {
          // Keep Home + the most recent (MAX_STEPS-1) steps.
          steps = [steps[0]].concat(steps.slice(steps.length - (MAX_STEPS - 1)));
        }
      }
    }
    dismissed = false; // the journey advanced — bring the spine back
    save();
    renderBar();
  }

  function clear() { steps = []; save(); renderBar(); }

  // ── replay a step (breadcrumb jump-back) ────────────────────────────────────────
  function dispatch(nav) {
    if (!nav || !nav.type) return;
    var R = G('PDXReceipts'), IV = G('PDXIssueView');
    switch (nav.type) {
      case 'home':
        try { (el('hero') || document.body).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        break;
      case 'search':
        var input = el('myteam-browse-search');
        if (input) {
          input.value = nav.q || '';
          if (typeof window.pdxBrowseSearchInput === 'function') window.pdxBrowseSearchInput();
          else if (typeof window.myteamBrowseFilter === 'function') window.myteamBrowseFilter();
        }
        var panel = el('myteam-browse-panel') || input;
        if (panel && panel.scrollIntoView) { try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
        break;
      case 'issue':
        if (IV && typeof IV.open === 'function') IV.open(nav.key);
        break;
      case 'receipt':
        if (R && typeof R.open === 'function') R.open(nav.pid, nav.issue || '');
        break;
      case 'profile':
        if (typeof window.showProfile === 'function') window.showProfile(nav.pid);
        break;
      case 'compare':
        if (typeof window.openCompare === 'function') window.openCompare();
        break;
    }
  }

  function go(index) {
    if (index < 0 || index >= steps.length) return;
    var step = steps[index];
    steps = steps.slice(0, index + 1); // walking back prunes the forward path
    save(); renderBar();
    dispatch(step.nav);
  }

  // ── the spine (sticky breadcrumb bar) ────────────────────────────────────────────
  // Returns the crumbs markup so overlays can embed the SAME trail in their own
  // chrome (keeping context visible even when the bar is behind an overlay).
  function crumbsHTML() {
    return steps.map(function (s, i) {
      var last = i === steps.length - 1;
      var sep = i > 0 ? '<span class="pj-sep" aria-hidden="true">›</span>' : '';
      return sep + '<button type="button" class="pj-crumb' + (last ? ' is-here' : '') +
        '" data-jgo="' + i + '"' + (last ? ' aria-current="step"' : '') + '>' +
        '<span class="pj-crumb-ico" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="pj-crumb-lb">' + esc(s.label) + '</span></button>';
    }).join('');
  }

  // A single forward nudge based on where the voter is now — the spine's own
  // "next" hint (the per-receipt rail carries the richer set).
  function nextNudge() {
    var head = steps[steps.length - 1];
    if (!head) return null;
    if (head.kind === 'issue') return { label: 'Open a top receipt', ico: '🧾', jaction: 'issue-top', arg: head.nav.key };
    if (head.kind === 'receipt') {
      if (head.nav.issue) return { label: 'Who else on this issue?', ico: '🧭', jaction: 'issue', arg: head.nav.issue };
    }
    if (head.kind === 'profile') return { label: 'Compare with another', ico: '⚖️', jaction: 'compare' };
    if (head.kind === 'search') return { label: 'Browse issues', ico: '🧭', jaction: 'front-door' };
    return null;
  }

  function ensureBar() {
    var bar = el('pdx-journey');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'pdx-journey';
    bar.className = 'pj-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Your investigation trail');
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var goBtn = e.target.closest && e.target.closest('[data-jgo]');
      if (goBtn) { go(parseInt(goBtn.getAttribute('data-jgo'), 10)); return; }
      var nb = e.target.closest && e.target.closest('[data-jnudge]');
      if (nb) { handleNudge(nb.getAttribute('data-jnudge'), nb.getAttribute('data-arg')); return; }
      if (e.target.closest && e.target.closest('.pj-dismiss')) { dismissed = true; renderBar(); return; }
    });
    return bar;
  }

  function handleNudge(jaction, arg) {
    var IV = G('PDXIssueView'), R = G('PDXReceipts');
    if (jaction === 'issue' && IV && IV.open) IV.open(arg);
    else if (jaction === 'issue-top' && IV && IV.open) IV.open(arg);
    else if (jaction === 'front-door') { var fd = el('issue-front-door'); if (fd) try { fd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
    else if (jaction === 'compare' && typeof window.openCompare === 'function') window.openCompare();
  }

  function renderBar() {
    var bar = ensureBar();
    // Show only once the voter has actually moved (more than just Home) and hasn't
    // dismissed it this session.
    var meaningful = steps.filter(function (s) { return s.kind !== 'home'; }).length;
    if (dismissed || meaningful < 1) {
      bar.classList.remove('is-open'); bar.innerHTML = '';
      try { document.body.classList.remove('pj-has-bar'); } catch (e) {}
      return;
    }

    var nudge = nextNudge();
    bar.innerHTML =
      '<div class="pj-inner">' +
        '<span class="pj-tag" aria-hidden="true">Your trail</span>' +
        '<div class="pj-trail">' + crumbsHTML() + '</div>' +
        (nudge ? '<button type="button" class="pj-next" data-jnudge="' + escAttr(nudge.jaction) + '"' +
          (nudge.arg ? ' data-arg="' + escAttr(nudge.arg) + '"' : '') + '>' +
          '<span aria-hidden="true">' + nudge.ico + '</span> ' + esc(nudge.label) + ' →</button>' : '') +
        '<button type="button" class="pj-dismiss" aria-label="Hide the trail">✕</button>' +
      '</div>';
    bar.classList.add('is-open');
    try { document.body.classList.add('pj-has-bar'); } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NEXT-ACTION RAIL  ·  rendered on every receipt
  // ──────────────────────────────────────────────────────────────────────────
  // One consistent set of forward moves for a receipt, so no receipt dead-ends.
  // `r` is a PDXReceipts receipt object. variant 'full' (lightbox) shows labels +
  // the "keep going" nudge; 'compact' (hero card) is icon-forward. All buttons
  // carry data-jact + identity and are handled by the delegated handler below.
  function nextActionsHTML(r, variant) {
    if (!r) return '';
    variant = variant || 'full';
    var pid = escAttr(r.pid), issue = escAttr(r.issueKey || '');
    var tracked = isReceiptTracked(r);
    var full = variant === 'full';
    var lbl = function (t) { return full ? '<span class="pj-act-lb">' + t + '</span>' : ''; };

    var btns = [];
    btns.push('<button type="button" class="pj-act pj-act-share svd-share-btn" data-pid="' + pid + '" ' +
      'aria-label="Share this receipt as an image"><span aria-hidden="true">📤</span>' + lbl('Share') + '</button>');
    btns.push('<button type="button" class="pj-act pj-act-compare" data-jact="compare" data-pid="' + pid + '" ' +
      'aria-label="Compare ' + escAttr(r.name) + ' with others"><span aria-hidden="true">⚖️</span>' + lbl('Compare') + '</button>');
    btns.push('<button type="button" class="pj-act pj-act-track' + (tracked ? ' is-on' : '') + '" data-jact="track" ' +
      'data-pid="' + pid + '" data-issue="' + issue + '" aria-pressed="' + (tracked ? 'true' : 'false') + '" ' +
      'aria-label="' + (tracked ? 'Tracked — tap to untrack' : 'Track this receipt') + '">' +
      '<span aria-hidden="true">' + (tracked ? '✓' : '☆') + '</span>' + lbl(tracked ? 'Tracked' : 'Track') + '</button>');
    btns.push('<button type="button" class="pj-act pj-act-profile" data-jact="profile" data-pid="' + pid + '" ' +
      'aria-label="Open the full profile for ' + escAttr(r.name) + '"><span aria-hidden="true">👤</span>' + lbl('Full profile') + '</button>');

    // Self-propelling nudge: from one receipt to the whole field on that issue.
    var keep = '';
    if (full && r.issueKey && G('PDXIssueView')) {
      var topic = (r.issue && r.issue.label) ? r.issue.label : 'this issue';
      keep = '<button type="button" class="pj-act pj-act-keep" data-jact="issue" data-issue="' + issue + '" ' +
        'aria-label="See who else stands where on ' + escAttr(topic) + '">' +
        '<span aria-hidden="true">🧭</span><span class="pj-act-lb">Who else on ' + esc(topic) + '?</span></button>';
    }

    return '<div class="pj-actions pj-actions--' + variant + '" role="group" aria-label="Next steps">' +
        '<div class="pj-act-row">' + btns.join('') + '</div>' + keep + '</div>';
  }

  // ── track (save a receipt to the Evidence Locker) ────────────────────────────────
  function receiptSaveKey(r) { return r.pid + '|' + (r.issueKey || '') + '|' + (r.headline || ''); }
  function isReceiptTracked(r) {
    var S = G('PDXSaved');
    return !!(S && typeof S.has === 'function' && r && S.has('receipt', receiptSaveKey(r)));
  }
  function receiptSnapshot(r) {
    return {
      type: 'receipt', key: receiptSaveKey(r),
      title: r.headline || (r.issue && r.issue.label) || 'Receipt',
      icon: '🧾',
      sub: (r.verdict ? r.verdict.label + ' · ' : '') + (r.name || ''),
      nav: { action: 'open-receipt', pol: r.pid, issue: r.issueKey || '', polId: r.pid, issueKey: r.issueKey || '' },
      stance: r.said ? String(r.said.word || '').toLowerCase() : '',
      polId: r.pid, polName: r.name || '', polSub: r.sub || '',
      topic: (r.issue && r.issue.label) || r.headline || '',
      sourceLabel: (r.source && r.source.label) || '',
      snippet: r.facts || (r.said && r.said.text) || r.why || '',
      issueKey: r.issueKey || '', pledge: false
    };
  }
  function toggleTrack(r) {
    var S = G('PDXSaved');
    if (!S || !r) return;
    var k = receiptSaveKey(r);
    if (S.has('receipt', k)) { S.remove('receipt', k); toast('Removed from tracked receipts'); }
    else { S.add(receiptSnapshot(r)); toast('Tracking this receipt — saved to your Evidence Locker'); }
  }

  // ── delegated handler for every next-action button (anywhere on the page) ─────────
  function findReceipt(pid, issue) {
    var R = G('PDXReceipts');
    if (R && typeof R.find === 'function') return R.find(pid, issue);
    if (R && typeof R.forPolitician === 'function') return R.forPolitician(pid);
    return null;
  }

  if (!window._pjActionsBound) {
    window._pjActionsBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-jact]');
      if (!btn) return;
      var act = btn.getAttribute('data-jact');
      var pid = btn.getAttribute('data-pid');
      var issue = btn.getAttribute('data-issue') || '';
      e.preventDefault(); e.stopPropagation();

      if (act === 'compare') {
        if (window._cmpSelected && typeof window._cmpSelected.add === 'function') window._cmpSelected.add(pid);
        var R = G('PDXReceipts'); if (R && typeof R.close === 'function') R.close();
        record('compare', { label: 'Compare', icon: '⚖️', nav: { type: 'compare' } });
        if (typeof window.openCompare === 'function') window.openCompare();
        else toast('Added to compare');
        return;
      }
      if (act === 'track') {
        var r = findReceipt(pid, issue);
        if (r) {
          toggleTrack(r);
          // Reflect the new state on this button without a full re-render.
          var on = isReceiptTracked(r);
          btn.classList.toggle('is-on', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          var ico = btn.querySelector('[aria-hidden]'); if (ico) ico.textContent = on ? '✓' : '☆';
          var lb = btn.querySelector('.pj-act-lb'); if (lb) lb.textContent = on ? 'Tracked' : 'Track';
        }
        return;
      }
      if (act === 'profile') {
        var R2 = G('PDXReceipts'); if (R2 && typeof R2.close === 'function') R2.close();
        if (typeof window.showProfile === 'function') window.showProfile(pid);
        return;
      }
      if (act === 'issue') {
        var R3 = G('PDXReceipts'); if (R3 && typeof R3.close === 'function') R3.close();
        var IV = G('PDXIssueView'); if (IV && typeof IV.open === 'function') IV.open(issue);
        return;
      }
    }, true); // capture, so it runs before the receipt card's own open-profile click
  }

  window.PDXJourney = {
    record: record,
    clear: clear,
    crumbsHTML: crumbsHTML,
    nextActionsHTML: nextActionsHTML,
    go: go
  };

  // ── boot ──────────────────────────────────────────────────────────────────────
  function boot() {
    restore(); restore.done = true;
    renderBar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
