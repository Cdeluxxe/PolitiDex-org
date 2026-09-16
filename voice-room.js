/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE VOICE ROOM (/voice)  ·  standing only, never a second answer
   ─────────────────────────────────────────────────────────────────────────────

   WHY THIS FILE EXISTS

   District Voice already had exactly one home: the district file's Voice block
   at /d/<seat-key>, mounted by district-file.js into #pdx-district-file-voice.
   That address is right for "show me THIS seat" and wrong for the far more
   common arrival, which is a reader who wants their OWN board and does not know
   their seat key. Until now the only way to that was the front page, which
   means a two-megabyte document, the homepage hero, the work layer, the
   Evidence Locker template and 400 KB of ballot machinery — to read a poll and
   a handful of neighbours' sentences.

   /voice is that address. This file is the ONLY thing on it that decides
   anything, and what it decides is one question:

       WHICH STANDING IS THIS READER IN, RIGHT NOW, AT THEIR OWN SEAT?

   Everything else it borrows. district-voice.js is the one owner of the seat
   allow-list (VOICE_SEATS), of the seat-key shape (normalizeSeatKey), of what
   counts as a claim (claim()), of which seat a saved location names
   (seatForMe()), of whether a board is open in that seat (shipped()/path()) and
   of the sentence that says what the board is (COPY.frame). This file asks it
   all six and answers none of them. A copy of the allow-list, of the seat-key
   regex or of the frame sentence HERE would be a second answer, and a second
   answer is the defect — the one /me already refused to make (see me-desk.js's
   voice(), which this file is deliberately shaped like).

   THE FIVE STANDINGS, AND THE DEFAULT IS THE QUIETEST ONE

     checking   We do not know yet. The location resolver is 255 KB of deferred
                script and the account it is keyed to arrives with Firebase, so
                for the first moments after paint the honest answer is "asking",
                not "you have nothing". THIS IS THE SAME RULE THE ACCOUNT CHIP
                RUNS ON: unknown is not empty, and a returning resident must not
                be told we have no idea where they vote because a deferred file
                has not landed. Bounded by GRACE_MS, after which we stop saying
                "checking" and say the weaker true thing.

     unplaced   No saved location we can read. Points at Who Represents Me and
                Your Ballot — the two surfaces that SET a location — and names
                no state, no county and no district. There is no default
                location on this page. Utah is where the first board happens to
                be open; it is not a guess we make about a stranger.

     nolane     A location we can read, in a state District Voice does not cover
                yet. Says so without naming a district: the claim did not
                normalise to a seat key, so any seat name printed here would be
                this file inventing a shape district-voice.js declined to give.

     notlive    A real seat, named out of the two fields this reader already
                saved, with no board open in it yet. "Board not live yet" is a
                true sentence and it stays.

     open       The board is open in this reader's seat. district-voice.js
                mounts and owns every pixel of it from there.

   EVERY EARLY RETURN LANDS ON A WEAKER STANDING. A missing module, a missing
   resolver, a missing field or a thrown getter can only ever UNDERSTATE what
   this reader has. Nothing in here can invent a board for somebody who has
   none, and nothing in here can name a district for somebody who never saved
   one.

   WHAT THIS FILE WILL NOT DO

     · No neighbours of its own. No takes, no poll, no counts, no roster. The
       board is district-voice.js's to render; this file paints a standing and a
       mount point and then gets out of the way.
     · No "how the member voted." The seated member is not resolved here at all:
       district-voice.js's own seatedPid() asks pdxSeatedMemberFor() and fails
       soft to '' when ballot-breakdown.js is absent — which it is on this
       document, deliberately, because 407 KB of ballot machinery is not what a
       reader came to /voice for.
     · No identity vendor. PDXVoice.verify() rejects by design and nothing here
       calls it.
     · No location setter. It POINTS at the two doors that own that job. Moving
       the setter is a separate branch.

   THE REPAINT HOOK

   voter-hub-location.js calls window._vhBallotRerender() when the saved
   location resolves or changes. On the homepage and on /ballot that name
   belongs to ballot-breakdown.js; on /me it belongs to me-desk.js; HERE it
   belongs to this file, and it is claimed before voter-hub-location.js can call
   it for the same reason /me claims it — an unclaimed hook means the resolver
   lands and nothing on the page notices. The standing is re-decided on every
   call; the board is mounted ONCE PER SEAT, never on a repaint, because a
   remount would tear down a half-typed take.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var STANDING_ID = 'pdx-voice-standing';
  var BOARD_ID = 'pdx-voice-board';

  // The same grace the account chip runs on (shell-account-chip.js UNKNOWN_MS),
  // for the same reason and deliberately the same number: two quiet "asking"
  // states on one document that expired at different times would read as a bug.
  var GRACE_MS = 6000;

  // The two doors that OWN setting a location. Both are front-page surfaces and
  // both keep their front-page addresses — this shell links to them, it does not
  // reimplement either.
  var HREF_WRM = '/#who-represents-me';
  var HREF_BALLOT = '/ballot';

  var _t0 = Date.now();
  var _mountedSeat = '';
  var _lastSig = '';

  function fn(f) { return typeof f === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function api() { try { return window.PDXVoice || null; } catch (e) { return null; } }
  function graceOver() { return (Date.now() - _t0) >= GRACE_MS; }

  // Borrowed, never written here. '' when district-voice.js has not landed, and
  // '' prints nothing rather than a sentence of this file's own invention.
  function frame() {
    var V = api();
    try { return (V && V.COPY && V.COPY.frame) ? String(V.COPY.frame) : ''; } catch (e) { return ''; }
  }

  // ── THE DECISION ──────────────────────────────────────────────────────────
  // Reads district-voice.js and nothing else. Returns a standing and, for the
  // two standings that have earned one, a seat key and a district name built
  // ONLY out of fields the reader already saved.
  function decide() {
    var out = { standing: 'unplaced', seat: '', name: '' };
    var V = api();
    if (!V || !fn(V.seatForMe) || !fn(V.claim) || !fn(V.shipped)) {
      out.standing = 'boot';
      return out;
    }

    var seat = '';
    try { seat = V.seatForMe() || ''; } catch (e) { seat = ''; }

    var c = {};
    try { c = V.claim() || {}; } catch (e) { c = {}; }

    if (!seat) {
      // A claim we can read, in a state with no lane yet, is a different fact
      // from no claim at all — and it is the only one of the two that is
      // allowed to say "not here yet".
      out.standing = (c && c.state) ? 'nolane' : 'unplaced';
      return out;
    }

    out.seat = seat;
    // THE NAME IS THE FIELDS WE ALREADY STORE OR THERE IS NO NAME. Same rule,
    // same two fields and same spelling as me-desk.js's voice(), so the desk and
    // this room cannot print one reader's district two different ways.
    var n = String(c.houseDistrict == null ? '' : c.houseDistrict);
    var county = String(c.county == null ? '' : c.county);
    if (n && county) out.name = 'State House District ' + n + ' · ' + county;

    var open = false;
    try { open = !!V.shipped(seat); } catch (e) { open = false; }
    out.standing = open ? 'open' : 'notlive';
    return out;
  }

  // ── THE FIVE BLOCKS ───────────────────────────────────────────────────────
  function frameHtml() {
    var f = frame();
    return f ? '<p class="pdxvr-frame">' + esc(f) + '</p>' : '';
  }

  function checkingHtml() {
    return '<div class="pdxvr-card pdxvr-card--wait" aria-live="polite">' +
      '<p class="pdxvr-line"><span class="pdxvr-dot" aria-hidden="true"></span>' +
      'Checking where you vote…</p>' +
      '</div>';
  }

  function bootHtml() {
    // A load failure, said as a load failure. Not "you have no district" — this
    // file has no idea whether they do, and saying so would be a guess dressed
    // as a finding.
    return '<div class="pdxvr-card">' +
      '<p class="pdxvr-line">District Voice did not load on this page. Reload, ' +
      'or open a seat directly from its district file.</p>' +
      '</div>';
  }

  function unplacedHtml() {
    return '<div class="pdxvr-card">' +
      '<h2 class="pdxvr-hd">We do not know where you vote</h2>' +
      '<p class="pdxvr-line">District Voice is one seat’s board, so it needs ' +
      'your seat. Set your location once and this page knows which board is ' +
      'yours — there is no default, and we do not guess.</p>' +
      frameHtml() +
      '<p class="pdxvr-doors">' +
        '<a class="pdxvr-door" href="' + esc(HREF_WRM) + '">Who Represents Me</a>' +
        '<a class="pdxvr-door pdxvr-door--quiet" href="' + esc(HREF_BALLOT) + '">Set location on Your Ballot</a>' +
      '</p>' +
      '</div>';
  }

  function nolaneHtml() {
    return '<div class="pdxvr-card">' +
      '<h2 class="pdxvr-hd">No board where you vote yet</h2>' +
      '<p class="pdxvr-line">District Voice opens one seat at a time. Your saved ' +
      'location is not in a seat with a board yet, so there is nothing here to ' +
      'read — and nothing invented to fill the space.</p>' +
      frameHtml() +
      '<p class="pdxvr-doors">' +
        '<a class="pdxvr-door pdxvr-door--quiet" href="' + esc(HREF_WRM) + '">Who Represents Me</a>' +
      '</p>' +
      '</div>';
  }

  function notliveHtml(d) {
    var name = d.name ? '<p class="pdxvr-seat">' + esc(d.name) + '</p>' : '';
    return '<div class="pdxvr-card">' +
      '<h2 class="pdxvr-hd">Board not live yet in this seat</h2>' +
      name +
      '<p class="pdxvr-line">We have your seat. The board is not open in it yet, ' +
      'so there is no question to answer and no neighbours to read here.</p>' +
      frameHtml() +
      '</div>';
  }

  function openHtml(d) {
    // The frame sentence is NOT printed here: district-voice.js's render() prints
    // it unconditionally above the board's three blocks, and two copies of one
    // sentence on one screen is the drift this codebase fences against.
    var name = d.name ? '<p class="pdxvr-seat">' + esc(d.name) + '</p>' : '';
    var href = '';
    var V = api();
    try { href = (V && fn(V.path)) ? (V.path(d.seat) || '') : ''; } catch (e) { href = ''; }
    var link = href
      ? '<a class="pdxvr-perma" href="' + esc(href) + '">Open this seat’s district file</a>'
      : '';
    return '<div class="pdxvr-card pdxvr-card--seated">' + name + link + '</div>';
  }

  function html(d) {
    if (d.standing === 'checking') return checkingHtml();
    if (d.standing === 'boot') return bootHtml();
    if (d.standing === 'nolane') return nolaneHtml();
    if (d.standing === 'notlive') return notliveHtml(d);
    if (d.standing === 'open') return openHtml(d);
    return unplacedHtml();
  }

  // ── THE BOARD, MOUNTED ONCE PER SEAT ──────────────────────────────────────
  // district-file.js's rule, copied on purpose: paint may run many times on one
  // visit, and a remount would tear down a poll answer or a half-typed take. Both
  // checks fail soft — a missing module or a missing host paints the standing and
  // leaves the host empty, which the stylesheet collapses.
  function mountBoard(seat) {
    if (!seat || _mountedSeat === seat) return;
    var host = el(BOARD_ID);
    if (!host) return;
    var V = api();
    if (!V || !fn(V.mount)) return;
    var ok = false;
    try { ok = V.mount(seat, BOARD_ID, []) !== false; } catch (e) { ok = false; }
    if (ok) _mountedSeat = seat;
  }

  function paint() {
    var host = el(STANDING_ID);
    var d = decide();

    // The two standings that mean "we have nothing for you" are held back until
    // the grace window closes, because before it closes they are not answers —
    // they are the absence of one. 'nolane' and 'notlive' are NOT held: both rest
    // on a location the resolver has already produced.
    if ((d.standing === 'unplaced' || d.standing === 'boot') && !graceOver()) {
      d = { standing: 'checking', seat: '', name: '' };
    }

    if (host) {
      var sig = d.standing + '|' + d.seat + '|' + d.name;
      if (sig !== _lastSig) {
        try {
          host.innerHTML = html(d);
          host.setAttribute('data-pdxvr-standing', d.standing);
          _lastSig = sig;
        } catch (e) {}
      }
    }

    if (d.standing === 'open') mountBoard(d.seat);
    return d.standing;
  }

  // ── WHEN IT RUNS ──────────────────────────────────────────────────────────
  // A bounded schedule, not a poll: the deferred resolver and the deferred SDK
  // both land inside the first few seconds, and the last tick sits just past the
  // grace window so the quiet "checking" state is always replaced by a real one.
  // Ticks stop once the board is up, because after that there is nothing left for
  // this file to decide.
  var TICKS = [0, 400, 1200, 2500, 4000, GRACE_MS + 120];

  function schedule() {
    for (var i = 0; i < TICKS.length; i++) {
      (function (ms) {
        setTimeout(function () {
          if (_mountedSeat) return;
          try { paint(); } catch (e) {}
        }, ms);
      })(TICKS[i]);
    }
  }

  function boot() {
    try { paint(); } catch (e) {}
    schedule();
  }

  // THE RESOLVER'S HOOK, CLAIMED HERE. See the header. Guarded so a future owner
  // on this document cannot be silently overwritten by this file.
  if (!fn(window._vhBallotRerender)) {
    window._vhBallotRerender = function () { try { paint(); } catch (e) {} };
  }

  // Exposed for the suite and for nothing else: the standing as a word, decided
  // by the same function that paints it, so a test never has to read the DOM to
  // learn which of the five this reader is in.
  window.PDXVoiceRoom = {
    STANDING_ID: STANDING_ID,
    BOARD_ID: BOARD_ID,
    GRACE_MS: GRACE_MS,
    decide: decide,
    paint: paint,
    standing: function () { return _lastSig.split('|')[0] || ''; },
    seated: function () { return _mountedSeat || ''; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
