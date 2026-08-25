/* ═══════════════════════════════════════════════════════════════════════════
   ISSUE COMPARISON  ·  issue-compare.js
   ---------------------------------------------------------------------------
   An issue-first way to compare politicians on ONE topic at a time: pick an
   issue (ideally one you just took a stance on), pick a field of politicians,
   and see — for that single issue — each one's stated position AND whether
   their voting record actually backs it up (Say-vs-Do). It sits between My
   Stances, the Alignment Tool, and the side-by-side comparison, and is the
   natural next step after setting a stance ("you took a position on X — see
   who actually lines up").

   Owns NO data. Composes existing systems (every call guarded):
     • Saved stances ......... window.PDXStances.all()/.get()/.open()
     • Issue vocabulary ...... window.ISSUE_MAP / window._issueLabel /
                               window._alignCoverage / _alignQuickPicks /
                               CORE_NATIONAL_ISSUES
     • Stated position ....... window._polPositionMap(pid, CMP_DATA[pid])
     • Single-issue Say-vs-Do  window._pdxRecordIssueSummary(pid, issueKey)
     • Warm voting records ... window.PDXVotingRecord.memberRecords/fetchCompare
     • Fields ................ window.PDXTeamView (roster/bySeat/representsMe),
                               window.CMP_DATA, favorites, _currentVoterLocation
     • Actions ............... window.mypolToggleAnimated (add/remove team),
                               window.showProfile, window._cmpSelected +
                               window.chubToggle + window.openCompare
   Additive and non-breaking: a missing dependency degrades to a calm empty or
   "limited record" state — it never invents data. Mobile-first. Reuses the
   dual-score language (⚖️ Say-vs-Do, ⚑ contradictions, verdict colours).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueCompare) return;

  var MOUNT = 'ic-body';
  var HASH = '#issue-compare';
  var LS = 'pdx_issue_compare_v1';
  var MAX_CARDS = 60;               // cap the rendered field for perf/clarity
  var WARM_BATCH = 40;

  var _inited = false, _bound = false, _renderQueued = false;
  var _state = { issueKey: '', field: 'team', party: 'all', q: '', pickerOpen: false };
  var _warmTried = {};              // pid → true once a warm attempt settled
  var _warmReq = {};                // pid → true while queued/in flight
  var _warmQueue = [];
  var _warmTimer = null;

  /* ── tiny utils ─────────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function isFn(f) { return typeof f === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsAttr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '👤';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

  /* ── persistence ────────────────────────────────────────────────────── */
  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(LS) || '{}'); if (s && typeof s === 'object') { if (s.issueKey) _state.issueKey = String(s.issueKey); if (s.field) _state.field = String(s.field); } } catch (e) {}
  }
  function saveState() { try { localStorage.setItem(LS, JSON.stringify({ issueKey: _state.issueKey, field: _state.field })); } catch (e) {} }

  /* ── data readers (all guarded) ─────────────────────────────────────── */
  function savedStances() { try { return (window.PDXStances && isFn(window.PDXStances.all)) ? (window.PDXStances.all() || []) : []; } catch (e) { return []; } }
  function myStanceOn(k) { try { return (window.PDXStances && isFn(window.PDXStances.get)) ? window.PDXStances.get(k) : null; } catch (e) { return null; } }
  function issueLabel(k) { try { if (isFn(window._issueLabel)) { var l = window._issueLabel(k); if (l) return l; } } catch (e) {} try { if (window.ISSUE_MAP && window.ISSUE_MAP[k]) return window.ISSUE_MAP[k].label || k; } catch (e) {} return k || ''; }
  function issueMap() { return (window.ISSUE_MAP && typeof window.ISSUE_MAP === 'object') ? window.ISSUE_MAP : {}; }
  function coverage() { try { return (isFn(window._alignCoverage)) ? (window._alignCoverage() || { byIssue: {} }) : { byIssue: {} }; } catch (e) { return { byIssue: {} }; } }
  function cmp(pid) { try { return (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) { return null; } }
  function quickPicks() { try { return Array.isArray(window._alignQuickPicks) ? window._alignQuickPicks : []; } catch (e) { return []; } }

  function positionOnIssue(pid, issueKey) {
    try {
      if (!isFn(window._polPositionMap)) return null;
      var pm = window._polPositionMap(pid, cmp(pid)) || {};
      return pm[issueKey] || null;   // { stance, topic, text, icon, source }
    } catch (e) { return null; }
  }
  function recordSummary(pid, issueKey) {
    try { return isFn(window._pdxRecordIssueSummary) ? window._pdxRecordIssueSummary(pid, issueKey) : null; } catch (e) { return null; }
  }
  function recordsWarm(pid) {
    try { return !!(window.PDXVotingRecord && isFn(window.PDXVotingRecord.memberRecords) && window.PDXVotingRecord.memberRecords(pid)); } catch (e) { return false; }
  }

  function location() { try { return window._currentVoterLocation || null; } catch (e) { return null; } }
  function hasLocation() { try { return !!window._hasUserLocation; } catch (e) { return false; } }

  function teamPids() {
    var out = [], seen = {};
    function add(pid) { pid = pid && String(pid); if (pid && !seen[pid]) { seen[pid] = 1; out.push(pid); } }
    try { if (window.PDXTeamView && isFn(window.PDXTeamView.roster)) (window.PDXTeamView.roster() || []).forEach(add); } catch (e) {}
    try { if (window.PDXTeamView && isFn(window.PDXTeamView.bySeat)) { var m = window.PDXTeamView.bySeat() || {}; Object.keys(m).forEach(function (k) { add(m[k]); }); } } catch (e) {}
    return out;
  }
  function representsMePids() {
    var out = [];
    try {
      if (window.PDXTeamView && isFn(window.PDXTeamView.representsMe)) {
        (window.PDXTeamView.representsMe(location()) || []).forEach(function (r) { if (r && r.pid) out.push(String(r.pid)); });
      }
    } catch (e) {}
    return out;
  }
  function favoritePids() {
    var out = [];
    try { if (window._favoritePids && isFn(window._favoritePids.forEach)) window._favoritePids.forEach(function (p) { out.push(String(p)); }); } catch (e) {}
    if (!out.length) { try { var a = JSON.parse(localStorage.getItem('politidex_my_politicians') || '[]'); if (Array.isArray(a)) a.forEach(function (p) { out.push(String(p)); }); } catch (e) {} }
    return out;
  }
  function allPids() { try { return window.CMP_DATA ? Object.keys(window.CMP_DATA) : []; } catch (e) { return []; } }
  function onTeam(pid) { var t = teamPids(); return t.indexOf(String(pid)) >= 0; }

  // Resolve the working field to a de-duped pid list.
  function fieldPids(field, issueKey) {
    var out = [], seen = {};
    function add(pid) { pid = pid && String(pid); if (pid && !seen[pid]) { seen[pid] = 1; out.push(pid); } }
    if (field === 'team') { teamPids().forEach(add); return out; }
    if (field === 'relevant') { representsMePids().forEach(add); favoritePids().forEach(add); teamPids().forEach(add); return out; }
    // all tracked — scope to those with a documented position OR a warm record on
    // THIS issue (otherwise the field is thousands of "no position" cards), then
    // apply party/search filters.
    var everyone = allPids();
    everyone.forEach(function (pid) {
      // THE RECORD IS ASKED FIRST, AND ASKED ALWAYS. This line used to read
      // `hasPos ? null : recordSummary(...)`: the formal record was consulted only
      // for a member nobody had sourced a quote for. It admitted the same people
      // either way, so nothing about the field changes here — but it encoded the
      // backwards priority in the one function that decides what a comparison is
      // even made of, and every reader of this file learned it from there.
      var pos = positionOnIssue(pid, issueKey);
      var rec = recordSummary(pid, issueKey);
      var hasRec = !!(rec && rec.total);
      var hasPos = !!(pos && pos.stance);
      if (!hasRec && !hasPos) return;
      // filters
      var d = cmp(pid) || {};
      if (_state.party !== 'all') {
        var party = String(d.party || '').toUpperCase();
        if (_state.party === 'D' && party.indexOf('D') !== 0) return;
        if (_state.party === 'R' && party.indexOf('R') !== 0) return;
      }
      if (_state.q) {
        var hay = ((d.name || '') + ' ' + (d.office || '') + ' ' + (d.state || '')).toLowerCase();
        if (hay.indexOf(_state.q.toLowerCase()) < 0) return;
      }
      add(pid);
    });
    return out;
  }

  /* ── position vocab ───────────────────────────────────────────────────────
     A VERDICT MAP USED TO LIVE HERE. It held 'Backs it up' / 'Says one thing,
     votes another' / 'Mixed record', and consReadout() printed one of them on
     every card in this grid. Both are gone, deliberately and not by accident of
     refactoring: a comparison cell is a DESCRIPTION of a record, and an integrity
     verdict is a JUDGEMENT of a person against their own words. They answer
     different questions, they have different evidence gates, and stacking a
     dozen of them in a scannable column turns Word-vs-Action into a leaderboard —
     which is exactly the party-vs-party reading this product exists to refuse.
     Word vs Action still runs, unchanged, where it belongs: on the profile, one
     person at a time, against a stated position that actually exists. Do not
     bring a verdict label back into this file. */
  var STANCE = {
    support: { bucket: 'Supports', color: '#4ade80', ico: '👍', pill: 'Supports' },
    oppose:  { bucket: 'Opposes',  color: '#f87171', ico: '👎', pill: 'Opposes' },
    mixed:   { bucket: 'Mixed',    color: '#f5c842', ico: '⚖️', pill: 'Mixed' }
  };
  // Kept as the vocabulary of the SECONDARY line on each card — the stated
  // position still needs its canonical label, colour and icon. It is no longer
  // what the field is grouped by; see RECORD_GROUPS.
  var BUCKET_ORDER = ['support', 'oppose', 'mixed', 'none'];
  var BUCKET_META = {
    support: { label: 'Supports', color: '#4ade80', ico: '👍' },
    oppose:  { label: 'Opposes',  color: '#f87171', ico: '👎' },
    mixed:   { label: 'Mixed',    color: '#f5c842', ico: '⚖️' },
    none:    { label: 'No stated position', color: '#9fb4d4', ico: '—' }
  };

  // ── RECORD_GROUPS · THE FIELD IS ORGANISED BY THE RECORD ───────────────────
  // This field used to be grouped by stated position and ranked inside each group
  // by consistency verdict and then by vote count. Both halves of that were the
  // inversion: the loudest organising fact on the page was a quote, and the
  // tie-break underneath it was how much of a record WE happen to hold — a
  // ranking signal manufactured out of our own coverage.
  //
  // Cards are now grouped by what the record SAYS ABOUT ITSELF, in these four
  // states, and sorted A–Z by name inside each one. Read the two properties this
  // has to keep, because they are the whole reason it is allowed:
  //
  //   · IT IS CATEGORICAL, NOT ORDINAL. The order below is a fixed literal in
  //     source. It is not derived from a tally, a share, a judged count or a
  //     held count, and nothing in this file compares two members on it. 'speaks'
  //     sits above 'thin' because a readable record is the thing the reader came
  //     for, not because a readable record is BETTER — and no group is ever
  //     labelled or coloured as a win. (Pinned by
  //     scripts/test-record-direction-surfaces.mjs, which fails if a comparator
  //     in this file reads judged/held/total/pct.)
  //   · THE WEAK STATES STAY DISTINCT AND STAY NAMED. 'thin' and 'none' are
  //     different facts about the world — a record we cannot read a direction
  //     from, versus no record at all — and neither is ever folded into 'speaks'
  //     to make the page look finished. 'unread' is the state that is not an
  //     absence at all: still loading, or an action whose lane this view cannot
  //     read a direction from. It never claims a gap.
  //
  // Colours are one calm slate family on purpose. A green→red ramp across these
  // groups would recreate the scoreboard by other means.
  var RECORD_GROUPS = ['speaks', 'thin', 'none', 'unread'];
  var RECORD_GROUP_META = {
    speaks: { label: 'Their record shows a direction', ico: '🏛️', color: '#9fb4d4',
              sub: 'Enough on file here to say which way each record ran. What it ran toward is on the card.' },
    thin:   { label: 'Too thin to read a direction', ico: '🏛️', color: '#8fa6c6',
              sub: 'There is a record on file. There is not enough of it to say which way it ran, so this view does not guess.' },
    none:   { label: 'No formal record on file yet', ico: '🏛️', color: '#7f95b5',
              sub: 'Nothing on file for this issue. That is a gap in the record — it is not a position, and it is not neutrality.' },
    unread: { label: 'Record not readable here yet', ico: '🏛️', color: '#6d8ab0',
              sub: 'Either still loading, or the action on file is not one this view can read a direction from. Not a claim that anything is missing.' }
  };
  // Which group a card belongs to. `rd === null` is NOT an absence — it means the
  // batched record has not landed, or the lane is out of scope here — so it goes
  // to 'unread' and never to 'none'.
  function recordGroup(r) { return (r && r.rd && r.rd.state) ? r.rd.state : 'unread'; }

  // Build the full per-politician row model for the chosen issue.
  function rowModel(pid, issueKey) {
    var d = cmp(pid) || {};
    var pos = positionOnIssue(pid, issueKey);
    var stance = pos && pos.stance ? String(pos.stance) : 'none';
    if (!STANCE[stance] && stance !== 'none') stance = 'mixed';
    var rec = recordSummary(pid, issueKey);
    var warm = recordsWarm(pid);
    // OFFICIAL RECORD axis — does their formal voting record back this stance?
    // (Say-vs-Do, the broader public record, is surfaced separately via receipts.)
    var uni = null;
    try { if (window.PDXConsistency && isFn(window.PDXConsistency.officialRecord)) uni = window.PDXConsistency.officialRecord(pid, issueKey); } catch (e) {}
    var cons;
    if (uni) {
      if (uni.token === 'pending') cons = { state: 'pending', uni: uni };
      else if (uni.token === 'no_record' || uni.token === 'no_stance') cons = { state: 'no_record', uni: uni };
      else cons = { state: 'rated', uni: uni, rec: uni.record || null };
    } else if (rec && rec.total) {
      cons = { state: 'rated', rec: rec };
    } else if (warm) {
      cons = { state: 'no_record' };
    } else {
      cons = { state: 'pending' };
    }
    // THE RECORD SLOT — now the leading fact on the card, so it is resolved once
    // here rather than re-derived at paint. Same accessor the profile row, the
    // baseline and the side-by-side use, so those four surfaces cannot disagree
    // about what this member's record did. `null` means cold-or-out-of-lane, and
    // is handled as 'unread' everywhere below — never as an absence.
    var rd = null;
    try {
      if (window.PDXConsistency && window.PDXConsistency.recordDirection && isFn(window.PDXConsistency.recordDirection.slot)) {
        rd = window.PDXConsistency.recordDirection.slot(pid, issueKey);
      }
    } catch (e) { rd = null; }
    return {
      pid: pid, name: d.name || pid, office: d.office || '', state: d.state || '',
      party: d.party || '', photo: d.photo || (d.icon || ''),
      stance: stance, pos: pos, cons: cons, rd: rd, warm: warm, onTeam: onTeam(pid)
    };
  }

  // ── SORTING, AND WHAT IT IS NOT ALLOWED TO BE ──────────────────────────────
  // rankScore() used to live here. It floated cards inside a group by consistency
  // verdict (consistent > mixed > flag > contradicts) and broke ties on how many
  // votes we hold. Both inputs are things this grid may no longer use: a verdict
  // is an integrity judgement and does not belong on a comparison surface at all,
  // and a vote count is a measure of OUR coverage, so ordering on it quietly tells
  // the reader that the best-documented member is the best member.
  //
  // What replaced it is deliberately boring: A–Z by name, inside a group order
  // that is a fixed literal (see RECORD_GROUPS). Nothing in this file reads
  // judged, held, total or a percentage to decide where a card sits. If you are
  // about to add a comparator that does, that is the wall — the record slot is
  // display text, and it is not a ranking signal.
  function byName(a, b) {
    try { return String(a.name || '').localeCompare(String(b.name || '')); }
    catch (e) { return 0; }
  }

  /* ── batched voting-record warmer ──────────────────────────────────────
     Never fetch per card. Collect pids whose records aren't warm, coalesce one
     /compare request (which seeds the sync cache for all of them), then refresh.
     _warmTried stops us from looping on members who genuinely have no record. */
  function flushWarm() {
    _warmTimer = null;
    if (!(window.PDXVotingRecord && isFn(window.PDXVotingRecord.fetchCompare))) { _warmQueue = []; return; }
    var batch = _warmQueue.splice(0, WARM_BATCH);
    if (!batch.length) return;
    var settle = function () { batch.forEach(function (p) { _warmTried[p] = true; delete _warmReq[p]; }); };
    window.PDXVotingRecord.fetchCompare(batch).then(function () {
      settle(); paintResults();
      if (_warmQueue.length && !_warmTimer) _warmTimer = setTimeout(flushWarm, 160);
    }, function () { settle(); });
  }
  // ── WARM WHEN THE LINEUP OPENS ─────────────────────────────────────────────
  // The record lane can only lead a card if the record is there to lead with, and
  // the batched fetch used to be triggered only by renderResults() — after the
  // field had already been computed from whatever happened to be in the cache. On
  // a cold cache that is circular for the "All tracked" field: fieldPids() admits
  // members with a warm record, nothing is warm, so nothing is admitted on the
  // strength of its record and nothing gets warmed on the strength of being
  // admitted. Only the quote-havers ever appeared.
  //
  // This breaks the loop from the other end. The moment an issue or a field is
  // chosen we warm the lineups we can enumerate without the cache — the team,
  // the people who represent this visitor, their favourites — so the field is
  // computed against a populated record lane rather than an empty one. Bounded on
  // purpose: "All tracked" is not enumerable, and its cards still warm through
  // queueWarm() below as they render.
  function warmLineup() {
    if (!_state.issueKey) return;
    var seen = {}, pids = [];
    function add(p) { p = p && String(p); if (p && !seen[p]) { seen[p] = 1; pids.push(p); } }
    try { teamPids().forEach(add); } catch (e) {}
    try { representsMePids().forEach(add); } catch (e) {}
    try { favoritePids().forEach(add); } catch (e) {}
    if (pids.length) queueWarm(pids.slice(0, WARM_BATCH * 2));
  }
  function queueWarm(pids) {
    if (!(window.PDXVotingRecord && isFn(window.PDXVotingRecord.fetchCompare))) return;
    var added = 0;
    pids.forEach(function (pid) {
      pid = String(pid);
      if (_warmTried[pid] || _warmReq[pid] || recordsWarm(pid)) return;
      _warmReq[pid] = true; _warmQueue.push(pid); added++;
    });
    if (added && !_warmTimer) _warmTimer = setTimeout(flushWarm, 160);
  }

  /* ── 📌 focused issues (shared with the side-by-side board) ──────────────
     The pin store lives in compare-table.js and is published as
     window.PDXCompareFocus. This surface reads it and writes to it; it does not
     keep a second copy, because two comparison surfaces disagreeing about which
     issues the reader cares about is worse than neither offering the control.

     Pinning here does exactly what pinning there does: it lifts an issue to the
     front of the picker and puts it in a rail. It is not a weight, it does not
     enter any ranking, and it changes nothing about what any record says. */
  function focusApi() { var F = window.PDXCompareFocus; return (F && isFn(F.keys)) ? F : null; }
  function focusKeys() { var F = focusApi(); try { return F ? F.keys() : []; } catch (e) { return []; } }
  function focusHas(k) { var F = focusApi(); try { return !!(F && k && F.has(k)); } catch (e) { return false; } }
  window.__icToggleFocus = function (k, btn) {
    var F = focusApi(); if (!F || !k) return;
    try {
      if (!F.has(k) && F.full()) {
        // Refuse rather than evict — the reader chose those five.
        if (btn) { btn.classList.add('is-full'); btn.title = 'Focus is full at ' + F.MAX + ' issues. Unpin one first.'; setTimeout(function () { btn.classList.remove('is-full'); }, 1600); }
        return;
      }
      F.toggle(k);
    } catch (e) {}
    queueRender();
  };
  window.__icClearFocus = function () { var F = focusApi(); if (F) { try { F.clear(); } catch (e) {} } queueRender(); };

  function focusPinHtml(k) {
    if (!k || !focusApi()) return '';
    var on = focusHas(k);
    return '<button type="button" class="ic-pin' + (on ? ' is-on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '"'
      + ' onclick="window.__icToggleFocus(\'' + jsAttr(k) + '\',this)"'
      + ' title="' + (on ? 'Unpin this issue' : 'Pin this issue so it leads your comparisons') + '">'
      + '<span class="ic-pin-ico" aria-hidden="true">📌</span><span class="ic-pin-lbl">' + (on ? 'Focused' : 'Focus') + '</span></button>';
  }

  function renderFocusStrip() {
    var keys = focusKeys();
    if (!keys.length) return '';
    var chips = keys.map(function (k) {
      var active = (k === _state.issueKey) ? ' is-active' : '';
      return '<span class="ic-fr-chip' + active + '">'
        + '<button type="button" class="ic-fr-go" onclick="window.PDXIssueCompare.selectIssue(\'' + jsAttr(k) + '\')" title="Compare the field on ' + esc(issueLabel(k)) + '">' + esc(issueLabel(k)) + '</button>'
        + '<button type="button" class="ic-fr-x" onclick="window.__icToggleFocus(\'' + jsAttr(k) + '\',this)" aria-label="Unpin ' + esc(issueLabel(k)) + '" title="Unpin">✕</button>'
        + '</span>';
    }).join('');
    return '<div class="ic-strip ic-strip--focus">'
      + '<div class="ic-strip-h">📌 Your focused issues <span class="ic-strip-sub">— these lead the side-by-side board too</span></div>'
      + '<div class="ic-fr-chips">' + chips + '<button type="button" class="ic-fr-clear" onclick="window.__icClearFocus()">Clear</button></div></div>';
  }

  /* ── render: head + stance strip ────────────────────────────────────── */
  function renderStanceStrip() {
    var stances = savedStances();
    if (!stances.length) {
      return '<div class="ic-strip ic-strip--empty">'
        + '<span class="ic-strip-lead">💡 Tip:</span> Set a stance in <button type="button" class="ic-link" onclick="location.hash=\'#my-stances\'">My Stances</button> and start here — “you took a position on X, see who actually lines up.”'
        + '</div>';
    }
    var chips = stances.slice(0, 12).map(function (s) {
      var st = STANCE[s.position] || STANCE.mixed;
      var active = s.issueKey === _state.issueKey ? ' is-active' : '';
      return '<button type="button" class="ic-stance-chip' + active + '" style="--c:' + st.color + '" onclick="window.PDXIssueCompare.selectIssue(\'' + jsAttr(s.issueKey) + '\')" title="You take a ' + esc(st.pill) + ' position here — see who lines up">'
        + '<span class="ic-sc-ico">' + st.ico + '</span><span class="ic-sc-lbl">' + esc(issueLabel(s.issueKey)) + '</span></button>';
    }).join('');
    return '<div class="ic-strip">'
      + '<div class="ic-strip-h">🎯 Start from a stance you took</div>'
      + '<div class="ic-stance-chips">' + chips + '</div></div>';
  }

  /* ── render: issue picker ───────────────────────────────────────────── */
  function coverageTag(k) { var n = coverage().byIssue[k] || 0; return n ? '<span class="ic-cov">📍 ' + n + '</span>' : ''; }

  function pickerOptionsHtml() {
    var map = issueMap();
    var keys = Object.keys(map);
    // Order: quick picks first (that exist), then the rest alphabetically by label.
    // 📌 first, then quick picks, then the rest alphabetically by label. Pinned
    // keys are PREPENDED rather than sorted in, which keeps the reader's own pin
    // order intact and leaves the alphabetical tail exactly as it was.
    var pinned = focusKeys().filter(function (k) { return map[k]; });
    var seen = {}; pinned.forEach(function (k) { seen[k] = 1; });
    var qp = quickPicks().filter(function (k) { return map[k] && !seen[k]; });
    qp.forEach(function (k) { seen[k] = 1; });
    var rest = keys.filter(function (k) { return !seen[k]; })
      .sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
    var ordered = pinned.concat(qp, rest);
    return ordered.map(function (k) {
      var lbl = issueLabel(k);
      var on = focusHas(k);
      var hay = (lbl + ' ' + ((map[k] && map[k].keywords) || []).join(' ')).toLowerCase();
      return '<button type="button" class="ic-opt' + (on ? ' is-pinned' : '') + '" data-ic-opt data-hay="' + esc(hay) + '" onclick="window.PDXIssueCompare.selectIssue(\'' + jsAttr(k) + '\')">'
        + (on ? '<span class="ic-opt-pin" aria-hidden="true">📌</span>' : '')
        + '<span class="ic-opt-lbl">' + esc(lbl) + '</span>' + coverageTag(k) + '</button>';
    }).join('');
  }
  // Two-axis elections note. 🔐 election_security and 📩 voting_access are
  // separate keys read in opposite directions, and this surface compares ONE key
  // at a time — so without a nudge a reader can compare a field on safeguards and
  // never learn the access axis exists. Guarded: '' unless ballot-axes.js is
  // loaded and the selected issue is one of the two facets.
  function axisNoteHtml(issueKey) {
    var BA = window.PDXBallotAxes;
    if (!BA || !isFn(BA.isAxisKey) || !isFn(BA.axisMeta)) return '';
    try {
      if (!BA.isAxisKey(issueKey)) return '';
      var otherKey = BA.otherKey(issueKey);
      var mine = BA.axisMeta(issueKey === BA.KEYS.security ? 'security' : 'access');
      var other = BA.axisMeta(otherKey === BA.KEYS.security ? 'security' : 'access');
      if (!mine || !other) return '';
      return '<div class="ic-axisnote">'
        + '<span class="ic-axisnote-txt">Elections are scored on two independent axes. Here, <b>“supports”</b> means '
        +   esc(String(mine.dir.support).toLowerCase()) + '. The other axis is judged separately.</span>'
        + '<button type="button" class="ic-btn ic-btn--ghost" onclick="window.PDXIssueCompare.selectIssue(\'' + jsAttr(otherKey) + '\')">'
        +   other.icon + ' Compare on ' + esc(other.shortLabel.toLowerCase()) + '</button>'
        + '</div>';
    } catch (e) { return ''; }
  }

  function renderPicker() {
    if (!_state.issueKey || _state.pickerOpen) {
      return '<div class="ic-picker">'
        + '<div class="ic-picker-bar">'
        +   '<input type="search" id="ic-search" class="ic-search" placeholder="Search issues (e.g. healthcare, guns, taxes)…" autocomplete="off" aria-label="Search issues">'
        +   (_state.issueKey ? '<button type="button" class="ic-x" onclick="window.PDXIssueCompare.togglePicker(false)" aria-label="Close issue picker">✕</button>' : '')
        + '</div>'
        + '<div class="ic-opts" id="ic-opts">' + pickerOptionsHtml() + '</div>'
        + '</div>';
    }
    // collapsed: show current issue + change button
    var mine = myStanceOn(_state.issueKey);
    var mineTag = mine ? '<span class="ic-mine" style="--c:' + ((STANCE[mine.position] || STANCE.mixed).color) + '">Your stance: ' + esc((STANCE[mine.position] || STANCE.mixed).pill) + '</span>' : '';
    return '<div class="ic-current">'
      + '<div class="ic-current-main"><span class="ic-current-eyebrow">Comparing on</span>'
      +   '<div class="ic-current-issue">' + esc(issueLabel(_state.issueKey)) + ' ' + coverageTag(_state.issueKey) + '</div>' + mineTag + '</div>'
      + '<div class="ic-current-acts">' + focusPinHtml(_state.issueKey)
      +   '<button type="button" class="ic-btn ic-btn--ghost" onclick="window.PDXIssueCompare.togglePicker(true)">Change issue</button></div>'
      + '</div>'
      + axisNoteHtml(_state.issueKey);
  }

  /* ── render: field selector + filters ───────────────────────────────── */
  function renderFieldSelector() {
    var tCount = teamPids().length;
    var rCount = (function () { var s = {}, n = 0; representsMePids().concat(favoritePids()).concat(teamPids()).forEach(function (p) { if (!s[p]) { s[p] = 1; n++; } }); return n; })();
    function seg(key, label, sub) {
      var active = _state.field === key ? ' is-active' : '';
      return '<button type="button" class="ic-seg' + active + '" onclick="window.PDXIssueCompare.setField(\'' + key + '\')">'
        + '<span class="ic-seg-lbl">' + label + '</span><span class="ic-seg-sub">' + sub + '</span></button>';
    }
    var segs = '<div class="ic-segs" role="tablist">'
      + seg('team', '⭐ My Team', tCount + ' on team')
      + seg('relevant', '📍 Relevant to me', rCount + ' near you')
      + seg('all', '🗂 All tracked', 'with a position')
      + '</div>';
    var filters = '';
    if (_state.field === 'all') {
      function pf(v, lbl) { return '<button type="button" class="ic-pf' + (_state.party === v ? ' is-active' : '') + '" onclick="window.PDXIssueCompare.setParty(\'' + v + '\')">' + lbl + '</button>'; }
      filters = '<div class="ic-filters">'
        + '<div class="ic-pf-row">' + pf('all', 'All') + pf('D', 'Democrat') + pf('R', 'Republican') + '</div>'
        + '<input type="search" id="ic-fieldsearch" class="ic-search ic-search--sm" placeholder="Filter by name, office or state…" autocomplete="off" value="' + esc(_state.q) + '" aria-label="Filter politicians">'
        + '</div>';
    }
    return segs + filters;
  }

  /* ── render: a single result card ───────────────────────────────────── */
  // ── THE RECORD LANE · the leading content of every card ────────────────────
  // recordDirHtml() is unchanged and still comes from PDXConsistency.recordDirection
  // — the one place in the app that words "advanced it" / "cut against it" / "ran
  // both ways" — so this card and the profile row cannot say different things
  // about the same file. What changed is WHEN it is called.
  //
  // It used to be called from exactly two branches: the ones where the say-vs-do
  // read came back with nothing to print. The formal record was the consolation
  // prize for a missing quote. It is now called on every card, first, above the
  // stated position, because it is the thing the reader came to see.
  //   Display only. Nothing below sorts, ranks, filters or counts on it.
  function recordDirHtml(r) {
    try {
      var PC = window.PDXConsistency;
      if (!PC || !PC.recordDirection || !isFn(PC.recordDirection.for)) return '';
      return PC.recordDirection.for(r.pid, _state.issueKey, { cls: 'ic-rdir' });
    } catch (e) { return ''; }
  }
  // A key vote FROM the record, in the record's own lane. This used to sit in
  // evidenceHtml() as a fallback for a member with no stated blurb, which filed a
  // vote under "evidence for what they said" — a category error once the two
  // lanes are drawn apart. It is a bare description of one item on file: a title,
  // no verdict word, no claim about whether it matched anything.
  function recordVoteHtml(r) {
    try {
      var rec = (r.cons && r.cons.state === 'rated') ? r.cons.rec : null;
      if (!rec) return '';
      var top = rec.topContradiction || rec.topConsistent;
      if (!top || !(top.title || top.number)) return '';
      return '<p class="ic-recvote">🗳️ On file: ' + esc(truncate(top.title || top.number, 120)) + '</p>';
    } catch (e) { return ''; }
  }
  // The whole lane, including its honest empty states.
  //   · slot present → print it, whatever it says (speaks / thin / none).
  //   · slot null + records not warm → say we are still looking. NOT "no record".
  //   · slot null + records warm → the lane is out of scope for this issue (e.g.
  //     an executive action, which needs its own vocabulary and standing rules).
  //     Say nothing at all rather than invent an absence we did not verify.
  function recordLaneHtml(r) {
    var body = recordDirHtml(r);
    if (body) return '<div class="ic-rec-lane">' + body + recordVoteHtml(r) + '</div>';
    if (!r.warm) {
      return '<div class="ic-rec-lane is-cold"><span class="ic-rdir is-cold">'
        + '<span class="ic-rdir-ico" aria-hidden="true">🏛️</span>'
        + '<span class="ic-rdir-txt">Checking the voting record <span class="ic-spin"></span></span></span></div>';
    }
    return '';
  }
  function evidenceHtml(r) {
    var pos = r.pos;
    if (pos && (pos.topic || pos.text)) {
      var body = truncate(pos.text || pos.topic, 150);
      var src = (pos.source && pos.source.url)
        ? ' <a class="ic-src" href="' + esc(pos.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">' + esc(pos.source.label || 'source') + ' ↗</a>' : '';
      return '<p class="ic-evidence">' + (pos.icon ? esc(pos.icon) + ' ' : '') + esc(body) + src + '</p>';
    }
    // The key-vote fallback that used to sit here moved to recordVoteHtml(), in
    // the record's own lane. A vote is not evidence of what somebody said.
    return '';
  }
  function card(r) {
    var sm = STANCE[r.stance] || BUCKET_META.none;
    var face = r.photo && /^https?:/.test(r.photo)
      ? '<img class="ic-photo" src="' + esc(r.photo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'ic-photo\',textContent:\'' + jsAttr(initials(r.name)) + '\'}))">'
      : '<div class="ic-photo">' + esc(r.photo && !/^https?:/.test(r.photo) ? r.photo : initials(r.name)) + '</div>';
    var posPill = '<span class="ic-pos" style="--c:' + (sm.color || '#9fb4d4') + '">' + (sm.ico || '') + ' ' + esc(sm.pill || sm.label || 'No stated position') + '</span>';
    var teamBtn = '<button type="button" class="ic-act ' + (r.onTeam ? 'is-on' : '') + '" onclick="window.PDXIssueCompare.toggleTeam(this,\'' + jsAttr(r.pid) + '\')">' + (r.onTeam ? '✓ On team' : '＋ Team') + '</button>';
    // THE ORDER OF THE CARD IS THE ARGUMENT. Record first, under its own heading;
    // stated position second, under its own heading; and the two are never merged
    // into one chip, because a reader who cannot tell which half is the voting
    // file and which half is the quote is being asked to trust the wrong one.
    // The stated-position pill used to sit up in the header row next to the name,
    // which made it read as an attribute of the person. It is a citation, and it
    // now sits with its citation.
    var rec = recordLaneHtml(r);
    var said = posPill + evidenceHtml(r);
    return '<div class="ic-card' + (rec ? ' is-reclead' : '') + '" data-pid="' + esc(r.pid) + '">'
      + '<div class="ic-card-top">' + face
      +   '<div class="ic-id"><button type="button" class="ic-name" onclick="window.PDXIssueCompare.openProfile(\'' + jsAttr(r.pid) + '\')">' + esc(r.name) + '</button>'
      +     '<div class="ic-office">' + esc(r.office || '') + (r.state ? ' · ' + esc(r.state) : '') + '</div></div>'
      + '</div>'
      + (rec ? '<div class="ic-lane-lbl ic-lane-lbl--rec">What their record did</div>' + rec : '')
      + '<div class="ic-said-lane"><div class="ic-lane-lbl">Stated position</div>' + said + '</div>'
      + '<div class="ic-actions">' + teamBtn
      +   '<button type="button" class="ic-act" onclick="window.PDXIssueCompare.openProfile(\'' + jsAttr(r.pid) + '\')">Profile</button>'
      +   '<button type="button" class="ic-act" onclick="window.PDXIssueCompare.compareOne(\'' + jsAttr(r.pid) + '\')">⚔ Compare</button>'
      + '</div></div>';
  }

  /* ── render: results (grouped by stated position) ───────────────────── */
  function emptyBlock(ico, title, msg, ctaHtml) {
    return '<div class="ic-empty"><div class="ic-empty-ico">' + ico + '</div>'
      + '<div class="ic-empty-title">' + esc(title) + '</div>'
      + '<p class="ic-empty-msg">' + msg + '</p>' + (ctaHtml || '') + '</div>';
  }
  function renderResults() {
    if (!_state.issueKey) {
      return emptyBlock('🎯', 'Pick an issue to compare', 'Choose an issue above — ideally one you’ve taken a stance on — and see how politicians line up: what they say, and whether their record backs it up.', '');
    }
    var field = _state.field;
    // field-level prompts
    if (field === 'team' && !teamPids().length) {
      return emptyBlock('⭐', 'Your team is empty', 'Add politicians to your voting team and compare them here — or switch to <b>All tracked</b> to see everyone with a position on this issue.',
        '<div class="ic-empty-cta"><button type="button" class="ic-btn ic-btn--gold" onclick="window.PDXIssueCompare.setField(\'all\')">See all tracked</button> <button type="button" class="ic-btn ic-btn--ghost" onclick="location.hash=\'#voter-hub\'">Build my team</button></div>');
    }
    if (field === 'relevant' && !representsMePids().length && !favoritePids().length) {
      var locCta = hasLocation() ? '' : '<button type="button" class="ic-btn ic-btn--gold" onclick="(window.openLocationModal||window.toggleChangeLocation||function(){location.hash=\'#your-ballot\';})();">Set my location</button> ';
      return emptyBlock('📍', 'Nothing relevant yet', 'Set your location so PolitiDex knows who represents you, or star a few politicians to follow — then they’ll show up here.',
        '<div class="ic-empty-cta">' + locCta + '<button type="button" class="ic-btn ic-btn--ghost" onclick="window.PDXIssueCompare.setField(\'all\')">See all tracked</button></div>');
    }

    var pids = fieldPids(field, _state.issueKey);
    if (!pids.length) {
      return emptyBlock('🗂', 'No documented positions here', 'No one in this field has a documented position or voting record on <b>' + esc(issueLabel(_state.issueKey)) + '</b> yet.',
        field !== 'all' ? '<div class="ic-empty-cta"><button type="button" class="ic-btn ic-btn--gold" onclick="window.PDXIssueCompare.setField(\'all\')">Try all tracked</button></div>' : '');
    }

    // Warm voting records for the (capped) field. This is a second, narrower net:
    // warmLineup() has already gone after the lineup as soon as the issue or the
    // field was chosen, so by the time we get here most of this is a no-op.
    var truncated = pids.length > MAX_CARDS;
    var show = pids.slice(0, MAX_CARDS);
    queueWarm(show);

    var rows = show.map(function (pid) { return rowModel(pid, _state.issueKey); });
    // Group by what the RECORD says about itself, A–Z inside each group. See the
    // note over RECORD_GROUPS for why this order is a literal and not a tally.
    var buckets = { speaks: [], thin: [], none: [], unread: [] };
    rows.forEach(function (r) { (buckets[recordGroup(r)] || buckets.unread).push(r); });
    RECORD_GROUPS.forEach(function (g) { buckets[g].sort(byName); });

    var coldCount = buckets.unread.filter(function (r) { return !r.warm; }).length;

    // TWO THIN CARDS ARE NOT A COMPARISON. Same floor the side-by-side row uses,
    // same wording, same primitive — it counts how many records in this field can
    // actually be read, and says so plainly when fewer than two can. It hides
    // nothing: every card below still prints its own state and its own counts.
    // Silent while anything is still cold, so a half-loaded field never claims an
    // absence it has not verified.
    var floorHtml = '';
    try {
      var RD = window.PDXConsistency && window.PDXConsistency.recordDirection;
      if (RD && isFn(RD.compare) && isFn(RD.compareHtml)) {
        floorHtml = RD.compareHtml(RD.compare(show, _state.issueKey), { cls: 'ic-rdfloor' }) || '';
      }
    } catch (e) { floorHtml = ''; }

    var head = '<div class="ic-results-head">'
      + '<span class="ic-results-count">' + rows.length + ' politician' + (rows.length === 1 ? '' : 's') + ' on ' + esc(issueLabel(_state.issueKey)) + '</span>'
      + '<button type="button" class="ic-btn ic-btn--compare" onclick="window.PDXIssueCompare.compareField()" title="Open the full side-by-side comparison with this field">⚔ Head-to-head</button>'
      + '</div>'
      + '<p class="ic-note">Grouped by <b>what each record actually did</b> on this issue, then A–Z. Their <b>stated position</b>, where one is on file, is the second line of every card. A thin record and an empty one are kept apart on purpose, and neither is rounded up into a direction.</p>'
      + floorHtml
      + (coldCount ? '<div class="ic-note">🏛️ Still checking the voting record for ' + coldCount + ' politician' + (coldCount === 1 ? '' : 's') + '… their cards fill in automatically.</div>' : '');

    var body = RECORD_GROUPS.map(function (g) {
      var list = buckets[g]; if (!list.length) return '';
      var meta = RECORD_GROUP_META[g];
      return '<div class="ic-bucket ic-bucket--rec" style="--c:' + meta.color + '">'
        + '<div class="ic-bucket-h"><span class="ic-bucket-ico">' + meta.ico + '</span>' + esc(meta.label)
        +   '<span class="ic-bucket-n">' + list.length + '</span></div>'
        + '<p class="ic-bucket-sub">' + esc(meta.sub) + '</p>'
        + '<div class="ic-cards">' + list.map(card).join('') + '</div></div>';
    }).join('');

    var trunc = truncated ? '<div class="ic-note">Showing the first ' + MAX_CARDS + ' of ' + pids.length + '. Use the filters to narrow the field.</div>' : '';

    // Loop back to stances: if the user hasn't taken a stance on this issue, invite them.
    var adopt = '';
    if (!myStanceOn(_state.issueKey)) {
      adopt = '<div class="ic-adopt">🎯 Haven’t weighed in yet? <button type="button" class="ic-link" onclick="window.PDXIssueCompare.adopt(\'' + jsAttr(_state.issueKey) + '\')">Set your stance on ' + esc(issueLabel(_state.issueKey)) + '</button> — then everyone’s match sharpens.</div>';
    }
    return head + adopt + body + trunc;
  }

  /* ── compose + mount ────────────────────────────────────────────────── */
  function render() {
    var host = el(MOUNT);
    if (!host) return;
    host.innerHTML =
      renderFocusStrip()
      + renderStanceStrip()
      + renderPicker()
      + (_state.issueKey && !_state.pickerOpen ? renderFieldSelector() : '')
      + '<div class="ic-results">' + (_state.issueKey && !_state.pickerOpen ? renderResults() : '') + '</div>';
    bind();
  }
  // Attach listeners that need to preserve focus / avoid full re-render (search).
  function bind() {
    var s = el('ic-search');
    if (s) {
      s.addEventListener('input', function () {
        var q = this.value.toLowerCase().trim();
        var opts = document.querySelectorAll('#ic-opts [data-ic-opt]');
        for (var i = 0; i < opts.length; i++) {
          var hay = opts[i].getAttribute('data-hay') || '';
          opts[i].style.display = (!q || hay.indexOf(q) >= 0) ? '' : 'none';
        }
      });
    }
    var fs = el('ic-fieldsearch');
    if (fs) {
      fs.addEventListener('input', function () {
        _state.q = this.value || '';
        clearTimeout(fs._t);
        fs._t = setTimeout(paintResults, 200); // repaint results only — keeps this input focused
      });
    }
  }

  // Repaint just the results region (keeps picker + field inputs / focus intact).
  function paintResults() {
    if (!isVisible()) return;
    var box = el('ic-results');
    if (!box) { render(); return; }
    if (!(_state.issueKey && !_state.pickerOpen)) { box.innerHTML = ''; return; }
    box.innerHTML = renderResults();
  }

  function queueRender() {
    if (!_inited) return;
    if (_renderQueued) return;
    _renderQueued = true;
    (window.requestAnimationFrame || window.setTimeout)(function () { _renderQueued = false; if (isVisible()) render(); }, 0);
  }
  function isVisible() { return location2() === HASH; }
  function location2() { try { return window.location.hash; } catch (e) { return ''; } }

  /* ── lifecycle ──────────────────────────────────────────────────────── */
  function init() {
    if (!el(MOUNT)) return;
    if (!_inited) { loadState(); }
    _inited = true;
    warmLineup();
    render();
    bindLive();
  }
  function bindLive() {
    if (_bound) return;
    _bound = true;
    ['pdx-team-change', 'pdx-saved-change', 'pdx-stances-change', 'pdx-evidence-ready', 'pdx-compare-focus'].forEach(function (evt) {
      try { window.addEventListener(evt, queueRender); } catch (e) {}
    });
  }
  function onHash() { if (window.location.hash === HASH) init(); }
  function setup() {
    try { window.addEventListener('hashchange', onHash); } catch (e) {}
    if (window.location.hash === HASH) init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();

  /* ── public API (also the action surface for inline handlers) ────────── */
  window.PDXIssueCompare = {
    // open the tool, optionally seeded with an issue + field (used by "see who
    // lines up" from a stance). Navigates to the section and renders.
    open: function (issueKey, field) {
      if (issueKey) { _state.issueKey = String(issueKey); _state.pickerOpen = false; }
      if (field) _state.field = String(field);
      saveState();
      warmLineup();
      window.location.hash = HASH;
      init();
      try { var s = el('issue-compare'); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    },
    selectIssue: function (k) { _state.issueKey = String(k); _state.pickerOpen = false; _state.q = ''; saveState(); warmLineup(); render(); try { var r = el('issue-compare'); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} },
    togglePicker: function (on) { _state.pickerOpen = !!on; render(); },
    setField: function (f) { _state.field = String(f); saveState(); warmLineup(); render(); },
    setParty: function (p) { _state.party = String(p); render(); },
    toggleTeam: function (btn, pid) {
      try {
        if (isFn(window.mypolToggleAnimated)) window.mypolToggleAnimated(btn, pid);
        else if (isFn(window.mypolToggle)) window.mypolToggle(pid);
      } catch (e) {}
      // reflect the new membership on this card + re-rank shortly after
      setTimeout(queueRender, 30);
    },
    openProfile: function (pid) { try { if (isFn(window.showProfile)) window.showProfile(pid); } catch (e) {} },
    compareOne: function (pid) {
      try {
        if (window._cmpSelected && isFn(window._cmpSelected.add)) window._cmpSelected.add(String(pid));
        else if (isFn(window.chubToggle)) window.chubToggle(pid);
        if (isFn(window.openCompare)) window.openCompare();
      } catch (e) {}
    },
    compareField: function () {
      try {
        var pids = fieldPids(_state.field, _state.issueKey).slice(0, 8); // compare view is dense; cap
        if (window._cmpSelected && isFn(window._cmpSelected.add)) {
          if (isFn(window._cmpSelected.clear)) window._cmpSelected.clear();
          pids.forEach(function (p) { window._cmpSelected.add(String(p)); });
        } else if (isFn(window.chubToggle)) {
          pids.forEach(function (p) { window.chubToggle(p); });
        }
        if (isFn(window.openCompare)) window.openCompare();
      } catch (e) {}
    },
    adopt: function (issueKey) { try { if (window.PDXStances && isFn(window.PDXStances.open)) window.PDXStances.open(issueKey); else location.hash = '#my-stances'; } catch (e) {} },
    refresh: function () { if (_inited && isVisible()) render(); }
  };
})();
