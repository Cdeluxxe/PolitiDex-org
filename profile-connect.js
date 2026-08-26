/* ============================================================================
   profile-connect.js  ·  "Connecting the Dots" profile synthesis
   ----------------------------------------------------------------------------
   window._pdxConnectDots(id, p) -> HTML string (a self-hydrating overview card)

   WHAT THIS USED TO BE, AND WHY IT CHANGED.

   This card used to be a table of contents wearing the name "Connecting the
   Dots": five buttons — Stance at a Glance → Voting Record → Distributional
   Impact → Government Contracting → Your Stance vs Record — each with a count
   and a scroll target. Useful navigation, but it connected nothing. A reader
   tapped through five sections and did the joining themselves.

   Under the Word-vs-Action standard the card leads with the actual join, made
   for them. It is now FIVE links deep, not three, and PDXDossier owns them:

       ① THEY SAID       the documented word, quoted, tiered and sourced
       ② THEY DID        the formal actions on that same issue, NAMED
                         ("H.R. 22 · On Passage · Voted Yea")
       ③ THE RECEIPTS    what documents it — Evidence Locker depth on that issue,
                         on-record clips and citations, the promise ledger
       ④ THE ISSUE       where it lands: the issue label, and the Issue
                         Spotlights that argue it out, tappable
       ⑤ SO              the consistency outcome, in the app's shared vocabulary,
                         pointing at the ONE score it feeds

   The navigation chain underneath was rebuilt to name those SAME five links, in
   the same order, with the same words. That is the whole point: a reader used to
   meet one vocabulary in the rows and a different one in the chain two inches
   below, which is most of what made the profile read as separate features
   coexisting on a page. The three lenses that are not links in the argument
   (Distributional Impact, Government Contracting, Your Stance vs Their Record)
   were not deleted — they moved to a compact "Also on this profile" chip row,
   which is what they always were.

   Neutrality is unchanged and non-negotiable. Every row comes from
   PDXWordAction, which reads only curated word and tests it only against the
   Official Record; it invents no stances and forces no contradictions. PDXDossier
   adds links ③ and ④ by reading the same accessors the Evidence Locker and the
   Spotlight registry use, and adds no scoring of its own — this card emits no
   percentage anywhere, because there is exactly one score on a profile. Rows are
   ordered contradiction-first because a gap between word and action is the thing
   a reader came to find — not because a contradiction is the preferred finding.
   A profile with no gaps shows its agreements in exactly the same format.

   Both halves are additive and self-gating. The rows appear only once the
   voting record is warm and something is genuinely testable; chain links 3 and 4
   appear only if their section actually mounted on this profile; the chain
   heading appears only when at least two links have data; the card hides itself
   when neither half has anything to say.
   ========================================================================== */
