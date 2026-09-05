/* ═══════════════════════════════════════════════════════════════════════════
   person-outline.js — a named outline of the person file, derived from the DOM
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN

   The person file got long, and long files bury thin rows. Maloy · Farmers &
   Rural Communities lives under Economy, three collapsed levels down in the
   topic tree, and nothing above it says the topic tree exists. The reader who
   wants it has to scroll until they recognise it.

   There was already a position indicator: the gutter ticks on #modal-body. It
   tells you WHERE you are as a fraction. It cannot tell you WHAT is there,
   because a scrollbar has no vocabulary. So it stays exactly as it is — this
   file does not touch it — and what gets added is the part it could never do:
   the section NAMES, in the order the file already reads them.

   WHAT THIS FILE IS

   One control with two skins.

     PDXPersonOutline.mount(pid)   build the outline for whatever is open
     PDXPersonOutline.rearm()      re-resolve after a deferred drawer mounted
     PDXPersonOutline.jump(key)    scroll to a section and focus its heading
     PDXPersonOutline.teardown()   remove the node and the observers
     PDXPersonOutline.items(k, p)  the resolved list, for tests

   Desktop (>=1024) it is a sticky list in the left column of the person-file
   panel — inside the panel, not in the site header, because it names sections
   of ONE record and would be a lie anywhere a different record could be open.
   Phone it is the same items as a wrapping chip row under the letterhead,
   below the status banners and above the first claim. Same node, moved on the
   breakpoint; one control, so there is one list and it cannot disagree with
   itself.

   WHY IT IS DERIVED AND NOT DECLARED

   profile-spine.js already owns the reading order, and the assembler already
   leaves its work in the DOM: .pdxsp-stage-<key> containers, #pdxsec-<name>
   anchors. So the outline probes for those instead of keeping a second copy of
   the stage list. A stage that did not mount has no entry, which is the whole
   guarantee: every row in this outline goes somewhere. A thin file gets a
   short outline and a deep one gets a long one, without either being told.

   The one thing it does declare is which names to look for and in what order —
   and that order is the spine's, restated, not re-decided. Nothing here can
   reorder the file.

   WHAT IT DELIBERATELY IS NOT

   Not a second product. The copy is section names and nothing else: no score,
   no percentage, no party, no Direction Match. The pill rail above the hero
   already carries figures and is allowed to; an outline that carried them
   would be a scoreboard with links, and the reader would read it instead of
   the record. The active row changes WEIGHT, not colour, for the same reason —
   colour on this site means a rating.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPersonOutline) return;

  // An outline of one row is a label, not an outline. Below this the file is
  // short enough to read, and the control would cost more attention than it
  // saves.
  var MIN_ITEMS = 2;

  // ── The two spec lists ──────────────────────────────────────────────────
  // `targets` is an ordered candidate list: the first candidate that is in the
  // DOM wins. '#foo' is an element id, '.foo' a selector under #modal-body.
  //
  // Order here mirrors profile-spine.js's STAGES, which is also the order the
  // assembler put them in the document. It is restated rather than imported so
  // this file can name the reader's sections ("Formal record") separately from
  // the spine's internal stage keys — and it is never sorted afterwards,
  // because the spine's order is the file's order and nothing may change it.
  var MEMBER = [
    { key: 'identity', label: 'Letterhead',         targets: ['.pdxsp-stage-identity'] },
    // The brief FIRST, then the strongest/both-ways block. Both are the formal
    // record; the brief is where it is stated in a sentence, so a reader asking
    // for the formal record lands on the sentence, not on the tree.
    { key: 'brief',    label: 'Formal record',      targets: ['.pdxsp-stage-brief', '#pdxsec-standout'] },
    { key: 'explore',  label: 'All issues by topic', targets: ['#pdxsec-stancetree', '.pdxsp-stage-explore'] },
    { key: 'verdict',  label: 'Word vs Action',     targets: ['#pdxsec-wordaction'] },
    // The public lane, under the name it actually ships with, and in the place
    // the spine actually puts it. consistency.js still exports
    // saydoSectionHtml(), but nothing has mounted #pdxsec-saydo on a member
    // profile since the public record became an input to the issue rows rather
    // than a section of its own — so the block that exists is 🔥 Flashpoints,
    // stage `tension`, and the row is named for the heading it lands on rather
    // than for the lane in the abstract. A row whose word and whose destination
    // disagree is a worse failure than a row that is missing.
    { key: 'tension',  label: 'Flashpoints',        targets: ['#pdxsec-controversies'] },
    { key: 'receipts', label: 'Evidence',           targets: ['#pdxsec-evidence'] },
    // Money is LAST, because the spine puts it last: after the proof layer, so it
    // never reads as part of the integrity argument. The outline restates that
    // order, it does not get a vote on it.
    { key: 'money',    label: 'Money',              targets: ['#pdxsec-funding'] }
  ];

  // A judge file is a different record with different stages, and it has no
  // Word vs Action and no money lane — not "empty ones", none. Listing either
  // would invent a question the file cannot answer.
  var JUDGE = [
    { key: 'retention', label: 'Retention',       targets: ['#pdxjf-retention'] },
    { key: 'jpec',      label: 'JPEC',            targets: ['#pdxjf-jpec'] },
    { key: 'seat',      label: 'How filled',      targets: ['#pdxjf-seat'] },
    { key: 'formal',    label: 'Formal record',   targets: ['#pdxjf-formal'] },
    { key: 'history',   label: 'Prior retention', targets: ['#pdxjf-history'] },
    { key: 'court',     label: 'About the court', targets: ['#pdxjf-court'] }
  ];

  var state = { nav: null, items: [], obs: null, kind: '', mq: null, bound: false };

  function specs(kind) { return kind === 'judge' ? JUDGE : MEMBER; }

  // Which record is open. The judge renderer stamps the panel, so this is a
  // read of what mounted rather than a guess from the id.
  function kindOf() {
    try {
      var p = document.getElementById('modal-panel');
      if (p && p.getAttribute('data-pdx-judge') === '1') return 'judge';
      if (document.querySelector('#modal-content .jf[data-jf-pid]')) return 'judge';
    } catch (e) {}
    return 'member';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ── Resolution ──────────────────────────────────────────────────────────
  // `present` is injected so the resolution rule can be tested against a
  // rendered HTML string without a browser. The DOM version below is the one
  // that ships.
  function items(kind, present) {
    var list = specs(kind), out = [], i, j;
    for (i = 0; i < list.length; i++) {
      for (j = 0; j < list[i].targets.length; j++) {
        if (present(list[i].targets[j])) {
          out.push({ key: list[i].key, label: list[i].label, target: list[i].targets[j] });
          break;
        }
      }
    }
    return out;
  }

  // A destination inside a closed deferred drawer has no element yet but is
  // still reachable — the jump mounts it first. hasTarget() is the spine's own
  // answer to "does this exist or can it", so a deep section is listed rather
  // than silently dropped for readers who never opened the drawer.
  function domPresent(c) {
    try {
      if (c.charAt(0) === '#') {
        var id = c.slice(1);
        if (document.getElementById(id)) return true;
        if (window.PDXProfileSpine && typeof window.PDXProfileSpine.hasTarget === 'function') {
          return !!window.PDXProfileSpine.hasTarget(id);
        }
        return false;
      }
      var body = document.getElementById('modal-body');
      return !!(body && body.querySelector(c));
    } catch (e) { return false; }
  }

  function elFor(target) {
    try {
      if (target.charAt(0) === '#') return document.getElementById(target.slice(1));
      var body = document.getElementById('modal-body');
      return body ? body.querySelector(target) : null;
    } catch (e) { return null; }
  }

  // ── Jump ────────────────────────────────────────────────────────────────
  // _pdxNavJump is the chrome-aware scroll: it mounts deferred drawers, opens
  // every closed lid above the target, and offsets by the sticky pill rail. It
  // needs an id, so a stage container gets one assigned here rather than in the
  // spine — the outline is what needed it, so the outline pays for it.
  function idOf(item) {
    if (item.target.charAt(0) === '#') return item.target.slice(1);
    var el = elFor(item.target);
    if (!el) return '';
    if (!el.id) el.id = 'pdxol-at-' + item.key;
    return el.id;
  }

  // The heading, not the container — a jump that leaves focus on the panel
  // hands a keyboard or screen-reader user a scroll position and no place in
  // the document. tabindex="-1" so it is focusable without joining tab order.
  function headingOf(el) {
    if (!el) return null;
    if (/^H[1-6]$/.test(el.tagName || '')) return el;
    var scope = el;
    if (el.classList && el.classList.contains('pdx-nav-anchor')) {
      scope = el.nextElementSibling || el.parentElement || el;
    }
    var h = null;
    try { h = scope.querySelector('h1,h2,h3,h4,[role="heading"]'); } catch (e) {}
    return h || (scope.nodeType === 1 ? scope : null);
  }

  function jump(key, btn) {
    var item = null, i;
    for (i = 0; i < state.items.length; i++) if (state.items[i].key === key) item = state.items[i];
    if (!item) return;
    var id = idOf(item);
    if (!id) return;
    if (typeof window._pdxNavJump === 'function') {
      window._pdxNavJump(id, null);
    } else {
      var el = document.getElementById(id);
      if (el) { try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }
    }
    if (btn) paintActive(key);
    var h = headingOf(document.getElementById(id));
    if (h) {
      try {
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: true });
      } catch (e) {}
    }
  }

  function paintActive(key) {
    if (!state.nav) return;
    var btns = state.nav.querySelectorAll('.pdxol-item');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-pdxol') === key;
      btns[i].classList.toggle('is-current', on);
      if (on) btns[i].setAttribute('aria-current', 'true');
      else btns[i].removeAttribute('aria-current');
    }
  }

  // ── Placement: one node, two homes ──────────────────────────────────────
  // Desktop it must be a direct child of the scroller to stay sticky for the
  // whole file. Phone it must be in the content flow under the letterhead, so
  // it reads as part of the file's opening rather than as floating chrome —
  // and so it can never sit over the Team bar in #modal-footer. Nothing here
  // uses position:fixed; the chip row scrolls away like the letterhead does.
  function phoneHome() {
    var body = document.getElementById('modal-body');
    if (!body) return null;
    // Member: the end of the identity stage IS "below the status banners,
    // above the first claim" — the assembler put everything above the first
    // sentinel there, banners included.
    var id = body.querySelector('.pdxsp-stage-identity');
    if (id) return { parent: id, before: null };
    var head = body.querySelector('.jf > .jf-head');
    if (head && head.parentNode) return { parent: head.parentNode, before: head.nextSibling };
    var first = body.querySelector('.pdxsp-stage');
    if (first && first.parentNode) return { parent: first.parentNode, before: first };
    var content = document.getElementById('modal-content');
    return content ? { parent: content, before: content.firstChild } : null;
  }

  function isWide() {
    try { return !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches); }
    catch (e) { return false; }
  }

  function place() {
    if (!state.nav) return;
    var body = document.getElementById('modal-body');
    if (!body) return;
    var wide = isWide();
    state.nav.classList.toggle('pdxol--rail', wide);
    state.nav.classList.toggle('pdxol--chips', !wide);
    if (wide) {
      if (state.nav.parentNode !== body || body.firstChild !== state.nav) {
        body.insertBefore(state.nav, body.firstChild);
      }
      return;
    }
    var home = phoneHome();
    if (!home) return;
    if (state.nav.parentNode !== home.parent || state.nav.nextSibling !== home.before) {
      home.parent.insertBefore(state.nav, home.before);
    }
  }

  // ── Scroll spy ──────────────────────────────────────────────────────────
  // Same shape as the pill rail's: an IntersectionObserver rooted on
  // #modal-body, clipped at the top by the sticky chrome, so "which section am
  // I in" is answered from rects the observer already measured. No per-frame
  // getBoundingClientRect sweep.
  function arm() {
    teardownObs();
    var body = document.getElementById('modal-body');
    if (!body || !state.nav) return;
    var spy = [], i;
    for (i = 0; i < state.items.length; i++) {
      var el = elFor(state.items[i].target);
      if (el) spy.push({ key: state.items[i].key, el: el });
    }
    if (!spy.length) return;
    var nav = document.getElementById('pdx-profile-nav');
    var line = (nav && nav.offsetHeight ? nav.offsetHeight : 0) + 16;
    var above = [];

    function paint() {
      var idx = 0;
      for (var k = 0; k < spy.length; k++) if (above[k]) idx = k;
      paintActive(spy[idx].key);
    }

    if (typeof window.IntersectionObserver !== 'function') { paint(); return; }
    var obs = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        var en = entries[e], k = -1;
        for (var j = 0; j < spy.length; j++) if (spy[j].el === en.target) { k = j; break; }
        if (k === -1) continue;
        var ref = en.rootBounds ? en.rootBounds.top : null;
        if (ref === null) { above[k] = !en.isIntersecting; continue; }
        above[k] = en.boundingClientRect.top <= ref;
      }
      if (!window._pdxNavUserJumping) paint();
    }, { root: body, rootMargin: (-line) + 'px 0px 0px 0px', threshold: 0 });
    for (i = 0; i < spy.length; i++) obs.observe(spy[i].el);
    state.obs = obs;
    paint();
  }

  function teardownObs() {
    if (state.obs) { try { state.obs.disconnect(); } catch (e) {} }
    state.obs = null;
  }

  function teardown() {
    teardownObs();
    if (state.nav && state.nav.parentNode) state.nav.parentNode.removeChild(state.nav);
    state.nav = null;
    state.items = [];
    state.kind = '';
  }

  function build(list) {
    var nav = document.createElement('nav');
    nav.className = 'pdxol';
    nav.id = 'pdx-file-outline';
    nav.setAttribute('aria-label', 'Sections in this file');
    var h = '<p class="pdxol-kick">In this file</p><ul class="pdxol-list">';
    for (var i = 0; i < list.length; i++) {
      h += '<li class="pdxol-li"><button type="button" class="pdxol-item" data-pdxol="' +
        esc(list[i].key) + '">' + esc(list[i].label) + '</button></li>';
    }
    nav.innerHTML = h + '</ul>';
    nav.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('.pdxol-item') : null;
      if (!b) return;
      ev.preventDefault();
      ev.stopPropagation();
      jump(b.getAttribute('data-pdxol'), b);
    });
    return nav;
  }

  function bindOnce() {
    if (state.bound) return;
    state.bound = true;
    // The breakpoint moves the node between its two homes. Nothing is rebuilt,
    // so the list cannot differ between skins.
    try {
      state.mq = window.matchMedia('(min-width: 1024px)');
      var onMq = function () { if (state.nav) { place(); arm(); } };
      if (state.mq.addEventListener) state.mq.addEventListener('change', onMq);
      else if (state.mq.addListener) state.mq.addListener(onMq);
    } catch (e) {}
    // A deferred drawer mounting changes what is reachable, and the pill rail
    // already announces that by re-arming. Ride that signal rather than adding
    // a second mutation watcher.
    try {
      var prev = window._pdxNavRearmSoon;
      if (typeof prev === 'function' && !prev.__pdxol) {
        var wrapped = function () {
          try { prev.apply(window, arguments); } finally {
            try { rearm(); } catch (e) {}
          }
        };
        wrapped.__pdxol = true;
        window._pdxNavRearmSoon = wrapped;
      }
    } catch (e) {}
    // The rail lives in #modal-body, which outlives a #modal-content rewrite.
    // Closing the file has to take it with it.
    try {
      var close = window.closeModal;
      if (typeof close === 'function' && !close.__pdxol) {
        var wrap = function () {
          try { teardown(); } catch (e) {}
          return close.apply(this, arguments);
        };
        wrap.__pdxol = true;
        window.closeModal = wrap;
      }
    } catch (e) {}
  }

  function mount() {
    teardown();
    bindOnce();
    var kind = kindOf();
    var list = items(kind, domPresent);
    if (list.length < MIN_ITEMS) return;
    state.kind = kind;
    state.items = list;
    state.nav = build(list);
    place();
    arm();
  }

  // Re-resolve after the DOM under the file changed. Cheap enough to call on
  // every drawer mount: if the list is unchanged the node is rebuilt with the
  // same rows, and if a deep section just appeared it gains one.
  function rearm() {
    if (!state.nav) return;
    var list = items(kindOf(), domPresent);
    var same = list.length === state.items.length, i;
    for (i = 0; same && i < list.length; i++) {
      if (list[i].key !== state.items[i].key || list[i].target !== state.items[i].target) same = false;
    }
    if (same) { place(); arm(); return; }
    if (list.length < MIN_ITEMS) { teardown(); return; }
    var current = state.nav.querySelector('.pdxol-item.is-current');
    var keep = current ? current.getAttribute('data-pdxol') : '';
    var parent = state.nav.parentNode, next = state.nav.nextSibling;
    teardownObs();
    var nav = build(list);
    if (parent) parent.replaceChild(nav, state.nav);
    else if (next && next.parentNode) next.parentNode.insertBefore(nav, next);
    state.nav = nav;
    state.items = list;
    place();
    arm();
    if (keep) paintActive(keep);
  }

  window.PDXPersonOutline = {
    mount: mount,
    rearm: rearm,
    jump: jump,
    teardown: teardown,
    items: items,
    specs: specs,
    kindOf: kindOf,
    MIN_ITEMS: MIN_ITEMS
  };
})();
