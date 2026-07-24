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
      var pos = positionOnIssue(pid, issueKey);
      var hasPos = !!(pos && pos.stance);
      var rec = hasPos ? null : recordSummary(pid, issueKey);
      if (!hasPos && !(rec && rec.total)) return;
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

  /* ── verdict / position vocab (reuses the app's dual-score language) ──── */
  var VERDICT = {
    consistent:  { label: 'Backs it up',                    color: '#6ee7a0', ico: '✅' },
    contradicts: { label: 'Says one thing, votes another',  color: '#f89b9b', ico: '⚠️' },
    mixed:       { label: 'Mixed record',                   color: '#93c5fd', ico: '⚖️' },
    no_position: { label: 'No clear record',                color: '#9fb4d4', ico: '🗳️' }
  };
  var STANCE = {
    support: { bucket: 'Supports', color: '#4ade80', ico: '👍', pill: 'Supports' },
    oppose:  { bucket: 'Opposes',  color: '#f87171', ico: '👎', pill: 'Opposes' },
    mixed:   { bucket: 'Mixed',    color: '#f5c842', ico: '⚖️', pill: 'Mixed' }
  };
  var BUCKET_ORDER = ['support', 'oppose', 'mixed', 'none'];
  var BUCKET_META = {
    support: { label: 'Supports', color: '#4ade80', ico: '👍' },
    oppose:  { label: 'Opposes',  color: '#f87171', ico: '👎' },
    mixed:   { label: 'Mixed',    color: '#f5c842', ico: '⚖️' },
    none:    { label: 'No stated position', color: '#9fb4d4', ico: '—' }
  };

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
    return {
      pid: pid, name: d.name || pid, office: d.office || '', state: d.state || '',
      party: d.party || '', photo: d.photo || (d.icon || ''),
      stance: stance, pos: pos, cons: cons, onTeam: onTeam(pid)
    };
  }

  // Rank within a bucket: rated first (consistent > mixed > contradicts), then by
  // vote count; pending next; no-record last.
  function rankScore(r) {
    // Unified verdict first (matches what the card shows): consistent > mixed >
    // flag > contradicts, then by how much record backs it; pending, then none.
    if (r.cons.uni) {
      var t = r.cons.uni.token;
      if (t === 'pending') return 100;
      var b = t === 'consistent' ? 400 : t === 'mixed' ? 300 : t === 'flag' ? 260 : t === 'contradicts' ? 200 : t === 'limited' ? 150 : 0;
      var n = (r.cons.uni.record && r.cons.uni.record.total) || (r.cons.uni.curated && r.cons.uni.curated.total) || 0;
      return b + Math.min(n, 99);
    }
    if (r.cons.state === 'rated') {
      var nv = r.cons.rec.netVerdict;
      var base = nv === 'consistent' ? 400 : nv === 'mixed' ? 300 : nv === 'contradicts' ? 200 : 250;
      return base + Math.min(r.cons.rec.total || 0, 99);
    }
    if (r.cons.state === 'pending') return 100;
    return 0; // no_record
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
    var qp = quickPicks().filter(function (k) { return map[k]; });
    var seen = {}; qp.forEach(function (k) { seen[k] = 1; });
    var rest = keys.filter(function (k) { return !seen[k]; })
      .sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
    var ordered = qp.concat(rest);
    return ordered.map(function (k) {
      var lbl = issueLabel(k);
      var hay = (lbl + ' ' + ((map[k] && map[k].keywords) || []).join(' ')).toLowerCase();
      return '<button type="button" class="ic-opt" data-ic-opt data-hay="' + esc(hay) + '" onclick="window.PDXIssueCompare.selectIssue(\'' + jsAttr(k) + '\')">'
        + '<span class="ic-opt-lbl">' + esc(lbl) + '</span>' + coverageTag(k) + '</button>';
    }).join('');
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
      + '<button type="button" class="ic-btn ic-btn--ghost" onclick="window.PDXIssueCompare.togglePicker(true)">Change issue</button>'
      + '</div>';
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
  function consReadout(r) {
    // Unified path — same vocabulary/icons/colours as every other surface.
    if (r.cons.uni) {
      var uni = r.cons.uni, m = uni.verdict;
      if (uni.token === 'pending') return '<span class="ic-cons is-muted">🏛️ Official Record <span class="ic-spin"></span> checking votes…</span>';
      if (uni.token === 'no_record' || uni.token === 'no_stance') return '<span class="ic-cons is-muted" title="' + esc(m.short) + '">🏛️ ' + esc(m.label) + '</span>';
      var recU = uni.record, parts = [];
      if (recU && recU.total) parts.push(recU.total + ' vote' + (recU.total === 1 ? '' : 's'));
      if (uni.curated && uni.curated.total) parts.push(uni.curated.total + ' receipt' + (uni.curated.total === 1 ? '' : 's'));
      if (uni.contradictions) parts.push(uni.contradictions + ' against');
      var flagU = (uni.contradictions > 0) ? '<span class="ic-flag">⚑ ' + uni.contradictions + '</span>' : '';
      var muted = (uni.token === 'limited') ? ' is-muted' : '';
      return '<span class="ic-cons' + muted + '" style="--c:' + m.color + '"><span class="ic-cons-ico">' + m.ico + '</span>'
        + '<span class="ic-cons-txt"><b>🏛️ ' + esc(m.label) + '</b>' + flagU + '<span class="ic-cons-sub">' + esc(parts.join(' · ')) + '</span></span></span>';
    }
    if (r.cons.state === 'pending') return '<span class="ic-cons is-muted">🏛️ Official Record <span class="ic-spin"></span> checking votes…</span>';
    if (r.cons.state === 'no_record') return '<span class="ic-cons is-muted" title="No qualifying votes on record yet to verify this position">🏛️ No qualifying votes yet</span>';
    var rec = r.cons.rec, nv = rec.netVerdict;
    var v = VERDICT[nv] || VERDICT.no_position;
    var counts = rec.total + ' vote' + (rec.total === 1 ? '' : 's')
      + (rec.contradicts ? ' · ' + rec.contradicts + ' against' : '')
      + (rec.consistent ? ' · ' + rec.consistent + ' backing' : '');
    var flag = (nv === 'contradicts') ? '<span class="ic-flag">⚑ contradicts</span>' : '';
    return '<span class="ic-cons" style="--c:' + v.color + '"><span class="ic-cons-ico">' + v.ico + '</span>'
      + '<span class="ic-cons-txt"><b>🏛️ ' + esc(v.label) + '</b>' + flag + '<span class="ic-cons-sub">' + esc(counts) + '</span></span></span>';
  }
  function evidenceHtml(r) {
    var pos = r.pos;
    if (pos && (pos.topic || pos.text)) {
      var body = truncate(pos.text || pos.topic, 150);
      var src = (pos.source && pos.source.url)
        ? ' <a class="ic-src" href="' + esc(pos.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">' + esc(pos.source.label || 'source') + ' ↗</a>' : '';
      return '<p class="ic-evidence">' + (pos.icon ? esc(pos.icon) + ' ' : '') + esc(body) + src + '</p>';
    }
    // fall back to a key vote from the record when there's no stated blurb
    if (r.cons.state === 'rated') {
      var rec = r.cons.rec;
      var top = rec.topContradiction || rec.topConsistent;
      if (top && (top.title || top.number)) {
        return '<p class="ic-evidence ic-evidence--vote">🗳️ Key vote: ' + esc(truncate(top.title || top.number, 120)) + '</p>';
      }
    }
    return '';
  }
  function card(r) {
    var sm = STANCE[r.stance] || BUCKET_META.none;
    var face = r.photo && /^https?:/.test(r.photo)
      ? '<img class="ic-photo" src="' + esc(r.photo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'ic-photo\',textContent:\'' + jsAttr(initials(r.name)) + '\'}))">'
      : '<div class="ic-photo">' + esc(r.photo && !/^https?:/.test(r.photo) ? r.photo : initials(r.name)) + '</div>';
    var posPill = '<span class="ic-pos" style="--c:' + (sm.color || '#9fb4d4') + '">' + (sm.ico || '') + ' ' + esc(sm.pill || sm.label || 'No stated position') + '</span>';
    var teamBtn = '<button type="button" class="ic-act ' + (r.onTeam ? 'is-on' : '') + '" onclick="window.PDXIssueCompare.toggleTeam(this,\'' + jsAttr(r.pid) + '\')">' + (r.onTeam ? '✓ On team' : '＋ Team') + '</button>';
    return '<div class="ic-card" data-pid="' + esc(r.pid) + '">'
      + '<div class="ic-card-top">' + face
      +   '<div class="ic-id"><button type="button" class="ic-name" onclick="window.PDXIssueCompare.openProfile(\'' + jsAttr(r.pid) + '\')">' + esc(r.name) + '</button>'
      +     '<div class="ic-office">' + esc(r.office || '') + (r.state ? ' · ' + esc(r.state) : '') + '</div></div>'
      +   posPill
      + '</div>'
      + '<div class="ic-cons-row">' + consReadout(r) + '</div>'
      + evidenceHtml(r)
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

    // Warm voting records for the (capped) field so consistency can compute.
    var truncated = pids.length > MAX_CARDS;
    var show = pids.slice(0, MAX_CARDS);
    queueWarm(show);

    var rows = show.map(function (pid) { return rowModel(pid, _state.issueKey); });
    // bucket by stated stance
    var buckets = { support: [], oppose: [], mixed: [], none: [] };
    rows.forEach(function (r) { (buckets[r.stance] || buckets.none).push(r); });
    Object.keys(buckets).forEach(function (b) { buckets[b].sort(function (a, c) { return rankScore(c) - rankScore(a); }); });

    var pendingCount = rows.filter(function (r) { return r.cons.state === 'pending'; }).length;
    var head = '<div class="ic-results-head">'
      + '<span class="ic-results-count">' + rows.length + ' politician' + (rows.length === 1 ? '' : 's') + ' on ' + esc(issueLabel(_state.issueKey)) + '</span>'
      + '<button type="button" class="ic-btn ic-btn--compare" onclick="window.PDXIssueCompare.compareField()" title="Open the full side-by-side comparison with this field">⚔ Head-to-head</button>'
      + '</div>'
      + '<p class="ic-note">Grouped by their <b>stated position</b> on this issue. The <b>🏛️ Official Record</b> read on each shows whether their <b>votes</b> backed that stance up when it counted. The broader public picture lives in <b>🧾 Say-vs-Do</b> on each profile.</p>'
      + (typeof window._pdxScoreLegendHtml === 'function' ? '<div class="ic-legend">' + window._pdxScoreLegendHtml({ only: ['saydo'] }) + '</div>' : '')
      + (pendingCount ? '<div class="ic-note">⚖️ Checking voting records for ' + pendingCount + ' politician' + (pendingCount === 1 ? '' : 's') + '… consistency fills in automatically.</div>' : '');

    var body = BUCKET_ORDER.map(function (b) {
      var list = buckets[b]; if (!list.length) return '';
      var meta = BUCKET_META[b];
      return '<div class="ic-bucket" style="--c:' + meta.color + '">'
        + '<div class="ic-bucket-h"><span class="ic-bucket-ico">' + meta.ico + '</span>' + esc(meta.label)
        +   '<span class="ic-bucket-n">' + list.length + '</span></div>'
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
      renderStanceStrip()
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
    render();
    bindLive();
  }
  function bindLive() {
    if (_bound) return;
    _bound = true;
    ['pdx-team-change', 'pdx-saved-change', 'pdx-stances-change', 'pdx-evidence-ready'].forEach(function (evt) {
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
      window.location.hash = HASH;
      init();
      try { var s = el('issue-compare'); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    },
    selectIssue: function (k) { _state.issueKey = String(k); _state.pickerOpen = false; _state.q = ''; saveState(); render(); try { var r = el('issue-compare'); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} },
    togglePicker: function (on) { _state.pickerOpen = !!on; render(); },
    setField: function (f) { _state.field = String(f); saveState(); render(); },
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
