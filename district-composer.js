/* ═══════════════════════════════════════════════════════════════════════════
   district-composer.js — THE BOARDS THAT TAKE A VOICE (every Utah board)
   ───────────────────────────────────────────────────────────────────────────
   Loaded by every district board document: the five Layton-cluster boards
   where it first shipped (/district/ut-sd-3, ut-hd-16, ut-sd-7, ut-hd-15,
   ut-cd-2), SD-6, every generated board and the three statewide boards. It
   mounts only on a #pdx-district-composer host whose data-pdxdc-seat is on
   COMPOSER_SEATS (named rows, no pattern — the generated rows are written by
   scripts/gen-district-boards.mjs). The server's own list is the one that
   counts; this one only decides where to paint.

   THE BOX IS OFF UNTIL THE SERVER SAYS OTHERWISE. The served markup is a
   disabled field with the locked line. This module turns it on only when
   GET /api/district-board-voice answers `voice.canPost: true` for the signed-in
   caller — which needs a vendor-verified residency row for this seat. Nothing
   here can fake it: there is no local flag, no typed zip, no location claim.
   A failed read keeps the box off.

   PROVE YOU LIVE HERE. Every signed-in reader the server calls `unverified`
   for this seat — no verified residency row here — gets one button, directly
   under the locked composer. A signed-out reader and a reader already verified
   for this seat get none. Whether the check may START (a check already run,
   a revoked seat) is POST /api/residency-verify's call, not this file's: a refusal
   keeps the button on the board and prints the function's own message. This
   file holds no flag of its own and never reads the membership endpoint. It
   asks POST /api/residency-verify for a Didit session bound to
   { uid, seat, seats } — THIS board's seat plus the seats the hallway's
   resolver names for the reader's saved location — and sends the reader to the
   vendor's page. The box opens only after the vendor's signed decision (ID
   document + proof of address) reaches the server and the next GET says so —
   coming back from the vendor opens nothing on its own. That one decision
   writes a row for every covered composer seat; a board whose seat was not
   covered stays locked.

   Posts are read from the same endpoint, newest first, with no name, email or
   address on the wire. After a post lands, band 2 is re-read from the store
   through PDXDistrictBoard.refresh(), so the count the reader moved is the
   count they see.

   THE LOCKED LINE, AND NOTHING ABOUT PRICE. Every state carries the locked
   line exactly once: as the locked notice while the box is off, and under the
   heading once it opens. No price or cap copy is painted on any board — a
   monthly-cap refusal from the server is shown as a neutral line
   (COPY.notTaken), never the server's own wording.

   ONE PLAIN DOOR TO MEMBERSHIP (v428). Under the locked line, a signed-in
   reader whom GET /api/membership calls not a member gets one link, "Become
   a member", to /me#membership — no price, no cap, no promise. A signed-out
   reader and a member get none. That read decides the link and nothing
   else: canProve() and prove() never ask it, membership never gates the
   residency check, and it never opens a seat.

   THE GENERAL ROOM. Every board's first thread, painted into the frame
   district-board.js prints under the seat (#pdx-general-room) and repainted on
   every pdxdb:paint. It is "General · <the sitting member>": the comments
   GET ?room=general returns for this seat and the member who holds it now,
   newest first, under the same gate as an issue comment. The server decides
   the holder — this file never sends a pid with a post. Previous holders of
   the seat are small links under the thread ("Previous: <name>"), each opening
   that person's own general thread for this seat, read-only. ?general=<pid>
   opens one directly.

   LIKES. Every comment, general and issue, prints its like count. A reader the
   server lets post on this seat also gets the control; a like is one POST
   { action: 'like' }, a second is a no-op on the server, and only counts come
   back — never who.

   No poll, no replies, no score.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/district-board-voice';
  var COMPOSER_SEATS = {
    'ut-sd-3': 1, 'ut-hd-16': 1, 'ut-sd-7': 1, 'ut-hd-15': 1, 'ut-cd-2': 1, 'ut-sd-6': 1,
    // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
    'ut-hd-4': 1,
    'ut-hd-5': 1,
    'ut-hd-6': 1,
    'ut-hd-9': 1,
    'ut-hd-10': 1,
    'ut-hd-11': 1,
    'ut-hd-12': 1,
    'ut-hd-14': 1,
    'ut-hd-19': 1,
    'ut-hd-21': 1,
    'ut-hd-22': 1,
    'ut-hd-23': 1,
    'ut-hd-24': 1,
    'ut-hd-25': 1,
    'ut-hd-28': 1,
    'ut-hd-29': 1,
    'ut-hd-30': 1,
    'ut-hd-31': 1,
    'ut-hd-33': 1,
    'ut-hd-34': 1,
    'ut-hd-36': 1,
    'ut-hd-37': 1,
    'ut-hd-39': 1,
    'ut-hd-41': 1,
    'ut-hd-42': 1,
    'ut-hd-43': 1,
    'ut-hd-44': 1,
    'ut-hd-45': 1,
    'ut-hd-46': 1,
    'ut-hd-49': 1,
    'ut-hd-50': 1,
    'ut-hd-51': 1,
    'ut-hd-52': 1,
    'ut-hd-53': 1,
    'ut-hd-55': 1,
    'ut-hd-56': 1,
    'ut-hd-59': 1,
    'ut-hd-60': 1,
    'ut-hd-61': 1,
    'ut-hd-63': 1,
    'ut-hd-64': 1,
    'ut-hd-65': 1,
    'ut-hd-66': 1,
    'ut-hd-67': 1,
    'ut-hd-68': 1,
    'ut-hd-69': 1,
    'ut-hd-70': 1,
    'ut-hd-71': 1,
    'ut-hd-73': 1,
    'ut-hd-75': 1,
    'ut-sd-1': 1,
    'ut-sd-2': 1,
    'ut-sd-4': 1,
    'ut-sd-5': 1,
    'ut-sd-8': 1,
    'ut-sd-9': 1,
    'ut-sd-10': 1,
    'ut-sd-11': 1,
    'ut-sd-12': 1,
    'ut-sd-13': 1,
    'ut-sd-14': 1,
    'ut-sd-15': 1,
    'ut-sd-16': 1,
    'ut-sd-17': 1,
    'ut-sd-18': 1,
    'ut-sd-19': 1,
    'ut-sd-20': 1,
    'ut-sd-21': 1,
    'ut-sd-22': 1,
    'ut-sd-23': 1,
    'ut-sd-24': 1,
    'ut-sd-25': 1,
    'ut-sd-26': 1,
    'ut-sd-27': 1,
    'ut-sd-28': 1,
    'ut-sd-29': 1,
    'ut-cd-1': 1,
    'ut-cd-3': 1,
    'ut-cd-4': 1,
    'ut-gov': 1,
    'ut-us-senate-curtis': 1,
    'ut-us-senate-lee': 1,
    // @generated district-boards end
  };
  var POST_MAX = 280;
  var LOCKED_LINE = 'Only verified residents of this seat get a voice that counts.';
  var COPY = {
    label: 'Say something to this district',
    issue: 'Issue',
    issuePick: 'Choose an issue',
    placeholder: 'Only verified residents of this seat can post here.',
    send: 'Post',
    sending: 'Posting…',
    sent: 'Posted.',
    feedHd: 'What residents have said',
    feedWait: 'Reading posts…',
    feedEmpty: 'No posts on hand for this seat.',
    feedUnread: 'We could not read this board’s posts just now. This is not an empty board — it is a read that failed.',
    unreadNote: 'Posting stays off until this board can confirm who you are.',
    failed: 'That post did not go through.',
    // A monthly-cap refusal (429 monthly_cap), said without the server's
    // membership wording.
    notTaken: 'That post did not go through. This seat is not taking another post from this account right now.',
    mine: 'You',
    prove: 'Prove you live here',
    proving: 'Opening the ID check…',
    proveNote: 'One ID and proof-of-address check covers this seat and the other boards your saved location names. ' +
      'PolitiDex keeps that you passed, not your ID or your address.',
    proveFailed: 'Residency check is not available right now',
    returned: 'Your check is with the vendor. This board opens once it confirms; that can take a few minutes.',
    // The topic jump (?topic=<issueKey>), from an issue file's poll.
    topicHd: 'What residents have said on ',
    topicEmpty: 'No comments on this issue on hand for this seat.',
    topicAll: 'Show every comment',
    // The general room.
    generalHd: 'General',
    generalLabel: 'Say something to this district',
    generalWait: 'Reading the general room…',
    generalUnread: 'We could not read the general room just now. This is not an empty room — it is a read that failed.',
    generalEmpty: 'No general comments for this officeholder on this seat yet.',
    generalNote: 'The general thread for this seat while this officeholder holds it. Comments carry no name.',
    generalPast: 'A previous holder’s general thread for this seat. It is read-only; new comments go to whoever holds the seat now.',
    generalBack: 'Back to the current thread',
    previous: 'Previous: ',
    previousThread: 'their thread here',
    like: 'Like',
    liked: 'Liked',
    likeOne: '1 like',
    likeMany: ' likes',
    likeFailed: 'That like did not go through.'
  };
  var VERIFY_API = '/api/residency-verify';
  // The caller's own membership flag, read ONLY to decide the one link below.
  var MEMBER_API = '/api/membership';
  var MEMBER_HREF = '/me#membership';
  var MEMBER_LINK = 'Become a member';

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── THE CALLER ────────────────────────────────────────────────────────────
  // Firebase's own handle, never an anonymous one.
  function tokenUser() {
    try {
      var cu = window.auth && window.auth.currentUser;
      if (!cu || cu.isAnonymous === true || !fn(cu.getIdToken)) return null;
      return cu;
    } catch (e) { return null; }
  }
  function bearer() {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken()).then(function (t) { return t || null; }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function call(method, query, body) {
    return bearer().then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (query || ''), {
        method: method,
        headers: headers,
        cache: 'no-store',
        body: body ? JSON.stringify(body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // ── THE ISSUES A POST CAN BE FILED UNDER ─────────────────────────────────
  // This seat's own table first — what band 3 printed — and the whole shipped
  // vocabulary only when the table has nothing. The server checks the key
  // against dd_issue_keys either way.
  function issueLabel(key) {
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issueLabel)) return B.issueLabel(key) || '';
    } catch (e) {}
    return '';
  }
  function issueKeys() {
    var out = [];
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issues)) out = B.issues() || [];
    } catch (e) {}
    if (!out.length) {
      try {
        var M = window.ISSUE_MAP;
        if (M && typeof M === 'object') out = Object.keys(M);
      } catch (e) {}
    }
    var keep = [];
    for (var i = 0; i < out.length; i++) {
      if (out[i] && issueLabel(out[i])) keep.push(out[i]);
    }
    return keep;
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _host = null;
  var _seat = '';
  var _read = null;      // null = in flight, false = failed, else the payload
  var _posts = [];
  var _status = '';
  var _draft = '';
  var _issue = '';
  var _busy = false;
  var _proving = false;
  var _proveStatus = '';
  var _returned = false;
  // ── THE TOPIC JUMP ────────────────────────────────────────────────────────
  // /district/<seat>?topic=<issueKey> opens this board on ONE issue's comments:
  // the feed is read for that issue only (GET ?issue=), titled with its label,
  // the composer's issue is preselected, and the feed is scrolled into view
  // once. "Show every comment" drops the topic and reads the whole feed again.
  // The key is shape-checked and opens nothing else — no gate, no flag.
  var TOPIC_ID = 'pdx-topic-comments';
  var _topic = '';
  var _jumped = false;
  function topicFrom(search) {
    var m = /[?&]topic=([^&#?]*)/.exec(String(search || ''));
    var k = '';
    try { k = m ? decodeURIComponent(m[1]).trim().toLowerCase() : ''; } catch (e) { k = ''; }
    return /^[a-z0-9_]+$/.test(k) ? k : '';
  }

  function canPost() {
    return !!(_read && _read.voice && _read.voice.canPost === true);
  }

  // ── THE GENERAL ROOM'S STATE ──────────────────────────────────────────────
  var GENERAL_ID = 'pdx-general-room';
  var _g = { read: null, posts: [], holder: '', draft: '', busy: false, status: '' };
  function generalFrom(search) {
    var m = /[?&]general=([^&#?]*)/.exec(String(search || ''));
    var k = '';
    try { k = m ? decodeURIComponent(m[1]).trim().toLowerCase() : ''; } catch (e) { k = ''; }
    return /^[a-z][a-z0-9_]*$/.test(k) ? k : '';
  }
  function gCanPost() {
    return !!(_g.read && _g.read.voice && _g.read.voice.canPost === true);
  }
  // May this reader like? The server says so on either read; it re-checks.
  function canLike() { return canPost() || gCanPost(); }

  function optionsHtml() {
    var keys = issueKeys();
    var h = '<option value="">' + esc(COPY.issuePick) + '</option>';
    for (var i = 0; i < keys.length; i++) {
      h += '<option value="' + esc(keys[i]) + '"' + (keys[i] === _issue ? ' selected' : '') + '>' +
        esc(issueLabel(keys[i])) + '</option>';
    }
    return h;
  }

  function when(v) {
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  function shownPosts() {
    if (!_topic) return _posts;
    var out = [];
    for (var i = 0; i < _posts.length; i++) {
      if (_posts[i] && _posts[i].issueKey === _topic) out.push(_posts[i]);
    }
    return out;
  }

  function likesWord(n) { return n === 1 ? COPY.likeOne : (n + COPY.likeMany); }
  function likeHtml(p) {
    var n = Math.max(0, Math.floor(Number(p && p.likes) || 0));
    if (!canLike() || typeof p.id !== 'number') {
      return '<span class="pdxdc-like-n" data-pdxdc-like-n="' + n + '">' + esc(likesWord(n)) + '</span>';
    }
    var on = p.liked === true;
    return '<button type="button" class="pdxdc-like" data-pdxdc-like="' + esc(String(p.id)) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (on ? ' disabled aria-disabled="true"' : '') + '>' +
        esc(on ? COPY.liked : COPY.like) + '</button>' +
      '<span class="pdxdc-like-n" data-pdxdc-like-n="' + n + '">' + esc(likesWord(n)) + '</span>';
  }

  function postHtml(p) {
    var lb = issueLabel(p.issueKey);
    return '<li class="pdxdc-post">' +
      '<p class="pdxdc-post-meta">' +
        (lb ? '<span class="pdxdc-post-issue">' + esc(lb) + '</span>' : '') +
        (when(p.createdAt) ? '<span>' + esc(when(p.createdAt)) + '</span>' : '') +
        (p.mine === true ? '<span class="pdxdc-post-mine">' + esc(COPY.mine) + '</span>' : '') +
      '</p>' +
      '<p class="pdxdc-post-body">' + esc(p.body) + '</p>' +
      '<p class="pdxdc-post-likes">' + likeHtml(p) + '</p>' +
    '</li>';
  }

  function feedHtml() {
    if (_read === null) return '<p class="pdxdb-wait" role="status">' + esc(COPY.feedWait) + '</p>';
    if (_read === false) return '<p class="pdxdb-unread">' + esc(COPY.feedUnread) + '</p>';
    var list = shownPosts();
    if (!list.length) {
      return '<p class="pdxdb-none">' + esc(_topic ? COPY.topicEmpty : (_read.postsEmpty || COPY.feedEmpty)) + '</p>';
    }
    var h = '<ol class="pdxdc-feed">';
    for (var i = 0; i < list.length; i++) h += postHtml(list[i] || {});
    return h + '</ol>';
  }

  // ── THE GENERAL ROOM, PAINTED INTO district-board.js's FRAME ──────────────
  function generalSlot() {
    try { return document.querySelector('[data-pdxdb-general]'); } catch (e) { return null; }
  }
  function generalHtml() {
    var r = _g.read;
    if (r === null) {
      return '<h2 class="pdxdb-h2">' + esc(COPY.generalHd) + '</h2>' +
        '<p class="pdxdb-wait" role="status">' + esc(COPY.generalWait) + '</p>';
    }
    if (r === false || !r.general || !r.general.holder) {
      return '<h2 class="pdxdb-h2">' + esc(COPY.generalHd) + '</h2>' +
        '<p class="pdxdb-unread">' + esc(COPY.generalUnread) + '</p>';
    }
    var G = r.general;
    var current = G.current === true;
    var open = current && gCanPost() && !_g.busy;
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var len = [...String(_g.draft)].length;
    var h = '<h2 class="pdxdb-h2" data-pdxdc-g-holder-pid="' + esc(G.holder.pid) + '">' +
        esc(COPY.generalHd + ' · ' + (G.holder.name || G.holder.pid)) + '</h2>' +
      '<p class="pdxdb-note">' + esc(current ? COPY.generalNote : COPY.generalPast) + '</p>';
    if (!current) {
      h += '<p class="pdxdb-note"><a class="pdxdc-g-back" data-pdxdc-g-current="1" href="?#' + GENERAL_ID + '">' +
        esc(COPY.generalBack) + '</a></p>';
    } else {
      h += '<form class="pdxdc-form" data-pdxdc-g-form="1" novalidate>' +
          (gCanPost() ? '' : '<p class="pdxdc-locked">' + esc((r.voice && r.voice.line) || LOCKED_LINE) + '</p>') +
          '<label class="pdxdc-l" for="pdxdc-g-body">' + esc(COPY.generalLabel) + '</label>' +
          '<textarea class="pdxdc-ta" id="pdxdc-g-body" data-pdxdc-g-body="1" rows="2" maxlength="' + POST_MAX + '"' +
            ' placeholder="' + esc(COPY.placeholder) + '"' + dis + '>' + esc(_g.draft) + '</textarea>' +
          '<div class="pdxdc-row">' +
            '<span class="pdxdc-len" data-pdxdc-g-len="1" aria-live="polite">' + len + ' / ' + POST_MAX + '</span>' +
            '<button class="pdxdc-btn" type="submit"' + dis + '>' + esc(_g.busy ? COPY.sending : COPY.send) + '</button>' +
          '</div>' +
          (_g.status ? '<p class="pdxdc-status" role="status">' + esc(_g.status) + '</p>' : '') +
        '</form>';
    }
    var list = _g.posts || [];
    if (!list.length) h += '<p class="pdxdb-none">' + esc(r.postsEmpty || COPY.generalEmpty) + '</p>';
    else {
      h += '<ol class="pdxdc-feed" data-pdxdc-g-feed="1">';
      for (var i = 0; i < list.length; i++) h += postHtml(list[i] || {});
      h += '</ol>';
    }
    var prev = Array.isArray(G.previous) ? G.previous : [];
    var links = [];
    for (var j = 0; j < prev.length; j++) {
      var pp = prev[j];
      if (!pp || !pp.pid || pp.pid === G.holder.pid) continue;
      var threadHref = '?general=' + encodeURIComponent(pp.pid) + '#' + GENERAL_ID;
      var ppName = String(pp.name || '').trim();
      if (!ppName || ppName === pp.pid) {
        // No name to print: the thread door alone, as it shipped.
        links.push('<a class="pdxdc-g-prev-a" data-pdxdc-g-holder="' + esc(pp.pid) + '"' +
          ' href="' + threadHref + '">' + esc(COPY.previous + (pp.name || pp.pid)) + '</a>');
        continue;
      }
      // A NAMED PRIOR HOLDER IS REACHABLE BOTH WAYS. The name opens their person
      // file, as the current holder's name does in the heading; the second link
      // opens their old general thread for this seat. The person link sits
      // OUTSIDE the data-pdxdc-g-holder element, so the click handler that
      // swaps threads in place never swallows it.
      links.push('<span class="pdxdc-g-prev-i">' + esc(COPY.previous) +
        '<a class="pdxdc-g-prev-p" href="/p/' + encodeURIComponent(pp.pid) + '">' + esc(ppName) + '</a>' +
        ' \u00b7 <a class="pdxdc-g-prev-a" data-pdxdc-g-holder="' + esc(pp.pid) + '"' +
        ' href="' + threadHref + '">' + esc(COPY.previousThread) + '</a></span>');
    }
    if (!current && G.currentHolder && G.currentHolder.pid) {
      links.unshift('<a class="pdxdc-g-prev-a" data-pdxdc-g-current="1" href="?#' + GENERAL_ID + '">' +
        esc(COPY.generalHd + ' · ' + (G.currentHolder.name || G.currentHolder.pid)) + '</a>');
    }
    if (links.length) h += '<p class="pdxdc-g-prev" data-pdxdc-g-prev="1">' + links.join(' ') + '</p>';
    return h;
  }
  function renderGeneral() {
    var slot = generalSlot();
    if (!slot) return;
    slot.innerHTML = generalHtml();
  }

  function loadGeneral() {
    var q = '?seat=' + encodeURIComponent(_seat) + '&room=general' +
      (_g.holder ? '&holder=' + encodeURIComponent(_g.holder) : '');
    return call('GET', q).then(function (res) {
      if (!res.ok || !res.data || !Array.isArray(res.data.posts) || !res.data.general) {
        _g.read = false;
        _g.posts = [];
      } else {
        _g.read = res.data;
        _g.posts = res.data.posts;
      }
      renderGeneral();
      render();
    });
  }

  function openHolder(pid) {
    _g.holder = pid || '';
    _g.read = null;
    _g.status = '';
    try {
      if (window.history && fn(window.history.replaceState)) {
        var path = String(window.location.pathname || '');
        window.history.replaceState(null, '', path + (pid ? '?general=' + encodeURIComponent(pid) : '') + '#' + GENERAL_ID);
      }
    } catch (e) {}
    renderGeneral();
    loadGeneral();
  }

  function submitGeneral() {
    if (_g.busy || !gCanPost() || !(_g.read && _g.read.general && _g.read.general.current)) return;
    _g.busy = true;
    _g.status = '';
    renderGeneral();
    // No pid is sent: the server files the comment under the sitting member.
    call('POST', '', { seat: _seat, room: 'general', body: _g.draft }).then(function (res) {
      _g.busy = false;
      if (res.status === 201 && res.data && res.data.post) {
        _g.posts = [res.data.post].concat(_g.posts);
        _g.draft = '';
        _g.status = COPY.sent;
        renderGeneral();
        try {
          var B = window.PDXDistrictBoard;
          if (B && fn(B.refresh)) B.refresh();
        } catch (e) {}
        return;
      }
      if (res.status === 403) {
        _g.read.voice = { canPost: false, reason: res.data.code || '', line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
      } else if (res.status === 429 || (res.data && res.data.code === 'monthly_cap')) {
        _g.status = COPY.notTaken;
      } else {
        _g.status = (res.data && res.data.error) || COPY.failed;
      }
      renderGeneral();
    });
  }

  // One like. The count comes back from the server; nothing here adds one.
  function likePost(id) {
    if (!canLike() || !(id > 0)) return;
    call('POST', '', { seat: _seat, action: 'like', postId: id }).then(function (res) {
      var lists = [_posts, _g.posts];
      if (res.ok && res.data && res.data.postId === id) {
        for (var l = 0; l < lists.length; l++) {
          for (var i = 0; i < lists[l].length; i++) {
            if (lists[l][i] && lists[l][i].id === id) {
              lists[l][i].likes = Math.max(0, Math.floor(Number(res.data.likes) || 0));
              lists[l][i].liked = true;
            }
          }
        }
      } else if (res.status === 403) {
        if (_read && _read.voice) _read.voice.canPost = false;
        if (_g.read && _g.read.voice) _g.read.voice.canPost = false;
      } else {
        _status = COPY.likeFailed;
      }
      render();
      renderGeneral();
    });
  }

  // ONE SET OF LISTENERS for everything this file paints outside its own host:
  // the general room's frame is rebuilt on every board repaint, so its
  // controls are read by delegation rather than wired per render.
  var _delegated = false;
  function delegate() {
    if (_delegated) return;
    _delegated = true;
    try {
      document.addEventListener('click', function (ev) {
        var t = ev && ev.target;
        if (!t || !fn(t.closest)) return;
        var lk = t.closest('[data-pdxdc-like]');
        if (lk) { ev.preventDefault(); likePost(Number(lk.getAttribute('data-pdxdc-like'))); return; }
        var hp = t.closest('[data-pdxdc-g-holder]');
        if (hp) { ev.preventDefault(); openHolder(hp.getAttribute('data-pdxdc-g-holder') || ''); return; }
        var back = t.closest('[data-pdxdc-g-current]');
        if (back) { ev.preventDefault(); openHolder(''); }
      });
      document.addEventListener('input', function (ev) {
        var t = ev && ev.target;
        if (!t || !t.hasAttribute || !t.hasAttribute('data-pdxdc-g-body')) return;
        _g.draft = t.value;
        var slot = generalSlot();
        var len = slot && slot.querySelector('[data-pdxdc-g-len]');
        if (len) len.textContent = [...String(_g.draft)].length + ' / ' + POST_MAX;
      });
      document.addEventListener('submit', function (ev) {
        var f = ev && ev.target;
        if (!f || !f.hasAttribute || !f.hasAttribute('data-pdxdc-g-form')) return;
        ev.preventDefault();
        submitGeneral();
      });
    } catch (e) {}
  }

  // ── THE SIGN-IN LINE, AND WHERE IT RETURNS TO ────────────────────────────
  // A signed-out reader is told "Sign in to start." — and this board has no
  // sign-in of its own: the front page owns the account sheet. So the line is a
  // real link there, carrying this board as the return intent through
  // PDXReturn (the same owner /find uses; nothing here spells `next`). Without
  // PDXReturn on the document it is today's plain trip to '/'.
  function signInHref() {
    try {
      var R = window.PDXReturn;
      if (R && fn(R.joinHref)) return R.joinHref() || '/';
    } catch (e) {}
    return '/';
  }

  function noteHtml(note, reason) {
    if (!note) return '';
    if (reason !== 'signed_out') return '<p class="pdxdb-foot">' + esc(note) + '</p>';
    return '<p class="pdxdb-foot"><a class="pdxdc-signin" data-pdxdc-signin="1" href="' +
      esc(signInHref()) + '">' + esc(note) + '</a></p>';
  }

  // The vendor's page, and only the vendor's page. Anything else is refused.
  function vendorUrl(u) {
    try {
      var p = new URL(String(u || ''));
      if (p.protocol !== 'https:') return '';
      var h = p.hostname.toLowerCase();
      return (/(^|\.)didit\.me$/.test(h)) ? p.href : '';
    } catch (e) { return ''; }
  }

  // Signed in, read OK, and not verified for THIS seat. The server's
  // `unverified` already means signed in with no vendor-verified row here.
  function canProve() {
    return !!(_read && _read.voice && _read.voice.reason === 'unverified' && !canPost() && tokenUser());
  }

  function proveHtml(reason) {
    if (reason !== 'unverified' || !canProve()) return '';
    var dis = _proving ? ' disabled aria-disabled="true"' : '';
    return '<div class="pdxdc-prove" data-pdxdc-prove="1">' +
      '<button class="pdxdc-btn" type="button" data-pdxdc-prove-btn="1"' + dis + '>' +
        esc(_proving ? COPY.proving : COPY.prove) + '</button>' +
      '<p class="pdxdb-foot">' + esc(_returned ? COPY.returned : COPY.proveNote) + '</p>' +
      (_proveStatus ? '<p class="pdxdc-status" role="status">' + esc(_proveStatus) + '</p>' : '') +
    '</div>';
  }

  // THE SEATS ONE CHECK COVERS, FROM THE HALLWAY'S OWN RESOLVER. district-
  // voice.js seatsForMe() over pdxRepsForMe() — the same list /voice paints —
  // reduced to its seat keys, the statewide rows' board keys included.
  // Nothing is composed here; a missing module or a reader with no saved
  // location sends []. The server keeps only composer seats, and binds the
  // board's own state's statewide seats whatever is sent.
  function resolvedSeats() {
    var out = [];
    try {
      var V = window.PDXVoice;
      var seats = (V && fn(V.seatsForMe)) ? (V.seatsForMe() || []) : [];
      for (var i = 0; i < seats.length; i++) {
        // A district row's seat key, or a statewide row's board key.
        var k = seats[i] && (seats[i].seatKey || seats[i].boardKey);
        if (typeof k === 'string' && k && out.indexOf(k) < 0) out.push(k);
      }
    } catch (e) { out = []; }
    return out;
  }

  function prove() {
    if (_proving || !canProve()) return;
    _proving = true;
    _proveStatus = '';
    render();
    bearer().then(function (t) {
      if (!t) return { ok: false, status: 403, data: {} };
      return fetch(VERIFY_API, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
        cache: 'no-store',
        body: JSON.stringify({ seat: _seat, seats: resolvedSeats() })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, status: res.status, data: d || {} }; });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; }).then(function (res) {
      _proving = false;
      var go = res.ok && res.data ? vendorUrl(res.data.url) : '';
      if (go) { window.location.assign(go); return; }
      if (res.ok && res.data && res.data.verified === true) { load(); return; }
      var said = (res.data && (res.data.error || res.data.message)) || '';
      // Membership never gates the check; a members-only line is not shown.
      if (res.data && res.data.code === 'not_member') said = '';
      if (/\bmembers?\b|membership/i.test(said)) said = '';
      _proveStatus = said || COPY.proveFailed;
      render();
    });
  }

  // ── THE MEMBERSHIP LINK ───────────────────────────────────────────────────
  // null until the server answers for a signed-in caller; false only when it
  // says signed in and not a member. Anything else — signed out, a member, a
  // failed read — shows no link.
  var _member = null;
  var _memberAsked = false;
  function loadMember() {
    if (_memberAsked || !tokenUser()) return Promise.resolve(_member);
    _memberAsked = true;
    return bearer().then(function (t) {
      if (!t) return null;
      return fetch(MEMBER_API, { method: 'GET', headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; });
    }).catch(function () { return null; }).then(function (d) {
      _member = (d && d.signedIn === true) ? (d.member === true) : null;
      if (_member === null) _memberAsked = false;   // a failed read may be asked again
      render();
      return _member;
    });
  }
  function memberHtml() {
    if (_member !== false || !tokenUser()) return '';
    return '<p class="pdxdc-member" data-pdxdc-member="1"><a class="pdxdc-member-a" href="' + esc(MEMBER_HREF) + '">' +
      esc(MEMBER_LINK) + '</a></p>';
  }

  function render() {
    if (!_host) return;
    var open = canPost() && !_busy;
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var v = (_read && _read.voice) || {};
    var line = canPost() ? '' : (v.line || LOCKED_LINE);
    var note = _read === false ? COPY.unreadNote : (v.note || '');
    var len = [...String(_draft)].length;

    _host.setAttribute('data-pdxdc-state', canPost() ? 'open' : 'locked');
    _host.innerHTML =
      '<section class="pdxdb-band pdxdb-band--compose" data-pdxdb-band="compose">' +
        '<h2 class="pdxdb-h2">' + esc(COPY.label) + '</h2>' +
        (line ? '<p class="pdxdc-locked" data-pdxdc-locked="1">' + esc(line) + '</p>'
              : '<p class="pdxdb-foot" data-pdxdc-locked="1">' + esc(LOCKED_LINE) + '</p>') +
        memberHtml() +
        '<form class="pdxdc-form" novalidate>' +
          '<label class="pdxdc-l" for="pdxdc-issue">' + esc(COPY.issue) + '</label>' +
          '<select class="pdxdc-sel" id="pdxdc-issue" name="issueKey"' + dis + '>' + optionsHtml() + '</select>' +
          '<label class="pdxdc-l" for="pdxdc-body">' + esc(COPY.label) + '</label>' +
          '<textarea class="pdxdc-ta" id="pdxdc-body" name="body" rows="3" maxlength="' + POST_MAX + '"' +
            ' placeholder="' + esc(COPY.placeholder) + '"' + dis + '>' + esc(_draft) + '</textarea>' +
          '<div class="pdxdc-row">' +
            '<span class="pdxdc-len" aria-live="polite">' + len + ' / ' + POST_MAX + '</span>' +
            '<button class="pdxdc-btn" type="submit"' + dis + '>' + esc(_busy ? COPY.sending : COPY.send) + '</button>' +
          '</div>' +
          (_status ? '<p class="pdxdc-status" role="status">' + esc(_status) + '</p>' : '') +
        '</form>' +
        proveHtml(_read === false ? '' : v.reason) +
        noteHtml(note, _read === false ? '' : v.reason) +
      '</section>' +
      '<section class="pdxdb-band pdxdb-band--posts" data-pdxdb-band="posts" id="' + TOPIC_ID + '"' +
          (_topic ? ' data-pdxdc-topic="' + esc(_topic) + '"' : '') + '>' +
        '<h2 class="pdxdb-h2">' + esc(_topic && issueLabel(_topic)
          ? COPY.topicHd + issueLabel(_topic) : COPY.feedHd) + '</h2>' +
        '<p class="pdxdb-note">Posts carry no name, email or address.</p>' +
        (_topic ? '<p class="pdxdb-note"><button type="button" class="pdxdc-btn" data-pdxdc-topic-all="1">' +
          esc(COPY.topicAll) + '</button></p>' : '') +
        feedHtml() +
      '</section>';
    wireForm();
  }

  function wireForm() {
    var pb = _host.querySelector('[data-pdxdc-prove-btn]');
    if (pb) pb.addEventListener('click', function () { prove(); });
    var all = _host.querySelector('[data-pdxdc-topic-all]');
    if (all) all.addEventListener('click', function () { showAll(); });
    var form = _host.querySelector('form');
    if (!form) return;
    var ta = form.querySelector('textarea');
    var sel = form.querySelector('select');
    var len = form.querySelector('.pdxdc-len');
    if (ta) ta.addEventListener('input', function () {
      _draft = ta.value;
      if (len) len.textContent = [...String(_draft)].length + ' / ' + POST_MAX;
    });
    if (sel) sel.addEventListener('change', function () { _issue = sel.value; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      submit();
    });
  }

  function showAll() {
    _topic = '';
    try {
      if (window.history && fn(window.history.replaceState)) {
        window.history.replaceState(null, '', String(window.location.pathname || ''));
      }
    } catch (e) {}
    _read = null;
    render();
    load();
  }

  // Once, after the first read on a topic jump: bring the topic's comments
  // into view. Never again on a later repaint, so it cannot pull a reader back.
  function jumpToTopic() {
    if (!_topic || _jumped) return;
    _jumped = true;
    try {
      var n = document.getElementById(TOPIC_ID);
      if (n && fn(n.scrollIntoView)) n.scrollIntoView({ block: 'start' });
    } catch (e) {}
  }

  function load() {
    var was = canPost();
    var q = '?seat=' + encodeURIComponent(_seat) + (_topic ? '&issue=' + encodeURIComponent(_topic) : '');
    return call('GET', q).then(function (res) {
      if (!res.ok || !res.data || !Array.isArray(res.data.posts)) {
        _read = false;
        _posts = [];
      } else {
        _read = res.data;
        _posts = res.data.posts;
      }
      render();
      jumpToTopic();
      loadMember();
      // The server just opened this seat: let the poll re-ask too.
      if (!was && canPost()) {
        try {
          var P = window.PDXDistrictPoll;
          if (P && fn(P.refresh)) P.refresh();
        } catch (e) {}
      }
    });
  }

  function submit() {
    if (_busy || !canPost()) return;
    _busy = true;
    _status = '';
    render();
    call('POST', '', { seat: _seat, issueKey: _issue, body: _draft }).then(function (res) {
      _busy = false;
      if (res.status === 201 && res.data && res.data.post) {
        _posts = [res.data.post].concat(_posts);
        _draft = '';
        _status = COPY.sent;
        try {
          var B = window.PDXDistrictBoard;
          if (B && fn(B.refresh)) B.refresh();
        } catch (e) {}
        render();
        return;
      }
      if (res.status === 403) {
        // The server closed the gate: say so and turn the box off.
        _read = _read || {};
        _read.voice = { canPost: false, reason: res.data.code || '', line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
        _status = '';
      } else if (res.status === 429 || (res.data && res.data.code === 'monthly_cap')) {
        _status = COPY.notTaken;
      } else {
        _status = (res.data && res.data.error) || COPY.failed;
      }
      render();
    });
  }

  function mount(host) {
    var el = host || document.getElementById('pdx-district-composer');
    if (!el) return false;
    var seat = String(el.getAttribute('data-pdxdc-seat') || '').toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, seat)) return false;
    _host = el;
    _seat = seat;
    // Back from the vendor. This is a hint for the copy only — it opens
    // nothing; the server's next answer does. Re-ask a few times while the
    // vendor's decision is in flight. Didit appends its own
    // ?verificationSessionId=…&status=… to the return address, so the marker
    // may be followed by a second '?'.
    try { _returned = /[?&]residency=returned(?=$|[&?#])/.test(String(window.location.search || '')); } catch (e) {}
    try { _topic = topicFrom(window.location.search); } catch (e) { _topic = ''; }
    try { _g.holder = generalFrom(window.location.search); } catch (e) { _g.holder = ''; }
    if (_topic && !_issue) _issue = _topic;
    delegate();
    render();
    load();
    loadGeneral();
    if (_returned) {
      [8000, 20000, 45000].forEach(function (ms) {
        setTimeout(function () { if (!canPost()) load(); }, ms);
      });
    }
    // Re-ask whenever the account changes — signing in can only ever turn the
    // box on if the SERVER then says this account is verified for this seat.
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) {
        window.auth.onAuthStateChanged(function () { load(); loadGeneral(); });
      }
    } catch (e) {}
    // The issue list is band 3's; repaint the select when the board repaints.
    try {
      document.addEventListener('pdxdb:paint', function () {
        var sel = _host && _host.querySelector('select');
        if (sel) sel.innerHTML = optionsHtml();
        // The board rebuilt its frame: paint the general room back into it.
        renderGeneral();
      });
    } catch (e) {}
    return true;
  }

  window.PDXDistrictComposer = {
    API: API,
    COMPOSER_SEATS: COMPOSER_SEATS,
    LOCKED_LINE: LOCKED_LINE,
    COPY: COPY,
    mount: mount,
    canPost: canPost,
    TOPIC_ID: TOPIC_ID,
    topicFrom: topicFrom,
    topic: function () { return _topic; },
    GENERAL_ID: GENERAL_ID,
    generalFrom: generalFrom,
    general: function () { return _g.read ? { holder: _g.holder, posts: _g.posts.slice(), read: _g.read } : null; },
    _generalHtml: generalHtml,
    _likeHtml: likeHtml,
    openHolder: openHolder,
    likePost: likePost
  };

  function go() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
