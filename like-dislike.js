// ─────────────────────────────────────────────────────────────────────────────
// Like / dislike system (Firestore "votes")
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 28888 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════
  // LIKE + DISLIKE SYSTEM — Firestore "votes" collection
  // Document ID = politician pid, fields: likes, dislikes
  // ════════════════════════════════════════════════════════
  var _likedPids = new Set(JSON.parse(localStorage.getItem('pdx_liked_pids') || '[]'));
  var _dislikedPids = new Set(JSON.parse(localStorage.getItem('pdx_disliked_pids') || '[]'));
  var _likeCounts = {};
  var _dislikeCounts = {};
  var _commentedPids = new Set(JSON.parse(localStorage.getItem('pdx_commented_pids') || '[]'));
  var _commentCounts = {};
  var _votesListenerActive = false;
  var _commentsListenerActive = false;
  var _votesDataLoaded = false;

  var _voteSaveTimer = null;
  function _showVoteSaveToast() {
    var toast = document.getElementById('vote-save-toast');
    if (!toast) return;
    toast.classList.add('visible');
    if (_voteSaveTimer) clearTimeout(_voteSaveTimer);
    _voteSaveTimer = setTimeout(function() { toast.classList.remove('visible'); }, 2200);
  }

  var _voteNudgeTimer = null;
  function _showVoteSigninNudge() {
    var toast = document.getElementById('vote-signin-nudge');
    if (!toast) return;
    toast.classList.add('visible');
    if (_voteNudgeTimer) clearTimeout(_voteNudgeTimer);
    _voteNudgeTimer = setTimeout(function() { toast.classList.remove('visible'); }, 5000);
  }
  window._hideVoteSigninNudge = function() {
    var toast = document.getElementById('vote-signin-nudge');
    if (toast) toast.classList.remove('visible');
    if (_voteNudgeTimer) clearTimeout(_voteNudgeTimer);
  };

  function _isRealUser() {
    var user = auth.currentUser;
    return user && !user.isAnonymous;
  }

  function _saveUserVoteToFirestore(basePid, voteType) {
    var user = auth.currentUser;
    if (!user || user.isAnonymous) return;
    db.collection('users').doc(user.uid).collection('votes').doc(basePid).set({
      type: voteType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      _showVoteSaveToast();
    }).catch(function(e) {
      console.warn('User vote save error:', e);
    });
  }

  function handleLike(btn, pid) {
    var basePid = pid.replace(/^(modal-|catch-|dir-)/, '');
    if (_likedPids.has(basePid)) return;

    var user = auth.currentUser;
    if (!user || user.isAnonymous) {
      _showVoteSigninNudge();
    }

    if (_dislikedPids.has(basePid)) {
      _dislikedPids.delete(basePid);
      _dislikeCounts[basePid] = Math.max(0, (_dislikeCounts[basePid] || 0) - 1);
      localStorage.setItem('pdx_disliked_pids', JSON.stringify(Array.from(_dislikedPids)));
      _fbAuthReady.then(function() {
        setDoc(db.collection('votes').doc(basePid), {
          dislikes: firebase.firestore.FieldValue.increment(-1)
        }, { merge: true }).catch(function(e) { console.warn('votes undo dislike error:', e); });
      });
    }

    _likedPids.add(basePid);
    _likeCounts[basePid] = (_likeCounts[basePid] || 0) + 1;
    _syncVoteUI(basePid);

    localStorage.setItem('pdx_liked_pids', JSON.stringify(Array.from(_likedPids)));

    _fbAuthReady.then(function() {
      setDoc(db.collection('votes').doc(basePid), {
        likes: firebase.firestore.FieldValue.increment(1)
      }, { merge: true }).catch(function(e) {
        console.warn('votes write error:', e);
      });
    });

    _saveUserVoteToFirestore(basePid, 'like');

    fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: basePid, type: 'like' })
    }).catch(function(e) {
      console.warn('Netlify votes write error:', e);
    });
  }

  function handleDislike(btn, pid) {
    var basePid = pid.replace(/^(modal-|catch-|dir-)/, '');
    if (_dislikedPids.has(basePid)) return;

    var user = auth.currentUser;
    if (!user || user.isAnonymous) {
      _showVoteSigninNudge();
    }

    if (_likedPids.has(basePid)) {
      _likedPids.delete(basePid);
      _likeCounts[basePid] = Math.max(0, (_likeCounts[basePid] || 0) - 1);
      localStorage.setItem('pdx_liked_pids', JSON.stringify(Array.from(_likedPids)));
      _fbAuthReady.then(function() {
        setDoc(db.collection('votes').doc(basePid), {
          likes: firebase.firestore.FieldValue.increment(-1)
        }, { merge: true }).catch(function(e) { console.warn('votes undo like error:', e); });
      });
    }

    _dislikedPids.add(basePid);
    _dislikeCounts[basePid] = (_dislikeCounts[basePid] || 0) + 1;
    _syncVoteUI(basePid);

    localStorage.setItem('pdx_disliked_pids', JSON.stringify(Array.from(_dislikedPids)));

    _fbAuthReady.then(function() {
      setDoc(db.collection('votes').doc(basePid), {
        dislikes: firebase.firestore.FieldValue.increment(1)
      }, { merge: true }).catch(function(e) {
        console.warn('votes write error:', e);
      });
    });

    _saveUserVoteToFirestore(basePid, 'dislike');

    fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: basePid, type: 'dislike' })
    }).catch(function(e) {
      console.warn('Netlify votes write error:', e);
    });
  }

  // ════════════════════════════════════════════════════════
  // ITEM ENGAGEMENT — shared, server-backed votes + comment threads
  // The living conversation attached to any individual item: an issue stance,
  // a promise, a Spotlight entry (evidence entries & reforms use the same id
  // scheme). Backed by /api/threads (Netlify Postgres) so every visitor sees
  // and adds to the SAME thread — this is what makes a contested local fight
  // (a data center, a water deal) actually feel alive and discussable, rather
  // than a private note to self.
  //
  // Each item is addressed by a stable target id "<type>:<politicianId>:<slug>".
  // Reads are public; posting a vote or comment requires a signed-in (non-
  // anonymous) Firebase user — the same accountable-identity model as the
  // Community Exchange. A small in-memory cache keeps the UI instant; the
  // server is the source of truth.
  // ════════════════════════════════════════════════════════
  var _PDX_THREAD_API = '/api/threads';
  var _PDX_MOD_EMAIL = 'cdeluxxe@gmail.com';

  // targetId -> { votes:{like,dislike}, viewerVote, commentCount }
  var _pdxItemSummary = {};
  // targetId -> [ comment, ... ] (loaded on demand when a thread is opened)
  var _pdxItemThreads = {};
  var _pdxViewerIsMod = false;

  function _pdxVoteSlug(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/['’"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'item';
  }
  // Build a stable target id from item type, politician id and a label.
  window._pdxVoteTargetId = function(type, pid, label) {
    return type + ':' + String(pid || 'p') + ':' + _pdxVoteSlug(label);
  };

  // ── auth + fetch plumbing ─────────────────────────────────────────────
  function _pdxSignedIn() {
    try { return !!(typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous); }
    catch (e) { return false; }
  }
  function _pdxThreadToken() {
    try {
      var u = (typeof auth !== 'undefined') && auth.currentUser;
      if (!u || u.isAnonymous) return Promise.resolve(null);
      return u.getIdToken().catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function _pdxRequireSignIn() {
    if (_pdxSignedIn()) return true;
    if (typeof window.openAuthModal === 'function') window.openAuthModal();
    return false;
  }
  function _pdxThreadApi(path, opts) {
    opts = opts || {};
    return _pdxThreadToken().then(function (token) {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(_PDX_THREAD_API + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      }).catch(function () { return { ok: false, status: 0, data: {} }; });
    });
  }

  // ── tiny render helpers ───────────────────────────────────────────────
  function _pdxAvatarColor(name) {
    var s = String(name || '?'), h = 0;
    for (var i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    return 'hsl(' + (Math.abs(h) % 360) + ', 45%, 38%)';
  }
  function _pdxTs(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    var t = Date.parse(v); return isNaN(t) ? 0 : t;
  }
  function _pdxRelTime(ts) {
    if (!ts) return '';
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24); if (d < 7) return d + 'd ago';
    try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }
  function _pdxCEsc(s) {
    return (typeof window._slEsc === 'function') ? window._slEsc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; });
  }
  function _pdxAttr(id) { return String(id).replace(/["\\]/g, '\\$&'); }
  function _pdxHostname(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); }
    catch (e) { return String(u || '').slice(0, 40); }
  }
  function _pdxItemCommentCountCached(targetId) {
    var s = _pdxItemSummary[targetId];
    if (s && typeof s.commentCount === 'number') return s.commentCount;
    var a = _pdxItemThreads[targetId];
    return a ? a.filter(function (c) { return c.status === 'active'; }).length : 0;
  }

  // ── vote row ──────────────────────────────────────────────────────────
  // Markup for one vote row. Safe to call at render time; counts fill in from
  // the shared cache (hydrated in the background) and update live on vote.
  window._pdxVoteControlHTML = function(targetId, ariaWhat) {
    var s = _pdxItemSummary[targetId];
    var vote = (s && s.viewerVote) || null;
    var likeN = (s && s.votes && s.votes.like) || 0;
    var disN = (s && s.votes && s.votes.dislike) || 0;
    var what = ariaWhat || 'this item';
    function btn(kind, ico, verb, cnt) {
      var active = vote === kind;
      return '<button type="button" class="pdx-vote-btn pdx-' + kind + (active ? ' is-active' : '') + '" ' +
        'aria-pressed="' + (active ? 'true' : 'false') + '" ' +
        'aria-label="' + verb + ' ' + what + '" ' +
        'onclick="event.stopPropagation();window._pdxToggleItemVote(this,\'' + targetId + '\',\'' + kind + '\')">' +
        '<span class="pdx-vote-ico" aria-hidden="true">' + ico + '</span>' +
        '<span class="pdx-vote-n" data-vn="' + kind + '">' + cnt + '</span>' +
      '</button>';
    }
    return '<div class="pdx-vote" data-vt="' + targetId + '">' +
      btn('like', '👍', 'Like', likeN) +
      btn('dislike', '👎', 'Dislike', disN) +
    '</div>';
  };

  function _pdxSyncVoteWraps(targetId) {
    var s = _pdxItemSummary[targetId]; if (!s) return;
    var wraps = document.querySelectorAll('.pdx-vote[data-vt="' + _pdxAttr(targetId) + '"]');
    for (var i = 0; i < wraps.length; i++) {
      (function (wrap) {
        ['like', 'dislike'].forEach(function (kind) {
          var b = wrap.querySelector('.pdx-vote-btn.pdx-' + kind);
          if (!b) return;
          var active = s.viewerVote === kind;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
          var n = b.querySelector('.pdx-vote-n');
          if (n) n.textContent = (s.votes && s.votes[kind]) || 0;
        });
        wrap.setAttribute('data-th', '1');
      })(wraps[i]);
    }
  }

  // Toggle the visitor's vote: re-tapping the active side clears it, tapping the
  // other switches sides. Optimistic UI, reconciled with the server response.
  window._pdxToggleItemVote = function(btn, targetId, kind) {
    if (!_pdxRequireSignIn()) return;
    var s = _pdxItemSummary[targetId] || (_pdxItemSummary[targetId] = { votes: { like: 0, dislike: 0 }, viewerVote: null, commentCount: 0 });
    if (!s.votes) s.votes = { like: 0, dislike: 0 };
    var prev = s.viewerVote;
    if (prev === 'like') s.votes.like = Math.max(0, (s.votes.like || 0) - 1);
    else if (prev === 'dislike') s.votes.dislike = Math.max(0, (s.votes.dislike || 0) - 1);
    if (prev === kind) s.viewerVote = null;
    else { s.votes[kind] = (s.votes[kind] || 0) + 1; s.viewerVote = kind; }
    _pdxSyncVoteWraps(targetId);
    _pdxThreadApi('/vote', { method: 'POST', body: { target: targetId, vote: kind } }).then(function (r) {
      if (r.status === 401) { _pdxRequireSignIn(); return; }
      if (r.ok && r.data && r.data.votes) {
        s.votes = r.data.votes; s.viewerVote = r.data.viewerVote;
        _pdxSyncVoteWraps(targetId);
      }
    });
  };

  // ── engagement row (votes + collapsible comment thread) ────────────────
  // opts.noVote renders comments only — used where the item already has its own
  // primary vote (e.g. a reform's "Support" tally) so we don't stack two.
  window._pdxSpotlightEngageHTML = function(targetId, what, opts) {
    opts = opts || {};
    var vote = (!opts.noVote && typeof window._pdxVoteControlHTML === 'function') ? window._pdxVoteControlHTML(targetId, what) : '';
    var n = _pdxItemCommentCountCached(targetId);
    var w = _pdxCEsc(what || 'this item');
    var t = _pdxCEsc(targetId);
    return '<div class="pdx-engage" data-ct="' + t + '" onclick="event.stopPropagation();">' +
      '<div class="pdx-engage-bar">' +
        vote +
        '<button type="button" class="pdx-cmt-toggle' + (n ? ' has-cmt' : '') + '" aria-expanded="false" ' +
          'aria-label="Comments on ' + w + '" onclick="window._pdxToggleCommentPanel(this)">' +
          '<span class="pdx-cmt-ico" aria-hidden="true">💬</span>' +
          '<span class="pdx-cmt-tlabel">Discuss</span>' +
          '<span class="pdx-cmt-n" data-cn>' + n + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="pdx-cmt-panel" hidden>' +
        '<div class="pdx-cmt-list" data-cl></div>' +
        '<div class="pdx-cmt-form" data-cf></div>' +
      '</div>' +
    '</div>';
  };

  // The composer, rebuilt for the current sign-in state so the thread reads as
  // public-but-accountable: everyone can read, signed-in members can post.
  function _pdxComposerInner(signedIn) {
    if (!signedIn) {
      return '<button type="button" class="pdx-cmt-signin" onclick="if(window.openAuthModal)window.openAuthModal();">🔒 Sign in to add your voice</button>' +
        '<div class="pdx-cmt-hint">Everyone can read the thread. Signing in (free) lets you post — real accounts keep the board civil and accountable.</div>';
    }
    return '<textarea class="pdx-cmt-text" rows="2" maxlength="2000" placeholder="Add a comment — civil, evidence-based, no personal attacks." aria-label="Add a comment"></textarea>' +
      '<div class="pdx-cmt-source-field" hidden><input type="url" class="pdx-cmt-source" maxlength="500" placeholder="https://a-source-that-backs-this-up.org" aria-label="Source link" /></div>' +
      '<div class="pdx-cmt-actions">' +
        '<label class="pdx-cmt-evtoggle"><input type="checkbox" class="pdx-cmt-isev" onchange="window._pdxToggleEvidenceField(this)" /> This adds new evidence / a strong claim</label>' +
        '<button type="button" class="pdx-cmt-post" onclick="window._pdxPostItemComment(this)">Post</button>' +
      '</div>' +
      '<div class="pdx-cmt-hint">Shared publicly with the community · be civil, no personal attacks · a new claim needs a source link.</div>';
  }
  function _pdxUpdateComposer(wrap) {
    var form = wrap.querySelector('.pdx-cmt-form');
    if (form) form.innerHTML = _pdxComposerInner(_pdxSignedIn());
  }
  window._pdxToggleEvidenceField = function(cb) {
    var form = cb.closest('.pdx-cmt-form'); if (!form) return;
    var field = form.querySelector('.pdx-cmt-source-field'); if (!field) return;
    if (cb.checked) { field.removeAttribute('hidden'); var i = field.querySelector('input'); if (i) i.focus(); }
    else field.setAttribute('hidden', '');
  };

  // Render one comment (top-level or reply) from a server record.
  function _pdxCommentNodeHTML(c) {
    var nm = (c.authorName && String(c.authorName).trim()) ? String(c.authorName).trim() : 'Community Member';
    var initial = nm.charAt(0).toUpperCase();
    var removed = c.status === 'removed';
    var src = '';
    if (c.sourceUrl && /^https?:\/\//i.test(c.sourceUrl)) {
      src = '<a class="pdx-cmt-src-link" href="' + _pdxCEsc(c.sourceUrl) + '" target="_blank" rel="noopener nofollow ugc" onclick="event.stopPropagation();" title="' + _pdxCEsc(c.sourceUrl) + '">🔗 ' + _pdxCEsc(_pdxHostname(c.sourceUrl)) + '</a>';
    }
    var up = c.up || 0, down = c.down || 0, vv = c.viewerVote || null;
    var foot = '';
    if (!removed) {
      foot = '<div class="pdx-cmt-foot">' +
        '<button type="button" class="pdx-cmt-vbtn pdx-up' + (vv === 'up' ? ' is-active' : '') + '" aria-pressed="' + (vv === 'up' ? 'true' : 'false') + '" aria-label="Upvote comment" onclick="window._pdxToggleCommentVote(this,' + c.id + ',\'up\')">▲ <span data-cvn="up">' + up + '</span></button>' +
        '<button type="button" class="pdx-cmt-vbtn pdx-down' + (vv === 'down' ? ' is-active' : '') + '" aria-pressed="' + (vv === 'down' ? 'true' : 'false') + '" aria-label="Downvote comment" onclick="window._pdxToggleCommentVote(this,' + c.id + ',\'down\')">▼ <span data-cvn="down">' + down + '</span></button>';
      if (c.parentId == null) foot += '<button type="button" class="pdx-cmt-act" onclick="window._pdxToggleReplyForm(this,' + c.id + ')">Reply</button>';
      foot += '<button type="button" class="pdx-cmt-act" onclick="window._pdxFlagItemComment(this,' + c.id + ')">Flag</button>';
      if (_pdxViewerIsMod) {
        foot += '<button type="button" class="pdx-cmt-act pdx-cmt-mod" onclick="window._pdxModerateItemComment(this,' + c.id + ',\'remove\')">Remove</button>' +
                '<button type="button" class="pdx-cmt-act" onclick="window._pdxAiReviewComment(this,' + c.id + ')">AI check</button>';
        if (c.flagCount) foot += '<span class="pdx-cmt-time">🚩 ' + c.flagCount + '</span>';
      }
      foot += '</div>';
    } else if (_pdxViewerIsMod) {
      foot = '<div class="pdx-cmt-foot"><button type="button" class="pdx-cmt-act" onclick="window._pdxModerateItemComment(this,' + c.id + ',\'restore\')">Restore</button></div>';
    }
    var content = removed ? 'Removed by a moderator.' : c.body;
    return '<div class="pdx-cmt-row' + (removed ? ' pdx-cmt-removed' : '') + '" data-cid="' + c.id + '">' +
      '<div class="pdx-cmt-avatar" style="background:' + _pdxAvatarColor(nm) + ';">' + _pdxCEsc(initial) + '</div>' +
      '<div class="pdx-cmt-bubble">' +
        '<div class="pdx-cmt-meta"><span class="pdx-cmt-author">' + _pdxCEsc(nm) + '</span>' +
          '<span class="pdx-cmt-time">' + _pdxCEsc(_pdxRelTime(_pdxTs(c.createdAt))) + '</span></div>' +
        '<div class="pdx-cmt-content">' + _pdxCEsc(content) + '</div>' +
        src + foot +
      '</div>' +
    '</div>';
  }

  function _pdxRenderItemComments(wrap, targetId) {
    var list = wrap.querySelector('.pdx-cmt-list');
    if (!list) return;
    var arr = _pdxItemThreads[targetId] || [];
    var visible = arr.filter(function (c) { return c.status === 'active' || (_pdxViewerIsMod && c.status === 'removed'); });
    if (!visible.length) {
      list.innerHTML = '<div class="pdx-cmt-empty">No comments yet — be the first to weigh in. Keep it civil and cite your sources.</div>';
      return;
    }
    var visIds = {}; visible.forEach(function (c) { visIds[c.id] = true; });
    var byParent = {};
    visible.forEach(function (c) {
      if (c.parentId != null && visIds[c.parentId]) (byParent[c.parentId] || (byParent[c.parentId] = [])).push(c);
    });
    var tops = visible.filter(function (c) { return c.parentId == null || !visIds[c.parentId]; });
    var activeCount = arr.filter(function (c) { return c.status === 'active'; }).length;
    var html = '<div class="pdx-cmt-count">' + activeCount + (activeCount === 1 ? ' comment' : ' comments') + '</div>';
    tops.forEach(function (c) {
      html += _pdxCommentNodeHTML(c);
      var kids = byParent[c.id] || [];
      if (kids.length) html += '<div class="pdx-cmt-children">' + kids.map(_pdxCommentNodeHTML).join('') + '</div>';
    });
    list.innerHTML = html;
  }

  // Load one thread's comments + tallies from the server into the cache.
  function _pdxLoadThread(targetId) {
    return _pdxThreadApi('/?target=' + encodeURIComponent(targetId)).then(function (r) {
      if (r.ok && r.data) {
        var d = r.data;
        _pdxItemThreads[targetId] = Array.isArray(d.comments) ? d.comments : [];
        _pdxItemSummary[targetId] = {
          votes: d.votes || { like: 0, dislike: 0 },
          viewerVote: d.viewerVote || null,
          commentCount: (typeof d.commentCount === 'number') ? d.commentCount
            : _pdxItemThreads[targetId].filter(function (c) { return c.status === 'active'; }).length
        };
        if (d.viewer) _pdxViewerIsMod = !!d.viewer.isModerator;
      }
      return _pdxItemThreads[targetId] || [];
    });
  }
  function _pdxReloadThread(wrap, targetId) {
    return _pdxLoadThread(targetId).then(function () {
      _pdxSyncCommentToggles(targetId);
      _pdxSyncVoteWraps(targetId);
    });
  }

  window._pdxToggleCommentPanel = function(btn) {
    var wrap = btn.closest('.pdx-engage');
    if (!wrap) return;
    var targetId = wrap.getAttribute('data-ct');
    var panel = wrap.querySelector('.pdx-cmt-panel');
    if (!panel) return;
    if (panel.hasAttribute('hidden')) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.add('pdx-cmt-open');
      _pdxUpdateComposer(wrap);
      var list = wrap.querySelector('.pdx-cmt-list');
      if (list && !_pdxItemThreads[targetId]) list.innerHTML = '<div class="pdx-cmt-empty">Loading…</div>';
      else if (list) _pdxRenderItemComments(wrap, targetId);
      _pdxLoadThread(targetId).then(function () {
        _pdxRenderItemComments(wrap, targetId);
        _pdxSyncVoteWraps(targetId);
        _pdxSyncCommentToggles(targetId);
      });
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('pdx-cmt-open');
    }
  };

  function _pdxSyncCommentToggles(targetId) {
    var n = _pdxItemCommentCountCached(targetId);
    var wraps = document.querySelectorAll('.pdx-engage[data-ct="' + _pdxAttr(targetId) + '"]');
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var nEl = wrap.querySelector('[data-cn]');
      if (nEl) nEl.textContent = n;
      var tgl = wrap.querySelector('.pdx-cmt-toggle');
      if (tgl) tgl.classList.toggle('has-cmt', n > 0);
      var panel = wrap.querySelector('.pdx-cmt-panel');
      if (panel && !panel.hasAttribute('hidden')) _pdxRenderItemComments(wrap, targetId);
      wrap.setAttribute('data-th', '1');
    }
  }

  function _pdxShowNote(container, msg, isError) {
    if (!container) return;
    var note = container.querySelector('.pdx-cmt-note');
    if (!note) { note = document.createElement('div'); container.appendChild(note); }
    note.className = 'pdx-cmt-note' + (isError ? ' is-error' : '');
    note.textContent = msg;
  }

  window._pdxPostItemComment = function(btn) {
    if (!_pdxRequireSignIn()) return;
    var wrap = btn.closest('.pdx-engage'); if (!wrap) return;
    var targetId = wrap.getAttribute('data-ct');
    var form = btn.closest('.pdx-cmt-form') || wrap;
    var textEl = form.querySelector('.pdx-cmt-text');
    var text = ((textEl && textEl.value) || '').trim();
    if (!text) { if (textEl) textEl.focus(); return; }
    var evEl = form.querySelector('.pdx-cmt-isev');
    var isEvidence = !!(evEl && evEl.checked);
    var srcEl = form.querySelector('.pdx-cmt-source');
    var sourceUrl = ((srcEl && srcEl.value) || '').trim();
    if (isEvidence && !sourceUrl) { _pdxShowNote(form, 'Add a source link to back up a new claim.', true); if (srcEl) srcEl.focus(); return; }
    btn.disabled = true;
    _pdxThreadApi('/comment', { method: 'POST', body: { target: targetId, body: text, sourceUrl: sourceUrl || undefined, isEvidence: isEvidence } }).then(function (r) {
      btn.disabled = false;
      if (r.status === 401) { _pdxRequireSignIn(); return; }
      if (!r.ok) { _pdxShowNote(form, (r.data && r.data.error) || 'Could not post your comment.', true); return; }
      // Personal Impact Tracker (opt-in): a comment you posted on an app item.
      try { if (window.PDXImpact) window.PDXImpact.record('discussed'); } catch (e) {}
      if (textEl) textEl.value = '';
      if (srcEl) srcEl.value = '';
      if (evEl) { evEl.checked = false; var sf = form.querySelector('.pdx-cmt-source-field'); if (sf) sf.setAttribute('hidden', ''); }
      _pdxReloadThread(wrap, targetId);
    });
  };

  window._pdxToggleReplyForm = function(btn, commentId) {
    if (!_pdxRequireSignIn()) return;
    var row = btn.closest('.pdx-cmt-row'); if (!row) return;
    var bubble = row.querySelector('.pdx-cmt-bubble'); if (!bubble) return;
    var existing = bubble.querySelector('.pdx-cmt-replyform');
    if (existing) { existing.parentNode.removeChild(existing); return; }
    var form = document.createElement('div');
    form.className = 'pdx-cmt-replyform';
    form.innerHTML = '<div class="pdx-cmt-inputrow"><textarea class="pdx-cmt-text" rows="2" maxlength="2000" placeholder="Write a reply…" aria-label="Write a reply"></textarea>' +
      '<button type="button" class="pdx-cmt-post" onclick="window._pdxPostReply(this,' + commentId + ')">Reply</button></div>';
    bubble.appendChild(form);
    var ta = form.querySelector('textarea'); if (ta) ta.focus();
  };
  window._pdxPostReply = function(btn, commentId) {
    var form = btn.closest('.pdx-cmt-replyform');
    var wrap = btn.closest('.pdx-engage');
    if (!form || !wrap) return;
    var targetId = wrap.getAttribute('data-ct');
    var ta = form.querySelector('textarea');
    var text = ((ta && ta.value) || '').trim();
    if (!text) { if (ta) ta.focus(); return; }
    btn.disabled = true;
    _pdxThreadApi('/comment', { method: 'POST', body: { target: targetId, body: text, parentId: commentId } }).then(function (r) {
      btn.disabled = false;
      if (r.status === 401) { _pdxRequireSignIn(); return; }
      if (!r.ok) { _pdxShowNote(form, (r.data && r.data.error) || 'Could not post your reply.', true); return; }
      // Personal Impact Tracker (opt-in): a reply you posted on an app item.
      try { if (window.PDXImpact) window.PDXImpact.record('discussed'); } catch (e) {}
      _pdxReloadThread(wrap, targetId);
    });
  };

  window._pdxToggleCommentVote = function(btn, commentId, kind) {
    if (!_pdxRequireSignIn()) return;
    _pdxThreadApi('/comment-vote', { method: 'POST', body: { commentId: commentId, vote: kind } }).then(function (r) {
      if (r.status === 401) { _pdxRequireSignIn(); return; }
      if (!r.ok || !r.data) return;
      var wrap = btn.closest('.pdx-engage');
      var targetId = wrap && wrap.getAttribute('data-ct');
      var arr = targetId && _pdxItemThreads[targetId];
      if (arr) { for (var i = 0; i < arr.length; i++) { if (arr[i].id === commentId) { arr[i].up = r.data.up; arr[i].down = r.data.down; arr[i].viewerVote = r.data.viewerVote; break; } } }
      var row = btn.closest('.pdx-cmt-row');
      if (row) {
        var up = row.querySelector('.pdx-cmt-vbtn.pdx-up'), dn = row.querySelector('.pdx-cmt-vbtn.pdx-down');
        if (up) { up.classList.toggle('is-active', r.data.viewerVote === 'up'); up.setAttribute('aria-pressed', r.data.viewerVote === 'up' ? 'true' : 'false'); var un = up.querySelector('[data-cvn="up"]'); if (un) un.textContent = r.data.up; }
        if (dn) { dn.classList.toggle('is-active', r.data.viewerVote === 'down'); dn.setAttribute('aria-pressed', r.data.viewerVote === 'down' ? 'true' : 'false'); var dnn = dn.querySelector('[data-cvn="down"]'); if (dnn) dnn.textContent = r.data.down; }
      }
    });
  };

  window._pdxFlagItemComment = function(btn, commentId) {
    if (!_pdxRequireSignIn()) return;
    var row = btn.closest('.pdx-cmt-row'); if (!row) return;
    var bubble = row.querySelector('.pdx-cmt-bubble'); if (!bubble) return;
    var ex = bubble.querySelector('.pdx-cmt-flagbox');
    if (ex) { ex.parentNode.removeChild(ex); return; }
    var box = document.createElement('div');
    box.className = 'pdx-cmt-flagbox pdx-cmt-note';
    var reasons = [['personal_attack', 'Personal attack'], ['misinformation', 'Misinformation'], ['spam', 'Spam'], ['off_topic', 'Off-topic'], ['other', 'Other']];
    box.innerHTML = 'Report this comment: ' + reasons.map(function (r) {
      return '<button type="button" class="pdx-cmt-act" onclick="window._pdxSubmitFlag(this,' + commentId + ',\'' + r[0] + '\')">' + r[1] + '</button>';
    }).join(' · ');
    bubble.appendChild(box);
  };
  window._pdxSubmitFlag = function(btn, commentId, reason) {
    var box = btn.closest('.pdx-cmt-flagbox');
    _pdxThreadApi('/flag', { method: 'POST', body: { commentId: commentId, reason: reason } }).then(function (r) {
      if (r.status === 401) { _pdxRequireSignIn(); return; }
      if (box) box.textContent = r.ok ? 'Thanks — a moderator will take a look.' : ((r.data && r.data.error) || 'Could not send that report.');
    });
  };

  window._pdxModerateItemComment = function(btn, commentId, action) {
    _pdxThreadApi('/moderate', { method: 'POST', body: { commentId: commentId, action: action } }).then(function (r) {
      if (!r.ok) return;
      var wrap = btn.closest('.pdx-engage');
      var targetId = wrap && wrap.getAttribute('data-ct');
      if (targetId) _pdxReloadThread(wrap, targetId);
    });
  };
  window._pdxAiReviewComment = function(btn, commentId) {
    var row = btn.closest('.pdx-cmt-row');
    var bubble = row && row.querySelector('.pdx-cmt-bubble');
    _pdxShowNote(bubble, 'Asking AI for a read…', false);
    _pdxThreadApi('/ai-review', { method: 'POST', body: { commentId: commentId } }).then(function (r) {
      if (!bubble) return;
      if (r.ok && r.data && r.data.ai) {
        var a = r.data.ai;
        _pdxShowNote(bubble, 'AI: ' + (a.recommendation || 'review') + ' — ' + (a.summary || ''), a.recommendation === 'remove');
      } else _pdxShowNote(bubble, (r.data && r.data.error) || 'AI review unavailable.', true);
    });
  };

  // ── background hydration ────────────────────────────────────────────────
  // Newly-rendered vote rows / engage rows are discovered and filled with real
  // shared counts in batches, so a card shows the community's pulse without each
  // render site having to know about the API.
  var _pdxScanTimer = null, _pdxFetching = {};
  function _pdxCollectTargets() {
    var seen = {}, res = [];
    document.querySelectorAll('.pdx-vote[data-vt]:not([data-th]), .pdx-engage[data-ct]:not([data-th])').forEach(function (el) {
      var id = el.getAttribute('data-vt') || el.getAttribute('data-ct');
      if (id && !seen[id]) { seen[id] = 1; res.push(id); }
      el.setAttribute('data-th', '1');
    });
    return res;
  }
  function _pdxHydrateTargets(ids) {
    if (!ids.length) return;
    var need = [];
    ids.forEach(function (id) {
      if (_pdxItemSummary[id]) { _pdxSyncVoteWraps(id); _pdxSyncCommentToggles(id); }
      else if (!_pdxFetching[id]) need.push(id);
    });
    for (var i = 0; i < need.length; i += 80) {
      (function (chunk) {
        chunk.forEach(function (id) { _pdxFetching[id] = 1; });
        _pdxThreadApi('/?targets=' + encodeURIComponent(chunk.join(','))).then(function (r) {
          chunk.forEach(function (id) { delete _pdxFetching[id]; });
          if (r.ok && r.data && r.data.targets) {
            if (r.data.viewer && r.data.viewer.isModerator) _pdxViewerIsMod = true;
            Object.keys(r.data.targets).forEach(function (id) {
              var t = r.data.targets[id];
              _pdxItemSummary[id] = { votes: t.votes || { like: 0, dislike: 0 }, viewerVote: t.viewerVote || null, commentCount: t.commentCount || 0 };
              _pdxSyncVoteWraps(id); _pdxSyncCommentToggles(id);
            });
          }
        });
      })(need.slice(i, i + 80));
    }
  }
  function _pdxScan() {
    var ids = _pdxCollectTargets();
    if (ids.length) _pdxHydrateTargets(ids);
  }
  // Public hook: callers may request an explicit (re)hydration.
  window.PDXThreads = {
    hydrate: function () { _pdxScan(); },
    refresh: function (targetId) {
      if (!targetId) return;
      delete _pdxItemSummary[targetId]; delete _pdxFetching[targetId];
      _pdxHydrateTargets([targetId]);
    }
  };

  try {
    var _pdxObs = new MutationObserver(function () {
      if (_pdxScanTimer) clearTimeout(_pdxScanTimer);
      _pdxScanTimer = setTimeout(_pdxScan, 500);
    });
    function _pdxStartObs() { try { _pdxObs.observe(document.body, { childList: true, subtree: true }); } catch (e) {} setTimeout(_pdxScan, 300); }
    if (document.body) _pdxStartObs();
    else document.addEventListener('DOMContentLoaded', _pdxStartObs);
  } catch (e) { /* observer unsupported — explicit PDXThreads.hydrate() still works */ }

  // When the visitor signs in or out, viewer-specific state (their own votes,
  // moderator tools, whether they can post) changes — drop the cache and let the
  // background scan re-hydrate, and refresh any open composer.
  try {
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
      auth.onAuthStateChanged(function () {
        _pdxViewerIsMod = false;
        _pdxItemSummary = {}; _pdxItemThreads = {};
        document.querySelectorAll('[data-th]').forEach(function (el) { el.removeAttribute('data-th'); });
        document.querySelectorAll('.pdx-engage .pdx-cmt-panel:not([hidden])').forEach(function (p) {
          var wrap = p.closest('.pdx-engage'); if (wrap) _pdxUpdateComposer(wrap);
        });
        if (_pdxScanTimer) clearTimeout(_pdxScanTimer);
        _pdxScanTimer = setTimeout(_pdxScan, 200);
      });
    }
  } catch (e) {}

  function _syncVoteUI(basePid) {
    var likes = Math.max(0, _likeCounts[basePid] || 0);
    var dislikes = Math.max(0, _dislikeCounts[basePid] || 0);
    var userLiked = _likedPids.has(basePid);
    var userDisliked = _dislikedPids.has(basePid);
    var prefixes = ['', 'modal-', 'catch-', 'dir-'];
    for (var i = 0; i < prefixes.length; i++) {
      var fullPid = prefixes[i] + basePid;
      var likeBtns = document.querySelectorAll('.like-btn[data-pid="' + fullPid + '"]');
      for (var j = 0; j < likeBtns.length; j++) {
        likeBtns[j].dataset.count = likes;
        var el = likeBtns[j].querySelector('.like-count');
        if (el) el.textContent = likes;
        if (userLiked) {
          likeBtns[j].classList.add('liked');
          if (!likeBtns[j].querySelector('.your-vote-badge')) {
            var badge = document.createElement('span');
            badge.className = 'your-vote-badge';
            badge.textContent = 'Your vote';
            likeBtns[j].appendChild(badge);
          }
        } else {
          likeBtns[j].classList.remove('liked');
          var existingBadge = likeBtns[j].querySelector('.your-vote-badge');
          if (existingBadge) existingBadge.remove();
        }
      }
      var disBtns = document.querySelectorAll('.dislike-btn[data-pid="' + fullPid + '"]');
      for (var k = 0; k < disBtns.length; k++) {
        disBtns[k].dataset.count = dislikes;
        var el2 = disBtns[k].querySelector('.dislike-count');
        if (el2) el2.textContent = dislikes;
        if (userDisliked) {
          disBtns[k].classList.add('disliked');
          if (!disBtns[k].querySelector('.your-vote-badge')) {
            var badge2 = document.createElement('span');
            badge2.className = 'your-vote-badge';
            badge2.textContent = 'Your vote';
            disBtns[k].appendChild(badge2);
          }
        } else {
          disBtns[k].classList.remove('disliked');
          var existingBadge2 = disBtns[k].querySelector('.your-vote-badge');
          if (existingBadge2) existingBadge2.remove();
        }
      }
    }

    // Keep the compact listing-card vote chips (👍 N 👎 M) in lock-step with the
    // like / dislike buttons. Cards key the chip by the bare pid, so this lives
    // outside the prefix loop above.
    document.querySelectorAll('[data-vote-pid="' + basePid + '"]').forEach(function(chip) {
      var u = chip.querySelector('.vote-up-count');
      var dd = chip.querySelector('.vote-dn-count');
      if (u) u.textContent = likes;
      if (dd) dd.textContent = dislikes;
    });
  }

  function _refreshAllVoteUI() {
    var allPids = {};
    var pid;
    for (pid in _likeCounts) { if (_likeCounts.hasOwnProperty(pid)) allPids[pid] = true; }
    for (pid in _dislikeCounts) { if (_dislikeCounts.hasOwnProperty(pid)) allPids[pid] = true; }
    for (pid in allPids) { _syncVoteUI(pid); }
  }

  function _injectDislikeButtons() {
    document.querySelectorAll('.like-btn').forEach(function(likeBtn) {
      if (likeBtn.nextElementSibling && likeBtn.nextElementSibling.classList.contains('dislike-btn')) return;
      var pid = likeBtn.dataset.pid;
      if (!pid) return;
      var basePid = pid.replace(/^(modal-|catch-|dir-)/, '');
      var disBtn = document.createElement('button');
      disBtn.className = 'dislike-btn flex items-center gap-1.5 border border-steel-400/20 hover:border-red-400/50 active:scale-95 text-steel-400 hover:text-red-400 font-condensed font-700 text-xs tracking-widest uppercase px-3 py-2 rounded-lg transition-all';
      disBtn.setAttribute('data-count', _dislikeCounts[basePid] || 0);
      disBtn.setAttribute('data-pid', pid);
      disBtn.setAttribute('onclick', "handleDislike(this,'" + pid + "')");
      disBtn.innerHTML = '👎 <span class="dislike-count">' + (_dislikeCounts[basePid] || 0) + '</span>';
      if (_dislikedPids.has(basePid)) disBtn.classList.add('disliked');
      likeBtn.parentNode.insertBefore(disBtn, likeBtn.nextSibling);
    });
  }

  function _initCommentButtons() {
    document.querySelectorAll('button[onclick*="openCommentModal"]').forEach(function(btn) {
      var match = btn.getAttribute('onclick').match(/openCommentModal\(['"]([^'"]+)['"]\)/);
      if (match && !btn.querySelector('.comment-count')) {
        btn.setAttribute('data-comment-pid', match[1]);
        var span = document.createElement('span');
        span.className = 'comment-count ml-1 text-[11px] font-bold opacity-75';
        span.textContent = '0';
        btn.appendChild(span);
        if (_commentedPids.has(match[1])) {
          btn.classList.add('commented');
        }
      }
    });
  }

  function _syncCommentCountToUI(pid, count) {
    document.querySelectorAll('[data-comment-pid="' + pid + '"] .comment-count').forEach(function(el) {
      el.textContent = count;
    });
    _commentCounts[pid] = count;
  }

  // Small "💬 N" chip rendered on every listing card so a visitor can see how
  // much discussion a politician has drawn (social proof) and jump straight into
  // the comment thread. It carries the standard data-comment-pid + .comment-count
  // hooks so the existing live-sync (_syncCommentCountToUI) keeps it up to date.
  window._pdxCommentChip = function(pid) {
    var n = (typeof _commentCounts !== 'undefined' && _commentCounts[pid]) ? _commentCounts[pid] : 0;
    return '<button class="pdx-snap-comments" data-comment-pid="' + pid + '" ' +
      'onclick="event.stopPropagation();openCommentModal(\'' + pid + '\')" ' +
      'title="Read & add comments">💬 <span class="comment-count">' + n + '</span></button>';
  };

  // Re-sync every visible card chip from the cached counts — called when the
  // profile / comment modal closes so freshly-added comments show on the cards.
  window._pdxRefreshCommentChips = function() {
    if (typeof _commentCounts === 'undefined') return;
    Object.keys(_commentCounts).forEach(function(pid) {
      document.querySelectorAll('[data-comment-pid="' + pid + '"] .comment-count').forEach(function(el) {
        el.textContent = _commentCounts[pid];
      });
    });
  };

  // Small "👍 N 👎 M" chip rendered on every listing card so a visitor can see
  // the community's like / dislike pulse on a politician at a glance (social
  // proof) and tap straight into the profile to cast their own vote. It carries
  // a data-vote-pid hook so the live vote sync (_syncVoteUI, fed by the realtime
  // Firestore votes listener) and _pdxRefreshVoteChips keep it current — counts
  // update the instant a vote lands and again when a profile modal closes.
  window._pdxVoteChip = function(pid) {
    var up = (typeof _likeCounts !== 'undefined' && _likeCounts[pid]) ? Math.max(0, _likeCounts[pid]) : 0;
    var dn = (typeof _dislikeCounts !== 'undefined' && _dislikeCounts[pid]) ? Math.max(0, _dislikeCounts[pid]) : 0;
    return '<button class="pdx-snap-votes" data-vote-pid="' + pid + '" ' +
      'onclick="event.stopPropagation();showProfile(\'' + pid + '\')" ' +
      'title="See &amp; cast votes">' +
      '<span class="vote-up">👍 <span class="vote-up-count">' + up + '</span></span>' +
      '<span class="vote-dn">👎 <span class="vote-dn-count">' + dn + '</span></span>' +
      '</button>';
  };

  // Re-sync every visible vote chip from the cached counts — called alongside the
  // comment-chip refresh when a profile / comment modal closes so any vote cast
  // inside the modal is reflected on the listing cards.
  window._pdxRefreshVoteChips = function() {
    if (typeof _likeCounts === 'undefined') return;
    document.querySelectorAll('[data-vote-pid]').forEach(function(chip) {
      var pid = chip.getAttribute('data-vote-pid');
      var u = chip.querySelector('.vote-up-count');
      var dd = chip.querySelector('.vote-dn-count');
      if (u) u.textContent = Math.max(0, _likeCounts[pid] || 0);
      if (dd) dd.textContent = Math.max(0, _dislikeCounts[pid] || 0);
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  // PROMISE RECEIPTS EXPLAINER POPOVER
  //
  // This used to explain a score. It explained "Promise % = Kept ÷ (Kept +
  // Broken)", worked the division out with the tapped official's own numbers,
  // and reconciled the raw ratio against the weighted published figure. That
  // percentage has been RETIRED — PolitiDex publishes one integrity read
  // (⚖️ Word vs Action), and a second rated track competing with it was the
  // confusion the retirement removes.
  //
  // So this popover now explains the RECEIPTS: what makes a promise kept or
  // broken, what happens to pending ones, where each verdict is sourced, and
  // where those verdicts go (into the one read, as its heaviest tier). It still
  // names the tapped official's own counts, because counts are facts about a
  // list you can go and read. It computes no rate, for anyone, ever.
  // ════════════════════════════════════════════════════════════════════════
  window._pdxClosePromiseInfo = function() {
    var ov = document.getElementById('pdx-pinfo-overlay');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(function() {
      // Only release the page scroll lock if no other modal is still open.
      var stillModal = false;
      ['modal-overlay', 'comment-overlay'].forEach(function(idd) {
        var el = document.getElementById(idd);
        if (el && getComputedStyle(el).display !== 'none') stillModal = true;
      });
      if (!stillModal) document.body.style.overflow = '';
    }, 200);
  };

  window._pdxPromiseInfo = function(ev, pid) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    var ov = document.getElementById('pdx-pinfo-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'pdx-pinfo-overlay';
      ov.className = 'pdx-pinfo-overlay';
      ov.addEventListener('click', function(e) { if (e.target === ov) window._pdxClosePromiseInfo(); });
      document.body.appendChild(ov);
    }

    // When we know which politician was tapped, show their own counts so the
    // explanation is concrete rather than abstract.
    //
    // COUNTS ONLY, FOR EVERY RECORD. This used to branch: a counts-only record got
    // its counts, and an itemized one got the division worked out longhand ("27 ÷
    // (27 + 8) = 77% raw") plus the weighted published figure underneath. Both of
    // those printed the retired score in the one place a reader came looking for a
    // number, which is the worst possible place for it to survive. There is now a
    // single path, and it ends at the counts.
    var calcLine = '';
    try {
      var p = (pid && typeof PROFILES !== 'undefined') ? PROFILES[pid] : null;
      var itemized = (typeof window._pdxHasItemizedPledges !== 'function') || !p || window._pdxHasItemizedPledges(p);
      if (p && typeof p.kept === 'number' && typeof p.broken === 'number' && (p.kept + p.broken) > 0) {
        calcLine = '<div class="pdx-pinfo-calc">' +
          (p.name ? String(p.name).split(' ').slice(-1)[0] : 'This official') + ': ' +
          '<span style="color:#4ade80;font-weight:700;">' + (p.kept || 0) + ' kept</span> · ' +
          '<span style="color:#f87171;font-weight:700;">' + (p.broken || 0) + ' broken</span>' +
          ((typeof p.pending === 'number' && p.pending > 0) ? '<span style="color:#8aa3c4;font-weight:600;"> · ' + p.pending + ' pending (held against no one)</span>' : '') +
          '<div style="margin-top:0.35rem;color:#9fb4d4;font-weight:600;">' +
            (itemized
              ? 'Each of those pledges is listed on the profile with its own verdict and source, so you can read the record rather than a number derived from it.'
              : 'Those counts are on file, but the individual pledges behind them are not itemized yet.') +
          '</div>' +
          '</div>';
      }
    } catch (e) {}

    ov.innerHTML =
      '<div class="pdx-pinfo-card" role="dialog" aria-modal="true" aria-label="How the pledge ledger works">' +
        '<div class="pdx-pinfo-head">' +
          '<div class="pdx-pinfo-title">🤝 How the <span>pledge ledger</span> works</div>' +
          '<button class="pdx-pinfo-close" onclick="window._pdxClosePromiseInfo()" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="pdx-pinfo-formula">' +
          '<div class="pdx-pinfo-formula-eq"><span class="k">Kept</span> · <span class="b">Broken</span> · Pending — counted, never averaged</div>' +
          '<p style="font-size:0.76rem;color:#9fb4d4;line-height:1.55;margin:0;">Every promise is judged on its own and listed with its receipt. ' +
            '<strong style="color:#f5c842;">Pending</strong> promises are shown separately and count for or against no one until they play out. ' +
            '<strong style="color:#cbd9ec;">No follow-through percentage is published</strong> — not here, not on any profile.</p>' +
          calcLine +
        '</div>' +
        '<div class="pdx-pinfo-row">' +
          '<span class="pdx-pinfo-row-ico">📜</span>' +
          '<p>Every promise is drawn from <strong>official public records</strong> — le.utah.gov bills &amp; votes, campaign statements, and reported news — with sources linked on each profile.</p>' +
        '</div>' +
        '<div class="pdx-pinfo-row">' +
          '<span class="pdx-pinfo-row-ico">⚖️</span>' +
          '<p>Kept and broken pledges feed the one read PolitiDex publishes — <strong>Word vs Action</strong>, "does what they say match what they do?" — where explicit pledges are the heaviest kind of word. There is no separate promise grade to compare it against.</p>' +
        '</div>' +
        '<p class="pdx-pinfo-note">Verdicts update after each legislative session as pending promises resolve. Judgements built from public records — not official government findings.</p>' +
      '</div>';

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function() { ov.classList.add('open'); });
  };

  // Plain-language explainer for the ONE read: does what they say match what they
  // do? Opened from the "What's the difference?" link on the dual-signal scorecard.
  // Reuses the same pinfo overlay/close machinery as the receipts explainer.
  //
  // IT USED TO BE A SCORE COMPARISON. Two columns, two colour-coded percentages —
  // 🤝 Promise Follow-Through on the left, ⚖️ Say-vs-Do on the right — with the
  // official's two live figures printed above them. That framing is exactly what
  // the retirement removes: a reader was being asked to hold two ratings of the
  // same person in their head and work out which one to believe. The columns now
  // explain the two SIDES of a single read — what counts as their word, and what
  // counts as their action — and the live line names counts instead of rates.
  window._pdxScoreCompareInfo = function(ev, pid) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    var ov = document.getElementById('pdx-pinfo-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'pdx-pinfo-overlay';
      ov.className = 'pdx-pinfo-overlay';
      ov.addEventListener('click', function(e) { if (e.target === ov) window._pdxClosePromiseInfo(); });
      document.body.appendChild(ov);
    }

    // Concrete current readings for this official, when we can resolve them. The
    // pledge side contributes COUNTS; the only percentage that may appear here is
    // the one primary read, and only when its own floors let it publish.
    var liveLine = '';
    try {
      var d = (pid && typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      var svd = (pid && typeof window._calcConsistencyScore === 'function') ? window._calcConsistencyScore(pid) : null;
      var kc = (d && typeof d.kept === 'number') ? d.kept : 0;
      var bc = (d && typeof d.broken === 'number') ? d.broken : 0;
      var pTxt = (kc + bc) > 0
        ? '<b style="color:#f5c842;">' + kc + ' kept · ' + bc + ' broken</b>'
        : '<span style="color:#8aa3c4;">no pledges on file yet</span>';
      var aTxt = (svd && typeof svd.score === 'number')
        ? '<b style="color:#6ee7a0;">' + svd.score + '%</b>'
        : '<span style="color:#8aa3c4;">' + (svd && svd.pending ? 'checking record' : (svd && svd.stated > 0 ? 'limited record' : 'set your stances')) + '</span>';
      if (d) {
        var nm = (d.name ? String(d.name).split(' ').slice(-1)[0] : 'This official');
        liveLine = '<div class="pdx-pinfo-calc">' + nm + ' today: 🤝 Pledges ' + pTxt + ' · ⚖️ Say-vs-Do ' + aTxt + '</div>';
      }
    } catch (e) {}

    ov.innerHTML =
      '<div class="pdx-pinfo-card" role="dialog" aria-modal="true" aria-label="How the say-vs-do read works">' +
        '<div class="pdx-pinfo-head">' +
          '<div class="pdx-pinfo-title">⚖️ Do they <span>keep their word?</span></div>' +
          '<button class="pdx-pinfo-close" onclick="window._pdxClosePromiseInfo()" aria-label="Close">✕</button>' +
        '</div>' +
        '<p style="font-size:0.78rem;color:#9fb4d4;line-height:1.55;margin:0 0 0.9rem;">One read, built from two halves: everything they have said on the record, tested against everything they have actually done. There is no second score to weigh it against.</p>' +
        liveLine +
        '<div class="pdx-pinfo-cmp">' +
          '<div class="pdx-pinfo-cmp-col" style="border-color:rgba(245,200,66,0.3);">' +
            '<div class="pdx-pinfo-cmp-h" style="color:#f5c842;">🤝 What counts as their word</div>' +
            '<div class="pdx-pinfo-cmp-sub">Pledges · positions · signature issues</div>' +
            '<p>Explicit <strong>promises</strong> are the heaviest — each one listed with a kept, broken or pending verdict and its source. Sourced positions and the issues they campaign on count too, more lightly. <em>Counted, never averaged into a grade of their own.</em></p>' +
          '</div>' +
          '<div class="pdx-pinfo-cmp-col" style="border-color:rgba(110,231,160,0.32);">' +
            '<div class="pdx-pinfo-cmp-h" style="color:#6ee7a0;">⚖️ What counts as their action</div>' +
            '<div class="pdx-pinfo-cmp-sub">Roll-call votes and formal acts</div>' +
            '<p>Whether their <strong>actual record backs up what they claimed</strong> — agreement-neutral, judged issue by issue. This is the test the word above is put through.</p>' +
          '</div>' +
        '</div>' +
        '<div class="pdx-pinfo-row">' +
          '<span class="pdx-pinfo-row-ico">🎯</span>' +
          '<p>Separately, <strong>Your&nbsp;Match&nbsp;%</strong> is purely how well their stated positions fit <em>your</em> issues — a personal fit, not a judgement of their integrity.</p>' +
        '</div>' +
        '<p class="pdx-pinfo-note">Where the public record is too thin to judge fairly, the read shows <strong>Limited record</strong> and stays neutral — it is never guessed, and no narrower percentage is substituted for it.</p>' +
      '</div>';

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function() { ov.classList.add('open'); });
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('pdx-pinfo-overlay');
      if (ov && ov.classList.contains('open')) { e.stopPropagation(); window._pdxClosePromiseInfo(); }
    }
  }, true);

  function _loadCommentCounts() {
    _initCommentButtons();
    // Count all local comments by pid
    var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
    var counts = {};
    localList.forEach(function(c) {
      counts[c.pid] = (counts[c.pid] || 0) + 1;
    });
    Object.keys(counts).forEach(function(pid) {
      _syncCommentCountToUI(pid, counts[pid]);
    });

    // Also load comments from Firestore to update counts on load
    _commentsCollection.get().then(function(snapshot) {
      var counts = {};
      var list = [];
      snapshot.forEach(function(doc) {
        var d = doc.data();
        if (d.pid) counts[d.pid] = (counts[d.pid] || 0) + 1;
        d.id = doc.id;
        list.push(d);
      });
      // Update local storage comments list to include any missing firestore comments
      var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
      var localMap = {};
      localList.forEach(function(lc) { localMap[lc.id] = lc; });
      list.forEach(function(fc) {
        if (!localMap[fc.id]) {
          localList.push(fc);
        } else {
          // Sync likes/dislikes
          localMap[fc.id].likes = fc.likes || 0;
          localMap[fc.id].dislikes = fc.dislikes || 0;
        }
      });
      localStorage.setItem('pdx_local_comments_v3', JSON.stringify(localList));

      Object.keys(counts).forEach(function(pid) {
        _syncCommentCountToUI(pid, counts[pid]);
      });
    }).catch(function(e) {
      console.warn("Firestore pre-load comment counts failed:", e);
    });
  }

  function _startVotesListener() {
    if (_votesListenerActive) return;
    _votesListenerActive = true;

    _fbAuthReady.then(function() {
      db.collection('votes').onSnapshot(function(snapshot) {
        // Only react to documents that actually changed. The first snapshot
        // reports every doc as "added" (so the initial load still fills in all
        // counts), but later snapshots previously re-ran _syncVoteUI for the
        // entire collection on every single vote anywhere — a full DOM re-sync
        // of every politician's chips per write. docChanges() narrows that to
        // just the rows that moved.
        snapshot.docChanges().forEach(function(change) {
          var doc = change.doc;
          var pid = doc.id;
          var data = doc.data();
          _likeCounts[pid] = (typeof data.likes === 'number') ? Math.max(0, data.likes) : 0;
          _dislikeCounts[pid] = (typeof data.dislikes === 'number') ? Math.max(0, data.dislikes) : 0;
          _syncVoteUI(pid);
        });
        _votesDataLoaded = true;
      }, function(err) {
        console.warn('votes collection onSnapshot error, trying document-level listeners:', err);
        var pids = Object.keys(PROFILES);
        pids.forEach(function(pid) {
          db.collection('votes').doc(pid).onSnapshot(function(doc) {
            if (doc.exists) {
              var data = doc.data();
              _likeCounts[pid] = (typeof data.likes === 'number') ? Math.max(0, data.likes) : 0;
              _dislikeCounts[pid] = (typeof data.dislikes === 'number') ? Math.max(0, data.dislikes) : 0;
            } else {
              _likeCounts[pid] = 0;
              _dislikeCounts[pid] = 0;
            }
            _votesDataLoaded = true;
            _syncVoteUI(pid);
          }, function(e) {
            console.warn('votes doc onSnapshot error for ' + pid + ', trying Netlify API:', e);
            fetch('/api/votes')
              .then(res => res.json())
              .then(data => {
                data.forEach(function(row) {
                  var rPid = row.politician_id;
                  _likeCounts[rPid] = typeof row.likes === 'number' ? Math.max(0, row.likes) : 0;
                  _dislikeCounts[rPid] = typeof row.dislikes === 'number' ? Math.max(0, row.dislikes) : 0;
                  _syncVoteUI(rPid);
                });
                _votesDataLoaded = true;
              }).catch(fErr => {
                console.error("Netlify fallback votes load error:", fErr);
              });
          });
        });
      });
    });
  }

  function initDirLikes() {
    document.querySelectorAll('.like-btn').forEach(function(btn) {
      var el = btn.querySelector('.like-count');
      var pid = btn.dataset.pid;
      var base = pid ? pid.replace(/^(modal-|catch-|dir-)/, '') : '';
      if (el) el.textContent = _likeCounts[base] || 0;
      if (base && _likedPids.has(base)) btn.classList.add('liked');
    });

    _injectDislikeButtons();

    document.querySelectorAll('.dislike-btn').forEach(function(btn) {
      var pid = btn.dataset.pid;
      var base = pid ? pid.replace(/^(modal-|catch-|dir-)/, '') : '';
      if (btn.querySelector('.dislike-count')) btn.querySelector('.dislike-count').textContent = _dislikeCounts[base] || 0;
      if (base && _dislikedPids.has(base)) btn.classList.add('disliked');
    });

    _startVotesListener();
    _loadCommentCounts();

    if (_votesDataLoaded) {
      _refreshAllVoteUI();
    }
  }

  _startVotesListener();
  _fbAuthReady.then(function() {
    setTimeout(_refreshAllVoteUI, 300);
    setTimeout(_refreshAllVoteUI, 1000);
    setTimeout(_refreshAllVoteUI, 3000);
  });

  // ════════════════════════════════════════════════════════
  // COMMENT SYSTEM — Real-time Firestore + Local Storage Sync
  // Public, instant, threaded with likes/dislikes/replies
  // ════════════════════════════════════════════════════════
  var _commentsCollection = db.collection('comments_v2');
  var _currentCommentPolitician = '';
  var _replyToCommentId = null;
  var _commentUserIdentifier = localStorage.getItem('pdx_comment_uid') || ('anon_' + Math.random().toString(36).slice(2, 10));
  localStorage.setItem('pdx_comment_uid', _commentUserIdentifier);
  var _myCommentVotes = JSON.parse(localStorage.getItem('pdx_comment_votes') || '{}');
  var _firestoreComments = [];
  var _commentsUnsubscribe = null;
  var _commentCounts = {};
  var _commentedPids = new Set(JSON.parse(localStorage.getItem('pdx_commented_pids') || '[]'));

  function _getUserIdentifier() {
    var user = typeof auth !== 'undefined' ? auth.currentUser : null;
    if (user && !user.isAnonymous) return 'fb_' + user.uid;
    return _commentUserIdentifier;
  }

  function _updateUserAvatar() {
    var nameVal = document.getElementById('cf-name').value.trim();
    var avatarEl = document.getElementById('cf-user-avatar');
    if (!avatarEl) return;
    if (nameVal) {
      avatarEl.textContent = nameVal[0].toUpperCase();
      avatarEl.style.background = _nameColor(nameVal);
    } else {
      avatarEl.textContent = '?';
      avatarEl.style.background = 'hsl(210,50%,35%)';
    }
  }

  function openCommentModal(politicianId) {
    _currentCommentPolitician = politicianId;
    var label = politicianId;
    if (typeof PROFILES !== 'undefined' && PROFILES[politicianId]) {
      var p = PROFILES[politicianId];
      label = p.name + ' · ' + (p.office || '').replace(/^[^\w]*/, '') + ', ' + p.state;
    }
    document.getElementById('comment-politician-label').textContent = label;
    _showCommentModal();
  }

  function openCommentModalFromProfile() {
    var label = document.getElementById('modal-office-small').textContent;
    var name  = document.getElementById('modal-name-small').textContent;
    document.getElementById('comment-politician-label').textContent = name + (label ? ' · ' + label : '');
    var foundPid = '';
    if (typeof PROFILES !== 'undefined') {
      var keys = Object.keys(PROFILES);
      for (var i = 0; i < keys.length; i++) {
        if (PROFILES[keys[i]].name === name) { foundPid = keys[i]; break; }
      }
    }
    _currentCommentPolitician = foundPid || name;
    _showCommentModal();
  }

  function _showCommentModal() {
    var nameInput = document.getElementById('cf-name');
    nameInput.value = localStorage.getItem('pdx_comment_name') || '';
    document.getElementById('cf-comment').value = '';
    cancelReply();

    var user = typeof auth !== 'undefined' ? auth.currentUser : null;
    if (user && !user.isAnonymous && user.displayName && !nameInput.value) {
      nameInput.value = user.displayName;
    }
    _updateUserAvatar();

    document.getElementById('cf-error').classList.add('hidden');
    document.getElementById('cf-btn-label').textContent = 'Comment';
    document.getElementById('cf-submit-btn').disabled = false;
    document.getElementById('cf-submit-btn').style.opacity = '1';
    document.getElementById('cf-comment-count').textContent = '0 comments';

    var overlay = document.getElementById('comment-overlay');
    overlay.classList.add('cm-hidden');
    overlay.classList.remove('cm-visible');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function() { requestAnimationFrame(function() {
      overlay.style.transition = 'opacity 0.22s ease';
      overlay.style.opacity = '1';
      overlay.classList.remove('cm-hidden');
      overlay.classList.add('cm-visible');
    }); });

    _firestoreComments = [];
    _loadCommentsAndRender();
    _startCommentsRealtimeListener();
  }

  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'cf-name') _updateUserAvatar();
  });

  function _startCommentsRealtimeListener() {
    if (_commentsUnsubscribe) {
      _commentsUnsubscribe();
      _commentsUnsubscribe = null;
    }

    try {
      _commentsUnsubscribe = _commentsCollection
        .where('pid', '==', _currentCommentPolitician)
        .onSnapshot(function(snapshot) {
          var list = [];
          snapshot.forEach(function(doc) {
            var data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          _firestoreComments = list;
          _loadCommentsAndRender();
        }, function(err) {
          console.warn("Firestore comments subscription failed:", err);
          _loadCommentsAndRender();
        });
    } catch (e) {
      console.warn("Firestore comments subscription error:", e);
      _loadCommentsAndRender();
    }
  }

  function _loadCommentsAndRender() {
    var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
    var localFiltered = localList.filter(function(c) { return c.pid === _currentCommentPolitician; });

    // Merge Firestore comments and local comments by ID to avoid duplicates
    var mergedMap = {};
    _firestoreComments.forEach(function(c) {
      mergedMap[c.id] = c;
    });
    localFiltered.forEach(function(c) {
      if (!mergedMap[c.id]) {
        mergedMap[c.id] = c;
      } else {
        mergedMap[c.id].likes = typeof c.likes === 'number' ? c.likes : (mergedMap[c.id].likes || 0);
        mergedMap[c.id].dislikes = typeof c.dislikes === 'number' ? c.dislikes : (mergedMap[c.id].dislikes || 0);
      }
    });

    var mergedList = Object.values(mergedMap);
    _processAndRenderCommentsList(mergedList);
  }

  function _processAndRenderCommentsList(comments) {
    var container = document.getElementById('cf-comments-entries');
    var loadingEl = document.getElementById('cf-comments-loading');
    var noCommentsEl = document.getElementById('cf-no-comments');

    if (loadingEl) loadingEl.style.display = 'none';

    if (!comments || comments.length === 0) {
      container.innerHTML = '';
      if (noCommentsEl) noCommentsEl.style.display = 'block';
      document.getElementById('cf-comment-count').textContent = '0 comments';
      return;
    }
    if (noCommentsEl) noCommentsEl.style.display = 'none';

    // Build comments tree
    var rootComments = [];
    var repliesByParent = {};

    comments.forEach(function(c) {
      if (c.parent_id) {
        if (!repliesByParent[c.parent_id]) {
          repliesByParent[c.parent_id] = [];
        }
        repliesByParent[c.parent_id].push(c);
      } else {
        rootComments.push(c);
      }
    });

    // Sort root comments by created_at (newest first)
    rootComments.sort(function(a, b) {
      return (b.created_at || 0) - (a.created_at || 0);
    });

    // Sort replies under each root comment by created_at (oldest first)
    Object.keys(repliesByParent).forEach(function(pId) {
      repliesByParent[pId].sort(function(a, b) {
        return (a.created_at || 0) - (b.created_at || 0);
      });
    });

    var displayCount = comments.length;
    document.getElementById('cf-comment-count').textContent = displayCount + (displayCount === 1 ? ' comment' : ' comments');

    // Render comments
    container.innerHTML = '';
    rootComments.forEach(function(rc) {
      var rootEl = _buildCommentNode(rc, false);
      container.appendChild(rootEl);

      // Render replies if any
      var replies = repliesByParent[rc.id] || [];
      if (replies.length > 0) {
        var repliesContainer = document.createElement('div');
        repliesContainer.className = 'ml-8 sm:ml-12 mt-2 pl-4 border-l-2 border-white/5 space-y-2.5';
        replies.forEach(function(rep) {
          var repEl = _buildCommentNode(rep, true, rc.id);
          repliesContainer.appendChild(repEl);
        });
        container.appendChild(repliesContainer);
      }
    });
  }

  function _buildCommentNode(c, isReply, rootId) {
    var entry = document.createElement('div');
    entry.className = 'cm-comment-entry py-2.5 px-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-150';
    entry.setAttribute('data-comment-id', c.id);

    var ts = c.created_at ? _timeAgo(new Date(c.created_at)) : 'just now';

    var flexContainer = document.createElement('div');
    flexContainer.className = 'flex gap-3';

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow-sm shadow-black/20';
    avatar.style.background = _nameColor(c.name || 'Anonymous');
    avatar.textContent = (c.name || 'A')[0].toUpperCase();
    flexContainer.appendChild(avatar);

    // Content column
    var content = document.createElement('div');
    content.className = 'flex-1 min-w-0';

    // Header (Name + Time)
    var header = document.createElement('div');
    header.className = 'flex items-center gap-2 mb-1';
    var nameSpan = document.createElement('span');
    nameSpan.className = 'font-condensed text-[13px] font-700 text-white tracking-wide';
    nameSpan.textContent = c.name || 'Anonymous';
    header.appendChild(nameSpan);

    var tsSpan = document.createElement('span');
    tsSpan.className = 'text-steel-500 text-[10px] font-condensed tracking-wider';
    tsSpan.textContent = ts;
    header.appendChild(tsSpan);
    content.appendChild(header);

    // Comment Text
    var textP = document.createElement('p');
    textP.className = 'text-sm text-steel-200 leading-relaxed font-body mb-2 break-words';
    textP.textContent = c.text || c.comment || '';
    content.appendChild(textP);

    // Actions row (Likes, Dislikes, Reply)
    var actions = document.createElement('div');
    actions.className = 'flex items-center gap-3 mt-1.5';

    // Like button
    var likeBtn = document.createElement('button');
    likeBtn.className = 'flex items-center gap-1 text-steel-400 hover:text-green-400 active:scale-90 transition-all text-xs font-condensed font-600';
    var hasLiked = _myCommentVotes[c.id] === 'like';
    if (hasLiked) {
      likeBtn.classList.add('text-green-400');
      likeBtn.innerHTML = '<svg class="w-4 h-4 fill-green-400/20 text-green-400" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15v7"/></svg> ' + (c.likes || 0);
    } else {
      likeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15v7"/></svg> ' + (c.likes || 0);
    }
    likeBtn.onclick = function() { _voteCommentNode(c.id, 'like'); };
    actions.appendChild(likeBtn);

    // Dislike button
    var dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'flex items-center gap-1 text-steel-400 hover:text-red-400 active:scale-90 transition-all text-xs font-condensed font-600';
    var hasDisliked = _myCommentVotes[c.id] === 'dislike';
    if (hasDisliked) {
      dislikeBtn.classList.add('text-red-400');
      dislikeBtn.innerHTML = '<svg class="w-4 h-4 fill-red-400/20 text-red-400" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M20 2v7"/></svg> ' + (c.dislikes || 0);
    } else {
      dislikeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M20 2v7"/></svg> ' + (c.dislikes || 0);
    }
    dislikeBtn.onclick = function() { _voteCommentNode(c.id, 'dislike'); };
    actions.appendChild(dislikeBtn);

    // Reply button
    var replyBtn = document.createElement('button');
    replyBtn.className = 'text-steel-400 hover:text-white text-[11px] font-condensed font-700 tracking-wider uppercase px-2 py-0.5 rounded hover:bg-white/5 transition-all ml-1';
    replyBtn.textContent = 'Reply';
    replyBtn.onclick = function() {
      var parentId = isReply ? rootId : c.id;
      _startReply(parentId, c.name);
    };
    actions.appendChild(replyBtn);

    content.appendChild(actions);
    flexContainer.appendChild(content);
    entry.appendChild(flexContainer);
    return entry;
  }

  function _startReply(commentId, authorName) {
    _replyToCommentId = commentId;
    var repInd = document.getElementById('cf-reply-indicator');
    if (repInd) {
      repInd.classList.remove('hidden');
      document.getElementById('cf-reply-to-name').textContent = authorName || 'Anonymous';
    }
    var commentBox = document.getElementById('cf-comment');
    if (commentBox) {
      commentBox.value = '@' + authorName + ' ';
      commentBox.focus();
      commentBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function cancelReply() {
    _replyToCommentId = null;
    var ind = document.getElementById('cf-reply-indicator');
    if (ind) ind.classList.add('hidden');
    var commentBox = document.getElementById('cf-comment');
    if (commentBox && commentBox.value.startsWith('@')) {
      commentBox.value = '';
    }
  }

  function _voteCommentNode(commentId, voteType) {
    var currentVote = _myCommentVotes[commentId];
    var likeChange = 0;
    var dislikeChange = 0;

    if (currentVote === voteType) {
      delete _myCommentVotes[commentId];
      if (voteType === 'like') likeChange = -1;
      else dislikeChange = -1;
    } else {
      if (currentVote === 'like') likeChange = -1;
      else if (currentVote === 'dislike') dislikeChange = -1;

      _myCommentVotes[commentId] = voteType;
      if (voteType === 'like') likeChange += 1;
      else dislikeChange += 1;
    }

    localStorage.setItem('pdx_comment_votes', JSON.stringify(_myCommentVotes));

    _updateLocalVoteOnly(commentId, likeChange, dislikeChange);

    _commentsCollection.doc(commentId).get().then(function(doc) {
      if (doc.exists) {
        var d = doc.data();
        var currentLikes = typeof d.likes === 'number' ? d.likes : 0;
        var currentDislikes = typeof d.dislikes === 'number' ? d.dislikes : 0;
        var newLikes = Math.max(0, currentLikes + likeChange);
        var newDislikes = Math.max(0, currentDislikes + dislikeChange);

        doc.ref.update({
          likes: newLikes,
          dislikes: newDislikes
        });
      }
    }).catch(function(e) {
      console.warn("Firestore vote failed:", e);
    });
  }

  function _updateLocalVoteOnly(commentId, likeChange, dislikeChange) {
    var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
    for (var i = 0; i < localList.length; i++) {
      if (localList[i].id === commentId) {
        localList[i].likes = Math.max(0, (localList[i].likes || 0) + likeChange);
        localList[i].dislikes = Math.max(0, (localList[i].dislikes || 0) + dislikeChange);
        break;
      }
    }
    localStorage.setItem('pdx_local_comments_v3', JSON.stringify(localList));
    _loadCommentsAndRender();
  }

  function closeCommentModal() {
    if (_commentsUnsubscribe) {
      _commentsUnsubscribe();
      _commentsUnsubscribe = null;
    }
    cancelReply();
    if (typeof window._pdxRefreshCommentChips === 'function') window._pdxRefreshCommentChips();
    if (typeof window._pdxRefreshVoteChips === 'function') window._pdxRefreshVoteChips();
    var overlay = document.getElementById('comment-overlay');
    overlay.classList.remove('cm-visible');
    overlay.classList.add('cm-hidden');
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.style.display = 'none';
      overlay.classList.remove('cm-hidden');
      if (document.getElementById('modal-overlay').style.display === 'none') {
        document.body.style.overflow = '';
      }
    }, 250);
  }

  function submitComment() {
    var name    = document.getElementById('cf-name').value.trim();
    var comment = document.getElementById('cf-comment').value.trim();
    var errEl   = document.getElementById('cf-error');
    var errText = document.getElementById('cf-error-text');

    if (!name) {
      errText.textContent = 'Please enter your name.';
      errEl.classList.remove('hidden'); return;
    }
    if (!comment || comment.length < 3) {
      errText.textContent = 'Please enter a comment (at least 3 characters).';
      errEl.classList.remove('hidden'); return;
    }
    errEl.classList.add('hidden');

    localStorage.setItem('pdx_comment_name', name);

    var btn = document.getElementById('cf-submit-btn');
    document.getElementById('cf-btn-label').textContent = 'Posting...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    var commentId = 'lc_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    var newComment = {
      id: commentId,
      pid: _currentCommentPolitician,
      name: name,
      text: comment,
      parent_id: _replyToCommentId || null,
      created_at: Date.now(),
      likes: 0,
      dislikes: 0
    };

    // Save to local storage immediately
    var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
    localList.push(newComment);
    localStorage.setItem('pdx_local_comments_v3', JSON.stringify(localList));

    // Reset input fields
    document.getElementById('cf-comment').value = '';
    cancelReply();
    document.getElementById('cf-btn-label').textContent = 'Comment';
    btn.disabled = false;
    btn.style.opacity = '1';

    // Refresh and sync counts
    _loadCommentsAndRender();
    _syncCommentCountToUI(_currentCommentPolitician, (_commentCounts[_currentCommentPolitician] || 0) + 1);

    _commentedPids.add(_currentCommentPolitician);
    localStorage.setItem('pdx_commented_pids', JSON.stringify(Array.from(_commentedPids)));
    document.querySelectorAll('[data-comment-pid="' + _currentCommentPolitician + '"]').forEach(function(b) {
      b.classList.add('commented');
    });

    // Write to Firestore
    _commentsCollection.doc(commentId).set(newComment).then(function() {
      console.log("Firestore comment created.");
    }).catch(function(err) {
      console.warn("Firestore write fallback:", err);
    });
  }

  // ═══ Evidence Modal ═══
  function openEvidenceModal() {
    document.getElementById('evidence-politician-label').textContent =
      document.getElementById('comment-politician-label').textContent;
    document.getElementById('ev-name').value = document.getElementById('cf-name').value;
    document.getElementById('ev-comment').value = '';
    document.getElementById('ev-source').value = '';
    document.getElementById('ev-error').classList.add('hidden');
    document.getElementById('evidence-form-wrap').classList.remove('hidden');
    document.getElementById('evidence-success').classList.add('hidden');
    document.getElementById('evidence-footer').classList.remove('hidden');
    document.getElementById('ev-btn-label').textContent = 'Submit Evidence';
    document.getElementById('ev-submit-btn').disabled = false;
    document.getElementById('ev-submit-btn').style.opacity = '1';
    var overlay = document.getElementById('evidence-overlay');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    requestAnimationFrame(function() { requestAnimationFrame(function() {
      overlay.style.transition = 'opacity 0.22s ease';
      overlay.style.opacity = '1';
    }); });
  }

  function closeEvidenceModal() {
    var overlay = document.getElementById('evidence-overlay');
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.style.display = 'none'; }, 220);
  }

  function submitEvidence() {
    var name = document.getElementById('ev-name').value.trim();
    var text = document.getElementById('ev-comment').value.trim();
    var source = document.getElementById('ev-source').value.trim();
    var errEl = document.getElementById('ev-error');
    var errText = document.getElementById('ev-error-text');

    if (!name) { errText.textContent = 'Please enter your name.'; errEl.classList.remove('hidden'); return; }
    if (!text || text.length < 10) { errText.textContent = 'Description must be at least 10 characters.'; errEl.classList.remove('hidden'); return; }
    if (!source) { errText.textContent = 'Source URL is required for evidence submissions.'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');

    var btn = document.getElementById('ev-submit-btn');
    document.getElementById('ev-btn-label').textContent = 'Submitting...';
    btn.disabled = true; btn.style.opacity = '0.7';

    var commentId = 'ev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    var newEvidence = {
      id: commentId,
      pid: _currentCommentPolitician,
      name: name,
      text: '[EVIDENCE: ' + document.getElementById('ev-type').value.toUpperCase() + '] ' + text + '\nSource: ' + source,
      created_at: Date.now(),
      likes: 0,
      dislikes: 0
    };

    // Save locally
    var localList = JSON.parse(localStorage.getItem('pdx_local_comments_v3') || '[]');
    localList.push(newEvidence);
    localStorage.setItem('pdx_local_comments_v3', JSON.stringify(localList));

    // Update UI
    document.getElementById('evidence-form-wrap').classList.add('hidden');
    document.getElementById('evidence-success').classList.remove('hidden');
    document.getElementById('evidence-footer').classList.add('hidden');
    _syncCommentCountToUI(_currentCommentPolitician, (_commentCounts[_currentCommentPolitician] || 0) + 1);
    _loadCommentsAndRender();

    // Save to Firestore
    _commentsCollection.doc(commentId).set(newEvidence).catch(function(e) {
      console.warn("Firestore evidence write fallback:", e);
    });
  }

  function _timeAgo(date) {
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return date.toLocaleDateString();
  }

  function _nameColor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    h = Math.abs(h) % 360;
    return 'hsl(' + h + ', 50%, 35%)';
  }

  // ════════════════════════════════════════════════════════
  // LIVE COMMUNITY CHAT SYSTEM
  // Real-time tabbed chat with replies, likes, dislikes
  // ════════════════════════════════════════════════════════
  var _currentChatPid = 'chat_promise_breaks';
  var _chatUnsubscribe = null;
  var _chatReplyToId = null;
  var _chatVotes = JSON.parse(localStorage.getItem('pdx_chat_votes') || '{}');
  var _chatMessagesList = [];

  function initChatSystem() {
    var nameInput = document.getElementById('chat-name-input');
    if (nameInput) {
      nameInput.value = localStorage.getItem('pdx_comment_name') || localStorage.getItem('pdx_chat_name') || '';
    }
    
    // Listen for name input changes to sync with comment system name
    nameInput?.addEventListener('input', function(e) {
      localStorage.setItem('pdx_chat_name', e.target.value.trim());
      localStorage.setItem('pdx_comment_name', e.target.value.trim());
    });

    startChatRealtimeListener();
  }

  function switchChatTab(pid) {
    if (_currentChatPid === pid) return;
    _currentChatPid = pid;

    // Update active tab styling
    document.querySelectorAll('.chat-tab-btn').forEach(function(btn) {
      btn.classList.remove('active');
    });
    var activeBtn = document.getElementById('tab-' + pid);
    if (activeBtn) activeBtn.classList.add('active');

    // Update stream title text
    var titleEl = document.getElementById('chat-stream-title');
    if (titleEl) {
      var labels = {
        'chat_promise_breaks': 'Promise Breaks & Flip-Flops Chat',
        'chat_legislation_voting': 'Legislation & Voting Record Chat',
        'chat_constitutional_rights': 'Constitutional Rights & Freedoms Chat',
        'chat_local_state': 'Local & State Issues Chat'
      };
      titleEl.textContent = labels[pid] || 'Live Community Chat';
    }

    cancelChatReply();
    startChatRealtimeListener();
  }

  function startChatRealtimeListener() {
    if (_chatUnsubscribe) {
      _chatUnsubscribe();
      _chatUnsubscribe = null;
    }

    var container = document.getElementById('chat-messages-container');
    if (container) {
      container.innerHTML = '<div class="text-center py-8 text-steel-500 text-sm">Connecting to live stream...</div>';
    }

    try {
      _chatUnsubscribe = db.collection('comments_v2')
        .where('pid', '==', _currentChatPid)
        .onSnapshot(function(snapshot) {
          var list = [];
          snapshot.forEach(function(doc) {
            var data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          _chatMessagesList = list;
          renderChatMessages();
        }, function(err) {
          console.warn("Firestore chat subscription failed:", err);
          renderChatMessages();
        });
    } catch (e) {
      console.warn("Firestore chat subscription error:", e);
      renderChatMessages();
    }
  }

  function renderChatMessages() {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;

    if (!_chatMessagesList || _chatMessagesList.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-steel-500 text-sm">No messages yet. Be the first to start the debate!</div>';
      return;
    }

    // Build hierarchical replies map
    var rootMessages = [];
    var repliesByParent = {};

    _chatMessagesList.forEach(function(m) {
      if (m.parent_id) {
        if (!repliesByParent[m.parent_id]) {
          repliesByParent[m.parent_id] = [];
        }
        repliesByParent[m.parent_id].push(m);
      } else {
        rootMessages.push(m);
      }
    });

    // Sort root messages oldest first (ascending) so scrolling down shows latest messages
    rootMessages.sort(function(a, b) {
      return (a.created_at || 0) - (b.created_at || 0);
    });

    // Sort replies oldest first too
    Object.keys(repliesByParent).forEach(function(pId) {
      repliesByParent[pId].sort(function(a, b) {
        return (a.created_at || 0) - (b.created_at || 0);
      });
    });

    container.innerHTML = '';
    
    rootMessages.forEach(function(rm) {
      var rootNode = buildChatMessageNode(rm, false);
      container.appendChild(rootNode);

      // Render nested replies
      var replies = repliesByParent[rm.id] || [];
      if (replies.length > 0) {
        var repliesWrapper = document.createElement('div');
        repliesWrapper.className = 'ml-6 sm:ml-10 mt-1.5 pl-3 border-l-2 border-white/5 space-y-2';
        replies.forEach(function(rep) {
          var repNode = buildChatMessageNode(rep, true, rm.id);
          repliesWrapper.appendChild(repNode);
        });
        container.appendChild(repliesWrapper);
      }
    });

    // Scroll to the bottom of the container
    setTimeout(function() {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }

  function buildChatMessageNode(m, isReply, rootId) {
    var item = document.createElement('div');
    item.className = 'py-2 px-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.015] transition-colors';

    var ts = m.created_at ? _timeAgo(new Date(m.created_at)) : 'just now';

    var flexRow = document.createElement('div');
    flexRow.className = 'flex gap-2.5';

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5 shadow-sm';
    avatar.style.background = _nameColor(m.name || 'Anonymous');
    avatar.textContent = (m.name || 'A')[0].toUpperCase();
    flexRow.appendChild(avatar);

    // Content
    var contentCol = document.createElement('div');
    contentCol.className = 'flex-1 min-w-0';

    // Header
    var header = document.createElement('div');
    header.className = 'flex items-center gap-1.5 mb-0.5';
    
    var nameSpan = document.createElement('span');
    nameSpan.className = 'font-condensed text-[12px] font-700 text-white tracking-wide';
    nameSpan.textContent = m.name || 'Anonymous';
    header.appendChild(nameSpan);

    var tsSpan = document.createElement('span');
    tsSpan.className = 'text-steel-500 text-[9px] font-condensed tracking-wider';
    tsSpan.textContent = ts;
    header.appendChild(tsSpan);
    contentCol.appendChild(header);

    // Body text
    var bodyP = document.createElement('p');
    bodyP.className = 'text-xs text-steel-200 leading-relaxed font-body break-words';
    bodyP.textContent = m.text || '';
    contentCol.appendChild(bodyP);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'flex items-center gap-2.5 mt-1';

    // Likes
    var likeBtn = document.createElement('button');
    likeBtn.className = 'flex items-center gap-0.5 text-steel-500 hover:text-green-400 active:scale-90 transition-all text-[10px] font-condensed font-600 h-auto min-h-0';
    likeBtn.style.minHeight = 'unset';
    var hasLiked = _chatVotes[m.id] === 'like';
    if (hasLiked) {
      likeBtn.classList.add('text-green-400');
      likeBtn.innerHTML = '<svg class="w-3.5 h-3.5 fill-green-400/20 text-green-400" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15v7"/></svg> ' + (m.likes || 0);
    } else {
      likeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15v7"/></svg> ' + (m.likes || 0);
    }
    likeBtn.onclick = function() { voteChatMessage(m.id, 'like'); };
    actions.appendChild(likeBtn);

    // Dislikes
    var dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'flex items-center gap-0.5 text-steel-500 hover:text-red-400 active:scale-90 transition-all text-[10px] font-condensed font-600 h-auto min-h-0';
    dislikeBtn.style.minHeight = 'unset';
    var hasDisliked = _chatVotes[m.id] === 'dislike';
    if (hasDisliked) {
      dislikeBtn.classList.add('text-red-400');
      dislikeBtn.innerHTML = '<svg class="w-3.5 h-3.5 fill-red-400/20 text-red-400" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M20 2v7"/></svg> ' + (m.dislikes || 0);
    } else {
      dislikeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M20 2v7"/></svg> ' + (m.dislikes || 0);
    }
    dislikeBtn.onclick = function() { voteChatMessage(m.id, 'dislike'); };
    actions.appendChild(dislikeBtn);

    // Reply
    var replyBtn = document.createElement('button');
    replyBtn.className = 'text-steel-500 hover:text-white text-[9px] font-condensed font-700 tracking-wider uppercase px-1.5 py-0.5 rounded hover:bg-white/5 transition-all ml-1 h-auto min-h-0';
    replyBtn.style.minHeight = 'unset';
    replyBtn.textContent = 'Reply';
    replyBtn.onclick = function() {
      var parentId = isReply ? rootId : m.id;
      startChatReply(parentId, m.name);
    };
    actions.appendChild(replyBtn);

    contentCol.appendChild(actions);
    flexRow.appendChild(contentCol);
    item.appendChild(flexRow);

    return item;
  }

  function startChatReply(msgId, authorName) {
    _chatReplyToId = msgId;
    var ind = document.getElementById('chat-reply-indicator');
    if (ind) {
      ind.classList.remove('hidden');
      document.getElementById('chat-reply-to-name').textContent = authorName || 'Anonymous';
    }
    var msgInput = document.getElementById('chat-message-input');
    if (msgInput) {
      msgInput.value = '@' + authorName + ' ';
      msgInput.focus();
    }
  }

  function cancelChatReply() {
    _chatReplyToId = null;
    var ind = document.getElementById('chat-reply-indicator');
    if (ind) ind.classList.add('hidden');
    var msgInput = document.getElementById('chat-message-input');
    if (msgInput && msgInput.value.startsWith('@')) {
      msgInput.value = '';
    }
  }

  function voteChatMessage(msgId, voteType) {
    var currentVote = _chatVotes[msgId];
    var likeChange = 0;
    var dislikeChange = 0;

    if (currentVote === voteType) {
      delete _chatVotes[msgId];
      if (voteType === 'like') likeChange = -1;
      else dislikeChange = -1;
    } else {
      if (currentVote === 'like') likeChange = -1;
      else if (currentVote === 'dislike') dislikeChange = -1;

      _chatVotes[msgId] = voteType;
      if (voteType === 'like') likeChange += 1;
      else dislikeChange += 1;
    }

    localStorage.setItem('pdx_chat_votes', JSON.stringify(_chatVotes));

    // Update local list instantly
    for (var i = 0; i < _chatMessagesList.length; i++) {
      if (_chatMessagesList[i].id === msgId) {
        _chatMessagesList[i].likes = Math.max(0, (_chatMessagesList[i].likes || 0) + likeChange);
        _chatMessagesList[i].dislikes = Math.max(0, (_chatMessagesList[i].dislikes || 0) + dislikeChange);
        break;
      }
    }
    renderChatMessages();

    // Sync to Firestore
    db.collection('comments_v2').doc(msgId).get().then(function(doc) {
      if (doc.exists) {
        var d = doc.data();
        var currentLikes = typeof d.likes === 'number' ? d.likes : 0;
        var currentDislikes = typeof d.dislikes === 'number' ? d.dislikes : 0;
        doc.ref.update({
          likes: Math.max(0, currentLikes + likeChange),
          dislikes: Math.max(0, currentDislikes + dislikeChange)
        });
      }
    }).catch(function(e) {
      console.warn("Firestore chat vote failed:", e);
    });
  }

  function submitChatMessage() {
    var nameInput = document.getElementById('chat-name-input');
    var msgInput = document.getElementById('chat-message-input');
    var errAlert = document.getElementById('chat-error-alert');
    var errText = document.getElementById('chat-error-text');

    if (!nameInput || !msgInput) return;

    var name = nameInput.value.trim();
    var text = msgInput.value.trim();

    if (!name) {
      errText.textContent = 'Please enter your display name.';
      errAlert?.classList.remove('hidden');
      return;
    }
    if (!text || text.length < 2) {
      errText.textContent = 'Please enter a message (at least 2 characters).';
      errAlert?.classList.remove('hidden');
      return;
    }

    errAlert?.classList.add('hidden');

    localStorage.setItem('pdx_chat_name', name);
    localStorage.setItem('pdx_comment_name', name); // sync with comments

    var msgId = 'chat_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    var newMsg = {
      id: msgId,
      pid: _currentChatPid,
      name: name,
      text: text,
      parent_id: _chatReplyToId || null,
      created_at: Date.now(),
      likes: 0,
      dislikes: 0
    };

    // Reset message input and reply state
    msgInput.value = '';
    cancelChatReply();

    // Optimistically add to local messages and render
    _chatMessagesList.push(newMsg);
    renderChatMessages();

    // Write to Firestore
    db.collection('comments_v2').doc(msgId).set(newMsg).then(function() {
      console.log("Firestore chat message sent successfully.");
    }).catch(function(err) {
      console.warn("Firestore chat message write failed:", err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatSystem);
  } else {
    initChatSystem();
  }

  // Cross tab listener
  window.addEventListener('storage', function(e) {
    if (e.key === 'pdx_local_comments_v3') {
      _loadCommentsAndRender();
      _loadCommentCounts();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var eo = document.getElementById('evidence-overlay');
      if (eo && eo.style.display !== 'none') { closeEvidenceModal(); e.stopPropagation(); return; }
      var co = document.getElementById('comment-overlay');
      if (co && co.style.display !== 'none') { closeCommentModal(); e.stopPropagation(); }
    }
  }, true);
  
