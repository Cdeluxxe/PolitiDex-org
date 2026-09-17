/* ══════════════════════════════════════════════════════════════════════════════
   community-link.js — ONE OWNER OF "WHERE IS COMMUNITY, AND HOW DO I GET THERE".
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS WRONG. The Community Evidence Exchange and the Open Discussion board
   were two sections of index.html, so "open the Exchange filtered to this issue"
   was a function call and "discuss this" was a fragment. Six modules had learned
   that shape — gaps.js, evidence-locker.js, profiles-full.js, spotlight-engine.js,
   stance-library.js and digital-library.js — and each of them carried its own
   fallback line, `location.hash = '#community-exchange'`, for the case where the
   object was absent. Those two rooms are a document now, at /community. Every one
   of those call sites still asks the same question; this file is the only thing
   that answers it, and it answers with an address.

   WHAT IT IS. A shim that publishes window.PDXCommunity and window.PDXForum with
   the same method names the in-page controllers published, so not one caller had
   to change its shape. The difference is what the methods do: they hand the
   intent to /community and navigate, instead of scrolling to a section that is
   no longer under them.

   IT IS NOT LOADED ON THE ROOM. community.html declares __PDX_COMMUNITY_DOC and
   does not link this file; there, the real controllers publish the real objects
   and the real objects scroll, because there the sections genuinely are under the
   reader. The guard below is belt and braces for the day someone links both.

   HOW THE INTENT TRAVELS, AND WHY IT TRAVELS TWICE.
     · THE QUERY IS THE PUBLIC HALF. /community?issue=<key> is an address: it can
       be pasted, bookmarked, shared, and arrived at from a cold tab with no
       session and no prior page. It carries only what a stranger may be handed.
     · sessionStorage IS THE PRIVATE HALF. A coverage gap is an object — pid,
       type, key, labels, askable — and publishing a gap key in a URL would be a
       promise about a derivation we do not make. It is written immediately
       before the navigation, read once by community-exchange.js, and deleted on
       read, so an abandoned intent cannot reopen a composer days later.

   WHAT IT DELIBERATELY DOES NOT DO.
     · NO SCORE, NO RANK, NO TALLY ON THE FRONT PAGE. issuesWithPosts() is kept
       because the Evidence Locker's per-issue activity tags and spotlight's
       cross-link have always used it, and it answers one honest question — "is
       there a conversation about this issue" — from one cached read. It is not a
       ranking input and nothing multiplies it by anything.
     · NO SECOND VOCABULARY. The issue keys, labels and gap objects are whatever
       the caller already had. This file introduces no key of its own.
     · NO NEW URL SHAPE. /community, /community?issue=, /community?topic= and the
       two section fragments are the whole surface, and netlify.toml serves the
       first of those at status 200 from an exact pair plus one /community/*
       splat, so a stray trailing segment lands on the room instead of a 404.
       No caller here emits a deeper path; the splat exists for hand-typed and
       historical addresses only.
   ════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // On /community itself the controllers own these names. Never shadow them.
  if (window.__PDX_COMMUNITY_DOC) return;

  var ROOM = '/community';
  var EXCHANGE_KEY = 'pdx_community_open';
  var FORUM_KEY = 'pdx_forum_open';

  function stash(key, obj) {
    try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }
  // location.assign, then href, then replace — the same three-step the other
  // shells' seams use, because an assign blocked by a sandbox should still leave
  // the reader somewhere rather than on a control that did nothing.
  function go(to) {
    try { location.assign(to); return; } catch (e) {}
    try { location.href = to; return; } catch (e) {}
    try { location.replace(to); } catch (e) {}
  }
  function q(v) { return encodeURIComponent(String(v == null ? '' : v)); }

  // ── The one cached read of "which issues have a conversation" ────────────
  // Unchanged in behaviour from the copy that lived inside the Exchange
  // controller: one GET, resolved once, shared by every caller on the page. The
  // Locker checks many cards against it without a request per card. A failure
  // resolves to an empty map, so a card shows no tag rather than an error.
  var _issueIndexP = null;
  function issuesWithPosts() {
    if (_issueIndexP) return _issueIndexP;
    _issueIndexP = fetch('/api/community/posts?sort=newest', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var counts = {};
        var posts = (data && data.posts) || [];
        posts.forEach(function (p) {
          (p.issueKeys || []).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
        });
        return counts;
      })
      .catch(function () { return {}; });
    return _issueIndexP;
  }

  window.PDXCommunity = {
    href: function (issueKey) { return issueKey ? ROOM + '?issue=' + q(issueKey) : ROOM; },
    issuesWithPosts: issuesWithPosts,
    // Open the Exchange scoped to one issue, optionally with a politician as
    // light context for the "Suggest a receipt" on-ramps. Either may be empty —
    // the thin-profile case passes only a name — but not both.
    openForIssue: function (issueKey, label, polName) {
      if (!issueKey && !polName) return;
      stash(EXCHANGE_KEY, { kind: 'issue', issue: issueKey || '', label: label || '', pol: polName || '' });
      go(issueKey ? ROOM + '?issue=' + q(issueKey) : ROOM);
    },
    // Sibling of openForIssue, for a derived coverage gap (see gaps.js). The
    // askable guard is the caller-side copy of the room's own: an explain-only
    // gap is our method working as designed, never an ask, so it never opens a
    // composer and therefore never justifies a navigation either.
    openForGap: function (gap, opts) {
      if (!gap || !gap.pid || !gap.type || !gap.key) return;
      if (gap.askable === false) return;
      stash(EXCHANGE_KEY, { kind: 'gap', gap: gap, opts: opts || {} });
      go(gap.issueKey ? ROOM + '?issue=' + q(gap.issueKey) : ROOM);
    }
  };

  window.PDXForum = {
    href: function (topic) { return (topic ? ROOM + '?topic=' + q(topic) : ROOM) + '#open-forum'; },
    openForTopic: function (topic) {
      stash(FORUM_KEY, { kind: 'topic', topic: topic || '' });
      go((topic ? ROOM + '?topic=' + q(topic) : ROOM) + '#open-forum');
    },
    // Start a new thread referencing an app item: type + human label + optional
    // href. The label and the reference are the reason this one needs the stash:
    // they are free text belonging to whatever the reader was looking at, and a
    // URL is the wrong place for either.
    startThreadFor: function (type, label, ref, topic) {
      stash(FORUM_KEY, { kind: 'thread', topic: topic || '', link: { type: type || 'other', label: label || '', ref: ref || '' } });
      go((topic ? ROOM + '?topic=' + q(topic) : ROOM) + '#open-forum');
    }
  };
})();