(function () {
  'use strict';
  if (window._pdxConnectDots) return; // idempotent — never redefine

  var _seq = 0; // per-render unique id, avoids collisions across modal re-opens

  function esc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // The visitor's saved positions that overlap this official's documented ones —
  // exactly what the "Your Stance vs Their Record" block needs to render.
  function overlapCount(posMap) {
    try {
      var mine = (window.PDXStances && typeof PDXStances.all === 'function') ? PDXStances.all() : [];
      if (!mine || !mine.length) return 0;
      var keys = Object.keys(posMap || {});
      if (!keys.length) return 0;
      var have = {}; keys.forEach(function (k) { have[k] = 1; });
      var n = 0;
      mine.forEach(function (it) {
        var k = it && (it.issueKey || it.key || it.issue);
        if (k && have[k]) n++;
      });
      return n;
    } catch (e) { return 0; }
  }

  function votesCount(id, data) {
    // Mirror the voting section's own gate: it reveals only when the member has
    // records (data.summary.totalRecords / data.items). Returns 0 when nothing
    // is countable, which keeps this step in lockstep with the full section.
    try {
      var d = data || {};
      if (d.summary && typeof d.summary.totalRecords === 'number') return d.summary.totalRecords;
      if (Array.isArray(d.items)) return d.items.length;
      if (window.PDXVotingRecord && typeof PDXVotingRecord.memberRecords === 'function') {
        var rec = PDXVotingRecord.memberRecords(id);
        if (rec && rec.length) return rec.length;
      }
      var arr = d.records || d.votes || d.rollcalls || (Array.isArray(d) ? d : null);
      return arr && arr.length ? arr.length : 0;
    } catch (e) { return 0; }
  }

  // ── THE CONNECTION ─────────────────────────────────────────────────────────
  // Delegated wholesale — first to PDXDossier, which owns the five-link chain
  // (word → action → evidence → issue/spotlight → outcome), and if that module
  // has not loaded, to PDXWordAction's three-step rows underneath it. Either way
  // there is exactly one place in the app that decides what counts as word, what
  // counts as action, and what the outcome is. This function only decides what to
  // show while waiting, and what to say when the answer is "nothing testable yet".
  function dotsInner(id, p) {
    var WA = window.PDXWordAction;
    if (!WA || typeof WA.dotsHtml !== 'function') return '';
    var DO = window.PDXDossier;
    var rows = '';
    try {
      rows = (DO && typeof DO.chainHtml === 'function')
        ? (DO.chainHtml(id, p, { limit: 3 }) || '')
        : '';
    } catch (e) { rows = ''; }
    if (!rows) { try { rows = WA.dotsHtml(id, p, { limit: 3 }) || ''; } catch (e) { rows = ''; } }
    if (rows) {
      var legend = '';
      try { legend = (DO && typeof DO.legendHtml === 'function') ? DO.legendHtml() : ''; } catch (e) { legend = ''; }
      var r = null;
      try { r = WA.read(id, p); } catch (e) { r = null; }
      var more = r ? Math.max(0, r.tested.length - 3) : 0;
      return legend + rows + (more
        ? '<button type="button" class="pcd-dots-more" onclick="window._pdxNavJump && window._pdxNavJump(\'pdxsec-wordaction\', null)">' +
            'See the full Word vs Action read · ' + more + ' more tested statement' + (more === 1 ? '' : 's') +
          '</button>'
        : '');
    }
    // Not warm yet, or warm with nothing testable. Say which — a spinner that
    // never resolves and an honest empty state look identical otherwise.
    var read = null;
    try { read = WA.read(id, p); } catch (e) { read = null; }
    if (!read || !read.coverage.word) return '';
    if (read.coverage.warming || !read.coverage.tested) {
      return '<p class="pcd-dots-wait">' +
        (read.coverage.warming
          ? 'Lining up their documented word against the formal record…'
          : 'Their documented word is on file, but no formal action has landed on those issues yet — so there is nothing honest to join up here.') +
        '</p>';
    }
    return '';
  }

  // ── THE CHAIN: NAVIGATION THAT MIRRORS THE SYNTHESIS ───────────────────────
  // This used to name five unrelated features (Stance at a Glance → Voting
  // Record → Distributional Impact → Government Contracting → Your Stance vs
  // Their Record). Good navigation, but it described the PAGE rather than the
  // ARGUMENT, which is exactly what made the profile read as coexisting
  // features: the reader met one vocabulary in the joined rows and a different
  // one in the chain two inches below.
  //
  // It now names the same five links as the rows above it, in the same order,
  // with the same words — they said → they did → the receipts → the issue → so.
  // Each link points at the section that owns that link's depth. The three
  // lenses that are not part of the chain (impact, contracts, your-stance) are
  // not deleted: they move to a compact secondary chip row, which is what they
  // always were — related reading, not steps in the argument.
  //
  // `lead` is the link name (shared with PDXDossier.LINKS); `label` names the
  // feature that owns it; `desc` is a one-line, judgment-free description.
  // Steps 3 and 4 are resolved during hydration by checking whether the target
  // section actually mounted, so the chain can never offer a jump to a section
  // that is not on the page.
  function stepDefs(ctx) {
    return [
      // Step 1 points at 🌳 All Issues by Topic (stance-tree.js). The flat Stance
      // at a Glance index this step was named for is unmounted; the tree holds the
      // same documented positions, grouped by topic, with the formal record pattern
      // beside each one. `pdxsec-glance` still resolves — the tree carries that
      // anchor as an alias — but the destination is named honestly here.
      { key: 'glance', target: 'pdxsec-stancetree', accent: '#60a5fa', icon: '🗣️',
        lead: '1 · They said', label: 'All Issues by Topic',
        desc: 'Their documented positions by topic, beside what the formal record did.',
        sync: ctx.stanceN > 0, badge: ctx.stanceN ? (ctx.stanceN + ' position' + (ctx.stanceN === 1 ? '' : 's')) : '' },
      { key: 'voting', target: 'pdxsec-voting', accent: '#8b5cf6', icon: '🏛️',
        lead: '2 · They did', label: 'Voting Record & Official Acts',
        desc: 'Roll-call votes and formal acts — the only thing the score tests word against.',
        sync: null /* async: the member record */, badge: '' },
      { key: 'evidence', target: 'pdxsec-evidence', accent: '#38bdf8', icon: '🧾',
        lead: '3 · The receipts', label: 'Evidence on this profile',
        desc: 'The documents, clips and citations behind those positions and votes.',
        sync: null /* resolved by section presence */, badge: '' },
      { key: 'spotlight', target: 'spotlight-modal-section', accent: '#f5c842', icon: '🔦',
        lead: '4 · The issue', label: 'In the Spotlight',
        desc: 'Where these issues are argued out in public, and what landed on the record.',
        sync: null /* resolved by section presence */, badge: '' },
      { key: 'score', target: 'pdxsec-wordaction', accent: '#4ade80', icon: '⚖️',
        lead: '5 · So', label: 'Word vs Action',
        desc: 'Whether their formal record pointed the same way as the positions they stated — and everything that feeds it.',
        sync: ctx.canJoin === true, badge: '' }
    ];
  }

  // Related reading, not links in the chain. Compact by design: these are the
  // lenses that survived the rebuild without earning a step.
  function extraDefs(ctx) {
    return [
      { key: 'impact', target: 'pdxsec-impact', icon: '⚖️', label: 'Who it affects',
        sync: null /* async */, badge: '' },
      { key: 'contracts', target: 'pdxsec-contracts', icon: '🏛️', label: 'Contracting',
        sync: ctx.contractN > 0, badge: ctx.contractN ? String(ctx.contractN) : '' },
      { key: 'compare', target: 'pdxsec-compare', icon: '🤝', label: 'Vs. your stances',
        sync: ctx.overlapN > 0, badge: ctx.overlapN ? String(ctx.overlapN) : '' }
    ];
  }

  function stepHtml(s) {
    // Async steps start hidden and are revealed (or removed) during hydration.
    var pending = (s.sync === null);
    var hidden = pending || s.sync === false;
    return '' +
      '<button type="button" class="pcd-step' + (pending ? ' pcd-pending' : '') + '"' +
        (hidden ? ' hidden' : '') +
        ' data-pcd-step="' + s.key + '"' +
        ' style="--pcd-accent:' + s.accent + ';"' +
        ' onclick="window._pdxNavJump && window._pdxNavJump(\'' + s.target + '\', null)">' +
        '<span class="pcd-rail" aria-hidden="true"><span class="pcd-dot">' + s.icon + '</span></span>' +
        '<span class="pcd-main">' +
          '<span class="pcd-lead">' + esc(s.lead) + '</span>' +
          '<span class="pcd-label">' + esc(s.label) + '</span>' +
          '<span class="pcd-desc">' + esc(s.desc) + '</span>' +
        '</span>' +
        '<span class="pcd-meta">' +
          '<span class="pcd-badge" data-pcd-badge>' + (s.badge ? esc(s.badge) : '') + '</span>' +
          '<svg class="pcd-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
            '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</span>' +
      '</button>';
  }

  function extraHtml(s) {
    var pending = (s.sync === null);
    var hidden = pending || s.sync === false;
    return '' +
      '<button type="button" class="pcd-x' + (pending ? ' pcd-pending' : '') + '"' +
        (hidden ? ' hidden' : '') +
        ' data-pcd-step="' + s.key + '"' +
        ' onclick="window._pdxNavJump && window._pdxNavJump(\'' + s.target + '\', null)">' +
        '<span aria-hidden="true">' + s.icon + '</span>' +
        '<span class="pcd-x-l">' + esc(s.label) + '</span>' +
        '<span class="pcd-x-n" data-pcd-badge>' + (s.badge ? esc(s.badge) : '') + '</span>' +
      '</button>';
  }

  window._pdxConnectDots = function (id, p) {
    try {
      if (!p || !id) return '';

      var posMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(id, p) || {}) : {};
      var contracts = (window.PDXContracts && typeof PDXContracts.byState === 'function')
        ? (PDXContracts.byState(p.state || p.stateName || '') || []) : [];

      // Could this card ever have a word-vs-action join to show? Word is
      // synchronous, so this is knowable now even though the actions are not.
      var canJoin = false;
      try {
        canJoin = !!(window.PDXWordAction && window.PDXWordAction.read(id, p).coverage.scorable);
      } catch (e) { canJoin = false; }

      var ctx = {
        stanceN: Object.keys(posMap).length,
        contractN: contracts.length,
        overlapN: overlapCount(posMap),
        canJoin: canJoin
      };

      var steps = stepDefs(ctx);
      var extras = extraDefs(ctx);
      var syncVisible = steps.filter(function (s) { return s.sync === true; }).length;
      var asyncMaybe = steps.filter(function (s) { return s.sync === null; }).length;

      // Nothing to synthesize, nothing to join, and nothing that could load in.
      if (syncVisible === 0 && asyncMaybe === 0 && !canJoin) return '';

      var uid = (String(id) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      // Show immediately when two sync lenses already qualify; otherwise stay
      // hidden and let hydration reveal the card once ≥2 lenses are confirmed
      // or the first joined row lands.
      var startShown = syncVisible >= 2;

      var name = esc(p.name || 'this official');
      var joined = dotsInner(id, p);

      var html = '' +
        '<div class="modal-block pcd-card" data-pcd-card="' + uid + '" data-pcd-id="' + esc(String(id)) + '"' +
          (startShown ? '' : ' hidden') + '>' +
          '<div class="pcd-head">' +
            '<span class="pcd-eyebrow">Connecting the Dots</span>' +
            '<div class="pcd-title">Where ' + name + '’s word met their record</div>' +
            '<p class="pcd-summary">Every row below follows one issue through the same five links — ' +
              'what ' + name + ' said, what they formally did, the receipts that document it, ' +
              'where it lands in the issues and Spotlights, and what it means for their ' +
              '⚖️ Word vs Action score. This is that score read one issue at a time, not a ' +
              'second score: gaps come first, because that is what a record is for.</p>' +
          '</div>' +
          // The join. Filled on first paint when the record is already warm,
          // re-rendered in place when it warms later.
          '<div class="pcd-dots-wrap" data-pcd-dots="' + uid + '">' + joined + '</div>' +
          '<div class="pcd-chain-head">Follow the same five links through the profile</div>' +
          '<div class="pcd-chain">' +
            steps.map(stepHtml).join('') +
          '</div>' +
          '<div class="pcd-more" data-pcd-more>' +
            '<span class="pcd-more-k">Also on this profile</span>' +
            extras.map(extraHtml).join('') +
          '</div>' +
        '</div>';

      // Schedule hydration after the modal HTML is in the DOM.
      setTimeout(function () { hydrate(uid, id, p); }, 0);

      return html;
    } catch (e) {
      return '';
    }
  };

  function hydrate(uid, id, p) {
    var card = document.querySelector('[data-pcd-card="' + uid + '"]');
    if (!card) return;

    var pendingSettled = 0, pendingTotal = 0;
    var votingStep = card.querySelector('[data-pcd-step="voting"]');
    var impactStep = card.querySelector('[data-pcd-step="impact"]');

    function reveal(step, badgeText) {
      if (!step) return;
      step.classList.remove('pcd-pending');
      step.hidden = false;
      if (badgeText) {
        var b = step.querySelector('[data-pcd-badge]');
        if (b) b.textContent = badgeText;
      }
    }
    function drop(step) { if (step) step.remove(); }

    // ── Links 3 and 4: resolved by whether the section actually mounted ─────
    // The receipts and the issue/Spotlight links are the two that connect the
    // chain to sections rendered by other modules on their own gates. Rather
    // than duplicating those gates (and eventually disagreeing with them), the
    // chain simply asks the DOM: is that section on this page? A jump chip that
    // points at a missing anchor is the one failure mode worth designing out.
    (function resolveByPresence() {
      [
        { key: 'evidence', badge: function () {
            try {
              var n = (typeof window._pdxLockerItemCount === 'function') ? window._pdxLockerItemCount(id) : 0;
              return n ? (n + ' item' + (n === 1 ? '' : 's')) : '';
            } catch (e) { return ''; }
          } },
        { key: 'spotlight', badge: function () {
            try {
              var sps = (window.PDXSpotlight && typeof window.PDXSpotlight.forPolitician === 'function')
                ? (window.PDXSpotlight.forPolitician(id) || []) : [];
              return sps.length ? (sps.length + ' Spotlight' + (sps.length === 1 ? '' : 's')) : '';
            } catch (e) { return ''; }
          } }
      ].forEach(function (spec) {
        var step = card.querySelector('[data-pcd-step="' + spec.key + '"]');
        if (!step) return;
        var target = step.getAttribute('onclick') || '';
        var m = target.match(/_pdxNavJump\('([^']+)'/);
        var el = m ? document.getElementById(m[1]) : null;
        if (el) reveal(step, spec.badge()); else drop(step);
      });
    })();

    function settle() {
      pendingSettled++;
      if (pendingSettled < pendingTotal) return;
      finalize();
    }
    function finalize() {
      var visible = card.querySelectorAll('.pcd-step:not([hidden])').length;
      var wrap = card.querySelector('[data-pcd-dots="' + uid + '"]');
      // Either renderer counts as a join: PDXDossier's five-link rows, or
      // PDXWordAction's three-step rows when the dossier module is absent.
      var hasJoin = !!(wrap && (wrap.querySelector('.pdxdo-row') || wrap.querySelector('.pdxwa-dot')));
      // A single joined row is worth the card on its own — it IS the synthesis.
      // The two-lens floor only ever applied to the navigation chain.
      if (visible < 2 && !hasJoin) { card.hidden = true; return; }
      // …and with no chain worth showing, the chain heading would label nothing.
      var chainHead = card.querySelector('.pcd-chain-head');
      if (chainHead) chainHead.hidden = visible < 2;
      // Related reading hides itself rather than leaving a labelled empty row.
      var more = card.querySelector('[data-pcd-more]');
      if (more) more.hidden = !more.querySelector('.pcd-x:not([hidden])');
      renumberRail(card);
      card.hidden = false;
    }

    // ── The join: re-render once the voting record warms ────────────────────
    // The word side is synchronous and the action side is not, so first paint is
    // either empty or a wait line. This is what turns it into real rows.
    var refresh = function (ev) {
      var wrap = document.querySelector('[data-pcd-dots="' + uid + '"]');
      if (!wrap) { window.removeEventListener('pdx-consistency-warm', refresh); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(id)) return;
      try {
        wrap.innerHTML = dotsInner(id, p);
        finalize();
      } catch (e) {}
    };
    if (window.addEventListener) window.addEventListener('pdx-consistency-warm', refresh);

    // ── The receipts count arrives with the Evidence library ────────────────
    // The link itself is already resolved (the section either mounted or it did
    // not); this only fills in the number once the Locker index has loaded, so
    // the badge matches what the filtered Locker will actually contain.
    var evBadge = function () {
      var step = document.querySelector('[data-pcd-card="' + uid + '"] [data-pcd-step="evidence"]');
      if (!step) { window.removeEventListener('pdx-evidence-ready', evBadge); return; }
      try {
        var n = (typeof window._pdxLockerItemCount === 'function') ? window._pdxLockerItemCount(id) : 0;
        var b = step.querySelector('[data-pcd-badge]');
        if (b && n) b.textContent = n + ' item' + (n === 1 ? '' : 's');
      } catch (e) {}
    };
    if (window.addEventListener) window.addEventListener('pdx-evidence-ready', evBadge);

    // ── Voting Record: reveal when the member has a record on file ──────────
    if (votingStep) {
      pendingTotal++;
      var done = false;
      var finishVoting = function (data) {
        if (done) return; done = true;
        var n = votesCount(id, data);
        if (n > 0) {
          reveal(votingStep, n + ' on record');
        } else {
          drop(votingStep);
        }
        settle();
      };
      if (window.PDXVotingRecord && typeof PDXVotingRecord.fetchMember === 'function') {
        PDXVotingRecord.fetchMember(id).then(finishVoting, function () { finishVoting(null); });
        setTimeout(function () { finishVoting(window.PDXVotingRecord ? PDXVotingRecord.memberRecords(id) && { records: PDXVotingRecord.memberRecords(id) } : null); }, 2600);
      } else {
        drop(votingStep); settle();
      }
    }

    // ── Distributional Impact: mirror the ledger's own overview gate ────────
    // The member-overview placeholder self-reveals (display cleared) only when
    // the official has ledger-scored votes; poll for that signal.
    if (impactStep) {
      pendingTotal++;
      var tries = 0;
      var poll = function () {
        tries++;
        var ov = document.querySelector('[data-il-member-overview="' + cssEsc(String(id)) + '"]');
        var visible = ov && ov.style.display !== 'none' && ov.offsetParent !== null;
        var settledOut = ov && ov.getAttribute('data-il-done') === '1';
        if (visible) { reveal(impactStep); settle(); return; }
        if ((settledOut && !visible) || tries >= 14) { drop(impactStep); settle(); return; }
        setTimeout(poll, 200);
      };
      setTimeout(poll, 200);
    }

    if (pendingTotal === 0) finalize();
  }

  function cssEsc(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, '\\$&');
  }

  // Fade the connector so it stops at the last visible dot (kept tidy after any
  // async steps are removed).
  function renumberRail(card) {
    var steps = card.querySelectorAll('.pcd-step:not([hidden])');
    Array.prototype.forEach.call(steps, function (s, i) {
      s.classList.toggle('pcd-first', i === 0);
      s.classList.toggle('pcd-last', i === steps.length - 1);
    });
  }
})();
