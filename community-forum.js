/* ══════════════════════════════════════════════════════════════════════════════
   community-forum.js — THE OPEN TRACK'S CONTROLLER, AND ITS OWN FILE.
   ────────────────────────────────────────────────────────────────────────────
   Vanilla, self-contained controller for the OPEN conversation track. Talks to
   /api/forum (its own Netlify Function + tables). Reuses the site's Firebase
   sign-in for identity. Entirely separate from the Community Evidence Exchange
   controller and the curated Evidence Locker — no shared state, no promotion.

   WHERE IT CAME FROM. 446 lines of inline <script> in index.html, directly under
   the section it drives, lifted whole. Like its sibling it was already a closed
   IIFE with its own esc() and a guarded read for every global, so the move is a
   cut rather than a rewrite.

   WHAT CHANGED IN THE MOVE, AND NOTHING ELSE DID:
     1. THE ROOM CAN BE OPENED PRE-SCOPED FROM ANOTHER DOCUMENT. openForTopic and
        startThreadFor used to be same-page calls from stance-library.js.
        /community is a document now, so community-link.js hands the intent over
        in sessionStorage and the query string, and takeHandoff() below is the
        other half of that pair.
     2. THE SECTION IS NO LONGER LAZY BEHIND A SCROLL, for the same reason its
        sibling is not: on /community the board is why the reader is here.

   WHAT IS STILL TRUE, AND IT IS THE WALL BETWEEN THE TWO TRACKS. Nothing posted
   here enters the Evidence Locker, and there is no path that promotes it. The
   votes on this board are a sort order for this board's own threads — they are
   not a score on a person, a stance or a bill, and they are never read anywhere
   outside this file. Moderation is reactive: spam and hate, removed on a flag.
   ════════════════════════════════════════════════════════════════════════════════ */
