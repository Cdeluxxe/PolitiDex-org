/* ═══════════════════════════════════════════════════════════════════════════
   first-visit-coach.js — a short, skippable walk through the core flow
   ────────────────────────────────────────────────────────────────────────────
   WHAT IT IS. Four small steps, one at a time, in one card on the page: see who
   represents you, this is the record, District Voice is the rooms for your
   seats, done. Game-tutorial weight — a guided path, not a wall of text — and
   it is NOT a modal: no backdrop, no focus trap, no scroll lock. Skip is on
   every step, and Escape inside the card does the same thing.

   WHEN IT APPEARS. Only for a first visit: no saved location
   (window._hasUserLocation, voter-hub-location.js's own answer — this file
   never parses the location record) and no coach flag. It mounts on the
   homepage, above the District Voice card, and on /voice and /find (under the
   page's own heading) when a reader lands there first. A walk already under way in this tab (the step is
   held in sessionStorage) resumes on the next document even after step 1 saved
   a location, because finishing step 1 is the point of step 1.

   WHAT IT WRITES. One key, KEY below, set when the reader skips or finishes —
   and after that the coach never shows again. It is not a location key and it
   is not in any synced collection. Nothing else: it does not open the account
   sheet, write a residency row, touch a location key or a stance store. It only
   points at doors that already exist — the finder, a browse room and /voice.

   STYLING. The same deep-forest ground and ballot gold as the homepage's
   District Voice card (.pdxhv-* in index.html), under its own pdxfc- prefix
   because those rules are inline in index.html and absent from /voice and
   /find. No new colors.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXCoach) return;

  var KEY = 'pdx_coach_seen';          // localStorage: set once, on skip or finish
  var STEP_KEY = 'pdx_coach_step';     // sessionStorage: where this tab's walk is
  var ROOT_ID = 'pdx-first-visit-coach';
  var STYLE_ID = 'pdxfc-style';
  var FINDER = '/find';
  var RECORD = '/stances';
  var VOICE = '/voice';
  // The locked District Voice line, verbatim. district-board.js and /voice's
  // own meta carry the same sentence.
  var VOICE_LINE = 'Anyone can read a board. Only verified residents of that seat get a voice that counts.';

  var STEPS = [
    { id: 'seat',
      title: 'See who represents you.',
      body: 'Start by setting your location so PolitiDex can show the people who already hold power over you.',
      door: { href: FINDER, label: 'Set my location', kind: 'finder' },
      doneLine: 'Location saved. Your seats are listed on Who Represents Me.' },
    { id: 'record',
      title: 'This is the record.',
      body: 'Every person file shows what they said and how they actually voted, with the bills and the short line under each vote.',
      door: { href: RECORD, label: 'See an example', kind: 'record' } },
    { id: 'voice',
      title: 'District Voice is the rooms for your seats.',
      body: VOICE_LINE,
      note: 'The rooms are where neighbors in the same district read the same record and speak to that seat.',
      door: { href: VOICE, label: 'Open District Voice', kind: 'voice' } },
    { id: 'done',
      title: 'That’s the path.',
      body: 'Your seats, their record, your rooms. Every one of them stays in the top menu.',
      door: null }
  ];

  function fn(v) { return typeof v === 'function'; }

  // ── State ─────────────────────────────────────────────────────────────────
  // Storage failures fail toward NOT showing the coach again only when the flag
  // was actually written; a reader with storage off gets the coach each visit,
  // and Skip still removes it from the page they are on.
  function seen() {
    try { return !!window.localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function setSeen(via) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ v: 1, via: via, at: Date.now() })); } catch (e) {}
    try { window.sessionStorage.removeItem(STEP_KEY); } catch (e) {}
  }
  function savedStep() {
    try {
      var raw = window.sessionStorage.getItem(STEP_KEY);
      if (raw == null) return -1;
      var n = parseInt(raw, 10);
      return (n >= 0 && n < STEPS.length) ? n : -1;
    } catch (e) { return -1; }
  }
  function saveStep(n) {
    try { window.sessionStorage.setItem(STEP_KEY, String(n)); } catch (e) {}
  }
  function located() {
    try { return !!window._hasUserLocation; } catch (e) { return false; }
  }

  // THE GATE. A fresh walk needs both conditions; a walk already under way in
  // this tab needs only the flag to be absent.
  function shouldShow() {
    if (seen()) return false;
    if (savedStep() >= 0) return true;
    return !located();
  }

  // ── Markup ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  function html(i) {
    var s = STEPS[i];
    var last = i === STEPS.length - 1;
    var seatDone = located();
    var dots = STEPS.map(function (st, k) {
      var state = k === i ? 'now' : (k < i || (k === 0 && seatDone)) ? 'done' : 'next';
      return '<li class="pdxfc-dot" data-pdxfc-dot="' + state + '"' + (k === i ? ' aria-current="step"' : '') + '>' +
        '<span class="pdxfc-sr">Step ' + (k + 1) + ' of ' + STEPS.length + '</span>' +
        '<span aria-hidden="true">' + (state === 'done' ? '✓' : (k + 1)) + '</span></li>';
    }).join('');
    var out = '<div class="pdxfc-head">' +
        '<p class="pdxfc-kick">Getting started · ' + (i + 1) + ' of ' + STEPS.length + '</p>' +
        '<button type="button" class="pdxfc-skip" data-pdxfc-act="skip">Skip</button>' +
      '</div>' +
      '<ol class="pdxfc-dots">' + dots + '</ol>' +
      '<div class="pdxfc-step" data-pdxfc-step="' + s.id + '" aria-live="polite">' +
        '<p class="pdxfc-title">' + esc(s.title) + '</p>' +
        '<p class="pdxfc-line">' + esc(s.body) + '</p>' +
        (s.note ? '<p class="pdxfc-note">' + esc(s.note) + '</p>' : '') +
        (i === 0 && seatDone && s.doneLine ? '<p class="pdxfc-ok" role="status">✓ ' + esc(s.doneLine) + '</p>' : '') +
      '</div>' +
      '<div class="pdxfc-acts">';
    if (s.door && !(i === 0 && seatDone)) {
      out += '<a class="pdxfc-door" href="' + s.door.href + '" data-pdxfc-door="' + s.door.kind + '">' + esc(s.door.label) + '</a>';
    }
    out += last
      ? '<button type="button" class="pdxfc-next pdxfc-next--gold" data-pdxfc-act="finish">Got it</button>'
      : '<button type="button" class="pdxfc-next' + (i === 0 && seatDone ? ' pdxfc-next--gold' : '') + '" data-pdxfc-act="next">Next</button>';
    out += '</div>';
    return out;
  }

  var CSS = [
    '#' + ROOT_ID + '{position:relative;max-width:40rem;margin:0.5rem auto 1.25rem;padding:1.1rem 1.3rem 1.15rem;text-align:left;border:1.5px solid rgba(245,200,66,0.55);border-left-width:4px;border-radius:0.9rem;background:linear-gradient(135deg,rgba(18,58,42,0.82),rgba(14,30,40,0.9));box-shadow:0 0 0 1px rgba(245,200,66,0.08),0 0 28px rgba(245,200,66,0.14),0 8px 24px rgba(0,0,0,0.28);color:#d8e8dc;}',
    '#' + ROOT_ID + '[hidden]{display:none;}',
    '.pdxfc-head{display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin:0 0 0.6rem;}',
    '.pdxfc-kick{margin:0;font:800 0.8rem/1 \'Barlow Condensed\',\'Barlow\',sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:#f5c842;}',
    '.pdxfc-skip{min-height:44px;padding:0 0.6rem;border:0;background:none;font:600 0.9rem/1 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}',
    '.pdxfc-skip:hover,.pdxfc-skip:focus-visible{color:#fff7dc;}',
    '.pdxfc-dots{display:flex;gap:0.4rem;margin:0 0 0.75rem;padding:0;list-style:none;}',
    '.pdxfc-dot{display:inline-flex;align-items:center;justify-content:center;width:1.6rem;height:1.6rem;border-radius:999px;font:800 0.8rem/1 \'Barlow Condensed\',\'Barlow\',sans-serif;border:1.5px solid rgba(245,200,66,0.35);color:#9fb5a8;}',
    '.pdxfc-dot[data-pdxfc-dot="now"]{border-color:#f5c842;color:#fff7dc;box-shadow:0 0 12px rgba(245,200,66,0.35);}',
    '.pdxfc-dot[data-pdxfc-dot="done"]{background:linear-gradient(135deg,#fad96a,#e6b800);border-color:rgba(245,200,66,0.9);color:#0a0f1e;}',
    '.pdxfc-sr{position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;}',
    '.pdxfc-title{margin:0 0 0.4rem;font:800 clamp(1.2rem,3.6vw,1.5rem)/1.2 \'Barlow Condensed\',\'Barlow\',sans-serif;color:#fff7dc;}',
    '.pdxfc-line{margin:0 0 0.5rem;font:400 1rem/1.55 \'Barlow\',system-ui,sans-serif;color:#d8e8dc;}',
    '.pdxfc-note{margin:0 0 0.5rem;font:400 0.9rem/1.5 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;}',
    '.pdxfc-ok{margin:0 0 0.5rem;font:700 0.95rem/1.45 \'Barlow\',system-ui,sans-serif;color:#f5c842;}',
    '.pdxfc-acts{display:flex;flex-wrap:wrap;align-items:center;gap:0.6rem;margin-top:0.6rem;}',
    '.pdxfc-door,.pdxfc-next.pdxfc-next--gold{display:inline-flex;align-items:center;min-height:44px;padding:0.55rem 1.1rem;border:1.5px solid rgba(245,200,66,0.9);border-radius:999px;font:700 0.95rem/1 \'Barlow\',system-ui,sans-serif;color:#0a0f1e;text-decoration:none;background:linear-gradient(135deg,#fad96a,#e6b800);cursor:pointer;transition:filter 0.2s ease;}',
    '.pdxfc-next{display:inline-flex;align-items:center;min-height:44px;padding:0.55rem 1.1rem;border:1.5px solid rgba(245,200,66,0.55);border-radius:999px;font:700 0.95rem/1 \'Barlow\',system-ui,sans-serif;color:#fff7dc;background:transparent;cursor:pointer;}',
    '.pdxfc-door:hover,.pdxfc-door:focus-visible,.pdxfc-next.pdxfc-next--gold:hover,.pdxfc-next.pdxfc-next--gold:focus-visible{filter:brightness(1.06);}',
    '.pdxfc-door:focus-visible,.pdxfc-next:focus-visible,.pdxfc-skip:focus-visible{outline:2px solid #fff7dc;outline-offset:3px;}',
    '@media (prefers-reduced-motion:reduce){.pdxfc-door,.pdxfc-next--gold{transition:none;}}',
    '@media print{#' + ROOT_ID + '{display:none;}}'
  ].join('\n');

  // ── Mount ─────────────────────────────────────────────────────────────────
  var root = null;
  var cur = 0;
  var poll = 0;

  // Where the card goes on each of the three documents. Homepage: directly
  // above the District Voice card, inside the hero, so it reads as the hero's
  // own first step. /voice and /find: under the page's heading and intro.
  function host() {
    var d = document;
    var door = d.getElementById('pdx-home-voice-door');
    var card = door && door.parentNode;
    if (card && card.parentNode) return { parent: card.parentNode, before: card };
    var main = d.getElementById('voice-room') || d.getElementById('pdx-find');
    if (main) {
      // Under the page's own heading and intro, above everything it paints.
      var wrap = main.querySelector ? main.querySelector('.pdxvr-wrap, .pdxfd-wrap') : null;
      if (wrap && wrap.parentNode === main) return { parent: main, before: wrap.nextSibling };
      return { parent: main, before: main.firstChild || null };
    }
    var hero = d.getElementById('hero');
    if (hero) return { parent: hero, before: null };
    return null;
  }

  function paint() {
    if (!root) return;
    root.innerHTML = html(cur);
    root.setAttribute('data-pdxfc-at', STEPS[cur].id);
  }

  function go(i) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    saveStep(cur);
    paint();
    watch();
  }

  function close(via) {
    setSeen(via);
    stopWatch();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    try { document.dispatchEvent(new CustomEvent('pdx:coach-dismissed', { detail: { via: via } })); } catch (e) {}
  }

  // STEP 1 COMPLETES ITSELF. The finder is owned elsewhere and publishes one
  // boolean, so this watches the boolean while step 1 is on screen — bounded to
  // that step, cheap, and it cannot wedge the page. A save in another tab
  // arrives through the storage event below.
  var seatWasDone = false;
  function watch() {
    stopWatch();
    if (cur !== 0) return;
    seatWasDone = located();
    poll = setInterval(function () {
      if (!root || cur !== 0) { stopWatch(); return; }
      var now = located();
      if (now !== seatWasDone) { seatWasDone = now; paint(); }
    }, 800);
  }
  function stopWatch() { if (poll) { clearInterval(poll); poll = 0; } }

  // THE FINDER DOOR. A real anchor to /find in the markup, so it works with
  // scripting off and middle-clicks. On a page that carries the finder's own
  // opener, a plain click uses it in place instead of leaving the page:
  // pdxFindMyReps() on the homepage (who-represents-me.js), the map on /find.
  function openFinder(e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) return;
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
    var act = t && t.closest ? t.closest('[data-pdxfc-act]') : null;
    if (act) {
      var a = act.getAttribute('data-pdxfc-act');
      if (a === 'skip') close('skip');
      else if (a === 'finish') close('done');
      else if (a === 'next') go(cur + 1);
      return;
    }
    var door = t && t.closest ? t.closest('[data-pdxfc-door]') : null;
    if (!door) return;
    var kind = door.getAttribute('data-pdxfc-door');
    if (kind === 'finder') { openFinder(e); return; }
    // Following a door is progress: the next document picks the walk up at the
    // step after the one whose door was taken.
    saveStep(Math.min(cur + 1, STEPS.length - 1));
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') close('skip');
  }

  function mount() {
    if (root || !shouldShow()) return false;
    var h = host();
    if (!h) return false;
    if (!document.getElementById(STYLE_ID)) {
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'pdxfc';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Getting started with PolitiDex');
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    h.parent.insertBefore(root, h.before);
    var s = savedStep();
    go(s >= 0 ? s : 0);
    return true;
  }

  // voter-hub-location.js is deferred on all three documents and sets
  // _hasUserLocation when it runs, so the gate is read after deferred scripts
  // have executed — never on a guess made before the location module answered.
  function boot() { mount(); }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === KEY && e.newValue && root) {
      stopWatch();
      if (root.parentNode) root.parentNode.removeChild(root);
      root = null;
    } else if (root && cur === 0) {
      paint();
    }
  });

  window.PDXCoach = {
    KEY: KEY,
    STEP_KEY: STEP_KEY,
    STEPS: STEPS,
    shouldShow: shouldShow,
    seen: seen,
    // Test/debug seams.
    _html: html,
    _mount: mount,
    _go: go,
    _close: close,
    _step: function () { return cur; },
    _root: function () { return root; },
    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      try { window.sessionStorage.removeItem(STEP_KEY); } catch (e) {}
    }
  };
})();
