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

   THE GUIDED PATH. A reader who wants help is walked from "I don't know where
   to start" to "I can see my seats and open a room", in the same popup:

     1 loc    the welcome above. "Set my location" goes to /find with
              next=/ (PDXReturn.finderHref), so a confirmed pin lands back on
              the homepage's Who Represents Me band and the path is on step 2.
     2 see    homepage only. Scrolls to the band; one sentence says these are
              the people who already hold power over the reader; one control,
              "Open my rooms", goes to /voice.
     3 rooms  /voice only. The rooms are for their seats, anyone can read, and
              only a verified resident gets a voice that counts. "Take a
              stance" opens the stance studio (PDXReturn.studioHref, next=/voice)
              so a save or a skip brings them back here; "I'm good for now"
              ends the path.
     ballot   /voice, after the studio sent them back (a save or a skip).
              "Open the workshop" goes to /ballot, the Your Ballot workshop the
              homepage and /me already link; "Skip for now" moves straight on
              to the alignment step in the same card.
     align    the page they come back to from /ballot (the workshop's
              "← Home", or Back to /voice). "Open alignment" opens the
              homepage's Personalized Alignment Tool panel (#alignment-panel);
              "I'm done" ends the path.
     end      the homepage, with the alignment panel open. One line and "Done".

   The step lives in sessionStorage under PATH_KEY, never in localStorage, so a
   path is one visit long. The path shows itself only while it is running or
   when the reader asks with the small "Show me the next step" control on the
   homepage and /voice. A reader who already has a location starts on step 2.
   Not now, Got it, ×, Escape and the backdrop end it and remember that for
   the session; the control is the only way back in.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXCoach) return;

  var BUILD = 'v515';                  // logged, so DevTools shows which copy is running
  var KEY = 'pdx_coach_seen';          // localStorage: set once, when the popup closes
  var DELAY_MS = 9000;                 // after the page is parsed, so the hero is seen first
  var RETRY_MS = 2000;                 // another dialog is open: look again this soon
  var MAX_WAIT_MS = 30000;             // ...for at most this long, then show anyway
  var PATH_KEY = 'pdx_path_v1';        // sessionStorage: the guided path's step, or that it was ended
  var CONTINUE_MS = 1200;              // a running path: show the next step this soon after arrival
  var NEXT_ID = 'pdx-path-next';       // the "Show me the next step" control

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
  var HOME_BAND = 'who-represents-me';
  var ROOMS = '/voice';
  var BALLOT = '/ballot';
  var ALIGN_ID = 'alignment-panel';
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

  // ── The guided path's step, for this visit only ──────────────────────────
  // { step: 'loc' | 'see' | 'rooms' | 'stance' | 'ballot' | 'align' } while
  // it runs, { off: 1 }
  // once the reader ended it. Nothing else is written there.
  function readPath() {
    try {
      var v = JSON.parse(window.sessionStorage.getItem(PATH_KEY) || 'null');
      return v && typeof v === 'object' ? v : null;
    } catch (e) { return null; }
  }
  function writePath(v) {
    try { window.sessionStorage.setItem(PATH_KEY, JSON.stringify(v)); } catch (e) {}
  }
  function pathStep() { var v = readPath(); return v && !v.off && v.step ? String(v.step) : ''; }
  function pathOff() { var v = readPath(); return !!(v && v.off); }

  // Which document this is. The path runs on the homepage and /voice; /find
  // only ever shows the welcome.
  function page() {
    if (window.__PDX_FIND_DOC) return 'find';
    if (window.__PDX_VOICE_DOC) return 'voice';
    try { if (document.getElementById(HOME_BAND)) return 'home'; } catch (e) {}
    return '';
  }

  // The step to show on this page. `asked` is the reader pressing "Show me the
  // next step"; without it only a running path continues, and only on the page
  // its step belongs to. No location is always step 1, wherever they are.
  function resolve(asked) {
    var pg = page();
    if (pg !== 'home' && pg !== 'voice') return '';
    if (!located()) return 'loc';
    var st = asked ? '' : pathStep();
    if (pg === 'home') {
      if (asked || st === 'loc' || st === 'see') return 'see';
      if (st === 'stance' || st === 'ballot') return 'align';   // back from the workshop
      return st === 'align' ? 'end' : '';                       // sent here to open alignment
    }
    if (asked || st === 'loc' || st === 'see' || st === 'rooms') return 'rooms';
    if (st === 'stance') return 'ballot';                       // back from the studio
    return st === 'ballot' ? 'align' : '';                      // back from the workshop
  }

  // The doors, built by PDXReturn when it is on the page so the address is the
  // one /find and the studio already spend; the literals are what it builds.
  function finderHref() {
    try { var R = window.PDXReturn; if (R && fn(R.finderHref)) return String(R.finderHref('/')); } catch (e) {}
    return FINDER + '?next=%2F';
  }
  function studioHref() {
    try { var R = window.PDXReturn; if (R && fn(R.studioHref)) return String(R.studioHref(ROOMS, true)); } catch (e) {}
    return '/my-stances?add=1&next=%2Fvoice';
  }
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
          '<a class="pdxfc-door" href="' + esc(finderHref()) + '" data-pdxfc-door="finder">Set my location</a>' +
          '<button type="button" class="pdxfc-next" data-pdxfc-act="finish">Got it</button>' +
          '<button type="button" class="pdxfc-skip" data-pdxfc-act="skip">Not now</button>' +
        '</div>' +
      '</div>';
  }

  // ── Steps 2, 3 and the end, in the same card ─────────────────────────────
  var SEE_LINE = 'These are the people who already hold power over you, seat by seat, for the place you set.';
  var ROOMS_LINE = 'These rooms are for your seats. Anyone can read them. Only a verified resident gets a voice that counts.';
  var STANCE_LINE = 'A stance is one issue and where you stand on it. It goes on your file, and you can change it any time.';
  var BALLOT_LINE = 'Your ballot is where you pick who you want in each seat.';
  var ALIGN_LINE = 'The alignment tool shows how your stances line up with the people on your ballot.';
  var END_LINE = 'Your seats are on the front page, your rooms are on District Voice, and your ballot is there whenever you come back to it.';

  function stepHtml(step) {
    var kick = '', title = '', line = '', extra = '', acts = '';
    if (step === 'see') {
      kick = 'Step 2 of 5'; title = 'See who represents you'; line = SEE_LINE;
      acts = '<a class="pdxfc-door" href="' + ROOMS + '" data-pdxfc-go="rooms">Open my rooms</a>' +
        '<button type="button" class="pdxfc-skip" data-pdxfc-act="skip">Not now</button>';
    } else if (step === 'rooms') {
      kick = 'Step 3 of 5'; title = 'Open your rooms'; line = ROOMS_LINE;
      extra = '<p class="pdxfc-sub">' + esc(STANCE_LINE) + '</p>';
      acts = '<a class="pdxfc-door" href="' + esc(studioHref()) + '" data-pdxfc-go="stance">Take a stance</a>' +
        '<button type="button" class="pdxfc-next" data-pdxfc-act="finish">I’m good for now</button>';
    } else if (step === 'ballot') {
      kick = 'Step 4 of 5'; title = 'Build your ballot'; line = BALLOT_LINE;
      acts = '<a class="pdxfc-door" href="' + BALLOT + '" data-pdxfc-go="ballot">Open the workshop</a>' +
        '<button type="button" class="pdxfc-skip" data-pdxfc-act="skipballot">Skip for now</button>';
    } else if (step === 'align') {
      kick = 'Step 5 of 5'; title = 'See how you align'; line = ALIGN_LINE;
      acts = '<a class="pdxfc-door" href="/#' + ALIGN_ID + '" data-pdxfc-go="align">Open alignment</a>' +
        '<button type="button" class="pdxfc-next" data-pdxfc-act="finish">I’m done</button>';
    } else {
      kick = 'All set'; title = 'That’s the path'; line = END_LINE;
      acts = '<button type="button" class="pdxfc-next" data-pdxfc-act="finish">Done</button>';
    }
    return '<div class="pdxfc-card" data-pdxfc-step="' + esc(step) + '">' +
        '<button type="button" class="pdxfc-x" data-pdxfc-act="skip" aria-label="Close">×</button>' +
        '<p class="pdxfc-kick">' + esc(kick) + '</p>' +
        '<h2 class="pdxfc-title" id="' + TITLE_ID + '" tabindex="-1">' + esc(title) + '</h2>' +
        '<p class="pdxfc-line">' + esc(line) + '</p>' + extra +
        '<div class="pdxfc-acts">' + acts + '</div>' +
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
    '.pdxfc-line{margin:0 0 0.6rem;font:400 1rem/1.5 \'Barlow\',system-ui,sans-serif;color:#d8e8dc;}',
    '.pdxfc-sub{margin:0 0 1rem;font:400 0.9rem/1.5 \'Barlow\',system-ui,sans-serif;color:#9fb5a8;}',
    // Steps 2 and 3 sit at the foot of the screen with no veil, so the band
    // and the rooms they point at stay in view and the page stays usable.
    '#' + ROOT_ID + '.pdxfc--dock{align-items:flex-end;background:transparent;pointer-events:none;}',
    '#' + ROOT_ID + '.pdxfc--dock .pdxfc-card{pointer-events:auto;max-width:28rem;}',
    '#' + NEXT_ID + '{position:fixed;left:0.75rem;bottom:0.75rem;z-index:45;min-height:44px;padding:0 1rem;border:1.5px solid rgba(245,200,66,0.55);border-radius:999px;background:linear-gradient(135deg,rgba(18,58,42,0.97),rgba(14,30,40,0.98));box-shadow:0 8px 24px rgba(0,0,0,0.28);font:700 0.9rem/1 \'Barlow\',system-ui,sans-serif;color:#fff7dc;cursor:pointer;}',
    '#' + NEXT_ID + '[hidden]{display:none;}',
    '#' + NEXT_ID + ':hover,#' + NEXT_ID + ':focus-visible{border-color:rgba(245,200,66,0.9);}',
    '#' + NEXT_ID + ':focus-visible{outline:2px solid #fff7dc;outline-offset:3px;}',
    '@media (max-width:480px){#' + ROOT_ID + '{align-items:flex-end;padding:0.5rem;}}',
    '@media (prefers-reduced-motion:reduce){.pdxfc-door{transition:none;}}',
    '@media print{#' + ROOT_ID + ',#' + NEXT_ID + '{display:none;}}'
  ].join('\n');

  // ── Open / close ──────────────────────────────────────────────────────────
  var root = null;
  var timer = 0;
  var returnFocus = null;
  var current = '';                    // the step on screen: 'loc' | 'see' | 'rooms' | 'end'
  var nextBtn = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function remove() {
    if (timer) { clearTimeout(timer); timer = 0; }
    document.removeEventListener('keydown', onKey);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    current = '';
    if (nextBtn) nextBtn.hidden = false;
  }

  // Every close writes the welcome's own flag, as it always has. What it does
  // to the path depends on how: a door forward records the next step, and
  // every other way out ends the path for this visit.
  function close(via) {
    setSeen(via);
    if (via === 'finder') writePath({ step: 'see', at: Date.now() });
    else if (via === 'rooms') writePath({ step: 'rooms', at: Date.now() });
    else if (via === 'stance') writePath({ step: 'stance', at: Date.now() });
    else if (via === 'ballot') writePath({ step: 'ballot', at: Date.now() });
    else if (via === 'align') writePath({ step: 'align', at: Date.now() });
    else writePath({ off: 1, via: via, at: Date.now() });
    remove();
    try { if (returnFocus && fn(returnFocus.focus)) returnFocus.focus(); } catch (e) {}
    returnFocus = null;
    try { document.dispatchEvent(new CustomEvent('pdx:coach-dismissed', { detail: { via: via } })); } catch (e) {}
  }

  // THE FINDER DOOR. A real anchor to /find?next=/ in the markup, so it works
  // with scripting off and middle-clicks, and so a confirmed pin brings the
  // reader back to the homepage's band, where the path is on step 2. Taking it
  // counts as finishing the welcome. On /find itself the map opens in place.
  function openFinder(e) {
    var modified = e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0);
    close('finder');
    if (modified) return;
    try {
      if (window.__PDX_FIND_DOC && fn(window.openDistrictMapModal)) {
        if (e) e.preventDefault();
        window.openDistrictMapModal();
      }
    } catch (err) {}
  }

  function onClick(e) {
    var t = e.target;
    if (t === root) { close('skip'); return; }           // the backdrop
    var act = t && t.closest ? t.closest('[data-pdxfc-act]') : null;
    if (act && act.getAttribute('data-pdxfc-act') === 'skipballot') {
      // Skip the workshop, not the path: the alignment step, in the same card.
      writePath({ step: 'ballot', skipped: 1, at: Date.now() });
      remove();
      open('align');
      return;
    }
    if (act) {
      close(act.getAttribute('data-pdxfc-act') === 'finish' ? 'done' : 'skip');
      return;
    }
    var door = t && t.closest ? t.closest('[data-pdxfc-door]') : null;
    if (door) { openFinder(e); return; }
    // Steps 2 and 3: real anchors; the click records the step they lead to.
    var go = t && t.closest ? t.closest('[data-pdxfc-go]') : null;
    if (!go) return;
    var to = go.getAttribute('data-pdxfc-go');
    if (to === 'align' && page() === 'home' && document.getElementById(ALIGN_ID)) {
      // The alignment tool is on this page: open it in place, then the last card.
      var modified = e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0);
      if (modified) { close('align'); return; }
      if (e && fn(e.preventDefault)) e.preventDefault();
      writePath({ step: 'align', at: Date.now() });
      remove();
      open('end');
      return;
    }
    close(to === 'stance' ? 'stance' : to === 'ballot' ? 'ballot' : to === 'align' ? 'align' : 'rooms');
  }

  function onKey(e) {
    if (root && (e.key === 'Escape' || e.key === 'Esc')) close('skip');
  }

  // Step 2 points at the band: bring it into view under the docked card.
  function toBand() {
    try {
      var band = document.getElementById(HOME_BAND);
      if (!band || !fn(band.scrollIntoView)) return;
      var still = fn(window.matchMedia) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      band.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {}
  }

  // The last step's surface: the homepage's alignment panel, opened and in view.
  function toAlign() {
    try {
      if (fn(window.alignTogglePanel)) window.alignTogglePanel(true);
      var panel = document.getElementById(ALIGN_ID);
      if (!panel || !fn(panel.scrollIntoView)) return;
      var still = fn(window.matchMedia) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {}
  }

  // `step` is '' for the first-visit welcome (gated as it always was), or a
  // path step, which the caller has already decided belongs on this page.
  function open(step) {
    step = step || '';
    if (root) return false;
    if (!step && !shouldShow()) return false;
    var body = document.body;
    if (!body) return false;
    ensureStyle();
    root = document.createElement('div');
    root.id = ROOT_ID;
    var dock = step === 'see' || step === 'rooms' || step === 'ballot' || step === 'align' || step === 'end';
    root.className = dock ? 'pdxfc pdxfc--dock' : 'pdxfc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-labelledby', TITLE_ID);
    root.innerHTML = dock ? stepHtml(step) : html();
    current = step || 'loc';
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    try { returnFocus = document.activeElement || null; } catch (e) { returnFocus = null; }
    body.appendChild(root);
    if (nextBtn) nextBtn.hidden = true;
    if (step === 'see') toBand();
    // The path is complete once the last card is up; a reload does not replay it.
    if (step === 'end') { writePath({ off: 1, via: 'complete', at: Date.now() }); toAlign(); }
    try {
      var h = document.getElementById(TITLE_ID);
      if (h && fn(h.focus)) h.focus({ preventScroll: true });
    } catch (e) {}
    return true;
  }

  // The timer. Re-checks the gate when it fires. Behind another visible dialog
  // it looks again every RETRY_MS, and after MAX_WAIT_MS it shows anyway, so a
  // first-time reader always gets it — a stuck or misread dialog can delay the
  // popup, never cancel it. `step` is '' for the welcome, or the running
  // path's step, which is resolved again when the timer fires.
  function schedule(delay, waited, step) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = 0;
      var want = '';
      if (step) {
        want = pathOff() ? '' : resolve(false);
        if (!want) { log('skipped: the guided path has nothing to show on this page.'); return; }
      } else {
        var why = whyNot();
        if (why) { log('skipped: ' + why + '.'); return; }
      }
      var blocker = busy();
      if (blocker && waited < MAX_WAIT_MS) {
        log('waiting: ' + blocker + ' is open; looking again in ' + (RETRY_MS / 1000) + 's.');
        schedule(RETRY_MS, waited + RETRY_MS, step);
        return;
      }
      if (blocker) log('showing anyway: ' + blocker + ' has been open for ' + (MAX_WAIT_MS / 1000) + 's.');
      if (open(want)) log(want ? 'showing path step: ' + want + '.' : 'showing.');
      else log('could not open: ' + (whyNot() || (root ? 'already open' : 'no <body>')) + '.');
    }, delay);
  }

  // ── "Show me the next step" ───────────────────────────────────────────────
  // The reader asking is the one thing that overrides every gate: the welcome
  // flag, a path ended earlier this visit, and another dialog. It shows the
  // step for where they are now — step 1 with no location, step 2 on the
  // homepage, step 3 on /voice.
  function showNext() {
    var step = resolve(true);
    if (!step) return false;
    if (root) remove();
    writePath({ step: step === 'see' ? 'see' : step === 'loc' ? 'loc' : 'rooms', at: Date.now(), asked: 1 });
    log('asked: showing path step ' + step + '.');
    return open(step === 'loc' ? 'loc' : step);
  }

  function mountNext() {
    var pg = page();
    if (pg !== 'home' && pg !== 'voice') return;
    if (nextBtn || document.getElementById(NEXT_ID) || !document.body) return;
    ensureStyle();
    nextBtn = document.createElement('button');
    nextBtn.id = NEXT_ID;
    nextBtn.setAttribute('type', 'button');
    nextBtn.className = 'pdxfc-ask';
    nextBtn.textContent = 'Show me the next step';
    nextBtn.addEventListener('click', function () { showNext(); });
    if (root) nextBtn.hidden = true;
    document.body.appendChild(nextBtn);
  }

  // THE CLOCK STARTS WHEN THE DOCUMENT IS PARSED, not at window 'load'. This
  // script is deferred and listed after voter-hub-location.js on all three
  // documents, so by the time it runs that module has already answered
  // _hasUserLocation. Waiting for 'load' as well made the popup hostage to the
  // slowest image or third-party script on the page — on a slow connection,
  // or with one request that never settled, the nine seconds never started.
  //
  // A running path goes first: it continues on the page its step belongs to,
  // soon after arrival. Otherwise it is the first-visit welcome, as before.
  function boot() {
    mountNext();
    if (!pathOff() && pathStep()) {
      var st = resolve(false);
      if (st) {
        log('guided path: showing step ' + st + ' in ' + (CONTINUE_MS / 1000) + 's.');
        schedule(CONTINUE_MS, 0, st);
        return;
      }
    }
    if (pathOff()) { log('skipped: the guided path was ended this visit.'); return; }
    var why = whyNot();
    if (why) { log('skipped: ' + why + '.'); return; }
    log('first visit: showing in ' + (DELAY_MS / 1000) + 's unless a location is saved first.');
    schedule(DELAY_MS, 0, '');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Dismissed in another tab: close here too, without writing again.
  window.addEventListener('storage', function (e) {
    if (!e || e.key !== KEY || !e.newValue) return;
    if (current && current !== 'loc') return;   // a path step was asked for here; leave it
    remove();
  });

  window.PDXCoach = {
    BUILD: BUILD,
    KEY: KEY,
    DELAY_MS: DELAY_MS,
    POINTS: POINTS,
    SCOPE_NOTE: SCOPE_NOTE,
    PATH_KEY: PATH_KEY,
    CONTINUE_MS: CONTINUE_MS,
    SEE_LINE: SEE_LINE,
    ROOMS_LINE: ROOMS_LINE,
    BALLOT_LINE: BALLOT_LINE,
    ALIGN_LINE: ALIGN_LINE,
    shouldShow: shouldShow,
    showNext: showNext,
    step: function () { return current; },
    pathStep: pathStep,
    seen: seen,
    // Test/debug seams.
    _html: html,
    _stepHtml: stepHtml,
    _resolve: resolve,
    _open: open,
    _close: close,
    _root: function () { return root; },
    // Clears the popup's own flag only (never the location) and replays the
    // delay on this page view.
    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      try { window.sessionStorage.removeItem(PATH_KEY); } catch (e) {}
      log('reset: pdx_coach_seen and the guided path cleared.');
      boot();
    }
  };
})();
