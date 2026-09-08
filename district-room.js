/* ─────────────────────────────────────────────────────────────────────────────
   district-room.js — the District Room, at /d/<districtKey>/<issueKey>
   ─────────────────────────────────────────────────────────────────────────────
   WHAT THIS SURFACE IS. Verified-residency neighbours in ONE district, talking
   about ONE issue. That sentence is the whole product rule and every limit below
   falls out of it:

     · It is not a comment thread on a politician. No pid is read, stored, shown
       or linked from this module, and a room is never mounted on a person file.
     · It is not a site-wide board. A room is (district, issue) and it shows the
       posts of that pair only — never another district's, never another issue's.
     · It is not a ranking. Posts are NEWEST FIRST and there is no other order,
       no reaction, no score, no reply tally and no sort control. The phase 0
       tables carry no column any of that could be stored in.
     · It carries no party letter, no caucus, no "team" language, no politician
       score and no Direction Match. Nothing on this surface is a verdict about
       anybody.

   THE ADDRESS, AND WHY IT IS OWNED HERE. /d/<districtKey>/<issueKey>, served by
   a 200 rewrite to index.html exactly as /i/*, /p/* and /b/* are (see
   netlify.toml). Both halves are identifiers the app already agrees on:
   `districtKey` IS dd_districts.district_id (`ut-house-2`, the composed key
   phase 0 chose out of Door 2's own seat language) and `issueKey` IS the
   ISSUE_MAP key that /i/<key> already spends. This module owns building and
   parsing that string — path() and fromPath() — so the two mounts, the arrival
   path and the share line cannot drift into three spellings of one address.

   THE TWO MOUNTS, AND THERE ARE ONLY TWO. No new nav entry, no new top-level
   door, no homepage band:

     (a) seatMountHtml()  — Who Represents Me, on a DISTRICT seat row (U.S.
         House, State Senate, State House). The district is known there; the
         issue is the reader's own, taken from My Stances.
     (b) issueMountHtml() — the issue file at /i/<key>. The issue is known
         there; the district is the reader's own, taken from the one resolver
         (window.pdxRepsForMe).

   Each mount answers '' unless it can name a real (district, issue) pair, so a
   reader is never offered a room that does not resolve.

   THE COMPOSER IS THE SERVER'S ANSWER, NOT THIS FILE'S OPINION. Whether a reader
   may post is decided in netlify/lib/district-room-core.mjs and returned by
   /api/district-room as `canPost` plus the note to print when it is false. This
   module renders that answer and never computes one — a UI that decides for
   itself who may type is a UI that will eventually disagree with the gate. There
   is no branch below that opens the composer on anything other than
   `canPost === true`.

   THE TWO RESIDENCY CONTROLS, LABELLED DIFFERENTLY, AND ONLY ONE OF THEM IS THE
   WAY IN. When the composer is closed the server may also say what the reader can
   do about it. The two things are never dressed alike and, since phase 3, they do
   not even sit in the same place:

     · "Ask to be verified for this district" — the NEIGHBOUR'S PRIMARY CONTROL,
       painted immediately under the closed note where somebody looking for the
       way into the room will actually look for it. It is offered only when the
       server says canAttest AND this room's district is one the reader's OWN
       resolver already places them in, so nobody is invited to claim a district
       that is not theirs. It records a PENDING row, the composer stays shut, and
       the sentence afterwards says pending rather than verified.
     · "Grant residency (reviewer)" — a REVIEWER'S decision, offered only when the
       server says canGrant. It is the one path that reaches verified, and it is
       painted in its own footer BELOW THE POSTS under a "Reviewer tools" heading
       — deliberately not in the slot a neighbour reads as "join the room",
       because a control almost nobody can use must not be the loudest thing on
       the way in. A reader who can already post is shown no grant at all.

   THE BADGE IS NEVER PRINTED ON EITHER. `pdxdr-badge` appears on a post the
   server marked verified, and inside an OPEN composer. A pending request and a
   self-typed location get a sentence, never a badge.

   THE ROOM'S ONE POLL. Phase 3 adds a single structured question above the
   composer: fixed copy, three fixed poles (Support / Oppose / Mixed — the same
   three My Stances spends), and results printed as three integers. This file does
   no arithmetic of its own: the numbers and the sentence they are printed as both
   arrive from the server, and the '%' character does not appear in this module at
   all — no percentage, no bar, no fill, no meter. The poll does not touch the
   posts underneath it: no post is reordered, promoted or marked by an answer, and
   no answer is ever read off a post's text.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.PDXDistrictRoom) return;

  var API = '/api/district-room';
  var PREFIX = '/d/';
  var PATH_RE = /^\/d\/([^/]+)\/([^/]+)\/?$/;
  // The two shapes, spelled exactly as netlify/lib/district-room-core.mjs spells
  // them and pinned against it by scripts/test-district-room.mjs. They are a
  // pre-flight check and never the authority: the authority is the phase 0
  // foreign key, so a well-shaped key naming no row still fails closed at the
  // Function.
  var DISTRICT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ISSUE_KEY_RE = /^[a-z0-9_]+$/;

  // ── COPY, mirrored from the gate ──────────────────────────────────────────
  // These strings are also the Function's, and the test asserts the two copies
  // are identical. The server sends the ones a reader must see (the strap, the
  // empty room, the closed note) and this file prints what arrived; the literals
  // here are the fallback for a room whose read failed, so a reader on a bad
  // connection never meets a different sentence than a reader on a good one.
  var COPY = {
    strap: 'Neighbors in this district, this issue.',
    empty: 'No neighbor posts on this issue in this district yet.',
    closed: 'Verify you live in this district to post.',
    closedSignedOut: 'Sign in first, then ask to be verified for this district. Reading is open.',
    closedNoResidency: 'We have not established that you live in this district. Reading is open.',
    pending: 'Your residency request for this district is pending review. ' +
      'Reading is open; posting opens only if a reviewer approves it.',
    revoked: 'Your residency for this district was revoked, so you can read here but not post.',
    wrongDistrict: "You're verified in a different district, so you can read here but not post.",
    attest: 'Ask to be verified for this district',
    attestNote: 'This records a PENDING request a reviewer decides on. Asking does not verify ' +
      'you and does not open the composer.',
    attestSent: 'Recorded as pending. A reviewer decides; you are not verified yet.',
    grant: 'Grant residency (reviewer)',
    reviewerTools: 'Reviewer tools',
    granted: 'Verified for this district. The composer is open here.',
    grantDenied: 'Only a site reviewer can grant residency.',
    notInScope: 'Residency verification is Utah only in this pass, so we cannot verify you ' +
      'for a district in another state yet.',
    badge: 'verified in this district',
    flag: 'Report',
    flagRecorded: 'Reported. This records your intent; review comes later.',
    pollQuestion: 'On this issue in this district, where do you stand?',
    pollNoVotes: 'No votes yet.',
    pollCountsNote: 'Counts only, and a neighbor\'s post is not a vote — nobody\'s answer here is ' +
      'read off what they wrote.',
    pollVoted: 'Recorded. Changing your answer replaces it.',
    pollPick: 'Pick support, oppose or mixed.',
    pollClosed: 'Verify you live in this district to answer. The counts are open to read.',
    pollClosedSignedOut: 'Sign in, then ask to be verified for this district to answer. The counts ' +
      'are open to read.',
    pollPending: 'Your residency request for this district is pending review, so you can read ' +
      'the counts but not answer yet.',
    pollWrongDistrict: 'You\'re verified in a different district, so you can read the counts here ' +
      'but not answer.'
  };
  // The three poles, spelled as My Stances spells them, and there is no fourth.
  // The server sends this list; this is only the fallback for a read that
  // answered without one, so the block is never painted with no options at all.
  var POLES = [
    { key: 'support', label: 'Support' },
    { key: 'oppose', label: 'Oppose' },
    { key: 'mixed', label: 'Mixed' }
  ];
  var KICK = 'District Room';
  var MOUNT_HD = 'District Voice';
  var SEAT_LINE = 'Neighbors in this district, one issue at a time.';
  var SEAT_BLANK = 'A room is per issue. Open an issue file and this district’s room is on it.';
  var ISSUE_LINE = 'Talk to neighbors in your own district about this issue.';
  var BUSY = 'Opening the room…';
  var GONE = 'That room did not open.';

  var ID = 'pdx-district-room';
  var ID_TITLE = 'pdx-district-room-title';
  var ID_HEAD = 'pdx-district-room-head';
  var ID_BODY = 'pdx-district-room-scroll';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  // '' rather than a half-formed path for anything that is not a valid pair: a
  // caller that cannot be handed an address must render no link at all.
  function path(districtKey, issueKey) {
    var d = String(districtKey == null ? '' : districtKey).trim();
    var i = String(issueKey == null ? '' : issueKey).trim();
    if (!DISTRICT_KEY_RE.test(d) || !ISSUE_KEY_RE.test(i)) return '';
    return PREFIX + d + '/' + i;
  }
  function fromPath(p) {
    var m;
    try { m = String(p == null ? location.pathname : p).match(PATH_RE); } catch (e) { m = null; }
    if (!m) return null;
    var d = m[1], i = m[2];
    try { d = decodeURIComponent(d); } catch (e) {}
    try { i = decodeURIComponent(i); } catch (e) {}
    if (!DISTRICT_KEY_RE.test(d) || !ISSUE_KEY_RE.test(i)) return null;
    return { districtKey: d, issueKey: i };
  }

  // ── THE DISTRICT KEY, COMPOSED FROM THE ONE RESOLVER ──────────────────────
  // window.pdxRepsForMe() already answers "which district am I in" for every
  // surface on the site, and its district levels carry the two things phase 0's
  // key is made of: the seat class in Door 2's own language (house / statesenate
  // / statehouse) and the number. All this adds is the state's postal code.
  //
  // THE TABLE IS SHORT ON PURPOSE. dd_districts is seeded only where the app
  // actually maps districts — Utah, because pdxRepsForMe().districtsResolvable
  // is true there and nowhere else — so a code for a state with no rows would
  // compose an address the Function must then refuse. Widening this table is the
  // LAST step of adding a state, not the first: DISTRICT_MAPS.md carries the five
  // things that must be true before that flag moves, and scripts/test-district-
  // room.mjs pins this table against the districts phase 0 actually seeded.
  var STATE_CODE = { utah: 'ut' };
  var SEAT_KEYS = { house: 1, statesenate: 1, statehouse: 1 };

  function stateCode(stateName) {
    var s = String(stateName == null ? '' : stateName).trim().toLowerCase();
    return STATE_CODE[s] || '';
  }
  // A level from pdxRepsForMe() plus the state it was resolved in → the room's
  // district key, or ''. Statewide seats (U.S. Senate, Governor) carry no
  // district, so they compose nothing — they are not filtered out here, they
  // simply have no number and fall out on their own.
  function districtKeyFor(level, stateName) {
    if (!level || level.statewide) return '';
    var code = stateCode(stateName);
    var seat = String((level.seat || level.key) || '').trim();
    var num = String(level.district == null ? '' : level.district).replace(/[^0-9]/g, '');
    if (!code || !SEAT_KEYS[seat] || !num || num === '0') return '';
    var k = code + '-' + seat + '-' + String(parseInt(num, 10));
    return DISTRICT_KEY_RE.test(k) ? k : '';
  }

  // Every district room this reader can honestly be offered: their own district
  // seats, in the resolver's own order, each with the label the resolver already
  // prints for it. Empty outside a mapped state, which is the honest answer.
  function myDistricts() {
    var reps = null;
    try { reps = fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }
    if (!reps || !reps.located || reps.national || !reps.districtsResolvable) return [];
    var out = [];
    (reps.levels || []).forEach(function (lv) {
      var k = districtKeyFor(lv, reps.state);
      if (!k) return;
      out.push({ districtKey: k, label: lv.distLabel || lv.label || k });
    });
    return out;
  }

  // ── THE ISSUE'S NAME, FROM THE REGISTER THAT OWNS IT ──────────────────────
  // Never invented here. PDXIssueFamily is the table that names a child key
  // everywhere else on the site; the key itself is the fallback, because a key is
  // at least true.
  function issueLabel(key) {
    var k = String(key == null ? '' : key);
    try {
      var F = window.PDXIssueFamily;
      if (F && fn(F.childLabel)) {
        var l = F.childLabel(k);
        if (l) return String(l);
      }
    } catch (e) {}
    try {
      var D = window.PDXDoor1;
      if (D && fn(D.issueLabelFor)) {
        var l2 = D.issueLabelFor(k);
        if (l2) return String(l2);
      }
    } catch (e) {}
    return k;
  }

  // The reader's own issues, in My Stances' own priority order. This is what
  // makes the seat mount able to name an issue at all: the district is known on a
  // seat row and the issue has to come from somewhere, so it comes from the
  // issues the reader already told the app they care about — never from a list
  // this module ranked.
  function myIssueKeys(limit) {
    var out = [];
    try {
      var S = window.PDXStances;
      if (!S || !fn(S.all)) return out;
      (S.all() || []).forEach(function (it) {
        var k = it && (it.issueKey || it.key);
        if (!k || !ISSUE_KEY_RE.test(String(k))) return;
        if (out.indexOf(String(k)) < 0) out.push(String(k));
      });
    } catch (e) { return []; }
    return limit ? out.slice(0, limit) : out;
  }

  // ── AUTH PLUMBING ─────────────────────────────────────────────────────────
  // The same arrangement every other authenticated call in this app uses: the
  // Firebase ID token in an Authorization header, verified server-side by
  // db/firebase-auth.ts. An anonymous session sends no token, because an
  // anonymous uid is per-browser and the server rejects it anyway.
  function token() {
    try {
      var u = (typeof auth !== 'undefined') && auth.currentUser;
      if (!u || u.isAnonymous) return Promise.resolve(null);
      return u.getIdToken().catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function api(qs, opts) {
    opts = opts || {};
    return token().then(function (t) {
      var headers = { 'Content-Type': 'application/json' };
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (qs || ''), {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // ── MOUNT (a): a district seat row in Who Represents Me ───────────────────
  // The district is the row's own. The issues are the reader's own. Answers ''
  // when the seat composes no district key — an unmapped state, a statewide seat,
  // a row the resolver could not place — so this block never appears over a
  // district the app cannot open a room for.
  function seatMountHtml(level, stateName) {
    var dk = districtKeyFor(level, stateName);
    if (!dk) return '';
    var label = (level && (level.distLabel || level.label)) || dk;
    var keys = myIssueKeys(6);
    var chips = keys.map(function (k) { return chipLink(dk, k, issueLabel(k)); })
      .filter(Boolean).join('');
    return '<div class="pdxdr-mount" data-pdxdr-district="' + esc(dk) + '">' +
        '<p class="pdxdr-mount-hd">' + esc(MOUNT_HD) +
          '<span class="pdxdr-mount-sub">' + esc(label) + '</span></p>' +
        '<p class="pdxdr-mount-line">' + esc(chips ? SEAT_LINE : SEAT_BLANK) + '</p>' +
        (chips ? '<p class="pdxdr-chips">' + chips + '</p>' : '') +
      '</div>';
  }

  // ── MOUNT (b): the issue file at /i/<key> ─────────────────────────────────
  // The issue is the file's own. The districts are the reader's own, from the one
  // resolver. Answers '' when the reader has no located, mapped district — which
  // is the honest state for a visitor we cannot place, and is why this block does
  // not exist on the issue file for most of the country yet.
  function issueMountHtml(issueKey) {
    var k = String(issueKey == null ? '' : issueKey).trim();
    if (!ISSUE_KEY_RE.test(k)) return '';
    var mine = myDistricts();
    if (!mine.length) return '';
    var chips = mine.map(function (d) { return chipLink(d.districtKey, k, d.label); })
      .filter(Boolean).join('');
    if (!chips) return '';
    return '<div class="pdxdr-mount" data-pdxdr-issue="' + esc(k) + '">' +
        '<p class="pdxdr-mount-hd">' + esc(MOUNT_HD) +
          '<span class="pdxdr-mount-sub">' + esc(issueLabel(k)) + '</span></p>' +
        '<p class="pdxdr-mount-line">' + esc(ISSUE_LINE) + '</p>' +
        '<p class="pdxdr-chips">' + chips + '</p>' +
      '</div>';
  }

  // One chip, and it is a REAL ANCHOR to the room's address rather than a button
  // with a handler: the room has a citable path, so the path belongs in the
  // document where it can be middle-clicked, opened in a new tab and copied. The
  // delegated listener below turns a plain left click into an in-app open.
  function chipLink(districtKey, issueKey, label) {
    var href = path(districtKey, issueKey);
    if (!href) return '';
    return '<a class="pdxdr-chip" href="' + esc(href) + '"' +
      ' data-pdxdr-open="' + esc(districtKey + '|' + issueKey) + '">' +
      esc(label) + '</a>';
  }

  // ── THE PANEL ─────────────────────────────────────────────────────────────
  var _built = false;
  var _open = false;
  var _room = null;      // { districtKey, issueKey }
  var _return = '';      // where to put the address back on close

  function build() {
    if (_built) return el(ID);
    var d;
    try { d = document; } catch (e) { return null; }
    if (!d || !fn(d.createElement) || !d.body) return null;

    var overlay = d.createElement('div');
    overlay.id = ID;
    overlay.className = 'pdxdr';
    overlay.hidden = true;
    try {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', ID_TITLE);
      overlay.setAttribute('aria-hidden', 'true');
    } catch (e) {}
    try { overlay.style.display = 'none'; } catch (e) {}

    var panel = d.createElement('div');
    panel.className = 'pdxdr-panel';

    var top = d.createElement('div');
    top.className = 'pdxdr-top';

    var head = d.createElement('div');
    head.id = ID_HEAD;
    head.className = 'pdxdr-head';

    var x = d.createElement('button');
    x.className = 'pdxdr-x';
    try {
      x.setAttribute('type', 'button');
      x.setAttribute('aria-label', 'Close the district room');
      x.setAttribute('title', 'Close');
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    } catch (e) {}
    try { x.addEventListener('click', function () { close(); }); } catch (e) {}

    var body = d.createElement('div');
    body.id = ID_BODY;
    body.className = 'pdxdr-body';

    try { top.appendChild(head); top.appendChild(x); } catch (e) {}
    try { panel.appendChild(top); panel.appendChild(body); } catch (e) {}
    try { overlay.appendChild(panel); } catch (e) {}
    // Immediately before #modal-overlay when that exists, for the reason
    // issue-file.js documents: this panel and the person modal share a z-index,
    // so document order decides which covers which, and a person opened from a
    // room must land on top of the room rather than under it.
    try {
      var host = el('modal-overlay');
      if (host && host.parentNode === d.body && fn(d.body.insertBefore)) {
        d.body.insertBefore(overlay, host);
      } else {
        d.body.appendChild(overlay);
      }
    } catch (e) {
      try { d.body.appendChild(overlay); } catch (e2) { return null; }
    }
    if (!el(ID)) return null;

    try {
      overlay.addEventListener('click', function (ev) {
        if (ev && ev.target === overlay) close();
      });
    } catch (e) {}

    _built = true;
    return overlay;
  }

  // ── THE HEADER ────────────────────────────────────────────────────────────
  // District name, issue chip, and the one line that says what the room is.
  // Nothing else is allowed up here: no party letter, no politician, no score, no
  // Direction Match and no count. The kicker carries the room's own address,
  // which is the only thing in this block that is not a name.
  function headHtml(room, data) {
    var d = (data && data.district) || null;
    var label = (d && d.label) || room.districtKey;
    var strap = (data && data.strap) || COPY.strap;
    var p = path(room.districtKey, room.issueKey);
    return '<p class="pdxdr-kick">' + esc(KICK) + (p ? ' · ' + esc(p) : '') + '</p>' +
      '<h2 class="pdxdr-title" id="' + ID_TITLE + '">' + esc(label) + '</h2>' +
      '<p class="pdxdr-chipline"><span class="pdxdr-issuechip">' +
        esc(issueLabel(room.issueKey)) + '</span></p>' +
      '<p class="pdxdr-strap">' + esc(strap) + '</p>';
  }

  // ── THE COMPOSER, OR THE CLOSED NOTE ──────────────────────────────────────
  // Exactly one of the two, and the server decided which. `canPost` false paints
  // a short note and no field — not a disabled textarea, because a box a reader
  // can click into and type in and then not send is a worse answer than no box.
  // Is this room's district one the reader's OWN resolver places them in? The
  // self-attest control is offered only where that is true — the server would
  // accept a request for any mapped Utah district (a pending row cannot post
  // whatever district it names), but offering one for a district that is not
  // theirs would be inviting a claim nobody should make.
  function isMine(districtKey) {
    var d = String(districtKey == null ? '' : districtKey);
    if (!d) return false;
    var mine = myDistricts();
    for (var i = 0; i < mine.length; i++) {
      if (mine[i] && mine[i].districtKey === d) return true;
    }
    return false;
  }

  // THE NEIGHBOUR'S WAY IN, and the only control in this slot. A reader whose
  // composer is closed gets the ask — "Ask to be verified for this district" —
  // right under the note that told them why it is closed, because that is where
  // somebody looking for the way into the room looks. The reviewer's grant is NOT
  // here: it lives in reviewerHtml() below, under the posts.
  //
  // Both flags come from the server; this function adds only the "is it their own
  // district" restriction on the ask, and never a verdict of its own.
  function residencyHtml(data) {
    var r = (data && data.residency) || null;
    if (!r) return '';
    var d = (data && data.district && data.district.districtKey) || '';
    var out = '';
    if (r.outOfScopeNote) {
      out += '<p class="pdxdr-resnote">' + esc(r.outOfScopeNote) + '</p>';
    }
    if (r.canAttest === true && isMine(d)) {
      out += '<div class="pdxdr-ask" data-pdxdr-saybox="1">' +
          '<button type="button" class="pdxdr-askbtn" data-pdxdr-attest="1">' +
            esc(r.attest || COPY.attest) + '</button>' +
          '<p class="pdxdr-resnote">' + esc(r.attestNote || COPY.attestNote) + '</p>' +
          '<p class="pdxdr-say" role="status" data-pdxdr-say="1"></p>' +
        '</div>';
    }
    return out;
  }

  // THE REVIEWER'S FOOTER, and it is the last thing in the room. Painted only
  // when the server says canGrant, only when the composer is CLOSED (somebody who
  // can already post has nothing to grant themselves), and always under its own
  // "Reviewer tools" heading so it reads as what it is: a tool for the one person
  // with that standing, not the neighbour's call to action.
  function reviewerHtml(data) {
    var r = (data && data.residency) || null;
    if (!r || r.canGrant !== true) return '';
    if (data && data.canPost === true) return '';
    return '<div class="pdxdr-rev" data-pdxdr-saybox="1">' +
        '<p class="pdxdr-revhd">' + esc(COPY.reviewerTools) + '</p>' +
        '<button type="button" class="pdxdr-grantbtn" data-pdxdr-grant="1">' +
          esc(r.grant || COPY.grant) + '</button>' +
        '<p class="pdxdr-say" role="status" data-pdxdr-say="1"></p>' +
      '</div>';
  }

  // ── THE ROOM'S ONE POLL ───────────────────────────────────────────────────
  // Fixed question, three fixed poles, three integers. Everything printed here
  // arrived from the server: the question, the option labels, the results and the
  // sentence they are printed as. This function does NO arithmetic — it does not
  // add the three numbers, does not divide them and does not draw them, because a
  // proportion drawn as a length reads as a grade and this is not a grade. The
  // '%' character does not appear in this module.
  //
  // The three buttons are rendered only when the server said canVote, for the
  // same reason a closed composer paints no textarea: a control a reader can
  // press and then be refused is a worse answer than no control. A reader who
  // cannot answer still sees the numbers, and the sentence saying which of the
  // four reasons is theirs.
  //
  // Nothing about this block touches the posts under it. There is no marker on a
  // post, no reorder and no filter by answer.
  function pollHtml(data) {
    var p = (data && data.poll) || null;
    if (!p) return '';
    var opts = (p.options && p.options.length) ? p.options : POLES;
    var mine = String(p.mine == null ? '' : p.mine);
    var buttons = '';
    if (p.canVote === true) {
      buttons = opts.map(function (o) {
        var k = String((o && o.key) || '');
        if (!k) return '';
        var on = k === mine;
        return '<button type="button" class="pdxdr-pole' + (on ? ' is-mine' : '') + '"' +
          ' data-pdxdr-vote="' + esc(k) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
          esc((o && o.label) || k) + '</button>';
      }).join('');
    }
    return '<section class="pdxdr-poll" data-pdxdr-saybox="1">' +
        '<p class="pdxdr-pollq">' + esc(p.question || COPY.pollQuestion) + '</p>' +
        (buttons
          ? '<div class="pdxdr-poles" role="group" aria-label="Where you stand">' +
              buttons + '</div>'
          : '') +
        '<p class="pdxdr-pollres" role="status" data-pdxdr-pollres="1">' +
          esc(p.resultLine || COPY.pollNoVotes) + '</p>' +
        (p.canVote === true
          ? ''
          : '<p class="pdxdr-pollnote">' + esc(p.note || COPY.pollClosed) + '</p>') +
        '<p class="pdxdr-pollfoot">' + esc(p.countsNote || COPY.pollCountsNote) + '</p>' +
        '<p class="pdxdr-say" role="status" data-pdxdr-say="1"></p>' +
      '</section>';
  }

  function composerHtml(data) {
    if (data && data.canPost === true) {
      return '<form class="pdxdr-composer" data-pdxdr-form="1" data-pdxdr-saybox="1">' +
          '<label class="pdxdr-lbl" for="pdxdr-body">Say it to your neighbors</label>' +
          '<textarea id="pdxdr-body" class="pdxdr-ta" name="body" rows="4" maxlength="2000"' +
            ' placeholder="What should neighbors in this district know about this issue?"></textarea>' +
          '<div class="pdxdr-actions">' +
            '<span class="pdxdr-badge pdxdr-badge--you">' + esc(COPY.badge) + '</span>' +
            '<button type="submit" class="pdxdr-send">Post</button>' +
          '</div>' +
          '<p class="pdxdr-say" role="status" data-pdxdr-say="1"></p>' +
        '</form>';
    }
    var note = (data && data.closedNote) || (COPY.closed + ' ' + COPY.closedNoResidency);
    return '<p class="pdxdr-closed" role="note">' + esc(note) + '</p>' + residencyHtml(data);
  }

  // ── THE POSTS ─────────────────────────────────────────────────────────────
  // Newest first, as the Function returned them. This function does not sort,
  // score, group or filter: it prints the array in the order it arrived, because
  // a second ordering here is a second answer about what the room says.
  function when(iso) {
    var s = String(iso == null ? '' : iso);
    if (!s) return '';
    var t = new Date(s);
    if (isNaN(t.getTime())) return s;
    try {
      return t.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) { return t.toISOString(); }
  }

  function postHtml(p, badge) {
    var id = parseInt(String(p && p.id), 10);
    var src = (p && p.sourceUrl) ? String(p.sourceUrl) : '';
    return '<li class="pdxdr-post">' +
        '<p class="pdxdr-postbody">' + esc(p && p.body) + '</p>' +
        (src ? '<p class="pdxdr-postsrc"><a href="' + esc(src) + '" rel="nofollow noopener"' +
          ' target="_blank">' + esc(src) + '</a></p>' : '') +
        '<p class="pdxdr-postmeta">' +
          // The badge is an attestation about the author's DISTRICT and nothing
          // else. There is no handle, no display name and no avatar: a room shows
          // neighbours, not accounts.
          (p && p.verified
            ? '<span class="pdxdr-badge">' + esc(badge || COPY.badge) + '</span>'
            : '') +
          '<time class="pdxdr-when" datetime="' + esc(p && p.createdAt) + '">' +
            esc(when(p && p.createdAt)) + '</time>' +
          (id > 0
            ? '<button type="button" class="pdxdr-flag" data-pdxdr-flag="' + id + '">' +
                esc(COPY.flag) + '</button>'
            : '') +
        '</p>' +
      '</li>';
  }

  function postsHtml(data) {
    var list = (data && data.posts) || [];
    if (!list.length) {
      return '<p class="pdxdr-empty">' + esc((data && data.empty) || COPY.empty) + '</p>';
    }
    var badge = (data && data.badge) || COPY.badge;
    return '<ul class="pdxdr-posts">' +
      list.map(function (p) { return postHtml(p, badge); }).join('') + '</ul>';
  }

  // THE ORDER OF THE ROOM, and it is the brief's order: the header (painted
  // separately, unchanged), then the poll, then the composer or the note that
  // says why there isn't one, then the posts newest-first, then — last, and only
  // for the handful of people it applies to — the reviewer footer.
  function bodyHtml(data) {
    return pollHtml(data) +
      composerHtml(data) +
      '<div class="pdxdr-list">' + postsHtml(data) + '</div>' +
      reviewerHtml(data);
  }

  // ── OPEN ──────────────────────────────────────────────────────────────────
  // The page under the room does not scroll while the room is over it — the same
  // one-line seam issue-file.js takes for the same reason, rather than a second
  // scroll-lock implementation with its own idea of when to give it back.
  function lock() {
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }
  function unlock() {
    try { document.body.style.overflow = ''; } catch (e) {}
  }

  function show(overlay) {
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try { overlay.style.setProperty('display', 'flex', 'important'); } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
  }

  function stamp(room) {
    var p = path(room.districtKey, room.issueKey);
    if (!p) return;
    try {
      if (location.pathname === p) return;
      _return = location.pathname + (location.search || '');
      if (history && fn(history.pushState)) history.pushState({ pdxdr: 1 }, '', p);
    } catch (e) {}
  }
  function restore() {
    try {
      if (!fromPath(location.pathname)) return;
      var back = _return || '/';
      if (history && fn(history.pushState)) history.pushState({ pdxdr: 0 }, '', back);
    } catch (e) {}
  }

  // Opens the room, paints the header immediately (the district key and the issue
  // key are both already known, so the reader is never looking at a blank panel
  // while the read is out), then paints the room the Function returned. A read
  // that fails says so instead of showing an empty room, because "no posts yet"
  // and "we could not reach the room" are different facts.
  function enter(districtKey, issueKey) {
    var d = String(districtKey == null ? '' : districtKey).trim();
    var i = String(issueKey == null ? '' : issueKey).trim();
    if (!DISTRICT_KEY_RE.test(d) || !ISSUE_KEY_RE.test(i)) return false;
    var overlay = build();
    if (!overlay) return false;

    _room = { districtKey: d, issueKey: i };
    _open = true;
    var head = el(ID_HEAD);
    var body = el(ID_BODY);
    if (head) { try { head.innerHTML = headHtml(_room, null); } catch (e) {} }
    if (body) {
      try {
        body.innerHTML = '<p class="pdxdr-busy" role="status">' + esc(BUSY) + '</p>';
      } catch (e) {}
    }
    show(overlay);
    lock();
    stamp(_room);
    try {
      var scroller = el(ID_BODY);
      if (scroller) scroller.scrollTop = 0;
    } catch (e) {}
    load();
    return true;
  }

  function load() {
    if (!_room) return;
    var room = _room;
    var qs = '?district=' + encodeURIComponent(room.districtKey) +
      '&issue=' + encodeURIComponent(room.issueKey);
    api(qs).then(function (res) {
      // A read that landed after the reader moved on is dropped rather than
      // painted over whatever they are looking at now.
      if (!_open || !_room || _room.districtKey !== room.districtKey ||
          _room.issueKey !== room.issueKey) return;
      var head = el(ID_HEAD);
      var body = el(ID_BODY);
      if (!res.ok) {
        var msg = (res.data && res.data.error) || GONE;
        if (body) { try { body.innerHTML = '<p class="pdxdr-gone">' + esc(msg) + '</p>'; } catch (e) {} }
        return;
      }
      if (head) { try { head.innerHTML = headHtml(room, res.data); } catch (e) {} }
      if (body) { try { body.innerHTML = bodyHtml(res.data); } catch (e) {} }
    });
  }

  function close() {
    _open = false;
    _room = null;
    var overlay = el(ID);
    if (overlay) {
      try { overlay.hidden = true; } catch (e) {}
      try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
      try { overlay.style.setProperty('display', 'none', 'important'); } catch (e) {
        try { overlay.style.display = 'none'; } catch (e2) {}
      }
    }
    unlock();
    restore();
    return false;
  }

  // The room has several status lines now — one in the poll, one in the ask, one
  // in the composer, one in the reviewer footer — so a message is printed in the
  // block the control that sent it lives in rather than in whichever one happens
  // to come first in the document.
  function say(msg, from) {
    var n = null;
    try {
      if (from && from.closest) {
        var box = from.closest('[data-pdxdr-saybox="1"]');
        if (box && box.querySelector) n = box.querySelector('[data-pdxdr-say="1"]');
      }
    } catch (e) { n = null; }
    if (!n) {
      try { n = document.querySelector('[data-pdxdr-say="1"]'); } catch (e) { n = null; }
    }
    if (n) { try { n.textContent = String(msg || ''); } catch (e) {} }
  }

  // ── WRITE ─────────────────────────────────────────────────────────────────
  // The client checks only that there is something to send. Every other refusal
  // — district, issue, residency, wrong district — belongs to the gate, and this
  // function prints whatever the gate said rather than guessing at it first.
  function submit(form) {
    if (!_room || !form) return false;
    var ta = form.querySelector ? form.querySelector('textarea[name="body"]') : null;
    var text = ta ? String(ta.value || '').trim() : '';
    if (!text) { say('Write something first.', form); return false; }
    var btn = form.querySelector ? form.querySelector('.pdxdr-send') : null;
    if (btn) { try { btn.disabled = true; } catch (e) {} }
    say('Posting…', form);
    api('', {
      method: 'POST',
      body: { district: _room.districtKey, issue: _room.issueKey, body: text }
    }).then(function (res) {
      if (btn) { try { btn.disabled = false; } catch (e) {} }
      if (!res.ok) {
        say((res.data && res.data.error) || 'That did not post.', form);
        return;
      }
      if (ta) { try { ta.value = ''; } catch (e) {} }
      say('Posted.', form);
      load();
    });
    return false;
  }

  // ── THE RESIDENCY REQUEST ─────────────────────────────────────────────────
  // Sends "I live in this district" and then says what came back — which, on
  // success, is that it is PENDING. It does not open the composer, does not paint
  // a badge and does not reload the room into a verified state, because none of
  // those things happened. The room is re-read only so the note becomes the
  // pending sentence the server now owns.
  function attest(btn) {
    if (!_room) return false;
    if (btn) { try { btn.disabled = true; } catch (e) {} }
    say('Sending…', btn);
    api('/residency/attest', { method: 'POST', body: { district: _room.districtKey } })
      .then(function (res) {
        if (!res.ok) {
          if (btn) { try { btn.disabled = false; } catch (e) {} }
          say((res.data && res.data.error) || 'That did not send.', btn);
          return;
        }
        say((res.data && res.data.message) || COPY.attestSent, btn);
        load();
      });
    return false;
  }

  // ── THE REVIEWER'S GRANT ──────────────────────────────────────────────────
  // Only rendered when the server said canGrant, and the server checks again on
  // arrival — this control is a convenience for the one person who has that
  // standing, not the thing that confers it. The room is re-read afterwards, and
  // whether the composer appears is entirely the next read's answer.
  function grant(btn) {
    if (!_room) return false;
    if (btn) { try { btn.disabled = true; } catch (e) {} }
    say('Sending…', btn);
    api('/residency/grant', { method: 'POST', body: { district: _room.districtKey } })
      .then(function (res) {
        if (btn) { try { btn.disabled = false; } catch (e) {} }
        if (!res.ok) {
          say((res.data && res.data.error) || 'That did not send.', btn);
          return;
        }
        say((res.data && res.data.message) || COPY.granted, btn);
        load();
      });
    return false;
  }

  // ── THE VOTE ──────────────────────────────────────────────────────────────
  // Sends ONE of the three poles and prints what came back. The client checks
  // only that the pressed button named a pole at all; every other refusal —
  // district, issue, residency, pending, wrong district — belongs to the vote
  // gate, and this function prints whatever the gate said rather than guessing
  // at it first.
  //
  // CHANGING AN ANSWER REPLACES IT. The server's write is an upsert on
  // (district, issue, person), so pressing a second pole does not add a second
  // answer, and this function does not adjust a number locally to make it look
  // like it did — it repaints the block with the counts the server returned.
  function vote(choice, btn) {
    if (!_room) return false;
    var k = String(choice == null ? '' : choice).trim();
    if (!k) return false;
    var box = null;
    try { box = btn && btn.closest ? btn.closest('[data-pdxdr-saybox="1"]') : null; } catch (e) {}
    say('Sending…', btn);
    api('/poll/vote', {
      method: 'POST',
      body: { district: _room.districtKey, issue: _room.issueKey, choice: k }
    }).then(function (res) {
      if (!res.ok) {
        say((res.data && res.data.error) || 'That did not send.', btn);
        return;
      }
      var p = res.data && res.data.poll;
      // Repaint the poll in place from the server's own numbers. The rest of the
      // room — the composer and every post — is left exactly as it was, because
      // an answer changes nothing about them.
      if (p && box) {
        try {
          var line = box.querySelector('[data-pdxdr-pollres="1"]');
          if (line) line.textContent = String(p.resultLine || COPY.pollNoVotes);
          var poles = box.querySelectorAll('[data-pdxdr-vote]');
          for (var i = 0; i < poles.length; i++) {
            var on = poles[i].getAttribute('data-pdxdr-vote') === String(p.mine || '');
            poles[i].setAttribute('aria-pressed', on ? 'true' : 'false');
            poles[i].className = 'pdxdr-pole' + (on ? ' is-mine' : '');
          }
        } catch (e) {}
      }
      say((p && p.message) || COPY.pollVoted, btn);
    });
    return false;
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  // A stub that records intent, and it says exactly that when it succeeds. It
  // moves nothing: no post is hidden, reordered or scored by being reported,
  // because there is no column in these tables for a report to move.
  function flag(postId, btn) {
    var id = parseInt(String(postId), 10);
    if (!(id > 0)) return false;
    if (btn) { try { btn.disabled = true; } catch (e) {} }
    api('/flag', { method: 'POST', body: { postId: id, reason: 'reader_report' } })
      .then(function (res) {
        if (btn) {
          try {
            btn.textContent = res.ok ? 'Reported' : COPY.flag;
            btn.disabled = !!res.ok;
            btn.title = res.ok
              ? COPY.flagRecorded
              : ((res.data && res.data.error) || 'That did not send.');
          } catch (e) {}
        }
      });
    return false;
  }

  // ── DELEGATION ────────────────────────────────────────────────────────────
  // One listener for the whole surface: the chips in both mounts, the composer,
  // and the report control. A chip is a real anchor, so a modified click (new
  // tab, new window, middle button) is left entirely alone — the address is meant
  // to work as an address.
  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        if (!ev) return;
        var t = ev.target;
        if (!t || !t.closest) return;

        var chip = t.closest('[data-pdxdr-open]');
        if (chip) {
          if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey ||
              ev.shiftKey || ev.altKey) return;
          var parts = String(chip.getAttribute('data-pdxdr-open') || '').split('|');
          if (parts.length === 2 && enter(parts[0], parts[1])) ev.preventDefault();
          return;
        }

        var v = t.closest('[data-pdxdr-vote]');
        if (v) {
          ev.preventDefault();
          vote(v.getAttribute('data-pdxdr-vote'), v);
          return;
        }

        var a = t.closest('[data-pdxdr-attest]');
        if (a) {
          ev.preventDefault();
          attest(a);
          return;
        }

        var g = t.closest('[data-pdxdr-grant]');
        if (g) {
          ev.preventDefault();
          grant(g);
          return;
        }

        var f = t.closest('[data-pdxdr-flag]');
        if (f) {
          ev.preventDefault();
          flag(f.getAttribute('data-pdxdr-flag'), f);
        }
      }, true);
    } catch (e) {}

    try {
      document.addEventListener('submit', function (ev) {
        var t = ev && ev.target;
        if (!t || !t.matches || !t.matches('[data-pdxdr-form="1"]')) return;
        ev.preventDefault();
        submit(t);
      }, true);
    } catch (e) {}

    try {
      document.addEventListener('keydown', function (ev) {
        if (_open && ev && ev.key === 'Escape') { ev.preventDefault(); close(); }
      });
    } catch (e) {}

    // Back/forward across rooms and out of one. The address is the state, so the
    // panel follows it rather than keeping a history of its own.
    try {
      window.addEventListener('popstate', function () {
        var r = fromPath(location.pathname);
        if (r) enter(r.districtKey, r.issueKey);
        else if (_open) {
          _open = false; _room = null;
          var overlay = el(ID);
          if (overlay) {
            try { overlay.hidden = true; } catch (e) {}
            try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
            try { overlay.style.setProperty('display', 'none', 'important'); } catch (e) {}
          }
          unlock();
        }
      });
    } catch (e) {}
  }

  window.PDXDistrictRoom = {
    PREFIX: PREFIX,
    PATH_RE: PATH_RE,
    DISTRICT_KEY_RE: DISTRICT_KEY_RE,
    ISSUE_KEY_RE: ISSUE_KEY_RE,
    COPY: COPY,
    path: path,
    fromPath: fromPath,
    districtKeyFor: districtKeyFor,
    myDistricts: myDistricts,
    // The two mounts, and there are only two.
    seatMountHtml: seatMountHtml,
    issueMountHtml: issueMountHtml,
    // The room's door.
    enter: enter,
    close: close,
    isOpen: function () { return !!_open; },
    room: function () { return _room ? { districtKey: _room.districtKey, issueKey: _room.issueKey } : null; }
  };

  wire();

  // ── ARRIVAL ───────────────────────────────────────────────────────────────
  // A cold arrival on /d/<district>/<issue> is served this same index.html by the
  // 200 rewrite in netlify.toml, so the path is all the app has to go on. Opened
  // on the next tick and again on load, so a reader who followed a citation lands
  // in the room rather than on the front page.
  (function boot() {
    var r = fromPath();
    if (!r) return;
    var kicked = false;
    var kick = function () {
      if (kicked) return;
      kicked = true;
      enter(r.districtKey, r.issueKey);
    };
    try { setTimeout(kick, 0); } catch (e) {}
    try { window.addEventListener('load', kick); } catch (e) {}
  })();
})();
