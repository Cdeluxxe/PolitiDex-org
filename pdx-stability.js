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
         It stands down completely while the page is in motion — a finger on the
         glass, momentum after it lifts, a wheel — because a correction applied
         mid-fling cancels the fling and lands the reader somewhere they did not
         ask for. That is what made the true top of the homepage unreachable.

     3 · ONE MEASURED TOP OFFSET (--pdx-chrome)
         The fixed top nav's depth was hard-coded into sticky offsets and scroll
         padding in several places (`top: 62px`, `scroll-padding-top: 108px`, …).
         Those constants are right at one breakpoint and wrong at the others, so
         sticky jump-bars tuck under the nav or float away from it, and hash
         jumps land with the heading hidden.
         The first pass at this published its own variable, --pdx-nav-h, beside
         the --pdx-chrome that index.html already measured — two numbers for one
         offset, which disagreed badly enough to override the correct one
         site-wide — the block above measureNav() below has the full account.
         --pdx-nav-h is now a CSS alias, and what remains here is a fallback
         publisher of --pdx-chrome for any page that loads this file without the
         inline measurer.

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

  /* How close to scroll 0 counts as "the reader is at the top". Nothing can have
     grown entirely above the viewport this close to it, so any correction here
     is a correction for a shift that did not happen — and the shove it produces
     is what stopped the page resting at the true top. Deliberately a few pixels
     rather than exactly 0: iOS reports fractional and briefly negative offsets
     while the rubber band settles. */
  var TOP_BAND = 8;

  /* THE TRUE TOP IS EVERYTHING THE FIXED CHROME COVERS, NOT JUST SCROLL 0.
     TOP_BAND above is the "already there" band. This is the wider band in which
     a DOWNWARD correction is never legitimate, and it is the rule the mobile hero
     report keeps landing on: the reader flings up toward the brand lockup, a
     section finishes hydrating, and a positive delta lands them a hundred-odd
     pixels short of the top — with the lockup still behind the search row,
     because the page never reached the position the hero's clearance was computed
     for. Within one chrome-depth of the document top the only thing above the
     viewport is the hero's own top padding, and padding does not hydrate: any
     correction claiming content grew up there is measuring something else.

     Read from the same --pdx-chrome the nav publishes, so it tracks a notch and a
     font scale instead of re-guessing them; the fallback is the stylesheet's own
     fail-closed depth. Corrections that move the page UP (toward the top) are
     untouched at any position — the guard has never been the thing that stopped
     the reader reaching the hero, a downward shove was. */
  function topReach() {
    var v = 0;
    try { v = parseFloat(root.style.getPropertyValue('--pdx-chrome')) || 0; } catch (e) { v = 0; }
    if (!(v > 0 && v < 320)) v = 114;            // 7.125rem, the stylesheet literal
    return Math.max(TOP_BAND, Math.round(v));
  }

  function scrollToInstant(y) {
    // A correction may never come to rest above the document's own top edge. iOS
    // accepts a negative offset as a rubber band and settles back, which reads as
    // a bounce at exactly the moment the reader is trying to hold the true top.
    if (!(y > 0)) y = 0;
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

  /* THE READER'S OWN FINGER IS INTENT TOO, AND IT WAS THE ONE KIND THIS MISSED.
     markIntent above covered hash changes, anchor clicks and Page/Home/End —
     every way of moving the page EXCEPT the way people actually move it on a
     phone. So a section that finished hydrating above the viewport while a
     reader was flinging back toward the hero fired scrollByInstant, and on iOS
     a programmatic scrollTo mid-fling does two things at once: it cancels the
     momentum and it lands the page at current + delta. The reader let go
     expecting scroll 0 and got a lower resting position instead — the "false
     top" that made the brand unreachable. Swipe again, hit another hydration,
     same result.

     A correction is only ever worth making when the page is STILL. While it is
     moving, the shift the guard exists to hide is smaller than the jump it
     would cause, so these two signals stand it down:

       · touching — a finger is on the glass right now. Held across the whole
         gesture rather than a timeout, because a drag can last as long as it
         likes.
       · motionUntil — the page has scrolled within the last fraction of a
         second, from any cause: momentum after the finger lifts (which outlives
         touchend, and is exactly when the old code fired), a wheel, a trackpad,
         a keyboard. This is what covers the fling.

     Both are set from passive listeners, so neither can cost a scroll frame. */
  var touching = 0;
  var motionUntil = 0;
  var MOTION_QUIET_MS = 250;    // how long after the last scroll tick counts as "still moving"
  function markMotion() { motionUntil = Date.now() + MOTION_QUIET_MS; }
  function pageMoving() { return touching > 0 || Date.now() < motionUntil; }

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
      var suppress = (y <= TOP_BAND) || now < intentUntil || adjusting > 0 || pageMoving();
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

      // One correction for every section that changed in this batch — but read
      // the position again first. Everything above was decided when the callback
      // began, and on a phone the page can have travelled a long way since:
      // measuring the entries alone takes layout. If the reader has reached the
      // top in the meantime there is nothing above the viewport left to preserve,
      // and pushing them back down is the bug this guard was causing.
      if (!delta) return;
      if (pageMoving()) return;
      var atNow = window.scrollY || window.pageYOffset || 0;
      if (atNow <= TOP_BAND) return;
      // The one direction that can strand the reader below the hero. Anything
      // still inside the chrome's own depth is, for this purpose, at the top.
      if (delta > 0 && atNow <= topReach()) return;
      scrollByInstant(delta);
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
     3 · THE MEASURED CHROME, WHEN NOBODY ELSE PUBLISHES IT
     ───────────────────────────────────────────────────────────────────────
     This used to measure the nav itself and publish a SECOND variable,
     --pdx-nav-h, alongside index.html's --pdx-chrome. Two numbers for one
     offset is not a source of truth, and the two disagreed in a way that had
     teeth:

       · It took `nav.getBoundingClientRect().height` — the whole element. The
         mobile drawer is a normal-flow child of that nav, so an open menu was
         part of the number.
       · To survive that it discarded anything over 200px. A notched phone at a
         stepped-up font size renders the two permanent rows plus the safe-area
         inset at more than 200px, so on exactly the devices that reported
         POLITIDEX clipped under the search bar the measurement was thrown away
         and the 57px stylesheet literal stood.
       · mobile-polish.css loads after app.css, so the html{scroll-padding-top}
         it derived from that literal overrode app.css's correct
         calc(var(--pdx-chrome) …) site-wide: 73px of clearance against 113–160px
         of real chrome.

     --pdx-nav-h is now a plain CSS alias of --pdx-chrome, so there is one
     number. What survives here is a FALLBACK PUBLISHER for --pdx-chrome, for a
     page that loads this file without the inline measurer under the nav: it
     measures the same thing that one does — the bottom edge of the last
     PERMANENT row, which the drawer cannot inflate — and it stands down the
     moment a real measurement is already in place. It never overwrites a value
     someone else is maintaining. */

  function chromeAlreadyPublished() {
    try {
      var v = root.style.getPropertyValue('--pdx-chrome');
      return !!(v && parseFloat(v) > 0);
    } catch (e) { return false; }
  }

  function measureNav() {
    // Someone with a better view of the chrome is already publishing it.
    if (chromeAlreadyPublished()) return;
    var nav = document.getElementById('pdx-topnav') || document.querySelector('nav.nav-blur');
    if (!nav) return;
    // The permanent rows end where the search row ends; the drawer is rendered
    // after it. Measuring that row's viewport-relative bottom, on a nav pinned
    // at top:0, is the depth of the fixed chrome — safe-area inset included,
    // because the nav is padded by it.
    var row = nav.querySelector('.pdx-eye-row');
    var h;
    try {
      h = Math.round(row ? row.getBoundingClientRect().bottom
                         : nav.getBoundingClientRect().height);
    } catch (e) { return; }
    // Same sanity band as the inline measurer: below ~40px the nav is not
    // rendered, above ~320px something other than the chrome is being measured.
    // The old 200px ceiling was itself the bug on tall notched chrome.
    if (!(h > 40 && h < 320)) return;
    root.style.setProperty('--pdx-chrome', h + 'px');
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

    /* The reader's own scrolling, which is the movement the guard has to stay
       out of the way of. All passive: none of these can delay a scroll frame,
       and none of them call preventDefault, so scrolling behaves exactly as it
       did — they only record that it is happening.

       'scroll' is the one that matters most. It keeps firing through iOS
       momentum after the finger has lifted, which is the window the guard used
       to fire in and the reason a fling toward the hero landed short. */
    window.addEventListener('scroll', markMotion, { passive: true });
    window.addEventListener('wheel', markMotion, { passive: true });
    document.addEventListener('touchstart', function () { touching++; }, { passive: true });
    function touchDone() {
      touching = Math.max(0, touching - 1);
      // The page is usually still travelling when the finger leaves; let the
      // scroll ticks above carry the suppression from here.
      markMotion();
    }
    document.addEventListener('touchend', touchDone, { passive: true });
    document.addEventListener('touchcancel', touchDone, { passive: true });

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
