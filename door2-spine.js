/* ═══════════════════════════════════════════════════════════════════════════
   door2-spine.js — Door 2 is ONE workspace with several views
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS STILL BROKEN AFTER THE WORKSPACE SHIPPED

   ballot-workspace.js put the whole election loop on one surface: a persistent
   rail of every seat with its pick state and a running count, one open seat
   carrying the field on the formal record, and a pick control that never leaves
   the page. That surface is correct and it is authoritative.

   It just was not the only thing on the page claiming to be Door 2. Three older
   surfaces still sat below it, each with its own heading, its own "what now?"
   stack, and — the sharp part — its own progress readout:

     · Your Ballot (#your-ballot)        every contest we track, listed
     · My Voting Team (#my-politicians)  the picks, all seats at once, with a
                                         "0 of 6 seats filled" meter of its own
     · Your finished slate (#ballot-breakdown)  the print/share view

   Every number on them was already correct. ballot-workspace.js reads the same
   window.TEAM_POSITIONS the team builder's meter counts, so "3 of 6" here has
   never been able to disagree with "3 of 6" there. That was never the defect.
   The defect was that a reader could not tell they were the same three of six.
   Two identical counters under two different headings do not read as one tool
   showing itself twice; they read as two products that happen to agree, and the
   reader is left to work out which one is keeping score.

   WHAT THIS FILE DOES

   It says which surface is the workspace and which are views of it, in the
   chrome, where the reader is:

     1. AUTHORITY. One declared answer to "which surface owns the loop"
        (AUTHORITY = 'ballot-workspace'), so nothing has to infer it.

     2. VIEW CHROME. Each of the three older surfaces gets one strip at its top:
        what it is a view OF, the job it does that the workspace does not, the
        count read FROM the workspace, and one control back to it. A view is
        then legible as a view — "the same ballot, listed" — rather than as a
        rival.

     3. ONE COUNT, ONE SOURCE. progress() reads PDXBallotWorkspace._decided()
        and _seats(). The strip prints that and nothing it computed itself, and
        when the workspace is not available it prints no count at all rather
        than a second opinion. A view may never be the thing that tells you
        where you are in the ballot.

     4. DEMOTED DUPLICATE ENTRY POINTS. The in-content CTAs that used to send a
        reader to a VIEW — "Build Your Team", "Build My Team" — are re-aimed at
        the workspace and marked as secondary. They were entry points to a
        surface that is no longer the place the work happens, and an entry point
        that lands past the tool is how a reader ends up scrolling for the thing
        they were just offered. Nav and footer links are deliberately untouched:
        those are navigation, and a reader who asks for My Voting Team by name
        should get it.

   WHAT IT REFUSES TO DO

   · IT COMPUTES NOTHING. No seat list, no pick state, no count, no order, no
     score. Every fact on every strip it writes is read from
     PDXBallotWorkspace, which reads it from the surfaces that own it. This file
     added no fourth opinion about anything, which is the only reason it can be
     added to Door 2 without becoming the fifth thing that disagrees.
   · IT DOES NOT MOVE OR MERGE A SURFACE. Nothing is deleted, nothing is
     re-parented, no section changes order. A view that a reader has bookmarked,
     linked, or learned the position of is exactly where it was; what changed is
     that it now says what it is.
   · NO PARTY, NO SCORE, NO DIRECTION MATCH. Not read, not printed. The strips
     carry a seat count and a job description.
   · IT NEVER CLAIMS COVERAGE. The strips describe what each view shows in
     coverage-bounded language — "the seats we track" — and the official-ballot
     boundary note that your-ballot.js renders is untouched and still the place
     that boundary is stated.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXDoor2) return;

  // The surface that owns the loop. Everything else in Door 2 is a view of it.
  var AUTHORITY = 'ballot-workspace';

  // The views, in the order they appear down the page. `job` is what this view
  // does that the workspace does not — the reason to scroll to it at all. If a
  // view ever has no such reason, it should be deleted rather than described.
  var VIEWS = [
    {
      id: 'your-ballot',
      label: 'Your Ballot',
      job: 'every contest we track for your districts, listed at once'
    },
    {
      id: 'my-politicians',
      label: 'My Voting Team',
      job: 'the picks you have made, side by side, with the tools to change them'
    },
    {
      id: 'ballot-breakdown',
      label: 'Your finished slate',
      job: 'the slate as one page, to print, share or check'
    }
  ];

  // In-content CTAs that used to aim at a view. Each is re-aimed at the
  // workspace and demoted. Declared explicitly rather than swept by selector:
  // an explicit list is auditable, a sweep would eventually catch a legitimate
  // "back to my team" link and quietly redirect it.
  // A re-aimed link that keeps its old wording is a small lie of its own — it
  // offers to "build your team" and delivers a seat comparison — so each entry
  // carries the wording it should have once it points at the workspace.
  var DEMOTE = [
    {
      // The homepage jump bar's chip.
      sel: 'a.pulse-chip[href="#my-politicians"]',
      label: 'Work Your Ballot',
      sub: 'One seat at a time'
    },
    {
      // The "hot topic" band's primary action.
      sel: 'a.ht-topic-btn[href="#my-politicians"]',
      label: '\u{1F5F3}\uFE0F Work My Ballot'
    },
    {
      // The closing CTA under Voter Academy. Its sibling already points at the
      // front step, so this one is the second offer, not the first.
      sel: '.va-foot a[href="#my-politicians"]',
      label: '\u{1F5F3}\uFE0F Work Your Ballot'
    }
  ];

  function fn(x) { return typeof x === 'function'; }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function workspace() {
    var W = window.PDXBallotWorkspace;
    return (W && fn(W._decided) && fn(W._seats)) ? W : null;
  }

  // ── The one count ─────────────────────────────────────────────────────────
  // Read from the workspace or not read at all. `ok:false` means the views print
  // no count, which is the correct answer to "how many seats have you decided?"
  // when the surface that knows has not loaded — better than a zero that looks
  // like a finding.
  function progress() {
    var W = workspace();
    if (!W) return { ok: false, decided: 0, total: 0 };
    try {
      var seats = W._seats() || [];
      return { ok: true, decided: W._decided(), total: seats.length };
    } catch (e) { return { ok: false, decided: 0, total: 0 }; }
  }

  // ── Back to the workspace ─────────────────────────────────────────────────
  // Scroll to it and, when a seat is named, open that seat — so "work this seat"
  // from a view lands on the seat rather than on the top of the workspace with
  // the reader to find it again.
  function toWorkspace(seatKey) {
    var host = el(AUTHORITY);
    var W = window.PDXBallotWorkspace;
    if (seatKey && W && fn(W.open)) { try { W.open(seatKey); } catch (e) {} }
    if (host && host.scrollIntoView) {
      try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { host.scrollIntoView(true); }
    }
    return false;
  }

  // ── One view's strip ──────────────────────────────────────────────────────
  function strip(view) {
    var p = progress();
    return '' +
      '<div class="d2-view-strip">' +
        '<span class="d2-view-kick">View of your ballot workspace</span>' +
        '<span class="d2-view-job">' + esc(view.job) + '</span>' +
        (p.ok
          ? '<span class="d2-view-count" title="Counted by the workspace rail, not by this view — ' +
              'one tally, one place it comes from.">' +
              p.decided + ' of ' + p.total + ' seats decided</span>'
          : '') +
        '<button type="button" class="d2-view-back"' +
          ' onclick="return window.PDXDoor2.toWorkspace();"' +
          ' title="Back to the workspace — one seat at a time, pick without leaving the page">' +
          '↑ Work the ballot</button>' +
      '</div>';
  }

  // Insert or refresh the strip at the very top of a view. Idempotent: the strip
  // carries its own id, so a re-sync replaces its contents rather than stacking
  // a second copy — which matters because two of these three views repaint
  // themselves whenever the location or a pick changes.
  function paint(view) {
    var host = el(view.id);
    if (!host) return false;
    host.setAttribute('data-door2-view', view.id);
    host.setAttribute('data-door2-of', AUTHORITY);
    var slotId = 'd2-strip-' + view.id;
    var slot = el(slotId);
    if (!slot || slot.parentNode !== host) {
      slot = document.createElement('div');
      slot.id = slotId;
      slot.className = 'd2-strip-slot';
      host.insertBefore(slot, host.firstChild);
    }
    slot.innerHTML = strip(view);
    return true;
  }

  // ── Demote the duplicate entry points ─────────────────────────────────────
  // Re-aim, do not remove. The reader asked to go build a team; they still go —
  // to the surface where building one happens. The class marks it visually
  // secondary, and data-door2-demoted is what the test reads.
  function demote() {
    DEMOTE.forEach(function (entry) {
      var nodes;
      try { nodes = document.querySelectorAll(entry.sel); } catch (e) { return; }
      Array.prototype.forEach.call(nodes, function (a) {
        if (a.getAttribute('data-door2-demoted') === '1') return;
        a.setAttribute('data-door2-demoted', '1');
        a.setAttribute('data-door2-was', a.getAttribute('href') || '');
        a.setAttribute('href', '#' + AUTHORITY);
        a.classList.add('d2-demoted');
        relabel(a, entry);
      });
    });
  }

  // Rewrite the wording in place. The two-line chips keep their structure (label
  // + value spans); a plain text button is replaced whole. Anything with a shape
  // this does not recognise is left alone rather than flattened.
  function relabel(a, entry) {
    if (!entry.label) return;
    var lab = a.querySelector('.pc-label');
    if (lab) {
      lab.textContent = entry.label;
      var val = a.querySelector('.pc-value');
      if (val && entry.sub) val.textContent = entry.sub;
      return;
    }
    if (a.children.length === 0) a.textContent = entry.label;
  }

  function sync() {
    VIEWS.forEach(paint);
    demote();
  }

  window.PDXDoor2 = {
    AUTHORITY: AUTHORITY,
    VIEWS: VIEWS,
    DEMOTE: DEMOTE,
    progress: progress,
    toWorkspace: toWorkspace,
    sync: sync,
    demote: demote,
    _strip: strip
  };

  // ── Staying in step ───────────────────────────────────────────────────────
  // Same three writers ballot-workspace.js wraps, for the same reason: a pick, a
  // location change and a race-sheet refresh are the three things that can change
  // the count these strips print. Wrapping rather than polling, and each wrapper
  // marked so a double boot cannot stack two.
  function wrap(name, flag) {
    if (!fn(window[name]) || window[name][flag]) return;
    var orig = window[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try { sync(); } catch (e) {}
      return out;
    };
    w[flag] = true;
    try { window[name] = w; } catch (e) {}
  }
  function hook() {
    wrap('ballotPickCard', '__d2Pick');
    wrap('_updateTeamPositionsForLocation', '__d2Loc');
    wrap('_pdxRaceSheetRefresh', '__d2Refresh');
  }

  function boot() {
    hook();
    sync();
    // #your-ballot is INSERTED by your-ballot.js rather than present in the
    // document, and #ballot-breakdown fills in later still, so the first pass
    // legitimately finds only some of the views. Same settle schedule the
    // workspace uses, for the same reason.
    [400, 1200, 3000].forEach(function (ms) {
      setTimeout(function () { hook(); sync(); }, ms);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
