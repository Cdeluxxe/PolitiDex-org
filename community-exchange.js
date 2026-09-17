/* ══════════════════════════════════════════════════════════════════════════════
   community-exchange.js — THE VERIFIED TRACK'S CONTROLLER, AND ITS OWN FILE.
   ────────────────────────────────────────────────────────────────────────────
   Vanilla, self-contained controller for the community discussion layer. Talks
   to /api/community (Netlify Function + Netlify Database). Reuses the site's
   Firebase sign-in for identity and the global CORE_NATIONAL_ISSUES / ISSUE_MAP
   for category + issue tagging. Kept entirely separate from Evidence Locker JS.

   WHERE IT CAME FROM. This was 1,276 lines of inline <script> inside index.html,
   directly under the section it drives, and it is byte-for-byte the same IIFE
   here apart from the four changes listed below. It was already written as a
   closed IIFE with its own esc(), its own ago(), and a guarded read for every
   global it touches — which is why it could be lifted at all, and why lifting it
   needed no rewrite of its internals.

   WHAT CHANGED IN THE MOVE, AND NOTHING ELSE DID:
     1. THE MODERATOR QUEUE'S PROFILE CHIPS GO TO /p/<pid>. They used to be
        href="#profile-<id>". There is no handler for that fragment anywhere in
        this codebase — it was already a dead link on the homepage — so it now
        goes through PDXPersonLink, the one owner of "what is a person's URL",
        and falls back to the same inert span when the id is not a person.
     2. "VIEW IN EVIDENCE LOCKER" NAVIGATES TO /evidence?issue=<key>. The Locker
        is a document now, so the old in-page _pdxOpenEvidenceLocker() call is
        tried first (it still exists on the front page, where nothing loads this
        file) and a real navigation is the fallback rather than a no-op.
     3. THE ROOM CAN BE OPENED PRE-SCOPED FROM ANOTHER DOCUMENT. openForIssue
        and openForGap used to be same-page calls. /community is a document, so
        community-link.js hands the intent over in sessionStorage and in the
        query string, and takeHandoff() below is the other half of that pair.
     4. THE SECTION IS NO LONGER LAZY BEHIND A SCROLL. On the homepage this
        block sat two thousand lines down, so an IntersectionObserver was the
        right way to avoid paying for it. On /community it is the reason the
        reader is here, so setup() initialises immediately. The observer is
        kept for the case where the section is absent, which is now impossible
        but costs nothing to keep honest.

   WHAT IS STILL TRUE. No score. No party. No ranking of people. Reactions are
   per POST and stay on the post; nothing here writes to a profile, a stance or
   the formal record, and the only path from this track into the curated Evidence
   Locker is a human moderator moving one contribution across with attribution.
   ════════════════════════════════════════════════════════════════════════════════ */
