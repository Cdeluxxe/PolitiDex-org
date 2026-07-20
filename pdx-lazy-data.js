// PolitiDex data module (Run 3 perf): ON-DEMAND loader for the largest curated
// data files. Instead of parsing spotlights-data.js (~1.2MB), acct-spotlight-data.js
// (~587KB) and the cmp-data detail split during page startup, this injects each
// file only when it is actually needed:
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
  var FILES = {
    spotlights:    { src: '/spotlights-data.js' },
    acctSpotlight: { src: '/acct-spotlight-data.js' },
    cmpDetail:     { src: '/cmp-data-detail.js' }
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
        try { document.dispatchEvent(new CustomEvent('pdx:data:' + key)); } catch (e) {}
        resolve(true);
      };
      s.onerror = function () { f.loaded = false; resolve(false); };
      (document.head || document.documentElement).appendChild(s);
    });
    return f.promise;
  }

  function ensureAll(keys) { (keys || []).forEach(ensure); }

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
  var SECTIONS = [
    { sel: '#digital-library',     keys: ['spotlights'] },
    { sel: '#local-issues',        keys: ['spotlights'] },
    { sel: '#all-spotlights',      keys: ['spotlights'] },
    { sel: '#say-vs-do',           keys: ['acctSpotlight'] },
    { sel: '#hr1-showcase',        keys: ['acctSpotlight'] },
    { sel: '#myteam-browse-panel', keys: ['cmpDetail', 'acctSpotlight'] }
  ];

  function wireObserver() {
    if (!('IntersectionObserver' in window)) {
      // No observer support (very old browsers): load everything now so nothing
      // that depends on this data is ever missing.
      ensureAll(['spotlights', 'acctSpotlight', 'cmpDetail']);
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
  var IX = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
  function onFirstInteraction() {
    IX.forEach(function (ev) { window.removeEventListener(ev, onFirstInteraction, true); });
    ensureAll(['cmpDetail', 'acctSpotlight', 'spotlights']);
  }
  IX.forEach(function (ev) { window.addEventListener(ev, onFirstInteraction, true); });

  // ── Trigger 3 · guaranteed idle fallback after load ───────────────────────
  // Nothing that reads this data can stay empty even for a visitor who never
  // scrolls or interacts. Runs well after first paint, off the critical path.
  function idleFallback() {
    var run = function () { ensureAll(['cmpDetail', 'spotlights', 'acctSpotlight']); };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 3000);
  }

  if (document.readyState === 'complete') { wireObserver(); idleFallback(); }
  else {
    document.addEventListener('DOMContentLoaded', wireObserver);
    window.addEventListener('load', idleFallback);
  }
})();
