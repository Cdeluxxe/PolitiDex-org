/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE MANDATE LANE (the People's Mandate, at one address)
   ─────────────────────────────────────────────────────────────────────────────

   WHY THIS FILE EXISTS

   The People's Mandate was four inline <script> blocks on index.html — the vote
   handler, the card accents, the search/filter/sort hub, the quick-jump map and
   the proposals engine — sitting inside a two-megabyte document. Every reader
   of the front page parsed all of it to answer "who represents me", and every
   reader who actually wanted the Mandate had no address to bookmark.

   The room moved to /mandate (mandate.html) and the door stayed. The four
   blocks became this file so that BOTH documents run the SAME code: the lane at
   its own address, and the front page for the one hook it still needs — a
   person overlay's "related proposals" section, which calls
   window._pdxLoadRelatedProposals. A copy on each document would be two owners
   of one tally, which is exactly the drift the address was created to end.

   WHAT IS HERE, IN THE ORDER IT WAS INLINE

   THESE FIVE BLOCKS WERE MOVED OUT OF index.html, NOT COPIED FROM IT, and the
   line numbers they came from are deliberately not recorded: the origin no
   longer contains them, so a range here would be a citation of bytes that do not
   exist and the next reader would spend an afternoon finding that out. There is
   one copy of each of these functions in the repo and
   scripts/test-mandate-shell.mjs asserts exactly that — zero occurrences on
   index.html, one occurrence here — which is a check a stale line number could
   never have been.

     1  VOTE + CARD ACCENTS   handleAgendaVote / _loadAgendaVotes /
                              _updateMandateVoteTotal, and the per-card accent
                              pass.
     2  SUBMIT MODAL          openAgendaComment, openAgendaSubmit /
                              closeAgendaSubmit, the politician picker,
                              submitAgendaIdea — with the two null guards noted
                              at the site.
     3  PROPOSALS ENGINE      /api/mandate-proposals: list, submit, support,
                              related-by-politician.
     4  REFORM HUB            filterAgenda / clearRhSearch / resetAgendaFilters.
     5  QUICK-JUMP NAV        the sticky pill bar and its scroll-spy.

   WHAT DID NOT COME WITH IT, and both are deliberate:

     · _syncTrendingSlides STAYED ON index.html. It paints the front page's
       trending carousel (.tr-slide[data-agenda-id]) by reading the same
       `votes` documents this lane writes. It is a homepage surface that happens
       to read a Mandate number, not a piece of the Mandate.
     · THE SUPPORT WALL IS NOT RESTATED HERE. support-lane.js owns the
       vocabulary, the palette and the NEVER_FEEDS list; section 3 borrows them
       through window.PDXSupportLane and invents no word of its own. A count
       here is momentum, never a vote, never evidence, and it feeds no score.

   EVERY SURFACE THIS FILE PAINTS IS GUARDED ON ITS MOUNT. On index.html the
   lane markup is gone — only the door card is left — so §§1, 4 and 5 find no
   #agenda-grid and no #mandate-jump and return without painting, and §3's
   render() finds no #pp-grid. That is the courts.html contract: a module whose
   section markup is absent no-ops.

   node scripts/test-mandate-shell.mjs holds this file's boundaries.
   ───────────────────────────────────────────────────────────────────────────── */

  // ══ 1 · VOTE + CARD ACCENTS ═══════════ moved out of index.html ═══════════

  // ════════════════════════════════════════════════════════
  // THE PEOPLE'S AGENDA — VOTE + MODAL HANDLERS
  // ════════════════════════════════════════════════════════
  const _agendaVoted = JSON.parse(localStorage.getItem('pdx_agenda_voted') || '{}');

  // Sum every live up/down vote count currently shown on the agenda cards and
  // write the honest total into the "Total Votes Cast" stat. Called after each
  // Firestore snapshot so the figure reflects real data, never a hardcoded one.
  function _updateMandateVoteTotal() {
    var el = document.getElementById('rh-total-votes');
    if (!el) return;
    var total = 0;
    document.querySelectorAll('#agenda-grid .vote-count').forEach(function(span) {
      var n = parseInt(span.textContent, 10);
      if (!isNaN(n)) total += n;
    });
    el.textContent = total.toLocaleString();
  }

  function _loadAgendaVotes() {
    var upBtns = document.querySelectorAll('.agenda-vote-up');
    var pending = 0;
    upBtns.forEach(function(upBtn) {
      var match = upBtn.getAttribute('onclick').match(/handleAgendaVote\(this,'([^']+)'/);
      if (!match) return;
      var pid = match[1];
      pending++;
      // One-time read instead of a persistent per-card onSnapshot listener.
      // Each agenda card previously opened its own real-time Firestore listener
      // that stayed open for the life of the page and re-scanned the whole grid
      // on every change — dozens of live listeners and O(n^2) total recomputes
      // on load. The user's own vote is already reflected optimistically in
      // handleAgendaVote, so a single get() per card is all that's needed.
      db.collection('votes').doc(pid).get().then(function(doc) {
        if (!doc.exists) return;
        var data = doc.data();
        var card = upBtn.closest('.card-holo');
        if (!card) return;
        var dBtn = card.querySelector('.agenda-vote-down');
        if (typeof data.likes === 'number') { var lv = Math.max(0, data.likes); upBtn.dataset.count = lv; upBtn.querySelector('.vote-count').textContent = lv; }
        if (dBtn && typeof data.dislikes === 'number') { var dv = Math.max(0, data.dislikes); dBtn.dataset.count = dv; dBtn.querySelector('.vote-count').textContent = dv; }
      }, function(e) { console.warn("agenda votes read error:", e); }).then(function() {
        // Recompute the "Total Votes Cast" figure once, after the last card
        // resolves — not once per card.
        if (--pending <= 0) _updateMandateVoteTotal();
      });
    });
    Object.keys(_agendaVoted).forEach(function(pid) {
      var dir = _agendaVoted[pid]; if (!dir) return;
      var sel = dir === 'up' ? '.agenda-vote-up' : '.agenda-vote-down';
      document.querySelectorAll(sel).forEach(function(btn) {
        if (btn.getAttribute('onclick').indexOf(pid) !== -1) {
          btn.style.background = dir === 'up' ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)';
          btn.style.borderColor = dir === 'up' ? 'rgba(74,222,128,0.6)' : 'rgba(248,113,113,0.6)';
        }
      });
    });
  }

  function handleAgendaVote(btn, pid, dir) {
    const card  = btn.closest('.card-holo');
    const upBtn   = card.querySelector('.agenda-vote-up');
    const downBtn = card.querySelector('.agenda-vote-down');
    const prev    = _agendaVoted[pid];
    var upDelta = 0, downDelta = 0;

    if (prev === dir) {
      _agendaVoted[pid] = null;
      const count = parseInt(btn.dataset.count);
      btn.dataset.count = count - 1;
      btn.querySelector('.vote-count').textContent = count - 1;
      btn.style.background = '';
      btn.style.borderColor = '';
      if (dir === 'up') upDelta = -1; else downDelta = -1;
    } else {
      if (prev && prev !== dir) {
        const oppBtn = dir === 'up' ? downBtn : upBtn;
        const oppCount = parseInt(oppBtn.dataset.count);
        oppBtn.dataset.count = oppCount - 1;
        oppBtn.querySelector('.vote-count').textContent = oppCount - 1;
        oppBtn.style.background = '';
        oppBtn.style.borderColor = '';
        if (prev === 'up') upDelta = -1; else downDelta = -1;
      }
      _agendaVoted[pid] = dir;
      const count = parseInt(btn.dataset.count);
      btn.dataset.count = count + 1;
      btn.querySelector('.vote-count').textContent = count + 1;
      if (dir === 'up') { btn.style.background = 'rgba(74,222,128,0.18)'; btn.style.borderColor = 'rgba(74,222,128,0.6)'; upDelta += 1; }
      else { btn.style.background = 'rgba(248,113,113,0.18)'; btn.style.borderColor = 'rgba(248,113,113,0.6)'; downDelta += 1; }
    }

    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 200);

    if (typeof _updateMandateVoteTotal === 'function') _updateMandateVoteTotal();
    localStorage.setItem('pdx_agenda_voted', JSON.stringify(_agendaVoted));
    var update = { updated: firebase.firestore.FieldValue.serverTimestamp() };
    if (upDelta !== 0) update.likes = firebase.firestore.FieldValue.increment(upDelta);
    if (downDelta !== 0) update.dislikes = firebase.firestore.FieldValue.increment(downDelta);
    _fbAuthReady.then(function() {
      db.collection('votes').doc(pid).set(update, { merge: true }).catch(function(e) { console.warn("agenda vote write error:", e); });
    });
    // The Firestore write above is the whole of it. A mirror POST to /api/votes
    // used to sit here; no Function was ever routed at that path, so it 404'd on
    // every agenda tap. Removed rather than repointed — the agenda tally has one
    // store, and the formal record lives at /api/voting-record where nothing in
    // this handler belongs.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _loadAgendaVotes);
  else setTimeout(_loadAgendaVotes, 100);

  (function _initMandateCardAccents() {
    function applyAccents() {
      document.querySelectorAll('#agenda-grid .agenda-card').forEach(function(card) {
        var headerBg = card.querySelector('[style*="background:rgba"]');
        if (!headerBg) return;
        var s = headerBg.getAttribute('style') || '';
        var m = s.match(/rgba\((\d+),(\d+),(\d+)/);
        if (m) {
          var r = m[1], g = m[2], b = m[3];
          card.style.setProperty('--card-accent', 'rgb('+r+','+g+','+b+')');
          card.style.setProperty('--card-glow', 'rgba('+r+','+g+','+b+',0.1)');
          card.style.setProperty('--card-icon-bg', 'rgba('+r+','+g+','+b+',0.12)');
          card.style.setProperty('--card-icon-border', 'rgba('+r+','+g+','+b+',0.25)');
        }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAccents);
    else setTimeout(applyAccents, 50);
  })();

  // ── THE DISCUSS CONTROL ONLY EXISTS WHERE THE THREAD DOES ──────────────
  // Every reform card carries a Comment button, and the thread behind it is
  // like-dislike.js's #comment-overlay — which pulls the evidence-submission
  // modal in behind it, because a comment can attach a receipt. That is the
  // front page's surface and the whole chain of it did not come to /mandate:
  // the address exists to stop a reader paying for the front page, and three
  // more modals to reach a thread is the front page.
  //
  // So on a document WITHOUT the thread the control is not painted. A button
  // that opens nothing is worse than a button that is not there, and the
  // discussion has not moved — it is exactly where it was, on /, reachable
  // from the Mandate card. This runs once, finds nothing to do on index.html
  // (which still has the overlay), and is the one thing in this file that
  // behaves differently per document.
  (function _gateMandateDiscuss() {
    function gate() {
      if (document.getElementById('comment-overlay')) return;
      var btns = document.querySelectorAll('[onclick^="openAgendaComment"]');
      for (var i = 0; i < btns.length; i++) { btns[i].hidden = true; }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gate);
    else setTimeout(gate, 0);
  })();

  // ══ 2 · SUBMIT MODAL ══════════════ moved out of index.html ══════════════

  // THE ONE GUARD THIS FILE ADDED TO THE COPY. The comment thread is
  // like-dislike.js's surface and it needs #comment-overlay in the document.
  // Both documents that load this file carry it, but a shell that one day does
  // not must get a no-op rather than a TypeError out of a card's Discuss
  // button. Nothing about the homepage's behaviour changes: there the label and
  // the opener are both present, so this takes the same path it always did.
  function openAgendaComment(topic) {
    var label = document.getElementById('comment-politician-label');
    if (!label || typeof _showCommentModal !== 'function') return;
    _currentCommentPolitician = 'agenda';
    label.textContent = "The People's Mandate · " + topic;
    _showCommentModal();
  }

  function openAgendaSubmit() {
    const overlay = document.getElementById('agenda-submit-overlay');
    document.getElementById('agenda-form-wrap').classList.remove('hidden');
    document.getElementById('agenda-success').classList.add('hidden');
    document.getElementById('agenda-footer').classList.remove('hidden');
    ['af-title','af-desc','af-source','af-name'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    // Reset the optional politician picker to an empty selection.
    _afLinkedIds = [];
    const _ls = document.getElementById('af-link-search'); if (_ls) _ls.value = '';
    const _lr = document.getElementById('af-link-results'); if (_lr) { _lr.style.display = 'none'; _lr.innerHTML = ''; }
    if (typeof _afRenderSelected === 'function') _afRenderSelected();
    document.getElementById('af-error').classList.add('hidden');
    document.getElementById('af-btn-label').textContent = 'Submit Idea →';
    document.getElementById('af-submit-btn').disabled = false;
    document.getElementById('af-submit-btn').style.opacity = '1';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.22s ease';
      overlay.style.opacity = '1';
    }));
  }

  function closeAgendaSubmit() {
    const overlay = document.getElementById('agenda-submit-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      // AND THE SECOND GUARD, for the same reason: #modal-overlay is the front
      // page's profile overlay and does not exist at /mandate, so the two reads
      // below became optional. The question they answer is unchanged — do not
      // give the body its scroll back while another full-screen surface is
      // still up — and a surface that is not on the document is not up.
      var _mo = document.getElementById('modal-overlay');
      var _co = document.getElementById('comment-overlay');
      if ((!_mo || _mo.style.display === 'none') &&
          (!_co || _co.style.display === 'none')) {
        document.body.style.overflow = '';
      }
    }, 220);
  }

  // ── Submit-modal politician picker ────────────────────────────────────────
  // Lets a submitter optionally tie their reform to one or more politicians. The
  // searchable roster is the same lightweight index the rest of the page uses
  // (window.PROFILES, keyed by the exact id openModal() expects), so a linked
  // chip is guaranteed to resolve to a real profile. Selection is kept in
  // _afLinkedIds and read back in submitAgendaIdea().
  var _afLinkedIds = [];
  // Mirror the server's MAX_LINKS cap so the picker never lets a submitter build
  // a selection the API would trim.
  var _AF_MAX_LINKS = 12;

  function _afEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Resolve a politician id to a display name from the loaded roster. Falls back
  // to the id itself so a chip is never blank even before the index has loaded.
  window._pdxPoliticianName = function (id) {
    var p = (window.PROFILES && window.PROFILES[id]) || null;
    return (p && p.name) ? p.name : id;
  };

  // Flatten window.PROFILES into a light, searchable [{id,name,office,state}] list.
  function _afPoliticianList() {
    var out = [];
    var P = window.PROFILES || {};
    for (var id in P) {
      if (!Object.prototype.hasOwnProperty.call(P, id)) continue;
      var p = P[id] || {};
      if (!p.name) continue;
      out.push({ id: id, name: p.name, office: p.office || '', state: p.state || '' });
    }
    out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return out;
  }

  function afLinkSearch(q) {
    var input = document.getElementById('af-link-search');
    var box = document.getElementById('af-link-results');
    if (!box) return;
    function setExpanded(on) { if (input) input.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    // Hard cap the picker to the same MAX_LINKS the API enforces, with a clear
    // message rather than silently ignoring further additions.
    if (_afLinkedIds.length >= _AF_MAX_LINKS) {
      box.innerHTML = '<div class="pp-picker-empty">You’ve linked the maximum of ' + _AF_MAX_LINKS + ' politicians.</div>';
      box.style.display = ''; setExpanded(true); return;
    }
    q = (q || '').trim().toLowerCase();
    if (!q) { box.style.display = 'none'; box.innerHTML = ''; setExpanded(false); return; }
    var matches = _afPoliticianList().filter(function (p) {
      if (_afLinkedIds.indexOf(p.id) !== -1) return false; // already picked
      return (p.name + ' ' + p.office + ' ' + p.state).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
    if (!matches.length) {
      box.innerHTML = '<div class="pp-picker-empty">No matching politicians found.</div>';
    } else {
      // First match is pre-highlighted so Enter picks it immediately.
      box.innerHTML = matches.map(function (p, i) {
        var sub = [p.office, p.state].filter(Boolean).join(' · ');
        return '<button type="button" class="pp-picker-opt' + (i === 0 ? ' is-active' : '') + '" onclick="afLinkAdd(\'' +
          _afEsc(p.id).replace(/'/g, "\\'") + '\')">' +
          '<span style="font-size:1rem;">👤</span>' +
          '<span style="min-width:0;"><span class="pp-opt-name">' + _afEsc(p.name) + '</span>' +
          (sub ? '<br><span class="pp-opt-office">' + _afEsc(sub) + '</span>' : '') + '</span>' +
          '</button>';
      }).join('');
    }
    box.style.display = ''; setExpanded(true);
  }
  window.afLinkSearch = afLinkSearch;

  // Keyboard-drive the results dropdown: ↑/↓ move the highlight, Enter picks the
  // highlighted (or first) match, Escape closes. Makes fast multi-select feel
  // native without ever leaving the keyboard.
  window.afLinkKey = function (e) {
    var box = document.getElementById('af-link-results');
    if (!box || box.style.display === 'none') return;
    var opts = box.querySelectorAll('.pp-picker-opt');
    if (!opts.length) { if (e.key === 'Escape') box.style.display = 'none'; return; }
    var cur = -1;
    for (var i = 0; i < opts.length; i++) { if (opts[i].classList.contains('is-active')) { cur = i; break; } }
    if (e.key === 'ArrowDown') { e.preventDefault(); cur = (cur + 1) % opts.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cur = (cur <= 0 ? opts.length - 1 : cur - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); opts[cur >= 0 ? cur : 0].click(); return; }
    else if (e.key === 'Escape') {
      box.style.display = 'none';
      var inp = document.getElementById('af-link-search'); if (inp) inp.setAttribute('aria-expanded', 'false');
      return;
    } else { return; }
    for (var j = 0; j < opts.length; j++) opts[j].classList.toggle('is-active', j === cur);
    try { opts[cur].scrollIntoView({ block: 'nearest' }); } catch (err) {}
  };

  window.afLinkAdd = function (id) {
    if (_afLinkedIds.indexOf(id) === -1 && _afLinkedIds.length < _AF_MAX_LINKS) _afLinkedIds.push(id);
    var input = document.getElementById('af-link-search');
    if (input) input.value = '';
    var box = document.getElementById('af-link-results');
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }
    // Keep focus in the search field so a submitter can add several politicians
    // in a row without re-tapping the input.
    if (input) { input.setAttribute('aria-expanded', 'false'); input.focus(); }
    _afRenderSelected();
  };

  window.afLinkRemove = function (id) {
    _afLinkedIds = _afLinkedIds.filter(function (x) { return x !== id; });
    _afRenderSelected();
  };

  function _afRenderSelected() {
    var wrap = document.getElementById('af-link-selected');
    if (!wrap) return;
    wrap.innerHTML = _afLinkedIds.map(function (id) {
      return '<span class="pp-link-chip is-removable" onclick="afLinkRemove(\'' +
        _afEsc(id).replace(/'/g, "\\'") + '\')" title="Remove">👤 ' +
        _afEsc(window._pdxPoliticianName(id)) +
        '<span class="pp-link-x">✕</span></span>';
    }).join('');
  }

  // Dismiss the results dropdown when clicking outside the picker.
  document.addEventListener('click', function (e) {
    var wrap = document.querySelector('#agenda-submit-overlay .pp-picker-wrap');
    if (wrap && !wrap.contains(e.target)) {
      var box = document.getElementById('af-link-results');
      if (box) box.style.display = 'none';
    }
  });

  function submitAgendaIdea() {
    const title  = document.getElementById('af-title').value.trim();
    const desc   = document.getElementById('af-desc').value.trim();
    const catSel = document.getElementById('af-category');
    const source = document.getElementById('af-source').value.trim();
    const name   = document.getElementById('af-name').value.trim();
    const errEl  = document.getElementById('af-error');
    const errTxt = document.getElementById('af-error-text');
    // Only title + description are required — the flow stays approachable. If a
    // source URL is offered we fold it into the description so the proposal keeps
    // the citation without needing a dedicated column yet.
    if (!title)                    { errTxt.textContent = 'Please enter a reform title.'; errEl.classList.remove('hidden'); return; }
    if (!desc || desc.length < 12) { errTxt.textContent = 'Please write a description of at least 12 characters.'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    const btn = document.getElementById('af-submit-btn');
    document.getElementById('af-btn-label').textContent = 'Submitting…';
    btn.disabled = true; btn.style.opacity = '0.7';

    const category = catSel ? (catSel.options[catSel.selectedIndex] || {}).text || catSel.value : '';
    const description = source ? (desc + '\n\nSource: ' + source) : desc;

    ProposalsAPI.submit({ title: title, description: description, category: category, submitterName: name, linkedPoliticianIds: _afLinkedIds.slice() })
      .then(function(proposal) {
        // Success screen — now reflecting an instant, live publish.
        document.getElementById('af-submission-id').textContent = 'PA-' + proposal.id;
        document.getElementById('agenda-form-wrap').classList.add('hidden');
        document.getElementById('agenda-success').classList.remove('hidden');
        document.getElementById('agenda-footer').classList.add('hidden');
        // Surface the fresh proposal on the live board immediately and jump the
        // viewer to it so their contribution is visibly part of the space.
        if (typeof loadProposals === 'function') loadProposals({ highlightId: proposal.id });
        if (typeof window._showToast === 'function') window._showToast('Your reform is live on the board ✊');
      })
      .catch(function(err) {
        errTxt.textContent = (err && err.message) ? err.message : 'Could not submit right now — please try again.';
        errEl.classList.remove('hidden');
        document.getElementById('af-btn-label').textContent = 'Submit Idea →';
        btn.disabled = false; btn.style.opacity = '1';
      });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const ao = document.getElementById('agenda-submit-overlay');
      if (ao && ao.style.display !== 'none') { closeAgendaSubmit(); e.stopPropagation(); }
    }
  }, true);

  // ══ 3 · PROPOSALS ENGINE ════════════ moved out of index.html ════════════

  // ══════════════════════════════════════════════════════════════════════════
  // THE PEOPLE'S PROPOSALS — live participation engine
  // ══════════════════════════════════════════════════════════════════════════
  // Powers the community proposal board on the Mandate page. Data lives in the
  // Netlify Database behind /api/mandate-proposals; this client fetches the list,
  // renders cards, submits new proposals, and records one-click support.
  //
  // Identity today is a lightweight, anonymous "participant key" minted once per
  // browser and kept in localStorage. It is sent as submitterKey / voterKey so
  // the server can attribute a submission and enforce one-support-per-proposal.
  // When real auth arrives, swap _participantKey() for the signed-in uid and the
  // rest of this file is unchanged. Locally-supported ids are also cached so the
  // board renders instantly and correctly even before the network round-trips —
  // a belt-and-suspenders guard on top of the server's unique constraint.
  (function () {
    'use strict';

    var API_BASE = '/api/mandate-proposals';
    var LS_KEY = 'pdx_participant_key';
    var LS_SUPPORTED = 'pdx_proposal_supported';   // { [id]: true } cache
    var REFRESH_MS = 25000;                          // gentle live refresh cadence

    // ── Participant identity (stable, anonymous, per-browser) ────────────────
    function _participantKey() {
      var k = null;
      try { k = localStorage.getItem(LS_KEY); } catch (e) {}
      if (!k) {
        k = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'pk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        try { localStorage.setItem(LS_KEY, k); } catch (e) {}
      }
      return k;
    }

    // ── Local cache of which proposals this browser has supported ────────────
    function _supportedMap() {
      try { return JSON.parse(localStorage.getItem(LS_SUPPORTED) || '{}') || {}; }
      catch (e) { return {}; }
    }
    function _setSupported(id, on) {
      var m = _supportedMap();
      if (on) m[id] = true; else delete m[id];
      try { localStorage.setItem(LS_SUPPORTED, JSON.stringify(m)); } catch (e) {}
    }

    // ── The support lane's vocabulary ────────────────────────────────────────
    // support-lane.js owns every word this board uses for a support count, so a
    // rename happens in one file rather than in six string literals. Guarded with
    // a fallback because this board must render even if that script is absent —
    // the fallbacks are the same words, never "votes".
    function _supportWord(k, fallback) {
      try {
        var w = window.PDXSupportLane && window.PDXSupportLane.WORDS;
        if (w && typeof w[k] === 'string' && w[k]) return w[k];
      } catch (e) {}
      return fallback;
    }

    // The stronger, person-file wording. Rendered under the profile's Related
    // Proposals block; returns '' rather than inventing copy if the lane is absent.
    function _wallNote() {
      try {
        if (window.PDXSupportLane && typeof window.PDXSupportLane.noteHtml === 'function') {
          return window.PDXSupportLane.noteHtml({ wall: true });
        }
      } catch (e) {}
      return '';
    }

    // Replace the no-JS momentum note with the lane's own sentence, so the copy
    // has exactly one home. Same text today; this keeps it that way tomorrow.
    function _syncMomentumNote() {
      var host = document.getElementById('pp-momentum-note');
      if (!host) return;
      try {
        if (window.PDXSupportLane && typeof window.PDXSupportLane.noteHtml === 'function') {
          host.innerHTML = window.PDXSupportLane.noteHtml();
        }
      } catch (e) {}
      var lbl = document.getElementById('pp-stat-label');
      if (lbl) lbl.textContent = _supportWord('statLabel', 'shows of support');
    }

    // ── Small helpers ────────────────────────────────────────────────────────
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function timeAgo(iso) {
      var t = new Date(iso).getTime();
      if (isNaN(t)) return '';
      var s = Math.max(1, Math.floor((Date.now() - t) / 1000));
      if (s < 60) return 'just now';
      var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
      var d = Math.floor(h / 24); if (d < 30) return d + 'd ago';
      return new Date(t).toLocaleDateString();
    }
    // Count up a stat number so live figures feel alive, not static.
    function animateNum(el, to) {
      if (!el) return;
      var from = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10);
      if (isNaN(from)) from = 0;
      to = to || 0;
      if (from === to) { el.textContent = to.toLocaleString(); return; }
      var steps = 16, i = 0, diff = to - from;
      var tick = function () {
        i++;
        var v = Math.round(from + diff * (i / steps));
        el.textContent = v.toLocaleString();
        if (i < steps) requestAnimationFrame(tick);
        else el.textContent = to.toLocaleString();
      };
      requestAnimationFrame(tick);
    }

    // ── API surface (also exposed as window.ProposalsAPI for the submit modal) ─
    function apiList(sort) {
      var url = API_BASE + '?sort=' + encodeURIComponent(sort || 'top') +
                '&key=' + encodeURIComponent(_participantKey());
      return fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('list failed'); return r.json(); });
    }
    function apiSubmit(data) {
      return fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          category: data.category || null,
          submitterName: data.submitterName || '',
          submitterKey: _participantKey(),
          // Optional politician links chosen in the submit modal's picker.
          linkedPoliticianIds: Array.isArray(data.linkedPoliticianIds) ? data.linkedPoliticianIds : []
        })
      }).then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) throw new Error(body && body.error ? body.error : 'Submit failed');
          return body.proposal;
        });
      });
    }
    function apiSupport(id) {
      return fetch(API_BASE + '/' + id + '/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterKey: _participantKey() })
      }).then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) throw new Error(body && body.error ? body.error : 'Support failed');
          return body; // { supported, supportCount }
        });
      });
    }
    window.ProposalsAPI = { submit: apiSubmit };

    // ── Related proposals for a politician profile ────────────────────────────
    // Fetches only the proposals linked to one politician and renders a compact,
    // read-forward "Related Proposals" section inside their open profile modal.
    // Each row jumps to the live board (highlighting that proposal) so support
    // stays in one place — no duplicate vote state on the profile.
    function apiByPolitician(pid) {
      var url = API_BASE + '?politician=' + encodeURIComponent(pid) +
                '&key=' + encodeURIComponent(_participantKey());
      return fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('related failed'); return r.json(); });
    }

    function relatedSectionHTML(list) {
      // Show only the most-backed handful so a well-linked official's profile
      // stays scannable; the header badge still reports the true total.
      var MAX_ROWS = 6;
      var shown = list.slice(0, MAX_ROWS);
      var hidden = list.length - shown.length;
      var rows = shown.map(function (p) {
        var cat = p.category ? '<span class="pp-tag" style="flex-shrink:0;">' + esc(p.category) + '</span>' : '';
        var count = Math.max(0, p.supportCount || 0);
        return '<button type="button" class="pdx-related-item" onclick="pdxJumpToProposal(' + p.id + ')">' +
            '<div style="flex:1;min-width:0;text-align:left;">' +
              '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.15rem;">' + cat +
                '<span style="font-family:\'Teko\',sans-serif;font-size:1.05rem;line-height:1.1;color:#fff;">' + esc(p.title) + '</span>' +
              '</div>' +
              '<div style="font-size:0.72rem;color:#9fb4d4;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + esc(p.description) + '</div>' +
            '</div>' +
            '<span style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:0.05rem;color:#f5c842;">' +
              '<span style="font-family:\'Teko\',sans-serif;font-size:1.15rem;font-weight:700;line-height:1;">' + count.toLocaleString() + '</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:#7a8aa8;">' + esc(_supportWord('countLabel', 'Backing')) + '</span>' +
            '</span>' +
          '</button>';
      }).join('');
      var moreNote = hidden > 0
        ? '<p style="font-size:0.66rem;color:#7a8aa8;text-align:center;margin:0.55rem 0 0;font-family:\'Barlow Condensed\',sans-serif;letter-spacing:0.06em;">Showing the ' + shown.length + ' most-backed · ' + hidden + ' more on the board</p>'
        : '';
      return '<div class="modal-block pdx-related-block">' +
          '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.7rem;">' +
            '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.08em;color:#f5c842;">📜 Related Proposals</span>' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(245,200,66,0.12);border:1px solid rgba(245,200,66,0.3);color:#f5c842;padding:0.1rem 0.45rem;border-radius:999px;">' + list.length + '</span>' +
          '</div>' +
          '<p style="font-size:0.72rem;color:#7a8aa8;line-height:1.4;margin:-0.35rem 0 0.7rem;">Community reforms from The People\'s Mandate linked to this official. Tap one to back it on the board.</p>' +
          '<div style="display:flex;flex-direction:column;gap:0.5rem;">' + rows + '</div>' + moreNote +
          // THE WALL, stated on the one page where it matters most. This block
          // sits in the same scroll as Direction Match, the formal act list and
          // the pattern tiers, so the sentence separating momentum from record
          // has to be here rather than only on the Mandate board.
          _wallNote() +
        '</div>';
    }

    // Jump from a profile's Related Proposals row to the live board, closing the
    // modal and highlighting the proposal so it can be supported in one place.
    window.pdxJumpToProposal = function (id) {
      if (typeof window.closeModal === 'function') window.closeModal();
      setTimeout(function () {
        if (typeof window.loadProposals === 'function') window.loadProposals({ highlightId: id });
      }, 320);
    };

    window._pdxLoadRelatedProposals = function (pid) {
      var host = document.getElementById('pdx-related-proposals');
      if (!host || String(host.getAttribute('data-pid')) !== String(pid)) return;
      apiByPolitician(pid).then(function (data) {
        var list = (data && data.proposals) || [];
        // The modal may have changed profiles while the request was in flight —
        // re-resolve and re-check the target before writing anything.
        host = document.getElementById('pdx-related-proposals');
        if (!host || String(host.getAttribute('data-pid')) !== String(pid)) return;
        host.innerHTML = list.length ? relatedSectionHTML(list) : '';
      }).catch(function () { /* leave the section empty on failure */ });
    };

    // ── State ─────────────────────────────────────────────────────────────────
    var _sort = 'top';
    var _proposals = [];
    var _refreshTimer = null;
    var _highlightId = null;
    var _teamOnly = false;   // "Involves my team" filter engaged?

    // ── Rendering ─────────────────────────────────────────────────────────────
    function show(id, on) {
      var el = document.getElementById(id);
      if (el) el.style.display = on ? '' : 'none';
    }

    // ── Team awareness (Phase 3 — reads through PDXTeamView) ──────────────────
    // The People's Mandate becomes team-aware: a proposal linked to someone the
    // visitor actually follows — one of their representatives, a committed ballot
    // pick, or a starred politician — is highlighted and can be filtered to.
    //
    // Membership is read through the unified PDXTeamView adapter (which reads the
    // Phase-1 v2 source first and already falls back to the legacy stores
    // internally). If the adapter isn't on the page at all we still read the
    // exact legacy stores the app used before, so the board degrades to its
    // previous (team-blind) behavior instead of breaking. No old read path is
    // removed — this only adds a preferred one in front.
    //
    // Returns { reps: {pid:true}, tracked: {pid:true}, has: bool }. A pid that is
    // both a representative and starred lands in `reps` (the stronger signal),
    // matching how the dashboard's Mandate Activity card ranks the two.
    function _teamMembers() {
      var reps = {}, tracked = {}, gotAdapter = false;
      var view = window.PDXTeamView;
      if (view) {
        // Representatives — the derived "who represents me" slate.
        try {
          if (typeof view.representsMe === 'function') {
            (view.representsMe() || []).forEach(function (r) {
              if (r && r.pid) { reps[String(r.pid)] = true; gotAdapter = true; }
            });
          }
        } catch (e) {}
        // Committed ballot picks — the visitor's chosen team, one per seat.
        try {
          if (typeof view.bySeat === 'function') {
            var bal = view.bySeat() || {};
            for (var k in bal) { if (bal[k]) { reps[String(bal[k])] = true; gotAdapter = true; } }
          }
        } catch (e) {}
        // Starred / tracked roster.
        try {
          if (typeof view.roster === 'function') {
            (view.roster() || []).forEach(function (id) {
              if (id) { tracked[String(id)] = true; gotAdapter = true; }
            });
          }
        } catch (e) {}
      }
      // Fallback: only when the adapter is absent or yielded nothing. Reads the
      // legacy stores directly, preserving the pre-refactor behavior.
      if (!gotAdapter) {
        try {
          var sel = JSON.parse(localStorage.getItem('politidex_my_team') || '{}') || {};
          for (var s in sel) { if (sel[s]) reps[String(sel[s])] = true; }
        } catch (e) {}
        try {
          var arr = JSON.parse(localStorage.getItem('politidex_my_politicians') || '[]');
          if (Array.isArray(arr)) arr.forEach(function (id) { if (id) tracked[String(id)] = true; });
        } catch (e) {}
      }
      // Representative status wins if a pid somehow landed in both buckets.
      for (var p in reps) { if (tracked[p]) delete tracked[p]; }
      return { reps: reps, tracked: tracked,
               has: (Object.keys(reps).length + Object.keys(tracked).length) > 0 };
    }

    // The strongest team connection for a proposal, or null. A representative
    // match outranks a starred one. `team` comes from _teamMembers().
    function _proposalTeamLink(p, team) {
      if (!team || !team.has) return null;
      var ids = (p && Array.isArray(p.linkedPoliticianIds)) ? p.linkedPoliticianIds : [];
      var starred = null;
      for (var i = 0; i < ids.length; i++) {
        var id = String(ids[i]);
        if (team.reps[id]) return { pid: id, rep: true };
        if (!starred && team.tracked[id]) starred = { pid: id, rep: false };
      }
      return starred;
    }

    // Show/hide the "Involves my team" toggle based on whether there's a team to
    // filter against, and keep its pressed state honest.
    function _syncTeamToggle(team) {
      var btn = document.getElementById('pp-team-toggle');
      if (!btn) return;
      if (team && team.has) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
        _teamOnly = false;   // never leave a hidden filter engaged
      }
      btn.classList.toggle('is-active', _teamOnly);
      btn.setAttribute('aria-pressed', _teamOnly ? 'true' : 'false');
    }

    // Friendly in-grid state when the team filter is on but nothing matches yet.
    function _teamEmptyHTML() {
      return '<div class="pp-team-empty">' +
        '<div style="font-size:2rem;margin-bottom:0.4rem;">🎯</div>' +
        '<p style="max-width:26rem;margin:0 auto;line-height:1.5;">No proposals yet mention anyone on your ballot. ' +
        '<button type="button" class="pp-team-empty-cta" onclick="toggleProposalTeamFilter(document.getElementById(\'pp-team-toggle\'))">Show all proposals</button></p>' +
        '</div>';
    }

    // Build the clickable "linked politicians" chip row for a card (empty string
    // when a proposal has no links). Each chip resolves its id to a name via the
    // shared roster and opens that politician's profile on tap. Chips that
    // resolve to someone on the visitor's team are visually emphasized.
    function linkedChips(p, team) {
      var ids = Array.isArray(p.linkedPoliticianIds) ? p.linkedPoliticianIds : [];
      if (!ids.length) return '';
      var nameOf = (typeof window._pdxPoliticianName === 'function')
        ? window._pdxPoliticianName : function (x) { return x; };
      // Cap how many chips a card shows so a heavily-linked proposal stays tidy
      // and never blows out the card on a narrow screen — the rest roll into a
      // compact "+N" marker.
      var MAX_SHOWN = 4;
      var shown = ids.slice(0, MAX_SHOWN);
      var extra = ids.length - shown.length;
      var chips = shown.map(function (id) {
        var safeId = String(id).replace(/'/g, "\\'");
        var onTeam = !!(team && (team.reps[String(id)] || team.tracked[String(id)]));
        return '<button type="button" class="pp-link-chip' + (onTeam ? ' is-team' : '') + '" ' +
          'onclick="event.stopPropagation(); if(typeof window.showProfile===\'function\') window.showProfile(\'' + esc(safeId) + '\'); else if(typeof openModal===\'function\') openModal(\'' + esc(safeId) + '\')" ' +
          'title="' + (onTeam ? 'On your ballot — view profile' : 'View profile') + '">' +
          (onTeam ? '⭐ ' : '👤 ') + esc(nameOf(id)) + '</button>';
      }).join('');
      if (extra > 0) chips += '<span class="pp-link-more" title="' + extra + ' more linked">+' + extra + '</span>';
      return '<div class="pp-linked"><span class="pp-linked-lead">Affects</span>' + chips + '</div>';
    }

    function cardHTML(p, link, team) {
      var supported = !!p.youSupported || !!_supportedMap()[p.id];
      var fresh = (Date.now() - new Date(p.createdAt).getTime()) < 6 * 3600 * 1000;
      var tag = p.category ? '<span class="pp-tag">' + esc(p.category) + '</span>' : '';
      var newBadge = fresh ? '<span class="pp-badge-new">★ New</span>' : '';
      // Team cue: a proposal touching one of the visitor's reps or a starred
      // politician earns a gold pill and card accent.
      var teamBadge = link
        ? '<span class="pp-team-badge' + (link.rep ? ' is-rep' : '') + '" title="' +
            (link.rep ? 'Involves one of your representatives' : 'Involves someone on your ballot') + '">🎯 ' +
            (link.rep ? 'Your rep' : 'Your pick') + '</span>'
        : '';
      var count = Math.max(0, p.supportCount || 0);
      return '' +
        '<article class="pp-card' + (link ? ' is-team' : '') + '" id="pp-card-' + p.id + '" data-id="' + p.id + '">' +
          '<div class="pp-card-body">' +
            '<div class="pp-card-top">' + tag + newBadge + teamBadge +
              '<span class="pp-community-chip">👥 Community</span>' +
            '</div>' +
            '<h4 class="pp-card-title">' + esc(p.title) + '</h4>' +
            '<p class="pp-card-desc">' + esc(p.description) + '</p>' +
            linkedChips(p, team) +
          '</div>' +
          '<div class="pp-card-meta" style="padding:0 1.15rem;">Proposed by <strong style="color:#c7d3e6;">' +
            esc(p.submitterName || 'Anonymous') + '</strong> · ' + esc(timeAgo(p.createdAt)) + '</div>' +
          '<div class="pp-card-foot">' +
            '<button type="button" class="pp-support-btn' + (supported ? ' is-supported' : '') + '" ' +
              'onclick="toggleProposalSupport(' + p.id + ', this)" ' +
              'aria-pressed="' + (supported ? 'true' : 'false') + '">' +
              '<span class="pp-heart">' + (supported ? '✊' : '👍') + '</span>' +
              '<span class="pp-support-label">' + (supported ? 'Supported' : 'Support') + '</span>' +
            '</button>' +
            '<span class="pp-support-tally">' +
              '<span class="pp-support-count" id="pp-count-' + p.id + '">' + count.toLocaleString() + '</span>' +
              // The count never travels without its noun. "Backing" is a count of
              // people; it is not a rating of the reform and not a score.
              '<span class="pp-support-count-label">' + esc(_supportWord('countLabel', 'Backing')) + '</span>' +
            '</span>' +
          '</div>' +
          ((typeof window._pdxSpotlightEngageHTML === 'function' && typeof window._pdxVoteTargetId === 'function')
            ? '<div style="padding:0 1.15rem 1rem;">' + window._pdxSpotlightEngageHTML(window._pdxVoteTargetId('reform', p.id, p.title), 'this reform', { noVote: true }) + '</div>'
            : '') +
        '</article>';
    }

    function render() {
      var grid = document.getElementById('pp-grid');
      if (!grid) return;
      show('pp-loading', false);
      show('pp-error', false);

      // Team-aware pass — rebuilt each render so it always reflects the live team
      // (a pick added elsewhere highlights here the instant the board re-renders).
      var team = _teamMembers();
      _syncTeamToggle(team);
      var annotated = _proposals.map(function (p) {
        return { p: p, link: _proposalTeamLink(p, team) };
      });

      if (!_proposals.length) {
        show('pp-grid', false);
        show('pp-empty', true);
        return;
      }

      var view = annotated;
      if (_teamOnly && team.has) {
        view = annotated.filter(function (o) { return o.link; });
      }

      // Team filter on, but nothing matches → a friendly in-grid nudge rather
      // than a blank board or the generic "be the first" empty state.
      if (_teamOnly && team.has && !view.length) {
        show('pp-empty', false);
        grid.innerHTML = _teamEmptyHTML();
        grid.style.display = '';
        return;
      }

      show('pp-empty', false);
      grid.innerHTML = view.map(function (o) { return cardHTML(o.p, o.link, team); }).join('');
      grid.style.display = '';
      if (_highlightId) {
        var card = document.getElementById('pp-card-' + _highlightId);
        if (card) {
          card.style.boxShadow = '0 0 0 2px rgba(245,200,66,0.7), 0 16px 44px rgba(0,0,0,0.45)';
          try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          setTimeout(function () { card.style.boxShadow = ''; }, 2400);
        }
        _highlightId = null;
      }
    }

    function renderStats(stats) {
      if (!stats) return;
      animateNum(document.getElementById('pp-count'), stats.proposalCount || 0);
      // `supportTotal` is the field; `totalVotes` is the deprecated alias the API
      // still emits for older cached clients. Read the new name first.
      var total = (stats.supportTotal != null) ? stats.supportTotal : (stats.totalVotes || 0);
      animateNum(document.getElementById('pp-votes'), total || 0);
    }

    // ── Data flow ─────────────────────────────────────────────────────────────
    function loadProposals(opts) {
      opts = opts || {};
      if (opts.sort) _sort = opts.sort;
      if (opts.highlightId) _highlightId = opts.highlightId;
      var firstLoad = !_proposals.length;
      if (firstLoad) { show('pp-loading', true); show('pp-empty', false); show('pp-error', false); }
      return apiList(_sort).then(function (data) {
        _proposals = data.proposals || [];
        renderStats(data.stats);
        render();
      }).catch(function (err) {
        console.warn('proposals load error:', err);
        show('pp-loading', false);
        if (!_proposals.length) { show('pp-grid', false); show('pp-empty', false); show('pp-error', true); }
      });
    }
    window.loadProposals = loadProposals;

    // Sort toggle.
    window.setProposalSort = function (sort) {
      if (sort === _sort) return;
      _sort = sort;
      document.querySelectorAll('.pp-sort-btn').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-sort') === sort);
      });
      loadProposals({ sort: sort });
    };

    // "Involves my team" filter toggle. Purely client-side over the already-loaded
    // proposals — no API change — so it flips instantly and degrades to a no-op
    // when the visitor has no team (the button stays hidden via _syncTeamToggle).
    window.toggleProposalTeamFilter = function (btn) {
      _teamOnly = !_teamOnly;
      render();
    };

    // One-click support with optimistic UI + server reconciliation. The local
    // cache + disabled-in-flight guard stop double taps; the server's unique
    // index is the final authority on one-support-per-participant.
    var _supportInFlight = {};
    window.toggleProposalSupport = function (id, btn) {
      if (_supportInFlight[id]) return;
      _supportInFlight[id] = true;

      var countEl = document.getElementById('pp-count-' + id);
      var wasSupported = btn.classList.contains('is-supported');
      var cur = parseInt(String(countEl ? countEl.textContent : '0').replace(/[^\d]/g, ''), 10) || 0;

      // Optimistic flip.
      var nowSupported = !wasSupported;
      applySupportUI(btn, countEl, nowSupported, Math.max(0, cur + (nowSupported ? 1 : -1)));
      _setSupported(id, nowSupported);
      // Let the first-run onboarding guide react instantly: backing a proposal is a
      // valid first action, so this can complete (and celebrate) onboarding.
      try { if (typeof window._pdxFirstRunSync === 'function') window._pdxFirstRunSync(); } catch (e) {}
      btn.style.transform = 'scale(1.08)';
      setTimeout(function () { btn.style.transform = ''; }, 180);

      apiSupport(id).then(function (res) {
        // Reconcile with the authoritative server state.
        _setSupported(id, res.supported);
        // Personal Impact Tracker (opt-in): count a reform backed only when the
        // toggle lands ON, so un-supporting never inflates the footprint.
        try { if (res.supported && window.PDXImpact) window.PDXImpact.record('reforms'); } catch (e) {}
        applySupportUI(btn, countEl, res.supported, res.supportCount);
        var p = _proposals.filter(function (x) { return x.id === id; })[0];
        if (p) { p.youSupported = res.supported; p.supportCount = res.supportCount; }
        refreshTotalVotesStat();
      }).catch(function (err) {
        // Roll the optimistic change back on failure.
        console.warn('support error:', err);
        applySupportUI(btn, countEl, wasSupported, cur);
        _setSupported(id, wasSupported);
        if (typeof window._showToast === 'function') window._showToast('Could not record support — try again');
      }).then(function () { _supportInFlight[id] = false; });
    };

    function applySupportUI(btn, countEl, supported, count) {
      btn.classList.toggle('is-supported', supported);
      btn.setAttribute('aria-pressed', supported ? 'true' : 'false');
      var heart = btn.querySelector('.pp-heart');
      var label = btn.querySelector('.pp-support-label');
      if (heart) heart.textContent = supported ? '✊' : '👍';
      if (label) label.textContent = supported ? 'Supported' : 'Support';
      if (countEl) countEl.textContent = Math.max(0, count || 0).toLocaleString();
    }

    // Recompute the "shows of support" headline stat from the live counts on
    // screen so it updates instantly on support without waiting for the next full
    // refresh. (Function name predates the vocabulary and is kept to avoid
    // touching its three call sites for a rename.)
    function refreshTotalVotesStat() {
      var total = 0;
      _proposals.forEach(function (p) { total += Math.max(0, p.supportCount || 0); });
      animateNum(document.getElementById('pp-votes'), total);
    }

    // ── Lifecycle: lazy-load when the Mandate section nears the viewport, then
    //    keep it gently live while the tab is visible. ─────────────────────────
    var _started = false;
    function start() {
      if (_started) return;
      _started = true;
      _syncMomentumNote();
      loadProposals();
      _refreshTimer = setInterval(function () {
        // Skip refreshes while the tab is hidden or a support is mid-flight to
        // avoid clobbering an optimistic update.
        if (document.hidden) return;
        if (Object.keys(_supportInFlight).some(function (k) { return _supportInFlight[k]; })) return;
        loadProposals();
      }, REFRESH_MS);
    }

    function initObserver() {
      var section = document.getElementById('peoples-proposals');
      if (!section) return;
      if (!('IntersectionObserver' in window)) { start(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { start(); io.disconnect(); }
        });
      }, { rootMargin: '400px 0px' });
      io.observe(section);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initObserver);
    else initObserver();

    // Keep the team highlighting honest while the board is open: re-render when
    // the unified team source changes (same tab) or a team store is written from
    // another tab. Guarded on having proposals so it's a cheap no-op otherwise.
    window.addEventListener('pdx-team-change', function () { if (_proposals.length) render(); });
    window.addEventListener('storage', function (e) {
      if (!e || !e.key) return;
      if (e.key === 'politidex_team_v2' || e.key === 'politidex_my_team' || e.key === 'politidex_my_politicians') {
        if (_proposals.length) render();
      }
    });
  })();

  // ══ 4 · REFORM HUB ═══════════════ moved out of index.html ═══════════════

  // ════════════════════════════════════════════════════════════
  // REFORM HUB — Search, Filter, Sort
  // ════════════════════════════════════════════════════════════

  function filterAgenda() {
    const q      = (document.getElementById('rh-search')?.value || '').trim().toLowerCase();
    const type   = document.getElementById('rh-type')?.value   || '';
    const demand = document.getElementById('rh-demand')?.value || '';
    const urgency= document.getElementById('rh-urgency')?.value|| '';
    const affects= document.getElementById('rh-affects')?.value|| '';
    const sort   = document.getElementById('rh-sort')?.value   || '';

    // Toggle clear button on search
    const clearBtn = document.getElementById('rh-search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    // Mark selects active
    ['rh-type','rh-demand','rh-urgency','rh-affects','rh-sort'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('rh-active', !!el.value);
    });

    // Get all agenda cards (not the CTA card)
    const cards = Array.from(document.querySelectorAll('#agenda-grid .agenda-card'));
    let visible = 0;

    cards.forEach(card => {
      const title   = card.dataset.title  || '';
      const body    = card.dataset.body   || '';
      const cType   = card.dataset.type   || '';
      const cDemand = card.dataset.demand || '';
      const cUrgency= card.dataset.urgency|| '';
      const cAffects= card.dataset.affects|| '';

      const matchSearch  = !q      || title.includes(q) || body.includes(q);
      const matchType    = !type   || cType === type;
      const matchDemand  = !demand || cDemand === demand;
      const matchUrgency = !urgency|| cUrgency === urgency;
      const matchAffects = !affects|| cAffects === affects;

      const show = matchSearch && matchType && matchDemand && matchUrgency && matchAffects;
      card.classList.toggle('rh-hidden', !show);
      if (show) visible++;
    });

    // Sort visible cards
    if (sort) {
      const grid = document.getElementById('agenda-grid');
      const visCards = cards.filter(c => !c.classList.contains('rh-hidden'));
      const ctaCard  = grid.querySelector('.rh-cta-card');

      visCards.sort((a, b) => {
        if (sort === 'popular') {
          return parseInt(b.dataset.up || 0) - parseInt(a.dataset.up || 0);
        } else if (sort === 'urgent') {
          const uOrder = { 'Immediate': 0, 'Short-term': 1, 'Long-term': 2 };
          return (uOrder[a.dataset.urgency] ?? 9) - (uOrder[b.dataset.urgency] ?? 9);
        } else if (sort === 'az') {
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        } else if (sort === 'za') {
          return (b.dataset.title || '').localeCompare(a.dataset.title || '');
        }
        return parseInt(a.dataset.rank || 99) - parseInt(b.dataset.rank || 99);
      });

      // Re-insert in sorted order before CTA card
      visCards.forEach(card => grid.insertBefore(card, ctaCard));
    }

    // Update count
    const countEl = document.getElementById('rh-count');
    if (countEl) countEl.textContent = visible;

    // Show/hide empty state
    const emptyEl = document.getElementById('rh-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';

    // Show/hide active filter row and chips
    const hasFilters = q || type || demand || urgency || affects;
    const activeRow = document.getElementById('rh-active-row');
    if (activeRow) activeRow.style.display = hasFilters ? 'flex' : 'none';

    // Render chips
    const chipsEl = document.getElementById('rh-chips');
    const countLabel = document.getElementById('rh-result-count');
    if (chipsEl) {
      const chips = [];
      if (q)       chips.push(['search', `"${q}"`, () => { document.getElementById('rh-search').value=''; filterAgenda(); }]);
      if (type)    chips.push(['type', type,    () => { document.getElementById('rh-type').value='';    filterAgenda(); }]);
      if (demand)  chips.push(['demand', demand,  () => { document.getElementById('rh-demand').value=''; filterAgenda(); }]);
      if (urgency) chips.push(['urgency', urgency, () => { document.getElementById('rh-urgency').value=''; filterAgenda(); }]);
      if (affects) chips.push(['affects', affects, () => { document.getElementById('rh-affects').value=''; filterAgenda(); }]);
      chipsEl.innerHTML = chips.map(([, label]) =>
        `<span class="rh-chip">${label}<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg></span>`
      ).join('');
      // Add click handlers
      chipsEl.querySelectorAll('.rh-chip').forEach((chip, i) => {
        chip.addEventListener('click', chips[i][2]);
      });
    }
    if (countLabel) {
      countLabel.textContent = hasFilters ? `${visible} result${visible !== 1 ? 's' : ''}` : '';
    }

    // Keep the quick-jump bar's live proposal count / gating in sync with
    // whatever the grid now shows.
    if (window.rebuildMandateNav) window.rebuildMandateNav();
  }

  function clearRhSearch() {
    const inp = document.getElementById('rh-search');
    if (inp) { inp.value = ''; inp.focus(); }
    filterAgenda();
  }

  function resetAgendaFilters() {
    ['rh-search'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['rh-type','rh-demand','rh-urgency','rh-affects','rh-sort'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    filterAgenda();
  }

  // Initialize on load — run default (popular) sort on first paint
  (function initReformHub() {
    const ready = () => {
      const sortEl = document.getElementById('rh-sort');
      if (sortEl) sortEl.value = 'popular';
      filterAgenda();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
  })();

  // ══ 5 · QUICK-JUMP NAV ═════════════ moved out of index.html ═════════════

  // ════════════════════════════════════════════════════════════
  // PEOPLE'S MANDATE — QUICK-JUMP NAV (sticky map + scroll-spy)
  // Builds the sticky pill bar under the mandate hero, gates any pill whose
  // target block is missing or empty, smooth-scrolls on click (respecting
  // prefers-reduced-motion), and highlights the section currently in view.
  // Scoped to the #agenda section; no external dependencies.
  // ════════════════════════════════════════════════════════════
  (function () {
    const nav = document.getElementById('mandate-jump');
    if (!nav) return;
    const pills = Array.from(nav.querySelectorAll('.mandate-jump-pill'));
    const reduceMotion = () =>
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // A target "has content" when it exists and is actually rendered. The
    // agenda grid counts only real (non-CTA, non-hidden) reform cards, so a
    // fully-filtered grid still self-gates and the count stays honest.
    function targetInfo(id) {
      const el = document.getElementById(id);
      if (!el) return { el: null, count: null, hasContent: false };
      if (id === 'agenda-grid') {
        const n = el.querySelectorAll('.agenda-card:not(.rh-hidden)').length;
        return { el, count: n, hasContent: n > 0 };
      }
      const rendered = el.getClientRects().length > 0 || el.offsetParent !== null;
      return { el, count: null, hasContent: rendered };
    }

    let visiblePills = [];

    // (Re)build: show only pills with real targets, refresh the live count,
    // and reveal the bar only when there are at least two places to jump to —
    // a one-item map isn't worth the space (non-intrusive self-gating).
    function build() {
      visiblePills = [];
      pills.forEach(pill => {
        const info = targetInfo(pill.dataset.target);
        pill.hidden = !info.hasContent;
        if (info.hasContent) visiblePills.push(pill);
        if (pill.dataset.target === 'agenda-grid') {
          const c = pill.querySelector('.mj-count');
          if (c && info.count != null) c.textContent = info.count;
        }
      });
      nav.hidden = visiblePills.length < 2;
    }

    function setActive(pill) {
      pills.forEach(p => {
        const on = p === pill;
        p.classList.toggle('is-active', on);
        if (on) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
    }

    // Smooth-scroll to a target. html{scroll-padding-top} — derived from the
    // measured --pdx-chrome — is what keeps the landing clear of the fixed bar;
    // targets under a sticky sub-rail add that rail's height and nothing else.
    // Motion collapses to an instant jump when the user prefers reduced motion.
    function jumpTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        setActive(pill);
        // Keep the scroll-spy's memo in step with a click-driven change, so the
        // spy can never mistake the clicked pill for a state it already applied.
        lastSpyPill = pill;
        jumpTo(pill.dataset.target);
      });
    });

    // Scroll-spy: the active pill is the last visible target whose top has
    // crossed the readable line just beneath the sticky bars.
    var lastSpyPill = null;
    function syncActiveByScroll() {
      if (nav.hidden || !visiblePills.length) return;
      // Cheap gate: one rect read tells us whether this rail is anywhere near the
      // screen. When the Mandate section is scrolled away there is nothing to
      // highlight, so we skip the per-pill rect reads below entirely instead of
      // forcing a layout for every pill on every scroll frame.
      var nr = nav.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      if (nr.bottom < -240 || nr.top > vh + 240) return;
      const line = 140; // px from viewport top — just below global nav + jump bar
      let current = visiblePills[0];
      visiblePills.forEach(pill => {
        const el = document.getElementById(pill.dataset.target);
        if (el && el.getBoundingClientRect().top - line <= 0) current = pill;
      });
      // Don't re-write class + aria on every pill every frame when nothing moved
      // between them — those writes are what turn a read-only scroll frame into a
      // style-recalc-then-layout frame. A rebuild hands us new pill nodes, so the
      // identity check can never wrongly skip a genuine change.
      if (current === lastSpyPill) return;
      lastSpyPill = current;
      setActive(current);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => { syncActiveByScroll(); ticking = false; });
    }, { passive: true });

    // Rebuild hook — filterAgenda() calls this after the grid changes so the
    // live count and gating stay current. Also handles late content loads.
    window.rebuildMandateNav = function () { build(); syncActiveByScroll(); };

    const start = () => { build(); syncActiveByScroll(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  })();
