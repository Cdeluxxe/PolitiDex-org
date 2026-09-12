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

  // ── ONE BUNDLE PER IDLE SLICE ─────────────────────────────────────────────
  // ensureAll() injects every key it is handed in the same task. For the two
  // bulk warms below — the first interaction, and the post-load safety net —
  // that is spotlights-data.js (~1.2 MB), acct-spotlight-data.js (~587 KB) and
  // the cmp-data detail split parsed, executed AND fanned out back-to-back with
  // no frame in between. The previous pass moved that off the gesture itself,
  // which kept the tapped control's own frame; it still handed the browser the
  // whole two megabytes as a single unit a beat later, and a single unit is
  // exactly what makes a block unbreakable. On a signed-in desktop the first
  // interaction of a visit is very often the click that opens the account
  // dropdown, and the block landed under the open menu — which is Chrome's
  // "Page Unresponsive" dialog, reported with that dropdown still on screen.
  //
  // So the chain asks for a FRESH idle slice between files: each bundle lands in
  // its own task, the browser gets the gaps to paint the menu the reader just
  // opened and to answer their next tap, and the consumers of each file get
  // their arrival event in a task of its own too. Nothing about WHICH files load
  // — or that all of them eventually do — changes; only how many share one task.
  function warmChain(keys, i) {
    var list = keys || [];
    var at = i || 0;
    if (at >= list.length) return;
    var slice = function () {
      var next = function () { warmChain(list, at + 1); };
      var landing;
      try { landing = ensure(list[at]); } catch (e) { landing = null; }
      if (landing && typeof landing.then === 'function') landing.then(next, next);
      else next();
    };
    try {
      if ('requestIdleCallback' in window) { requestIdleCallback(slice, { timeout: 1200 }); return; }
    } catch (e) {}
    setTimeout(slice, 0);
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
  //   · THE BODY IS DEFERRED OUT OF THE GESTURE TASK. requestIdleCallback lets
  //     the browser paint the drawer first and does the injection in the gap
  //     after; the 1200 ms timeout means an always-busy main thread cannot starve
  //     it, and setTimeout(0) is the fallback where rIC is missing. Either way
  //     the three tags land in a LATER task than the tap.
  // Arming is still on the first interaction, and Triggers 1 and 3 below are
  // unchanged, so the data still arrives for a visitor who never taps at all.
  var IX = ['click', 'keydown', 'scroll'];
  var IX_OPTS = { passive: true };
  function onFirstInteraction() {
    IX.forEach(function (ev) { window.removeEventListener(ev, onFirstInteraction, false); });
    // Deferred AND split: see warmChain above. The first slice is still an idle
    // callback with a timeout (a permanently busy main thread cannot starve the
    // load every consumer of this data waits on), with setTimeout as the
    // fallback where requestIdleCallback is missing.
    warmChain(['cmpDetail', 'acctSpotlight', 'spotlights'], 0);
  }
  IX.forEach(function (ev) { window.addEventListener(ev, onFirstInteraction, IX_OPTS); });

  // ── Trigger 3 · guaranteed idle fallback after load ───────────────────────
  // Nothing that reads this data can stay empty even for a visitor who never
  // scrolls or interacts. Runs well after first paint, off the critical path.
  function idleFallback() {
    var run = function () { warmChain(['cmpDetail', 'spotlights', 'acctSpotlight'], 0); };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 3000);
  }

  if (document.readyState === 'complete') { wireObserver(); idleFallback(); }
  else {
    document.addEventListener('DOMContentLoaded', wireObserver);
    window.addEventListener('load', idleFallback);
  }
})();
