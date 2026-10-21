/* ═══════════════════════════════════════════════════════════════════════════
   first-visit-coach.js — a delayed, skippable welcome popup for new readers
   ────────────────────────────────────────────────────────────────────────────
   WHAT IT IS. One small popup, in plain language, for a reader who has never
   been here: set your location, search anything and see what they said versus
   how they voted, and what District Voice is (with one line saying boards and
   state legislative mapping are Utah-first). Three short points and three
   clear buttons — "Set my location", "Got it", "Not now" — plus a close (×).

   WHEN IT APPEARS. Only for a first visit: no saved location
   (window._hasUserLocation, voter-hub-location.js's own answer — this file
   never parses the location record) and no coach flag. It waits DELAY_MS after
   the document is parsed so the reader sees the hero first, and it checks both
   conditions again when the timer fires: a reader who set a location in those
   seconds is not asked to set one. If another dialog is visibly open (the
   location picker, a person file), it waits behind it for up to MAX_WAIT_MS
   and then shows anyway. It runs on the homepage, /voice and /find. Every
   decision is logged to the console under [PolitiDex coach], and
   PDXCoach.reset() replays it on the current page.

   IT DOES NOT TRAP. The backdrop is light and the page stays scrollable. There
   is no focus trap and no inert page: focus moves to the popup when it opens
   so a keyboard reader knows it is there, and returns where it was when it
   closes. Escape anywhere on the page closes it, and so do "Not now", ×, and a
   click on the backdrop.

   WHAT IT WRITES. One key, KEY below, set when the popup closes for any
   reason — and after that it never shows again. It is not a location key and
   it is not in any synced collection. It does not open the account sheet,
   write a residency row, or touch a location key or a stance store. Its one
   door is the finder that already exists.

   STYLING. The same deep-forest ground and ballot gold as the homepage's
   District Voice card (.pdxhv-* in index.html), under its own pdxfc- prefix
   because those rules are inline in index.html and absent from /voice and
   /find. No new colors.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXCoach) return;

  var BUILD = 'v378';                  // logged, so DevTools shows which copy is running
  var KEY = 'pdx_coach_seen';          // localStorage: set once, when the popup closes
  var DELAY_MS = 9000;                 // after the page is parsed, so the hero is seen first
  var RETRY_MS = 2000;                 // another dialog is open: look again this soon
  var MAX_WAIT_MS = 30000;             // ...for at most this long, then show anyway

  // WHY IT SKIPPED, IN DEVTOOLS. Every decision — waiting, showing, skipping and
  // the reason — is one console line under the same prefix, so "it never
  // showed" can be answered by filtering the console for [PolitiDex coach].
  function log(msg) {
    try { if (window.console && console.info) console.info('[PolitiDex coach ' + BUILD + '] ' + msg); } catch (e) {}
  }
  var ROOT_ID = 'pdx-first-visit-coach';
  var STYLE_ID = 'pdxfc-style';
  var TITLE_ID = 'pdxfc-title';
  var FINDER = '/find';
  // The locked District Voice line, verbatim. district-board.js and /voice's
  // own meta carry the same sentence.
  var VOICE_LINE = 'Anyone can read a board. Only verified residents of that seat get a voice that counts.';

  var POINTS = [
    'Set your location so PolitiDex can show the people who already represent you.',
    'Search any politician, bill, topic or claim and see what they said versus how they voted.',
    'District Voice is the rooms for your seats. ' + VOICE_LINE
  ];

  // UTAH FIRST, said once, under the District Voice point. True to the site as
  // it stands: state legislative lines are drawn only for Utah, so every State
  // House and State Senate board is a Utah seat, while every state's U.S. House
  // and U.S. Senate seat the roster names a member for has a read-only board —
  // so the sentence names legislative boards and mapping, then says the federal
  // boards are everywhere, and never says "your representatives".
  var SCOPE_NOTE = 'State legislative boards and mapping are live in Utah first. Other states will be added over time. U.S. House and U.S. Senate boards are open in every state.';
  // Inline as well as in the sheet below, so the line renders the same whether
  // or not the injected rules arrived — a plain muted line, never hidden.
  var SCOPE_STYLE = 'display:block;visibility:visible;opacity:1;margin-top:0.35rem;font-size:0.9rem;line-height:1.5;color:#9fb5a8;';

  function fn(v) { return typeof v === 'function'; }

  // ── State ─────────────────────────────────────────────────────────────────
  function seen() {
    try { return !!window.localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function setSeen(via) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ v: 2, via: via, at: Date.now() })); } catch (e) {}
  }
  function located() {
    try { return !!window._hasUserLocation; } catch (e) { return false; }
  }
  function shouldShow() { return !seen() && !located(); }
  function whyNot() {
    if (seen()) return 'pdx_coach_seen is set (the popup was already closed once)';
    if (located()) return 'a location is saved (window._hasUserLocation is true)';
    return '';
  }

  // Something else already holds the reader's attention: the location picker,
  // a person file, the account sheet. Read off the page's own dialogs, never
  // opened or changed from here.
  // #modal-overlay is the person file and .pdx-map-overlay the /find map; neither
  // carries aria-modal, so both are named.
  //
  // "OPEN" MEANS THE READER CAN SEE IT. Several of the homepage's dialogs stay
  // laid out while closed — parked off-screen, at opacity 0, or visibility
  // hidden — and an earlier check that only asked for client rects read those as
  // open, waited out its retries and gave up, so the popup never showed. Now a
  // dialog counts only if it is rendered, visible, not transparent, and has an
  // on-screen box with real area. Returns the blocker's label, or ''.
  var BUSY_SEL = '[aria-modal="true"]:not([hidden]), dialog[open], #modal-overlay, .pdx-map-overlay';
  function shown(n) {
    try {
      if (!n || n.id === ROOT_ID) return false;
      var cs = fn(window.getComputedStyle) ? window.getComputedStyle(n) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05)) return false;
      var r = fn(n.getBoundingClientRect) ? n.getBoundingClientRect() : null;
      if (!r || r.width < 2 || r.height < 2) return false;
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      if (vw && vh && (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh)) return false;
      return true;
    } catch (e) { return false; }
  }
  function busy() {
    try {
      var list = document.querySelectorAll(BUSY_SEL);
      for (var i = 0; i < list.length; i++) {
        if (shown(list[i])) return list[i].id ? '#' + list[i].id : (list[i].className || 'a dialog');
      }
    } catch (e) {}
    return '';
  }

  // ── Markup ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  function html() {
    return '<div class="pdxfc-card">' +
        '<button type="button" class="pdxfc-x" data-pdxfc-act="skip" aria-label="Close">×</button>' +
        '<p class="pdxfc-kick">Welcome to PolitiDex</p>' +
        '<h2 class="pdxfc-title" id="' + TITLE_ID + '" tabindex="-1">Here’s how it works</h2>' +
        '<ol class="pdxfc-points">' +
          POINTS.map(function (p, i) {
            return '<li class="pdxfc-point"><span class="pdxfc-n" aria-hidden="true">' + (i + 1) + '</span>' +
              '<span>' + esc(p) +
              (i === POINTS.length - 1 ? '<span class="pdxfc-scope" data-pdxfc-scope="utah" style="' + SCOPE_STYLE + '">' + esc(SCOPE_NOTE) + '</span>' : '') +
              '</span></li>';
          }).join('') +
        '</ol>' +
        '<div class="pdxfc-acts">' +
          '<a class="pdxfc-door" href="' + FINDER + '" data-pdxfc-door="finder">Set my location</a>' +
          '<button type="button" class="pdxfc-next" data-pdxfc-act="finish">Got it</button>' +
          '<button type="button" class="pdxfc-skip" data-pdxfc-act="skip">Not now</button>' +
        '</div>' +
      '</div>';
  }

  var CSS = [
    '#' + ROOT_ID + '{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(10,15,30,0.35);}',
    '.pdxfc-card{position:relative;width:100%;max-width:30rem;max-height:calc(100% - 1rem);overflow-y:auto;padding:1.4rem 1.4rem 1.2rem;text-align:left;border:1.5px solid rgba(245,200,66,0.55);border-left-width:4px;border-radius:0.9rem;background:linear-gradient(135deg,rgba(18,58,42,0.97),rgba(14,30,40,0.98));box-shadow:0 0 0 1px rgba(245,200,66,0.08),0 0 28px rgba(245,200,66,0.14),0 8px 24px rgba(0,0,0,0.28);color:#d8e8dc;}',
    '.pdxfc-x{position:absolute;top:0.35rem;right:0.35rem;width:44px;height:44px;border:0;border-radius:999px;background:none;font:400 1.6rem/1 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;cursor:pointer;}',
    '.pdxfc-x:hover,.pdxfc-x:focus-visible{color:#fff7dc;}',
    '.pdxfc-kick{margin:0 0 0.5rem;font:800 0.85rem/1 \'Barlow Condensed\',\'Barlow\',sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:#f5c842;}',
    '.pdxfc-title{margin:0 2rem 0.8rem 0;font:800 clamp(1.35rem,4vw,1.7rem)/1.15 \'Barlow Condensed\',\'Barlow\',sans-serif;color:#fff7dc;outline:none;}',
    '.pdxfc-points{margin:0 0 1rem;padding:0;list-style:none;display:grid;gap:0.7rem;}',
    '.pdxfc-point{display:flex;gap:0.65rem;align-items:flex-start;font:400 1rem/1.5 \'Barlow\',system-ui,sans-serif;color:#d8e8dc;}',
    '.pdxfc-n{flex:none;display:inline-flex;align-items:center;justify-content:center;width:1.6rem;height:1.6rem;border-radius:999px;font:800 0.85rem/1 \'Barlow Condensed\',\'Barlow\',sans-serif;background:linear-gradient(135deg,#fad96a,#e6b800);color:#0a0f1e;}',
    '.pdxfc-point>span:last-child{flex:1 1 auto;min-width:0;}',
    '.pdxfc-scope{display:block !important;visibility:visible !important;opacity:1 !important;margin-top:0.35rem;font:400 0.9rem/1.5 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;}',
    '.pdxfc-acts{display:flex;flex-wrap:wrap;align-items:center;gap:0.6rem;}',
    '.pdxfc-door{display:inline-flex;align-items:center;min-height:44px;padding:0.55rem 1.15rem;border:1.5px solid rgba(245,200,66,0.9);border-radius:999px;font:700 1rem/1 \'Barlow\',system-ui,sans-serif;color:#0a0f1e;text-decoration:none;background:linear-gradient(135deg,#fad96a,#e6b800);cursor:pointer;transition:filter 0.2s ease;}',
    '.pdxfc-door:hover,.pdxfc-door:focus-visible{filter:brightness(1.06);}',
    '.pdxfc-next{display:inline-flex;align-items:center;min-height:44px;padding:0.55rem 1.15rem;border:1.5px solid rgba(245,200,66,0.55);border-radius:999px;font:700 1rem/1 \'Barlow\',system-ui,sans-serif;color:#fff7dc;background:transparent;cursor:pointer;}',
    '.pdxfc-skip{min-height:44px;padding:0 0.6rem;border:0;background:none;font:600 0.95rem/1 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}',
    '.pdxfc-skip:hover,.pdxfc-skip:focus-visible{color:#fff7dc;}',
    '.pdxfc-door:focus-visible,.pdxfc-next:focus-visible,.pdxfc-skip:focus-visible,.pdxfc-x:focus-visible{outline:2px solid #fff7dc;outline-offset:3px;}',
    '@media (max-width:480px){#' + ROOT_ID + '{align-items:flex-end;padding:0.5rem;}}',
    '@media (prefers-reduced-motion:reduce){.pdxfc-door{transition:none;}}',
    '@media print{#' + ROOT_ID + '{display:none;}}'
  ].join('\n');

  // ── Open / close ──────────────────────────────────────────────────────────
  var root = null;
  var timer = 0;
  var returnFocus = null;

  function close(via) {
    setSeen(via);
    if (timer) { clearTimeout(timer); timer = 0; }
    document.removeEventListener('keydown', onKey);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    try { if (returnFocus && fn(returnFocus.focus)) returnFocus.focus(); } catch (e) {}
    returnFocus = null;
    try { document.dispatchEvent(new CustomEvent('pdx:coach-dismissed', { detail: { via: via } })); } catch (e) {}
  }

  // THE FINDER DOOR. A real anchor to /find in the markup, so it works with
  // scripting off and middle-clicks. Taking it counts as finishing the welcome.
  // On a page that carries the finder's own opener, a plain click uses it in
  // place instead of leaving the page: pdxFindMyReps() on the homepage
  // (who-represents-me.js), the map on /find. The popup closes first so the
  // picker is never under it.
  function openFinder(e) {
    var modified = e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0);
    close('finder');
    if (modified) return;
    try {
      if (window.__PDX_FIND_DOC && fn(window.openDistrictMapModal)) {
        if (e) e.preventDefault();
        window.openDistrictMapModal();
        return;
      }
      if (fn(window.pdxFindMyReps) && document.getElementById('who-represents-me')) {
        if (e) e.preventDefault();
        window.pdxFindMyReps();
      }
    } catch (err) {}
  }

  function onClick(e) {
    var t = e.target;
    if (t === root) { close('skip'); return; }           // the backdrop
    var act = t && t.closest ? t.closest('[data-pdxfc-act]') : null;
    if (act) {
      close(act.getAttribute('data-pdxfc-act') === 'finish' ? 'done' : 'skip');
      return;
    }
    var door = t && t.closest ? t.closest('[data-pdxfc-door]') : null;
    if (door) openFinder(e);
  }

  function onKey(e) {
    if (root && (e.key === 'Escape' || e.key === 'Esc')) close('skip');
  }

  function open() {
    if (root || !shouldShow()) return false;
    var body = document.body;
    if (!body) return false;
    if (!document.getElementById(STYLE_ID)) {
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'pdxfc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-labelledby', TITLE_ID);
    root.innerHTML = html();
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    try { returnFocus = document.activeElement || null; } catch (e) { returnFocus = null; }
    body.appendChild(root);
    try {
      var h = document.getElementById(TITLE_ID);
      if (h && fn(h.focus)) h.focus({ preventScroll: true });
    } catch (e) {}
    return true;
  }

  // The timer. Re-checks the gate when it fires; waits behind another open
  // dialog a bounded number of times, then gives up for this page view.
  // The timer. Re-checks the gate when it fires. Behind another visible dialog
  // it looks again every RETRY_MS, and after MAX_WAIT_MS it shows anyway, so a
  // first-time reader always gets it — a stuck or misread dialog can delay the
  // popup, never cancel it.
  function schedule(delay, waited) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = 0;
      var why = whyNot();
      if (why) { log('skipped: ' + why + '.'); return; }
      var blocker = busy();
      if (blocker && waited < MAX_WAIT_MS) {
        log('waiting: ' + blocker + ' is open; looking again in ' + (RETRY_MS / 1000) + 's.');
        schedule(RETRY_MS, waited + RETRY_MS);
        return;
      }
      if (blocker) log('showing anyway: ' + blocker + ' has been open for ' + (MAX_WAIT_MS / 1000) + 's.');
      if (open()) log('showing.');
      else log('could not open: ' + (whyNot() || (root ? 'already open' : 'no <body>')) + '.');
    }, delay);
  }

  // THE CLOCK STARTS WHEN THE DOCUMENT IS PARSED, not at window 'load'. This
  // script is deferred and listed after voter-hub-location.js on all three
  // documents, so by the time it runs that module has already answered
  // _hasUserLocation. Waiting for 'load' as well made the popup hostage to the
  // slowest image or third-party script on the page — on a slow connection,
  // or with one request that never settled, the nine seconds never started.
  function boot() {
    var why = whyNot();
    if (why) { log('skipped: ' + why + '.'); return; }
    log('first visit: showing in ' + (DELAY_MS / 1000) + 's unless a location is saved first.');
    schedule(DELAY_MS, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Dismissed in another tab: close here too, without writing again.
  window.addEventListener('storage', function (e) {
    if (!e || e.key !== KEY || !e.newValue) return;
    if (timer) { clearTimeout(timer); timer = 0; }
    document.removeEventListener('keydown', onKey);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  });

  window.PDXCoach = {
    BUILD: BUILD,
    KEY: KEY,
    DELAY_MS: DELAY_MS,
    POINTS: POINTS,
    SCOPE_NOTE: SCOPE_NOTE,
    shouldShow: shouldShow,
    seen: seen,
    // Test/debug seams.
    _html: html,
    _open: open,
    _close: close,
    _root: function () { return root; },
    // Clears the popup's own flag only (never the location) and replays the
    // delay on this page view.
    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      log('reset: pdx_coach_seen cleared.');
      boot();
    }
  };
})();