(function () {
  var API = '/api/community';
  var initialized = false;
  var state = { sort: 'trending', category: '', issue: '', issueLabel: '', polContext: '', gap: null, posts: [], viewer: null };

  // The five custom reactions. "Off Topic / Low Quality" is rendered as a small,
  // low-visibility control (a soft flag), per the spec.
  var REACTIONS = [
    { key: 'strong_evidence', label: 'Strong Evidence', icon: '🟢' },
    { key: 'important',       label: 'Important / Review', icon: '⭐' },
    { key: 'needs_context',   label: 'Needs Context', icon: '🟡' },
    { key: 'disputed',        label: 'Disputed', icon: '⚖️' }
  ];
  var OFFTOPIC = { key: 'off_topic', label: 'Off topic / low quality', icon: '🚫' };
  var FLAG_REASONS = [
    { key: 'spam', label: 'Spam' },
    { key: 'misinformation', label: 'Misinformation' },
    { key: 'bad_faith', label: 'Bad faith / trolling' },
    { key: 'off_topic', label: 'Off topic' },
    { key: 'other', label: 'Other' }
  ];
  // What a contribution IS. "Evidence" is offered for the curated record and must
  // cite a source; a "lead" is a tip to look into. Drives the compose form.
  var KINDS = [
    { key: 'lead', name: '💡 A lead', desc: 'A tip or topic worth looking into.' },
    { key: 'evidence', name: '🧾 Evidence', desc: 'A concrete receipt — vote, statement, record — for the Locker.' }
  ];
  // Self-declared source category, mapped to the Evidence Strength standard so a
  // moderator can grade quickly. Informational only.
  var SOURCE_TYPES = [
    { key: 'official', label: 'Official record (floor/committee video, bill, filing)' },
    { key: 'interview', label: 'Direct long-form interview' },
    { key: 'statement', label: 'On-the-record statement or audio' },
    { key: 'social', label: 'Social media / short video clip' },
    { key: 'other', label: 'Other' }
  ];
  // Moderator-assigned strength grade at promotion time (Evidence Strength standard).
  var STRENGTHS = [
    { key: 'strong', label: 'Strong' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'limited', label: 'Limited' }
  ];
  function kindPill(kind) {
    if (kind === 'evidence') return '<span class="cee-pill cee-pill-kind-evidence">🧾 Evidence</span>';
    if (kind === 'lead') return '<span class="cee-pill cee-pill-kind-lead">💡 Lead</span>';
    return '';
  }
  // Where a lead stands. Two different things wearing one pill, and the copy
  // keeps them apart: the SUBMIT states say what the contributor attached, the
  // REVIEW states say what a moderator did about it. Neither is a verification
  // badge and neither puts anything into the record — only a curator moving it
  // into the Evidence Locker does that.
  var LEAD_STATE_PILLS = {
    has_source:  { cls: 'cee-pill-lead-sourced', ico: '🔗', label: 'Has source',
                   tip: 'This lead came with a source link for a curator to check' },
    needs_source:{ cls: 'cee-pill-lead-needs',   ico: '◌', label: 'Needs source',
                   tip: 'This lead has no source yet — it stays a research question until one is found' },
    checking:    { cls: 'cee-pill-lead-checking', ico: '◍', label: 'Being checked',
                   tip: 'A curator has picked this lead up and is chasing it down' },
    answered:    { cls: 'cee-pill-lead-answered', ico: '✓', label: 'Answered',
                   tip: 'A curator followed this lead and got an answer. That is a research note, not a score — nothing here changes a verdict.' },
    dead_end:    { cls: 'cee-pill-lead-dead',     ico: '⌀', label: 'Dead end',
                   tip: 'A curator followed this lead and found nothing to document. Kept on the record so the same ground is not covered twice.' }
  };
  function leadStatePill(post) {
    if (!post || post.kind !== 'lead' || !post.leadState) return '';
    var d = LEAD_STATE_PILLS[post.leadState] || LEAD_STATE_PILLS.needs_source;
    return '<span class="cee-pill ' + d.cls + '" title="' + esc(d.tip) + '">' +
      d.ico + ' ' + esc(d.label) + '</span>';
  }
  // The coverage gap a lead was suggested for, shown as read-only context.
  function gapPillHtml(post) {
    if (!post || !post.gapType) return '';
    var g = window.PDXGaps && window.PDXGaps.TYPES && window.PDXGaps.TYPES[post.gapType];
    var label = (g && g.label) || String(post.gapType).replace(/_/g, ' ');
    return '<span class="cee-pill cee-pill-gap" title="Suggested for a gap in our documentation">◷ ' + esc(label) + '</span>';
  }

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
  function coreIssues() { return (window.CORE_NATIONAL_ISSUES || []); }
  function issueMap() { return (window.ISSUE_MAP || {}); }
  function catLabel(key) {
    var c = coreIssues().filter(function (x) { return x.key === key; })[0];
    return c ? c.label : key;
  }
  function issueLabel(key) {
    var im = issueMap()[key];
    return im && im.label ? im.label : key;
  }

  // ── Auth: reuse the site's Firebase sign-in ──────────────────────────
  function currentUser() {
    try { return (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null; } catch (e) { return null; }
  }
  function signedIn() {
    var u = currentUser();
    return !!(u && !u.isAnonymous);
  }
  function requireSignIn() {
    if (signedIn()) return true;
    if (typeof window.openAuthModal === 'function') window.openAuthModal();
    return false;
  }
  function authToken() {
    var u = currentUser();
    if (!u || u.isAnonymous) return Promise.resolve(null);
    return u.getIdToken().catch(function () { return null; });
  }
  // Client-side moderator hint (server still enforces). Matches index.html gate.
  function isModerator() {
    var u = currentUser();
    var e = u && u.email ? u.email.toLowerCase() : '';
    return e === 'cdeluxxe@gmail.com';
  }

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
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        }).catch(function () { return { ok: r.ok, status: r.status, data: {} }; });
      });
    });
  }

  // ── Rendering: list ──────────────────────────────────────────────────
  function reactionBar(post) {
    var mine = post.viewerReactions || [];
    var html = '<div class="cee-reactions">';
    REACTIONS.forEach(function (r) {
      var n = (post.reactions && post.reactions[r.key]) || 0;
      var on = mine.indexOf(r.key) >= 0 ? ' active' : '';
      html += '<button class="cee-react-btn' + on + '" data-react="' + r.key + '" data-post="' + post.id + '" title="' + esc(r.label) + '">' +
              '<span>' + r.icon + '</span><span>' + esc(r.label) + '</span>' +
              (n ? '<span class="cee-rc">' + n + '</span>' : '') + '</button>';
    });
    // Low-visibility off-topic / low-quality control.
    var off = (post.reactions && post.reactions.off_topic) || 0;
    var offOn = mine.indexOf('off_topic') >= 0 ? ' active' : '';
    html += '<button class="cee-react-lowvis' + offOn + '" data-react="off_topic" data-post="' + post.id + '" title="' + esc(OFFTOPIC.label) + '">' +
            OFFTOPIC.icon + ' ' + esc(OFFTOPIC.label) + (off ? ' (' + off + ')' : '') + '</button>';
    html += '</div>';
    return html;
  }

  // Inner HTML for a "Suggest for Review" button — reflects whether the viewer
  // has already nominated this post and how many members have in total.
  function suggestInner(post) {
    var n = post.suggestCount || 0;
    var nHtml = n ? ' <span class="cee-suggest-n" title="' + n + ' member' + (n === 1 ? '' : 's') + ' suggested this">' + n + '</span>' : '';
    return (post.viewerSuggested ? '✓ Suggested' : '⭐ Suggest for Review') + nHtml;
  }

  function postCard(post) {
    var chips = (post.issueKeys || []).slice(0, 6).map(function (k) {
      return '<span class="cee-chip">' + esc(issueLabel(k)) + '</span>';
    }).join('');
    var statusPill = post.status === 'imported'
      ? '<span class="cee-pill cee-pill-imported">✓ In Evidence Locker</span>'
      : (post.status === 'removed' ? '<span class="cee-pill cee-pill-removed">Removed</span>' : '');
    return '' +
      '<div class="cee-card" data-card="' + post.id + '">' +
        '<div class="cee-card-top">' +
          '<span class="cee-pill cee-pill-community">Community Submitted</span>' +
          kindPill(post.kind) +
          leadStatePill(post) +
          gapPillHtml(post) +
          (post.categoryKey ? '<span class="cee-pill cee-pill-cat">' + esc(catLabel(post.categoryKey)) + '</span>' : '') +
          statusPill +
          (post.suggestedForReview ? '<span class="cee-pill cee-pill-cat" title="A member suggested this for the Evidence Locker">⭐ Suggested</span>' : '') +
          '<span class="cee-pill cee-pill-mom" title="Momentum from engagement + quality reactions">🔥 ' + (post.momentum || 0) + '</span>' +
        '</div>' +
        '<div class="cee-card-headline" data-open="' + post.id + '">' + esc(post.headline) + '</div>' +
        '<div class="cee-meta"><span>by ' + esc(post.authorName) + '</span><span>· ' + ago(post.createdAt) + '</span><span>· 💬 ' + (post.commentCount || 0) + '</span></div>' +
        (post.summary ? '<div class="cee-summary">' + esc(truncate(post.summary, 280)) + '</div>' : '') +
        (chips ? '<div class="cee-issue-chips">' + chips + '</div>' : '') +
        (post.sourceUrl ? '<a class="cee-source" href="' + esc(post.sourceUrl) + '" target="_blank" rel="noopener noreferrer">🔗 ' + esc(post.sourceUrl) + '</a>' : '') +
        lockerLinkHtml(post) +
        reactionBar(post) +
        '<div class="cee-card-actions">' +
          '<button class="cee-link-btn" data-open="' + post.id + '">💬 Discuss</button>' +
          '<button class="cee-suggest-cta cee-suggest' + (post.viewerSuggested ? ' done' : '') + '" data-suggest="' + post.id + '" title="' + (post.viewerSuggested ? 'You suggested this for the Evidence Locker' : 'Suggest this post for the curated Evidence Locker') + '">' + suggestInner(post) + '</button>' +
          '<button class="cee-link-btn cee-flag" data-flag="' + post.id + '">🚩 Flag</button>' +
        '</div>' +
      '</div>';
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n).trim() + '…' : s; }

  // A subtle, optional link out to the curated Evidence Locker, filtered to one
  // of the post's issues. Rendered HIDDEN by default and only revealed by
  // enhanceLockerLinks() once the Locker is confirmed to hold evidence for the
  // post's issue(s) — so a post never promises curated evidence that isn't
  // there, and posts with no tagged issue show nothing at all. `data-locker-
  // issues` carries every tagged issue; the enhancement picks the first with
  // evidence and stamps the chosen key/label for the click handler.
  function lockerLinkHtml(post, opts) {
    var keys = (post.issueKeys || []).filter(Boolean);
    if (!keys.length) return '';
    opts = opts || {};
    var cls = 'cee-locker-link' + (opts.modal ? ' cee-locker-link-modal' : '');
    var label = opts.modal ? '📚 View related evidence in the Digital Library' : '📚 View in Evidence Locker';
    return '<button type="button" class="' + cls + '" data-locker-issues="' + esc(keys.join(',')) + '" hidden>' + label + '<span class="cee-locker-count" hidden></span></button>';
  }

  // A clearable contextual header shown when the list is narrowed to a single
  // issue — e.g. after a visitor jumped here from an Evidence Locker gold
  // activity pill. Keeps the active filter visible with one tap to clear, and
  // carries a blue Evidence-return pill that closes the round-trip back to the
  // curated Digital Library. The return pill is rendered HIDDEN and only
  // revealed by enhanceLockerLinks() once the Locker is confirmed to actually
  // hold curated evidence for this issue — reusing the very same in-memory
  // index + receipt-count badge + deep-link click handler as the per-post
  // links, so it adds no new data dependency and stays quiet when there's
  // nothing curated to return to.
  function issueBannerHtml() {
    if (!state.issue && !state.polContext && !state.gap) return '';
    var lbl = state.issueLabel || issueLabel(state.issue);
    var key = esc(state.issue);
    // When a coverage gap was carried in from the Word vs Action panel, the
    // banner names the gap and says plainly what this list is: suggestions for
    // us to check, not part of the record.
    if (state.gap) {
      return '<div class="cee-issue-banner cee-issue-banner-gap">' +
        '<span class="cee-issue-banner-label">◷ Leads suggested for <strong>' + esc(state.gap.label) + '</strong>' +
          (state.gap.polName ? ' on <strong>' + esc(state.gap.polName) + '</strong>' : '') +
          ' — things for us to check. Nothing here is part of the record until a curator verifies and sources it.</span>' +
        '<button type="button" data-clear-issue class="cee-issue-banner-clear">Clear ✕</button>' +
      '</div>';
    }
    // When a politician was carried in (the "Suggest a receipt" on-ramp from a
    // gap row / thin profile / Evidence Locker), the banner reframes as a gentle
    // suggest prompt naming them; otherwise it's the plain issue-discussion
    // header used by the Evidence Locker activity pills.
    var labelHtml = state.polContext
      ? ('📝 Suggest a receipt for <strong>' + esc(state.polContext) + '</strong>' +
          (state.issue ? ' on <strong>' + esc(lbl) + '</strong>' : '') +
          ' — share a source, vote or statement that belongs on the record.')
      : ('💬 Community discussion on <strong>' + esc(lbl) + '</strong>');
    return '<div class="cee-issue-banner">' +
      '<span class="cee-issue-banner-label">' + labelHtml + '</span>' +
      (state.issue ? '<button type="button" class="cee-locker-link cee-issue-banner-link" data-locker-issues="' + key + '" hidden>📚 View curated evidence in the Digital Library<span class="cee-locker-count" hidden></span></button>' : '') +
      '<button type="button" data-clear-issue class="cee-issue-banner-clear">Clear ✕</button>' +
    '</div>';
  }

  function renderList() {
    var list = document.getElementById('cee-list');
    var banner = issueBannerHtml();
    if (!state.posts.length) {
      list.innerHTML = banner + '<div class="cee-empty">' + (state.gap
        ? ('No leads suggested for this gap yet — be the first to point us at something we can check.')
        : (state.polContext
        ? ('No community posts yet for ' + esc(state.polContext) + (state.issue ? ' on this issue' : '') + ' — be the first to suggest a receipt.')
        : (state.issue
          ? 'No community discussion on this issue yet — be the first to start one.'
          : 'No community posts yet — be the first to surface something the Evidence Locker may have missed.'))) + '</div>';
      enhanceLockerLinks(list);
      return;
    }
    list.innerHTML = banner + state.posts.map(postCard).join('');
    enhanceLockerLinks(list);
  }

  function loadList() {
    var list = document.getElementById('cee-list');
    list.innerHTML = '<div class="cee-skel"></div><div class="cee-skel"></div><div class="cee-skel"></div>';
    var qs = '?sort=' + encodeURIComponent(state.sort) +
      (state.category ? '&category=' + encodeURIComponent(state.category) : '') +
      (state.issue ? '&issue=' + encodeURIComponent(state.issue) : '') +
      // Gap context narrows the list to the leads suggested for that exact hole
      // in our documentation, so the reader lands on the conversation they came
      // from rather than the whole board.
      (state.gap ? '&kind=lead&pol=' + encodeURIComponent(state.gap.pid) +
        '&gap=' + encodeURIComponent(state.gap.type) : '');
    return api('/posts' + qs).then(function (res) {
      if (!res.ok) { list.innerHTML = '<div class="cee-empty">Could not load posts. Please try again.</div>'; return; }
      state.posts = res.data.posts || [];
      // The server narrows to this politician + gap TYPE (both indexed); the
      // exact gap key is matched here so a per-issue gap shows only its own
      // leads rather than every gap of the same kind on the profile.
      if (state.gap && state.gap.key) {
        state.posts = state.posts.filter(function (p) { return p.gapKey === state.gap.key; });
      }
      state.viewer = res.data.viewer || null;
      renderList();
    }).catch(function () {
      list.innerHTML = '<div class="cee-empty">Could not load posts. Please try again.</div>';
    });
  }

  // ── Reactions (toggle) ────────────────────────────────────────────────
  function toggleReaction(postId, reaction) {
    if (!requireSignIn()) return;
    api('/posts/' + postId + '/react', { method: 'POST', body: { reaction: reaction } })
      .then(function (res) {
        if (!res.ok) return;
        var p = findPost(postId);
        if (p) { p.reactions = res.data.reactions; p.viewerReactions = res.data.viewerReactions; }
        // Re-render just this card (and detail if open).
        var card = document.querySelector('[data-card="' + postId + '"]');
        if (card && p) { card.outerHTML = postCard(p); enhanceLockerLinks(); }
        if (detailOpenId === postId) renderDetailReactions(p);
      });
  }
  function findPost(id) { return state.posts.filter(function (p) { return p.id === id; })[0]; }

  // ── Compose ────────────────────────────────────────────────────────────
  var composeTags = [];
  var composeKind = 'lead';
  // The coverage gap a compose was opened from, or null for a normal
  // contribution. When set, the form is LOCKED to a lead about that gap: the
  // kind cannot be changed and the politician + gap travel with the submission
  // as read-only chips, so a lead can never arrive claiming to be evidence, and
  // can never be silently re-pointed at a different record.
  var composeGap = null;
  function openCompose() {
    if (!requireSignIn()) return;
    composeTags = [];
    composeKind = 'lead';
    var g = composeGap;
    var catOpts = '<option value="">— Select a category —</option>' + coreIssues().map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.label) + '</option>';
    }).join('');
    var srcTypeOpts = '<option value="">— Select the kind of source —</option>' + SOURCE_TYPES.map(function (s) {
      return '<option value="' + esc(s.key) + '">' + esc(s.label) + '</option>';
    }).join('');
    var kindOpts = KINDS.map(function (k) {
      return '<div class="cee-kind-opt' + (k.key === composeKind ? ' on' : '') + '" data-kind="' + esc(k.key) + '" role="button" tabindex="0">' +
        '<span class="cee-kind-name">' + esc(k.name) + '</span>' +
        '<span class="cee-kind-desc">' + esc(k.desc) + '</span></div>';
    }).join('');
    var modal = document.getElementById('cee-modal');
    // Gap-locked mode: a different title, the framing sentence that draws the
    // line between a suggestion and the record, and read-only context chips.
    var gapBlock = !g ? '' : (
      '<div class="cee-gap-lock">' +
        '<div class="cee-gap-lock-h">◷ Suggesting a lead for a gap in our documentation</div>' +
        '<div class="cee-gap-chips">' +
          '<span class="cee-chip cee-chip-lock" title="Locked to this record">👤 ' + esc(g.polName || g.pid) + '</span>' +
          '<span class="cee-chip cee-chip-lock" title="Locked to this gap">◷ ' + esc(g.label) + '</span>' +
          (g.issueLabel ? '<span class="cee-chip cee-chip-lock">🏷 ' + esc(g.issueLabel) + '</span>' : '') +
          '<span class="cee-pill cee-pill-kind-lead">💡 Lead</span>' +
        '</div>' +
        (g.detail ? '<p class="cee-gap-lock-detail">' + esc(g.detail) + '</p>' : '') +
        (g.ask ? '<p class="cee-gap-lock-ask"><strong>What would fill it:</strong> ' + esc(g.ask) + '</p>' : '') +
      '</div>');
    modal.innerHTML = '' +
      '<div class="cee-modal-head"><div class="cee-modal-title">' +
        (g ? '＋ Suggest a lead' : '＋ Contribute to PolitiDex') + '</div>' +
        '<button class="cee-close" data-close>×</button></div>' +
      '<p class="cee-sub" style="text-align:left;margin:-0.4rem 0 1rem;">' + (g
        ? 'You are suggesting something for us to check — not adding to the record. A curator verifies and sources anything that becomes part of it.'
        : 'Surface something the Evidence Locker may have missed. A moderator reviews every contribution against our writing standard before anything is added — and credits you when it graduates.') +
      '</p>' +
      gapBlock +
      (g ? '' :
      '<div class="cee-field"><label>What are you contributing?</label>' +
        '<div class="cee-kind-toggle" id="cee-f-kind">' + kindOpts + '</div></div>') +
      '<div class="cee-field"><label>' + (g ? 'Claim to check <span class="cee-req">*</span>' : 'Headline *') + '</label>' +
        '<input class="cee-input" id="cee-f-headline" maxlength="200" placeholder="' + (g
          ? 'What should we check? One factual claim, in their own record’s terms.'
          : 'What did you find? Keep it factual and about the person’s own record.') + '"></div>' +
      '<div class="cee-field"><label>' + (g ? 'Notes for the curator' : 'Summary / Context') + '</label>' +
        '<textarea class="cee-textarea" id="cee-f-summary" maxlength="5000" placeholder="' + (g
          ? 'Where should we look, and what should we expect to find? Stick to verifiable facts about what they said or did.'
          : 'Explain what this is and why it matters. Stick to verifiable facts — describe what the individual said or did, not their party.') + '"></textarea></div>' +
      '<div class="cee-field"><label id="cee-f-source-label">Source link <span class="cee-hint" style="display:inline;">(' +
        (g ? 'strongly encouraged' : 'encouraged') + ')</span></label>' +
        '<input class="cee-input" id="cee-f-source" maxlength="500" placeholder="https://…">' +
        '<div class="cee-hint" id="cee-f-source-hint">' + (g
          ? 'A lead with a link can be checked. Without one it sits in the queue marked “needs source”.'
          : 'A direct link lets others verify it. Required for evidence.') + '</div>' +
        '<div class="cee-yt-verify" id="cee-f-yt-verify" style="display:none;font-size:0.76rem;margin-top:0.35rem;"></div></div>' +
      '<div class="cee-field" id="cee-f-srctype-field" style="display:none;"><label>Source type</label>' +
        '<select class="cee-select" id="cee-f-srctype">' + srcTypeOpts + '</select>' +
        '<div class="cee-hint">Helps the moderator grade evidence strength. Official records and long-form interviews carry the most weight.</div></div>' +
      '<div class="cee-field"><label>Category</label>' +
        '<select class="cee-select" id="cee-f-cat">' + catOpts + '</select></div>' +
      '<div class="cee-field"><label>' + (g ? 'Issue <span class="cee-hint" style="display:inline;">(strongly encouraged)</span>' : 'Issue tags (optional)') + '</label>' +
        '<div class="cee-tag-grid" id="cee-f-tags"><span style="font-size:0.76rem;color:#7e93b4;">Pick a category to see related issue tags.</span></div></div>' +
      '<div style="display:flex;gap:0.6rem;justify-content:flex-end;align-items:center;">' +
        '<div class="cee-form-msg" id="cee-f-msg" style="margin-right:auto;"></div>' +
        '<button class="cee-btn cee-btn-ghost" data-close>Cancel</button>' +
        '<button class="cee-btn cee-btn-primary" id="cee-f-submit">' + (g ? 'Submit Lead for Review' : 'Submit for Review') + '</button>' +
      '</div>';
    document.getElementById('cee-f-cat').addEventListener('change', renderComposeTags);
    document.getElementById('cee-f-submit').addEventListener('click', submitCompose);
    // Live YouTube attribution: when the source link is a YouTube video, confirm
    // it via /api/yt-verify (YouTube's own oEmbed) and show the REAL title +
    // channel, so the submitter and the reviewing moderator can judge attribution
    // — the "verifiably the named politician" criterion of the interview exception
    // (EVIDENCE_STRENGTH.md). Advisory only: it never changes the submission.
    (function () {
      var srcEl = document.getElementById('cee-f-source');
      if (srcEl) srcEl.addEventListener('change', function () { verifyComposeYt(srcEl.value); });
    })();
    // Kind toggle: clicking a card selects it and flips the source requirement.
    // Absent in gap-locked mode — the kind is not the submitter's to change.
    var kindEl = document.getElementById('cee-f-kind');
    if (kindEl) kindEl.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-kind]'); if (opt) setComposeKind(opt.getAttribute('data-kind'));
    });
    setComposeKind('lead');
    // Carry the gap's issue into the category + issue tag, so a lead arrives
    // filed where the gap lives instead of unsorted.
    if (g && g.issueKey) prefillComposeIssue(g.issueKey);
    detailOpenId = null;
    openOverlay();
  }
  // Select the category that owns an issue key and pre-tag that issue.
  function prefillComposeIssue(issueKey) {
    try {
      var core = coreIssues().filter(function (c) { return (c.keys || []).indexOf(issueKey) >= 0; })[0];
      if (!core) return;
      var sel = document.getElementById('cee-f-cat');
      if (!sel) return;
      sel.value = core.key;
      renderComposeTags();
      composeTags = [issueKey];
      var chip = document.querySelector('#cee-f-tags [data-tag="' + issueKey.replace(/"/g, '') + '"]');
      if (chip) chip.classList.add('on');
    } catch (e) {}
  }

  // Reflect the chosen contribution kind: highlight the card, toggle the source
  // requirement marker + the source-type field so evidence clearly needs a source.
  function setComposeKind(kind) {
    // A gap-locked compose is a lead by construction — nothing may change it.
    composeKind = composeGap ? 'lead' : ((kind === 'evidence') ? 'evidence' : 'lead');
    Array.prototype.forEach.call(document.querySelectorAll('#cee-f-kind .cee-kind-opt'), function (el) {
      el.classList.toggle('on', el.getAttribute('data-kind') === composeKind);
    });
    var isEv = composeKind === 'evidence';
    var label = document.getElementById('cee-f-source-label');
    if (label) label.innerHTML = 'Source link ' + (isEv
      ? '<span class="cee-req">*</span>'
      : '<span class="cee-hint" style="display:inline;">(encouraged)</span>');
    var st = document.getElementById('cee-f-srctype-field');
    if (st) st.style.display = isEv ? 'block' : 'none';
    var submit = document.getElementById('cee-f-submit');
    if (submit) submit.textContent = isEv ? 'Submit Evidence for Review' : 'Submit Lead for Review';
  }
  function renderComposeTags() {
    var cat = document.getElementById('cee-f-cat').value;
    var box = document.getElementById('cee-f-tags');
    composeTags = [];
    var core = coreIssues().filter(function (c) { return c.key === cat; })[0];
    if (!core) { box.innerHTML = '<span style="font-size:0.76rem;color:#7e93b4;">Pick a category to see related issue tags.</span>'; return; }
    box.innerHTML = (core.keys || []).map(function (k) {
      return '<span class="cee-tag" data-tag="' + esc(k) + '">' + esc(issueLabel(k)) + '</span>';
    }).join('');
  }
  // Confirm a YouTube source link against YouTube's own oEmbed (/api/yt-verify)
  // and render the REAL title + channel under the field. Advisory attribution
  // help for submitter and moderator — never blocks or alters the submission.
  var _ytVerifyToken = 0;
  function verifyComposeYt(url) {
    var box = document.getElementById('cee-f-yt-verify');
    if (!box) return;
    var u = String(url || '').trim();
    if (!u || !/youtu\.?be|youtube\.com/i.test(u)) { box.style.display = 'none'; box.textContent = ''; return; }
    var token = ++_ytVerifyToken;
    box.style.display = 'block';
    box.style.color = '#7e93b4';
    box.textContent = 'Checking this video on YouTube…';
    fetch('/api/yt-verify?url=' + encodeURIComponent(u))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (token !== _ytVerifyToken) return; // a newer edit superseded this check
        if (d && d.ok) {
          box.style.color = '#86efac';
          box.innerHTML = '✓ Verified on YouTube — <b>' + esc(d.channel || 'channel') + '</b>: “' + esc(d.title || '') + '”' +
            '<span style="display:block;color:#7e93b4;margin-top:0.15rem;">Confirm this is the named person before marking it a direct interview.</span>';
        } else {
          box.style.color = '#fca5a5';
          box.textContent = '⚠ ' + ((d && d.error) || 'YouTube could not confirm this video.');
        }
      })
      .catch(function () {
        if (token !== _ytVerifyToken) return;
        box.style.color = '#7e93b4';
        box.textContent = 'Could not reach YouTube to verify right now.';
      });
  }
  function submitCompose() {
    var msg = document.getElementById('cee-f-msg');
    var headline = document.getElementById('cee-f-headline').value.trim();
    if (!headline) { msg.className = 'cee-form-msg err'; msg.textContent = 'A headline is required.'; return; }
    var sourceUrl = document.getElementById('cee-f-source').value.trim();
    // Evidence must be verifiable — require a source before it can be submitted.
    if (composeKind === 'evidence' && !sourceUrl) {
      msg.className = 'cee-form-msg err';
      msg.textContent = 'Evidence needs a source link so it can be verified.';
      var src = document.getElementById('cee-f-source'); if (src) src.focus();
      return;
    }
    var body = {
      kind: composeKind,
      headline: headline,
      summary: document.getElementById('cee-f-summary').value.trim(),
      sourceUrl: sourceUrl,
      sourceType: (document.getElementById('cee-f-srctype') || {}).value || null,
      categoryKey: document.getElementById('cee-f-cat').value || null,
      issueKeys: composeTags.slice()
    };
    // Gap context travels with the submission. The server re-validates every
    // field of it (roster, gap type, key shape) and derives lead_state itself,
    // so nothing here is trusted on the way in.
    if (composeGap) {
      body.linkedPoliticianIds = [composeGap.pid];
      body.gapKey = composeGap.key;
      body.gapType = composeGap.type;
    }
    var gapAtSubmit = composeGap;
    var btn = document.getElementById('cee-f-submit');
    btn.disabled = true; msg.className = 'cee-form-msg'; msg.textContent = 'Submitting…';
    api('/posts', { method: 'POST', body: body }).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { msg.className = 'cee-form-msg err'; msg.textContent = (res.data && res.data.error) || 'Could not submit.'; return; }
      // Personal Impact Tracker (opt-in): a submitted lead/evidence contribution.
      try { if (window.PDXImpact) window.PDXImpact.record('shared'); } catch (e) {}
      closeOverlay();
      _issueIndexP = null; // a new post may add discussion for a fresh issue
      // A lead suggested from a gap row should appear under that row without a
      // reload — the gap panel listens for this and re-reads its leads.
      if (gapAtSubmit) {
        composeGap = null;
        try {
          window.dispatchEvent(new CustomEvent('pdx-gap-lead-added', {
            detail: { pid: gapAtSubmit.pid, gapKey: gapAtSubmit.key }
          }));
        } catch (e) {}
      }
      state.sort = 'newest'; syncTabs(); loadList();
      if (isModerator()) loadModeration();
    });
  }

  // ── Detail + comments ────────────────────────────────────────────────
  var detailOpenId = null;
  var replyTo = null;
  function openDetail(postId) {
    detailOpenId = postId; replyTo = null;
    var modal = document.getElementById('cee-modal');
    modal.innerHTML = '<div class="cee-empty">Loading…</div>';
    openOverlay();
    api('/posts/' + postId).then(function (res) {
      if (!res.ok) { modal.innerHTML = '<div class="cee-empty">This post is unavailable.</div>'; return; }
      renderDetail(res.data);
    });
  }
  function renderDetail(d) {
    var p = d.post;
    var chips = (p.issueKeys || []).map(function (k) { return '<span class="cee-chip">' + esc(issueLabel(k)) + '</span>'; }).join('');
    var modal = document.getElementById('cee-modal');
    modal.innerHTML = '' +
      '<div class="cee-modal-head"><div>' +
        '<div style="margin-bottom:0.5rem;"><span class="cee-pill cee-pill-community">Community Submitted</span> ' +
          kindPill(p.kind) + ' ' + leadStatePill(p) + ' ' + gapPillHtml(p) + ' ' +
          (p.categoryKey ? '<span class="cee-pill cee-pill-cat">' + esc(catLabel(p.categoryKey)) + '</span>' : '') + '</div>' +
        '<div class="cee-modal-title">' + esc(p.headline) + '</div>' +
        '<div class="cee-meta" style="margin-top:0.4rem;"><span>by ' + esc(p.authorName) + '</span><span>· ' + ago(p.createdAt) + '</span></div>' +
      '</div><button class="cee-close" data-close>×</button></div>' +
      (p.summary ? '<div class="cee-summary">' + esc(p.summary) + '</div>' : '') +
      (chips ? '<div class="cee-issue-chips">' + chips + '</div>' : '') +
      (p.sourceUrl ? '<a class="cee-source" href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener noreferrer">🔗 ' + esc(p.sourceUrl) + '</a>' : '') +
      '<div id="cee-detail-reactions"></div>' +
      '<div class="cee-card-actions">' +
        '<button class="cee-suggest-cta cee-suggest' + (p.viewerSuggested ? ' done' : '') + '" data-suggest="' + p.id + '" title="' + (p.viewerSuggested ? 'You suggested this for the Evidence Locker' : 'Suggest this post for the curated Evidence Locker') + '">' + suggestInner(p) + '</button>' +
        '<button class="cee-link-btn cee-flag' + (d.viewerFlagged ? ' done' : '') + '" data-flag="' + p.id + '">🚩 ' + (d.viewerFlagged ? 'Flagged' : 'Flag') + '</button>' +
      '</div>' +
      '<p class="cee-suggest-hint' + (p.viewerSuggested ? ' ok' : '') + '" id="cee-suggest-msg">' +
        (p.viewerSuggested
          ? '✓ You suggested this — a moderator will review it for the Evidence Locker.'
          : 'Think this belongs in the curated Evidence Locker? Suggest it — a moderator reviews every suggestion before anything is added.') +
      '</p>' +
      lockerLinkHtml(p, { modal: true }) +
      '<div class="cee-comments">' +
        '<label style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:#7e93b4;font-weight:700;">Discussion (' + (d.comments || []).length + ')</label>' +
        '<div id="cee-composer" style="margin:0.6rem 0;">' +
          '<div id="cee-reply-ctx" style="font-size:0.74rem;color:#93c5fd;margin-bottom:0.3rem;display:none;"></div>' +
          '<textarea class="cee-textarea" id="cee-comment-body" maxlength="5000" placeholder="Add to the discussion…"></textarea>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:0.4rem;"><button class="cee-btn cee-btn-ghost" id="cee-comment-submit">Comment</button></div>' +
        '</div>' +
        '<div id="cee-comment-tree"></div>' +
      '</div>';
    renderDetailReactions(p);
    renderComments(d.comments || []);
    enhanceLockerLinks(modal);
    document.getElementById('cee-comment-submit').addEventListener('click', submitComment);
  }
  function renderDetailReactions(p) {
    var el = document.getElementById('cee-detail-reactions');
    if (el && p) el.innerHTML = reactionBar(p);
  }
  function renderComments(comments) {
    var tree = document.getElementById('cee-comment-tree');
    // Build a parent → children map, then render recursively (nested replies).
    var byParent = {};
    comments.forEach(function (c) { (byParent[c.parentId || 0] = byParent[c.parentId || 0] || []).push(c); });
    function node(c) {
      var kids = (byParent[c.id] || []).map(node).join('');
      return '<div class="cee-comment">' +
        '<div class="cee-comment-meta"><b>' + esc(c.authorName) + '</b> · ' + ago(c.createdAt) + '</div>' +
        '<div class="cee-comment-body">' + esc(c.body) + '</div>' +
        '<button class="cee-comment-reply" data-reply="' + c.id + '" data-name="' + esc(c.authorName) + '">↩ Reply</button>' +
        (kids ? '<div class="cee-thread">' + kids + '</div>' : '') +
      '</div>';
    }
    var roots = (byParent[0] || []);
    tree.innerHTML = roots.length ? roots.map(node).join('') : '<div style="color:#7e93b4;font-size:0.85rem;padding:0.5rem 0;">No comments yet. Start the discussion.</div>';
  }
  function setReply(id, name) {
    replyTo = id;
    var ctx = document.getElementById('cee-reply-ctx');
    if (ctx) {
      ctx.style.display = 'block';
      ctx.innerHTML = '↩ Replying to <b>' + esc(name) + '</b> · <span style="cursor:pointer;text-decoration:underline;" id="cee-reply-cancel">cancel</span>';
      document.getElementById('cee-reply-cancel').addEventListener('click', function () { replyTo = null; ctx.style.display = 'none'; });
    }
    var ta = document.getElementById('cee-comment-body'); if (ta) ta.focus();
  }
  function submitComment() {
    if (!requireSignIn()) return;
    var ta = document.getElementById('cee-comment-body');
    var text = ta.value.trim();
    if (!text) return;
    var btn = document.getElementById('cee-comment-submit');
    btn.disabled = true;
    api('/posts/' + detailOpenId + '/comments', { method: 'POST', body: { body: text, parentId: replyTo } })
      .then(function (res) {
        btn.disabled = false;
        if (!res.ok) return;
        // Personal Impact Tracker (opt-in): a comment you posted in the community.
        try { if (window.PDXImpact) window.PDXImpact.record('discussed'); } catch (e) {}
        // Reload detail to show the new (possibly nested) comment cleanly.
        openDetail(detailOpenId);
      });
  }

  // ── Flag + suggest ─────────────────────────────────────────────────────
  function openFlag(postId) {
    if (!requireSignIn()) return;
    var opts = FLAG_REASONS.map(function (r) { return '<option value="' + r.key + '">' + esc(r.label) + '</option>'; }).join('');
    var modal = document.getElementById('cee-modal');
    var prev = modal.innerHTML; detailOpenId = detailOpenId; // keep context
    modal.innerHTML = '' +
      '<div class="cee-modal-head"><div class="cee-modal-title">🚩 Flag this post</div><button class="cee-close" data-close>×</button></div>' +
      '<p class="cee-sub" style="text-align:left;margin-bottom:0.9rem;">Flag content that may be spam, misinformation, or bad faith. A moderator will review it.</p>' +
      '<div class="cee-field"><label>Reason</label><select class="cee-select" id="cee-flag-reason">' + opts + '</select></div>' +
      '<div class="cee-field"><label>Note (optional)</label><textarea class="cee-textarea" id="cee-flag-note" maxlength="1000" placeholder="Anything the moderator should know."></textarea></div>' +
      '<div style="display:flex;gap:0.6rem;justify-content:flex-end;align-items:center;"><div class="cee-form-msg" id="cee-flag-msg" style="margin-right:auto;"></div>' +
        '<button class="cee-btn cee-btn-ghost" data-close>Cancel</button>' +
        '<button class="cee-btn cee-btn-gold" id="cee-flag-submit">Submit Flag</button></div>';
    document.getElementById('cee-flag-submit').addEventListener('click', function () {
      var body = { reason: document.getElementById('cee-flag-reason').value, note: document.getElementById('cee-flag-note').value.trim() };
      api('/posts/' + postId + '/flag', { method: 'POST', body: body }).then(function (res) {
        var msg = document.getElementById('cee-flag-msg');
        if (!res.ok) { msg.className = 'cee-form-msg err'; msg.textContent = (res.data && res.data.error) || 'Could not flag.'; return; }
        msg.className = 'cee-form-msg ok'; msg.textContent = 'Thank you — flagged for review.';
        setTimeout(closeOverlay, 900);
      });
    });
    openOverlay();
  }
  function suggestPost(postId, btnEl) {
    if (!requireSignIn()) return;
    // Already suggested → the button is in its done state; nothing to do.
    if (btnEl && btnEl.classList.contains('done')) return;
    api('/posts/' + postId + '/suggest', { method: 'POST', body: { note: '' } }).then(function (res) {
      if (!res.ok) { showSuggestFeedback(false, res.data && res.data.error); return; }
      var p = findPost(postId);
      if (p) {
        p.suggestedForReview = true;
        if (!p.viewerSuggested) { p.viewerSuggested = true; p.suggestCount = (p.suggestCount || 0) + 1; }
      }
      if (btnEl) {
        btnEl.classList.add('done');
        btnEl.setAttribute('title', 'You suggested this for the Evidence Locker');
        btnEl.innerHTML = suggestInner(p || { viewerSuggested: true, suggestCount: 1 });
      }
      showSuggestFeedback(true);
    });
  }

  // Turn the detail-view suggest hint into a success / error confirmation so a
  // member gets clear feedback that their suggestion was submitted for review.
  function showSuggestFeedback(success, errMsg) {
    var el = document.getElementById('cee-suggest-msg');
    if (!el) return;
    if (success) {
      el.className = 'cee-suggest-hint ok';
      el.textContent = '✓ Submitted — thank you. A moderator will review this for the Evidence Locker.';
    } else {
      el.className = 'cee-suggest-hint err';
      el.textContent = errMsg || 'Could not submit your suggestion. Please try again.';
    }
  }

  // ── Moderation ───────────────────────────────────────────────────────
  var modTab = 'incoming';
  function loadModeration() {
    var body = document.getElementById('cee-mod-body');
    if (!body) return;
    body.innerHTML = '<p class="cee-empty">Loading queue…</p>';
    api('/moderation').then(function (res) {
      if (!res.ok) { body.innerHTML = '<p class="cee-empty">' + ((res.data && res.data.error) || 'Unavailable.') + '</p>'; return; }
      renderModeration(res.data);
    });
  }
  var modData = { incoming: [], leads: [], flagged: [], suggested: [] };
  function srcTypeLabel(key) {
    var s = SOURCE_TYPES.filter(function (x) { return x.key === key; })[0];
    return s ? s.label : key;
  }
  // Render the stored, non-binding AI triage inline in the queue. Advisory only —
  // it never changes state on its own; the moderator decides.
  function triageHtml(ai) {
    if (!ai || !ai.recommendation) {
      return '<div class="cee-ai-triage"><span class="cee-ai-pending">🤖 AI triage pending — use “Re-run AI triage”.</span></div>';
    }
    var rec = String(ai.recommendation).toLowerCase();
    var dupe = ai.duplicateOfId
      ? '<div class="cee-ai-dupe">⚠ Possible duplicate of post #' + esc(ai.duplicateOfId) + '</div>'
      : '';
    return '<div class="cee-ai-triage">' +
      '🤖 <span class="cee-ai-rec ' + esc(rec) + '">' + esc(rec.toUpperCase()) + '</span> ' +
      '<span style="opacity:0.8;">(confidence ' + Math.round((ai.confidence || 0) * 100) + '%)</span>' +
      (ai.summary ? '<br>' + esc(ai.summary) : '') +
      ((ai.reasons && ai.reasons.length) ? '<br>· ' + ai.reasons.map(esc).join('<br>· ') : '') +
      dupe +
      '<div class="cee-ai-note">Advisory only — not binding. A human moderator makes the call.</div>' +
    '</div>';
  }
  // ── Gap context for the moderator queue ─────────────────────────────────
  // A gap lead is only actionable if the moderator can see the two things the
  // reader saw: WHO it is about, and WHICH question it answers. Without them a
  // lead reads as an unattributed tip and gets skipped. Resolved the same way
  // gaps.js resolves a profile, so one missing roster entry degrades to the id
  // rather than throwing.
  function polNameFor(pid) {
    try { if (window.PROFILES && window.PROFILES[pid] && window.PROFILES[pid].name) return String(window.PROFILES[pid].name); } catch (e) {}
    try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid] && CMP_DATA[pid].name) return String(CMP_DATA[pid].name); } catch (e) {}
    return String(pid || '');
  }
  function gapContextHtml(p) {
    if (!p || p.kind !== 'lead') return '';
    // ONE OWNER OF "WHAT IS THIS PERSON'S URL". This used to be href="#profile-<id>",
    // a fragment with no handler anywhere in the codebase — a dead link on the
    // homepage and a deader one here. PDXPersonLink answers the question the rest
    // of the site asks it, and when it cannot (an id that is not a person, a
    // sentinel, a roster miss) the name still prints, unlinked, rather than
    // offering a click that goes nowhere.
    var pols = (p.linkedPoliticianIds || []).map(function (id) {
      var url = '';
      try { url = (window.PDXPersonLink && window.PDXPersonLink.href(id)) || ''; } catch (e) {}
      if (!url) return '<span class="cee-mod-gap-pol">👤 ' + esc(polNameFor(id)) + '</span>';
      return '<a class="cee-mod-gap-pol" href="' + esc(url) + '" title="Open this profile">👤 ' + esc(polNameFor(id)) + '</a>';
    }).join(' ');
    // No gap key means an Exchange-floor lead rather than a gap answer — say so
    // instead of printing an empty context strip.
    if (!p.gapKey && !pols) {
      return '<div class="cee-mod-gap cee-mod-gap-none">💡 General lead — not pinned to a coverage gap.</div>';
    }
    var g = (window.PDXGaps && window.PDXGaps.TYPES && window.PDXGaps.TYPES[p.gapType]) || null;
    return '<div class="cee-mod-gap">' +
      (pols || '') +
      (p.gapType ? ' <span class="cee-pill cee-pill-gap">◷ ' + esc((g && g.label) || String(p.gapType).replace(/_/g, ' ')) + '</span>' : '') +
      (p.gapKey ? '<div class="cee-mod-gap-key" title="The derived gap this lead answers">' + esc(p.gapKey) + '</div>' : '') +
    '</div>';
  }
  // The lead lifecycle controls. Research states only — none of them promotes,
  // grades or scores anything, and the copy under them says so, because the one
  // dangerous misreading of this row is "answered" meaning "now part of the
  // record". Promotion is still the separate, source-requiring button.
  var LEAD_ACTIONS = [
    { action: 'checking', label: '◍ Checking', title: 'You have picked this lead up and are chasing it down' },
    { action: 'answered', label: '✓ Answered', title: 'You followed it and got an answer. A research note — it does not enter the record or change any score.' },
    { action: 'dead_end', label: '⌀ Dead end', title: 'You followed it and there is nothing to document' }
  ];
  function leadActionsHtml(p) {
    if (!p || p.kind !== 'lead') return '';
    var btns = LEAD_ACTIONS.map(function (a) {
      var on = p.leadState === a.action;
      return '<button class="cee-btn cee-btn-ghost cee-lead-state' + (on ? ' on' : '') + '" ' +
        'data-mod="' + a.action + '" data-id="' + p.id + '" title="' + esc(a.title) + '"' +
        (on ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + a.label + '</button>';
    }).join('');
    return '<div class="cee-lead-actions">' +
      '<span class="cee-lead-actions-k">Research state</span>' + btns +
      '<button class="cee-btn cee-btn-ghost" data-dup="' + p.id + '" ' +
        'title="Mark this lead a duplicate of another post. It is hidden from the gap; Restore undoes it.">⧉ Duplicate of…</button>' +
      '<span class="cee-lead-actions-note">Research states only — none of these scores anything or adds to the record.</span>' +
    '</div>' +
    (p.dupOf ? '<div class="cee-mod-dup">⧉ Marked a duplicate of post #' + esc(p.dupOf) + '</div>' : '');
  }
  // The inline "Promote to Locker" panel: set the verified strength grade + a note,
  // then graduate the contribution with credit to its author.
  function promotePanel(p) {
    var sOpts = STRENGTHS.map(function (s) { return '<option value="' + s.key + '">' + esc(s.label) + '</option>'; }).join('');
    return '<div class="cee-promote" id="cee-promote-' + p.id + '">' +
      '<div style="font-size:0.78rem;color:#bbf7d0;margin-bottom:0.5rem;">Graduate this to the curated Evidence Locker, credited to <b>' + esc(p.authorName) + '</b>. Verify it against the writing standard and Evidence Strength first.</div>' +
      '<div class="cee-promote-row">' +
        '<div class="cee-field"><label>Strength grade</label><select class="cee-select" id="cee-promote-strength-' + p.id + '">' + sOpts + '</select></div>' +
        '<div class="cee-field" style="flex:2;"><label>Verification note (optional)</label><input class="cee-input" id="cee-promote-note-' + p.id + '" maxlength="1000" placeholder="Why it qualifies / what you checked."></div>' +
      '</div>' +
      '<div class="cee-mod-actions" style="margin-top:0.6rem;">' +
        '<button class="cee-btn cee-btn-gold" data-promote-confirm="' + p.id + '">✓ Promote with credit</button>' +
        '<button class="cee-btn cee-btn-ghost" data-promote-cancel="' + p.id + '">Cancel</button>' +
      '</div>' +
    '</div>';
  }
  // The inline "Duplicate of…" panel. Same open/confirm/cancel shape as the
  // promote panel so the queue has one interaction model. The AI's advisory guess
  // pre-fills the field when it has one — a starting point, never the decision.
  function dupPanel(p) {
    var pre = (p.ai && p.ai.duplicateOfId) ? String(p.ai.duplicateOfId) : '';
    return '<div class="cee-promote cee-dup-panel" id="cee-dup-' + p.id + '">' +
      '<div style="font-size:0.78rem;color:#cbd5e1;margin-bottom:0.5rem;">Mark this a duplicate of an existing post. It is hidden from the gap and the public list; <b>Restore</b> undoes both.</div>' +
      '<div class="cee-promote-row">' +
        '<div class="cee-field"><label>Duplicate of post #</label>' +
          '<input class="cee-input" id="cee-dup-of-' + p.id + '" inputmode="numeric" maxlength="12" placeholder="e.g. 214" value="' + esc(pre) + '"></div>' +
      '</div>' +
      '<div class="cee-mod-actions" style="margin-top:0.6rem;">' +
        '<button class="cee-btn cee-btn-ghost" data-dup-confirm="' + p.id + '">⧉ Mark duplicate</button>' +
        '<button class="cee-btn cee-btn-ghost" data-dup-cancel="' + p.id + '">Cancel</button>' +
      '</div>' +
      '<p class="cee-dup-msg" id="cee-dup-msg-' + p.id + '"></p>' +
    '</div>';
  }
  function renderModeration(d) {
    modData = d;
    var items = modData[modTab] || [];
    var body = document.getElementById('cee-mod-body');
    var emptyMsg = modTab === 'incoming'
      ? 'No new evidence awaiting review. 🎉'
      : (modTab === 'leads'
      ? 'No open research leads. Every gap lead has been answered, marked a dead end or filed as a duplicate. 🎉'
      : 'Nothing in the ' + modTab + ' queue.');
    if (!items.length) { body.innerHTML = '<p class="cee-empty">' + emptyMsg + '</p>'; return; }
    body.innerHTML = items.map(function (it) {
      var p = it.post;
      var detail = '';
      if (modTab === 'flagged') {
        detail = '<div class="cee-mod-reasons">🚩 ' + (it.flags || []).map(function (f) { return esc(f.reason) + (f.note ? ' — ' + esc(f.note) : ''); }).join(' · ') + '</div>';
      } else if (modTab === 'suggested') {
        detail = '<div class="cee-mod-reasons" style="color:#f5c842;">⭐ ' + (it.suggestions || []).length + ' suggestion(s)' + ((it.suggestions || [])[0] && it.suggestions[0].note ? ' — ' + esc(it.suggestions[0].note) : '') + '</div>';
      }
      // Promotion is only offered once the post is still active (not removed) and
      // carries a source — the curated record never takes an unsourced claim.
      var canPromote = p.status !== 'removed' && p.status !== 'imported' && !!p.sourceUrl;
      var promoteBtn = p.status === 'imported'
        ? '<span class="cee-pill cee-pill-imported">✓ In Evidence Locker</span>'
        : (canPromote ? '<button class="cee-btn cee-btn-gold" data-promote="' + p.id + '">⭐ Promote to Locker</button>' : '');
      var removeBtn = p.status === 'removed'
        ? '<button class="cee-btn cee-btn-ghost" data-mod="restore" data-id="' + p.id + '">↩ Restore</button>'
        : '<button class="cee-btn cee-btn-ghost" data-mod="remove" data-id="' + p.id + '">🗑 Remove</button>';
      var extraBtns = modTab === 'flagged'
        ? '<button class="cee-btn cee-btn-ghost" data-mod="resolve_flags" data-id="' + p.id + '">✓ Resolve flags</button>'
        : (modTab === 'suggested' ? '<button class="cee-btn cee-btn-ghost" data-mod="dismiss_suggestion" data-id="' + p.id + '">Dismiss</button>' : '');
      var srcLine = p.sourceUrl
        ? '<a class="cee-source" href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener noreferrer">🔗 ' + esc(p.sourceUrl) + '</a>' +
          (p.sourceType ? ' <span class="cee-chip">' + esc(srcTypeLabel(p.sourceType)) + '</span>' : '')
        : '<span style="color:#fca5a5;font-size:0.76rem;">No source link</span>';
      return '<div class="cee-mod-item">' +
        '<div class="cee-card-top" style="margin-bottom:0.35rem;">' + kindPill(p.kind) +
          leadStatePill(p) +
          (p.categoryKey ? '<span class="cee-pill cee-pill-cat">' + esc(catLabel(p.categoryKey)) + '</span>' : '') + '</div>' +
        gapContextHtml(p) +
        '<div style="font-weight:700;color:#eaf1fb;">' + esc(p.headline) + '</div>' +
        '<div class="cee-meta">by ' + esc(p.authorName) + ' · ' + ago(p.createdAt) + ' · status: ' + esc(p.status) + '</div>' +
        (p.summary ? '<div class="cee-summary" style="font-size:0.82rem;">' + esc(truncate(p.summary, 220)) + '</div>' : '') +
        '<div style="margin:0.35rem 0;">' + srcLine + '</div>' +
        detail +
        triageHtml(p.ai) +
        leadActionsHtml(p) +
        '<div class="cee-mod-actions">' + promoteBtn + removeBtn + extraBtns +
          '<button class="cee-btn cee-btn-ghost" data-ai="' + p.id + '">🤖 Re-run AI triage</button></div>' +
        promotePanel(p) +
        dupPanel(p) +
        '<div class="cee-ai-box" id="cee-ai-' + p.id + '"></div>' +
      '</div>';
    }).join('');
  }
  // A moderation call that changed a lead has to reach the profile too, or the
  // gap panel keeps serving its cached copy and the moderator's decision is
  // invisible where readers actually see it. gaps.js busts _leadCache on this
  // event and re-fetches.
  function announceLeadChange(post) {
    try {
      var ids = (post && post.linkedPoliticianIds) || [];
      for (var i = 0; i < ids.length; i++) {
        window.dispatchEvent(new CustomEvent('pdx-gap-lead-updated', {
          detail: { pid: ids[i], gapKey: (post && post.gapKey) || null }
        }));
      }
    } catch (e) {}
  }
  // Find the queue item a moderation action was fired from, so the follow-up
  // knows which profile to refresh without a second round trip.
  function modPostById(id) {
    var lists = ['incoming', 'leads', 'flagged', 'suggested'];
    for (var i = 0; i < lists.length; i++) {
      var arr = modData[lists[i]] || [];
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].post && arr[j].post.id === id) return arr[j].post;
      }
    }
    return null;
  }
  function doModerate(id, action) {
    var post = modPostById(id);
    api('/posts/' + id + '/moderate', { method: 'POST', body: { action: action } }).then(function (res) {
      // Surface a refusal instead of swallowing it: the lead-state and duplicate
      // actions fail closed with a reason, and a silently ignored click reads as
      // a broken button.
      if (!res.ok) { alert((res.data && res.data.error) || 'Could not apply that action.'); return; }
      announceLeadChange(post);
      loadModeration(); loadList();
    });
  }
  function openPromote(id) {
    var el = document.getElementById('cee-promote-' + id);
    if (el) el.classList.add('open');
  }
  function closePromote(id) {
    var el = document.getElementById('cee-promote-' + id);
    if (el) el.classList.remove('open');
  }
  function doPromote(id) {
    var sSel = document.getElementById('cee-promote-strength-' + id);
    var nInp = document.getElementById('cee-promote-note-' + id);
    var body = { action: 'promote', strength: sSel ? sSel.value : 'moderate', note: nInp ? nInp.value.trim() : '' };
    api('/posts/' + id + '/moderate', { method: 'POST', body: body }).then(function (res) {
      if (res.ok) { loadModeration(); loadList(); loadGraduated(); }
      else { alert((res.data && res.data.error) || 'Could not promote.'); }
    });
  }
  function openDup(id) {
    var el = document.getElementById('cee-dup-' + id);
    if (el) el.classList.add('open');
  }
  function closeDup(id) {
    var el = document.getElementById('cee-dup-' + id);
    if (el) el.classList.remove('open');
  }
  function doMarkDuplicate(id) {
    var inp = document.getElementById('cee-dup-of-' + id);
    var msg = document.getElementById('cee-dup-msg-' + id);
    var raw = inp ? inp.value.trim() : '';
    var n = parseInt(raw, 10);
    // Client-side check purely so a typo does not need a round trip. The server
    // re-validates everything and is the one that decides.
    if (!raw || !isFinite(n) || n <= 0) {
      if (msg) msg.textContent = 'Enter the post number this duplicates.';
      return;
    }
    if (n === id) {
      if (msg) msg.textContent = 'A post cannot duplicate itself.';
      return;
    }
    var post = modPostById(id);
    api('/posts/' + id + '/moderate', { method: 'POST', body: { action: 'mark_duplicate', dupOf: n } })
      .then(function (res) {
        if (!res.ok) {
          if (msg) msg.textContent = (res.data && res.data.error) || 'Could not mark that duplicate.';
          return;
        }
        announceLeadChange(post);
        closeDup(id); loadModeration(); loadList();
      });
  }
  function doAiReview(id) {
    var box = document.getElementById('cee-ai-' + id);
    if (box) { box.style.display = 'block'; box.textContent = '🤖 Analyzing…'; }
    api('/posts/' + id + '/ai-review', { method: 'POST', body: {} }).then(function (res) {
      if (!box) return;
      if (!res.ok || !res.data.ai) { box.textContent = (res.data && res.data.error) || 'AI review unavailable.'; return; }
      var ai = res.data.ai;
      box.innerHTML = '🤖 <b>' + esc((ai.recommendation || 'review').toUpperCase()) + '</b> ' +
        '(confidence ' + Math.round((ai.confidence || 0) * 100) + '%)<br>' +
        esc(ai.summary || '') +
        ((ai.reasons && ai.reasons.length) ? '<br>· ' + ai.reasons.map(esc).join('<br>· ') : '') +
        (ai.duplicateOfId ? '<br><span style="color:#fca5a5;">⚠ Possible duplicate of #' + esc(ai.duplicateOfId) + '</span>' : '');
      // Refresh the queue shortly so the stored triage chip updates too.
      setTimeout(loadModeration, 600);
    });
  }

  // ── Graduated credit wall (public) ─────────────────────────────────────
  function strengthPill(s) {
    var k = (s || 'moderate').toLowerCase();
    var lbl = (STRENGTHS.filter(function (x) { return x.key === k; })[0] || { label: k }).label;
    return '<span class="cee-strength cee-strength-' + esc(k) + '">' + esc(lbl) + '</span>';
  }
  function loadGraduated() {
    var wrap = document.getElementById('cee-grad');
    var grid = document.getElementById('cee-grad-grid');
    if (!wrap || !grid) return;
    api('/promoted').then(function (res) {
      var items = (res.ok && res.data && res.data.promoted) || [];
      if (!items.length) { wrap.style.display = 'none'; return; }
      grid.innerHTML = items.map(function (g) {
        return '<div class="cee-grad-card">' +
          '<div class="cee-grad-card-top">' + kindPill(g.kind) + strengthPill(g.strength) +
            (g.categoryKey ? '<span class="cee-pill cee-pill-cat">' + esc(catLabel(g.categoryKey)) + '</span>' : '') + '</div>' +
          '<div class="cee-grad-hl">' + esc(g.headline) + '</div>' +
          '<div class="cee-grad-credit">🙌 Contributed by <b>' + esc(g.contributorName) + '</b></div>' +
          (g.sourceUrl ? '<div style="margin-top:0.4rem;"><a class="cee-grad-src" href="' + esc(g.sourceUrl) + '" target="_blank" rel="noopener noreferrer">🔗 Source</a></div>' : '') +
        '</div>';
      }).join('');
      wrap.style.display = 'block';
    }).catch(function () { wrap.style.display = 'none'; });
  }

  // ── Overlay plumbing ───────────────────────────────────────────────────
  function openOverlay() { document.getElementById('cee-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeOverlay() { document.getElementById('cee-overlay').classList.remove('open'); document.body.style.overflow = ''; detailOpenId = null; replyTo = null; composeGap = null; }

  function syncTabs() {
    document.querySelectorAll('#cee-tabs .cee-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-sort') === state.sort);
    });
  }

  // ── Wiring (event delegation keeps it contained) ────────────────────────
  function wire() {
    // Category filter dropdown.
    var sel = document.getElementById('cee-cat-filter');
    sel.innerHTML = '<option value="">All categories</option>' + coreIssues().map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.label) + '</option>';
    }).join('');
    sel.addEventListener('change', function () { state.category = sel.value; loadList(); });

    document.getElementById('cee-tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.cee-tab'); if (!t) return;
      state.sort = t.getAttribute('data-sort'); syncTabs(); loadList();
    });
    document.getElementById('cee-new-btn').addEventListener('click', openCompose);

    // Delegated clicks across the whole section + overlay.
    document.getElementById('community-exchange').addEventListener('click', function (e) {
      var t = e.target;
      var locker = t.closest('[data-locker-issue]'); if (locker) { e.preventDefault(); openLocker(locker.getAttribute('data-locker-issue')); return; }
      var react = t.closest('[data-react]'); if (react) { toggleReaction(+react.getAttribute('data-post'), react.getAttribute('data-react')); return; }
      var open = t.closest('[data-open]'); if (open) { openDetail(+open.getAttribute('data-open')); return; }
      var flag = t.closest('[data-flag]'); if (flag) { openFlag(+flag.getAttribute('data-flag')); return; }
      var sug = t.closest('[data-suggest]'); if (sug) { suggestPost(+sug.getAttribute('data-suggest'), sug); return; }
      var reply = t.closest('[data-reply]'); if (reply) { setReply(+reply.getAttribute('data-reply'), reply.getAttribute('data-name')); return; }
      if (t.closest('[data-close]')) { closeOverlay(); return; }
      if (t.closest('[data-clear-issue]')) { state.issue = ''; state.issueLabel = ''; state.polContext = ''; state.gap = null; loadList(); return; }
      var mod = t.closest('[data-mod]'); if (mod) { doModerate(+mod.getAttribute('data-id'), mod.getAttribute('data-mod')); return; }
      var promote = t.closest('[data-promote]'); if (promote) { openPromote(+promote.getAttribute('data-promote')); return; }
      var promoteOk = t.closest('[data-promote-confirm]'); if (promoteOk) { doPromote(+promoteOk.getAttribute('data-promote-confirm')); return; }
      var promoteNo = t.closest('[data-promote-cancel]'); if (promoteNo) { closePromote(+promoteNo.getAttribute('data-promote-cancel')); return; }
      var dup = t.closest('[data-dup]'); if (dup) { openDup(+dup.getAttribute('data-dup')); return; }
      var dupOk = t.closest('[data-dup-confirm]'); if (dupOk) { doMarkDuplicate(+dupOk.getAttribute('data-dup-confirm')); return; }
      var dupNo = t.closest('[data-dup-cancel]'); if (dupNo) { closeDup(+dupNo.getAttribute('data-dup-cancel')); return; }
      var ai = t.closest('[data-ai]'); if (ai) { doAiReview(+ai.getAttribute('data-ai')); return; }
      var mt = t.closest('[data-modtab]'); if (mt) {
        modTab = mt.getAttribute('data-modtab');
        ['incoming', 'leads', 'flagged', 'suggested'].forEach(function (tab) {
          var el = document.getElementById('cee-mod-tab-' + tab);
          if (el) el.classList.toggle('active', modTab === tab);
        });
        renderModeration(modData); return;
      }
    });
    document.getElementById('cee-mod-refresh').addEventListener('click', loadModeration);
    // Click outside the modal closes it.
    document.getElementById('cee-overlay').addEventListener('click', function (e) { if (e.target.id === 'cee-overlay') closeOverlay(); });

    // Moderator queue auto-loads for the site owner once auth resolves.
    function maybeLoadMod() { if (isModerator()) loadModeration(); }
    maybeLoadMod();
    try { if (typeof auth !== 'undefined' && auth && auth.onAuthStateChanged) auth.onAuthStateChanged(function () { maybeLoadMod(); }); } catch (e) {}
  }

  function init() {
    if (initialized) return; initialized = true;
    wire();
    loadList();
    loadGraduated();
  }

  // ── Bridge to the curated Evidence Locker ──────────────────────────────
  // A deliberately small, read-only surface the Evidence Locker uses to (a)
  // discover whether any community discussion exists for an evidence item's
  // issue, and (b) jump here pre-filtered to it. Nothing flows the other way:
  // community posts are never embedded or pulled into the Locker.
  var _issueIndexP = null;
  // Resolve once to a { issueKey: postCount } map across all active posts.
  // Cached for the page's lifetime (invalidated when a new post is created),
  // so the Locker can check many cards from a single network read.
  function issuesWithPosts() {
    if (_issueIndexP) return _issueIndexP;
    _issueIndexP = api('/posts?sort=newest').then(function (res) {
      var counts = {};
      if (res.ok && res.data && res.data.posts) {
        res.data.posts.forEach(function (p) {
          (p.issueKeys || []).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
        });
      }
      return counts;
    }).catch(function () { return {}; });
    return _issueIndexP;
  }

  // ── Forward bridge: this post → the curated Evidence Locker ────────────
  // The inverse of issuesWithPosts. A read-only check against the Locker's
  // already-loaded in-memory index (window._pdxEvidenceOnRecord, which returns
  // the politicians on record for a set of issue keys, or null until the
  // library has loaded). No network cost and nothing is embedded — we only
  // decide whether to reveal a deep-link. Conservative by construction: an
  // unknown (not-yet-loaded) answer keeps the link hidden until we can confirm
  // real evidence exists.
  var _lockerEvCache = Object.create(null);
  function issueHasLockerEvidence(key) {
    if (!key || typeof window._pdxEvidenceOnRecord !== 'function') return null;
    if (key in _lockerEvCache) return _lockerEvCache[key];
    var ids = window._pdxEvidenceOnRecord([key]);
    if (ids == null) return null;            // library not loaded yet — unknown
    var has = ids.length > 0;
    _lockerEvCache[key] = has;               // cache only confirmed reads
    return has;
  }
  // First of a post's issues that the Locker actually holds evidence for.
  function firstLockerIssue(keys) {
    keys = keys || [];
    for (var i = 0; i < keys.length; i++) {
      if (issueHasLockerEvidence(keys[i]) === true) return keys[i];
    }
    return null;
  }
  // Reveal the "View in Evidence Locker" links whose post has confirmed curated
  // evidence, stamping the chosen issue + label for the click handler. Idempotent
  // and cheap, so it's safe to re-run on every render and when the Locker loads.
  function enhanceLockerLinks(root) {
    if (typeof window._pdxEvidenceOnRecord !== 'function') return;
    root = root || document.getElementById('community-exchange');
    if (!root) return;
    var nodes = root.querySelectorAll('.cee-locker-link[data-locker-issues]');
    Array.prototype.forEach.call(nodes, function (el) {
      var keys = (el.getAttribute('data-locker-issues') || '').split(',').filter(Boolean);
      var hit = firstLockerIssue(keys);
      var badge = el.querySelector('.cee-locker-count');
      if (hit) {
        el.setAttribute('data-locker-issue', hit);
        el.setAttribute('data-locker-label', issueLabel(hit));
        // Light context: how many curated receipts back this issue. Read straight
        // from the Locker's already-loaded in-memory index (no network cost,
        // nothing embedded) and only shown when the count is known and positive.
        if (badge) {
          var ids = window._pdxEvidenceOnRecord([hit]);
          var n = ids ? ids.length : 0;
          if (n > 0) {
            badge.textContent = n + (n === 1 ? ' receipt' : ' receipts');
            badge.hidden = false;
          } else {
            badge.hidden = true;
          }
        }
        el.hidden = false;
      } else {
        if (badge) badge.hidden = true;
        el.hidden = true;
      }
    });
  }
  // Close the Exchange overlay (if open) and open the Locker deep-linked to the
  // post's issue. THE LOCKER IS A DOCUMENT NOW, at /evidence, and its real
  // deep-link is the query evidence-locker.js's _queryOpts() reads. The old
  // in-page call is still tried first because it is still the right answer on any
  // document that mounts the workspace itself; on /community nothing does, so the
  // navigation is what actually runs. Either way the link leads somewhere, which
  // is the whole difference from returning on a missing global.
  function openLocker(issueKey) {
    if (!issueKey) return;
    try { closeOverlay(); } catch (e) {}
    if (typeof window._pdxOpenEvidenceLocker === 'function') {
      try { window._pdxOpenEvidenceLocker({ issue: issueKey }); return; } catch (e) {}
    }
    try { location.assign('/evidence?issue=' + encodeURIComponent(issueKey)); } catch (e) {}
  }
  // The Locker loads lazily and re-fires this event whenever its index grows;
  // re-check every rendered link so they appear as soon as evidence is known.
  document.addEventListener('pdx-evidence-ready', function () {
    _lockerEvCache = Object.create(null);
    enhanceLockerLinks();
  });

  window.PDXCommunity = {
    issuesWithPosts: issuesWithPosts,
    // Open the Exchange filtered to a single issue (reuses the ?issue= filter).
    // `polName` (optional) carries a politician as light context for the
    // "Suggest a receipt" on-ramps — it reframes the contextual banner without
    // any new filter or request. `issueKey` may be empty (thin-profile case):
    // the Exchange then opens scoped only to that politician's context.
    openForIssue: function (issueKey, label, polName) {
      if (!issueKey && !polName) return;
      var wasInit = initialized;
      state.issue = issueKey || '';
      state.issueLabel = issueKey ? (label || issueLabel(issueKey)) : '';
      state.polContext = polName || '';
      state.category = '';
      state.sort = 'trending';
      var sel = document.getElementById('cee-cat-filter'); if (sel) sel.value = '';
      if (!wasInit) { init(); } // wire()+loadList() pick up state.issue on first open
      syncTabs();
      if (wasInit) loadList();
      try { if (location.hash !== '#community-exchange') location.hash = '#community-exchange'; } catch (e) {}
      var section = document.getElementById('community-exchange');
      if (section && section.scrollIntoView) { try { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
    },
    // Sibling of openForIssue, for a derived coverage gap (see gaps.js). Opens
    // the Suggest-a-lead composer locked to this politician + gap, and narrows
    // the list behind it to the leads already suggested for the same gap so the
    // submitter can see what has been said before adding to it.
    //   gap  — a PDXGaps gap object: { key, type, pid, polName, label, detail,
    //          ask, issueKey, issueLabel, askable }
    //   opts — { compose:false } to jump to the list without the form,
    //          { openPostId } to open one lead's detail.
    openForGap: function (gap, opts) {
      if (!gap || !gap.pid || !gap.type || !gap.key) return;
      // Explain-only gaps are our own method working as designed. They are never
      // an ask, so they can never open a composer.
      if (gap.askable === false) return;
      opts = opts || {};
      var wasInit = initialized;
      state.gap = gap;
      state.issue = gap.issueKey || '';
      state.issueLabel = gap.issueLabel || '';
      state.polContext = gap.polName || '';
      state.category = '';
      state.sort = 'newest';
      var sel = document.getElementById('cee-cat-filter'); if (sel) sel.value = '';
      if (!wasInit) { init(); }
      syncTabs();
      if (wasInit) loadList();
      try { if (location.hash !== '#community-exchange') location.hash = '#community-exchange'; } catch (e) {}
      var sec = document.getElementById('community-exchange');
      if (sec && sec.scrollIntoView) { try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
      if (opts.openPostId) { openDetail(+opts.openPostId); return; }
      if (opts.compose === false) return;
      composeGap = gap;
      openCompose();
      // requireSignIn() sends a signed-out visitor to the auth modal instead of
      // the form; drop the lock so a later unrelated compose is not gap-bound.
      if (!document.getElementById('cee-f-headline')) composeGap = null;
    }
  };

  // ── THE HANDOFF — THE OTHER HALF OF community-link.js ──────────────────
  // openForIssue and openForGap used to be same-page calls from gaps.js,
  // evidence-locker.js, profiles-full.js and stance-library.js. /community is a
  // document now, so the intent has to survive a navigation. It travels two ways
  // and they answer two different questions:
  //
  //   THE QUERY IS THE SHAREABLE ONE. /community?issue=<key> is an address a
  //   reader can paste, bookmark, or land on from a cold tab. It carries only
  //   what a stranger is allowed to be handed: which issue to filter to, and
  //   optionally which post to open.
  //
  //   sessionStorage CARRIES THE RICH ONE. A coverage gap is an object — pid,
  //   type, key, labels, askable — and it is not a URL shape we want to publish,
  //   because a gap key in a link is a promise about a private derivation we do
  //   not make. It is written immediately before the navigation, read once here,
  //   and DELETED on read, so a stale intent cannot reopen a composer on the
  //   reader's next visit.
  //
  // NEITHER ONE INVENTS A FILTER THE ROOM DID NOT ALREADY HAVE. state.issue,
  // state.gap and openDetail() are the same three things the in-page calls set.
  var HANDOFF_KEY = 'pdx_community_open';
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
  function takeHandoff() {
    var h = readHandoff();
    if (h && h.kind === 'gap' && h.gap) {
      // Same guard the in-page caller had: an explain-only gap is our own method
      // working as designed, never an ask, so it can never open a composer.
      if (h.gap.askable === false) return false;
      state.gap = h.gap;
      state.issue = h.gap.issueKey || '';
      state.issueLabel = h.gap.issueLabel || '';
      state.polContext = h.gap.polName || '';
      state.sort = 'newest';
      pendingOpen = (h.opts && h.opts.openPostId) ? +h.opts.openPostId : 0;
      pendingCompose = !(h.opts && h.opts.compose === false) && !pendingOpen;
      return true;
    }
    if (h && h.kind === 'issue') {
      state.issue = h.issue || '';
      state.issueLabel = h.issue ? (h.label || issueLabel(h.issue)) : '';
      state.polContext = h.pol || '';
      state.sort = 'trending';
      return true;
    }
    // No stashed intent: fall back to the query, which is the address form.
    var qIssue = queryParam('issue');
    if (qIssue) {
      state.issue = qIssue;
      state.issueLabel = queryParam('label') || issueLabel(qIssue);
      state.sort = 'trending';
    }
    var qPost = +queryParam('post');
    if (qPost) pendingOpen = qPost;
    return !!(qIssue || qPost);
  }
  // Deferred until after the first list load, because openDetail() and the
  // composer both read from a rendered list.
  var pendingOpen = 0;
  var pendingCompose = false;
  function drainPending() {
    // A post detail is its own fetch and needs neither the list nor a session, so
    // it opens on the spot.
    if (pendingOpen) { var id = pendingOpen; pendingOpen = 0; try { openDetail(id); } catch (e) {} return; }
    if (!pendingCompose) return;
    pendingCompose = false;
    // THE COMPOSER WAITS FOR AN ANSWER ABOUT THE SESSION, AND "UNKNOWN" IS NOT
    // "SIGNED OUT". On the homepage this path only ever ran from a click, so
    // Firebase had long since answered. Arriving cold at /community, the deferred
    // 800 KB SDK has not landed when this line runs, and requireSignIn() reading
    // a null auth.currentUser would send a returning member to a sign-in prompt
    // they do not need. So we ask once the answer exists. The shell's stub queues
    // the registration and self-heals with null after five seconds, so this fires
    // exactly once either way and never hangs.
    function open() {
      composeGap = state.gap;
      try { openCompose(); } catch (e) {}
      // requireSignIn() sends a signed-out visitor to the auth seam instead of
      // the form; drop the lock so a later unrelated compose is not gap-bound.
      if (!document.getElementById('cee-f-headline')) composeGap = null;
    }
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

  // THIS SECTION IS NOT LAZY ANY MORE, AND THAT IS THE POINT OF THE ROOM. On the
  // homepage it sat two thousand lines below the fold, so an IntersectionObserver
  // was the honest way to avoid paying for a board nobody had scrolled to. On
  // /community it is the reason the reader typed the address, so it initialises
  // on the spot. The observer branch is kept for the case where the section is
  // absent from the document — which cannot happen here, and costs one guard to
  // stay true anyway.
  function setup() {
    var section = document.getElementById('community-exchange');
    if (!section) return;
    takeHandoff();
    syncTabs();
    init();
    // loadList() is async; the first render is what pendingOpen/pendingCompose
    // need, so drain after a turn rather than racing it.
    setTimeout(drainPending, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  window.addEventListener('hashchange', function () { if (location.hash === '#community-exchange') init(); });
})();
