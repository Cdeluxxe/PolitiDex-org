/* ============================================================================
   Your Ballot — the unified, address-driven experience.

   PURPOSE
   -------
   PolitiDex had several overlapping ways to "get started": a Welcome/tour modal,
   a separate "Build My Home Team" pop-up that fired after you set your address,
   plus the Voter Hub and the 6-slot "My Voting Team" grid. This module folds all
   of that into ONE calm, inline flow that lives high on the page:

        set your address  →  see EVERY contest on your real ballot
        →  for each seat, weigh the candidates (Promise %, top stances,
           funding at a glance)  →  save picks to your team (auto-synced)

   It is strictly ADDITIVE. Nothing is deleted. It reuses the app's own,
   already-tested primitives rather than re-implementing them:

     • window.TEAM_POSITIONS            – the per-state slate of offices (the ballot)
     • window._ballotCandidates(key)    – candidates for a seat, filtered by address
     • window.ballotPickCard(key, pid)  – toggle a pick (handles save + team sync + toast)
     • window._ballotLoad()             – current { raceKey: pid } selections
     • window._pdxDisplayScore(d)       – honest Promise % (null when no record)
     • window._pdxStanceChips(pid,…)    – top documented stances
     • window._pdxFundingChip(pid)      – "who funds them" at a glance
     • window._pdxPartyChip(party)      – neutral party tag
     • window._getPhotoUrl / showProfile / openLocationModal
     • window._pdxBallotRecord(pid)     – read-only record accessor (added for this file)

   Because picks flow through ballotPickCard, they persist and cross-device sync
   through the exact same PDXStore / pdx-sync path as everywhere else — a pick made
   here shows up in My Voting Team, and vice-versa, with no new storage.

   NONPARTISAN BY DESIGN: candidates are ordered only by their track-record score,
   party appears solely as a neutral tag, and nothing is ranked or colored by party.
   ========================================================================== */
