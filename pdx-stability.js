/* ═══════════════════════════════════════════════════════════════════════════
   pdx-stability.js · App-shell layout-stability hardening
   ───────────────────────────────────────────────────────────────────────────
   PURELY ADDITIVE. This module changes no feature behaviour and renders no UI.
   It exists to remove four whole-app sources of mobile "jumpiness" that were
   spread across ~15 feature files, without editing any of them:

     1 · ONE SCROLL LOCK, REFERENCE-COUNTED AND SCROLL-PRESERVING
         ~40 call sites in 15 files each own `document.body.style.overflow`
         directly ('hidden' to open a modal, '' to close it). Two bugs fall out
         of that:
           · Nested overlays. Open a profile (#modal-overlay locks the body),
             open a receipt inside it, close the receipt — the receipt's
             `overflow = ''` unlocks the body while the profile is still up, so
             the page scrolls away underneath the open modal and you land
             somewhere else when you finally close it.
           · No scroll restoration. Locking/unlocking the document scroller can
             move the reading position, most visibly on iOS, where a body-only
             `overflow: hidden` does not reliably hold the page still at all.
         Rather than rewrite 40 call sites, we install ONE seam: an own
         `overflow` accessor on the single `document.body.style` object. Every
         existing assignment keeps working verbatim and is routed through a
         coordinator that remembers the scroll position, locks the real document
         scroller (<html>, which iOS honours), and refuses to unlock while a
         known overlay is still open.

         FAIL-OPEN BY CONSTRUCTION: every path that can hold the lock is bounded
         by a watchdog and released on pagehide, so a missed close can never
         leave the page unscrollable. When in doubt this unlocks.

     2 · SCROLL ANCHORING FOR LATE-HYDRATING SECTIONS (Safari/iOS only)
         Most of the page's sections render from data that arrives after first
         paint (deferred data modules, IntersectionObserver-gated mounts, live
         Firestore reads). When one of them grows while it sits ABOVE the
         viewport, everything below it — the part you are actually reading —
         slides down under your finger.
         Chrome and Firefox fix this themselves with native CSS scroll
         anchoring. Safari implements none of it, which is why the symptom is a
         mobile one. So we feature-detect `overflow-anchor` and, only when the
         engine lacks it, reproduce the behaviour with a ResizeObserver: when an
         observed section's height changes entirely above the viewport, scroll by
         the same delta so the visual position is unchanged. Where the browser
         already does this, we install nothing and stay out of the way.

     3 · A MEASURED NAV HEIGHT (--pdx-nav-h)
         The fixed top nav's height was hard-coded into sticky offsets and
         scroll padding in several places (`top: 62px`, `scroll-padding-top:
         108px`, …). Those constants are right at one breakpoint and wrong at
         the others, so sticky jump-bars tuck under the nav or float away from
         it, and hash jumps land with the heading hidden. We measure the nav once
         and publish it as a custom property that the stylesheet consumes.

     4 · NO SMOOTH-SCROLL HIJACK OF PROGRAMMATIC RESTORES
         `html { scroll-behavior: smooth }` is global, which turns every
         restorative `scrollTo` into a visible animated slide. All internal
         corrections here are explicitly instant.

   Load order: this must be the first script inside <body> so the lock seam is
   in place before any feature module can open a modal.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.PDXStability) return;              // idempotent — never install twice

  var root = document.documentElement;

  /* ─── Instant, animation-proof programmatic scrolling ────────────────────
     `html { scroll-behavior: smooth }` applies to scrollTo/scrollBy too, so a
     correction meant to be invisible would animate instead. `behavior:'instant'`
     is the standards answer; the class is a belt-and-braces fallback for engines
     that ignore it. */
  var adjusting = 0;                            // >0 while WE are moving the page

  function scrollToInstant(y) {
    adjusting++;
    root.classList.add('pdx-instant-scroll');
    try {
      try { window.scrollTo({ top: y, left: window.scrollX || 0, behavior: 'instant' }); }
      catch (e) { window.scrollTo(window.scrollX || 0, y); }
    } finally {
      root.classList.remove('pdx-instant-scroll');
      // Release on the next frame: the scroll event this caused has not fired yet.
      requestAnimationFrame(function () { adjusting = Math.max(0, adjusting - 1); });
    }
  }

  function scrollByInstant(dy) {
    scrollToInstant((window.scrollY || window.pageYOffset || 0) + dy);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     1 · SCROLL-LOCK COORDINATOR
     ═══════════════════════════════════════════════════════════════════════ */

  /* Overlays whose "still open" state we trust enough to hold the lock for.
     Each entry is read from inline style / attributes / classes that the owning
     feature file already maintains — never getComputedStyle, so this stays cheap
     enough to poll. Anything not listed here simply unlocks as it always did. */
  function anyOverlayOpen() {
    // Politician profile — the dominant case, and the one nested closes broke.
    var ov = document.getElementById('modal-overlay');
    if (ov && ov.style.display && ov.style.display !== 'none') return true;
    // Community Evidence Exchange + Open Forum detail overlays.
    var cee = document.getElementById('cee-overlay');
    if (cee && cee.classList.contains('open')) return true;
    var fbd = document.getElementById('fbd-overlay');
    if (fbd && fbd.classList.contains('open')) return true;
    // Issue Spotlight overlay (uses the `hidden` attribute).
    var is = document.getElementById('issue-spotlight');
    if (is && !is.hidden) return true;
    return false;
  }

  var locked = false;
  var savedY = null;
  var watchdog = 0;

  // Raw writes that bypass our own accessor (see the seam below).
  var rawSetOverflow = function (v) {};

  function doLock() {
    if (locked) return;                         // already held — keep the first savedY
    locked = true;
    savedY = window.scrollY || window.pageYOffset || 0;
    // Lock the real document scroller. Body-only `overflow: hidden` is ignored by
    // iOS Safari; <html> is honoured. `scrollbar-gutter: stable` (mobile-polish.css)
    // keeps the desktop scrollbar's space reserved so this costs no width shift.
    root.classList.add('pdx-scroll-locked');
    rawSetOverflow('hidden');                   // preserve the original body rule too
  }

  function doUnlock() {
    if (watchdog) { clearInterval(watchdog); watchdog = 0; }
    if (!locked) { rawSetOverflow(''); return; }
    locked = false;
    root.classList.remove('pdx-scroll-locked');
    rawSetOverflow('');
    var y = savedY;
    savedY = null;
    // Only correct a genuine drift; never fight a position the page already holds.
    if (y != null && Math.abs((window.scrollY || window.pageYOffset || 0) - y) > 2) {
      scrollToInstant(y);
    }
  }

  /* An unlock arriving while another overlay is still open is the nested-close
     bug: hold the lock, but never unconditionally. The watchdog re-checks and
     hard-releases after ~30s regardless, so no missed close can strand the page. */
  function armWatchdog() {
    if (watchdog) return;
    var tries = 0;
    watchdog = setInterval(function () {
      tries++;
      if (!anyOverlayOpen() || tries > 120) {    // 120 × 250ms ≈ 30s hard ceiling
        clearInterval(watchdog); watchdog = 0;
        doUnlock();
      }
    }, 250);
  }

  function requestUnlock() {
    if (!locked) { rawSetOverflow(''); return; }
    if (anyOverlayOpen()) { armWatchdog(); return; }
    doUnlock();
  }

  /* ── The seam ───────────────────────────────────────────────────────────
     `element.style` returns one stable CSSStyleDeclaration per element, so an
     own accessor defined on `document.body.style` shadows the prototype's for
     that object alone. Blast radius: the <body> element's overflow, nothing
     else. Every `document.body.style.overflow = …` in the app keeps compiling,
     keeps reading back the value it set, and now routes through the coordinator.
     `setProperty`/`removeProperty` are wrapped for the same reason. */
  function installSeam(body) {
    var style = body.style;
    // Which prototype carries the `overflow` accessor differs by engine
    // (CSSStyleDeclaration.prototype in Blink/WebKit, CSS2Properties.prototype in
    // Gecko), so walk the chain rather than assuming the immediate parent.
    var desc = null;
    for (var p = Object.getPrototypeOf(style); p && !desc; p = Object.getPrototypeOf(p)) {
      desc = Object.getOwnPropertyDescriptor(p, 'overflow');
    }
    var nativeSet = desc && desc.set ? desc.set.bind(style) : null;
    var nativeGet = desc && desc.get ? desc.get.bind(style) : null;
    var nativeSetProperty = style.setProperty.bind(style);
    var nativeRemoveProperty = style.removeProperty.bind(style);

    // Without a usable native accessor there is nothing safe to wrap — bail out
    // and leave the app exactly as it was.
    if (!nativeSet || !nativeGet) return false;

    rawSetOverflow = function (v) { try { nativeSet(v); } catch (e) {} };

    var shadow = nativeGet() || '';             // what callers read back

    function route(value) {
      var v = (value == null ? '' : String(value)).trim().toLowerCase();
      shadow = value == null ? '' : String(value);
      if (v === 'hidden' || v === 'clip') { doLock(); return; }
      if (v === '' || v === 'visible' || v === 'auto' || v === 'initial' || v === 'unset') {
        requestUnlock(); return;
      }
      rawSetOverflow(value);                    // scroll / overlay / anything else
    }

    try {
      Object.defineProperty(style, 'overflow', {
        configurable: true,
        enumerable: true,
        get: function () { return shadow; },
        set: function (v) { route(v); }
      });
    } catch (e) {
      return false;                             // engine refuses — leave as-is
    }

    style.setProperty = function (prop, value, priority) {
      if (String(prop).toLowerCase() === 'overflow') { route(value); return; }
      return nativeSetProperty(prop, value, priority);
    };
    style.removeProperty = function (prop) {
      if (String(prop).toLowerCase() === 'overflow') { route(''); return shadow; }
      return nativeRemoveProperty(prop);
    };

    return true;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     2 · SCROLL ANCHORING FOR LATE HYDRATION  (engines without overflow-anchor)
     ═══════════════════════════════════════════════════════════════════════ */

  // Intentional navigation must not be "corrected" — a hash jump, a pill tap or
  // a scrollIntoView is the user asking to move. We suppress compensation for a
  // short window around those.
  var intentUntil = 0;
  function markIntent(ms) { intentUntil = Date.now() + (ms || 900); }

  function installAnchorGuard() {
    var hasNative = !!(window.CSS && CSS.supports && CSS.supports('overflow-anchor', 'auto'));
    if (hasNative) return false;                // Chrome/Firefox already do this
    if (!('ResizeObserver' in window)) return false;

    var heights = new Map();

    var ro = new ResizeObserver(function (entries) {
      if (locked) {                             // page scroll is frozen anyway
        entries.forEach(function (en) { heights.set(en.target, en.target.offsetHeight); });
        return;
      }
      var now = Date.now();
      var y = window.scrollY || window.pageYOffset || 0;
      var suppress = (y <= 4) || now < intentUntil || adjusting > 0;
      var delta = 0;

      for (var i = 0; i < entries.length; i++) {
        var el = entries[i].target;
        var h = el.offsetHeight;
        var prev = heights.get(el);
        heights.set(el, h);
        if (suppress || prev == null || prev === h) continue;
        var d = h - prev;
        // Only content that finished growing ENTIRELY above the viewport can have
        // pushed what we are reading. A 20k cap ignores nonsense (display toggles
        // of whole page-height sections) rather than teleporting the reader.
        if (Math.abs(d) < 2 || Math.abs(d) > 20000) continue;
        if (el.getBoundingClientRect().bottom > 0) continue;
        delta += d;
      }

      // One correction for every section that changed in this batch.
      if (delta) scrollByInstant(delta);
    });

    function observe(el) {
      if (!el || heights.has(el)) return;
      heights.set(el, el.offsetHeight);
      try { ro.observe(el); } catch (e) {}
    }

    function observeAll() {
      var list = document.querySelectorAll('body > section');
      for (var i = 0; i < list.length; i++) observe(list[i]);
    }

    observeAll();

    // Sections are appended late by some feature modules; pick those up too.
    if ('MutationObserver' in window) {
      new MutationObserver(function () { observeAll(); })
        .observe(document.body, { childList: true });
    }

    return true;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3 · MEASURED NAV HEIGHT
     ═══════════════════════════════════════════════════════════════════════ */

  function measureNav() {
    var nav = document.querySelector('nav.nav-blur');
    if (!nav) return;
    var h = Math.round(nav.getBoundingClientRect().height);
    if (!h || h > 200) return;                  // implausible — keep the CSS default
    root.style.setProperty('--pdx-nav-h', h + 'px');
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════════════ */

  function boot() {
    if (!document.body) return;

    installSeam(document.body);
    installAnchorGuard();
    measureNav();

    // Re-measure on resize / orientation change, coalesced to one frame.
    var rafId = 0;
    function remeasure() {
      if (rafId) return;
      rafId = requestAnimationFrame(function () { rafId = 0; measureNav(); });
    }
    window.addEventListener('resize', remeasure, { passive: true });
    window.addEventListener('orientationchange', remeasure, { passive: true });
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      // Late webfont swap changes the nav's text metrics — and therefore its height.
      document.fonts.ready.then(remeasure).catch(function () {});
    }

    // Intentional navigation: never "correct" a jump the user asked for.
    window.addEventListener('hashchange', function () { markIntent(1200); });
    window.addEventListener('popstate', function () { markIntent(1200); });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"],[data-target]') : null;
      if (a) markIntent(1200);
    }, true);
    document.addEventListener('keydown', function (e) {
      // Keyboard scrolling is intentional movement too.
      var k = e.key;
      if (k === 'PageDown' || k === 'PageUp' || k === 'Home' || k === 'End') markIntent(600);
    }, true);

    // Last-resort release: a page being unloaded or backgrounded must never be
    // handed back to the user still locked.
    window.addEventListener('pagehide', function () { if (locked) doUnlock(); });
  }

  window.PDXStability = {
    // Explicit API for anything that would rather not go through the style seam.
    lock: doLock,
    unlock: function () { doUnlock(); },
    isLocked: function () { return locked; },
    // Let callers mark a deliberate jump so the anchor guard stands down.
    markIntent: markIntent,
    scrollToInstant: scrollToInstant,
    remeasureNav: measureNav
  };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
