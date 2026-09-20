/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE VOICE HUB (/voice)  ·  a hallway, and never a second answer
   ─────────────────────────────────────────────────────────────────────────────

   WHAT THIS ADDRESS IS NOW, AND WHAT IT WAS

   It was "your district's board": one seat, resolved out of the saved location,
   with the board mounted inline underneath. That was wrong in a way a reader
   felt immediately. A person does not have A district. The saved location
   resolves a state House seat, a state Senate seat, a U.S. House seat, two U.S.
   Senate seats and a governor — six seats, all of them theirs — and a page that
   picked one of the six and called it "your district" was answering a question
   nobody asked with five sixths of the answer missing.

   So /voice is the HOME of District Voice, and it is a HALLWAY. One card per
   seat the location already names, in the resolver's own order, each card saying
   what the seat is, who sits in it, and whether there is a room to walk into.
   Nav District Voice lands here. A location save that began here returns here.

   WHAT A HALLWAY IS NOT

     · NOT A DISTRICT SEARCH. There is no box to type a district into, no state
       picker, no national index. The only seats on this page are the seats the
       reader's own saved location resolved, and the only way to change them is
       to change the location.
     · NOT A BOARD. Nothing mounts here. The board is a document of its own at
       its own address and district-board.js owns every pixel of it. This file
       prints a door or prints that there is no door.
     · NOT A ROOM WITH THE LIGHTS OFF. A seat with no board gets two sentences
       and a person link — never an empty poll with three zeroes in it, never a
       table of no rows, never a composer that cannot post. A shape that could
       hold a feed is a shape somebody will eventually put a feed in.
     · NOT SOMEBODY ELSE'S ROOM. The door on a card is the door to THAT card's
       seat. A reader whose location resolves a state House seat in one county
       does not get a state Senate board from another county offered as theirs.
       That exclusivity is the product: a board is worth reading precisely
       because everyone with a voice in it lives in the seat.

   IT OWNS ONE DECISION AND BORROWS EVERY FACT

   district-voice.js is the one owner of the seat list (seatsForMe(), which reads
   pdxRepsForMe() — the app's one location resolver — and composes nothing of its
   own), of the board allow-list (boardPath(), one table, one row today), of the
   seat-key shape (normalizeSeatKey, inside seatKeyForLevel) and of every
   sentence this page prints about a board (COPY). This file asks it all four and
   answers none of them. voter-hub-location.js owns the location and the return
   intent (PDXReturn). person-link.js owns what a person's URL is.

   A copy of the allow-list HERE, or of a board path, or of a state name, or of
   the absence sentence, would be a second answer — and the second answer is
   always the one that is still there after the table it disagrees with moved.
   There is deliberately not one state name, seat key or board address anywhere
   in this file, and the suite asserts that.

   THE FOUR STANDINGS, AND THE DEFAULT IS THE QUIETEST ONE

     checking   We do not know. The location resolver is 255 KB of deferred
                script and the account it is keyed to arrives with Firebase, so
                for the first moments after paint the honest answer is "asking",
                not "you have nothing". THE SAME RULE THE ACCOUNT CHIP RUNS ON:
                unknown is not empty, and a returning resident must not be told
                we have no idea where they vote because a deferred file has not
                landed. Bounded by GRACE_MS.

     unplaced   No saved location we can read. One door, to the one surface that
                sets a location, carrying the intent to come back here. It names
                no state, no county and no district: there is no default location
                on this page.

     placed     The location resolved seats. One card each.

     boot       District Voice did not load. Said as a load failure, because that
                is what it is — not as "you have no seats", which this file has
                no way of knowing.

   EVERY EARLY RETURN LANDS ON A WEAKER STANDING. A missing module, a missing
   resolver, a missing field or a thrown getter can only ever UNDERSTATE what
   this reader has. Nothing here can invent a seat, and nothing here can put a
   door on a seat the allow-list did not give one.

   THE REPAINT HOOK

   voter-hub-location.js calls window._vhBallotRerender() when the saved location
   resolves or changes. On the homepage and /ballot that name belongs to
   ballot-breakdown.js; on /me to me-desk.js; HERE to this file, claimed only if
   unclaimed, for the same reason /me claims it — an unclaimed hook means the
   resolver lands and nothing on the page notices.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var STANDING_ID = 'pdx-voice-standing';
  var SEATS_ID = 'pdx-voice-seats';

  // The same grace the account chip runs on (shell-account-chip.js UNKNOWN_MS),
  // for the same reason and deliberately the same number: two quiet "asking"
  // states on one document that expired at different times would read as a bug.
  var GRACE_MS = 6000;

  // The fallback door, for a boot where voter-hub-location.js never landed and
  // PDXReturn is therefore absent. It is the finder's plain address with no
  // intent attached — a STRICT DEGRADATION of the real door and not a second
  // copy of how the intent is spelled. The parameter name, the allow-list and
  // the encoding live in exactly one place and this is not it.
  //
  // IT IS /find AND NOT /#who-represents-me, which is the same correction the
  // real door got: the band on the front page is where a reader READS their
  // seats and the finder is where they SET them, and sending somebody who has no
  // location to the reading surface made them parse the whole archive homepage
  // to reach a picker that then rebuilt it behind itself. The degraded door has
  // to degrade to the right PLACE, or a failed boot of the location module is
  // also a slower page.
  var HREF_FINDER_BARE = '/find';

  var _t0 = Date.now();
  var _lastSig = '';
  var _seats = [];

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
  function copy(k) {
    var V = api();
    try { return (V && V.COPY && V.COPY[k]) ? String(V.COPY[k]) : ''; } catch (e) { return ''; }
  }

  // The door that SETS a location, carrying the intent to come back to this
  // address. voter-hub-location.js builds it; here() is what makes it return to
  // wherever this file is running rather than to a hard-coded page.
  function finderHref() {
    try {
      var R = window.PDXReturn;
      if (R && fn(R.finderHref) && fn(R.here)) return R.finderHref(R.here());
    } catch (e) {}
    return HREF_FINDER_BARE;
  }

  // ── A PERSON'S NAME AND ADDRESS ───────────────────────────────────────────
  // THE GATE IS THE PID, NOT THE DISPLAY RECORD — the rule who-represents-me.js,
  // voter-hub-location.js and me-desk.js all state. This document carries no
  // roster (that is the whole reason it is 28 KB and not 1.9 MB), so a name
  // usually does not resolve here at all. A pid with no display record still
  // gets a working anchor to the person's own file; what it does not get is a
  // sentence reading as "nobody", and it does not get a raw id printed as if it
  // were somebody's name.
  //
  // AND THE LOOKUP IS THE RESOLVER'S, NOT A SECOND ONE, AND IT IS ASKED FIRST.
  // window.pdxRosterRec is the read voter-hub-location.js's own roster gate uses
  // to decide whether a pid is still a person on this document — the two
  // indexes, and the retired spellings PDX_PROFILE_ALIAS has ruled are the same
  // officeholder. Asking it here is how the card that says "Sitting member" and
  // the gate that lets the seat keep its member stay one answer: a Utah State
  // House pid the resolver kept is a pid this file can name, rather than one it
  // has to describe as merely "on file".
  //
  // ORDER IS THE WHOLE OF IT. This used to ask window._pdxPersonById first and
  // `return` its answer — including its NULL. That reader is compare-table.js's,
  // it keys the bundled roster only, and on any document carrying it a pid whose
  // row is filed under a retired spelling came back null and ended the search
  // before the join was ever consulted. So the join goes first, and no lane
  // below it can end the walk by answering "nobody".
  //
  // A ROW WITHOUT A NAME IS NOT AN ANSWER EITHER. Each lane is kept only if it
  // can actually name the person; a thin row is remembered as `first` and the
  // walk carries on, so a lite record under the canonical key cannot shadow the
  // full document filed under the slug. The last lane returns whatever row was
  // seen, which is the honest answer "we hold a row for this seat and it names
  // nobody" — and seatHtml already has a sentence for exactly that.
  //
  // NO ALIAS TABLE IS READ HERE. This file knows no ids, no spellings and no
  // rulings about who is whom; the canonical-to-slug walk is the resolver's
  // single one, asked once, in lane 1.
  function named(p) {
    try { return !!(p && p.name && String(p.name).trim()); } catch (e) { return false; }
  }
  function personOf(pid) {
    if (!pid) return null;
    var first = null, r = null;
    // 1 · THE GATE'S OWN JOIN: the canonical record, or the row filed under a
    //     spelling of it that this repo has already ruled is the same person.
    try { if (fn(window.pdxRosterRec)) r = window.pdxRosterRec(pid) || null; } catch (e) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    // 2 · The bundled roster's own reader, where a document carries one.
    try { if (fn(window._pdxPersonById)) r = window._pdxPersonById(pid) || null; } catch (e2) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    // 3 · The raw reads, for a boot where the resolver never landed and this
    //     file is all there is.
    try { r = (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e3) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    try { r = (window.PROFILES && window.PROFILES[pid]) || null; } catch (e4) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    return first;
  }
  function personHref(pid) {
    try {
      var PL = window.PDXPersonLink;
      if (PL && fn(PL.href)) { var h = PL.href(pid); if (h) return h; }
    } catch (e) {}
    return pid ? '/p/' + encodeURIComponent(String(pid)) : '';
  }

  // ── THE DECISION ──────────────────────────────────────────────────────────
  // Reads district-voice.js and nothing else. Returns a standing and, for the
  // one standing that has earned them, the seat cards exactly as that module
  // composed them.
  function decide() {
    var out = { standing: 'unplaced', seats: [] };
    var V = api();
    if (!V || !fn(V.seatsForMe) || !fn(V.boardPath)) {
      out.standing = 'boot';
      return out;
    }
    var seats = [];
    try { seats = V.seatsForMe() || []; } catch (e) { seats = []; }
    if (!seats.length) return out;
    out.standing = 'placed';
    out.seats = seats;
    return out;
  }

  // ── THE BLOCKS ────────────────────────────────────────────────────────────
  function frameHtml() {
    var f = copy('frame');
    return f ? '<p class="pdxvr-frame">' + esc(f) + '</p>' : '';
  }

  function checkingHtml() {
    return '<div class="pdxvr-card pdxvr-card--wait" aria-live="polite">' +
      '<p class="pdxvr-line"><span class="pdxvr-dot" aria-hidden="true"></span>' +
      'Checking where you vote…</p>' +
      '</div>';
  }

  function bootHtml() {
    // A load failure, said as a load failure. Not "you have no seats" — this
    // file has no idea whether they do, and saying so would be a guess dressed
    // as a finding.
    return '<div class="pdxvr-card">' +
      '<p class="pdxvr-line">District Voice did not load on this page. Reload, ' +
      'or open a board from the seat it belongs to.</p>' +
      '</div>';
  }

  function unplacedHtml() {
    // ONE DOOR, AND IT IS AN ANCHOR. A real href to a real address, so it can be
    // copied, opened in a tab and read by anything that scrapes links — and it
    // carries the intent, so the reader who walks through it comes back here
    // instead of being left standing on the finder.
    return '<div class="pdxvr-card">' +
      '<h2 class="pdxvr-hd">We do not know where you vote</h2>' +
      '<p class="pdxvr-line">Every room here is keyed to a seat, so this page ' +
      'needs the seats you vote in. Set your location once and it lists them. ' +
      'There is no default location on this page, and we do not guess one.</p>' +
      frameHtml() +
      '<p class="pdxvr-doors">' +
        '<a class="pdxvr-door" href="' + esc(finderHref()) + '">Who Represents Me</a>' +
      '</p>' +
      '</div>';
  }

  // ── ONE CARD, ONE SEAT ────────────────────────────────────────────────────
  // Three lines at most: what the seat is, who sits in it, and the door or the
  // absence of one. No count, no activity dot, no badge, no meter — a hallway
  // says which rooms exist and says nothing about how busy they are, and a
  // number here would turn neighbours' sentences into a metric on the page that
  // exists to keep them from being one.
  function seatHtml(s) {
    var name = String(s && s.name ? s.name : '');
    if (!name) return '';
    var board = String(s && s.board ? s.board : '');

    var who = '';
    var pid = String(s && s.pid ? s.pid : '');
    var href = pid ? personHref(pid) : '';
    if (href) {
      var p = personOf(pid);
      var label = (p && p.name) ? String(p.name) : '';
      who = label
        ? '<p class="pdxvr-who">Sitting member: ' +
            '<a class="pdxvr-name" href="' + esc(href) + '">' + esc(label) + '</a></p>'
        : '<p class="pdxvr-who">The member who holds this seat is on file. ' +
            '<a class="pdxvr-name" href="' + esc(href) + '">Open the person file</a></p>';
    } else {
      // "On hand", not "on the way". We hold no holder for this seat and that is
      // the whole of the sentence.
      who = '<p class="pdxvr-who">No sitting member on hand for this seat.</p>';
    }

    var door;
    if (board) {
      // THE PRIMARY CONTROL, AND IT GOES TO THAT EXACT ADDRESS. The address is
      // the allow-list's, asked for by seat key; this file composes none of it.
      door = '<p class="pdxvr-doors">' +
        '<a class="pdxvr-door" href="' + esc(board) + '">' +
        esc(copy('boardOpen') || 'Open board') + '</a></p>';
    } else {
      // THE EMPTY GRAMMAR. Two sentences and no shape: no door onto nothing, no
      // disabled control, no table of no rows. Both strings are
      // district-voice.js's, so the desk and the hallway say it the same way.
      door = '<p class="pdxvr-none">' + esc(copy('boardNone')) + '</p>' +
        '<p class="pdxvr-why">' + esc(copy('boardWhy')) + '</p>';
    }

    return '<li class="pdxvr-seat" data-pdxvr-board="' + (board ? 'on' : 'off') + '">' +
      '<p class="pdxvr-chamber">' + esc(name) + '</p>' +
      who + door +
      '</li>';
  }

  function seatsHtml(seats) {
    var rows = [];
    for (var i = 0; i < seats.length; i++) {
      var h = seatHtml(seats[i]);
      if (h) rows.push(h);
    }
    if (!rows.length) return '';
    return '<ul class="pdxvr-seats">' + rows.join('') + '</ul>';
  }

  function standingHtml(d) {
    if (d.standing === 'checking') return checkingHtml();
    if (d.standing === 'boot') return bootHtml();
    // The frame sentence, printed ONCE, above the cards. It is the definition of
    // what a board is and every card below it inherits it, so no card repeats it.
    if (d.standing === 'placed') return frameHtml();
    return unplacedHtml();
  }

  // ── PAINT ─────────────────────────────────────────────────────────────────
  // Two hosts, one signature. The signature is every field that can appear on
  // the page, so an unchanged answer never rewrites the DOM — and a card that
  // gains a board, a member or a district number is a different signature and
  // does.
  function sigOf(d) {
    var parts = [d.standing];
    for (var i = 0; i < d.seats.length; i++) {
      var s = d.seats[i] || {};
      parts.push([s.key, s.name, s.seatKey, s.pid, s.board].join('~'));
    }
    return parts.join('|');
  }

  function paint() {
    var d = decide();

    // The two standings that mean "we have nothing for you" are held back until
    // the grace window closes, because before it closes they are not answers —
    // they are the absence of one.
    if ((d.standing === 'unplaced' || d.standing === 'boot') && !graceOver()) {
      d = { standing: 'checking', seats: [] };
    }

    var sig = sigOf(d);
    if (sig !== _lastSig) {
      var host = el(STANDING_ID);
      if (host) {
        try {
          host.innerHTML = standingHtml(d);
          host.setAttribute('data-pdxvr-standing', d.standing);
        } catch (e) {}
      }
      var seatHost = el(SEATS_ID);
      if (seatHost) {
        try { seatHost.innerHTML = seatsHtml(d.seats); } catch (e2) {}
      }
      _lastSig = sig;
      _seats = d.seats;
    }
    return d.standing;
  }

  // ── WHEN IT RUNS ──────────────────────────────────────────────────────────
  // A bounded schedule, not a poll: the deferred resolver and the deferred SDK
  // both land inside the first few seconds, and the last tick sits just past the
  // grace window so the quiet "checking" state is always replaced by a real one.
  // Every tick runs — unlike the board this page used to mount, a hallway has no
  // half-typed take to protect, and the seat list can still change after the
  // first paint when the roster merges a member's display record.
  var TICKS = [0, 400, 1200, 2500, 4000, GRACE_MS + 120];

  function schedule() {
    for (var i = 0; i < TICKS.length; i++) {
      (function (ms) {
        setTimeout(function () { try { paint(); } catch (e) {} }, ms);
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

  // Exposed for the suite and for nothing else: the standing as a word and the
  // cards as data, both from the same function that paints them, so a test never
  // has to read the DOM to learn which seats this reader was shown.
  window.PDXVoiceRoom = {
    STANDING_ID: STANDING_ID,
    SEATS_ID: SEATS_ID,
    GRACE_MS: GRACE_MS,
    decide: decide,
    paint: paint,
    seatHtml: seatHtml,
    seatsHtml: seatsHtml,
    standing: function () { return _lastSig.split('|')[0] || ''; },
    seats: function () { return _seats.slice(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