(function () {
  'use strict';

  var MOUNT_ID = 'your-ballot';
  var MAX_VISIBLE = 3;          // candidates shown per contest before "show all"
  var _expanded = {};           // per-contest expand state (survives pick syncs)
  var _mounted = false;
  var _retryTimer = null;

  /* ── tiny helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { return document.getElementById(id); }
  function fn(name) { return typeof window[name] === 'function' ? window[name] : null; }
  function scoreColor(s) {
    if (s === null || s === undefined) return '#9fb4d4';
    return s >= 70 ? '#4ade80' : s >= 50 ? '#f5c842' : '#f87171';
  }
  function hasLocation() { return !!window._hasUserLocation; }
  function positions() { return (window.TEAM_POSITIONS && window.TEAM_POSITIONS.length) ? window.TEAM_POSITIONS : []; }
  function candidatesFor(key) {
    var f = fn('_ballotCandidates');
    if (!f) return [];
    try { return f(key) || []; } catch (e) { return []; }
  }
  // Split a seat's field into sitting officeholder(s) vs. declared challengers,
  // using the app's own status read (window._pdxOfficeStatus), so the "Compare
  // full race" button can describe honestly WHAT the voter will line up — a
  // current officeholder against challengers, an open-seat field of candidates,
  // or (for dual seats) two sitting officeholders. Former holders are reference-
  // only and never counted as part of the live field. Mirrors the same breakdown
  // Key Races and "Relevant to Me" use, so the language stays consistent app-wide.
  function fieldBreakdown(field) {
    var holders = 0, cands = 0;
    var st = fn('_pdxOfficeStatus');
    var rd = fn('_pdxBallotRecord');
    (field || []).forEach(function (c) {
      var rec = rd ? rd(c.pid) : null;
      var s = (st && rec) ? st(rec) : 'office';
      if (s === 'candidate') cands++;
      else if (s !== 'former') holders++;
    });
    return { holders: holders, cands: cands };
  }
  function currentSelections() {
    var f = fn('_ballotLoad');
    if (!f) return {};
    try { return f() || {}; } catch (e) { return {}; }
  }
  function pickedSet() {
    var sel = currentSelections(), set = {};
    for (var k in sel) { if (sel[k]) set[sel[k]] = true; }
    return set;
  }
  function locationLine() {
    var loc = window._currentVoterLocation || {};
    var bits = [];
    if (loc.city) bits.push(loc.city);
    if (loc.county && !loc.city) bits.push(loc.county);
    if (loc.state) bits.push(loc.state);
    var where = bits.join(', ') || 'your area';
    if (loc.district) where += ' · District ' + String(loc.district).replace(/[^0-9A-Za-z\- ]/g, '');
    return where;
  }

  /* ── mount the section high on the page (before Voter Hub) ────────────── */
  function ensureMounted() {
    if (_mounted && el(MOUNT_ID)) return el(MOUNT_ID);
    var existing = el(MOUNT_ID);
    if (existing) { _mounted = true; return existing; }

    var section = document.createElement('section');
    section.id = MOUNT_ID;
    section.setAttribute('aria-label', 'Your Ballot');

    // Place it as the primary "this is for me" anchor: right before the Voter Hub
    // (which stays as the deeper explainer). Fall back to end-of-body if the hub
    // isn't present for some reason.
    var anchor = el('voter-hub');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(section, anchor);
    } else {
      document.body.appendChild(section);
    }
    _mounted = true;
    return section;
  }

  /* ── candidate card ───────────────────────────────────────────────────── */
  function candidateCard(c, posKey, picked) {
    var pid = c.pid;
    var rec = (fn('_pdxBallotRecord') ? window._pdxBallotRecord(pid) : null) || {};

    // Photo (real headshot when we have one, else a calm icon medallion).
    var photoUrl = fn('_getPhotoUrl') ? window._getPhotoUrl(pid) : '';
    var photo = photoUrl
      ? '<span class="yb-cand-photo" style="background-image:url(&quot;' + esc(photoUrl) + '&quot;)"></span>'
      : '<span class="yb-cand-photo">' + esc(c.icon || rec.icon || '🏛') + '</span>';

    // Promise % — the honest track-record read; "No record yet" when there's none.
    var sc = (c.score === undefined) ? (fn('_pdxDisplayScore') ? window._pdxDisplayScore(rec) : null) : c.score;
    var scoreHtml = (sc === null || sc === undefined)
      ? '<span class="yb-score yb-noscore" title="No promise record on file yet — nothing to score">'
          + '<b>No record yet</b></span>'
      : '<span class="yb-score" style="color:' + scoreColor(sc) + ';border-color:' + scoreColor(sc) + '66;'
          + 'background:' + scoreColor(sc) + '14;" title="Promise score — share of tracked promises kept">'
          + '<b>' + sc + '%</b><span>Promise</span></span>';

    var party = fn('_pdxPartyChip') ? window._pdxPartyChip(rec.party) : '';
    var stances = fn('_pdxStanceChips') ? window._pdxStanceChips(pid, rec, { max: 3 }) : '';
    var funding = fn('_pdxFundingChip') ? window._pdxFundingChip(pid) : '';

    var office = c.office || rec.office || '';

    var pickLabel = picked ? '✓ On my ballot' : '＋ Add to my ballot';

    return '' +
      '<div class="yb-cand' + (picked ? ' yb-picked' : '') + '" data-pid="' + esc(pid) + '" data-key="' + esc(posKey) + '">' +
        '<div class="yb-cand-top">' +
          photo +
          '<div class="yb-cand-id">' +
            '<button type="button" class="yb-cand-name" data-yb-profile="' + esc(pid) + '">' + esc(c.name || rec.name || pid) + '</button>' +
            (office ? '<div class="yb-cand-office">' + esc(office) + '</div>' : '') +
            '<div class="yb-cand-tags">' + scoreHtml + party + '</div>' +
          '</div>' +
        '</div>' +
        (stances ? '<div class="yb-stances">' + stances + '</div>' : '') +
        (funding ? '<div class="yb-glance">' + funding + '</div>' : '') +
        '<div class="yb-cand-actions">' +
          '<button type="button" class="yb-pick" data-yb-pick="' + esc(posKey) + '" data-yb-pid="' + esc(pid) + '" ' +
            'aria-pressed="' + (picked ? 'true' : 'false') + '">' + pickLabel + '</button>' +
          '<button type="button" class="yb-details" data-yb-profile="' + esc(pid) + '">Details</button>' +
        '</div>' +
      '</div>';
  }

  /* ── one contest block ────────────────────────────────────────────────── */
  function contestBlock(pos, picked) {
    var field = candidatesFor(pos.key);
    var isExpanded = !!_expanded[pos.key];
    var pickedInField = null;
    for (var i = 0; i < field.length; i++) { if (picked[field[i].pid]) { pickedInField = field[i]; break; } }

    var statusHtml = pickedInField
      ? '<div class="yb-contest-status yb-status-done">✓ Your pick: <b>' + esc(pickedInField.name) + '</b></div>'
      : (field.length
          ? '<div class="yb-contest-status yb-status-open">' + field.length + ' candidate' + (field.length === 1 ? '' : 's') + ' · not yet decided</div>'
          : '<div class="yb-contest-status yb-status-open">Being added</div>');

    var body;
    if (!field.length) {
      body = '<div class="yb-contest-empty">Candidates for this race are being researched and added. '
        + 'You can still explore officials in the <a href="#voter-hub">research library</a>.</div>';
    } else {
      var shown = isExpanded ? field : field.slice(0, MAX_VISIBLE);
      body = shown.map(function (c) { return candidateCard(c, pos.key, !!picked[c.pid]); }).join('');
      if (field.length > MAX_VISIBLE) {
        body += '<button type="button" class="yb-morebtn" data-yb-more="' + esc(pos.key) + '">' +
          (isExpanded ? '▲ Show fewer' : '▾ Show all ' + field.length + ' candidates') + '</button>';
      }
    }

    // ── "Compare full race" — pre-load the whole seat side-by-side ──────────
    // The single tap that turns Your Ballot from a per-candidate skim into a true
    // head-to-head: it stages the ENTIRE field for this seat (the sitting
    // officeholder + every 2026 challenger, exactly what candidatesFor returns)
    // into the app's existing Compare tool and opens it. Reuses window.pdxCompareField
    // — the same battle-tested "clear → stage this seat → open" path the "Relevant
    // to Me" field-compare button uses — so the saved-team comparison and all its
    // UI sync stay untouched. Only shown when there are 2+ to weigh; a lone name
    // has nothing to compare against.
    var compareBar = '';
    if (field.length >= 2) {
      var bd = fieldBreakdown(field);
      var sub;
      if (bd.holders && bd.cands) {
        sub = 'The current officeholder + ' + bd.cands + ' challenger' + (bd.cands === 1 ? '' : 's') + ', side by side';
      } else if (bd.holders && !bd.cands) {
        sub = bd.holders === 2
          ? 'Both current officeholders, side by side'
          : (bd.holders > 2
              ? 'All ' + bd.holders + ' current officeholders, side by side'
              : 'Line up everyone in this race, side by side');
      } else {
        sub = 'All ' + field.length + ' candidates for this open seat, side by side';
      }
      compareBar =
        '<button type="button" class="yb-compare-race" data-yb-compare="' + esc(pos.key) + '" ' +
          'aria-label="Compare all ' + field.length + ' running for ' + esc(pos.label || pos.key) + ' side by side">' +
          '<span class="yb-compare-ico" aria-hidden="true">⚖️</span>' +
          '<span class="yb-compare-text">' +
            '<span class="yb-compare-title">Compare full race · ' + field.length + '</span>' +
            '<span class="yb-compare-sub">' + sub + '</span>' +
          '</span>' +
          '<span class="yb-compare-go" aria-hidden="true">›</span>' +
        '</button>';
    }

    return '' +
      '<div class="yb-contest' + (pickedInField ? ' yb-decided' : '') + (field.length ? ' yb-has-cands' : '') + '" data-key="' + esc(pos.key) + '">' +
        '<div class="yb-contest-head">' +
          '<div class="yb-contest-ico">' + esc(pos.icon || '🏛') + '</div>' +
          '<div class="yb-contest-meta">' +
            '<div class="yb-contest-name">' + esc(pos.label || pos.key) + '</div>' +
            statusHtml +
          '</div>' +
        '</div>' +
        compareBar +
        '<div class="yb-cands">' + body + '</div>' +
      '</div>';
  }

  /* ── header markup (shared) ───────────────────────────────────────────── */
  function headerHtml(sub) {
    return '<div class="yb-head">' +
      '<div class="yb-eyebrow">🗳️ Made for you</div>' +
      '<h2 class="yb-title">Your <em>Ballot</em></h2>' +
      '<p class="yb-lead">' + sub + '</p>' +
      '</div>';
  }

  /* ── empty state: inline address prompt (no pop-up) ───────────────────── */
  function renderEmpty(section) {
    section.innerHTML = '<div class="yb-wrap">' +
      headerHtml('Enter your address and PolitiDex shows every contest you’ll actually vote on — with each candidate’s promise record, where they stand, and who funds them, side by side.') +
      '<div class="yb-setloc">' +
        '<div class="yb-setloc-ico">📍</div>' +
        '<div class="yb-setloc-t">See what’s on your ballot</div>' +
        '<div class="yb-setloc-s">One step, no sign-up. We match your address to your real districts — U.S. Senate &amp; House, Governor, your state legislators, and local offices.</div>' +
        '<button type="button" class="yb-btn-primary" data-yb-setloc="1">📍 Enter my address</button>' +
        '<span class="yb-setloc-note">🔒 Your address stays on your device and is only used to look up your districts. Nonpartisan by design — candidates are shown by record, never by party.</span>' +
      '</div>' +
      '</div>';
  }

  /* ── located state: the full ballot ───────────────────────────────────── */
  function renderBallot(section) {
    var pos = positions();
    var picked = pickedSet();

    // Data may still be loading (Firestore populates CMP_DATA asynchronously).
    var anyCands = false;
    for (var i = 0; i < pos.length; i++) { if (candidatesFor(pos[i].key).length) { anyCands = true; break; } }
    if (!pos.length || !anyCands) {
      section.innerHTML = '<div class="yb-wrap">' +
        headerHtml('Matching your address to your districts…') +
        '<div class="yb-loading">Loading the contests on your ballot…</div>' +
        '</div>';
      scheduleRetry();
      return;
    }

    var contestsHtml = pos.map(function (p) { return contestBlock(p, picked); }).join('');

    section.innerHTML = '<div class="yb-wrap">' +
      headerHtml('Every contest on your ballot, in one place. Weigh each candidate’s promise record, top stances, and funding — then add your pick. Everything you add saves to <b>My Voting Team</b> automatically.') +
      '<div class="yb-locbar">' +
        '<div class="yb-loc-here">📍 Showing your ballot for <b>' + esc(locationLine()) + '</b></div>' +
        '<button type="button" class="yb-loc-change" data-yb-change="1">Change location</button>' +
      '</div>' +
      '<div class="yb-progress" id="yb-progress"></div>' +
      contestsHtml +
      '<div class="yb-foot">' +
        '<span class="yb-synced">✓ Auto-saved &amp; synced to your voting team</span>' +
        '<div class="yb-foot-actions">' +
          '<a class="yb-foot-btn is-team" href="#my-politicians">⭐ Review My Voting Team</a>' +
          '<a class="yb-foot-btn is-ghost" href="#voter-hub">🔬 Explore the research library</a>' +
        '</div>' +
      '</div>' +
      '</div>';

    updateProgress();
  }

  /* ── progress meter (decidable races decided) ─────────────────────────── */
  function updateProgress() {
    var host = el('yb-progress');
    if (!host) return;
    var contests = document.querySelectorAll('#' + MOUNT_ID + ' .yb-contest.yb-has-cands');
    var total = contests.length, decided = 0;
    contests.forEach(function (c) { if (c.classList.contains('yb-decided')) decided++; });
    var pct = total ? Math.round((decided / total) * 100) : 0;
    var complete = total > 0 && decided === total;
    var hint = decided === 0 ? 'Start with any race — add your pick below'
      : (complete ? '🎉 Every race decided — nicely done' : (total - decided) + ' race' + ((total - decided) === 1 ? '' : 's') + ' to go');
    host.className = 'yb-progress' + (complete ? ' yb-complete' : '');
    host.innerHTML = '<div class="yb-progress-row">' +
      '<span class="yb-progress-lbl">You’ve decided <b>' + decided + ' of ' + total + '</b> races</span>' +
      '<span class="yb-progress-hint">' + hint + '</span>' +
      '</div>' +
      '<div class="yb-progress-track"><div class="yb-progress-fill" style="width:' + pct + '%"></div></div>';
  }

  /* ── incremental pick sync (no full rebuild → no flicker / lost scroll) ── */
  function syncPickStates() {
    if (!el(MOUNT_ID)) return;
    var picked = pickedSet();

    // Update each candidate card's pressed/picked state.
    document.querySelectorAll('#' + MOUNT_ID + ' .yb-cand').forEach(function (card) {
      var pid = card.getAttribute('data-pid');
      var on = !!picked[pid];
      card.classList.toggle('yb-picked', on);
      var btn = card.querySelector('.yb-pick');
      if (btn) {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? '✓ On my ballot' : '＋ Add to my ballot';
      }
    });

    // Update each contest's status + decided class.
    document.querySelectorAll('#' + MOUNT_ID + ' .yb-contest').forEach(function (contest) {
      var cards = contest.querySelectorAll('.yb-cand');
      var pickedCard = null;
      cards.forEach(function (c) { if (!pickedCard && c.classList.contains('yb-picked')) pickedCard = c; });
      contest.classList.toggle('yb-decided', !!pickedCard);
      var status = contest.querySelector('.yb-contest-status');
      if (status) {
        if (pickedCard) {
          var nm = pickedCard.querySelector('.yb-cand-name');
          status.className = 'yb-contest-status yb-status-done';
          status.innerHTML = '✓ Your pick: <b>' + esc(nm ? nm.textContent : '') + '</b>';
        } else if (cards.length) {
          status.className = 'yb-contest-status yb-status-open';
          status.textContent = cards.length + ' candidate' + (cards.length === 1 ? '' : 's') + ' · not yet decided';
        }
      }
    });

    updateProgress();
  }

  /* ── the top-level render dispatcher ──────────────────────────────────── */
  function render() {
    var section = ensureMounted();
    if (!section) return;
    if (hasLocation()) renderBallot(section);
    else renderEmpty(section);
  }

  function scheduleRetry() {
    // CMP_DATA / TEAM_POSITIONS arrive after the Firestore load. Poll briefly so a
    // located visitor's ballot fills in the moment the data lands, then stop.
    if (_retryTimer) return;
    var tries = 0;
    _retryTimer = setInterval(function () {
      tries++;
      if (!hasLocation()) { clearInterval(_retryTimer); _retryTimer = null; return; }
      var pos = positions(), ready = false;
      for (var i = 0; i < pos.length; i++) { if (candidatesFor(pos[i].key).length) { ready = true; break; } }
      if (ready || tries > 20) {
        clearInterval(_retryTimer); _retryTimer = null;
        if (ready) render();
      }
    }, 600);
  }

  /* ── one delegated click handler for the whole section ────────────────── */
  function onClick(e) {
    var t = e.target;
    var host = el(MOUNT_ID);
    if (!host || !host.contains(t)) return;

    var pickBtn = t.closest ? t.closest('[data-yb-pick]') : null;
    if (pickBtn) {
      var key = pickBtn.getAttribute('data-yb-pick');
      var pid = pickBtn.getAttribute('data-yb-pid');
      var f = fn('ballotPickCard');
      if (f) {
        var wasOn = pickBtn.getAttribute('aria-pressed') === 'true';
        try { f(key, pid); } catch (err) {}
        // ballotPickCard handles save + team sync + toast; we just reflect the
        // new state locally (fast, no rebuild). pdx-team-change also fires below.
        syncPickStates();
        // A brief, satisfying pulse on the card the moment a pick lands (adds only,
        // not removals) — a local confirmation on top of the app's global toast.
        if (!wasOn) {
          var card = pickBtn.closest ? pickBtn.closest('.yb-cand') : null;
          if (card) {
            card.classList.remove('yb-just-picked');
            void card.offsetWidth;
            card.classList.add('yb-just-picked');
            setTimeout(function () { card.classList.remove('yb-just-picked'); }, 700);
          }
        }
      }
      return;
    }

    var moreBtn = t.closest ? t.closest('[data-yb-more]') : null;
    if (moreBtn) {
      var mk = moreBtn.getAttribute('data-yb-more');
      _expanded[mk] = !_expanded[mk];
      render();
      var reopened = host.querySelector('.yb-contest[data-key="' + mk + '"]');
      if (reopened && reopened.scrollIntoView) reopened.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // "Compare full race" — stage this seat's entire field into the shared Compare
    // tool and open it. Read the field fresh at click time so it always reflects
    // the current, location-resolved roster. Route through the app's own
    // pdxCompareField (falling back to keyRacesCompareRace) so the existing
    // clear/stage/sync/open behavior — and the untouched saved-team comparison —
    // are reused verbatim rather than reimplemented here.
    var cmpBtn = t.closest ? t.closest('[data-yb-compare]') : null;
    if (cmpBtn) {
      var ck = cmpBtn.getAttribute('data-yb-compare');
      var pids = candidatesFor(ck).map(function (c) { return c.pid; }).filter(Boolean);
      if (pids.length < 2) return;
      var launch = fn('pdxCompareField') || fn('keyRacesCompareRace');
      if (launch) { try { launch(pids.join(',')); } catch (err) {} }
      return;
    }

    var prof = t.closest ? t.closest('[data-yb-profile]') : null;
    if (prof) {
      var ppid = prof.getAttribute('data-yb-profile');
      var sp = fn('showProfile');
      if (sp) sp(ppid);
      return;
    }

    if (t.closest && (t.closest('[data-yb-setloc]') || t.closest('[data-yb-change]'))) {
      // Route through the app's single canonical location picker. Flag the handoff
      // so closing it brings the visitor back to their freshly-filled ballot.
      window._pdxWelcomeAwaitingBallot = true;
      var open = fn('openLocationModal') || fn('toggleChangeLocation');
      if (open) open();
      return;
    }
  }

  /* ── public entry point used by consolidated onboarding handoffs ──────── */
  function enter() {
    var section = ensureMounted();
    render();
    if (!section) return;
    if (section.scrollIntoView) {
      setTimeout(function () {
        try { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { section.scrollIntoView(); }
        section.classList.remove('yb-flash');
        void section.offsetWidth;
        section.classList.add('yb-flash');
      }, 120);
    }
  }

  /* ── consolidate the old onboarding pop-ups into this inline flow ─────── */
  function installConsolidation() {
    // 1) The separate "Build My Home Team" pop-up (#pdx-hometeam-onboard-overlay)
    //    used to auto-open after a first-time voter set their address. Replace it
    //    with the inline flow: pdxMapConfirm calls this and honors a truthy return
    //    ("the next step is owned"), so no modal appears and no double-scroll fires.
    var _origOnboard = window.pdxOpenHomeTeamOnboard;
    window.pdxOpenHomeTeamOnboard = function () {
      try { enter(); return true; }
      catch (e) { return _origOnboard ? _origOnboard.apply(this, arguments) : false; }
    };

    // 2) The Start-Here banner / Welcome-modal "set location → ballot" handoff
    //    previously scrolled to the old Voter Hub. Point it at the unified flow so
    //    every entry path lands in the same place.
    var _origHandoff = window._pdxRunWelcomeBallotHandoff;
    window._pdxRunWelcomeBallotHandoff = function () {
      if (!window._pdxWelcomeAwaitingBallot) {
        if (_origHandoff) return _origHandoff.apply(this, arguments);
        return;
      }
      window._pdxWelcomeAwaitingBallot = false;
      if (!window._hasUserLocation) return;
      enter();
    };

    // 3) Re-render when the location changes anywhere in the app. Chain onto the
    //    site's central location reaction so we never miss an update.
    var _origReaction = window._triggerLocationReaction;
    window._triggerLocationReaction = function () {
      var r;
      if (_origReaction) { try { r = _origReaction.apply(this, arguments); } catch (e) {} }
      try { render(); } catch (e) {}
      return r;
    };
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    ensureMounted();
    installConsolidation();
    render();
    document.addEventListener('click', onClick);
    // Any team change (local pick, or a cross-device sync reconcile) reflects here.
    window.addEventListener('pdx-team-change', syncPickStates);
    // If located but data isn't ready yet, poll until the ballot can be built.
    if (hasLocation()) scheduleRetry();
    // Expose a small API for the consolidated handoffs / debugging.
    window.YourBallot = { render: render, enter: enter, sync: syncPickStates };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