(function () {
  var API = '/api/forum';
  var initialized = false;
  var state = { sort: 'hot', topic: '', link: '', threads: [], viewer: null };

  var TOPICS = [
    { key: 'general',   label: 'General' },
    { key: 'stances',   label: 'Stances' },
    { key: 'reforms',   label: 'Reforms' },
    { key: 'elections', label: 'Elections' },
    { key: 'money',     label: 'Money in Politics' },
    { key: 'media',     label: 'Media & Messaging' },
    { key: 'meta',      label: 'Meta / Site' }
  ];
  var LINK_TYPES = [
    { key: 'politician', label: 'Politician' },
    { key: 'issue',      label: 'Issue / Stance' },
    { key: 'reform',     label: 'Reform / Proposal' },
    { key: 'promise',    label: 'Promise' },
    { key: 'spotlight',  label: 'Spotlight' },
    { key: 'evidence',   label: 'Evidence item' },
    { key: 'other',      label: 'Other' }
  ];
  var FLAG_REASONS = [
    { key: 'spam', label: 'Spam' },
    { key: 'hate', label: 'Hate / harassment' },
    { key: 'personal_attack', label: 'Personal attack' },
    { key: 'off_topic', label: 'Off topic' },
    { key: 'other', label: 'Other' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    var m = s / 60; if (m < 60) return Math.floor(m) + 'm ago';
    var h = m / 60; if (h < 24) return Math.floor(h) + 'h ago';
    var d = h / 24; if (d < 30) return Math.floor(d) + 'd ago';
    try { return new Date(iso).toLocaleDateString(); } catch (e) { return ''; }
  }
  function truncate(s, n) { s = s || ''; return s.length > n ? s.slice(0, n).trim() + '…' : s; }
  function topicLabel(key) { var t = TOPICS.filter(function (x) { return x.key === key; })[0]; return t ? t.label : key; }
  function linkTypeLabel(key) { var t = LINK_TYPES.filter(function (x) { return x.key === key; })[0]; return t ? t.label : key; }

  // ── Auth: reuse the site's Firebase sign-in ──────────────────────────
  function currentUser() { try { return (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null; } catch (e) { return null; } }
  function signedIn() { var u = currentUser(); return !!(u && !u.isAnonymous); }
  function requireSignIn() { if (signedIn()) return true; if (typeof window.openAuthModal === 'function') window.openAuthModal(); return false; }
  function authToken() { var u = currentUser(); if (!u || u.isAnonymous) return Promise.resolve(null); return u.getIdToken().catch(function () { return null; }); }
  function isModerator() { var u = currentUser(); var e = u && u.email ? u.email.toLowerCase() : ''; return e === 'cdeluxxe@gmail.com'; }

  function api(path, opts) {
    opts = opts || {};
    return authToken().then(function (token) {
      var headers = opts.headers || {};
      if (opts.body) headers['content-type'] = 'application/json';
      if (token) headers['authorization'] = 'Bearer ' + token;
      return fetch(API + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; })
          .catch(function () { return { ok: r.ok, status: r.status, data: {} }; });
      });
    });
  }

  // ── Vote control (shared by threads + replies) ───────────────────────
  function voteControl(tt, id, score, viewerVote, small) {
    return '<div class="fbd-vote' + (small ? ' fbd-vote-sm' : '') + '" id="fbd-vote-' + tt + '-' + id + '">' +
      '<button class="fbd-arrow up' + (viewerVote === 1 ? ' active' : '') + '" data-vote="1" data-tt="' + tt + '" data-id="' + id + '" aria-label="Upvote">▲</button>' +
      '<span class="fbd-score">' + (score || 0) + '</span>' +
      '<button class="fbd-arrow down' + (viewerVote === -1 ? ' active' : '') + '" data-vote="-1" data-tt="' + tt + '" data-id="' + id + '" aria-label="Downvote">▼</button>' +
    '</div>';
  }
  function updateVoteControl(tt, id, score, viewerVote) {
    var el = document.getElementById('fbd-vote-' + tt + '-' + id);
    if (!el) return;
    var up = el.querySelector('.fbd-arrow.up'), down = el.querySelector('.fbd-arrow.down'), sc = el.querySelector('.fbd-score');
    if (sc) sc.textContent = score || 0;
    if (up) up.classList.toggle('active', viewerVote === 1);
    if (down) down.classList.toggle('active', viewerVote === -1);
  }
  function doVote(tt, id, value) {
    if (!requireSignIn()) return;
    var base = tt === 'thread' ? '/threads/' : '/replies/';
    api(base + id + '/vote', { method: 'POST', body: { value: value } }).then(function (res) {
      if (!res.ok) return;
      updateVoteControl(tt, id, res.data.score, res.data.viewerVote);
      if (tt === 'thread') { var t = findThread(id); if (t) { t.score = res.data.score; t.viewerVote = res.data.viewerVote; } }
    });
  }
  function findThread(id) { return state.threads.filter(function (t) { return t.id === id; })[0]; }

  // ── Reference chip (one-way deep link to an app item; context only) ───
  function refChip(link) {
    if (!link) return '';
    var label = link.label || (link.type ? linkTypeLabel(link.type) : 'Reference');
    var ref = link.ref || '';
    var isLink = /^(#|\/|https?:)/i.test(ref);
    var inner = '🔗 ' + esc(truncate(label, 60));
    if (isLink) return '<a class="fbd-ref" href="' + esc(ref) + '"' + (/^https?:/i.test(ref) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + inner + '</a>';
    return '<span class="fbd-ref" title="' + esc(ref) + '">' + inner + '</span>';
  }

  // ── List ─────────────────────────────────────────────────────────────
  function threadCard(t) {
    var removed = t.status === 'removed' ? '<span class="fbd-pill fbd-pill-removed">Removed</span>' : '';
    return '' +
      '<div class="fbd-card" data-card="' + t.id + '">' +
        voteControl('thread', t.id, t.score, t.viewerVote, false) +
        '<div class="fbd-card-main">' +
          '<div class="fbd-card-top">' +
            '<span class="fbd-pill fbd-pill-topic">' + esc(topicLabel(t.topic)) + '</span>' +
            (t.link ? refChip(t.link) : '') + removed +
          '</div>' +
          '<div class="fbd-card-title" data-open="' + t.id + '">' + esc(t.title) + '</div>' +
          '<div class="fbd-meta"><span>by ' + esc(t.authorName) + '</span><span>· ' + ago(t.createdAt) + '</span><span>· 💬 ' + (t.replyCount || 0) + '</span></div>' +
          (t.body ? '<div class="fbd-body">' + esc(truncate(t.body, 240)) + '</div>' : '') +
          '<div class="fbd-actions">' +
            '<button class="fbd-link-btn" data-open="' + t.id + '">💬 Discuss</button>' +
            '<button class="fbd-link-btn fbd-flag" data-flag-thread="' + t.id + '">🚩 Flag</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function renderList() {
    var list = document.getElementById('fbd-list');
    if (!state.threads.length) {
      list.innerHTML = '<div class="fbd-empty">' + (state.topic
        ? 'No threads in ' + esc(topicLabel(state.topic)) + ' yet — start one.'
        : 'No open threads yet — be the first to start a conversation.') + '</div>';
      return;
    }
    list.innerHTML = state.threads.map(threadCard).join('');
  }
  function loadList() {
    var list = document.getElementById('fbd-list');
    list.innerHTML = '<div class="fbd-skel"></div><div class="fbd-skel"></div><div class="fbd-skel"></div>';
    var qs = '?sort=' + encodeURIComponent(state.sort) +
      (state.topic ? '&topic=' + encodeURIComponent(state.topic) : '') +
      (state.link ? '&link=' + encodeURIComponent(state.link) : '');
    return api('/threads' + qs).then(function (res) {
      if (!res.ok) { list.innerHTML = '<div class="fbd-empty">Could not load threads. Please try again.</div>'; return; }
      state.threads = res.data.threads || [];
      state.viewer = res.data.viewer || null;
      renderList();
    }).catch(function () { list.innerHTML = '<div class="fbd-empty">Could not load threads. Please try again.</div>'; });
  }

  // ── Compose ──────────────────────────────────────────────────────────
  var prefillLink = null;
  function openCompose() {
    if (!requireSignIn()) return;
    var topicOpts = TOPICS.map(function (t) { return '<option value="' + esc(t.key) + '"' + (t.key === (state.topic || 'general') ? ' selected' : '') + '>' + esc(t.label) + '</option>'; }).join('');
    var typeOpts = '<option value="">— None —</option>' + LINK_TYPES.map(function (t) { return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>'; }).join('');
    var pl = prefillLink || {};
    var modal = document.getElementById('fbd-modal');
    modal.innerHTML = '' +
      '<div class="fbd-modal-head"><div class="fbd-modal-title">＋ New Thread</div><button class="fbd-close" data-close>×</button></div>' +
      '<p class="fbd-sub" style="text-align:left;margin:-0.4rem 0 1rem;">Open board — free discussion, no approval needed. Keep it civil. This won\'t enter the Evidence Locker.</p>' +
      '<div class="fbd-field"><label>Title *</label><input class="fbd-input" id="fbd-f-title" maxlength="200" placeholder="What do you want to talk about?"></div>' +
      '<div class="fbd-field"><label>Body</label><textarea class="fbd-textarea" id="fbd-f-body" maxlength="8000" placeholder="Say your piece. Play the ball, not the person."></textarea></div>' +
      '<div class="fbd-field"><label>Topic</label><select class="fbd-select" id="fbd-f-topic">' + topicOpts + '</select></div>' +
      '<div class="fbd-field"><label>Reference something in PolitiDex (optional)</label>' +
        '<div class="fbd-row">' +
          '<div class="fbd-field" style="margin-bottom:0;"><select class="fbd-select" id="fbd-f-linktype">' + typeOpts + '</select></div>' +
          '<div class="fbd-field" style="margin-bottom:0;flex:2;"><input class="fbd-input" id="fbd-f-linklabel" maxlength="200" placeholder="Label (e.g. “Rep. Maloy on broadband”)" value="' + esc(pl.label || '') + '"></div>' +
        '</div>' +
        '<input class="fbd-input" id="fbd-f-linkref" maxlength="300" placeholder="Optional link or id (#agenda, /issue/…, https://…)" value="' + esc(pl.ref || '') + '" style="margin-top:0.5rem;">' +
        '<div class="fbd-hint">A one-way pointer for context — it links out to the item, nothing is pulled in.</div></div>' +
      '<div style="display:flex;gap:0.6rem;justify-content:flex-end;align-items:center;">' +
        '<div class="fbd-form-msg" id="fbd-f-msg" style="margin-right:auto;"></div>' +
        '<button class="fbd-btn fbd-btn-ghost" data-close>Cancel</button>' +
        '<button class="fbd-btn fbd-btn-primary" id="fbd-f-submit">Post Thread</button>' +
      '</div>';
    if (pl.type) { var ts = document.getElementById('fbd-f-linktype'); if (ts) ts.value = pl.type; }
    document.getElementById('fbd-f-submit').addEventListener('click', submitCompose);
    prefillLink = null;
    openOverlay();
  }
  function submitCompose() {
    var msg = document.getElementById('fbd-f-msg');
    var title = document.getElementById('fbd-f-title').value.trim();
    if (!title) { msg.className = 'fbd-form-msg err'; msg.textContent = 'A title is required.'; return; }
    var body = {
      title: title,
      body: document.getElementById('fbd-f-body').value.trim(),
      topic: document.getElementById('fbd-f-topic').value || 'general',
      linkType: document.getElementById('fbd-f-linktype').value || null,
      linkLabel: document.getElementById('fbd-f-linklabel').value.trim() || null,
      linkRef: document.getElementById('fbd-f-linkref').value.trim() || null
    };
    var btn = document.getElementById('fbd-f-submit');
    btn.disabled = true; msg.className = 'fbd-form-msg'; msg.textContent = 'Posting…';
    api('/threads', { method: 'POST', body: body }).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { msg.className = 'fbd-form-msg err'; msg.textContent = (res.data && res.data.error) || 'Could not post.'; return; }
      // Personal Impact Tracker (opt-in): a discussion thread you started.
      try { if (window.PDXImpact) window.PDXImpact.record('shared'); } catch (e) {}
      closeOverlay();
      state.sort = 'new'; syncTabs(); loadList();
    });
  }

  // ── Detail + replies ─────────────────────────────────────────────────
  var detailOpenId = null;
  var replyTo = null;
  function openDetail(threadId) {
    detailOpenId = threadId; replyTo = null;
    var modal = document.getElementById('fbd-modal');
    modal.innerHTML = '<div class="fbd-empty">Loading…</div>';
    openOverlay();
    api('/threads/' + threadId).then(function (res) {
      if (!res.ok) { modal.innerHTML = '<div class="fbd-empty">This thread is unavailable.</div>'; return; }
      renderDetail(res.data);
    });
  }
  function renderDetail(d) {
    var t = d.thread;
    var modal = document.getElementById('fbd-modal');
    modal.innerHTML = '' +
      '<div class="fbd-modal-head"><div>' +
        '<div class="fbd-card-top" style="margin-bottom:0.5rem;"><span class="fbd-pill fbd-pill-topic">' + esc(topicLabel(t.topic)) + '</span>' + (t.link ? refChip(t.link) : '') + '</div>' +
        '<div class="fbd-modal-title">' + esc(t.title) + '</div>' +
        '<div class="fbd-meta" style="margin-top:0.4rem;"><span>by ' + esc(t.authorName) + '</span><span>· ' + ago(t.createdAt) + '</span></div>' +
      '</div><button class="fbd-close" data-close>×</button></div>' +
      '<div style="display:flex;gap:0.85rem;">' +
        voteControl('thread', t.id, t.score, t.viewerVote, false) +
        '<div style="flex:1;min-width:0;">' + (t.body ? '<div class="fbd-body">' + esc(t.body) + '</div>' : '<div class="fbd-body" style="color:#6f938c;">(no body)</div>') +
          '<div class="fbd-actions"><button class="fbd-link-btn fbd-flag" data-flag-thread="' + t.id + '">🚩 Flag</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="fbd-replies">' +
        '<label style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:#7fa39c;font-weight:700;">Replies (' + (d.replies || []).length + ')</label>' +
        '<div id="fbd-composer" style="margin:0.6rem 0;">' +
          '<div id="fbd-reply-ctx" style="font-size:0.74rem;color:#5eead4;margin-bottom:0.3rem;display:none;"></div>' +
          '<textarea class="fbd-textarea" id="fbd-reply-body" maxlength="8000" placeholder="Add a reply…"></textarea>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:0.4rem;"><button class="fbd-btn fbd-btn-ghost" id="fbd-reply-submit">Reply</button></div>' +
        '</div>' +
        '<div id="fbd-reply-tree"></div>' +
      '</div>';
    renderReplies(d.replies || []);
    document.getElementById('fbd-reply-submit').addEventListener('click', submitReply);
  }
  function renderReplies(replies) {
    var tree = document.getElementById('fbd-reply-tree');
    var byParent = {};
    replies.forEach(function (r) { (byParent[r.parentId || 0] = byParent[r.parentId || 0] || []).push(r); });
    function node(r) {
      var kids = (byParent[r.id] || []).map(node).join('');
      return '<div class="fbd-reply">' +
        voteControl('reply', r.id, r.score, r.viewerVote, true) +
        '<div class="fbd-reply-main">' +
          '<div class="fbd-reply-meta"><b>' + esc(r.authorName) + '</b> · ' + ago(r.createdAt) + '</div>' +
          '<div class="fbd-reply-body">' + esc(r.body) + '</div>' +
          '<div class="fbd-reply-actions">' +
            '<button class="fbd-reply-btn" data-reply="' + r.id + '" data-name="' + esc(r.authorName) + '">↩ Reply</button>' +
            '<button class="fbd-reply-btn fbd-flag" data-flag-reply="' + r.id + '">🚩 Flag</button>' +
          '</div>' +
          (kids ? '<div class="fbd-thread-nest">' + kids + '</div>' : '') +
        '</div>' +
      '</div>';
    }
    var roots = (byParent[0] || []);
    tree.innerHTML = roots.length ? roots.map(node).join('') : '<div style="color:#7fa39c;font-size:0.85rem;padding:0.5rem 0;">No replies yet. Start the conversation.</div>';
  }
  function setReply(id, name) {
    replyTo = id;
    var ctx = document.getElementById('fbd-reply-ctx');
    if (ctx) {
      ctx.style.display = 'block';
      ctx.innerHTML = '↩ Replying to <b>' + esc(name) + '</b> · <span style="cursor:pointer;text-decoration:underline;" id="fbd-reply-cancel">cancel</span>';
      document.getElementById('fbd-reply-cancel').addEventListener('click', function () { replyTo = null; ctx.style.display = 'none'; });
    }
    var ta = document.getElementById('fbd-reply-body'); if (ta) ta.focus();
  }
  function submitReply() {
    if (!requireSignIn()) return;
    var ta = document.getElementById('fbd-reply-body');
    var text = ta.value.trim();
    if (!text) return;
    var btn = document.getElementById('fbd-reply-submit');
    btn.disabled = true;
    api('/threads/' + detailOpenId + '/replies', { method: 'POST', body: { body: text, parentId: replyTo } }).then(function (res) {
      btn.disabled = false;
      if (!res.ok) return;
      // Personal Impact Tracker (opt-in): a reply you posted on a discussion thread.
      try { if (window.PDXImpact) window.PDXImpact.record('discussed'); } catch (e) {}
      openDetail(detailOpenId); // reload to show the new (possibly nested) reply
    });
  }

  // ── Flag ─────────────────────────────────────────────────────────────
  function openFlag(tt, id) {
    if (!requireSignIn()) return;
    var opts = FLAG_REASONS.map(function (r) { return '<option value="' + r.key + '">' + esc(r.label) + '</option>'; }).join('');
    var modal = document.getElementById('fbd-modal');
    modal.innerHTML = '' +
      '<div class="fbd-modal-head"><div class="fbd-modal-title">🚩 Flag this ' + (tt === 'reply' ? 'reply' : 'thread') + '</div><button class="fbd-close" data-close>×</button></div>' +
      '<p class="fbd-sub" style="text-align:left;margin-bottom:0.9rem;">Flag content that breaks the house rules — spam, hate, or a personal attack. A moderator will review it.</p>' +
      '<div class="fbd-field"><label>Reason</label><select class="fbd-select" id="fbd-flag-reason">' + opts + '</select></div>' +
      '<div class="fbd-field"><label>Note (optional)</label><textarea class="fbd-textarea" id="fbd-flag-note" maxlength="1000" placeholder="Anything the moderator should know."></textarea></div>' +
      '<div style="display:flex;gap:0.6rem;justify-content:flex-end;align-items:center;"><div class="fbd-form-msg" id="fbd-flag-msg" style="margin-right:auto;"></div>' +
        '<button class="fbd-btn fbd-btn-ghost" data-close>Cancel</button>' +
        '<button class="fbd-btn fbd-btn-primary" id="fbd-flag-submit">Submit Flag</button></div>';
    document.getElementById('fbd-flag-submit').addEventListener('click', function () {
      var body = { reason: document.getElementById('fbd-flag-reason').value, note: document.getElementById('fbd-flag-note').value.trim() };
      var base = tt === 'reply' ? '/replies/' : '/threads/';
      api(base + id + '/flag', { method: 'POST', body: body }).then(function (res) {
        var msg = document.getElementById('fbd-flag-msg');
        if (!res.ok) { msg.className = 'fbd-form-msg err'; msg.textContent = (res.data && res.data.error) || 'Could not flag.'; return; }
        msg.className = 'fbd-form-msg ok'; msg.textContent = 'Thank you — flagged for review.';
        setTimeout(closeOverlay, 900);
      });
    });
    openOverlay();
  }

  // ── Moderation (reactive) ────────────────────────────────────────────
  function loadModeration() {
    var body = document.getElementById('fbd-mod-body');
    if (!body) return;
    body.innerHTML = '<p class="fbd-empty">Loading queue…</p>';
    api('/moderation').then(function (res) {
      if (!res.ok) { body.innerHTML = '<p class="fbd-empty">' + ((res.data && res.data.error) || 'Unavailable.') + '</p>'; return; }
      renderModeration(res.data.items || []);
    });
  }
  function renderModeration(items) {
    var body = document.getElementById('fbd-mod-body');
    if (!items.length) { body.innerHTML = '<p class="fbd-empty">Nothing flagged. 🎉</p>'; return; }
    body.innerHTML = items.map(function (it) {
      var title = it.targetType === 'thread' ? esc(it.title) : '↳ reply in thread #' + esc(it.threadId);
      var reasons = (it.flags || []).map(function (f) { return esc(f.reason) + (f.note ? ' — ' + esc(f.note) : ''); }).join(' · ');
      var restore = it.status === 'removed';
      return '<div class="fbd-mod-item">' +
        '<div style="font-weight:700;color:#eafbf6;">' + title + '</div>' +
        '<div class="fbd-meta">' + it.targetType + ' · by ' + esc(it.authorName) + ' · ' + ago(it.createdAt) + ' · status: ' + esc(it.status) + '</div>' +
        (it.body ? '<div class="fbd-body" style="font-size:0.82rem;">' + esc(truncate(it.body, 240)) + '</div>' : '') +
        '<div class="fbd-mod-reasons">🚩 ' + reasons + '</div>' +
        '<div class="fbd-mod-actions">' +
          (restore
            ? '<button class="fbd-btn fbd-btn-ghost" data-fmod="restore" data-tt="' + it.targetType + '" data-id="' + it.targetId + '">↩ Restore</button>'
            : '<button class="fbd-btn fbd-btn-ghost" data-fmod="remove" data-tt="' + it.targetType + '" data-id="' + it.targetId + '">🗑 Remove</button>') +
          '<button class="fbd-btn fbd-btn-ghost" data-fmod="resolve_flags" data-tt="' + it.targetType + '" data-id="' + it.targetId + '">✓ Resolve flags</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }
  function doModerate(tt, id, action) {
    var base = tt === 'reply' ? '/replies/' : '/threads/';
    api(base + id + '/moderate', { method: 'POST', body: { action: action } }).then(function (res) {
      if (res.ok) { loadModeration(); loadList(); }
    });
  }

  // ── Overlay plumbing ─────────────────────────────────────────────────
  function openOverlay() { document.getElementById('fbd-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeOverlay() { document.getElementById('fbd-overlay').classList.remove('open'); document.body.style.overflow = ''; detailOpenId = null; replyTo = null; }
  function syncTabs() {
    document.querySelectorAll('#fbd-tabs .fbd-tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-sort') === state.sort); });
  }

  // ── Wiring (event delegation) ────────────────────────────────────────
  function wire() {
    var sel = document.getElementById('fbd-topic-filter');
    sel.innerHTML = '<option value="">All topics</option>' + TOPICS.map(function (t) { return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>'; }).join('');
    sel.addEventListener('change', function () { state.topic = sel.value; loadList(); });

    document.getElementById('fbd-tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.fbd-tab'); if (!t) return;
      state.sort = t.getAttribute('data-sort'); syncTabs(); loadList();
    });
    document.getElementById('fbd-new-btn').addEventListener('click', openCompose);

    document.getElementById('open-forum').addEventListener('click', function (e) {
      var t = e.target;
      var vote = t.closest('[data-vote]'); if (vote) { doVote(vote.getAttribute('data-tt'), +vote.getAttribute('data-id'), +vote.getAttribute('data-vote')); return; }
      var open = t.closest('[data-open]'); if (open) { openDetail(+open.getAttribute('data-open')); return; }
      var ft = t.closest('[data-flag-thread]'); if (ft) { openFlag('thread', +ft.getAttribute('data-flag-thread')); return; }
      var fr = t.closest('[data-flag-reply]'); if (fr) { openFlag('reply', +fr.getAttribute('data-flag-reply')); return; }
      var reply = t.closest('[data-reply]'); if (reply) { setReply(+reply.getAttribute('data-reply'), reply.getAttribute('data-name')); return; }
      if (t.closest('[data-close]')) { closeOverlay(); return; }
      var mod = t.closest('[data-fmod]'); if (mod) { doModerate(mod.getAttribute('data-tt'), +mod.getAttribute('data-id'), mod.getAttribute('data-fmod')); return; }
    });
    document.getElementById('fbd-mod-refresh').addEventListener('click', loadModeration);
    document.getElementById('fbd-overlay').addEventListener('click', function (e) { if (e.target.id === 'fbd-overlay') closeOverlay(); });

    function maybeLoadMod() {
      var mod = document.getElementById('fbd-mod');
      if (isModerator()) { if (mod) mod.style.display = 'block'; loadModeration(); }
      else if (mod) { mod.style.display = 'none'; }
    }
    maybeLoadMod();
    try { if (typeof auth !== 'undefined' && auth && auth.onAuthStateChanged) auth.onAuthStateChanged(function () { maybeLoadMod(); }); } catch (e) {}
  }

  function init() { if (initialized) return; initialized = true; wire(); loadList(); }

  // ── Integration hook: let other parts of the app open the board pre-scoped
  // to a topic, or start a thread already referencing an app item. This is the
  // ONLY bridge, and it is one-way (open a composer) — nothing reads forum data
  // back into the app, and nothing here touches the verified pipeline. ──────
  window.PDXForum = {
    openForTopic: function (topic) {
      if (topic) state.topic = topic;
      var sel = document.getElementById('fbd-topic-filter');
      if (!initialized) init(); else loadList();
      if (sel && topic) sel.value = topic;
      try { if (location.hash !== '#open-forum') location.hash = '#open-forum'; } catch (e) {}
      var s = document.getElementById('open-forum'); if (s && s.scrollIntoView) { try { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
    },
    // Start a new thread referencing an app item: type + human label + optional href.
    startThreadFor: function (type, label, ref, topic) {
      prefillLink = { type: type || 'other', label: label || '', ref: ref || '' };
      if (topic) state.topic = topic;
      if (!initialized) init();
      try { if (location.hash !== '#open-forum') location.hash = '#open-forum'; } catch (e) {}
      openCompose();
    }
  };

  // ── THE HANDOFF — THE OTHER HALF OF community-link.js ──────────────────
  // stance-library.js's "Discuss this issue" used to call PDXForum.openForTopic()
  // on the same page. It is a navigation now, so the topic travels with it: in
  // the query, because /community?topic=<key>#open-forum is an address a reader
  // can paste, and in sessionStorage for the composer prefill, which carries a
  // label and a reference that have no business in a URL. The stash is read once
  // and deleted on read, so an abandoned intent cannot reopen a composer on the
  // reader's next visit.
  //
  // THE BOARD IS STILL THE SECOND ROOM ON THE PAGE. Arriving with a topic does
  // not promote it above the Exchange or change the document's order; it filters
  // this board and scrolls to it, which is what the same call did before.
  var HANDOFF_KEY = 'pdx_forum_open';
  function readHandoff() {
    var raw = null;
    try { raw = sessionStorage.getItem(HANDOFF_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { sessionStorage.removeItem(HANDOFF_KEY); } catch (e) {}
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function queryParam(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search || '');
      return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    } catch (e) { return ''; }
  }
  var pendingCompose = false;
  var pendingThread = 0;
  function takeHandoff() {
    var h = readHandoff();
    if (h && h.topic) state.topic = h.topic;
    else {
      var qt = queryParam('topic');
      if (qt) state.topic = qt;
    }
    if (h && h.kind === 'thread' && h.link) {
      prefillLink = { type: h.link.type || 'other', label: h.link.label || '', ref: h.link.ref || '' };
      pendingCompose = true;
    }
    var qThread = +queryParam('thread');
    if (qThread) { pendingThread = qThread; pendingCompose = false; }
  }
  function drainPending() {
    if (pendingThread) { var id = pendingThread; pendingThread = 0; try { openDetail(id); } catch (e) {} return; }
    if (!pendingCompose) return;
    pendingCompose = false;
    // SAME RULE AS THE EXCHANGE: "unknown" is not "signed out". openCompose()
    // runs requireSignIn(), and on a cold arrival the deferred Firebase SDK has
    // not answered yet — so a returning member would be shown a sign-in prompt
    // instead of the form. Ask once the answer exists; the shell's stub self-heals
    // with null after five seconds, so this fires exactly once either way.
    function open() { try { openCompose(); } catch (e) {} }
    try {
      if (window.PDXAuth && window.PDXAuth.known) { open(); return; }
      if (typeof auth !== 'undefined' && auth && auth.onAuthStateChanged) {
        var done = false;
        var off = auth.onAuthStateChanged(function () {
          if (done) return; done = true;
          try { if (typeof off === 'function') off(); } catch (e) {}
          open();
        });
        return;
      }
    } catch (e) {}
    open();
  }

  // NOT LAZY HERE. On the homepage this board sat below two thousand lines of
  // other rooms and an IntersectionObserver was the honest way to avoid paying
  // for it. On /community it is one of the two rooms the address names, so it
  // loads with the document. The absent-section guard stays because a controller
  // that assumes its own markup is a controller that throws on the day it is
  // loaded somewhere else.
  function setup() {
    var section = document.getElementById('open-forum');
    if (!section) return;
    takeHandoff();
    init();
    // The topic <select> only has its options after wire() ran inside init(), so
    // the incoming topic is reflected into the control here rather than while it
    // is still an empty dropdown.
    var sel = document.getElementById('fbd-topic-filter');
    if (sel && state.topic) sel.value = state.topic;
    setTimeout(drainPending, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  window.addEventListener('hashchange', function () { if (location.hash === '#open-forum') init(); });
})();
