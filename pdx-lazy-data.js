// PolitiDex data module (Run 3 perf): ON-DEMAND loader for the largest curated
// data files. Instead of parsing acct-spotlight-data.js (~587KB) and the
// cmp-data detail split during page startup, this injects each file only when it
// is actually needed:
//   • when a section that consumes it approaches the viewport,
//   • on the first meaningful user interaction, or
//   • (as a guaranteed safety net) shortly after window `load`.
// Every data file still merges into the SAME window global its inline stub already
// created (via Object.assign), so a late arrival is transparent to every reader —
// the closures hold the same object reference and simply see it populated. When a
// file finishes loading a `pdx:data:<key>` event fires so any consumer that
// rendered early can refresh itself.
(function () {
  if (window.PDXLazyData) return;

  // key -> descriptor. `loaded` flips true once the file has executed; `promise`
  // is memoized so ensure() is idempotent (a file is fetched at most once).
  // spotlights-data.js (~1.2MB) USED TO BE THE BIGGEST ENTRY HERE and is
  // deliberately gone. Lazy-loading it was the right fix while /issue/<slug>
  // was an overlay on this document, but it was still 1.2 MB fetched and
  // compiled on a scroll or the first tap, for writeups most visitors never
  // opened. /issue/<slug> is its own document now (spotlight.html) and owns the
  // corpus outright; this page reads spotlight-index.js instead — ~86 KB of
  // slug/title/place/blurb that ships with the document and needs no loader.
  var FILES = {
    acctSpotlight: { src: '/acct-spotlight-data.js' },
    cmpDetail:     { src: '/cmp-data-detail.js' },
    // Legislation browse (Phase 1): the light inline bill index, fetched the first
    // time the Digital Library's Legislation tab opens.
    bills:         { src: '/bills-index.js' }
  };

  function ensure(key) {
    var f = FILES[key];
    if (!f) return Promise.resolve(false);
    if (f.promise) return f.promise;
    f.promise = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = f.src;
      // async=false preserves execution order if several are injected at once, and
      // keeps behavior deterministic relative to other dynamically-added scripts.
      s.async = false;
      s.onload = function () {
        f.loaded = true;
        // A bundle landing is a change to the inputs every derived figure is
        // computed from: these files merge new stances, mappings and records
        // into the same roster globals the integrity read walks. Bumping the
        // derivation epoch invalidates every epoch-keyed cache at once, so a
        // surface that computed a figure from the pre-merge roster cannot keep
        // publishing it after the merge. Without this, readers that memoize a
        // read stay one bundle behind whatever the profile computes live.
        try { if (typeof window.PDXDataChanged === 'function') window.PDXDataChanged(); } catch (e) {}
        try { document.dispatchEvent(new CustomEvent('pdx:data:' + key)); } catch (e) {}
        resolve(true);
      };
      s.onerror = function () { f.loaded = false; resolve(false); };
      (document.head || document.documentElement).appendChild(s);
    });
    return f.promise;
  }

  function ensureAll(keys) { (keys || []).forEach(ensure); }

  // ── ONE DEFERRED TASK, ALL THREE BUNDLES ──────────────────────────────────
  // Two rules, and they pull in opposite directions until you notice that only
  // one of them is about the reader's frame:
  //
  //   NOT ON THE CLICK. ensureAll() used to run inside the gesture's own task,
  //   so the first tap of a visit appended ~2 MB of data script before the
  //   tapped control's handler had run. That is the defect the previous pass
  //   fixed and it stays fixed: the body below always lands in a LATER task
  //   than the gesture.
  //
  //   AND NOT A THREE-SLICE CHAIN. The previous pass then asked for a fresh
  //   idle slice BETWEEN files and waited for each bundle's onload before
  //   requesting the next. That is what made the whole visit feel dead: three
  //   bundles fetched and executed strictly one after another, each gated on an
  //   idle callback that a busy main thread hands out slowly, is ~2 MB spread
  //   over three to six seconds — and for those seconds every consumer of this
  //   data is still empty and every transition is competing with a bundle
  //   landing. Serialising the work did not make it smaller; it made it last
  //   longer and overlap everything the reader did next.
  //
  // So: ONE task, all three tags. Appending three <script src> elements costs
  // nothing measurable — the parse and execute happen in the browser's own
  // tasks, which it can interleave with painting, and with async=false it still
  // executes them in the order given. The network fetches now run in parallel
  // instead of head-to-tail, so the warm finishes in roughly the time of the
  // slowest file rather than the sum of all three.
  function warmSoon(keys) {
    var list = keys || [];
    var run = function () { try { ensureAll(list); } catch (e) {} };
    // A short idle timeout, not a long one: the point is to miss the gesture's
    // task and let the browser paint what was just touched, not to wait for a
    // quiet main thread that on this page may never come.
    try {
      if ('requestIdleCallback' in window) { requestIdleCallback(run, { timeout: 250 }); return; }
    } catch (e) {}
    setTimeout(run, 0);
  }

  window.PDXLazyData = {
    ensure: ensure,
    loaded: function (key) { return !!(FILES[key] && FILES[key].loaded); },
    // Run cb now if the file is already loaded, otherwise once it becomes ready —
    // and kick off the load so the callback is guaranteed to eventually fire.
    whenReady: function (key, cb) {
      if (this.loaded(key)) { try { cb(); } catch (e) {} return; }
      document.addEventListener('pdx:data:' + key, function h() {
        document.removeEventListener('pdx:data:' + key, h);
        try { cb(); } catch (e) {}
      });
      ensure(key);
    }
  };

  // ── Trigger 1 · sections approaching the viewport ─────────────────────────
  // Each below-the-fold section pulls exactly the data it renders from, a screen
  // or so before it scrolls into view, so content is ready by the time it shows.
  // #digital-library, #local-issues and #all-spotlights are no longer listed:
  // all three read window.PDXSpotlight, which is now the always-present index
  // rather than a file that had to arrive.
  var SECTIONS = [
    { sel: '#say-vs-do',           keys: ['acctSpotlight'] },
    { sel: '#hr1-showcase',        keys: ['acctSpotlight'] },
    { sel: '#myteam-browse-panel', keys: ['cmpDetail', 'acctSpotlight'] }
  ];

  function wireObserver() {
    if (!('IntersectionObserver' in window)) {
      // No observer support (very old browsers): load everything now so nothing
      // that depends on this data is ever missing.
      ensureAll(['acctSpotlight', 'cmpDetail']);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        ensureAll(e.target.__pdxKeys);
        io.unobserve(e.target);
      });
    }, { rootMargin: '1200px 0px' });
    SECTIONS.forEach(function (sec) {
      var el = document.querySelector(sec.sel);
      if (el) { el.__pdxKeys = sec.keys; io.observe(el); }
    });
  }

  // ── Trigger 2 · first meaningful user interaction ─────────────────────────
  // As soon as the visitor engages (scroll / tap / key), warm the data that a
  // profile modal, search or comparison opened moments later would need.
  //
  // THIS USED TO RUN ON THE FINGER, AND IT WAS THE SLOWEST GESTURE ON THE SITE.
  // The listener was registered in CAPTURE phase on window for pointerdown,
  // touchstart, wheel, keydown and scroll, and it called ensureAll() inline — so
  // the very first tap anywhere injected ~2 MB of data script (spotlights-data,
  // acct-spotlight-data, cmp-data-detail) BEFORE the tapped control's own handler
  // had run. Tapping the hamburger meant compiling two megabytes of curated data
  // and only then toggling a class, which is why the drawer arrived seconds late.
  //
  // Two changes, and the loader itself is untouched:
  //   · BUBBLE PHASE, NOT CAPTURE, and 'click' rather than pointerdown/touchstart
  //     (which fired three times for one tap and always before the handler). By
  //     the time a bubbled click reaches window the inline onclick has already
  //     flipped the class, so the gesture's own work is done.
  //   · THE BODY IS DEFERRED OUT OF THE GESTURE TASK — ONCE, NOT ONCE PER FILE.
  //     requestIdleCallback lets the browser paint the drawer first and does the
  //     injection in the gap after; the short 250 ms timeout means an always-busy
  //     main thread cannot starve it, and setTimeout(0) is the fallback where rIC
  //     is missing. Either way all three tags land together in a LATER task than
  //     the tap. Asking for a fresh slice BETWEEN files, and waiting on each
  //     bundle's onload before requesting the next, was tried and withdrawn: it
  //     spread the same ~2 MB across three to six seconds and made the whole
  //     visit feel dead. See warmSoon above.
  // Arming is still on the first interaction, and Triggers 1 and 3 below are
  // unchanged, so the data still arrives for a visitor who never taps at all.
  var IX = ['click', 'keydown', 'scroll'];
  var IX_OPTS = { passive: true };
  function onFirstInteraction() {
    IX.forEach(function (ev) { window.removeEventListener(ev, onFirstInteraction, false); });
    // Deferred, not split: see warmSoon above. One idle callback with a short
    // timeout (a permanently busy main thread cannot starve the load every
    // consumer of this data waits on), with setTimeout(0) as the fallback where
    // requestIdleCallback is missing. Either way the three tags land together,
    // in a later task than the tap.
    warmSoon(['cmpDetail', 'acctSpotlight']);
  }
  IX.forEach(function (ev) { window.addEventListener(ev, onFirstInteraction, IX_OPTS); });

  // ── Trigger 3 · guaranteed idle fallback after load ───────────────────────
  // Nothing that reads this data can stay empty even for a visitor who never
  // scrolls or interacts. Runs well after first paint, off the critical path.
  function idleFallback() {
    // The net for a visitor who never taps. Also one task, also all three: a
    // reader who has not interacted is exactly the reader who should not be
    // handed a staggered three-to-six-second warm the moment they finally do.
    var run = function () { try { ensureAll(['cmpDetail', 'acctSpotlight']); } catch (e) {} };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 3000);
  }

  if (document.readyState === 'complete') { wireObserver(); idleFallback(); }
  else {
    document.addEventListener('DOMContentLoaded', wireObserver);
    window.addEventListener('load', idleFallback);
  }
})();
