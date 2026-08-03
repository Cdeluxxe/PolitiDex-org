/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Issue View  ·  window.PDXIssueView
   ────────────────────────────────────────────────────────────────────────────
   Move 2: the issue-first ranked view. A "question-first" voter doesn't start
   with a name — they start with a question ("Who's actually consistent on guns?
   Who says one thing on taxes and does another?"). This is the front door for
   that voter: pick an issue, and every tracked politician is ranked on THAT
   issue by consistency — did they back up their words, or contradict them — with
   the exact say-vs-do receipt one tap away.

   NO NEW DATA. Every ranking is assembled client-side from globals the app
   already ships:

     • window.CORE_NATIONAL_ISSUES  the curated set of front-door issues, each a
                                    bundle of ISSUE_MAP issueKeys (the shared
                                    vocabulary). This is the issue list.
     • window.PDXReceipts.collect() the say-vs-do layer — every sourced receipt
                                    with a verdict (consistent / contradicts /
                                    flag) and its issueKey. This is the DID side
                                    and the consistency signal.
     • window.ISSUE_STANCE_DATA     the stated-position layer, keyed by issueKey.
                                    This is the SAID side (surfaces people who
                                    have staked out a position but haven't yet
                                    been checked).
     • window.PROFILES / CMP_DATA / ACCT_ALIAS / _getPhotoUrl
                                    identity, photo and alias resolution.

   Move 3 (issue-first findability) narrows the distance from a QUESTION to the
   answer. Three additions, all reading the same data:

     • Sub-issue focus. "Who actually backs housing?" used to widen to the whole
       "Economy, Inflation & Cost of Living" bundle (21 keys). When a query or a
       deep-link names ONE ISSUE_MAP key, the ranking is built on that key alone
       and titled with its own label, with one tap to widen to the full core issue.
     • A lens read from the question. "backs / delivers / consistent" selects the
       existing "Backs it up" filter; "contradictory / hypocrite / flip-flop"
       selects the existing "Contradictions" filter. It picks a filter that already
       existed — it changes no score and no ordering rule.
     • Location scope that stays national. When (and only when) the visitor has
       saved a location, a scope control appears for THEIR state, derived from the
       app's own store and the shared state normalizer. Default is always
       everywhere, and an empty state scope falls back to everywhere rather than
       showing a wall.

   Exposes:
     PDXIssueView.open(key, opts)          → open the ranked overlay. `key` is a
                                             core-issue key OR a raw ISSUE_MAP key
                                             (which focuses the ranking on it).
                                             opts: { mode, scope, focusKey }
     PDXIssueView.close()                  → close it
     PDXIssueView.mountFrontDoor()         → render the #issue-front-door grid
     PDXIssueView.searchIssues(q)          → matching issues for the global search
                                             (each hit may carry a focusKey)
     PDXIssueView.parseQuestion(q)         → { coreKey, focusKey, mode, label, … }
                                             a natural-language question → the
                                             issue + lens it is asking about
     PDXIssueView.answer(q)                → parseQuestion + the ranked rows and
                                             coverage honesty for it, so a search
                                             surface can render the answer inline
     PDXIssueView.coverage(coreKey, opts)  → honest coverage readout for an issue
     PDXIssueView.linkFor(opts)            → shareable deep link for a ranking
     PDXIssueView.refresh()                → drop caches + re-render (roster grew)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueView) return; // idempotent

  // ── escape / dom helpers ────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }
  function G(name) { try { return window[name]; } catch (e) { return null; } }
  function el(id) { return document.getElementById(id); }

  // ── identity resolution (mirrors say-vs-do.js so the two never drift) ────────
  function canon(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function polRec(id) {
    var P = G('PROFILES'); if (P && P[id]) return P[id];
    var C = G('CMP_DATA'); if (C && C[id]) return C[id];
    return null;
  }
  function prettyName(id) {
    return String(id || '').split(/[_\-]/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function polName(id) {
    var f = G('_pdxPoliticianName');
    if (typeof f === 'function') { var n = f(id); if (n && n !== id) return n; }
    var d = polRec(id); if (d && d.name) return d.name;
    return prettyName(id);
  }
  function photoFor(id) {
    try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
    return '';
  }
  function partyChip(raw) {
    var p = String(raw || '').trim().toUpperCase();
    if (!p) return null;
    var c = p.charAt(0);
    if (c === 'R') return { key: 'R', label: 'R', color: '#f87171' };
    if (c === 'D') return { key: 'D', label: 'D', color: '#60a5fa' };
    if (c === 'I') return { key: 'I', label: 'IND', color: '#a78bfa' };
    return { key: 'I', label: p.slice(0, 3), color: '#94a3b8' };
  }
  function subFor(d) {
    if (!d) return '';
    return [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
      .filter(Boolean).join(' · ');
  }

  // ── issue vocabulary ────────────────────────────────────────────────────────
  function coreIssues() { return G('CORE_NATIONAL_ISSUES') || []; }
  function coreByKey(key) {
    var list = coreIssues();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  // Accept either a core-issue key ("guns") or a raw ISSUE_MAP key ("gun_rights")
  // and resolve to the core issue it belongs to, so search / deep-links are lenient.
  function resolveCore(k) {
    if (!k) return null;
    var direct = coreByKey(k);
    if (direct) return direct;
    var f = G('coreIssueForKey');
    if (typeof f === 'function') { var c = f(k); if (c) return c; }
    // Fall back to scanning the bundles ourselves, so a raw ISSUE_MAP key still
    // resolves even if the alignment tool's reverse lookup hasn't loaded.
    var list = coreIssues();
    for (var i = 0; i < list.length; i++) {
      if ((list[i].keys || []).indexOf(k) !== -1) return list[i];
    }
    return null;
  }
  // Same leniency, but keep the distinction the caller gave us: a raw ISSUE_MAP key
  // means "rank this ONE sub-issue", not "rank its whole bundle". A voter asking
  // about housing should not get all 21 keys of the economy bundle back.
  function resolveTarget(k, focusKey) {
    var core = resolveCore(k);
    if (!core) return null;
    var focus = focusKey || (coreByKey(k) ? '' : k);
    if (focus && (core.keys || []).indexOf(focus) === -1) focus = '';
    return { core: core, focusKey: focus };
  }
  // Label for a single ISSUE_MAP key — the narrow sub-issue inside a core bundle.
  function keyLabel(k) {
    var IM = G('ISSUE_MAP') || {};
    var def = IM[k];
    if (def && def.label) return def.label;
    var f = G('_issueLabel');
    if (typeof f === 'function') { try { var l = f(k); if (l) return l; } catch (e) {} }
    return prettyName(k);
  }
  function splitLabel(label) {
    label = String(label || '').trim();
    var sp = label.indexOf(' ');
    if (sp > 0) {
      var head = label.slice(0, sp);
      if (/[^\x00-\x7F]/.test(head)) return { icon: head, text: label.slice(sp + 1).trim() };
    }
    return { icon: '🎯', text: label };
  }

  // ── location: national by default, local when the voter has told us ───────────
  // Nothing here is hardcoded to a state. The voter's state comes from the app's
  // own location store (empty until they save one), and a politician's state from
  // the shared normalizer every other location surface uses. With no saved
  // location the scope control never renders and the ranking stays national.
  function userState() {
    try {
      if (!window._hasUserLocation) return '';
      var s = (window._currentVoterLocation && window._currentVoterLocation.state) || '';
      s = String(s).trim();
      return (!s || s === 'National') ? '' : s;
    } catch (e) { return ''; }
  }
  function stateOf(id) {
    var raw = '';
    try { if (window._originalStates && window._originalStates[id]) raw = window._originalStates[id]; } catch (e) {}
    if (!raw) { var d = polRec(id); raw = (d && d.state) || ''; }
    try {
      if (typeof window._pdxNormalizeState === 'function') return window._pdxNormalizeState(raw, id) || '';
    } catch (e) {}
    return String(raw || '').trim();
  }
  // A row belongs to the voter's scope when it is their state's own official OR a
  // national officeholder (president, cabinet, leadership) — a Nevada voter asking
  // "who backs housing near me" still needs the federal actors who decide it.
  function inUserScope(r, st) {
    if (!st) return true;
    if (!r.state) return false;
    if (r.state === 'National') return true;
    return r.state.toLowerCase() === st.toLowerCase();
  }

  // ── verdict → consistency tier ───────────────────────────────────────────────
  var TIERS = {
    consistent:    { cls: 'iv-consistent',    ico: '✓', label: 'Backs it up' },
    mixed:         { cls: 'iv-mixed',         ico: '≈', label: 'Mixed record' },
    flag:          { cls: 'iv-flag',          ico: '⚑', label: 'Red flag on record' },
    contradiction: { cls: 'iv-contradiction', ico: '⚠', label: 'Says one thing · does another' },
    stated:        { cls: 'iv-stated',        ico: '💬', label: 'Stated — not yet checked' },
    // Votes on the record, but no stated position to check them against (or none of
    // the votes bear on the issue's direction). Honest about what it is: evidence
    // without a claim to test it against, so it scores neutral.
    voted:         { cls: 'iv-voted',         ico: '🗳', label: 'Voted — no stated position' }
  };

  // ── data cache, keyed like PDXReceipts so it rebuilds exactly when data grows ─
  var _key = '';
  var _rankCache = {};   // coreKey → ranked rows
  var _counts = null;    // coreKey → { documented, receipts, total }

  function dataKey() {
    var acct = 0, prof = 0, sd = 0;
    try { acct = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) {}
    try { prof = window.PROFILES ? Object.keys(window.PROFILES).length : 0; } catch (e) {}
    try { sd = window.ISSUE_STANCE_DATA ? Object.keys(window.ISSUE_STANCE_DATA).length : 0; } catch (e) {}
    // _voteVer rises each time a batch of roll-call votes lands, so every cache below
    // (rankings, counts, the per-pid indexes) rebuilds with the new evidence in it.
    return acct + ':' + prof + ':' + sd + ':' + _voteVer;
  }
  function ensureFresh() {
    var k = dataKey();
    if (k !== _key) { _key = k; _rankCache = {}; _counts = null; }
  }

  // ── roll-call votes: batched, awaited, never "whatever happens to be warm" ─────
  // Ranking an issue means ordering the whole field, so the vote evidence for that
  // field has to be loaded BEFORE the ranking is computed — not read out of whichever
  // profiles the visitor happened to open. One request per issue-key set covers every
  // member (PDXVotingRecord.fetchIssueRecords), and the result is rehydrated into the
  // same record items the profile surfaces use, so the SAME stance-vs-record engine
  // scores them (_issueRecordSummary — see stance-helpers.js).
  //
  //   _voteItems[pid]   → that member's record items across every key loaded so far
  //   _voteLoaded[key]  → this ISSUE_MAP key's batch has landed (empty result included)
  //   _votePending[sig] → the in-flight request for a key set, so two surfaces asking
  //                       for the same issue at once share one round trip
  // Nothing here blocks a render: the ranking draws immediately from receipts and
  // stated positions, and re-renders once (via refresh()) when the votes arrive.
  var _voteItems = {}, _voteLoaded = {}, _votePending = {}, _voteVer = 0;
  var _voteTruncated = false, _voteWaiting = 0;

  function votesFor(id) { return _voteItems[id] || null; }
  // True while at least one batch is in flight — the surfaces say so out loud rather
  // than presenting an incomplete read as final.
  function votesPending() { return _voteWaiting > 0; }

  // Which of `keys` still needs loading. Empty array → the caller can rank now.
  function missingVoteKeys(keys) {
    var out = [];
    (keys || []).forEach(function (k) {
      if (k && !_voteLoaded[k] && out.indexOf(k) === -1) out.push(k);
    });
    return out;
  }

  // Kick off (or join) the batch for these keys. Returns a promise that resolves when
  // the evidence is in place; resolves immediately when nothing is missing.
  function ensureVotes(keys) {
    var missing = missingVoteKeys(keys);
    if (!missing.length) return Promise.resolve(false);
    var VR = G('PDXVotingRecord');
    if (!VR || typeof VR.fetchIssueRecords !== 'function') {
      // No data layer (offline bundle, old cache) → mark the keys done so the ranking
      // settles on its receipt-only behaviour instead of retrying forever.
      missing.forEach(function (k) { _voteLoaded[k] = true; });
      return Promise.resolve(false);
    }
    var sig = missing.slice().sort().join(',');
    if (_votePending[sig]) return _votePending[sig];
    _voteWaiting++;
    var p = VR.fetchIssueRecords(missing).then(function (res) {
      // Mark loaded either way: a null result means the read failed or the issue has
      // no roll-call rows, and both are honest "no vote evidence here" outcomes.
      missing.forEach(function (k) { _voteLoaded[k] = true; });
      var added = false;
      if (res && res.byPid) {
        Object.keys(res.byPid).forEach(function (pid) {
          var id = canon(pid);
          var items = res.byPid[pid] || [];
          if (!items.length) return;
          _voteItems[id] = _voteItems[id] ? _voteItems[id].concat(items) : items;
          added = true;
        });
        if (res.truncated) _voteTruncated = true;
      }
      if (added) _voteVer++;
      return added;
    }).catch(function () {
      missing.forEach(function (k) { _voteLoaded[k] = true; });
      return false;
    }).then(function (added) {
      _voteWaiting--;
      delete _votePending[sig];
      // One event per batch, not one per caller: two surfaces sharing this round trip
      // must not cause two re-renders on a phone.
      try { window.dispatchEvent(new CustomEvent('pdx-issue-votes', { detail: { added: !!added } })); } catch (e) {}
      return added;
    });
    _votePending[sig] = p;
    return p;
  }

  // Load the votes for an issue (or one sub-issue) and re-render the surfaces that
  // are showing it. Safe to call repeatedly — a loaded key never refetches.
  function warmVotes(core, focusKey, done) {
    var keys = focusKey ? [focusKey] : ((core && core.keys) || []);
    if (!missingVoteKeys(keys).length) return;
    ensureVotes(keys).then(function (added) {
      // Called even when nothing was added, so a "checking the voting record…" note
      // can clear itself.
      try { if (typeof done === 'function') done(added); } catch (e) {}
    });
  }

  // Receipts grouped by canonical politician id, once per data version.
  var _byPid = null;
  function receiptsByPid() {
    ensureFresh();
    if (_byPid && _byPidKey === _key) return _byPid;
    _byPid = {}; _byPidKey = _key;
    var R = G('PDXReceipts');
    if (!R || typeof R.collect !== 'function') return _byPid;
    var all = [];
    try { all = R.collect() || []; } catch (e) { all = []; }
    all.forEach(function (r) {
      var id = canon(r.pid);
      (_byPid[id] || (_byPid[id] = [])).push(r);
    });
    return _byPid;
  }
  var _byPidKey = '';

  // Stances grouped by canonical politician id.
  var _stanceByPid = null, _stanceKey = '';
  function stancesByPid() {
    ensureFresh();
    if (_stanceByPid && _stanceKey === _key) return _stanceByPid;
    _stanceByPid = {}; _stanceKey = _key;
    var SD = G('ISSUE_STANCE_DATA') || {};
    Object.keys(SD).forEach(function (pid) {
      var list = SD[pid];
      if (!Array.isArray(list)) return;
      _stanceByPid[canon(pid)] = list;
    });
    return _stanceByPid;
  }

  function stanceWordOf(s) {
    var v = (s && (s.issueStance || s.pos)) || '';
    if (v === 'support') return 'Supports';
    if (v === 'oppose') return 'Opposes';
    if (v === 'mixed') return 'Mixed on';
    return 'On';
  }
  // The stance token the say-vs-do engine compares a vote against — the same
  // 'support' | 'oppose' | 'mixed' vocabulary _polPositionMap produces, including its
  // default for a stance row that never named a direction.
  function stanceTokenOf(s) {
    if (!s) return '';
    return s.issueStance || s.pos || 'mixed';
  }

  // ── vote evidence, scored by the SAME engine as everywhere else ────────────────
  // For one politician and one ISSUE_MAP key, run their roll-call record against
  // their stated stance on that key through window._issueRecordSummary (stance-
  // helpers.js) — the identical function the profile Voting Record panel and the
  // Official Record use. It applies the mapping's supportMeaning, the procedural
  // inversion and the procedural down-weight itself, then collapses to ONE net
  // verdict per issue. No verdict math is reimplemented here.
  //
  // Returns null when there is nothing to say: no engine, no record on this key.
  function recordSummaryFor(id, key, stanceToken) {
    var items = votesFor(id);
    if (!items || !items.length) return null;
    var f = G('_issueRecordSummary');
    if (typeof f !== 'function') return null;
    var sum;
    try { sum = f(key, stanceToken || null, items); } catch (e) { return null; }
    if (!sum || !sum.total) return null;   // no record touching this key
    return sum;
  }

  // ── the ranking ───────────────────────────────────────────────────────────────
  // For a core issue (a bundle of issueKeys), rank every politician who has ANY
  // signal on it — a receipt, a roll-call record, or a stated position — by a
  // consistency value:
  //   base 50 (neutral / unchecked)
  //   + 20 per receipt where words matched actions
  //   − 30 per documented contradiction
  //   − 12 per red flag
  // clamped to 0–100. Higher = more consistent, so the sort is "who backs up
  // their words → who contradicts them". Ties break toward the more-documented
  // record, then alphabetically.
  //
  // VOTES ENTER AS ONE MORE PIECE OF THE SAME EVIDENCE. Per issue key, the member's
  // whole roll-call record on that key is reduced to a single net verdict by the
  // shared engine (recordSummaryFor above) and then counted exactly like a receipt of
  // that verdict: net-consistent adds one "kept", net-contradicts adds one "broken",
  // net-mixed adds one of each — which is already how the value formula treats a
  // person with one kept and one broken receipt. So the weights, the tiers and the
  // clamp are untouched: no new scoring philosophy, and forty votes cannot swamp the
  // scale the way summing them one-by-one would. Vote volume still matters, but where
  // it belongs — in the tie-break, which now counts total evidence (receipts +
  // judged issues) rather than receipts alone.
  //
  // `focusKey`, when given, narrows the bundle to that ONE ISSUE_MAP key. The math
  // is untouched — only which receipts, votes and stances are counted changes.
  function buildRanking(core, focusKey) {
    ensureFresh();
    var cacheKey = core.key + '|' + (focusKey || '');
    if (_rankCache[cacheKey]) return _rankCache[cacheKey];

    var keySet = Object.create(null);
    var useKeys = focusKey ? [focusKey] : (core.keys || []);
    useKeys.forEach(function (k) { keySet[k] = 1; });

    var byR = receiptsByPid();
    var byS = stancesByPid();
    var ids = {};
    Object.keys(byR).forEach(function (id) { ids[id] = 1; });
    Object.keys(byS).forEach(function (id) { ids[id] = 1; });
    // A roll-call record is signal too: someone with votes on this issue and no
    // receipt yet is now a ranking candidate instead of being invisible.
    Object.keys(_voteItems).forEach(function (id) { ids[id] = 1; });

    var rows = [];
    Object.keys(ids).forEach(function (id) {
      // Receipts on this issue, strongest first (collect() is pre-sorted by score).
      var receipts = (byR[id] || []).filter(function (r) { return keySet[r.issueKey]; });
      // Stances on this issue.
      var stances = (byS[id] || []).filter(function (s) { return s && keySet[s.issueKey] && (s.text || s.topic); });

      // ── the two counters both kinds of evidence land in ─────────────────────────
      // Receipts and votes increment the SAME pair, so the value formula, the tiers
      // and the clamp below are exactly the ones that were there before votes existed.
      var consistent = 0, contradicts = 0, flags = 0;
      receipts.forEach(function (r) {
        var kk = r.verdict && r.verdict.key;
        if (kk === 'consistent') consistent++;
        else if (kk === 'contradicts') contradicts++;
        else flags++;
      });

      // ── vote evidence on this issue ─────────────────────────────────────────────
      // One net verdict per issue KEY, from the shared engine. Collapsing per key is
      // what keeps the existing weights honest: a member with 40 votes on one key
      // counts as one kept (or one broken) promise there, exactly like a receipt.
      var voteItems = votesFor(id);
      var voteTotal = 0, voteConsistent = 0, voteContradicts = 0, voteMixed = 0, voteJudged = 0;
      var topVote = null, topVoteVerdict = '', topVoteIssue = '';
      if (voteItems && voteItems.length) {
        // Distinct records touching this bundle — a measure mapped to two keys in the
        // same bundle is still one vote, and must not be advertised as two. This scan
        // is also the cheap gate on the engine loop below: a member whose loaded votes
        // are all about some OTHER issue costs one pass over their items, not one
        // summary per key. That matters on the front door, which ranks all 13 bundles.
        voteItems.forEach(function (it) {
          var iss = it && it.issues;
          if (!iss || !iss.length) return;
          for (var i = 0; i < iss.length; i++) {
            if (iss[i] && keySet[iss[i].issueKey]) { voteTotal++; return; }
          }
        });
      }
      if (voteTotal) {
        // Stance token per key, so the engine compares like with like.
        var tokenByKey = Object.create(null);
        stances.forEach(function (s) {
          if (!tokenByKey[s.issueKey]) tokenByKey[s.issueKey] = stanceTokenOf(s);
        });
        useKeys.forEach(function (k) {
          var sum = recordSummaryFor(id, k, tokenByKey[k] || null);
          if (!sum) return;
          var nv = sum.netVerdict;
          if (nv === 'consistent') { consistent++; voteConsistent++; voteJudged++; }
          else if (nv === 'contradicts') { contradicts++; voteContradicts++; voteJudged++; }
          else if (nv === 'mixed') { consistent++; contradicts++; voteMixed++; voteJudged++; }
          // 'no_stance' / 'no_position' / 'no_record' add no score — there is nothing
          // to check the record against, and inventing a direction would be fabrication.

          // Cite the strongest single vote: a documented contradiction outranks a kept
          // promise, and useKeys' fixed order keeps the pick deterministic.
          var cand = (nv === 'contradicts' || nv === 'mixed') ? sum.topContradiction : null;
          var candVerdict = 'contradicts';
          if (!cand && (nv === 'consistent' || nv === 'mixed')) { cand = sum.topConsistent; candVerdict = 'consistent'; }
          if (cand && (!topVote || (topVoteVerdict !== 'contradicts' && candVerdict === 'contradicts'))) {
            topVote = cand; topVoteVerdict = candVerdict; topVoteIssue = k;
          }
        });
      }

      if (!receipts.length && !stances.length && !voteTotal) return; // no signal → not ranked

      var tierKey;
      if (contradicts > 0 && consistent > 0) tierKey = 'mixed';
      else if (contradicts > 0) tierKey = 'contradiction';
      else if (consistent > 0) tierKey = 'consistent';
      else if (flags > 0) tierKey = 'flag';
      else if (stances.length) tierKey = 'stated';
      else tierKey = 'voted';   // record, but nothing stated to check it against

      var value = 50 + consistent * 20 - contradicts * 30 - flags * 12;
      if (value < 0) value = 0; if (value > 100) value = 100;

      var top = receipts[0] || null;
      var stance = stances[0] || null;

      // Display identity — prefer the receipt's already-resolved fields.
      var d = polRec(id);
      var name = (top && top.name) || (d && d.name) || polName(id);
      var party = (top && top.party) || partyChip(d && d.party);
      var photo = (top && top.photo) || photoFor(id);
      var sub = (top && top.sub) || subFor(d);

      rows.push({
        id: id, name: name, party: party, photo: photo, sub: sub,
        state: stateOf(id),
        consistent: consistent, contradicts: contradicts, flags: flags,
        receiptCount: receipts.length,
        // Vote evidence, reported separately from receipts so a row can say which
        // kind of proof it rests on instead of blurring them into one number.
        voteCount: voteTotal,          // distinct roll calls / formal actions on this issue
        voteConsistent: voteConsistent, voteContradicts: voteContradicts,
        voteMixed: voteMixed, voteJudged: voteJudged,
        // The single strongest vote behind this row, for the citation line and the
        // one-tap landing (a measure overlay). Null when nothing was judged.
        voteCite: topVote ? {
          verdict: topVoteVerdict, issueKey: topVoteIssue,
          measureId: topVote.measureId, number: topVote.number || '',
          title: topVote.title || '', chamber: topVote.chamber || '',
          position: topVote.position || '', action: topVote.action || '',
          date: topVote.date || '', kind: topVote.kind || 'vote'
        } : null,
        // Total documented evidence — the tie-break, and what "documented" means in
        // the coverage labels once votes are part of the picture.
        evidenceCount: receipts.length + voteTotal,
        tier: TIERS[tierKey], tierKey: tierKey, value: value,
        topReceiptPid: top ? top.pid : '', topReceiptIssue: top ? (top.issueKey || '') : '',
        topHeadline: top ? top.headline : '',
        stanceWord: stance ? stanceWordOf(stance) : '',
        stanceText: stance ? (stance.text || stance.topic || '') : '',
        stanceIssue: stance ? stance.issueKey : ''
      });
    });

    // Deterministic: value, then the better-documented record, then receipts (a
    // hand-verified receipt is still the strongest single proof), then name. Every
    // term is an integer or a locale compare, so the same data always sorts the same
    // way — and with no votes loaded, evidenceCount === receiptCount and this is the
    // old comparator exactly.
    rows.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      if (b.evidenceCount !== a.evidenceCount) return b.evidenceCount - a.evidenceCount;
      if (b.receiptCount !== a.receiptCount) return b.receiptCount - a.receiptCount;
      return (a.name || '').localeCompare(b.name || '');
    });

    _rankCache[cacheKey] = rows;
    return rows;
  }

  // Per-issue coverage counts for the front door, in one pass. Vote evidence shows up
  // here for whichever issues have been loaded — the front door never triggers the
  // batched read itself, because prefetching all 13 bundles to label a card would
  // cost the visitor a lot of data for a number.
  function counts() {
    ensureFresh();
    if (_counts) return _counts;
    var out = {};
    coreIssues().forEach(function (c) { out[c.key] = { documented: 0, receipts: 0, votes: 0 }; });
    coreIssues().forEach(function (c) {
      var rows = buildRanking(c);
      var recPeople = 0, votePeople = 0;
      rows.forEach(function (r) {
        if (r.receiptCount > 0) recPeople++;
        if (r.voteCount > 0) votePeople++;
      });
      out[c.key] = { documented: rows.length, receipts: recPeople, votes: votePeople };
    });
    _counts = out;
    return out;
  }

  function totalTracked() {
    var P = G('PROFILES'), C = G('CMP_DATA');
    var n = 0;
    try { if (P) n = Math.max(n, Object.keys(P).length); } catch (e) {}
    try { if (C) n = Math.max(n, Object.keys(C).length); } catch (e) {}
    return n;
  }

  // ── coverage honesty ──────────────────────────────────────────────────────────
  // An issue we barely cover has to SAY so. Every number here is counted off the
  // same rows the ranking is built from, so a label can never claim more
  // documentation than exists:
  //   none        nobody documented on this issue at all
  //   stated-only people have stated positions, but nothing checked against a record
  //   thin        1–2 people whose words were checked against a record
  //   partial     3–6
  //   rich        7+
  // "Checked" means a sourced receipt OR a roll-call record judged against a stated
  // position — both are say-vs-do findings, so both count, and each is also reported
  // on its own (withReceipts / withVotes) so the page can name which it has. A member
  // whose votes could NOT be judged (nothing stated to check them against) is counted
  // in `people` and nowhere else: having their votes is not the same as having checked
  // them, and the labels must not imply otherwise.
  // The thresholds describe how much is on the page; they are not a score and feed
  // no ranking.
  function coverageOf(rows) {
    rows = rows || [];
    var withReceipts = 0, receipts = 0, withVotes = 0, votes = 0, checked = 0;
    rows.forEach(function (r) {
      if (r.receiptCount > 0) { withReceipts++; receipts += r.receiptCount; }
      if (r.voteCount > 0) { withVotes++; votes += r.voteCount; }
      if (r.receiptCount > 0 || r.voteJudged > 0) checked++;
    });
    var level = rows.length === 0 ? 'none'
      : checked === 0 ? 'stated-only'
      : checked <= 2 ? 'thin'
      : checked <= 6 ? 'partial' : 'rich';
    return { people: rows.length, withReceipts: withReceipts, receipts: receipts,
      withVotes: withVotes, votes: votes, checked: checked,
      pending: votesPending(), truncated: _voteTruncated,
      level: level, thin: (level === 'none' || level === 'stated-only' || level === 'thin') };
  }
  // Public read: coverage for an issue (optionally one sub-issue).
  function coverage(keyOrIssueKey, opts) {
    opts = opts || {};
    var t = resolveTarget(keyOrIssueKey, opts.focusKey);
    if (!t) return coverageOf([]);
    return coverageOf(buildRanking(t.core, t.focusKey));
  }
  // One honest sentence for a thin/empty issue. Names what IS there and what is
  // missing, rather than presenting a short list as if it were the whole picture.
  function coverageNote(cov, label) {
    var what = esc(label || 'this issue');
    // Mid-load, "nothing checked yet" would be a statement about our network timing
    // rather than about the record — so say which it is.
    var stillReading = cov.pending
      ? ' Roll-call votes for this issue are still loading; the ranking updates once they land.'
      : '';
    if (cov.level === 'none') {
      return 'No one is documented on <strong>' + what + '</strong> yet. Rather than show a ' +
        'thin or invented list, we mark the gap: this issue is on the research queue, and ' +
        'politicians appear here as their positions, votes and receipts are sourced.' + stillReading;
    }
    if (cov.level === 'stated-only') {
      return '<strong>' + cov.people + '</strong> ' + (cov.people === 1 ? 'politician has' : 'politicians have') +
        ' a stated position or a vote on <strong>' + what + '</strong>, but nothing has been checked against a ' +
        'record yet — so there is no say-vs-do verdict to rank by. Read what is here as claims and raw votes, ' +
        'not findings.' + stillReading;
    }
    if (cov.level === 'thin') {
      var how = cov.withReceipts && cov.withVotes ? 'sourced receipts or a judged voting record'
        : cov.withVotes && !cov.withReceipts ? 'a voting record judged against what they said'
        : 'sourced receipts';
      return 'Coverage of <strong>' + what + '</strong> is still thin — <strong>' + cov.checked +
        '</strong> ' + (cov.checked === 1 ? 'person' : 'people') + ' with ' + how + ', out of ' +
        cov.people + ' documented. Enough to check, not enough to call this a full picture of the issue.' + stillReading;
    }
    return '';
  }
  function coverageCalloutHTML(cov, label) {
    var msg = coverageNote(cov, label);
    if (!msg) return '';
    var title = cov.level === 'none' ? 'Not yet documented'
      : cov.level === 'stated-only' ? 'Stated positions only — nothing checked yet'
      : 'Coverage still growing';
    return '<div class="iv-cov iv-cov--' + cov.level + '">' +
      '<span class="iv-cov-ico" aria-hidden="true">' + (cov.level === 'none' ? '🌱' : '◷') + '</span>' +
      '<div class="iv-cov-body">' +
        '<div class="iv-cov-title">' + esc(title) + '</div>' +
        '<p class="iv-cov-text">' + msg + '</p>' +
      '</div>' +
    '</div>';
  }

  // ── overlay state ─────────────────────────────────────────────────────────────
  var _open = false, _coreKey = '', _focusKey = '', _fMode = 'all', _fParty = '', _fScope = 'all', _lastFocus = null;

  function meterHTML(r) {
    return '<div class="iv-meter" aria-hidden="true"><span class="iv-meter-fill ' +
      r.tier.cls + '" style="width:' + r.value + '%;"></span></div>';
  }

  // What the value is made of, in the row's own words. Receipts and votes are counted
  // together in the tiers (both are say-vs-do evidence) but named separately here, so
  // "1 broken" always has a visible source.
  function countsLine(r) {
    var parts = [];
    if (r.consistent) parts.push(r.consistent + ' kept');
    if (r.contradicts) parts.push(r.contradicts + ' broken');
    if (r.flags) parts.push(r.flags + ' flag' + (r.flags === 1 ? '' : 's'));
    if (r.voteCount) parts.push(r.voteCount + ' vote' + (r.voteCount === 1 ? '' : 's') +
      (r.voteJudged ? ' checked' : ' on record'));
    if (!parts.length && r.stanceWord) parts.push('position stated');
    return parts.join(' · ');
  }

  // Human words for the position the member actually took, so the citation reads like
  // a sentence rather than a database field.
  function voteVerbOf(c) {
    if (c.kind === 'position') return c.action ? String(c.action) : 'Acted on';
    var p = String(c.position || '').toLowerCase();
    if (p === 'yea') return 'Voted yes on';
    if (p === 'nay') return 'Voted no on';
    if (p === 'present') return 'Voted present on';
    if (p === 'not_voting') return 'Did not vote on';
    return 'Voted on';
  }
  // The one roll call behind a vote-driven verdict — named, dated, and one tap from
  // the measure itself. Nothing here is generated: every field came off the record.
  function voteCiteHTML(r) {
    var c = r.voteCite;
    if (!c) return '';
    var lead = c.verdict === 'contradicts' ? 'Against their stated position' : 'In line with their stated position';
    var what = c.number || c.title || 'this measure';
    var when = c.date ? String(c.date).slice(0, 4) : '';
    return '<div class="iv-row-vote iv-row-vote--' + esc(c.verdict) + '">' +
      '<span class="iv-row-vote-tag">' + esc(lead) + '</span> ' +
      esc(voteVerbOf(c)) + ' <strong>' + esc(what) + '</strong>' + (when ? ' (' + esc(when) + ')' : '') +
      '</div>';
  }

  function rowHTML(r, rank) {
    var party = r.party
      ? '<span class="iv-row-party" style="color:' + r.party.color + ';background:' + r.party.color +
        '22;border:1px solid ' + r.party.color + '55;">' + esc(r.party.label) + '</span>'
      : '';
    var photo = r.photo
      ? '<span class="iv-row-photo"><img src="' + escAttr(r.photo) + '" alt="" loading="lazy" ' +
        'onerror="this.style.display=\'none\';this.parentNode.textContent=\'🏛\'"></span>'
      : '<span class="iv-row-photo">🏛</span>';

    var stance = r.stanceText
      ? '<div class="iv-row-stance"><span class="iv-row-stance-w">' + esc(r.stanceWord) +
        ':</span> “' + esc(r.stanceText.length > 150 ? r.stanceText.slice(0, 148) + '…' : r.stanceText) + '”</div>'
      : '';

    // The payoff: the proof one tap away. A hand-verified receipt is the strongest
    // card, so it still wins when there is one; otherwise the deciding roll call opens
    // the measure it was cast on, and only a row with neither falls back to the profile.
    var receiptBtn;
    if (r.topReceiptPid) {
      receiptBtn = '<button type="button" class="iv-receipt-btn" data-receipt="1" ' +
        'data-pid="' + escAttr(r.topReceiptPid) + '" data-issue="' + escAttr(r.topReceiptIssue) + '">' +
        '🧾 See the receipt</button>';
    } else if (r.voteCite && r.voteCite.measureId != null) {
      receiptBtn = '<button type="button" class="iv-receipt-btn iv-receipt-btn--vote" data-measure="' +
        escAttr(String(r.voteCite.measureId)) + '">🗳 See the vote</button>';
    } else {
      receiptBtn = '<button type="button" class="iv-receipt-btn iv-receipt-btn--ghost" data-profile="1" ' +
        'data-pid="' + escAttr(r.id) + '">View profile →</button>';
    }

    return '<li class="iv-row ' + r.tier.cls + '" data-pid="' + escAttr(r.id) + '">' +
        '<span class="iv-rank">' + rank + '</span>' +
        photo +
        '<div class="iv-row-main">' +
          '<div class="iv-row-id"><span class="iv-row-name">' + esc(r.name) + '</span>' + party +
            (r.sub ? '<span class="iv-row-sub">' + esc(r.sub) + '</span>' : '') + '</div>' +
          stance +
          voteCiteHTML(r) +
          '<div class="iv-row-verdict"><span class="iv-badge ' + r.tier.cls + '">' +
            r.tier.ico + ' ' + esc(r.tier.label) + '</span>' +
            '<span class="iv-row-counts">' + esc(countsLine(r)) + '</span></div>' +
          meterHTML(r) +
        '</div>' +
        '<div class="iv-row-actions">' + receiptBtn + '</div>' +
      '</li>';
  }

  function switcherHTML(activeKey) {
    var c = counts();
    return coreIssues().map(function (ci) {
      var lab = splitLabel(ci.label);
      var n = (c[ci.key] && c[ci.key].documented) || 0;
      return '<button type="button" class="iv-chip' + (ci.key === activeKey ? ' is-active' : '') +
        '" data-core="' + escAttr(ci.key) + '" aria-pressed="' + (ci.key === activeKey) + '">' +
        '<span class="iv-chip-ico" aria-hidden="true">' + lab.icon + '</span>' +
        '<span class="iv-chip-txt">' + esc(lab.text) + '</span>' +
        '<span class="iv-chip-n">' + n + '</span></button>';
    }).join('');
  }

  function applyFilter(rows) {
    var st = _fScope === 'mine' ? userState() : '';
    return rows.filter(function (r) {
      if (st && !inUserScope(r, st)) return false;
      if (_fParty && (!r.party || r.party.key !== _fParty)) return false;
      if (_fMode === 'consistent') return r.tierKey === 'consistent' || r.tierKey === 'mixed';
      if (_fMode === 'contradiction') return r.tierKey === 'contradiction' || r.tierKey === 'flag';
      return true;
    });
  }

  // The issue the overlay is currently ranking — a core bundle, or one sub-issue
  // inside it. Both share the same ranking code; only the title and the keys differ.
  function activeIssue() {
    var core = coreByKey(_coreKey);
    if (!core) return null;
    var coreLab = splitLabel(core.label);
    if (_focusKey) {
      var fl = splitLabel(keyLabel(_focusKey));
      return { core: core, focusKey: _focusKey, icon: fl.icon, text: fl.text,
        parent: coreLab.text, blurb: '' };
    }
    return { core: core, focusKey: '', icon: coreLab.icon, text: coreLab.text,
      parent: '', blurb: core.blurb || '' };
  }

  function renderBody() {
    var iss = activeIssue();
    var host = el('iv-body');
    if (!iss || !host) return;
    // Load this issue's roll-call evidence for the WHOLE field before it matters —
    // one batched request per issue-key set, not one per member and not "whoever is
    // already warm". The first paint below is receipt-and-stance based (instant); when
    // the batch lands, refresh() rebuilds this ranking once with votes folded in.
    warmVotes(iss.core, iss.focusKey, function (added) { if (added) refresh(); });
    var all = buildRanking(iss.core, iss.focusKey);
    var rows = applyFilter(all);
    var cov = coverageOf(all);
    var st = userState();

    // Honest coverage first, so a thin issue is framed before it is read. This
    // never suppresses the rows — it labels what they are worth.
    var covHTML = coverageCalloutHTML(cov, iss.text);

    var listHTML;
    if (rows.length) {
      listHTML = '<ol class="iv-list">' + rows.map(function (r, i) { return rowHTML(r, i + 1); }).join('') + '</ol>';
    } else if (_fScope === 'mine' && st && all.length) {
      // A local scope that comes up empty is a fact about coverage, not a dead end:
      // say it plainly and offer the national view rather than an empty wall.
      listHTML = '<div class="iv-empty iv-empty--scope">' +
        '<div class="iv-empty-t">No one from ' + esc(st) + ' is documented on ' + esc(iss.text) + ' yet</div>' +
        '<p class="iv-empty-p">' + all.length + ' ' + (all.length === 1 ? 'politician is' : 'politicians are') +
          ' documented on this issue nationally. Local coverage is still being built — ' +
          'we would rather show you that gap than an empty list.</p>' +
        '<button type="button" class="iv-empty-btn" data-fscope="all">See everywhere instead →</button>' +
      '</div>';
    } else if (all.length) {
      listHTML = '<div class="iv-empty">' +
        '<div class="iv-empty-t">No one matches this filter on ' + esc(iss.text) + '</div>' +
        '<p class="iv-empty-p">' + all.length + ' ' + (all.length === 1 ? 'person is' : 'people are') +
          ' ranked here without it.</p>' +
        '<button type="button" class="iv-empty-btn" data-fmode="all">Clear the filter →</button>' +
      '</div>';
    } else {
      // Nothing at all — the coverage callout above already says so honestly, so
      // this only offers the way out.
      listHTML = '<div class="iv-empty">' +
        '<p class="iv-empty-p">Try another issue below, or search for a politician by name.</p>' +
      '</div>';
    }

    // The counted read: what is on this page, what is not, and where the signal
    // comes from. Only claims numbers we just counted.
    var coverage = '';
    if (all.length) {
      var total = totalTracked();
      var undocumented = Math.max(0, total - all.length);
      var shown = (rows.length !== all.length) ? ('Showing <strong>' + rows.length + '</strong> of ') : 'Ranking ';
      // Where the signal came from, in the plural the data actually supports.
      var basis = (cov.withReceipts && cov.withVotes) ? 'sourced say-vs-do receipts and roll-call votes'
        : cov.withVotes ? 'roll-call votes checked against stated positions'
        : 'sourced say-vs-do receipts';
      coverage = '<div class="iv-coverage">' + shown + '<strong>' + all.length + '</strong> documented on this issue' +
        (cov.withReceipts ? ' · <strong>' + cov.withReceipts + '</strong> with sourced receipts' : '') +
        (cov.withVotes ? ' · <strong>' + cov.withVotes + '</strong> with a voting record on it' : '') +
        (undocumented > 0 ? ' · <span class="iv-cov-thin">' + undocumented +
          ' more tracked, not yet documented here</span>' : '') +
        ' · consistency is measured from ' + basis + '.' +
        // Never let an in-flight or clipped read pass for a finished one.
        (cov.pending ? ' <span class="iv-cov-thin">Checking the voting record…</span>' : '') +
        (cov.truncated ? ' <span class="iv-cov-thin">The vote read hit its row limit, so some roll calls are ' +
          'not counted here yet.</span>' : '') +
        '</div>';
    }

    // Issue-area distributional summary ("who this issue's measures affect"),
    // merged across the core issue's component keys. Self-hydrating placeholder;
    // hidden until data lands, so it adds nothing when no measure is scored.
    var impactPh = '';
    try {
      var _ph = window._pdxIssueImpactsPlaceholder;
      var _phKeys = iss.focusKey ? iss.focusKey : (iss.core.keys || []).join(',');
      if (typeof _ph === 'function') impactPh = _ph(_phKeys) || '';
    } catch (e) { impactPh = ''; }

    host.innerHTML = covHTML + coverage + impactPh + listHTML;
  }

  function renderChrome() {
    var iss = activeIssue();
    var ov = el('pdx-issue-overlay');
    if (!iss || !ov) return;
    var st = userState();

    // When the ranking is narrowed to one sub-issue, say which bundle it sits in
    // and offer the widening in one tap — precise by default, never a trap.
    var focusBar = iss.focusKey
      ? '<div class="iv-focus">' +
          '<span class="iv-focus-tag">Narrowed to one issue</span>' +
          '<span class="iv-focus-txt">Part of ' + esc(iss.parent) + '</span>' +
          '<button type="button" class="iv-focus-btn" data-widen="1">Widen to all of ' + esc(iss.parent) + ' →</button>' +
        '</div>'
      : '';

    // The scope control exists only when the visitor has saved a location, and its
    // label is whatever state they saved — the ranking is national otherwise.
    var scopeSet = st
      ? '<div class="iv-filter-set">' +
          '<button type="button" class="iv-fbtn' + (_fScope === 'all' ? ' is-on' : '') + '" data-fscope="all">🌐 Everywhere</button>' +
          '<button type="button" class="iv-fbtn' + (_fScope === 'mine' ? ' is-on' : '') + '" data-fscope="mine">📍 ' + esc(st) + ' + national</button>' +
        '</div>'
      : '';

    ov.querySelector('.iv-panel').innerHTML =
      '<div class="iv-topbar">' +
        '<div class="iv-eyebrow">🏛 Issue · ranked by consistency</div>' +
        '<button type="button" class="iv-share" data-share="1" aria-label="Copy a link to this ranking">🔗 Share</button>' +
        '<button type="button" class="iv-close" aria-label="Close issue view">✕</button>' +
      '</div>' +
      '<header class="iv-head">' +
        '<div class="iv-head-ico" aria-hidden="true">' + iss.icon + '</div>' +
        '<div class="iv-head-txt">' +
          '<h2 class="iv-title">' + esc(iss.text) + '</h2>' +
          '<p class="iv-blurb">Where every tracked politician stands — ranked by who <strong>backs up their words</strong> ' +
            'and who <strong>says one thing and does another</strong>. ' + esc(iss.blurb) + '</p>' +
        '</div>' +
      '</header>' +
      focusBar +
      '<div class="iv-switcher-wrap"><div class="iv-switcher" role="tablist" aria-label="Choose an issue">' +
        switcherHTML(_coreKey) + '</div></div>' +
      '<div class="iv-filters" role="group" aria-label="Filter the ranking">' +
        '<div class="iv-filter-set">' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'all' ? ' is-on' : '') + '" data-fmode="all">All</button>' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'consistent' ? ' is-on' : '') + '" data-fmode="consistent">✓ Backs it up</button>' +
          '<button type="button" class="iv-fbtn' + (_fMode === 'contradiction' ? ' is-on' : '') + '" data-fmode="contradiction">⚠ Contradictions</button>' +
        '</div>' +
        '<div class="iv-filter-set">' +
          '<button type="button" class="iv-fbtn' + (_fParty === '' ? ' is-on' : '') + '" data-fparty="">Any party</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--R' + (_fParty === 'R' ? ' is-on' : '') + '" data-fparty="R">R</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--D' + (_fParty === 'D' ? ' is-on' : '') + '" data-fparty="D">D</button>' +
          '<button type="button" class="iv-fbtn iv-fbtn--I' + (_fParty === 'I' ? ' is-on' : '') + '" data-fparty="I">Ind</button>' +
        '</div>' +
        scopeSet +
      '</div>' +
      '<div class="iv-body" id="iv-body"></div>';
    renderBody();
  }

  function ensureOverlay() {
    var ov = el('pdx-issue-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'pdx-issue-overlay';
    ov.className = 'iv-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Issue ranking');
    ov.innerHTML = '<div class="iv-panel" role="document"></div>';
    document.body.appendChild(ov);

    // One delegated handler for the whole overlay.
    ov.addEventListener('click', function (e) {
      var t = e.target;
      if (t === ov || (t.closest && t.closest('.iv-close'))) { close(); return; }
      var sh = t.closest && t.closest('[data-share]');
      if (sh) { e.stopPropagation(); shareRanking(); return; }
      var wd = t.closest && t.closest('[data-widen]');
      // Widening drops the sub-issue focus but keeps the lens and scope the voter set.
      if (wd) { _focusKey = ''; _syncHash(); renderChrome(); scrollTop(); return; }
      var chip = t.closest && t.closest('.iv-chip');
      if (chip) { _coreKey = chip.getAttribute('data-core'); _focusKey = ''; _syncHash(); renderChrome(); scrollTop(); return; }
      var fm = t.closest && t.closest('[data-fmode]');
      if (fm) { _fMode = fm.getAttribute('data-fmode'); _syncHash(); renderChrome(); return; }
      var fp = t.closest && t.closest('[data-fparty]');
      if (fp) { _fParty = fp.getAttribute('data-fparty'); renderChrome(); return; }
      var fs = t.closest && t.closest('[data-fscope]');
      if (fs) { _fScope = fs.getAttribute('data-fscope'); _syncHash(); renderChrome(); return; }
      var rc = t.closest && t.closest('[data-receipt]');
      if (rc) {
        e.stopPropagation();
        var R = G('PDXReceipts');
        if (R && typeof R.open === 'function') R.open(rc.getAttribute('data-pid'), rc.getAttribute('data-issue'));
        return;
      }
      // A vote-driven row lands on the measure it was cast on — the bill overlay shows
      // the roll call, the issue mapping and every other member's vote on it.
      var mb = t.closest && t.closest('[data-measure]');
      if (mb) {
        e.stopPropagation();
        var BD = G('PDXBillDetail');
        if (BD && typeof BD.open === 'function') BD.open(mb.getAttribute('data-measure'));
        return;
      }
      var row = t.closest && t.closest('.iv-row, [data-profile]');
      if (row) {
        var pid = (t.closest('[data-profile]') || row).getAttribute('data-pid');
        if (pid && typeof window.showProfile === 'function') { close(); window.showProfile(pid); }
      }
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    return ov;
  }

  function scrollTop() { var b = el('iv-body'); if (b) { try { b.scrollTo({ top: 0 }); } catch (x) { b.scrollTop = 0; } } }

  function open(keyOrIssueKey, opts) {
    opts = opts || {};
    var t = resolveTarget(keyOrIssueKey, opts.focusKey);
    if (!t) { var first = coreIssues()[0]; if (!first) return; t = { core: first, focusKey: '' }; }
    _coreKey = t.core.key;
    _focusKey = t.focusKey || '';
    _fMode = (opts.mode === 'consistent' || opts.mode === 'contradiction') ? opts.mode : 'all';
    _fParty = (opts.party === 'R' || opts.party === 'D' || opts.party === 'I') ? opts.party : '';
    // A local scope is only honoured when we actually know the visitor's state.
    _fScope = (opts.scope === 'mine' && userState()) ? 'mine' : 'all';
    _lastFocus = document.activeElement;
    // Record this stop on the guided spine.
    try {
      if (window.PDXJourney && typeof window.PDXJourney.record === 'function') {
        var iss = activeIssue();
        window.PDXJourney.record('issue', { label: iss ? iss.text : t.core.key, icon: iss ? iss.icon : '🎯',
          nav: { type: 'issue', key: _focusKey || _coreKey } });
      }
    } catch (e) {}
    var ov = ensureOverlay();
    renderChrome();
    ov.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _open = true;
    _syncHash();
    var cb = ov.querySelector('.iv-close'); if (cb) { try { cb.focus(); } catch (e) {} }
  }

  function close() {
    var ov = el('pdx-issue-overlay');
    if (ov) ov.classList.remove('is-open');
    document.body.style.overflow = '';
    _open = false;
    // Clear our own hash marker without disturbing other navigation.
    if (/^#issue(s|=)/.test(location.hash)) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    }
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
    _lastFocus = null;
  }

  // ── shareable deep links ──────────────────────────────────────────────────────
  // The whole state a reader needs to land on the same ranking travels in the hash:
  // the issue, the sub-issue it is narrowed to, the lens, and the scope. Everything
  // except the issue is omitted when it is the default, so a plain issue link stays
  // clean and readable.
  function hashFor(o) {
    o = o || {};
    var core = o.coreKey || _coreKey;
    var parts = ['issue=' + encodeURIComponent(core)];
    var f = (o.focusKey !== undefined) ? o.focusKey : _focusKey;
    var m = (o.mode !== undefined) ? o.mode : _fMode;
    var s = (o.scope !== undefined) ? o.scope : _fScope;
    if (f) parts.push('key=' + encodeURIComponent(f));
    if (m && m !== 'all') parts.push('mode=' + encodeURIComponent(m));
    if (s && s !== 'all') parts.push('scope=' + encodeURIComponent(s));
    return '#' + parts.join('&');
  }
  function linkFor(o) {
    try { return location.origin + location.pathname + hashFor(o); } catch (e) { return hashFor(o); }
  }
  function _syncHash() {
    try { history.replaceState(null, '', location.pathname + location.search + hashFor()); } catch (e) {}
  }
  function toast(msg) { try { if (typeof window._showToast === 'function') window._showToast(msg); } catch (e) {} }
  // The link that LEAVES the device. In-app links (linkFor / _syncHash above) stay
  // on the hash, because that is what this view reads and what every already-shared
  // link still uses. But a hash is invisible to a server, so a pasted ranking link
  // could only ever unfurl as the generic site card — the query form carries the
  // same issue, sub-issue, lens and scope somewhere the edge can read and preview,
  // and share-links.js rebuilds the identical hash on arrival.
  function shareLink() {
    try {
      var links = window.PDXShareLinks;
      if (links && links.rank) {
        return links.rank(_coreKey, { key: _focusKey, mode: _fMode, scope: _fScope });
      }
    } catch (e) {}
    return linkFor();
  }
  function shareRanking() {
    var iss = activeIssue();
    var url = shareLink();
    var title = iss ? ('Who backs up their words on ' + iss.text + ' — PolitiDex') : 'PolitiDex issue ranking';
    try {
      if (navigator.share) {
        navigator.share({ title: title, text: title, url: url }).catch(function () {});
        return;
      }
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('Link copied — it opens this exact ranking ✓'); })
          .catch(function () { toast(url); });
        return;
      }
    } catch (e) {}
    toast(url);
  }

  // ── search bridge (feeds the global search box) ───────────────────────────────
  // Return the core issues whose label / blurb / bundled ISSUE_MAP keywords match
  // the query, so typing "guns" or "cost of living" offers an "issue ranking".
  //
  // Each hit also reports WHICH sub-issue matched, when one did. That is the whole
  // difference between "housing" opening a 21-key economy bundle and "housing"
  // opening housing: the caller passes the focusKey straight back into open().
  //
  // People type plurals the vocabulary doesn't use ("guns" for "gun rights",
  // "taxes" for "tax"), so every query is also tried in a de-pluralised form. It
  // is matching leniency only — no term is invented and no issue is renamed.
  function variants(q) {
    var out = [q];
    var alt = '';
    if (/ies$/.test(q)) alt = q.replace(/ies$/, 'y');
    else if (/(ses|xes|zes|ches|shes)$/.test(q)) alt = q.replace(/es$/, '');
    else if (/s$/.test(q) && !/ss$/.test(q)) alt = q.replace(/s$/, '');
    if (alt && alt.length >= 3 && out.indexOf(alt) === -1) out.push(alt);
    return out;
  }
  // Best score for `text` against any variant, using the caller's tiers:
  // [exact, starts-with, contains]. A "contains" hit only counts at a WORD
  // boundary — otherwise "ann" reaches "cannabis" and a person's name produces a
  // bogus issue.
  function scoreText(text, qs, tiers) {
    var best = 0;
    for (var i = 0; i < qs.length; i++) {
      var at = -1, from = 0;
      while ((at = text.indexOf(qs[i], from)) !== -1) {
        if (at === 0 || !/[a-z0-9]/.test(text.charAt(at - 1))) break;
        from = at + 1;
      }
      if (at === -1) continue;
      var s = (text === qs[i]) ? tiers[0] : (at === 0 ? tiers[1] : tiers[2]);
      // A variant match is a slightly weaker signal than the literal query.
      if (i > 0) s -= 5;
      if (s > best) best = s;
    }
    return best;
  }
  function searchIssues(q, limit) {
    q = String(q || '').toLowerCase().trim();
    if (q.length < 2) return [];
    var qs = variants(q);
    var IM = G('ISSUE_MAP') || {};
    var out = [];
    coreIssues().forEach(function (ci) {
      var lab = splitLabel(ci.label);
      var hay = (lab.text + ' ' + (ci.blurb || '')).toLowerCase();
      // A core-level hit is the strongest: the voter named the bundle itself.
      var score = scoreText(hay, qs, [100, 100, 80]);
      var focusKey = '', focusLabel = '', focusScore = 0;
      for (var i = 0; i < (ci.keys || []).length; i++) {
        var k = ci.keys[i], def = IM[k];
        if (!def) continue;
        var s = scoreText(String(def.label || '').toLowerCase(), qs, [95, 70, 55]);
        if (!s) {
          var kw = def.keywords || [];
          for (var j = 0; j < kw.length; j++) {
            s = scoreText(String(kw[j]).toLowerCase(), qs, [60, 45, 30]);
            if (s) break;
          }
        }
        if (s > focusScore) { focusScore = s; focusKey = k; focusLabel = def.label || prettyName(k); }
      }
      // The bundle's own name winning outright means the voter asked about the
      // bundle, so we do not narrow. Otherwise the best sub-issue is the answer.
      if (focusScore && focusScore <= score) { focusKey = ''; focusLabel = ''; }
      if (focusScore > score) score = focusScore;
      if (score > 0) {
        out.push({
          key: ci.key, icon: lab.icon, label: lab.text, blurb: ci.blurb || '',
          focusKey: focusKey, focusLabel: focusLabel, score: score
        });
      }
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 4);
  }

  // ── question → issue + lens ───────────────────────────────────────────────────
  // A voter arrives with a sentence, not a taxonomy key. "Who actually backs
  // housing?" and "who's contradictory on immigration" both name an issue AND a
  // lens. We resolve the issue with the search bridge above and pick a lens that
  // ALREADY EXISTS as a filter — no new scoring, no new ordering.
  var LENS = [
    { mode: 'contradiction', re: /\b(contradict\w*|hypocri\w*|flip[\s-]?flop\w*|two[\s-]?faced|says? one thing|liar|lying|lies|inconsisten\w*|betray\w*|broke\w* (?:their |his |her )?promis\w*)\b/ },
    { mode: 'consistent', re: /\b(actually|really|truly|back(?:s|ed)? (?:it )?up|backs? it|deliver\w*|follow(?:s|ed)? through|keeps? (?:their |his |her )?word|consisten\w*|reliab\w*|trustworth\w*|genuin\w*|walk(?:s|ed)? the walk)\b/ }
  ];
  // Words that carry no issue meaning — stripping them stops "who backs housing"
  // from matching an issue on the word "who".
  var STOP = /\b(who|whom|whose|what|which|where|when|why|how|is|are|was|were|does|do|did|the|a|an|on|in|of|for|about|with|and|or|to|from|my|our|their|his|her|its|really|actually|truly|most|more|best|worst|any|some|show|find|list|me|us|tell|voted?|vote|votes|stance|stances|position|positions|record|records|receipt|receipts|politician|politicians|senator|senators|rep|reps|representative|representatives|congress|near|local|state|here|now|please)\b/g;
  // The lens vocabulary itself is not an issue. Left in, "who backs housing" could
  // reach the guns bundle through "back" → "background checks" — the lens word
  // winning over the actual subject. It has already been read as a lens above, so
  // it is removed before we look for the issue.
  var LENS_WORDS = /\b(backs?|backed|backing|deliver\w*|follows?|followed|through|keeps?|kept|word|words|action|actions|consisten\w*|inconsisten\w*|reliab\w*|trustworth\w*|genuin\w*|contradict\w*|hypocri\w*|flip|flop|flops|flopped|two|faced|liar|lying|lies|betray\w*|promis\w*|walks?|walked|stands?|stood|say|says|said|do|done|up|it|one|thing|things|actual\w*)\b/g;

  function parseQuestion(raw) {
    var q = String(raw || '').toLowerCase().trim();
    if (!q) return null;

    var mode = 'all';
    for (var i = 0; i < LENS.length; i++) { if (LENS[i].re.test(q)) { mode = LENS[i].mode; break; } }
    // "near me" / "in my state" asks for the local cut — only meaningful when we
    // actually know where they are.
    var wantsLocal = /\b(near me|my state|my area|around here|locally|in my district|my district|my town|my city)\b/.test(q);

    // Strip the question scaffolding and the lens words, then try the longest,
    // most specific phrases first so "cost of living" beats "cost" and no stray
    // fragment outranks the actual subject.
    var cleaned = q.replace(/[?!.,;:"'’]/g, ' ').replace(STOP, ' ').replace(LENS_WORDS, ' ').replace(/\s+/g, ' ').trim();
    var words = cleaned ? cleaned.split(' ') : [];
    var tries = [];
    if (cleaned) tries.push(cleaned);
    for (var n = Math.min(words.length, 4); n >= 2; n--) {
      for (var s = 0; s + n <= words.length; s++) {
        var phrase = words.slice(s, s + n).join(' ');
        if (phrase.length >= 3 && tries.indexOf(phrase) === -1) tries.push(phrase);
      }
    }
    // Single words last, longest first — the longer word is the more specific one.
    words.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (w) {
      if (w.length >= 3 && tries.indexOf(w) === -1) tries.push(w);
    });
    // Finally the raw query, in case the stopword pass ate something meaningful.
    if (tries.indexOf(q) === -1) tries.push(q);

    var hit = null;
    for (var t = 0; t < tries.length && !hit; t++) {
      var res = searchIssues(tries[t], 1);
      // A very short fragment has to match strongly (a label or an exact keyword),
      // never by landing inside a longer word.
      if (res.length && (tries[t].length >= 5 || res[0].score >= 45)) hit = res[0];
    }
    if (!hit) return null;

    var target = resolveTarget(hit.key, hit.focusKey);
    if (!target) return null;
    var focusKey = target.focusKey;
    // A focused sub-issue carries its own emoji in its label — split it so the
    // caller gets one icon and clean text, exactly like the overlay header.
    var fl = focusKey ? splitLabel(keyLabel(focusKey)) : null;
    return {
      coreKey: target.core.key,
      focusKey: focusKey,
      mode: mode,
      scope: (wantsLocal && userState()) ? 'mine' : 'all',
      icon: (fl && fl.icon) ? fl.icon : hit.icon,
      label: fl ? fl.text : hit.label,
      parentLabel: focusKey ? hit.label : '',
      blurb: hit.blurb || ''
    };
  }

  // A search surface can render the whole answer inline: the issue we understood,
  // the ranked rows for it, and how honest that ranking can afford to be.
  function answer(raw, limit) {
    var p = parseQuestion(raw);
    if (!p) return null;
    var core = coreByKey(p.coreKey);
    if (!core) return null;
    // Same prefetch as the overlay: the answer renders immediately from what is in
    // memory, and a 'pdx-issue-votes' event fires when the batched roll-call read for
    // this issue lands so the caller can ask again with votes counted.
    warmVotes(core, p.focusKey);
    var all = buildRanking(core, p.focusKey);
    var rows = all;
    if (p.scope === 'mine') {
      var st = userState();
      var scoped = all.filter(function (r) { return inUserScope(r, st); });
      // Never trap the answer in a local wall — fall back to everywhere and say so.
      if (scoped.length) rows = scoped; else p.scopeFellBack = true;
    }
    if (p.mode === 'consistent') {
      var c = rows.filter(function (r) { return r.tierKey === 'consistent' || r.tierKey === 'mixed'; });
      if (c.length) rows = c; else p.modeFellBack = true;
    } else if (p.mode === 'contradiction') {
      var d = rows.filter(function (r) { return r.tierKey === 'contradiction' || r.tierKey === 'flag'; });
      if (d.length) rows = d; else p.modeFellBack = true;
    }
    p.total = all.length;
    p.rows = rows.slice(0, limit || 3);
    p.matched = rows.length;
    p.state = (p.scope === 'mine') ? userState() : '';
    p.coverage = coverageOf(all);
    // Honest about being mid-load: a ranking computed before the roll-call batch lands
    // is a receipts-only ranking, and the caller can say so rather than imply final.
    p.votesPending = votesPending();
    p.link = linkFor({ coreKey: p.coreKey, focusKey: p.focusKey, mode: p.mode, scope: p.scope });
    return p;
  }

  // ── front door ────────────────────────────────────────────────────────────────
  function mountFrontDoor() {
    var host = el('issue-front-door');
    if (!host) return;
    var list = coreIssues();
    if (!list.length) { host.hidden = true; return; }
    var c = counts();
    var total = totalTracked();

    var cards = list.map(function (ci) {
      var lab = splitLabel(ci.label);
      var n = (c[ci.key] && c[ci.key].documented) || 0;
      var rec = (c[ci.key] && c[ci.key].receipts) || 0;
      var vot = (c[ci.key] && c[ci.key].votes) || 0;
      return '<button type="button" class="ifd-card" data-core="' + escAttr(ci.key) + '">' +
        '<span class="ifd-ico" aria-hidden="true">' + lab.icon + '</span>' +
        '<span class="ifd-txt">' +
          '<span class="ifd-label">' + esc(lab.text) + '</span>' +
          '<span class="ifd-blurb">' + esc(ci.blurb || '') + '</span>' +
          '<span class="ifd-meta">' + n + ' ranked' + (rec ? ' · ' + rec + ' with receipts' : '') +
            (vot ? ' · ' + vot + ' with votes' : '') + '</span>' +
        '</span>' +
        '<span class="ifd-go" aria-hidden="true">→</span>' +
      '</button>';
    }).join('');

    host.innerHTML =
      '<div class="ifd-inner">' +
        '<div class="ifd-head">' +
          '<div class="ifd-eyebrow">🧭 Start with an issue</div>' +
          '<h2 class="ifd-title">Where does <em>everyone</em> stand?</h2>' +
          '<p class="ifd-lead">Pick an issue and see every tracked politician ranked by <strong>consistency</strong> — ' +
            'who backs up their words, and who says one thing and does another. The receipt is one tap away.</p>' +
        '</div>' +
        '<div class="ifd-grid">' + cards + '</div>' +
        '<p class="ifd-foot">' + total + ' politicians tracked · rankings are built from sourced say-vs-do receipts, ' +
          'roll-call votes and stated positions · nonpartisan.</p>' +
      '</div>';
    host.hidden = false;

    if (!host._ifdBound) {
      host._ifdBound = true;
      host.addEventListener('click', function (e) {
        var card = e.target.closest && e.target.closest('.ifd-card');
        if (card) open(card.getAttribute('data-core'));
      });
    }
  }

  function refresh() {
    _key = ''; ensureFresh();
    if (el('issue-front-door')) { try { mountFrontDoor(); } catch (e) {} }
    if (_open) renderChrome();
  }

  // ── deep-link support ────────────────────────────────────────────────────────
  // #issue=<core>[&key=<sub-issue>][&mode=consistent|contradiction][&scope=mine]
  // Older links carrying only #issue=<core> keep working untouched.
  function handleHash() {
    var h = location.hash || '';
    var m = h.match(/^#issue=([^&]+)(.*)$/);
    if (m) {
      var rest = m[2] || '';
      function param(name) {
        var r = rest.match(new RegExp('[&]' + name + '=([^&]*)'));
        try { return r ? decodeURIComponent(r[1]) : ''; } catch (e) { return r ? r[1] : ''; }
      }
      open(decodeURIComponent(m[1]), { focusKey: param('key'), mode: param('mode'), scope: param('scope') });
      return;
    }
    if (/^#issues?$/.test(h)) {
      var fd = el('issue-front-door');
      if (fd && typeof fd.scrollIntoView === 'function') fd.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.PDXIssueView = {
    open: open,
    close: close,
    mountFrontDoor: mountFrontDoor,
    searchIssues: searchIssues,
    parseQuestion: parseQuestion,
    answer: answer,
    coverage: coverage,
    coverageNote: coverageNote,
    linkFor: linkFor,
    buildRanking: buildRanking,
    // Prefetch an issue's roll-call evidence without rendering anything — a surface
    // about to show a ranking can call this first, or listen for 'pdx-issue-votes'.
    warmVotes: function (keyOrIssueKey, focusKey) {
      var t = resolveTarget(keyOrIssueKey, focusKey);
      if (t) warmVotes(t.core, t.focusKey);
    },
    votesPending: votesPending,
    refresh: refresh
  };

  // ── boot ───────────────────────────────────────────────────────────────────────
  function boot() {
    try { mountFrontDoor(); } catch (e) {}
    try { handleHash(); } catch (e) {}
    window.addEventListener('hashchange', function () { try { handleHash(); } catch (e) {} });
    // Re-render once the live roster + receipts resolve (names, photos, counts).
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var k = dataKey();
      if (k !== _key) { try { refresh(); } catch (e) {} }
      if (tries >= 8) clearInterval(t);
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
