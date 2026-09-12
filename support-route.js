/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — SUPPORT ROUTING  ·  window.PDXSupportRoute
   One destination for "Support PolitiDex": the donate card at #support-politidex.

   WHAT WAS BROKEN
   ───────────────
   A reader on a phone who tapped a control labelled Support / Support PolitiDex
   landed on four different surfaces and never on the donate card. Desktop's
   overflow "Donate" worked; the hamburger item set the hash and a 2.3 MB
   document with lazily-mounting sections grew under the native jump, so the
   scroll finished somewhere else; the footer and the reader's own profile rail
   had no money control at all, so the nearest "Support"-looking thing was the
   People's Mandate or the backing lane — neither of which is about money.

   WHAT THIS FILE IS
   ─────────────────
   · THE ARRIVAL. #support-politidex is not a Door 1 work id, so nothing in the
     work layer claims it — but nothing gave it a settling scroll either. This
     does: close the person file if one is open, then re-issue the scroll while
     the ground above the card is still moving (the same pattern, and the same
     three-attempt ceiling, as index.html's settleScroll) and park the card
     under the fixed nav rather than under it.
   · THE RE-TAP. Tapping a control whose hash is already in the bar fires no
     hashchange, so the second tap used to do nothing at all. The delegated
     click handler below re-issues the arrival either way.
   · THE STATE CLASS. While this hash is the active one, <html> carries
     `pdx-support-hash`. support-route.css uses it for one thing: keeping the
     Your Trail bar (.pj-bar, position:fixed; bottom:0) off the Venmo button and
     the QR while the reader is on the card. The trail is untouched everywhere
     else on the site.

   WHAT THIS FILE IS NOT
   ─────────────────────
   Not a payment path, and not a second Support product. The card it routes to
   is the card that already shipped: https://venmo.com/u/PolitiDex first, the
   venmo:// deep link second, one handle, one QR, and no total, goal or progress
   bar — a donation is not a score and this file publishes no number.

   AND IT ROUTES ONLY MONEY. "Support" is also the backing lane's word for
   standing behind a politician (support-lane.js) and the People's Mandate's
   word for standing behind a demand. Those are separate products with their own
   ids and their own counts; a control that is not about money does not get this
   hash, and nothing here points them at Venmo. MONEY_LABEL below is the
   vocabulary that IS about money, exported so scripts/test-support-routing.mjs
   audits the app's controls against one list rather than its own copy of one.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXSupportRoute) return;

  // The card, and the one address that opens it. Not configurable: two
  // spellings of the donate destination is how a reader ends up on a third
  // surface again.
  var ID = 'support-politidex';
  var HASH = '#' + ID;
  // Set on <html> while HASH is the active hash. Read by support-route.css.
  var STATE_CLASS = 'pdx-support-hash';
  // The declaration a money control carries, so a control's intent is in the
  // markup rather than inferred from the words on it at audit time.
  var HOOK = 'data-pdx-support';

  // Labels that mean "give money to the project". Bare "Support"/"Supported" is
  // deliberately NOT here: that is the backing lane's verb for a politician and
  // the Mandate's for a demand, and routing it to Venmo would merge three
  // products into one button.
  var MONEY_LABEL = /^(?:donate|donate with venmo|donate now|support politidex|support the movement|support the project|support this project)$/i;

  // The ids whose controls say "support" and mean something else. Listed so the
  // suite can assert, from one place, that none of them ever carries HASH.
  var NOT_MONEY_IDS = ['agenda', 'open-forum', 'community-exchange', 'voter-hub', 'my-politicians'];

  function el(id) { return document.getElementById(id); }
  function fn(x) { return typeof x === 'function'; }

  // Is HASH the address in the bar right now?
  function active() {
    try { return String(location.hash || '') === HASH; } catch (e) { return false; }
  }

  function markState() {
    var root = document.documentElement;
    if (!root || !root.classList) return;
    try {
      if (active()) root.classList.add(STATE_CLASS);
      else root.classList.remove(STATE_CLASS);
    } catch (e) {}
  }

  // ── The card must be the thing on screen ──────────────────────────────────
  // A person file is a full-screen overlay with the document locked behind it,
  // so scrolling the page under it would land the reader on the donate card
  // only once they closed something they were not told to close. Closing it is
  // the honest reading of a tap on Support: the reader asked for the card.
  function closeCoverings() {
    // The mobile drawer. Its own onclick already does this for the item inside
    // it; a Support control tapped from anywhere else leaves it untouched, and
    // this keeps one arrival from leaving a menu open over its own destination.
    try {
      var menu = el('mobileMenu');
      if (menu && menu.classList) menu.classList.add('hidden');
    } catch (e) {}
    // The person file — CLOSED ONLY IF ONE IS ACTUALLY ON SCREEN.
    //
    // This used to fire on window._pdxCurrentProfileId alone, and that id is
    // the last person file opened in this tab, not the one showing: it survives
    // the file being closed. So arriving on the donate card after having looked
    // at anybody ran a full closeModal() over a page with no modal on it —
    // which clears document.body.style.overflow, tears down the jump rail,
    // destroys the charts, calls PDXPerson.restore() and re-runs two
    // document-wide chip refreshers, all in the same frame as the arrival
    // scroll. That is the layout fight in the report, and on a phone it is the
    // hitch itself.
    //
    // The overlay's own display is the truth, so it is read first. The id is
    // kept only as the fallback for a shell where the overlay element is not in
    // the document at all (an older cached page), where a live file would have
    // to be the id's doing.
    try {
      if (personFileShowing() && fn(window.closeModal)) window.closeModal();
    } catch (e) {}
  }

  // Is a person file on screen right now? Null when there is no way to tell.
  function personFileShowing() {
    var ov = null;
    try { ov = el('modal-overlay'); } catch (e) { ov = null; }
    if (ov) {
      var d = '';
      try { d = String((ov.style && ov.style.display) || ''); } catch (e) { d = ''; }
      if (d) return d !== 'none';
      // No inline display: the stylesheet owns it, so ask the engine.
      try {
        var c = getComputedStyle(ov);
        if (c && c.display) return String(c.display) !== 'none';
      } catch (e) {}
      // Neither could be read — fall through to the id.
    }
    try { return !!window._pdxCurrentProfileId; } catch (e) { return false; }
  }

  // Is the document still held by an overlay this arrival did not close? Then
  // the page must not scroll: unlocking it here would undo somebody else's
  // lock and drift the surface they are still looking at. The card's own
  // .pdx-donate-scroll (mobile-polish.css §7d) is its scroller either way.
  function docLocked() {
    try {
      var S = window.PDXStability;
      if (S && fn(S.isLocked)) return !!S.isLocked();
    } catch (e) {}
    try {
      var ov = String((document.body && document.body.style && document.body.style.overflow) || '');
      return ov.toLowerCase() === 'hidden';
    } catch (e) { return false; }
  }

  // How far down the page the fixed nav reaches. index.html measures the real
  // chrome into --pdx-chrome on every resize; the literal is its own fallback
  // value, used only if the variable has not been written yet.
  function chrome() {
    var px = 0;
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--pdx-chrome');
      px = parseFloat(String(v || '').replace(/[^0-9.\-]/g, ''));
      if (String(v).indexOf('rem') > -1) px = px * 16;
    } catch (e) { px = 0; }
    if (!px || px < 0 || px !== px) px = 114;   // 7.125rem, index.html's own :root value
    return px;
  }

  // ── settleScroll, for the donate card ─────────────────────────────────────
  // Same shape as index.html's: re-issue the scroll while the document-space
  // top of the card is still MOVING, and stop the moment it holds still. Three
  // attempts inside a second, which is short enough never to fight a reader who
  // has started scrolling somewhere else. The offset parks the card under the
  // nav instead of behind it, which is what "the card is the thing on screen"
  // means on a 390-wide viewport.
  var _tokens = 0;
  function park() {
    var mine = ++_tokens;
    var tries = 0, prevTop = null;
    function step() {
      if (mine !== _tokens) return;            // a newer arrival owns the scroll
      var card = el(ID);
      if (!card || !card.getBoundingClientRect) return;
      if (docLocked()) return;                 // somebody else's overlay is up
      var y = (window.pageYOffset ||
        (document.documentElement && document.documentElement.scrollTop) || 0);
      var top = card.getBoundingClientRect().top + y;
      if (prevTop !== null && Math.abs(top - prevTop) < 24) return;   // settled
      prevTop = top;
      var want = Math.max(0, Math.round(top - chrome() - 12));
      // ── ALREADY PARKED: SCROLL NOTHING ──────────────────────────────────
      // The card is where this function would put it, so there is no scroll to
      // issue — and issuing one anyway is not free. A smooth scrollTo to the
      // offset you are already at still hands the compositor a scroll
      // animation, still trips markIntent (which suppresses the stability
      // layer's own corrections for 1200 ms), and still arms the 320 ms and
      // 700 ms retries, each of which re-measures a 2.3 MB document. Three
      // times, for zero pixels. That is the "hitchy on phone and a bit on
      // desktop" in the report: the re-tap case, where the reader is looking
      // at the card and taps Support again.
      //
      // 1px, because getBoundingClientRect is fractional and a rounded `want`
      // can differ from a settled position by a sub-pixel without anything
      // having moved. Returning here also ends the retry chain, so an arrival
      // on a card that is already parked performs exactly zero scrolls.
      if (Math.abs(y - want) <= 1) return;
      try {
        var S = window.PDXStability;
        if (S && fn(S.markIntent)) S.markIntent(1200);
      } catch (e) {}
      try { window.scrollTo({ top: want, behavior: 'smooth' }); }
      catch (e) { try { window.scrollTo(0, want); } catch (e2) {} }
      if (++tries >= 3) return;
      setTimeout(step, tries === 1 ? 320 : 700);
    }
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { setTimeout(step, 40); });
    else setTimeout(step, 60);
    return true;
  }

  // The whole arrival. Safe to call twice — the second call simply re-parks.
  function arrive() {
    markState();
    if (!active()) return false;
    closeCoverings();
    park();
    return true;
  }

  // ── The controls ──────────────────────────────────────────────────────────
  // Every money control in the app resolves to HASH, so a click on one is
  // either a hash change (which hashchange below turns into an arrival) or a
  // click on the hash already in the bar (which fires nothing at all, and used
  // to be the "I tapped Support twice and nothing happened" report). This makes
  // both an arrival.
  function isSupportControl(node) {
    if (!node || node.nodeType !== 1) return false;
    try {
      if (node.hasAttribute && node.hasAttribute(HOOK)) return true;
      var href = (node.getAttribute && node.getAttribute('href')) || '';
      return href === HASH || href === '/' + HASH || href.slice(-HASH.length) === HASH;
    } catch (e) { return false; }
  }

  function onClick(ev) {
    var node = ev && ev.target;
    for (var hops = 0; node && hops < 8; hops++) {
      if (isSupportControl(node)) {
        if (active()) arrive();                // no hashchange is coming
        else setTimeout(arrive, 0);            // after the hash lands
        return;
      }
      node = node.parentNode;
    }
  }

  try { document.addEventListener('click', onClick, true); } catch (e) {}
  try { window.addEventListener('hashchange', function () { arrive(); }); } catch (e) {}

  // Cold load. Deferred a tick for the same reason person-file.js defers its
  // own boot: a macrotask scheduled from a deferred script is the earliest
  // moment the whole client exists. 'load' is the second chance, for the case
  // where the card's own section is still laying out when the first one runs.
  if (active()) {
    try { setTimeout(arrive, 0); } catch (e) {}
    try { window.addEventListener('load', function () { arrive(); }); } catch (e) {}
  } else {
    markState();
  }

  window.PDXSupportRoute = {
    ID: ID,
    HASH: HASH,
    STATE_CLASS: STATE_CLASS,
    HOOK: HOOK,
    // The vocabulary the audit reads. MONEY_LABEL is what "give money to the
    // project" is allowed to be called; NOT_MONEY_IDS is what must never take
    // this hash. Both exported so the suite and the app share one list.
    MONEY_LABEL: MONEY_LABEL,
    NOT_MONEY_IDS: NOT_MONEY_IDS,
    isMoneyLabel: function (s) { return MONEY_LABEL.test(String(s == null ? '' : s).trim()); },
    isSupportControl: isSupportControl,
    active: active,
    // Exposed for the suite: the overlay read that decides whether the arrival
    // is allowed to close anything.
    _personFileShowing: personFileShowing,
    arrive: arrive,
    // Exposed for the suite: the parking maths, without the scroll.
    _chrome: chrome,
    _docLocked: docLocked
  };
})();
