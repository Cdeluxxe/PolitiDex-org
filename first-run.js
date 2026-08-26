/* ═══════════════════════════════════════════════════════════════════════════
   first-run.js — one obvious cold-start success, and the gating that follows it
   ────────────────────────────────────────────────────────────────────────────
   WHY THIS FILE EXISTS

   A first-time visitor arrived at a homepage with eleven entry points and no
   ranking between them: two hero buttons, a purple alignment card with its own
   filled CTA, an eight-chip quick-jump bar, a five-button Door-1 mode row, a
   dismissible welcome band, a nav with three glowing pills and three dropdowns.
   Every one of those is a real surface. Together they answer the question "what
   is this?" with "ten things", and a stranger who cannot pick a first move makes
   none.

   So this module owns exactly one thing: WHETHER THIS VISITOR HAS FINISHED ONE
   MEANINGFUL TASK, and it does two things with the answer.

     1. IT RUNS THE PATHS. Two, ranked, both reusing engines that already exist:

        PATH A (the default) — who has power over me, then one formal record.
          window.pdxFindMyReps() → window.pdxRepsForMe() → PDXPerson.open(pid,
          { section: 'pdxsec-standout' }). Nothing new is rendered and no new
          route is invented; this is the existing lookup, the existing resolver
          and the existing person-file funnel, called in order.

        PATH B — set location, work one seat in the ballot workspace.
          PDXDoor2.toWorkspace() / PDXBallotWorkspace.open(), then the visitor's
          own pick. Second rather than first because district seats only resolve
          where the district lines are drawn (Utah), while Path A's statewide
          seats resolve in all 50 states.

     2. IT GATES THE SECOND TIER. While first run is PENDING, the repeated tool
        lists stay out of the way: the eight-chip pulse bar is hidden and the
        homepage's "How PolitiDex works" disclosure stays shut. Once it is DONE,
        both come back. That is the brief's "available after first success, not
        before as equal peers", expressed as one attribute on <html> and a
        handful of CSS rules — not as deletion. Those rules are INLINE in
        index.html rather than in a first-run.css: every one of them lands above
        the fold in the first frame, and a seventh render-blocking stylesheet
        would cost the fold it is trying to protect. Search the hero-chrome
        <style> block for "FIRST RUN".

   WHAT COUNTS AS SUCCESS, AND WHAT DOES NOT

   Two events, and only these two:

     · 'record' — a person file opened for a pid that CLEARS THE PUBLICATION
       FLOOR. publication-floor.js is the existing rule: identity from the
       roster, plus at least MIN_CITED_POSITIONS documented positions that each
       carry a source URL (or one such position plus a tracked promise). So
       "success" here literally means the visitor was shown a SOURCED formal
       pattern. A thin profile does not count, and this module will not open one
       and call it a win — see the fail-closed note below.

     · 'seat' — one completed seat pick in the ballot workspace, observed by
       wrapping window.ballotPickCard the way ballot-workspace.js already wraps
       it, and confirmed against PDXBallotWorkspace._decided().

   Creating an account is NOT success. Dismissing a banner is not success.
   Scrolling is not success. Arriving is not success. The flag is written when
   the visitor has seen a sourced record or made a real pick, and at no other
   time — which is why signing in cannot set it and why there is no
   `mark('visited')`.

   FAIL CLOSED, EVERY TIME

   Path A is honest nationwide only because it is allowed to fail. The resolver
   gates DISTRICT seats (U.S. House, State Senate, State House) on Utah on
   purpose — voter-hub-location.js documents the bug that gate fixed, where a
   Columbus voter was shown three Utah politicians under "3 of 3 seats
   resolved". So outside Utah, Path A works from the statewide seats: both U.S.
   Senate seats and the Governor, which resolve from the state alone.

   If NONE of the resolved seats clears the publication floor, Path A opens
   nothing. It leaves the visitor on their own resolved seat list — which is a
   true answer to "who has power over me" — and prints one sentence saying the
   deeper record for these seats is not on file yet. It does not open the
   thinnest available profile, it does not fall back to a stranger from another
   state, and it does not mark success.

   WHAT THIS FILE IS NOT

   It is not a tour, a tutorial, an overlay or a coach-mark layer. It adds no
   route, no product and no third door. It renders one sentence, in one place,
   and only when it has to say no. It publishes no score,
   reads no party field, and has no opinion about a politician. It changes which
   of the product's own surfaces is loudest for a stranger, and nothing else.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXFirstRun) return;

  var KEY = 'pdx_first_run';
  var COLLECTION = 'firstRun';
  var ATTR = 'data-pdx-firstrun';
  var RECORD_ANCHOR = 'pdxsec-standout';   // same anchor hero-showcase.js lands on
  var NOTE_ID = 'pdx-first-run-note';

  function fn(v) { return typeof v === 'function'; }
  function store() { return window.PDXStore || null; }

  // ── State ─────────────────────────────────────────────────────────────────
  // PDXStore when it is there (the collection is declared in index.html, so it
  // dirty-tracks and syncs with the rest of the visitor's own data), plain
  // localStorage when it is not. Never throws: a visitor with storage disabled
  // gets the pending state forever, which is the safe direction — they see the
  // ranked homepage every time rather than a homepage that assumes a success
  // that never happened.
  function readState() {
    var raw = null;
    try {
      var S = store();
      if (S && fn(S.read)) raw = S.read(KEY, null);
      else if (window.localStorage) raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return { done: false, via: null, at: 0 };
    return {
      done: raw.done === true,
      via: (raw.via === 'record' || raw.via === 'seat') ? raw.via : null,
      at: Number(raw.at) || 0,
      pid: raw.pid ? String(raw.pid) : null
    };
  }

  function writeState(next) {
    try {
      var S = store();
      if (S && fn(S.write)) { S.write(KEY, next, { collection: COLLECTION }); return true; }
      if (window.localStorage) { window.localStorage.setItem(KEY, JSON.stringify(next)); return true; }
    } catch (e) {}
    return false;
  }

  function done() { return readState().done === true; }

  // ── The publication floor, as a gate on "did they see a sourced record?" ──
  // PDXPerson.publishable() is the funnel's own thin wrapper over
  // PDXPublicationFloor.clears(). Reading it through the funnel rather than the
  // floor directly means an id alias resolves the same way the open does.
  function clearsFloor(pid) {
    if (!pid) return false;
    try {
      if (window.PDXPerson && fn(window.PDXPerson.publishable)) return !!window.PDXPerson.publishable(pid);
      var F = window.PDXPublicationFloor;
      if (F && fn(F.clears)) return !!F.clears(pid);
    } catch (e) {}
    return false;   // unknown → not publishable → not success
  }

  // ── Success ───────────────────────────────────────────────────────────────
  function mark(via, meta) {
    if (via !== 'record' && via !== 'seat') return false;
    var cur = readState();
    if (cur.done) { apply(); return true; }   // idempotent: first success stands
    var next = { done: true, via: via, at: Date.now() };
    if (meta && meta.pid) next.pid = String(meta.pid);
    writeState(next);
    apply();
    try {
      document.dispatchEvent(new CustomEvent('pdx:first-run-complete', { detail: { via: via } }));
    } catch (e) {}
    return true;
  }

  // ── Gating ────────────────────────────────────────────────────────────────
  // One attribute on <html>, read by the inline FIRST RUN rules in index.html's
  // hero-chrome <style> block. Set as early as this script
  // runs and re-set after every state change, so nothing has to poll.
  function apply() {
    var d = done();
    try { document.documentElement.setAttribute(ATTR, d ? 'done' : 'pending'); } catch (e) {}
    if (!d) return;
    // The homepage's own deep-dive copy opens once, on the first success, and
    // only if the visitor has not already made their own choice about it. After
    // that the element is theirs.
    try {
      var how = document.getElementById('hero-how');
      if (how && !how.open && !how.hasAttribute('data-pdx-user-toggled')) how.open = true;
    } catch (e) {}
  }

  // ── Path A · who has power over me → one formal record ────────────────────
  // Ordered exactly as the resolver returns them, which is statewide-first:
  // both U.S. Senate seats, then U.S. House, then Governor, then the two state
  // chambers. The first pid that clears the floor wins; nothing is re-ranked and
  // no score is compared, because the choice here is "which of these records can
  // we honestly show" and not "which of these people is better".
  function seatCandidates() {
    var out = [];
    try {
      if (!fn(window.pdxRepsForMe)) return out;
      var reps = window.pdxRepsForMe() || {};
      (reps.levels || []).forEach(function (lv) {
        if (lv && lv.resolved && lv.pid) out.push({ pid: String(lv.pid), label: lv.label || '', key: lv.key || '' });
      });
    } catch (e) {}
    return out;
  }

  function pickPid() {
    var seats = seatCandidates();
    for (var i = 0; i < seats.length; i++) if (clearsFloor(seats[i].pid)) return seats[i].pid;
    return null;
  }

  function located() {
    try { return !!window._hasUserLocation; } catch (e) { return false; }
  }

  // The honest "no" — printed only when a location IS set, the seats DID
  // resolve, and not one of them has a record we are willing to publish. Its own
  // node, appended after #wrm-reps rather than written into it, so
  // who-represents-me.js can keep repainting its list without racing this.
  function note(text) {
    var host = document.getElementById('who-represents-me');
    if (!host) return;
    var el = document.getElementById(NOTE_ID);
    if (!el) {
      el = document.createElement('p');
      el.id = NOTE_ID;
      el.className = 'pdx-first-run-note';
      el.setAttribute('role', 'status');
      var after = document.getElementById('wrm-reps');
      if (after && after.parentNode) after.parentNode.insertBefore(el, after.nextSibling);
      else host.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
  }
  function clearNote() {
    var el = document.getElementById(NOTE_ID);
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  // One attempt at the record open. Returns true when a person file was opened.
  function openBestRecord() {
    var pid = pickPid();
    if (!pid) return false;
    var opened = false;
    try {
      if (window.PDXPerson && fn(window.PDXPerson.open)) {
        opened = !!window.PDXPerson.open(pid, { section: RECORD_ANCHOR });
      }
    } catch (e) { opened = false; }
    if (!opened) return false;
    clearNote();
    mark('record', { pid: pid });
    return true;
  }

  // Wait for the seats to resolve, then open. The picker is asynchronous and
  // owned by someone else, so this polls its OUTPUT (the resolver) rather than
  // hooking its internals: bounded, cheap, and it cannot wedge the page. If the
  // visitor never sets a location, the last tick simply stops — no note, no
  // error, nothing on screen, because "I closed the picker" is not a failure the
  // product needs to comment on.
  var _watch = null;
  function watchThenOpen(tries) {
    if (_watch) { clearTimeout(_watch); _watch = null; }
    var left = tries == null ? 24 : tries;    // ~12s at 500ms
    (function tick() {
      if (openBestRecord()) return;
      if (located()) {
        var seats = seatCandidates();
        if (seats.length) {
          // Seats resolved and none of them clears the floor. This is the
          // fail-closed branch, and it is a real answer: the seat list above is
          // correct, we just decline to advertise a record we cannot source.
          note('Your seats are listed above. We don’t have enough sourced record on file for ' +
               'these officeholders yet to open one — so we’re not going to pretend we do.');
          return;
        }
      }
      if (--left <= 0) return;
      _watch = setTimeout(tick, 500);
    })();
  }

  function pathA() {
    clearNote();
    // The shared lookup action: scrolls to the band and, when no location is
    // set, opens the same picker every other surface uses. Reused rather than
    // reimplemented so the hero CTA and the nav front step cannot drift.
    try {
      if (fn(window.pdxFindMyReps)) window.pdxFindMyReps();
      else {
        var band = document.getElementById('who-represents-me');
        if (band) band.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {}
    // Already located → the seats are there now and this resolves on the first
    // tick. Not located → the picker is open and this waits for it.
    watchThenOpen();
    return true;
  }

  // ── Path B · set location → work one seat in the workspace ────────────────
  function pathB() {
    try {
      if (window.PDXDoor2 && fn(window.PDXDoor2.toWorkspace)) { window.PDXDoor2.toWorkspace(); return true; }
    } catch (e) {}
    try {
      if (window.PDXBallotWorkspace && fn(window.PDXBallotWorkspace.open)) { window.PDXBallotWorkspace.open(); return true; }
    } catch (e) {}
    var t = document.getElementById('my-politicians') || document.getElementById('voter-hub');
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  // A completed pick is observed, not asked for. Same idempotent-wrap shape
  // ballot-workspace.js uses over the same function, with its own flag so the
  // two wrappers compose in either load order and neither double-wraps.
  function wrapPick() {
    var name = 'ballotPickCard';
    if (!fn(window[name]) || window[name].__frPick) return false;
    var orig = window[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try {
        var n = 0;
        if (window.PDXBallotWorkspace && fn(window.PDXBallotWorkspace._decided)) n = window.PDXBallotWorkspace._decided();
        // No workspace to count with? The call itself is the evidence — this
        // function only runs when a card was picked.
        if (n > 0 || !window.PDXBallotWorkspace) mark('seat');
      } catch (e) {}
      return out;
    };
    w.__frPick = true;
    try { window[name] = w; } catch (e) { return false; }
    return true;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  apply();

  // ballotPickCard is defined in a later <script> block than this deferred
  // module in some load orders, so the hook retries on a short bounded schedule
  // and then gives up. Losing the hook costs the 'seat' signal only; it can
  // never break a pick, because the wrap is only ever installed around a
  // function that already exists.
  (function hook(left) {
    if (wrapPick()) return;
    if (left <= 0) return;
    setTimeout(function () { hook(left - 1); }, 400);
  })(20);

  document.addEventListener('DOMContentLoaded', apply);
  try {
    var how = document.getElementById('hero-how');
    if (how) how.addEventListener('toggle', function () { how.setAttribute('data-pdx-user-toggled', '1'); });
  } catch (e) {}

  window.PDXFirstRun = {
    KEY: KEY,
    COLLECTION: COLLECTION,
    ATTR: ATTR,
    DEFAULT_PATH: 'A',
    RECORD_ANCHOR: RECORD_ANCHOR,
    state: readState,
    done: done,
    mark: mark,
    pathA: pathA,
    pathB: pathB,
    apply: apply,
    // Test/debug seams. Named with an underscore because nothing in the product
    // should be calling them, and reset() exists so a developer can see the
    // first-run homepage again without clearing every other collection.
    _seatCandidates: seatCandidates,
    _pickPid: pickPid,
    _clearsFloor: clearsFloor,
    _wrapPick: wrapPick,
    reset: function () { writeState({ done: false, via: null, at: 0 }); apply(); }
  };
})();
