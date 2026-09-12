/* ─────────────────────────────────────────────────────────────────────────────
   district-file.js — the district file, one page per Utah district
   ─────────────────────────────────────────────────────────────────────────────
   THE ADDRESS THIS MODULE OWNS: /d/<districtKey>. Exactly one segment after the
   prefix, and that is what makes it a different address from the District Room's
   /d/<districtKey>/<issueKey> rather than a special case of it. PATH_RE below
   refuses a second segment, PDXDistrictRoom.PATH_RE requires one, and neither
   regex can match what the other one owns — so a room's address is never opened
   as a file and a file's address is never opened as a room.

   WHY IT EXISTS. A neighbour who wants to talk to their district had two ways in
   and both were wrong. One was a pasted /d/<district>/<issue> URL, which only
   somebody who already knew the room existed could produce. The other was the
   open forum, which is site-wide, ranked and about any topic at all — the exact
   opposite of one district talking about one issue. This page is the third way:
   a door with the district's name on it, listing the rooms that district has.

   WHAT IS ON IT, AND IN THIS ORDER:
     · the district's own name, as dd_districts spells it
     · the seated member, as a link to their person file and nothing more
     · one line saying what this place is and who may post in it
     · the list of issue rooms, each row an issue, its counts if it has any, and
       a way in
   The first three are the LETTERHEAD and the last one scrolls. The seated member
   is up there rather than in the list because who holds the seat is a fact about
   the district in the same way its name is — and because the letterhead is
   painted from the ADDRESS the moment the panel opens, so the officeholder is on
   the page before either GET returns. /d/ut-statehouse-68 names the seat by
   itself; a reader who cannot be placed, a read that is slow and a read that
   never lands cannot cost anybody the name.

   WHAT IS NOT ON IT. No party letter, no score, no grade, no composite
   percentage, no Direction Match, no forum, no floors, no offline pack, no
   payment and no message. The seated member appears as a NAME AND AN ADDRESS:
   this page is a door into a conversation between neighbours, and hanging a
   verdict about their representative over it would make the conversation about
   the verdict.

   AND IT ASKS FOR NOTHING. This surface does not Ask to be verified, does not
   Grant anybody anything, does not answer a poll and does not post. Every one of
   those lives inside a room, behind the gate that owns it
   (netlify/lib/district-room-core.mjs), and residency is completely untouched by
   anything here — there is no request body in this module at all, only two GETs.

   THE TWO WAYS A ROW GETS ON THE LIST, and there are only two:
     1. THE ROOM ALREADY EXISTS. A dd_threads row for (this district, that
        issue). This is the authority, it comes from the district-room API, and it
        is the branch lands_preserve arrives on for Utah State House District 68.
     2. THE SEATED MEMBER HAS A READABLE FORMAL PATTERN ON THE ISSUE. Which
        issues those are is the record lane's answer, not this module's:
        /api/voting-record/member/:pid/issue-keys applies the floor and this
        module prints what it is handed. Every such key is then checked against
        the district-room API's own issue vocabulary, because a suggestion is only
        a door if a room could exist behind it.
   There is no third branch, and in particular there is no row per ISSUE_MAP key.
   121 issue keys times every Utah district would be fourteen thousand empty
   rooms, and an empty room presented as a place to go is a lie about where the
   conversation is.

   ONE DISTRICT SHIPS TODAY. SHIPPED below is the whole allow-list. Every other
   Utah key — mapped, seeded, perfectly real — says there is no district file yet,
   which is true, and is a better answer than a page of doors nobody is behind.
   Adding a district is adding a line to that object.

   ORDER. Alphabetical by the issue's printed label, and nothing else. A room's
   counts do not move it, a longer record does not move it, and there is no query
   parameter that reorders the list. The first room in a district and its
   hundredth are printed the same size.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var API = '/api/district-room/district';
  var MEMBER_API = '/api/voting-record/member/';

  // The file's own address. One segment, and the trailing slash is optional so a
  // shared link that picked one up still lands.
  var PREFIX = '/d/';
  var PATH_RE = /^\/d\/([^/]+)\/?$/;

  // The same two shapes the room's own module spells, repeated rather than
  // imported because this file is loaded as a plain script and has to be able to
  // refuse a malformed address before PDXDistrictRoom is on the page.
  var DISTRICT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ISSUE_KEY_RE = /^[a-z0-9_]+$/;

  // THE ALIAS, AND THERE IS STILL ONLY ONE DISTRICT MAP. 'ut-hd-68' is
  // 'ut-statehouse-68' written short: the same place, the same row, the same
  // file, two spellings of one string. Every spelling is normalized by
  // normalizeKey() before anything else looks at it, so the canonical key is the
  // only one that reaches SHIPPED, an href, a request or the address bar — and a
  // reader who followed the short link ends up standing at the canonical URL
  // rather than at a second address for one seat.
  var ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
  var ALIAS_CHAMBERS = { hd: 'statehouse', sd: 'statesenate', cd: 'house' };

  function normalizeKey(raw) {
    var k = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!k) return '';
    if (DISTRICT_KEY_RE.test(k)) return k;
    var m = ALIAS_RE.exec(k);
    if (!m) return '';
    var chamber = ALIAS_CHAMBERS[m[2]];
    if (!chamber) return '';
    var out = m[1] + '-' + chamber + '-' + m[3];
    return DISTRICT_KEY_RE.test(out) ? out : '';
  }

  // THE WHOLE ALLOW-LIST. See the header.
  var SHIPPED = { 'ut-statehouse-68': 1 };

  var COPY = {
    kick: 'District File',
    line: 'Neighbors, issue by issue. Reading is open. Posting takes a reviewer grant.',
    seatedHd: 'Seated member',
    seatedNone: 'We have not resolved who holds this seat.',
    roomsHd: 'Issue rooms',
    roomsNote: 'A room is one district talking about one issue. Rooms already open ' +
      'are here, and so are the issues this seat has a formal record on.',
    open: 'Open room',
    busy: 'Opening the district file…',
    noFile: 'No district file yet for that district.',
    gone: 'That district file did not open.',
    noRooms: 'No issue rooms in this district yet.',
    noAnswers: 'No answers yet.',
    // THE ONE CONTROL THE QUIET ROOMS SIT BEHIND. It says what is behind it —
    // issues this seat touches — rather than "show more", because a reader
    // deciding whether to open it is deciding whether they care about the
    // subjects, not about the number.
    roomsFold: 'More issues this seat touches'
  };

  var ID = 'pdx-district-file';
  var ID_TITLE = 'pdx-district-file-title';
  var ID_HEAD = 'pdx-district-file-head';
  var ID_BODY = 'pdx-district-file-scroll';
  // The scroller's three children, painted in this order: District Voice first,
  // then "This seat's ballot" — the officials this district answers to, as links
  // to person files that already exist — then the issue rooms under both. Each is
  // its own container because each is its own module's, and both of the first two
  // fail soft to an empty div this file leaves alone.
  var ID_VOICE = 'pdx-district-file-voice';
  var ID_BALLOT = 'pdx-district-file-ballot';
  var ID_ROOMS = 'pdx-district-file-rooms';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  // Answers '' for anything that is not a district this app ships a file for, so
  // there is no way to build a link to a file that does not exist. Every caller
  // — the seat mount's control, the rows, the boot — goes through this.
  function path(districtKey) {
    var k = normalizeKey(districtKey);
    if (!k) return '';
    if (!Object.prototype.hasOwnProperty.call(SHIPPED, k)) return '';
    return PREFIX + k;
  }

  // Does this district have a file? The one question the District Room's seat
  // mount asks before it prints a control pointing here.
  function has(districtKey) {
    return !!path(districtKey);
  }

  // ── DOES DISTRICT VOICE LEAD THIS SEAT'S FILE? ────────────────────────────
  // Asked of PDXVoice rather than answered here, so this module holds no second
  // copy of the Voice allow-list and a seat that opens tomorrow needs no line in
  // this file. Two callers, one answer: the letterhead (which drops the rooms
  // lede when Voice is about to print its own frame sentence) and the mount.
  //
  // FAILS SOFT TO FALSE, and that is the whole twin-boot guarantee. A boot
  // without district-voice.js — a device that took this file and not that one, a
  // seat Voice has not opened — is a ROOMS-ONLY file, and a rooms-only file keeps
  // the rooms lede, byte-identical to what it printed before Voice existed.
  function voiceHere(districtKey) {
    try {
      var V = window.PDXVoice;
      return !!(V && fn(V.shipped) && V.shipped(districtKey));
    } catch (e) { return false; }
  }

  // The district this address names, or null. Deliberately strict in both
  // directions: a second segment is a room and not a file, and a district we do
  // not ship a file for is not a file either.
  function fromPath(p) {
    var s = String(p == null ? (function () {
      try { return location.pathname; } catch (e) { return ''; }
    })() : p);
    var m = PATH_RE.exec(s);
    if (!m) return null;
    // The alias resolves here too, so a cold arrival on /d/ut-hd-68 opens the
    // canonical file instead of falling through to the front page.
    var k = normalizeKey(m[1]);
    return k || null;
  }

  // ── READS ─────────────────────────────────────────────────────────────────
  // Two GETs, no body, no Authorization header and no token. Reading a district
  // file is open to everybody, which means it is open to a signed-out visitor
  // with no account, no location and no residency — so this module never asks who
  // is looking, and there is nothing in either request that could tell it.
  function get(url) {
    return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      })
      .catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // ── LABELS AND PEOPLE, BORROWED ───────────────────────────────────────────
  // The issue's printed name, resolved through the same two owners the room's
  // chips use, so a chip on this page and the same chip inside the room never
  // disagree about what the issue is called.
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

  // WHO HOLDS THE SEAT, and it is a fact about the ADDRESS rather than about the
  // reader. window.pdxRepsForMe and window.pdxSeatHolders both need the visitor's
  // own location and answer nothing for a visitor we cannot place; this page's
  // URL already names the district, so it asks the location-independent resolver
  // in ballot-breakdown.js instead. A signed-out reader three states away sees
  // the same officeholder as a neighbour, because there is only one.
  //
  // THE DISTRICT KEY IS THE AUTHORITY, and the payload is only a shortcut. The
  // resolver reads 'ut-statehouse-68' on its own — the composed key carries the
  // chamber and the number — so the seat is answerable from the address the
  // reader arrived on, before the district read returns and whatever the payload
  // spells its seat fields as. This page printed "we have not resolved who holds
  // this seat" over HD-68 for exactly that reason: the seat was asked for in one
  // shape only, and the resolver's answer was thrown away when that shape was not
  // the one to hand. The pair is still tried first, because a district whose key
  // this app has not shipped yet is still resolvable from a payload.
  function seatedPid(districtKey, data) {
    try {
      if (!fn(window.pdxSeatedMemberFor)) return '';
      var pid = window.pdxSeatedMemberFor(data && data.seatKey, data && data.districtNumber);
      if (!pid) pid = window.pdxSeatedMemberFor(districtKey);
      return pid ? String(pid) : '';
    } catch (e) { return ''; }
  }

  function personName(pid) {
    try {
      if (fn(window._pdxPersonById)) {
        var p = window._pdxPersonById(pid);
        if (p && p.name) return String(p.name);
      }
    } catch (e) {}
    return String(pid || '');
  }

  function personOffice(pid) {
    try {
      if (fn(window._pdxPersonById)) {
        var p = window._pdxPersonById(pid);
        if (p && p.office) return String(p.office);
      }
    } catch (e) {}
    return '';
  }

  // THE PLACE, AND IT IS QUOTED RATHER THAN WRITTEN. A seat file that says only
  // "Utah State House District 68" tells a neighbour the number of the box they
  // live in and nothing about where that is. The roster already carries the
  // answer — chew_h68's own row spells the district as "UT District 68 (Vernal,
  // Uintah / Duchesne County)" — so this reads the parenthetical out of that one
  // string and prints it. NO GEOGRAPHY IS INVENTED HERE: there is no county
  // table, no basin name and no region map in this module, and a roster row
  // without a parenthetical prints nothing at all rather than a guess. The
  // district's own label is still the title; this is the line under it.
  //
  // ONE FIELD, AND ONLY ONE. It reads .state and nothing else off that row. The
  // same row carries a party letter and a score, which is exactly why this
  // function names the field it wants instead of handing the row to a formatter.
  var PLACE_RE = /\(([^)]+)\)/;
  function placeLine(pid) {
    try {
      if (!fn(window._pdxPersonById)) return '';
      var p = window._pdxPersonById(pid);
      var where = p && p.state ? String(p.state) : '';
      var m = PLACE_RE.exec(where);
      var inner = m ? String(m[1]).trim() : '';
      return inner && inner.length < 90 ? inner : '';
    } catch (e) { return ''; }
  }

  // THE FACE, FROM THE RESOLVER THAT ALREADY HAS IT. No new map, no new address
  // and no fallback silhouette: a person this app has no photo for gets a row
  // with no photo in it, which is the honest shape of not having one.
  function photoUrl(pid) {
    try {
      if (!fn(window._getPhotoUrl)) return '';
      var u = window._getPhotoUrl(pid);
      return u ? String(u) : '';
    } catch (e) { return ''; }
  }

  // THE ISSUE'S OWN COLOUR, as inline custom properties, from the one module that
  // owns the mapping. This file holds no per-issue rule, so it cannot disagree
  // with the room, the person file or Voice about what colour an issue is. A key
  // that maps to no Core National Issue gets an EMPTY string here — deliberately,
  // so an unrecognised subject wears the neutral rail rather than being dressed
  // up as a recognised one.
  function icAttr(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || !fn(C.skin)) return '';
      var sk = C.skin(String(key == null ? '' : key), window.PDXIssueFamily);
      return (sk && sk.attr) ? String(sk.attr) : '';
    } catch (e) { return ''; }
  }

  // THE FAMILY A ROOM BELONGS TO, for grouping only. Same two owners as the
  // label, and the same rule: if the mapping module is not on the page, or the
  // key is not in it, this returns null and the rooms print as one flat list. A
  // heading is never invented for a family this app cannot name.
  function familyOf(key) {
    try {
      var F = window.PDXIssueFamily;
      if (!F || !fn(F.coreOf) || !fn(F.label)) return null;
      var core = F.coreOf(String(key == null ? '' : key));
      if (!core) return null;
      var lab = F.label(core);
      return lab ? { id: String(core), label: String(lab) } : null;
    } catch (e) { return null; }
  }

  // THE SEATED MEMBER'S BLOCK. A face, a name, the office they hold, and a link
  // to their person file. That is the whole of it: no party letter, no score, no
  // grade, no kept/broken tally and no percentage — see the header for why. The
  // link is built by PDXPersonLink so this page opens a person file exactly the
  // way every other surface does rather than hand-rolling a /p/ href.
  //
  // IT IS AN IDENTITY ROW, NOT A CARD. Photo at 40px, the label above the name,
  // the office under it — small enough to read as "who holds this seat" in one
  // glance and deliberately not big enough to become the subject of the page.
  // The question below it is the subject. The photo is FAIL-SOFT in both
  // directions: no resolver on the page and no photo for this person both come
  // out as a row with no image element in it, and the row does not resize.
  function seatedHtml(districtKey, data) {
    var pid = seatedPid(districtKey, data);
    if (!pid) {
      return '<p class="pdxdf-seat pdxdf-seat--none">' +
        '<span class="pdxdf-seat-hd">' + esc(COPY.seatedHd) + '</span>' +
        '<span class="pdxdf-seat-muted">' + esc(COPY.seatedNone) + '</span></p>';
    }
    var name = personName(pid);
    var office = personOffice(pid);
    var face = photoUrl(pid);
    var link = name;
    try {
      var L = window.PDXPersonLink;
      if (L && fn(L.anchor)) link = L.anchor(pid, name, { cls: 'pdxdf-seat-link' });
    } catch (e) { link = esc(name); }
    if (link === name) link = '<a class="pdxdf-seat-link" href="/p/' + esc(pid) + '">' + esc(name) + '</a>';
    return '<p class="pdxdf-seat">' +
      (face
        ? '<img class="pdxdf-seat-face" src="' + esc(face) + '" alt="" ' +
            'loading="lazy" decoding="async" width="40" height="40">'
        : '') +
      '<span class="pdxdf-seat-id">' +
        '<span class="pdxdf-seat-hd">' + esc(COPY.seatedHd) + '</span>' +
        link +
        (office ? '<span class="pdxdf-seat-office">' + esc(office) + '</span>' : '') +
      '</span>' +
      '</p>';
  }

  // ── THE HEADER ────────────────────────────────────────────────────────────
  // The district's own label, from dd_districts, and the file's address printed
  // where a letterhead prints a file number — and then the seated member, which
  // is on the LETTERHEAD rather than in the scrolling body because it is a fact
  // about the district in the same way the label is. It is also the one part of
  // this page that needs nothing from the network: the seat resolves from the
  // district key, so a neighbour arriving cold reads who holds their seat while
  // the two GETs are still out, and a read that never lands cannot cost them the
  // name. The body below repaints as the rooms arrive; this line does not have to.
  //
  // ONE LEDE, NOT TWO. COPY.line describes a page of ROOMS — reading is open,
  // posting takes a reviewer grant — and on a seat where District Voice has
  // opened it was printing directly above Voice's own frame sentence, which
  // describes something else entirely and is the one line that block is required
  // to carry. Two ledes stacked on one letterhead make the reader arbitrate
  // between them, and the wrong one was on top. So on a Voice seat this line is
  // not printed at all and Voice's frame is the file's lede; on a rooms-only
  // seat it is exactly the line it has always been. Neither sentence was
  // rewritten to make that work.
  function headHtml(districtKey, data) {
    var label = (data && data.label) || districtKey;
    var p = path(districtKey);
    var where = placeLine(seatedPid(districtKey, data));
    return '<p class="pdxdf-kick">' + esc(COPY.kick) + (p ? ' · ' + esc(p) : '') + '</p>' +
      '<h2 class="pdxdf-title" id="' + ID_TITLE + '">' + esc(label) + '</h2>' +
      (where ? '<p class="pdxdf-place">' + esc(where) + '</p>' : '') +
      seatedHtml(districtKey, data) +
      (voiceHere(districtKey)
        ? ''
        : '<p class="pdxdf-line">' + esc(COPY.line) + '</p>');
  }

  // ── THE LIST ──────────────────────────────────────────────────────────────
  // Merges the two branches into ONE list of rows. An issue that is both an open
  // room and on the seat's record appears ONCE, as the room — the room is the
  // stronger fact and the counts come with it.
  //
  // `results` is only carried where the server sent some. It is three integers
  // and this function does no arithmetic on them: they are not added, not divided
  // and not drawn, because a proportion drawn as a length reads as a grade. The
  // percent sign does not appear in this module at all.
  function rows(data, recordKeys) {
    var vocab = {};
    var list = (data && data.issueKeys) || [];
    var i;
    for (i = 0; i < list.length; i++) vocab[String(list[i])] = 1;

    var out = [];
    var seen = {};
    var rooms = (data && data.rooms) || [];
    for (i = 0; i < rooms.length; i++) {
      var r = rooms[i] || {};
      var rk = String(r.issueKey || '');
      if (!ISSUE_KEY_RE.test(rk) || seen[rk]) continue;
      seen[rk] = 1;
      out.push({
        issueKey: rk,
        label: issueLabel(rk),
        line: r.answered === true ? String(r.resultLine || '') : COPY.noAnswers
      });
    }
    for (i = 0; i < recordKeys.length; i++) {
      var k = String(recordKeys[i] || '');
      // A suggestion is only a door if a room could exist behind it: the key has
      // to be in the vocabulary the district-room API itself keeps.
      if (!ISSUE_KEY_RE.test(k) || seen[k] || !vocab[k]) continue;
      seen[k] = 1;
      out.push({ issueKey: k, label: issueLabel(k), line: COPY.noAnswers });
    }
    out.sort(function (a, b) {
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    return out;
  }

  function rowHtml(districtKey, row) {
    var href = '';
    try {
      var R = window.PDXDistrictRoom;
      if (R && fn(R.path)) href = R.path(districtKey, row.issueKey);
    } catch (e) { href = ''; }
    if (!href) href = '/d/' + districtKey + '/' + row.issueKey;
    return '<li class="pdxdf-row"' + icAttr(row.issueKey) + '>' +
        '<span class="pdxdf-issuechip">' + esc(row.label) + '</span>' +
        '<span class="pdxdf-counts">' + esc(row.line) + '</span>' +
        '<a class="pdxdf-open" href="' + esc(href) + '"' +
          ' data-pdxdf-room="' + esc(districtKey + '|' + row.issueKey) + '">' +
          esc(COPY.open) + '</a>' +
      '</li>';
  }

  // GROUPED BY FAMILY, IN THE ORDER THE ROWS ALREADY ARRIVED IN. The rows are
  // still alphabetical by printed label — rows() is untouched and nothing here
  // sorts, counts, weights or promotes anything. A family heading appears at the
  // point its first room appears, so the grouping reorders NOTHING: it only draws
  // a line between the subjects a reader was already scrolling past in that
  // order. Where the mapping module cannot name a family, every row falls into
  // one unheaded bucket and the output is the flat list it has always been.
  function groupedHtml(districtKey, list) {
    var order = [];
    var buckets = {};
    var i;
    for (i = 0; i < list.length; i++) {
      var f = familyOf(list[i].issueKey);
      var slot = 'f_' + (f ? f.id : '');
      if (!buckets[slot]) {
        buckets[slot] = { label: f ? f.label : '', rows: [] };
        order.push(slot);
      }
      buckets[slot].rows.push(list[i]);
    }
    var out = '';
    for (i = 0; i < order.length; i++) {
      var b = buckets[order[i]];
      out += (b.label ? '<p class="pdxdf-fam">' + esc(b.label) + '</p>' : '') +
        '<ul class="pdxdf-list">' + b.rows.map(function (r) {
          return rowHtml(districtKey, r);
        }).join('') + '</ul>';
    }
    return out;
  }

  // TWO KINDS OF ROOM, AND THEY ARE NOT PEERS ON THE PAGE. A room somebody has
  // answered has something in it to read; a room whose whole content is "No
  // answers yet." is a door. The page used to print eight of them at identical
  // weight, so the four sentences worth reading were buried under four that were
  // not, and the list read as a wall of the same paragraph.
  //
  // So the answered rooms stay open at full size and the quiet ones fold behind
  // ONE control. NOT A RANKING: the split is on whether a room has any answer at
  // all, which is the same yes/no the row's own line already prints, and within
  // each group the order is untouched. A room with one answer and a room with
  // four hundred sit in the same group at the same size, because the fold is
  // about whether there is anything to read, never about how much.
  //
  // A <details> is the control, so the fold works with no JavaScript at all and
  // announces its own state to a screen reader without this module describing it.
  // The open/closed choice is remembered in _fold only because this page paints
  // twice per visit and a reader who opened the fold should not have it shut
  // under them when the second read lands.
  function listHtml(districtKey, data, recordKeys) {
    var rs = rows(data, recordKeys);
    var head = '<p class="pdxdf-listhd">' + esc(COPY.roomsHd) + '</p>' +
      '<p class="pdxdf-listnote">' + esc(COPY.roomsNote) + '</p>';
    if (!rs.length) {
      return head + '<p class="pdxdf-empty">' + esc(COPY.noRooms) + '</p>';
    }
    var live = [];
    var quiet = [];
    for (var i = 0; i < rs.length; i++) {
      (rs[i].line === COPY.noAnswers ? quiet : live).push(rs[i]);
    }
    var body = live.length ? groupedHtml(districtKey, live) : '';
    if (quiet.length) {
      body += '<details class="pdxdf-fold"' + (_fold ? ' open' : '') + '>' +
        '<summary class="pdxdf-foldhd" data-pdxdf-fold="1">' +
          '<span class="pdxdf-foldlabel">' + esc(COPY.roomsFold) + '</span>' +
          '<span class="pdxdf-foldn">' + esc(String(quiet.length)) + '</span>' +
        '</summary>' +
        groupedHtml(districtKey, quiet) +
      '</details>';
    }
    return head + body;
  }

  // ── THE PANEL ─────────────────────────────────────────────────────────────
  var _built = false;
  var _open = false;
  var _key = '';
  var _return = '';
  // Whether the reader has opened the quiet-rooms fold on this visit. Survives
  // the second paint; reset when the file closes, because the next district is a
  // different list of rooms.
  var _fold = false;

  function build() {
    if (_built) return el(ID);
    var d;
    try { d = document; } catch (e) { return null; }
    if (!d || !fn(d.createElement) || !d.body) return null;

    var overlay = d.createElement('div');
    overlay.id = ID;
    overlay.className = 'pdxdf';
    overlay.hidden = true;
    try {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', ID_TITLE);
      overlay.setAttribute('aria-hidden', 'true');
    } catch (e) {}
    try { overlay.style.display = 'none'; } catch (e) {}

    var panel = d.createElement('div');
    panel.className = 'pdxdf-panel';

    var top = d.createElement('div');
    top.className = 'pdxdf-top';

    var head = d.createElement('div');
    head.id = ID_HEAD;
    head.className = 'pdxdf-head';

    var x = d.createElement('button');
    x.className = 'pdxdf-x';
    try {
      x.setAttribute('type', 'button');
      x.setAttribute('aria-label', 'Close the district file');
      x.setAttribute('title', 'Close');
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    } catch (e) {}
    try { x.addEventListener('click', function () { close(); }); } catch (e) {}

    var body = d.createElement('div');
    body.id = ID_BODY;
    body.className = 'pdxdf-body';

    try { top.appendChild(head); top.appendChild(x); } catch (e) {}
    try { panel.appendChild(top); panel.appendChild(body); } catch (e) {}
    try { overlay.appendChild(panel); } catch (e) {}
    // Before #pdx-district-room when that exists, for the reason district-room.js
    // documents about the person modal: these panels share a z-index, so document
    // order decides which covers which, and a ROOM opened from a FILE has to land
    // on top of the file rather than under it.
    try {
      var host = el('pdx-district-room') || el('modal-overlay');
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

  function lock() { try { document.body.style.overflow = 'hidden'; } catch (e) {} }
  function unlock() { try { document.body.style.overflow = ''; } catch (e) {} }

  function show(overlay) {
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try { overlay.style.setProperty('display', 'flex', 'important'); } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
  }

  function stamp(districtKey) {
    var p = path(districtKey);
    if (!p) return;
    try {
      if (location.pathname === p) return;
      // A reader who arrived on the alias is being moved to the canonical URL for
      // the SAME file, so there is nothing behind them to restore — going "back"
      // to the alias would just re-open this panel. Home is the honest return.
      _return = fromPath(location.pathname) ? '/' : (location.pathname + (location.search || ''));
      if (history && fn(history.pushState)) history.pushState({ pdxdf: 1 }, '', p);
    } catch (e) {}
  }

  function restore() {
    try {
      if (!fromPath(location.pathname)) return;
      var back = _return || '/';
      if (history && fn(history.pushState)) history.pushState({ pdxdf: 0 }, '', back);
    } catch (e) {}
  }

  function busy() {
    var body = el(ID_BODY);
    if (!body) return;
    try {
      body.innerHTML = '<p class="pdxdf-busy" role="status">' + esc(COPY.busy) + '</p>';
    } catch (e) {}
  }

  function note(msg) {
    var body = el(ID_BODY);
    if (!body) return;
    try { body.innerHTML = '<p class="pdxdf-busy" role="status">' + esc(msg) + '</p>'; } catch (e) {}
  }

  // ── THE HANDOFF FROM A PERSON FILE ────────────────────────────────────────
  // "Neighbors in this seat" is one quiet line on a person file, and tapping it
  // is a request to LEAVE the person and stand in the place. It was already a
  // real anchor with a real href; what it was not was a working control, and the
  // reason was stacking rather than markup. The person modal and this panel share
  // z-index 50 — the number both need to clear the site's fixed nav — so which
  // one covers which is decided by document order, and build() deliberately
  // inserts this overlay BEFORE #modal-overlay so that a ROOM opened from a FILE
  // lands on top of the file. The same order puts the file UNDER a person modal
  // that is still open, and a reader who tapped the line watched nothing happen.
  //
  // Reordering the overlays would trade this defect for that one. So the person
  // file is closed instead, which is also what the reader asked for: the two
  // surfaces are alternatives, not a stack, and nobody wants a district file
  // hidden behind the member whose file they just left. The homepage's own
  // Spotlight settled this the same way years earlier — "a profile modal must
  // never be left lurking" — and this is that rule, applied to this panel.
  //
  // closeModal() is NOT edited and is not asked to behave differently. It is
  // called only when the overlay is actually displayed, because closing an
  // already-closed modal still runs person-file.js's address restore and would
  // rewrite the bar out from under a reader who never opened a person at all.
  // And it is called BEFORE stamp(), so the address the person file hands back is
  // the address this file captures as its return — a close, then an open, in the
  // order a reader would describe them.
  function modalUp(over) {
    try {
      if (!over) return false;
      if (over.hidden) return false;
      // The inline value is the one that actually decides this in production:
      // index.html ships the overlay with style="display:none", openModal sets
      // flex and closeModal sets none, so the attribute is never absent on a real
      // page. The computed fallback is for a page that styled it some other way,
      // and it demands an AFFIRMATIVE value — an environment that cannot answer
      // is read as "not up", because closing a modal nobody opened rewrites the
      // address for no reason.
      var inline = over.style && over.style.display;
      if (inline) return inline !== 'none';
      var g = window.getComputedStyle;
      if (!fn(g)) return false;
      var disp = g(over).display;
      return !!disp && disp !== 'none';
    } catch (e) { return false; }
  }

  function handoff() {
    try {
      if (!modalUp(el('modal-overlay'))) return false;
      if (!fn(window.closeModal)) return false;
      window.closeModal();
      return true;
    } catch (e) { return false; }
  }

  // ── OPEN ──────────────────────────────────────────────────────────────────
  // Paints the header from the address immediately — the district key is already
  // known, so the reader is never looking at a blank panel while the read is out
  // — then paints the list the two GETs returned. A read that fails says so
  // rather than showing an empty list, because "no rooms yet" and "we could not
  // reach the district" are different facts.
  function enter(districtKey) {
    var k = normalizeKey(districtKey);
    if (!k || !has(k)) return false;
    handoff();
    var overlay = build();
    if (!overlay) return false;

    _key = k;
    _open = true;
    var head = el(ID_HEAD);
    if (head) { try { head.innerHTML = headHtml(k, null); } catch (e) {} }
    busy();
    show(overlay);
    lock();
    stamp(k);
    try {
      var scroller = el(ID_BODY);
      if (scroller) scroller.scrollTop = 0;
    } catch (e) {}
    load(k);
    return true;
  }

  function load(districtKey) {
    get(API + '?district=' + encodeURIComponent(districtKey)).then(function (res) {
      if (_key !== districtKey || !_open) return;
      if (res.status === 404) { note(COPY.noFile); return; }
      if (!res.ok) { note((res.data && res.data.error) || COPY.gone); return; }
      var data = res.data;
      var head = el(ID_HEAD);
      if (head) { try { head.innerHTML = headHtml(districtKey, data); } catch (e) {} }

      var pid = seatedPid(districtKey, data);
      // The record branch is BEST EFFORT and the page does not wait on it being
      // there: a district whose seat we cannot resolve, or a record read that
      // fails, still prints every room that exists. The rooms are the authority;
      // the record only ever adds.
      var recordRead = pid
        ? get(MEMBER_API + encodeURIComponent(pid) + '/issue-keys').then(function (r) {
            if (!r.ok) return [];
            var rs = (r.data && r.data.rows) || [];
            return rs.map(function (x) { return String((x && x.issueKey) || ''); });
          })
        : Promise.resolve([]);

      // The rooms are painted as soon as they arrive rather than behind the
      // record read, so the door a neighbour came for is never waiting on a
      // second request.
      paint(districtKey, data, []);
      recordRead.then(function (keys) {
        if (_key !== districtKey || !_open) return;
        if (!keys.length) return;
        paint(districtKey, data, keys);
      });
    });
  }

  // THREE CONTAINERS, PAINTED IN THIS ORDER: District Voice first, the seat's
  // ballot strip under it, the issue rooms under both. Voice is the belonging layer for the SEAT — one live question and
  // the neighbours' own takes — and the rooms are the per-issue conversations,
  // each of which still lives at its own /d/<district>/<issue> address and is
  // reached from the list below exactly as before. Nothing about a room moved.
  //
  // The split also exists because paint() runs TWICE on one open: once as soon as
  // the rooms arrive and again if the best-effort record read adds issue keys. A
  // single innerHTML for the whole panel would tear down Voice's poll and
  // composer mid-typing on that second pass, so the rooms are the only thing
  // repainted and Voice is mounted exactly once per open.
  function paint(districtKey, data, recordKeys) {
    var body = el(ID_BODY);
    if (!body) return;
    var rooms = el(ID_ROOMS);
    if (!rooms) {
      try {
        body.innerHTML =
          '<div id="' + ID_VOICE + '" class="pdxdf-voice"></div>' +
          '<div id="' + ID_BALLOT + '" class="pdxdf-ballot"></div>' +
          '<div id="' + ID_ROOMS + '" class="pdxdf-rooms"></div>';
      } catch (e) { return; }
      rooms = el(ID_ROOMS);
      voiceMount(districtKey, recordKeys || []);
      ballotMount(districtKey);
    } else {
      // Second pass: hand the record keys to Voice's composer rather than
      // remounting it, so a half-typed take survives.
      voiceIssues(recordKeys || []);
    }
    if (!rooms) return;
    try {
      // The seated member is not repainted here: it is on the letterhead, it was
      // resolved from the address on arrival, and a repaint of the rooms is not a
      // reason for the name to flicker.
      rooms.innerHTML = listHtml(districtKey, data, recordKeys || []);
    } catch (e) {}
  }

  // DISTRICT VOICE, MOUNTED IF IT IS ON THE PAGE AND SHIPPED IN THIS SEAT. Both
  // checks fail soft: a seat with no Voice, or a boot where district-voice.js has
  // not loaded, prints exactly today's file with the rooms list at the top. This
  // module never renders a poll, a take or a refusal of its own — it owns the
  // rooms, and Voice owns the seat blocks.
  function voiceMount(districtKey, recordKeys) {
    try {
      var V = window.PDXVoice;
      if (!V || !fn(V.mount) || !voiceHere(districtKey)) return;
      V.mount(districtKey, ID_VOICE, recordKeys || []);
    } catch (e) {}
  }

  // THIS SEAT'S BALLOT, MOUNTED IF IT IS ON THE PAGE AND TABLED FOR THIS
  // DISTRICT. Same terms as the Voice mount above and for the same reasons: both
  // checks fail soft, so a boot without district-ballot.js — or a district that
  // module holds no ballot for — paints exactly today's file and leaves an empty
  // div the stylesheet collapses. This module renders no name, office or line of
  // its own here; it owns the rooms, and the strip owns the officials.
  //
  // MOUNTED ONCE PER OPEN, beside Voice, for the same reason: paint() runs twice
  // on one open and the second pass repaints the rooms only. The strip reads no
  // network and holds no typing, but remounting it would still be work with no
  // question it answers differently the second time.
  function ballotMount(districtKey) {
    try {
      var B = window.PDXDistrictBallot;
      if (!B || !fn(B.mount)) return;
      B.mount(districtKey, ID_BALLOT);
    } catch (e) {}
  }

  function voiceIssues(recordKeys) {
    try {
      var V = window.PDXVoice;
      if (V && fn(V.issues)) V.issues(recordKeys || []);
    } catch (e) {}
  }

  function close() {
    _open = false;
    _key = '';
    _fold = false;
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

  function hide() {
    _open = false;
    _key = '';
    var overlay = el(ID);
    if (overlay) {
      try { overlay.hidden = true; } catch (e) {}
      try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
      try { overlay.style.setProperty('display', 'none', 'important'); } catch (e) {}
    }
    unlock();
  }

  // ── WIRING ────────────────────────────────────────────────────────────────
  // Every control on this page is a REAL ANCHOR to a real address, so it can be
  // middle-clicked, opened in a new tab and copied. These listeners only turn a
  // plain left click into an in-app open; a modified click is left to the
  // browser, which is what the modifier means.
  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        if (!ev) return;
        var t = ev.target;
        if (!t || !t.closest) return;

        // The quiet-rooms fold. The <details> does the opening on its own; this
        // only records which way the reader left it, so the second paint of this
        // visit reproduces it instead of shutting it.
        var fo = t.closest('[data-pdxdf-fold]');
        if (fo) {
          try {
            var det = fo.parentNode;
            _fold = !(det && det.open === true);
          } catch (e) { _fold = !_fold; }
          return;
        }

        // Into a room, from a row on this page.
        var r = t.closest('[data-pdxdf-room]');
        if (r) {
          if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey ||
              ev.shiftKey || ev.altKey) return;
          var parts = String(r.getAttribute('data-pdxdf-room') || '').split('|');
          try {
            var R = window.PDXDistrictRoom;
            if (parts.length === 2 && R && fn(R.enter) && R.enter(parts[0], parts[1])) {
              ev.preventDefault();
            }
          } catch (e) {}
          return;
        }

        // Into this page, from the District Room's seat mount.
        var f = t.closest('[data-pdxdf-open]');
        if (f) {
          if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey ||
              ev.shiftKey || ev.altKey) return;
          if (enter(f.getAttribute('data-pdxdf-open'))) ev.preventDefault();
        }
      }, true);
    } catch (e) {}

    try {
      document.addEventListener('keydown', function (ev) {
        if (_open && ev && ev.key === 'Escape') { ev.preventDefault(); close(); }
      });
    } catch (e) {}

    // Back/forward into this file and out of it. The address is the state.
    try {
      window.addEventListener('popstate', function () {
        var k = fromPath(location.pathname);
        if (k && has(k)) enter(k);
        else if (_open) hide();
      });
    } catch (e) {}
  }

  window.PDXDistrictFile = {
    PREFIX: PREFIX,
    PATH_RE: PATH_RE,
    DISTRICT_KEY_RE: DISTRICT_KEY_RE,
    ALIAS_RE: ALIAS_RE,
    SHIPPED: SHIPPED,
    COPY: COPY,
    // Exposed for the suite: the one place every spelling of a seat becomes the
    // canonical one.
    normalizeKey: normalizeKey,
    path: path,
    has: has,
    fromPath: fromPath,
    enter: enter,
    close: close,
    isOpen: function () { return !!_open; },
    district: function () { return _key || null; },
    // Exposed for the suite: the merge of the two branches into one ordered list,
    // asserted directly rather than inferred from painted markup.
    rows: rows,
    // Exposed for the suite for the same reason: the seated member's line for a
    // district key, so "HD-68 resolves to chew_h68" and "a district whose seat is
    // not curated says so out loud" are both asserted on the real builder.
    seatedHtml: seatedHtml,
    // And the other two builders, for the same reason again: the letterhead —
    // whose place line is read out of one roster field and must print nothing
    // when that field says nothing — and the rooms list, whose fold appears only
    // when there is a quiet room to put behind it.
    headHtml: headHtml,
    listHtml: listHtml
  };

  wire();

  // ── ARRIVAL ───────────────────────────────────────────────────────────────
  // A cold visit to /d/<districtKey> is served this same index.html by the 200
  // rewrite in netlify.toml — the same arrangement /p/<pid> uses, and the same
  // one the room's own address uses one segment deeper. The path is all the app
  // has to go on, so it is read here and opened on the next tick and again on
  // load, so a neighbour who followed a link lands on the district rather than on
  // the front page.
  //
  // A mapped Utah district with no file yet is NOT opened here: has() refuses it,
  // nothing is painted over the front page, and the address stays what the
  // visitor typed.
  (function boot() {
    var k = fromPath();
    if (!k || !has(k)) return;
    var kicked = false;
    var kick = function () {
      if (kicked) return;
      kicked = true;
      enter(k);
    };
    try { setTimeout(kick, 0); } catch (e) {}
    try { window.addEventListener('load', kick); } catch (e) {}
  })();
})();
