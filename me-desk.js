/* ═════════════════════════════════════════════════════════════════════════════
   me-desk.js — /me. THE VOTER'S OWN FILE, AS ONE DOCUMENT.
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS WRONG. This account had two names and two surfaces. The account menu
   offered "Your File", which was the hash #your-file on the homepage, and "My
   Views", which scrolled to a very long My Stances region on the same homepage.
   Ballot picks lived in a third place again — the TEAM_POSITIONS slate and the
   /ballot desk — and starred issues in a fourth, as My Stances' High priority.
   One person, four addresses, none of them shareable, and Back from any of them
   meant "the front page, somewhere near where you were".

   WHAT THIS IS. One document at /me that says what this account holds and hands
   the reader to the tool that owns each part. SEVEN REGIONS, NOT SIX PRODUCTS:

     a · WHO THIS IS      the signed-in name and email exactly as the account
                          chip prints them, plus where this account votes AND
                          EVERY DISTRICT THAT LOCATION RESOLVES — the input
                          regions c and d both read, labelled one row per level
                          and fail-closed to "not on file" — one way to change
                          it, and the one way to leave the account. Logging out
                          lives here because the chrome's chip is a single
                          control to this document now rather than a dropdown
                          with three rows in it.
     b · POSITIONS        A SNAPSHOT of what this reader has already said, and
                          one door to the editor that owns it. The rows are
                          still your-file.js's own — same module, same store,
                          same renderer, and the list is the whole issue
                          vocabulary rather than a starter octet — but they are
                          no longer the FACE of the region: a desk that opens on
                          a wall of Support / Oppose / Mixed / Not sure is a
                          form, and a form is what you fill in rather than what
                          you read. See regionPositions().
     c · STARRED          the issues this reader flagged to count harder, read
                          through the SAME hook the match engine weights with.
                          Add and remove is a jump to My Stances, not a second
                          editor.
     d · BALLOT SNAPSHOT  one line per seat: office, WHO HOLDS IT NOW as a link
                          to /p/<pid> (or "No officeholder on file" — never a
                          guessed name), and under that the reader's own pick
                          when they have made one. "Work this seat" opens
                          /ballot with that seat already open.
     e · SAVED EVIDENCE   the receipts this account saved, each linking back to
                          the record it came from.
     f · JUMPS            three text links. Not a second navigation bar.
     g · DISTRICT VOICE   one standing line and one control for the district
                          board — see the block over regionVoice() for the whole
                          of what it may say and the seven things it may not.

   THE FIVE THINGS THIS FILE MUST NOT DO, and each one is a rule from the brief:

     · IT NEVER SCORES THE VOTER. There is no percentage, no grade, no "you are
       80% aligned with Utah" and no completeness figure anywhere in here. Every
       count is a COUNT — "2 of 121 set", "4 of 6 seats picked" — and every one
       of them is the length of a real list over the length of another real
       list, never a literal and never a ratio dressed as progress. Search this
       file for Math.round and there is nothing to find, and search it for the
       size of the issue vocabulary and there is nothing to find either: that
       number belongs to the register, and this document reads it.
     · IT NEVER PUBLISHES. /me is this reader's own desk. Nothing here reads
       another account, nothing here writes a public snapshot, and the document
       is noindex.
     · IT NEVER PARTY-CHIPS THE VOTER. A pick's row carries a name and a face.
       Not a party letter, not a colour that stands for one.
     · IT INVENTS NO STORE. Every fact on this page comes out of a store that
       already existed before this pass, through that store's own reader where
       one is on this document. Where a store has nothing in it, the region says
       so in words — see empty() — rather than painting a shape that looks like
       data.
     · IT IS NOT A THIRD BALLOT. Region d shows picks and counts seats. It
       cannot make a pick, it carries no field, it ranks nothing, and it does
       not embed ballot-workspace.js. The one control it has is a link to the
       desk that does all four.
     · IT IS NOT THE DISTRICT BOARD EITHER. Region g is a STANDING LINE and a
       control. It holds no thread, no poll, no take, no like and no bill, it
       reads no formal-record module, and the board it points at is the one that
       owns all of that. See regionVoice().

   THE ONE FLAG. window.__PDX_ME_DOC is declared by me.html's first inline
   block and read HERE, through isMeDoc(), and nowhere else in this file. This
   module refuses to run on any other document (so a stray script tag on the
   homepage cannot paint a second desk), and your-file.js reads the same flag to
   decide whether #your-file is an overlay to open or an address to travel to.
   One flag, one accessor, no per-module heuristics.

   THE ADDRESS. /me is the document. ?tab=positions|stars|ballot|saved names a
   REGION ON IT — not a page, not a view, not a layer. So a tab is a pushState
   (Back returns to the region you were reading, still on /me) and never a
   replaceState, and the document never changes underneath it. Back from /me
   itself is the browser's own Back, to whatever the reader came from, because
   this document does nothing to the history entry it arrived on.
   ═════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.PDXMeDesk) return;          // idempotent — never redefine

  // ── THE FLAG, THROUGH ONE ACCESSOR ────────────────────────────────────────
  function isMeDoc() {
    try { return !!window.__PDX_ME_DOC; } catch (e) { return false; }
  }
  // A desk on any other document would be a second editor of the same stores,
  // which is the exact defect this pass exists to end. So it does not boot.
  if (!isMeDoc()) return;

  var MOUNT = 'me-desk';

  // ?tab= names a region, and this is the whole vocabulary. An unknown value is
  // ignored rather than corrected: the reader still gets the desk.
  var TABS = {
    positions: 'me-positions',
    stars:     'me-stars',
    ballot:    'me-ballot',
    saved:     'me-saved'
  };

  // ── SMALL HELPERS ─────────────────────────────────────────────────────────
  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function store() { try { return window.PDXStore || null; } catch (e) { return null; } }

  // ── THE MEMBER ────────────────────────────────────────────────────────────
  // An anonymous Firebase session is NOT a member: the uid is minted per browser
  // and nothing is saved against it that follows anybody. Same rule your-file.js
  // and my-stances.js both apply, worded the same way.
  function member() {
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth
            : (window.firebase && fn(window.firebase.auth) ? window.firebase.auth() : null);
      var u = a && a.currentUser;
      return (u && !u.isAnonymous) ? u : null;
    } catch (e) { return null; }
  }
  // THE SAME NAME THE ACCOUNT MENU PRINTS. compare-hub.js's updateNavAuth
  // resolves a display name as displayName → the local part of the email →
  // "Member", and this document is the same account seen from a different
  // address: a reader who is "jane" in the menu must not be "jane@example.com"
  // here. The rule is copied rather than re-decided, and if it ever changes
  // there, this line is what has to change with it.
  function displayNameOf(u) {
    if (!u) return '';
    return u.displayName || (u.email ? String(u.email).split('@')[0] : 'Member');
  }

  // ── WHERE THIS ACCOUNT VOTES ──────────────────────────────────────────────
  // voter-hub-location.js owns this and nothing here re-derives it. It is a FACT
  // on region a because it is the INPUT to region d: the seats that exist for a
  // reader are a function of where they vote, so a desk that showed the seats
  // without showing the place would be showing a conclusion without its premise.
  function place() {
    var out = { located: false, label: '', detail: '' };
    try {
      out.located = !!window._hasUserLocation;
      var L = fn(window._voterLocationLabel) ? window._voterLocationLabel() : null;
      if (L) { out.label = L.place || ''; out.detail = L.detail || ''; }
      if (!out.label) {
        var c = window._currentVoterLocation || {};
        out.label = [c.city || c.county, c.state].filter(Boolean).join(', ');
      }
    } catch (e) {}
    return out;
  }


  // ── EVERY DISTRICT THIS LOCATION RESOLVES ─────────────────────────────────
  // WHAT WAS WRONG. Region a printed "Davis County, Utah · District 2" — one
  // number, unlabelled, taken from _voterLocationLabel's `detail`. A voter does
  // not sit in "District 2". They sit in a U.S. House district AND a State
  // Senate district AND a State House district AND a county AND a municipality
  // at the same time, and every one of those elects somebody different. One
  // bare number taught the reader they had one district, and it did not even
  // say which of the four it was.
  //
  // SO THE BLOCK IS A LABELLED LIST, FROM THE SAME RESOLVER THE BALLOT USES.
  // Nothing here derives a district: every row is either something
  // pdxRepsForMe() resolved, something the reader themselves saved (their own
  // typed or map-pinned datum, which is not an inference), or the words "not on
  // file".
  //
  // FAIL CLOSED, ROW BY ROW. A row with nothing behind it says "not on file" —
  // it does not borrow the number above it, does not fall back to a curated
  // default area, and does not invent one. That is the whole rule, and it is
  // why the missing rows are still PRINTED: a reader whose State Senate
  // district we do not hold learns that we do not hold it, which is a fact
  // about our coverage. Dropping the row would have read as "you have three
  // districts", which is the same lie in a quieter voice.
  //
  // WHY THE READER'S OWN SAVED FIELDS ARE READ AS A FALLBACK. The resolver
  // gates its district branch on Utah, because the curated geometry is Utah's
  // and a county name is not unique across states (see pdxRepsForMe). That gate
  // is about WHO HOLDS THE SEAT — it refuses to pair a bare number with an
  // officeholder. This list makes no claim about an officeholder, so where the
  // reader pinned their own State Senate district on the map, printing it back
  // to them under its own label is repeating their input, not answering a
  // question we cannot answer. The officeholder question is region d's, and
  // region d resolves it through pdxSeatHolders or says nobody is on file.
  //
  // THE JUDICIAL ROW IS CONDITIONAL, and this is not an oversight. Trial-court
  // districts are drawn by county and PDXJudicial.districtForCounty() is their
  // one owner — but that module and its 111 KB of data live on /courts and are
  // NOT on this document. So the row appears only where the question is
  // answerable at all: with the module present, the county's division or an
  // honest blank; without it, no row, because /me has nothing to say about it
  // rather than something unknown to report.
  function judicialApi() { try { return window.PDXJudicial || null; } catch (e) { return null; } }

  function levelFor(reps, key) {
    if (!reps || !reps.levels) return null;
    for (var i = 0; i < reps.levels.length; i++) {
      var l = reps.levels[i];
      if (l && l.key === key) return l;
    }
    return null;
  }
  // A district number, as digits or ''. Both sources go through this, so a
  // stored "2nd" and a resolved 2 cannot print differently.
  function distNum(v) {
    return String(v == null ? '' : v).replace(/[^0-9]/g, '');
  }
  // A BLANK ROW CARRIES THE REASON IT IS BLANK. "not on file" is the right
  // sentence for a county or a municipality the reader simply has not told us —
  // it is a fact about their record. It is the WRONG sentence for a state
  // legislative district, because there the record is fine and the DISTRICT MAP
  // is what we do not have: a Davis County reader whose U.S. House district
  // resolved to 2 read "State Senate · not on file" directly underneath it and
  // could only conclude the app had lost their district. It had never drawn it.
  //
  // And neither sentence may be the sentence region d prints over a seat with
  // nobody in it. Those are three different facts — no record, no map, no
  // person — and a row that shares a string with the wrong one of them teaches
  // the reader the wrong thing about what is missing.
  function distRow(label, value, why) {
    var v = String(value == null ? '' : value).trim();
    return { label: label, value: v, none: !v, why: (why || DIST_NONE) };
  }

  function districts() {
    var out = [];
    var loc = {};
    try { loc = window._currentVoterLocation || {}; } catch (e) { loc = {}; }
    if (!window._hasUserLocation) return out;
    var r = reps();
    var state = String(loc.state || (r && r.state) || '').trim();

    // COUNTY AND STATE, which region a already had. The resolver's county is
    // published match-gated, so the reader's own saved county is the fallback,
    // and the state is the scope both of them sit in.
    var county = String((r && r.county) || loc.county || '').trim();
    out.push(distRow('County', [county, state].filter(Boolean).join(', ')));

    // THE THREE LEGISLATIVE SEATS. The resolver first, the reader's own saved
    // field second, and third an admission about OUR map rather than about their
    // record: these three lines are drawn geometry, /me carries none of it, and
    // when neither the resolver nor the reader's own saved field has a number
    // the honest sentence names the missing map.
    var hl = levelFor(r, 'house');
    var hn = distNum(hl && hl.district) || distNum(loc.district);
    out.push(distRow('U.S. House', hn ? ('District ' + hn) : '', DIST_NOMAP));

    var sl = levelFor(r, 'statesenate');
    var sn = distNum(sl && sl.district) || distNum(loc.stateSenateDistrict);
    out.push(distRow('State Senate', sn ? ('District ' + sn) : '', DIST_NOMAP));

    var ll = levelFor(r, 'statehouse');
    var ln = distNum(ll && ll.district) || distNum(loc.stateHouseDistrict);
    out.push(distRow('State House', ln ? ('District ' + ln) : '', DIST_NOMAP));

    // LOCAL IS A JURISDICTION, NOT A NUMBER. The municipality this location
    // names is the local ballot's scope — mayor, council, school board — and it
    // is the only local line this document holds: the local ROSTER is curated
    // for the same areas the district geometry is, and /me does not carry it.
    out.push(distRow('Local', String(loc.city || '').trim()));

    // JUDICIAL, only where the module that owns the question is on the page.
    var J = judicialApi();
    if (J && fn(J.districtForCounty)) {
      var jd = '';
      try { jd = county ? (J.districtForCounty(county) || '') : ''; } catch (e2) { jd = ''; }
      out.push(distRow('Judicial', jd ? String(jd) : ''));
    }
    return out;
  }

  var DIST_NONE = 'not on file';
  var DIST_NOMAP = 'needs a district map';

  // ── WHAT THE LOCATION CONTROL IS CALLED, AND WHY IT IS NOT ALWAYS THE SAME ─
  // "Change location" is the right label for a reader whose place is settled.
  // It was the WRONG label for the reported state: an account block showing
  // "District 2" and then "needs a district map" twice, under a control offering
  // to CHANGE something the reader could see was not finished. A control named
  // for the work still outstanding is the difference between a dead end and a
  // next step, so the four rows that make a location usable — the county and the
  // three legislative districts — decide the word.
  //
  // IT READS THE ROWS REGION a IS ALREADY PRINTING. Not the store, not the
  // resolver, not a second completeness test: the same districts() list, so the
  // label cannot say "change" over a row that says it is missing. And there is no
  // figure in it — no "4 of 5 set", no bar — because a reader's own address is
  // not a score.
  var LOC_SET = 'Set your location';
  var LOC_CHANGE = 'Change location';
  var LOC_NEEDED = { 'County': 1, 'U.S. House': 1, 'State Senate': 1, 'State House': 1 };
  function locComplete(rows) {
    rows = rows || districts();
    if (!rows.length) return false;
    var seen = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !LOC_NEEDED[r.label]) continue;
      seen++;
      if (r.none) return false;
    }
    return seen === 4;
  }
  function locLabel(rows) { return locComplete(rows) ? LOC_CHANGE : LOC_SET; }
  function districtsHtml(rows) {
    rows = rows || districts();
    if (!rows.length) return '';
    return '<dl class="me-dists">' + rows.map(function (d) {
      return '<div class="me-dist' + (d.none ? ' me-dist--none' : '') + '">' +
        '<dt class="me-distlb">' + esc(d.label) + '</dt>' +
        '<dd class="me-distv">' + esc(d.none ? (d.why || DIST_NONE) : d.value) + '</dd>' +
      '</div>';
    }).join('') + '</dl>';
  }

  // ── THE SEATS ─────────────────────────────────────────────────────────────
  // TEAM_POSITIONS is the team builder's own definition of a ballot, and this is
  // a projection of it — the SAME projection ballot-workspace.js's seats() falls
  // through to, for the same stated reason: deriving a seat list from anything
  // else (the resolver's levels, a literal here) is how one surface ends up
  // counting five slots over another counting six.
  //
  // THERE IS NO SEAT COUNT IN THIS FILE. Not six, not any number. The count in
  // region d's head is the length of the list this function returns, filtered by
  // the gate below, and if a reader's slate is four seats long the sentence says
  // four.
  //
  // WHY THIS DOES NOT ASK _myteamBallotCounts. That function — compare-hub.js —
  // expands the single generic "local" slot into a voter's real local seats, and
  // it is the right answer on a document that carries the picks grid those seats
  // belong to. compare-hub.js is not on this document and it is not on /ballot
  // either, so BOTH documents fall through to this same TEAM_POSITIONS
  // projection and cannot disagree about what this reader's ballot is. That is
  // how region d's count matches the desk's without either one holding a number.
  // It is still asked first, so a document that ever does carry the expansion
  // gets the expanded list here too.
  function seats() {
    var C = null;
    try { if (fn(window._myteamBallotCounts)) C = window._myteamBallotCounts(); } catch (e) { C = null; }
    if (C && C.seats && C.seats.length) {
      var ico = {};
      try {
        (window.TEAM_POSITIONS || []).forEach(function (p) { if (p && p.key) ico[p.key] = p.icon; });
      } catch (e) {}
      return C.seats.map(function (sq) {
        var k = String(sq.key);
        return {
          key: k,
          label: sq.label || k,
          icon: ico[k] || (k.indexOf('local') === 0 ? '\u{1F3D9}' : '\u{1F3DB}')
        };
      });
    }
    var out = [];
    try {
      (window.TEAM_POSITIONS || []).forEach(function (p) {
        if (p && p.key) out.push({ key: p.key, label: p.label || p.key, icon: p.icon || '\u{1F3DB}' });
      });
    } catch (e) {}
    return out;
  }

  function reps() {
    try { return fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { return null; }
  }

  // ── DISTRICT VOICE STANDING, AND NOTHING ELSE ABOUT THE BOARD ─────────────
  // district-voice.js is the one owner of every fact this reader needs here: the
  // seats the saved location resolves (seatsForMe(), which reads pdxRepsForMe()
  // and composes nothing of its own), which of those seats has a board
  // (boardPath(), one table, one row today), and the sentences that say what a
  // board is and what its absence is (COPY). This function asks it and decides
  // nothing. A copy of the allow-list, of the seat-key shape or of the frame
  // sentence on THIS document would be a second answer, and a second answer is
  // the defect.
  //
  // WHAT CHANGED, AND WHY IT IS THE SAME CHANGE /voice MADE. This used to answer
  // "your district" — one seat, the State House one, because that is the seat
  // the /d/ lane is keyed on. A reader does not have A district. The saved
  // location resolves a state House seat, a state Senate seat, a U.S. House
  // seat, both U.S. Senate seats and a governor, and a desk that named one of
  // the six was printing a sixth of the truth as the whole of it.
  //
  // THREE STANDINGS, AND THE DEFAULT IS THE WEAKEST ONE. 'out' for a reader
  // with no account, 'unverified' for an account whose location resolves no
  // seats we can name, and 'verified' only when at least one seat resolved.
  // Every early return below lands on a weaker standing, so a missing module, a
  // missing resolver or a missing field can only ever UNDERSTATE what this
  // reader has — never invent a board for somebody who has none.
  //
  // IT DOES NOT DUPLICATE THE HALLWAY. /voice prints the full card per seat: the
  // sitting member, the person link, the door or the two-sentence absence. This
  // is a SNAPSHOT — one line per seat, chamber and whether a board is on hand —
  // and one control, to the address that owns the rest. Two full copies of one
  // reader's seat list on two documents is how they start disagreeing.
  function voiceApi() { try { return window.PDXVoice || null; } catch (e) { return null; } }

  function voice() {
    var out = { standing: 'out', seats: [], href: '', finder: '', frame: '' };
    var V = voiceApi();
    // Borrowed, never written here: one owner for the sentence that says what
    // the board is, so /me and the board cannot describe it differently.
    try { if (V && V.COPY && V.COPY.frame) out.frame = String(V.COPY.frame); } catch (e) {}
    // THE DOOR THAT SETS A LOCATION, CARRYING THE INTENT TO COME BACK TO VOICE.
    // voter-hub-location.js owns the parameter, the allow-list and the encoding.
    // A boot without that module degrades to the finder's plain address — /find,
    // the picker's own document — rather than to a second copy of how the intent
    // is spelled, and rather than to the front page band that only READS a
    // location back.
    out.finder = '/find';
    try {
      var R = window.PDXReturn;
      if (R && fn(R.finderHref)) out.finder = R.finderHref('/voice');
    } catch (e2) {}

    if (!member()) return out;
    out.standing = 'unverified';
    if (!V || !fn(V.seatsForMe)) return out;

    // EVERY SEAT THE SAVED LOCATION RESOLVED, in the resolver's own order, from
    // the module that resolved them. Nothing here composes a district name out
    // of anything this reader did not save: no county table, no geometry, no
    // label corpus, no chamber list. No seats is the unverified standing, which
    // is the honest answer for a location this app cannot name a seat in.
    var seats = [];
    try { seats = V.seatsForMe() || []; } catch (e3) { seats = []; }
    if (!seats.length) return out;

    out.standing = 'verified';
    out.seats = seats.map(function (s) {
      return {
        name: String((s && s.name) || ''),
        board: !!(s && s.board)
      };
    }).filter(function (s) { return !!s.name; });
    if (!out.seats.length) { out.standing = 'unverified'; out.seats = []; return out; }

    // ONE CONTROL, AND IT GOES TO THE HALLWAY, NOT TO A BOARD. This desk does
    // not pick one of this reader's seats to be "theirs" — /voice lists all of
    // them and each card carries its own door, so the destination is the same
    // whether or not any one seat has a board. The address needs no seat in its
    // path because it resolves the seats the same way this function just did,
    // out of this reader's own saved location, through this same module.
    out.href = '/voice';
    return out;
  }

  // ── WHETHER WE CAN HONESTLY CLAIM A BALLOT AT ALL ─────────────────────────
  // THIS IS A LOCATION GATE, AND IT IS THE ONLY GATE REGION d NEEDS.
  //
  // Region d is /ballot's RAIL — one line per seat, office and current pick —
  // and ballot-workspace.js's rail is ungated: railHtml() maps over the whole
  // slate and prints pickedFor(seat) for every row, picked or not. The gate in
  // that file (fieldGate) governs something else entirely: whether the OPENED
  // seat may show a field of candidates to choose between. There is no field on
  // this document, nothing here can make a pick, and so there is nothing for a
  // field gate to protect.
  //
  // THAT IS ALSO WHY THE COUNTS AGREE. A snapshot gated more tightly than the
  // rail would quietly disagree with the desk — /me saying "your district is not
  // mapped" over a seat /ballot lists and works fine. The seat list is the
  // slate, on both documents, from the same TEAM_POSITIONS; the count is its
  // length; and the two surfaces cannot drift because neither holds a number.
  //
  // WHAT THE FIELD GATE WOULD HAVE NEEDED, so a later pass does not rediscover
  // it the hard way: its district branch resolves through pdxRepsForMe's levels,
  // which are only populated when keyRacesRelevantData and _pdxVoterBallot are
  // present, and both of those live in ballot-breakdown.js (407 KB) along with
  // the curated race tables they read. Its local branch needs pdxLocalSeatsForMe
  // from compare-hub.js. Carrying either file to decide the wording of a row
  // that shows a name would be the whole homepage arriving to caption a list.
  //
  // SO THERE ARE TWO ANSWERS HERE, and the honest one is the short one:
  //   'nolocation' → we do not know where this reader votes, so we do not know
  //                  which seats they have. The region says exactly that and
  //                  lists nothing, rather than printing a national slate that
  //                  nobody in particular votes on.
  //   'ok'         → located. The slate is this reader's ballot and each seat is
  //                  a row, with their pick on it or an honest blank.
  function gate(seat, r) {
    return (r && r.located) ? 'ok' : 'nolocation';
  }

  // ── THE PICKS ─────────────────────────────────────────────────────────────
  // ONE KEY, READ THE WAY ITS OWNER READS IT. 'politidex_my_team' is the live
  // ballot map and it belongs to the 'team' collection, so it is read through
  // PDXStore — which is what ballot-breakdown.js's _ballotLoad does, and it is
  // the reader every other surface in the app goes through.
  //
  // WHY A READ AND NOT THE MODULE. _ballotLoad lives in ballot-breakdown.js
  // (407 KB) and the picked-for-a-seat helper on top of it lives in
  // race-sheet.js, which needs the whole record lane. Region d prints an office
  // and a name. The brief's critical path names "pick-store read" for exactly
  // this reason, and it names "do not embed ballot-workspace.js" in the same
  // breath. So this is a read of one key with one documented rule, and the rule
  // is copied from the place that documents it rather than re-derived.
  var BALLOT_KEY = 'politidex_my_team';
  function picks() {
    var st = store();
    if (st && fn(st.read)) {
      try { var v = st.read(BALLOT_KEY, {}); return (v && typeof v === 'object') ? v : {}; } catch (e) {}
    }
    try { var s = localStorage.getItem(BALLOT_KEY); if (s) return JSON.parse(s) || {}; } catch (e2) {}
    return {};
  }
  // THE 'local' RULE, WHICH IS NOT OURS. A local office is stored per-seat under
  // a 'local_<key>' name, so the generic 'local' slot has to accept any of them.
  // This is ballot-workspace.js's pickedFor() fallback, unchanged, and the
  // comment there says why a second copy of the rule is a second chance to get
  // it wrong — which is why this one is a copy and not an interpretation.
  function pickFor(sel, rk) {
    if (sel[rk]) return sel[rk];
    if (rk === 'local') {
      var hit = null;
      Object.keys(sel).forEach(function (k) { if (!hit && k.indexOf('local') === 0) hit = sel[k]; });
      return hit;
    }
    return null;
  }

  // ── A PERSON'S NAME AND FACE ──────────────────────────────────────────────
  // THE GATE IS THE PID, NOT THE DISPLAY RECORD — the rule who-represents-me.js
  // and voter-hub-location.js both state. A pick is a pid this reader chose; if
  // the roster has not merged their display record on this frame, the honest row
  // is the id with a working link to their file, never a sentence that reads as
  // "nobody".
  function personOf(pid) {
    if (!pid) return null;
    try { if (fn(window._pdxPersonById)) return window._pdxPersonById(pid) || null; } catch (e) {}
    try { if (window.CMP_DATA && window.CMP_DATA[pid]) return window.CMP_DATA[pid]; } catch (e2) {}
    try { if (window.PROFILES && window.PROFILES[pid]) return window.PROFILES[pid]; } catch (e3) {}
    return null;
  }
  function nameOf(pid) {
    var p = personOf(pid);
    return (p && p.name) || pid || '';
  }
  // The same three tiers ballot-breakdown.js's _getPhotoUrl reads, in the same
  // order, without its alias hop chain — that chain resolves a person filed
  // under two ids, and it belongs to the file that owns the alias tables. A face
  // we cannot find is the 🏛 glyph, which is what every other surface prints for
  // the same miss. The real resolver is preferred whenever a document carries it
  // so there is one owner of this question wherever there can be.
  function faceOf(pid) {
    if (!pid) return '';
    try { if (fn(window._getPhotoUrl)) return window._getPhotoUrl(pid) || ''; } catch (e) {}
    try {
      var pr = window.PROFILES && window.PROFILES[pid];
      if (pr && pr.photo && String(pr.photo).trim()) return pr.photo;
    } catch (e2) {}
    try {
      var d = window.CMP_DATA && window.CMP_DATA[pid];
      if (d && d.photo && String(d.photo).trim()) return d.photo;
    } catch (e3) {}
    try {
      if (window.BROWSE_PHOTOS && window.BROWSE_PHOTOS[pid]) return window.BROWSE_PHOTOS[pid];
    } catch (e4) {}
    return '';
  }
  // The advertised address, through the one table that owns which id a retired
  // alias is filed under, so this desk and the record agree on a person's URL.
  function personHref(pid) {
    try {
      var PL = window.PDXPersonLink;
      if (PL && fn(PL.href)) { var h = PL.href(pid); if (h) return h; }
    } catch (e) {}
    return pid ? '/p/' + encodeURIComponent(String(pid)) : '';
  }
  function personAnchor(pid, label) {
    try {
      var PL = window.PDXPersonLink;
      if (PL && fn(PL.anchor)) return PL.anchor(pid, label);
    } catch (e) {}
    var h = personHref(pid);
    return h ? '<a href="' + esc(h) + '">' + esc(label) + '</a>' : esc(label);
  }

  // ── THE STARS ─────────────────────────────────────────────────────────────
  // "Starred" IS My Stances' High priority, and it is read through the SAME hook
  // the match engine weights with — window._msPriorityWeight, weight above 1.
  // race-sheet.js defines a starred issue in exactly that one line, and reading
  // it any other way (the raw record's .priority, a second table) is how a star
  // on this page and a star in the ranking come to mean different things.
  //
  // ISSUE_MAP IS NOT REBUILT. The list comes from PDXStances.all(), which has
  // already dropped issues that no longer exist in the register and answers that
  // were deleted after they were last edited; the label comes from ISSUE_MAP.
  // This file holds no issue vocabulary of its own.
  function stars() {
    var out = [];
    try {
      var MS = window.PDXStances;
      if (!MS || !fn(MS.all)) return out;
      var w = fn(window._msPriorityWeight) ? window._msPriorityWeight : null;
      var IM = (window.ISSUE_MAP && typeof window.ISSUE_MAP === 'object') ? window.ISSUE_MAP : {};
      (MS.all() || []).forEach(function (rec) {
        if (!rec || !rec.issueKey) return;
        var heavy = w ? (w(rec.issueKey) > 1) : (rec.priority === 'high');
        if (!heavy) return;
        out.push({ key: rec.issueKey, label: (IM[rec.issueKey] && IM[rec.issueKey].label) || rec.issueKey });
      });
    } catch (e) {}
    return out;
  }

  // ── THE SAVED CARDS ───────────────────────────────────────────────────────
  // THE STORE ALREADY EXISTED, so this lists it. window.PDXSaved is the personal
  // collection the All-Seeing Eye and the receipt cards write into, and a saved
  // receipt carries polId and issueKey on the item itself — which is why a link
  // back to the record it came from is DERIVED here rather than stored: a
  // receipt with both becomes /p/<pid>?issue=<key>, the canonical card address
  // person-file.js documents, and one with only a pid becomes /p/<pid>.
  //
  // NO LOCKER IS INVENTED. An item this document cannot address is not given a
  // fake one and is not silently dropped either — it is listed with its own
  // title and no link, because it IS in this reader's collection and a desk that
  // hid it would be lying about what the account holds.
  function savedCards() {
    var out = [];
    try {
      var S = window.PDXSaved;
      if (!S || !fn(S.list)) return out;
      (S.list() || []).forEach(function (it) {
        if (!it) return;
        var pid = it.polId || (it.nav && it.nav.polId) || '';
        var ik = it.issueKey || (it.nav && it.nav.issueKey) || '';
        var to = '';
        if (pid) {
          to = personHref(pid);
          if (to && ik) to += '?issue=' + encodeURIComponent(String(ik));
        }
        out.push({
          // THE TYPE TRAVELS WITH THE CARD. The store already separates a
          // receipt from an issue from a spotlight, and region e now prints
          // those as three named groups rather than one undifferentiated list —
          // so the type is carried, not re-derived from the title.
          type: String(it.type || ''),
          tags: Array.isArray(it.tags) ? it.tags.filter(Boolean).map(String) : [],
          title: it.title || it.polName || it.key || 'Saved item',
          sub: it.sub || it.polSub || it.sourceLabel || it.topic || '',
          icon: it.icon || '\u{1F4CE}',
          href: to
        });
      });
    } catch (e) {}
    return out;
  }

  // ── COUNT SENTENCES, WHICH ARE SENTENCES ──────────────────────────────────
  // Every one of these is "N of M" or "N thing" in words. There is no ratio, no
  // percentage and no bar anywhere on this document — see the header, and see
  // me-desk.css, which gives a later edit nowhere to put one.
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ── THE HONEST EMPTY ──────────────────────────────────────────────────────
  function empty(text) { return '<p class="me-empty">' + text + '</p>'; }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE REGIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── a · WHO THIS IS ───────────────────────────────────────────────────────
  function regionIdentity() {
    var u = member();
    var body;
    if (u) {
      var nm = displayNameOf(u);
      var initial = esc(String(nm).charAt(0).toUpperCase());
      var face = u.photoURL
        ? '<span class="me-avatar"><img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer" loading="lazy" /></span>'
        : '<span class="me-avatar" aria-hidden="true">' + initial + '</span>';
      body = '<div class="me-id">' + face +
        '<span class="me-idtext">' +
          '<span class="me-name">' + esc(nm) + '</span>' +
          '<span class="me-mail">' + esc(u.email || 'Signed in') + '</span>' +
        '</span>' +
        // THE ONE WAY OUT, ON THE ONE PAGE ABOUT THIS ACCOUNT. See signOut().
        '<button type="button" class="me-signout" data-me-signout="1">Log out</button>' +
      '</div>';
    } else {
      // SIGNED OUT SAYS SO. It does not print a name, it does not print a
      // placeholder account, and the regions below it do not invent answers for
      // a reader they have never met.
      body = '<div class="me-id">' +
        '<span class="me-avatar" aria-hidden="true">\u{1F464}</span>' +
        '<span class="me-idtext">' +
          '<span class="me-name">Not signed in</span>' +
          '<span class="me-mail">Your file lives in this browser until you do.</span>' +
        '</span></div>' +
        '<p class="me-where"><button type="button" class="me-link" data-me-signin="1">Sign in</button>' +
        ' to keep it on your account and read it on another device.</p>';
    }

    // THE PLACE, THEN EVERY DISTRICT IT RESOLVES. `p.detail` is deliberately
    // NOT printed here any more: it is _voterLocationLabel's single "District 2"
    // — one unlabelled number for a voter who is in four districts at once —
    // and the labelled list below says all of it, including the rows we do not
    // hold. See districts().
    var p = place();
    var rows = districts();
    var where = p.located && p.label
      ? '<p class="me-where">Your ballot is built for <strong>' + esc(p.label) + '</strong>. ' +
          '<button type="button" class="me-link" data-me-loc="1">' + esc(locLabel(rows)) + '</button></p>' +
          districtsHtml(rows)
      : '<p class="me-where">We do not know where you vote yet, so the seats below are the ones we cannot resolve. ' +
          '<button type="button" class="me-link" data-me-loc="1">' + esc(LOC_SET) + '</button></p>';

    return '<section class="me-region" id="me-identity" aria-labelledby="me-identity-t">' +
      '<div class="me-rhead"><h2 class="me-rtitle" id="me-identity-t">This account</h2></div>' +
      body + where +
    '</section>';
  }

  // ── b · POSITIONS ─────────────────────────────────────────────────────────
  // WHAT WAS WRONG. This region opened with the whole editor: every row of it,
  // four controls each, painted identically for a reader who had answered them
  // all and for one who had never been here. A
  // desk is a thing you READ — "here is what you told us" — and the first thing
  // on it was a form. Worse, the form was the tallest block on the page for the
  // reader who had least reason to care about it, because the empty state and
  // the full state were the same shape.
  //
  // WHAT IT IS NOW. A SNAPSHOT AND ONE DOOR.
  //
  //   · ONE OR MORE ANSWERS ON FILE → only those keys are listed, each as one
  //     chip carrying the issue and THE SIDE THIS READER CHOSE. Not the four
  //     options; the one they picked. The face is capped at SNAP_CAP so a
  //     reader who has answered forty gets a snapshot rather than a list, and
  //     the leftover is counted in words on the door beside it.
  //   · NOTHING ON FILE → ONE SENTENCE AND ONE DOOR, AND NO CHIPS AT ALL.
  //     There used to be three dashed starter chips here. They are gone: see
  //     the long note in regionPositions() for why a chip that carries no side
  //     sitting in the row where every other chip does was the defect, not the
  //     invitation.
  //   · EITHER WAY, ONE DOOR, AND IT IS AN ADDRESS. "Set all issues" is a
  //     LINK TO /my-stances. It used to mount your-file.js inline into a host
  //     below this snapshot, and that was one editor too many: /my-stances is
  //     now the stance studio — it teaches the vocabulary on a first visit and
  //     is the library on every one after — so a second copy of the setter
  //     living under the account desk gave the same job two surfaces, two
  //     empty states and two first-run stories. This region reads; that
  //     document writes. Same store either way (see 1 below).
  //
  // WHAT IT STILL IS NOT:
  //
  //   1. NOT A SECOND STORE. Every side printed below comes out of
  //      PDXYourFile.position() — the accessor the alignment read itself uses.
  //      This region writes nothing at all; the door hands the reader to
  //      /my-stances and the studio there writes, into the one stance store
  //      both surfaces already read.
  //   2. NOT A SCORE, AND NOT AGAINST A STARTER OCTET. "2 of 121 set" is the
  //      length of the answered list over the length of THE VOCABULARY THE
  //      SETTER OFFERS — PDXYourFile.KEYS, which that module derives from
  //      ISSUE_MAP grouped by CORE_NATIONAL_ISSUES. Positions are held against
  //      the issue register, so the register is the denominator; this file
  //      writes no number of its own down and cannot. No ratio, no bar, no
  //      percentage, and the count sentence's single author is still the
  //      editor's own countSentence() wherever the editor is on screen.
  //   3. NOT A VOTE. The line under the heading is the editor's OWN COPY.line,
  //      read off the module rather than paraphrased here, so "Not a vote. Not
  //      a district poll." cannot be reworded on one surface and not the other.
  //   4. NOT A COLOUR OF ITS OWN. A chip's colour is PDXIssueColors' answer for
  //      that key, taken through skin() — the same data-ic + --pdx-ic pair a
  //      bill letterhead uses. A key the colour system does not recognise gets
  //      NO attribute and reads as unthemed steel, which is the honest outcome:
  //      a whole region of neutral chips means "these are not core issues",
  //      never "the colour system is off".
  var SNAP_CAP = 6;

  function yf() { try { return window.PDXYourFile || null; } catch (e) { return null; } }
  function yfKeys() {
    var Y = yf();
    return (Y && Array.isArray(Y.KEYS)) ? Y.KEYS.slice() : [];
  }
  // ── THE SIDES, THROUGH THE ONE READER ─────────────────────────────────────
  // THIS REGION WAS THE THIRD READER, AND IT WAS THE ONE THAT WENT BLANK.
  //
  // It used to ask PDXYourFile.answered() + .position(). That accessor is
  // honest about its own store — pdx_your_file_v1, the setter's key — and it is
  // not the store the stance studio writes. So a reader who set three
  // positions on /my-stances had three sides in the studio, three on /ballot's
  // rank axis, and NONE here: this heading said "Your positions" and the body
  // under it said "Nothing on file yet." Nothing threw, nothing logged, and
  // both modules were internally correct. There were simply three readers.
  //
  // There is one now, in stance-sides.js, and every surface that prints a side
  // asks it: the studio's library, this region, and race-sheet.js's rank axis.
  // It reads PDXStances — the studio's own store — and merges the alignment
  // signature, which is where an answer given in the older Your File editor or
  // in the Alignment Tool itself lands. So a position set anywhere shows up
  // here, and a position set nowhere does not.
  //
  // LOCAL FIRST, WHICH IS WHY A SIGNED-IN READER NEVER MEETS THE EMPTY
  // SENTENCE WHILE HOLDING SIDES. PDXStances reads through PDXStore, which
  // returns the local snapshot synchronously and merges the account pull into
  // it afterwards, announcing itself with 'pdx-stances-change' — an event this
  // desk already re-paints on (see the listener at the foot of this file). A
  // write made a moment ago is on screen on the next paint, before any network
  // has answered; a file arriving from another device lands when the pull does.
  // Nothing on this path waits for a server before it is willing to say what
  // the reader holds.
  //
  // NO STORE IS ADDED AND NONE IS MERGED HERE. This region still writes
  // nothing at all; it reads one list and prints it.
  function positions() {
    var S = null;
    try { S = window.PDXStanceSides; } catch (e) { S = null; }
    if (!S || !fn(S.list)) return [];
    var rows = [];
    try { rows = S.list() || []; } catch (e2) { rows = []; }
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].key && rows[i].position) out.push({ key: rows[i].key, pos: rows[i].position });
    }
    return out;
  }
  // The side's label, off the one reader's own table. A side it cannot name is
  // not printed as a raw slug: the chip falls back to the key alone, because
  // "housing · mixed" is vocabulary and "housing · oppose_maybe" is a leak.
  function sideLabel(pos) {
    try {
      var S = window.PDXStanceSides;
      if (S && fn(S.label)) return S.label(pos) || '';
    } catch (e) {}
    return '';
  }
  // THE ISSUE'S OWN LABEL, off the register every other surface reads. An
  // unregistered key prints as itself rather than as a blank chip.
  function issueLabel(k) {
    try {
      var IM = (window.ISSUE_MAP && typeof window.ISSUE_MAP === 'object') ? window.ISSUE_MAP : {};
      var r = IM[k];
      if (r && r.label) return String(r.label);
    } catch (e) {}
    return String(k || '');
  }
  // ── THE ISSUE'S OWN COLOUR, BORROWED AND NEVER INVENTED ───────────────────
  // Spelled exactly as district-voice.js spells it on this same document, which
  // is the point: PDXIssueColors.skin() hands back the whole
  // ` data-ic="on" style="--pdx-ic:…"` fragment, and an unresolved key gets an
  // EMPTY fragment by that module's own design. A COLOUR IS NOT A VERDICT — it
  // says "this is the housing chip", never "this answer is right" — and nothing
  // downstream reads it.
  function icAttr(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || !fn(C.skin)) return '';
      var sk = C.skin(String(key == null ? '' : key), window.PDXIssueFamily);
      return (sk && sk.attr) ? String(sk.attr) : '';
    } catch (e) { return ''; }
  }

  // A chip is a LABEL, not a control: it carries what the reader said and it
  // does not offer to change it. The one thing that changes an answer on this
  // page is the door below, which is the editor.
  function posChip(k, pos) {
    var side = sideLabel(pos);
    return '<li class="me-pchip"' + icAttr(k) + '>' +
      '<span class="me-pchip-l">' + esc(issueLabel(k)) + '</span>' +
      (side ? '<span class="me-pchip-s">' + esc(side) + '</span>' : '') +
    '</li>';
  }
  // THE DOOR, AND IT IS AN ADDRESS RATHER THAN A MOUNT.
  //
  // An <a href="/my-stances">, not a button that grows an editor underneath
  // this snapshot. Three reasons, in the order they matter:
  //   · ONE EDITOR. /my-stances is the stance studio. A second setter mounted
  //     here would have its own empty state, its own first-run and its own
  //     idea of what "nothing on file" should say, and the two would drift.
  //   · THE READER CAN GET BACK. A real address is bookmarkable, shareable and
  //     reachable from the six other surfaces that already point at it; an
  //     inline mount existed only for as long as this paint did.
  //   · IT COSTS THIS DOCUMENT NOTHING. The editor's weight now loads on the
  //     document that is only the editor.
  // data-me-setall stays on it so the suite can still find the one door by the
  // attribute it has always been found by, and so nothing that reads "is there
  // exactly one way out of this region" has to learn a new selector.
  function setAllDoor(extra) {
    return '<p class="me-pgo">' +
      '<a class="me-door" data-me-setall="1" href="/my-stances">Set all issues &rarr;</a>' +
      (extra ? '<span class="me-pmore">' + esc(extra) + '</span>' : '') +
    '</p>';
  }

  function regionPositions() {
    var list = positions();
    var own = yfKeys();
    var body;
    var extra = '';

    if (list.length) {
      var face = list.slice(0, SNAP_CAP);
      var left = list.length - face.length;
      body = '<ul class="me-pchips">' + face.map(function (r) {
        return posChip(r.key, r.pos);
      }).join('') + '</ul>';
      if (left > 0) extra = left + ' more';
    } else {
      // THE HONEST EMPTY, AND IT DRAWS NO CHIPS AT ALL.
      //
      // WHAT USED TO BE HERE: three issue names in the same chip row shape as a
      // real position, dashed, above the words "Nothing on file yet." Two
      // things were wrong with it and the second is the serious one.
      //   · A CHIP IN THIS ROW MEANS "A SIDE YOU HOLD". Every other chip on
      //     this desk carries a position. Three that carried none sat in the
      //     identical row, in the issue's own colour, directly under a sentence
      //     saying nothing was on file — so the row and the sentence
      //     contradicted each other, and the row is the louder of the two.
      //   · THEY WERE NOT CONTROLS. They were <li> elements with no handler, so
      //     a reader who read them as "tap to set this" — which is the only
      //     thing that shape can mean — tapped three times on nothing.
      // A file with nothing in it should say so in words and offer one door,
      // which is the setAllDoor() below. That is the whole of the honest empty.
      body = '<p class="me-rline">Nothing on file yet. ' +
        'Pick an issue and say where you stand \u2014 it takes one tap, and every ' +
        'seat on your ballot is read against it afterwards.</p>';
    }

    // THE DENOMINATOR IS THE VOCABULARY, MEASURED, AND IT IS NOT A NUMBER THIS
    // FILE KNOWS. own.length is PDXYourFile.KEYS.length — the keys the stance
    // setter actually offers, which that module derives from ISSUE_MAP and the
    // CORE_NATIONAL_ISSUES families at runtime. There is no literal anywhere on
    // this path: numerator and denominator are both lengths of lists read off
    // the same owner, so a key added to the register moves both without an edit
    // here. On a document where the editor has not parsed, own.length is 0 and
    // no count is printed at all — a count with a made-up denominator would be
    // the defect this replaced.
    var count = (own.length && list.length)
      ? esc(list.length + ' of ' + own.length + ' set')
      : '';

    return '<section class="me-region" id="me-positions" aria-labelledby="me-positions-t">' +
      '<div class="me-rhead">' +
        '<h2 class="me-rtitle" id="me-positions-t">Your positions</h2>' +
        (count ? '<span class="me-rcount">' + count + '</span>' : '') +
      '</div>' +
      '<p class="me-rline">' + esc(posLine()) + '</p>' +
      body +
      setAllDoor(extra) +
    '</section>';
  }

  // THE LINE IS THE EDITOR'S OWN. Read off PDXYourFile.COPY so "Not a vote. Not
  // a district poll." has one author; the literal below is the fallback for a
  // document where the module has not parsed, and it is the same sentence.
  function posLine() {
    var Y = yf();
    try {
      if (Y && Y.COPY && Y.COPY.line) return String(Y.COPY.line);
    } catch (e) {}
    return 'Your positions. Used to compare formal records. Not a vote. Not a district poll.';
  }

  // ── c · STARRED ───────────────────────────────────────────────────────────
  function regionStars() {
    var list = stars();
    var body = list.length
      ? '<ul class="me-stars">' + list.map(function (s) {
          return '<li class="me-star"><span class="me-starico" aria-hidden="true">⭐</span>' +
            esc(s.label) + '</li>';
        }).join('') + '</ul>'
      : empty('Nothing starred yet. A star tells the comparison to weigh that issue harder — ' +
          'it is a weight, not a vote, and it changes no record.');
    return '<section class="me-region" id="me-stars" aria-labelledby="me-stars-t">' +
      '<div class="me-rhead">' +
        '<h2 class="me-rtitle" id="me-stars-t">Issues you rank harder</h2>' +
        '<span class="me-rcount">' + esc(plural(list.length, 'starred', 'starred')) + '</span>' +
      '</div>' +
      body +
      '<p class="me-rline" style="margin:0.7rem 0 0;">' +
        '<a class="me-link" href="/my-stances">Add or remove a star in your stances</a>' +
      '</p>' +
    '</section>';
  }

  // ── d · BALLOT SNAPSHOT ───────────────────────────────────────────────────
  // WHO ALREADY HOLDS THE SEAT, AND THEN THE PICK.
  //
  // WHAT WAS WRONG. Six rows, each an office and the word "No pick". A reader
  // who had never opened /ballot got a column of blanks — a to-do list from a
  // desk that already knew, for most of those seats, who is in the chair right
  // now. The one thing a voter wants from a ballot they have not worked yet is
  // the incumbent, and we were withholding it to make room for an absence.
  //
  // SO EACH ROW LEADS WITH THE OFFICEHOLDER. The name comes from
  // pdxSeatHolders(seat) — voter-hub-location.js's one owner of "who holds this
  // seat", which answers from pdxRepsForMe()'s own levels — and it is printed
  // as a link to that person's /p/<pid> record. NO NAME IS GUESSED: the seat
  // either resolved a pid or the row says "No officeholder on file". Two pids
  // on a U.S. Senate row is not a defect, it is the Senate: both are named.
  //
  // WHAT RESOLVES HERE AND WHAT DOES NOT, stated so a later pass does not read
  // the blanks as a bug. The statewide seats (both U.S. Senate seats, Governor)
  // resolve from the state ROSTER, which this document does have — not the
  // bundled one (cmp-data.js is not on /me, and me.html's PROFILES-into-CMP_DATA
  // merge is gated on a global that document never creates) but the LIVE
  // Firestore index in window.PROFILES, which the resolver now reads as the
  // roster wherever the bundle is absent. It arrives after the first paint, so
  // this block subscribes to its arrival and repaints (see seamRoster) and says
  // "Still loading seats…" until then rather than printing a coverage admission
  // it has no grounds for yet. The district seats (U.S. House, State Senate,
  // State House) resolve from the curated ballot in ballot-breakdown.js
  // (407 KB), which this document deliberately does not carry, so they come back
  // with no pid and the row says so. The local slot has no level at all. That is
  // an honest gap in one direction only: /me can under-name a seat and never
  // mis-name one.
  //
  // AND THE PICK IS STILL THE READER'S. It prints UNDER the incumbent, prefixed
  // "Your pick:", and it is printed whether or not it equals the incumbent —
  // re-electing the person in the chair is a pick, and a desk that hid it would
  // be reading the reader's ballot back to them wrong.
  //
  // THIS IS STILL NOT A SECOND BALLOT AND NOT "THE COMPLETE BALLOT". No
  // challenger is pulled onto this document, no field is listed, nothing here
  // can make a pick, and the one control on the row is the same
  // /ballot?seat=<key> link it always was. The count is unchanged: picks over
  // the seats on this reader's own slate.
  function holdersFor(seatKey) {
    try {
      if (!fn(window.pdxSeatHolders)) return { ok: false, pids: [], rosterCold: false };
      var h = window.pdxSeatHolders(seatKey);
      return (h && h.pids) ? h : { ok: false, pids: [], rosterCold: false };
    } catch (e) { return { ok: false, pids: [], rosterCold: false }; }
  }
  var HOLD_NONE = 'No officeholder on file';
  var HOLD_WAIT = 'Still loading seats\u2026';
  // THREE STATES, THREE SENTENCES, AND THE ROW NEVER GUESSES WHICH IT IS IN.
  //
  //   · the roster this document resolves seats from has not arrived → "Still
  //     loading seats…". This is the state that shipped wrong: /me carries no
  //     bundled roster, so before Firestore answers there is no index to walk,
  //     and the row was printing a coverage admission over people the product
  //     holds full files for. A wait is not an absence.
  //   · the roster is here and this seat resolved nobody → "No officeholder on
  //     file". The honest empty, unchanged, and the only one of the three that
  //     is a claim about our coverage.
  //   · the roster is here and the seat resolved N people → the N names, each a
  //     door to /p/<pid>. Two on a U.S. Senate row is the Senate, not a defect.
  //
  // WHICH STATE IT IS IN IS THE RESOLVER'S ANSWER, NOT THIS FILE'S GUESS.
  // pdxSeatHolders() carries rosterCold on every reply it makes, including the
  // ones that carry no pids, so the desk reads the wait off the one owner of
  // "who holds this seat" instead of second-guessing it from a roster global it
  // would then be the second reader of.
  function holdsLine(h) {
    var pids = (h && h.pids) || [];
    if (!pids.length) {
      return (h && h.rosterCold)
        ? '<span class="me-holds me-holds--wait">' + esc(HOLD_WAIT) + '</span>'
        : '<span class="me-holds me-holds--none">' + esc(HOLD_NONE) + '</span>';
    }
    return '<span class="me-holds">' + pids.map(function (pid) {
      return personAnchor(pid, nameOf(pid));
    }).join('<span class="me-holdsep">, </span>') + '</span>';
  }

  function regionBallot() {
    var list = seats();
    var r = reps();
    var sel = picks();
    var rows = [];
    var workable = 0;
    var picked = 0;

    list.forEach(function (s) {
      var g = gate(s, r);
      if (g !== 'ok') return;   // unplaceable reader — the region head says so
      var pid = pickFor(sel, s.key);
      workable++;
      if (pid) picked++;

      var hold = holdersFor(s.key);
      var held = hold.pids || [];

      // THE FACE BELONGS TO WHOEVER THE ROW LEADS WITH, and the row leads with
      // the officeholder. One holder → their portrait. Two (the Senate) → the
      // seat glyph, because a row about two people cannot wear one of their
      // faces. No holder → the pick's portrait if there is a pick, and the seat
      // glyph otherwise.
      var facePid = (held.length === 1) ? held[0] : (held.length ? '' : (pid || ''));
      var ph = facePid ? faceOf(facePid) : '';
      var face = ph
        ? '<span class="me-face"><img src="' + esc(ph) + '" alt="" loading="lazy" /></span>'
        : (facePid
            ? '<span class="me-face" aria-hidden="true">\u{1F3DB}</span>'
            : '<span class="me-seatico" aria-hidden="true">' + s.icon + '</span>');

      // The incumbent, then the pick beneath it when there is one. A pick that
      // names the incumbent is printed all the same.
      var line = holdsLine(hold) +
        (pid
          ? '<span class="me-pick"><span class="me-picklb">Your pick:</span> ' +
              personAnchor(pid, nameOf(pid)) + '</span>'
          : '');

      // WORK THIS SEAT IS A REAL ADDRESS. /ballot?seat=<key> — the desk reads
      // ?seat= itself and opens that seat, and it only honours a key that is on
      // THIS voter's own slate, so a stale or hand-typed link cannot open
      // somebody else's seat. The desk is also where the field gate lives, so a
      // seat we cannot resolve a field for explains itself THERE, in the one
      // place that holds the data to say why.
      var cta = '<a class="me-work" href="/ballot?seat=' + encodeURIComponent(s.key) + '">' +
        (pid ? 'Change' : 'Work seat') + '</a>';

      rows.push('<li class="me-seat">' + face +
        '<span class="me-seattext">' +
          '<span class="me-office">' + esc(s.label) + '</span>' + line +
        '</span>' + cta + '</li>');
    });

    // THE COUNT IS THE LENGTH OF A LIST. The denominator is how many seats this
    // reader's own slate holds — the rows actually printed below, not a figure
    // kept beside them — and the numerator is how many of those hold a pick.
    // Neither is a literal, neither is a percentage, and on a reader we cannot
    // place both are zero and the sentence is not printed at all.
    var count = workable
      ? esc(picked + ' of ' + workable + (workable === 1 ? ' seat picked' : ' seats picked'))
      : '';

    var body = rows.length
      ? '<ul class="me-seats">' + rows.join('') + '</ul>'
      : empty('We cannot resolve a ballot for you yet. ' +
          '<a href="' + esc(finderHref()) + '">Tell us where you vote</a> and the seats we hold ' +
          'will appear here — we would rather show nothing than a slate you do not vote on.');

    return '<section class="me-region" id="me-ballot" aria-labelledby="me-ballot-t">' +
      '<div class="me-rhead">' +
        '<h2 class="me-rtitle" id="me-ballot-t">Your ballot</h2>' +
        (count ? '<span class="me-rcount">' + count + '</span>' : '') +
      '</div>' +
      '<p class="me-rline">The seats we can resolve for where you vote, and who you have picked so far. ' +
        'This is not an official ballot.</p>' +
      body +
      '<p class="me-rline" style="margin:0.7rem 0 0;"><a class="me-link" href="/ballot">Open the ballot workspace</a></p>' +
    '</section>';
  }

  // ── e · SAVED WORK ────────────────────────────────────────────────────────
  // THIS REGION ABSORBED THE HOMEPAGE'S RESEARCH DESK. Two surfaces used to
  // read the same store a few thousand lines apart on `/`: My Saved (a
  // four-tab workspace) and Evidence For My Vote (a ballot cross-reference).
  // Neither was the homepage's job, both were tall before a reader had saved
  // anything, and both were about THIS reader — so they are one region here,
  // and `/` keeps a card that counts and points.
  //
  // WHAT IT OWNS. Saved receipts, saved issues and spotlights, the politicians
  // this reader follows, and the counts of those three. Same store, same
  // items, new address.
  //
  // WHAT IT STILL DOES NOT OWN, and the list is the reason it is short:
  //
  //   1. NOT THE OFFICIAL BALLOT. Region d prints the slate. This region holds
  //      no seat, no pick and no denominator, and its one link to Door 2 is a
  //      link — "Work the ballot" is a jump to /ballot, not a second ballot.
  //   2. NOT THE LOCKER GRID. A saved receipt is a title, a context line and a
  //      link back to the record it came from. No stance pill is recomputed, no
  //      filter grid is built, nothing is re-ranked. /evidence is the locker.
  //   3. NO EDITOR. The four-tab module let a reader retag, renote, regroup and
  //      unsave in place. This lists. PDXSaved.setNote / setTags are not called
  //      from here, so nothing on this page can disagree with the store.
  //   4. NO SCORE AND NO ORDER OF MERIT. Newest first, which is PDXSaved.list()'s
  //      own order. No count is turned into a ratio, a percentage or a bar —
  //      see plural() above and me-desk.css, which give a later edit nowhere to
  //      put one.
  //   5. NOTHING ABOUT A JUDGE. Retention is /courts', and a saved item that
  //      happens to name a judge is listed as what it is — a saved item.
  //
  // THE TAG ARRIVES IN THE URL. all-seeing-eye.js asks to open a reader's
  // evidence filtered to one tag, and the homepage module it used to ask
  // answers by navigating here with ?tag=<tag>. Honouring it is how the move
  // stays a move: the alternative is a gesture that silently drops its own
  // argument. An unknown tag is not an error — the filter simply matches
  // nothing, says so, and offers the way back to everything.
  var TAG_RE = /[?&]tag=([^&]*)/;
  function tagOf(search) {
    var m = String(search == null ? '' : search).match(TAG_RE);
    if (!m) return '';
    var t = '';
    try { t = decodeURIComponent(m[1] || ''); } catch (e) { t = String(m[1] || ''); }
    return t.trim().toLowerCase().slice(0, 60);
  }
  function hasTag(c, t) {
    if (!t) return true;
    for (var i = 0; i < c.tags.length; i++) {
      if (String(c.tags[i]).trim().toLowerCase() === t) return true;
    }
    return false;
  }

  // THE FOLLOWED ROSTER, READ THE WAY EVERY OTHER SURFACE READS IT. Preferred
  // through the PDXTeamView adapter when that module is on the page, and
  // otherwise straight off the one legacy key — which me.html registers with
  // PDXStore, so it syncs with the rest of the account. This is a read of one
  // key, like picks() above, for the same stated reason.
  var ROSTER_KEY = 'politidex_my_politicians';
  function roster() {
    try {
      var v = window.PDXTeamView;
      if (v && fn(v.roster)) {
        var r = v.roster();
        if (Array.isArray(r)) return r.filter(Boolean).map(String);
      }
    } catch (e) {}
    var st = store();
    if (st && fn(st.read)) {
      try { var a = st.read(ROSTER_KEY, []); if (Array.isArray(a)) return a.filter(Boolean).map(String); } catch (e2) {}
    }
    try {
      var s2 = localStorage.getItem(ROSTER_KEY);
      var b = s2 ? JSON.parse(s2) : [];
      return Array.isArray(b) ? b.filter(Boolean).map(String) : [];
    } catch (e3) { return []; }
  }
  // A followed politician as a card. THE GATE IS THE PID, not the display
  // record — personOf() may not have merged on this frame, and the honest row
  // is then the id with a working link to their file.
  function rosterCards() {
    return roster().map(function (pid) {
      var pr = personOf(pid);
      return {
        type: 'politician',
        tags: [],
        title: (pr && (pr.name || pr.fullName)) || pid,
        sub: (pr && (pr.office || pr.title)) || '',
        icon: '⭐',
        href: personHref(pid)
      };
    });
  }

  function savedList(c) {
    return '<ul class="me-saved">' + c.map(function (x) {
      var head = x.href
        ? '<a href="' + esc(x.href) + '">' + esc(x.title) + '</a>'
        : esc(x.title);
      return '<li class="me-card">' +
        '<span aria-hidden="true">' + esc(x.icon) + '</span> ' + head +
        (x.sub ? '<span class="me-cardsub">' + esc(x.sub) + '</span>' : '') +
      '</li>';
    }).join('') + '</ul>';
  }
  // A group prints only when it has something in it. An empty group under its
  // own heading reads as a claim that the reader has none of that thing, which
  // is true but is three headings' worth of nothing on a page that already
  // says what is missing in one sentence.
  function savedGroup(id, label, cards) {
    if (!cards.length) return '';
    return '<h3 class="me-gtitle" id="' + id + '">' + esc(label) +
      ' <span class="me-gcount">' + esc(String(cards.length)) + '</span></h3>' +
      savedList(cards);
  }

  function regionSaved() {
    var tag = tagOf(location.search);
    var all = savedCards();
    var pols = rosterCards();
    var receipts = [], issues = [], other = [];
    all.forEach(function (c) {
      if (!hasTag(c, tag)) return;
      if (c.type === 'receipt') receipts.push(c);
      else if (c.type === 'issue' || c.type === 'spotlight') issues.push(c);
      else other.push(c);
    });
    // A tag is a filter on saved items, so it does not filter the roster: a
    // politician is followed, not tagged, and dropping the group would read as
    // "you follow nobody".
    var shown = receipts.length + issues.length + other.length + (tag ? 0 : pols.length);
    var total = all.length + pols.length;

    var body = '';
    if (tag) {
      body += '<p class="me-rline"><strong>Filtered to &ldquo;' + esc(tag) + '&rdquo;.</strong> ' +
        plural(receipts.length + issues.length + other.length, 'saved item carries', 'saved items carry') +
        ' this tag. <a class="me-link" href="/me#me-saved">Show everything saved</a>.</p>';
    }
    body += savedGroup('me-saved-rec', 'Receipts', receipts);
    body += savedGroup('me-saved-iss', 'Issues &amp; Spotlights', issues);
    if (!tag) body += savedGroup('me-saved-pol', 'Politicians you follow', pols);
    body += savedGroup('me-saved-oth', 'Other saved items', other);
    if (!shown) {
      body += tag
        ? empty('Nothing saved carries that tag. Your saved work is all still here — ' +
            'the link above shows it.')
        : empty('Nothing saved yet. When you save a record from a profile, an issue from the ' +
            'library or a politician you want to follow, it is filed here with a link back to ' +
            'the evidence it came from.');
    }

    return '<section class="me-region" id="me-saved" aria-labelledby="me-saved-t">' +
      '<div class="me-rhead">' +
        '<h2 class="me-rtitle" id="me-saved-t">Saved work</h2>' +
        (total ? '<span class="me-rcount">' + esc(plural(total, 'saved', 'saved')) + '</span>' : '') +
      '</div>' +
      '<p class="me-rline">The receipts, issues and politicians you have saved in this account. ' +
        'Nothing here is published and nothing here is a score.</p>' +
      body +
      '<p class="me-rline" style="margin:0.7rem 0 0;"><a class="me-link" href="/ballot">Work the ballot</a>' +
        ' to put this next to the seats you are deciding — the ballot is Door 2’s, and it ' +
        'stays there.</p>' +
    '</section>';
  }

  // ── g · DISTRICT VOICE ────────────────────────────────────────────────────
  // THE PUBLIC LANE'S DOOR, AND ONLY THE DOOR. District Voice is the district
  // board: residency-gated to post, open to everybody to read, and it lives at
  // its own address. This region says which of three standings this reader has
  // with it and offers the one control that standing can honour. It is the
  // smallest thing that can be true.
  //
  // THE SEVEN THINGS IT MUST NOT DO, and every one of them is a rule:
  //
  //   1. IT DOES NOT EMBED THE BOARD. No thread, no take, no poll, no option, no
  //      count, no composer and no feed of bills. There is nothing in this
  //      region a reader could mistake for the board's contents, and a verified
  //      reader with no board yet gets a SENTENCE rather than an empty list that
  //      looks like a board with nothing in it.
  //   2. IT DOES NOT SCORE PARTICIPATION. No posts, no answers, no streak, no
  //      "you have not posted in a while", no activity of any kind. A voter is
  //      not a participation rate, and this region holds no number at all.
  //   3. IT DOES NOT ENTER THE MATCH. Nothing here reads or writes the alignment
  //      store, the stance store, Direction Match, Your Match, the formal
  //      pattern or the ballot order. The board is the public lane; the
  //      answers above it are the private one; this region carries no wire
  //      between them.
  //   4. IT DOES NOT PARTY-GATE AND CARRIES NO PARTY. No letter, no colour, no
  //      caucus, and no class for one to arrive in.
  //   5. IT READS NO FORMAL-RECORD MODULE. No vote pack, no measure, no act, no
  //      /api/voting-record — this document reaches no network at all.
  //   6. IT MERGES NO STORE. pdx_your_file and pdx_my_stances are region b's and
  //      region c's, they stay two stores, and this region touches neither.
  //   7. IT DOES NOT IMPLY A BOARD SOMEBODY DOES NOT HAVE. The badge is printed
  //      for the verified standing and for nothing else, and the unverified
  //      sentence says what is missing rather than inviting a reader into a
  //      place they cannot enter yet.
  //
  // THE CONTROL PER STANDING, and there is exactly one each:
  //
  //   out         the document's existing sign-in, the same button region a
  //               offers, through the same data-me-signin seam.
  //   unverified  a LINK to the address where residency for this lane is
  //               established — the saved ballot district. A link and not a
  //               button, because it is a trip to another address and the reader
  //               is owed the ability to see where it goes, open it in a tab and
  //               copy it.
  //   verified    the seats on file, one line each, and a LINK to the hallway
  //               that owns them. Every line says whether a board is on hand for
  //               that seat, because a list where some rooms open and some do not
  //               has to say which is which on the line itself — a reader who
  //               taps through expecting a door is owed that here.
  //
  // "ON HAND", NEVER "YET". Both strings are district-voice.js's, so the desk
  // and the hallway describe one reader's seat the same way. A board we have not
  // built is not a board that is coming, and "yet" is a promise this app has not
  // made — the same refusal the record makes with "no formal record on file".
  function regionVoice() {
    var v = voice();
    var badge = v.standing === 'verified'
      ? '<span class="me-voicetag">Verified resident</span>'
      : '';
    var V = voiceApi();
    var onHand = 'board on hand';
    var notOnHand = 'board not on hand';
    try {
      if (V && V.COPY && V.COPY.boardNone) {
        // The desk's line is the hallway's sentence in lower case and without
        // its full stop, because it is half of a line and not a sentence of its
        // own. Derived from the one string rather than written twice.
        notOnHand = String(V.COPY.boardNone).replace(/\s*for this seat\.?\s*$/i, '').toLowerCase();
        onHand = notOnHand.replace(/\bnot\s+/, '');
      }
    } catch (e) {}

    var body;
    if (v.standing === 'out') {
      body = '<p class="me-rline">District Voice is for verified residents.</p>' +
        '<p class="me-rline" style="margin:0.7rem 0 0;">' +
          '<button type="button" class="me-link" data-me-signin="1">Sign in</button></p>';
    } else if (v.standing === 'unverified') {
      body = '<p class="me-rline">No seats on file for this account.</p>' +
        '<p class="me-rline" style="margin:0.7rem 0 0;">' +
          '<a class="me-voicecta" href="' + esc(v.finder) + '">Set my location</a></p>';
    } else {
      // ONE BLOCK, ONE LINE PER SEAT. A list, marked up as one, so the count is
      // read before the first item. No card, no person link, no door per row —
      // that is the hallway's job and duplicating it here is how the two
      // documents start telling one reader two things.
      var rows = v.seats.map(function (s) {
        return '<li class="me-voiceseat">' + esc(s.name) +
          ' <span class="me-voicestate">' + esc(s.board ? onHand : notOnHand) + '</span></li>';
      }).join('');
      body = '<p class="me-rline">Seats on file:</p>' +
        '<ul class="me-voiceseats">' + rows + '</ul>' +
        '<p class="me-rline" style="margin:0.7rem 0 0;">' +
          '<a class="me-voicecta" href="' + esc(v.href) + '">Open District Voice</a></p>';
    }

    return '<section class="me-region" id="me-voice" aria-labelledby="me-voice-t">' +
      '<div class="me-rhead">' +
        '<h2 class="me-rtitle" id="me-voice-t">District Voice</h2>' +
        badge +
      '</div>' +
      // The frame sentence is district-voice.js's own, borrowed at runtime. A
      // boot without that module prints no frame rather than a paraphrase.
      (v.frame ? '<p class="me-rline">' + esc(v.frame) + '</p>' : '') +
      body +
    '</section>';
  }

  // ── f · JUMPS ─────────────────────────────────────────────────────────────
  // Three text links in one sentence each. Not a button bar and not a second
  // navigation — see me-desk.css's header.
  function regionJumps() {
    return '<section class="me-region" id="me-jumps" aria-labelledby="me-jumps-t">' +
      '<div class="me-rhead"><h2 class="me-rtitle" id="me-jumps-t">The tools</h2></div>' +
      '<p class="me-jump">' +
        'Compare a field against your positions with the <a href="/#alignment-tool">alignment tool</a>. ' +
        'Look up what someone actually did with <a href="/#compare-hub">Find the Record</a>. ' +
        'Work your seats one at a time in the <a href="/ballot">ballot workspace</a>.' +
      '</p>' +
    '</section>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAINT
  // ═══════════════════════════════════════════════════════════════════════════
  var _painted = false;

  function html() {
    return '<div class="me-head">' +
        '<p class="me-kick">Your file</p>' +
        '<h1 class="me-title">YOUR DESK</h1>' +
        '<p class="me-lede">Everything this account holds, in one place, with the tool that owns ' +
          'each part one tap away. Nothing here is published, nothing here is a score, and no ' +
          'part of it is a verdict on you.</p>' +
      '</div>' +
      regionIdentity() +
      regionPositions() +
      regionStars() +
      regionBallot() +
      regionVoice() +
      regionSaved() +
      regionJumps() +
      '<p class="me-foot">Your positions are yours. They are used to line a formal record up ' +
        'against what you said you wanted, and for nothing else: they are not a vote, not a ' +
        'district poll, and they are never shown to anybody else. PolitiDex publishes no grade ' +
        'for a voter and no grade for a party.</p>';
  }

  // THE WHOLE DESK, AND NOTHING IS PRESERVED ACROSS THE REPAINT.
  //
  // This function used to lift a mounted editor out of region b, replace the
  // rest, and put the editor back — because a location resolving underneath
  // the desk would otherwise have thrown away rows your-file.js was holding
  // mid-tap. There is no editor on this document any more: region b's door is
  // an address to /my-stances, so a repaint here cannot interrupt anybody's
  // half-finished answer and the whole lift-and-replace dance is gone with it.
  function render() {
    var mount = el(MOUNT);
    if (!mount) return;
    try { mount.innerHTML = html(); } catch (e) { return; }
    _painted = true;
    applyTab(false);
  }

  // A repaint that cannot land twice in one frame. Several of the signals below
  // fire together when a location resolves, and the desk is one document.
  var _soon = null;
  function renderSoon() {
    if (_soon) return;
    _soon = setTimeout(function () { _soon = null; render(); }, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE ADDRESS
  // ═══════════════════════════════════════════════════════════════════════════
  function tabOf(search) {
    var m = String(search == null ? '' : search).match(/[?&]tab=([^&]*)/);
    var t = m ? decodeURIComponent(m[1] || '') : '';
    return TABS[t] ? t : '';
  }

  // A tab is a REGION ON THIS PAGE. Landing on one scrolls to it and marks it
  // for one beat; it never hides the others, because they are not tabs in the
  // widget sense and a reader who came for their ballot still has their
  // positions above it.
  function applyTab(smooth) {
    var t = tabOf(location.search);
    var target = t ? el(TABS[t]) : null;
    try {
      var all = document.querySelectorAll('.me-region.is-target');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('is-target');
    } catch (e) {}
    if (!target) return;
    try { target.classList.add('is-target'); } catch (e2) {}
    try {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    } catch (e3) {
      try { target.scrollIntoView(); } catch (e4) {}
    }
  }

  // A JUMP TO A REGION IS A pushState, NOT A replaceState. The brief's rule:
  // Back from a tab stays on /me. pushState leaves an entry on this document, so
  // Back returns the reader to the region they were reading; a replace would
  // consume the entry they arrived on and Back would leave the desk entirely.
  function goTab(t) {
    if (!TABS[t]) return false;
    var to = location.pathname + '?tab=' + encodeURIComponent(t);
    try {
      if (history && fn(history.pushState)) history.pushState({ pdxme: t }, '', to);
      else location.search = '?tab=' + encodeURIComponent(t);
    } catch (e) { return false; }
    applyTab(true);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE SEAMS — four gestures that assumed a homepage underneath them
  // ═══════════════════════════════════════════════════════════════════════════
  // Each one becomes a real navigation here instead of a dead control, which is
  // the same answer ballot.html's shell seams give for the same four functions.
  function away(to) {
    try { location.assign(to); return true; } catch (e) {}
    try { location.href = to; return true; } catch (e2) {}
    try { location.replace(to); return true; } catch (e3) {}
    return false;
  }
  function home(hash) { return away('/' + (hash || '')); }

  // THE FINDER IS A DOCUMENT, SO SETTING A LOCATION IS A TRIP TO IT. It used to
  // be a block inside index.html, which is why the seam below spelled "take them
  // to the question" as "take them home" — the two were one navigation. They are
  // not any more: /find is the picker and nothing else, so a reader who taps "set
  // my location" on the desk gets a document that opens a map instead of an
  // archive homepage that then opens one over itself.
  //
  // The intent rides along, and this file does not spell it: PDXReturn owns the
  // parameter, the allow-list and the encoding, and here() is what makes the save
  // come back to /me rather than to the lane's home. A boot without that module
  // degrades to the bare path.
  function finderHref() {
    try {
      var R = window.PDXReturn;
      if (R && fn(R.finderHref) && fn(R.here)) return R.finderHref(R.here());
    } catch (e) {}
    return '/find';
  }
  function finderTrip() { return away(finderHref()); }

  // SEAM 1 — setting a location is a trip to /find. Both functions behind the
  // homepage's location control open #change-location-form and return early when
  // it is absent, and it IS absent here — and after the finder moved it is absent
  // on the front page too, which is why voter-hub-location.js now navigates in
  // that case on its own. This seam stays as the local statement of where the
  // desk's location control goes, and it goes to the picker's own document
  // carrying next=/me so the save lands the reader back on the desk they were
  // reading. Re-applied on two later beats because voter-hub-location.js is
  // deferred and assigns both names at evaluation.
  function seamLocation() {
    window.toggleChangeLocation = finderTrip;
    window.openLocationModal = finderTrip;
  }

  // SEAM 2 — the location fan-out. voter-hub-location.js calls
  // window._vhBallotRerender() every time it resolves or changes a location (its
  // own _triggerLocationReaction does, and so does its initial load). On the
  // homepage and on /ballot that name belongs to ballot-breakdown.js. It is
  // absent here, so the desk answers it: regions a and d are functions of the
  // location and this is the existing signal that it moved. Nothing is invented
  // and nothing polls.
  function seamRerender() {
    if (!fn(window._vhBallotRerender)) window._vhBallotRerender = renderSoon;
  }

  // ── AND THE REPAINT WHEN THE ROSTER LANDS ─────────────────────────────────
  // The first paint waits for nothing, which is right — but on this document the
  // roster region d names its officeholders from is the LIVE Firestore index,
  // and that arrives after the desk has already painted. Without this the reader
  // keeps whatever the cold read said for the rest of the visit: that is the
  // second half of the reported blank, and it is the same failure the homepage
  // band had before voter-hub-location.js published this subscription.
  //
  // It is a SUBSCRIPTION, not a poll and not a loader. The resolver owns the
  // arrival — it is the module whose own most important input is deferred — and
  // it announces it exactly once, immediately if the roster is already there. The
  // desk's job is to repaint, which render() does without disturbing a setter the
  // reader has open.
  var _rosterHooked = false;
  function seamRoster() {
    if (_rosterHooked) return;
    if (!fn(window.pdxRosterReady)) return;
    _rosterHooked = true;
    try { window.pdxRosterReady(renderSoon); } catch (e) { _rosterHooked = false; }
  }

  // SEAM 3 — a bare '#my-stances' is a trip to /my-stances. It used to be a
  // trip HOME, which was the best answer available while the editor was a
  // homepage section: my-stances.js is loaded here for its store and its
  // priority hook, but the section needed a mount this document does not have,
  // so PDXStances.open() scrolled to nothing and the hash had to be forwarded
  // to the front page. The studio is a document now, so the honest answer is
  // its address — and PDXStances.open() reaches it on its own, which is why
  // this seam is only here to catch the hash being set by something older.
  // '#my-views' goes to the same place: the showcase lives in the every-issue
  // collection on that document.
  function seamStances() {
    window.addEventListener('hashchange', function () {
      var h = location.hash || '';
      if (h === '#my-stances' || h === '#my-views') {
        try { location.assign('/my-stances'); } catch (e) { home('#my-stances'); }
      }
    });
  }

  // ── CLICKS ────────────────────────────────────────────────────────────────
  function signIn() {
    var names = ['openAuthModal', 'openSignInModal', 'showLogin', 'pdxOpenAuth'];
    for (var i = 0; i < names.length; i++) {
      if (fn(window[names[i]])) { try { window[names[i]](); return; } catch (e) {} }
    }
    // No auth UI on this document: the front page owns it, and it owns the
    // return trip too.
    home('#join');
  }

  // ── LEAVING, AND WHY IT LIVES HERE ────────────────────────────────────────
  // The account chip in the chrome used to be a hover dropdown whose third row
  // was "Log Out". The chip is a single control that goes to /me now, so the
  // one door that ended a session went with the dropdown — and an account
  // surface a reader cannot sign out of is not an account surface. This is the
  // same auth object every other control on the page uses; nothing is
  // reimplemented, and a failure is silent rather than a claim that the reader
  // has been signed out when they have not.
  function signOut() {
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth
            : (window.firebase && fn(window.firebase.auth) ? window.firebase.auth() : null);
      if (a && fn(a.signOut)) { a.signOut(); return true; }
    } catch (e) {}
    return false;
  }

  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        if (!ev || ev.defaultPrevented) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
        var t = ev.target;
        if (!t || !t.closest) return;
        if (t.closest('[data-me-signin]')) { ev.preventDefault(); signIn(); return; }
        if (t.closest('[data-me-signout]')) { ev.preventDefault(); signOut(); return; }
        if (t.closest('[data-me-loc]')) { ev.preventDefault(); finderTrip(); return; }
        var tab = t.closest('[data-me-tab]');
        if (tab) {
          var k = tab.getAttribute('data-me-tab') || '';
          if (goTab(k)) ev.preventDefault();
        }
      }, false);
    } catch (e) {}

    // Back and forward between regions. Same document, so this is a scroll and a
    // mark, never a repaint: repainting would throw away the mounted editor for
    // a gesture that did not change a single fact on the page.
    try { window.addEventListener('popstate', function () { applyTab(true); }); } catch (e) {}

    // ── COMING BACK FROM WHERE THE LOCATION IS SET ────────────────────────────
    // Region a's one control is a trip to / (seamLocation), because Who Represents
    // Me is the surface that asks the question. So the reader leaves this document
    // to answer it and then presses Back — and Back is where the reported stale
    // row lived: a bfcache restore runs no script, and even a warm reload had
    // voter-hub-location.js's own store read behind it from before the trip. Either
    // way /me repainted, or did not repaint, from a location record it had already
    // parsed, and a reader who had just watched Who Represents Me name District 6
    // met "needs a district map" on the seat they had this second resolved.
    //
    // ONE EVENT, ONE RE-READ, THE STORE'S OWN READER. pageshow fires on both the
    // fresh load and the bfcache restore, which is exactly the pair this has to
    // cover. loadVoterLocation() is voter-hub-location.js's own parse of its own
    // key — nothing here reads localStorage, so the provenance rule and the
    // resolved-seat restore are applied once, by their owner — and the repaint is
    // the same debounced render every other store signal goes through.
    try {
      window.addEventListener('pageshow', function () {
        try { if (fn(window.loadVoterLocation)) window.loadVoterLocation(); } catch (e2) {}
        renderSoon();
      });
    } catch (e) {}

    // THE FOUR STORES THAT CAN MOVE UNDER THIS DOCUMENT, each through its own
    // published event. Region b is not among them — your-file.js patches its own
    // row in place and a full repaint would undo the very thing patchRow exists
    // to avoid.
    try { window.addEventListener('pdx-stances-change', renderSoon); } catch (e) {}
    try { window.addEventListener('pdx-saved-change', renderSoon); } catch (e) {}
    try { window.addEventListener('pdx-team-change', renderSoon); } catch (e) {}
    // An account arriving or leaving changes the name in region a, and it
    // repoints every namespaced key underneath the regions below it.
    try { window.addEventListener('pdx-account-change', renderSoon); } catch (e) {}
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth : null;
      if (a && fn(a.onAuthStateChanged)) a.onAuthStateChanged(function () { renderSoon(); });
    } catch (e) {}
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────────
  // Exposed so the suite can assert the desk's own reads directly rather than
  // inferring them from painted markup, and so a later surface has one name to
  // ask "what does this account hold" with. No mutation is published here: this
  // document changes exactly one store, through your-file.js's own set().
  window.PDXMeDesk = {
    TABS: TABS,
    render: render,
    goTab: goTab,
    tabOf: tabOf,
    isPainted: function () { return !!_painted; },
    // reads
    member: member,
    displayNameOf: displayNameOf,
    place: place,
    // Region a's district list, exported so a test reads the rows rather than
    // scraping them out of the paint — and so "not on file" is asserted as a
    // resolved ROW with nothing in it, which is the honest state, rather than
    // as a missing row.
    districts: districts,
    DIST_NONE: DIST_NONE,
    DIST_NOMAP: DIST_NOMAP,
    // The location control's own two words and the rule that picks between them,
    // exported so a test reads the label off the rule rather than off the paint.
    locComplete: locComplete,
    locLabel: locLabel,
    LOC_SET: LOC_SET,
    LOC_CHANGE: LOC_CHANGE,
    seats: seats,
    gate: gate,
    picks: picks,
    pickFor: pickFor,
    // Who holds a seat, as region d asks it: the resolver's own answer, never a
    // second derivation on this document.
    holders: holdersFor,
    HOLD_NONE: HOLD_NONE,
    HOLD_WAIT: HOLD_WAIT,
    stars: stars,
    voice: voice,
    savedCards: savedCards,
    // Region b's reads. positions() is the snapshot's whole input and SNAP_CAP
    // is the face's ceiling — both exported so a test compares them against
    // the editor's own store rather than against a shape written down twice.
    // starters()/openSetter()/isSetterOpen() are gone: there are no starter
    // chips and no editor to open, only the address in setAllDoor().
    positions: positions,
    issueLabel: issueLabel,
    icAttr: icAttr,
    SNAP_CAP: SNAP_CAP,
    // The one way out of the account, exported so the suite asserts the control
    // reaches the same auth object every other surface signs out through.
    signOut: signOut,
    // Region e's three reads, exported for the same reason picks() is: a test
    // compares them against the store rather than against a number written
    // down twice. tagOf is the ?tag= the Eye's gesture arrives with.
    tagOf: tagOf,
    roster: roster,
    rosterCards: rosterCards,
    nameOf: nameOf,
    faceOf: faceOf,
    personHref: personHref,
    // the snapshot's two figures, so a test can compare them with /ballot's own
    // seat list instead of with a number written down twice
    _workable: function () {
      var r = reps();
      return seats().filter(function (s) { return gate(s, r) === 'ok'; });
    }
  };

  // ── BOOT ──────────────────────────────────────────────────────────────────
  // The seams go in FIRST, before the deferred modules below this tag can assign
  // over them or call into them, and two of the three are re-applied on the two
  // later beats for the same reason ballot.html re-applies its own.
  seamLocation();
  seamRerender();
  seamStances();
  seamRoster();
  wire();

  function beat() {
    seamLocation();
    seamRerender();
    seamRoster();
    renderSoon();
  }

  // THE FIRST PAINT WAITS FOR NOTHING. Signed out, with no location, no picks
  // and no saved answers, this document still has seven regions and an honest
  // sentence in each — so the honest arrival is the immediate one, and every
  // fact that lands later (a uid, the location resolver, the roster, a
  // cross-device snapshot) repaints through a signal above.
  if (document.readyState === 'loading') {
    try { document.addEventListener('DOMContentLoaded', beat); } catch (e) {}
  }
  render();
  try { window.addEventListener('load', beat); } catch (e) {}
  try { setTimeout(beat, 400); } catch (e) {}
  try { setTimeout(beat, 1600); } catch (e) {}
})();
