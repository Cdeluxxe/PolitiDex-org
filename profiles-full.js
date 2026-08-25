// ─────────────────────────────────────────────────────────────────────────────
// Full politician profiles (PROFILES population)
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 22346 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // FULL POLITICIAN PROFILES
    // ════════════════════════════════════════════════════════════
  // FULL POLITICIAN PROFILES (Dynamically loaded)
  // ════════════════════════════════════════════════════════════
  // PROFILES is now defined at the top of the file as an empty object
  // and dynamically populated from Firestore.

  // ════════════════════════════════════════════════════════════
  // ONE ACCESSOR FOR A RECORD'S SIGNATURE ISSUES
  // ────────────────────────────────────────────────────────────
  // A roster record stores this list under `issues`; Firestore-backed and
  // admin-authored records store it under `keyIssues`. Both spellings are real
  // and both are in use, so every read has to accept either. Reading only one
  // of them is why the profile's 🎯 Key Issues section rendered blank for the
  // entire static roster: all 756 CMP_DATA records carry `issues`, none carry
  // `keyIssues`, and the section gated on `p.keyIssues && p.keyIssues.length`.
  //
  // `issues` wins when both are present, matching the precedence the page shell
  // already uses (`p.issues || p.keyIssues`). Always returns an array so callers
  // can `.length` / `.map` / `.slice` without their own guard.
  // ════════════════════════════════════════════════════════════
  window._pdxKeyIssues = function (p) {
    if (!p) return [];
    if (Array.isArray(p.issues) && p.issues.length) return p.issues;
    if (Array.isArray(p.keyIssues) && p.keyIssues.length) return p.keyIssues;
    return [];
  };

  // ════════════════════════════════════════════════════════════
  // POPULATE DIR_DATA FROM PROFILES (dynamic — picks up all entries)
  // ════════════════════════════════════════════════════════════
  window._populateDirData = function() {
    // Build the public directory from the de-duplicated, stub-free view so
    // the same person never appears twice and empty placeholders are hidden.
    // (Admin tools still read raw PROFILES — see window._cleanProfiles.)
    var _dirProfiles = (typeof window._cleanProfiles === 'function')
      ? window._cleanProfiles().profiles : PROFILES;
    DIR_DATA = Object.keys(_dirProfiles).map(function(id, index) {
      var p = _dirProfiles[id];
      var officeRaw = (p.office || '').replace(/^[^A-Za-z0-9]+/, '');
      var officeKey = 'candidate';
      if (/U\.S\.\s*Senator|^Senator/i.test(officeRaw)) officeKey = 'senate';
      else if (/U\.S\.\s*Representative/i.test(officeRaw)) officeKey = 'house';
      else if (/Governor/i.test(officeRaw)) officeKey = 'governor';
      else if (/President|Secretary|Director/i.test(officeRaw)) officeKey = 'executive';
      else if (/State\s*(Senator|Rep)|Speaker|Senate\s*President/i.test(officeRaw)) officeKey = 'state';
      else if (/Mayor/i.test(officeRaw)) officeKey = 'local';
      else if (/Candidate/i.test(officeRaw)) officeKey = 'candidate';

      var typeKey = 'principle';
      if (officeKey === 'executive' || officeKey === 'governor' || officeKey === 'local') typeKey = 'executive';

      var rank = typeof p.rank === 'number' ? p.rank : parseInt(String(p.rank).replace('#', ''), 10);
      if (isNaN(rank)) rank = 900 + index;

      return {
        id: id,
        name: p.name,
        office: officeRaw,
        officeKey: officeKey,
        typeKey: typeKey,
        state: p.state,
        party: p.party,
        score: p.score != null ? p.score : null,
        rank: rank,
        tier: p.tier || 'gray',
        icon: p.icon || '🏛',
        issues: window._pdxKeyIssues(p),
        bio: p.bio || '',
        photo: p.photo || ''
      };
    });

    var countEl = document.getElementById('profile-count');
    if (countEl) countEl.textContent = DIR_DATA.length;
    if (typeof filterDirectory === 'function') filterDirectory();
  };

  // ════════════════════════════════════════════════════════════
  // DEEP-PROFILE DATA & RENDERERS
  // ────────────────────────────────────────────────────────────
  // These power the richer "Full Profile" view: a politician's stated
  // positions on the same issues used by the Alignment Tool, a People's
  // Mandate scorecard built from the signals PolitiDex already tracks, and
  // scannable voting highlights. Everything is data-driven and degrades
  // gracefully, so profiles can be filled in gradually over time — add an
  // entry to ISSUE_STANCE_DATA (or MANDATE_OVERRIDES) for a politician and
  // the new sections light up automatically. Politicians with no curated
  // data still render a useful, honest "still being documented" view.
  // ════════════════════════════════════════════════════════════

  // ── Curated issue-stance schema ──────────────────────────────────────
  // Each politician id maps to a list of positions. Every position is one
  // object with a small, stable set of fields — add or omit any optional field
  // freely and the card still renders, so coverage can grow over time without
  // ever breaking the structure. To document a new official, add their id with a
  // list of positions in exactly this shape; nothing else needs to change.
  //
  //   REQUIRED
  //     topic   : the issue name, human-readable (mirrors the Alignment Tool).
  //     pos     : 'support' | 'oppose' | 'mixed' | 'tracking' — the badge shown
  //               on the card (how they come down on THIS topic, as framed).
  //     text    : one clear, specific sentence stating their position.
  //
  //   OPTIONAL (each independently safe to leave off)
  //     icon     : emoji for the card; falls back to 🎯.
  //     detail   : a second sentence of context — the "why", the nuance, or the
  //                scope of the position. Shown under `text` in a quieter style.
  //     evidence : the concrete record behind the stance — a named vote, signed
  //                bill, or sponsored measure. Rendered with a "Record:" label.
  //     source   : { label, url } — a citation link (official site, Congress.gov,
  //                le.utah.gov, etc.) surfaced as a chip.
  //     issueKey + issueStance : the LINKAGE to the Personalized Alignment Tool.
  //                issueKey points at the exact ISSUE_MAP position; issueStance
  //                ('support' | 'oppose' | 'mixed') is whether they back THAT
  //                position. This powers the per-issue "You vs. them" comparison
  //                and is kept separate from `pos` because a card topic may be
  //                framed differently from the Alignment position (e.g. "opposes
  //                foreign aid" == supports the "America First" position). Add
  //                these two to make a stance comparable; omit them and the card
  //                still renders, it just isn't matched against a user's picks.
  //
  // Quality over quantity: a documented official should have a handful of
  // specific, sourced positions rather than many vague ones. Utah officials in
  // 2026 races are the current priority and the most fully populated below.
  // ISSUE_STANCE_DATA ships in politician-stances-core.js + politician-stances-ext.js
  // (split from the former politician-stances.js; both load via deferred <script>
  // before alignment-tool.js, so the full object is present by DOMContentLoaded)

  // Optional curated overrides for the People's Mandate scorecard (0–100).
  // Leave a principle out to let it derive automatically from tracked data.
  var MANDATE_OVERRIDES = {};

  // Funding integrity signal (higher = more small-donor, less special-interest
  // funded). FALLBACK SEED ONLY: for anyone with an itemized filing in FTM_FUNDING,
  // the live, transparent Constituents-First signal (window._pdxFinanceSignal,
  // computed from real FEC / Utah-disclosure buckets with its reasons shown in the
  // UI) supersedes these numbers. This map still seeds the Transparency and
  // Constituents-over-special-interests mandate principles for officials who have
  // no filing on file yet. See FINANCE_INTEGRITY.md.
  var FINANCE_INTEGRITY = {
    trump:32, cox:54, lee:48, curtis:68, massie:78, owens:58,
    maloy:62, kennedy:55, bmoore:57, bilzerian:35, gallrein:64,
    gleich:75, bking:48
  };

  // Best-effort emoji for a free-text key issue, pulled from the Alignment
  // Tool's ISSUE_MAP so derived stances share the same visual vocabulary.
  function _deepProfileTopicIcon(text) {
    try {
      if (typeof ISSUE_MAP === 'undefined' || !text) return '🎯';
      var low = String(text).toLowerCase();
      for (var key in ISSUE_MAP) {
        var def = ISSUE_MAP[key];
        if (!def || !def.keywords) continue;
        for (var i = 0; i < def.keywords.length; i++) {
          if (low.indexOf(def.keywords[i].toLowerCase()) !== -1) {
            return (def.label || '🎯').split(' ')[0];
          }
        }
      }
    } catch (e) {}
    return '🎯';
  }

  // Stance helpers (STANCE_ALIASES, _resolveStanceList, _polPositionMap) extracted to stance-helpers.js

  <!-- Connected-evidence + related stance helpers moved to stance-helpers.js -->

  <!-- _pdxSeatIssueBoard + "How You Compare" family moved to stance-helpers.js -->

  // ── Stance at a Glance ───────────────────────────────────────────────
  // A compact, collapsible index of every documented position a politician
  // holds — built from the SAME ISSUE_STANCE_DATA the detailed Key Issue
  // Stances cards use, so the two can never disagree. Each row pairs the issue
  // with a one-line summary of the stance and a single evidence dot answering
  // "do we have receipts on this?": green when the politician's own promises
  // and on-record items back the stance, red when they cut against it, blue
  // when mixed, amber when in progress, hollow when nothing is connected yet.
  // Tapping a row opens a small popover listing the connected Promises and
  // Spotlight items for that one issue, drawn straight from
  // window._issueEvidenceMap (no new data work). Collapsed by default so it
  // orients a visitor without crowding the profile.
  //
  // CONTENT_STYLE: every line is the individual's own stated position and
  // their own record — no party framing is introduced here.
  window._sagCtx = null;
  window._renderStanceGlance = function(id, p) {
    try {
      p = p || {};
      var stances = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
      var documented = stances.filter(function(s){ return s && s.topic; });
      // Nothing documented → step aside rather than render an empty box. The
      // Key Issue Stances section immediately below already carries the honest
      // "positions being documented / limited record" message, so stacking a
      // second empty state here would just be noise.
      if (!documented.length) return '';

      // Stash the render context so a row's tap (which only carries its index)
      // can re-resolve the politician and rebuild the evidence map on click.
      window._sagCtx = { id: id, p: p };

      function esc(s) {
        if (s == null) return '';
        if (typeof window._slEsc === 'function') return window._slEsc(s);
        return String(s).replace(/[&<>"]/g, function(c){
          return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
        });
      }

      var evMap = (typeof window._issueEvidenceMap === 'function') ? (window._issueEvidenceMap(id, p) || {}) : {};

      var POS_META = {
        support:  { cls:'sag-support',  ico:'✓', label:'Supports' },
        oppose:   { cls:'sag-oppose',   ico:'✗', label:'Opposes' },
        mixed:    { cls:'sag-mixed',    ico:'~', label:'Mixed' },
        tracking: { cls:'sag-tracking', ico:'…', label:'Tracking' },
        priority: { cls:'sag-tracking', ico:'★', label:'Priority' }
      };

      // The at-a-glance evidence read for one issue: does the politician's own
      // record (kept/broken promises + positive/negative on-record items) back
      // the stance, cut against it, or just exist? Hollow when nothing is tied.
      function evRead(e) {
        if (!e) return { cls:'ev-none', label:'No evidence yet', media:'' };
        var c = e.counts || {};
        var supports  = (c.promisesKept   || 0) + (c.spotlightPositive || 0);
        var against   = (c.promisesBroken || 0) + (c.spotlightNegative || 0);
        var connected = (e.promises ? e.promises.length : 0) + (e.spotlight ? e.spotlight.length : 0);
        if (!connected) return { cls:'ev-none', label:'No evidence yet', media:'' };
        var media = (e.spotlight || []).filter(function(s){ return s.media && s.media.url; }).length;
        var mediaIco = media ? '<span class="sag-ev-media" title="' + media + ' video clip' + (media === 1 ? '' : 's') + ' on record — tap to watch">▶' + (media > 1 ? ' ' + media : '') + '</span>' : '';
        var n = connected + ' linked';
        if (supports && against)  return { cls:'ev-mixed',    label:n, media:mediaIco };
        if (supports && !against) return { cls:'ev-backs',    label:n, media:mediaIco };
        if (against && !supports) return { cls:'ev-cuts',     label:n, media:mediaIco };
        return { cls:'ev-progress', label:n, media:mediaIco };
      }

      var firstNm = (p.name ? String(p.name).split(' ')[0] : 'this official');
      var domId = 'sag-' + String(id || '').replace(/[^a-z0-9_-]/gi, '');

      // Say vs. Do — the explicit verdict pill. Reads the same backs/cuts/mixed
      // signal as the old evidence dot, but states it as a verdict comparing what the
      // official SAYS (this stance) to what their own record shows. A 'mixed' stance
      // can't contradict itself, so it always reads "Mixed record". Hollow evidence →
      // no verdict pill (honest: nothing to compare yet). _sagHydrateRecord upgrades
      // this in place to the roll-call-based verdict where the voting DB has votes.
      function sagVerdict(read, pos) {
        if (!read || read.cls === 'ev-none') return null;
        if (pos === 'mixed')            return { cls:'sag-v-mixed',       ico:'~', label:'Mixed record', line:'shows a mixed record on' };
        if (read.cls === 'ev-backs')    return { cls:'sag-v-consistent',  ico:'✓', label:'Backs it up',  line:'backs up' };
        if (read.cls === 'ev-cuts')     return { cls:'sag-v-contradicts', ico:'✗', label:'Contradicts',  line:'cuts against' };
        if (read.cls === 'ev-mixed')    return { cls:'sag-v-mixed',       ico:'~', label:'Mixed record', line:'shows a mixed record on' };
        if (read.cls === 'ev-progress') return { cls:'sag-v-progress',    ico:'⏳', label:'In progress',  line:'is still delivering on' };
        return null;
      }

      var withEv = 0;
      var rows = documented.map(function(s, i) {
        var m = POS_META[s.pos] || POS_META.tracking;
        var e = (s.issueKey && evMap[s.issueKey]) ? evMap[s.issueKey] : null;
        var read = evRead(e);
        if (read.cls !== 'ev-none') withEv++;
        var evTitle = (read.cls === 'ev-none')
          ? 'No promises or recorded statements are tied to this position yet'
          : 'Tap to see the promises and on-record items tied to this position';
        // All-Seeing Eye — direct jump to the attached video. Rendered as a
        // prominent gold "Watch Video" pill (span, since the row is a <button>);
        // tapping it opens the clip inline and stops the row's evidence-popover.
        var _sagVid = (typeof window._pdxIssueVideo === 'function') ? window._pdxIssueVideo(id, p, s.issueKey) : null;
        var sagWatch = (_sagVid && typeof window._pdxWatchPill === 'function')
          ? window._pdxWatchPill(_sagVid, { cls: 'sag-watch' }) : '';
        // People's Mandate tie — when this position is on an issue citizens are
        // actively voting on, surface a chip that jumps to the reform. This is
        // the stance → reform leg of the thread the request asks for.
        var sagMandate = (s.issueKey && typeof window._pdxMandateChip === 'function')
          ? window._pdxMandateChip(s.issueKey, { compact: true }) : '';
        var m2 = sagVerdict(read, s.pos);
        var vdBadge = m2
          ? '<span class="sag-verdict ' + m2.cls + '" data-sag-issue="' + esc(s.issueKey || '') + '" title="Say vs. Do — whether ' + esc(firstNm) + '’s own record lines up with this stated position">' + m2.ico + ' ' + m2.label + '</span>'
          : '';
        var rowDomId = domId + '-d' + i;
        var evText = esc(s.evidence || s.detail || '');
        var srcHtml = (s.source && s.source.url)
          ? '<a class="sag-src" href="' + esc(s.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">' + esc(s.source.label || 'Source') + ' ↗</a>'
          : (s.source && s.source.label ? '<span class="sag-src">' + esc(s.source.label) + '</span>' : '');
        var c = (e && e.counts) || {};
        var tallyParts = [];
        if (c.promisesKept)    tallyParts.push('<span class="t-kept">✓ ' + c.promisesKept + ' kept</span>');
        if (c.promisesBroken)  tallyParts.push('<span class="t-broken">✗ ' + c.promisesBroken + ' broken</span>');
        if (c.promisesPending) tallyParts.push('<span class="t-pending">⏳ ' + c.promisesPending + ' pending</span>');
        if (c.spotlight)       tallyParts.push('<span>📋 ' + c.spotlight + ' on record</span>');
        var tallyHtml = tallyParts.length ? '<div class="sag-tally">' + tallyParts.join('') + '</div>' : '';
        var vdLineTxt = m2
          ? '<strong>' + esc(firstNm) + '’s own record ' + m2.line + ' this position.</strong> Weighed from their promises, on-record statements and — where available — roll-call votes.'
          : 'No promises, statements or recorded votes are tied to this position yet.';
        var evLine = (evText || srcHtml)
          ? '<div class="sag-detail-ev">' + evText + (evText && srcHtml ? ' · ' : '') + srcHtml + '</div>'
          : '';
        var detailInner =
          '<div class="sag-verdict-line ' + (m2 ? m2.cls : 'sag-v-none') + '">' + vdLineTxt + '</div>' +
          evLine +
          tallyHtml +
          '<div class="sag-votes" data-sag-votes="' + esc(s.issueKey || '') + '" data-loaded="0"></div>' +
          '<button type="button" class="sag-detail-cta" onclick="event.stopPropagation(); window._pdxOpenStanceEvidence(' + i + ')">See all evidence &amp; votes →</button>';
        return '<div class="sag-item ' + m.cls + '">' +
            '<button type="button" class="sag-row ' + m.cls + '" aria-expanded="false" onclick="window._sagToggleRow(this,' + i + ')" ' +
              'aria-label="Expand ' + esc(s.topic) + '">' +
              '<span class="sag-ico" aria-hidden="true">' + (s.icon || '🎯') + '</span>' +
              '<span class="sag-main">' +
                '<span class="sag-topic">' + esc(s.topic) + '</span>' +
                '<span class="sag-text">' + esc(s.text || '') + '</span>' +
                (sagMandate ? '<span class="sag-mandate" style="display:inline-flex;margin-top:0.3rem;">' + sagMandate + '</span>' : '') +
              '</span>' +
              '<span class="sag-meta">' +
                sagWatch +
                '<span class="sag-badge ' + m.cls + '">' + m.ico + ' ' + m.label + '</span>' +
                vdBadge +
              '</span>' +
              '<span class="sag-chev" aria-hidden="true">›</span>' +
            '</button>' +
            '<div class="sag-detail" id="' + rowDomId + '"><div class="sag-detail-inner">' + detailInner + '</div></div>' +
          '</div>';
      }).join('');

      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');
      var n = documented.length;
      var domId = 'sag-' + String(id || '').replace(/[^a-z0-9_-]/gi, '');
      var countPill = n + ' position' + (n === 1 ? '' : 's') +
        (withEv ? ' · ' + withEv + ' with evidence' : '');

      // People's Mandate tie-in — the count badge sits in the header so the
      // connection is visible at a glance even while the section is collapsed,
      // and the collapsible cue inside the body lists exactly which reforms this
      // official has a position or evidence on. Both no-op to '' when nothing
      // connects, so a profile with no Mandate overlap looks exactly as before.
      var mandateBadge = (typeof window._pdxMandateCountBadge === 'function')
        ? window._pdxMandateCountBadge(id, p) : '';
      var mandateCue = (typeof window._pdxMandateProfileCue === 'function')
        ? window._pdxMandateProfileCue(id, p, { scope: 'sag' }) : '';

      // Honest caption when the record is thin — shown instead of letting a
      // one- or two-item list read as the whole story.
      var limited = (n < 3)
        ? '<div class="sag-limited"><span class="sag-limited-ico" aria-hidden="true">📋</span>' +
            '<span class="sag-limited-text">Limited position data available — showing the ' + n +
            ' position' + (n === 1 ? '' : 's') + ' documented for ' + esc(first) +
            ' so far. More are added as statements and votes are verified.</span></div>'
        : '';

      // Progressive enhancement: once this section is in the DOM, upgrade each
      // verdict pill to the authoritative roll-call verdict for members whose votes
      // are in the voting-record database. No-ops for everyone else. Runs after the
      // synchronous innerHTML insertion completes (macrotask), and is fully guarded.
      try { setTimeout(function(){ try { if (typeof window._sagHydrateRecord === 'function') window._sagHydrateRecord(id, p); } catch (e) {} }, 60); } catch (e) {}

      return '<div class="modal-section">' +
          '<button class="dd-toggle-btn" onclick="toggleDD(\'' + domId + '\')" id="btn-' + domId + '">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;min-width:0;">' +
              '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.08em;color:#dbe6f6;">🧭 Stance at a Glance</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(159,180,212,0.12);border:1px solid rgba(159,180,212,0.2);color:#7596c0;padding:0.1rem 0.45rem;border-radius:999px;white-space:nowrap;">' + countPill + '</span>' + mandateBadge +
            '</div>' +
            '<svg class="dd-chevron w-4 h-4" fill="none" stroke="#7596c0" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
          '</button>' +
          '<div class="dd-body" id="' + domId + '">' +
            '<div class="dd-inner" style="padding:0.875rem;">' +
              // Says what this section IS, in one line, before the list. It is a
              // summary index over the same stance system the full record and the
              // "Every documented position" drawer render at depth — three levels of
              // one thing, not three widgets. On a phone that framing has to be
              // explicit: the deeper levels are off-screen, so without it the list
              // reads as a standalone box that happens to mention issues.
              '<p class="sag-summary-of">The summary layer of ' + esc(first) + '’s stance record — one line per position here, the whole position at depth one tap in.</p>' +
              '<p class="sag-lead">Where ' + esc(first) + ' stands on the issues — each with a <em>Say vs. Do</em> verdict showing whether ' + esc(first) + '’s own record backs the position up. Tap any issue to expand its evidence and recorded votes.</p>' +
              mandateCue +
              limited +
              '<div class="sag-list">' + rows + '</div>' +
              '<p class="sag-foot">Say vs. Do verdict: <b style="color:#6ee7a0;">✓ Backs it up</b> · <b style="color:#fca5a5;">✗ Contradicts</b> · <b style="color:#93c5fd;">~ Mixed</b> · <b style="color:#f5c842;">⏳ In progress</b>. Weighed from ' + esc(first) + '’s own promises, on-record statements and — where available — roll-call votes.</p>' +
              // The way OUT of the summary and into the full record, at the bottom of
              // the summary rather than only inside an expanded row. Without it the
              // section is a dead end on a phone, which is the other half of reading
              // as a broken separate widget.
              ((typeof window._pdxStanceRecordMiniLink === 'function') ? '<div class="sag-more">' + window._pdxStanceRecordMiniLink(id, p) + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
    } catch (err) {
      if (window.console && console.warn) console.warn('stance glance failed', err);
      return '';
    }
  };

  // Expand/collapse one stance row's inline detail (Say vs. Do breakdown + the
  // issue's recorded votes + a link to the full evidence locker). Lazily fills the
  // recorded-votes list the first time a row is opened.
  window._sagToggleRow = function(btn, i) {
    try {
      if (!btn) return;
      var item = btn.parentNode;
      var detail = btn.nextElementSibling;
      if (!detail || String(detail.className || '').indexOf('sag-detail') === -1) {
        detail = item ? item.querySelector('.sag-detail') : null;
      }
      if (!detail) return;
      var open = btn.classList.contains('is-open');
      btn.classList.toggle('is-open', !open);
      detail.classList.toggle('is-open', !open);
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open) {
        var votes = detail.querySelector('.sag-votes');
        if (votes && votes.getAttribute('data-loaded') === '0' && typeof window._sagFillVotes === 'function') {
          var ctx = window._sagCtx || {};
          window._sagFillVotes(votes, ctx.id, ctx.p);
        }
      }
    } catch (e) {}
  };

  // Render up to three recorded votes tagged to one issueKey into a row's detail.
  window._sagRenderVotes = function(votesEl, items, issue) {
    try {
      if (!votesEl) return;
      var esc = window._slEsc || function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); };
      var hits = (items || []).filter(function(it){
        return it && (it.issues || []).some(function(x){ return x && x.issueKey === issue; });
      });
      if (!hits.length) {
        votesEl.innerHTML = '<span class="sag-votes-empty">No recorded roll-call votes are tied to this issue yet — the receipts above come from promises and on-record statements.</span>';
        return;
      }
      hits.sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
      var rows = hits.slice(0, 3).map(function(it){
        var pos = String(it.position || '').toLowerCase();
        var pcls = pos === 'yea' ? 'v-yea' : (pos === 'nay' ? 'v-nay' : 'v-other');
        var plabel = (it.position || (it.kind === 'position' ? 'action' : '—'));
        var yr = it.date ? (' · ' + String(it.date).slice(0, 4)) : '';
        var num = it.number ? (esc(it.number) + ' — ') : '';
        return '<div class="sag-vote"><span class="sag-vote-pos ' + pcls + '">' + esc(plabel) + '</span><span>' + num + esc(it.title || '') + yr + '</span></div>';
      }).join('');
      votesEl.innerHTML = '<div class="sag-votes-head">Recorded votes on this issue</div>' + rows;
    } catch (e) { try { votesEl.innerHTML = ''; } catch (e2) {} }
  };

  // Fill a row's recorded-votes container. Uses the in-memory cache when warm,
  // otherwise fetches the member's record once. Fully no-ops when the voting-record
  // layer or this member's votes aren't available (most local officials).
  window._sagFillVotes = function(votesEl, id, p) {
    try {
      if (!votesEl) return;
      votesEl.setAttribute('data-loaded', '1');
      var issue = votesEl.getAttribute('data-sag-votes') || '';
      var api = window.PDXVotingRecord;
      if (!issue || !api || typeof api.memberRecords !== 'function') return;
      var recs = api.memberRecords(id);
      if (recs == null && typeof api.fetchMember === 'function') {
        votesEl.innerHTML = '<span class="sag-votes-loading">Checking recorded votes…</span>';
        api.fetchMember(id, { pageSize: 100 }).then(function(data){
          try {
            if (data && data.items && typeof api.noteMember === 'function') api.noteMember(id, data.items);
            window._sagRenderVotes(votesEl, (data && data.items) || [], issue);
            if (typeof window._sagHydrateRecord === 'function') window._sagHydrateRecord(id, p);
          } catch (e) { try { votesEl.innerHTML = ''; } catch (e2) {} }
        }, function(){ try { votesEl.innerHTML = ''; } catch (e) {} });
        return;
      }
      window._sagRenderVotes(votesEl, recs || [], issue);
    } catch (e) {}
  };

  // Progressive enhancement: upgrade each row's Say-vs-Do verdict pill (and its
  // detail line) from the evidence-based reading to the authoritative roll-call
  // verdict, for members whose votes are in the voting-record database. Reuses the
  // shared say-vs-do engine (_polPositionMap + _polRecordMap). No-ops otherwise.
  window._sagHydrateRecord = function(id, p) {
    try {
      var ctx = window._sagCtx || {};
      id = id || ctx.id; p = p || ctx.p || {};
      if (!id) return;
      var domId = 'sag-' + String(id).replace(/[^a-z0-9_-]/gi, '');
      var body = document.getElementById(domId);
      if (!body) return;
      var pills = body.querySelectorAll('.sag-verdict[data-sag-issue]');
      if (!pills.length) return;
      var api = window.PDXVotingRecord;
      if (!api || typeof api.memberRecords !== 'function') return;
      var recs = api.memberRecords(id);
      if (recs == null) {
        if (!window._sagFetchedFor) window._sagFetchedFor = {};
        if (!window._sagFetchedFor[id] && typeof api.fetchMember === 'function') {
          window._sagFetchedFor[id] = 1;
          api.fetchMember(id, { pageSize: 100 }).then(function(data){
            try { if (data && data.items && typeof api.noteMember === 'function') api.noteMember(id, data.items); window._sagHydrateRecord(id, p); } catch (e) {}
          });
        }
        return;
      }
      if (!recs.length) return;
      var posMap = (typeof window._polPositionMap === 'function') ? window._polPositionMap(id, p) : null;
      var recMap = (typeof window._polRecordMap === 'function') ? window._polRecordMap(recs, posMap) : null;
      if (!recMap) return;
      var esc = window._slEsc || function(s){ return String(s == null ? '' : s); };
      var firstNm = (p && p.name) ? String(p.name).split(' ')[0] : 'This official';
      var VMAP = {
        consistent:  { cls:'sag-v-consistent',  ico:'✓', label:'Backs it up',  line:'back up' },
        contradicts: { cls:'sag-v-contradicts', ico:'✗', label:'Contradicts',  line:'cut against' },
        mixed:       { cls:'sag-v-mixed',       ico:'~', label:'Mixed record', line:'show a mixed record on' }
      };
      for (var k = 0; k < pills.length; k++) {
        var pill = pills[k];
        var issue = pill.getAttribute('data-sag-issue');
        var sum = issue ? recMap[issue] : null;
        if (!sum || !sum.total) continue;
        var v = VMAP[sum.netVerdict];
        if (!v) continue;
        var nv = sum.total;
        pill.className = 'sag-verdict ' + v.cls;
        pill.innerHTML = v.ico + ' ' + v.label;
        pill.setAttribute('title', 'Say vs. Do — measured against ' + nv + ' recorded vote' + (nv === 1 ? '' : 's') + ' on this issue');
        pill.setAttribute('data-sag-src', 'votes');
        var item = (pill.closest) ? pill.closest('.sag-item') : null;
        var line = item ? item.querySelector('.sag-verdict-line') : null;
        if (line) {
          line.className = 'sag-verdict-line ' + v.cls;
          line.innerHTML = '<strong>' + esc(firstNm) + '’s recorded votes ' + v.line + ' this position.</strong> Measured against ' + nv + ' roll-call vote' + (nv === 1 ? '' : 's') + ' tagged to this issue — expand the full locker for each one.';
        }
      }
    } catch (e) {}
  };

  // Open the per-issue evidence popover for the glance row at index `i`. Re-uses
  // the stashed render context (politician + profile) so the row markup only has
  // to carry its index, then rebuilds the connected-evidence map for that issue.
  window._pdxOpenStanceEvidence = function(i) {
    try {
      var ctx = window._sagCtx || {};
      var id = ctx.id || window._pdxCurrentProfileId;
      var p = ctx.p || (window.PROFILES && window.PROFILES[id]) || {};
      var stances = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
      var documented = stances.filter(function(s){ return s && s.topic; });
      var s = documented[i];
      if (!s) return;

      function esc(v) {
        if (v == null) return '';
        if (typeof window._slEsc === 'function') return window._slEsc(v);
        return String(v).replace(/[&<>"]/g, function(c){
          return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
        });
      }

      var evMap = (typeof window._issueEvidenceMap === 'function') ? (window._issueEvidenceMap(id, p) || {}) : {};
      var e = (s.issueKey && evMap[s.issueKey]) ? evMap[s.issueKey] : null;
      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');

      var STANCE_META = {
        support: { cls:'sag-support', ico:'✓', label:'Supports' },
        oppose:  { cls:'sag-oppose',  ico:'✗', label:'Opposes' },
        mixed:   { cls:'sag-mixed',   ico:'~', label:'Mixed' },
        tracking:{ cls:'sag-tracking',ico:'…', label:'Tracking' },
        priority:{ cls:'sag-tracking',ico:'★', label:'Top Priority' }
      };
      var sm = STANCE_META[s.pos] || STANCE_META.tracking;

      var VERDICT = {
        kept:       { cls:'kept',       label:'Kept' },
        broken:     { cls:'broken',     label:'Broken' },
        compromise: { cls:'compromise', label:'Compromise' },
        pending:    { cls:'pending',    label:'Pending' }
      };

      function promRow(pr) {
        var v = String(pr.verdict || 'pending').toLowerCase();
        var vm = VERDICT[v] || VERDICT.pending;
        return '<div class="sag-pop-prom">' +
            '<span class="sag-pop-prom-dot ' + vm.cls + '" aria-hidden="true"></span>' +
            '<span class="sag-pop-prom-body">' + esc(pr.title) +
              '<span class="sag-pop-prom-verdict ' + vm.cls + '">· ' + vm.label + '</span>' +
            '</span>' +
          '</div>';
      }

      function spotLinks(it) {
        var links = [];
        var m = it.media || null;
        if (m && m.url) {
          var isVideo = m.type === 'video';
          var glyph, txt;
          if (isVideo) { var vk = (typeof window._slVideoKindWord === 'function') ? window._slVideoKindWord(m) : ''; glyph = '▶'; txt = 'Watch ' + (vk || '') + 'video' + (m.timestamp ? ' · ' + esc(m.timestamp) : ''); }
          else if (m.type === 'x_post')   { glyph = '𝕏'; txt = 'View post'; }
          else if (m.type === 'facebook') { glyph = '📘'; txt = 'Facebook'; }
          else if (m.type === 'audio')    { glyph = '🎧'; txt = 'Listen'; }
          else if (m.type === 'text')     { glyph = '📄'; txt = 'Read'; }
          else { glyph = '🔗'; txt = 'Open'; }
          links.push('<a href="' + esc(m.url) + '" target="_blank" rel="noopener" class="sag-pop-link' + (isVideo ? ' is-video' : '') + '">' + glyph + ' ' + txt + '</a>');
        }
        if (it.source && it.source.url && (!m || !m.url || it.source.url !== m.url)) {
          links.push('<a href="' + esc(it.source.url) + '" target="_blank" rel="noopener" class="sag-pop-link">🔗 ' + esc(it.source.label || 'Source') + '</a>');
        }
        return links.length ? '<div class="sag-pop-spot-links">' + links.join('') + '</div>' : '';
      }

      function spotRow(it) {
        var imp = it.impact === 'positive' ? { c:'positive', g:'▲' }
                : it.impact === 'negative' ? { c:'negative', g:'▼' }
                : { c:'neutral', g:'•' };
        var dateBit = it.date ? ' <span class="sag-pop-spot-date">· ' + esc(it.date) + '</span>' : '';
        return '<div class="sag-pop-spot">' +
            '<div class="sag-pop-spot-head">' +
              '<span class="sag-pop-spot-impact ' + imp.c + '" aria-hidden="true">' + imp.g + '</span>' +
              '<span class="sag-pop-spot-headline">' + esc(it.headline) + dateBit + '</span>' +
            '</div>' + spotLinks(it) +
          '</div>';
      }

      var promises = (e && e.promises) ? e.promises : [];
      var spotlight = (e && e.spotlight) ? e.spotlight : [];

      var body = '';
      body += '<div class="sag-pop-stance">' +
          '<span class="sag-badge ' + sm.cls + '">' + sm.ico + ' ' + sm.label + '</span>' +
        '</div>';
      if (s.text)   body += '<p class="sag-pop-text">' + esc(s.text) + '</p>';
      if (s.detail) body += '<p class="sag-pop-detail">' + esc(s.detail) + '</p>';
      if (s.evidence) body += '<p class="sag-pop-record"><span class="sag-pop-rlabel">Record</span>' + esc(s.evidence) + '</p>';
      if (s.source && s.source.url) {
        body += '<a href="' + esc(s.source.url) + '" target="_blank" rel="noopener" class="sag-pop-link" style="margin-bottom:0.2rem;">🔗 ' + esc(s.source.label || 'Source') + '</a>';
      }

      if (promises.length) {
        body += '<div class="sag-pop-grouph">🤝 Tracked Promises<span class="sag-pop-groupn">' + promises.length + '</span></div>';
        body += promises.map(promRow).join('');
      }
      if (spotlight.length) {
        body += '<div class="sag-pop-grouph">🔦 On Record<span class="sag-pop-groupn">' + spotlight.length + '</span></div>';
        body += spotlight.map(spotRow).join('');
      }
      if (!promises.length && !spotlight.length) {
        body += '<div class="sag-pop-empty"><span aria-hidden="true">🔍</span><span>No tracked promise or recorded statement is tied to this position yet. The stance above reflects ' + esc(first) + '’s stated position; connected evidence is added as promises and on-record items are verified and tagged to this issue.</span></div>';
      }

      // For sitting Utah legislators the full Connected Evidence section is on
      // the page — offer a one-tap jump to this issue's card there, plus a deep
      // link into the Evidence Locker pre-filtered to this official AND issue.
      // Action row at the end of the thread: stance → evidence → (promises and
      // on-record items shown above) → The People's Mandate. The Mandate jump
      // renders for ANY official whose issue is part of a reform, so the
      // stance → reform leg is one tap from the evidence itself; the in-profile +
      // Evidence Locker deep links stay scoped to sitting Utah legislators, whose
      // Connected Evidence lives on the page.
      var actions = [];
      var _mItems = (s.issueKey && typeof window._pdxMandateForIssue === 'function')
        ? window._pdxMandateForIssue(s.issueKey) : [];
      if (_mItems && _mItems.length) {
        var jsMk = String(s.issueKey == null ? '' : s.issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        actions.push('<button type="button" class="sag-pop-jump is-mandate" ' +
          'onclick="window._pdxCloseStanceEvidence();window._pdxMandateFocus&&window._pdxMandateFocus(\'' + jsMk + '\');" ' +
          'title="' + esc('See the People’s Mandate reform' + (_mItems.length > 1 ? 's' : '') + ' this position connects to') +
          '">📜 See on The People’s Mandate ↗</button>');
      }
      if ((promises.length || spotlight.length) && s.issueKey &&
          typeof window._pdxEvAnchor === 'function') {
        var anchor = window._pdxEvAnchor(id, s.issueKey);
        actions.push('<button type="button" class="sag-pop-jump" onclick="window._pdxCloseStanceEvidence();window._pdxJumpEvidence&&window._pdxJumpEvidence(\'' + anchor + '\');">🧩 See in profile ↓</button>');
        if (spotlight.length) {
          var jsId = String(id == null ? '' : id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var jsIk = String(s.issueKey == null ? '' : s.issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          actions.push('<button type="button" class="sag-pop-jump is-locker" onclick="window._pdxCloseStanceEvidence();window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + jsId + '\',issue:\'' + jsIk + '\'});">📚 View in the Digital Library ↗</button>');
        }
      }
      var jump = actions.length ? '<div class="sag-pop-actions">' + actions.join('') + '</div>' : '';

      body += jump;
      body += '<p class="sag-pop-foot">Built only from ' + esc(first) + '’s own documented position, tracked promises and Spotlight items on this issue — never their party’s record.</p>';

      var sheet = '<div class="sag-pop" role="dialog" aria-modal="true" aria-label="Evidence for ' + esc(s.topic) + '">' +
          '<div class="sag-pop-head">' +
            '<span class="sag-pop-ico" aria-hidden="true">' + (s.icon || '🎯') + '</span>' +
            '<div class="sag-pop-titlewrap">' +
              '<div class="sag-pop-eyebrow">' + esc(first) + '’s position</div>' +
              '<div class="sag-pop-title">' + esc(s.topic) + '</div>' +
              ((s.issueKey && typeof window._pdxMandateChip === 'function')
                ? (function(){ var mc = window._pdxMandateChip(s.issueKey, {}); return mc ? '<div style="margin-top:0.35rem;">' + mc + '</div>' : ''; })()
                : '') +
            '</div>' +
            '<button class="sag-pop-x" onclick="window._pdxCloseStanceEvidence()" aria-label="Close">✕</button>' +
          '</div>' + body +
        '</div>';

      var overlay = document.getElementById('sag-pop-overlay');
      if (!overlay) return;
      overlay.innerHTML = sheet;
      overlay.style.display = 'flex';
    } catch (err) {
      if (window.console && console.warn) console.warn('stance evidence popover failed', err);
    }
  };

  window._pdxCloseStanceEvidence = function() {
    var overlay = document.getElementById('sag-pop-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  };

  // Key Issue Stances — clear, scannable positions on specific issues.
  window._renderIssueStances = function(id, p) {
    p = p || {};
    var stances = _resolveStanceList(id, p);
    var derived = false;
    // A 2026 candidate (or any not-yet-seated challenger) has no voting record to
    // build documented stances from. When we fall back to their key issues we
    // reframe the section as the priorities they are campaigning on — an honest,
    // intentional read — rather than positions that are merely "being researched."
    var _is2026Cand = (typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(p);
    var _isCandidate = _is2026Cand ||
      ((typeof window._pdxOfficeStatus === 'function') && window._pdxOfficeStatus(p) === 'candidate') ||
      /candidat|challenger|nominee|running/i.test(((p.office || '') + ' ' + (p.state || '')));
    var _firstName = (p.name ? String(p.name).split(' ')[0] : 'this candidate');
    // ── THE FORMAL FILE, READ ONCE ──────────────────────────────────────────
    // Three strings below used to describe a member with no sourced quote as a
    // person we were "still documenting". On a candidate that is true. On a
    // sitting member with twenty issues of roll call already printed further
    // down the same page it is not: the thing being documented is our stance
    // research, and saying otherwise hands the reader an emptiness that the
    // record beneath it contradicts. So the derived branch asks the formal
    // index how deep the file is before it picks its words.
    //
    // DEPTH AND CHARACTERISATION ONLY, AND ONLY AT SECTION LEVEL. The curated
    // key-issue list is free text — "2020 Election Denial", not an ISSUE_MAP
    // key — so there is no honest way to bind THIS card to THAT pattern, and a
    // fuzzy match would print one issue's votes under another issue's heading.
    // The record therefore speaks about the file as a whole and the per-card
    // line says what it can: we have no quote, and a vote is not a quote.
    var _fpiShapeES = null;
    try {
      var _FPIES = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      if (_FPIES && typeof _FPIES.shape === 'function') _fpiShapeES = _FPIES.shape(id);
    } catch (e) { _fpiShapeES = null; }
    var _formalES = (_fpiShapeES && _fpiShapeES.issues) ? _fpiShapeES.issues : 0;
    var _formalNounES = (_formalES === 1) ? 'issue' : 'issues';
    if (!stances || !stances.length) {
      // Fall back to the politician's tracked key issues so the section is
      // still informative. For a sitting official the position is flagged as
      // not-yet-documented; for a candidate it is presented as a stated priority.
      var ki = window._pdxKeyIssues(p).slice(0, 6);
      if (!ki.length) {
        // No documented stances AND no tagged issues. For a complete
        // officeholder record we still deliberately omit the section to avoid
        // noise. But for a 2026 candidate, or any thin / early-record profile,
        // we render a clean, intentional empty state instead of vanishing — so
        // the profile reads as honestly in-progress rather than broken, the
        // thin-record notice's "positions below" hint always has something to
        // land on, and the visitor is still pointed to the Alignment Tool as a
        // way to judge them on values right now.
        var _depthES = (typeof window._pdxRecordDepth === 'function') ? window._pdxRecordDepth(p) : 'full';
        if (!_isCandidate && _depthES === 'full') return '';
        // A candidacy that has CONCLUDED (eliminated at convention, withdrew,
        // or lost) with no published platform is a closed book, not a work in
        // progress. Saying positions are "being added" would imply more is
        // coming when nothing is — so we tell that story honestly instead.
        var _candStatusES = String(p.candidacyStatus || p.status || '').toLowerCase();
        var _lostPrimaryES = (_candStatusES === 'eliminated_primary' || _candStatusES === 'lost_primary');
        var _inactiveES = (_lostPrimaryES || _candStatusES === 'eliminated' || _candStatusES === 'withdrew' ||
          _candStatusES === 'withdrawn' || _candStatusES === 'lost' || _candStatusES === 'defeated' ||
          _candStatusES === 'suspended' || _candStatusES === 'conceded');
        var _esTitle, _esIco, _esHead, _esSub;
        if (_isCandidate && _inactiveES) {
          var _esVerb = _lostPrimaryES
            ? 'lost the primary and is not advancing to the general election'
            : (_candStatusES === 'withdrew' || _candStatusES === 'withdrawn' || _candStatusES === 'suspended')
              ? 'withdrew before the ballot was set' : 'did not advance past the nominating stage';
          _esTitle = '🎯 Key Issue Stances';
          _esIco   = '📋';
          _esHead  = 'Limited record — no published platform';
          _esSub   = _firstName + ' ' + _esVerb + ' and published no policy platform, so positions are intentionally left out here rather than invented. This profile is kept honest and thin on purpose — you can still compare your own values to the broader field with the Alignment Tool.';
        } else if (_isCandidate) {
          _esTitle = '🎯 Top Priorities';
          _esIco   = '🗳️';
          _esHead  = 'Campaign priorities being added';
          _esSub   = 'As a ' + (_is2026Cand ? '2026 candidate' : 'candidate') + ', ' + _firstName + ' does not yet have a voting record. We are gathering their stated priorities from public campaign materials and will add detailed positions and sources as they are published — until then, you can still compare ' + _firstName + ' to your own values with the Alignment Tool.';
        } else if (_formalES) {
          // Not an empty profile — a profile with a record and no quote. Lead
          // with the file, then name the gap as ours, then keep the lane wall:
          // a pattern of votes is not a stated position and is not scored.
          _esTitle = '🎯 Key Issue Stances';
          _esIco   = '🏛';
          _esHead  = _formalES + ' ' + _formalNounES + ' of formal record on file';
          _esSub   = _firstName + '’s votes and formal actions are set out in full further down this profile' +
            ((_fpiShapeES && _fpiShapeES.characterised)
              ? ', and the record reads clearly enough to characterise on ' + _fpiShapeES.characterised + ' of them'
              : '') +
            '. What we do not yet hold is a position stated in their own words, so there is nothing here for that record to be tested against — a pattern of votes is not a stated position, and it does not enter Direction Match. The gap is in our stance research, not in their record.';
        } else {
          _esTitle = '🎯 Key Issue Stances';
          _esIco   = '🧭';
          _esHead  = 'Stated positions being documented';
          _esSub   = 'Detailed positions for ' + _firstName + ' are still being documented and will be added as public statements and votes are verified. In the meantime, you can compare ' + _firstName + ' to your own values with the Alignment Tool.';
        }
        return '<div class="modal-section">' +
          '<div class="modal-section-title" style="justify-content:space-between;">' +
            '<span style="display:inline-flex;align-items:center;gap:0.45rem;min-width:0;">' + _esTitle + '</span>' +
            ((typeof window._pdxStanceRecordMiniLink === 'function') ? window._pdxStanceRecordMiniLink(id, p) : '') +
          '</div>' +
          '<div class="pdx-empty-state">' +
            '<div class="pdx-empty-ico">' + _esIco + '</div>' +
            '<div class="pdx-empty-title">' + _esHead + '</div>' +
            '<div class="pdx-empty-sub">' + _esSub + '</div>' +
            // Quiet on-ramp: a profile with no documented record yet is exactly
            // where the community can help. Skipped for concluded candidacies
            // (a closed book, where suggesting more would be misleading).
            ((!_inactiveES && typeof window._pdxSuggestCueHtml === 'function')
              ? ('<div style="margin-top:0.85rem;">' + window._pdxSuggestCueHtml(p.name, { label: _formalES
                    ? 'Know somewhere they stated a position in their own words? Help us source it'
                    : 'Several issues still have no record. Help build it' }) + '</div>')
              : '') +
          '</div>' +
        '</div>';
      }
      derived = true;
      stances = ki.map(function(issue) {
        return { topic: issue, icon: _deepProfileTopicIcon(issue),
          pos: _isCandidate ? 'priority' : 'tracking',
          text: _isCandidate
            ? ('A core priority of ' + _firstName + '\'s campaign. Detailed positions are added as the campaign publishes statements and, once in office, a voting record begins.')
            : (_formalES
              ? ('No position from ' + _firstName + ' on this in their own words yet — their formal record is on file below. A pattern of votes is not a stated position, and is not in Direction Match.')
              : 'A detailed position is being researched and will be added as statements and votes are verified.') };
      });
    }
    var _derivedCand = derived && _isCandidate;
    // NOTE (Phase 1 consolidation): the old local `posMeta` stance→badge map
    // (support/oppose/mixed/tracking/priority → cls/sc/ico/label) has been
    // retired. Key Issue Stances now speaks the canonical four-state language
    // from the shared window.PDXStance helper (the same one Who Stands Where
    // uses), so the per-row pill, colours, and labels live in one place. The
    // only card-local mapping left is canonical-key → left-border tint (`_sc`
    // in renderCard), which reuses the existing sc-* CSS — no new colours.
    // "Researching"/tracking folds into "No Clear Position"; "Top Priority" is
    // kept as a separate emphasis marker (a star), never a stance colour.

    // Category metadata mirrors the Alignment Tool's groupings so stances slot
    // under the same human-readable headers a visitor already knows.
    var CAT_META = {
      gov:{icon:'💰',label:'Taxes & Government'}, econ:{icon:'📈',label:'Economy & Jobs'},
      housing:{icon:'🏠',label:'Housing & Cost of Living'}, infra:{icon:'🚧',label:'Infrastructure & Transportation'},
      land:{icon:'🏔',label:'Public Lands & Energy'},
      enviro:{icon:'💧',label:'Water & Environment'}, dc:{icon:'🖥',label:'Data Centers & Growth'}, immig:{icon:'🛡',label:'Immigration'},
      guns:{icon:'🔫',label:'Gun Policy'}, justice:{icon:'👮',label:'Criminal Justice & Safety'},
      foreign:{icon:'🦅',label:'Foreign Policy & Defense'}, health:{icon:'🏥',label:'Healthcare'},
      edu:{icon:'🎓',label:'Education'}, family:{icon:'🧸',label:'Family, Children & Work'},
      repro:{icon:'🕊',label:'Abortion & Reproductive Rights'},
      rights:{icon:'🏳️‍🌈',label:'Civil Rights & LGBTQ+'}, tech:{icon:'🚀',label:'Technology & Privacy'},
      democracy:{icon:'🗳',label:'Elections & Democracy'}, reform:{icon:'⏳',label:'Government Reform'},
      other:{icon:'🎯',label:'Other Issues'}
    };
    var CAT_ORDER = ['gov','econ','housing','infra','land','enviro','dc','immig','guns','justice','foreign','health','edu','family','repro','rights','tech','democracy','reform','other'];
    function _stanceCat(s) {
      if (s.cat && CAT_META[s.cat]) return s.cat;
      if (s.issueKey && typeof ISSUE_MAP !== 'undefined' && ISSUE_MAP[s.issueKey] && ISSUE_MAP[s.issueKey].cat) return ISSUE_MAP[s.issueKey].cat;
      return 'other';
    }

    function renderCard(s) {
      // ── Canonical stance pill (single source of truth) ───────────────────
      // Lead the row with the exact calm pill Who Stands Where uses, via the
      // shared window.PDXStance helper. The underlying data (issueStance / pos)
      // is untouched — we only resolve it to one of the four canonical states.
      //   • "priority" is a candidate placeholder, not a real position: strip
      //     the fake pos so it folds into "No Clear Position" (its underlying
      //     issueStance still wins if one is on record).
      //   • "tracking"/"Researching" already aliases to "No Clear Position".
      // Top Priority survives as a separate emphasis star (below), never a
      // stance colour.
      var _placeholderPriority = (s.pos === 'priority');
      var _isPriority = _placeholderPriority || window.PDXStance.isTopPriority(s);
      var _stanceKey = window.PDXStance.resolveStance(_placeholderPriority ? { issueStance: s.issueStance } : s);
      var _stancePill = window.PDXStance.stancePill(_stanceKey);
      // On a DERIVED row for a sitting member with a formal file, "No Clear
      // Position" is the wrong sentence in the wrong direction: nothing about
      // their position is unclear to them, we simply have not sourced a quote.
      // Same canonical state, same colour, same markup — one word swapped, and
      // only here. The four-state vocabulary is untouched for every surface
      // that reads a real stance, which is why this is built from stanceState()
      // rather than by adding a fifth state to PDXStance.
      if (derived && !_isCandidate && _formalES) {
        var _noneState = window.PDXStance.stanceState('none');
        _stancePill = '<span class="pdxis-stance pdxis-stance-' + _noneState.cls + '"' +
          ' title="We have not sourced a position from this official on this issue in their own words">' +
          '<span class="pdxis-stance-dot" aria-hidden="true"></span>' +
          '<span class="pdxis-stance-k">Stance</span>No stance on file</span>';
      }
      // Canonical key → the card's existing left-border tint, so the card edge
      // stays in the pill's colour family. Reuses sc-* CSS — no new colours.
      var _sc = ({ supported:'sc-support', opposed:'sc-oppose', mixed:'sc-mixed', none:'sc-tracking' })[_stanceKey] || 'sc-tracking';
      // ── Evidence Locker bridge ────────────────────────────────────────────
      // Tie this documented position to the actual receipts. The count is drawn
      // straight from the loaded Locker index (the same "N items" the Locker's
      // own stance rows show), and the whole card becomes a one-tap drill-in,
      // filtered to this politician + issue. Offered only for genuinely
      // documented stances that carry an issueKey AND have real evidence on
      // record, so a card never points a visitor at an empty file.
      var _evAttrs = '', _evCue = '', _evCls = '', _depthPill = '';
      if (!derived && s.issueKey) {
        var _eAttr = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
        var _ec = (typeof window._pdxEvidenceIssueCountsForPerson === 'function') ? window._pdxEvidenceIssueCountsForPerson(id) : null;
        var _en = _ec ? (_ec[s.issueKey] || 0) : null;
        var _lockable = (_en !== null) ? (_en > 0)
          : !!(typeof window._pdxHasLocker === 'function' && window._pdxHasLocker(id));
        if (_lockable) {
          _evCls = ' is-evclick';
          _evAttrs = ' role="button" tabindex="0"' +
            ' data-ev-pol="' + _eAttr(id) + '" data-ev-issue="' + _eAttr(s.issueKey) + '"' +
            ' onclick="window._pdxStanceCardOpen(this,event)"' +
            ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window._pdxStanceCardOpen(this,event);}"' +
            ' title="Open the Evidence Locker — ' + _eAttr((p && p.name) ? p.name : 'this official') + ' on ' + _eAttr(s.topic || s.issueKey) + '"';
          _evCue = '<div class="stance-ev-cue"><span class="stance-ev-cue-ico" aria-hidden="true">📂</span>' +
            (_en !== null && _en > 0
              ? ('See the <strong>' + _en + '</strong> evidence item' + (_en === 1 ? '' : 's'))
              : 'See the evidence') +
            '<span class="stance-ev-cue-go">in the Locker ↗</span></div>';
          // Compact Evidence-depth pill — count + strength tier for THIS position,
          // pulled from the same loaded library index. Sits high on the card so the
          // depth of the curated record behind the stance is scannable at a glance.
          _depthPill = (typeof window._pdxEvidenceDepthPill === 'function')
            ? window._pdxEvidenceDepthPill(id, s.issueKey, { format: 'receipts' }) : '';
        }
      }
      // Shared vote + comment row, keyed by a stable issue target id, so each
      // documented stance carries the community's discussion natively. Only
      // shown for genuinely documented positions — not the derived "researching"
      // placeholders, which carry no stance worth voting on yet.
      var voteRow = '';
      if (!derived && typeof window._pdxSpotlightEngageHTML === 'function') {
        var _vtIssue = window._pdxVoteTargetId('issue', id, (s.issueKey || s.topic || ''));
        voteRow = window._pdxSpotlightEngageHTML(_vtIssue, 'this position');
      } else if (!derived && typeof window._pdxVoteControlHTML === 'function') {
        var _vtIssue2 = window._pdxVoteTargetId('issue', id, (s.issueKey || s.topic || ''));
        voteRow = window._pdxVoteControlHTML(_vtIssue2, 'this position');
      }
      // Optional second line of context — the "why" or scope behind the stance.
      var det = s.detail ? '<p style="font-size:0.74rem;color:#7e98bc;line-height:1.6;margin:0.35rem 0 0;">' + s.detail + '</p>' : '';
      var ev = s.evidence ? '<div style="font-size:0.7rem;color:#7596c0;line-height:1.5;margin-top:0.4rem;"><span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:#4e72a0;">Record:</span> ' + s.evidence + '</div>' : '';
      var src = s.source && s.source.url ? '<a href="' + s.source.url + '" target="_blank" rel="noopener" class="dd-source-chip" style="margin-top:0.45rem;" onclick="event.stopPropagation();">🔗 ' + s.source.label + '</a>' : '';
      // If the visitor selected the matching Alignment Tool position, tag the card
      // with their own view + a colored match indicator — the at-a-glance linkage.
      var youPill = '';
      if (s.issueKey && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.has(s.issueKey)) {
        var intensity = (typeof _alignIntensity !== 'undefined' && _alignIntensity[s.issueKey]) || 'support';
        var verdict = (typeof _issueVerdict === 'function') ? _issueVerdict(intensity, s.issueStance || s.pos || 'mixed') : 'partial';
        var vm = _CMP_VERDICT_META[verdict] || _CMP_VERDICT_META.partial;
        var youIM = (typeof _userIntensityMeta === 'function') ? _userIntensityMeta(intensity) : { label: _userStanceLabel(intensity), sub: _userStanceLabel(intensity) };
        youPill = '<span class="stance-you ' + vm.cls + '">' + vm.ico + ' ' + vm.full + ' · ' + (youIM.sub || ('You: ' + youIM.label)) + '</span>';
      }
      return '<div class="stance-card ' + _sc + _evCls + '"' + _evAttrs + '>' +
        // Row leads with the canonical stance pill, then the topic — mirroring
        // Who Stands Where's "stance first" reading order.
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;">' +
          _stancePill +
          '<span style="font-size:1rem;line-height:1;flex-shrink:0;">' + (s.icon || '🎯') + '</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.85rem;color:white;letter-spacing:0.01em;">' + s.topic + '</span>' +
          ((typeof window._pdxVideoEye === 'function' && typeof window._pdxIssueVideo === 'function')
            ? window._pdxVideoEye(window._pdxIssueVideo(id, p, s.issueKey), {}) : '') +
          // Top Priority — a quiet emphasis star, kept strictly separate from
          // the stance colour (per Phase 1: priority is emphasis, not a stance).
          (_isPriority ? '<span title="Top priority" aria-label="Top priority" style="margin-left:0.05rem;color:#e6c35c;font-size:0.9rem;line-height:1;flex-shrink:0;">★</span>' : '') +
        '</div>' +
        // Secondary evidence line — receipts/strength demoted below the stance,
        // prefixed with a quiet "Evidence" caption, exactly mirroring the
        // Stance › Evidence hierarchy from Who Stands Where.
        (_depthPill ? '<div class="pdxis-p-meta" style="margin:0.15rem 0 0.45rem;"><span class="pdxis-meta-k">Evidence</span>' + _depthPill + '</div>' : '') +
        '<p style="font-size:0.78rem;color:#9fb4d4;line-height:1.6;margin:0;">' + s.text + '</p>' +
        det +
        ev +
        (src ? '<div>' + src + '</div>' : '') +
        ((typeof window._pdxStanceEvidenceLink === 'function') ? window._pdxStanceEvidenceLink(id, p, s) : '') +
        // Connect the dots: link this stated position out to the topic's ranked
        // view, its sourced Issue Spotlight, and any citizen-backed reform tied
        // to the same issueKey. Documented stances only — a derived placeholder
        // has no position worth connecting yet.
        ((!derived && typeof window._pdxStanceConnectRow === 'function') ? window._pdxStanceConnectRow(id, p, s) : '') +
        youPill +
        voteRow +
        _evCue +
      '</div>';
    }

    // Distribution summary chips — show at a glance how the official's documented
    // positions break down (and how many line up with the visitor's picks).
    var nSup = 0, nOpp = 0, nMix = 0, nYouMatch = 0, nYouTotal = 0;
    stances.forEach(function(s) {
      if (s.pos === 'support') nSup++;
      else if (s.pos === 'oppose') nOpp++;
      else if (s.pos === 'mixed') nMix++;
      if (!derived && s.issueKey && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.has(s.issueKey)) {
        nYouTotal++;
        var iv = (typeof _alignIntensity !== 'undefined' && _alignIntensity[s.issueKey]) || 'support';
        if ((typeof _issueVerdict === 'function' ? _issueVerdict(iv, s.issueStance || s.pos || 'mixed') : '') === 'match') nYouMatch++;
      }
    });
    var sumChips = '';
    if (!derived) {
      if (nSup) sumChips += '<span class="stance-sum-chip stance-support">✓ ' + nSup + ' Support</span>';
      if (nOpp) sumChips += '<span class="stance-sum-chip stance-oppose">✗ ' + nOpp + ' Oppose</span>';
      if (nMix) sumChips += '<span class="stance-sum-chip stance-mixed">~ ' + nMix + ' Mixed</span>';
      if (nYouTotal) sumChips += '<span class="stance-sum-chip stance-you-sum">🤝 You agree on ' + nYouMatch + '/' + nYouTotal + '</span>';
    }

    // Body: group documented stances under category headers; render the derived
    // "researching" fallback as a simple flat list (no real categories to group).
    var body;
    if (derived) {
      body = stances.map(renderCard).join('');
    } else {
      var groups = {};
      stances.forEach(function(s) { var c = _stanceCat(s); (groups[c] = groups[c] || []).push(s); });
      body = CAT_ORDER.filter(function(c) { return groups[c]; }).map(function(c) {
        var meta = CAT_META[c] || CAT_META.other;
        var list = groups[c];
        return '<div class="stance-cat">' +
          '<div class="stance-cat-head"><span class="stance-cat-ico">' + meta.icon + '</span>' + meta.label +
            '<span class="stance-cat-n">' + list.length + '</span></div>' +
          list.map(renderCard).join('') +
        '</div>';
      }).join('');
    }

    // The one lane noun this section uses. A president does not have a "voting
    // record" — they sign, veto, issue and direct — so the sentence that names
    // what a stance is checked against has to know which office it is describing.
    var _isExecOffice = false;
    try {
      _isExecOffice = !!(window.PDXExecRecord && typeof window.PDXExecRecord.eligible === 'function'
        && window.PDXExecRecord.eligible(id));
    } catch (e) { _isExecOffice = false; }
    var _recordNoun = _isExecOffice ? 'formal actions on the record' : 'voting records';

    var note = _derivedCand
      ? ('As a ' + (_is2026Cand ? '2026 candidate' : 'candidate') + ', ' + _firstName + ' does not yet have a record to score. The priorities above are drawn from their public campaign — PolitiDex logs kept-and-broken promises once they take office.')
      : (derived
        ? (_formalES
          ? ('The formal record here runs to ' + _formalES + ' ' + _formalNounES + ' of votes and formal actions, listed in full further down. The issues above are the ones tracked on ' + _firstName + '’s profile; what is still missing is a position in their own words for that record to be tested against, and that is our documentation rather than their record.')
          : 'Detailed stances for this official are still being documented. The issues above are tracked from their profile and the Alignment Tool — positions are added as statements and formal actions are verified.')
        : 'Stances summarize public statements and ' + _recordNoun + ' on the same issues used by the Alignment Tool. Sources are linked where available, and this section expands as more positions are verified.');
    var _countWord = _derivedCand
      ? (stances.length === 1 ? ' priority' : ' priorities')
      : (' issue' + (stances.length === 1 ? '' : 's'));
    // ── "Limited Record" context for sitting officials with thin promise data ──
    // When a real officeholder has documented positions but only a sparse tracked
    // promise record, lead with an honest expectation-setting note so users know
    // why the promise score is thin — and that these sourced positions are the
    // most reliable read on where the official stands right now. Only shown for
    // genuine, non-derived stances on a sitting (non-candidate) official.
    var _depthKIS = (typeof window._pdxRecordDepth === 'function') ? window._pdxRecordDepth(p) : 'full';
    var _limitedBanner = '';
    if (!derived && !_isCandidate && _depthKIS === 'limited') {
      // A sitting official with a thin promise record but real documented positions
      // is the profile that most easily reads as "broken" — a sparse score with no
      // obvious anchor. Rather than a one-line apology, this panel makes the limited
      // record feel like one intentional system: it names the connected lenses that
      // DO work without a full promise score — the sourced positions here, the
      // visitor's Alignment match, and the Spotlight — with honest counts, then says
      // plainly what is still being built. It mirrors the limited-record card's
      // framing for officials that don't qualify for that (score-less) card, and
      // references it only when it is actually shown.
      var _lrSnap = (window._pdxSnapshotShownId === id);
      var _lrChips = [];
      _lrChips.push('<span class="lr-chip"><span class="lr-chip-ico" aria-hidden="true">📌</span>' + stances.length + ' sourced position' + (stances.length === 1 ? '' : 's') + '</span>');
      var _lrHasPicks = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      var _lrMatch = (_lrHasPicks && typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(id) : null;
      _lrChips.push('<span class="lr-chip lr-chip-align"><span class="lr-chip-ico" aria-hidden="true">🤝</span>' +
        (_lrMatch !== null ? (_lrMatch + '% your match') : 'Compare on your values') + '</span>');
      var _lrSpot = (typeof window._krBuildSpotlight === 'function') ? window._krBuildSpotlight(id) : null;
      if (_lrSpot) {
        var _lrSpotV = (_lrSpot.kind === 'newcomer' || _lrSpot.kind === 'monitoring')
          ? 'Monitoring'
          : ((_lrSpot.total > 1) ? (_lrSpot.total + ' updates') : 'Latest update');
        _lrChips.push('<span class="lr-chip lr-chip-spot"><span class="lr-chip-ico" aria-hidden="true">🔦</span>' + _lrSpotV + '</span>');
      }
      // Honest pointer — to the browse gateway when the limited-record card is on
      // this profile (the card now sits directly under the tree, at the foot of the
      // verdict stage), otherwise to the sections that ARE here, so the
      // cross-reference is always real. It named "the Candidate Snapshot at the
      // top" until that card was renamed and moved below ⚖️ Word vs Action, and
      // then named ⚖️ Word vs Action's own issue index — which is gated on a
      // two-issue floor and does not draw at all on the profiles this panel
      // describes. It names the one surface that is always there instead.
      var _lrRef = _lrSnap
        ? ' <strong style="color:#d8b4fe;">🌳 All Issues by Topic</strong> above groups them by topic, and the card under it explains why the record is still thin.'
        : (' Your <strong style="color:#a78bfa;">How You Compare</strong> match' +
            (_lrSpot ? ' and the <strong style="color:#f5c842;">Spotlight</strong> are' : ' is') + ' on this profile too.');
      _limitedBanner =
        '<div class="stance-limited-note">' +
          '<div class="lr-head">' +
            '<span class="stance-limited-pill">📋 Limited Record</span>' +
            '<span class="stance-limited-text">PolitiDex tracks only a few promises for ' + _firstName + ' so far, so the pledge tier of ⚖️ Word vs Action is thin. These <strong style="color:#cbd9ec;">' + stances.length + ' sourced position' + (stances.length === 1 ? '' : 's') + '</strong> are the clearest read on where ' + _firstName + ' stands today.' + _lrRef + '</span>' +
          '</div>' +
          '<div class="lr-row"><span class="lr-row-label">On record now</span><div class="lr-chips">' + _lrChips.join('') + '</div></div>' +
          '<div class="lr-row lr-row-building"><span class="lr-row-label">Still being built</span><span class="lr-building-text"><span aria-hidden="true">⏳</span> More of ' + _firstName + '\'s ' + (_isExecOffice ? 'formal actions' : 'voting record') + ', and kept-and-broken promises as commitments play out — added only as each is verified, never invented.</span></div>' +
        '</div>';
    }
    // ── Additional activity — inferred from evidence ──────────────────────────
    // Beyond the documented positions above, a politician often has Locker
    // evidence on issues that carry NO curated ISSUE_STANCE_DATA stance. Rather
    // than stay silent, surface those issues here with the SAME conservative
    // headline-inferred read the Evidence Locker uses — marked with "~" and the
    // established tooltip — kept in a clearly labelled secondary block below the
    // documented list so the two never blur. Each is a one-tap drill-in to the
    // Locker, filtered to this politician + issue, exactly like the documented
    // cards. Only issues with real directional evidence appear (the helper omits
    // the rest), so an empty inferred row can never render.
    var _inferredSection = '';
    try {
      var _infMap = (typeof window._pdxEvidenceInferredStancesForPerson === 'function')
        ? window._pdxEvidenceInferredStancesForPerson(id) : null;
      if (_infMap) {
        var _docKeys = Object.create(null);
        stances.forEach(function (s) { if (s.issueKey) _docKeys[s.issueKey] = 1; });
        var _infMeta = {
          support: { cls:'stance-support', sc:'sc-support', ico:'✓', label:'Supports' },
          oppose:  { cls:'stance-oppose',  sc:'sc-oppose',  ico:'✗', label:'Opposes' },
          mixed:   { cls:'stance-mixed',   sc:'sc-mixed',   ico:'~', label:'Mixed' }
        };
        var _eAttrI = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
        var _infRows = Object.keys(_infMap)
          .filter(function (k) { return !_docKeys[k]; })   // documented stances win — never duplicate
          .map(function (k) { var o = _infMap[k]; o.key = k; return o; })
          .sort(function (a, b) { return b.count - a.count; });
        if (_infRows.length) {
          var _polNameI = (p && p.name) ? p.name : 'this official';
          var _infTip = 'Inferred from the headline — not yet a documented position';
          var _infCards = _infRows.map(function (o) {
            var m = _infMeta[o.dir];
            if (!m) return '';
            var _infDepth = (typeof window._pdxEvidenceDepthPill === 'function')
              ? window._pdxEvidenceDepthPill(id, o.key, { format: 'receipts' }) : '';
            return '<div class="stance-card stance-inferred ' + m.sc + ' is-evclick"' +
              ' role="button" tabindex="0"' +
              ' data-ev-pol="' + _eAttrI(id) + '" data-ev-issue="' + _eAttrI(o.key) + '"' +
              ' onclick="window._pdxStanceCardOpen(this,event)"' +
              ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window._pdxStanceCardOpen(this,event);}"' +
              ' title="' + _eAttrI('Open the Evidence Locker — ' + _polNameI + ' on ' + o.label) + '">' +
              '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;margin-bottom:0.35rem;">' +
                '<div style="display:flex;align-items:center;gap:0.45rem;min-width:0;">' +
                  '<span style="font-size:1rem;line-height:1;flex-shrink:0;">' + (o.icon || '🎯') + '</span>' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.85rem;color:white;letter-spacing:0.01em;">' + _eAttrI(o.label) + '</span>' +
                '</div>' +
                '<span class="stance-badge ' + m.cls + '" title="' + _eAttrI(_infTip) + '">' + m.ico + ' ' + m.label +
                  ((o.dir !== 'mixed') ? ' <span class="stance-inf-mark" aria-hidden="true">~</span>' : '') +
                '</span>' +
              '</div>' +
              (_infDepth ? '<div class="stance-depth-row" style="margin:0 0 0.4rem;">' + _infDepth + '</div>' : '') +
              '<p style="font-size:0.78rem;color:#9fb4d4;line-height:1.6;margin:0;">Inferred from ' + _eAttrI(_firstName) + '\'s evidence on this issue — not yet a documented position.</p>' +
              '<div class="stance-ev-cue"><span class="stance-ev-cue-ico" aria-hidden="true">📂</span>See the <strong>' + o.count + '</strong> evidence item' + (o.count === 1 ? '' : 's') +
                '<span class="stance-ev-cue-go">in the Locker ↗</span></div>' +
            '</div>';
          }).join('');
          _inferredSection = '<div class="stance-inferred-wrap">' +
            '<div class="stance-cat-head stance-inferred-head"><span class="stance-cat-ico">🔎</span>Additional activity — inferred from evidence' +
              '<span class="stance-cat-n">' + _infRows.length + '</span></div>' +
            '<p class="stance-inferred-note">Issues ' + _eAttrI(_firstName) + ' has evidence on in the Locker but no documented position yet. These reads are inferred from the headlines (marked <span class="stance-inf-mark">~</span>) — not curated stances. Open any to weigh the evidence yourself.</p>' +
            _infCards +
          '</div>';
        }
      }
    } catch (e) { _inferredSection = ''; }
    // Secondary, in-context jump to the Full Stance Record overlay (every issue +
    // honest gaps) and an optional subtle teaser counting the gap issues that the
    // curated cards above don't show. Both read from already-cached stats.
    var _recMini = (typeof window._pdxStanceRecordMiniLink === 'function') ? window._pdxStanceRecordMiniLink(id, p) : '';
    var _recTeaser = '';
    try {
      var _recStats = (typeof window._pdxStanceRecordStats === 'function') ? window._pdxStanceRecordStats(id, p) : null;
      var _gaps = _recStats ? _recStats.gaps : 0;
      if (_gaps > 0 && (typeof window._pdxOpenStanceRecord === 'function')) {
        var _gapJsId = _pdxEvJsId(id);
        _recTeaser = '<button type="button" class="pdx-fsr-teaser" ' +
          'onclick="window._pdxOpenStanceRecord&&window._pdxOpenStanceRecord(\'' + _gapJsId + '\');">' +
          '+ <b>' + _gaps + '</b> more issue' + (_gaps === 1 ? '' : 's') + ' tracked, including gaps. ' +
          '<span class="pdx-fsr-teaser-go">View full record →</span></button>';
      }
    } catch (e) { _recTeaser = ''; }
    // Thin / early profile: when the section is built from stated key issues
    // (no documented stances yet), offer the same quiet on-ramp to help build the
    // record. Skipped for concluded candidacies and for full officeholder records.
    var _thinSuggest = '';
    try {
      var _csTS = String(p.candidacyStatus || p.status || '').toLowerCase();
      var _closedTS = /eliminated|lost|withdrew|withdrawn|defeated|suspended|conceded/.test(_csTS);
      if (derived && !_closedTS && typeof window._pdxSuggestCueHtml === 'function') {
        _thinSuggest = '<div style="margin-top:0.5rem;">' + window._pdxSuggestCueHtml(p.name, { label: (_formalES && !_isCandidate)
          ? 'Know somewhere they stated a position in their own words? Help us source it'
          : 'Several issues still have no record. Help build it' }) + '</div>';
      }
    } catch (e) { _thinSuggest = ''; }
    return '<div class="modal-section">' +
      '<div class="modal-section-title" style="justify-content:space-between;">' +
        '<span style="display:inline-flex;align-items:center;gap:0.45rem;">' + (_derivedCand ? '🎯 Top Priorities' : '🎯 Key Issue Stances') + '</span>' +
        '<span style="display:inline-flex;align-items:center;gap:0.4rem;flex-shrink:0;">' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(159,180,212,0.12);border:1px solid rgba(159,180,212,0.2);color:#7596c0;padding:0.12rem 0.5rem;border-radius:999px;">' + stances.length + _countWord + '</span>' +
          _recMini +
        '</span>' +
      '</div>' +
      '<p class="modal-section-sub">' + (_derivedCand
        ? ('The core priorities of ' + _firstName + '\'s campaign — drawn from public campaign materials, with detailed positions and sources added as they are published.')
        : (derived && _formalES)
          ? ('The issues tracked on ' + _firstName + '’s profile. No position in their own words is on file for these yet — what is on file is ' +
             _formalES + ' ' + _formalNounES + ' of votes and formal actions, set out in full further down.')
        : ('Where ' + (p.name ? String(p.name).split(' ')[0] : 'they') + ' stand' + (p.name ? 's' : '') + ' on the issues — grouped by topic, with the record and sources shown where available.')) + '</p>' +
      _limitedBanner +
      (sumChips ? '<div class="stance-summary">' + sumChips + '</div>' : '') +
      body +
      _recTeaser +
      _thinSuggest +
      _inferredSection +
      '<p class="src-note">' + note + '</p>' +
    '</div>';
  };


  // ── Connected Evidence view ──────────────────────────────────────────────
  // The visible surface for the connected-evidence work: for each issue, it
  // shows the official's OWN stance beside the promises and recorded
  // statements/actions tagged to that SAME issue, so a reader sees in one place
  // what they claim, what they promised, and what they've said or done on
  // record — and whether the record backs, complicates, or cuts against the
  // stance. Reads straight from window._issueEvidenceMap (no new data work).
  //
  // Scoped to CURRENT SITTING UTAH STATE LEGISLATORS for this first pass — the
  // cohort whose promises and Spotlight items carry the shared issueKey. Returns
  // '' for everyone else (federal officials, 2026 candidates, statewide execs)
  // so the section simply doesn't appear there yet.
  //
  // CONTENT_STYLE: every line is about THIS person's own record. No party
  // framing is introduced here — the view only re-presents already-authored,
  // individually-sourced positions/promises/Spotlight content.

  // True only for a seated Utah State House/Senate member (not a candidate for
  // one, not a federal office). Drives the first-pass scope.
  window._pdxIsUtahStateLegislator = function(p) {
    if (!p) return false;
    var state = String(p.state || '');
    if (!/utah/i.test(state) && !/\bUT\b/.test(state)) return false;
    var office = String(p.office || '');
    // Must be a STATE legislative seat …
    if (!/state\s+(senator|rep|representative|house|senate)/i.test(office)) return false;
    // … actually held, not merely sought, and not a federal seat.
    if (/candidate|running for|nominee|challenger|u\.?s\.?\b|federal|congress/i.test(office)) return false;
    if ((typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(p)) return false;
    if ((typeof window._pdxOfficeStatus === 'function') && window._pdxOfficeStatus(p) === 'candidate') return false;
    return true;
  };

  // ── Profile "Evidence" summary strip ──────────────────────────────────────
  // A compact, clickable lead-in that tells a visitor, at a glance, how much
  // supporting evidence PolitiDex holds on this official — "12 pieces of
  // evidence across 7 issues" with a video/post breakdown — and opens the
  // Evidence Locker pre-filtered to them in one tap. Reads straight from the
  // shared window._issueEvidenceMap (no new data work) and, like the Connected
  // Evidence section, is scoped to current sitting Utah State Legislators and
  // only shown when real on-record evidence exists, so it never reads as empty.
  // Does this official have anything actually FILED on an issue — a recorded
  // Spotlight item or a tracked promise? This is the honest gate for the whole
  // evidence family. It replaces _pdxIsUtahStateLegislator(), which was a SCOPE
  // gate from the first pass and wrong in both directions: it hid 132 profiles
  // that hold a documented position plus real sourced evidence, and it offered
  // the Locker CTA to 46 legislators with nothing on file. A documented position
  // ALONE deliberately does not qualify — a panel whose every row reads "no
  // connected record yet" is empty scaffolding, and the point of these sections
  // is the connection, not the heading.
  window._pdxHasIssueEvidence = function (id, p) {
    try {
      if (typeof window._issueEvidenceMap !== 'function') return false;
      if (!p) {
        p = (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id]
           : ((typeof CMP_DATA !== 'undefined') ? CMP_DATA[id] : null);
      }
      var map = window._issueEvidenceMap(id, p) || {};
      for (var k in map) {
        if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
        var e = map[k] || {};
        if ((e.spotlight && e.spotlight.length) || (e.promises && e.promises.length)) return true;
      }
      return false;
    } catch (e) { return false; }
  };

  window._renderEvidenceSummary = function(id, p) {
    try {
      p = p || {};
      if (typeof window._issueEvidenceMap !== 'function') return '';
      if (typeof window._pdxHasIssueEvidence === 'function' &&
          !window._pdxHasIssueEvidence(id, p)) return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      function esc(s) {
        if (s == null) return '';
        if (typeof window._slEsc === 'function') return window._slEsc(s);
        return String(s).replace(/[&<>"]/g, function(c){
          return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
        });
      }

      // Tally the on-record evidence the Locker holds for this official: total
      // items, how many distinct issues they touch, and the video / post mix.
      var totItems = 0, totVideo = 0, totPost = 0, totProm = 0, issuesWithEv = 0;
      keys.forEach(function(k) {
        var e = map[k] || {};
        var spot = Array.isArray(e.spotlight) ? e.spotlight : [];
        var prom = Array.isArray(e.promises) ? e.promises : [];
        if (spot.length) issuesWithEv++;
        totItems += spot.length;
        totProm += prom.length;
        spot.forEach(function(s) {
          var m = s && s.media;
          if (m && m.type === 'video') totVideo++;
          else if (m && (m.type === 'x_post' || m.type === 'facebook')) totPost++;
        });
      });
      // Nothing in the Locker for this person → don't render an empty entry point.
      if (!totItems) return '';

      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');
      // Raw politician id, JS-string-escaped for the inline open call (the Locker
      // filters on the unsanitized id, so it must be passed through verbatim).
      var jsId = String(id == null ? '' : id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var open = "window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:'" + jsId + "'});";

      // Headline count + scannable breakdown chips (only the ones that apply).
      var headline = totItems + ' piece' + (totItems === 1 ? '' : 's') + ' of evidence across ' +
        issuesWithEv + ' issue' + (issuesWithEv === 1 ? '' : 's');
      var chips = '';
      function chip(ico, label) {
        return '<span style="display:inline-flex;align-items:center;gap:0.25rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#9fb4d4;background:rgba(159,180,212,0.1);border:1px solid rgba(159,180,212,0.22);padding:0.1rem 0.45rem;border-radius:999px;white-space:nowrap;">' + ico + ' ' + label + '</span>';
      }
      if (totVideo) chips += chip('<span style="color:#f5c842;">▶</span>', totVideo + ' video' + (totVideo === 1 ? '' : 's'));
      if (totPost)  chips += chip('𝕏', totPost + ' post' + (totPost === 1 ? '' : 's'));
      if (totProm)  chips += chip('🤝', totProm + ' promise' + (totProm === 1 ? '' : 's'));
      var chipRow = chips ? '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.4rem;">' + chips + '</div>' : '';

      // One clickable banner. Flex layout wraps the CTA below the text on narrow
      // screens, so it reads cleanly on mobile as well as desktop.
      return '<div class="modal-section">' +
          '<button type="button" onclick="' + open + '" ' +
            'aria-label="Open the Evidence Locker filtered to ' + esc(p.name || first) + '" ' +
            'style="width:100%;text-align:left;cursor:pointer;display:flex;align-items:center;gap:0.85rem;flex-wrap:wrap;' +
            'background:linear-gradient(135deg,rgba(245,200,66,0.1) 0%,rgba(19,33,63,0.55) 60%);' +
            'border:1px solid rgba(245,200,66,0.32);border-radius:0.85rem;padding:0.85rem 1rem;transition:border-color 0.15s ease,box-shadow 0.15s ease;" ' +
            'onmouseover="this.style.borderColor=\'rgba(245,200,66,0.6)\';this.style.boxShadow=\'0 0 16px rgba(245,200,66,0.18)\';" ' +
            'onmouseout="this.style.borderColor=\'rgba(245,200,66,0.32)\';this.style.boxShadow=\'none\';">' +
            '<span aria-hidden="true" style="width:40px;height:40px;flex-shrink:0;border-radius:0.6rem;background:rgba(245,200,66,0.14);border:1px solid rgba(245,200,66,0.3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">📂</span>' +
            '<span style="flex:1;min-width:160px;">' +
              '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:#f5c842;">Evidence Locker</span>' +
              '<span style="display:block;font-family:\'Bebas Neue\',sans-serif;font-size:1.25rem;letter-spacing:0.02em;color:#fff;line-height:1.15;">' + headline + '</span>' +
              '<span style="display:block;font-size:0.72rem;color:#9fb4d4;line-height:1.45;margin-top:0.1rem;">Every recorded statement, formal action and clip PolitiDex has gathered on ' + esc(first) + ' — open the full, filterable file.</span>' +
              chipRow +
            '</span>' +
            '<span style="flex-shrink:0;white-space:nowrap;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#0a0f1e;background:#f5c842;border-radius:0.6rem;padding:0.5rem 0.9rem;">Open ↗</span>' +
          '</button>' +
        '</div>';
    } catch (e) {
      if (window.console && console.warn) console.warn('evidence summary failed', e);
      return '';
    }
  };

  window._renderEvidenceConnections = function(id, p) {
    try {
      p = p || {};
      if (typeof window._issueEvidenceMap !== 'function') return '';
      if (typeof window._pdxHasIssueEvidence === 'function' &&
          !window._pdxHasIssueEvidence(id, p)) return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');
      function esc(s) {
        if (s == null) return '';
        if (typeof window._slEsc === 'function') return window._slEsc(s);
        return String(s).replace(/[&<>"]/g, function(c){
          return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
        });
      }
      function issueLabel(k) {
        var l = (typeof window._issueLabel === 'function') ? window._issueLabel(k) : '';
        l = l || (map[k].position && map[k].position.topic) || k;
        // ISSUE_MAP labels lead with an emoji; the card already shows that icon
        // separately, so drop the leading emoji token to avoid doubling it.
        var parts = String(l).trim().split(/\s+/);
        if (parts.length > 1 && /[^\x00-\x7F]/.test(parts[0])) parts.shift();
        return parts.join(' ');
      }
      function issueIco(k) {
        if (map[k].position && map[k].position.icon) return map[k].position.icon;
        // ISSUE_MAP labels lead with an emoji (e.g. "🏔 Protect Public Lands") —
        // reuse it so the panel matches the icon the Alignment Tool shows for the
        // same issue. Fall back to a neutral target when the lead token is plain.
        var lbl = (typeof window._issueLabel === 'function') ? window._issueLabel(k) : '';
        var head = String(lbl || '').trim().split(/\s+/)[0] || '';
        return (head && /[^\x00-\x7F]/.test(head)) ? head : '🎯';
      }

      // Each issue's overall "read": does the official's own record back the
      // stance, cut against it, or complicate it? Built only from kept/broken
      // promises and positive/negative recorded items on THIS issue.
      // What this card HOLDS, not how it grades. This used to publish a per-issue
      // verdict — "✓ Record backs the stance" / "✗ Record cuts against it" /
      // "~ Record is mixed" / "… Action in progress" — computed from kept/broken
      // promises and Spotlight impact markers. That was a THIRD verdict vocabulary
      // on the profile, over a different evidence pool from the one ⚖️ Word vs
      // Action and the 🏛️/✒️ Official Record judge, free to disagree with both on
      // the same issue in the same scroll. Connected Evidence is the supporting
      // layer; it documents, it does not rate. The two honest coverage states
      // survive, because "nothing is written here yet" is a fact about the file
      // rather than a judgement about the politician.
      function readFor(e) {
        var connected = e.promises.length + e.spotlight.length;
        if (!e.position) {
          // Evidence exists but no curated stance — an honest gap to surface.
          return { cls: 'evd-gap', label: '◆ Stance not yet written', kind: 'gap' };
        }
        if (!connected) return { cls: 'evd-thin', label: '○ No connected record yet', kind: 'thin' };
        return { cls: 'evd-has', label: '🧾 ' + connected + ' item' + (connected === 1 ? '' : 's') + ' on file', kind: 'has' };
      }

      var STANCE_META = {
        support: { cls: 'stance-support', ico: '✓', label: 'Supports' },
        oppose:  { cls: 'stance-oppose',  ico: '✗', label: 'Opposes' },
        mixed:   { cls: 'stance-mixed',   ico: '~', label: 'Mixed' }
      };
      var VERDICT_META = {
        kept:    { cls: 'kept',    label: 'Kept' },
        broken:  { cls: 'broken',  label: 'Broken' },
        pending: { cls: 'pending', label: 'Pending' }
      };

      // One recorded Spotlight item → headline + impact marker + media/source
      // links (video & X with timestamps where available).
      function renderSpot(s) {
        var imp = s.impact === 'positive' ? { c:'positive', g:'▲' }
                : s.impact === 'negative' ? { c:'negative', g:'▼' }
                : { c:'neutral', g:'•' };
        var links = [];
        var m = s.media || null;
        var mediaUrl = m && m.url ? m.url : null;
        if (mediaUrl) {
          var isX = m.type === 'x_post';
          var glyph, txt;
          if (m.type === 'video') { var _vk = (typeof window._slVideoKindWord === 'function') ? window._slVideoKindWord(m) : ''; glyph = '▶'; txt = 'Watch ' + _vk + 'video' + (m.timestamp ? ' · ' + esc(m.timestamp) : ''); }
          else if (isX)           { glyph = '𝕏'; txt = 'View post'; }
          else if (m.type === 'facebook') { glyph = '📘'; txt = 'View Facebook post'; }
          else if (m.type === 'audio') { glyph = '🎧'; txt = 'Listen'; }
          else if (m.type === 'text')  { glyph = '📄'; txt = 'Read'; }
          else { glyph = '🔗'; txt = 'Open'; }
          var ttl = m.label ? ' title="' + esc(m.label) + '"' : '';
          links.push('<a href="' + esc(mediaUrl) + '" target="_blank" rel="noopener" class="evd-media-link' +
            (isX ? ' is-x' : '') + '"' + ttl + '>' + glyph + ' ' + txt + '</a>');
        }
        // All-Seeing Eye cue when this on-record item is backed by video.
        if (typeof window._pdxItemVideo === 'function' && typeof window._pdxVideoEye === 'function') {
          var _spotVid = window._pdxItemVideo(s);
          if (_spotVid) links.unshift(window._pdxVideoEye(_spotVid, { stop: false }));
        }
        // Show the citation when it adds a distinct destination beyond the media.
        if (s.source && s.source.url && (!mediaUrl || s.source.url !== mediaUrl)) {
          links.push('<a href="' + esc(s.source.url) + '" target="_blank" rel="noopener" class="evd-src-link" title="' +
            esc(s.source.label || 'Source') + '">🔗 ' + esc(s.source.label || 'Source') + '</a>');
        }
        var dateBit = s.date ? ' <span style="color:#5f7da6;font-weight:400;">· ' + esc(s.date) + '</span>' : '';
        return '<div class="evd-spot">' +
            '<div class="evd-spot-head">' +
              '<span class="evd-spot-impact ' + imp.c + '" aria-hidden="true">' + imp.g + '</span>' +
              '<span class="evd-spot-headline">' + esc(s.headline) + dateBit +
              '</span>' +
            '</div>' +
            (links.length ? '<div class="evd-spot-links">' + links.join('') + '</div>' : '') +
          '</div>';
      }

      function renderProm(pr) {
        var v = String(pr.verdict || 'pending').toLowerCase();
        var vm = VERDICT_META[v] || VERDICT_META.pending;
        return '<div class="evd-prom">' +
            '<span class="evd-prom-dot ' + vm.cls + '" aria-hidden="true"></span>' +
            '<span>' + esc(pr.title) +
              '<span class="evd-prom-verdict ' + vm.cls + '">· ' + vm.label + '</span>' +
            '</span>' +
          '</div>';
      }

      function renderCard(e) {
        var read = readFor(e);
        var pos = e.position;
        // Stance lane
        var stanceLane;
        if (pos) {
          var sm = STANCE_META[pos.stance] || STANCE_META.mixed;
          stanceLane =
            '<div class="evd-stance-badge ' + sm.cls + '">' + sm.ico + ' ' + sm.label + '</div>' +
            '<p class="evd-stance-text">' + esc(pos.text || pos.topic || '') + '</p>';
        } else {
          stanceLane = '<p class="evd-empty-line">No curated stance written yet — surfaced here so the gap is visible, not hidden.</p>';
        }
        // Promises lane
        var promLane = e.promises.length
          ? e.promises.map(renderProm).join('')
          : '<p class="evd-empty-line">No promises tagged to this issue yet.</p>';
        // Recorded lane
        var spotLane = e.spotlight.length
          ? e.spotlight.map(renderSpot).join('')
          : '<p class="evd-empty-line">No recorded statements or actions tagged yet.</p>';

        // On-record items live in the Evidence Locker — when this issue has any,
        // offer a direct, pre-filtered jump straight to them.
        var lockerLink = '';
        if (e.spotlight.length) {
          var jsId = String(id == null ? '' : id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var jsIk = String(e.issueKey == null ? '' : e.issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          lockerLink = '<button type="button" class="evd-locker-link" ' +
            'onclick="window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + jsId + '\',issue:\'' + jsIk + '\'});">' +
            '📚 View ' + e.spotlight.length + ' in the Digital Library ↗</button>';
        }

        return '<div id="' + window._pdxEvAnchor(id, e.issueKey) + '" class="evd-card ' + read.cls + '">' +
            '<div class="evd-head">' +
              '<span class="evd-head-ico" aria-hidden="true">' + issueIco(e.issueKey) + '</span>' +
              '<span class="evd-head-label">' + esc(issueLabel(e.issueKey)) + '</span>' +
              '<span class="evd-read ' + read.cls + '">' + read.label + '</span>' +
            '</div>' +
            '<div class="evd-lanes">' +
              '<div class="evd-lane"><div class="evd-lane-h">📌 Stated stance</div>' + stanceLane + '</div>' +
              '<div class="evd-lane"><div class="evd-lane-h">🤝 Promises<span class="evd-lane-n">' + e.promises.length + '</span></div>' + promLane + '</div>' +
              '<div class="evd-lane"><div class="evd-lane-h">🔦 On record<span class="evd-lane-n">' + e.spotlight.length + '</span></div>' + spotLane + '</div>' +
            '</div>' +
            lockerLink +
          '</div>';
      }

      // Rank issues by how much CONNECTED evidence they carry, so the richest,
      // most useful issues lead and stance-only / thin ones fall to the bottom.
      var entries = keys.map(function(k){ return map[k]; });
      function richness(e) {
        return (e.promises.length + e.spotlight.length) * 10 +
               (e.position ? 1 : 0) +
               e.spotlight.reduce(function(n,s){ return n + (s.media && s.media.url ? 1 : 0); }, 0);
      }
      entries.sort(function(a,b){ return richness(b) - richness(a); });

      // Totals for the scannable summary line.
      var totStance = 0, totProm = 0, totSpot = 0, totMedia = 0, totConnected = 0;
      entries.forEach(function(e){
        if (e.position) totStance++;
        totProm += e.promises.length;
        totSpot += e.spotlight.length;
        totMedia += e.spotlight.filter(function(s){ return s.media && s.media.url; }).length;
        if (e.promises.length || e.spotlight.length) totConnected++;
      });

      // Nothing connected anywhere — the Key Issue Stances section already
      // carries the bare positions, so don't add an empty duplicate here.
      if (!totProm && !totSpot) return '';

      var sumChips = '';
      sumChips += '<span class="evd-sum-chip"><span class="evd-sum-ico">🧩</span>' + totConnected + ' connected issue' + (totConnected === 1 ? '' : 's') + '</span>';
      if (totStance) sumChips += '<span class="evd-sum-chip"><span class="evd-sum-ico">📌</span>' + totStance + ' stance' + (totStance === 1 ? '' : 's') + '</span>';
      if (totProm) sumChips += '<span class="evd-sum-chip"><span class="evd-sum-ico">🤝</span>' + totProm + ' promise' + (totProm === 1 ? '' : 's') + '</span>';
      if (totSpot) sumChips += '<span class="evd-sum-chip"><span class="evd-sum-ico">🔦</span>' + totSpot + ' on record</span>';
      if (totMedia) sumChips += '<span class="evd-sum-chip"><span class="evd-sum-ico">▶</span>' + totMedia + ' with video / post</span>';

      // Cards are ranked by how much connected evidence they carry, so the first few
      // are the ones worth reading. Those stay open; the rest of the connected cards
      // fold, and the stance-only tail folds separately with its own honest label.
      // Each card is a three-lane grid — stance, promises, on-record — so an official
      // with a dozen documented issues used to put a dozen of them on screen before
      // the next section started. Nothing is dropped and no count is rounded down:
      // the summary chips above still tally every card behind both lids, and a chip
      // anywhere on the profile still jumps straight into one (see _pdxJumpEvidence).
      var lead = entries.filter(function(e){ return e.promises.length || e.spotlight.length; });
      var tail = entries.filter(function(e){ return !(e.promises.length || e.spotlight.length); });
      // Two open, not three. This section is now explicitly the supporting layer
      // under the Official Record, so it opens with a sample and keeps the rest
      // one tap away rather than printing a third of the file inline.
      var EV_OPEN = 2;
      var leadHtml = lead.slice(0, EV_OPEN).map(renderCard).join('');
      var restLead = lead.slice(EV_OPEN);
      if (restLead.length) {
        leadHtml += '<!--PDXSP:lid id="ev-rest" label="Show ' + restLead.length +
          ' more connected issue' + (restLead.length === 1 ? '' : 's') + '" defer-->' +
          restLead.map(renderCard).join('') + '<!--PDXSP:/lid-->';
      }
      var tailBlock = tail.length
        ? '<!--PDXSP:lid id="ev-thin" label="Show ' + tail.length + ' stance' +
            (tail.length === 1 ? '' : 's') + ' with no connected record yet" defer-->' +
            tail.map(renderCard).join('') + '<!--PDXSP:/lid-->'
        : '';

      return '<div class="modal-section">' +
          '<div class="modal-section-title" style="justify-content:space-between;">' +
            '<span style="display:inline-flex;align-items:center;gap:0.45rem;">🧩 Connected Evidence</span>' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(159,180,212,0.12);border:1px solid rgba(159,180,212,0.2);color:#7596c0;padding:0.12rem 0.5rem;border-radius:999px;">' + entries.length + ' issue' + (entries.length === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<p class="modal-section-sub">What ' + esc(first) + ' said, promised and put on record, issue by issue — the documents behind the verdict above, not a second read of it.</p>' +
          (sumChips ? '<div class="evd-summary">' + sumChips + '</div>' : '') +
          leadHtml +
          tailBlock +
          '<p class="evd-foot-note">Built only from ' + esc(first) + '\'s own documented positions, tracked promises and recorded items — never their party\'s record. “On record” links open the original source.</p>' +
        '</div>';
    } catch (e) {
      if (window.console && console.warn) console.warn('evidence view failed', e);
      return '';
    }
  };


  // ── Connected-evidence quick-access (Promises ↔ Issue Positions ↔ Evidence) ──
  // The Connected Evidence section above groups everything by issue; these helpers
  // let an individual Promise or Issue Position card link STRAIGHT to its matching
  // issue card there — surfacing the floor video / on-record proof right where the
  // user is reading the claim. Scoped, like the section itself, to sitting Utah
  // State Legislators, and only shown when real connected evidence exists.

  // Stable DOM id for one issue's card inside the Connected Evidence section, so a
  // promise/stance chip and that card agree on the same anchor.
  window._pdxEvAnchor = function(id, issueKey) {
    return 'evd-issue-' + String(id || '').replace(/[^a-z0-9_-]/gi, '') +
      '-' + String(issueKey || '').replace(/[^a-z0-9_-]/gi, '');
  };

  // Smooth-scroll to an issue's Connected Evidence card and pulse it briefly so the
  // jump is obvious. No-ops cleanly when the anchor isn't on the page.
  window._pdxJumpEvidence = function(anchorId) {
    try {
      // The card being aimed at may sit under a lid, and on a rich profile it may not
      // be in the document at all yet. Mount it, then open whatever is shut above it,
      // before asking where it is — otherwise a promise chip that has a perfectly good
      // receipt behind it does nothing when tapped.
      if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget(anchorId);
      var el = document.getElementById(anchorId);
      if (!el) return;
      _pdxOpenClosedChain(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var prev = el.style.boxShadow;
      el.style.transition = 'box-shadow 0.45s ease';
      el.style.boxShadow = '0 0 0 2px rgba(245,200,66,0.6)';
      setTimeout(function() { el.style.boxShadow = prev || ''; }, 1500);
    } catch (e) {}
  };

  // Per-issue evidence tallies from the shared map (kept identical to the counts
  // the Connected Evidence cards show).
  function _pdxEvCounts(e) {
    var spot = (e && Array.isArray(e.spotlight)) ? e.spotlight : [];
    var prom = (e && Array.isArray(e.promises)) ? e.promises : [];
    return {
      spotN:  spot.length,
      promN:  prom.length,
      videoN: spot.filter(function(s) { return s.media && s.media.type === 'video'; }).length,
      postN:  spot.filter(function(s) { return s.media && s.media.type === 'x_post'; }).length,
      fbN:    spot.filter(function(s) { return s.media && s.media.type === 'facebook'; }).length
    };
  }

  // Pick the single STRONGEST piece of attached proof across the items on one
  // issue, resolved to a directly-openable link. Official video wins, then a
  // social post (X, then Facebook), then audio/text. The watchable URL lives on
  // `media.url` for posts and committee clips, but floor-video records keep it on
  // `source.url` with only the medium + timestamp on `media` — so this recovers it
  // either way (the same rule _slEvidenceRow uses). Supporting (positive-impact)
  // items break ties so the link a promise leads with is the one that actually
  // backs it. Returns null when no item carries an openable media link, so callers
  // can stay honest about thin evidence and show only the lighter "see related" jump.
  function _pdxIssueBestMedia(e) {
    var spot = (e && Array.isArray(e.spotlight)) ? e.spotlight : [];
    var rank = { video: 5, x_post: 3, facebook: 2, audio: 1, text: 0 };
    var best = null, bestScore = -1;
    spot.forEach(function(s) {
      if (!s) return;
      var m = s.media || null;
      var st = String(s.sourceType || '');
      var type = (m && m.type) ? m.type
               : (/x_post|tweet/.test(st) ? 'x_post'
               : /facebook|fb_post/.test(st) ? 'facebook'
               : /video/.test(st) ? 'video'
               : /audio/.test(st) ? 'audio' : '');
      if (!type || rank[type] == null) return;
      var url = (m && m.url) ? m.url : (s.source && s.source.url ? s.source.url : '');
      if (!url) return;
      var score = rank[type] * 2 + (s.impact === 'positive' ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { type: type, url: url, timestamp: (m && m.timestamp) || '',
          label: (m && m.label) || '', headline: s.headline || '' };
      }
    });
    return best;
  }

  // A direct, one-tap link to a single piece of attached evidence — the proof
  // itself, opening immediately in a new tab rather than scrolling the reader to
  // a panel to hunt for it. Mirrors the glyphs, colors and "▶ Watch · 24:42"
  // wording of the Spotlight evidence row so video/post links read the same
  // everywhere. Returns '' when there's nothing openable.
  function _pdxDirectMediaLink(m, stop) {
    if (!m || !m.url) return '';
    var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
    var MAP = {
      video:  { g: '▶',  col: '245,200,66',  txt: 'Watch official video' },
      x_post: { g: '𝕏', col: '139,160,190', txt: 'View the post' },
      facebook: { g: '📘', col: '146,166,232', txt: 'View Facebook post' },
      audio:  { g: '🎧', col: '167,139,250', txt: 'Listen' },
      text:   { g: '📄', col: '120,180,140', txt: 'Read the source' }
    };
    var md = MAP[m.type] || { g: '🔗', col: '117,150,192', txt: 'Open source' };
    var label;
    if (m.type === 'video') {
      var vk = (typeof window._slVideoKindWord === 'function') ? window._slVideoKindWord(m) : '';
      label = 'Watch ' + (vk || 'official ') + 'video' + (m.timestamp ? ' · ' + esc(m.timestamp) : '');
    } else {
      label = md.txt;
    }
    var ttl = m.label ? esc(m.label) : (m.headline ? esc(m.headline) : md.txt);
    return '<a href="' + esc(m.url) + '" target="_blank" rel="noopener" onclick="' + stop + '" title="' + ttl + '" ' +
      'style="cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:rgb(' + md.col + ');background:rgba(' + md.col + ',0.14);border:1px solid rgba(' + md.col + ',0.45);padding:0.14rem 0.55rem;border-radius:999px;line-height:1.3;">' + md.g + ' ' + label + ' ↗</a>';
  }

  // The subtle quick-access cue itself. When the issue carries openable proof it
  // LEADS with a direct media link (official video / X post, one tap to the
  // receipt), then offers a lighter "see all connected" jump to the Connected
  // Evidence card. With on-record items but no openable link, it shows just the
  // jump — honest about thinner evidence. `context` tunes the wording and jump
  // direction for a promise vs a stance.
  function _pdxEvChip(id, e, context) {
    if (!e || !e.issueKey) return '';
    var c = _pdxEvCounts(e);
    var anchor = window._pdxEvAnchor(id, e.issueKey);
    var jump = "event.stopPropagation();window._pdxJumpEvidence&&window._pdxJumpEvidence('" + anchor + "');";
    var stop = "event.stopPropagation();";
    // Strongest openable proof on this issue — the link the cue leads with.
    var directLink = _pdxDirectMediaLink(_pdxIssueBestMedia(e), stop);
    var col, text, title, arrow;
    if (context === 'promise') {
      // A promise links to the recorded statements/actions that back or test it.
      // The Connected Evidence section sits ABOVE the Promise Tracker, so point up.
      if (!c.spotN) return '';
      arrow = ' ↑';
      if (c.videoN) { col = '245,200,66'; text = 'See ' + c.spotN + ' on record';
        title = 'Jump to the official video and on-record items tied to this promise’s issue.'; }
      else if (c.postN) { col = '139,160,190'; text = 'See ' + c.spotN + ' on record';
        title = 'Jump to the posts and on-record items tied to this promise’s issue.'; }
      else if (c.fbN) { col = '146,166,232'; text = 'See ' + c.spotN + ' on record';
        title = 'Jump to the Facebook posts and on-record items tied to this promise’s issue.'; }
      else { col = '167,139,250'; text = '🔦 See ' + c.spotN + ' on record';
        title = 'Jump to the recorded statements and actions tied to this promise’s issue.'; }
    } else {
      // A stance links to all the promises + on-record items on the same issue.
      // The Connected Evidence section sits just BELOW the stances, so point down.
      var total = c.promN + c.spotN;
      if (!total) return '';
      arrow = ' ↓';
      text = '🧩 See ' + total + ' connected' + (c.videoN && !directLink ? ' · ▶ video' : '');
      col = '117,150,192';
      title = 'See the promises and on-record items — video and posts where available — connected to this position.';
    }
    var chip = '<button type="button" onclick="' + jump + '" title="' + title + '" ' +
      'style="cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:rgb(' + col + ');background:rgba(' + col + ',0.1);border:1px solid rgba(' + col + ',0.34);padding:0.14rem 0.55rem;border-radius:999px;line-height:1.3;">' + text + arrow + '</button>';
    // Wrap so the direct link (primary) and the jump (secondary) sit inline and
    // wrap cleanly on narrow / mobile screens.
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;margin-top:0.45rem;">' + directLink + chip + '</div>';
  }
  // Exposed for _pdxStanceEvidenceLink, which now lives in stance-helpers.js.
  window._pdxEvChip = _pdxEvChip;

  // Resolve the issue bucket a promise belongs to (by its own issueKey, falling
  // back to a title match the way _issueEvidenceMap does), then render the chip.
  window._pdxPromiseEvidenceLink = function(id, p, pr) {
    try {
      if (!pr) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var ik = pr.issueKey;
      if (!ik || !map[ik]) {
        var t = String(pr.title || '').trim().toLowerCase();
        for (var k in map) {
          if ((map[k].promises || []).some(function(x) { return String(x.title || '').trim().toLowerCase() === t; })) { ik = k; break; }
        }
      }
      if (!ik || !map[ik]) return '';
      return _pdxEvChip(id, map[ik], 'promise');
    } catch (e) { return ''; }
  };

  <!-- Stance-at-a-Glance rendering helpers moved to stance-helpers.js -->


  // ── Camera-eye · video-evidence indicator ─────────────────────────────────
  // A small video-camera icon with an eye in the lens used to flag that VERIFIED
  // VIDEO proof — floor or committee footage — is attached to a specific item.
  // It reads as a plain "tap to watch" action, not a mystical symbol. It is
  // deliberately reserved for video: text-only citations and social posts never
  // get one, so the cue stays meaningful. The three helpers below resolve the
  // watchable link for each surface, then `_pdxVideoEye` renders the icon as a
  // one-tap link (jumping to the timestamp when one exists) with a "Watch video
  // evidence" tooltip. All return '' / null when there is no real video, so
  // callers can drop them in unconditionally.

  // Inline SVG: a video camera outline with an eye looking out of the lens —
  // reads instantly as "video evidence available, tap to watch" rather than a
  // mystical symbol. Camera body + viewfinder hump + record dot frame an almond
  // eye and pupil sitting inside the lens ring. Uses currentColor so the gold
  // theme + glow come entirely from the .pdx-eye CSS.
  var _PDX_EYE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
      '<rect x="2" y="7" width="20" height="13" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M8.2 7 L9.5 4.6 L14.5 4.6 L15.8 7 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="13.6" r="4.7" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8.6 13.6 C10 11.9 14 11.9 15.4 13.6 C14 15.3 10 15.3 8.6 13.6 Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="13.6" r="1.55" fill="currentColor"/>' +
      '<circle cx="18.4" cy="9.6" r="0.95" fill="currentColor"/>' +
    '</svg>';

  function _pdxEyeEsc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(s);
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
    });
  }

  <!-- _pdxItemVideo + _pdxIssueVideo moved to stance-helpers.js -->

  // Same as _pdxIssueVideo, but recovers a promise's issueKey by title the way
  // _pdxPromiseEvidenceLink does, so a live record whose promise lost its key
  // still lights up.
  window._pdxPromiseVideo = function(id, p, pr) {
    try {
      if (!pr || typeof window._issueEvidenceMap !== 'function') return null;
      var map = window._issueEvidenceMap(id, p) || {};
      var ik = pr.issueKey;
      if (!ik || !map[ik]) {
        var t = String(pr.title || '').trim().toLowerCase();
        for (var k in map) {
          if ((map[k].promises || []).some(function(x){ return String(x.title || '').trim().toLowerCase() === t; })) { ik = k; break; }
        }
      }
      return (ik && map[ik]) ? window._pdxIssueVideo(id, p, ik) : null;
    } catch (e) { return null; }
  };

  <!-- _pdxVideoEye moved to stance-helpers.js -->

  // A bigger, unmissable gold "Watch Video" pill (eye + label + timestamp) for
  // use inside contexts that are themselves buttons/rows — Stance at a Glance and
  // the Home Team views — where a plain anchor would be invalid or get lost. It
  // is a span that opens the in-app player on tap/Enter and never triggers the
  // row it sits on. Returns '' when there's no watchable clip.
  window._pdxWatchPill = function (video, opts) {
    if (!video || !video.url) return '';
    opts = opts || {};
    var jsUrl = String(video.url).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var jsTs = String(video.timestamp || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var open = 'event.stopPropagation();event.preventDefault();window._pdxOpenVideo(\'' + jsUrl + '\',{timestamp:\'' + jsTs + '\'});';
    var tip = 'Watch video evidence' + (video.timestamp ? ' — jumps to ' + _pdxEyeEsc(video.timestamp) : '');
    var ts = video.timestamp ? '<span class="pdx-watch-pill-ts">' + _pdxEyeEsc(video.timestamp) + '</span>' : '';
    var label = opts.label || 'Watch Video';
    return '<span class="pdx-watch-pill ' + (opts.cls || '') + '" role="link" tabindex="0" title="' + tip +
      '" aria-label="' + tip + '" onclick="' + open + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + open + '}">' +
      '<span class="pdx-eye pdx-watch-pill-eye" aria-hidden="true">' + _PDX_EYE_SVG + '</span>' +
      '<span class="pdx-watch-pill-txt">' + label + '</span>' + ts + '</span>';
  };

  // ── In-app HLS video player ────────────────────────────────────────────
  // Plays a le.utah.gov floor/committee citation inline instead of bouncing the
  // visitor to the heavy desktop archive page (which on phones frequently failed
  // to start the clip). It resolves the underlying HLS stream + start offset via
  // the /api/leg-video function, then plays it with native HLS on iOS/Safari and
  // hls.js everywhere else, seeked to the exact moment. If anything fails, the
  // official archive is offered as a one-tap fallback so evidence is never lost.
  window._pdxIsLegVideoUrl = function (u) {
    return /le\.utah\.gov\/av\/(floor|committee)Archive\.jsp/i.test(String(u || ''));
  };

  // Deep-link a YouTube URL to a cited moment. A pinpoint timestamp is one of the
  // things the Evidence Strength score rewards, but for a YouTube clip it was only
  // ever shown as a label — the link still opened the video at 0:00. This appends
  // YouTube's own `t=<seconds>s` start parameter so a cited "24:42" actually jumps
  // there. Accepts "mm:ss" / "h:mm:ss" (or bare seconds); returns the URL unchanged
  // for a non-YouTube link, a missing timestamp, or a URL that already has a start.
  window._pdxYtDeepLink = function (url, ts) {
    var u = String(url || '');
    if (!u || !ts || !/youtu\.?be|youtube\.com/i.test(u) || /[?&#]t=/.test(u)) return u;
    var parts = String(ts).trim().split(':');
    var secs = 0;
    for (var i = 0; i < parts.length; i++) {
      var n = parseInt(parts[i], 10);
      if (isNaN(n)) return u;
      secs = secs * 60 + n;
    }
    if (!secs) return u;
    return u + (u.indexOf('?') === -1 ? '?' : '&') + 't=' + secs + 's';
  };

  (function () {
    var modal, videoEl, hls, lastFocus;
    var HLS_LIB = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js';
    var libState = 0, libCbs = []; // 0 idle · 1 loading · 2 ready · 3 failed

    function fmt(sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      var mm = (h && m < 10) ? '0' + m : '' + m;
      var ss = s < 10 ? '0' + s : '' + s;
      return (h ? h + ':' + mm : mm) + ':' + ss;
    }

    function ensureLib(cb) {
      if (window.Hls) { cb(true); return; }
      libCbs.push(cb);
      if (libState === 1) return;
      libState = 1;
      var s = document.createElement('script');
      s.src = HLS_LIB; s.async = true;
      s.onload = function () { libState = 2; libCbs.splice(0).forEach(function (f) { f(!!window.Hls); }); };
      s.onerror = function () { libState = 3; libCbs.splice(0).forEach(function (f) { f(false); }); };
      document.head.appendChild(s);
    }

    function ensureModal() {
      if (modal) return;
      modal = document.createElement('div');
      modal.className = 'pdx-vid-modal';
      modal.id = 'pdx-vid-modal';
      modal.setAttribute('hidden', '');
      var eye = (typeof _PDX_EYE_SVG === 'string') ? _PDX_EYE_SVG : '';
      modal.innerHTML =
        '<div class="pdx-vid-backdrop" data-pdx-vid-dismiss></div>' +
        '<div class="pdx-vid-box" role="dialog" aria-modal="true" aria-label="Video evidence player">' +
          '<div class="pdx-vid-head">' +
            '<span class="pdx-eye" aria-hidden="true">' + eye + '</span>' +
            '<div class="pdx-vid-htext">' +
              '<div class="pdx-vid-kicker">▶ Video evidence</div>' +
              '<div class="pdx-vid-title"></div>' +
            '</div>' +
            '<button type="button" class="pdx-vid-close" aria-label="Close video" data-pdx-vid-dismiss>&times;</button>' +
          '</div>' +
          '<div class="pdx-vid-stage">' +
            '<video class="pdx-vid-el" playsinline controls preload="metadata"></video>' +
            '<div class="pdx-vid-state">' +
              '<div class="pdx-vid-spinner"></div>' +
              '<div class="pdx-vid-state-msg">Loading official video…</div>' +
            '</div>' +
          '</div>' +
          '<div class="pdx-vid-foot">' +
            '<span class="pdx-vid-ts"></span>' +
            '<a class="pdx-vid-srclink" target="_blank" rel="noopener">Open on le.utah.gov ↗</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      videoEl = modal.querySelector('.pdx-vid-el');
      modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-pdx-vid-dismiss]')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) close();
      });
    }

    function setState(visible, msg, fallbackUrl) {
      var st = modal.querySelector('.pdx-vid-state');
      if (!visible) { st.setAttribute('hidden', ''); return; }
      st.removeAttribute('hidden');
      var html = fallbackUrl
        ? '<div class="pdx-vid-state-msg">' + _pdxEyeEsc(msg) + '</div>' +
          '<a class="pdx-vid-open-official" target="_blank" rel="noopener" href="' +
          _pdxEyeEsc(fallbackUrl) + '"><span aria-hidden="true">▶</span> Watch on le.utah.gov</a>'
        : '<div class="pdx-vid-spinner"></div><div class="pdx-vid-state-msg">' + _pdxEyeEsc(msg) + '</div>';
      st.innerHTML = html;
    }

    function teardown() {
      try { if (hls) { hls.destroy(); hls = null; } } catch (e) {}
      if (videoEl) {
        try { videoEl.pause(); } catch (e) {}
        try { videoEl.removeAttribute('src'); videoEl.load(); } catch (e) {}
      }
    }

    function close() {
      if (!modal) return;
      teardown();
      modal.setAttribute('hidden', '');
      document.body.classList.remove('pdx-vid-open');
      try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
    }

    function seekAndPlay(offset) {
      var done = false;
      function go() {
        if (done) return; done = true;
        if (offset > 0) { try { videoEl.currentTime = offset; } catch (e) {} }
        var pr = videoEl.play();
        if (pr && pr.catch) pr.catch(function () {}); // muted-autoplay rules; controls remain
      }
      videoEl.addEventListener('loadedmetadata', go, { once: true });
      setTimeout(go, 2000); // safety if metadata already cached
    }

    function play(src, offset, archiveUrl) {
      offset = offset || 0;
      // Native HLS (iOS Safari, macOS Safari) — no library needed.
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = src;
        setState(false);
        seekAndPlay(offset);
        return;
      }
      ensureLib(function (ok) {
        if (ok && window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ startPosition: offset > 0 ? offset : -1 });
          hls.loadSource(src);
          hls.attachMedia(videoEl);
          hls.on(window.Hls.Events.MANIFEST_PARSED, function () { setState(false); seekAndPlay(offset); });
          hls.on(window.Hls.Events.ERROR, function (evt, data) {
            if (data && data.fatal) {
              teardown();
              setState(true, 'This video could not stream in the app. It will play on the official archive.', archiveUrl);
            }
          });
        } else {
          // Last resort: hand the element the stream directly.
          videoEl.src = src;
          setState(false);
          seekAndPlay(offset);
        }
      });
    }

    window._pdxOpenVideo = function (url, opts) {
      opts = opts || {};
      if (!url) return;
      if (!window._pdxIsLegVideoUrl(url)) { window.open(window._pdxYtDeepLink(url, opts.timestamp), '_blank', 'noopener'); return; }
      ensureModal();
      lastFocus = document.activeElement;
      teardown();
      modal.removeAttribute('hidden');
      document.body.classList.add('pdx-vid-open');
      modal.querySelector('.pdx-vid-title').textContent = opts.title || 'Official floor / committee video';
      var srcLink = modal.querySelector('.pdx-vid-srclink');
      srcLink.href = url;
      var tsEl = modal.querySelector('.pdx-vid-ts');
      tsEl.textContent = opts.timestamp ? 'Jumps to ' + opts.timestamp : '';
      setState(true, 'Loading official video…');

      fetch('/api/leg-video?url=' + encodeURIComponent(url))
        .then(function (r) { return r.ok ? r.json() : r.json().then(function (d) { throw new Error(d && d.error || 'unavailable'); }); })
        .then(function (data) {
          if (!data || !data.hls) throw new Error('No stream');
          if (data.title) modal.querySelector('.pdx-vid-title').textContent = data.title;
          if (!opts.timestamp && data.offset) tsEl.textContent = 'Jumps to ' + fmt(data.offset);
          play(data.hls, data.offset || 0, url);
        })
        .catch(function () {
          setState(true, 'Watch this clip on the official Utah Legislature archive.', url);
        });
    };
  })();

  // Catch every other floor/committee video link on the page — the "Watch video"
  // buttons in evidence rows, banners, Spotlight, Stance at a Glance and the Home
  // Team views are plain <a href> to the archive — and route them through the same
  // in-app player. Capture phase runs before each link's own onclick (some call
  // stopPropagation), and modifier-click / middle-click still open a normal tab.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !window._pdxIsLegVideoUrl(a.getAttribute('href') || a.href)) return;
    e.preventDefault();
    e.stopPropagation();
    var ts = a.getAttribute('data-pdx-vts') || '';
    window._pdxOpenVideo(a.href, { timestamp: ts });
  }, true);



  // ── Shared evidence surfacing ─────────────────────────────────────────
  // One set of helpers that put the gold All-Seeing Eye, a direct "Watch" jump
  // to the strongest clip, and a one-tap "See Evidence" jump into the
  // pre-filtered Evidence Locker on every card and modal — so a voter never has
  // to hunt for video proof or the on-record file. The Evidence Locker only
  // indexes current sitting Utah State Legislators, so the locker CTA is gated
  // to them (_pdxHasLocker); the direct video eye shows wherever a real clip
  // exists. Both stay silent when there's nothing on record.

  // Decorative gold All-Seeing Eye (non-link) for labelling an evidence CTA.
  window._pdxEyeGlyph = function (cls) {
    return '<span class="pdx-eye ' + (cls || '') + '" aria-hidden="true">' + _PDX_EYE_SVG + '</span>';
  };

  // Per-politician evidence tally: total on-record items, video clips (+ the
  // best watchable one), social posts, tied promises, issues touched. Memoised
  // per id and keyed on whether the full profile has loaded, so re-renders
  // across the many card surfaces don't recompute the map, while a lite→full
  // upgrade still refreshes the count.
  var _pdxEvSumCache = {};
  window._pdxEvidenceSummary = function (pid) {
    var loaded = !!(window._pdxFullIds && window._pdxFullIds.has && window._pdxFullIds.has(pid));
    var c = _pdxEvSumCache[pid];
    if (c && c.loaded === loaded) return c.val;
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var r = { items: 0, videos: 0, posts: 0, promises: 0, issues: 0, best: null, bestIssueKey: null };
    if (d && typeof window._issueEvidenceMap === 'function') {
      try {
        var p = (window.PROFILES && window.PROFILES[pid]) ? window.PROFILES[pid] : d;
        var map = window._issueEvidenceMap(pid, p) || {};
        for (var k in map) {
          var e = map[k];
          var spot = e.spotlight || [];
          if (spot.length) r.issues++;
          r.items += spot.length;
          r.promises += (e.promises || []).length;
          spot.forEach(function (s) {
            var v = (typeof window._pdxItemVideo === 'function') ? window._pdxItemVideo(s) : null;
            if (v) { r.videos++; if (!r.best || (v.timestamp && !r.best.timestamp)) { r.best = v; r.bestIssueKey = k; } }
            else { var m = s.media; if (m && (m.type === 'x_post' || m.type === 'facebook')) r.posts++; }
          });
        }
      } catch (err) {}
    }
    _pdxEvSumCache[pid] = { loaded: loaded, val: r };
    return r;
  };

  // Is the Evidence Locker populated for this politician? (It indexes current
  // sitting Utah State Legislators.) Gates whether the locker "See Evidence" CTA
  // is offered, so the jump never opens an empty file.
  window._pdxHasLocker = function (pid) {
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var p = (window.PROFILES && window.PROFILES[pid]) ? window.PROFILES[pid] : d;
    if (!p) return false;
    // Offered when the Locker actually holds something for this person. The old
    // office test was the one call site in this family that did NOT check data, so
    // it promised a file to legislators with none and hid a real one from everyone
    // else — the Locker index itself was never Utah-scoped.
    return !!(typeof window._pdxHasIssueEvidence === 'function' && window._pdxHasIssueEvidence(pid, p));
  };

  // Authoritative count of items filed in the Evidence Locker for this politician,
  // summed from the loaded library index (_pdxEvidenceIssueCountsForPerson). This
  // is the true number a voter sees once they open the Locker, so the card count
  // and the filtered library agree. Returns null while the library is still
  // loading (the underlying count fn returns null until then) so callers can fall
  // back to their own spotlight tally and never guess a number.
  window._pdxLockerItemCount = function (pid) {
    if (!pid || typeof window._pdxEvidenceIssueCountsForPerson !== 'function') return null;
    var counts = window._pdxEvidenceIssueCountsForPerson(pid);
    if (!counts) return null;
    var n = 0;
    for (var k in counts) n += counts[k];
    return n;
  };

  // JS-string-escape a raw politician id for an inline onclick (the Locker
  // filters on the unsanitized id, so it must pass through verbatim).
  function _pdxEvJsId(pid) {
    return String(pid == null ? '' : pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // Compact evidence row for any politician card (small/medium, Relevant to Me,
  // favourites, compare). Gold All-Seeing Eye + video count jumping straight to
  // the strongest clip, plus a one-tap "See Evidence" into the pre-filtered
  // Locker. Returns '' when there is neither a watchable clip nor a lockable file.
  window._pdxEvidenceRow = function (pid, opts) {
    opts = opts || {};
    var t = window._pdxEvidenceSummary(pid);
    var hasLocker = window._pdxHasLocker(pid);
    // Prefer the real Evidence Locker tally over the spotlight-derived count, so
    // the "See Evidence" jump appears for every sitting legislator who actually
    // has filed records — even when none have been pulled into a Spotlight yet —
    // and the number shown matches what the filtered Locker opens to. Falls back
    // to the spotlight count while the library loads; the honesty gate still
    // holds (a legislator with zero filed items shows no locker CTA).
    var lockerN = (hasLocker && typeof window._pdxLockerItemCount === 'function') ? window._pdxLockerItemCount(pid) : null;
    var itemN = (lockerN !== null) ? lockerN : t.items;
    var showLocker = !!(hasLocker && itemN);
    var hasWatch = !!(t.videos && t.best && t.best.url);
    if (!hasWatch && !showLocker) return '';
    var jsId = _pdxEvJsId(pid);
    var html = '';
    if (hasWatch && typeof window._pdxVideoEye === 'function') {
      var eye = window._pdxVideoEye(t.best, { stop: true, cls: 'pdx-evrow-eye' });
      var ts = t.best.timestamp ? '<span class="pdx-evrow-ts">@ ' + _pdxEyeEsc(t.best.timestamp) + '</span>' : '';
      html += '<a href="' + _pdxEyeEsc(t.best.url) + '" target="_blank" rel="noopener" class="pdx-evrow-watch" ' +
        'onclick="event.stopPropagation();" title="Watch the strongest video evidence on record" ' +
        'aria-label="Watch video evidence">' + eye +
        '<span class="pdx-evrow-watch-txt">Watch ' + (t.videos > 1 ? '<strong>' + t.videos + '</strong> Videos' : 'Video') + '</span>' + ts + '</a>';
    }
    if (showLocker) {
      html += '<button type="button" class="pdx-evrow-see' + (hasWatch ? '' : ' is-solo') + '" ' +
        'onclick="event.stopPropagation();window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + jsId + '\'});" ' +
        'aria-label="See the evidence on record — opens the Evidence Locker filtered to this official">' +
        window._pdxEyeGlyph('pdx-evrow-see-eye') + 'See Evidence <span class="pdx-evrow-see-n">' + itemN + '</span> ↗</button>';
    }
    return '<div class="pdx-evrow">' + html + '</div>';
  };

  // Prominent evidence banner for the medium + full profile modals: the same gold
  // All-Seeing Eye and direct-Watch / See-Evidence actions as the card row, but
  // weightier, so evidence is impossible to miss the moment a profile opens.
  window._pdxEvidenceBanner = function (pid, opts) {
    opts = opts || {};
    var t = window._pdxEvidenceSummary(pid);
    var hasLocker = window._pdxHasLocker(pid);
    // Same authoritative-count preference as the card row: when the Locker library
    // has loaded, use its true item count for both the gate and the headline so the
    // banner agrees with the filtered Locker; fall back to the spotlight tally until
    // then.
    var lockerN = (hasLocker && typeof window._pdxLockerItemCount === 'function') ? window._pdxLockerItemCount(pid) : null;
    var itemN = (lockerN !== null) ? lockerN : t.items;
    var showLocker = !!(hasLocker && itemN);
    var hasWatch = !!(t.videos && t.best && t.best.url);
    if (!hasWatch && !showLocker) return '';
    var jsId = _pdxEvJsId(pid);
    var _d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var _p = (window.PROFILES && window.PROFILES[pid]) ? window.PROFILES[pid] : _d;
    var first = (_p && _p.name) ? String(_p.name).split(' ')[0] : 'this official';
    var fullName = (_p && _p.name) ? _p.name : first;
    var openLocker = "window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:'" + jsId + "'});";
    var counts = [];
    if (t.videos) counts.push('<span class="pdx-evb-chip is-video">' + window._pdxEyeGlyph('pdx-evb-chip-eye') + '<strong>' + t.videos + '</strong> video' + (t.videos === 1 ? '' : 's') + '</span>');
    if (t.posts) counts.push('<span class="pdx-evb-chip">𝕏 ' + t.posts + ' post' + (t.posts === 1 ? '' : 's') + '</span>');
    if (t.promises) counts.push('<span class="pdx-evb-chip">🤝 ' + t.promises + ' promise' + (t.promises === 1 ? '' : 's') + '</span>');

    // Featured-video context — the issue the strongest clip ties to (from cached
    // evidence metadata), or a neutral "Latest floor video" when it carries no tag.
    var vctx = '';
    if (hasWatch) {
      var vlabel = (t.bestIssueKey && typeof window._issueLabel === 'function') ? (window._issueLabel(t.bestIssueKey) || '') : '';
      var kindWord = (t.best.kind ? (t.best.kind.charAt(0).toUpperCase() + t.best.kind.slice(1) + ' ') : 'Latest floor ');
      var vtext = vlabel ? ('Video on ' + vlabel) : (kindWord + 'video');
      vctx = '<div class="pdx-evb-vctx"><span class="pdx-evb-vctx-ico" aria-hidden="true">▶</span>' + _pdxEyeEsc(vtext) +
        (t.best.timestamp ? ' <span class="pdx-evb-vctx-ts">@ ' + _pdxEyeEsc(t.best.timestamp) + '</span>' : '') + '</div>';
    }

    var watchBtn = '';
    if (hasWatch) {
      var ts = t.best.timestamp ? ' <span class="pdx-evb-ts">@ ' + _pdxEyeEsc(t.best.timestamp) + '</span>' : '';
      watchBtn = '<a href="' + _pdxEyeEsc(t.best.url) + '" target="_blank" rel="noopener" class="pdx-evb-watch" ' +
        'onclick="event.stopPropagation();" aria-label="Watch the strongest video evidence">' +
        '<span class="pdx-evb-watch-ico" aria-hidden="true">▶</span> Watch Video' + ts + '</a>';
    }
    var seeBtn = '';
    if (showLocker) {
      seeBtn = '<button type="button" class="pdx-evb-see' + (hasWatch ? '' : ' is-primary') + '" ' +
        'onclick="event.stopPropagation();' + openLocker + '" ' +
        'aria-label="Open the Evidence Locker filtered to this official">📂 See Evidence · ' + itemN + ' ↗</button>';
    }

    // The headline count is itself a jump into the filtered Locker (only where the
    // Locker actually holds a file; a watch-only banner keeps it as plain text).
    //
    // `opts.archive` reframes the same banner as the END of the evidence path
    // rather than the top of the profile. Read at the top, "142 pieces of evidence
    // on record" is a headline tally — a second big number competing with the one
    // score, and one that says nothing about whether the person kept their word.
    // Read in the receipts stage, after the stances and feeds that cite this
    // material item by item, the honest framing is "here is the raw file those
    // citations came out of". Same gate, same counts, same actions; only the two
    // lines of framing copy change, and only where the caller asks for it.
    var archive = !!opts.archive;
    var label = itemN
      ? (archive
          ? ('The full file · ' + itemN + ' item' + (itemN === 1 ? '' : 's'))
          : (itemN + ' piece' + (itemN === 1 ? '' : 's') + ' of evidence on record'))
      : (archive ? 'The full video file' : 'Video evidence on record');
    var kicker = archive
      ? '📂 Everything cited above, in one place'
      : '📹 Video &amp; evidence on record';
    var headline = showLocker
      ? '<button type="button" class="pdx-evb-headline-btn" onclick="event.stopPropagation();' + openLocker + '" ' +
          'title="Open the Evidence Locker filtered to this official" ' +
          'aria-label="Open the Evidence Locker filtered to ' + _pdxEyeEsc(fullName) + '">' +
          '<span class="pdx-evb-headline">' + label + '</span>' +
          '<span class="pdx-evb-headline-cue" aria-hidden="true">open file ↗</span></button>'
      : '<div class="pdx-evb-headline">' + label + '</div>';

    var browse = showLocker
      ? '<button type="button" class="pdx-evb-browse" onclick="event.stopPropagation();' + openLocker + '" ' +
          'aria-label="Browse all evidence for ' + _pdxEyeEsc(fullName) + ' in the Evidence Locker">' +
          'Browse all evidence for ' + _pdxEyeEsc(first) + ' <span aria-hidden="true">→</span></button>'
      : '';

    return '<div class="pdx-evb">' +
        '<div class="pdx-evb-icon" aria-hidden="true">' + window._pdxEyeGlyph('pdx-evb-icon-eye') + '</div>' +
        '<div class="pdx-evb-main">' +
          '<div class="pdx-evb-kicker">' + kicker + '</div>' +
          headline +
          (counts.length ? '<div class="pdx-evb-counts">' + counts.join('') + '</div>' : '') +
          vctx +
        '</div>' +
        '<div class="pdx-evb-actions">' + watchBtn + seeBtn + '</div>' +
        browse +
      '</div>';
  };

  // ── View Full Stance Record ──────────────────────────────────────────
  // One prominent, impossible-to-miss jump to the complete per-issue record —
  // every documented position, its curated-evidence depth, connected promises /
  // on-record items, and an honest "No record yet" for the gaps. It is the escape
  // hatch that lets "Stance at a Glance" and "Key Issue Stances" stay the clean
  // summarized views. The CTA and its destination read ONLY from already-cached
  // sources (the resolved stance list, window._issueEvidenceMap, and the loaded
  // Evidence Locker depth index), so there is no new network cost.

  <!-- _pdxStanceRecordStats moved to stance-helpers.js -->

  window._pdxStanceRecordCta = function (id, p) {
    try {
      p = p || {};
      var s = window._pdxStanceRecordStats(id, p);
      var jsId = _pdxEvJsId(id);
      var thinRecord = !s.tracked;
      // Thin profiles still get the button — the label simply tells the honest
      // truth that the record is in progress (and the overlay shows the gaps).
      var title = thinRecord ? 'View Full Record — still being built' : 'View the Full Record on the Issues';
      // TWO NUMBERS, EACH NAMED FOR THE LIST IT COUNTS. The formal one leads where
      // it is larger — it is the reason this button is worth pressing on an
      // officeholder — and the curated one follows, so neither is mistaken for the
      // other. Where there is no formal record the line is exactly what it was.
      var statText = (s.formal > s.tracked)
        ? (s.formal + ' issue' + (s.formal === 1 ? '' : 's') + ' on the formal record' +
            (s.tracked ? ' <span class="pdx-fsr-dot" aria-hidden="true">•</span> ' + s.tracked + ' with a stated position' : ''))
        : (s.tracked
          ? (s.tracked + ' issue' + (s.tracked === 1 ? '' : 's') + ' tracked' +
              (s.withEvidence ? ' <span class="pdx-fsr-dot" aria-hidden="true">•</span> ' + s.withEvidence + ' with evidence' : ''))
          : 'Every issue + honest gaps');
      return '<div class="modal-section pdx-fsr-wrap">' +
          '<button type="button" class="pdx-fsr-btn" ' +
            'onclick="window._pdxOpenStanceRecord&&window._pdxOpenStanceRecord(\'' + jsId + '\');" ' +
            'aria-label="Open the full record on the issues — every issue the formal record touched, the documented positions beside it, and what is still missing">' +
            '<span class="pdx-fsr-ico" aria-hidden="true">📋</span>' +
            '<span class="pdx-fsr-main">' +
              '<span class="pdx-fsr-kicker">The complete picture</span>' +
              '<span class="pdx-fsr-title">' + title + '</span>' +
              '<span class="pdx-fsr-stat">' + statText + '</span>' +
            '</span>' +
            '<span class="pdx-fsr-go" aria-hidden="true">Open ↗</span>' +
          '</button>' +
          // ── The whole-person share slot ──────────────────────────────────
          // Emitted beside the button that opens the record, because the card it
          // shares is a picture of exactly that record: how this politician's
          // stated positions line up with what their formal record did, counted
          // across every issue where both halves exist. It arrives hidden and
          // pending; receipt-cards.js reveals it only if the member clears the
          // comparable-issue floor and REMOVES it otherwise, so a thin profile
          // shows no control at all rather than a control that shares a card
          // built on three issues.
          _pdxWordRecordShareSlot(id) +
        '</div>';
    } catch (e) { return ''; }
  };

  // One place the slot is written, used by both surfaces below — so what the
  // profile offers and what the Full Stance Record offers can never be two
  // different things. Returns '' when the share module is not loaded, which is
  // the honest answer: no module, no card, no button.
  window._pdxWordRecordShareSlot = function (id) {
    try {
      var RC = window.PDXReceiptCards;
      if (!RC || typeof RC.buttonHtml !== 'function') return '';
      var html = RC.buttonHtml({ pid: id, whole: true, block: true, stopKeys: true });
      if (!html) return '';
      // The sweep runs on content that was still a string when the last one went
      // past. Deferred to the next task rather than called inline for the same
      // reason every other host surface defers it: this markup is not in the DOM
      // yet.
      try {
        setTimeout(function () {
          try { if (RC.hydrate) RC.hydrate(document); } catch (e) {}
        }, 0);
      } catch (e) {}
      return '<div class="pdx-fsr-share">' + html + '</div>';
    } catch (e) { return ''; }
  };

  <!-- _pdxStanceRecordMiniLink moved to stance-helpers.js -->

  // Sort / filter state for the open record overlay (re-render on change).
  window._pdxRecordState = null;

  window._pdxOpenStanceRecord = function (id) {
    try {
      if (!id) return;
      var overlay = document.getElementById('pdx-record-overlay');
      if (!overlay) return;
      var p = (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id]
            : ((typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ? CMP_DATA[id] : {});
      window._pdxRecordState = { id: id, sort: 'strength', view: 'all' };
      overlay.innerHTML = window._pdxStanceRecordBody(id, p);
      overlay.style.display = 'flex';
      try { overlay.scrollTop = 0; } catch (e) {}
      // Deep-linkable hash, without disturbing the ?p=<id> profile param.
      try {
        var want = '#record/' + encodeURIComponent(id);
        if (location.hash !== want) history.replaceState(null, '', location.pathname + location.search + want);
      } catch (e) {}
      // Fill any depth pills that rendered before the Locker library finished loading.
      if (typeof window._pdxEnhanceDepthPills === 'function') { try { window._pdxEnhanceDepthPills(overlay); } catch (e) {} }
    } catch (e) { if (window.console && console.warn) console.warn('stance record open failed', e); }
  };

  window._pdxCloseStanceRecord = function (opts) {
    opts = opts || {};
    var overlay = document.getElementById('pdx-record-overlay');
    if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
    window._pdxRecordState = null;
    if (opts.keepHash !== true) {
      try { if (String(location.hash || '').indexOf('#record/') === 0) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
  };

  // ── THE OVERLAY, WHEN THE VOTE RECORD LANDS ───────────────────────────────
  // The formal index is built from the voting-record cache, which arrives
  // asynchronously — a reader who opens this overlay during that fetch sees the
  // curated list and a formal index that is empty or short, and it never fills.
  // The engine already announces the arrival; this listens for it and rebuilds the
  // body once, for the profile it is showing, keeping the reader's scroll position.
  try {
    window.addEventListener('pdx-voting-warm', function (ev) {
      try {
        var st = window._pdxRecordState;
        if (!st || !st.id) return;
        var pid = ev && ev.detail && ev.detail.pid;
        if (pid && String(pid) !== String(st.id)) return;
        var ov = document.getElementById('pdx-record-overlay');
        if (!ov || ov.style.display === 'none') return;
        var top = ov.scrollTop;
        var pp = (window.PROFILES && window.PROFILES[st.id]) ? window.PROFILES[st.id]
              : ((typeof CMP_DATA !== 'undefined' && CMP_DATA[st.id]) ? CMP_DATA[st.id] : {});
        ov.innerHTML = window._pdxStanceRecordBody(st.id, pp);
        try { ov.scrollTop = top; } catch (e2) {}
        if (typeof window._pdxEnhanceDepthPills === 'function') window._pdxEnhanceDepthPills(ov);
      } catch (e) {}
    });
  } catch (e) {}

  // Re-render the overlay after a sort/filter change.
  window._pdxRecordSet = function (key, val) {
    if (!window._pdxRecordState) return;
    window._pdxRecordState[key] = val;
    var st = window._pdxRecordState;
    var overlay = document.getElementById('pdx-record-overlay');
    if (!overlay) return;
    var p = (window.PROFILES && window.PROFILES[st.id]) ? window.PROFILES[st.id]
          : ((typeof CMP_DATA !== 'undefined' && CMP_DATA[st.id]) ? CMP_DATA[st.id] : {});
    overlay.innerHTML = window._pdxStanceRecordBody(st.id, p);
    if (typeof window._pdxEnhanceDepthPills === 'function') { try { window._pdxEnhanceDepthPills(overlay); } catch (e) {} }
  };

  // The full record body — a unified per-issue table built from documented
  // positions + connected evidence + curated Locker receipts. Works on every
  // profile: thin ones simply show honest "No record yet" rows.
  window._pdxStanceRecordBody = function (id, p) {
    p = p || {};
    var st = window._pdxRecordState || { sort: 'strength', view: 'all' };
    function esc(s) {
      if (s == null) return '';
      if (typeof window._slEsc === 'function') return window._slEsc(s);
      return String(s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; });
    }
    var name = p.name || 'This official';
    var first = String(name).split(' ')[0] || 'They';
    var jsId = _pdxEvJsId(id);

    var stanceList = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
    var evMap = (typeof window._issueEvidenceMap === 'function') ? (window._issueEvidenceMap(id, p) || {}) : {};
    var depth = (typeof window._pdxEvidenceDepthForPerson === 'function') ? window._pdxEvidenceDepthForPerson(id) : null;
    var hasLocker = (typeof window._pdxHasLocker === 'function') ? window._pdxHasLocker(id) : false;

    var rows = {};
    function rowFor(k) {
      if (!rows[k]) rows[k] = { issueKey: k, topic:'', icon:'', stance:'', text:'',
        promises:0, onrecord:0, media:0, receipts:0 };
      return rows[k];
    }
    var topicOnly = [];
    stanceList.forEach(function (s) {
      if (!s || !s.topic) return;
      if (!s.issueKey) { topicOnly.push(s); return; }
      var r = rowFor(s.issueKey);
      r.topic = s.topic; r.icon = s.icon || ''; r.stance = s.pos || s.issueStance || ''; r.text = s.text || '';
    });
    Object.keys(evMap).forEach(function (k) {
      var e = evMap[k]; var r = rowFor(k);
      r.promises = (e.promises || []).length;
      r.onrecord = (e.spotlight || []).length;
      r.media = (e.spotlight || []).filter(function (x) { return x.media && x.media.url; }).length;
      if (!r.topic && e.position) { r.topic = e.position.topic || ''; r.icon = r.icon || e.position.icon || ''; r.text = r.text || e.position.text || ''; }
      if (!r.stance && e.position && e.position.stance) r.stance = e.position.stance;
    });
    if (depth) Object.keys(depth).forEach(function (k) {
      var dd = depth[k]; var r = rowFor(k);
      r.receipts = dd.count || 0;
      if (!r.topic && dd.label) r.topic = dd.label;
    });

    function issueLabel(k, fallback) {
      var l = (typeof window._issueLabel === 'function') ? window._issueLabel(k) : '';
      l = l || fallback || k;
      var parts = String(l).trim().split(/\s+/);
      if (parts.length > 1 && /[^\x00-\x7F]/.test(parts[0])) parts.shift();
      return parts.join(' ');
    }
    function issueIco(k, fallback) {
      if (fallback) return fallback;
      var lbl = (typeof window._issueLabel === 'function') ? window._issueLabel(k) : '';
      var head = String(lbl || '').trim().split(/\s+/)[0] || '';
      return (head && /[^\x00-\x7F]/.test(head)) ? head : '🎯';
    }

    var STANCE_META = {
      support:  { cls:'fsrec-support',  ico:'✓', label:'Supports' },
      oppose:   { cls:'fsrec-oppose',   ico:'✗', label:'Opposes' },
      mixed:    { cls:'fsrec-mixed',    ico:'~', label:'Mixed' },
      tracking: { cls:'fsrec-tracking', ico:'…', label:'Tracking' },
      priority: { cls:'fsrec-tracking', ico:'★', label:'Priority' }
    };

    var list = Object.keys(rows).map(function (k) { return rows[k]; });
    function richness(r) { return (r.receipts * 4) + (r.onrecord * 3) + (r.promises * 2) + r.media + (r.stance ? 1 : 0); }
    function hasRecord(r) { return !!(r.receipts || r.onrecord || r.promises); }

    if (st.sort === 'az') {
      list.sort(function (a, b) { return issueLabel(a.issueKey, a.topic).toLowerCase().localeCompare(issueLabel(b.issueKey, b.topic).toLowerCase()); });
    } else {
      list.sort(function (a, b) { return richness(b) - richness(a); });
    }

    function renderRow(r) {
      var sm = STANCE_META[r.stance] || STANCE_META.tracking;
      var lbl = issueLabel(r.issueKey, r.topic);
      var ico = r.icon || issueIco(r.issueKey, r.icon);
      var depthPill = (typeof window._pdxEvidenceDepthPill === 'function') ? window._pdxEvidenceDepthPill(id, r.issueKey, { format: 'receipts' }) : '';
      var chips = [];
      if (r.onrecord) chips.push('<span class="fsrec-chip">🔦 ' + r.onrecord + ' on record</span>');
      if (r.promises) chips.push('<span class="fsrec-chip">🤝 ' + r.promises + ' promise' + (r.promises === 1 ? '' : 's') + '</span>');
      if (r.media) chips.push('<span class="fsrec-chip is-video">▶ ' + r.media + ' clip' + (r.media === 1 ? '' : 's') + '</span>');
      var rec = hasRecord(r);
      var noRec = !rec && !depthPill;
      // EVERY ISSUE-KEYED ROW IS A DOOR. This used to read `(rec || r.receipts)`,
      // where every term counts CURATED material — so an issue the official has a
      // formal voting record on, but that nobody has written up yet, rendered as an
      // inert <div>. Those are exactly the record-only, thin and split rows, and
      // exactly the ones whose dossier has the most to show. The dossier exists for
      // any issueKey; the row's job is to reach it.
      var clickable = !!r.issueKey;
      var rowId = 'pdxfsrec-' + String(id) + '-' + String(r.issueKey || '');
      var tag = noRec ? '<span class="fsrec-norec">○ No record yet</span>' : '';
      // A row that carries evidence but no summarised position is itself a gap —
      // label it honestly so the adjacent suggest cue reads in context.
      var unsum = (rec && !r.stance) ? '<span class="fsrec-norec is-soft">Evidence on file · no position summarised yet</span>' : '';
      // Quiet "Suggest a receipt" on-ramp — shown ONLY on genuine gaps: a row with
      // no record at all, or one with evidence but no summarised position. Rows
      // with a documented stance backed by a record (strong evidence) never get
      // it. Reuses the global _pdxSuggestReceipt deep-link; no new request.
      function jsAttr(s) { return esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')); }
      var showSuggest = !!r.issueKey && (noRec || !r.stance);
      var suggest = showSuggest
        ? '<span class="fsrec-suggest" role="button" tabindex="0" ' +
            'onclick="event.stopPropagation();window._pdxSuggestReceipt&&window._pdxSuggestReceipt(\'' + jsAttr(r.issueKey) + '\',\'' + jsAttr(lbl) + '\',\'' + jsAttr(name) + '\');" ' +
            'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();this.click();}" ' +
            'title="Suggest a receipt or track this issue for ' + esc(first) + ' on ' + esc(lbl) + ' in the Community Exchange">＋ Suggest a receipt</span>'
        : '';
      // The NAME is the accessible door — a real <button>, one focus stop, one
      // accessible name — and the row around it is the pointer target. That split
      // is not cosmetic: the row used to BE the <button>, and the evidence depth
      // pill inside it is itself a <button>. HTML forbids that nesting, so the
      // parser closed the row button at the pill and threw everything after it —
      // the chips, the "No record yet" tag, the suggest cue and the ↗ chevron —
      // out of the row as loose siblings. The rows that broke were precisely the
      // ones with receipts, which is why the failure looked intermittent and why
      // it was worst on the deepest profiles. Nothing interactive nests here now.
      var door = clickable
        ? ' data-pdxst-dos="' + esc(r.issueKey) + '" data-pdxst-pid="' + esc(id) + '"' +
          ' data-pdxst-origin="' + esc(rowId) + '"'
        : '';
      var nameHtml = clickable
        ? '<button type="button" class="fsrec-row-label fsrec-row-door"' + door +
            ' aria-label="Open the issue dossier: ' + esc(lbl) + ' — ' + esc(first) + '">' + esc(lbl) + '</button>'
        : '<span class="fsrec-row-label">' + esc(lbl) + '</span>';
      var inner = '<span class="fsrec-row-ico" aria-hidden="true">' + ico + '</span>' +
        '<span class="fsrec-row-main">' +
          '<span class="fsrec-row-top">' + nameHtml +
            (r.stance ? '<span class="fsrec-badge ' + sm.cls + '">' + sm.ico + ' ' + sm.label + '</span>' : '') + '</span>' +
          (r.text ? '<span class="fsrec-row-text">' + esc(r.text) + '</span>' : '') +
          '<span class="fsrec-row-meta">' + (depthPill || '') + chips.join('') + tag + unsum + suggest + '</span>' +
        '</span>' +
        (clickable ? '<span class="fsrec-row-go" aria-hidden="true">↗</span>' : '');
      if (clickable) {
        return '<div class="fsrec-row is-click" id="' + esc(rowId) + '"' + door + '>' + inner + '</div>';
      }
      return '<div class="fsrec-row">' + inner + '</div>';
    }
    function renderTopicOnly(s) {
      var sm = STANCE_META[s.pos] || STANCE_META.tracking;
      return '<div class="fsrec-row">' +
        '<span class="fsrec-row-ico" aria-hidden="true">' + (s.icon || '🎯') + '</span>' +
        '<span class="fsrec-row-main">' +
          '<span class="fsrec-row-top"><span class="fsrec-row-label">' + esc(s.topic) + '</span>' +
            '<span class="fsrec-badge ' + sm.cls + '">' + sm.ico + ' ' + sm.label + '</span></span>' +
          (s.text ? '<span class="fsrec-row-text">' + esc(s.text) + '</span>' : '') +
          '<span class="fsrec-row-meta"><span class="fsrec-norec">○ No connected record yet</span></span>' +
        '</span></div>';
    }

    // ── Classify every row for the stat row + the segmented Show filter ──────
    // leadRows carry some kind of record (receipts / on-record / promises);
    // thinRows carry none. A row is a "gap" when it lacks a documented stance
    // backed by a record — that's an unstated issue, a stated position with
    // nothing connected yet, or evidence on file not summarised into a position.
    var leadRows = list.filter(hasRecord);
    var thinRows = list.filter(function (r) { return !hasRecord(r); });
    var leadGaps = leadRows.filter(function (r) { return !r.stance; });
    var withRec = leadRows.length;
    var total = list.length + topicOnly.length;
    var documentedCount = list.filter(function (r) { return r.stance; }).length + topicOnly.length;
    var gapsCount = thinRows.length + topicOnly.length + leadGaps.length;
    // Community discussions — straight from the cached per-politician comment
    // count (no new network). W in the stat row, and a tappable gold chip.
    var commentN = (typeof _commentCounts !== 'undefined' && _commentCounts[id]) ? _commentCounts[id] : 0;

    var view = (st.view === 'evidence' || st.view === 'gaps') ? st.view : 'all';

    // ── THE FORMAL RECORD, IN FULL ────────────────────────────────────────────
    // Everything above this line is CURATED: documented stance cards, the evidence
    // map, the receipt-depth index. That is why this overlay opened at seven issues
    // on a senator whose roll-call record runs to sixty-four — it was listing what
    // we have written down, under a title promising what they have done.
    //
    // So the formal record gets its own list, built by the consistency engine from
    // the same row model the profile's stance rows use, with the same pattern chips
    // and the same dossier doors. It is rendered ABOVE the curated list because it
    // is the longer and more complete answer to the question the title asks; the
    // curated list keeps every control and every on-ramp it had, one heading down.
    //
    // The engine owns its own filters and re-renders itself in place, so nothing
    // here has to know about them. It is handed this overlay's Sort state so one
    // Sort control governs both lists rather than two disagreeing about the order.
    var fpiHtml = '', fpiN = 0;
    try {
      var FPI = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      if (FPI) {
        fpiN = FPI.count(id) || 0;
        fpiHtml = FPI.html(id, { sort: (st.sort === 'az' ? 'az' : 'strength') }) || '';
      }
    } catch (e) { fpiHtml = ''; fpiN = 0; }

    // Rows actually rendered for the active Show filter, and the count shown in
    // the live result note. "Gaps only" drops every documented-stance-with-record
    // row, leaving the honest gaps + unsummarised rows the suggest cues live on.
    var bodyHtml, shownCount;
    if (view === 'evidence') {
      bodyHtml = leadRows.map(renderRow).join('');
      shownCount = leadRows.length;
    } else if (view === 'gaps') {
      bodyHtml = leadGaps.map(renderRow).join('') + thinRows.map(renderRow).join('') + topicOnly.map(renderTopicOnly).join('');
      shownCount = gapsCount;
    } else {
      bodyHtml = leadRows.map(renderRow).join('') + thinRows.map(renderRow).join('') + topicOnly.map(renderTopicOnly).join('');
      shownCount = total;
    }

    // Quick stats — an instant read on how complete (or thin) the record is
    // before scrolling. Same muted pill language as the rest of the surface.
    var summary = '<div class="fsrec-summary">' +
        '<span class="fsrec-sum-chip"><b>' + documentedCount + '</b> documented position' + (documentedCount === 1 ? '' : 's') + '</span>' +
        '<span class="fsrec-sum-chip is-ev"><b>' + withRec + '</b> with evidence</span>' +
        '<span class="fsrec-sum-chip is-thin"><b>' + gapsCount + '</b> gap' + (gapsCount === 1 ? '' : 's') + '</span>' +
        // The count that used to be missing from this row entirely: how many issues
        // their FORMAL record touched, which on most officeholders is several times
        // the number of documented cards above it.
        (fpiN ? '<span class="fsrec-sum-chip is-formal">🏛 <b>' + fpiN + '</b> issue' + (fpiN === 1 ? '' : 's') + ' on the formal record</span>' : '') +
        (commentN
          ? '<button type="button" class="fsrec-sum-chip is-community" onclick="event.stopPropagation();window.openCommentModal&&openCommentModal(\'' + jsId + '\')" title="Read &amp; add community discussion for ' + esc(first) + '">💬 <b>' + commentN + '</b> active community discussion' + (commentN === 1 ? '' : 's') + '</button>'
          : '<span class="fsrec-sum-chip is-thin is-community">💬 <b>0</b> community discussions</span>') +
      '</div>';

    // Sort on the left, the segmented Show filter on the right — grouped so the
    // bar reads as two scannable clusters. "Gaps only" is easy to find but quiet.
    function segBtn(val, lbl, gapStyle) {
      var on = (view === val);
      return '<button type="button" class="fsrec-segbtn' + (on ? ' is-on' : '') + (gapStyle ? ' is-gaps' : '') + '" ' +
        'onclick="window._pdxRecordSet&&window._pdxRecordSet(\'view\',\'' + val + '\')"' +
        (on ? ' aria-pressed="true"' : '') + '>' + lbl + '</button>';
    }
    var controls = '<div class="fsrec-controls">' +
        '<div class="fsrec-sortset" role="group" aria-label="Sort the record">' +
          '<span class="fsrec-ctrl-lbl">Sort</span>' +
          '<button type="button" class="fsrec-sortbtn' + (st.sort === 'strength' ? ' is-on' : '') + '" onclick="window._pdxRecordSet&&window._pdxRecordSet(\'sort\',\'strength\')">Strongest first</button>' +
          '<button type="button" class="fsrec-sortbtn' + (st.sort === 'az' ? ' is-on' : '') + '" onclick="window._pdxRecordSet&&window._pdxRecordSet(\'sort\',\'az\')">A–Z</button>' +
        '</div>' +
        '<div class="fsrec-filterset" role="group" aria-label="Filter the record">' +
          '<span class="fsrec-ctrl-lbl">Show</span>' +
          '<div class="fsrec-seg">' +
            segBtn('all', 'All', false) +
            segBtn('evidence', 'With evidence', false) +
            segBtn('gaps', 'Gaps only', true) +
          '</div>' +
        '</div>' +
      '</div>';

    // Live result count — what the active filter is showing vs. the whole record.
    var viewNote = view === 'gaps' ? ' · gaps only' : (view === 'evidence' ? ' · with evidence' : '');
    var resultNote = '<p class="fsrec-result-note">Showing <b>' + shownCount + '</b> of ' + total + ' tracked issue' + (total === 1 ? '' : 's') + viewNote + '</p>';

    // Prominent Evidence-blue header action — the one obvious jump into the full
    // evidence file. _pdxOpenEvidenceLocker already dismisses this overlay, so the
    // politician-filtered results land in view immediately. Cached deep-link only.
    var headLocker = (hasLocker)
      ? '<button type="button" class="fsrec-head-locker" onclick="window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + jsId + '\'});" ' +
          'aria-label="Browse all evidence for ' + esc(first) + ' in the Evidence Locker">📂 Browse all evidence in the Locker <span aria-hidden="true">→</span></button>'
      : '';

    // The heading that keeps the two lists from reading as one. Only printed when
    // the formal index is actually above it — on a profile with no formal record
    // the curated list is the whole surface and needs no divider.
    var curatedHead = fpiHtml
      ? '<div class="fsrec-curated-h"><span class="fsrec-curated-t">' +
          '<span aria-hidden="true">📑</span> Documented positions &amp; receipts</span>' +
          '<span class="fsrec-curated-s">' + documentedCount + ' issue' + (documentedCount === 1 ? '' : 's') +
          ' someone has written up for ' + esc(first) + ' — their stated words, the receipts connected to ' +
          'them, and the honest gaps. The formal record above is the longer list.</span></div>'
      : '';

    var content;
    if (!total && !fpiHtml) {
      content = '<div class="fsrec-empty"><span aria-hidden="true">📋</span>' +
        '<p>No documented positions or evidence are on record for ' + esc(first) + ' yet. As statements, votes and receipts are verified and tagged, they’ll appear here — this view stays honest about what isn’t known.</p></div>';
    } else if (!total) {
      // A FORMAL RECORD AND NOTHING WRITTEN UP. Before this pass the overlay showed
      // the empty state above over a politician with a full voting record, because
      // "total" only ever counted curated cards. The record is the answer here.
      content = summary + fpiHtml +
        '<div class="fsrec-empty"><span aria-hidden="true">📋</span>' +
        '<p>No documented positions have been written up for ' + esc(first) + ' yet — everything above is what the formal record itself did. As their stated positions are sourced and tagged, they’ll appear here beside it.</p></div>';
    } else if (!shownCount) {
      // Filter selected but nothing matches (e.g. "Gaps only" on a complete record).
      content = summary + fpiHtml + curatedHead + controls +
        '<div class="fsrec-empty"><span aria-hidden="true">✅</span>' +
        '<p>No issues match this filter. ' +
        (view === 'gaps' ? 'Every tracked issue for ' + esc(first) + ' already has a documented position with evidence.' : 'Switch back to “All” to see the full record.') +
        '</p></div>' +
        '<p class="fsrec-foot">Built only from ' + esc(first) + '’s own documented positions, tracked promises and on-record items — never their party’s record. Blue 📂 pills open the Evidence Locker filtered to that issue.</p>';
    } else {
      content = summary + fpiHtml + curatedHead + controls + resultNote +
        '<div class="fsrec-list">' + bodyHtml + '</div>' +
        '<p class="fsrec-foot">Built only from ' + esc(first) + '’s own documented positions, tracked promises and on-record items — never their party’s record. Blue 📂 pills open the Evidence Locker filtered to that issue.</p>';
    }

    return '<div class="fsrec" role="dialog" aria-modal="true" aria-label="Full record on the issues for ' + esc(name) + '" onclick="event.stopPropagation();">' +
        '<div class="fsrec-head">' +
          '<div class="fsrec-headwrap">' +
            '<div class="fsrec-eyebrow">📑 Full Record on the Issues</div>' +
            '<div class="fsrec-title">' + esc(name) + '</div>' +
            (p.office ? '<div class="fsrec-office">' + esc(p.office) + '</div>' : '') +
            headLocker +
            // The same slot, on the surface that shows the formal-pattern index
            // itself. Cheap: one call, the identical guards, and it is where a
            // reader who has just read the rows would look for a way to send
            // them. The arrival path of the card it shares lands right back
            // here.
            window._pdxWordRecordShareSlot(id) +
          '</div>' +
          '<button class="fsrec-x" onclick="window._pdxCloseStanceRecord()" aria-label="Close">✕</button>' +
        '</div>' +
        content +
      '</div>';
  };

  // ── "Suggest a receipt / Track this issue" bridge ─────────────────────
  // A single, low-friction on-ramp that turns a visible gap (a "No record yet"
  // row, a thin profile, a sparse Evidence Locker issue group) into a suggestion
  // flow. It reuses the EXISTING Community Exchange deep-link verbatim
  // (PDXCommunity.openForIssue) — no new submission flow and no network request:
  // the Exchange opens pre-filtered to the issue, with the politician carried as
  // light context so the user lands in the right place. `issueKey` may be empty
  // (thin-profile case) — the Exchange then opens scoped to just the politician.
  window._pdxSuggestReceipt = function (issueKey, label, polName) {
    try { if (typeof window._pdxCloseStanceRecord === 'function') window._pdxCloseStanceRecord(); } catch (e) {}
    try { if (typeof window._pdxElCloseModal === 'function') window._pdxElCloseModal(); } catch (e) {}
    try {
      if (window.PDXCommunity && typeof window.PDXCommunity.openForIssue === 'function') {
        window.PDXCommunity.openForIssue(issueKey || '', label || '', polName || '');
        return;
      }
    } catch (e) {}
    // Last-resort fallback if the Exchange module hasn't initialised yet.
    try { location.hash = '#community-exchange'; } catch (e) {}
  };

  // Build a quiet, reusable "suggest a receipt" cue button (Evidence-blue) for the
  // thin-profile and Evidence-Locker surfaces. `opts.issue`/`opts.issueLabel`
  // pre-filter the Exchange; `name` is carried as politician context. Returns a
  // self-contained button that calls _pdxSuggestReceipt on click.
  window._pdxSuggestCueHtml = function (name, opts) {
    opts = opts || {};
    function esc(s) {
      if (typeof window._slEsc === 'function') return window._slEsc(s);
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; });
    }
    function jsA(s) { return esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')); }
    var label = opts.label || 'Several issues still have no record. Help build it';
    var cls = opts.cls ? ('pdx-suggest-cue ' + opts.cls) : 'pdx-suggest-cue';
    var who = name ? (' for ' + esc(String(name).split(' ')[0])) : '';
    return '<button type="button" class="' + cls + '" ' +
      'onclick="window._pdxSuggestReceipt&&window._pdxSuggestReceipt(\'' + jsA(opts.issue || '') + '\',\'' + jsA(opts.issueLabel || '') + '\',\'' + jsA(name || '') + '\');" ' +
      'title="Open the Community Exchange to suggest a receipt' + who + '">' +
      (opts.ico || '🔎') + ' ' + esc(label) + ' <span aria-hidden="true">→</span></button>';
  };

  // ── Issue-tie chip ───────────────────────────────────────────────────
  // Renders a small chip naming the Alignment Tool issue a Spotlight item is
  // tied to, given an ISSUE_MAP key. This is what makes a Spotlight headline
  // read as connected to the issue positions shown in the Candidate Snapshot:
  // the chip uses the SAME label the Snapshot and Alignment Tool use, so a
  // visitor sees "this news is about the same issue I just read their stance on."
  // Returns '' when the key is missing or unknown, so callers can drop it in
  // unconditionally. `prefix` overrides the lead-in wording.
  window._issueTagHtml = function(issueKey, prefix) {
    try {
      if (!issueKey || typeof ISSUE_MAP === 'undefined' || !ISSUE_MAP || !ISSUE_MAP[issueKey]) return '';
      var lbl = ISSUE_MAP[issueKey].label || 'this issue';
      var lead = prefix || 'On the issue:';
      // The chip wears the issue's own colour (issue-colors.js), so the tie reads
      // as the same issue the reader just saw in the Stance Library or on a Word
      // vs Action row rather than as a generic "related" badge.
      var ic = (window.PDXIssueColors && typeof window.PDXIssueColors.styleFor === 'function')
        ? ' style="' + window.PDXIssueColors.styleFor(issueKey) + '"' : '';
      return '<span class="pdx-issue-tie"' + ic + ' title="This Spotlight item connects to the &quot;' + lbl +
        '&quot; position — compare it in the Alignment Tool.">🔗 ' + lead + ' ' + lbl + '</span>';
    } catch (e) { return ''; }
  };

  // Resolve just the human label for an ISSUE_MAP key (e.g. '💧 Save the Great
  // Salt Lake'). Returns '' for an unknown/missing key so callers can drop it in
  // unconditionally. Used by the full Spotlight modal to label an item's issue
  // bridge with the SAME wording the Snapshot and Alignment Tool show, so a
  // Spotlight headline reads as connected to a position the voter just compared.
  window._issueLabel = function(issueKey) {
    try {
      if (!issueKey || typeof ISSUE_MAP === 'undefined' || !ISSUE_MAP || !ISSUE_MAP[issueKey]) return '';
      return ISSUE_MAP[issueKey].label || '';
    } catch (e) { return ''; }
  };


  // ── The limited-record card (formerly "Candidate Snapshot") ──────────
  // WHAT THIS IS NOW. A member or candidate with no scorable record still needs
  // one thing the shared shell cannot derive: WHY the record is thin. ⚖️ Word vs
  // Action can say "11 documented statements on file and no formal action to
  // test any of them against yet" — it cannot know that the reason is a
  // challenger who has never held the seat, an official three months into a
  // first term, or someone who lost a primary in June. That is what this card
  // explains, plus the two paths that still work without a record (compare on
  // values, follow the Spotlight) and an honest list of what is being gathered.
  //
  // WHAT IT USED TO BE, AND WHY THAT CHANGED. It was "Candidate Snapshot": a
  // full structured overview mounted ABOVE the verdict, opening with a jump
  // index ("One read on <name>, three ways"), a distribution strip of ✓/✗/~
  // chips, and every documented position as its own row with a direction badge,
  // a 🗳 Recorded / 💬 Stated basis tag and an inline match verdict. On a thin
  // member that meant a reader met a summary, a shape, an issue list and a
  // per-issue vocabulary — and then met ⚖️ Word vs Action's summary, shape strip,
  // issue index and four-bucket vocabulary one section later, computed from a
  // different pool and free to disagree. Executive profiles never had the first
  // set, which is precisely why the two lanes did not read as one product.
  //
  // Those four halves are retired here rather than restyled: the shared shell
  // renders them for members exactly as it does for executives. What survives is
  // the half the shell has no way to produce.
  //
  // THE CARD IS DEMOTED TWICE. First under ⚖️ Word vs Action; now under 🌳 All
  // Issues by Topic as well, at the foot of the verdict stage. The first demotion
  // stopped it from answering the score's question before the score did. The
  // second stopped it from standing between a reader and the browse gateway —
  // and this card fires ONLY on the profiles where that gateway is the whole of
  // the substance, so it was delaying the tree on exactly the profiles that had
  // nothing else to offer. The reading order on a thin member is now the reading
  // order on Trump: identity, Direction Match, the issues by topic, and then —
  // where there is a gap to explain — the context for the gap.
  //
  // WHAT IT CARRIES IS ONLY WHAT NOTHING ELSE CAN. Four blocks, not eight: why
  // the record is thin, where the positions are browsed, what the alignment match
  // actually rests on, and what is being gathered. The at-a-glance facts row, the
  // Spotlight sub-card, the duplicate action pair and the foot hint were all
  // restatements of the letterhead, the banners, the rail or the Spotlight, and
  // each one is tombstoned at its old position below.
  //
  // Returns '' for a full record (or on any error) so it never shows there and
  // the caller can cleanly fall back to the plain thin notice.
  window._renderCandidateSnapshot = function(id, p, opts) {
    p = p || {}; opts = opts || {};
    if (!opts.isThin) return '';
    try {
      var name = (p.name || 'This candidate');
      var first = String(name).split(' ')[0] || 'They';
      var is2026 = (typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(p);
      var statusMode = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(p) : 'office';
      var isChallenger = statusMode === 'candidate' ||
        /candidat|challenger|nominee|running/i.test(((p.office || '') + ' ' + (p.state || '')));

      // Stated positions — documented stances are keyed by the same ISSUE_MAP
      // keys the Alignment Tool uses, so each one is an issue the candidate can
      // be compared on by values. Fall back to their key issues as the stated
      // priorities they are campaigning on.
      var stanceList = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
      var keyed = stanceList.filter(function(s) { return s && s.issueKey; });
      var keyIssues = window._pdxKeyIssues(p);
      var trackedIssueCount = keyed.length || keyIssues.length;

      // ── Honest "Limited Record" lede ─────────────────────────────────
      // Only promise "the issues below" when there is actually something there
      // (documented positions or campaign priorities); on a bio-only profile
      // that clause would dangle, so it is dropped.
      var _hasStands = (stanceList.length || keyIssues.length) > 0;
      var _standsClause = _hasStands ? 'starting with where they stand on the issues below, ' : '';
      // A 2026 candidate who lost at convention or withdrew is no longer on the
      // ballot — describing them as actively "running" would be inaccurate. When
      // the record says so (candidacyStatus), the lede tells that story honestly
      // instead and frames any positions below as what they campaigned on.
      var _candStatus = String(p.candidacyStatus || p.status || '').toLowerCase();
      var _lostPrimaryCand = (_candStatus === 'eliminated_primary' || _candStatus === 'lost_primary');
      var _inactiveCand = (_lostPrimaryCand || _candStatus === 'eliminated' || _candStatus === 'withdrew' ||
        _candStatus === 'withdrawn' || _candStatus === 'lost' || _candStatus === 'defeated' ||
        _candStatus === 'suspended' || _candStatus === 'conceded');
      var lede;
      if (isChallenger && _inactiveCand) {
        var _verb = _lostPrimaryCand
          ? 'lost the ' + (is2026 ? '2026 ' : '') + 'primary and is not advancing to the general election'
          : (_candStatus === 'withdrew' || _candStatus === 'withdrawn' || _candStatus === 'suspended')
            ? 'withdrew from the ' + (is2026 ? '2026 ' : '') + 'race before the ballot was set'
            : 'ran in ' + (is2026 ? '2026' : 'this race') + ' but did not advance past the nominating stage';
        lede = first + ' ' + _verb + ', so there is <strong>no governing record to test their word against</strong>. ' +
          (_hasStands
            ? 'What is on this profile is what ' + first + ' campaigned on — their stated positions and priorities, kept here for the record.'
            : 'This profile reflects only what is verifiable from public records, so positions are intentionally left out rather than invented.');
      } else if (isChallenger) {
        lede = first + ' is running' + (is2026 ? ' in 2026' : '') + ' and does not yet hold this office, so <strong>there is no formal record yet to test their word against</strong> — and that\'s expected this early. We\'re building a clear picture of ' + first + '\'s values and positions over time, ' + _standsClause + 'adding votes and sources as the race develops.';
      } else {
        lede = first + ' is early in their term, so <strong>little of their word has been tested by a formal action yet</strong> — having little on file to test this early is normal. We\'re building a clear picture of ' + first + '\'s values and positions over time, ' + _standsClause + 'adding more of their voting record as it develops.';
      }

      // ── THE AT-A-GLANCE FACTS ROW IS RETIRED ──────────────────────────
      // It printed Seat, Party, the next-election date and — for a candidate off
      // the ballot — a Race status chip. Every one of the four is already on the
      // screen above this card, in a surface that owns it:
      //
      //   • Seat      → the letterhead's office eyebrow and district·state line.
      //   • Party     → the letterhead's party chip. Identity, in one place.
      //   • Next election → the election-status banner in the identity stage,
      //     which prints the same label, the same date and a countdown besides.
      //   • Race status  → the candidacy status banner in the identity stage,
      //     which is the loudest thing on the profile when someone is out of the
      //     race, AND this card's own lede, which already says they lost the
      //     primary or left the ballot in a whole sentence.
      //
      // This card had earlier lost its coverage and pledge tallies for the same
      // reason: a count restated in a second vocabulary is a second answer. The
      // facts row was the same mistake in identity data. What is left here is the
      // one thing nothing else on the profile can derive — WHY the record is thin.

      // ── What they stand for ───────────────────────────────────────────
      // THE PER-ISSUE LIST THAT USED TO LIVE HERE IS RETIRED. It rendered every
      // documented position as its own row with a direction badge (✓ Supports /
      // ✗ Opposes / ~ Mixed), a basis tag (🗳 Recorded / 💬 Stated) and, when the
      // visitor had Alignment picks, an inline match verdict (✓ You match / ~
      // Partial / ✗ You differ) — a complete second issue index, with a second
      // per-issue vocabulary, sitting above the one ⚖️ Word vs Action publishes.
      //
      // Two of those words actively collided with the shared bucket language.
      // "Mixed" here meant a stance that points both ways; "Mixed" in the shape
      // strip means the RECORD went both ways on a stance. Same word, same
      // scroll, two different claims. And "Recorded" here meant "this position
      // cites a vote or bill", which is not what "the record backed it up"
      // means anywhere else on the profile.
      //
      // Nothing is lost: the positions themselves render in full in 🧭 Key Issue
      // Stances (with their sources and evidence depth), and the shared issue
      // index below the shape strip is where a reader browses them by outcome.
      // This card now points at both instead of restating either.
      var alignHasUser = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);


      // ── Issue positions (the centerpiece) ─────────────────────────────
      // The heart of a thin profile USED to be a full per-issue list here. It is
      // now a pointer — and the pointer has to name a door that is actually open
      // on THIS profile, which is why it changed.
      //
      // It used to send the reader two places, and on a thin profile neither one
      // was there. "The issue index under ⚖️ Word vs Action" is gated on the
      // two-issue floor, so on the profiles this card renders for it does not
      // draw at all. "Key Issue Stances" stopped being a heading a reader can see
      // when the positions list moved into a deferred drawer whose lid reads
      // "📋 Every documented position" — the named section was gone, sealed and
      // renamed, at the very bottom of the spine.
      //
      // It now names 🌳 All Issues by Topic, which sits directly ABOVE this card,
      // renders on exactly the profiles this card renders on, and opens each
      // issue into the same dossier. One door, and it is open.
      var standsHead, standsBody, posCountPill = '';
      if (stanceList.length) {
        standsHead = '📌 Where ' + first + ' stands';
        posCountPill = '<span class="cs-count-pill">' + stanceList.length + ' position' + (stanceList.length === 1 ? '' : 's') + '</span>';
        standsBody = '<p class="cs-stance-text">' + first + ' has <strong>' + stanceList.length + ' documented position' + (stanceList.length === 1 ? '' : 's') + '</strong> on file. ' +
          'They are grouped by topic in <strong style="color:#d8b4fe;">🌳 All Issues by Topic</strong> just above — including the ones nothing on the formal record can test yet — and each one opens its full record, with sources' +
          (alignHasUser ? ', and is matched issue-by-issue to your picks in <strong style="color:#d8b4fe;">How You Compare</strong> below.' : '.') + '</p>';
      } else if (keyIssues.length) {
        standsHead = '🎯 ' + first + '\'s campaign priorities';
        posCountPill = '<span class="cs-count-pill">' + keyIssues.length + ' issue' + (keyIssues.length === 1 ? '' : 's') + '</span>';
        standsBody = '<div class="cs-pills">' + keyIssues.slice(0, 8).map(function(i) {
          return '<span class="cs-pill-issue">🎯 ' + i + '</span>';
        }).join('') + '</div>' +
        '<p class="cs-stance-text" style="margin-top:0.5rem;">These are the priorities ' + first + ' is campaigning on. Detailed positions and sources are added as they are published.</p>';
      } else {
        // No documented positions AND no campaign priorities — the thinnest case.
        // What we say here depends on WHY the record is thin, so a blank reads as
        // an honest, intentional state rather than a half-built or broken profile.
        standsHead = '🧭 Where ' + first + ' stands';
        if (_inactiveCand) {
          // Off the ballot and nothing surfaced in the public record — say so
          // plainly and make clear the blank is deliberate, not missing data.
          standsBody = '<p class="cs-stance-text">' + first + ' ' +
            ((_candStatus === 'withdrew' || _candStatus === 'suspended') ? 'left the race' : 'did not advance past the nominating stage') +
            ', and no issue positions could be verified from the public record. Rather than invent positions, this profile is <strong>intentionally left blank here</strong> — it will only be updated if sourced statements or votes come to light.</p>';
        } else if (isChallenger) {
          // Active candidate, simply early — honest that positions are coming and
          // will be sourced, never invented, with a path to compare meanwhile.
          standsBody = '<p class="cs-stance-text">' + first + ' is early in the ' + (is2026 ? '2026 ' : '') + 'race and has not yet published detailed issue positions. We add them here only as campaign statements, questionnaires and votes are verified — never invented. In the meantime, you can still compare ' + first + ' to your own values with the Alignment Tool.</p>';
        } else {
          standsBody = '<p class="cs-stance-text">We are gathering ' + first + '\'s stated positions from public statements and the voting record as they are verified. In the meantime, you can still compare ' + first + ' to your own values with the Alignment Tool.</p>';
        }
      }
      var standsBlock = '<div class="cs-block cs-positions" id="cs-block-positions"><div class="cs-block-h">' + standsHead + posCountPill + '</div>' + standsBody + '</div>';

      // ── Alignment Tool connector ──────────────────────────────────────
      // Ties the positions above to the Personalized Alignment Tool. When the
      // visitor has saved picks it shows their match score and points to the
      // full issue-by-issue "How You Compare" breakdown lower in this same
      // profile; otherwise it invites them to set their positions so they can
      // judge the candidate by their own values, not party.
      var userMatch = (alignHasUser && typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(id) : null;
      var matchChip = '';
      if (userMatch !== null) {
        var mc = userMatch >= 70 ? '#4ade80' : userMatch >= 50 ? '#f5c842' : '#f87171';
        matchChip = '<span class="cs-align-match" style="color:' + mc + ';border-color:' + mc + '55;">🎯 ' + userMatch + '% your match</span>';
      }
      var alignText = alignHasUser
        ? ('Your saved Alignment picks are matched against ' + first + '\'s positions, issue by issue — see the full <strong>How You Compare</strong> breakdown below.')
        : (trackedIssueCount > 0
            ? (first + ' has positions on <strong>' + trackedIssueCount + ' issue' + (trackedIssueCount === 1 ? '' : 's') + '</strong> the Alignment Tool tracks. Pick the issues you care about to see, point by point, where you and ' + first + ' line up — by values, not party.')
            : ('Compare ' + first + ' to the issues you care about with the Alignment Tool — and judge them by your values, not their party. Their positions appear here as we document them.'));

      // ── What data powers the match ────────────────────────────────────
      // The honesty layer: when the visitor has picks, pull the same per-issue
      // breakdown the score uses and say plainly whether the number rests on a
      // documented record or an early read from stated priorities. This is what
      // makes the Alignment Tool legible on thin and 2026 candidates — it never
      // claims more certainty than the data behind it supports.
      var alignBd = (alignHasUser && typeof _calcAlignmentBreakdown === 'function') ? _calcAlignmentBreakdown(id) : null;
      var basisHtml = '';
      if (alignBd && alignBd.issues && alignBd.issues.length) {
        var nEv = alignBd.issues.filter(function(it) { return it.hasEvidence; }).length;
        var nTot = alignBd.issues.length;
        var basisText, basisIco;
        if (nEv === 0) {
          basisIco = '🌱';
          basisText = 'This match is an <strong>early read</strong> from ' + first + '\'s stated priorities — there\'s no voting record yet, so it sharpens as positions are verified.';
        } else if (nEv < nTot) {
          basisIco = '📊';
          basisText = '<strong>' + nEv + ' of ' + nTot + '</strong> of your issues are backed by ' + first + '\'s documented positions; the rest are an early read from their stated priorities.';
        } else {
          basisIco = '✅';
          basisText = 'Backed by ' + first + '\'s <strong>documented positions</strong> on all ' + nTot + ' of your selected issue' + (nTot === 1 ? '' : 's') + '.';
        }
        basisHtml = '<p class="cs-align-basis"><span class="cs-align-basis-ico" aria-hidden="true">' + basisIco + '</span><span>' + basisText + '</span></p>';
      } else if (!alignHasUser && trackedIssueCount > 0) {
        basisHtml = '<p class="cs-align-basis"><span class="cs-align-basis-ico" aria-hidden="true">📊</span><span>The comparison is built from ' + first + '\'s <strong>' + trackedIssueCount + ' stated position' + (trackedIssueCount === 1 ? '' : 's') + '</strong> on the issues — an honest values read even before a full voting record exists.</span></p>';
      }

      // ── In-context path to the match ──────────────────────────────────
      // One tap from the Snapshot to the live Alignment result. With picks, it
      // opens the instant issue-by-issue quick view; without, it opens the
      // picker so a first-time visitor can set positions and compare on the spot.
      var alignCtaHtml;
      if (alignHasUser) {
        alignCtaHtml = '<button type="button" class="cs-align-cta" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView){window.keyRacesAlignQuickView(\'' + id + '\');}else{var el=document.getElementById(\'cs-howcompare-anchor\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">🤝 See your issue-by-issue match <span aria-hidden="true">→</span></button>';
      } else {
        alignCtaHtml = '<button type="button" class="cs-align-cta" onclick="event.stopPropagation();closeModal();setTimeout(function(){if(window.alignTogglePanel)window.alignTogglePanel(true);var el=document.getElementById(\'alignment-panel\')||document.getElementById(\'alignment\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});},320);">🎯 Pick your issues to compare <span aria-hidden="true">→</span></button>';
      }

      // THE "NEW TO A CANDIDATE?" TIP IS RETIRED. It explained that officials this
      // early rarely have a long voting record, so the Alignment Tool compares them
      // on stated positions instead. That is the card's own lede, one paragraph up,
      // said again in a tip box — and on a card trimmed to the gap it explains, the
      // repetition was the loudest thing left in it. The basis line below carries
      // the honest part (what the match actually rests on) and keeps it.
      var alignBlock = '<div class="cs-align" id="cs-block-align">' +
        '<div class="cs-align-top"><span class="cs-align-h">🤝 Compare on your values</span>' + matchChip + '</div>' +
        '<p class="cs-align-text">' + alignText + '</p>' +
        basisHtml +
        alignCtaHtml +
      '</div>';

      // ── THE SPOTLIGHT SUB-CARD IS RETIRED ─────────────────────────────
      // It rendered the lead Spotlight item inside this card — a badge, a teaser,
      // an issue tag, and a bridge note pointing out when a recent update touched
      // an issue the candidate holds a position on — plus a "Monitoring"
      // placeholder when there was no story to show at all.
      //
      // The Spotlight is its own surface on this profile and it is a better one:
      // it carries every story, not the top one, with dates and sources. Repeating
      // its lead here bought a duplicate at the cost of two more screens between a
      // thin-record explanation and the end of it — and the placeholder variant
      // spent a whole sub-card saying that nothing had happened yet, on the one
      // card whose entire subject is that nothing has happened yet.
      //
      // Nothing moved and nothing was deleted: window._krBuildSpotlight and the
      // Spotlight surface it feeds are untouched.

      // ── "We're actively gathering" transparency ───────────────────────
      var gatherItems = [];
      gatherItems.push(isChallenger
        ? ('A voting record — it begins once ' + first + ' takes office')
        : ('More of ' + first + '\'s voting record'));
      gatherItems.push(stanceList.length
        ? 'More sourced positions across additional issues'
        : 'Detailed, sourced positions on their key issues');
      // NO "kept-and-broken promises" LINE. Pledges are a weighted tier INSIDE
      // ⚖️ Word vs Action, not a scoreboard of their own — promising a future
      // kept/broken tally here is the retired promise product announcing its
      // return. What is genuinely missing is formal action to test the word
      // against, and the line above already says that.
      var gatherBlock = '<div class="cs-gather"><div class="cs-gather-h">⏳ We\'re actively gathering</div>' +
        '<ul class="cs-gather-list">' + gatherItems.map(function(g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>';

      // ── THE ACTION BUTTON PAIR AND THE FOOT HINT ARE RETIRED ──────────
      // The pair was 🎯 Compare on the issues / ★ Add to my team, and it was the
      // profile's THIRD offer of the same two actions: the sticky rail carries a
      // 🤝 Match pill to the same breakdown, the 🤝 Compare on your values block
      // directly above this carries its own single control into the live match,
      // and the roster card that opened this modal carries the team star. Three
      // buttons for two jobs, stacked inside one card, on the profiles with the
      // least to say.
      //
      // The ↓ foot hint ("The full positions, the record and your alignment are
      // below") went with them, and it had to: this card now mounts UNDER 🌳 All
      // Issues by Topic, so the positions it promised below the reader are above
      // them. A pointer that is wrong about its own direction is worse than none,
      // and the spine's numbered rail already says what follows.

      // ── THE "ONE READ, THREE WAYS" INDEX IS RETIRED ───────────────────
      // It rendered a row of jump chips — 📌 Positions · 🤝 Your match · 🔦
      // Spotlight — under the heading "One read on <name>, three ways — tap to
      // jump". That was a second navigation model for the profile: a reader
      // arriving on a thin member met it, then the sticky jump rail above it,
      // then the shape strip's bucket gateway one section down, three different
      // maps of the same page competing for the same tap.
      //
      // The shape strip is the browsing control now — on a member exactly as on
      // an executive — and the sticky rail is the page-level map. This card is a
      // stop on that path, not a rival index of it, so it no longer offers to
      // navigate. The blocks it pointed at are still here, in order, one scroll
      // apart, and they keep their ids so any existing deep link still lands.

      // Limited-record pill label — mirror the exact wording the card-level depth
      // badge uses (🌱 "Early in Term" for a sitting official with nothing tracked
      // yet, "Limited Record" otherwise), so a visitor sees the SAME label in the
      // modal that drew them in from the card. Challengers keep "Limited Record"
      // since their card already carries the "2026 Candidate" status badge.
      var csPillLabel = (!isChallenger && typeof window._pdxRecordDepth === 'function' && window._pdxRecordDepth(p) === 'none')
        ? 'Early in Term' : 'Limited Record';

      // THE TITLE IS SHARED VOCABULARY NOW. "Candidate Snapshot" named a product
      // — a structured overview that led the profile and answered the same
      // question ⚖️ Word vs Action answers, in different words, against a
      // different pool. The card kept its honest content and lost its claim to
      // be the summary: it is titled by what it actually explains, which is why
      // the record is thin and what is being gathered.
      return '<div class="cand-snapshot">' +
        '<div class="cs-head">' +
          '<div class="cs-head-ico">' + (isChallenger ? '🗳️' : '🌱') + '</div>' +
          '<div class="cs-head-main">' +
            '<div class="cs-title">Why this record is thin<span class="cs-pill" title="Not a knock on the candidate — it means there is not yet enough formal action on file to test their word against. The positions themselves are in 🌳 All Issues by Topic above; this explains the gap.">' + csPillLabel + '</span></div>' +
            '<p class="cs-lede">' + lede + '</p>' +
          '</div>' +
        '</div>' +
        standsBlock +
        alignBlock +
        gatherBlock +
      '</div>';
    } catch (e) {
      return '';
    }
  };


  // ── Follow the Money — the campaign-finance funding lens ──────────────────
  // Historically "The People's Mandate Alignment": a four-tile scorecard of
  // good-government principles (Keeps Promises / Accountability / Transparency /
  // Constituents Over Special Interests), each printed as an N/100 with a filled
  // bar, plus an averaged `overall` across the rated tiles.
  //
  // Two of those tiles were the retired Accountability of Truth composite — one
  // read `accountability.overallScore` straight, the other pulled a category
  // score out of the same analysis object — and the average on top of them was a
  // second overall percentage about a person, built from a grade PolitiDex no
  // longer publishes. An earlier pass stopped the scorecard rendering but left
  // the whole computation in place, unused, "to keep the diff minimal". A dormant
  // grade with a live accessor is how a retired score comes back, so this pass
  // deletes the computation as well as the markup: the principle list, the
  // per-category lookup into the composite, the 0-100 colour ramp, the rows and
  // the averaged overall are all gone.
  //
  // What renders is what was never a grade — the Constituents-First funding
  // signal, computed live from itemized FEC and Utah disclosure filings, and
  // deliberately framed as a money lens rather than a record score. Nothing shows
  // when there is no filing. MANDATE_OVERRIDES and the curated FINANCE_INTEGRITY
  // seed remain as data; no display path reads them any more.
  // See scripts/test-acct-not-ranked.mjs.
  window._renderMandateAlignment = function(id, p) {
    p = p || {};
    // Live, transparent Constituents-First finance signal (computed from itemized
    // FEC / Utah-disclosure buckets, with its reasons shown below).
    var finSig = (typeof window._pdxFinanceSignal === 'function') ? window._pdxFinanceSignal(id) : null;
    if (!finSig) return '';
    return '<div class="modal-section" id="alignment-modal-section">' +
      '<div class="modal-section-title">💰 Follow the Money</div>' +
      '<div style="background:rgba(10,15,30,0.4);border:1px solid rgba(74,222,128,0.18);border-radius:0.9rem;padding:0.9rem 1rem;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.6rem;">' +
          '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.05em;color:#dbe6f6;">🏛️ Constituents-First signal</div>' +
          '<a href="#follow-the-money" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#4ade80;text-decoration:none;white-space:nowrap;">Follow the Money →</a>' +
        '</div>' +
        '<p style="font-size:0.7rem;color:#9fb4d4;line-height:1.55;margin:0 0 0.65rem;">A separate <strong style="color:#c8d8ea;">funding lens</strong> — not one of the record scores. Computed live from itemized public filings, it shows how much of their money comes from small-dollar donors versus large-individual and PAC money.</p>' +
        window._pdxFinanceSignalHTML(finSig) +
      '</div>' +
      '<p class="src-note">Campaign-finance Constituents-First signal (FEC + Utah state disclosures). A funding lens, kept separate from Your Match and from the ⚖️ Word vs Action record entirely.</p>' +
    '</div>';
  };

  // ════════════════════════════════════════════════════════════
  // PROMISE RECEIPTS — the kept / broken / pending pledge ledger.
  //
  // RETIRED AS A SCORE. This used to be "Promise Follow-Through", a rated
  // track with its own published percentage (Kept ÷ (Kept + Broken), pending
  // excluded) shown as a headline beside ⚖️ Word vs Action. Two percentages
  // rating two different things is exactly the confusion PolitiDex is supposed
  // to remove, so the percentage is no longer published ANYWHERE: not in the
  // hero, not in this block, not in a disclosure, not as a bar (a 77/23 bar is
  // the same percentage drawn instead of written).
  //
  // What survives is everything that was ever evidence: the individual pledges,
  // their kept / broken / pending verdicts, and the counts. Those are receipts,
  // and receipts belong on the page. They feed the one read — the pledge tier of
  // ⚖️ Word vs Action — instead of being scored on their own.
  //
  // _ftMeta STILL COMPUTES the arithmetic. It is kept intact deliberately: the
  // honesty guards, the counts-only detection (`itemized === false`) and the
  // pending-excluded convention are all load-bearing, and several harnesses
  // probe them behaviourally. Treat `rate` / `raw` / `col` / `verdict` as DATA
  // ONLY — nothing may print them as a percentage or as a rate-derived rating.
  // The `published` argument is likewise still accepted so callers need not
  // change, but it now only affects whether `rate` is populated for internal
  // callers; no display path reads it.
  // ════════════════════════════════════════════════════════════
  window._ftMeta = function(kept, broken, pending, published, itemized){
    kept = +kept || 0; broken = +broken || 0; pending = +pending || 0;
    var resolved = kept + broken;
    // `itemized === false` is the caller stating positively that this record has
    // summary counts with no inspectable pledge list. In that shape NO rate is
    // computed — not the published one, and not the raw ratio either, because
    // kept/resolved is the same unauditable percentage arrived at by division
    // instead of by lookup. Left undefined (the browse-card strip, older callers)
    // the behaviour is exactly as before.
    var noRate = (itemized === false);
    var raw = (resolved && !noRate) ? Math.round(kept / resolved * 100) : null;
    // A published figure only counts when there is something to publish about;
    // with nothing resolved the honesty guard has already returned null.
    var pub = (noRate || published === null || published === undefined || published === '' || isNaN(+published))
      ? null : Math.round(+published);
    var rate = (resolved && pub !== null) ? pub : raw;
    var col = rate === null ? '#9fb4d4' : rate >= 70 ? '#4ade80' : rate >= 50 ? '#f5c842' : '#f87171';
    // The counts-only state gets its own verdict line rather than borrowing
    // 'Tracking', which would misdescribe a record where 35 pledges have already
    // closed. It names what is known and stops there.
    var verdict = noRate && resolved ? 'Pledge Record on File'
                : rate === null ? 'Tracking'
                : rate >= 70 ? 'Keeps Their Promises'
                : rate >= 50 ? 'Mixed Promise Record' : 'Breaks Promises';
    var sub = noRate && resolved ? 'Kept and broken counts are on file. The individual pledges are not itemized yet, so no follow-through rate is published for them.'
            : rate === null ? 'No promises have resolved yet — monitoring in progress.'
            : rate >= 70 ? 'Mostly follows through on the promises they make.'
            : rate >= 50 ? 'Follows through on about half of their promises.'
            : 'Frequently fails to follow through on the promises they make.';
    var ico = noRate && resolved ? '📋'
            : rate === null ? '🔍'
            : rate >= 70 ? '🤝' : rate >= 50 ? '⚖️' : '⚠️';
    return { kept:kept, broken:broken, pending:pending, resolved:resolved, rate:rate, raw:raw,
             itemized:!noRate, countsOnly:(noRate && resolved > 0),
             weighted:(rate !== null && raw !== null && rate !== raw), col:col, verdict:verdict, sub:sub, ico:ico };
  };

  // The PLEDGE TIER of Word vs Action — receipts, not a score.
  //
  // WHAT CHANGED. This block used to be the profile's second scoreboard: a
  // published percentage, a kept/broken split bar drawing that same percentage,
  // a rate-derived verdict ("Keeps Their Promises" / "Breaks Promises") and a
  // raw-vs-weighted reconciliation. All of that rated the same politician on a
  // different axis, in a different colour, a few hundred pixels below the one
  // read the site actually stands behind. It is gone.
  //
  // WHAT SURVIVES. Every receipt: the pledges themselves, their kept / broken /
  // pending verdicts, the counts, the three filter chips that jump into the
  // ledger, and the ⓘ explainer. A count is a fact about a countable list. A
  // rate is a rating — and this site publishes exactly one.
  //
  // `published` is still accepted so no caller has to change shape, and so
  // _ftMeta can still apply its counts-only guard, but nothing here reads it.
  //
  // `itemized` remains the honesty guard, and it now controls one thing only:
  // whether the counts are clickable. With no inspectable pledge list there is
  // nothing below to filter TO, so the chips render as plain text instead of
  // dead buttons, and the note says why.
  window._renderFollowThrough = function(kept, broken, pending, pid, published, itemized){
    var m = window._ftMeta(kept, broken, pending, published, itemized);
    if (m.resolved === 0 && m.pending === 0) return '';
    // With no itemized ledger there is nothing below to filter TO, so the counts
    // stay as plain, readable counts rather than dead buttons.
    var interactive = m.itemized;
    // Opens the pledge-lane explainer used by the cards.
    var ftClick = ' onclick="event.stopPropagation();window._pdxPromiseInfo(event,' + (pid ? '\'' + pid + '\'' : 'null') + ')"' +
      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window._pdxPromiseInfo(event,' + (pid ? '\'' + pid + '\'' : 'null') + ');}"' +
      ' title="How the pledge ledger works"';
    function countChip(kind, ico, n, label) {
      if (!interactive) {
        return '<span class="vbadge vbadge-' + kind + '">' + ico + ' ' + n + ' ' + label + '</span>';
      }
      return '<span class="vbadge vbadge-' + kind + ' vbadge-click" role="button" tabindex="0" aria-pressed="false" data-jump="' + kind + '"' +
        ' onclick="window._pdxBadgeClick(\'' + kind + '\')" onkeydown="window._pdxBadgeKey(event,\'' + kind + '\')"' +
        ' title="Show the ' + kind + ' promises">' + ico + ' ' + n + ' ' + label + '</span>';
    }
    // The headline is now a COUNT SENTENCE, not a verdict. It states what is on
    // file and stops — no adjective grading the politician, because the grading
    // happens once, above, in ⚖️ Word vs Action. The panel is a flat neutral
    // slate rather than the old green/amber/red frame, since a colour keyed to a
    // rate is that rate published as paint.
    var ACC = '#9fb4d4';
    var head = m.resolved
      ? m.resolved + ' pledge' + (m.resolved === 1 ? '' : 's') + ' settled' + (m.pending ? ' · ' + m.pending + ' still open' : '')
      : m.pending + ' pledge' + (m.pending === 1 ? '' : 's') + ' being tracked';
    var line = m.resolved
      ? 'On file: <strong style="color:#4ade80;">' + m.kept + ' kept</strong> and <strong style="color:#f87171;">' + m.broken + ' broken</strong>' +
        (m.pending ? ', with <strong style="color:#cbd9ec;">' + m.pending + '</strong> not yet resolved' : '') + '. ' +
        'These are the receipts behind the pledge tier of their ⚖️ Word vs Action read — not a separate grade.'
      : 'Nothing has resolved yet, so there is nothing to judge here — only pledges to watch.';
    return '' +
      '<div class="pdx-ft-block" style="margin-bottom:1.25rem;background:rgba(16,26,46,0.55);border:1px solid rgba(159,180,212,0.2);border-left:3px solid rgba(159,180,212,0.55);border-radius:0.8rem;padding:0.85rem 0.95rem;">' +
        '<div style="margin-bottom:0.6rem;">' +
          '<div class="pdx-ft-eyebrow" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.11em;text-transform:uppercase;color:#9fb4d4;margin-bottom:0.2rem;">🤝 Pledge ledger · evidence for the pledge tier of Word vs Action</div>' +
          '<div class="pdx-ft-verdict" style="display:inline-flex;align-items:center;gap:0.4rem;font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;letter-spacing:0.04em;color:' + ACC + ';line-height:1.1;">🤝 ' + head + '</div>' +
          '<p class="pdx-ft-sub" style="font-size:0.7rem;color:#9fb4d4;line-height:1.45;margin:0.3rem 0 0;">' + line + '</p>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.45rem;">' +
          countChip('kept', '✓', m.kept, 'Kept') +
          countChip('broken', '✗', m.broken, 'Broken') +
          countChip('pending', '⏳', m.pending, 'Pending') +
        '</div>' +
        (interactive
          ? '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#7596c0;margin-top:0.55rem;">👆 Tap a count to filter the promises below · tap again or “All” to reset</div>'
          : '') +
        // ONE explanation, on every record. The old code branched here: a
        // disclosure holding the percentage when the ledger was itemized, and a
        // "no rate is published" note when it wasn't. Now no record gets a rate,
        // so both branches collapse into the honest one — which also means a
        // counts-only record no longer looks like a degraded version of a scored
        // one. It reads the same, because it now IS the same.
        '<div class="pdx-ft-noRate">' +
          '<p class="pdx-ft-noRate-p">' +
            'No follow-through percentage is published for this lane, on any profile. ' +
            (m.itemized
              ? 'Each pledge below is listed with its own verdict and sources, so you can read the record instead of a number derived from it. '
              : 'The counts above are on file, but the individual pledges behind them are not itemized yet, so there is nothing here to check a number against. ') +
            'PolitiDex publishes one integrity read — ⚖️ <b style="color:#9fb4d4;">Word vs Action</b> — and kept and broken pledges are part of what feeds it.' +
          '</p>' +
          '<button type="button" class="pdx-ft-rate-how pdx-ft-rate-click"' + ftClick + '>ⓘ How does this lane work?</button>' +
        '</div>' +
        // Says out loud where these receipts sit. Without it the block just looks
        // quieter for no stated reason, and a reader who remembers a percentage
        // here has no way to tell whether it was retired or broke. The link closes
        // the loop the other way too: the primary section lists this block as an
        // input, so this block has to be one tap from the read it feeds.
        '<p style="font-size:0.66rem;color:#7596c0;line-height:1.5;margin:0.5rem 0 0;border-top:1px solid rgba(159,180,212,0.14);padding-top:0.5rem;">' +
          'This covers explicit pledges only. The ⚖️ <b style="color:#9fb4d4;">Word vs Action</b> read above weighs these alongside their stated positions and the issues they campaign on — because they should be held to all of it, not just the part phrased as a promise.' +
        '</p>' +
        '<button type="button" class="pdx-ft-primary" ' +
          'onclick="event.stopPropagation();if(window._pdxNavJump){window._pdxNavJump(\'pdxsec-wordaction\');}' +
          'else{var e=document.getElementById(\'pdxsec-wordaction\');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">' +
          '⚖️ See the one score this feeds <span aria-hidden="true">→</span>' +
        '</button>' +
      '</div>';
  };

  // ════════════════════════════════════════════════════════════
  // PROMISE FILTER — makes the kept / broken / pending counts (and the
  // Promise Tracker filter tabs) interactive. Clicking a status scrolls
  // the open profile modal to the Promise Tracker and shows only the
  // promises with that verdict; "All" restores the full list. Works for
  // every profile because it operates on whatever the open modal rendered.
  // ════════════════════════════════════════════════════════════
  window.pdxFilterPromises = function(verdict, doScroll){
    verdict = verdict || 'all';
    // The promise ledger lives inside a deferred drawer, so on a profile whose
    // drawer has never been opened none of the ids below exist yet. Mount it
    // first — the old `if (!list) return` would otherwise swallow the filter AND
    // the scroll, making every hero count chip a dead button until the reader
    // happened to open the drawer by hand.
    if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget('pdx-promise-list');
    var list = document.getElementById('pdx-promise-list');
    if (!list) return;
    var labels = { all:'promises', kept:'kept promises', broken:'broken promises', pending:'pending promises', partial:'partial promises' };

    // Toggle visibility of each verdict group.
    var anyShown = false;
    var groups = list.querySelectorAll('[data-verdict]');
    for (var i = 0; i < groups.length; i++) {
      var gv = groups[i].getAttribute('data-verdict');
      var show = (verdict === 'all' || gv === verdict);
      groups[i].style.display = show ? '' : 'none';
      if (show) anyShown = true;
    }

    // Empty-state message for a status with no tracked promises.
    var empty = document.getElementById('pdx-promise-empty');
    if (empty) {
      empty.textContent = 'No ' + (labels[verdict] || 'promises') + ' tracked yet.';
      empty.style.display = anyShown ? 'none' : '';
    }

    // Reflect the active state on both the tabs and the hero badges.
    var tabs = document.querySelectorAll('#pdx-promise-filter .pdx-pfilter-btn');
    for (var t = 0; t < tabs.length; t++) {
      var tabActive = tabs[t].getAttribute('data-f') === verdict;
      tabs[t].classList.toggle('active', tabActive);
      tabs[t].setAttribute('aria-pressed', tabActive ? 'true' : 'false');
    }
    var badges = document.querySelectorAll('[data-jump]');
    for (var b = 0; b < badges.length; b++) {
      var badgeActive = badges[b].getAttribute('data-jump') === verdict;
      badges[b].classList.toggle('vbadge-active', badgeActive);
      badges[b].setAttribute('aria-pressed', badgeActive ? 'true' : 'false');
    }

    // Remember the active filter so the hero badges can toggle back to "All".
    window._pdxActiveFilter = verdict;

    // Active-filter status line: spell out what's showing and offer a one-tap
    // reset whenever a single status is selected; hidden when viewing all.
    var status = document.getElementById('pdx-promise-status');
    if (status) {
      var statusLabel = document.getElementById('pdx-promise-status-label');
      if (statusLabel) statusLabel.textContent = labels[verdict] || 'all promises';
      status.style.display = (verdict === 'all') ? 'none' : '';
    }

    if (doScroll) {
      // Via _pdxNavJump rather than scrollIntoView: the promise ledger now lives
      // inside a closed full-record drawer, and _pdxNavJump opens any drawer
      // between the target and the modal body before it measures. A bare
      // scrollIntoView would land the reader on a shut lid.
      if (typeof window._pdxNavJump === 'function') {
        window._pdxNavJump('pdx-promise-section');
      } else {
        var sec = document.getElementById('pdx-promise-section');
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }
  };

  // Hero badge click — tapping a status filters to it and scrolls down;
  // tapping the SAME status again clears the filter back to "All". This gives
  // the counts an obvious built-in reset in addition to the "All" tab.
  window._pdxBadgeClick = function(verdict){
    var next = (window._pdxActiveFilter === verdict) ? 'all' : verdict;
    window.pdxFilterPromises(next, true);
  };

  // Keyboard activation (Enter / Space) for the clickable hero badges.
  window._pdxBadgeKey = function(ev, verdict){
    if (ev && (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar')) {
      ev.preventDefault();
      window._pdxBadgeClick(verdict);
    }
  };

  // Filter-tab click — same toggle semantics as the hero counts: tapping the
  // already-active tab clears back to "All", so every clickable pill (hero
  // counts and tracker tabs alike) can also undo its own filter.
  window.pdxToggleFilter = function(f){
    var next = (window._pdxActiveFilter === f) ? 'all' : f;
    window.pdxFilterPromises(next);
  };

  // RETIRED — the compact card strip that printed "N% Follow-Through".
  //
  // It had no call sites, and what it existed to print no longer exists: the
  // pledge lane publishes counts, not a rate. Kept as a stub rather than deleted
  // so that anything still calling it (a cached bundle, a half-migrated card)
  // gets nothing instead of an old percentage. If you want kept/broken pills on
  // a card, use window._pdxStatPills(kept, broken, pending, { record: p }) —
  // that renders the receipts without inventing a rating for them.
  window._ftStrip = function(kept, broken, pending){
    return '';
  };

  // ════════════════════════════════════════════════════════════
  // MODAL RENDERER
  // ════════════════════════════════════════════════════════════
    // showProfile — public entry-point for all "View Profile" buttons
  function showProfile(id, ev) {
    console.log('🔥 showProfile called with id:', id);
    if (ev && ev.stopPropagation) ev.stopPropagation();
    // If the Compare My Team overlay is open it sits above the profile modal —
    // dismiss it so the profile the voter tapped is actually visible.
    if (typeof window.homeCompareClose === 'function') { try { window.homeCompareClose(); } catch (e) {} }
    // Record this stop on the guided spine (Move 3) so the trail always reflects
    // where the voter is.
    try {
      if (window.PDXJourney && typeof window.PDXJourney.record === 'function') {
        var _jp = (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) || (window.PROFILES && window.PROFILES[id]) || {};
        var _jn = (_jp && _jp.name) || (typeof window._pdxPoliticianName === 'function' ? window._pdxPoliticianName(id) : id);
        window.PDXJourney.record('profile', { label: _jn, icon: '👤', nav: { type: 'profile', pid: id } });
      }
    } catch (e) {}
    // One funnel. PDXPerson.open resolves the record, opens this same renderer,
    // stamps /p/<id> and sets the file kicker — so a person opened from search,
    // from a ballot seat, from a share link or from a Direction Match card is
    // the same act with the same address, not five near-identical ones.
    if (window.PDXPerson && typeof window.PDXPerson.open === 'function') {
      if (window.PDXPerson.open(id)) return;
    }
    openModal(id);
  }

  // Loading shell for the full-profile modal while its full document is fetched.
  // Reveals the same overlay openModal uses and drops a spinner into #modal-content
  // (which openModal overwrites once the data arrives), so a cold open / deep link
  // gives immediate feedback instead of a frozen tap.
  window._pdxOpenFullModalShell = function (id) {
    var d = (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ||
            (window.PROFILES && window.PROFILES[id]) || {};
    var nm = d && d.name ? (typeof window._slEsc === 'function' ? window._slEsc(d.name) : d.name) : 'profile';
    var host = document.getElementById('modal-content');
    if (host) {
      host.innerHTML = '<div class="pdx-modal-loading">' +
          '<span class="pdx-roster-spin" aria-hidden="true"></span>' +
          '<p>Loading ' + nm + '…</p>' +
        '</div>';
    }
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.setProperty('opacity', '1', 'important');
      overlay.style.setProperty('visibility', 'visible', 'important');
    }
    document.body.style.overflow = 'hidden';
  };

  // Friendly fallback for when a profile genuinely can't be resolved from either
  // the live roster (PROFILES) or the bundled static roster (CMP_DATA). Instead of
  // the tap silently doing nothing, reveal the modal with a clear message and an
  // obvious way out, so a missing record is communicated rather than felt as a bug.
  window._pdxShowModalError = function (id) {
    var host = document.getElementById('modal-content');
    if (host) {
      host.innerHTML = '<div class="pdx-modal-loading" role="alert" style="text-align:center;">' +
          '<div style="font-size:2rem;line-height:1;margin-bottom:0.5rem;">⚠️</div>' +
          '<p style="font-weight:700;color:#fff;margin-bottom:0.35rem;">This profile couldn’t be loaded</p>' +
          '<p style="font-size:0.82rem;color:#9fb4d4;max-width:22rem;line-height:1.5;margin:0 auto;">We couldn’t find a record for this official right now. Please close this and try again in a moment.</p>' +
          '<button type="button" onclick="if(typeof closeModal===\'function\')closeModal()" class="kr-action-btn" style="margin-top:1.1rem;">Close</button>' +
        '</div>';
    }
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.setProperty('opacity', '1', 'important');
      overlay.style.setProperty('visibility', 'visible', 'important');
    }
    document.body.style.overflow = 'hidden';
  };

  // ── Profile quick-jump nav: relative time, smooth scroll, scroll-spy ─────
  // Powers the sticky pill rail rendered under the profile hero. Everything
  // operates on the #modal-body scroll container and is re-armed on each open.

  // Compact "2d ago"-style formatter for the Activity pill / footer. Accepts an
  // ISO string, epoch ms, or a Firestore-style {seconds} object; returns '' for
  // anything it can't parse so the caller can cleanly omit the value.
  window._pdxRelTime = function (ts) {
    try {
      var d;
      if (ts && typeof ts === 'object' && typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);
      else if (typeof ts === 'number') d = new Date(ts);
      else d = new Date(String(ts));
      if (!d || isNaN(d.getTime())) return '';
      var s = Math.max(0, (Date.now() - d.getTime()) / 1000);
      if (s < 60) return 'just now';
      var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
      var dd = Math.floor(h / 24); if (dd < 7) return dd + 'd ago';
      if (dd < 30) return Math.floor(dd / 7) + 'w ago';
      if (dd < 365) return Math.floor(dd / 30) + 'mo ago';
      return Math.floor(dd / 365) + 'y ago';
    } catch (e) { return ''; }
  };

  // Open every closed drawer or lid between an element and the modal body, innermost
  // first. Opening an outer one does not change whether an inner one is still shut,
  // and toggleDD only flips the id it is handed. Shared by the jump-rail and by the
  // evidence anchors, because both can now aim at content sitting under a lid.
  function _pdxOpenClosedChain(el) {
    try {
      var body = document.getElementById('modal-body');
      if (!body || !el) return;
      // The target itself may BE a disclosure — the flat formal list is one closed
      // <details> under the tree — and scrolling to a shut control lands the reader
      // on a summary line with nothing under it. Opening it is the same promise the
      // drawer chain keeps: reveal, then measure.
      var chain = [], node = el;
      while (node && node !== body) {
        if (node.tagName === 'DETAILS' && !node.open) node.open = true;
        if (node !== el && node.classList && node.classList.contains('dd-body') &&
            !node.classList.contains('dd-open') && node.id) chain.push(node.id);
        node = node.parentElement;
      }
      if (typeof window.toggleDD === 'function') {
        for (var i = 0; i < chain.length; i++) window.toggleDD(chain[i]);
      }
    } catch (e) {}
  }

  window._pdxNavJump = function (targetId, btn) {
    // Smooth-scroll the modal body so the target section clears the sticky rail.
    //
    // Deep-record sections now live inside closed drawers and lids, and scrolling to
    // a node inside a collapsed (max-height:0) box lands the reader on a shut control
    // with nothing to read. So the chain above the target is opened first, and the
    // scroll offset is measured after that so it reflects the expanded layout.
    var body = document.getElementById('modal-body');
    // The deepest sections now live inside drawers whose inner markup is held
    // back as a string until first open, so the target may not exist yet. Mount
    // its drawer first: without this the function bails on `!el` and the pill
    // reads as broken, which is exactly the failure deferral must not introduce.
    if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget(targetId);
    var el = document.getElementById(targetId);
    if (!body || !el) return;
    _pdxOpenClosedChain(el);
    var nav = document.getElementById('pdx-profile-nav');
    var navH = nav ? nav.offsetHeight : 0;
    var top = body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - navH - 12;
    try { body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
    catch (e) { body.scrollTop = Math.max(0, top); }
    if (btn && btn.parentElement) {
      Array.prototype.forEach.call(btn.parentElement.children, function (c) { c.classList.remove('is-active'); });
      btn.classList.add('is-active');
      try { btn.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
    }
    // Suppress the spy briefly so it does not fight the animated jump, then force
    // one repaint when the suppression lifts. Without that repaint the rail can be
    // left showing the pill this function lit rather than the section the scroll
    // actually settled on — the observer only speaks when something CHANGES, and
    // during the animation everything it had to say was thrown away.
    window._pdxNavUserJumping = true;
    clearTimeout(window._pdxNavJumpTimer);
    window._pdxNavJumpTimer = setTimeout(function () {
      window._pdxNavUserJumping = false;
      try { if (typeof window._pdxNavRepaint === 'function') window._pdxNavRepaint(true); } catch (e) {}
    }, 650);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // THE QUICK CHIPS ARE LIVE, AND THEY ARE ONE DERIVATION
  // ═══════════════════════════════════════════════════════════════════════════
  // The rail's pills each carry a figure: ⚖️ a percentage, 🎯 a count of tagged
  // issues, 🏛/✒️ how much of the formal record has been tested, 🔗 how many
  // receipts are on file. Those figures used to be BUILT ONCE, into a string, at
  // modal-render time — before the roll-call fetch that half of them depend on had
  // come back. The rail then sat there for the life of the profile stating what was
  // true a second before the record arrived: "0 of 11 tested" over a section
  // reading eleven tested issues, an ⚖️ pill frozen mid-warm.
  //
  // Two rules fix that, and both are load-bearing:
  //
  //   ONE DERIVATION, TWO CALLERS. _pdxNavChips is the only place a pill's value
  //   and colour are decided. The build-time string calls it; the warm repaint
  //   calls it again and writes the answer into the pill that is already on screen.
  //   A frozen string cannot drift from a live section because there is no second
  //   place for the two to disagree.
  //
  //   PENDING, NEVER A WRONG INTEGER. Every count here comes off an engine that can
  //   still be warming. While it is, the pill says so in the same word the hero and
  //   the rows use ("Checking…") rather than printing the zero it would have to take
  //   back one event later.
  //
  // The counts themselves are NOT computed here: PDXConsistency.profileCounts(pid)
  // is the one counts object, and each chip's accessible name states WHICH M its
  // figure is out of, in that object's own wording. Nothing in this block scores,
  // ranks or thresholds anything.
  var _NAV_PEND = 'Checking…';
  // Receipts on file, in one place because two callers need the same number: the
  // 🔗 pill and the 🕑 Activity fallback value.
  window._pdxNavEvidenceCount = function (id, p) {
    var n = 0;
    try {
      ((p && p.promises) || []).forEach(function (pr) {
        if (pr && Array.isArray(pr.sources)) n += pr.sources.length;
      });
      ((p && p.sections) || []).forEach(function (s) {
        if (s && typeof s.sources_count === 'number') n += s.sources_count;
      });
      var ev = (typeof window._issueEvidenceMap === 'function') ? (window._issueEvidenceMap(id, p) || {}) : {};
      Object.keys(ev).forEach(function (k) {
        n += ((ev[k] && ev[k].spotlight) ? ev[k].spotlight.length : 0);
      });
    } catch (e) { return 0; }
    return n;
  };
  window._pdxNavChips = function (id, p) {
    p = p || (window.PROFILES && window.PROFILES[id]) ||
        ((typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ? CMP_DATA[id] : null) || {};
    var out = {};
    var counts = null;
    try {
      if (window.PDXConsistency && typeof window.PDXConsistency.profileCounts === 'function') {
        counts = window.PDXConsistency.profileCounts(id, p);
      }
    } catch (e) { counts = null; }
    var of = (counts && counts.of) || {};
    // ⚖️ Word vs Action — the one percentage on the rail, and the engine's own
    // fail-closed states where it has no percentage to give.
    try {
      if (window.PDXWordAction && typeof window.PDXWordAction.read === 'function') {
        var wa = window.PDXWordAction.read(id, p);
        if (wa && wa.coverage && wa.coverage.word) {
          var waWarm = !!wa.coverage.warming;
          out.wordaction = {
            value: (wa.pct !== null) ? (wa.pct + '%')
              : (waWarm ? _NAV_PEND : (wa.coverage.tested ? 'Not enough on file' : 'Untested')),
            color: (wa.verdict && wa.verdict.color) || '#9fb4d4',
            pending: waWarm,
            note: 'Direction Match, tested on ' + (wa.coverage.tested || 0) + ' of ' +
              (wa.coverage.scorable || 0) + ' ' + (of.scorable || 'issues it counts')
          };
        }
      }
    } catch (e) {}
    // 🏛 The record — the compact formal summary at the head of the page: how many
    // issues the formal ledger could be read on, and how many acts sit behind them.
    // Both figures are the strip's own (PDXConsistency.recordStandout), so the pill
    // and the block it jumps to cannot state different totals. Counts only — this
    // lane publishes tiers and never a ratio.
    try {
      var SO = window.PDXConsistency && window.PDXConsistency.recordStandout;
      // The same two questions the mount asks, in the same order: is there a
      // standout to show, and has the shape hero already shown it? On a deep
      // profile the hero IS the compact formal summary and it sits above the rail,
      // so the strip stands down and #pdxsec-standout is never emitted — a pill
      // aimed at it there would be a pill aimed at nothing.
      var WAS = window.PDXWordAction;
      var shaped = !!(WAS && typeof WAS.shapeApplies === 'function' && WAS.shapeApplies(id));
      // The executive lane first, in the same order the mount checks: on a
      // president the block in this slot is PDXConsistency.execRecordSummary, and
      // the pill's figures are that block's own — how much is on file and what it
      // is made of. Counts, never a ratio, and never the second percentage this
      // rail is not allowed to carry.
      var XSC = window.PDXConsistency && window.PDXConsistency.execRecordSummary;
      var xsc = null;
      try { xsc = (XSC && typeof XSC.pick === 'function') ? XSC.pick(id) : null; } catch (e) { xsc = null; }
      if (xsc && xsc.on) {
        out.standout = { value: xsc.acts + ' on file', pending: false,
          color: xsc.contested ? '#f5c842' : '#9fdbd0',
          note: xsc.inventory.length
            ? xsc.inventory.join(' · ') + ' — across ' + xsc.issues +
              ' issue' + (xsc.issues === 1 ? '' : 's')
            : 'formal actions on file' };
      } else if (!shaped && SO && typeof SO.pick === 'function') {
        var so = SO.pick(id);
        if (so && so.any) {
          out.standout = { value: so.issues + ' issue' + (so.issues === 1 ? '' : 's') + ' read',
            color: '#9fdbd0', pending: false,
            note: so.judged + ' vote' + (so.judged === 1 ? '' : 's') +
              ' and formal action' + (so.judged === 1 ? '' : 's') + ' behind them' };
        }
      }
    } catch (e) {}
    // 🌳 By topic — the browse gateway, and the widest door on the profile. The
    // figure is the number of issues the tree actually lists for this person, taken
    // from the tree's own leaf count rather than counted a second time here.
    try {
      var TR = window.PDXStanceTree;
      if (TR && typeof TR.count === 'function') {
        var trN = TR.count(id) || 0;
        if (trN > 0) {
          out.topics = { value: trN + ' issue' + (trN === 1 ? '' : 's'), color: '#8fe0a8',
            pending: false, note: 'every issue we track for them, grouped by topic' };
        }
      }
    } catch (e) {}
    // 🎯 Positions — the tagged key issues, which is exactly what the section this
    // pill jumps to prints one pill per. Not an engine figure; see counts.signature.
    var sig = counts ? counts.signature : 0;
    if (!counts) { try { sig = (window._pdxKeyIssues(p) || []).length; } catch (e2) { sig = 0; } }
    if (sig) {
      out.positions = { value: sig + ' Issue' + (sig === 1 ? '' : 's'), color: '#c4b5fd',
        pending: false, note: of.signature || 'issues tagged on this profile' };
    }
    // 🏛️ / ✒️ Record — how much of the formal record has been tested, out of how
    // much formal record is on file. Both figures are the counts object's, and the
    // numerator is the same one the Official Record's own digest leads with, so the
    // pill and the section it jumps to cannot state different totals.
    if (counts && (counts.onRecord || counts.scorable || counts.tested)) {
      out.record = counts.warming
        ? { value: _NAV_PEND, color: '#9fdbd0', pending: true,
            note: 'still reading the formal record' }
        : { value: counts.scored + ' of ' + counts.onRecord + ' tested', color: '#9fdbd0',
            pending: false,
            note: (of.scored || 'issues the formal record scored') + ', out of ' +
              (of.onRecord || 'issues with a formal record on file') };
    }
    // 🔗 Evidence — receipts, not issues, and it says so.
    var ev = window._pdxNavEvidenceCount(id, p);
    if (ev > 0) {
      out.evidence = { value: ev + ' Evidence', color: '#f5c842', pending: false,
        note: 'sourced receipts gathered on this profile' };
    }
    return out;
  };
  // The accessible name is built in ONE place too — a pill whose visible figure
  // repaints and whose spoken name does not is a pill that lies to exactly the
  // readers least able to check it.
  window._pdxNavChipAria = function (label, value, note) {
    return String(label) + ': ' + String(value == null ? '' : value).replace(/"/g, '') +
      (note ? ' — ' + String(note).replace(/"/g, '') : '');
  };
  // THE REPAINT. Same event the hero ring, the header tally and the topic tree
  // rebuild on. It writes text and colour into pills that already exist and never
  // adds, removes or reorders one: a rail that grew a pill mid-read would move the
  // thing under the reader's thumb, and self-gating already happens at build time
  // off figures that cannot arrive late.
  window._pdxNavLive = function (pid) {
    var nav = document.getElementById('pdx-profile-nav');
    if (!nav) return;
    var id = nav.getAttribute('data-pdxnav-pid') || '';
    if (!id) return;
    if (pid && String(pid).trim().toLowerCase() !== id.trim().toLowerCase()) return;
    var chips;
    try { chips = window._pdxNavChips(id, null) || {}; } catch (e) { return; }
    var live = nav.querySelectorAll('[data-pdxnav-live]');
    for (var i = 0; i < live.length; i++) {
      var btn = live[i];
      var c = chips[btn.getAttribute('data-pdxnav-live')];
      if (!c) continue;
      var val = btn.querySelector('.pdx-pnav-val');
      if (!val) continue;
      if (val.textContent !== c.value) val.textContent = c.value;
      try { val.style.color = c.color; } catch (e2) {}
      btn.setAttribute('aria-label',
        window._pdxNavChipAria(btn.getAttribute('data-pdxnav-label') || '', c.value, c.note));
      if (c.pending) btn.setAttribute('data-pdxnav-pending', '1');
      else btn.removeAttribute('data-pdxnav-pending');
    }
  };
  var _navLiveBound = false;
  function _pdxNavLiveBind() {
    if (_navLiveBound || !window.addEventListener) return;
    _navLiveBound = true;
    // Bound once, for the life of the page, and cheap: it does nothing at all
    // unless a rail is mounted and the event names the profile that rail is for.
    window.addEventListener('pdx-consistency-warm', function (ev) {
      try { window._pdxNavLive((ev && ev.detail && ev.detail.pid) || ''); } catch (e) {}
    });
  }

  // Re-arm the rail after the DOM under it changed — a deferred drawer mounted, a
  // pill was injected late. Coalesced into one animation frame so a burst of
  // reveals costs one re-arm instead of one per reveal, and so the re-arm reads
  // layout AFTER the browser has finished reacting to the mutation rather than in
  // the middle of it.
  window._pdxNavRearmSoon = function () {
    if (window._pdxNavRearmPending) return;
    window._pdxNavRearmPending = true;
    var run = function () {
      window._pdxNavRearmPending = false;
      try { if (typeof window._pdxInitProfileNav === 'function') window._pdxInitProfileNav(); } catch (e) {}
    };
    try { requestAnimationFrame(run); } catch (e) { setTimeout(run, 16); }
  };

  // Highlight the pill for whichever section is currently under the rail, and make
  // the rail read in page order while doing it.
  //
  // ── Why this is an observer and not a scroll handler ──
  // It used to be a rAF-throttled scroll listener that, on every frame of every
  // scroll, called getBoundingClientRect() on the modal body, read nav.offsetHeight,
  // then called getBoundingClientRect() on EVERY tracked anchor — a dozen forced
  // layout flushes per frame across the largest subtree in the app, on the exact
  // gesture where a phone has the least headroom. It also only recomputed on
  // scroll, so opening a drawer moved every anchor beneath it and the rail went on
  // pointing at the wrong section until the reader scrolled again.
  //
  // An IntersectionObserver inverts that. The root is clipped to start at the rail
  // line, so each anchor produces a callback exactly when it crosses that line, and
  // the callback arrives carrying boundingClientRect and rootBounds already
  // measured by the compositor. Comparing those two is the same predicate the old
  // spy computed by hand — is this anchor above the line — with no layout read in
  // our code at all, on crossings rather than on frames. Because the observer
  // recomputes on any layout change, opening a drawer or a lid now updates the rail
  // by itself.
  //
  // ── Order comes from the document, not from the rail ──
  // Two things can put the pills out of page order: a build-time list that drifts,
  // and a pill appended after the fact (voting-record.js adds Votes once it knows
  // there is a record). The spine sorts the build-time list, and this function
  // sorts what it finds by real document position, then moves the pill nodes to
  // match if — and only if — they disagree. So the rail is correct by measurement,
  // not by assertion, and the active index can only ever move forwards as the
  // reader scrolls down.
  window._pdxInitProfileNav = function () {
    var body = document.getElementById('modal-body');
    var nav = document.getElementById('pdx-profile-nav');
    // The rail exists, so the live-chip listener should too. Guarded to one bind.
    try { _pdxNavLiveBind(); if (nav) window._pdxNavLive(nav.getAttribute('data-pdxnav-pid') || ''); } catch (e) {}
    // Re-arming is how this function is used — on open, after a drawer mounts,
    // after a late pill is added — so tearing the previous observer down is the
    // first thing it does. Nothing here can stack.
    _pdxNavTeardown();
    if (!body || !nav) return;
    var track = nav.querySelector('.pdx-pnav-track') || nav;
    var pills = Array.prototype.slice.call(nav.querySelectorAll('.pdx-pnav-pill'));
    if (!pills.length) return;

    // Section pills that have a live destination. A pill aimed inside a drawer
    // whose inner is still a string has no element yet: it stays clickable (the
    // jump reveals it first) but there is nothing to spy on until it mounts, and
    // the re-arm after that reveal picks it up.
    var targets = [];
    pills.forEach(function (b) {
      var t = b.getAttribute('data-target');
      if (!t) return;
      var el = document.getElementById(t);
      if (el) targets.push({ btn: b, el: el, target: t });
    });
    if (!targets.length) return;

    // Document order is the authority. compareDocumentPosition is a tree walk, not
    // a geometry read, so this costs nothing in layout.
    targets.sort(function (a, b) {
      if (a.el === b.el) return 0;
      // 4 is DOCUMENT_POSITION_FOLLOWING: b comes after a, so a sorts first.
      return (a.el.compareDocumentPosition(b.el) & 4) ? -1 : 1;
    });
    _pdxNavSyncOrder(track, pills, targets);

    // One layout read, once, at arm time — where the old code took one per frame.
    // The rail is sticky at the top of the scroller, so its height is the offset
    // between the top of the visible area and the first line a reader can read.
    var line = (nav.offsetHeight || 0) + 16;
    var above = [];
    var atEnd = false;
    var active = -1;

    function paint(force) {
      var idx = 0;
      for (var i = 0; i < targets.length; i++) if (above[i]) idx = i;
      // At the very bottom, force the last section active so the final pill is
      // reachable even when the page cannot scroll far enough to push its anchor
      // above the rail line.
      if (atEnd) idx = targets.length - 1;
      if (idx === active && !force) return;
      active = idx;
      for (var j = 0; j < targets.length; j++) {
        targets[j].btn.classList.toggle('is-active', j === idx);
      }
    }
    // Exposed so the jump can resync the rail once its animation is done, and so a
    // forced repaint is possible after the class list was changed from outside.
    window._pdxNavRepaint = paint;

    if (typeof window.IntersectionObserver !== 'function') {
      // No observer: light the first pill and leave it. Every pill still scrolls,
      // which is the part that matters; a stale highlight is a cosmetic loss.
      paint(true);
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var k = -1;
        for (var j = 0; j < targets.length; j++) if (targets[j].el === e.target) { k = j; break; }
        if (k === -1) continue;
        // rootBounds.top IS the rail line, because the root was clipped by exactly
        // that much. Both rects arrive with the entry, already measured.
        var ref = e.rootBounds ? e.rootBounds.top : null;
        if (ref === null) { above[k] = !e.isIntersecting; continue; }
        above[k] = e.boundingClientRect.top <= ref;
      }
      if (!window._pdxNavUserJumping) paint(false);
    }, { root: body, rootMargin: (-line) + 'px 0px 0px 0px', threshold: 0 });
    targets.forEach(function (t) { obs.observe(t.el); });
    window._pdxNavObserver = obs;

    // Bottom-of-scroll detection, without reading scrollHeight on every frame. A
    // one-pixel marker parked at the end of the content is observed against the
    // unclipped root, so it reports intersecting exactly when the reader has
    // reached the last few pixels — the same condition the old spy computed with a
    // scrollTop + clientHeight >= scrollHeight comparison, which forces a layout
    // flush every time it is asked.
    try {
      var end = document.getElementById('pdxsp-nav-end');
      if (!end) {
        end = document.createElement('span');
        end.id = 'pdxsp-nav-end';
        end.setAttribute('aria-hidden', 'true');
        end.style.cssText = 'display:block;height:1px;';
      }
      if (end.parentNode !== body || body.lastChild !== end) body.appendChild(end);
      var endObs = new IntersectionObserver(function (entries) {
        atEnd = !!(entries.length && entries[entries.length - 1].isIntersecting);
        if (!window._pdxNavUserJumping) paint(false);
      }, { root: body, rootMargin: '0px 0px -4px 0px', threshold: 0 });
      endObs.observe(end);
      window._pdxNavEndObserver = endObs;
    } catch (e) {}
  };

  // Move the pill nodes so the rail reads in the order the sections appear, but
  // only when they are actually out of order — re-appending children that are
  // already in place still moves them in the DOM, and the track is a horizontally
  // scrolled flex row whose scroll offset would jump for no reason.
  //
  // Action pills carry no destination of their own (Full Report opens an overlay),
  // so each one travels with the section pill it follows. That is the same rule the
  // spine applies at build time, applied here to whatever is in the DOM.
  function _pdxNavSyncOrder(track, pills, targets) {
    try {
      var rank = {}, i;
      for (i = 0; i < targets.length; i++) rank[targets[i].target] = i;
      // Group: each entry is a lead pill plus the action pills trailing it.
      var groups = [], cur = null;
      pills.forEach(function (b) {
        var t = b.getAttribute('data-target');
        if (t && rank[t] !== undefined) { cur = { r: rank[t], pills: [b] }; groups.push(cur); return; }
        // A pill with a dead or not-yet-mounted destination keeps its place rather
        // than being sorted on a rank it does not have.
        if (!cur) { cur = { r: -1, pills: [b] }; groups.push(cur); return; }
        cur.pills.push(b);
      });
      var sorted = groups.slice().sort(function (a, b) { return a.r - b.r; });
      var want = [], k;
      for (i = 0; i < sorted.length; i++) {
        for (k = 0; k < sorted[i].pills.length; k++) want.push(sorted[i].pills[k]);
      }
      var same = want.length === pills.length;
      if (same) for (i = 0; i < want.length; i++) if (want[i] !== pills[i]) { same = false; break; }
      if (same) return;
      for (i = 0; i < want.length; i++) track.appendChild(want[i]);
    } catch (e) {}
  }

  // Drop every observer and the repaint hook. Called on re-arm and on close, so a
  // closed profile leaves nothing observing a detached subtree.
  function _pdxNavTeardown() {
    try { if (window._pdxNavObserver) window._pdxNavObserver.disconnect(); } catch (e) {}
    try { if (window._pdxNavEndObserver) window._pdxNavEndObserver.disconnect(); } catch (e) {}
    window._pdxNavObserver = null;
    window._pdxNavEndObserver = null;
    window._pdxNavRepaint = null;
  }
  window._pdxNavTeardown = _pdxNavTeardown;

  // ═══════════════════════════════════════════════════════════════════════════
  // Voting Record Highlights → the REAL roll-call record
  // ═══════════════════════════════════════════════════════════════════════════
  // WHY THIS EXISTS
  // The highlights block is built synchronously from the `votingRecords` map in the
  // profile template — a curated, hand-annotated selection of three to six votes.
  // That selection earns its place: every row carries a "why this matters" line
  // tying the vote to a promise and to who paid for the campaign, which no database
  // writes by itself. What it cannot do is stand in for the record. Printed alone,
  // five rows and a three-chip tally read as "this is what they have voted on",
  // while the profile is at that same moment fetching /api/voting-record — hundreds
  // of real roll calls per member, mapped to tracked issues, already feeding the
  // Word vs Action score and the Official Record section.
  //
  // So the section carries two layers. This fills the live one from the real
  // record: how much of it there is, how much of it is mapped to issues, and the
  // most recent votes by name, with a jump into the full filterable section. The
  // curated selection stays exactly as it was underneath, labelled as a selection.
  //
  // READS ONLY WHAT IS ALREADY WARM
  // Nothing here fetches. It reads PDXVotingRecord's synchronous cache — the same
  // one the comparison boards and the Alignment Tool read — which is warmed by
  // consistency.js's queue and by the voting-record section's own load. No record
  // warm (or no record at all: challengers, state officials, appointees) → the slot
  // stays empty and the block is byte-for-byte what it was before.
  //
  // NO SECOND SCORE
  // Counts, dates, positions and per-vote stance verdicts only — the same verdict
  // vocabulary the full record uses, from the same shared engine. Deliberately no
  // percentage and no aggregate kept/broken tally over the live set: Word vs Action
  // is the one primary score, and this is a pointer into the evidence beneath it.
  var _VRHI_POS = {
    yea:        { cls: 'vr-vote-yea',       label: 'Voted Yea' },
    nay:        { cls: 'vr-vote-nay',       label: 'Voted Nay' },
    present:    { cls: 'vr-vote-notvoting', label: 'Present' },
    not_voting: { cls: 'vr-vote-notvoting', label: 'Did Not Vote' }
  };
  function _vrhiTitleCase(s) {
    return String(s == null ? '' : s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function _vrhiDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    try { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  // Newest first; undated records sort last rather than being dropped.
  function _vrhiByDateDesc(a, b) {
    var ad = (a && a.date) || '', bd = (b && b.date) || '';
    if (ad === bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;
    return ad < bd ? 1 : -1;
  }
  var _VRHI_VERDICT = {
    consistent:  { cls: 'vr-v-consistent',  label: '✓ Matches stance' },
    contradicts: { cls: 'vr-v-contradicts', label: '⚠ Against stance' },
    mixed:       { cls: 'vr-v-mixed',       label: 'Mixed stance' }
  };
  function _vrhiCard(it, posMap) {
    var num = it.number ? '<span class="pdx-vrhi-num">' + _pdxEyeEsc(it.number) + '</span>' : '';
    var when = it.date ? '<span class="pdx-vrhi-date">' + _pdxEyeEsc(_vrhiDate(it.date)) + '</span>' : '';
    var pos = String(it.position || '').toLowerCase();
    var pill = '';
    if (it.kind === 'position') {
      pill = '<span class="vr-vote-pill vr-vote-execorder">' + _pdxEyeEsc(_vrhiTitleCase(it.position)) + '</span>';
    } else if (_VRHI_POS[pos]) {
      pill = '<span class="vr-vote-pill ' + _VRHI_POS[pos].cls + '">' + _VRHI_POS[pos].label + '</span>';
    } else if (pos) {
      pill = '<span class="vr-vote-pill vr-vote-notvoting">' + _pdxEyeEsc(_vrhiTitleCase(pos)) + '</span>';
    }
    // EVERY TOPIC THE VOTE DECIDED, AS A ROW OF EQUALS. This printed the flagged
    // issue as a full label and then folded the rest into "+4 more" — a grey,
    // unreadable count standing in for four real policies the same vote settled,
    // with the flag choosing which one got a name. The fold is gone: each mapped
    // topic gets its own chip, all the same chip, in the shared Big Picture order
    // (taxonomy category, then label). The meta row already wraps, so a five-topic
    // omnibus costs a line of height and buys back four named policies.
    var _lbl = function (k) {
      return (typeof window._issueLabel === 'function') ? (window._issueLabel(k) || k) : k;
    };
    var topics = (it.issues || []).filter(function (is) { return is && is.issueKey; });
    if (typeof window._pdxBigPictureOrder === 'function') {
      topics = window._pdxBigPictureOrder(topics, { labelFn: _lbl });
    }
    var issue = topics.map(function (is) {
      return '<span class="pdx-vrhi-issue">' + _pdxEyeEsc(_lbl(is.issueKey)) + '</span>';
    }).join('');
    // Per-vote stance verdict, from the SAME shared engine the full record card
    // uses — so a highlight never disagrees with the row it links to. Absent when
    // the member has no stated stance on the issue, which is the honest answer.
    //   One badge can only hold one stance comparison, and the topic it is built
    // from is the measure's flagged one — the permitted example-pick use of the
    // flag. Because this compact card has no room for the per-topic split the full
    // record card carries, the badge names its own scope in a tooltip instead of
    // floating unqualified above a row of chips it does not speak for.
    //   AND THE SCOPE IS ON THE FACE, NOT ONLY IN THE TOOLTIP. A tooltip is dead on
    // touch, and the thing it was carrying is the one thing that stops "✓ Matches
    // stance" reading as a verdict on the member's whole record on that topic. So
    // the scope is a printed line: it names the instrument first, names the topic
    // the comparison is against, and says plainly that one vote is one vote.
    var scoped = (it.issues && it.issues[0]) || null;
    var verdict = '', vScope = '';
    try {
      if (scoped && posMap[scoped.issueKey] && window._voteEffectiveSupport && window._stanceVoteVerdict) {
        var eff = window._voteEffectiveSupport(it, scoped.supportMeaning);
        var v = _VRHI_VERDICT[window._stanceVoteVerdict(posMap[scoped.issueKey].stance, eff)];
        if (v) {
          var vTip = 'On this act: compares the stated stance on ' + _lbl(scoped.issueKey) +
            ' with this one vote. It is not their record on ' + _lbl(scoped.issueKey) + '.' +
            (topics.length > 1 ? ' This vote also decided ' + (topics.length - 1) + ' other topic' +
              (topics.length > 2 ? 's' : '') + ', listed below and judged in the full record.' : '');
          verdict = '<span class="vr-verdict ' + v.cls + '" title="' + _pdxEyeEsc(vTip) + '">' + v.label + '</span>';
          vScope = '<div class="pdx-vrhi-scope">On this vote — stated stance on ' +
            _pdxEyeEsc(_lbl(scoped.issueKey)) + ' vs this one roll call' +
            (topics.length > 1 ? ', one of ' + topics.length + ' topics it decided' : '') + '</div>';
        }
      }
    } catch (e) {}
    return '<div class="pdx-vrhi-card">' +
        '<div class="pdx-vrhi-card-top">' +
          '<span class="pdx-vrhi-card-ref">' + num + when + '</span>' + verdict +
        '</div>' +
        (it.title ? '<div class="pdx-vrhi-card-title">' + _pdxEyeEsc(it.title) + '</div>' : '') +
        vScope +
        '<div class="pdx-vrhi-card-meta">' + pill + issue + '</div>' +
      '</div>';
  }
  // Exposed for scripts/test-big-picture-surfaces.mjs, matching the convention in
  // voting-record.js (window._vrCardHtml): a pure item → HTML function a node
  // harness can render without a DOM, so the highlight card's topic list is
  // testable and cannot quietly go back to naming one topic and counting the rest.
  window._pdxVoteHighlightCard = _vrhiCard;

  // Retires the cold-open "loading" line. Called when the live panel paints, and
  // when a load has landed and yielded nothing — either way the line has stopped
  // being true, and a permanent "loading…" is its own small lie.
  function _vrhiHideWait(host) {
    try {
      var w = host && host.querySelector('.pdx-vrhi-wait');
      if (w) w.hidden = true;
    } catch (e) {}
  }
  // opts.settled marks a call made because a voting-record load actually landed, as
  // opposed to a speculative re-check. Only a settled call is allowed to conclude
  // "there is no record here" and drop the placeholder.
  window._pdxHydrateVoteHighlights = function (opts) {
    try {
      // #pdx-vrhi is the one and only element that carries this attribute (it is
      // written a few hundred lines below, in the profile modal's markup), so ask
      // the id index rather than scanning. The attribute selector had no index
      // behind it: every warm event walked the whole document, and on the homepage
      // — 2 MB of DOM, no profile open, this handler bound globally to
      // pdx-consistency-warm / pdx-voting-warm — every one of those walks ran to
      // the end and returned null. That was the single largest remaining block on
      // homepage load. The attribute is still read, so a stray #pdx-vrhi without
      // it is still correctly ignored.
      var host = document.getElementById('pdx-vrhi');
      if (host && !host.hasAttribute('data-pdx-vrhi-pid')) host = null;
      if (!host) return;
      var slot = host.querySelector('.pdx-vrhi-live');
      var pid = host.getAttribute('data-pdx-vrhi-pid') || '';
      if (!slot || !pid) return;
      var VR = window.PDXVotingRecord;
      // No record module at all: nothing is coming, so stop saying it is.
      if (!VR || typeof VR.memberRecords !== 'function') { _vrhiHideWait(host); return; }
      var recs = VR.memberRecords(pid);
      if (!recs || !recs.length) {
        if (opts && opts.settled) _vrhiHideWait(host);
        return;
      }
      // Idempotent, and re-renders when the record GROWS (a later page loaded).
      if (slot.getAttribute('data-vrhi-n') === String(recs.length)) return;

      var counts = (typeof window._pdxRecordMappedCounts === 'function')
        ? window._pdxRecordMappedCounts(pid) : null;
      var total = (counts && counts.total) || recs.length;
      var pdoc = (window.PROFILES && window.PROFILES[pid]) ||
                 (window.CMP_DATA && window.CMP_DATA[pid]) || null;
      var first = (pdoc && pdoc.name) ? String(pdoc.name).split(' ')[0] : 'they';
      var posMap = {};
      try {
        if (typeof window._polPositionMap === 'function') posMap = window._polPositionMap(pid, pdoc) || {};
      } catch (e) {}

      // Prefer records that are mapped to a tracked issue — those are the ones a
      // stated position can be checked against, which is what this profile is for.
      // Nothing mapped yet → show the most recent records anyway rather than an
      // empty slot, since "here is the file" is still true and still useful.
      // "Is this record mapped to anything?" — asked of the whole mapping list, not
      // of issues[0]. A record whose first mapping happened to be malformed while
      // four others were fine used to count as unmapped.
      var mapped = recs.filter(function (it) {
        return !!(it && it.issues && it.issues.some(function (is) { return is && is.issueKey; }));
      });
      var pick = (mapped.length ? mapped : recs.slice()).sort(_vrhiByDateDesc).slice(0, 3);

      var line = counts && counts.votes
        ? (counts.votes + ' of them ' + (counts.votes === 1 ? 'is' : 'are') + ' mapped to ' +
           counts.issues + ' tracked issue' + (counts.issues === 1 ? '' : 's') +
           ' and checked against what ' + _pdxEyeEsc(first === 'they' ? 'they' : first) +
           ' said. Most recent first:')
        : 'Most recent first:';

      slot.innerHTML =
        '<div class="pdx-vrhi-live-hd">' +
          '<span class="pdx-vrhi-live-k">🗳️ From the roll-call record</span>' +
          '<span class="pdx-vrhi-live-n">' + total + ' record' + (total === 1 ? '' : 's') + ' on file</span>' +
        '</div>' +
        '<p class="pdx-vrhi-live-sub">' + line + '</p>' +
        '<div class="pdx-vrhi-cards">' + pick.map(function (it) { return _vrhiCard(it, posMap); }).join('') + '</div>' +
        '<button type="button" class="pdx-vrhi-open" ' +
          'onclick="if(window._pdxNavJump){window._pdxNavJump(\'pdxsec-voting\');}">' +
          'Open the full voting record · ' + total + ' record' + (total === 1 ? '' : 's') + ' <span aria-hidden="true">→</span>' +
        '</button>';
      slot.hidden = false;
      slot.setAttribute('data-vrhi-n', String(recs.length));
      host.classList.add('pdx-vrhi-haslive');
      _vrhiHideWait(host);
    } catch (e) { /* the curated selection below is the fallback; never break it */ }
  };
  // Re-run whenever the sync record cache warms: consistency.js fires
  // 'pdx-consistency-warm' when its own queue lands, and voting-record.js fires
  // 'pdx-voting-warm' when the section's load does. Either is the moment this can
  // stop guessing. The handler ignores the event's pid and re-reads the host's own,
  // so a warm for some other member can never paint the wrong record here.
  if (!window.__pdxVrhiBound) {
    window.__pdxVrhiBound = true;
    var _vrhiWarm = function () { window._pdxHydrateVoteHighlights(); };
    // Only the voting warm means a record load actually landed, so only it may
    // settle the placeholder. Consistency can warm first on a member whose roll
    // call is still in flight, and hiding the line there would be premature.
    var _vrhiSettled = function () { window._pdxHydrateVoteHighlights({ settled: true }); };
    window.addEventListener('pdx-consistency-warm', _vrhiWarm);
    window.addEventListener('pdx-voting-warm', _vrhiSettled);
  }

  function openModal(id) {
    // A card, saved My-Team pick or deep link (?p=<id>) may name an id that is
    // not the one the roster record lives under — a browse pid (`ray_ward` →
    // `rward`) or a curated theme key (`kivory` → `ivory_h39`). PDXProfilePid()
    // is the single resolution step for that, and it is the ONLY place profile
    // loading asks the question, so every entry point below (including the cold
    // deep-link path and the lazy full-profile refetch) inherits the fix. It
    // guarantees the result has a real record or is the id unchanged, so the
    // _pdxShowModalError branch further down still fires honestly for a genuinely
    // unknown id. See PDX_PROFILE_ALIAS for why this is not ACCT_ALIAS.
    if (id && typeof window.PDXProfilePid === 'function') id = window.PDXProfilePid(id);
    // Personal Impact Tracker (opt-in, private): opening a full profile is the
    // canonical "researched a candidate" signal. Deduped by id in PDXImpact, so
    // openModal's own re-entrant call (loading shell → refetch → re-run) counts once.
    try { if (id && window.PDXImpact) window.PDXImpact.record('researched', id); } catch (e) {}
    // The full profile needs the COMPLETE document (promises, voting record,
    // sections, etc.). When only the lightweight index stub is loaded for this
    // id, open the modal on a loading shell, lazy-fetch the full doc, then re-run
    // (which now finds the cached full data and renders normally). This also
    // covers cold deep-links (?p=<id>) where no modal was opened first.
    if (id && window._pdxFullIds && typeof window._pdxEnsureFullProfile === 'function' && !window._pdxFullIds.has(id)) {
      if (typeof window._pdxOpenFullModalShell === 'function') window._pdxOpenFullModalShell(id);
      window._pdxEnsureFullProfile(id).then(function () {
        // Firestore may not have a document for this id — some current officeholders
        // (e.g. recently appointed state legislators) live only in the bundled static
        // roster (CMP_DATA). Seed PROFILES from that fallback so the full profile still
        // opens instead of dead-ending on a spinner.
        if (!PROFILES[id] && typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) {
          PROFILES[id] = CMP_DATA[id];
        }
        openModal(id);
      });
      return;
    }
    let p = PROFILES[id];
    // The full-profile modal is normally PROFILES-backed (the live Firestore mirror).
    // When an officeholder exists only in the bundled static roster, fall back to it so
    // the PROFILE button reliably opens their profile; if neither source has the record,
    // surface a clear message rather than silently doing nothing.
    if (!p && typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) {
      p = PROFILES[id] = CMP_DATA[id];
    }
    if (!p) {
      if (typeof window._pdxShowModalError === 'function') window._pdxShowModalError(id);
      return;
    }

    // Each profile opens with the promise list unfiltered ("All").
    window._pdxActiveFilter = 'all';

    // The pledge ledger, as DATA. `_pdxDisplayScore` is still the guarded
    // accessor for the stored promise figure, and it is still what decides
    // whether a record counts as "resolved" vs "tracking" vs "nothing on file" —
    // but the figure itself is no longer printed anywhere on this profile.
    //
    // RETIRED AS A SCORE. There is ONE integrity read on a PolitiDex profile:
    // ⚖️ Word vs Action, "does what they say match what they do?". Everything
    // below is evidence feeding it, labelled for what it covers rather than
    // competing to rate the person:
    //   ⚖️ Word vs Action        — the primary read                 (word-action.js)
    //   🏛️ Official Record      — the test: votes / formal actions (consistency.js)
    //   🧾 Say-vs-Do            — supporting receipts              (consistency.js)
    //   🤝 Promise Receipts     — kept / broken / pending pledges   (counts only)
    // `scoreNum` therefore survives as a STATE FLAG (null vs a number) and must
    // not be interpolated into markup. There is no scoreText and no scoreColor
    // any more: colour keyed to a percentage is that percentage published as
    // paint, which is how the old second scoreboard kept leaking back in.
    const scoreNum = window._pdxDisplayScore(p);
    const pendingCount = typeof p.pending === 'number' ? p.pending : (p.promises ? p.promises.filter(r=>r.verdict==='pending').length : 0);
    // The unresolved side of the ledger. `promiseState` separates a profile that
    // is genuinely tracking promises (none resolved yet) from one with nothing on
    // file — two cases the hero used to render identically. The pledge lane's own
    // denominator and pending note now live in its block rather than under the
    // hero ring, which reports the primary read's denominator instead.
    const promiseState = (typeof window._pdxPromiseState === 'function') ? window._pdxPromiseState(p) : (scoreNum === null ? 'empty' : 'resolved');
    const trackingNote = (typeof window._pdxTrackingNote === 'function') ? window._pdxTrackingNote(p) : '';
    const trackedLabel = (typeof window._pdxTrackedCountLabel === 'function') ? window._pdxTrackedCountLabel(p) : '';
    // Does this record carry an inspectable pledge list, or only summary counts?
    // No rate is published either way now — this decides whether the pledge
    // counts are CLICKABLE (there is a ledger below to filter) and whether the
    // block says "not itemized yet". Resolved once here and passed down so the
    // hero chip, the header and the receipts block cannot reach different
    // conclusions about the same record.
    const pledgeItemized = (typeof window._pdxHasItemizedPledges === 'function')
      ? window._pdxHasItemizedPledges(p) : true;
    const countsNote = (typeof window._pdxCountsNote === 'function') ? window._pdxCountsNote(p) : '';
    // THE HEADER'S PLEDGE LEDGER IS GONE. It was built here purely to feed a chip
    // under the score ring; the chip is retired, so the counts are not assembled for
    // the header at all any more. The same figures are still computed where they are
    // actually used — the ledger inside the drawers, and the pledge tier of the one
    // score — and nothing above the fold restates them.

    // Top bar
    document.getElementById('modal-icon').textContent = p.icon;
    document.getElementById('modal-icon').style.background = p.iconBg;
    document.getElementById('modal-icon').style.borderColor = p.iconBorder;
    document.getElementById('modal-name-small').textContent = p.name;
    document.getElementById('modal-office-small').textContent = p.office + ' · ' + p.state;

    // Score ring SVG — the PRIMARY read (⚖️ Word vs Action).
    // ONE headline percentage per profile. This ring used to print the pledge-only
    // rate captioned "Promises", which meant a profile could open with 73% while
    // the Word vs Action section a screen below said 82% and the Official Record
    // said something else again — three numbers competing to answer one question.
    // The pledge rate is now the top TIER inside the primary read rather than a
    // rival to it, so the hero and the section call the same read() and cannot
    // diverge. `scoreNum` survives below for the pledge lane's own block, its
    // formula and the roster card — none of which are headline scores any more.
    //
    // Fail-closed states are the engine's, not this file's: below the tested-item
    // and weight floors the ring shows "—" or "⏳" with the reason underneath, and
    // when no word at all is on file it falls back to the promise tracker's honest
    // "tracking" / "monitoring" treatment. It never substitutes a narrower number.
    //
    // The pledge ledger is NO LONGER handed to the hero. It used to render as a
    // quiet chip under the ring — "🤝 6 kept · 6 broken · 2 pending" — which put
    // promise counts above the fold as the second thing a reader met. Three numbers
    // under one number still read as two findings. The pledge lane is the top tier
    // INSIDE the ring's percentage; it is named in the score's own feeds list and
    // its ledger lives in the drawers, which is where an input belongs.
    const scoreRing = (window.PDXWordAction && typeof window.PDXWordAction.heroMount === 'function')
      ? window.PDXWordAction.heroMount(id, p, { trackingLabel: (promiseState === 'tracking' ? trackedLabel : ''), trackingNote: trackingNote })
      : (promiseState === 'tracking' ? `
      <div class="profile-score-stack">
        <div class="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center profile-score-tracking">
          <div style="font-size:1.5rem;line-height:1;">⏳</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.5rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#f5c842;margin-top:0.22rem;text-align:center;">${trackedLabel}</div>
        </div>
        <div class="profile-score-track-note">${trackingNote}</div>
      </div>` : `<div class="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center" style="background:rgba(100,116,139,0.15);border:1px solid rgba(100,116,139,0.3);">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:#9fb4d4;line-height:1;">—</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">Monitoring</div>
      </div>`);

    // Key issues pills
    const _keyIssues = window._pdxKeyIssues(p);
    const issuePills = _keyIssues.map(i => `<span class="issue-pill">${i}</span>`).join('');

    // Promise table rows
    const verdictMap = {
      kept:    { badge: '<span class="vbadge vbadge-kept">✓ Kept</span>',       row: '' },
      broken:  { badge: '<span class="vbadge vbadge-broken">✗ Broken</span>',   row: 'rgba(248,113,113,0.03)' },
      pending: { badge: '<span class="vbadge vbadge-pending">⏳ Pending</span>', row: 'rgba(245,200,66,0.03)' },
      partial: { badge: '<span class="vbadge vbadge-partial">~ Partial</span>',  row: 'rgba(96,165,250,0.03)' },
    };
    // Group promises by verdict so kept / broken / pending read at a glance
    // instead of being mixed together — each group gets a colored header,
    // a count, and a colored left rail for fast scanning.
    const _pGroups = [
      { v:'kept',    label:'Kept',    color:'#4ade80', icon:'✓' },
      { v:'broken',  label:'Broken',  color:'#f87171', icon:'✗' },
      { v:'partial', label:'Partial', color:'#60a5fa', icon:'~' },
      { v:'pending', label:'Pending', color:'#f5c842', icon:'⏳' },
    ];
    const promiseRows = (p.promises && p.promises.length) ? _pGroups.map(g => {
      const rows = (p.promises || []).filter(r => (r.verdict || 'pending') === g.v);
      if (!rows.length) return '';
      return `<div data-verdict="${g.v}" style="padding-top:0.4rem;">
        <div style="display:flex;align-items:center;gap:0.4rem;font-family:'Barlow Condensed',sans-serif;font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${g.color};padding:0.45rem 0 0.4rem;border-bottom:1px solid ${g.color}26;margin-bottom:0.1rem;">
          <span>${g.icon} ${g.label}</span>
          <span style="margin-left:auto;background:${g.color}1a;border:1px solid ${g.color}44;color:${g.color};border-radius:999px;padding:0.02rem 0.5rem;">${rows.length}</span>
        </div>` + rows.map(r => {
          // Source chips — promises may carry a `sources` array of {url,label}
          // objects (or bare URL strings). Surfacing them here lets the receipts
          // show right next to each promise instead of only inside the deep-dive.
          const _srcs = Array.isArray(r.sources) ? r.sources : [];
          const _srcHtml = _srcs.length ? '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.4rem;">' + _srcs.map(s => {
            const _u = (s && typeof s === 'object') ? s.url : s;
            if (!_u) return '';
            let _lbl = (s && typeof s === 'object' && s.label) ? s.label : '';
            if (!_lbl) { try { _lbl = new URL(_u).hostname.replace(/^www\./, ''); } catch (e) { _lbl = 'Source'; } }
            return `<a href="${_u}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="dd-source-chip">🔗 ${_lbl}</a>`;
          }).join('') + '</div>' : '';
          // Camera-eye + a prominent, direct "Watch Video" pill whenever a
          // verified floor/committee video is tied to this promise's issue. The
          // small icon sits by the title; the gold pill below the detail is the
          // unmissable, ungated one-tap jump to the clip (at its timestamp) — so
          // video proof on a Promise no longer hides behind the Evidence Locker.
          const _pVid = (typeof window._pdxPromiseVideo === 'function')
            ? window._pdxPromiseVideo(id, p, r) : null;
          const _pEye = (_pVid && typeof window._pdxVideoEye === 'function')
            ? window._pdxVideoEye(_pVid, {}) : '';
          const _pWatch = (_pVid && typeof window._pdxWatchPill === 'function')
            ? '<div style="margin-top:0.45rem;">' + window._pdxWatchPill(_pVid, { label: 'Watch Video' }) + '</div>' : '';
          return `<div class="promise-row" style="padding:0.6rem 0 0.6rem 0.7rem;border-left:2px solid ${g.color}55;margin:0.15rem 0;">
          <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem;"><span style="font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:0.85rem;color:white;letter-spacing:0.01em;">${r.title}</span>${_pEye}</div>
          <div style="font-size:0.78rem;color:#9fb4d4;line-height:1.5;">${r.detail}</div>
          ${_pWatch}
          ${_srcHtml}
          ${(typeof window._pdxPromiseImpactHTML === 'function') ? window._pdxPromiseImpactHTML(id, p, r) : ''}
          ${(typeof window._pdxPromiseEvidenceLink === 'function') ? window._pdxPromiseEvidenceLink(id, p, r) : ''}
          ${(typeof window._pdxSpotlightEngageHTML === 'function') ? window._pdxSpotlightEngageHTML(window._pdxVoteTargetId('promise', id, r.title), 'this promise') : ((typeof window._pdxVoteControlHTML === 'function') ? window._pdxVoteControlHTML(window._pdxVoteTargetId('promise', id, r.title), 'this promise') : '')}
        </div>`;
        }).join('') + `</div>`;
    }).join('') : '';

    // Filter tabs for the Promise Tracker — "All" plus one tab per verdict
    // that actually has promises, so the list can be narrowed to a single
    // status. Mirrors the clickable kept/broken/pending counts in the hero.
    const promiseFilterBar = (p.promises && p.promises.length) ? (function(){
      const counts = { all: p.promises.length };
      _pGroups.forEach(g => { counts[g.v] = (p.promises || []).filter(r => (r.verdict || 'pending') === g.v).length; });
      const tab = (f, label) => `<button type="button" class="pdx-pfilter-btn${f==='all'?' active':''}" data-f="${f}" aria-pressed="${f==='all'?'true':'false'}" onclick="window.pdxToggleFilter('${f}')">${label} <span class="pdx-pfilter-n">${counts[f]}</span></button>`;
      let btns = tab('all', 'All');
      _pGroups.forEach(g => { if (counts[g.v]) btns += tab(g.v, `${g.icon} ${g.label}`); });
      return `<div id="pdx-promise-filter" class="pdx-pfilter">${btns}</div>`;
    })() : '';

    // Stats summary bar
    const keptCount  = (p.promises||[]).filter(r=>r.verdict==='kept').length;
    const brokenCount = (p.promises||[]).filter(r=>r.verdict==='broken').length;
    const pendingAct = (p.promises||[]).filter(r=>r.verdict==='pending').length;

    // Thin / early-stage profile detection — when a politician has no published
    // score, no resolved promises, and no detailed promise list, the profile
    // would otherwise render as a stack of empty placeholders that reads as
    // broken. We instead surface a single honest notice up top and let the
    // stated-positions sections below carry the rest.
    const _pbThin = p.promiseBreakdown || {};
    const _pbThinTotal = (_pbThin.kept||0) + (_pbThin.compromise||0) + (_pbThin.broken||0) + (_pbThin.pending||0);
    const _resolvedCount = (keptCount || p.kept || 0) + (brokenCount || p.broken || 0);
    // Thin when there is no scorable record yet (no published score and nothing
    // resolved). A score-less profile that carries only a few pending pledges still
    // counts — the notice explains the gap while the pending items list below it.
    const _isThinProfile = scoreNum === null && _resolvedCount === 0 && _pbThinTotal === 0;
    const _statusMode = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(p) : 'office';
    const _is2026 = (typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(p);
    const _isChallenger = _statusMode === 'candidate' || /candidat|challenger|nominee|running/i.test(((p.office||'') + ' ' + (p.state||'')));
    const _thinTitle = _isChallenger
      ? (_is2026 ? '2026 Candidate — no voting record yet' : 'Candidate — no voting record yet')
      : 'Early in term — limited record';
    const _onTeamAlready = (typeof _myPoliticians !== 'undefined' && _myPoliticians && _myPoliticians.has(id));
    // THE FALLBACK'S BUTTON PAIR IS RETIRED. It offered 🎯 Compare on the issues
    // and ★ Add to my team, the same two actions the sticky rail and the roster
    // card already carry, and the same pair the limited-record card carried until
    // this pass took it out of there for the same reason. This notice only renders
    // when the card itself fails, so the two had to move together or the fallback
    // would have been the louder of the two. What is left is the sentence that
    // says what a reader can still do without a record — no button row, no third
    // offer of a control that is two taps away in the chrome.
    const _thinNext =
      '<div class="ptn-next">' +
        '<p class="ptn-text" style="margin-top:0;font-size:0.74rem;">No tracked promises yet — but you can still ' +
          '<strong style="color:#c4b5fd;">compare ' + (p.name ? p.name.split(' ')[0] : 'them') + ' on the issues you care about</strong> with the Alignment Tool, or ' +
          '<strong style="color:#fbbf24;">' + (_onTeamAlready ? 'keep them on your team' : 'add them to your team and check back later') + '</strong> as the record fills in.</p>' +
      '</div>';
    const thinNotice = _isThinProfile ? (
      '<div class="profile-thin-notice">' +
        '<div class="ptn-icon">' + (_isChallenger ? '🗳️' : '🌱') + '</div>' +
        '<div class="ptn-body">' +
          '<div class="ptn-title">' + _thinTitle + '<span class="ptn-pill">◷ Monitoring</span></div>' +
          '<p class="ptn-text">' + (_isChallenger
            ? ('This politician is running as a ' + (_is2026 ? '2026 challenger' : 'challenger') + ' and does not yet have a legislative voting record in this office, so there is nothing to score yet. We are tracking their stated positions now and will log kept-and-broken promises as the race develops.')
            : 'Early in their first term, this official does not yet have enough of a record to score fairly. We are tracking their stated positions now and will log kept-and-broken promises as their record develops.') + '</p>' +
          // ↑ NOT ↓. This notice mounts at the FOOT of the verdict stage now, under
          // 🌳 All Issues by Topic — the positions it used to promise "below" are
          // above the reader by the time they get here.
          '<div class="ptn-hint">↑ ' + (window._pdxKeyIssues(p).length ? 'Their issues are grouped by topic in 🌳 All Issues by Topic above' : 'Their stated positions are grouped by topic in 🌳 All Issues by Topic above') + '</div>' +
          _thinNext +
        '</div>' +
      '</div>'
    ) : '';

    // The limited-record card — supersedes the bare thin notice on low-data
    // profiles with the four things nothing else on the page can derive: why the
    // record is thin, where the positions are browsed, what an alignment match
    // rests on without a voting record behind it, and what is being gathered.
    // Returns '' for a full record (or on error), so the template cleanly falls
    // back to thinNotice. Both mount at the foot of the verdict stage.
    const candidateSnapshot = (typeof window._renderCandidateSnapshot === 'function')
      ? window._renderCandidateSnapshot(id, p, { isThin: _isThinProfile })
      : '';
    // Record whether the cohesive Candidate Snapshot actually rendered on THIS
    // profile, so downstream sections (e.g. the Key Issue Stances "Limited Record"
    // panel) only cross-reference it when it is really there — never pointing a
    // visitor at a section that isn't present on a limited-but-scored officeholder.
    window._pdxSnapshotShownId = candidateSnapshot ? id : null;

    // Extra sections
    let extraSections = '';
    for (const sec of (p.sections || [])) {
      if (sec.type === 'alert') {
        const rows = (sec.content || []).map(c => `
          <div style="margin-bottom:1rem;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#fb923c;margin-bottom:0.3rem;">${c.heading}</div>
            <p style="font-size:0.82rem;color:rgba(254,215,170,0.85);line-height:1.6;">${c.text}</p>
          </div>`).join('');
        extraSections += `
          <div class="modal-section">
            <div class="modal-section-title" style="color:#fb923c;">${sec.label || sec.title}</div>
            <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.3);border-radius:0.875rem;overflow:hidden;">
              <div style="background:rgba(249,115,22,0.14);border-bottom:1px solid rgba(249,115,22,0.2);padding:0.6rem 1rem;">
                <span style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;letter-spacing:0.1em;color:#fb923c;">${sec.title}</span>
              </div>
              <div style="padding:1rem 1rem 0.5rem;">${rows}</div>
            </div>
          </div>`;
      } else if (sec.type === 'deepdive') {
        const ddId = 'dd-' + Math.random().toString(36).slice(2,8);
        const keptRows = (sec.promises || []).filter(r => r.verdict === 'kept');
        const brokenRows = (sec.promises || []).filter(r => r.verdict === 'broken');
        const pendingRows = (sec.promises || []).filter(r => r.verdict === 'pending');
        const renderDDRows = (rows, color, icon) => rows.map(r => `
          <div class="dd-promise-row">
            <div style="display:flex;align-items:flex-start;gap:0.6rem;">
              <div style="flex-shrink:0;margin-top:0.1rem;">
                <span style="display:inline-flex;align-items:center;gap:0.2rem;background:${color}22;border:1px solid ${color}44;color:${color};font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.15rem 0.4rem;border-radius:999px;">${icon}</span>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.8rem;color:white;margin-bottom:0.15rem;">${r.title}</div>
                <div style="font-size:0.75rem;color:#9fb4d4;line-height:1.5;margin-bottom:${r.sources && r.sources.length ? '0.4rem' : '0'};">${r.detail}</div>
                ${r.sources && r.sources.length ? '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">' + r.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener" class="dd-source-chip">🔗 ${s.label}</a>`).join('') + '</div>' : ''}
                ${(typeof window._pdxSpotlightEngageHTML === 'function') ? window._pdxSpotlightEngageHTML(window._pdxVoteTargetId('promise', id, r.title), 'this promise') : ((typeof window._pdxVoteControlHTML === 'function') ? window._pdxVoteControlHTML(window._pdxVoteTargetId('promise', id, r.title), 'this promise') : '')}
              </div>
            </div>
          </div>`).join('');
        let ddContent = '';
        if (keptRows.length) ddContent += `<div style="padding:0.4rem 0.875rem 0.1rem;"><div style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4ade80;padding:0.4rem 0 0.3rem;">✓ Kept (${keptRows.length})</div></div>` + renderDDRows(keptRows, '#4ade80', '✓ Kept');
        if (brokenRows.length) ddContent += `<div style="padding:0.4rem 0.875rem 0.1rem;"><div style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f87171;padding:0.4rem 0 0.3rem;">✗ Broken (${brokenRows.length})</div></div>` + renderDDRows(brokenRows, '#f87171', '✗ Broken');
        if (pendingRows.length) ddContent += `<div style="padding:0.4rem 0.875rem 0.1rem;"><div style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f5c842;padding:0.4rem 0 0.3rem;">⏳ Pending (${pendingRows.length})</div></div>` + renderDDRows(pendingRows, '#f5c842', '⏳ Pending');
        extraSections += `
          <div class="modal-section">
            <button class="dd-toggle-btn" onclick="toggleDD('${ddId}')" id="btn-${ddId}">
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.1em;color:#9fb4d4;">📂 ${sec.title || 'Deep Dive — Evidence & Sources'}</span>
                <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(159,180,212,0.12);border:1px solid rgba(159,180,212,0.2);color:#7596c0;padding:0.1rem 0.4rem;border-radius:999px;">${(sec.promises||[]).length} entries · ${(sec.sources_count||0)} sources</span>
              </div>
              <svg class="dd-chevron w-4 h-4 text-steel-400" fill="none" stroke="#7596c0" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="dd-body" id="${ddId}">
              <div class="dd-inner">${ddContent}</div>
            </div>
          </div>`;
      } else if (sec.type === 'info') {
        const borderColor = sec.color === 'gold' ? 'rgba(245,200,66,0.3)' : 'rgba(159,180,212,0.2)';
        const bgColor = sec.color === 'gold' ? 'rgba(245,200,66,0.07)' : 'rgba(30,53,96,0.4)';
        const textColor = sec.color === 'gold' ? '#f5c842' : '#9fb4d4';
        extraSections += `
          <div class="modal-section">
            <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:0.75rem;padding:1rem;">
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:${textColor};margin-bottom:0.4rem;">${sec.title}</div>
              <p style="font-size:0.82rem;color:#9fb4d4;line-height:1.6;">${sec.text}</p>
            </div>
          </div>`;
      }
    }

    // ── Quick-jump nav data ─────────────────────────────────────────────
    // A glanceable "map" of the profile: one pill per major section, each
    // carrying a live summary and smooth-scrolling to its section. Built here
    // from the same figures the sections render, so a pill never disagrees
    // with the content below, and self-gating — a section with nothing to show
    // contributes no pill (the whole rail hides if fewer than two survive).
    // One receipt count for the 🔗 pill and the 🕑 Activity fallback, from the same
    // helper the live repaint reads — see window._pdxNavEvidenceCount.
    const _navEvidenceCount = window._pdxNavEvidenceCount(id, p);

    let _navActivityRel = '';
    try {
      const _ats = p.updatedAt || p.createdAt;
      if (_ats && typeof window._pdxRelTime === 'function') _navActivityRel = window._pdxRelTime(_ats);
    } catch (e) { _navActivityRel = ''; }
    const _navActivityHas = !!(_navActivityRel || (p.promises && p.promises.length) || _navEvidenceCount || window._pdxKeyIssues(p).length);
    const _navActivityVal = _navActivityRel ? ('Updated ' + _navActivityRel)
      : ((p.promises && p.promises.length) ? (p.promises.length + ' tracked')
      : (_navEvidenceCount ? (_navEvidenceCount + ' receipts') : 'View'));

    const _navItems = [];
    // The pushes below are written in reading order, but that is a courtesy to the
    // reviewer, not the source of truth any more. PDXProfileSpine.railOrder() sorts
    // this list by the stage each destination lives in, and _pdxInitProfileNav then
    // sorts what it finds by real document position — so the rail cannot disagree
    // with the page even if a push is added in the wrong place, and the active pill
    // can only move forwards as the reader scrolls down.
    //
    // Deriving it also settled an argument the hand-maintained order was getting
    // wrong: pills go where they SEND you, not where they were typed. That is why
    // the Record pill now aims at pdxsec-official-record — the one formal-record
    // lane — instead of at a pledge drawer at the foot of the page.
    //
    // ⚖️ Word vs Action — the primary read, so it leads the rail, and now leads the
    // page too. Value is the weighted percentage when the record clears the
    // fail-closed floors, and the honest state ("Checking…" / "Thin record") when it
    // does not — never a bare number standing in for one. Self-gating: no pill when
    // no word is on file.
    // EVERY FIGURE BELOW COMES FROM window._pdxNavChips, and it is the same call the
    // warm repaint makes — so a pill's build-time value and its repainted value are
    // the same derivation, not two copies of it. `live` is the key the repaint writes
    // back into; a pill without one is a static destination (no figure to keep up).
    const _navChips = window._pdxNavChips(id, p);
    // 🏛 The record — the compact formal summary, and the first destination on the
    // page, so it is the first pill. Pushed ahead of ⚖️ because the standout stage
    // is ahead of the verdict stage; railOrder would put it there anyway, and the
    // push order is written to agree with the derivation rather than to test it.
    // Self-gating through the chip: no chip, no pill, and the chip is absent
    // exactly when the strip does not mount.
    if (_navChips.standout) {
      _navItems.push({ target: 'pdxsec-standout', icon: '🏛', label: 'The record',
        live: 'standout', value: _navChips.standout.value,
        color: _navChips.standout.color, note: _navChips.standout.note,
        pending: _navChips.standout.pending });
    }
    // 🌳 By topic — the browse gateway, and the reason this pass exists. It is the
    // one surface a reader explores the record issue by issue from, so it gets a
    // rail entry of its own rather than being something you find by scrolling past
    // the score. Second, because the explore stage is second.
    if (_navChips.topics) {
      _navItems.push({ target: 'pdxsec-stancetree', icon: '🌳', label: 'By topic',
        live: 'topics', value: _navChips.topics.value,
        color: _navChips.topics.color, note: _navChips.topics.note,
        pending: _navChips.topics.pending });
    }
    if (_navChips.wordaction) {
      _navItems.push({ target: 'pdxsec-wordaction', icon: '⚖️', label: 'Word vs Action',
        live: 'wordaction', value: _navChips.wordaction.value,
        color: _navChips.wordaction.color, note: _navChips.wordaction.note,
        pending: _navChips.wordaction.pending });
    }
    // 🎯 Positions — number of tracked key issues, and the doorway to 🧭 Stances &
    // Connections, which now opens that stage. Pushed SECOND, because the signature
    // stage sits second on the page under the locked reading order: the verdict,
    // then what they stand for, then the record that tests it. The push order here
    // IS the rail order.
    if (_navChips.positions) {
      _navItems.push({ target: 'pdxsec-positions', icon: '🎯', label: 'Positions',
        live: 'positions', value: _navChips.positions.value, color: _navChips.positions.color,
        note: _navChips.positions.note, pending: _navChips.positions.pending });
      // Full Report — a dedicated rail entry that OPENS the Full Stance Record
      // overlay (every issue + evidence depth + honest gaps) rather than scrolling
      // to a section, so the deepest per-issue view is one tap from the map. Sits
      // right after Positions since it is the "see everything" extension of it.
      _navItems.push({ action: 'stance', stanceId: _pdxEvJsId(id), icon: '📑', label: 'Full Report', value: 'All Stances', color: '#7fb4ff' });
    }
    // 🏛️ / ✒️ Official Record — the one formal-record lane, and until this pass the
    // one section on the profile with no pill at all. The rail carried "Promises",
    // "Record" and "Enactments" instead: two pledge counts and an executive count,
    // three entries for what is now a single spine. Office-aware label, count only —
    // the rail carries exactly one percentage (the ⚖️ pill leading it).
    try {
      const _isExecPid = !!(window.PDXExecRecord && typeof window.PDXExecRecord.eligible === 'function' && window.PDXExecRecord.eligible(id));
      if (_navChips.record) {
        _navItems.push({
          target: 'pdxsec-official-record', icon: _isExecPid ? '✒️' : '🏛️',
          label: 'Record', live: 'record',
          value: _navChips.record.value, color: _navChips.record.color,
          note: _navChips.record.note, pending: _navChips.record.pending
        });
      }
    } catch (e) {}
    // 🔥 Flashpoints — the heat-only block, shown only when at least one sourced
    // contradiction / broken promise / flagged event is on record. Fourth in the
    // rail because the tension stage is fourth on the page, behind the record it is
    // contesting.
    try {
      if (typeof window._pdxControversyCount === 'function') {
        const _navCtv = window._pdxControversyCount(id, p);
        if (_navCtv > 0) {
          _navItems.push({ target: 'pdxsec-controversies', icon: '🔥', label: 'Flashpoints', value: _navCtv + ' Flashpoint' + (_navCtv === 1 ? '' : 's'), color: '#f87171' });
        }
      }
    } catch (e) {}
    // 🤝 PROMISES PILL RETIRED. The rail carried "Promises · 6K · 6B · 2P" here —
    // a second scoreboard in the header strip, sitting one pill away from the ⚖️
    // percentage and reading as a rival tally of the same politician. It had
    // already been cut from two pills to one; this pass cuts it to none. The
    // pledge ledger is reachable from the ⚖️ Word vs Action feeds list, which is
    // the honest doorway to it: an input to the score, opened from the score.
    // Evidence — total receipts/sources/clips gathered. The shared proof layer.
    if (_navChips.evidence) {
      _navItems.push({ target: 'pdxsec-evidence', icon: '🔗', label: 'Evidence',
        live: 'evidence', value: _navChips.evidence.value, color: _navChips.evidence.color,
        note: _navChips.evidence.note, pending: _navChips.evidence.pending });
    }
    // Funding — who bankrolls them, shown only when a filing record is on file.
    // Pushed before Match: money is its own lens and sits above the alignment tail
    // in the locked reading order, so the rail says the same thing the page does.
    try {
      if (typeof window._pdxFunding === 'function') {
        const _navFund = window._pdxFunding(id);
        if (_navFund) {
          const _fk = (_navFund.character && _navFund.character.kind) || 'unknown';
          const _fc = _fk === 'grassroots' ? '#6ee7a0' : _fk === 'bigmoney' ? '#f87171' : _fk === 'mixed' ? '#f5c842' : '#9fb4d4';
          const _fi = (_navFund.character && _navFund.character.icon) || '💰';
          _navItems.push({ target: 'pdxsec-funding', icon: _fi, label: 'Funding', value: _navFund.raisedFmt, color: _fc });
        }
      }
    } catch (e) {}
    // Match — the visitor's personal alignment %, when they've set it up.
    try {
      const _navHasIssues = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      if (_navHasIssues && typeof _calcAlignmentScore === 'function') {
        const _navMatch = _calcAlignmentScore(id);
        if (_navMatch !== null && _navMatch !== undefined) {
          const _mc = _navMatch >= 70 ? '#4ade80' : _navMatch >= 50 ? '#f5c842' : '#f87171';
          _navItems.push({ target: 'pdxsec-match', icon: '🤝', label: 'Match', value: _navMatch + '% Match', color: _mc });
        }
      }
    } catch (e) {}
    // Activity — freshness / how much is tracked.
    if (_navActivityHas) {
      _navItems.push({ target: 'pdxsec-activity', icon: '🕑', label: 'Activity', value: _navActivityVal, color: '#9fb4d4' });
    }

    // The rail order is the spine order. Sorting here rather than trusting the push
    // sequence means the one place the profile records its top-to-bottom shape —
    // STAGES, plus the anchor registry beside it — is also the place that decides
    // the rail. A missing spine is not a reason to lose the rail, so an unsorted
    // list is the fallback.
    const _navOrdered = (window.PDXProfileSpine && typeof window.PDXProfileSpine.railOrder === 'function')
      ? window.PDXProfileSpine.railOrder(_navItems)
      : _navItems;

    // A single pill isn't a "map" — only render the rail when at least two exist.
    const _navBar = (_navOrdered.length >= 2)
      ? '<nav id="pdx-profile-nav" class="pdx-pnav" data-pdxnav-pid="' + id +
          '" aria-label="Jump to a section of this profile">' +
          '<div class="pdx-pnav-track">' +
            _navOrdered.map(function (n) {
              // Action pill — opens an overlay (Full Stance Record) instead of
              // scrolling to an in-page anchor. It carries no data-target, so the
              // scroll-spy cleanly ignores it and it never steals the active state.
              if (n.action === 'stance') {
                return '<button type="button" class="pdx-pnav-pill pdx-pnav-action" ' +
                  'aria-label="' + n.label + ': ' + String(n.value).replace(/"/g, '') + ' — opens the full record on the issues" ' +
                  'onclick="window._pdxOpenStanceRecord && window._pdxOpenStanceRecord(\'' + n.stanceId + '\')">' +
                  '<span class="pdx-pnav-ico" aria-hidden="true">' + n.icon + '</span>' +
                  '<span class="pdx-pnav-txt">' +
                    '<span class="pdx-pnav-label">' + n.label + '</span>' +
                    '<span class="pdx-pnav-val" style="color:' + n.color + ';">' + n.value + '</span>' +
                  '</span>' +
                '</button>';
              }
              // `data-pdxnav-live` is the handle the warm repaint writes through, and
              // `data-pdxnav-label` is what it rebuilds the accessible name from. A
              // pending pill is marked as data so the skin can say it is still
              // reading rather than looking like a settled figure.
              return '<button type="button" class="pdx-pnav-pill" data-target="' + n.target + '" ' +
                (n.live ? 'data-pdxnav-live="' + n.live + '" data-pdxnav-label="' + n.label + '" ' : '') +
                (n.pending ? 'data-pdxnav-pending="1" ' : '') +
                'aria-label="' + window._pdxNavChipAria(n.label, n.value, n.note) + '" ' +
                'onclick="window._pdxNavJump && window._pdxNavJump(\'' + n.target + '\', this)">' +
                '<span class="pdx-pnav-ico" aria-hidden="true">' + n.icon + '</span>' +
                '<span class="pdx-pnav-txt">' +
                  '<span class="pdx-pnav-label">' + n.label + '</span>' +
                  '<span class="pdx-pnav-val" style="color:' + n.color + ';">' + n.value + '</span>' +
                '</span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</nav>'
      : '';

    // Assemble full modal content.
    //
    // The body below is written in the order these sections were BUILT; it is
    // rendered in the order a reader needs them. Each block carries a one-line
    // <!--PDXSP:stage--> sentinel naming the stage of the profile spine it belongs
    // to (identity → brief → verdict → tension → signature issues → official
    // record → receipts → you → money → full-record drawers), and PDXProfileSpine
    // reorders and wraps them on the way to the DOM. Annotating in place rather
    // than physically moving hundred-line renderers keeps the diff reviewable and
    // makes the sequence a declaration instead of an accident of line numbers.
    //
    // That sequence is a path, not a table of contents: the verdict, then what
    // contradicts it, then what the person is known for, then the apparatus that
    // produced the verdict. See the STAGES block in profile-spine.js for why each
    // stage sits where it does — it is the one place that decision is recorded.
    //
    // Blocks tagged dw:<name> are deep-record content: they are preserved in full
    // and collected behind one labelled, closed-by-default drawer per name.
    const _profileBody = `

      <!-- Hero header — clean letterhead: photo, identity, status, score -->
      <div class="profile-hero">
        <div class="profile-hero-photo">
          ${(function(){ var _hp = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(id) : (p.photo || ''); return _hp ? `<img loading="lazy" decoding="async" src="${_hp}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=&quot;ph-fallback&quot;>${p.icon}</div>'">` : `<div class="ph-fallback">${p.icon}</div>`; })()}
        </div>
        <div class="profile-hero-id">
          <div class="profile-eyebrow">${p.office || 'Public Official'}</div>
          <h2 class="profile-name">${p.name}</h2>
          ${(function(){ var parts=[p.district,p.state].filter(Boolean); return parts.length ? '<div class="profile-office">' + parts.join('<span class="po-sep">·</span>') + '</div>' : ''; })()}
          ${(function(){ var tp=(typeof window._pdxTenurePill==='function')?window._pdxTenurePill(p):''; return tp ? '<div class="profile-tenure">' + tp + '</div>' : ''; })()}
          <div class="profile-meta">
            ${(typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(p) : ''}
            ${(typeof window._pdxDepthBadge === 'function') ? window._pdxDepthBadge(p) : ''}
            <!-- The one-line form of ⚖️ Word vs Action, sized like the pills it sits
                 among: the figure, the verdict word, and a tap that scrolls to the
                 section further down that shows the working. It is here, in the
                 identity block, because this is where a reader is already looking,
                 and it is small here because the ring beside it is the headline
                 read and there must not be two of those. It is what replaced the
                 two full-width strips that used to hang under the letterhead
                 saying the same thing at length.

                 It builds no number of its own: compactBadgeHtml() in
                 word-action.js runs the same read() the ring and the section run,
                 so the three cannot disagree, and below the tested floor that read
                 has no figure and the chip does not render.

                 Mounted rather than interpolated, for the reason the two strips
                 were: on a member profile the letterhead is built while the
                 roll-call record is still in flight, so the first read has no
                 percentage and the chip has to have somewhere to arrive. The host
                 is worth zero pixels until it holds something. -->
            ${(window.PDXWordAction && typeof window.PDXWordAction.compactBadgeMount === 'function') ? window.PDXWordAction.compactBadgeMount(id, p) : ''}
            ${(scoreNum === null && !_isThinProfile) ? '<span class="profile-status-monitoring">' + (
              // 'counts' is a record with a real, closed pledge ledger that simply
              // is not itemized. It must NOT wear "No voting record yet" — that chip
              // was written for a profile with nothing on file, and on a member with
              // 27 kept and 8 broken it is plainly false. Say what is actually known.
              promiseState === 'counts' ? '🤝 ' + countsNote
              : promiseState === 'tracking' ? '⏳ ' + trackingNote
              : '◷ No voting record yet') + '</span>' : ''}
            ${p.party ? `<span class="profile-party">${p.party}</span>` : ''}
          </div>
        </div>
        <!-- The primary read, mounted inside the letterhead. On wide screens it is
             the right-hand column beside the identity block; on a phone the hero
             grid drops it to a full-width third row directly under the name, office
             and party, where it is the first judgement a visitor sees (see
             .profile-hero @480px in app.css and the .pdxwa-hero phone grid in
             word-action.css). The caption below is phone-only: sideways, the ring's
             own inner caption is too small to carry the name of the score. -->
        <div class="profile-hero-score">
          <div class="profile-hero-score-lbl">⚖️ Word vs Action — the one score</div>
          ${scoreRing}
        </div>
      </div>

      <!-- WHAT USED TO BE HERE. Two full-width strips hung off the letterhead: the
           four-count ⚖️ Word vs Action tally ("the shape behind it — contradicted,
           mixed, backed up, thin"), and under it the record-depth and term-span
           lines. Both were summaries of the section they sat above, printed before
           a reader had been given the thing they summarise, and together they put
           three renderings of one score between the top of a profile and the first
           thing a reader comes here to browse — 🌳 All Issues by Topic.

           The figure is not lost: it is in the ring, and now also in the chip in
           the identity block above, which says the percentage and the verdict in
           one line and scrolls to ⚖️ Word vs Action on a tap. The shape, the depth
           and the span are all still printed, in full, inside that section — which
           is unchanged and in its original place in the spine.

           headerTallyMount/headerStackMount and their builders remain exported from
           word-action.js, and their skins remain in word-action.css and in the phone
           block in app.css; nothing on the profile calls them. -->

      <!-- Quick-jump navigation — a sticky, glanceable map of the profile.
           Each pill summarizes a section (score, record, positions, evidence,
           your match, activity) and smooth-scrolls to it; the pill for the
           section in view is highlighted as you scroll. Full render + behavior
           live in .pdx-pnav CSS and window._pdxNavJump / _pdxInitProfileNav. -->
      ${_navBar}

      <!-- Candidacy status banner — the clearest, top-of-profile read on whether
           this person is still running for 2026 or is out of the race (lost
           primary / withdrew). Driven only by the structured candidacyStatus
           flag, so it's never inferred from prose. -->
      ${(typeof window._pdxStatusBanner === 'function') ? window._pdxStatusBanner(p, { emphasis: 'high', showActive: true }) : ''}

      <!-- The evidence banner USED TO BE HERE, directly under the letterhead. It
           was the loudest thing on the first screen of a phone: a gold eye and a
           headline tally ("142 pieces of evidence on record") sitting above the
           verdict, which made the profile open on the size of the archive rather
           than on what the archive shows. Volume of material is not a finding.
           It now renders at the end of the receipts stage, after the Say-vs-Do
           feed, where it reads as the raw file behind the citations a reader has
           just been through. The banner itself is
           unchanged apart from that framing; the per-stance, per-issue and
           per-spotlight evidence links, which are the paths that actually carry
           evidence in support of a claim, are untouched and still fire first. -->

      <!-- Election Status Banner -->
      ${(function(){
        if (!p.nextElection) return '';
        const now = new Date();
        const elDate = new Date(p.nextElection + 'T00:00:00');
        const diffMs = elDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return '';
        const label = p.electionLabel || 'Next election';
        let timeStr, urgencyColor, urgencyBg, urgencyBorder, urgencyGlow, urgencyIcon;
        if (diffDays <= 90) {
          urgencyColor = '#f87171'; urgencyBg = 'rgba(248,113,113,0.1)'; urgencyBorder = 'rgba(248,113,113,0.35)'; urgencyGlow = 'rgba(248,113,113,0.15)'; urgencyIcon = '🔴';
        } else if (diffDays <= 365) {
          urgencyColor = '#f5c842'; urgencyBg = 'rgba(245,200,66,0.08)'; urgencyBorder = 'rgba(245,200,66,0.3)'; urgencyGlow = 'rgba(245,200,66,0.1)'; urgencyIcon = '🟡';
        } else {
          urgencyColor = '#4ade80'; urgencyBg = 'rgba(74,222,128,0.08)'; urgencyBorder = 'rgba(74,222,128,0.25)'; urgencyGlow = 'rgba(74,222,128,0.08)'; urgencyIcon = '🟢';
        }
        if (diffDays === 0) { timeStr = 'Today'; }
        else if (diffDays === 1) { timeStr = 'Tomorrow'; }
        else if (diffDays < 365) { timeStr = diffDays + ' days'; }
        else { const yrs = (diffDays / 365.25); timeStr = yrs < 1.9 ? Math.round(diffDays / 30.44) + ' months' : yrs.toFixed(1) + ' years'; }
        const dateFormatted = elDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return '<div style="display:flex;align-items:center;gap:0.6rem;background:' + urgencyBg + ';border:1px solid ' + urgencyBorder + ';border-radius:0.75rem;padding:0.55rem 0.85rem;margin-bottom:1.25rem;box-shadow:0 0 12px ' + urgencyGlow + ';">' +
          '<div style="font-size:1rem;line-height:1;">' + urgencyIcon + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.75rem;letter-spacing:0.06em;color:' + urgencyColor + ';line-height:1.2;">' + label + ' in <span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.04em;">' + timeStr + '</span></div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;margin-top:0.1rem;">' + dateFormatted + '</div>' +
          '</div>' +
          '<div style="flex-shrink:0;font-family:\'Bebas Neue\',sans-serif;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;background:' + urgencyBg + ';border:1px solid ' + urgencyBorder + ';color:' + urgencyColor + ';padding:0.2rem 0.5rem;border-radius:999px;">' + (diffDays <= 90 ? 'IMMINENT' : diffDays <= 365 ? 'APPROACHING' : 'DISTANT') + '</div>' +
        '</div>';
      })()}

      <!-- THE LIMITED-RECORD CARD NO LONGER MOUNTS HERE. It stood at this spot,
           above the verdict, as "Candidate Snapshot" — and on a thin member that
           made the first thing a reader met a summary, a distribution strip and a
           per-issue list that ⚖️ Word vs Action was about to render again, one
           section down, in the shared four-bucket vocabulary. An executive
           profile has never had anything at this position, which is most of why
           the two lanes did not read as the same product.

           It now mounts UNDER the section, still in the verdict stage — see
           below. Nothing about when it renders changed: it is still gated on
           _isThinProfile and still falls back to the plain thin notice. -->

      <!-- 🧭 THE TWO JOBS — the frame, mounted in the identity zone, above every
           surface that makes a claim.

           A profile publishes two different things and readers were collapsing
           them into one. The formal record below is an inventory with a
           direction — every issue where votes or formal actions are on file, and
           which way those acts pointed. ⚖️ Word vs Action is a test, and a test
           needs a stated position on file before it can run at all, so it speaks
           about a fraction of the issues the record covers. Read as one thing,
           the percentage in the letterhead becomes "the score for this person"
           and every issue the test could not reach reads as something withheld.

           It is a PDXLearn note: dismissible, remembered per visitor through
           PDXStore, and gone for good on the next visit once the × is tapped —
           so it never becomes permanent chrome for a returning reader. It scores
           nothing and characterises nobody; the two counts it prints are read
           back off the accessors the two surfaces publish. Built by
           profile-spine.js — see twoJobsMount(). -->
      ${(window.PDXProfileSpine && typeof window.PDXProfileSpine.twoJobsMount === 'function')
        ? (function(){ try { return window.PDXProfileSpine.twoJobsMount(id, p); } catch(e){ return ''; } })()
        : ''}

      <!--PDXSP:standout-->
      <!-- 🏛 WHAT THE RECORD POINTS TO — the standout strip, and the first
           substantive surface on the profile.

           WHY IT IS HERE AND NOT UNDER THE SCORE. Everything below this used to
           open with ⚖️ Word vs Action, which needs a documented position of theirs
           on file before it can say anything at all. On the many profiles where the
           roll-call ledger is deep and the stance ledger is thin, the first thing a
           reader met was "Not scored yet" — a fact about OUR coverage, printed
           above a formal record that runs to dozens of issues. The record was
           always there. It was three sections down.

           So the record leads — as a SUMMARY. Inventory counts, then up to two
           issues where the formal acts on file ran one way and up to two where they
           ran both ways, each chip a door into that issue's dossier. Then 🌳 All
           Issues by Topic, which is how a reader explores the rest of it, and then
           Word vs Action with its ring and its percentage.

           IT IS NOT THE LIST ANY MORE. The full issue-by-issue formal atlas used to
           mount directly under this strip, open, and on a member with a deep ledger
           that was fifty-odd rows standing between the summary and every other
           surface on the page — an inventory of exactly the issues the tree below
           was about to index a second time. The atlas moved down into the explore
           stage, under the tree, behind one closed control. This block is counts and
           a handful of chips, and it stays that way: the cap is in the engine
           (_SO_CAP) and growing it back into a roster is what this pass undid.

           IT ADDS NO ARITHMETIC. PDXConsistency.recordStandout selects from the
           same _fpiRows() the flat list renders, using the pattern engine's own
           depth floor, and prints the tier and counts those rows already carry.
           No percentage, no ranking against anybody else, no party framing, and
           no path from any of it into Direction Match.

           FAIL CLOSED. A profile with no issue deep enough to characterise gets no
           strip — not a placeholder and not a filler issue.

           ONE STANDOUT BLOCK PER PROFILE, NEVER TWO. A profile deep enough for the
           shape hero (12+ issues on the formal record, 4+ of them readable) already
           opens with that block, in the hero itself, listing the same rows from the
           same engine at its own caps of 4 and 3 — so the strip stands down there
           rather than printing a second, shorter copy of a list already on screen.
           The two surfaces are one finding at two depths, and which one a reader
           gets is decided by how much record there is, not by how much word.
           PDXWordAction.shapeApplies() is that question, asked rather than
           re-derived, so the two can never both mount. -->
      ${(function () {
        try {
          // ONE RECORD BLOCK IN THIS SLOT, AND THE LANE DECIDES WHICH. The strip
          // below is built out of roll-call patterns, and consistency.js's
          // _stDirRaw() returns null for the exec lane by design — so on a
          // president it selected nothing and this slot rendered empty, which is
          // how an executive profile came to open on a missing record summary and
          // a jump-bar pill with nowhere to land. The exec lane gets its own
          // compact summary, in its own vocabulary, in the same place. Checked
          // first and returned from, so the two can never both emit
          // #pdxsec-standout.
          var XS = window.PDXConsistency && window.PDXConsistency.execRecordSummary;
          if (XS && typeof XS.html === 'function') {
            var xh = XS.html(id) || '';
            if (xh) return '<div class="modal-section pdxso-face">' + xh + '</div>';
          }
          var SO = window.PDXConsistency && window.PDXConsistency.recordStandout;
          if (!SO || typeof SO.html !== 'function') return '';
          var WA = window.PDXWordAction;
          if (WA && typeof WA.shapeApplies === 'function' && WA.shapeApplies(id)) return '';
          var html = SO.html(id) || '';
          return html ? '<div class="modal-section pdxso-face">' + html + '</div>' : '';
        } catch (e) { return ''; }
      })()}

      <!--PDXSP:verdict-->
      <!-- ⚖️ WORD VS ACTION — the primary accountability read, and the whole of the
           verdict stage. One question ("do they stand by what they said?") over
           one pool of documented word in three weighted tiers: explicit pledges,
           stated positions, and the issues they campaign on. Tested only against the
           Official Record. See word-action.js for the model, its five rules and the
           fail-closed floors.

           It used to open the record stage, which made the site's primary finding
           read as the header of one system among several. It now has a stage of its
           own, directly under the brief, and it is the only score there. The
           supporting lanes did not move relative to each other: the Promise
           Receipts block is still the pledge tier's evidence, and the
           Official Record and Say-vs-Do sections are still the two scoped feeds
           underneath. Renders '' when no word is on file at all — an empty frame
           would imply the record should be here.

           IT IS THE SAME SECTION ON BOTH LANES. Nothing in it is office-aware
           except the vocabulary of the formal lane itself (🏛️ roll-call votes for
           a member, ✒️ formal actions for an executive) and the term-scope strip,
           which is exec-only because a member's roll-call record is not
           term-scoped anywhere in this engine. The Direction Match framing, the
           shape strip, the one-bucket-at-a-time issue index (closed by default —
           🌳 All Issues by Topic is the browse-all surface), the formal + public
           lanes on each row and the dossier entry from those rows are one
           renderer for both. -->
      ${(window.PDXWordAction && typeof window.PDXWordAction.sectionHtml === 'function') ? window.PDXWordAction.sectionHtml(id, p) : ''}

      <!-- THE LIMITED-RECORD CARD USED TO MOUNT HERE, between ⚖️ Word vs Action
           and the tree. It is gated on _isThinProfile, which means it fires only
           on the profiles where 🌳 All Issues by Topic is the entire substance of
           the page — so at this position it spent several screens explaining a
           gap in front of the one surface that had something to show. It now
           mounts at the FOOT of the verdict stage, under the tree and under the
           multi-issue block. Nothing about when it renders changed: same gate,
           same fallback. -->

      <!--PDXSP:explore-->
      <!-- 🌳 ALL ISSUES BY TOPIC — the browse-all-stances surface, and the reason
           Stance at a Glance below is unmounted. The glance was a FLAT WALL: every
           documented position in one alphabetised column, no grouping, no colour,
           and no record beside any of it, so a reader who wanted "where do they
           stand on energy" met thirty rows and did the filing themselves.
           This is the same population arranged as a tree — broad core national
           issue → optional mid → the issue we actually track — with what they SAID
           and what their formal RECORD did in adjacent slots on one line, and an
           alignment cue only where both slots are filled.

           IT IS THE PRIMARY EXPLORE GATEWAY, AND IT SITS ABOVE THE SCORE. It used
           to mount directly UNDER ⚖️ Word vs Action, as the surface a reader browsed
           to check that section's finding. That was the wrong way round on most
           profiles: Direction Match can only speak where a stated position is on
           file, so on a member with a deep ledger and a thin stance shelf the
           browse-everything surface was the third thing they met, behind a score
           and behind a fifty-row flat list of the same issues. The order is now
           summary → tree → score. This is the one place a reader expands a topic and
           opens an issue, and every other door on the profile — a standout chip, a
           shape row, a "see all" control — lands here or in the dossier it opens,
           never in a second index.

           It publishes no percentage of its own, and a broad node publishes no
           verdict — a topic is not something a person can be scored on. See the five
           walls at the top of stance-tree.js. Renders '' when neither a stated
           position nor a readable formal pattern exists anywhere on the profile. -->
      ${(window.PDXStanceTree && typeof window.PDXStanceTree.sectionHtml === 'function')
        ? (function(){ try { return window.PDXStanceTree.sectionHtml(id); } catch(e){ return ''; } })()
        : ''}

      <!-- 🧩 TWO AXES — one declared pair, read side by side.
           IT SITS DIRECTLY UNDER THE TREE ON PURPOSE, and it travelled with the tree
           into the explore stage rather than being left behind under the score. The tree is where a reader
           browses issue by issue; this is where the two halves of one pair are
           held against each other. STATUS FIRST: this person's reading on the
           pair (same direction / split / mixed on one side / one side on record /
           not enough yet), then two compact columns whose only control is the door
           into the issue's existing dossier — the same PDXConsistency.openGap
           sheet a tree leaf opens — then one footer line pointing at that
           dossier's list of every issue a measure counted for. The splitting rule
           itself is taught where a reader meets it (multi-issue row notes, the
           dossier, the glossary), not as an essay at the top of this card.
           No stance prose, no second report surface, no percentage
           except the per-issue one Direction Match already resolved.
           Rendered by ballot-axes.js. Visible only where BOTH halves of a pair are
           on this profile's browse set; the host stays hidden and empty otherwise
           so the post-paint record lane can fill it. -->
      ${(window.PDXBallotAxes && typeof window.PDXBallotAxes.profileHtml === 'function')
        ? (function(){ try { return window.PDXBallotAxes.profileHtml(id, p); } catch(e){ return ''; } })()
        : ''}

      <!-- 🏛 THE FLAT FORMAL LIST — every issue on the formal record, one row each,
           BEHIND ONE CLOSED CONTROL AND BELOW THE TREE.

           WHAT IT IS. PDXConsistency.formalPatternIndex: one row per issue this
           person's formal record actually touched, each carrying the same 🏛 Record
           pattern chip the row faces carry, the same counts, and the same door into
           the same issue dossier. Nothing here is new information and nothing here
           is new arithmetic — it is the shared row model, filtered to the formal
           lane, sorted by how much the record said.

           WHY IT IS COLLAPSED, AND WHY IT IS HERE. It shipped open, directly under
           the standout strip, ahead of everything else on the page. That was right
           when it was the only complete index of the formal record and the tree
           still waited on stated positions. It is not right now: 🌳 All Issues by
           Topic above carries a RECORD pattern chip on every leaf and opens the same
           dossier, so the flat list had become a SECOND full inventory of the same
           issues, printed first — fifty-odd rows a phone reader scrolled past before
           reaching the surface built to be scrolled. Two complete catalogues of one
           person's record is not twice the depth; it is one catalogue and one wall.

           So the tree is the index and this is its alternate view: same stage,
           directly beneath it, closed on arrival, one line of chrome that says how
           many rows are inside. Nothing was deleted and nothing moved behind a
           different product — #pdxsec-formalatlas still resolves, every deep link
           into it still lands, the overlay still holds the expanded copy, and
           _pdxNavJump opens the control before it scrolls.

           IT DOES NOT COMPETE WITH THE SCORE. No percentage — the engine publishes
           tiers and counts and refuses to return a ratio (see _recordDirectionIndex
           in stance-helpers.js), so there is no second formal number on this page and
           scripts/test-no-second-score.mjs still holds. A pattern read here is never
           a stated position and never enters Direction Match; the list prints that
           wall at its own foot. -->
      ${(function () {
        try {
          var FPI = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
          if (!FPI || typeof FPI.html !== 'function') return '';
          // A SIMPLE DEPTH GATE, AND IT COUNTS ISSUES RATHER THAN ITEMS. The point
          // of this surface is breadth — that the formal record reaches further
          // than the written-up positions do — and a member with a handful of
          // issues on file has no breadth to show that the tree above is not
          // already showing.
          var FACE_MIN = 8;
          var n = (typeof FPI.count === 'function') ? (FPI.count(id) || 0) : 0;
          if (n < FACE_MIN) return '';
          // `mount` names this instance. The overlay renders the same index for the
          // same person, and both can be in the DOM at once — the key is what keeps
          // their row ids distinct and stops a filter tap in one from re-filtering
          // the other. Strongest-first here always: the face has no Sort control of
          // its own, and the overlay owns that state.
          var html = FPI.html(id, { sort: 'strength', mount: 'face', rollup: false }) || '';
          if (!html) return '';
          // 🚂 THE PROFILE ROLL-UP RIDES ABOVE THE FOLD, NOT INSIDE IT. The index
          // below is closed by default, and a note about how much of this record
          // travelled inside larger packages is worth exactly nothing to a reader
          // who never opens it. So it is lifted out here and the index is told not
          // to print its own copy (`rollup: false`), which keeps one sentence in
          // one place in this block.
          //   IT IS ALLOWED TO BE ABSENT AND USUALLY IS. vehicleRollupHtml()
          // returns '' unless the file is deep enough to divide into and more than
          // one issue is actually marked — see the three silences over
          // vehicleRollup(). Nothing here forces a line where there is none.
          var vru = '';
          try {
            var V = window.PDXConsistency && window.PDXConsistency.vehicle;
            if (V && typeof V.rollupHtml === 'function') vru = V.rollupHtml(id) || '';
          } catch (e) { vru = ''; }
          // THE SUMMARY LINE IS THE WHOLE COST OF THIS BLOCK WHEN CLOSED. It states
          // what is inside and how much of it there is, in the same breath, so a
          // reader deciding whether to open it never has to open it to find out.
          // <details> because it is a native, keyboard-operable disclosure that a
          // screen reader announces as one — no JS, no state, nothing to re-arm.
          return (vru ? '<div class="modal-block pdxvru-solo">' + vru + '</div>' : '') +
            '<details id="pdxsec-formalatlas" class="modal-section pdxfpi-flat">' +
              '<summary class="pdxfpi-flat-s">' +
                '<span class="pdxfpi-flat-t"><span aria-hidden="true">🏛</span> View the flat formal list</span>' +
                '<span class="pdxfpi-flat-n">Every issue on the formal record · ' + n + '</span>' +
              '</summary>' +
              '<div class="pdxfpi-flat-b pdxfpi-face">' + html + '</div>' +
            '</details>';
        } catch (e) { return ''; }
      })()}

      <!--PDXSP:verdict-->
      <!-- 🌱 WHY THIS RECORD IS THIN — the last thing in the verdict stage, and
           only when there is a gap to explain. It answers the one question the
           three surfaces above it cannot derive: WHY the record is thin (a
           challenger who has never held the seat, an official early in a first
           term, a candidate who left the ballot), what the alignment match rests
           on when there is no voting record behind it, and an honest list of what
           is being gathered.

           IT SITS LAST ON PURPOSE. ⚖️ Word vs Action has already said, in its own
           thin copy, that there is documented word on file and no formal action to
           test it against — and that a gap in the record is not a mark against the
           person. Every leaf of the tree above already reads as pending, or as
           nothing at all, in its record slot. A reader arriving here has therefore met the state
           twice before meeting the reason for it, which is the right order: the
           browse gateway first, the explanation of its emptiness after.

           It carries no score, no shape, no per-issue list and no navigation index
           of its own — those come from the sections above, identically on both
           lanes. Falls back to the plain thin notice if the card can't render. -->
      ${candidateSnapshot || thinNotice}

      <!-- CONNECTING THE DOTS IS UNMOUNTED. It rendered a full-width card here —
           the eyebrow "Connecting the Dots", the title "Where <name>'s word met
           their record", a four-line summary paragraph ("Every row below follows
           one issue through the same five links — what <name> said, what they
           formally did, the receipts that document it, where it lands in the
           issues and Spotlights, and what it means for their ⚖️ Word vs Action
           score…"), up to three joined issue rows, a legend, a "Follow the same
           five links through the profile" nav chain of five buttons, and an
           "Also on this profile" chip row. ~13,000 characters of markup on
           Trump, directly under the score.

           Every part of it now exists somewhere better. The joined rows are the
           same PDXDossier chain that ⚖️ Word vs Action prints as its "Where this
           number comes from — sharpest first" rows, one section up. The five-link
           chain is a second navigation strip under the jump rail that already
           sits at the top of the modal. The chip row is a third. A synthesis that
           restates the thing above it and re-navigates the page below it is not a
           synthesis; it is the profile explaining itself twice.

           window._pdxConnectDots is left defined and untouched in
           profile-connect.js — nothing on the profile calls it. -->

      <!--PDXSP:record-->
      <!-- PROMISE RECEIPTS NO LONGER MOUNTS HERE. The block that stood at this
           spot — "🤝 Promise Receipts · evidence for the pledge tier of Word vs
           Action", its count sentence, its three filter chips, its "How does this
           lane work?" disclosure and its "⚖️ See the one score this feeds →"
           button — was a whole section, high on the page, arguing about pledges
           immediately under the section that already weighs pledges. Two lanes,
           one subject, stacked. Even reworded as evidence it read as a peer
           product, because position on a page is an argument of its own.
           Pledges still feed ⚖️ Word vs Action as its top tier, and the ledger
           itself still exists in full — it moved down into the collapsed
           "Every tracked promise" drawer with the rest of the raw tables, where
           #pdxsec-score now lives. Nothing was deleted; it stopped being a
           section. -->

      <!-- The inline Accountability Score card stood here (#acct-inline-card, rendered by
           window._renderAccountabilityCard). The composite 0–100 model is retired
           outright — engine, curated overrides, rating bands, badges and overlay — so
           there is no renderer left to call and no empty container to keep a target for.
           The evidence it drew on is unaffected: it is the integrity-highlights list in
           the Spotlight section below, which shows sourced items rather than a grade. -->

      <!-- SCORING CLEANUP: the "🤝 Promise Follow-Through · In-office record" bar that
           used to sit here rendered the same window._pdxDisplayScore() percentage as the
           hero ring and the pledge block — one number printed three times, reading as
           three separate findings. It was removed then; the percentage itself has since
           been retired outright, so there is nothing left for it to have shown. -->

      <!--PDXSP:identity-->
      <!-- Biography & signature quote — who they are, read early so the
           profile opens like an honest dossier: identity → record → person.

           IT OPENS CLAMPED. A bio runs six to twelve lines, and on a phone that
           is most of the first screen spent on prose the reader did not come for
           — the record is what is below it. It now shows three lines and a
           "Read the full biography" control, and the full text is one tap away.

           The clamp is a <details> whose entire content lives in the <summary>,
           which is the one arrangement that gets a native, keyboard-operable
           disclosure without printing the bio twice: <summary> renders in both
           states, so the same single copy of the text is clamped when closed and
           released when open (see .pdxbio in app.css). Nothing is hidden from a
           reader who does not open it in the sense that matters — the text is in
           the DOM, selectable, findable and read in full by a screen reader. -->
      ${(p.bio || p.quote) ? `<div class="modal-section">
        <div class="modal-section-title">📋 Biography</div>
        ${p.bio ? `<details class="pdxbio"${p.quote ? ' data-pdxbio-q="1"' : ''}>
          <summary class="pdxbio-s">
            <span class="pdxbio-t">${p.bio}</span>
            <span class="pdxbio-cue" aria-hidden="true"><span class="pdxbio-cue-a">Read the full biography</span><span class="pdxbio-cue-b">Show less</span></span>
          </summary>
        </details>` : ''}
        ${p.quote ? `<blockquote class="profile-quote"><p>${p.quote}</p>${p.quoteSource ? `<cite class="profile-quote-cite">${p.quoteSource}</cite>` : ''}</blockquote>` : ''}
      </div>` : ''}

      <!--PDXSP:signature-->
      <!-- Key Issues — a quick, at-a-glance read of what this official is most
           defined by, placed right after the biography so it frames the detailed
           record below. Only rendered when there are issues, so a profile without
           tagged issues never shows an empty section. -->
      <span id="pdxsec-positions" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${_keyIssues.length ? `<div class="modal-section">
        <div class="modal-section-title">🎯 Key Issues</div>
        <p class="modal-section-sub">The issues this official is most defined by — the lens for the record below.</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">${issuePills}</div>
      </div>` : ''}

      <!--PDXSP:tension-->
      <!-- 🔥 Flashpoints — the HIGH-HEAT section, and only that: the biggest
           contradictions, red flags and public disputes already on this official's
           record, capped at 3 cards. It is not a second scoring system and it is not
           the home for all the evidence — each card is sourced and links out to the
           surfaces that do carry a verdict or the proof: the ⚖️ Word vs Action row,
           the 🏛️ Official Record, the Evidence drawer, and the related Issue
           Spotlight. Rendered by controversies.js entirely from data the app already
           ships; self-gates to '' when nothing checkable is on record. -->
      ${(typeof window._renderControversies === 'function') ? window._renderControversies(id, p) : ''}

      <!--PDXSP:money-->
      <!-- Money & Funding — who bankrolls this official, surfaced right in the
           core profile (not only inside the Compare tool). Same window._pdxFunding
           lookup and 🌱/⚖️/🏦 language as Compare, with a calm "Not on file"
           state and one-tap paths to the filings and into a side-by-side. -->
      ${(typeof window._pdxFundingSection === 'function') ? window._pdxFundingSection(id, p) : ''}

      <!--PDXSP:you-->
      <!-- Personalized Alignment Score — a first-class "Your Match" read on every
           profile. When the visitor has set up alignment it shows their match vs.
           THIS politician (values, not party); when they haven't, a compact CTA
           invites them to set it up so the feature is discoverable on every profile. -->
      <span id="pdxsec-match" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(() => {
        const hasIssues = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
        const firstName = ((p && p.name) ? String(p.name).split(' ')[0] : 'them');
        if (hasIssues && typeof _calcAlignmentScore === 'function') {
          const alignScore = _calcAlignmentScore(id);
          if (alignScore === null) return '';
          const aCol = alignScore >= 70 ? '#4ade80' : alignScore >= 50 ? '#f5c842' : '#f87171';
          const verdict = alignScore >= 70 ? 'Strong match' : alignScore >= 50 ? 'Partial match' : 'Weak match';
          return `<div id="modal-personalized-alignment" class="modal-block" role="button" tabindex="0" onclick="if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView('${id}');" style="cursor:pointer;margin-bottom:1.25rem;background:linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(10,15,30,0.4) 100%);border:1px solid rgba(139,92,246,0.42);border-radius:0.85rem;padding:0.85rem 1rem;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px rgba(139,92,246,0.1);">
            <div style="display:flex;align-items:center;gap:0.85rem;">
              <div style="flex-shrink:0;text-align:center;min-width:62px;">
                <div style="font-family:'Bebas Neue',sans-serif;font-weight:900;line-height:1;font-size:2.4rem;color:${aCol};text-shadow:0 0 14px ${aCol}55;">${alignScore}<span style="font-size:1.1rem;">%</span></div>
                <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:#a78bfa;margin-top:0.1rem;">🎯 ${typeof window.pdxMatchLabel === 'function' ? window.pdxMatchLabel() : 'Your Match'}</div>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;gap:0.5rem;font-family:'Barlow Condensed',sans-serif;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.35rem;">
                  <span>Your values vs. ${firstName}</span><span style="color:${aCol};font-weight:700;">${verdict}</span>
                </div>
                <div style="height:7px;background:rgba(10,15,30,0.8);border-radius:999px;overflow:hidden;margin-bottom:0.45rem;">
                  <div style="height:100%;width:${alignScore}%;background:linear-gradient(90deg, ${aCol}88, ${aCol});border-radius:999px;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);"></div>
                </div>
                <p style="font-size:0.68rem;color:#9fb4d4;line-height:1.4;margin:0;">How ${firstName}'s record fits <strong style="color:#c4b5fd;">your</strong> positions — regardless of party. <span style="color:#a78bfa;">Tap for the issue-by-issue breakdown ▾</span></p>
              </div>
            </div>
          </div>`;
        }
        // Not set up yet → invite the visitor to unlock their match on this person.
        return `<div id="modal-personalized-alignment-setup" class="modal-block" style="margin-bottom:1.25rem;display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;background:linear-gradient(135deg, rgba(88,28,135,0.28) 0%, rgba(139,92,246,0.05) 100%);border:1px dashed rgba(139,92,246,0.5);border-radius:0.85rem;padding:0.85rem 1rem;">
            <div style="width:38px;height:38px;border-radius:0.65rem;background:linear-gradient(135deg,#8b5cf6,#6d28d9);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;box-shadow:0 0 14px rgba(139,92,246,0.4);">🎯</div>
            <div style="flex:1;min-width:170px;">
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.03em;color:#d8b4fe;font-size:0.9rem;text-transform:uppercase;">See your match with ${firstName}</div>
              <div style="font-family:'Barlow Condensed',sans-serif;color:#b9a8e6;font-size:0.76rem;line-height:1.4;margin-top:0.1rem;">Set the issues you care about and judge ${firstName} by your values — not their party.</div>
            </div>
            <button type="button" onclick="closeModal();setTimeout(function(){if(window._krAlignGuideToPicker){window._krAlignGuideToPicker();}else{var el=document.getElementById('alignment-panel');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}},320);" style="white-space:nowrap;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:0.76rem;color:#fff;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:1px solid rgba(167,139,250,0.5);border-radius:0.7rem;padding:0.55rem 1rem;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,0.3);">🎯 Set Up Match</button>
          </div>`;
      })()}

      <!--PDXSP:brief-->
      <!-- The brief — the first screen. Answers "what defines them", "where is the
           tension" and "what should I share or inspect next" from the same
           accessors the full sections below use, so it can never claim something
           the record does not support. Rendered by profile-spine.js; self-gates to
           '' when there is neither a documented position nor a contested point. -->
      ${(window.PDXProfileSpine && typeof window.PDXProfileSpine.briefHtml === 'function')
        ? (function(){ try { return window.PDXProfileSpine.briefHtml(id, p); } catch(e){ return ''; } })()
        : ''}

      <!-- Connecting the Dots used to render here, on the first screen. It moved
           up into the record stage, directly beneath the ⚖️ Word vs Action score
           it synthesizes — see the call site there. Nothing replaced it: the brief
           above already answers "what should I look at first", and stacking a
           second synthesis under it was one of the surfaces competing for the same
           job. -->

      <!--PDXSP:signature-->
      <!-- View Full Stance Record — the prominent, impossible-to-miss jump to the
           complete per-issue record (evidence depth + honest "No record yet"
           rows). Sits right under the alignment row and above every summarized
           view so the full truth record is reachable within seconds of landing,
           on every profile. Cached sources only — no new network cost. -->
      ${(typeof window._pdxStanceRecordCta === 'function') ? window._pdxStanceRecordCta(id, p) : ''}

      <!--PDXSP:money-->
      <!-- Top-level "Who It Affects" overview — a compact net read of who the
           measures on this official's record affect, by economic group. Reuses the
           cached member-impacts data (its cohortSummary); self-hydrating placeholder,
           hidden until data lands and hidden entirely when no votes are scored, so it
           adds nothing where there's no data. Links down to the vote-by-vote breakdown. -->
      <span id="pdxsec-impact" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(typeof window._pdxMemberImpactsOverview === 'function') ? window._pdxMemberImpactsOverview(id) : ''}

      <!-- Follow the Money — the campaign-finance Constituents-First lens. (The
           four-tile People's Mandate scorecard this renderer used to emit is
           retired: it re-presented the promise rate and the retired Accountability
           composite as if they were separate findings.) -->
      ${(typeof window._renderMandateAlignment === 'function') ? window._renderMandateAlignment(id, p) : ''}

      <!-- Follow the Money — Side by Side. Pairs the Constituents-First finance
           signal (who funds them) with a distributional summary of who their key
           votes affect. Renders only when a finance signal exists; the distributional
           column fills async and the whole section hides itself when the official has
           no ledger-scored votes, so it never adds empty noise. -->
      ${(function(){
        try {
          var _sig = (typeof window._pdxFinanceSignal === 'function') ? window._pdxFinanceSignal(id) : null;
          if (_sig && typeof window._pdxMemberImpactsSideBySide === 'function') {
            return window._pdxMemberImpactsSideBySide(id, _sig);
          }
        } catch (e) {}
        return '';
      })()}

      <!--PDXSP:you-->
      <!-- Related Proposals — community reforms from The People's Mandate that are
           linked to THIS politician. The container is filled asynchronously after
           render from /api/mandate-proposals?politician=<id>; it stays empty (and
           invisible) when nothing is linked, so it never adds noise to a profile. -->
      <div id="pdx-related-proposals" data-pid="${id}"></div>
      ${(function(){ if (typeof window._pdxLoadRelatedProposals === 'function') { setTimeout(function(){ try { window._pdxLoadRelatedProposals(id); } catch(e){} }, 0); } return ''; })()}

      <!-- How You Compare: per-issue linkage to the visitor's Alignment Tool picks -->
      ${(typeof window._renderIssueComparison === 'function') ? window._renderIssueComparison(id, p) : ''}

      <!--PDXSP:signature-->
      <!-- 🧭 STANCES & CONNECTIONS IS UNMOUNTED. ONE BROWSE PATH.
           It listed the same person×issue set 🌳 All Issues by Topic lists — said,
           record result, often a percentage, and a door into the same dossier —
           ranked sharpest-first instead of grouped by topic. On a full profile that
           was well over a hundred thousand characters of second issue browser
           sitting below the gateway, re-teaching rows the reader had just met in a
           different sort; on a thin profile it restated a tree that already carries
           untested positions. The overlap matrix marked the tree primary, so this
           is the peer section that had no job.
           WHERE ITS PARTS WENT. The global tension ranking is now a VIEW OF THE
           TREE — the Order control (Topic | Tension) in stance-tree.js reorders the
           same leaves with the same comparator, no second section. "⚖️ Where this
           lands in the score" was already level 1 of the issue dossier. "🔍 Everyone
           on this issue" is now a step in the dossier's "Where to next" row, which
           is the only place it lived outside these rows. Everything else on a row —
           the stance text, the composition split, the public-lane tally, the lane
           disagreement, the evidence depth — is in the dossier at full length rather
           than truncated to 190 characters.
           The renderer is left defined and exported, the same way Stance at a Glance
           and Connecting the Dots were; only the mount is gone, and the
           #pdxsec-stances nav anchor now rides on the tree so every existing jump
           still lands on the surface that holds these positions. -->

      <!-- STANCE AT A GLANCE IS UNMOUNTED. It was a collapsible flat index of
           documented positions with a per-issue evidence dot — one alphabetised
           column, no topic grouping, no issue colour, and nothing about the formal
           record next to any row. 🌳 All Issues by Topic (stance-tree.js, mounted
           in the verdict stage above) is that same browse-all surface arranged as
           a tree, in the core issue colours, with the record pattern beside each
           stated position. Two flat-versus-grouped indexes of the same positions
           in one scroll is the wall this pass exists to remove.
           The renderer itself is left defined and exported for the archive, the
           same way Connecting the Dots was; only the mount is gone, and the
           #pdxsec-glance nav anchor now rides on the tree so every existing jump
           into "their stated positions" still lands on the surface holding them. -->

      <!--PDXSP:dw:positions-->
      <!-- Key Issue Stances — every documented position with its own evidence. The
           complete set, preserved in full but moved behind the "Every documented
           position" drawer: Stance at a Glance above is the scannable index into
           exactly this material, and printing both at full depth in sequence is
           what made the profile read as repetitive. -->
      ${(typeof window._renderIssueStances === 'function') ? window._renderIssueStances(id, p) : ''}

      <!--PDXSP:receipts-->
      <!-- Connected Evidence — stance + promises + recorded words/actions per
           issue (current sitting Utah State Legislators; '' for everyone else) -->
      <span id="pdxsec-evidence" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(typeof window._renderEvidenceSummary === 'function') ? window._renderEvidenceSummary(id, p) : ''}
      ${(typeof window._renderEvidenceConnections === 'function') ? window._renderEvidenceConnections(id, p) : ''}

      <!--PDXSP:record-->
      <!-- ONE record lane. Two things used to sit here and both have been folded in.
           (1) The "📋 Promise Tracker" gateway: a titled two-card product whose cards
               were doorways to the 🏛️ Official Record and 🧾 Say-vs-Do sections that
               follow it on this same page. A named product, its own chrome, and a
               second promise-shaped framing on a profile whose one score is ⚖️ Word
               vs Action. Pledge outcomes are an INPUT to that score now — they feed it
               through word-action.js and appear as Promise Receipts evidence — so the
               gateway had nothing left to be except a rival heading. Its click
               handlers live in consistency.js's delegated bindGateway(), which
               officialRecordSectionHtml() still calls, so every deep link out of a
               row still works.
           (2) The standalone "✒️ Executive Enactment Record". It is now rendered
               INSIDE the Official Record section below, under the issue rows it is
               the evidence for — one lane, office-aware, keeping the #pdxsec-exec-record
               anchor so existing links land. See PDXExecRecordUI.embedHtml. -->

      <!-- Official Record — the one office-aware formal-record lane. Congress: the
           roll-call record, grouped by issue. President / executive: signed laws,
           vetoes, orders and directives, with the document ledger underneath. Issue
           rows are ranked by PDXConsistency.rankIssueRows, so the section opens on the
           best-evidenced real tension rather than on a coverage gap.
           Rendered by consistency.js from officialRecord() only (no Say-vs-Do
           content); the raw Voting Record list below stays available to offices that
           have one. -->
      <span id="pdxsec-official-record" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(window.PDXConsistency && typeof window.PDXConsistency.officialRecordSectionHtml === 'function') ? ('<div class="modal-block" style="margin-bottom:1.25rem;">' + window.PDXConsistency.officialRecordSectionHtml(id) + '</div>') : ''}

      <!--PDXSP:tension-->
      <!-- RECORD VS. PUBLIC PICTURE NO LONGER MOUNTS HERE, AND SAY-VS-DO NO LONGER
           MOUNTS BELOW IT. The two sections that used to sit at this point were:

           "⚖️ Record vs. Public Picture — Do their 🏛️ Official Record (votes) and
            their 🧾 Say-vs-Do (public record) tell the same story? … Across 7 issues
            on both records: 3 aligned · 2 mixed · 2 diverging."

           "🧾 Say-vs-Do — “Does the full public picture match what they claim?”
            Receipts, not a rating: each stance below shows what the public record —
            statements, coverage, filings, events — does and does not back up, with a
            per-stance percentage where there are 2+ checkable items."

           Say-vs-Do graded the same issues the Official Record had already graded, in
           its own vocabulary, with its own coverage line and its own per-stance
           percentages. Record vs. Public Picture existed only to referee the two when
           they disagreed — a whole section whose subject was the seam between two
           other sections. That is three per-issue verdict systems in one scroll.

           There is one now. PDXConsistency.issueRow resolves a single verdict per
           issue: the formal action decides wherever a formal action can, and the
           public record decides only where none could — never both, so nothing is
           left to arbitrate. The receipts Say-vs-Do used to print are on the row
           (row.public, row.evidence.total) and in the Evidence drawer, and the
           outcome list it used to headline is now the "Issue by issue — did the record
           back the word?" block inside ⚖️ Word vs Action.

           saydoSectionHtml() and divergenceSectionHtml() are still exported by
           consistency.js — the gap sheet and the share card read their data — but
           nothing mounts them on a profile. #pdxsec-saydo and #pdxsec-divergence are
           deliberately NOT re-declared: every jump to them is guarded by a
           getElementById check or an "||" fallback chain that now lands on the
           Official Record instead. -->

      <!--PDXSP:receipts-->
      <!-- Evidence banner — the gold All-Seeing Eye, a direct "Watch" jump to the
           strongest clip, and a one-tap "See Evidence" into the pre-filtered
           Evidence Locker. Relocated here from the top of the profile: it is the
           archive endpoint of the receipts stage, not its headline. Every surface
           above this point that rests on a piece of evidence links to that piece
           directly — a stance row names the clip, an issue row names the bill, a
           Spotlight names its source — so by the time a reader reaches a bare
           count of the whole file, the count is an offer to browse rather than a
           claim. The archive:true option swaps the two lines of framing copy
           accordingly.
           Self-gating: shows only when there's a watchable clip or a lockable
           file. -->
      ${(typeof window._pdxEvidenceBanner === 'function') ? window._pdxEvidenceBanner(id, { archive: true }) : ''}

      <!--PDXSP:dw:votes-->
      <!-- Voting Record — "what they actually did": roll-call votes + official
           actions from /api/voting-record, keyed to ISSUE_MAP and checked against
           their stated stances. Renders hidden and self-reveals only when a record
           exists (see voting-record.js / _pdxInitVotingRecord). -->
      <span id="pdxsec-voting" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(typeof window._renderVotingRecord === 'function') ? window._renderVotingRecord(id, p) : ''}

      <!--PDXSP:money-->
      <!-- Major Contracts in Their State/District — major federal contracts tied
           to this official's state (geographic context, not an implication of
           involvement). Rendered synchronously by gov-contracts.js from the
           client-side Federal Spending Tracker dataset; self-gates to '' when the
           state has no tracked contracts. Cross-links into the tracker and the
           "Government Contracting, Influence & Waste" Spotlight. -->
      <span id="pdxsec-contracts" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(typeof window._renderMajorContracts === 'function') ? window._renderMajorContracts(id, p) : ''}

      <!--PDXSP:you-->
      <!-- Your Stance vs Their Record — relocated to the end of the accountability
           chain so the profile closes on how the record maps to the visitor's own
           positions (the final "dot" the overview points to). Rendered by My Stances
           (neutral, notes-free); empty until there are overlapping positions, so it
           never shows when there is nothing to compare. -->
      <span id="pdxsec-compare" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(window.PDXStances && typeof window.PDXStances.vsRecordHtml === 'function') ? (function(){ try { var _vs = window.PDXStances.vsRecordHtml(id, { max: 8 }); return _vs ? ('<div class="modal-block pdx-vsrecord-block" style="margin-bottom:1.25rem;">' + _vs + '</div>') : ''; } catch(e){ return ''; } })() : ''}

      <!--PDXSP:dw:promises-->
      <!-- Everything from here to the next sentinel is the deep promise record: the
           receipts block that used to be a section near the top, then the four-way
           breakdown with its formula, then the full per-promise tracker table. All
           preserved verbatim and collected behind the "Every tracked promise"
           drawer — promises are an input to ⚖️ Word vs Action, not a lane of their
           own, so the whole pledge apparatus now lives at the depth of a raw table
           rather than at the depth of a finding. #pdxsec-score rides down with it,
           so every existing jump (the Word vs Action feeds list, the count chips)
           lands on the ledger and reveals the drawer on the way. -->
      <span id="pdxsec-score" class="pdx-nav-anchor" aria-hidden="true"></span>
      ${(typeof window._renderFollowThrough === 'function') ? window._renderFollowThrough((keptCount || p.kept || 0), (brokenCount || p.broken || 0), (pendingAct || pendingCount || 0), id, null, pledgeItemized) : ''}

      <!-- Deep Dive: Full Promise Breakdown -->
      ${(function(){
        const pb = p.promiseBreakdown || {};
        const k    = typeof pb.kept       === 'number' ? pb.kept       : (typeof p.kept    === 'number' ? p.kept    : keptCount);
        const comp = typeof pb.compromise === 'number' ? pb.compromise : 0;
        const b    = typeof pb.broken     === 'number' ? pb.broken     : (typeof p.broken  === 'number' ? p.broken  : brokenCount);
        const pend = typeof pb.pending    === 'number' ? pb.pending    : (typeof p.pending === 'number' ? p.pending : pendingCount);
        const total = k + comp + b + pend;
        if (total === 0) return '';
        const resolved = k + comp + b;
        // COUNTS, NOT SHARES. These four tiles used to read "Kept · 62%" /
        // "Broken · 21%" — percentages of the tracked total, which is a different
        // denominator from the retired follow-through rate and read like yet
        // another score. They now say "44 of 71", which is the same fact without
        // a number pretending to be a rating.
        const ofTotal = n => n + ' of ' + total;
        const src  = pb.source || { label: 'PolitiDex Methodology', url: '#methodology' };
        const note = pb.note || '';
        const isAnchor = (src.url || '').charAt(0) === '#';
        const card = (val, label, color) => '<div style="background:' + color + '14;border:1px solid ' + color + '33;border-radius:0.65rem;padding:0.6rem 0.35rem;text-align:center;">' +
            '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.5rem;color:' + color + ';line-height:1;">' + val + '</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;letter-spacing:0.07em;text-transform:uppercase;color:#7596c0;margin-top:0.2rem;line-height:1.2;">' + label + '</div>' +
          '</div>';
        return `
      <div class="modal-section">
        <button class="dd-toggle-btn" onclick="toggleDD('pb-deepdive')" id="btn-pb-deepdive">
          <div style="display:flex;align-items:center;gap:0.5rem;min-width:0;">
            <span style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.08em;color:#9fb4d4;">🔬 Deep Dive: Full Promise Breakdown</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(159,180,212,0.12);border:1px solid rgba(159,180,212,0.2);color:#7596c0;padding:0.1rem 0.4rem;border-radius:999px;white-space:nowrap;">${total} tracked</span>
          </div>
          <svg class="dd-chevron w-4 h-4" fill="none" stroke="#7596c0" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div class="dd-body" id="pb-deepdive">
          <div class="dd-inner" style="padding:0.875rem;">

            <!-- Total tracked -->
            <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.8rem;">
              <span style="font-family:'Bebas Neue',sans-serif;font-size:1.9rem;color:white;line-height:1;">${total}</span>
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.7rem;letter-spacing:0.07em;text-transform:uppercase;color:#7596c0;">Total promises tracked</span>
            </div>

            <!-- Four-way split -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.4rem;margin-bottom:0.85rem;">
              ${card(k,    'Kept · '       + ofTotal(k),    '#4ade80')}
              ${card(comp, 'Compromise · ' + ofTotal(comp), '#60a5fa')}
              ${card(b,    'Broken · '     + ofTotal(b),    '#f87171')}
              ${card(pend, 'Pending · '    + ofTotal(pend), '#f5c842')}
            </div>

            <!-- How these receipts are judged.
                 THE FORMULA BOX IS GONE. It used to print "Promise % = Kept ÷
                 (Kept + Broken)", the substitution with the raw ratio, and the
                 published follow-through figure it was weighted into — three
                 numbers whose only job was to justify a score this site no
                 longer publishes. What a reader needs from a breakdown is what
                 counts as kept, what counts as broken, and what happens to the
                 ones still open. That is what this says now. -->
            <div style="background:rgba(10,15,30,0.6);border:1px solid rgba(245,200,66,0.18);border-radius:0.7rem;padding:0.75rem 0.85rem;margin-bottom:0.7rem;">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f5c842;margin-bottom:0.35rem;">How each promise is judged</div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:0.03em;color:white;margin-bottom:0.3rem;">One pledge at a time, against the record</div>
              <p style="font-size:0.74rem;color:#9fb4d4;line-height:1.55;margin:0 0 0.5rem;">Each promise is marked <strong style="color:#4ade80;">kept</strong>, <strong style="color:#60a5fa;">compromise</strong>, <strong style="color:#f87171;">broken</strong> or <strong style="color:#f5c842;">pending</strong> from sourced evidence, and every verdict is listed below with its receipt. <strong style="color:#cbd9ec;">Pending items are not held against anyone</strong> — a promise that hasn't played out yet is not evidence either way.</p>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.78rem;color:#cbd9ec;background:rgba(0,0,0,0.25);border-radius:0.45rem;padding:0.45rem 0.6rem;">
                ${resolved} settled · ${pend} still open · no percentage is published for this lane
              </div>
              <p style="font-size:0.68rem;color:#7596c0;line-height:1.5;margin:0.45rem 0 0;">Kept and broken pledges feed the one read this profile publishes — ⚖️ <strong style="color:#9fb4d4;">Word vs Action</strong> — alongside their stated positions and the issues they campaign on.</p>
            </div>

            ${note ? `<p style="font-size:0.76rem;color:#9fb4d4;line-height:1.6;margin:0 0 0.7rem;">${note}</p>` : ''}

            <!-- Source -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">Source</span>
              <a href="${src.url}"${isAnchor ? '' : ' target="_blank" rel="noopener"'} class="dd-source-chip">🔗 ${src.label}</a>
            </div>

          </div>
        </div>
      </div>` ;
      })()}

      <!-- Quote & Biography now render together near the top of the profile -->

      <!-- Key Issues now render near the top, directly under the Biography, so the
           profile reads identity → issues at a glance → record → detail. -->

      <!-- Promise breakdown table -->
      <span id="pdxsec-record" class="pdx-nav-anchor" aria-hidden="true"></span>
      <div class="modal-section" id="pdx-promise-section">
        <div class="modal-section-title">📊 Promise Tracker</div>
        <p class="modal-section-sub">Every tracked promise, grouped by verdict — kept, broken, and still pending — so the record speaks plainly. Tap a status to filter.</p>
        ${promiseFilterBar}
        <div id="pdx-promise-status" class="pdx-pfilter-status" style="display:none;">
          <span>Showing <b id="pdx-promise-status-label">all promises</b></span>
          <button type="button" class="pdx-pfilter-reset" onclick="window.pdxFilterPromises('all')">↺ Show all promises</button>
        </div>
        <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.875rem;padding:0 0.875rem 0.6rem;">
          <div id="pdx-promise-list">${promiseRows || '<div class="pdx-empty-state"><div class="pdx-empty-ico">📋</div><div class="pdx-empty-title">No promises tracked yet</div><div class="pdx-empty-sub">' + (_isChallenger ? 'Once this candidate takes office and acts on their pledges, kept and broken promises will be logged here.' : 'As this official acts on their pledges, kept and broken promises will be logged here — until then, see their stated positions above.') + '</div></div>'}</div>
          <div id="pdx-promise-empty" style="display:none;padding:1.1rem;color:#7596c0;font-size:0.8rem;text-align:center;">No promises tracked yet.</div>
        </div>
      </div>

      <!--PDXSP:record-->
      <!-- Verify Full Profile with AI — lifted OUT of the promise ledger and onto
           the spine. It used to be the last element of the Promise Tracker card,
           which meant restaging that ledger into a closed drawer would have made
           the app's only entry point to the multi-AI verification report
           unreachable without two taps. It is an action on the whole profile, not
           on the promise table, so it now stands on its own in the official-record
           stage. -->
      <!-- ⓘ HOW THIS PROFILE WAS CHECKED
           ────────────────────────────────────────────────────────────────────
           This slot used to hold "🛡️ Verify Full Profile with AI", a gradient CTA
           promising a "comprehensive multi-AI report (Claude, Gemini, Grok & GPT)
           verifying credentials, positions, controversy & trust score". It was
           retired here rather than wired, for two reasons:

             1. It was not connected to anything. openFullProfileVerify() opened an
                overlay, waited a hardcoded 1500ms "to simulate multi-AI processing
                delay for premium feel", and then rendered hand-written prose from a
                client-side table keyed by politician id. No request left the
                browser. On any profile without a hand-written branch it produced
                generic filler. There was no verification to wire up — there was a
                mock of one.
             2. What it printed was a "Trust Score" with a High/Medium/Low rating,
                computed as a weighted average of four invented provider scores.
                That is a second primary score, on the same profile as Word vs
                Action, derived from nothing checkable. Wiring it would have meant
                shipping a rival headline number sourced from a fabrication.

           The honest control for "how do I know any of this is real?" already
           exists and is now what this slot offers: the scoring methodology (what is
           counted, what is weighted, what is deliberately excluded) and the profile's
           own sourced record. Both open surfaces that are populated from real data
           and cite it. The overlay's code is left in place and simply unreferenced
           from the profile, so nothing else that may hold a link to it breaks. -->
      <div class="modal-section" id="pdxsec-verify">
        <button type="button" class="pdx-howchecked"
          onclick="if(window.PDXConsistency&&window.PDXConsistency.openMethodology){window.PDXConsistency.openMethodology(null,'${String(id || '').replace(/[^a-zA-Z0-9_-]/g, '')}');}else{var _m=document.getElementById('methodology');if(_m){if(typeof closeModal==='function')closeModal();_m.scrollIntoView({behavior:'smooth',block:'start'});}}">
          <span aria-hidden="true">ⓘ</span> How this profile was checked
        </button>
        <!-- Office-aware, for the same reason every other record line on this page is:
             a president casts no roll-call votes, so promising that "every figure traces
             to a roll-call vote" is a claim this profile cannot keep. The methodology
             sheet the button opens is handed the pid so it leads with the right lane. -->
        <p class="pdx-howchecked-sub">Every figure here traces to ${(function(){
            try {
              return (window.PDXExecRecord && typeof window.PDXExecRecord.eligible === 'function'
                && window.PDXExecRecord.eligible(id))
                ? 'a signed law, an executive order, an official filing or a dated public statement'
                : 'a roll-call vote, an official filing or a dated public statement';
            } catch (e) { return 'a formal action, an official filing or a dated public statement'; }
          })()} — each one linked in the section it appears in. This opens the scoring methodology: what is counted, how the tiers are weighted, and what is deliberately left out.</p>
      </div>

      <!--PDXSP:dw:money-->
      <!-- Financial Transparency — Wealth Over Time -->
      ${(function(){
        const wealthData = {
          trump:    { label:'Donald Trump',    unit:'B', years:[2015,2017,2019,2021,2023,2025,2026], values:[4.5,3.7,3.1,2.5,2.6,5.8,6.5] },
          cox:      { label:'Spencer Cox',     unit:'M', years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], values:[1.2,1.3,1.4,1.6,1.8,2.1,2.3,2.5,2.8] },
          lee:      { label:'Mike Lee',        unit:'M', years:[2011,2013,2015,2017,2019,2021,2023,2025,2026], values:[0.8,0.9,1.0,1.1,1.3,1.5,1.6,1.7,1.8] },
          curtis:   { label:'John Curtis',     unit:'M', years:[2017,2019,2021,2023,2025,2026], values:[2.1,2.3,2.5,2.8,3.0,3.2] },
          massie:   { label:'Thomas Massie',   unit:'M', years:[2012,2014,2016,2018,2020,2022,2024,2026], values:[1.5,1.6,1.8,2.0,2.2,2.5,2.7,3.0] },
          owens:    { label:'Burgess Owens',   unit:'M', years:[2020,2021,2022,2023,2024,2025,2026], values:[3.5,3.6,3.8,4.0,4.2,4.4,4.6] },
          maloy:    { label:'Celeste Maloy',   unit:'M', years:[2022,2023,2024,2025,2026], values:[0.6,0.7,0.8,0.9,1.0] },
          kennedy:  { label:'Mike Kennedy',    unit:'M', years:[2018,2020,2022,2024,2026], values:[2.0,2.2,2.4,2.6,2.9] },
          bilzerian:{ label:'Dan Bilzerian',   unit:'M', years:[2014,2016,2018,2020,2022,2024,2026], values:[100,120,80,50,40,35,30] },
          gallrein: { label:'Ed Gallrein',     unit:'M', years:[2018,2020,2022,2024,2026], values:[1.8,2.0,2.1,2.3,2.5] }
        };
        const wd = wealthData[id];
        if (!wd) return '';
        window.__wealthChartData = wd;
        return '<div class="modal-section">' +
          '<div class="modal-section-title">\u{1F4C8} Wealth Over Time (Public Disclosures)</div>' +
          '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.875rem;padding:1rem;">' +
            '<div style="position:relative;width:100%;height:260px;">' +
              '<canvas id="wealthChart" style="width:100%!important;height:100%!important;"></canvas>' +
            '</div>' +
            '<p style="font-size:0.65rem;color:#4e72a0;line-height:1.5;margin:0.75rem 0 0;text-align:center;">Data from public financial disclosures, FEC, and OpenSecrets. Not investment advice.</p>' +
          '</div>' +
        '</div>';
      })()}

      <!--PDXSP:record-->
      <!-- Key Voting Record -->
      ${(function(){
        const votingRecords = {
          curtis: [
            { bill:'Fiscal Responsibility Act of 2023', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Honored deficit reduction pledge while energy donors benefited from expedited pipeline permitting provisions in the bill.' },
            { bill:'FISA Section 702 Reauthorization', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'Voted for warrantless surveillance renewal despite stated privacy concerns — tech industry donors benefit from broad data-collection frameworks.' },
            { bill:'Colorado River Drought Contingency Act', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed Western water compact as promised — real estate donors depend on Utah water supply stability for new developments.' },
            { bill:'Bipartisan Infrastructure Law', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Delivered on rural broadband promise — $120M for Utah. Tech industry donors ($310K) positioned to win connectivity contracts.' },
            { bill:'National Defense Authorization Act FY2025', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Supported defense spending but bill included earmark provisions he had previously pledged to oppose.' },
          ],
          massie: [
            { bill:'FISA Reauthorization Act (H.R. 7888)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed warrantless surveillance as promised — one of 19 House Republicans to vote no despite leadership support for the bill. Consistent with anti-surveillance donors.' },
            { bill:'FY2024 Omnibus Spending Bill', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Refused to vote for 1,000+ page bill he hadn\'t fully read — honoring his signature pledge to Kentucky voters.' },
            { bill:'Farm Bill 2023 (H.R. 8467)', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'Voted for bill retaining crop subsidies despite pledge to eliminate them — Farm Bureau donors ($180K) and KY-04 agriculture pressure prevailed.' },
            { bill:'National Defense Authorization Act FY2025', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed military spending increases and called for Pentagon audit instead — consistent with libertarian fiscal stance.' },
            { bill:'Bipartisan Safer Communities Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed all gun control measures as promised — Gun Rights Groups ($320K) are among his top PAC donors.' },
            { bill:'Federal Reserve Transparency Act', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Co-sponsored Audit the Fed again — every Congress since 2012. Liberty PAC network ($160K) strongly supports this effort.' },
          ],
          lee: [
            { bill:'FY2024 Omnibus Appropriations', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'Voted for ~$1.7T in deficit spending despite foundational "never support deficit spending" pledge — Club for Growth donors publicly criticized the vote.' },
            { bill:'FISA Section 702 Reauthorization', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed warrantless surveillance consistent with civil liberties stance and constitutional originalism platform.' },
            { bill:'Respect for Marriage Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed on religious liberty grounds as promised — consistent with his base and Senate Conservatives Fund donors ($580K).' },
            { bill:'Debt Ceiling Suspension (2023)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed clean debt ceiling raise — consistent with fiscal conservatism pledge. Club for Growth ($1.2M top donor) expected this vote.' },
            { bill:'CHIPS and Science Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed government industrial policy on principle — though Utah tech donors stood to benefit from semiconductor investment.' },
            { bill:'Balanced Budget Amendment Reintroduction', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Championed balanced budget amendment in 2011-2012 but has not reintroduced or pushed it since 2015 despite continued campaign rhetoric.' },
          ],
          cox: [
            { bill:'Utah H.B. 261 (Transgender Youth Sports)', vote:'Signed', voteClass:'signed', alignment:'partial', matter:'Initially vetoed similar bill in 2022, then signed revised version under political pressure — shift from moderate brand disappointed some supporters.' },
            { bill:'Utah S.B. 127 (Tax Reform Package)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Delivered promised tax reform — real estate industry donors ($1.85M) benefited from property tax restructuring provisions.' },
            { bill:'Utah H.B. 311 (Social Media Age Verification)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Led national movement on youth social media regulation — fulfilled tech governance promise with bipartisan support.' },
            { bill:'Utah Executive Order on AI in Government', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Fulfilled tech innovation pledge — tech industry donors aligned with digital government modernization spending.' },
            { bill:'Utah H.B. 469 (Great Salt Lake Preservation)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Environmental conservation action consistent with moderate approach — insurance and real estate donors depend on lake stability.' },
          ],
          trump: [
            { bill:'Tax Cuts and Jobs Act (2017)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Delivered promised tax cuts — real estate pass-through deduction directly benefited Trump Org and mega-donors like Timothy Mellon ($150M).' },
            { bill:'Executive Order: Withdraw from Paris Agreement', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Fulfilled climate skeptic pledge — energy sector donors and Elon Musk / America PAC ($97M) aligned with deregulation agenda.' },
            { bill:'CARES Act ($2.2T COVID Relief)', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Emergency spending contradicted fiscal conservative rhetoric — $500B corporate fund disproportionately benefited Wall Street and securities donors ($22.4M).' },
            { bill:'First Step Act (Criminal Justice Reform)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Bipartisan criminal justice reform fulfilled despite some law enforcement donor opposition — rare cross-aisle achievement.' },
            { bill:'Government Shutdown (Border Wall Funding)', vote:'Signed', voteClass:'signed', alignment:'partial', matter:'35-day shutdown demanded $5.7B for wall but settled for $1.375B — far less than the "big, beautiful wall" promise to base.' },
            { bill:'Executive Order: Schedule F (Federal Workforce)', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Restructured federal bureaucracy as pledged — fulfilled "drain the swamp" rhetoric aligned with anti-establishment donor base.' },
          ],
          owens: [
            { bill:'Secure the Border Act (H.R. 2)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed strict border security as promised — defense/aerospace donors ($260K) aligned with enforcement infrastructure spending.' },
            { bill:'Parents Bill of Rights Act', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported parental rights in education as pledged — consistent with campaign platform on family values and school choice.' },
            { bill:'National Defense Authorization Act FY2025', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported military spending — defense sector donors ($260K) directly benefit from NDAA procurement provisions.' },
            { bill:'Inflation Reduction Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed Democratic spending bill as promised — pharma donors ($290K) opposed the drug pricing negotiation provisions.' },
            { bill:'FISA Reauthorization', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Voted for surveillance renewal — intelligence community ties from military background, but some constituents raised civil liberty concerns.' },
          ],
          maloy: [
            { bill:'H.R. 1 (Lower Energy Costs Act)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed energy production expansion as promised — oil & gas ($210K) and mining ($180K) donors are top contributors.' },
            { bill:'Secure the Border Act (H.R. 2)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported border security consistent with campaign pledge — key issue for rural District 2 district.' },
            { bill:'National Defense Authorization Act FY2025', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed defense spending for Hill AFB and Utah defense contractors — aligned with district employment and donor base.' },
            { bill:'Federal Lands Management Reform Act', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported increased state input on federal land decisions — ranching/agriculture donors ($150K) depend on grazing access.' },
            { bill:'Continuing Resolution (Gov\'t Funding)', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Voted for short-term spending to avoid shutdown despite pledging fiscal restraint — pragmatism over principle.' },
          ],
          bilzerian: [
            { bill:'No Federal Voting Record', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As a first-time candidate, Bilzerian has no congressional voting record. His self-funded campaign ($1.2M) limits outside donor influence but raises questions about personal wealth driving political access.' },
          ],
          gallrein: [
            { bill:'No Federal Voting Record Yet', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As Republican nominee for KY-04, Gallrein has no federal voting record. His agriculture/restaurant donor base ($320K + $140K) suggests priorities in farm and small business policy.' },
          ],
          kennedy: [
            { bill:'No Federal Voting Record — State Record Only', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Kennedy served in Utah House 2013-2020 but has no federal record. Health sector donors ($580K Pharma) suggest healthcare policy focus if elected to Congress.' },
          ],
          boebert: [
            { bill:'Bipartisan Safer Communities Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed all gun control as promised — consistent with Second Amendment absolutist platform and firearms industry support.' },
            { bill:'Debt Ceiling Suspension (Fiscal Responsibility Act)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed spending compromise — pledged to reject any deal that didn\'t include deep spending cuts.' },
            { bill:'Continuing Resolution (Gov\'t Funding)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Voted against stopgap funding — consistent with opposition to business-as-usual spending and government bloat.' },
            { bill:'Impeachment of DHS Secretary Mayorkas', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported impeachment over border security failures — fulfilled pledge to hold Biden administration accountable.' },
            { bill:'Ukraine Supplemental Aid Package', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed foreign military spending as promised — "America First" position resonates with small-dollar donor base.' },
          ],
          gaetz: [
            { bill:'Motion to Vacate Speaker McCarthy', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Led historic ouster effort — fulfilled anti-establishment pledge to challenge GOP leadership regardless of political cost.' },
            { bill:'Ukraine Supplemental Aid Package', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed foreign military spending — consistent with non-interventionist "America First" platform.' },
            { bill:'FISA Reauthorization', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed warrantless surveillance — civil liberties champion stance consistent with libertarian-leaning donor base.' },
            { bill:'Continuing Resolution (Gov\'t Funding)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed stopgap spending — pledged to force real budget negotiations rather than continuing resolutions.' },
            { bill:'National Defense Authorization Act FY2024', vote:'Nay', voteClass:'nay', alignment:'partial', matter:'Opposed NDAA despite supporting military — objected to spending levels and "woke" provisions in the final bill.' },
          ],
          mtg: [
            { bill:'Ukraine Supplemental Aid Package', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed foreign aid as pledged — "not one more penny to Ukraine" was a core campaign promise aligned with populist base.' },
            { bill:'Debt Ceiling Deal (Fiscal Responsibility Act)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Rejected spending compromise — demanded deeper cuts consistent with fiscal hawk positioning.' },
            { bill:'Motion to Vacate Speaker McCarthy', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Did not vote despite anti-establishment brand — complex loyalty dynamics after McCarthy gave her committee seats back.' },
            { bill:'FISA Reauthorization', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed surveillance state consistent with anti-establishment and civil liberties position.' },
            { bill:'Bipartisan Infrastructure Law', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed bipartisan spending deal — labeled it "Communist infrastructure bill" in line with hard-right fiscal stance.' },
          ],
          tgabbard: [
            { bill:'Confirming role as Director of National Intelligence', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Appointed by Trump as DNI — fulfills her pivot from Democratic congresswoman to national security hawk in the MAGA orbit.' },
            { bill:'Stop Arming Terrorists Act (former House bill)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Her signature legislation opposed CIA weapons programs for Syrian rebels — consistent with non-interventionist brand.' },
            { bill:'Impeachment of President Trump (2019)', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Voted "present" rather than Yes or No — angered both parties. Demonstrated independence but was criticized as fence-sitting.' },
            { bill:'Tulsi Aloha PAC spending controversy', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Campaign finance reports showed PAC spent heavily on travel and personal security — raised questions about donor fund usage.' },
          ],
          hegseth: [
            { bill:'No Legislative Voting Record', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As Defense Secretary nominee (not a legislator), Hegseth has no voting record. His Fox News advocacy positions serve as his policy track record.' },
            { bill:'Pentagon DEI Program Elimination (Policy Directive)', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Directed elimination of military DEI programs — fulfilled core campaign advocacy position from Fox News era.' },
            { bill:'Military Readiness & Lethality Review', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Ordered comprehensive review of military readiness — aligned with "warrior culture" restoration pledge.' },
          ],
          lyman: [
            { bill:'Utah H.B. 148 (Transfer of Public Lands Act)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Voted for the landmark bill demanding federal transfer of public lands to Utah — the foundation of his entire political career and gubernatorial platform.' },
            { bill:'Recapture Canyon ATV Protest Ride (2014)', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Led an illegal ATV ride through protected federal land, resulting in a federal misdemeanor conviction. Actions contradicted stated respect for rule of law.' },
            { bill:'Utah H.B. 357 (Constitutional Carry Expansion)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Voted to expand Utah constitutional carry provisions — consistent with strong Second Amendment stance and rural conservative base in San Juan County.' },
            { bill:'Utah H.B. 469 (Great Salt Lake Preservation)', vote:'Nay', voteClass:'nay', alignment:'partial', matter:'Opposed environmental spending measure — consistent with anti-regulation stance but contradicted broader Utah conservation consensus.' },
            { bill:'Utah S.B. 127 (Tax Reform Package)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported tax restructuring — aligned with fiscal conservatism platform and goal to eventually abolish state income tax.' },
          ],
          cstewart: [
            { bill:'FISA Section 702 Reauthorization', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Supported surveillance reauthorization as Intel Committee member — national security priority over civil liberties concerns he acknowledged but deprioritized.' },
            { bill:'FY2023 Omnibus Appropriations', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed $1.7T spending bill consistent with fiscal conservatism pledge — one of the reliable No votes on omnibus packages throughout his tenure.' },
            { bill:'National Defense Authorization Act FY2023', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed defense spending as former B-1 bomber pilot — defense/aerospace donors ($340K) aligned with military readiness priorities.' },
            { bill:'Colorado River Drought Contingency Act', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported Western water compact protecting Utah\'s allocation — consistent with District 2 district priorities and real estate donors dependent on water stability.' },
            { bill:'Bipartisan Infrastructure Law (H.R. 3684)', vote:'Nay', voteClass:'nay', alignment:'partial', matter:'Opposed the $1.2T infrastructure package despite Utah receiving billions — fiscal concerns outweighed infrastructure benefits for his district.' },
          ],
          rfine: [
            { bill:'FL H.B. 1 (Universal School Choice)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Championed Florida\'s universal ESA expansion — consistent with school choice platform. Education reform PAC donors ($180K) aligned with this priority.' },
            { bill:'FL Anti-BDS Resolution (H.R. 545)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Authored anti-BDS resolution in Florida House — signature pro-Israel issue and centerpiece of his planned federal legislative agenda.' },
            { bill:'FL H.B. 1421 (Gender Transition Procedures Ban for Minors)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Voted for ban on gender transition procedures for minors — consistent with social conservative platform and base in Brevard County.' },
            { bill:'FL S.B. 252 (Anti-Vaccine Mandate Bill)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Co-sponsored anti-vaccine mandate legislation — fulfilled campaign promise to block employer and government vaccination requirements.' },
            { bill:'FL State Budget FY2024 ($117B)', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Voted for Florida\'s record $117B budget despite claiming fiscal conservatism — pragmatism over stated spending restraint principles.' },
          ],
          bmoore: [
            { bill:'National Defense Authorization Act FY2025', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Backed defense spending protecting Hill Air Force Base funding and F-35 expansion — defense/aerospace donors ($280K) directly benefit from NDAA procurement.' },
            { bill:'Bipartisan Infrastructure Law (H.R. 3684)', vote:'Nay', voteClass:'nay', alignment:'broken', matter:'Voted against the infrastructure bill despite campaigning on infrastructure priorities — $3.4B for Utah roads, water, and broadband were in the package.' },
            { bill:'Inflation Reduction Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed Democratic spending bill as Ways & Means member — consistent with anti-tax-increase platform and opposition to new government spending.' },
            { bill:'Great Salt Lake Recovery Act (H.R. 4890)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Co-introduced legislation to fund Great Salt Lake recovery — fulfilled environmental conservation pledge for northern Utah.' },
            { bill:'Tax Cuts and Jobs Act Extension Provisions', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported extending 2017 tax cuts through Ways & Means Committee — consistent with anti-tax-increase platform and small business donor base ($320K).' },
            { bill:'Continuing Resolution (Gov\'t Funding)', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Voted for short-term funding to avoid shutdown despite pledging fiscal restraint — chose pragmatism over principle to protect Hill AFB operations.' },
          ],
          jpetro: [
            { bill:'Layton FY2025 Budget ($128M)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Approved city budget with increased public safety and road maintenance funding — consistent with campaign infrastructure and safety pledges.' },
            { bill:'Layton Crossing Development Approval', vote:'Signed', voteClass:'signed', alignment:'partial', matter:'Approved major commercial development with conditions — delivered growth but some residents felt public input process was insufficient despite campaign pledge.' },
            { bill:'Police Department Staffing Expansion (Phase 1)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Authorized hiring of 6 additional Layton PD officers — Phase 1 of promised 12-officer expansion. Public safety donors and community groups aligned.' },
            { bill:'East Layton Residential Zoning Amendment', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Approved rezoning of agricultural buffer land for residential development — contradicted campaign pledge to protect farmland buffer zones on Layton\'s eastern edge.' },
            { bill:'Hill AFB Noise Impact Coordination MOU', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Formal memorandum of understanding with Hill AFB on F-35 noise impacts still in draft — meetings ongoing but no binding agreement reached despite campaign commitment.' },
          ],
          jstevenson: [
            { bill:'Utah S.B. 110 (Water Conservation Amendments)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Voted for water district metering and tiered pricing reforms — consistent with water conservation platform and Davis County infrastructure priorities.' },
            { bill:'Utah FY2024 State Budget ($28.8B)', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'Approved state budget growing 8.4% while CPI was ~2.2% — contradicted stated position that growth should not exceed inflation.' },
            { bill:'Utah S.B. 211 (Davis County Tech Development Zone)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Authored bill creating technology development zone in Davis County — economic development donors ($220K) positioned to benefit from zone incentives.' },
            { bill:'I-15 Layton/Clearfield Interchange Funding', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Secured UDOT appropriations for critical I-15 interchange improvements — directly benefits Davis County commuters and transportation donors ($140K).' },
            { bill:'UTA FrontRunner Extension Study', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Promised feasibility study for FrontRunner extension to West City at 2022 GOP meeting — no study commissioned or funded as of 2025.' },
          ],
          tlee: [
            { bill:'Utah H.B. 215 (Utah Fits All Scholarship Act)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Voted for universal $8,000 ESA school choice program — consistent with education choice platform. Passed House 44-28.' },
            { bill:'Utah H.B. 54 (Income Tax Reduction)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported reducing Utah income tax from 4.65% to 4.55% — consistent with tax-cut priorities for District 16 families and businesses.' },
            { bill:'Utah H.B. 312 (Occupational Licensing Expansion)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed expanding licensing requirements for new professions — consistent with free-market, anti-regulation platform and small business donor base.' },
            { bill:'District 16 Road Funding Bill', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Promised targeted road funding bill for Layton (District 16) during 2022 campaign — no such bill introduced in 2023 or 2024 legislative sessions.' },
            { bill:'Utah H.B. 182 (Small Business Permitting Reform)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Introduced bill streamlining license renewal for businesses under 10 employees — passed Commerce Committee 8-2. Pending full House vote.' },
          ],
          sadams: [
            { bill:'Utah H.B. 215 (Utah Fits All Scholarship Act)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Used Senate President authority to ensure floor consideration and passage 20-9 — instrumental in creating universal school choice for all Utah families.' },
            { bill:'Utah FY2024 State Budget ($28.8B)', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'Approved budget growing 8.4% vs ~2.2% CPI under his Senate leadership — contradicted stated fiscal restraint principles.' },
            { bill:'I-15 Davis/Weber County Corridor Funding ($280M)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Secured $280M for I-15 corridor improvements in Davis and Weber counties — directly benefits his Layton-area constituents and transportation donors.' },
            { bill:'Utah Water Conservation Package (SB 110 + companion bills)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Led passage of comprehensive water conservation legislation — critical for Great Salt Lake and Davis County water sustainability.' },
            { bill:'Legislative Term Limits Floor Vote', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Publicly expressed openness to term limits but no bill received a Senate floor vote under his presidency (2019-2025) — reform stalled in committee.' },
            { bill:'Great Salt Lake Water Compact Legislation', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Expressed support for comprehensive Great Salt Lake water legislation in March 2025 but no formal bill sponsored or introduced as of mid-2025.' },
          ],
          emendenhall: [
            { bill:'SLC Affordable Housing Master Plan ($70M)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Signed and funded 5-year affordable housing plan — $70M committed to new units and tenant protections. Housing advocacy donors aligned.' },
            { bill:'Climate Positive 2040 Executive Order', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Committed SLC to carbon neutrality by 2040 and 100% renewable electricity for city operations by 2030 — environmental groups ($180K) strongly supported.' },
            { bill:'Winter Shelter Capacity Pledge (2022-23)', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Pledged zero unsheltered nights during winter — over 200 individuals remained unsheltered on peak January nights per city shelter survey.' },
            { bill:'Police Reform Implementation Plan', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Promised comprehensive police reform report by Q2 2022 — released 18 months late in December 2023. Reform advocates and civil rights donors criticized the delay.' },
            { bill:'$100M Affordable Housing Bond (Nov 2025 Ballot)', vote:'Exec Order', voteClass:'execorder', alignment:'partial', matter:'Proposed $100M general obligation bond for affordable housing — pending voter approval. Ambitious but outcome depends on ballot measure passage.' },
          ],
          jwilson: [
            { bill:'SL County Homeless Action Plan (Shelter +430 beds)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Expanded shelter capacity by 430 beds through 2023 — fulfilled Homeless Action Plan pledge with county-funded expansions and service provider contracts.' },
            { bill:'Pretrial Services Reform Program', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Launched pretrial services reducing unnecessary detention for low-risk defendants — 34% reduction confirmed. Cost-effective at $28/day vs $65/day for jail.' },
            { bill:'ARPA Public Health Deployment ($180M)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Secured and deployed $180M in federal ARPA funds for county public health, behavioral health, and housing — delivered on post-COVID infrastructure pledge.' },
            { bill:'Affordable Housing Trust Fund (FY2023)', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Pledged $20M annual trust fund contribution — actual FY2023 contribution was $8.4M (42% of goal). Administration cited competing budget priorities.' },
            { bill:'County Jail Modernization Plan', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Promised facility plan by 2022 — released in late 2024, two years late with significant cost overruns in assessments.' },
          ],
          bwilson: [
            { bill:'Utah H.B. 215 (Utah Fits All Scholarship Act)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'As House Speaker, directed procedural framework ensuring passage 44-28 — decisive leadership on creating universal $8,000 ESA school choice program.' },
            { bill:'Utah H.B. 54 & predecessors (Income Tax Reductions)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Led sequential income tax reductions from 4.95% to 4.55% across multiple sessions — fulfilled core tax reform promise to Utah taxpayers.' },
            { bill:'Utah FY2023 State Budget ($24.9B)', vote:'Yea', voteClass:'yea', alignment:'broken', matter:'State budget grew 42% under his speakership (FY2019-FY2023) from $17.5B to $24.9B — far exceeding inflation and contradicting fiscal restraint principles.' },
            { bill:'Utah S.B. 110 (Water Conservation Amendments)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Supported comprehensive water conservation legislation including metering requirements — critical for Great Salt Lake and Utah\'s long-term water security.' },
            { bill:'House Committee Vote Transparency Reform', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Pledged full committee vote transparency — only partially implemented. Many standing committee votes remain unrecorded as of 2024.' },
          ],
          biden: [
            { bill:'Infrastructure Investment and Jobs Act (2021)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Delivered the "Build Back Better" infrastructure promise — roughly $1.2T for roads, bridges, broadband, and water, with bipartisan support and projects still breaking ground in 2026.' },
            { bill:'Inflation Reduction Act (2022)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Fulfilled core climate and drug-pricing pledges — ~$370B in clean-energy investment plus Medicare\'s first power to negotiate prescription prices and a $35 insulin cap.' },
            { bill:'Bipartisan Safer Communities Act (2022)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Signed the first major federal gun-safety law in nearly 30 years — honored a long-standing pledge after years of stalled efforts.' },
            { bill:'Student Loan Forgiveness Plan', vote:'Exec Order', voteClass:'execorder', alignment:'broken', matter:'Promised broad student-debt cancellation, but the Supreme Court struck down the main plan in 2023, leaving the central version of the pledge unfulfilled.' },
            { bill:'June 2024 Border Asylum Restriction', vote:'Exec Order', voteClass:'execorder', alignment:'partial', matter:'After a bipartisan border deal collapsed, he reversed course and tightened asylum by executive action — a partial pivot from his day-one reform promise under political pressure.' },
          ],
          obama: [
            { bill:'Affordable Care Act (2010)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Delivered his signature healthcare promise, covering ~20M people — though his "keep your plan" pledge was rated false after some plans were cancelled.' },
            { bill:'American Recovery and Reinvestment Act (2009)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Fulfilled the pledge to confront the financial crisis with stimulus — $787B plus the auto bailout, credited with stabilizing the economy at the cost of higher deficits.' },
            { bill:'Dodd-Frank Wall Street Reform (2010)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Honored the promise to re-regulate Wall Street after 2008, creating the Consumer Financial Protection Bureau.' },
            { bill:'Paris Climate Agreement (2016)', vote:'Exec Order', voteClass:'execorder', alignment:'kept', matter:'Met his climate-leadership pledge by joining Paris — though entering by executive action left it vulnerable to a successor\'s withdrawal.' },
            { bill:'Executive Order to Close Guantanamo Bay', vote:'Exec Order', voteClass:'execorder', alignment:'broken', matter:'Signed a day-two order to close the prison within a year; congressional resistance and his own caution left it open at the end of both terms.' },
          ],
          gwbush: [
            { bill:'Bush Tax Cuts (2001 & 2003)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Delivered the promised tax cuts — but they helped turn a budget surplus into deficits, a tension with his fiscal-conservative brand.' },
            { bill:'No Child Left Behind Act (2002)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Fulfilled his "compassionate conservative" education pledge with testing-based accountability — later judged too rigid and rolled back.' },
            { bill:'Medicare Part D (2003)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Created prescription-drug coverage for seniors — the largest Medicare expansion in its history, though it added to long-term costs.' },
            { bill:'Iraq War Authorization (2002)', vote:'Signed', voteClass:'signed', alignment:'broken', matter:'Justified by WMD claims that proved false; the war\'s cost and length became the defining controversy of his presidency.' },
            { bill:'Comprehensive Immigration Reform (2007)', vote:'Not Voting', voteClass:'notvoting', alignment:'broken', matter:'Pushed hard for a path to legal status, but the bill was blocked in the Senate — a promise he could not deliver.' },
          ],
          sanders: [
            { bill:'Iraq War Authorization (2002)', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Voted against the Iraq War as a House member — a defining early stand consistent with his lifelong anti-war record.' },
            { bill:'USA PATRIOT Act', vote:'Nay', voteClass:'nay', alignment:'kept', matter:'Opposed the surveillance expansion on civil-liberties grounds — consistent with his privacy and constitutional positions.' },
            { bill:'Yemen War Powers Resolution (2019)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Led the bipartisan effort to end U.S. support for the Saudi-led war — fulfilling his pledge to reclaim congressional war powers.' },
            { bill:'$15 Minimum Wage Amendment (2021)', vote:'Yea', voteClass:'yea', alignment:'kept', matter:'Forced a Senate vote on his signature wage hike — it failed, but he kept the promise to put colleagues on record.' },
            { bill:'Inflation Reduction Act (2022)', vote:'Yea', voteClass:'yea', alignment:'partial', matter:'Backed the climate and drug-pricing law while publicly arguing it fell short of the Medicare for All and Green New Deal scale he campaigns on.' },
          ],
          nhaley: [
            { bill:'SC Confederate Flag Removal (2015)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'As governor, led the removal of the Confederate flag from the SC State House grounds after the Charleston church massacre — her defining act of leadership.' },
            { bill:'SC 20-Week Abortion Ban (2016)', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Signed one of the nation\'s stricter abortion limits as governor — consistent with the pro-life identity she carried into national politics.' },
            { bill:'SC Voter ID Law', vote:'Signed', voteClass:'signed', alignment:'kept', matter:'Backed and defended voter-ID requirements — aligned with her conservative platform, though critics raised access concerns.' },
            { bill:'No Federal Legislative Record', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'Haley has never served in Congress; her record is as SC governor and UN Ambassador, so federal promise-tracking rests on executive and diplomatic actions rather than floor votes.' },
          ],
          rfkjr: [
            { bill:'HHS Vaccine Advisory Overhaul (2025)', vote:'Exec Action', voteClass:'execorder', alignment:'partial', matter:'Reshuffled federal vaccine advisory panels as promised — fulfilling his "transparency" pledge to supporters while alarming public-health experts who cite established vaccine science.' },
            { bill:'Food Additive & Dye Phase-Out Directive (2025)', vote:'Exec Action', voteClass:'execorder', alignment:'partial', matter:'Began pressing to remove synthetic dyes and certain additives under the MAHA agenda — an early step toward a signature promise still being implemented.' },
            { bill:'No Congressional Voting Record', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As an environmental lawyer turned HHS Secretary, Kennedy has no legislative voting record; his promises will be judged by regulatory action across FDA, CDC, and NIH.' },
          ],
          dballard: [
            { bill:'No Federal Voting Record — Challenger', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As a Democratic challenger in heavily Republican UT-1, Ballard has no congressional record; his small-dollar, no-corporate-PAC pledge and veterans-and-rural-health focus are the test of his platform.' },
          ],
          jjohnson: [
            { bill:'No Federal Voting Record — Challenger', vote:'Not Voting', voteClass:'notvoting', alignment:'partial', matter:'As a Democratic challenger in UT-4, Johnson has no congressional record; her platform centers on public-school funding, ACA protection, and Wasatch Front air quality.' },
          ],
        };
        const vr = votingRecords[id];
        if (!vr || !vr.length) return '';
        // ── WHICH LANE IS THIS SELECTION ACTUALLY ABOUT? ────────────────────────
        // Read from the rows, not from a list of names: an entry whose position is
        // "Signed" or "Exec Order" is not a roll call, and everything this block used
        // to print around such a row — "🗳️ Voting Record Highlights", "5 votes
        // tracked", "LEGISLATIVE ACTIONS", a Congress.gov roll-call source note — was
        // vote vocabulary on someone who casts no votes. Presidents, governors and
        // mayors all landed here. The lane decides the wording once, and the rows
        // themselves are untouched.
        const _vrActionLane = vr.some(function(v){ return /^(signed|exec)/i.test(String(v.vote || '')); });
        const alignLabel = _vrActionLane
          // Record vocabulary, matching the Official Record's row chips — never the
          // promise-grade "Kept / Broken" pair, which is the other product this pass
          // retired.
          ? { kept:'✓ Backs it up', broken:'⚠ Contradicts', partial:'◑ Cuts both ways' }
          : { kept:'✓ Kept', broken:'✗ Broken', partial:'~ Partial' };
        const vrRows = vr.map(function(v) {
          return '<div class="vr-row">' +
            '<div style="display:flex;align-items:flex-start;gap:0.6rem;margin-bottom:0.35rem;">' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.82rem;color:white;letter-spacing:0.01em;margin-bottom:0.3rem;">' + v.bill + '</div>' +
                '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;">' +
                  '<span class="vr-vote-pill vr-vote-' + v.voteClass + '">' + v.vote + '</span>' +
                  '<span class="vr-align-pill vr-align-' + v.alignment + '">' + (alignLabel[v.alignment]||v.alignment) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:0.75rem;color:#7596c0;line-height:1.55;margin-top:0.25rem;padding-left:0;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#4e72a0;">Why This Matters:</span> ' + v.matter +
            '</div>' +
          '</div>';
        }).join('');
        // Voting Record Highlights — a scannable lead-in surfacing the few most
        // significant votes, above the full record.
        const _vrHiCards = vr.slice(0, 3).map(function(v){
          return '<div style="background:rgba(10,15,30,0.55);border:1px solid rgba(255,255,255,0.06);border-radius:0.65rem;padding:0.6rem 0.7rem;margin-bottom:0.45rem;">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.78rem;color:white;line-height:1.35;min-width:0;">' + v.bill + '</span>' +
              '<span class="vr-align-pill vr-align-' + v.alignment + '" style="flex-shrink:0;">' + (alignLabel[v.alignment]||v.alignment) + '</span>' +
            '</div>' +
            '<div style="margin-top:0.4rem;"><span class="vr-vote-pill vr-vote-' + v.voteClass + '">' + v.vote + '</span></div>' +
          '</div>';
        }).join('');
        // Two layers, one section. The live slot is filled by
        // _pdxHydrateVoteHighlights from the actual roll-call record the profile
        // fetches (see that function's note); it renders as nothing until — and
        // unless — that record is warm. The curated selection below it is the
        // annotated sample it always was, and says so: the label and the source note
        // both name it a selection.
        //   The kept / partial / broken tally that used to sit here is GONE. Three
        // chips reading "Kept Word" and "Broke Word" over five hand-picked rows was a
        // second integrity product on a page that is supposed to have exactly one, and
        // scoping it to the sample only ever made it a smaller rival, not a smaller
        // claim. What each row shows about a stated position is still on the row, in
        // the record's own vocabulary; nothing counts it up into a rate here.
        //   The whole section is congressional-only. Its live layer is roll-call
        // highlights, which never warm for a president, and its curated layer led with
        // "🗳️ Voting Record Highlights" over a list of signed orders. On the ✒️ lane
        // the Official Record now carries the enactment ledger instead, so this block
        // renders nothing rather than a second, vote-worded record.
        const _vrHighlightsSection = (vr.length >= 2 && !_vrActionLane)
          ? '<div class="modal-section" id="pdx-vrhi" data-pdx-vrhi-pid="' + id + '">' +
              '<div class="modal-section-title">\u{1F5F3}️ Voting Record Highlights</div>' +
              '<div class="pdx-vrhi-live" hidden></div>' +
              // Cold-open placeholder. The roll-call record is fetched async, so on a
              // first open this section would otherwise open on the curated sample
              // alone with no hint that the real record is on its way. One quiet line,
              // no count and no score — there is nothing true to put a number on yet.
              // _pdxHydrateVoteHighlights drops it the moment the record paints, and
              // also when a load has landed and produced nothing, so it can never sit
              // there claiming to be loading something that already finished. The
              // wording matches the hero's warming sub-line in word-action.js — same
              // fetch, and on a cold open both can be on screen at once.
              '<div class="pdx-vrhi-wait">Loading the record…</div>' +
              '<div class="pdx-vrhi-curated">' +
                '<div class="pdx-vrhi-cur-hd">\u{1F4CE} Annotated selection · ' + vr.length + ' vote' + (vr.length === 1 ? '' : 's') + ' with a why-this-matters note</div>' +
                _vrHiCards +
              '</div>' +
              '<p class="src-note">These are ' + vr.length + ' annotated vote' + (vr.length === 1 ? '' : 's') + ' — each picked for what it shows about a stated position — not everything on the roll call, and not a tally of anything. The full, filterable record is below.</p>' +
            '</div>'
          : '';
        // One renderer, two stages. The highlights above are official-record
        // headlines and belong on the spine; the full table below is deep record and
        // belongs in the votes drawer. Emitting the spine sentinel between them lets
        // PDXProfileSpine split this block where it should be split, without moving
        // a line of the markup that builds either half.
        return _vrHighlightsSection +
          '<!--PDXSP:dw:votes-->' +
          '<div class="modal-section">' +
          '<div class="modal-section-title">' + (_vrActionLane
            ? '\u{270D}\u{FE0F} Full Record of Formal Actions'
            : '\u{1F5F3}\u{FE0F} Full Voting Record') + '</div>' +
          '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.875rem;overflow:hidden;">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 0.875rem;background:rgba(96,165,250,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">' +
              '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:0.1em;color:#60a5fa;">' +
                (_vrActionLane ? 'EXECUTIVE ACTIONS' : 'LEGISLATIVE ACTIONS') + '</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.25);color:#60a5fa;padding:0.1rem 0.4rem;border-radius:999px;">' +
                vr.length + (_vrActionLane
                  ? ' action' + (vr.length === 1 ? '' : 's') + ' on file'
                  : ' vote' + (vr.length === 1 ? '' : 's') + ' tracked') + '</span>' +
            '</div>' +
            vrRows +
          '</div>' +
          '<p style="font-size:0.6rem;color:#4e72a0;line-height:1.5;margin:0.5rem 0 0;text-align:center;">' + (_vrActionLane
            ? 'Executive actions from the Federal Register, GPO, White House and state executive records.'
            : 'Voting data from Congress.gov, Clerk.house.gov, Senate.gov roll calls, and state legislative records.') + '</p>' +
        '</div>';
      })()}

      <!--PDXSP:tension-->
      <!-- Extra sections (alerts, info boxes) -->
      ${extraSections}

      <!--PDXSP:receipts-->
      <!-- In the Spotlight — Current Events & Controversies -->
      ${(function(){
        const spotlightData = (window.SPOTLIGHT_DATA = window.SPOTLIGHT_DATA || {});
        // ── In the Spotlight — politician-specific, accountability-linked ──────
        // Surfaces THIS official's own record and ties it to the accountability
        // analysis. The same kept/broken promises the analysis draws on are shown
        // here as its *drivers* — each
        // tagged ▲/▼ and tappable to open the full accountability analysis. An
        // optional per-document `spotlight` array lets curators attach specific
        // issues/events and flag whether each helps or hurts the score (impact:
        // 'positive' | 'negative', plus optional `category` matching an
        // accountability category key). Curated news from the SPOTLIGHT_DATA map
        // and on-document entries without an impact are shown as context. Falls
        // back to a clean, honest empty state when there is nothing to show.
        // The parenthetical naming the OTHER lane has to be office-aware. A
        // president is never told their Official Record is made of votes — that is
        // the same claim the merged record section stopped making, and a sub-line is
        // exactly where it survives unnoticed.
        var _slExecLane = false;
        try {
          _slExecLane = !!(window.PDXExecRecord && typeof window.PDXExecRecord.eligible === 'function'
            && window.PDXExecRecord.eligible(id));
        } catch (e) {}
        var slTitle = '<div class="modal-section-title">\u{1F526} In the Spotlight · Accountability</div>' +
          '<p class="modal-section-sub">The integrity read — public statements, conduct and rhetoric vs. reality. This is the stance-follow-through lane, separate from the ' +
          (_slExecLane
            ? '\u{270D}\u{FE0F} Official Record (laws signed, vetoes and orders)'
            : '\u{1F3DB}\u{FE0F} Official Record (votes and formal actions)') +
          ' and the 🤝 pledge ledger that feeds it.</p>';
        var safeSlId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
        var _slLast = (p && p.name) ? String(p.name).trim().split(/\s+/).pop() : 'this official';

        function _slHumanize(s) {
          return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ').trim().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        }

        // Classify a REAL curated item by the kind of thing it is — a
        // controversy, a piece of legislation, a public statement, or a key
        // campaign/office event — using keyword heuristics over its own headline
        // and facts. This only re-labels existing, sourced text (it never invents
        // content) so each card announces what it is at a glance and controversies
        // read distinctly from routine news. Order matters: the most consequential
        // signal a card can carry wins.
        function _slClassifyNews(headline, facts) {
          var t = String(headline || '') + ' ' + String(facts || '').replace(/<[^>]*>/g, ' ');
          if (/scrutiny|controvers|under fire|allegation|criticism|rebuke|ethics|conviction|questions? raised|misdemeanor|\bprobe\b|investigat|fire over|backlash|lawsuit|sued|unconstitutional|draws? .*question/i.test(t))
            return { badge: '🚩 Controversy', accent: '248,113,113' };
          if (/\bh\.?\s?b\.?\s?\d|\bs\.?\s?b\.?\s?\d|\bbill\b|signed|sponsor|co-spons|introduced|\bpassed\b|enacted|\blaw\b|amendment|resolution|reauthor|filibuster|\bveto|legislation|advances?\b/i.test(t))
            return { badge: '📋 Key Legislation', accent: '96,165,250' };
          if (/secured \$|\bfunding\b|\$\d|grant\b|approved|appointed|wins?\b|elected|polling|leads? in|re-?emerges|launch|mounts?|runs? in|campaign/i.test(t))
            return { badge: '🏛️ Key Event', accent: '120,180,140' };
          if (/announce|testif|argued|defend|called for|champions?|push(?:es|ed|ing)?\b|\bvows?\b|warned|statement|\bsaid\b|centers?\b|backs?\b|opposes?\b|supports?\b/i.test(t))
            return { badge: '🗣️ Public Statement', accent: '245,200,66' };
          return { badge: '📰 In the News', accent: '96,165,250' };
        }

        // Detect the issue area a REAL item touches from its own text and return a
        // short, alignment-flavored label. The label echoes the People's Mandate
        // issue vocabulary so a Spotlight card visibly connects to the positions a
        // voter is comparing on — the tag itself taps up to the alignment scorecard
        // (see _slCard). Returns '' when no clear issue is present rather than
        // forcing a guess.
        function _slIssueTag(headline, facts) {
          var t = (String(headline || '') + ' ' + String(facts || '').replace(/<[^>]*>/g, ' ')).toLowerCase();
          var map = [
            [/great salt lake|water|drought|virgin river|conservation|air quality|emission|climate|inversion|environment/, '💧 Water & Environment'],
            [/housing|home price|affordable|zoning|\brent\b|starter-home/, '🏠 Housing'],
            [/health|medicaid|medicare|\baca\b|affordable care|drug|pharma|vaccine|insulin|nursing|clinic/, '🏥 Healthcare'],
            [/ethics|\bpac\b|\bfec\b|campaign finance|\bdisclos|conflict of interest|luxury travel|self-funded|personal loans/, '🔎 Ethics & Money'],
            [/tax|budget|spending|deficit|income-tax|fiscal|tariff|subsid/, '💰 Taxes & Spending'],
            [/school|education|voucher|scholarship|universit|curriculum|\bstudent/, '🎓 Education'],
            [/energy|nuclear|reactor|gigawatt|\boil\b|\bgas\b|renewable|solar|data center|\bgrid\b/, '⚡ Energy'],
            [/social media|app store|privacy|\bdata\b|surveillance|\bai\b|age verification|tech industry|broadband|\bapp\b/, '🖥️ Tech & Privacy'],
            [/\bborder\b|immigration|immigrant/, '🛡️ Border & Immigration'],
            [/federal land|public land|bears ears|monument|grazing|mineral|lands transfer/, '🏔️ Public Lands'],
            [/defense|military|pentagon|f-35|air force|\bndaa\b|veteran|armed/, '🎖️ Defense & Veterans'],
            [/abortion|reproductive/, '⚖️ Abortion'],
            [/\bgun\b|firearm|second amendment/, '🔫 Gun Rights'],
            [/foreign|\bchina\b|russia|\biran\b|israel|\bbds\b|\bwho\b|intelligence|assad|syria/, '🌐 Foreign Policy'],
            [/\bjail\b|police|\bcrime\b|homeless|sentencing|rape-?kit|justice/, '🚔 Public Safety']
          ];
          for (var i = 0; i < map.length; i++) { if (map[i][0].test(t)) return map[i][1]; }
          return '';
        }

        // Shared card renderer. When `impact` is 'positive'/'negative' the card
        // becomes a tappable link into the full Accountability analysis, gets a
        // green/red left border, and shows an impact pill + tap hint — making the
        // connection between a Spotlight item and the score explicit. `accent` is
        // an "r,g,b" tint used for the type badge and (when not score-linked) the
        // left border, keeping every card in the dark, gold-accented house style.
        function _slCard(o) {
          var accent = o.accent || '96,165,250';
          var linked = (o.impact === 'positive' || o.impact === 'negative');
          var neutral = (o.impact === 'neutral');
          var impactCol = o.impact === 'positive' ? '74,222,128' : '248,113,113';
          var impactLabel = o.impact === 'positive' ? '▲ Strengthens score' : '▼ Weighs on score';
          var catLabel = (o.category && typeof window._slCatLabel === 'function') ? window._slCatLabel(o.category) : '';
          // Simple human-readable tags (1–2 per item) rendered as small chips so
          // each highlight carries an at-a-glance categorization the voter can
          // skim and filter on, alongside the structured score `category`.
          var tagChips = '';
          if (Array.isArray(o.tags) && o.tags.length) {
            tagChips = o.tags.slice(0, 2).map(function(t){
              return '<span style="color:#9fc6e8;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.32);padding:0.06rem 0.4rem;border-radius:999px;">' + window._slEsc(t) + '</span>';
            }).join('');
          }
          var edge = linked ? impactCol : (neutral ? '120,140,170' : accent);
          var idAttr = o.anchorId ? (' id="' + o.anchorId + '"') : '';

          // ── Issue bridge ───────────────────────────────────────────────
          // The connective tissue to the Candidate Snapshot. When a curated item
          // carries an `issueKey`, this row names the SAME Alignment-tracked issue
          // the Snapshot shows a position on — and, when the official actually
          // holds a documented stance on that issue (`heldPosition`), it says so
          // outright: "Expands on <Name>'s position · Supports <issue>." Tapping
          // jumps up to the alignment scorecard in the same modal, so a news
          // headline reads as evidence on a value the voter is already comparing,
          // not a loose feed item. Falls back silently to '' for unknown keys.
          var bridge = '';
          var ilabel = (o.issueKey && typeof window._issueLabel === 'function') ? window._issueLabel(o.issueKey) : '';
          if (ilabel) {
            // Jumps to whichever position surface is mounted. The People's Mandate
            // scorecard this used to target is retired, and its section now renders
            // only when a finance signal exists, so Stance at a Glance is the honest
            // first choice for "see this position in their record".
            var jumpAlign = "event.stopPropagation();var el=document.getElementById('pdxsec-glance')||document.getElementById('pdxsec-positions')||document.getElementById('alignment-modal-section');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});";
            var hp = o.heldPosition;
            if (hp && (hp.stance === 'support' || hp.stance === 'oppose' || hp.stance === 'mixed')) {
              var _sm = { support:{ t:'✓ Supports', c:'74,222,128' }, oppose:{ t:'✗ Opposes', c:'248,113,113' }, mixed:{ t:'~ Mixed record', c:'245,200,66' } }[hp.stance];
              bridge = '<button type="button" onclick="' + jumpAlign + '"' +
                ' title="' + _slLast + ' holds a tracked position on this issue — tap to see it in their stance record."' +
                ' style="cursor:pointer;width:100%;text-align:left;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;background:linear-gradient(90deg,rgba(245,200,66,0.08),rgba(167,139,250,0.1));border:1px solid rgba(167,139,250,0.34);border-left:3px solid rgba(245,200,66,0.6);border-radius:0.55rem;padding:0.4rem 0.55rem;">' +
                '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#e3c97a;">🔗 Expands on ' + _slLast + '’s position</span>' +
                '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.54rem;letter-spacing:0.05em;text-transform:uppercase;color:rgb(' + _sm.c + ');background:rgba(' + _sm.c + ',0.12);border:1px solid rgba(' + _sm.c + ',0.4);padding:0.05rem 0.4rem;border-radius:999px;">' + _sm.t + '</span>' +
                '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.04em;color:#c4b5fd;">' + ilabel + '</span>' +
                '<span style="margin-left:auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.54rem;letter-spacing:0.06em;text-transform:uppercase;color:#a78bfa;">Compare ↗</span>' +
              '</button>';
            } else {
              bridge = '<button type="button" onclick="' + jumpAlign + '"' +
                ' title="This item connects to the ' + ilabel + ' position the Alignment Tool tracks — tap to compare it."' +
                ' style="cursor:pointer;margin-top:0.5rem;display:inline-flex;align-items:center;gap:0.28rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.05em;text-transform:uppercase;color:#c4b5fd;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.32);border-radius:999px;padding:0.14rem 0.55rem;line-height:1.3;">🔗 On the issue: ' + ilabel + ' ↗</button>';
            }
          }

          // `linked` used to make the row tappable: it jumped to the inline
          // Accountability Score card and pulsed the contribution row that this item
          // fed. That card is retired along with the rest of the composite, so the
          // destination no longer exists and the row is plain text again. The item's
          // own sourcing below is what it was always the evidence for.
          var open = '<div' + idAttr + ' style="';
          // Clear, tappable sourcing for the claim — a structured {label,url}
          // source renders as a small linked chip; legacy items keep any source
          // links embedded inline in the body text. When the item carries
          // attached media (official floor/committee video with a timestamp, an X
          // post, audio), the shared evidence row leads with a "▶ Watch · 24:42" /
          // "𝕏 View post" link so the proof behind the claim is one tap away.
          var srcRow = '';
          if (typeof window._slEvidenceRow === 'function') {
            srcRow = window._slEvidenceRow(o, { stop: true });
          } else if (o.source && o.source.url) {
            srcRow = '<div style="margin-top:0.5rem;"><a href="' + window._slEsc(o.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();" ' +
              'style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);padding:0.14rem 0.5rem;border-radius:999px;">🔗 Source: ' + window._slEsc(o.source.label || 'Link') + ' ↗</a></div>';
          }
          return open + 'background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-left:3px solid rgba(' + edge + ',0.65);border-radius:0.75rem;padding:0.8rem 0.9rem;margin-bottom:0.6rem;transition:box-shadow 0.2s,border-color 0.2s;">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:rgb(' + accent + ');background:rgba(' + accent + ',0.12);border:1px solid rgba(' + accent + ',0.32);padding:0.1rem 0.45rem;border-radius:999px;">' + o.badge + '</span>' +
              (o.date ? '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;font-weight:600;letter-spacing:0.04em;color:#9a8a55;">' + o.date + '</span>' : '') +
              (o.topic ? '<button type="button" onclick="event.stopPropagation();var el=document.getElementById(\'alignment-modal-section\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});" title="See how this issue shapes ' + _slLast + '’s alignment" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.32);padding:0.08rem 0.42rem;border-radius:999px;">' + o.topic + ' ↗</button>' : '') +
              (linked ? '<span style="margin-left:auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:rgb(' + impactCol + ');background:rgba(' + impactCol + ',0.12);border:1px solid rgba(' + impactCol + ',0.4);padding:0.1rem 0.4rem;border-radius:999px;">' + impactLabel + '</span>'
                : (neutral ? '<span style="margin-left:auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:#9fb4d4;background:rgba(120,140,170,0.12);border:1px solid rgba(120,140,170,0.4);padding:0.1rem 0.4rem;border-radius:999px;">● Noted · no score impact</span>' : '')) +
            '</div>' +
            '<h4 style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.95rem;line-height:1.25;color:white;margin:0 0 ' + (o.body ? '0.35rem' : '0') + ';">' + o.headline + '</h4>' +
            (o.body ? '<p style="font-size:0.68rem;color:#c7d4e8;line-height:1.55;margin:0 0 ' + (o.why ? '0.45rem' : '0') + ';">' + o.body + '</p>' : '') +
            (o.why ? '<div style="display:flex;gap:0.4rem;font-size:0.66rem;line-height:1.5;color:#e3c97a;background:rgba(245,200,66,0.06);border-radius:0.5rem;padding:0.45rem 0.55rem;">' +
              '<span style="flex-shrink:0;">⚡</span><span><strong style="color:#f5c842;">Why it matters:</strong> ' + o.why + '</span></div>' : '') +
            srcRow +
            bridge +
            (linked ? '<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">' +
              (catLabel ? '<span style="color:#c4b5fd;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.4);padding:0.06rem 0.4rem;border-radius:999px;">' + catLabel + '</span>' : '') +
              tagChips +
              '<span style="color:#a78bfa;">🛡️ Tap to see this in the Accountability breakdown ↑</span>' +
            '</div>'
            : (tagChips ? '<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">' + tagChips + '</div>' : '')) +
            // Community engagement (like / dislike + comments) — a scoped test of
            // on-item interaction, attached to every Spotlight card by a stable id
            // derived from this official + the item's headline.
            ((typeof window._pdxSpotlightEngageHTML === 'function' && typeof window._pdxVoteTargetId === 'function')
              ? window._pdxSpotlightEngageHTML(window._pdxVoteTargetId('spotlight', id, o.headline), 'this Spotlight item')
              : '') +
          '</div>';
        }

        var _slDoc     = (p && Array.isArray(p.spotlight)) ? p.spotlight : [];
        var _slPromos  = (p && Array.isArray(p.promises)) ? p.promises : [];
        var _slPending = _slPromos.filter(function(r) { return r && r.verdict === 'pending'; });

        // 1) Score DRIVERS — the SAME ordered list the Accountability card reads
        //    from (window._slComputeDrivers), so the two sections map one-to-one
        //    by index: curator-flagged spotlight entries (impact ▲/▼) followed by
        //    the official's own kept/broken promise ledger. Each card is anchored
        //    (id = sl-driver-<id>-<i>) and taps through to the matching row in the
        //    Accountability breakdown, making cause→effect explicit.
        var slDriverItems = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
        // The medium modal shows the TOP 2–4 highlights only — a tight, skimmable
        // synthesis. The complete set lives in the full Accountability analysis.
        var slDriverMeta = [];
        var slDrivers = slDriverItems.slice(0, 4).map(function(it, i) {
          slDriverMeta.push({
            headline: it.headline, date: it.date, impact: it.impact,
            issueKey: it.issueKey, badge: it.badge,
            anchor: 'sl-driver-' + safeSlId + '-' + i
          });
          return _slCard({
            badge: it.badge,
            accent: it.kind === 'spotlight' ? '167,139,250' : '96,165,250',
            date: it.date, headline: it.headline, body: it.body, why: it.why,
            impact: it.impact, category: it.category, tags: it.tags, source: it.source,
            media: it.media, sourceType: it.sourceType, issueKey: it.issueKey,
            anchorId: 'sl-driver-' + safeSlId + '-' + i, contribIndex: i
          });
        });

        // 2) Recent NEWS / events — curated context plus any on-document entries
        //    not flagged as ▲/▼ drivers. Entries explicitly tagged impact:'neutral'
        //    are honored with a "no score impact" pill so a curator's intent reads
        //    clearly; untagged entries simply appear as news.
        //    Each card is now anchored too (id = sl-news-<id>-<i>), because the
        //    compact digest above the fold has to be able to jump to any item's
        //    full write-up — that is what makes compressing this block cost the
        //    reader no depth at all.
        var slNews = [], slNewsMeta = [];
        // The official's own documented positions, keyed by ISSUE_MAP key, so a
        // curated Spotlight item tagged with an `issueKey` can be matched against
        // a stance they actually hold — turning a news card into "expands on
        // their position on X" (the Snapshot↔Spotlight bridge built in _slCard).
        var _slPosMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(id, p) || {}) : {};
        function _slTieReady(ik) { return !!(ik && typeof window._issueLabel === 'function' && window._issueLabel(ik)); }
        function _slNewsAnchor() { return 'sl-news-' + safeSlId + '-' + slNewsMeta.length; }
        (spotlightData[id] || []).forEach(function(it) {
          var cls = _slClassifyNews(it.headline, it.facts);
          var ik = it.issueKey;
          var anc = _slNewsAnchor();
          slNewsMeta.push({ headline: it.headline, date: it.date, impact: null, issueKey: ik, badge: cls.badge, anchor: anc });
          slNews.push(_slCard({ badge: cls.badge, accent: cls.accent, date: it.date, headline: it.headline, body: it.facts, why: it.why, source: it.source,
            media: it.media, sourceType: it.sourceType, anchorId: anc,
            issueKey: ik, heldPosition: (ik && _slPosMap[ik]) ? _slPosMap[ik] : null,
            topic: _slTieReady(ik) ? '' : _slIssueTag(it.headline, it.facts) }));
        });
        _slDoc.forEach(function(it) {
          if (!it || it.impact === 'positive' || it.impact === 'negative') return;
          var _h = it.headline || it.title, _b = it.facts || it.detail;
          var _neutral = it.impact === 'neutral';
          var cls = _slClassifyNews(_h, _b);
          var ik2 = it.issueKey;
          var anc2 = _slNewsAnchor();
          slNewsMeta.push({ headline: _h, date: it.date, impact: null, issueKey: ik2, badge: it.badge || (_neutral ? 'Context' : cls.badge), anchor: anc2 });
          slNews.push(_slCard({ badge: it.badge || (_neutral ? 'Context' : cls.badge), accent: _neutral ? '120,140,170' : cls.accent, date: it.date,
            headline: _h, body: _b, why: it.why, source: it.source,
            media: it.media, sourceType: it.sourceType, anchorId: anc2,
            impact: (_neutral ? 'neutral' : undefined), category: it.category,
            issueKey: ik2, heldPosition: (ik2 && _slPosMap[ik2]) ? _slPosMap[ik2] : null,
            topic: _slTieReady(ik2) ? '' : _slIssueTag(_h, _b) }));
        });

        // Connective lead-in shown above any populated Spotlight. Frames the
        // section as THIS official's real record and names its lane, in ONE
        // sentence plus a legend. The long version this replaced ran four clauses
        // and repeated what the section title, the theme banner and the pattern
        // bar already say — three explanations of the same thing stacked above the
        // content is a large part of why this block dominated the profile.
        function _slIntro() {
          return '<p style="font-size:0.7rem;color:#9fb4d4;line-height:1.55;margin:0 0 0.7rem;">' +
            'The <em style="color:#c4b5fd;font-style:normal;">consistency &amp; character</em> lane of ' + _slLast +
            '’s record — public statements and conduct, kept separate from the 🏛️ Official Record and the ⚖️ Word vs Action score. ' +
            '<span style="color:#4ade80;font-weight:700;">▲</span>/<span style="color:#f87171;font-weight:700;">▼</span> items feed the accountability read; ' +
            '<span style="color:#c4b5fd;font-weight:700;">🔗</span> ties an item to a position ' + _slLast + ' holds.' +
          '</p>';
        }

        // Closing tie-in: a one-tap jump back up to whichever record surface this
        // modal actually mounted. The People's Mandate scorecard it used to point at
        // is retired, and the two fallbacks ahead of it — the Say-vs-Do feed, then
        // the Promise Tracker gateway — are unmounted too. Landing on the Official
        // Record first is not just tidier: a live getElementById('pdxsec-saydo')
        // check is a standing invitation for that section to come back as this
        // button's preferred destination the moment anyone re-mounts it.
        // A button that scrolls nowhere is worse than no button, so the alignment
        // modal's own section stays as the last resort.
        function _slAlignFooter() {
          return '<div style="margin-top:0.85rem;display:flex;justify-content:center;">' +
            '<button type="button" onclick="var el=document.getElementById(\'pdxsec-official-record\')||document.getElementById(\'pdxsec-wordaction\')||document.getElementById(\'alignment-modal-section\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#f3b0bd;background:rgba(192,21,42,0.12);border:1px solid rgba(192,21,42,0.42);padding:0.32rem 0.75rem;border-radius:999px;white-space:nowrap;">🧾 How these fit ' + _slLast + '’s record ↑</button>' +
          '</div>';
        }

        // Sub-header for the sourced integrity highlights below.
        // SCORING CLEANUP: this used to carry a "View Score Analysis →" button into the
        // Accountability Score deep-analysis overlay, which printed a composite N/100 —
        // a second headline competing with the formal record. The button went first, and
        // the whole model has since been deleted from the publish set: engine, overlay,
        // rating bands and badges. The highlights themselves are evidence and stay.
        function _slDriverHeader() {
          return '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin:0.2rem 0 0.6rem;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;">🛡️ Integrity &amp; consistency highlights</span>' +
            '</div>';
        }
        function _slNewsHeader() {
          return '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin:' + (slDrivers.length ? '1rem' : '0.2rem') + ' 0 0.6rem;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">📰 News, Statements &amp; Key Events</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.25);padding:0.06rem 0.4rem;border-radius:999px;">' + slNews.length + '</span>' +
            '</div>';
        }

        if (slDrivers.length || slNews.length) {
          var slThemeHtml = (typeof window._slThemeBanner === 'function') ? window._slThemeBanner(p, id) : '';
          var slPatternHtml = (typeof window._slPatternBar === 'function') ? window._slPatternBar(slDriverItems, 'full') : '';

          // ── SPOTLIGHT REAL ESTATE ──────────────────────────────────────────
          // This block used to render up to four full driver cards followed by
          // EVERY news card, in the page flow, above the money and you-and-them
          // stages. Each card carries a badge, a headline, a body paragraph, a
          // "why it matters" box, a source row, an issue bridge, chips and a
          // like/comment widget — roughly 300px apiece. On a well-documented
          // official that is several screens of Spotlight sitting on top of the
          // accountability spine, which is exactly backwards: a Spotlight item is
          // a receipt, and receipts belong under the claim they support.
          //
          // Nothing is deleted. The visible layer is now a compact digest — one
          // ~44px row per item carrying its impact glyph, headline, date, issue
          // and the same receipt chips the Connecting the Dots chain uses — and
          // every row jumps to that item's own full card, which now lives one tap
          // away in a closed drawer. Anchors, engagement widgets, sources, the
          // Accountability cross-link and the index-for-index mapping to the
          // score breakdown are all byte-identical to before; they moved, they
          // did not change. Progressive disclosure, not truncation.
          var slDigest = '';
          try {
            slDigest = (window.PDXDossier && typeof window.PDXDossier.digestHtml === 'function')
              ? (window.PDXDossier.digestHtml(id, slDriverMeta.concat(slNewsMeta), { p: p }) || '')
              : '';
          } catch (e) { slDigest = ''; }

          var slFull = '';
          if (slDrivers.length) slFull += _slDriverHeader() + slDrivers.join('');
          if (slNews.length) slFull += _slNewsHeader() + slNews.join('');

          var slTotal = slDrivers.length + slNews.length;
          var slDdId = 'sl-full-' + safeSlId;
          var slBody = slThemeHtml + slPatternHtml;
          if (slDigest) {
            // Digest present: the compact ledger leads, the full write-ups sit in
            // a labelled drawer beneath it.
            slBody += '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin:0.2rem 0 0;">🛡️ The record, most consequential first</div>' +
              slDigest +
              '<button class="dd-toggle-btn" onclick="toggleDD(\'' + slDdId + '\')" id="btn-' + slDdId + '" type="button" aria-controls="' + slDdId + '" aria-expanded="false" style="margin-top:0.6rem;">' +
                '<span style="display:flex;align-items:center;gap:0.5rem;min-width:0;">' +
                  '<span aria-hidden="true">🔦</span>' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:#dbe6f5;">Read all ' + slTotal + ' item' + (slTotal === 1 ? '' : 's') + ' in full</span>' +
                '</span>' +
                '<svg class="dd-chevron w-4 h-4" fill="none" stroke="#7596c0" viewBox="0 0 24 24" aria-hidden="true">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
              '</button>' +
              '<div class="dd-body dd-free" id="' + slDdId + '"><div class="dd-inner">' + slFull + '</div></div>';
          } else {
            // No digest renderer available (profile-dossier.js absent): fall back
            // to the full cards inline rather than losing the content.
            slBody += slFull;
          }

          return '<div class="modal-section" id="spotlight-modal-section">' + slTitle + _slIntro() + slBody +
            '<p style="font-size:0.6rem;color:#4e72a0;line-height:1.5;margin:0.5rem 0 0;text-align:center;">Issues and events tied to this official’s record. Items marked ▲/▼ feed the accountability read — tap one to open it in full, or open the full analysis. Sources linked inline.</p>' +
            _slAlignFooter() +
          '</div>';
        }

        // 3) No curated drivers or news yet — build a specific, honest read from
        //    the official's OWN record: their signature public statement, a
        //    promise in progress, documented positions, and tracked priorities.
        //    Everything here is real, politician-specific data already on the
        //    profile — no generic filler.
        var derived = [];
        function _slPush(c) { if (derived.length < 4) derived.push(_slCard(c)); }
        // Lead with the official's signature quote — a genuine public statement,
        // rendered as a pull-quote so it reads as their voice, not boilerplate.
        if (p && p.quote && String(p.quote).trim()) {
          _slPush({ badge:'🗣️ In Their Own Words', accent:'245,200,66',
            headline:'“' + String(p.quote).trim() + '”' });
        }
        if (_slPending.length) {
          _slPush({ badge:'⏳ In Progress', accent:'96,165,250', headline:_slPending[0].title, body:_slPending[0].detail,
            topic:_slIssueTag(_slPending[0].title, _slPending[0].detail) });
        }
        // Documented positions — prefer the resolved, ISSUE_MAP-keyed stance list
        // so each card carries a 🔗 issue link straight to the same position shown
        // in the Candidate Snapshot and Alignment Tool. Falls back to the raw
        // stances object (keyword-tagged) when no keyed positions are curated.
        var _slResolved = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
        var _slKeyed = _slResolved.filter(function(s) { return s && s.issueKey && (s.text || s.topic); });
        if (_slKeyed.length) {
          _slKeyed.slice(0, 2).forEach(function(s) {
            _slPush({ badge:'📌 Where They Stand', accent:'167,139,250',
              headline:(s.topic || _slHumanize(s.issueKey)), body:(s.text || ''),
              issueKey:s.issueKey });
          });
        } else if (p && p.stances && typeof p.stances === 'object') {
          Object.keys(p.stances).slice(0, 2).forEach(function(k) {
            var txt = p.stances[k];
            if (txt) _slPush({ badge:'📌 Where They Stand', accent:'167,139,250', headline:_slHumanize(k), body:txt,
              topic:_slIssueTag(k, txt) });
          });
        }
        if (derived.length < 3 && p && window._pdxKeyIssues(p).length) {
          _slPush({ badge:'🎯 Top Priorities', accent:'96,165,250',
            headline:'What ' + _slLast + ' is focused on',
            body: window._pdxKeyIssues(p).slice(0, 6).join('&nbsp;·&nbsp;') });
        }

        if (derived.length) {
          return '<div class="modal-section" id="spotlight-modal-section">' + slTitle + _slIntro() +
            (typeof window._slThemeBanner === 'function' ? window._slThemeBanner(p, id) : '') + derived.join('') +
            '<p style="font-size:0.6rem;color:#4e72a0;line-height:1.5;margin:0.5rem 0 0;text-align:center;">Drawn from ' + _slLast + '’s own statements and tracked positions. Bills, votes and news will appear here as score drivers once verified.</p>' +
            _slAlignFooter() +
          '</div>';
        }

        // 4) Genuinely nothing to highlight — clean, honest placeholder that
        //    still points the visitor to judge the official by their values now.
        //    The one-line Accountability theme still shows when one is authored.
        return '<div class="modal-section" id="spotlight-modal-section">' + slTitle +
          (typeof window._slThemeBanner === 'function' ? window._slThemeBanner(p, id) : '') +
          '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.875rem;padding:1.4rem 1rem;text-align:center;">' +
            '<div style="font-size:1.6rem;opacity:0.45;margin-bottom:0.35rem;">\u{1F526}</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.85rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fb4d4;">No Spotlight items yet for ' + _slLast + '</div>' +
            '<p style="font-size:0.62rem;color:#4e72a0;line-height:1.5;margin:0.4rem 0 0.85rem;">As this official’s record develops, notable bills, votes, and news will appear here — and any that bear on their accountability read will be tagged and linked to it. In the meantime, you can still judge ' + _slLast + ' by your own values.</p>' +
            '<button type="button" onclick="var el=document.getElementById(\'alignment-modal-section\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#f3b0bd;background:rgba(192,21,42,0.12);border:1px solid rgba(192,21,42,0.42);padding:0.32rem 0.75rem;border-radius:999px;white-space:nowrap;">💰 See the funding lens ↑</button>' +
          '</div>' +
        '</div>';
      })()}

      <!--PDXSP:dw:money-->
      <!-- Follow the Money — Campaign Finance in Modal -->
      ${(function(){
        var ftmModalData = {
          trump:    { nwBefore:'$4.5B', nwNow:'$6.5B', nwGain:'+$2.0B', pctGain:44, officeYear:2017, donors:[{name:'Timothy Mellon (Shipping)',amt:'$150M'},{name:'Miriam Adelson (Casinos)',amt:'$100M'},{name:'Elon Musk / America PAC',amt:'$97M'},{name:'Real Estate Industry',amt:'$28.7M'}], corpPct:62, smallPct:28, otherPct:10, integrity:32 },
          cox:      { nwBefore:'$1.2M', nwNow:'$2.8M', nwGain:'+$1.6M', pctGain:133, officeYear:2021, donors:[{name:'Real Estate Industry',amt:'$1.85M'},{name:'Republican Governors Assoc.',amt:'$2.1M'},{name:'Health Professionals',amt:'$890K'},{name:'Insurance Industry',amt:'$720K'}], corpPct:58, smallPct:30, otherPct:12, integrity:54 },
          lee:      { nwBefore:'$0.8M', nwNow:'$1.8M', nwGain:'+$1.0M', pctGain:125, officeYear:2011, donors:[{name:'Club for Growth',amt:'$1.2M'},{name:'Securities & Investment',amt:'$980K'},{name:'Real Estate Industry',amt:'$870K'},{name:'Oil & Gas Industry',amt:'$650K'}], corpPct:55, smallPct:32, otherPct:13, integrity:48 },
          curtis:   { nwBefore:'$2.1M', nwNow:'$3.2M', nwGain:'+$1.1M', pctGain:52, officeYear:2017, donors:[{name:'Real Estate Industry',amt:'$720K'},{name:'Health Professionals',amt:'$480K'},{name:'Oil & Gas Industry',amt:'$420K'},{name:'NRSC',amt:'$380K'}], corpPct:48, smallPct:38, otherPct:14, integrity:68 },
          massie:   { nwBefore:'$1.5M', nwNow:'$3.0M', nwGain:'+$1.5M', pctGain:100, officeYear:2012, donors:[{name:'Small Individual Donors',amt:'$1.8M'},{name:'Gun Rights Groups',amt:'$320K'},{name:'Real Estate Industry',amt:'$210K'},{name:'Farm Bureau',amt:'$180K'}], corpPct:22, smallPct:65, otherPct:13, integrity:78 },
          owens:    { nwBefore:'$3.5M', nwNow:'$4.6M', nwGain:'+$1.1M', pctGain:31, officeYear:2021, donors:[{name:'Small Individual Donors',amt:'$3.2M'},{name:'Real Estate Industry',amt:'$580K'},{name:'Securities & Investment',amt:'$420K'},{name:'Republican Main Street PAC',amt:'$350K'}], corpPct:42, smallPct:45, otherPct:13, integrity:58 },
          maloy:    { nwBefore:'$0.6M', nwNow:'$1.0M', nwGain:'+$0.4M', pctGain:67, officeYear:2023, donors:[{name:'Small Individual Donors',amt:'$980K'},{name:'GOP Committees',amt:'$520K'},{name:'Real Estate Industry',amt:'$280K'},{name:'Oil & Gas',amt:'$210K'}], corpPct:40, smallPct:42, otherPct:18, integrity:62 },
          kennedy:  { nwBefore:'$2.0M', nwNow:'$2.9M', nwGain:'+$0.9M', pctGain:45, officeYear:2013, donors:[{name:'Health Professionals',amt:'$420K'},{name:'GOP of Utah',amt:'$380K'},{name:'Real Estate Industry',amt:'$240K'},{name:'Pharma/Devices',amt:'$160K'}], corpPct:50, smallPct:35, otherPct:15, integrity:55 },
          bilzerian:{ nwBefore:'$100M', nwNow:'$30M', nwGain:'-$70M', pctGain:-70, officeYear:2026, donors:[{name:'Self-Funded',amt:'$1.2M'},{name:'Entertainment Industry',amt:'$85K'},{name:'Cannabis Industry',amt:'$62K'},{name:'Small Donors',amt:'$95K'}], corpPct:12, smallPct:8, otherPct:80, integrity:35 },
          gallrein: { nwBefore:'$1.8M', nwNow:'$2.5M', nwGain:'+$0.7M', pctGain:39, officeYear:2026, donors:[{name:'Agriculture PACs',amt:'$320K'},{name:'Restaurant Industry',amt:'$140K'},{name:'Small Donors',amt:'$180K'},{name:'GOP Committees',amt:'$210K'}], corpPct:38, smallPct:45, otherPct:17, integrity:64 }
        };
        var fd = ftmModalData[id];
        if (!fd) return '';
        var intClass = fd.integrity >= 65 ? 'ftm-integrity-high' : fd.integrity >= 45 ? 'ftm-integrity-mid' : 'ftm-integrity-low';
        var intLabel = fd.integrity >= 65 ? 'HIGH' : fd.integrity >= 45 ? 'MODERATE' : 'LOW';
        var intIcon = fd.integrity >= 65 ? '🛡️' : fd.integrity >= 45 ? '⚠️' : '🚩';
        var donorRows = fd.donors.map(function(d) {
          return '<div class="ftm-modal-donor-row">' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;color:white;letter-spacing:0.01em;">' + d.name + '</div>' +
            '</div>' +
            '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:#4ade80;letter-spacing:0.03em;">' + d.amt + '</div>' +
          '</div>';
        }).join('');
        return '<div class="modal-section">' +
          '<div class="modal-section-title">💰 Follow the Money — Campaign Finance & Net Worth</div>' +
          '<div class="ftm-modal-wrap">' +
            '<div class="ftm-modal-header">' +
              '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:0.85rem;letter-spacing:0.1em;color:#4ade80;">FINANCIAL TRANSPARENCY REPORT</span>' +
              '<div class="ftm-integrity-badge ' + intClass + '">' + intIcon + ' ' + fd.integrity + ' ' + intLabel + '</div>' +
            '</div>' +
            '<div style="padding:0.875rem;">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#9fb4d4;">Net Worth Change</div>' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;color:#4e72a0;">Since entering office (' + fd.officeYear + ')</div>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1rem;">' +
                '<div style="background:rgba(10,15,30,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:0.75rem;padding:0.6rem;text-align:center;">' +
                  '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.2rem;color:#9fb4d4;line-height:1;">' + fd.nwBefore + '</div>' +
                  '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:#4e72a0;margin-top:0.15rem;">Before Office</div>' +
                '</div>' +
                '<div style="background:rgba(10,15,30,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:0.75rem;padding:0.6rem;text-align:center;">' +
                  '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.2rem;color:white;line-height:1;">' + fd.nwNow + '</div>' +
                  '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:#4e72a0;margin-top:0.15rem;">Current</div>' +
                '</div>' +
                '<div style="background:rgba(10,15,30,0.6);border:1px solid ' + (fd.pctGain > 50 ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.15)') + ';border-radius:0.75rem;padding:0.6rem;text-align:center;">' +
                  '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.2rem;color:' + (fd.pctGain > 50 ? '#f87171' : fd.pctGain < 0 ? '#4ade80' : '#f5c842') + ';line-height:1;">' + fd.nwGain + '</div>' +
                  '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:#4e72a0;margin-top:0.15rem;">' + (fd.pctGain >= 0 ? '+' : '') + fd.pctGain + '% Change</div>' +
                '</div>' +
              '</div>' +
              '<div style="margin-bottom:1rem;">' +
                '<canvas id="ftmNwChart" style="width:100%!important;height:160px!important;"></canvas>' +
              '</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#9fb4d4;margin-bottom:0.5rem;">Top Donors & Funding Sources</div>' +
              donorRows +
              '<div style="margin-top:0.75rem;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:#9fb4d4;margin-bottom:0.4rem;">Funding Breakdown</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;color:#ff8a8a;width:5.5rem;text-align:right;">Corp/PAC ' + fd.corpPct + '%</span>' +
                  '<div style="flex:1;height:10px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;"><div class="ftm-bar-corp" style="width:' + fd.corpPct + '%;"></div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;color:#7cc4ff;width:5.5rem;text-align:right;">Small Donors ' + fd.smallPct + '%</span>' +
                  '<div style="flex:1;height:10px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;"><div class="ftm-bar-small" style="width:' + fd.smallPct + '%;"></div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;">' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;color:#c4a6ff;width:5.5rem;text-align:right;">Other ' + fd.otherPct + '%</span>' +
                  '<div style="flex:1;height:10px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;"><div style="background:linear-gradient(90deg,#c4a6ff,#a78bfa);border-radius:4px;height:10px;width:' + fd.otherPct + '%;transition:width 1s ease;"></div></div>' +
                '</div>' +
              '</div>' +
              '<div style="margin-top:0.75rem;display:flex;align-items:center;justify-content:space-between;">' +
                '<button id="ftm-follow-btn" class="ftm-follow-btn" onclick="toggleFollowMoney(\'' + id + '\')" data-pid="' + id + '">💰 Follow This Money Trail</button>' +
                '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;color:#4e72a0;letter-spacing:0.06em;">Data: FEC, OpenSecrets, public disclosures</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      })()}

      <!--PDXSP:dw:activity-->
      <!-- Activity — a compact, honest "last touched / how much is tracked"
           footer so the profile closes with a sense of freshness rather than
           trailing off. Also the scroll target for the Activity quick-jump pill. -->
      ${(function(){
        function chip(lbl, val){ return '<div class="pdx-activity-chip"><span class="lbl">' + lbl + '</span><span class="val">' + val + '</span></div>'; }
        let chips = '';
        if (_navActivityRel) chips += chip('Last updated', _navActivityRel);
        if (p.promises && p.promises.length) chips += chip('Promises tracked', p.promises.length);
        if (_navEvidenceCount) chips += chip('Evidence', _navEvidenceCount);
        if (window._pdxKeyIssues(p).length) chips += chip('Key issues', window._pdxKeyIssues(p).length);
        if (!chips) return '';
        return '<div class="modal-section" id="pdxsec-activity">' +
            '<div class="modal-section-title">🕑 Activity</div>' +
            '<div class="pdx-activity-row">' + chips + '</div>' +
          '</div>';
      })()}

      <!--PDXSP:you-->
      <!-- My Notes — private, per-visitor, and therefore part of the "you and them"
           stage rather than the record. Hidden until a signed-in visitor is
           detected (see the my-notes-section reveal below). -->
      <div class="modal-section" id="my-notes-section" style="display:none;">
        <div class="modal-section-title">📝 My Notes <span style="font-size:0.55rem;font-weight:400;color:#4e72a0;letter-spacing:0.06em;">(Private — saved to your account)</span></div>
        <textarea id="modal-my-notes" class="my-notes-area" placeholder="Write your private notes about this politician... These are saved to your account and visible only to you."></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.4rem;">
          <span id="my-notes-status" class="my-notes-save-indicator" style="color:#4ade80;opacity:0;">Saved</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:#4e72a0;">🔒 Private · Synced across devices</span>
        </div>
      </div>

    `;

    // Order the body, then mount it.
    //
    // assembleTagged() splits _profileBody on its <!--PDXSP:*--> sentinels and emits
    // the chunks in spine order, wrapping every dw:<id> chunk in one labelled,
    // closed-by-default drawer. Nothing is dropped: an unknown stage and a drawer
    // tag with no spec both fall through to the deep end. If profile-spine.js has
    // not loaded, the raw body renders exactly as it did before — the spine is an
    // ordering layer, never a prerequisite for the content.
    //
    // `defer: true` holds a drawer's inner markup back as a string and mounts it on
    // first open (PDXProfileSpine.materialize, called from toggleDD). Collapsing
    // alone never reduced mount cost: a closed .dd-body is still parsed, still
    // becomes elements, still gets styled, and on the deepest profiles the drawers
    // are most of the document — so the tap that opens a profile was paying for
    // every record nobody had asked to see. The lid, its title and its count are
    // identical either way; only the timing of the DOM changes.
    const _mc = document.getElementById('modal-content');
    const _spine = window.PDXProfileSpine;
    // A new body is about to replace the old one, so any chart still waiting on a
    // drawer from the previous profile is dead. Cleared here rather than inferred
    // from a missing canvas, which now legitimately means "not mounted yet".
    _pdxResetChartQueue();
    _mc.innerHTML = (_spine && typeof _spine.assembleTagged === 'function')
      ? _spine.assembleTagged(_profileBody, {
          // Drawer order = how deep you are going, shallowest first. Every meta
          // string is a count of what is actually inside, so a drawer never
          // promises more than it holds.
          drawers: [
            { id: 'positions', stage: 'drawers', ico: '📋', title: 'Every documented position',
              // Deferred: _renderIssueStances emits the largest single block on a
              // deeply-documented profile — every position with its own evidence
              // and sources — and it registers nothing post-render, holds no
              // canvas and publishes no id, so nothing outside it can reach in
              // before a reader asks for it.
              defer: true,
              meta: (function(){ try { var n = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []).length : 0; return n ? n + ' on file' : ''; } catch (e) { return ''; } })(),
              sub: 'Each position with its own evidence and sources. Stance at a Glance above is the index into exactly this material.' },
            { id: 'votes', stage: 'drawers', ico: '🗳️', title: 'Full voting record',
              // Deferred, and this one required a change in voting-record.js to be
              // safe: _pdxInitVotingRecord used to demand #pdx-voting-record in
              // the DOM before it would even fetch, which would have silently
              // disabled the live record for every member. It now resolves the
              // section after the fetch resolves, so a member with no record never
              // mounts this drawer at all and a member with one mounts it off the
              // opening frame instead of on it.
              defer: true,
              sub: 'Every tracked vote and formal action, with why it matters. The highlights above are drawn from this list.' },
            { id: 'promises', stage: 'drawers', ico: '🤝', title: 'Every tracked promise',
              // Deferred: the per-promise ledger plus the four-way breakdown and
              // its formula. Its ids ARE reached from outside — the hero count
              // chips call pdxFilterPromises, the nav rail has a Record pill, and
              // controversies.js jumps to pdxsec-record — so all three routes go
              // through a reveal first (see _pdxRevealTarget).
              defer: true,
              sub: 'Every tracked pledge with its own verdict and receipt, plus how each one is judged.' },
            { id: 'money', stage: 'drawers', ico: '💰', title: 'Full financial record',
              // Deferred: two Chart.js canvases and the full finance report. The
              // charts were already queued rather than drawn (a canvas in a closed
              // drawer measures zero), so they only needed the queue to tolerate a
              // canvas that does not exist yet as well as one that has no size.
              defer: true,
              sub: 'Net worth over time, campaign finance detail and donor breakdown from public disclosures.' },
            { id: 'activity', stage: 'drawers', ico: '🕑', title: 'Tracking activity',
              // NOT deferred, on purpose. It is a short freshness block — a few
              // counts and a timestamp — so there is nothing to win, and it holds
              // the pdxsec-activity anchor that the jump rail's Activity pill spies
              // on. Deferring it would trade a real feature for no measurable gain.
              sub: 'How much is on file for this profile, and when it was last updated.' }
          ]
        }) + '<div style="height:0.5rem;"></div>'
      : _profileBody;

    // Same task as the innerHTML write, before paint. hydrate() removes any jump
    // chip whose target stage did not render; doing that after paint would be a
    // visible layout shift instead of an invisible one.
    if (_spine && typeof _spine.hydrate === 'function') {
      try { _spine.hydrate(_mc); } catch (e) {}
    }

    // Related Issue Spotlight callout — a calm, light cross-link surfaced near the
    // top of the profile when this official is featured in an Issue Spotlight.
    if (typeof window._pdxRelatedSpotlight === 'function') {
      try { window._pdxRelatedSpotlight(id); } catch (e) {}
    }

    // Render wealth chart if data is available.
    //
    // The canvas is resolved when the chart is DRAWN, not when the job is queued:
    // it sits inside the deferred money drawer, so at this point it is still part
    // of a string. Capturing it here — and gating the whole job on `if (ctx)` —
    // meant the net-worth chart was queued only for profiles whose drawer happened
    // to be mounted already, i.e. never.
    if (window.__wealthChartData) {
      const wd = window.__wealthChartData;
      delete window.__wealthChartData;
      _pdxDrawerChart('wealthChart', function () { var ctx = document.getElementById('wealthChart'); if (!ctx) return; window.PDXLazy.chart().then(function () {
        if (window.__wealthChartInstance) { window.__wealthChartInstance.destroy(); }
        window.__wealthChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: wd.years,
            datasets: [{
              label: 'Net Worth ($' + wd.unit + ')',
              data: wd.values,
              borderColor: '#4ade80',
              backgroundColor: 'rgba(74,222,128,0.10)',
              pointBackgroundColor: '#4ade80',
              pointBorderColor: '#0a0f1e',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2.5,
              fill: true,
              tension: 0.35
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#9fb4d4', font: { family: "'Barlow Condensed', sans-serif", size: 12, weight: '600' }, boxWidth: 14, padding: 12 }
              },
              tooltip: {
                backgroundColor: 'rgba(10,15,30,0.95)',
                titleColor: '#fff',
                bodyColor: '#9fb4d4',
                borderColor: 'rgba(74,222,128,0.3)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                titleFont: { family: "'Barlow Condensed', sans-serif", weight: '700', size: 13 },
                bodyFont: { family: "'Barlow', sans-serif", size: 12 },
                callbacks: { label: function(c) { return ' $' + c.parsed.y.toFixed(1) + wd.unit; } }
              }
            },
            scales: {
              x: {
                ticks: { color: '#4e72a0', font: { family: "'Barlow Condensed', sans-serif", size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
                border: { color: 'rgba(255,255,255,0.08)' }
              },
              y: {
                ticks: { color: '#4e72a0', font: { family: "'Barlow Condensed', sans-serif", size: 11 }, callback: function(v) { return '$' + v + wd.unit; } },
                grid: { color: 'rgba(255,255,255,0.04)' },
                border: { color: 'rgba(255,255,255,0.08)' }
              }
            }
          }
        });
      }).catch(function () {}); });
    }

    // Render FTM net worth bar chart. Same rule as the wealth chart above — the
    // canvas is looked up at draw time, because it lives in the deferred money
    // drawer and does not exist during this pass.
    _pdxDrawerChart('ftmNwChart', function () {
      var _ftmNwCanvas = document.getElementById('ftmNwChart');
      if (!_ftmNwCanvas) return;
      if (window.__ftmNwChartInstance) { window.__ftmNwChartInstance.destroy(); }
      var _ftmNwData = {
        trump:    { labels:['Before','2019','2021','2023','Now'], values:[4.5,3.1,2.5,2.6,6.5], unit:'B' },
        cox:      { labels:['Before','2022','2023','2024','Now'], values:[1.2,1.6,2.1,2.3,2.8], unit:'M' },
        lee:      { labels:['Before','2015','2019','2023','Now'], values:[0.8,1.0,1.3,1.6,1.8], unit:'M' },
        curtis:   { labels:['Before','2019','2021','2023','Now'], values:[2.1,2.3,2.5,2.8,3.2], unit:'M' },
        massie:   { labels:['Before','2016','2020','2024','Now'], values:[1.5,1.8,2.2,2.7,3.0], unit:'M' },
        owens:    { labels:['Before','2022','2023','2024','Now'], values:[3.5,3.8,4.0,4.2,4.6], unit:'M' },
        maloy:    { labels:['Before','2023','2024','2025','Now'], values:[0.6,0.7,0.8,0.9,1.0], unit:'M' },
        kennedy:  { labels:['Before','2018','2022','2024','Now'], values:[2.0,2.2,2.4,2.6,2.9], unit:'M' },
        bilzerian:{ labels:['Before','2018','2020','2022','Now'], values:[100,80,50,40,30], unit:'M' },
        gallrein: { labels:['Before','2020','2022','2024','Now'], values:[1.8,2.0,2.1,2.3,2.5], unit:'M' }
      };
      var _ftmD = _ftmNwData[id];
      if (_ftmD) window.PDXLazy.chart().then(function () {
        window.__ftmNwChartInstance = new Chart(_ftmNwCanvas, {
          type: 'bar',
          data: {
            labels: _ftmD.labels,
            datasets: [{
              label: 'Net Worth ($' + _ftmD.unit + ')',
              data: _ftmD.values,
              backgroundColor: _ftmD.values.map(function(v, i) {
                return i === 0 ? 'rgba(159,180,212,0.4)' : i === _ftmD.values.length - 1 ? 'rgba(74,222,128,0.5)' : 'rgba(96,165,250,0.35)';
              }),
              borderColor: _ftmD.values.map(function(v, i) {
                return i === 0 ? '#9fb4d4' : i === _ftmD.values.length - 1 ? '#4ade80' : '#60a5fa';
              }),
              borderWidth: 1.5,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(10,15,30,0.95)',
                titleColor: '#fff', bodyColor: '#9fb4d4',
                borderColor: 'rgba(74,222,128,0.3)', borderWidth: 1,
                padding: 8, cornerRadius: 8,
                callbacks: { label: function(c) { return ' $' + c.parsed.y + _ftmD.unit; } }
              }
            },
            scales: {
              x: { ticks: { color: '#4e72a0', font: { family: "'Barlow Condensed', sans-serif", size: 10 } }, grid: { display: false }, border: { color: 'rgba(255,255,255,0.08)' } },
              y: { ticks: { color: '#4e72a0', font: { family: "'Barlow Condensed', sans-serif", size: 10 }, callback: function(v) { return '$' + v + _ftmD.unit; } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(255,255,255,0.08)' } }
            }
          }
        });
      }).catch(function () {});
    });

    // Follow Money Trail button state.
    //
    // The button is resolved when the answer arrives rather than up front, and the
    // answer is also recorded on _pdxFollowMoneyOn. The Firestore read is async and
    // the button lives in the deferred money drawer, so it may be absent both now
    // and when the promise settles; _pdxAfterDrawerReveal re-applies the state from
    // that flag when the drawer finally mounts. Without it, a following user opened
    // the money drawer to an un-followed button.
    window._pdxFollowMoneyOn = false;
    var _cu = auth.currentUser;
    if (_cu && !_cu.isAnonymous) {
      db.collection('followMoney').doc(_cu.uid).get().then(function(doc) {
        if (doc.exists && doc.data().politicians && doc.data().politicians.indexOf(id) !== -1) {
          window._pdxFollowMoneyOn = true;
          var _fb = document.getElementById('ftm-follow-btn');
          if (_fb) {
            _fb.classList.add('ftm-following');
            _fb.innerHTML = '✅ Following Money Trail';
          }
        }
      }).catch(function() {});
    }

    console.log('✅ openModal built content for', id);

    // FORCE modal to show — multiple methods
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.setProperty('opacity', '1', 'important');
      overlay.style.setProperty('visibility', 'visible', 'important');
    } else {
      console.error('❌ modal-overlay NOT found!');
    }

    document.getElementById('modal-body').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    // Track which profile is open (used by the top-bar Share button) and reflect
    // it in the address bar so the link can be copied or shared directly.
    window._pdxCurrentProfileId = id;
    // The canonical address for a person is the path form /p/<id>, owned by
    // person-file.js so that every entry point — this one, a share link, a
    // back-button pop — puts the same string in the bar. The ?p=<id> fallback
    // below is what shipped before it and is kept for the case where that file
    // has not loaded: a stale address is survivable, a missing one is not.
    if (window.PDXPerson && typeof window.PDXPerson.stamp === 'function') {
      window.PDXPerson.stamp(id);
      if (typeof window.PDXPerson.kicker === 'function') window.PDXPerson.kicker(id);
    } else {
      try { history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(id) + location.hash); } catch (e) {}
    }
    // Arm the quick-jump nav (smooth-scroll + scroll-spy) now that the content
    // is in the DOM and the body has been scrolled back to the top.
    if (typeof window._pdxInitProfileNav === 'function') window._pdxInitProfileNav();
    // Voting Record — lazily fetch /api/voting-record and reveal the section if
    // this member has any record (self-gating; no-ops quietly otherwise).
    if (typeof window._pdxInitVotingRecord === 'function') window._pdxInitVotingRecord();
    // Voting Record Highlights — fill the live slot from the real roll-call record
    // if it is ALREADY warm (a member opened earlier this session, or the offline
    // pack is cached). Otherwise this no-ops and the 'pdx-voting-warm' /
    // 'pdx-consistency-warm' listeners pick it up the moment the fetch above lands.
    if (typeof window._pdxHydrateVoteHighlights === 'function') window._pdxHydrateVoteHighlights();
    // Like button setup — use live data from Firestore
    const _likeBtn = document.getElementById('modal-like-btn');
    if (_likeBtn) {
      const base = _likeCounts[id] || 0;
      _likeBtn.dataset.count = base;
      _likeBtn.dataset.pid = 'modal-' + id;
      _likeBtn.querySelector('.like-count').textContent = base;
      if (_likedPids.has(id)) _likeBtn.classList.add('liked');
      else _likeBtn.classList.remove('liked');
    }
    var _modalDisBtn = document.getElementById('modal-dislike-btn');
    if (_modalDisBtn) {
      _modalDisBtn.dataset.count = _dislikeCounts[id] || 0;
      _modalDisBtn.dataset.pid = 'modal-' + id;
      _modalDisBtn.querySelector('.dislike-count').textContent = _dislikeCounts[id] || 0;
      if (_dislikedPids.has(id)) _modalDisBtn.classList.add('disliked');
      else _modalDisBtn.classList.remove('disliked');
    }

    // Favorite (heart) — point it at this politician and reflect saved state so
    // the slim footer's save control opens correctly for whoever is on screen.
    var _modalFavBtn = document.getElementById('modal-favorite-btn');
    if (_modalFavBtn) {
      _modalFavBtn.dataset.pid = 'modal-' + id;
      var _isFav = (typeof _favoritePids !== 'undefined') && _favoritePids.has(id);
      _modalFavBtn.classList.toggle('favorited', !!_isFav);
      _modalFavBtn.innerHTML = _isFav ? '❤️' : '🤍';
      _modalFavBtn.title = _isFav ? 'Remove from Favorites' : 'Save to Favorites';
    }

    // Reflect whether this politician is already on the voter's team so the
    // footer call-to-action opens in the right state with a fitting next step.
    if (typeof window.pdxSyncModalTeamBtn === 'function') window.pdxSyncModalTeamBtn(id);

    // My Notes — show for logged-in (non-anonymous) users
    var _notesSection = document.getElementById('my-notes-section');
    var _notesArea = document.getElementById('modal-my-notes');
    var _notesStatus = document.getElementById('my-notes-status');
    var _currentUser = auth.currentUser;
    if (_notesSection && _notesArea && _currentUser && !_currentUser.isAnonymous) {
      _notesSection.style.display = '';
      _notesArea.value = '';
      if (_notesStatus) { _notesStatus.style.opacity = '0'; _notesStatus.textContent = 'Saved'; }
      db.collection('userNotes').doc(_currentUser.uid).collection('politicians').doc(id).get()
        .then(function(doc) {
          if (doc.exists && doc.data().notes) {
            _notesArea.value = doc.data().notes;
          }
        }).catch(function(e) { console.warn('Notes load failed:', e); });

      if (window._myNotesDebounce) clearTimeout(window._myNotesDebounce);
      _notesArea.oninput = function() {
        if (_notesStatus) { _notesStatus.style.opacity = '1'; _notesStatus.textContent = 'Saving...'; _notesStatus.style.color = '#f5c842'; }
        if (window._myNotesDebounce) clearTimeout(window._myNotesDebounce);
        window._myNotesDebounce = setTimeout(function() {
          var u = auth.currentUser;
          if (!u || u.isAnonymous) return;
          db.collection('userNotes').doc(u.uid).collection('politicians').doc(id).set({
            notes: _notesArea.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).then(function() {
            if (_notesStatus) { _notesStatus.textContent = 'Saved'; _notesStatus.style.color = '#4ade80'; _notesStatus.style.opacity = '1'; }
            setTimeout(function() { if (_notesStatus) _notesStatus.style.opacity = '0'; }, 2000);
          }).catch(function(e) {
            console.warn('Notes save failed:', e);
            if (_notesStatus) { _notesStatus.textContent = 'Save failed'; _notesStatus.style.color = '#f87171'; _notesStatus.style.opacity = '1'; }
          });
        }, 800);
      };
    } else if (_notesSection) {
      _notesSection.style.display = 'none';
    }
  }

  function closeModal() {
    if (window.__wealthChartInstance) { window.__wealthChartInstance.destroy(); window.__wealthChartInstance = null; }
    if (window.__ftmNwChartInstance) { window.__ftmNwChartInstance.destroy(); window.__ftmNwChartInstance = null; }
    // Drop chart jobs still waiting on a drawer nobody opened. _pdxDrainCharts no
    // longer treats a missing canvas as a dead job — it cannot tell "deferred" from
    // "gone" — so the queue is emptied here, where the answer is unambiguous.
    _pdxResetChartQueue();
    // Close any open stance-evidence popover so it never lingers over the page.
    if (typeof window._pdxCloseStanceEvidence === 'function') window._pdxCloseStanceEvidence();
    window._sagCtx = null;
    // Stop the jump rail observing a subtree that is about to be thrown away.
    // There is no scroll listener to remove any more — the rail is driven by
    // IntersectionObservers, and disconnecting them is the whole teardown.
    try { _pdxNavTeardown(); } catch (e) {}
    window._pdxNavUserJumping = false;
    window._pdxNavRearmPending = false;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.removeProperty('display');
      overlay.style.setProperty('display', 'none', 'important');
      overlay.style.overscrollBehavior = 'contain';
    }
    document.body.style.overflow = '';
    // Put back the address the reader was on before the file opened. This is
    // person-file.js's job because it is the thing that changed the address in
    // the first place, and because /p/<id> — unlike the old ?p= param — is a
    // PATH, so "just drop the query string" would leave the closed person's
    // address in the bar.
    window._pdxCurrentProfileId = null;
    if (window.PDXPerson && typeof window.PDXPerson.restore === 'function') {
      window.PDXPerson.restore();
      if (typeof window.PDXPerson.kicker === 'function') window.PDXPerson.kicker(null);
    } else {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    }
    // Refresh the comment + vote counts on listing cards so anything added inside
    // the profile shows live the moment the modal closes.
    if (typeof window._pdxRefreshCommentChips === 'function') window._pdxRefreshCommentChips();
    if (typeof window._pdxRefreshVoteChips === 'function') window._pdxRefreshVoteChips();
  }


  // Charts whose canvas is inside a closed drawer. A canvas in a max-height:0
  // container measures zero, and a chart drawn into a zero-height box comes out
  // blank — Chart.js does not reliably redraw when the box is later revealed. So
  // any chart whose canvas is not laid out yet is parked here and drawn the first
  // time its drawer opens, which is also the first time anyone can see it.
  //
  // With deferred drawer inners there is a third case: the canvas does not exist
  // AT ALL yet, because the drawer holding it is still a string. That used to be
  // indistinguishable from "the profile closed", and both were dropped — so
  // deferring the money drawer would have silently thrown away the net-worth and
  // campaign-finance charts instead of drawing them late. A missing element is now
  // a reason to WAIT, and the queue is emptied explicitly at the two moments a
  // pending job really is dead: a new profile rendering, and the modal closing.
  //
  // The cost of that is a job for a canvas this profile never renders at all
  // sitting parked until close, retried with one getElementById each time a drawer
  // opens. That is deliberately preferred to asking the spine whether the id
  // exists somewhere in the deferred markup, which would mean regex-scanning every
  // stashed drawer body at mount — paying back the exact cost deferral just saved.
  var _pdxPendingCharts = [];
  function _pdxResetChartQueue() { _pdxPendingCharts = []; }
  function _pdxDrawerChart(canvasId, fn) {
    var el = document.getElementById(canvasId);
    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) { try { fn(); } catch (e) {} return; }
    _pdxPendingCharts.push({ id: canvasId, fn: fn });
  }
  function _pdxDrainCharts() {
    if (!_pdxPendingCharts.length) return;
    var keep = [];
    _pdxPendingCharts.forEach(function (job) {
      var el = document.getElementById(job.id);
      // Not mounted yet (deferred drawer) or mounted but not laid out (closed
      // drawer) — either way it is not drawable now and must not be discarded.
      if (!el || !el.offsetWidth || !el.offsetHeight) { keep.push(job); return; }
      try { job.fn(); } catch (e) {}
    });
    _pdxPendingCharts = keep;
  }

  // Called by PDXProfileSpine.materialize() immediately after the markup of a
  // deferred drawer is injected, in the same task, before the drawer is opened.
  // Everything that needs freshly mounted nodes belongs here, and nothing here may
  // assume the drawer is visible yet — the charts deliberately re-queue themselves
  // if it is not, and get drained again by toggleDD once it is.
  window._pdxAfterDrawerReveal = function (drawerId, host) {
    // Charts parked because their canvas did not exist can now find it.
    try { _pdxDrainCharts(); } catch (e) {}
    // The stored state of the Follow Money Trail button was read from Firestore
    // during the profile render, when this button was still a string. Re-apply it
    // rather than leaving a following user looking at an un-followed button.
    try {
      if (window._pdxFollowMoneyOn && host && host.querySelector) {
        var fb = host.querySelector('#ftm-follow-btn');
        if (fb) { fb.classList.add('ftm-following'); fb.innerHTML = '✅ Following Money Trail'; }
      }
    } catch (e) {}
    // The rail spies on the ids that existed when it was armed, so a pill aimed
    // inside this drawer was skipped and the anchors below it have all just moved.
    // Re-arm — coalesced, so opening three drawers in a row costs one re-arm, and
    // it runs on the next frame when the mutation has settled into layout.
    try {
      if (typeof window._pdxNavRearmSoon === 'function') window._pdxNavRearmSoon();
    } catch (e) {}
    // Receipt-card and share controls are emitted in a pending state and switched on
    // by a document-wide sweep that already ran while this content was still a
    // string. Both sweeps only touch nodes that still carry their pending attribute,
    // so running them again costs nothing and is the whole difference between a live
    // share control and a dead one inside anything mounted late.
    try {
      var RC = window.PDXReceiptCards;
      if (RC && typeof RC.hydrate === 'function') RC.hydrate(host || document);
    } catch (e) {}
    try {
      var SA = window.PDXShareAnywhere;
      if (SA && typeof SA.hydrateSoon === 'function') SA.hydrateSoon(host || document);
    } catch (e) {}
  };

  // One entry point for "make sure the element with this id is mounted". Safe to
  // call when the spine is absent or the id is already live — both are no-ops.
  window._pdxRevealTarget = function (elId) {
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.revealFor === 'function') return SP.revealFor(elId);
    } catch (e) {}
    return false;
  };

  // ── Per-profile memory of which folds the reader opened ─────────────────────
  // The coverage-gaps panel has kept this for its own toggle since it shipped, and
  // for a good reason: Word vs Action repaints itself in place when the voting
  // record warms, and a repaint that forgets is a repaint that closes the section
  // under the reader's hands mid-sentence. Every lid on the profile has exactly
  // that problem, so the memory moves down here, to the one toggle they all share.
  //
  // Keyed by profile, not just by element id — the ids are stable across people
  // ('pdxsp-lid-wa-basis' is the same string on every profile), so a global map
  // would open Massie's basis because you once opened Trump's.
  var _ddOpen = Object.create(null);
  function _ddKey(id) {
    return String(window._pdxCurrentProfileId || '') + ' ' + String(id);
  }

  // Re-open, inside `root`, every fold this reader had open on this profile.
  // Called after an in-place repaint. It only ever OPENS: a fold the reader closed
  // is already closed in the fresh markup, and re-closing it would fight a section
  // that legitimately renders something open by default.
  window._pdxRestoreDD = function (root) {
    var reopened = 0;
    try {
      var nodes = (root || document).querySelectorAll('.dd-body[id]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.classList.contains('dd-open')) continue;
        if (!_ddOpen[_ddKey(el.id)]) continue;
        toggleDD(el.id);
        reopened++;
      }
    } catch (e) {}
    return reopened;
  };

  function toggleDD(id) {
    const body = document.getElementById(id);
    const btn  = document.getElementById('btn-' + id);
    if (!body || !btn) return;
    // Where the control sits on screen right now. Everything below happens in one
    // synchronous block — materialising a deferred inner can insert real DOM above
    // this button, and a reader who taps a fold and finds the button they aimed at
    // somewhere else has lost their place in a page whose whole point is scanning.
    // Measured before materialize(), corrected after the class flip.
    const scroller = document.getElementById('modal-body');
    const beforeTop = (scroller && typeof btn.getBoundingClientRect === 'function')
      ? btn.getBoundingClientRect().top : null;

    // Mount a deferred inner BEFORE the open class goes on, so the reveal and the
    // content land in the same frame — the reader never sees an open, empty drawer
    // — and so _pdxDrainCharts below runs against a subtree that exists.
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.materialize === 'function') SP.materialize(id);
    } catch (e) {}
    const isOpen = body.classList.contains('dd-open');
    body.classList.toggle('dd-open', !isOpen);
    btn.classList.toggle('dd-active', !isOpen);
    // Keep the button's state readable to assistive tech, and draw anything that
    // was waiting for this box to have a size.
    try { btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true'); } catch (e) {}
    _ddOpen[_ddKey(id)] = !isOpen;
    if (beforeTop !== null) {
      try {
        var drift = btn.getBoundingClientRect().top - beforeTop;
        // Sub-pixel drift is layout rounding, not movement worth chasing.
        if (drift > 1 || drift < -1) scroller.scrollTop += drift;
      } catch (e) {}
    }
    if (!isOpen) _pdxDrainCharts();
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // Close the Full Stance Record overlay first if it's open, then the stance
      // evidence popover, then the share sheet, otherwise close the profile modal.
      var _rec = document.getElementById('pdx-record-overlay');
      if (_rec && _rec.style.display !== 'none') { window._pdxCloseStanceRecord(); return; }
      var _sag = document.getElementById('sag-pop-overlay');
      if (_sag && _sag.style.display !== 'none') { window._pdxCloseStanceEvidence(); return; }
      var _sh = document.getElementById('pdx-share-overlay');
      if (_sh && _sh.style.display !== 'none') { window._pdxCloseShareSheet(); return; }
      closeModal();
    }
  });

  // Deep-link support for the Full Stance Record overlay (#record/<id>): open it
  // when the hash is set (back/forward, a shared link) and close it when the hash
  // leaves. The CTA opens the overlay directly and writes this hash; this listener
  // keeps browser navigation in sync. Best-effort — never throws into the page.
  window._pdxSyncRecordHash = function () {
    try {
      var h = String(location.hash || '');
      var m = h.match(/^#record\/(.+)$/);
      var overlay = document.getElementById('pdx-record-overlay');
      if (!overlay) return;
      if (m) {
        var id = decodeURIComponent(m[1]);
        var open = !!(window._pdxRecordState && window._pdxRecordState.id === id && overlay.style.display !== 'none');
        if (!open && typeof window._pdxOpenStanceRecord === 'function') window._pdxOpenStanceRecord(id);
      } else if (overlay.style.display !== 'none') {
        window._pdxCloseStanceRecord({ keepHash: true });
      }
    } catch (e) {}
  };
  window.addEventListener('hashchange', function () { window._pdxSyncRecordHash(); });
  window.addEventListener('load', function () {
    // Defer so PROFILES / CMP_DATA are populated before a cold deep-link opens.
    try { setTimeout(function () { window._pdxSyncRecordHash(); }, 400); } catch (e) {}
  });

  // ════════════════════════════════════════════════════════════
  // SHARE — direct links to a specific politician profile
  // ════════════════════════════════════════════════════════════
  // A shared link looks like  https://<site>/p/<id>  and re-opens that
  // politician's profile modal automatically on load (PDXPerson.bootAdopt).
  // The older  ?p=<id>  form still arrives and still works — _pdxOpenFromUrl
  // has not moved — it is simply no longer the form we hand out, because the
  // path form is what canonicalPath() and the sitemap use for the same person.
  //
  // …unless the reader was looking at ONE ISSUE, in which case the sheet emits
  // https://<site>/?record=<id>~<issueKey> instead, which lands on the Official
  // Record for that issue rather than the profile shell. Both forms are built by
  // share-links.js, which is also the module that converts them back into the
  // app's own hashes on arrival.
  window._pdxShareData = null;

  function _pdxLinks() {
    try { return window.PDXShareLinks || null; } catch (e) { return null; }
  }

  // The link for a profile. Root-anchored through PDXShareLinks, because
  // location.pathname is not always '/' — the app also answers on /vote/… , and a
  // link built there carried the roll-call path along with it.
  window.pdxShareUrl = function(id) {
    var L = _pdxLinks();
    if (L && typeof L.profile === 'function') {
      var u = L.profile(id);
      if (u) return u;
    }
    return location.origin + '/p/' + encodeURIComponent(id);
  };

  // The link for whatever the reader actually had open. `issueKey` is optional and
  // is what every issue-scoped share control now passes down.
  window.pdxShareTargetUrl = function(id, issueKey) {
    var L = _pdxLinks();
    if (L && typeof L.forTarget === 'function') {
      var u = L.forTarget({ pid: id, issueKey: issueKey || '' });
      if (u) return u;
    }
    return window.pdxShareUrl(id);
  };

  window.pdxSharePolitician = function(id, ev, opts) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (!id) return;
    opts = opts || {};
    var issueKey = String(opts.issueKey || '');
    var p = (typeof PROFILES !== 'undefined' && PROFILES) ? PROFILES[id] : null;
    var name = (p && p.name) ? p.name : 'this politician';
    var office = (p && p.office) ? p.office : '';
    var issueLabel = '';
    try {
      if (issueKey && typeof ISSUE_MAP !== 'undefined' && ISSUE_MAP && ISSUE_MAP[issueKey]) {
        issueLabel = ISSUE_MAP[issueKey].label || '';
      }
    } catch (e) { issueLabel = ''; }
    var url = window.pdxShareTargetUrl(id, issueKey);
    var text = name + (office ? ' (' + office + ')' : '') +
      (issueLabel ? ' on ' + issueLabel + ' — the Official Record on PolitiDex. 🇺🇸'
                  : ' on PolitiDex — track their promises and record. 🇺🇸');
    window._pdxShareData = { id: id, issueKey: issueKey, name: name, url: url, text: text,
                             issueLabel: issueLabel };

    var overlay  = document.getElementById('pdx-share-overlay');
    var nameEl   = document.getElementById('pdx-share-name');
    var linkEl   = document.getElementById('pdx-share-link');
    var copyBtn  = document.getElementById('pdx-share-copy');
    var nativeBtn = document.getElementById('pdx-share-native');
    if (nameEl)  nameEl.textContent = name + (office ? ' · ' + office : '') +
                                      (issueLabel ? ' — ' + issueLabel : '');
    if (linkEl)  {
      linkEl.value = url;
      // The sheet says which surface the link opens, so nobody has to paste it to
      // find out. Two destinations, two accessible names.
      linkEl.setAttribute('aria-label', issueKey
        ? 'Direct link to the Official Record for ' + name + ' on ' + (issueLabel || 'this issue')
        : 'Direct link to profile');
    }
    if (copyBtn) { copyBtn.classList.remove('copied'); copyBtn.textContent = 'Copy'; }
    // The share ARTIFACT — the image, not the link. Every compact card, browse
    // row, comparison card and the profile modal header funnel into this one
    // sheet, so this is the single place that makes the Official Record card /
    // Say-vs-Do receipt reachable from all of them. PDXShareAnywhere resolves
    // which pipeline can serve this person and prints an honest hint when neither
    // can; the row is painted before the overlay is shown and its hint box has a
    // reserved height, so the sheet does not resize when the record settles.
    var artEl = document.getElementById('pdx-share-artifact');
    if (artEl) {
      var SA = window.PDXShareAnywhere;
      if (SA && typeof SA.buttonHtml === 'function') {
        artEl.innerHTML = SA.buttonHtml({ pid: id, issueKey: issueKey, block: true, hint: true,
                                          fallback: 'copy', text: 'Share the card' });
        try { SA.hydrateSoon(artEl); } catch (e) {}
      } else {
        artEl.innerHTML = '';
      }
    }
    // The native Web Share API ("More Options") is only offered where supported —
    // mostly mobile and some desktop browsers.
    if (nativeBtn) nativeBtn.style.display = (navigator.share) ? '' : 'none';
    if (overlay) overlay.style.display = 'flex';
  };

  window._pdxCloseShareSheet = function() {
    var overlay = document.getElementById('pdx-share-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  function _pdxLegacyCopy(text) {
    try {
      var inp = document.getElementById('pdx-share-link');
      if (inp) { inp.focus(); inp.select(); document.execCommand('copy'); }
    } catch (e) { console.warn('Legacy copy failed:', e); }
  }

  window._pdxCopyShareLink = function() {
    var d = window._pdxShareData; if (!d) return;
    var copyBtn = document.getElementById('pdx-share-copy');
    var done = function() {
      if (copyBtn) {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(function() { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1800);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(d.url).then(done).catch(function() { _pdxLegacyCopy(d.url); done(); });
    } else {
      _pdxLegacyCopy(d.url); done();
    }
  };

  window._pdxShareTo = function(platform) {
    var d = window._pdxShareData; if (!d) return;
    var u = encodeURIComponent(d.url);
    var t = encodeURIComponent(d.text);
    if (platform === 'native') {
      // Routed through PDXShareLinks.native so a refusal is not a silent no-op.
      // navigator.share resolves on hand-off and rejects on both "the reader
      // dismissed it" and "the platform would not open it" — and only the first of
      // those deserves silence. The second gets the link on the clipboard, which
      // is the thing the reader was trying to obtain.
      var L = _pdxLinks();
      if (L && typeof L.native === 'function') {
        L.native({ title: 'PolitiDex — ' + d.name, text: d.text, url: d.url })
          .then(function (res) {
            if (res.ok || res.outcome === 'cancelled') return;
            window._pdxCopyShareLink();
            try {
              if (typeof window._showToast === 'function') {
                window._showToast(res.outcome === 'unsupported'
                  ? 'Sharing isn’t available in this browser — link copied instead'
                  : 'Couldn’t open the share sheet — link copied instead');
              }
            } catch (e) {}
          });
        return;
      }
      if (navigator.share) {
        navigator.share({ title: 'PolitiDex — ' + d.name, text: d.text, url: d.url })
          .catch(function() { window._pdxCopyShareLink(); });
      } else {
        window._pdxCopyShareLink();
      }
      return;
    }
    var link = '';
    if (platform === 'x') link = 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u;
    else if (platform === 'facebook') link = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
    if (link) window.open(link, '_blank', 'noopener,noreferrer,width=600,height=540');
  };

  // Deep-link: open the profile named in the URL (?p=<id>) once profiles
  // have loaded. Called from _checkAndTrigger after the directory is built.
  //
  // A pid the roster does not carry — renamed, retired, mistyped, or a link
  // pasted from a much older build — used to return here in silence, leaving the
  // reader on the homepage having followed what looked like a citation. That is
  // the same silent lie the /vote/ safety net exists to remove, so it gets the
  // same answer: we could not open it, said out loud.
  window._pdxOpenFromUrl = function() {
    try {
      var pid = new URLSearchParams(location.search).get('p');
      if (!pid) return;
      if (typeof PROFILES === 'undefined' || !PROFILES || !PROFILES[pid]) {
        try {
          var L = window.PDXShareLinks;
          if (L && typeof L.notice === 'function') {
            L.notice('pdx-profile-unresolved', 'Shared profile',
              'We couldn’t open the profile that link named. Rather than quietly show ' +
              'you the front page, here’s the plain answer: “' + pid + '” isn’t someone ' +
              'we currently carry a record for.');
          }
        } catch (e2) {}
        return;
      }
      if (typeof showProfile === 'function') showProfile(pid);
    } catch (e) { console.warn('Deep-link open failed:', e); }
  };

  // ════════════════════════════════════════════════════════════
  // SCROLL ANIMATIONS
  // ════════════════════════════════════════════════════════════
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        // Each element only needs to animate in once. Stop watching it so the
        // observer isn't re-firing for hundreds of already-shown elements on
        // every scroll.
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  // Immediately show elements already in viewport
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('visible');
  });
  // Fallback: ensure all animate-on-scroll elements become visible after 1.2s
  setTimeout(() => {
    document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('visible'));
  }, 1200);

  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.progress-fill').forEach(bar => {
          const target = bar.style.width;
          bar.style.width = '0%';
          setTimeout(() => { bar.style.width = target; }, 200);
        });
        // The fill animation runs once per card; release it afterward.
        barObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.card-holo').forEach(el => barObserver.observe(el));
  
