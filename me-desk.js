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
                          menu prints them, plus where this account votes — the
                          input regions c and d both read — and one way to
                          change it.
     b · POSITIONS        your-file.js's OWN eight-issue editor, painted into a
                          host this document supplies. Not a copy of it: the
                          same module, the same store, the same renderer. Change
                          an answer here and the /ballot ranking that reads the
                          alignment store sees it, because there is one store.
     c · STARRED          the issues this reader flagged to count harder, read
                          through the SAME hook the match engine weights with.
                          Add and remove is a jump to My Stances, not a second
                          editor.
     d · BALLOT SNAPSHOT  one line per seat: office, the current pick as a link
                          to /p/<pid>, or the honest blank. "Work this seat"
                          opens /ballot with that seat already open.
     e · SAVED EVIDENCE   the receipts this account saved, each linking back to
                          the record it came from.
     f · JUMPS            three text links. Not a second navigation bar.
     g · DISTRICT VOICE   one standing line and one control for the district
                          board — see the block over regionVoice() for the whole
                          of what it may say and the seven things it may not.

   THE FIVE THINGS THIS FILE MUST NOT DO, and each one is a rule from the brief:

     · IT NEVER SCORES THE VOTER. There is no percentage, no grade, no "you are
       80% aligned with Utah" and no completeness figure anywhere in here. Every
       count is a COUNT — "2 answers of 8 on file", "4 of 6 seats picked" — and
       every one of them is the length of a real list, never a literal and never
       a ratio dressed as progress. Search this file for Math.round and there is
       nothing to find.
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
  // saved location as a claim (claim()), the seat that claim names (seatForMe()),
  // whether Voice is OPEN in that seat (path()), and the sentence that frames
  // what the board is (COPY.frame). This function asks it and decides nothing.
  // A copy of the allow-list, of the seat-key shape or of the frame sentence on
  // THIS document would be a second answer, and a second answer is the defect.
  //
  // THREE STANDINGS, AND THE DEFAULT IS THE WEAKEST ONE. 'out' for a reader
  // with no account, 'unverified' for an account with no district we hold, and
  // 'verified' only when a name can be built out of the two fields already
  // stored for this reader. Every early return below lands on a weaker
  // standing, so a missing module, a missing resolver or a missing field can
  // only ever UNDERSTATE what this reader has — never invent a board for
  // somebody who has none.
  function voiceApi() { try { return window.PDXVoice || null; } catch (e) { return null; } }

  function voice() {
    var out = { standing: 'out', name: '', href: '', frame: '' };
    var V = voiceApi();
    // Borrowed, never written here: one owner for the sentence that says what
    // the board is, so /me and the board cannot describe it differently.
    try { if (V && V.COPY && V.COPY.frame) out.frame = String(V.COPY.frame); } catch (e) {}

    if (!member()) return out;
    out.standing = 'unverified';
    if (!V || !fn(V.seatForMe) || !fn(V.claim)) return out;

    var seat = '';
    try { seat = V.seatForMe() || ''; } catch (e) { seat = ''; }
    if (!seat) return out;

    // THE NAME IS THE FIELDS WE ALREADY STORE, OR THERE IS NO NAME AND NO
    // VERIFIED STANDING. Nothing here composes a district name out of anything
    // this reader did not save: no county table, no geometry, no label corpus.
    var c = {};
    try { c = V.claim() || {}; } catch (e) { c = {}; }
    var n = String(c.houseDistrict == null ? '' : c.houseDistrict);
    var county = String(c.county == null ? '' : c.county);
    if (!n || !county) return out;

    out.standing = 'verified';
    out.name = 'State House District ' + n + ' \u00b7 ' + county;
    // The board's own address when Voice is open in this seat, and '' when it is
    // not. '' is not a failure and is not hidden — it is the state the copy has
    // a sentence for.
    try { out.href = (fn(V.path) ? (V.path(seat) || '') : ''); } catch (e) { out.href = ''; }
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
        '</span></div>';
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

    var p = place();
    var where = p.located && p.label
      ? '<p class="me-where">Your ballot is built for <strong>' + esc(p.label) + '</strong>' +
          (p.detail ? ' <span class="me-mail">' + esc(p.detail) + '</span>' : '') + '. ' +
          '<button type="button" class="me-link" data-me-loc="1">Change location</button></p>'
      : '<p class="me-where">We do not know where you vote yet, so the seats below are the ones we cannot resolve. ' +
          '<button type="button" class="me-link" data-me-loc="1">Set where you vote</button></p>';

    return '<section class="me-region" id="me-identity" aria-labelledby="me-identity-t">' +
      '<div class="me-rhead"><h2 class="me-rtitle" id="me-identity-t">This account</h2></div>' +
      body + where +
    '</section>';
  }

  // ── b · POSITIONS ─────────────────────────────────────────────────────────
  // A HOST, NOT A COPY. This region ships an empty element and your-file.js
  // paints its own letterhead and its own eight rows into it, through
  // PDXYourFile.inline(). So the count sentence on this page is written by the
  // one function that writes it in the panel, the four controls on a row are the
  // same four, an answer goes through the same set() into the same per-account
  // key, and there is nothing here for the two to drift apart on.
  //
  // THE REGION HAS NO HEADING OF ITS OWN, on purpose: the editor's letterhead is
  // the heading — "Your positions on eight issues", and under it the line that
  // has to stay on screen while a reader answers ("Not a vote. Not a district
  // poll."). A second title over it would be this document paraphrasing the
  // module, which is the first step to contradicting it.
  function regionPositions() {
    return '<section class="me-region" id="me-positions" aria-label="Your positions on eight issues">' +
      '<div id="me-yf-host"></div>' +
    '</section>';
  }

  function mountPositions() {
    var host = el('me-yf-host');
    if (!host) return;
    var YF = window.PDXYourFile;
    if (!YF || !fn(YF.inline)) {
      // your-file.js has not parsed yet, or this is an older cached copy of it
      // without an inline host. Say what is missing; do not paint eight rows
      // this document would then own.
      if (!host.firstChild) {
        host.innerHTML = empty('The positions editor is still loading. If it does not appear, ' +
          '<a href="/">reload PolitiDex</a>.');
      }
      return;
    }
    if (host.getAttribute('data-me-mounted') === '1') { try { YF.render(); } catch (e) {} return; }
    try {
      if (YF.inline(host)) host.setAttribute('data-me-mounted', '1');
    } catch (e) {}
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
        '<a class="me-link" href="/#my-stances">Add or remove a star in My Stances</a>' +
      '</p>' +
    '</section>';
  }

  // ── d · BALLOT SNAPSHOT ───────────────────────────────────────────────────
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

      var face;
      if (pid) {
        var ph = faceOf(pid);
        face = ph
          ? '<span class="me-face"><img src="' + esc(ph) + '" alt="" loading="lazy" /></span>'
          : '<span class="me-face" aria-hidden="true">\u{1F3DB}</span>';
      } else {
        face = '<span class="me-seatico" aria-hidden="true">' + s.icon + '</span>';
      }

      var line = pid
        ? '<span class="me-pick">' + personAnchor(pid, nameOf(pid)) + '</span>'
        : '<span class="me-pick me-pick--none">No pick</span>';

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
          '<a href="/#who-represents-me">Tell us where you vote</a> and the seats we hold ' +
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
  //      pattern or the ballot order. The board is the public lane; the eight
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
  //   verified    a LINK to the board, or — when Voice has not opened in this
  //               reader's seat — a plain, unlinked sentence saying so. An
  //               anchor to a board that is not there would be a promise this
  //               app cannot keep.
  function regionVoice() {
    var v = voice();
    var badge = v.standing === 'verified'
      ? '<span class="me-voicetag">Verified resident</span>'
      : '';

    var body;
    if (v.standing === 'out') {
      body = '<p class="me-rline">District Voice is for verified residents.</p>' +
        '<p class="me-rline" style="margin:0.7rem 0 0;">' +
          '<button type="button" class="me-link" data-me-signin="1">Sign in</button></p>';
    } else if (v.standing === 'unverified') {
      body = '<p class="me-rline">Not verified for a district yet.</p>' +
        '<p class="me-rline" style="margin:0.7rem 0 0;">' +
          '<a class="me-voicecta" href="/#who-represents-me">Verify my district</a></p>';
    } else {
      body = '<p class="me-rline">Verified for <strong>' + esc(v.name) + '</strong>.</p>' +
        (v.href
          ? '<p class="me-rline" style="margin:0.7rem 0 0;">' +
              '<a class="me-voicecta" href="' + esc(v.href) + '">Open District Voice</a></p>'
          : '<p class="me-voicedark">District Voice \u2014 board not live yet</p>');
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

  // THE WHOLE DESK, EXCEPT THE EDITOR. Region b is a mounted module and its host
  // is preserved across a repaint — remounting it would throw away the eight
  // rows your-file.js is holding, mid-tap, to paint the same eight back. So the
  // host is lifted out, the rest is replaced, and the host is put back.
  function render() {
    var mount = el(MOUNT);
    if (!mount) return;
    var host = el('me-yf-host');
    var keep = (host && host.getAttribute('data-me-mounted') === '1') ? host : null;
    if (keep && keep.parentNode) { try { keep.parentNode.removeChild(keep); } catch (e) { keep = null; } }

    try { mount.innerHTML = html(); } catch (e) { return; }

    if (keep) {
      var slot = el('me-yf-host');
      if (slot && slot.parentNode) {
        try { slot.parentNode.replaceChild(keep, slot); } catch (e2) {}
      }
    }
    _painted = true;
    mountPositions();
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
  function home(hash) {
    var to = '/' + (hash || '');
    try { location.assign(to); return true; } catch (e) {}
    try { location.href = to; return true; } catch (e2) {}
    try { location.replace(to); return true; } catch (e3) {}
    return false;
  }

  // SEAM 1 — setting a location is a trip home. Both functions behind the
  // homepage's location control open #change-location-form and return early when
  // it is absent, and it IS absent here. Who Represents Me is the front step and
  // it stays on /, so this is the reader being taken to the place that asks the
  // question rather than a modal reimplemented on a second document. Re-applied
  // on two later beats because voter-hub-location.js is deferred and assigns
  // both names at evaluation.
  function seamLocation() {
    window.toggleChangeLocation = function () { return home('#who-represents-me'); };
    window.openLocationModal = function () { return home('#who-represents-me'); };
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

  // SEAM 3 — a bare '#my-stances' is a trip home. my-stances.js is loaded here
  // for its store and its priority hook, but its section needs a homepage mount
  // it does not have, so PDXStances.open() would scroll to nothing. The anchors
  // in region c are already real hrefs to /#my-stances; this catches the hash
  // being set by anything else.
  function seamStances() {
    window.addEventListener('hashchange', function () {
      var h = location.hash || '';
      if (h === '#my-stances' || h === '#my-views') home('#my-stances');
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

  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        if (!ev || ev.defaultPrevented) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
        var t = ev.target;
        if (!t || !t.closest) return;
        if (t.closest('[data-me-signin]')) { ev.preventDefault(); signIn(); return; }
        if (t.closest('[data-me-loc]')) { ev.preventDefault(); home('#who-represents-me'); return; }
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
    seats: seats,
    gate: gate,
    picks: picks,
    pickFor: pickFor,
    stars: stars,
    voice: voice,
    savedCards: savedCards,
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
  wire();

  function beat() {
    seamLocation();
    seamRerender();
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
