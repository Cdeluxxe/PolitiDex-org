/* ═════════════════════════════════════════════════════════════════════════
   usa-voice.js — USA VOICE, THE ONE NATIONAL BOARD (/usa)
   ─────────────────────────────────────────────────────────────────────────
   One board for the whole country, with the same three tools every district
   board has, talking to the same endpoints with seat "usa":

     · THE ROOM      the board's general thread  GET/POST /api/district-board-voice  room=general
     · THE CHAT      comments filed under an issue  GET/POST /api/district-board-voice  issue=<key>
     · THE POLL      one vote per issue            GET/POST /api/district-board-poll

   THE GATE IS THE SERVER'S. Reading is open to everyone. Posting, liking and
   voting open only when the server says `canPost` / `canVote` — an approved
   Didit check of a U.S. government ID (a check already on file for a district
   board counts). Everyone else gets the same Didit start every district board
   uses: POST /api/residency-verify { seat: "usa" } and a trip to the vendor's
   page. Coming back from the vendor opens nothing by itself; the next GET does.

   Nothing here stores anything on the device, and no post carries a name.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXUsaVoice) return;

  var SEAT = 'usa';
  var VOICE_API = '/api/district-board-voice';
  var POLL_API = '/api/district-board-poll';
  var VERIFY_API = '/api/residency-verify';
  var POST_MAX = 280;

  var CHOICES = [
    { key: 'support', label: 'Support' },
    { key: 'oppose', label: 'Oppose' },
    { key: 'not_sure', label: 'Not sure' }
  ];
  var ISSUE_POLLS = {
    campaign_finance: [
      { key: 'cap_individual', label: 'Cap individual donations' },
      { key: 'cap_total', label: 'Cap the total a campaign can raise' },
      { key: 'public_match', label: 'Public financing or small-donor matching' },
      { key: 'cooling_off', label: 'A longer cooling-off before lobbying' },
      { key: 'ban_stock_buys', label: 'Ban members’ personal trading while in office' },
      { key: 'dark_money', label: 'Stronger dark-money disclosure' },
      { key: 'none', label: 'None of these' }
    ]
  };
  function choicesFor(k) { return Object.prototype.hasOwnProperty.call(ISSUE_POLLS, k) ? ISSUE_POLLS[k] : CHOICES; }

  var COPY = {
    reading: 'Reading USA Voice…',
    unread: 'This board could not be read right now. Try again in a moment.',
    signin: 'Sign in to start. Reading stays open to everyone.',
    prove: 'Verify with a U.S. ID',
    proving: 'Opening the ID check…',
    proveNote: 'One Didit check of a U.S. government ID — a driver’s license, state ID, passport, naturalization certificate or another U.S.-issued document Didit accepts. A non-U.S. document is not accepted.',
    proveFailed: 'The ID check could not be started right now.',
    returned: 'Back from the ID check. The board opens as soon as Didit’s decision reaches PolitiDex — reload in a moment if it has not.',
    emptyRoom: 'No comments in the room yet.',
    emptyChat: 'No comments on this issue yet.',
    empty: 'Write something first.',
    tooLong: 'Keep it to ' + POST_MAX + ' characters.',
    notTaken: 'That did not go through. This board is not taking another one from this account right now.',
    failed: 'That did not go through. Try again in a moment.',
    voteLocked: 'Voting opens with the same U.S. ID check.'
  };

  var S = {
    issue: '',
    room: null, roomErr: false,
    chat: null, chatErr: false,
    poll: null,
    voice: null,
    proving: false, proveStatus: '',
    roomStatus: '', chatStatus: '', pollStatus: '',
    busy: false
  };
  var _host = null;

  function fn(f) { return typeof f === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── THE CALLER ──────────────────────────────────────────────────────────
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
  function call(url, method, body) {
    return bearer().then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(url, { method: method, headers: headers, cache: 'no-store', body: body ? JSON.stringify(body) : undefined })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (d) {
            return { ok: res.ok, status: res.status, data: d || {} };
          });
        });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }
  function signInHref() {
    try {
      var R = window.PDXReturn;
      if (R && fn(R.joinHref)) return R.joinHref() || '/';
    } catch (e) {}
    return '/';
  }

  // ── THE ISSUES, FROM THE APP'S OWN VOCABULARY ───────────────────────────
  function issueGroups() {
    var out = [];
    try {
      var cores = window.CORE_NATIONAL_ISSUES || [];
      var map = window.ISSUE_MAP || {};
      for (var i = 0; i < cores.length; i++) {
        var c = cores[i];
        var keys = [];
        for (var j = 0; j < (c.keys || []).length; j++) {
          var k = c.keys[j];
          if (map[k] && map[k].label) keys.push({ key: k, label: map[k].label });
        }
        if (keys.length) out.push({ label: c.label, keys: keys });
      }
    } catch (e) { out = []; }
    return out;
  }
  function issueLabel(k) {
    try { var m = window.ISSUE_MAP && window.ISSUE_MAP[k]; if (m && m.label) return m.label; } catch (e) {}
    return k;
  }

  // ── READS ───────────────────────────────────────────────────────────────
  function loadRoom() {
    return call(VOICE_API + '?seat=' + SEAT + '&room=general', 'GET').then(function (r) {
      S.roomErr = !r.ok;
      S.room = r.ok ? r.data : null;
      if (r.ok && r.data.voice) S.voice = r.data.voice;
    });
  }
  function loadChat() {
    if (!S.issue) { S.chat = null; return Promise.resolve(); }
    var asked = S.issue;
    return call(VOICE_API + '?seat=' + SEAT + '&issue=' + encodeURIComponent(asked), 'GET').then(function (r) {
      if (asked !== S.issue) return;
      S.chatErr = !r.ok;
      S.chat = r.ok ? r.data : null;
    });
  }
  function loadPoll() {
    return call(POLL_API + '?seat=' + SEAT, 'GET').then(function (r) { S.poll = r.ok ? r.data : null; });
  }
  function load() {
    return Promise.all([loadRoom(), loadChat(), loadPoll()]).then(render, render);
  }

  // ── WRITES ──────────────────────────────────────────────────────────────
  function refusal(r) {
    if (r.status === 429 || (r.data && r.data.code === 'daily_cap')) return COPY.notTaken;
    var said = (r.data && r.data.error) || '';
    return said || COPY.failed;
  }
  function post(where) {
    if (S.busy) return;
    var ta = _host && _host.querySelector('[data-pdxus-body="' + where + '"]');
    var body = ta ? String(ta.value || '').trim() : '';
    var key = where === 'room' ? 'roomStatus' : 'chatStatus';
    if (!body) { S[key] = COPY.empty; render(); return; }
    if (Array.from(body).length > POST_MAX) { S[key] = COPY.tooLong; render(); return; }
    var payload = where === 'room' ? { seat: SEAT, room: 'general', body: body } : { seat: SEAT, issueKey: S.issue, body: body };
    S.busy = true; S[key] = ''; render();
    call(VOICE_API, 'POST', payload).then(function (r) {
      S.busy = false;
      if (r.ok) {
        if (ta) ta.value = '';
        return (where === 'room' ? loadRoom() : loadChat()).then(render);
      }
      S[key] = refusal(r);
      render();
    });
  }
  function like(id) {
    if (S.busy) return;
    S.busy = true;
    call(VOICE_API, 'POST', { seat: SEAT, action: 'like', postId: Number(id) }).then(function (r) {
      S.busy = false;
      if (!r.ok) { render(); return; }
      Promise.all([loadRoom(), loadChat()]).then(render, render);
    });
  }
  function vote(choice) {
    if (S.busy || !S.issue) return;
    S.busy = true; S.pollStatus = ''; render();
    call(POLL_API, 'POST', { seat: SEAT, issueKey: S.issue, choice: choice }).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.pollStatus = refusal(r); render(); return; }
      loadPoll().then(render, render);
    });
  }
  function vendorUrl(u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : ''; }
  function prove() {
    if (S.proving) return;
    S.proving = true; S.proveStatus = ''; render();
    call(VERIFY_API, 'POST', { seat: SEAT }).then(function (r) {
      S.proving = false;
      var go = r.ok && r.data ? vendorUrl(r.data.url) : '';
      if (go) { window.location.assign(go); return; }
      if (r.ok && r.data && r.data.verified === true) { load(); return; }
      var said = (r.data && (r.data.error || r.data.message)) || '';
      S.proveStatus = said || COPY.proveFailed;
      render();
    });
  }

  // ── PAINT ───────────────────────────────────────────────────────────────
  function canPost() { return !!(S.voice && S.voice.canPost === true); }
  function canVote() { return !!(S.poll && S.poll.voice && S.poll.voice.canVote === true); }
  function returned() {
    try { return /[?&]residency=returned(?=$|[&#])/.test(String(window.location.search || '')); } catch (e) { return false; }
  }

  function standingHtml() {
    var v = S.voice;
    if (!v) {
      return '<p class="pdxus-wait" role="status">' + esc(S.roomErr ? COPY.unread : COPY.reading) + '</p>';
    }
    if (v.canPost) {
      return '<p class="pdxus-open" data-pdxus-standing="verified">' + esc(v.note || '') + '</p>';
    }
    var h = '<p class="pdxus-locked" data-pdxus-standing="' + esc(v.reason || 'locked') + '">' + esc(v.line || '') + '</p>';
    if (v.reason === 'signed_out' || !tokenUser()) {
      h += '<p class="pdxus-act"><a class="pdxus-btn" data-pdxus-signin="1" href="' + esc(signInHref()) + '">Sign in</a></p>' +
        '<p class="pdxus-note">' + esc(COPY.signin) + '</p>';
      return h;
    }
    if (v.note) h += '<p class="pdxus-note">' + esc(v.note) + '</p>';
    if (v.canVerify) {
      h += '<p class="pdxus-act"><button type="button" class="pdxus-btn" data-pdxus-prove="1"' + (S.proving ? ' disabled' : '') + '>' +
        esc(S.proving ? COPY.proving : COPY.prove) + '</button></p>' +
        '<p class="pdxus-note">' + esc(COPY.proveNote) + '</p>';
    }
    if (returned()) h += '<p class="pdxus-note" data-pdxus-returned="1">' + esc(COPY.returned) + '</p>';
    if (S.proveStatus) h += '<p class="pdxus-status" role="status">' + esc(S.proveStatus) + '</p>';
    return h;
  }

  function feedHtml(data, err, emptyLine, showIssue) {
    if (err) return '<p class="pdxus-wait">' + esc(COPY.unread) + '</p>';
    if (!data) return '<p class="pdxus-wait">' + esc(COPY.reading) + '</p>';
    var posts = data.posts || [];
    if (!posts.length) return '<p class="pdxus-none">' + esc(emptyLine) + '</p>';
    var open = canPost();
    var h = '<ul class="pdxus-feed">';
    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var when = '';
      try { when = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) {}
      h += '<li class="pdxus-post">' +
        '<p class="pdxus-post-meta">' +
          (showIssue && p.issueKey ? '<span>' + esc(issueLabel(p.issueKey)) + '</span>' : '') +
          (when ? '<span>' + esc(when) + '</span>' : '') +
          (p.mine ? '<span class="pdxus-mine">Yours</span>' : '') +
        '</p>' +
        '<p class="pdxus-post-body">' + esc(p.body) + '</p>' +
        '<p class="pdxus-post-act"><button type="button" class="pdxus-like" data-pdxus-like="' + esc(p.id) + '"' +
          (open && !p.liked ? '' : ' disabled') + ' aria-pressed="' + (p.liked ? 'true' : 'false') + '">' +
          (p.liked ? 'Liked' : 'Like') + ' · ' + esc(Math.max(0, Number(p.likes) || 0)) + '</button></p>' +
      '</li>';
    }
    return h + '</ul>';
  }

  function composerHtml(where, label, status) {
    var open = canPost();
    return '<div class="pdxus-form">' +
      '<label class="pdxus-l" for="pdxus-body-' + where + '">' + esc(label) + '</label>' +
      '<textarea class="pdxus-ta" id="pdxus-body-' + where + '" data-pdxus-body="' + where + '" rows="3" maxlength="' + POST_MAX + '"' +
        (open ? '' : ' disabled aria-disabled="true"') +
        ' placeholder="' + esc(open ? 'Public, no name attached. ' + POST_MAX + ' characters.' : 'Only verified U.S. people can post here.') + '"></textarea>' +
      '<div class="pdxus-row"><span class="pdxus-len">' + POST_MAX + ' characters max</span>' +
        '<button type="button" class="pdxus-btn" data-pdxus-post="' + where + '"' + (open && !S.busy ? '' : ' disabled') + '>Post</button></div>' +
      (status ? '<p class="pdxus-status" role="status">' + esc(status) + '</p>' : '') +
    '</div>';
  }

  function issuePickerHtml() {
    var groups = issueGroups();
    if (!groups.length) return '';
    var h = '<label class="pdxus-l" for="pdxus-issue">Issue</label><select class="pdxus-sel" id="pdxus-issue" data-pdxus-issue="1">';
    for (var i = 0; i < groups.length; i++) {
      h += '<optgroup label="' + esc(groups[i].label) + '">';
      for (var j = 0; j < groups[i].keys.length; j++) {
        var k = groups[i].keys[j];
        h += '<option value="' + esc(k.key) + '"' + (k.key === S.issue ? ' selected' : '') + '>' + esc(k.label) + '</option>';
      }
      h += '</optgroup>';
    }
    return h + '</select>';
  }

  function pollHtml() {
    if (!S.issue) return '';
    var polls = (S.poll && S.poll.polls) || [];
    var t = null;
    for (var i = 0; i < polls.length; i++) if (polls[i].issueKey === S.issue) t = polls[i];
    var mine = (S.poll && S.poll.mine && S.poll.mine[S.issue]) || '';
    var open = canVote();
    var choices = choicesFor(S.issue);
    var h = '<div class="pdxus-poll" role="group" aria-label="Poll on ' + esc(issueLabel(S.issue)) + '">';
    for (var c = 0; c < choices.length; c++) {
      var ch = choices[c];
      var n = t ? Math.max(0, Number(t[ch.key]) || 0) : 0;
      h += '<button type="button" class="pdxus-choice' + (mine === ch.key ? ' is-mine' : '') + '" data-pdxus-vote="' + esc(ch.key) + '"' +
        (open && !S.busy ? '' : ' disabled') + ' aria-pressed="' + (mine === ch.key ? 'true' : 'false') + '">' +
        '<span>' + esc(ch.label) + '</span><span class="pdxus-n">' + esc(n) + '</span></button>';
    }
    h += '</div><p class="pdxus-note">' + esc((t ? Math.max(0, Number(t.total) || 0) : 0) + ' votes') +
      (open ? '' : ' · ' + COPY.voteLocked) + '</p>';
    if (S.pollStatus) h += '<p class="pdxus-status" role="status">' + esc(S.pollStatus) + '</p>';
    return h;
  }

  function render() {
    if (!_host) return;
    var keepRoom = _host.querySelector('[data-pdxus-body="room"]');
    var keepChat = _host.querySelector('[data-pdxus-body="chat"]');
    var rv = keepRoom ? keepRoom.value : '';
    var cv = keepChat ? keepChat.value : '';
    _host.setAttribute('data-pdxus-boot', 'painted');
    _host.innerHTML =
      '<section class="pdxus-band" data-pdxus-band="standing"><h2 class="pdxus-h2">Your voice here</h2>' + standingHtml() + '</section>' +
      '<section class="pdxus-band" data-pdxus-band="room"><h2 class="pdxus-h2">The room</h2>' +
        '<p class="pdxus-note">The national general thread. Anyone can read it.</p>' +
        composerHtml('room', 'Say something to the country', S.roomStatus) +
        feedHtml(S.room, S.roomErr, COPY.emptyRoom, false) + '</section>' +
      '<section class="pdxus-band" data-pdxus-band="chat"><h2 class="pdxus-h2">Issues: chat and poll</h2>' +
        issuePickerHtml() +
        '<h3 class="pdxus-h3">Poll</h3>' + pollHtml() +
        '<h3 class="pdxus-h3">Comments</h3>' +
        composerHtml('chat', 'Comment on this issue', S.chatStatus) +
        feedHtml(S.chat, S.chatErr, COPY.emptyChat, false) + '</section>';
    var r2 = _host.querySelector('[data-pdxus-body="room"]');
    var c2 = _host.querySelector('[data-pdxus-body="chat"]');
    if (r2 && rv) r2.value = rv;
    if (c2 && cv) c2.value = cv;
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!t || t.disabled) return;
    if (t.hasAttribute('data-pdxus-prove')) { prove(); return; }
    if (t.hasAttribute('data-pdxus-post')) { post(t.getAttribute('data-pdxus-post')); return; }
    if (t.hasAttribute('data-pdxus-like')) { like(t.getAttribute('data-pdxus-like')); return; }
    if (t.hasAttribute('data-pdxus-vote')) { vote(t.getAttribute('data-pdxus-vote')); return; }
  }
  function onChange(e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute('data-pdxus-issue')) {
      S.issue = String(t.value || '');
      S.chat = null; S.chatStatus = ''; S.pollStatus = '';
      render();
      loadChat().then(render, render);
    }
  }

  function mount(host) {
    if (!host || host.getAttribute('data-pdxus-seat') !== SEAT) return false;
    _host = host;
    var g = issueGroups();
    S.issue = g.length ? g[0].keys[0].key : '';
    host.addEventListener('click', onClick);
    host.addEventListener('change', onChange);
    render();
    load();
    // Re-ask when the account settles or changes; signing in can only open more.
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) window.auth.onAuthStateChanged(function () { load(); });
    } catch (e) {}
    try { window.addEventListener('pdx-account-change', function () { load(); }); } catch (e) {}
    return true;
  }

  function boot() { mount(document.getElementById('pdx-usa-voice')); }

  window.PDXUsaVoice = { SEAT: SEAT, mount: mount, load: load, choicesFor: choicesFor };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
