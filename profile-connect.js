/* ============================================================================
   profile-connect.js  ·  "Connecting the Dots" profile synthesis
   ----------------------------------------------------------------------------
   window._pdxConnectDots(id, p) -> HTML string (a self-hydrating overview card)

   A neutral, at-a-glance spine that ties the profile's accountability features
   into one logical thread, in the order a reader would follow them:

       Stance at a Glance  →  Voting Record  →  Distributional Impact
                           →  Government Contracting  →  Your Stance vs Record

   Each step carries a live, factual signal (a count or "on record") pulled from
   the same data the full sections use, and jumps down to that section. The card
   is ADDITIVE and self-gating: steps only appear when their section has real
   data, and the whole card hides itself unless at least two lenses are present,
   so it never adds empty scaffolding to a thin profile.

   No editorializing: labels describe *what each lens shows*, never a judgment
   of the official. Counts are neutral facts. The connective sentence explains
   the method (say → do → who it affects → where money flows → how it maps to
   you), not a verdict.
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

  // Fixed logical order. `lead` is the neutral "lens" (what question it answers);
  // `label` names the feature; `desc` is a one-line, judgment-free description.
  function stepDefs(ctx) {
    return [
      { key: 'glance', target: 'pdxsec-glance', accent: '#60a5fa', icon: '🧭',
        lead: 'What they say', label: 'Stance at a Glance',
        desc: 'Their documented positions, issue by issue.',
        sync: ctx.stanceN > 0, badge: ctx.stanceN ? (ctx.stanceN + ' position' + (ctx.stanceN === 1 ? '' : 's')) : '' },
      { key: 'voting', target: 'pdxsec-voting', accent: '#8b5cf6', icon: '🗳️',
        lead: 'What they did', label: 'Voting Record',
        desc: 'Roll-call votes and official actions, checked against those stances.',
        sync: null /* async */, badge: '' },
      { key: 'impact', target: 'pdxsec-impact', accent: '#38bdf8', icon: '⚖️',
        lead: 'Who it affects', label: 'Distributional Impact',
        desc: 'Which income groups the measures they backed tend to help or cost.',
        sync: null /* async */, badge: '' },
      { key: 'contracts', target: 'pdxsec-contracts', accent: '#f5c842', icon: '🏛️',
        lead: 'Where money flows', label: 'Government Contracting',
        desc: 'Major federal contracts tied to their state.',
        sync: ctx.contractN > 0, badge: ctx.contractN ? (ctx.contractN + ' contract' + (ctx.contractN === 1 ? '' : 's')) : '' },
      { key: 'compare', target: 'pdxsec-compare', accent: '#4ade80', icon: '🤝',
        lead: 'How it maps to you', label: 'Your Stance vs Their Record',
        desc: 'Your saved positions lined up against their record.',
        sync: ctx.overlapN > 0, badge: ctx.overlapN ? ('on ' + ctx.overlapN + ' shared issue' + (ctx.overlapN === 1 ? '' : 's')) : '' }
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

  window._pdxConnectDots = function (id, p) {
    try {
      if (!p || !id) return '';

      var posMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(id, p) || {}) : {};
      var contracts = (window.PDXContracts && typeof PDXContracts.byState === 'function')
        ? (PDXContracts.byState(p.state || p.stateName || '') || []) : [];

      var ctx = {
        stanceN: Object.keys(posMap).length,
        contractN: contracts.length,
        overlapN: overlapCount(posMap)
      };

      var steps = stepDefs(ctx);
      var syncVisible = steps.filter(function (s) { return s.sync === true; }).length;
      var asyncMaybe = steps.filter(function (s) { return s.sync === null; }).length;

      // Nothing to synthesize and nothing that could load in — skip entirely.
      if (syncVisible === 0 && asyncMaybe === 0) return '';

      var uid = (String(id) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      // Show immediately when two sync lenses already qualify; otherwise stay
      // hidden and let hydration reveal the card once ≥2 lenses are confirmed.
      var startShown = syncVisible >= 2;

      var name = esc(p.name || 'this official');
      var summary = 'One thread, start to finish — from what ' + name +
        ' says, to how they vote, to who those votes affect, to where public dollars flow, ' +
        'and finally how it all lines up with your own positions.';

      var html = '' +
        '<div class="modal-block pcd-card" data-pcd-card="' + uid + '" data-pcd-id="' + esc(String(id)) + '"' +
          (startShown ? '' : ' hidden') + '>' +
          '<div class="pcd-head">' +
            '<span class="pcd-eyebrow">Connecting the Dots</span>' +
            '<div class="pcd-title">How the record fits together</div>' +
            '<p class="pcd-summary">' + summary + '</p>' +
          '</div>' +
          '<div class="pcd-chain">' +
            steps.map(stepHtml).join('') +
          '</div>' +
        '</div>';

      // Schedule hydration after the modal HTML is in the DOM.
      setTimeout(function () { hydrate(uid, id); }, 0);

      return html;
    } catch (e) {
      return '';
    }
  };

  function hydrate(uid, id) {
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

    function settle() {
      pendingSettled++;
      if (pendingSettled < pendingTotal) return;
      finalize();
    }
    function finalize() {
      var visible = card.querySelectorAll('.pcd-step:not([hidden])').length;
      if (visible < 2) { card.hidden = true; return; }
      renumberRail(card);
      card.hidden = false;
    }

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
        if (visible) { reveal(impactStep, 'who benefits'); settle(); return; }
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
