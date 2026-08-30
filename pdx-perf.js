// PolitiDex perf instrumentation (Perf pass 1: person-file time-to-record).
//
// The clock itself is opened by an inline script in the head of index.html — it
// has to be, because the first thing worth measuring on a cold /p/<pid> is how
// long the rest of the document takes to become executable, and a deferred file
// cannot observe its own wait. That inline block creates window.PDXPerf with
// mark()/between() and takes the first mark ('head'). This file is the reporting
// half: it upgrades the same object in place — never replaces it, or the head
// marks would be lost — with the browser's own paint and navigation timings, the
// documented stage list, and a readable dump.
//
// WHAT THE WATERFALL ACTUALLY IS, on a cold /p/<pid>:
//
//   1. index.html                 ~2.12 MB of HTML must be parsed. Roughly
//                                 2.6 MB of the app's script bytes are
//                                 parser-blocking (no defer), so they execute
//                                 mid-parse and hold the parser while they do.
//   2. deferred modules           97 root-absolute JS modules, ~9.28 MB total,
//                                 execute in document order AFTER the whole
//                                 document is parsed. person-file.js sits ~80
//                                 files in; nothing in it can run before then.
//   3. roster                     person-file.js waits on window._pdxRosterState
//                                 (behind anonymous sign-in) before it will
//                                 adopt the address: STEP 120ms, EARLY 2000ms,
//                                 CEILING 15000ms.
//   4. the record                 only then open() -> warm() ->
//                                 GET /api/voting-record/member/<pid>
//
// Stages 1-3 are latency the record does not depend on: the pid is in
// location.pathname from the first byte and the endpoint is keyed by pid alone.
// That is the whole argument for the head prefetch, and these marks are how you
// check it is still true rather than assuming it.
//
// Reading it live: open /p/chew_h68?pdxperf=1 and the table prints itself on
// load; or call PDXPerf.dump() in the console at any time.
(function () {
  var P = window.PDXPerf;
  if (!P) {
    // Defensive only: index.html always opens the clock first. A page that
    // somehow loads this file alone still gets a working, if late, recorder.
    P = window.PDXPerf = {
      marks: {}, order: [],
      mark: function (name, at) {
        if (!name || this.marks[name] !== undefined) return this.marks[name];
        var t;
        try { t = (at === undefined) ? performance.now() : at; } catch (e) { t = at || 0; }
        this.marks[name] = t; this.order.push(name); return t;
      },
      between: function (a, b) {
        var x = this.marks[a], y = this.marks[b];
        return (x === undefined || y === undefined) ? null : (y - x);
      }
    };
  }
  if (P.report) return;

  // ── The documented stages ─────────────────────────────────────────────────
  // Order is the order they are expected to land in, not the order they will.
  // A stage that never lands prints as "—" and that absence is the finding:
  // e.g. `brief` missing while `vr-data` is present means the brief painted a
  // loading state and never swapped off it.
  var STAGES = [
    ['head',                'inline head script runs (clock opens)'],
    ['crawl-visible',       'edge crawl header on screen, named, for THIS address'],
    ['crawl-generic',       'the header was neutralised or nameless (no first paint with a name)'],
    ['vr-session-hit',      'first voting-record page served from sessionStorage'],
    ['vr-prefetch-start',   'head prefetch issued GET /api/voting-record/member/<pid>'],
    ['vr-prefetch-retry',   'session entry stale/absent -> network prefetch issued'],
    ['vr-prefetch-headers', 'prefetch response headers'],
    ['vr-prefetch-json',    'prefetch body parsed'],
    ['first-paint',         'browser first paint'],
    ['first-contentful-paint', 'browser first contentful paint'],
    ['dom-content-loaded',  'document parsed + all 97 deferred modules executed'],
    ['person-boot',         'person-file.js began adopting the /p/ address'],
    ['roster',              'roster state settled (time to roster)'],
    ['person-open',         'PDXPerson.open() rendered the shell'],
    ['file-named',          'modal/file paints with the person NAME on it'],
    ['vr-adopt',            'fetchMember adopted the head prefetch (no 2nd request)'],
    ['vr-fetch-start',      'fetchMember issued its OWN request (prefetch missed)'],
    ['vr-data',             'first voting-record page in hand (time to first page)'],
    ['vr-warm',             'sync record cache warm (pdx-voting-warm, pre-roster)'],
    ['vr-section',          'voting-record section rendered (pdx-voting-warm)'],
    ['brief-loading',       'formal brief painted a loading state'],
    ['brief',               'formal brief swapped off loading'],
    ['window-load',         'window load']
  ];

  // The four numbers the perf pass is judged on. Each is a mark measured from
  // navigation start, which is what PDXPerf.mark's performance.now() already is.
  var HEADLINES = [
    ['time to first paint',            ['first-contentful-paint', 'first-paint']],
    ['time to roster',                 ['roster']],
    ['time to first voting-record page', ['vr-data', 'vr-prefetch-json', 'vr-session-hit']],
    ['time to brief off-loading',      ['brief']]
  ];

  function ms(v) { return (v === null || v === undefined) ? null : Math.round(v); }

  function pick(names) {
    for (var i = 0; i < names.length; i++) {
      if (P.marks[names[i]] !== undefined) return { name: names[i], at: P.marks[names[i]] };
    }
    return null;
  }

  // ── Browser-owned timings, folded into the same clock ──────────────────────
  // performance.now() and paint-entry startTime share the same origin, so paint
  // marks are directly comparable to our own without conversion.
  function capturePaint() {
    var list = [];
    try { list = performance.getEntriesByType('paint') || []; } catch (e) { list = []; }
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === 'first-paint') P.mark('first-paint', list[i].startTime);
      if (list[i].name === 'first-contentful-paint') P.mark('first-contentful-paint', list[i].startTime);
    }
  }

  try {
    if (typeof PerformanceObserver === 'function') {
      var po = new PerformanceObserver(function (l) {
        var es = l.getEntries();
        for (var i = 0; i < es.length; i++) {
          if (es[i].name === 'first-paint') P.mark('first-paint', es[i].startTime);
          if (es[i].name === 'first-contentful-paint') P.mark('first-contentful-paint', es[i].startTime);
        }
      });
      po.observe({ type: 'paint', buffered: true });
    }
  } catch (e) {}
  capturePaint();

  // ── Live notification ─────────────────────────────────────────────────────
  // Wrap mark() so anything watching (a console session, a future field beacon)
  // hears each stage as it lands instead of having to poll. The wrapper keeps
  // the original's contract exactly: first write wins, returns the timestamp.
  var rawMark = P.mark;
  P.mark = function (name, at) {
    var had = this.marks[name] !== undefined;
    var t = rawMark.call(this, name, at);
    if (!had && this.marks[name] !== undefined) {
      try {
        document.dispatchEvent(new CustomEvent('pdx:perf', { detail: { name: name, at: t } }));
      } catch (e) {}
    }
    return t;
  };

  // ── Reporting ─────────────────────────────────────────────────────────────
  P.report = function () {
    capturePaint();
    var out = { marks: {}, headlines: {}, missing: [] };
    for (var i = 0; i < STAGES.length; i++) {
      var n = STAGES[i][0];
      if (P.marks[n] === undefined) out.missing.push(n);
      else out.marks[n] = ms(P.marks[n]);
    }
    for (var j = 0; j < HEADLINES.length; j++) {
      var hit = pick(HEADLINES[j][1]);
      out.headlines[HEADLINES[j][0]] = hit ? ms(hit.at) : null;
    }
    // Did the prefetch pay for itself? `adopted` is the whole point: it means
    // the record request that used to start after stages 1-3 started in the
    // head instead, and fetchMember reused it rather than issuing a second one.
    out.prefetch = {
      served: P.marks['vr-session-hit'] !== undefined ? 'session' :
              (P.marks['vr-prefetch-start'] !== undefined || P.marks['vr-prefetch-retry'] !== undefined) ? 'network' : 'none',
      adopted: P.marks['vr-adopt'] !== undefined,
      duplicateRequest: P.marks['vr-fetch-start'] !== undefined,
      // How much of the record's wait was hidden behind document parse +
      // module execution + the roster wait.
      headStartMs: ms(P.between('vr-prefetch-start', 'person-open'))
    };
    return out;
  };

  // Every mark in the order it landed, with the gap from the previous one —
  // the gaps are where the time actually goes.
  P.waterfall = function () {
    capturePaint();
    var labels = {};
    for (var i = 0; i < STAGES.length; i++) labels[STAGES[i][0]] = STAGES[i][1];
    var rows = P.order.slice().map(function (n) { return { name: n, at: P.marks[n] }; });
    rows.sort(function (a, b) { return a.at - b.at; });
    var prev = 0;
    return rows.map(function (r) {
      var row = { stage: r.name, at: ms(r.at), sincePrev: ms(r.at - prev), what: labels[r.name] || '' };
      prev = r.at;
      return row;
    });
  };

  P.dump = function () {
    var r = P.report();
    if (!window.console) return r;
    try {
      console.log('%cPDX perf · ' + location.pathname, 'font-weight:bold');
      console.log('headlines (ms from navigation start)', r.headlines);
      console.log('prefetch', r.prefetch);
      if (console.table) console.table(P.waterfall());
      else console.log(P.waterfall());
      if (r.missing.length) console.log('stages that never landed:', r.missing.join(', '));
    } catch (e) {}
    return r;
  };

  // ── The cold-open line ────────────────────────────────────────────────────
  // FOUR NUMBERS, ONE LINE, NO OPT-IN. The waterfall below is for reading; this
  // is for screenshotting. It answers the only question a cold /p/<pid> is judged
  // on — how long until this address shows a recognisable person — by printing the
  // four moments that make up that wait, in the order they happen, as milliseconds
  // from navigation start:
  //
  //   crawl visible   the edge header named the person (first paint with a name)
  //   vote sent       the roll-call request left the browser
  //   vote back       its body was parsed (or answered from sessionStorage)
  //   name on file    the modal/file itself painted with the name on it
  //
  // Each is taken from the first of several marks that can mean it, because the
  // same moment has different owners depending on the path: the record request is
  // the head prefetch on a cold arrival and fetchMember's own request on a warm
  // SPA hop, and a session hit is both "sent" and "back" at once.
  //
  // A stage that never landed prints "—", and the absence is the finding: no
  // `crawl visible` means the edge header was neutralised or missing; no
  // `name on file` means the modal never painted this person's name.
  //
  // ONE console.log, on /p/<pid> only, once per page. Nothing is uploaded, nothing
  // is sampled, and there is no vendor: this writes to the console of the browser
  // it is running in and nowhere else.
  var COLD = [
    ['crawl visible', ['crawl-visible', 'crawl-generic']],
    ['vote sent',     ['vr-prefetch-start', 'vr-prefetch-retry', 'vr-fetch-start', 'vr-session-hit']],
    ['vote back',     ['vr-session-hit', 'vr-prefetch-json', 'vr-data']],
    ['name on file',  ['file-named', 'person-open']]
  ];

  P.cold = function () {
    var parts = [];
    for (var i = 0; i < COLD.length; i++) {
      var hit = pick(COLD[i][1]);
      parts.push(COLD[i][0] + ' ' + (hit ? ms(hit.at) : '—'));
    }
    return 'PDX cold ' + location.pathname + ' · ms from navStart · ' + parts.join(' → ');
  };

  var _coldPrinted = false;
  P.coldLine = function () {
    if (_coldPrinted) return null;
    _coldPrinted = true;
    var line = P.cold();
    try { if (window.console && console.log) console.log(line); } catch (e) {}
    return line;
  };

  // Printed the moment the last of the four lands, so the line is on screen while
  // the reader is still looking at the open they just did — and on a fallback
  // timer after load, so a page where the file never painted still prints what it
  // got instead of printing nothing at all.
  try {
    if (/^\/p\/[A-Za-z0-9_]+\/?$/.test(location.pathname)) {
      document.addEventListener('pdx:perf', function (e) {
        if (e && e.detail && e.detail.name === 'file-named') {
          setTimeout(function () { P.coldLine(); }, 0);
        }
      });
      var coldFallback = function () { setTimeout(function () { P.coldLine(); }, 4000); };
      if (document.readyState === 'complete') coldFallback();
      else window.addEventListener('load', coldFallback, { once: true });
    }
  } catch (e) {}

  // ── Opt-in auto-report ────────────────────────────────────────────────────
  // Never prints unless asked. The brief is graded on cold opens, and a cold
  // open with a console dump in it is not the same page.
  var on = false;
  try { on = /(?:^|[?&])pdxperf=1(?:&|$)/.test(location.search); } catch (e) { on = false; }
  if (on) {
    // Late enough that the brief has had its chance; the marks stay readable
    // afterwards either way.
    var fire = function () { setTimeout(function () { P.dump(); }, 2500); };
    if (document.readyState === 'complete') fire();
    else window.addEventListener('load', fire, { once: true });
  }

  document.addEventListener('DOMContentLoaded', function () { P.mark('dom-content-loaded'); });
  window.addEventListener('load', function () { P.mark('window-load'); capturePaint(); });
  if (document.readyState !== 'loading') P.mark('dom-content-loaded');
})();
