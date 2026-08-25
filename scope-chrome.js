/* ═══════════════════════════════════════════════════════════════════════════
   SCOPE CHROME  ·  saying which of the two scopes a surface is in
   ═══════════════════════════════════════════════════════════════════════════

   PolitiDex has one archive and two scopes, and until now only one of them was
   ever stated.

     NATIONAL — the record. Every politician the roster holds, their promises,
       their votes, their money, the issue records and the measures. Searchable
       from any state, useful from any state, and complete in the only sense
       that matters here: it is the whole of what we hold.

     UTAH — the ballot. District-mapped seats, curated local rosters, election
       dates. Utah is the only state whose district lines PolitiDex draws, so it
       is the only state where "here is your ballot" is a sentence we can
       finish.

   The engines already knew this. pdxRepsForMe() returns districtsResolvable and
   leaves district rows blank outside Utah; the ballot workspace has a 'district'
   gate whose copy says PolitiDex draws Utah's lines only; who-represents-me.js
   carries a standing .wrm-scope paragraph naming which seats resolve from a
   state and which need lines we do not draw. Every one of those is a per-ROW
   admission, and each one only appears once a reader has already set a location
   and hit the blank.

   What was missing was the frame. Door 2 opened with "Your ballot has more than
   one seat — U.S. Senate, U.S. House, Governor, your statehouse, and local
   offices", addressed to everybody, promising a national ballot product. A
   visitor in Ohio read that, set their location, and then met three blanks and
   an explanation. The explanation was true and it arrived too late to be
   anything but a let-down — a scope discovered by disappointment rather than
   read up front.

   So this file states both scopes in the chrome, before the reader spends
   anything. It is a small module on purpose:

     · IT STATES, IT DOES NOT GATE. Nothing here decides what any surface shows.
       The blanks, the fields, the local coverage and the district refusals are
       all owned by the modules that already own them, and this file would be
       correct to delete if they ever stopped being honest — it is a label on a
       truth, not the truth.
     · IT SPLITS NOTHING. There is one archive. The national scope is not a
       "lite" tier and Utah is not a separate product; the two are what the same
       archive can answer at two different resolutions.
     · IT NAMES NO THIRD DOOR. Who Represents Me is the front step into Door 2,
       and the copy here treats it that way — a step, not a destination with a
       scope of its own.
     · IT CARRIES NO FIGURE. No count of states, no percentage of coverage, no
       "N politicians tracked". A number here would immediately become a
       coverage claim, and coverage claims are what Phase 0 spent its time
       removing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXScope) return;

  var BALLOT_STATE = 'Utah';

  // The two scopes, worded once. Every mount below reads these, so the short
  // form in the archive header and the long form in Door 2 cannot drift into
  // saying two different things about the same geography.
  var SCOPES = [
    {
      id: 'national',
      icon: '\u{1F5C2}️',
      where: 'National',
      what: 'the record',
      body: 'Every politician, promise, vote and issue record PolitiDex holds — ' +
            'searchable from any state, whether or not there is an election on.'
    },
    {
      id: 'ballot',
      icon: '\u{1F5FA}️',
      where: BALLOT_STATE,
      what: 'the ballot',
      body: 'District-mapped seats, curated local offices and election dates. ' +
            BALLOT_STATE + ' is the only state whose district lines PolitiDex draws today.'
    }
  ];

  // One sentence for the archive header. Same fact, one line, no cards.
  var ARCHIVE_LINE =
    'This archive is <strong>national</strong> — search anyone in it from any state. ' +
    'Ballot tools below need district lines, which PolitiDex draws in <strong>' +
    BALLOT_STATE + '</strong> so far.';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // ── What we know about this reader ─────────────────────────────────────────
  // Read through pdxRepsForMe(), never from _currentVoterLocation directly: the
  // resolver is the module that decides what "your districts are mapped" means,
  // and a second reading of the raw location is a second chance to disagree with
  // it. No resolver, no reader facts — the standing scope statement still
  // prints, because it is true regardless of who is looking.
  function read() {
    var out = { located: false, national: false, state: '', area: '', districtsMapped: false, inBallotState: false };
    var r = null;
    try { r = fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { r = null; }
    if (!r) return out;
    out.located = !!r.located;
    out.national = !!r.national;
    out.state = r.state || '';
    out.area = r.area || '';
    out.districtsMapped = !!r.districtsResolvable;
    out.inBallotState = String(out.state).trim().toLowerCase() === BALLOT_STATE.toLowerCase();
    return out;
  }

  // ── The reader's own line ──────────────────────────────────────────────────
  // Three states, three different true things. The out-of-state line is
  // deliberately short: the ballot workspace and who-represents-me.js both
  // explain the blanks at length where the blanks actually are, and repeating
  // that reasoning up here would turn a scope statement into an apology.
  function line(s) {
    s = s || read();
    if (!s.located || s.national) {
      return 'Set a location and each seat below says which of the two it falls under.';
    }
    var where = s.area ? esc(s.area) : (s.state ? esc(s.state) : 'your area');
    if (s.districtsMapped) {
      return 'You are set to <strong>' + where + '</strong>. Both scopes apply to you: ' +
        'your district seats resolve because ' + BALLOT_STATE + '’s lines are mapped.';
    }
    return 'You are set to <strong>' + where + '</strong>. Your statewide seats — ' +
      'U.S. Senate and Governor — resolve from your state. Your district seats stay blank: ' +
      'needs a district map, and PolitiDex maps ' + BALLOT_STATE + ' today.';
  }

  // ── The strip ─────────────────────────────────────────────────────────────
  function stripHtml(s) {
    var cards = SCOPES.map(function (sc) {
      var live = (sc.id === 'ballot' && s.located && !s.national)
        ? (s.districtsMapped ? ' is-live' : ' is-out')
        : '';
      return '<div class="sc-card' + live + '" data-scope="' + esc(sc.id) + '">' +
        '<div class="sc-card-hd">' +
          '<span class="sc-ico" aria-hidden="true">' + sc.icon + '</span>' +
          '<span class="sc-where">' + esc(sc.where) + '</span>' +
          '<span class="sc-what">' + esc(sc.what) + '</span>' +
        '</div>' +
        '<p class="sc-body">' + sc.body + '</p>' +
      '</div>';
    }).join('');
    return '<div class="sc-strip" role="note" aria-label="What PolitiDex covers nationally and what it covers for ' + BALLOT_STATE + '">' +
        '<div class="sc-kick">One archive · two scopes</div>' +
        '<div class="sc-cards">' + cards + '</div>' +
        '<p class="sc-line">' + line(s) + '</p>' +
      '</div>';
  }

  // Idempotent slot, appended once to whatever host we were given. Append rather
  // than insert so nothing already in the section moves: a reader who has learnt
  // where a control sits still finds it there.
  function slot(host, id) {
    if (!host) return null;
    var node = el(id);
    if (node && node.parentNode === host) return node;
    if (node && node.parentNode) node.parentNode.removeChild(node);
    node = document.createElement('div');
    node.id = id;
    node.className = 'sc-slot';
    host.appendChild(node);
    return node;
  }

  function paintHub(s) {
    var host = null;
    try { host = document.querySelector('#voter-hub .vh-intro'); } catch (e) { host = null; }
    var node = slot(host, 'sc-hub');
    if (!node) return false;
    node.innerHTML = stripHtml(s);
    return true;
  }

  // The archive header gets the one-line form. Anchored to the depth line's
  // parent because that is the block that already carries the roster's own
  // description of itself, so the scope sits with the rest of the "what is this
  // list" copy instead of floating above the search controls.
  function paintArchive() {
    var depth = el('tracker-depth-line');
    var host = depth && depth.parentNode;
    var node = slot(host, 'sc-archive');
    if (!node) return false;
    node.innerHTML = '<p class="sc-oneline">' + ARCHIVE_LINE + '</p>';
    return true;
  }

  function sync() {
    var s = read();
    try { paintHub(s); } catch (e) {}
    try { paintArchive(); } catch (e) {}
  }

  // ── Staying in step ───────────────────────────────────────────────────────
  // Only one thing upstream can change what this says: the reader's location.
  // Wrapped rather than polled, and marked so a double boot cannot stack two
  // wrappers — the same idiom ballot-workspace.js and door2-spine.js use.
  function wrap(name, flag) {
    if (!fn(window[name]) || window[name][flag]) return;
    var orig = window[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try { sync(); } catch (e) {}
      return out;
    };
    w[flag] = true;
    try { window[name] = w; } catch (e) {}
  }

  function boot() {
    wrap('_updateTeamPositionsForLocation', '__scLoc');
    sync();
  }

  window.PDXScope = {
    BALLOT_STATE: BALLOT_STATE,
    SCOPES: SCOPES,
    ARCHIVE_LINE: ARCHIVE_LINE,
    read: read,
    line: line,
    sync: sync,
    _strip: stripHtml
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // The location resolver and the browse header both mount late. Three settles,
  // same schedule as the other Door 2 modules, then stop — a permanent watcher
  // for a line of text is not worth a timer.
  [400, 1200, 3000].forEach(function (ms) { setTimeout(sync, ms); });
})();
